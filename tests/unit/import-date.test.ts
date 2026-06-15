import { describe, it, expect } from "vitest";
import { plausibleCaptureDate, resolveImportDate } from "@/lib/events/import-date";

const NOW = Date.UTC(2026, 5, 15, 12); // 2026-06-15
const NOW_DATE = new Date(NOW);

describe("US-1.3 import date plausibility (AC-3)", () => {
  it("accepts a real capture date", () => {
    expect(plausibleCaptureDate("2019-08-12", NOW)).toBe(true);
  });
  it("rejects an unset-clock / epoch date", () => {
    expect(plausibleCaptureDate("1970-01-01", NOW)).toBe(false);
    expect(plausibleCaptureDate("1980-05-01", NOW)).toBe(false);
  });
  it("rejects a clearly-future date", () => {
    expect(plausibleCaptureDate("2030-01-01", NOW)).toBe(false);
  });
  it("rejects missing/garbage", () => {
    expect(plausibleCaptureDate(undefined, NOW)).toBe(false);
    expect(plausibleCaptureDate("not-a-date", NOW)).toBe(false);
  });
});

describe("US-1.3 resolveImportDate flags fallbacks but never drops (AC-3)", () => {
  it("uses a valid EXIF date as authoritative, no review needed", () => {
    const r = resolveImportDate("2019-08-12", NOW, NOW_DATE);
    expect(r).toEqual({ date: "2019-08-12", source: "exif", needsReview: false });
  });
  it("falls back to today and flags for review on an implausible date", () => {
    const r = resolveImportDate("1970-01-01", NOW, NOW_DATE);
    expect(r.source).toBe("fallback");
    expect(r.needsReview).toBe(true);
    expect(r.date).toBe("2026-06-15"); // local today fallback, item still imported
  });
  it("falls back + flags when EXIF is absent", () => {
    const r = resolveImportDate(undefined, NOW, NOW_DATE);
    expect(r.source).toBe("fallback");
    expect(r.needsReview).toBe(true);
  });
});
