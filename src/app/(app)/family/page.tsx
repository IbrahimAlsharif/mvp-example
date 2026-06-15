import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { pendingIncoming, pendingOutgoing, acceptedMembers } from "@/lib/connections";
import { FamilyManager } from "./FamilyManager";

/**
 * Family invitations & roster (US-3.5, J7). Protected. Server-renders the
 * initial pending requests + members; the client component handles invite /
 * accept / decline / revoke against /api/connections.
 */
export default async function FamilyPage() {
  const account = await getCurrentAccount();
  if (!account || account.status !== "ACTIVE") redirect("/signin");

  const [pending, sent, members] = await Promise.all([
    pendingIncoming(account.id),
    pendingOutgoing(account.id),
    acceptedMembers(account.id),
  ]);
  const other = (c: { accountAId: string; accountBId: string }) =>
    c.accountAId === account.id ? c.accountBId : c.accountAId;

  // Counterpart emails so each row shows who it is (not just the tier).
  const counterpartIds = Array.from(
    new Set([...pending.map(other), ...sent.map(other), ...members.map(other)]),
  );
  const accounts = counterpartIds.length
    ? await prisma.account.findMany({
        where: { id: { in: counterpartIds } },
        select: { id: true, email: true },
      })
    : [];
  const emailOf = new Map(accounts.map((a) => [a.id, a.email]));

  return (
    <FamilyManager
      initialPending={pending.map((c) => ({ id: c.id, tier: c.tier, fromEmail: emailOf.get(other(c)) ?? null }))}
      initialSent={sent.map((c) => ({ id: c.id, tier: c.tier, toEmail: emailOf.get(other(c)) ?? null }))}
      initialMembers={members.map((c) => ({ id: c.id, tier: c.tier, memberAccountId: other(c), memberEmail: emailOf.get(other(c)) ?? null }))}
    />
  );
}
