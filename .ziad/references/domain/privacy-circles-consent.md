---
id: k-ref-privacy-circles-consent
date: 2026-06-14
type: reference
scope: How memory/legacy & family-photo products implement privacy circles, access revocation, and media-URL security; plus the GDPR/child-data consent floor for Human Timeline Network
source: WebSearch + WebFetch (Proton, Google Photos, Apple, Tinybeans, AWS presigned-URL guidance, GDPR Art.8 & erasure guidance), 2026-06-14
confidence: high
status: active
review_after: 2026-07-14
refresh_interval: 30
related: [k-ref-competitor-index, k-project-product-profile]
---

# Privacy Circles, Revocation & Media-URL Security — Domain Reference

Calibrated for **Human Timeline Network**: Me-Only / Family / Public circles over
intimate, often child-related, family media. Trust here gates the entire product
(families won't log private memories without it). This is HTN's #1 risk *and* its
competitive wedge.

## 1. How the field implements circles (benchmark) — authority: official + analysis
- **Invite-only is the trust baseline.** Tinybeans is "100% invite-only — you
  handpick every member"; Apple Family Sharing has one organizer who invites/removes
  members and can disband the group; Proton shares per-album with specific people/groups.
- **Permissions are a managed, ongoing surface, not a one-time setting.** Proton and
  others keep shared content in a dedicated space where you "update permissions or
  revoke access anytime." Implication for HTN: circles must be a *living* control,
  visible and re-editable per event, not a create-time toggle.
- **Anti-copy controls signal seriousness.** Tinybeans' premium tier adds watermarking
  and download-blocking — recognition that "who can see" and "who can keep" are
  different problems.

## 2. The revocation reality (the hard truth) — authority: analysis
**Revoking access does NOT recall content already viewed, downloaded, or cached.**
- Google Photos: to stop sharing you remove all members AND turn off link sharing —
  but copies others already saved are gone from your control.
- Proton states plainly: "once a link is out there, it's often impossible to take it back."
- No consumer platform claims to retract downloaded copies.

**Design consequences for HTN's "circle-change propagation" scenario (J3):**
- Downgrading Family → Me-Only can reliably revoke *future server-side access*; it
  CANNOT undo what a prior member already downloaded. The product must not imply
  otherwise — over-promising "full revocation" is a trust trap worse than honesty.
- The defensible bar: (a) revoke server access within a tight, stated window;
  (b) invalidate any outstanding signed media URLs immediately; (c) set viewer
  expectations honestly ("removing access stops new viewing; copies others already
  saved can't be recalled"); (d) optionally deter copying (download-block/watermark)
  for the most sensitive circles.

## 3. Media-URL security (the leak vector) — authority: official (AWS)
Public/guessable CDN URLs are the classic way circle controls are bypassed entirely.
- **Use signed, expiring URLs**, never public or guessable object paths. Presigned
  URLs are *bearer tokens* — anyone holding the live URL can access the object, so
  keep TTLs short and scope them to a single object + operation (GET).
- **Permissions are checked at access time, not generation time** — so revoking the
  underlying grant invalidates access even on an unexpired URL (verify HTN's CDN
  layer actually honors this and doesn't cache past revocation).
- **Short signature age** (e.g., AWS `s3:signatureAge` deny over ~10 min) limits the
  blast radius of a leaked link.
- **CDN caching caveat:** a CDN in front of storage can keep serving a cached object
  after the origin grant is revoked. Cache keys/TTLs for private media must respect
  revocation — this is a common real-world hole.

## 4. The legal/consent floor (non-negotiable for child media) — authority: official (GDPR)
HTN stores intimate child/family media → GDPR child-data regime applies.
- **Parental consent** required to process data of children under 16 (member states
  may lower to ≥13). Consent must be informed, granular, and provable.
- **Revocable at any time** + **right to erasure** "rapidly and without friction" —
  implies a parent/guardian control surface for review, consent withdrawal, and deletion.
- **Public circle + children = elevated risk:** images leak location/routine; child
  safety and CSAM exposure are named catastrophic risks. Public sharing of identifiable
  minors should carry friction/guardrails, not be a frictionless toggle.

## Domain lessons (apply to future reviews)
1. **Honesty beats false completeness.** A circle system that *claims* total recall is
   a NEEDS-REDESIGN trust trap. Promise only what's enforceable: future-access revocation
   + URL invalidation, stated plainly. (Core Principle 6 — transparency builds trust.)
2. **The leak is almost never the circle UI — it's the media URL and the CDN cache.**
   Any privacy-circle review MUST verify signed/expiring URLs and revocation-aware caching,
   or the circle is theater.
3. **Public + minors needs a friction gate**, not parity with Me-Only/Family toggles.
4. **A guardian consent/erasure surface is table stakes**, not a roadmap nicety, given
   the child-data content.

## Remaining unknowns
- HTN's actual storage/CDN stack and whether its media URLs are already signed/expiring.
- Whether HTN has a guardian consent + erasure surface designed for the MVP.
- Target window for "circle-change propagation" (the QC scenario states a window but no value).

## Refresh 2026-06-14

New since original (original covered GDPR Art.8 + circle/revocation/URL basics; this pass adds the US/UK regimes, CSAM mechanics, and durability evidence).

### A. Child-data floor is a TWO-regime stack, not GDPR-only — authority: analysis + official
- **COPPA (US) = under-13**, triggered by "directed to children" OR "actual knowledge" — structurally different from GDPR's 13-16 band. HTN must satisfy **both**. *(analysis — Koley Jessen reading of the FTC COPPA Rule)*
- **2025 COPPA amendments (eff. 21 Jun 2025): SEPARATE verifiable parental consent for third-party disclosure** — consent to collection/use ≠ consent to disclose outward. Decouple "share-in-circle" from "disclose-to-processor/AI-vendor." *(official — FTC press release / Federal Register)*
- **2025 COPPA prohibits INDEFINITE child-data retention**, requires a published written retention policy, and expands PII to biometrics (voiceprints/faceprints/genetic). Decades-retention = state a specific lawful purpose; the bar is indefinite retention *without* a documented purpose, not an outright ban. *(analysis — Koley Jessen)*
- **UK Children's Code = 15 design-level standards** for any service "likely to be accessed by children": high-privacy defaults, geolocation OFF, profiling OFF, no nudging — attach by design even with a parent account holder; enforced via UK GDPR/DPA 2018. *(official — ICO)*
- Legal-precision fix to existing notes: under GDPR the **operator is normally the data controller**, not the parent — write consent language as "single accountable guardian per child," not "parent = controller." *(analysis — verifier correction)*

### B. CSAM / child-safety: no mandate to blanket-scan — authority: official
- **18 U.S.C. 2258A: no duty to monitor/search/screen/scan**; reporting triggers only on "actual knowledge" → NCMEC CyberTipline. Auto-scanning intimate child media is a chosen high-false-positive risk. *(official — statute §2258A(f)/(a))*
- **A completed CyberTipline report = 1-year preservation obligation** in a secure, access-limited store (§2258A(h)) → quarantined moderation store, separate from user-facing memory storage, NOT deletion. *(official — statute)*
- **EU ePrivacy voluntary-scanning derogation expired 3 Apr 2026** (extension failed; "Chat Control 2.0" unresolved). No clear EU basis to voluntarily scan. *(analysis — IAPP/Freshfields/Digital Watch corroborated)*
- Scope caveat: §2258A and the EU derogation are written for interpersonal *messaging*; whether a private family-memory **store** is in scope is unsettled — run an applicability analysis before asserting the law forbids/enables scanning HTN's media. *(synthesis — verifier scope caveat)*

### C. Competitor circle specifics — authority: official
- **FamilyAlbum (MIXI, Japan):** admin-invite, immediate removal, **non-searchable** albums; Japan operator = cross-border data-residency consideration for EU/UK child data. *(official — FamilyAlbum Help Center)*
- **Apple Family Sharing:** specifically resists casual removal of a **child** account (move/delete only) — child-protection pattern HTN should copy. *(official — Apple Support)*
- **Google Photos partner sharing is 1-to-1, NOT a multi-member circle** — cite only for two-sided opt-in + revocation, not for a Family-circle model. Tinybeans/FamilyAlbum/Apple carry the multi-member argument. *(official — Google Photos Help)*

### D. Durability is a first-order risk — authority: analysis
- **SafeBeyond** (funded digital-legacy/time-capsule vendor, Tel Aviv, Munich Re partnership) **ceased ops ~July 2022** — funded "decades" vendors do fail. *(analysis — Dealroom)*
- **GoodTrust** is **live in 2026** (~$149 then $39/yr; wills/directives + "digital executor" + last-message delivery + B2B insurer/bank distribution) — survives by pairing memory storage with executor handoff + recurring revenue. *(analysis — GoodTrust site + 2026 reviews)*
- Implication: HTN needs an explicit export / open-format portability / company-failure survivability (escrow + inheritance handoff) story to honestly promise "decades."
