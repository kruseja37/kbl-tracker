# PROMPT CONTRACT: R3 Remaining Bugs — Reproduce-Then-Fix
# ROUTE: Claude Code CLI | Opus 4.6
# Branch: fix/r3-repro-fix
# Skill: .claude/skills/gametracker-bug-repro/SKILL.md

---

## INSTRUCTIONS

1. Read `.claude/skills/gametracker-bug-repro/SKILL.md` in full FIRST. It defines the mandatory 8-step protocol you must follow for every bug below. Do not skip any step.
2. Then return here and fix the bugs in the order listed.
3. For each bug, execute Steps 0–8 from the skill. No exceptions.

---

## CRITICAL CONTEXT FROM PRIOR FIX ATTEMPTS

Prior Opus and Codex sessions added three functions to the `useGameState` hook API:
- `applyScoreAdjustment(inning, halfInning, delta)` — adjusts live score
- `applyBasesCorrection(bases)` — updates live base occupancy
- `applyOutsAdjustment(delta)` — updates live out count

These functions EXIST in useGameState.ts and are IMPORTED/DESTRUCTURED in GameTracker.tsx. However, `applyBasesCorrection` and `applyOutsAdjustment` have **zero call sites** — they are imported but never invoked. `applyScoreAdjustment` may have call sites but may be gated by conditions that skip execution.

**Your first action for Bug 1** should be to run the Step 2.5 wiring verification greps and confirm this. The grep results will tell you exactly what's wired and what isn't.

---

## BUGS TO FIX (in order)

### Bug 1: Runner "out" correction doesn't update score or outs

**What the user does:** Records a hit with a runner on base. Runner auto-scores. User taps the runner sub-entry in the play log, changes the runner's destination to "out" (or toggles "Out Advancing").

**What should happen:** ScoreBug score decrements by 1. ScoreBug outs increment by 1. If this creates the 3rd out, the half-inning should end.

**What actually happens:** Play log display updates (shows the runner as out). ScoreBug score and outs are unchanged. Additionally, if user records enough outcomes to create what would be a 4th out, the runner appears "back on third" instead of the inning ending — suggesting `gameState.bases` is also not being updated.

**State fields that must change:**
- `gameState.homeScore` or `gameState.awayScore` (decrement by 1)
- `gameState.outs` (increment by 1)
- `gameState.bases` (runner removed from base)

**Handler to investigate:** `handleRunnerEnrichmentUpdate` in GameTracker.tsx (search for it by name).

---

### Bug 2: Runner base destination change doesn't update live bases

**What the user does:** After a WP_K, runner auto-advances from 2B to 3B. User taps the runner sub-entry and changes destination back to 2B ("held").

**What should happen:** ScoreBug base diamonds show runner on 2B (not 3B). Next play uses corrected base state.

**What actually happens:** Play log shows the correction. ScoreBug still shows runner on 3B. Next play treats runner as on 3B.

**State fields that must change:**
- `gameState.bases` (3B = false, 2B = true)

**Handler to investigate:** Same `handleRunnerEnrichmentUpdate` — the `toBase` field change path.

---

### Bug 3: Toggle Out Advancing OFF doesn't restore the run

**What the user does:** Runner scores. User toggles "Out Advancing" ON (expects score to decrement). Then toggles it OFF (expects score to restore).

**What should happen:** ON → score -1. OFF → score +1. Bidirectional.

**What actually happens:** Score doesn't change in either direction (this is Bug 1 manifesting). If Bug 1 is fixed, verify this works bidirectionally. If it doesn't, the delta calculation for the OFF case may be wrong.

**State fields that must change:**
- `gameState.homeScore` or `gameState.awayScore` (delta based on toggle direction)

**Handler to investigate:** Same handler. The `isOutAdvancing` field change path. Check that `runnerOutcomeCountsAsRun()` returns the correct boolean for both the before and after states.

---

### Bug 4: Mid-inning pitcher change doesn't update defensive lineup column

**What the user does:** Mid-inning, subs out the pitcher via player card.

**What should happen:** Defensive lineup column immediately shows the new pitcher's name with the primary color outline.

**What actually happens:** Old pitcher remains in the defensive column. NewsBoard correctly shows new pitcher.

**State fields that must change:** The data feeding `DefensiveLineupColumn` must reflect the new pitcher.

**What to investigate:** The `defensiveColumnPlayers` useMemo in GameTracker.tsx. Check its dependency array. After a pitcher change + `syncDisplayedRostersToLineupSnapshot`, does the memo re-evaluate? The prior Opus fix added a `rosterVersion` counter — verify it's being incremented after pitcher changes AND is in the memo's dependency array.

---

### Bug 5: Next-inning leadoff indicator off by one

**What the user sees:** Dotted outline is on the batter who made the last out, not the one due up next.

**What should happen:** If batter #4 made the last out, the dotted outline should be on batter #5.

**What to investigate:** The `defensiveNextLeadoff` (or equivalent) calculation in GameTracker.tsx. The prior fix used `(nextIndex % 9) + 1` but the input value (`nextIndex`) may itself be wrong — it may be the index of the last batter rather than the index of the next batter.

---

## AFTER ALL 5 BUGS

Run the full test suite and build:
```bash
npm run build
npx vitest run 2>&1 | tail -10
```

Then output a combined summary:
```
R3 REPRO-FIX SESSION COMPLETE

Tests written: [count]
Tests passing: [count]
Bugs fixed with verified tests: [list with IDs]
Bugs that couldn't be reproduced in tests: [list with explanation]

Wiring verification (final):
  applyScoreAdjustment: [N call sites]
  applyBasesCorrection: [N call sites]
  applyOutsAdjustment: [N call sites]

Smoke script: [all checks pass / any failures]

npm run build: [PASS/FAIL]
Full test suite: [X passed / Y failed]
```