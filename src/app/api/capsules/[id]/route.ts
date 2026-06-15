import { NextRequest, NextResponse } from "next/server";
import { requireAccount, Unauthorized } from "@/lib/auth/session";
import { cancelCapsule } from "@/lib/capsules";
import { emit } from "@/lib/telemetry";

/**
 * Cancel a sealed, not-yet-unlocked capsule (US-4.2 AC-11) — owner-only,
 * explicit. Sealed content/date/recipient are immutable (AC-5), but the owner
 * retains the right to withdraw (G2: an explicit user action).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let account;
  try {
    account = await requireAccount();
  } catch (e) {
    if (e instanceof Unauthorized) return NextResponse.json({ ok: false }, { status: 401 });
    throw e;
  }
  const { id } = await params;
  const ok = await cancelCapsule(id, account.id);
  if (!ok) return new NextResponse(null, { status: 404 });
  emit("capsule_cancelled", {});
  return NextResponse.json({ ok: true });
}
