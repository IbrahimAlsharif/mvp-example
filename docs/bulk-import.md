# Dated Bulk Import (US-1.3)

Dated bulk import is the highest-leverage activation lever — it seeds a
populated, navigable timeline in the first session, solving the empty-timeline
cold start. It is also the worst-case moment for two catastrophes — a mass
silent drop and a mass mis-circle — so it is co-designed with the safeguards
below.

## Safeguards

- **Me-Only default (G1, AC-4).** Every imported item is `ME_ONLY`. There is no
  import path that produces a wider default.
- **Dated, with flagged fallback (AC-3).** Each item is placed at its original
  EXIF capture date. `resolveImportDate` (`src/lib/events/import-date.ts`)
  rejects implausible dates (epoch/unset-clock, clearly-future) and missing/
  garbage EXIF, applying a fallback (local today) and **flagging the item for
  review** — the item is always imported, never dropped, and a bad date never
  becomes authoritative ordering.
- **Cross-session checksum dedupe (AC-9).** Before uploading, the client hashes
  each file (`computeChecksum`) and asks `POST /api/import/dedupe` which
  checksums already exist as PERSISTED media on *this* account. Matches are
  skipped (status `dupskipped`) instead of creating doubles. Account-scoped and
  content-blind — only opaque hashes cross the wire.
- **Geo-minimization (AC-13).** Imported items do **not** auto-carry embedded GPS
  — `location` is sent `null` at ingest (geolocation OFF by default). Ingest is
  the only moment this can be minimized.
- **Per-item legacy consent at ingest (G5, AC-12).** Every imported item records
  consent metadata (the not-yet-released default), never backfilled.
- **No scanning / no auto-ban (G3, AC-5).** Import runs content-blind; no scanner
  or classifier touches the media (see docs/moderation.md).
- **Reconciliation receipt (AC-6).** At job end the user sees a receipt proving
  `N selected = N imported + N failed + N duplicate-skipped`, item-accounted, so
  nothing is silently lost. Failed items are retryable.
- **Durable persistence (AC-7).** Each item commits via the US-1.2
  checksum-verified upload contract before being counted imported — a "receipt
  says imported but media is gone" drop is impossible by construction.

## Telemetry (content-blind, G4)

`bulk_import_started` (selected_count, has_video), `bulk_import_completed`
(imported/failed/duplicate_skipped/exif_date/fallback_date counts),
`bulk_import_item_failed` (failure_reason, retry_offered), `bulk_import_reconciled`
(selected = imported + failed). Counts/bools/enums only — never filenames,
content, or coordinates. A successful import also attains the
`populated_timeline` funnel stage (US-0.3).

## Key files
- `src/lib/events/import-date.ts` — plausibility + flagged fallback.
- `src/app/api/import/dedupe/route.ts` — cross-session checksum dedupe.
- `src/lib/media/client-upload.ts` — `computeChecksum`.
- `src/app/(app)/events/import/page.tsx` — the import flow + reconciliation receipt.
