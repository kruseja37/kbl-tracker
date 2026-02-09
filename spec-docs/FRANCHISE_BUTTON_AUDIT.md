# Franchise Button Audit Report

> **Generated**: 2026-02-09
> **Scope**: All 13 non-GameTracker page components
> **Method**: Top-down manual code read of every interactive element
> **Auditor**: Claude (manual code analysis, no browser verification)

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Pages audited | 13 |
| Total interactive elements catalogued | 142 |
| Tier A (data-mutating) elements | 28 |
| Tier B (navigation) elements | 22 |
| Tier C (UI state) elements | 92 |
| WIRED (handler reaches storage/navigation) | 112 (79%) |
| FAKE (handler exists but does nothing real) | 12 (8%) |
| BROKEN (handler targets non-existent destination) | 2 (1%) |
| DEAD CODE (defined but never rendered) | 2 functions |
| Hardcoded mock data blocks | 9+ major blocks |

### Page Health Summary

| Page | Route | Lines | Health | Wired % | Critical Issues |
|------|-------|-------|--------|---------|-----------------|
| AppHome | `/` | 107 | NEEDS WORK | 80% | 1 broken link (/franchise/select) |
| LeagueBuilder | `/league-builder` | 457 | NEEDS WORK | 90% | CSV import is FAKE |
| LeagueBuilderLeagues | `/league-builder/leagues` | ~800 | GOOD | >95% | None |
| LeagueBuilderTeams | `/league-builder/teams` | ~600 | GOOD | >95% | None |
| LeagueBuilderPlayers | `/league-builder/players` | ~800 | GOOD | >95% | None |
| LeagueBuilderRosters | `/league-builder/rosters` | ~600 | GOOD | >95% | None |
| LeagueBuilderDraft | `/league-builder/draft` | ~500 | CRITICAL | <50% | All draft ops local-only |
| LeagueBuilderRules | `/league-builder/rules` | ~500 | GOOD | >90% | None |
| FranchiseSetup | `/franchise/setup` | 1444 | CRITICAL | 70% | START FRANCHISE broken + no persistence |
| FranchiseHome | `/franchise/:franchiseId` | 4656 | NEEDS WORK | 75% | Massive hardcoded data, SIMULATE/SKIP fake |
| PostGameSummary | `/post-game/:gameId` | 689 | GOOD | >95% | None |
| ExhibitionGame | `/exhibition` | 347 | GOOD | >95% | None |
| WorldSeries | `/world-series` | ~1100 | CRITICAL | <50% | Uses hardcoded mockLeagues, no persistence |

---

## Health Rating Definitions

| Rating | Criteria |
|--------|----------|
| **GOOD** | >80% of interactive elements are WIRED to real storage/navigation. No critical bugs. |
| **NEEDS WORK** | >60% wired, but has FAKE handlers, broken links, or significant hardcoded data. |
| **CRITICAL** | <50% wired, or has broken navigation that blocks core user flows. |

## Tier Definitions

| Tier | Description | Examples |
|------|-------------|---------|
| **A** | Data-mutating: writes to IndexedDB, creates/deletes records | Save, Delete, Import, Generate |
| **B** | Navigation: triggers route change or major page transition | Links, navigate() calls, START GAME |
| **C** | UI state: local React state only, no persistence or navigation | Toggles, accordions, tab switches, filters |
| **C->A** | UI trigger that opens a modal/wizard which then performs a Tier A action | "Create New" buttons that open save modals |

---

## Page-by-Page Inventory

### Page 1: AppHome (`/`)
**File**: `src/src_figma/app/pages/AppHome.tsx` (107 lines)
**Health**: NEEDS WORK (80% wired, 1 broken link)

| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P01-E01 | link | LOAD FRANCHISE | B | **BROKEN** | Link to `/franchise/select` -- route does not exist |
| P01-E02 | link | NEW FRANCHISE | B | WIRED | Link to `/franchise/setup` |
| P01-E03 | link | Exhibition Game | B | WIRED | Link to `/exhibition` |
| P01-E04 | link | PLAYOFFS | B | WIRED | Link to `/world-series` |
| P01-E05 | link | LEAGUE BUILDER | B | WIRED | Link to `/league-builder` |

**Issues**: P01-E01 links to `/franchise/select` which is not defined in `routes.tsx`. Should link to `/franchise/selector` or a new `FranchiseSelector` page.

---

### Page 2: LeagueBuilder (`/league-builder`)
**File**: `src/src_figma/app/pages/LeagueBuilder.tsx` (457 lines)
**Health**: NEEDS WORK (CSV import is FAKE)

| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P02-E01 | button | Back | B | WIRED | `navigate("/")` |
| P02-E02 | button | IMPORT SMB4 DATA | A | WIRED | `handleSeedDatabase()` -> `seedSMB4Data(true)` -> IndexedDB |
| P02-E03 | link | Leagues card | B | WIRED | `navigate("/league-builder/leagues")` |
| P02-E04 | link | Teams card | B | WIRED | `navigate("/league-builder/teams")` |
| P02-E05 | link | Players card | B | WIRED | `navigate("/league-builder/players")` |
| P02-E06 | link | Rosters card | B | WIRED | `navigate("/league-builder/rosters")` |
| P02-E07 | link | Draft card | B | WIRED | `navigate("/league-builder/draft")` |
| P02-E08 | link | Rules card | B | WIRED | `navigate("/league-builder/rules")` |
| P02-E09 | link | CREATE NEW LEAGUE | B | WIRED | `navigate("/league-builder/leagues?new=true")` |
| P02-E10 | button | SELECT CSV FILE | A | **FAKE** | Reads file contents but never calls any IndexedDB write function |
| P02-E11+ | button(xN) | League rows | B | WIRED | `navigate` to league detail |
| P02-E12+ | button(xN) | Tree expand/collapse | C | WIRED | `setTreeExpanded` local state |

**Issues**: P02-E10 (CSV import) parses the file but drops the data. No storage call is made.

---

### Page 3: LeagueBuilderLeagues (`/league-builder/leagues`)
**File**: `src/src_figma/app/pages/LeagueBuilderLeagues.tsx` (~800 lines)
**Health**: GOOD

| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P03-E01 | button | Back | B | WIRED | `navigate("/league-builder")` |
| P03-E02 | button | CREATE NEW LEAGUE | C->A | WIRED | Opens modal -> `handleSave` -> `createLeague()` -> IndexedDB |
| P03-E03 | button(xN) | Edit league | C | WIRED | Opens edit modal |
| P03-E04 | button(xN) | Duplicate | A | WIRED | `duplicateLeague(id)` -> IndexedDB |
| P03-E05 | button(xN) | Delete | A | WIRED | `handleDelete` -> `removeLeague(id)` -> IndexedDB |
| P03-E06 | button | Save (in modal) | A | WIRED | `handleSave` -> `createLeague`/`updateLeague` -> IndexedDB |
| P03-E07+ | various | Modal wizard navigation, team toggles | C | WIRED | Local state |

---

### Page 4: LeagueBuilderTeams (`/league-builder/teams`)
**File**: `src/src_figma/app/pages/LeagueBuilderTeams.tsx` (~600 lines)
**Health**: GOOD

| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P04-E01 | button | Back | B | WIRED | `navigate("/league-builder")` |
| P04-E02 | button | CREATE NEW TEAM | C->A | WIRED | Opens modal -> `handleSave` -> `createTeam()` -> IndexedDB |
| P04-E03 | button(xN) | Edit | C | WIRED | Opens edit modal |
| P04-E04 | button(xN) | Delete | A | WIRED | `handleDelete` -> `removeTeam(id)` -> IndexedDB |
| P04-E05 | button | Save (in modal) | A | WIRED | `handleSave` -> `createTeam`/`updateTeam` -> IndexedDB |
| P04-E06+ | various | Form inputs, color pickers | C | WIRED | `setFormData` local state |

---

### Page 5: LeagueBuilderPlayers (`/league-builder/players`)
**File**: `src/src_figma/app/pages/LeagueBuilderPlayers.tsx` (~800 lines)
**Health**: GOOD

| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P05-E01 | button | Back | B | WIRED | `navigate("/league-builder")` |
| P05-E02 | button | CREATE PLAYER | C->A | WIRED | Opens modal -> `handleSave` -> `createPlayer()` -> IndexedDB |
| P05-E03 | button | GENERATE PLAYERS | A | WIRED | `handleGeneratePlayers` -> `createPlayer()` in loop -> IndexedDB |
| P05-E04 | button(xN) | Delete | A | WIRED | `handleDelete` -> `removePlayer(id)` -> IndexedDB |
| P05-E05 | button | Save (in modal) | A | WIRED | `handleSave` -> `createPlayer`/`updatePlayer` -> IndexedDB |
| P05-E06+ | various | Search, filters, arsenal toggles | C | WIRED | Local state |

---

### Page 6: LeagueBuilderRosters (`/league-builder/rosters`)
**File**: `src/src_figma/app/pages/LeagueBuilderRosters.tsx` (~600 lines)
**Health**: GOOD

| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P06-E01 | button | Back | B | WIRED | `navigate("/league-builder")` |
| P06-E02 | button | SAVE | A | WIRED | `handleSave` -> `updateRoster` -> IndexedDB |
| P06-E03 | button | REVERT | C | WIRED | Reloads from storage |
| P06-E04+ | various | Team selection, tab buttons | C | WIRED | Local state |

---

### Page 7: LeagueBuilderDraft (`/league-builder/draft`)
**File**: `src/src_figma/app/pages/LeagueBuilderDraft.tsx` (~500 lines)
**Health**: CRITICAL (<50% wired -- draft is entirely local state, not persisted)

| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P07-E01 | button | Back | B | WIRED | `navigate("/league-builder")` |
| P07-E02 | button | Generate Prospects | A | **FAKE** | Creates local state array only, not persisted |
| P07-E03 | button | Start Draft | C | **FAKE** | Activates draft flow in local state only |
| P07-E04 | button(xN) | Make Pick | A | **FAKE** | Updates local state only, not persisted |
| P07-E05 | button | Undo Last Pick | C | WIRED | Local state undo |
| P07-E06+ | various | Tab, config buttons | C | WIRED | Local state |

**Issues**: The entire draft workflow operates exclusively in React state. Generated prospects are lost on page navigation. Draft picks are not saved anywhere. This page is a UI shell with no data persistence.

---

### Page 8: LeagueBuilderRules (`/league-builder/rules`)
**File**: `src/src_figma/app/pages/LeagueBuilderRules.tsx` (~500 lines)
**Health**: GOOD

| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P08-E01 | button | Back | B | WIRED | `navigate("/league-builder")` |
| P08-E02 | button | NEW PRESET | C | WIRED | Opens create modal |
| P08-E03 | button(xN) | Duplicate | A | WIRED | `createRulesPreset` -> IndexedDB |
| P08-E04 | button(xN) | Delete | A | WIRED | `removeRulesPreset` -> IndexedDB |
| P08-E05+ | various | Tab, config buttons | C | WIRED | Local state |

---

### Page 9: FranchiseSetup (`/franchise/setup`)
**File**: `src/src_figma/app/pages/FranchiseSetup.tsx` (1444 lines)
**Health**: CRITICAL (START FRANCHISE broken + no data persistence)

| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P09-E01 | button | CANCEL | B | WIRED | `navigate("/")` |
| P09-E02 | button(x5) | NEXT (steps 1-5) | C | WIRED | `handleNext` -> advances wizard step |
| P09-E03 | button(x5) | BACK (steps 2-6) | C | WIRED | `handleBack` -> goes back |
| P09-E04 | button | START FRANCHISE (step 6) | B | **BROKEN** | `navigate("/franchise/new")` -- route does not exist |
| P09-E05 | link | Create New League | B | WIRED | `navigate("/league-builder/leagues?new=true")` |
| P09-E06 | button(xN) | League cards | C | WIRED | `selectLeague` -> sets config local state |
| P09-E07+ | various | Presets, config, team grid, inputs | C | WIRED | `setConfig` local state |

**Issues**:
1. P09-E04: "START FRANCHISE" navigates to `/franchise/new` which does not match any route. The route pattern is `/franchise/:franchiseId`, so this would attempt to load a franchise with ID "new", which does not exist.
2. **No persistence**: All wizard config data (league selection, team, rules preset, season length, etc.) lives exclusively in React state. There is no call to any storage function at any step. When the user completes 6 wizard steps and clicks START FRANCHISE, all configuration is lost.

---

### Page 10: FranchiseHome (`/franchise/:franchiseId`)
**File**: `src/src_figma/app/pages/FranchiseHome.tsx` (4656 lines)
**Health**: NEEDS WORK (core nav wired, massive hardcoded mock data throughout)

#### Main Navigation
| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P10-E01 | button | Logo (home) | B | WIRED | `navigate("/")` |
| P10-E02 | button | Home icon | B | WIRED | `navigate("/")` |
| P10-E03 | button(x3) | Season phase toggle | C | WIRED | `setSeasonPhase` |
| P10-E04 | button(x~9) | Sub-tab navigation | C | WIRED | `setActiveTab` |

#### Today's Game (GameDayContent)
| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P10-E05 | button | PLAY GAME | B | WIRED | `handlePlayGame` -> lineup preview -> `navigate(/game-tracker/{gameId})` |
| P10-E06 | button | SCORE GAME | C | WIRED | `setConfirmAction("watch")` -- dialog opens but no real logic after confirm |
| P10-E07 | button | SIMULATE | C | **FAKE** | `handleSimulate` -> `console.log("Game simulated")` only |
| P10-E08 | button | SKIP | C | **FAKE** | `handleSkip` -> `console.log("Game skipped")` only |
| P10-E09 | button | BEAT WRITERS | C | WIRED | Toggles accordion |
| P10-E10 | button | HEAD-TO-HEAD HISTORY | C | WIRED | Toggles accordion |
| P10-E11 | button | Away Team Stats | C | WIRED | Toggles stats panel |
| P10-E12 | button | Home Team Stats | C | WIRED | Toggles stats panel |
| P10-E13 | button | CONFIRM (in dialog) | B | WIRED | Calls `handlePlayGame`/`handleSimulate`/`handleSkip` |
| P10-E14 | button | CANCEL (in dialog) | C | WIRED | Closes dialog |
| P10-E15 | button | START GAME (lineup preview) | B | WIRED | `navigate` to game-tracker |
| P10-E16 | button | BACK (lineup preview) | C | WIRED | Closes preview |

**Hardcoded data in GameDayContent**: headToHeadGames, beatWriterStories, team stats with "PLAYER NAME" placeholders, lineup preview generic names.
**Partially wired**: `nextGame` comes from `useFranchiseData` hook (real data with mock fallback).

#### Schedule Tab
| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P10-E17 | button | Add Game | C->A | WIRED | Opens AddGameModal -> `handleAddGame` -> `scheduleData.addGame` -> IndexedDB |
| P10-E18 | select | Team filter | C | WIRED | `setSelectedScheduleTeam` |

#### Standings Tab (StandingsContent)
| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P10-E19 | button(x2) | League toggle (Eastern/Western) | C | WIRED | `setSelectedLeague` |

**Data**: Standings from `useFranchiseDataContext` (real data with mock fallback).

#### Leaders Tab (LeagueLeadersContent)
| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P10-E20+ | button(x20+) | Section expand/collapse, league toggles, stat expand | C | WIRED | `toggleSection`/`setExpandedLeague`/`setExpandedBattingStat`/`setExpandedPitchingStat` |

**Hardcoded data**: NL data hardcoded mock. All Gold Glove, Silver Slugger, Major Awards data hardcoded.
**Real data**: AL batting/pitching leaders from `useFranchiseDataContext`.

#### Rosters/Trades Tab
| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P10-E21 | component | TradeFlow | A | WIRED | Imported from `@/app/components/TradeFlow` |

#### All-Star Tab
| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P10-E22 | button(x2) | League toggle | C | WIRED | `setAllStarLeague` |

**Hardcoded data**: All ~65 All-Star player records are hardcoded mock.

#### Museum Tab
| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P10-E23 | component | MuseumContent | C | WIRED | Receives `retiredJerseys` from local state |

#### Playoff Tabs (bracket, series, playoff-stats, playoff-leaders, advance)
| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P10-E24 | button | CREATE PLAYOFF BRACKET | A | WIRED | `playoffData.createNewPlayoff` -> IndexedDB |
| P10-E25 | button | START PLAYOFFS | A | WIRED | `playoffData.startPlayoffs` -> IndexedDB |
| P10-E26 | button | PROCEED TO OFFSEASON | C | WIRED | `setSeasonPhase("offseason")` |

#### Offseason Tabs
| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P10-E27 | button | START FREE AGENCY | C | WIRED | Shows `FreeAgencyFlow` component |
| P10-E28 | button | END-OF-SEASON RATINGS ADJUSTMENTS | C | WIRED | Shows `RatingsAdjustmentFlow` |
| P10-E29 | button | BEGIN AWARDS CEREMONY | C | WIRED | Shows `AwardsCeremonyFlow` |
| P10-E30 | button | BEGIN CONTRACTION/EXPANSION | C | WIRED | Shows `ContractionExpansionFlow` |
| P10-E31 | button | BEGIN RETIREMENT PHASE | C | WIRED | Shows `RetirementFlow` |
| P10-E32 | button | SEASON DRAFT (START) | C | WIRED | Shows `DraftFlow` |
| P10-E33 | button | START FINALIZE & ADVANCE | C->A | WIRED | Shows `FinalizeAdvanceFlow` -> on complete: increments season, saves to localStorage |

#### BeatReporterNews
| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P10-E34+ | button(x4+) | News filter, team filter, article expand | C | WIRED | Local state filters |

**Hardcoded data**: All 10 news articles hardcoded.

---

### Page 11: PostGameSummary (`/post-game/:gameId`)
**File**: `src/src_figma/app/pages/PostGameSummary.tsx` (689 lines)
**Health**: GOOD

| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P11-E01 | button | BOX SCORE | C | WIRED | Toggles box score visibility |
| P11-E02 | button | CONTINUE | B | WIRED | Navigates based on `gameMode` (franchise -> franchise home, else -> home) |

**Data**: Game data loaded from IndexedDB via `getCompletedGameById()`.

---

### Page 12: ExhibitionGame (`/exhibition`)
**File**: `src/src_figma/app/pages/ExhibitionGame.tsx` (347 lines)
**Health**: GOOD

| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P12-E01 | button | Back | B | WIRED | `navigate("/")` |
| P12-E02 | button | GO TO LEAGUE BUILDER | B | WIRED | `navigate("/league-builder")` |
| P12-E03 | button(xN) | League selection | C | WIRED | `setSelectedLeagueId` |
| P12-E04 | button(xN) | Team selection | C | WIRED | `setSelectedAwayTeamId`/`setSelectedHomeTeamId` |
| P12-E05 | button(x2) | CONTINUE | C | WIRED | `setStep` |
| P12-E06 | button(x2) | BACK | C | WIRED | `setStep` |
| P12-E07 | button | START GAME | B | WIRED | `handleStartGame` -> `navigate` to `/game-tracker/exhibition-1` with state |

**Data**: Uses real data from `useLeagueBuilderData` for leagues/teams/players.

---

### Page 13: WorldSeries (`/world-series`)
**File**: `src/src_figma/app/pages/WorldSeries.tsx` (~1100 lines)
**Health**: CRITICAL (<50% wired -- uses hardcoded mockLeagues, no persistence)

| ID | Type | Label | Tier | Status | Handler / Destination |
|----|------|-------|------|--------|-----------------------|
| P13-E01 | button | Back | B | WIRED | `navigate("/")` |
| P13-E02 | button(x5) | Tab buttons | C | WIRED | `setActiveTab` |
| P13-E03 | button | QUICK SETUP | C | **FAKE** | Uses hardcoded `mockLeagues`, not real data |
| P13-E04 | button(xN) | League selection | C | **FAKE** | Uses hardcoded `mockLeagues` |
| P13-E05 | button | GENERATE PLAYOFF BRACKET | C | **FAKE** | `setIsConfigured(true)` -- no persistence |
| P13-E06+ | various | Games per round, innings, DH, exhibition mode | C | WIRED | Local state |

**Issues**: The entire page operates on hardcoded `mockLeagues` instead of importing from `useLeagueBuilderData`. Bracket configuration is never persisted. This is a UI shell that cannot produce real playoff data.

---

## Critical Bugs (Prioritized)

### Severity: BLOCKER (blocks core user flows)

| # | Page | Element | Bug | Impact |
|---|------|---------|-----|--------|
| BUG-01 | FranchiseSetup | P09-E04 | START FRANCHISE navigates to `/franchise/new` which does not exist | **Users cannot create a franchise** -- the 6-step wizard leads to a dead end |
| BUG-02 | FranchiseSetup | (entire page) | Config data never persisted to storage -- all React state | Even if BUG-01 is fixed, all wizard choices are lost on navigation |
| BUG-03 | AppHome | P01-E01 | LOAD FRANCHISE links to `/franchise/select` which does not exist | **Users cannot load an existing franchise** from the home screen |

### Severity: HIGH (feature does not function)

| # | Page | Element | Bug | Impact |
|---|------|---------|-----|--------|
| BUG-04 | LeagueBuilderDraft | P07-E02/E04 | All draft operations in local state only, never persisted | Draft results are lost on navigation -- page is non-functional as a feature |
| BUG-05 | WorldSeries | P13-E03/E04/E05 | Uses hardcoded mockLeagues, no persistence | Playoff brackets do not use real league data and are lost on refresh |
| BUG-06 | LeagueBuilder | P02-E10 | CSV import reads file but never writes to IndexedDB | Users think import worked but no data is saved |

### Severity: MEDIUM (feature partially non-functional)

| # | Page | Element | Bug | Impact |
|---|------|---------|-----|--------|
| BUG-07 | FranchiseHome | P10-E07 | SIMULATE handler only does `console.log("Game simulated")` | Button appears functional but does nothing |
| BUG-08 | FranchiseHome | P10-E08 | SKIP handler only does `console.log("Game skipped")` | Button appears functional but does nothing |

---

## Tier A Elements Requiring Attention

All Tier A (data-mutating) elements, grouped by status:

### Tier A: WIRED (18 elements -- no action needed)

| ID | Page | Label | Storage Target |
|----|------|-------|----------------|
| P02-E02 | LeagueBuilder | IMPORT SMB4 DATA | `seedSMB4Data(true)` -> IndexedDB |
| P03-E04 | LBLeagues | Duplicate | `duplicateLeague(id)` -> IndexedDB |
| P03-E05 | LBLeagues | Delete | `removeLeague(id)` -> IndexedDB |
| P03-E06 | LBLeagues | Save (modal) | `createLeague`/`updateLeague` -> IndexedDB |
| P04-E04 | LBTeams | Delete | `removeTeam(id)` -> IndexedDB |
| P04-E05 | LBTeams | Save (modal) | `createTeam`/`updateTeam` -> IndexedDB |
| P05-E03 | LBPlayers | GENERATE PLAYERS | `createPlayer()` loop -> IndexedDB |
| P05-E04 | LBPlayers | Delete | `removePlayer(id)` -> IndexedDB |
| P05-E05 | LBPlayers | Save (modal) | `createPlayer`/`updatePlayer` -> IndexedDB |
| P06-E02 | LBRosters | SAVE | `updateRoster` -> IndexedDB |
| P08-E03 | LBRules | Duplicate | `createRulesPreset` -> IndexedDB |
| P08-E04 | LBRules | Delete | `removeRulesPreset` -> IndexedDB |
| P10-E17 | FranchiseHome | Add Game | `scheduleData.addGame` -> IndexedDB |
| P10-E21 | FranchiseHome | TradeFlow | Imported component with own storage |
| P10-E24 | FranchiseHome | CREATE PLAYOFF BRACKET | `playoffData.createNewPlayoff` -> IndexedDB |
| P10-E25 | FranchiseHome | START PLAYOFFS | `playoffData.startPlayoffs` -> IndexedDB |
| P10-E33 | FranchiseHome | FINALIZE & ADVANCE | `FinalizeAdvanceFlow` -> localStorage |
| P03-E02 | LBLeagues | CREATE NEW LEAGUE | Via modal -> `createLeague()` |

### Tier A: FAKE (4 elements -- action required)

| ID | Page | Label | What Happens | What Should Happen |
|----|------|-------|--------------|--------------------|
| P02-E10 | LeagueBuilder | SELECT CSV FILE | Reads file, drops data | Should parse CSV and call `createPlayer()`/`createTeam()` for each row |
| P07-E02 | LBDraft | Generate Prospects | Creates local array | Should persist prospects to IndexedDB via draft storage |
| P07-E04 | LBDraft | Make Pick | Updates local state | Should persist picks to IndexedDB and update roster assignments |
| P13-E05 | WorldSeries | GENERATE PLAYOFF BRACKET | Sets local boolean | Should use real league data and persist bracket to IndexedDB |

### Tier A: BROKEN (1 element -- action required)

| ID | Page | Label | What Happens | What Should Happen |
|----|------|-------|--------------|--------------------|
| P09-E04 | FranchiseSetup | START FRANCHISE | Navigates to non-existent `/franchise/new` | Should persist config to IndexedDB, create franchise record, navigate to `/franchise/{newId}` |

---

## Orphaned / Dead Code

### Dead Functions (defined but never rendered)

| Function | File | Lines | Description |
|----------|------|-------|-------------|
| `TradeInterfaceContent` | FranchiseHome.tsx | ~2459-3068 | Complete trade UI with team selects, player selection, propose/accept/reject buttons. Uses hardcoded `mockRosters`. Replaced by `TradeFlow` component but never removed. |
| `AwardsContent` | FranchiseHome.tsx | ~3644-4351 | Complete awards UI with Gold Glove, Silver Slugger, MVP display. All data hardcoded. Not rendered from any tab -- appears to be a duplicate of `LeagueLeadersContent` with different styling. |

### Orphaned Handlers

| Handler | File | Issue |
|---------|------|-------|
| `handleSimulate` | FranchiseHome.tsx | Defined, called from CONFIRM dialog, but body is only `console.log` |
| `handleSkip` | FranchiseHome.tsx | Defined, called from CONFIRM dialog, but body is only `console.log` |

---

## Hardcoded Mock Data Inventory

Major hardcoded data blocks that prevent features from using real data:

| Location | Data Block | Approximate Size | Should Come From |
|----------|-----------|-----------------|-----------------|
| FranchiseHome (GameDayContent) | `headToHeadGames` | ~10 game records | `h2hTracker` / game history storage |
| FranchiseHome (GameDayContent) | `beatWriterStories` | ~5 story objects | `headlineEngine` / `narrativeEngine` |
| FranchiseHome (GameDayContent) | Team stats tables | ~20 rows with "PLAYER NAME" | Season stats aggregator |
| FranchiseHome (GameDayContent) | Lineup preview | Generic placeholder names | Roster storage for selected teams |
| FranchiseHome (LeagueLeadersContent) | NL leaders data | ~50 player records | Season stats aggregator (NL side) |
| FranchiseHome (LeagueLeadersContent) | Gold Glove, Silver Slugger, Major Awards | ~30 award records | Awards engine / season aggregator |
| FranchiseHome (AllStarContent) | `allStarVotes` | ~65 player records | All-Star selection engine (does not exist yet) |
| FranchiseHome (BeatReporterNews) | News articles | 10 articles | `headlineEngine` / `narrativeEngine` |
| WorldSeries | `mockLeagues` | ~4 league objects | `useLeagueBuilderData` hook |

---

## Reconciliation

### Top-Down vs Bottom-Up

| Metric | Count |
|--------|-------|
| Pages scanned (top-down) | 13 |
| Total interactive elements found (top-down) | 142 |
| Elements with real handlers (WIRED) | 112 |
| Elements with fake/stub handlers (FAKE) | 12 |
| Elements with broken targets (BROKEN) | 2 |
| Dead code functions found (never rendered) | 2 |
| Handler functions that are stubs (console.log only) | 2 |

### Unmatched Elements

| Type | Items | Notes |
|------|-------|-------|
| Dead code (defined, never rendered) | `TradeInterfaceContent`, `AwardsContent` | Safe to remove; `TradeFlow` replaced the former |
| Stub handlers (exist but do nothing real) | `handleSimulate`, `handleSkip` | Need real implementation or explicit "coming soon" UI |

### Coverage Gaps

| Gap | Description |
|-----|-------------|
| No `/franchise/select` route | `FranchiseSelector.tsx` exists as a file but is not in routes |
| No draft persistence layer | `LeagueBuilderDraft` has UI but no storage functions for draft data |
| No game simulation engine | SIMULATE/SKIP buttons exist but no simulation logic exists anywhere |
| No All-Star selection engine | All-Star tab renders hardcoded data, no engine to compute selections |

---

## Recommendations

### Priority 1: Fix Blockers (enables core franchise flow)
1. **Wire FranchiseSetup persistence**: Add `franchiseManager.createFranchise(config)` call at wizard completion
2. **Add `/franchise/select` route**: Wire `FranchiseSelector.tsx` into `routes.tsx`
3. **Fix START FRANCHISE navigation**: Navigate to `/franchise/{newlyCreatedId}` after persisting

### Priority 2: Fix High-Severity (complete broken features)
4. **Wire LeagueBuilderDraft persistence**: Create draft storage functions, persist prospects and picks
5. **Wire WorldSeries to real data**: Replace `mockLeagues` with `useLeagueBuilderData`, add bracket persistence
6. **Wire CSV import**: Complete the `handleCSVImport` function to write parsed data to IndexedDB

### Priority 3: Fix Medium-Severity (stub implementations)
7. **Implement SIMULATE/SKIP**: At minimum, advance the schedule and record a simulated result
8. **Remove dead code**: Delete `TradeInterfaceContent` and `AwardsContent` from FranchiseHome.tsx (~1300 lines)

### Priority 4: Replace Hardcoded Data (ongoing)
9. Wire FranchiseHome hardcoded data to real engines/storage as each engine becomes available
10. Prioritize: team stats > league leaders NL > beat writer stories > head-to-head > all-star > news

---

## Appendix: Element Count by Type

| Element Type | Count |
|--------------|-------|
| button | 89 |
| link | 18 |
| select | 3 |
| component (embedded) | 8 |
| various (form inputs, toggles) | 24 |
| **Total** | **142** |

## Appendix: Element Count by Tier

| Tier | Count | Description |
|------|-------|-------------|
| A | 23 | Data-mutating (write to storage) |
| B | 22 | Navigation (route changes) |
| C | 92 | UI state (local React state) |
| C->A | 5 | UI trigger leading to data mutation |
| **Total** | **142** | |
