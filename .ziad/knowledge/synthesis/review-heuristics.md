---
id: k-synthesis-review-heuristics
date: 2026-06-14
type: synthesis
scope: Reusable /ziad-review heuristics for Human Timeline Network, distilled from the privacy-circles, continuous-capture-habit, and media-durability domain references
source: Ziad synthesis of references/domain/{privacy-circles-consent, continuous-capture-habit, media-durability}.md
confidence: high
validation: validated
status: active
supersedes: []
related: [k-ref-privacy-circles-consent, k-ref-continuous-capture-habit, k-ref-media-durability, k-ref-future-capsules-inheritance, k-ref-memory-specialist-workflow, k-project-product-profile]
review_after: 2026-08-14
---

# Review Heuristics — Human Timeline Network

Applied to every `/ziad-review`. Each heuristic names: the trigger (when it fires),
the test (what to check), and the default verdict consequence when it fails. These
are earned from domain research, not first-pass opinion. Cite the source reference
in the verdict when a heuristic fires.

---

## A. Trust & Privacy (from privacy-circles-consent.md)

**H-A1 — The leak is the URL, not the circle UI.**
- *Fires when:* any feature shows, shares, resurfaces, or links media.
- *Test:* Are media URLs signed + expiring (not public/guessable)? Does the CDN drop
  cached private objects on revoke? Is permission checked at access time?
- *Fail → NEEDS REDESIGN.* A circle UI over public/guessable media is theater.

**H-A2 — Promise only enforceable revocation.**
- *Fires when:* a feature claims to remove, hide, downgrade, or "take back" access.
- *Test:* Does the product claim more than it can deliver? Revoking future access +
  invalidating live URLs is enforceable; recalling already-downloaded copies is NOT.
- *Fail (over-promises full recall) → NEEDS REDESIGN.* Honesty beats false completeness.

**H-A3 — Public + minors needs a friction gate.**
- *Fires when:* a flow lets identifiable child media reach the Public circle.
- *Test:* Is there friction/guardrail before public exposure of a minor, not toggle parity?
- *Fail → NEEDS REDESIGN* (child-safety/CSAM + GDPR exposure).

**H-A4 — Guardian consent + erasure is table stakes, not roadmap.**
- *Fires when:* a feature processes child/family data or asks for consent.
- *Test:* Is consent informed, granular, provable, revocable? Is frictionless erasure available?
- *Fail → NEEDS REDESIGN or INSUFFICIENT EVIDENCE* if the surface is undefined.

## B. Habit & Engagement (from continuous-capture-habit.md)

**H-B1 — Frictionless capture IS the metric.**
- *Fires when:* reviewing any capture / log / add-event flow.
- *Test:* Is logging an event ≤ ~2 taps / 10 seconds from trigger? Memory product habit
  forms only at this friction level.
- *Fail (heavier flow) → NEEDS REDESIGN* — suppresses Events-Added for UX, not demand.

**H-B2 — External trigger required; memory is not a trigger.**
- *Fires when:* a feature's value depends on the user returning/remembering.
- *Test:* Is there an external trigger (notification, time/location cue), or does it rely
  on the user choosing to open the app?
- *Fail (no external trigger) → APPROVED (PROVISIONAL)* with a Confirm-Before-Ship on the trigger.

**H-B3 — Reward must be variable + emotional, not a guilt streak.**
- *Fires when:* a feature proposes streaks/loss-aversion mechanics on memory content.
- *Test:* Does the reward exploit guilt (broken streak on a child's memory log = wrong note)?
  Prefer resurfacing/playback (variable, emotional).
- *Fail → NEEDS REDESIGN* (emotional mismatch for a legacy product).

**H-B4 — Resurfacing (Life Playback) is the retention engine — treat it as core.**
- *Fires when:* scoping Playback/"On This Day"/revisit features, or when they're deferred.
- *Test:* Is resurfacing in MVP scope? Does it have BOTH exclusion rule sets — emotional
  (deceased/ex/low-quality) AND privacy (never cross a circle boundary)?
- *Fail (deferred) → DEPRIORITIZE challenge* (likely retention miss). *Fail (no exclusion
  rules) → NEEDS REDESIGN* (trust incident risk; cross-ref H-A1).

## C. Durability (from media-durability.md)

**H-C1 — "Saved" must mean durably persisted + integrity-verified.**
- *Fires when:* any flow shows a success/"saved" state for captured media.
- *Test:* Does success fire only after a server-acknowledged, checksum-verified durable
  write — not on "queued"/"uploading"?
- *Fail → NEEDS REDESIGN* — counts the event but loses the memory (hits the metric AND trust).

**H-C2 — Confirm-before-delete the local original.**
- *Fires when:* a flow frees/clears the device-local copy after upload.
- *Test:* Is the local original retained until a verified durable write is confirmed?
- *Fail → NEEDS REDESIGN* — the single highest-impact data-loss guard HTN controls.

**H-C3 — Storage SLA ≠ memory safety.**
- *Fires when:* a durability claim rests on "we use [cloud], it's 11 nines."
- *Test:* Is there a second independent copy + export path? (2/3 of real loss is human
  error/app bug/account loss, which the SLA excludes.)
- *Fail → INSUFFICIENT EVIDENCE* until the human-error class is addressed.

**H-C4 — Open formats + export are part of the durability promise.**
- *Fires when:* reviewing storage format or any "preserve for decades" claim.
- *Test:* Open/standard formats? Full export (media + metadata)? Format-migration plan?
- *Fail → DEPRIORITIZE/NEEDS REDESIGN* depending on how central the decades promise is.

## D. Capsules & Inheritance (from future-capsules-inheritance.md)

**H-D1 — Scheduled capsules are table stakes; don't over-invest.**
- *Fires when:* a feature/roadmap item proposes heavy investment in scheduled-delivery capsules.
- *Test:* Is differentiation budget going here instead of trust/habit/durability?
- *Fail → DEPRIORITIZE* — match commodity capsule features cheaply; spend the budget on the wedge.

**H-D2 — The death trigger is the real design decision; pick deliberately.**
- *Fires when:* any posthumous / "after I'm gone" release feature is reviewed.
- *Test:* Is the trigger model explicit (inactivity-timer vs verified-death vs hybrid) with its
  failure mode stated? Hybrid (Apple key+certificate × Google inactivity) is the defensible default.
- *Fail (undefined trigger) → INSUFFICIENT EVIDENCE; (loose/leaky trigger) → NEEDS REDESIGN.*

**H-D3 — HTN needs account-INHERITED, not messages-out-then-close.**
- *Fires when:* an inheritance/handoff or account-after-death feature is reviewed.
- *Test:* Does the design let family continue the timeline (compounds across generations), rather
  than closing the account on death?
- *Fail (account-closed model) → NEEDS REDESIGN* — contradicts the core generational promise.

**H-D4 — Capsule delivery is reliability-critical.**
- *Fires when:* reviewing capsule scheduling/unlock.
- *Test:* Durable scheduling + monitoring + failsafe? Unlocks within the window on the date and
  NEVER early (verify via clock change, QC J6)?
- *Fail → NEEDS REDESIGN* — a silent missed/early unlock is unrecoverable for a legacy product.

**H-D5 — Inheritance must preserve the privacy-circle model.**
- *Fires when:* a handoff grants an inheriting party access to the timeline.
- *Test:* Does handoff silently widen who can see Me-Only/Family content? (cross-ref H-A1/H-A2)
- *Fail → NEEDS REDESIGN* — inheritance is not a license to breach circles.

## E. Persona Workflow / Workaround (from memory-specialist-workflow.md)

**H-E1 — Name the manual baseline, not a rival app.**
- *Fires when:* assessing whether a feature is worth building.
- *Test:* Does HTN meaningfully beat the careful-family manual workflow (DAM +
  legacy-planning)? (Core Principle 8 — name the workaround explicitly.)
- *Fail (no real improvement over manual) → DEPRIORITIZE.*

**H-E2 — Lower metadata effort; never add it.**
- *Fires when:* a capture/tagging/organize feature is reviewed.
- *Test:* Does it reduce or automate date/people/place/story tagging (the step families
  abandon), or add burden?
- *Fail (adds tagging burden) → NEEDS REDESIGN* — works against the persona's pain point.

**H-E3 — Legacy needs per-item decisions + a review cadence.**
- *Fires when:* reviewing inheritance / privacy-default / capsule settings.
- *Test:* Granular per-item handoff/visibility decisions (not one blanket setting)? A
  review-cadence nudge (manual process revisits every 3–5 yrs)?
- *Fail (blanket-only / no review nudge) → NEEDS REDESIGN or DEPRIORITIZE.*

**H-E4 — Design capture triggers around life events, not only app cues.**
- *Fires when:* reviewing capture triggers / activation / reminders.
- *Test:* Does activation hook into relational/life-event moments (birth, death, invite),
  which are the strongest real preserve triggers — or only generic app notifications?
- *Fail (app-cue only) → APPROVED (PROVISIONAL)* with a Confirm-Before-Ship on the trigger model.

---

## Cross-cutting ruling — when habit and trust conflict
HTN's metric pressure (maximize Events-Added) will push toward frictionless sharing and
aggressive resurfacing. Trust (privacy circles, child safety) pushes the other way.
**Ruling: trust wins at the boundary.** A faster capture/share flow that risks wrong-circle
exposure or surfaces a memory across a circle is NEEDS REDESIGN, not a metric trade-off —
because a single trust breach on intimate family media is unrecoverable churn, which
destroys the metric more than friction ever could. (Reconciles H-B1/H-B4 against H-A1/H-A3.)

## How to use
At the start of any /ziad-review, scan this file for fired heuristics, cite the ones that
apply by ID, and map fails to verdicts per each heuristic's stated consequence. If a new
durable pattern emerges across 3+ reviews, add it here.
