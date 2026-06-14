import {
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/storage/s3";
import { env } from "@/lib/env";

/**
 * Mint a short-lived presigned GET URL for a stored object.
 *
 * Expiry is clamped to env.MEDIA_GET_TTL_SECONDS (<=600s / 10 min, US-3.3 AC-7).
 * This is only ever called AFTER an app-layer authz check passes
 * (see /api/media): the URL is the last mile, not the access decision.
 */
export async function presignGet(storageKey: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: storageKey });
  return getSignedUrl(s3, command, { expiresIn: env.MEDIA_GET_TTL_SECONDS });
}

/** Mint a short-lived presigned PUT URL for a single-shot upload (small media). */
export async function presignPut(
  storageKey: string,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: env.MEDIA_GET_TTL_SECONDS });
}

/** True if the object exists in the bucket. */
export async function objectExists(storageKey: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: storageKey }));
    return true;
  } catch {
    return false;
  }
}
