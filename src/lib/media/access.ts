import { prisma } from "@/lib/db";
import { canViewEvent } from "@/lib/authz/circle";
import { resolveShareLink } from "@/lib/media/share";

/**
 * Decide whether a request may receive the bytes of a media object, and if so
 * yield its internal storageKey (US-3.3). This is the app-layer authz gate that
 * sits in front of the short-lived presigned GET — the bucket is private and the
 * client never receives a durable S3 URL or the storageKey itself.
 *
 * Two grant paths:
 *  - authenticated owner/Family member → via canViewEvent (US-3.1), re-checked
 *    against the event's CURRENT circle on every request (AC-3), so a US-3.2
 *    downgrade is honored immediately by the media layer.
 *  - a valid unlisted share token whose event is PUBLIC_UNLISTED (AC-2/AC-6/AC-7).
 *
 * URL possession alone never authorizes bytes (AC-8): a non-member holding a
 * Me-Only/Family media URL is denied. Media must be PERSISTED and not deleted.
 */
export type MediaAccess =
  | { ok: true; storageKey: string; via: "owner" | "family_member" | "share_link" }
  | { ok: false; reason: "not_found" | "not_persisted" | "no_auth" | "expired" | "revoked" };

export async function resolveMediaAccess(input: {
  publicId: string;
  viewerAccountId: string | null;
  shareToken?: string | null;
}): Promise<MediaAccess> {
  const media = await prisma.media.findUnique({ where: { publicId: input.publicId } });
  if (!media || media.deletedAt) return { ok: false, reason: "not_found" };
  if (media.status !== "PERSISTED") return { ok: false, reason: "not_persisted" };
  if (!media.eventId) return { ok: false, reason: "no_auth" }; // unattached media is not servable

  const event = await prisma.event.findUnique({ where: { id: media.eventId } });
  if (!event || event.deletedAt) return { ok: false, reason: "not_found" };

  // Share-link path: only valid for an event that is currently PUBLIC_UNLISTED,
  // and the link must belong to that event (AC re-authorization at request time).
  if (input.shareToken) {
    const res = await resolveShareLink(input.shareToken);
    if (!res.ok) return { ok: false, reason: res.reason === "not_found" ? "no_auth" : res.reason };
    if (res.link.eventId !== event.id) return { ok: false, reason: "no_auth" };
    if (event.circle !== "PUBLIC_UNLISTED") return { ok: false, reason: "no_auth" };
    return { ok: true, storageKey: media.storageKey, via: "share_link" };
  }

  // Authenticated owner/Family path.
  const allowed = await canViewEvent(input.viewerAccountId, event);
  if (!allowed) return { ok: false, reason: "no_auth" };
  const via = input.viewerAccountId === event.accountId ? "owner" : "family_member";
  return { ok: true, storageKey: media.storageKey, via };
}
