# KBL Tracker - Figma Make Design Prompt (v2)

## App Identity

**Name:** Kruse Family Super Mega Baseball Stat Tracker  
**Short name:** KBL Tracker  
**Purpose:** A companion app for Super Mega Baseball 4 (SMB4) that tracks every at-bat of virtual baseball games and manages full franchise seasons with stats, narratives, and administrative elements similar to real MLB operations.

**Think of it as:** GameChanger App meets MLB The Show Franchise Mode, with a 1990s SNES baseball game aesthetic.

---

## Visual Design Direction

### Aesthetic: 1990s SNES Baseball Game

Design this app to look and feel like a classic Super Nintendo baseball game from the early 1990s.

**Color Palette:**
- Deep blacks and dark backgrounds
- Vibrant primary colors (bright greens, blues, oranges, reds)
- Teal/cyan accents
- High contrast throughout

**UI Elements:**
- Orange/gold bordered cards and panels
- Green header bars on information cards
- Chunky, bold, slightly pixelated typography (or modern fonts that evoke that feel)
- CRT screen / retro arcade energy
- Thick borders and clear visual separation between elements

**Typography:**
- Bold, blocky letterforms
- High readability
- Gradient text effects for headers (blue→purple, orange→red)
- All-caps for headers and labels

**Layout Principles:**
- Clear visual hierarchy
- Generous padding inside bordered elements
- Information density appropriate for stats-heavy content
- Grid-based layouts that feel like game menus

---

## App Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      LEAGUE BUILDER                          │
│              (The database / foundation layer)               │
│                                                              │
│   • League definitions (name, conferences, divisions)        │
│   • Team database (all teams, colors, assignments)           │
│   • Player database (all players, stats, ratings)            │
│   • Roster configurations (who's on which team)              │
│   • League rules (DH, etc.)                                  │
│   • Fantasy draft capability                                 │
└─────────────────────────┬───────────────────────────────────┘
                          │ provides teams/players/rosters to
        ┌─────────────────┼─────────────────┬─────────────────┐
        ▼                 ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│    LOAD      │  │     NEW      │  │  EXHIBITION  │  │    WORLD     │
│  FRANCHISE   │  │  FRANCHISE   │  │    GAME      │  │    SERIES    │
│              │  │              │  │              │  │              │
│ Resume saved │  │ Pull league  │  │ Pick 2 teams │  │ Pick 2 teams │
│ franchise    │  │ + configure  │  │ Play 1 game  │  │ Play 3/5/7   │
│ experience   │  │ season       │  │ No save      │  │ Series stats │
│              │  │ dynamics     │  │              │  │ + narrative  │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## Screen Specifications

---

### SCREEN 1: App Home Page

**Purpose:** Entry point to the entire app

**Header:**
- App title: "Super Mega Baseball Stat Tracker"
- User profile identifier: "Kruse Family" (or user-defined name)
- SMB-style logo

**Menu Buttons (6 total, vertically stacked):**
1. **Load Franchise** - Resume a saved franchise in progress
2. **New Franchise** - Start a new franchise (pulls in a league, configures season)
3. **Exhibition Game** - One-off game between any two teams, no save
4. **World Series** - Championship series (3/5/7 games) with series stats & narrative
5. **League Builder** - Create/edit leagues, teams, rosters, draft players

**Design Notes:**
- Dark background with subtle baseball field or stadium element
- Buttons should look like SNES menu selections (bordered, highlighted on hover/select)
- Feels like a game title screen
- Consider showing recent/quick-resume option for last played franchise

---

### SCREEN 2: League Builder Hub

**Purpose:** The workshop where users create and manage the building blocks (leagues, teams, players, rosters) that other modes pull from

**This is NOT a play mode - it's content creation and database management.**

**Header:**
- "League Builder" title
- Back button to App Home

**Main Options (as large selectable cards or list):**

1. **Manage Leagues**
   - View list of created leagues
   - Create new league
   - Edit existing league (name, conferences, divisions, team assignments)
   - Delete league

2. **Manage Teams**
   - View all teams in database
   - Create custom team (name, colors, logo placeholder, abbreviation)
   - Edit team details
   - Assign teams to leagues/divisions

3. **Manage Players**
   - View all players in database
   - Create custom player (name, position, ratings, attributes)
   - Edit player details
   - View player stats history

4. **Roster Builder**
   - Select a league and team
   - Assign players to roster (22-man roster)
   - Set depth chart / positions

5. **Fantasy Draft**
   - Select a league
   - Configure draft settings (order, rounds)
   - Run draft (snake-style, randomized order)
   - Assign drafted players to teams

6. **League Rules**
   - Set default rules per league
   - DH on/off
   - Other configurable rules

**Design Notes:**
- This screen is more utilitarian/administrative
- Clear navigation between sub-sections
- Data tables for viewing lists of leagues/teams/players
- Forms for creating/editing entities

---

### SCREEN 3: Load Franchise

**Purpose:** Select a saved franchise to resume

**Elements:**
- List of saved franchises (save slots)
- Each slot shows:
  - User-defined save name
  - League name
  - User's team name and record
  - Current season and date (e.g., "Season 2, Week 14")
  - Last played date
- "Load" button for selected franchise
- "Delete" option (with confirmation)

**Design Notes:**
- Save slots styled like game cartridge labels or baseball cards
- Empty slots show "New Save" option (redirects to New Franchise)
- Maximum number of save slots (e.g., 5-10)

---

### SCREEN 4: New Franchise Setup

**Purpose:** Configure and launch a new franchise

**Step 4A - Select League:**
- Choose from leagues created in League Builder
- Shows league preview (# teams, conferences, divisions)
- Option to go to League Builder if no leagues exist

**Step 4B - Choose Your Team:**
- Display all teams in selected league
- User selects which team they will manage
- Team card shows: name, colors, key players, ratings

**Step 4C - Season Configuration:**
- Games per Season (dropdown: 16, 32, 62, 162)
- Innings per Game (dropdown: 3, 6, 9)
- Playoff Rounds (dropdown: 1, 2, 3, 4)
- Games per Playoff Series (dropdown: 1, 3, 5, 7)

**Step 4D - Name Your Save:**
- Text input for save slot name
- "Start Franchise" button

**Design Notes:**
- Progress indicator showing current step
- Back/Next navigation
- Each step fits on one screen
- Preview of selections before final confirmation

---

### SCREEN 5: Franchise Home (The Hub)

**Purpose:** Central hub for an active franchise - the core experience

**Header:**
- SMB Logo (top left) - **Navigation behavior:**
  - Tap once: Returns to this Franchise Home screen (if in a sub-tab)
  - Tap again: Returns to App Home Page (exits franchise)
- League name and logo
- Current season indicator (e.g., "Season 1")

**Two Main Tabs:**

```
┌─────────────────────────────────────────────────────────┐
│  [SMB Logo]   KRUSE BASEBALL LEAGUE        Season 1     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   [ REGULAR SEASON ]        [ OFFSEASON ]               │
│       (active)               (greyed out)               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- **Regular Season Tab** - Active during the season
- **Offseason Tab** - Greyed out until season ends; becomes active after champion crowned

---

### SCREEN 5A: Regular Season Tab (Sub-tabs)

**Purpose:** All in-season franchise activities

**Sub-tabs (horizontal, left to right):**

1. **Game Day** (Primary - likely default landing)
   - Shows next scheduled game
   - Opponent preview (team, record, probable pitcher)
   - User's team status (record, streak)
   - **Pre-game setup:**
     - Confirm/edit starting lineup
     - Select starting pitcher
     - View Mojo and Fitness levels for players
   - **Action buttons:**
     - "Play Game" → Launches Game Tracker
     - "Simulate Game" → Auto-resolves with stats
     - "Skip Game" → Advances without playing

2. **Team Management**
   - Roster view for user's team
   - Lineup configuration
   - Pitching rotation
   - Depth chart
   - Player details (click for full stats/ratings)

3. **Schedule**
   - Full season calendar
   - Results of completed games
   - Upcoming matchups
   - Current date highlighted
   - Click game for box score (if played)

4. **League News**
   - AI-driven narrative elements
   - Headlines and stories about the league
   - Player milestones
   - Trade rumors
   - Injury reports
   - Storylines that evolve throughout season

5. **League Leaders**
   - Statistical leaderboards
   - Categories: Batting (AVG, HR, RBI, SB, WAR, etc.)
   - Categories: Pitching (ERA, W, K, WHIP, WAR, etc.)
   - User's players highlighted when they appear
   - Filters by league/division

6. **Rosters**
   - View all teams' rosters in the league
   - Select team to view full roster
   - Useful for scouting opponents

7. **League Museum**
   - Historical records
   - Past champions by season
   - Hall of Fame inductees
   - Retired numbers (by team)
   - Franchise records and milestones
   - All-time statistical leaders

**Design Notes:**
- Sub-tabs should be clearly visible and easily tappable
- Default to "Game Day" when entering Regular Season
- Each sub-tab is its own screen/view
- Consistent header with SMB logo nav across all sub-tabs

---

### SCREEN 5B: Offseason Tab (Sub-tabs)

**Purpose:** All offseason activities, progressing sequentially through phases

**Sub-tabs (horizontal, left to right - representing sequential phases):**

Users progress through these in order. Completed phases are marked; future phases may be locked until current phase is complete.

1. **Awards**
   - MVP, Cy Young, Rookie of the Year, etc.
   - League-wide awards ceremony
   - User's players highlighted if they won
   - AI-generated narrative for award announcements

2. **End-of-Season Adjustments**
   - Automatic salary updates
   - Contract changes
   - Player rating adjustments based on performance
   - Summary of changes to user's roster

3. **Retirements**
   - Players announcing retirement
   - Option for jersey retirement ceremony
   - Narrative elements for notable retirements
   - User can select players for jersey retirement (their team)

4. **Hall of Fame**
   - Hall of Fame induction ceremony
   - Eligible players listed
   - Voting/selection process
   - Induction narrative and ceremony

5. **Free Agency**
   - Available free agents list
   - Bidding/signing interface
   - Budget/cap considerations
   - AI teams also signing players
   - News updates on signings

6. **Draft**
   - New player draft
   - Draft order displayed
   - Player prospects available
   - User makes selections
   - AI teams draft as well

7. **Roster Changes**
   - Trade interface
   - Propose and receive trades
   - Finalize roster for next season
   - Cut/release players
   - Call-ups from minors (if applicable)

8. **Advance to Next Season**
   - Summary of offseason moves
   - Player aging applied
   - Final roster confirmation
   - "Start Season [X]" button
   - Narrative preview of upcoming season

**Design Notes:**
- Progress indicator showing completed/current/upcoming phases
- Each phase must be completed (or skipped) before next unlocks
- Consider "Sim Offseason" option to auto-complete all phases
- Rich narrative elements integrated throughout

---

### SCREEN 6: Game Tracker

**Purpose:** Record at-bats during live gameplay - THE CORE ENGINE

**Access Points:**
- From Franchise Mode → Game Day tab → "Play Game"
- From Exhibition Game → After team/lineup selection
- From World Series → Game Day tab → "Play Game"

**Critical Design Constraint:** User is playing SMB4 simultaneously. Every tap/click matters. Minimize cognitive load. SPEED IS EVERYTHING.

**Layout Concept:**

```
┌─────────────────────────────────────────────────────────┐
│  AWAY: Tigers  3  │  TOP 5  │  HOME: Sox  4            │
├───────────────────┴─────────┴───────────────────────────┤
│                                                         │
│                  [BASEBALL DIAMOND]                     │
│                  (shows baserunners                     │
│                   as dots on bases)                     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  AT BAT                      │  PITCHING                │
│  ► J. Martinez               │    R. Smith              │
│    SS | .287 | 12 HR         │    4.2 IP | 6 K | 2 ER   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ SINGLE  │ │ DOUBLE  │ │ TRIPLE  │ │   HR    │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │  WALK   │ │   HBP   │ │STRIKEOUT│ │ OUT     │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                         │
│  [MORE OPTIONS]  (expands for: sac fly, sac bunt,      │
│                   error, fielder's choice, etc.)        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Outs: ●●○       B: 2  S: 1       [MENU]               │
└─────────────────────────────────────────────────────────┘
```

**Key Interactions:**

1. User taps outcome button (e.g., "Single")
2. App infers baserunner movement based on baseball rules
3. If ambiguous, quick prompt: "Runner scores from 2nd?" (Yes/No)
4. Stats update automatically
5. Next batter loads
6. Inning changes automatically at 3 outs

**Smart Inferential Logic:**
- App understands baseball rules deeply
- Minimizes prompts by inferring likely outcomes
- Force plays, tagging up, scoring position - all handled intelligently
- User only confirms when outcome is genuinely ambiguous

**Menu Options (accessible but not prominent):**
- Pitching change
- Pinch hitter
- Defensive substitution
- Undo last play
- End game early / Forfeit
- Pause and return to menu

**Game End:**
- When final out recorded, transition to Post-Game Summary
- Stats automatically saved to franchise/series

**Design Notes:**
- LARGE touch targets for outcome buttons
- Current batter/pitcher info visible but compact
- Diamond visualization shows game state at a glance
- Minimal chrome - maximize space for actions
- Consider landscape orientation
- Dark theme to reduce eye strain during gameplay
- High contrast for quick recognition

---

### SCREEN 7: Post-Game Summary

**Purpose:** Recap immediately after game ends

**Elements:**
- Final score (large, prominent)
- Box score by inning
- Player of the Game highlight
- Key batting stats (top performers)
- Pitching line for both starters
- Win/Loss/Save attribution
- Notable events (home runs, stolen bases, errors)

**Buttons:**
- "View Full Box Score" → Detailed statistics
- "Continue" → Returns to appropriate hub:
  - Franchise: Back to Game Day tab
  - Exhibition: Back to App Home
  - World Series: Back to Series hub

**Design Notes:**
- Celebratory feel if user's team won (subtle animation, colors)
- Quick, scannable layout
- Primary action is "Continue" - user wants to move on

---

### SCREEN 8: Exhibition Game Flow

**Purpose:** Quick one-off game with no franchise context

**Step 8A - Select Teams:**
- Choose Away team (from any league in League Builder)
- Choose Home team (from any league in League Builder)
- Team cards show name, colors, key stats

**Step 8B - Set Lineups:**
- Away team lineup confirmation/editing
- Home team lineup confirmation/editing
- Starting pitcher selection for each

**Step 8C - Play:**
- "Start Game" → Launches Game Tracker
- Game Tracker works identically to Franchise mode

**Post-Game:**
- Post-Game Summary shown
- Stats NOT saved to any franchise
- "Play Again" or "Home" options

---

### SCREEN 9: World Series Mode

**Purpose:** Championship series experience (3/5/7 games) with narrative

**Structure:**

```
WORLD SERIES HUB
│
├── TAB: Series Overview
│   - Matchup display (Team A vs Team B)
│   - Series score (e.g., "Tigers lead 2-1")
│   - Games breakdown (W/L for each game)
│
├── TAB: Game Day
│   - Same as Franchise Game Day
│   - Lineup confirmation
│   - Mojo/Fitness levels
│   - "Play Game" / "Simulate" / "Skip"
│   - Launches Game Tracker
│
├── TAB: Series Leaders
│   - Statistical leaders for THIS series only
│   - Batting: AVG, HR, RBI for series
│   - Pitching: ERA, K, W for series
│   - Top performers highlighted
│
├── TAB: Series News
│   - AI-driven narrative specific to the series
│   - Game recaps with dramatic flair
│   - Player storylines
│   - "Turning point" moments
│   - Championship implications
│
└── TAB: Series Awards (after series ends)
    - Series MVP
    - Top performers by category
    - Memorable moments recap
```

**Setup Flow:**
1. Select two teams (from any league)
2. Choose series length (3, 5, or 7 games)
3. Set lineups for both teams
4. Begin Game 1

**Series End:**
- Champion crowned after clinching game
- Series Awards tab unlocks
- AI-generated championship narrative
- "Return Home" button

**Design Notes:**
- Premium feel - this is the "championship" experience
- Dramatic visual treatment
- Narrative elements are prominent
- Series score always visible in header

---

## Key Interaction Patterns

### Pattern 1: Quick Selection (Game Tracker)
- Large, clearly labeled buttons
- Immediate visual feedback on tap
- One tap = one action
- No confirmation unless ambiguous

### Pattern 2: Master-Detail (Roster Views)
- List on left, detail on right (or top/bottom on mobile)
- Selection updates detail instantly
- Keyboard/swipe navigation supported

### Pattern 3: Tab Navigation (Franchise Hub)
- Primary tabs (Regular Season / Offseason)
- Sub-tabs within each primary tab
- Clear visual indication of current location
- Consistent header with logo navigation

### Pattern 4: Sequential Flow (Offseason, Setup)
- Progress indicator
- Complete current step before advancing
- Back navigation available
- Summary before final action

### Pattern 5: Stepped Setup (New Franchise, Exhibition)
- Clear progress indicator
- Each step fits on one screen
- Selections summarized before launch

---

## Navigation Summary

**SMB Logo Behavior (when in Franchise):**
- Tap once: Return to Franchise Home (the tabs screen)
- Tap again: Return to App Home Page (exit franchise)

**Global Back Pattern:**
- Every screen has clear path back to parent
- No dead ends
- Confirmation before destructive actions (delete, forfeit)

---

## Responsive Considerations

**Primary Use Case:** Tablet or desktop (user looking at TV/monitor with SMB4)

**Game Tracker specifically:** Must work well on:
- iPad held in hand while playing on TV
- Phone propped up next to gaming setup
- Second monitor on PC

**Tablet-first design recommended**, with mobile adaptations.

---

## Summary for Figma Make

Design a baseball franchise management and stat-tracking app with these priorities:

1. **1990s SNES baseball game visual aesthetic** - bold, colorful, retro, high contrast
2. **Game Tracker is the engine** - optimize for speed and minimal input during live play
3. **Franchise Home with dual tabs** (Regular Season / Offseason) with sub-tabs in each
4. **League Builder is the foundation** - where teams/players/leagues are created and managed
5. **World Series mode** - elevated championship experience with series stats and narrative
6. **Clear navigation hierarchy** - SMB logo tap-out, tabs, sub-tabs, back buttons
7. **Stats-forward throughout** - this is for baseball stat enthusiasts

**Design screens in this priority order:**

1. App Home Page (6-button menu)
2. Franchise Home (dual tab structure)
3. Regular Season → Game Day sub-tab (pre-game setup)
4. Game Tracker (the core input interface)
5. Post-Game Summary
6. Regular Season → other sub-tabs (Team Management, Schedule, News, Leaders, Rosters, Museum)
7. League Builder hub
8. World Series hub
9. Offseason sub-tabs

The visual aesthetic is as important as the functionality. This should feel like a love letter to 90s baseball video games while being fully functional as a modern stat-tracking and franchise management tool.
