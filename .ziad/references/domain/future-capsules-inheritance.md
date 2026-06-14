---
id: k-ref-future-capsules-inheritance
date: 2026-06-14
type: reference
scope: How memory/legacy products and platforms implement future capsules (scheduled/posthumous delivery) and digital inheritance (death verification, account handoff), benchmarked for Human Timeline Network's legacy promise
source: WebFetch + WebSearch (My Heartspace features, Apple Legacy Contact, Google Inactive Account Manager, Everplans/Nolo digital-legacy guides), 2026-06-14
confidence: high
status: active
review_after: 2026-07-14
refresh_interval: 30
related: [k-project-product-profile, k-ref-competitor-index, k-ref-privacy-circles-consent, k-ref-media-durability]
---

# Future Capsules & Digital Inheritance — Domain Reference

Calibrated for **Human Timeline Network**. This is HTN's *legacy* core value and its
emotional differentiator, but the canvas correctly rates the feature 🟠 Moderate — and
competitor research shows scheduled/posthumous delivery is **table stakes, not a wedge**.
Two named catastrophic risks live here: **capsule fails to unlock** (breaks the central
legacy promise) and **no inheritance handoff** (account can't pass to family on death).

## 1. Scheduled (alive) capsules — the easy, table-stakes half — authority: analysis
- Standard model (My Heartspace, GoodTrust, capsule apps): schedule content to a **date**,
  a **time-interval after passing**, or a **life milestone** (18th birthday, wedding, birth).
  My Heartspace schedules up to ~18 years ahead.
- This is mechanically simple (a durable scheduled job + the media). HTN's differentiation
  is NOT here — it's already commoditized. Don't over-invest engineering or marketing in it.

## 2. Posthumous release — the hard half is the DEATH TRIGGER — authority: official + analysis
The genuinely hard problem is **proving the owner died before releasing content** — too
loose and content leaks while they're alive; too strict and the legacy promise silently fails.
Two industry-standard mechanisms, and HTN should pick deliberately:

- **Inactivity timer (Google Inactive Account Manager model):** owner sets an inactivity
  period (3/6/12/18 months); after silence + un-answered check-ins, named trusted contacts
  are notified/granted access or the account is deleted. *Pros:* fully automated, no
  paperwork. *Cons:* slow (months of lag), and false-positive risk (a long hospital stay).
- **Verified-death + access key (Apple Legacy Contact model):** owner pre-designates legacy
  contact(s) and shares an access key; the contact later presents the **key + a death
  certificate** to unlock. *Pros:* high-assurance, hard to abuse. *Cons:* requires paperwork
  and a real verification step; not instant.
- **Competitor blends both:** My Heartspace activates on "a trusted contact OR verified
  death record." This hybrid (fast trusted-contact path + authoritative death-record path)
  is the defensible pattern.

## 3. The account-handoff philosophy — a real fork HTN must choose — authority: analysis
There are two opposite, both-valid models — and HTN must decide which it is, because they
imply different products:
- **Messages-out, account-closed (My Heartspace):** on verified death, scheduled messages
  send, then the account is **permanently closed** — no one logs in, ever. Maximizes the
  deceased's privacy.
- **Account-inherited (Apple/Google):** a legacy contact **gains managed access** to the
  data (Apple deletes 3 years after handoff). Maximizes family continuity.
- **For HTN this is decisive:** the product is a *family timeline* meant to **compound across
  generations** — so the messages-out-then-close model would contradict the core promise. HTN
  almost certainly needs the **account-inherited** model (family continues the timeline), which
  raises the bar on identity verification and on the privacy-circle model surviving a handoff.

## 4. Delivery guarantee — the unlock must be provable — authority: analysis
- Competitors claim "systems to track and manage future deliveries" but publish **no failsafe**
  for a missed date. For a product whose whole promise is "a capsule arrives on the right day
  (e.g., after a death)," a silent miss is catastrophic and unrecoverable.
- HTN needs more than a best-effort scheduler: durable scheduling, monitoring/alerting on the
  delivery job, and the QC scenario's explicit test — *unlocks within the allowed window on the
  date, and never a moment before* (verify via clock change). Treat capsule delivery as a
  reliability-critical subsystem, not a feature.

## Domain lessons (apply to future reviews → added as H-D heuristics)
1. **Scheduled capsules are table stakes — don't over-invest.** The differentiation budget
   belongs in trust, habit, and durability, not in matching commodity capsule features.
2. **The death trigger is the real design decision.** Pick inactivity-timer vs verified-death
   vs hybrid deliberately, and state the failure mode of the choice. Hybrid (Apple+Google blend)
   is the defensible default.
3. **HTN needs the account-INHERITED model, not messages-out-then-close** — because the product
   compounds across generations. This must be an explicit, stated product decision.
4. **Capsule delivery is reliability-critical** — unlock on the right date, never early; needs
   monitoring + a failsafe, verified by clock-change test (QC J6).
5. **Inheritance must preserve the privacy-circle model** — handoff cannot silently widen who can
   see Me-Only/Family content (cross-ref privacy-circles-consent.md, H-A1/H-A2).

## Remaining unknowns
- Which death-trigger model HTN intends (inactivity / verified-death / hybrid) — likely undecided.
- Whether HTN has chosen account-inherited vs account-closed (a load-bearing, probably-unmade decision).
- Identity-verification strength for the inheriting party (legal-grade handoff is named in QC Future Improvements but not built).
- Whether capsule delivery has monitoring/failsafe, or is a naive scheduled job.
