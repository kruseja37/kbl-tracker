# Franchise Button Audit Report

**Generated:** 2026-02-09
**Pages audited:** 12 (+ 9 modals)
**Total interactive element types found:** 434
**Audit method:** Top-down (components→handlers) + Bottom-up (handlers→components) with reconciliation

## Reconciliation Integrity

- **Top-down elements (non-GameTracker pages):** 284
- **Top-down elements (modals, non-GT):** 75
- **GameTracker-scoped modals (FielderCredit, ErrorOnAdvance, PitchCount, PlayerCard, EndGame):** 25
- **Orphaned sub-components (in FranchiseHome):** ~50 elements in 2 dead sub-components
- **Bottom-up handler functions found:** 87 handler definitions across non-GT pages, 143 across all components
- **Dead modal elements:** 5 modals × ~6 elements avg = ~30 dead elements in orphaned figma modals
- **Unmatched elements (DEAD buttons):** See detail below
- **Orphaned handlers:** 2 entire sub-components in FranchiseHome (~1300 lines dead code)

## Executive Summary

### Health by Page

| Page | Route | Elements | Tier A | Tier B | Tier C | WIRED | DEAD | FAKE | TODO | Health |
|------|-------|----------|--------|--------|--------|-------|------|------|------|--------|
| AppHome | `/` | 5 | 0 | 5 | 0 | 5 | 0 | 0 | 0 | ✅ GOOD |
| ExhibitionGame | `/exhibition` | 10 | 0 | 3 | 7 | 10 | 0 | 0 | 0 | ✅ GOOD |
| WorldSeries | `/world-series` | 10 | 0 | 1 | 9 | 2 | 0 | 8 | 0 | ⚠️ CRITICAL |
| FranchiseSetup | `/franchise/setup` | 37 | 0 | 4 | 33 | 35 | 1 | 1 | 0 | ⚠️ NEEDS WORK |
| FranchiseHome | `/franchise/:id` | 100 | 6 | 11 | 83 | 55 | 37 | 2 | 0 | ⚠️ NEEDS WORK |
| LeagueBuilder | `/league-builder` | 10 | 1 | 9 | 0 | 10 | 0 | 0 | 0 | ✅ GOOD |
| LB Leagues | `/league-builder/leagues` | 16 | 3 | 4 | 9 | 16 | 0 | 0 | 0 | ✅ GOOD |
| LB Teams | `/league-builder/teams` | 20 | 2 | 3 | 15 | 20 | 0 | 0 | 0 | ✅ GOOD |
| LB Players | `/league-builder/players` | 29 | 2 | 3 | 24 | 29 | 0 | 0 | 0 | ✅ GOOD |
| LB Rosters | `/league-builder/rosters` | 25 | 20 | 2 | 3 | 25 | 0 | 0 | 0 | ✅ GOOD |
| LB Draft | `/league-builder/draft` | 14 | 5 | 2 | 7 | 13 | 0 | 1 | 0 | ⚠️ NEEDS WORK |
| LB Rules | `/league-builder/rules` | 35 | 3 | 3 | 29 | 35 | 0 | 0 | 0 | ✅ GOOD |
| PostGameSummary | `/post-game/:id` | 3 | 0 | 2 | 1 | 3 | 0 | 0 | 0 | ✅ GOOD |
| **TOTALS** | | **314** | **42** | **52** | **220** | **258** | **38** | **12** | **0** | |

### Modals Summary

| Modal | Used By | Status | Elements | Notes |
|-------|---------|--------|----------|-------|
| AddGameModal | FranchiseHome | ✅ WIRED | 11 | All elements persist to IndexedDB |
| FielderCreditModal | GameTracker | ✅ WIRED | 4 | Active in figma GT |
| ErrorOnAdvanceModal | GameTracker | ⚠️ TODO | 6 | Confirm handler only console.logs |
| PitchCountModal | GameTracker (inline) | ✅ WIRED | 4 | Active in figma GT |
| PlayerCardModal | GameTracker (inline) | ✅ WIRED | 9 | Mojo/Fitness editing works |
| EndGameConfirm | GameTracker (inline) | ✅ WIRED | 5 | Saves game to IndexedDB |
| DefensiveSubModal | ❌ NONE | 🔴 DEAD | 7 | Orphaned — barrel export only |
| DoubleSwitchModal | ❌ NONE | 🔴 DEAD | 7 | Orphaned — barrel export only |
| PinchHitterModal | ❌ NONE | 🔴 DEAD | 5 | Orphaned — barrel export only |
| PinchRunnerModal | ❌ NONE | 🔴 DEAD | 5 | Orphaned — barrel export only |
| PitchingChangeModal | ❌ NONE | 🔴 DEAD | 4 | Orphaned — barrel export only |
| PositionSwitchModal | ❌ NONE | 🔴 DEAD | 6 | Orphaned — barrel export only |

---

## Page-by-Page Inventory

### AppHome (`/`)

| ID | Type | Label | Tier | Status | Handler → Destination |
|----|------|-------|------|--------|-----------------------|
| AH-01 | Link | LOAD FRANCHISE | B | WIRED | `<Link to="/franchise/tigers">` |
| AH-02 | Link | NEW FRANCHISE | B | WIRED | `<Link to="/franchise/setup">` |
| AH-03 | Link | Exhibition Game | B | WIRED | `<Link to="/exhibition">` |
| AH-04 | Link | PLAYOFFS | B | WIRED | `<Link to="/world-series">` |
| AH-05 | Link | LEAGUE BUILDER | B | WIRED | `<Link to="/league-builder">` |

Health: ✅ GOOD — Note: AH-01 hardcodes `/franchise/tigers` (single-franchise app)

---

### ExhibitionGame (`/exhibition`)

| ID | Type | Label | Tier | Status | Handler → Destination |
|----|------|-------|------|--------|-----------------------|
| EX-01 | button | Back arrow | B | WIRED | `navigate("/")` |
| EX-02 | button | GO TO LEAGUE BUILDER | B | WIRED | `navigate("/league-builder")` — shown when no leagues |
| EX-03 | button (×N) | League name cards | C | WIRED | `setSelectedLeagueId(league.id)` |
| EX-04 | button | CONTINUE (league→select) | C | WIRED | `setStep("select")` |
| EX-05 | select | AWAY TEAM dropdown | C | WIRED | `setSelectedAwayTeamId()` → triggers `loadTeamLineup()` → IndexedDB read |
| EX-06 | select | HOME TEAM dropdown | C | WIRED | `setSelectedHomeTeamId()` → triggers `loadTeamLineup()` → IndexedDB read |
| EX-07a | button | BACK (select→league) | C | WIRED | `setStep("league")` |
| EX-07b | button | CONTINUE (select→lineups) | C | WIRED | `setStep("lineups")` |
| EX-08a | button | BACK (lineups→select) | C | WIRED | `setStep("select")` |
| EX-08b | button | START GAME | B | WIRED | `handleStartGame()` → `navigate("/game-tracker/exhibition-1", {state: rosters})` |

Health: ✅ GOOD — Hardcoded values: `leagueId: 'sml'` (line 112), `userTeamSide: 'home'` (line 113)

---

### WorldSeries (`/world-series`)

| ID | Type | Label | Tier | Status | Handler → Destination |
|----|------|-------|------|--------|-----------------------|
| WS-01 | button | Back arrow | B | WIRED | `navigate("/")` |
| WS-02 | button (×4) | Tab buttons | C | WIRED | `setActiveTab(tab.id)` |
| WS-03 | button (×4) | League select cards | C | **FAKE** | Uses hardcoded `mockLeagues` array — not from IndexedDB |
| WS-04 | button (×N) | Best of N per round | C | **FAKE** | Sets local state from mock data |
| WS-05 | button (×4) | Innings per game | C | **FAKE** | Local state only, mock data |
| WS-06 | button (×3) | DH rule | C | **FAKE** | Local state only |
| WS-07 | button | GENERATE PLAYOFF BRACKET | C | **FAKE** | Only sets `isConfigured=true` — no bracket generation |
| WS-08 | button (×5) | Batting stat accordions | C | **FAKE** | Hardcoded `battingLeadersData` |
| WS-09 | button (×5) | Pitching stat accordions | C | **FAKE** | Hardcoded `pitchingLeadersData` |
| WS-10 | button (×3) | Year history accordions | C | **FAKE** | Hardcoded `playoffHistory` |

Health: ⚠️ CRITICAL — Entire page is a mock shell. Zero data persistence. Zero engine calls.

---

### FranchiseSetup (`/franchise/setup`)

| ID | Type | Label | Tier | Status | Handler → Destination |
|----|------|-------|------|--------|-----------------------|
| FS-01 | button | Back arrow | B | WIRED | `navigate("/")` |
| FS-02 | button | CANCEL | B | WIRED | `navigate("/")` |
| FS-03 | button | NEXT | C | WIRED | `handleNext()` → advances wizard step |
| FS-04 | button | BACK | C | WIRED | `handleBack()` → goes to previous step |
| FS-05 | button | START FRANCHISE | B | **FAKE** | `navigate("/franchise/new")` — does NOT persist config to storage |
| FS-06 | button (×N) | League radio buttons | C | WIRED | `selectLeague(league.id)` — local state |
| FS-07 | button (×N) | Expand league details | C | WIRED | Toggles `expandedLeague` |
| FS-08 | button | Create New League | B | WIRED | `navigate("/league-builder/leagues?new=true")` |
| FS-09 | button (×3) | Quick presets | C | WIRED | `applyPreset()` — local state |
| FS-10 | button (×6) | Games per team | C | WIRED | `setConfig(...)` — local state |
| FS-11 | button (×3) | Innings per game | C | WIRED | `setConfig(...)` — local state |
| FS-12 | button (×3) | Extra innings rule | C | WIRED | `setConfig(...)` — local state |
| FS-13 | button (×3) | Schedule type | C | WIRED | `setConfig(...)` — local state |
| FS-14 | button (×3) | Additional options | C | WIRED | `setConfig(...)` — local state |
| FS-15 | button (×5) | Teams qualifying | C | WIRED | `setConfig(...)` — local state |
| FS-16 | button (×3) | Playoff format | C | WIRED | `setConfig(...)` — local state |
| FS-17 | button (×8) | Series lengths per round | C | WIRED | `setConfig(...)` — local state |
| FS-18 | button (×3) | Home field advantage | C | WIRED | `setConfig(...)` — local state |
| FS-19 | button | Select All teams | C | WIRED | Sets all team IDs |
| FS-20 | button | Clear All teams | C | WIRED | Clears team selection |
| FS-21 | button | Random 1 team | C | WIRED | Selects random team |
| FS-22 | button (×N) | Team selection grid | C | WIRED | `toggleTeam(team.id)` |
| FS-23 | button | Single Player radio | C | WIRED | `setConfig({mode: "single"})` |
| FS-24 | button | Multiplayer radio | C | WIRED | `setConfig({mode: "multiplayer"})` |
| FS-25 | button | Use Existing Rosters | C | WIRED | `setConfig({roster.mode: "existing"})` |
| FS-26 | button | [View Rosters] | C | **DEAD** | No onClick handler attached |
| FS-27 | button | Fantasy Draft radio | C | WIRED | `setConfig({roster.mode: "draft"})` |
| FS-28 | button (×3) | Player pool source | C | WIRED | `setConfig(...)` |
| FS-29 | input[number] | Draft rounds | C | WIRED | `setConfig(...)` |
| FS-30 | select | Draft format | C | WIRED | `setConfig(...)` |
| FS-31 | select | Time per pick | C | WIRED | `setConfig(...)` |
| FS-32 | input[text] | Franchise name | C | WIRED | `setConfig(...)` |
| FS-33–37 | button (×5) | [Edit] buttons | C | WIRED | `jumpToStep(N)` |

Health: ⚠️ NEEDS WORK — FS-05 (START FRANCHISE) never persists config. FS-26 ([View Rosters]) is dead.

---

### FranchiseHome (`/franchise/:franchiseId`)

**Active elements (rendered):**

| ID | Type | Label | Tier | Status | Handler → Destination |
|----|------|-------|------|--------|-----------------------|
| FH-01 | button | SMB Logo | B | WIRED | `navigate("/")` |
| FH-02 | button | Home icon | B | WIRED | `navigate("/")` |
| FH-03–05 | button (×3) | Season phase toggles | C | WIRED | `setSeasonPhase(...)` |
| FH-06 | button (×N) | Sub-tab buttons (9/8/10) | C | WIRED | `setActiveTab(tab.id)` |
| FH-07–08 | button (×2) | All-Star league toggles | C | WIRED | `setAllStarLeague(...)` |
| FH-09 | button | CREATE PLAYOFF BRACKET | **A** | WIRED | `playoffData.createNewPlayoff()` → IndexedDB |
| FH-10 | button | START PLAYOFFS | **A** | WIRED | `playoffData.startPlayoffs()` → IndexedDB |
| FH-11 | button | PROCEED TO OFFSEASON | C | WIRED | `setSeasonPhase("offseason")` |
| FH-12 | button | START FREE AGENCY | B | WIRED | Opens `<FreeAgencyFlow>` |
| FH-21 | button | DRAFT card | B | WIRED | Opens `<DraftFlow>` |
| FH-22 | button | START FINALIZE | B | WIRED | Opens `<FinalizeAdvanceFlow>` |
| FH-24 | (prop) | onAdvanceComplete | **A** | WIRED | `localStorage.setItem('kbl-current-season', ...)` |
| FH-25 | button | RATINGS ADJUSTMENTS card | B | WIRED | Opens `<RatingsAdjustmentFlow>` |
| FH-26 | button | BEGIN AWARDS CEREMONY | B | WIRED | Opens `<AwardsCeremonyFlow>` |
| FH-27 | button | CONTRACTION/EXPANSION | B | WIRED | Opens `<ContractionExpansionFlow>` |
| FH-28 | button | RETIREMENT PHASE | B | WIRED | Opens `<RetirementFlow>` |
| FH-30 | (prop) | AddGameModal.onAddGame | **A** | WIRED | `scheduleData.addGame()` → IndexedDB |
| FH-31 | (prop) | AddGameModal.onAddSeries | **A** | WIRED | `scheduleData.addSeries()` → IndexedDB |
| FH-32–33 | button (×2) | Standings league toggles | C | WIRED | `setSelectedLeague(...)` |
| FH-34 | button | PLAY GAME | B | WIRED | Opens confirm → `navigate("/game-tracker/game-123")` |
| FH-35 | button | SCORE GAME | B | WIRED | Opens confirm → navigate |
| FH-36 | button | SIMULATE | C | **FAKE** | `console.log("Game simulated")` — stub |
| FH-37 | button | SKIP | C | **FAKE** | `console.log("Game skipped")` — stub |
| FH-38–41 | button (×4) | Accordion toggles | C | WIRED | Local state toggles |
| FH-64–77 | button (×14) | League Leaders accordions | C | WIRED | Local state toggles |
| FH-95–100 | button (×6+) | Beat Reporter filters/articles | C | WIRED | Local state toggles (mock data) |

**Orphaned sub-components (DEAD — defined but never rendered):**

| Sub-component | Lines | Elements | Notes |
|---------------|-------|----------|-------|
| `TradeInterfaceContent` | 2288-2893 (~605 lines) | 20 | Replaced by `<TradeFlow>` component |
| `AwardsContent` | 3481-4203 (~722 lines) | 17 | Awards tab uses inline content + `<AwardsCeremonyFlow>` |

Health: ⚠️ NEEDS WORK — 37 orphaned elements in 2 dead sub-components (~1300 lines of dead code). SIMULATE and SKIP are stubs.

---

### LeagueBuilder Hub (`/league-builder`)

| ID | Type | Label | Tier | Status | Handler → Destination |
|----|------|-------|------|--------|-----------------------|
| LB-01 | button | Back arrow | B | WIRED | `navigate("/")` |
| LB-02 | button | SEED SMB4 DATABASE | **A** | WIRED | `handleSeedDatabase()` → `hook.seedSMB4Data()` → `leagueBuilderStorage.seedFromSMB4Database()` → IndexedDB |
| LB-03–08 | Link (×6) | Nav cards (Leagues/Teams/Players/Rosters/Draft/Rules) | B | WIRED | React Router `<Link to="/league-builder/...">` |
| LB-09 | Link | Quick nav: Leagues (+) | B | WIRED | `navigate("/league-builder/leagues?new=true")` |
| LB-10 | Link | Quick nav: League row | B | WIRED | `navigate("/league-builder/leagues?id=...")` |

Health: ✅ GOOD — Note: LB-09/10 pass query params that target pages don't read

---

### LeagueBuilder Leagues (`/league-builder/leagues`)

| ID | Type | Label | Tier | Status | Handler → Destination |
|----|------|-------|------|--------|-----------------------|
| LL-01 | button | Back arrow | B | WIRED | `navigate("/league-builder")` |
| LL-02 | button | CREATE NEW LEAGUE | B | WIRED | Opens create modal |
| LL-03 | button (×N) | League card click | B | WIRED | Opens edit modal |
| LL-04 | button (×N) | Duplicate league | **A** | WIRED | `hook.duplicateLeague()` → `saveLeagueTemplate()` |
| LL-05 | button (×N) | Edit league | B | WIRED | Opens edit modal |
| LL-06 | button (×N) | Confirm delete | **A** | WIRED | `hook.removeLeague()` → `deleteLeagueTemplate()` |
| LL-07 | button (×N) | Cancel delete | C | WIRED | Clears confirm state |
| LL-08 | button (×N) | Delete league (trash icon) | C | WIRED | Sets confirm state |
| LL-09 | button | Close modal | C | WIRED | Closes modal |
| LL-10–14 | input/select (×5) | Form fields | C | WIRED | Local form state |
| LL-15 | button | Cancel | C | WIRED | Closes modal |
| LL-16 | button | Save/Create | **A** | WIRED | `hook.createLeague()` or `hook.updateLeague()` → `saveLeagueTemplate()` |

Health: ✅ GOOD

---

### LeagueBuilder Teams (`/league-builder/teams`)

All 20 elements WIRED. CRUD via `saveTeam()` / `deleteTeam()`. Health: ✅ GOOD

### LeagueBuilder Players (`/league-builder/players`)

All 29 elements WIRED. CRUD via `savePlayer()` / `deletePlayer()`. Pitcher-specific fields conditionally rendered. Health: ✅ GOOD

### LeagueBuilder Rosters (`/league-builder/rosters`)

All 25 elements WIRED. Two-phase save: local mutations + explicit SAVE → `saveTeamRoster()`. Health: ✅ GOOD

### LeagueBuilder Draft (`/league-builder/draft`)

13 WIRED, 1 FAKE. START DRAFT button shows `alert()` only. Draft settings and generated prospects are NOT persisted. Health: ⚠️ NEEDS WORK

### LeagueBuilder Rules (`/league-builder/rules`)

All 35 elements WIRED. CRUD via `saveRulesPreset()` / `deleteRulesPreset()`. Health: ✅ GOOD

---

### PostGameSummary (`/post-game/:gameId`)

| ID | Type | Label | Tier | Status | Handler → Destination |
|----|------|-------|------|--------|-----------------------|
| PGS-01 | button | BACK TO MENU | B | WIRED | `navigate("/exhibition")` — only in error state |
| PGS-02 | button | BOX SCORE toggle | C | WIRED | Toggles boxScoreExpanded |
| PGS-03 | button | CONTINUE | B | WIRED | Routes to `/exhibition`, `/world-series`, or `/franchise/{id}` based on gameMode |

Health: ✅ GOOD — Read-only page, no data mutations

---

## Tier A Elements Needing Attention

### FAKE Tier A (appears to mutate data but doesn't):

| Element | Page | Issue | Priority |
|---------|------|-------|----------|
| FS-05: START FRANCHISE | FranchiseSetup | Navigates to `/franchise/new` but never persists the 6-step config wizard data to IndexedDB | HIGH |
| FH-36: SIMULATE | FranchiseHome | `console.log("Game simulated")` — no game simulation engine | HIGH |
| FH-37: SKIP | FranchiseHome | `console.log("Game skipped")` — no skip logic | HIGH |
| LD-02: START DRAFT | LB Draft | Shows `alert()` — no draft execution logic | MEDIUM |

### TODO Tier A (partially implemented):

| Element | Page | Issue | Priority |
|---------|------|-------|----------|
| EAM-06: Confirm (ErrorOnAdvance) | GameTracker modal | `handleErrorOnAdvanceConfirm` only does `console.log` — doesn't persist error attributions | MEDIUM |

---

## Orphaned Handlers

### Dead Sub-Components in FranchiseHome (1327 lines)

| Component | Lines | Purpose | Replacement |
|-----------|-------|---------|-------------|
| `TradeInterfaceContent` | 2288-2893 | Trade UI with player selection | `<TradeFlow>` component (active) |
| `AwardsContent` | 3481-4203 | Awards display + trait wheel | Inline content + `<AwardsCeremonyFlow>` |

### Dead Figma Modals (5 modals, ~29 elements)

| Modal | File | Purpose | Notes |
|-------|------|---------|-------|
| DefensiveSubModal | `modals/DefensiveSubModal.tsx` | Defensive substitutions | Barrel export only, not imported by active GT |
| DoubleSwitchModal | `modals/DoubleSwitchModal.tsx` | Double switch | Barrel export only |
| PinchHitterModal | `modals/PinchHitterModal.tsx` | Pinch hitter | Barrel export only |
| PinchRunnerModal | `modals/PinchRunnerModal.tsx` | Pinch runner | Barrel export only |
| PitchingChangeModal | `modals/PitchingChangeModal.tsx` | Pitching change | Barrel export only |
| PositionSwitchModal | `modals/PositionSwitchModal.tsx` | Position swap | Barrel export only |

### Query Param Mismatch

| Source | Target | Param | Issue |
|--------|--------|-------|-------|
| `LeagueBuilder.tsx:197` | `LeagueBuilderLeagues.tsx` | `?id=` | Target page ignores `?id=` — doesn't auto-open league |
| `LeagueBuilder.tsx:204` | `LeagueBuilderLeagues.tsx` | `?new=true` | Target page ignores `?new=true` — doesn't auto-open create modal |

---

## Data Flow Chains (Tier A Destinations)

### Fully Wired (IndexedDB persistence confirmed):

```
League Builder CRUD:
  UI handler → useLeagueBuilderData hook → leagueBuilderStorage.ts → IndexedDB
  Functions: saveLeagueTemplate, deleteLeagueTemplate, saveTeam, deleteTeam,
             savePlayer, deletePlayer, saveRulesPreset, deleteRulesPreset,
             saveTeamRoster, getTeamRoster, seedFromSMB4Database

Franchise Home Schedule:
  handleAddGame/handleAddSeries → useScheduleData().addGame/addSeries() → IndexedDB

Franchise Home Playoffs:
  playoffData.createNewPlayoff/startPlayoffs → usePlayoffData() → IndexedDB

Exhibition Game:
  loadTeamLineup() → lineupLoader.ts → getRoster() → IndexedDB (READ only)
  handleStartGame → navigate with state (no write — GT does the write)

Post-Game Summary:
  getCompletedGameById() → gameStorage.ts → IndexedDB (READ only)
```

### Partially Wired (local state only, no persistence):

```
FranchiseSetup: All config → local useState → LOST on navigate
Draft settings: draftRounds/pickTimer/draftOrder → local useState → LOST on navigate
Draft prospects: generateProspects() → local useState → LOST on navigate/refresh
WorldSeries: All settings → local useState → all mock data
```

---

## Recommendations

### Priority 1: Critical (data-mutating buttons that should work but don't)

1. **FranchiseSetup.START FRANCHISE** — Must persist config to IndexedDB before navigating
2. **FranchiseHome.SIMULATE** — Needs game simulation engine or at minimum score entry
3. **FranchiseHome.SKIP** — Needs game skip logic (advance schedule, record 0-0 or forfeit)

### Priority 2: Dead Code Removal (~1600 lines)

1. **Remove `TradeInterfaceContent`** from FranchiseHome.tsx (~605 lines dead code)
2. **Remove `AwardsContent`** from FranchiseHome.tsx (~722 lines dead code)
3. **Consider removing 5 dead figma modals** or wiring them into active GameTracker

### Priority 3: Wiring Gaps

1. **LeagueBuilder query params** — `?id=` and `?new=true` are sent but never read
2. **ErrorOnAdvanceModal.Confirm** — Wire to actual game state, not just console.log
3. **Draft START DRAFT button** — Wire to draft execution logic
4. **WorldSeries** — Entire page needs real data integration (or remove/hide until ready)

### Priority 4: Hardcoded Values

1. `ExhibitionGame.tsx:112` — `leagueId: 'sml'` hardcoded
2. `ExhibitionGame.tsx:113` — `userTeamSide: 'home'` hardcoded
3. `AppHome.tsx:26` — `<Link to="/franchise/tigers">` hardcoded franchise ID
4. All WorldSeries mock data arrays (mockLeagues, mockTeams, battingLeadersData, etc.)
5. All BeatReporterNews articles in FranchiseHome (~300 lines of mock news)
