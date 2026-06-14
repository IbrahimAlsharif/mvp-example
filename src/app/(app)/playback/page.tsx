import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/session";
import { PlaybackPlayer } from "./PlaybackPlayer";

/**
 * Life Playback (US-2.3, J5). Protected. The sequence is built server-side per
 * viewer via /api/playback; this page just hosts the player. Privacy is enforced
 * in the sequence builder, never client-side.
 */
export default async function PlaybackPage() {
  const account = await getCurrentAccount();
  if (!account || account.status !== "ACTIVE") redirect("/signin");
  return <PlaybackPlayer />;
}
