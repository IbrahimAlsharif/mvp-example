# References

External benchmarks, analytic methods, and competitor profiles. References
are read-heavy — Ziad loads them to calibrate reviews but updates them only
when primary sources confirm a change.

## Folder Structure

| Folder | Purpose |
|--------|---------|
| `domain/` | Domain-calibrated references — tuned for this project's client context |
| `analytic-methods/` | Generic analytic tradecraft and methodologies |
| `competitors/` | Competitor and comparable platform profiles |
| `workflows/` | Domain workflow documentation |

## Deduplication Rule

Prefer `domain/` over the matching general file when both exist. The domain
version is calibrated to the specific client context and is more operationally
precise. Fall back to the general version only when the domain file does not
exist.

## Currency

References have `review_after` dates. Competitor files go stale faster (days)
than analytic method files (weeks/months). Use `/ziad-refresh` to audit and
update stale references.

## File frontmatter

```yaml
id: k-ref-<slug>
date: YYYY-MM-DD
type: reference
scope: one-line description
source: primary source URL or research method
confidence: high | medium | low
status: active | archived
review_after: YYYY-MM-DD
```
