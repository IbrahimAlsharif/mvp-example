import { prisma } from "@/lib/db";
import type { Invitation, Prisma } from "@prisma/client";

/**
 * Invite gating (US-0.1 AC-1/AC-7, guardrail G7).
 *
 * A valid invitation is unexpired and not yet consumed. If the invite is pinned
 * to an email, the signup email must match (case-insensitive). Consumption is
 * atomic with account creation (see consumeInvitationTx) so a failed signup
 * never burns the invite and never leaves an orphan account.
 */
export type InviteCheck =
  | { ok: true; invitation: Invitation }
  | { ok: false; reason: "no_invite" | "invite_expired" | "invite_used" | "email_mismatch" };

export async function checkInvitation(
  token: string | undefined | null,
  email?: string,
): Promise<InviteCheck> {
  if (!token) return { ok: false, reason: "no_invite" };

  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation) return { ok: false, reason: "no_invite" };
  if (invitation.consumedAt) return { ok: false, reason: "invite_used" };
  if (invitation.expiresAt.getTime() <= Date.now()) return { ok: false, reason: "invite_expired" };
  if (
    invitation.email &&
    email &&
    invitation.email.toLowerCase() !== email.toLowerCase()
  ) {
    return { ok: false, reason: "email_mismatch" };
  }
  return { ok: true, invitation };
}

/** Find a valid (unexpired, unconsumed) invitation pinned to this email, if any. */
export async function findValidInvitationByEmail(email: string): Promise<Invitation | null> {
  const invitation = await prisma.invitation.findFirst({
    where: {
      email: { equals: email.toLowerCase(), mode: "insensitive" },
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  return invitation;
}

/**
 * Consume an invitation inside a transaction. Uses a conditional updateMany on
 * consumedAt=null so two concurrent signups can never both consume the same
 * invite (returns count 0 for the loser). Call within prisma.$transaction.
 */
export async function consumeInvitationTx(
  tx: Prisma.TransactionClient,
  invitationId: string,
): Promise<boolean> {
  const res = await tx.invitation.updateMany({
    where: { id: invitationId, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  return res.count === 1;
}
