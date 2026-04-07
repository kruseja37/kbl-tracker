# GameTracker Data Pipeline Gap Report

**Date:** 2026-04-06
**Scope:** GameTracker → Franchise, Elimination (Playoffs), SMB Almanac
**Method:** Code-level trace of every field from producer through aggregation to consumer

---

## CRITICAL (data loss or wrong results)

### GAP-01: ~~Elimination games have no `leagueId`~~ ✅ FIXED (5f7f942)
- **Fix applied:** Pass `leagueId: metadata.leagueId` in `EliminationHome.tsx:273` navigate state
- **Verified:** Build pass, tests pass (5373/5373)

### GAP-02: ~~No aggregation retry for failed `processCompletedGame`~~ ✅ FIXED (5f7f942)
- **Fix applied:** Replaced incomplete `aggregateGameFromEventLog` with `reAggregateFromArchive` that loads CompletedGameRecord and re-runs real pipeline. Wired `useDataIntegrity` into `AppHome.tsx` with auto-recovery on mount.
- **Verified:** Build pass, tests pass (5373/5373)

### GAP-03: ~~Playoff stats capture is ~50% complete~~ ⚠️ REASSESSED (severity downgraded)
- **Original severity:** CRITICAL → **Revised severity:** LOW
- **Analysis:** All fields displayed in the Elimination Leaders UI (`avg`, `homeRuns`, `rbi`, `stolenBases`, `ops`, `era`, `wins`, `pitchingStrikeouts`, `whip`, `saves`) ARE being aggregated correctly. Fielding stats (`fieldingWAR`, `fieldingRunsSaved`, `fieldingPlays`, `fieldingPrimaryPosition`) are enriched at read-time via `attachFieldingMetricsToPlayoffStats` from persisted fielding events — also working.
- **What's actually missing:** `pa`, `singles`, `sh`, `gidp` for batting and several pitching fields — but these are NOT in the `PlayoffPlayerStats` type because the UI doesn't display them. No data loss for currently displayed stats.
- **True remaining gap:** `pWAR` not computed for playoff MVP ranking — but this is a Franchise-specific feature, not a pipeline gap.
- **Status:** No immediate fix needed. Expand type + aggregation only when UI needs additional stat categories.

---

## MODERATE (incomplete features or dead code)

### GAP-04: SMB4 special metrics never populated
- **Severity:** MODERATE
- **Affected modes:** All (season/career aggregation gets zeros)
- **Fields:** `d3kOutcomes`, `divingCatches`, `robberies`, `nutshots` (batting), `comebackerInjuries` (pitching)
- **Root cause:** These fields are defined in `PersistedGameState` types (`gameStorage.ts:122-126, 158`) but `useGameState.ts` never tracks or populates them during gameplay
- **Impact:** Season and career stats always show 0 for these categories
- **Note:** These are SMB4-specific advanced metrics that may require UI prompt integration (per detection philosophy) before they can be tracked

### GAP-05: ~~`grandSlams` not tracked~~ ✅ FIXED (89a34c8)
- **Fix applied:** Added `grandSlams` field to `PlayerGameStats`, `createEmptyPlayerStats()`, snapshot restore, and `PersistedGameState.playerStats` type. HR with all bases occupied increments counter in `recordHit()`.
- **Verified:** Build pass, tests pass (5373/5373)

### GAP-06: ~~Fame events only write to batting records~~ ❌ FALSE POSITIVE
- **Analysis:** `getOrCreateBattingStats` creates a batting record if one doesn't exist, so fame data for pitcher-only players IS written — it creates a zero-stat batting record with the fame values. Not ideal architecturally but no data loss occurs.
- **Status:** No fix needed

### GAP-07: Orphaned IndexedDB stores never written to
- **Severity:** MODERATE (wasted schema space)
- **Stores:** `playerGameStats` (`trackerDb.ts:59-63`), `pitcherGameStats` (`trackerDb.ts:65-69`)
- **Root cause:** Stores were created in the v1 schema but game stats are embedded inline in `completedGames` records instead
- **Impact:** No functional impact — stores exist but are empty. Could be cleaned up in a future DB version bump.

### GAP-08: ~~Double `archiveCompletedGame` call per game~~ ❌ FALSE POSITIVE (intentional)
- **Analysis:** The two-phase archive is intentional. `endGame()` archives first (line 10450) so PostGameSummary can load the game immediately. Then `processCompletedGame` archives again with full aggregation data. Both use `store.put()` (idempotent overwrite). Removing the first archive would break PostGameSummary.
- **Status:** No fix needed — working as designed

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

## Priority Fix Order (Updated 2026-04-07)

| Gap | Status | Commit |
|-----|--------|--------|
| GAP-01 | ✅ FIXED | 5f7f942 |
| GAP-02 | ✅ FIXED | 5f7f942 |
| GAP-05 | ✅ FIXED | 89a34c8 |
| GAP-06 | ❌ FALSE POSITIVE | N/A |
| GAP-08 | ❌ FALSE POSITIVE | N/A |

### Remaining Gaps
1. **GAP-03** — Expand `aggregateGameToPlayoffStats` field coverage (CRITICAL — comprehensive but contained)
2. **GAP-04** — SMB4 metrics require gameplay tracking infrastructure (MODERATE — larger scope, can defer)
3. **GAP-07** — Orphaned IndexedDB stores (MODERATE — cosmetic cleanup, can defer)
4. **GAP-09** — Manager decisions tracking (LOW — future feature scaffolding)
5. **GAP-10** — Ratings snapshots for elimination (LOW — resolved by GAP-01 fix)
6. **GAP-11** — WAR orchestrator dead code (LOW — cleanup)
