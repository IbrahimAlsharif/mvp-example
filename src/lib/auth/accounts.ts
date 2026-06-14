import type { Account } from "@prisma/client";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/ids";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  checkInvitation,
  consumeInvitationTx,
  findValidInvitationByEmail,
} from "@/lib/auth/invite";

const CONFIRM_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TTL_MS = 60 * 60 * 1000; // 1h

export type SignupFailure =
  | "no_invite"
  | "invite_expired"
  | "invite_used"
  | "email_mismatch"
  | "duplicate_account";

export type SignupResult =
  | { ok: true; account: Account; confirmToken: string }
  | { ok: false; reason: SignupFailure };

/**
 * Email+password signup (US-0.1 AC-2). Atomic: invitation consumption, account
 * creation (UNCONFIRMED, Me-Only default), the EMAIL identity, and the
 * confirmation token all commit together or not at all — no orphan account if
 * any step fails (AC-7). Duplicate email => routed to sign-in, no 2nd account (AC-5).
 */
export async function signupWithEmail(input: {
  inviteToken: string | null | undefined;
  email: string;
  password: string;
}): Promise<SignupResult> {
  const email = input.email.trim().toLowerCase();

  const invite = await checkInvitation(input.inviteToken, email);
  if (!invite.ok) return { ok: false, reason: invite.reason };

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) return { ok: false, reason: "duplicate_account" };

  const passwordHash = await hashPassword(input.password);
  const confirmToken = randomToken(24);

  try {
    const account = await prisma.$transaction(async (tx) => {
      const consumed = await consumeInvitationTx(tx, invite.invitation.id);
      if (!consumed) throw new InviteRace();

      const acc = await tx.account.create({
        data: {
          email,
          passwordHash,
          status: "UNCONFIRMED",
          defaultCircle: "ME_ONLY", // G1
          invitationId: invite.invitation.id,
          identities: { create: { provider: "EMAIL", providerSub: email } },
          tokens: {
            create: {
              token: confirmToken,
              purpose: "confirm",
              expiresAt: new Date(Date.now() + CONFIRM_TTL_MS),
            },
          },
        },
      });
      return acc;
    });
    return { ok: true, account, confirmToken };
  } catch (e) {
    if (e instanceof InviteRace) return { ok: false, reason: "invite_used" };
    // Unique violation on email (race with a concurrent signup) => duplicate.
    return { ok: false, reason: "duplicate_account" };
  }
}

class InviteRace extends Error {}

/**
 * Social (Google) auth (US-0.1 AC-4/AC-5). The email is provider-verified.
 *  - existing_account: an account with this email already exists. We never
 *    auto-bind a social identity on a verified email alone — the caller routes
 *    the user to sign-in; linking happens only after they authenticate (AC-5).
 *  - created: no account yet AND a valid invitation is pinned to this email →
 *    create an ACTIVE account (email already verified) + GOOGLE identity, atomic
 *    with invite consumption, Me-Only default (G1).
 *  - email_mismatch: no account and no invitation for this email → the user may
 *    be invited under a different address; the caller offers the email-signup
 *    path against their invitation rather than a flat refusal (AC-4).
 */
export async function socialSignupGoogle(
  email: string,
): Promise<
  | { ok: true; status: "created" | "existing_account"; account: Account }
  | { ok: false; reason: "email_mismatch" }
> {
  const lower = email.toLowerCase();
  const existing = await prisma.account.findUnique({ where: { email: lower } });
  if (existing) return { ok: true, status: "existing_account", account: existing };

  const invitation = await findValidInvitationByEmail(lower);
  if (!invitation) return { ok: false, reason: "email_mismatch" };

  try {
    const account = await prisma.$transaction(async (tx) => {
      const consumed = await consumeInvitationTx(tx, invitation.id);
      if (!consumed) throw new InviteRace();
      return tx.account.create({
        data: {
          email: lower,
          status: "ACTIVE", // provider-verified email; no separate confirmation
          defaultCircle: "ME_ONLY", // G1
          invitationId: invitation.id,
          identities: { create: { provider: "GOOGLE", providerSub: lower } },
        },
      });
    });
    return { ok: true, status: "created", account };
  } catch {
    // Lost the invite race or a concurrent account creation — treat as existing.
    const acc = await prisma.account.findUnique({ where: { email: lower } });
    if (acc) return { ok: true, status: "existing_account", account: acc };
    return { ok: false, reason: "email_mismatch" };
  }
}

/**
 * Confirm an account via its single-use token (US-0.1 AC-3, AC-8).
 * Idempotent: clicking an already-used link whose account is ACTIVE lands the
 * user signed-in rather than erroring (AC-8 confirmation race).
 */
export async function confirmAccount(
  token: string,
): Promise<{ ok: true; account: Account } | { ok: false; reason: "invalid" | "expired" }> {
  const row = await prisma.emailToken.findUnique({
    where: { token },
    include: { account: true },
  });
  if (!row || row.purpose !== "confirm") return { ok: false, reason: "invalid" };

  if (row.usedAt) {
    // Already consumed — only OK if it actually confirmed the account.
    if (row.account.status === "ACTIVE") return { ok: true, account: row.account };
    return { ok: false, reason: "invalid" };
  }
  if (row.expiresAt.getTime() <= Date.now()) return { ok: false, reason: "expired" };

  const account = await prisma.$transaction(async (tx) => {
    await tx.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    return tx.account.update({
      where: { id: row.accountId },
      data: { status: "ACTIVE" },
    });
  });
  return { ok: true, account };
}

/** Re-issue a confirmation token for an unconfirmed account (AC-8 resend). */
export async function resendConfirmation(
  email: string,
): Promise<{ ok: true; confirmToken: string } | { ok: false }> {
  const account = await prisma.account.findUnique({ where: { email: email.toLowerCase() } });
  if (!account || account.status === "ACTIVE") return { ok: false };
  const confirmToken = randomToken(24);
  await prisma.emailToken.create({
    data: {
      accountId: account.id,
      token: confirmToken,
      purpose: "confirm",
      expiresAt: new Date(Date.now() + CONFIRM_TTL_MS),
    },
  });
  return { ok: true, confirmToken };
}

/** Sign in a returning email user (US-0.1). Must be ACTIVE. */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ ok: true; account: Account } | { ok: false; reason: "invalid" | "unconfirmed" }> {
  const account = await prisma.account.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!account || !account.passwordHash) return { ok: false, reason: "invalid" };
  const valid = await verifyPassword(account.passwordHash, password);
  if (!valid) return { ok: false, reason: "invalid" };
  if (account.status !== "ACTIVE") return { ok: false, reason: "unconfirmed" };
  return { ok: true, account };
}

/**
 * Request a password reset (US-0.1 AC-12). Returns ok regardless of whether the
 * account exists, to avoid account enumeration. confirmToken is non-null only
 * when a real reset token was minted (dev path emails/logs it).
 */
export async function requestPasswordReset(
  email: string,
): Promise<{ resetToken: string | null }> {
  const account = await prisma.account.findUnique({ where: { email: email.toLowerCase() } });
  if (!account || account.status !== "ACTIVE") return { resetToken: null };
  const resetToken = randomToken(24);
  await prisma.emailToken.create({
    data: {
      accountId: account.id,
      token: resetToken,
      purpose: "reset",
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });
  return { resetToken };
}

/**
 * Complete a password reset (US-0.1 AC-12). Single-use, expiring token; never
 * creates a second account; an expired/used/invalid token is a clear failure
 * and never silently resets.
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ ok: true; account: Account } | { ok: false; reason: "invalid" | "expired" }> {
  const row = await prisma.emailToken.findUnique({ where: { token }, include: { account: true } });
  if (!row || row.purpose !== "reset" || row.usedAt) return { ok: false, reason: "invalid" };
  if (row.expiresAt.getTime() <= Date.now()) return { ok: false, reason: "expired" };

  const passwordHash = await hashPassword(newPassword);
  const account = await prisma.$transaction(async (tx) => {
    await tx.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    // Revoke all existing sessions on password change (defense in depth).
    await tx.session.updateMany({
      where: { accountId: row.accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return tx.account.update({ where: { id: row.accountId }, data: { passwordHash } });
  });
  return { ok: true, account };
}
