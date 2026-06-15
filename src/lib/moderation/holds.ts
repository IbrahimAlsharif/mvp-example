import type { ModerationScope } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authorizeAccountAction, type ActorType } from "@/lib/moderation/guard";
import { emit } from "@/lib/telemetry";

/**
 * Moderation hold/appeal/restore lifecycle (US-3.4). Every state change that
 * affects an account/item runs through `authorizeAccountAction` first, so a
 * non-human actor can never apply a hold, clear, restore, or report — and the
 * attempt is recorded (AC-3/AC-6/AC-10).
 *
 * A hold is an ACCESS restriction only: it sets case state, NEVER deletes or
 * locks the media store (G2/G3). The bytes survive holds and survive review;
 * restore is a metadata/access operation. Cases open only from human reports —
 * there is no scanning-driven referral pipeline (AC-1/AC-2).
 */

/** Open a case from a human report (the only source). No scan source exists. */
export async function openCaseFromReport(input: {
  accountId: string;
  eventId?: string | null;
  scope: ModerationScope;
  reviewDueAt?: Date | null;
}) {
  const c = await prisma.moderationCase.create({
    data: {
      accountId: input.accountId,
      eventId: input.eventId ?? null,
      scope: input.scope,
      status: "OPEN",
      source: "human_report",
      reviewDueAt: input.reviewDueAt ?? null,
    },
  });
  emit("moderation_case_opened", { source: "human_report", scope: input.scope.toLowerCase() });
  return c;
}

type HumanAction = "hold" | "clear" | "restore" | "report";

/**
 * A human reviewer acts on a case. The guard rejects any non-human actor before
 * any state changes. The media store is never touched here — only case state and
 * the append-only audit trail.
 */
export async function reviewerAct(input: {
  caseId: string;
  actor: ActorType;
  actorId: string;
  action: HumanAction;
}) {
  // Choke point: throws AutoActionBlocked + emits the defect signal for non-humans.
  authorizeAccountAction({ actor: input.actor, action: input.action });

  const nextStatus = {
    hold: "HELD",
    clear: "CLEARED",
    restore: "CLEARED",
    report: "REPORTED",
  }[input.action] as "HELD" | "CLEARED" | "REPORTED";

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.moderationCase.update({
      where: { id: input.caseId },
      data: {
        status: nextStatus,
        reviewerId: input.actorId,
        restoredAt: input.action === "restore" ? new Date() : undefined,
      },
    });
    await tx.moderationAction.create({
      data: { caseId: c.id, actorType: "human_reviewer", actorId: input.actorId, action: input.action },
    });
    return c;
  });

  if (input.action === "hold") emit("moderation_hold_applied", { scope: updated.scope.toLowerCase() });
  emit("moderation_action_taken", { actor_type: "human", action: input.action });
  if (input.action === "restore") emit("moderation_restore_completed", {});
  return updated;
}

/** The owner appeals — reachable even under an account-scope hold (AC-7). */
export async function submitAppeal(caseId: string) {
  const c = await prisma.moderationCase.update({
    where: { id: caseId },
    data: { status: "APPEALED", appealedAt: new Date() },
  });
  emit("moderation_appeal_submitted", {});
  return c;
}

/**
 * Escalate cases whose human-review window elapsed WITHOUT a decision (AC-12).
 * Never auto-actions and never auto-restores — only flips OPEN/HELD → ESCALATED
 * so the owner can be told a human review is still pending. This is the only
 * "automated" touch, and it is deliberately incapable of any account action
 * (it changes a status to ESCALATED, nothing destructive).
 */
export async function escalateOverdueCases(now: Date): Promise<number> {
  const res = await prisma.moderationCase.updateMany({
    where: { status: { in: ["OPEN", "HELD"] }, reviewDueAt: { lt: now } },
    data: { status: "ESCALATED" },
  });
  return res.count;
}
