import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/ids";
import {
  requestConnection,
  acceptConnection,
  declineConnection,
  revokeConnection,
  acceptedConnectionsByTier,
} from "@/lib/connections";
import { canViewEvent } from "@/lib/authz/circle";

// US-3.5 family invitation lifecycle + roster-removal propagation at the
// persistence/authz layer.
let dbUp = false;
const accountIds: string[] = [];

async function makeAccount(tag: string) {
  const acc = await prisma.account.create({
    data: { email: `${tag}.${randomToken(6)}@example.com`, status: "ACTIVE", defaultCircle: "ME_ONLY" },
  });
  accountIds.push(acc.id);
  return acc;
}
async function makeEvent(accountId: string) {
  return prisma.event.create({
    data: { accountId, circle: "FAMILY", occurredOn: new Date(), submitKey: randomToken(10) },
  });
}

beforeAll(async () => {
  try { await prisma.$queryRaw`SELECT 1`; dbUp = true; } catch { dbUp = false; }
});
afterAll(async () => {
  if (dbUp) await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
  await prisma.$disconnect();
});

describe("US-3.5 family invitation lifecycle", () => {
  it("invite → accept grants Family visibility; decline removes the pending edge", async () => {
    if (!dbUp) return;
    const a = await makeAccount("inv_a");
    const b = await makeAccount("inv_b");
    const event = await makeEvent(a.id);

    // Before acceptance, B cannot see A's FAMILY event.
    expect(await canViewEvent(b.id, event)).toBe(false);

    const req = await requestConnection(a.id, b.id, "FAMILY");
    // The requester (A) cannot accept their own request.
    expect(await acceptConnection(req.id, a.id)).toBeNull();
    // The recipient (B) accepts → now B sees A's FAMILY event.
    const accepted = await acceptConnection(req.id, b.id);
    expect(accepted?.status).toBe("ACCEPTED");
    expect(await canViewEvent(b.id, event)).toBe(true);
  });

  it("decline by the recipient removes the pending request (re-invite is fresh)", async () => {
    if (!dbUp) return;
    const a = await makeAccount("dec_a");
    const b = await makeAccount("dec_b");
    const req = await requestConnection(a.id, b.id, "FAMILY");
    // The requester cannot decline their own request.
    expect(await declineConnection(req.id, a.id)).toBe(false);
    expect(await declineConnection(req.id, b.id)).toBe(true);
    // A fresh invite after a decline creates a new edge.
    const again = await requestConnection(a.id, b.id, "FAMILY");
    expect(again.status).toBe("PENDING");
  });

  it("revoking a member propagates immediately: roster removal drops Family access (AC-9, G2)", async () => {
    if (!dbUp) return;
    const a = await makeAccount("rev_a");
    const b = await makeAccount("rev_b");
    const event = await makeEvent(a.id);
    const req = await requestConnection(a.id, b.id, "FAMILY");
    await acceptConnection(req.id, b.id);
    expect(await canViewEvent(b.id, event)).toBe(true);

    // A revokes B. The roster is resolved live, so B loses access immediately.
    expect(await revokeConnection(req.id, a.id)).toBe(true);
    const roster = await acceptedConnectionsByTier(b.id);
    expect(roster.family.has(a.id)).toBe(false);
    expect(await canViewEvent(b.id, event)).toBe(false);
    // The event itself is untouched (G2).
    expect((await prisma.event.findUnique({ where: { id: event.id } }))?.deletedAt).toBeNull();
  });
});
