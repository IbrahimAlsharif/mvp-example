# References — competitors/

Competitor and comparable platform profiles. One file per platform. Ziad uses
these to benchmark product features against what mature platforms already do.

## What belongs here

- Platform profiles: what the platform does, its core analyst workflow pattern,
  its key differentiator, and its known gaps
- An `index.md` summarizing all platforms and when to load which

## File naming

`<platform-slug>.md` — e.g., `palantir-gotham.md`, `meltwater.md`

## These files go stale quickly

Competitor products ship updates frequently. A `review_after` of 2–7 days is
appropriate. Use `/ziad-refresh` to keep these current.

## What to capture per platform

For each competitor profile, capture:
- What the platform does (the analyst workflow it enables)
- The core design pattern behind it (not the feature surface)
- What it does well that Ziad should benchmark against
- Known gaps or limitations
- Primary source for updates (vendor blog, changelog, press coverage)

## index.md

Maintain an `index.md` that lists all platforms with a one-line summary and
notes when each is most relevant to load for a review.
