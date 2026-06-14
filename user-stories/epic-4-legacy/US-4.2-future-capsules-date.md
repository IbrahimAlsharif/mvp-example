# US-4.2 — Future Capsules (date-triggered only)

- **Epic:** Legacy (Core Value 4)
- **Priority:** 🟠 Supporting
- **MVP-blocking:** No
- **Journeys:** J6 (create a Future Capsule — date-triggered only)
- **Source:** QC → *Future Capsules — date-triggered only (MVP)* (🟠 supporting); QC scenario → *Future Capsule timing (date)* `J6`; QC risk → *Future Capsule (date) fails to unlock*; UJM → J6 (steps 1–5 + Critical Failure Points); VQM → Core Value 4 → Future Capsules (Trust risk: *date capsule fails to unlock on its date or unlocks early*; recipient/circle misconfiguration)
- **Depends on:** US-1.1 (event/content creation), US-1.4 (open-format export — pending-capsule content must be exportable, G5), US-3.1 (privacy circles), US-3.5 (family invitation / shared space — recipient must be a living, already-invited member)
- **Status:** Ready for build

## Story
As a **Knowledge & Legacy Builder / Parent / Elderly Individual**, I want to **seal a message, video, letter, goal, or plan that unlocks on a future date for a living, already-invited recipient or circle**, so that **I can deliver a moment to the future reliably** — knowing it opens exactly on its date and never a moment before.

## Context / Why this matters
Future Capsules are the emotional core of the legacy promise and the product's signature differentiator, but their entire value rests on **timing trust**: a date capsule that fails to unlock on its date — or unlocks early — breaks faith in the differentiator (QC risk; VQM Trust risk). At MVP the capsule is a pure **clock-based** unlock to a **living, already-invited** recipient/circle. The hard part is not composing the capsule; it is guaranteeing the unlock fires within the allowed window *on* the date and **never before**, across timezones. Crucially, this story must **not** build any posthumous/after-death or inheritance semantics — those require the death-trigger, which is roadmap (J8, G9).

## Scope
**In scope (MVP):**
- Create a capsule via the Add menu → "Future Capsule" (J6 entry).
- Choose a **capsule type:** message / video / letter / goal / plan.
- Add content (text and/or media via US-1.1 capture/upload paths).
- Set an **unlock date** (date-triggered only).
- Set a **recipient or circle** that is a **living, already-invited** family member/circle (US-3.5) — the recipient must already exist in the user's invited family/circle; no new invite is created here.
- **Confirm & seal** the capsule; once sealed it is **stored, locked, and listed as pending** (not editable while sealed).
- The owner may **cancel** a sealed, not-yet-unlocked capsule via an explicit confirmation (an explicit user action per G2; cancel ≠ silent edit).
- On its unlock date, the capsule unlocks **within the allowed window** and is delivered/made visible to the configured living recipient/circle.
- Timezone-correct unlock: the unlock date resolves to a single, well-defined instant in the **owner's timezone captured at seal time** (stored explicitly with offset); the capsule never unlocks before that instant.
- A sealed pending capsule's content + metadata (type, unlock date, recipient kind, media) is included in the **US-1.4 open-format export** so the future moment survives outside the platform (G5 — un-backfillable).
- Arabic-first, RTL capsule creation + pending-list copy (G6) — including unambiguous unlock-date and timezone display in Arabic.

**Out of scope (deferred / roadmap):**
- **Posthumous / after-death delivery, account inheritance, designate-heir, and the death-trigger (J8) — DO NOT BUILD (G9).** MVP capsules are **date-only** with **no handoff semantics** — no "deliver when I die," no heir, no estate transfer.
- Delivering to a recipient who is **not** already a living, invited member (no new-invite flow inside the capsule — that is US-3.5's job).
- Recurring/conditional triggers, event-based triggers, or any non-date unlock condition.
- Editing a capsule **after** it is sealed (sealed = locked).

## Acceptance Criteria
1. **Given** the Add menu, **when** the user opens "Future Capsule", **then** they can select a capsule **type** from {message, video, letter, goal, plan} (J6 step 1).
2. **Given** a chosen type, **when** the user adds content, **then** text and/or media are accepted and persisted via the standard durable upload path (no optimistic confirm before persistence — durability baseline).
3. **Given** the capsule form, **when** the user sets an **unlock date**, **then** only a **future** date is accepted; a past or invalid date is rejected with a clear message.
4. **Given** the recipient step, **when** the user picks a recipient/circle, **then** the only selectable options are **living, already-invited** members/circles (US-3.5); there is **no** path to create a new invite or to choose a death/posthumous condition here (G9).
5. **Given** a completed capsule, **when** the user taps **Confirm & seal**, **then** the capsule is stored, **locked**, and appears in a **pending** list; after sealing it can no longer be edited (sealed = immutable content + immutable unlock date + immutable recipient).
6. **(Timing — gated)** **Given** a sealed capsule with unlock date D, **when** the clock is before D, **then** the capsule remains locked and its content is **unreachable** by the recipient via UI *or* direct/API URL; **when** the clock reaches D (verified via clock change), **then** the capsule unlocks **within the allowed window** (no earlier than D, no later than D + 60 min — see NFRs) and **never a moment before D**.
7. **Given** a sealed capsule, **when** the unlock instant is evaluated, **then** the unlock date resolves **timezone-correctly** to one well-defined instant in the **owner's timezone captured at seal time** (the single authoritative timezone, stored with offset) — the capsule does not unlock early due to a timezone/UTC-offset/DST miscalculation, and a later change to the owner's or recipient's timezone does not move the instant earlier than the sealed resolved D.
8. **Given** a pending capsule, **when** the owner views their list, **then** each pending capsule clearly shows its type, unlock date, and configured recipient/circle (so misconfiguration is visible before unlock).
9. **Given** the deferred scope (G9), **when** the system runs at MVP, **then** **no** capsule offers or executes posthumous/after-death delivery or account handoff — every capsule is date-triggered only with no death-trigger code path present.
10. **Given** a sealed capsule whose configured recipient/circle membership has changed between seal and unlock, **when** the capsule unlocks, **then** access is granted only to recipients who are still living, invited members of the **current** circle at unlock time — a removed recipient gains no access and unlock **never widens** access beyond the current circle; if **no** valid recipient remains, the capsule does **not** deliver to anyone, holds in a clearly-labelled **undeliverable** state, and notifies the **owner** (content-blind: capsule type + intended recipient kind, no content) so they can act — never a silent misdelivery and never a silent drop (G1).
11. **Given** a sealed, not-yet-unlocked capsule, **when** the owner chooses to **cancel** it, **then** after an explicit confirmation the capsule is withdrawn and will not unlock or deliver — an explicit user action (G2); immutability in AC-5 means content/date/recipient cannot be silently edited, it does **not** remove the owner's right to cancel.
12. **Given** a sealed pending capsule, **when** the owner exports their data (US-1.4), **then** the capsule's content and unlock-date metadata are present in the export in **open format** (G5 — un-backfillable; the future moment survives outside the platform).

## Quality Scenarios (gated)
- **Future Capsule timing (date)** `J6` — A scheduled (date-triggered) capsule unlocks within the allowed window on its date and **never a moment before** (verify via clock change). *(This story owns this scenario.)*
- **Privacy enforcement** `J2 J3` — Before unlock, the sealed capsule's content is unreachable by the recipient (or any account) via UI *or* direct/API URL — verify the locked state with the recipient's account (the pre-unlock negative case).
- **Media-URL security** `J2 J3` — A sealed capsule's media links are non-guessable and auth/expiry protected — no CDN leakage that would let a recipient read content before the unlock date.

## Non-Functional Requirements (deltas only)
- Capsule creation (open form → sealed) completes in **under 2 minutes** (J6 target time).
- Unlock fires **no earlier than** the resolved instant D (**zero pre-D tolerance** — any pre-D unlock is a failure) and **no later than D + 60 minutes**; a capsule still locked at D + 60 min emits `capsule_unlock_failed`. This bounded window is the gated trust property (referenced by AC-6 and the gated timing scenario as the pass/fail oracle).
- Unlock-date storage and evaluation are timezone-explicit: store the **owner's seal-time timezone/offset** as the single authoritative resolver; never compare naive local times.

## Edge & Negative Cases
- **Fails to unlock / unlocks early** — the headline trust failure (QC risk; VQM Trust): a capsule that never opens on its date, or opens before it, breaks the differentiator. Both are gated-scenario failures (AC-6).
- **Recipient/circle misconfiguration** — wrong person receives sensitive content (J6 failure point); the pending list must surface the configured recipient so the owner can catch a mistake before unlock (AC-8).
- **Capsule edited before seal** — content/date/recipient changes must be allowed **only** while unsealed; after seal the capsule is immutable (AC-5). Verify no edit path exists post-seal.
- **Recipient no longer in circle at unlock** — if the configured recipient/circle membership changed between seal and unlock (member removed, circle shrunk, account deleted, or recipient deceased), unlock must **not** widen access to anyone outside the **current** circle and must not leak to a removed member. If no valid recipient remains, the capsule does **not** deliver, holds in a clearly-labelled **undeliverable** state, and **notifies the owner** (content-blind) — never silent misdelivery and never a silent drop (AC-10, G1). A deceased single recipient falls into this "no valid recipient" branch — the system must **not** improvise any death-trigger/posthumous behavior (G9).
- **Timezone correctness** — an unlock date must not fire early because of a UTC-offset or DST miscalculation; the resolved instant must be deterministic (AC-7).
- **Posthumous misuse (guardrail)** — any attempt to add a death/posthumous/heir trigger is out-of-scope inheritance logic (G9, AC-9); reject in review.

## Telemetry (content-blind)
- `capsule_create_started` — when the Future Capsule form opens (with capsule_type enum).
- `capsule_sealed` — on confirmed seal (structural only: capsule_type enum, has_media bool, recipient_kind enum {member|circle}, days_until_unlock int). **No content, no recipient identity payload, no media.**
- `capsule_unlocked` — when a capsule unlocks on its date (with on_time bool vs. allowed window; **no content**).
- `capsule_unlock_failed` — if an unlock does not fire within the allowed window or cannot be delivered (with failure_reason enum, e.g. `unlock_timeout` | `recipient_absent`; **no content, no recipient identity payload**).

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] All gated quality scenarios pass (Sara-verified) — esp. **Future Capsule timing (date)** (clock-change verification: unlocks on date, never before)
- [ ] Global guardrails upheld: **G9** (date-only; **no** posthumous/inheritance/death-trigger built), **G1** (recipient limited to living invited member/circle; unlock never widens access; no-valid-recipient surfaces to owner), **G2** (owner may cancel a sealed capsule via explicit confirmation; no system event destroys/locks it), **G4** (content-blind capsule telemetry), **G5** (pending-capsule content is exportable via US-1.4 — does not foreclose the decades/portability promise), durability baseline (no optimistic confirm before content persists)
- [ ] Arabic/RTL reviewed (G6) — capsule creation + pending-list copy
- [ ] Accessibility AA on the capsule creation flow (US-0.4)
- [ ] Telemetry events firing and verified content-blind
