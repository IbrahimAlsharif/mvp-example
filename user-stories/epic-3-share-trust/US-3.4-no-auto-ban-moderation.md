# US-3.4 — No-Auto-Ban / Human-in-the-Loop Moderation Posture

- **Epic:** Share with Trust (Core Value 3)
- **Priority:** 🔴 Load-bearing (guardrail)
- **MVP-blocking:** Yes
- **Journeys:** J2 (and J1 import)
- **Source:** QC → *No-auto-ban / human-in-the-loop moderation*; QC catastrophic risk *"Automated moderation false-positive (CSAM) deletes/locks account + memories"*; VQM → Core Value 3 → *No-auto-ban child-safety posture*; guardrail G3
- **Depends on:** None (policy / architecture invariant; relates to US-1.2 capture & upload, US-1.3 bulk import)
- **Status:** Ready for build

## Story
As a **Parent preserving my children's lives (any persona)**, I want **the platform to never run an automated scan that could false-flag and auto-delete my account and memories — and to require a human to review before any account action**, so that **an algorithm can never destroy irreplaceable family memories or falsely brand me, and even a moderation hold never loses my data**.

## Context / Why this matters
This is the catastrophic risk at the top of the Quality Canvas: *an automated CSAM scan false-flags intimate child content and auto-deletes/locks the account* — destroying irreplaceable memories, falsely branding a parent, and scaring the core segment off uploading the very content the product exists to preserve. A bulk first-session import (US-1.3) is the worst-case false-positive trigger. The legal posture is precise: **US §2258A duty triggers on *actual knowledge*, not a duty to scan** — so proactive scanning *manufactures* the false-positive risk without a legal mandate. Per G3, the MVP runs **no proactive content scanning**, reports **only on actual knowledge**, requires **human review before any account action**, preserves memories **independently of any moderation hold**, and provides an **appeal/restore path**. This story **owns** the *No-auto-ban / human-in-the-loop moderation* quality scenario. Frame its ACs as **system/architecture invariants** plus the **human-review workflow**.

## Scope
**In scope (MVP):**
- **No proactive automated content/CSAM scanning** of uploaded or imported media or text — not on capture (US-1.2), not on bulk import (US-1.3), not in any background job (G3).
- **Report only on actual knowledge** — the §2258A reporting path activates on *actual knowledge* (e.g., a human report / explicit report-to-authority workflow), **not** on a duty to scan. The MVP builds **no** scanning-driven referral pipeline.
- **Human review before any account action** — no automated flag, heuristic, or background job may **delete, lock, suspend, or ban** an account or its memories. Any such action requires a **human reviewer** to act first.
- **Memories preserved independently of any moderation hold** — a moderation hold may restrict *access/visibility*, but it **never deletes or permanently locks the underlying media store** (G2/G3); the bytes survive the hold and survive review.
- **Appeal / restore path** — there is a defined path to appeal a hold and to **restore** access if the review clears it; restoration returns the memories intact.
- **Two branches of a human-reviewed case** — (a) review **clears** → restore access intact to the original circle (the dominant false-positive case); (b) a human reviewer **confirms** a genuinely reportable item and a §2258A report is filed → the item moves to a **secure, access-limited preservation store** per the statutory secure-preservation duty (§2258A(h)) — **not** a user-facing restore to a circle, and **not** an irreversible purge before the statutory retention elapses.
- This story **owns** the *No-auto-ban / human-in-the-loop moderation* quality scenario.

**Out of scope (deferred / roadmap):**
- The **discoverable Public surface + guardian-consent gate** is deferred (G9) — it is the surface that would later introduce stranger-exposure moderation; not built at MVP.
- Any automated classification, hash-matching, or ML content scanning of any kind (explicitly *not* built — that is the risk this story neutralizes).
- A full moderation case-management console beyond the minimal human-review workflow needed to satisfy the invariants (richer tooling = roadmap).

## Acceptance Criteria
> ACs are framed as **system/architecture invariants** (1–5, 10) and the **human-review workflow** (6–9, 11–13).

1. **(Invariant — no proactive scan)** **Given** any upload or import path (US-1.2 capture, US-1.3 bulk import, background processing), **when** media or text is ingested, **then** **no** automated content/CSAM scan, hash-match, or classifier runs against it — ingestion is content-blind with respect to moderation.
2. **(Invariant — report on actual knowledge only)** **Given** the reporting obligation, **when** a report would be made, **then** it is triggered by **actual knowledge** (a human-driven report/escalation), and there exists **no** scanning-driven automated referral pipeline (consistent with §2258A: duty on actual knowledge, not a duty to scan).
3. **(Invariant — no automated account action)** **Given** any automated signal, flag, heuristic, or failed job, **when** it fires, **then** it can **never** by itself delete, lock, suspend, or ban an account or delete/lock its memories — it can at most enqueue a case for human review.
4. **(Invariant — memories survive a hold)** **Given** an account or item placed under a moderation hold, **when** the hold is active, **then** the underlying **media store is neither deleted nor permanently locked** (G2/G3); a hold may restrict access/visibility only, and the bytes remain intact and recoverable.
5. **(Invariant — memories survive review outcome)** **Given** a completed human review, **when** the outcome is recorded, **then** the memories still exist intact regardless of outcome — no review step performs an irreversible delete of the media store.
6. **(Workflow — human gate)** **Given** a case is enqueued (from a human report), **when** any account-affecting action is proposed, **then** a **human reviewer must act first**; the system does not auto-execute account actions on a timer or threshold.
7. **(Workflow — appeal)** **Given** an account/item under hold, **when** the owner appeals, **then** there is a **defined appeal path that remains reachable and operable by the owner even while an account-scope hold is active** (a hold never blocks access to the appeal/restore flow itself), routes to human review, and is acknowledged to the owner.
8. **(Workflow — restore)** **Given** an appeal (or review) that clears the account/item, **when** the reviewer restores it, **then** access is **restored and the memories return intact** — same media, metadata, and circle as before the hold.
9. **(Workflow — auditability)** **Given** any hold, review decision, or restore, **when** it occurs, **then** it is recorded with actor (human) and timestamp so the human-in-the-loop chain is auditable — and **no** record entry represents an automated account deletion/lock.
10. **(Invariant — enforced choke point)** **Given** any code path that would delete, lock, suspend, or ban an account or its memories, **when** it executes, **then** it passes through a **single enforcement point** that **rejects any caller whose `actor_type` is not human** and **records the rejected attempt** (so a regression introducing an auto-action is blocked at attempt time, not discovered after damage via audit logs).
11. **(Workflow — held-case preservation branch)** **Given** a human reviewer confirms a genuinely reportable item, **when** a §2258A report is filed, **then** the item is moved to a **secure, access-limited preservation store** (§2258A(h)) and is **neither returned to the user-facing circle nor irreversibly purged** before the statutory retention period elapses.
12. **(Workflow — bounded hold)** **Given** an account/item under hold, **when** a defined target window for human review elapses **without a decision**, **then** the case is **escalated** (never auto-actioned and never auto-restored) and the owner is told that a hold is active, why a human review is pending, and the expected resolution window.
13. **(Workflow — localized owner copy)** **Given** an owner whose account/item is under hold, **when** they are shown the hold notice, appeal entry point, acknowledgement, and restore confirmation, **then** all of that copy renders correctly in **Arabic/RTL**, states plainly that the memories are **not deleted**, what a hold does and does not do, and how to appeal — and the appeal action is reachable and operable in Arabic (G6; QC *Circle comprehension / perceived trust (Arabic-first)*).

## Quality Scenarios (gated)
- **No-auto-ban / human-in-the-loop moderation** `J2` — No automated flag deletes or locks memories; any account action requires human review first; an appeal/restore path exists; memories survive independently of any moderation hold.

## Non-Functional Requirements (deltas only)
- **Hold ≠ destruction (architectural):** a moderation hold is implemented as an access/visibility restriction layered *over* the durable media store, never as a deletion or permanent lock of the store itself (G2/G3). Restoration is a metadata/access operation, not a re-upload.
- **No scanning dependency:** the upload/import pipeline has **no** content-scanning step on its critical path; absence of a scanner must never block or delay a save (it does not exist by design).
- **Time-to-first-human-review (held memories):** there is a defined target window for first human review of a held account/item; on elapse the case escalates (AC12) — it is never auto-actioned or auto-restored. An indefinite silent hold is functionally indistinguishable from loss to the family and is a defect.

## Edge & Negative Cases
- **CSAM false-positive auto-delete** — the catastrophic risk; must be impossible by construction because no proactive scanner exists and no automated action can delete/lock (AC1, AC3).
- **Bulk-import false-positive trigger** — a large first-session import (US-1.3) must not invoke any scan or auto-action (AC1) — the worst-case trigger is neutralized.
- **Hold that deletes/locks the store** — a hold that destroys or permanently locks media is a defect; holds restrict access only (AC4).
- **Auto-execute on timer/threshold** — any path that bans/locks without a human acting first is a defect (AC3, AC6).
- **Failed restore** — a cleared appeal that returns memories altered or incomplete is a defect; restore returns them intact (AC8).
- **Silent referral from a scan** — any scanning-driven automated referral pipeline is out of scope and a defect if present (AC2).
- **Hold that locks the owner out of appealing** — an account-scope hold that hides or disables the appeal entry point is a defect; the appeal/restore flow must stay reachable under hold (AC7).
- **Indefinite silent hold** — a hold left awaiting human action past its target window without escalation or owner notice is a defect; it must escalate and communicate, never auto-action or auto-restore (AC12).

## Telemetry (content-blind)
- `moderation_case_opened` — when a human-reported case is enqueued, with `source` enum (human_report) only — **never** a scan source. **No memory content** (G4).
- `moderation_hold_applied` — when an access hold is applied, with `scope` enum (item | account); records that the **media store is untouched**.
- `moderation_action_taken` — when a human reviewer acts, with `actor_type` = human (always) and `action` enum (hold | clear | restore | report). **No automated actor permitted.**
- `moderation_appeal_submitted` / `moderation_restore_completed` — appeal and restore lifecycle events.
- `moderation_auto_action_blocked` — when a non-human actor is rejected at the account-action choke point (AC10), with `attempted_action` enum; **presence of this event is a defect signal**. No memory content (G4).

## Definition of Done
- [ ] All acceptance criteria pass (invariants 1–5, 10 and workflow 6–9, 11–13)
- [ ] All gated quality scenarios pass (Sara-verified) — *No-auto-ban / human-in-the-loop moderation*
- [ ] Global guardrails upheld: **G3** (no proactive scanning, no auto-ban, human review first, appeal/restore, memories survive holds), **G2** (no system event — including a hold — destroys memories)
- [ ] Verified that **no** content-scanning step exists on the US-1.2 / US-1.3 ingestion paths
- [ ] Arabic/RTL reviewed for appeal/hold/restore user-facing copy (G6) — verified testable via AC13
- [ ] Telemetry events firing and verified content-blind (G4); confirmed no automated actor can take an account action (single enforcement choke point per AC10)
