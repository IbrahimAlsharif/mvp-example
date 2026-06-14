import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAccount, Unauthorized } from "@/lib/auth/session";
import { initUpload, UnsupportedFormat, mediaTypeForMime } from "@/lib/media/upload";
import { emit } from "@/lib/telemetry";

const Body = z.object({
  uploadKey: z.string().min(8),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
  mimeType: z.string().min(1),
  byteSize: z.number().int().positive().optional(),
});

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
    const result = await initUpload(account.id, parsed.data);
    emit("media_upload_started", { source: "upload", media_type: mediaTypeForMime(parsed.data.mimeType).toLowerCase() });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof UnsupportedFormat) {
      emit("media_upload_failed", { failure_reason: "unsupported_format", retry_offered: false });
      return NextResponse.json({ ok: false, reason: "unsupported_format" }, { status: 415 });
    }
    throw e;
  }
}
