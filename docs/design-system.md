# Design System

Modern, Arabic-first (RTL) social-network identity. Blue primary + orange
accent, gradients, and motion. Defined once in `tailwind.config.ts` /
`src/app/globals.css` and consumed app-wide through the shared primitives in
`src/app/(auth)/ui.tsx`.

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

`fade-in-up` (entrance), `fade-in`, `pulse-soft`, `float` (logo). All decorative
motion is disabled under `prefers-reduced-motion: reduce` (handled in globals.css).

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

## Conventions

- RTL-first: use logical properties (`ms-/me-/ps-/pe-/start-/end-`), never `left/right` (G6).
- Reuse these primitives rather than re-styling raw elements, so the identity stays consistent across pages.
