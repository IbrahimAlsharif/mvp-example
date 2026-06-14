import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAccount, Unauthorized } from "@/lib/auth/session";
import { createEvent, listVisibleEvents } from "@/lib/events/create";
import { circleTelemetry } from "@/lib/authz/circle";
import { prisma } from "@/lib/db";
import { emit, safeEmit } from "@/lib/telemetry";

const Body = z.object({
  note: z.string().max(10_000).optional().nullable(),
  occurredOn: z.string().datetime(), // canonical absolute (Gregorian) ISO timestamp
  circle: z.enum(["ME_ONLY", "FAMILY", "PUBLIC_UNLISTED"]),
  legacyConsent: z.boolean().default(false),
  mediaPublicIds: z.array(z.string()).default([]),
  submitKey: z.string().min(8),
  location: z.object({ lat: z.number(), lng: z.number() }).optional().nullable(),
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
  const d = parsed.data;

  emit("event_create_started", { circle: circleTelemetry(d.circle), has_media: d.mediaPublicIds.length > 0 });

  const result = await createEvent({
    accountId: account.id,
    note: d.note,
    occurredOn: new Date(d.occurredOn),
    circle: d.circle,
    legacyConsent: d.legacyConsent,
    mediaPublicIds: d.mediaPublicIds,
    submitKey: d.submitKey,
    location: d.location,
  });

  if (!result.ok) {
    emit("event_create_failed", { failure_reason: failureEnum(result.reason) });
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 422 });
  }

  // Success reported only after the transaction committed (no optimistic confirm).
  // is_first_event is idempotent per account: a replayed submit (same submitKey)
  // does not re-count, and the first-saved event attains the first_event funnel
  // stage exactly once (US-0.3 AC-1/AC-6).
  const isFirstEvent = !result.idempotentReplay && (await isAccountFirstEvent(account.id, result.event.id));
  emit("event_create_saved", {
    circle: circleTelemetry(result.event.circle),
    has_media: d.mediaPublicIds.length > 0,
    is_first_event: isFirstEvent,
  });
  if (isFirstEvent) safeEmit("funnel_stage_attained", { stage: "first_event" });
  return NextResponse.json(
    { ok: true, eventId: result.event.id, idempotentReplay: result.idempotentReplay },
    { status: result.idempotentReplay ? 200 : 201 },
  );
}

export async function GET() {
  let account;
  try {
    account = await requireAccount();
  } catch (e) {
    if (e instanceof Unauthorized) return NextResponse.json({ ok: false }, { status: 401 });
    throw e;
  }
  const events = await listVisibleEvents(account.id);
  return NextResponse.json({
    ok: true,
    events: events.map((e) => ({
      id: e.id,
      note: e.note,
      occurredOn: e.occurredOn,
      circle: e.circle,
      legacyConsent: e.legacyConsent,
      media: e.media.map((m) => ({ publicId: m.publicId, type: m.type })),
    })),
  });
}

function failureEnum(reason: string): string {
  // content-blind telemetry enum (G4)
  return reason === "empty_event" ? "empty" : "server";
}

/**
 * True when `eventId` is the account's only non-deleted event — i.e. the save
 * that just attained the first_event funnel stage. Counting (not flagging) keeps
 * stage attainment derivable from the event stream (US-0.3 NFR) and idempotent:
 * any later save sees count > 1 and does not re-emit.
 */
async function isAccountFirstEvent(accountId: string, eventId: string): Promise<boolean> {
  const count = await prisma.event.count({ where: { accountId, deletedAt: null } });
  if (count !== 1) return false;
  const only = await prisma.event.findFirst({ where: { accountId, deletedAt: null }, select: { id: true } });
  return only?.id === eventId;
}
