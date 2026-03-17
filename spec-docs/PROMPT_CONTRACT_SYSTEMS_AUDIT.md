# PROMPT CONTRACT: GameTracker Advanced Systems Audit
# ROUTE: Claude Code CLI | Opus 4.6
# Branch: audit/gametracker-systems
# Skill: .claude/skills/gametracker-systems-audit/SKILL.md

---

## INSTRUCTIONS

1. Read `.claude/skills/gametracker-systems-audit/SKILL.md` in full FIRST. It defines 12 failure modes, checkpoint definitions, search terms, dependency chains, and evidence requirements.
2. Execute Step 0 (Pre-Audit scope check + file sizing) BEFORE any system audit.
3. Execute Steps 1-9 from the skill.
4. Produce `spec-docs/GAMETRACKER_SYSTEMS_TRUTH_MAP.md`.

## SESSION SCOPING

This audit is too large for one session. Split into:

**Session 1:** Step 0 (pre-audit) + Systems 1-4 (LI, WPA, Clutch, Fame) + processCompletedGame.ts full read
**Session 2:** Systems 5-8 (Milestones, WAR, Mojo, Fitness)
**Session 3:** Systems 9-12 (Narrative, Fan Morale, Designations, Post-Game Pipeline) + NewsBoard.tsx full read
**Session 4:** Dependency map + NewsBoard gap report + final summary

Write intermediate results to `spec-docs/GAMETRACKER_SYSTEMS_TRUTH_MAP.md` after EACH session. Begin each session by reading what was written in prior sessions.

If you finish early, continue into the next session. If context runs low, STOP AND WRITE what you have. Do not rush the last systems.

## EVIDENCE STANDARD

Every checkpoint entry MUST follow this format:

```
**C[N]:** [✅/❌/⚠️] [STATUS LABEL]
  - Grep: `grep -n "TERM" src/path/to/file.ts | head -N`
  - Result: [exact output, or "0 matches"]
  - File:line:content: `path:NNN` — `[exact code at that line]`
  - Context: [trigger: PER-PLAY / END-GAME ONLY / MANUAL ONLY / EFFECT-DRIVEN / NEVER]
  - Risk: [none / TRY-CATCH WRAPPED / SILENT FAILURE POSSIBLE]
```

A ✅ without this format will be treated as a hallucination and rejected by JK.
An ❌ with the grep command showing 0 matches is VALUABLE — it proves the absence.

## MANDATORY FULL READS

1. **processCompletedGame.ts** — read in Session 1. Document every field in the persisted state. This is referenced by all subsequent sessions for C3 checks.
2. **NewsBoard.tsx** — read in Session 3. Document every prop and every render.

Before reading, check size:
```bash
wc -l src/utils/processCompletedGame.ts
wc -l src/src_figma/app/components/NewsBoard.tsx
```
If >500 lines, use grep + targeted 50-line ranges instead.

## V1 SCOPE GATE

Before auditing ANY system, check scope:
```bash
grep -i "SYSTEM_NAME" spec-docs/MODE_2_V1_FINAL.md | head -3
grep -i "SYSTEM_NAME" spec-docs/V2_DEFERRED_BACKLOG.md | head -3
```
If the system is in V2_DEFERRED_BACKLOG, mark "V2 DEFERRED — SKIPPED" and move on. Record which systems were skipped and why in the truth map header.

If MODE_2_V1_FINAL.md doesn't exist, fall back to MODE_2_FRANCHISE_SEASON_UPDATED.md and note this in the truth map header.

## KEY FILES
```
GameTracker:        src/src_figma/app/pages/GameTracker.tsx (7000+ lines — GREP ONLY)
useGameState:       src/src_figma/hooks/useGameState.ts (7000+ lines — GREP ONLY)
NewsBoard:          src/src_figma/app/components/NewsBoard.tsx (FULL READ in Session 3)
processCompleted:   src/utils/processCompletedGame.ts (FULL READ in Session 1)
eventLog:           src/utils/eventLog.ts (grep for AtBatEvent interface)
seasonAggregator:   src/utils/seasonAggregator.ts (grep for aggregated fields)
PostGameSummary:    src/src_figma/app/pages/PostGameSummary.tsx (grep for system data)
Engines:            src/engines/ (leverageCalculator, mojoEngine, fitnessEngine)
Hooks:              src/src_figma/hooks/ + src/src_figma/app/hooks/
fenwayBoardContext: src/src_figma/app/utils/fenwayBoardContext.ts (matchup + milestone data)
```

## DO NOT
- Fix anything — audit only, report only
- Read 7000-line files in full — grep + targeted ranges
- Mark ✅ without the mandatory evidence format
- Assume "imported" means "working" or "called" means "executes"
- Skip the v1 scope check for any system
- Skip the dependency map (Step 8) — upstream failures cascade
- Rush through the last systems if context is running low — STOP and write intermediate output
- Produce the truth map without reading processCompletedGame.ts and NewsBoard.tsx
- Hallucinate line numbers or file paths — if grep returns nothing, say so