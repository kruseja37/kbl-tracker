# KBL Tracker - Phase C User Stories: Season Infrastructure

> **Purpose**: User stories for Standings, Schedule, Leaders, Roster, Team Stats
> **Generated**: January 26, 2026
> **Format**: Ralph Framework - max 3 acceptance criteria per story

---

# PHASE C: SEASON INFRASTRUCTURE

---

## S-C001: Create StandingsView Component

**Parent Feature:** F-C001
**Priority:** P0
**Estimated Size:** Large

**As a** user
**I want to** see full league standings
**So that** I know how all teams are performing

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: All Teams Listed**
- **Given:** 8 teams in league
- **When:** StandingsView renders
- **Then:** All 8 teams listed in standings
- **Verify:** Count team rows, confirm 8

**AC-2: W-L-PCT Columns**
- **Given:** Standings displayed
- **When:** User views table columns
- **Then:** Wins, Losses, PCT columns visible
- **Verify:** Find 3 record columns

**AC-3: Sorted By Winning %**
- **Given:** Team A is 30-10, Team B is 25-15
- **When:** Standings render
- **Then:** Team A appears above Team B
- **Verify:** Confirm descending sort by PCT

### Technical Notes
- New file: `src/components/StandingsView.tsx`
- Calculate from season game results

---

## S-C002: Add Games Back Column

**Parent Feature:** F-C001
**Priority:** P0
**Estimated Size:** Small

**As a** user viewing standings
**I want to** see games back from first place
**So that** I understand the race

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: GB Column Present**
- **Given:** Standings displayed
- **When:** User views columns
- **Then:** "GB" column visible
- **Verify:** Find GB column header

**AC-2: First Place Shows "-"**
- **Given:** Team in first place
- **When:** User views their GB
- **Then:** Shows "-" not "0"
- **Verify:** Find "-" in first place row

**AC-3: Calculation Correct**
- **Given:** Leader is 30-10, second place is 28-14
- **When:** GB calculated
- **Then:** Second place shows "3.0" GB
- **Verify:** Formula: ((30-28) + (14-10))/2 = 3

### Technical Notes
- GB = ((FirstWins - TeamWins) + (TeamLosses - FirstLosses)) / 2

---

## S-C003: Add Streak Column

**Parent Feature:** F-C001
**Priority:** P1
**Estimated Size:** Small

**As a** user viewing standings
**I want to** see win/loss streaks
**So that** I know who's hot or cold

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Streak Column Present**
- **Given:** Standings displayed
- **When:** User views columns
- **Then:** "Streak" column visible
- **Verify:** Find streak column

**AC-2: Format Correct**
- **Given:** Team won last 5 games
- **When:** User views streak
- **Then:** Shows "W5"
- **Verify:** Find "W5" text

**AC-3: Color Coded**
- **Given:** W5 streak vs L3 streak
- **When:** User views both
- **Then:** W5 is green, L3 is red
- **Verify:** Check text colors

### Technical Notes
- Calculate from recent game results
- Track consecutive W or L

---

## S-C004: Create ScheduleView Component

**Parent Feature:** F-C002
**Priority:** P1
**Estimated Size:** Large

**As a** user
**I want to** see the season schedule
**So that** I know what games to play

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: All Games Listed**
- **Given:** 48-game season schedule
- **When:** ScheduleView renders
- **Then:** 48 game rows visible
- **Verify:** Count or paginate through all

**AC-2: Past Games Show Score**
- **Given:** Game 1 was Sirloins 5, Beewolves 3
- **When:** User views Game 1 row
- **Then:** Score "5-3" visible
- **Verify:** Find score in completed game row

**AC-3: Future Games Show Matchup**
- **Given:** Game 20 not yet played
- **When:** User views Game 20 row
- **Then:** Shows "Sirloins @ Beewolves" (no score)
- **Verify:** Find matchup text, no score

### Technical Notes
- New file: `src/pages/ScheduleView.tsx`
- Generate schedule from league config

---

## S-C005: Add Team Filter to Schedule

**Parent Feature:** F-C002
**Priority:** P1
**Estimated Size:** Small

**As a** user viewing schedule
**I want to** filter by team
**So that** I see only my team's games

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Filter Dropdown Present**
- **Given:** ScheduleView displayed
- **When:** User views controls
- **Then:** Team filter dropdown visible
- **Verify:** Find team filter element

**AC-2: Filter Works**
- **Given:** "Sirloins" selected in filter
- **When:** Schedule updates
- **Then:** Only games with Sirloins shown
- **Verify:** Check all visible games include Sirloins

**AC-3: All Teams Option**
- **Given:** Filter active
- **When:** User selects "All Teams"
- **Then:** Full schedule displays again
- **Verify:** Count returns to full

### Technical Notes
- Default to user's selected team if set

---

## S-C006: Create LeagueLeadersView Component

**Parent Feature:** F-C003
**Priority:** P1
**Estimated Size:** Large

**As a** user
**I want to** see league leaders
**So that** I know the best performers

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Batting Leaders Section**
- **Given:** LeagueLeadersView renders
- **When:** User views page
- **Then:** Batting leaders for AVG, HR, RBI visible
- **Verify:** Find 3 batting categories

**AC-2: Pitching Leaders Section**
- **Given:** LeagueLeadersView renders
- **When:** User views page
- **Then:** Pitching leaders for ERA, W, K visible
- **Verify:** Find 3 pitching categories

**AC-3: Top 10 Per Category**
- **Given:** AVG leaders displayed
- **When:** User counts entries
- **Then:** Up to 10 players shown
- **Verify:** Count ≤ 10 entries

### Technical Notes
- New file: `src/pages/LeagueLeadersView.tsx`
- Apply qualification minimums

---

## S-C007: Add Qualification Rules

**Parent Feature:** F-C003
**Priority:** P1
**Estimated Size:** Small

**As a** user viewing leaders
**I want to** see only qualified players
**So that** stats are meaningful

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Batting Qualification Applied**
- **Given:** 20 games played, team
- **When:** AVG leaders calculated
- **Then:** Only players with 62+ PA qualify (3.1*20)
- **Verify:** Check minimum PA of listed players

**AC-2: Pitching Qualification Applied**
- **Given:** 20 games played
- **When:** ERA leaders calculated
- **Then:** Only pitchers with 20+ IP qualify (1*20)
- **Verify:** Check minimum IP of listed pitchers

**AC-3: "Q" Badge Shown**
- **Given:** Qualified player displayed
- **When:** User views row
- **Then:** Small "Q" badge or indicator visible
- **Verify:** Find qualification indicator

### Technical Notes
- Batting: 3.1 PA per team game
- Pitching: 1 IP per team game

---

## S-C008: Create SeasonProgressTracker Component

**Parent Feature:** F-C004
**Priority:** P0
**Estimated Size:** Medium

**As a** user
**I want to** see season progress
**So that** I know where I am in the season

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Progress Bar Visible**
- **Given:** 20 of 48 games played
- **When:** Component renders
- **Then:** Progress bar at ~42% visible
- **Verify:** Find progress element showing ~42%

**AC-2: Games Count Shown**
- **Given:** 20 of 48 games played
- **When:** User views tracker
- **Then:** "20/48" or "Game 20 of 48" text shown
- **Verify:** Find game count text

**AC-3: Phase Indicator**
- **Given:** In regular season
- **When:** User views tracker
- **Then:** "Regular Season" phase shown
- **Verify:** Find phase text

### Technical Notes
- Phases: Regular Season, All-Star Break, Trade Deadline, Playoffs, Offseason

---

## S-C009: Create RosterView Component

**Parent Feature:** F-C005
**Priority:** P0
**Estimated Size:** Large

**As a** user
**I want to** see my team roster
**So that** I know all my players

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: All Players Listed**
- **Given:** Team has 22 players
- **When:** RosterView renders
- **Then:** All 22 players visible
- **Verify:** Count player rows

**AC-2: Position Shown**
- **Given:** Player Madoka Hayata is SS
- **When:** User views roster
- **Then:** "SS" shown for Hayata
- **Verify:** Find position abbreviation

**AC-3: Grouped By Type**
- **Given:** Roster displayed
- **When:** User views layout
- **Then:** Players grouped (Catchers, Infielders, Outfielders, Pitchers)
- **Verify:** Find group headers or sections

### Technical Notes
- New file: `src/pages/RosterView.tsx`
- 22-man roster per SMB4

---

## S-C010: Add Stats to Roster View

**Parent Feature:** F-C005
**Priority:** P1
**Estimated Size:** Medium

**As a** user viewing roster
**I want to** see key stats per player
**So that** I know how they're performing

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Batter Stats Shown**
- **Given:** Batter on roster
- **When:** User views row
- **Then:** AVG, HR, RBI visible
- **Verify:** Find 3 batting stat columns

**AC-2: Pitcher Stats Shown**
- **Given:** Pitcher on roster
- **When:** User views row
- **Then:** W-L, ERA visible
- **Verify:** Find pitching stats

**AC-3: Click Opens PlayerCard**
- **Given:** Roster row displayed
- **When:** User clicks row
- **Then:** PlayerCard modal opens
- **Verify:** Click row, see modal

### Technical Notes
- Pull from seasonStats aggregation

---

## S-C011: Create TeamStatsView Component

**Parent Feature:** F-C006
**Priority:** P1
**Estimated Size:** Medium

**As a** user
**I want to** see team aggregate statistics
**So that** I know overall team performance

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Team Batting Totals**
- **Given:** TeamStatsView renders
- **When:** User views batting section
- **Then:** R, H, HR, AVG totals visible
- **Verify:** Find team batting aggregate

**AC-2: Team Pitching Totals**
- **Given:** TeamStatsView renders
- **When:** User views pitching section
- **Then:** ERA, WHIP, K totals visible
- **Verify:** Find team pitching aggregate

**AC-3: League Rank Shown**
- **Given:** Team batting stats displayed
- **When:** User views each stat
- **Then:** League rank (e.g., "3rd in HR") indicated
- **Verify:** Find rank indicators

### Technical Notes
- New file: `src/components/TeamStatsView.tsx`
- Calculate by summing player stats

---

## S-C012: Create TeamFinancialsView Component

**Parent Feature:** F-C007
**Priority:** P1
**Estimated Size:** Large

**As a** user
**I want to** see team financial overview
**So that** I understand salary situation

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Total Payroll Shown**
- **Given:** Team payroll is $50M
- **When:** TeamFinancialsView renders
- **Then:** "$50,000,000" or "50M" visible
- **Verify:** Find payroll total

**AC-2: Cap Space Shown**
- **Given:** Cap is $80M, payroll is $50M
- **When:** User views finances
- **Then:** "$30,000,000 available" or similar shown
- **Verify:** Find cap space amount

**AC-3: Top Salaries Listed**
- **Given:** Financials displayed
- **When:** User views detail
- **Then:** Top 5 highest-paid players listed
- **Verify:** Find 5 player salaries

### Technical Notes
- Per SALARY_SYSTEM_SPEC.md
- Requires player ratings (S-A009)

---

## S-C013: Create FanMoralePanel Component

**Parent Feature:** F-C008
**Priority:** P1
**Estimated Size:** Medium

**As a** user
**I want to** see fan morale status
**So that** I understand team support level

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Morale Value Shown**
- **Given:** Team morale is 65
- **When:** FanMoralePanel renders
- **Then:** "65" or gauge at 65% visible
- **Verify:** Find morale value

**AC-2: State Name Shown**
- **Given:** Morale 65 = CONTENT state
- **When:** User views panel
- **Then:** "CONTENT" or similar label shown
- **Verify:** Find state name

**AC-3: Trend Indicator**
- **Given:** Morale rising
- **When:** User views panel
- **Then:** ↑ or green arrow visible
- **Verify:** Find trend indicator

### Technical Notes
- Per FAN_MORALE_ENGINE_SPEC.md
- States: HOSTILE(0-20), FRUSTRATED, APATHETIC, CONTENT, SUPPORTIVE, EUPHORIC(90-100)

---

## S-C014: Create PlayoffBracket Component

**Parent Feature:** F-C009
**Priority:** P1
**Estimated Size:** Large

**As a** user in playoffs
**I want to** see the bracket visually
**So that** I understand the tournament

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Bracket Structure**
- **Given:** 4-team playoff
- **When:** PlayoffBracket renders
- **Then:** Bracket with 2 semifinal + 1 final shown
- **Verify:** Find bracket structure

**AC-2: Teams Placed**
- **Given:** Seeds 1-4 determined
- **When:** Bracket displays
- **Then:** Team names in correct seeded positions
- **Verify:** Find teams in bracket

**AC-3: Series Score Shown**
- **Given:** Series at 2-1
- **When:** User views matchup
- **Then:** "2-1" displayed
- **Verify:** Find series score

### Technical Notes
- New file: `src/components/PlayoffBracket.tsx`
- Support 4 or 8 team brackets

---

## S-C015: Create ChampionshipCelebration Component

**Parent Feature:** F-C010
**Priority:** P1
**Estimated Size:** Large

**As a** user winning championship
**I want to** celebrate the victory
**So that** the achievement feels special

### Size Check ✓
- [x] Can be implemented in < 200 lines of code
- [x] Has no more than 3 acceptance criteria
- [x] Does not require architectural decisions
- [x] Has clear, testable end state

### Acceptance Criteria

**AC-1: Champion Displayed**
- **Given:** Sirloins won championship
- **When:** Celebration renders
- **Then:** "SIRLOINS ARE CHAMPIONS!" or similar shown
- **Verify:** Find championship text

**AC-2: Series MVP Shown**
- **Given:** MVP determined
- **When:** Celebration displays
- **Then:** MVP name prominently shown
- **Verify:** Find MVP display

**AC-3: Saved to History**
- **Given:** Championship celebrated
- **When:** User continues
- **Then:** Championship recorded in franchiseHistory
- **Verify:** Check history storage

### Technical Notes
- Archive championship with: year, team, MVP, opponent, games

---

# PHASE C SUMMARY

| ID | Feature | Priority |
|----|---------|----------|
| S-C001 | StandingsView Component | P0 |
| S-C002 | Games Back Column | P0 |
| S-C003 | Streak Column | P1 |
| S-C004 | ScheduleView Component | P1 |
| S-C005 | Team Filter for Schedule | P1 |
| S-C006 | LeagueLeadersView | P1 |
| S-C007 | Qualification Rules | P1 |
| S-C008 | SeasonProgressTracker | P0 |
| S-C009 | RosterView Component | P0 |
| S-C010 | Stats in Roster | P1 |
| S-C011 | TeamStatsView | P1 |
| S-C012 | TeamFinancialsView | P1 |
| S-C013 | FanMoralePanel | P1 |
| S-C014 | PlayoffBracket | P1 |
| S-C015 | ChampionshipCelebration | P1 |

**Total Phase C Stories:** 15
**P0 Stories:** 4
**P1 Stories:** 11

---

*All stories follow Ralph Framework: < 200 lines, max 3 acceptance criteria, Given/When/Then/Verify format.*
