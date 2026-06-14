import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { MediaType, Media } from "@prisma/client";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { s3, BUCKET } from "@/lib/storage/s3";
import { deriveStorageKey } from "@/lib/storage/keys";
import { randomToken } from "@/lib/ids";

/**
 * Resumable, checksum-verified upload (US-1.2). Bytes flow through the API to
 * S3 multipart (no direct browser→bucket path), so the bucket stays private and
 * auth is server-side. A success/PERSISTED signal is produced ONLY after the
 * server re-reads the object and its sha256 matches the client checksum
 * (AC-4) — this is the contract US-1.1 consumes. Confirmation never precedes
 * persistence.
 */

// Open, widely-renderable formats only (AC-7). Fast-fail anything else.
const ALLOWED: Record<string, MediaType> = {
  "image/jpeg": "PHOTO",
  "image/png": "PHOTO",
  "video/mp4": "VIDEO",
  "audio/wav": "VOICE",
  "audio/mpeg": "VOICE",
};

export function isAllowedMime(mime: string): boolean {
  return mime in ALLOWED;
}
export function mediaTypeForMime(mime: string): MediaType {
  return ALLOWED[mime];
}

export class UnsupportedFormat extends Error {}
export class UploadNotFound extends Error {}

export type InitResult = {
  uploadKey: string;
  s3UploadId: string;
  uploadedParts: number[]; // part numbers already stored (for resume)
  completed: boolean;
  publicId?: string;
};

/**
 * Begin or resume an upload. Idempotent by uploadKey: a repeat call returns the
 * existing session (and its already-uploaded part numbers) rather than starting
 * a second multipart upload, so retries never create a duplicate blob (AC-13).
 */
export async function initUpload(
  accountId: string,
  input: { uploadKey: string; checksumSha256: string; mimeType: string; byteSize?: number },
): Promise<InitResult> {
  if (!isAllowedMime(input.mimeType)) throw new UnsupportedFormat(input.mimeType);

  const storageKey = deriveStorageKey(input.checksumSha256);
  const existing = await prisma.uploadSession.findUnique({ where: { uploadKey: input.uploadKey } });

  if (existing) {
    if (existing.accountId !== accountId) throw new UploadNotFound();
    if (existing.completedAt) {
      const media = await prisma.media.findFirst({
        where: { accountId, storageKey, status: "PERSISTED" },
      });
      return {
        uploadKey: existing.uploadKey,
        s3UploadId: existing.s3UploadId!,
        uploadedParts: [],
        completed: true,
        publicId: media?.publicId,
      };
    }
    const uploaded = await listUploadedParts(existing.s3UploadId!, storageKey);
    return { uploadKey: existing.uploadKey, s3UploadId: existing.s3UploadId!, uploadedParts: uploaded, completed: false };
  }

  const created = await s3.send(
    new CreateMultipartUploadCommand({ Bucket: BUCKET, Key: storageKey, ContentType: input.mimeType }),
  );
  await prisma.uploadSession.create({
    data: {
      accountId,
      uploadKey: input.uploadKey,
      storageKey,
      s3UploadId: created.UploadId!,
      checksumSha256: input.checksumSha256,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
    },
  });
  return { uploadKey: input.uploadKey, s3UploadId: created.UploadId!, uploadedParts: [], completed: false };
}

async function listUploadedParts(s3UploadId: string, storageKey: string): Promise<number[]> {
  try {
    const res = await s3.send(
      new ListPartsCommand({ Bucket: BUCKET, Key: storageKey, UploadId: s3UploadId }),
    );
    return (res.Parts ?? []).map((p) => p.PartNumber!).sort((a, b) => a - b);
  } catch {
    return [];
  }
}

/** Upload one part. Idempotent in S3: re-uploading the same part number replaces it. */
export async function uploadPart(
  accountId: string,
  input: { uploadKey: string; partNumber: number; body: Buffer },
): Promise<{ uploadedParts: number[] }> {
  const session = await requireSession(accountId, input.uploadKey);
  await s3.send(
    new UploadPartCommand({
      Bucket: BUCKET,
      Key: session.storageKey,
      UploadId: session.s3UploadId!,
      PartNumber: input.partNumber,
      Body: input.body,
    }),
  );
  await prisma.uploadSession.update({
    where: { id: session.id },
    data: { lastActivityAt: new Date() },
  });
  const uploaded = await listUploadedParts(session.s3UploadId!, session.storageKey);
  return { uploadedParts: uploaded };
}

export type CompleteResult =
  | { ok: true; media: Media; alreadyComplete: boolean }
  | { ok: false; reason: "checksum_mismatch" | "no_parts" };

/**
 * Finalize: complete the multipart object, re-read it, verify sha256 == the
 * client checksum, and ONLY THEN persist a PERSISTED Media row (AC-4). A
 * mismatch deletes the object and reports failure for retry (AC-6). Idempotent:
 * a repeat call on a completed session returns the same Media (one blob, AC-13).
 */
export async function completeUpload(
  accountId: string,
  uploadKey: string,
): Promise<CompleteResult> {
  const session = await requireSession(accountId, uploadKey);

  if (session.completedAt) {
    const media = await prisma.media.findFirst({
      where: { accountId, storageKey: session.storageKey, status: "PERSISTED" },
    });
    if (media) return { ok: true, media, alreadyComplete: true };
  }

  const parts = await listUploadedParts(session.s3UploadId!, session.storageKey);
  if (parts.length === 0) return { ok: false, reason: "no_parts" };

  const listed = await s3.send(
    new ListPartsCommand({ Bucket: BUCKET, Key: session.storageKey, UploadId: session.s3UploadId! }),
  );
  await s3.send(
    new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: session.storageKey,
      UploadId: session.s3UploadId!,
      MultipartUpload: {
        Parts: (listed.Parts ?? [])
          .sort((a, b) => a.PartNumber! - b.PartNumber!)
          .map((p) => ({ PartNumber: p.PartNumber, ETag: p.ETag })),
      },
    }),
  );

  // Re-read the object and verify integrity server-side (AC-4, AC-9 fixity).
  const serverChecksum = await sha256OfObject(session.storageKey);
  if (serverChecksum !== session.checksumSha256) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: session.storageKey })).catch(() => {});
    return { ok: false, reason: "checksum_mismatch" };
  }

  const media = await prisma.media.create({
    data: {
      publicId: randomToken(16),
      accountId,
      type: mediaTypeForMime(session.mimeType),
      mimeType: session.mimeType,
      storageKey: session.storageKey,
      checksumSha256: session.checksumSha256,
      byteSize: session.byteSize,
      status: "PERSISTED",
    },
  });
  await prisma.uploadSession.update({
    where: { id: session.id },
    data: { completedAt: new Date(), lastActivityAt: new Date() },
  });
  return { ok: true, media, alreadyComplete: false };
}

async function sha256OfObject(storageKey: string): Promise<string> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: storageKey }));
  const hash = createHash("sha256");
  // @ts-expect-error Node stream from the SDK
  for await (const chunk of res.Body) hash.update(chunk);
  return hash.digest("hex");
}

async function requireSession(accountId: string, uploadKey: string) {
  const session = await prisma.uploadSession.findUnique({ where: { uploadKey } });
  if (!session || session.accountId !== accountId) throw new UploadNotFound();
  return session;
}

/**
 * Reaper (AC-14, G2). Aborts and deletes ONLY upload sessions that never
 * completed AND have had no activity for longer than the abandonment threshold
 * (which must exceed any resume window). A completed session and any PERSISTED
 * media are NEVER touched.
 */
export async function reapAbandonedUploads(thresholdHours: number): Promise<number> {
  const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);
  const abandoned = await prisma.uploadSession.findMany({
    where: { completedAt: null, lastActivityAt: { lt: cutoff } },
  });
  for (const s of abandoned) {
    if (s.s3UploadId) {
      await s3
        .send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: s.storageKey, UploadId: s.s3UploadId }))
        .catch(() => {});
    }
    await prisma.uploadSession.delete({ where: { id: s.id } });
  }
  return abandoned.length;
}

export const PART_SIZE = 5 * 1024 * 1024; // 5 MiB (S3 multipart minimum non-final part)
