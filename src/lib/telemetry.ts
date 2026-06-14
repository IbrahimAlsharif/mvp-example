/**
 * Content-blind telemetry emitter (guardrail G4).
 *
 * Events may ONLY carry structural metadata: enums, booleans, integers,
 * timestamps, and opaque account/session ids. They must NEVER carry memory
 * media, note text, captions, filenames, or precise coordinates.
 *
 * Enforcement at the boundary, two layers:
 *  1. Only known ENUM_FIELDS may carry string values. Any other field (e.g.
 *     `note`, `filename`, `caption`) carrying a string is rejected outright.
 *  2. Those strings must be short, lowercase enum tokens (/^[a-z0-9_]+$/, <=40).
 *     Free-text content — which carries spaces, capitals, punctuation, or
 *     digits-in-names — fails this structural check.
 *
 * The canonical event taxonomy is owned by US-0.3; until then, callers emit
 * through here so names/fields are swappable without touching call sites.
 */

// Strings are permitted only for these bounded enum fields; all other values
// must be number/boolean/null to stay structurally content-blind.
export type TelemetryValue = string | number | boolean | null;
export type TelemetryPayload = Record<string, TelemetryValue>;

const ENUM_FIELDS = new Set<string>([
  "method",
  "provider",
  "result",
  "context",
  "surface",
  "source",
  "circle",
  "from_circle",
  "to_circle",
  "permission_type",
  "fallback_type",
  "media_type",
  "failure_reason",
  "reason",
  "trigger",
  "purpose",
  "granularity",
  "access_via",
  "file_size_bucket",
  "duration_bucket",
  "mode",
  "engine",
  // US-0.3 funnel / cohort structural enums.
  "stage",
  "cohort_week",
  "diagnosis",
  "precision_mode",
]);

const ENUM_TOKEN = /^[a-z0-9_]{1,40}$/;

export class ContentBlindViolation extends Error {}

function assertContentBlind(event: string, payload: TelemetryPayload): void {
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value !== "string") continue;
    if (!ENUM_FIELDS.has(key)) {
      throw new ContentBlindViolation(
        `telemetry "${event}" field "${key}" carries a string but is not an enum field (G4 violation)`,
      );
    }
    if (!ENUM_TOKEN.test(value)) {
      throw new ContentBlindViolation(
        `telemetry "${event}" field "${key}" value is not a bounded enum token (G4 violation)`,
      );
    }
  }
}

export function emit(event: string, payload: TelemetryPayload = {}): void {
  // Validate first: a content-bearing payload is rejected before transmission.
  assertContentBlind(event, payload);

  // Non-blocking sink. In dev we log; a real ingest pipeline lands in US-0.3.
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.info(`[telemetry] ${event}`, { ...payload, ts: new Date().toISOString() });
  }
}

/**
 * Emit from a user-action path WITHOUT ever throwing into that path (US-0.3
 * NFR: instrumentation is non-blocking — telemetry failure degrades to
 * dropped-and-monitored, never a user-visible error). A content-blind violation
 * is surfaced as the `telemetry_validation_rejected` ops signal (G4 guardrail
 * signal) instead of propagating.
 */
export function safeEmit(event: string, payload: TelemetryPayload = {}): void {
  try {
    emit(event, payload);
  } catch (e) {
    if (e instanceof ContentBlindViolation) {
      // Report the rejection itself with only the offending event NAME (an enum
      // token), never the rejected payload — so the ops signal stays content-blind.
      try {
        emit("telemetry_validation_rejected", { context: safeEventToken(event) });
      } catch {
        /* never let the ops signal throw into a user action */
      }
      return;
    }
    // Any other error is swallowed here; the user action must not fail on it.
  }
}

function safeEventToken(event: string): string {
  return ENUM_TOKEN.test(event) ? event : "unknown";
}
