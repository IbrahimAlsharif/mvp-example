# US-3.3 — Media-URL Security (non-guessable, auth/expiry, unlisted links)

- **Epic:** Share with Trust (Core Value 3)
- **Priority:** 🔴 Load-bearing
- **MVP-blocking:** Yes
- **Journeys:** J2, J3
- **Source:** QC scenario *Media-URL security*; VQM → Core Value 3 → Privacy Circles → Security risk *"Guessable/leaky media URLs (including unlisted share links) bypass circle controls entirely"*
- **Depends on:** US-3.1 (privacy circles)
- **Status:** Ready for build

## Story
As a **Parent / Family Archivist (any persona)**, I want **every media file behind a non-guessable, authenticated, expiring URL — including the unlisted Public links I share**, so that **no one can reach my family's photos and videos by guessing a URL, scraping a CDN, or holding onto a link I meant to revoke**.

## Context / Why this matters
Privacy Circles (US-3.1) decide *who is allowed*; media-URL security decides whether that decision is *actually enforced on the bytes*. The named Security risk is blunt: *"Guessable/leaky media URLs (including unlisted share links) bypass circle controls entirely."* If a media URL is guessable, served from a public CDN, or never expires, then circle enforcement is theater — a Me-Only video is one lucky URL away from a stranger. This story makes the media layer the second, independent line of enforcement under every circle and every unlisted share link. It **owns** the *Media-URL security* quality scenario.

## Scope
**In scope (MVP):**
- **All media URLs** — for Me-Only, Family, **and** Public-unlisted-link media — are **non-guessable** (high-entropy identifiers; no sequential/enumerable IDs, no predictable paths).
- Media access is **authenticated and/or signed with an expiry** — a URL alone is never a permanent bearer credential; access is re-authorized against the event's current circle (US-3.1 / US-3.2) on each grant.
- **No public CDN leakage** — Me-Only / Family / unlisted media is never served from a publicly cacheable, unauthenticated CDN path; cache keys are scoped so one user's signed URL cannot serve another's bytes.
- **Unlisted Public share links are revocable** — revoking a link (directly, or via a US-3.2 downgrade) immediately stops it from granting access.
- Enforcement is **server-side on every media request**, consistent with the circle authorization in US-3.1/US-3.2.
- This story **owns** the *Media-URL security* quality scenario.

**Out of scope (deferred / roadmap):**
- The circle model, labels, and default — owned by **US-3.1**.
- The *trigger* logic for revocation on circle downgrade — owned by **US-3.2** (this story implements the *mechanism* that makes that revocation real for media).
- DRM / watermarking / forensic leak tracing (roadmap).
- A discoverable/indexed public media surface (G9 — not built).

## Acceptance Criteria
1. **(Non-guessable)** **Given** any stored media object, **when** its URL is generated, **then** the URL uses a **high-entropy, non-sequential identifier** — an attacker cannot enumerate or guess valid media URLs by incrementing IDs or following a predictable path pattern.
2. **(Auth / expiry)** **Given** a media URL for Me-Only or Family media, **when** it is requested **without valid authorization** (wrong/no account, expired signature), **then** the request is **denied server-side** — the bytes are never returned.
3. **(Circle re-authorization)** **Given** a media object, **when** access is granted, **then** authorization is checked against the **event's current circle** (US-3.1) at request time — so a circle change in US-3.2 is honored by the media layer, not just the event record.
4. **(No CDN leakage)** **Given** Me-Only / Family / unlisted media, **when** an unauthenticated client hits any CDN edge or cache path for it, **then** the bytes are **not served** — there is no publicly cacheable, unauthenticated path to private/unlisted media, and cache keys are user/grant-scoped.
5. **(Unlisted link is non-guessable too)** **Given** a Public unlisted share link, **when** it is generated, **then** it is itself **non-guessable** (high-entropy) and non-discoverable — it appears in no index, feed, or sitemap (G1).
6. **(Unlisted link revocable)** **Given** a previously shared unlisted link, **when** the owner revokes it (directly or via a US-3.2 downgrade), **then** the link **stops granting access** to the event and its media **within the US-3.2 circle-change propagation target window**, and a cached/edge-cached object never outlives its grant; a held copy of the link returns denied.
7. **(Expired link)** **Given** an unlisted share link or signed media URL with an expiry, **when** it is requested **after expiry**, **then** access is denied — expiry is enforced server-side, not by the client. Every unlisted link carries a bounded expiry: if the owner sets none, a bounded default applies (no link is a permanent bearer credential).
8. **(Non-member direct access)** **Given** a Me-Only or Family media URL, **when** a **non-member** obtains and requests it directly (out of band), **then** access is denied — possession of the URL alone never authorizes the bytes (AC2/AC3 in combination).
9. **(Consistency with circles)** **Given** the *Privacy enforcement* scenario in US-3.1 (second-account test), **when** verifying Me-Only unreachability, **then** the media URL path is included in that verification and also denies the second account.
10. **(Import-path parity)** **Given** media created via dated bulk import, **when** its URL is generated and requested, **then** it is subject to identical non-guessable / auth / expiry / no-CDN-leak enforcement as single-upload media — no separate or weaker storage/CDN path exists for imported objects.
11. **(Honest revoke copy)** **Given** the revoke (or downgrade) confirmation surface, **when** it is shown, **then** it states plainly that revocation stops new/future access but cannot recall copies a viewer already downloaded — over-promising total recall is a defect (this honesty wording is part of the Arabic/RTL review, G6).

## Quality Scenarios (gated)
- **Media-URL security** `J2 J3` — Direct media links (including unlisted Public share links) are non-guessable and auth/expiry protected — no public CDN leakage of Family/Me-Only/unlisted media. **Target metrics:** identifiers carry **≥ 128 bits** of randomness (enumeration computationally infeasible); active signed media GET URLs expire within **≤ 10 minutes**; a revocation/downgrade is enforced (origin + CDN cache key invalidated) within the **US-3.2 circle-change propagation target window**, and no cached object is served after its grant is revoked.

## Non-Functional Requirements (deltas only)
- **Identifier entropy:** media and share-link identifiers carry **≥ 128 bits** of randomness so brute-force enumeration is computationally infeasible (no sequential or short IDs).
- **Signed-URL / token lifetime:** an active signed media GET URL expires within **≤ 10 minutes**; every unlisted link carries a bounded expiry (owner-set, or a bounded default if unset). Expiry and revocation are enforced **server-side** on each request, never by client trust.
- **Revocation propagation:** on revocation or downgrade, both the origin grant **and** the CDN/edge cache key are invalidated within the **US-3.2 circle-change propagation target window** (use one shared window value across US-3.2 and US-3.3); no cached object outlives its grant.
- **Cache scoping:** any CDN/cache layer must key on the live authorization grant so a cached object is never served to an unauthorized requester, and a revoked grant cannot be served from a stale edge copy before its natural TTL (no shared public cache for private/unlisted media).

## Edge & Negative Cases
- **Direct URL access by a non-member** — obtaining the raw media URL must not grant access (AC8).
- **Expired link** — a once-valid link/URL must deny after its expiry (AC7).
- **Revoked link** — a link revoked directly or via downgrade (US-3.2) must deny within the propagation window, even if the holder cached the URL (AC6).
- **Revoked-but-cached object** — a CDN/edge-cached object must not be served after its grant is revoked, even before its natural TTL expires (cache keyed on the live grant) (AC4/AC6).
- **Bulk-import path** — media created via dated bulk import must use the same secured storage/CDN path as single-upload media; no weaker or separate import path may leak imported objects (AC10).
- **CDN cache leakage** — private/unlisted bytes must never be retrievable from a public/unauthenticated CDN path or cross-user cache key (AC4).
- **Hotlinking** — embedding a media URL on a third-party page must not bypass auth/expiry; the bytes are still gated server-side.
- **Enumeration / guessing** — incrementing or pattern-guessing IDs must never surface another user's media (AC1).

## Telemetry (content-blind)
- `media_access_granted` — when a media request is authorized, with `circle` enum and `access_via` enum (owner | family_member | unlisted_link). **No media bytes, no content** (G4).
- `media_access_denied` — when a media request is denied, with `reason` enum (no_auth | expired | revoked | not_member | bad_signature) and `access_via` enum. **No memory identifiers tied to content.**
- `unlisted_link_revoked` — when an unlisted share link is revoked, with `trigger` enum (manual | circle_downgrade).
- `unlisted_link_expired` — when an expired link is rejected.

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] All gated quality scenarios pass (Sara-verified) — *Media-URL security*
- [ ] Global guardrails upheld: **G1** (unlisted links non-discoverable; no public surface), **G2** (security enforcement never deletes or locks media — denial is access-only)
- [ ] Cross-checked with **US-3.1** (*Privacy enforcement* second-account test includes the media-URL path) and **US-3.2** (downgrade triggers real link/media revocation)
- [ ] Arabic/RTL reviewed for any user-facing link/expiry/revoke copy (G6)
- [ ] Telemetry events firing and verified content-blind (G4)
