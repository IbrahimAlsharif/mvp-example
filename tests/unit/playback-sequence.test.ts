import { describe, it, expect } from "vitest";
import { assembleSequence, spanWindow } from "@/lib/playback/sequence";

const ev = (id: string, iso: string, media: string[] = [], note: string | null = null) => ({
  id, occurredOn: new Date(iso), note, media: media.map((publicId) => ({ publicId })),
});
const NOW = Date.UTC(2026, 0, 1);

describe("US-2.3 playback span windows", () => {
  it("year spans ~1y, decade ~10y, life from epoch", () => {
    expect(spanWindow("year", NOW).startMs).toBe(NOW - 365 * 86_400_000);
    expect(spanWindow("decade", NOW).startMs).toBe(NOW - 10 * 365 * 86_400_000);
    expect(spanWindow("life", NOW).startMs).toBe(0);
  });
});

describe("US-2.3 sequence assembly (AC-2/AC-7)", () => {
  it("orders frames chronologically within the window", () => {
    const events = [
      ev("c", "2025-12-01T00:00:00Z", ["m3"]),
      ev("a", "2025-03-01T00:00:00Z", ["m1"]),
      ev("b", "2025-07-01T00:00:00Z", ["m2"]),
    ];
    const seq = assembleSequence(events, spanWindow("year", NOW));
    expect(seq.map((f) => f.eventId)).toEqual(["a", "b", "c"]);
  });

  it("excludes events outside the span window", () => {
    const events = [
      ev("old", "2010-01-01T00:00:00Z", ["m1"]), // before a 1-year window
      ev("recent", "2025-09-01T00:00:00Z", ["m2"]),
    ];
    const seq = assembleSequence(events, spanWindow("year", NOW));
    expect(seq.map((f) => f.eventId)).toEqual(["recent"]);
  });

  it("keeps a media-less event as a note-only frame (graceful, no stall, no filler)", () => {
    const events = [ev("noteonly", "2025-06-01T00:00:00Z", [], "a memory in words")];
    const seq = assembleSequence(events, spanWindow("year", NOW));
    expect(seq).toHaveLength(1);
    expect(seq[0].media).toEqual([]);
    expect(seq[0].note).toBe("a memory in words");
  });

  it("never duplicates an event", () => {
    const events = [ev("a", "2025-05-01T00:00:00Z", ["m1", "m2"])];
    const seq = assembleSequence(events, spanWindow("year", NOW));
    expect(seq).toHaveLength(1);
    expect(seq[0].media).toHaveLength(2);
  });
});
