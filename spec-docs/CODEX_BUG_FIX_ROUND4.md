# CODEX BUG FIX: Round 4 — State Engine Corrections + End Game + Persistence
# ROUTE: Codex 5.4 | high
# Branch: fix/r4-state-engine
# Skill: .claude/skills/gametracker-bug-repro/SKILL.md — READ THIS FIRST, FOLLOW THE 8-STEP PROTOCOL

---

## INSTRUCTIONS

1. Read `.claude/skills/gametracker-bug-repro/SKILL.md` in full FIRST.
2. For EACH bug below, follow the skill's 8-step protocol: identify code path → write test → test FAILS → wiring verify → fix → wiring re-verify → test PASSES → full suite → smoke script → report.
3. Fix bugs in the order listed. Each bug builds on the prior fix.

## CRITICAL CONTEXT

Three hook API functions exist in useGameState.ts and are destructured in GameTracker.tsx:
- `applyScoreAdjustment(inning, halfInning, delta)` — adjusts live score
- `applyBasesCorrection(bases)` — updates live base occupancy  
- `applyOutsAdjustment(delta)` — updates live out count

The R3 repro-fix session verified these are now CALLED (not just imported). Run wiring verification to confirm before starting:
```bash
grep -n "applyScoreAdjustment(" src/src_figma/app/pages/GameTracker.tsx | grep -v "import\|const.*=.*use\|//"
grep -n "applyBasesCorrection(" src/src_figma/app/pages/GameTracker.tsx | grep -v "import\|const.*=.*use\|//"
grep -n "applyOutsAdjustment(" src/src_figma/app/pages/GameTracker.tsx | grep -v "import\|const.*=.*use\|//"
```

Also: `endInning` is exposed by the hook. Verify:
```bash
grep -n "endInning" src/src_figma/app/pages/GameTracker.tsx | head -5
```

---

## R4-01 (CRITICAL): Inning doesn't end when 3rd out comes from runner correction

**What the user does:** Has 2 outs. Corrects a runner outcome on a prior play to "out" (toggles Out Advancing or changes destination to OUT). This makes outs = 3 via `applyOutsAdjustment`.

**What should happen:** Half-inning ends. Pitch count prompt fires. Columns swap. Outs reset to 0.

**What actually happens:** ScoreBug shows 3 outs. Nothing else happens. Game stays in same half-inning.

**Root cause:** Inning-end logic lives INSIDE `recordOut` in useGameState.ts. When outs reach 3 via `applyOutsAdjustment` (runner correction), `recordOut` is never called, so inning-end never fires.

**What to fix:** In `handleRunnerEnrichmentUpdate` in GameTracker.tsx, AFTER calling `applyOutsAdjustment`, check if the new outs count equals 3. If it does, call `endInning()`. The hook exposes `endInning` — verify with grep.

Alternatively, modify `applyOutsAdjustment` in useGameState.ts to check if outs hit 3 and trigger the inning-end flow internally. This is cleaner because it keeps the invariant (3 outs = end inning) in one place.

**Test to write:** Set up game state with 2 outs. Call `applyOutsAdjustment(1)`. Assert outs resets to 0 AND `isTop` flips (proving inning ended).

**Wiring to verify:**
```bash
grep -n "endInning\|applyOutsAdjustment" src/src_figma/app/pages/GameTracker.tsx | grep -v "import\|const.*=\|//"
```

**Browser verify:** 2 outs → correct a runner to "out" → inning ends, pitch count prompt, columns swap.

---

## R4-02 (CRITICAL): END GAME hangs after pitch count prompt

**What the user does:** Taps END GAME → pitch count prompt appears → enters count → confirms → nothing happens. Play log resets but game doesn't navigate to PostGameSummary.

**What should happen:** After pitch count confirmation → `handleEndGame` completes → navigates to `/post-game/{gameId}`.

**Root cause hypothesis:** This was "fixed" in Round 3 but is back. The end-game flow involves: pitch count prompt → `confirmPitchCount` → continuation callback → `handleEndGame` → `hookEndGame` → navigate. Something in this chain is breaking — likely the pitch count confirmation doesn't trigger the continuation, or `handleEndGame` throws silently.

**What to investigate:**
```bash
grep -n "handleEndGame\|confirmEndGame\|endGamePending\|gameEndingRef" src/src_figma/app/pages/GameTracker.tsx | head -15
grep -n "confirmPitchCount\|pitchCountPrompt.*end_game\|pendingEndGame" src/src_figma/hooks/useGameState.ts | head -10
```

**What to fix:** Trace the exact flow:
1. What triggers the pitch count prompt at end of game?
2. After user enters count and confirms, what callback fires?
3. Does that callback call `handleEndGame`?
4. Does `handleEndGame` await `hookEndGame`?
5. Does `hookEndGame` complete or throw?
6. Does the `navigate` call fire after `hookEndGame` completes?

Add a test that simulates: game in progress → trigger end game → confirm pitch count → assert navigation occurs (or at minimum, assert `hookEndGame` is called and completes).

Open the browser console and reproduce the hang — look for uncaught promise rejections or console errors.

**Browser verify:** Record plays → END GAME → pitch count → confirm → navigates to PostGameSummary.

---

## R4-03 (CRITICAL): Hard refresh loses all game state

**What the user does:** During a game in progress, does a hard browser refresh (Ctrl+R / Cmd+R).

**What should happen:** Game resumes from where it left off — events reload from IndexedDB, play log rebuilds, score/outs/bases/inning restored.

**What actually happens:** Game restarts at T1, 0-0, empty play log, no stats. All in-progress data lost.

**Root cause hypothesis:** The BUG-04 fix added `setPlayLogEntries([])` on mount and may also be clearing game state prematurely. Or the `initializeOrLoadGame` function isn't detecting the existing game correctly after the exhibition gameId changes (the BUG-04 fix changed exhibition gameIds to include timestamps — `game-${Date.now()}`). If the URL doesn't contain the timestamped ID, the load path creates a new game instead of resuming.

**What to investigate:**
```bash
grep -n "initializeOrLoadGame\|loadExistingGame\|hasExistingGame\|gameId" src/src_figma/app/pages/GameTracker.tsx | head -20
grep -n "loadCurrentGame\|saveCurrentGame\|clearCurrentGame" src/src_figma/utils/gameStorage.ts | head -10
```

Key questions:
1. What gameId does the URL contain on refresh?
2. Does `loadExistingGame` find events for that gameId?
3. Is `clearCurrentGame` being called at the wrong time (e.g., on mount before checking for existing data)?

**What to fix:** Ensure `loadExistingGame` runs BEFORE any clearing logic. The BUG-04 fix's `setPlayLogEntries([])` on mount is fine as long as `rebuildPlayLogFromEventLog` fires afterward and repopulates from IndexedDB. Verify the event data still exists in IndexedDB after refresh.

**Browser verify:** Record several plays → hard refresh → game resumes with same score, play log, and outs.

---

## R4-04 (HIGH): Runner base correction doesn't update live base state

**What the user does:** After WP_K, runner auto-advances from 1B to 2B. User taps runner sub-entry and changes destination back to 1B ("held").

**What should happen:** ScoreBug base diamonds show 1B occupied, 2B empty. Next play uses corrected bases.

**What actually happens:** Play log shows correction. ScoreBug still shows runner on 2B (or shows runners on both 1B and 3B — phantom runner). Next play uses stale base state.

**Root cause:** `applyBasesCorrection` is called (confirmed by R3 wiring verification) but may be called with wrong bases, or another state update overwrites it immediately after. The handler computes `nextRunnersAfter` from the persisted event, but this may not match the CURRENT live base state (there may have been plays AFTER the corrected play that moved runners further).

**Key insight:** Base corrections on the LATEST at-bat should update `gameState.bases` directly. Base corrections on HISTORICAL at-bats should NOT update live bases (the current base state reflects plays after the corrected one). Check whether the handler distinguishes between these cases.

**What to investigate:**
```bash
grep -n "applyBasesCorrection" src/src_figma/app/pages/GameTracker.tsx | grep -v "import\|const.*=\|//"
```
Read the 5 lines before and after each call — what condition gates it? What value is passed?

**Browser verify:** WP_K with R1 → runner at 2B → change to "held at 1B" → ScoreBug shows 1B only. Record 1B → runner advances from 1B correctly.

---

## R4-05 (HIGH): Phantom runner after base correction

**What the user does:** Runner on 3B. Corrects runner back to 2B. Records 1B for next batter. The "2B runner" advances to 3B but is a phantom — doesn't correspond to a real player.

**What should happen:** After correcting runner to 2B, the base state should show ONLY that runner on 2B. No phantom.

**Root cause:** This is likely the same underlying issue as R4-04. The live `gameState.bases` isn't being updated by `applyBasesCorrection`, so when the next play commits, it reads stale bases and generates incorrect runner sub-entries. If R4-04 is fixed correctly, R4-05 should also be resolved.

**Browser verify:** Fix R4-04 first. Then: runner on 3B → correct to 2B → record 1B → runner advances from 2B to 3B (no phantom). Only real runners appear in sub-entries.

---

## R4-06 (HIGH): Pitcher change STILL doesn't update defensive lineup column

**What the user does:** Mid-inning, subs out pitcher via player card.

**What should happen:** Defensive column shows new pitcher immediately.

**What actually happens:** Old pitcher stays. NewsBoard updates correctly. THIS IS THE THIRD TIME THIS BUG HAS BEEN REPORTED.

**Prior fix attempts:**
- Round 2 (R2-03): "defensive column resyncs when live pitcher changes" — didn't work
- Round 3 redo: added `rosterVersion` counter to `defensiveColumnPlayers` memo deps — didn't work

**What to investigate — go deeper this time:**
```bash
# Check rosterVersion is in the memo deps
grep -A2 "defensiveColumnPlayers.*useMemo" src/src_figma/app/pages/GameTracker.tsx

# Check rosterVersion is incremented after pitcher change
grep -n "setRosterVersion\|rosterVersion" src/src_figma/app/pages/GameTracker.tsx | head -10

# Check what data the memo reads
grep -B5 -A20 "const defensiveColumnPlayers = useMemo" src/src_figma/app/pages/GameTracker.tsx
```

**The deeper question:** The memo reads from `homeTeamPlayers`/`awayTeamPlayers`/`homeTeamPitchers`/`awayTeamPitchers`. Where do THESE come from? Are they React state that updates on pitcher change, or are they derived from refs/snapshots that don't trigger re-renders?

If the source data is stored in refs (not state), bumping `rosterVersion` in the memo deps won't help — the memo re-evaluates but reads the same stale ref values.

**What to fix:** Find the ACTUAL data source for the displayed pitcher list. If it's a ref, it needs to be copied to state after `syncDisplayedRostersToLineupSnapshot`. If it's state, verify the state setter is called after pitcher change.

**Test to write:** This may need a Playwright-level test or a component-level test since it depends on React memo behavior. At minimum, write a grep-based wiring verification proving the data flow: pitcher change → state update → memo dependency change → re-render.

**Browser verify:** Mid-inning → change pitcher → defensive column shows new pitcher name immediately.

---

## Execution Order

1. **R4-02** (END GAME hang) — fix first, unblocks testing everything else
2. **R4-03** (hard refresh) — fix second, ensures game persistence works
3. **R4-01** (inning end on correction) — state engine fix
4. **R4-04** (base state correction) — state engine fix, likely resolves R4-05
5. **R4-05** (phantom runner) — verify after R4-04
6. **R4-06** (pitcher defense column) — third attempt, go deeper

---

## AFTER ALL BUGS

Run Step 7 smoke script for ALL state engine functions:
```bash
#!/bin/bash
FILE_GT="src/src_figma/app/pages/GameTracker.tsx"
FILE_GS="src/src_figma/hooks/useGameState.ts"

echo "=== WIRING CHECK (GameTracker.tsx) ==="
for fn in applyScoreAdjustment applyBasesCorrection applyOutsAdjustment endInning setRosterVersion; do
  total=$(grep -c "$fn(" "$FILE_GT" 2>/dev/null || echo 0)
  imports=$(grep -c "import.*$fn\|$fn.*=.*use\|const.*$fn" "$FILE_GT" 2>/dev/null || echo 0)
  calls=$((total - imports))
  echo "$fn: $total total, ~$calls call sites"
done

echo ""
echo "=== GUARD CHECK ==="
grep -n "!isLatestAtBat.*apply\|!isCurrent.*apply" "$FILE_GT" || echo "No suspicious guards"

echo ""
echo "=== DEAD CODE CHECK ==="
for fn in applyBasesCorrection applyOutsAdjustment; do
  calls=$(grep "$fn(" "$FILE_GT" | grep -v "import\|const.*=.*use\|//" | wc -l)
  if [ "$calls" -eq 0 ]; then
    echo "DEAD: $fn — imported but 0 calls"
  fi
done
```

Then output combined summary:
```
R4 SESSION COMPLETE

Tests written: [count]
Tests passing: [count]
Bugs fixed: [list]

Wiring verification: [all functions with call counts]
Smoke script: [pass/fail]

npm run build: [PASS/FAIL]
Full test suite: [X passed / Y failed]
```
