# US-1.1 — Timeline Event Creation

- **Epic:** Preserve (Core Value 1)
- **Priority:** 🔴 Load-bearing
- **MVP-blocking:** Yes
- **Journeys:** J1 (first event), J2 (core recurring action)
- **Source:** QC → *Timeline Event Creation* (🔴 High); UJM → J1 steps 4–9, J2; VQM → Core Value 1 → Timeline Event Creation
- **Depends on:** US-0.1 (account/auth) — must define session/auth before this enters build; US-1.2 (media capture & upload) — must define the checksum/ETag-verified durable upload contract (AC-3, AC-10); US-3.1 (privacy circles) — must define the child-media warning contract (AC4) before AC-9 here is buildable; US-4.1 (legacy consent capture) — must define the per-item consent persistence contract before AC-6/AC-7 are buildable; US-0.3 (instrumentation). These dependency contracts must be fixed before this story enters build (workspace is pre-build).
- **Status:** Ready for build

## Story
As a **Parent / Family Archivist (any persona)**, I want to **create a dated life event with media, location, and a privacy circle in one fast flow**, so that **logging a moment is effortless enough to become a habit** — because this is the exact action the product's primary metric counts.

## Context / Why this matters
Timeline Event Creation *is* the action that "Events Added Per User Per Month" counts. If creating an event isn't fast and reliable, the habit never forms and the MVP experiment cannot conclude. This story is the spine of the bet: J1 produces the *first* event (activation) and J2 is the *recurring* event (retention). Any friction here makes the assumption fail for a UX reason rather than a demand reason — which corrupts the experiment. Note: AC-7's atomic multi-part write spans tables owned by US-3.1 (circle) and US-4.1 (legacy consent), so those persistence contracts must be fixed before this story enters build.

## Scope
**In scope (MVP):**
- An "＋ Add event" entry point on the home timeline, and a guided first-event prompt during onboarding (J1 step 4).
- An add-event form that accepts: media (photo/video/voice via US-1.2) **and/or** a text note; a date; an optional location (US-2.2); a privacy circle (US-3.1); and records legacy consent with the circle choice (US-4.1).
- Save → media uploads, event is durably persisted, and a success confirmation appears with the event on the timeline.
- A note-only event (no media) is valid.
- Target: single-photo event saved in **under 60 seconds**; first event (J1) reachable in **under 3 minutes from signup**.

**Out of scope (deferred / roadmap):**
- Life Playback (US-2.3), bulk import (US-1.3 — separate story), Future Capsules (US-4.2).
- Rich editing/versioning history beyond create + basic edit.
- Any discoverable/public feed (G1).

## Acceptance Criteria
1. **Given** an authenticated user on the home timeline, **when** they tap "＋ Add event", **then** the add-event form opens with the privacy circle pre-set to **Me Only** (G1).
2. **Given** the form, **when** the user adds at least one of {media, text note}, **then** Save is enabled; **when** neither is present, Save is disabled with a clear hint.
3. **Given** a completed form, **when** the user taps Save, **then** the system uploads media (delegated to US-1.2), persists the event, and shows a success confirmation **only after** durable persistence is confirmed (never optimistic-confirm before persistence — global durability baseline).
4. **Given** a successful save, **when** the confirmation appears, **then** the new event is visible on the timeline at its chosen date without a manual refresh, and remains present after a fresh reload (consistency baseline).
5. **Given** the date field, **when** the form opens, **then** it defaults to today but is freely editable to any past/future date (back-dating is required for real-life events). The date picker renders correctly in RTL and displays dates unambiguously in the Arabic locale (G6); the stored canonical date is calendar-unambiguous (store an absolute/Gregorian canonical value — if Hijri display is offered, the mapping is explicit and reversible), and a date entered/displayed in the Arabic locale round-trips to the same calendar date after save and on any of the user's devices (no off-by-one from calendar/locale conversion).
6. **Given** the user selects a privacy circle other than Me Only, **when** they save, **then** the chosen circle and its legacy-consent flag are stored atomically with the event (US-3.1, US-4.1).
7. **Given** a save that writes event + media + circle + legacy-consent, **when** any single part fails to persist, **then** the whole save fails atomically (no event is shown as saved, no orphaned media or circle/consent rows remain), a retryable error is surfaced, and the AC-3 success confirmation fires **only after ALL parts — including the legacy-consent flag (G5) — are durably committed**.
8. **Given** the user taps Save more than once (double-tap, or retry on a slow network), **when** the saves resolve, **then** exactly one event is persisted (idempotent submit) and no duplicate appears on the timeline.
9. **Given** the user sets the circle to **Public** (unlisted shareable link, G1) on **any** event, **when** they attempt to save, **then** the blocking child-media warning from US-3.1 (AC4) is shown and must be acknowledged before persistence; the gate fires on **every** transition to the Public circle as a universal friction step — **no** automated content/child detection is performed (G3 forbids proactive content scanning, so the trigger is the Public action itself, not a detector). Declining leaves the circle at its prior value and the event is not exposed. The warning copy must be reviewed in Arabic (G6) and state plainly that Public/link sharing cannot be fully recalled once a recipient saves a copy.
10. **Given** an in-progress save, **when** the upload is slow, **then** progress is shown and the UI never appears "done" until persistence is confirmed; the in-progress original is never discarded or treated as saved until the server acknowledges a durable, integrity-verified write (checksum/ETag match, per US-1.2), and the user can leave a clearly-pending state without data loss.
11. **Given** an in-progress save where the user navigates away (or closes the tab), **when** they return, **then** the event is shown in an explicit pending/uploading state (never silently lost and never silently completed) and is resumable/retryable or clearly persisted — the only copy of a memory is never destroyed (G2).
12. **Given** the privacy-circle selector, **when** it is shown (including in Arabic/RTL), **then** each circle option states its visibility scope in plain language so the user can confirm who can see the memory before saving (G6, perceived trust).
13. **(J1)** **Given** a brand-new user who just saved their first event, **when** the save completes, **then** the user is guided into one timeline **revisit** of the now-populated timeline (the "come back" half of the bet starts in session 1).
14. **Given** a user who has **denied** camera/mic/location permission, **when** they open the add-event form, **then** they can still create a valid note-only or file-upload event — the denied capture path degrades gracefully with an inline re-grant hint and **never** blocks Save; the denied permission never disables the add-event entry point (see US-0.2). A missing/denied location silently yields a valid event with location simply omitted (location-absent is a first-class valid state), never a blocking permission error.
15. **Given** an event saved and confirmed in one of the user's web sessions/devices, **when** the user opens the timeline in a second session/device (or after cache invalidation), **then** the event appears within the target window with identical date, media, location, circle, and consent metadata — no stale-read gap (consistency baseline, CONVENTIONS §2).
16. **Given** a durably persisted event, **when** it is later affected by an accidental or buggy delete, **then** the item is recoverable (versioning / soft-delete / recoverable trash) and is **never** permanently erased except by an explicit, confirmed user action (G2); the client-computed ingest checksum (per AC-10) is persisted as durable preservation metadata so lifetime fixity re-verification and the US-1.4 export fixity manifest are not foreclosed (G5).

## Quality Scenarios (gated)
- **Time-to-first-event & first-revisit** `J1` — A new user completes their first full event **and** one timeline revisit within target clicks/seconds from signup; **measure median**, target < 3 min to first event.
- **Upload reliability on poor network** `J1 J2` — On a slow/unstable connection an event **fully persists or clearly fails with retry** — never a silent partial save (success rate ≥ target).
- **Activation instrumentation validity** `J1 J2 J4` — The funnel distinguishes signup → first-event → populated-timeline → first-revisit; analytics never captures memory media/content (G4).
- **Cross-device consistency** `J2 J4` — An event added in one web session/device appears in another (and after refresh) within the target window with identical media + metadata (oracle: AC-15).
- **Circle comprehension (Arabic-first)** `J1 J2 J3` — At the save step a user can correctly state who will be able to see the event; circle labels are unambiguous in Arabic/RTL; mis-set rate below target (perceived trust, G6; owned by US-3.1, asserted here at the create boundary).

## Non-Functional Requirements (deltas only)
- Single-photo event end-to-end (open form → confirmed save) median **< 60s** on a typical pilot connection.
- Save action acknowledged (progress shown) **< 1s** after tap; no frozen UI during upload.
- Cross-session/device fresh-read target window (AC-15): an event confirmed in one session is readable in another session/device (or after cache invalidation) within **the consistency target window** (set per CONVENTIONS §2 fresh-read baseline; pin the concrete value before build).

## Edge & Negative Cases
- **Silent upload drop** — event looks saved but media never persists → must be impossible by construction (confirmation gated on persistence). This is a catastrophic trust failure and directly suppresses the primary metric.
- **Poor-network partial save** — ambiguous half-saved state with no retry → not allowed; surface a retryable failure.
- **Wrong default circle** — must always default to Me Only; a private moment exposed by a bad default is irreparable trust loss.
- **Permission denial** (camera/mic/location) — must not block event creation; user can still create a note-only or upload-based event (see US-0.2).
- **Duplicate submit** (double-tap Save) — must not create two events (idempotent submit, AC-8).
- **Partial multi-part write** (media OK / consent write fails, or the reverse) — must roll back to a no-event state; never a consent-less or media-less persisted event, and never a "saved" confirmation before the consent flag commits (AC-7, G5).
- **Tab/navigation closed mid-upload** — the pending original must be recoverable or the create re-promptable; never a silent loss of the only copy (AC-10, AC-11, G2; confirm-before-delete per US-1.2).
- **Child media reaching Public without the acknowledged warning** — must be impossible in this flow, not only in US-3.1; save is blocked until the warning is acknowledged (AC-9). The gate is triggered by the Public action itself (universal friction), **not** by any automated child/content detection (G3 forbids proactive scanning).
- **Permission denied for one capability only** (e.g. location denied, camera granted) — the event still saves with the denied capability's contribution simply omitted (location-absent is valid); never a blocked Save or surfaced permission error (AC-14).
- **Accidental/buggy delete of a persisted event** — the item is recoverable (soft-delete/versioning) and never permanently erased except by explicit confirmed user action (AC-16, G2).
- **Date in far future/past** — allowed, but validated (no impossible dates).

## Telemetry (content-blind)
- `event_create_started` — when the add-event form opens (with entry source: onboarding vs. timeline).
- `event_create_saved` — on confirmed persistence (with structural metadata only: has_media bool, media_type enum, circle enum, is_first_event bool). **No media, no note text.**
- `event_create_failed` — on failure (with failure_reason enum, retry_offered bool).
- `first_revisit_completed` — when a J1 user completes the guided revisit.

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] All gated quality scenarios pass (Sara-verified)
- [ ] Global guardrails upheld: G1 (Me-Only default), G2 (no system-side destruction), G4 (content-blind telemetry)
- [ ] Arabic/RTL reviewed (G6)
- [ ] Accessibility AA on the capture flow (US-0.4)
- [ ] Telemetry events firing and verified content-blind
