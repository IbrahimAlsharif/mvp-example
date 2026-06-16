import { describe, it, expect } from "vitest";
import {
  pickRecordingMime,
  extensionForMime,
  captureFilename,
  formatDuration,
} from "@/lib/capture/record";

describe("FEAT-RTD recording MIME selection", () => {
  it("picks the first supported candidate, widest-support first", () => {
    // Only webm supported → opus webm chosen for audio.
    const onlyWebm = (m: string) => m.includes("webm");
    expect(pickRecordingMime("audio", onlyWebm)).toBe("audio/webm;codecs=opus");
    expect(pickRecordingMime("video", onlyWebm)).toBe("video/webm;codecs=vp9,opus");
  });

  it("falls through to mp4 when webm is unsupported (Safari-like)", () => {
    const onlyMp4 = (m: string) => m.includes("mp4");
    expect(pickRecordingMime("audio", onlyMp4)).toBe("audio/mp4");
    expect(pickRecordingMime("video", onlyMp4)).toBe("video/mp4");
  });

  it("returns empty string when nothing is supported (browser default)", () => {
    expect(pickRecordingMime("audio", () => false)).toBe("");
    expect(pickRecordingMime("video", () => false)).toBe("");
  });
});

describe("FEAT-RTD MIME → extension", () => {
  it("maps containers to extensions, ignoring codecs params", () => {
    expect(extensionForMime("audio/webm;codecs=opus")).toBe("webm");
    expect(extensionForMime("video/mp4")).toBe("mp4");
    expect(extensionForMime("audio/ogg")).toBe("ogg");
    expect(extensionForMime("image/jpeg")).toBe("jpg");
  });

  it("falls back to the subtype for unknown containers", () => {
    expect(extensionForMime("audio/aac")).toBe("aac");
  });
});

describe("FEAT-RTD capture filename", () => {
  it("stamps the moment in UTC with second precision", () => {
    const at = new Date(Date.UTC(2026, 4, 7, 9, 5, 3)); // 2026-05-07 09:05:03Z
    expect(captureFilename("video", "webm", at)).toBe("video-20260507-090503.webm");
    expect(captureFilename("photo", "jpg", at)).toBe("photo-20260507-090503.jpg");
  });
});

describe("FEAT-RTD duration format", () => {
  it("formats elapsed ms as mm:ss and clamps negatives", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(5_000)).toBe("00:05");
    expect(formatDuration(65_000)).toBe("01:05");
    expect(formatDuration(600_000)).toBe("10:00");
    expect(formatDuration(-1_000)).toBe("00:00");
  });
});
