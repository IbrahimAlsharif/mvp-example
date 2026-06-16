# Timeline view: toolbar, nodes, ruler, pan (FEAT-PPU)

The cosmic timeline rail, restyled to match the approved mockup. Builds on the
temporal-zoom model (positions by real time distance from the center instant) and
the click/FAB add paths ([timeline-quick-add.md](./timeline-quick-add.md)).

## What the user sees

- **Toolbar** above the rail:
  - **الآن** — a recenter button (clock icon). When the axis has been panned it
    turns amber/active; clicking it snaps the center back to the live NOW.
  - **Zoom cluster** — `+` / slider / `−` (DAW-style; `+` = shorter window).
  - **المدى: ± N** — the visible half-window label (e.g. "المدى: ± ٥ سنة").
  - Year/month/day granularity presets (one-click spans).
- **Rail**:
  - A vertical **الآن** divider marking the live current moment, carrying the
    add-now **+** FAB ([FEAT-QVT](./timeline-quick-add.md)). It sits at center when
    un-panned and moves to its true position (or scrolls off) once you pan.
  - **Solid colored circular nodes** with a white glyph + ring, connector lines to
    a floating title bubble; color derives from the event's media kind.
  - A **year/date ruler** (three marks per side) reading like an editor's timecode.
- **Hints line** below the rail: «اسحب للتنقّل • مرّر للتكبير حتى الأيام والساعات
  والدقائق • اضغط على الخط لإضافة لحظة».

## Interactions

| Gesture | Effect |
|---------|--------|
| **Drag** the rail horizontally | **Pan** the time axis (RTL: drag right → into the past) |
| **Wheel / pinch** over the rail | Zoom the time axis (up = zoom in) |
| **Click** empty axis | Open the moment popup at that date |
| **الآن** button | Recenter the axis on the live NOW (clear pan) |
| **Enter/Space** on the focused rail | Open the moment popup at center |

### Pan model

`now` is a live clock; `panMs` is a time offset added to it to get `centerMs` —
the instant at the rail's **geometric center**. All positioning (`layout`,
`buildTicks`, cursor→instant) is relative to `centerMs`; the **NOW divider** is
drawn at NOW's signed offset from `centerMs` (hidden when it falls outside the
window). A drag converts pixels→days via the same half-width↔`spanDays` scale the
nodes use, so time moves at the on-screen rate; a drag past a small threshold
suppresses the click-to-add that would otherwise fire on release. `الآن` resets
`panMs` to 0.

## How it works

| Concern | Where |
|---------|-------|
| Rail, toolbar, pan/zoom/recenter, NOW marker, nodes, ruler, hints | [src/components/timeline/cosmic/CosmicTimeline.tsx](../src/components/timeline/cosmic/CosmicTimeline.tsx) |
| Cursor↔instant mapping (now relative to the center instant) | `mapCursorToInstant` (same file; unit-tested) |
| Zoom↔span + granularity presets | [src/lib/timeline/granularity.ts](../src/lib/timeline/granularity.ts) |
| Arabic labels (`recenterNow`, `rangeLabel`, `railHints`, …) | [messages/ar.json](../messages/ar.json) |

## Tests

- `tests/unit/timeline-cursor.test.ts`, `tests/unit/granularity.test.ts` — the
  cursor/zoom math (still green after the center-instant refactor).
- `tests/e2e/timeline-view.spec.ts` — toolbar (الآن, المدى, hints) present;
  drag-to-pan moves the NOW divider and الآن recenters it.
- `tests/e2e/add-now-fab.spec.ts`, `edit-moment.spec.ts`, `moment-popup.spec.ts`
  — the add/edit flows still work against the redesigned rail.

## Audience filter (FEAT-BVK)

A segmented **الكل / لي / مَن تحب** control sits centered under the title, scoping
the timeline by ownership:

- **الكل** (all) — every visible event (no owner filter; default).
- **لي** (mine) — only the viewer's own events.
- **مَن تحب** (others') — only people-you-love's events.

Backed by `EventVM.isOwn` (set server-side on the timeline VM) via a new `owner`
field on `TimelineFilters` in
[src/lib/events/filter.ts](../src/lib/events/filter.ts). This one 3-way segment
intentionally subsumes the mockup's separate **لحظاتك / لحظات مَن تحب** radio —
same ownership axis, one control instead of two redundant ones. Filtering only
empties the visible set; with own events present the rail stays mounted (the
first-run empty state is reserved for an account with zero events).

Component: [src/components/timeline/cosmic/AudienceFilter.tsx](../src/components/timeline/cosmic/AudienceFilter.tsx)
(`data-testid="audience-filter"`, options `audience-{all,mine,others}`); wired in
`CosmicCommandCenter` and rendered into the header via `CosmicTimeline`'s
`audienceControl` prop. Tests: `tests/unit/event-filter.test.ts` (owner-scope
branch) + `tests/e2e/audience-filter.spec.ts`.

## Notes / limits

- `data-testid`s: `recenter-now`, `range-label`, `rail-hints`, `timeline-rail`,
  `add-now-fab`, `audience-filter` (+ `audience-all/mine/others`), plus event
  nodes (`aria-label="فتح الحدث"`, `data-node`).
