# US-0.3 — Content-blind activation & retention instrumentation

- **Epic:** Foundation & Measurement (cross-cutting)
- **Priority:** 🟠 Supporting *(experiment-critical)*
- **MVP-blocking:** Yes — the bet cannot be read without it
- **Journeys:** J1, J2, J4
- **Source:** QC → *Product instrumentation / activation analytics (content-blind)* (🟠, experiment-critical); QC scenario *Activation instrumentation validity*; QC risk *False "no demand" verdict*; VQM → Core Value 2 → Product instrumentation; guardrail G4
- **Depends on:** US-0.1 (account/auth)
- **Status:** Ready for build

## Story
As the **product team running the pilot**, I want a **content-blind activation funnel and a weekly retention cohort** that distinguishes *didn't-activate* from *no-demand* from *didn't-retain*, so that **we can read the MVP bet correctly and not kill a viable product (or ship a doomed one) off a misread metric**.

## Context / Why this matters
The whole MVP exists to answer one question — *will people continuously create and revisit life events?* — measured by **Events Added Per User Per Month**. But a low number is **ambiguous**: it could mean users never activated, there's no demand, or they activated but didn't return. Without instrumentation those three are indistinguishable and the company learns the wrong lesson (QC risk *False "no demand" verdict*). This story is the **measurement substrate**: it defines the canonical funnel and cohort that every other story emits into. It must be **content-blind by construction** (G4) — capturing or transmitting a single byte of memory media or memory text would itself be a privacy breach (VQM Core Value 2) and would poison the trust the product is selling.

## Scope
**In scope (MVP):**
- An **activation funnel** with these ordered, distinguishable stages, per user:
  1. **signup** (account created + confirmed) — *sourced from US-0.1.*
  2. **first-event** (the user's first saved timeline event) — *sourced from US-1.1 (and US-1.3 import).*
  3. **populated-timeline** (the timeline reaches a "has real density" state — **distinct from a single first-event**: it requires more than one dated event across distinct moments **or** a completed bulk import; a user with exactly one manual event reaches *first-event* but **not** *populated-timeline*. The exact density threshold is a placeholder to be set and validated against week-4 retention) — *sourced from US-1.1 / US-1.3.*
  4. **first-revisit** (the user returns to and navigates the populated timeline — the "come back" half of the bet) — *sourced from US-1.1 guided revisit and US-2.1 browse.*
- A **weekly retention cohort** — group users by signup week and measure return/activity in subsequent weeks (so *didn't-retain* is separable from *didn't-activate*). The cohort also exposes a **day-grained early-lapse marker** (`days_since_last_activity` int, a derived content-blind structural counter) so a user who activated then went silent **inside a 7-day window** is identifiable, not only visible at the next weekly boundary — this is a structural counter for reading the lapse signal, **not** a re-engagement nudge (deferred per G9).
- The **canonical event taxonomy** (below) that all other stories emit — one shared vocabulary so the funnel composes correctly.
- **Content-blind by construction (G4):** events carry only funnel/retention markers and **structural metadata enums/bools/counts/timestamps** — never memory media, never memory text, never location coordinates, never filenames/captions.
- An analyst-readable separation of the three diagnoses: **didn't-activate** (signed up, no first-event), **no-demand** (activated but low/declining event rate, computed as **events per activated user per cohort-week** — the per-user-per-month metric decomposed — measured over a defined trailing window against a stated reference rate, so "low/declining" is computed from the canonical taxonomy and not left to interpretation), **didn't-retain** (activated, then no first/subsequent revisit).

**Out of scope (deferred / roadmap):**
- Any analytics that reads memory content (forbidden by G4 — not "deferred", **prohibited**).
- AI/ML on memory content, summaries, or search (G9 roadmap).
- Monetization/revenue funnels and paywall analytics (G8 — free at MVP).
- A full BI dashboard product; MVP needs the **event stream + cohort definition**, not a polished analytics UI.
- Cross-device user stitching beyond the user's own authenticated account (web-only; identity is the account from US-0.1).

## Canonical event taxonomy (MVP)
All stories emit into this shared vocabulary. Every event is keyed by an opaque account id (from US-0.1) and a server timestamp; payloads are **structural metadata only**. **Pre-account events** (`signup_started`, which can fire before `signup_completed` creates the account) are keyed by a transient client/session id that is deterministically reconciled to the opaque account id on `signup_completed`; the account id is **stable for the user's lifetime and never reused**, so stage idempotency (AC-6) and furthest-stage attribution (AC-1) hold across the reconciliation.

| Stage / purpose | Event | Owner story | Allowed structural fields (examples) |
|---|---|---|---|
| Signup | `signup_started`, `signup_completed`, `signin_completed` | US-0.1 | method enum, is_invited bool |
| Permissions | `capture_permission_result`, `capture_fallback_used` | US-0.2 | permission_type enum, result enum, fallback_type enum |
| First event / capture | `event_create_started`, `event_create_saved`, `event_create_failed` | US-1.1 | has_media bool, media_type enum, circle enum, is_first_event bool, failure_reason enum |
| Populated timeline (import) | `import_started`, `import_completed` | US-1.3 | item_count int, success_count int, dropped_count int |
| First revisit / browse | `first_revisit_completed`, `timeline_view_opened` | US-1.1, US-2.1 | granularity enum {year, month, day}, is_first_revisit bool |
| Retention cohort | `weekly_active` (derived) | US-0.3 | cohort_week, week_offset int, did_create bool, did_revisit bool, days_since_last_activity int |

> **Hard rule:** no event field may contain memory media, memory text, captions, filenames, free-text notes, or precise coordinates. Circle is an **enum** ({me_only, family, public_unlisted}), not a member list. Counts and booleans only (G4).

## Acceptance Criteria
1. **Given** the funnel definition, **when** a user moves signup → first-event → populated-timeline → first-revisit, **then** each stage is recorded **distinctly and in order**, and an analyst can see, per user, the furthest stage reached.
2. **Given** two users — one who signed up but never created an event, and one who created events but never revisited — **when** the funnel is read, **then** the first is classified **didn't-activate** and the second **didn't-retain** (the three diagnoses are separable).
2a. **Given** a user with exactly one manual saved event, **when** the funnel is read, **then** that user reaches **first-event** but **not** populated-timeline (a single event is *Setup*, not the populated-timeline density state — the two stages cannot be satisfied by the same single action).
2b. **Given** a user who reached **populated-timeline** but whose event-creation rate over the defined trailing window (events per activated user per cohort-week) is below the stated reference, **when** the cohort is read, **then** that user is classified **no-demand** and is distinguishable in the same read from **didn't-retain** (the third diagnosis is operationalized, not merely named).
2c. **Given** the density threshold and the no-demand reference rate / trailing window are not yet empirically tuned against week-4 retention, **when** the funnel ships, **then** it operates with **explicit documented provisional defaults** (stated in the story), and changing either value is a **configuration change that requires no schema migration and no re-emission** — the funnel is operable now and tunable later without re-engineering the pipeline.
3. **Given** any emitted event, **when** its payload is inspected, **then** it contains **only** structural metadata (enums, bools, ints, timestamps, opaque ids) and **no** memory media, memory text, captions, filenames, or precise coordinates (G4 — verified by Sara inspecting the wire payloads).
4. **Given** the weekly retention cohort, **when** queried, **then** users are grouped by signup week and their return/create/revisit activity is reported per subsequent week (week_offset), so retention decay is visible.
5. **Given** the canonical taxonomy, **when** another story (US-0.1, US-0.2, US-1.1, US-1.3, US-2.1) emits an event, **then** it uses the **exact event names and field schema** defined here — no ad-hoc events that the funnel can't compose.
6. **Given** the same logical action fires twice (e.g. a double-submit, a retried save), **when** events are recorded, **then** the funnel does **not** double-count a stage for that user (idempotent stage attainment — first-event counts once per user).
7. **Given** a stage event is emitted, **when** it is processed, **then** it is **durably recorded, or its loss is detected and surfaced** via a defined oracle (an emit-vs-ingest reconciliation count and/or a sequence-gap signal) and raised to monitoring — instrumentation must not silently lose funnel data, or the bet reads false. Loss is never inferred only from a missing record; it is detected by the reconciliation/gap signal so a sustained loss of stage events cannot silently corrupt the furthest-stage read. The oracle has **quantified, Sara-verifiable targets** (set-and-validated placeholders, same treatment as the density threshold): the reconciliation runs at a defined cadence (placeholder: hourly); a stage-event loss rate above a threshold **X%** sustained over a window **Y** raises a monitoring alert within **Z** minutes; and reconciliation completeness is reported as a metric an analyst can read — so "loss is detected and surfaced" has a measurable pass/fail bar, not just an assertion.
8. **Given** all instrumentation, **when** audited, **then** it captures no memory content even on **failure paths** (a failed/aborted save must not leak note text or media into telemetry).

## Quality Scenarios (gated)
- **Activation instrumentation validity** `J1 J2 J4` — The analytics layer distinguishes **signup, first-event, populated-timeline, and first-revisit**, a **weekly retention cohort** exists, the stage-loss oracle (AC-7) meets its quantified loss-rate/detection-latency targets (X/Y/Z above), and analytics **never captures memory media/content** (G4). *(This story owns this scenario.)*
- **Privacy enforcement** `J2` — Instrumentation creates no side-channel: no event payload exposes any "Me Only"/"Family"/unlisted media or its content via the analytics pipeline.

## Non-Functional Requirements (deltas only)
- Instrumentation is **non-blocking**: emitting an event must never delay or fail a user action (event creation, save, browse) — telemetry failure degrades to dropped-and-monitored, never user-visible error.
- Stage attainment is **idempotent per user** (first-event, populated-timeline, first-revisit each attained once).
- Event payloads are **schema-validated** against the canonical taxonomy at the boundary; non-conforming or content-bearing payloads are rejected before transmission (defense-in-depth for G4).
- Stage attainment (`populated_timeline` in particular) and `weekly_active` cohort markers are **derivable/recomputable from the raw taxonomy event stream**, not stored only as a frozen one-time flag — so a retune of the density threshold or no-demand reference rate re-derives historical attainment rather than freezing it under the old definition.

## Edge & Negative Cases
- **Content leak attempt** — a story tries to attach note text / a filename / coordinates to an event → rejected by schema validation, not transmitted (G4 enforced by construction).
- **Double-fire** — duplicate-submit or retried save emits a stage twice → funnel counts the stage once for that user (AC-6).
- **Out-of-order arrival** — events arrive late/reordered (network) → funnel still attributes the correct furthest stage per user by server timestamp.
- **Dropped event** — telemetry transport fails → loss is **detected by the emit-vs-ingest reconciliation / sequence-gap oracle** (AC-7) and surfaced in monitoring, never silently lost without a trace; user action still succeeds.
- **Pre-account signup_started never reconciled** — a user fires `signup_started` then abandons before `signup_completed` creates an account → counted as a top-of-funnel drop, **never attributed to another user** and never double-counted once a real account is created (AC-6 holds across reconciliation).
- **Activated-then-silent vs never-activated** — both can show low Events-Added → must be distinguishable in the funnel/cohort (the entire reason this story exists).
- **Import-only activation** — a user who reaches a populated timeline via bulk import (US-1.3) with no manual first event → still classified as activated/populated correctly.
- **Threshold retune** — when the populated-timeline density threshold (or the no-demand reference rate) is changed, `populated_timeline` attainment and `weekly_active` cohort markers are **re-derivable for already-recorded users** from the retained structural event stream, so a retune does not leave historical cohorts on a stale definition or fork historical vs. current cohort reads (keeps the week-over-week retention decay in AC-4 interpretable).
- **Lossy import** — `import_completed` reports `dropped_count > 0` → surfaced as a **durability/trust signal in monitoring, distinct from telemetry-transport loss (AC-7)**, so a pattern of dropped imports is read as a user-data-loss risk (G2) and is **not** silently averaged into activation counts as a clean populated-timeline attainment.

## Telemetry (content-blind)
*This story **is** the telemetry substrate — it defines and owns the taxonomy above. Its own meta-events:*
- `funnel_stage_attained` — when a user first reaches a funnel stage (with stage enum {signup, first_event, populated_timeline, first_revisit}). Idempotent per user.
- `weekly_active` (derived) — per-user, per-week activity marker for the cohort (with cohort_week, week_offset, did_create bool, did_revisit bool, days_since_last_activity int for the early-lapse signal).
- `telemetry_validation_rejected` (ops) — when a non-conforming/content-bearing payload is rejected at the boundary (G4 guardrail signal).
- Import `dropped_count` (from `import_completed`) is **monitored as a durability/trust guardrail signal**, not just consumed as a funnel input — a nonzero dropped_count is surfaced as a possible user-data-loss event (G2), distinct from the AC-7 telemetry-transport loss oracle.

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] All gated quality scenarios pass (Sara-verified)
- [ ] Global guardrails upheld: **G4 (content-blind by construction — primary)**; supports correct reading of the bet across G1/G7 scope
- [ ] Arabic/RTL reviewed (G6) — any analyst-facing labels reviewed (instrumentation is largely non-user-facing)
- [ ] Accessibility AA — N/A for the event pipeline; any analyst UI inherits US-0.4
- [ ] Telemetry events firing and verified content-blind — **wire payloads inspected to confirm zero memory content, including on failure paths**
- [ ] Canonical taxonomy published and adopted by US-0.1, US-0.2, US-1.1, US-1.3, US-2.1
- [ ] Provisional populated-timeline density threshold and no-demand reference rate + trailing window are **set to initial documented values** (with owner and review date) AND a **back-test plan against week-4 retention is recorded** (Sara-verifiable) — neither ships as an undefined placeholder
- [ ] Stage-loss oracle targets (AC-7 X/Y/Z: loss-rate threshold, window, detection latency) are set to initial documented values
