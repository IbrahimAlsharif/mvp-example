import type { CaptureModality, PermissionResult } from "@/lib/capture/types";

/**
 * Browser capture support + permission helpers (US-0.2).
 *
 * Design rules encoded here:
 *  - Detection never throws and never forces a blocking prompt on load
 *    (AC-6, NFR): a missing API yields "unsupported", not an exception.
 *  - Location never silently falls back to IP/coarse geolocation (AC-4): if the
 *    geolocation permission is denied/unavailable, the resolved location is
 *    simply absent and the user enters it manually.
 *  - All functions are guarded for SSR (no `navigator`) so importing this module
 *    in a server component is safe.
 */

function hasNavigator(): boolean {
  return typeof navigator !== "undefined";
}

/** True if the browser exposes the API a modality needs (AC-6 detection). */
export function isModalitySupported(modality: CaptureModality): boolean {
  if (!hasNavigator()) return false;
  switch (modality) {
    case "camera":
    case "mic":
      return typeof navigator.mediaDevices?.getUserMedia === "function";
    case "location":
      return typeof navigator.geolocation?.getCurrentPosition === "function";
  }
}

/**
 * Best-effort, non-prompting read of a permission's current state via the
 * Permissions API. Returns null when the API or the specific permission name is
 * unavailable (common in Safari for camera/mic) — callers must NOT treat null as
 * denied; it just means "ask in context". Never throws.
 */
export async function queryPermissionState(
  modality: CaptureModality,
): Promise<"granted" | "denied" | "prompt" | null> {
  if (!hasNavigator() || !navigator.permissions?.query) return null;
  const name = modality === "location" ? "geolocation" : modality === "mic" ? "microphone" : "camera";
  try {
    const status = await navigator.permissions.query({ name: name as PermissionName });
    return status.state;
  } catch {
    // Permission name not supported by this browser → unknown, ask in context.
    return null;
  }
}

/**
 * Request live camera/mic access in context. Returns a structural result only —
 * the MediaStream itself is handed to the caller on grant; on any failure we map
 * the DOMException to a content-blind result enum and never throw to the UI.
 */
export async function requestMediaStream(
  modality: "camera" | "mic",
): Promise<{ result: PermissionResult; stream: MediaStream | null }> {
  if (!isModalitySupported(modality)) return { result: "unsupported", stream: null };
  const constraints: MediaStreamConstraints = modality === "camera" ? { video: true } : { audio: true };
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return { result: "granted", stream };
  } catch (e) {
    return { result: mediaErrorToResult(e), stream: null };
  }
}

function mediaErrorToResult(e: unknown): PermissionResult {
  const name = (e as { name?: string })?.name;
  // NotAllowedError = user denied or browser policy; SecurityError = blocked.
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  // AbortError = user dismissed the prompt without choosing.
  if (name === "AbortError") return "dismissed";
  // NotFoundError = no device; treat as unsupported → upload fallback.
  if (name === "NotFoundError" || name === "NotReadableError" || name === "OverconstrainedError") {
    return "unsupported";
  }
  return "denied";
}

/**
 * Request the device's current location ON DEMAND (AC-4). Never falls back to
 * IP/coarse geolocation: a denial/timeout/unavailable yields a non-grant result
 * and NO coordinates, so the caller leaves the location empty for manual entry.
 * The resolved coordinates are returned to the caller only — never logged or
 * sent to telemetry (G4 + child-data minimization).
 */
export async function requestLocation(): Promise<{
  result: PermissionResult;
  coords: { lat: number; lng: number } | null;
}> {
  if (!isModalitySupported("location")) return { result: "unsupported", coords: null };
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ result: "granted", coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      (err) => {
        // 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT.
        const result: PermissionResult = err.code === 1 ? "denied" : err.code === 2 ? "unsupported" : "dismissed";
        resolve({ result, coords: null });
      },
      // No enableHighAccuracy demand and a bounded timeout; importantly, no
      // IP/coarse fallback is ever requested.
      { timeout: 10_000, maximumAge: 0 },
    );
  });
}
