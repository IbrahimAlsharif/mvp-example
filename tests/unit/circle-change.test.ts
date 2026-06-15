import { describe, it, expect } from "vitest";
import { isDowngrade } from "@/lib/events/circle-change";

describe("US-3.2 circle change direction (downgrade detection)", () => {
  it("narrowing the audience is a downgrade", () => {
    expect(isDowngrade("FAMILY", "ME_ONLY")).toBe(true);
    expect(isDowngrade("PUBLIC_UNLISTED", "FAMILY")).toBe(true);
    expect(isDowngrade("PUBLIC_UNLISTED", "ME_ONLY")).toBe(true);
  });

  it("widening the audience is not a downgrade (upgrade)", () => {
    expect(isDowngrade("ME_ONLY", "FAMILY")).toBe(false);
    expect(isDowngrade("FAMILY", "PUBLIC_UNLISTED")).toBe(false);
    expect(isDowngrade("ME_ONLY", "PUBLIC_UNLISTED")).toBe(false);
  });

  it("same circle is not a downgrade", () => {
    expect(isDowngrade("FAMILY", "FAMILY")).toBe(false);
  });
});
