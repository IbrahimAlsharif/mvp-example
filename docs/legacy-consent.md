# Per-item Legacy Consent (US-4.1)

Legacy consent records, per item, whether the owner permits a *future* heir
release of that memory (RUFADAA-aligned). It is MVP-blocking and **un-backfillable
(G5)** — captured now so the option survives, even though inheritance/release is
deferred (G9). It is **never** an access backdoor at MVP.

## Tri-state + timestamp (AC-2/AC-3)

`Event.legacyConsentValue` is a `LegacyConsent` enum:

- **GRANTED** / **DENIED** — explicit owner choices, each stamped with an ISO-8601
  `legacyConsentAt` decision time.
- **UNSET** — the default; carries no timestamp and is treated **identically to
  DENIED** (silence = no future heir access).

The legacy boolean column is kept as a mirror (GRANTED ⇒ true). The value is
committed **atomically** with the event + circle in the same transaction (AC-1):
no item can exist with a circle but no consent record — including at bulk-import
scale (AC-10), where every imported item is written UNSET.

## Per-circle default + independence (AC-4/AC-5)

`CIRCLE_CONSENT_DEFAULT` seeds a new item's value from its circle (conservatively
UNSET everywhere at MVP). The persisted, governing value is the **item's own**
value and is independently editable — changing one event's consent never changes
another's.

## Never an access backdoor (AC-8, G9)

`grantsHeirAccess()` returns **false for every value** at MVP. Inheritance is not
built; the flag is captured + exported only. This function exists so any future
caller is forced through an explicit, auditable gate rather than reading the raw
enum and accidentally turning consent into access.

## Export (AC-7)

`buildAccountExport` includes `legacyConsentValue` + `legacyConsentAt` on every
event — complete and intact, in the open format, so the consent decision (and the
later heir-release option it preserves) survives outside the platform.

## Copy (AC-9, G6)

The Arabic consent control states plainly that consent concerns **future** heir
release and that **nothing is shared or released now** (and is changeable later).

## Key files
- `prisma/schema.prisma` — LegacyConsent enum + Event.legacyConsentValue/At.
- `src/lib/events/consent.ts` — resolveConsent, per-circle default, grantsHeirAccess.
- `src/lib/events/create.ts` — atomic persistence.
- `src/lib/events/export.ts` — consent value + timestamp in the export.
