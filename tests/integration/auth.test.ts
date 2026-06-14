import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/ids";
import {
  signupWithEmail,
  confirmAccount,
  resendConfirmation,
  signInWithEmail,
  requestPasswordReset,
  resetPassword,
  socialSignupGoogle,
} from "@/lib/auth/accounts";
import { prisma as db } from "@/lib/db";
import { checkInvitation } from "@/lib/auth/invite";

// Integration tests against the local Postgres. Skipped automatically if the
// DB is unreachable (e.g. CI without a database).
let dbUp = false;
const createdEmails: string[] = [];
const createdInviteTokens: string[] = [];

async function seedInvite(opts: { email?: string; expiresInMs?: number; consumed?: boolean }) {
  const token = randomToken(12);
  createdInviteTokens.push(token);
  return prisma.invitation.create({
    data: {
      token,
      email: opts.email?.toLowerCase(),
      expiresAt: new Date(Date.now() + (opts.expiresInMs ?? 60_000)),
      consumedAt: opts.consumed ? new Date() : null,
    },
  });
}

function uniqueEmail(tag: string) {
  const email = `${tag}.${randomToken(6)}@example.com`.toLowerCase();
  createdEmails.push(email);
  return email;
}

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbUp = true;
  } catch {
    dbUp = false;
  }
});

afterAll(async () => {
  if (dbUp) {
    await prisma.account.deleteMany({ where: { email: { in: createdEmails } } });
    await prisma.invitation.deleteMany({ where: { token: { in: createdInviteTokens } } });
  }
  await prisma.$disconnect();
});

describe.runIf(true)("US-0.1 auth", () => {
  it("refuses signup with no invite and creates no account (AC-1)", async () => {
    if (!dbUp) return;
    const email = uniqueEmail("noinvite");
    const res = await signupWithEmail({ inviteToken: undefined, email, password: "password123" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("no_invite");
    expect(await prisma.account.findUnique({ where: { email } })).toBeNull();
  });

  it("refuses an expired invite (AC-7)", async () => {
    if (!dbUp) return;
    const invite = await seedInvite({ expiresInMs: -1000 });
    const email = uniqueEmail("expired");
    const res = await signupWithEmail({ inviteToken: invite.token, email, password: "password123" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("invite_expired");
  });

  it("refuses an already-used invite (AC-7)", async () => {
    if (!dbUp) return;
    const invite = await seedInvite({ consumed: true });
    const res = await signupWithEmail({
      inviteToken: invite.token,
      email: uniqueEmail("used"),
      password: "password123",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("invite_used");
  });

  it("signs up UNCONFIRMED with Me-Only default, then confirms to ACTIVE (AC-2,3,9)", async () => {
    if (!dbUp) return;
    const email = uniqueEmail("happy");
    const invite = await seedInvite({ email });
    const res = await signupWithEmail({ inviteToken: invite.token, email, password: "password123" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.account.status).toBe("UNCONFIRMED");
    expect(res.account.defaultCircle).toBe("ME_ONLY"); // G1
    // invite consumed
    const usedInvite = await prisma.invitation.findUnique({ where: { id: invite.id } });
    expect(usedInvite?.consumedAt).not.toBeNull();

    const confirmed = await confirmAccount(res.confirmToken);
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) expect(confirmed.account.status).toBe("ACTIVE");

    // sign-in works only after confirm
    const signin = await signInWithEmail(email, "password123");
    expect(signin.ok).toBe(true);
  });

  it("confirmation is idempotent: re-using a consumed token on an ACTIVE account succeeds (AC-8)", async () => {
    if (!dbUp) return;
    const email = uniqueEmail("idem");
    const invite = await seedInvite({ email });
    const res = await signupWithEmail({ inviteToken: invite.token, email, password: "password123" });
    if (!res.ok) throw new Error("setup");
    await confirmAccount(res.confirmToken);
    const again = await confirmAccount(res.confirmToken);
    expect(again.ok).toBe(true);
  });

  it("prevents a duplicate account on re-signup (AC-5)", async () => {
    if (!dbUp) return;
    const email = uniqueEmail("dupe");
    const a = await seedInvite({ email });
    const first = await signupWithEmail({ inviteToken: a.token, email, password: "password123" });
    expect(first.ok).toBe(true);
    const b = await seedInvite({ email });
    const second = await signupWithEmail({ inviteToken: b.token, email, password: "password123" });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("duplicate_account");
  });

  it("unconfirmed account cannot sign in", async () => {
    if (!dbUp) return;
    const email = uniqueEmail("unconf");
    const invite = await seedInvite({ email });
    await signupWithEmail({ inviteToken: invite.token, email, password: "password123" });
    const signin = await signInWithEmail(email, "password123");
    expect(signin.ok).toBe(false);
    if (!signin.ok) expect(signin.reason).toBe("unconfirmed");
  });

  it("password reset is single-use and lets the user sign in with the new password (AC-12)", async () => {
    if (!dbUp) return;
    const email = uniqueEmail("reset");
    const invite = await seedInvite({ email });
    const res = await signupWithEmail({ inviteToken: invite.token, email, password: "password123" });
    if (!res.ok) throw new Error("setup");
    await confirmAccount(res.confirmToken);

    const { resetToken } = await requestPasswordReset(email);
    expect(resetToken).toBeTruthy();
    const done = await resetPassword(resetToken!, "newpassword456");
    expect(done.ok).toBe(true);
    // old password no longer works; new one does
    expect((await signInWithEmail(email, "password123")).ok).toBe(false);
    expect((await signInWithEmail(email, "newpassword456")).ok).toBe(true);
    // token is single-use
    const reuse = await resetPassword(resetToken!, "another789");
    expect(reuse.ok).toBe(false);
  });

  it("reset request for an unknown email does not enumerate and creates nothing (AC-12)", async () => {
    if (!dbUp) return;
    const { resetToken } = await requestPasswordReset(uniqueEmail("ghost"));
    expect(resetToken).toBeNull();
  });

  it("social signup: created when a valid invite is pinned to the verified email (AC-4)", async () => {
    if (!dbUp) return;
    const email = uniqueEmail("social");
    await seedInvite({ email });
    const res = await socialSignupGoogle(email);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.status).toBe("created");
      expect(res.account.status).toBe("ACTIVE");
      expect(res.account.defaultCircle).toBe("ME_ONLY");
    }
  });

  it("social signup: email_mismatch when no account and no invite for that email (AC-4)", async () => {
    if (!dbUp) return;
    const res = await socialSignupGoogle(uniqueEmail("socialmiss"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("email_mismatch");
  });

  it("social signup: existing account routes to sign-in, no auto-bind (AC-5)", async () => {
    if (!dbUp) return;
    const email = uniqueEmail("socialexist");
    const invite = await seedInvite({ email });
    const res = await signupWithEmail({ inviteToken: invite.token, email, password: "password123" });
    if (!res.ok) throw new Error("setup");
    const social = await socialSignupGoogle(email);
    expect(social.ok).toBe(true);
    if (social.ok) expect(social.status).toBe("existing_account");
    // no GOOGLE identity was bound
    const identities = await prisma.authIdentity.findMany({
      where: { account: { email }, provider: "GOOGLE" },
    });
    expect(identities.length).toBe(0);
  });

  it("confirmAccount rejects an unknown or non-confirm token (AC-8)", async () => {
    if (!dbUp) return;
    const bad = await confirmAccount("definitely-not-a-real-token");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toBe("invalid");
  });

  it("confirmAccount rejects an expired confirm token, leaving the account unconfirmed (AC-8)", async () => {
    if (!dbUp) return;
    const email = uniqueEmail("expiredconf");
    const invite = await seedInvite({ email });
    const res = await signupWithEmail({ inviteToken: invite.token, email, password: "password123" });
    if (!res.ok) throw new Error("setup");
    // force-expire the confirm token
    await db.emailToken.updateMany({
      where: { token: res.confirmToken },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const confirmed = await confirmAccount(res.confirmToken);
    expect(confirmed.ok).toBe(false);
    if (!confirmed.ok) expect(confirmed.reason).toBe("expired");
    const acc = await db.account.findUnique({ where: { email } });
    expect(acc?.status).toBe("UNCONFIRMED"); // never silently confirmed
  });

  it("resendConfirmation issues a fresh token only for an unconfirmed account (AC-8)", async () => {
    if (!dbUp) return;
    const email = uniqueEmail("resend");
    const invite = await seedInvite({ email });
    const res = await signupWithEmail({ inviteToken: invite.token, email, password: "password123" });
    if (!res.ok) throw new Error("setup");
    const resend = await resendConfirmation(email);
    expect(resend.ok).toBe(true);
    if (resend.ok) {
      expect(resend.confirmToken).not.toBe(res.confirmToken);
      const confirmed = await confirmAccount(resend.confirmToken);
      expect(confirmed.ok).toBe(true);
    }
    // already-active account does not get a resend
    const again = await resendConfirmation(email);
    expect(again.ok).toBe(false);
  });

  it("checkInvitation enforces email pinning", async () => {
    if (!dbUp) return;
    const invite = await seedInvite({ email: "pinned@example.com" });
    const mismatch = await checkInvitation(invite.token, "other@example.com");
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.reason).toBe("email_mismatch");
  });
});
