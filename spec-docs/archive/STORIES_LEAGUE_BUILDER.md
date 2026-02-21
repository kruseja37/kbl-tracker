# League Builder & Season Setup User Stories

> **Purpose**: User stories for implementing the League Builder hub and Season Setup wizard
> **Created**: January 29, 2026
> **Status**: DRAFT
> **Related**: LEAGUE_BUILDER_SPEC.md, SEASON_SETUP_SPEC.md, GRADE_ALGORITHM_SPEC.md

---

## Story Index

| Module | Stories | Priority |
|--------|---------|----------|
| League Builder Hub | LB-001 to LB-005 | P0 |
| LEAGUES Module | LB-010 to LB-015 | P0 |
| TEAMS Module | LB-020 to LB-027 | P0 |
| PLAYERS Module | LB-030 to LB-040 | P0 |
| ROSTERS Module | LB-050 to LB-057 | P1 |
| DRAFT Module | LB-060 to LB-067 | P1 |
| RULES Module | LB-070 to LB-078 | P1 |
| Season Setup Wizard | SS-001 to SS-012 | P0 |
| Playoff Mode | SS-020 to SS-025 | P1 |

---

## Module: League Builder Hub

### LB-001: League Builder Navigation Entry
**Priority**: P0
**As a** user
**I want** to access League Builder from the main menu
**So that** I can customize leagues, teams, and players before starting a franchise

**Acceptance Criteria**:
- [ ] "League Builder" button appears on Main Menu
- [ ] Button navigates to `/league-builder` route
- [ ] League Builder hub displays 6-module grid (LEAGUES, TEAMS, PLAYERS, ROSTERS, DRAFT, RULES)
- [ ] Back button returns to Main Menu

---

### LB-002: League Builder Hub Layout
**Priority**: P0
**As a** user
**I want** a clear hub interface showing all customization modules
**So that** I can easily navigate to the section I need

**Acceptance Criteria**:
- [ ] 2x3 grid layout with module cards
- [ ] Each card shows module name and brief description
- [ ] Each card is clickable and navigates to respective module
- [ ] Current leagues list appears below the grid
- [ ] League list shows name, team count, and click-to-expand details

---

### LB-003: Current Leagues List
**Priority**: P0
**As a** user
**I want** to see all my saved leagues on the League Builder hub
**So that** I can quickly access or modify existing leagues

**Acceptance Criteria**:
- [ ] List displays all saved LeagueTemplate records from storage
- [ ] Each entry shows: league name, team count, default rules preset
- [ ] Clicking a league expands inline details (conferences, divisions)
- [ ] Edit button on each league opens LEAGUES module with that league loaded
- [ ] "Create New League" button at bottom of list

---

### LB-004: Module Navigation Persistence
**Priority**: P1
**As a** user
**I want** my work in progress to be preserved when switching modules
**So that** I don't lose unsaved changes

**Acceptance Criteria**:
- [ ] Unsaved changes prompt "Save before leaving?" dialog
- [ ] User can choose Save, Don't Save, or Cancel
- [ ] State persists in session storage during module switches
- [ ] Full save commits to IndexedDB

---

### LB-005: League Builder IndexedDB Stores
**Priority**: P0
**As a** developer
**I want** dedicated IndexedDB stores for League Builder data
**So that** leagues, teams, players, and rules persist between sessions

**Acceptance Criteria**:
- [ ] `leagueTemplates` store for LeagueTemplate records
- [ ] `globalTeams` store for Team records
- [ ] `globalPlayers` store for Player records (extends existing playerDatabase)
- [ ] `rulesPresets` store for RulesPreset records
- [ ] `teamRosters` store for TeamRoster records
- [ ] CRUD operations for each store

---

## Module: LEAGUES

### LB-010: View Leagues List
**Priority**: P0
**As a** user
**I want** to see all my saved league templates
**So that** I can choose which one to edit or use

**Acceptance Criteria**:
- [ ] LEAGUES module shows list of all LeagueTemplate records
- [ ] Each entry displays: name, team count, conference/division structure
- [ ] Clicking a league loads it for editing
- [ ] "Create New League" button at top

---

### LB-011: Create New League
**Priority**: P0
**As a** user
**I want** to create a new league template
**So that** I can define a custom competitive structure

**Acceptance Criteria**:
- [ ] Step 1: Name & Description (required: name; optional: description, logo, color)
- [ ] Step 2: Select Teams (multi-select from global team pool)
- [ ] Step 3: Configure Structure (conferences: 0/1/2; divisions per conference)
- [ ] Step 4: Assign Teams to Divisions (drag-drop or select)
- [ ] Step 5: Select Default Rules Preset
- [ ] Step 6: Review & Save
- [ ] Cancel returns to leagues list without saving

---

### LB-012: Edit Existing League
**Priority**: P0
**As a** user
**I want** to modify a saved league template
**So that** I can update team membership or structure

**Acceptance Criteria**:
- [ ] All fields from creation flow are editable
- [ ] Changes do not affect active franchises using this template
- [ ] Save updates the LeagueTemplate in storage
- [ ] "Save As New" creates a copy with new ID

---

### LB-013: Delete League Template
**Priority**: P1
**As a** user
**I want** to delete a league template I no longer need
**So that** I can keep my league list organized

**Acceptance Criteria**:
- [ ] Delete button on league detail view
- [ ] Confirmation dialog: "Delete [League Name]? This cannot be undone."
- [ ] Warning if league is referenced by active franchises
- [ ] Removes from `leagueTemplates` store on confirm

---

### LB-014: Duplicate League Template
**Priority**: P1
**As a** user
**I want** to duplicate a league template
**So that** I can use an existing league as a starting point

**Acceptance Criteria**:
- [ ] "Duplicate" button on league detail view
- [ ] Creates new LeagueTemplate with "[Original Name] Copy" as name
- [ ] Opens in edit mode for immediate customization
- [ ] Assigns new unique ID

---

### LB-015: League Structure Visualization
**Priority**: P1
**As a** user
**I want** to see a visual representation of my league structure
**So that** I can verify conference/division assignments

**Acceptance Criteria**:
- [ ] Tree view showing: League → Conferences → Divisions → Teams
- [ ] Teams display with logo (if available) and abbreviation
- [ ] Drag-and-drop to reassign teams between divisions
- [ ] Unassigned teams appear in "Free Pool" section

---

## Module: TEAMS

### LB-020: View Teams List
**Priority**: P0
**As a** user
**I want** to see all teams in the global team pool
**So that** I can manage and edit team details

**Acceptance Criteria**:
- [ ] Grid or list view of all Team records
- [ ] Each entry shows: logo, name, abbreviation, leagues membership
- [ ] Filter by: league membership, city/location, name search
- [ ] Sort by: name, location, created date

---

### LB-021: Create New Team
**Priority**: P0
**As a** user
**I want** to create a new team from scratch
**So that** I can add custom teams to my leagues

**Acceptance Criteria**:
- [ ] Form fields per Team interface: name, abbreviation, location, nickname
- [ ] Color picker for primary, secondary, accent colors
- [ ] Logo upload (PNG/SVG, max 500KB)
- [ ] Stadium name input
- [ ] Optional: founded year, championships count
- [ ] Save creates Team in `globalTeams` store

---

### LB-022: Edit Existing Team
**Priority**: P0
**As a** user
**I want** to edit a saved team's details
**So that** I can update branding or information

**Acceptance Criteria**:
- [ ] All creation fields are editable
- [ ] Changes reflect across all leagues containing this team
- [ ] Warning if team is in active franchises
- [ ] Save updates Team in storage

---

### LB-023: Delete Team
**Priority**: P1
**As a** user
**I want** to delete a team I no longer need
**So that** I can remove outdated or test teams

**Acceptance Criteria**:
- [ ] Delete button with confirmation dialog
- [ ] Cannot delete if team is in active franchises (hard block)
- [ ] If in leagues, prompt: "Remove from X leagues and delete?"
- [ ] Also deletes associated TeamRoster

---

### LB-024: Assign Team to Leagues
**Priority**: P0
**As a** user
**I want** to add a team to multiple leagues
**So that** the same team can compete in different league configurations

**Acceptance Criteria**:
- [ ] "League Membership" section in team editor
- [ ] Checkbox list of all available leagues
- [ ] Toggle to add/remove team from each league
- [ ] Updates both Team.leagueIds and LeagueTemplate.teamIds

---

### LB-025: Team CSV Import
**Priority**: P1
**As a** user
**I want** to import multiple teams from a CSV file
**So that** I can bulk-create teams efficiently

**Acceptance Criteria**:
- [ ] "Import CSV" button in TEAMS module
- [ ] File upload accepting .csv files
- [ ] Preview parsed data in table format
- [ ] Validation: check required fields, duplicate names
- [ ] Error highlighting for invalid rows
- [ ] Confirm imports valid rows, skips invalid with report

**CSV Format**:
```csv
name,abbreviation,location,nickname,primaryColor,secondaryColor,accentColor,logoUrl,stadium
```

---

### LB-026: Team Logo Management
**Priority**: P1
**As a** user
**I want** to upload and manage team logos
**So that** teams have visual identity in the app

**Acceptance Criteria**:
- [ ] Image upload supporting PNG, JPG, SVG
- [ ] Max file size: 500KB
- [ ] Image preview in editor
- [ ] Logo stored as base64 or file path reference
- [ ] Fallback to abbreviation badge if no logo

---

### LB-027: Team Color Palette
**Priority**: P1
**As a** user
**I want** to set team colors with a visual picker
**So that** UI elements use correct branding

**Acceptance Criteria**:
- [ ] Color picker component for each color slot
- [ ] Hex input field for manual entry
- [ ] Preview panel showing colors applied to sample UI elements
- [ ] Contrast checker for text readability

---

## Module: PLAYERS

### LB-030: View Players Database
**Priority**: P0
**As a** user
**I want** to browse all players in the global database
**So that** I can find, review, and edit player details

**Acceptance Criteria**:
- [ ] Paginated table/grid of all Player records
- [ ] Columns: name, position, grade, team (or Free Agent)
- [ ] Filters: position, grade range, team, bats/throws
- [ ] Search by name
- [ ] Click row to open player editor

---

### LB-031: Create New Player
**Priority**: P0
**As a** user
**I want** to create a custom player with all attributes
**So that** I can add any player I want to the database

**Acceptance Criteria**:
- [ ] Full player editor form (per LEAGUE_BUILDER_SPEC.md Section 5.4)
- [ ] Identity: first name, last name, nickname, gender
- [ ] Physical: age, bats, throws
- [ ] Position: primary (required), secondary (optional)
- [ ] Ratings sliders 0-99 for all 5 batting stats
- [ ] Ratings sliders 0-99 for all 3 pitching stats (if pitcher/two-way)
- [ ] Arsenal multi-select (if pitcher)
- [ ] Traits dropdown (2 slots)
- [ ] Personality & Chemistry dropdowns
- [ ] Status: morale, mojo, fame sliders
- [ ] Team assignment dropdown
- [ ] Grade auto-calculates from weighted ratings
- [ ] Salary auto-calculates from formula
- [ ] Save creates Player in `globalPlayers` store

---

### LB-032: Edit Existing Player
**Priority**: P0
**As a** user
**I want** to edit any attribute of a saved player
**So that** I can update ratings, traits, or team assignment

**Acceptance Criteria**:
- [ ] All fields from creation are editable
- [ ] Grade and salary recalculate on rating changes
- [ ] Changes reflect in all contexts using this player
- [ ] Save updates Player in storage

---

### LB-033: Delete Player
**Priority**: P1
**As a** user
**I want** to delete a player from the database
**So that** I can remove test or unwanted players

**Acceptance Criteria**:
- [ ] Delete button with confirmation
- [ ] Cannot delete if player is in active franchise roster (warning + skip)
- [ ] Removes from team roster if assigned
- [ ] Deletes from `globalPlayers` store

---

### LB-034: Auto-Calculate Grade
**Priority**: P0
**As a** developer
**I want** grades to calculate automatically from ratings
**So that** grades always reflect the weighted rating formula

**Acceptance Criteria**:
- [ ] Position players: POW×0.30 + CON×0.30 + SPD×0.20 + FLD×0.10 + ARM×0.10
- [ ] Pitchers: (VEL + JNK + ACC) / 3
- [ ] Two-way: (positionWeighted + pitcherWeighted) × 1.25
- [ ] Grade assigned per GRADE_ALGORITHM_SPEC.md thresholds
- [ ] Grade field is read-only (display only)
- [ ] Updates in real-time as sliders change

---

### LB-035: Auto-Calculate Salary
**Priority**: P0
**As a** developer
**I want** salary to calculate automatically from ratings and modifiers
**So that** salaries reflect player value per SALARY_SYSTEM_SPEC.md

**Acceptance Criteria**:
- [ ] Base calculation: (weightedRating / 100)^2.5 × $50M × positionMult × traitMod
- [ ] Position multipliers applied (C: +15%, SS: +12%, etc.)
- [ ] Trait modifiers applied (±10%, ±5%, ±2%)
- [ ] Two-way bonus: × 1.25
- [ ] Salary field is read-only (display only)
- [ ] Updates in real-time as ratings/traits change

---

### LB-036: Generate Fictional Players
**Priority**: P1
**As a** user
**I want** to generate random players matching a target grade
**So that** I can quickly populate rosters with balanced prospects

**Acceptance Criteria**:
- [ ] "Generate Players" button in PLAYERS module
- [ ] Configuration modal:
  - Count: 1-50
  - Target grade: dropdown (S through D-)
  - Position distribution: balanced / random / specific position
  - Gender ratio slider
  - Age range min/max
  - Include traits: toggle + pool selection
- [ ] Generation uses GRADE_ALGORITHM_SPEC.md reverse algorithm
- [ ] Generated players added to `globalPlayers` store
- [ ] Preview before confirming generation

---

### LB-037: Player CSV Import
**Priority**: P1
**As a** user
**I want** to import players from a CSV file
**So that** I can bulk-add players from external sources

**Acceptance Criteria**:
- [ ] "Import CSV" button in PLAYERS module
- [ ] File upload for .csv
- [ ] Column mapping UI for non-standard formats
- [ ] Validation of required fields and value ranges
- [ ] Grade calculation applied to imported players
- [ ] Error report for invalid rows

---

### LB-038: Player Photo/Avatar
**Priority**: P2
**As a** user
**I want** to upload or generate player photos
**So that** player cards have visual identity

**Acceptance Criteria**:
- [ ] Photo upload supporting PNG, JPG
- [ ] Max size: 200KB
- [ ] Fallback: generated avatar from initials + colors
- [ ] Photo displayed in player card and roster views

---

### LB-039: View Player Career Stats
**Priority**: P1
**As a** user
**I want** to view and edit a player's career statistics
**So that** I can track historical performance

**Acceptance Criteria**:
- [ ] "Career Stats" tab in player editor
- [ ] Displays season-by-season statistics
- [ ] Read-only for stats from completed franchises
- [ ] Manual entry for historical stats (imported players)
- [ ] Totals and averages calculated automatically

---

### LB-040: Bulk Edit Players
**Priority**: P2
**As a** user
**I want** to edit multiple players at once
**So that** I can make sweeping changes efficiently

**Acceptance Criteria**:
- [ ] Multi-select in players list
- [ ] "Bulk Edit" action
- [ ] Fields: team assignment, age adjustment (±N), trait assignment
- [ ] Preview changes before applying
- [ ] Undo capability for bulk operations

---

## Module: ROSTERS

### LB-050: View Team Rosters
**Priority**: P0
**As a** user
**I want** to see each team's current roster
**So that** I can review player assignments

**Acceptance Criteria**:
- [ ] Team selector dropdown
- [ ] Roster view showing MLB (22) and Farm (10) players
- [ ] Grouped by: position players, pitchers
- [ ] Shows player grade, position, salary for each
- [ ] Total salary displayed

---

### LB-051: Assign Player to Team
**Priority**: P0
**As a** user
**I want** to move players between teams and free agency
**So that** I can build custom rosters

**Acceptance Criteria**:
- [ ] Drag-drop player between teams
- [ ] Or: select player → choose destination team/free agency
- [ ] Updates Player.currentTeamId
- [ ] Updates TeamRoster records for both teams
- [ ] Validation: cannot exceed roster limits

---

### LB-052: Set Starting Lineup
**Priority**: P0
**As a** user
**I want** to configure the batting order and fielding positions
**So that** the team has a default starting lineup

**Acceptance Criteria**:
- [ ] Drag-drop lineup order (1-9)
- [ ] Position dropdown for each lineup slot
- [ ] Lineup vs RHP tab
- [ ] Lineup vs LHP tab (optional, can copy from RHP)
- [ ] Validation: unique positions, valid position for player

---

### LB-053: Set Pitching Rotation
**Priority**: P0
**As a** user
**I want** to define the starting rotation order
**So that** starting pitchers are used in the correct order

**Acceptance Criteria**:
- [ ] Drag-drop list for 4-5 starting pitchers
- [ ] Separate list for setup pitchers
- [ ] Closer designation (single player)
- [ ] Validation: only SP/SP-RP players in rotation

---

### LB-054: Set Depth Chart
**Priority**: P1
**As a** user
**I want** to define backup order for each position
**So that** substitution AI makes intelligent choices

**Acceptance Criteria**:
- [ ] Position-by-position depth chart view
- [ ] Drag-drop players into depth order
- [ ] Shows secondary position capability
- [ ] Validation: at least one player per position

---

### LB-055: Set Bench Preferences
**Priority**: P1
**As a** user
**I want** to define pinch hit/run preferences
**So that** substitution recommendations prioritize my preferences

**Acceptance Criteria**:
- [ ] Pinch hitter priority list
- [ ] Pinch runner priority list
- [ ] Defensive sub priority list
- [ ] Drag-drop ordering

---

### LB-056: Roster Validation
**Priority**: P0
**As a** developer
**I want** automatic validation of roster compliance
**So that** users are warned about invalid roster configurations

**Acceptance Criteria**:
- [ ] MLB roster: exactly 22 players
- [ ] Farm roster: 0-10 players
- [ ] Position minimums: C:2, infield positions:1 each, OF:3, SP:4, RP:3
- [ ] Validation indicators (green check / red X) on roster view
- [ ] Cannot start franchise with invalid rosters

---

### LB-057: Quick Roster Fill
**Priority**: P2
**As a** user
**I want** to auto-fill an incomplete roster
**So that** I can quickly make a roster valid

**Acceptance Criteria**:
- [ ] "Auto-Fill" button when roster is below minimum
- [ ] Pulls best available free agents for needed positions
- [ ] Or generates fictional players if free agent pool insufficient
- [ ] Preview before confirming

---

## Module: DRAFT

### LB-060: Draft Configuration
**Priority**: P1
**As a** user
**I want** to configure draft settings before running a fantasy draft
**So that** the draft runs according to my preferences

**Acceptance Criteria**:
- [ ] Player pool source: league players / all players / generated
- [ ] Draft format: snake / straight / auction
- [ ] Rounds: 22 (default for full roster)
- [ ] Time per pick: unlimited / 30s / 60s / 90s
- [ ] Draft order: random / manual assignment

---

### LB-061: Set Draft Order
**Priority**: P1
**As a** user
**I want** to set the draft order manually or randomly
**So that** teams pick in the desired sequence

**Acceptance Criteria**:
- [ ] "Randomize" button for random order
- [ ] Drag-drop list for manual ordering
- [ ] Snake format: reverses order each round automatically
- [ ] Order preview showing first 3 rounds

---

### LB-062: Run Fantasy Draft
**Priority**: P1
**As a** user
**I want** to execute the fantasy draft with live picking
**So that** I can build my roster through player selection

**Acceptance Criteria**:
- [ ] Draft board showing all picks (rounds × teams grid)
- [ ] Current pick highlighted
- [ ] Available players panel with filters and search
- [ ] User picks for user-controlled teams
- [ ] AI auto-picks for AI teams
- [ ] Timer display if time limit enabled
- [ ] "Auto-pick" button for user to delegate

---

### LB-063: Draft AI Strategy
**Priority**: P1
**As a** developer
**I want** AI teams to draft intelligently
**So that** AI rosters are competitive and realistic

**Acceptance Criteria**:
- [ ] Strategy options: best_available / position_need / balanced
- [ ] Position need awareness (fill required positions first)
- [ ] Grade-based player ranking
- [ ] Slight randomization to avoid identical AI drafts

---

### LB-064: View Draft Results
**Priority**: P1
**As a** user
**I want** to review draft results after completion
**So that** I can see how each team drafted

**Acceptance Criteria**:
- [ ] Team-by-team draft recap
- [ ] Full draft order log
- [ ] Grade analysis per team
- [ ] Export draft results to CSV option

---

### LB-065: Undo/Redo Draft Pick
**Priority**: P2
**As a** user
**I want** to undo a draft pick I made by mistake
**So that** I can correct errors

**Acceptance Criteria**:
- [ ] Undo available for user picks only
- [ ] Cannot undo AI picks
- [ ] Undo/redo stack (last 5 picks)
- [ ] Confirmation before undo

---

### LB-066: Draft Trade
**Priority**: P2
**As a** user
**I want** to trade draft picks with other teams
**So that** I can move up or down in the draft

**Acceptance Criteria**:
- [ ] "Trade Pick" button during draft
- [ ] Select pick(s) to trade
- [ ] Select pick(s) to receive
- [ ] AI acceptance based on value comparison
- [ ] Trade confirmation screen

---

### LB-067: Generate Draft Prospects
**Priority**: P1
**As a** user
**I want** to generate fictional players for the draft pool
**So that** I can draft from a fresh set of prospects

**Acceptance Criteria**:
- [ ] Uses GRADE_ALGORITHM_SPEC.md generation
- [ ] Configure: count, grade distribution, age range
- [ ] Generated players marked with `sourceDatabase: 'Generated'`
- [ ] Integrates with draft player pool

---

## Module: RULES

### LB-070: View Rules Presets
**Priority**: P0
**As a** user
**I want** to see all available rules presets
**So that** I can choose or customize game rules

**Acceptance Criteria**:
- [ ] List of presets: Standard, Quick Play, Full Simulation, Arcade
- [ ] Built-in presets marked as read-only
- [ ] Custom presets editable
- [ ] "Create New Preset" button

---

### LB-071: Create Custom Rules Preset
**Priority**: P1
**As a** user
**I want** to create my own rules preset
**So that** I can play with exactly the settings I prefer

**Acceptance Criteria**:
- [ ] Full RulesPreset editor (per LEAGUE_BUILDER_SPEC.md Section 8.2)
- [ ] Sections: Game, Season, Playoffs, DH, Roster, Economics
- [ ] Advanced sections: Development, Narrative, Stats, AI, Offseason
- [ ] Save creates new preset in `rulesPresets` store

---

### LB-072: Edit Custom Rules Preset
**Priority**: P1
**As a** user
**I want** to modify my custom rules presets
**So that** I can refine my preferred settings

**Acceptance Criteria**:
- [ ] All fields editable
- [ ] Cannot edit built-in presets (must duplicate first)
- [ ] Save updates preset in storage

---

### LB-073: Duplicate Rules Preset
**Priority**: P1
**As a** user
**I want** to duplicate a preset as a starting point
**So that** I can create variations of existing presets

**Acceptance Criteria**:
- [ ] Works for built-in and custom presets
- [ ] Creates "[Original Name] Copy"
- [ ] Opens in edit mode

---

### LB-074: Delete Custom Rules Preset
**Priority**: P2
**As a** user
**I want** to delete custom rules presets I no longer need
**So that** my preset list stays manageable

**Acceptance Criteria**:
- [ ] Cannot delete built-in presets
- [ ] Confirmation dialog
- [ ] Warning if preset is default for any league

---

### LB-075: Game Settings Configuration
**Priority**: P0
**As a** user
**I want** to configure core game settings
**So that** games play according to my preferences

**Acceptance Criteria**:
- [ ] Innings per game: 6, 7, 9
- [ ] Extra innings rule: standard, runner on 2nd, sudden death
- [ ] Mercy rule: enable/disable, run differential, inning threshold
- [ ] Pitch counts: enable/disable, starter limit, reliever limit
- [ ] Mound visits: enable/disable, per-game limit

---

### LB-076: Development Sliders
**Priority**: P1
**As a** user
**I want** to adjust player development parameters
**So that** prospects develop at my preferred pace

**Acceptance Criteria**:
- [ ] Sliders 0-100 for each parameter
- [ ] Prospect development speed
- [ ] Regression age
- [ ] Peak years length
- [ ] Injury frequency and recovery speed
- [ ] Bust rate and breakout rate
- [ ] Tooltips explaining each slider

---

### LB-077: Narrative Settings
**Priority**: P1
**As a** user
**I want** to toggle and configure narrative features
**So that** I can control the storytelling elements

**Acceptance Criteria**:
- [ ] Master toggle: narrative enabled/disabled
- [ ] Random event frequency slider
- [ ] Chemistry impact slider
- [ ] Personality effects slider
- [ ] Media stories toggle
- [ ] Rivalry intensity slider

---

### LB-078: AI Behavior Sliders
**Priority**: P1
**As a** user
**I want** to configure AI team behavior
**So that** AI opponents act the way I prefer

**Acceptance Criteria**:
- [ ] Trade aggressiveness slider
- [ ] Trade acceptance threshold slider
- [ ] Free agency spending slider
- [ ] Rebuild threshold slider
- [ ] Prospect valuation slider
- [ ] Win-now bias slider
- [ ] Salary cap management slider

---

## Module: Season Setup Wizard

### SS-001: New Franchise Entry Point
**Priority**: P0
**As a** user
**I want** to start a new franchise from the main menu
**So that** I can begin a new playthrough

**Acceptance Criteria**:
- [ ] "New Franchise" button on Main Menu
- [ ] Opens Season Setup wizard at Step 1
- [ ] 6-step progress indicator displayed

---

### SS-002: Step 1 - Select League
**Priority**: P0
**As a** user
**I want** to choose a league template for my franchise
**So that** I play with my preferred team configuration

**Acceptance Criteria**:
- [ ] Radio button list of available leagues
- [ ] Each entry shows: name, team count, default rules
- [ ] "Create New League" option links to League Builder
- [ ] Next button enabled when league selected
- [ ] Back button / Cancel returns to Main Menu

---

### SS-003: Step 2 - Season Settings
**Priority**: P0
**As a** user
**I want** to configure regular season parameters
**So that** the season matches my time availability

**Acceptance Criteria**:
- [ ] Quick preset buttons: Standard, Quick Play, Full Season, Custom
- [ ] Games per team selection: 16, 32, 40, 80, 128, 162, custom
- [ ] Innings per game: 6, 7, 9
- [ ] Extra innings rule selection
- [ ] Schedule type: balanced, division heavy, rivalry focused
- [ ] Toggles: All-Star game, Trade deadline, Mercy rule
- [ ] Values default from league's default rules preset

---

### SS-004: Step 3 - Playoff Settings
**Priority**: P0
**As a** user
**I want** to configure playoff structure
**So that** the postseason matches my preferences

**Acceptance Criteria**:
- [ ] Teams qualifying: 4, 6, 8, 10, 12
- [ ] Format: bracket, pool, best record bye
- [ ] Series lengths for each round
- [ ] Home field advantage format
- [ ] Values default from league's default rules preset

---

### SS-005: Step 4 - Team Control Selection
**Priority**: P0
**As a** user
**I want** to select which teams I will control
**So that** I can play single or multiplayer seasons

**Acceptance Criteria**:
- [ ] All teams displayed in conference/division grouping
- [ ] Checkbox or toggle button for each team
- [ ] "Selected" state is visually distinct (sticky highlight)
- [ ] Quick select buttons: Select All, Clear All, Random 1
- [ ] Selected count and AI count displayed
- [ ] Multiplayer toggle (enables player assignment)
- [ ] At least 1 team must be selected to proceed
- [ ] If multiplayer: assign teams to player numbers

---

### SS-006: Step 5 - Roster Mode
**Priority**: P0
**As a** user
**I want** to choose between existing rosters or fantasy draft
**So that** I can start with the roster configuration I prefer

**Acceptance Criteria**:
- [ ] Radio selection: Use Existing Rosters / Fantasy Draft
- [ ] If existing: "View Rosters" preview button
- [ ] If draft: player pool source selection
- [ ] If draft: draft settings (rounds, format, time)
- [ ] If draft: redirects to draft after confirmation

---

### SS-007: Step 6 - Confirm & Start
**Priority**: P0
**As a** user
**I want** to review all settings before starting
**So that** I can verify everything is correct

**Acceptance Criteria**:
- [ ] Franchise name input field
- [ ] Summary of all settings from steps 1-5
- [ ] "Edit Settings" button to jump back to any step
- [ ] Warning about creating new franchise
- [ ] "Start Franchise" button creates franchise and navigates to Season Hub

---

### SS-008: Wizard Navigation
**Priority**: P0
**As a** developer
**I want** consistent navigation throughout the wizard
**So that** users can move between steps easily

**Acceptance Criteria**:
- [ ] Step indicator shows current/completed/pending states
- [ ] Back button returns to previous step
- [ ] Next button validates current step before proceeding
- [ ] Cannot skip steps (clicking future step is no-op)
- [ ] Cancel button prompts confirmation before exiting
- [ ] State preserved when navigating back

---

### SS-009: Wizard State Persistence
**Priority**: P1
**As a** user
**I want** my wizard progress saved if I navigate away
**So that** I don't lose my configuration

**Acceptance Criteria**:
- [ ] Wizard state stored in session storage
- [ ] Returning to setup wizard restores previous state
- [ ] "Start Fresh" option to clear saved state
- [ ] State cleared on franchise creation or cancel

---

### SS-010: Franchise Creation
**Priority**: P0
**As a** developer
**I want** the franchise creation process to work correctly
**So that** new franchises are properly initialized

**Acceptance Criteria**:
- [ ] Create new Franchise record in storage
- [ ] Copy league structure (teams, conferences, divisions)
- [ ] Copy team rosters at creation time
- [ ] Copy and apply rules preset
- [ ] Generate initial schedule based on settings
- [ ] Navigate to Season Hub / Dashboard

---

### SS-011: Validation Errors
**Priority**: P0
**As a** user
**I want** clear error messages when configuration is invalid
**So that** I can fix issues before proceeding

**Acceptance Criteria**:
- [ ] Inline validation errors per field
- [ ] Step-level validation before Next
- [ ] Error messages are descriptive ("At least 1 team required")
- [ ] Focus moves to first error on validation failure

---

### SS-012: Default Values
**Priority**: P1
**As a** user
**I want** sensible defaults pre-selected
**So that** I can quickly start with standard settings

**Acceptance Criteria**:
- [ ] First league pre-selected if only one exists
- [ ] Season settings default to league's rules preset
- [ ] Playoff settings default to league's rules preset
- [ ] No teams pre-selected (explicit user choice required)
- [ ] Roster mode defaults to "Use Existing"

---

## Module: Playoff Mode

### SS-020: Playoff Mode Entry Point
**Priority**: P1
**As a** user
**I want** to start a standalone playoff tournament
**So that** I can play just the postseason

**Acceptance Criteria**:
- [ ] "Playoff Mode" button on Main Menu
- [ ] Opens abbreviated setup wizard (5 steps)
- [ ] Skips season settings

---

### SS-021: Playoff Mode - Select League
**Priority**: P1
**As a** user
**I want** to choose which league's teams compete
**So that** I use the correct team pool

**Acceptance Criteria**:
- [ ] Same as SS-002 but for playoff mode
- [ ] Proceeds to Playoff Settings (skips Season Settings)

---

### SS-022: Playoff Mode - Playoff Settings
**Priority**: P1
**As a** user
**I want** to configure the playoff structure
**So that** the tournament matches my preferences

**Acceptance Criteria**:
- [ ] Same as SS-004
- [ ] Teams qualifying limited by league team count

---

### SS-023: Playoff Mode - Team Control
**Priority**: P1
**As a** user
**I want** to select which playoff teams I control
**So that** I play as my preferred team(s)

**Acceptance Criteria**:
- [ ] Same as SS-005
- [ ] Only shows teams that will be in playoffs

---

### SS-024: Playoff Mode - Seeding
**Priority**: P1
**As a** user
**I want** to set the playoff bracket seeding
**So that** matchups are configured correctly

**Acceptance Criteria**:
- [ ] Auto-seed options: Random, By Grade
- [ ] Manual drag-drop ordering
- [ ] Bracket preview showing matchups
- [ ] Seeding determines home field advantage

---

### SS-025: Playoff Mode - Confirm & Start
**Priority**: P1
**As a** user
**I want** to review and start the playoff tournament
**So that** I begin playing immediately

**Acceptance Criteria**:
- [ ] Tournament name input
- [ ] Settings summary
- [ ] "Start Playoffs" creates playoff instance
- [ ] Navigates to Playoff Bracket view

---

## Implementation Notes

### Priority Guide

| Priority | Meaning | Target |
|----------|---------|--------|
| P0 | Core functionality, MVP | Must have for launch |
| P1 | Important features | Should have for launch |
| P2 | Nice to have | Can defer post-launch |

### Dependencies

```
LB-005 (IndexedDB stores) → All other stories
LB-031 (Create Player) → LB-036 (Generate Players)
LB-034 (Auto Grade) → LB-031, LB-036
LB-035 (Auto Salary) → LB-031, LB-036
LB-021 (Create Team) → LB-050 (View Rosters)
LB-051 (Assign Player) → LB-052 (Set Lineup)
SS-001 to SS-007 are sequential
```

### Estimation

| Module | P0 Stories | P1 Stories | P2 Stories | Est. Days |
|--------|------------|------------|------------|-----------|
| Hub | 3 | 2 | 0 | 2 |
| LEAGUES | 4 | 2 | 0 | 3 |
| TEAMS | 4 | 4 | 0 | 4 |
| PLAYERS | 5 | 4 | 2 | 6 |
| ROSTERS | 4 | 3 | 1 | 4 |
| DRAFT | 0 | 6 | 2 | 5 |
| RULES | 3 | 6 | 1 | 4 |
| Season Setup | 10 | 2 | 0 | 5 |
| Playoff Mode | 0 | 6 | 0 | 3 |
| **Total** | 33 | 35 | 6 | **36 days** |

---

## Changelog

- v1.0 (2026-01-29): Initial story creation from LEAGUE_BUILDER_SPEC.md and SEASON_SETUP_SPEC.md
