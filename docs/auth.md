# Authentication & Sessions (US-0.1)

Invite-only, Arabic-first auth for the closed pilot (guardrail **G7**). New
accounts always default to **Me Only** (**G1**). All auth telemetry is
content-blind (**G4**).

## Flows

### Email signup → confirmation
1. `POST /api/auth/signup { email, password, invite }` → `signupWithEmail()`
   validates the invitation, then in **one transaction** consumes the invite +
   creates an `UNCONFIRMED` account + the `EMAIL` identity + a single-use
   confirm `EmailToken`. No valid invite ⇒ nothing is created (AC-1/AC-7).
2. A confirmation email is sent (dev: logged to console; `< 30s` NFR).
3. The link hits `GET /api/auth/confirm?token=…` → `confirmAccount()` flips the
   account to `ACTIVE`, marks the token used, creates a session, and redirects
   into J1 (`/timeline`). Re-clicking a used link on an ACTIVE account is
   idempotent (AC-8).

### Social (Google) signup
`/api/auth/oauth/google` → Arctic authorize → callback. Arctic does **only** the
token exchange; `socialSignupGoogle()` owns the rules (AC-4/AC-5):
- verified email pinned to a valid invite ⇒ create `ACTIVE` account (email
  already verified) + `GOOGLE` identity;
- email already has an account ⇒ route to sign-in, **never auto-bind** identity
  on the verified email alone;
- no account and no invite for that email ⇒ offer the email-signup path
  (`/signup?social=mismatch`), not a flat refusal.

### Sign-in / sign-out
`POST /api/auth/signin` verifies argon2id + ACTIVE status. `POST /api/auth/signout`
sets `Session.revokedAt`; a subsequent request with that cookie token is rejected
**server-side** (AC-11), not just cleared client-side.

### Password reset
`POST /api/auth/reset { email }` always returns ok (no account enumeration). With
`{ token, password }` it completes via a single-use, expiring token, revokes the
account's existing sessions, and never creates a second account (AC-12).

## Session model
- Cookie `htn_session` carries a 256-bit random token; the DB stores only its
  SHA-256 hash (`Session.tokenHash`). A DB leak cannot mint sessions.
- Each device is an independent `Session` row resolving to the same account
  (cross-device, AC-6). `requireAccount()` / `getCurrentAccount()` are the
  server-side gates every protected route/page uses.

## Screens (UI)
The user-facing auth pages live in the `(auth)` route group and share one shell:
- `src/app/(auth)/layout.tsx` — centered card on a soft gradient canvas with the
  product brand header; RTL is inherited from the root `<html dir="rtl">` (G6).
- `src/app/(auth)/ui.tsx` — shared kit (`AuthCard`, `Field`, `SubmitButton` with
  spinner, `GhostButton`, `Alert`, `Divider`); styled with the blue/orange
  identity (see [Design System](design-system.md)). Spacing uses logical
  properties so it renders correctly under RTL.
- `signin/page.tsx`, `signup/page.tsx`, `reset/page.tsx` — consume the kit. Copy
  is Arabic-first via `messages/ar.json` (`auth.*`). Signin failures use
  `auth.signinFailed` (not the invite-error copy); reset failures use
  `auth.resetFailed`. Signin links to both `/signup` and `/reset`. Signup's
  Google button is a `GhostButton`. These pages are presentation only — all
  auth logic stays in the API routes above.
- `src/app/confirm/page.tsx` — the invalid/expired-link + resend screen. Lives
  outside the `(auth)` group, so it renders its own centered shell but reuses
  the same kit (imports from `../(auth)/ui`) for a consistent look.

## Security notes
- Passwords: argon2id (`src/lib/auth/password.ts`).
- Tokens (invite, confirm, reset, session): ≥128-bit via `randomToken()`.
- `devConfirmUrl` / `devResetUrl` are returned **only** outside production for
  local/e2e testing; never exposed in production.
