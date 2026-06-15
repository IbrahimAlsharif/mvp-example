/**
 * First-run / revisit nudge selection (J1.9 — the "come back" half of the bet).
 *
 * Pure function so the rule is unit-testable away from the RSC page:
 *  - `welcome` (arrived via /timeline?welcome=1, straight after email-confirm)
 *    always wins → the celebratory first-run nudge.
 *  - otherwise a returning user with a POPULATED timeline (≥2 distinct days) gets
 *    the gentle "welcome back" revisit nudge.
 *  - an empty / single-day timeline gets no nudge here (the empty state has its
 *    own inline prompt), so a brand-new user isn't told "welcome back".
 */
export type NudgeMode = "welcome" | "revisit" | null;

export function pickNudge({
  firstRun,
  isPopulated,
}: {
  firstRun: boolean;
  isPopulated: boolean;
}): NudgeMode {
  if (firstRun) return "welcome";
  if (isPopulated) return "revisit";
  return null;
}

/** A timeline is "populated" once it spans at least two distinct calendar days. */
export function isPopulatedTimeline(occurredOnDays: string[]): boolean {
  return new Set(occurredOnDays).size >= 2;
}
