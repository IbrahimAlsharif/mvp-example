import type { PrivacyCircle } from "@prisma/client";

/**
 * Shared-content location precision control (US-2.2 AC-6/AC-7/AC-8).
 *
 * A precise location on a PUBLIC_UNLISTED (shared-link) event leaks sensitive
 * whereabouts — acutely so for children's content. The safe state is the
 * DEFAULT, never an opt-in: any time a non-owner sees an event via a share
 * link, its displayed location is coarsened to no finer than city/region, and
 * the served media file's embedded GPS EXIF is stripped to match
 * (see lib/media/exif-strip). The owner's own private record keeps full
 * precision (AC-7) — the reduction applies to shared exposure only.
 */

// Coarsening grid: 0.1° ≈ 11 km — comfortably no finer than city/region, and
// well coarser than the building-level precision a GPS tag carries. Rounding to
// the grid centre means two nearby captures collapse to the same coarse point,
// so the coarsened value cannot be reverse-engineered back to the exact spot.
const GRID_DEGREES = 0.1;

export function coarsenCoordinate(value: number): number {
  // Round to the nearest grid cell, then snap to the cell centre. Using the
  // centre (not the corner) keeps the coarse point inside the real area and
  // avoids biasing every location toward 0,0.
  const cell = Math.round(value / GRID_DEGREES);
  const centred = cell * GRID_DEGREES;
  // Normalise float noise to 1 decimal so the output is stable/serializable.
  return Math.round(centred * 10) / 10;
}

export type ViewerLocation =
  | { lat: number; lng: number; precision: "exact" }
  | { lat: number; lng: number; precision: "coarse" }
  | { lat: null; lng: null; precision: "omitted" };

/**
 * The location an event should expose to a given viewer.
 *
 *  - owner / authenticated Family member viewing a non-shared circle → exact.
 *  - any viewer reaching the event via a share link (PUBLIC_UNLISTED) → coarse,
 *    no finer than city/region. This is the conservative default and is applied
 *    server-side, so a stale read or CDN edge can never re-expose exact coords
 *    (AC-11): the exact coordinates simply never leave the server on this path.
 *  - no recorded location → omitted.
 *
 * `omitLocation` lets the owner opt an event's shared location out entirely
 * (stronger than coarsening); when set, shared viewers get `omitted`.
 */
export function locationForViewer(input: {
  lat: number | null;
  lng: number | null;
  circle: PrivacyCircle;
  via: "owner" | "family_member" | "share_link";
  omitLocation?: boolean;
}): ViewerLocation {
  if (input.lat == null || input.lng == null) {
    return { lat: null, lng: null, precision: "omitted" };
  }
  // The reduction targets shared-LINK exposure: an anonymous viewer reaching the
  // event through a PUBLIC_UNLISTED share token. The owner and authenticated
  // Family members see the full-precision record (AC-7) — Family is a
  // non-shared circle granted by relationship, not a public link.
  if (input.via !== "share_link") {
    return { lat: input.lat, lng: input.lng, precision: "exact" };
  }
  if (input.omitLocation) {
    return { lat: null, lng: null, precision: "omitted" };
  }
  return {
    lat: coarsenCoordinate(input.lat),
    lng: coarsenCoordinate(input.lng),
    precision: "coarse",
  };
}
