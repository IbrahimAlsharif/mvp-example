// Dev helper: create an invitation and print its token.
// Usage: tsx scripts/make-invite.ts [email]
import { prisma } from "../src/lib/db";
import { randomToken } from "../src/lib/ids";

async function main() {
  const email = process.argv[2]?.toLowerCase();
  const token = "inv-" + randomToken(8);
  await prisma.invitation.create({
    data: { token, email, expiresAt: new Date(Date.now() + 3600_000) },
  });
  process.stdout.write(token + "\n");
}

main().finally(() => prisma.$disconnect());
