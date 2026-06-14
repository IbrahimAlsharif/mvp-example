/**
 * Timeline granularity + jump helpers (US-2.1 AC-2/AC-3). Pure and
 * framework-free so the anchor-preservation and jump math is unit-testable
 * without the vis-timeline DOM.
 */

export type Granularity = "year" | "month" | "day";

/** Half-window (ms) for each granularity — the visible span is 2× this. */
const HALF_SPAN_MS: Record<Granularity, number> = {
  year: 365 * 86_400_000, // ~2 years visible
  month: 45 * 86_400_000, // ~3 months visible
  day: 1.5 * 86_400_000, // ~3 days visible
};

export type Window = { start: number; end: number };

/**
 * The visible window for a granularity centered on an anchor instant (AC-2).
 * Switching year → month → day keeps the user anchored to the SAME point in
 * time: the anchor stays at the window centre, the span just tightens/widens.
 */
export function windowFor(granularity: Granularity, anchorMs: number): Window {
  const half = HALF_SPAN_MS[granularity];
  return { start: anchorMs - half, end: anchorMs + half };
}

/** The anchor (centre) of a window — used to preserve position across switches. */
export function anchorOf(win: Window): number {
  return Math.round((win.start + win.end) / 2);
}

/**
 * Re-center the view on a new granularity while preserving the current anchor
 * (AC-2). Given the current window, derive its centre and produce the window
 * for the requested granularity around that same centre.
 */
export function switchGranularity(current: Window, to: Granularity): Window {
  return windowFor(to, anchorOf(current));
}

/**
 * Jump to a target day (AC-3, reachable in <4 clicks). Parses a yyyy-mm-dd day
 * to its midday instant and returns the window for the chosen granularity around
 * it. Returns null for an unparseable date (the jump control rejects bad input
 * rather than navigating nowhere).
 */
export function jumpTo(dayKey: string, granularity: Granularity): Window | null {
  const t = Date.parse(`${dayKey}T12:00:00.000Z`);
  if (Number.isNaN(t)) return null;
  return windowFor(granularity, t);
}
