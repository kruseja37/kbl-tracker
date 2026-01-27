# KBL Tracker - Current State

> **Purpose**: Single source of truth for what's implemented, what's not, and known issues
> **Last Updated**: January 26, 2026 (SML Player Database Complete)

---

## Ralph Framework Implementation - PHASES A-G COMPLETE ✅

All 78 user stories from Phases B-G implemented and committed. Components are wired to navigation.

### Implementation Summary

| Phase | Stories | Status | Commit |
|-------|---------|--------|--------|
| Phase A | A001-A022 | ✅ Complete | Various (Jan 25-26) |
| Phase B | B001-B018 | ✅ Complete | `a264b3b` |
| Phase C | C001-C012 | ✅ Complete | `a264b3b` |
| Phase D | D001-D010 | ✅ Complete | `a264b3b` |
| Phase E | E001-E008 | ✅ Complete | `a264b3b` |
| Phase F | F001-F012 | ✅ Complete | `a264b3b` |
| Phase G | G001-G008 | ✅ Complete | `a264b3b` |
| Navigation Wiring | - | ✅ Complete | `5695fdb` |

### Current Limitation

**Components render with EMPTY DATA**. The Ralph Framework stories created UI components with correct props interfaces, but they are not yet connected to real IndexedDB data. Wrapper components in `App.tsx` pass placeholder/empty data.

**To complete the integration:**
1. Wire actual data from IndexedDB stores to wrapper components
2. Connect state management (context or stores) across components
3. Add data loading hooks to each route wrapper

### Routes Now Configured

| Path | Component | Description |
|------|-----------|-------------|
| `/` | MainMenu | Home screen with full navigation |
| `/pregame` | PreGameWrapper | Pre-game screen with team/pitcher selection |
| `/game` | GamePage | Game tracker |
| `/postgame` | PostGameScreen | Post-game summary with headlines |
| `/season` | SeasonDashboard | Season progress and stats |
| `/schedule` | ScheduleWrapper | Season schedule view |
| `/roster` | RosterWrapper | Team roster management |
| `/leaders` | LeadersWrapper | League stat leaders |
| `/stats-by-park` | StatsByParkWrapper | Player stats by stadium |
| `/awards` | AwardsWrapper | Awards ceremony hub |
| `/offseason` | OffseasonWrapper | Offseason hub navigation |
| `/offseason/ratings` | EOSRatingsWrapper | End-of-season ratings changes |
| `/offseason/retirements` | RetirementsWrapper | Player retirements |
| `/offseason/free-agency` | FreeAgencyWrapper | Free agent signing |
| `/offseason/draft` | DraftWrapper | Draft hub |
| `/offseason/trades` | TradeWrapper | Trade hub |
| `/museum` | MuseumWrapper | Franchise museum hub |
| `/team/:id` | TeamPage | Team details |
| `*` | NotFound | 404 handler |

### New Components Created (Phases B-G)

**Phase B - Game Flow:**
- `PreGameScreen.tsx` - Starting pitcher selection and matchup display
- `GameSetupModal.tsx` - Team and pitcher selection modal
- `LineupPanel.tsx` - Enhanced lineup display with substitutions
- `PlayerCard.tsx` - Detailed player stats modal
- `InningEndSummary.tsx` - Inning transition summary
- `PitcherExitPrompt.tsx` - Pitcher removal confirmation
- `DoubleSwitchModal.tsx` - Double switch implementation
- `WalkoffCelebration.tsx` - Walk-off win celebration
- `FameEventToast.tsx` - Fame event notifications
- `PostGameScreen.tsx` - Comprehensive post-game summary

**Phase C - Season Management:**
- `ScheduleView.tsx` - Season schedule with filters
- `RosterView.tsx` - Roster management
- `LeagueLeadersView.tsx` - Statistical leaderboards
- `StandingsView.tsx` - League standings
- `TeamStatsView.tsx` - Team statistics
- `TeamFinancialsView.tsx` - Team financial overview
- `BoxScoreView.tsx` - Detailed box score
- `SeasonProgressTracker.tsx` - Season milestone tracking
- `PlayoffBracket.tsx` - Playoff visualization

**Phase D - Offseason:**
- `OffseasonHub.tsx` - Offseason navigation
- `EOSRatingsView.tsx` - End-of-season rating changes
- `RetirementsScreen.tsx` - Player retirement ceremony
- `FreeAgencyHub.tsx` - Free agent signing interface
- `DraftHub.tsx` - Draft interface with prospect cards
- `TradeHub.tsx` - Trade negotiation interface
- `AgingDisplay.tsx` - Player aging visualization

**Phase E - Awards:**
- `AwardsCeremonyHub.tsx` - Awards ceremony navigation
- `awards/MVPCeremony.tsx` - MVP presentation
- `awards/CyYoungCeremony.tsx` - Cy Young presentation
- `awards/RookieOfYearCeremony.tsx` - ROY presentation
- `awards/GoldGloveCeremony.tsx` - Gold Glove presentation
- `awards/AllStarReveal.tsx` - All-Star team reveal
- `awards/BattingTitleCeremony.tsx` - Batting champion presentation
- `awards/PitchingAwardsCeremony.tsx` - Pitching awards (ERA, Wins)

**Phase F - Advanced Features:**
- `FanMoralePanel.tsx` - Fan mood visualization
- `RelationshipPanel.tsx` - Player relationships display
- `ChampionshipCelebration.tsx` - Championship celebration
- `StatsByParkView.tsx` - Player stats by stadium
- `adaptiveLearningEngine.ts` - Fielding inference improvement
- `fieldingStatsAggregator.ts` - Position-based fielding aggregation
- `LeagueNewsFeed.tsx` - News feed with story types

**Phase G - Museum & Extras:**
- `MuseumHub.tsx` - Franchise history museum
- `museum/HallOfFameGallery.tsx` - HOF member display
- `museum/RetiredNumbersWall.tsx` - Retired jersey numbers
- `museum/FranchiseRecords.tsx` - Franchise record holders
- `museum/ChampionshipBanners.tsx` - Championship banners
- `dataExportService.ts` - CSV/JSON export service
- `ContractionWarning.tsx` - Team contraction risk alert
- `ChemistryDisplay.tsx` - Team chemistry visualization

### Engines Created (Phases B-G)

| Engine | File | Purpose |
|--------|------|---------|
| Relationship Engine | `relationshipEngine.ts` | Player relationship tracking and morale effects |
| Aging Engine | `agingEngine.ts` | Player aging and decline curves |
| Adaptive Learning | `adaptiveLearningEngine.ts` | Fielding inference improvement from corrections |
| Headline Generator | `headlineGenerator.ts` | Dynamic post-game headlines |
| Walkoff Detector | `walkoffDetector.ts` | Walk-off game detection |

### Services Created (Phases B-G)

| Service | File | Purpose |
|---------|------|---------|
| Fielding Stats Aggregator | `fieldingStatsAggregator.ts` | Per-position fielding stats for awards |
| Data Export Service | `dataExportService.ts` | Export box scores and stats to CSV/JSON |

---

> ✅ **BUILD STATUS: PASSING**
>
> `npm run build` → Exit 0 (as of January 27, 2026)
>
> **IMPLEMENTATION PLAN v5** is now active.
> - Phase 1 Day 1: Wire fWAR + rWAR to useWARCalculations ✅
> - Phase 1 Day 2: Wire mWAR + Clutch Calculator ✅
> - Phase 1 Day 3: Wire Mojo + Fitness Engines ✅
> - Phase 1 Day 4: Integration Testing (pending)
>
> **Mojo/Fitness Wiring Session (January 27, 2026):**
> - useMojoState hook created - manages per-player mojo during gameplay ✅
> - useFitnessState hook created - manages per-player fitness state ✅
> - Mojo triggers fire after each at-bat (batter, pitcher, fielder) ✅
> - Scoreboard displays batter + pitcher mojo badges ✅
> - Pitcher info bar shows mojo badge when non-Normal ✅
> - Pitcher info bar fitness badge wired to hook (was hardcoded to FIT) ✅
> - PlayerCard/PlayerCardModal show mojo + fitness with multipliers ✅
> - BUG-006 (No Mojo/Fitness in scoreboard) FIXED ✅
>
> **Component Wiring Session (January 26, 2026):**
> - BoxScoreView → PostGameScreen ✅
> - InningEndSummary → GameTracker inning flip ✅
> - PitcherExitPrompt → Pitch count threshold (≥85) ✅
> - WalkoffCelebration → Walkoff detection in handleAtBatFlowComplete ✅
> - FreeAgencyHub → Sign Player action with sample data ✅
> - FameEventToast → Already wired via FameToastContainer ✅
> - headlineGenerator → Already wired in PostGameScreen ✅
>
> **Position Switch Bugs Fixed (Jan 26, 2026):**
> - Bug 1: Catcher now appears in Position Switch modal (fixed lineup generation)
> - Bug 2: Auto-swap feature - system auto-adds reverse swap when moving to occupied position
>
> **Roster Management Session (January 26, 2026):**
> - ManualPlayerInput wired to route `/add-player` ✅
> - All player fields added: gender, overall, secondary position, chemistry, traits, arsenal ✅
> - RosterView delete functionality added ✅
> - Roster grouped by Position Players/Pitchers, sorted by salary descending ✅
> - Removed Team Role (Starter/Bench) designation from form ✅
> - Added location.key dependency for roster reload on navigation ✅
> - Salary calculation wired to form (auto-calculates from ratings) ✅
>
> **Previous Plan v3 completed** (Days 1-11):
> - Day 1: Fixed 42 TypeScript build errors
> - Day 2: Wired WARDisplay to UI
> - Day 3: Resolved 5 spec contradictions
> - Day 4: Added fWAR-relevant fields to FieldingModal
> - Day 5: Verified Career Aggregation Pipeline, created CareerDisplay component
> - Day 6: Created PlayerCard component with full stats, wired to UI
> - Day 7: Created SeasonLeaderboards with player click to open PlayerCard
> - Day 8: Created SeasonSummary modal with all leaderboard categories
> - Day 9: Fixed remaining spec issues (LEVERAGE, PWAR, BWAR docs)
> - Day 10: Integration testing - all 267+ tests pass
> - Day 11: Salary display BLOCKED - data model lacks player ratings
>
> See SESSION_LOG.md for detailed work log.

---

> ⚠️ **AI SESSION START PROTOCOL**
>
> **BEFORE doing any work**, also read:
> - `AI_OPERATING_PREFERENCES.md` - Core operating principles (NFL with 3 tiers, scope discipline, etc.)
> - `SESSION_LOG.md` - What happened in previous sessions
> - `IMPLEMENTATION_PLAN_v2.md` - The active implementation plan
> - `FEATURE_WISHLIST.md` - Known gaps to address
>
> These files contain critical context for how to work on this project.

---

## SML Player Database - COMPLETE ✅

All 20 Super Mega League teams fully populated with rosters.

### Database Summary

| Category | Count | Status |
|----------|-------|--------|
| SML Teams | 20 | ✅ Complete |
| Players per team | 22 | 9 starters, 4 bench, 4 rotation, 5 bullpen |
| Free Agents | 66 | ✅ Complete |
| **Total Players** | ~506 | ✅ All in `playerDatabase.ts` |

### Team Prefixes

| Prefix | Team | Prefix | Team |
|--------|------|--------|------|
| sir | Sirloins | htc | Hot Corners |
| bee | Beewolves | mns | Moonstars |
| frb | Freebooters | blf | Blowfish |
| hrb | Herbisaurs | swt | Sawteeth |
| moo | Moose | sct | Sand Cats |
| wpg | Wild Pigs | wdl | Wideloads |
| jck | Jacks | ply | Platypi |
| nem | Nemesis | grp | Grapplers |
| buz | Buzzards | htr | Heaters |
| cro | Crocodons | ovd | Overdogs |

### Player Data Includes
- Demographics: age, gender, bats, throws
- Positions: primary and secondary
- Ratings: batting (POW/CON/SPD/FLD/ARM) or pitching (VEL/JNK/ACC)
- Chemistry type
- Traits (1-2 per player)
- Arsenal (pitchers only)
- Overall grade (S, A+, A, A-, B+, B, B-, C+, C, C-, D+, D)

---

## Gap Closure Session (January 26, 2026) - COMPLETE ✅

All 18 gap closure stories from `STORIES_GAP_CLOSERS.md` implemented and committed.

### Stories Completed

| Story | Gap | Title | Commit |
|-------|-----|-------|--------|
| NEW-001 | GAP-002 | Sign Free Agent Action | P0 |
| NEW-002 | GAP-038 | Spring Training Phase | P0 |
| NEW-003 | GAP-039 | Schedule Generation Phase | P0 |
| NEW-006 | GAP-001 | Player Ratings Storage | P0 |
| NEW-007 | GAP-003 | Unified Player Database | P0 |
| NEW-008 | GAP-004 | Data Integration Layer | P0 |
| NEW-009 | GAP-031 | Fix Exit Type Double Entry | P1 |
| NEW-010 | GAP-032 | Make Player Names Clickable | P1 |
| NEW-011 | GAP-033 | Display Team Names in Scoreboard | P1 |
| NEW-012 | GAP-034 | Add Lineup Access Panel | P1 (already implemented) |
| NEW-013 | GAP-041 | Wire Relationship Engine | P1 |
| NEW-014 | GAP-042 | Wire Aging Engine | P1 |
| NEW-015 | GAP-046 | Wire Beat Reporter to Fan Morale | P1 |
| NEW-016 | GAP-050 | Enforce Offseason Phase Order | P1 |
| NEW-017 | GAP-051 | Create Farm System State | P1 |
| NEW-018 | GAP-065 | Add IndexedDB Backup/Restore | P2 |

### New Files Created

**Storage Layer:**
- `src/utils/relationshipStorage.ts` - IndexedDB for player relationships
- `src/utils/farmStorage.ts` - IndexedDB for farm system rosters
- `src/utils/backupRestore.ts` - Full IndexedDB backup/restore utility

**React Hooks:**
- `src/hooks/useRelationshipData.ts` - Relationship queries and trade warnings
- `src/hooks/useAgingData.ts` - Player aging calculations
- `src/hooks/useNarrativeMorale.ts` - Wire narrative engine to fan morale
- `src/hooks/useOffseasonPhase.ts` - Offseason phase progression state

**Components:**
- `src/components/AgingBadge.tsx` - Career phase and retirement probability display

### Key Integrations

- **Relationship → Trade**: Trade warnings show in TradeProposalBuilder when trading players with relationships
- **Narrative → Morale**: Beat reporter stories now affect fan morale via `publishStory()`
- **Aging → Retirement**: Career phase badges and retirement probability on player cards
- **Offseason → Phases**: Sequential phase completion enforced via hook
- **Farm → Roster**: Separate farm roster tracking (AAA/AA/A levels)
- **Backup → All DBs**: Export/import all 7 KBL databases to JSON

---

## Wiring Stories Session (January 26, 2026) - COMPLETE ✅

Implemented stories from `STORIES_WIRING.md` to connect orphaned components.

### Stories Completed (23 of 23) ✅

| Story | Gap | Title | Status |
|-------|-----|-------|--------|
| WIRE-001 | GAP-005 | BoxScoreView → PostGameScreen | ✅ Done |
| WIRE-002 | GAP-006 | StandingsView → SeasonDashboard | ✅ Done |
| WIRE-003 | GAP-007 | TeamStatsView → TeamPage | ✅ Done |
| WIRE-004 | GAP-009 | FanMoralePanel → GameTracker | ✅ Done |
| WIRE-005 | GAP-010 | PlayoffBracket → SeasonDashboard | ✅ Done |
| WIRE-006 | GAP-011 | ChampionshipCelebration → PostGameScreen | ✅ Done |
| WIRE-007 | GAP-012 | SeasonProgressTracker → SeasonDashboard | ✅ Done |
| WIRE-008 | GAP-014 | SalaryDisplay → PlayerCard | ✅ Done |
| WIRE-009 | GAP-015 | RelationshipPanel → PlayerCard | ✅ Done |
| WIRE-010 | GAP-016 | AgingDisplay → PlayerCard | ✅ Done |
| WIRE-011 | GAP-018 | LeagueNewsFeed → SeasonDashboard | ✅ Done |
| WIRE-012 | GAP-019 | ChemistryDisplay → RosterView | ✅ Done |
| WIRE-013 | GAP-020 | ContractionWarning → SeasonDashboard | ✅ Done |
| WIRE-014 | GAP-021 | LeagueBuilder → MainMenu | ✅ Done |
| WIRE-015 | GAP-022 | PlayerRatingsForm → ManualPlayerInput | ✅ Done |
| WIRE-016 | GAP-023 | Museum Components → MuseumHub | ✅ Done |
| WIRE-017 | GAP-024 | Awards Components → AwardsCeremonyHub | ✅ Done |
| WIRE-018 | GAP-025 | Offseason Components → OffseasonHub | ✅ Done |
| WIRE-019 | GAP-026 | transactionStorage → TradeHub | ✅ Done |
| WIRE-020 | GAP-027 | fieldingStatsAggregator → AwardsHub | ✅ Done |
| WIRE-021 | GAP-028 | dataExportService → PostGameScreen | ✅ Done |
| WIRE-022 | GAP-029 | traitPools → TraitLotteryWheel | ✅ Done |
| WIRE-023 | GAP-030 | adaptiveLearningEngine → FieldingModal | ✅ Done |

### Routes Added

| Path | Component | Description |
|------|-----------|-------------|
| `/league-builder` | LeagueBuilderWrapper | Create new league/season |
| `/awards/goldglove` | GoldGloveWrapper | Gold Glove awards presentation |
| `/museum/hof` | HallOfFameWrapper | Hall of Fame gallery |
| `/museum/retired` | RetiredNumbersWrapper | Retired numbers wall |
| `/museum/records` | FranchiseRecordsWrapper | Franchise records display |
| `/museum/championships` | ChampionshipBannersWrapper | Championship banners |

### Key Components Wired (January 26 Final Session)

- **SeasonDashboard**: PlayoffBracket (conditional, shows during playoffs), ContractionWarning
- **PostGameScreen**: ChampionshipCelebration (shows after championship win)
- **PlayerCard**: RelationshipPanel, AgingDisplay, SalaryDisplay (using salaryCalculator)
- **RosterView**: ChemistryDisplay with expandable toggle
- **MuseumHub**: HallOfFameGallery, RetiredNumbersWall, FranchiseRecords, ChampionshipBanners
- **TraitLotteryWheel**: getWeightedTraitPool from traitPools.ts

### Status

**All 23 wiring stories COMPLETE.** Player database now has full ratings for all 506 players, enabling salary calculation in PlayerCard.

---

## Project Overview

**What is this?**: A baseball stat-tracking application designed for **Super Mega Baseball 4 (SMB4)**, a video game with unique mechanics. This distinction matters because:
- No catcher interference, balk detection, or umpire judgment calls
- User manually selects all outcomes (the game tells them what happened)
- DH rules and substitutions still apply (user can remove DH)
- Kids league rules do NOT apply

---

## Implementation Status

### Core Features - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| At-bat result tracking | ✅ Complete | 1B, 2B, 3B, HR, BB, IBB, K, GO, FO, LO, PO, DP, SF, SAC, HBP, E, FC, D3K |
| Runner advancement | ✅ Complete | Force play logic, minimum advancement, user selection |
| Out counting | ✅ Complete | Includes DP (adds 2), inning flip at 3 |
| Run scoring | ✅ Complete | Respects 3rd-out-on-force rule |
| RBI calculation | ✅ Complete | Excludes errors, DP, WP, PB, Balk |
| Extra events | ✅ Complete | Steal, CS, WP, PB, Pickoff, Balk |
| Inning management | ✅ Complete | TOP/BOTTOM flip, bases clear, outs reset |
| Undo functionality | ✅ Complete | 10-state stack |
| Activity log | ✅ Complete | Rolling 10-entry display |
| CLUTCH/RISP tags | ✅ Complete | Shows situational indicators |

### Fielding System - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Fielder inference | ✅ Complete | Auto-infers fielder from direction + exit type |
| Fielding modal | ✅ Complete | Confirms fielder, play type, special situations |
| Two-step at-bat flow | ✅ Complete | Basic inputs → Fielding confirmation → Submit |
| Contextual UI | ✅ Complete | Shows toggles only when applicable (IFR, D3K, etc.) |
| Hit fielding attempts | ✅ Complete | "Clean" vs diving/leaping/robbery attempt tracking |

**Key Logic (see FIELDING_SYSTEM_SPEC.md Section 1.1):**
- Outs/Errors: ALWAYS require fielding confirmation
- Hits: Default to "Clean" (no fielding chance), user can select diving/leaping/robbery to indicate attempt
- Fielding chance only recorded when play was attempted

### Substitution System - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Pinch Hitter | ✅ Complete | PinchHitterModal with position assignment |
| Pinch Runner | ✅ Complete | PinchRunnerModal with pitcher responsibility inheritance |
| Defensive Sub | ✅ Complete | DefensiveSubModal supports multiple subs |
| Pitching Change | ✅ Complete | PitchingChangeModal with pitch count, inherited runners |
| Position Switch | ✅ Complete | PositionSwitchModal - swap positions without removing players |
| Double Switch | ⚠️ Spec only | Not yet implemented |
| Lineup State | ✅ Complete | LineupState tracks current lineup, bench, used players |
| Undo support | ✅ Complete | Lineup state included in undo stack |

### Features - PARTIALLY IMPLEMENTED ⚠️

*None currently*

### Data Persistence & Stats - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| IndexedDB game storage | ✅ Complete | `gameStorage.ts` - saves current game, archives completed |
| Game recovery on refresh | ✅ Complete | `useGamePersistence.ts` - auto-load, recovery prompt |
| Season stats aggregation | ✅ Complete | `seasonStorage.ts`, `seasonAggregator.ts` |
| Live stats display | ✅ Complete | `useLiveStats.ts` - season + current game merged |
| Event log system | ✅ Complete | `eventLog.ts` - bulletproof data with situational context |
| Data integrity checks | ✅ Complete | `useDataIntegrity.ts` - startup recovery, retry logic |
| Fame detection | ✅ Complete | `useFameDetection.ts` - triggers from accumulated stats |
| **Fielding events** | ✅ Complete | `eventLog.ts` - FieldingModal → FIELDING_EVENTS store (fixed Jan 24) |
| **Leverage per at-bat** | ✅ Complete | `AtBatEvent.leverageIndex` stored per at-bat |

See `STAT_TRACKING_ARCHITECTURE_SPEC.md` for full architecture (Phases 1-4 implemented).

**Day 1 v2 Fix (Jan 24, 2026)**: Connected FieldingModal to IndexedDB persistence. Rich fielding data (play type, difficulty, assist chains) now persists to `fieldingEvents` store for fWAR calculation.

### WAR Calculation Engines - IMPLEMENTED ✅ (Day 1-2 Sprint)

| Feature | Status | Notes |
|---------|--------|-------|
| bWAR Types | ✅ Complete | `types/war.ts` - All interfaces, SMB4 baselines |
| bWAR Calculator | ✅ Complete | `engines/bwarCalculator.ts` - wOBA, wRAA, replacement runs |
| pWAR Calculator | ✅ Complete | `engines/pwarCalculator.ts` - FIP, starter/reliever split, leverage |
| fWAR Calculator | ✅ Complete | `engines/fwarCalculator.ts` - Per-play values, positional adjustment |
| rWAR Calculator | ✅ Complete | `engines/rwarCalculator.ts` - wSB, UBR, wGDP |
| Unified Index | ✅ Complete | `engines/index.ts` - calculateTotalWAR, getTotalWARTier |
| All Tests | ✅ Complete | `war-verify.mjs` - 24/24 tests passing |
| Transaction Logging | ✅ Complete | `transactionStorage.ts` - 30+ event types |
| Career Storage | ✅ Updated | WAR fields added to career batting/pitching |
| **WAR Hook** | ✅ Complete | `hooks/useWARCalculations.ts` - Bridge to seasonStorage (Day 2) |
| **WAR Display** | ✅ Complete | `components/GameTracker/WARDisplay.tsx` - Leaderboards, badges (Day 2) |
| **fWAR Integration** | ✅ Complete | `useWARCalculations.ts` - calculateFWARFromStats wired (IMPL_PLAN_v5 Day 1) |
| **rWAR Integration** | ✅ Complete | `useWARCalculations.ts` - calculateRWARSimplified wired (IMPL_PLAN_v5 Day 1) |
| **Total WAR** | ✅ Complete | Position: bWAR+fWAR+rWAR; Pitcher: pWAR+(bWAR×0.1) |

**Day 2 v2 Fix (Jan 25, 2026)**: Connected bWAR/pWAR calculators to real persisted season data via `useWARCalculations` hook. Created display components for WAR leaderboards.

**Day 1 IMPL_PLAN_v5 (Jan 26, 2026)**: Connected fWAR and rWAR calculators to useWARCalculations hook. Added conversion functions, state maps, getters, and total WAR calculation combining all components.

**Day 2 IMPL_PLAN_v5 (Jan 26, 2026)**: Wired Clutch and mWAR systems to UI:
- Added "Clutch" tab to WARPanel (`WARDisplay.tsx`) with ClutchLeaderboard component
- Wired `useClutchCalculations` hook into GameTracker - records clutch events for both batter and pitcher after each at-bat
- Wired `useMWARCalculations` hook into GameTracker - records manager decisions (pitching changes, pinch hitters, etc.) for mWAR tracking
- Browser tested: Clutch tab appears and displays "No clutch data yet" until at-bats are recorded

**SMB4 Baselines Used (from ADAPTIVE_STANDARDS_ENGINE_SPEC.md):**
- League wOBA: 0.329, wOBA Scale: 1.7821
- League FIP: 4.04, FIP constant: 3.28
- Replacement Level: -12.0 runs per 600 PA (batters), 0.12/0.03 (starter/reliever)
- **WAR Runs Per Win: 10 × (seasonGames / 162)** — e.g., 50 games = 3.09 RPW
- SB value: +0.20, CS value: -0.45, break-even: 69%

> ⚠️ **Note**: The 17.87 "runsPerWin" in ADAPTIVE_STANDARDS is for run environment analysis (Pythagorean expectation), NOT for WAR. See SESSION_LOG "CRITICAL BUG FIX" entry.

**WAR Component Summary:**
- **bWAR**: wOBA → wRAA → replacement adjustment → park factor → WAR
- **pWAR**: FIP → runs prevented above replacement → WAR (with leverage)
- **fWAR**: per-play runs × position modifier × difficulty → positional adjustment → WAR
- **rWAR**: BsR (wSB + UBR + wGDP) / runsPerWin

### Day 3 Sprint - Leverage/Clutch/mWAR - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Leverage Index Calculator | ✅ Complete | `engines/leverageCalculator.ts` - BASE_OUT_LI table, inning/score modifiers |
| gmLI for Relievers | ✅ Complete | Accumulator pattern, gmLI → leverage multiplier |
| Clutch Calculator | ✅ Complete | `engines/clutchCalculator.ts` - Multi-participant attribution |
| Contact Quality | ✅ Complete | Exit type → CQ mapping, playoff multipliers |
| Net Clutch Rating | ✅ Complete | Per-player accumulation, tier system |
| mWAR Calculator | ✅ Complete | `engines/mwarCalculator.ts` - Decision tracking, evaluation |
| Manager Decision Types | ✅ Complete | 12 decision types, auto-detect + user-prompted |
| Team Overperformance | ✅ Complete | Salary-based expectation, 30% manager credit |
| All Tests | ✅ Complete | `leverage-clutch-mwar-verify.mjs` - 21/21 passing |
| LI UI Integration | ✅ Complete | Scoreboard displays LI with color-coded categories |

**Key Calculations:**
- **Leverage Index**: LI = BASE_OUT_LI × inningMult × walkoffBoost × scoreDamp (range: 0.1 - 10.0)
- **Clutch Value**: baseValue × √LI × playoffMultiplier
- **mWAR**: (decisionWAR × 0.60) + (overperformanceWAR × 0.40)
- **gmLI → Leverage Multiplier**: (gmLI + 1) / 2

**UI Integration:**
- Scoreboard component now displays live LI with color coding
- Categories: LOW (gray), MEDIUM (green), CLUTCH (yellow), HIGH (orange), EXTREME (red 🔥)
- CLUTCH badge still appears in at-bat card when LI ≥ 1.5

### Day 4 Sprint - Fame Engine & Detection Functions - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Fame Engine | ✅ Complete | `engines/fameEngine.ts` - LI weighting, fame tiers |
| Career Milestones | ✅ Complete | 20+ career stat thresholds (HR, Hits, Wins, etc.) |
| Season Milestones | ✅ Complete | Season achievements, clubs (20/20, 30/30, etc.) |
| First Career Detection | ✅ Complete | First hit, HR, RBI, win, save, K |
| Detection Functions | ✅ Complete | `engines/detectionFunctions.ts` - prompt/manual detection |
| Prompt Detection | ✅ Complete | Web Gem, Robbery, TOOTBLAN, Nut Shot, etc. |
| Blown Save Detection | ✅ Complete | Save opportunity tracking |
| Triple Play Detection | ✅ Complete | Regular and unassisted |
| Position Player Pitching | ✅ Complete | Clean innings, strikeouts, runs allowed |
| Fielding Errors | ✅ Complete | Dropped fly, booted grounder, wrong base |
| All Tests | ✅ Complete | `fame-detection-verify.cjs` - 25/25 passing |

**Key Calculations:**
- **Fame Value**: baseFame × √LI × playoffMultiplier
- **LI Multiplier**: √LI (LI=4 → 2×, LI=9 → 3×)
- **Fame Tiers**: Notorious (-30), Villain, Disliked, Unknown, Known, Fan Favorite, Star, Superstar, Legend (50+)
- **Save Opportunity**: Lead ≤3 OR tying run on base/at bat, 7th inning or later

**Milestone Threshold Architecture (Runtime Scaling):**
- **MLB Baseline Thresholds** are stored in code (40 HR, 200 hits, etc.) - These create meaning
- **MilestoneConfig** holds franchise settings: `gamesPerSeason`, `inningsPerGame`
- **Runtime Scaling** via `scaleMilestoneThreshold()` in fameEngine.ts
- **Scaling Types**:
  - `'opportunity'`: games × innings (gamesPerSeason/162 × inningsPerGame/9)
    - Used for: HR, hits, RBI, SB, pitcher K, walks, errors, WAR, etc.
    - Rationale: More innings per game = more plate appearances/chances
  - `'per-game'`: season length only (gamesPerSeason / 162)
    - Used for: Wins, losses, saves, blown saves, complete games, games played
    - Rationale: Max 1 per game regardless of game length
  - `'none'`: No scaling
    - Used for: Awards (All-Star, MVP, Cy Young) - 1 per season max
- **Rate stats** (BA, ERA) use same thresholds as MLB (no scaling needed)
- **Example - 32g/9inn season**: 40 HR MLB × (32/162 × 9/9) = 40 × 0.198 = 8 HR threshold
- **Example - 32g/7inn season**: 40 HR MLB × (32/162 × 7/9) = 40 × 0.154 = 6 HR threshold

**Existing UI Integration:**
- FameEventModal for manual Fame entry (all event types)
- QuickFameButtons for common events (Nut Shot, TOOTBLAN, Web Gem, etc.)
- FamePanel for in-game Fame display
- Toast notifications for auto-detected events
- EndGameFameSummary for post-game

**Design Philosophy Documented:**
- Updated `REQUIREMENTS.md` - User Interaction Model section rewritten
- Updated `AI_OPERATING_PREFERENCES.md` - Added Section 13 "GameTracker Design Philosophy"
- Detection Tiers: Auto-Detect (no input), Prompt-Detect (1-click), Manual Entry (rare)

### Day 5 Sprint - Mojo/Fitness/Salary Engines - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Mojo Engine | ✅ Complete | `engines/mojoEngine.ts` - 5-level scale, triggers, effects |
| Mojo Stat Multipliers | ✅ Complete | 0.82 (Rattled) to 1.18 (Jacked) |
| Mojo Triggers | ✅ Complete | 20+ events with situational amplification |
| Mojo Carryover | ✅ Complete | 30% carries between games |
| Fitness Engine | ✅ Complete | `engines/fitnessEngine.ts` - 6 states, decay, recovery |
| Fitness Stat Multipliers | ✅ Complete | 0.00 (Hurt) to 1.20 (Juiced) |
| Fitness Decay/Recovery | ✅ Complete | Position-specific rates, trait modifiers |
| Injury Risk | ✅ Complete | Based on fitness state, position, age, traits |
| Juiced Status | ✅ Complete | Extended rest requirements, cooldown, PED stigma |
| Salary Calculator | ✅ Complete | `engines/salaryCalculator.ts` - base + modifiers |
| Position Player Weights | ✅ Complete | 3:3:2:1:1 (Power 30%, Contact 30%, Speed 20%, Fielding 10%, Arm 10%) |
| Pitcher Weights | ✅ Complete | 1:1:1 (equal 33.3% each) |
| Position Multipliers | ✅ Complete | C +15%, SS +12%, CF +8%, 1B -8%, DH -12% |
| Trait Modifiers | ✅ Complete | Elite ±10%, Good ±5%, Minor ±2% |
| Pitcher Batting Bonus | ✅ Complete | ≥70 = +50%, ≥55 = +25%, ≥40 = +10% |
| Two-Way Player Handling | ✅ Complete | (Position + Pitcher) × 1.25 premium |
| True Value | ✅ Complete | Position-relative percentile approach |
| Trade Matching | ✅ Complete | Salary-based swap requirements |
| Draft Budget | ✅ Complete | Retirements + releases + standings bonus |
| All Tests | ✅ Complete | `mojo-fitness-salary-verify.cjs` - 45/45 passing |

**Key Calculations:**
- **Mojo Stat Multiplier**: 0.82 + (0.09 × (mojo + 2)) → 0.82 to 1.18
- **Mojo Amplification**: tieGameLate × playoff × basesLoaded × rispTwoOuts (multiplicative)
- **Mojo Carryover**: nextStartMojo = round(endMojo × 0.3)
- **Fitness Stat Multiplier**: JUICED 1.20, FIT 1.00, WELL 0.95, STRAINED 0.85, WEAK 0.70, HURT 0
- **Position Player Rating**: power×0.30 + contact×0.30 + speed×0.20 + fielding×0.10 + arm×0.10
- **Pitcher Rating**: (velocity + junk + accuracy) / 3
- **Base Salary**: (weightedRating / 100)^2.5 × $50M × positionMult × traitMod
- **Final Salary**: baseSalary × ageFactor × performanceMod × fameMod × personalityMod
- **True Value**: WAR percentile among position peers → salary percentile mapping

**Fame/WAR Integration:**
- Mojo Fame Modifier: Rattled +30%, Jacked -20%
- Fitness Fame Modifier: Juiced -50% (PED stigma), Weak +25% (gutsy)
- Mojo WAR Multiplier: Rattled +15%, Jacked -10%
- Fitness WAR Multiplier: Juiced -15%, Weak +20%

### Day 6 Sprint - Fan Morale/Narrative Engines - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Fan Morale Engine | ✅ Complete | `engines/fanMoraleEngine.ts` - 7 states, event-driven |
| Fan State Thresholds | ✅ Complete | EUPHORIC (90-99) → HOSTILE (0-9) |
| Morale Events | ✅ Complete | 30+ event types with base impacts |
| Performance Multipliers | ✅ Complete | VASTLY_EXCEEDING (±50%) to VASTLY_UNDER (±50%) |
| Timing Multipliers | ✅ Complete | EARLY (0.5×) to PLAYOFF_RACE (2.0×) |
| Morale Drift | ✅ Complete | Natural regression toward baseline (0.03/day) |
| Momentum System | ✅ Complete | 50% amplification for streaks |
| Trade Scrutiny | ✅ Complete | 14-game window with verdicts |
| Contraction Risk | ✅ Complete | Morale (30%) + Financial (40%) + Performance (30%) |
| Narrative Engine | ✅ Complete | `engines/narrativeEngine.ts` - beat reporter templates |
| Reporter Personalities | ✅ Complete | 10 personalities with weighted distribution |
| 80/20 Alignment | ✅ Complete | 80% on-brand, 20% off-brand |
| Story Types | ✅ Complete | TRADE, GAME_RECAP, MILESTONE, etc. |
| Heat Levels | ✅ Complete | COLD (0.5×) to EXPLOSIVE (1.5×) |
| Claude API Ready | ✅ Complete | Placeholder for drop-in integration |
| Reporter Reliability | ✅ Complete | 65-95% accuracy by personality, retractions |
| All Tests | ✅ Complete | `fan-morale-narrative-verify.cjs` - 73/73 passing |

**Key Calculations:**
- **Fan State**: Derived from morale value (0-99) via FAN_STATE_THRESHOLDS
- **Morale Change**: baseImpact × performanceMult × timingMult × momentumMult
- **Performance Classification**: Compare win% vs expected (from salary-based projection)
- **Trade Verdict**: Compare acquired player WAR vs traded player WAR over 14 games
- **Contraction Risk**: (morale × 0.30) + (financial × 0.40) + (performance × 0.30)

**Beat Reporter System:**
- **Personality Weights**: BALANCED 20%, OPTIMIST 15%, DRAMATIC 12%, PESSIMIST 10%, ANALYTICAL 10%
- **Secondary Weights**: HOMER 8%, CONTRARIAN 8%, INSIDER 7%, OLD_SCHOOL 5%, HOT_TAKE 5%
- **Alignment Rate**: 80% personality-aligned, 20% off-brand
- **Story Morale Impact**: Derived from personality alignment × heat level

**Reporter Reliability System:**
- **Accuracy Rates**: INSIDER 95%, ANALYTICAL 92%, BALANCED 90%, OLD_SCHOOL 88%, OPTIMIST/PESSIMIST 85%, HOMER 80%, DRAMATIC 78%, CONTRARIAN 75%, HOT_TAKE 65%
- **Confidence Levels**: CONFIRMED (≥90%), LIKELY (≥80%), SOURCES_SAY (≥70%), RUMORED (≥50%), SPECULATING (<50%)
- **Inaccuracy Types**: PREMATURE (jumped gun), EXAGGERATED (overstated), MISATTRIBUTED (wrong player), FABRICATED (bad source), OUTDATED (situation changed)
- **Retractions**: Severe errors on high-stakes topics always need retraction; minor errors ~30% chance noticed
- **Credibility Hits**: FABRICATED -15, PREMATURE -10, MISATTRIBUTED -5, EXAGGERATED -3, OUTDATED -1

### Day 5 (IMPL PLAN v3) - Career Aggregation Pipeline - VERIFIED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Career Storage | ✅ Complete | `careerStorage.ts` - PlayerCareerBatting/Pitching/Fielding |
| Career Aggregation | ✅ Complete | `milestoneAggregator.ts` - Game → Career via aggregateGameWithMilestones |
| Career Queries | ✅ Complete | getAllCareerBatting(), getAllCareerPitching(), getCareerStats() |
| Season End Processing | ✅ Complete | `seasonEndProcessor.ts` - MVP/Ace/Legacy detection |
| Career Milestone Detection | ✅ Complete | `milestoneDetector.ts` - Tiered thresholds with scaling |
| Career Stats Hook | ✅ Complete | `useCareerStats.ts` - Hook for UI components |
| Career Display Component | ✅ Created | `CareerDisplay.tsx` - Leaderboards (not yet rendered) |

**Data Flow:**
1. `index.tsx` line 796 → `aggregateGameToSeason()` at game end
2. `seasonAggregator.ts` → `aggregateGameWithMilestones()`
3. `milestoneAggregator.ts` → `aggregateGameToCareerBatting()` / `Pitching()`
4. Career milestones detected via `checkAndProcessCareerBattingMilestones()`

**Tier 4 Spec Audit Results:**
- ✅ Career batting interface matches spec (20+ fields)
- ✅ Career pitching interface matches spec (25+ fields)
- ✅ Scaling factors match spec (128/162 = 0.79, 6/9 = 0.67)
- ✅ WAR component milestones (bWAR, pWAR, fWAR, rWAR) tiered correctly

### Features - NOT IMPLEMENTED ❌

| Feature | Status | Priority |
|---------|--------|----------|
| Double Switch | ⚠️ Spec only | LOW - Modal not implemented yet |
| Box score export | ❌ None | FUTURE |
| Spray chart visualization | ❌ Spec only | FUTURE - Uses fielding data |
| Shift toggle | ❌ Spec only | FUTURE - Modifies inference |
| Career Display Rendered | ⚠️ Component exists | DAY 6-7 - Wire to UI |
| **Salary Display in PlayerCard** | ✅ Complete | Engine + UI wired, player database has ratings |

### Salary Display - RESOLVED ✅

**Status**: Fully implemented and working.

**What's Implemented:**
- `engines/salaryCalculator.ts` (1196 lines) - Complete per SALARY_SYSTEM_SPEC.md
- `components/GameTracker/SalaryDisplay.tsx` - All display variants available
- `components/GameTracker/PlayerCard.tsx` - Shows salary with tier and ROI badge
- `data/playerDatabase.ts` - 506 players with full ratings (batterRatings, pitcherRatings)

**How It Works:**
1. PlayerCard receives playerId from game lineup
2. `getPlayer(playerId)` retrieves PlayerData with batterRatings/pitcherRatings
3. `calculateSalary()` computes salary from ratings per SALARY_SYSTEM_SPEC.md
4. Salary displayed with tier (Supermax, Elite, etc.) and ROI badge when WAR available

---

## NFL Audit Status (January 24, 2026)

### Latest Audit: Days 1-5 Engine Implementation

A comprehensive NFL audit of engine implementations revealed critical issues in salaryCalculator.ts that have now been fixed.

**Salary Calculator Issues Found & Fixed:**

| Issue | Spec Requirement | Was Implemented | Status |
|-------|-----------------|-----------------|--------|
| Batter rating weights | 3:3:2:1:1 | 40/30/10/10/10 | ✅ Fixed |
| Pitcher rating weights | 1:1:1 (equal) | 35/35/30 | ✅ Fixed |
| Position multipliers | C: +15%, SS: +12%, etc. | Missing | ✅ Added |
| Trait modifiers | Elite ±10%, Good ±5% | Missing | ✅ Added |
| Pitcher batting bonus | ≥70 = +50%, etc. | Missing | ✅ Added |
| Two-way player handling | (Pos + Pitch) × 1.25 | Missing | ✅ Added |
| True Value calculation | Position-relative percentile | Simple ROI | ✅ Rewrote |

**All Tests Passing:**
- mojo-fitness-salary-verify.cjs: 45/45 ✅
- bwar-verify.mjs: All passing ✅
- war-verify.mjs: All passing ✅
- leverage-clutch-mwar-verify.mjs: All passing ✅
- fame-detection-verify.cjs: All passing ✅
- TypeScript compilation: Clean ✅

### Previous Audit (January 23, 2026)

See `NFL_AUDIT_REPORT.md` for full details of the spec-level audit.

**Summary:**
- **73 total issues** identified across 43 spec files
- **Critical Issues:** 7 resolved, 4 remaining (detection functions need implementation)
- **Major Issues:** 5 resolved, 17 remaining

**Key Resolutions:**
- ✅ Roster size standardized: 22-man
- ✅ Mojo range standardized: -2 to +2 (5 levels)
- ✅ "Locked In" = HIGH (+1 Mojo) display name
- ✅ ADAPTIVE_STANDARDS_ENGINE: Using SMB4 static baselines (MVP decision)
- ✅ ~45 detection functions documented in `DETECTION_FUNCTIONS_IMPLEMENTATION.md`
- ✅ Pitcher grade thresholds corrected

**New Documentation:**
- `NFL_AUDIT_REPORT.md` - Full audit with issue tracking
- `DETECTION_FUNCTIONS_IMPLEMENTATION.md` - All detection functions cataloged

---

## Known Bugs

See `GAMETRACKER_BUGS.md` for detailed bug tracking. Status as of Jan 27, 2026:

**Fixed (9 bugs):**
- BUG-001/002: Position validation in subs
- BUG-003: GO→DP auto-correction
- BUG-004/005: WAR/Season loading
- BUG-006: Mojo/Fitness in scoreboard (Jan 27 - hooks + UI wired)
- BUG-010: Morale superscripts
- BUG-013: Disable impossible events
- BUG-015: HR fielding options
- Balk button removed (not in SMB4)

**Remaining (3 bugs):**
- BUG-007: No Fame events during game
- BUG-008: End Game modal has wrong data
- BUG-011: No pitch count displayed

**Fixed (Jan 26 Session):**
- BUG-009: Undo button - NOT A BUG (exists in Activity Log, requires scroll)
- BUG-012: Pitcher exit prompt - WIRED (triggers at 85/100/115 pitches)
- BUG-014: Inning summary - WIRED (shows on inning flip)

---

## Test Coverage

- **Unit Tests**: 63/63 passing (testStateMachine.mjs + testIntegration.mjs)
- **UI Tests**: 17 scenarios tested, 16 passing, 1 not implemented (Pinch Hitter)

See `WORST_CASE_SCENARIOS.md` for detailed test results.

---

## File Structure

```
kbl-tracker/
├── src/
│   ├── components/
│   │   └── GameTracker/
│   │       ├── index.tsx          # Main component, state machine
│   │       ├── AtBatButtons.tsx   # Result/event buttons
│   │       ├── AtBatFlow.tsx      # Two-step at-bat flow with fielding
│   │       ├── FieldingModal.tsx  # Fielding confirmation modal
│   │       ├── AtBatModal.tsx     # Result confirmation modal (legacy)
│   │       └── ExtraEventModal.tsx # Event confirmation modal
│   ├── types/
│   │   └── game.ts                # TypeScript types (FieldingData, etc.)
│   └── data/
│       └── mockData.ts            # Sample team/player data
├── tests/
│   ├── testStateMachine.mjs       # 39 unit tests
│   ├── testIntegration.mjs        # 24 integration tests
│   └── fieldingInferenceTests.ts  # 88 fielding inference tests
├── reference-docs/                 # SMB4 Reference Materials
│   ├── BillyYank Super Mega Baseball Guide 3rd Edition.docx  # Full 90+ page guide
│   └── Jester's Super Mega Baseball Reference V2 clean.xlsx  # Stat tracking template
└── spec-docs/
    ├── AI_OPERATING_PREFERENCES.md # ⚠️ READ FIRST - Core operating principles for AI
    ├── KBL_XHD_TRACKER_MASTER_SPEC_v3.md  # ⭐ MASTER SPEC - All systems
    │
    │   ## WAR Calculation Specs
    ├── BWAR_CALCULATION_SPEC.md   # ⭐ Batting WAR (wOBA, wRAA, replacement level)
    ├── FWAR_CALCULATION_SPEC.md   # ⭐ Fielding WAR per-play values + season scaling
    ├── RWAR_CALCULATION_SPEC.md   # ⭐ Baserunning WAR (wSB, UBR, wGDP)
    ├── PWAR_CALCULATION_SPEC.md   # ⭐ Pitching WAR (FIP-based)
    ├── MWAR_CALCULATION_SPEC.md   # ⭐ Manager WAR (decisions + overperformance)
    │
    │   ## In-Game Tracking Specs
    ├── LEVERAGE_INDEX_SPEC.md     # ⭐ Leverage Index calculation
    ├── CLUTCH_ATTRIBUTION_SPEC.md # ⭐ Multi-participant clutch credit distribution
    ├── FIELDING_SYSTEM_SPEC.md    # Fielding UI and inference logic
    ├── RUNNER_ADVANCEMENT_RULES.md # Runner movement, force plays, WP/PB/SB
    ├── INHERITED_RUNNERS_SPEC.md  # ⭐ Inherited runner responsibility tracking
    ├── PITCH_COUNT_TRACKING_SPEC.md # ⭐ Pitch count per-AB and game totals
    ├── PITCHER_STATS_TRACKING_SPEC.md # ⭐ IP, K, BB, W/L/SV, Maddux detection
    ├── SUBSTITUTION_FLOW_SPEC.md  # ⭐ PH/PR/defensive sub/pitching change flows
    │
    │   ## Special Events & Fame
    ├── SPECIAL_EVENTS_SPEC.md     # ⭐ Fame Bonus/Boner events (nut shot, TOOTBLAN, etc.)
    ├── fame_and_events_system.md  # Fame system, All-Star voting, random events
    │
    │   ## SMB4 Reference
    ├── SMB4_GAME_MECHANICS.md     # ⭐ Central SMB4 what IS/ISN'T in game
    ├── SMB4_GAME_REFERENCE.md     # SMB4 game mechanics (Mojo, Chemistry, Traits)
    │
    │   ## Project Management
    ├── CURRENT_STATE.md           # This file
    ├── DECISIONS_LOG.md           # Key decisions with rationale
    ├── REQUIREMENTS.md            # User requirements
    ├── SESSION_LOG.md             # Running session log
    ├── WORST_CASE_SCENARIOS.md    # Test results
    └── STATE_TRANSITION_RULES.md
```

---

## WAR Calculation Implementation Phases

> **Future-proofing note**: This section documents what advanced metrics can be calculated now vs. what requires enhanced tracking. Each spec file has detailed implementation notes.

### Summary Table

| Metric | Component | Status | Notes | Spec Reference |
|--------|-----------|--------|-------|----------------|
| **bWAR** | wOBA | ✅ Ready | All batting events tracked | BWAR_CALCULATION_SPEC.md §3-4 |
| **bWAR** | wRAA | ✅ Ready | Derived from wOBA | BWAR_CALCULATION_SPEC.md §5 |
| **bWAR** | Replacement Level | ✅ Ready | Calibration system included | BWAR_CALCULATION_SPEC.md §6-7 |
| **fWAR** | Basic plays | ✅ Ready | Putouts, assists, errors | FWAR_CALCULATION_SPEC.md §4-6 |
| **fWAR** | Advanced plays | ⚠️ Partial | Need running/sliding/over_shoulder tracking | FIELDING_SYSTEM_SPEC.md |
| **fWAR** | DP role credit | ❌ Later | Schema defined, UI not built | FIELDING_SYSTEM_SPEC.md §1.2 |
| **rWAR** | wSB | ✅ Ready | SB/CS tracked via extra events | RWAR_CALCULATION_SPEC.md §3 |
| **rWAR** | wGDP | ✅ Ready | GIDP tracked as at-bat result | RWAR_CALCULATION_SPEC.md §5 |
| **rWAR** | UBR (basic) | ⚠️ Partial | Speed rating proxy available | RWAR_CALCULATION_SPEC.md §8 |
| **rWAR** | UBR (full) | ❌ Later | Needs runner advancement tracking | RWAR_CALCULATION_SPEC.md §8 |
| **pWAR** | FIP | ✅ Ready | K, BB, HBP, HR all tracked | PWAR_CALCULATION_SPEC.md §3 |
| **pWAR** | Basic pWAR | ✅ Ready | Using simplified RPW | PWAR_CALCULATION_SPEC.md §8 |
| **pWAR** | Starter/Reliever split | ✅ Ready | GS and G tracked | PWAR_CALCULATION_SPEC.md §6 |
| **pWAR** | Leverage adjustment | ✅ Ready | Full LI calculation now available | LEVERAGE_INDEX_SPEC.md §4-6 |
| **pWAR** | Park adjustment | ❌ Later | Requires park factor data | PWAR_CALCULATION_SPEC.md §11 |
| **Clutch** | Leverage Index | ✅ Ready | All game state data tracked | LEVERAGE_INDEX_SPEC.md §3-4 |
| **Clutch** | LI-weighted clutch/choke | ✅ Ready | Replaces binary "close game" | CLUTCH_ATTRIBUTION_SPEC.md §4 |
| **Clutch** | Multi-participant attribution | ✅ Ready | Credit to all players on play | CLUTCH_ATTRIBUTION_SPEC.md §4-5 |
| **Clutch** | Contact Quality | ✅ Ready | Inferred from trajectory | CLUTCH_ATTRIBUTION_SPEC.md §3 |
| **Clutch** | Net Clutch Rating | ✅ Ready | Feeds All-Star/Award voting | CLUTCH_ATTRIBUTION_SPEC.md §9 |
| **mWAR** | Decision tracking | ✅ Ready | Auto-inferred + user-prompted | MWAR_CALCULATION_SPEC.md §3-4 |
| **mWAR** | Decision evaluation | ✅ Ready | LI-weighted outcomes | MWAR_CALCULATION_SPEC.md §5 |
| **mWAR** | Team overperformance | ✅ Ready | Wins vs salary expectation | MWAR_CALCULATION_SPEC.md §6 |

### Phase 1 (Calculate Now)
These metrics can be implemented with current tracking:
- **Full bWAR**: wOBA, wRAA, replacement level adjustment
- **Basic fWAR**: Per-play credits for putouts, assists, errors, DPs
- **Partial rWAR**: wSB (stolen bases) + wGDP (double play avoidance)
- **Full pWAR**: FIP, starter/reliever split, real LI-based leverage multiplier
- **Full Clutch System**: LI calculation, multi-participant attribution, contact quality, Net Clutch Rating
- **Full mWAR**: Manager decision tracking (auto-inferred), LI-weighted evaluation, team overperformance

### Phase 2 (Requires Enhanced Tracking)
These need additional UI/schema work:
- **Full fWAR**: DP role tracking (started/turned/completed), new play types
- **Full rWAR (UBR)**: Runner advancement opportunities, extra bases taken, thrown out advancing
- **Park factors**: For pWAR park adjustment
- **Full mWAR prompts**: User-prompted steal/bunt/squeeze calls (currently defaults to player autonomy)

### Schema Additions Defined But Not Implemented
See FIELDING_SYSTEM_SPEC.md and RWAR_CALCULATION_SPEC.md for ready-to-implement schemas:
- `dpRole`: 'started' | 'turned' | 'completed' | 'unassisted'
- `RunnerAdvancement`: advancementType, couldHaveAdvanced, wasThrown
- Enhanced play types: running, sliding, over_shoulder

---

## Key Code Locations

| Logic | File | Line(s) | Notes |
|-------|------|---------|-------|
| Force play calculation | index.tsx | ~150-180 | `getMinimumBase()` function |
| Out counting | index.tsx | ~280-320 | DP adds 2, runner outs add 1 |
| RBI calculation | index.tsx | ~250-280 | Modal pre-calculates, user can adjust |
| Inning flip | index.tsx | ~320-350 | Clears bases, resets outs |
| Extra events | index.tsx | ~400-450 | `handleExtraEvent()` |
| Undo | index.tsx | ~100-130 | 10-state stack |
| **Fielding chance logic** | AtBatFlow.tsx | ~315-326 | `needsFieldingConfirmation` calculation |
| **Fielder inference** | FieldingModal.tsx | ~59-98 | Direction + exit type → fielder matrices |
| **Hit fielding attempt** | AtBatFlow.tsx | ~766-798 | "Clean" vs diving/leaping/robbery UI |
| **FieldingData type** | types/game.ts | ~18-50 | Complete fielding data interface |

---

*This document should be updated whenever implementation status changes.*
