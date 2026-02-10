# Phase B CLI Prompt — Per Sub-Tier

Copy this prompt into a fresh Claude Code CLI session for each sub-tier.
Replace `[X.X]` with the sub-tier number (e.g., `1.1`, `2.1`, `3.4`).

---

## Prompt to Paste

```
You are building Phase B features for KBL Tracker. This session builds ONE sub-tier.

## Your Sub-Tier: [X.X]

## Instructions

1. Read `.claude/skills/phase-b-builder/SKILL.md` — this is your build protocol.
2. Read `.claude/skills/phase-b-builder/references/AUTHORITY.md` — pre-resolved decisions, skip list, duplicate list.
3. Read `.claude/skills/phase-b-builder/references/tier-[X.X]-items.md` — these are YOUR items for this session. All item data is pre-extracted (Spec Says, Code Says, Recommended Fix, etc.).
4. Run pre-flight checks: `npx tsc --noEmit` and `npm test -- --reporter=verbose 2>&1 | tail -5`
5. If `spec-docs/PHASE_B_EXECUTION_REPORT.md` exists, read it to see what's already done.
6. Build each item in order using the 7-step Build Protocol from SKILL.md.
7. After all items: run full test suite, update PHASE_B_EXECUTION_REPORT.md.

## Critical Rules
- Do NOT read TRIAGE_DECISIONS.md (67K tokens — too large). Your item file has everything.
- Do NOT skip items unless they're in AUTHORITY.md's SKIP or DUPLICATE lists.
- Do NOT proceed past a failing `tsc` check.
- If context runs low: save progress to PHASE_B_EXECUTION_REPORT.md FIRST, then stop.
- After Tier 2.1: tell me to invoke gametracker-logic-tester before continuing.

Start now. Read the 3 files, run pre-flight, then build.
```

---

## Sub-Tier Execution Order

| Session | Sub-Tier | Items | Prompt Replace |
|---------|----------|-------|----------------|
| 1 | 1.1 Grade, Salary & Adaptive | 26 | `[X.X]` → `1.1` |
| 2 | 1.2 Franchise Infrastructure | 9 | `[X.X]` → `1.2` |
| 3 | 1.3 Stats, Milestones & Adaptive | 9 | `[X.X]` → `1.3` |
| 4 | 2.1 GameTracker & Field | 16 | `[X.X]` → `2.1` |
| 5 | 2.3 Fame, Milestones & Fan Systems | 9 | `[X.X]` → `2.3` |
| 6 | 3.1 Draft & Prospect Generation | 4 | `[X.X]` → `3.1` |
| 7 | 3.2 Offseason & Franchise Flows | 21 | `[X.X]` → `3.2` |
| 8 | 3.3 League Builder & Setup | 3 | `[X.X]` → `3.3` |
| 9 | 3.4 Playoffs & Season | 25 | `[X.X]` → `3.4` |
| 10 | 3.5 Narrative & Special Events | 7 | `[X.X]` → `3.5` |
| 11 | 4 Polish & Integration | 2 | `[X.X]` → `4` |

Skip Tier 2.2 (0 items).

## After ALL Sub-Tiers Complete

Run the post-Phase-B verification pipeline (5 skills in order):
1. `gametracker-logic-tester`
2. `dummy-data-scrubber`
3. `spec-ui-alignment`
4. `ui-flow-crawler`
5. `batch-fix-protocol` (for any issues found)

Then: auto-generate new spec docs from the codebase, user reviews for creep, archive 156 legacy spec files.
