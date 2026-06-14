# US-3.5 — Family Invitation & Shared Space

- **Epic:** Share with Trust (Core Value 3)
- **Priority:** 🟠 Supporting
- **MVP-blocking:** No
- **Journeys:** J7
- **Source:** QC → *Family invitation / shared space*; UJM → J7 + failure points; VQM → Core Value 3 → Family invitation & shared space (Operational: *broken/expired invite links stall growth*; Security: *over-broad access on join*)
- **Depends on:** US-3.1 (privacy circles)
- **Status:** Ready for build

## Story
As a **Multi-Generation Family member / Parent**, I want to **invite a family member to join our shared space and have them see exactly the events their circle permits — no more**, so that **the timeline grows across generations without a new member accidentally gaining access to memories they were never meant to see**.

## Context / Why this matters
Family invitation drives the generational network effect — each member who joins enriches the shared timeline (VQM Core Value 3) — and feeds the "invitations sent" metric. Two risks gate its value. **Operational:** broken or expired invite links mean family can't join and the network effect stalls (J7 failure point). **Security:** *over-broad access on join* — a new member seeing content they shouldn't — is wrong-circle exposure introduced through the front door. The non-negotiable rule is that joining the Family circle grants a member **only** what their circle permits; it never retroactively widens Me-Only items or grants blanket access. This story is the roster source-of-truth that US-3.1/US-3.2 enforce circles against.

## Scope
**In scope (MVP):**
- **Send an invitation** via link, email, or contact (J7 step 2).
- **Invitee accepts and joins the Family circle** (J7 step 3) — the join is the only path to Family membership.
- **Shared events become visible per the new member's circle permissions** (J7 step 4) — they see Family-circle (and Public-unlisted) events the inviting household has shared *to Family*, and **nothing** outside that.
- A clear **pending / accepted / declined** state for the inviter (J7 failure point: "no clear pending/declined state").
- **Re-invite** a pending/expired invitation and **revoke** a member (removing their Family access going forward, coordinating with US-3.2 re-evaluation of access).
- **Security invariant:** joining grants **only** circle-permitted access — never over-broad access; Me-Only items are never exposed by a join. **Invitations are single-use and bound to the redeeming account**, so a forwarded link cannot grant an unintended account Family access.

**Out of scope (deferred / roadmap):**
- The circle model, labels, default, and enforcement — owned by **US-3.1** (this story manages *who is in Family*; US-3.1 enforces *what Family can see*).
- Change-propagation/revocation mechanics on circle downgrade — owned by **US-3.2** (member-revoke here triggers that re-evaluation).
- Media-URL security — owned by **US-3.3**.
- Granular sub-circles, relationship-graph / family-tree permissions (roadmap).
- Inheritance / handoff / designate-heir (J8 — G9, not built).

## Acceptance Criteria
1. **(Send invite)** **Given** the family/sharing area, **when** the inviter sends an invitation via link, email, or contact, **then** an invitation is created in a **pending** state and the inviter sees it as pending.
2. **(Accept & join)** **Given** a valid pending invitation, **when** the invitee opens it and accepts, **then** they **join the Family circle** and the invitation moves to **accepted**.
2b. **(Single-use, account-bound)** **Given** a pending invitation, **when** it is accepted, **then** it is bound to the accepting account and can be redeemed **exactly once**; a single invitation cannot be redeemed by a second person, and a **forwarded/leaked link does not let an unintended account join** the Family circle (closes "over-broad access on join" at the front door — G7).
3. **(Scoped visibility on join)** **Given** a member who just joined, **when** they browse the shared space, **then** they see **only** events shared to the **Family** circle (and any Public-unlisted events explicitly shared), and **no** Me-Only events — confirming the join grants only circle-permitted access.
4. **(No over-broad access — security invariant)** **Given** a newly joined member, **when** their access is evaluated, **then** joining grants **no** access beyond what the Family circle permits; pre-existing Me-Only items are **not** widened, and there is no blanket "see everything" grant.
5. **(Inviter status visibility)** **Given** sent invitations, **when** the inviter views them, **then** each shows a clear state — **pending**, **accepted**, or **declined** — so the inviter can tell whether it worked.
6. **(Declined)** **Given** an invitation, **when** the invitee declines, **then** it moves to **declined**, the invitee gains **no** access, and the inviter sees the declined state.
7. **(Expired / broken link)** **Given** an invitation link that is expired or invalid, **when** it is opened, **then** the invitee sees a clear "expired/invalid — request a new invite" message (never a broken page), and **no** access is granted.
8. **(Re-invite)** **Given** a pending or expired invitation, **when** the inviter re-invites, **then** a fresh valid invitation is issued and the prior expired link does not grant access.
9. **(Revoke member)** **Given** an accepted Family member, **when** the inviter revokes them, **then** within the target window the member loses access to **all** Family-circle events at once (roster-level removal, not item-by-item) and those events become unreachable to them via UI or direct/API/media URL — coordinating with US-3.2 (circle re-evaluation) and US-3.3 (media-URL/CDN invalidation); a previously held link/open page does not retain access on next fetch.
9b. **(Revoke is access-only — G2)** **Given** a revoked member who contributed events to the shared space, **when** revocation completes, **then** the revoke removes only forward access and **no** memory media is deleted, orphaned, or permanently locked by the revoke event (G2); revoke never destroys a member's contributed memories.
9c. **(Honest revoke copy)** **Given** the revoke confirmation, **when** it is shown to the inviter, **then** the copy honestly states that revoking stops new access and invalidates live links but **does not** imply that copies the member already viewed, downloaded, or saved can be recalled.

## Quality Scenarios (gated)
> J7 has no dedicated MVP-gated QC quality scenario of its own; this supporting story is verified against the J7 journey targets and inherits the Core Value 3 enforcement scenarios it feeds:
- **Privacy enforcement** `J2 J3` *(inherited via US-3.1)* — a member's access is bounded by their circle; a Me-Only item is never reachable by a newly joined member via UI or direct/API URL (verify with the new member's account).
- **Circle-change propagation** `J3` *(inherited via US-3.2)* — revoking a member removes their Family access within the target window.
- **Roster-removal propagation** `J7` — a revoked member can reach **no** Family event or its media via UI or direct/API/media URL within the target window (verify with the removed member's account, including a media URL captured **before** revoke).

## Non-Functional Requirements (deltas only)
- **Invite send** target **under 90s**; **invite acceptance under 2 minutes** (UJM J7 target times).
- **Invitation links carry a bounded expiry** and are non-guessable (consistent with US-3.3 link handling); expired/revoked links deny server-side.
- **Revocation takes effect server-side within the US-3.2 target window** (this story inherits that window, it does not redefine it); an already-open page/session for a revoked member must not continue to serve newly requested Family media past that window.
- **Least-privilege on join:** access evaluation on join is additive only within the Family circle and never alters the circle of any existing item.

## Edge & Negative Cases
- **Broken / expired invite link** — must show a clear recoverable message and grant no access (AC7); broken links stalling growth is the named Operational risk.
- **Over-broad access on join** — a member seeing Me-Only or non-shared content after joining is the named Security risk and a defect (AC3, AC4).
- **Forwarded / leaked invite link** — must not allow an unintended account to join; invitations are single-use and bound to the redeeming account (AC2b).
- **Revoke must not destroy memories** — revoke is access-only; a revoked member's contributed memories are never deleted or orphaned by the revoke event (G2, AC9b).
- **Revoke recall over-promise** — UI/copy must not imply already-downloaded/saved copies can be recalled; revoke stops new access only (AC9c).
- **Declined invitation** — grants no access and surfaces a clear declined state (AC6).
- **Re-invite** — re-issuing must invalidate prior expired links, not stack multiple live grants (AC8).
- **Revoke a member** — must remove forward access (and held links/pages) via US-3.2 re-evaluation (AC9).
- **No pending/declined visibility** — an inviter unable to tell whether an invite worked is a defect (AC5).

## Telemetry (content-blind)
- `family_invite_sent` — when an invitation is created, with `channel` enum (link | email | contact). **No contact PII in analytics, no memory content** (G4).
- `family_invite_accepted` / `family_invite_declined` — invitation outcome events with `invite_id` (opaque) only.
- `family_invite_expired` — when an expired/invalid link is opened.
- `family_member_revoked` — when a member is revoked (count/structural only).

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] Gated/inherited quality scenarios pass (Sara-verified) — *Privacy enforcement* (US-3.1) and *Circle-change propagation* (US-3.2) hold for newly joined / revoked members
- [ ] Global guardrails upheld: **G1** (join never widens defaults; Me-Only stays private), **G2** (revoke is access-only — no memory is deleted, orphaned, or locked by the revoke event), **G6** (invite/pending/declined/revoke copy reviewed in Arabic/RTL), **G7** (closed invite-only pilot — invitations are the single-use, account-bound gated entry)
- [ ] Arabic/RTL reviewed (G6) — invitation, status, expiry, and revoke copy; revoke confirmation honestly states it stops new access but cannot retrieve copies already saved
- [ ] Accessibility AA on the invite/join flow (US-0.4)
- [ ] Telemetry events firing and verified content-blind (G4)
