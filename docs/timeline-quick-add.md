# Click-on-timeline quick-add (FEAT-FNO)

Add an event directly from the cosmic timeline by clicking the rail at the date
you want, with a live hover readout so you always know where a click will land.

## What the user sees

- **Hover readout** — moving the mouse along the rail shows a floating tooltip
  with the **weekday · full date · time** at the cursor, plus a "اضغط على الخط
  الزمني لإضافة حدث" hint. A thin amber guide line drops to the axis so the aim
  point is unambiguous.
- **Click to add** — clicking an empty point on the rail opens a **quick-add
  popup** pre-filled with the date+time at that position. Clicking an existing
  event node opens that event's popup instead (see
  [timeline-event-popup.md](./timeline-event-popup.md)) — it never opens quick-add.
- **The popup** captures, for that instant:
  - **Time** — editable (defaults to the clicked time).
  - **Place** — free text; folded into the note as `📍 <place>` on save.
  - **Content** — a note and/or media of **any kind**: images, video, audio, or
    a mix. Note-only is allowed.
  - **Circle** — privacy circle, ME_ONLY by default (G1).
- **Immediate render** — on save the new event appears on the rail right away
  (and becomes the selected event) without a page refresh.

## How it works

| Concern | Where |
|---------|-------|
| Rail position ↔ real instant mapping, hover readout, click→`onAddAt` | [src/components/timeline/cosmic/CosmicTimeline.tsx](../src/components/timeline/cosmic/CosmicTimeline.tsx) |
| Quick-add popup (time/place/content/circle, upload, save) | [src/components/timeline/cosmic/QuickAddPopup.tsx](../src/components/timeline/cosmic/QuickAddPopup.tsx) |
| Wiring: open popup, optimistic render, re-seed on refresh | [src/components/timeline/cosmic/CosmicCommandCenter.tsx](../src/components/timeline/cosmic/CosmicCommandCenter.tsx) |
| Arabic labels (`cosmic.quickAdd*`, `cosmic.clickToAddHint`) | [messages/ar.json](../messages/ar.json) |

### Position ↔ time

The rail is a symmetric time axis with **NOW at the center**. In RTL the **past**
occupies the right half and the **future** the left half. A cursor `xPct`
(0 = left, 1 = right) inverts the node layout mapping
`out = INNER + frac·(OUTER−INNER)` to recover the fraction of the visible
half-window, which times `spanDays` (the current zoom window) gives the offset
from NOW. So a click lands on the **same date** a node placed at that spot would
carry, and zoom level changes the precision per pixel automatically.

### Save path

The popup posts to the existing `/api/events` route — the same **atomic**,
idempotent (`submitKey`) create path used by the full `/events/new` form
([src/lib/events/create.ts](../src/lib/events/create.ts)). Media is uploaded via
the shared `uploadFile` client helper before save; EXIF GPS auto-fills location
when the user hasn't typed a place. No new server code or schema change.

The `place` text has no dedicated column on the `Event` model, so it is appended
to the note as `📍 <place>`; coordinates (from EXIF) still go to
`locationLat`/`locationLng`.

## Notes / limits

- The event model has no separate "place" field — place is stored in the note
  text. A future story could add a structured place + reverse geocoding.
- Optimistic render prepends the saved `EventVM` to a local list; a full
  `router.refresh()` (e.g. after the long form) re-seeds it from the server so
  the rail never drifts from the source of truth.
