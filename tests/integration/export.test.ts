import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/ids";
import { buildAccountExport, verifyExportIntegrity } from "@/lib/events/export";

// US-1.4 export: owner-scoped, manifest integrity, longevity flags, no storageKey.
let dbUp = false;
const accountIds: string[] = [];

async function makeAccount(tag: string) {
  const acc = await prisma.account.create({
    data: { email: `${tag}.${randomToken(6)}@example.com`, status: "ACTIVE", defaultCircle: "ME_ONLY" },
  });
  accountIds.push(acc.id);
  return acc;
}
async function makeEventWithMedia(accountId: string, mime: string) {
  const event = await prisma.event.create({
    data: { accountId, circle: "ME_ONLY", occurredOn: new Date(), submitKey: randomToken(10), note: "x" },
  });
  await prisma.media.create({
    data: {
      accountId, eventId: event.id, publicId: randomToken(16), type: "PHOTO",
      mimeType: mime, storageKey: `sha256/${randomToken(20)}`, checksumSha256: randomToken(32),
      status: "PERSISTED",
    },
  });
  return event;
}

beforeAll(async () => { try { await prisma.$queryRaw`SELECT 1`; dbUp = true; } catch { dbUp = false; } });
afterAll(async () => {
  if (dbUp) await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
  await prisma.$disconnect();
});

describe("US-1.4 open-format export", () => {
  it("exports owner's events with a manifest that self-verifies (AC-4); never leaks storageKey", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("exp");
    await makeEventWithMedia(owner.id, "image/jpeg");
    await makeEventWithMedia(owner.id, "image/heic");

    const data = await buildAccountExport(owner.id);
    expect(data.eventCount).toBe(2);
    expect(data.manifest.mediaCount).toBe(2);
    // Integrity verification finds no problems on a clean export.
    expect(verifyExportIntegrity(data)).toEqual([]);
    // HEIC flagged as a longevity risk; jpeg not.
    expect(data.manifest.longevityRiskCount).toBe(1);
    // The internal storageKey never appears anywhere in the export.
    expect(JSON.stringify(data)).not.toContain("sha256/");
  });

  it("is owner-scoped: another account's events are not in the export", async () => {
    if (!dbUp) return;
    const a = await makeAccount("expA");
    const b = await makeAccount("expB");
    await makeEventWithMedia(a.id, "image/jpeg");
    const bExport = await buildAccountExport(b.id);
    expect(bExport.eventCount).toBe(0);
  });

  it("excludes soft-deleted events (G2 — deleted memories are not resurrected)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("expDel");
    const event = await makeEventWithMedia(owner.id, "image/jpeg");
    await prisma.event.update({ where: { id: event.id }, data: { deletedAt: new Date() } });
    const data = await buildAccountExport(owner.id);
    expect(data.eventCount).toBe(0);
  });
});
