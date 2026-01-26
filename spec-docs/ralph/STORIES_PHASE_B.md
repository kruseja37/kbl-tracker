# KBL Tracker - Phase B User Stories: Core Game Loop

> **Purpose**: User stories for Pre-Game, Post-Game, and Game Flow features
> **Generated**: January 26, 2026
> **Format**: Ralph Framework - max 3 acceptance criteria per story

---

# PHASE B: CORE GAME LOOP

---

## S-B001: Create PreGameScreen Component

**Parent Feature:** F-B001
**Priority:** P0
**Estimated Size:** Large

**As a** user starting a game
**I want to** see a pre-game screen with matchup info
**So that** I have context before the game begins

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Shows Matchup**
- **Given:** Game setup complete with Sirloins vs Beewolves
- **When:** PreGameScreen renders
- **Then:** "Sirloins @ Beewolves" or similar visible
- **Verify:** Find both team names on screen

**AC-2: Shows Stadium**
- **Given:** Stadium selected as "Emerald Diamond"
- **When:** PreGameScreen displays
- **Then:** Stadium name visible
- **Verify:** Find "Emerald Diamond" text

**AC-3: Start Button Works**
- **Given:** PreGameScreen displayed
- **When:** User clicks "Start Game"
- **Then:** Navigation to game view occurs
- **Verify:** Click, confirm URL change to /game

### Technical Notes
- New file: `src/pages/PreGameScreen.tsx`
- Pull data from game setup context

---

## S-B002: Add Starting Pitchers to PreGame

**Parent Feature:** F-B001
**Priority:** P0
**Estimated Size:** Medium

**As a** user viewing pre-game
**I want to** see starting pitchers with stats
**So that** I know the pitching matchup

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Away Starter Shown**
- **Given:** Hurley Bender selected as away starter
- **When:** PreGameScreen displays
- **Then:** "Hurley Bender" with W-L and ERA visible
- **Verify:** Find pitcher name and stats

**AC-2: Home Starter Shown**
- **Given:** Sakda Sanoh selected as home starter
- **When:** PreGameScreen displays
- **Then:** "Sakda Sanoh" with W-L and ERA visible
- **Verify:** Find pitcher name and stats

**AC-3: Side-by-Side Display**
- **Given:** Both pitchers displayed
- **When:** User views layout
- **Then:** Pitchers displayed in comparison format (left/right or columns)
- **Verify:** Visual layout shows comparison

### Technical Notes
- Pull pitcher stats from seasonStats or careerStats
- Handle 0-0 record for new season

---

## S-B003: Create GameSetupModal Component

**Parent Feature:** F-B002
**Priority:** P0
**Estimated Size:** Large

**As a** user starting a new game
**I want to** configure the matchup
**So that** I play with the correct teams

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Modal Renders**
- **Given:** "New Game" clicked
- **When:** Modal opens
- **Then:** GameSetupModal visible with team dropdowns
- **Verify:** Find modal with team selection UI

**AC-2: Away Team Selection**
- **Given:** Modal open
- **When:** User clicks away team dropdown
- **Then:** All teams in league listed
- **Verify:** Open dropdown, count team options

**AC-3: Home Team Selection**
- **Given:** Modal open
- **When:** User clicks home team dropdown
- **Then:** All teams in league listed
- **Verify:** Open dropdown, count team options

### Technical Notes
- New file: `src/components/GameSetupModal.tsx`
- Pull teams from league config or playerDatabase

---

## S-B004: Add Pitcher Selection to GameSetup

**Parent Feature:** F-B002
**Priority:** P0
**Estimated Size:** Medium

**As a** user setting up a game
**I want to** select starting pitchers
**So that** I have the right matchup

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Pitcher Dropdowns Appear**
- **Given:** Both teams selected
- **When:** User views modal
- **Then:** Pitcher dropdown for each team visible
- **Verify:** Find two pitcher selectors

**AC-2: Shows Team's Pitchers**
- **Given:** Sirloins selected as away team
- **When:** User opens away pitcher dropdown
- **Then:** Sirloins rotation pitchers listed
- **Verify:** Find known Sirloins pitcher names

**AC-3: Start Requires Pitchers**
- **Given:** Teams selected but no pitchers
- **When:** User tries to start game
- **Then:** Error or disabled state prevents start
- **Verify:** Try start without pitchers, confirm blocked

### Technical Notes
- Filter to ROTATION role from team roster
- Default to first starter in rotation

---

## S-B005: Add Stadium Selection to GameSetup

**Parent Feature:** F-B003
**Priority:** P1
**Estimated Size:** Medium

**As a** user setting up a game
**I want to** select the stadium
**So that** park factors apply correctly

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Stadium Dropdown Exists**
- **Given:** GameSetupModal open
- **When:** User views form
- **Then:** Stadium dropdown present
- **Verify:** Find stadium selector

**AC-2: Defaults to Home Team Stadium**
- **Given:** Beewolves selected as home team
- **When:** Stadium dropdown checked
- **Then:** Beewolves' home stadium pre-selected
- **Verify:** Confirm default matches home team

**AC-3: Selection Saved**
- **Given:** User selects "Emerald Diamond"
- **When:** Game starts
- **Then:** Game record has stadium = "Emerald Diamond"
- **Verify:** Check game data in storage

### Technical Notes
- Need stadium database with team associations
- Per STADIUM_ANALYTICS_SPEC.md

---

## S-B006: Create PostGameScreen Component

**Parent Feature:** F-B004
**Priority:** P0
**Estimated Size:** Large

**As a** user completing a game
**I want to** see a comprehensive summary
**So that** I know what happened

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Final Score Displayed**
- **Given:** Game ended Sirloins 5, Beewolves 3
- **When:** PostGameScreen renders
- **Then:** "Sirloins 5 - Beewolves 3" or similar visible
- **Verify:** Find final score text

**AC-2: Winner Highlighted**
- **Given:** Sirloins won
- **When:** User views screen
- **Then:** "Sirloins Win!" or winning team emphasized
- **Verify:** Find winner indication

**AC-3: Continue Button Works**
- **Given:** PostGameScreen displayed
- **When:** User clicks "Continue"
- **Then:** Navigation to season dashboard occurs
- **Verify:** Click, confirm URL change

### Technical Notes
- New file: `src/pages/PostGameScreen.tsx`
- Archive game to seasonGames storage

---

## S-B007: Add Top Performers to PostGame

**Parent Feature:** F-B004
**Priority:** P0
**Estimated Size:** Medium

**As a** user viewing post-game summary
**I want to** see top performers
**So that** I know who had the best game

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Top Batters Shown**
- **Given:** Player A had 3-4 with 2 RBI
- **When:** PostGameScreen displays
- **Then:** Player A listed in top performers
- **Verify:** Find batter stats in performers section

**AC-2: Winning Pitcher Shown**
- **Given:** Pitcher earned the win
- **When:** PostGameScreen displays
- **Then:** Winning pitcher with "W" designation shown
- **Verify:** Find pitcher with win indicator

**AC-3: Save Shown If Applicable**
- **Given:** Reliever earned save
- **When:** PostGameScreen displays
- **Then:** Save pitcher with "S" designation shown
- **Verify:** Find save pitcher or confirm hidden if no save

### Technical Notes
- Calculate W/L/S per baseball rules
- Top batters by hits or RBI

---

## S-B008: Create Player of Game Display

**Parent Feature:** F-B005
**Priority:** P0
**Estimated Size:** Medium

**As a** user after a game
**I want to** see Player of the Game
**So that** I celebrate the standout performance

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: POG Displayed**
- **Given:** Game ended
- **When:** PostGameScreen renders
- **Then:** Player of the Game section with player name visible
- **Verify:** Find POG element with name

**AC-2: POG Stats Shown**
- **Given:** POG had 4-5, 3 RBI, HR
- **When:** POG section displays
- **Then:** Key stats that earned POG visible
- **Verify:** Find stat line in POG section

**AC-3: Fame Bonus Shown**
- **Given:** POG selection
- **When:** POG section displays
- **Then:** "+2 Fame" or similar bonus indicated
- **Verify:** Find fame bonus text

### Technical Notes
- POG calculation: highest WPA or stat combination
- Store with game record

---

## S-B009: Create BoxScoreView Component

**Parent Feature:** F-B006
**Priority:** P1
**Estimated Size:** Large

**As a** user wanting game details
**I want to** see a complete box score
**So that** I can review all player performances

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Batting Tables Present**
- **Given:** Game completed
- **When:** BoxScoreView renders
- **Then:** Batting table for each team visible
- **Verify:** Find two batting tables

**AC-2: Standard Columns**
- **Given:** Batting table displayed
- **When:** User views columns
- **Then:** AB, R, H, RBI, BB, K columns visible
- **Verify:** Find all 6 standard columns

**AC-3: Totals Row**
- **Given:** Batting table displayed
- **When:** User views bottom row
- **Then:** Team totals row present
- **Verify:** Find row with "Totals" or sum values

### Technical Notes
- New file: `src/components/BoxScoreView.tsx`
- Calculate from game event log

---

## S-B010: Add Pitching Box Score

**Parent Feature:** F-B006
**Priority:** P1
**Estimated Size:** Medium

**As a** user viewing box score
**I want to** see pitching stats
**So that** I can review pitching performances

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Pitching Table Present**
- **Given:** BoxScoreView open
- **When:** User scrolls to pitching
- **Then:** Pitching table for each team visible
- **Verify:** Find pitching tables

**AC-2: Pitching Columns**
- **Given:** Pitching table displayed
- **When:** User views columns
- **Then:** IP, H, R, ER, BB, K columns visible
- **Verify:** Find 6 pitching columns

**AC-3: Decision Noted**
- **Given:** Pitcher got the win
- **When:** User views that pitcher's row
- **Then:** "W" or win indicator shown
- **Verify:** Find decision indicator

### Technical Notes
- IP calculated as outs/3 (e.g., 5.1 = 5 innings + 1 out)
- W/L/S indicators

---

## S-B011: Create InningEndSummary Component

**Parent Feature:** F-B007
**Priority:** P1
**Estimated Size:** Medium

**As a** user during a game
**I want to** see a summary at inning end
**So that** I track the game flow

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Appears on Inning Flip**
- **Given:** Bottom of 1st, 2 outs
- **When:** Third out recorded
- **Then:** Summary modal appears
- **Verify:** Record out, see modal

**AC-2: Shows Half-Inning Stats**
- **Given:** Inning had 2 runs, 3 hits, 1 LOB
- **When:** Summary displays
- **Then:** "2R 3H 1LOB" or similar shown
- **Verify:** Read stats in modal

**AC-3: Auto-Dismisses**
- **Given:** Summary showing
- **When:** User waits 3 seconds
- **Then:** Modal disappears
- **Verify:** Time display, confirm auto-close

### Technical Notes
- New file: `src/components/GameTracker/InningEndSummary.tsx`
- Track half-inning stats separately

---

## S-B012: Create PitcherExitPrompt Component

**Parent Feature:** F-B008
**Priority:** P1
**Estimated Size:** Medium

**As a** manager
**I want to** be prompted about tired pitchers
**So that** I consider pitching changes

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Triggers at 100 Pitches**
- **Given:** Pitcher at 100 pitches
- **When:** Next at-bat starts
- **Then:** Prompt appears asking about pitcher change
- **Verify:** Track pitch count, confirm prompt at 100

**AC-2: Keep In Option**
- **Given:** Prompt displayed
- **When:** User clicks "Keep In"
- **Then:** Prompt closes, no change made
- **Verify:** Click keep, confirm game continues

**AC-3: Change Pitcher Option**
- **Given:** Prompt displayed
- **When:** User clicks "Change Pitcher"
- **Then:** Substitution modal opens
- **Verify:** Click change, see pitching change UI

### Technical Notes
- Configurable threshold (default 100)
- Non-blocking - can be ignored

---

## S-B013: Create DoubleSwitchModal Component

**Parent Feature:** F-B009
**Priority:** P1
**Estimated Size:** Large

**As a** manager (NL rules)
**I want to** execute a double switch
**So that** I optimize batting order with pitcher change

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Pitcher Selection**
- **Given:** DoubleSwitchModal open
- **When:** User views modal
- **Then:** Bullpen pitchers selectable
- **Verify:** Find pitcher dropdown/list

**AC-2: Position Player Selection**
- **Given:** DoubleSwitchModal open
- **When:** User views modal
- **Then:** Bench position players selectable
- **Verify:** Find position player dropdown/list

**AC-3: Batting Position Selection**
- **Given:** Both players selected
- **When:** User views modal
- **Then:** Batting order position (1-9) selectable for each
- **Verify:** Find batting position inputs

### Technical Notes
- New file: `src/components/GameTracker/DoubleSwitchModal.tsx`
- Per SUBSTITUTION_FLOW_SPEC.md

---

## S-B014: Implement Double Switch Logic

**Parent Feature:** F-B009
**Priority:** P1
**Estimated Size:** Medium

**As a** manager completing double switch
**I want to** batting order correctly updated
**So that** my lineup reflects the change

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Pitcher at Selected Spot**
- **Given:** Pitcher enters at batting position 8
- **When:** Double switch confirmed
- **Then:** Lineup shows pitcher batting 8th
- **Verify:** Check lineup panel

**AC-2: Position Player Swapped**
- **Given:** Position player enters
- **When:** Double switch confirmed
- **Then:** New player takes outgoing player's defensive position
- **Verify:** Check defensive alignment

**AC-3: Nine Positions Valid**
- **Given:** Double switch complete
- **When:** User views lineup
- **Then:** Exactly 9 valid defensive positions
- **Verify:** Count positions, confirm all 9 unique

### Technical Notes
- Update lineupState correctly
- Validate no duplicate positions

---

## S-B015: Detect Walkoff Wins

**Parent Feature:** F-B010
**Priority:** P1
**Estimated Size:** Medium

**As a** user
**I want to** walkoffs automatically detected
**So that** they get special recognition

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Detects Walkoff Condition**
- **Given:** Bottom of 9th, home down by 1
- **When:** Home team scores 2 runs to win
- **Then:** Walkoff flag set to true
- **Verify:** Check game record for walkoff: true

**AC-2: Identifies Hero**
- **Given:** Walkoff HR by Madoka Hayata
- **When:** Walkoff recorded
- **Then:** Hayata marked as walkoff hero
- **Verify:** Check walkoffHero in game record

**AC-3: Extra Innings Supported**
- **Given:** Bottom of 11th, tie game
- **When:** Home team scores winning run
- **Then:** Still detected as walkoff
- **Verify:** Extra inning walkoff recognized

### Technical Notes
- Check: bottom of 9+, home team scores winning run
- Hero: player with game-winning RBI/run

---

## S-B016: Display Walkoff Celebration

**Parent Feature:** F-B010
**Priority:** P1
**Estimated Size:** Medium

**As a** user after a walkoff
**I want to** see a celebration screen
**So that** the moment feels special

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Walkoff Banner**
- **Given:** Walkoff detected
- **When:** Game ends
- **Then:** "WALKOFF!" banner displayed
- **Verify:** Find walkoff banner text

**AC-2: Hero Highlighted**
- **Given:** Walkoff hero identified
- **When:** Celebration shows
- **Then:** Hero name prominently displayed
- **Verify:** Find hero name in celebration

**AC-3: Fame Bonus Shown**
- **Given:** Walkoff celebrated
- **When:** User views celebration
- **Then:** Fame bonus (+3) indicated
- **Verify:** Find fame bonus text

### Technical Notes
- Display before normal post-game screen
- Transition to post-game after dismissal

---

## S-B017: Create FameEventToast Component

**Parent Feature:** F-B011
**Priority:** P1
**Estimated Size:** Medium

**As a** user during a game
**I want to** see Fame events as they happen
**So that** I know about notable moments

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Toast Appears on Event**
- **Given:** Player hits home run (Fame +1)
- **When:** At-bat completes
- **Then:** Toast with "HR! +1 Fame" or similar appears
- **Verify:** Record HR, see toast

**AC-2: Shows Event Details**
- **Given:** Toast displayed
- **When:** User reads toast
- **Then:** Event type and fame value visible
- **Verify:** Read toast content

**AC-3: Auto-Dismisses**
- **Given:** Toast showing
- **When:** 3 seconds pass
- **Then:** Toast disappears
- **Verify:** Time display, confirm auto-close

### Technical Notes
- New file: `src/components/GameTracker/FameEventToast.tsx`
- Queue multiple toasts if simultaneous

---

## S-B018: Generate Post-Game Headline

**Parent Feature:** F-B012
**Priority:** P1
**Estimated Size:** Medium

**As a** user viewing post-game
**I want to** see a generated headline
**So that** I get narrative context

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Headline Generated**
- **Given:** Game ended Sirloins 8, Beewolves 2
- **When:** PostGameScreen displays
- **Then:** Headline like "Sirloins Dominate Beewolves 8-2" shown
- **Verify:** Find headline text

**AC-2: Reporter Name Shown**
- **Given:** Headline displayed
- **When:** User views byline
- **Then:** Reporter name visible
- **Verify:** Find byline with name

**AC-3: Matches Game Outcome**
- **Given:** Close game (5-4)
- **When:** Headline generated
- **Then:** Headline reflects close nature
- **Verify:** Headline mentions "edge" or "squeak" not "dominate"

### Technical Notes
- Use narrativeEngine templates
- Select template based on margin

---

# PHASE B SUMMARY

| ID | Feature | Priority |
|----|---------|----------|
| S-B001 | PreGameScreen Component | P0 |
| S-B002 | Starting Pitchers in PreGame | P0 |
| S-B003 | GameSetupModal Component | P0 |
| S-B004 | Pitcher Selection in Setup | P0 |
| S-B005 | Stadium Selection | P1 |
| S-B006 | PostGameScreen Component | P0 |
| S-B007 | Top Performers in PostGame | P0 |
| S-B008 | Player of Game Display | P0 |
| S-B009 | BoxScoreView Component | P1 |
| S-B010 | Pitching Box Score | P1 |
| S-B011 | InningEndSummary | P1 |
| S-B012 | PitcherExitPrompt | P1 |
| S-B013 | DoubleSwitchModal | P1 |
| S-B014 | Double Switch Logic | P1 |
| S-B015 | Walkoff Detection | P1 |
| S-B016 | Walkoff Celebration | P1 |
| S-B017 | FameEventToast | P1 |
| S-B018 | Post-Game Headline | P1 |

**Total Phase B Stories:** 18
**P0 Stories:** 8
**P1 Stories:** 10

---

*All stories follow Ralph Framework: < 200 lines, max 3 acceptance criteria, Given/When/Then/Verify format.*
