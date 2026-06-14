import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { confirmAccount } from "@/lib/auth/accounts";
import { createSession } from "@/lib/auth/session";
import { emit } from "@/lib/telemetry";

/**
 * Confirmation link target (US-0.1 AC-3/AC-8). On success the account is
 * activated, a session is created, and the user is routed into J1 (the
 * timeline / first-event flow). Invalid/expired links route to an error screen
 * with a resend path; the account is never silently confirmed.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(`${env.APP_URL}/confirm?error=invalid`);

  const result = await confirmAccount(token);
  if (!result.ok) {
    return NextResponse.redirect(`${env.APP_URL}/confirm?error=${result.reason}`);
  }

  await createSession(result.account.id);
  emit("account_confirmed", {});
  emit("signup_completed", { method: "email", is_invited: true });
  return NextResponse.redirect(`${env.APP_URL}/timeline?welcome=1`);
}
