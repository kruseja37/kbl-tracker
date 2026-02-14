# Finalize & Advance Phase - User Stories

> **Feature Area**: Offseason Final Phase - Finalize & Advance
> **Platform**: iPad-first (1024×768 minimum)
> **Created**: January 29, 2026
> **Source**: OFFSEASON_SYSTEM_SPEC.md, FARM_SYSTEM_SPEC.md, User Requirements

---

## Overview

The Finalize & Advance phase is the final offseason phase where users:
1. Make final roster changes (call-ups, send-downs) for their team(s)
2. Review AI-managed roster changes for other teams
3. Validate all rosters meet requirements (22 MLB + 10 Farm = 32 per team)
4. Generate a transaction report to apply changes in SMB4
5. Trigger season transition (ages, salaries, stat resets)
6. **Review Chemistry Rebalancing** (see how roster changes affected team dynamics)
7. Advance to the new season (which starts with an empty schedule)

**Key Principle**: This phase focuses on ROSTER FINALIZATION only. Schedule management happens in the Regular Season after advancing.

---

## Phase Context

**Preceding Phases:**
- Phase 7: Draft (all picks → Farm)
- Phase 8: Trade Phase (trade players between teams)

**This Phase:**
- Phase 9: Finalize & Advance

**Following:**
- New Season begins (Regular Season tab, empty schedule)

---

## User Stories

### Section 1: Phase Entry & Team Selection

#### S-FA001: Enter Finalize & Advance Phase
**As a** user completing the Trade Phase
**I want to** enter the Finalize & Advance phase
**So that** I can make final roster adjustments before the new season

**Acceptance Criteria:**
- Phase header shows "Finalize & Advance - Season [X+1] Prep"
- Team selector dropdown defaults to user's primary team
- Can switch between any team in the league
- Current roster status displayed (X/22 MLB, Y/10 Farm)

---

#### S-FA002: Select Team to Manage
**As a** user managing multiple teams or viewing AI teams
**I want to** select any team from a dropdown
**So that** I can view and (for my teams) modify their rosters

**Acceptance Criteria:**
- Dropdown lists all teams alphabetically
- User's team(s) marked with ⭐ indicator
- Selecting a team loads their MLB and Farm rosters
- AI-controlled teams show roster but actions are disabled (view-only)
- User-controlled teams show full editing capabilities

---

### Section 2: Roster Viewing

#### S-FA003: View MLB Roster
**As a** user viewing a team's roster
**I want to** see the full 22-player MLB roster
**So that** I can assess who to keep, send down, or replace

**Acceptance Criteria:**
- Shows all MLB players with: Name, Position, Grade, Age, Salary, WAR (last season)
- Indicates roster count: "MLB Roster: 21/22" (with gap indicator if under 22)
- Players sortable by: Position, Grade, Age, Salary, WAR
- Each player row has [Send Down] action button (for user's team)
- Highlights players who are send-down candidates (low grade, high salary, old age)

**Display Fields:**
```
| Name | Pos | Grade | Age | Salary | WAR | Traits | [Action] |
```

---

#### S-FA004: View Farm Roster
**As a** user viewing a team's roster
**I want to** see the full 10-player Farm roster
**So that** I can assess who to call up or keep developing

**Acceptance Criteria:**
- Shows all Farm prospects with: Name, Position, Grade, Potential Ceiling, Age, Years in Minors
- Indicates roster count: "Farm Roster: 9/10" (with gap indicator if under 10)
- Players sortable by: Position, Grade, Potential, Age, Years
- Each player row has [Call Up] action button (for user's team)
- Highlights prospects ready for call-up (high potential, 2+ years in minors)

**Display Fields:**
```
| Name | Pos | Grade | Ceiling | Age | Yrs Minor | [Action] |
```

---

### Section 3: Roster Transactions (User's Team)

#### S-FA005: Call Up Prospect to MLB
**As a** user managing my team
**I want to** call up a Farm prospect to the MLB roster
**So that** I can add young talent to my major league team

**Acceptance Criteria:**
- Clicking [Call Up] opens confirmation modal
- Modal shows:
  - Prospect details (Name, Position, Grade, Ceiling, Age)
  - "This player will be designated as a ROOKIE for the upcoming season"
  - Salary assignment based on grade: B=$1.2M, B-=$0.9M, C+=$0.7M, C=$0.6M, C-=$0.5M
  - Warning if MLB roster is full (must send down someone first)
- On confirm:
  - Prospect moves from Farm to MLB
  - Farm roster decreases by 1
  - MLB roster increases by 1
  - Rookie flag set (if just drafted OR never previously called up)
  - Transaction logged

**Rookie Designation Rules:**
- Player is designated ROOKIE if:
  - They were drafted in the most recent draft, OR
  - They have never been called up to MLB before
- Rookie status lasts for their first MLB season

---

#### S-FA006: Send Down Player to Farm
**As a** user managing my team
**I want to** send down an MLB player to the Farm roster
**So that** I can make room for call-ups or develop struggling players

**Acceptance Criteria:**
- Clicking [Send Down] opens confirmation modal
- Modal shows:
  - Player details (Name, Position, Grade, Age, Salary, WAR)
  - Morale impact: "-15 to -25 morale" (based on tenure)
  - Retirement risk calculation (see formula below)
  - Warning if Farm roster is full (must call up someone first)
  - Warning if player grade is A- or higher: "High-grade players rarely accept demotion"
- On confirm:
  - Player moves from MLB to Farm
  - MLB roster decreases by 1
  - Farm roster increases by 1
  - Morale penalty applied
  - Retirement risk assessed
  - Transaction logged

**Send-Down Retirement Risk Formula:**
```
Base Risk = 0%

if (age >= 35): risk += 40%
else if (age >= 32): risk += 20%
else if (age >= 30): risk += 10%

if (yearsOfService >= 10): risk += 30%
else if (yearsOfService >= 6): risk += 15%

if (salary >= $20M): risk += 20%
else if (salary >= $10M): risk += 10%

if (hasCareerAwards): risk += 15%

risk += (priorDemotions × 10%)

Maximum: 90%
```

**Retirement Check:**
- If player retires immediately:
  - Remove from roster entirely
  - Add to Inactive Player Database
  - Display retirement notification
  - No Farm slot consumed

---

#### S-FA007: Swap Players (Call Up + Send Down)
**As a** user managing my team
**I want to** swap a Farm prospect with an MLB player in one action
**So that** I can efficiently manage roster transactions

**Acceptance Criteria:**
- "Swap" button available when viewing either roster
- Opens modal showing:
  - Left side: Select player to send down (from MLB)
  - Right side: Select prospect to call up (from Farm)
  - Combined impact summary (morale, salary, roster balance)
- Both transactions processed atomically
- Single transaction log entry: "Swapped [Player] for [Prospect]"

---

#### S-FA008: Undo Recent Transaction
**As a** user who made a roster change
**I want to** undo my most recent transaction
**So that** I can correct mistakes before finalizing

**Acceptance Criteria:**
- [Undo] button appears after any transaction
- Shows: "Undo: [Transaction description]"
- Clicking undo reverses the transaction
- Undo available until user advances or switches teams
- Maximum undo depth: 5 transactions
- Undo not available for AI-managed transactions

---

### Section 4: AI Roster Management

#### S-FA009: AI Auto-Manages Non-User Teams
**As a** user with AI-controlled teams in the league
**I want** the system to automatically balance their rosters
**So that** all teams are valid without manual intervention

**Acceptance Criteria:**
- AI runs automatically when entering phase (or on demand via [Process AI Teams])
- For each AI team:
  - If MLB < 22: Call up best Farm prospects (by Potential Ceiling)
  - If MLB > 22: Send down worst MLB players (by Grade, then Age)
  - If Farm < 10: Flag as incomplete (rare, usually filled by draft)
  - If Farm > 10: Release worst prospects (lowest Grade + Ceiling)
- AI decisions logged in transaction report
- User can view AI team rosters (read-only)

**AI Call-Up Priority:**
1. Highest Potential Ceiling
2. Highest Current Grade (tie-breaker)
3. Youngest Age (tie-breaker)

**AI Send-Down Priority:**
1. Lowest Grade
2. Oldest Age (tie-breaker)
3. Highest Salary (tie-breaker)

---

#### S-FA010: Review AI Transactions
**As a** user reviewing the league state
**I want to** see what roster changes AI made for other teams
**So that** I understand the competitive landscape

**Acceptance Criteria:**
- "AI Transactions" section shows all AI-made moves
- Grouped by team
- Each transaction shows: Action, Player, From, To
- Can collapse/expand by team
- Printable/exportable with main transaction report

---

### Section 5: Validation

#### S-FA011: Roster Validation Gate
**As a** user attempting to advance
**I want** the system to validate all rosters
**So that** every team has exactly 22 MLB + 10 Farm players

**Acceptance Criteria:**
- Validation runs automatically before advance
- Checks each team: MLB = 22, Farm = 10
- If any team fails:
  - Shows validation errors: "Team X: MLB 21/22 (1 short), Farm 10/10"
  - [Advance] button disabled
  - Links to problem teams for fixing
- If all teams pass:
  - Shows green checkmarks for all teams
  - [Advance] button enabled

**Validation Summary Display:**
```
✓ Tigers: 22 MLB, 10 Farm
✓ Sox: 22 MLB, 10 Farm
✗ Bears: 21 MLB, 10 Farm (1 MLB short)
✓ Crocs: 22 MLB, 10 Farm
...
```

---

#### S-FA012: Fix Validation Errors
**As a** user with roster validation errors
**I want** clear guidance on how to fix them
**So that** I can proceed to advance

**Acceptance Criteria:**
- Each error shows specific issue and suggested action:
  - "MLB short: Call up a prospect or sign a free agent"
  - "Farm short: This should not happen - contact support"
  - "MLB over: Send down a player"
  - "Farm over: Release a prospect"
- Clicking error navigates to that team's roster view
- Real-time validation updates as changes are made

---

### Section 6: Transaction Report

#### S-FA013: Generate Transaction Report
**As a** user ready to apply changes to SMB4
**I want** a comprehensive list of all roster transactions
**So that** I can accurately replicate changes in the actual game

**Acceptance Criteria:**
- Transaction Report shows ALL changes:
  - User transactions (call-ups, send-downs, swaps)
  - AI transactions (same)
  - Retirements triggered by send-downs
- Organized by team for easy reference
- Each transaction shows:
  - Team name
  - Action type (CALL UP, SEND DOWN, RELEASE, RETIRE)
  - Player name and position
  - Additional context (new salary, rookie status, etc.)

**Report Format:**
```
═══════════════════════════════════════════════════
TRANSACTION REPORT - SEASON 2 PREP
Generated: January 29, 2026
═══════════════════════════════════════════════════

TIGERS (User-Controlled)
────────────────────────
✓ CALL UP: Marcus Williams (SS, B) → MLB [ROOKIE]
  - Salary: $1.2M
✓ SEND DOWN: Mike Johnson (SS, C+) → Farm
  - Morale: -18

SOX (AI-Controlled)
────────────────────────
✓ CALL UP: Jake Thompson (SP, B) → MLB [ROOKIE]
✓ SEND DOWN: Tom Davis (SP, C) → Farm
✓ RETIRED: Bill Smith (RP, C-) - Declined demotion

[... more teams ...]

═══════════════════════════════════════════════════
SUMMARY
- Total Call-Ups: 12
- Total Send-Downs: 14
- Total Retirements: 3
- All teams validated: 22 MLB + 10 Farm
═══════════════════════════════════════════════════
```

---

#### S-FA014: Export/Print Transaction Report
**As a** user applying changes to SMB4
**I want to** print or export the transaction report
**So that** I can reference it while making changes in the game

**Acceptance Criteria:**
- [Print Report] button generates printer-friendly version
- [Copy to Clipboard] button copies text version
- Report persists and is accessible from Season Archive after advancing

---

### Section 7: Season Transition

#### S-FA015: Season Transition Processing
**As a** user advancing to a new season
**I want** the system to process all season-end updates
**So that** player ages, salaries, and stats are properly updated

**Acceptance Criteria:**
- Processing runs automatically on advance confirmation
- Updates applied:
  - **Player Ages**: All players age +1 year
  - **Salaries**: Recalculated based on new age factor, ratings, traits
  - **Mojo**: Reset to NORMAL for all players
  - **Seasonal Stats**: Cleared (career totals preserved)
  - **Clutch Counters**: Reset to 0
  - **Season Fame**: Reset to 0 (career fame preserved)
  - **Years of Service**: Incremented by 1 for all MLB players
  - **Rookie Status**: Applied to newly called-up players
- Progress indicator shows each step
- Summary displayed on completion

**Age Factor Impact on Salary:**
| Age Range | Factor | Label |
|-----------|--------|-------|
| ≤24 | 0.70 | Rookie |
| 25-26 | 0.85 | Pre-Arb |
| 27-29 | 1.00 | Prime |
| 30-32 | 1.10 | Peak |
| 33-35 | 0.95 | Veteran |
| 36+ | 0.80 | Twilight |

---

#### S-FA016: Archive Previous Season
**As a** user advancing to a new season
**I want** the previous season's data archived
**So that** historical records are preserved

**Acceptance Criteria:**
- Archive includes:
  - Final standings
  - All player stats
  - Award winners
  - All transactions
  - Playoff results
  - Championship winner
  - Hall of Fame inductions
  - Retired numbers
- Archive accessible via Museum tab
- Season number incremented

---

### Section 7B: Chemistry Rebalancing

#### S-FA015B: Chemistry Recalculation

**As a** user advancing to a new season
**I want** the system to recalculate team chemistry based on all offseason roster changes
**So that** chemistry reflects the new team dynamics

**Acceptance Criteria:**
- Chemistry recalculated for all teams after roster finalization
- Factors considered:
  - **Veteran Leaders** (+5 to +10): Players with 8+ years who stayed
  - **Teammate Bonds** (+3 per bond): Pairs who played 3+ seasons together
  - **New Players** (-2 each): FA signings, draftees, trade acquisitions
  - **Personality Conflicts** (-5 to -15): Conflicting personality types
  - **Chemistry Drains Departing** (+3 to +10): Low morale players who left
  - **Championship Core** (+10): 3+ players from championship team remain
- Net chemistry change calculated per team
- Results passed to Chemistry Summary screen

**Chemistry Factors Table:**
| Factor | Effect | Trigger |
|--------|--------|---------|
| Veteran Leader | +5 to +10 | 8+ years in league, 3+ with team |
| Teammate Bond | +3 per bond | Pairs with 3+ seasons together |
| New Player | -2 each | FA signings, draftees, trades in |
| Personality Conflict | -5 to -15 | EGOTISTICAL vs TIMID, etc. |
| Chemistry Drain Left | +3 to +10 | Low morale player departed |
| Championship Core | +10 | 3+ championship players remain |

**Technical Notes:**
```typescript
interface ChemistryChange {
  factor: string;
  playerIds: string[];
  delta: number;
  description: string;
  icon: '📈' | '📉';
}

interface TeamChemistryResult {
  teamId: string;
  teamName: string;
  previousChemistry: number;
  newChemistry: number;
  netDelta: number;
  changes: ChemistryChange[];
}

function calculateChemistryRebalancing(
  team: Team,
  offseasonMoves: OffseasonMoves
): TeamChemistryResult {
  let delta = 0;
  const changes: ChemistryChange[] = [];

  // Bonus: Chemistry drains who departed
  for (const player of offseasonMoves.departed) {
    if (player.chemistryImpact < 0) {
      const bonus = Math.abs(player.chemistryImpact);
      delta += bonus;
      changes.push({
        factor: 'CHEMISTRY_DRAIN_LEFT',
        playerIds: [player.id],
        delta: bonus,
        description: `${player.name} departed (was chemistry drain)`,
        icon: '📈'
      });
    }
  }

  // Bonus: New veteran leaders
  for (const player of team.roster) {
    if (player.yearsInLeague >= 8 &&
        player.seasonsWithTeam >= 3 &&
        !player.hasVeteranLeaderBonus) {
      delta += 5;
      changes.push({
        factor: 'VETERAN_LEADER',
        playerIds: [player.id],
        delta: 5,
        description: `${player.name} became Veteran Leader`,
        icon: '📈'
      });
    }
  }

  // Penalty: New players adjustment period
  const newPlayers = team.roster.filter(p => p.seasonsWithTeam === 0);
  if (newPlayers.length > 0) {
    const penalty = newPlayers.length * -2;
    delta += penalty;
    changes.push({
      factor: 'NEW_PLAYERS',
      playerIds: newPlayers.map(p => p.id),
      delta: penalty,
      description: `${newPlayers.length} new player(s) adjusting`,
      icon: '📉'
    });
  }

  // Bonus: Championship core
  const champPlayers = team.roster.filter(p => p.wonChampionshipLastSeason);
  if (champPlayers.length >= 3) {
    delta += 10;
    changes.push({
      factor: 'CHAMPIONSHIP_CORE',
      playerIds: champPlayers.map(p => p.id),
      delta: 10,
      description: `Championship core intact (${champPlayers.length} players)`,
      icon: '📈'
    });
  }

  return {
    teamId: team.id,
    teamName: team.name,
    previousChemistry: team.chemistry,
    newChemistry: Math.max(0, Math.min(100, team.chemistry + delta)),
    netDelta: delta,
    changes
  };
}
```

---

#### S-FA015C: Chemistry Summary Screen

**As a** user advancing to a new season
**I want** to see a summary of chemistry changes for all teams
**So that** I understand how roster moves affected team dynamics

**Acceptance Criteria:**
- Screen title: "Chemistry Rebalancing"
- League-wide summary at top:
  - Teams with improved chemistry: X
  - Teams with declined chemistry: Y
  - Teams unchanged: Z
- Team-by-team list showing:
  - Team name and logo
  - Previous chemistry score
  - New chemistry score
  - Net delta (+X or -X)
  - Chemistry rating label (Excellent/Good/Average/Poor/Toxic)
- Expandable detail per team showing individual changes
- [Continue to Advance] button at bottom

**Chemistry Rating Labels:**
| Score | Label | Color |
|-------|-------|-------|
| 80-100 | Excellent | Green |
| 60-79 | Good | Light Green |
| 40-59 | Average | Yellow |
| 20-39 | Poor | Orange |
| 0-19 | Toxic | Red |

**Display Example:**
```
CHEMISTRY REBALANCING
─────────────────────────────────────────────────
League Summary: 5 improved • 2 declined • 1 unchanged

┌─────────────────────────────────────────────────┐
│ [Logo] NEW YORK THUNDER                         │
│        Chemistry: 64 → 72 (+8)    Good 📈       │
│        ▼ View Changes                           │
│        ┌───────────────────────────────────────┐│
│        │ 📈 +8: Barry Bonds departed           ││
│        │ 📈 +5: Derek Jeter became Vet Leader  ││
│        │ 📉 -3: Lost bond (Clemens retired)    ││
│        │ 📉 -2: New player (Marcus Williams)   ││
│        └───────────────────────────────────────┘│
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ [Logo] BOSTON LEGENDS                           │
│        Chemistry: 55 → 48 (-7)    Average 📉    │
│        ▼ View Changes                           │
└─────────────────────────────────────────────────┘

                              [Continue to Advance →]
```

---

### Section 8: Advance Confirmation

#### S-FA017: Pre-Advance Checklist
**As a** user ready to advance
**I want** a final checklist before committing
**So that** I don't miss any important steps

**Acceptance Criteria:**
- Checklist displays:
  - ✓ All rosters validated (22 + 10)
  - ✓ Transaction report generated
  - ✓ AI teams processed
  - ⚠️ Reminder: "Apply these changes in SMB4 and advance the season there"
- All items must be checked/complete
- Cannot advance with incomplete items

---

#### S-FA018: Advance to New Season
**As a** user completing all finalization steps
**I want to** advance to the new season
**So that** I can begin tracking the next season's games

**Acceptance Criteria:**
- [Begin Season X] button enabled when all validations pass
- Confirmation modal: "Ready to begin Season X?"
- On confirm:
  - Season transition processing runs
  - Previous season archived
  - Season counter incremented
  - Navigate to Regular Season tab
  - Schedule tab shows empty state: "No games scheduled"
  - Today's Game tab shows: "Add games to your schedule to begin"
- No automatic schedule generation (user adds games manually)

---

#### S-FA019: Post-Advance State
**As a** user who just advanced to a new season
**I want** clear guidance on next steps
**So that** I know how to begin the new season

**Acceptance Criteria:**
- Welcome message: "Welcome to Season X!"
- Instructions displayed:
  1. "Apply roster changes to SMB4 using the Transaction Report"
  2. "Advance to the new season in SMB4"
  3. "Add games to your schedule as you play them"
- Quick action buttons:
  - [View Transaction Report]
  - [Go to Schedule]
  - [Add First Game]

---

### Section 9: Schedule Integration (Post-Advance)

#### S-FA020: Empty Schedule State
**As a** user starting a new season
**I want** the Schedule tab to prompt me to add games
**So that** I can build the schedule as I play

**Acceptance Criteria:**
- Schedule tab shows: "No games scheduled for Season X"
- Prominent [+ Add Game] button
- Helper text: "Add games to your schedule as you play them in SMB4"
- Filter dropdown defaults to user's team
- Once games are added, Today's Game tab auto-pulls the next one

---

#### S-FA021: Add Game to Schedule
**As a** user building the season schedule
**I want to** add individual games or series
**So that** I can track all league games

**Acceptance Criteria:**
- [+ Add Game] opens modal:
  - Game Number (auto-incremented, editable)
  - Date/Day (auto-incremented, editable)
  - Away Team (dropdown)
  - Home Team (dropdown)
  - Time (optional, for display)
- [+ Add Series] option:
  - Away Team, Home Team
  - Number of games (1-7)
  - Starting Date/Day
  - Auto-creates sequential games
- Validation: Away ≠ Home team
- Games appear in Schedule tab immediately

---

#### S-FA022: Today's Game Auto-Pull
**As a** user with games in the schedule
**I want** Today's Game tab to automatically show the next unplayed game
**So that** I can quickly start tracking

**Acceptance Criteria:**
- Today's Game tab finds first game with status = SCHEDULED
- Displays matchup, records, game number
- If no scheduled games: "No games in queue - add games to schedule"
- After completing a game: Auto-advances to next scheduled game
- If queue becomes empty: Prompts to add more games

---

## Data Models

### RosterTransaction
```typescript
interface RosterTransaction {
  id: string;
  timestamp: Date;
  teamId: string;
  type: 'CALL_UP' | 'SEND_DOWN' | 'RELEASE' | 'RETIRE' | 'SWAP';
  playerId: string;
  playerName: string;
  position: Position;
  fromRoster: 'MLB' | 'FARM' | null;
  toRoster: 'MLB' | 'FARM' | 'INACTIVE' | null;
  isRookie: boolean;
  newSalary?: number;
  moralePenalty?: number;
  retirementRisk?: number;
  triggeredBy: 'USER' | 'AI';
  notes?: string;
}
```

### SeasonTransition
```typescript
interface SeasonTransition {
  fromSeason: number;
  toSeason: number;
  timestamp: Date;
  playersAged: number;
  salariesRecalculated: number;
  rookiesDesignated: string[];  // Player IDs
  statsArchived: boolean;
  transactionReport: RosterTransaction[];
}
```

### ScheduledGame
```typescript
interface ScheduledGame {
  id: string;
  seasonNumber: number;
  gameNumber: number;           // 1 to seasonLength
  dayNumber: number;            // For display (Day 1, Day 2, etc.)
  date?: string;                // Optional display date (July 12)
  time?: string;                // Optional time (7:00 PM)
  awayTeamId: string;
  homeTeamId: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  result?: {
    awayScore: number;
    homeScore: number;
    winningTeamId: string;
  };
  gameLogId?: string;           // Links to full game data
}
```

---

## Business Rules Summary

1. **Roster Requirements**: Every team must have exactly 22 MLB + 10 Farm = 32 players
2. **Call-Up Salary**: Based on grade (B=$1.2M, B-=$0.9M, C+=$0.7M, C=$0.6M, C-=$0.5M)
3. **Rookie Designation**: Applied if player was just drafted OR never previously called up
4. **Send-Down Morale**: -15 to -25 based on player tenure and status
5. **Retirement Risk**: Calculated formula based on age, service, salary, awards, prior demotions
6. **AI Priority**: Call up by Ceiling → Grade → Age; Send down by Grade → Age → Salary
7. **Schedule**: Starts empty; user adds games manually; Today's Game auto-pulls from queue
8. **Season Transition**: Ages +1, salaries recalculated, stats reset, season archived

---

## Screen Flow

```
FINALIZE & ADVANCE PHASE
│
├── Screen 1: Team Roster Management
│   ├── Team Selector Dropdown
│   ├── MLB Roster Panel (22 players)
│   ├── Farm Roster Panel (10 players)
│   └── Transaction Actions (Call Up, Send Down, Swap)
│
├── Screen 2: AI Processing & Review
│   ├── Process AI Teams Button
│   └── AI Transaction Summary
│
├── Screen 3: Validation Summary
│   ├── All Teams Checklist
│   └── Error Resolution Links
│
├── Screen 4: Transaction Report
│   ├── Full Transaction List
│   └── Export/Print Options
│
├── Screen 5: Season Transition
│   ├── Processing Indicators
│   └── Transition Summary
│
└── Screen 6: Advance Confirmation
    ├── Pre-Advance Checklist
    ├── Reminder: Apply to SMB4
    └── [Begin Season X] Button

         ↓

REGULAR SEASON (New Season)
├── Schedule Tab (Empty → Add Games)
└── Today's Game Tab (Auto-pulls from schedule)
```

---

*End of User Stories - Finalize & Advance Phase*
