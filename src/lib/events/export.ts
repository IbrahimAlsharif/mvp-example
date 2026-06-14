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
};

export type ExportedEvent = {
  id: string;
  note: string | null;
  occurredOn: string;
  location: { lat: number; lng: number } | null;
  circle: string;
  legacyConsent: boolean;
  version: number;
  createdAt: string;
  media: ExportedMedia[];
};

export type AccountExport = {
  format: "human-timeline-network/export";
  formatVersion: 1;
  exportedAt: string;
  account: { id: string; email: string; defaultCircle: string; createdAt: string };
  eventCount: number;
  events: ExportedEvent[];
};

export async function buildAccountExport(accountId: string): Promise<AccountExport> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new Error("account_not_found");

  const events = await prisma.event.findMany({
    where: { accountId, deletedAt: null },
    orderBy: { occurredOn: "asc" },
    include: { media: { where: { deletedAt: null } } },
  });

  return {
    format: "human-timeline-network/export",
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    account: {
      id: account.id,
      email: account.email,
      defaultCircle: account.defaultCircle,
      createdAt: account.createdAt.toISOString(),
    },
    eventCount: events.length,
    events: events.map((e) => ({
      id: e.id,
      note: e.note,
      occurredOn: e.occurredOn.toISOString(),
      location:
        e.locationLat != null && e.locationLng != null
          ? { lat: e.locationLat, lng: e.locationLng }
          : null,
      circle: e.circle,
      legacyConsent: e.legacyConsent,
      version: e.version,
      createdAt: e.createdAt.toISOString(),
      media: e.media.map((m) => ({
        publicId: m.publicId,
        type: m.type,
        mimeType: m.mimeType,
        checksumSha256: m.checksumSha256,
        byteSize: m.byteSize,
      })),
    })),
  };
}
