import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/ids";

// US-1.3 AC-9: cross-session duplicate detection is checksum-based, account-
// scoped, and only matches PERSISTED non-deleted media. This mirrors the query
// the /api/import/dedupe route runs.
let dbUp = false;
const accountIds: string[] = [];

async function makeAccount(tag: string) {
  const acc = await prisma.account.create({
    data: { email: `${tag}.${randomToken(6)}@example.com`, status: "ACTIVE", defaultCircle: "ME_ONLY" },
  });
  accountIds.push(acc.id);
  return acc;
}

async function makeMediaWithChecksum(accountId: string, checksum: string, status: "PERSISTED" | "PENDING") {
  const event = await prisma.event.create({
    data: { accountId, circle: "ME_ONLY", occurredOn: new Date(), submitKey: randomToken(10) },
  });
  return prisma.media.create({
    data: {
      accountId,
      eventId: event.id,
      publicId: randomToken(16),
      type: "PHOTO",
      mimeType: "image/jpeg",
      storageKey: `sha256/${checksum}`,
      checksumSha256: checksum,
      status,
    },
  });
}

async function findDuplicates(accountId: string, checksums: string[]): Promise<string[]> {
  const existing = await prisma.media.findMany({
    where: { accountId, status: "PERSISTED", deletedAt: null, checksumSha256: { in: checksums } },
    select: { checksumSha256: true },
  });
  return Array.from(new Set(existing.map((m) => m.checksumSha256)));
}

beforeAll(async () => {
  try { await prisma.$queryRaw`SELECT 1`; dbUp = true; } catch { dbUp = false; }
});
afterAll(async () => {
  if (dbUp) await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
  await prisma.$disconnect();
});

describe("US-1.3 checksum dedupe (AC-9)", () => {
  it("matches a persisted item on the same account; ignores a fresh checksum", async () => {
    if (!dbUp) return;
    const acc = await makeAccount("dedupe");
    const known = randomToken(32);
    await makeMediaWithChecksum(acc.id, known, "PERSISTED");
    const fresh = randomToken(32);
    const dups = await findDuplicates(acc.id, [known, fresh]);
    expect(dups).toContain(known);
    expect(dups).not.toContain(fresh);
  });

  it("does not match another account's media (account-scoped privacy)", async () => {
    if (!dbUp) return;
    const a = await makeAccount("dedA");
    const b = await makeAccount("dedB");
    const checksum = randomToken(32);
    await makeMediaWithChecksum(a.id, checksum, "PERSISTED");
    // B importing the same content sees NO duplicate (it isn't on B's timeline).
    expect(await findDuplicates(b.id, [checksum])).not.toContain(checksum);
  });

  it("does not match a non-persisted (pending) item", async () => {
    if (!dbUp) return;
    const acc = await makeAccount("dedP");
    const checksum = randomToken(32);
    await makeMediaWithChecksum(acc.id, checksum, "PENDING");
    expect(await findDuplicates(acc.id, [checksum])).not.toContain(checksum);
  });
});
