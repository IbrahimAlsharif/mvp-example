import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { google, isGoogleOAuthEnabled, emailFromIdToken } from "@/lib/auth/oauth";
import { socialSignupGoogle } from "@/lib/auth/accounts";
import { createSession } from "@/lib/auth/session";
import { emit } from "@/lib/telemetry";

/**
 * Google OAuth callback (US-0.1 AC-4/AC-5). Exchanges the code, extracts the
 * provider-verified email, then applies OUR invite/account rules:
 *  - created       → sign in to the new account, route into J1.
 *  - existing      → route to sign-in; we never auto-bind on the verified email
 *                    alone (identity linking happens only after they authenticate).
 *  - email_mismatch→ offer the email-signup path against their invitation (not a
 *                    flat invite-only refusal).
 */
export async function GET(req: NextRequest) {
  if (!isGoogleOAuthEnabled || !google) {
    return NextResponse.redirect(`${env.APP_URL}/signin?error=oauth_disabled`);
  }

  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const expectedState = jar.get("g_state")?.value;
  const verifier = jar.get("g_verifier")?.value;
  jar.delete("g_state");
  jar.delete("g_verifier");

  if (!code || !state || !verifier || state !== expectedState) {
    emit("signup_failed", { method: "google", failure_reason: "social_auth_failed" });
    return NextResponse.redirect(`${env.APP_URL}/signin?error=social_auth_failed`);
  }

  let email: string | null = null;
  try {
    const tokens = await google.validateAuthorizationCode(code, verifier);
    email = emailFromIdToken(tokens.idToken());
  } catch {
    email = null;
  }
  if (!email) {
    emit("signup_failed", { method: "google", failure_reason: "social_auth_failed" });
    return NextResponse.redirect(`${env.APP_URL}/signin?error=social_auth_failed`);
  }

  const result = await socialSignupGoogle(email);
  if (!result.ok) {
    emit("signup_failed", { method: "google", failure_reason: "email_mismatch" });
    return NextResponse.redirect(`${env.APP_URL}/signup?social=mismatch`);
  }
  if (result.status === "existing_account") {
    return NextResponse.redirect(`${env.APP_URL}/signin?social=existing`);
  }

  await createSession(result.account.id);
  emit("signup_completed", { method: "google", is_invited: true });
  return NextResponse.redirect(`${env.APP_URL}/timeline?welcome=1`);
}
