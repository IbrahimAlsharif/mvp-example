/**
 * Abandoned-upload reaper (US-1.2 AC-14).
 *
 * Aborts and removes ONLY UploadSession rows that never completed AND have had
 * no activity for longer than UPLOAD_ABANDON_THRESHOLD_HOURS (which must exceed
 * any realistic resume window). It never touches a completed session or any
 * PERSISTED Media — a confirmed memory is never reaped (guardrail G2).
 */
import { reapAbandonedUploads } from "../src/lib/media/upload";
import { env } from "../src/lib/env";
import { prisma } from "../src/lib/db";

async function main() {
  const n = await reapAbandonedUploads(env.UPLOAD_ABANDON_THRESHOLD_HOURS);
  console.info(`[reap] removed ${n} abandoned upload session(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
