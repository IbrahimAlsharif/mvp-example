import type { Capsule, CapsuleType, PrivacyCircle } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canViewEvent } from "@/lib/authz/circle";
import { acceptedConnectionsByTier } from "@/lib/connections";
import { resolveUnlockInstant, isFutureInstant, evaluateUnlock } from "@/lib/capsules/unlock";

/**
 * Future-capsule lifecycle (US-4.2). Date-triggered ONLY — no death-trigger, no
 * heir, no posthumous handoff (G9). Sealing resolves the unlock instant once
 * from the owner's seal-time offset (AC-7) and locks the capsule; pre-unlock
 * content is unreachable (AC-6); cancel withdraws a sealed future capsule (AC-11).
 */

export type SealCapsuleInput = {
  ownerAccountId: string;
  type: CapsuleType;
  note?: string | null;
  recipientCircle: PrivacyCircle;
  unlockLocalDay: string; // yyyy-mm-dd
  unlockOffsetMin: number; // owner's seal-time UTC offset
  nowMs: number;
};

export type SealResult =
  | { ok: true; capsule: Capsule }
  | { ok: false; reason: "bad_date" | "not_future" };

/** Seal a capsule: validate a strictly-future date (AC-3), resolve the absolute
 * unlock instant, and store it locked/pending (AC-5). */
export async function sealCapsule(input: SealCapsuleInput): Promise<SealResult> {
  const unlockAtMs = resolveUnlockInstant(input.unlockLocalDay, input.unlockOffsetMin);
  if (unlockAtMs == null) return { ok: false, reason: "bad_date" };
  if (!isFutureInstant(unlockAtMs, input.nowMs)) return { ok: false, reason: "not_future" };

  const capsule = await prisma.capsule.create({
    data: {
      ownerAccountId: input.ownerAccountId,
      type: input.type,
      note: input.note ?? null,
      recipientCircle: input.recipientCircle,
      unlockLocalDay: input.unlockLocalDay,
      unlockOffsetMin: input.unlockOffsetMin,
      unlockAtMs: BigInt(unlockAtMs),
      status: "SEALED",
    },
  });
  return { ok: true, capsule };
}

/** Cancel a sealed, not-yet-unlocked capsule (AC-11) — owner-only, explicit. */
export async function cancelCapsule(capsuleId: string, ownerAccountId: string): Promise<boolean> {
  const c = await prisma.capsule.findUnique({ where: { id: capsuleId } });
  if (!c || c.ownerAccountId !== ownerAccountId) return false;
  if (c.status !== "SEALED") return false; // can't cancel an already-unlocked/cancelled one
  await prisma.capsule.update({ where: { id: capsuleId }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  return true;
}

/** The owner's pending capsules, with type/date/recipient visible (AC-8). */
export async function listOwnerCapsules(ownerAccountId: string) {
  return prisma.capsule.findMany({
    where: { ownerAccountId, status: { in: ["SEALED", "UNDELIVERABLE"] } },
    orderBy: { unlockAtMs: "asc" },
  });
}

/**
 * Resolve whether a viewer may read a capsule's content right now (AC-6/AC-10).
 * Locked before D (zero pre-D tolerance). At/after D it is readable only by a
 * viewer who is STILL a valid recipient of the CURRENT recipient circle — a
 * removed recipient gains nothing, and unlock never widens access. If no valid
 * recipient remains the capsule is undeliverable (handled by the owner notice).
 */
export async function resolveCapsuleAccess(input: {
  capsuleId: string;
  viewerAccountId: string;
  nowMs: number;
}): Promise<{ ok: true; capsule: Capsule } | { ok: false; reason: "locked" | "not_recipient" | "not_found" | "cancelled" }> {
  const capsule = await prisma.capsule.findUnique({ where: { id: input.capsuleId } });
  if (!capsule) return { ok: false, reason: "not_found" };
  if (capsule.status === "CANCELLED") return { ok: false, reason: "cancelled" };

  const state = evaluateUnlock(Number(capsule.unlockAtMs), input.nowMs);
  if (state === "locked") return { ok: false, reason: "locked" }; // pre-D: unreachable (AC-6)

  // Owner can always read their own capsule.
  if (input.viewerAccountId === capsule.ownerAccountId) return { ok: true, capsule };

  // Otherwise the viewer must be a current member of the recipient circle.
  const permitted = await viewerInRecipientCircle(input.viewerAccountId, capsule.ownerAccountId, capsule.recipientCircle);
  if (!permitted) return { ok: false, reason: "not_recipient" };
  return { ok: true, capsule };
}

/** Whether `viewer` is currently in the owner's recipient circle (live roster). */
async function viewerInRecipientCircle(
  viewerAccountId: string,
  ownerAccountId: string,
  circle: PrivacyCircle,
): Promise<boolean> {
  // Reuse the event access decision against a synthetic event in that circle —
  // the same live-roster enforcement the timeline uses (US-3.1/US-3.5).
  return canViewEvent(viewerAccountId, { accountId: ownerAccountId, circle, deletedAt: null });
}

/**
 * Mark unlocked capsules with no remaining valid recipient as UNDELIVERABLE
 * (AC-10) so the owner is notified rather than a silent drop. Returns the count
 * transitioned. (Date-triggered evaluation; never widens access.)
 */
export async function reconcileUndeliverable(ownerAccountId: string, nowMs: number): Promise<number> {
  const due = await prisma.capsule.findMany({
    where: { ownerAccountId, status: "SEALED" },
  });
  let count = 0;
  for (const c of due) {
    if (evaluateUnlock(Number(c.unlockAtMs), nowMs) === "locked") continue;
    const { family, general } = await acceptedConnectionsByTier(ownerAccountId);
    const hasRecipient =
      c.recipientCircle === "ME_ONLY" || // owner-only "capsule to self"
      c.recipientCircle === "PUBLIC" || // any registered user — always has an audience
      (c.recipientCircle === "FAMILY" && family.size > 0) ||
      (c.recipientCircle === "PUBLIC_UNLISTED" && (family.size > 0 || general.size > 0));
    if (!hasRecipient) {
      await prisma.capsule.update({ where: { id: c.id }, data: { status: "UNDELIVERABLE" } });
      count++;
    }
  }
  return count;
}
