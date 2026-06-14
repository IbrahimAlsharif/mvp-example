# No-Auto-Ban / Human-in-the-Loop Moderation (US-3.4)

The catastrophic risk at the top of the Quality Canvas: an automated CSAM scan
false-flags intimate child content and auto-deletes/locks the account —
destroying irreplaceable memories and falsely branding a parent. The legal
posture is precise: the US §2258A duty triggers on **actual knowledge, not a
duty to scan**, so proactive scanning *manufactures* the false-positive risk
without a mandate. Per G3, the MVP makes this risk **impossible by
construction**.

## Invariants (enforced, not aspirational)

1. **No proactive scanning (AC-1/AC-2).** No content/CSAM scan, hash-match, or
   classifier runs on capture (US-1.2), bulk import (US-1.3), or any background
   job. Verified by code search over the ingest paths — none exists. Cases open
   only from a **human report** (`source = "human_report"`); there is no
   scanning-driven referral pipeline.
2. **Single account-action choke point (AC-3/AC-10).** Every path that would
   delete, lock, suspend, ban, or hold an account/its memories goes through
   `authorizeAccountAction` (`src/lib/moderation/guard.ts`). It returns only for
   a `human_reviewer`; for any non-human actor it emits
   `moderation_auto_action_blocked` (a **defect signal** — its presence means a
   regression) and throws `AutoActionBlocked`. A regression that introduces an
   auto-action is blocked at attempt time, not discovered after damage.
3. **Holds are access-only (AC-4/AC-5, G2).** A `ModerationCase` hold is an
   access/visibility state over the durable store — it **never** deletes or
   permanently locks the media. The bytes survive holds and survive review;
   restore is a metadata/access operation, not a re-upload.

## Workflow

`src/lib/moderation/holds.ts`:

- `openCaseFromReport` — human report → `OPEN` case (no scan source).
- `reviewerAct` — a human reviewer applies `hold` / `clear` / `restore` /
  `report`; each is guard-gated, writes an append-only `ModerationAction` audit
  row (human actor + timestamp, AC-9), and never touches the media store.
- `submitAppeal` — owner appeals; the appeal/restore flow stays reachable even
  under an account-scope hold (AC-7).
- `escalateOverdueCases` — a case whose review window elapses flips `OPEN/HELD →
  ESCALATED` (AC-12). This is the only automated touch and is deliberately
  incapable of any account action — it never auto-actions and never
  auto-restores.
- **Report branch (AC-11):** a human-confirmed reportable item moves to a secure,
  access-limited preservation store (§2258A(h)) — `REPORTED` status — not a
  user-facing restore and not an irreversible purge before statutory retention.

## Telemetry (content-blind, G4)

`moderation_case_opened` (source=human_report, scope), `moderation_hold_applied`
(scope), `moderation_action_taken` (actor_type=human, action),
`moderation_appeal_submitted`, `moderation_restore_completed`, and
`moderation_auto_action_blocked` (attempted_action — **presence is a defect**).

## Owner copy (AC-13)

Hold/appeal/restore notices must render Arabic/RTL, state plainly that the
memories are **not deleted**, what a hold does/doesn't do, and how to appeal. The
model + workflow are in place; the owner-facing notice UI + Sara Arabic-AT review
is the per-flow follow-on against the US-0.4 checklist.

## Key files
- `prisma/schema.prisma` — `ModerationCase`, `ModerationAction`, enums.
- `src/lib/moderation/guard.ts` — the single choke point.
- `src/lib/moderation/holds.ts` — hold/appeal/restore/escalate lifecycle.
