# Knowledge — project/

Product-specific knowledge. These files are calibrated to the specific product
and client defined in `.ziad/domain.yaml`. They are more operationally specific
than domain files and should be updated as the product evolves.

## What belongs here

- Product profile: what the product does, its architecture, its current state
- Analyst personas: who uses the product, their workflows, their pain points
- Product decisions: what was decided and why (decision log)
- Known domain risks: failure modes specific to this product's design
- Source taxonomy: how sources are tiered for this client's context
- Briefing standards: what a good briefing looks like for this client
- Core workflows: how analysts use the product end-to-end

## Recommended files to create

| File | What it covers |
|------|---------------|
| `product-profile.md` | What the product does, its stage, key capabilities |
| `personas.md` | Analyst roles, goals, workflows, pain points |
| `decision-log.md` | Product decisions with rationale |
| `known-domain-risks.md` | Recurring failure modes and domain mismatches |
| `source-taxonomy.md` | Source tiers calibrated to this client |
| `briefing-standard.md` | Briefing format and quality bar for this client |
| `core-workflows.md` | Primary analyst journeys through the product |

## Currency

Project files should have `review_after` dates. A product that ships fast can
make `personas.md` stale within weeks.
