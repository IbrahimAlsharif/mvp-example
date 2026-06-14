import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/ids";
import { resolveMediaAccess } from "@/lib/media/access";
import { createShareLink, revokeShareLink } from "@/lib/media/share";

// US-3.3 media-URL security at the authz layer (no S3 needed — presign is a
// separate last-mile step). Verifies the byte-access decision and share links.
let dbUp = false;
const accountIds: string[] = [];

async function account(tag: string) {
  const a = await prisma.account.create({
    data: { email: `${tag}.${randomToken(6)}@example.com`, status: "ACTIVE", defaultCircle: "ME_ONLY" },
  });
  accountIds.push(a.id);
  return a;
}

async function eventWithMedia(
  accountId: string,
  circle: "ME_ONLY" | "FAMILY" | "PUBLIC_UNLISTED",
  status: "PENDING" | "PERSISTED" | "FAILED" = "PERSISTED",
) {
  const checksum = randomToken(16);
  const event = await prisma.event.create({
    data: {
      accountId,
      circle,
      occurredOn: new Date(),
      submitKey: randomToken(10),
      media: {
        create: {
          publicId: randomToken(16),
          accountId,
          type: "PHOTO",
          mimeType: "image/jpeg",
          storageKey: `sha256/${checksum}`,
          checksumSha256: checksum,
          status,
        },
      },
    },
    include: { media: true },
  });
  return { event, media: event.media[0] };
}

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbUp = true;
  } catch {
    dbUp = false;
  }
});

afterAll(async () => {
  if (dbUp) await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
  await prisma.$disconnect();
});

describe("US-3.3 media access (server-side authz on the bytes)", () => {
  it("owner is granted; a second account and anon are denied for Me-Only (AC-2/AC-8/AC-9)", async () => {
    if (!dbUp) return;
    const owner = await account("mo");
    const other = await account("mx");
    const { media } = await eventWithMedia(owner.id, "ME_ONLY");

    const asOwner = await resolveMediaAccess({ publicId: media.publicId, viewerAccountId: owner.id });
    expect(asOwner.ok).toBe(true);
    if (asOwner.ok) {
      expect(asOwner.via).toBe("owner");
      expect(asOwner.storageKey).toBe(media.storageKey);
    }
    expect((await resolveMediaAccess({ publicId: media.publicId, viewerAccountId: other.id })).ok).toBe(false);
    expect((await resolveMediaAccess({ publicId: media.publicId, viewerAccountId: null })).ok).toBe(false);
  });

  it("non-persisted media is never served (US-1.2 contract)", async () => {
    if (!dbUp) return;
    const owner = await account("pend");
    const { media } = await eventWithMedia(owner.id, "ME_ONLY", "PENDING");
    const res = await resolveMediaAccess({ publicId: media.publicId, viewerAccountId: owner.id });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("not_persisted");
  });

  it("an unknown publicId is not-found (no enumeration/oracle, AC-1)", async () => {
    if (!dbUp) return;
    const res = await resolveMediaAccess({ publicId: "totally-bogus-id", viewerAccountId: null });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("not_found");
  });

  it("a valid unlisted share token grants access to a PUBLIC_UNLISTED event (AC-2/AC-5)", async () => {
    if (!dbUp) return;
    const owner = await account("sh");
    const { event, media } = await eventWithMedia(owner.id, "PUBLIC_UNLISTED");
    const link = await createShareLink(event.id);
    expect(link.token.length).toBeGreaterThanOrEqual(22); // ≥128-bit base64url

    const res = await resolveMediaAccess({
      publicId: media.publicId,
      viewerAccountId: null,
      shareToken: link.token,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.via).toBe("share_link");
  });

  it("a revoked share token is denied within one request (AC-6)", async () => {
    if (!dbUp) return;
    const owner = await account("rev");
    const { event, media } = await eventWithMedia(owner.id, "PUBLIC_UNLISTED");
    const link = await createShareLink(event.id);
    await revokeShareLink(link.token);
    const res = await resolveMediaAccess({
      publicId: media.publicId,
      viewerAccountId: null,
      shareToken: link.token,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("revoked");
  });

  it("an expired share token is denied server-side (AC-7)", async () => {
    if (!dbUp) return;
    const owner = await account("exp");
    const { event, media } = await eventWithMedia(owner.id, "PUBLIC_UNLISTED");
    const link = await createShareLink(event.id);
    await prisma.shareLink.update({ where: { id: link.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await resolveMediaAccess({
      publicId: media.publicId,
      viewerAccountId: null,
      shareToken: link.token,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("expired");
  });

  it("a downgrade away from PUBLIC_UNLISTED makes the share token stop granting (AC-3/AC-6)", async () => {
    if (!dbUp) return;
    const owner = await account("dg");
    const { event, media } = await eventWithMedia(owner.id, "PUBLIC_UNLISTED");
    const link = await createShareLink(event.id);
    // owner downgrades to Me-Only (US-3.2 trigger); media layer must honor it live
    await prisma.event.update({ where: { id: event.id }, data: { circle: "ME_ONLY" } });
    const res = await resolveMediaAccess({
      publicId: media.publicId,
      viewerAccountId: null,
      shareToken: link.token,
    });
    expect(res.ok).toBe(false);
  });

  it("a share token for one event cannot unlock another event's media (AC-8)", async () => {
    if (!dbUp) return;
    const owner = await account("cross");
    const a = await eventWithMedia(owner.id, "PUBLIC_UNLISTED");
    const b = await eventWithMedia(owner.id, "PUBLIC_UNLISTED");
    const linkA = await createShareLink(a.event.id);
    const res = await resolveMediaAccess({
      publicId: b.media.publicId, // B's media
      viewerAccountId: null,
      shareToken: linkA.token, // A's link
    });
    expect(res.ok).toBe(false);
  });
});
