# Timeline Event Creation (US-1.1)

The exact action the primary metric (Events Added Per User Per Month) counts.
This feature composes every contract in the slice: media persistence (US-1.2),
privacy circle (US-3.1), secure media serving (US-3.3), and auth (US-0.1).

## Atomic multi-part write — `src/lib/events/create.ts`

`POST /api/events` runs **one `prisma.$transaction`** (AC-7):
1. Verify every referenced media `publicId` is **PERSISTED**, **owned by this
   account**, and not already attached — consuming the US-1.2 persistence signal.
   Any failure throws → the whole transaction rolls back. No orphan event, no
   half-attached media.
2. Create the Event with `circle` + `legacyConsent` + `occurredOn` + `note` +
   `submitKey` (circle and consent are columns on the row, so they commit
   atomically — US-3.1 AC-9, G5).
3. Attach the media (`eventId`).

Success is returned **only after the commit** — never optimistic (AC-3/AC-10).

### Idempotent submit (AC-8)
`Event.submitKey` is unique. A duplicate key (double-tap, retry) returns the
existing event; a unique-violation race resolves to the winning event. Exactly
one event is ever persisted.

### Dates (AC-5)
`occurredOn` is stored as an absolute Gregorian timestamp; the form defaults to
today and accepts any past/future date. The Arabic timeline renders it via
`toLocaleDateString("ar")`.

### Soft-delete (AC-16, G2)
`softDeleteEvent` sets `deletedAt`; reads (`listOwnEvents`, `canViewEvent`,
media serving) all exclude soft-deleted rows. The row survives — recoverable —
and is never hard-deleted by a system event.

## UI
- `src/app/(app)/events/new/page.tsx` — Arabic-first form. Files upload via
  `client-upload` (US-1.2); **Save stays disabled until uploads are
  verified-persisted** and either a note or a persisted media exists (note-only
  valid, AC-2). The CircleSelector defaults to Me-Only and routes Public-on-media
  through the blocking warning (US-3.1).
- `src/app/(app)/timeline/page.tsx` — lists the user's own events newest-moment-
  first; reads hit Postgres so a just-saved event is fresh on any session
  (AC-15). Media render through the authz-gated `/api/media/<publicId>`.

## Verified end-to-end
The keystone Playwright journey (`tests/e2e/full-journey.spec.ts`) proves:
signup → upload photo (confirmed only after persist) → create a Me-Only event →
it appears on the timeline → the owner can load the media (200) while a **second
account and an anonymous client both get 404** — the trust boundary holds on the
bytes, not just the UI.
