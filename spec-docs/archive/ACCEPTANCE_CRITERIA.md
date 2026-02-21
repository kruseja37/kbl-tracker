# KBL Tracker - Acceptance Criteria

> **Purpose**: Objectively verifiable acceptance criteria for all user stories
> **Generated**: January 26, 2026
> **Rule**: NO subjective language - all criteria must be verifiable by someone unfamiliar with the project

---

## Phase 1: Foundation & Bug Fixes

### Acceptance Criteria for S-001: Install Tailwind CSS ✅ VERIFIED

**AC-1: Tailwind Dependencies Installed** ✅ PASS
- **Given:** The project with current package.json
- **When:** Run `npm install -D tailwindcss postcss autoprefixer`
- **Then:** package.json devDependencies contains tailwindcss, postcss, and autoprefixer
- **Verified:** January 26, 2026 - Dependencies installed

**AC-2: Tailwind Config Created** ✅ PASS
- **Given:** Tailwind dependencies installed
- **When:** Run `npx tailwindcss init -p`
- **Then:** Files `tailwind.config.js` and `postcss.config.js` exist in project root
- **Verified:** January 26, 2026 - Config files created

**AC-3: Build Completes Successfully** ✅ PASS
- **Given:** Tailwind configured with content paths `./src/**/*.{js,ts,jsx,tsx}`
- **When:** Run `npm run build`
- **Then:** Build exits with code 0, no errors in output
- **Verified:** January 26, 2026 - Tailwind directives added to src/index.css

---

### Acceptance Criteria for S-002: Wire Team Names to Scoreboard

**AC-1: Away Team Name Displays**
- **Given:** GameTracker loads with teams "Sirloins" vs "Beewolves"
- **When:** User views the scoreboard area
- **Then:** Text "Sirloins" is visible in the scoreboard
- **Verify:** Open dev tools, inspect scoreboard, find text node containing "Sirloins"

**AC-2: Home Team Name Displays**
- **Given:** GameTracker loads with teams "Sirloins" vs "Beewolves"
- **When:** User views the scoreboard area
- **Then:** Text "Beewolves" is visible in the scoreboard
- **Verify:** Open dev tools, inspect scoreboard, find text node containing "Beewolves"

**AC-3: Team Names Position Correctly**
- **Given:** Scoreboard displayed
- **When:** User views team names
- **Then:** Away team name appears on left/above, home team name appears on right/below (matching score positions)
- **Verify:** Visual inspection confirms away team (left) and home team (right) alignment with scores

---

### Acceptance Criteria for S-003: Make Current Batter Name Clickable

**AC-1: Batter Name Has Cursor Pointer**
- **Given:** GameTracker loaded with a batter at plate
- **When:** User hovers mouse over current batter's name
- **Then:** Cursor changes to pointer (hand icon)
- **Verify:** Hover over batter name, observe cursor style change

**AC-2: Click Opens PlayerCard**
- **Given:** Current batter "Madoka Hayata" is displayed
- **When:** User clicks on "Madoka Hayata" text
- **Then:** A modal appears with title containing "Madoka Hayata"
- **Verify:** Click name, observe modal with player name in header

**AC-3: PlayerCard Shows Player Data**
- **Given:** PlayerCard modal opened for Madoka Hayata
- **When:** Modal is displayed
- **Then:** Modal shows at least: position (SS), batting side (R), and a stats section
- **Verify:** Read modal content, confirm position/batting info present

---

### Acceptance Criteria for S-004: Make Due-Up List Names Clickable

**AC-1: Due-Up Names Have Cursor Pointer**
- **Given:** GameTracker shows due-up list with multiple players
- **When:** User hovers over any player name in due-up list
- **Then:** Cursor changes to pointer
- **Verify:** Hover over each due-up name, confirm cursor change on all

**AC-2: Click Opens Correct PlayerCard**
- **Given:** Due-up list shows "Damien Rush" as second batter
- **When:** User clicks on "Damien Rush"
- **Then:** PlayerCard modal opens showing "Damien Rush" data
- **Verify:** Click second due-up name, confirm modal shows that specific player

**AC-3: Multiple Players Accessible**
- **Given:** Due-up list shows 4 players
- **When:** User clicks each name in sequence (closing modal between)
- **Then:** Each click opens correct PlayerCard for that player
- **Verify:** Click all 4, confirm each shows different correct player

---

### Acceptance Criteria for S-005: Add Undo Button to UI

**AC-1: Undo Button Visible**
- **Given:** GameTracker loaded
- **When:** User views the UI
- **Then:** A button labeled "Undo" or with undo icon (↶) is visible
- **Verify:** Visual scan of UI finds undo button

**AC-2: Undo Button Initially Disabled**
- **Given:** Fresh game started, no actions taken
- **When:** User views undo button
- **Then:** Button appears disabled (grayed out, opacity reduced, or `disabled` attribute)
- **Verify:** Inspect button element, confirm disabled state or visual indicator

**AC-3: Undo Button Enables After Action**
- **Given:** User records a hit (e.g., click "1B", confirm in modal)
- **When:** At-bat completes and next batter shown
- **Then:** Undo button is now enabled (full opacity, clickable)
- **Verify:** Click undo button, confirm it responds (action undoes)

---

## Phase 2: Lineup & Display Components

### Acceptance Criteria for S-006: Create Lineup View Button

**AC-1: Lineup Button Visible**
- **Given:** GameTracker loaded
- **When:** User views the substitution/control area
- **Then:** A button labeled "View Lineup" or "Lineup" is visible
- **Verify:** Find button with text containing "Lineup"

**AC-2: Button Responds to Click**
- **Given:** Lineup button visible
- **When:** User clicks the button
- **Then:** UI state changes (panel opens or state toggles)
- **Verify:** Click button, observe visual change

---

### Acceptance Criteria for S-007: Create Lineup Panel Structure

**AC-1: Panel Shows 9 Batting Positions**
- **Given:** Lineup panel opened
- **When:** User counts the player entries
- **Then:** Exactly 9 rows/entries are displayed (1-9 batting order)
- **Verify:** Count visible player entries, confirm 9 total

**AC-2: Each Entry Shows Player Name**
- **Given:** Lineup panel with 9 entries
- **When:** User reads each entry
- **Then:** Each shows a player name (text is not empty or "undefined")
- **Verify:** Read each entry, confirm non-empty player names

**AC-3: Each Entry Shows Defensive Position**
- **Given:** Lineup panel with 9 entries
- **When:** User reads each entry
- **Then:** Each shows a defensive position abbreviation (P, C, 1B, 2B, 3B, SS, LF, CF, RF, or DH)
- **Verify:** Read each entry, confirm valid position abbreviation present

---

### Acceptance Criteria for S-008: Add Mojo Indicators to Lineup Panel

**AC-1: Mojo Indicator Present**
- **Given:** Lineup panel open
- **When:** User views any player entry
- **Then:** A mojo indicator (badge, icon, or number) is visible next to name
- **Verify:** Inspect entry, find mojo element

**AC-2: Indicator Uses Color Coding**
- **Given:** Player with mojo = +2 (Jacked)
- **When:** User views that player's entry
- **Then:** Mojo indicator has blue/green coloring (not gray/red)
- **Verify:** Compare indicator color to expected color scheme

**AC-3: Mojo Range Represented**
- **Given:** Lineup with various mojo levels
- **When:** User views indicators
- **Then:** Different mojo levels show different colors (-2=red, -1=orange, 0=gray, +1=green, +2=blue)
- **Verify:** If testable, set different mojos and observe color variation

---

### Acceptance Criteria for S-009: Add Fitness Indicators to Lineup Panel

**AC-1: Fitness Indicator Present**
- **Given:** Lineup panel open
- **When:** User views any player entry
- **Then:** A fitness indicator is visible (distinct from mojo indicator)
- **Verify:** Inspect entry, find second indicator element

**AC-2: Fitness States Represented**
- **Given:** Fitness indicator displayed
- **When:** User hovers or views the indicator
- **Then:** Indicator shows/represents one of: Hurt, Weak, Strained, Well, Fit, Juiced
- **Verify:** Tooltip or visual matches one of 6 defined states

---

### Acceptance Criteria for S-010: Display Pitch Count in UI

**AC-1: Pitch Count Visible**
- **Given:** Game in progress with pitches thrown
- **When:** User views pitcher info area or scoreboard
- **Then:** A number is displayed labeled "Pitches:" or "PC:"
- **Verify:** Find text containing pitch count value

**AC-2: Pitch Count Updates**
- **Given:** Pitch count shows 15
- **When:** User records another at-bat (e.g., strikeout requiring 3+ pitches)
- **Then:** Pitch count increases to 18 or more
- **Verify:** Record at-bat, observe pitch count increase

---

### Acceptance Criteria for S-011: Wire Career Display Button

**AC-1: Career Button Visible**
- **Given:** GameTracker or main app loaded
- **When:** User looks for navigation options
- **Then:** A button/tab labeled "Career" or "Career Stats" is visible
- **Verify:** Find career access button

**AC-2: Button Opens Career Display**
- **Given:** Career button exists
- **When:** User clicks the button
- **Then:** CareerDisplay component renders (shows career stats header)
- **Verify:** Click button, observe career leaderboard content

---

## Phase 3: Game Setup

### Acceptance Criteria for S-012: Create Game Setup Modal Shell

**AC-1: Modal Renders**
- **Given:** App loads before game started
- **When:** Game setup triggered
- **Then:** A modal overlay appears with visible container
- **Verify:** Modal element present in DOM, visible

**AC-2: Modal Has Close Option**
- **Given:** Game setup modal open
- **When:** User looks for close/cancel
- **Then:** An X button or "Cancel" button is present
- **Verify:** Find close/cancel element

**AC-3: Start Game Button Present**
- **Given:** Game setup modal open
- **When:** User views modal content
- **Then:** A "Start Game" button is visible (may be disabled)
- **Verify:** Find button with text "Start Game"

---

### Acceptance Criteria for S-013: Add Team Selection to Game Setup

**AC-1: Away Team Dropdown Exists**
- **Given:** Game setup modal open
- **When:** User views the modal
- **Then:** A dropdown/select labeled "Away Team" exists with options
- **Verify:** Find select element, confirm it has team options

**AC-2: Home Team Dropdown Exists**
- **Given:** Game setup modal open
- **When:** User views the modal
- **Then:** A dropdown/select labeled "Home Team" exists with options
- **Verify:** Find select element, confirm it has team options

**AC-3: Team Options Include Database Teams**
- **Given:** Team dropdowns present
- **When:** User opens a dropdown
- **Then:** Options include "Sirloins" and "Beewolves"
- **Verify:** Click dropdown, verify team names in options

---

### Acceptance Criteria for S-014: Add Starting Pitcher Selection to Game Setup

**AC-1: Pitcher Selector Appears After Team Selection**
- **Given:** Away team "Sirloins" selected
- **When:** Selection confirmed
- **Then:** A pitcher dropdown for Sirloins appears with rotation pitchers
- **Verify:** Select team, observe pitcher dropdown appears

**AC-2: Pitcher Options Are From Team Rotation**
- **Given:** Sirloins pitcher dropdown open
- **When:** User views options
- **Then:** Options include "Hurley Bender" (S-grade starter from database)
- **Verify:** Click dropdown, find Hurley Bender in options

**AC-3: Both Teams Have Pitcher Selection**
- **Given:** Both teams selected
- **When:** User views modal
- **Then:** Both away and home have pitcher dropdown
- **Verify:** Confirm two pitcher selectors visible

---

### Acceptance Criteria for S-015: Wire Game Setup to GameTracker

**AC-1: Start Game Uses Selected Teams**
- **Given:** Away team "Beewolves", Home team "Sirloins" selected
- **When:** User clicks "Start Game"
- **Then:** Scoreboard shows "Beewolves @ Sirloins"
- **Verify:** Observe scoreboard team names match selections

**AC-2: Selected Pitcher Is Starting**
- **Given:** Hurley Bender selected as Sirloins starter
- **When:** Game starts and Sirloins are home team batting first
- **Then:** Current pitcher shown is Hurley Bender
- **Verify:** Check pitcher display matches selection (when applicable)

**AC-3: Modal Closes After Start**
- **Given:** Game setup complete
- **When:** User clicks "Start Game"
- **Then:** Modal disappears, game view is shown
- **Verify:** Modal element no longer visible, game UI active

---

## Phase 4: Bug Fixes

### Acceptance Criteria for S-016: Fix Exit Type Double Entry

**AC-1: Single Click Flow**
- **Given:** At-bat in progress
- **When:** User clicks result button (e.g., "GO")
- **Then:** Flow proceeds without requiring a second click for exit type
- **Verify:** Click GO once, observe modal or next step without redundant click

**AC-2: Exit Type Selected In Modal**
- **Given:** Result selected and modal open
- **When:** User views fielding modal
- **Then:** Exit type options are available within the modal (not separate popup)
- **Verify:** Modal contains exit type selection inline

**AC-3: Flow Completes Without Extra Steps**
- **Given:** GO selected, exit type selected, fielder confirmed
- **When:** User clicks confirm
- **Then:** At-bat records and next batter appears without extra prompts
- **Verify:** Count clicks from GO to completion - should be ≤3 clicks

---

## Phase 5: Summaries & Enhancements

### Acceptance Criteria for S-017: Create Inning End Summary Modal Shell

**AC-1: Modal Appears on Inning End**
- **Given:** Bottom of 1st with 2 outs
- **When:** Third out recorded
- **Then:** A summary modal appears
- **Verify:** Record third out, observe modal popup

**AC-2: Modal Auto-Dismisses**
- **Given:** Inning summary modal showing
- **When:** User waits 3-4 seconds
- **Then:** Modal disappears automatically
- **Verify:** Time the display, confirm auto-dismiss at ~3 seconds

**AC-3: Modal Dismissible by Click**
- **Given:** Inning summary modal showing
- **When:** User clicks anywhere on modal or background
- **Then:** Modal closes immediately
- **Verify:** Click modal, confirm immediate close

---

### Acceptance Criteria for S-018: Add Stats to Inning End Summary

**AC-1: Runs Displayed**
- **Given:** Inning where 2 runs scored
- **When:** Inning ends and summary shows
- **Then:** Summary shows "Runs: 2" or "2 R"
- **Verify:** Score 2 runs, end inning, read summary

**AC-2: Hits Displayed**
- **Given:** Inning with 3 hits
- **When:** Summary shows
- **Then:** Summary shows "Hits: 3" or "3 H"
- **Verify:** Record 3 hits, end inning, read summary

**AC-3: LOB Displayed**
- **Given:** Inning ends with runner on second
- **When:** Summary shows
- **Then:** Summary shows "LOB: 1" or "1 LOB"
- **Verify:** Leave runner on base, end inning, read summary

---

### Acceptance Criteria for S-019: Add Mojo Badge to Current Batter

**AC-1: Badge Visible Next to Batter Name**
- **Given:** Current batter displayed
- **When:** User views batter area
- **Then:** A colored badge/icon appears adjacent to batter name
- **Verify:** Find visual element next to name text

**AC-2: Badge Color Matches Mojo State**
- **Given:** Batter with Jacked mojo (+2)
- **When:** User views badge
- **Then:** Badge color is blue/bright green (not red/orange/gray)
- **Verify:** Compare badge color to expected scheme

---

### Acceptance Criteria for S-020: Add Fitness Badge to Current Pitcher

**AC-1: Badge Visible in Pitcher Info**
- **Given:** Pitcher displayed
- **When:** User views pitcher area
- **Then:** A fitness indicator badge is visible
- **Verify:** Find fitness element in pitcher display

**AC-2: Badge Near Pitch Count**
- **Given:** Pitch count and fitness badge displayed
- **When:** User views pitcher area
- **Then:** Fitness badge is within 100 pixels of pitch count display
- **Verify:** Visual proximity check or inspector measurement

---

## Phase 6: Double Switch

### Acceptance Criteria for S-021: Create Double Switch Button

**AC-1: Button Visible in Substitution Area**
- **Given:** GameTracker loaded (NL rules / no DH)
- **When:** User views substitution buttons
- **Then:** "Double Switch" button is visible
- **Verify:** Find button with text "Double Switch"

**AC-2: Button Opens Modal**
- **Given:** Double Switch button visible
- **When:** User clicks button
- **Then:** A modal appears with double switch options
- **Verify:** Click button, observe modal

---

### Acceptance Criteria for S-022: Create Double Switch Modal Structure

**AC-1: Pitcher Selection Present**
- **Given:** Double switch modal open
- **When:** User views modal
- **Then:** A dropdown to select incoming pitcher exists
- **Verify:** Find pitcher selector element

**AC-2: Position Player Selection Present**
- **Given:** Double switch modal open
- **When:** User views modal
- **Then:** A dropdown to select incoming position player exists
- **Verify:** Find position player selector element

**AC-3: Batting Order Position Selectable**
- **Given:** Players selected
- **When:** User views modal
- **Then:** Batting position options (1-9) are available for each incoming player
- **Verify:** Find batting order selectors

---

### Acceptance Criteria for S-023: Implement Double Switch Logic

**AC-1: Pitcher Takes Selected Batting Position**
- **Given:** Pitcher enters at batting position 8
- **When:** Double switch confirmed
- **Then:** Lineup shows new pitcher batting 8th
- **Verify:** Check lineup panel, confirm pitcher at position 8

**AC-2: Position Player Takes Exiting Player's Position**
- **Given:** Position player enters for catcher who batted 8th
- **When:** Double switch confirmed
- **Then:** New position player has C defensive position
- **Verify:** Check lineup panel, confirm position player at C

**AC-3: All 9 Positions Still Filled**
- **Given:** Double switch completed
- **When:** User views defensive alignment
- **Then:** Exactly 9 defensive positions are filled (P, C, 1B, 2B, 3B, SS, LF, CF, RF)
- **Verify:** Count positions in lineup, confirm 9 unique positions

---

## Criteria Quality Summary

| Story | Criteria Count | All Objective | All Verifiable |
|-------|----------------|---------------|----------------|
| S-001 | 3 | ✅ | ✅ |
| S-002 | 3 | ✅ | ✅ |
| S-003 | 3 | ✅ | ✅ |
| S-004 | 3 | ✅ | ✅ |
| S-005 | 3 | ✅ | ✅ |
| S-006 | 2 | ✅ | ✅ |
| S-007 | 3 | ✅ | ✅ |
| S-008 | 3 | ✅ | ✅ |
| S-009 | 2 | ✅ | ✅ |
| S-010 | 2 | ✅ | ✅ |
| S-011 | 2 | ✅ | ✅ |
| S-012 | 3 | ✅ | ✅ |
| S-013 | 3 | ✅ | ✅ |
| S-014 | 3 | ✅ | ✅ |
| S-015 | 3 | ✅ | ✅ |
| S-016 | 3 | ✅ | ✅ |
| S-017 | 3 | ✅ | ✅ |
| S-018 | 3 | ✅ | ✅ |
| S-019 | 2 | ✅ | ✅ |
| S-020 | 2 | ✅ | ✅ |
| S-021 | 2 | ✅ | ✅ |
| S-022 | 3 | ✅ | ✅ |
| S-023 | 3 | ✅ | ✅ |

**Total Criteria:** 62
**Criteria per Story Average:** 2.7

---

*All criteria use specific, measurable language with exact verification steps. No subjective terms like "looks good", "works well", or "properly" are used.*
