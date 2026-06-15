import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/ids";
import { changeEventCircle } from "@/lib/events/circle-change";
import { createShareLink, resolveShareLink } from "@/lib/media/share";

// US-3.2 circle change / revocation at the persistence layer.
let dbUp = false;
const accountIds: string[] = [];

async function makeAccount(tag: string) {
  const acc = await prisma.account.create({
    data: { email: `${tag}.${randomToken(6)}@example.com`, status: "ACTIVE", defaultCircle: "ME_ONLY" },
  });
  accountIds.push(acc.id);
  return acc;
}

async function makeEvent(accountId: string, circle: "ME_ONLY" | "FAMILY" | "PUBLIC_UNLISTED") {
  return prisma.event.create({
    data: { accountId, circle, occurredOn: new Date(), submitKey: randomToken(10) },
  });
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
  if (dbUp) await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
  await prisma.$disconnect();
});

describe("US-3.2 circle change & revocation", () => {
  it("owner can change an event's circle; it becomes the authoritative rule (AC-1)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("ccowner");
    const event = await makeEvent(owner.id, "ME_ONLY");
    const res = await changeEventCircle({ eventId: event.id, ownerAccountId: owner.id, to: "FAMILY" });
    expect(res.ok).toBe(true);
    const after = await prisma.event.findUnique({ where: { id: event.id } });
    expect(after?.circle).toBe("FAMILY");
  });

  it("downgrading Public→Me Only revokes the unlisted share link (AC-4)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("ccpub");
    const event = await makeEvent(owner.id, "PUBLIC_UNLISTED");
    const link = await createShareLink(event.id, { ttlHours: 24 });
    expect((await resolveShareLink(link.token)).ok).toBe(true);

    const res = await changeEventCircle({ eventId: event.id, ownerAccountId: owner.id, to: "ME_ONLY" });
    expect(res.ok && res.linksRevoked).toBe(1);
    // The previously-valid link no longer grants access.
    const resolved = await resolveShareLink(link.token);
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe("revoked");
  });

  it("a non-owner cannot change the circle (AC owner-only); memory preserved (G2)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("ccown2");
    const other = await makeAccount("ccother");
    const event = await makeEvent(owner.id, "FAMILY");
    const res = await changeEventCircle({ eventId: event.id, ownerAccountId: other.id, to: "ME_ONLY" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("not_owner");
    // Circle unchanged; event not deleted.
    const after = await prisma.event.findUnique({ where: { id: event.id } });
    expect(after?.circle).toBe("FAMILY");
    expect(after?.deletedAt).toBeNull();
  });

  it("re-upgrade after downgrade uses the current state; no-op when unchanged", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("ccup");
    const event = await makeEvent(owner.id, "FAMILY");
    await changeEventCircle({ eventId: event.id, ownerAccountId: owner.id, to: "ME_ONLY" });
    const reup = await changeEventCircle({ eventId: event.id, ownerAccountId: owner.id, to: "FAMILY" });
    expect(reup.ok).toBe(true);
    const noop = await changeEventCircle({ eventId: event.id, ownerAccountId: owner.id, to: "FAMILY" });
    expect(noop.ok).toBe(false);
    if (!noop.ok) expect(noop.reason).toBe("noop");
  });
});
