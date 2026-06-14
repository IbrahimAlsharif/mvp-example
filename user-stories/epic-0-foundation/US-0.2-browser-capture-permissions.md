# US-0.2 — Browser capture permissions with upload fallback

- **Epic:** Foundation & Measurement (cross-cutting)
- **Priority:** 🟠 Supporting
- **MVP-blocking:** No
- **Journeys:** J1 (step 2), J2
- **Source:** UJM → J1 step 2; QC → risk *Onboarding friction*; UJM → J1 failure *Permission denial blocks capture*
- **Depends on:** US-0.1 (account/auth)
- **Status:** Ready for build

## Story
As a **new user (any persona), including Elderly Individuals on an unfamiliar browser**, I want to **be asked for camera/mic/location access gently — and still be able to add events if I say no or my browser can't do it**, so that **a permission prompt never stops me from preserving a memory**.

## Context / Why this matters
J1 step 2 is grant-permissions, and the journey names *"Permission denial blocks capture"* as a critical failure point — a user who can't get past a scary or dead-end permission prompt abandons before first value, which makes the bet fail for a **UX reason, not a demand reason** (QC risk *Onboarding friction*). Because the MVP is web-only, capture depends on browser camera/mic/file-upload APIs whose availability and grants vary widely by browser and device. The hard rule: **permission denial must never block event creation** — there is always a path to a note-only or upload-based event (this is exactly the edge case US-1.1 and US-1.2 rely on). The rationale copy must be calm and Arabic-first so it reassures rather than alarms the at-risk segments. Location is treated differently from camera/mic: because this product holds intimate child media, the child-data regimes HTN must satisfy (UK Children's Code / California AADC, 2025 COPPA) require **geolocation OFF by default** — a location ask framed as parity with camera/mic reads as *"this app wants to know where my child is"* and is unrecoverable trust loss, so location is opt-in and defaults empty.

## Scope
**In scope (MVP):**
- A **graceful permission request** for browser **camera, microphone, and location**, shown in-context (when the user reaches a capture step), each with a short, non-scary, Arabic-first rationale explaining *why* and *what happens if they say no*.
- **Upload fallback:** if any permission is denied, dismissed, or unsupported, the user can still **upload an existing file** (photo/video/voice) instead of live-capturing.
- **Location is OFF by default and opt-in per event** — an event saves with **no** location unless the user explicitly adds one. A denied/dismissed location permission yields an **empty** location; the app **never** silently falls back to IP/coarse geolocation (UK Children's Code / California AADC geolocation-OFF-by-default duty for child media — see `references/domain/privacy-circles-consent.md` §A and `references/domain/child-safety-csam.md` §2).
- **Manual date/location entry** when location permission is denied/unavailable and when EXIF is absent — so date and place are never blocked on a permission.
- **Note-only path** always available — a permission-free way to create an event (text + optional manual date/location).
- Per-permission independence: granting/denying one (e.g. mic) must not block the others or the fallback.
- A way to **recover** after an earlier denial (best-effort re-request where the browser allows, plus guaranteed Arabic-first guidance to re-enable in browser settings) without dead-ending.
- When the upload fallback hands a file to the save pipeline (US-1.2), the **global durability invariant applies end-to-end** — success/"saved" is shown only after a server-acknowledged, integrity-verified durable write (confirm-before-persist), never on "uploading"/"queued"; a failed fallback upload surfaces a visible retry, **never** a silent partial save or false saved state. The fallback is the highest-risk upload path and serves the most at-risk personas — see `references/domain/media-durability.md`. *(This restates the inherited durability baseline at the seam; the pipeline itself remains US-1.2.)*

**Out of scope (deferred / roadmap):**
- The event-creation form and save logic itself (US-1.1) and the media capture/upload pipeline (US-1.2) — this story only governs *permission handling + fallback routing into* them.
- Native-app permission models (web-only MVP).
- Background/precise geofencing or continuous location (only on-demand, per-capture location).

## Acceptance Criteria
1. **Given** a user reaching a capture step for the first time, **when** a permission is needed, **then** an in-context, Arabic-first rationale is shown **before** the browser's native prompt, stating why it's asked and that denying is fine (an alternative exists). The rationale explains **device access only** (e.g. "this lets you take a photo here") and does **not** imply that granting shares anything with anyone — anything created defaults to private/Me-Only (G1). The **location** rationale additionally states that location is **optional** and that leaving it blank is the normal, safe choice (distinct in tone from camera/mic).
2. **Given** the user **grants** camera/mic, **when** they proceed, **then** live capture is available and event creation continues normally (handed to US-1.2).
3. **Given** the user **denies or dismisses** a permission, **when** they continue, **then** event creation is **not blocked** — the upload fallback and note-only path remain fully available, no error dead-end appears, and any data the user already entered (note text, date, partial location, attached media, chosen circle) is **retained** across the transition to the fallback. *(Hard requirement: permission denial never blocks event creation.)*
4. **Given** **location** permission is denied, dismissed, or unavailable, **when** the user adds an event, **then** the location is left **empty** (the app does **not** silently substitute IP/coarse geolocation), and the user can still enter a location **manually** (or leave it blank) and set the date manually — location/date are never blocked on the permission.
5. **Given** a **partially granted** state (e.g. camera yes, mic no), **when** the user proceeds, **then** the available modalities work and the unavailable one degrades to upload, with a clear note about what's available.
6. **Given** an **unsupported browser** (API missing), **when** the user reaches capture, **then** the app detects the absence and routes straight to the upload + manual-entry fallback without throwing or showing a broken prompt.
7. **Given** a user who denied earlier, **when** they return to a capture step, **then** they are offered a clear, non-nagging way to re-enable — and are never repeatedly hard-blocked by the prompt. Because browsers commonly suppress the native re-prompt after a hard denial, an in-app re-request is **best-effort only** (used where the browser still permits a re-prompt); the **always-available guaranteed path** is concrete, Arabic-first, RTL-correct (G6) re-enable guidance actionable for a non-technical Elderly user (step guidance for the user's detected browser — a generic "change your browser settings" message alone does **not** satisfy this AC), shown alongside the ever-present note-only/upload fallback so the user is never hard-blocked or dead-ended regardless of whether the native prompt can be resurfaced.
8. **Given** any permission rationale or fallback UI, **when** it renders, **then** copy is Arabic-first, correct in RTL (G6), reassuring (not alarmist), and screen-reader operable per US-0.4.
9. **Given** a permission granted earlier but **revoked by the browser mid-session** while an add-event form is open, **when** the user next attempts capture, **then** the app detects the revoked state, degrades that modality to the upload/manual-entry fallback, and the in-progress event (note text, date, location, attached media, chosen circle) is **preserved with no data loss and no dead-end**.
10. **Given** location permission is granted and a location is **auto-suggested**, **when** the suggestion is wrong, **then** the user can override it with manual entry or **clear it entirely** before saving — an auto-filled location is never locked-in or silently committed.
11. **Given** a user who chose a **note-only or upload** event, **when** they create it, **then** they see **zero** permission prompts; rationale prompts are requested **just-in-time** only for the modality the user actually chose (e.g. mic only when they tap voice), and **no more than one** custom rationale precedes any single native prompt — so first-time capture is never a pile-up of stacked interstitials.
12. **Given** a user who denies/dismisses a permission and then completes a first event via fallback, **when** their session is analyzed, **then** `capture_permission_result` (denied/dismissed/unsupported) and the resulting `capture_fallback_used` are correlatable — via the same content-blind session/user key used by US-0.3 — to the first-event/activation funnel, so a *denial-then-activate* path is distinguishable from a *denial-then-abandon* path. Structural keys only, no content (G4).
13. **Given** in-progress form state (note text, date, partial location, attached media, chosen circle) during the permission detour or a modality degradation, **when** the tab is refreshed or navigated away mid-detour, **then** the app must either restore the entered state or warn before loss is incurred — **never silently discard** it; a live-captured media blob not yet uploaded is preserved or the user is explicitly prompted before it is dropped (no silent failure baseline). *(Durable persistence of the final saved event remains owned by US-1.1/US-1.2.)*

## Quality Scenarios (gated)
- **Time-to-first-event & first-revisit** `J1` — Permission handling does not push first-event past target; a user who denies all permissions can still reach a saved first event within the J1 target (median < 3 min from signup). *(US-0.2 must not regress US-1.1's activation target.)*
- **Accessibility (WCAG AA on core flows)** `J1 J2` — The permission rationale and the upload/manual-entry fallback are screen-reader operable and keyboard-navigable, per US-0.4 (Elderly persona most at-risk).
- **Permission ≠ sharing comprehension (Arabic-first)** `J1 J2` — Permission rationale copy is unambiguous and non-scary in Arabic; users understand that **granting a device permission shares nothing with anyone** (it only enables local capture) and that anything created defaults to private/Me-Only (G1). Test that users do **not** mistake granting a permission for sharing. *(The circle-default trust model itself is owned by US-1.1; this story only guards that the permission ask does not mis-teach it.)*

## Non-Functional Requirements (deltas only)
- Permission state must be checked **without** forcing a blocking prompt on page load; the prompt appears in-context at the capture step (< 1s to surface after the user opts to capture). Rationale prompts are requested **just-in-time** for the modality the user chose — never all three up front.
- Fallback routing (denied/unsupported → upload + manual entry) **surfaces within < 1s** of the denial/unsupported result, with **no error screen, no dead-end, and no loss of already-entered form state**.

## Edge & Negative Cases
- **Denied** (camera/mic/location) → fall back to upload + manual entry; never block (AC-3, AC-4).
- **Dismissed** (prompt closed without a decision) → treated as not-granted; fallback available; can re-request later (AC-7).
- **Partially granted** (one of camera/mic/location only) → available modality works, others degrade gracefully (AC-5).
- **Unsupported browser / missing API** → detect and route to fallback; no thrown error, no broken native prompt (AC-6).
- **Permission revoked mid-session** (user changes browser settings while a form is open) → next capture attempt degrades to fallback without losing the in-progress event (AC-9).
- **Location denied but coarse-geo available** → location stays empty; never auto-fill from IP/coarse geolocation (AC-4).
- **Granted but inaccurate auto-location** → user can correct or clear it before save; never silently committed (AC-10).
- **Repeated hard block** (browser remembers a denial) → must not trap the user; always offer note-only / upload path and clear re-enable guidance.
- **Native re-prompt suppressed after hard denial** (Safari/Chrome differ) → in-app re-request may silently do nothing; the guaranteed Arabic-first settings-guidance + fallback path must catch the user, never strand them (AC-7).
- **Fallback upload drops mid-transfer** (Elderly / flaky MENA network, tab backgrounded) → visible failure + retry, no false saved state, no loss of the selected file (durability/no-silent-failure baseline; inherits US-1.2 behavior).

## Telemetry (content-blind)
- `capture_permission_requested` — when an in-context rationale/prompt is shown (with permission_type enum {camera, mic, location}).
- `capture_permission_result` — the outcome (with permission_type enum, result enum {granted, denied, dismissed, unsupported}). **Structural only — no media, no content (G4).**
- `capture_fallback_used` — when the user proceeds via upload/manual entry after a denial/unsupported state (with fallback_type enum {upload, manual_location, manual_date, note_only}).
- **All three events carry the US-0.3 content-blind correlation key** (session/user) so denial → fallback → activation is joinable to the first-event funnel (see AC-12). Enums only.
- **No geolocation value is ever transmitted in any event** — `capture_permission_result`/`capture_fallback_used` carry the structural grant/deny enum only; the resolved location value (coordinates, place name, or any geolocation derived from a granted permission) is **never** included in telemetry (G4 + child-data minimization, COPPA-2025/AADC).

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] All gated quality scenarios pass (Sara-verified)
- [ ] Global guardrails upheld: G6 (Arabic-first/RTL rationale), G4 (content-blind permission telemetry) — and the cross-story invariant that permission denial never blocks event creation (supports US-1.1 edge case)
- [ ] Arabic/RTL reviewed (G6) — rationale copy verified non-alarmist in Arabic
- [ ] Accessibility AA on the permission + fallback flow (US-0.4)
- [ ] Telemetry events firing and verified content-blind — including verified to carry **no geolocation value** (structural grant/deny only) and to be **joinable to the US-0.3 activation funnel** (AC-12)
