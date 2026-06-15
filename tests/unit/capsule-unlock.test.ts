import { describe, it, expect } from "vitest";
import {
  resolveUnlockInstant,
  isFutureInstant,
  evaluateUnlock,
} from "@/lib/capsules/unlock";

describe("US-4.2 timezone-correct unlock resolution (AC-7)", () => {
  it("resolves the local day to the start-of-day instant in the owner's offset", () => {
    // Riyadh (+180 min): midnight 2030-01-01 local == 2029-12-31T21:00Z.
    const riyadh = resolveUnlockInstant("2030-01-01", 180);
    expect(riyadh).toBe(Date.UTC(2029, 11, 31, 21, 0));
    // UTC (offset 0): midnight local == midnight UTC.
    expect(resolveUnlockInstant("2030-01-01", 0)).toBe(Date.UTC(2030, 0, 1));
  });

  it("rejects an unparseable date", () => {
    expect(resolveUnlockInstant("nope", 0)).toBeNull();
  });

  it("isFutureInstant rejects past/now (AC-3)", () => {
    const now = Date.UTC(2026, 0, 1);
    expect(isFutureInstant(now + 1, now)).toBe(true);
    expect(isFutureInstant(now, now)).toBe(false);
    expect(isFutureInstant(now - 1, now)).toBe(false);
  });
});

describe("US-4.2 unlock window: zero pre-D tolerance, D..D+60min (AC-6/NFR)", () => {
  const D = Date.UTC(2030, 5, 1, 0, 0);
  const HOUR = 60 * 60 * 1000;

  it("locked one ms before D, unlocked exactly at D (never a moment before)", () => {
    expect(evaluateUnlock(D, D - 1)).toBe("locked");
    expect(evaluateUnlock(D, D)).toBe("unlocked");
  });

  it("unlocked through D+60min", () => {
    expect(evaluateUnlock(D, D + HOUR)).toBe("unlocked");
  });

  it("unlock_failed if still due past D+60min", () => {
    expect(evaluateUnlock(D, D + HOUR + 1)).toBe("unlock_failed");
  });

  it("a later timezone change cannot move the sealed instant earlier (absolute compare)", () => {
    // The sealed instant is absolute epoch-ms; evaluating it is offset-agnostic.
    const sealed = resolveUnlockInstant("2030-06-01", 180)!;
    // Just before the sealed instant → still locked, regardless of any "now" tz.
    expect(evaluateUnlock(sealed, sealed - 1)).toBe("locked");
  });
});
