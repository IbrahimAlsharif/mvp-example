import type { Event, LegacyConsent, PrivacyCircle, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { acceptedConnectionsByTier } from "@/lib/connections";
import { resolveConsent } from "@/lib/events/consent";

/**
 * Create a timeline event as an ATOMIC multi-part write (US-1.1 AC-7).
 *
 * In one transaction we verify every referenced media is PERSISTED and owned by
 * this account (consuming the US-1.2 persistence signal), then create the event
 * with its circle + legacy-consent + date + note + idempotent submitKey and
 * attach the media. If any part fails the whole save rolls back — no orphan
 * event, no half-attached media; the caller surfaces a retryable error and only
 * reports success after the commit (no optimistic confirm, AC-3/AC-10).
 *
 * Idempotent: a duplicate submitKey (double-tap / retry) returns the existing
 * event rather than creating a second one (AC-8).
 */
export type CreateEventInput = {
  accountId: string;
  note?: string | null;
  occurredOn: Date;
  circle: PrivacyCircle;
  legacyConsent: boolean;
  /** Explicit tri-state consent (US-4.1). Falls back to the boolean / per-circle default. */
  legacyConsentValue?: LegacyConsent;
  mediaPublicIds: string[];
  submitKey: string;
  location?: { lat: number; lng: number } | null;
};

export type CreateEventResult =
  | { ok: true; event: Event; idempotentReplay: boolean }
  | { ok: false; reason: "empty_event" | "media_not_persisted" | "media_not_owned" };

export async function createEvent(input: CreateEventInput): Promise<CreateEventResult> {
  const hasNote = !!input.note && input.note.trim().length > 0;
  if (!hasNote && input.mediaPublicIds.length === 0) {
    return { ok: false, reason: "empty_event" }; // note-only OR media required (AC-2)
  }

  // Idempotent replay: a prior commit with this submitKey wins (AC-8).
  const existing = await prisma.event.findUnique({ where: { submitKey: input.submitKey } });
  if (existing) return { ok: true, event: existing, idempotentReplay: true };

  try {
    const event = await prisma.$transaction(async (tx) => {
      // Verify every referenced media is PERSISTED and owned, inside the tx, so
      // a concurrent change can't slip an unverified/foreign blob in (AC-7).
      if (input.mediaPublicIds.length > 0) {
        const media = await tx.media.findMany({
          where: { publicId: { in: input.mediaPublicIds }, deletedAt: null },
        });
        if (media.length !== input.mediaPublicIds.length) throw new MediaProblem("media_not_persisted");
        for (const m of media) {
          if (m.accountId !== input.accountId) throw new MediaProblem("media_not_owned");
          if (m.status !== "PERSISTED") throw new MediaProblem("media_not_persisted");
          if (m.eventId) throw new MediaProblem("media_not_owned"); // already attached elsewhere
        }
      }

      // Tri-state consent committed ATOMICALLY with the event + circle (AC-1).
      const consent = resolveConsent({
        circle: input.circle,
        value: input.legacyConsentValue,
        legacyBoolean: input.legacyConsent,
        now: new Date(),
      });
      const created = await tx.event.create({
        data: {
          accountId: input.accountId,
          note: hasNote ? input.note!.trim() : null,
          occurredOn: input.occurredOn,
          circle: input.circle, // atomic with the event (US-3.1 AC-9)
          legacyConsent: consent.boolean, // legacy boolean mirror
          legacyConsentValue: consent.value, // tri-state (US-4.1 AC-1/AC-3)
          legacyConsentAt: consent.at, // ISO-8601 decision time (UNSET → null)
          submitKey: input.submitKey,
          locationLat: input.location?.lat ?? null,
          locationLng: input.location?.lng ?? null,
        },
      });

      if (input.mediaPublicIds.length > 0) {
        await tx.media.updateMany({
          where: { publicId: { in: input.mediaPublicIds } },
          data: { eventId: created.id },
        });
      }
      return created;
    });
    return { ok: true, event, idempotentReplay: false };
  } catch (e) {
    if (e instanceof MediaProblem) return { ok: false, reason: e.reason };
    // Unique-violation race on submitKey → return the winning event (idempotent).
    if (isUniqueViolation(e)) {
      const winner = await prisma.event.findUnique({ where: { submitKey: input.submitKey } });
      if (winner) return { ok: true, event: winner, idempotentReplay: true };
    }
    throw e;
  }
}

class MediaProblem extends Error {
  constructor(public reason: "media_not_persisted" | "media_not_owned") {
    super(reason);
  }
}

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as Prisma.PrismaClientKnownRequestError).code === "P2002"
  );
}

/** List a viewer's own timeline events (newest moment first), excluding soft-deleted. */
export async function listOwnEvents(accountId: string) {
  return prisma.event.findMany({
    where: { accountId, deletedAt: null },
    orderBy: { occurredOn: "desc" },
    include: { media: { where: { deletedAt: null } } },
  });
}

/**
 * The cross-account timeline read path (J3/J9 visibility, graph-backed).
 *
 * Returns the events `viewerAccountId` may see, enforcing the load-bearing
 * invariant SERVER-SIDE (never UI-only):
 *   - own events:                 every circle (owner sees all of their own)
 *   - FAMILY-tier connection:     the author's FAMILY + PUBLIC_UNLISTED events
 *   - GENERAL-tier connection:    the author's PUBLIC_UNLISTED events only
 *   - no connection:              nothing
 *   - ME_ONLY:                    NEVER shared, regardless of any connection
 *
 * The viewer's own ME_ONLY/FAMILY/PUBLIC events are always included; another
 * account's ME_ONLY can never enter the result set by construction (it is never
 * added to any OR branch below).
 */
/**
 * PURE: build the visibility OR-clauses from the viewer id and their tiered
 * connections. Extracted so the load-bearing invariant (whose events, which
 * circles) is unit-testable without a database. ME_ONLY of another account is
 * never added to any branch, so it can never enter the result by construction.
 */
export function visibilityClauses(
  viewerAccountId: string,
  family: Set<string>,
  general: Set<string>,
): Prisma.EventWhereInput[] {
  const familyIds = [...family];
  // PUBLIC_UNLISTED is visible to any accepted connection (FAMILY or GENERAL).
  const publicAuthorIds = [...new Set([...family, ...general])];

  const or: Prisma.EventWhereInput[] = [{ accountId: viewerAccountId }];
  if (familyIds.length > 0) {
    or.push({ accountId: { in: familyIds }, circle: "FAMILY" });
  }
  if (publicAuthorIds.length > 0) {
    or.push({ accountId: { in: publicAuthorIds }, circle: "PUBLIC_UNLISTED" });
  }
  return or;
}

export async function listVisibleEvents(viewerAccountId: string) {
  const { family, general } = await acceptedConnectionsByTier(viewerAccountId);
  const or = visibilityClauses(viewerAccountId, family, general);

  return prisma.event.findMany({
    where: { deletedAt: null, OR: or },
    orderBy: { occurredOn: "desc" },
    include: { media: { where: { deletedAt: null } } },
  });
}

/** Soft-delete an event (recoverable; never a hard delete by a system event, G2). */
export async function softDeleteEvent(accountId: string, eventId: string): Promise<boolean> {
  const res = await prisma.event.updateMany({
    where: { id: eventId, accountId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return res.count === 1;
}
