import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/session";
import { resolveMediaAccess } from "@/lib/media/access";
import { presignGet } from "@/lib/storage/presign";
import { emit } from "@/lib/telemetry";

/**
 * The ONLY path to media bytes (US-3.3). The bucket is private; this route
 * authorizes the request (owner/Family via canViewEvent, or a valid unlisted
 * share token) and, only on allow, 302-redirects to a freshly minted presigned
 * GET that expires within ≤10 min. On deny it returns 403 — the bytes and the
 * internal storageKey are never exposed in any response.
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
