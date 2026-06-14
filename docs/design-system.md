# Design System

Modern, Arabic-first (RTL) social-network identity. Blue primary + orange
accent, gradients, and motion. Defined once in `tailwind.config.ts` /
`src/app/globals.css` and consumed app-wide through the shared primitives in
`src/app/(auth)/ui.tsx`.

## Typography

Body/display font is **Cairo** (Arabic-first), loaded via `next/font/google` in
`src/app/layout.tsx` (self-hosted, exposed as the `--font-cairo` CSS variable)
and wired as the default `font-sans` stack in `tailwind.config.ts` with a
system-ui fallback.

## Color

| Token | Hex (DEFAULT) | Use |
|-------|---------------|-----|
| `brand` (blue) | `#2563EB` | primary — links, headings accents, focus rings, info |
| `accent` (orange) | `#F97316` | CTAs, primary buttons, notifications/highlights |

Each is a full 50–900 scale (e.g. `bg-brand-50`, `text-accent-700`).

## Gradients (`bg-*`)

- `bg-brand-gradient` — blue→indigo→orange diagonal; brand surfaces, logo, gradient text (`bg-clip-text text-transparent`).
- `bg-accent-gradient` — orange; primary buttons.
- `bg-app-canvas` — soft blue/orange radial wash; applied to `<body>` so every page shares the backdrop.

## Shadows

`shadow-brand`, `shadow-accent` (colored glows), `shadow-card` (elevation for cards).

## Motion (`animate-*`)

`fade-in-up` (entrance), `fade-in`, `pulse-soft`, `float` (logo),
`gradient-pan` (animated bg-clip headline). All decorative motion is disabled
under `prefers-reduced-motion: reduce` (handled in globals.css).

### Landing hero (`src/app/page.tsx`)

- **LifelineLogo** (`src/app/_components/LifelineLogo.tsx`) — animated SVG
  hourglass brand mark, replacing the bare ⏳ emoji. Brand-gradient sand drains
  from the top bulb and fills the bottom (`ll-sand-top` / `ll-sand-bottom`) with
  falling grains (`ll-grain`); animations defined in globals.css and gated behind
  `prefers-reduced-motion: no-preference`.
- The logo sits in a floating gradient badge (`.logo-badge`) wrapped by a
  slow-rotating conic halo (`.logo-halo`); the hero uses the ambient `.aurora`
  background and an `animate-gradient-pan` headline.

## Shared primitives — `src/app/(auth)/ui.tsx`

- **AuthCard** — rounded card, `shadow-card`, blur, `animate-fade-in-up`.
- **Field** — labeled input, blue focus ring (`focus:ring-brand/15`), hover/transition.
- **SubmitButton** — orange gradient, hover-lift + active-press + focus ring, spinner busy state.
- **GhostButton** — secondary; blue outline-on-hover.
- **Alert** — `error` (red) / `success` (blue) / `info` (orange) tones.
- **Divider** — labeled "or" rule.

## App-level components — `src/components/`

- **EventCard** (`EventCard.tsx`) — the social-network-style timeline card:
  owner header (gradient avatar from the email initial + name + relative Arabic
  date), body note, full-width media grid (1-up large, else 2-col square), and an
  interactive action bar (like toggles locally, comment, share). Keeps the
  `data-testid="timeline-event"` / `event-media` selectors e2e relies on.
- **CircleBadge** (`CircleBadge.tsx`) — colored privacy pill: ME_ONLY neutral,
  FAMILY brand-blue, PUBLIC_UNLISTED accent-orange.
- **CircleSelector** / **PublicWarningDialog** — restyled with the identity
  (selected option ringed in brand blue; dialog animates in, accent confirm).

App pages using these: `src/app/(app)/timeline/page.tsx` (sticky blurred header,
EventCard list, animated empty state), `src/app/(app)/events/new/page.tsx`
(carded form, drag-drop upload zone), `src/app/page.tsx` (gradient hero).

## Cosmic theme — timeline only (`.timeline-cosmic`)

The `/timeline` page ("life command center") is the **only** dark surface in the
app. The cosmic theme is scoped under the `.timeline-cosmic` container so it never
leaks to other pages — the light identity above stays the default everywhere else.

**Tokens** (`tailwind.config.ts`):

| Token | Use |
|-------|-----|
| `cosmic.bg` / `cosmic.surface` / `cosmic.surface2` | deep background / panels / raised insets |
| `cosmic.border` | hairline dividers on dark |
| `cosmic.ink` / `cosmic.muted` | primary / secondary text on dark |
| `cosmic.blue` `teal` `purple` `amber` `rose` | neon accents (blue=past/primary, purple=future, amber=NOW) |
| `bg-cosmic-canvas` | deep navy nebula background (applied by `.timeline-cosmic`) |
| `shadow-glow-blue` `-purple` `-amber` `-teal`, `shadow-cosmic-panel` | neon glows / panel elevation |
| `animate-twinkle`, `animate-pulse-ring` | starfield twinkle, live-pulse ring |

**Primitives** (`src/app/globals.css`, only valid inside a `.timeline-cosmic` subtree):

- `.timeline-cosmic` — the dark canvas; layers an animated faint starfield + nebula bloom (motion gated behind `prefers-reduced-motion`).
- `.cosmic-panel` / `.cosmic-inset` — frosted dark panels for the command-center columns/cards.
- `.cosmic-node` — neon event-node dot/icon; set its color per-instance via the `--glow` custom property (an `r,g,b` triplet, defaults to cosmic blue); lifts + brightens on hover or `[data-selected="true"]`.
- `.pulse-ring` — expanding ring behind the profile avatar ("النبض الحي").

**Components** (`src/components/timeline/cosmic/`):

- `CosmicCommandCenter.tsx` — the 3-column command center (profile + life-circles | timeline + Life Map | interest galaxies) and the bottom toolbar (zoom, circle filters wired to `applyFilters`, actions). Consumed by `src/app/(app)/timeline/page.tsx`. Owns the event-popup open state.
- `CosmicTimeline.tsx` — the custom glowing horizontal rail (past/future split, NOW divider, neon nodes). Each node reveals a **rich preview card** on hover/focus and opens the event popup on click (`onOpen`).
- `EventModal.tsx` — the **event popup**: an accessible dialog (Esc/backdrop close, focus trap + restore) wrapping `EventCard` over a dimmed cosmic backdrop. Replaced the old left-side "selected event" panel (see `docs/timeline-event-popup.md`).
- `LifeCircles.tsx` — orbital "دوائر الحياة" diagram. **Presentational scaffold** — no relationship data model exists (schema has only the 3 privacy circles); interest galaxies in `CosmicCommandCenter` are likewise scaffolds.

**No-scroll layout**: the page is `h-screen overflow-hidden flex-col` — a fixed-height
header and in-flow bottom toolbar, with the content row (`flex-1 min-h-0`) filling between
them; the Life Map flexes to consume leftover center height and columns scroll internally
rather than growing the page. `EventMap` takes a `theme="cosmic"` prop (dark CARTO tiles)
and a flexible `height`.

### Temporal zoom (the time axis) — video/audio-editor style

The cosmic timeline (`CosmicTimeline.tsx`) is **time-based**: each event node is placed
by its real distance from NOW, not by index. The visible **half-window** is `spanDays`
(how much time each side of the NOW divider covers). Position fraction =
`min(1, |Δt| / span)` mapped across the rail from `INNER` (0.04, just off the divider) to
`OUTER` (0.46, the edge); events outside the window clamp to the edge so they stay visible.

Zoom is **part of the timeline itself** (not the page bottom toolbar) and behaves like an
NLE/DAW:

- **Wheel / trackpad-pinch over the rail** zooms the time axis (`onWheel`, `preventDefault`).
  Scroll up = zoom in (shorter window), like Premiere/Audacity. Events coalesce to ~16ms.
- A **time ruler** runs along the rail: evenly spaced date ticks per side whose label format
  adapts to zoom (day view → day+month, year+ → month/year or year), like a timecode ruler.
- A compact **in-panel zoom widget** (`ZoomWidget`: − slider + with a live `± window` label)
  sits under the panel title. The slider is **reversed** so dragging right zooms in.

`zoomToSpanDays()` maps the internal `0..100` `zoom` **log-scaled** between 7 days and ~30
years so each step is a constant ratio. **Zoom in = shorter window = lower zoom value.** Zoom
state lives in `CosmicTimeline` (the parent no longer owns it). i18n strings (`zoomIn`,
`zoomOut`, `spanYears`/`spanMonths`/`spanDays`) live under `cosmic` in `messages/ar.json`.

## Conventions

- RTL-first: use logical properties (`ms-/me-/ps-/pe-/start-/end-`), never `left/right` (G6).
- Reuse these primitives rather than re-styling raw elements, so the identity stays consistent across pages.
- The cosmic theme is timeline-scoped: only use `cosmic.*` tokens and `.cosmic-*` primitives inside a `.timeline-cosmic` subtree.
