// Create the private media bucket in the local MinIO (no anonymous policy).
import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "../src/lib/storage/s3";

async function main() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    console.log(`bucket ${BUCKET} exists`);
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
    console.log(`created private bucket ${BUCKET}`);
  }
  // Optionally seed a test object when given key + content.
  const key = process.argv[2];
  const content = process.argv[3];
  if (key && content) {
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: content }));
    console.log(`put ${key}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
