import { describe, it, expect } from "vitest";
import { windowFor, anchorOf, switchGranularity, jumpTo } from "@/lib/timeline/granularity";

const ANCHOR = Date.UTC(2021, 5, 15, 12); // 2021-06-15 midday

describe("US-2.1 granularity windows + anchor preservation (AC-2)", () => {
  it("centers the visible window on the anchor for each granularity", () => {
    for (const g of ["year", "month", "day"] as const) {
      const w = windowFor(g, ANCHOR);
      expect(anchorOf(w)).toBe(ANCHOR); // anchor stays at the centre
      expect(w.end - w.start).toBeGreaterThan(0);
    }
  });

  it("tighter granularity → narrower span (year > month > day)", () => {
    const y = windowFor("year", ANCHOR);
    const m = windowFor("month", ANCHOR);
    const d = windowFor("day", ANCHOR);
    const span = (w: { start: number; end: number }) => w.end - w.start;
    expect(span(y)).toBeGreaterThan(span(m));
    expect(span(m)).toBeGreaterThan(span(d));
  });

  it("switching granularity keeps the user anchored to the same point in time (AC-2)", () => {
    // Start zoomed out on 2021, switch down to day — must land in 2021, not today.
    const yearWin = windowFor("year", ANCHOR);
    const dayWin = switchGranularity(yearWin, "day");
    expect(anchorOf(dayWin)).toBe(ANCHOR);
    // The day window is centered in June 2021, not on "now".
    expect(new Date(anchorOf(dayWin)).getUTCFullYear()).toBe(2021);
  });
});

describe("US-2.1 jump-to-date (AC-3, reachable in <4 clicks)", () => {
  it("jumps to a target day centered at the chosen granularity", () => {
    const w = jumpTo("2019-03-08", "month");
    expect(w).not.toBeNull();
    if (w) {
      const c = new Date(anchorOf(w));
      expect(c.getUTCFullYear()).toBe(2019);
      expect(c.getUTCMonth()).toBe(2); // March
    }
  });

  it("rejects an unparseable date rather than navigating nowhere", () => {
    expect(jumpTo("not-a-date", "day")).toBeNull();
  });
});
