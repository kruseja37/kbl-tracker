# Data Wiring Report
Date: 2026-02-07
Source: DUMMY_DATA_SCRUB_REPORT.md + FIGMA_COMPLETION_MAP.md
Baseline: Build PASS, Tests 5,445 passing / 77 failing (3 files, pre-existing)

## Summary
- Total dummy data TODOs from scrub report: 12
- Successfully wired to real data: 8
- Blocked (need new data pipelines): 2
- Remaining as correct fallbacks: 2
- Regressions: 0
- Final state: Build PASS, Tests 5,445 passing

## Wired Items

### 1. isPlayoffs — GameTracker (3 locations)
**Files Modified:** `GameTracker.tsx:106, 116, 173, 179, 1424`
**What Was Wrong:** `isPlayoffs: false` hardcoded in 3 places (usePlayerState, useFameTracking, detection context)
**What I Changed:**
- Added `playoffContext` to navigation state type
- Derived `isPlayoffs` from `gameMode === 'playoff' || !!playoffContext`
- Replaced all 3 hardcoded `isPlayoffs: false` with derived value
**Data Source:** Navigation state (already passed by WorldSeries.tsx and FranchiseHome.tsx)

### 2. Batter Grade — GameTracker
**Files Modified:** `GameTracker.tsx:56 (import), 805-812 (logic)`
**What Was Wrong:** `batterGrade = 'A'` hardcoded
**What I Changed:**
- Imported `getPlayer` from leagueBuilderStorage
- Added state + useEffect to look up `overallGrade` by `gameState.currentBatterId`
- Falls back to `'C'` if player not found or IDB unavailable
**Data Source:** `leagueBuilderStorage.getPlayer(id).overallGrade`

### 3. Team Records (W/L) — FranchiseHome (6 locations)
**Files Modified:** `useFranchiseData.ts:14-15 (imports), 62-63 (type), 402-430 (nextGame)`, `FranchiseHome.tsx:1760-1766, 1839-1840, 1866, 1876, 2023, 2177, 2371, 2407`
**What Was Wrong:** `'42-28'` and `'38-32'` hardcoded in 6 display locations + handleStartGame navigation
**What I Changed:**
- Wired `useFranchiseData.nextGame` to pull from `getNextScheduledGame()` + `calculateStandings()`
- Added `awayTeamId`/`homeTeamId` to `NextGameInfo` interface
- Joined scheduled game data with team standings for W/L records
- Replaced all 6 hardcoded record displays with dynamic `awayRecord`/`homeRecord`
**Data Source:** `scheduleStorage.getNextScheduledGame()` + `seasonStorage.calculateStandings()`

### 4. Team Names — FranchiseHome handleStartGame
**Files Modified:** `FranchiseHome.tsx:1828-1829, 1837, 1865, 1875, 2020, 2174, 2358, 2361, 2371, 2407`
**What Was Wrong:** `'TIGERS'` and `'SOX'` hardcoded in handleStartGame navigation + 8 display locations
**What I Changed:**
- Derived `awayTeamName`/`homeTeamName` from `franchiseData.nextGame`
- Replaced all hardcoded team name displays
- Stadium lookup now uses dynamic `homeTeamId` instead of `'SOX'`
**Data Source:** `useFranchiseData().nextGame` → team names from `leagueBuilderStorage.getTeam()`

### 5. Season Number — Draft Tab
**Files Modified:** `FranchiseHome.tsx:1384`
**What Was Wrong:** `"SEASON 27 DRAFT"` hardcoded
**What I Changed:** `SEASON {franchiseData.seasonNumber} DRAFT`
**Data Source:** `useFranchiseData().seasonNumber` (from seasonStorage metadata)

### 6. Season Number — Ratings Adjustment Tab
**Files Modified:** `FranchiseHome.tsx:1449`
**What Was Wrong:** `"adjust ratings for Season 4"` hardcoded
**What I Changed:** `Season {franchiseData.seasonNumber}`
**Data Source:** `useFranchiseData().seasonNumber`

### 7. Season Number — League Leaders Tab
**Files Modified:** `FranchiseHome.tsx:3299`
**What Was Wrong:** `"SEASON 1 AWARDS RACE"` hardcoded
**What I Changed:** `SEASON {franchiseData.seasonNumber} AWARDS RACE`
**Data Source:** `useFranchiseData().seasonNumber` (via `useFranchiseDataContext()`)

### 8. Season Number — Awards Tab
**Files Modified:** `FranchiseHome.tsx:3904`
**What Was Wrong:** `"SEASON 1 AWARDS CEREMONY"` hardcoded
**What I Changed:** `SEASON {franchiseData.seasonNumber} AWARDS CEREMONY`
**Data Source:** `useFranchiseData().seasonNumber` (via `useFranchiseDataContext()`)

## Blocked Items (Need New Data Pipelines)

| # | Item | Why Blocked | Complexity | Next Step |
|---|------|-------------|------------|-----------|
| 1 | AllStar ballot data (FranchiseHome:76-189) | Season stats don't track primary position; no league/division assignment for teams; vote counts are user-driven | HIGH | Build `useAllStarBallot` hook: position grouping + WAR/OPS ranking |
| 2 | Playoff stats aggregation (WorldSeries: 5+ locations) | `playoffStorage` structure exists but no aggregation pipeline connects game-tracker to playoff stats; no per-player per-series aggregation | VERY HIGH | Build playoff aggregation pipeline + `usePlayoffLeaders` hook |

## Correct Fallbacks (No Change Needed)

| # | Item | Why Correct |
|---|------|-------------|
| 1 | WorldSeries league names (mockLeagues) | Falls back to mock when no league data loaded — correct pattern |
| 2 | WorldSeries playoff stats (5 mock data blocks) | Falls back to mock when no playoff data — correct pattern |

These use the `|| mockDefault` pattern and will auto-switch to real data when the storage layer provides it. The BLOCKED items above are the missing storage layer.

## Test Count Delta
- Before: 5,445 tests passing
- After: 5,445 tests passing
- New tests added: 0
- Tests that changed: 0
