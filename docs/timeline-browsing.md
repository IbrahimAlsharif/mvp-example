# Timeline Browsing — Granularity, Jump, Media-Error (US-2.1)

The timeline is the "place" dimension that differentiates this product from a
photo gallery. This story makes it navigable at explicit granularities and
resilient to media-load failures.

## Granularity with anchor preservation (AC-2/AC-3)

`src/lib/timeline/granularity.ts` holds the pure window math:

- `windowFor(g, anchor)` centers the visible window on an anchor instant; the
  span tightens/widens with the granularity but the anchor stays at the centre.
- `switchGranularity(window, to)` re-derives the window for a new granularity
  **around the same centre** — so switching year → day lands at the same point
  in time, not at "today".
- `jumpTo(dayKey, g)` recenters on a target day (any period reachable in one
  click — well under the <4-click bar).
- `granularityToZoom(g)` maps year/month/day to the cosmic timeline's
  log-scaled 0..100 zoom dial (monotonic: day < month < year).

The cosmic timeline's ZoomWidget renders **year / month / day preset buttons**
that set the zoom via `granularityToZoom` while preserving the NOW/center anchor.
Keyboard-operable with visible focus rings (US-0.4).

## Media-error / retry (AC-11, G2)

`MediaImage` (in `EventCard`) renders an explicit, recoverable **"temporarily
unavailable — retry"** state on a media load error (expired signed URL, cache
miss, transient error). It **never implies the memory was deleted** (the Arabic
copy says so), is visibly distinct from a real empty/sparse period, and retries
with a cache-busting nonce so a fresh signed URL is minted. The event row and
metadata still render around the failed thumbnail.

## Privacy & integrity (inherited)

Timeline integrity and privacy enforcement are inherited: `listVisibleEvents` /
`canViewEvent` filter at query/access time, so an out-of-circle event never
appears (AC-5/AC-10) and is not rendered as a data gap (AC-8).

## Key files
- `src/lib/timeline/granularity.ts` — window math + jump + zoom mapping.
- `src/components/timeline/cosmic/CosmicTimeline.tsx` — granularity presets.
- `src/components/EventCard.tsx` — MediaImage error/retry state.
