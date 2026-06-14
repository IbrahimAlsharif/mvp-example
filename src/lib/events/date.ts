/**
 * Shared date helpers for the timeline. `occurredOn` is a date-only moment
 * (no clock time in schema), so everything here works at day granularity.
 * Centralised so an event card and its timeline group header always agree.
 */

const MS_PER_DAY = 86_400_000;

/** Whole calendar-days between `value` and now (0 = today, 1 = yesterday, ...). */
export function daysAgo(value: string | Date, now: Date = new Date()): number {
  const d = startOfDay(new Date(value));
  const today = startOfDay(now);
  return Math.round((today.getTime() - d.getTime()) / MS_PER_DAY);
}

/** A stable per-day key (YYYY-MM-DD) for grouping events into timeline buckets. */
export function dayKey(value: string | Date): string {
  const d = startOfDay(new Date(value));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Absolute Gregorian date in Arabic, e.g. "١٤ يونيو ٢٠٢٦". */
export function absoluteDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("ar", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
