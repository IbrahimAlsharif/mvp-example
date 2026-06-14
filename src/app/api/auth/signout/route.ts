import { NextResponse } from "next/server";
import { revokeCurrentSession } from "@/lib/auth/session";

/**
 * Sign-out (US-0.1 AC-11). Revokes the session row server-side so a subsequent
 * request carrying the same cookie token is rejected — not merely a cleared
 * cookie on the client.
 */
export async function POST() {
  await revokeCurrentSession();
  return NextResponse.json({ ok: true });
}
