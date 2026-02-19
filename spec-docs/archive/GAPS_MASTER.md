# KBL Tracker - Gaps Master Document

> **Generated**: January 26, 2026
> **Purpose**: Single source of truth for ALL gaps, inconsistencies, bugs, and TODOs
> **Sources**: AUDIT_REPORT.md, COHESION_REPORT.md, CURRENT_STATE.md, GAMETRACKER_BUGS.md, FEATURE_WISHLIST.md

---

## Executive Summary

| Category | Critical | Important | Minor | Total |
|----------|----------|-----------|-------|-------|
| Orphaned Components | 8 | 28 | 8 | 44 |
| Orphaned Services | 2 | 2 | 0 | 4 |
| Bugs | 0 | 4 | 3 | 7 |
| Missing Features | 4 | 8 | 5 | 17 |
| Data Gaps | 2 | 4 | 2 | 8 |
| State Gaps | 0 | 3 | 2 | 5 |
| TODOs in Code | 0 | 6 | 5 | 11 |
| **TOTAL** | **16** | **55** | **25** | **96** |

---

# CRITICAL BLOCKERS

---

## [GAP-001]: Player Ratings Data Model Missing

**Source:** CURRENT_STATE.md, COHESION_REPORT.md
**Type:** DATA_GAP
**Severity:** CRITICAL
**Blocks:** Salary calculations, TeamFinancialsView, TradeSalaryMatcher, True Value display

**Description:**
Salary engine is fully implemented (1196 lines) but cannot be used because player ratings (power, contact, speed, fielding, arm for position players; velocity, junk, accuracy for pitchers) are not stored anywhere. This blocks the entire salary chain.

**Evidence:**
> "Per SALARY_SYSTEM_SPEC.md Section 2 (Base Salary from Ratings), salary requires position player ratings and pitcher ratings. Current data model has NO ratings fields."

**Resolution:**
1. Create PlayerRatings IndexedDB store
2. Add ratings input UI during player creation/import
3. Wire ratings to salaryCalculator.ts

**Has Story?:** Yes - NEW-006 in COHESION_REPORT.md (needs implementation)

---

## [GAP-002]: Free Agent Signing Action Missing

**Source:** COHESION_REPORT.md, AUDIT_REPORT.md
**Type:** MISSING_FEATURE
**Severity:** CRITICAL
**Blocks:** Offseason free agency flow, roster building

**Description:**
FreeAgencyHub component exists and shows free agents, but there is NO signing action. Users can only view free agents but cannot actually sign them to their team.

**Evidence:**
> "GAP-J008: No free agent SIGNING action, only viewing" (COHESION_REPORT.md)
> "FreeAgencyHub → Sign Player action with sample data ✅" (CURRENT_STATE.md) - But this is only sample data, not real signing

**Resolution:**
1. Add "Sign" button to FA cards
2. Create contract offer modal
3. Implement signing transaction (remove from FA pool, add to roster, update cap space)

**Has Story?:** Yes - NEW-001 in COHESION_REPORT.md (needs implementation)

---

## [GAP-003]: Custom Roster Disconnected from Game System

**Source:** SESSION_LOG.md (Jan 26, 2026)
**Type:** DATA_GAP
**Severity:** CRITICAL
**Blocks:** Using manually added players in games

**Description:**
Players added via ManualPlayerInput go to localStorage (`kbl-custom-players`), but the game uses a different player database system. Custom players cannot be used in actual games.

**Evidence:**
> "Custom roster is disconnected from game's player database system. Players added via ManualPlayerInput go to localStorage, but the game uses a different player system."

**Resolution:**
1. Create unified player database
2. Wire ManualPlayerInput to write to game-compatible storage
3. Add "League Builder" to properly integrate teams and players

**Has Story?:** No - needs story

---

## [GAP-004]: Components Render with Empty Data

**Source:** CURRENT_STATE.md, AUDIT_REPORT.md
**Type:** DATA_GAP
**Severity:** CRITICAL
**Blocks:** All Phase B-G components being functional

**Description:**
78 Ralph Framework components were created with correct props interfaces, but wrapper components in App.tsx pass placeholder/empty data. Routes exist but destinations render empty.

**Evidence:**
> "Components render with EMPTY DATA. The Ralph Framework stories created UI components with correct props interfaces, but they are not yet connected to real IndexedDB data."

**Resolution:**
1. Wire actual data from IndexedDB stores to wrapper components
2. Connect state management (context or stores) across components
3. Add data loading hooks to each route wrapper

**Has Story?:** No - needs story (data integration story)

---

# ORPHANED COMPONENTS (44 total)

---

## [GAP-005]: BoxScoreView Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Post-game box score display

**Description:**
BoxScoreView component exists at `src/components/BoxScoreView.tsx` but is not imported or rendered anywhere in the app.

**Evidence:**
> "S-B009 | Create BoxScoreView Component | ✅ | ❌ | NOT WIRED (orphaned)"

**Resolution:**
Import and render BoxScoreView in PostGameScreen or as standalone route.

**Has Story?:** No - needs wiring story

---

## [GAP-006]: StandingsView Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Season standings display

**Description:**
StandingsView component exists at `src/components/StandingsView.tsx` but is not imported or rendered.

**Evidence:**
> "S-C001 | Create StandingsView Component | ✅ | ❌ | NOT WIRED (orphaned)"

**Resolution:**
Import and wire to SeasonDashboard or standalone route.

**Has Story?:** No - needs wiring story

---

## [GAP-007]: TeamStatsView Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Team statistics display

**Description:**
TeamStatsView component exists at `src/components/TeamStatsView.tsx` but is not imported.

**Evidence:**
> "S-C011 | Create TeamStatsView Component | ✅ | ❌ | NOT WIRED (orphaned)"

**Resolution:**
Wire to TeamPage or SeasonDashboard.

**Has Story?:** No - needs wiring story

---

## [GAP-008]: TeamFinancialsView Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Team financial overview, cap space display

**Description:**
TeamFinancialsView component exists at `src/components/TeamFinancialsView.tsx` but is not imported. Also blocked by GAP-001 (no player ratings).

**Evidence:**
> "S-C012 | Create TeamFinancialsView Component | ✅ | ❌ | NOT WIRED (orphaned)"

**Resolution:**
Wire to TeamPage or SeasonDashboard. Requires GAP-001 resolution first.

**Has Story?:** No - needs wiring story

---

## [GAP-009]: FanMoralePanel Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Fan mood visibility during games

**Description:**
FanMoralePanel component exists at `src/components/FanMoralePanel.tsx` but is not imported.

**Evidence:**
> "S-C013 | Create FanMoralePanel Component | ✅ | ❌ | NOT WIRED (orphaned)"

**Resolution:**
Wire to GameTracker sidebar or SeasonDashboard.

**Has Story?:** No - needs wiring story

---

## [GAP-010]: PlayoffBracket Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Playoff visualization

**Description:**
PlayoffBracket component exists at `src/components/PlayoffBracket.tsx` but is not imported.

**Evidence:**
> "S-C014 | Create PlayoffBracket Component | ✅ | ❌ | NOT WIRED (orphaned)"

**Resolution:**
Wire to SeasonDashboard when playoffs active.

**Has Story?:** No - needs wiring story

---

## [GAP-011]: ChampionshipCelebration Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Championship celebration sequence

**Description:**
ChampionshipCelebration component exists at `src/components/ChampionshipCelebration.tsx` but is not imported.

**Evidence:**
> "S-C015 | Create ChampionshipCelebration Component | ✅ | ❌ | NOT WIRED (orphaned)"

**Resolution:**
Wire to post-game flow when championship won.

**Has Story?:** No - needs wiring story

---

## [GAP-012]: SeasonProgressTracker Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Season milestone tracking display

**Description:**
SeasonProgressTracker component exists at `src/components/SeasonProgressTracker.tsx` but is not imported.

**Evidence:**
> "S-C008 | Create SeasonProgressTracker Component | ✅ | ❌ | NOT WIRED (orphaned)"

**Resolution:**
Wire to SeasonDashboard.

**Has Story?:** No - needs wiring story

---

## [GAP-013]: DoubleSwitchModal Orphaned + Logic Missing

**Source:** AUDIT_REPORT.md, CURRENT_STATE.md
**Type:** ORPHANED_CODE
**Severity:** MINOR
**Blocks:** NL-style double switch substitutions

**Description:**
DoubleSwitchModal component exists at `src/components/GameTracker/DoubleSwitchModal.tsx` but is not imported. Additionally, the state machine logic for double switch is not implemented.

**Evidence:**
> "S-B013 | Create DoubleSwitchModal Component | ✅ | ❌ | NOT WIRED (orphaned)"
> "S-B014 | Implement Double Switch Logic | ⚠️ | ❌ | PARTIAL - Modal only, no state logic"

**Resolution:**
1. Import and wire modal to substitution options
2. Implement double switch state machine logic

**Has Story?:** Partial - S-B014 exists but incomplete

---

## [GAP-014]: SalaryDisplay Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Salary display in PlayerCard, roster views

**Description:**
SalaryDisplay component exists at `src/components/GameTracker/SalaryDisplay.tsx` but is not imported. Also blocked by GAP-001.

**Evidence:**
> "src/components/GameTracker/SalaryDisplay.tsx" listed as orphaned

**Resolution:**
Wire to PlayerCard and RosterView. Requires GAP-001 resolution first.

**Has Story?:** No - needs wiring story

---

## [GAP-015]: RelationshipPanel Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Player relationships display

**Description:**
RelationshipPanel component exists at `src/components/RelationshipPanel.tsx` but is not imported. Also blocked by relationship engine not being called.

**Evidence:**
> "S-F004 | Create RelationshipPanel Component | ✅ | ❌ | NOT WIRED (orphaned)"

**Resolution:**
Wire to PlayerCard or roster view. Requires relationship engine integration.

**Has Story?:** No - needs wiring story

---

## [GAP-016]: AgingDisplay Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Player career phase visibility

**Description:**
AgingDisplay component exists at `src/components/AgingDisplay.tsx` but is not imported. Also blocked by aging engine not being called.

**Evidence:**
> "S-F007 | Create AgingDisplay Component | ✅ | ❌ | NOT WIRED (orphaned)"

**Resolution:**
Wire to PlayerCard. Requires aging engine integration.

**Has Story?:** No - needs wiring story

---

## [GAP-017]: ParkFactorDisplay Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** MINOR
**Blocks:** Park awareness display

**Description:**
ParkFactorDisplay component exists at `src/components/ParkFactorDisplay.tsx` but is not imported.

**Evidence:**
> "S-F008 | Create ParkFactorDisplay Component | ✅ | ❌ | NOT WIRED (orphaned)"

**Resolution:**
Wire to GameSetup or game context display.

**Has Story?:** No - needs wiring story

---

## [GAP-018]: LeagueNewsFeed Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** News/story display

**Description:**
LeagueNewsFeed component exists at `src/components/LeagueNewsFeed.tsx` but is not imported.

**Evidence:**
> "S-F012 | Create LeagueNewsFeed Component | ✅ | ❌ | NOT WIRED (orphaned)"

**Resolution:**
Wire to SeasonDashboard or MainMenu.

**Has Story?:** No - needs wiring story

---

## [GAP-019]: ChemistryDisplay Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Team chemistry visibility

**Description:**
ChemistryDisplay component exists at `src/components/ChemistryDisplay.tsx` but is not imported.

**Evidence:**
> "S-G008 | Create ChemistryDisplay Component | ✅ | ❌ | NOT WIRED (orphaned)"

**Resolution:**
Wire to roster view or team page.

**Has Story?:** No - needs wiring story

---

## [GAP-020]: ContractionWarning Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** MINOR
**Blocks:** Team contraction risk alerts

**Description:**
ContractionWarning component exists at `src/components/ContractionWarning.tsx` but is not imported.

**Evidence:**
> "S-G007 | Create ContractionWarning Component | ✅ | ❌ | NOT WIRED (orphaned)"

**Resolution:**
Wire to SeasonDashboard when risk detected.

**Has Story?:** No - needs wiring story

---

## [GAP-021]: LeagueBuilder Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Season/league creation flow

**Description:**
LeagueBuilder component exists at `src/components/LeagueBuilder.tsx` but is not imported.

**Evidence:**
> "src/components/LeagueBuilder.tsx" listed as orphaned

**Resolution:**
Wire to MainMenu "Start New Season" flow.

**Has Story?:** No - needs wiring story

---

## [GAP-022]: PlayerRatingsForm Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Player ratings input (part of GAP-001 chain)

**Description:**
PlayerRatingsForm component exists at `src/components/PlayerRatingsForm.tsx` but is not imported.

**Evidence:**
> "src/components/PlayerRatingsForm.tsx" listed as orphaned

**Resolution:**
Wire to player creation/edit flow. Part of GAP-001 solution.

**Has Story?:** Partial - S-A007 exists but not fully wired

---

## [GAP-023]: Museum Components Orphaned (4 files)

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** MINOR
**Blocks:** Museum sub-pages

**Description:**
Museum child components exist but are orphaned:
- `src/components/museum/FranchiseRecords.tsx`
- `src/components/museum/HallOfFameGallery.tsx`
- `src/components/museum/RetiredNumbersWall.tsx`
- `src/components/museum/ChampionshipBanners.tsx`

MuseumHub route exists but doesn't render these children.

**Evidence:**
> "S-G002-G005 | Museum components | ✅ | ❌ | NOT WIRED (orphaned)"

**Resolution:**
Wire to MuseumHub as sub-routes or tabs.

**Has Story?:** No - needs wiring stories

---

## [GAP-024]: Awards Components Orphaned (9 files)

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Awards ceremony sequence

**Description:**
Awards child components exist but are orphaned:
- `src/components/awards/MVPReveal.tsx`
- `src/components/awards/LeagueLeadersAward.tsx`
- `src/components/awards/AwardsSummary.tsx`
- `src/components/awards/AllStarScreen.tsx`
- `src/components/awards/TraitLotteryWheel.tsx`
- `src/components/awards/GoldGloveAwards.tsx`
- `src/components/awards/SilverSluggerAwards.tsx`
- `src/components/awards/ROYReveal.tsx`
- `src/components/awards/CyYoungReveal.tsx`

AwardsCeremonyHub route exists but doesn't render these children.

**Evidence:**
> "S-D003-D013 | Awards components | ✅ | ❌ | NOT WIRED"

**Resolution:**
Wire to AwardsCeremonyHub as ceremony sequence.

**Has Story?:** No - needs wiring stories

---

## [GAP-025]: Offseason Components Orphaned (6 files)

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Offseason flow completeness

**Description:**
Offseason child components exist but are orphaned:
- `src/components/offseason/ProtectedPlayerSelection.tsx`
- `src/components/offseason/ProspectList.tsx`
- `src/components/offseason/DraftOrderReveal.tsx`
- `src/components/offseason/TradeSalaryMatcher.tsx`
- `src/components/offseason/TradeProposalBuilder.tsx`
- `src/components/offseason/OffseasonProgressTracker.tsx`

OffseasonHub route exists but children not wired.

**Evidence:**
> "S-E003, E008, E011, E012, E014, E015 | Offseason components | ✅ | ❌ | NOT WIRED"

**Resolution:**
Wire to OffseasonHub and child routes.

**Has Story?:** No - needs wiring stories

---

# ORPHANED SERVICES (4 total)

---

## [GAP-026]: transactionStorage.ts Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Transaction history tracking, trade history

**Description:**
transactionStorage.ts (372 lines) exists at `src/utils/transactionStorage.ts` but is never imported anywhere.

**Evidence:**
> "src/utils/transactionStorage.ts (372 lines) - Never imported"

**Resolution:**
Wire to trade flow, free agency signing, roster moves.

**Has Story?:** No - needs wiring story

---

## [GAP-027]: fieldingStatsAggregator.ts Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Position-based fielding stats for Gold Glove awards

**Description:**
fieldingStatsAggregator.ts exists at `src/services/fieldingStatsAggregator.ts` but is never imported.

**Evidence:**
> "src/services/fieldingStatsAggregator.ts - Never imported"

**Resolution:**
Wire to awards calculations and PlayerCard fielding stats.

**Has Story?:** No - needs wiring story

---

## [GAP-028]: dataExportService.ts Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Box score export, stats export (user-requested feature)

**Description:**
dataExportService.ts exists at `src/services/dataExportService.ts` but is never imported.

**Evidence:**
> "src/services/dataExportService.ts - Never imported"

**Resolution:**
Wire to PostGameScreen and stats views with export buttons.

**Has Story?:** No - needs wiring story

---

## [GAP-029]: traitPools.ts Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** MINOR
**Blocks:** Trait lottery wheel configuration

**Description:**
traitPools.ts exists at `src/data/traitPools.ts` but is never imported.

**Evidence:**
> "src/data/traitPools.ts - Never imported"

**Resolution:**
Wire to TraitLotteryWheel component.

**Has Story?:** No - needs wiring story

---

## [GAP-030]: adaptiveLearningEngine.ts Completely Orphaned

**Source:** AUDIT_REPORT.md
**Type:** ORPHANED_CODE
**Severity:** IMPORTANT
**Blocks:** Fielding inference improvement over time

**Description:**
adaptiveLearningEngine.ts (294 lines) exists at `src/engines/adaptiveLearningEngine.ts` but has ZERO references anywhere in the codebase.

**Evidence:**
> "src/engines/adaptiveLearningEngine.ts (294 lines) - ZERO references anywhere"

**Resolution:**
Wire to fielding modal to track inference vs actual, update probabilities.

**Has Story?:** No - needs wiring story

---

# REMAINING BUGS (7 total)

---

## [GAP-031]: Exit Type Requires Double Entry (BUG-006)

**Source:** GAMETRACKER_BUGS.md
**Type:** BUG
**Severity:** IMPORTANT
**Blocks:** Smooth at-bat flow UX

**Description:**
App doesn't auto-proceed after user selects exit type. User must click exit type button to launch popup, then click it again inside the popup.

**Evidence:**
> "BUG-006: App doesn't auto-proceed after user selects exit type."

**Resolution:**
Review AtBatFlow.tsx - exit type selection should only happen once in the modal.

**Has Story?:** No - needs bug fix story

---

## [GAP-032]: Player Names Not Clickable (BUG-007)

**Source:** GAMETRACKER_BUGS.md
**Type:** BUG
**Severity:** IMPORTANT
**Blocks:** Quick player stat lookup during games

**Description:**
Player names in the game tracker (current batter, due up, etc.) are not clickable to open PlayerCard.

**Evidence:**
> "BUG-007: Player names in the game tracker are not clickable."

**Resolution:**
Wrap player name displays with onClick handler to open PlayerCard modal.

**Has Story?:** No - needs bug fix story

---

## [GAP-033]: Team Names Not Shown in Scoreboard (BUG-008)

**Source:** GAMETRACKER_BUGS.md
**Type:** BUG
**Severity:** IMPORTANT
**Blocks:** Game context identification

**Description:**
Team names are not populated in scoreboard in GameTracker.

**Evidence:**
> "BUG-008: Team names are not populated in scoreboard."

**Resolution:**
Pass team names to Scoreboard component and display them.

**Has Story?:** No - needs bug fix story

---

## [GAP-034]: No Lineup Access in GameTracker (BUG-009)

**Source:** GAMETRACKER_BUGS.md
**Type:** BUG
**Severity:** IMPORTANT
**Blocks:** Viewing/updating mojo and fitness mid-game

**Description:**
There's no way to access lineups in GameTracker to view or update player mojo/fitness.

**Evidence:**
> "BUG-009: There's no way to access lineups in GameTracker."

**Resolution:**
Add lineup view modal/panel with mojo/fitness indicators.

**Has Story?:** No - needs bug fix story

---

## [GAP-035]: HR Distance Allows Invalid Values (BUG-011)

**Source:** GAMETRACKER_BUGS.md
**Type:** BUG
**Severity:** MINOR
**Blocks:** Realistic HR distance tracking

**Description:**
It's possible to enter a HR distance that's less than wall distance (e.g., 200 feet).

**Evidence:**
> "BUG-011: It's possible to enter a HR distance less than wall distance."

**Resolution:**
Add min/max validation for HR distance (minimum 250-300 ft depending on direction).

**Has Story?:** No - needs bug fix story

---

## [GAP-036]: No Stadium Association (BUG-012)

**Source:** GAMETRACKER_BUGS.md
**Type:** BUG
**Severity:** MINOR
**Blocks:** Park factors, HR distance validation

**Description:**
There is no stadium associated with GameTracker games.

**Evidence:**
> "BUG-012: There is no stadium associated with GameTracker games."

**Resolution:**
Add stadium selection to game setup, enable park factor tracking.

**Has Story?:** No - needs bug fix story

---

## [GAP-037]: Special Plays Not Logged (BUG-014)

**Source:** GAMETRACKER_BUGS.md
**Type:** BUG
**Severity:** MINOR
**Blocks:** Special play visibility, Fame events

**Description:**
Selecting special plays (Diving, Robbery Attempt, etc.) doesn't get logged in activity log, fame events, or anywhere visible.

**Evidence:**
> "BUG-014: Selecting special plays doesn't get logged."

**Resolution:**
Include special play in activity log message, connect to fame detection.

**Has Story?:** No - needs bug fix story

---

# MISSING FEATURES (17 total)

---

## [GAP-038]: Spring Training Phase Missing

**Source:** COHESION_REPORT.md
**Type:** MISSING_FEATURE
**Severity:** IMPORTANT
**Blocks:** Complete offseason flow

**Description:**
Offseason has 11 phases but Spring Training (phase 9) has no story or implementation.

**Evidence:**
> "GAP-J006: Spring Training phase has no story"

**Resolution:**
Create Spring Training screen with player development preview.

**Has Story?:** Yes - NEW-002 in COHESION_REPORT.md (needs implementation)

---

## [GAP-039]: Schedule Generation Phase Missing

**Source:** COHESION_REPORT.md
**Type:** MISSING_FEATURE
**Severity:** IMPORTANT
**Blocks:** New season start after offseason

**Description:**
Offseason has 11 phases but Schedule Generation (phase 10) has no story or implementation.

**Evidence:**
> "GAP-J007: Schedule Generation phase has no story"

**Resolution:**
Create Schedule Generation screen with season length options.

**Has Story?:** Yes - NEW-003 in COHESION_REPORT.md (needs implementation)

---

## [GAP-040]: Farm System UI Missing

**Source:** COHESION_REPORT.md, FEATURE_WISHLIST.md
**Type:** MISSING_FEATURE
**Severity:** IMPORTANT
**Blocks:** Prospect management, roster depth

**Description:**
FARM_SYSTEM_SPEC.md exists but there are ZERO UI stories for farm system. Users cannot view farm roster, promote prospects, or demote players.

**Evidence:**
> "GAP-UI008: User cannot manage farm system players"
> "GAP-UI009: User cannot promote prospects to active roster"
> "GAP-UI010: User cannot demote players to minors"
> "GAP-UI011: User cannot call up players mid-season"

**Resolution:**
Create Farm tab in RosterView, add promote/demote/callup flows.

**Has Story?:** Yes - NEW-004, NEW-005 in COHESION_REPORT.md (needs implementation)

---

## [GAP-041]: Relationship Engine Not Called

**Source:** AUDIT_REPORT.md, FEATURE_WISHLIST.md
**Type:** MISSING_FEATURE
**Severity:** IMPORTANT
**Blocks:** Player relationship morale effects, trade warnings

**Description:**
relationshipEngine.ts exists but is marked as PARTIAL - engine exists but is never called anywhere.

**Evidence:**
> "S-F001 | Create RelationshipEngine Module | ✅ | ⚠️ | PARTIAL - Engine exists, not called"
> "Relationships/Chemistry: 24 gaps (entire system missing)" - FEATURE_WISHLIST.md

**Resolution:**
Wire relationship engine to game events, trade flow, morale calculations.

**Has Story?:** No - needs wiring story

---

## [GAP-042]: Aging Engine Not Called

**Source:** AUDIT_REPORT.md
**Type:** MISSING_FEATURE
**Severity:** IMPORTANT
**Blocks:** Player development, retirement probability

**Description:**
agingEngine.ts exists but is marked as PARTIAL - engine exists but is never called anywhere.

**Evidence:**
> "S-F005 | Create AgingEngine Module | ✅ | ⚠️ | PARTIAL - Engine exists, not called"

**Resolution:**
Wire aging engine to season end processing, offseason flow.

**Has Story?:** No - needs wiring story

---

## [GAP-043]: All-Star Break Timing Unclear

**Source:** COHESION_REPORT.md
**Type:** MISSING_FEATURE
**Severity:** MINOR
**Blocks:** All-Star break flow

**Description:**
AllStarScreen and TraitLotteryWheel exist but trigger timing is unclear - when exactly does All-Star break occur?

**Evidence:**
> "GAP-J005: All-Star break timing unclear"

**Resolution:**
Define midseason trigger point (50% of games), wire to season flow.

**Has Story?:** No - needs story

---

## [GAP-044]: HOF Eligibility Check Partial

**Source:** AUDIT_REPORT.md
**Type:** MISSING_FEATURE
**Severity:** MINOR
**Blocks:** Hall of Fame inductions

**Description:**
HOF eligibility check is only partially implemented in franchiseStorage.

**Evidence:**
> "S-E006 | Check HOF Eligibility | ⚠️ | ❌ | PARTIAL - Logic partial in franchiseStorage"

**Resolution:**
Complete HOF eligibility logic, wire to retirement flow.

**Has Story?:** No - needs story

---

## [GAP-045]: mWAR Calculator Missing Integration

**Source:** FEATURE_WISHLIST.md
**Type:** MISSING_FEATURE
**Severity:** IMPORTANT
**Blocks:** Complete WAR picture for managers

**Description:**
mWAR Calculator engine exists (implemented Day 3) but per FEATURE_WISHLIST.md it was originally listed as missing. Verify full integration.

**Evidence:**
> "mWAR Calculator: Complete manager WAR system with decision tracking - **MISSING**"
> But CURRENT_STATE.md shows: "mWAR Calculator | ✅ Complete"

**Resolution:**
Verify mWAR is fully wired. If not, complete integration.

**Has Story?:** Needs verification

---

## [GAP-046]: Beat Reporter → Fan Morale Integration Missing

**Source:** FEATURE_WISHLIST.md
**Type:** MISSING_FEATURE
**Severity:** IMPORTANT
**Blocks:** Reporter stories affecting fan morale

**Description:**
Reporter stories should directly influence fan morale but the integration point is missing.

**Evidence:**
> "Beat Reporter → Fan Morale Integration: calculateStoryMoraleImpact exists but no integration point"

**Resolution:**
Wire narrative engine story output to fan morale engine.

**Has Story?:** No - needs story

---

## [GAP-047]: Expected WAR from Salary Missing

**Source:** FEATURE_WISHLIST.md
**Type:** MISSING_FEATURE
**Severity:** MINOR
**Blocks:** True Value calculation

**Description:**
getExpectedWARFromSalary() function is missing, needed for True Value assessment.

**Evidence:**
> "Expected WAR from Salary: getExpectedWARFromSalary() for True Value - **MISSING**"

**Resolution:**
Implement in salaryCalculator.ts.

**Has Story?:** No - needs story

---

## [GAP-048]: Spray Chart Data Collection Partial

**Source:** FEATURE_WISHLIST.md
**Type:** MISSING_FEATURE
**Severity:** MINOR
**Blocks:** Future spray chart visualization

**Description:**
Direction tracking exists but depth tracking is missing, and data doesn't persist.

**Evidence:**
> "Spray Chart Data Collection: Direction + depth tracking - **PARTIAL** - No depth, no persistence"

**Resolution:**
Add depth tracking to fielding modal, ensure persistence.

**Has Story?:** No - needs story

---

## [GAP-049]: Mental Error Type Missing from UI

**Source:** FEATURE_WISHLIST.md
**Type:** MISSING_FEATURE
**Severity:** MINOR
**Blocks:** Highest penalty error tracking

**Description:**
Mental error type with -0.25 fWAR penalty is defined in spec but missing from UI.

**Evidence:**
> "Mental Error Type: 'mental' error with -0.25 fWAR penalty - **MISSING** from UI"

**Resolution:**
Add mental error option to FieldingModal.

**Has Story?:** No - needs story

---

# STATE GAPS (5 total)

---

## [GAP-050]: Offseason Phase Enforcement Missing

**Source:** AUDIT_REPORT.md
**Type:** STATE_GAP
**Severity:** IMPORTANT
**Blocks:** Structured offseason flow

**Description:**
OffseasonHub UI exists but phase order is not enforced - users can skip phases.

**Evidence:**
> "S-E002 | Enforce Phase Order | ⚠️ | ❌ | PARTIAL - UI exists, no enforcement"

**Resolution:**
Add phase state tracking, lock future phases until current complete.

**Has Story?:** No - needs story

---

## [GAP-051]: Farm System Roster State Not Tracked

**Source:** COHESION_REPORT.md
**Type:** STATE_GAP
**Severity:** IMPORTANT
**Blocks:** Farm system functionality

**Description:**
Farm system roster state is not tracked anywhere.

**Evidence:**
> "GAP-ST004: Farm system roster state not tracked"

**Resolution:**
Add farm roster storage, track minor league players separately.

**Has Story?:** No - needs story

---

## [GAP-052]: Trade Proposal Pending State Unclear

**Source:** COHESION_REPORT.md
**Type:** STATE_GAP
**Severity:** MINOR
**Blocks:** Trade flow UX

**Description:**
Trade proposal pending state is unclear - no defined states for trade lifecycle.

**Evidence:**
> "GAP-ST005: Trade proposal pending state unclear"

**Resolution:**
Define trade states (PROPOSED, PENDING, ACCEPTED, REJECTED).

**Has Story?:** No - needs story

---

## [GAP-053]: Skip to Awards Summary Logic Missing

**Source:** AUDIT_REPORT.md
**Type:** STATE_GAP
**Severity:** MINOR
**Blocks:** Awards ceremony skip feature

**Description:**
AwardsCeremonyHub has skip button but no logic to actually skip to summary.

**Evidence:**
> "S-D002 | Add Skip to Summary Option | ✅ | ⚠️ | PARTIAL - Button exists, no logic"

**Resolution:**
Implement skip logic to bypass individual award ceremonies.

**Has Story?:** No - needs story

---

# TODO COMMENTS IN CODE (11 total)

---

## [GAP-054]: PreGameScreen Season Storage TODO

**Source:** AUDIT_REPORT.md
**Type:** TODO
**Severity:** IMPORTANT
**Blocks:** PreGame data loading

**Description:**
PreGameScreen has TODO comment for wiring to actual season storage.

**Evidence:**
> "src/pages/PreGameScreen.tsx - TODO: Wire to actual season storage"

**Resolution:**
Wire season data loading to PreGameScreen.

**Has Story?:** No - needs story

---

## [GAP-055]: useFanMorale Full Integration TODO

**Source:** AUDIT_REPORT.md
**Type:** TODO
**Severity:** IMPORTANT
**Blocks:** Fan morale functionality

**Description:**
useFanMorale hook has TODO for full integration.

**Evidence:**
> "src/hooks/useFanMorale.ts - Full integration...is TODO"

**Resolution:**
Complete fan morale hook integration.

**Has Story?:** No - needs story

---

## [GAP-056]: useDataIntegrity Season Aggregation TODOs (2)

**Source:** AUDIT_REPORT.md
**Type:** TODO
**Severity:** IMPORTANT
**Blocks:** Data integrity recovery

**Description:**
useDataIntegrity has 2 TODOs for calling actual season aggregation.

**Evidence:**
> "src/hooks/useDataIntegrity.ts - 2x TODO: Call actual season aggregation"

**Resolution:**
Wire season aggregation calls in data integrity hook.

**Has Story?:** No - needs story

---

## [GAP-057]: careerStorage Milestone Detection TODO

**Source:** AUDIT_REPORT.md
**Type:** TODO
**Severity:** IMPORTANT
**Blocks:** Career milestone detection

**Description:**
careerStorage has TODO for implementing milestone detection.

**Evidence:**
> "src/utils/careerStorage.ts - TODO: Implement milestone detection"

**Resolution:**
Implement career milestone detection logic.

**Has Story?:** No - needs story

---

## [GAP-058]: milestoneAggregator Roster Lookup TODOs (2)

**Source:** AUDIT_REPORT.md
**Type:** TODO
**Severity:** MINOR
**Blocks:** Roster-based milestone context

**Description:**
milestoneAggregator has 2 TODOs for roster lookups.

**Evidence:**
> "src/utils/milestoneAggregator.ts - 2x TODO for roster lookups"

**Resolution:**
Add roster lookup integration.

**Has Story?:** No - needs story

---

## [GAP-059]: franchiseStorage Seasons Calculation TODO

**Source:** AUDIT_REPORT.md
**Type:** TODO
**Severity:** MINOR
**Blocks:** Career seasons tracking

**Description:**
franchiseStorage has TODO for calculating actual seasons.

**Evidence:**
> "src/utils/franchiseStorage.ts - TODO: Calculate actual seasons"

**Resolution:**
Implement seasons calculation logic.

**Has Story?:** No - needs story

---

## [GAP-060]: narrativeEngine Claude API TODOs (2)

**Source:** AUDIT_REPORT.md
**Type:** TODO
**Severity:** MINOR
**Blocks:** AI-generated narratives

**Description:**
narrativeEngine has 2 TODOs for implementing Claude API calls.

**Evidence:**
> "src/engines/narrativeEngine.ts - 2x TODO: Implement Claude API call"

**Resolution:**
Implement Claude API integration (or mark as intentionally placeholder).

**Has Story?:** No - needs story

---

## [GAP-061]: GameTracker Fitness Tracking TODO

**Source:** AUDIT_REPORT.md
**Type:** TODO
**Severity:** IMPORTANT
**Blocks:** Player fitness tracking during games

**Description:**
GameTracker has TODO for wiring to actual fitness tracking.

**Evidence:**
> "src/components/GameTracker/index.tsx - TODO: Wire to actual fitness tracking"

**Resolution:**
Wire fitness engine to GameTracker state.

**Has Story?:** No - needs story

---

# EDGE CASE GAPS (10 total)

---

## [GAP-062]: No Empty State Designs

**Source:** COHESION_REPORT.md
**Type:** EDGE_CASE
**Severity:** MINOR
**Blocks:** Clean UX for new users

**Description:**
No empty state designs for "no games played" scenario.

**Evidence:**
> "GAP-EC001: No empty state for 'no games played'"

**Resolution:**
Add empty state designs to key components.

**Has Story?:** No - needs story

---

## [GAP-063]: No Aggregation Error Handling

**Source:** COHESION_REPORT.md
**Type:** EDGE_CASE
**Severity:** MINOR
**Blocks:** Error recovery during stat aggregation

**Description:**
No error state handling for stat aggregation failures.

**Evidence:**
> "GAP-EC002: No error state for aggregation failures"

**Resolution:**
Add error boundaries and retry logic.

**Has Story?:** No - needs story

---

## [GAP-064]: No First-Use Tutorial/Onboarding

**Source:** COHESION_REPORT.md
**Type:** EDGE_CASE
**Severity:** MINOR
**Blocks:** New user experience

**Description:**
No onboarding flow or tutorial for new users.

**Evidence:**
> "GAP-EC003: No first-use tutorial/onboarding"

**Resolution:**
Create onboarding flow (future enhancement).

**Has Story?:** No - needs story

---

## [GAP-065]: No IndexedDB Corruption Recovery

**Source:** COHESION_REPORT.md
**Type:** EDGE_CASE
**Severity:** IMPORTANT
**Blocks:** Data safety

**Description:**
No state recovery if IndexedDB becomes corrupted.

**Evidence:**
> "GAP-EC005: No state recovery if IndexedDB corrupted"

**Resolution:**
Add backup/restore mechanism.

**Has Story?:** No - needs story

---

## [GAP-066]: TeamPage is Stub Only

**Source:** AUDIT_REPORT.md
**Type:** EDGE_CASE
**Severity:** MINOR
**Blocks:** Team detail page

**Description:**
TeamPage.tsx returns placeholder text only, not a functional page.

**Evidence:**
> "src/pages/TeamPage.tsx - Returns placeholder text only"

**Resolution:**
Implement TeamPage with team details.

**Has Story?:** No - needs story

---

---

# SUMMARY BY TYPE

## Gaps Needing New Stories

| Gap ID | Title | Type | Severity | Blocks |
|--------|-------|------|----------|--------|
| GAP-003 | Custom Roster Disconnected | DATA_GAP | CRITICAL | Using custom players |
| GAP-004 | Components Render Empty | DATA_GAP | CRITICAL | All Phase B-G components |
| GAP-005 | BoxScoreView Orphaned | ORPHANED_CODE | IMPORTANT | Post-game box score |
| GAP-006 | StandingsView Orphaned | ORPHANED_CODE | IMPORTANT | Season standings |
| GAP-007 | TeamStatsView Orphaned | ORPHANED_CODE | IMPORTANT | Team statistics |
| GAP-008 | TeamFinancialsView Orphaned | ORPHANED_CODE | IMPORTANT | Team financials |
| GAP-009 | FanMoralePanel Orphaned | ORPHANED_CODE | IMPORTANT | Fan mood visibility |
| GAP-010 | PlayoffBracket Orphaned | ORPHANED_CODE | IMPORTANT | Playoff visualization |
| GAP-011 | ChampionshipCelebration Orphaned | ORPHANED_CODE | IMPORTANT | Championship celebration |
| GAP-012 | SeasonProgressTracker Orphaned | ORPHANED_CODE | IMPORTANT | Season progress |
| GAP-014 | SalaryDisplay Orphaned | ORPHANED_CODE | IMPORTANT | Salary display |
| GAP-015 | RelationshipPanel Orphaned | ORPHANED_CODE | IMPORTANT | Player relationships |
| GAP-016 | AgingDisplay Orphaned | ORPHANED_CODE | IMPORTANT | Career phase display |
| GAP-017 | ParkFactorDisplay Orphaned | ORPHANED_CODE | MINOR | Park awareness |
| GAP-018 | LeagueNewsFeed Orphaned | ORPHANED_CODE | IMPORTANT | News display |
| GAP-019 | ChemistryDisplay Orphaned | ORPHANED_CODE | IMPORTANT | Team chemistry |
| GAP-020 | ContractionWarning Orphaned | ORPHANED_CODE | MINOR | Contraction risk |
| GAP-021 | LeagueBuilder Orphaned | ORPHANED_CODE | IMPORTANT | Season creation |
| GAP-022 | PlayerRatingsForm Orphaned | ORPHANED_CODE | IMPORTANT | Ratings input |
| GAP-023 | Museum Components Orphaned | ORPHANED_CODE | MINOR | Museum sub-pages |
| GAP-024 | Awards Components Orphaned | ORPHANED_CODE | IMPORTANT | Awards ceremony |
| GAP-025 | Offseason Components Orphaned | ORPHANED_CODE | IMPORTANT | Offseason flow |
| GAP-026 | transactionStorage Orphaned | ORPHANED_CODE | IMPORTANT | Transaction history |
| GAP-027 | fieldingStatsAggregator Orphaned | ORPHANED_CODE | IMPORTANT | Fielding stats |
| GAP-028 | dataExportService Orphaned | ORPHANED_CODE | IMPORTANT | Data export |
| GAP-029 | traitPools Orphaned | ORPHANED_CODE | MINOR | Trait lottery |
| GAP-030 | adaptiveLearningEngine Orphaned | ORPHANED_CODE | IMPORTANT | Fielding learning |
| GAP-031 | Exit Type Double Entry | BUG | IMPORTANT | At-bat flow UX |
| GAP-032 | Player Names Not Clickable | BUG | IMPORTANT | Quick stat lookup |
| GAP-033 | Team Names Not in Scoreboard | BUG | IMPORTANT | Game context |
| GAP-034 | No Lineup Access | BUG | IMPORTANT | Mojo/fitness updates |
| GAP-035 | HR Distance Invalid Values | BUG | MINOR | HR distance tracking |
| GAP-036 | No Stadium Association | BUG | MINOR | Park factors |
| GAP-037 | Special Plays Not Logged | BUG | MINOR | Fame events |
| GAP-041 | Relationship Engine Not Called | MISSING_FEATURE | IMPORTANT | Relationship morale |
| GAP-042 | Aging Engine Not Called | MISSING_FEATURE | IMPORTANT | Player development |
| GAP-043 | All-Star Break Timing | MISSING_FEATURE | MINOR | All-Star flow |
| GAP-044 | HOF Eligibility Partial | MISSING_FEATURE | MINOR | HOF inductions |
| GAP-046 | Beat Reporter Morale Integration | MISSING_FEATURE | IMPORTANT | Reporter → morale |
| GAP-047 | Expected WAR from Salary | MISSING_FEATURE | MINOR | True Value |
| GAP-048 | Spray Chart Data Partial | MISSING_FEATURE | MINOR | Spray charts |
| GAP-049 | Mental Error Type Missing | MISSING_FEATURE | MINOR | Error tracking |
| GAP-050 | Offseason Phase Enforcement | STATE_GAP | IMPORTANT | Structured flow |
| GAP-051 | Farm System State Missing | STATE_GAP | IMPORTANT | Farm system |
| GAP-052 | Trade State Unclear | STATE_GAP | MINOR | Trade flow |
| GAP-053 | Skip to Summary Logic | STATE_GAP | MINOR | Awards skip |
| GAP-054-061 | TODOs in Code | TODO | Various | Various |
| GAP-062-066 | Edge Cases | EDGE_CASE | Various | Various |

## Gaps WITH Existing Stories

| Gap ID | Title | Story ID | Status |
|--------|-------|----------|--------|
| GAP-001 | Player Ratings Missing | NEW-006 (COHESION) | Needs Implementation |
| GAP-002 | FA Signing Missing | NEW-001 (COHESION) | Needs Implementation |
| GAP-013 | Double Switch Partial | S-B014 | Partial Implementation |
| GAP-038 | Spring Training Missing | NEW-002 (COHESION) | Needs Implementation |
| GAP-039 | Schedule Gen Missing | NEW-003 (COHESION) | Needs Implementation |
| GAP-040 | Farm System UI Missing | NEW-004, NEW-005 (COHESION) | Needs Implementation |

---

*Document generated January 26, 2026*
*Total gaps identified: 66 unique gaps*
