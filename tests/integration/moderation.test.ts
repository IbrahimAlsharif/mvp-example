import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/ids";
import { openCaseFromReport, reviewerAct, submitAppeal, escalateOverdueCases } from "@/lib/moderation/holds";
import { AutoActionBlocked } from "@/lib/moderation/guard";

// US-3.4 human-in-the-loop moderation lifecycle at the persistence layer.
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
    data: { accountId, circle: "ME_ONLY", occurredOn: new Date(), submitKey: randomToken(10) },
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

describe("US-3.4 no-auto-ban / human-in-the-loop moderation", () => {
  it("a case opens only from a human report (source=human_report); the memory is untouched (G2)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("modowner");
    const event = await makeEvent(owner.id);
    const c = await openCaseFromReport({ accountId: owner.id, eventId: event.id, scope: "ITEM" });
    expect(c.source).toBe("human_report");
    expect(c.status).toBe("OPEN");
    // The event/media still exist intact — opening a case never deletes (G2).
    const stillThere = await prisma.event.findUnique({ where: { id: event.id } });
    expect(stillThere?.deletedAt).toBeNull();
  });

  it("a human reviewer can hold then clear/restore; the event survives the whole flow (AC-4/5/8)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("modflow");
    const event = await makeEvent(owner.id);
    const c = await openCaseFromReport({ accountId: owner.id, eventId: event.id, scope: "ITEM" });

    const held = await reviewerAct({ caseId: c.id, actor: "human_reviewer", actorId: "rev_1", action: "hold" });
    expect(held.status).toBe("HELD");
    // Hold is access-only — the media store is untouched.
    expect((await prisma.event.findUnique({ where: { id: event.id } }))?.deletedAt).toBeNull();

    const appealed = await submitAppeal(c.id);
    expect(appealed.status).toBe("APPEALED");

    const restored = await reviewerAct({ caseId: c.id, actor: "human_reviewer", actorId: "rev_1", action: "restore" });
    expect(restored.status).toBe("CLEARED");
    expect(restored.restoredAt).not.toBeNull();
    // Memory returns intact.
    expect((await prisma.event.findUnique({ where: { id: event.id } }))?.deletedAt).toBeNull();

    // The human-in-the-loop chain is auditable (AC-9): every action recorded as human.
    const actions = await prisma.moderationAction.findMany({ where: { caseId: c.id } });
    expect(actions.length).toBe(2);
    expect(actions.every((a) => a.actorType === "human_reviewer")).toBe(true);
  });

  it("a non-human actor is BLOCKED at the choke point and records no action (AC-3/AC-10)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("modauto");
    const event = await makeEvent(owner.id);
    const c = await openCaseFromReport({ accountId: owner.id, eventId: event.id, scope: "ACCOUNT" });
    await expect(
      reviewerAct({ caseId: c.id, actor: "automated", actorId: "bot", action: "hold" }),
    ).rejects.toBeInstanceOf(AutoActionBlocked);
    // No state change, no audit entry — the auto-action never executed.
    const after = await prisma.moderationCase.findUnique({ where: { id: c.id } });
    expect(after?.status).toBe("OPEN");
    expect(await prisma.moderationAction.count({ where: { caseId: c.id } })).toBe(0);
  });

  it("overdue cases escalate (never auto-action, never auto-restore) (AC-12)", async () => {
    if (!dbUp) return;
    const owner = await makeAccount("modesc");
    const past = new Date(Date.now() - 60_000);
    const c = await openCaseFromReport({ accountId: owner.id, scope: "ACCOUNT", reviewDueAt: past });
    const n = await escalateOverdueCases(new Date());
    expect(n).toBeGreaterThanOrEqual(1);
    expect((await prisma.moderationCase.findUnique({ where: { id: c.id } }))?.status).toBe("ESCALATED");
  });
});
