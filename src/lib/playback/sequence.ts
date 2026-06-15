import { prisma } from "@/lib/db";
import { listVisibleEvents } from "@/lib/events/create";

/**
 * Life Playback sequence builder (US-2.3). The CRITICAL property: the sequence
 * is built SERVER-SIDE from only the events the current viewer is permitted to
 * see — never client-side hiding (AC-5/AC-9, NFR). It reuses listVisibleEvents,
 * which already enforces circles + the live roster, so a downgrade or roster
 * removal is honored on the NEXT build with no stale inclusion. Source media is
 * read-only here — playback never mutates/deletes the underlying events (G2/AC-11).
 */

export type PlaybackSpan = "year" | "decade" | "life";

export type PlaybackFrame = {
  eventId: string;
  occurredOn: string;
  note: string | null;
  media: { publicId: string }[];
};

/** The [start, end) window for a span ending at `endMs` (default: now). */
export function spanWindow(span: PlaybackSpan, endMs: number): { startMs: number; endMs: number } {
  const YEAR = 365 * 86_400_000;
  const startMs =
    span === "year" ? endMs - YEAR : span === "decade" ? endMs - 10 * YEAR : 0; // "life" = from epoch
  return { startMs, endMs };
}

/**
 * Pure sequence assembly (exported for tests): given the viewer's permitted
 * events and a window, produce chronologically-ordered frames, skipping events
 * with no playable media gracefully (AC-7) without inserting duplicates or
 * out-of-circle fillers.
 */
export function assembleSequence(
  events: { id: string; occurredOn: Date; note: string | null; media: { publicId: string }[] }[],
  window: { startMs: number; endMs: number },
): PlaybackFrame[] {
  return events
    .filter((e) => {
      const t = e.occurredOn.getTime();
      return t >= window.startMs && t <= window.endMs;
    })
    .sort((a, b) => a.occurredOn.getTime() - b.occurredOn.getTime()) // chronological (AC-2)
    .map((e) => ({
      eventId: e.id,
      occurredOn: e.occurredOn.toISOString(),
      note: e.note,
      // Skip undated/unprocessed media gracefully — a frame may have 0 media and
      // is then a note-only placeholder rather than a stall (AC-7).
      media: e.media.map((m) => ({ publicId: m.publicId })),
    }));
}

/**
 * Build the playback sequence for a viewer. Server-side circle enforcement is
 * inherited from listVisibleEvents (only the viewer's own + circle-permitted
 * events of accepted connections). Re-resolved on every call so a circle
 * downgrade / roster removal / event deletion is reflected immediately (AC-9/10).
 */
export async function buildPlaybackSequence(input: {
  viewerAccountId: string;
  span: PlaybackSpan;
  endMs: number;
}): Promise<PlaybackFrame[]> {
  const events = await listVisibleEvents(input.viewerAccountId);
  const window = spanWindow(input.span, input.endMs);
  return assembleSequence(events, window);
}

/** Whether an account currently owns/sees the event — used by a shared playback. */
export async function eventStillVisible(viewerAccountId: string, eventId: string): Promise<boolean> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.deletedAt) return false;
  const { canViewEvent } = await import("@/lib/authz/circle");
  return canViewEvent(viewerAccountId, event);
}
