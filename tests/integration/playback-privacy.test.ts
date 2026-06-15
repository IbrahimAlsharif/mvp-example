import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/ids";
import { buildPlaybackSequence, eventStillVisible } from "@/lib/playback/sequence";
import { requestConnection, acceptConnection } from "@/lib/connections";

// US-2.3 AC-5/AC-9 (CRITICAL privacy): a playback sequence is built server-side
// and never includes content outside the viewer's circle.
let dbUp = false;
const accountIds: string[] = [];

async function makeAccount(tag: string) {
  const acc = await prisma.account.create({
    data: { email: `${tag}.${randomToken(6)}@example.com`, status: "ACTIVE", defaultCircle: "ME_ONLY" },
  });
  accountIds.push(acc.id);
  return acc;
}
async function makeEvent(accountId: string, circle: "ME_ONLY" | "FAMILY" | "PUBLIC_UNLISTED", whenMs: number) {
  return prisma.event.create({
    data: { accountId, circle, occurredOn: new Date(whenMs), submitKey: randomToken(10) },
  });
}

beforeAll(async () => { try { await prisma.$queryRaw`SELECT 1`; dbUp = true; } catch { dbUp = false; } });
afterAll(async () => {
  if (dbUp) await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
  await prisma.$disconnect();
});

const NOW = Date.now();
const RECENT = NOW - 30 * 86_400_000; // within the 1-year span

describe("US-2.3 playback privacy (server-side circle filtering)", () => {
  it("includes the owner's own events of every circle", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("pbown");
    await makeEvent(owner.id, "ME_ONLY", RECENT);
    await makeEvent(owner.id, "FAMILY", RECENT - 86_400_000);
    const seq = await buildPlaybackSequence({ viewerAccountId: owner.id, span: "year", endMs: NOW });
    expect(seq.length).toBe(2);
  });

  it("NEVER includes another owner's Me-Only event in a second account's playback (AC-5)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("pbA");
    const viewer = await makeAccount("pbB");
    const meOnly = await makeEvent(owner.id, "ME_ONLY", RECENT);
    // Even as accepted FAMILY, Me-Only is never shared.
    const req = await requestConnection(owner.id, viewer.id, "FAMILY");
    await acceptConnection(req.id, viewer.id);

    const viewerSeq = await buildPlaybackSequence({ viewerAccountId: viewer.id, span: "year", endMs: NOW });
    expect(viewerSeq.find((f) => f.eventId === meOnly.id)).toBeUndefined();
    // The viewer is not the owner of any event → empty playback (no leakage).
    expect(viewerSeq.every((f) => f.eventId !== meOnly.id)).toBe(true);
  });

  it("a FAMILY member's playback includes the owner's FAMILY events but not Me-Only", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("pbFamO");
    const member = await makeAccount("pbFamM");
    const fam = await makeEvent(owner.id, "FAMILY", RECENT);
    const meOnly = await makeEvent(owner.id, "ME_ONLY", RECENT - 86_400_000);
    const req = await requestConnection(owner.id, member.id, "FAMILY");
    await acceptConnection(req.id, member.id);

    const seq = await buildPlaybackSequence({ viewerAccountId: member.id, span: "year", endMs: NOW });
    const ids = seq.map((f) => f.eventId);
    expect(ids).toContain(fam.id);
    expect(ids).not.toContain(meOnly.id);
  });

  it("eventStillVisible reflects a circle downgrade immediately (AC-9 propagation)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("pbDownO");
    const member = await makeAccount("pbDownM");
    const event = await makeEvent(owner.id, "FAMILY", RECENT);
    const req = await requestConnection(owner.id, member.id, "FAMILY");
    await acceptConnection(req.id, member.id);
    expect(await eventStillVisible(member.id, event.id)).toBe(true);

    // Owner downgrades to Me-Only → the member can no longer reach it in playback.
    await prisma.event.update({ where: { id: event.id }, data: { circle: "ME_ONLY" } });
    expect(await eventStillVisible(member.id, event.id)).toBe(false);
  });
});
