import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/ids";
import { createEvent, updateEvent } from "@/lib/events/create";

// FEAT-MRV: editing an existing event's body (note/day/place/location/media) is
// atomic and owner-scoped. DB integration; media rows are created directly in the
// PERSISTED state the upload contract would produce.
let dbUp = false;
const accountIds: string[] = [];

async function account(tag: string) {
  const a = await prisma.account.create({
    data: { email: `eu.${tag}.${randomToken(5)}@example.com`, status: "ACTIVE", defaultCircle: "ME_ONLY" },
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
async function makeEvent(accountId: string, note = "أول") {
  const r = await createEvent({
    accountId,
    note,
    occurredOn: new Date("2026-01-01T12:00:00.000Z"),
    circle: "ME_ONLY",
    legacyConsent: false,
    mediaPublicIds: [],
    submitKey: randomToken(16),
  });
  if (!r.ok) throw new Error("seed create failed: " + r.reason);
  return r.event;
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

describe("FEAT-MRV event edit", () => {
  it("updates the note, day, and place atomically for the owner", async () => {
    if (!dbUp) return;
    const acc = await account("owner");
    const ev = await makeEvent(acc.id);

    const res = await updateEvent({
      accountId: acc.id,
      eventId: ev.id,
      note: "محدّث",
      occurredOn: new Date("2026-03-15T12:00:00.000Z"),
      mediaPublicIds: [],
      placeName: "الرياض",
    });
    expect(res.ok).toBe(true);
    const fresh = await prisma.event.findUnique({ where: { id: ev.id } });
    expect(fresh?.note).toBe("محدّث");
    expect(fresh?.placeName).toBe("الرياض");
    expect(fresh?.occurredOn.toISOString()).toBe("2026-03-15T12:00:00.000Z");
  });

  it("attaches a new persisted media and detaches a removed one", async () => {
    if (!dbUp) return;
    const acc = await account("media");
    const ev = await makeEvent(acc.id);
    const m1 = await persistedMedia(acc.id);

    // attach m1
    let res = await updateEvent({
      accountId: acc.id,
      eventId: ev.id,
      note: "مع صورة",
      occurredOn: ev.occurredOn,
      mediaPublicIds: [m1.publicId],
    });
    expect(res.ok).toBe(true);
    expect((await prisma.media.findUnique({ where: { id: m1.id } }))?.eventId).toBe(ev.id);

    // replace m1 with m2 → m1 detached, m2 attached
    const m2 = await persistedMedia(acc.id);
    res = await updateEvent({
      accountId: acc.id,
      eventId: ev.id,
      note: "مع صورة",
      occurredOn: ev.occurredOn,
      mediaPublicIds: [m2.publicId],
    });
    expect(res.ok).toBe(true);
    expect((await prisma.media.findUnique({ where: { id: m1.id } }))?.eventId).toBeNull();
    expect((await prisma.media.findUnique({ where: { id: m2.id } }))?.eventId).toBe(ev.id);
  });

  it("refuses to edit another account's event (not_found, no oracle)", async () => {
    if (!dbUp) return;
    const owner = await account("a");
    const intruder = await account("b");
    const ev = await makeEvent(owner.id);

    const res = await updateEvent({
      accountId: intruder.id,
      eventId: ev.id,
      note: "اختراق",
      occurredOn: ev.occurredOn,
      mediaPublicIds: [],
    });
    expect(res).toEqual({ ok: false, reason: "not_found" });
    // untouched
    expect((await prisma.event.findUnique({ where: { id: ev.id } }))?.note).toBe("أول");
  });

  it("rejects attaching media the owner doesn't own", async () => {
    if (!dbUp) return;
    const owner = await account("own");
    const other = await account("other");
    const ev = await makeEvent(owner.id);
    const foreign = await persistedMedia(other.id);

    const res = await updateEvent({
      accountId: owner.id,
      eventId: ev.id,
      note: "أول",
      occurredOn: ev.occurredOn,
      mediaPublicIds: [foreign.publicId],
    });
    expect(res).toEqual({ ok: false, reason: "media_not_owned" });
    expect((await prisma.media.findUnique({ where: { id: foreign.id } }))?.eventId).toBeNull();
  });

  it("rejects an empty edit (no note, no media)", async () => {
    if (!dbUp) return;
    const acc = await account("empty");
    const ev = await makeEvent(acc.id);
    const res = await updateEvent({
      accountId: acc.id,
      eventId: ev.id,
      note: "   ",
      occurredOn: ev.occurredOn,
      mediaPublicIds: [],
    });
    expect(res).toEqual({ ok: false, reason: "empty_event" });
  });
});
