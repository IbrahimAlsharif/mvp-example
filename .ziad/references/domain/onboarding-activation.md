---
id: k-ref-onboarding-activation
date: 2026-06-14
type: reference
scope: First-run onboarding and activation for a life-timeline memory product — the setup/aha/habit framework, time-to-value, the empty-timeline cold-start problem and its camera-roll-import solve, and how to design a first-week activation metric distinct from the monthly north-star — calibrated to Human Timeline Network's "will people continuously create events?" MVP bet and Events-Added metric
source: WebSearch + WebFetch (Amplitude activation/aha/time-to-value guides, Reforge/Elena Verna setup-aha-habit, aakashg "How to Measure Onboarding", empty-state UX (Smashing/NN-G/UserOnboard), Tinybeans onboarding case study), 2026-06-14
confidence: high
status: active
review_after: 2026-07-14
refresh_interval: 30
related: [k-ref-continuous-capture-habit, k-project-product-profile, k-ref-child-safety-csam, k-ref-privacy-circles-consent, k-ref-media-durability]
---

# Onboarding & First-Memory Activation — Domain Reference

Calibrated for **Human Timeline Network**. The MVP is testing one assumption — *will people
continuously create and revisit life events?* — measured by **Events Added / user / month**. That
metric is a **retention/north-star** measure; it is downstream of an **activation** problem this
file isolates. The existing [continuous-capture-habit](continuous-capture-habit.md) ref covers the
*ongoing* loop (frictionless capture, resurfacing, triggers). This file covers the part it doesn't:
**getting a brand-new family from signup to first real value on a timeline that starts empty** — and
why getting that wrong would make the MVP misread its own core result.

## 1. The activation framework: Setup → Aha → Habit — authority: analysis (Reforge/Amplitude)
- **Setup** — user configures enough to be ready (account, add a person, first upload).
- **Aha** — the **magic moment** where real value is first felt.
- **Habit** — the aha turns into recurring behavior (this is where the monthly metric lives).
- **The classic mistake (named explicitly):** teams **stop activation work at Setup** and call a
  completed signup "activated." Reforge's guidance: measure activation at **first habit-loop
  creation**, not setup completion. **Time-to-value** (signup → first meaningful outcome) should be
  minimized and segmented by acquisition source.

## 2. The decisive insight for HTN: a single event is NOT the aha moment — authority: synthesis
For most apps the aha is one action. For a **timeline-of-a-whole-life** product it is **not**: one
photo on an empty timeline is **Setup, not Aha**. HTN's magic — *"Netflix for human lives"* — is an
emergent property of **density**: a **populated, navigable, resurface-able** timeline. But a new user
has **zero density**, so they hit the aha-blocking trap: *the product's value requires a full timeline,
and a new user's timeline is empty.* Defining the aha as "added first event" stops one step short of
the value and will systematically under-activate.

## 3. The cold-start / empty-timeline problem — authority: analysis (UX canon)
- **An empty first screen is a dead end.** "If the user hits an empty state expecting information…
  it's a dead end." The first empty screen **is** onboarding — fill it with guidance, a sample, or
  prompts, never a blank canvas.
- For memory/journal apps specifically: **pre-populate with prompts, a sample entry, or a
  camera-roll-import suggestion** rather than an empty text field.

## 4. The proven solve: seed the timeline from the camera roll — authority: analysis (Tinybeans)
A new user's **phone already holds years of dated, geotagged life events.** The field solves cold
start by **importing existing photos with their original dates** to manufacture an instantly
populated timeline.
- **Tinybeans**: onboarding = *add a child → add a memory (photo) → add followers*, and crucially
  lets users **adjust the date to backfill older memories** — building the timeline "from the
  beginning," not just from today. Tinybeans reported an **885% improvement in onboarding completion**
  after redesign (incl. **separate flows for family vs. follower** sign-ups to cut accidental signups
  and ask audience-specific questions).
- **Why it's the highest-leverage HTN move:** dated camera-roll import converts HTN's biggest
  liability (an empty timeline) into its **fastest path to aha** — the user sees *their own life,
  already there and navigable* in the first session, instead of after months of manual logging. It
  directly seeds the density that makes resurfacing/playback (the retention engine) work on day one.

## 5. The cross-reference catch — the activation move collides with the trust posture — authority: synthesis
Mass camera-roll import is the right activation play **only if co-designed with the trust posture**,
because it ingests exactly the most sensitive content at the highest volume:
- **Child-safety (see [child-safety-csam](child-safety-csam.md)):** bulk-importing a family's whole
  camera roll imports precisely the intimate child media that triggers the **false-positive
  CSAM/auto-ban catastrophe.** The import path must inherit the **no-automated-deletion, human-review,
  appeal** posture — a botched import-scan could ban a brand-new user on their first session.
- **Privacy circles (see [privacy-circles-consent](privacy-circles-consent.md)):** imported media must
  land in **Me-Only by default**, never Family/Public. A bulk import into a non-private default is a
  mass-exposure event. Default-to-private also satisfies the AADC **high-privacy-default** duty.
- **Durability (see [media-durability](media-durability.md)):** a large first-session import is the
  worst-case for **silent upload drops** — the confirm-before-delete / integrity-verified-write rules
  matter most exactly here, on the user's first impression.

## 6. Design the activation metric (don't reuse the north-star) — authority: analysis
- An activation metric must **correlate with retention**, or it misleads (thredUP found "add to cart"
  did *not* predict repeat purchase; preference-personalization did). Pattern from the canon:
  **"X core actions in Y days"** — Facebook *7 friends in 10 days*, Slack *2,000 team messages*.
- **For HTN:** the monthly *Events-Added* metric is the **north-star/retention** measure; it is the
  wrong tool to judge *activation*. HTN needs a **first-week leading indicator** that predicts the
  monthly metric — e.g., *reaches a populated timeline (N dated events across M distinct moments) AND
  one resurfacing/playback view in the first session/week.* Validate the threshold by checking it
  actually predicts week-4 retention; segment by acquisition source.

## Domain lessons (apply to future reviews)
1. **For a timeline product, aha = a populated, navigable timeline — not one logged event.** An
   onboarding flow that ends at "first event added" stops at **Setup**; expect under-activation.
2. **Seed the cold start with dated camera-roll import** — the single highest-leverage activation
   move, converting the empty-timeline liability into instant value.
3. **The import play and the trust posture must be co-designed:** Me-Only-by-default circle +
   no-auto-ban child-safety review + confirm-before-delete durability — or the fastest path to value
   becomes the fastest path to a trust catastrophe on day one.
4. **Use a first-week activation metric that correlates with retention, distinct from monthly
   Events-Added.** Reading the MVP on the monthly metric alone risks a **false "no demand" verdict**
   when the real failure is **no activation** (empty-timeline cold start) — corrupting the experiment's
   core learning.

## Suggested review heuristics (promote to synthesis/review-heuristics.md if they fire 3+ times)
- **H-G1 — Aha is a populated timeline, not one event.** Fires on any onboarding/first-run/activation
  feature. Test: does first-run get the user to a *navigable, populated* timeline, or stop at one
  upload? Stops at one upload → DEPRIORITIZE/NEEDS REDESIGN (activation miss).
- **H-G2 — Cold start seeds via dated import, co-designed with trust defaults.** Fires when scoping
  onboarding for an empty timeline. Test: camera-roll import with original dates, landing Me-Only,
  under the no-auto-ban + confirm-before-delete posture? Missing import → activation miss; import
  without private-default/safe-scan → NEEDS REDESIGN (cross-ref H-A1/H-A3/H-E1/H-C2).
- **H-G3 — Measure activation with a retention-correlated first-week metric, not the north-star.**
  Fires whenever the MVP result is being read. Test: is there a leading-indicator activation metric
  validated against retention, separate from monthly Events-Added? Absent → INSUFFICIENT EVIDENCE on
  any "no demand" conclusion.

## Remaining unknowns
- Whether HTN's MVP onboarding includes **dated camera-roll import / backfill**, or starts every user
  on an empty timeline (the likely activation killer).
- HTN's default circle for newly added/imported media (must be Me-Only) and whether import is scanned
  with a human-in-the-loop (not auto-ban) posture.
- Whether HTN has defined any **first-week activation metric** distinct from monthly Events-Added, and
  validated it predicts retention.
- HTN's time-to-first-event value (named in the QC scenario, no number) and time-to-populated-timeline.
