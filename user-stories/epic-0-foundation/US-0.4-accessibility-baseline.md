# US-0.4 — Accessibility baseline (WCAG 2.1 AA on core flows)

- **Epic:** Foundation & Measurement (cross-cutting)
- **Priority:** 🟠 Supporting
- **MVP-blocking:** Yes (gating) *— the reusable checklist/pattern set (AC8) must exist before any core-flow story can satisfy its DoD line "Accessibility AA on this flow (US-0.4)"; the per-flow AA verification is then done within each core-flow story.*
- **Journeys:** J1, J2, J4
- **Source:** QC scenario *Accessibility (WCAG AA on core flows)*; CONVENTIONS §2 accessibility baseline; **Elderly Individuals** persona (most at-risk)
- **Depends on:** Cross-cutting — applies to capture (US-1.1/US-1.2), import (US-1.3), browse (US-2.1), and voice capture/playback within US-1.2. *Build order: the checklist/pattern-set deliverable (AC8) is a prerequisite for — and the per-flow AA passes are concurrent with — US-1.1/US-1.2/US-1.3/US-2.1.*
- **Status:** Ready for build

## Story
As an **Elderly Individual (and any user relying on assistive technology)**, I want **the capture, import, browse, and voice-playback flows to be fully usable with a screen reader and keyboard, with readable contrast and correct Arabic/RTL**, so that **I can preserve and revisit my memories without being locked out by the interface**.

## Context / Why this matters
The Elderly persona is explicitly the **most at-risk on UX and accessibility** (UJM personas; CONVENTIONS §3) and is a primary user of J4 (revisit). If the core flows aren't accessible, this segment can't activate or return — and the bet fails for a UX reason, not a demand reason. This is a **baseline other stories inherit**, not a one-off feature: the QC gates *Accessibility (WCAG AA on core flows)* over J1, J2, and J4, and CONVENTIONS §2 makes WCAG 2.1 AA, screen-reader operability, and voice-note transcripts a global property of capture, import, browse, and voice playback. This story defines that baseline once so each core-flow story's Definition of Done can reference it instead of re-specifying it.

## Scope
**In scope (MVP):**
- **WCAG 2.1 AA** conformance on the **core flows**: capture (US-1.1/US-1.2), import (US-1.3), browse/timeline (US-2.1), and voice playback.
- **Screen-reader operability** end-to-end on those flows: meaningful names/roles/states, focus order, status/error announcements, no keyboard traps.
- **Full keyboard navigation** — every action on the core flows is reachable and operable without a pointer, with a visible focus indicator.
- **AA contrast** for text and meaningful UI (≥ 4.5:1 normal text, ≥ 3:1 large text/essential non-text), and respect for user font-size/zoom up to 200% without loss of function.
- **Voice notes have transcripts** — any voice-note capture/playback exposes a text transcript (also serves G4-safe accessibility, not content analytics).
- **Arabic/RTL correctness (G6)** — correct RTL reading/focus order, mirrored layout/controls, and correct bidi handling; screen reader announces Arabic content correctly.
- A reusable **accessibility checklist/pattern set** the other core-flow stories adopt (so their DoD line "Accessibility AA on this flow (US-0.4)" is concretely testable).

**Out of scope (deferred / roadmap):**
- WCAG **AAA** targets.
- Accessibility of **roadmap/deferred** surfaces (discoverable public surface, AI summaries, inheritance/J8 — G9).
- Full localization to languages beyond Arabic-first/English (G6 governs Arabic-first; other locales are not MVP).
- Native-app / mobile-OS accessibility APIs (web-only MVP — applies to the responsive web app and phone-browser).
- **Accessibility of export (US-1.4) and per-item legacy consent capture (US-4.1)** is **not** owned here — those flows are MVP-blocking and un-backfillable (G5) and each carries its **own** DoD line "Accessibility AA on this flow (US-0.4)", verified within US-1.4 / US-4.1 against this baseline's reusable checklist (AC8). They are excluded from *this* story's per-flow passes, not from MVP accessibility.

## Acceptance Criteria
1. **Given** each core flow (capture, import, browse, voice playback), **when** operated with a screen reader, **then** every control has a meaningful accessible name, role, and state; status and error messages are announced; and the flow can be completed without sighted assistance.
2. **Given** each core flow, **when** operated with **keyboard only**, **then** every action is reachable and operable in a logical order, the focus indicator is always visible, and there are **no keyboard traps**.
3. **Given** any voice note, **when** it is captured or played back, **then** a **text transcript** is available to the user (and to assistive tech).
4. **Given** text and essential UI on core flows, **when** measured, **then** contrast meets **AA** (≥ 4.5:1 normal text, ≥ 3:1 large text and essential non-text); text **resizes to 200%** without loss of content or function (WCAG 1.4.4); and content **reflows to a 320px-equivalent viewport / 400% zoom** with no loss of information and no two-dimensional scrolling for the primary reading direction (WCAG 1.4.10), including with enlarged system fonts.
5. **Given** the Arabic-first UI, **when** rendered RTL, **then** reading order, focus order, and control placement are correctly mirrored, bidi text is correct, and the screen reader announces Arabic content accurately (G6).
6. **Given** form fields on core flows (capture/import), **when** an error occurs, **then** the error is programmatically associated with its field and announced — not conveyed by color/position alone.
7. **Given** media-heavy controls (timeline browse, playback), **when** navigated by keyboard/screen reader, **then** play/pause/scrub and granularity (year/month/day) controls are operable and labeled, and time-based media offers pause/stop (no unavoidable auto-play traps).
8. **Given** the baseline checklist, **when** a core-flow story (US-1.1, US-1.2, US-1.3, US-2.1; voice capture/playback within US-1.2) is built, **then** that story's DoD can be verified against this checklist (the baseline is concretely reusable, not aspirational). The checklist enumerates each of AC1–AC10 as a **per-flow, pass/fail-checkable** item (screen-reader names/roles/states, keyboard + visible focus, transcripts, AA contrast, reflow at 1.4.4 **and** 1.4.10, RTL + bidi + Arabic AT, error association, media controls, privacy-circle state, accessible save/failure-recovery), names the AT matrix from the NFRs, and an adopting story may mark its DoD line PASS **only** by citing each checklist item as met — no item marked N/A without a documented reason.
9. **Given** any capture/share/browse control that sets or displays a privacy circle, **when** operated with a screen reader, **then** the current circle (Me Only / Family / Public) and any pending circle **change** are exposed as accessible state and announced before commit — never conveyed by color or position alone — and the announced Arabic label is unambiguous (G6).
10. **Given** an upload/import/save on a core flow, **when** the media is durably persisted (per §2 durability), **then** the success is announced to assistive tech only **after** the confirmed durable write; and **when** the operation fails or partially fails, **then** the failure and its recovery affordance (retry/resume/cancel) are announced via a live region, are reachable and operable by keyboard and screen reader, and focus is moved or directed to the recovery control — no success, failure, or retry state is perceivable by sighted-pointer users only (never conveyed by a visual-only thumbnail/spinner).

## Quality Scenarios (gated)
- **Accessibility (WCAG AA on core flows)** `J1 J2 J4` — Capture, import, browse, and voice playback are **screen-reader operable with transcripts** — critical for the elderly segment. **Pass bar:** zero WCAG 2.1 AA violations on an automated scan (axe/Lighthouse) on each core flow at desktop **and** phone-browser breakpoints, **AND** a successful end-to-end screen-reader + keyboard-only completion of each core flow on the named AT matrix (see NFRs). *(This story owns this scenario; other core-flow stories inherit it.)*
- **Circle comprehension — accessibility slice (Arabic-first)** `J1 J2` — Privacy-circle labels and capture copy are perceivable, correctly announced by screen readers, and legible to low-vision users in Arabic (accessibility intersects perceived trust, G6). **Pass bar:** AC9 holds — circle state and any pending change are announced before commit and never color/position-only. *(The mis-set-rate / comprehension metric itself is owned and gated by US-3.x, not here.)*

## Non-Functional Requirements (deltas only)
- Conformance target is **WCAG 2.1 Level AA** on the four core flows (tighter than a generic "accessible" goal — this is the explicit measurable bar).
- Accessibility must hold at the **responsive/phone-browser** breakpoints, not only desktop (web-only "cross-device" means the phone browser too).
- Transcripts for voice notes are stored/handled as memory content (subject to the same privacy circle as the note) and are **never** routed into content-blind analytics (G4).
- **Verification oracle:** (a) automated AA scan with **0 AA-level violations** on each core flow at desktop and phone-browser breakpoints; (b) manual completion of each flow against a named screen-reader/browser matrix — at least **VoiceOver + Safari (iOS), NVDA + Chrome/Firefox (Windows), TalkBack + Chrome (Android mobile-browser)** — including Arabic/RTL; (c) keyboard-only walkthrough with no traps.
- **Arabic AT honesty (G6):** where a target AT cannot announce a specific Arabic construct (e.g. tashkeel, mixed Arabic/Latin bidi), the gap is **documented** and the UI provides a perceivable fallback (visible text) — not a silent AA pass. No "Arabic-first accessible" claim is made beyond what the named AT matrix verifies.

## Edge & Negative Cases
- **Screen-reader on capture** — a non-sighted user must be able to add a note-only event and an upload-based event end-to-end (intersects US-0.2 fallback paths).
- **Keyboard trap in a media/modal control** (capture preview, playback, date picker) → must be impossible; focus can always escape.
- **Color-only signaling** (e.g. privacy-circle state, validation error, required field) → must also be conveyed by text/icon/label, not color alone.
- **RTL mirroring bug** — controls or focus order that don't mirror in Arabic → fails G6 even if functional in LTR.
- **Auto-playing/time-based media** without an accessible pause/stop → fails AA; playback must be controllable.
- **Low-vision zoom** — content lost, clipped, or requiring 2-D scrolling at **400% zoom / a 320px-equivalent viewport** (WCAG 1.4.10), or content/function lost at 200% text resize (WCAG 1.4.4) → fails AA reflow.
- **Silent upload/save drop under screen reader** — no audible success or failure cue, so a non-sighted user believes a memory was preserved when it was lost → fails (permanent-data-loss risk specific to the AT path; success must be announced only after the durable write).
- **Accessible upload-failure recovery** — an async upload/import/save failure whose retry/resume/cancel affordance is perceivable or operable by sighted-pointer users only → fails; the failure and its recovery control must be announced and keyboard/SR-operable.

## Telemetry (content-blind)
- None specific to this story. Accessibility is a cross-cutting property, not a funnel stage; it does not introduce new content-blind events beyond what the underlying core-flow stories already emit (US-0.3). Transcripts are memory content and **must not** be emitted to analytics (G4).

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] All gated quality scenarios pass (Sara-verified) — screen-reader + keyboard walkthrough of capture, import, browse, voice playback
- [ ] Global guardrails upheld: G6 (Arabic-first/RTL correctness — primary); G4 (transcripts never sent to analytics)
- [ ] Arabic/RTL reviewed (G6) — mirroring, bidi, and screen-reader Arabic announcement verified against the named AT matrix; known AT limitations documented, not hidden
- [ ] Privacy-circle state perceivable under screen reader (AC9) — current circle and pending change announced before commit, never color/position-only
- [ ] Accessible save/failure recovery on the AT path (AC10) — durable-save success announced only after the confirmed write; upload/import/save failure + retry/resume/cancel announced and keyboard/SR-operable, never visual-only
- [ ] Accessibility AA verified on all four core flows at desktop **and** phone-browser breakpoints (0 AA violations on automated scan + manual AT-matrix completion)
- [ ] Reusable accessibility checklist published for adoption by core-flow stories (US-1.1, US-1.2, US-1.3, US-2.1; voice capture/playback within US-1.2)
- [ ] Telemetry — confirmed no new content-bearing events; transcripts excluded from analytics
