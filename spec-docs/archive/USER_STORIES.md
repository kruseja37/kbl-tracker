# KBL Tracker - Complete User Stories

> **Purpose**: Implementation-ready user stories following Ralph Framework
> **Generated**: January 26, 2026
> **Sizing Rule**: Each story < 200 lines of code, max 3 acceptance criteria
> **Scope**: Full MVP - ALL features across 7 phases

---

## Story Format Reference

Each story follows Ralph Framework:
- **"As a... I want... So that..."** format
- **Size Check** with 4 checkboxes
- **Max 3 acceptance criteria** with Given/When/Then/Verify
- **Technical notes** for implementation guidance

---

# PHASE A: FOUNDATION

---

## S-A001: Install React Router ✅ (If not done)

**Parent Feature:** F-A001
**Priority:** P0
**Estimated Size:** Small

**As a** developer
**I want to** have React Router installed and configured
**So that** the app can support multiple pages and navigation

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Package Installed**
- **Given:** The project package.json
- **When:** `npm ls react-router-dom` is run
- **Then:** react-router-dom@7.x is listed
- **Verify:** Run command, confirm version output

**AC-2: BrowserRouter Wraps App**
- **Given:** main.tsx file
- **When:** Developer inspects the file
- **Then:** App is wrapped in `<BrowserRouter>` or `<RouterProvider>`
- **Verify:** Open main.tsx, find BrowserRouter import and usage

**AC-3: Route Definitions Exist**
- **Given:** Router configured
- **When:** App loads at "/"
- **Then:** A route handler matches and renders content
- **Verify:** Open app, confirm content renders without 404

### Technical Notes
- Use react-router-dom v7+ for React 19 compatibility
- Configure in main.tsx or separate router config file
- Create placeholder route for "/" initially

---

## S-A002: Create Routes Configuration

**Parent Feature:** F-A001
**Priority:** P0
**Estimated Size:** Medium

**As a** user
**I want to** access different app sections via URLs
**So that** I can navigate and bookmark specific pages

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Core Routes Defined**
- **Given:** Router configured
- **When:** Developer checks route definitions
- **Then:** Routes exist for: `/`, `/season`, `/game`, `/team/:id`
- **Verify:** Find route array with 4+ route objects

**AC-2: 404 Route Exists**
- **Given:** App running
- **When:** User navigates to `/nonexistent-path`
- **Then:** A "Page Not Found" component renders
- **Verify:** Navigate to bad URL, see 404 content

**AC-3: Back/Forward Navigation Works**
- **Given:** User at `/season`
- **When:** User clicks browser back button after navigating from `/`
- **Then:** App returns to `/` without full page reload
- **Verify:** Navigate, click back, confirm SPA navigation

### Technical Notes
- Use createBrowserRouter for type-safe routing
- Include errorElement for route errors
- Placeholder components for routes initially

---

## S-A003: Create MainMenu Component

**Parent Feature:** F-A002
**Priority:** P0
**Estimated Size:** Medium

**As a** user
**I want to** see a home screen with navigation options
**So that** I can access different features of the app

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: MainMenu Renders at Root**
- **Given:** App loaded
- **When:** User navigates to `/`
- **Then:** MainMenu component with app title visible
- **Verify:** Open app, see "KBL Tracker" or logo

**AC-2: Navigation Cards Visible**
- **Given:** MainMenu displayed
- **When:** User views the screen
- **Then:** Cards/buttons for "New Game", "Season", "Teams" are visible
- **Verify:** Count 3+ navigation options

**AC-3: Navigation Works**
- **Given:** "Season" card visible
- **When:** User clicks it
- **Then:** URL changes to `/season`
- **Verify:** Click card, confirm URL and content change

### Technical Notes
- New file: `src/pages/MainMenu.tsx`
- Use Tailwind for styling
- Link to routes defined in S-A002

---

## S-A004: Create NavigationHeader Component

**Parent Feature:** F-A003
**Priority:** P0
**Estimated Size:** Medium

**As a** user
**I want to** see a persistent header for navigation
**So that** I can always navigate and see my context

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Header Visible on All Pages**
- **Given:** User on `/season` page
- **When:** User views the top of the screen
- **Then:** Navigation header is visible
- **Verify:** Navigate to multiple routes, confirm header present

**AC-2: Home Link Works**
- **Given:** Header visible
- **When:** User clicks logo or home icon
- **Then:** URL changes to `/`
- **Verify:** Click home, confirm navigation

**AC-3: Sticky Position**
- **Given:** Long page content
- **When:** User scrolls down
- **Then:** Header remains visible at top
- **Verify:** Scroll, confirm header stays fixed

### Technical Notes
- New file: `src/components/NavigationHeader.tsx`
- Use `position: sticky` or `fixed`
- Include in root layout component

---

## S-A005: Create SeasonDashboard Component

**Parent Feature:** F-A004
**Priority:** P0
**Estimated Size:** Large

**As a** user
**I want to** see a dashboard with season status
**So that** I know where I am in the season at a glance

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Dashboard Renders**
- **Given:** Season exists
- **When:** User navigates to `/season`
- **Then:** SeasonDashboard component renders with content
- **Verify:** Navigate, see dashboard content

**AC-2: Progress Shown**
- **Given:** Season with 10 games played of 48
- **When:** User views dashboard
- **Then:** Progress indicator shows "10/48" or ~21%
- **Verify:** Find progress element with game count

**AC-3: No Season State Handled**
- **Given:** No season started
- **When:** User navigates to `/season`
- **Then:** "No season started" message with "Start Season" button shown
- **Verify:** Clear season data, reload, see message

### Technical Notes
- New file: `src/pages/SeasonDashboard.tsx`
- Pull season data from seasonStorage
- Handle loading and empty states

---

## S-A006: Create GlobalStateProvider

**Parent Feature:** F-A006
**Priority:** P0
**Estimated Size:** Medium

**As a** developer
**I want to** global state management for shared data
**So that** components can access season/team/preferences anywhere

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Context Provider Created**
- **Given:** src/context folder
- **When:** Developer checks files
- **Then:** AppContext.tsx exists with createContext and AppProvider
- **Verify:** Find file with context creation

**AC-2: Provider Wraps App**
- **Given:** main.tsx
- **When:** Developer inspects
- **Then:** AppProvider wraps the app tree
- **Verify:** Find AppProvider in main.tsx

**AC-3: Hook Available**
- **Given:** Any component
- **When:** Developer imports useAppContext
- **Then:** Hook returns context values (season, team, etc.)
- **Verify:** Import hook, log values in any component

### Technical Notes
- New file: `src/context/AppContext.tsx`
- Include: currentSeason, selectedTeam, preferences
- Export useAppContext hook

---

## S-A007: Add IndexedDB State Hydration

**Parent Feature:** F-A006
**Priority:** P0
**Estimated Size:** Medium

**As a** user
**I want to** my state to persist across page refreshes
**So that** I don't lose my progress

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: State Loads on App Start**
- **Given:** Previous session had team "Sirloins" selected
- **When:** App refreshes and loads
- **Then:** Global state shows "Sirloins" as selected team
- **Verify:** Select team, refresh, confirm selection persists

**AC-2: Loading State Shown**
- **Given:** App starting
- **When:** IndexedDB loading (may be instant)
- **Then:** Loading indicator shown until hydration complete
- **Verify:** Throttle network, observe loading state

**AC-3: Graceful Fallback**
- **Given:** IndexedDB unavailable (private mode)
- **When:** App starts
- **Then:** App functions with default state, no crash
- **Verify:** Block IndexedDB, confirm app loads

### Technical Notes
- Use existing IndexedDB patterns from seasonStorage
- Add hydration effect in AppProvider
- Set isLoading flag during hydration

---

## S-A008: Create TeamSelector Component

**Parent Feature:** F-A005
**Priority:** P0
**Estimated Size:** Medium

**As a** user
**I want to** select which team I'm managing
**So that** I see relevant data throughout the app

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Team Dropdown Renders**
- **Given:** Teams exist in database
- **When:** User views TeamSelector
- **Then:** Dropdown shows all available teams
- **Verify:** Click dropdown, see team list

**AC-2: Selection Updates Context**
- **Given:** "Beewolves" selected in dropdown
- **When:** Selection confirmed
- **Then:** Global state selectedTeam equals "Beewolves"
- **Verify:** Select team, log context value

**AC-3: Selection Persists**
- **Given:** "Beewolves" selected
- **When:** Page refreshes
- **Then:** TeamSelector shows "Beewolves" as selected
- **Verify:** Select, refresh, confirm persistence

### Technical Notes
- New file: `src/components/TeamSelector.tsx`
- Use useAppContext for state
- Persist to localStorage or IndexedDB

---

## S-A009: Create PlayerRatingsForm Component

**Parent Feature:** F-A007
**Priority:** P0
**Estimated Size:** Large

**As a** user
**I want to** input player ratings
**So that** salary can be calculated

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Position Player Fields**
- **Given:** Position player selected
- **When:** Form renders
- **Then:** 5 inputs visible: Power, Contact, Speed, Fielding, Arm
- **Verify:** Count 5 labeled inputs for position player

**AC-2: Pitcher Fields**
- **Given:** Pitcher selected
- **When:** Form renders
- **Then:** 3 inputs visible: Velocity, Junk, Accuracy
- **Verify:** Count 3 labeled inputs for pitcher

**AC-3: Save Works**
- **Given:** Ratings entered (Power: 75, etc.)
- **When:** User clicks Save
- **Then:** Ratings stored and retrievable for that player
- **Verify:** Save, reload, confirm ratings persist

### Technical Notes
- New file: `src/components/PlayerRatingsForm.tsx`
- Validate 0-99 range
- Store in playerRatings IndexedDB store

---

## S-A010: Create LeagueBuilder Component

**Parent Feature:** F-A008
**Priority:** P0
**Estimated Size:** Large

**As a** user
**I want to** set up a league with teams
**So that** I can start a season

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Team Selection Available**
- **Given:** Available teams in database
- **When:** LeagueBuilder renders
- **Then:** Checkboxes or multi-select for team selection visible
- **Verify:** See team selection UI with all teams

**AC-2: Minimum Team Validation**
- **Given:** Only 1 team selected
- **When:** User tries to create league
- **Then:** Error "Minimum 2 teams required" shown
- **Verify:** Select 1 team, try create, see error

**AC-3: League Saves**
- **Given:** 4 teams selected
- **When:** User clicks "Create League"
- **Then:** League configuration stored
- **Verify:** Create, confirm league data in storage

### Technical Notes
- New file: `src/pages/LeagueBuilder.tsx`
- Store league config to IndexedDB
- Link to season creation flow

---

## S-A011: Create ManualPlayerInput Component

**Parent Feature:** F-A009
**Priority:** P0
**Estimated Size:** Large

**As a** user
**I want to** manually add individual players
**So that** I can create one-off players

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Basic Fields Present**
- **Given:** ManualPlayerInput renders
- **When:** User views form
- **Then:** Inputs for Name, Team, Position, Handedness visible
- **Verify:** Find 4 required field inputs

**AC-2: Player Saves to Database**
- **Given:** Name "Test Player", Team "Sirloins", Position "SS"
- **When:** User submits form
- **Then:** Player retrievable from database
- **Verify:** Save, query database, find player

**AC-3: Validation Works**
- **Given:** Name field empty
- **When:** User tries to submit
- **Then:** Error message appears, submit blocked
- **Verify:** Try submit with empty name, see error

### Technical Notes
- New file: `src/components/ManualPlayerInput.tsx`
- Embed PlayerRatingsForm (S-A009) for ratings
- Use playerDatabase functions to save

---

## S-A012: Display Team Names in Scoreboard

**Parent Feature:** F-A010
**Priority:** P0
**Estimated Size:** Small

**As a** user tracking a game
**I want to** see team names in the scoreboard
**So that** I know which team is which

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Away Team Name Displays**
- **Given:** Game with "Sirloins" vs "Beewolves"
- **When:** User views scoreboard
- **Then:** "Sirloins" text visible in away position
- **Verify:** Inspect scoreboard, find team name

**AC-2: Home Team Name Displays**
- **Given:** Game with "Sirloins" vs "Beewolves"
- **When:** User views scoreboard
- **Then:** "Beewolves" text visible in home position
- **Verify:** Inspect scoreboard, find team name

**AC-3: Names Positioned Correctly**
- **Given:** Scoreboard displayed
- **When:** User views layout
- **Then:** Away name above/left of away score, home name above/left of home score
- **Verify:** Visual alignment check

### Technical Notes
- Edit: `src/components/GameTracker/Scoreboard.tsx`
- Props may already exist - verify they're being passed
- Truncate if > 12 characters

---

## S-A013: Add Visible Undo Button

**Parent Feature:** F-A011
**Priority:** P0
**Estimated Size:** Small

**As a** user who made a mistake
**I want to** click an undo button
**So that** I can reverse the last action

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Button Visible**
- **Given:** GameTracker loaded
- **When:** User views UI
- **Then:** "Undo" button or ↶ icon visible
- **Verify:** Find undo button element

**AC-2: Initially Disabled**
- **Given:** Fresh game, no actions taken
- **When:** User views undo button
- **Then:** Button appears disabled
- **Verify:** Check disabled attribute or opacity

**AC-3: Enables After Action**
- **Given:** User records a hit
- **When:** At-bat completes
- **Then:** Undo button enabled
- **Verify:** Click undo, confirm it works

### Technical Notes
- Edit: `src/components/GameTracker/index.tsx`
- Wire to existing handleUndo function
- undoStack already tracks 10 states

---

## S-A014: Make Current Batter Name Clickable

**Parent Feature:** F-A012
**Priority:** P0
**Estimated Size:** Small

**As a** user viewing the current batter
**I want to** click their name to see full stats
**So that** I can check player details quickly

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Cursor Changes on Hover**
- **Given:** Batter name displayed
- **When:** User hovers over name
- **Then:** Cursor becomes pointer
- **Verify:** Hover, observe cursor change

**AC-2: Click Opens PlayerCard**
- **Given:** "Madoka Hayata" as batter
- **When:** User clicks name
- **Then:** PlayerCard modal opens with "Madoka Hayata"
- **Verify:** Click, see modal with player name

**AC-3: Modal Shows Data**
- **Given:** PlayerCard open
- **When:** User views modal
- **Then:** Position, handedness, and stats visible
- **Verify:** Read modal content

### Technical Notes
- Add onClick handler to batter name span
- Add state: selectedPlayerId, showPlayerCard
- Render PlayerCard when state set

---

## S-A015: Make Due-Up Names Clickable

**Parent Feature:** F-A012
**Priority:** P0
**Estimated Size:** Small

**As a** user viewing the due-up list
**I want to** click any player name for their stats
**So that** I can scout upcoming batters

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: All Names Clickable**
- **Given:** Due-up list shows 4 players
- **When:** User hovers each name
- **Then:** All show pointer cursor
- **Verify:** Hover all 4, confirm cursor change

**AC-2: Click Opens Correct Player**
- **Given:** "Damien Rush" second in due-up
- **When:** User clicks "Damien Rush"
- **Then:** PlayerCard shows Damien Rush data
- **Verify:** Click second name, confirm correct player

**AC-3: Works for All Positions**
- **Given:** Due-up with 4 different players
- **When:** User clicks each (closing modal between)
- **Then:** Each shows correct player
- **Verify:** Click all 4, confirm each is different/correct

### Technical Notes
- Reuse click handler pattern from S-A014
- Map handler to each due-up name element

---

## S-A016: Create Lineup View Panel

**Parent Feature:** F-A013
**Priority:** P0
**Estimated Size:** Large

**As a** user during a game
**I want to** view the current lineup
**So that** I can see who plays where

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Button Opens Panel**
- **Given:** "View Lineup" button visible
- **When:** User clicks button
- **Then:** Lineup panel appears
- **Verify:** Click button, see panel

**AC-2: Shows 9 Positions**
- **Given:** Panel open
- **When:** User counts entries
- **Then:** Exactly 9 batting order positions shown
- **Verify:** Count entries, confirm 9

**AC-3: Shows Names and Positions**
- **Given:** Panel open
- **When:** User reads entries
- **Then:** Each shows player name and defensive position
- **Verify:** Read entries, find name + position (e.g., "Hayata - SS")

### Technical Notes
- New file: `src/components/GameTracker/LineupPanel.tsx`
- Map through lineupState.currentLineup
- Toggle with showLineupPanel state

---

## S-A017: Add Mojo Indicators to Lineup Panel

**Parent Feature:** F-A013
**Priority:** P0
**Estimated Size:** Medium

**As a** user viewing the lineup
**I want to** see each player's mojo level
**So that** I identify who is hot or cold

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Indicator Visible**
- **Given:** Lineup panel open
- **When:** User views any player row
- **Then:** Mojo indicator (badge/icon) visible
- **Verify:** Find mojo element next to each name

**AC-2: Color Coded**
- **Given:** Player with mojo +2
- **When:** User views indicator
- **Then:** Indicator is blue/gold (not red)
- **Verify:** Check indicator color matches state

**AC-3: All Players Have Indicator**
- **Given:** 9 players in lineup
- **When:** User views panel
- **Then:** All 9 have mojo indicators
- **Verify:** Count indicators, confirm 9

### Technical Notes
- Colors: -2=red, -1=orange, 0=gray, +1=green, +2=blue
- May use placeholder 0 until mojo fully tracked

---

## S-A018: Add Fitness Indicators to Lineup Panel

**Parent Feature:** F-A013
**Priority:** P0
**Estimated Size:** Medium

**As a** user viewing the lineup
**I want to** see each player's fitness status
**So that** I identify tired or injured players

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Fitness Indicator Visible**
- **Given:** Lineup panel open
- **When:** User views any player row
- **Then:** Fitness indicator (distinct from mojo) visible
- **Verify:** Find second indicator element

**AC-2: Represents 6 States**
- **Given:** Fitness indicator displayed
- **When:** User hovers for tooltip
- **Then:** Shows one of: Hurt, Weak, Strained, Well, Fit, Juiced
- **Verify:** Hover, read tooltip

**AC-3: All Players Have Indicator**
- **Given:** 9 players in lineup
- **When:** User views panel
- **Then:** All 9 have fitness indicators
- **Verify:** Count indicators, confirm 9

### Technical Notes
- Place next to mojo indicator
- Use different icon set from mojo

---

## S-A019: Display Pitch Count

**Parent Feature:** F-A014
**Priority:** P0
**Estimated Size:** Small

**As a** user tracking a game
**I want to** see the pitcher's pitch count
**So that** I can decide when to make a change

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Pitch Count Visible**
- **Given:** Game in progress
- **When:** User views pitcher area
- **Then:** "Pitches: XX" or similar displayed
- **Verify:** Find pitch count text

**AC-2: Updates After At-Bat**
- **Given:** Pitch count at 15
- **When:** At-bat with 4+ pitches completes
- **Then:** Pitch count increases to 19+
- **Verify:** Note count, record at-bat, confirm increase

**AC-3: Starts at 0**
- **Given:** Fresh game started
- **When:** First batter appears
- **Then:** Pitch count shows 0
- **Verify:** Start game, see "Pitches: 0"

### Technical Notes
- Display near scoreboard or pitcher info
- May need to track pitches per at-bat

---

## S-A020: Add Batter Mojo Badge

**Parent Feature:** F-A015
**Priority:** P0
**Estimated Size:** Small

**As a** user viewing the current batter
**I want to** see their mojo status
**So that** I know if they're hot or slumping

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Badge Visible**
- **Given:** Current batter displayed
- **When:** User views batter area
- **Then:** Mojo badge visible near batter name
- **Verify:** Find badge element

**AC-2: Has Tooltip**
- **Given:** Mojo badge displayed
- **When:** User hovers
- **Then:** Tooltip shows state name (e.g., "Jacked")
- **Verify:** Hover, read tooltip

### Technical Notes
- Reuse mojo color scheme
- Position next to batter name display

---

## S-A021: Add Pitcher Fitness Badge

**Parent Feature:** F-A015
**Priority:** P0
**Estimated Size:** Small

**As a** user viewing the current pitcher
**I want to** see their fitness status
**So that** I know when they might be tiring

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Badge Visible**
- **Given:** Pitcher displayed
- **When:** User views pitcher info
- **Then:** Fitness badge visible
- **Verify:** Find badge near pitcher name/info

**AC-2: Near Pitch Count**
- **Given:** Pitch count and fitness badge displayed
- **When:** User views layout
- **Then:** Badge within visual proximity of pitch count
- **Verify:** Visual layout check

### Technical Notes
- Position near pitch count for easy scanning

---

## S-A022: Fix Exit Type Double Entry

**Parent Feature:** F-A016
**Priority:** P0
**Estimated Size:** Medium

**As a** user recording an at-bat
**I want to** select exit type once
**So that** I don't have to click twice

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Single Click Flow**
- **Given:** At-bat in progress
- **When:** User clicks "GO" button
- **Then:** Modal/flow proceeds without second exit type click
- **Verify:** Click GO, count clicks to complete

**AC-2: Exit Type in Modal**
- **Given:** Fielding modal open
- **When:** User views modal
- **Then:** Exit type options integrated in modal
- **Verify:** Find exit type selector in modal

**AC-3: Total Clicks ≤ 3**
- **Given:** GO selected
- **When:** User completes at-bat
- **Then:** Requires ≤ 3 clicks from result to completion
- **Verify:** Count clicks: GO → fields → confirm

### Technical Notes
- Edit: `src/components/GameTracker/AtBatFlow.tsx`
- Consolidate exit type into fielding modal
- Remove duplicate popup

---

# SUMMARY

This file contains Phase A foundation stories. Additional phases (B through G) are documented in separate files to prevent context overflow:

- **STORIES_PHASE_B.md** - Core Game Loop (Pre-game, Post-game, etc.)
- **STORIES_PHASE_C.md** - Season Infrastructure
- **STORIES_PHASE_D.md** - Awards & Recognition
- **STORIES_PHASE_E.md** - Offseason System
- **STORIES_PHASE_F.md** - Advanced Systems
- **STORIES_PHASE_G.md** - Polish & History

## Phase A Story Count

| ID Range | Feature | Stories |
|----------|---------|---------|
| S-A001-A002 | React Router | 2 |
| S-A003-A005 | Navigation/Dashboard | 3 |
| S-A006-A007 | Global State | 2 |
| S-A008 | Team Selector | 1 |
| S-A009 | Player Ratings | 1 |
| S-A010 | League Builder | 1 |
| S-A011 | Manual Player | 1 |
| S-A012-A015 | Scoreboard/PlayerCard | 4 |
| S-A016-A018 | Lineup Panel | 3 |
| S-A019-A021 | Display Enhancements | 3 |
| S-A022 | Bug Fix | 1 |
| **Total Phase A** | | **22** |

---

*All stories follow Ralph Framework: < 200 lines, max 3 acceptance criteria, Given/When/Then/Verify format.*
