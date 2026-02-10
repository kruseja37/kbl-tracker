# Data Pipeline Trace Report

Generated: 2026-02-09
Updated: 2026-02-09 (post-CRIT fixes)
Pipelines traced: 11
  High priority: 4
  Medium priority: 4
  Low priority: 3

## Pipeline Summary

| ID | Name | Junctions | Status | Variants Tested | Issues |
|----|------|-----------|--------|-----------------|--------|
| PL-01 | Game → Season Batting Stats | 5 | ✅ INTACT | 3/3 | Remaining: HBP/SF/SAC/GIDP not tracked (MEDIUM) |
| PL-02 | Game → Season Pitching Stats | 5 | ✅ INTACT | 3/3 | Remaining: hitBatters/wildPitches now wired; some minor fields still 0 |
| PL-03 | Game → Standings | 5 | ✅ INTACT | 3/3 | Remaining: division assignment arbitrary (MEDIUM) |
| PL-04 | Game → WAR Recalculation | 6 | ✅ INTACT | 3/3 | Data quality improved (team/name correct) |
| PL-05 | Game → Season Fielding Stats | 5 | ⚠️ NEEDS FEATURE WORK | 2/3 | Source data always 0 — fielding inference not wired |
| PL-06 | Game → Fame Aggregation | 4 | ✅ INTACT | 2/3 | Minor: playerTeam always '' |
| PL-07 | Game → Game Archive | 3 | ✅ INTACT | 2/3 | 0 |
| PL-08 | Game → Milestone Detection | 4 | ✅ INTACT | 1/3 | 0 |
| PL-09 | Game → Pitcher Decisions (Season) | 4 | ✅ INTACT | 2/3 | 0 — W/L/SV/H/BS now flow to season stats |
| PL-10 | Game → Career Stats | 4 | ✅ INTACT | 1/3 | 0 (via milestoneAggregator) |
| PL-11 | Game → Season Game Count | 2 | ✅ INTACT | 1/3 | 0 |

## Fixes Applied (2026-02-09)

| CRIT ID | Fix | Files Changed | Build/Test |
|---------|-----|---------------|------------|
| CRIT-01 | Added `seasonId` to `CompletedGameRecord` in `archiveCompletedGame()` | `src/src_figma/utils/gameStorage.ts`, `src/utils/gameStorage.ts`, `src/src_figma/hooks/useGameState.ts` (2 call sites) | ✅ 5094/5094 |
| CRIT-03 | Fixed team assignment: batters → correct team via lineup refs, pitchers → correct team via ID prefix | `src/src_figma/hooks/useGameState.ts` (both code paths), `src/utils/seasonAggregator.ts` | ✅ 5094/5094 |
| CRIT-04 | Added `playerName` + `teamId` to `PersistedGameState.playerStats` type; populated from lineup refs | Both `gameStorage.ts`, `useGameState.ts`, `useGamePersistence.ts`, `GameTracker/index.tsx` | ✅ 5094/5094 |
| CRIT-02 | Added decision fields to `PersistedGameState.pitcherGameStats`; serialized W/L/SV/H/BS; aggregated in `aggregatePitchingStats()` | Both `gameStorage.ts`, `useGameState.ts`, `useGamePersistence.ts`, `GameTracker/index.tsx`, `seasonAggregator.ts` | ✅ 5094/5094 |
| CRIT-05 | Documented as NEEDS FEATURE WORK — fielding infrastructure exists (FieldingEvent, logFieldingEvent, fieldingStatsAggregator) but is orphaned | Comment added to `useGameState.ts` | ✅ 5094/5094 |

---

## PREFLIGHT PROOF

**Pipeline tested:** PL-01 (Game → Season Batting Stats)
**Result:** Successfully traced from `useGameState.ts:2822` through every junction to `FranchiseHome.tsx:2895`.
**Approach validated:** YES — every junction is code-readable with file:line evidence.

---

## Phase 1: Pipeline Catalog

### Source 1: Fan-Out Topology (from FRANCHISE_API_MAP.md)

The game completion fan-out from `completeGameInternal()` at `useGameState.ts:2822`:

```
completeGameInternal()
  ├─→ completeGame()                    → eventLog (mark complete)
  ├─→ calculatePitcherDecisions()       → PitcherGameStats (in-memory)
  ├─→ aggregateGameToSeason()           → PL-01, PL-02, PL-05, PL-06, PL-08, PL-09, PL-11
  │     ├─→ aggregateBattingStats()     → IndexedDB: playerSeasonBatting
  │     ├─→ aggregatePitchingStats()    → IndexedDB: playerSeasonPitching
  │     ├─→ aggregateFieldingStats()    → IndexedDB: playerSeasonFielding
  │     ├─→ aggregateFameEvents()       → IndexedDB: playerSeasonBatting (fame fields)
  │     ├─→ incrementSeasonGames()      → IndexedDB: seasons
  │     └─→ aggregateGameWithMilestones() → IndexedDB: milestones + career stats
  ├─→ markGameAggregated()              → eventLog (prevent re-aggregation)
  └─→ archiveCompletedGame()            → IndexedDB: completedGames (PL-03, PL-07)
```

### Source 2: Button Audit (Tier A Wired Elements)

From `button-audit-data.json`, 8 Tier A wired elements trigger data pipelines:
- `GT-END-GAME` → triggers `endGame()` → `completeGameInternal()` (all fan-out)
- Roster/lineup management buttons → separate pipelines (not in scope for this trace)

### Pipeline Catalog

| ID | Name | Entry Point | Trigger | Priority |
|----|------|-------------|---------|----------|
| PL-01 | Game → Season Batting Stats | `aggregateBattingStats()` | Game completion | HIGH |
| PL-02 | Game → Season Pitching Stats | `aggregatePitchingStats()` | Game completion | HIGH |
| PL-03 | Game → Standings | `archiveCompletedGame()` → `calculateStandings()` | Game completion + page load | HIGH |
| PL-04 | Game → WAR Recalculation | `useSeasonStats` → WAR engines | Page load (computed on-the-fly) | HIGH |
| PL-05 | Game → Season Fielding Stats | `aggregateFieldingStats()` | Game completion | MEDIUM |
| PL-06 | Game → Fame Aggregation | `aggregateFameEvents()` | Game completion | MEDIUM |
| PL-07 | Game → Game Archive | `archiveCompletedGame()` | Game completion | MEDIUM |
| PL-08 | Game → Milestone Detection | `aggregateGameWithMilestones()` | Game completion | MEDIUM |
| PL-09 | Game → Pitcher Decisions (Season) | `calculatePitcherDecisions()` → `aggregatePitchingStats()` | Game completion | HIGH (reclassified) |
| PL-10 | Game → Career Stats | `aggregateGameWithMilestones()` | Game completion | LOW |
| PL-11 | Game → Season Game Count | `incrementSeasonGames()` | Game completion | LOW |

---

## Phase 2: Detailed Pipeline Traces

---

### PL-01: Game → Season Batting Stats (HIGH)

**PIPELINE STATUS: PARTIALLY BROKEN**

#### Junction 1: TRANSFORM (PersistedGameState construction)
- **Location:** `src/src_figma/hooks/useGameState.ts:2832-2937`
- **Input:** React state: `playerStats` Map, `pitcherStats` Map, `fameEvents` array, `gameState` object
- **Output:** `PersistedGameState` object
- **Function:** Inline construction in `completeGameInternal()`
- **Verified:** YES — construction happens at lines 2894-2937
- **Data loss risks:**
  - ⚠️ **Line 2842-2844:** `putouts: 0, assists: 0, fieldingErrors: 0` — **ALL FIELDING DATA IS ZEROED OUT** in playerStatsRecord. The game tracks plays but doesn't accumulate putouts/assists per player during gameplay.
  - ⚠️ **Line 2870:** `pitcherName: pitcherId` — pitcher name is set to pitcher ID (placeholder)
  - ⚠️ **Line 2871:** `teamId: gameState.homeTeamId` — ALL pitchers assigned to home team
  - ⚠️ **Line 2872:** `isStarter: pitcherGameStatsArray.length === 0` — Only first pitcher in Map is marked as starter. Map iteration order may not match entry order.
  - ⚠️ **Line 2904-2906:** Base runners set to `playerId: 'unknown'` — runners lose identity at game end

#### Junction 2: AGGREGATE (Season stat accumulation)
- **Location:** `src/utils/seasonAggregator.ts:141-175`
- **Input:** `PersistedGameState.playerStats` + existing `PlayerSeasonBatting`
- **Output:** Updated `PlayerSeasonBatting`
- **Function:** `aggregateBattingStats()`
- **Verified:** YES — function exists and accepts correct input
- **Data loss risks:**
  - ⚠️ **Line 148:** `playerName = playerId` — PLACEHOLDER. Player names in season stats will be player IDs, not human-readable names.
  - ⚠️ **Line 149:** `teamId = gameState.awayTeamId` — ALL PLAYERS assigned to away team. This is wrong for home team players.
  - ⚠️ **Line 170:** Comment: "HBP, SF, SAC, GIDP would need to be tracked" — `hitByPitch`, `sacFlies`, `sacBunts`, `gidp` fields exist in `PlayerSeasonBatting` but are NEVER populated from game data. They will always be 0.

#### Junction 3: STORE (IndexedDB write)
- **Location:** `src/utils/seasonStorage.ts:426-437` (updateBattingStats)
- **Input:** Updated `PlayerSeasonBatting` object
- **Storage:** IndexedDB store `playerSeasonBatting`, keyPath `['seasonId', 'playerId']`
- **Verified:** YES — `updateBattingStats()` calls `store.put(stats)` which upserts
- **Mismatch risk:** None — write schema matches read schema exactly

#### Junction 4: RETRIEVE (Season stats query)
- **Location:** `src/hooks/useSeasonStats.ts:324-370` (loadStats function inside useEffect)
- **Hook:** `useSeasonStats(seasonId)`
- **Output:** `BattingLeaderEntry[]` with derived stats (avg, obp, slg, ops) + WAR computed on-the-fly
- **Verified:** YES — `getAllBattingStats(seasonId)` reads from same store and keyPath
- **Mismatch risk:** None — reads `PlayerSeasonBatting` and extends with computed fields

#### Junction 5: RENDER (Display in franchise UI)
- **Location:** `src/src_figma/hooks/useFranchiseData.ts:328-341` → `FranchiseHome.tsx:2895-3500`
- **Component:** `LeagueLeadersContent` and `TeamHubContent`
- **Input:** `BattingLeaderEntry[]` from `useSeasonStats` via `useFranchiseData`
- **Displays:** AVG, HR, RBI, SB, OPS, WAR (top 5 per stat)
- **Missing displays:** HBP, SF, SAC, GIDP always show 0 (data never populated)
- **Verified:** YES — context provider pattern connects hook data to display components

#### Three-Variant Analysis

**Variant 1: Happy Path** — PARTIALLY PASSES
- Data flows from game through aggregation to display
- Counting stats (H, 2B, 3B, HR, RBI, R, BB, K, SB, CS) aggregate correctly
- Derived stats (AVG, OBP, SLG, OPS) calculated correctly from counting stats
- **BUT:** playerName is wrong (shows player ID), teamId is wrong (all assigned to away team)

**Variant 2: Partial Data** — PASSES WITH WARNINGS
- Player with 0 PA: Skipped in WAR calculation (`if (stats.pa === 0) continue;` at useSeasonStats.ts/useWARCalculations.ts)
- Player with 0 hits: AVG = 0.000, no crash (division by 0 handled in `calculateBattingDerived`)
- Missing fields (HBP, SF, SAC, GIDP): Default to 0 in storage init — displays 0 (technically correct but incomplete)

**Variant 3: Duplicate Game** — PROTECTED
- `markGameAggregated()` at `useGameState.ts:2944` prevents re-aggregation
- But protection is in the orchestrator only — if `aggregateGameToSeason()` is called directly (e.g., from legacy GameTracker/index.tsx:959), no dedup guard exists in the aggregation function itself

---

### PL-02: Game → Season Pitching Stats (HIGH)

**PIPELINE STATUS: PARTIALLY BROKEN**

#### Junction 1: TRANSFORM (PersistedGameState.pitcherGameStats)
- **Location:** `src/src_figma/hooks/useGameState.ts:2866-2891`
- **Input:** `pitcherStats` Map from useGameState
- **Output:** `PersistedGameState.pitcherGameStats` array
- **Verified:** YES
- **Data loss risks:**
  - ⚠️ **Line 2870:** `pitcherName: pitcherId` — PLACEHOLDER name
  - ⚠️ **Line 2871:** `teamId: gameState.homeTeamId` — ALL pitchers assigned to home team
  - ⚠️ **Line 2881:** `hitBatters: 0` — HARDCODED to 0, even if pitchers actually hit batters
  - ⚠️ **Line 2882:** `basesReachedViaError: 0` — HARDCODED to 0
  - ⚠️ **Line 2883:** `wildPitches: 0` — HARDCODED to 0 (but stats.wildPitches may exist?)
  - ⚠️ **Line 2886-2888:** `consecutiveHRsAllowed: 0, firstInningRuns: 0, basesLoadedWalks: 0` — ALL hardcoded

#### Junction 2: AGGREGATE
- **Location:** `src/utils/seasonAggregator.ts:180-234`
- **Input:** `PersistedGameState.pitcherGameStats` + existing `PlayerSeasonPitching`
- **Output:** Updated `PlayerSeasonPitching`
- **Function:** `aggregatePitchingStats()`
- **Verified:** YES
- **Data loss:**
  - ⚠️ **Line 229:** W/L/SV/H/BS are NEVER aggregated. Comment: "Note: W/L/SV/H/BS would need decision tracking." The `PersistedGameState.pitcherGameStats` array doesn't carry decision fields — they're on the in-memory `PitcherGameStats` Map which is NOT serialized.
  - The `PlayerSeasonPitching` type HAS `wins`, `losses`, `saves`, `holds`, `blownSaves` fields (seasonStorage.ts:159-163) but they are NEVER incremented by `aggregatePitchingStats()`.

#### Junction 3: STORE
- **Location:** `src/utils/seasonStorage.ts:439-450` (updatePitchingStats)
- **Verified:** YES — same pattern as batting

#### Junction 4: RETRIEVE
- **Location:** `src/hooks/useSeasonStats.ts:247-270` (toPitchingLeaderEntry)
- **Hook:** `useSeasonStats(seasonId).getPitchingLeaders()`
- **Verified:** YES
- **Display fields:** ERA, WHIP, IP, pWAR, plus wins, strikeouts, saves from seasonStats
- **Issue:** Wins and saves will always be 0 in the leaderboard since they're never aggregated

#### Junction 5: RENDER
- **Location:** `src/src_figma/hooks/useFranchiseData.ts:344-357` → `FranchiseHome.tsx`
- **Verified:** YES

#### Three-Variant Analysis

**Variant 1: Happy Path** — PARTIALLY PASSES
- Counting stats (outsRecorded, hitsAllowed, runsAllowed, earnedRuns, walksAllowed, strikeouts, HR allowed) aggregate correctly
- ERA, WHIP calculated correctly from counting stats
- Achievements (QS, CG, SO, NH, PG) detected and aggregated correctly
- **CRITICAL:** Wins/Losses/Saves always 0. The "W" and "SV" leader boards will be empty.

**Variant 2: Partial Data** — PASSES
- Pitcher with 0 IP: Skipped in WAR calculation, ERA shows Infinity (handled in display with "-.--")

**Variant 3: Duplicate Game** — PROTECTED (same as PL-01, via orchestrator)

---

### PL-03: Game → Standings (HIGH)

**PIPELINE STATUS: BROKEN AT JUNCTION 2→3**

#### Junction 1: STORE (Game archive)
- **Location:** `src/src_figma/utils/gameStorage.ts:283-320` (archiveCompletedGame — figma version)
- **Also:** `src/utils/gameStorage.ts:278-310` (base version)
- **Input:** `PersistedGameState` + `finalScore` + `inningScores`
- **Output:** `CompletedGameRecord` written to IndexedDB `completedGames` store
- **Verified:** YES
- **CRITICAL ISSUE:** `seasonId` field exists in `CompletedGameRecord` type (line 266) but is **NEVER SET** during archival. The `archiveCompletedGame()` function at line 290-304 constructs the record without including `seasonId`.

#### Junction 2: RETRIEVE (Get recent games)
- **Location:** `src/utils/gameStorage.ts:315-341` (getRecentGames)
- **Called by:** `src/utils/seasonStorage.ts:786` via `calculateStandings()`
- **Output:** `CompletedGameRecord[]` (up to 500 games, sorted by date descending)
- **Verified:** YES — cursor opens on `date` index

#### Junction 3: FILTER + CALCULATE (Standings calculation)
- **Location:** `src/utils/seasonStorage.ts:784-917`
- **Function:** `calculateStandings(seasonId?)`
- **CRITICAL BUG:**
  - Line 789-791: `const seasonGames = seasonId ? games.filter(g => g.seasonId === seasonId) : games;`
  - Since `seasonId` is NEVER set on `CompletedGameRecord`, `g.seasonId` is always `undefined`
  - When called with `seasonId = 'season-1'`: `undefined === 'season-1'` → FALSE for ALL games
  - **Result: `seasonGames` array is ALWAYS EMPTY when a seasonId is passed**
  - **Standings will show NO teams and NO data**
- **HOWEVER:** `useFranchiseData.ts:367` calls `calculateStandings(seasonId)` with `seasonId = 'season-1'`
- **And:** `useFranchiseData.ts:383` falls back to `MOCK_STANDINGS` when `realStandings.length === 0`
- **Net effect:** Standings ALWAYS show mock data, never real data. The pipeline is completely broken but masked by the mock fallback.

#### Junction 4: TRANSFORM (to UI format)
- **Location:** `src/src_figma/hooks/useFranchiseData.ts:381-420`
- **Function:** Converts `TeamStanding[]` → `LeagueStandings` (Eastern/Western divisions)
- **Verified:** YES — but never reached because J3 returns empty array
- **Additional issue:** Division assignment is arbitrary (`slice(0, half)` / `slice(half)`) — no actual league/division configuration exists

#### Junction 5: RENDER
- **Location:** `src/src_figma/app/pages/FranchiseHome.tsx:1645-1724` (StandingsContent)
- **Verified:** YES — displays `standings[selectedLeague]` with W-L-PCT-GB-RD columns
- **Net display:** Always shows mock standings

#### Three-Variant Analysis

**Variant 1: Happy Path** — FAILS (seasonId filter blocks all games)
**Variant 2: Partial Data** — NOT REACHED (pipeline broken before this point)
**Variant 3: Duplicate Game** — NOT REACHED

**Workaround discovery:** If `calculateStandings()` were called WITHOUT a seasonId parameter, it would skip the filter and process ALL games. But all callers pass a seasonId.

---

### PL-04: Game → WAR Recalculation (HIGH)

**PIPELINE STATUS: INTACT (but quality depends on PL-01/PL-02)**

#### Junction 1: RETRIEVE (Season stats from IndexedDB)
- **Location (Primary):** `src/hooks/useSeasonStats.ts:324-370`
- **Location (Legacy):** `src/hooks/useWARCalculations.ts:286-290`
- **Functions:** `getAllBattingStats()`, `getAllPitchingStats()`, `getAllFieldingStats()`
- **Verified:** YES — both hooks read from the same IndexedDB stores that PL-01/PL-02 write to

#### Junction 2: TRANSFORM (Stats → WAR input format)
- **Location:** `src/hooks/useSeasonStats.ts:103-155`
- **Functions:** `seasonBattingToWAR()`, `seasonPitchingToWAR()`, `seasonBattingToBaserunning()`
- **Verified:** YES — all conversion functions map fields correctly
- **Notes:**
  - `intentionalWalks: 0` — not tracked in SMB4 (correct)
  - `gidpOpportunities: Math.round(stats.pa * 0.15)` — estimated at ~15% of PA
  - `hitByPitch: stats.hitByPitch` — will always be 0 (never populated, per PL-01 findings)

#### Junction 3: CALCULATE (WAR engines)
- **Location:** `src/engines/bwarCalculator.ts` → `calculateBWARSimplified()`
- **Location:** `src/engines/pwarCalculator.ts` → `calculatePWARSimplified()`
- **Location:** `src/engines/fwarCalculator.ts` → `calculateFWARFromStats()`
- **Location:** `src/engines/rwarCalculator.ts` → `calculateRWARSimplified()`
- **Verified:** YES — all 4 engines exist, accept correct types, return WAR values
- **Fallback:** Each WAR calculation is wrapped in try/catch, defaults to 0 on failure

#### Junction 4: AGGREGATE (Total WAR)
- **Location:** `src/hooks/useSeasonStats.ts:240` → `totalWAR: bWAR + fWAR + rWAR`
- **Location:** `src/hooks/useWARCalculations.ts:430-460` → leaderboard construction
- **Verified:** YES

#### Junction 5: RENDER (WAR display)
- **Location:** `src/components/GameTracker/WARDisplay.tsx` → WARPanel, WARLeaderboard, WARBadge
- **Location:** `src/src_figma/app/pages/FranchiseHome.tsx` → LeagueLeadersContent (WAR column)
- **Verified:** YES — multiple display paths exist

#### Junction 6: CONTEXT (FranchiseHome integration)
- **Location:** `src/src_figma/hooks/useFranchiseData.ts:339,355` → WAR leaderboards
- **Verified:** YES

#### Three-Variant Analysis

**Variant 1: Happy Path** — PASSES (with caveats)
- WAR calculations work correctly from stored data
- bWAR, pWAR, fWAR, rWAR all computed and displayed
- **Caveat:** Since HBP/SF/SAC/GIDP are always 0, wOBA is slightly inaccurate (denominator off)
- **Caveat:** Since pitcher W/L/SV are 0, the pitcher pWAR role detection (starter vs reliever) uses `gamesStarted` / `gamesAppeared` ratio, which IS populated correctly

**Variant 2: Partial Data** — PASSES
- 0 PA → skipped (no WAR calculated)
- 0 IP → skipped
- 0 fielding games → skipped
- All handlers graceful

**Variant 3: Duplicate Game** — N/A (WAR is computed on-the-fly, not stored)

---

### PL-05: Game → Season Fielding Stats (MEDIUM)

**PIPELINE STATUS: PARTIALLY BROKEN**

#### Junction 1: TRANSFORM
- **Location:** `src/src_figma/hooks/useGameState.ts:2842-2844`
- **CRITICAL:** `putouts: 0, assists: 0, fieldingErrors: 0` — ALL fielding stats in `playerStatsRecord` are HARDCODED TO ZERO
- The game tracks plays (fly outs, ground outs, etc.) but doesn't accumulate putouts/assists/errors per fielder

#### Junction 2: AGGREGATE
- **Location:** `src/utils/seasonAggregator.ts:239-261`
- **Input:** Always receives `putouts: 0, assists: 0, fieldingErrors: 0` from J1
- **Output:** Season totals remain at 0 forever
- **Result:** The aggregation function works correctly but receives only zeroes

#### PIPELINE STATUS: BROKEN AT J1 (source data always zero)

---

### PL-06: Game → Fame Aggregation (MEDIUM)

**PIPELINE STATUS: INTACT**

#### Junction 1: TRANSFORM
- **Location:** `src/src_figma/hooks/useGameState.ts:2916-2930`
- **Fame events mapped from in-memory array to `PersistedGameState.fameEvents`**
- **Minor issue:** `playerTeam: ''` (always empty string) — but fame aggregation doesn't use this field

#### Junction 2: AGGREGATE
- **Location:** `src/utils/seasonAggregator.ts:266-306`
- **Function:** `aggregateFameEvents()` — groups by player, sums bonuses/boners
- **Writes to:** `PlayerSeasonBatting.fameBonuses`, `.fameBoners`, `.fameNet`
- **Verified:** YES — correctly splits bonus vs boner and updates batting stats

#### Junction 3: STORE → same as PL-01 J3

#### Junction 4: RETRIEVE + RENDER → fameNet displayed in leaderboards via useSeasonStats

---

### PL-07: Game → Game Archive (MEDIUM)

**PIPELINE STATUS: INTACT**

#### Junction 1: STORE
- **Location:** `src/src_figma/utils/gameStorage.ts:283-320` (archiveCompletedGame)
- **Writes:** Full game record including playerStats, pitcherGameStats, inningScores, fameEvents
- **Verified:** YES

#### Junction 2: RETRIEVE
- **Location:** `src/src_figma/utils/gameStorage.ts:356-373` (getCompletedGameById)
- **Called by:** PostGameSummary page
- **Verified:** YES

#### Junction 3: RENDER
- **Location:** `src/src_figma/app/pages/PostGameSummary.tsx:21-64`
- **Displays:** Box score, pitcher lines, fame events
- **Verified:** YES

---

### PL-08: Game → Milestone Detection (MEDIUM)

**PIPELINE STATUS: INTACT**

- **Location:** `src/utils/milestoneAggregator.ts`
- **Trigger:** Called from `aggregateGameToSeason()` when `detectMilestones = true` (default)
- **Actions:** Checks season and career thresholds, generates FameEvents for milestones
- **Storage:** Career milestones written to IndexedDB via `recordCareerMilestone()`
- **Verified:** YES — function chain is complete

---

### PL-09: Game → Pitcher Decisions in Season Stats (HIGH — reclassified)

**PIPELINE STATUS: BROKEN AT J3**

#### Junction 1: CALCULATE
- **Location:** `src/src_figma/hooks/useGameState.ts:739-891`
- **Function:** `calculatePitcherDecisions()` — sophisticated lead-change tracking
- **Sets:** `.decision = 'W'/'L'`, `.save = true`, etc. on PitcherGameStats Map entries
- **Verified:** YES

#### Junction 2: SERIALIZE
- **Location:** `src/src_figma/hooks/useGameState.ts:2866-2891`
- **CRITICAL:** The serialization from Map to `PersistedGameState.pitcherGameStats` array DOES NOT INCLUDE decision fields. The `pitcherGameStats` array interface has: `pitcherId, pitcherName, teamId, isStarter, outsRecorded, hitsAllowed, runsAllowed, earnedRuns, walksAllowed, strikeoutsThrown, homeRunsAllowed, hitBatters, ...` — but NO `win`, `loss`, `save`, `hold`, `blownSave` fields.

#### Junction 3: AGGREGATE (BROKEN)
- **Location:** `src/utils/seasonAggregator.ts:229`
- **Comment:** "Note: W/L/SV/H/BS would need decision tracking"
- **Result:** `PlayerSeasonPitching.wins/losses/saves/holds/blownSaves` are NEVER incremented
- **Impact:** Win/Loss/Save leaderboards always empty. ERA leaderboard works but W-L record always shows 0-0.

#### Note: Career path IS functional
- The `milestoneAggregator.ts:194-198` DOES aggregate decisions to career stats — but it reads from a different data structure (career aggregation happens before the PitcherGameStats Map is discarded)

---

### PL-10: Game → Career Stats (LOW)

**PIPELINE STATUS: INTACT**

- Via `aggregateGameWithMilestones()` → `aggregateGameToCareerBatting()` and `aggregateGameToCareerPitching()`
- Career stats correctly include pitcher decisions (W/L/SV/H/BS)
- **Verified:** YES — milestoneAggregator reads from the full pitcher stats before serialization

---

### PL-11: Game → Season Game Count (LOW)

**PIPELINE STATUS: INTACT**

- **Location:** `src/utils/seasonStorage.ts` → `incrementSeasonGames()`
- **Called from:** `src/utils/seasonAggregator.ts:93`
- **Effect:** Increments `seasons.gamesPlayed` in IndexedDB
- **Verified:** YES

---

## Phase 3: Three-Variant Analysis Summary

### Critical Findings by Variant

#### Happy Path Failures

| Pipeline | Issue | Severity | Root Cause |
|----------|-------|----------|------------|
| PL-01 | playerName = playerId | HIGH | Placeholder never replaced (seasonAggregator.ts:148) |
| PL-01 | ALL players → awayTeamId | HIGH | Placeholder never replaced (seasonAggregator.ts:149) |
| PL-02 | ALL pitchers → homeTeamId | HIGH | Placeholder in useGameState.ts:2871 |
| PL-02 | W/L/SV never written to season | CRITICAL | Decisions not in PersistedGameState (useGameState.ts:2866-2891) |
| PL-03 | Standings always empty/mock | CRITICAL | seasonId never set on CompletedGameRecord (gameStorage.ts:290-304) |
| PL-05 | Fielding stats always 0 | HIGH | putouts/assists hardcoded to 0 (useGameState.ts:2842-2844) |

#### Partial Data Findings

| Pipeline | Issue | Severity |
|----------|-------|----------|
| PL-01 | HBP/SF/SAC/GIDP always 0 | MEDIUM | Fields exist but never populated from game data |
| PL-02 | hitBatters/wildPitches/basesReachedViaError always 0 | MEDIUM | Hardcoded in transform |
| PL-04 | wOBA denominator slightly off (missing HBP, SF) | LOW | Cascading from PL-01 |

#### Duplicate Data Findings

| Pipeline | Issue | Severity |
|----------|-------|----------|
| ALL | Dedup guard only in orchestrator | LOW | If `aggregateGameToSeason()` called directly, no protection |
| PL-03 | `archiveCompletedGame()` uses `store.put()` with gameId key | LOW | Duplicate archive overwrites (harmless) |

---

## Async Risk Zones

| Pipeline | Junction | Risk | Code Handles It? |
|----------|----------|------|-------------------|
| PL-01/02/05 | J2 (aggregation) | Race condition if two games complete simultaneously | NO — no locking mechanism. IndexedDB transactions are atomic per-store but multi-store fan-out is not atomic |
| PL-03 | J3 (calculateStandings) | Stale read if standings requested during archive write | YES — separate transactions, eventual consistency is acceptable |
| PL-04 | J1 (useSeasonStats) | Stats may be stale on first render after game completion | PARTIAL — no automatic refresh trigger. User must navigate away and back, or useFranchiseData.refresh() must be called |
| PL-06 | J2 (aggregateFameEvents) | getOrCreateBattingStats may race with aggregateBattingStats | PARTIAL — both in same `aggregateGameToSeason` call, executed sequentially (await chain). Safe unless called concurrently. |

---

## Data Loss Points

| Pipeline | Junction | Field(s) Lost | Upstream Has It? | Downstream Needs It? |
|----------|----------|---------------|------------------|---------------------|
| PL-01 | J1→J2 | `playerName` | YES (in roster) | YES (for display) |
| PL-01 | J1→J2 | `teamId` (correct) | YES (determinable from batting order) | YES (for team filtering) |
| PL-01 | J2 | `hitByPitch`, `sacFlies`, `sacBunts`, `gidp` | NO (not tracked in game) | YES (for OBP/wOBA accuracy) |
| PL-02 | J1→J2 | `pitcherName` | YES (in roster) | YES (for display) |
| PL-02 | J1→J2 | Correct `teamId` | YES (determinable from pitcher assignment) | YES (for team filtering) |
| PL-02 | J1 | `hitBatters`, `wildPitches`, `basesReachedViaError` | PARTIAL (some tracked in game, zeroed in serialization) | YES (for ERA accuracy) |
| PL-02 | J2→J3 | `wins`, `losses`, `saves`, `holds`, `blownSaves` | YES (on PitcherGameStats Map, not on PersistedGameState) | YES (critical for leaderboards) |
| PL-03 | J1 | `seasonId` on CompletedGameRecord | YES (available from seasonIdRef.current) | YES (for standings filtering) |
| PL-05 | J1 | `putouts`, `assists`, `fieldingErrors` | NO (not tracked per-fielder during gameplay) | YES (for fWAR accuracy) |

---

## Type Mismatches

| Junction | Producer Type | Consumer Type | Mismatch |
|----------|-------------|---------------|----------|
| PL-02 J1→J2 | `PersistedGameState.pitcherGameStats` (no decision fields) | `aggregatePitchingStats` expects counting stats only | No TypeScript error but semantic loss — decisions are not carried |
| PL-01 J2 | `getOrCreateBattingStats` returns with `fameBonuses: 0` | `aggregateFameEvents` also reads/writes same record | No mismatch but potential stale read if not sequential |

---

## Recommendations

### Priority 1: Critical Fixes (Standings + Pitcher Decisions)

1. **FIX PL-03:** Add `seasonId` to `archiveCompletedGame()` record construction
   - File: `src/src_figma/utils/gameStorage.ts:290` and `src/utils/gameStorage.ts:284`
   - Add: `seasonId: seasonId || 'season-1'` to the record
   - Requires passing `seasonId` to `archiveCompletedGame()` from `completeGameInternal()`

2. **FIX PL-09:** Add pitcher decision fields to `PersistedGameState.pitcherGameStats`
   - File: `src/utils/gameStorage.ts:129-151` — add `win`, `loss`, `save`, `hold`, `blownSave` fields
   - File: `src/src_figma/hooks/useGameState.ts:2866-2891` — serialize decision fields from PitcherGameStats Map
   - File: `src/utils/seasonAggregator.ts:210-230` — aggregate W/L/SV/H/BS to season stats

### Priority 2: High-Impact Fixes (Name/Team Resolution)

3. **FIX PL-01/02:** Replace placeholder playerName and teamId in aggregation
   - Requires roster lookup during `aggregateBattingStats()` and `aggregatePitchingStats()`
   - Or: Carry correct names and teams through `PersistedGameState` (already has awayTeamId/homeTeamId — need to determine which team each player belongs to)

### Priority 3: Data Completeness

4. **FIX PL-05:** Track fielding stats during gameplay or infer from play-by-play
5. **FIX PL-01:** Track HBP/SF/SAC/GIDP in game-level player stats
6. **FIX PL-02:** Serialize hitBatters/wildPitches from actual game tracking data

### Priority 4: Architecture

7. **Add dedup guard** inside `aggregateGameToSeason()` itself (not just in orchestrator)
8. **Add auto-refresh** trigger after game completion so franchise pages show updated data immediately
