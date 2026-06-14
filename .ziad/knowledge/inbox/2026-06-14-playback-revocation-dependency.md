---
id: k-inbox-playback-revocation-dependency
date: 2026-06-14
type: inbox
scope: Review lesson from US-2.3 Life Playback — shared resurfacing/playback artifacts are durable bearer objects and must inherit circle-change revocation (US-3.2), not just per-view filtering
source: /ziad-review of US-2.3-life-playback.md
confidence: medium
validation: provisional
status: active
supersedes: []
related: [k-synthesis-review-heuristics, k-ref-privacy-circles-consent]
review_after: 2026-08-14
---

# Lesson — shared playback/resurfacing artifacts are bearer objects, not transient views

When reviewing any feature that produces a SHARED, persistent showcase artifact
(Life Playback share, future "On This Day" share, a generated montage link),
two privacy obligations are distinct and both must be explicit:

1. **Per-viewer filtering on each view** (build the sequence from the viewer's
   permitted events) — US-2.3 handles this well.
2. **Revocation of the shared artifact itself** when the owner later downgrades
   an event's circle (US-3.2) OR wants to kill the whole share link. A shared
   playback link is a durable bearer artifact; if it cannot be revoked/expired,
   the product over-promises control (violates H-A2 "promise only enforceable
   revocation").

Review test for resurfacing/playback share features: does the story declare a
dependency on the circle-change-propagation story (US-3.2), and does it state
that a downgrade after share, or an owner "revoke this playback" action,
invalidates subsequent views? If only per-view filtering is specified, flag the
stale-grant leak vector.

Promote to synthesis (H-A2 extension or a new H-A5) if this pattern recurs in
the capsule (US-4.2) or family-invitation (US-3.5) reviews.
