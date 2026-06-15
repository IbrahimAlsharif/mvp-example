/**
 * Future-capsule unlock timing (US-4.2 AC-6/AC-7, the gated trust property).
 *
 * The unlock instant must resolve TIMEZONE-CORRECTLY to one well-defined moment
 * in the OWNER's seal-time timezone (captured at seal, stored with its offset),
 * and the capsule must unlock with ZERO pre-D tolerance and no later than
 * D + 60 min. A later timezone change must never move the instant earlier than
 * the sealed resolved D.
 *
 * We store the resolved unlock instant as an absolute epoch-ms (`unlockAtMs`)
 * computed once at seal time from the local date + the owner's offset, so the
 * comparison at evaluation time is a pure absolute-time check — immune to any
 * later DST/offset drift.
 */

const UNLOCK_WINDOW_MS = 60 * 60 * 1000; // D .. D+60min (NFR bounded window)

/**
 * Resolve a local unlock day (yyyy-mm-dd) + the owner's UTC offset (minutes,
 * e.g. +180 for Asia/Riyadh) to the absolute instant the capsule unlocks. The
 * capsule unlocks at the START of that local day. Returns null for an
 * unparseable date.
 */
export function resolveUnlockInstant(localDay: string, ownerOffsetMinutes: number): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDay);
  if (!m) return null;
  const [, y, mo, d] = m;
  // Midnight of the local day, expressed as UTC: subtract the owner's offset.
  const utcMidnight = Date.UTC(Number(y), Number(mo) - 1, Number(d));
  return utcMidnight - ownerOffsetMinutes * 60_000;
}

/** True only for a strictly-future instant (US-4.2 AC-3: reject past/now dates). */
export function isFutureInstant(unlockAtMs: number, nowMs: number): boolean {
  return unlockAtMs > nowMs;
}

export type UnlockState = "locked" | "unlocked" | "unlock_failed";

/**
 * Evaluate a sealed capsule's unlock state against the current time.
 *  - before D                → locked (content unreachable, AC-6).
 *  - D .. D+60min            → unlocked (within the allowed window).
 *  - after D+60min still due → unlock_failed (emit capsule_unlock_failed, NFR).
 * Zero pre-D tolerance: at exactly D it is unlocked; one ms before, locked.
 */
export function evaluateUnlock(unlockAtMs: number, nowMs: number): UnlockState {
  if (nowMs < unlockAtMs) return "locked";
  if (nowMs <= unlockAtMs + UNLOCK_WINDOW_MS) return "unlocked";
  return "unlock_failed";
}
