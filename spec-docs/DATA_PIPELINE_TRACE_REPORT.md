# Data Pipeline Trace Report

> **Generated:** 2026-02-09
> **Prerequisite:** `spec-docs/FRANCHISE_BUTTON_AUDIT.md`, `spec-docs/FRANCHISE_API_MAP.md`
> **Pipelines Traced:** 15 (PL-01 through PL-10, PL-A through PL-E equivalent mapped to PL-F through PL-J)

---

## Executive Summary

15 data pipelines traced junction-by-junction across 5 IndexedDB databases. **1 pipeline is BROKEN** (Fan Morale — hook stubbed), **3 have DEAD CODE** (fielding aggregation, box score rendering, playoff stats stores), and **all pipelines share a systemic risk**: no duplicate-aggregation guard at the season/career level.

### Pipeline Health Dashboard

| ID | Pipeline | Junctions | Status | Severity |
|----|----------|-----------|--------|----------|
| PL-01 | Game Completion Entry (endGame→completeGameInternal) | 2 | DEGRADED | HIGH — double archival, pitcherName bug |
| PL-02 | Season Batting Aggregation | 6 | INTACT | LOW — field name changes handled |
| PL-03 | Season Pitching Aggregation | 5 | INTACT | LOW — W/L/SV/H/BS conditional logic correct |
| PL-04 | Season Fielding Aggregation | 4 | DEAD CODE | HIGH — source data always 0 |
| PL-05 | Fame Event Aggregation | 4 | DEGRADED | MED — playerId as name, awayTeam for all |
| PL-06 | Season Stats Retrieval & Display | 5 | DEGRADED | MED — WAR fields don't exist on types |
| PL-07 | WAR Calculation (bWAR/pWAR/rWAR/fWAR) | 16 | INTACT with gaps | MED — SB/CS dropped, no fWAR in Figma |
| PL-08 | Milestone/Career Aggregation | 15 | INTACT with gaps | MED — playerName=playerId, career double-count risk |
| PL-09 | Event Log (Play-by-Play) | 11 | INTACT with orphan | LOW — box score exists but nothing renders it |
| PL-10 | Fame System (In-Game + Milestone) | 15 | INTACT | LOW — milestone fame logged not displayed |
| PL-11 | League Builder CRUD | 8 | INTACT | LOW — no cascade deletes, full re-read on write |
| PL-12 | Schedule Management | 5 | INTACT | LOW — fire-and-forget metadata update |
| PL-13 | Standings Calculation | 4 | DEGRADED | HIGH — naive division split, 500-game limit |
| PL-14 | Playoff System | 7 | DEGRADED | HIGH — only round 1 generated, orphaned stores |
| PL-15 | Franchise State | 5 | DEGRADED | HIGH — per-franchise DBs unused, always season-1 |
| — | Fan Morale | 13 | BROKEN | CRITICAL — hook stubbed, no persistence |

---

## Database Architecture

5 separate IndexedDB databases with NO cross-database referential integrity:

| Database | Stores | Used By | Notes |
|----------|--------|---------|-------|
| `kbl-league-builder` | leagueTemplates, globalTeams, globalPlayers, rulesPresets, teamRosters | leagueBuilderStorage.ts | Team/player/league CRUD |
| `kbl-schedule` | scheduledGames, scheduleMetadata | scheduleStorage.ts | Game scheduling |
| `kbl-playoffs` | playoffs, series, playoffGames*, playoffStats* | playoffStorage.ts | *Never written to |
| `kbl-tracker` | completedGames, playerSeasonBatting, playerSeasonPitching, playerSeasonFielding, seasonMetadata, gameHeaders, atBatEvents, careerBatting, careerPitching, careerMilestones | gameStorage.ts, seasonStorage.ts, eventLog.ts, careerStorage.ts | Main game data |
| `kbl-app-meta` | franchiseList, appSettings | franchiseManager.ts | Franchise CRUD |
| `kbl-franchise-{id}` | (undefined schema) | franchiseManager.ts | Per-franchise — ORPHANED |

---

## PL-01: Game Completion Entry Points

### Two Parallel Code Paths

**Path A: `endGame()`** — `useGameState.ts:2973`
- Converts React state Maps to Records
- HARDCODES `putouts: 0, assists: 0, fieldingErrors: 0` (PlayerGameStats has no fielding fields)
- Resolves pitcher names correctly from `pitcherNamesRef`
- Archives game via `archiveCompletedGame()` at line 3095
- Sets `pendingActionRef.current = completeGameInternal` for later execution
- **Does NOT calculate pitcher decisions** — archived game has null decisions

**Path B: `completeGameInternal()`** — `useGameState.ts:2821`
- Called after pitch count confirmation via `confirmPitchCount()`
- Marks game complete in event log (line 2825)
- Builds playerStatsRecord (same hardcoded fielding zeros, lines 2832-2845)
- **Calculates pitcher decisions** via `calculatePitcherDecisions()` at line 2861
- Builds pitcherGameStatsArray — **BUG: `pitcherName = pitcherId`** at line 2868
- Calls `aggregateGameToSeason()` at line 2953
- Calls `markGameAggregated()` at line 2956
- **Archives AGAIN** at line 2963 (second write, overwrites first — harmless but wasteful)

### Bugs in PL-01

| Bug | Location | Impact |
|-----|----------|--------|
| pitcherName = pitcherId | useGameState.ts:2868 | Pitcher names show as IDs in season stats |
| Double archival | endGame:3095 + completeGameInternal:2963 | Wasteful; second overwrites first |
| Fielding hardcoded to 0 | useGameState.ts:2841-2843 | Entire fielding pipeline is dead |
| basesReachedViaError = 0 | useGameState.ts:2880 | Perfect game detection may be inaccurate |

---

## PL-02: Season Batting Aggregation

**Function:** `aggregateBattingStats()` — `seasonAggregator.ts:141`

### Field Mapping (Game → Season)

| Game Field | Season Field | Transform |
|-----------|-------------|-----------|
| pa | pa | Additive |
| ab | ab | Additive |
| h | hits | Rename + additive |
| singles | singles | Additive |
| doubles | doubles | Additive |
| triples | triples | Additive |
| hr | homeRuns | Rename + additive |
| rbi | rbi | Additive |
| r | runs | Rename + additive |
| bb | walks | Rename + additive |
| k | strikeouts | Rename + additive |
| sb | stolenBases | Rename + additive |
| cs | caughtStealing | Rename + additive |
| hbp | hitByPitch | Additive (with `|| 0` guard) |

### Fields NOT Aggregated

| Season Field | Reason |
|-------------|--------|
| sacFlies | Not tracked in PlayerGameStats |
| sacBunts | Not tracked in PlayerGameStats |
| gidp | Not tracked in PlayerGameStats |
| fameBonuses/fameBoners/fameNet | Handled by separate aggregateFameEvents() |

### Player Resolution

- Name: from `gameState.playerInfo[playerId].name` — falls back to `playerId`
- Team: from `gameState.playerInfo[playerId].teamId` — falls back to `awayTeamId` (wrong for home players)
- `games` incremented for ALL players in playerStats, even with 0 PA

---

## PL-03: Season Pitching Aggregation

**Function:** `aggregatePitchingStats()` — `seasonAggregator.ts:181`

### Field Mapping

| Game Field | Season Field | Transform |
|-----------|-------------|-----------|
| outsRecorded | outsRecorded | Additive |
| hitsAllowed | hitsAllowed | Additive |
| runsAllowed | runsAllowed | Additive |
| earnedRuns | earnedRuns | Additive |
| walksAllowed | walksAllowed | Additive (already BB+IBB combined upstream) |
| strikeoutsThrown | strikeouts | Rename + additive |
| homeRunsAllowed | homeRunsAllowed | Additive |
| hitBatters | hitBatters | Additive |
| wildPitches | wildPitches | Additive |
| decision === 'W' | wins | Conditional increment |
| decision === 'L' | losses | Conditional increment |
| save === true | saves | Conditional increment |
| hold === true | holds | Conditional increment |
| blownSave === true | blownSaves | Conditional increment |
| isStarter | gamesStarted | Boolean → count |

### Derived Achievements (Detected at Aggregation)

- Quality Start: starter + outsRecorded >= (2/3 × inningsPerGame × 3) + earnedRuns <= 3
- Complete Game: starter + outsRecorded >= inningsPerGame × 3
- Shutout: CG + runsAllowed === 0
- No-Hitter: CG + hitsAllowed === 0
- Perfect Game: NH + walksAllowed === 0 + hitBatters === 0 + basesReachedViaError === 0

### Dead Field

Season pitching type has `balks` field — never populated (SMB4 has no balks).

---

## PL-04: Season Fielding Aggregation — DEAD CODE

**Function:** `aggregateFieldingStats()` — `seasonAggregator.ts:250`

The function runs but ALL input data is hardcoded to 0:

| Game Field | Value | Reason |
|-----------|-------|--------|
| putouts | Always 0 | Hardcoded in useGameState.ts:2841 |
| assists | Always 0 | Hardcoded in useGameState.ts:2842 |
| fieldingErrors | Always 0 | Hardcoded in useGameState.ts:2843 |

Additionally never populated: `doublePlays`, `gamesByPosition`, `putoutsByPosition`, `assistsByPosition`, `errorsByPosition`.

**Root cause:** `PlayerGameStats` interface (useGameState.ts:71-86) has no fielding fields. The conversion adds them as literal zeros.

---

## PL-05: Fame Event Aggregation

**Function:** `aggregateFameEvents()` — `seasonAggregator.ts:278`

Groups fame events by player, sums `fameValue` into bonuses/boners. Updates the player's **batting** season stats (not pitching) with fame totals.

### Issues

| Issue | Location | Impact |
|-------|----------|--------|
| Uses playerId as playerName | seasonAggregator.ts:304 | Fame records show IDs instead of names |
| Uses awayTeamId for ALL players | seasonAggregator.ts:305 | Home team players assigned wrong team |
| Pitcher fame → batting record | seasonAggregator.ts:278 | Creates phantom batting records for pitchers with 0 PA |

---

## PL-06: Season Stats Retrieval & Display

### Three Display Paths

**Path A: Base `useSeasonStats`** — `src/hooks/useSeasonStats.ts`
- Reads all batting/pitching/fielding from IndexedDB
- Provides `getBattingLeaders(sortBy, limit)` and `getPitchingLeaders(sortBy, limit)`
- Qualifying thresholds: batting rate stats = 10 AB min, pitching rate = 9 outs (3 IP) min

**Path B: `useFranchiseData`** — `src/src_figma/hooks/useFranchiseData.ts`
- Wraps `useSeasonStats`, converts to `LeaderEntry` format
- Falls back to mock data when `hasRealData === false`

**Path C: Figma `useSeasonStats`** — `src/src_figma/app/hooks/useSeasonStats.ts`
- Builds unified `PlayerStatsRow` combining batting + pitching + fielding
- **TYPE MISMATCH:** Accesses `b.totalWar`, `b.bwar`, `b.rwar`, `b.fwar` on `PlayerSeasonBatting` — fields DON'T EXIST on that type
- These resolve to `undefined` at runtime → `undefined ?? 0` → always 0
- Used by `TeamHubContent` and `MuseumContent`

### seasonId Default Mismatch

| Location | Default seasonId |
|----------|-----------------|
| completeGameInternal (write) | `seasonIdRef.current \|\| 'season-1'` |
| Figma useSeasonStats (read) | Active season or `'season-2024'` |

Data written to `season-1` may not be read by hooks defaulting to `season-2024`.

---

## PL-07: WAR Calculation Pipeline

### Architecture: Computed On-The-Fly, Not Stored (except career)

Two parallel hook implementations:

**Legacy:** `src/hooks/useWARCalculations.ts` — reads from IndexedDB, returns leaderboards
**Figma:** `src/src_figma/app/hooks/useWARCalculations.ts` — takes stats as input, returns calculation functions

Both call the same base engines:
- `bwarCalculator.ts` — wOBA → wRAA → park adj → replacement → RPW → bWAR
- `pwarCalculator.ts` — FIP → fipDiff → fipRunsAboveAvg → replacement → leverage → pWAR
- `rwarCalculator.ts` — baserunning value from SB/CS/advancement
- `fwarCalculator.ts` — fielding value from putouts/assists/errors/range

**RPW Scaling:** `getRunsPerWin(seasonGames) = 10 × (seasonGames / 162)` — 50 games = 3.09 RPW

### Career WAR Storage

Stored in `careerStorage.ts:185`: `career.bWAR += seasonStats.batting.bWAR; career.totalWAR = career.bWAR + career.fWAR + career.rWAR`

**No idempotency guard** — if `aggregateGameToCareer()` runs twice for same game, WAR doubles.

### Gaps

| Gap | Location | Impact |
|-----|----------|--------|
| SB/CS dropped | Figma useWARCalculations.ts:135-136 | `stolenBases: 0, caughtStealing: 0` — rWAR always 0 in Figma |
| No fWAR exposed | Figma useWARCalculations.ts | fWAR calculation not available in Figma hook |
| Career WAR double-count | careerStorage.ts:947-950 | No duplicate guard at career aggregation |
| Type casts | Figma useWARCalculations.ts:227,252 | `as any` suppresses type mismatches |

---

## PL-08: Milestone/Career Aggregation

**Entry:** `aggregateGameWithMilestones()` — `milestoneAggregator.ts:698`
**15 junctions** from game completion to permanent milestone recording.

### Key Junctions

1. Career batting aggregation (read-modify-write per player)
2. Career pitching aggregation (same pattern)
3. Season milestone check with threshold scaling: `gamesPerSeason / 162`
4. Career milestone check (tiered: HR 25-700, Hits 250-3000)
5. WAR milestone check (bWAR 5-65, pWAR 5-65, fWAR 3-30, rWAR 2-20)
6. Dedup via `getAchievedMilestonesSet()` — reads existing milestones from IndexedDB
7. Milestone → FameEvent conversion via `milestoneToFameEvent()`
8. Franchise firsts recording
9. Franchise leaders tracking (9 batting + 8 pitching categories)

### Gaps

| Gap | Location | Impact |
|-----|----------|--------|
| playerName = playerId | milestoneAggregator.ts:722 | Milestone records show IDs |
| teamId = awayTeamId always | milestoneAggregator.ts:723 | Wrong team for home players |
| Career stat double-count | milestoneAggregator.ts:79-134 | No per-game idempotency |

---

## PL-09: Event Log (Play-by-Play)

**Written IMMEDIATELY** per at-bat to IndexedDB `kbl-event-log`.

### Key Functions

| Function | File:Line | Purpose |
|----------|-----------|---------|
| createGameHeader | useGameState.ts:1006 | Once at game start |
| logAtBatEvent | eventLog.ts:315-340 | Per at-bat, atomic transaction |
| completeGame | eventLog.ts:377 | Marks isComplete, sets finalScore |
| markGameAggregated | eventLog.ts:407 | Sets aggregated flag |
| generateBoxScore | eventLog.ts:640-786 | ORPHANED — nothing renders it |
| getUnaggregatedGames | eventLog.ts:461 | Crash recovery |

### Gaps

| Gap | Location | Impact |
|-----|----------|--------|
| Box score orphaned | eventLog.ts:640 | Full reconstruction capability exists but no UI |
| Error count bug | eventLog.ts:723-724 | Both awayErrors and homeErrors count ALL errors (no team filter) |
| Pitching appearances not logged | eventLog.ts:345 | `logPitchingAppearance()` exists but never called |

---

## PL-10: Fame System

### Two Detection Layers

**Layer 1: In-Game (Real-Time)**
- `useFameDetection` — 25+ detectors in `src/hooks/useFameDetection.ts` (1639 lines)
- `useFameTracking` — Figma wrapper via `fameIntegration` engine
- Checks after each at-bat: walk-off, cycle, multi-HR, sombrero, Maddux, no-hitter, immaculate inning, etc.

**Layer 2: Milestone-Triggered (Post-Game)**
- Season milestones (HR 40/45/55, Hits 160, SB 40/80, K 200/250 — all scaled)
- Career milestones (tiered thresholds)
- Converted to FameEvents via `milestoneToFameEvent()`

### Fame Formula

```
fameValue = baseFame × √(clamp(LI, 0.1, 10.0)) × playoffMultiplier
```

Playoff multipliers: wild_card=1.25, division=1.5, championship=1.75, world_series=2.0

Fame tiers: UNKNOWN(0-1), KNOWN(1-5), FAN_FAVORITE(5-15), STAR(15-30), SUPERSTAR(30-50), LEGENDARY(50+), INFAMOUS(<0)

### Gap

Milestone fame events returned from `aggregateGameWithMilestones()` but only logged to console — not pushed to UI notifications.

---

## PL-11: League Builder CRUD

**Database:** `kbl-league-builder` — 5 stores
**Hook:** `useLeagueBuilderData.ts`

### Pattern

All CUD operations: write to IndexedDB via `store.put()` → `await refresh()` → re-read ALL four stores.

- NOT optimistic updates
- No cascade deletes (removing league doesn't clean up teams, removing team doesn't clean up players)
- Roster updates intentionally skip `refresh()` (not in main state arrays)
- `seedFromSMB4Database()` converts from `src/data/playerDatabase.ts`

---

## PL-12: Schedule Management

**Database:** `kbl-schedule` — 2 stores (scheduledGames, scheduleMetadata)
**Hook:** `useScheduleData.ts`

### Key Operations

- `addGame()`: validates away ≠ home, auto-increments gameNumber
- `completeGame()`: sets status=COMPLETED, stores result
- `addSeries()`: calls addGame in a loop (not batched)
- `updateMetadata()` is fire-and-forget (not awaited)

### Gap

No link between `kbl-schedule` and `kbl-league-builder`. Team IDs are string references with no FK enforcement.

---

## PL-13: Standings Calculation

**Function:** `calculateStandings()` — `seasonStorage.ts:784`

### Data Flow

1. `getRecentGames(500)` from `kbl-tracker` completedGames (NOT schedule DB)
2. Filter by seasonId
3. Build Map<teamId, stats> with W/L/runs/home-away/streaks
4. Sort by winPct, calculate gamesBack

### Critical Gaps

| Gap | Impact |
|-----|--------|
| Reads from gameStorage, NOT scheduleStorage | Two parallel game-result systems, not connected |
| Naive division split (first half/second half) | Ignores actual league structure from leagueBuilder |
| 500-game limit | 20-team × 50-game = 500 exact max; larger leagues would have incomplete standings |
| No auto-refresh after game completion | Standings stale until FranchiseHome remounts |
| Team names embedded at save time | Renamed teams show old names in standings |

---

## PL-14: Playoff System

**Database:** `kbl-playoffs` — 4 stores
**Hook:** `usePlayoffData.ts`

### Key Operations

- `createNewPlayoff()`: gets standings → builds playoff teams → creates bracket
- `generateBracket()`: **ONLY creates first-round series** — later rounds not pre-created
- `recordGameResult()`: updates series, checks clinch
- `advanceRound()`: marks next-round series as IN_PROGRESS — but those series may not exist
- `completePlayoffs()`: marks champion, MVP

### Critical Gaps

| Gap | Impact |
|-----|--------|
| Only round 1 bracket generated | `advanceRound()` would find no series to activate for round 2+ |
| `playoffGames` store never written to | Games stored inside `PlayoffSeries.games[]` instead |
| `playoffStats` store never written to | No playoff player stat accumulation |
| `playoffEngine.ts` is ORPHANED | Sophisticated tiebreaker logic not imported by hook |
| Naive league split for seeding | Same problem as standings — ignores real division structure |
| Falls back to MOCK_PLAYOFF_TEAMS | Hardcoded team IDs like 'tigers', 'sox' |

---

## PL-15: Franchise State

**Database:** `kbl-app-meta` — 2 stores + per-franchise `kbl-franchise-{id}` DBs

### Key Operations

- `createFranchise()`: generates ID, writes to `franchiseList`
- `listFranchises()`: hardcodes `currentSeason: 1, totalSeasons: 1` for all
- `deleteFranchise()`: removes from list + deletes entire per-franchise DB

### Critical Gaps

| Gap | Impact |
|-----|--------|
| `useFranchiseData` always uses 'season-1' | Ignores franchise context entirely |
| Per-franchise DBs have undefined schemas | Only populated by import/migration |
| Franchise isolation is meaningless | All data systems use global DBs |
| `currentSeason`/`totalSeasons` hardcoded to 1 | FranchiseSummary always shows "Season 1 of 1" |

---

## Fan Morale — BROKEN PIPELINE

**Engine:** `fanMoraleEngine.ts` — 1,358 lines of comprehensive logic (drift, momentum, trade scrutiny, streak detection, contraction risk)

**Hook:** `useFanMorale.ts:7-12` — Comment says "written with incorrect assumptions about the legacy fanMoraleEngine API"

### What's Broken

1. Hook is STUBBED — initializes but does not process game results
2. No persistence — morale state in React useState only, lost on refresh
3. No game-result feeding — nothing calls `processGameResult()` at game end
4. IS imported in GameTracker.tsx:31 and SeasonSummary.tsx:17 despite being broken
5. Two different hooks exist (Figma + legacy) with different APIs

---

## Systemic Issues

### 1. No Duplicate Aggregation Guard

`aggregateGameToSeason()` is purely additive. The `markGameAggregated()` flag exists but is never checked before aggregating. If called twice for the same game, all stats double.

**Affected:** PL-02, PL-03, PL-04, PL-05, PL-08 (career)

### 2. Database Fragmentation

5+ separate IndexedDB databases with no cross-DB integrity:
- Schedule completion doesn't feed standings (different DBs)
- Division structure in leagueBuilder ignored by standings and playoffs
- Franchise-per-database architecture is orphaned from actual data systems

### 3. Placeholder Identity Data

Multiple locations use `playerId` as `playerName` and `awayTeamId` for all players:
- `completeGameInternal()` line 2868
- `aggregateFameEvents()` lines 304-305
- `milestoneAggregator.ts` lines 722-723

### 4. Type Safety Gaps

- Figma `useSeasonStats` accesses WAR fields that don't exist on season types
- `useWARCalculations` uses `as any` casts to suppress mismatches
- `convertBattingStats` drops SB/CS (set to 0)
