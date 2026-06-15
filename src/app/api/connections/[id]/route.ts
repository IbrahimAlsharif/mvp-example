import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAccount, Unauthorized } from "@/lib/auth/session";
import { acceptConnection, declineConnection, revokeConnection } from "@/lib/connections";
import { emit } from "@/lib/telemetry";

/**
 * Act on a single connection (US-3.5):
 *  - PATCH { action: "accept" | "decline" } → the recipient accepts/declines a
 *    pending request.
 *  - DELETE → either member revokes an accepted connection. Roster-removal
 *    propagation is automatic: the read authz layer resolves the roster live, so
 *    the removed member loses FAMILY-event access on their next request (AC-9).
 *    Events/media are never deleted (G2).
 */
const PatchBody = z.object({ action: z.enum(["accept", "decline"]) });

export async function PATCH(
  req: NextRequest,
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
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });

  if (parsed.data.action === "accept") {
    const updated = await acceptConnection(id, account.id);
    if (!updated) return new NextResponse(null, { status: 404 });
    emit("family_invite_accepted", { tier: updated.tier.toLowerCase() });
    return NextResponse.json({ ok: true });
  }

  const declined = await declineConnection(id, account.id);
  if (!declined) return new NextResponse(null, { status: 404 });
  emit("family_invite_declined", {});
  return NextResponse.json({ ok: true });
}

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
  const removed = await revokeConnection(id, account.id);
  if (!removed) return new NextResponse(null, { status: 404 });
  emit("family_member_revoked", {});
  return NextResponse.json({ ok: true });
}
