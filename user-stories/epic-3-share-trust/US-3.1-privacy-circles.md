# US-3.1 — Privacy Circles (Me Only / Family / Public-as-unlisted-link)

- **Epic:** Share with Trust (Core Value 3)
- **Priority:** 🔴 Load-bearing
- **MVP-blocking:** Yes
- **Journeys:** J3 (applied during J1, J2)
- **Source:** QC → *Privacy Circles (Me Only / Family / Public-as-unlisted-link)* (🔴 High); QC scenarios *Privacy enforcement*, *Circle comprehension / perceived trust (Arabic-first)*; UJM → J3; VQM → Core Value 3 → Privacy Circles; guardrail G1
- **Depends on:** US-0.1 (account/auth)
- **Status:** Ready for build

## Story
As a **Parent / Family Archivist (any persona)**, I want to **choose exactly who can see each memory — Me Only, Family, or a Public unlisted link — using labels I clearly understand in Arabic**, so that **I can upload intimate family content with confidence that it is seen only by who I intend**.

## Context / Why this matters
Privacy Circles are the trust gate on *all* value: families will not log private memories of children or relatives without confidence in who can see them (VQM Core Value 3). Two distinct failures must be guarded. **Enforced trust** — a "Me Only"/"Family" item leaking more widely — is irreparable trust loss plus GDPR/PDPL/PII liability. **Perceived trust** — the user *believing* an item is private when it is not, usually from unclear Arabic labeling — is a trust failure with no technical breach at all (QC: "Mis-set circle from unclear labeling"). Both are in scope here. Per G1, the MVP ships no browseable/indexed public surface; "Public" is an unlisted link only.

## Scope
**In scope (MVP):**
- A privacy-circle selector offering exactly three circles: **Me Only**, **Family**, **Public (unlisted link)**.
- The selector appears **during capture** (J1/J2 save step) and **on edit** of an existing event (J3 entry point).
- **Default is Me Only** on every create/import path (G1) — no path may default to anything wider.
- **Public = unlisted, non-discoverable shareable link only.** Selecting Public mints/exposes a share link; it creates **no** browseable, indexed, or searchable surface (G1). The link itself is governed by US-3.3 (non-guessable, auth/expiry, revocable).
- Applying **Public (unlisted link)** to an event that contains photo/video media shows an **explicit, blocking warning** that must be acknowledged before the circle is applied. The warning fires for **every** transition to Public on a media-bearing event and asks the owner to confirm the link contains no media of children they are not authorized to share. **No automated classification of media contents is performed (G3 — no proactive content scanning);** the trigger is content-blind, not based on system detection of children.
- Circle labels and their explanatory helper text are **unambiguous in Arabic** and render correctly RTL (G6) — this is a perceived-trust requirement, not cosmetic.
- **Enforcement:** the chosen circle is the authoritative access rule for the event and all its media; access is decided server-side on every request.
- This story **owns** the *Privacy enforcement* and *Circle comprehension / perceived trust (Arabic-first)* quality scenarios.

**Out of scope (deferred / roadmap):**
- Any **discoverable / indexed Public surface** and the guardian-consent gate that gates it (G9 — roadmap).
- **Circle-change propagation / revocation after creation** — owned by **US-3.2**.
- **Media-URL security mechanics** (non-guessable IDs, expiry, CDN, hotlinking) — owned by **US-3.3**.
- **Family membership management & invitations** (who *is* in Family) — owned by **US-3.5**; this story consumes the Family circle but does not manage its roster.
- Granular per-person sub-circles or relationship-graph permissions (roadmap).

## Acceptance Criteria
1. **Given** the capture form (J1/J2) or an event edit (J3), **when** the privacy step renders, **then** exactly three circles are offered — Me Only, Family, Public (unlisted link) — with **Me Only pre-selected** (G1).
2. **Given** any create or import path, **when** no circle is explicitly chosen, **then** the event is persisted as **Me Only** — no path defaults wider.
3. **Given** a user selects **Public (unlisted link)**, **when** the circle is applied, **then** the system produces only an **unlisted shareable link** and exposes **no** browseable, indexed, listed, or searchable surface for that event (G1); the event does not appear in any public feed, sitemap, or search index.
4. **Given** a user selects **Public (unlisted link)** for any event that contains photo/video media, **when** they confirm, **then** an **explicit warning is shown and must be acknowledged** before the circle is applied; the warning fires for **every** such transition (no automated detection of children — G3) and asks the owner to confirm the link contains no media of children they are not authorized to share; declining the warning leaves the circle unchanged.
5. **Given** the circle selector in Arabic (RTL), **when** a user reads the labels and helper text, **then** each circle states *who can see this memory* in Arabic clearly enough to pass the *Circle comprehension* gate (≥ 90% correct on first read, mis-set rate < 10%), and the layout renders correctly RTL (G6).
6. **(Enforcement — Me Only)** **Given** an event set to **Me Only** owned by account A, **when** a different authenticated account B attempts to reach it via the **UI** (timeline, deep link, shared link), **then** access is **denied** and the event and its media are not visible.
7. **(Enforcement — Me Only, direct/API)** **Given** the same Me-Only event, **when** account B (or an unauthenticated client) requests it via a **direct event URL or API endpoint** — including any media URL — **then** the request is **denied** server-side (not merely hidden in the UI). *Verify with a second account.*
8. **(Enforcement — Family)** **Given** an event set to **Family**, **when** an account that is **not** a member of the owner's Family circle requests it via UI or API, **then** access is denied; **when** a Family member requests it, access is granted. *(Membership roster managed by US-3.5; this AC asserts the circle is enforced against that roster.)*
9. **Given** an event is saved with a chosen circle, **when** persistence completes, **then** the circle is stored **atomically with the event** (and travels with it for legacy consent per US-4.1 and export per US-1.4); a save never leaves an event without a defined circle.
10. **Given** an event's circle is changed on **edit**, **when** the new circle is saved, **then** the new circle becomes the authoritative access rule. *(The propagation/revocation guarantees for downgrades are specified and gated in US-3.2.)*

## Quality Scenarios (gated)
- **Privacy enforcement** `J2 J3` — A "Me Only" item is unreachable by any other account via UI *or* direct/API URL (verify with a second account).
- **Circle comprehension / perceived trust (Arabic-first)** `J1 J2 J3` — In a moderated Arabic-first comprehension check of **N ≥ 8** pilot users, **≥ 90%** correctly state who can see a given memory on first read for each of the three circles, and the **mis-set rate (user picks a circle wider than they intended) is < 10%**. *Oracle: the user's verbal statement of who can see the memory vs. the actual circle semantics.* *Tests perceived trust, not just enforcement.*

## Non-Functional Requirements (deltas only)
- **Server-side authorization on every access path.** Circle enforcement must be decided server-side for both the event record and every media object; the UI hiding an item is never sufficient (ties to US-3.3 media-URL security).
- Circle selection/change is acknowledged **< 1s**; the J3 privacy step targets **under 20s** end-to-end (UJM J3 target time).

## Edge & Negative Cases
- **Wrong-circle exposure (enforced-trust failure)** — a Me-Only/Family item reachable by a non-member via UI *or* direct/API URL → must be impossible; this is irreparable trust loss + GDPR/PDPL/PII liability (QC catastrophic-adjacent).
- **Mis-set circle from unclear labeling (perceived-trust failure)** — a user believes an item is private but the label led them to over-share, with no technical breach → guarded by unambiguous Arabic labels + helper copy (the *Circle comprehension* scenario).
- **Public on children's media without warning** — must be impossible; the child-media warning is blocking and must be acknowledged. The trigger is content-blind (fires on every Public transition of a media-bearing event), never an automated content scan (G1, G3, child-safety).
- **Default leaking wider than Me Only** — any create/import path defaulting wider than Me Only is a defect (G1).
- **Public misread as a discoverable feed** — copy must make clear "Public" = an unlisted link only, not a public profile/feed (G1, perceived trust).
- **Event saved without a circle** — not allowed; every event carries a defined circle atomically (AC9).

## Telemetry (content-blind)
- `privacy_circle_selected` — when a circle is chosen, with structural metadata only: `circle` enum (me_only | family | public_unlisted), `context` enum (capture | edit), `is_default` bool. **No media, no note text** (G4).
- `privacy_circle_changed` — when a circle changes on edit, with `from_circle`/`to_circle` enums only (downgrade propagation telemetry is owned by US-3.2).
- `public_child_media_warning_shown` — when the child-media warning is displayed; `acknowledged` bool.
- `privacy_access_denied` — when a request is denied by circle enforcement, with `circle` enum and `surface` enum (ui | api | media_url). **No identifiers of the memory content.**

## Definition of Done
- [ ] All acceptance criteria pass
- [ ] All gated quality scenarios pass (Sara-verified) — *Privacy enforcement* + *Circle comprehension / perceived trust (Arabic-first)*
- [ ] Global guardrails upheld: **G1** (Me-Only default, Public = unlisted link only, child-media warning, no discoverable surface), **G6** (Arabic-first, unambiguous RTL circle labels — perceived trust)
- [ ] Arabic/RTL reviewed (G6) — circle labels + helper copy reviewed by an Arabic reviewer for unambiguity
- [ ] Accessibility AA on the capture/privacy flow (US-0.4)
- [ ] Telemetry events firing and verified content-blind (G4)
