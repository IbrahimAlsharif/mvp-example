# US-1.4 — Guaranteed open-format export (full data portability)

- **Epic:** Preserve (Core Value 1)
- **Priority:** 🔴 Load-bearing
- **MVP-blocking:** Yes — un-backfillable (G5)
- **Journeys:** J4 (step 5 — request a full open-format export)
- **Source:** QC → *Guaranteed open-format export (full data portability)* (🔴 High, **MVP-blocking**); QC scenario → *Export completeness* `J4`; QC risks → *Long-term format & vendor lock-in*, *Legacy foreclosure (missing export or consent capture)*; VQM → Core Value 1 → Guaranteed open-format export (portability); guardrail G5
- **Depends on:** US-1.1 (event creation — the data being exported), US-3.1 (privacy circles — circle flags to export), US-4.1 (legacy consent capture — consent flags to export)
- **Status:** Ready for build

## Story
As a **Knowledge & Legacy Builder / any persona**, I want to **export my entire timeline — every photo, video, voice note, and all the metadata, privacy circles, and legacy-consent flags — in an open format, complete and intact**, so that **I can always take everything with me and my memories outlive the company** — because a timeline I cannot get out of is an unbacked legacy claim from day one.

## Context / Why this matters
Export is the user's **insurance** and the **only honest answer to "outlive the company"** at MVP (QC MVP Scope Decision 8). The category's real failure mode is vendor disappearance, not breach — so portability, not perpetuity-marketing, is the credible promise. Export is **MVP-blocking and un-backfillable (G5)**: it must ship for data created from day one, because data that predates the export feature can never be retroactively made portable in the form it was created. It is also the substrate that keeps the deferred inheritance promise honest (`Legacy foreclosure` risk) and must satisfy GDPR / Saudi-PDPL data-portability rights — which require media **and** metadata **and** the privacy/consent context, complete and intact.

## Scope
**In scope (MVP):**
- **Full-timeline export:** the user can request an export of their **entire** timeline.
- **Complete payload:** the export includes **all media** (photo/video/voice, byte-intact) **plus** for every event: text/notes, **date**, location, **privacy circle**, and **legacy-consent flags** (US-4.1) — nothing silently omitted.
- **Open format:** media in their original/standard file formats and metadata in an **open, documented, non-proprietary** format (e.g. JSON/CSV manifest + standard media files) — readable without Human Timeline Network and without vendor-specific tooling (defeats `Long-term format & vendor lock-in`). The two longevity claims are distinct: (a) the **metadata schema** is open and documented, and (b) **media format readability** — the manifest declares each item's media format/codec and, where an item is stored only in a non-archival capture format (e.g. HEIC, Live-Photo bundle, proprietary codec), the manifest **explicitly flags the format-longevity risk** so the gap is honest, not silent. The upstream guard is US-1.2's open/widely-renderable format allowlist at ingest; US-1.4 does not transcode (media transcoding is roadmap per US-1.2) but must not silently inherit an un-flagged format gap.
- **Integrity verification:** the export includes a **manifest with per-item checksums** and a declared item count, so the user (and Sara) can verify the archive is complete and byte-intact; a verification step confirms exported = expected.
- **Resumable / never-silently-incomplete:** a large or interrupted export is **resumable**; a partial or failed export is **clearly reported as incomplete with a retry/resume affordance** and is **never presented as complete** when it is not.
- **Owner-scoped (not view-scoped):** an export contains only what the requesting owner is entitled to export (their own timeline and the items they own) — export respects the same access boundaries as the app (no out-of-circle data leaking into an export). The export bytes/metadata contain **only items the owner owns** (see AC-7a). For shared/co-contributed Family-circle content the owner can *see* but does not *own*, the export includes a **content-blind manifest record** of its presence — an **item-id / owner-reference stub only, with no media bytes and no metadata values** of the other account — so nothing is silently missing from the owner's view (see AC-7b); the user is told the export is owner-scoped, not view-scoped, so the omission is honest, not silent (G1). The content-blind manifest record also keeps a future whole-family consolidated export un-foreclosed (roadmap; G5 spirit).
- **Secure delivery:** the export artifact is delivered over a non-guessable, auth/expiry-protected link (security baseline; no public-CDN leakage of the archive).
- **Honest family-held durability hand-off:** at export completion the user is shown an honest note framing this as the start of family-held durability, not a one-time download — e.g. *"This is your own permanent copy — store it in at least two places (e.g. a second drive and a cloud you control) to keep it safe for the long term."* This is copy/framing only (no escrow or perpetual-storage mechanism — that stays roadmap), because the owner may not be able to re-export later.

**Out of scope (deferred / roadmap):**
- Import-back / restore-from-export and account migration tooling (export-out is the MVP guarantee; round-trip import is roadmap).
- Escrow / off-platform release / perpetual-funding "outlive the company" mechanisms beyond export (roadmap, with inheritance — QC Scope Decision 8).
- Account handoff / heir release of the export (J8 deferred, G9) — export captures consent flags so heir release stays *possible later*, but performs no release now.
- Scheduled/automatic periodic exports (MVP is on-demand, user-initiated).
- Selective/partial export by date range or circle (MVP guarantee is the **full** timeline; scoped export is a later convenience).
- **Whole-family / co-contributor consolidated export** (a complete archive of a shared Family-circle timeline spanning multiple owners) is **roadmap** — MVP export is **per-owner**. The content-blind manifest record (above) keeps this future-possible by logging presence, but families should be told the MVP export is one member's slice, not the whole family record.

## Acceptance Criteria
1. **Given** an authenticated owner on the timeline (J4 step 5), **when** they request an export, **then** the system begins a **full-timeline** export job covering every event they own and shows progress.
2. **Given** a completed export, **when** the user inspects it, **then** it contains **all media** (every photo/video/voice byte-intact) **and** for each event its text/note, date, location, **privacy circle**, and **legacy-consent flag** — verified against the live timeline with **no silent omissions**.
3. **Given** the export payload, **when** opened outside the product, **then** media are in standard/original formats and metadata is in an **open, documented, non-proprietary** structure readable without any vendor-specific tooling (G5; defeats format lock-in).
4. **Given** a completed export, **when** the user verifies it, **then** the archive includes a **manifest with per-item checksums and a declared item count**, and a verification confirms **exported item count = expected timeline count** and **every checksum matches** — proving completeness and integrity.
5. **Given** a very large archive, **when** the export runs, **then** it completes without truncation; if interrupted, it **resumes** and still produces a complete, checksum-verified archive — large size never silently yields a partial archive.
6. **Given** an interrupted or failed export, **when** the failure is detected, **then** the export is **clearly reported as incomplete** with a retry/resume affordance and is **never presented as a complete export** (no "done" over an incomplete archive).
7a. **Given** the export, **when** assembled, **then** the export bytes/metadata contain **only items the owner owns** — no out-of-circle media and **no other-account owned media or metadata values** are ever included (G1).
7b. **Given** a Family item the owner can *see* but does not *own*, **when** the export is assembled, **then** the manifest includes a **content-blind presence stub** (item-id / owner-reference only — **no media bytes, no metadata values**) clearly labeled as owner-scoped-not-view-scoped, and the user is told the export is owner-scoped — so the omission is honest, not silent (G1).
8. **Given** a finished export artifact, **when** it is delivered, **then** the download link is **non-guessable and auth/expiry-protected** — the archive is never reachable via a public/guessable URL (security baseline).
9. **Given** the GDPR / Saudi-PDPL portability requirement, **when** an export is produced, **then** it is a complete, intact, machine-readable copy of the user's personal data (media + metadata + circle + consent), satisfying the data-portability right.
10. **Given** the export feature ships in MVP, **when** any event/media/consent is created from day one, **then** that data is exportable in this open format (G5 — export is not added later for data created before it existed).
11. **Given** an export job, **when** it runs (including a long-running/resumable job), **then** completeness is verified against a **defined point-in-time snapshot** of the owner's timeline as of job-start (a snapshot timestamp / item-version set), and events created or modified after that point are **out of scope for that run and explicitly NOT counted as a shortfall** — so the count+checksum oracle (AC-4) cannot false-fail or false-pass on a concurrent edit.
12. **Given** an export job that fails, is interrupted, or is resumed (AC-5/AC-6), **when** it ends in any state, **then** **no source media, metadata, circle, or consent flag is deleted, mutated, moved, or locked** — the export is **strictly read-only** against the owner's timeline (G2).
13. **Given** the export, **when** opened, **then** the manifest **declares each media item's format/codec**, and where an item is stored only in a non-archival capture format (e.g. HEIC, Live-Photo bundle, proprietary codec) the manifest **explicitly flags the format-longevity risk** so the longevity gap is honest, not silent (US-1.2 open-format allowlist is the upstream guard; US-1.4 does not transcode).

## Quality Scenarios (gated)
- **Export completeness** `J4` — A user can export the full timeline (media + metadata + circle + consent flags) in an open format, complete and intact. **MVP-blocking.**

## Non-Functional Requirements (deltas only)
- **Integrity-verifiable:** the export ships a checksum manifest + item count; a post-export verification proves byte-intact completeness (no relying on "it looked done").
- **Resumable large archives:** export of a very large timeline is resumable at the item/chunk level — an interrupted export never restarts from zero and never silently finishes short.
- **Completeness-or-fail:** an export either is provably complete (count + checksums match) or is reported incomplete with a resume path — there is no intermediate "complete but actually missing items" state.
- **Point-in-time completeness oracle:** the "expected" set is a **frozen point-in-time snapshot** of the owner's timeline as of job-start (snapshot timestamp / item-version set); the count+checksum oracle compares the archive against that frozen set, so a concurrent add/edit/re-circle during a long-running export neither false-fails a complete export nor false-passes over a change (AC-11).
- **Open-format longevity:** the metadata schema is documented and self-describing so the archive remains readable for the long term independent of the company's existence (this is the un-backfillable longevity guarantee). This covers the **metadata schema**; **media-format readability** is a distinct claim — the manifest declares each item's format/codec and flags non-archival capture formats so any media-longevity gap is honest, not silent (AC-13).

## Edge & Negative Cases
- **Silent incomplete export** (`Export completeness` failure, J4 critical failure) — an archive missing media/metadata/consent flags presented as complete → impossible: completeness is checksum + count verified, and any shortfall is reported, not hidden (AC-4, AC-6).
- **Long-term format & vendor lock-in** (`QC risk`) — a closed/proprietary export format that still ties the user to the vendor → forbidden; format must be open and documented (AC-3).
- **Legacy foreclosure** (`QC risk`, G5) — shipping memories with no export silently and un-backfillably forecloses the inheritance promise → export is MVP-blocking and must include consent flags so heir release stays possible later (AC-2, AC-10).
- **Very large archive** — must not truncate or time-out into a partial; resumable to a verified-complete archive (AC-5, NFR resumable).
- **Interrupted export** — connection/job drop → resume, never silently finish short, never mark a partial as done (AC-5, AC-6); a failed/interrupted/resumed job is **strictly read-only** and leaves every source memory, metadata, circle, and consent flag byte-identical and untouched — no partial-assembly/cleanup step may ever delete, mutate, or lock source media (G2, AC-12).
- **Concurrent timeline edit during export** — the user (or a co-contributor) adds, edits, or re-circles an event while a long-running export runs → completeness is judged against the frozen job-start snapshot, so the change is out of scope for that run and is **not** counted as a shortfall; the oracle does not false-fail or false-pass (AC-11, NFR point-in-time oracle).
- **Media-format longevity gap** — a memory stored only in a non-archival capture format (HEIC, Live-Photo bundle, proprietary codec) exports with a pristine manifest but media a grandchild may not be able to open → the manifest must declare the format and flag the longevity risk so the gap is honest, not silent (AC-13).
- **Single stale/lost export copy** — a family treats the export as a one-time download and keeps one un-refreshed copy, recreating a single-point-of-loss → the product frames export as the start of family-held durability (keep 2+ copies in 2 places), because the owner may not be able to re-export later (Scope hand-off note).
- **Out-of-scope data leak** — export must never include items the owner is not entitled to, nor leak another account's data into the archive (AC-7).
- **Insecure artifact exposure** — export download link must be non-guessable and auth/expiry-protected; a leaked archive is a full-timeline breach (AC-8).
- **Missing consent/circle flags in payload** — an export lacking circle or legacy-consent metadata is incomplete by definition (un-backfillable foreclosure) → must fail the completeness check (AC-2, AC-4).

## Telemetry (content-blind)
- `export_requested` — when the user starts an export (structural only: expected_item_count, archive_size_bucket). **No media, no metadata values, no content.**
- `export_completed` — on a verified-complete export (exported_item_count, checksum_verified bool, was_resumed bool, duration_bucket).
- `export_failed` — on failure (failure_reason enum {network, server, timeout, integrity_check}, retry_offered bool, resumable bool).
- `export_integrity_verified` — when the count + checksum verification runs (expected_count, exported_count, all_checksums_match bool).
- *(All events carry structural counts/metadata only — never memory media, metadata values, or content, per G4.)*

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] All gated quality scenarios pass (Sara-verified): *Export completeness* (MVP-blocking)
- [ ] Global guardrails upheld: G5 (export ships in MVP and is un-backfillable; consent + circle flags included), G1 (export respects circle boundaries; no out-of-circle data), G2 (export never deletes or mutates source memories), G4 (content-blind telemetry)
- [ ] GDPR / Saudi-PDPL data-portability satisfied (complete, intact, machine-readable copy)
- [ ] Arabic/RTL reviewed (G6) — export request, progress, completeness/failure, and verification copy reviewed in Arabic, RTL layout correct
- [ ] Accessibility AA on the export flow (US-0.4) — request, progress, and result states screen-reader operable
- [ ] Telemetry events firing and verified content-blind
