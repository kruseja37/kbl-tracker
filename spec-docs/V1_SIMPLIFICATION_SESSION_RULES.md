# V1 SIMPLIFICATION — SESSION RULES

## Purpose
These rules govern the multi-session process of triaging KBL Tracker's four gospel specs into simplified v1 build documents. The output is four lean specs that drive code refactoring.

## The Problem
The current specs are comprehensive but contain significant v2 ambition mixed into v1 requirements. Building everything means building nothing well. We need a clear line so v1 ships complete and polished, and v2 features are preserved — not lost.

## The V1 Litmus Test
Every feature must pass ALL four to stay in v1:

1. **Does it serve the couch?** — A player on their couch playing SMB4 needs this during or immediately after their gaming session.
2. **Does it exist without AI simulation?** — V1 has no AI game engine. If a feature only matters when games are simulated, it's v2.
3. **Can we build it well?** — A half-built feature is worse than no feature. If it needs 6 interconnected systems to work, it might need to wait.
4. **Does it preserve character?** — KBL Tracker isn't a spreadsheet. Some features exist to make it feel alive. Those have value even if they're not "core."

## What V1 IS
- A game tracking companion (record at-bats, see stats, track standings)
- A franchise management tool (set up leagues, manage rosters, run offseasons)
- A baseball almanac (career stats, records, history)
- Solo and couch co-op focused

## What V1 IS NOT
- An AI simulation engine
- A multiplayer platform
- A full economics simulator (arbitration, revenue sharing, salary caps)
- A social/sharing platform

## Process Overview

**Phase A — Spec Triage:** Section-by-section interview with JK. Agent presents, JK rules. Four documents triaged in order: Mode 2 → Mode 1 → Mode 3 → Almanac. Governed by `spec-simplifier/SKILL.md`.

**Phase B — V1 Spec Assembly:** Produce four `_V1_FINAL.md` documents containing only v1 content, plus `V2_DEFERRED_BACKLOG.md` with everything cut.

**Phase C — Code Alignment:** Map v1 specs to code, quarantine v2 code, gap-analyze, build. Governed by `V1_CODE_ALIGNMENT_PLAN.md`.

## Working Documents

| Document | Purpose |
|---|---|
| `V1_SIMPLIFICATION_TRACKER.md` | Session-by-session progress log |
| `MODE_[N]_V1_DRAFT.md` | Accumulating rulings per document |
| `V2_DEFERRED_BACKLOG.md` | Everything deferred, organized by mode and section |

All working documents live in `spec-docs/v1-simplification/`.

## V2 Deferred Backlog Format

```markdown
### [Feature Name]
- **Source:** [Document] §[Section]
- **What it does:** [1-2 sentences]
- **Why deferred:** [JK's reasoning]
- **Dependencies for v2:** [What needs to exist first]
- **Preserves data from:** [If it reads data that v1 writes, note that]
```

## Success Criteria

Phase A complete when:
- [ ] All sections of all four documents triaged
- [ ] All rulings recorded in draft documents
- [ ] All cross-reference conflicts resolved
- [ ] JK has approved the final v1 scope

Phase B complete when:
- [ ] Four `_V1_FINAL.md` documents exist with only v1 content
- [ ] `V2_DEFERRED_BACKLOG.md` is complete
- [ ] Cross-reference reconciliation pass is clean

Phase C complete when:
- [ ] Every v1 section maps to code or has a build ticket
- [ ] V2 code is quarantined and cataloged
- [ ] Build plan exists for any v1 gaps
