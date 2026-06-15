import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/session";
import { listOwnerCapsules } from "@/lib/capsules";
import { CapsuleManager } from "./CapsuleManager";

/**
 * Future Capsules (US-4.2, J6). Protected. Server-renders the owner's pending
 * capsules; the client component handles seal / cancel against /api/capsules.
 */
export default async function CapsulesPage() {
  const account = await getCurrentAccount();
  if (!account || account.status !== "ACTIVE") redirect("/signin");
  const capsules = await listOwnerCapsules(account.id);
  return (
    <CapsuleManager
      initial={capsules.map((c) => ({
        id: c.id,
        type: c.type,
        recipientCircle: c.recipientCircle,
        unlockLocalDay: c.unlockLocalDay,
        status: c.status,
      }))}
    />
  );
}
