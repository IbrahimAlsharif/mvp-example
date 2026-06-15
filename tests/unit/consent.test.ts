import { describe, it, expect } from "vitest";
import { resolveConsent, grantsHeirAccess, CIRCLE_CONSENT_DEFAULT } from "@/lib/events/consent";

const NOW = new Date("2026-06-15T10:00:00.000Z");

describe("US-4.1 legacy-consent tri-state (AC-2/AC-3/AC-5)", () => {
  it("UNSET is the default and carries no timestamp (silence = no access)", () => {
    const r = resolveConsent({ circle: "ME_ONLY", now: NOW });
    expect(r.value).toBe("UNSET");
    expect(r.at).toBeNull();
    expect(r.boolean).toBe(false);
  });

  it("an explicit GRANTED/DENIED is stamped with an ISO-8601 timestamp", () => {
    const granted = resolveConsent({ circle: "FAMILY", value: "GRANTED", now: NOW });
    expect(granted.value).toBe("GRANTED");
    expect(granted.at).toEqual(NOW);
    expect(granted.boolean).toBe(true);

    const denied = resolveConsent({ circle: "FAMILY", value: "DENIED", now: NOW });
    expect(denied.value).toBe("DENIED");
    expect(denied.at).toEqual(NOW);
    expect(denied.boolean).toBe(false); // DENIED is not the legacy "true"
  });

  it("the legacy boolean maps: true → GRANTED, false → per-circle default", () => {
    expect(resolveConsent({ circle: "ME_ONLY", legacyBoolean: true, now: NOW }).value).toBe("GRANTED");
    expect(resolveConsent({ circle: "ME_ONLY", legacyBoolean: false, now: NOW }).value).toBe(
      CIRCLE_CONSENT_DEFAULT.ME_ONLY,
    );
  });

  it("the per-circle default seeds an unspecified value (conservative UNSET)", () => {
    for (const c of ["ME_ONLY", "FAMILY", "PUBLIC_UNLISTED"] as const) {
      expect(resolveConsent({ circle: c, now: NOW }).value).toBe("UNSET");
    }
  });
});

describe("US-4.1 consent is never an access backdoor at MVP (AC-8/G9)", () => {
  it("grantsHeirAccess is always false regardless of the stored value", () => {
    expect(grantsHeirAccess("GRANTED")).toBe(false);
    expect(grantsHeirAccess("DENIED")).toBe(false);
    expect(grantsHeirAccess("UNSET")).toBe(false);
  });
});
