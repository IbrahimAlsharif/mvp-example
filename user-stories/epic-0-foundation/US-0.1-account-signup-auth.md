# US-0.1 — Account signup, authentication & confirmation

- **Epic:** Foundation & Measurement (cross-cutting)
- **Priority:** 🔴 Load-bearing
- **MVP-blocking:** Yes
- **Journeys:** J1 (step 1)
- **Source:** UJM → J1 step 1; QC → MVP Scope Decision #7 (closed, invite-only pilot); guardrail G7
- **Depends on:** US-0.3 (canonical telemetry taxonomy — event names/field schema), US-0.4 (accessibility AA gate for these flows)
- **Status:** Ready for build

## Story
As a **new user (any persona) who has received a pilot invitation**, I want to **sign up, confirm my account, and stay signed in across my own browsers and devices**, so that **I can reach the product and start building my timeline** — and so the pilot stays scoped to invited families as the experiment requires.

## Context / Why this matters
This is the very first step of J1 and the gate in front of every other journey — no account, no events, no readable bet. The MVP is a **closed, invite-only pilot** (G7, QC scope decision #7): gating signup to invited families lowers child-safety/CSAM legal exposure and keeps the experiment frame clean (a known, bounded cohort). It is also the first node of the activation funnel (`signup_started` → `signup_completed`), so it must emit content-blind funnel events that US-0.3 reads. A broken or leaky front door either blocks activation for a UX reason (corrupting the bet) or breaks the closed-pilot guarantee.

## Scope
**In scope (MVP):**
- **Invite-only gating (G7):** a valid, unexpired invitation is required to create an account. There is **no open, public, self-serve signup** at MVP. An invite can be presented as an invite link/token and/or an invited email address on an allowlist.
- **Email signup** (email + password) with **account confirmation** (verify the email address before the account is fully active).
- **Social signup** (at least one provider) as an alternative path; the social-verified email still has to match a valid invitation.
- **Authentication / sign-in** for returning users (email or social).
- **Session that works across the user's own browsers/devices** — a successful sign-in on the user's laptop browser and phone browser both reach the same account and timeline (cross-device = the user's own sessions, per CONVENTIONS platform scope).
- **Duplicate-account prevention** — a given identity (email) maps to exactly one account; signing up again routes to sign-in.
- First funnel step instrumentation: `signup_started` / `signup_completed` (content-blind, G4), coordinated with US-0.3's taxonomy.

**Out of scope (deferred / roadmap):**
- Open/public discoverable self-serve signup (deferred with the closed pilot — G7, G9).
- Paid tiers / billing at signup (G8 — MVP is free).
- Account handoff / designate-heir / death-trigger sign-in semantics (J8, G9).
- Multi-factor authentication beyond email confirmation, SSO/enterprise identity, and team/org accounts (not in MVP scope).
- Native-app session/device pairing (web-only MVP).

## Acceptance Criteria
1. **Given** a visitor **without** a valid invitation, **when** they attempt to create an account (any path), **then** account creation is refused with a clear, non-shaming message that the pilot is invite-only (G7), and **no** account is created.
2. **Given** a visitor **with** a valid, unexpired invitation, **when** they sign up with email + password, **then** an account is created in an *unconfirmed* state and a confirmation email is sent; the account becomes fully active only **after** the user confirms.
3. **Given** an unconfirmed account, **when** the user clicks a valid confirmation link, **then** the account is confirmed and the user is signed in and routed into J1 (welcome / first-event flow).
4. **Given** an invitation tied to a specific email, **when** the user signs up via a **social** provider, **then** signup succeeds **only if** the provider-verified email matches a valid invitation; otherwise (the user is invited but their social email differs) they are offered the email-signup path against the **same** invitation — not a generic invite-only refusal — so a genuinely invited family member can still proceed (G6 Arabic-first messaging).
5. **Given** an email that already has an account, **when** someone tries to sign up again with that email (email or social), **then** no second account is created and the user is routed to sign-in (duplicate-account prevention). When a social-verified email matches an existing email-password account, the user is routed to sign-in for the existing account and identities are linked **only after** the user authenticates into that account — never auto-bound on the verified email alone.
6. **Given** a confirmed user, **when** they sign in on a second browser/device of their own, **then** both sessions resolve to the **same** account identity and both reach the same (possibly empty) timeline, and each session has an independent, valid, expirable session token. *(Write-then-fresh-read cross-device data consistency is owned by US-1.1/US-2.1, not US-0.1 — at signup the account has no events to read back.)*
7. **Given** an expired or already-used invitation, **when** the user attempts signup, **then** signup is refused with a clear message and a path to request a new invite — **no** partial/orphan account is left behind.
8. **Given** an expired or invalid confirmation link, **when** the user clicks it, **then** they see a clear error and can request the confirmation email be re-sent; the account stays in the unconfirmed state (never silently confirmed).
9. **Given** a default privacy posture, **when** a brand-new account is created, **then** the account's default privacy circle is **Me Only** (G1) — signup never sets a broader default.
10. **Given** any sign-up/sign-in/confirmation screen, **when** it renders, **then** all copy is Arabic-first and the layout is correct in RTL (G6), and privacy/invite messaging is unambiguous in Arabic.
11. **Given** a confirmed user, **when** they sign out, **then** their session token is invalidated server-side and a subsequent request with that token is rejected (no silent reuse).
12. **Given** a confirmed user who has lost access to their password, **when** they initiate recovery via their verified email, **then** they can securely regain access via a **non-guessable, single-use, expiring** reset link **without** creating a second account; an expired/already-used/wrong-email reset link shows a clear error and never silently resets the password.

## Quality Scenarios (gated)
- **Activation instrumentation validity** `J1 J2 J4` — Signup is the first funnel stage; `signup_started` and `signup_completed` fire exactly once per real attempt/completion and feed US-0.3's funnel; analytics never captures memory media/content (G4). *(Shared scenario — US-0.1 owns the signup stage.)*
- **Accessibility (WCAG AA on core flows)** `J1` — The signup, confirmation, and sign-in screens are screen-reader operable and fully keyboard-navigable, per US-0.4 (most at-risk: Elderly persona).
- **Circle comprehension / perceived trust (Arabic-first)** `J1` — Invite/privacy copy shown at signup is unambiguous in Arabic; a real user understands the account defaults to **Me Only**.

## Non-Functional Requirements (deltas only)
- Confirmation email dispatched **< 30s** after signup; sign-in acknowledged **< 1s** after submit (no frozen UI).
- Invitation tokens and confirmation links are **non-guessable** and **single-use / expiring** (consistent with the global non-guessable-URL baseline).
- Credentials stored using an industry-standard salted password hash; session tokens are httpOnly/secure and expirable.

## Edge & Negative Cases
- **Invalid / expired / already-used invite** → refused with a clear message + re-request path; never creates an orphan account (AC-7).
- **Failed email confirmation** (link expired, malformed, or email never arrived) → clear error + re-send confirmation; account stays unconfirmed, never silently activated (AC-8).
- **Duplicate account** (re-signup with an existing email, including email-vs-social collision on the same verified address) → routed to sign-in, no second account (AC-5).
- **Social-auth failure** (provider denies, user cancels mid-flow, provider returns no verified email) → return to a usable state with a clear error; offer the email path; no half-created account.
- **Invite/email mismatch on social** → do not auto-bind a social identity to a different invited email; offer the email-signup path against the same invitation rather than a flat invite-only refusal (AC-4).
- **Confirmation race** (link clicked twice / already confirmed) → idempotent; second click lands the user signed-in, not an error.
- **Password-reset link expired / already-used / wrong email** → clear error, never silently resets the password, never creates an orphan/second account (AC-12).

## Telemetry (content-blind)
- `signup_started` — when the signup form opens (with structural metadata only: method enum {email, social}, invite_present bool). **No PII content beyond what the funnel needs; no memory content (G4).**
- `signup_completed` — on confirmed, active account (with method enum, is_invited bool). First funnel stage feeding US-0.3.
- `signup_failed` — on refusal/failure (with failure_reason enum {no_invite, invite_expired, invite_used, duplicate_account, social_auth_failed, email_mismatch}).
- `account_confirmation_sent` / `account_confirmed` — confirmation lifecycle (structural only).
- `signin_completed` — returning-user sign-in (with method enum) — supports retention/return measurement in US-0.3.
- `password_reset_requested` / `password_reset_completed` — account-recovery lifecycle (structural only; no credential or PII content).
- Event names and field schemas conform to **US-0.3's canonical taxonomy** (no ad-hoc events); US-0.1 does not define new event vocabulary.

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] All gated quality scenarios pass (Sara-verified)
- [ ] Global guardrails upheld: G7 (invite-only — no open signup), G1 (Me-Only default on new accounts), G4 (content-blind funnel telemetry), G8 (no paywall at signup)
- [ ] Arabic/RTL reviewed (G6)
- [ ] Accessibility AA on the signup/confirmation/sign-in flow (US-0.4)
- [ ] Telemetry events firing and verified content-blind (coordinated with US-0.3 taxonomy)
