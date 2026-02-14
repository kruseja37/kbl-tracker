# FULL STACK FRANCHISE UI AUDIT

**Date:** 2026-02-11
**Auditor:** Claude (Opus 4.6)
**Scope:** All franchise UI pages, components, hooks, and data flows
**Method:** Phase 1 (Static code scan) + Phase 2 (Playwright runtime verification) + Phase 3 (Cross-reference)
**Rule:** DIAGNOSIS ONLY — no fixes applied

---

## EXECUTIVE SUMMARY

The franchise UI is **structurally sound** — all 84 interactive handlers are wired, the hook/storage/IndexedDB pipeline is properly layered, and the franchise creation wizard works end-to-end with real data. However, there are **significant display-layer defects**: hardcoded mock data in several components, a stadium lookup key mismatch causing "Unknown Stadium" everywhere, random `Math.random()` stats on fresh franchises, and hardcoded season/year strings. The single-game SIM flow calls `processCompletedGame` + `scheduleData.completeGame` but the runtime test showed the schedule did NOT advance — indicating a silent error in the persistence pipeline (caught by try/catch, no console error surfaced). Zero console errors or warnings were observed across the entire session.

**Defect counts by severity:**
- CRITICAL: 2 (sim persistence failure, stadium lookup broken)
- MAJOR: 12 (hardcoded mock data blocks, random stats, missing teams, empty standings)
- MINOR: 8 (hardcoded season strings, slug display names, cosmetic labels)
- INFO: 4 (orphaned variables, empty MOCK_ variable names)

---

## DEFECT INVENTORY

Single table, sorted by severity → screen → ID.

| ID | Severity | Screen | What's Wrong | Code Location | Root Cause | Fix Complexity |
|----|----------|--------|-------------|---------------|------------|----------------|
| DEF-001 | CRITICAL | Today's Game | SIM 1 GAME runs animation + play-by-play but schedule does NOT advance after CONTINUE; all 320 games remain SCHEDULED in IndexedDB | `FranchiseHome.tsx:2103-2152` (`handleSimulate`) calls `processCompletedGame` + `scheduleData.completeGame` | Silent error thrown inside try/catch (line 2149-2151); no console error surfaced. `processCompletedGame` or `scheduleData.completeGame` fails for unknown reason. | MEDIUM — need to identify which call fails; add error surfacing |
| DEF-002 | CRITICAL | Today's Game / Schedule | "Unknown Stadium" displayed for EVERY game (next game card + full schedule) | `src/src_figma/config/stadiumData.ts:2-13` | Three root causes: (1) `TEAM_STADIUMS` uses Title Case display names as keys ("Tigers") but callers pass team IDs ("platypi"); (2) Only 10 of 20 teams mapped; (3) Stadium names are FAKE ("Tiger Stadium") — real names in IndexedDB ("Emerald Diamond", "Apple Field") | MEDIUM — replace static config with IndexedDB lookup via `getAllTeams()` |
| DEF-003 | MAJOR | Team Hub → Roster | Morale values are random: `70 + Math.floor(Math.random() * 25)` | `TeamHubContent.tsx:27` (`convertToRosterItem`) | No real morale data source exists yet | LOW — remove random, show "N/A" or omit |
| DEF-004 | MAJOR | Team Hub → Roster | Fitness values are random: `85 + Math.floor(Math.random() * 13)` | `TeamHubContent.tsx:31` (`convertToRosterItem`) | No real fitness data source exists yet | LOW — remove random, show "N/A" or omit |
| DEF-005 | MAJOR | Team Hub → Roster | True Value is random: `salary * (0.8 + Math.random() * 0.4)` | `TeamHubContent.tsx:19` (`convertToRosterItem`) | No true value calculator connected | LOW — remove random, show "N/A" or use salary engine |
| DEF-006 | MAJOR | Team Hub → Stats | WAR/stats are random for ALL players on fresh franchise: `1.0 + Math.random() * 7` | `TeamHubContent.tsx:38` (`convertToStatsItem`) | Falls back to `convertToStatsItem()` when no season stats exist; generates random ERA, IP, K, AVG, HR, RBI, SB, OPS | MEDIUM — show "no stats" empty state instead of random numbers |
| DEF-007 | MAJOR | Team Hub → Team | ALL teams show "56-34 • 1st" hardcoded record | `TeamHubContent.tsx:251-259` (`managerData`) | `managerData` object is entirely hardcoded mock including name "Frank Sullivan", record "56-34", mWAR 4.2, winPct 0.622 | MEDIUM — pull from standings/season data |
| DEF-008 | MAJOR | Team Hub → Fan Morale | Entire fan morale section is hardcoded | `TeamHubContent.tsx:210-224` (`fanMorale`) | Net morale 78, 5 hardcoded change events with fake player names ("J. Rodriguez"), 3 hardcoded beat reporters ("Sarah Jenkins") | LOW — show empty state (feature not built) |
| DEF-009 | MAJOR | Team Hub → Stadium | Park factors & records are hardcoded | `TeamHubContent.tsx:227-248` (`stadiumData`) | Entire object with fake park factors (overall: 102, HR: 106), fake records ("54,234 attendance"), fake notable moments | LOW — show empty state (feature not built) |
| DEF-010 | MAJOR | Team Hub | Only 10 of 20 teams shown in dropdown | `TeamHubContent.tsx:136` | `realTeams.slice(0, 10)` explicitly limits to first 10 teams | TRIVIAL — remove `.slice(0, 10)` |
| DEF-011 | MAJOR | Team Hub | Stadium names generated as `"${teamName} Stadium"` — all fake | `TeamHubContent.tsx:143` | `realTeams.slice(0, 10).map(t => \`${t.name} Stadium\`)` instead of reading real stadium field from team data | LOW — use `t.stadium` from team data |
| DEF-012 | MAJOR | Team Hub | Default team is "Tigers" (not an SMB4 team) | `TeamHubContent.tsx:124` | Hardcoded `useState<string>("Tigers")` | TRIVIAL — default to first team in list or empty |
| DEF-013 | MAJOR | Today's Game | "42-28 • 1ST IN DIVISION" hardcoded under away team | `FranchiseHome.tsx:2526` | Literal string in JSX, not from any data source | LOW — pull from standings data |
| DEF-014 | MAJOR | Today's Game | "38-32 • 2ND IN DIVISION" hardcoded under home team | `FranchiseHome.tsx:2680` | Literal string in JSX, not from any data source | LOW — pull from standings data |
| DEF-015 | MAJOR | Today's Game | ~80 "PLAYER NAME" placeholders with hardcoded stat values in team stats expandable sections | `FranchiseHome.tsx:2540-2816` | bWAR, pWAR, AVG, ERA, SB, HR leaders all hardcoded as "PLAYER NAME" with values like 5.2, 4.8, .324, 3.21 | MEDIUM — wire to real season stats leaders |
| DEF-016 | MAJOR | World Series | Entire bracket uses hardcoded MLB team names | `WorldSeries.tsx:312-322` (`mockTeams` array) | Array of 8 fake teams: Tigers, Sox, Cubs, Dodgers, Yankees, Mets, Brewers, Braves with fake records | MEDIUM — wire to playoff bracket from `usePlayoffData` |
| DEF-017 | MAJOR | Standings | No teams listed — division headers appear but team arrays are empty | `FranchiseHome.tsx:1932-2010` (`StandingsContent`) | `franchiseData.standings` has Eastern/Western structure but division team arrays are empty on fresh franchise (no completed games → no standings to calculate) | LOW — show 0-0 records for all teams as initial state |
| DEF-018 | MAJOR | Trades | Only 3 teams in dropdown, all salaries show "$0.0M" | Trades component (via `useOffseasonData`) | Limited team display + salary calculation not connected for trade display | MEDIUM |
| DEF-019 | MINOR | Schedule | "SEASON 2 SCHEDULE" hardcoded | `ScheduleContent.tsx:76` | Literal string `"📅 SEASON 2 SCHEDULE"` | TRIVIAL — interpolate season number prop |
| DEF-020 | MINOR | Schedule | "2024 SEASON SCHEDULE" hardcoded | `ScheduleContent.tsx:98` | Literal string `"▶ 2024 SEASON SCHEDULE"` | TRIVIAL — interpolate year |
| DEF-021 | MINOR | Schedule | "Season 2 schedule is empty" hardcoded | `ScheduleContent.tsx:150` | Literal string `"Your Season 2 schedule is empty."` | TRIVIAL — interpolate season number |
| DEF-022 | MINOR | Schedule | Team names displayed as raw IDs ("platypi" not "Platypi") | `ScheduleContent.tsx:185,193` | `nextGame.awayTeamId` / `nextGame.homeTeamId` displayed directly — no team name lookup | LOW — add team name resolver |
| DEF-023 | MINOR | Offseason → Finalize | Multiple hardcoded "Season 2" references | `FinalizeAdvanceFlow.tsx:383,767,891,1008,1169,1223,1295` | Literal strings throughout component | LOW — pass season number as prop |
| DEF-024 | MINOR | Offseason → Draft | "Season 27 Draft" hardcoded | `DraftFlow.tsx:1227` | Literal string | TRIVIAL — interpolate |
| DEF-025 | MINOR | Offseason → Contraction | "Season 26 Complete" hardcoded | `ContractionExpansionFlow.tsx:1246` | Literal string | TRIVIAL — interpolate |
| DEF-026 | MINOR | Franchise Setup | Step 5 says "All 16 teams" but league has 20 teams | `FranchiseSetup.tsx` (review step) | Hardcoded "16" in summary text | TRIVIAL — use actual team count |
| DEF-027 | MINOR | World Series | League names "American League" / "National League" (MLB, not SMB4) | `WorldSeries.tsx:114-119` (`mockLeagues`) | Hardcoded array includes MLB league names instead of franchise league names | LOW — pull from league data |
| DEF-028 | MINOR | Offseason → Draft | Hardcoded inactive/ineligible player lists | `DraftFlow.tsx:105-118` | 6 hardcoded "retired" players and 3 hardcoded "Hall of Famers" with fake names | LOW — pull from retirement/museum data |

---

## MOCK DATA INVENTORY

Complete catalog of all mock/placeholder data found in franchise UI components.

| File | Line(s) | Variable/Element | Current Value | Should Be |
|------|---------|-----------------|---------------|-----------|
| `TeamHubContent.tsx` | 9 | `MOCK_TEAMS` | `[]` (empty array) | N/A — correct empty fallback |
| `TeamHubContent.tsx` | 10 | `MOCK_STADIUMS` | `[]` (empty array) | N/A — correct empty fallback |
| `TeamHubContent.tsx` | 12 | `MOCK_ROSTER_DATA` | `[]` (empty array) | N/A — correct empty fallback |
| `TeamHubContent.tsx` | 14 | `MOCK_STATS_DATA` | `[]` (empty array) | N/A — correct empty fallback |
| `TeamHubContent.tsx` | 19 | `trueValue` in `convertToRosterItem` | `salary * (0.8 + Math.random() * 0.4)` | Real true value from salary engine or "N/A" |
| `TeamHubContent.tsx` | 27 | `morale` in `convertToRosterItem` | `70 + Math.floor(Math.random() * 25)` | Real morale from mojo engine or "N/A" |
| `TeamHubContent.tsx` | 31 | `fitness` in `convertToRosterItem` | `85 + Math.floor(Math.random() * 13)` | Real fitness from fitness engine or "N/A" |
| `TeamHubContent.tsx` | 38 | `baseWar` in `convertToStatsItem` | `1.0 + Math.random() * 7` | Show empty state when no season stats |
| `TeamHubContent.tsx` | 44-69 | Stats in `convertToStatsItem` | Random ERA (2.5-5.0), IP (60-200), K (40-240), etc. | Show empty state when no season stats |
| `TeamHubContent.tsx` | 124 | `selectedTeam` default | `"Tigers"` | First team in list or empty |
| `TeamHubContent.tsx` | 125 | `selectedStadium` default | `"Tiger Stadium"` | Derived from selected team's real stadium |
| `TeamHubContent.tsx` | 126 | `selectedStatsPlayer` default | `"J. Rodriguez"` | First player in roster or empty |
| `TeamHubContent.tsx` | 136 | Teams list | `.slice(0, 10)` (truncates to 10) | All teams |
| `TeamHubContent.tsx` | 143 | Stadium derivation | `` `${t.name} Stadium` `` | Use `t.stadium` from team data |
| `TeamHubContent.tsx` | 210-224 | `fanMorale` object | Hardcoded: netMorale 78, 5 fake events, 3 fake reporters | Empty state or real fan morale data |
| `TeamHubContent.tsx` | 227-248 | `stadiumData` object | Hardcoded: park factors, records, notable moments | Empty state or real stadium data from IndexedDB |
| `TeamHubContent.tsx` | 251-259 | `managerData` object | "Frank Sullivan", 56-34, mWAR 4.2 | Real manager data from standings/season |
| `FranchiseHome.tsx` | 2526 | Away team record | `"42-28 • 1ST IN DIVISION"` | Real standings lookup |
| `FranchiseHome.tsx` | 2680 | Home team record | `"38-32 • 2ND IN DIVISION"` | Real standings lookup |
| `FranchiseHome.tsx` | 2540-2816 | Team stats sections | ~80 `"PLAYER NAME"` placeholders with hardcoded stats | Real player names and stats from season data |
| `WorldSeries.tsx` | 312-322 | `mockTeams` array | 8 MLB teams: Tigers, Sox, Cubs, Dodgers, Yankees, Mets, Brewers, Braves | Real playoff bracket teams |
| `WorldSeries.tsx` | 114-119 | `mockLeagues` array | "American League", "National League", "KBL Super League", "Minor League" | Real league names from franchise |
| `ScheduleContent.tsx` | 76 | Header text | `"📅 SEASON 2 SCHEDULE"` | Dynamic season number |
| `ScheduleContent.tsx` | 98 | Sub-header text | `"▶ 2024 SEASON SCHEDULE"` | Dynamic year |
| `ScheduleContent.tsx` | 150 | Empty state text | `"Your Season 2 schedule is empty."` | Dynamic season number |
| `FinalizeAdvanceFlow.tsx` | 383,767,891,1008,1169,1223,1295 | Various headings | `"Season 2"` repeated 7 times | Dynamic season number |
| `DraftFlow.tsx` | 1227 | Draft header | `"Season 27 Draft"` | Dynamic season number |
| `DraftFlow.tsx` | 105-112 | `inactivePlayers` | 6 hardcoded fake retired player names | Real retired players from retirement data |
| `DraftFlow.tsx` | 114-118 | `ineligiblePlayers` | 3 hardcoded fake Hall of Famers | Real HoF from museum data |
| `ContractionExpansionFlow.tsx` | 1246 | Header text | `"Season 26 Complete"` | Dynamic season number |
| `stadiumData.ts` | 2-13 | `TEAM_STADIUMS` | 10 fake entries with display-name keys | All 20 teams with ID keys and real stadium names |
| `useMuseumData.ts` | 71-79 | 9 `MOCK_*` constants | Empty arrays (correct) | N/A — naming is misleading but values are correct |
| `FreeAgencyFlow.tsx` | 49,51 | `MOCK_TEAMS`, `MOCK_PLAYERS` | Empty arrays | N/A — correct empty fallbacks |
| `DraftFlow.tsx` | 7 | `MOCK_TEAMS` | Empty array | N/A — correct empty fallback |
| `AwardsCeremonyFlow.tsx` | 68,70 | `MOCK_PLAYERS`, `MOCK_TEAMS` | Empty arrays | N/A — correct empty fallbacks |
| `MuseumContent.tsx` | 23 | `MOCK_TEAMS` | Empty array | N/A — correct empty fallback |

---

## DEAD CODE / ORPHAN INVENTORY

| File | Line(s) | Element | Classification | Notes |
|------|---------|---------|---------------|-------|
| `FranchiseHome.tsx` | 234 | `availableTeams: string[] = []` | ORPHAN | Declared as empty array, passed to ScheduleContent but never populated — schedule team filter dropdown is always empty |
| `FranchiseHome.tsx` | 167-170 | `allStarVotes` | ORPHAN | Empty object initialized, never populated with real data |
| `FranchiseHome.tsx` | 154-166 | `emptyPositions` | ORPHAN | Empty array fallback for All-Star voting positions — no real data source |
| `MuseumContent.tsx` | 128 | `seasonStandings` | ORPHAN | Declared as `[]`, never populated — used in Team Records sub-tab but always empty |
| `MuseumContent.tsx` | 131 | `teamTop10` | ORPHAN | Declared as `[]`, never populated |
| `MuseumContent.tsx` | 134-139 | `teamAccolades` | ORPHAN | Object with empty arrays (`mvps: [], cyYoungs: [], allStars: []`), never computed |
| `stadiumData.ts` | 1-17 | Entire file | OBSOLETE | Static config that should be replaced with IndexedDB lookups — all values are fake |

---

## CONSOLE ERRORS

**Runtime console errors observed: 0**
**Runtime console warnings observed: 0**

Full Playwright session covered:
- App root load
- Franchise creation wizard (6 steps)
- FranchiseHome all tabs: Today's Game, Schedule, Standings, Team Hub (all sub-tabs), League Leaders, Trades, All-Star, Museum (all sub-tabs), Playoffs, Offseason (all sub-tabs)
- SIM 1 GAME execution
- SKIP 1 GAME execution
- IndexedDB inspection

---

## HANDLER AUDIT SUMMARY

**Source:** Phase 1C static analysis of all franchise UI components

| Status | Count | Percentage |
|--------|-------|------------|
| WIRED (real handler connected) | 84 | 100% |
| STUB (handler exists but does nothing) | 0 | 0% |
| BROKEN (handler errors or wrong target) | 0 | 0% |
| MISSING (no handler at all) | 0 | 0% |

All handlers across FranchiseHome.tsx, FranchiseSetup.tsx, FranchiseSelector.tsx, SeasonEndFlow.tsx, and all offseason flow components are properly wired to real state updates, IndexedDB operations, or navigation actions.

---

## DATA SOURCE CLASSIFICATION

**Source:** Phase 1B static analysis of all franchise hooks and components

| Classification | Count | Description |
|----------------|-------|-------------|
| REAL | 47 | Data flows from IndexedDB through proper hook/storage pipeline |
| REAL/FALLBACK | 18 | Real data when available, empty array when not (correct pattern) |
| MOCK (harmful) | 15 | Hardcoded fake data displayed to user (Math.random, literal strings) |
| MOCK (benign) | 12 | Empty arrays named `MOCK_*` — values correct, names misleading |
| ORPHAN | 7 | Variables declared but never populated or used |
| LOCAL STATE | 8 | React UI state (tab selection, dropdown open/close) — correct |

---

## RUNTIME VERIFICATION RESULTS

### Franchise Creation (Phase 2A)
- **Status:** PASS
- 6-step wizard works end-to-end
- League with 20 teams created from IndexedDB data
- 320 games scheduled across 16 game days
- One cosmetic issue: Step 5 summary says "All 16 teams" but league has 20 teams (DEF-026)

### Screen-by-Screen Findings (Phase 2B/2C)

| Screen | Sub-Tab | Status | Key Finding |
|--------|---------|--------|-------------|
| Today's Game | — | FAIL | "Unknown Stadium", hardcoded records, hardcoded player stats |
| Schedule | — | FAIL | "Unknown Stadium" for all games, "SEASON 2" hardcoded, team IDs as names |
| Standings | — | FAIL | Division headers render but no teams listed (empty arrays) |
| Team Hub | Team | FAIL | Only 10 teams, "56-34" for all, "Tigers" default |
| Team Hub | Roster | FAIL | Random morale/fitness/true-value via Math.random() |
| Team Hub | Stats | FAIL | Random WAR/stats for all players |
| Team Hub | Fan Morale | FAIL | Entirely hardcoded mock data |
| Team Hub | Stadium | FAIL | Entirely hardcoded mock data with fake park factors |
| Team Hub | Manager | FAIL | "Frank Sullivan" 56-34, entirely hardcoded |
| League Leaders | — | PASS | Correctly shows "N/A" for all stats (proper empty state) |
| Trades | — | FAIL | Only 3 teams, all salaries $0.0M |
| All-Star | — | PASS | Empty (correct for fresh franchise) |
| Museum | All tabs | PASS | Empty (correct for fresh franchise) |
| Playoffs | — | PASS | Empty (correct for pre-playoff) |
| Offseason | All tabs | PASS | Clickable, Awards shows ceremony description |
| SIM 1 GAME | — | FAIL | Animation plays, play-by-play generates, but results don't persist |
| SKIP 1 GAME | — | PASS | Schedule advances correctly to Game 2 |

### IndexedDB Verification (Phase 2C)
- `kbl-league-builder`: 20 teams with proper structure (`id`, `name`, `stadium`, `colors`, `leagueIds`)
- `kbl-schedule`: 320 games, all status "SCHEDULED" (even after SIM — confirms DEF-001)
- Team data has real stadium names in `stadium` field (e.g., "Emerald Diamond", "Apple Field") — confirms stadiumData.ts is obsolete
- After SKIP: Game 1 correctly marked as SKIPPED in schedule DB

---

## CROSS-REFERENCE: STATIC vs RUNTIME

| Finding | Phase 1 (Static) | Phase 2 (Runtime) | Match? |
|---------|-------------------|-------------------|--------|
| stadiumData.ts key mismatch | Keys are Title Case display names; only 10 entries | "Unknown Stadium" for every game | YES — confirmed |
| TeamHubContent Math.random() | Lines 19, 27, 31, 38 use Math.random() | Random numbers displayed in roster/stats tabs | YES — confirmed |
| TeamHubContent `.slice(0, 10)` | Line 136 limits to 10 teams | Only 10 teams in Team Hub dropdown | YES — confirmed |
| FranchiseHome hardcoded records | Lines 2526, 2680 have literal strings | "42-28" and "38-32" displayed in next game card | YES — confirmed |
| FranchiseHome "PLAYER NAME" | Lines 2540-2816 have ~80 placeholder strings | "PLAYER NAME" shown in expanded team stats | YES — confirmed |
| ScheduleContent hardcoded season | Lines 76, 98, 150 have literal strings | "SEASON 2 SCHEDULE", "2024 SEASON" displayed | YES — confirmed |
| WorldSeries mockTeams | Lines 312-322 hardcoded MLB names | Not verified (playoff not reached in test) | UNVERIFIED — code-only finding |
| handleSimulate persistence | Code calls processCompletedGame + completeGame | Schedule did NOT advance after SIM | MISMATCH — code looks correct but runtime fails silently |
| handleSkip flow | Code calls scheduleData.updateStatus('SKIPPED') | Schedule correctly advanced to Game 2 | YES — confirmed working |
| Standings empty on fresh franchise | `calculateStandings()` requires completed games | Division headers visible but no team rows | YES — confirmed |
| All handlers wired | 84/84 handlers have real implementations | All buttons clicked were responsive | YES — confirmed |
| Console errors | No obvious error paths in code | 0 errors, 0 warnings in runtime | YES — confirmed |

---

## PRIORITY FIX ORDER (Recommendation)

1. **DEF-001** (CRITICAL) — Debug why `processCompletedGame` or `scheduleData.completeGame` silently fails during SIM. This blocks the entire franchise gameplay loop.
2. **DEF-002** (CRITICAL) — Replace `stadiumData.ts` static config with IndexedDB team lookups. Fixes "Unknown Stadium" everywhere.
3. **DEF-017** (MAJOR) — Show 0-0 records for all teams in Standings on fresh franchise.
4. **DEF-010** (MAJOR) — Remove `.slice(0, 10)` to show all 20 teams in Team Hub.
5. **DEF-006** (MAJOR) — Replace `Math.random()` stats with empty state when no season data exists.
6. **DEF-003/004/005** (MAJOR) — Remove random morale/fitness/trueValue; show "N/A".
7. **DEF-013/014/015** (MAJOR) — Wire real standings + real player stats into Today's Game card.
8. **DEF-007** (MAJOR) — Wire real manager/team record data into Team Hub.
9. **DEF-016** (MAJOR) — Wire World Series bracket to `usePlayoffData`.
10. **DEF-019-026** (MINOR) — Replace all hardcoded season numbers with dynamic props.

---

## APPENDIX: Phase 1A Grep Scan Results

| Pattern | Files Matched | Total Hits | Notes |
|---------|---------------|-----------|-------|
| `MOCK_` references | 14 | 207 | Most are empty-array fallbacks (benign); harmful ones are `convertToRosterItem`/`convertToStatsItem` with Math.random() |
| Hardcoded team names | 10 | 61 | "Tigers", "Sox", "Bears", etc. in stadiumData.ts and TeamHubContent.tsx |
| Suspicious decimal numbers | 45 | 888 | Most are legitimate CSS/styling; harmful ones in TeamHubContent mock objects |
| `console.log` stubs | 28 | 213 | Development logging, not harmful |
| `TODO`/`FIXME` comments | 41 | 357 | Technical debt markers |
| `"Unknown"` defaults | 2 | 2 | `stadiumData.ts:16` "Unknown Stadium" fallback |
| Fallback/default values | 11 | 36 | Mixture of proper defaults and placeholder data |
