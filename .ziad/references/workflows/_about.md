# References — workflows/

Domain workflow documentation. These files describe how analysts perform
specific operational tasks — not the product's implementation, but the real
analyst practice that the product should serve.

## What belongs here

- Step-by-step analyst workflows (e.g., crisis monitoring, entity investigation)
- Briefing production process
- Decision flows: what triggers an analyst to do X, what the output looks like,
  what success looks like
- Workflow variations across analyst roles or urgency levels

## Relationship to domain/ files

If a workflow needs client-specific calibration (different urgency thresholds,
different output format, different source priorities), create a calibrated
version in `references/domain/` and note the general file it supersedes.

## File naming

`<workflow-name>.md` — e.g., `crisis-monitoring.md`,
`entity-investigation.md`, `briefing-production.md`

## These files change at medium speed

Analyst workflows evolve slower than competitor products but faster than
analytic methods. A `review_after` of 7–30 days is appropriate.
