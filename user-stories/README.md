# User Stories — Human Timeline Network (MVP)

> **Implementation spec for AI coding agents.** This folder turns the product's
> **Quality Canvas** + **Product Kit** (User Journey Map + Value-Quality Map) into
> discrete, build-ready user stories. Each story is testable, traces back to a source
> document, and inherits a shared set of guardrails.

**Product:** Human Timeline Network — a living timeline of a person's life, memories, relationships, and legacy (*"Netflix for human lives and family history"*).
**Platform (MVP):** **Web only** — responsive web app. No native iOS/Android.
**The bet:** *Will people continuously create and revisit life events?*
**Primary metric:** **Events Added Per User Per Month.**
**Pilot:** Closed, invite-only.

---

## ▶ How to use this folder (AI agents, read in this order)

1. **Read [`CONVENTIONS.md`](CONVENTIONS.md) first.** It defines the story template, the
   **9 global guardrails (G1–G9)**, the global Non-Functional baseline, and the
   Definition of Ready/Done. Every story assumes these and lists only *deltas*.
2. **Pick a story** from the table below in dependency order.
3. **Implement to its Acceptance Criteria**, and treat its **Quality Scenarios** as the
   gates that must pass before "done" (these are Sara-verified during testing).
4. **Never violate a global guardrail.** If a story seems to ask you to, it's a story bug —
   flag it, don't deviate. The most load-bearing guardrails: **Me-Only default (G1)**,
   **memories never destroyed by a system event (G2)**, **no auto-ban / no proactive scanning (G3)**,
   **content-blind analytics (G4)**, **export + consent are un-backfillable, ship them (G5)**.

> **Source of truth** lives in the (gitignored) Sara knowledge base:
> `.sara/knowledge/docs/quality-canvas/project-quality-canvas.md`,
> `.sara/knowledge/docs/user-journeys/user-journey-map.md`,
> `.sara/knowledge/docs/quality-canvas/value-quality-map.md`.
> If a story and a source doc disagree, the source doc wins — raise it.

---

## 🗂 Epics

| Epic | Folder | Core Value | Theme |
|------|--------|-----------|-------|
| **0 — Foundation & Measurement** | [`epic-0-foundation/`](epic-0-foundation/) | Cross-cutting | Auth, permissions, the content-blind measurement substrate, accessibility baseline |
| **1 — Preserve** | [`epic-1-preserve/`](epic-1-preserve/) | CV1 — *a memory put in is a memory kept, and one you can take with you* | Create, capture/upload, bulk import, export |
| **2 — Navigate** | [`epic-2-navigate/`](epic-2-navigate/) | CV2 — *revisit & re-experience a life over time* | Browse, tag, playback |
| **3 — Share with Trust** | [`epic-3-share-trust/`](epic-3-share-trust/) | CV3 — *control who sees each memory* | Circles, propagation, URL security, moderation posture, family invites |
| **4 — Legacy** | [`epic-4-legacy/`](epic-4-legacy/) | CV4 — *durable, portable, yours* | Legacy-consent capture, date-triggered Future Capsules |

---

## 📋 Story index (18 stories)

| ID | Story | Priority | MVP-blocking | Journeys | Depends on |
|----|-------|----------|:---:|----------|------------|
| [US-0.1](epic-0-foundation/US-0.1-account-signup-auth.md) | Account signup, authentication & confirmation | 🔴 | ✅ | J1 | — |
| [US-0.2](epic-0-foundation/US-0.2-browser-capture-permissions.md) | Browser capture permissions + upload fallback | 🟠 | — | J1, J2 | US-0.1 |
| [US-0.3](epic-0-foundation/US-0.3-activation-instrumentation.md) | Content-blind activation & retention instrumentation | 🟠 *(experiment-critical)* | ✅ | J1, J2, J4 | US-0.1 |
| [US-0.4](epic-0-foundation/US-0.4-accessibility-baseline.md) | Accessibility baseline (WCAG 2.1 AA on core flows) | 🟠 | — | J1, J2, J4 | cross-cutting |
| [US-1.1](epic-1-preserve/US-1.1-timeline-event-creation.md) | Timeline Event Creation | 🔴 | ✅ | J1, J2 | US-0.1, US-1.2, US-3.1, US-4.1, US-0.3 |
| [US-1.2](epic-1-preserve/US-1.2-multimedia-capture-upload.md) | Multi-media capture & upload (photo/video/voice) | 🔴 | ✅ | J1, J2 | US-0.2 |
| [US-1.3](epic-1-preserve/US-1.3-dated-bulk-import.md) | Dated bulk import (EXIF backfill) | 🔴 | ✅ | J1 | US-1.2, US-3.1 |
| [US-1.4](epic-1-preserve/US-1.4-open-format-export.md) | Guaranteed open-format export (portability) | 🔴 | ✅ | J4 | US-1.1, US-3.1, US-4.1 |
| [US-2.1](epic-2-navigate/US-2.1-timeline-browsing.md) | Life Timeline browsing (year/month/day) | 🔴 | ✅ | J4 | US-1.1 |
| [US-2.2](epic-2-navigate/US-2.2-date-location-tagging.md) | Date & location tagging | 🟠 | — | J2, J4 | US-1.1 |
| [US-2.3](epic-2-navigate/US-2.3-life-playback.md) | Life Playback | 🟠 | — | J5 | US-2.1, US-3.1 |
| [US-3.1](epic-3-share-trust/US-3.1-privacy-circles.md) | Privacy Circles (Me Only / Family / Public-unlisted) | 🔴 | ✅ | J3 (J1, J2) | US-0.1 |
| [US-3.2](epic-3-share-trust/US-3.2-circle-change-propagation.md) | Circle management & change propagation/revocation | 🔴 | ✅ | J3 | US-3.1 |
| [US-3.3](epic-3-share-trust/US-3.3-media-url-security.md) | Media-URL security (non-guessable, auth/expiry) | 🔴 | ✅ | J2, J3 | US-3.1 |
| [US-3.4](epic-3-share-trust/US-3.4-no-auto-ban-moderation.md) | No-auto-ban / human-in-the-loop moderation | 🔴 *(guardrail)* | ✅ | J2 (J1) | — |
| [US-3.5](epic-3-share-trust/US-3.5-family-invitation.md) | Family invitation & shared space | 🟠 | — | J7 | US-3.1 |
| [US-4.1](epic-4-legacy/US-4.1-legacy-consent-capture.md) | Per-item / per-circle legacy consent capture | 🟠 *(MVP-blocking foundation)* | ✅ | J2, J3 | US-1.1, US-3.1 |
| [US-4.2](epic-4-legacy/US-4.2-future-capsules-date.md) | Future Capsules (date-triggered only) | 🟠 | — | J6 | US-1.1, US-3.1, US-3.5 |

**Priority legend:** 🔴 Load-bearing · 🟠 Supporting · ⚪️ Low · 🔭 Roadmap (not built at MVP).

---

## 🏗 Recommended build order

```
1. Foundation        US-0.1 → US-0.2 → US-0.3, US-0.4
2. Privacy core      US-3.1 → US-3.3 → US-3.4 → US-3.2     (build trust enforcement before capture goes live)
3. Preserve          US-1.2 → US-1.1 → US-4.1 → US-1.3 → US-1.4
4. Navigate          US-2.1 → US-2.2 → US-2.3
5. Share / Legacy    US-3.5 → US-4.2
```
> US-1.1 depends on US-1.2/US-3.1/US-4.1, so those land first. The 9 **MVP-blocking** stories
> (✅ above) are the gate for the experiment; supporting stories make the MVP credible but don't block the bet.

---

## 🔗 Traceability

### Quality Canvas feature → story
| QC feature | Story |
|------------|-------|
| Timeline Event Creation 🔴 | US-1.1 |
| Multi-media capture & upload 🔴 | US-1.2 |
| Dated bulk import 🔴 | US-1.3 |
| Privacy Circles 🔴 | US-3.1 (+ US-3.2, US-3.3) |
| Life Timeline browsing 🔴 | US-2.1 |
| Guaranteed open-format export 🔴 | US-1.4 |
| Onboarding → first event & first-revisit 🟠 | US-0.1, US-0.2, US-1.1 (J1 flow) |
| Per-item/per-circle legacy consent 🟠 | US-4.1 |
| Product instrumentation (content-blind) 🟠 | US-0.3 |
| Date & location tagging 🟠 | US-2.2 |
| Life Playback 🟠 | US-2.3 |
| Future Capsules — date-triggered 🟠 | US-4.2 |
| Family invitation / shared space 🟠 | US-3.5 |
| No-auto-ban child-safety posture 🔴 *(VQM guardrail)* | US-3.4 |
| Accessibility (WCAG AA) *(QC scenario)* | US-0.4 |
| Media quality / resolution options ⚪️ | *Not storied — see backlog* |

### Journey → stories
| Journey | Stories |
|---------|---------|
| **J1** Onboard, import & first event | US-0.1, US-0.2, US-1.3, US-1.1, US-0.3 |
| **J2** Capture a life event | US-1.1, US-1.2, US-2.2, US-3.1, US-4.1, US-3.4 |
| **J3** Set privacy & manage circles | US-3.1, US-3.2, US-3.3, US-4.1 |
| **J4** Browse timeline & export | US-2.1, US-2.2, US-1.4, US-0.3 |
| **J5** Life Playback | US-2.3 |
| **J6** Future Capsule (date-only) | US-4.2 |
| **J7** Invite family & share | US-3.5 |
| **J8** Designate legacy recipient / handoff | 🔭 *roadmap — not storied* |

---

## 🔭 Roadmap backlog (NOT built at MVP — for traceability only)

These are deliberately deferred (guardrail **G9**). Do **not** implement; MVP only avoids
*foreclosing* them (export US-1.4 + consent capture US-4.1 keep the legacy path open).

- **Inheritance / death-trigger / designate-heir (J8)** — hybrid death-trigger (inactivity + verified-death), inherited-vs-closed account model, circles that survive handoff without silently widening.
- **Discoverable Public surface + guardian-consent gate** — friction + guardian consent + minimized metadata before any browseable/indexed public content.
- **Freemium tiers + payment-lapse retention ladder** — when monetization ships: 30-day full-access grace → indefinite read-only + export → *no deletion without a completed, user-confirmed export* (G2 forever).
- **AI life summaries & memory search** — gated behind an **AI safety & evaluation harness** (bias, privacy-leak, hallucination) before any AI feature reaches users.
- **Resurfacing / "On This Day" engine** — automated revisit-retention driver with strict circle-exclusion rules.
- **Media quality / resolution options ⚪️** — premium polish; supportive, not a habit driver. Story it only if it becomes a pilot need.
- **Decades-scale preservation** — open formats, multi-region backup, format-migration, "outlive the company" beyond MVP export (escrow / off-platform release / perpetual funding).
- **Relationship-graph permission architecture** & **scalable media pipeline / cost controls**.

---

## Provenance

Derived from the Product Kit **r2** (MVP scope decisions applied after the Sara × Ziad review, 2026-06-14).
Build status of the product: **pre-build** — all stories describe *target* MVP behavior; verify each against the live app as screens ship.

<small>User stories for Human Timeline Network · generated by Sara (WE WILL business-care quality) from the Quality Canvas + Product Kit · 2026-06-14</small>
