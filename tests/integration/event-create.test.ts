import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/ids";
import { createEvent, listOwnEvents, softDeleteEvent } from "@/lib/events/create";

// US-1.1 atomic event create. DB integration (no S3 needed — media rows are
// created directly in the PERSISTED state the upload contract would produce).
let dbUp = false;
const accountIds: string[] = [];

async function account(tag: string) {
  const a = await prisma.account.create({
    data: { email: `ev.${tag}.${randomToken(5)}@example.com`, status: "ACTIVE", defaultCircle: "ME_ONLY" },
  });
  accountIds.push(a.id);
  return a;
}
async function persistedMedia(accountId: string) {
  const checksum = randomToken(16);
  return prisma.media.create({
    data: {
      publicId: randomToken(16),
      accountId,
      type: "PHOTO",
      mimeType: "image/jpeg",
      storageKey: `sha256/${checksum}`,
      checksumSha256: checksum,
      status: "PERSISTED",
    },
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

describe("US-1.1 event create", () => {
  it("creates a Me-Only event with circle + consent stored atomically (AC-9/G1)", async () => {
    if (!dbUp) return;
    const acc = await account("me");
    const m = await persistedMedia(acc.id);
    const res = await createEvent({
      accountId: acc.id,
      note: "first memory",
      occurredOn: new Date("2020-01-15T12:00:00Z"),
      circle: "ME_ONLY",
      legacyConsent: true,
      mediaPublicIds: [m.publicId],
      submitKey: randomToken(12),
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.event.circle).toBe("ME_ONLY");
      expect(res.event.legacyConsent).toBe(true);
      const attached = await prisma.media.findUnique({ where: { id: m.id } });
      expect(attached?.eventId).toBe(res.event.id); // media attached in the same tx
    }
  });

  it("note-only event is valid (AC-2)", async () => {
    if (!dbUp) return;
    const acc = await account("note");
    const res = await createEvent({
      accountId: acc.id,
      note: "no media, just words",
      occurredOn: new Date(),
      circle: "ME_ONLY",
      legacyConsent: false,
      mediaPublicIds: [],
      submitKey: randomToken(12),
    });
    expect(res.ok).toBe(true);
  });

  it("rejects an empty event (no note, no media)", async () => {
    if (!dbUp) return;
    const acc = await account("empty");
    const res = await createEvent({
      accountId: acc.id,
      note: "   ",
      occurredOn: new Date(),
      circle: "ME_ONLY",
      legacyConsent: false,
      mediaPublicIds: [],
      submitKey: randomToken(12),
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("empty_event");
  });

  it("is idempotent on a duplicate submitKey — exactly one event (AC-8)", async () => {
    if (!dbUp) return;
    const acc = await account("idem");
    const submitKey = randomToken(12);
    const a = await createEvent({
      accountId: acc.id, note: "dbl", occurredOn: new Date(), circle: "ME_ONLY",
      legacyConsent: false, mediaPublicIds: [], submitKey,
    });
    const b = await createEvent({
      accountId: acc.id, note: "dbl", occurredOn: new Date(), circle: "ME_ONLY",
      legacyConsent: false, mediaPublicIds: [], submitKey,
    });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(b.idempotentReplay).toBe(true);
      expect(b.event.id).toBe(a.event.id);
    }
    const count = await prisma.event.count({ where: { accountId: acc.id } });
    expect(count).toBe(1);
  });

  it("rolls back fully when a referenced media is not persisted — no orphan event (AC-7)", async () => {
    if (!dbUp) return;
    const acc = await account("rollback");
    const pending = await prisma.media.create({
      data: {
        publicId: randomToken(16), accountId: acc.id, type: "PHOTO", mimeType: "image/jpeg",
        storageKey: `sha256/${randomToken(16)}`, checksumSha256: randomToken(16), status: "PENDING",
      },
    });
    const res = await createEvent({
      accountId: acc.id, note: "should fail", occurredOn: new Date(), circle: "ME_ONLY",
      legacyConsent: false, mediaPublicIds: [pending.publicId], submitKey: randomToken(12),
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("media_not_persisted");
    expect(await prisma.event.count({ where: { accountId: acc.id } })).toBe(0); // no orphan
  });

  it("refuses to attach another account's media (AC-7)", async () => {
    if (!dbUp) return;
    const owner = await account("owner");
    const attacker = await account("attacker");
    const m = await persistedMedia(owner.id);
    const res = await createEvent({
      accountId: attacker.id, note: "steal", occurredOn: new Date(), circle: "ME_ONLY",
      legacyConsent: false, mediaPublicIds: [m.publicId], submitKey: randomToken(12),
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("media_not_owned");
  });

  it("saved event is immediately fresh-read on the timeline (AC-15)", async () => {
    if (!dbUp) return;
    const acc = await account("fresh");
    await createEvent({
      accountId: acc.id, note: "fresh read", occurredOn: new Date(), circle: "ME_ONLY",
      legacyConsent: false, mediaPublicIds: [], submitKey: randomToken(12),
    });
    const events = await listOwnEvents(acc.id);
    expect(events.length).toBe(1);
  });

  it("soft-delete hides the event but keeps it recoverable (AC-16/G2)", async () => {
    if (!dbUp) return;
    const acc = await account("del");
    const res = await createEvent({
      accountId: acc.id, note: "deletable", occurredOn: new Date(), circle: "ME_ONLY",
      legacyConsent: false, mediaPublicIds: [], submitKey: randomToken(12),
    });
    if (!res.ok) throw new Error("setup");
    expect(await softDeleteEvent(acc.id, res.event.id)).toBe(true);
    expect((await listOwnEvents(acc.id)).length).toBe(0); // hidden
    const row = await prisma.event.findUnique({ where: { id: res.event.id } });
    expect(row).not.toBeNull(); // row still exists — recoverable
    expect(row?.deletedAt).not.toBeNull();
  });
});
