import type { Prisma, ShareLink } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { randomToken } from "@/lib/ids";

/**
 * Unlisted share links for PUBLIC_UNLISTED events (US-3.3 AC-5/AC-6/AC-7).
 *
 * Tokens are ≥128-bit non-guessable and non-discoverable (they appear in no
 * index/feed/sitemap). Every link carries a bounded expiry — owner-set or a
 * bounded default — so no link is a permanent bearer credential. Revocation
 * sets revokedAt; because each media GET re-validates the link and mints a fresh
 * ≤10-min presign, a revoked link stops granting access within one presign TTL,
 * and no cached object outlives its grant.
 */
export async function createShareLink(
  eventId: string,
  opts?: { ttlHours?: number; tx?: Prisma.TransactionClient },
): Promise<ShareLink> {
  const db = opts?.tx ?? prisma;
  const ttlHours = opts?.ttlHours ?? env.SHARE_LINK_DEFAULT_TTL_HOURS;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  return db.shareLink.create({
    data: { eventId, token: randomToken(16), expiresAt },
  });
}

export async function revokeShareLink(token: string): Promise<void> {
  await prisma.shareLink.updateMany({
    where: { token, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export type ShareResolution =
  | { ok: true; link: ShareLink }
  | { ok: false; reason: "not_found" | "revoked" | "expired" };

/** Validate a share token server-side (US-3.3 AC-6/AC-7). Never trusts the client. */
export async function resolveShareLink(token: string): Promise<ShareResolution> {
  const link = await prisma.shareLink.findUnique({ where: { token } });
  if (!link) return { ok: false, reason: "not_found" };
  if (link.revokedAt) return { ok: false, reason: "revoked" };
  if (link.expiresAt.getTime() <= Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, link };
}
