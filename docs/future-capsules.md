# Future Capsules (US-4.2)

Seal a message / video / letter / goal / plan that unlocks on a **future date**
for a living, already-invited recipient or circle — a moment delivered to the
future that opens exactly on its date and **never a moment before**.

## Date-triggered ONLY (G9)

MVP capsules are **date-only**. There is **no** death-trigger, heir, account
handoff, or posthumous delivery, and no recurring/conditional triggers — none of
that code path exists (AC-9, G9). The recipient must be a living, already-invited
member/circle (US-3.5); there is no new-invite flow inside the capsule.

## Sealing & immutability (AC-3/AC-5)

`sealCapsule` accepts only a **strictly-future** date and locks the capsule
(`SEALED`). Sealed = immutable content + unlock date + recipient. The owner keeps
the right to **cancel** (AC-11) — an explicit, confirmed action (G2).

## Timezone-correct unlock (AC-6/AC-7 — the gated trust property)

The unlock instant is resolved **once at seal time** from the owner's
seal-time UTC offset and stored as an absolute `unlockAtMs`
(`resolveUnlockInstant`), so a later DST/offset change can never move it earlier.
`evaluateUnlock` enforces:

- **before D** → `locked` (content unreachable via UI or API — AC-6).
- **D .. D+60min** → `unlocked` (the bounded window).
- **after D+60min still due** → `unlock_failed` (emit `capsule_unlock_failed`).

**Zero pre-D tolerance:** locked one ms before D, unlocked exactly at D.

## Access enforcement (AC-6/AC-10)

`resolveCapsuleAccess` returns the content only when (a) the capsule is past its
unlock instant **and** (b) the viewer is the owner or a **current** member of the
recipient circle (live roster via `canViewEvent`). A removed recipient gains no
access and unlock never widens beyond the current circle. If no valid recipient
remains, `reconcileUndeliverable` flips the capsule to `UNDELIVERABLE` and the
owner is notified (content-blind) — never a silent misdelivery or drop.

## Export (AC-12, G5)

Sealed/pending capsules are included in the account export (type, content,
unlock date, offset, recipient, status) so the future moment survives outside the
platform.

## Telemetry (content-blind, G4)

`capsule_create_started` / `capsule_sealed` (mode = type enum),
`capsule_cancelled`. No content.

## Key files
- `src/lib/capsules/unlock.ts` — timezone-correct resolution + window evaluation.
- `src/lib/capsules/index.ts` — seal/cancel/list/access/undeliverable lifecycle.
- `src/app/api/capsules/route.ts` + `[id]/route.ts` — seal/list/cancel.
- `src/app/(app)/capsules/CapsuleManager.tsx` — create form + pending list.
- `prisma/schema.prisma` — Capsule / CapsuleMedia models.
