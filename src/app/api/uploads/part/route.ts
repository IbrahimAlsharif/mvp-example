import { NextRequest, NextResponse } from "next/server";
import { requireAccount, Unauthorized } from "@/lib/auth/session";
import { uploadPart, UploadNotFound } from "@/lib/media/upload";

/**
 * Upload one chunk (US-1.2 AC-5). The client sends raw bytes with the uploadKey
 * and part number as query params. Resumable: a client that dropped mid-upload
 * re-calls init to learn which parts already landed, then sends only the rest —
 * no restart-from-zero. Re-sending a part is idempotent in S3.
 */
export async function PUT(req: NextRequest) {
  let account;
  try {
    account = await requireAccount();
  } catch (e) {
    if (e instanceof Unauthorized) return NextResponse.json({ ok: false }, { status: 401 });
    throw e;
  }

  const uploadKey = req.nextUrl.searchParams.get("uploadKey");
  const partNumber = Number(req.nextUrl.searchParams.get("partNumber"));
  if (!uploadKey || !Number.isInteger(partNumber) || partNumber < 1) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const body = Buffer.from(await req.arrayBuffer());
  if (body.length === 0) return NextResponse.json({ ok: false, reason: "empty_part" }, { status: 400 });

  try {
    const result = await uploadPart(account.id, { uploadKey, partNumber, body });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof UploadNotFound) return NextResponse.json({ ok: false }, { status: 404 });
    throw e;
  }
}
