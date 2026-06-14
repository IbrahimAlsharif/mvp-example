# Family Invitations & Roster (US-3.5)

The Connection social graph (canonical unordered-pair edges, tiers FAMILY /
GENERAL, PENDING / ACCEPTED) already powered visibility. This adds the
user-facing flow on top of it.

## Flow

`/family` (`FamilyManager`) → `/api/connections`:

- **Invite** — `POST /api/connections { email, tier }` invites an existing
  invited-pilot account. Anti-enumeration: the same 200 is returned whether or
  not the recipient exists (and a self-invite is a silent no-op). Emits
  `family_invite_sent`.
- **Pending** — `GET /api/connections` returns the viewer's pending incoming
  requests and accepted members for the roster UI.
- **Accept / Decline** — `PATCH /api/connections/{id} { action }`. Only the
  recipient (not the requester) may act. Decline **deletes** the pending edge, so
  a later re-invite is a fresh request (AC-8). Emits `family_invite_accepted` /
  `family_invite_declined`.
- **Revoke** — `DELETE /api/connections/{id}`. Either member removes an accepted
  edge. The UI confirms first and states the access loss is immediate and that
  **no memory is deleted** (G2). Emits `family_member_revoked`.

## Roster-removal propagation (AC-9)

No separate revocation machinery: the read authz layer
(`acceptedConnectionsByTier` / `canViewEvent`) resolves the roster **live** on
every request. So a removed member loses access to the owner's FAMILY events on
their **next server-validated request** — the same immediate, server-side
enforcement and window as a circle downgrade (US-3.2). The events/media are never
touched; only the edge is removed.

## Accessibility (US-0.4)

The family page uses labeled fields, an assertive error live region, a polite
"sent" status, and keyboard-operable accept/decline/revoke buttons with
accessible names. Copy is Arabic-first/RTL, including the revoke-confirm honesty
message.

## Telemetry (content-blind, G4)

`family_invite_sent` (tier), `family_invite_accepted` (tier),
`family_invite_declined`, `family_member_revoked` — structural enums only; no
identities or content.

## Key files
- `src/lib/connections/index.ts` — request/accept/decline/revoke + roster queries.
- `src/app/api/connections/route.ts`, `src/app/api/connections/[id]/route.ts` — routes.
- `src/app/(app)/family/page.tsx` + `FamilyManager.tsx` — the UI.
