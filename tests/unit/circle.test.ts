import { describe, it, expect } from "vitest";
import type { PrivacyCircle } from "@prisma/client";
import {
  decideAccess,
  canViewEvent,
  circleTelemetry,
  CIRCLES,
  DEFAULT_CIRCLE,
  type ViewableEvent,
} from "@/lib/authz/circle";

const OWNER = "acc_owner";
const OTHER = "acc_other";

function ev(circle: PrivacyCircle, deleted = false): ViewableEvent {
  return { accountId: OWNER, circle, deletedAt: deleted ? new Date() : null };
}

describe("decideAccess truth table (US-3.1 AC-6/AC-7)", () => {
  it("owner sees their own event in every circle", () => {
    for (const c of CIRCLES) {
      expect(decideAccess(OWNER, ev(c), false)).toBe(true);
    }
  });

  it("ME_ONLY is denied to any non-owner and to anonymous", () => {
    expect(decideAccess(OTHER, ev("ME_ONLY"), false)).toBe(false);
    expect(decideAccess(null, ev("ME_ONLY"), false)).toBe(false);
  });

  it("PUBLIC_UNLISTED direct read is denied to non-owners (link path is separate)", () => {
    expect(decideAccess(OTHER, ev("PUBLIC_UNLISTED"), false)).toBe(false);
    expect(decideAccess(null, ev("PUBLIC_UNLISTED"), false)).toBe(false);
  });

  it("PUBLIC is granted to any authenticated viewer but denied to anonymous (login-required, not discoverable)", () => {
    // any signed-in account, no connection / family membership required
    expect(decideAccess(OTHER, ev("PUBLIC"), false)).toBe(true);
    // logged-out viewer is denied — PUBLIC is shared, not anonymously discoverable
    expect(decideAccess(null, ev("PUBLIC"), false)).toBe(false);
    // soft-deleted PUBLIC is still invisible to everyone (G2)
    expect(decideAccess(OTHER, ev("PUBLIC", true), false)).toBe(false);
  });

  it("FAMILY grants a member and denies a non-member", () => {
    expect(decideAccess(OTHER, ev("FAMILY"), true)).toBe(true);
    expect(decideAccess(OTHER, ev("FAMILY"), false)).toBe(false);
  });

  it("a soft-deleted event is invisible to everyone, including the owner (G2)", () => {
    expect(decideAccess(OWNER, ev("ME_ONLY", true), false)).toBe(false);
    expect(decideAccess(OWNER, ev("FAMILY", true), true)).toBe(false);
  });
});

describe("canViewEvent (resolves Family roster, currently empty per US-3.5)", () => {
  it("owner allowed; non-owner denied for ME_ONLY and FAMILY (no roster yet)", async () => {
    expect(await canViewEvent(OWNER, ev("ME_ONLY"))).toBe(true);
    expect(await canViewEvent(OTHER, ev("ME_ONLY"))).toBe(false);
    // FAMILY: no member exists yet, so non-owner denied
    expect(await canViewEvent(OTHER, ev("FAMILY"))).toBe(false);
  });

  it("anonymous viewer denied everything they don't own — including PUBLIC", async () => {
    expect(await canViewEvent(null, ev("ME_ONLY"))).toBe(false);
    expect(await canViewEvent(null, ev("FAMILY"))).toBe(false);
    expect(await canViewEvent(null, ev("PUBLIC_UNLISTED"))).toBe(false);
    // PUBLIC requires authentication: logged-out is denied even for PUBLIC
    expect(await canViewEvent(null, ev("PUBLIC"))).toBe(false);
  });

  it("an authenticated non-owner can view another account's PUBLIC event with no roster lookup", async () => {
    expect(await canViewEvent(OTHER, ev("PUBLIC"))).toBe(true);
  });
});

describe("circle constants", () => {
  it("offers four circles, Me-Only first and PUBLIC last (AC-1)", () => {
    expect(CIRCLES).toEqual(["ME_ONLY", "FAMILY", "PUBLIC_UNLISTED", "PUBLIC"]);
    expect(DEFAULT_CIRCLE).toBe("ME_ONLY"); // G1
  });

  it("maps circles to content-blind telemetry tokens", () => {
    expect(circleTelemetry("ME_ONLY")).toBe("me_only");
    expect(circleTelemetry("PUBLIC_UNLISTED")).toBe("public_unlisted");
    expect(circleTelemetry("PUBLIC")).toBe("public");
  });
});
