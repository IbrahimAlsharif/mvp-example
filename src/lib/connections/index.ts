import type { Connection, ConnectionTier } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Typed accessor for the social graph (Connection edges).
 *
 * The load-bearing invariant: a connection is stored ONCE per unordered pair,
 * with `accountAId < accountBId`. Every read/write goes through this module so
 * the canonical ordering is applied in exactly one place and callers never have
 * to think about direction.
 *
 * Visibility semantics the feed relies on (see listVisibleEvents):
 *   - tier FAMILY  → the counterpart may see the author's FAMILY + PUBLIC_UNLISTED events
 *   - tier GENERAL → the counterpart may see only the author's PUBLIC_UNLISTED events
 *   - ME_ONLY events are never shared regardless of any connection
 * The tier applies symmetrically once a connection is ACCEPTED.
 */

/** Canonical unordered-pair ordering: [low, high] by string compare on cuid. */
export function canonicalPair(x: string, y: string): [string, string] {
  return x < y ? [x, y] : [y, x];
}

export class SelfConnectionError extends Error {
  constructor() {
    super("an account cannot connect to itself");
  }
}

/**
 * Look up the single edge between two accounts (in any direction), or null.
 * Order-independent thanks to canonical storage.
 */
export async function findConnection(
  oneAccountId: string,
  otherAccountId: string,
): Promise<Connection | null> {
  if (oneAccountId === otherAccountId) return null;
  const [accountAId, accountBId] = canonicalPair(oneAccountId, otherAccountId);
  return prisma.connection.findUnique({ where: { accountAId_accountBId: { accountAId, accountBId } } });
}

/**
 * Create a PENDING connection request from `requesterId` to `recipientId` at the
 * given tier. Idempotent: if an edge already exists (pending or accepted) it is
 * returned unchanged rather than creating a duplicate (the @@unique would reject
 * it anyway). Throws SelfConnectionError on a self-request.
 */
export async function requestConnection(
  requesterId: string,
  recipientId: string,
  tier: ConnectionTier,
): Promise<Connection> {
  if (requesterId === recipientId) throw new SelfConnectionError();
  const existing = await findConnection(requesterId, recipientId);
  if (existing) return existing;
  const [accountAId, accountBId] = canonicalPair(requesterId, recipientId);
  return prisma.connection.create({
    data: { accountAId, accountBId, tier, status: "PENDING", requestedById: requesterId },
  });
}

/**
 * Accept a pending request. Only the recipient (the account that did NOT send
 * the request) may accept. Returns the updated edge, or null if there is no
 * pending request for this account to accept (already accepted / not found /
 * the caller is the requester).
 */
export async function acceptConnection(
  connectionId: string,
  accepterId: string,
): Promise<Connection | null> {
  const conn = await prisma.connection.findUnique({ where: { id: connectionId } });
  if (!conn) return null;
  if (conn.status !== "PENDING") return null;
  const isMember = conn.accountAId === accepterId || conn.accountBId === accepterId;
  if (!isMember) return null;
  if (conn.requestedById === accepterId) return null; // can't accept your own request
  return prisma.connection.update({
    where: { id: connectionId },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });
}

/** The set of account ids ACCEPTED-connected to `accountId`, grouped by tier. */
export type ConnectionsByTier = { family: Set<string>; general: Set<string> };

/** A connection edge reduced to the fields the tier grouping needs. */
export type TieredEdge = { accountAId: string; accountBId: string; tier: ConnectionTier };

/**
 * Pure reducer: given `accountId` and its edges, return the counterpart ids
 * split by tier (always the OTHER side of each edge). Extracted from the DB
 * accessor so the grouping logic is unit-testable without a database.
 */
export function groupByTier(accountId: string, edges: TieredEdge[]): ConnectionsByTier {
  const family = new Set<string>();
  const general = new Set<string>();
  for (const e of edges) {
    const other = e.accountAId === accountId ? e.accountBId : e.accountAId;
    if (e.tier === "FAMILY") family.add(other);
    else general.add(other);
  }
  return { family, general };
}

/**
 * Fetch every ACCEPTED counterpart of `accountId`, split by tier. This is the
 * single query the feed uses to decide whose events the viewer may see. Indexed
 * by ([accountAId,status]) / ([accountBId,status]) so it stays a two-branch
 * lookup even as the graph grows.
 */
export async function acceptedConnectionsByTier(accountId: string): Promise<ConnectionsByTier> {
  const edges = await prisma.connection.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ accountAId: accountId }, { accountBId: accountId }],
    },
    select: { accountAId: true, accountBId: true, tier: true },
  });
  return groupByTier(accountId, edges);
}

/** Pending incoming requests for `accountId` (ones it can accept). */
export async function pendingIncoming(accountId: string): Promise<Connection[]> {
  return prisma.connection.findMany({
    where: {
      status: "PENDING",
      requestedById: { not: accountId },
      OR: [{ accountAId: accountId }, { accountBId: accountId }],
    },
    orderBy: { createdAt: "desc" },
  });
}
