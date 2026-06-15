# Circle Change & Revocation (US-3.2)

A privacy control that grants access correctly but fails to *revoke* it is a
false sense of security. The J3 failure this guards against: downgrading an
event's circle hides it from the owner's UI while prior viewers (or a cached
link) can still reach it. Here a downgrade is a **genuine, server-enforced
revocation**.

## Change path

`PATCH /api/events/{id}` with `{ circle }` → `changeEventCircle()`:

1. **Owner-only.** A non-owner gets a uniform 404 (no existence oracle). The
   server is the authority — the UI affordance is convenience, not the gate.
2. **Atomic.** The circle update and (on a downgrade away from `PUBLIC_UNLISTED`)
   the unlisted share-link revocation happen in **one transaction** — no surface
   is left half-applied (AC-8). On failure the prior circle stays authoritative
   and the owner sees a visible error with retry (fail-closed, AC-10).
3. **Immediate propagation.** No new revocation machinery is needed: the media /
   read authz layer (`resolveMediaAccess`, `canViewEvent`) already re-reads
   `event.circle` on **every** request, so a former viewer is denied on their
   next server-validated request — no stale grant, no cached page or held media
   URL keeps access (AC-3/AC-6). Signed media URLs expire within the US-3.3 TTL.
4. **Memory preserved (G2/AC-9).** Only `Event.circle` (and link `revokedAt`)
   change. Media bytes are never deleted or locked, and the owner keeps full
   access throughout — only non-owner access is revoked.

## Re-upgrade uses the current roster (AC-7)

Re-upgrading Me Only → Family grants access per the **current** Family roster at
the moment of re-upgrade (resolved live via `canViewEvent`), so a member removed
in the interim does not silently regain access.

## UI (owner-only)

`ChangeCircleControl` (in the event modal, shown only when `EventVM.isOwn`) lets
the owner pick a new circle. On a downgrade it shows the **revocation-honesty**
message — access stops going forward across app/links, but copies already
downloaded cannot be recalled (AC-11) — and never implies total recall. Built on
`CircleSelector` so it inherits the accessible radio group + circle-state live
region (US-0.4 AC-9).

## Telemetry (content-blind, G4)

- `circle_change_applied` — `from_circle`, `to_circle`, `is_downgrade`.
- `circle_downgrade_revocation_completed` — `propagation_ms` (0; revoked at commit).
- `public_link_revoked_on_downgrade` — emitted when a Public→tighter change kills a link.

## Key files
- `src/lib/events/circle-change.ts` — `changeEventCircle()`, `isDowngrade()`, `currentFamilyMemberCount()`.
- `src/app/api/events/[id]/route.ts` — the owner-only PATCH route.
- `src/components/timeline/cosmic/ChangeCircleControl.tsx` — owner UI + revocation honesty.
