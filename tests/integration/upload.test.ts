import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/db";
import { s3, BUCKET } from "@/lib/storage/s3";
import { randomToken } from "@/lib/ids";
import {
  initUpload,
  uploadPart,
  completeUpload,
  reapAbandonedUploads,
  UnsupportedFormat,
} from "@/lib/media/upload";

// US-1.2 against live MinIO. Skipped if DB or S3 is unreachable.
let up = false;
const accountIds: string[] = [];
const keys: string[] = [];

function sha256(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}
async function account(tag: string) {
  const a = await prisma.account.create({
    data: { email: `up.${tag}.${randomToken(5)}@example.com`, status: "ACTIVE", defaultCircle: "ME_ONLY" },
  });
  accountIds.push(a.id);
  return a;
}

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: "___probe___" })).catch((e) => {
      if (e?.name === "NotFound" || e?.$metadata?.httpStatusCode === 404) return; // bucket reachable
      throw e;
    });
    up = true;
  } catch {
    up = false;
  }
});

afterAll(async () => {
  if (up) await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
  await prisma.$disconnect();
});

describe("US-1.2 upload (resumable, checksum-verified)", () => {
  it("single-part upload persists only after server-side checksum match (AC-3/AC-4)", async () => {
    if (!up) return;
    const acc = await account("ok");
    const bytes = Buffer.from("hello-timeline-" + randomToken(8));
    const checksum = sha256(bytes);
    const uploadKey = randomToken(12);
    keys.push(`sha256/${checksum}`);

    const init = await initUpload(acc.id, { uploadKey, checksumSha256: checksum, mimeType: "image/jpeg" });
    expect(init.completed).toBe(false);
    await uploadPart(acc.id, { uploadKey, partNumber: 1, body: bytes });
    const done = await completeUpload(acc.id, uploadKey);
    expect(done.ok).toBe(true);
    if (done.ok) {
      expect(done.media.status).toBe("PERSISTED");
      expect(done.media.type).toBe("PHOTO");
      expect(done.media.checksumSha256).toBe(checksum);
    }
  });

  it("rejects an unsupported format fast, before upload (AC-7)", async () => {
    if (!up) return;
    const acc = await account("bad");
    await expect(
      initUpload(acc.id, { uploadKey: randomToken(12), checksumSha256: sha256(Buffer.from("x")), mimeType: "application/x-msdownload" }),
    ).rejects.toBeInstanceOf(UnsupportedFormat);
  });

  it("a checksum mismatch fails and persists no media (AC-6)", async () => {
    if (!up) return;
    const acc = await account("mm");
    const bytes = Buffer.from("real-bytes-" + randomToken(8));
    const wrong = sha256(Buffer.from("not-the-real-bytes"));
    const uploadKey = randomToken(12);
    keys.push(`sha256/${wrong}`);
    await initUpload(acc.id, { uploadKey, checksumSha256: wrong, mimeType: "image/png" });
    await uploadPart(acc.id, { uploadKey, partNumber: 1, body: bytes });
    const done = await completeUpload(acc.id, uploadKey);
    expect(done.ok).toBe(false);
    if (!done.ok) expect(done.reason).toBe("checksum_mismatch");
    const media = await prisma.media.findFirst({ where: { accountId: acc.id } });
    expect(media).toBeNull(); // nothing persisted
  });

  it("complete is idempotent — one blob for retries (AC-13)", async () => {
    if (!up) return;
    const acc = await account("idem");
    const bytes = Buffer.from("idempotent-" + randomToken(8));
    const checksum = sha256(bytes);
    const uploadKey = randomToken(12);
    keys.push(`sha256/${checksum}`);
    await initUpload(acc.id, { uploadKey, checksumSha256: checksum, mimeType: "audio/wav" });
    await uploadPart(acc.id, { uploadKey, partNumber: 1, body: bytes });
    const first = await completeUpload(acc.id, uploadKey);
    const second = await completeUpload(acc.id, uploadKey);
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.alreadyComplete).toBe(true);
      expect(second.media.id).toBe(first.media.id); // same single Media/blob
    }
    const count = await prisma.media.count({ where: { accountId: acc.id } });
    expect(count).toBe(1);
  });

  it("completing with no uploaded parts fails cleanly (no empty blob)", async () => {
    if (!up) return;
    const acc = await account("noparts");
    const checksum = sha256(Buffer.from("never-uploaded"));
    const uploadKey = randomToken(12);
    await initUpload(acc.id, { uploadKey, checksumSha256: checksum, mimeType: "image/jpeg" });
    const done = await completeUpload(acc.id, uploadKey);
    expect(done.ok).toBe(false);
    if (!done.ok) expect(done.reason).toBe("no_parts");
    expect(await prisma.media.count({ where: { accountId: acc.id } })).toBe(0);
  });

  it("resumes a multi-part upload from where it stopped, not from zero (AC-5)", async () => {
    if (!up) return;
    const acc = await account("resume");
    // 6 MiB => part1 (5 MiB) + part2 (1 MiB)
    const part1 = randomBytes(5 * 1024 * 1024);
    const part2 = randomBytes(1 * 1024 * 1024);
    const full = Buffer.concat([part1, part2]);
    const checksum = sha256(full);
    const uploadKey = randomToken(12);
    keys.push(`sha256/${checksum}`);

    await initUpload(acc.id, { uploadKey, checksumSha256: checksum, mimeType: "video/mp4" });
    await uploadPart(acc.id, { uploadKey, partNumber: 1, body: part1 });

    // simulate a drop + resume: re-init returns the part already stored
    const resumed = await initUpload(acc.id, { uploadKey, checksumSha256: checksum, mimeType: "video/mp4" });
    expect(resumed.uploadedParts).toContain(1);
    expect(resumed.completed).toBe(false);

    await uploadPart(acc.id, { uploadKey, partNumber: 2, body: part2 });
    const done = await completeUpload(acc.id, uploadKey);
    expect(done.ok).toBe(true);
    if (done.ok) {
      expect(done.media.type).toBe("VIDEO");
      // verify the assembled object exists and is the right size
      const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: `sha256/${checksum}` }));
      expect(head.ContentLength).toBe(full.length);
    }
  });

  it("reaper removes an abandoned session but never a completed one (AC-14, G2)", async () => {
    if (!up) return;
    const acc = await account("reap");
    // an abandoned, never-completed session with old activity
    const abandonedKey = randomToken(12);
    const abChecksum = sha256(Buffer.from("abandoned"));
    keys.push(`sha256/${abChecksum}`);
    await initUpload(acc.id, { uploadKey: abandonedKey, checksumSha256: abChecksum, mimeType: "image/jpeg" });
    await prisma.uploadSession.update({
      where: { uploadKey: abandonedKey },
      data: { lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 100) }, // 100h ago
    });
    // a completed session (persisted media) — must survive
    const liveKey = randomToken(12);
    const liveBytes = Buffer.from("kept-" + randomToken(6));
    const liveChecksum = sha256(liveBytes);
    keys.push(`sha256/${liveChecksum}`);
    await initUpload(acc.id, { uploadKey: liveKey, checksumSha256: liveChecksum, mimeType: "image/jpeg" });
    await uploadPart(acc.id, { uploadKey: liveKey, partNumber: 1, body: liveBytes });
    await completeUpload(acc.id, liveKey);

    const removed = await reapAbandonedUploads(48);
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(await prisma.uploadSession.findUnique({ where: { uploadKey: abandonedKey } })).toBeNull();
    // completed session + its media untouched
    expect(await prisma.uploadSession.findUnique({ where: { uploadKey: liveKey } })).not.toBeNull();
    expect(await prisma.media.count({ where: { accountId: acc.id, status: "PERSISTED" } })).toBe(1);
  });
});
