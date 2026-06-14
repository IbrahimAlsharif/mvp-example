import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAccount, Unauthorized } from "@/lib/auth/session";
import { completeUpload, UploadNotFound } from "@/lib/media/upload";
import { emit } from "@/lib/telemetry";

/**
 * Finalize an upload (US-1.2 AC-3/AC-4). Returns PERSISTED + the media publicId
 * ONLY after the server has completed the multipart object and verified its
 * sha256 against the client checksum. This is the persistence signal US-1.1's
 * event-create transaction consumes. A checksum mismatch returns a retryable
 * failure and never persists a Media row.
 */
const Body = z.object({ uploadKey: z.string().min(8) });

export async function POST(req: NextRequest) {
  let account;
  try {
    account = await requireAccount();
  } catch (e) {
    if (e instanceof Unauthorized) return NextResponse.json({ ok: false }, { status: 401 });
    throw e;
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });

  try {
    const result = await completeUpload(account.id, parsed.data.uploadKey);
    if (!result.ok) {
      emit("media_upload_failed", { failure_reason: result.reason, retry_offered: true });
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 422 });
    }
    emit("media_upload_persisted", {
      media_type: result.media.type.toLowerCase(),
      was_resumed: false,
    });
    // The client now holds a verified-persisted publicId to attach in US-1.1.
    return NextResponse.json({
      ok: true,
      publicId: result.media.publicId,
      status: result.media.status,
      alreadyComplete: result.alreadyComplete,
    });
  } catch (e) {
    if (e instanceof UploadNotFound) return NextResponse.json({ ok: false }, { status: 404 });
    throw e;
  }
}
