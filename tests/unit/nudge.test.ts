import { describe, it, expect } from "vitest";
import { pickNudge, isPopulatedTimeline } from "@/lib/timeline/nudge";

describe("pickNudge (J1.9 first-run / revisit nudge)", () => {
  it("shows the welcome nudge on first run regardless of population", () => {
    expect(pickNudge({ firstRun: true, isPopulated: false })).toBe("welcome");
    expect(pickNudge({ firstRun: true, isPopulated: true })).toBe("welcome");
  });

  it("shows the revisit nudge for a returning user with a populated timeline", () => {
    expect(pickNudge({ firstRun: false, isPopulated: true })).toBe("revisit");
  });

  it("shows no nudge for a returning user with an empty/sparse timeline", () => {
    // empty/single-day timeline has its own inline empty-state prompt — a
    // brand-new user must never be told "welcome back".
    expect(pickNudge({ firstRun: false, isPopulated: false })).toBeNull();
  });
});

describe("isPopulatedTimeline", () => {
  it("is populated only with >= 2 distinct calendar days", () => {
    expect(isPopulatedTimeline([])).toBe(false);
    expect(isPopulatedTimeline(["2026-06-15"])).toBe(false);
    expect(isPopulatedTimeline(["2026-06-15", "2026-06-15"])).toBe(false);
    expect(isPopulatedTimeline(["2026-06-15", "2026-06-01"])).toBe(true);
  });
});
