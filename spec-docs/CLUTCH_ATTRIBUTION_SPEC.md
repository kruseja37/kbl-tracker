# Clutch Attribution System Specification

> **Purpose**: Define how clutch/choke credit is distributed to ALL participants on every play
> **Foundation**: Uses Leverage Index from LEVERAGE_INDEX_SPEC.md
> **Philosophy**: Hybrid skill-based + outcome-based attribution
> **Related Specs**: LEVERAGE_INDEX_SPEC.md, MWAR_CALCULATION_SPEC.md, KBL_XHD_TRACKER_MASTER_SPEC_v3.md §6, FIELD_ZONE_INPUT_SPEC.md

---

## Table of Contents

1. [Overview](#1-overview)
2. [Core Principles](#2-core-principles)
3. [Contact Quality System](#3-contact-quality-system)
4. [Attribution by Play Type](#4-attribution-by-play-type)
5. [Fielder Arm & Positioning](#5-fielder-arm--positioning)
6. [Manager Decision Inference](#6-manager-decision-inference)
7. [Shift Tracking](#7-shift-tracking)
8. [Special SMB4 Rules](#8-special-smb4-rules)
9. [Playoff Context Multipliers](#9-playoff-context-multipliers)
10. [Net Clutch Rating](#10-net-clutch-rating)
11. [Display Thresholds](#11-display-thresholds)
12. [Implementation Schema](#12-implementation-schema)
13. [Complete Attribution Tables](#13-complete-attribution-tables)

---

## 1. Overview

### The Problem with Simple Attribution

Traditional clutch systems assign credit to one player:
- HR in clutch = batter gets +2 clutch
- K in clutch = batter gets -1 choke

This ignores:
- The pitcher who threw the meatball (or painted the corner)
- The catcher who called the pitch
- The fielder who made (or missed) the play
- The manager who made the strategic call

### The Solution: Multi-Participant Attribution

Every play involves multiple participants. Each deserves appropriate credit/blame weighted by:
1. **Leverage Index (LI)** - How critical was the moment?
2. **Contact Quality (CQ)** - Who controlled the outcome?
3. **Skill Expectation** - What should we expect from this player/position?

### Core Formula

```javascript
clutchValue = baseValue × skillFactor × √(leverageIndex)
```

---

## 2. Core Principles

### Principle 1: Credit Flows to Whoever Controlled the Outcome

| Outcome Control | Primary Credit/Blame |
|-----------------|---------------------|
| Barreled ball (CQ ≥ 0.8) | Batter |
| Weak contact (CQ ≤ 0.3) | Pitcher |
| Strikeout/Walk | Pitcher + Batter |
| Great defensive play | Fielder |
| Error | Fielder |
| Baserunning decision | Runner |
| Strategic call | Manager |

### Principle 2: Extraordinary Effort is Never Punished

- Diving attempt that misses: Fielder gets **credit** for trying, not blame
- Missed robbed HR: Fielder gets **credit** (it was already a HR)
- Failed squeeze play: Manager shares blame, but player executed the call

### Principle 3: Bad Luck ≠ Blame

- Bad hop on grounder: **No fielder blame** (they couldn't control physics)
- Bloop single: Reduced batter credit (lucky outcome)
- Line drive caught: Reduced batter blame (they hit it well)

### Principle 4: LI Applies Equally to All Participants

The same leverage index applies to everyone involved in the play. A bases-loaded K in the 9th (LI = 6.9) affects:
- Batter: -1.0 × √6.9 = **-2.63 choke**
- Pitcher: +1.0 × √6.9 = **+2.63 clutch**
- Catcher: +0.2 × √6.9 = **+0.53 clutch**

### Principle 5: Total Credit Should Be Bounded

For any play, the total absolute credit/blame should roughly balance:
- Offense gains → Defense loses (and vice versa)
- Exception: Extraordinary plays can create "extra" value

---

## 3. Contact Quality System

### Why Contact Quality Matters

Without Statcast data, we can't calculate xwOBA. But we CAN observe contact quality in SMB4 through:
- **Sound**: Loud crack vs. dull thud
- **Trajectory**: Line drive vs. popup
- **Ball speed**: Screaming liner vs. dying quail

### Contact Quality Scale (0.1 to 1.0)

| Category | CQ Score | Visual/Audio Cues | Examples |
|----------|----------|-------------------|----------|
| **Barrel** | 1.0 | Loud crack, screaming trajectory | HR, frozen pitcher, gap shot |
| **Hard** | 0.8 | Solid sound, good trajectory | Hard grounder, deep fly, line drive |
| **Medium** | 0.5 | Normal sound | Routine fly, normal grounder |
| **Weak** | 0.3 | Soft/dull sound, poor trajectory | Soft grounder, bloop, dying quail |
| **Mishit** | 0.1 | Off-bat sound, bad angle | Popup, weak popup, foul tip |

### Default CQ by Trajectory

For quick data entry, the system infers CQ from trajectory (user can override):

```javascript
const DEFAULT_CONTACT_QUALITY = {
  // Home runs are always barreled
  'home_run': 1.0,

  // Line drives are almost always hard
  'line_drive': 0.85,

  // Fly balls vary by depth
  'fly_ball_deep': 0.75,      // Warning track+
  'fly_ball_medium': 0.50,    // Normal outfield
  'fly_ball_shallow': 0.35,   // Bloop territory

  // Ground balls vary by speed
  'ground_ball_hard': 0.70,   // Through hole, eats up fielder
  'ground_ball_medium': 0.50, // Routine
  'ground_ball_weak': 0.30,   // Slow roller

  // Pop-ups are always weak
  'popup_infield': 0.10,
  'popup_shallow': 0.15,

  // Strikeouts have no contact
  'strikeout': null
};
```

### UI Exit Type → Contact Quality Mapping

The in-game tracker captures **Exit Type** (from UI) and **Direction**. This maps to Contact Quality:

```javascript
/**
 * Maps UI Exit Type selections to Contact Quality values
 * Used by the in-game tracker to bridge user input to clutch calculations
 */
const EXIT_TYPE_TO_CONTACT_QUALITY = {
  // Exit types from UI dropdowns
  'Line Drive': 0.85,
  'Fly Ball': {
    // Modified by depth (inferred from direction + fielder catch location)
    'deep': 0.75,      // Warning track, wall
    'medium': 0.50,    // Normal outfield
    'shallow': 0.35    // Bloop territory
  },
  'Ground Ball': {
    // Modified by speed (can be inferred from result or user selection)
    'hard': 0.70,      // Through hole, eats up fielder
    'medium': 0.50,    // Routine
    'weak': 0.30       // Slow roller
  },
  'Popup': 0.10,       // Always weak
  'Bunt': 0.30         // Intentional weak contact
};

/**
 * Get Contact Quality from UI inputs
 * @param exitType - User-selected exit type from UI
 * @param trajectory - Additional context (depth, speed)
 * @param result - Play result (HR, out, etc.)
 */
function getContactQualityFromUI(exitType, trajectory, result) {
  // Home runs are always barrel-quality
  if (result === 'HR') return 1.0;

  // Simple exit types
  if (typeof EXIT_TYPE_TO_CONTACT_QUALITY[exitType] === 'number') {
    return EXIT_TYPE_TO_CONTACT_QUALITY[exitType];
  }

  // Complex exit types (need sub-category)
  const exitConfig = EXIT_TYPE_TO_CONTACT_QUALITY[exitType];
  if (exitConfig && trajectory?.depth) {
    return exitConfig[trajectory.depth] || exitConfig['medium'];
  }
  if (exitConfig && trajectory?.speed) {
    return exitConfig[trajectory.speed] || exitConfig['medium'];
  }

  // Default fallback
  return 0.50;
}

/**
 * Infer fly ball depth from context
 */
function inferFlyBallDepth(direction, fielderPosition, result) {
  // Deep: warning track catches, near-HR fly outs
  if (result === 'wall_catch' || result === 'warning_track') {
    return 'deep';
  }

  // Shallow: bloop singles, shallow fly outs
  if (result === 'bloop_single' || fielderPosition?.includes('shallow')) {
    return 'shallow';
  }

  // Default to medium
  return 'medium';
}

/**
 * Infer ground ball speed from context
 */
function inferGroundBallSpeed(result, fielderAction) {
  // Hard: through hole, infield hit on slow fielder
  if (result === 'single' && ['SS', '3B'].includes(fielderAction?.position)) {
    return 'hard';  // Beat the throw = hard contact
  }

  // Weak: slow roller, bunt-like
  if (fielderAction?.type === 'charge' || result === 'bunt_single') {
    return 'weak';
  }

  // Default to medium
  return 'medium';
}
```

### UI Integration Points

The in-game tracker provides these inputs that feed into CQ:

| UI Element | Maps To | CQ Inference |
|------------|---------|--------------|
| Result (HR) | `result === 'HR'` | CQ = 1.0 (always) |
| Exit Type dropdown | `exitType` | Primary CQ lookup |
| **Field Zone Tap** | `zoneId` | Depth from zone (see FIELD_ZONE_INPUT_SPEC.md) |
| Fielder (auto/override) | `fielderAction` | Used for depth/speed inference |
| Special play type | `playType` | Modifies inference (diving = likely hard) |

### Zone-Based Depth Integration

With the field zone input system (FIELD_ZONE_INPUT_SPEC.md), depth is automatically inferred from the tapped zone:

```javascript
// Import from FIELD_ZONE_INPUT_SPEC.md
import { getDepthFromZone, getCQTrajectoryFromZone } from './fieldZoneInput';

/**
 * Enhanced CQ calculation using zone tap
 */
function getContactQualityFromZoneTap(zoneId, exitType, result) {
  // Home runs always barrel
  if (result === 'HR') return 1.0;

  // Get trajectory info from zone
  const trajectory = getCQTrajectoryFromZone(zoneId, exitType);

  // Use standard CQ resolution
  return getContactQualityFromUI(exitType, trajectory, result);
}
```

| Zone Area | Fly Ball CQ | Ground Ball CQ |
|-----------|-------------|----------------|
| Infield (Z00-Z04) | 0.10-0.15 (popup) | 0.30-0.70 (varies) |
| Shallow OF (Z05-Z07) | 0.35 (weak) | 0.70 (through hole) |
| Deep OF (Z08-Z12) | 0.50 (medium) | 0.70 (through hole) |
| Wall (Z13-Z17) | 0.75 (deep/hard) | N/A |

### CQ Override UI (Optional)

For when user wants to manually adjust:

```
┌─────────────────────────────────────────────────────────────────┐
│  CONTACT QUALITY                                                │
│                                                                 │
│  [Default: Hard - based on line drive trajectory]               │
│                                                                 │
│  ○ Barrel (crushed it)                                          │
│  ● Hard (solid contact)        ← Current                        │
│  ○ Medium (normal)                                              │
│  ○ Weak (soft/lucky)                                            │
│  ○ Mishit (popup)                                               │
│                                                                 │
│  [Only shows on batted balls, defaults based on trajectory]     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Attribution by Play Type

### Key Variables

```javascript
const CQ = contactQuality;      // 0.1 to 1.0
const LI = Math.sqrt(leverageIndex);  // Dampened LI
```

### 4.1 Hits

| Scenario | Batter | Pitcher | Catcher | Fielder |
|----------|--------|---------|---------|---------|
| Home Run | +1.0 × CQ × LI | -1.0 × (1-CQ) × LI | -0.1 × LI | — |
| Line Drive Single | +1.0 × CQ × LI | -0.8 × (1-CQ) × LI | -0.1 × LI | — |
| Bloop Single | +0.5 × CQ × LI | -0.3 × (1-CQ) × LI | -0.05 × LI | — |
| Ground Ball Single | +0.8 × CQ × LI | -0.6 × (1-CQ) × LI | -0.05 × LI | — |
| Infield Single | +0.7 × LI | -0.2 × (1-CQ) × LI | — | -0.25 × armFactor × LI |
| Double | +1.0 × CQ × LI | -0.9 × (1-CQ) × LI | -0.1 × LI | -0.1 if misplay |
| Triple | +1.0 × CQ × LI | -0.8 × (1-CQ) × LI | -0.1 × LI | -0.3 × LI (arm/misplay) |
| Inside-the-Park HR | +1.2 × LI | -0.5 × LI | — | -0.5 × LI (misplay/arm) |
| Hit on Diving Attempt | +0.7 × CQ × LI | -0.5 × (1-CQ) × LI | — | +0.3 × LI (effort credit) |

### 4.2 Outs (Batted Balls)

| Scenario | Batter | Pitcher | Catcher | Fielder |
|----------|--------|---------|---------|---------|
| Routine Fly Out | -0.3 × (1-CQ) × LI | +0.4 × CQ × LI | +0.05 × LI | +0.1 × LI |
| Routine Ground Out | -0.3 × (1-CQ) × LI | +0.5 × CQ × LI | +0.05 × LI | +0.1 × LI |
| Line Drive Caught | -0.2 × CQ × LI | +0.2 × (1-CQ) × LI | +0.05 × LI | +0.5 × LI |
| Diving Catch | -0.1 × CQ × LI | +0.1 × LI | — | +0.8 × LI |
| Leaping Catch | -0.1 × CQ × LI | +0.1 × LI | — | +0.7 × LI |
| Wall Catch | -0.1 × CQ × LI | +0.15 × LI | — | +0.7 × LI |
| Robbed HR | 0 (was a HR!) | +0.3 × LI | — | +1.0 × LI |
| Popup (IF) | -0.4 × LI | +0.5 × LI | +0.1 × LI | +0.1 × LI |

### 4.3 Strikeouts and Walks

| Scenario | Batter | Pitcher | Catcher |
|----------|--------|---------|---------|
| K Swinging | -1.0 × LI | +1.0 × LI | +0.1 × LI |
| K Looking | -1.2 × LI | +0.9 × LI | +0.2 × LI |
| Walk (BB) | +0.5 × LI | -0.5 × LI | -0.1 × LI |
| Intentional Walk | 0 | 0 | 0 |
| HBP | +0.3 × LI | -0.35 × LI | -0.05 × LI |

**Note**: IBB has no skill component; manager evaluated on next batter outcome.

### 4.4 Errors

| Scenario | Batter | Pitcher | Fielder |
|----------|--------|---------|---------|
| Error on Routine Play | +0.3 × LI | 0 | -1.0 × LI |
| Error on Hard Grounder | +0.4 × CQ × LI | -0.15 × LI | -0.6 × LI |
| Error on Bad Hop (weak CQ) | +0.15 × LI | -0.15 × LI | 0 |
| Error on Bad Hop (hard CQ) | +0.5 × CQ × LI | -0.35 × LI | 0 |
| Throwing Error | +0.3 × LI | 0 | -0.8 × LI |
| Missed Diving Attempt | +0.4 × CQ × LI | -0.2 × LI | +0.2 × LI (effort!) |
| Missed Robbed HR Attempt | 0 | 0 | +0.15 × LI (effort!) |

### 4.5 Double Plays

| Scenario | Batter | Pitcher | Fielders | Notes |
|----------|--------|---------|----------|-------|
| GIDP (Routine) | -1.0 × (1-CQ) × LI | +0.7 × CQ × LI | +0.2 each × LI | 2-3 fielders |
| GIDP (Hard Grounder) | -0.7 × CQ × LI | +0.3 × LI | +0.4 each × LI | Credit fielders |
| GIDP (Line Drive) | -0.3 × CQ × LI | +0.15 × LI | +0.6 each × LI | Great play |
| DP Turned (non-GIDP) | — | +0.3 × LI | +0.4 each × LI | Runner out |

### 4.6 Baserunning

| Scenario | Runner | Pitcher | Catcher | Fielder | Manager |
|----------|--------|---------|---------|---------|---------|
| Stolen Base | +1.0 × LI | -0.2 × LI | -0.6 × LI | — | +0.3 × LI* |
| Caught Stealing | -1.0 × LI | +0.2 × LI | +0.7 × LI | — | -0.4 × LI* |
| Pickoff (Pitcher) | -0.8 × LI | +0.6 × LI | +0.2 × LI | +0.2 × LI (1B/2B) | — |
| Pickoff (Catcher) | -0.8 × LI | +0.1 × LI | +0.7 × LI | +0.2 × LI | — |
| 3 Pickoff Attempts | +0.2 × LI | -0.3 × LI | — | — | — |
| TOOTBLAN | -1.2 × LI | 0 | — | +0.5 × LI** | — |
| Extra Base Taken | +0.7 × LI | 0 | — | — | — |
| Thrown Out Advancing | -0.8 × LI | 0 | +0.2 × LI*** | +0.5 × LI (OF) | — |
| Tag Up Scores | +0.4 × LI | -0.4 × LI | — | -armBlame × LI | — |

\* Only if manager called the steal (see §6)
\*\* Credit to fielder(s) who made the play
\*\*\* Catcher only if throw went home

### 4.7 Sacrifice Plays

| Scenario | Batter | Pitcher | Fielder | Runner | Manager |
|----------|--------|---------|---------|--------|---------|
| Sac Fly Scores | +0.6 × LI | -0.4 × LI | -armBlame × LI | +0.4 × LI | +0.2 × LI* |
| Sac Bunt (successful) | +0.3 × LI | -0.2 × LI | — | — | +0.2 × LI* |
| Squeeze Scores | +0.7 × LI | -0.5 × LI | — | +0.4 × LI | +0.4 × LI* |
| Squeeze Failed | -0.4 × LI | +0.3 × LI | — | -0.3 × LI | -0.4 × LI* |
| Bunt for Hit | +0.5 × LI | -0.3 × LI | — | — | — |
| Failed Bunt Attempt | -0.3 × LI | +0.2 × LI | — | — | -0.2 × LI* |

\* Only if manager called the play

### 4.8 Wild Pitches and Passed Balls

| Scenario | Runner | Pitcher | Catcher |
|----------|--------|---------|---------|
| Wild Pitch (runner advances) | +0.2 × LI | -0.6 × LI | -0.2 × LI |
| Wild Pitch (run scores) | +0.3 × LI | -0.8 × LI | -0.3 × LI |
| Passed Ball (runner advances) | +0.2 × LI | 0 | -0.6 × LI |
| Passed Ball (run scores) | +0.3 × LI | 0 | -0.9 × LI |

### 4.9 Fielder's Choice

| Scenario | Batter | Pitcher | Fielder | Runner Out |
|----------|--------|---------|---------|------------|
| FC - Lead Runner Out | +0.2 × LI | +0.1 × LI | +0.3 × LI | -0.3 × LI |
| FC - Batter Out | -0.3 × LI | +0.3 × LI | +0.2 × LI | — |

---

## 5. Fielder Arm & Positioning

### Arm Strength Factor

When a fielder's arm matters (throws, relays, sac flies), use player's arm rating:

```javascript
function getArmFactor(playerArmRating) {
  // Convert 1-99 rating to 0-1 factor
  // 50 = average (factor 0.5)
  // 99 = elite (factor 1.0)
  // 1 = weak (factor 0.01)
  return playerArmRating / 100;
}
```

### Position-Based Defaults

If arm ratings unavailable, use position defaults:

```javascript
const POSITION_ARM_DEFAULTS = {
  'P': 0.35,
  'C': 0.70,
  '1B': 0.45,
  '2B': 0.60,
  'SS': 0.80,
  '3B': 0.80,
  'LF': 0.55,
  'CF': 0.65,
  'RF': 0.75
};
```

### Sac Fly Arm Blame

Outfielders are blamed based on whether the throw was "makeable":

```javascript
function getSacFlyArmBlame(position, depth, armFactor) {
  // Can this OF reasonably throw out the runner?
  const THROW_EXPECTATION = {
    'LF': { shallow: 0.20, medium: 0.05, deep: 0 },
    'CF': { shallow: 0.40, medium: 0.20, deep: 0.05 },
    'RF': { shallow: 0.60, medium: 0.40, deep: 0.15 }
  };

  const expectation = THROW_EXPECTATION[position]?.[depth] || 0;
  return -0.2 * expectation * armFactor;  // Negative = blame
}
```

### Infield Single Arm Blame

```javascript
function getInfieldSingleArmBlame(position, armFactor) {
  // SS and 3B have longer throws, more arm-dependent
  const THROW_DIFFICULTY = {
    'P': 0.20,
    'C': 0.50,
    '1B': 0.30,
    '2B': 0.50,
    'SS': 0.80,
    '3B': 0.85
  };

  const difficulty = THROW_DIFFICULTY[position] || 0.5;
  return -0.25 * difficulty * armFactor;
}
```

---

## 6. Manager Decision Inference

### Automatic Detection (No User Input Needed)

The engine auto-detects these manager decisions:

```javascript
const INFERRED_MANAGER_DECISIONS = {
  pitching_change: {
    trigger: 'Different pitcher than previous batter',
    detection: (prev, curr) => prev.pitcherId !== curr.pitcherId,
    evaluation: 'New pitcher performance for rest of appearance'
  },

  pinch_hitter: {
    trigger: 'Batter differs from expected lineup slot',
    detection: (expected, actual) => expected.batterId !== actual.batterId,
    evaluation: 'PH at-bat result'
  },

  pinch_runner: {
    trigger: 'Runner differs from who reached base',
    detection: (reachedBase, currentRunner) => reachedBase !== currentRunner,
    evaluation: 'PR scoring and advancement'
  },

  defensive_sub: {
    trigger: 'New fielder at position mid-game',
    detection: (prevInning, currInning) => /* position change */,
    evaluation: 'Defensive plays by substitute'
  },

  intentional_walk: {
    trigger: 'User selects IBB',
    detection: (result) => result === 'IBB',
    evaluation: 'Next batter outcome'
  }
};
```

### User-Prompted Decisions (Default: Player Autonomy)

These require user input; if not flagged, credit goes only to player:

```javascript
const USER_PROMPTED_DECISIONS = {
  steal_call: {
    prompt: 'Did manager send the runner?',
    default: false,  // Assume player decision
    affects: ['stolen_base', 'caught_stealing']
  },

  bunt_call: {
    prompt: 'Did manager call for bunt?',
    default: false,
    affects: ['sac_bunt', 'bunt_hit', 'failed_bunt']
  },

  squeeze_call: {
    prompt: 'Was this a squeeze play?',
    default: false,
    affects: ['squeeze_scores', 'squeeze_failed']
  },

  hit_and_run: {
    prompt: 'Was this a hit-and-run?',
    default: false,
    affects: ['hit_and_run_success', 'hit_and_run_failure']
  }
};
```

### Manager Credit/Blame Values

| Decision | Success | Failure |
|----------|---------|---------|
| Pitching Change | +0.4 × LI (escapes jam) | -0.3 × LI (gives up runs) |
| Leave Pitcher In | +0.2 × LI (escapes) | -0.4 × LI (gives up runs) |
| Pinch Hitter | +0.5 × LI (hit/walk) | -0.3 × LI (out), -0.5 × LI (K/GIDP) |
| Pinch Runner | +0.4 × LI (scores) | -0.4 × LI (out on bases) |
| Defensive Sub | +0.4 × LI (great play) | -0.3 × LI (error) |
| IBB | +0.3 × LI (next batter out) | -0.5 × LI (next batter scores run) |
| Steal Call | +0.3 × LI (SB) | -0.4 × LI (CS) |
| Bunt Call | +0.2 × LI (successful) | -0.4 × LI (failed/DP) |
| Squeeze Call | +0.6 × LI (scores) | -0.5 × LI (out) |
| Hit-and-Run | +0.3 × LI (success) | -0.4 × LI (runner out) |

---

## 7. Shift Tracking

### Default Assumption

No shift unless user indicates otherwise.

### Shift Toggle

```
┌─────────────────────────────────────────────────────────────────┐
│  DEFENSIVE POSITIONING                                          │
│                                                                 │
│  ● Standard                                                     │
│  ○ Shift On (pull-side overload)                                │
│                                                                 │
│  [Affects fielder expectation and manager credit]               │
└─────────────────────────────────────────────────────────────────┘
```

### Shift Impact on Attribution

```javascript
function applyShiftAdjustment(play, shiftOn) {
  if (!shiftOn) return play;

  // Shift changes "expected" outcome
  if (play.direction === 'pull' && play.trajectory === 'ground_ball') {
    // Shift helps on pull-side grounders
    if (play.result === 'out') {
      play.managerCredit += 0.2;  // Good call
    }
  } else if (play.direction === 'opposite') {
    // Shift hurts on opposite field
    if (play.result === 'hit') {
      play.managerBlame -= 0.3;  // Shift burned us
      play.fielderBlame = 0;     // Not fielder's fault - they were shifted
    }
  }

  return play;
}
```

---

## 8. Special SMB4 Rules

### Plays That DON'T Exist in SMB4

| Play | Status | Notes |
|------|--------|-------|
| Foul ball caught in stands | ❌ Not possible | Remove from consideration |
| Interference | ❌ Not possible | — |
| Obstruction | ❌ Not possible | — |
| Balk | ❌ Not possible | See 3 pickoff rule below |
| Fan interference | ❌ Not possible | — |
| Catcher interference | ❌ Not possible | — |

### 3 Pickoff Attempts Rule

In SMB4, if the pitcher throws to a base 3 times without picking off the runner, the runner advances automatically:

```javascript
const THREE_PICKOFF_RULE = {
  trigger: 'Third pickoff attempt to same base without out',
  result: 'Runner advances one base',
  attribution: {
    runner: +0.2,   // Patience rewarded
    pitcher: -0.3   // Forced the advance
  }
};
```

### Dropped Third Strike (D3K)

When a third strike is dropped and the batter runs:

```javascript
function getD3KAttribution(result, fielderInvolved, leverageIndex) {
  const LI = Math.sqrt(leverageIndex);

  if (result === 'runner_safe') {
    return {
      batter: +0.3 * LI,    // Hustle credit
      pitcher: +0.7 * LI,   // Still got the K
      catcher: -0.5 * LI,   // Dropped it
      fielder: fielderInvolved === '1B' ? -0.2 * LI : 0  // If throw was bad
    };
  } else {  // runner_out
    return {
      batter: -1.0 * LI,    // Still a K
      pitcher: +1.0 * LI,   // Got the K
      catcher: -0.1 * LI,   // Minor (still got out)
      fielder: fielderInvolved === '1B' ? +0.2 * LI : 0
    };
  }
}
```

### Ground Rule Double

```javascript
const GROUND_RULE_DOUBLE = {
  batter: (CQ, LI) => +0.8 * CQ * LI,  // Credit based on contact
  pitcher: (CQ, LI) => -0.7 * (1 - CQ) * LI,
  fielder: 0  // No blame - ball went over fence
};
```

---

## 9. Playoff Context Multipliers

### Why Playoffs Matter More

Playoff games inherently have higher stakes. A walk-off HR in the World Series should count more than one in April. We apply multipliers to ALL clutch values during postseason play.

### Playoff Multiplier Table

```javascript
const PLAYOFF_MULTIPLIERS = {
  // Regular season baseline
  regular_season: 1.0,

  // Playoff rounds
  wild_card: 1.25,
  division_series: 1.5,
  championship_series: 1.75,
  world_series: 2.0,

  // Special game situations
  elimination_game: 0.5,  // ADDITIONAL (stacks)
  clinch_game: 0.25       // ADDITIONAL (stacks)
};

/**
 * Get total playoff multiplier for a game
 */
function getPlayoffMultiplier(gameContext) {
  if (!gameContext.isPlayoff) return 1.0;

  let multiplier = PLAYOFF_MULTIPLIERS[gameContext.playoffRound] || 1.0;

  // Elimination games add +0.5x
  if (gameContext.isEliminationGame) {
    multiplier += PLAYOFF_MULTIPLIERS.elimination_game;
  }

  // Clinch games add +0.25x
  if (gameContext.isClinchGame) {
    multiplier += PLAYOFF_MULTIPLIERS.clinch_game;
  }

  return multiplier;
}
```

### Example Multiplier Calculations

| Game | Base | Elimination? | Clinch? | Total |
|------|------|--------------|---------|-------|
| Regular Season | 1.0× | — | — | **1.0×** |
| Wild Card Game | 1.25× | +0.5 (yes) | — | **1.75×** |
| NLDS Game 3 (down 2-0) | 1.5× | +0.5 (yes) | — | **2.0×** |
| NLDS Game 4 (up 2-1) | 1.5× | — | — | **1.5×** |
| NLDS Game 5 | 1.5× | +0.5 (yes) | — | **2.0×** |
| NLCS Game 7 | 1.75× | +0.5 (yes) | +0.25 (yes) | **2.5×** |
| World Series Game 4 (up 3-0) | 2.0× | — | +0.25 (yes) | **2.25×** |
| World Series Game 7 | 2.0× | +0.5 (yes) | +0.25 (yes) | **2.75×** |

### How Multiplier Applies

The playoff multiplier is applied AFTER the LI calculation:

```javascript
function calculateFinalClutchValue(baseValue, leverageIndex, gameContext) {
  const liAdjusted = baseValue * Math.sqrt(leverageIndex);
  const playoffMultiplier = getPlayoffMultiplier(gameContext);
  return liAdjusted * playoffMultiplier;
}

// Example: Walk-off HR in World Series Game 7, bases loaded, tie game
// baseValue = +3.0 (walk-off HR)
// LI = 10.8 (bases loaded, 9th, tie)
// sqrt(LI) = 3.29
// playoffMultiplier = 2.75
// Final: 3.0 × 3.29 × 2.75 = +27.1 clutch points (!!)
```

### Playoff Game Detection

```javascript
function getGamePlayoffContext(game) {
  if (!game.isPlayoff) {
    return { isPlayoff: false };
  }

  const series = game.playoffSeries;
  const winsNeeded = series.winsToAdvance;

  return {
    isPlayoff: true,
    playoffRound: series.round,  // 'wild_card', 'division_series', etc.

    // Elimination: If losing, one more loss ends season
    isEliminationGame: series.opponentWins === winsNeeded - 1,

    // Clinch: If winning, one more win advances
    isClinchGame: series.teamWins === winsNeeded - 1
  };
}
```

---

## 10. Net Clutch Rating

### Accumulation Formula

```javascript
function accumulateClutchEvent(playerStats, clutchValue, leverageIndex, gameContext) {
  // Apply playoff multiplier
  const playoffMultiplier = getPlayoffMultiplier(gameContext);
  const adjustedValue = clutchValue * playoffMultiplier;

  if (adjustedValue > 0) {
    playerStats.clutchPoints += adjustedValue;
    playerStats.clutchMoments += 1;
  } else if (adjustedValue < 0) {
    playerStats.chokePoints += Math.abs(adjustedValue);
    playerStats.chokeMoments += 1;
  }

  // Track LI exposure for confidence calculation
  playerStats.totalLIExposure += leverageIndex;
  if (leverageIndex > 1.5) {
    playerStats.highLeveragePAs += 1;
  }

  // Net clutch is the difference
  playerStats.netClutch = playerStats.clutchPoints - playerStats.chokePoints;
}
```

### Per-Player Season Stats

```typescript
interface PlayerClutchStats {
  // Accumulated values
  clutchPoints: number;
  chokePoints: number;
  netClutch: number;

  // Counts
  clutchMoments: number;
  chokeMoments: number;

  // Opportunity tracking
  totalLIExposure: number;      // Sum of LI across all PAs
  highLeveragePAs: number;      // Count of PAs where LI > 1.5

  // For confidence
  plateAppearances: number;

  // Playoff-specific
  playoffClutchPoints: number;  // Subset from playoff games
  playoffChokePoints: number;
}
```

### Net Clutch → All-Star Voting Integration

The **netClutch** score feeds directly into All-Star voting (Master Spec §8):

```javascript
/**
 * Normalize netClutch for All-Star voting
 * Voting formula: (warScaled × 0.50) + (clutchScaled × 0.30) + (narrativeScaled × 0.20)
 */
function getClutchVotingComponent(player, allPlayers) {
  // Get min/max netClutch among all eligible players
  const allNetClutch = allPlayers.map(p => p.clutchStats.netClutch);
  const minClutch = Math.min(...allNetClutch);
  const maxClutch = Math.max(...allNetClutch);

  // Scale to 0-100 range
  const clutchScaled = scaleToRange(
    player.clutchStats.netClutch,
    minClutch,
    maxClutch,
    0,
    100
  );

  // Apply 30% weight
  return clutchScaled * 0.30;
}

/**
 * Helper: Scale value to range
 */
function scaleToRange(value, min, max, targetMin = 0, targetMax = 100) {
  if (max === min) return targetMin;
  return ((value - min) / (max - min)) * (targetMax - targetMin) + targetMin;
}
```

### Example All-Star Vote Calculation

```javascript
// Player: Willie Mays
// WAR: 4.5 (best in league is 5.0)
// Net Clutch: +9.3 (best in league is +12.0, worst is -8.0)
// Narrative (Fame): 15 points (best is 20)

const maysVotes = {
  warScaled: (4.5 / 5.0) * 100 * 0.50,           // = 45.0
  clutchScaled: ((9.3 - (-8.0)) / (12.0 - (-8.0))) * 100 * 0.30,  // = 26.0
  narrativeScaled: (15 / 20) * 100 * 0.20,       // = 15.0
  total: 45.0 + 26.0 + 15.0                      // = 86.0 votes
};
```

### Clutch Rating Tiers (For Display)

```javascript
const CLUTCH_TIERS = {
  'Elite Clutch':    { min: 10.0, icon: '🔥🔥', color: 'gold' },
  'Clutch':          { min: 5.0,  icon: '🔥',   color: 'orange' },
  'Reliable':        { min: 1.0,  icon: '✓',    color: 'green' },
  'Average':         { min: -1.0, icon: '—',    color: 'gray' },
  'Shaky':           { min: -5.0, icon: '😰',   color: 'yellow' },
  'Choke Artist':    { min: -Infinity, icon: '💀', color: 'red' }
};

function getClutchTier(netClutch) {
  for (const [tier, config] of Object.entries(CLUTCH_TIERS)) {
    if (netClutch >= config.min) return { tier, ...config };
  }
}
```

---

## 11. Display Thresholds

### Minimum Opportunities

Don't display clutch rating until player has sufficient high-leverage exposure:

```javascript
const CLUTCH_DISPLAY_CONFIG = {
  // Minimum high-leverage PAs (LI > 1.5) to show rating
  minHighLeveragePAs: 10,

  // Alternative: minimum total LI exposure
  minTotalLIExposure: 15,

  // Confidence levels
  getConfidence: (highLevPAs) => {
    if (highLevPAs < 10) return 'insufficient';
    if (highLevPAs < 25) return 'low';
    if (highLevPAs < 50) return 'moderate';
    return 'high';
  },

  // Display logic
  shouldDisplay: (stats) => {
    return stats.highLeveragePAs >= 10 || stats.totalLIExposure >= 15;
  }
};
```

### UI Display

```
┌─────────────────────────────────────────────────────────────────┐
│  CLUTCH RATING                                                  │
│                                                                 │
│  Willie Mays         +9.3 🔥   (High confidence)                │
│  Brandon Crawford    +6.3      (Moderate confidence)            │
│  Mike Simmons        +1.3      (Low confidence - 12 HiLev PAs)  │
│  Gleyber Torres      -4.7 😰   (High confidence)                │
│  Austin Wells        —         (Insufficient opportunities)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Implementation Schema

### Play Attribution Record

```typescript
interface PlayAttribution {
  playId: string;
  gameId: string;
  inning: number;
  leverageIndex: number;
  contactQuality?: number;  // null for K/BB

  participants: {
    batter?: {
      playerId: string;
      clutchValue: number;
      skillFactor: number;
    };
    pitcher?: {
      playerId: string;
      clutchValue: number;
      skillFactor: number;
    };
    catcher?: {
      playerId: string;
      clutchValue: number;
      role: 'pitch_calling' | 'throw' | 'block' | 'tag';
    };
    fielders?: Array<{
      playerId: string;
      position: string;
      clutchValue: number;
      playType: 'routine' | 'diving' | 'leaping' | 'wall' | 'relay' | 'error';
    }>;
    runners?: Array<{
      playerId: string;
      clutchValue: number;
      action: 'scored' | 'advanced' | 'held' | 'out' | 'sb' | 'cs';
    }>;
    manager?: {
      managerId: string;
      clutchValue: number;
      decisionType: string;
    };
  };
}
```

### Manager Decision Record

```typescript
interface ManagerDecision {
  decisionId: string;
  gameId: string;
  managerId: string;

  decisionType:
    | 'pitching_change'
    | 'pinch_hitter'
    | 'pinch_runner'
    | 'defensive_sub'
    | 'ibb'
    | 'steal_call'
    | 'bunt_call'
    | 'squeeze_call'
    | 'hit_and_run'
    | 'shift';

  leverageIndex: number;
  inferred: boolean;  // Auto-detected vs user-prompted

  outcome: 'success' | 'failure' | 'neutral';
  clutchImpact: number;
}
```

---

## 13. Complete Attribution Tables

### Quick Reference: Batter

| Event | Base Value | CQ Modifier | Notes |
|-------|------------|-------------|-------|
| HR | +1.0 | × CQ | Full credit scales with contact |
| XBH | +1.0 | × CQ | |
| Single | +0.8 | × CQ | |
| Bloop | +0.5 | × CQ | Reduced - lucky |
| Infield hit | +0.7 | None | Speed play |
| K (swinging) | -1.0 | None | |
| K (looking) | -1.2 | None | Extra shame |
| BB | +0.5 | None | Plate discipline |
| HBP | +0.3 | None | Took one |
| Fly out | -0.3 | × (1-CQ) | Weak contact = more blame |
| Ground out | -0.3 | × (1-CQ) | |
| GIDP | -1.0 | × (1-CQ) | |
| Line out | -0.2 | × CQ | Reduced - hit it hard |
| Diving catch victim | -0.1 | × CQ | Reduced - fielder hero |
| Robbed HR | 0 | None | Was a HR! |

### Quick Reference: Pitcher

| Event | Base Value | CQ Modifier | Notes |
|-------|------------|-------------|-------|
| K | +1.0 | None | |
| K (looking) | +0.9 | None | |
| BB | -0.5 | None | |
| HBP | -0.35 | None | |
| HR allowed | -1.0 | × (1-CQ) | Hard contact = less blame |
| Hit allowed | -0.8 | × (1-CQ) | |
| Out recorded | +0.4 | × CQ | Weak contact = more credit |
| GIDP induced | +0.7 | × CQ | |
| WP | -0.6 to -0.8 | None | |

### Quick Reference: Fielder

| Event | Base Value | Notes |
|-------|------------|-------|
| Routine play | +0.1 | Minor credit |
| Diving catch | +0.8 | Hero |
| Leaping catch | +0.7 | Hero |
| Wall catch | +0.7 | Hero |
| Robbed HR | +1.0 | Superhero |
| Line drive snag | +0.5 | Great reflexes |
| Error (routine) | -1.0 | Full blame |
| Error (hard ball) | -0.6 | Partial - hard to handle |
| Error (bad hop) | 0 | No blame |
| Missed dive | +0.2 | Credit for effort |
| Missed robbery | +0.15 | Credit for effort |
| Outfield assist | +0.5 | Great throw |
| Relay assist | +0.3 | |
| Infield single allowed | -0.25 × arm | Arm-weighted |
| Sac fly (weak arm) | -0.1 to -0.2 | Based on throw expectation |

### Quick Reference: Catcher

| Event | Base Value | Notes |
|-------|------------|-------|
| K (swinging) | +0.1 | Pitch calling |
| K (looking) | +0.2 | Good frame/call |
| BB | -0.1 | Pitch calling |
| HBP | -0.05 | |
| CS (throw) | +0.7 | Great throw |
| SB allowed | -0.6 | |
| Pickoff (catcher throw) | +0.7 | |
| Passed ball | -0.6 to -0.9 | |
| WP | -0.2 to -0.3 | Should block |
| D3K (dropped) | -0.5 | |

### Quick Reference: Manager

| Decision | Success | Failure |
|----------|---------|---------|
| Pitching change | +0.4 | -0.3 |
| Leave pitcher in | +0.2 | -0.4 |
| Pinch hitter | +0.5 | -0.3 to -0.5 |
| Pinch runner | +0.4 | -0.4 |
| Defensive sub | +0.4 | -0.3 |
| IBB | +0.3 | -0.5 |
| Steal call | +0.3 | -0.4 |
| Bunt call | +0.2 | -0.4 |
| Squeeze | +0.6 | -0.5 |
| Hit-and-run | +0.3 | -0.4 |
| Shift (helps) | +0.2 | — |
| Shift (hurts) | — | -0.3 |

---

*Last Updated: January 22, 2026*
*Version: 1.2 - Added UI→CQ mapping, playoff multipliers, All-Star voting integration, zone-based input integration*
