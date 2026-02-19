# KBL Tracker - Wiring Stories for Orphaned Components

> **Generated**: January 26, 2026
> **Purpose**: Quick-win stories to wire existing orphaned components into the app
> **Format**: Ralph Framework
> **Note**: These components already exist - just need import and render

---

## Story Index

| Story ID | Closes Gap | Component | Location | Priority | Size | Status |
|----------|------------|-----------|----------|----------|------|--------|
| WIRE-001 | GAP-005 | BoxScoreView | PostGameScreen | P1 | Small | ✅ Done (prior) |
| WIRE-002 | GAP-006 | StandingsView | SeasonDashboard | P1 | Small | ✅ Done |
| WIRE-003 | GAP-007 | TeamStatsView | TeamPage | P1 | Small | ✅ Done |
| WIRE-004 | GAP-009 | FanMoralePanel | GameTracker | P1 | Small | ✅ Done |
| WIRE-005 | GAP-010 | PlayoffBracket | SeasonDashboard | P2 | Small | ✅ Done |
| WIRE-006 | GAP-011 | ChampionshipCelebration | PostGameScreen | P2 | Small | ✅ Done |
| WIRE-007 | GAP-012 | SeasonProgressTracker | SeasonDashboard | P1 | Small | ✅ Done |
| WIRE-008 | GAP-014 | SalaryDisplay | PlayerCard | P1 | Small | ✅ Done |
| WIRE-009 | GAP-015 | RelationshipPanel | PlayerCard | P2 | Small | ✅ Done |
| WIRE-010 | GAP-016 | AgingDisplay | PlayerCard | P2 | Small | ✅ Done |
| WIRE-011 | GAP-018 | LeagueNewsFeed | SeasonDashboard | P1 | Small | ✅ Done |
| WIRE-012 | GAP-019 | ChemistryDisplay | RosterView | P2 | Small | ✅ Done |
| WIRE-013 | GAP-020 | ContractionWarning | SeasonDashboard | P2 | Small | ✅ Done |
| WIRE-014 | GAP-021 | LeagueBuilder | MainMenu | P0 | Medium | ✅ Done |
| WIRE-015 | GAP-022 | PlayerRatingsForm | ManualPlayerInput | P0 | Small | ✅ Done (prior) |
| WIRE-016 | GAP-023 | Museum Components | MuseumHub | P2 | Medium | ✅ Done |
| WIRE-017 | GAP-024 | Awards Components | AwardsCeremonyHub | P1 | Medium | ✅ Done |
| WIRE-018 | GAP-025 | Offseason Components | OffseasonHub | P1 | Medium | ✅ Done |
| WIRE-019 | GAP-026 | transactionStorage | FreeAgencyHub, TradeHub | P1 | Small | ✅ Done |
| WIRE-020 | GAP-027 | fieldingStatsAggregator | AwardsHub | P1 | Small | ✅ Done |
| WIRE-021 | GAP-028 | dataExportService | PostGameScreen | P1 | Small | ✅ Done |
| WIRE-022 | GAP-029 | traitPools | TraitLotteryWheel | P2 | Small | ✅ Done |
| WIRE-023 | GAP-030 | adaptiveLearningEngine | FieldingModal | P1 | Medium | ✅ Done |

---

# CRITICAL WIRING (P0)

---

## [WIRE-014]: Wire LeagueBuilder

**Closes Gap:** GAP-021
**Component:** `src/components/LeagueBuilder.tsx`
**Priority:** P0
**Estimated Size:** Medium

**As a** user starting the app
**I want to** create a new league/season
**So that** I can begin playing games

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Component Imported**
- **Given:** MainMenu rendered
- **When:** User clicks "Start New Season"
- **Then:** LeagueBuilder component renders
- **Verify:** Click "Start New Season", see LeagueBuilder

**AC-2: Component Receives Data**
- **Given:** LeagueBuilder rendered
- **When:** User views component
- **Then:** Team selection and season length options available
- **Verify:** Find team checkboxes and season dropdown

**AC-3: Component Creates League**
- **Given:** User configures league
- **When:** User clicks "Create League"
- **Then:** League created in storage, user redirected to SeasonDashboard
- **Verify:** Create league, see SeasonDashboard with schedule

### Technical Notes
- Import in App.tsx for route `/league-builder`
- Add navigation from MainMenu "Start New Season" button
- Wire to seasonStorage for league creation

---

## [WIRE-015]: Wire PlayerRatingsForm

**Closes Gap:** GAP-022
**Component:** `src/components/PlayerRatingsForm.tsx`
**Priority:** P0
**Estimated Size:** Small

**As a** user creating a player
**I want to** input player ratings
**So that** salary can be calculated

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Component Imported**
- **Given:** ManualPlayerInput rendered
- **When:** User creating player
- **Then:** PlayerRatingsForm section visible
- **Verify:** Open add-player, find ratings inputs

**AC-2: Component Receives Props**
- **Given:** PlayerRatingsForm rendered
- **When:** Form inspected
- **Then:** All rating fields present (power, contact, speed, fielding, arm, velocity, junk, accuracy)
- **Verify:** Find all 8 rating input fields

**AC-3: Ratings Flow to Salary**
- **Given:** User enters ratings
- **When:** Ratings change
- **Then:** Salary auto-calculates using salaryCalculator
- **Verify:** Change rating, see salary update

### Technical Notes
- Import in ManualPlayerInput.tsx
- Wire onChange to salaryCalculator.ts
- Display calculated salary

---

# IMPORTANT WIRING (P1)

---

## [WIRE-001]: Wire BoxScoreView

**Closes Gap:** GAP-005
**Component:** `src/components/BoxScoreView.tsx`
**Priority:** P1
**Estimated Size:** Small

**As a** user after a game
**I want to** view the box score
**So that** I can see detailed game stats

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Component Imported**
- **Given:** PostGameScreen rendered
- **When:** User clicks "View Box Score"
- **Then:** BoxScoreView renders
- **Verify:** Find and click box score button, see component

**AC-2: Component Receives Data**
- **Given:** BoxScoreView rendered
- **When:** Game data available
- **Then:** Displays batting stats, pitching stats per team
- **Verify:** See actual player stats from completed game

**AC-3: Component Interactive**
- **Given:** BoxScoreView rendered
- **When:** User clicks player name
- **Then:** PlayerCard opens with full stats
- **Verify:** Click player in box score, see PlayerCard

### Technical Notes
- Import in PostGameScreen.tsx
- Pass game stats from completed game
- Add "View Box Score" button to PostGameScreen

---

## [WIRE-002]: Wire StandingsView

**Closes Gap:** GAP-006
**Component:** `src/components/StandingsView.tsx`
**Priority:** P1
**Estimated Size:** Small

**As a** user during the season
**I want to** view league standings
**So that** I know my team's position

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Component Imported**
- **Given:** SeasonDashboard rendered
- **When:** User clicks "Standings" or views standings section
- **Then:** StandingsView renders
- **Verify:** Navigate to standings, see component

**AC-2: Component Receives Data**
- **Given:** StandingsView rendered
- **When:** Season data available
- **Then:** Shows all teams with W-L record, PCT, GB
- **Verify:** See actual standings data

**AC-3: Component Updates**
- **Given:** Game completed
- **When:** Standings refreshed
- **Then:** Standings reflect latest results
- **Verify:** Complete game, see standings update

### Technical Notes
- Import in SeasonDashboard.tsx
- Create `/standings` route or embed in dashboard
- Pass standings from seasonStorage

---

## [WIRE-003]: Wire TeamStatsView

**Closes Gap:** GAP-007
**Component:** `src/components/TeamStatsView.tsx`
**Priority:** P1
**Estimated Size:** Small

**As a** user
**I want to** view team statistics
**So that** I can analyze team performance

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Component Imported**
- **Given:** TeamPage rendered
- **When:** User views team
- **Then:** TeamStatsView renders as section
- **Verify:** Navigate to team, see stats section

**AC-2: Component Receives Data**
- **Given:** TeamStatsView rendered
- **When:** Team data available
- **Then:** Shows team batting avg, ERA, runs scored/allowed
- **Verify:** See actual team stats

**AC-3: Component Has Tabs**
- **Given:** TeamStatsView rendered
- **When:** User clicks tabs
- **Then:** Batting/Pitching/Fielding views available
- **Verify:** Click tabs, content changes

### Technical Notes
- Import in TeamPage.tsx
- Pass team stats from seasonStorage
- Complete TeamPage.tsx stub (GAP-066)

---

## [WIRE-004]: Wire FanMoralePanel

**Closes Gap:** GAP-009
**Component:** `src/components/FanMoralePanel.tsx`
**Priority:** P1
**Estimated Size:** Small

**As a** user during a game
**I want to** see fan morale
**So that** I understand fan sentiment

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Component Imported**
- **Given:** GameTracker or SeasonDashboard rendered
- **When:** User views UI
- **Then:** FanMoralePanel visible in sidebar/header
- **Verify:** Find fan morale indicator

**AC-2: Component Receives Data**
- **Given:** FanMoralePanel rendered
- **When:** Morale data available
- **Then:** Shows morale level with color coding
- **Verify:** See morale indicator with value

**AC-3: Component Updates Live**
- **Given:** Game in progress
- **When:** Morale-affecting event occurs
- **Then:** Panel updates to reflect change
- **Verify:** Win game, see morale improve

### Technical Notes
- Import in GameTracker sidebar
- Wire useFanMorale hook
- Show in SeasonDashboard header

---

## [WIRE-007]: Wire SeasonProgressTracker

**Closes Gap:** GAP-012
**Component:** `src/components/SeasonProgressTracker.tsx`
**Priority:** P1
**Estimated Size:** Small

**As a** user during the season
**I want to** see season progress
**So that** I know how far along we are

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Component Imported**
- **Given:** SeasonDashboard rendered
- **When:** User views dashboard
- **Then:** SeasonProgressTracker visible
- **Verify:** Find progress tracker in dashboard

**AC-2: Component Receives Data**
- **Given:** SeasonProgressTracker rendered
- **When:** Season data available
- **Then:** Shows "Game X of Y" with progress bar
- **Verify:** See progress indicator with numbers

**AC-3: Component Shows Milestones**
- **Given:** SeasonProgressTracker rendered
- **When:** User views component
- **Then:** Key milestones marked (All-Star, playoffs)
- **Verify:** Find milestone markers on progress

### Technical Notes
- Import in SeasonDashboard.tsx
- Pass gamesPlayed, totalGames from season
- Mark milestones at appropriate points

---

## [WIRE-008]: Wire SalaryDisplay

**Closes Gap:** GAP-014
**Component:** `src/components/GameTracker/SalaryDisplay.tsx`
**Priority:** P1
**Estimated Size:** Small

**As a** user viewing a player
**I want to** see their salary
**So that** I understand their value

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Component Imported**
- **Given:** PlayerCard rendered
- **When:** User views player
- **Then:** SalaryDisplay shows in PlayerCard
- **Verify:** Open PlayerCard, find salary section

**AC-2: Component Receives Data**
- **Given:** SalaryDisplay rendered
- **When:** Player has ratings
- **Then:** Calculated salary displayed
- **Verify:** See salary value (requires GAP-001 fix)

**AC-3: Component Shows Breakdown**
- **Given:** SalaryDisplay rendered
- **When:** User expands details
- **Then:** Shows base + modifiers breakdown
- **Verify:** Find salary breakdown details

### Technical Notes
- Import in PlayerCard.tsx
- Wire salaryCalculator.ts
- Requires player ratings (WIRE-015, NEW-006)

---

## [WIRE-011]: Wire LeagueNewsFeed

**Closes Gap:** GAP-018
**Component:** `src/components/LeagueNewsFeed.tsx`
**Priority:** P1
**Estimated Size:** Small

**As a** user
**I want to** see league news
**So that** I stay informed about events

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Component Imported**
- **Given:** SeasonDashboard or MainMenu rendered
- **When:** User views UI
- **Then:** LeagueNewsFeed visible
- **Verify:** Find news feed section

**AC-2: Component Receives Data**
- **Given:** LeagueNewsFeed rendered
- **When:** News exists
- **Then:** Shows recent stories with headlines
- **Verify:** See news items with content

**AC-3: Component Shows Story Types**
- **Given:** News feed with items
- **When:** User views items
- **Then:** Different story types styled differently
- **Verify:** Trade news, game recaps visually distinct

### Technical Notes
- Import in SeasonDashboard.tsx
- Wire narrativeEngine for stories
- Add story storage for persistence

---

## [WIRE-017]: Wire Awards Components

**Closes Gap:** GAP-024
**Components:** 9 award components in `src/components/awards/`
**Priority:** P1
**Estimated Size:** Medium

**As a** user in awards ceremony
**I want to** see award presentations
**So that** I can celebrate achievements

### Size Check
- [ ] < 200 lines of code (Medium - multiple components)
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Components Imported**
- **Given:** AwardsCeremonyHub rendered
- **When:** User progresses through ceremony
- **Then:** Individual award components render in sequence
- **Verify:** Navigate awards, see MVP, Cy Young, etc.

**AC-2: Components Receive Data**
- **Given:** Award component rendered
- **When:** Season stats available
- **Then:** Winner displayed with relevant stats
- **Verify:** See actual player as MVP with WAR

**AC-3: Sequence Navigation**
- **Given:** Awards ceremony active
- **When:** User clicks "Next"
- **Then:** Next award component renders
- **Verify:** Progress through all 9 awards

### Technical Notes
- Import all 9 components in AwardsCeremonyHub
- Create ceremony state machine for sequencing
- Pass winner data from season stats

---

## [WIRE-018]: Wire Offseason Components

**Closes Gap:** GAP-025
**Components:** 6 offseason components in `src/components/offseason/`
**Priority:** P1
**Estimated Size:** Medium

**As a** user in offseason
**I want to** access all offseason features
**So that** I can manage my team

### Size Check
- [ ] < 200 lines of code (Medium - multiple components)
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Components Imported**
- **Given:** OffseasonHub rendered
- **When:** User navigates to phase
- **Then:** Appropriate component renders
- **Verify:** Click each phase, see component

**AC-2: ProgressTracker Visible**
- **Given:** OffseasonHub rendered
- **When:** User views hub
- **Then:** OffseasonProgressTracker shows all phases
- **Verify:** Find progress tracker with 11 phases

**AC-3: Child Components Functional**
- **Given:** Offseason component rendered
- **When:** User interacts
- **Then:** Features work (protect players, draft, trade)
- **Verify:** Complete actions in each component

### Technical Notes
- Import all 6 components
- Create sub-routes for each phase
- Wire to appropriate storage services

---

## [WIRE-019]: Wire transactionStorage

**Closes Gap:** GAP-026
**Component:** `src/utils/transactionStorage.ts`
**Priority:** P1
**Estimated Size:** Small

**As a** game system
**I want to** record transactions
**So that** history is preserved

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Service Imported**
- **Given:** FreeAgencyHub, TradeHub code
- **When:** Transaction occurs
- **Then:** transactionStorage methods called
- **Verify:** Check import statements added

**AC-2: Transactions Recorded**
- **Given:** User signs FA or completes trade
- **When:** Transaction completes
- **Then:** Record saved to IndexedDB
- **Verify:** Check IndexedDB for transaction record

**AC-3: History Retrievable**
- **Given:** Transactions recorded
- **When:** History queried
- **Then:** All transactions returned
- **Verify:** Call getTransactions(), see list

### Technical Notes
- Import in FreeAgencyHub.tsx
- Import in TradeHub.tsx
- Call on signing/trade completion

---

## [WIRE-020]: Wire fieldingStatsAggregator

**Closes Gap:** GAP-027
**Component:** `src/services/fieldingStatsAggregator.ts`
**Priority:** P1
**Estimated Size:** Small

**As a** awards system
**I want to** aggregate fielding stats by position
**So that** Gold Gloves can be awarded

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Service Imported**
- **Given:** Awards calculation code
- **When:** Gold Glove calculated
- **Then:** fieldingStatsAggregator called
- **Verify:** Check import in awards logic

**AC-2: Stats Aggregated by Position**
- **Given:** Season fielding data exists
- **When:** Aggregator called
- **Then:** Returns stats grouped by position
- **Verify:** Call method, see 9 positions with stats

**AC-3: Used for Awards**
- **Given:** Aggregated fielding stats
- **When:** Gold Glove award calculated
- **Then:** Best fWAR at each position wins
- **Verify:** See Gold Glove winners per position

### Technical Notes
- Import in GoldGloveAwards calculation
- Wire to season end processing
- Use for position-based award determination

---

## [WIRE-021]: Wire dataExportService

**Closes Gap:** GAP-028
**Component:** `src/services/dataExportService.ts`
**Priority:** P1
**Estimated Size:** Small

**As a** user
**I want to** export game data
**So that** I can analyze it externally

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Service Imported**
- **Given:** PostGameScreen or stats view
- **When:** Export functionality needed
- **Then:** dataExportService imported
- **Verify:** Check import statements

**AC-2: Export Button Added**
- **Given:** PostGameScreen rendered
- **When:** User clicks "Export Box Score"
- **Then:** CSV/JSON file downloads
- **Verify:** Click export, file downloads

**AC-3: Data Complete**
- **Given:** Export generated
- **When:** File opened
- **Then:** Contains all game stats
- **Verify:** Open file, find all player stats

### Technical Notes
- Import in PostGameScreen.tsx
- Add "Export" button
- Support CSV and JSON formats

---

## [WIRE-023]: Wire adaptiveLearningEngine

**Closes Gap:** GAP-030
**Component:** `src/engines/adaptiveLearningEngine.ts`
**Priority:** P1
**Estimated Size:** Medium

**As a** fielding system
**I want to** improve inference over time
**So that** predictions become more accurate

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Engine Imported**
- **Given:** FieldingModal code
- **When:** User corrects inference
- **Then:** adaptiveLearningEngine called
- **Verify:** Check import in FieldingModal

**AC-2: Corrections Tracked**
- **Given:** User changes inferred fielder
- **When:** At-bat submitted
- **Then:** Correction recorded for learning
- **Verify:** Check learning data after correction

**AC-3: Inference Improves**
- **Given:** 20+ corrections for scenario
- **When:** Same scenario occurs
- **Then:** Inference probability updated
- **Verify:** After corrections, default changes

### Technical Notes
- Import in FieldingModal.tsx
- Call on user correction (when inferred != actual)
- Store correction data in IndexedDB

---

# LOWER PRIORITY WIRING (P2)

---

## [WIRE-005]: Wire PlayoffBracket

**Closes Gap:** GAP-010
**Component:** `src/components/PlayoffBracket.tsx`
**Priority:** P2
**Estimated Size:** Small

**As a** user during playoffs
**I want to** see the playoff bracket
**So that** I can track tournament progress

### Acceptance Criteria

**AC-1: Component Imported**
- **Given:** Playoffs active
- **When:** User views SeasonDashboard
- **Then:** PlayoffBracket renders
- **Verify:** Navigate to dashboard during playoffs

**AC-2: Component Receives Data**
- **Given:** PlayoffBracket rendered
- **When:** Playoff data available
- **Then:** Shows matchups and results
- **Verify:** See bracket with team names

**AC-3: Updates with Results**
- **Given:** Playoff game completed
- **When:** Bracket refreshed
- **Then:** Winner advances to next round
- **Verify:** Win game, see bracket update

---

## [WIRE-006]: Wire ChampionshipCelebration

**Closes Gap:** GAP-011
**Component:** `src/components/ChampionshipCelebration.tsx`
**Priority:** P2
**Estimated Size:** Small

**As a** user winning championship
**I want to** see celebration
**So that** the moment feels special

### Acceptance Criteria

**AC-1: Component Imported**
- **Given:** Championship game won
- **When:** Game ends
- **Then:** ChampionshipCelebration renders
- **Verify:** Win final, see celebration

**AC-2: Component Shows Trophy**
- **Given:** Celebration rendered
- **When:** User views screen
- **Then:** Trophy graphic and confetti displayed
- **Verify:** See championship visuals

**AC-3: Stats Highlighted**
- **Given:** Celebration rendered
- **When:** User views details
- **Then:** Key stats from championship run shown
- **Verify:** See MVP, record, etc.

---

## [WIRE-009]: Wire RelationshipPanel

**Closes Gap:** GAP-015
**Component:** `src/components/RelationshipPanel.tsx`
**Priority:** P2
**Estimated Size:** Small

**As a** user viewing a player
**I want to** see their relationships
**So that** I understand team dynamics

### Acceptance Criteria

**AC-1: Component Imported**
- **Given:** PlayerCard rendered
- **When:** Player has relationships
- **Then:** RelationshipPanel visible
- **Verify:** Open PlayerCard, find relationships section

**AC-2: Relationships Listed**
- **Given:** RelationshipPanel rendered
- **When:** Data available
- **Then:** Shows relationship types and partners
- **Verify:** See "Best Friends: John Smith"

**AC-3: Morale Impact Shown**
- **Given:** Relationship displayed
- **When:** User views details
- **Then:** Morale modifier visible
- **Verify:** See "+2 morale from friendship"

---

## [WIRE-010]: Wire AgingDisplay

**Closes Gap:** GAP-016
**Component:** `src/components/AgingDisplay.tsx`
**Priority:** P2
**Estimated Size:** Small

**As a** user viewing a player
**I want to** see their career phase
**So that** I understand their trajectory

### Acceptance Criteria

**AC-1: Component Imported**
- **Given:** PlayerCard rendered
- **When:** User views player
- **Then:** AgingDisplay shows career phase
- **Verify:** Open PlayerCard, find aging section

**AC-2: Phase Displayed**
- **Given:** AgingDisplay rendered
- **When:** Player data available
- **Then:** Shows "Prime" / "Declining" / "Veteran"
- **Verify:** See career phase indicator

**AC-3: Projection Shown**
- **Given:** AgingDisplay rendered
- **When:** User views details
- **Then:** Expected development/decline shown
- **Verify:** See "Expected -3 ratings next year"

---

## [WIRE-012]: Wire ChemistryDisplay

**Closes Gap:** GAP-019
**Component:** `src/components/ChemistryDisplay.tsx`
**Priority:** P2
**Estimated Size:** Small

**As a** user managing roster
**I want to** see team chemistry
**So that** I can build cohesive teams

### Acceptance Criteria

**AC-1: Component Imported**
- **Given:** RosterView or TeamPage rendered
- **When:** User views team
- **Then:** ChemistryDisplay visible
- **Verify:** Find chemistry section

**AC-2: Chemistry Score Shown**
- **Given:** ChemistryDisplay rendered
- **When:** Team data available
- **Then:** Overall chemistry rating displayed
- **Verify:** See "Team Chemistry: 85"

**AC-3: Personality Mix Shown**
- **Given:** ChemistryDisplay rendered
- **When:** User views details
- **Then:** Personality breakdown visible
- **Verify:** See personality type distribution

---

## [WIRE-013]: Wire ContractionWarning

**Closes Gap:** GAP-020
**Component:** `src/components/ContractionWarning.tsx`
**Priority:** P2
**Estimated Size:** Small

**As a** user with struggling team
**I want to** see contraction risk
**So that** I can take action

### Acceptance Criteria

**AC-1: Component Imported**
- **Given:** Team at risk of contraction
- **When:** SeasonDashboard renders
- **Then:** ContractionWarning visible
- **Verify:** See warning banner when at risk

**AC-2: Risk Level Shown**
- **Given:** Warning displayed
- **When:** User views warning
- **Then:** Risk percentage and factors shown
- **Verify:** See "Contraction Risk: 45%"

**AC-3: Suggestions Provided**
- **Given:** Warning displayed
- **When:** User reads details
- **Then:** Actions to reduce risk listed
- **Verify:** Find actionable suggestions

---

## [WIRE-016]: Wire Museum Components

**Closes Gap:** GAP-023
**Components:** 4 museum components in `src/components/museum/`
**Priority:** P2
**Estimated Size:** Medium

**As a** user exploring franchise history
**I want to** see museum content
**So that** I can appreciate achievements

### Acceptance Criteria

**AC-1: Components Imported**
- **Given:** MuseumHub rendered
- **When:** User clicks museum section
- **Then:** Appropriate component renders
- **Verify:** Click each section, see component

**AC-2: Components Receive Data**
- **Given:** Museum component rendered
- **When:** History data available
- **Then:** Shows HOF members, records, banners
- **Verify:** See actual franchise history

**AC-3: Navigation Works**
- **Given:** MuseumHub active
- **When:** User navigates between sections
- **Then:** Content switches appropriately
- **Verify:** Move between all 4 sections

---

## [WIRE-022]: Wire traitPools

**Closes Gap:** GAP-029
**Component:** `src/data/traitPools.ts`
**Priority:** P2
**Estimated Size:** Small

**As a** All-Star player
**I want to** spin the trait wheel
**So that** I can earn new traits

### Acceptance Criteria

**AC-1: Data Imported**
- **Given:** TraitLotteryWheel code
- **When:** Wheel needs traits
- **Then:** traitPools data imported
- **Verify:** Check import statement

**AC-2: Pools Configured**
- **Given:** traitPools loaded
- **When:** Data inspected
- **Then:** Trait pools exist (Good, Bad, Neutral)
- **Verify:** Find pool arrays

**AC-3: Wheel Uses Pools**
- **Given:** User spins wheel
- **When:** Result determined
- **Then:** Trait selected from appropriate pool
- **Verify:** Spin wheel, get valid trait

---

# SUMMARY

## Wiring Stories by Priority

| Priority | Count | Est. Effort |
|----------|-------|-------------|
| P0 (Critical) | 2 | ~4 hours |
| P1 (Important) | 13 | ~16 hours |
| P2 (Lower) | 8 | ~8 hours |
| **Total** | **23** | **~28 hours** |

## Quick Wins (Smallest Effort)

1. WIRE-011: LeagueNewsFeed (~30 min)
2. WIRE-019: transactionStorage (~30 min)
3. WIRE-020: fieldingStatsAggregator (~30 min)
4. WIRE-021: dataExportService (~30 min)
5. WIRE-001: BoxScoreView (~45 min)
6. WIRE-002: StandingsView (~45 min)
7. WIRE-007: SeasonProgressTracker (~45 min)

## Blocked Wiring

*No blocked stories remaining.*

## Completion Status (Updated Jan 26, 2026)

**23 of 23 stories COMPLETE (100%)**

All wiring stories complete! Player database now has full ratings for all 506 players, enabling salary calculation in PlayerCard.

---

*Document generated January 26, 2026*
