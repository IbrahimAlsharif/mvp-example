import { prisma } from "@/lib/db";

/**
 * Open-format account export (J4 step 5 — the MVP-blocking "permanent, portable,
 * yours" promise). Produces a complete, self-describing JSON of everything the
 * owner created: profile, every own event with full metadata (note, date,
 * location, circle, legacy-consent, version, timestamps) and each event's media
 * as PORTABLE references (publicId + type + mimeType + checksum + byteSize).
 *
 * Privacy/security: this is the OWNER exporting THEIR OWN data, so every circle
 * (incl. ME_ONLY) is included — that is the point of portability. The internal
 * `storageKey` (content-addressed bucket path) is NEVER exported (US-3.3 AC-1);
 * media bytes are fetched separately via the authorized /api/media/<publicId>
 * route using the exported publicId, so the export stays a bounded, safe
 * metadata document while remaining a complete, re-importable record.
 */
export type ExportedMedia = {
  publicId: string;
  type: string;
  mimeType: string;
  checksumSha256: string;
  byteSize: number | null;
  /** True when the format has archival-longevity risk (HEIC, proprietary). AC-13. */
  formatLongevityRisk: boolean;
};

/**
 * Mime types with archival-longevity risk (US-1.4 AC-13): proprietary or
 * patent-encumbered formats whose long-term decodability is less certain than
 * the open baseline (JPEG/PNG/MP4/WAV). Flagged in the manifest so the owner
 * knows which items may want conversion — never blocks the export.
 */
const LONGEVITY_RISK_TYPES = new Set<string>([
  "image/heic",
  "image/heif",
  "image/x-adobe-dng",
  "video/quicktime",
  "audio/x-m4a",
]);

export function hasFormatLongevityRisk(mimeType: string): boolean {
  return LONGEVITY_RISK_TYPES.has(mimeType.toLowerCase());
}

/**
 * Export integrity manifest (US-1.4 AC-4): a self-verifiable summary — the item
 * counts and the full set of per-item checksums — so a downstream importer can
 * confirm the archive is complete and untampered without trusting the body.
 */
export type ExportManifest = {
  eventCount: number;
  mediaCount: number;
  /** Every media checksum, sorted, so two exports of the same data match. */
  mediaChecksums: string[];
  /** Count of media items flagged as longevity-risk formats. */
  longevityRiskCount: number;
};

export type ExportedEvent = {
  id: string;
  note: string | null;
  occurredOn: string;
  location: { lat: number; lng: number } | null;
  /** Structured free-text place (J2.4); exported on its own field, not folded into the note. */
  placeName: string | null;
  circle: string;
  legacyConsent: boolean;
  /** Tri-state consent + its decision timestamp, exported intact (US-4.1 AC-7). */
  legacyConsentValue: string;
  legacyConsentAt: string | null;
  version: number;
  createdAt: string;
  media: ExportedMedia[];
};

/** A sealed/pending future capsule, exported in open format (US-4.2 AC-12, G5). */
export type ExportedCapsule = {
  id: string;
  type: string;
  note: string | null;
  recipientCircle: string;
  unlockLocalDay: string;
  unlockOffsetMin: number;
  status: string;
};

export type AccountExport = {
  format: "human-timeline-network/export";
  // v2 (J2.4): events carry a structured `placeName` field instead of folding the
  // place into the note text. v1 archives remain readable — `placeName` is simply
  // absent/null there.
  formatVersion: 2;
  exportedAt: string;
  account: { id: string; email: string; defaultCircle: string; createdAt: string };
  eventCount: number;
  manifest: ExportManifest;
  events: ExportedEvent[];
  capsules: ExportedCapsule[];
};

/**
 * Recompute the manifest from an export body and confirm it matches the embedded
 * manifest (US-1.4 AC-4 integrity verification). Returns the discrepancies, or an
 * empty list when the archive is complete and consistent. A read-only check — it
 * never mutates the source (AC-12).
 */
export function verifyExportIntegrity(exp: AccountExport): string[] {
  const problems: string[] = [];
  const recomputed = buildManifest(exp.events);
  if (recomputed.eventCount !== exp.manifest.eventCount) problems.push("event_count_mismatch");
  if (recomputed.mediaCount !== exp.manifest.mediaCount) problems.push("media_count_mismatch");
  if (recomputed.mediaChecksums.join(",") !== exp.manifest.mediaChecksums.join(",")) {
    problems.push("checksum_set_mismatch");
  }
  if (exp.eventCount !== exp.events.length) problems.push("declared_event_count_mismatch");
  return problems;
}

function buildManifest(events: ExportedEvent[]): ExportManifest {
  const checksums: string[] = [];
  let risk = 0;
  for (const e of events) {
    for (const m of e.media) {
      checksums.push(m.checksumSha256);
      if (m.formatLongevityRisk) risk++;
    }
  }
  checksums.sort();
  return {
    eventCount: events.length,
    mediaCount: checksums.length,
    mediaChecksums: checksums,
    longevityRiskCount: risk,
  };
}

export async function buildAccountExport(accountId: string): Promise<AccountExport> {
  // Read account + events in ONE transaction so the export is a consistent
  // point-in-time snapshot (US-1.4 AC-11): a concurrent create/edit during a
  // long export can't produce a torn read. Read-only — no writes, so the export
  // never mutates, deletes, or locks the source (AC-12, G2).
  const [account, events, capsules] = await prisma.$transaction([
    prisma.account.findUnique({ where: { id: accountId } }),
    prisma.event.findMany({
      where: { accountId, deletedAt: null },
      orderBy: { occurredOn: "asc" },
      include: { media: { where: { deletedAt: null } } },
    }),
    // Sealed/pending capsules survive outside the platform too (AC-12, G5).
    prisma.capsule.findMany({
      where: { ownerAccountId: accountId, status: { not: "CANCELLED" } },
      orderBy: { unlockAtMs: "asc" },
    }),
  ]);
  if (!account) throw new Error("account_not_found");

  const exportedEvents: ExportedEvent[] = events.map((e) => ({
    id: e.id,
    note: e.note,
    occurredOn: e.occurredOn.toISOString(),
    location:
      e.locationLat != null && e.locationLng != null
        ? { lat: e.locationLat, lng: e.locationLng }
        : null,
    placeName: e.placeName,
    circle: e.circle,
    legacyConsent: e.legacyConsent,
    legacyConsentValue: e.legacyConsentValue,
    legacyConsentAt: e.legacyConsentAt ? e.legacyConsentAt.toISOString() : null,
    version: e.version,
    createdAt: e.createdAt.toISOString(),
    media: e.media.map((m) => ({
      publicId: m.publicId,
      type: m.type,
      mimeType: m.mimeType,
      checksumSha256: m.checksumSha256,
      byteSize: m.byteSize,
      formatLongevityRisk: hasFormatLongevityRisk(m.mimeType),
    })),
  }));

  return {
    format: "human-timeline-network/export",
    formatVersion: 2,
    exportedAt: new Date().toISOString(),
    account: {
      id: account.id,
      email: account.email,
      defaultCircle: account.defaultCircle,
      createdAt: account.createdAt.toISOString(),
    },
    eventCount: exportedEvents.length,
    manifest: buildManifest(exportedEvents),
    events: exportedEvents,
    capsules: capsules.map((c) => ({
      id: c.id,
      type: c.type,
      note: c.note,
      recipientCircle: c.recipientCircle,
      unlockLocalDay: c.unlockLocalDay,
      unlockOffsetMin: c.unlockOffsetMin,
      status: c.status,
    })),
  };
}
