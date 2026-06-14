// Seed a runtime fixture for the US-3.3 keystone check: an owner account with a
// Me-Only event + a PERSISTED media object whose bytes really live in MinIO,
// plus a second account. Prints JSON the bash harness uses to drive the route.
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/db";
import { s3, BUCKET } from "../src/lib/storage/s3";
import { randomToken, sha256Hex } from "../src/lib/ids";

async function makeSession(accountId: string): Promise<string> {
  const raw = randomToken(32);
  await prisma.session.create({
    data: {
      accountId,
      tokenHash: sha256Hex(raw),
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  return raw;
}

async function main() {
  const content = "SECRET-FAMILY-PHOTO-BYTES-" + randomToken(6);
  const checksum = sha256Hex(content);
  const storageKey = `sha256/${checksum}`;

  const owner = await prisma.account.create({
    data: { email: `fx.owner.${randomToken(5)}@example.com`, status: "ACTIVE", defaultCircle: "ME_ONLY" },
  });
  const other = await prisma.account.create({
    data: { email: `fx.other.${randomToken(5)}@example.com`, status: "ACTIVE", defaultCircle: "ME_ONLY" },
  });

  const event = await prisma.event.create({
    data: { accountId: owner.id, circle: "ME_ONLY", occurredOn: new Date(), submitKey: randomToken(10) },
  });
  const media = await prisma.media.create({
    data: {
      publicId: randomToken(16),
      eventId: event.id,
      accountId: owner.id,
      type: "PHOTO",
      mimeType: "image/jpeg",
      storageKey,
      checksumSha256: checksum,
      status: "PERSISTED",
    },
  });

  // Put the real bytes in MinIO at the storage key.
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: storageKey, Body: content }));

  const ownerToken = await makeSession(owner.id);
  const otherToken = await makeSession(other.id);

  console.log(
    JSON.stringify({
      publicId: media.publicId,
      storageKey,
      content,
      ownerToken,
      otherToken,
      ownerEmail: owner.email,
      otherEmail: other.email,
    }),
  );
}

main().finally(() => prisma.$disconnect());
