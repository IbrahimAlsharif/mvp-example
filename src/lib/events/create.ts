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
  /** Structured free-text place (J2.4); stored on its own column, not folded into the note. */
  placeName?: string | null;
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
          placeName: input.placeName?.trim() ? input.placeName.trim() : null,
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

/**
 * Edit an existing event's body (US — FEAT-MRV) as an ATOMIC, owner-scoped write.
 *
 * Mirrors createEvent's guarantees: in one transaction we re-resolve the media
 * set — verifying any NEWLY added publicId is PERSISTED, owned, and unattached;
 * detaching media the user removed; attaching the new ones — then update the
 * note/date/place/location. Ownership is enforced by scoping every write to
 * `{ id, accountId, deletedAt: null }`, so a non-owner (or a deleted event) gets
 * `not_found` with no existence oracle. Circle is intentionally NOT changed here
 * — that stays on the dedicated changeEventCircle path (its link-revocation
 * semantics); the edit popup keeps the circle control separate.
 */
export type UpdateEventInput = {
  accountId: string;
  eventId: string;
  note?: string | null;
  occurredOn: Date;
  mediaPublicIds: string[];
  location?: { lat: number; lng: number } | null;
  placeName?: string | null;
};

export type UpdateEventResult =
  | { ok: true; event: Event }
  | { ok: false; reason: "empty_event" | "not_found" | "media_not_persisted" | "media_not_owned" };

export async function updateEvent(input: UpdateEventInput): Promise<UpdateEventResult> {
  const hasNote = !!input.note && input.note.trim().length > 0;
  if (!hasNote && input.mediaPublicIds.length === 0) {
    return { ok: false, reason: "empty_event" }; // note-only OR media required (AC-2)
  }

  try {
    const event = await prisma.$transaction(async (tx) => {
      // Owner-scoped existence check inside the tx (no oracle for non-owners).
      const existing = await tx.event.findFirst({
        where: { id: input.eventId, accountId: input.accountId, deletedAt: null },
        include: { media: { where: { deletedAt: null } } },
      });
      if (!existing) throw new NotFound();

      const currentIds = new Set(existing.media.map((m) => m.publicId));
      const nextIds = new Set(input.mediaPublicIds);
      const toAttach = input.mediaPublicIds.filter((id) => !currentIds.has(id));
      const toDetach = [...currentIds].filter((id) => !nextIds.has(id));

      // Verify every NEWLY attached media is persisted, owned, and free — same
      // invariant as create, so an edit can't smuggle in a foreign/unverified blob.
      if (toAttach.length > 0) {
        const media = await tx.media.findMany({ where: { publicId: { in: toAttach }, deletedAt: null } });
        if (media.length !== toAttach.length) throw new MediaProblem("media_not_persisted");
        for (const m of media) {
          if (m.accountId !== input.accountId) throw new MediaProblem("media_not_owned");
          if (m.status !== "PERSISTED") throw new MediaProblem("media_not_persisted");
          if (m.eventId && m.eventId !== input.eventId) throw new MediaProblem("media_not_owned");
        }
      }

      if (toDetach.length > 0) {
        // Detach (don't delete) — the blob stays the owner's, just unlinked.
        await tx.media.updateMany({
          where: { publicId: { in: toDetach }, eventId: input.eventId },
          data: { eventId: null },
        });
      }
      if (toAttach.length > 0) {
        await tx.media.updateMany({
          where: { publicId: { in: toAttach } },
          data: { eventId: input.eventId },
        });
      }

      return tx.event.update({
        where: { id: input.eventId },
        data: {
          note: hasNote ? input.note!.trim() : null,
          occurredOn: input.occurredOn,
          locationLat: input.location?.lat ?? null,
          locationLng: input.location?.lng ?? null,
          placeName: input.placeName?.trim() ? input.placeName.trim() : null,
        },
      });
    });
    return { ok: true, event };
  } catch (e) {
    if (e instanceof NotFound) return { ok: false, reason: "not_found" };
    if (e instanceof MediaProblem) return { ok: false, reason: e.reason };
    throw e;
  }
}

class NotFound extends Error {}

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
 *   - PUBLIC (any author):        visible to any authenticated viewer, no
 *                                 connection required
 *   - no connection:              own events + any author's PUBLIC
 *   - ME_ONLY:                    NEVER shared, regardless of any connection
 *
 * The viewer's own ME_ONLY/FAMILY/PUBLIC events are always included; another
 * account's ME_ONLY can never enter the result set by construction (it is never
 * added to any OR branch below). PUBLIC is the one cross-account branch with no
 * accountId filter — reachable only because this path runs for a logged-in
 * viewer (anonymous requests never call it).
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
  // PUBLIC events are visible to any AUTHENTICATED viewer regardless of
  // connection — the only branch with no accountId constraint. `viewerAccountId`
  // is non-null here (this path runs for a logged-in viewer), so anonymous
  // discovery is impossible by construction: a logged-out request never reaches
  // listVisibleEvents. ME_ONLY/FAMILY of other accounts remain unreachable.
  or.push({ circle: "PUBLIC" });
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
