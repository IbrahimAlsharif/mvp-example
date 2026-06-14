# Architecture Overview — Foundation + First Vertical Slice

How the first build increment fits together. Each feature publishes a contract
the next consumes; the whole thing is provable by one browser journey.

## Request flow: creating a private photo event

```
Browser (Arabic/RTL)                Next.js API (server)            Postgres / MinIO
────────────────────                ────────────────────            ────────────────
/signup ─ invite ──────────────────▶ POST /api/auth/signup ───────▶ Account(UNCONFIRMED)
   confirm link ──────────────────▶ GET  /api/auth/confirm ───────▶ Account(ACTIVE) + Session
                                                                      (cookie = raw; DB = hash)

/events/new
  uploadFile() (US-1.2):
    sha256 + IndexedDB buffer
    POST /api/uploads/init ────────▶ mime allowlist, multipart ────▶ UploadSession
    PUT  /api/uploads/part × N ────▶ S3 UploadPart ────────────────▶ MinIO (private)
    POST /api/uploads/complete ───▶ re-read + sha256 == client ───▶ Media(PERSISTED)   ◀── confirm
                                                                      publicId returned
  Save (US-1.1):
    POST /api/events ──────────────▶ ONE tx: verify media PERSISTED+owned,
                                       create Event(circle, legacyConsent, submitKey),
                                       attach media ─────────────────▶ Event + Media.eventId
                                       (idempotent on submitKey)

/timeline ─────────────────────────▶ listOwnEvents (Postgres, fresh) ▶ renders <img src=/api/media/ID>
  <img> ───────────────────────────▶ GET /api/media/ID (US-3.3):
                                       canViewEvent? → 302 presigned (≤10m) ▶ MinIO bytes
                                       else → 404 (no oracle)
```

## The contracts (build order)

| Feature | Publishes | Consumed by |
|---------|-----------|-------------|
| Scaffold | data model (circle/consent columns, soft-delete, content-addressed Media, 128-bit ids), shared libs | all |
| **US-0.1** auth | `requireAccount()` / `getCurrentAccount()`, invite gating, Me-Only default | every protected route |
| **US-3.1** circles | `canViewEvent()` — the single read-authz chokepoint; `CircleSelector` + Public warning | US-3.3, US-1.1 |
| **US-3.3** media security | authz-gated `/api/media/<publicId>` → ≤10-min presigned GET, private bucket, share links | US-1.1 render |
| **US-1.2** upload | "Media is PERSISTED only after server-side checksum match" + the publicId | US-1.1 |
| **US-1.1** event create | atomic event+media+circle+consent write, idempotent submit, timeline | the metric |

## Load-bearing invariants (enforced, tested)

- **G1 Me-Only default** — `Account.defaultCircle` + `Event.circle` default `ME_ONLY`; pre-selected in the UI.
- **Single authz chokepoint** — `canViewEvent()` decides every read; media bytes re-authorize per request.
- **No public path to bytes** — private bucket, no CDN; only per-request ≤10-min presigned GETs; publicId is the only client-facing handle; uniform 404 (no existence oracle).
- **Confirm only after persist** — upload success gated on a server-side checksum match; event success gated on a committed transaction.
- **G2 soft-delete only** — nothing is hard-deleted by a system event; abandoned-only reaper.
- **G4 content-blind telemetry** — `emit()` rejects content-bearing payloads.
- **G6 Arabic-first RTL** — `<html lang=ar dir=rtl>`, all copy in `messages/ar.json`.

## Proof
`tests/e2e/full-journey.spec.ts`: signup → upload → Me-Only event → timeline →
owner reads media (200), **second account & anon get 404**. Plus 62 unit/
integration tests. See per-feature docs: [auth](auth.md), [privacy-circles](privacy-circles.md),
[media-security](media-security.md), [upload](upload.md), [event-create](event-create.md).
