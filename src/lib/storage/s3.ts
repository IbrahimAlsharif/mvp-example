import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

/**
 * S3-compatible client. Points at MinIO locally; any S3 provider in prod.
 * `forcePathStyle` is required for MinIO (no virtual-hosted-style buckets).
 */
export const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
});

export const BUCKET = env.S3_BUCKET;
