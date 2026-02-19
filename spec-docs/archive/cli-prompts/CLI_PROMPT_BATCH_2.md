# CLI Prompt — Exhaustive Spec Audit: Batch 2

Paste the following into Claude CLI:

---

```
Resume the exhaustive-spec-auditor. Pick up from the next NOT STARTED batch.

CONTEXT FOR THIS BATCH: Batch 2 is GameTracker Core Rules — the HEAVIEST batch. useGameState.ts is 2,968 lines and 3 of 5 specs reference it. Follow these rules strictly:

1. Read the skill file (.claude/skills/exhaustive-spec-auditor/SKILL.md) FIRST.
2. Process ONE spec at a time. Do NOT read all of useGameState.ts at once — read only the sections relevant to the current spec.
3. For MASTER_BASEBALL_RULES_AND_LOGIC.md: this is the biggest spec. Read sections incrementally. Compare rules one at a time against the matching useGameState.ts functions. If context runs low, STOP and save — do NOT rush.
4. For PITCH_COUNT and PITCHER_STATS: these both reference useGameState.ts but different functions. Only read the relevant functions, not the whole file.
5. After EACH spec, immediately write findings to EXHAUSTIVE_AUDIT_FINDINGS.md and update EXHAUSTIVE_AUDIT_PROGRESS.md.
6. If you find contradictions with any Batch 1 WAR specs, STOP and ask me.
7. Batch 1 found 0 CRITICAL issues. If you find CRITICAL issues in Batch 2 (wrong baseball rules, data corruption risk), flag them prominently.

Batch 2 specs (GameTracker Core Rules):
1. MASTER_BASEBALL_RULES_AND_LOGIC.md → useGameState.ts
2. RUNNER_ADVANCEMENT_RULES.md → runnerDefaults.ts
3. INHERITED_RUNNERS_SPEC.md → inheritedRunnerTracker.ts
4. PITCH_COUNT_TRACKING_SPEC.md → useGameState.ts (pitch count functions only)
5. PITCHER_STATS_TRACKING_SPEC.md → useGameState.ts (pitcher stats functions only)

Start now.
```
