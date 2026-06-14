# Knowledge — synthesis/

Reusable review heuristics and conflict rulings. These are the distilled
patterns Ziad applies across reviews — not facts about the domain, but
judgment rules derived from repeated experience.

## What belongs here

- Review heuristics: "When X is present in a feature, look for Y failure mode"
- Conflict rulings: how to resolve when two domain principles pull in opposite
  directions
- Recurring traps: patterns that look correct but fail in analyst practice
- Calibration notes: how to weight certain evidence types in this domain

## What does NOT belong here

- Raw domain facts → use `domain/`
- Product-specific decisions → use `project/`
- Unconfirmed observations → use `inbox/`

## File naming

`<heuristic-topic>.md` — e.g., `review-heuristics.md`,
`conflict-resolution.md`, `alert-calibration.md`

## When to write here

After a review where a pattern recurred for the third time, or where resolving
a conflict produced a durable rule. Synthesis files represent earned expertise,
not first-pass observations.
