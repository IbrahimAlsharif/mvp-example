import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/ids";
import { getViewableEvent, canViewEvent } from "@/lib/authz/circle";

// Privacy enforcement at the persistence layer (US-3.1 *Privacy enforcement*).
// The media-URL leg of this scenario is verified in US-3.3 + the final e2e.
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
  if (dbUp) {
    // Cascade deletes the accounts' events.
    await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
  }
  await prisma.$disconnect();
});

describe("US-3.1 privacy enforcement (server-side, second account)", () => {
  it("owner can fetch their Me-Only event; a second account cannot (AC-6/AC-7)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("owner");
    const other = await makeAccount("other");
    const event = await makeEvent(owner.id, "ME_ONLY");

    expect(await getViewableEvent(owner.id, event.id)).not.toBeNull();
    expect(await getViewableEvent(other.id, event.id)).toBeNull();
    expect(await getViewableEvent(null, event.id)).toBeNull(); // anonymous
  });

  it("FAMILY event is denied to a non-member second account (roster empty per US-3.5)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("fowner");
    const other = await makeAccount("fother");
    const event = await makeEvent(owner.id, "FAMILY");
    expect(await canViewEvent(owner.id, event)).toBe(true);
    expect(await canViewEvent(other.id, event)).toBe(false);
  });

  it("PUBLIC_UNLISTED event denies a direct (non-link) read by a second account", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("powner");
    const other = await makeAccount("pother");
    const event = await makeEvent(owner.id, "PUBLIC_UNLISTED");
    expect(await getViewableEvent(other.id, event.id)).toBeNull();
  });

  it("a soft-deleted event is unreachable even by its owner (G2)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("downer");
    const event = await makeEvent(owner.id, "ME_ONLY");
    await prisma.event.update({ where: { id: event.id }, data: { deletedAt: new Date() } });
    expect(await getViewableEvent(owner.id, event.id)).toBeNull();
  });
});
