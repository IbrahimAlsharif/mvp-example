# Life Playback (US-2.3)

Life Playback is the signature "magic moment" — replay a span of life as a
continuous, auto-sequenced story ("one year in N seconds"), pause, scrub, and
share. Its value is fragile in two ways: stalls (Tech) and — most critically — if
playback ever surfaces a memory outside the viewer's circle, the showcase moment
becomes a privacy breach. **Privacy correctness here is non-negotiable.**

## Server-side, per-viewer circle filtering (AC-5/AC-9 — CRITICAL)

The sequence is assembled **server-side** from only the events the current viewer
is permitted to see — never client-side hiding. `buildPlaybackSequence`
(`src/lib/playback/sequence.ts`) reuses `listVisibleEvents`, which already
enforces circles + the live roster, so:

- a Me-Only / out-of-circle event **never** appears in any other viewer's
  sequence (verified with a second account, even an accepted FAMILY member);
- a downgrade / roster removal / deletion is reflected on the **next** build
  (the sequence is re-resolved every request, no stale inclusion) —
  `eventStillVisible` provides the live re-check for a running/shared playback.

## Sequence assembly (AC-2/AC-7)

`assembleSequence` filters to the span window, orders frames **chronologically**
(no out-of-order frames), and handles media-less/undated events gracefully — a
frame may be note-only rather than a stall, and the sequence never inserts a
duplicate or an out-of-circle filler to fill a gap.

## Player

`/playback` (`PlaybackPlayer`) chooses a span (year / decade / whole life),
fetches `GET /api/playback?span=`, and auto-advances frames with **pause** and a
**scrub** range control. RTL controls; empty and error states. The client only
renders what the server already filtered — it makes no privacy decision.

## Non-destructive (G2/AC-11)

Playback reads source events only — it never mutates, deletes, or locks the
underlying media. Shared-playback links reuse the US-3.3 unlisted-link infra
(non-guessable, auth/expiry-protected, revocable), so a shared playback honors
revocation and per-viewer circles the same way media URLs do.

## Telemetry (content-blind, G4)

`playback_started` (mode = span enum). No content.

## Key files
- `src/lib/playback/sequence.ts` — span window, sequence assembly, per-viewer build, live visibility re-check.
- `src/app/api/playback/route.ts` — per-viewer sequence endpoint.
- `src/app/(app)/playback/PlaybackPlayer.tsx` — span chooser + player (pause/scrub).
