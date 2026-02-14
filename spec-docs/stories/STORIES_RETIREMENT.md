# User Stories: Retirement System

> **Feature Area**: Offseason Phase 5 - Retirements
> **Epic**: End-of-Season Player Lifecycle
> **Created**: January 29, 2026
> **Source Spec**: OFFSEASON_SYSTEM_SPEC.md §7, KBL_XHD_TRACKER_MASTER_SPEC_v3.md

---

## Overview

The Retirement phase processes player retirements team-by-team, with the goal of **1-2 players per team retiring each season**. Retirement probability is based on reverse age order (oldest players most likely), and each retirement triggers an optional jersey retirement decision.

---

## Story: S-RET001 - Calculate Retirement Probabilities

**As a** system
**I want to** calculate retirement probabilities for all players on a team
**So that** the retirement dice roll system works correctly

### Acceptance Criteria
- [ ] Players sorted by age descending (oldest first)
- [ ] Oldest player gets highest probability (~40-50%)
- [ ] Youngest player gets lowest probability (~1-5%)
- [ ] Probability decreases linearly as you go down age list
- [ ] Formula: `baseProbability = Math.max(5, 50 - (ageRank * (45 / rosterSize)))`
- [ ] Each player shows name, age, position, grade, and retirement %

### Data Structure
```typescript
interface RetirementCandidate {
  playerId: string;
  playerName: string;
  age: number;
  position: string;
  grade: string;
  retirementProbability: number;  // 0-100%
}

function calculateRetirementProbabilities(roster: Player[]): RetirementCandidate[] {
  const sorted = [...roster].sort((a, b) => b.age - a.age);

  return sorted.map((player, index) => {
    const ageRank = index;
    const rosterSize = sorted.length;
    const baseProbability = Math.max(5, 50 - (ageRank * (45 / rosterSize)));

    return {
      playerId: player.id,
      playerName: player.name,
      age: player.age,
      position: player.position,
      grade: player.grade,
      retirementProbability: baseProbability
    };
  });
}
```

### Dependencies
- Player roster with age data
- Player position and grade data

---

## Story: S-RET002 - Retirement Probability Table Display

**As a** user
**I want to** see all players on a team with their retirement probabilities
**So that** I can understand who is at risk of retiring

### Acceptance Criteria
- [ ] Table shows all players sorted by retirement probability (highest first)
- [ ] Columns: Player Name, Age, Position, Grade, Retirement %
- [ ] Probability displayed as percentage with visual bar indicator
- [ ] Higher percentages have warmer colors (red/orange)
- [ ] Lower percentages have cooler colors (green/blue)
- [ ] Team header shows team name and logo
- [ ] Counter shows "Retirements this team: X/2"

### UI Specification
- Player rows should be scrollable if roster is large
- Current retirement count visible at all times
- Clear visual hierarchy emphasizing high-risk players

---

## Story: S-RET003 - Retirement Dice Roll System

**As a** user
**I want to** roll dice to reveal if someone retires
**So that** I can experience the drama of the retirement lottery

### Acceptance Criteria
- [ ] "Reveal Retirement" button triggers dice roll
- [ ] System generates random number 0-100 for each player
- [ ] If random < player's probability, that player retires
- [ ] First player (from top) to hit their threshold retires
- [ ] If no one hits their threshold, display "No Retirement"
- [ ] Button disabled during roll animation
- [ ] Maximum 2 retirements per team per season

### Roll Logic
```typescript
function rollForRetirement(candidates: RetirementCandidate[]): RetirementResult {
  // Roll for each player starting from highest probability
  for (const candidate of candidates) {
    const roll = Math.random() * 100;
    if (roll < candidate.retirementProbability) {
      return {
        retired: true,
        player: candidate,
        roll: roll
      };
    }
  }

  return {
    retired: false,
    player: null,
    roll: null
  };
}
```

### UX Flow
1. User taps "Reveal Retirement"
2. Brief animation/suspense (1-2 seconds)
3. Result revealed with animation
4. If retirement: celebration/ceremony screen
5. If no retirement: confirmation with option to retry or skip

---

## Story: S-RET004 - Retirement Announcement Display

**As a** user
**I want to** see a dramatic announcement when a player retires
**So that** the moment feels significant and memorable

### Acceptance Criteria
- [ ] Player photo displayed prominently (120×120px)
- [ ] Player name in large, bold text
- [ ] Age, position, and grade displayed
- [ ] Retirement flavor text based on player age/stats
- [ ] Career summary: seasons played, key stats
- [ ] Animation: card slides up or fades in dramatically
- [ ] Top hat or retirement icon (🎩) displayed

### Flavor Text Examples
- Age 40+: "Going out on top after {seasons} seasons"
- Age 35-39: "Hanging up the cleats while still in his prime"
- Age 30-34: "A career cut short, but what a career it was"
- DROOPY personality (FA): "I don't want to start over somewhere new"
- Injury-related: "The body said it was time"

### Data Required
```typescript
interface RetirementAnnouncement {
  player: Player;
  careerSeasons: number;
  careerWAR: number;
  careerHighlights: string[];  // "3× All-Star", "1× MVP"
  flavorText: string;
  teamsPlayedFor: TeamSummary[];
}
```

---

## Story: S-RET005 - Probability Recalculation After Retirement

**As a** system
**I want to** recalculate retirement probabilities after each retirement
**So that** remaining players have updated chances

### Acceptance Criteria
- [ ] After a retirement, remove retired player from candidate list
- [ ] Recalculate all probabilities with smaller roster size
- [ ] Update UI to show new probabilities
- [ ] Probabilities will increase for remaining players
- [ ] Animation showing probability changes (optional)

### Example
Before: 12 players, oldest at 47%
After 1 retirement: 11 players, new oldest at ~50%

---

## Story: S-RET006 - Second Retirement Roll Option

**As a** user
**I want to** optionally roll for a second retirement
**So that** I can complete the target of 1-2 retirements per team

### Acceptance Criteria
- [ ] After first retirement, show two options:
  - "Reveal Second Retirement" button
  - "Skip to Jersey Retirement" button
- [ ] Second roll uses recalculated probabilities
- [ ] If second retirement occurs, proceed to both jersey retirement decisions
- [ ] Cannot exceed 2 retirements per team
- [ ] If no one retired on first roll, can "Try Again" or "Skip to Next Team"

### UI States
1. First roll pending: "Reveal Retirement" button
2. First retirement complete: "Reveal Second Retirement" + "Skip" buttons
3. Second retirement complete: Proceed to jersey retirement
4. No retirement (first roll): "Try Again" + "Skip to Next Team" buttons

---

## Story: S-RET007 - Jersey Retirement Decision UI

**As a** user
**I want to** decide whether to retire a player's jersey number
**So that** I can honor franchise legends

### Acceptance Criteria
- [ ] Prompt appears immediately after retirement announcement
- [ ] Shows all teams the player played for
- [ ] For each team, show:
  - Team name and logo
  - Jersey number with that team
  - Seasons with team
  - WAR accumulated with team
  - Awards won with team
- [ ] Checkbox for each team to retire the jersey
- [ ] Multiple teams can retire same player's number
- [ ] "Retire Selected" and "Skip" buttons
- [ ] No eligibility criteria - purely user discretion

### Data Structure
```typescript
interface JerseyRetirementOption {
  teamId: string;
  teamName: string;
  teamLogo: string;
  jerseyNumber: number;
  seasonsWithTeam: number;
  warWithTeam: number;
  awardsWithTeam: string[];
}

interface JerseyRetirementDecision {
  playerId: string;
  playerName: string;
  teams: JerseyRetirementOption[];
  selectedTeamIds: string[];  // Teams that will retire the jersey
}
```

---

## Story: S-RET008 - Jersey Retirement Ceremony Animation

**As a** user
**I want to** see a ceremony when a jersey is retired
**So that** the moment feels special and celebratory

### Acceptance Criteria
- [ ] Jersey displayed with team colors
- [ ] Player name above the number
- [ ] Retirement year shown below jersey
- [ ] Animation: jersey raised to "rafters" or spotlit
- [ ] Optional confetti/celebration effect
- [ ] Proceeds to next jersey retirement or next team

### Visual Elements
```
┌─────────────┐
│   CLEMENS   │  ← Player name
│             │
│     21      │  ← Jersey number
│             │
└─────────────┘
    2026       ← Retirement year
```

---

## Story: S-RET009 - Retired Numbers Data Persistence

**As a** system
**I want to** persist retired jersey numbers
**So that** they cannot be reassigned and display in the museum

### Acceptance Criteria
- [ ] Store retired number in franchise data
- [ ] Retired numbers cannot be assigned to new players
- [ ] Data includes: player name, number, team, year retired
- [ ] Multiple teams can have same player's number retired
- [ ] Data accessible for Museum → Retired Numbers Wall

### Data Model
```typescript
interface RetiredJersey {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  teamId: string;
  teamName: string;
  retirementYear: number;  // Season number
  seasonsWithTeam: number;
  warWithTeam: number;
}

// In franchise state
interface FranchiseState {
  retiredNumbers: Record<string, RetiredJersey[]>;  // teamId → jerseys
}
```

---

## Story: S-RET010 - Empty Roster Slot Tracking

**As a** system
**I want to** track empty roster slots after retirements
**So that** the draft phase knows how many players each team needs

### Acceptance Criteria
- [ ] Each retirement creates an empty roster slot
- [ ] Slot visually shows: "[EMPTY - {Player Name} retired]"
- [ ] Track total empty slots per team
- [ ] Pass empty slot count to Draft phase
- [ ] Empty slots filled during draft

### Example
```
ROSTER SLOT 5: [EMPTY - Roger Clemens retired]
ROSTER SLOT 8: [EMPTY - Tony Gwynn retired]
```

---

## Story: S-RET011 - Team-by-Team Retirement Navigation

**As a** user
**I want to** process retirements for each team sequentially
**So that** I can experience each team's retirement drama

### Acceptance Criteria
- [ ] Start with first team (alphabetical or standings order)
- [ ] Complete retirement process for current team before moving to next
- [ ] "Continue to Next Team" button after jersey decisions
- [ ] Progress indicator: "Team 3 of 8" or progress bar
- [ ] Cannot skip teams (all must be processed)
- [ ] After all teams: proceed to summary screen

### Navigation Flow
```
Team 1 → Retirement Rolls → Jersey Decisions →
Team 2 → Retirement Rolls → Jersey Decisions →
...
Team N → Retirement Rolls → Jersey Decisions →
Summary Screen
```

---

## Story: S-RET012 - Retirement Phase Summary Screen

**As a** user
**I want to** see a summary of all retirements across all teams
**So that** I can review what happened before moving to the next phase

### Acceptance Criteria
- [ ] Total retirements count
- [ ] Total jerseys retired count
- [ ] List all retired players with team and position
- [ ] List all jersey retirements with team and number
- [ ] Grouped by team or in single list
- [ ] "Continue to Hall of Fame" or "Continue to Free Agency" button
- [ ] Optional: Export summary or share

### Summary Data
```typescript
interface RetirementPhaseSummary {
  totalRetirements: number;
  totalJerseysRetired: number;
  retirements: {
    player: Player;
    team: string;
    jerseyRetired: boolean;
    jerseyTeams: string[];  // If multiple teams retired the jersey
  }[];
}
```

---

## Implementation Priority

| Story | Priority | Complexity | Dependencies |
|-------|----------|------------|--------------|
| S-RET001 | P0 | Medium | Player data |
| S-RET002 | P0 | Medium | S-RET001 |
| S-RET003 | P0 | Medium | S-RET001, S-RET002 |
| S-RET004 | P0 | Medium | S-RET003 |
| S-RET005 | P1 | Low | S-RET001, S-RET003 |
| S-RET006 | P1 | Low | S-RET003, S-RET005 |
| S-RET007 | P0 | Medium | S-RET004 |
| S-RET008 | P2 | Low | S-RET007 |
| S-RET009 | P0 | Medium | S-RET007 |
| S-RET010 | P1 | Low | S-RET003 |
| S-RET011 | P1 | Medium | All above |
| S-RET012 | P2 | Low | S-RET011 |

---

## Technical Notes

### Retirement vs FA Retirement (DROOPY)
There are TWO retirement mechanisms:
1. **Phase 5 Retirement** (this feature): Age-based probability, 1-2 per team
2. **Free Agency Retirement**: DROOPY personality players retire instead of changing teams

These are separate systems but both result in the same outcome (player retired, empty roster slot).

### Hall of Fame Integration
Hall of Fame is **NOT decided at retirement**. Instead:
- HOF is a separate museum tab accessible anytime
- Users manually add retired players to HOF
- See HOF_MUSEUM_SPEC for details

### Existing Components
Based on CURRENT_STATE.md, these components exist (shell/partial):
- `RetirementsScreen.tsx` - Main retirement ceremony screen
- `RetiredNumbersWall.tsx` - Museum display for retired numbers
- `AgingBadge.tsx` - Career phase and retirement probability display

---

*End of Stories Document*
