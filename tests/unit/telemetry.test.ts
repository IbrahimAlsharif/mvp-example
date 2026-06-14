import { describe, it, expect } from "vitest";
import { emit, ContentBlindViolation } from "@/lib/telemetry";

describe("telemetry content-blind guard (G4)", () => {
  it("accepts structural metadata: enums, bools, ints", () => {
    expect(() =>
      emit("event_create_saved", {
        has_media: true,
        media_type: "photo",
        circle: "me_only",
        item_count: 3,
        is_first_event: false,
      }),
    ).not.toThrow();
  });

  it("rejects free-text content masquerading as a field (e.g. note text, filename)", () => {
    expect(() =>
      emit("event_create_saved", { note: "my daughter's first steps" }),
    ).toThrow(ContentBlindViolation);
    expect(() =>
      emit("media_upload_started", { filename: "IMG_2024.jpg" }),
    ).toThrow(ContentBlindViolation);
  });

  it("rejects an out-of-allowlist value even on a known enum field", () => {
    expect(() =>
      emit("privacy_circle_selected", { circle: "secret-album-name" }),
    ).toThrow(ContentBlindViolation);
  });

  it("allows null and accepts an empty payload", () => {
    expect(() => emit("timeline_view_opened", { is_first_revisit: null })).not.toThrow();
    expect(() => emit("signup_started")).not.toThrow();
  });
});
