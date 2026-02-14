# EOS Ratings Adjustment - User Stories

> **Phase**: 3 of 11 (Offseason)
> **Trigger**: After Awards Ceremony (Phase 2) completes
> **Purpose**: Adjust player ratings and salaries based on season performance vs expectations
> **Next Phase**: Contraction/Expansion (Phase 4)

---

## Overview

End-of-Season (EOS) Ratings Adjustments is an offseason ceremony where player ratings change based on their WAR performance vs salary expectations. The system runs two sequential operations:

1. **System A (Rating Adjustments)**: Compare WAR percentile to salary percentile → adjust ratings
2. **System B (Salary Adjustments)**: Calculate "True Value" from WAR → adjust contract salary

**Reference Documents**:
- `EOS_RATINGS_ADJUSTMENT_SPEC.md` — Position detection, thresholds, formulas
- `EOS_RATINGS_FIGMA_SPEC.md` — UI design specification
- `EOS_RATINGS_READINESS.md` — Decision log and data requirements

---

## User Stories

### S-EOS001: Phase Entry and Validation

**As a** league manager,
**I want** the system to validate that Awards Ceremony is complete before entering Ratings Adjustments,
**So that** all prerequisite data is available.

**Acceptance Criteria:**
1. AC-1: Phase 3 only accessible after Phase 2 (Awards) completes
2. AC-2: All season stats must be finalized
3. AC-3: WAR calculations (bWAR, rWAR, fWAR, pWAR) must be complete for all players
4. AC-4: Display entry screen with league-wide preview

**Technical Notes:**
```typescript
function canEnterRatingsPhase(offseasonState: OffseasonState): boolean {
  return (
    offseasonState.awardsComplete &&
    offseasonState.warCalculationsComplete &&
    offseasonState.currentPhase >= 2
  );
}
```

---

### S-EOS002: Position Detection

**As a** league manager,
**I want** the system to detect each player's primary position based on their season usage,
**So that** they are compared to appropriate peers.

**Acceptance Criteria:**
1. AC-1: Detect position using scalable thresholds based on season length
2. AC-2: Pitcher types: SP, SP/RP, RP, CP based on starts/relief/saves
3. AC-3: Position player types: C, 1B, 2B, SS, 3B, LF, CF, RF, DH, UTIL, BENCH
4. AC-4: Two-way players detected when meeting both pitching and batting thresholds
5. AC-5: Detected position displayed on player card as badge

**Position Thresholds (40-game season)**:
| Position | Threshold |
|----------|-----------|
| SP | 5+ starts, starts > relief |
| SP/RP | 2+ starts, relief >= 50% of starts |
| RP | 10+ relief appearances |
| CP | 5+ saves |
| UTIL | 3+ positions, 6+ games each, none >60% |
| BENCH | <50% of team games at primary |
| TWO-WAY | 5+ pitching games AND 49+ PA |

**Technical Notes:**
```typescript
function detectPosition(
  player: Player,
  seasonStats: SeasonStats,
  seasonLength: number
): DetectedPosition {
  const thresholds = getPositionThresholds(seasonLength);
  // Detection algorithm per EOS_RATINGS_ADJUSTMENT_SPEC.md
  return detectedPosition;
}
```

---

### S-EOS003: Peer Pool Assignment

**As a** league manager,
**I want** players compared to appropriate peer groups,
**So that** rating adjustments are fair.

**Acceptance Criteria:**
1. AC-1: Minimum 6 players per pool for meaningful comparison
2. AC-2: Small pools merge with similar positions:
   - Pitchers: CP ↔ RP, SP/RP ↔ SP/RP
   - Corner IF: 1B ↔ 3B
   - Middle IF: 2B ↔ SS
   - Outfield: LF ↔ CF ↔ RF
   - Bench: UTIL ↔ BENCH
3. AC-3: Two-way players compared separately for pitching and batting
4. AC-4: Pool size shown in player adjustment detail

**Technical Notes:**
```typescript
function getComparisonPool(
  position: string,
  allPlayers: Player[]
): Player[] {
  const posPlayers = allPlayers.filter(p => p.detectedPosition === position);

  if (posPlayers.length < MIN_POOL_SIZE) {
    return getMergedPool(position, allPlayers);
  }
  return posPlayers;
}
```

---

### S-EOS004: WAR Percentile Calculation

**As a** league manager,
**I want** each player's WAR ranked within their position peer group,
**So that** performance can be compared to expectations.

**Acceptance Criteria:**
1. AC-1: Calculate percentile for each WAR component within peer pool
2. AC-2: bWAR percentile for all batters
3. AC-3: rWAR percentile for all players (baserunning)
4. AC-4: fWAR percentile for fielders only (null for DH)
5. AC-5: pWAR percentile for pitchers only
6. AC-6: Percentiles shown as 0-100 on player card

**Technical Notes:**
```typescript
function calculateWARPercentile(
  playerWAR: number,
  peerPool: Player[],
  warComponent: 'bWAR' | 'rWAR' | 'fWAR' | 'pWAR'
): number {
  const values = peerPool.map(p => p[warComponent]).sort((a, b) => a - b);
  const rank = values.filter(v => v < playerWAR).length;
  return Math.round((rank / values.length) * 100);
}
```

---

### S-EOS005: Salary Percentile Calculation

**As a** league manager,
**I want** each player's salary ranked within their position peer group,
**So that** expectations are properly calibrated.

**Acceptance Criteria:**
1. AC-1: Calculate salary percentile within position peer pool
2. AC-2: Assign salary tier based on percentile:
   - Elite: 90-100%
   - High: 75-89%
   - Mid-High: 50-74%
   - Mid-Low: 25-49%
   - Low: 10-24%
   - Minimum: 0-9%
3. AC-3: Display tier badge on player card
4. AC-4: Tier determines asymmetric adjustment factors

**Salary Tier Factors**:
| Tier | Positive Factor | Negative Factor |
|------|-----------------|-----------------|
| Elite | 1.0 | 10.0 |
| High | 2.0 | 7.0 |
| Mid-High | 4.0 | 5.0 |
| Mid-Low | 6.0 | 3.0 |
| Low | 8.0 | 1.5 |
| Minimum | 10.0 | 1.0 |

---

### S-EOS006: Rating Adjustment Calculation (System A)

**As a** league manager,
**I want** player ratings adjusted based on WAR percentile vs salary percentile delta,
**So that** performance above/below expectations is reflected.

**Acceptance Criteria:**
1. AC-1: Calculate delta = WAR percentile - Salary percentile
2. AC-2: Apply salary tier factor (asymmetric based on over/underperformance)
3. AC-3: Map WAR components to rating categories:
   - bWAR → Power, Contact (50/50)
   - rWAR → Speed (100%)
   - fWAR → Fielding, Arm (50/50)
   - pWAR → Velocity, Junk, Accuracy (33/33/33)
4. AC-4: Cap adjustments at ±10 per WAR component
5. AC-5: Display before/after for each rating category

**Technical Notes:**
```typescript
interface RatingAdjustment {
  category: string;
  before: number;
  after: number;
  change: number;
  source: 'bWAR' | 'rWAR' | 'fWAR' | 'pWAR';
}

function calculateRatingAdjustment(
  warPercentile: number,
  salaryPercentile: number,
  salaryTier: SalaryTier
): number {
  const delta = warPercentile - salaryPercentile;
  const factor = delta >= 0
    ? salaryTier.positiveFactor
    : salaryTier.negativeFactor;

  const raw = delta * factor / 10;  // Scale to rating points
  return Math.max(-10, Math.min(10, Math.round(raw)));  // Cap at ±10
}
```

---

### S-EOS007: DH Fielding Handling

**As a** league manager,
**I want** DHs to skip fielding adjustments,
**So that** they aren't penalized for not fielding.

**Acceptance Criteria:**
1. AC-1: DHs have null fWAR (no fielding data)
2. AC-2: Display "N/A (DH - no fielding)" for fielding/arm adjustments
3. AC-3: Net change calculation excludes fielding for DHs
4. AC-4: Gray italic styling for N/A fields

**Display Example**:
```
RATINGS ADJUSTMENT - Big Papi (DH)
─────────────────────────────────
Batting:     +4
Baserunning: -1
Fielding:    N/A (DH - no fielding)
Pitching:    N/A
```

---

### S-EOS008: Two-Way Player Handling

**As a** league manager,
**I want** two-way players to receive both batting and pitching adjustments,
**So that** their dual role is properly evaluated.

**Acceptance Criteria:**
1. AC-1: Two-way players compared against batting peers for bWAR/rWAR/fWAR
2. AC-2: Two-way players compared against pitching peers for pWAR
3. AC-3: Both adjustment sets displayed on player card
4. AC-4: Net change combines batting and pitching adjustments
5. AC-5: Separate sections for "Batting Adjustments" and "Pitching Adjustments"

**Display Example**:
```
SHOHEI OHTANI (TWO-WAY)
───────────────────────
BATTING ADJUSTMENTS (vs RF peers)
  Power: +2  Contact: +1  Speed: +1

PITCHING ADJUSTMENTS (vs SP peers)
  Velocity: +1  Junk: +1  Accuracy: +1

NET CHANGE: +7
```

---

### S-EOS009: Pitcher Rating Adjustments

**As a** league manager,
**I want** pitchers evaluated only on pitching metrics,
**So that** their ratings reflect mound performance.

**Acceptance Criteria:**
1. AC-1: pWAR → Velocity, Junk, Accuracy (33/33/33 distribution)
2. AC-2: Pitchers skip bWAR/rWAR/fWAR adjustments (display N/A)
3. AC-3: Detected position shown (SP, RP, CP, SP/RP)
4. AC-4: Display number of starts vs relief appearances

---

### S-EOS010: Salary Adjustment Calculation (System B)

**As a** league manager,
**I want** player salaries adjusted toward their "True Value",
**So that** contracts reflect actual performance.

**Acceptance Criteria:**
1. AC-1: Calculate True Value from WAR performance
2. AC-2: Adjustment = 50% of gap between current salary and True Value
3. AC-3: Respect salary floor/ceiling by grade
4. AC-4: Display before/after salary with delta
5. AC-5: System B runs AFTER System A (rating adjustments)

**Technical Notes:**
```typescript
function calculateSalaryAdjustment(
  currentSalary: number,
  trueValue: number,
  grade: string
): SalaryAdjustment {
  const gap = trueValue - currentSalary;
  const adjustment = gap * 0.5;  // 50% of gap

  const newSalary = Math.max(
    SALARY_FLOOR[grade],
    Math.min(SALARY_CEILING[grade], currentSalary + adjustment)
  );

  return {
    before: currentSalary,
    after: newSalary,
    delta: newSalary - currentSalary
  };
}
```

---

### S-EOS011: Overview Dashboard Display

**As a** league manager,
**I want** to see a league-wide summary before diving into team details,
**So that** I understand the scope of changes.

**Acceptance Criteria:**
1. AC-1: Display total players with changes (improved/declined/unchanged)
2. AC-2: Show top 3 risers with name, team, change amount
3. AC-3: Show top 3 fallers with name, team, change amount
4. AC-4: List all teams with change counts
5. AC-5: [Begin Team Review] and [Skip All] buttons

---

### S-EOS012: Team-by-Team Reveal

**As a** league manager,
**I want** to review each team's adjustments one at a time,
**So that** I can focus on individual team changes.

**Acceptance Criteria:**
1. AC-1: Display team header (logo, name, record)
2. AC-2: Show net rating change and average change per player
3. AC-3: List all players with adjustments
4. AC-4: Each player card shows before/after ratings and net change
5. AC-5: Filter options: All, Position, Change type (positive/negative)
6. AC-6: [Prev Team] [Next Team] navigation

---

### S-EOS013: Player Adjustment Card

**As a** league manager,
**I want** to see detailed adjustment breakdown for each player,
**So that** I understand why their ratings changed.

**Acceptance Criteria:**
1. AC-1: Player photo, name, detected position
2. AC-2: Salary and tier badge
3. AC-3: WAR percentiles for each component
4. AC-4: Before/after for each rating category
5. AC-5: Change visualization bar (green/red)
6. AC-6: Net change badge
7. AC-7: Salary adjustment amount
8. AC-8: Expandable detail view with full calculation breakdown

---

### S-EOS014: Manager Distribution Pool Calculation

**As a** league manager,
**I want** each manager to receive a point pool based on their performance,
**So that** good managers can boost their players.

**Acceptance Criteria:**
1. AC-1: Base pool = 20 points for all managers
2. AC-2: mWAR bonus/penalty based on manager WAR vs league median
3. AC-3: Manager of the Year bonus = +5 points
4. AC-4: Total pool can be positive or negative
5. AC-5: Negative pools must still be distributed (penalizes team)

**Pool Calculation**:
```typescript
interface ManagerPool {
  basePool: 20;
  mwarBonus: number;  // Can be negative
  moyBonus: 0 | 5;
  totalPool: number;
}

function calculateManagerPool(manager: Manager): ManagerPool {
  const leagueMedianMWAR = getLeagueMedianMWAR();
  const mwarDiff = manager.mWAR - leagueMedianMWAR;
  const mwarBonus = Math.round(mwarDiff * getGradeFactor(manager.grade) * 5);

  return {
    basePool: 20,
    mwarBonus,
    moyBonus: manager.isManagerOfYear ? 5 : 0,
    totalPool: 20 + mwarBonus + (manager.isManagerOfYear ? 5 : 0)
  };
}
```

---

### S-EOS015: Manager Distribution Interface

**As a** league manager,
**I want** to manually allocate my manager's bonus points to players,
**So that** I can reward specific performers.

**Acceptance Criteria:**
1. AC-1: Display manager info (name, grade, mWAR, record)
2. AC-2: Show pool breakdown (base + mWAR + MOY = total)
3. AC-3: [+ Add Allocation] button opens modal
4. AC-4: Select player, rating category, and point amount
5. AC-5: Max 50% of pool to any single player
6. AC-6: Can allocate positive OR negative points
7. AC-7: Running total of remaining points
8. AC-8: [Confirm Distribution] enabled only when remaining = 0

---

### S-EOS016: Manager Distribution Validation

**As a** league manager,
**I want** the system to enforce distribution rules,
**So that** all points are properly allocated.

**Acceptance Criteria:**
1. AC-1: Cannot exceed 50% of pool to single player
2. AC-2: Must distribute ALL points (positive or negative)
3. AC-3: Real-time validation as allocations are made
4. AC-4: Warning if trying to proceed with points remaining
5. AC-5: Can remove/edit allocations before confirming

---

### S-EOS017: Negative Manager Pool

**As a** league manager,
**I want** poor-performing managers to distribute negative points,
**So that** bad management has consequences.

**Acceptance Criteria:**
1. AC-1: Negative total pool clearly indicated
2. AC-2: Warning message: "You must distribute -X points across your roster"
3. AC-3: Explanation: "Poor management penalizes player development"
4. AC-4: Same distribution rules apply (50% max per player)
5. AC-5: Cannot proceed without distributing all negative points

---

### S-EOS018: Zero Manager Pool

**As a** league manager,
**I want** managers with zero pool to skip distribution,
**So that** the flow isn't unnecessarily delayed.

**Acceptance Criteria:**
1. AC-1: Display: "No distribution needed"
2. AC-2: Message: "Your team performed exactly as expected"
3. AC-3: [Continue] button immediately available
4. AC-4: No allocation interface shown

---

### S-EOS019: League Summary

**As a** league manager,
**I want** to see a final summary of all adjustments across the league,
**So that** I can review the complete picture.

**Acceptance Criteria:**
1. AC-1: Completion banner: "Season X → Season Y Adjustments Complete"
2. AC-2: League totals: X improved, Y declined, Z unchanged
3. AC-3: Team summary table with improved/declined/net change/salary delta
4. AC-4: Notable changes: Biggest riser, biggest faller, biggest raise, biggest cut
5. AC-5: [Export PDF] option
6. AC-6: [Continue to Contraction/Expansion] button

---

### S-EOS020: Edge Case - No Changes for Team

**As a** league manager,
**I want** teams with no rating changes to be handled gracefully,
**So that** the UI doesn't show empty states.

**Acceptance Criteria:**
1. AC-1: Display: "No rating changes this season"
2. AC-2: Message: "All players performed as expected based on their salary"
3. AC-3: [Next Team] button available
4. AC-4: Team still counted in progress indicator

---

### S-EOS021: Mid-Phase Exit and Resume

**As a** league manager,
**I want** to save progress and resume later,
**So that** I don't lose work if interrupted.

**Acceptance Criteria:**
1. AC-1: Auto-save after each team reviewed
2. AC-2: Auto-save after manager distribution confirmed
3. AC-3: [Save & Exit] option at any point
4. AC-4: Resume returns to last incomplete step
5. AC-5: Warning before exit: "Progress will be saved"

---

### S-EOS022: Apply Adjustments

**As a** league manager,
**I want** all adjustments to be applied when I complete the phase,
**So that** player data is updated for the next season.

**Acceptance Criteria:**
1. AC-1: Rating changes applied to all players
2. AC-2: Salary changes applied to all contracts
3. AC-3: Manager distribution points applied
4. AC-4: Transaction log created for all changes
5. AC-5: Changes reflected in player profiles immediately

---

## Data Models

### EOS Adjustment State

```typescript
interface EOSAdjustmentState {
  seasonId: number;
  phase: 3;
  status: 'IN_PROGRESS' | 'COMPLETE';

  // Progress tracking
  currentTeamIndex: number;
  teamsReviewed: string[];
  managerDistributionsComplete: string[];

  // Calculations
  playerAdjustments: Map<string, PlayerAdjustment>;
  salaryAdjustments: Map<string, SalaryAdjustment>;
  managerPools: Map<string, ManagerPool>;
  managerAllocations: Map<string, ManagerAllocation[]>;

  // Summary
  leagueSummary: {
    improved: number;
    declined: number;
    unchanged: number;
    totalRatingChange: number;
    totalSalaryChange: number;
  };
}
```

### Player Adjustment

```typescript
interface PlayerAdjustment {
  playerId: string;
  playerName: string;
  teamId: string;

  // Position
  detectedPosition: string;
  peerPoolSize: number;

  // Percentiles
  salaryPercentile: number;
  salaryTier: SalaryTier;
  warPercentiles: {
    bWAR?: number;
    rWAR?: number;
    fWAR?: number;
    pWAR?: number;
  };

  // Rating changes
  ratingsBefore: PlayerRatings;
  ratingsAfter: PlayerRatings;
  ratingChanges: RatingChange[];
  netRatingChange: number;

  // Salary change
  salaryBefore: number;
  salaryAfter: number;
  salaryDelta: number;
}
```

---

## Integration Points

### Upstream Dependencies
- **Phase 2 (Awards)**: WAR calculations, season stats finalized
- **Season Stats**: All batting, pitching, fielding statistics
- **Roster Data**: Player salaries, positions, grades

### Downstream Consumers
- **Phase 4 (Contraction/Expansion)**: Uses updated ratings/salaries
- **Phase 5 (Retirements)**: Uses adjusted player values
- **Player Profiles**: Display updated ratings/salaries

---

## Screen Flow

```
Phase 2 Complete (Awards)
         │
         ▼
┌─────────────────────┐
│  Screen 1:          │ ◄── League-wide preview
│  Overview Dashboard │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Screen 2:          │ ◄── Repeat for each team
│  Team Reveal        │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Screen 3:          │ ◄── Per team (if user manages)
│  Manager            │
│  Distribution       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Screen 4:          │ ◄── Final overview
│  League Summary     │
└─────────┬───────────┘
          │
          ▼
    Phase 4: Contraction/
       Expansion
```

---

*Last Updated: January 29, 2026*
*Stories: S-EOS001 through S-EOS022*
