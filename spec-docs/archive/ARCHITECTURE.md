# KBL Tracker Architecture
Generated: February 8, 2026 by codebase-reverse-engineer (Mode A)
Status: UNREVIEWED — Confirm feature boundaries before running Mode B

## Project Overview

KBL Tracker is a comprehensive stat-tracking and franchise management application for **Super Mega Baseball 4** (SMB4). It runs as a client-side React SPA with IndexedDB persistence — no backend server.

## Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.0 | UI framework |
| TypeScript | 5.9.3 | Language |
| Vite | 7.2.4 | Build tool |
| Vitest | 4.0.18 | Testing |
| React Router | 7.13.0 (react-router-dom) | Routing |
| Tailwind CSS | 3.4.19 | Styling |
| Lucide React | 0.487.0 | Icons |
| React DnD | 16.0.1 | Drag & drop (field zones, lineups) |
| IndexedDB (native) | — | Persistent storage (no wrapper lib) |
| State management | React hooks + Context | No Redux/Zustand |

## Code Statistics

| Metric | Count |
|--------|-------|
| TypeScript (.ts) source files | 139 |
| React (.tsx) source files | 205 |
| Test files | 106 |
| Total source lines of code | ~167,000 |
| Total exported types/interfaces/enums | 794 |
| Passing tests | 5,094 |
| Build output size | 1,665 KB (374 KB gzipped) |

## Project Structure

```
kbl-tracker/
├── src/
│   ├── App.tsx                     — Root app component
│   ├── main.tsx                    — Entry point
│   │
│   ├── engines/                    — CORE: Calculation engines (18 files, ~13,500 LOC)
│   │   ├── bwarCalculator.ts       — Batting WAR (wRAA → bWAR)
│   │   ├── pwarCalculator.ts       — Pitching WAR (FIP-based)
│   │   ├── fwarCalculator.ts       — Fielding WAR (per-play basis)
│   │   ├── rwarCalculator.ts       — Baserunning WAR (SB/CS/advancement)
│   │   ├── mwarCalculator.ts       — Manager WAR (decision outcomes)
│   │   ├── salaryCalculator.ts     — Player salary from ratings (1,286 lines)
│   │   ├── leverageCalculator.ts   — Leverage Index (base-out tables)
│   │   ├── clutchCalculator.ts     — Multi-participant clutch attribution (1,035 lines)
│   │   ├── fameEngine.ts           — Fame calculation (bonus/boner events)
│   │   ├── fanMoraleEngine.ts      — Fan morale 0-99 scale (1,353 lines)
│   │   ├── mojoEngine.ts           — Mojo system (-2 to +2)
│   │   ├── fitnessEngine.ts        — Fitness states & decay
│   │   ├── narrativeEngine.ts      — Beat reporter story generation (1,276 lines)
│   │   ├── detectionFunctions.ts   — Auto-detect special events
│   │   ├── relationshipEngine.ts   — Player relationship management
│   │   ├── adaptiveLearningEngine.ts — Fielding inference improvement
│   │   ├── agingEngine.ts          — Player aging & development
│   │   └── index.ts                — Unified WAR export
│   │
│   ├── types/                      — CORE: Shared type definitions (3 files, ~3,200 LOC)
│   │   ├── game.ts                  — Game state, at-bat, fielding, substitution, fame types (1,560 lines)
│   │   ├── war.ts                   — WAR calculation types, baselines, linear weights
│   │   └── index.ts                 — Core player/team/stats types
│   │
│   ├── utils/                      — CORE: Storage layer (31 files, ~14,000 LOC)
│   │   ├── eventLog.ts              — Bulletproof event logging
│   │   ├── gameStorage.ts           — IndexedDB game state persistence
│   │   ├── seasonStorage.ts         — Season-level stat storage
│   │   ├── seasonAggregator.ts      — Game → season stat aggregation
│   │   ├── careerStorage.ts         — Career stat storage (1,004 lines)
│   │   ├── milestoneDetector.ts     — Milestone threshold detection (1,471 lines)
│   │   ├── milestoneAggregator.ts   — Wires milestones into aggregation
│   │   ├── leagueBuilderStorage.ts  — League/team/player database (IndexedDB)
│   │   ├── managerStorage.ts        — Manager profiles, decisions, season stats
│   │   ├── scheduleStorage.ts       — Scheduled games persistence
│   │   ├── playoffStorage.ts        — Playoff bracket state
│   │   ├── museumStorage.ts         — Championship/records history
│   │   ├── offseasonStorage.ts      — Offseason state machine
│   │   ├── transactionStorage.ts    — Transaction logging
│   │   ├── farmStorage.ts           — Minor league rosters
│   │   ├── relationshipStorage.ts   — Player relationships
│   │   ├── ratingsStorage.ts        — Player ratings (IndexedDB)
│   │   ├── unifiedPlayerStorage.ts  — Unified player storage
│   │   ├── backupRestore.ts         — Export/import all IndexedDB
│   │   ├── franchiseStorage.ts      — Franchise storage (stub)
│   │   ├── seasonEndProcessor.ts    — End-of-season processing
│   │   ├── teamMVP.ts               — Team MVP & cornerstone detection
│   │   ├── walkoffDetector.ts       — Walkoff win detection
│   │   ├── headlineGenerator.ts     — Post-game headline generation
│   │   ├── liveStatsCalculator.ts   — In-memory live stat merging
│   │   ├── playerMorale.ts          — Morale display utilities
│   │   ├── leagueConfig.ts          — League/DH rules configuration
│   │   ├── leagueStorage.ts         — League config localStorage
│   │   ├── customPlayerStorage.ts   — Custom player localStorage
│   │   ├── playerRatingsStorage.ts  — Rating override localStorage
│   │   └── mojoSystem.ts            — Legacy mojo/fitness system
│   │
│   ├── data/                       — Static data (4 files)
│   │   ├── playerDatabase.ts        — Full SMB4 player database (9,914 lines!)
│   │   ├── leagueStructure.ts       — League divisions, rival detection
│   │   ├── fieldZones.ts            — Field zone coordinate data
│   │   └── traitPools.ts            — Trait lottery pools
│   │
│   ├── hooks/                      — LEGACY: Base React hooks (18 files)
│   │   ├── useFameDetection.ts      — Fame event detection (1,628 lines)
│   │   ├── useSeasonStats.ts        — Season stat aggregation
│   │   ├── useCareerStats.ts        — Career stat queries
│   │   ├── useGamePersistence.ts    — Game save/restore
│   │   ├── useLiveStats.ts          — Live stat display
│   │   ├── useMojoState.ts          — Mojo state management
│   │   ├── useFitnessState.ts       — Fitness state management
│   │   ├── useFanMorale.ts          — Fan morale hooks
│   │   ├── useNarrativeMorale.ts    — Narrative + morale combined
│   │   ├── useWARCalculations.ts    — WAR calculation hooks
│   │   ├── useMWARCalculations.ts   — Manager WAR hooks
│   │   ├── useClutchCalculations.ts — Clutch attribution hooks
│   │   ├── useRelationshipData.ts   — Relationship data hooks
│   │   ├── useAgingData.ts          — Aging data hooks
│   │   ├── useRosterData.ts         — Roster query hooks
│   │   ├── useSeasonData.ts         — Season data hooks
│   │   ├── useDataIntegrity.ts      — Data integrity verification
│   │   └── useOffseasonPhase.ts     — Offseason state hook
│   │
│   ├── context/                    — React context (2 files)
│   │   ├── AppContext.tsx            — Global app context provider
│   │   └── appStateStorage.ts       — App state localStorage
│   │
│   ├── services/                   — Service layer (2 files)
│   │   ├── dataExportService.ts     — Data export functionality
│   │   └── fieldingStatsAggregator.ts — Fielding stat rollup
│   │
│   ├── components/                 — LEGACY: Original UI components
│   │   ├── GameTracker/             — 31 components (game-time UI)
│   │   │   ├── index.tsx             — Main GameTracker (3,619 lines)
│   │   │   ├── AtBatFlow.tsx         — At-bat flow modal (1,480 lines)
│   │   │   ├── FieldingModal.tsx     — Fielding credit modal (1,043 lines)
│   │   │   ├── PlayerCard.tsx        — Player stat card
│   │   │   ├── Scoreboard.tsx        — Live scoreboard
│   │   │   ├── LineupPanel.tsx       — Lineup display
│   │   │   ├── Diamond.tsx           — Base diamond visualization
│   │   │   ├── WARDisplay.tsx        — WAR stat display
│   │   │   ├── FameDisplay.tsx       — Fame events display
│   │   │   ├── FameEventModal/Toast  — Fame event notifications
│   │   │   ├── SalaryDisplay.tsx     — Salary information
│   │   │   ├── NarrativeDisplay.tsx  — Beat reporter narratives
│   │   │   ├── FanMoraleDisplay.tsx  — Fan morale meter
│   │   │   ├── SeasonLeaderboards.tsx — Season stat leaders
│   │   │   ├── SeasonSummary.tsx     — Season overview
│   │   │   ├── CareerDisplay.tsx     — Career stat display
│   │   │   ├── WalkoffCelebration.tsx — Walkoff celebration
│   │   │   ├── InningEndSummary.tsx  — Inning summary
│   │   │   ├── PitchingChangeModal  — Pitching change UI
│   │   │   ├── PinchHitter/Runner   — Substitution modals
│   │   │   ├── DefensiveSubModal    — Defensive substitution
│   │   │   ├── DoubleSwitchModal    — Double switch
│   │   │   ├── PositionSwitchModal  — Position switch
│   │   │   ├── FieldZoneInput.tsx   — Field zone click input
│   │   │   ├── OffseasonFlow.tsx    — Offseason progression
│   │   │   ├── PitcherExitPrompt    — Pitcher exit prompt
│   │   │   └── PlayerNameWithMorale — Player name + morale badge
│   │   ├── awards/                  — 9 award ceremony components
│   │   ├── museum/                  — 4 museum/history components
│   │   ├── offseason/               — 6 offseason components
│   │   └── [23 standalone components] — Various UI panels
│   │
│   ├── pages/                      — LEGACY: Original page components (21 files)
│   │   ├── MainMenu.tsx, GamePage.tsx, PostGameScreen.tsx
│   │   ├── SeasonDashboard.tsx, ScheduleView.tsx, RosterView.tsx
│   │   ├── LeagueLeadersView.tsx, StandingsView.tsx
│   │   ├── AwardsCeremonyHub.tsx, OffseasonHub.tsx
│   │   ├── DraftHub.tsx, FreeAgencyHub.tsx, TradeHub.tsx
│   │   └── [8 more page components]
│   │
│   ├── styles/                     — CSS files
│   │
│   └── src_figma/                  — ACTIVE UI LAYER (Figma-based redesign)
│       ├── app/
│       │   ├── routes.tsx            — React Router configuration (14 routes)
│       │   ├── pages/               — 14 page components
│       │   │   ├── GameTracker.tsx    — Main game tracker (3,797 lines)
│       │   │   ├── FranchiseHome.tsx  — Franchise hub (4,503 lines)
│       │   │   ├── FranchiseSetup.tsx — New franchise setup (1,442 lines)
│       │   │   ├── ExhibitionGame.tsx — Exhibition mode
│       │   │   ├── PostGameSummary.tsx — Post-game stats/recap
│       │   │   ├── AppHome.tsx        — Landing page
│       │   │   ├── LeagueBuilder.tsx  — League builder hub
│       │   │   ├── LeagueBuilderLeagues.tsx — League management
│       │   │   ├── LeagueBuilderTeams.tsx — Team management
│       │   │   ├── LeagueBuilderPlayers.tsx — Player management
│       │   │   ├── LeagueBuilderRosters.tsx — Roster management
│       │   │   ├── LeagueBuilderDraft.tsx — Draft setup
│       │   │   ├── LeagueBuilderRules.tsx — Rule configuration
│       │   │   └── WorldSeries.tsx    — Playoff bracket (966 lines)
│       │   ├── components/          — 36 components + modals
│       │   │   ├── EnhancedInteractiveField.tsx — Interactive field (4,292 lines)
│       │   │   ├── AwardsCeremonyFlow.tsx — Awards ceremony (2,147 lines)
│       │   │   ├── DraftFlow.tsx      — Draft flow (1,713 lines)
│       │   │   ├── RatingsAdjustmentFlow.tsx — EOS ratings (1,546 lines)
│       │   │   ├── FinalizeAdvanceFlow.tsx — Advance flow (1,487 lines)
│       │   │   ├── FreeAgencyFlow.tsx — Free agency (1,439 lines)
│       │   │   ├── ContractionExpansionFlow.tsx — Contract/expand (1,356 lines)
│       │   │   ├── TradeFlow.tsx      — Trade system (1,344 lines)
│       │   │   ├── RetirementFlow.tsx — Retirement flow (1,030 lines)
│       │   │   ├── SpringTrainingFlow.tsx — Spring training
│       │   │   ├── LineupCard.tsx     — Lineup card
│       │   │   ├── LineupPreview.tsx  — Lineup preview
│       │   │   ├── OutcomeButtons.tsx — At-bat outcome buttons
│       │   │   ├── ActionSelector.tsx — Action selection
│       │   │   ├── SidePanel.tsx      — Side panel
│       │   │   ├── MiniScoreboard.tsx — Mini scoreboard
│       │   │   ├── TeamHubContent.tsx — Team hub content
│       │   │   ├── TeamRoster.tsx     — Team roster display
│       │   │   ├── ScheduleContent.tsx — Schedule display
│       │   │   ├── MuseumContent.tsx  — Museum display
│       │   │   ├── UndoSystem.tsx     — Undo/redo system
│       │   │   ├── ModifierButtonBar — Modifier buttons
│       │   │   └── [14 more components — popups, prompts, overlays]
│       │   ├── engines/             — UI integration wrappers (13 files)
│       │   │   ├── inheritedRunnerTracker.ts — ER/UER attribution
│       │   │   ├── d3kTracker.ts      — Dropped 3rd strike
│       │   │   ├── saveDetector.ts    — Save/hold detection
│       │   │   ├── fameIntegration.ts — Fame system bridge
│       │   │   ├── fanMoraleIntegration.ts — Fan morale bridge
│       │   │   ├── mwarIntegration.ts — Manager WAR bridge
│       │   │   ├── narrativeIntegration.ts — Narrative bridge
│       │   │   ├── detectionIntegration.ts — Detection bridge
│       │   │   ├── playerStateIntegration.ts — Player state bridge
│       │   │   ├── adaptiveLearningEngine.ts — Fielding inference
│       │   │   ├── agingIntegration.ts — Aging bridge
│       │   │   ├── relationshipIntegration.ts — Relationship bridge
│       │   │   └── index.ts           — Aggregated exports
│       │   ├── hooks/               — App-level hooks (7 files)
│       │   │   ├── useWARCalculations.ts — WAR for UI surfaces
│       │   │   ├── useFameTracking.ts — Fame tracking hook
│       │   │   ├── useFanMorale.ts   — Fan morale hook
│       │   │   ├── useMWARCalculations.ts — mWAR hook
│       │   │   ├── usePlayerState.ts — Mojo/fitness state
│       │   │   ├── useRelationshipData.ts — Relationship data
│       │   │   └── useAgingData.ts   — Aging data
│       │   ├── types/               — App-level types (4 files)
│       │   │   ├── game.ts           — Mirror of src/types/game.ts (1,560 lines)
│       │   │   ├── war.ts            — Mirror of src/types/war.ts
│       │   │   ├── substitution.ts   — Substitution types
│       │   │   └── index.ts          — App data types
│       │   └── data/
│       │       └── mockData.ts       — Mock/placeholder data
│       ├── hooks/                   — Core UI hooks (8 files)
│       │   ├── useGameState.ts       — THE game state hook (3,089 lines — heart of GameTracker)
│       │   ├── useFranchiseData.ts   — Franchise data context
│       │   ├── useLeagueBuilderData.ts — League builder data
│       │   ├── useMuseumData.ts      — Museum data
│       │   ├── useOffseasonData.ts   — Offseason data
│       │   ├── useOffseasonState.ts  — Offseason state machine
│       │   ├── usePlayoffData.ts     — Playoff data
│       │   └── useScheduleData.ts    — Schedule data
│       ├── utils/                   — Figma-specific storage (6 files)
│       │   ├── gameStorage.ts        — Game persistence (separate from src/utils)
│       │   ├── seasonStorage.ts      — Season storage
│       │   ├── seasonAggregator.ts   — Season aggregation
│       │   ├── careerStorage.ts      — Career storage
│       │   ├── milestoneDetector.ts  — Milestone detection
│       │   ├── milestoneAggregator.ts — Milestone aggregation
│       │   ├── eventLog.ts           — Event logging
│       │   ├── lineupLoader.ts       — Lineup loading
│       │   └── franchiseStorage.ts   — Franchise storage
│       ├── config/                  — Configuration data
│       │   ├── teamColors.ts         — Team color definitions
│       │   └── stadiumData.ts        — Stadium data
│       ├── data/
│       │   └── defaultRosters.ts     — Default roster data
│       ├── styles/                  — CSS styles
│       └── imports/                 — Import management
│
├── spec-docs/                      — Living documentation (127 files)
├── .claude/                        — Claude Code configuration
│   ├── rules/                      — Auto-loaded operating principles
│   ├── skills/                     — 19 skills (audit, test, build pipelines)
│   └── commands/                   — Slash commands
└── tests/                          — Additional test files
```

## Architecture Pattern: Shared-Source with Figma UI Layer

The codebase uses a **dual-layer architecture**:

1. **Core Logic Layer** (`src/engines/`, `src/utils/`, `src/types/`): Pure TypeScript calculation engines and storage. No React dependency.

2. **UI Layer** (`src/src_figma/`): React components, hooks, and pages. This is the active, Figma-based UI redesign.

3. **Legacy Layer** (`src/components/`, `src/pages/`, `src/hooks/`): Original UI implementation. Still compiled and some parts still imported, but being superseded by src_figma.

**Import Chain:**
```
UI Component (src_figma/app/pages/)
  → Figma Hook (src_figma/hooks/)
    → Base Engine (src/engines/)
    → Base Storage (src/utils/)
    → Base Types (src/types/)
  → Integration Wrapper (src_figma/app/engines/)
    → Base Engine (src/engines/)
```

**Key Alias:** `@` resolves to `src/src_figma/` (configured in vite.config.ts + tsconfig.app.json)

## Import Graph Summary

### Hub Files (most imports from other source files)
| File | Internal Imports | Role |
|------|-----------------|------|
| src/components/GameTracker/index.tsx | 16 | Legacy game tracker aggregation |
| src/src_figma/app/pages/GameTracker.tsx | 15 | Active game tracker page |
| src/components/GameTracker/PlayerCard.tsx | 12 | Player card display |
| src/pages/SeasonDashboard.tsx | 8 | Legacy season dashboard |

### Most-Imported Modules (depended on by many files)
| Module | Import Count | Role |
|--------|-------------|------|
| src/types/game.ts | 36+ | Core game types — THE most critical file |
| src/data/playerDatabase.ts | 11 | Player data for all team operations |
| src/engines/mojoEngine.ts | 16 | Mojo effects used across many systems |
| src/engines/fitnessEngine.ts | 14 | Fitness effects used across many systems |
| src/hooks/useOffseasonState.ts | 6 | Offseason state (imported via @/) |
| src/hooks/useLeagueBuilderData.ts | 5 | League builder data |

### Shared Infrastructure (imported by 3+ feature clusters)
- `src/types/game.ts` — Game state types (used everywhere)
- `src/types/war.ts` — WAR types and baselines
- `src/types/index.ts` — Core player/team types
- `src/engines/mojoEngine.ts` — Mojo system
- `src/engines/fitnessEngine.ts` — Fitness system
- `src/engines/leverageCalculator.ts` — Leverage index
- `src/data/playerDatabase.ts` — Player database
- `src/data/leagueStructure.ts` — League/division structure

### Duplicate/Mirror Files (src/ and src_figma/ have copies)
| Core File | Figma Mirror | Status |
|-----------|-------------|--------|
| src/types/game.ts (1,560 lines) | src/src_figma/app/types/game.ts (1,560 lines) | Identical mirrors |
| src/types/war.ts | src/src_figma/app/types/war.ts | Identical mirrors |
| src/utils/careerStorage.ts | src/src_figma/utils/careerStorage.ts | Mirrors |
| src/utils/milestoneDetector.ts | src/src_figma/utils/milestoneDetector.ts | Mirrors |

## Routing (14 routes)

| Path | Component | Feature |
|------|-----------|---------|
| `/` | AppHome | Landing page |
| `/league-builder` | LeagueBuilder | League builder hub |
| `/league-builder/leagues` | LeagueBuilderLeagues | League management |
| `/league-builder/teams` | LeagueBuilderTeams | Team management |
| `/league-builder/players` | LeagueBuilderPlayers | Player management |
| `/league-builder/rosters` | LeagueBuilderRosters | Roster management |
| `/league-builder/draft` | LeagueBuilderDraft | Draft setup |
| `/league-builder/rules` | LeagueBuilderRules | Rule configuration |
| `/franchise/setup` | FranchiseSetup | New franchise setup |
| `/franchise/:franchiseId` | FranchiseHome | Franchise hub (mega page) |
| `/game-tracker/:gameId` | GameTracker | Live game tracking |
| `/post-game/:gameId` | PostGameSummary | Post-game stats/recap |
| `/exhibition` | ExhibitionGame | Exhibition game setup |
| `/world-series` | WorldSeries | Playoff bracket |

## Feature Boundaries

See `FEATURE_INVENTORY.md` for the complete feature inventory with file boundaries, dependencies, and complexity ratings.

## Data Persistence Architecture

All persistence is client-side using **IndexedDB** (multiple databases):

| Database | Stores | Purpose |
|----------|--------|---------|
| kbl-games | games, events | Game state & event log |
| kbl-seasons | seasons, playerSeasons | Season stats |
| kbl-careers | careerStats, milestones | Career stats & milestones |
| kbl-leagues | leagues, teams, players | League/team/player config |
| kbl-manager | profiles, decisions, seasonStats | Manager profiles & mWAR |
| kbl-schedule | scheduledGames | Season schedule |
| kbl-playoffs | brackets, series | Playoff state |
| kbl-museum | championships, records | Historical data |
| kbl-offseason | offseasonState, phases | Offseason progression |
| kbl-transactions | transactions | Transaction log |
| kbl-farm | farmRosters | Minor league rosters |
| kbl-relationships | relationships | Player relationships |
| kbl-ratings | playerRatings | Rating overrides |
| kbl-unified-players | players | Unified player data |

Additional **localStorage** keys for lightweight config:
- `kbl-player-ratings` — Rating overrides
- `kbl-custom-players` — User-created players
- `kbl-league-config` — League configurations
- `kbl-app-state` — App state

## Build Configuration

- **Build:** `tsc -b && vite build`
- **Dev:** `vite` (dev server at localhost:5173)
- **Test:** `vitest run` (5,094 tests)
- **Vite chunk warning:** Single 1.6MB chunk (no code splitting yet)
