# US-1.3 — Dated bulk import (existing photos/videos, EXIF backfill)

- **Epic:** Preserve (Core Value 1)
- **Priority:** 🔴 Load-bearing
- **MVP-blocking:** Yes
- **Journeys:** J1 (step 3 — optional dated bulk import during onboarding)
- **Source:** QC → *Dated bulk import (existing photos/videos, EXIF date backfill)* (🔴 High); QC scenario → *Bulk import integrity & date backfill* `J1`, *Cross-device consistency* (imported items surface on a fresh read of the user's other sessions); QC risks → *Empty-timeline cold start*, *Silent upload drops* (compounded at bulk scale), *Mass mis-circle on import*, *Stale timeline*; UJM → J1 step 3 + its critical failure points; VQM → Core Value 1 → Dated bulk import
- **Depends on:** US-1.2 (media capture & upload — reuses its durable upload contract at scale), US-3.1 (privacy circles — supplies the Me-Only default), US-4.1 (per-item legacy consent — supplies the consent-capture contract reused at bulk scale, G5), US-1.4 (open-format export — imported/corrected/fallback dates must round-trip, G5)
- **Status:** Ready for build

## Story
As a **Family Archivist / Parent (any persona, in their first session)**, I want to **select many existing photos and videos at once and have them land on a navigable timeline at their original capture dates**, so that **I reach a populated, valuable timeline immediately instead of staring at an empty canvas** — because for a timeline product the aha is *density*, and the empty-timeline cold start is the way the bet fails for UX, not demand.

## Context / Why this matters
Dated bulk import is the **highest-leverage activation lever** in the MVP: it solves `Empty-timeline cold start` by seeding a populated, navigable timeline in the first session (J1 step 3). Without it, low monthly Events-Added can read "no demand" when the real failure is a blank canvas — corrupting the experiment's core learning. But a first-session bulk import is also the worst-case moment for two catastrophes: a `Mass silent drop` (import "succeeds" but media is lost) and a `Mass mis-circle` (private family photos exposed beyond Me Only). This story therefore co-designs import with the Me-Only default (G1), a content-blind/no-scan posture (G3/G4), confirm-before-delete, and bulk drop-protection — the safeguards that let the activation lever fire without becoming a trust-collapse event.

## Scope
**In scope (MVP):**
- **Select many existing files at once** (photos + videos) for import from the device.
- **EXIF date backfill:** each imported item is placed on the timeline at its **original capture date** read from EXIF/metadata, producing a navigable, correctly-ordered timeline (not "all dated today").
- **Graceful date fallback:** when EXIF capture date is missing or unparseable, apply a defined, transparent fallback (e.g. file modified-date, else flagged for the user to set) — the item is **never silently dropped** for lacking a date.
- **Me-Only by default (G1):** every imported item defaults to **Me Only**, with no path that imports straight to a wider circle.
- **Per-item legacy consent at ingest (G5):** every imported item records per-item legacy-consent metadata per US-4.1 at creation (defaulting to the same not-yet-released posture as a single captured event) — never backfilled. No imported item is created without a consent record.
- **EXIF geolocation minimization:** imported items do **not** inherit a default-visible GPS location; embedded location metadata is stripped or stored non-default-visible at ingest (geolocation OFF by default, per AADC/UK Children's Code) — ingest is the only moment this can be minimized.
- **Content-blind, no scanning (G3/G4):** import runs with **no automated content scan** of media and **no auto-flag/auto-ban**; telemetry is content-blind.
- **Bulk drop-protection / reconciliation receipt:** the import produces a reconciliation where **N selected = N imported + N failed**, accounted item-by-item; the user is shown the receipt and can retry failed items. No item silently vanishes between selection and timeline.
- **Durable persistence at scale:** each item is persisted via the US-1.2 durable-upload contract (checksum-verified, resumable, never optimistic-confirmed).
- **Confirm before delete (G2):** if the flow ever offers to remove source/duplicate items, deletion happens **only after explicit, confirmed user action** — never as an automatic side effect of import.
- **Duplicate detection:** detect likely duplicates (already-imported items) and surface them for the user to skip/keep, rather than blindly creating doubles on the timeline.

**Out of scope (deferred / roadmap):**
- The single-event capture/compose flow (US-1.1) and the underlying upload mechanics (US-1.2 — reused, not redefined here).
- Importing from third-party cloud services (Google Photos, iCloud, etc.) — MVP is device-file selection only.
- AI tagging/grouping/face detection or any content analysis of imported media (roadmap; would violate G3/G4 at MVP).
- Bulk privacy-circle assignment to anything other than the Me-Only default (circle changes happen later via US-3.1/J3, never widening on import).

## Acceptance Criteria
1. **Given** a user (typically in J1 step 3), **when** they choose dated bulk import and select many photos/videos, **then** all selected items are accepted into a single import job with a visible total count (N selected).
2. **Given** items with valid EXIF capture dates, **when** import completes, **then** each item appears on the timeline at its **original capture date**, correctly ordered — not all stamped "today".
3. **Given** an item with a missing, unparseable, **or implausible** EXIF date (e.g. epoch/1970 from an unset camera clock, or a future date), **when** it is imported, **then** the defined fallback date is applied and the item is **flagged for the user to correct** via the same correction path — the item is **imported, never dropped**, and an obviously-bad date is never silently treated as authoritative ordering.
4. **Given** any imported item, **when** it lands on the timeline, **then** its privacy circle is **Me Only** (G1) with no import path producing a wider default.
5. **Given** the import job, **when** it runs, **then** **no automated content scan** is performed on the media and **no auto-flag/auto-ban** can occur (G3); analytics captures structural counts only, never media or content (G4).
6. **Given** an import of N selected items, **when** the job finishes, **then** the user is shown a **reconciliation receipt** proving **N selected = N imported + N failed + N duplicate-skipped**, item-accounted, with failed items listed and retryable and duplicate-skipped items distinguished (and un-skippable) — no item is silently lost or read as a silent drop (bulk drop-protection).
7. **Given** any imported item reported as imported, **when** verified, **then** it is **durably persisted** via the US-1.2 contract (checksum-verified) — a "mass silent drop" where the receipt says imported but media is gone is impossible by construction.
8. **Given** a partial failure (network loss, some items fail mid-job), **when** connectivity returns or the user retries, **then** already-persisted items are **not re-imported or duplicated**, and only the failed items are retried.
9. **Given** items whose **content checksum matches an item already persisted on the user's timeline** (the same checksum contract used by US-1.2), **when** detected during import, **then** the user is shown the matches and chooses to skip or keep them; detection is **checksum-based** (content-blind, G4), works **across sessions/devices** against already-persisted items (server-side, not per-job), and a non-matching item is **never** silently discarded as a "duplicate".
10. **Given** any option to delete source/duplicate items, **when** offered, **then** deletion proceeds **only after an explicit, confirmed user action** (G2) — import never deletes anything automatically.
11. **Given** thousands of files in one selection, **when** imported, **then** the job remains tractable (progress shown, cancellable/resumable) and still produces a complete, item-accounted reconciliation receipt.
12. **Given** a bulk import job, **when** items are persisted, **then** each imported item records **per-item legacy-consent metadata** per US-4.1 (defaulting to the same not-yet-released posture as a single captured event) — no imported item is created without a consent record (G5, un-backfillable).
13. **Given** imported items whose source media carries embedded GPS/EXIF location, **when** they are persisted, **then** location metadata is **stripped or stored non-default-visible** at ingest — no imported item inherits a default-visible GPS location (geolocation OFF by default).
14. **Given** a completed bulk import on one session/device, **when** the user opens or refreshes the timeline on another of their sessions/devices, **then** all reconciled-as-imported items appear at their correct (EXIF/fallback/corrected) dates with identical media and metadata within the consistency target window — no item shown as imported is missing on a fresh read (CONVENTIONS §2 consistency).
15. **Given** an imported item with a fallback or user-corrected date, **when** US-1.4 open-format export runs, **then** the item and its **effective capture date** are exported with the corrected/fallback date preserved (not reverted to raw EXIF or import-day) — the date correction is a durable, exportable fact, not display-only (G5, un-backfillable).

## Quality Scenarios (gated)
- **Bulk import integrity & date backfill** `J1` — Importing N existing photos/videos preserves original capture dates (EXIF) onto a navigable timeline, defaults every item to Me Only, runs content-blind (no scanning), and never silently drops items at scale.
- **Upload reliability on poor network** `J1 J2` — On a slow/unstable connection, an event fully persists or clearly fails with retry — never a silent partial save (success rate ≥ target). *(Applied here at bulk scale — a poor connection mid-import must yield a retryable receipt, never a silent mass drop.)*

## Non-Functional Requirements (deltas only)
- **Bulk scale:** import must handle a selection of **thousands of files** without silently truncating the selection or losing items; the reconciliation count must equal the original selection count exactly.
- **Resumable at batch level:** a bulk job interrupted partway resumes/retries only the unfinished items (building on US-1.2's resumable transfer) — no full restart, no duplicate persistence.
- **Reconciliation integrity:** the receipt is the source of truth — `N selected = N imported + N failed` must hold with zero unaccounted items; any item not provably imported is reported as failed (fail-visible, never fail-silent).
- **Cost guard:** retried/resumed items must not create duplicate stored blobs (controls the import-amplified `Storage/bandwidth cost blowout` risk).

## Edge & Negative Cases
- **Mass silent drop** (`QC risk`, J1 critical failure) — import reports success but media is lost at scale → impossible: every "imported" item is checksum-verified persisted and the receipt is item-accounted (AC-6, AC-7).
- **Mass mis-circle on import** (`QC risk`, J1 critical failure) — imported items exposed beyond Me Only → impossible: every item defaults to Me Only with no wider-default path (AC-4, G1).
- **Empty-timeline cold start** (`QC risk`, J1) — the very failure this story exists to prevent; a successful import must leave a *navigable, dated* timeline, not an undifferentiated dump (AC-2).
- **Missing / garbage EXIF** — no date or corrupt metadata → defined fallback + flag, item still imported (AC-3); never dropped for a bad date.
- **Thousands of files** — large selection must not be silently truncated; count integrity holds (NFR bulk scale, AC-11).
- **Partial failure mid-job** — network loss partway → retry only failed items, no duplication of persisted ones (AC-8, NFR resumable).
- **Duplicate detection** — re-importing the same library must not silently double the timeline (AC-9); AC-8 covers **intra-job retry idempotency** (already-persisted items in *this* job not re-imported) while AC-9 covers **cross-session/device re-import** of a previously-imported library, both keyed on the US-1.2 content checksum.
- **Accidental source deletion** — import must never auto-delete source/duplicate files; only explicit confirmed deletion (AC-10, G2).
- **CSAM false-positive trigger** — a first-session bulk import is the worst-case auto-ban trigger; MVP posture is **no proactive scan, no auto-ban** (G3) — import must not invoke any scanning/flagging pipeline (AC-5).
- **Camera-roll GPS leak** — bulk import must not silently carry precise home/school/clinic coordinates into stored items as default-visible metadata; location is minimized at ingest (AC-13).
- **Stale fresh-read after import** — receipt says N imported on the laptop but the timeline reads empty/partial on the user's phone browser → forbidden; reconciled items must surface on a fresh read of any of the user's sessions within the consistency window (AC-14).
- **Arabic-locale date entry/ordering** — fallback dates and the user date-correction control must render unambiguously RTL, accept Arabic-Indic numerals, and present locale-correct dates; timeline ordering must remain correct for Arabic-locale imports (G6) — a Gregorian/LTR-only correction path must not mis-order or reject a valid date.

## Telemetry (content-blind)
- `bulk_import_started` — when an import job begins (structural only: selected_count, has_video bool). **No media, no filenames' content, no thumbnails.**
- `bulk_import_completed` — on job finish (imported_count, failed_count, exif_date_count, fallback_date_count, duplicate_skipped_count).
- `bulk_import_item_failed` — per failed item (failure_reason enum {network, persistence, unsupported, checksum_mismatch}, retry_offered bool) — structural only.
- `bulk_import_reconciled` — when the reconciliation receipt is shown (selected_count, imported_count, failed_count; asserts selected = imported + failed).
- *(All events carry structural counts/metadata only — never memory media, filenames-as-content, content, or any captured geolocation, per G4.)*

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] All gated quality scenarios pass (Sara-verified): *Bulk import integrity & date backfill*, *Upload reliability on poor network* (at bulk scale)
- [ ] Global guardrails upheld: G1 (every item Me-Only by default), G2 (no auto-delete; confirm-before-delete only), G3 (no proactive scan / no auto-ban on import), G4 (content-blind telemetry), G5 (per-item legacy consent at ingest + corrected/fallback dates round-trip through US-1.4 export; both un-backfillable)
- [ ] Arabic/RTL reviewed (G6) — import progress, reconciliation receipt, duplicate/fallback prompts reviewed in Arabic, RTL layout correct
- [ ] Accessibility AA on the import flow (US-0.4) — selection, progress, and reconciliation receipt screen-reader operable (critical for the Elderly persona at first run)
- [ ] Telemetry events firing and verified content-blind
