# CODEX BUG FIX: Round 5 — Pitcher Duplication + End Game Hang + Enrichment Gap
# ROUTE: Codex 5.4 | high
# Branch: fix/r5-pitcher-endgame
# Skill: .claude/skills/gametracker-bug-repro/SKILL.md — READ THIS FIRST, FOLLOW THE 8-STEP PROTOCOL

---

## INSTRUCTIONS

1. Read `.claude/skills/gametracker-bug-repro/SKILL.md` in full FIRST.
2. For EACH bug below, follow the skill's 8-step protocol.
3. Fix bugs in the order listed.

---

## R5-01 (CRITICAL REGRESSION): Pitcher change creates infinite duplicate entries in defensive lineup

**What the user does:** Mid-inning, subs out pitcher via player card.

**What should happen:** Defensive lineup column shows 9 players. The new pitcher replaces the old one at position 9 (or wherever the pitcher is in the batting order).

**What actually happens:** The defensive lineup shows 14+ entries of the new pitcher (e.g., "9. P Amazo Haze" repeated endlessly), all with "PC: 0". The old pitcher entries may also remain. The column grows infinitely.

**Root cause:** The R4-06 fix created `gameTrackerRosterSync.ts` which overlays `snapshot.currentPitcher` onto the defensive column data. This overlay is APPENDING instead of REPLACING. Or it's running on every render cycle (inside a useMemo or effect that re-fires), creating a new entry each time.

**What to investigate:**
```bash
# Find the new roster sync utility
cat src/src_figma/app/utils/gameTrackerRosterSync.ts

# Find where it's called in GameTracker
grep -n "gameTrackerRosterSync\|overlayCurrentPitcher\|rosterSync" src/src_figma/app/pages/GameTracker.tsx | head -10

# Find the defensiveColumnPlayers memo — this is where duplicates are generated
grep -B2 -A30 "const defensiveColumnPlayers = useMemo" src/src_figma/app/pages/GameTracker.tsx
```

**What to fix:**
1. Read `gameTrackerRosterSync.ts` in full — it's new and small. Find the function that overlays the pitcher.
2. The function must REPLACE the existing pitcher entry, not APPEND a new one. The logic should be: filter out any player with position 'P', then add the new pitcher entry. Or: map over the array and replace the entry where `isPitcher === true`.
3. Check if the overlay runs inside the `defensiveColumnPlayers` useMemo. If the memo's dependencies cause it to re-run every render, the overlay appends on every cycle → infinite growth.
4. If the overlay runs in a useEffect that pushes to state, it creates a render loop: effect runs → state updates → re-render → effect runs again → infinite.

**The fix is likely one of:**
- Change append to replace in the roster sync function
- Ensure the overlay runs ONCE (in the memo, not an effect)
- Or remove the overlay entirely and instead make `syncDisplayedRostersToLineupSnapshot` correctly update the pitcher in the displayed roster STATE so the memo reads the correct data naturally

**Test to write:** Create a defensive column data array with 9 players. Call the overlay function. Assert the result has exactly 9 entries (not 10, not 14).

**Wiring verify:**
```bash
grep -n "gameTrackerRosterSync\|overlayPitcher\|syncPitcher" src/src_figma/app/pages/GameTracker.tsx | grep -v "import\|//"
```

**Browser verify:** Mid-inning → change pitcher → defensive column shows exactly 9 players, new pitcher at correct position.

---

## R5-02 (CRITICAL): END GAME still hangs after pitch count prompt

**What the user does:** Taps END GAME → pitch count prompt → enters count → confirms → nothing happens. Game hangs. Only way out is hard refresh.

**This has been reported 3 times now (R3-07, R4-02, R5-02).** Prior fixes re-traced the chain but didn't find or fix the actual failure point. This time: USE THE BROWSER CONSOLE.

**What to investigate — different approach this time:**
1. Do NOT try to trace the code path by reading. Instead, ADD DIAGNOSTIC LOGGING to the end-game flow.
2. In `handleEndGame` (GameTracker.tsx), add `console.log` at EVERY major step:
```typescript
console.log('[END-GAME] Step 1: Starting handleEndGame');
// ... existing code ...
console.log('[END-GAME] Step 2: Pitch count prompt resolved');
// ... existing code ...
console.log('[END-GAME] Step 3: Calling hookEndGame');
try {
  await hookEndGame(endGameOptions);
  console.log('[END-GAME] Step 4: hookEndGame completed');
} catch (err) {
  console.error('[END-GAME] Step 4: hookEndGame FAILED:', err);
}
console.log('[END-GAME] Step 5: Navigating to PostGameSummary');
navigate(`/post-game/${gameState.gameId}`, { ... });
console.log('[END-GAME] Step 6: Navigation called');
```
3. Similarly, in `confirmPitchCount` in useGameState.ts, add logging:
```typescript
console.log('[PITCH-COUNT] Confirming pitch count, type:', prompt.type);
// after confirmation:
console.log('[PITCH-COUNT] Confirmed, clearing prompt');
```
4. After adding the logging, `npm run build`, then reproduce the hang in the browser. The console will show EXACTLY which step hangs.

**What to fix:** Whatever step the console shows as the last log before the hang — that's where the bug is. Common suspects:
- `hookEndGame` throws and the error is swallowed by a try/catch that doesn't re-throw
- `confirmPitchCount` doesn't clear the prompt, so the continuation callback never fires
- The `gameEndingRef.current` guard is already `true` from a prior attempt, blocking re-entry
- The `navigate` call fires but the route doesn't match (gameId mismatch)

**IMPORTANT:** Do NOT remove the diagnostic logging after fixing. Leave it in as `console.debug` (not `console.log`) so it's available for future debugging but doesn't clutter the console in normal use. This end-game flow has been resistant to fixes — permanent instrumentation is worth the trade-off.

**Test to write:** If possible, write a test that simulates the end-game sequence. At minimum, test that `hookEndGame` can be called without throwing when given valid options.

**Browser verify:** Record plays → END GAME → pitch count → confirm → navigates to PostGameSummary. No hang. Console shows all 6 [END-GAME] steps completing.

---

## R5-03 (HIGH): Runner auto-advances on WP_K even though user shouldn't be forced

**What the user does:** WP_K with runner on 1B. Runner auto-advances to 2B.

**What should happen:** Runner advances to 2B by DEFAULT (this is correct — most runners advance on WP). User CAN correct back to 1B via sub-entry. The correction should update live base state.

**What actually happens:** Runner advances to 2B. User can change sub-entry destination back to 1B. BUT the live `gameState.bases` still shows 2B occupied (not 1B). The R4-04 fix added `liveBaseCorrection.ts` but it may not be handling the WP_K runner advancement case correctly.

**What to investigate:**
```bash
cat src/src_figma/app/utils/liveBaseCorrection.ts
grep -n "liveBaseCorrection\|reconcileRunnerTracker" src/src_figma/app/pages/GameTracker.tsx | head -10
```

**What to fix:** When a runner sub-entry destination is changed via `handleRunnerEnrichmentUpdate` AND the play is the latest at-bat, `applyBasesCorrection` must be called with the CORRECT new bases. The `liveBaseCorrection.ts` utility should reconcile: read ALL runner outcomes from the corrected event, rebuild the bases from them.

**Test to write:** Test `liveBaseCorrection` directly: given a set of runnerOutcomes where one runner was moved from 2B to 1B, assert the output bases are `{ first: true, second: false, third: false }`.

**Browser verify:** WP_K with R1 → R1 auto-advances to 2B → correct sub-entry to 1B → ScoreBug shows 1B occupied, 2B empty.

---

## R5-04 (MEDIUM): Need "Beat Throw" / out-advancing enrichment for hits

**What the user describes:** Player hits a 2B but gets thrown out trying to stretch it to a 3B. There's no way to record this — the play should be a 2B with the batter tagged out advancing.

**What should exist:** In the enrichment panel for hits (1B, 2B, 3B), there should be a "Beat Throw" modifier (already exists in MODIFIER_OPTIONS from the enrichment taxonomy rewrite) AND a way to mark the batter as "out advancing" after the hit.

**What to investigate:**
```bash
grep -n "BEAT_THROW\|Beat Throw\|BT\|outAdvancing.*batter\|batterOut" src/src_figma/app/components/EnrichmentPanel.tsx | head -10
```

**What to check:**
1. Is "Beat Throw" (BT) in the modifiers list for hits? Check ENRICHMENT_CONFIG for '2B' — does it include 'BEAT_THROW' in its modifiers array?
2. If BT is available but the user doesn't see a way to mark the batter out: this may need a BATTER-level "out advancing" toggle on the at-bat enrichment (not just runner sub-entries). Currently "Out Advancing" only exists on runner sub-entries.

**What to fix:**
1. Verify "Beat Throw" is in the enrichment config modifiers for 1B, 2B, 3B. If not, add it.
2. Add a "Batter Out Advancing" toggle to the at-bat enrichment panel for hits. This records that the batter reached the hit base but was thrown out trying for the next base. When toggled: the hit is still recorded (2B), but the batter is marked out (outs increment by 1), and the batter is NOT left on the hit base.
3. This requires: (a) a new field on the at-bat enrichment (e.g., `batterOutAdvancing: boolean`), (b) score/outs adjustment when toggled, (c) base state correction (batter not on 2B if they were thrown out).

**Browser verify:** Record 2B → open enrichment → toggle "Batter Out Advancing" → outs increment, batter not on base.

---

## Execution Order

1. **R5-01** (pitcher duplication) — fix first, it's a visible regression that makes the app unusable
2. **R5-02** (end game hang) — fix second, use diagnostic logging approach
3. **R5-03** (runner base correction on WP_K) — fix third, state engine correction
4. **R5-04** (batter out advancing enrichment) — fix last, new feature addition

---

## AFTER ALL BUGS

Run smoke script:
```bash
#!/bin/bash
FILE="src/src_figma/app/pages/GameTracker.tsx"

echo "=== WIRING CHECK ==="
for fn in applyScoreAdjustment applyBasesCorrection applyOutsAdjustment endInning setRosterVersion; do
  total=$(grep -c "$fn(" "$FILE" 2>/dev/null || echo 0)
  imports=$(grep "$fn" "$FILE" | grep -c "import\|const.*=.*use" 2>/dev/null || echo 0)
  calls=$((total - imports))
  echo "$fn: $total total, ~$calls call sites"
done

echo ""
echo "=== DEFENSIVE COLUMN CHECK ==="
echo "defensiveColumnPlayers entries (should derive exactly 9):"
grep -n "defensiveColumnPlayers" "$FILE" | head -5
echo ""
echo "Pitcher overlay / append patterns:"
grep -n "push\|append\|concat.*pitcher\|\.\.\..*pitcher" "$FILE" || echo "None found (good)"

echo ""
echo "=== END GAME DIAGNOSTIC ==="
echo "END-GAME log steps:"
grep -c "END-GAME.*Step" "$FILE"
echo "(expect 6 steps instrumented)"
```

Output combined summary:
```
R5 SESSION COMPLETE

Tests written: [count]
Tests passing: [count]
Bugs fixed: [list]

Wiring verification: [all functions with call counts]
Defensive column: [no append/push patterns]
End game instrumentation: [6 log steps present]

npm run build: [PASS/FAIL]
Full test suite: [X passed / Y failed]
```
