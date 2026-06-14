import { describe, it, expect } from "vitest";
import { presignGet } from "@/lib/storage/presign";
import { env } from "@/lib/env";

// US-3.3 NFR: active signed media GET URLs expire within <= 10 minutes, and the
// storage key is never a durable public URL — it's signed per request.
describe("presigned media GET (US-3.3)", () => {
  it("env caps the GET TTL at <= 600 seconds (10 min)", () => {
    expect(env.MEDIA_GET_TTL_SECONDS).toBeLessThanOrEqual(600);
  });

  it("produces a signed URL whose X-Amz-Expires is <= 600s and is bound to the key", async () => {
    const url = await presignGet("sha256/deadbeef");
    const u = new URL(url);
    const expires = Number(u.searchParams.get("X-Amz-Expires"));
    expect(expires).toBeLessThanOrEqual(600);
    expect(expires).toBeGreaterThan(0);
    // signed, not a bare public URL
    expect(u.searchParams.get("X-Amz-Signature")).toBeTruthy();
    expect(u.pathname).toContain("deadbeef");
  });
});
