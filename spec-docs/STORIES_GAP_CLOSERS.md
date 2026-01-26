# KBL Tracker - Gap Closure Stories

> **Generated**: January 26, 2026
> **Purpose**: User stories to close gaps identified in GAPS_MASTER.md
> **Format**: Ralph Framework (As a/I want/So that, Given/When/Then/Verify)

---

## Story Index

| Story ID | Closes Gap | Title | Priority | Size |
|----------|------------|-------|----------|------|
| NEW-001 | GAP-002 | Sign Free Agent Action | P0 | Medium |
| NEW-002 | GAP-038 | Spring Training Phase | P0 | Medium |
| NEW-003 | GAP-039 | Schedule Generation Phase | P0 | Small |
| NEW-004 | GAP-040 | Farm System Roster View | P1 | Large |
| NEW-005 | GAP-040 | Call Up Player Mid-Season | P1 | Medium |
| NEW-006 | GAP-001 | Player Ratings Storage | P0 | Medium |
| NEW-007 | GAP-003 | Unified Player Database | P0 | Large |
| NEW-008 | GAP-004 | Data Integration Layer | P0 | Large |
| NEW-009 | GAP-031 | Fix Exit Type Double Entry | P1 | Small |
| NEW-010 | GAP-032 | Make Player Names Clickable | P1 | Small |
| NEW-011 | GAP-033 | Display Team Names in Scoreboard | P1 | Small |
| NEW-012 | GAP-034 | Add Lineup Access Panel | P1 | Medium |
| NEW-013 | GAP-041 | Wire Relationship Engine | P1 | Medium |
| NEW-014 | GAP-042 | Wire Aging Engine | P1 | Medium |
| NEW-015 | GAP-046 | Wire Beat Reporter to Fan Morale | P1 | Small |
| NEW-016 | GAP-050 | Enforce Offseason Phase Order | P1 | Small |
| NEW-017 | GAP-051 | Create Farm System State | P1 | Medium |
| NEW-018 | GAP-065 | Add IndexedDB Backup/Restore | P2 | Medium |

---

# CRITICAL PRIORITY (P0)

---

## [NEW-001]: Sign Free Agent Action

**Closes Gap:** GAP-002
**Parent Feature:** F-E007 (FreeAgencyHub)
**Priority:** P0
**Estimated Size:** Medium

**As a** user in free agency
**I want to** sign a free agent to my team
**So that** I can improve my roster

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [ ] No architectural decisions (requires transaction storage decision)
- [x] Clear end state

### Acceptance Criteria

**AC-1: Sign Button on FA Card**
- **Given:** Free agent displayed in FreeAgencyHub
- **When:** User views FA card
- **Then:** "Sign" button visible on each eligible FA card
- **Verify:** Open FreeAgencyHub, find sign button on FA cards

**AC-2: Contract Offer Modal**
- **Given:** User clicks "Sign" on FA
- **When:** Modal opens
- **Then:** Shows contract years, salary, "Confirm" button
- **Verify:** Click sign, see contract details in modal

**AC-3: Player Added to Roster**
- **Given:** User confirms signing
- **When:** Transaction completes
- **Then:** Player on user's roster, cap space reduced, FA removed from pool
- **Verify:** Check roster contains new player, cap space decreased

### Technical Notes
- Use transactionStorage.ts (GAP-026) for recording transaction
- Update GlobalState with new roster
- Remove signed FA from free agent pool

---

## [NEW-002]: Spring Training Phase

**Closes Gap:** GAP-038
**Parent Feature:** F-E001 (OffseasonHub)
**Priority:** P0
**Estimated Size:** Medium

**As a** user completing offseason
**I want to** experience spring training
**So that** my players can prepare for the season

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Spring Training Screen**
- **Given:** Trade phase complete
- **When:** Spring Training phase unlocks
- **Then:** Spring Training screen renders with roster overview
- **Verify:** Navigate to spring training route after trades

**AC-2: Player Development Preview**
- **Given:** Spring Training screen visible
- **When:** User views roster
- **Then:** Projected rating changes shown per player (using agingEngine)
- **Verify:** Find development indicators on player cards

**AC-3: Complete Phase Button**
- **Given:** User reviews spring training
- **When:** User clicks "Complete Spring Training"
- **Then:** Phase marked complete, next phase unlocked
- **Verify:** Progress tracker updates, schedule gen unlocks

### Technical Notes
- Wire agingEngine.ts for development projections
- Add `/offseason/spring-training` route
- Track phase completion state

---

## [NEW-003]: Schedule Generation Phase

**Closes Gap:** GAP-039
**Parent Feature:** F-E001 (OffseasonHub)
**Priority:** P0
**Estimated Size:** Small

**As a** user completing offseason
**I want to** generate the new season schedule
**So that** games can begin

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Schedule Generation Screen**
- **Given:** Spring Training complete
- **When:** Schedule Generation phase unlocks
- **Then:** Schedule configuration screen renders
- **Verify:** Navigate to schedule generation route

**AC-2: Season Length Option**
- **Given:** Schedule screen visible
- **When:** User views options
- **Then:** Season length dropdown (32/48/64/128) available
- **Verify:** Find season length selector with 4 options

**AC-3: Generate and Start**
- **Given:** User configures schedule
- **When:** User clicks "Generate Schedule"
- **Then:** Schedule created, "Start New Season" button appears
- **Verify:** Schedule exists in storage, start button visible

### Technical Notes
- Add `/offseason/schedule-gen` route
- Use existing schedule generation logic
- Transition to SeasonDashboard on start

---

## [NEW-006]: Player Ratings Storage

**Closes Gap:** GAP-001
**Parent Feature:** F-A007 (Player Ratings Input)
**Priority:** P0
**Estimated Size:** Medium

**As a** user creating players
**I want to** have player ratings stored persistently
**So that** salary can be calculated and displayed

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [ ] No architectural decisions (new IndexedDB store)
- [x] Clear end state

### Acceptance Criteria

**AC-1: Ratings Schema Defined**
- **Given:** PlayerRatings type created
- **When:** Schema inspected
- **Then:** Contains: power, contact, speed, fielding, arm, velocity, junk, accuracy
- **Verify:** TypeScript type definition exists in types/

**AC-2: IndexedDB Store Created**
- **Given:** App initializes
- **When:** Database opens
- **Then:** `playerRatings` store exists
- **Verify:** Check IndexedDB in dev tools

**AC-3: CRUD Operations Work**
- **Given:** Ratings storage service
- **When:** Create/Read/Update/Delete called
- **Then:** Operations succeed
- **Verify:** Unit tests pass for all CRUD

### Technical Notes
- Add `playerRatings` store to existing IndexedDB schema
- Create `ratingsStorage.ts` service
- Wire to ManualPlayerInput form

---

## [NEW-007]: Unified Player Database

**Closes Gap:** GAP-003
**Parent Feature:** F-A008 (LeagueBuilder)
**Priority:** P0
**Estimated Size:** Large

**As a** user managing my roster
**I want to** have custom players available in games
**So that** I can play with my created players

### Size Check
- [ ] < 200 lines of code (Large - 300+ lines)
- [x] ≤ 3 acceptance criteria
- [ ] No architectural decisions (database unification)
- [x] Clear end state

### Acceptance Criteria

**AC-1: Single Player Store**
- **Given:** Player created via ManualPlayerInput
- **When:** Player saved
- **Then:** Player appears in unified `players` IndexedDB store
- **Verify:** Check IndexedDB, find player in store

**AC-2: Game Can Load Custom Players**
- **Given:** Custom player in unified store
- **When:** Game starts
- **Then:** Custom player available in lineup selection
- **Verify:** Start game, find custom player in roster

**AC-3: Migration from Legacy Store**
- **Given:** Players in old localStorage (`kbl-custom-players`)
- **When:** App initializes
- **Then:** Players migrated to unified store
- **Verify:** Old players appear in new store, old store empty

### Technical Notes
- Create unified `players` store
- Migrate from localStorage to IndexedDB
- Update playerDatabase.ts to read from unified store

---

## [NEW-008]: Data Integration Layer

**Closes Gap:** GAP-004
**Parent Feature:** All Phases B-G
**Priority:** P0
**Estimated Size:** Large

**As a** user navigating the app
**I want to** see real data in all screens
**So that** the app is functional

### Size Check
- [ ] < 200 lines of code (Large - 500+ lines across files)
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Wrapper Components Load Data**
- **Given:** Route wrapper components in App.tsx
- **When:** Route renders
- **Then:** Wrapper fetches real data from IndexedDB
- **Verify:** Navigate to /roster, see real roster data

**AC-2: Loading States Shown**
- **Given:** Data loading in progress
- **When:** Component renders
- **Then:** Loading indicator displayed
- **Verify:** See loading state before data appears

**AC-3: Error States Handled**
- **Given:** Data fetch fails
- **When:** Component renders
- **Then:** Error message displayed with retry option
- **Verify:** Simulate failure, see error UI

### Technical Notes
- Add data loading hooks to each wrapper
- Create useSeasonData, useRosterData, etc. hooks
- Wire GlobalStateProvider to IndexedDB

---

# IMPORTANT PRIORITY (P1)

---

## [NEW-009]: Fix Exit Type Double Entry

**Closes Gap:** GAP-031
**Parent Feature:** GameTracker
**Priority:** P1
**Estimated Size:** Small

**As a** user tracking at-bats
**I want to** select exit type once
**So that** at-bat entry is faster

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Single Exit Type Selection**
- **Given:** User clicks at-bat result (1B, 2B, etc.)
- **When:** AtBatFlow modal opens
- **Then:** Exit type selection is in modal only, no pre-selection
- **Verify:** Click 1B, see modal with exit type options

**AC-2: Auto-Proceed After Selection**
- **Given:** User selects exit type in modal
- **When:** Selection made
- **Then:** Flow proceeds to next step (fielding or confirmation)
- **Verify:** Select exit type, flow advances automatically

**AC-3: No Redundant Clicks**
- **Given:** At-bat flow complete
- **When:** Counting clicks
- **Then:** Exit type selected exactly once
- **Verify:** Track clicks, confirm single selection

### Technical Notes
- Refactor AtBatFlow.tsx to remove pre-modal exit type
- Move all exit type UI into modal
- Ensure state updates correctly

---

## [NEW-010]: Make Player Names Clickable

**Closes Gap:** GAP-032
**Parent Feature:** GameTracker
**Priority:** P1
**Estimated Size:** Small

**As a** user during a game
**I want to** click player names to see their stats
**So that** I can make informed decisions

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Current Batter Clickable**
- **Given:** GameTracker displaying current batter
- **When:** User clicks batter name
- **Then:** PlayerCard modal opens with batter stats
- **Verify:** Click batter name, see PlayerCard

**AC-2: Due-Up Names Clickable**
- **Given:** GameTracker displaying due-up list
- **When:** User clicks any due-up name
- **Then:** PlayerCard modal opens for that player
- **Verify:** Click due-up name, see their PlayerCard

**AC-3: Current Pitcher Clickable**
- **Given:** GameTracker displaying current pitcher
- **When:** User clicks pitcher name
- **Then:** PlayerCard modal opens with pitcher stats
- **Verify:** Click pitcher name, see PlayerCard

### Technical Notes
- Wrap player names with clickable component
- Pass player ID to PlayerCard modal
- Reuse existing PlayerCard component

---

## [NEW-011]: Display Team Names in Scoreboard

**Closes Gap:** GAP-033
**Parent Feature:** GameTracker
**Priority:** P1
**Estimated Size:** Small

**As a** user during a game
**I want to** see team names in the scoreboard
**So that** I know who is playing

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Team Names Displayed**
- **Given:** Game in progress
- **When:** Scoreboard renders
- **Then:** Shows "Sirloins vs Beewolves" (or actual team names)
- **Verify:** Start game, see team names in scoreboard

**AC-2: Home/Away Indicated**
- **Given:** Scoreboard with team names
- **When:** User views scoreboard
- **Then:** Away team on top/left, Home team on bottom/right
- **Verify:** Confirm standard baseball scoreboard layout

**AC-3: Names Persist Through Game**
- **Given:** Game in progress
- **When:** Innings change
- **Then:** Team names remain visible throughout
- **Verify:** Play multiple innings, names always visible

### Technical Notes
- Pass team names to Scoreboard component
- Get team names from game setup or GlobalState
- Update Scoreboard.tsx to display names

---

## [NEW-012]: Add Lineup Access Panel

**Closes Gap:** GAP-034
**Parent Feature:** GameTracker
**Priority:** P1
**Estimated Size:** Medium

**As a** user during a game
**I want to** access the current lineup
**So that** I can view and update mojo/fitness

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Lineup Button Visible**
- **Given:** GameTracker active
- **When:** User views UI
- **Then:** "View Lineup" or "Roster" button visible
- **Verify:** Find lineup access button in GameTracker

**AC-2: Lineup Panel Opens**
- **Given:** User clicks lineup button
- **When:** Panel opens
- **Then:** Shows current lineup with positions, mojo, fitness
- **Verify:** Click button, see lineup with all player data

**AC-3: Mojo/Fitness Visible**
- **Given:** Lineup panel open
- **When:** User views player
- **Then:** Mojo indicator (-2 to +2) and fitness state shown
- **Verify:** Find mojo and fitness badges on each player

### Technical Notes
- Create LineupPanel component or reuse existing
- Wire mojoEngine and fitnessEngine data
- Add toggle button to GameTracker UI

---

## [NEW-013]: Wire Relationship Engine

**Closes Gap:** GAP-041
**Parent Feature:** F-F001 (RelationshipEngine)
**Priority:** P1
**Estimated Size:** Medium

**As a** game system
**I want to** have relationships affect gameplay
**So that** team dynamics matter

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Engine Called at Season Start**
- **Given:** New season starts
- **When:** Season initialization runs
- **Then:** relationshipEngine processes initial relationships
- **Verify:** Check relationship data exists after season start

**AC-2: Relationships Affect Morale**
- **Given:** Player with relationship
- **When:** Morale calculated
- **Then:** Relationship modifiers applied
- **Verify:** Compare morale with/without relationship

**AC-3: Trade Warnings Generated**
- **Given:** Trade proposal includes player with relationship
- **When:** Trade evaluated
- **Then:** Warning shown about relationship impact
- **Verify:** Propose trade, see relationship warning

### Technical Notes
- Wire relationshipEngine.ts to season initialization
- Connect to morale calculations
- Add warning to TradeHub

---

## [NEW-014]: Wire Aging Engine

**Closes Gap:** GAP-042
**Parent Feature:** F-F005 (AgingEngine)
**Priority:** P1
**Estimated Size:** Medium

**As a** game system
**I want to** have players age and develop
**So that** franchise mode feels realistic

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Engine Called at Season End**
- **Given:** Season ends
- **When:** Season end processing runs
- **Then:** agingEngine processes all player ages
- **Verify:** Check player ages incremented after season

**AC-2: Development Applied**
- **Given:** Player under 30
- **When:** Aging processes
- **Then:** Appropriate development curve applied
- **Verify:** Young player stats improve per curve

**AC-3: Retirement Probability Calculated**
- **Given:** Player over 35
- **When:** Offseason starts
- **Then:** Retirement probability calculated and displayed
- **Verify:** See retirement chance on older players

### Technical Notes
- Wire agingEngine.ts to season end processing
- Add age field to player display
- Connect to RetirementsScreen

---

## [NEW-015]: Wire Beat Reporter to Fan Morale

**Closes Gap:** GAP-046
**Parent Feature:** F-F001 (NarrativeEngine)
**Priority:** P1
**Estimated Size:** Small

**As a** game system
**I want to** have news stories affect fan morale
**So that** narrative has consequences

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Story Generates Morale Impact**
- **Given:** narrativeEngine generates story
- **When:** Story created
- **Then:** calculateStoryMoraleImpact() called
- **Verify:** Check morale impact value on story

**AC-2: Fan Morale Updated**
- **Given:** Story with morale impact
- **When:** Story published
- **Then:** fanMoraleEngine receives impact
- **Verify:** Fan morale changes after story

**AC-3: Impact Visible in UI**
- **Given:** Story affected morale
- **When:** User views FanMoralePanel
- **Then:** Morale change reflected
- **Verify:** See morale change after story publishes

### Technical Notes
- Wire narrativeEngine output to fanMoraleEngine input
- Use existing calculateStoryMoraleImpact()
- Update fan morale state

---

## [NEW-016]: Enforce Offseason Phase Order

**Closes Gap:** GAP-050
**Parent Feature:** F-E001 (OffseasonHub)
**Priority:** P1
**Estimated Size:** Small

**As a** user in offseason
**I want to** complete phases in order
**So that** the flow makes sense

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Future Phases Locked**
- **Given:** User on Phase 2 (Ratings)
- **When:** User views OffseasonHub
- **Then:** Phases 3-11 show as locked
- **Verify:** Try to click locked phase, nothing happens

**AC-2: Completed Phases Accessible**
- **Given:** User completed Phase 3
- **When:** User views OffseasonHub
- **Then:** Phases 1-3 accessible, 4+ locked until 3 done
- **Verify:** Can revisit completed phases

**AC-3: Completion Unlocks Next**
- **Given:** User completes current phase
- **When:** "Complete" clicked
- **Then:** Next phase unlocks
- **Verify:** Click complete, next phase clickable

### Technical Notes
- Add phase state to GlobalState
- Track completion status per phase
- Add visual lock/unlock indicators

---

## [NEW-017]: Create Farm System State

**Closes Gap:** GAP-051
**Parent Feature:** F-FARM (New)
**Priority:** P1
**Estimated Size:** Medium

**As a** game system
**I want to** track minor league rosters
**So that** farm system can function

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Farm Roster Store Exists**
- **Given:** App initialized
- **When:** Database checked
- **Then:** `farmRosters` IndexedDB store exists
- **Verify:** Check IndexedDB for store

**AC-2: Players Assignable to Farm**
- **Given:** Player in system
- **When:** Player assigned to farm
- **Then:** Player appears in farm roster
- **Verify:** Assign player, check farm roster

**AC-3: Farm Separate from MLB**
- **Given:** Farm roster and MLB roster
- **When:** Rosters queried
- **Then:** Distinct lists returned
- **Verify:** Query both, no overlap

### Technical Notes
- Add `farmRosters` store
- Add `rosterLevel` field to player
- Create farmStorage.ts service

---

# LOWER PRIORITY (P2)

---

## [NEW-018]: Add IndexedDB Backup/Restore

**Closes Gap:** GAP-065
**Parent Feature:** Data Safety
**Priority:** P2
**Estimated Size:** Medium

**As a** user with valuable data
**I want to** backup and restore my data
**So that** I don't lose progress

### Size Check
- [x] < 200 lines of code
- [x] ≤ 3 acceptance criteria
- [x] No architectural decisions
- [x] Clear end state

### Acceptance Criteria

**AC-1: Export Button Exists**
- **Given:** User in settings or menu
- **When:** User clicks "Export Data"
- **Then:** JSON file downloads with all data
- **Verify:** Click export, file downloads

**AC-2: Import Button Exists**
- **Given:** User has backup JSON
- **When:** User clicks "Import Data" and selects file
- **Then:** Data restored to IndexedDB
- **Verify:** Import backup, data appears

**AC-3: Import Overwrites Cleanly**
- **Given:** Existing data in app
- **When:** User imports backup
- **Then:** Old data replaced with backup
- **Verify:** Import different save, see new data

### Technical Notes
- Use dataExportService.ts (GAP-028)
- Add UI in settings
- Handle version migration if needed

---

# SUMMARY

## Stories by Priority

| Priority | Count | Stories |
|----------|-------|---------|
| P0 (Critical) | 6 | NEW-001, NEW-002, NEW-003, NEW-006, NEW-007, NEW-008 |
| P1 (Important) | 9 | NEW-009 through NEW-017 |
| P2 (Lower) | 1 | NEW-018 |
| **Total** | **16** | |

## Estimated Effort

| Size | Count | Est. Lines |
|------|-------|------------|
| Small | 6 | <100 each |
| Medium | 8 | 100-200 each |
| Large | 2 | 300+ each |

---

*Document generated January 26, 2026*
