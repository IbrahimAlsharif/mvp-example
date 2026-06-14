import { dayKey } from "@/lib/events/date";

/**
 * Resolve the date for a bulk-imported item, flagging implausible EXIF dates
 * (US-1.3 AC-3). An obviously-bad date (epoch/unset-clock, or a future date)
 * must never be silently treated as authoritative ordering: the item is still
 * imported (never dropped), but with a sensible fallback date and a flag so the
 * user can correct it via the same correction path. The corrected/fallback date
 * is the durable, exportable effective date (AC-15).
 */
export type ImportDate = {
  /** The effective date to store (yyyy-mm-dd). */
  date: string;
  /** Where it came from — drives the telemetry counts + the correction flag. */
  source: "exif" | "fallback";
  /** True when the EXIF date was missing/unparseable/implausible → user should review. */
  needsReview: boolean;
};

// A capture date before this is almost certainly an unset camera clock, not a
// real memory date. (Digital cameras predate this, but for a family-memory MVP
// anything older is overwhelmingly a clock-reset artifact worth flagging.)
const MIN_PLAUSIBLE = Date.UTC(1990, 0, 1);

export function plausibleCaptureDate(isoDay: string | undefined, nowMs: number): boolean {
  if (!isoDay) return false;
  const t = Date.parse(`${isoDay}T12:00:00.000Z`);
  if (Number.isNaN(t)) return false;
  if (t < MIN_PLAUSIBLE) return false; // epoch / unset-clock
  // Allow a small future skew (timezones) but flag clearly-future dates.
  if (t > nowMs + 36 * 60 * 60 * 1000) return false;
  return true;
}

export function resolveImportDate(exifDay: string | undefined, nowMs: number, nowDate: Date): ImportDate {
  if (plausibleCaptureDate(exifDay, nowMs)) {
    return { date: exifDay as string, source: "exif", needsReview: false };
  }
  // Missing, unparseable, or implausible → fallback to today (local), flagged.
  return { date: dayKey(nowDate), source: "fallback", needsReview: true };
}
