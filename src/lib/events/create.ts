import type { Event, PrivacyCircle, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

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

      const created = await tx.event.create({
        data: {
          accountId: input.accountId,
          note: hasNote ? input.note!.trim() : null,
          occurredOn: input.occurredOn,
          circle: input.circle, // atomic with the event (US-3.1 AC-9)
          legacyConsent: input.legacyConsent, // atomic consent flag (US-4.1/G5)
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

/** Soft-delete an event (recoverable; never a hard delete by a system event, G2). */
export async function softDeleteEvent(accountId: string, eventId: string): Promise<boolean> {
  const res = await prisma.event.updateMany({
    where: { id: eventId, accountId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return res.count === 1;
}
