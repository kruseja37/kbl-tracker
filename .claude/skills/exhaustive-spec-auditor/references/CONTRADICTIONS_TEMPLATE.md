# Spec Contradictions Register

> **Created**: [DATE]
> **Last Updated**: [DATE]
> **Status**: IN PROGRESS (updated during Phase 1 when contradictions found)

## Summary

| Metric | Count |
|--------|-------|
| Total Contradictions Found | 0 |
| Hard Contradictions (A says X, B says NOT X) | 0 |
| Soft Contradictions (A implies incompatible with B) | 0 |
| Temporal Conflicts (newer spec didn't explicitly supersede) | 0 |
| Duplicate Definitions (same thing, different values) | 0 |
| Resolved | 0 |
| Pending User Decision | 0 |

## Contradiction Types

- **HARD**: Spec A says X, Spec B says NOT X. Mutually exclusive — one must be wrong.
- **SOFT**: Spec A implies something incompatible with Spec B, but neither explicitly contradicts.
- **TEMPORAL**: Older spec says X, newer spec says Y, but newer spec doesn't say "this supersedes X."
- **DUPLICATE**: Same concept defined in two specs with different values/rules.

## Unresolved Contradictions (Awaiting User Decision)

| ID | Type | Spec A | Spec A Says | Spec B | Spec B Says | Discovered In Batch | User Decision | Decision Date |
|----|------|--------|-------------|--------|-------------|---------------------|---------------|---------------|

## Resolved Contradictions

| ID | Type | Spec A | Spec A Says | Spec B | Spec B Says | Discovered In Batch | User Decision | Decision Date | Applied To |
|----|------|--------|-------------|--------|-------------|---------------------|---------------|---------------|------------|

---

## Resolution Protocol

When a contradiction is found:
1. **STOP** — do not continue auditing
2. Present both sides with exact quotes and file:line references
3. Ask user: "Which spec governs?" or "What's the correct value?"
4. Record decision in `spec-docs/DECISIONS_LOG.md` with date + rationale
5. Record in this file (move from Unresolved to Resolved)
6. Update the LOSING spec to match the WINNING spec (or mark as superseded)
7. Continue auditing
