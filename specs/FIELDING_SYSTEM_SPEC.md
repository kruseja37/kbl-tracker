# Fielding System Specification

> **Purpose**: Complete specification for fielding tracking, inferential logic, and integration with fWAR/Fame systems
> **Created**: January 21, 2025
> **Last Updated**: January 21, 2026
> **Status**: IMPLEMENTED - Core fielding flow complete, data persistence pending
>
> **Related Specs**:
> - `FWAR_CALCULATION_SPEC.md` - Detailed per-play run values, positional adjustments, complete fWAR formula
> - `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` Section 10 - EOS salary percentile integration

---

## Table of Contents

1. [Overview](#1-overview)
2. [User Input Flow](#2-user-input-flow)
3. [Spray Chart & Direction System](#3-spray-chart--direction-system)
4. [Fielder Inference Logic](#4-fielder-inference-logic)
5. [Catcher & Pitcher Fielding](#5-catcher--pitcher-fielding)
6. [Strikeout Putouts & Dropped Third Strike](#6-strikeout-putouts--dropped-third-strike)
7. [Foul Ball Handling](#7-foul-ball-handling)
8. [Hit Tracking (1B, 2B, 3B)](#8-hit-tracking-1b-2b-3b)
9. [Sacrifice Flies](#9-sacrifice-flies)
10. [Fielder's Choice](#10-fielders-choice)
11. [Assist Chain Tracking](#11-assist-chain-tracking)
12. [Star Plays & Exceptional Fielding](#12-star-plays--exceptional-fielding)
13. [SMB4-Specific Events](#13-smb4-specific-events)
14. [Infield Fly Rule](#14-infield-fly-rule)
15. [Ground Rule Double](#15-ground-rule-double)
16. [Shift Handling](#16-shift-handling)
17. [Adaptive Learning System](#17-adaptive-learning-system)
18. [Contextual UI Principles](#18-contextual-ui-principles)
19. [Data Schema](#19-data-schema)
20. [Integration Points](#20-integration-points)
21. [Appendix: MLB Research Summary](#appendix-mlb-research-summary)

---

## 1. Overview

### Purpose

Track complete fielding data for every play to support:
- **fWAR calculations** - Fielding value above replacement
- **Fame triggers** - Diving catches, robbed HRs, errors, outfield assists
- **Gold Glove tracking** - Position-specific fielding stats
- **Spray charts** - Visual representation of batted ball locations
- **Games at position** - For position detection and UTIL eligibility
- **Clutch tracking** - Pitcher comebackers, inning-ending plays

### Design Philosophy

1. **Minimize manual entry** - Infer the most likely fielder; user confirms or overrides
2. **Learn over time** - Track expected vs. actual to improve inference accuracy
3. **Capture exceptional plays** - Star plays and errors are narratively important
4. **Support assist chains** - Double plays and relay throws need full credit
5. **Track everything** - Putouts on strikeouts, fielding on base hits, all of it

---

## 1.1 Fielding Chance Logic (CRITICAL)

> **IMPORTANT**: This section defines when a fielder is credited with a fielding chance.
> A fielding chance affects fielding percentage calculations. Getting this wrong corrupts stats.

### Core Principle

**A fielding chance is recorded ONLY when a fielder attempts to make a play on the ball.**

### Decision Matrix

| Result | Fielding Attempt? | Fielding Chance? | UI Flow |
|--------|-------------------|------------------|---------|
| **Outs (GO, FO, LO, PO)** | Always yes | ✅ Yes | Fielding confirmation required |
| **Double Play (DP)** | Always yes | ✅ Yes | Fielding confirmation required |
| **Sac Fly (SF)** | Always yes | ✅ Yes | Fielding confirmation required |
| **Fielder's Choice (FC)** | Always yes | ✅ Yes | Fielding confirmation required |
| **Error (E)** | Always yes | ✅ Yes | Fielding confirmation required |
| **D3K** | Always yes | ✅ Yes | Fielding confirmation required |
| **Strikeout (K, KL)** | No batted ball | ❌ No | No fielding confirmation |
| **Walk (BB, IBB, HBP)** | No batted ball | ❌ No | No fielding confirmation |
| **Clean Hit (1B, 2B, 3B)** | No | ❌ No | Direct submit (default) |
| **Hit with Diving attempt** | User indicates | ✅ Yes | Fielding confirmation required |
| **Hit with Leaping attempt** | User indicates | ✅ Yes | Fielding confirmation required |
| **Clean HR** | No | ❌ No | Direct submit (default) |
| **HR with Robbery Attempt** | User indicates | ✅ Yes | Fielding confirmation required |

### Hits: The "Fielding Attempt?" Question

For hits (1B, 2B, 3B, HR), the UI shows a "FIELDING ATTEMPT?" section:

| Option | Meaning | Fielding Chance |
|--------|---------|-----------------|
| **Clean** (default) | Ball got through without a play attempt | ❌ No |
| **Diving** | Fielder dove but ball got through | ✅ Yes |
| **Leaping** | Fielder leaped but ball got through | ✅ Yes |
| **Running** | Fielder ran hard but couldn't get there | ✅ Yes |
| **Sliding** | Fielder slid but ball got through | ✅ Yes |
| **Over-shoulder** | Fielder tried over-shoulder catch | ✅ Yes |
| **Robbery Attempt** | Outfielder tried to rob HR | ✅ Yes |

**Default behavior**: "Clean" is auto-selected. User must explicitly choose a non-Clean option to indicate a fielding attempt was made.

### Implementation Reference

```typescript
// In AtBatFlow.tsx
const isHitResult = ['1B', '2B', '3B', 'HR'].includes(result);
const hitWithFieldingAttempt = isHitResult && specialPlay !== null && specialPlay !== 'Clean';
const needsFieldingConfirmation =
  (isOutOrErrorResult && !['K', 'KL'].includes(result)) || hitWithFieldingAttempt;
```

### Why This Matters

- **Fielding %** = (Putouts + Assists) / (Putouts + Assists + Errors)
- If we credit a fielder with a "chance" on a clean hit, their fielding % incorrectly drops
- Example: CF has no chance on a clean double to the gap - shouldn't affect his stats
- Example: CF dives and misses → that IS a fielding chance (even though it's a hit, not an error)

---

## 2. User Input Flow

### Current Inputs (Already Tracked)

| Input | Values | Notes |
|-------|--------|-------|
| At-bat result | GO, FO, LO, PO, 1B, 2B, 3B, HR, K, BB, etc. | Implies batted ball type |
| Direction | L, LC, C, RC, R | 5-zone spray direction (to be enhanced) |

### Batted Ball Type Mapping

| Result Code | Batted Ball Type | Fielder Pool |
|-------------|------------------|--------------|
| GO (Ground Out) | Ground Ball | Infielders (P, C, 1B, 2B, SS, 3B) |
| FO (Fly Out) | Fly Ball | Outfielders (LF, CF, RF), sometimes IF |
| LO (Line Out) | Line Drive | Any position |
| PO (Pop Out) | Pop Fly | Infielders primarily, OF has priority |
| DP (Double Play) | Ground Ball | Infielders (initiator varies) |
| SF (Sacrifice Fly) | Fly Ball | Outfielders |
| FC (Fielder's Choice) | Ground Ball | Infielders |
| 1B, 2B, 3B | Varies | Fielder who played the ball |
| HR | Fly Ball | No fielder (unless robbed or failed robbery) |
| E (Error) | Varies | Fielder who committed error |
| K (Strikeout) | N/A | Catcher gets putout |
| D3K (Dropped 3rd Strike) | N/A | Catcher assist, 1B putout (typically) |

### New Inputs Required

After user selects result + direction, the system:

1. **Infers primary fielder** (displayed as default)
2. **User confirms or changes fielder**
3. **If applicable**: User selects star play type or error type
4. **If applicable**: User confirms assist chain (for DP, relay throws)
5. **If applicable**: User notes SMB4-specific events (nutshot, comebacker injury)

---

## 3. Spray Chart & Direction System

### Current System (Testing Phase)

5 discrete zones: L, LC, C, RC, R

### Future System (UI/UX Phase)

Interactive spray chart allowing tap/click on visual baseball field:
- **Infield zones**: Finer granularity for ground balls
- **Outfield zones**: Depth + angle for fly balls
- **Foul territory**: Left foul, right foul areas

### Direction Categories (Enhanced)

| Code | Description | Fair/Foul | Typical Fielders |
|------|-------------|-----------|------------------|
| FL | Foul Left | Foul | 3B, LF, C |
| L | Left Field Line | Fair | 3B, LF |
| LC | Left-Center Gap | Fair | SS, LF, CF |
| C | Center | Fair | P, 2B, SS, CF |
| RC | Right-Center Gap | Fair | 2B, RF, CF |
| R | Right Field Line | Fair | 1B, RF |
| FR | Foul Right | Foul | 1B, RF, C |

### Depth Indicator (For Pop Flies & Fly Balls)

| Depth | Description | Primary Fielders |
|-------|-------------|------------------|
| Shallow | Near home plate / pitcher's mound | C, P |
| Infield | Standard infield depth | 1B, 2B, SS, 3B |
| Outfield Grass | Shallow outfield | OF or deep-playing IF |
| Deep | Warning track / wall | OF |

**Implementation**: Spray chart tap location determines both direction AND depth automatically.

---

## 4. Fielder Inference Logic

### Primary Inference Matrix

Based on batted ball type + direction, return the most likely fielder.

#### Ground Balls (GO, DP, FC)

| Direction | Primary | Secondary | Tertiary |
|-----------|---------|-----------|----------|
| FL (Foul Left) | C | 3B | P |
| L (Left) | 3B | SS | P |
| LC (Left-Center) | SS | 3B | 2B |
| C (Center) | P | SS | 2B |
| RC (Right-Center) | 2B | 1B | SS |
| R (Right) | 1B | 2B | P |
| FR (Foul Right) | C | 1B | P |

**Default probabilities (starting point):**
- Primary: 65%
- Secondary: 25%
- Tertiary: 10%

#### Fly Balls (FO, SF)

| Direction | Primary | Secondary | Tertiary |
|-----------|---------|-----------|----------|
| FL (Foul Left) | LF | 3B | C |
| L (Left) | LF | CF | 3B |
| LC (Left-Center) | CF | LF | SS |
| C (Center) | CF | - | - |
| RC (Right-Center) | CF | RF | 2B |
| R (Right) | RF | CF | 1B |
| FR (Foul Right) | RF | 1B | C |

**Note**: CF has priority on all catchable fair fly balls per MLB convention.

#### Line Drives (LO)

| Direction | Primary | Secondary | Notes |
|-----------|---------|-----------|-------|
| L (Left) | 3B | LF | Hot corner takes heat |
| LC (Left-Center) | SS | LF/CF | Hard to field |
| C (Center) | P | 2B/CF | Comebackers common |
| RC (Right-Center) | 2B | RF/CF | - |
| R (Right) | 1B | RF | - |

#### Pop Flies (PO)

| Direction + Depth | Primary | Secondary | Notes |
|-------------------|---------|-----------|-------|
| Any + Shallow | C | P | Near home plate |
| L + Infield | 3B | SS | - |
| LC + Infield | SS | 3B | SS has priority |
| C + Infield | SS | 2B | Middle infield |
| RC + Infield | 2B | 1B | - |
| R + Infield | 1B | 2B | - |
| Any + OF Grass | CF/LF/RF | SS/2B | OF calls off IF |

**Priority order for pop flies** (per MLB convention):
1. Center Fielder (calls off everyone)
2. Corner Outfielders (call off infielders)
3. Shortstop (highest infield priority)
4. Second Baseman
5. First Baseman / Third Baseman
6. Pitcher / Catcher (lowest)

---

## 5. Catcher & Pitcher Fielding

### Catcher Fielding Scenarios

| Scenario | Catcher Role | Putout/Assist |
|----------|--------------|---------------|
| Strikeout (normal) | Catches pitch | **Putout** |
| Dropped 3rd strike | Throws to 1B | **Assist** |
| Pop fly near home | Catches fly | **Putout** |
| Bunt near home | Fields, throws | **Assist** (or PO if tags) |
| Play at plate | Receives throw, tags | **Putout** |
| Passed ball (runner advances) | N/A | No fielding credit |
| Pickoff throw | Throws to base | **Assist** if out |

### Pitcher Fielding Scenarios

| Scenario | Pitcher Role | Putout/Assist | Fame/Clutch Impact |
|----------|--------------|---------------|-------------------|
| Comebacker (out) | Catches, throws to 1B | **Assist** | +1 Clutch if ends inning |
| Comebacker (caught for out) | Catches line drive | **Putout** | +1 Clutch if ends inning |
| Bunt fielded | Fields, throws | **Assist** | - |
| Covering 1B | Receives throw | **Putout** | - |
| Starts DP | Fields, throws to 2B | **Assist** | +1 Clutch (DP always clutch) |
| Pop fly | Catches pop | **Putout** | - |

**Clutch Trigger**: Pitcher fielding a comebacker to end an inning = +1 Clutch
**Clutch Trigger**: Pitcher starting a double play = +1 Clutch

---

## 6. Strikeout Putouts & Dropped Third Strike

### Every Strikeout = Catcher Putout

This is often overlooked but critical for accurate fielding stats:

| Strikeout Type | Catcher | Notes |
|----------------|---------|-------|
| K (swinging) | Putout | Normal strikeout |
| K (looking) | Putout | Called strike three |
| Foul tip strike 3 | Putout | Same as regular K |

**Implementation**: When result = K or KL, automatically credit catcher with putout. No user input needed.

### Dropped Third Strike (D3K) - Complete Scenarios

The D3K is a complex play with multiple possible outcomes. The ball may be fielded by the **Catcher (default)**, **Pitcher** (comeback near mound), or **Third Baseman** (ball deflected toward foul territory).

| Scenario | Batter Outcome | Fielder Credit | 1B Credit | Batter Stats | Event Type |
|----------|----------------|----------------|-----------|--------------|------------|
| D3K → thrown out at 1B | Out | Assist (C/P/3B) | Putout | K (strikeout) | Normal out |
| D3K → safe on Wild Pitch | Reaches 1B | - | - | K + WP | Wild Pitch |
| D3K → safe on Passed Ball | Reaches 1B | - | - | K + PB | Passed Ball |
| D3K → safe on Throwing Error | Reaches 1B | Error (C/P/3B) | - | K + E | Throwing Error |
| D3K → safe (1B error on catch) | Reaches 1B | Assist (C/P/3B) | Error | K + E | Fielding Error |

**Fielders Who Can Handle D3K:**
- **Catcher (C)** - Default, most common scenario
- **Pitcher (P)** - Ball deflects near mound, pitcher fields and throws to 1B
- **Third Baseman (3B)** - Ball deflects toward foul territory on third base side

**Key Points:**
- Batter ALWAYS gets credited with a strikeout, even when reaching safely
- When batter reaches safely, they are NOT credited with a stolen base
- The cause of reaching (WP, PB, or E) must be recorded
- WP is charged to pitcher, PB is charged to catcher (no error), E is an error

**UI Flow for D3K:**
1. User selects D3K as result
2. System asks: "Who fielded the ball?" → **[Catcher] [Pitcher] [3B]** (default: Catcher)
3. System asks: "Batter thrown out at first?"
4. If YES: Record fielder assist, 1B putout, K for batter
5. If NO: System asks: "What allowed batter to reach?"
   - Wild Pitch (charged to pitcher)
   - Passed Ball (charged to catcher, not an error)
   - Throwing Error by fielder
   - Fielding Error by 1B

---

## 7. Foul Ball Handling

### Foul Territory Zones

| Zone | Code | Primary Fielders | Priority |
|------|------|------------------|----------|
| Foul Left (near line) | FL-LINE | LF, 3B | LF has priority |
| Foul Left (near plate) | FL-HOME | C, 3B | C has priority |
| Foul Right (near line) | FR-LINE | RF, 1B | RF has priority |
| Foul Right (near plate) | FR-HOME | C, 1B | C has priority |
| Behind home plate | FOUL-BACK | C | C only |

### Foul Ball Inference

| Result + Zone | Primary | Secondary |
|---------------|---------|-----------|
| FO + FL-LINE | LF | 3B |
| FO + FL-HOME | C | 3B |
| PO + FL (any) | 3B | C |
| FO + FR-LINE | RF | 1B |
| FO + FR-HOME | C | 1B |
| PO + FR (any) | 1B | C |
| FO + FOUL-BACK | C | - |

**Note**: Foul pop flies in infield still follow infield priority (3B/1B before C typically), but catcher has priority for foul flies behind home plate.

---

## 8. Hit Tracking (1B, 2B, 3B)

### Why Track Fielding on Hits?

Even when the batter reaches base safely, we want to know:
- **Which fielder played the ball** (for spray charts)
- **Was there a throw** (for assist tracking, even if unsuccessful)
- **Was there an error** (reached on error vs. clean hit)

### Hit Fielding Data

| Hit Type | Direction | Primary Fielder | Notes |
|----------|-----------|-----------------|-------|
| 1B (ground) | L | 3B or SS | Fielded but couldn't throw in time |
| 1B (ground) | LC | SS | Through the hole |
| 1B (line) | C | P (touched) or CF | Line drive single |
| 2B (gap) | LC | LF or CF | Who retrieved it? |
| 2B (line) | R | RF | Off the wall |
| 3B (gap) | RC | RF or CF | Deep gap triple |

### Implementation

For all hits (1B, 2B, 3B), ask:
1. **Direction** (from spray chart)
2. **Fielder who played ball** (inferred, user confirms)
3. **Optional**: Did fielder make a throw? To which base?

This data feeds spray charts and helps track fielder range over time.

---

## 9. Sacrifice Flies

### SF = Fly Ball + Out + Run Scores

| Component | Tracking |
|-----------|----------|
| Fielder | Who caught the fly ball (usually OF) |
| Putout | Catching fielder |
| Assist | If throw involved, all fielders in chain |
| Run | Runner scores (RBI credited to batter) |

### SF Fielding Flow

1. Result = SF
2. Direction selected
3. System infers: Likely OF based on direction
4. User confirms fielder
5. System asks: "Throw to plate?" (for assist tracking)
6. If yes: OF gets assist, C gets putout on the catch (if tag play) or just the fly out putout

**Note**: SF putout goes to the fielder who caught the fly, NOT the catcher (unless there's a tag play at home on a second runner).

---

## 10. Fielder's Choice

### FC = Fielder Chose to Get Different Runner

| Data Point | Description |
|------------|-------------|
| Fielder | Who fielded the ball |
| Runner Out | Which base/runner was retired |
| Batter | Reaches (typically 1B) |
| Assist Chain | Fielder → base where out occurred |

### FC Tracking Flow

1. Result = FC
2. Direction selected
3. System infers fielder (same as GO logic)
4. User confirms fielder
5. System asks: "Out at which base?" (2B, 3B, Home)
6. System auto-determines assist chain based on base

### FC Assist Chains

| Out At | Typical Chain | Example |
|--------|---------------|---------|
| 2B | Fielder → 2B/SS covering | 6-4 (SS to 2B) |
| 3B | Fielder → 3B | 4-5 (2B to 3B) |
| Home | Fielder → C | 5-2 (3B to C) |

---

## 11. Assist Chain Tracking

### When Assists Apply

| Situation | Assist Chain | Example |
|-----------|--------------|---------|
| Ground out (not unassisted) | 1+ assists | SS → 1B = SS assist |
| Ground out to 1B (unassisted) | 0 assists | 1B fields, steps on base |
| Double play | 2 assists typical | SS → 2B → 1B |
| Outfield throw to base | 1-2 assists | RF → SS → 3B |
| Strikeout (dropped 3rd) | 1 assist | C → 1B |
| Sacrifice fly with throw | 1 assist | LF → C (tag at home) |
| Rundown | Multiple assists | Back-and-forth throws |

### Common Double Play Chains

| Code | Description | Positions |
|------|-------------|-----------|
| 6-4-3 | SS to 2B to 1B | SS (A), 2B (A), 1B (PO) |
| 4-6-3 | 2B to SS to 1B | 2B (A), SS (A), 1B (PO) |
| 5-4-3 | 3B to 2B to 1B | 3B (A), 2B (A), 1B (PO) |
| 1-6-3 | P to SS to 1B | P (A), SS (A), 1B (PO) |
| 6-3 | SS to 1B (no pivot) | SS (A), 1B (PO) |
| 4-3 | 2B to 1B (no pivot) | 2B (A), 1B (PO) |
| 3-6-3 | 1B to SS to 1B | 1B (A), SS (A), 1B (PO) |
| 5-3 | 3B to 1B | 3B (A), 1B (PO) |

### DP Inference by Direction

| Direction | Default DP Chain |
|-----------|------------------|
| L | 5-4-3 (3B starts) |
| LC | 6-4-3 (SS starts) - **most common** |
| C | 1-6-3 or 6-4-3 (comebacker or up middle) |
| RC | 4-6-3 (2B starts) |
| R | 3-6-3 (1B starts) |

### Relay Throw Logic (Outfield Assists)

For outfield assists:
1. Select outfielder who fielded
2. System asks: "Relay throw?"
3. If yes: Select relay man (SS for left side, 2B for right side typically)
4. Select base where runner was out
5. All fielders in chain receive assists

---

## 12. Star Plays & Exceptional Fielding

### Star Play Categories

> **Note**: fWAR values shown are for 48-game season. See FWAR_CALCULATION_SPEC.md for scaling by season length.

| Category | Description | Fame | fWAR (48g) | Clutch |
|----------|-------------|------|------------|--------|
| **Diving Catch** | Horizontal extension (2.5x multiplier) | +1 | +0.030 | - |
| **Leaping Catch** | Leaps to catch (2.0x multiplier) | +1 | +0.024 | - |
| **Wall Catch** | Catches at wall (2.5x multiplier) | +1 | +0.030 | - |
| **Running Catch** | Covered significant ground (1.5x) | - | +0.018 | - |
| **Sliding Catch** | Sliding catch in outfield (2.5x) | +1 | +0.030 | - |
| **Over-Shoulder Catch** | Over-the-shoulder catch (2.0x) | +1 | +0.024 | - |
| **Robbed HR** | Catch over wall, was HR (5.0x) | +2 | +0.078 | +1 |
| **Charging Play** | Charges slow roller | - | tracked | - |
| **Outfield Assist** | Throw results in out | +1 | +0.045 | +1 if key |
| **DP Turned** | Middle infielder pivot (+0.12 runs) | - | +0.041 | - |
| **Caught Comebacker** | Pitcher catches liner | - | +0.017 | +1 if ends inning |
| **Pitcher Starts DP** | 1-6-3 or 1-4-3 | - | +0.027 | +1 |

> **SMB4 Note**: Barehanded plays are not possible in SMB4 and are excluded from tracking.

### Error Categories

> **Note**: fWAR penalties shown are for 48-game season. See FWAR_CALCULATION_SPEC.md Section 8 for full context modifiers.

| Category | Description | Fame | fWAR (48g) | Notes |
|----------|-------------|------|------------|-------|
| **Fielding Error** | Bobble, drop, mishandle | -1 | -0.051 | Most common |
| **Throwing Error** | Wild throw | -1 | -0.068 | Charged to thrower |
| **Mental Error** | Wrong base, missed cutoff | -1 | -0.084 | **NEW**: Highest penalty |
| **Missed Catch (routine)** | Should have caught | -1 | -0.051 | Routine play blown |
| **Missed Dive** | Dove and missed | 0 | 0 | Good effort, no penalty |
| **Collision Error** | Two fielders collide | -1 each | -0.051 | Rare |
| **Failed HR Robbery** | Ball bounces off glove over wall | -1 | -0.078 | See SMB4-specific |

**Error Context Modifiers** (multiply base penalty):
- `allowedRun`: 1.5x penalty (error let a run score)
- `wasRoutine`: 1.2x penalty (should have been easy)
- `wasDifficult`: 0.7x penalty (tough play, reduced blame)

### Fame Trigger Summary (Fielding)

| Event | Fame Change |
|-------|-------------|
| Diving catch | +1 |
| Leaping catch | +1 |
| Wall catch | +1 |
| Sliding catch | +1 |
| Over-shoulder catch | +1 |
| Robbed HR | +2 |
| Outfield assist | +1 |
| Error allowing run | -1 |
| Multiple errors in game (2+) | -2 |
| Failed HR robbery (ball goes over) | -1 |

---

## 13. SMB4-Specific Events

### Comebacker Scenarios (Unique to SMB4)

| Event | Description | Impact |
|-------|-------------|--------|
| **Comebacker (normal)** | Pitcher fields, throws out batter | P gets assist, fWAR+ |
| **Comebacker (pitcher injured)** | Ball hits pitcher, knocks them out | Fitness hit (significant), may injure |
| **Comebacker (pitcher catches)** | Line drive caught | P gets putout, +Clutch if ends inning |

### Nutshot Event

**Description**: Ball hits pitcher in groin area. Unique SMB4 animation.

| Outcome | Description | Impact |
|---------|-------------|--------|
| **Nutshot + Out Made** | Another fielder (or pitcher) still makes play | Mojo hit to pitcher, fielding credit to whoever made play |
| **Nutshot + No Out** | Play not made | Mojo hit to pitcher, hit recorded |
| **Nutshot + Pitcher Makes Play** | Pitcher recovers, makes out | Mojo hit + fielding credit to P |

**Tracking**:
```javascript
{
  nutshotEvent: true,
  pitcherAffected: 'player-015',
  mojoImpact: -1,  // or whatever SMB4 uses
  fitnessImpact: 0,  // nutshot = mojo only, not fitness
  playStillMade: true,
  fielderWhoMadePlay: 'SS'  // could be P if pitcher recovered
}
```

### Failed Home Run Robbery

**Description**: Outfielder attempts to rob HR, ball bounces off glove and over fence.

| Scenario | Result | Impact |
|----------|--------|--------|
| Ball was catchable, player missed | HR (failed robbery) | -1 Fame to fielder |
| Ball was over fence regardless | HR | No Fame impact |

**User Flow**:
1. Result = HR
2. System asks: "Was there an attempted robbery?"
3. If yes: "Did ball bounce off fielder's glove?"
4. If yes: Record failed robbery, -1 Fame

**Tracking**:
```javascript
{
  atBatResult: 'HR',
  robberyAttempted: true,
  robberyFailed: true,
  fielderAttempting: 'CF',
  fameImpact: -1
}
```

### Pitcher Knocked Out of Game

When a comebacker injures the pitcher enough to remove them:

| Data Point | Value |
|------------|-------|
| Event Type | `pitcher_injured_comebacker` |
| Pitcher | Player ID |
| Fitness Impact | Significant (TBD based on SMB4 mechanics) |
| Pitching Line | Closed out (IP, K, BB, ER finalized) |
| Replacement | Triggers pitching change flow |

### Bad Hop

**Description**: Ball takes an unexpected bounce over a fielder, turning what should be a routine play into a hit or extra-base hit.

| Scenario | Result | Impact |
|----------|--------|--------|
| Routine GB hops over infielder | Hit (usually 1B) | No error charged, but tracked for analysis |
| Routine FB/GB hops over outfielder | Extra-base hit | No error charged, but tracked for analysis |
| Bad hop on throw | Could be hit or error | Depends on play |

**Why Track This:**
- Separates "unlucky" hits from legitimate hard-hit balls
- Important for 360-degree Moneyball-type analysis
- Helps identify field conditions or tendencies
- Does NOT affect fielder's error count (bad luck ≠ error)

**UI Flow:**
- Toggle available on any hit: "Bad hop?"
- Only appears contextually when result is a hit
- Optional - user can skip if not relevant

**Tracking**:
```javascript
{
  badHopEvent: true,
  fielderAffected: 'SS',
  expectedResult: 'GO',  // What should have happened
  actualResult: '1B',     // What did happen
  notes: 'Ball hit rock on infield'  // Optional
}
```

**Future Analytics:**
- Track bad hop frequency by stadium (field quality)
- Track bad hop frequency by fielder position
- Exclude bad hop plays from defensive metrics (optional toggle)

---

## 14. Infield Fly Rule

### What Is It?

The Infield Fly Rule (IFR) is called when:
- Fair fly ball (NOT a line drive or bunt)
- Can be caught with ordinary effort by an infielder
- Runners on 1st & 2nd OR bases loaded
- Less than 2 outs

**Effect**: Batter is automatically OUT, regardless of whether the ball is caught.

### SMB4 Behavior

SMB4 enforces the Infield Fly Rule. When IFR is called:
- Batter is out even if ball is dropped
- Runners may advance at their own risk (not forced)

### Tracking Requirements

| Scenario | Batter | Fielder | Notes |
|----------|--------|---------|-------|
| IFR called, ball caught | Out (PO) | Putout | Normal fly out |
| IFR called, ball dropped | Out (IFR) | No putout | Batter still out, no fielding credit |
| IFR called, ball dropped, runner tagged | Out (IFR) + runner out | No putout + putout on tag | Two outs possible |

### UI Flow

**When to show IFR toggle:**
- Result is PO or FO
- Runners on 1st & 2nd, OR bases loaded
- Less than 2 outs

**Toggle**: "Infield Fly Rule called?"

If YES:
- Ask: "Was the ball caught?"
- If caught: Normal PO to fielder
- If dropped: Batter out (IFR), no putout credited to fielder

**Tracking**:
```javascript
{
  infieldFlyRule: true,
  ballCaught: false,  // true if caught, false if dropped
  fielderPosition: 'SS',
  // If dropped, runners may have advanced - track separately
}
```

---

## 15. Ground Rule Double

### What Is It?

A ground rule double occurs when a fair ball bounces over the outfield wall (or into the stands). The batter is awarded second base, and all runners advance two bases from their position at the time of the pitch.

### Difference from Regular Double

| Type | How It Happens | Runner Advancement |
|------|----------------|-------------------|
| Regular 2B | Ball stays in play, batter runs to 2B | Runners advance based on play |
| Ground Rule 2B | Ball bounces out of play | Runners automatically advance 2 bases |

### Why Track Separately?

- **Spray chart accuracy**: Ball location is where it bounced over, not where it landed
- **Fielder analysis**: Fielder may have been in position but ball bounced out
- **Park factors**: Some parks have more GRDs due to wall height/distance
- **Hit quality**: GRD may indicate a hard-hit ball that "got away"

### UI Flow

**When to show GRD toggle:**
- Result is 2B

**Toggle**: "Ground rule double?"

If YES:
- Track which fielder was chasing (for spray chart)
- Track direction/location where ball bounced over
- Mark as GRD in database (affects park factor calculations)

**Tracking**:
```javascript
{
  groundRuleDouble: true,
  fielderChasing: 'RF',
  direction: 'R',
  bounceLocation: 'deep',  // or however we track depth
  wallSection: 'RF_corner'  // for park factor analysis
}
```

---

## 18. Contextual UI Principles

### Show Options Only When Relevant

To avoid overwhelming the user with buttons, show conditional UI elements:

| Element | Show When |
|---------|-----------|
| "Infield Fly Rule?" | PO/FO + R1&R2 or bases loaded + < 2 outs |
| "Ground Rule Double?" | Result = 2B |
| "Bad Hop?" | Result is a hit (1B, 2B, 3B) |
| "Nutshot?" | Direction = Center + ball in play |
| "Pitcher Injured?" | Direction = Center + comebacker scenario |
| "Robbery Attempt?" | Result = HR |
| "Throw to plate?" | SF result |

### Default Behavior

- All toggles default to OFF (unchecked)
- User only engages with them when the event actually happened
- Minimizes clicks for the 90% of plays that are routine

---

## 16. Shift Handling

### Shift Types

| Shift Type | Configuration | When Used |
|------------|---------------|-----------|
| **Standard** | Traditional alignment | Default |
| **Pull Shift** | 3 infielders on pull side | vs. extreme pull hitters |
| **No Shift** | Explicitly standard | Override for specific AB |

### How Shift Affects Inference

When shift is active, adjust fielder probabilities:

**Pull Shift vs. LHH:**

| Direction | Standard Primary | Shifted Primary |
|-----------|------------------|-----------------|
| L | 3B | (Hole - less likely) |
| LC | SS | 3B |
| C | SS | SS |
| RC | 2B | SS |
| R | 1B | 2B |

### Shift Tracking

```javascript
gameState.shift = {
  active: false,
  type: 'standard',  // 'standard', 'pull', 'custom'
  againstBatter: null
};
```

### User Flow

1. Before at-bat: User can toggle "Shift" button
2. System remembers shift state until changed
3. Inference adjusts based on configuration
4. User can always override fielder

---

## 17. Adaptive Learning System

### Core Concept

Track every inference vs. actual outcome. Over time, adjust probabilities based on real data.

### Data Points Tracked

```javascript
{
  battedBallType: 'GB',
  direction: 'LC',
  depth: 'infield',
  inferredFielder: 'SS',
  actualFielder: 'SS',
  wasOverridden: false,
  shiftActive: false,
  timestamp: '2025-01-21T...',
  gameId: 'game-001',
  batterId: 'player-042',
  pitcherId: 'player-015',
  stadiumId: 'stadium-001'  // For park factors
}
```

### Learning Applications

| System | What We Learn |
|--------|---------------|
| **Fielder Inference** | Actual fielder distributions by type/direction |
| **Park Factors** | HR distances by stadium |
| **Player Tendencies** | Pull rates, batted ball types by batter |
| **Fielder Range** | Which fielders make plays outside expected zones |

### Algorithm

```javascript
function updateInferenceProbabilities() {
  const groups = groupHistoricalData();

  for (const group of groups) {
    const counts = countFielderOccurrences(group);
    const total = group.length;

    // Update if sufficient sample size (n >= 20)
    if (total >= 20) {
      for (const [fielder, count] of Object.entries(counts)) {
        const newProbability = count / total;
        // Blend: 70% historical, 30% default
        INFERENCE_MATRIX[group.key][fielder] =
          0.7 * newProbability + 0.3 * DEFAULT_MATRIX[group.key][fielder];
      }
    }
  }
}
```

### Future Features

- Confidence indicators: "SS (85% confident)" vs. "SS (estimated)"
- Anomaly detection: Flag unusual patterns
- Per-player tendencies: "CF Jones has +15% range to LC"

---

## 19. Data Schema

### FieldingPlay Record

```typescript
interface FieldingPlay {
  id: string;
  gameId: string;
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';

  // At-bat context
  batterId: string;
  pitcherId: string;
  atBatResult: string;

  // Batted ball data
  battedBallType: 'GB' | 'FB' | 'LD' | 'PF' | 'NONE';
  direction: 'FL' | 'L' | 'LC' | 'C' | 'RC' | 'R' | 'FR' | null;
  depth: 'shallow' | 'infield' | 'outfield' | 'deep' | null;

  // Fielding data
  primaryFielder: string;
  primaryFielderId: string;

  // Play difficulty (affects fWAR multiplier - see FWAR_CALCULATION_SPEC.md Section 7)
  playType: 'routine' | 'diving' | 'leaping' | 'wall' | 'charging' |
            'running' | 'sliding' | 'over_shoulder' |
            'error' | 'robbed_hr' | 'failed_robbery';

  // Error classification (affects fWAR penalty - see FWAR_CALCULATION_SPEC.md Section 8)
  errorType?: 'fielding' | 'throwing' | 'mental' | 'missed_catch' | 'collision';

  // Error context modifiers (multiply base error penalty)
  errorContext?: {
    allowedRun: boolean;      // 1.5x penalty if true
    wasRoutine: boolean;      // 1.2x penalty if true
    wasDifficult: boolean;    // 0.7x penalty (reduced) if true
  };

  // Assist chain (with fWAR-relevant metadata)
  assists: Array<{
    position: string;
    playerId: string;
    assistType: 'infield' | 'outfield' | 'relay' | 'cutoff';
    targetBase?: '1B' | '2B' | '3B' | 'HOME';  // For outfield assists
  }>;
  putoutPosition: string;
  putoutPlayerId: string;

  // Double play role tracking (for fWAR credit assignment)
  dpRole?: 'started' | 'turned' | 'completed' | 'unassisted';  // See FWAR_CALCULATION_SPEC.md Section 5.3

  // Inference tracking
  inferredFielder: string;
  wasOverridden: boolean;

  // Context
  shiftActive: boolean;
  shiftType?: string;

  // SMB4-specific
  nutshotEvent: boolean;
  comebackerInjury: boolean;
  robberyAttempted: boolean;
  robberyFailed: boolean;

  // Edge case tracking
  infieldFlyRule: boolean;
  ifrBallCaught: boolean | null;  // Only relevant if infieldFlyRule = true
  groundRuleDouble: boolean;
  grdWallSection: string | null;  // 'LF_corner', 'CF', 'RF_line', etc.
  badHopEvent: boolean;
  badHopExpectedResult: string | null;  // 'GO', 'FO', etc. - what should have happened

  // D3K tracking
  d3kEvent: boolean;
  d3kOutcome: 'OUT' | 'WP' | 'PB' | 'E_CATCHER' | 'E_1B' | null;

  // Result
  outsRecorded: number;
  runnersOut: string[];

  timestamp: string;
}
```

### PlayerFieldingStats (Aggregated)

```typescript
interface PlayerFieldingStats {
  playerId: string;
  seasonId: string;

  byPosition: {
    [position: string]: {
      gamesPlayed: number;
      inningsPlayed: number;

      // Core stats
      putouts: number;
      assists: number;
      errors: number;
      fieldingPercentage: number;

      // Advanced
      doublePlaysParticipated: number;
      doublePlaysStarted: number;
      doublePlaysTurned: number;      // Pivot man credit
      doublePlaysCompleted: number;   // 1B completing DP
      totalChances: number;
      rangeFactor: number;

      // Star plays (difficulty-based)
      divingCatches: number;
      leapingCatches: number;         // Renamed from jumpingCatches
      wallCatches: number;
      runningCatches: number;         // NEW: Had to cover ground
      slidingCatches: number;         // NEW: Sliding catch
      overShoulderCatches: number;    // NEW: Over-the-shoulder catch
      robbedHRs: number;
      failedRobberies: number;
      outfieldAssists: number;
      outfieldAssistsToSecond: number;  // NEW: Target base breakdown
      outfieldAssistsToThird: number;   // NEW
      outfieldAssistsToHome: number;    // NEW

      // Error breakdown
      fieldingErrors: number;
      throwingErrors: number;
      mentalErrors: number;           // NEW: Wrong base, missed cutoff

      // Pitcher-specific
      comebackersCaught: number;
      comebackersFielded: number;

      // Catcher-specific (if C)
      strikeoutPutouts: number;
      passedBalls: number;
      catcherInterference: number;
    };
  };

  // Totals
  totalPutouts: number;
  totalAssists: number;
  totalErrors: number;
  overallFieldingPercentage: number;
}
```

---

## 20. Integration Points

### fWAR Calculation

> **See `FWAR_CALCULATION_SPEC.md` for complete per-play run values and formulas.**

Fielding data feeds into fWAR:
- Putouts by position (run value: +0.02 to +0.05 base)
- Assists by position (run value: +0.03 to +0.12 base)
- Errors (negative: -0.15 to -0.25 base)
- Star play multipliers (diving = 2.5x, robbed HR = 5.0x)
- Position modifiers (SS = 1.2x, 1B = 0.7x, etc.)
- Pitcher fielding (contributes to pWAR)

**Quick Reference**:
- 10 fielding runs = 1 fWAR
- Elite SS in 48 games: ~+0.5 fWAR
- Poor 1B in 48 games: ~-0.1 fWAR

### Fame System

| Event | Fame Change |
|-------|-------------|
| Diving catch | +1 |
| Leaping catch | +1 |
| Wall catch | +1 |
| Sliding catch | +1 |
| Over-shoulder catch | +1 |
| Robbed HR | +2 |
| Outfield assist | +1 |
| Error allowing run | -1 |
| Multiple errors (2+) | -2 |
| Failed HR robbery | -1 |

### Clutch System

| Event | Clutch Change |
|-------|---------------|
| Pitcher comebacker ends inning | +1 |
| Pitcher starts DP | +1 |
| Robbed HR | +1 |
| Key outfield assist | +1 |
| Error in clutch situation | +1 Choke |

### Gold Glove Tracking

End of season ranking by:
- fWAR at position (70%)
- LI-weighted clutch defensive plays (30%)

> **Note**: Gold Glove does NOT use Fame. Fame is for narrative/subjective awards
> (All-Star, MVP). Defensive excellence is measured by actual performance metrics.
> See fame_and_events_system.md for Fame system details.

### Position Detection

Track `gamesAtPosition` for:
- UTIL detection (3+ positions with threshold games)
- Gold Glove eligibility
- Primary position determination

---

## Appendix: MLB Research Summary

### Putout Distribution by Position (2012 MLB)

| Position | % of Putouts |
|----------|--------------|
| 1B | 31.9% |
| C | 28.3% |
| CF | 9.2% |
| RF | 7.2% |
| 2B | 6.8% |
| LF | 6.8% |
| SS | 5.5% |
| 3B | 2.4% |
| P | 2.0% |

**Note**: Catcher's high % includes all strikeout putouts.

### Double Play Frequency

- 6-4-3 (SS → 2B → 1B): ~27-28% of all DPs
- 4-6-3 (2B → SS → 1B): Second most common
- 98% of outs come from just 28 scoring combinations

### Batted Ball Distribution

| Type | % | Launch Angle |
|------|---|--------------|
| Ground Ball | 42-44% | < 5° |
| Line Drive | 20-21% | 5-25° |
| Fly Ball | 28-35% | 25-50° |
| Pop-up | 7-11% of FB | > 50° |

### Sources

- Baseball Savant (Statcast, OAA, spray charts)
- FanGraphs (UZR, DRS, batted ball stats)
- Baseball-Reference (historical data)
- MLB Official Rules

---

*End of Fielding System Specification*
