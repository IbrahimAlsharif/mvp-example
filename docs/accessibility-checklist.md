# Accessibility Baseline Checklist (US-0.4)

WCAG 2.1 **Level AA** on the four core flows — capture (US-1.1/1.2), import
(US-1.3), browse/timeline (US-2.1), and voice playback. This is the reusable,
pass/fail-checkable checklist other core-flow stories cite to satisfy their DoD
line "Accessibility AA on this flow (US-0.4)" (AC8). **No item may be marked N/A
without a documented reason.**

## AT matrix (verification oracle)

A flow passes only when it completes end-to-end on:

- **VoiceOver + Safari** (iOS / macOS)
- **NVDA + Chrome/Firefox** (Windows)
- **TalkBack + Chrome** (Android mobile-browser)

…plus an automated **axe/Lighthouse** scan with **0 AA violations** at desktop
**and** phone-browser breakpoints, and a keyboard-only walkthrough with no traps.

## Per-flow checklist

| # | Item (maps to AC) | Pass bar |
|---|---|---|
| 1 | **Names/roles/states** (AC1) | Every control has a meaningful accessible name, role, and current state; flow completable with a screen reader, no sighted assistance. |
| 2 | **Keyboard + visible focus** (AC2) | Every action reachable/operable by keyboard in a logical order; focus indicator always visible; no keyboard traps (focus can always escape modals/pickers). |
| 3 | **Transcripts** (AC3) | Any voice note exposes a text transcript to the user and AT. Transcript is memory content — same circle as the note, never sent to analytics (G4). |
| 4 | **AA contrast** (AC4) | ≥ 4.5:1 normal text, ≥ 3:1 large text / essential non-text. |
| 5 | **Reflow 1.4.4 + 1.4.10** (AC4) | Text resizes to 200% and content reflows at 400% zoom / 320px-equivalent with no loss of content/function and no 2-D scroll in the primary reading direction. |
| 6 | **RTL + bidi + Arabic AT** (AC5) | Reading/focus order mirrored; bidi correct; screen reader announces Arabic accurately. Document any AT that can't announce a construct + provide a visible fallback (G6 honesty). |
| 7 | **Error association** (AC6) | Each error is programmatically associated with its field (`aria-describedby` / `aria-errormessage` + `aria-invalid`) and announced via a live region — never color/position alone. |
| 8 | **Media controls** (AC7) | Play/pause/scrub and granularity (year/month/day) controls are labeled and keyboard/SR-operable; time-based media offers pause/stop; no auto-play trap. |
| 9 | **Privacy-circle state** (AC9) | Current circle (Me Only / Family / Public) and any pending change exposed as accessible state and announced before commit; unambiguous Arabic label; never color/position-only. |
| 10 | **Accessible save/failure recovery** (AC10) | Durable-save success announced via live region only after the confirmed write; failure + retry/resume/cancel announced, keyboard/SR-operable, focus directed to the recovery control; never visual-only spinner/thumbnail. |

## Shared patterns (how to meet the items)

- **Live regions:** async errors render inside `role="alert"` (assertive) and
  status/success inside `role="status"` (polite). Use `<Field>`'s
  `aria-describedby`/`aria-errormessage` wiring rather than a detached message.
- **Error association:** set `aria-invalid` on the input and point
  `aria-errormessage` at the message node's id (see `(auth)/ui.tsx` `Field`).
- **Visible focus:** every interactive element keeps a `focus-visible` ring
  (buttons included — not only inputs).
- **Circle state:** `CircleSelector` options are radios with an accessible group
  label; the selected/pending circle is announced (`aria-checked` + a polite
  status line), not signaled by color/fill alone.
- **Success/failure announcement:** the create/import/upload result toggles a
  polite/assertive live region; focus moves to the retry control on failure.

## Adoption

A core-flow story marks its DoD "Accessibility AA on this flow (US-0.4)" PASS by
citing each row above as met (or documenting a reasoned N/A) and recording the
AT-matrix + axe-scan result. This checklist is the single source of truth so the
bar is not re-specified per story.
