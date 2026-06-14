// Dev helper: print the newest unused confirm token for an email.
import { prisma } from "../src/lib/db";

async function main() {
  const email = process.argv[2]?.toLowerCase();
  const acc = email ? await prisma.account.findUnique({ where: { email } }) : null;
  const tok = await prisma.emailToken.findFirst({
    where: { purpose: "confirm", usedAt: null, ...(acc ? { accountId: acc.id } : {}) },
    orderBy: { createdAt: "desc" },
  });
  process.stdout.write((tok?.token ?? "") + "\n");
}

main().finally(() => prisma.$disconnect());
