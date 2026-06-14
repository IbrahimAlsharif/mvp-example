# US-1.2 — Multi-media capture & upload (photo / video / voice)

- **Epic:** Preserve (Core Value 1)
- **Priority:** 🔴 Load-bearing
- **MVP-blocking:** Yes
- **Journeys:** J1 (first event media), J2 (core recurring capture)
- **Source:** QC → *Multi-media capture & upload (photo/video/voice)* (🔴 High); QC scenarios → *Media durability* `J2`, *Upload reliability on poor network* `J1 J2`; QC risks → *Silent upload drops*, *Permanent data loss*, *Storage/bandwidth cost blowout*; VQM → Core Value 1 → Multi-media capture & upload
- **Depends on:** US-0.2 (browser camera/mic/file permissions)
- **Status:** Ready for build

## Story
As a **Parent / Family Archivist (any persona)**, I want to **capture photo, video, or voice directly in my browser — or upload existing media files — with the upload completing reliably even on a poor connection**, so that **the memory I just preserved is actually kept, never silently lost** — because durable media *is* the preserved memory, and a silent drop both suppresses Events-Added and destroys trust in the product as a safe place.

## Context / Why this matters
This story owns the **durability and upload-reliability contract** that US-1.1 (Timeline Event Creation) delegates to. US-1.1 gates its success confirmation on "persistence confirmed" — that confirmation is defined and enforced *here*. If upload is unreliable, an event can look saved while the media is gone: the single most catastrophic trust failure in the product (`Silent upload drops`, `Permanent data loss` in QC risks) and a direct suppressor of the primary metric. Because pilot families capture on phone browsers over mobile networks, "works on a fast laptop" is not enough — poor-network resilience is load-bearing, not polish. The persistence signal US-1.1 consumes distinguishes fully-persisted from partially-persisted: a multi-file event is reported as fully saved only when **all** its items are verified-persisted (AC-12), so a partial set is never shown saved while some media is still failed.

## Scope
**In scope (MVP):**
- **Capture in-browser:** take a photo, record a video, and record a voice note using browser camera/mic APIs (permissions handled by US-0.2). Capture is degradable — if camera/mic permission is denied, the upload path below still works.
- **Upload existing files:** select and upload photo, video, and voice/audio files from the device.
- **Reliable, resumable upload:** uploads use a resumable/chunked transfer so an interrupted transfer (network blip, tab backgrounded) **resumes** rather than restarting from zero; a stalled upload surfaces a retry affordance.
- **Confirmation gated on durable persistence:** a success state is shown **only after** the media is durably persisted server-side and checksum-verified — **never optimistic** (no "looks done" before persistence). This is the persistence signal US-1.1 consumes.
- **Checksum-verifiable durability:** persisted media survives a single storage-node failure and restores byte-intact (client-computed checksum recorded and matched server-side).
- **No silent drop / no silent partial save:** every upload either fully persists (and confirms) or **visibly fails with a retry affordance**. Multi-file selections report each item's outcome; a partial-set failure is never hidden.
- **Format & input validation:** accepted media types are validated up-front against an explicit allowlist that prefers open, widely-renderable formats (e.g. JPEG/PNG for photo, MP4/H.264 for video, WAV/MP3 for voice); an unsupported format fails fast with a clear, actionable message (never a silent reject, never a corrupt save).
- Default privacy on any media-bearing event remains **Me Only** (G1) — set by the owning create/import flow; this story never widens it.

**Out of scope (deferred / roadmap):**
- Event composition itself (date, location, circle, save) — owned by US-1.1.
- Bulk/multi-hundred import with EXIF backfill — owned by US-1.3 (this story is single-event capture; US-1.3 reuses this upload contract at scale).
- Media transcoding tiers, resolution/quality options (⚪️ US — `Media quality / resolution options`), and the scalable transcoding/CDN pipeline (roadmap).
- Editing/trimming captured media beyond basic re-take/discard before save.
- Any proactive content scanning of media (G3) — uploads are content-blind (G4).
- Open-format export itself — owned by US-1.4. **Non-foreclosure:** every item persisted here must be retrievable by US-1.4 open-format export (G5) and is stored in an exportable form with its metadata; export is not built here but must not be foreclosed by a storage choice made here.

## Acceptance Criteria
1. **Given** an authenticated user in the add-event flow with camera/mic permission granted (US-0.2), **when** they choose capture, **then** they can take a photo, record a video, or record a voice note in-browser and attach it to the event.
2. **Given** the user instead chooses upload, **when** they select one or more photo/video/voice files, **then** each selected file is queued and uploaded with visible per-file progress.
3. **Given** any in-flight upload, **when** the upload is still transferring or being persisted, **then** the UI shows a clearly **pending** state and **no success/confirmation is shown** until durable persistence is confirmed server-side (US-1.1's save confirmation depends on this signal).
4. **Given** an upload that has completed transfer, **when** the server has **durably persisted the bytes to redundant storage (survivable across a single storage-node failure)** *and* the **server-side checksum matches the client-computed checksum**, **then** — and only then — the item is marked successfully persisted (the redundancy bar that satisfies AC-9 must hold *at confirm time*, not asynchronously after).
5. **Given** a network interruption mid-upload (blip, lost connection, tab backgrounded), **when** connectivity returns, **then** the upload **resumes from where it stopped** (resumable transfer) rather than restarting from zero, and still completes to a verified-persisted state.
6. **Given** an upload that cannot complete (persistent failure or timeout), **when** the failure is detected, **then** the item is shown as **failed with a retry affordance** — never silently dropped and never shown as saved.
7. **Given** a multi-file selection where some items persist and some fail, **when** the batch resolves, **then** the user sees a per-item outcome (N persisted / M failed) and can retry only the failed items — a partial-set result is never hidden or reported as full success.
8. **Given** an unsupported or corrupt file/format, **when** it is selected, **then** it is rejected **before** upload with a clear, actionable Arabic-first message — never silently skipped and never persisted in a broken state.
9. **Given** a successfully persisted item, **when** a single storage node is simulated to fail, **then** the media is still retrievable and restores **byte-intact** (checksum match) — confirmation never outlives the data.
10. **Given** any persisted media, **when** it is later served (in the timeline or a share link), **then** its URL is non-guessable and auth/expiry-protected (security baseline; enforced with US-3.3) — capture never produces a publicly guessable media URL.
11. **Given** an in-browser captured item that has not yet reached verified-persisted state, **when** the tab is closed, backgrounded, or reloaded, **then** the captured media is recoverable (buffered locally, e.g. IndexedDB) and the upload resumes/retries on return — the captured-but-unverified original is **never** discarded before AC-4 confirmation (in-browser equivalent of confirm-before-delete).
12. **Given** a multi-file event where some items fail, **when** the batch resolves, **then** the persistence signal consumed by US-1.1 distinguishes fully-persisted from partially-persisted, and the event is shown as fully saved **only when all attached items are verified-persisted**; a partially-persisted event surfaces the M failed items as retryable on the event itself and is **never** presented as fully saved.
13. **Given** an item that is retried or resumed (possibly multiple times), **when** it finally persists, **then** exactly **one** durable blob exists for that item (verified via a client-supplied upload key or content-addressed identity) and no orphaned partial blobs remain.
14. **Given** a resumable upload that is paused (tab backgrounded / connectivity lost), **when** the reaper runs, **then** it must **not** delete a partial that is still within the resumable-retention window; only partials with no resume activity past an explicit, documented abandonment threshold (which must exceed the resumable-resume window) are reaped, and a persisted (confirmed) item is **never** reaped (G2).

## Quality Scenarios (gated)
- **Media durability** `J2` — After upload confirmation, media survives a simulated storage-node failure and restores intact (checksum match).
- **Upload reliability on poor network** `J1 J2` — On a slow/unstable connection, an event fully persists or clearly fails with retry — never a silent partial save (success rate ≥ target).

## Non-Functional Requirements (deltas only)
- **Resumable transfer:** uploads survive a connection drop and resume; a single dropped chunk must not force a full re-upload of an already-transferred large video.
- **Capture acknowledgement:** capture/record start is acknowledged < 1s after the user action; the pending→persisted transition is always explicit (no frozen or ambiguous "is it done?" state). The local capture buffer is retained until verified persistence (in-browser confirm-before-delete; AC-11).
- **Large-media tolerance:** a large video upload that exceeds the typical fast-action budget must remain in a non-blocking pending state (the user can continue) and must still reach a verified-persisted state or a retryable failure — slowness is never converted into a silent drop.
- **Cost guard:** media is stored once per item (no duplicate/orphaned blobs from retries/resumes — verified per AC-13) to contain the `Storage/bandwidth cost blowout` risk; only partial uploads with no resume activity past an explicit, documented abandonment threshold — a threshold that **must exceed** the resumable-resume window — are reaped, and persisted (confirmed) items are **never** reaped (G2; AC-14).

## Edge & Negative Cases
- **Silent upload drop** (`QC risk`, J2 critical failure) — media never persists but event appears saved → impossible by construction: confirmation is gated on checksum-verified persistence (AC-3, AC-4).
- **Poor-network partial save** (J2) — ambiguous half-saved state with no retry → not allowed; surface a resumable, retryable failure (AC-5, AC-6).
- **Interrupted large video** — tab backgrounded / connection lost mid-transfer → resume from last chunk, never restart-from-zero or drop (AC-5, NFR resumable).
- **Unsupported / corrupt format** — fails fast with a clear message before upload; never a silent reject or a corrupt persisted file (AC-8).
- **Permanent data loss** (`QC risk`) — single storage-node failure must not lose a confirmed item; checksum restore verified (AC-9).
- **Duplicate/orphan blobs from retries** — retry/resume must not multiply stored copies (cost blowout); reconcile to one durable blob per item (NFR cost guard).
- **Capture→verified-persist loss window** — an in-browser captured item is the only copy until upload verifies; if the tab closes/backgrounds/reloads before AC-4 confirmation, the captured original must be locally buffered and recoverable on return, never discarded (AC-11).
- **Partially-saved event** (J2: "event looks saved but media is lost") — a multi-file event with some items failed must not be reported to US-1.1 as fully saved; the event surfaces the failed items as retryable and is shown saved only when all items are verified-persisted (AC-12).
- **Permission denial** (camera/mic) — must not block the upload path; the user can still attach via file upload (degradable capture, depends on US-0.2).
- **Confirmation outliving data** — a confirmed item that later fails durability is a contract breach; durability is verified at confirm time, not assumed (AC-9).

## Telemetry (content-blind)
- `media_upload_started` — when a capture/upload begins (structural only: source enum {capture, upload}, media_type enum, file_size_bucket). **No media bytes, no thumbnail, no content.**
- `media_upload_persisted` — on checksum-verified durable persistence (with media_type enum, was_resumed bool, duration_bucket).
- `media_upload_failed` — on failure (with failure_reason enum {network, timeout, unsupported_format, server, checksum_mismatch}, retry_offered bool).
- `media_upload_retried` — when the user retries a failed/partial item (with attempt_count).
- *(All events carry structural metadata only — never memory media, thumbnails, or content, per G4.)*

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] All gated quality scenarios pass (Sara-verified): *Media durability*, *Upload reliability on poor network*
- [ ] Global guardrails upheld: G1 (Me-Only default preserved, never widened by capture), G2 (no system-side destruction of persisted media; only abandoned partials reaped), G3/G4 (no content scanning; content-blind telemetry)
- [ ] Arabic/RTL reviewed (G6) — capture/upload/retry/error copy reviewed in Arabic, RTL layout correct
- [ ] Accessibility AA on the capture flow (US-0.4) — capture controls and voice recording screen-reader operable; voice notes support transcripts
- [ ] Telemetry events firing and verified content-blind
