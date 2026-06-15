import type { PrivacyCircle } from "@prisma/client";
import { prisma } from "@/lib/db";
import { acceptedConnectionsByTier } from "@/lib/connections";

/**
 * Change an event's privacy circle after creation (US-3.2). A circle change is
 * the authoritative access rule; this replaces the prior circle atomically and,
 * on a downgrade away from PUBLIC_UNLISTED, revokes the unlisted share links in
 * the SAME transaction (delegating link revocation to the ShareLink layer of
 * US-3.3) so no surface is left half-applied (AC-8/AC-10).
 *
 * The memory itself is never touched (G2): only Event.circle (and link
 * revocation) change; media bytes and the owner's access are preserved (AC-9).
 * Immediate propagation (AC-3/AC-6) is automatic — the media/read authz layer
 * re-checks event.circle on every request, so a former viewer loses access on
 * their next server-validated request with no stale grant.
 */

// Reach ordering. PUBLIC (any authenticated account) is the widest reach and
// ranks above PUBLIC_UNLISTED (link-holders only), so moving PUBLIC->anything is
// a downgrade and anything->PUBLIC is an upgrade.
const RANK: Record<PrivacyCircle, number> = {
  ME_ONLY: 0,
  FAMILY: 1,
  PUBLIC_UNLISTED: 2,
  PUBLIC: 3,
};

/** A change is a downgrade when the target circle is narrower (lower rank). */
export function isDowngrade(from: PrivacyCircle, to: PrivacyCircle): boolean {
  return RANK[to] < RANK[from];
}

export type CircleChangeResult =
  | {
      ok: true;
      from: PrivacyCircle;
      to: PrivacyCircle;
      isDowngrade: boolean;
      linksRevoked: number;
    }
  | { ok: false; reason: "not_found" | "not_owner" | "noop" };

export async function changeEventCircle(input: {
  eventId: string;
  ownerAccountId: string;
  to: PrivacyCircle;
}): Promise<CircleChangeResult> {
  const event = await prisma.event.findUnique({ where: { id: input.eventId } });
  if (!event || event.deletedAt) return { ok: false, reason: "not_found" };
  // Owner-only: a non-owner can never change an event's circle.
  if (event.accountId !== input.ownerAccountId) return { ok: false, reason: "not_owner" };
  const from = event.circle;
  if (from === input.to) return { ok: false, reason: "noop" };

  // Share-links exist ONLY for PUBLIC_UNLISTED (the link-only circle); PUBLIC has
  // no links to revoke. So revocation triggers exactly when leaving
  // PUBLIC_UNLISTED — including PUBLIC_UNLISTED -> PUBLIC, which widens reach but
  // still invalidates the old unlisted links.
  const leavingUnlisted = from === "PUBLIC_UNLISTED" && input.to !== "PUBLIC_UNLISTED";

  // Atomic: update the circle AND revoke any live unlisted links together, so a
  // downgrade can never leave the link valid while the event is tightened.
  const linksRevoked = await prisma.$transaction(async (tx) => {
    await tx.event.update({ where: { id: event.id }, data: { circle: input.to } });
    if (leavingUnlisted) {
      const res = await tx.shareLink.updateMany({
        where: { eventId: event.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return res.count;
    }
    return 0;
  });

  return { ok: true, from, to: input.to, isDowngrade: isDowngrade(from, input.to), linksRevoked };
}

/**
 * The current Family roster size for the owner — the count of members who would
 * gain/keep access to a Family event right now (AC-5 affected-members
 * confirmation; AC-7 re-upgrade uses the CURRENT roster, never a historical one).
 * Count only — no identities (content-blind friendly).
 */
export async function currentFamilyMemberCount(ownerAccountId: string): Promise<number> {
  const { family } = await acceptedConnectionsByTier(ownerAccountId);
  return family.size;
}
