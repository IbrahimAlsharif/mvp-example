import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAccount, Unauthorized } from "@/lib/auth/session";
import { sealCapsule, listOwnerCapsules } from "@/lib/capsules";
import { emit } from "@/lib/telemetry";

/**
 * Future capsules (US-4.2). Date-triggered only (G9).
 *  - POST → seal a capsule (validates a strictly-future date, resolves the
 *    unlock instant from the owner's offset, locks it).
 *  - GET  → the owner's pending/undeliverable capsules (type/date/recipient).
 */
const SealBody = z.object({
  type: z.enum(["MESSAGE", "VIDEO", "LETTER", "GOAL", "PLAN"]),
  note: z.string().max(10_000).optional().nullable(),
  recipientCircle: z.enum(["ME_ONLY", "FAMILY", "PUBLIC_UNLISTED"]).default("FAMILY"),
  unlockLocalDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  unlockOffsetMin: z.number().int(),
});

export async function POST(req: NextRequest) {
  let account;
  try {
    account = await requireAccount();
  } catch (e) {
    if (e instanceof Unauthorized) return NextResponse.json({ ok: false }, { status: 401 });
    throw e;
  }

  const parsed = SealBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });

  emit("capsule_create_started", { mode: parsed.data.type.toLowerCase() });
  const res = await sealCapsule({
    ownerAccountId: account.id,
    type: parsed.data.type,
    note: parsed.data.note ?? null,
    recipientCircle: parsed.data.recipientCircle,
    unlockLocalDay: parsed.data.unlockLocalDay,
    unlockOffsetMin: parsed.data.unlockOffsetMin,
    nowMs: Date.now(),
  });
  if (!res.ok) return NextResponse.json({ ok: false, reason: res.reason }, { status: 422 });

  emit("capsule_sealed", { mode: parsed.data.type.toLowerCase() });
  return NextResponse.json({ ok: true, capsuleId: res.capsule.id }, { status: 201 });
}

export async function GET() {
  let account;
  try {
    account = await requireAccount();
  } catch (e) {
    if (e instanceof Unauthorized) return NextResponse.json({ ok: false }, { status: 401 });
    throw e;
  }
  const capsules = await listOwnerCapsules(account.id);
  return NextResponse.json({
    ok: true,
    capsules: capsules.map((c) => ({
      id: c.id,
      type: c.type,
      recipientCircle: c.recipientCircle,
      unlockLocalDay: c.unlockLocalDay,
      status: c.status,
    })),
  });
}
