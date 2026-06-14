# Timeline event preview + popup (FEAT-XBA)

How a user inspects an existing event on the cosmic timeline: a rich preview on
hover, and the full event in a popup on click. This replaces the earlier
left-side "selected event" panel, which was removed as not useful.

## What the user sees

- **Hover preview** — hovering (or keyboard-focusing) an event node on the rail
  reveals a preview card next to the node showing:
  - the **media-kind icon** + the **full date** (day · month · year),
  - the **privacy-circle** as a colored pill (العائلة / عام / أنا فقط),
  - a **media thumbnail** (first attached image, when present),
  - a **note snippet** (first ~90 chars, ellipsised), or "بدون وصف" when empty,
  - an "اضغط لعرض الحدث كاملاً" hint.

  At rest the node still shows its compact title bubble; the bubble fades out as
  the richer preview fades in.
- **Click to open** — clicking the node **or** its preview opens the full event
  in a **popup** (centered, over a dimmed cosmic backdrop) rendered with the same
  `EventCard` used elsewhere in the app.
- **Closing the popup** — Esc, clicking the backdrop, or the close (✕) button.
- **After quick-add** — saving an event from the rail (FEAT-FNO) opens it in this
  popup so the user sees it land.

## Accessibility

The popup is a proper dialog:

- `role="dialog"` + `aria-modal="true"`, labelled by `cosmic.eventModalTitle`.
- **Esc** closes; a **backdrop press** closes (only when the press starts on the
  backdrop, so a text-selection drag that ends outside doesn't dismiss it).
- On open, focus moves to the close button; on close, focus is **restored** to
  the element that opened it (the node).
- A minimal **Tab focus trap** keeps keyboard focus inside the dialog.
- The preview is revealed on `:focus` as well as `:hover`, so it is reachable by
  keyboard, not pointer-only.

## How it works

| Concern | Where |
|---------|-------|
| Node hover/focus preview card + click → `onOpen` | [src/components/timeline/cosmic/CosmicTimeline.tsx](../src/components/timeline/cosmic/CosmicTimeline.tsx) |
| The popup (dialog wrapping `EventCard`, Esc/backdrop close, focus trap + restore) | [src/components/timeline/cosmic/EventModal.tsx](../src/components/timeline/cosmic/EventModal.tsx) |
| Wiring: `openId`/`openEvent` state, renders the popup, no more side panel | [src/components/timeline/cosmic/CosmicCommandCenter.tsx](../src/components/timeline/cosmic/CosmicCommandCenter.tsx) |
| The event card rendered inside the popup | [src/components/EventCard.tsx](../src/components/EventCard.tsx) |
| Arabic labels (`cosmic.openEvent`, `openEventHint`, `noNote`, `eventModalTitle`, `eventModalClose`) | [messages/ar.json](../messages/ar.json) |

## Notes / limits

- The popup renders inside the `.timeline-cosmic` subtree, so its cosmic color
  tokens (backdrop, borders) resolve; no React portal is used. The `EventCard`
  keeps its light social-network styling, sitting on the dark scrim for contrast.
- `onOpen` resolves the open event against the **filtered** event set, so toggling
  a circle filter that hides the open event also closes its popup.
- **Behavior change vs. FEAT-FNO:** clicking an existing node now **opens this
  popup** (it previously selected the event into the side panel). Clicking an
  *empty* point on the rail still opens quick-add — node clicks
  `stopPropagation` + carry `data-node` so they're never read as add-clicks.
