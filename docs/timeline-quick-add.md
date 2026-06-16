# Click-on-timeline quick-add (FEAT-FNO)

Add an event directly from the cosmic timeline by clicking the rail at the date
you want, with a live hover readout so you always know where a click will land.

## Add a moment NOW — the FAB (FEAT-QVT)

Clicking the rail requires aiming at a date, and the bottom-toolbar
"+ إضافة حدث جديد" button navigates away to the full `/events/new` form. For the
most common case — _capture what's happening right now_ — there is an
always-visible amber **"+" FAB anchored on the NOW divider**, just below the
"الآن" label.

- **One tap, no aiming** — it opens the same quick-add popup, pre-anchored to the
  **current day** (snapped to noon UTC, the app's date-only convention), centered
  on the rail. No navigation away.
- **Discoverable + accessible** — it is always on screen whenever the rail is
  shown, carries an `aria-label` ("أضف لحظة الآن"), is keyboard-operable, and
  reveals a hint bubble on hover/focus. `data-testid="add-now-fab"`.
- **Only on a populated rail** — the rail (and thus the FAB) renders once ≥1 event
  exists; the empty-timeline state has its own prominent "add first memory" CTA,
  so there is no add-affordance gap.

The FAB reuses the `onAddAt(atISO)` callback via an `onAddNow` helper in
`CosmicTimeline.tsx` — so the popup, optimistic render, and success toast paths
are identical to the click-to-add flow below.

## The redesigned moment popup (FEAT-JZW)

Every entry point (NOW FAB, rail click) now opens the same **centered modal**
titled **لحظة جديدة** (mockup 1), replacing the old rail-anchored card. It holds:

- A **clock + date row** for the chosen day (date-only, noon-UTC anchored).
- A large **note field** (ماذا حدث في هذه اللحظة؟).
- Three **media cards** — صورة / فيديو / صوت — each offering BOTH:
  - **live capture** (التقاط for a photo, تسجيل for audio/video) via the capture
    lib ([capture-recording.md](./capture-recording.md)), and
  - **file upload** (رفع) via the existing `uploadFile` path.
  Both converge on one upload pipeline: a captured still or stopped recording is
  uploaded exactly like a picked file. While recording, a card shows an `mm:ss`
  readout with stop/cancel (and a live preview for video); a capture non-grant
  shows an inline "use upload instead" hint — never a dead-end.
- A **من يراها؟** privacy row rendered as icon **pills** (the `pills` variant of
  `CircleSelector`), أنا فقط by default; the AC-4 public-media warning still fires.
- Footer actions: **أضف اللحظة** (save) and **تفاصيل أكثر**, which hands off to the
  full `/events/new` form carrying the chosen day via `?on=YYYY-MM-DD`.

`data-testid`s: `quick-add-popup`, `quick-add-note`, `quick-add-save`,
`quick-add-more-details`, `media-card-{image,video,audio}` (+ `-capture` /
`-upload` / `-stop`), `circle-pill-{me_only,family,public_unlisted,public}`.

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
| Rail position ↔ real instant mapping, hover readout, click→`onAddAt`, NOW FAB (`onAddNow`) | [src/components/timeline/cosmic/CosmicTimeline.tsx](../src/components/timeline/cosmic/CosmicTimeline.tsx) |
| Quick-add popup (time/place/content/circle, upload, save) | [src/components/timeline/cosmic/QuickAddPopup.tsx](../src/components/timeline/cosmic/QuickAddPopup.tsx) |
| Wiring: open popup, optimistic render, re-seed on refresh | [src/components/timeline/cosmic/CosmicCommandCenter.tsx](../src/components/timeline/cosmic/CosmicCommandCenter.tsx) |
| Arabic labels (`cosmic.quickAdd*`, `cosmic.clickToAddHint`, `cosmic.addNow`, `cosmic.addNowHint`) | [messages/ar.json](../messages/ar.json) |

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
