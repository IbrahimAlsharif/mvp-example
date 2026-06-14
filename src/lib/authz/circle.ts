import type { PrivacyCircle } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * THE server-side read-authorization chokepoint for events and their media
 * (US-3.1 AC-6/AC-7, the *Privacy enforcement* quality scenario).
 *
 * Every read path — timeline queries, the event API, and the media serve route
 * (US-3.3) — MUST decide visibility through this function. UI hiding is never a
 * substitute (AC-6/AC-7): a Me-Only item must be unreachable by another account
 * via UI *or* direct/API/media URL.
 *
 * The pure decision is in `decideAccess` so the full truth table is unit-testable
 * without a database; `canViewEvent` wraps it and resolves Family membership.
 */
export type ViewableEvent = {
  accountId: string;
  circle: PrivacyCircle;
  deletedAt: Date | null;
};

/**
 * Pure access decision. `isFamilyMember` is the resolved roster answer for the
 * FAMILY case (US-3.5 owns the roster; this just consumes a boolean).
 *
 * Note PUBLIC_UNLISTED denies *direct* event/media reads here — public content
 * is reachable only through a valid unlisted share-link token, which is checked
 * separately in the media/share routes (US-3.3), not via this owner/roster gate.
 */
export function decideAccess(
  viewerAccountId: string | null,
  event: ViewableEvent,
  isFamilyMember: boolean,
): boolean {
  if (event.deletedAt) return false; // soft-deleted: invisible to everyone (G2)
  if (viewerAccountId && viewerAccountId === event.accountId) return true; // owner
  switch (event.circle) {
    case "ME_ONLY":
      return false;
    case "FAMILY":
      return isFamilyMember;
    case "PUBLIC_UNLISTED":
      return false; // direct read denied; link path handled by US-3.3
    default:
      return false; // fail closed on any unknown circle
  }
}

/**
 * Family-membership roster check. US-3.5 owns the actual roster; until then no
 * one is a Family member, so FAMILY events are owner-only. The call site exists
 * so US-3.5 drops in here without touching any enforcement caller (AC-8).
 */
export async function isFamilyMember(
  _viewerAccountId: string | null,
  _ownerAccountId: string,
): Promise<boolean> {
  return false;
}

/** Resolve Family membership and apply the access decision. */
export async function canViewEvent(
  viewerAccountId: string | null,
  event: ViewableEvent,
): Promise<boolean> {
  // Short-circuit before any roster lookup for the common owner/me-only paths.
  if (event.deletedAt) return false;
  if (viewerAccountId && viewerAccountId === event.accountId) return true;
  if (event.circle !== "FAMILY") return decideAccess(viewerAccountId, event, false);
  const member = await isFamilyMember(viewerAccountId, event.accountId);
  return decideAccess(viewerAccountId, event, member);
}

/**
 * Fetch an event the viewer is allowed to see, or null. The single helper read
 * routes use so enforcement can never be forgotten. Returns null both when the
 * event does not exist and when access is denied (no existence oracle).
 */
export async function getViewableEvent(
  viewerAccountId: string | null,
  eventId: string,
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return null;
  const allowed = await canViewEvent(viewerAccountId, event);
  return allowed ? event : null;
}

/** The exactly-three circles, in display order, Me-Only first (US-3.1 AC-1). */
export const CIRCLES: PrivacyCircle[] = ["ME_ONLY", "FAMILY", "PUBLIC_UNLISTED"];

/** Default circle for any create/import path (G1). */
export const DEFAULT_CIRCLE: PrivacyCircle = "ME_ONLY";

/** Map the Prisma enum to the content-blind telemetry token (G4). */
export function circleTelemetry(circle: PrivacyCircle): string {
  return circle.toLowerCase();
}
