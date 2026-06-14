import { cookies } from "next/headers";
import type { Account } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { randomToken, sha256Hex } from "@/lib/ids";

export const SESSION_COOKIE = "htn_session";

/**
 * Server-side sessions (US-0.1 AC-6/AC-9/AC-11).
 *
 * The cookie carries a 128-bit random token; the DB stores only its SHA-256
 * hash, so a DB leak cannot mint valid sessions. Each device gets its own
 * Session row resolving to the same account (cross-device). Sign-out sets
 * revokedAt; validation rejects revoked/expired rows server-side.
 */
export async function createSession(accountId: string): Promise<void> {
  const raw = randomToken(32); // 256-bit session token
  const tokenHash = sha256Hex(raw);
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({ data: { accountId, tokenHash, expiresAt } });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Returns the authenticated account, or null. Never throws on absence. */
export async function getCurrentAccount(): Promise<Account | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const tokenHash = sha256Hex(raw);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { account: true },
  });
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  return session.account;
}

/**
 * Require an authenticated, ACTIVE account. Throws Unauthorized — callers in
 * route handlers map this to a 401; server components redirect to /signin.
 */
export class Unauthorized extends Error {}

export async function requireAccount(): Promise<Account> {
  const account = await getCurrentAccount();
  if (!account || account.status !== "ACTIVE") throw new Unauthorized();
  return account;
}

/** Server-side sign-out: revoke the current session row and clear the cookie. */
export async function revokeCurrentSession(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    const tokenHash = sha256Hex(raw);
    await prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  jar.delete(SESSION_COOKIE);
}
