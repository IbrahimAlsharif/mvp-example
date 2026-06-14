---
id: k-ref-continuous-capture-habit
date: 2026-06-14
type: reference
scope: What drives a continuous life-event capture & revisit habit (vs one-time memoir capture); failure modes and engagement engines for memory/journaling apps, calibrated to Human Timeline Network's primary metric
source: WebSearch + analysis (habit-tracker/journaling retention guides, app-retention benchmarks, Hook-model/habit-loop sources, Facebook On This Day / Timehop / Google Photos resurfacing coverage), 2026-06-14
confidence: high
status: active
review_after: 2026-07-14
refresh_interval: 30
related: [k-project-product-profile, k-ref-competitor-index, k-ref-privacy-circles-consent]
---

# Continuous Capture & Revisit Habit — Domain Reference

Calibrated for **Human Timeline Network**. The MVP's critical assumption is that
people will *continuously create and revisit* life events; the primary metric is
**Events Added Per User Per Month**. This file is about whether that habit can form
at all — the single biggest determinant of MVP success.

## 1. The core failure mode HTN must beat — authority: analysis
**Memory/life-logging apps fail by becoming one-time tools, then going dormant
(not uninstalled).**
- Avg mobile app loses ~3 of 4 users within a month of install; dormancy (silent
  stop) is the real killer, not uninstalls.
- The specific trap for memory products: most never enter a **daily workflow**, so
  they're forgettable and replaceable.
- **Predictable rewards decay.** "View your past memories" is the *same* reward every
  time → psychological impact fades. Variable/surprising rewards sustain engagement.
- This is exactly the gap in HTN's rivals (StoryWorth, GoodTrust, capsule apps are
  one-time/occasional capture) — the white space, but also the trap if HTN copies them.

## 2. The habit loop HTN must engineer — authority: analysis (behavioral psych)
Durable habits = **Trigger → Action → Reward → Investment**:
- **Trigger:** external (notification, app icon, location/time cue) until the internal
  cue forms. Apps that rely on the user *remembering* to log will fail — memory is an
  unreliable trigger.
- **Action:** must be *radically* low-friction. Field evidence: a 2-tap, <10-second log
  beats a beautiful app that takes 3 taps to reach capture. Directly validates HTN's
  **Time-to-first-event** scenario — friction here suppresses the metric for UX reasons,
  not demand.
- **Reward:** immediate + visible. Streaks/rings/XP are neurologically real, not
  gimmicks — but they exploit loss aversion and can feel wrong for a *legacy* product
  (a broken streak on a child's memory log is a bad emotional note). HTN should prefer
  **emotional/variable rewards** (resurfaced memory, a beautiful playback moment) over
  guilt-based streaks.
- **Investment:** each added event (photo, voice, tag) increases switching cost and
  enriches future resurfacing — HTN's timeline compounds this naturally.

## 3. The proven engagement engine for memory products: resurfacing — authority: analysis
**"On This Day" / "Rediscover" is the demonstrated re-engagement engine for memory
products** — it provides the variable, emotional reward that raw "browse your past"
lacks, and it manufactures a recurring *revisit* trigger.
- Facebook built "On This Day" specifically to answer **Timehop** (12M users, ~half
  daily — extraordinary retention on resurfacing alone). Google Photos shipped
  "Rediscover This Day."
- **This is HTN's J5 (Life Playback) reframed as a retention engine, not just a delight
  moment.** Resurfacing serves the *revisit* half of the critical assumption directly.
- **Hard-won safety lesson (must copy):** resurfacing algorithms need **exclusion
  rules** — Facebook blocks deceased people and ex-partners from memories; Google
  excludes screenshots and low-quality images and favors true "events." For HTN, the
  exclusion logic is also a **privacy-circle** obligation: resurfacing must NEVER
  surface an out-of-circle memory to the wrong viewer (ties to privacy-circles-consent.md).
- **The Timehop ceiling:** great retention did NOT equal growth — Timehop stalled on
  *new-user acquisition*. Lesson: resurfacing retains, but does not by itself acquire;
  HTN can't treat it as the whole growth story.

## 4. The re-engagement window — authority: analysis
- The window to recover a lapsing user closes in **3–7 days**. Early-dormancy triggers
  produce 2–3× higher return than waiting a week.
- Implication: HTN needs instrumented lapse detection + a timely, *emotional* re-engage
  nudge (a resurfaced memory beats a generic "we miss you") well inside 7 days.

## Domain lessons (apply to future reviews)
1. **Frictionless capture is the metric.** Any capture flow over ~2 taps / 10 seconds
   to log an event is a NEEDS-REDESIGN risk against the primary metric. (Core Principle 4 —
   the persona's bar; Principle 5 — workflow trigger over feature completeness.)
2. **Reward must be variable and emotional, not a guilt streak.** For a *legacy* product,
   streak/loss-aversion mechanics can backfire emotionally; resurfacing is the better engine.
3. **Treat Life Playback / resurfacing as the retention engine, not a nice-to-have** — it
   is the proven mechanism for the "revisit" half of the bet, with a 12M-user precedent.
4. **Resurfacing needs exclusion rules from day one** — both emotional (deceased, ex,
   low-quality) and privacy (never cross a circle boundary). Shipping resurfacing without
   them is a trust incident waiting to happen.
5. **Retention ≠ growth (Timehop).** Don't let strong revisit metrics mask weak acquisition
   when reading the MVP experiment.

## Remaining unknowns
- HTN's actual capture tap-count / time-to-first-event (canvas names the scenario, no value).
- Whether the MVP scopes any resurfacing / "On This Day" surface, or treats Playback as
  manual-only (a likely retention miss).
- HTN's reminder/trigger model — is there an external trigger, or does it rely on the user
  remembering to open the app?
- Whether lapse detection + early (<7 day) re-engagement is instrumented for the MVP.
