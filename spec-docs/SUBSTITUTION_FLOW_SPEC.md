# Substitution Flow Specification

> **GOSPEL ANNOTATION (2026-02-21):** Interaction flow (multi-step substitution UI) is **superseded by KBL_UNIFIED_ARCHITECTURE_SPEC.md §5.2** (event-driven substitution recording). Substitution type tracking, inherited runner logic, and position validation remain **valid and authoritative**.

> **Purpose**: Define how player substitutions are tracked during in-game tracking
> **Integration**: INHERITED_RUNNERS_SPEC.md, PITCH_COUNT_TRACKING_SPEC.md
> **Related Specs**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §4 (In-Game Tracking)
> **SMB4 Reference**: SMB4_GAME_MECHANICS.md

---

## Table of Contents

1. [Overview](#1-overview)
2. [Substitution Types](#2-substitution-types)
3. [Pinch Hitter Flow](#3-pinch-hitter-flow)
4. [Pinch Runner Flow](#4-pinch-runner-flow)
5. [Defensive Substitution Flow](#5-defensive-substitution-flow)
6. [Pitching Change Flow](#6-pitching-change-flow)
7. [Double Switch](#7-double-switch)
8. [Data Schema](#8-data-schema)
9. [UI Flows](#9-ui-flows)
10. [Validation Rules](#10-validation-rules)

---

## 1. Overview

### Why Track Substitutions?

Substitutions impact:
- **Lineup management** - Who is in and out of the game
- **WAR calculations** - Partial game appearances
- **Inherited runners** - Reliever evaluations
- **Narrative generation** - "Manager brought in lefty specialist..."
- **Historical accuracy** - Complete game records

### SMB4 Substitution Mechanics

SMB4 supports:
- ✅ Pinch hitters
- ✅ Pinch runners
- ✅ Defensive substitutions
- ✅ Pitching changes
- ✅ Double switches (manual combination)

SMB4 does NOT have:
- ❌ Designated Hitter (DH) rules - pitchers bat
- ❌ Two-way player rules
- ❌ Position eligibility restrictions

---

## 2. Substitution Types

### 2.1 Types Summary

| Type | Code | When | Who Leaves | Who Enters |
|------|------|------|------------|------------|
| Pinch Hitter | PH | During at-bat | Current batter | Bench player |
| Pinch Runner | PR | Runner on base | Current runner | Bench player |
| Defensive Sub | DEF | Between innings or after out | Fielder | Bench player |
| Pitching Change | PITCH | Any time (with runners or not) | Pitcher | Reliever |
| Double Switch | DS | Usually with pitching change | Pitcher + fielder | Reliever + position player |

### 2.2 When Substitutions Occur

```
DURING AT-BAT:
├── Pinch Hitter → Before pitch (or between pitches)
└── Pitching Change → Before pitch

RUNNER ON BASE:
├── Pinch Runner → Between plays
└── Pitching Change → Can happen with runners on

BETWEEN HALF-INNINGS:
├── Defensive Sub → Any position
├── Pitching Change → Starter/reliever swap
└── Double Switch → Position swap + pitching change

AFTER AN OUT:
├── Defensive Sub → With dead ball
└── Pitching Change → Mid-inning
```

---

## 3. Pinch Hitter Flow

### 3.1 When to Trigger

Pinch hitter entry should be prompted/available:
- When a new batter comes up
- Before any pitch is thrown to that batter
- User initiates "Substitution" action

### 3.2 UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  PINCH HITTER                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Current Batter: Mike Thompson (P) - .180 AVG                   │
│  Spot: #9 in lineup                                             │
│                                                                 │
│  Select Pinch Hitter:                                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [●] Jake Wilson (OF) - .312 AVG - R bat vs L pitch       │   │
│  │ [ ] Sam Davis (1B) - .285 AVG - L bat vs L pitch         │   │
│  │ [ ] Chris Martin (IF) - .267 AVG - S bat                 │   │
│  │ [ ] (Other available bench players...)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  After at-bat, Wilson will play: [Select Position ▼]            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ RF (replacing Thompson's spot)                           │   │
│  │ LF │ CF │ 1B │ 2B │ SS │ 3B │ C │ P                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│         [Cancel]                    [Confirm Pinch Hitter]      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Data Captured

```typescript
interface PinchHitterEvent {
  eventType: 'PINCH_HITTER';
  gameId: string;
  inning: number;
  halfInning: 'top' | 'bottom';
  outs: number;

  // Who's out
  replacedPlayerId: string;
  replacedPlayerName: string;
  replacedBattingOrder: number;  // 1-9

  // Who's in
  pinchHitterId: string;
  pinchHitterName: string;

  // Defensive assignment after AB
  fieldingPosition: Position;

  // Context
  pitcherFacing: string;  // Opposing pitcher
  situation: string;      // "R1R3, 2 outs"
}
```

### 3.4 Post-AB Handling

After the pinch hitter's at-bat:
1. PH remains in game at specified position
2. Original player is OUT of the game
3. Update lineup and defensive alignment

---

## 4. Pinch Runner Flow

### 4.1 When to Trigger

Pinch runner entry available:
- When any runner is on base
- Between plays (dead ball)
- User initiates "Substitution" action

### 4.2 Special Consideration: Inherited Runners

When a pinch runner replaces a baserunner:
- **Pitcher responsibility does NOT change**
- If original runner reached off Pitcher A, PR is still "owned" by Pitcher A
- If PR scores, it's charged to Pitcher A (ER or UER based on how they reached)

```typescript
// From INHERITED_RUNNERS_SPEC.md
interface PinchRunnerEvent {
  // ... standard fields

  // CRITICAL: Maintain pitcher responsibility
  originalRunnerPitcherResponsible: string;
  // PR inherits this - they are STILL owned by that pitcher
}
```

### 4.3 UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  PINCH RUNNER                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Current Runner on 2B: Tony Martinez (.240 AVG, 3 SB)           │
│  Reached on: Double off Cole (2nd inning)                       │
│                                                                 │
│  Select Pinch Runner:                                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [●] Speed Williams (OF) - 15 SB, 95 SPD rating           │   │
│  │ [ ] Flash Gordon (IF) - 12 SB, 88 SPD rating             │   │
│  │ [ ] (Other available bench players...)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⚠️ If Williams scores, run charged to Cole (original pitcher)  │
│                                                                 │
│  After inning, Williams will play: [Select Position ▼]          │
│                                                                 │
│         [Cancel]                    [Confirm Pinch Runner]      │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Data Captured

```typescript
interface PinchRunnerEvent {
  eventType: 'PINCH_RUNNER';
  gameId: string;
  inning: number;
  halfInning: 'top' | 'bottom';
  outs: number;

  // Who's out
  replacedPlayerId: string;
  replacedPlayerName: string;
  replacedBattingOrder: number;
  base: '1B' | '2B' | '3B';

  // Who's in
  pinchRunnerId: string;
  pinchRunnerName: string;

  // INHERITED RUNNER TRACKING - Critical!
  pitcherResponsible: string;  // Pitcher who allowed original runner
  howOriginalReached: 'hit' | 'walk' | 'hbp' | 'error' | 'fc';

  // Defensive assignment after inning
  fieldingPosition: Position;
}
```

---

## 5. Defensive Substitution Flow

### 5.1 When to Trigger

Defensive subs typically occur:
- Between half-innings
- After a pinch hitter's AB (PH takes a position)
- After a pitching change (shuffling positions)
- During dead ball situations

### 5.2 UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  DEFENSIVE SUBSTITUTION                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Current Defense:                                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │     LF: Jones     CF: Smith     RF: Wilson               │   │
│  │          SS: Davis       2B: Brown                       │   │
│  │     3B: Miller                      1B: Garcia           │   │
│  │                   P: Cole                                │   │
│  │                   C: Martinez                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Substitution:                                                  │
│  Player OUT: [Select from current fielders ▼]                   │
│  Player IN:  [Select from bench ▼]                              │
│  Position:   [Confirm position ▼]                               │
│                                                                 │
│  💡 You can make multiple subs before confirming                │
│                                                                 │
│  Pending Changes:                                               │
│  • Wilson (RF) OUT → Parker IN at RF                            │
│                                                                 │
│    [Add Another Sub]        [Cancel]        [Confirm All]       │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Data Captured

```typescript
interface DefensiveSubEvent {
  eventType: 'DEFENSIVE_SUB';
  gameId: string;
  inning: number;
  halfInning: 'top' | 'bottom';

  // Can have multiple subs at once
  substitutions: {
    playerOut: string;
    playerOutName: string;
    playerIn: string;
    playerInName: string;
    position: Position;
    battingOrder: number;  // Takes over batting spot
  }[];
}
```

---

## 6. Pitching Change Flow

### 6.1 Integration with Other Specs

Pitching changes trigger:
1. **PITCH_COUNT_TRACKING_SPEC.md** - Capture outgoing pitcher's final count
2. **INHERITED_RUNNERS_SPEC.md** - Document bequeathed runners

### 6.2 UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  PITCHING CHANGE                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  OUTGOING PITCHER: Gerrit Cole                                  │
│  ├── Line: 6.2 IP, 3 H, 2 ER, 1 BB, 8 K                        │
│  ├── Pitch Count: [___] (REQUIRED)                              │
│  └── Runners Left: R1 (via single), R2 (via walk)               │
│                                                                 │
│  ⚠️ Runners on base will be charged to Cole if they score       │
│                                                                 │
│  INCOMING PITCHER:                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [●] Chapman (CL) - 2.10 ERA, 98 mph                      │   │
│  │ [ ] Loaisiga (RP) - 3.45 ERA, 96 mph                     │   │
│  │ [ ] Holmes (RP) - 2.85 ERA, sinker specialist            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│         [Cancel]                    [Confirm Pitching Change]   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Data Captured

```typescript
interface PitchingChangeEvent {
  eventType: 'PITCHING_CHANGE';
  gameId: string;
  inning: number;
  halfInning: 'top' | 'bottom';
  outs: number;

  // Outgoing pitcher
  outgoingPitcherId: string;
  outgoingPitcherName: string;
  outgoingPitchCount: number;       // REQUIRED
  outgoingLine: PitcherGameLine;    // IP, H, R, ER, BB, K

  // Bequeathed runners (from INHERITED_RUNNERS_SPEC)
  bequeathedRunners: {
    base: '1B' | '2B' | '3B';
    runnerId: string;
    howReached: string;
  }[];

  // Incoming pitcher
  incomingPitcherId: string;
  incomingPitcherName: string;
  incomingPitcherRole: 'SP' | 'RP' | 'CL';

  // Context
  inheritedRunners: number;  // Count for new pitcher
  currentScore: { home: number; away: number };
  leverage: 'low' | 'medium' | 'high';  // Game situation
}
```

### 6.4 Pitcher Stats Initialization ✅ IMPLEMENTED

When a pitching change is processed in `handleSubstitutionComplete()`:

```typescript
// 1. Apply substitution to lineup state
const newLineupState = applySubstitution(lineupState, event, inning);
// This sets lineupState.currentPitcher to the new pitcher

// 2. Initialize pitcher stats for new pitcher in pitcherGameStats Map
if (event.eventType === 'PITCH_CHANGE') {
  const pc = event as PitchingChangeEvent;
  setPitcherGameStats((prev) => {
    const newMap = new Map(prev);
    if (!newMap.has(pc.incomingPitcherId)) {
      // Team determined by which half of inning (home pitches in TOP)
      const teamId = halfInning === 'TOP' ? homeTeamId : awayTeamId;
      newMap.set(
        pc.incomingPitcherId,
        createInitialPitcherStats(
          pc.incomingPitcherId,
          pc.incomingPitcherName,
          teamId,
          false,  // isStarter = false for relievers
          inning  // entryInning for tracking
        )
      );
    }
    return newMap;
  });
}
```

**Why This Matters:**
- `pitcherGameStats` Map accumulates stats across all at-bats
- New pitchers need an entry BEFORE their first at-bat
- `isStarter: false` ensures relievers are categorized correctly
- `entryInning` enables "first inning disaster" tracking for starters only
- `getCurrentPitcherId()` now uses `lineupState.currentPitcher` instead of fixed IDs

**Integration with STAT_TRACKING_ARCHITECTURE_SPEC.md:**
- Pitcher stats persist in game state (Phase 2)
- Stats aggregate to season totals on game completion (Phase 3)
- Enables proper no-hitter/perfect game detection (needs full-game accumulation)

---

## 7. Double Switch

### 7.1 What is a Double Switch?

A double switch is:
1. Pitching change AND
2. Position swap to change batting order

**Purpose**: Avoid having the new pitcher bat soon

### 7.2 Example

```
Before Double Switch:
#8 batter: RF Johnson (just made out)
#9 batter: P Smith (due up next inning)

Double Switch:
- Smith (P) OUT → Chapman IN at P
- Johnson (RF) OUT → Williams IN at RF

After Double Switch:
#8 batter: P Chapman (won't bat for a while)
#9 batter: RF Williams (takes Johnson's spot)
```

### 7.3 UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  DOUBLE SWITCH                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  This is a pitching change PLUS batting order swap.             │
│                                                                 │
│  PITCHING CHANGE:                                               │
│  OUT: Smith (P) - 4.1 IP, Pitch Count: [72]                     │
│  IN:  [Select reliever ▼]                                       │
│                                                                 │
│  POSITION SWAP:                                                 │
│  Player leaving: [Select position player ▼]                     │
│  Player entering: [Select bench player ▼]                       │
│  Position: [Select ▼]                                           │
│                                                                 │
│  BATTING ORDER RESULT:                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ #8: New Pitcher (was #9)                                 │   │
│  │ #9: New Position Player (was #8)                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│         [Cancel]                    [Confirm Double Switch]     │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Data Captured

```typescript
interface DoubleSwitchEvent {
  eventType: 'DOUBLE_SWITCH';
  gameId: string;
  inning: number;
  halfInning: 'top' | 'bottom';

  // Pitching change component
  pitchingChange: PitchingChangeEvent;

  // Position swap component
  positionSwap: {
    playerOut: string;
    playerOutPosition: Position;
    playerOutBattingOrder: number;

    playerIn: string;
    playerInPosition: Position;
    playerInBattingOrder: number;  // Takes pitcher's old spot
  };

  // New batting order spots
  newPitcherBattingOrder: number;
  newPositionPlayerBattingOrder: number;
}
```

---

## 8. Data Schema

### 8.1 Master Substitution Record

```typescript
interface GameSubstitutions {
  gameId: string;

  // All substitutions in order
  events: (
    | PinchHitterEvent
    | PinchRunnerEvent
    | DefensiveSubEvent
    | PitchingChangeEvent
    | DoubleSwitchEvent
  )[];

  // Current game state (updated after each sub)
  currentLineup: {
    battingOrder: number;  // 1-9
    playerId: string;
    playerName: string;
    position: Position;
    enteredGame: number;   // Inning entered
    enteredFor: string;    // Who they replaced
  }[];

  // Players no longer in game
  exitedPlayers: {
    playerId: string;
    playerName: string;
    exitedInning: number;
    exitedFor: string;     // Who replaced them
    finalPosition: Position;
  }[];
}
```

### 8.2 Lineup State Tracking

```typescript
interface LineupState {
  // Current 9-player lineup
  lineup: LineupSpot[];

  // Available bench players
  bench: BenchPlayer[];

  // Already used (can't re-enter)
  usedPlayers: string[];
}

interface LineupSpot {
  order: number;           // 1-9
  currentPlayer: string;
  position: Position;
  originalPlayer: string;  // Who started in this spot
}

interface BenchPlayer {
  playerId: string;
  playerName: string;
  positions: Position[];   // Positions they can play
  isAvailable: boolean;    // Not yet used
}
```

---

## 9. UI Flows

### 9.1 Substitution Entry Point

From main tracking screen, user can access substitutions via:
1. "Substitution" button (always visible)
2. Long-press on a player
3. Before recording a plate appearance

### 9.2 Quick Sub vs Full Sub

**Quick Sub** (common case):
- Pitching change only
- PH for pitcher spot

**Full Sub** (complex case):
- Double switch
- Multiple defensive changes
- Mid-inning position swaps

### 9.3 Visual Lineup Editor

```
┌─────────────────────────────────────────────────────────────────┐
│  LINEUP EDITOR                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Batting Order:                   Field Positions:              │
│  ┌─────────────────────────┐      ┌─────────────────────┐       │
│  │ 1. CF Smith      [Edit] │      │     LF    CF    RF  │       │
│  │ 2. 2B Johnson    [Edit] │      │       SS    2B      │       │
│  │ 3. 1B Martinez   [Edit] │      │  3B           1B    │       │
│  │ 4. RF Wilson     [Edit] │      │         P           │       │
│  │ 5. LF Brown      [Edit] │      │         C           │       │
│  │ 6. 3B Davis      [Edit] │      └─────────────────────┘       │
│  │ 7. SS Garcia     [Edit] │                                    │
│  │ 8. C Thompson    [Edit] │      Bench:                        │
│  │ 9. P Cole        [Edit] │      Parker (OF), Lee (IF),        │
│  └─────────────────────────┘      Adams (C), Powers (P)         │
│                                                                 │
│  Tap [Edit] to substitute, or drag to swap positions            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Validation Rules

### 10.1 Substitution Constraints

```typescript
const SUBSTITUTION_RULES = {
  // Player can only enter once per game
  noReEntry: true,

  // Must have 9 players in lineup at all times
  minLineupSize: 9,
  maxLineupSize: 9,

  // Can't substitute during live ball
  requireDeadBall: true,

  // Pinch hitter must bat before defensive assignment
  phMustBat: true,
};

function validateSubstitution(sub, gameState) {
  const errors = [];

  // Check player hasn't already played
  if (gameState.usedPlayers.includes(sub.playerIn)) {
    errors.push(`${sub.playerInName} has already been used in this game`);
  }

  // Check player is on bench
  if (!gameState.bench.find(p => p.playerId === sub.playerIn)) {
    errors.push(`${sub.playerInName} is not available on bench`);
  }

  // For pitching change, ensure pitch count captured
  if (sub.eventType === 'PITCHING_CHANGE' && !sub.outgoingPitchCount) {
    errors.push('Pitch count required before confirming pitching change');
  }

  return errors;
}
```

### 10.2 Lineup Integrity Checks

```typescript
function validateLineup(lineup) {
  const errors = [];

  // Must have exactly 9 players
  if (lineup.length !== 9) {
    errors.push(`Lineup has ${lineup.length} players, must have 9`);
  }

  // Must have exactly 9 positions filled
  const positions = lineup.map(l => l.position);
  const requiredPositions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

  for (const pos of requiredPositions) {
    if (!positions.includes(pos)) {
      errors.push(`No player at ${pos}`);
    }
  }

  // No duplicate batting order numbers
  const orders = lineup.map(l => l.order);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== 9) {
    errors.push('Duplicate batting order positions');
  }

  return errors;
}
```

---

## Appendix: Common Substitution Patterns

### Pattern 1: Late-Game Pitching Change
```
Situation: 8th inning, protecting lead
Action: Bring in setup man for starter
Steps:
1. Record pitch count for starter
2. Select reliever
3. Note inherited runners (if any)
```

### Pattern 2: Pinch Hit for Pitcher
```
Situation: Pitcher spot due up, need offense
Action: PH for pitcher, then pitching change
Steps:
1. Record PH for pitcher's spot
2. After AB, record pitching change
3. PH takes a defensive position
```

### Pattern 3: Double Switch to Avoid Quick AB
```
Situation: Pitcher just batted, want fresh arm
Action: Bring in reliever at different lineup spot
Steps:
1. Select "Double Switch" option
2. Choose reliever and their new batting spot
3. Choose position player to swap with
```

### Pattern 4: Late-Inning Defensive Replacement
```
Situation: Leading late, upgrade defense
Action: Sub in better defender for bat-first player
Steps:
1. Select "Defensive Sub"
2. Choose player out (weak defender)
3. Choose player in (defensive specialist)
4. Confirm position
```

---

*Last Updated: January 22, 2026*
*Version: 1.0 - Initial substitution flow specification*
