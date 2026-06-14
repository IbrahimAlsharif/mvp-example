# US-2.3 — Life Playback (timeline as a continuous story)

- **Epic:** Navigate (Core Value 2)
- **Priority:** 🟠 Supporting
- **MVP-blocking:** No
- **Journeys:** J5 (watch Life Playback)
- **Source:** QC → *Life Playback (timeline as a continuous story)* (🟠 Moderate); QC scenario *Playback performance*; UJM → J5 steps 1–4 + failure points; VQM → Core Value 2 → Life Playback (Tech: stalls/buffering; Trust: playback surfaces content outside the viewer's circle)
- **Depends on:** US-2.1 (timeline browsing — a populated, navigable timeline to play), US-3.1 (privacy circles — playback must respect circles), US-3.2 (circle-change propagation — playback must honor downgrades after a playback was built/shared), US-3.3 (auth/expiry-protected media URLs and link revocation for shared playbacks)
- **Status:** Ready for build

## Story
As a **Family Archivist / Multi-Generation Family member**, I want to **replay a span of life as a continuous, auto-sequenced story — "one year in 10 seconds" — and pause, scrub, and share it**, so that **revisiting becomes a delightful, shareable moment that pulls me and my family back** — without that showcase moment ever surfacing a memory outside the viewer's permitted circle.

## Context / Why this matters
Life Playback is the signature "magic moment" and a strong retention pull for the revisit half of the bet — though events can be logged without it, which is why it is supporting, not load-bearing. Its value is fragile in two ways: stalls/buffering on long spans make the delight moment fall flat (Tech), and — most critically — if playback ever includes content outside the viewer's circle, the showcase moment becomes a privacy breach at the worst possible time (Trust). Privacy correctness here is non-negotiable.

## Scope
**In scope (MVP):**
- **Choose a span** (J5 step 1): year / decade / whole life, entered from the timeline ("Play life" / period playback).
- **Auto-sequenced playback** (J5 steps 2–3): events play in chronological order as a continuous story ("one year in 10 seconds" pacing).
- **Playback controls** (J5 step 4): pause, scrub (seek within the span), and **share the playback** — with sharing respecting privacy circles. The owner can **revoke a shared playback link**; revoked/expired links no longer grant access (delegates to US-3.3 link revocation — no indefinite open bearer link).
- **Performance:** playback **starts < 3s** and **runs without stalls on a mid-tier device** (owns *Playback performance*).
- **Privacy (CRITICAL):** playback **NEVER includes any content outside the viewer's permitted circle** — the sequence is built from only the circle-permitted events for the current viewer; a shared playback shows each viewer only what their circle permits.

**Out of scope (deferred / roadmap):**
- AI-generated narration, summaries, music/auto-editing, or "smart highlights" (G9 — roadmap; no AI feature ships before the AI safety harness).
- "On This Day" / resurfacing-driven playback (G9 — roadmap).
- Export/download of the rendered playback as a video file (export of *data* is US-1.4; rendering a downloadable film is not MVP).
- Any discoverable/public playback surface — sharing is via unlisted link only (G1, US-3.1).

## Acceptance Criteria
1. **Given** a populated timeline (US-2.1), **when** the user opens playback and chooses a span (year / decade / whole life), **then** an auto-sequenced playback of that span's events is prepared and **starts playing within 3s**.
2. **Given** playback is running, **when** it plays through the span, **then** events appear in **correct chronological order** at the "continuous story" pacing, with no out-of-order frames.
3. **Given** playback is running, **when** the user pauses or scrubs to a point in the span, **then** playback pauses/seeks responsively and resumes from the chosen point without losing sequence integrity.
4. **Given** a span on a **mid-tier device**, **when** the user watches it through, **then** playback **runs without stalls/buffering** to completion (within the target stall budget) — including long spans (decade / whole life).
5. **(CRITICAL privacy)** **Given** the viewer's permitted circles, **when** a playback is built and played, **then** it **includes only events the viewer is permitted to see** — no Me-Only/Family/out-of-circle content ever appears in the sequence (verify with a second account whose circle differs).
6. **Given** the owner shares a playback (J5 step 4), **when** another permitted person views the shared playback, **then** that viewer sees **only the events their own circle permits** — sharing the playback never widens access beyond each viewer's circle, and the share link is unlisted/non-discoverable (G1, US-3.1) with auth/expiry-protected media URLs (US-3.3).
7. **Given** a span where some events have **missing, still-processing, or undated media**, **when** playback runs, **then** the sequence handles them gracefully (skip/placeholder) without breaking the story or stalling, and never inserts a duplicate or out-of-circle item to fill a gap.
8. **(RTL)** **Given** an Arabic locale, **when** playback and its controls render, **then** (a) the time axis advances in a defined, consistent direction matched to the RTL scrubber (timeline progresses from past to future as the scrub handle moves, direction verified by an Arabic reviewer), (b) year/date labels render in Arabic numerals and the locale-appropriate calendar (Gregorian at MVP; Hijri-ready not foreclosed), and (c) control layout, seek direction, and progress/elapsed indicators read correctly RTL (G6).
9. **(CRITICAL privacy — propagation)** **Given** an event is downgraded out of a viewer's circle **after** a playback was built or shared, **when** that viewer (or any holder of the shared link) next opens the playback — or if the downgrade occurs while a playback is running or already buffered/prefetched for that viewer — **then** the downgraded event is excluded server-side within US-3.2's propagation window, any prefetched copy is invalidated and not rendered for the remainder of the session, and the prior viewer can no longer reach it via the playback or its media URLs (no stale inclusion).
10. **(CRITICAL privacy — share lifecycle)** **Given** the owner revokes a previously-shared playback (or the link expires), **when** any holder of that link opens it, **then** access is denied server-side (the link no longer authorizes the playback or its media URLs, US-3.3); and **when** events in the span are later deleted (confirmed user action, G2) or fall out of a viewer's circle, **then** the re-resolved playback for that viewer omits them and shows a coherent or clearly-empty playback — never a stale or broken frame.
11. **(G2 non-destructive)** **Given** a playback is built, played, paused, scrubbed, shared, and abandoned (including a failed or re-run playback-build/transcode job), **when** the underlying timeline events are re-opened in J4, **then** every source media item is intact and unmodified (checksum match) and none is deleted, evicted, or locked — playback uses read-only/derived assets only, and any derived/transcoded playback asset is stored content-blind (G2, G4).

## Quality Scenarios (gated)
- **Playback performance** `J5` — A 1-year timeline playback starts within target seconds and runs without stalls on a mid-tier device.
- **Privacy enforcement** `J2 J3` — A "Me Only" item is unreachable by any other account via UI *or* direct/API URL (verify with a second account). *(Applied to playback: an out-of-circle event must never appear in any viewer's playback sequence or be reachable via its media URLs; playback derived assets are non-destructive — source media is provably untouched, checksum-verifiable.)*
- **Circle-change propagation** `J3` — An event downgraded after a playback was built/shared is excluded from that viewer's playback (and unreachable via its media URLs) within US-3.2's propagation window, including invalidation of any prefetched/buffered copy.

## Non-Functional Requirements (deltas only)
- Playback **starts < 3s** after the span is chosen (overrides the 2s first-screen default for this media-sequencing surface).
- Runs **without stalls on a mid-tier device** within the target stall budget, including long spans (decade / whole life) — long-span buffering is a first-class case, not an edge.
- Scrub/seek and pause acknowledged within the global primary-action budget (< 1s).
- Circle-filtering of the playback sequence is enforced **server-side per viewer**, not by client-side hiding (privacy is enforced, not merely visual). Any client-side prefetched/buffered upcoming frames for an event downgraded mid-stream must be invalidated and never rendered, within US-3.2's circle-change-propagation target window.
- Shared playback links are **unlisted, auth-protected, and expiry/revocation-capable per US-3.3** — no indefinite open bearer link; revocation takes effect server-side.

## Edge & Negative Cases
- **Long-span buffering** — decade / whole-life playback stalls or buffers → the signature magic moment falls flat; enforce the no-stall budget across long spans (prefetch/sequence so it does not degrade with span length).
- **Out-of-order or missing media** — a frame out of chronological order or a missing/processing item makes the story feel broken → sequence must stay ordered and skip/placeholder gaps gracefully.
- **Out-of-circle leak (CRITICAL)** — playback (own or shared) surfacing an event outside the viewer's circle is a privacy breach during the showcase moment → must be impossible by construction; sequence is built per viewer from circle-permitted events only, enforced server-side.
- **Shared playback over-exposure** — a shared playback must not reveal to a viewer events their circle does not permit, and must not widen access; each viewer's sequence is filtered to their own permissions.
- **Circle change mid-life of a playback** — if an event's circle is downgraded after a playback was built or shared, subsequent views must reflect the new permission, enforced via US-3.2 server-side per-access re-check; no stale inclusion beyond US-3.2's target propagation window. If the downgrade occurs while a playback is running or already prefetched/buffered for a viewer, the affected event must stop rendering for the rest of the session and any prefetched copy must be invalidated within that window (filter is enforced server-side, not by stale client buffer).
- **Un-revoked / stale shared link** — a shared playback is a durable bearer artifact; an un-revocable link is a standing exposure surface, and a share that resolves stale content after edits contradicts per-viewer re-filtering → the owner must be able to revoke the link (US-3.3), revoked/expired links deny access server-side, and a re-resolved share never surfaces deleted or now-out-of-circle events (no stale/broken frame).
- **Empty/sparse span** — a chosen span with too few permitted events must produce a coherent (or clearly empty) playback, never an error or a leak from outside the span/circle.

## Telemetry (content-blind)
- `playback_started` — when playback begins (structural only: span_type enum {year, decade, life}, event_count bucket, start_latency bucket). **No media, no content** (G4).
- `playback_completed` — when a playback reaches the end (with stall_count bucket for the performance gate).
- `playback_control_used` — when pause/scrub is used (control enum).
- `playback_shared` — when a playback is shared (with circle enum; share is unlisted-link only). **No recipient PII as content.**
- `playback_share_revoked` — when the owner revokes (or the link expires for) a previously-shared playback (structural only: reason enum {revoked, expired}). **No recipient PII, no content** (G4).
- `playback_stall_detected` — on a buffering/stall event (structural only: span_type, position bucket) — feeds the no-stall budget.

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] All gated quality scenarios pass (Sara-verified): Playback performance; Privacy enforcement applied to playback (no out-of-circle content, verified with a second account)
- [ ] Global guardrails upheld: G1 (sharing = unlisted link only, no discoverable playback surface), G2 (playback never deletes/locks the underlying media), G4 (content-blind telemetry), G9 (no AI narration/summaries at MVP)
- [ ] Arabic/RTL reviewed (G6) — time-axis direction, seek direction, controls, and date/numeral rendering verified by an Arabic reviewer
- [ ] Accessibility AA on the playback flow (US-0.4) — controls operable, voice notes have transcripts
- [ ] Telemetry events firing and verified content-blind
