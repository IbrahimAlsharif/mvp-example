import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveShareLink } from "@/lib/media/share";
import { locationForViewer } from "@/lib/events/location";
import { emit } from "@/lib/telemetry";

/**
 * Resolve an unlisted share link (US-3.3). Validates the token server-side
 * (non-guessable, bounded expiry, revocable) and — only if valid AND the event
 * is still PUBLIC_UNLISTED — returns the event's persisted media publicIds. A
 * public viewer then fetches each via /api/media/<publicId>?share=<token>, which
 * re-authorizes on every request. Expired/revoked/downgraded links are denied.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const res = await resolveShareLink(token);
  if (!res.ok) {
    if (res.reason === "expired") emit("unlisted_link_expired", {});
    const status = res.reason === "not_found" ? 404 : 403;
    return NextResponse.json({ ok: false, reason: res.reason }, { status });
  }

  const event = await prisma.event.findUnique({
    where: { id: res.link.eventId },
    include: { media: { where: { status: "PERSISTED", deletedAt: null } } },
  });
  // A downgrade away from PUBLIC_UNLISTED revokes link access (AC-6, honored live).
  if (!event || event.deletedAt || event.circle !== "PUBLIC_UNLISTED") {
    return NextResponse.json({ ok: false, reason: "revoked" }, { status: 403 });
  }

  // Coarsen the displayed location to no finer than city/region for the public
  // shared view (US-2.2 AC-6). Exact coordinates never leave the server on this
  // path; the served media files are additionally GPS-EXIF-stripped by
  // /api/media when fetched with this share token.
  const loc = locationForViewer({
    lat: event.locationLat,
    lng: event.locationLng,
    circle: event.circle,
    via: "share_link",
  });
  if (loc.precision !== "omitted") {
    emit("shared_location_precision_applied", { reason: loc.precision });
  }

  return NextResponse.json({
    ok: true,
    event: {
      occurredOn: event.occurredOn,
      note: event.note,
      // Coarsened to city/region or omitted — never exact coordinates (AC-6).
      location: loc.precision === "omitted" ? null : { lat: loc.lat, lng: loc.lng, precision: loc.precision },
      // Only the non-guessable publicIds — never storageKeys (US-3.3 AC-1).
      media: event.media.map((m) => ({ publicId: m.publicId, type: m.type })),
    },
  });
}
