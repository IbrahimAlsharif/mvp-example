# US-3.2 — Circle Management & Change Propagation / Revocation

- **Epic:** Share with Trust (Core Value 3)
- **Priority:** 🔴 Load-bearing
- **MVP-blocking:** Yes
- **Journeys:** J3
- **Source:** QC scenario *Circle-change propagation*; UJM → J3 failure point *"Circle downgrade (Family → Me Only) doesn't revoke prior access"*; VQM → Core Value 3 → Privacy Circles
- **Depends on:** US-3.1 (privacy circles)
- **Status:** Ready for build

## Story
As a **Parent / Family Archivist (any persona)**, I want to **change an event's privacy circle after I created it and have that change take effect immediately — including revoking access I previously granted**, so that **I can correct or tighten who sees a memory and trust that "downgrade" actually removes access, not just hides a button**.

## Context / Why this matters
A privacy control that *grants* access correctly but fails to *revoke* it is a false sense of security. The exact J3 failure this story guards is: *"Circle downgrade (Family → Me Only) doesn't revoke prior access"* — the event disappears from the owner's sharing UI while prior viewers (or a cached link/page) can still reach it. That is wrong-circle exposure (VQM Core Value 3, Trust) with no visible symptom. This story makes downgrade a genuine revocation, enforced server-side and reflected for every viewer immediately. It **owns** the *Circle-change propagation* quality scenario.

## Scope
**In scope (MVP):**
- Change an event's circle **after creation** from the event detail / privacy control (J3).
- **Downgrade Family → Me Only revokes access for all prior members** within the target window — the event and its media become unreachable to former viewers via UI *and* direct/API/media URL.
- **Downgrade Public (unlisted link) → Family or Me Only** invalidates the unlisted share link (delegates link revocation to US-3.3) so the previously-shared link no longer grants access.
- On downgrade, the UI **honestly states the limit of revocation**: access is revoked going forward (server, API, media URL, links), but copies a prior viewer already downloaded/saved cannot be recalled — never imply total recall.
- For the **Family** circle, on change the UI **confirms exactly which members are included / affected** before applying (so the owner sees who gains or loses access).
- **Access updates immediately for all viewers** — a former member's already-loaded session loses access on its next access attempt within the target window; no stale grant persists.
- This story **owns** the *Circle-change propagation* quality scenario.

**Out of scope (deferred / roadmap):**
- The base circle selector, default, labels, and child-media warning — owned by **US-3.1**.
- The mechanics of link non-guessability / expiry / CDN / hotlinking — owned by **US-3.3** (this story *triggers* link revocation; US-3.3 *implements* it).
- Family roster management (adding/removing members, invites) — owned by **US-3.5**. Roster-driven revocation (a member removed via US-3.5 losing access to existing Family events) is owned by US-3.5, but must carry the same server/API/media-URL enforcement and target window this story defines (see Edge & Negative Cases).
- Per-person granular revocation within Family (roadmap relationship-graph permissions).

## Acceptance Criteria
1. **Given** an existing event, **when** the owner opens its privacy control and selects a different circle, **then** the new circle is saved and becomes the authoritative access rule, replacing the prior circle.
2. **(Downgrade revokes — UI)** **Given** an event currently set to **Family** that a member B can see, **when** the owner downgrades it to **Me Only**, **then** within the target window (defined in NFRs) B can **no longer** see the event in any UI surface (timeline, deep link, notifications).
3. **(Downgrade revokes — direct/API/media)** **Given** the same downgraded event, **when** B (or any non-owner) requests the event or its media via **direct event URL, API endpoint, or media URL**, **then** the request is **denied server-side** — confirming revocation is real, not UI-only.
4. **(Public link revocation)** **Given** an event set to **Public (unlisted link)** with a link previously shared, **when** the owner downgrades it to Family or Me Only, **then** the previously-shared unlisted link **no longer grants access** to the event or its media (link revocation delegated to US-3.3).
5. **(Family member confirmation)** **Given** the owner changes an event **to** or **within** the Family circle, **when** the change is about to apply, **then** the UI shows **exactly which members are included / will be affected**, and the owner must confirm before it applies.
6. **(Immediate propagation)** **Given** any circle change, **when** it is saved, **then** access is updated for **all** viewers within the target window (defined in NFRs) — no viewer retains the old access level beyond that window.
7. **(Upgrade)** **Given** an event downgraded to Me Only, **when** the owner later **re-upgrades** it to Family, **then** access is re-granted **only** per the *current* Family roster at the moment of re-upgrade — a member removed in the interim does **not** silently regain access.
8. **(Atomicity)** **Given** a circle change, **when** it is persisted, **then** the change is atomic — the access decision is never left in a half-applied state where some surfaces enforce the new circle and others still enforce the old one.
9. **(Downgrade never destroys the memory — G2)** **Given** any circle change (including a downgrade or a Public→tighter change), **when** it is applied, **then** the underlying media and event are **never** deleted or permanently locked, and the **owner retains full access throughout** — only non-owner access is revoked.
10. **(Failed / partial change fails closed — no silent failure)** **Given** a circle change that cannot be fully committed across all surfaces, **when** the failure is detected, **then** the change is rolled back to the prior circle as the single authoritative state (no partial enforcement), **and** the owner is shown a visible failure with a retry affordance — never a success confirmation. The owner must never be told a downgrade succeeded while any surface still serves the old (wider) access.
11. **(Revocation honesty)** **Given** the owner downgrades an event, **when** the change is confirmed, **then** the UI honestly states that access is revoked going forward (server, API, media URL, links) but that copies a prior viewer already downloaded/saved cannot be recalled — the UI must not imply total recall.

## Quality Scenarios (gated)
- **Circle-change propagation** `J3` — Downgrading an event from Family to Me Only revokes access for prior members within the target window.

## Non-Functional Requirements (deltas only)
- **Target window (definition / oracle):** the **next server-validated request after the change is committed** — no cached or held grant may authorize the resource on any request that begins after commit (0 stale grants). **Hard ceiling:** signed media URLs and CDN/edge cache for the object are invalidated/purged within **≤ N seconds** (PM to fix N, aligned with the US-3.3 signed-URL TTL — N must be ≤ the signature TTL or a held media URL can re-fetch until it expires), measured by the `circle_downgrade_revocation_completed` `propagation_ms` telemetry. AC2, AC6, and the gated quality scenario inherit this definition.
- **Revocation propagation window:** after a downgrade is confirmed, prior access is revoked across UI, direct/API, and media URLs within the target window defined above; verify no stale grant persists beyond the window.
- **No reliance on client-side state for revocation** — a viewer's cached page, open tab, or held media URL must not retain access after revocation; enforcement is re-checked server-side on each access.

## Edge & Negative Cases
- **Member viewing at the moment of downgrade** — a former member with the event open when the downgrade lands must lose access on the **next** access attempt (refresh, media re-fetch, navigation) within the target window; an open frame already rendered must not be re-fetchable.
- **Cached access** — a previously-served page or a cached/held media URL must not continue to authorize the resource after revocation (no CDN/cache bypass — coordinates with US-3.3).
- **Re-upgrade after roster change** — re-upgrading to Family grants access per the *current* roster, never the historical one (AC7).
- **Downgrade that doesn't revoke** — the headline J3 failure; an item that vanishes from the owner's UI but is still reachable by a prior viewer is a defect, not a partial pass.
- **Partial propagation** — new circle enforced on some surfaces but not others (e.g., UI updated, media URL still valid) is a defect (AC8).
- **Failed / partial change** — if a change cannot be fully committed across all surfaces, it must fail closed: roll back to the prior circle as the single authoritative state and show the owner a visible failure with retry — never a success confirmation while any surface still serves the old (wider) access (AC10).
- **Roster-driven revocation (US-3.5 boundary)** — a member removed from the Family roster (US-3.5) losing access to existing Family events is **owned by US-3.5**, not this story; however it is implemented, a removed member must lose Family-event access with the same server/API/media-URL enforcement and target window defined here. Leaving it unhandled (removed relative retains access because the owner never re-saved the event) is a defect against US-3.5.

## Telemetry (content-blind)
- `circle_change_applied` — when a circle change is saved, with `from_circle`/`to_circle` enums and `is_downgrade` bool. **No memory content** (G4).
- `circle_downgrade_revocation_completed` — when revocation has propagated across surfaces, with `affected_member_count` (integer count only, no identities) and `propagation_ms`.
- `public_link_revoked_on_downgrade` — when a Public→tighter change invalidates an unlisted link (links to US-3.3 revocation).
- `family_members_affected_confirmed` — when the owner confirms the affected-members list before applying a Family change (`member_count` only).

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] All gated quality scenarios pass (Sara-verified) — *Circle-change propagation*
- [ ] Global guardrails upheld: **G1** (circle changes never default wider; Public stays unlisted), **G2** (downgrade revokes access only — never deletes or locks the memory; owner access preserved), **G6** (affected-members confirmation copy reviewed in Arabic/RTL)
- [ ] Arabic/RTL reviewed (G6) — including the affected-members confirmation **and** the revocation-honesty message ("access stopped going forward; saved copies can't be recalled"), drafted in the correct Arabic register (neither false reassurance nor alarming legalese)
- [ ] Accessibility AA on the privacy-change flow (US-0.4)
- [ ] Telemetry events firing and verified content-blind (G4)
