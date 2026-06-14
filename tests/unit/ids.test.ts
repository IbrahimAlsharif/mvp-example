import { describe, it, expect } from "vitest";
import {
  randomToken,
  tokenEntropyBits,
  sha256Hex,
  storageKeyForChecksum,
  safeEqual,
} from "@/lib/ids";

describe("ids", () => {
  it("randomToken carries >=128 bits of entropy", () => {
    expect(tokenEntropyBits(16)).toBeGreaterThanOrEqual(128);
    // base64url of 16 bytes is 22 chars, URL-safe (no +,/,=)
    const t = randomToken(16);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.length).toBeGreaterThanOrEqual(22);
  });

  it("randomToken values are unique across calls", () => {
    const set = new Set(Array.from({ length: 1000 }, () => randomToken()));
    expect(set.size).toBe(1000);
  });

  it("content-addressed storage key uses the checksum", () => {
    const checksum = sha256Hex("hello");
    expect(storageKeyForChecksum(checksum)).toBe(`sha256/${checksum}`);
  });

  it("safeEqual compares in a length-aware way", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
