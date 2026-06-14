import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateState, generateCodeVerifier } from "arctic";
import { google, isGoogleOAuthEnabled } from "@/lib/auth/oauth";

/** Start Google OAuth: stash state + PKCE verifier in short-lived cookies. */
export async function GET() {
  if (!isGoogleOAuthEnabled || !google) {
    return NextResponse.json({ ok: false, reason: "oauth_disabled" }, { status: 404 });
  }
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "email"]);

  const jar = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  jar.set("g_state", state, opts);
  jar.set("g_verifier", codeVerifier, opts);

  return NextResponse.redirect(url);
}
