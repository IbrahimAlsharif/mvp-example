import { describe, it, expect } from "vitest";
import { mapCursorToInstant } from "@/components/timeline/cosmic/CosmicTimeline";

// NOW fixed at 2026-06-15 12:00 UTC; rail spans clientX 100..1100 (width 1000),
// NOW divider at the geometric center (x=600). ±9-month-ish window.
const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);
const RAIL = { railLeft: 100, railWidth: 1000, centerX: 600, now: NOW, spanDays: 270 };

function at(clientX: number) {
  return mapCursorToInstant({ clientX, ...RAIL });
}

describe("mapCursorToInstant (cosmic rail RTL)", () => {
  it("maps a click LEFT of NOW to the PAST (RTL-mirrored axis)", () => {
    const r = at(250); // well left of center
    expect(r.side).toBe("past");
    // Past → an instant strictly before NOW.
    expect(new Date(r.atISO).getTime()).toBeLessThan(NOW);
  });

  it("maps a click RIGHT of NOW to the FUTURE (RTL-mirrored axis)", () => {
    const r = at(950); // well right of center
    expect(r.side).toBe("future");
    expect(new Date(r.atISO).getTime()).toBeGreaterThan(NOW);
  });

  it("snaps the time to 12:00 UTC noon regardless of cursor position", () => {
    for (const x of [250, 480, 720, 950]) {
      const d = new Date(at(x).atISO);
      expect(d.getUTCHours()).toBe(12);
      expect(d.getUTCMinutes()).toBe(0);
      expect(d.getUTCSeconds()).toBe(0);
    }
  });

  it("is symmetric around NOW: equal offsets left/right give mirror-image dates", () => {
    const left = at(600 - 300); // 300px left of center
    const right = at(600 + 300); // 300px right of center
    const dLeft = NOW - new Date(left.atISO).getTime();
    const dRight = new Date(right.atISO).getTime() - NOW;
    expect(left.side).toBe("past");
    expect(right.side).toBe("future");
    // Same magnitude offset on each side (within a day of rounding).
    expect(Math.abs(dLeft - dRight)).toBeLessThanOrEqual(86_400_000);
  });

  it("places the tooltip pct so it lines up with the ruler tick at that date", () => {
    // Re-derive the date offset from the returned pct using the ruler/buildTicks
    // formula and confirm it equals the readout's own date — same coordinate.
    const r = at(300);
    const INNER = 0.04;
    const OUTER = 0.46;
    const offsetDaysFromPct = ((r.pct - INNER) / (OUTER - INNER)) * RAIL.spanDays;
    const tickDate = new Date(NOW - offsetDaysFromPct * 86_400_000) // past side
      .toISOString()
      .slice(0, 10);
    expect(r.atISO.slice(0, 10)).toBe(tickDate);
  });

  it("returns a physical xPct (0=left .. 1=right) for popup placement", () => {
    expect(at(100).xPct).toBeCloseTo(0, 5); // left edge
    expect(at(1100).xPct).toBeCloseTo(1, 5); // right edge
    expect(at(600).xPct).toBeCloseTo(0.5, 5); // center
  });
});
