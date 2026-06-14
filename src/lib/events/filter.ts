import type { PrivacyCircle } from "@prisma/client";
import { type EventVM, hasLocation, hasMedia } from "./view";

/**
 * Pure, browser-free filtering for the timeline + map. Kept out of React so it
 * is directly unit-testable. The timeline view applies these filters; the map
 * additionally intersects the result with the timeline's visible window
 * (see `withinRange`).
 */
export type TimelineFilters = {
  // Empty set = no circle filter (show all circles).
  circles: Set<PrivacyCircle>;
  // Inclusive ISO date bounds (date-only granularity). null = unbounded.
  from: string | null;
  to: string | null;
  hasMedia: boolean | null; // true = only with media, false = only without, null = either
  hasLocation: boolean | null; // same tri-state for location
};

export const emptyFilters: TimelineFilters = {
  circles: new Set(),
  from: null,
  to: null,
  hasMedia: null,
  hasLocation: null,
};

export function applyFilters(events: EventVM[], f: TimelineFilters): EventVM[] {
  return events.filter((e) => {
    if (f.circles.size > 0 && !f.circles.has(e.circle)) return false;

    const day = e.occurredOn.slice(0, 10); // YYYY-MM-DD
    if (f.from && day < f.from.slice(0, 10)) return false;
    if (f.to && day > f.to.slice(0, 10)) return false;

    if (f.hasMedia !== null && hasMedia(e) !== f.hasMedia) return false;
    if (f.hasLocation !== null && hasLocation(e) !== f.hasLocation) return false;

    return true;
  });
}

/** Whether the event's day falls within an (inclusive) visible time window. */
export function withinRange(e: EventVM, start: Date, end: Date): boolean {
  const t = new Date(e.occurredOn).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

/** Convenience: filtered events that also have coordinates, for the map. */
export function locatedEvents(events: EventVM[]): (EventVM & { lat: number; lng: number })[] {
  return events.filter(hasLocation);
}
