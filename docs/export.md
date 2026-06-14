# Open-Format Export (US-1.4)

Export is the MVP-blocking "permanent, portable, yours" promise (G5,
un-backfillable): the owner can take a complete, self-describing JSON of
everything they created and re-import or outlive the company.

## What's in the export

`buildAccountExport` (`src/lib/events/export.ts`) produces an `AccountExport`:
account profile, every owned non-deleted event with full metadata (note, date,
location, circle, legacy-consent, version, timestamps), and each event's media
as **portable references** — `publicId + type + mimeType + checksum + byteSize +
formatLongevityRisk`. The internal `storageKey` is **never** exported (US-3.3);
bytes are fetched via the authorized `/api/media/<publicId>` route.

## Integrity manifest (AC-4)

The export embeds a `manifest`: `eventCount`, `mediaCount`, the full **sorted set
of media checksums**, and a `longevityRiskCount`. `verifyExportIntegrity()`
recomputes the manifest from the body and reports discrepancies
(`event_count_mismatch`, `media_count_mismatch`, `checksum_set_mismatch`,
`declared_event_count_mismatch`) — so a downstream importer (or the export route
itself, before delivery) can confirm the archive is complete and untampered
without trusting the body. The check is **read-only**.

## Format-longevity flags (AC-13)

`hasFormatLongevityRisk()` flags proprietary/encumbered media (HEIC/HEIF, DNG,
QuickTime, M4A) so the owner knows which items may want conversion for long-term
decodability. It never blocks the export; the open baseline (JPEG/PNG/MP4/WAV) is
not flagged.

## Point-in-time snapshot + read-only (AC-11/AC-12, G2)

`buildAccountExport` reads the account and events in a **single transaction**, so
a concurrent create/edit during a long export cannot produce a torn read. The
export performs **no writes** — it never mutates, deletes, or locks the source.

## Owner-scoped, not view-scoped (AC-7)

The export contains only the requester's **own** events (every circle, including
Me-Only — that is the point of portability). Another account's co-contributed
items are not in the export; soft-deleted events are excluded (G2).

## Delivery & telemetry

`GET /api/export` is auth-gated, returns the owner's data as a `no-store`
JSON attachment (non-cacheable; storageKey-free). It emits content-blind
`export_requested`, `export_integrity_verified` (result ok/mismatch), and
`export_completed` (media_count) — counts only, never content.

## Key files
- `src/lib/events/export.ts` — buildAccountExport, manifest, verifyExportIntegrity, longevity flags.
- `src/app/api/export/route.ts` — auth-gated owner-scoped delivery + integrity check.
