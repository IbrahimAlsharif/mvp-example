# Knowledge Base

Ziad's accumulated knowledge for this project. All files are written and read
by Ziad during reviews, research sessions, and knowledge refreshes.

## Folder Structure

| Folder | Purpose |
|--------|---------|
| `domain/` | Cross-project domain lessons — not tied to any specific product |
| `inbox/` | Raw, unvalidated input — not yet confirmed or promoted |
| `project/` | Product-specific knowledge: personas, decisions, risks, workflows |
| `synthesis/` | Reusable review heuristics and conflict rulings |

## File Frontmatter

Every knowledge file should include:

```yaml
id: k-<folder>-<slug>
date: YYYY-MM-DD
type: domain | project | synthesis | inbox
scope: one-line description of what this file covers
source: how this was produced (e.g., /ziad-learn, /ziad-refresh, WebSearch)
confidence: high | medium | low
validation: validated | provisional | hypothesis
status: active | archived | superseded
supersedes: []
related: []
review_after: YYYY-MM-DD
```

## Confidence Levels

- `validated` — backed by primary source or cross-validated
- `provisional` — partially supported, needs confirmation
- `hypothesis` — Ziad synthesis or assumption

Do not issue a strong `APPROVED` verdict based mainly on `hypothesis` knowledge.
