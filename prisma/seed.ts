import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

// Deterministic invite token for tests/dev so e2e can navigate to
// /signup?invite=<token> without scraping logs. In real pilots, tokens are
// random (see randomToken in src/lib/ids.ts) and emailed to invited families.
const SEED_INVITE_TOKEN =
  process.env.SEED_INVITE_TOKEN ?? "dev-invite-" + randomBytes(8).toString("hex");

async function main() {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

  const invite = await prisma.invitation.upsert({
    where: { token: SEED_INVITE_TOKEN },
    update: { expiresAt },
    create: {
      token: SEED_INVITE_TOKEN,
      email: "pilot.family@example.com",
      expiresAt,
    },
  });

  console.info(`Seeded invitation: token=${invite.token} email=${invite.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
