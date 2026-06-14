# Content-blind Activation & Retention Instrumentation (US-0.3)

The MVP bet — *will people continuously create and revisit life events?* — is
read from **Events Added Per User Per Month**. A low number is ambiguous, so this
substrate separates three diagnoses that otherwise look identical:

- **didn't-activate** — signed up, never created a first event.
- **no-demand** — activated, but event rate below the reference over the window.
- **didn't-retain** — activated, then never revisited.

## Canonical taxonomy

All stories emit into one shared vocabulary (`src/lib/telemetry.ts` enforces it).
Payloads are **structural metadata only** — enums, bools, ints, timestamps,
opaque ids. **Never** memory media, memory text, captions, filenames, or precise
coordinates (G4, enforced at the boundary; a content-bearing payload is rejected
before transmission).

| Stage / purpose | Event | Fields |
|---|---|---|
| Signup | `signup_started`, `signup_completed`, `signin_completed` | method, is_invited |
| Permissions | `capture_permission_result`, `capture_fallback_used` | permission_type, result, fallback_type |
| First event | `event_create_started/saved/failed` | has_media, media_type, circle, is_first_event, failure_reason |
| Import | `import_started`, `import_completed` | item_count, success_count, dropped_count |
| Revisit | `timeline_view_opened`, `funnel_stage_attained` | granularity, stage |
| Retention | `weekly_active` (derived) | cohort_week, week_offset, did_create, did_revisit, days_since_last_activity |
| Ops | `funnel_stage_attained`, `telemetry_validation_rejected` | stage, context |

## Funnel (derived, not frozen)

`src/lib/analytics/funnel.ts` derives stage attainment from the raw event stream
so a threshold retune **re-derives history** (no migration, no re-emission):

- **signup** → account confirmed.
- **first-event** → ≥1 saved event (or a completed import).
- **populated-timeline** → events across ≥ N distinct days **or** a completed
  import. A single manual event reaches first-event but **not** populated.
- **first-revisit** → the user browses a populated timeline.

Stage attainment is **idempotent per user** (`emitStageAttainment` only emits
newly-crossed stages, given the set already recorded) so a double-submit/retry
never double-counts (AC-6). The `event_create_saved.is_first_event` flag is
computed by counting (server-side), not flagging, for the same reason.

## Weekly retention cohort

`weeklyActive()` groups users by signup week (`cohort_week`) and reports
`week_offset`, `did_create`, `did_revisit`, and a day-grained
`days_since_last_activity` early-lapse marker — so an activated-then-silent user
is visible inside a 7-day window, not only at the weekly boundary. This is a
structural read signal, **not** a re-engagement nudge (deferred, G9).

## Provisional defaults (set-and-validate)

Owner: product. Review date: **2026-07-15** (back-test against week-4 retention).
These are plain config in `FUNNEL_DEFAULTS` — changing them requires **no schema
migration and no re-emission**:

| Knob | Default | Meaning |
|---|---|---|
| `populatedTimelineMinDistinctDays` | 2 | distinct event-days for populated-timeline |
| `noDemandReferenceEventsPerWeek` | 1 | events/activated-user/week below which = no-demand |
| `noDemandTrailingWeeks` | 4 | trailing window for the no-demand rate |

**Back-test plan:** after ≥4 cohort-weeks of pilot data, correlate each knob
against observed week-4 retention; tune so that *populated-timeline* attainment
predicts retention and the *no-demand* line separates retained-low-rate users
from churned users. Re-derive historical cohorts under the new values (the
stream is retained; attainment is recomputable).

## Stage-loss oracle (AC-7) — provisional targets

Instrumentation must not silently lose funnel data. The reconciliation oracle
(emit-vs-ingest count + sequence-gap signal) runs at a defined cadence and
raises monitoring alerts against quantified targets:

| Target | Provisional value |
|---|---|
| Reconciliation cadence | hourly |
| Loss-rate alert threshold (X) | > 1% of stage events |
| Sustained window (Y) | 2 consecutive reconciliation runs |
| Detection latency (Z) | alert within 15 min of breach |

Loss is detected by the reconciliation/gap signal — never inferred only from a
missing record. A nonzero `import_completed.dropped_count` is surfaced as a
**durability/trust** signal (G2), distinct from telemetry-transport loss.

## Non-blocking guarantee

`safeEmit()` is used from user-action paths: a content-blind violation degrades
to the `telemetry_validation_rejected` ops signal (carrying only the offending
event name) and never throws into the user action. `emit()` still throws in
dev/test as defense-in-depth so content leaks are caught early.
