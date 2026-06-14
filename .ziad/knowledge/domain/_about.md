# Knowledge — domain/

Cross-project domain lessons. These files are not tied to any specific product
or client. They capture how the domain operates — workflows, concepts, failure
modes — that would apply to any platform serving this domain.

## What belongs here

- Domain workflow patterns (how analysts actually work)
- Lessons learned from reviewing features in this domain
- Concepts that are domain-true regardless of which product implements them
- Benchmarks against how mature platforms handle the same domain problems

## What does NOT belong here

- Product-specific decisions or personas → use `project/`
- Unconfirmed observations → use `inbox/`
- Reusable review heuristics → use `synthesis/`

## File naming

`<domain-topic-slug>.md` — e.g., `source-evaluation-patterns.md`,
`analyst-workflow-anchors.md`

## When to write here

After any review where a domain insight is confirmed by evidence and would
apply beyond the current product. Ask: "Would this be true for any platform
in this domain, not just ours?"
