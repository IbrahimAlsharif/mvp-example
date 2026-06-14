# User Story Conventions — Human Timeline Network (MVP)

> Read this **before implementing any story.** It defines the story format, the
> global guardrails every story inherits, and the Definition of Ready/Done.
> Individual stories do **not** repeat these globals — they assume them and only
> call out deltas.

**Product:** Human Timeline Network — *"Netflix for human lives and family history."*
**Platform scope (MVP):** **Web only** — a responsive web app. No native iOS/Android.
Capture uses browser camera/mic/file-upload APIs. "Cross-device" = across the user's own
browsers/devices (laptop ↔ phone browser), not a separate native app.
**The bet:** *Will people continuously create and revisit life events?*
**Primary metric:** **Events Added Per User Per Month.**

Source of truth for every story (do not invent scope beyond these):
- Quality Canvas — `.sara/knowledge/docs/quality-canvas/project-quality-canvas.md`
- User Journey Map (J1–J7) — `.sara/knowledge/docs/user-journeys/user-journey-map.md`
- Value-Quality Map — `.sara/knowledge/docs/quality-canvas/value-quality-map.md`

> These source files live under `.sara/` (gitignored, local knowledge base). This
> `user-stories/` folder is the **committed, shareable build spec** derived from them.

---

## 0. Global MVP guardrails (apply to EVERY story)

These are non-negotiable MVP rulings (Sara × Ziad review, 2026-06-14). Treat any
story requirement that contradicts one of these as a defect in the story, not a
license to deviate.

| # | Guardrail | What it means for implementation |
|---|-----------|----------------------------------|
| G1 | **Private-circles-first** | Default privacy circle is **Me Only**. "Public" ships **only** as an *unlisted, non-discoverable shareable link*. There is **no** browseable/indexed public surface at MVP. |
| G2 | **Memories are never destroyed by a system event** | No billing event, no moderation flag, no downgrade, and no failed background job may delete or permanently lock a user's media. Deletion only ever follows an explicit, confirmed user action. |
| G3 | **No proactive content scanning / no auto-ban** | No automated CSAM/content scan. No automated flag may delete or lock an account or its memories. Any account action requires human review first; an appeal/restore path must exist; memories survive independently of any moderation hold. |
| G4 | **Content-blind analytics** | Instrumentation may record funnel/retention events and structural metadata, but must **never** capture or transmit memory media or memory text content. |
| G5 | **Export & per-item consent are MVP-blocking and un-backfillable** | Open-format export (US-1.4) and per-item legacy consent capture (US-4.1) must ship in MVP. They cannot be added later for data created before they existed. |
| G6 | **Arabic-first, RTL** | All user-facing copy must be reviewed in Arabic; layouts must render correctly RTL. Privacy-circle labels must be unambiguous in Arabic (perceived-trust requirement). |
| G7 | **Closed, invite-only pilot** | MVP is gated to invited pilot families. No open self-serve public signup at MVP. |
| G8 | **Free at MVP** | No paywall, no storage tiers, no payment flow. (The payment-lapse retention ladder is documented for the future but must not be built now.) |
| G9 | **Deferred = do not build** | Inheritance / death-trigger / designate-heir (J8), discoverable Public surface, freemium tiers, AI summaries/search, and "On This Day" resurfacing are **roadmap**. Do not implement; only avoid foreclosing them (export + consent capture keep them open). |

---

## 1. Story file format

Every story file follows this exact structure. Keep section headings verbatim so
the docs are machine-navigable.

```markdown
# US-X.Y — <Short title>

- **Epic:** <epic name>
- **Priority:** 🔴 Load-bearing | 🟠 Supporting | ⚪️ Low | 🔭 Roadmap (not built at MVP)
- **MVP-blocking:** Yes | No
- **Journeys:** J# (...)
- **Source:** QC <feature/scenario>, UJM <journey>, VQM <core value / risk>
- **Depends on:** US-A.B, US-C.D (or "None")
- **Status:** Ready for build | Draft | Blocked

## Story
As a <persona>, I want <capability>, so that <value>.

## Context / Why this matters
<2–5 sentences tying the story to the bet, the metric, or a catastrophic risk it guards.
Pulled from the QC/VQM "Why it matters". No new scope.>

## Scope
**In scope (MVP):**
- ...
**Out of scope (deferred / roadmap):**
- ...

## Acceptance Criteria
Numbered, testable, Given/When/Then where it adds clarity. Each AC is independently verifiable.
1. **Given** ... **when** ... **then** ...
2. ...

## Quality Scenarios (gated)
The QC quality scenarios this story must satisfy, with target metrics. These are the
"must pass before done" gates — usually verified by Sara during testing.
- **<Scenario name>** `J#` — <assertion + target metric>

## Non-Functional Requirements (deltas only)
Only NFRs specific to this story beyond the global baseline (§2). E.g. specific latency targets.

## Edge & Negative Cases
Failure modes to handle explicitly (from the journey's "Critical Failure Points" and QC risks).
- ...

## Telemetry (content-blind)
Funnel/retention/structural events this story must emit (content-blind per G4). "None" if not applicable.
- event: `...` — when: ...

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] All gated quality scenarios pass (Sara-verified)
- [ ] Global guardrails (§0) upheld — list the ones this story touches
- [ ] Arabic/RTL reviewed (G6)
- [ ] Accessibility AA on this flow (if a core flow) (see US-0.4)
- [ ] Telemetry events firing and content-blind verified
```

---

## 2. Global Non-Functional baseline (inherited by all)

Stories list only **deltas**; these apply everywhere unless a story overrides with a tighter target.

- **Privacy default:** Me Only (G1). Every create/import path defaults to Me Only.
- **Durability:** After an upload *confirmation* is shown, the media must be durably
  persisted (survives a single storage-node failure, checksum-verifiable). Never confirm
  before persistence. (QC: Media durability, Silent upload drops.)
- **No silent failure:** Any save/upload either fully persists or visibly fails with a
  retry affordance. Never a silent partial save. (QC: Upload reliability.)
- **Security:** All media URLs (including unlisted share links) are non-guessable and
  auth/expiry-protected — no public CDN leakage of Me-Only/Family/unlisted media. (See US-3.3.)
- **Accessibility:** Core flows (capture, import, browse, voice playback) meet **WCAG 2.1 AA**,
  screen-reader operable, voice notes have transcripts. (See US-0.4.) Critical for the Elderly persona.
- **Localization:** Arabic-first, full RTL (G6).
- **Instrumentation:** Emit the content-blind funnel/retention events relevant to the story (G4, US-0.3).
- **Performance budget (default):** First meaningful screen < 2s; primary action acknowledged < 1s.
  Stories with media accumulation (browse, playback, scale) carry tighter, explicit p95 targets.
- **Consistency (web-only):** A write is durable and a subsequent fresh read on any of the
  user's sessions/devices returns it within the target window (fresh-read / cache-invalidation,
  not a separate sync feature). (QC: Cross-device consistency, Stale timeline.)

---

## 3. Personas (from the UJM)

- **Family Archivists** — already documenting family memories, children, milestones.
- **Parents** — preserve and share their children's lives privately.
- **Multi-Generation Families** — relatives across countries sharing one timeline.
- **Knowledge & Legacy Builders** — want their stories/lessons to outlive them.
- **Elderly Individuals** — preserving memories for future generations (most at-risk on UX/accessibility).
- **New user (any persona)** — used for onboarding/foundation stories.

---

## 4. Priority legend & build order

- 🔴 **Load-bearing** — the bet cannot be read without it. Build first.
- 🟠 **Supporting** — needed for a credible MVP; build after load-bearing.
- ⚪️ **Low** — polish; build last or defer.
- 🔭 **Roadmap** — do **not** build at MVP (documented for traceability only).

**Recommended build order:** Epic 0 (foundation: auth, permissions, instrumentation, a11y) →
Epic 1 (Preserve) + Epic 3 privacy core (US-3.1/3.3/3.4) in parallel → Epic 2 (Navigate) +
Epic 4 (Legacy consent US-4.1) → remaining supporting stories (playback, capsules, invites).

---

## 5. Definition of Ready (a story may enter build when…)

- [ ] Persona, value, and journey are clear and trace to QC/UJM/VQM.
- [ ] Acceptance criteria are testable and unambiguous.
- [ ] Gated quality scenarios + target metrics are listed.
- [ ] Dependencies are identified and either done or planned.
- [ ] No requirement contradicts a global guardrail (§0).

---

<small>Conventions for Human Timeline Network user stories · derived from Product Kit r2 (Sara × Ziad, 2026-06-14) · by WE WILL TECH</small>
