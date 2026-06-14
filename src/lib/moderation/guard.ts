/**
 * The SINGLE enforcement choke point for any account-affecting action (US-3.4
 * AC-10, guardrail G3). Every code path that would delete, lock, suspend, or ban
 * an account or its memories MUST pass through `authorizeAccountAction`, which
 * rejects any caller whose actor is not a human reviewer and records the rejected
 * attempt — so a regression that introduces an auto-action is blocked at attempt
 * time, not discovered after damage.
 *
 * By construction this makes the catastrophic risk impossible: no automated
 * scan exists (none is built — G3), and even if some future signal tried to act,
 * it cannot pass this gate. Holds are access-only and never touch the media
 * store (enforced separately in lib/moderation/holds).
 */
import { emit } from "@/lib/telemetry";

export type ActorType = "human_reviewer" | "automated" | "system_job";

export type AccountAction = "hold" | "clear" | "restore" | "report" | "delete" | "lock" | "suspend" | "ban";

/** Only a human reviewer may take an account-affecting action (AC-3/AC-6/AC-10). */
export function isHumanActor(actor: ActorType): boolean {
  return actor === "human_reviewer";
}

export class AutoActionBlocked extends Error {
  constructor(public action: AccountAction) {
    super(`automated actor blocked from account action "${action}" (US-3.4 AC-10)`);
  }
}

/**
 * Authorize an account-affecting action. Returns normally only for a human
 * reviewer. For any non-human actor it records the content-blind
 * `moderation_auto_action_blocked` signal (whose mere presence is a defect
 * indicator) and throws — the action never executes.
 */
export function authorizeAccountAction(input: {
  actor: ActorType;
  action: AccountAction;
}): void {
  if (isHumanActor(input.actor)) return;
  emit("moderation_auto_action_blocked", { attempted_action: input.action });
  throw new AutoActionBlocked(input.action);
}
