import { Google } from "arctic";
import { env, isGoogleOAuthEnabled } from "@/lib/env";

/**
 * Google OAuth via Arctic — used ONLY for the provider token exchange and to
 * obtain a provider-verified email. All invite-gating, account-state, and
 * identity-linking decisions stay in our own code (US-0.1 AC-4/AC-5), never
 * delegated to a generic auth adapter.
 */
export const googleRedirectUri = `${env.APP_URL}/api/auth/oauth/google/callback`;

export const google = isGoogleOAuthEnabled
  ? new Google(env.OAUTH_GOOGLE_CLIENT_ID, env.OAUTH_GOOGLE_CLIENT_SECRET, googleRedirectUri)
  : null;

export { isGoogleOAuthEnabled };

/** Decode the id_token payload (already signature-verified by Google) for the email. */
export function emailFromIdToken(idToken: string): string | null {
  try {
    const [, payload] = idToken.split(".");
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (json.email_verified && typeof json.email === "string") return json.email.toLowerCase();
    return null;
  } catch {
    return null;
  }
}
