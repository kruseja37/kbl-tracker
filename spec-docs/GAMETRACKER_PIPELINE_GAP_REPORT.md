# GameTracker Data Pipeline Gap Report

**Date:** 2026-04-06
**Scope:** GameTracker → Franchise, Elimination (Playoffs), SMB Almanac
**Method:** Code-level trace of every field from producer through aggregation to consumer

---

## CRITICAL (data loss or wrong results)

### GAP-01: Elimination games have no `leagueId` — breaks almanac registration + ratings snapshots
- **Severity:** CRITICAL
- **Affected modes:** Elimination → Almanac
- **Root cause:** `EliminationHome.tsx` does NOT pass `leagueId` in navigation state. Franchise passes it (line 2831), but elimination does not.
- **Impact:**
  - `resolveExhibitionLeagueId()` (`gameStorage.ts:379-391`) returns `undefined` for `competitionType='elimination'`
  - `processCompletedGame.ts:108` skips `capturePlayerRatingsSnapshots` when leagueId is falsy
  - `registerAlmanacPlayers.ts:260-268` skips game entirely when leagueId resolves to undefined
  - Elimination players never appear in Almanac canonical registry via primary path
- **Safety net:** `backfillCanonicalPlayers()` runs on AlmanacHome mount, but it calls the same `resolveExhibitionLeagueId` — so it also skips elimination games
- **Fix:** Pass `leagueId` from elimination bracket config in `EliminationHome.tsx` `handlePlayGame` navigate state

### GAP-02: No aggregation retry for failed `processCompletedGame`
- **Severity:** CRITICAL
- **Affected modes:** All (Franchise, Elimination, Almanac)
- **Root cause:** `useDataIntegrity.ts` has `recoverUnaggregatedGames()` but it's only called from archived `src/archived-pages/GamePage.tsx` — the active app never calls it
- **Impact:** If `processCompletedGame` fails or times out (wrapped in `Promise.race` at ~line 9658):
  - Game archives to `completedGames` (second `archiveCompletedGame` still runs)
  - Season stats are NOT updated — batting/pitching leaders missing the game
  - Career milestones not triggered
  - Event log `aggregated` flag stays `false`, but nothing ever retries
- **Fix:** Wire `recoverUnaggregatedGames()` into app startup (e.g., `App.tsx` or `AppHome.tsx`)

### GAP-03: Playoff stats capture is ~50% complete
- **Severity:** CRITICAL
- **Affected modes:** Elimination, Franchise Playoffs
- **Root cause:** `aggregateGameToPlayoffStats()` in `playoffStorage.ts:938-1121` uses minimal field extraction
- **Missing batting fields:** `pa`, `singles`, `sh`, `gidp`
- **Missing ALL fielding stats:** `putouts`, `assists`, `fieldingErrors` — zero fielding in playoff stats
- **Missing pitching fields:** `hitBatters`, `wildPitches`, `pitchCount`, `battersFaced`, `runsAllowed`, `hold`, `blownSave`, and 8+ others
- **Missing fame events:** `gameState.fameEvents` never processed for playoff stats
- **Impact:** Elimination Leaders tab shows incomplete stats. Franchise playoff leaders missing key categories.
- **Fix:** Expand `aggregateGameToPlayoffStats` to capture all fields from `PersistedGameState`

---

## MODERATE (incomplete features or dead code)

### GAP-04: SMB4 special metrics never populated
- **Severity:** MODERATE
- **Affected modes:** All (season/career aggregation gets zeros)
- **Fields:** `d3kOutcomes`, `divingCatches`, `robberies`, `nutshots` (batting), `comebackerInjuries` (pitching)
- **Root cause:** These fields are defined in `PersistedGameState` types (`gameStorage.ts:122-126, 158`) but `useGameState.ts` never tracks or populates them during gameplay
- **Impact:** Season and career stats always show 0 for these categories
- **Note:** These are SMB4-specific advanced metrics that may require UI prompt integration (per detection philosophy) before they can be tracked

### GAP-05: `grandSlams` not tracked — career milestone counter stays 0
- **Severity:** MODERATE
- **Affected modes:** Franchise (career milestones)
- **Root cause:** `grandSlams` is expected by `milestoneAggregator.ts` (line ~127) but no field tracks grand slams in `PlayerGameStats` during gameplay
- **Impact:** Career grand slam milestone achievements never trigger
- **Fix:** Add grand slam detection in `commitPlateAppearance` when HR with bases loaded

### GAP-06: Fame events only write to batting records
- **Severity:** MODERATE
- **Affected modes:** Franchise (season stats)
- **Root cause:** `aggregateFameEvents()` in `seasonAggregator.ts:307-356` only calls `getOrCreateBattingStats()` / `updateBattingStats()`
- **Impact:** Pitcher-only players (pure relievers who never bat in DH leagues) can earn fame bonuses/boners during a game, but the fame data has nowhere to be written — it's silently lost
- **Fix:** Fall through to `getOrCreatePitchingStats()` when no batting record exists for the player

### GAP-07: Orphaned IndexedDB stores never written to
- **Severity:** MODERATE (wasted schema space)
- **Stores:** `playerGameStats` (`trackerDb.ts:59-63`), `pitcherGameStats` (`trackerDb.ts:65-69`)
- **Root cause:** Stores were created in the v1 schema but game stats are embedded inline in `completedGames` records instead
- **Impact:** No functional impact — stores exist but are empty. Could be cleaned up in a future DB version bump.

### GAP-08: Double `archiveCompletedGame` call per game
- **Severity:** MODERATE (wasteful, minor data risk)
- **Root cause:** `processCompletedGame.ts:113` archives with `inningScores: []`, then `completeGameInternal` at line 9834 archives again with real `inningScores` and `playersOfTheGame`
- **Impact:** If second call fails but first succeeds, `completedGames` has a record with empty `inningScores`. Functionally correct due to `store.put()` overwrite, but wasteful.
- **Fix:** Remove archive call from `processCompletedGame` and let `completeGameInternal` handle it exclusively

---

## LOW (cosmetic or future concern)

### GAP-09: `managerDecisions` and `moraleShifts` never populated
- **Fields:** `PersistedGameState.managerDecisions`, `PersistedGameState.moraleShifts`
- **Status:** Defined in type, written as `[]` in archives. These are future features — type scaffolding exists but gameplay doesn't track them yet.

### GAP-10: `playerRatingsSnapshots` skipped for non-exhibition modes without leagueId
- **Related to:** GAP-01. For franchise mode this works (leagueId is passed). For elimination, snapshots are lost.
- **Impact:** Almanac player cards may lack ratings data for elimination games.

### GAP-11: WAR orchestrator is dead code
- **File:** `warOrchestrator.ts`
- **Status:** `calculateAndPersistSeasonWAR` is defined but never called. WAR is computed on-the-fly in `useSeasonStats` instead. Not a pipeline gap, but dead code.

---

## VERIFIED WORKING

| Pathway | Status | Evidence |
|---------|--------|----------|
| All 25 required top-level `PersistedGameState` fields | PASS | All set in `completeGameInternal` lines 9566-9615 |
| All 19 required batting stat fields | PASS | Spread from `PlayerGameStats` + explicit overrides at lines 9424-9477 |
| All 24 required pitcher stat fields | PASS | Explicit mapping at lines 9506-9556 |
| `statsScopeId` isolation across modes | PASS | Exhibition=undefined, Franchise=`{franchiseId}-season-{N}`, Elimination=`elimination-{id}` — no collision |
| Elimination passes `playoffId` to GameTracker | PASS | `EliminationHome.tsx:294` — `playoffId: playoffConfig.id` |
| Elimination passes `playoffSeriesId` | PASS | `EliminationHome.tsx:292` |
| Franchise schedule marked COMPLETED | PASS | `GameTracker.tsx:9213` — `completeScheduleGame()` called for franchise/playoff modes |
| Season aggregation pipeline | PASS | `processCompletedGame` → `aggregateGameToSeason` → season stores |
| Career aggregation + milestones | PASS | `processCompletedGame` → `aggregateGameWithMilestones` → career stores |
| Game archival to `completedGames` | PASS | `archiveCompletedGame` writes full record |
| Event log capture during gameplay | PASS | `atBatEvents`, `pitchingAppearances`, `fieldingEvents`, `betweenPlayEvents` all written |
| Almanac backfill competition type mapping | PASS | `normalizeRegistrationMode` handles exhibition/franchise/playoff/elimination |
| Franchise leagueId propagation | PASS | `FranchiseHome.tsx:2831` passes `leagueId: franchiseLeagueId` |
| Mojo/fitness snapshots for elimination | PASS | Saved in `GameTracker.tsx:9174` for elimination mode |

---

## Priority Fix Order

1. **GAP-01** — Pass `leagueId` in elimination navigate state (1-line fix, unblocks almanac for elimination)
2. **GAP-02** — Wire `recoverUnaggregatedGames` into active app startup (prevents silent stat loss)
3. **GAP-03** — Expand `aggregateGameToPlayoffStats` field coverage (comprehensive but contained change)
4. **GAP-05** — Add grand slam tracking in `commitPlateAppearance` (targeted)
5. **GAP-06** — Add pitching record fallback for fame aggregation (targeted)
6. **GAP-08** — Remove redundant first `archiveCompletedGame` call (cleanup)
7. **GAP-04** — SMB4 metrics require gameplay tracking infrastructure (larger scope, can defer)
