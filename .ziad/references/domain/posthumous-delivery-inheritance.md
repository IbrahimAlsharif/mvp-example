---
id: k-ref-posthumous-delivery-inheritance
date: 2026-06-14
type: reference
scope: How digital-legacy platforms verify death, trigger future capsules, and hand memories to heirs at decades scale — death-verification models, the legal layer (RUFADAA / GDPR-deceased), and the decades vendor-survival crux — calibrated to Human Timeline Network's "Future Capsule fails to unlock / no inheritance handoff" risk
source: WebSearch + WebFetch (Google Inactive Account Manager support docs, Apple Legacy Contact security guide, SafeBeyond, My Heartspace, GoodTrust product pages, RUFADAA/Uniform Law Commission + estate-planning analysis, GDPR Recital 27 + CNIL), 2026-06-14
confidence: high
status: active
review_after: 2026-07-29
refresh_interval: 45
related: [k-project-product-profile, k-ref-competitor-index, k-ref-media-durability, k-ref-privacy-circles-consent]
---

# Posthumous Delivery & Inheritance — Domain Reference

Calibrated for **Human Timeline Network**. HTN's fourth core value — *Legacy across
generations (future capsules + inheritance)* — and one of its named catastrophic risks
("Future Capsule fails to unlock / no inheritance handoff") both live here. The competitor
index already concludes future capsules will **not differentiate** (GoodTrust / My Heartspace /
SafeBeyond do scheduled delivery well). This file goes one layer deeper: the part that
actually decides whether the legacy promise holds is **not** the compose UI — it is the
**death-verification trigger** and the **handoff mechanism**, which are where every platform's
risk concentrates and where HTN's profile is under-specified.

## 1. The three death-verification models — authority: official + analysis

Posthumous delivery only works if the system reliably knows the owner has died (or is
permanently gone) **without** false-firing while they live. There are three production patterns,
and the robust products combine them.

### Model A — Inactivity timer ("dead man's switch") — authority: official (Google)
- **Google Inactive Account Manager**: owner sets an inactivity window (**3–18 months**).
  Google warns the owner (email **+ SMS**) before the window closes; if still inactive it
  notifies up to **10 trusted contacts** and emails them a link to **download** a Takeout
  archive. Optional **SMS verification of the contact** prevents a hijacked email from claiming
  the data.
- **Critical property:** it grants a **download only** — never the password, never login. The
  heir gets a copy of data, not the account.
- **Strength:** requires **no human to act** and **no death certificate** — it still fires if the
  heir is unknown, unreachable, or unaware. This is the most **decades-robust** trigger because
  it has no human dependency.
- **Weakness:** **false-positive risk** — long hospitalisation, prison, dormancy, or a switched
  primary phone can trip it while the owner lives; and "queued but the recipient ignores the
  email" silently drops the handoff.

### Model B — Designated human verifier + death certificate — authority: official (Apple) + analysis
- **Apple Legacy Contact** (verified against Apple's security guide): the owner pre-designates a
  contact who is issued an **access key** (an AES key — the beneficiary keeps their half, Apple
  stores the encrypted packet; presented as an alphanumeric code + QR, printable for offline
  storage). To claim, the contact submits the **access key *and* a death certificate** at
  digital-legacy.apple.com; Apple verifies and issues a **special legacy account**. Access is
  **restricted** — explicitly **excludes iCloud Keychain** (passwords, payment info, passkeys),
  and excludes purchased media/subscriptions. Access is **time-limited (~3 years)**, then deleted.
- **My Heartspace "Guardian Angel"** and **SafeBeyond "trustee"**: a pre-chosen confidant triggers
  delivery, "backed by a death certificate"; content is **end-to-end encrypted and invisible to
  everyone until the release trigger is met.**
- **Strength:** precise, intentional, and secure (E2E + human attestation + official document).
- **Weakness:** depends on **one specific human** being alive, reachable, willing, and competent
  **decades** later; **lost access key = permanent lockout** (Apple cannot recover the
  beneficiary's AES half).

### Model C — Event / date / geo triggers (the future-capsule layer) — authority: analysis
- **SafeBeyond**: date-based (a future birthday/anniversary), **event-based** (graduation,
  wedding), and **geo-based** delivery. **My Heartspace**: unlock "on the first birthday after
  your passing," a partner's milestone, or annually on the date of death.
- **Key dependency:** an **event** trigger (a child's wedding) has **no knowable date in advance**,
  so it requires a **living trustee to signal the event occurred.** Date/death-anniversary triggers
  do not. This makes pure event-capsules **doubly human-dependent** (someone must both confirm
  death *and* report the event), compounding Model B's weakness.

## 2. The legal layer — what makes a handoff *enforceable* — authority: official
- **RUFADAA** (Revised Uniform Fiduciary Access to Digital Assets Act; Uniform Law Commission
  model law, adopted in **46 states + DC**) sets a **three-tier priority**:
  1. **The platform's own in-product "online tool"** (e.g., Google IAM, Apple Legacy Contact)
     — **overrides the will *and* the Terms of Service.**
  2. Estate documents (will, trust, power of attorney) — only if no online tool exists.
  3. The provider's Terms of Service — only if neither above exists.
- **Load-bearing implication:** a proper **in-product legacy-designation tool is legally
  privileged above the user's own will.** Building one is not a feature nicety — it is the only
  mechanism that gives the heir a legally clean path, and it pre-empts messy probate disputes.
- **Content consent caveat:** RUFADAA only releases the **content** of communications (messages,
  media captions, DMs) to a fiduciary if the decedent **explicitly consented.** For a product
  that *is* private family media, that explicit consent must be **captured in-product**, per item
  or per circle — silence defaults to *no content access.*
- **GDPR Recital 27:** the GDPR **does not apply to deceased persons** — but ~12 member states
  (Bulgaria, Czechia, Denmark, Estonia, France, Italy, Latvia, Lithuania, Portugal, Slovakia,
  Slovenia, Spain) legislate **post-mortem** data rules, and some (e.g., Bulgaria) **extend access
  rights to heirs.** So inheritance legality is **jurisdiction-dependent**, not a single global rule.

## 3. The decades-scale crux nobody solves — authority: synthesis (analyst-flagged)
The hardest problem is not the trigger — it is that **the capsule must outlive the company.**
None of the surveyed vendors publish a credible answer to:
- **Vendor survival & perpetual funding** — a one-time or short-subscription payment cannot fund
  storage + key custody for the *decades* the promise spans. If HTN fails, the capsules die with it.
- **Key custody over decades** — Model B's whole security rests on a printed access key surviving
  20–50 years and the heir still possessing it; Model A rests on contact phone numbers/emails
  still being valid.
- **The in-app-only trap** — a capsule that only unlocks *inside the app* cannot be exported by a
  dead user, so the durability/export guard in [media-durability](media-durability.md) does **not**
  cover it. Decades-safe legacy needs an **escrow / off-platform release path** independent of the
  company's survival.
*(This section is Ziad synthesis grounded in the funding-model gap the sources left unanswered, not
a documented vendor standard — treat as analyst risk, not verified benchmark.)*

## Domain lessons (apply to future reviews)
1. **Review the trigger and the handoff, not the compose UI.** A beautiful future-capsule composer
   over an unreliable death-verification trigger is decoration (Core Principle 10). The verdict
   rests on: *how does it know the owner died, and what does the heir actually receive?*
2. **No single death-trigger is decades-safe.** Inactivity timers false-fire; human verifiers die,
   vanish, or lose the key. The robust pattern is a **hybrid**: an inactivity floor (no-human-needed
   baseline) **plus** a designated verifier + death-certificate path (precision). Require both.
3. **Legacy designation must be an in-product online tool (RUFADAA Tier 1) with explicit per-item
   content consent** — or the handoff is not legally enforceable above the will, and content can't
   lawfully pass to the heir.
4. **"Handoff" means a download/export the heir keeps — not account login.** Both Google and Apple
   deliberately give heirs a *copy*, never the credentials. Mirror this: deliver data, not the account.
5. **Decades durability of a capsule ≠ media durability.** An in-app-only capsule is not covered by
   the export/open-format guard; it needs its own off-platform/escrow release path that survives the
   vendor failing. Absent that, "legacy across generations" is an unbacked promise.

## Suggested review heuristics (promote to synthesis/review-heuristics.md if they fire 3+ times)
- **H-D1 — Hybrid trigger or it's not decades-safe.** Fires on any posthumous/future-capsule/
  inheritance feature. Test: is there both an inactivity floor *and* a human-verifier+death-cert
  path? Fail → NEEDS REDESIGN.
- **H-D2 — Legacy designation must be a RUFADAA Tier-1 online tool with explicit content consent.**
  Fires when a feature designates heirs or grants post-mortem access. Test: in-product tool +
  per-item/per-circle content consent captured? Fail → NEEDS REDESIGN or INSUFFICIENT EVIDENCE.
- **H-D3 — The capsule must survive the heir being unreachable AND the vendor failing.** Fires on
  any "for decades / across generations" claim. Test: off-platform/escrow release path independent
  of company survival? Fail → DEPRIORITIZE/NEEDS REDESIGN by how central the legacy promise is.

## Remaining unknowns
- HTN's actual death-verification design (inactivity? verifier? both? none yet specified).
- Whether HTN captures explicit, per-item content consent for posthumous release (RUFADAA gate).
- Whether HTN delivers heirs a **download/export** or attempts account handoff.
- HTN's perpetual-funding / key-custody / escrow answer for the decades promise (the unsolved crux).
- ~~No specific named digital-legacy platform shutdown-with-data-loss case was confirmed in this pass;
  the vendor-survival risk is structural/analytic, not yet evidenced by a documented incident.~~
  **RESOLVED 2026-06-14 → see Refresh below** (SafeBeyond defunct; Legacy Locker "went dark").

## Refresh 2026-06-14

New evidence on named-vendor posthumous delivery and — decisively — the **vendor-survival** crux. This pass **closes** the prior open item that "no specific digital-legacy shutdown-with-data-loss case was confirmed."

### Resolved: the category's failure mode is now evidenced, not just analytic
- **SafeBeyond is DEFUNCT.** The flagship posthumous-messaging vendor this file previously treated as *live* (E2E "trustee" model, date/event/geo triggers, **25-year** delivery promise) **ceased operations ~July 2022**; safebeyond.com and /plans are **unreachable in June 2026** (connection refused / fetch error, independently reproduced) — *authority: synthesis (live fetch) + analysis (Dealroom/Crunchbase status)*. Funded (~$1.1M), Munich Re distribution partnership, founder-motivated by a dying spouse — **gone in ~8 years**. A family that entrusted a child's messages had its delivery promise **silently broken**. Fate of stored user data: no official notice loadable.
- **Legacy Locker "went dark."** Acquired by PasswordBox (Nov 2013), customers migrated over ~60 days, then the service went dark — *authority: analysis (The Digital Beyond / TechCrunch / PRNewswire)*. The Digital Beyond's "RIP Digital Legacy Startups" registry tracks **~26 defunct** companies. (Ironically, thedigitalbeyond.com itself returned connection-refused on direct fetch — the canonical registry of dead services is itself decaying; re-check via Wayback.)
- **Lesson:** the dominant failure mode is **vendor disappearance, not breach.** Section 3's "capsule must outlive the company" is no longer a hypothetical — it is the observed category norm. This **strengthens H-D3** (off-platform/escrow release independent of vendor survival).

### New competitor mechanics
- **GoodTrust (live 2026)** — automated **dead-man's-switch**: owner picks a check-in cadence (**1-4 times per month or year**); **3 consecutive missed** check-in replies fires it, sending Future Messages (text/photo/video, email or posted to social) **and** unlocking assigned-contact management of Sites & Socials, Documents, Devices, Will & Directives — *authority: official (GoodTrust Support + future-message page)*. **Inactivity proxy, not verified death** (no death certificate / third-party confirmation) → Model A false-positive risk, and delivery depends on recipient email staying valid for decades. Founded **2020 by Rikard Steiber** (ex-Google), VC seed-funded (not acquired), **~$7.5M-$8.4M** total (prior "~$13M" upper bound is unsupported — drop it), **NerdWallet #1** estate-planning **2024 & 2025 only** (no 2026 rating). *AES-256-at-rest claim asserted previously but NOT re-verified this pass — confirm before relying.*
- **Evaheld (live 2026; new to this file)** — Sydney; co-founder/CEO Michelle Gomes; ABN 80 656 838 505. **Human-coordinator trigger** (Model B variant): nominate **one trusted coordinator** who knows messages exist, where stored, and which conditions trigger delivery — *authority: analysis (Evaheld blog)*. Bundles **advance-care-planning** (Advance Care Directives, Enduring Guardian, QR emergency-access card); posthumous/auto future-messaging **gated to paid Full Access tier** — *authority: official (evaheld.com/plans)*. **Discloses NO encryption standard anywhere** (no AES-256 / E2E) — a real gap vs GoodTrust for intimate child media. How Evaheld *itself* verifies death and releases content is **undocumented** — the "coordinator notifies Evaheld to release" step is *authority: synthesis*, not a stated mechanism.

### Family expectation (single-source caveat)
- Families want **both** emotional presence ("a sense of the person behind the paperwork" — specific memories, not generic farewells) **and** practical continuity (funeral wishes, documents, credentials, contacts), **kept separate** — *authority: analysis (vendor-authored, single source: Evaheld blog; conflict of interest — corroborate with independent grief/estate research before treating as established)*. Implication for HTN's Future Capsule: **two distinct expectation tracks** (intimate memory vs practical handoff) that should not be collapsed.

### Excluded (refuted this pass)
- The prior "double-edged grief / 'inestimable comfort' / algorithmic anniversary-resurfacing" claim is **refuted as-sourced** — the cited IE School article supports only a general "digital afterlife can impede grief (painkiller)" point; the differential-impact and resurfacing framing is **not in the source**. Re-source from Facebook-memorialization (Brubaker et al.) + continuing-bonds literature before reusing.
