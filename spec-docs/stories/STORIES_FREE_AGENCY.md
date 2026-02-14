# Free Agency Implementation Stories

> **Purpose**: Close all gaps between OFFSEASON_SYSTEM_SPEC.md §8 (Free Agency) and current implementation.
> **Created**: January 28, 2026
> **Source Gaps**: GAP-002, COHESION_REPORT.md, AUDIT_REPORT.md

---

## Story Dependency Graph

```
S-FA001 (Sign FA) ─────────────────────────────────────────┐
                                                           │
S-FA002 (Wire Protection) ──┐                              │
                            ├─► S-FA004 (Dice Roll UI) ───►│
S-FA003 (Dice Assignment) ──┘                              │
                                                           ├─► S-FA008 (Two Rounds)
S-FA005 (Personality Dest) ─┬─► S-FA007 (Exchange) ───────►│
                            │                              │
S-FA006 (H2H Tracking) ─────┘                              │
                                                           │
                                              S-FA009 (Summary UI) ◄─┘
```

---

## S-FA001: Sign Free Agent Action

**Parent Feature:** F-E007 (FreeAgencyHub)
**Priority:** P0 - CRITICAL BLOCKER
**Estimated Size:** Medium
**Closes Gap:** GAP-002

### User Story

**As a** league manager during free agency
**I want to** sign a free agent to my team
**So that** I can add players to my roster

### Acceptance Criteria

**AC-1: Sign Button on FA Card**
- **Given:** FreeAgencyHub displays free agent pool
- **When:** User views any FA card
- **Then:** "Sign to [Team]" button visible with team selector dropdown
- **Verify:** Button present on every FA card

**AC-2: Contract Calculation**
- **Given:** User clicks "Sign" on a free agent
- **When:** Contract modal opens
- **Then:** Display:
  - Calculated salary (per SALARY_SYSTEM_SPEC.md formula)
  - Personality modifier applied (isNewTeam = true)
  - Contract years (default: 1)
- **Verify:** Salary matches `calculateSalary(player, null, null, true)`

**AC-3: Cap Space Validation**
- **Given:** Contract modal is open
- **When:** Team would exceed soft cap ($150M)
- **Then:** Warning displayed: "This signing exceeds soft cap. Fan morale may be affected."
- **Verify:** Warning appears when total payroll + new salary > $150M

**AC-4: Signing Transaction**
- **Given:** User confirms signing
- **When:** Transaction processes
- **Then:**
  1. Player removed from FA pool
  2. Player added to team roster
  3. Player's `teamId` updated
  4. Player's salary set (with personality modifier)
  5. Team payroll recalculated
  6. Transaction logged to `transactionStorage`
- **Verify:** All state updates persist to storage

**AC-5: Roster Limit Check**
- **Given:** Team already has 25 players (full roster)
- **When:** User attempts to sign FA
- **Then:** Prompt: "Roster full. Select a player to release."
- **Verify:** Cannot complete signing without releasing a player

### Technical Notes

```typescript
interface FASigningTransaction {
  type: 'FA_SIGNING';
  playerId: string;
  fromPool: 'FREE_AGENT';
  toTeamId: string;
  salary: number;
  personalityModifier: number;
  timestamp: Date;
  seasonId: string;
}

// Wire to existing transactionStorage.ts (currently orphaned per GAP-041)
```

### Definition of Done
- [ ] Sign button on all FA cards
- [ ] Contract modal with salary calculation
- [ ] Cap space warning
- [ ] Roster limit check
- [ ] Transaction logged
- [ ] FA removed from pool
- [ ] Player appears on team roster
- [ ] Unit tests for signing flow

---

## S-FA002: Wire ProtectedPlayerSelection to FA Flow

**Parent Feature:** F-E008
**Priority:** P0
**Estimated Size:** Small
**Closes Gap:** S-E008 listed as "NOT WIRED (orphaned)"

### User Story

**As a** team manager entering free agency
**I want to** protect one player from leaving via free agency
**So that** my best player cannot be selected by the dice roll

### Acceptance Criteria

**AC-1: Protection Phase Entry**
- **Given:** User completes Retirements phase
- **When:** Free Agency phase begins
- **Then:** ProtectedPlayerSelection modal appears for each team (in sequence or parallel based on league settings)
- **Verify:** Cannot proceed to dice roll without protection selection

**AC-2: Single Selection Enforcement**
- **Given:** ProtectedPlayerSelection modal is open
- **When:** User selects a player
- **Then:** Only ONE player can be selected (radio button, not checkbox)
- **Verify:** Selecting new player deselects previous

**AC-3: Protection Confirmation**
- **Given:** User has selected a player to protect
- **When:** User clicks "Confirm Protection"
- **Then:**
  1. Protected player flagged: `player.isProtectedFA = true`
  2. Player excluded from dice assignment pool
  3. Proceed to next team's protection (or dice roll if all teams done)
- **Verify:** Protected player never appears in dice roll list

**AC-4: UI Display**
- **Given:** ProtectedPlayerSelection renders
- **When:** Viewing roster
- **Then:** Display:
  - Player name, position, grade
  - Recommendation: highlight highest-grade players
  - Dice probability preview (optional)
- **Verify:** Matches wireframe in OFFSEASON_SYSTEM_SPEC.md §8.2

### Technical Notes

```typescript
// Add to offseason flow state
interface FAProtectionState {
  teamId: string;
  protectedPlayerId: string | null;
  confirmedAt: Date | null;
}

// ProtectedPlayerSelection.tsx already exists - just needs wiring
// Wire to OffseasonFlow.tsx phase progression
```

### Definition of Done
- [ ] Modal appears after Retirements phase
- [ ] Single selection enforced
- [ ] Protection persists to state
- [ ] Protected player excluded from dice pool
- [ ] All teams must protect before dice roll

---

## S-FA003: FA Dice Assignment System

**Parent Feature:** F-E007
**Priority:** P0
**Estimated Size:** Medium

### User Story

**As the** free agency system
**I want to** assign dice values (2-12) to eligible players
**So that** better players are more likely to leave (adding drama)

### Acceptance Criteria

**AC-1: Eligible Player Filtering**
- **Given:** A team's roster for free agency
- **When:** Calculating dice assignments
- **Then:**
  1. Exclude protected player
  2. Sort remaining by grade (best first)
  3. Take top 11 players only
- **Verify:** Protected player never in list; exactly 11 players (or fewer if roster < 12)

**AC-2: Dice Value Assignment**
- **Given:** Top 11 eligible players sorted by grade
- **When:** Assigning dice values
- **Then:** Assign in this order: `[7, 6, 8, 5, 9, 4, 10, 3, 11, 2, 12]`
  - Best player → 7 (16.67% chance, most likely to leave)
  - 2nd best → 6 (13.89%)
  - 3rd best → 8 (13.89%)
  - ... continuing pattern
  - 10th best → 2 (2.78%, safest)
  - 11th best → 12 (2.78%, safest)
- **Verify:** Dice order matches OFFSEASON_SYSTEM_SPEC.md §8.3

**AC-3: Probability Calculation**
- **Given:** Dice assignments complete
- **When:** Displaying to user
- **Then:** Show probability for each dice value:
  | Dice | Probability |
  |------|-------------|
  | 2, 12 | 2.78% |
  | 3, 11 | 5.56% |
  | 4, 10 | 8.33% |
  | 5, 9 | 11.11% |
  | 6, 8 | 13.89% |
  | 7 | 16.67% |
- **Verify:** Probabilities match two-dice distribution

**AC-4: Tiebreaker for Equal Grades**
- **Given:** Two players have identical grades
- **When:** Sorting for dice assignment
- **Then:** Tiebreaker order:
  1. Higher WAR (current season)
  2. Higher salary
  3. Alphabetical by last name
- **Verify:** Deterministic ordering for identical grades

**AC-5: Manual Reorder Before Roll (User Control)**
- **Given:** Initial dice assignments displayed (auto-sorted by grade)
- **When:** User views the dice assignment table BEFORE rolling
- **Then:**
  1. User can drag-and-drop to reorder players
  2. Dice values stay fixed (7, 6, 8, 5, 9, 4, 10, 3, 11, 2, 12)
  3. Moving a player UP puts them at higher-risk dice values
  4. Moving a player DOWN puts them at lower-risk dice values
  5. "Reset to Default" button restores grade-based auto-sort
- **Example:** User wants to protect their A+ pitcher but is willing to risk their A- shortstop → drag shortstop to position 1 (dice value 7)
- **Verify:** User has full control over which players are at risk before committing to roll

### Technical Notes

```typescript
const DICE_ORDER = [7, 6, 8, 5, 9, 4, 10, 3, 11, 2, 12];
const DICE_PROBABILITIES: Record<number, number> = {
  2: 0.0278, 3: 0.0556, 4: 0.0833, 5: 0.1111, 6: 0.1389,
  7: 0.1667,
  8: 0.1389, 9: 0.1111, 10: 0.0833, 11: 0.0556, 12: 0.0278
};

interface FADiceAssignment {
  diceValue: number;
  playerId: string;
  playerName: string;
  position: string;
  grade: string;
  probability: number;
}

function assignDiceValues(
  roster: Player[],
  protectedPlayerId: string
): FADiceAssignment[];

// User can reorder the assignments before rolling
function reorderDiceAssignments(
  assignments: FADiceAssignment[],
  newOrder: string[]  // Array of playerIds in desired order
): FADiceAssignment[] {
  // Dice values stay fixed, players get reassigned
  return newOrder.map((playerId, index) => {
    const player = assignments.find(a => a.playerId === playerId)!;
    return {
      ...player,
      diceValue: DICE_ORDER[index],
      probability: DICE_PROBABILITIES[DICE_ORDER[index]]
    };
  });
}
```

### Definition of Done
- [ ] Filtering excludes protected player
- [ ] Sorting by grade with tiebreakers (default order)
- [ ] Dice values assigned correctly (7 = first position)
- [ ] Probabilities displayed
- [ ] **Drag-and-drop reorder implemented**
- [ ] **"Reset to Default" restores grade-based order**
- [ ] Unit tests for edge cases (< 11 players, ties, reorder)

---

## S-FA004: FA Dice Roll UI

**Parent Feature:** F-E007
**Priority:** P0
**Estimated Size:** Medium

### User Story

**As a** team manager in free agency
**I want to** roll dice to determine which player leaves
**So that** there's tension and uncertainty in free agency

### Acceptance Criteria

**AC-1: Dice Roll Display**
- **Given:** Protection phase complete for a team
- **When:** Dice roll UI renders
- **Then:** Display:
  - Two dice images (or single 2-12 control)
  - "ROLL DICE" button
  - Table of all 11 players with assigned dice values (sorted by risk)
  - Probability column showing % chance for each dice value
  - Drag handles (☰) on each row for reordering
  - "Reset to Default" button to restore grade-based order
  - Protected player shown (grayed out, marked "PROTECTED")
- **Verify:** Matches wireframe in FREE_AGENCY_FIGMA_SPEC.md Screen 2

**AC-2: Manual Reorder Before Roll**
- **Given:** Dice assignment table displayed
- **When:** User drags a player row to a new position
- **Then:**
  1. Player moves to new position in list
  2. Dice values stay fixed to positions (position 1 = dice 7, etc.)
  3. All players' dice values and probabilities update accordingly
  4. Visual feedback during drag (row lifts, drop zone highlighted)
- **Example:** Drag "Barry Bonds" from position 1 (7, 16.7%) to position 10 (2, 2.8%) to protect him
- **Verify:** Reorder reflected immediately, "ROLL DICE" uses new order

**AC-3: Dice Animation**
- **Given:** User clicks "ROLL DICE"
- **When:** Roll animation plays
- **Then:**
  1. Dice tumble animation (1-2 seconds)
  2. Final values shown on dice faces
  3. Sum calculated and displayed prominently
  4. Matched player row highlighted
- **Verify:** Animation adds drama without being too long

**AC-4: Result Display**
- **Given:** Dice roll complete
- **When:** Result shown
- **Then:** Display:
  - "You rolled: [X]"
  - Departing player card (name, position, grade, personality)
  - Personality-based destination preview
  - "Continue" button to proceed to destination resolution
- **Verify:** Correct player selected based on dice sum

**AC-5: Edge Case - No Match**
- **Given:** Team has fewer than 11 non-protected players
- **When:** Dice roll lands on unassigned value
- **Then:**
  - Display: "No player assigned to [X]. No one leaves this round."
  - Proceed to next team
- **Verify:** Graceful handling of small rosters

### Technical Notes

```typescript
interface DiceRollResult {
  die1: number;  // 1-6
  die2: number;  // 1-6
  sum: number;   // 2-12
  matchedPlayer: FADiceAssignment | null;
}

function rollDice(): DiceRollResult {
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  return { die1, die2, sum: die1 + die2, matchedPlayer: null };
}
```

### Definition of Done
- [ ] Dice UI matches wireframe
- [ ] Roll animation works
- [ ] Correct player identified from roll
- [ ] Result card shows player + personality
- [ ] Edge case for unassigned dice value handled
- [ ] Proceed to destination resolution

---

## S-FA005: Personality-Based FA Destination Routing

**Parent Feature:** F-E007
**Priority:** P0
**Estimated Size:** Large

### User Story

**As the** free agency system
**I want to** route departing players based on their SMB4 personality
**So that** player movement feels thematic and personality-driven

### Acceptance Criteria

**AC-1: COMPETITIVE Routing**
- **Given:** Departing player has COMPETITIVE personality
- **When:** Resolving destination
- **Then:** Route to team's **rival** (closest to .500 H2H all-time)
- **Verify:** Uses `findRival()` function (see S-FA006)

**AC-2: RELAXED Routing**
- **Given:** Departing player has RELAXED personality
- **When:** Resolving destination
- **Then:**
  1. Roll dice for random team (1-N where N = team count)
  2. If rolls current team, player STAYS
  3. Otherwise, route to rolled team
- **Verify:** Equal probability for all teams including staying

**AC-3: DROOPY Routing**
- **Given:** Departing player has DROOPY personality
- **When:** Resolving destination
- **Then:**
  1. Player RETIRES
  2. Add to retirement flow (HOF check if eligible)
  3. Remove from all rosters and FA pool
- **Verify:** Player gone from league entirely

**AC-4: JOLLY Routing**
- **Given:** Departing player has JOLLY personality
- **When:** Resolving destination
- **Then:** Player STAYS with current team (no move)
- **Verify:** No roster change, no exchange triggered

**AC-5: TOUGH Routing**
- **Given:** Departing player has TOUGH personality
- **When:** Resolving destination
- **Then:** Route to team with **highest team OPS** from just-completed season
- **Verify:** Uses season stats to find highest OPS team

**AC-6: TIMID Routing**
- **Given:** Departing player has TIMID personality
- **When:** Resolving destination
- **Then:** Route to **championship winner** from just-completed season
- **Verify:** Goes to World Series winner

**AC-7: EGOTISTICAL Routing**
- **Given:** Departing player has EGOTISTICAL personality
- **When:** Resolving destination
- **Then:** Route to **worst team** (lowest total team WAR)
- **Verify:** Wants to be the star on a bad team

**AC-8: Destination UI**
- **Given:** Destination resolved
- **When:** Displaying result
- **Then:** Show:
  - Player card
  - Personality badge
  - Destination team (or "RETIRES" / "STAYS")
  - Flavor text explaining why (e.g., "COMPETITIVE: Joins rival team Boston!")
- **Verify:** Matches wireframe in OFFSEASON_SYSTEM_SPEC.md §8.5

### Technical Notes

```typescript
type FADestinationType =
  | 'RIVAL'
  | 'RANDOM'
  | 'RETIRES'
  | 'STAYS'
  | 'HIGHEST_OPS'
  | 'CHAMPION'
  | 'WORST_TEAM';

interface FADestinationResult {
  destination: Team | null;
  type: FADestinationType;
  flavorText: string;
}

function resolveFADestination(
  player: Player,
  currentTeam: Team,
  allTeams: Team[],
  seasonStats: SeasonStats
): FADestinationResult;
```

### Definition of Done
- [ ] All 7 personality types route correctly
- [ ] RELAXED can result in staying
- [ ] DROOPY triggers retirement
- [ ] Destination UI with flavor text
- [ ] Unit tests for each personality

---

## S-FA006: Head-to-Head Record Tracking

**Parent Feature:** F-E007 (required for COMPETITIVE routing)
**Priority:** P1
**Estimated Size:** Medium

### User Story

**As the** league system
**I want to** track head-to-head records between all teams
**So that** I can calculate rivals for COMPETITIVE free agents

### Acceptance Criteria

**AC-1: H2H Record Storage**
- **Given:** A game completes between Team A and Team B
- **When:** Game result is saved
- **Then:** Update H2H record:
  - `h2hRecords[teamA][teamB].wins++` or `.losses++`
  - `h2hRecords[teamB][teamA]` updated inversely
- **Verify:** H2H updates on every game completion

**AC-2: All-Time Aggregation**
- **Given:** H2H records exist across multiple seasons
- **When:** Querying all-time H2H
- **Then:** Sum all seasons: `{ wins: total, losses: total, winPct: wins/(wins+losses) }`
- **Verify:** Spans all historical seasons

**AC-3: Rival Calculation**
- **Given:** Team needs to find rival
- **When:** `findRival(team)` called
- **Then:**
  1. Get H2H vs all other teams
  2. Calculate `|winPct - 0.500|` for each
  3. Return team with smallest delta
- **Verify:** Closest to .500 wins

**AC-4: Tiebreaker for Rival**
- **Given:** Two teams have identical H2H distance from .500
- **When:** Finding rival
- **Then:** Tiebreaker:
  1. More total games played
  2. Geographic proximity (if implemented)
  3. Alphabetical
- **Verify:** Deterministic rival selection

**AC-5: New League Handling**
- **Given:** League just started (no H2H history)
- **When:** COMPETITIVE player leaves in Season 1
- **Then:** Fallback to random team (same as RELAXED)
- **Verify:** Graceful handling of no history

### Technical Notes

```typescript
interface HeadToHeadRecord {
  teamAId: string;
  teamBId: string;
  wins: number;
  losses: number;
  winPct: number;
}

// Store in franchiseStorage or dedicated h2hStorage
interface H2HStorage {
  records: Record<string, Record<string, HeadToHeadRecord>>;
  getRecord(teamA: string, teamB: string): HeadToHeadRecord;
  updateFromGame(game: CompletedGame): void;
  findRival(teamId: string): string;
}
```

### Definition of Done
- [ ] H2H updates on game completion
- [ ] All-time aggregation works
- [ ] `findRival()` returns closest to .500
- [ ] Tiebreaker implemented
- [ ] Season 1 fallback works
- [ ] Unit tests for edge cases

---

## S-FA007: Player Exchange Rule

**Parent Feature:** F-E007
**Priority:** P0
**Estimated Size:** Medium
**Updated:** January 29, 2026 - Changed from grade-based to salary-based matching; removed position type requirement

### User Story

**As the** receiving team in a free agent move
**I want to** give back a player of comparable value
**So that** rosters stay balanced and the losing team gets fair compensation

### Core Rule: Salary-Based Matching (±10%)

**The receiving team must return a player within ±10% of the incoming player's TRUE VALUE (salary).**

| Scenario | Matching Rule |
|----------|---------------|
| Receiving team has **BETTER** record | Must return player within **+10%** of incoming salary (can't lowball) |
| Receiving team has **WORSE** record | Can return player within **-10%** of incoming salary (slight discount OK) |

**Fallback Rule**: If no player on the receiving team's roster meets the ±10% threshold, they **MUST give the player whose salary is CLOSEST to the incoming player's salary** (minimizing the absolute salary difference).

> **Note**: Position type matching is NOT required. Teams can exchange any player for any player (pitcher for position player, etc.) because rosters can be filled via draft picks and farm system call-ups.

### Acceptance Criteria

**AC-1: Salary Matching - Better Team Receives**
- **Given:** Receiving team has BETTER record than losing team
- **When:** Selecting return player
- **Then:** Must return player with salary ≥ 90% of incoming player's salary
- **Example:** Incoming player = $10M → Must return someone ≥ $9M
- **Verify:** Cannot lowball the worse team

**AC-2: Salary Matching - Worse Team Receives**
- **Given:** Receiving team has WORSE record than losing team
- **When:** Selecting return player
- **Then:** Can return player with salary ≥ 90% of incoming player's salary (same rule, but practically more flexibility since worse teams often have cheaper rosters)
- **Example:** Incoming player = $10M → Must return someone ≥ $9M
- **Verify:** ±10% rule still applies

**AC-3: No Position Restriction**
- **Given:** Any player leaves Team A for Team B
- **When:** Selecting return player
- **Then:** ANY player on receiving team's roster is eligible (regardless of position)
- **Example:** Incoming CF can be exchanged for SP, 1B, or any position
- **Verify:** Position filter is NOT applied
- **Rationale:** Teams can fill positional gaps via draft and farm system call-ups

**AC-4: Fallback - No Eligible Players**
- **Given:** No players on receiving team meet the ±10% salary threshold
- **When:** Exchange modal renders
- **Then:**
  1. Display warning: "No players meet salary threshold"
  2. Auto-select the player whose salary is **CLOSEST to the incoming player's salary**
  3. Show this player as "REQUIRED - Closest Available"
- **Example A:** Incoming $25M, roster has $12M, $10M, $9M → Give $12M (closest to $25M from below)
- **Example B:** Incoming $5M, roster has $15M, $18M, $20M → Give $15M (closest to $5M from above)
- **Verify:** Fallback always produces the valid return player with minimum salary gap

**AC-5: Return Player Selection UI**
- **Given:** Exchange required
- **When:** Receiving team's manager views exchange modal
- **Then:** Display:
  - Incoming player card with salary prominently shown
  - Salary threshold range (e.g., "$9M - $11M eligible")
  - List of ALL eligible return players (within threshold, any position)
  - Ineligible players shown grayed with salary delta (e.g., "Too low: $5M (-50%)")
  - If fallback triggered: "REQUIRED" badge on closest-salary player
- **Verify:** Only valid options selectable (or forced fallback)

**AC-6: Auto-Selection (Optional)**
- **Given:** Exchange modal has "Auto-Select" option
- **When:** User clicks "Auto-Select"
- **Then:** System picks the **closest salary match** within threshold (or fallback if none)
- **Verify:** Valid selection made automatically

**AC-7: Exchange Transaction**
- **Given:** Return player selected
- **When:** Exchange confirmed
- **Then:**
  1. Departing player added to receiving team
  2. Return player added to losing team
  3. Both players' `teamId` updated
  4. Both salaries recalculated (isNewTeam = true, personality modifier applies)
  5. Transaction logged with salary values
- **Verify:** Both roster changes persist

### Technical Notes

```typescript
const SALARY_MATCH_THRESHOLD = 0.10;  // ±10%

interface ExchangeEligibility {
  eligible: Player[];
  fallbackPlayer: Player | null;  // Closest salary if no one eligible
  fallbackRequired: boolean;
}

function getExchangeEligibility(
  receivingTeam: Team,
  losingTeam: Team,
  departingPlayer: Player
): ExchangeEligibility {
  const incomingSalary = departingPlayer.trueValue;  // Use TRUE VALUE, not contract
  const minSalary = incomingSalary * (1 - SALARY_MATCH_THRESHOLD);  // 90%
  const maxSalary = incomingSalary * (1 + SALARY_MATCH_THRESHOLD);  // 110%

  // NO position filtering - any player can be exchanged for any player
  // Teams can fill positional gaps via draft and farm system call-ups

  // Filter by salary threshold only
  const eligible = receivingTeam.roster.filter(p =>
    p.trueValue >= minSalary && p.trueValue <= maxSalary
  );

  // If no one eligible, find fallback (player with salary CLOSEST to incoming)
  let fallbackPlayer: Player | null = null;
  let fallbackRequired = false;

  if (eligible.length === 0) {
    fallbackRequired = true;
    // Find player with minimum absolute salary difference from incoming
    const sorted = [...receivingTeam.roster].sort((a, b) => {
      const diffA = Math.abs(a.trueValue - incomingSalary);
      const diffB = Math.abs(b.trueValue - incomingSalary);
      return diffA - diffB;  // Smallest difference first
    });
    fallbackPlayer = sorted[0] || null;
  }

  return { eligible, fallbackPlayer, fallbackRequired };
}

function calculateSalaryMatchPercentage(
  returnPlayerSalary: number,
  incomingPlayerSalary: number
): number {
  return ((returnPlayerSalary - incomingPlayerSalary) / incomingPlayerSalary) * 100;
  // Returns: -5% means 5% below, +8% means 8% above
}
```

### Examples

**Example 1: Normal Match (Cross-Position)**
```
Incoming: Barry Bonds ($15M, LF, from Thunder)
Receiving: Red Sox (better record)
Threshold: $13.5M - $16.5M (±10%)

Red Sox Eligible Players (ANY position):
✓ David Ortiz ($14M, 1B) - Within range
✓ Manny Ramirez ($16M, LF) - Within range
✓ Pedro Martinez ($15M, SP) - Within range ← Pitcher eligible too!
✗ Johnny Damon ($8M, CF) - Too low (-47%)

User selects: Pedro Martinez (pitcher for outfielder is valid)
Thunder can draft/call-up pitching replacement
```

**Example 2: Fallback Required (All Players Below Threshold)**
```
Incoming: Mike Trout ($25M, CF, from Angels)
Receiving: Rockies (worse record, low payroll team)
Threshold: $22.5M - $27.5M (±10%)

Rockies Players by Salary (ALL positions):
- Todd Helton ($12M, 1B) - Below threshold (-52% from $25M)
- Larry Walker ($10M, RF) - Below threshold (-60% from $25M)
- Mike Hampton ($9M, SP) - Below threshold (-64% from $25M)
- (no one meets threshold)

FALLBACK: Find closest to $25M incoming salary
- Helton gap: |$12M - $25M| = $13M
- Walker gap: |$10M - $25M| = $15M
- Hampton gap: |$9M - $25M| = $16M

FALLBACK TRIGGERED: Must give Todd Helton ($12M) - closest to incoming
```

**Example 3: Fallback Required (All Players Above Threshold)**
```
Incoming: Johnny Bench ($5M, C, from Reds)
Receiving: Yankees (big payroll team)
Threshold: $4.5M - $5.5M (±10%)

Yankees Players by Salary (ALL positions):
- Derek Jeter ($18M, SS) - Above threshold (+260% from $5M)
- Bernie Williams ($15M, CF) - Above threshold (+200% from $5M)
- Andy Pettitte ($12M, SP) - Above threshold (+140% from $5M)
- (no one meets threshold)

FALLBACK: Find closest to $5M incoming salary
- Pettitte gap: |$12M - $5M| = $7M ← CLOSEST
- Williams gap: |$15M - $5M| = $10M
- Jeter gap: |$18M - $5M| = $13M

FALLBACK TRIGGERED: Must give Andy Pettitte ($12M) - closest to incoming
```

### Definition of Done
- [ ] ~~Position type matching enforced~~ REMOVED - any position valid
- [ ] ±10% salary threshold calculated correctly
- [ ] Fallback rule implemented (closest salary to incoming, any position)
- [ ] UI shows salary threshold range
- [ ] Ineligible players show salary delta
- [ ] Fallback player marked as "REQUIRED - Closest Available"
- [ ] Auto-select picks closest salary match
- [ ] Both rosters update correctly
- [ ] Salaries recalculated with personality modifier
- [ ] Transaction logged with salary values

---

## S-FA008: Two-Round FA Orchestration

**Parent Feature:** F-E007
**Priority:** P0
**Estimated Size:** Medium

### User Story

**As the** league manager
**I want** free agency to run for two complete rounds
**So that** there's more player movement and roster churn

### Acceptance Criteria

**AC-1: Round 1 Flow**
- **Given:** Free agency phase begins
- **When:** Round 1 starts
- **Then:** For each team in order:
  1. Protection selection
  2. Dice roll
  3. Destination resolution
  4. Exchange (if applicable)
- **Verify:** All teams complete Round 1 before Round 2

**AC-2: Round 2 Flow**
- **Given:** Round 1 complete
- **When:** Round 2 starts
- **Then:** Repeat entire process with UPDATED ROSTERS
- **Verify:** New protection, new dice assignment based on current roster

**AC-3: Round Indicator**
- **Given:** FA flow is active
- **When:** Viewing any FA screen
- **Then:** Display "ROUND 1 of 2" or "ROUND 2 of 2" prominently
- **Verify:** Always clear which round user is in

**AC-4: Between-Round Summary**
- **Given:** Round 1 completes
- **When:** Transitioning to Round 2
- **Then:** Display summary of all Round 1 moves:
  - Player → Team (reason)
  - Return player ← Team
- **Verify:** User can review Round 1 before starting Round 2

**AC-5: Final Summary**
- **Given:** Round 2 completes
- **When:** FA phase ends
- **Then:** Display complete FA summary (see S-FA009)
- **Verify:** All moves from both rounds shown

**AC-6: State Persistence**
- **Given:** User exits mid-FA
- **When:** User returns
- **Then:** Resume from exact point (round, team, phase)
- **Verify:** No progress lost

### Technical Notes

```typescript
interface FreeAgencyState {
  currentRound: 1 | 2;
  currentTeamIndex: number;
  currentPhase: 'PROTECTION' | 'DICE_ROLL' | 'DESTINATION' | 'EXCHANGE';
  round1Moves: FAMove[];
  round2Moves: FAMove[];
  protections: Record<string, string>;  // teamId → playerId
  isComplete: boolean;
}

// Persist to offseasonStorage
```

### Definition of Done
- [ ] Round 1 completes for all teams
- [ ] Round 2 uses updated rosters
- [ ] Round indicator visible
- [ ] Between-round summary
- [ ] State persists across sessions
- [ ] Final summary shows all moves

---

## S-FA009: FA Summary UI

**Parent Feature:** F-E007
**Priority:** P1
**Estimated Size:** Small

### User Story

**As a** league manager
**I want to** see a summary of all free agency moves
**So that** I can understand how rosters changed

### Acceptance Criteria

**AC-1: Move List Display**
- **Given:** FA phase complete
- **When:** Summary UI renders
- **Then:** Display all moves grouped by round:
  ```
  ROUND 1 MOVES:
  • Barry Bonds (A+, LF) NYT → BOS (COMPETITIVE - rival)
    Return: David Ortiz (A, 1B)
  • Ken Griffey Jr. (A, CF) SEA → RETIRED (DROOPY)
  • Pedro Martinez (B+, SP) BOS → STAYED (JOLLY)

  ROUND 2 MOVES:
  • ...
  ```
- **Verify:** Matches format in OFFSEASON_SYSTEM_SPEC.md §8.7

**AC-2: Team Filter**
- **Given:** Summary displayed
- **When:** User selects a team filter
- **Then:** Show only moves involving that team
- **Verify:** Filter works for any team

**AC-3: Net Change Display**
- **Given:** Summary displayed
- **When:** Viewing team totals
- **Then:** Show per-team:
  - Players gained: X
  - Players lost: Y
  - Net WAR change: +/- Z
  - Net salary change: +/- $M
- **Verify:** Calculations correct

**AC-4: Print/Export**
- **Given:** Summary complete
- **When:** User clicks "Export"
- **Then:** Download as CSV or PDF
- **Verify:** Export includes all move data

### Technical Notes

```typescript
interface FASummary {
  round1Moves: FAMove[];
  round2Moves: FAMove[];
  teamSummaries: Record<string, {
    gained: Player[];
    lost: Player[];
    netWAR: number;
    netSalary: number;
  }>;
}
```

### Definition of Done
- [ ] All moves listed by round
- [ ] Team filter works
- [ ] Net changes calculated
- [ ] Export option functional
- [ ] Accessible from offseason hub after completion

---

## Implementation Order

| Priority | Story | Dependency | Est. Size |
|----------|-------|------------|-----------|
| 1 | S-FA001 (Sign FA) | None | Medium |
| 2 | S-FA002 (Wire Protection) | None | Small |
| 3 | S-FA003 (Dice Assignment) | S-FA002 | Medium |
| 4 | S-FA006 (H2H Tracking) | None | Medium |
| 5 | S-FA004 (Dice Roll UI) | S-FA003 | Medium |
| 6 | S-FA005 (Personality Dest) | S-FA006 | Large |
| 7 | S-FA007 (Exchange) | S-FA005 | Medium |
| 8 | S-FA008 (Two Rounds) | S-FA007 | Medium |
| 9 | S-FA009 (Summary UI) | S-FA008 | Small |

**Total Estimate:** ~9-12 story points (Large effort)

---

## Testing Requirements

### Unit Tests
- `assignDiceValues()` - correct ordering, edge cases
- `resolveFADestination()` - all 7 personalities
- `findRival()` - H2H calculation, tiebreakers
- `getEligibleReturnPlayers()` - grade rules, position matching

### Integration Tests
- Full FA flow: Protection → Dice → Destination → Exchange → Round 2
- State persistence across session breaks
- Transaction logging to `transactionStorage`

### E2E Tests
- Complete two-round FA with all personality types
- Verify rosters correct after FA completion
- Summary displays all moves accurately

---

## Appendix: Grade Value Mapping

```typescript
function gradeToValue(grade: string): number {
  const grades: Record<string, number> = {
    'S': 10, 'A+': 9, 'A': 8, 'A-': 7,
    'B+': 6, 'B': 5, 'B-': 4,
    'C+': 3, 'C': 2, 'C-': 1,
    'D+': 0.5, 'D': 0, 'D-': -0.5
  };
  return grades[grade] ?? 5;
}

function decreaseGradeByHalf(grade: string): string {
  const order = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-'];
  const idx = order.indexOf(grade);
  return order[Math.min(idx + 1, order.length - 1)];
}
```

---

*End of Free Agency Stories*
