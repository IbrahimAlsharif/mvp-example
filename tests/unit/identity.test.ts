import { describe, it, expect } from "vitest";
import { displayNameFor, avatarUrlFor, AVATAR_COUNT } from "@/lib/profile/identity";

describe("displayNameFor", () => {
  it("prefers an explicit displayName", () => {
    expect(displayNameFor({ displayName: "Sara Q", email: "x@y.com" })).toBe("Sara Q");
  });

  it("prettifies the email local-part when no displayName", () => {
    expect(displayNameFor({ displayName: null, email: "journey.test.0615@x.com" })).toBe(
      "Journey Test 0615",
    );
    expect(displayNameFor({ email: "ahmad_ali@x.com" })).toBe("Ahmad Ali");
  });

  it("never returns the raw email and trims blank displayName", () => {
    const out = displayNameFor({ displayName: "   ", email: "noor-said@x.com" });
    expect(out).toBe("Noor Said");
    expect(out).not.toContain("@");
  });
});

describe("avatarUrlFor", () => {
  it("returns a bundled avatar path within range", () => {
    const url = avatarUrlFor({ id: "acc_1", email: "a@b.com" });
    expect(url).toMatch(/^\/avatars\/avatar-[1-9]\d*\.svg$/);
    const n = Number(url.match(/avatar-(\d+)\.svg$/)![1]);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(AVATAR_COUNT);
  });

  it("is deterministic for the same account", () => {
    const a = avatarUrlFor({ id: "acc_42", email: "a@b.com" });
    const b = avatarUrlFor({ id: "acc_42", email: "a@b.com" });
    expect(a).toBe(b);
  });

  it("falls back to email as the seed when id is absent", () => {
    expect(avatarUrlFor({ email: "seed@b.com" })).toBe(avatarUrlFor({ id: null, email: "seed@b.com" }));
  });
});
