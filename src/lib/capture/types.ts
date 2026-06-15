/**
 * Capture-permission domain types (US-0.2). Kept framework-free so the
 * decision logic is unit-testable without a browser.
 */

export type CaptureModality = "camera" | "mic" | "location";

/** Outcome of asking for (or detecting) a modality's availability. */
export type PermissionResult = "granted" | "denied" | "dismissed" | "unsupported";

/** What the user can do for a modality once availability is known. */
export type CaptureRoute =
  | { mode: "live"; modality: CaptureModality } // permission granted → live capture
  | { mode: "upload" } // denied/dismissed/unsupported → file upload
  | { mode: "manual_location" } // location denied/unsupported → manual entry
  | { mode: "note_only" }; // no media at all

/** The fallback the user ended up using after a non-grant (telemetry enum). */
export type FallbackType = "upload" | "manual_location" | "manual_date" | "note_only";

/**
 * Map a permission result to the route the UI should take. The hard rule
 * (US-0.2 AC-3): a non-grant NEVER dead-ends — camera/mic fall back to upload,
 * location falls back to manual entry. Only "granted" yields live capture.
 */
export function routeForResult(
  modality: CaptureModality,
  result: PermissionResult,
): CaptureRoute {
  if (result === "granted") return { mode: "live", modality };
  if (modality === "location") return { mode: "manual_location" };
  return { mode: "upload" };
}

/** The fallback enum a given non-grant lands on, for content-blind telemetry. */
export function fallbackForResult(
  modality: CaptureModality,
  result: PermissionResult,
): FallbackType | null {
  if (result === "granted") return null;
  return modality === "location" ? "manual_location" : "upload";
}
