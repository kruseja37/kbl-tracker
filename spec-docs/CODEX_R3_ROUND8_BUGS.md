# Codex Task: R3 Round 8 — Substitution, Runner, and Matchup Bugs

## Context

KBL Tracker is a React/TypeScript game tracker for Super Mega Baseball 4. Key files:
- `src/src_figma/app/pages/GameTracker.tsx` (~12,000+ lines) — main UI
- `src/src_figma/hooks/useGameState.ts` (~9,600+ lines) — state hook
- `src/src_figma/app/utils/gameTrackerRosterSync.ts` — lineup reconciliation
- `src/src_figma/app/components/BattingLineupColumn.tsx` — batting lineup display

Fix all bugs below. These are interconnected — the substitution routing bug causes the matchup bug and the runner stale display bug.

---

## Bug 1: Pinch-Hit for Pitcher Routes to changePitcher Instead of makeSubstitution (CRITICAL)

### What happens
User pinch-hits for the pitcher (Dot Dacornas → Amazo Haze, a position player). The matchup window shows the OLD pitcher (D. DACORNAS) as AT BAT and the NEW player (A. HAZE) as PITCHING. The batter-up border correctly moves to the next batter. Later, when the pitcher's batting slot comes up again, the matchup shows N. KAISER (original pre-game pitcher) as AT BAT.

### Evidence from logs
- The play log shows "Amazo Haze — PCHG — Amazo Haze for Noah Kaiser" — this is a PITCHER CHANGE event, not a pinch-hit substitution
- `handlePitcherSubstitution` was called, which calls `changePitcher()` → updates `gameState.currentPitcherId` to the pinch-hitter

### Root cause

In `GameTracker.tsx`, `handlePlayerCardSubOut` at ~line 6370 was recently updated to check `isActualPitcherChange = isPitcher && incomingPosition === "P"`. However, the fix may not be working because:

1. **The `incomingPosition` parameter may not be reaching the handler correctly.** Check the call chain from PlayerCardModal → onSubOut → handlePlayerCardSubOut. The `bp.pos` value passed at line ~10867 may be "P" even for non-pitcher bench players if their position in the bench data is set incorrectly.

2. **The bench entry positions may all be "P"** because the R3-R7 bench fix added pitchers to the bench but the position players from the lineup snapshot bench also have positions that could be wrong.

### Investigation steps

1. Add logging at the TOP of `handlePlayerCardSubOut`:
   ```typescript
   console.log("[R3-R8] handlePlayerCardSubOut called:", {
     outgoingName, incomingName, isPitcher, incomingPosition,
   });
   ```

2. Check what `bp.pos` is for position player bench entries. In the bench list construction (~line 8940-8970), log each bench entry's position.

3. **Check the lineup snapshot bench**: The bench entries come from `lineupSnapshot[selectedPlayerTeam].bench`. Each bench entry has `positions: string[]`. The `bp.pos` is set to `benchPlayer.positions[0]`. If a position player's positions array has "P" as the first element (because the R3-R7 fix added pitchers and they got mixed), all entries would show as "P".

4. **The real fix**: The routing decision should NOT rely on `incomingPosition` from the bench list (which may be wrong). Instead, check if the incoming player exists in the PITCHER roster (`awayTeamPitchers`/`homeTeamPitchers`). If the incoming player is in the pitcher roster, it's a pitcher change. If not, it's a regular substitution.

### Fix approach

Replace the `isActualPitcherChange` logic in `handlePlayerCardSubOut`:

```typescript
const handlePlayerCardSubOut = useCallback(
  (outgoingPlayerId, outgoingName, incomingName, isPitcher, incomingPosition) => {
    // Determine if incoming player is actually a pitcher by checking the pitcher roster
    const teamPitchers = isPitcher
      ? [...awayTeamPitchers, ...homeTeamPitchers]
      : [];
    const incomingIsPitcher = teamPitchers.some(p => p.name === incomingName);
    const isActualPitcherChange = isPitcher && incomingIsPitcher;

    // ... rest of routing
  }
);
```

This is more reliable than checking `incomingPosition` because it uses the actual pitcher roster data.

### Also fix: Update currentBatterId after pinch-hit

When a pinch-hitter replaces the current batter, `gameState.currentBatterId` and `currentBatterName` must update to the pinch-hitter. Currently `handleSubstitution` calls `makeSubstitution` which updates the lineup refs but may NOT update `gameState.currentBatterId`.

In `makeSubstitution` in `useGameState.ts`, after the lineup swap, check if the outgoing player was the current batter:
```typescript
if (lineupPlayerId === gameState.currentBatterId) {
  setGameState(prev => ({
    ...prev,
    currentBatterId: benchPlayerId,
    currentBatterName: benchPlayerName || benchPlayerId,
  }));
}
```

### Files to modify
- `src/src_figma/app/pages/GameTracker.tsx` (handlePlayerCardSubOut routing)
- `src/src_figma/hooks/useGameState.ts` (makeSubstitution — update currentBatterId)

---

## Bug 2: Runner Base Indicators Never Clear (Stale Runners in Lineup)

### What happens
The BattingLineupColumn shows runner base superscripts (¹, ², ³) that persist even after those runners have scored or been put out. From the logs, the runner map consistently shows:
```
{htc-jumps: 1, htc-elyve: 2, htc-berko: 3, Jeb Jumps: 1, Stan Elyve: 2, ...}
```
This map has 6+ entries even when bases should be empty. The map grows but never shrinks.

### Root cause

The runner map in `BattingLineupColumn.tsx` is built from `runners` prop. But the `runners` prop in `GameTracker.tsx` comes from `runnerNames` state, which is synced from `getBaseRunnerNames()`.

The problem is that `getBaseRunnerNames()` returns runners currently on base from the tracker. But the `runnerNames` state in GameTracker may not be clearing when runners score or are put out. Check:

1. **The runner names sync effect** in GameTracker.tsx (~line 1238-1260) watches `runnerIdentityVersion` and `gameState.bases`. When bases clear (all false), does `getBaseRunnerNames()` return `{}`? And does `setRunnerNames({})` get called?

2. **BattingLineupColumn runner map construction** (~line 45-55): The runner map is built from `runners.first?.name`, `runners.second?.name`, `runners.third?.name`. But Codex's R4 fix added **playerId-based matching** that may be accumulating entries without clearing old ones. Check if the runner map includes BOTH playerId entries AND name entries for the same runner, doubling the entries.

3. **The `runnerBaseMarkers` or equivalent**: Check if there's a separate state or derived value that accumulates runner positions over time instead of being recomputed from current base state each render.

### Fix

The runner map must be recomputed from scratch each render based ONLY on `runners.first`, `runners.second`, `runners.third` — not accumulated. Verify that BattingLineupColumn clears the map on each render and doesn't carry over previous values.

### Files to read/modify
- `src/src_figma/app/components/BattingLineupColumn.tsx` (runner map construction)
- `src/src_figma/app/pages/GameTracker.tsx` (runnerNames state, runners prop to BattingLineupColumn)
- `src/src_figma/hooks/useGameState.ts` (getBaseRunnerNames)

---

## Bug 3: Bench List Shows Only Pitchers (Position Players Missing)

### What happens
When user clicks SUB OUT on any player, the bench list shows only pitcher names. No position player bench entries appear.

### Root cause

The bench list comes from `lineupSnapshot[selectedPlayerTeam].bench` (~line 8940). The R3-R7 fix added bench pitchers to the `initializeGame` bench array. But the POSITION players may have been lost because:

1. `awayBenchPosition` at ~line 3263 filters `awayTeamPlayers` for players NOT in `awayStarterIds`. But after `syncDisplayedRostersToLineupSnapshot` runs, `awayTeamPlayers` may only contain the 9 starters (not bench players), making this filter return an empty array.

2. The `reconcileTeamPlayersWithLineupSnapshot` function returns players from the lineup + bench + used players. But the bench in the lineupState is only populated during `initializeGame`. If the bench was initially empty (because `awayTeamPlayers` only had starters), it stays empty.

### Investigation

1. Log `awayBenchPosition.length` and `awayBenchPitchers.length` during `initializeGame` to see what's in each.
2. Log `lineupSnapshot[selectedPlayerTeam].bench` when the PlayerCardModal opens to see what's actually in the stored bench.
3. Check: is the bench stored in `awayLineupStateRef.current.bench` populated? Log its contents.

### Fix

The bench in `initializeGame` must include ALL non-starting position players. If `awayTeamPlayers` only has 9 starters by the time `initializeGame` runs, the bench will be empty. The original `navigationState?.awayPlayers` includes both starters and bench — verify that `awayTeamPlayers` still has all players at init time and hasn't been filtered by `syncDisplayedRostersToLineupSnapshot` first.

### Files to modify
- `src/src_figma/app/pages/GameTracker.tsx` (initializeGame bench construction, ensure all non-starters included)

---

## Verification

### Build/Test Requirements
- `npm run build` must exit 0
- `npm test` — 14 pre-existing failures are known. No new failures.
- Add `[R3-R8]` prefixed console.log for all fix paths

### Test Scenarios

**Scenario A: Pinch-hit for pitcher**
1. Start exhibition game, record a few at-bats
2. When the pitcher comes up to bat, tap them → SUB OUT → pick a POSITION PLAYER (not a pitcher)
3. Verify: matchup shows the pinch-hitter as AT BAT, opposing pitcher still PITCHING
4. Verify: play log shows "SUB" not "PCHG"
5. Next time through the order, verify the pinch-hitter's name shows at the 9 slot

**Scenario B: Pitcher-for-pitcher change**
1. During a game, tap the current pitcher in defensive lineup → SUB OUT → pick a PITCHER from bench
2. Verify: matchup shows new pitcher as PITCHING
3. Verify: play log shows "PCHG"

**Scenario C: Runner indicators clear**
1. Get runners on base (walks/hits)
2. Verify superscripts appear on correct batters in lineup
3. Record an out that clears the bases (or end the inning)
4. Verify all superscripts disappear

**Scenario D: Bench includes position players**
1. Tap any player → SUB OUT
2. Verify bench list shows BOTH position players AND pitchers
