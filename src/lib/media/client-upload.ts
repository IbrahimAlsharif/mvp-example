"use client";

import { openDB } from "idb";

/**
 * Browser upload client (US-1.2). Computes the file's sha256, buffers the bytes
 * in IndexedDB BEFORE uploading and keeps them until the server confirms
 * verified persistence (AC-11: a captured-but-unverified original is never
 * discarded; a tab close/reload can resume). Uploads in 5 MiB parts and resumes
 * from whatever the server already has. Returns the verified-persisted publicId
 * — the signal US-1.1 attaches to an event.
 */
const PART_SIZE = 5 * 1024 * 1024;
const DB_NAME = "htn-uploads";
const STORE = "pending";

async function db() {
  return openDB(DB_NAME, 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    },
  });
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type UploadHandle = {
  uploadKey: string;
  onProgress?: (fraction: number) => void;
};

export async function uploadFile(
  file: File,
  handle: UploadHandle,
): Promise<{ publicId: string }> {
  const buf = await file.arrayBuffer();
  const checksum = await sha256Hex(buf);

  // Buffer locally before touching the network (AC-11).
  const store = await db();
  await store.put(STORE, { blob: file, checksum, mimeType: file.type }, handle.uploadKey);

  const init = await postJson("/api/uploads/init", {
    uploadKey: handle.uploadKey,
    checksumSha256: checksum,
    mimeType: file.type,
    byteSize: file.size,
  });
  if (!init.ok) throw new UploadError(init.reason ?? "init_failed");

  if (!init.completed) {
    const done = new Set<number>(init.uploadedParts ?? []);
    const totalParts = Math.max(1, Math.ceil(buf.byteLength / PART_SIZE));
    for (let i = 0; i < totalParts; i++) {
      const partNumber = i + 1;
      if (done.has(partNumber)) {
        handle.onProgress?.((i + 1) / totalParts);
        continue; // already on the server — resume, don't re-send (AC-5)
      }
      const chunk = buf.slice(i * PART_SIZE, (i + 1) * PART_SIZE);
      const res = await fetch(
        `/api/uploads/part?uploadKey=${encodeURIComponent(handle.uploadKey)}&partNumber=${partNumber}`,
        { method: "PUT", body: chunk },
      );
      if (!res.ok) throw new UploadError("part_failed");
      handle.onProgress?.((i + 1) / totalParts);
    }
  }

  const complete = await postJson("/api/uploads/complete", { uploadKey: handle.uploadKey });
  if (!complete.ok) throw new UploadError(complete.reason ?? "complete_failed");

  // Verified persisted — safe to drop the local buffer now (AC-11).
  await store.delete(STORE, handle.uploadKey);
  return { publicId: complete.publicId };
}

export class UploadError extends Error {}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function newUploadKey(): string {
  return crypto.randomUUID();
}
