# KBL Tracker - Complete UI Component PRDs

> **Purpose**: Product Requirement Documents for ALL UI components needed for MVP
> **Generated**: January 26, 2026
> **Format**: Following RALPH_FRAMEWORK.md template
> **Scope**: Full application - 148 components across 23 categories
> **Batch**: ALL PHASES (A through G)

---

## Table of Contents

1. [Phase A: Foundation](#phase-a-foundation)
2. [Phase B: Core Game Loop](#phase-b-core-game-loop)
3. [Phase C: Season Infrastructure](#phase-c-season-infrastructure)
4. [Phase D: Awards & Recognition](#phase-d-awards--recognition)
5. [Phase E: Offseason System](#phase-e-offseason-system)
6. [Phase F: Advanced Systems](#phase-f-advanced-systems)
7. [Phase G: Polish & History](#phase-g-polish--history)

---

# Phase A: Foundation

## F-A001: React Router Setup (APP-001)

### Overview
Install and configure React Router to enable multi-page navigation. Currently the app is a single GameTracker component with no routing.

### User Problem
Users cannot navigate between different sections of the app (dashboard, teams, stats, etc.) because no routing exists.

### Success Metrics
- [ ] React Router installed and configured
- [ ] Route definitions for all major sections
- [ ] Navigation state preserved on refresh
- [ ] Deep linking works for all routes

### Scope
**In Scope:**
- Install react-router-dom
- Configure BrowserRouter
- Define routes for: Home, Season, Team, Player, Game, Awards, Offseason, Museum
- 404 handling

**Out of Scope:**
- Protected routes / authentication
- Route-based code splitting (optimization later)

### Dependencies
- None (foundational)

### Technical Constraints
- React 19.2.0 compatibility
- Must integrate with existing App.tsx

---

## F-A002: Main Menu & Home Screen (APP-002)

### Overview
Create the main menu/home screen as the application entry point with navigation to all major features.

### User Problem
Users have no way to access different features of the application - they're dropped directly into GameTracker.

### Success Metrics
- [ ] Home screen loads by default
- [ ] Navigation cards for: New Game, Season Dashboard, Team Management, League Stats
- [ ] Quick resume option for in-progress games
- [ ] Season status summary visible

### Scope
**In Scope:**
- MainMenu component
- Navigation tiles/cards
- Season summary widget
- "Continue Season" button
- "New Game" button

**Out of Scope:**
- Animated transitions
- User accounts/profiles

### Dependencies
- F-A001 (Router)
- F-A006 (Global state for season data)

### Technical Constraints
- Should load fast (no heavy data fetching on initial)
- Mobile-responsive design

---

## F-A003: Navigation Header (APP-003)

### Overview
Create a persistent navigation header that appears across all pages with breadcrumb navigation and quick actions.

### User Problem
Users need consistent navigation and context awareness across all app sections.

### Success Metrics
- [ ] Header visible on all pages
- [ ] Logo/home button
- [ ] Breadcrumb trail
- [ ] Quick access to season dashboard
- [ ] Current team indicator

### Scope
**In Scope:**
- NavigationHeader component
- Logo with home link
- Breadcrumb navigation
- Team/season context display
- Settings gear icon

**Out of Scope:**
- Notification center
- User profile menu

### Dependencies
- F-A001 (Router)

### Technical Constraints
- Fixed position (sticky)
- Dark theme compatible

---

## F-A004: Season Dashboard (APP-004)

### Overview
Create the central hub for season progress showing standings, schedule, and upcoming games.

### User Problem
Users need one place to see overall season status, what games to play next, and how teams are performing.

### Success Metrics
- [ ] Current standings visible
- [ ] Next game highlighted
- [ ] Season progress indicator (Game X of Y)
- [ ] Quick links to team management
- [ ] Recent results summary

### Scope
**In Scope:**
- Season progress bar
- Mini standings table
- "Next Game" card with quick-start
- Recent results (last 5 games)
- Team selector

**Out of Scope:**
- Full schedule view (separate component)
- Historical season comparison

### Dependencies
- F-A001 (Router)
- F-A006 (Global state)
- Season storage APIs

### Technical Constraints
- Must handle no-season-started state
- Should cache standings data

---

## F-A005: Team Selector (APP-005)

### Overview
Component for selecting which team the user manages/follows throughout the app.

### User Problem
Users need to specify which team they're managing to see relevant stats, rosters, and schedule.

### Success Metrics
- [ ] All teams listed
- [ ] Team icons/logos if available
- [ ] Selected team persisted
- [ ] Context updates throughout app

### Scope
**In Scope:**
- Team dropdown/list
- Team logo display
- Selection persistence (localStorage)
- Team change confirmation

**Out of Scope:**
- Multi-team management
- Team creation

### Dependencies
- Team data in storage
- F-A006 (Global state)

### Technical Constraints
- Teams come from SMB4 or user-created data
- Need default team if none selected

---

## F-A006: Global State Provider (APP-006)

### Overview
Implement global state management using React Context or Zustand for app-wide data.

### User Problem
Currently all state is local to GameTracker. Need shared state for season, team selection, user preferences.

### Success Metrics
- [ ] Season state accessible everywhere
- [ ] Selected team accessible everywhere
- [ ] Game-in-progress state accessible
- [ ] State persists across navigation

### Scope
**In Scope:**
- Context Provider wrapper
- Season state slice
- Team state slice
- Preferences slice
- Hydration from IndexedDB

**Out of Scope:**
- Redux (overkill)
- Server state management

### Dependencies
- None (foundational)

### Technical Constraints
- Keep bundle small (prefer Context or Zustand)
- Must hydrate from IndexedDB on app start

---

## F-A007: Player Ratings Input (PLAYER-002)

### Overview
Create a form for inputting player ratings (Power, Contact, Speed, Fielding, Arm for position players; Velocity, Junk, Accuracy for pitchers). CRITICAL: This unblocks the salary system.

### User Problem
Salary calculations require player ratings but no UI exists to input them. This blocks the entire salary display feature.

### Success Metrics
- [ ] Form accepts 5 ratings for position players
- [ ] Form accepts 3 ratings for pitchers
- [ ] Ratings saved to IndexedDB
- [ ] Ratings accessible to salary calculator

### Scope
**In Scope:**
- PlayerRatingsForm component
- Position player fields: Power, Contact, Speed, Fielding, Arm (0-99)
- Pitcher fields: Velocity, Junk, Accuracy (0-99)
- Validation (0-99 range)
- Save to playerRatings storage

**Out of Scope:**
- Rating auto-detection from screenshots (separate feature)
- Historical rating tracking

### Dependencies
- F-A006 (Global state)
- Player database

### Technical Constraints
- Per SALARY_SYSTEM_SPEC.md Section 2
- Position player weights: 3:3:2:1:1 (Power, Contact, Speed, Fielding, Arm)
- Pitcher weights: 1:1:1 (Velocity, Junk, Accuracy)

---

## F-A008: League Builder (NEW - User Requested)

### Overview
Create a league setup wizard for assigning teams to a league at franchise/season start.

### User Problem
Users need to define which teams are in their league, divisions, and schedule before starting a season.

### Success Metrics
- [ ] Team selection from available teams
- [ ] Division assignment (optional)
- [ ] Season length configuration
- [ ] Schedule generation trigger

### Scope
**In Scope:**
- LeagueBuilder component
- Team pool display
- Drag-drop or checkbox team selection
- Division assignment (4-8 teams per division)
- Season length dropdown (32, 48, 64, 128 games)

**Out of Scope:**
- Custom schedule editing
- Inter-league play configuration

### Dependencies
- Team database
- F-A006 (Global state)

### Technical Constraints
- Minimum 2 teams for a league
- Maximum 32 teams
- Must generate balanced schedule

---

## F-A009: Manual Player Input (NEW - User Requested)

### Overview
Create a form for manually inputting individual player data beyond screenshot imports.

### User Problem
Users need to add one-off players or make corrections that can't be captured via screenshot import.

### Success Metrics
- [ ] Form accepts player name, position, handedness
- [ ] Form accepts ratings (links to F-A007)
- [ ] Form accepts traits
- [ ] Player saved to database

### Scope
**In Scope:**
- ManualPlayerInput component
- Name, team, position fields
- Bats/throws handedness
- Ratings integration (F-A007)
- Trait selection
- Age input

**Out of Scope:**
- Bulk player import
- Jersey number management

### Dependencies
- F-A007 (Ratings input)
- Player database

### Technical Constraints
- Must match existing Player schema
- Validate required fields

---

## F-A010: Scoreboard Team Names Fix (GAME-001)

### Overview
Display team names in the scoreboard component. Currently shows scores but team names are missing (BUG-008).

### User Problem
Users cannot tell which team is which when looking at the scoreboard during gameplay.

### Success Metrics
- [ ] Away team name visible in scoreboard
- [ ] Home team name visible in scoreboard
- [ ] Names update correctly when teams change

### Scope
**In Scope:**
- Pass team names to Scoreboard component
- Display team names in appropriate location
- Style team names consistently

**Out of Scope:**
- Team logos
- Abbreviated names

### Dependencies
- Team data in GameTracker state

### Technical Constraints
- Scoreboard.tsx already exists
- Props may already have name fields - verify passing

---

## F-A011: Undo Button Visibility (GAME-002)

### Overview
Add a visible undo button to GameTracker. Undo functionality exists but has no visible button.

### User Problem
Users can't easily undo mistakes during game tracking because there's no visible undo button.

### Success Metrics
- [ ] Undo button visible in UI
- [ ] Button disabled when no history
- [ ] Clicking undoes last action
- [ ] Visual feedback on undo

### Scope
**In Scope:**
- Add undo button to UI
- Wire to existing handleUndo
- Disable when stack empty
- Basic feedback

**Out of Scope:**
- Redo functionality
- Undo history list

### Dependencies
- undoStack exists in index.tsx

### Technical Constraints
- 10-state stack already implemented

---

## F-A012: Clickable Player Names (GAME-003)

### Overview
Make player names clickable to open PlayerCard modal with that player's stats (BUG-007).

### User Problem
Users want to quickly view player stats by clicking names, but names are static text.

### Success Metrics
- [ ] Current batter name clickable
- [ ] Due-up list names clickable
- [ ] Click opens PlayerCard modal
- [ ] Correct player data shown

### Scope
**In Scope:**
- Wrap player names with click handlers
- Open PlayerCard on click
- Pass correct player ID

**Out of Scope:**
- Player search
- Editing from PlayerCard

### Dependencies
- PlayerCard.tsx exists

### Technical Constraints
- Need modal state in index.tsx

---

## F-A013: Lineup View Panel (GAME-004)

### Overview
Create a lineup view panel showing batting order with mojo/fitness indicators (BUG-009).

### User Problem
Users have no way to see complete lineup during game or check player mojo/fitness status.

### Success Metrics
- [ ] Button opens lineup panel
- [ ] Shows all 9 batting positions
- [ ] Defensive positions shown
- [ ] Mojo indicator per player
- [ ] Fitness indicator per player

### Scope
**In Scope:**
- "View Lineup" button
- Modal/panel with batting order
- Defensive positions
- Mojo color coding (-2 to +2)
- Fitness indicator (6 states)

**Out of Scope:**
- Editing from this panel
- Historical lineup changes

### Dependencies
- LineupState tracking
- Mojo/Fitness data (may need placeholder)

### Technical Constraints
- Mojo: Rattled, Bummed, Normal, High, Jacked
- Fitness: Hurt, Weak, Strained, Well, Fit, Juiced

---

## F-A014: Pitch Count Display (GAME-005)

### Overview
Display current pitcher's pitch count during game (BUG-011).

### User Problem
Users need pitch count for pitching change decisions but can't see it.

### Success Metrics
- [ ] Pitch count visible in game UI
- [ ] Updates after each at-bat
- [ ] Shows game total

### Scope
**In Scope:**
- Display near scoreboard/pitcher area
- Current game pitch count
- Optional season total

**Out of Scope:**
- Pitch-by-pitch logging UI
- Pitch type tracking

### Dependencies
- Pitch count tracking per PITCH_COUNT_TRACKING_SPEC.md

### Technical Constraints
- Verify pitch count tracked per at-bat

---

## F-A015: Mojo/Fitness Indicators (GAME-006)

### Overview
Display mojo and fitness indicators for current batter/pitcher in main game view (BUG-006).

### User Problem
Users can't see mojo/fitness during gameplay without opening separate panels.

### Success Metrics
- [ ] Batter shows mojo indicator
- [ ] Pitcher shows fitness indicator
- [ ] Consistent iconography
- [ ] Tooltips explain states

### Scope
**In Scope:**
- Mojo badge for batter
- Fitness badge for pitcher
- Color coding per state
- Hover tooltips

**Out of Scope:**
- Full history
- Team-wide view

### Dependencies
- mojoEngine.ts, fitnessEngine.ts exist
- Player state tracking

### Technical Constraints
- Mojo: 5 levels
- Fitness: 6 states

---

## F-A016: At-Bat Flow Exit Type Fix (GAME-010)

### Overview
Fix exit type selection requiring double entry (BUG-006).

### User Problem
Two-click requirement for exit type slows down tracking and creates confusion.

### Success Metrics
- [ ] Exit type in single interaction
- [ ] No redundant popup
- [ ] Natural flow

### Scope
**In Scope:**
- Review AtBatFlow.tsx
- Consolidate exit type selection
- Remove redundant popup

**Out of Scope:**
- Redesigning entire flow
- Adding new exit types

### Dependencies
- AtBatFlow.tsx exists

### Technical Constraints
- Maintain fielding modal integration

---

# Phase B: Core Game Loop

## F-B001: Pre-Game Screen (PRE-001)

### Overview
Create the pre-game screen displayed before each game with matchup info, starting pitchers, and storylines.

### User Problem
Users need context before starting a game - who's playing, starting pitchers, relevant storylines.

### Success Metrics
- [ ] Away vs Home teams displayed
- [ ] Starting pitchers shown with stats
- [ ] Stadium shown
- [ ] "Start Game" button
- [ ] Rivalry indicator if applicable

### Scope
**In Scope:**
- PreGameScreen component
- Team matchup display
- Starting pitcher comparison
- Stadium info
- Key storylines (revenge arcs, streaks)
- Start button

**Out of Scope:**
- Full roster display
- Weather (N/A for SMB4)
- Betting odds

### Dependencies
- F-A001 (Router)
- F-B002 (Game Setup)
- Narrative engine for storylines

### Technical Constraints
- Must have teams selected before display
- Load pitchers from roster

---

## F-B002: Game Setup Modal (PRE-002)

### Overview
Modal for configuring game before starting - teams, pitchers, stadium selection.

### User Problem
Games start with defaults. Users need to configure matchup and settings.

### Success Metrics
- [ ] Modal before game start
- [ ] Team selection away/home
- [ ] Starting pitcher selection
- [ ] Stadium selection
- [ ] Game number in season

### Scope
**In Scope:**
- GameSetupModal component
- Team dropdowns
- Pitcher selectors
- Stadium dropdown
- Game number input

**Out of Scope:**
- Team creation
- Full roster editing
- DH rule toggle (default by league)

### Dependencies
- Player database
- Stadium database (F-B003)

### Technical Constraints
- Must validate complete setup before start

---

## F-B003: Stadium Selector (PRE-003)

### Overview
Stadium selection with park factor display for game setup.

### User Problem
Stadium affects park factors and HR validation. Users need to select venue.

### Success Metrics
- [ ] Stadium dropdown in setup
- [ ] Park factors shown when selected
- [ ] Wall distances displayed
- [ ] Stadium stored with game

### Scope
**In Scope:**
- StadiumSelector component
- Stadium list from database
- Park factor summary display
- Wall distance preview

**Out of Scope:**
- Stadium creation
- Full park factor details view
- Stadium graphics

### Dependencies
- Stadium database
- STADIUM_ANALYTICS_SPEC.md data structures

### Technical Constraints
- Need to seed initial stadiums from Billy Yank guide
- Park factors: seed values until calculated

---

## F-B004: Post-Game Screen (POST-001)

### Overview
Full post-game summary with final score, box score, player of game, and key highlights.

### User Problem
When game ends, users need comprehensive summary before archiving.

### Success Metrics
- [ ] Final score prominently displayed
- [ ] Top performers highlighted
- [ ] Player of Game (POG) shown
- [ ] Key stats summary
- [ ] "Continue to Dashboard" button

### Scope
**In Scope:**
- PostGameScreen component
- Final score display
- POG highlight
- Box score summary
- Standings update preview
- Fame events summary

**Out of Scope:**
- Video replay
- Social sharing
- Full box score (separate)

### Dependencies
- Game completion detection
- POG calculation
- Stats aggregation

### Technical Constraints
- Calculate W/L/SV assignments
- Aggregate stats efficiently

---

## F-B005: Player of Game Display (POST-002)

### Overview
Highlight the Player of the Game with stats and Fame impact.

### User Problem
Users want to celebrate standout performances and understand POG selection.

### Success Metrics
- [ ] POG name and team shown
- [ ] Key stats that earned POG
- [ ] Fame impact displayed
- [ ] Visual highlight/celebration

### Scope
**In Scope:**
- POGDisplay component
- Player name/photo placeholder
- Game stats
- POG criteria met
- Fame bonus shown

**Out of Scope:**
- Animation effects
- Alternative POG selection

### Dependencies
- POG calculation logic (define criteria)
- Fame engine

### Technical Constraints
- POG criteria: highest WPA or combination of stats

---

## F-B006: Box Score View (POST-003)

### Overview
Full box score display with all player stats from the game.

### User Problem
Users want detailed game stats beyond summary - every player's line.

### Success Metrics
- [ ] Batting stats for both teams
- [ ] Pitching stats for all pitchers
- [ ] Standard box score format
- [ ] Sortable columns
- [ ] Totals row

### Scope
**In Scope:**
- BoxScoreView component
- Batting: AB, R, H, RBI, BB, K, AVG
- Pitching: IP, H, R, ER, BB, K, ERA
- Team totals
- Column sorting

**Out of Scope:**
- Advanced stats in box
- Play-by-play
- Export functionality

### Dependencies
- Game event log
- Stats calculation

### Technical Constraints
- Must match standard baseball box score format

---

## F-B007: Inning End Summary (GAME-007)

### Overview
Brief modal at end of each half-inning with runs, hits, LOB.

### User Problem
No summary when inning ends - harder to track game flow.

### Success Metrics
- [ ] Modal on inning flip
- [ ] Runs in half-inning
- [ ] Hits in half-inning
- [ ] LOB count
- [ ] Quick dismiss

### Scope
**In Scope:**
- InningEndSummary component
- Runs/hits/LOB display
- Auto-dismiss option
- Quick close button

**Out of Scope:**
- Full play-by-play
- Animation effects

### Dependencies
- Inning flip detection
- Half-inning stat tracking

### Technical Constraints
- Should not block if user wants to skip
- Default 2-3 second display

---

## F-B008: Pitcher Exit Prompt (GAME-008)

### Overview
Prompt manager when pitcher should consider exit based on pitch count, performance.

### User Problem
Users may not notice when pitcher should be pulled.

### Success Metrics
- [ ] Prompt at configurable pitch count
- [ ] Prompt on performance trigger
- [ ] "Keep In" vs "Pull" options
- [ ] Non-blocking (can ignore)

### Scope
**In Scope:**
- PitcherExitPrompt component
- Pitch count threshold trigger
- Runs allowed trigger
- Quick action buttons
- Snooze option

**Out of Scope:**
- Auto-pull
- Warmup time simulation

### Dependencies
- Pitch count tracking
- Game state

### Technical Constraints
- Default thresholds: 100 pitches, 5+ runs

---

## F-B009: Double Switch Modal (GAME-009)

### Overview
Implement double switch substitution per SUBSTITUTION_FLOW_SPEC.md.

### User Problem
NL teams need double switch to optimize pitcher batting position.

### Success Metrics
- [ ] Double switch accessible
- [ ] Select pitcher entering
- [ ] Select position player entering
- [ ] Batting order restructured
- [ ] Validation prevents invalid configs

### Scope
**In Scope:**
- DoubleSwitchModal component
- Pitcher selection
- Position player selection
- Batting order swap logic
- Position validation

**Out of Scope:**
- Auto-suggestions
- Undo double switch (use general undo)

### Dependencies
- Other substitution modals as reference
- Lineup state management

### Technical Constraints
- Per SUBSTITUTION_FLOW_SPEC.md
- Must maintain valid 9-position defense
- Valid batting order

---

## F-B010: Walkoff Detection (GAME-011)

### Overview
Detect and celebrate walkoff wins with special display.

### User Problem
Walkoffs are exciting - game should recognize and celebrate them.

### Success Metrics
- [ ] Walkoff detected when home team wins in bottom of 9+
- [ ] Special celebration screen
- [ ] Walkoff hero highlighted
- [ ] Fame bonus applied

### Scope
**In Scope:**
- Walkoff detection logic
- Walkoff celebration display
- Hero player identification
- Fame bonus (+3 base)

**Out of Scope:**
- Animation effects
- Sound effects

### Dependencies
- Game end detection
- Fame engine

### Technical Constraints
- Bottom of 9th or later
- Run that wins game triggers walkoff

---

## F-B011: Fame Events In-Game (GAME-012)

### Overview
Display Fame events as they happen during game (BUG-007 wishlist).

### User Problem
Fame events occur but users don't see them until end of game.

### Success Metrics
- [ ] Toast notification for Fame events
- [ ] Event description shown
- [ ] Fame impact shown
- [ ] Non-blocking display

### Scope
**In Scope:**
- FameEventToast component
- Auto-detect event display
- Fame +/- value
- Auto-dismiss after 3s

**Out of Scope:**
- Full event modal in-game
- Event history panel

### Dependencies
- Fame detection system
- Toast notification system

### Technical Constraints
- Don't block gameplay
- Queue multiple events if simultaneous

---

## F-B012: Post-Game Headline (POST-005)

### Overview
Beat reporter headline for post-game summary.

### User Problem
Users want narrative context for game results.

### Success Metrics
- [ ] Headline generated based on game
- [ ] Reporter personality affects tone
- [ ] Links to full article if available

### Scope
**In Scope:**
- PostGameHeadline component
- Template-based headline generation
- Reporter personality display
- Reliability indicator

**Out of Scope:**
- Full article generation
- Multiple headlines

### Dependencies
- Narrative engine
- Reporter assignment

### Technical Constraints
- Use existing narrativeEngine.ts

---

# Phase C: Season Infrastructure

## F-C001: Standings View (SEASON-001)

### Overview
Full league standings with W-L records, PCT, GB, streaks.

### User Problem
Users need to see how all teams are performing in standings format.

### Success Metrics
- [ ] All teams listed
- [ ] W-L-PCT columns
- [ ] Games Back calculation
- [ ] Current streak (W/L)
- [ ] Last 10 games

### Scope
**In Scope:**
- StandingsView component
- Division standings (if divisions)
- Wildcard standings
- Sortable columns
- Playoff position indicators

**Out of Scope:**
- Magic number
- Head-to-head records

### Dependencies
- Season storage
- Game results

### Technical Constraints
- Recalculate on game completion

---

## F-C002: Schedule View (SEASON-002)

### Overview
Season schedule with past results and future games.

### User Problem
Users need to see full schedule, results, and upcoming games.

### Success Metrics
- [ ] All games listed
- [ ] Past games show scores
- [ ] Future games show matchup
- [ ] Today's games highlighted
- [ ] Filter by team

### Scope
**In Scope:**
- ScheduleView component
- Calendar or list view
- Past results display
- Future games
- Team filter
- Quick-play button

**Out of Scope:**
- Schedule editing
- TV broadcast info

### Dependencies
- Schedule generation
- Game results

### Technical Constraints
- Handle large schedules (128+ games)

---

## F-C003: League Leaders View (SEASON-003)

### Overview
Statistical leaders across all teams.

### User Problem
Users want to see top performers in each stat category.

### Success Metrics
- [ ] Batting leaders (AVG, HR, RBI, etc.)
- [ ] Pitching leaders (ERA, W, K, etc.)
- [ ] Top 10 per category
- [ ] Qualification minimums

### Scope
**In Scope:**
- LeagueLeadersView component
- Batting categories: AVG, HR, RBI, R, H, SB
- Pitching categories: ERA, W, K, SV, IP
- Top 10 per category
- Qualification rules

**Out of Scope:**
- All-time leaders
- WAR leaders (separate view)

### Dependencies
- Season stats aggregation
- Player database

### Technical Constraints
- Batting: 3.1 PA/team game
- Pitching: 1 IP/team game

---

## F-C004: Season Progress Tracker (SEASON-005)

### Overview
Visual indicator of season phase and progress.

### User Problem
Users need to know where they are in the season at a glance.

### Success Metrics
- [ ] Progress bar (games played / total)
- [ ] Current phase indicator (regular, ASB, playoffs)
- [ ] Key dates highlighted
- [ ] Trade deadline indicator

### Scope
**In Scope:**
- SeasonProgressTracker component
- Progress bar
- Phase labels
- Trade deadline countdown
- Playoff race indicator

**Out of Scope:**
- Detailed phase info
- Historical comparison

### Dependencies
- Season configuration
- Current game count

### Technical Constraints
- Phases: Regular Season, All-Star Break, Trade Deadline, Playoffs, Offseason

---

## F-C005: Roster View (TEAM-001)

### Overview
Full team roster with player details.

### User Problem
Users need to see all players on team with key info.

### Success Metrics
- [ ] All roster players listed
- [ ] Position, handedness, age
- [ ] Key stats visible
- [ ] Mojo/Fitness indicators
- [ ] Click for PlayerCard

### Scope
**In Scope:**
- RosterView component
- Active roster (22 players)
- Position groupings
- Basic stats per player
- Sort options

**Out of Scope:**
- Roster moves
- Farm system (separate)

### Dependencies
- Team data
- Player database

### Technical Constraints
- 22-man roster per SMB4

---

## F-C006: Team Stats View (TEAM-003)

### Overview
Team aggregate batting and pitching statistics.

### User Problem
Users want to see team-wide performance metrics.

### Success Metrics
- [ ] Team batting line (AVG, HR, R, etc.)
- [ ] Team pitching line (ERA, WHIP, etc.)
- [ ] Comparison to league average
- [ ] Home/road splits

### Scope
**In Scope:**
- TeamStatsView component
- Batting aggregate
- Pitching aggregate
- League rank per category
- Home/road split

**Out of Scope:**
- Advanced team metrics
- Historical team stats

### Dependencies
- Season aggregation
- League stats

### Technical Constraints
- Calculate from player stats

---

## F-C007: Team Financials View (TEAM-006)

### Overview
Team payroll, budget, cap space display.

### User Problem
Users need to understand salary situation for trades/FA.

### Success Metrics
- [ ] Total payroll shown
- [ ] Cap space available
- [ ] Top salaries listed
- [ ] Budget breakdown

### Scope
**In Scope:**
- TeamFinancialsView component
- Total payroll
- Salary cap and space
- Top 5 salaries
- Budget categories

**Out of Scope:**
- Multi-year projections
- Arbitration details

### Dependencies
- Salary calculator
- Player ratings (F-A007)

### Technical Constraints
- Per SALARY_SYSTEM_SPEC.md

---

## F-C008: Fan Morale Panel (TEAM-007)

### Overview
Display team's fan morale status and recent events affecting it.

### User Problem
Users need to see fan morale for contraction risk and FA attractiveness.

### Success Metrics
- [ ] Current morale level (0-100)
- [ ] Morale state name (EUPHORIC to HOSTILE)
- [ ] Recent morale events
- [ ] Trend indicator

### Scope
**In Scope:**
- FanMoralePanel component
- Morale gauge
- State display
- Recent events list
- Trend arrow

**Out of Scope:**
- Morale manipulation
- Historical morale graph

### Dependencies
- Fan morale engine
- Transaction log

### Technical Constraints
- Per FAN_MORALE_ENGINE_SPEC.md

---

## F-C009: Playoff Bracket (PLAY-001)

### Overview
Visual playoff bracket display.

### User Problem
Users need to see playoff matchups and results.

### Success Metrics
- [ ] Bracket structure displayed
- [ ] Teams placed in bracket
- [ ] Series scores shown
- [ ] Winner advances visually
- [ ] Champion highlighted

### Scope
**In Scope:**
- PlayoffBracket component
- 4-8 team bracket support
- Series score display
- Advancing team highlight
- Champion display

**Out of Scope:**
- Interactive bracket editing
- Simulation mode

### Dependencies
- Playoff seeding
- Series results

### Technical Constraints
- Support configurable playoff size

---

## F-C010: Championship Celebration (PLAY-004)

### Overview
Championship win celebration screen.

### User Problem
Winning championship should be celebrated properly.

### Success Metrics
- [ ] Champion team displayed
- [ ] Series MVP highlighted
- [ ] Celebration visuals
- [ ] Stats summary
- [ ] Save to history

### Scope
**In Scope:**
- ChampionshipCelebration component
- Team display
- Series MVP
- Key stats
- "Celebrate" interaction
- Archive to history

**Out of Scope:**
- Animation effects
- Ring ceremony

### Dependencies
- Championship detection
- MVP calculation

### Technical Constraints
- Trigger on clinching game

---

# Phase D: Awards & Recognition

## F-D001: Awards Ceremony Hub (AWARD-001)

### Overview
Main hub for end-of-season awards ceremony flow.

### User Problem
Users need a structured flow through all award categories.

### Success Metrics
- [ ] All award categories accessible
- [ ] Progressive reveal flow
- [ ] "Next Award" navigation
- [ ] Summary at end

### Scope
**In Scope:**
- AwardsCeremonyHub component
- Award sequence navigation
- Progress indicator
- Skip option
- Summary link

**Out of Scope:**
- Audio/video
- Custom ceremony order

### Dependencies
- All award components
- Award calculations

### Technical Constraints
- Per MASTER_SPEC §9 ceremony flow

---

## F-D002: League Leaders Award (AWARD-002)

### Overview
Display league leaders as first ceremony screen.

### User Problem
Users want to see who led the league in key stats.

### Success Metrics
- [ ] Batting leaders displayed
- [ ] Pitching leaders displayed
- [ ] Crown icons for leaders
- [ ] All leader categories covered

### Scope
**In Scope:**
- LeagueLeadersAward component
- Batting Triple Crown
- Pitching Triple Crown
- Other leader categories
- Leader photos/names

**Out of Scope:**
- Historical leader comparison
- Near-misses display

### Dependencies
- League stats
- Qualification rules

### Technical Constraints
- Per MASTER_SPEC Screen 1

---

## F-D003: Gold Glove Awards (AWARD-003)

### Overview
Gold Glove award reveal per position.

### User Problem
Users want to see best fielders recognized.

### Success Metrics
- [ ] Winner per position displayed
- [ ] fWAR/fielding stats shown
- [ ] Visual highlight
- [ ] All 9 positions covered

### Scope
**In Scope:**
- GoldGloveAwards component
- Winner per position
- Fielding stats
- Award animation trigger

**Out of Scope:**
- Voting breakdown
- Honorable mentions

### Dependencies
- fWAR calculation
- Position stats

### Technical Constraints
- Per MASTER_SPEC Screen 2

---

## F-D004: Silver Slugger Awards (AWARD-004)

### Overview
Silver Slugger award reveal per position.

### User Problem
Users want to see best hitters at each position recognized.

### Success Metrics
- [ ] Winner per position displayed
- [ ] Batting stats shown
- [ ] DH included
- [ ] Visual highlight

### Scope
**In Scope:**
- SilverSluggerAwards component
- Winner per position
- Batting stats
- Award display

**Out of Scope:**
- Voting breakdown
- Honorable mentions

### Dependencies
- bWAR calculation
- Position eligibility

### Technical Constraints
- Per MASTER_SPEC Screen 2
- Position eligibility: 10 games

---

## F-D005: MVP Reveal (AWARD-009)

### Overview
Dramatic MVP award reveal.

### User Problem
MVP is the biggest award - needs appropriate dramatic reveal.

### Success Metrics
- [ ] Dramatic reveal animation
- [ ] Winner stats displayed
- [ ] WAR breakdown shown
- [ ] Fame bonus applied

### Scope
**In Scope:**
- MVPReveal component
- Build-up anticipation
- Winner reveal
- Stats summary
- Fame +10 bonus

**Out of Scope:**
- Voting simulation
- Runner-up display

### Dependencies
- Total WAR calculation
- Fame engine

### Technical Constraints
- Per MASTER_SPEC Screen 4

---

## F-D006: Cy Young Reveal (AWARD-010)

### Overview
Cy Young award reveal for best pitcher.

### User Problem
Best pitcher deserves dedicated recognition.

### Success Metrics
- [ ] Winner revealed
- [ ] Pitching stats shown
- [ ] pWAR displayed
- [ ] Fame bonus applied

### Scope
**In Scope:**
- CyYoungReveal component
- Winner reveal
- Pitching stats
- pWAR display
- Fame +8 bonus

**Out of Scope:**
- Voting breakdown
- League split

### Dependencies
- pWAR calculation
- Fame engine

### Technical Constraints
- Per MASTER_SPEC Screen 4

---

## F-D007: ROY Reveal (AWARD-005)

### Overview
Rookie of the Year award reveal.

### User Problem
Outstanding rookies should be recognized.

### Success Metrics
- [ ] Winner revealed
- [ ] Rookie stats shown
- [ ] Rookie eligibility verified
- [ ] Fame bonus applied

### Scope
**In Scope:**
- ROYReveal component
- Winner reveal
- Season stats
- Eligibility display
- Fame +5 bonus

**Out of Scope:**
- Runner-up
- Historical ROY comparison

### Dependencies
- Rookie detection
- WAR calculation

### Technical Constraints
- Rookie: <30 career PA prior

---

## F-D008: Awards Summary (AWARD-013)

### Overview
Summary screen with all award winners.

### User Problem
Users need recap of all awards in one place.

### Success Metrics
- [ ] All awards listed
- [ ] Winners displayed
- [ ] Key stats per award
- [ ] "Continue to Offseason" button

### Scope
**In Scope:**
- AwardsSummary component
- All award winners
- Key stat per winner
- Navigation to next phase

**Out of Scope:**
- Historical comparison
- Export functionality

### Dependencies
- All award calculations

### Technical Constraints
- Per MASTER_SPEC Screen 6

---

## F-D009: All-Star Screen (ASB-001)

### Overview
All-Star Break hub with voting results and rosters.

### User Problem
Users want to see All-Star selections and break activities.

### Success Metrics
- [ ] All-Star rosters displayed
- [ ] Voting results shown
- [ ] User's team players highlighted
- [ ] ASG trait lottery triggered

### Scope
**In Scope:**
- AllStarScreen component
- Roster display
- Voting results
- Trait lottery link
- Break summary

**Out of Scope:**
- ASG simulation
- Home Run Derby

### Dependencies
- All-Star voting
- Trait lottery

### Technical Constraints
- Per MASTER_SPEC §8

---

## F-D010: Trait Lottery Wheel (AWARD-014)

### Overview
Interactive wheel for All-Star/Award trait assignment.

### User Problem
Trait assignment should be fun and random.

### Success Metrics
- [ ] Spinner wheel displayed
- [ ] Spin animation
- [ ] Trait result displayed
- [ ] Trait applied to player

### Scope
**In Scope:**
- TraitLotteryWheel component
- Wheel UI
- Spin animation
- Trait pools
- Result application

**Out of Scope:**
- Rigged outcomes
- Trait trading

### Dependencies
- Trait definitions
- Player database

### Technical Constraints
- Per OFFSEASON_SPEC §4 trait pools

---

# Phase E: Offseason System

## F-E001: Offseason Hub (OFF-001)

### Overview
Main offseason navigation with 11 phase tracker.

### User Problem
Users need structured flow through offseason activities.

### Success Metrics
- [ ] All 11 phases listed
- [ ] Current phase highlighted
- [ ] Completion checkmarks
- [ ] Navigate to any unlocked phase

### Scope
**In Scope:**
- OffseasonHub component
- Phase list
- Progress tracking
- Phase navigation
- Phase descriptions

**Out of Scope:**
- Phase skipping (must complete in order)
- Custom phase order

### Dependencies
- All phase components

### Technical Constraints
- Per OFFSEASON_SPEC §1-16

---

## F-E002: Offseason Progress Tracker (OFF-002)

### Overview
Visual tracker of offseason phase completion.

### User Problem
Users need to see where they are in offseason.

### Success Metrics
- [ ] Phase progress bar
- [ ] Completed phases checked
- [ ] Current phase highlighted
- [ ] Remaining phases shown

### Scope
**In Scope:**
- OffseasonProgressTracker component
- Progress bar
- Phase icons
- Completion states

**Out of Scope:**
- Historical comparison
- Time estimates

### Dependencies
- Offseason state

### Technical Constraints
- 11 phases per spec

---

## F-E003: EOS Ratings View (OFF-003)

### Overview
End-of-season rating adjustments display.

### User Problem
Users want to see how player ratings changed.

### Success Metrics
- [ ] All players with changes listed
- [ ] Before/after ratings
- [ ] Change direction arrows
- [ ] Sort by biggest changes

### Scope
**In Scope:**
- EOSRatingsView component
- Player list
- Rating deltas
- Sort options
- Filter by team

**Out of Scope:**
- Rating prediction
- Override capability

### Dependencies
- Rating calculation
- Player database

### Technical Constraints
- Per MASTER_SPEC EOS section

---

## F-E004: Retirements Screen (RET-001)

### Overview
Display retirement announcements and ceremonies.

### User Problem
Users need to see which players are retiring.

### Success Metrics
- [ ] Retiring players listed
- [ ] Career stats summary
- [ ] Retirement reason
- [ ] Jersey retirement eligibility

### Scope
**In Scope:**
- RetirementsScreen component
- Retiree list
- Career highlights
- Jersey retirement check
- HOF eligibility check

**Out of Scope:**
- Retirement cancellation
- Career montage

### Dependencies
- Retirement detection
- Career stats

### Technical Constraints
- Per OFFSEASON_SPEC §7

---

## F-E005: Free Agency Hub (FA-001)

### Overview
Free agency main screen with available players and rounds.

### User Problem
Users need to see FA pool and manage their acquisitions.

### Success Metrics
- [ ] Available FAs listed
- [ ] Current round displayed
- [ ] User's cap space shown
- [ ] Protected player indicator

### Scope
**In Scope:**
- FreeAgencyHub component
- FA pool display
- Round tracker
- Cap space display
- Protection status

**Out of Scope:**
- AI negotiation simulation
- Multi-year deals

### Dependencies
- FA detection
- Salary calculator
- F-E006 (Protection)

### Technical Constraints
- Per OFFSEASON_SPEC §8

---

## F-E006: Protected Player Selection (FA-002)

### Overview
UI for protecting 1 player from FA departure.

### User Problem
Users need to keep key players from leaving.

### Success Metrics
- [ ] Protection interface displayed
- [ ] Player selection
- [ ] Confirmation
- [ ] Protection limit enforced (1)

### Scope
**In Scope:**
- ProtectedPlayerSelection component
- Roster display
- Single selection
- Confirm button
- Already-protected indicator

**Out of Scope:**
- Protection trading
- Multiple protections

### Dependencies
- Roster data
- FA eligibility

### Technical Constraints
- 1 protected player per team

---

## F-E007: Draft Hub (DRAFT-001)

### Overview
Draft main screen with order, prospects, and picks.

### User Problem
Users need to navigate draft process.

### Success Metrics
- [ ] Draft order displayed
- [ ] Available prospects listed
- [ ] User's pick highlighted
- [ ] Made picks shown

### Scope
**In Scope:**
- DraftHub component
- Draft order display
- Prospect pool
- Pick tracker
- User's turn indicator

**Out of Scope:**
- Prospect scouting
- Mock draft

### Dependencies
- Draft order calculation
- Prospect generation

### Technical Constraints
- Per OFFSEASON_SPEC §9

---

## F-E008: Draft Order Reveal (DRAFT-003)

### Overview
Reveal draft order with lottery results.

### User Problem
Users want to see how draft order was determined.

### Success Metrics
- [ ] Lottery results shown
- [ ] Final order displayed
- [ ] User's pick position
- [ ] Compensation picks noted

### Scope
**In Scope:**
- DraftOrderReveal component
- Lottery display
- Order list
- Pick explanations

**Out of Scope:**
- Lottery manipulation
- Order trading

### Dependencies
- Draft lottery
- Team standings

### Technical Constraints
- Per OFFSEASON_SPEC §9

---

## F-E009: Prospect List (DRAFT-004)

### Overview
Display available prospects for selection.

### User Problem
Users need to evaluate and select prospects.

### Success Metrics
- [ ] All prospects listed
- [ ] Ratings visible
- [ ] Position shown
- [ ] Sort/filter options

### Scope
**In Scope:**
- ProspectList component
- Prospect cards
- Ratings display
- Position filter
- Sort by rating

**Out of Scope:**
- Scouting reports
- Prospect comparison

### Dependencies
- Prospect generation

### Technical Constraints
- Per OFFSEASON_SPEC §9

---

## F-E010: Trade Hub (TRADE-001)

### Overview
Main trade interface for proposing and reviewing trades.

### User Problem
Users need central place for trade activities.

### Success Metrics
- [ ] Trade proposal builder accessible
- [ ] Active proposals shown
- [ ] Trade history visible
- [ ] Deadline countdown

### Scope
**In Scope:**
- TradeHub component
- Proposal builder link
- Active trades list
- History list
- Deadline display

**Out of Scope:**
- AI trade suggestions
- Multi-team trades

### Dependencies
- Trade system
- Deadline tracking

### Technical Constraints
- Per MASTER_SPEC §25

---

## F-E011: Trade Proposal Builder (TRADE-002)

### Overview
Interface for building trade packages.

### User Problem
Users need to construct trade proposals with salary matching.

### Success Metrics
- [ ] Player selection both sides
- [ ] Salary totals displayed
- [ ] Trade balance indicator
- [ ] Submit button enabled when valid

### Scope
**In Scope:**
- TradeProposalBuilder component
- Two-column player lists
- Drag-drop or checkbox selection
- Salary display
- Balance check
- Propose button

**Out of Scope:**
- Draft pick trading
- International bonus pool

### Dependencies
- Roster data
- Salary calculator
- F-E012 (Salary matching)

### Technical Constraints
- Per SALARY_SPEC trade rules

---

## F-E012: Trade Salary Matcher (TRADE-003)

### Overview
Display salary matching requirements for trades.

### User Problem
Users need to know if trade works financially.

### Success Metrics
- [ ] Incoming salary shown
- [ ] Outgoing salary shown
- [ ] Match requirement displayed
- [ ] Pass/fail indicator

### Scope
**In Scope:**
- TradeSalaryMatcher component
- Salary totals
- Match % required
- Gap display
- Suggestions for balance

**Out of Scope:**
- Salary dump trades
- Money exchanging

### Dependencies
- Salary calculator

### Technical Constraints
- Per SALARY_SPEC matching rules

---

# Phase F: Advanced Systems

## F-F001: Relationship Engine (REL-001)

### Overview
Engine for managing player relationships - ENTIRE SYSTEM MISSING.

### User Problem
Player relationships affect morale, chemistry, trades, but system doesn't exist.

### Success Metrics
- [ ] Relationship types supported (9 types)
- [ ] Relationship formation logic
- [ ] Morale effects calculated
- [ ] Trade warnings generated

### Scope
**In Scope:**
- RelationshipEngine module
- 9 relationship types
- Formation requirements
- Morale calculations
- Trade impact calculations

**Out of Scope:**
- AI relationship generation
- Relationship counseling

### Dependencies
- Player database
- Morale engine

### Technical Constraints
- Per FEATURE_WISHLIST HIGH priority
- Types: DATING, MARRIED, DIVORCED, BEST_FRIENDS, MENTOR_PROTEGE, RIVALS, BULLY_VICTIM, JEALOUS, CRUSH

---

## F-F002: Relationship Panel (REL-002)

### Overview
Display player relationships on player card.

### User Problem
Users want to see who players are connected to.

### Success Metrics
- [ ] Relationships listed on PlayerCard
- [ ] Relationship type shown
- [ ] Related player linked
- [ ] Morale effect indicated

### Scope
**In Scope:**
- RelationshipPanel component
- Relationship list
- Type icons
- Player links
- Effect indicators

**Out of Scope:**
- Relationship editing
- Relationship graph

### Dependencies
- F-F001 (Relationship Engine)

### Technical Constraints
- Fit within PlayerCard layout

---

## F-F003: Chemistry Display (REL-003)

### Overview
Team chemistry visualization.

### User Problem
Users want to see overall team chemistry and how it affects performance.

### Success Metrics
- [ ] Team chemistry score displayed
- [ ] Chemistry grade (A-F)
- [ ] Top pairings highlighted
- [ ] Problem areas noted

### Scope
**In Scope:**
- ChemistryDisplay component
- Team score
- Grade display
- Key pairings
- Chemistry effects

**Out of Scope:**
- Chemistry manipulation
- Historical chemistry

### Dependencies
- F-F001 (Relationship Engine)
- Chemistry calculations

### Technical Constraints
- Per CHEMISTRY_SPEC

---

## F-F004: Aging Engine (AGE-001)

### Overview
Engine for age-based player development and decline - HIGH PRIORITY MISSING.

### User Problem
Players should improve when young and decline when old, but system doesn't exist.

### Success Metrics
- [ ] Age curve calculations working
- [ ] Players 18-29 improve
- [ ] Players 30+ decline
- [ ] Max age 49 enforced

### Scope
**In Scope:**
- AgingEngine module
- Age curve calculations
- Rating adjustments
- Decline triggers
- Retirement probability

**Out of Scope:**
- Injury-based aging
- Reverse aging

### Dependencies
- Player database
- Season end processing

### Technical Constraints
- Per FEATURE_WISHLIST HIGH
- Per AGING_SPEC curves

---

## F-F005: Aging Display (AGE-002)

### Overview
Display player aging status and projections.

### User Problem
Users want to know where player is in their career arc.

### Success Metrics
- [ ] Age and career phase shown
- [ ] Peak years indicated
- [ ] Decline warning
- [ ] Projection indicator

### Scope
**In Scope:**
- AgingDisplay component
- Age display
- Phase indicator (Development, Prime, Decline)
- Visual curve representation

**Out of Scope:**
- Aging manipulation
- Historical arc

### Dependencies
- F-F004 (Aging Engine)

### Technical Constraints
- Phases: Development (18-24), Prime (25-32), Decline (33+)

---

## F-F006: Park Factor Display (PARK-002)

### Overview
Display park factors for stadiums.

### User Problem
Users want to see how stadiums affect stats.

### Success Metrics
- [ ] Park factors displayed
- [ ] Factor breakdown by stat
- [ ] Confidence indicator
- [ ] Handedness splits

### Scope
**In Scope:**
- ParkFactorDisplay component
- Overall factor
- HR/hits/runs factors
- LHB/RHB splits
- Confidence level

**Out of Scope:**
- Factor manipulation
- Historical factors

### Dependencies
- Stadium database
- STADIUM_ANALYTICS_SPEC.md

### Technical Constraints
- Per STADIUM_ANALYTICS_SPEC

---

## F-F007: Stats By Park View (PARK-003)

### Overview
Show player/team stats broken down by stadium - USER REQUESTED.

### User Problem
Users want to see how performance varies by park.

### Success Metrics
- [ ] Stats grouped by stadium
- [ ] Home vs away comparison
- [ ] Performance variance shown
- [ ] Park factor context

### Scope
**In Scope:**
- StatsByParkView component
- Stadium breakdown
- Key stats per park
- Home/away split
- Sample size display

**Out of Scope:**
- Park recommendations
- Matchup predictions

### Dependencies
- Stadium database
- Game results with stadium

### Technical Constraints
- Need sufficient sample sizes

---

## F-F008: Adaptive Fielding System (FLD-001)

### Overview
Learning system that improves fielding inference - HIGH PRIORITY GAP.

### User Problem
Fielding inference should improve with more data.

### Success Metrics
- [ ] Inference accuracy tracked
- [ ] Probabilities updated at n>=20
- [ ] Per-player adjustments
- [ ] Accuracy improvements visible

### Scope
**In Scope:**
- AdaptiveLearningSystem module
- Inference tracking
- Probability updates
- Accuracy metrics

**Out of Scope:**
- Manual adjustment
- Prediction display

### Dependencies
- Fielding modal
- Fielding events storage

### Technical Constraints
- Per FEATURE_WISHLIST HIGH
- 20+ sample size for updates

---

## F-F009: Fielding Stats Aggregation (FLD-003)

### Overview
Per-position fielding stats for Gold Glove tracking.

### User Problem
Need fielding stats breakdown for awards.

### Success Metrics
- [ ] Stats per position
- [ ] Putouts, assists, errors
- [ ] Fielding percentage
- [ ] Range factor

### Scope
**In Scope:**
- FieldingStatsAggregation service
- Position breakdown
- Standard fielding stats
- Season totals

**Out of Scope:**
- Advanced metrics UI
- Spray chart integration

### Dependencies
- Fielding events storage

### Technical Constraints
- Per FWAR_CALCULATION_SPEC

---

## F-F010: News Feed (NAR-001)

### Overview
League-wide news feed with generated stories.

### User Problem
Users want to see what's happening across the league.

### Success Metrics
- [ ] News stories displayed
- [ ] Multiple story types
- [ ] Chronological order
- [ ] Filter by team

### Scope
**In Scope:**
- LeagueNewsFeed component
- Story display
- Story types: trades, milestones, injuries, signings
- Team filter
- Refresh mechanism

**Out of Scope:**
- Push notifications
- Social sharing

### Dependencies
- Narrative engine
- Transaction log

### Technical Constraints
- Per NARRATIVE_ENGINE_SPEC

---

# Phase G: Polish & History

## F-G001: Museum Hub (MUS-001)

### Overview
Museum main screen for franchise history.

### User Problem
Users want to explore franchise history and achievements.

### Success Metrics
- [ ] Navigation to all museum sections
- [ ] Featured items highlighted
- [ ] Clean gallery layout

### Scope
**In Scope:**
- MuseumHub component
- Section navigation
- Featured highlights
- Clean design

**Out of Scope:**
- Interactive tours
- AR features

### Dependencies
- All museum sections

### Technical Constraints
- Per MASTER_SPEC §24

---

## F-G002: Hall of Fame Gallery (MUS-002)

### Overview
Display of Hall of Fame members.

### User Problem
Users want to see franchise legends.

### Success Metrics
- [ ] HOF members displayed
- [ ] Plaques visible
- [ ] Career stats shown
- [ ] Induction year

### Scope
**In Scope:**
- HallOfFameGallery component
- Member list
- Plaque display
- Career summary
- Click for detail

**Out of Scope:**
- HOF voting simulation
- Virtual ceremony

### Dependencies
- HOF induction data
- Career stats

### Technical Constraints
- Per MASTER_SPEC §14

---

## F-G003: Retired Numbers Wall (MUS-003)

### Overview
Display of retired jersey numbers.

### User Problem
Users want to see honored numbers.

### Success Metrics
- [ ] Retired numbers displayed
- [ ] Player name with number
- [ ] Retirement date
- [ ] Career summary

### Scope
**In Scope:**
- RetiredNumbersWall component
- Number display
- Player association
- Date and stats

**Out of Scope:**
- Number retirement ceremony
- Number restrictions

### Dependencies
- Retirement data

### Technical Constraints
- Per MASTER_SPEC §14

---

## F-G004: Franchise Records (MUS-004)

### Overview
All-time franchise records display.

### User Problem
Users want to see team record holders.

### Success Metrics
- [ ] Record categories listed
- [ ] Current record holder
- [ ] Record value
- [ ] Date set

### Scope
**In Scope:**
- FranchiseRecords component
- Category list
- Record display
- Holder info
- Filter by category

**Out of Scope:**
- Record chase tracking
- Near-records

### Dependencies
- Career stats
- Record detection

### Technical Constraints
- Per MASTER_SPEC §15

---

## F-G005: Championship Banners (MUS-007)

### Overview
Display of championship history.

### User Problem
Users want to see championship legacy.

### Success Metrics
- [ ] Championship years displayed
- [ ] Banner visualization
- [ ] Click for season details
- [ ] Champion roster access

### Scope
**In Scope:**
- ChampionshipBanners component
- Year display
- Banner visuals
- Links to history

**Out of Scope:**
- Animated banners
- Ring display

### Dependencies
- Championship history

### Technical Constraints
- Per MASTER_SPEC §24

---

## F-G006: Data Export (EXP-001-003)

### Overview
Export game and season data to CSV/JSON.

### User Problem
Users want to export data for external analysis.

### Success Metrics
- [ ] Box score export works
- [ ] Season stats export works
- [ ] CSV format
- [ ] JSON option

### Scope
**In Scope:**
- DataExport service
- Box score export
- Season stats export
- Format selection (CSV/JSON)
- Download trigger

**Out of Scope:**
- Cloud export
- API integration

### Dependencies
- Stats data

### Technical Constraints
- Browser download capability

---

## F-G007: Contraction Warning (CON-001)

### Overview
Warning when team at risk of contraction.

### User Problem
Users need early warning of contraction risk.

### Success Metrics
- [ ] Warning displayed at <30 morale
- [ ] Risk factors shown
- [ ] Mitigation suggestions
- [ ] Dismissible

### Scope
**In Scope:**
- ContractionWarning component
- Risk display
- Factor breakdown
- Suggestions
- Dismiss option

**Out of Scope:**
- Automatic mitigation
- Appeal process

### Dependencies
- Fan morale
- Contraction rules

### Technical Constraints
- Per OFFSEASON_SPEC §6

---

*This document covers ALL 148 UI components across 7 phases. Update status as development progresses.*
