# Dummy Data Scrub Report

**Date:** February 7, 2026
**Skill:** dummy-data-scrubber
**Build Status:** TSC EXIT 0
**Test Baseline:** 5,445 pass / 77 fail / 5,522 total / 123 files (0 regressions)

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Files scanned | 85+ (all pages, components, hooks, engines) |
| Instances found | 36 locations across 15 files |
| Instances fixed (Phase 1) | 3 (code changes applied) |
| Instances wired to real data (Phase 2) | 8 (isPlayoffs, grade, records, names, stadium, 4 season numbers) |
| Instances documented/blocked | 6 (AllStar ballot, 5 WorldSeries playoff items) |
| Instances kept (correct fallbacks) | 21 |
| Missing data sources identified | 2 (AllStar ballot hook, Playoff aggregation pipeline) |

---

## Fixed

| # | File | What Was | What Is Now | Data Source |
|---|------|----------|-------------|-------------|
| 1 | `src/src_figma/app/data/mockData.ts` | Orphaned mock data file (mockLeagues, getSavedFranchises, saveFranchise) | **DELETED** — 0 production imports, dead code | N/A |
| 2 | `GameTracker.tsx:2694-2703` | ~60 lines of hardcoded beat reporter HTML with static headlines/commentary | `<NarrativePreview>` component from NarrativeDisplay.tsx — dynamically generates beat reporter content from game state via narrativeEngine | `narrativeEngine.ts` → `NarrativeDisplay.tsx` |
| 3 | `FranchiseHome.tsx:1821` | Hardcoded `"game-123"` route param | Dynamic unique ID: `` `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` `` | Generated per game |

---

## Documented as TODO — Status Update (Feb 7, 2026)

| # | File | Current Value | Status | Resolution |
|---|------|---------------|--------|------------|
| 1 | `GameTracker.tsx` | `isPlayoffs: false` | ✅ **WIRED** | Derived from `gameMode` + `playoffContext` in navigation state |
| 2 | `GameTracker.tsx` | `batterGrade = 'A'` | ✅ **WIRED** | Async lookup from `leagueBuilderStorage.getPlayer(id).overallGrade` |
| 3 | `FranchiseHome.tsx` | ~65 hardcoded All-Star ballot records | ⏳ **BLOCKED** | Needs `useAllStarBallot` hook (position grouping + WAR/OPS ranking) |
| 4 | `FranchiseHome.tsx` | `'TIGERS'`, `'SOX'` team names | ✅ **WIRED** | From `useFranchiseData().nextGame` → `leagueBuilderStorage.getTeam()` |
| 5 | `FranchiseHome.tsx` | `'42-28'`, `'38-32'` win-loss records | ✅ **WIRED** | From `useFranchiseData().nextGame` → `seasonStorage.calculateStandings()` |
| 6 | `FranchiseHome.tsx` | `getStadiumForTeam('SOX')` | ✅ **WIRED** | Now uses dynamic `homeTeamId` from `nextGame` |
| 7 | `WorldSeries.tsx` | `mockTeams` bracket data | ⏳ **BLOCKED** | Needs playoff aggregation pipeline |
| 8 | `WorldSeries.tsx` | Hardcoded playoff stats | ⏳ **BLOCKED** | Needs playoff aggregation pipeline |
| 9 | `WorldSeries.tsx` | Hardcoded all-time playoff records | ⏳ **BLOCKED** | Needs playoff aggregation pipeline |
| 10 | `WorldSeries.tsx` | Hardcoded per-player series stats | ⏳ **BLOCKED** | Needs playoff aggregation pipeline |
| 11 | `WorldSeries.tsx` | Mock 25-man roster data | ⏳ **BLOCKED** | Needs playoff aggregation pipeline |
| 12 | `WorldSeries.tsx` | `mockLeagues` array | ⏳ Correct fallback | Auto-switches when league data loaded |

**Additionally wired (not originally in scrub report):**
- `SEASON 27 DRAFT` → `SEASON {seasonNumber} DRAFT` (FranchiseHome.tsx)
- `Season 4` ratings text → `Season {seasonNumber}` (FranchiseHome.tsx)
- `SEASON 1 AWARDS RACE` → `SEASON {seasonNumber} AWARDS RACE` (FranchiseHome.tsx)
- `SEASON 1 AWARDS CEREMONY` → `SEASON {seasonNumber} AWARDS CEREMONY` (FranchiseHome.tsx)

---

## Kept as Fallback (Correct Pattern)

These use the `|| 'default'` or `hasRealData === false` pattern — they show dummy data ONLY when no real data exists, and switch to real data when available. This is the correct architectural pattern.

| # | File | Location | Pattern | Justification |
|---|------|----------|---------|---------------|
| 1 | `GameTracker.tsx` | Line 98 | `awayTeamName = navigationState?.awayTeamName \|\| 'TIGERS'` | Intentional fallback — primary source is navigationState |
| 2 | `GameTracker.tsx` | Line 99 | `homeTeamName = navigationState?.homeTeamName \|\| 'SOX'` | Same pattern |
| 3 | `useMuseumData.ts` | Throughout | `MOCK_MUSEUM_*` arrays with `if (!hasRealData)` guard | Shows placeholder until real museum data exists |
| 4 | `useFranchiseData.ts` | Throughout | `MOCK_FRANCHISE_*` with `if (!realData?.length)` guard | Shows placeholder until franchise data exists |
| 5 | `usePlayoffData.ts` | Throughout | `MOCK_PLAYOFF_*` with fallback pattern | Shows placeholder until playoff data exists |
| 6 | `MuseumContent.tsx` | Line 25 | `MOCK_TEAMS` array with `hasRealData === false` guard | Correct empty-state fallback |
| 7 | `TeamHubContent.tsx` | Lines 14-17 | `MOCK_TEAMS`, `MOCK_STADIUMS` with `realTeams.length === 0` guard | Correct empty-state fallback |
| 8 | `FreeAgencyFlow.tsx` | Throughout | Mock free agents with fallback pattern | Used when no league data loaded |
| 9 | `DraftFlow.tsx` | Throughout | Mock draft prospects with fallback pattern | Used when no league data loaded |
| 10 | `TradeFlow.tsx` | Lines 125-291 | `MOCK_TEAMS`, `mockAIProposals` with `!franchise?.teams?.length` guard | Correct — loads real data from useFranchiseData when available |
| 11-21 | Various offseason flows | Throughout | Mock data with empty-state guards | ContractionExpansionFlow, RuleChanges, etc. |

---

## Placeholder Screens (Architectural TODOs, Not Dummy Data)

| File | Screens | Description |
|------|---------|-------------|
| `ContractionExpansionFlow.tsx` | Screens 6-11 (lines 1006-1247) | 6 unimplemented placeholder screens — these are feature stubs, not dummy data to scrub |

---

## Missing Data Sources (New Work Needed)

| # | What's Needed | Where It's Used | Suggested Implementation |
|---|---------------|-----------------|--------------------------|
| 1 | `useAllStarBallot` hook | FranchiseHome All-Star tab | Query `seasonStorage` for top players by position per league, sorted by WAR/OPS |
| 2 | `getTeamRecord(teamId)` | FranchiseHome (6 locations) | Add to `seasonStorage` — aggregate W/L from `completedGames` by team |
| 3 | `isPlayoffs` route param | GameTracker (3 locations) | Add `isPlayoffs: boolean` to navigation state in route params |
| 4 | `usePlayerGrade(playerId)` | GameTracker batter grade display | Look up `overallGrade` from `leagueBuilderStorage.globalPlayers` by player ID |
| 5 | Playoff stats aggregation | WorldSeries (5+ locations) | Extend `playoffStorage` to aggregate batting/pitching lines per player per series |
| 6 | Franchise team name resolution | FranchiseHome handleStartGame | Wire `useFranchiseData().teams` or `scheduleStorage` matchup for team names |

---

## Scan Coverage

### Patterns Searched
1. ✅ Direct `mockData` imports → 0 production consumers (DEAD CODE — file deleted)
2. ✅ Hardcoded SMB4 team names (`TIGERS`, `SOX`, `Herbisaurs`, etc.)
3. ✅ Generic placeholder strings (`placeholder`, `sample`, `TODO`, `TBD`, `lorem`)
4. ✅ Suspicious numeric literals in components (0.300, 3.50, stat-like numbers)
5. ✅ Inline array/object literals in pages/components
6. ✅ Default prop values with uppercase strings
7. ✅ Commented-out data fetching code

### Files Scanned
- **Pages (14):** GameTracker, FranchiseHome, FranchiseSetup, ExhibitionGame, PostGameSummary, WorldSeries, AppHome, LeagueBuilder (7 variants)
- **Components (45):** All 36 .tsx components + 9 modals
- **Hooks (27):** All hooks in src/hooks/, src/src_figma/hooks/, src/src_figma/app/hooks/
- **Engines (17):** Base engines + integration wrappers
- **Data files:** mockData.ts (deleted)

---

## Conclusion

The codebase is **well-architected for dynamic data**. Most dummy data follows the correct fallback pattern (`realData || mockDefault`) and will automatically switch to real data when the storage/hook layer provides it. The 3 actionable fixes were applied:

1. **Deleted** orphaned `mockData.ts` (dead code cleanup)
2. **Replaced** hardcoded beat reporter HTML with dynamic `NarrativePreview` component (wired to existing narrativeEngine)
3. **Replaced** hardcoded `game-123` with unique generated game IDs

The remaining 12 documented items all need **new data source features** (hooks, storage methods, route params) that don't exist yet. These are properly documented with TODO comments that specify the exact data source needed.

**Verdict: PASS. All actionable dummy data has been scrubbed. Remaining items are feature requests for new data sources.**
