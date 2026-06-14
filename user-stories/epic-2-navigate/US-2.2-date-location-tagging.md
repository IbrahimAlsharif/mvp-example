# US-2.2 — Date & location tagging on events

- **Epic:** Navigate (Core Value 2)
- **Priority:** 🟠 Supporting
- **MVP-blocking:** No
- **Journeys:** J2 (capture — set date & location), J4 (browse — the "place" dimension)
- **Source:** QC → *Date & location tagging on events* (🟠 Moderate); VQM → Core Value 2 → Date & location tagging (UX: wrong/auto-misplaced location erodes confidence; Security: precise location on shared-link events leaks sensitive whereabouts, esp. children); UJM → J2 steps 3–4
- **Depends on:** US-1.1 (timeline event creation — date & location attach to an event)
- **Status:** Ready for build

## Story
As a **Parent / Family Archivist (any persona)**, I want to **set or confirm an event's date and add a location**, so that **my timeline has real chronology and a sense of place** — turning a pile of media into a navigable record — *without* a wrong location undermining my trust in it or a precise location on a shared event leaking where my family (especially my children) actually were.

## Context / Why this matters
Date and location give the timeline its structure and the "place" dimension that differentiates it from a photo gallery (VQM Core Value 2). But the same dimension carries two value-killing risks: an auto-misplaced location erodes confidence in the accuracy of the whole record (UX), and a precise location attached to a **shared-link** event leaks sensitive whereabouts — acutely so for children's content (Security). This story makes date/location both trustworthy and safe to share.

## Scope
**In scope (MVP):**
- **Set / confirm a date** on an event (J2 step 3): defaults sensibly (today, or capture/EXIF date when available), freely editable to any past/future date, with correct timezone handling.
- **Add a location** (J2 step 4): auto-suggested (e.g. from device/browser geolocation or media metadata) **or** entered manually, with the auto-suggestion always confirmable/overridable before it sticks.
- Surface date & location on the event and as the **"place" dimension** the timeline (US-2.1) navigates by.
- **Security control for shared content:** on **shared-link (unlisted Public) events** (US-3.1), precise location must **not** leak sensitive whereabouts — provide **precision reduction (coarsening) and/or omission** controls for location on shared content, coordinated with the privacy circle (US-3.1) and media-URL security (US-3.3). Coarsening reduces the shared location to **no finer than city/region level (or omitted)**; the safe state (reduced or omitted) is the system default for shared-link location, never exact coordinates. The control applies to **both** the event's displayed location field **and** the GPS coordinates embedded in the media file's own EXIF/metadata as exposed via the share link — coarsening the displayed field alone is not sufficient if the downloadable file still carries exact coordinates. EXIF-stripping/coarsening of the served file is owned by this story (with media-URL security handled by US-3.3).

**Out of scope (deferred / roadmap):**
- Map browsing / "places" view, geofencing, or location-based search (G9 — roadmap; this story tags, it does not build a map surface).
- Reverse-geocoding into a discoverable/indexed surface (no public surface at MVP — G1).
- Bulk re-tagging of imported events beyond the EXIF date backfill owned by bulk import (US-1.3).

## Acceptance Criteria
1. **Given** the add/edit-event form, **when** it opens, **then** the date defaults to a sensible value (capture/EXIF date if present, else today) and is **freely editable** to any valid past or future date.
2. **Given** a user sets or confirms a date, **when** the event is saved and later browsed (US-2.1), **then** the event appears at exactly that date in every granularity — timezone handling is consistent so the date does not drift by a day across the user's sessions/devices.
3. **Given** the location step, **when** an auto-suggested location is available, **then** it is presented as a **suggestion the user must confirm or change** — never silently committed — and the user can clear it or type a manual location instead.
4. **Given** no GPS / geolocation permission denied / no media location metadata, **when** the user reaches the location step, **then** location is **optional** and its absence never blocks saving the event (consistent with US-0.2 permission handling).
5. **Given** a manual location override, **when** the user saves, **then** the manual value is stored and the (rejected) auto-suggestion is not retained as the event's location.
6. **Given** an event whose privacy circle is **Public (unlisted link)** (US-3.1) **and** that carries a location, **when** the event is shared or its share link is viewed, **then** precise coordinates are **not** exposed — location is reduced to **no finer than city/region level, or omitted**, per the shared-content control, and exact whereabouts are never leaked through the shared view, its media URLs (US-3.3), **or the GPS coordinates embedded in the served media file's own EXIF/metadata** (the EXIF coordinates are stripped or coarsened to match the shared-display precision before the file is served to any viewer).
7. **Given** an event in a non-shared circle (Me Only / Family), **when** the owner views it, **then** they may see the full-precision location they recorded (the reduction applies to shared exposure, not to the owner's own private record).
8. **Given** a user changes an event's circle **to** Public (unlisted link) after it already had a precise location, **when** the change is saved, **then** the shared-location precision control is applied to that event's shared exposure (changing circle re-evaluates location exposure — no stale precise location leaks).
9. **(RTL)** **Given** an Arabic locale, **when** the date picker and location field render, **then** date formatting, calendar direction, and the location/precision controls are correct and unambiguous in RTL (G6).
10. **Given** an existing event with media and recorded per-item legacy consent (US-4.1), **when** its date or location is edited (or its location is coarsened/omitted for sharing), **then** the event's media bytes and its per-item consent metadata are unchanged — only the date/location fields change (G2: edits never destroy media; G5: consent un-backfillable).
11. **Given** a shared-link event whose location precision has been reduced or omitted, **when** the share link is viewed from any session, device, CDN edge, or after a fresh read, **then** the reduced/omitted state is what is served — exact coordinates never surface via a stale read or cache (per the global Consistency baseline, CONVENTIONS §2).

## Quality Scenarios (gated)
> The Quality Canvas lists no scenario uniquely scoped to date/location; this story's correctness is verified against the QC risks it owns (below) and contributes to **Timeline integrity** `J4` (events land at the correct date) and **Media-URL security** `J2 J3` (shared-link location must not leak via the event or its media URLs), both gated in their owning stories (US-2.1, US-3.3).
- **Location-precision safety on shared links** `J3` — A shared-link (unlisted Public) event with a location never exposes precise/sensitive whereabouts; precision is reduced (no finer than city/region) or omitted, verified on the shared view, its media URLs, **and the served media file's embedded GPS EXIF** (esp. child content). *(Verified here; enforced jointly with US-3.1 / US-3.3.)*
- **Date correctness across sessions** `J4` — An event's date does not drift by timezone; it appears at the same date on another of the user's sessions/devices (contributes to Timeline integrity, US-2.1).

## Non-Functional Requirements (deltas only)
- Date and location editing follow the global primary-action budget (acknowledged < 1s); no separate latency target.
- Timezone correctness: an event's date is stored and rendered so it does not shift across the user's devices/sessions or DST boundaries.
- Shared-link location precision-reduction default must be conservative — the safe state (location reduced to **no finer than city/region level, or omitted**) is the default, not an opt-in. This applies to both the displayed location field and the served media file's embedded GPS EXIF.
- The reduced/omitted shared-location state must read consistently across the user's sessions/devices and any cache/CDN edge (per the global Consistency baseline, CONVENTIONS §2) — a stale read must never re-expose exact coordinates.

## Edge & Negative Cases
- **Auto-misplaced location** — a wrong auto-suggested location erodes confidence in the record; suggestions must always be confirmable/overridable and never silently committed (the core UX risk for this feature).
- **No GPS / permission denied** — location must remain optional; never block event save; offer manual entry.
- **Manual override ignored** — a user's manual location must win over the auto-suggestion; the rejected suggestion must not resurface as the stored value.
- **Timezone / DST drift** — an event dated near midnight or across a DST change must not jump to an adjacent day on another device/session.
- **Precise location leak on shared link** — exact coordinates on an unlisted-Public event (esp. children) leaking sensitive whereabouts is a security failure; precision reduction/omission must apply to the shared exposure and to any media URL metadata (US-3.3).
- **EXIF coordinate leak** — a coarsened/omitted *displayed* location while the downloadable media file still carries intact GPS EXIF coordinates is a failure; the served file's embedded coordinates must be stripped/coarsened to match the shared-display precision, including when the user manually overrode the displayed location (AC5) but the file's original capture coordinates differ.
- **Edit-time integrity loss** — editing date/location or coarsening location for sharing must never detach the event's media or drop its per-item consent metadata (US-4.1); only the date/location fields change (G2, G5).
- **Circle change re-exposing location** — upgrading an event to Public (unlisted link) must re-apply the location precision control; a previously private precise location must not leak after the change.
- **Downgrade does not recall already-exposed location** — downgrading a previously-shared event (Public → Family/Me Only) revokes future server-side access to its (coarsened) location, but cannot recall location already viewed or downloaded via the prior live link; the product must not imply full location recall (per privacy-circles-consent §2 — honesty over false completeness). Share-link copy must set this expectation honestly.

## Telemetry (content-blind)
- `event_date_set` — when a date is set or changed (structural only: was_default bool, source enum {today, exif, manual}). **No content** (G4).
- `event_location_added` — when a location is attached (structural only: source enum {auto, manual}, was_suggestion_overridden bool). **No coordinates, no place name** transmitted as content.
- `event_location_suggestion_rejected` — when an auto-suggested location is cleared or overridden.
- `shared_location_precision_applied` — when the precision-reduction/omission control is applied on a shared-link event (with precision_mode enum {reduced, omitted}). **No coordinates.**

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] Gated quality scenarios pass (Sara-verified): shared-link location safety (jointly with US-3.1/US-3.3), date correctness across sessions
- [ ] Global guardrails upheld: G1 (no discoverable surface from location), G2 (location/date edits never destroy media), G4 (content-blind telemetry — no coordinates/place names), G6
- [ ] Arabic/RTL reviewed (G6) — date formatting and precision controls unambiguous RTL
- [ ] Accessibility AA on the date/location flow (US-0.4)
- [ ] Telemetry events firing and verified content-blind (no coordinates or place names transmitted)
