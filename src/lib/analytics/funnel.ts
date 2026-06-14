/**
 * Activation funnel + weekly retention cohort derivation (US-0.3).
 *
 * This is the measurement substrate that lets the pilot distinguish the three
 * ambiguous readings of a low Events-Added number:
 *   - didn't-activate (signed up, no first event),
 *   - no-demand (activated, but event rate below the reference), and
 *   - didn't-retain (activated, then never revisited).
 *
 * Everything here is DERIVED from the raw structural event stream — never frozen
 * as a one-time flag — so retuning the density threshold or the no-demand
 * reference rate re-derives historical attainment without a schema migration or
 * re-emission (AC-2c / NFR "recomputable").
 *
 * Content-blind by construction (G4): inputs are structural markers only
 * (counts, timestamps, opaque ids) — never memory text/media/coordinates.
 */

export type FunnelStage = "signup" | "first_event" | "populated_timeline" | "first_revisit";

export const FUNNEL_ORDER: FunnelStage[] = [
  "signup",
  "first_event",
  "populated_timeline",
  "first_revisit",
];

/**
 * Provisional, documented defaults (AC-2c). Tunable as plain config — changing
 * these re-derives attainment from the retained event stream; no migration.
 * Owner: product. Review date: 2026-07-15 (back-test against week-4 retention).
 */
export const FUNNEL_DEFAULTS = {
  /** populated-timeline = >1 dated event across distinct days, OR a completed import. */
  populatedTimelineMinDistinctDays: 2,
  /** no-demand reference: events per activated user per cohort-week. */
  noDemandReferenceEventsPerWeek: 1,
  /** trailing window (weeks) over which the no-demand rate is measured. */
  noDemandTrailingWeeks: 4,
} as const;

/** A user's raw, content-blind activity signals, derived from the event stream. */
export interface UserActivity {
  accountId: string;
  signupAt: number; // epoch ms (account confirmed)
  /** Distinct day-keys (yyyy-mm-dd) on which the user saved an event. */
  eventDays: string[];
  /** Whether a bulk import completed (instantly satisfies populated-timeline). */
  importCompleted: boolean;
  /** Whether the user has revisited/navigated their populated timeline. */
  revisited: boolean;
  /** Epoch ms of the user's last activity (event or revisit), or null. */
  lastActivityAt: number | null;
}

/** Widened (mutable) config shape so thresholds can be overridden at call time. */
export interface Config {
  populatedTimelineMinDistinctDays: number;
  noDemandReferenceEventsPerWeek: number;
  noDemandTrailingWeeks: number;
}

/** The furthest funnel stage a user has reached (AC-1), derived, in order. */
export function furthestStage(a: UserActivity, cfg: Config = FUNNEL_DEFAULTS): FunnelStage {
  const distinctDays = new Set(a.eventDays).size;
  const hasFirstEvent = distinctDays >= 1 || a.importCompleted;
  const hasPopulated =
    a.importCompleted || distinctDays >= cfg.populatedTimelineMinDistinctDays;

  // first-revisit requires the user to have something worth revisiting.
  if (hasPopulated && a.revisited) return "first_revisit";
  if (hasPopulated) return "populated_timeline";
  if (hasFirstEvent) return "first_event";
  return "signup";
}

export type Diagnosis = "activated" | "didnt_activate" | "no_demand" | "didnt_retain";

/**
 * Classify a user into the three separable diagnoses (AC-2/AC-2b). "no_demand"
 * is operationalized as events-per-week below the reference over the trailing
 * window — distinguishable in the same read from "didnt_retain".
 */
export function diagnose(
  a: UserActivity,
  nowMs: number,
  cfg: Config = FUNNEL_DEFAULTS,
): Diagnosis {
  const stage = furthestStage(a, cfg);
  if (stage === "signup") return "didnt_activate";

  // Activated but never came back → didn't-retain.
  if (!a.revisited) return "didnt_retain";

  // Activated + retained → check demand (event rate vs reference).
  const weeks = Math.max(1, Math.min(cfg.noDemandTrailingWeeks, weeksSince(a.signupAt, nowMs)));
  const ratePerWeek = new Set(a.eventDays).size / weeks;
  if (ratePerWeek < cfg.noDemandReferenceEventsPerWeek) return "no_demand";
  return "activated";
}

function weeksSince(fromMs: number, nowMs: number): number {
  return (nowMs - fromMs) / (7 * 24 * 60 * 60 * 1000);
}

/** ISO-week-ish signup-week key (UTC year + zero-based week index). */
export function cohortWeek(signupAtMs: number): string {
  const d = new Date(signupAtMs);
  const startOfYear = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.floor((signupAtMs - startOfYear) / (7 * 24 * 60 * 60 * 1000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Whole days since the user's last activity — the early-lapse marker (AC, derived). */
export function daysSinceLastActivity(a: UserActivity, nowMs: number): number {
  if (a.lastActivityAt == null) return Math.floor(weeksSince(a.signupAt, nowMs) * 7);
  return Math.max(0, Math.floor((nowMs - a.lastActivityAt) / (24 * 60 * 60 * 1000)));
}

export interface WeeklyActiveMarker {
  accountId: string;
  cohort_week: string;
  week_offset: number;
  did_create: boolean;
  did_revisit: boolean;
  days_since_last_activity: number;
}

/** Derive a weekly_active cohort marker for a user at a given week offset (AC-4). */
export function weeklyActive(
  a: UserActivity,
  weekOffset: number,
  nowMs: number,
): WeeklyActiveMarker {
  return {
    accountId: a.accountId,
    cohort_week: cohortWeek(a.signupAt),
    week_offset: weekOffset,
    did_create: new Set(a.eventDays).size > 0,
    did_revisit: a.revisited,
    days_since_last_activity: daysSinceLastActivity(a, nowMs),
  };
}
