---
id: k-ref-media-durability
date: 2026-06-14
type: reference
scope: Standards & practices for never losing irreplaceable family media — durability at rest (redundancy, checksums, 3-2-1, portability) and reliability in transit (resumable upload, confirm-before-delete) — calibrated to Human Timeline Network's catastrophic data-loss and silent-upload-drop risks
source: WebSearch + WebFetch (Google Cloud durability docs, Wasabi/Synology/Lunavi durability analysis, Google Photos & Alibaba OSS resumable-upload docs, Uploadcare/Filestack upload guides), 2026-06-14
confidence: high
status: active
review_after: 2026-07-14
refresh_interval: 30
related: [k-project-product-profile, k-ref-privacy-circles-consent, k-ref-continuous-capture-habit]
---

# Media Durability & Data-Loss Prevention — Domain Reference

Calibrated for **Human Timeline Network**. Two catastrophic, trust-ending risks in
the Quality Canvas live here: **permanent data loss** (irreplaceable memories gone)
and **silent upload drops** (event looks saved, media never persisted → directly
suppresses Events-Added). Durability is split into two independent problems: keeping
data safe **at rest**, and getting it there reliably **in transit**.

## 1. Durability at rest — the storage floor — authority: official (Google Cloud) + analysis
- **The bar is "11 nines" (99.999999999% annual durability)** — at that level you'd
  expect to lose ~1 object per 10,000 years per 10M stored. This is achievable by
  using a major cloud object store as the system of record, NOT by self-managed disks.
- **How it's achieved (do not reinvent):** erasure coding + redundant fragments across
  many devices, **continuous background checksum scanning** that auto-detects and
  repairs **bit rot** from redundant copies, and replication across multiple
  availability zones / regions.
- **The honest limit (critical):** ~**two-thirds of data-loss events are NOT hardware
  failures** — they're human error, bad deletes, app bugs, account compromise. So 11
  nines of storage durability does NOT mean 11 nines of *memory* durability. HTN's real
  exposure is in its own code and account model, not the storage vendor.
- **3-2-1 as the conceptual floor:** 3 copies, 2 media/providers, 1 off-site/off-account.
  For irreplaceable memories, a second independent copy guards against the human/app-bug
  class the cloud SLA explicitly does not cover.

## 2. Portability & lock-in — the decades problem — authority: analysis
- A "decades-scale preservation" promise is undermined by closed formats + single-vendor
  risk (named in the canvas). Mitigations: store in **open, standard formats**, keep an
  **export path** (full media + metadata) so a user can leave intact, and plan for
  **format migration** over time. Ties to the QC "Data portability (J4)" scenario.

## 3. Reliability in transit — the silent-drop killer — authority: official (Google Photos/Alibaba OSS) + analysis
This is where "silent upload drops" actually happen, and it is squarely HTN's problem
to solve (not the storage vendor's).
- **Resumable, chunked uploads are the standard for mobile/flaky networks.** Break the
  file into chunks; if one fails, re-send only that chunk. A checkpoint records progress
  and survives connection loss; on reconnect the upload resumes, not restarts.
- **Automatic retry with exponential backoff** on connection drops and 5xx errors;
  **adapt to network type** (Wi-Fi vs cellular); detect and surface connectivity state.
- **The non-negotiable rule for a memory product — confirm-before-delete:** never remove
  the local original until the server has **acknowledged a durable, integrity-verified
  write** (e.g., checksum/ETag match end-to-end). The failure that kills trust is "the app
  said saved, freed the local copy, but the media never persisted." An event must
  **either fully persist or clearly fail with retry — never a silent partial save**
  (this is verbatim the QC "Upload reliability on poor network (J1/J2)" scenario).
- **End-to-end integrity check:** verify the bytes that landed match the bytes sent
  (checksum), so a corrupted/truncated upload is treated as a failure, not a success.

## Domain lessons (apply to future reviews)
1. **"Saved" must mean durably persisted + integrity-verified, not "queued" or "uploading."**
   Any flow that shows success before a verified durable write is a NEEDS-REDESIGN trust trap
   and a direct hit on the primary metric (the event is counted but the memory is gone).
2. **Confirm-before-delete is mandatory** for local originals — the single most important
   data-loss guard HTN controls itself.
3. **Storage SLA ≠ memory safety.** 11 nines covers hardware, not human error / app bugs /
   account loss — which are 2/3 of real loss. A second independent copy + export path is the
   guard for the class the SLA excludes. Do not let "we use [cloud], it's 11 nines" close a
   data-durability review.
4. **Open formats + export path are part of the durability promise**, not a premium nicety,
   for a decades-scale product.

## Remaining unknowns
- HTN's storage system of record (which object store / durability class) and whether a
  second independent copy exists.
- Whether uploads are resumable/chunked with end-to-end integrity verification, or naive
  single-shot POSTs (the silent-drop risk).
- Whether the client confirms a durable, verified write before freeing the local original.
- Whether a full export (media + metadata, open format) exists for the MVP.
