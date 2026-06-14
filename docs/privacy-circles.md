# Privacy Circles & Enforcement (US-3.1)

Three circles decide who can see each memory; **enforcement is server-side on
every read** (guardrails G1 default-Me-Only, G3 no auto-detection, G6 Arabic/RTL).

## The circles
`PrivacyCircle` enum — exactly three, Me-Only first and pre-selected (G1):

| Circle | Who can see it |
|--------|----------------|
| `ME_ONLY` | only the owner (default) |
| `FAMILY` | the owner + Family roster members (roster owned by US-3.5) |
| `PUBLIC_UNLISTED` | only holders of a valid unlisted share link (US-3.3) — **no** browseable/indexed surface (G1) |

The circle is a **column on the Event row**, written atomically with the event
(US-1.1), so a persisted event always carries a defined circle.

## The chokepoint — `src/lib/authz/circle.ts`

Every read path (timeline, event API, media serve in US-3.3) decides visibility
through **`canViewEvent(viewer, event)`** — never via UI hiding (AC-6/AC-7). The
pure decision is `decideAccess(viewer, event, isFamilyMember)`:

```
deletedAt set        → false (soft-deleted invisible to all, G2)
viewer is owner      → true
ME_ONLY              → false
FAMILY               → isFamilyMember
PUBLIC_UNLISTED      → false   (direct read denied; reachable only via share link)
unknown circle       → false   (fail closed)
```

`getViewableEvent(viewer, eventId)` is the helper read routes use; it returns
`null` both when the event is missing and when access is denied (no existence
oracle). Family membership resolves through `isFamilyMember()`, currently a
stub returning false until US-3.5 ships the roster — the call site already
exists so US-3.5 drops in without touching any caller.

## Public child-media warning (AC-4, G3)

`PublicWarningDialog` blocks **every** transition to `PUBLIC_UNLISTED` on a
media-bearing event until the owner acknowledges. The trigger is **content-blind**
— fired by the Public action itself, never by any automated scan of the media
(G3). Declining leaves the circle unchanged. Shared by the create form (US-1.1)
and edit, via `CircleSelector`.

## Perceived trust (AC-5, G6)
`CircleSelector` renders each circle with an unambiguous Arabic label + helper
line answering "who can see this memory", RTL-correct — the *Circle comprehension*
gate (≥90% correct first-read, mis-set < 10%) is a perceived-trust requirement,
not cosmetic.
