import { describe, it, expect } from "vitest";
import {
  furthestStage,
  diagnose,
  cohortWeek,
  daysSinceLastActivity,
  weeklyActive,
  emitStageAttainment,
  FUNNEL_DEFAULTS,
  type FunnelStage,
  type UserActivity,
} from "@/lib/analytics/funnel";
import { safeEmit } from "@/lib/telemetry";

const DAY = 24 * 60 * 60 * 1000;
const base = (over: Partial<UserActivity>): UserActivity => ({
  accountId: "acc_1",
  signupAt: Date.UTC(2026, 0, 1),
  eventDays: [],
  importCompleted: false,
  revisited: false,
  lastActivityAt: null,
  ...over,
});

describe("US-0.3 funnel stage derivation (AC-1/AC-2a)", () => {
  it("signup with no events → signup stage", () => {
    expect(furthestStage(base({}))).toBe("signup");
  });

  it("exactly one manual event → first_event, NOT populated_timeline (AC-2a)", () => {
    const a = base({ eventDays: ["2026-01-02"] });
    expect(furthestStage(a)).toBe("first_event");
  });

  it("two events across distinct days → populated_timeline", () => {
    const a = base({ eventDays: ["2026-01-02", "2026-01-05"] });
    expect(furthestStage(a)).toBe("populated_timeline");
  });

  it("a completed import alone satisfies populated_timeline (import-only activation)", () => {
    const a = base({ importCompleted: true });
    expect(furthestStage(a)).toBe("populated_timeline");
  });

  it("populated + revisit → first_revisit (the furthest stage)", () => {
    const a = base({ eventDays: ["2026-01-02", "2026-01-05"], revisited: true });
    expect(furthestStage(a)).toBe("first_revisit");
  });

  it("two events on the SAME day do not reach populated_timeline (distinct days required)", () => {
    const a = base({ eventDays: ["2026-01-02", "2026-01-02"] });
    expect(furthestStage(a)).toBe("first_event");
  });
});

describe("US-0.3 three separable diagnoses (AC-2/AC-2b)", () => {
  const now = Date.UTC(2026, 0, 29); // 4 weeks after signup

  it("signed up, never created → didnt_activate", () => {
    expect(diagnose(base({}), now)).toBe("didnt_activate");
  });

  it("created but never revisited → didnt_retain", () => {
    const a = base({ eventDays: ["2026-01-02", "2026-01-05"], revisited: false });
    expect(diagnose(a, now)).toBe("didnt_retain");
  });

  it("activated + retained but low event rate → no_demand", () => {
    // 2 events over 4 weeks = 0.5/wk < reference (1/wk) → no_demand.
    const a = base({ eventDays: ["2026-01-02", "2026-01-05"], revisited: true });
    expect(diagnose(a, now)).toBe("no_demand");
  });

  it("activated + retained + healthy rate → activated", () => {
    const a = base({
      eventDays: ["2026-01-02", "2026-01-05", "2026-01-09", "2026-01-12", "2026-01-20"],
      revisited: true,
    });
    expect(diagnose(a, now)).toBe("activated");
  });
});

describe("US-0.3 cohort + early-lapse markers (AC-4)", () => {
  it("groups by signup week", () => {
    expect(cohortWeek(Date.UTC(2026, 0, 1))).toMatch(/^2026_w0\d$/);
    // Two signups in the same week share a cohort key.
    expect(cohortWeek(Date.UTC(2026, 0, 1))).toBe(cohortWeek(Date.UTC(2026, 0, 3)));
  });

  it("daysSinceLastActivity reflects the early-lapse window", () => {
    const a = base({ lastActivityAt: Date.UTC(2026, 0, 10) });
    expect(daysSinceLastActivity(a, Date.UTC(2026, 0, 15))).toBe(5);
  });

  it("weeklyActive marker is structural-only and content-blind", () => {
    const a = base({ eventDays: ["2026-01-02"], revisited: true, lastActivityAt: Date.UTC(2026, 0, 8) });
    const m = weeklyActive(a, 1, Date.UTC(2026, 0, 15));
    expect(m.did_create).toBe(true);
    expect(m.did_revisit).toBe(true);
    expect(m.week_offset).toBe(1);
    expect(m.days_since_last_activity).toBe(7);
    // No memory content fields exist on the marker.
    expect(Object.keys(m).sort()).toEqual(
      ["accountId", "cohort_week", "days_since_last_activity", "did_create", "did_revisit", "week_offset"].sort(),
    );
  });
});

describe("US-0.3 stage attainment is idempotent per user (AC-6)", () => {
  it("emits each newly-reached stage once; a re-run with the same set emits nothing", () => {
    const a = base({ eventDays: ["2026-01-02", "2026-01-05"], revisited: true });
    const seen = new Set<FunnelStage>();
    const first = emitStageAttainment(a, seen);
    // Reaching first_revisit implies signup, first_event, populated_timeline too.
    expect(first).toEqual(["signup", "first_event", "populated_timeline", "first_revisit"]);
    first.forEach((s) => seen.add(s));
    // A double-submit / retry with the same already-attained set emits nothing.
    expect(emitStageAttainment(a, seen)).toEqual([]);
  });

  it("only emits the newly-crossed stage when a user advances", () => {
    const a1 = base({ eventDays: ["2026-01-02"] }); // first_event
    const seen = new Set<FunnelStage>();
    emitStageAttainment(a1, seen).forEach((s) => seen.add(s));
    expect([...seen].sort()).toEqual(["first_event", "signup"]);
    // Later the user populates the timeline → only the new stage is emitted.
    const a2 = base({ eventDays: ["2026-01-02", "2026-01-09"] });
    expect(emitStageAttainment(a2, seen)).toEqual(["populated_timeline"]);
  });
});

describe("US-0.3 instrumentation is non-blocking (NFR)", () => {
  it("safeEmit never throws, even on a content-bearing payload (degrades to ops signal)", () => {
    // A note string on a non-enum field would throw via emit(); safeEmit must
    // swallow it so a user action is never broken by telemetry.
    expect(() => safeEmit("event_create_saved", { note: "my daughter's first steps" })).not.toThrow();
  });
});

describe("US-0.3 provisional defaults are documented config (AC-2c)", () => {
  it("exposes tunable thresholds without a schema migration", () => {
    expect(FUNNEL_DEFAULTS.populatedTimelineMinDistinctDays).toBe(2);
    expect(FUNNEL_DEFAULTS.noDemandReferenceEventsPerWeek).toBe(1);
    expect(FUNNEL_DEFAULTS.noDemandTrailingWeeks).toBe(4);
    // Re-deriving with a different threshold changes attainment for the SAME
    // raw stream (recomputable, not frozen).
    const a = base({ eventDays: ["2026-01-02", "2026-01-05"] });
    expect(furthestStage(a, { ...FUNNEL_DEFAULTS, populatedTimelineMinDistinctDays: 3 })).toBe("first_event");
    expect(furthestStage(a, FUNNEL_DEFAULTS)).toBe("populated_timeline");
  });
});
