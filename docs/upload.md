# Media Capture & Upload (US-1.2)

Durable media *is* the preserved memory, so the cardinal rule here is: **a
success/PERSISTED signal is produced only after the server has the bytes and has
verified them** (guardrails G1 Me-Only default upstream, G2 never destroy a
persisted item).

## Server flow — `src/lib/media/upload.ts`

Bytes flow **through the API** to S3/MinIO multipart (no direct browser→bucket
path; the bucket stays private and auth stays server-side).

1. **`POST /api/uploads/init`** — validates the MIME against the open-format
   allowlist (`image/jpeg|png`, `video/mp4`, `audio/wav|mpeg`) and **fast-fails**
   otherwise (AC-7). Derives the content-addressed `storageKey = sha256/<checksum>`
   and starts an S3 multipart upload. **Idempotent by `uploadKey`**: a repeat call
   returns the existing session and the part numbers already stored, so a dropped
   client resumes instead of restarting (AC-5) and retries never fork a second
   blob (AC-13).
2. **`PUT /api/uploads/part?uploadKey=&partNumber=`** — stores one 5 MiB chunk.
   Re-sending a part is idempotent in S3.
3. **`POST /api/uploads/complete`** — completes the multipart object, **re-reads
   it and computes its sha256**, and only if that equals the client checksum does
   it create a `PERSISTED` Media row and return its `publicId` (AC-3/AC-4). A
   mismatch deletes the object and returns a retryable failure — **no Media is
   persisted** (AC-6). Idempotent: a second complete returns the same Media (one
   blob, AC-13).

The returned `publicId` is the **persistence signal US-1.1 consumes**: its
event-create transaction only attaches media that are already `PERSISTED`.

## Client — `src/lib/media/client-upload.ts`
`uploadFile()` computes the file sha256, **buffers the bytes in IndexedDB before
uploading and keeps them until completion confirms** (AC-11: a captured-but-
unverified original is never discarded; a tab reload can resume), uploads in
parts skipping ones the server already has, then clears the buffer on success.

## Reaper — `scripts/reap.ts` → `reapAbandonedUploads()`
`npm run reap` aborts and removes **only** sessions that never completed AND have
had no activity past `UPLOAD_ABANDON_THRESHOLD_HOURS` (must exceed any resume
window). A completed session and any PERSISTED media are **never** touched (G2).

## Durability note (AC-9)
Byte-intact restore is verified by the server-side sha256 match at complete time
(confirmation never precedes a verified persist). The "survives a single
storage-node failure" guarantee is satisfied in production by an erasure-coded /
distributed MinIO (or S3) deployment; locally it is exercised via the
put→re-read→checksum round-trip.
