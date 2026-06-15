import type { PrivacyCircle } from "@prisma/client";

/**
 * Serializable timeline event passed from the server component across the
 * client boundary. `occurredOn` is an ISO string (Date doesn't survive the RSC
 * boundary cleanly); location is null when the event has no coordinates.
 */
export type EventVM = {
  id: string;
  note: string | null;
  occurredOn: string;
  circle: PrivacyCircle;
  media: { publicId: string }[];
  lat: number | null;
  lng: number | null;
  /** Structured free-text place (J2.4); null/absent when the event has no named place. */
  placeName?: string | null;
  /** True when the viewing account owns this event (may change its circle). */
  isOwn?: boolean;
};

/** True when the event carries map coordinates. */
export function hasLocation(e: EventVM): e is EventVM & { lat: number; lng: number } {
  return e.lat != null && e.lng != null;
}

/** True when the event has at least one attached media item. */
export function hasMedia(e: EventVM): boolean {
  return e.media.length > 0;
}
