import type { LegacyConsent, PrivacyCircle } from "@prisma/client";

/**
 * Legacy-consent tri-state resolution (US-4.1). GRANTED / DENIED are explicit
 * owner choices (each stamped with a decision time); UNSET is the default and is
 * treated IDENTICALLY to DENIED — silence = no future heir access (AC-2). The
 * value is captured + exported only; NO code path reads it to grant access at
 * MVP (inheritance is deferred, G9, AC-8).
 */

/** Per-circle consent default that SEEDS a new item's value (AC-5). The item's
 * own value is the governing, independently-editable value once created. The
 * conservative default everywhere is UNSET (no heir access). */
export const CIRCLE_CONSENT_DEFAULT: Record<PrivacyCircle, LegacyConsent> = {
  ME_ONLY: "UNSET",
  FAMILY: "UNSET",
  PUBLIC_UNLISTED: "UNSET",
};

/**
 * Resolve the tri-state value + timestamp to persist for a create/import.
 *  - An explicit tri-state value wins and is stamped if GRANTED/DENIED.
 *  - Else the legacy boolean maps (true → GRANTED, false → seed default).
 *  - Else the per-circle default seeds it (AC-5).
 * UNSET carries no timestamp (no decision was made).
 */
export function resolveConsent(input: {
  circle: PrivacyCircle;
  value?: LegacyConsent;
  legacyBoolean?: boolean;
  now: Date;
}): { value: LegacyConsent; at: Date | null; boolean: boolean } {
  let value: LegacyConsent;
  if (input.value) {
    value = input.value;
  } else if (input.legacyBoolean === true) {
    value = "GRANTED";
  } else if (input.legacyBoolean === false) {
    value = CIRCLE_CONSENT_DEFAULT[input.circle];
  } else {
    value = CIRCLE_CONSENT_DEFAULT[input.circle];
  }
  const at = value === "UNSET" ? null : input.now;
  // Keep the legacy boolean column consistent: only GRANTED is "true".
  return { value, at, boolean: value === "GRANTED" };
}

/** Whether a stored consent value would permit heir access — ALWAYS false at
 * MVP regardless of value, because inheritance is not built (G9/AC-8). This
 * exists so any future caller is forced through an explicit, auditable gate
 * rather than reading the raw enum. */
export function grantsHeirAccess(_value: LegacyConsent): boolean {
  return false; // inheritance deferred — the flag is never an access backdoor
}
