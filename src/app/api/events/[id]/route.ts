import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAccount, Unauthorized } from "@/lib/auth/session";
import { changeEventCircle } from "@/lib/events/circle-change";
import { updateEvent } from "@/lib/events/create";
import { circleTelemetry } from "@/lib/authz/circle";
import { emit } from "@/lib/telemetry";

/**
 * Change an event's privacy circle after creation (US-3.2). Owner-only. The
 * change is atomic and, on a downgrade away from PUBLIC_UNLISTED, revokes the
 * unlisted share links in the same transaction (AC-4/AC-8). Immediate
 * propagation (AC-3/AC-6) is automatic: the media/read authz layer re-checks
 * event.circle on every request, so a former viewer is denied on their next
 * server-validated request — no stale grant. The memory is never deleted or
 * locked and the owner keeps access throughout (G2/AC-9).
 */
const Body = z.object({ circle: z.enum(["ME_ONLY", "FAMILY", "PUBLIC_UNLISTED", "PUBLIC"]) });

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
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });

  const result = await changeEventCircle({
    eventId: id,
    ownerAccountId: account.id,
    to: parsed.data.circle,
  });

  if (!result.ok) {
    // not_found and not_owner both map to 404 (no existence oracle for non-owners).
    if (result.reason === "noop") return NextResponse.json({ ok: true, changed: false });
    return new NextResponse(null, { status: 404 });
  }

  emit("circle_change_applied", {
    from_circle: circleTelemetry(result.from),
    to_circle: circleTelemetry(result.to),
    is_downgrade: result.isDowngrade,
  });
  if (result.linksRevoked > 0) {
    emit("public_link_revoked_on_downgrade", {});
  }
  if (result.isDowngrade) {
    // Revocation is complete the instant the transaction commits — the authz
    // layer re-checks on the next request, so propagation is one request away.
    emit("circle_downgrade_revocation_completed", { propagation_ms: 0 });
  }

  return NextResponse.json({
    ok: true,
    changed: true,
    circle: result.to,
    isDowngrade: result.isDowngrade,
    linksRevoked: result.linksRevoked,
  });
}

/**
 * Edit an existing event's BODY (FEAT-MRV) — note, day, place, location, and the
 * attached media set. Owner-only and atomic (see updateEvent). Circle is NOT
 * changed here; that stays on PATCH (its link-revocation semantics). A non-owner
 * or missing/deleted event returns 404 with no existence oracle.
 */
const EditBody = z.object({
  note: z.string().nullish(),
  occurredOn: z.string().datetime(),
  mediaPublicIds: z.array(z.string()).default([]),
  location: z.object({ lat: z.number(), lng: z.number() }).nullish(),
  placeName: z.string().nullish(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let account;
  try {
    account = await requireAccount();
  } catch (e) {
    if (e instanceof Unauthorized) return NextResponse.json({ ok: false }, { status: 401 });
    throw e;
  }

  const { id } = await params;
  const parsed = EditBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });

  const result = await updateEvent({
    accountId: account.id,
    eventId: id,
    note: parsed.data.note ?? null,
    occurredOn: new Date(parsed.data.occurredOn),
    mediaPublicIds: parsed.data.mediaPublicIds,
    location: parsed.data.location ?? null,
    placeName: parsed.data.placeName ?? null,
  });

  if (!result.ok) {
    // not_found (incl. non-owner) → 404 with no oracle; validation/media → 400.
    if (result.reason === "not_found") return new NextResponse(null, { status: 404 });
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  }

  emit("event_edited", {});
  return NextResponse.json({ ok: true, eventId: result.event.id });
}
