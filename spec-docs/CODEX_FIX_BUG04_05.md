# CODEX BUG FIX: BUG-04 + BUG-05 — Play Log Cleanup + Undo Fix (v2)
# ROUTE: Codex 5.4 | high
# Branch: fix/bug-04-05-playlog-undo-v2

---

## CONTEXT

**BUG-04:** Starting a new game shows leftover play log entries from a previous game.
**BUG-05:** Undo creates duplicate entries (fix was applied in a prior session but can't be tested until BUG-04 is resolved).

## ROOT CAUSE (VERIFIED — do not re-investigate)

The end-game flow in `useGameState.ts` (line ~5763 `completeGameInternal`) correctly:
1. Calls `processCompletedGame()` → aggregates stats to season/playoff stores
2. Calls `markGameAggregated()` → idempotency guard
3. Calls `archiveCompletedGame()` → saves archive for PostGameSummary
4. Calls `clearCurrentGame()` → clears game STORAGE (persisted state in gameStorage)

BUT: `clearCurrentGame()` does NOT clear the EVENT LOG. AtBatEvents and BetweenPlayEvents persist in IndexedDB keyed by gameId. When a new game initializes:
- If the gameId happens to match a prior game (e.g., franchise game "franchise-g5" replayed)
- OR if the React component doesn't unmount between games (play log entries persist in state)

...the play log rebuilds from stale events or retains entries from the prior render.

The `rebuildPlayLogFromEventLog()` (GameTracker.tsx ~line 1284) calls `getGameEvents(gameState.gameId)` which returns ALL events for that gameId from IndexedDB — including events from completed games that were aggregated but never deleted.

## GOAL

1. Play log must be empty when starting a NEW game
2. Play log must correctly rebuild from events when RESUMING an in-progress game
3. Completed game events should not pollute new game play logs
4. Undo should work correctly (remove last entry, restore state)

## FILES TO READ

```
src/src_figma/app/pages/GameTracker.tsx:
  - Line 452: playLogEntries state initialization
  - Line 919-922: useEffect that triggers rebuildPlayLogFromEventLog on gameInitialized
  - Line 1284-1291: rebuildPlayLogFromEventLog function
  - Line 1858-1977: initializeOrLoadGame function
  - Line 828-870: handleUndo function (already has snapshot-based restore from prior fix)

src/src_figma/hooks/useGameState.ts:
  - Line 5763: completeGameInternal — calls clearCurrentGame() but NOT event log cleanup
  - Line 6090: clearCurrentGame() call at end of game
  - Line 2034, 2268, 2275, 3043: other clearCurrentGame() calls

src/src_figma/utils/gameStorage.ts:
  - clearCurrentGame function — what exactly does it clear?

src/utils/eventLog.ts:
  - getGameEvents(gameId) — returns events for a gameId
  - getGameHeader(gameId) — returns header including aggregated flag
  - Look for any function that deletes/clears events by gameId
```

## WHAT TO FIX

### Fix 1: Clear play log state on component mount / gameId change

In `GameTracker.tsx`, the `initializeOrLoadGame` function (~line 1858):

Add at the VERY START, before `hasExistingGame` check:
```typescript
// BUG-04: Clear stale play log before loading/creating game
setPlayLogEntries([]);
```

Also add cleanup on unmount in the effect's cleanup function (~line 1977):
```typescript
return () => {
  cancelled = true;
  initInProgressRef.current = false;
  setPlayLogEntries([]); // BUG-04: Clear on unmount
};
```

### Fix 2: Don't rebuild play log from events if game is already completed

In `rebuildPlayLogFromEventLog` (~line 1284), OR in the effect that calls it (~line 919), add a guard:

```typescript
// BUG-04: Don't load events from a completed/aggregated game
const header = await getGameHeader(gameState.gameId);
if (header?.aggregated || header?.status === 'COMPLETED') {
  console.log('[BUG-04] Game already completed, not loading stale events');
  setPlayLogEntries([]);
  return;
}
```

This prevents the play log from loading events from a game that already went through the end-game aggregation pipeline. The events exist in IndexedDB for archival purposes but should NOT feed the play log of a "new" game.

### Fix 3: Ensure new game gets a fresh gameId (exhibition mode)

In `initializeOrLoadGame` (~line 1935), for exhibition mode:
```typescript
gameId: gameId || `game-${Date.now()}`
```
If `gameId` comes from the route as a fixed string for exhibition, it will collide with prior games. Verify:
- For exhibition: gameId should include a timestamp or random suffix to ensure uniqueness
- For franchise: gameId is deterministic (e.g., "franchise-g5") which is correct for RESUMING, but if the game was already COMPLETED and the user starts a new game at the same slot, the old events must not load (Fix 2 handles this via the aggregated check)

### Fix 4: Undo race condition (if still present after Fixes 1-3)

The prior Codex session expanded the undo snapshot to include `playLogEntries`. The `handleUndo` function (~line 828) restores `playLogEntries` from the snapshot. However, `queuePlayLogRefresh` may fire on the next tick and reload events from IndexedDB, overwriting the snapshot restore.

In `handleUndo`, verify this sequence:
1. Cancel any pending play log refresh timeout
2. Restore playLogEntries from snapshot (already implemented)
3. Wait for IndexedDB undo to complete
4. THEN (and only then) allow play log refresh

If the cancel is already in handleUndo, this fix may not be needed. Check and verify.

## DO NOT
- Delete events from IndexedDB (they're needed for archival/PostGameSummary)
- Change the aggregation pipeline (processCompletedGame, archiveCompletedGame)
- Modify the end-game flow in useGameState.ts (it's correct)
- Change EnrichmentPanel, QuickBar, ScoreBug, or lineup columns
- Modify eventLog.ts persistence structure

## VERIFY
```bash
npm run build
```

Browser tests (ALL must pass):
1. Start a new exhibition game → play log is EMPTY
2. Record K, 1B, GO → play log shows exactly 3 entries in order
3. Tap undo → last entry removed, outs/score/batter revert correctly
4. Navigate away → start another new exhibition game → play log is EMPTY (no stale data)
5. In franchise mode: start a new game at a game slot that was previously played → play log is EMPTY (completed game events don't load)

## OUTPUT FORMAT
```
BUG-04 + BUG-05 FIX COMPLETE (v2)

Changes:
1. [exact changes for play log clearing on mount/unmount]
2. [exact changes for aggregated game guard in rebuildPlayLogFromEventLog]
3. [exact changes for gameId uniqueness if needed]
4. [exact changes for undo race condition if needed]

Root cause confirmed: [what specifically caused the stale data in your investigation]

npm run build: [PASS/FAIL]
```
