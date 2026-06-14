---
id: k-inbox-bulk-import-consent-atomicity
date: 2026-06-14
type: inbox
scope: Review lesson — any item-creating path (capture, bulk import, restore) must honor the US-4.1 consent-atomicity contract or it silently, un-backfillably forecloses the legacy promise (G5)
source: /ziad-review of US-1.3 (dated bulk import) against US-4.1 + US-1.4 + media-durability.md
confidence: high
validation: provisional
status: active
supersedes: []
related: [k-synthesis-review-heuristics, k-ref-media-durability, k-ref-privacy-circles-consent]
review_after: 2026-07-14
---

# Lesson: consent atomicity is a property of EVERY create path, not just the compose flow

## What fired
US-4.1 AC-1 mandates legacy consent be written **atomically with the circle** in the
same transaction — "no item may exist with a circle but no consent record." US-1.3
(bulk import) creates items with a Me-Only circle at the highest volume in the product
but never mentions the consent record. As written the two stories contradict: bulk
import would mass-produce circle-but-no-consent items — the exact "Legacy foreclosure"
defect US-4.1 says must be impossible by construction, and un-backfillable per G5.

## Candidate heuristic (promote to synthesis if it fires 3+ times)
**H-D6 / H-G4 — Every item-CREATE path inherits the consent-atomicity contract.**
- *Fires when:* reviewing any flow that persists new timeline items (capture, bulk
  import, restore-from-export, migration).
- *Test:* Does the path write the US-4.1 consent record atomically with the circle,
  including for the per-item default seeded on import? Can any item land with a circle
  but no consent value?
- *Fail → NEEDS REDESIGN* (silent, un-backfillable legacy foreclosure; G5).

## Second pattern
Bulk import is also the worst case for the **format-foreclosure** half of durability:
iPhone-native HEIC / Live-Photo bundles / current video codecs are exactly the
at-risk formats (media-durability Refresh). A create path must not foreclose the
US-1.4 "original/standard, byte-intact" export promise by storing only a lossy or
proprietary derivative of the seeded bulk.

## Third pattern
Camera-roll **filenames are PII** ("Sara-birthday-Riyadh-2019.jpg" leaks child name +
place + date). Telemetry excludes them (good), but user-facing reconciliation/duplicate
UI that displays raw filenames is a data-minimization surface under AADC/PDPL/G6.
