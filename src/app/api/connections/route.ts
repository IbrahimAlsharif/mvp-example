import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAccount, Unauthorized } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  requestConnection,
  pendingIncoming,
  acceptedMembers,
  SelfConnectionError,
} from "@/lib/connections";
import { emit } from "@/lib/telemetry";

/**
 * Family invitations & roster (US-3.5). The social-graph data layer (Connection)
 * already exists; these routes are the user-facing flow.
 *
 *  - POST { email, tier } → invite an existing account by email at FAMILY/GENERAL.
 *  - GET → the viewer's pending incoming requests + accepted members (roster UI).
 *
 * Invitations target an existing invited-pilot account (G7 closed pilot); a
 * self-invite is rejected.
 */
const InviteBody = z.object({
  email: z.string().email(),
  tier: z.enum(["FAMILY", "GENERAL"]).default("FAMILY"),
});

export async function POST(req: NextRequest) {
  let account;
  try {
    account = await requireAccount();
  } catch (e) {
    if (e instanceof Unauthorized) return NextResponse.json({ ok: false }, { status: 401 });
    throw e;
  }

  const parsed = InviteBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });

  const recipient = await prisma.account.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  // Anti-enumeration: same response whether or not the recipient exists.
  if (!recipient || recipient.id === account.id) {
    return NextResponse.json({ ok: true, sent: true });
  }

  try {
    await requestConnection(account.id, recipient.id, parsed.data.tier);
  } catch (e) {
    if (e instanceof SelfConnectionError) return NextResponse.json({ ok: true, sent: true });
    throw e;
  }
  emit("family_invite_sent", { tier: parsed.data.tier.toLowerCase() });
  return NextResponse.json({ ok: true, sent: true });
}

export async function GET() {
  let account;
  try {
    account = await requireAccount();
  } catch (e) {
    if (e instanceof Unauthorized) return NextResponse.json({ ok: false }, { status: 401 });
    throw e;
  }

  const [pending, members] = await Promise.all([
    pendingIncoming(account.id),
    acceptedMembers(account.id),
  ]);

  const other = (c: { accountAId: string; accountBId: string }) =>
    c.accountAId === account.id ? c.accountBId : c.accountAId;

  return NextResponse.json({
    ok: true,
    pending: pending.map((c) => ({ id: c.id, tier: c.tier, fromAccountId: c.requestedById })),
    members: members.map((c) => ({ id: c.id, tier: c.tier, memberAccountId: other(c) })),
  });
}
