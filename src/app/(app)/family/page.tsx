import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/session";
import { pendingIncoming, acceptedMembers } from "@/lib/connections";
import { FamilyManager } from "./FamilyManager";

/**
 * Family invitations & roster (US-3.5, J7). Protected. Server-renders the
 * initial pending requests + members; the client component handles invite /
 * accept / decline / revoke against /api/connections.
 */
export default async function FamilyPage() {
  const account = await getCurrentAccount();
  if (!account || account.status !== "ACTIVE") redirect("/signin");

  const [pending, members] = await Promise.all([
    pendingIncoming(account.id),
    acceptedMembers(account.id),
  ]);
  const other = (c: { accountAId: string; accountBId: string }) =>
    c.accountAId === account.id ? c.accountBId : c.accountAId;

  return (
    <FamilyManager
      initialPending={pending.map((c) => ({ id: c.id, tier: c.tier }))}
      initialMembers={members.map((c) => ({ id: c.id, tier: c.tier, memberAccountId: other(c) }))}
    />
  );
}
