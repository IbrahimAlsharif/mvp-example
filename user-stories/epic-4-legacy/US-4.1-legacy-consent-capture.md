# US-4.1 — Per-item / per-circle legacy consent capture

- **Epic:** Legacy (Core Value 4)
- **Priority:** 🟠 Supporting — but **MVP-blocking foundation**
- **MVP-blocking:** Yes
- **Journeys:** J2 (capture event), J3 (set privacy / manage circles)
- **Source:** QC → *Per-item / per-circle legacy consent capture* (🟠 supporting, MVP-blocking foundation); QC scenario → *Legacy consent capture* `J2 J3`; QC risk → *Legacy foreclosure (missing export or consent capture)*; VQM → Core Value 4 → Per-item / per-circle legacy consent capture; guardrail **G5**
- **Depends on:** US-1.1 (timeline event creation), US-1.3 (bulk/dated import), US-3.1 (privacy circles)
- **Status:** Ready for build

## Story
As a **Knowledge & Legacy Builder (any persona)**, I want **my explicit consent about future heir release to be recorded the moment I set an event's or circle's privacy**, so that **the legacy promise stays legally open** — because heir release of private content requires explicit owner consent, silence must default to *no access*, and this consent can never be added back once an owner is gone.

## Context / Why this matters
This is the un-backfillable half of the legacy promise (G5). Future heir release of private memories legally requires explicit, RUFADAA-aligned owner consent; without it, the archive becomes legally un-releasable later and the whole "across generations" headline is foreclosed — silently and permanently. The owners whose consent matters most are precisely the ones who will eventually be gone, so consent **cannot** be collected retroactively. We therefore capture the consent *metadata* now, atomically with the circle/event, even though heir **release** and inheritance are deliberately deferred to roadmap (G9). At MVP this story builds only the *capture and storage* of the consent flag, plus its inclusion in export (US-1.4) — nothing that acts on it.

## Scope
**In scope (MVP):**
- When an event is created/edited (US-1.1), when items are persisted via dated bulk import (US-1.3), **or** when a privacy circle is set/changed (US-3.1), capture/seed an explicit **legacy-consent decision** for future heir release, recorded per item and resolvable per circle. Bulk import is a consent-capture entry point: imported items default to `unset` (no heir access) per AC-2 so no imported item can exist with a circle but no consent record.
- The consent decision is written **atomically with the circle/event** — it is part of the same persisted record, never a separate optimistic write that can drift from the privacy state.
- **Default posture is "no consent" (silence = no future heir access).** The stored value is an explicit tri-state (`granted` / `denied` / `unset`); `unset` and `denied` both mean *no heir access* and never widen access by default.
- **Per-item granularity:** every event carries its own consent value; a per-circle default may seed an item's value at creation, but the item value is what governs and is independently editable.
- The consent flag (value + circle context + timestamp) is included in the open-format export (US-1.4 / QC *Export completeness*) so the metadata is portable and the future promise is not foreclosed.
- Arabic-first, RTL consent copy that makes clear *what* is being consented to (future heir release) and that **nothing is released now** (G6).

**Out of scope (deferred / roadmap):**
- **Any heir RELEASE, inheritance, account handoff, designate-heir, or death-trigger logic (J8) — DO NOT BUILD (G9).** This story captures consent *metadata only*; nothing consumes it at MVP.
- Notifying, inviting, or granting access to any heir/recipient.
- Escrow, off-platform release, or perpetual-funding mechanisms (roadmap — see QC Future Improvements).
- Legal verification of identity or death (roadmap with J8).

## Acceptance Criteria
1. **Given** the add/edit-event flow (US-1.1) or the privacy-circle step (US-3.1), **when** the user sets a privacy circle, **then** a legacy-consent decision for that item is captured in the **same** save transaction and persisted **atomically** with the event + circle (no item may exist with a circle but no consent record).
2. **Given** a user who never makes an explicit choice, **when** the event is saved, **then** the stored consent value is `unset`, and `unset` is treated identically to `denied` — i.e. **no future heir access** (silence = no access; default posture is no consent).
3. **Given** the consent control, **when** the user actively grants consent, **then** the value is stored as `granted` with an ISO-8601 timestamp; **when** they actively decline, **then** it is stored as `denied` with a timestamp.
4. **Given** two events in the same circle, **when** the user sets a different consent value on one of them, **then** the per-item values are independent — changing one event's consent never changes another's (per-item granularity).
5. **Given** a per-circle consent default exists, **when** a new item is created in that circle, **then** the circle default *seeds* the item's value, but the persisted, governing value is the **item's own** value and remains independently editable afterward.
6. **Given** a user edits an existing event's privacy circle later (J3), **when** they change the circle, **then** the consent decision is re-confirmable in the same transaction and the updated value is again written atomically with the circle change (consent never silently lags the circle).
7. **Given** any event with a stored consent value, **when** the user exports their timeline (US-1.4), **then** the export includes that consent value, its circle context, and timestamp in the open format — **completely and intact** (no item exported without its consent metadata).
8. **Given** the deferred inheritance scope (G9), **when** the system runs at MVP, **then** **no** code path reads the consent flag to grant access to anyone — the flag is captured and exported only; there is **no** release, heir, or death-trigger behavior present.
9. **Given** the Arabic-first requirement (G6), **when** the consent copy is shown, **then** it unambiguously states (in Arabic, RTL) that consent concerns **future** heir release and that **nothing is shared or released now**.
10. **Given** a dated bulk import (US-1.3), **when** N items are persisted, **then** each imported item is written with a consent record in the **same persistence** as the item — defaulting to `unset` (no heir access) per AC-2 — so **no** imported item can exist with a circle but no consent record, even at bulk scale.
11. **Given** the atomic event+circle+consent save, **when** persistence of any part fails, **then** the whole transaction fails as a unit (no event/circle persisted without its consent record), the user sees a **visible failure with a retry affordance**, and **no** success confirmation is shown — never a silent partial save (CONVENTIONS §2).
12. **Given** an export run (US-1.4), **when** any item's consent value, circle context, or timestamp cannot be included, **then** the export **fails visibly** (does not silently produce a partial file) and surfaces which items are affected — an export missing consent metadata is treated as an incomplete, un-backfillable export.

## Quality Scenarios (gated)
- **Legacy consent capture** `J2 J3` — Each item/circle records explicit owner consent for future heir release (RUFADAA-aligned), captured at MVP even though release is deferred. *(This story owns this scenario.)*
- **Export completeness** `J4` — A user can export the full timeline (media + metadata + circle + **consent flags**) in an open format, complete and intact. **MVP-blocking.** *(This story is responsible for the consent-flag portion; export mechanics are owned by US-1.4.)*
- **Privacy enforcement** `J2 J3` — A "Me Only" item is unreachable by any other account via UI *or* direct/API URL. *(Touched: the consent flag must never itself become an access-granting backdoor at MVP — verify no second account gains access via any consent value.)*

## Non-Functional Requirements (deltas only)
- Capturing/persisting the consent decision adds **no** extra user-visible step that breaks the J2 ≤ 60s single-photo-event target — it rides inside the existing privacy/save step (no separate screen).
- Consent write is part of the same atomic persistence as the event/circle; it must never be confirmed before the event's durable persistence is confirmed (global durability baseline).
- Consent value is structured, enumerable metadata only — content-blind; it carries **no** memory media or memory text (G4).

## Edge & Negative Cases
- **Consent missing for legacy items (foreclosure)** — an item persisted with a circle but no consent record is a defect: it silently and un-backfillably forecloses the legacy promise (QC risk *Legacy foreclosure*). Must be impossible by construction across **every** creation path, including high-volume bulk import (AC-1, AC-10).
- **Partial save / atomic-write failure** — a half-written record (circle present, consent absent) is the foreclosure defect; if any part of the atomic save fails the whole transaction must roll back and fail-visible with a retry affordance, never confirming success (AC-11).
- **Silence misread as consent** — an `unset` value must **never** be interpreted as `granted`; default posture is no access (AC-2).
- **Consent drift after circle change** — editing the circle without re-writing consent would leave consent describing a stale circle; consent must update atomically with the circle (AC-6).
- **Export omits consent** — an export missing consent flags is an incomplete, un-backfillable export and a foreclosure (AC-7); export must fail-visible and surface the affected items rather than silently drop consent metadata (AC-12).
- **Accidental release behavior** — any code that grants access based on the consent flag at MVP is out-of-scope inheritance logic and a guardrail violation (G9, AC-8); reject in review.
- **Ambiguous Arabic consent copy** — copy that implies content is shared now is a perceived-trust failure; must be reviewed in Arabic (G6, AC-9).

## Telemetry (content-blind)
- `legacy_consent_set` — when a consent decision is persisted with an event/circle (structural only: consent_value enum {granted|denied|unset}, circle enum, is_edit bool, source enum {create|edit|bulk_import|circle_change}). **No media, no note text.**
- `legacy_consent_changed` — when an existing item's consent value changes (with from_value enum, to_value enum).
- `legacy_consent_exported` — when consent flags are included in an export run (count of items with consent metadata; no content).

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] All gated quality scenarios pass (Sara-verified) — esp. **Legacy consent capture** and the consent-flag portion of **Export completeness**
- [ ] Global guardrails upheld: **G5** (export & per-item consent MVP-blocking + un-backfillable), **G9** (no inheritance/release/death-trigger built — capture only), **G4** (content-blind consent metadata), **G1** (consent never widens access beyond the chosen circle)
- [ ] Arabic/RTL reviewed (G6) — consent copy unambiguous that release is future and nothing is shared now, and reviewed for MENA inheritance-norm alignment (states this is the platform's technical consent to digital-content release, not legal/religious inheritance of the estate) — not only RTL rendering
- [ ] Accessibility AA on the capture/privacy flow (US-0.4)
- [ ] Telemetry events firing and verified content-blind
