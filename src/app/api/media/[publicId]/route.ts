import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/session";
import { resolveMediaAccess } from "@/lib/media/access";
import { presignGet, getObjectBytes } from "@/lib/storage/presign";
import { stripJpegMetadata } from "@/lib/media/exif-strip";
import { emit } from "@/lib/telemetry";

/**
 * The ONLY path to media bytes (US-3.3). The bucket is private; this route
 * authorizes the request (owner/Family via canViewEvent, or a valid unlisted
 * share token) and, only on allow, serves the object. On deny it returns 404 —
 * the bytes and the internal storageKey are never exposed in any response.
 *
 * Two serve paths:
 *  - owner / authenticated Family member → 302-redirect to a freshly minted
 *    presigned GET (≤10 min). They are entitled to the original file, EXIF and
 *    all (US-2.2 AC-7); the fast redirect path is unchanged.
 *  - share-link (anonymous public viewer) → the server fetches the bytes,
 *    STRIPS GPS EXIF for JPEGs (US-2.2 AC-6), and streams them back with
 *    no-store so no CDN/edge caches the original. The exact-coordinate EXIF
 *    block never leaves the server on this path — a stale read cannot
 *    re-expose it (AC-11).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  const shareToken = req.nextUrl.searchParams.get("share");
  const account = await getCurrentAccount();

  const access = await resolveMediaAccess({
    publicId,
    viewerAccountId: account?.id ?? null,
    shareToken,
  });

  if (!access.ok) {
    emit("media_access_denied", { reason: denyReason(access.reason), access_via: shareToken ? "share_link" : "owner" });
    // Uniform 404 for every non-allow outcome (missing, not-persisted, denied,
    // expired, revoked). This avoids an existence oracle — a prober cannot
    // distinguish "exists but you can't see it" from "doesn't exist" — consistent
    // with getViewableEvent (US-3.1). The precise reason stays in telemetry only.
    return new NextResponse(null, { status: 404 });
  }

  // Shared-link viewers get a GPS-stripped copy, served from the app server so
  // the original (EXIF-bearing) object is never presigned to a public viewer.
  if (access.via === "share_link") {
    const raw = await getObjectBytes(access.storageKey);
    const isJpeg = access.mimeType === "image/jpeg" || access.mimeType === "image/jpg";
    const bytes = isJpeg ? stripJpegMetadata(raw) : raw;
    if (isJpeg) emit("media_exif_stripped", { access_via: "share_link", media_type: "photo" });
    emit("media_access_granted", { access_via: access.via });
    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": access.mimeType,
        // Never let an edge/CDN cache a public copy — keeps the served state
        // consistent with the current circle and stripping policy (AC-11).
        "Cache-Control": "private, no-store",
      },
    });
  }

  const url = await presignGet(access.storageKey);
  emit("media_access_granted", { access_via: access.via });
  // 302 to the short-lived presigned URL; storageKey never leaves the server.
  return NextResponse.redirect(url, { status: 302 });
}

function denyReason(reason: string): string {
  // Map to the content-blind telemetry enum (G4).
  const map: Record<string, string> = {
    not_found: "not_member",
    not_persisted: "not_member",
    no_auth: "no_auth",
    expired: "expired",
    revoked: "revoked",
  };
  return map[reason] ?? "no_auth";
}
