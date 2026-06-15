# Browser Capture Permissions & Upload Fallback (US-0.2)

The MVP is web-only, so capture depends on browser camera/mic/file-upload APIs
whose availability and grants vary by browser and device. The hard rule:
**a permission prompt never blocks event creation.** There is always a path to a
note-only or upload-based event.

## Flow

Permissions are requested **just-in-time** for the modality the user actually
chooses — never all three up front, and at most **one** custom rationale before
any native prompt (AC-11).

1. The user taps "take a photo" / "record voice" → `CapturePermission` shows one
   Arabic-first, non-alarmist rationale interstitial explaining it's **device
   access only** and that anything created stays private/Me-Only (G1). The
   location rationale additionally says location is optional and blank is the
   safe default.
2. On **Allow** → the browser permission is requested in context:
   - **granted** → live capture; a camera frame is captured to a JPEG `File`
     (`capturePhotoFromStream`) and handed to the US-1.2 upload pipeline.
   - **denied / dismissed / unsupported** → never a dead-end: the upload
     dropzone + manual entry remain, and browser-specific re-enable guidance is
     shown (AC-3/6/7).
3. The note-only path (text + optional manual date/location) needs **zero**
   permissions (AC-11).

## Location is OFF by default (AC-4)

Location is opt-in per event (child-data minimization — UK Children's Code /
California AADC / COPPA-2025). An event saves with **no** location unless the
user adds one. `requestLocation()` asks for geolocation on demand and **never**
falls back to IP/coarse geolocation on denial — the location simply stays empty
for manual entry. An auto-derived location (EXIF or device geo) is a
**confirmable suggestion** (`LocationField`), shown with confirm/clear and never
silently committed (AC-10, US-2.2 AC-3).

## Unsupported browsers (AC-6)

`isModalitySupported()` checks for the needed API without forcing a prompt and
is SSR-safe (no `navigator` → "unsupported", never throws). A missing API routes
straight to the upload + manual-entry fallback — no broken native prompt.

## Re-enable guidance (AC-7)

Browsers commonly suppress the native re-prompt after a hard denial. The
guaranteed path is concrete, browser-specific, Arabic-first settings guidance
(`detectBrowser()` → `reenableKey()` → `capture.reenable*` copy), shown alongside
the ever-present upload/note-only fallback. A generic "change your settings"
message alone does not satisfy AC-7.

## Telemetry (content-blind, G4)

- `capture_permission_requested` — `permission_type` {camera, mic, location}.
- `capture_permission_result` — `permission_type`, `result` {granted, denied, dismissed, unsupported}.
- `capture_fallback_used` — `fallback_type` {upload, manual_location, manual_date, note_only}.

**No geolocation value is ever transmitted** — only the structural grant/deny
enum. `requestLocation()` returns coordinates to the caller only; they never
reach `emit()`.

## Key files
- `src/lib/capture/types.ts` — modality/result/fallback enums + routing decisions.
- `src/lib/capture/permissions.ts` — support detection + permission/stream/location requests.
- `src/lib/capture/browser.ts` — browser family detection for re-enable guidance.
- `src/lib/capture/photo.ts` — camera-frame → JPEG File.
- `src/components/capture/CapturePermission.tsx` — JIT rationale + routing UI.
- `src/components/capture/LocationField.tsx` — OFF-by-default, confirmable location.
- `src/app/(app)/events/new/page.tsx` — wiring into the create-event form.
