# US-2.1 — Life Timeline browsing (year / month / day)

- **Epic:** Navigate (Core Value 2)
- **Priority:** 🔴 Load-bearing
- **MVP-blocking:** Yes
- **Journeys:** J4 (browse the Life Timeline — the "revisit" half of the bet)
- **Source:** QC → *Life Timeline browsing (year/month/day)* (🔴 High); QC scenarios *Timeline integrity*, *Scale performance*, *Cross-device consistency*; QC risk *Stale timeline / cache*; UJM → J4 steps 1–4; VQM → Core Value 2 → Life Timeline browsing
- **Depends on:** US-1.1 (timeline event creation — there must be events to browse)
- **Status:** Ready for build

## Story
As a **Multi-Generation Family member / Elderly Individual (any persona)**, I want to **open my timeline and move freely between year, month, and day views to find and re-experience any past event**, so that **revisiting my life is as effortless as adding to it** — because the bet only validates if people come *back* to navigate, not just dump media once.

## Context / Why this matters
Browsing is the "revisit" half of the critical assumption: the experiment needs proof that users return to navigate, not only to upload. A timeline that feels slow, gappy, or out-of-date silently kills the revisit habit and makes the bet read as "no demand" when the real failure is navigation quality. This story owns the structural trust of the record itself — correctness over years of data, performance as media accumulates, and the web-only consistency promise that what you added is what you see on every one of your sessions.

## Scope
**In scope (MVP):**
- Open the timeline from Home (J4 step 1) showing the user's events in chronological structure.
- Switch granularity **year → month → day** (and back), preserving the user's position in time across switches.
- Scroll and **jump** to any period; any period reachable in **under 4 clicks** (J4 target).
- Open an event from the timeline to view its **full media + details** (date, location, circle) — read view of an existing event.
- **Correctness** over a 10-year dataset: every event appears exactly once at its correct date — no gaps, no duplicates (owns *Timeline integrity*).
- **Performance** at scale: first meaningful screen **< 2s**; a 5,000+ event timeline loads its first screen within the target p95 (owns *Scale performance*).
- **Fresh-read consistency**: a newly added event (US-1.1) appears on another of the user's sessions/devices and after a refresh within the target window — a fresh-read / cache-invalidation property of browsing, **not** a separate sync feature (owns *Cross-device consistency*).

**Out of scope (deferred / roadmap):**
- Life Playback / auto-sequenced story (US-2.3).
- Export (US-1.4 / J4 step 5 — separate story).
- Editing events from the browse view beyond opening their detail (creation/edit lives in US-1.1).
- Search, AI summaries, and "On This Day" resurfacing (G9 — roadmap).
- Any browseable/indexed public surface (G1).
- Hijri-calendar date display (MVP shows Gregorian dates with Arabic-Indic numerals in Arabic locale; Hijri is a deliberate deferral, not an oversight).

## Acceptance Criteria
1. **Given** an authenticated user with at least one event, **when** they open the timeline, **then** the first meaningful screen renders **< 2s** and shows events in correct chronological structure with the default granularity.
2. **Given** the timeline is open, **when** the user switches granularity year → month → day (or any reverse), **then** the view updates to the selected granularity **and keeps the user anchored to the same point in time** (e.g. switching from "2021" down lands in 2021, not at "today").
3. **Given** any target period in the user's history, **when** the user navigates to it via scroll or jump controls, **then** that period is reachable in **under 4 clicks** from the open timeline.
4. **Given** an event shown on the timeline, **when** the user opens it, **then** the full event detail renders its media and metadata (date, location, privacy circle) for an event the user is permitted to see.
5. **Given** a dataset spanning ~10 years, **when** the user browses across year/month/day, **then** **every event the viewer is permitted to see appears exactly once at its correct date** — no missing permitted events and no duplicates, and **no event outside the viewer's circle ever appears** (*Timeline integrity*).
6. **Given** a timeline of **5,000+ events**, **when** the user opens it, **then** the first screen loads within **p95 < 2.5s on a mid-tier device** and granularity switching/scrolling stays responsive (no unbounded slowdown as media accumulates) (*Scale performance*).
7. **Given** the user adds an event in one web session/device (US-1.1), **when** they open or refresh the timeline in another of their sessions/devices, **then** the new event appears **within 10s of a confirmed write (or immediately on refresh)** with **identical media and metadata** — never a stale view that omits a just-confirmed event (*Cross-device consistency* / *Stale timeline*).
8. **Given** an empty or sparse range between events, **when** the user scrolls through it, **then** empty periods are represented without inventing, duplicating, or dropping any real permitted event (gaps are visual, never data loss); the absence of out-of-circle events is **never** rendered as a data gap implying loss (G1/G2).
9. **(RTL)** **Given** an Arabic locale, **when** the timeline and its granularity controls render, **then** chronological direction, navigation controls, and date labels are correct in RTL, and the **calendar and numeral system used for display and for jump controls match the locale convention** (MVP displays **Gregorian dates with Arabic-Indic numerals**; Hijri display is out of scope — see Out of scope), with an event's bucket/label internally consistent across year → month → day so a family can locate an event by the date they remember (G6).
10. **Given** an event the viewer is **not** permitted to see (outside their circles), **when** it would otherwise fall in a browsed period or is requested by direct event/detail URL, **then** it **never** appears on the timeline and the detail view returns a **not-permitted** state — never the media or metadata. Out-of-circle and Me-Only events are filtered at query/access time, not hidden client-side (G1).
11. **Given** an event the viewer may see whose media **fails to load or is still loading** (expired/invalid signed URL, cache miss, transient error), **when** it is shown on the timeline or opened, **then** the UI shows an explicit, recoverable **"temporarily unavailable — retry"** state that **never** implies the memory was deleted or lost; the event row/metadata still renders and a failed media load is visibly distinct from a real empty/sparse period (G2).

## Quality Scenarios (gated)
- **Timeline integrity** `J4` — Browsing year/month/day over a 10-year dataset returns correct, complete events for the viewer's permission set — no gaps or duplicates, and no out-of-circle event surfaced.
- **Scale performance** `J4 J5` — A timeline of 5,000+ events loads its first screen within **p95 < 2.5s on a mid-tier device**.
- **Cross-device consistency** `J2 J4` — An event added in one web session/device appears in another (and after refresh) **within 10s** with identical media and metadata.
- **Privacy enforcement (own-circle browse)** `J2 J3` — A Me-Only / out-of-circle item is unreachable by another account via the timeline UI **and** via direct event/detail URL; the browse query never over-returns another user's event.

## Non-Functional Requirements (deltas only)
- First meaningful timeline screen **< 2s** (matches global default; explicit here because this is a media-accumulation surface).
- Any period reachable in **under 4 clicks** from the open timeline (J4 navigation target).
- 5,000+ event timeline: first-screen load **p95 < 2.5s on a mid-tier device**; granularity switch and scroll remain interactive (no O(n) render that degrades with years of media).
- Fresh-read consistency: a confirmed write is visible on the user's other sessions/devices **within 10s**, and immediately on refresh (cache-invalidation property, not a sync feature).

## Edge & Negative Cases
- **Missing or duplicated events** — a real event absent from a view, or shown twice across granularities → the timeline feels untrustworthy and the revisit habit dies; must be impossible by construction (one event, one position).
- **Performance decay at scale** — load/scroll/switch slows as years of media accumulate → long-term engagement quietly erodes; enforce the 5,000+ event p95 target, not just a small-dataset budget.
- **Stale read / cache** — a newly added event doesn't appear on another session or after refresh → breaks the "single unified life system" promise; fresh reads must reflect confirmed writes within the target window (G2: a stale view must never imply lost media).
- **Date-boundary correctness** — events at year/month/day boundaries (e.g. 31 Dec → 1 Jan, month ends) must land in the correct bucket, including under timezone handling consistent with US-2.2.
- **Wrong-circle exposure** — a Me-Only or out-of-circle event leaking into another member's timeline view (or via direct event/detail URL) is a catastrophic, irreparable-trust failure; circles must be enforced at query/access time, never client-side hiding.
- **Media-load failure on open** — an event whose media cannot be retrieved (expired/invalid URL, cache miss, transient error) must be presented as a retryable "temporarily unavailable" state, never as a gap or loss; it must be visibly distinct from a real empty/sparse period (G2).
- **Sparse / empty ranges** — large gaps between events must render as empty periods without dropping or duplicating adjacent events.
- **Back-dated / future-dated events** (allowed by US-1.1) must appear at their chosen date, not their creation date.

## Telemetry (content-blind)
- `timeline_opened` — when the timeline view loads (with structural metadata only: event_count bucket, default_granularity). **No media, no note text** (G4).
- `timeline_granularity_changed` — when the user switches year/month/day (with from/to granularity enum).
- `timeline_period_jumped` — when the user jumps/scrolls to a period (with navigation_depth = clicks-to-reach).
- `timeline_event_opened` — when an event detail is opened from the timeline (structural only: has_media bool, media_type enum, circle enum).
- `timeline_first_screen_perf` — first-meaningful-screen latency bucket and event_count bucket (for the 2s / p95 scale gates).

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] All gated quality scenarios pass (Sara-verified): Timeline integrity, Scale performance, Cross-device consistency, Privacy enforcement (own-circle browse)
- [ ] Global guardrails upheld: G1 (no public/discoverable browse surface — own-circle browse only), G2 (a stale/empty view never implies destroyed media), G4 (content-blind telemetry)
- [ ] Arabic/RTL reviewed (G6) — chronological direction and date labels correct RTL
- [ ] Accessibility AA on the browse flow (US-0.4) — screen-reader operable navigation, critical for the Elderly segment
- [ ] Telemetry events firing and verified content-blind
