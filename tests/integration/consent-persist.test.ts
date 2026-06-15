import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/ids";
import { createEvent } from "@/lib/events/create";
import { buildAccountExport } from "@/lib/events/export";

// US-4.1: the tri-state consent + timestamp persist ATOMICALLY with the event,
// and export carries them intact.
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

describe("US-4.1 consent persistence + export", () => {
  it("default (boolean false) persists UNSET with no timestamp (AC-2)", async () => {
    if (!dbUp) return;
    const acc = await makeAccount("cuns");
    const res = await createEvent({
      accountId: acc.id, note: "x", occurredOn: new Date(), circle: "ME_ONLY",
      legacyConsent: false, mediaPublicIds: [], submitKey: randomToken(10),
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const e = await prisma.event.findUnique({ where: { id: res.event.id } });
      expect(e?.legacyConsentValue).toBe("UNSET");
      expect(e?.legacyConsentAt).toBeNull();
    }
  });

  it("an explicit GRANTED persists with an ISO-8601 timestamp (AC-3)", async () => {
    if (!dbUp) return;
    const acc = await makeAccount("cgr");
    const res = await createEvent({
      accountId: acc.id, note: "x", occurredOn: new Date(), circle: "FAMILY",
      legacyConsent: true, legacyConsentValue: "GRANTED", mediaPublicIds: [], submitKey: randomToken(10),
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const e = await prisma.event.findUnique({ where: { id: res.event.id } });
      expect(e?.legacyConsentValue).toBe("GRANTED");
      expect(e?.legacyConsentAt).toBeInstanceOf(Date);
    }
  });

  it("per-item independence: one event's consent does not change another's (AC-4)", async () => {
    if (!dbUp) return;
    const acc = await makeAccount("cind");
    const a = await createEvent({
      accountId: acc.id, note: "a", occurredOn: new Date(), circle: "FAMILY",
      legacyConsent: false, legacyConsentValue: "GRANTED", mediaPublicIds: [], submitKey: randomToken(10),
    });
    const b = await createEvent({
      accountId: acc.id, note: "b", occurredOn: new Date(), circle: "FAMILY",
      legacyConsent: false, legacyConsentValue: "DENIED", mediaPublicIds: [], submitKey: randomToken(10),
    });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      const ea = await prisma.event.findUnique({ where: { id: a.event.id } });
      const eb = await prisma.event.findUnique({ where: { id: b.event.id } });
      expect(ea?.legacyConsentValue).toBe("GRANTED");
      expect(eb?.legacyConsentValue).toBe("DENIED");
    }
  });

  it("export carries the consent value + timestamp intact (AC-7)", async () => {
    if (!dbUp) return;
    const acc = await makeAccount("cexp");
    await createEvent({
      accountId: acc.id, note: "x", occurredOn: new Date(), circle: "FAMILY",
      legacyConsent: false, legacyConsentValue: "DENIED", mediaPublicIds: [], submitKey: randomToken(10),
    });
    const exp = await buildAccountExport(acc.id);
    expect(exp.events).toHaveLength(1);
    expect(exp.events[0].legacyConsentValue).toBe("DENIED");
    expect(exp.events[0].legacyConsentAt).not.toBeNull();
  });
});
