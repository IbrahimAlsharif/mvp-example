import { describe, it, expect } from "vitest";
import {
  hasFormatLongevityRisk,
  verifyExportIntegrity,
  type AccountExport,
  type ExportedEvent,
} from "@/lib/events/export";

function media(checksum: string, mimeType = "image/jpeg") {
  return {
    publicId: `pub_${checksum}`,
    type: "PHOTO",
    mimeType,
    checksumSha256: checksum,
    byteSize: 100,
    formatLongevityRisk: hasFormatLongevityRisk(mimeType),
  };
}
function event(id: string, media_: ReturnType<typeof media>[]): ExportedEvent {
  return {
    id, note: null, occurredOn: "2026-01-01T12:00:00.000Z", location: null,
    circle: "ME_ONLY", legacyConsent: false, legacyConsentValue: "UNSET", legacyConsentAt: null,
    version: 1, createdAt: "2026-01-01T12:00:00.000Z",
    media: media_,
  };
}
function exp(events: ExportedEvent[]): AccountExport {
  const checksums = events.flatMap((e) => e.media.map((m) => m.checksumSha256)).sort();
  return {
    format: "human-timeline-network/export", formatVersion: 1, exportedAt: "2026-06-15T00:00:00.000Z",
    account: { id: "a", email: "a@b.c", defaultCircle: "ME_ONLY", createdAt: "2026-01-01T00:00:00.000Z" },
    eventCount: events.length,
    manifest: {
      eventCount: events.length,
      mediaCount: checksums.length,
      mediaChecksums: checksums,
      longevityRiskCount: events.flatMap((e) => e.media).filter((m) => m.formatLongevityRisk).length,
    },
    events,
  };
}

describe("US-1.4 export integrity manifest (AC-4)", () => {
  it("a well-formed export verifies with no problems", () => {
    const e = exp([event("e1", [media("aaa"), media("bbb")]), event("e2", [media("ccc")])]);
    expect(verifyExportIntegrity(e)).toEqual([]);
  });

  it("detects a media count / checksum-set mismatch (tamper or drop)", () => {
    const e = exp([event("e1", [media("aaa"), media("bbb")])]);
    // Tamper: drop a media item from the body but leave the manifest as-is.
    e.events[0].media.pop();
    const problems = verifyExportIntegrity(e);
    expect(problems).toContain("media_count_mismatch");
    expect(problems).toContain("checksum_set_mismatch");
  });

  it("detects a declared-event-count mismatch", () => {
    const e = exp([event("e1", [media("aaa")])]);
    e.eventCount = 5; // lie about the count
    expect(verifyExportIntegrity(e)).toContain("declared_event_count_mismatch");
  });
});

describe("US-1.4 format-longevity flags (AC-13)", () => {
  it("flags proprietary/encumbered formats, not the open baseline", () => {
    expect(hasFormatLongevityRisk("image/heic")).toBe(true);
    expect(hasFormatLongevityRisk("video/quicktime")).toBe(true);
    expect(hasFormatLongevityRisk("image/jpeg")).toBe(false);
    expect(hasFormatLongevityRisk("video/mp4")).toBe(false);
  });

  it("counts longevity-risk media in the manifest", () => {
    const e = exp([event("e1", [media("aaa", "image/heic"), media("bbb", "image/jpeg")])]);
    expect(e.manifest.longevityRiskCount).toBe(1);
    expect(verifyExportIntegrity(e)).toEqual([]);
  });
});
