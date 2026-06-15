import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/ids";
import { sealCapsule, cancelCapsule, resolveCapsuleAccess, listOwnerCapsules } from "@/lib/capsules";
import { requestConnection, acceptConnection } from "@/lib/connections";
import { buildAccountExport } from "@/lib/events/export";

let dbUp = false;
const accountIds: string[] = [];

async function makeAccount(tag: string) {
  const acc = await prisma.account.create({
    data: { email: `${tag}.${randomToken(6)}@example.com`, status: "ACTIVE", defaultCircle: "ME_ONLY" },
  });
  accountIds.push(acc.id);
  return acc;
}

beforeAll(async () => { try { await prisma.$queryRaw`SELECT 1`; dbUp = true; } catch { dbUp = false; } });
afterAll(async () => {
  if (dbUp) await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
  await prisma.$disconnect();
});

const NOW = Date.UTC(2026, 0, 1, 12);

describe("US-4.2 future capsules", () => {
  it("rejects a past unlock date; accepts a future one (AC-3)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("capown");
    const past = await sealCapsule({
      ownerAccountId: owner.id, type: "LETTER", recipientCircle: "FAMILY",
      unlockLocalDay: "2020-01-01", unlockOffsetMin: 180, nowMs: NOW,
    });
    expect(past.ok).toBe(false);
    if (!past.ok) expect(past.reason).toBe("not_future");

    const future = await sealCapsule({
      ownerAccountId: owner.id, type: "LETTER", note: "for the future", recipientCircle: "FAMILY",
      unlockLocalDay: "2030-01-01", unlockOffsetMin: 180, nowMs: NOW,
    });
    expect(future.ok).toBe(true);
  });

  it("is locked before D and unreachable by the recipient (AC-6 zero pre-D tolerance)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("caplock");
    const member = await makeAccount("capmem");
    const req = await requestConnection(owner.id, member.id, "FAMILY");
    await acceptConnection(req.id, member.id);
    const sealed = await sealCapsule({
      ownerAccountId: owner.id, type: "MESSAGE", recipientCircle: "FAMILY",
      unlockLocalDay: "2030-01-01", unlockOffsetMin: 0, nowMs: NOW,
    });
    expect(sealed.ok).toBe(true);
    if (!sealed.ok) return;

    // Before D: the recipient cannot read it.
    const before = await resolveCapsuleAccess({ capsuleId: sealed.capsule.id, viewerAccountId: member.id, nowMs: NOW });
    expect(before.ok).toBe(false);
    if (!before.ok) expect(before.reason).toBe("locked");

    // At/after D: the current FAMILY member can read it.
    const afterMs = Date.UTC(2030, 0, 1, 1);
    const after = await resolveCapsuleAccess({ capsuleId: sealed.capsule.id, viewerAccountId: member.id, nowMs: afterMs });
    expect(after.ok).toBe(true);
  });

  it("a non-recipient never gets access even after unlock (AC-10 no widening)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("caprej");
    const stranger = await makeAccount("capstr");
    const sealed = await sealCapsule({
      ownerAccountId: owner.id, type: "GOAL", recipientCircle: "FAMILY",
      unlockLocalDay: "2030-01-01", unlockOffsetMin: 0, nowMs: NOW,
    });
    if (!sealed.ok) return;
    const afterMs = Date.UTC(2030, 0, 2);
    const res = await resolveCapsuleAccess({ capsuleId: sealed.capsule.id, viewerAccountId: stranger.id, nowMs: afterMs });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("not_recipient");
  });

  it("cancel withdraws a sealed capsule; a cancelled capsule never unlocks (AC-11)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("capcan");
    const sealed = await sealCapsule({
      ownerAccountId: owner.id, type: "PLAN", recipientCircle: "ME_ONLY",
      unlockLocalDay: "2030-01-01", unlockOffsetMin: 0, nowMs: NOW,
    });
    if (!sealed.ok) return;
    expect(await cancelCapsule(sealed.capsule.id, owner.id)).toBe(true);
    const afterMs = Date.UTC(2030, 0, 2);
    const res = await resolveCapsuleAccess({ capsuleId: sealed.capsule.id, viewerAccountId: owner.id, nowMs: afterMs });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("cancelled");
  });

  it("pending capsules are listed with type/date/recipient; export carries them (AC-8/AC-12)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("caplist");
    await sealCapsule({
      ownerAccountId: owner.id, type: "LETTER", note: "hi future", recipientCircle: "FAMILY",
      unlockLocalDay: "2031-05-05", unlockOffsetMin: 180, nowMs: NOW,
    });
    const list = await listOwnerCapsules(owner.id);
    expect(list).toHaveLength(1);
    expect(list[0].type).toBe("LETTER");
    expect(list[0].unlockLocalDay).toBe("2031-05-05");

    const exp = await buildAccountExport(owner.id);
    expect(exp.capsules).toHaveLength(1);
    expect(exp.capsules[0].note).toBe("hi future");
    expect(exp.capsules[0].unlockLocalDay).toBe("2031-05-05");
  });
});
