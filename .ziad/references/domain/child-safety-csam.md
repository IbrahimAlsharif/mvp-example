---
id: k-ref-child-safety-csam
date: 2026-06-14
type: reference
scope: How family-media platforms handle child-safety and CSAM exposure — mandatory detection/reporting duties (NCMEC/18 USC 2258A, REPORT Act, EU CSA Regulation, UK Online Safety Act), children's-privacy consent (COPPA, GDPR Art.8, AADC), detection mechanics (PhotoDNA/NeuralHash), and the catastrophic false-positive problem specific to intimate family photos — calibrated to Human Timeline Network's "Child-safety & CSAM exposure in the Public circle" risk
source: WebSearch (18 USC 2258A/REPORT Act, EU CSA Regulation "Chat Control" + ePrivacy derogation, UK Online Safety Act/Ofcom, FTC COPPA 2025 amendments + California AADC, GDPR Art.8; PhotoDNA + Apple NeuralHash; NYT/EFF/Gizmodo Google false-positive cases), 2026-06-14
confidence: high
status: active
review_after: 2026-07-14
refresh_interval: 30
related: [k-project-product-profile, k-ref-privacy-circles-consent, k-ref-competitor-index, k-ref-media-durability]
---

# Child-Safety & CSAM Exposure — Domain Reference

Calibrated for **Human Timeline Network**. Child safety here is unlike any other product
because HTN's **core content *is* intimate child media** — families logging children's lives.
The named catastrophic risk is "Child-safety & CSAM exposure in the Public circle," but the
research shows the **larger, under-appreciated risk runs the other way**: the standard
big-platform CSAM defense (aggressive automated scanning + auto-ban) **false-positives on
exactly HTN's core content** and destroys the trust the product sells. This file separates
the two and gives the design line. The GDPR child-consent floor and the "Public + minors needs
friction" rule already live in [privacy-circles-consent](privacy-circles-consent.md) (H-A3/H-A4);
this file is the **detection, reporting, and false-positive** layer those don't cover.

## 1. The mandatory-reporting duty — authority: official (US statute)
- **18 U.S.C. § 2258A** requires any electronic service provider that obtains **actual
  knowledge** of apparent CSAM on its systems to report it to **NCMEC's CyberTipline** "as
  soon as reasonably possible." Covers cloud platforms, photo services, social apps — HTN sits
  squarely in scope if it has US users.
- **REPORT Act (2024)** amended § 2258A: expanded reporting categories, **raised penalties**
  for knowing-and-willful failure to report (up to ~**$150k first offense / $300k subsequent**,
  scaling with platform size), required providers to **secure** CSAM consistent with cyber
  standards, and **extended preservation of CyberTipline reports to ≥1 year** (up from 90 days).
- **Key nuance:** the duty triggers on **actual knowledge**, not a general duty to *search*. US
  law does **not** mandate proactive scanning — but once you know, you must report. This shapes
  whether HTN scans at all, and how.

## 2. The wider regulatory landscape — authority: official
- **EU CSA Regulation ("Chat Control") — volatile, track closely.** As of **late 2025 / early
  2026** the Council position **dropped mandatory detection orders** (no forced scanning / no
  mandated client-side scanning for now; a review clause defers the question ~3 years). Separately,
  the **ePrivacy derogation** that gave providers the legal basis to *voluntarily* detect CSAM was
  set to **expire 3 April 2026**, and Parliament–Council negotiations to extend it **broke down
  (26 March 2026)** — leaving the legal basis for voluntary EU scanning **uncertain**. Newer drafts
  also pivot toward **age verification** rather than message scanning. *(Fast-moving — re-verify
  before relying on any specific status.)*
- **UK Online Safety Act.** Services "**likely to be accessed by children**" must complete a
  **children's risk assessment** (deadline **24 Jul 2025**) and implement **child-safety measures**
  (from **25 Jul 2025**), enforced by Ofcom. A family-memory app is plainly likely-to-be-accessed-
  by-children → these duties attach.
- **COPPA (US) + Jan 2025 FTC amendments.** Verifiable **parental consent** before collecting data
  from a child **under 13**; the 2025 amendments add **separate** consent for third-party
  disclosure and broaden accepted consent methods (knowledge-based, face-verification, text+ID).
- **California AADC (and similar).** Design duties for **all minors under 18**: **high-privacy
  defaults**, **data minimization**, and **no profiling/geolocation** by default — design-level, not
  just consent-level.
- **GDPR Art.8** (already in privacy-circles ref): parental consent for under-16 (member states may
  lower to ≥13); informed, granular, provable, revocable; rapid erasure.

## 3. How detection actually works — and why it misfires on family photos — authority: analysis
- **PhotoDNA** (Microsoft / Hany Farid): converts an image to a **perceptual hash** (greyscale,
  gridded, shading-analyzed) and matches against a database of **known** CSAM hashes. Robust to
  resize/recolor. It matches *known* material — it does **not** "understand" a new photo.
- **AI classifiers** (the newer layer) attempt to flag **novel** suspected CSAM — and this is the
  error-prone part. Google uses such tooling and **false-positived on innocent medical/bath photos**.
- **Apple NeuralHash (on-device, 2021)**: announced, hit fierce **privacy backlash**, researchers
  demonstrated **hash collisions/evasion**, and Apple **formally cancelled it (Dec 2022)**. Lesson:
  on-device/client-side scanning is both a privacy lightning rod and technically attackable.

## 4. The false-positive catastrophe — the risk that actually threatens HTN — authority: analysis
Documented cases (NYT, EFF, Gizmodo): fathers photographed a **sick child's groin for a doctor**;
Google's automated CSAM system flagged the upload, **filed an NCMEC report**, and **permanently
disabled the entire Google account** — losing the user's **years of photos, email, everything**.
Police investigated and **cleared** them — and Google **kept the ban anyway**. A 2026 wave of
similar false-positive bans on Google Photos is reported.

**Why this is existential for HTN specifically:** HTN's whole promise is "**never lose your family
memories**." An aggressive auto-ban model would, on HTN's *own core content* (intimate child
moments), produce a **triple catastrophe**: (a) it **destroys the memories** — HTN's #1 named risk;
(b) it **falsely brands a parent a child abuser** and refers them to law enforcement; (c) it makes
the very families HTN targets **afraid to upload child media at all** — killing the primary metric
(Events-Added) at its source. For a generic photo cloud this is an edge case; for a family-memory
product it strikes the center.

## Domain lessons (apply to future reviews)
1. **The dominant child-safety risk for HTN is the FALSE POSITIVE, not under-detection.** Copying
   the big-platform "scan everything + auto-ban + auto-report" posture would weaponize HTN against
   its own users and content. Any moderation design that can **silently delete an account/memories**
   on an automated flag is **NEEDS REDESIGN**.
2. **Never conflate "flagged" with "guilty," and never couple a flag to memory deletion.** Required
   guardrails: **human-in-the-loop review** before any account action, a **real appeal/restoration**
   path, and **preservation of the user's memories** separately from any moderation hold (a flag must
   not trigger the data-loss the product exists to prevent). The Google cases failed every one.
3. **Reporting duty is real but narrow — design to it deliberately.** US law requires reporting on
   **actual knowledge** (§2258A/REPORT Act), not a duty to proactively scan. HTN must decide its
   scanning posture *consciously* (whether/where/with humans), not import a default that over-scans
   private family storage.
4. **Concentrate child-safety controls on the *Public* circle — the actual exposure surface.**
   Me-Only/Family are private storage; the catastrophic *exposure* (identifiable minors, location/
   routine leakage, CSAM-grooming reach) happens at **Public**. Pair with the existing **friction
   gate + guardian consent before any identifiable minor reaches Public** (H-A3/H-A4).
5. **Children's-privacy compliance is design-level, not just a consent checkbox.** AADC/UK-OSA/
   COPPA-2025 demand **high-privacy defaults, data minimization, no default geolocation/profiling,**
   and a documented **children's risk assessment** — table stakes for a child-media product, not roadmap.

## Suggested review heuristics (promote to synthesis/review-heuristics.md if they fire 3+ times)
- **H-E1 — No automated flag may delete or lock memories.** Fires on any moderation/abuse-detection/
  account-suspension feature. Test: is there human review before account action, an appeal path, and
  memory preservation independent of the moderation hold? Fail → NEEDS REDESIGN.
- **H-E2 — Scanning posture must be deliberate and scoped, not a copied default.** Fires when any
  CSAM/abuse scanning is added. Test: is the scope (which circles), the human-review step, and the
  §2258A actual-knowledge/reporting posture explicitly designed? Fail → INSUFFICIENT EVIDENCE.
- **H-E3 — Child-safety controls live on the Public circle with a friction+consent gate.** Fires when
  identifiable minor media can reach Public. Test: friction gate + guardian consent + minimized
  metadata (no default geolocation)? Fail → NEEDS REDESIGN (cross-ref H-A3).

## Remaining unknowns
- HTN's intended CSAM/abuse-detection posture (none? hash-match? AI classifier? which circles?) and
  whether any account action can be automated without human review (the catastrophe vector).
- Whether HTN has a children's risk assessment (UK OSA) and AADC-style high-privacy defaults / data
  minimization / geolocation-off-by-default for child media.
- HTN's operating jurisdictions — which determine which of §2258A / EU CSA-R / UK OSA / COPPA / GDPR
  actually bind, and the Arabic-market regime (not covered by this US/EU/UK pass).
- **Currency caveat:** the EU CSA Regulation + ePrivacy-derogation status is changing month-to-month
  (negotiations broke down 26 Mar 2026; derogation expiry ~3 Apr 2026) — re-verify before any verdict
  that leans on the EU position.
