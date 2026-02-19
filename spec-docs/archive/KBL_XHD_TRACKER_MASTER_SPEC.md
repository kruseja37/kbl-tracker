# KBL XHD Tracker - Master Specification Document

## Table of Contents

1. [Overview](#1-overview)
2. [Season Setup](#2-season-setup)
3. [Team Management](#3-team-management)
4. [In-Game Tracking](#4-in-game-tracking)
5. [WAR Calculations](#5-war-calculations)
6. [Clutch/Choke System](#6-clutchchoke-system)
7. [Fame Bonus/Boner System](#7-fame-bonusboner-system)
8. [All-Star Voting](#8-all-star-voting)
9. [Awards System](#9-awards-system)
10. [End-of-Season Ratings Adjustments](#10-end-of-season-ratings-adjustments)
11. [Random Events](#11-random-events)
12. [Grade Tracking](#12-grade-tracking)
13. [Position Detection](#13-position-detection)
14. [Records & Milestones](#14-records--milestones)
15. [UI/UX Guidelines](#15-uiux-guidelines)
16. [Data Architecture](#16-data-architecture)

---

# 1. Overview

## Purpose

The KBL XHD Tracker is a comprehensive stat-tracking application for Super Mega Baseball 4 couch co-op franchise play. It tracks advanced statistics, calculates WAR, manages awards, handles end-of-season ratings adjustments, and provides a rich narrative layer through Fame and Random Events.

## Key Features

- Complete stat tracking for all players and teams
- WAR calculations (bWAR, pWAR, fWAR, rWAR, mWAR)
- Clutch/Choke performance tracking
- Fame Bonus/Boner narrative system
- All-Star voting at 60% of season
- Comprehensive awards with trait rewards
- End-of-season ratings adjustments based on WAR
- Random event system (auto-triggered throughout season)
- Multi-season franchise support
- iPad/touch optimized with laptop/desktop support

## Platform Support

| Device | Experience |
|--------|------------|
| **iPad/Tablet** | Primary - Touch-optimized, large buttons, swipe gestures |
| **Laptop/Desktop** | Full support - Keyboard shortcuts, hover states, mouse |
| **Phone** | Limited - Quick stat entry only |

---

# 2. Season Setup

## Season Setup Wizard (5 Steps)

### Step 1: League Configuration

```
┌─────────────────────────────────────────────────────────────────────┐
│  NEW SEASON SETUP                                      Step 1 of 5  │
├─────────────────────────────────────────────────────────────────────┤
│  Season Name: [KBL Season 3                                    ]    │
│  Games Per Team: [40] ▼    (Options: 20, 40, 60, 82, 100, 162)     │
│  Innings Per Game: [9] ▼                                            │
│  DH Rule: [○ NL (no DH)  ● AL (with DH)  ○ Universal DH]           │
│  Conference Structure: [● Single  ○ Two Conferences  ○ Divisions]  │
│  Playoff Teams: [4] ▼                                               │
│  Playoff Series Length: [Best of 5] ▼                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 2: Team Selection

- Select teams from master database (toggle on/off)
- Option to create new teams
- Teams not selected remain in database for future seasons

### Step 3: Roster Configuration

- **Option A**: Use existing rosters (teams keep current players)
- **Option B**: Conduct Fantasy Draft (snake draft from player pool)
- **Option C**: Partial (mix of existing + draft)
- Player pool management (all players in database, toggle active/inactive)

### Step 4: Schedule Generation

- Auto-generate balanced schedule
- Import from CSV
- Manual entry
- Preview and edit

### Step 5: Confirmation & Start

- Summary of all settings
- Random events auto-scheduled (20 hidden events)
- All-Star break set at 60% of games
- Archive previous season data
- Start season

## Scalable Thresholds

All position detection thresholds scale based on **Games Per Team** setting:

```javascript
function scaleThreshold(mlbThreshold, gamesPerTeam, mlbGames = 162) {
  return Math.round(mlbThreshold * (gamesPerTeam / mlbGames));
}
```

| Threshold | MLB (162) | 40 Games | 82 Games |
|-----------|-----------|----------|----------|
| SP Min Starts | 20 | 5 | 10 |
| SP/RP Min Starts | 10 | 2 | 5 |
| RP Min Relief Apps | 40 | 10 | 20 |
| CP Min Saves | 20 | 5 | 10 |
| UTIL Games/Position | 25 | 6 | 13 |
| TWO-WAY Min Pitch Games | 20 | 5 | 10 |
| TWO-WAY Min PA | 200 | 49 | 101 |

---

# 3. Team Management

## Team Page Features

Each team has a dedicated management page with tabs:

### ROSTER Tab

| Column | Description |
|--------|-------------|
| Position | Current defensive position |
| Player | Name |
| Grade | Current SMB grade (S through D) |
| Mojo | -3 to +3 (affects in-game performance) |
| Fitness | 0-100% (affects stamina/injury risk) |
| Actions | Edit button |

**Quick Actions:**
- Adjust Mojo (between games)
- Adjust Fitness (between games)
- Swap Positions (in lineup)

### STADIUM Tab

- View current home stadium
- Change stadium anytime (dropdown of all stadiums in database)

### MANAGER Tab

- View manager stats (mWAR, record, grade)
- Fire Manager option → triggers replacement flow
- Manager of the Year tracking

### STATS Tab

- Team batting/pitching stats
- Advanced metrics
- Standings comparison

### HISTORY Tab

- Season-by-season team records
- Historical rosters
- Championship banners

## Player Edit Modal

```
┌─────────────────────────────────────────────────────────┐
│  EDIT PLAYER - Junior Young Jr                          │
├─────────────────────────────────────────────────────────┤
│  MOJO: Current -1 → New: [0] ▼                          │
│  Reason: [Good game last night        ]                 │
│                                                         │
│  FITNESS: Current 75% → New: [80] %                     │
│  Reason: [Rest day                    ]                 │
│                                                         │
│                          [CANCEL]  [SAVE]               │
└─────────────────────────────────────────────────────────┘
```

---

# 4. In-Game Tracking

## Trackable Events

### Batting Events
- Hits (1B, 2B, 3B, HR)
- HR Distance
- RBIs, Runs, Walks, Strikeouts
- Stolen Bases, Caught Stealing
- Errors
- TOOTBLAN (Thrown Out On The Basepaths Like A Nincompoop)

### Pitching Events
- Innings Pitched
- Strikeouts, Walks, Hits Allowed
- Runs/Earned Runs
- Pitch Count (NP)
- Total Batters Faced (TBF)

### Special Events
- Walk-offs (+Fame, +Clutch)
- Clutch Plays / Chokes
- Star Plays
- Killed Pitchers (pitcher removed due to injury/fatigue caused by batter)
- Robbed HRs
- Errors in key situations
- Hit By Pitch
- Wild Pitches
- Passed Balls
- Pickoffs
- Caught Come-Backers
- Nut Shots

### Player of the Game (POG)
After each game, vote for:
- 1st POG (3 points)
- 2nd POG (2 points)
- 3rd POG (1 point)

## In-Game Position Swaps

Players can swap defensive positions mid-game without substitution (since SMB4 allows this):

```
┌─────────────────────────────────────────────────────────┐
│  IN-GAME POSITION SWAP                                  │
├─────────────────────────────────────────────────────────┤
│  Swap: [Barry Bonds ▼] ↔ [Amos Otis ▼]                 │
│         LF            ↔  CF                             │
│                                                         │
│  ⚠️ Position swap only - both players remain in game    │
│                          [CANCEL]  [SWAP]               │
└─────────────────────────────────────────────────────────┘
```

This affects:
- Games at position tracking
- fWAR calculations
- UTIL/Gold Glove eligibility

---

# 5. WAR Calculations

## WAR Components

| Component | What It Measures | Applies To |
|-----------|------------------|------------|
| **bWAR** | Batting value above replacement | All batters |
| **rWAR** | Baserunning value | All runners |
| **fWAR** | Fielding value | All fielders (not DH) |
| **pWAR** | Pitching value | All pitchers |
| **mWAR** | Manager value | Managers |

## Total WAR

```
Position Player WAR = bWAR + rWAR + fWAR
Pitcher WAR = pWAR + fWAR + bWAR (if batting) + rWAR (if running)
Two-Way WAR = All components
Manager WAR = mWAR
```

## WAR Calculation Details

*(Refer to Jester's Super Mega Baseball Reference for detailed formulas)*

Key inputs:
- wOBA, wRC+ for batting
- FIP, ERA- for pitching
- DRS (Defensive Runs Saved) for fielding
- BsR for baserunning

---

# 6. Clutch/Choke System

## Overview

Tracks performance in high-leverage situations. Clutch plays boost ratings; chokes penalize.

## Clutch Triggers (+Clutch)

| Situation | Clutch Value |
|-----------|--------------|
| Walk-off hit | +2 to +3 |
| Go-ahead RBI in 7th+ | +1 |
| Bases-loaded hit | +1 to +2 |
| Game-tying hit in 9th | +2 |
| Shutdown inning after team scores | +1 |
| Strikeout to end threat | +1 |

## Choke Triggers (+Choke)

| Situation | Choke Value |
|-----------|-------------|
| K with RISP, 2 outs | +1 |
| GIDP with RISP | +1 to +2 |
| Error allowing run | +1 to +2 |
| Blown save | +2 |
| Wild pitch/passed ball allowing run | +1 |
| TOOTBLAN | +1 |

## Clutch Score Calculation

```
Net Clutch = Clutch Points - Choke Points
Clutch Multiplier = Based on grade (higher grades get smaller multipliers)
Final Clutch Score = Net Clutch × Clutch Multiplier
```

---

# 7. Fame Bonus/Boner System

## Overview

Narrative/fan perception element affecting subjective awards (MVP, All-Star, etc.).

## Fame Bonus (+Fame) Triggers

| Category | Trigger | Fame Value |
|----------|---------|------------|
| **Walk-offs** | Walk-off single | +1 |
| | Walk-off HR | +2 to +3 |
| **Milestone** | 50th HR of career | +1 |
| | 100th HR | +2 |
| | 3000th hit | +3 |
| **Spectacular** | Grand slam | +1 |
| | Cycle | +2 |
| | Inside-the-park HR | +2 |
| | Robbing HR | +2 |
| **Pitching** | No-hitter | +3 |
| | Perfect game | +5 |
| | 20 K game | +2 |
| **Streaks** | 10+ game hit streak | +1 |
| | 20+ game hit streak | +2 |
| **Hustle** | Diving catch | +1 |
| | Outfield assist | +1 |

## Fame Boner (-Fame) Triggers

| Category | Trigger | Fame Value |
|----------|---------|------------|
| **Strikeouts** | 4+ K in game | -1 |
| | K on pitch way outside zone | -1 |
| **Errors** | Error allowing run | -1 |
| | Multiple errors in game | -2 |
| **Baserunning** | TOOTBLAN | -1 |
| | Picked off to end inning | -1 |
| **Pitching** | Giving up 10+ runs | -2 |
| | Walking in a run | -1 |
| **Embarrassing** | Struck out on intentional walk pitchout | -2 |
| | Thrown out at home by outfielder | -1 |

## Pre-Season Fame

| Player Type | Starting Fame |
|-------------|---------------|
| Legends (S-grade icons) | +3 |
| Hall of Famers | +2 |
| Current stars | +1 |
| Everyone else | 0 |

---

# 8. All-Star Voting

## Timing

All-Star break triggers at **60% of games played** in the season.

Example: 40-game season → All-Star break after Game 24.

## Voting Formula

```
Votes = (WAR × 0.50 + Clutch × 0.30 + Narrative × 0.20) × 10
```

Where:
- **WAR (50%)**: Total WAR through All-Star break
- **Clutch (30%)**: Net clutch score
- **Narrative (20%)**: Traditional stats, milestones, Fame

Multiply by 10 for display (larger whole numbers).

## Selection Rules

1. Top vote-getters at each position
2. Minimum team representation (at least 1 per team)
3. Pitchers selected by pWAR + pitcher-specific clutch
4. Reserves fill remaining roster spots

## All-Star Rewards

All-Stars receive a **randomized trait** (not ratings adjustment).

If player already has 2 traits, UI prompts for trait replacement:

```
┌─────────────────────────────────────────────────────────┐
│  TRAIT REPLACEMENT - Barry Bonds                        │
├─────────────────────────────────────────────────────────┤
│  Current Traits:                                        │
│  1. Power Hitter                                        │
│  2. Tough Out                                           │
│                                                         │
│  New All-Star Trait: Contact Specialist                 │
│                                                         │
│  Replace which trait?                                   │
│  ○ Power Hitter                                         │
│  ○ Tough Out                                            │
│  ○ Decline new trait                                    │
│                                                         │
│                          [CONFIRM]                      │
└─────────────────────────────────────────────────────────┘
```

---

# 9. Awards System

## Award Categories & Criteria

### MVP (Most Valuable Player)

| Factor | Weight |
|--------|--------|
| Total WAR | 40% |
| Clutch Score | 25% |
| Team Success | 15% |
| Traditional Stats | 10% |
| Fame (Narrative) | 10% |

**Reward:** +1 to all ratings (player chooses distribution within categories)

### Cy Young Award

| Factor | Weight |
|--------|--------|
| pWAR | 40% |
| FIP / True ERA | 25% |
| Clutch Score | 25% |
| Team Success | 5% |
| Fame (Narrative) | 5% |

*Note: No traditional stats (wins/losses) in calculation*

**Reward:** +1 to pitching ratings, random positive trait

### Gold Glove (by position)

| Factor | Weight |
|--------|--------|
| fWAR | 60% |
| Fielding % | 20% |
| Eye Test (Fame + Manual Override) | 20% |

**Positions:** C, 1B, 2B, 3B, SS, LF, CF, RF, UTIL, P

**Reward:** Random Fielding trait (Dive Wizard, Magic Hands, Cannon Arm, etc.)

### Silver Slugger (by position)

| Factor | Weight |
|--------|--------|
| bWAR | 50% |
| OPS+ / wRC+ | 30% |
| Clutch Hitting | 20% |

**Reward:** Random Batting trait (Power Hitter, Contact Specialist, etc.)

### Rookie of the Year

Same as MVP criteria, filtered to rookies only.

**Reward:** +5 to two ratings of choice, random trait

### Reliever of the Year

| Factor | Weight |
|--------|--------|
| pWAR (relief only) | 40% |
| Saves + Holds | 25% |
| Clutch Score | 25% |
| Fame | 10% |

**Reward:** Random pitching trait

### Manager of the Year

| Factor | Weight |
|--------|--------|
| mWAR | 50% |
| Team overperformance vs expectations | 30% |
| Playoff success | 20% |

**Reward:** +5 to manager's team bonus pool for EOS adjustments

### Kara Kawaguchi Award (Bench Player of the Year)

Awarded to best-performing bench player (not starting 50%+ of games).

| Factor | Weight |
|--------|--------|
| WAR | 40% |
| Clutch Score | 30% |
| Fame | 20% |
| Pinch-hit performance | 10% |

**Reward:** Pinch Perfect trait

### League Leaders

Statistical leaders receive trait bonuses:

| Category | Reward |
|----------|--------|
| HR Leader | +5 Power |
| AVG Leader | +5 Contact |
| SB Leader | +5 Speed |
| ERA Leader | +3 Accuracy |
| K Leader | +3 Velocity |
| Saves Leader | Utility trait |

---

# 10. End-of-Season Ratings Adjustments

## Overview

Players receive ratings adjustments based on their WAR performance compared to positional peers, weighted by their grade.

## The Formula

```
For each WAR component:
  1. Calculate peer median (same position)
  2. Difference = Player's WAR - Peer Median
  3. Raw Adjustment = Difference × Grade Factor
  4. Final Adjustment = Round to nearest whole number, cap at ±10
```

## WAR Component → Rating Category Mapping

| WAR Component | Applies To | Rating Categories | Cap |
|---------------|------------|-------------------|-----|
| **bWAR** | All batters | Power (L/R), Contact (L/R) | ±10 total |
| **rWAR** | All runners | Speed | ±10 |
| **fWAR** | All fielders | Fielding, Arm | ±10 total |
| **pWAR** | All pitchers | Velocity, Junk, Accuracy | ±10 total |

**DH Exception:** DHs have no fWAR; display "N/A" for fielding adjustment.

## Grade Factors (Asymmetric)

High-grade players: Small upside, large downside (expected to perform)
Low-grade players: Large upside, small downside (overperformance rewarded)

| Grade | Positive Factor | Negative Factor |
|-------|-----------------|-----------------|
| **S** | 0.10 | 2.50 |
| **A+** | 0.15 | 2.00 |
| **A** | 0.20 | 1.75 |
| **A-** | 0.30 | 1.50 |
| **B+** | 0.50 | 1.25 |
| **B** | 0.75 | 1.00 |
| **B-** | 1.00 | 0.85 |
| **C+** | 1.25 | 0.70 |
| **C** | 1.50 | 0.50 |
| **C-** | 1.75 | 0.35 |
| **D+** | 2.00 | 0.25 |
| **D** | 2.25 | 0.20 |

## Time-Weighted Grade Factors

If a player's grade changes mid-season (due to random events, All-Star traits, etc.), weight the factor by games played at each grade:

```javascript
function getTimeWeightedGradeFactor(player) {
  let weightedPositive = 0, weightedNegative = 0;
  const totalGames = player.gamesPlayed;

  for (const period of player.gradeHistory) {
    const gamesAtGrade = period.endGame - period.startGame + 1;
    const weight = gamesAtGrade / totalGames;
    weightedPositive += GRADE_FACTORS[period.grade].positive * weight;
    weightedNegative += GRADE_FACTORS[period.grade].negative * weight;
  }

  return { positive: weightedPositive, negative: weightedNegative };
}
```

## Position Peer Comparisons

Players are compared against others at the same detected position:

- **C, 1B, 2B, 3B, SS, LF, CF, RF, DH**: Compare within position
- **UTIL**: Merge with BENCH if <6 total
- **BENCH**: Merge with UTIL if <6 total
- **SP, SP/RP, RP, CP**: Compare within pitching role

### Minimum Pool Size

If fewer than 6 players at a position, merge with similar positions:

| Position | Merges With |
|----------|-------------|
| CP | RP |
| RP | CP |
| SP/RP | SP, RP |
| 1B | 3B |
| 3B | 1B |
| 2B | SS |
| SS | 2B |
| LF, CF, RF | Each other |
| UTIL | BENCH |
| BENCH | UTIL |

**Exception for Awards:** UTIL Gold Glove is valid even with 1 qualifier.

## Two-Way Player Comparisons

Two-way players get compared differently for each WAR component:

- **pWAR**: Compared against pitching peer group (SP, RP, etc.)
- **bWAR, rWAR, fWAR**: Compared against primary position (e.g., RF)

## Player Choice: Distribution

After calculating category adjustments, players choose how to distribute within each category:

```
Batting Adjustment: +6
├── Power (L): +1
├── Power (R): +2
├── Contact (L): +1
└── Contact (R): +2

Baserunning Adjustment: +3
└── Speed: +3 (auto-applied, only one rating)

Fielding Adjustment: +4
├── Fielding: +2
└── Arm: +2

Pitching Adjustment: -5
├── Velocity: -2
├── Junk: -2
└── Accuracy: -1
```

## Manager Adjustment System

### Manager Pool Calculation

```javascript
const BASE_POOL = 20;  // All managers start with ±20

function calculateManagerPool(manager) {
  const mwarDiff = manager.mWAR - leagueMedianMWAR;
  const factor = mwarDiff >= 0 ? gradeFactor.positive : gradeFactor.negative;
  const mwarBonus = Math.round(mwarDiff * factor * 5);
  const moyBonus = manager.isManagerOfYear ? 5 : 0;

  return BASE_POOL + mwarBonus + moyBonus;
}
```

### Manager Distribution Rules

1. Total distributed must equal pool (use it or lose it)
2. Max 50% to any single player
3. Can apply positive OR negative to any player
4. Can target any rating category
5. Negative pools must be distributed (poor managers penalize team)

---

# 11. Random Events

## Overview

~20 random events are scheduled (hidden) at season start, triggering automatically between games throughout the season.

## Event Categories

| # | Category | Description |
|---|----------|-------------|
| 1 | Random Trait | Add random trait (any) |
| 2 | Random Good Trait | Add random positive trait |
| 3 | Random Bad Trait | Add random negative trait |
| 4 | Random Secondary Position | Gain secondary position |
| 5 | Random Primary Position | Change primary position |
| 6 | Chosen Secondary Position | Player chooses new secondary |
| 7 | Down 10 in Random Category | -10 to random rating |
| 8 | Up 10 in Random Category | +10 to random rating |
| 9 | Change Personality | New chemistry personality |
| 10 | Change Stadium | Team gets new stadium |
| 11 | Random Batting Stance/Arm Angle | Cosmetic change |
| 12 | Trade | Player traded to random team |
| 13 | Injury | Player injured for X games |
| 14 | Hot Streak | Temporary +mojo |
| 15 | Cold Streak | Temporary -mojo |
| 16 | Contract Dispute | Player unhappy |
| 17 | Breakout | Young player gains ratings |
| 18 | Decline | Older player loses ratings |
| 19 | Manager Fired | Team's manager replaced |
| 20 | Call-Up | Minor leaguer joins team |

## Auto-Triggering System

```javascript
function scheduleSeasonEvents(totalGames, eventCount = 20) {
  const events = [];
  const minGap = Math.floor(totalGames / (eventCount + 2));

  for (let i = 0; i < eventCount; i++) {
    let gameNum;
    do {
      gameNum = Math.floor(Math.random() * totalGames) + 1;
    } while (events.some(e => Math.abs(e.game - gameNum) < minGap));

    events.push({
      game: gameNum,
      triggered: false,
      eventType: null,  // Determined when triggered
      targetPlayer: null
    });
  }

  return events.sort((a, b) => a.game - b.game);
}
```

## Event Flow

1. After completing a game, check if event is scheduled
2. If yes, show event notification
3. Roll for event type (1-20)
4. Roll for affected player/team
5. Apply event
6. **Check for grade change** (if ratings modified)
7. Log event in League News

---

# 12. Grade Tracking

## When to Update Grades

Grades must be confirmed/updated after any change that affects ratings:

- Random event (rating change, trait added)
- All-Star trait added
- End-of-season adjustments
- Any manual rating modification

## Grade Confirmation Flow

```
┌─────────────────────────────────────────────────────────┐
│  GRADE CHECK - Junior Young Jr                          │
├─────────────────────────────────────────────────────────┤
│  Recent Change: +10 Power (Random Event)                │
│                                                         │
│  Previous Grade: C+                                     │
│  Check new grade in SMB4 and enter below:               │
│                                                         │
│  New Grade: [B-] ▼                                      │
│                                                         │
│  ⚠️ Grade change affects:                               │
│  • MVP Weight Factor                                    │
│  • Clutch/Choke Multipliers                             │
│  • End-of-Season Adjustment Factors                     │
│                                                         │
│                          [CANCEL]  [CONFIRM]            │
└─────────────────────────────────────────────────────────┘
```

## Grade History Tracking

```javascript
player.gradeHistory = [
  { grade: 'C+', startGame: 1, endGame: 23 },
  { grade: 'B-', startGame: 24, endGame: 40 }  // Changed after random event
];
```

---

# 13. Position Detection

## Position Categories

| Category | Detection Criteria |
|----------|-------------------|
| **C** | Primary position = C, ≥50% of team games |
| **1B** | Primary position = 1B, ≥50% of team games |
| **2B** | Primary position = 2B, ≥50% of team games |
| **3B** | Primary position = 3B, ≥50% of team games |
| **SS** | Primary position = SS, ≥50% of team games |
| **LF** | Primary position = LF, ≥50% of team games |
| **CF** | Primary position = CF, ≥50% of team games |
| **RF** | Primary position = RF, ≥50% of team games |
| **DH** | Primary position = DH, ≥50% of team games |
| **UTIL** | 3+ positions, threshold games each, none >60% |
| **BENCH** | <50% of team games at primary position, not UTIL |
| **SP** | Threshold+ starts, starts > relief appearances |
| **SP/RP** | Threshold+ starts, relief ≥ 50% of starts |
| **RP** | Threshold+ relief appearances, <threshold saves |
| **CP** | Threshold+ saves |
| **TWO-WAY** | Threshold+ pitching games AND threshold+ PA |

## Threshold Values (40-Game Season)

| Threshold | Value |
|-----------|-------|
| SP Min Starts | 5 |
| SP/RP Min Starts | 2 |
| RP Min Relief Apps | 10 |
| CP Min Saves | 5 |
| UTIL Games/Position | 6 |
| TWO-WAY Min Pitch Games | 5 |
| TWO-WAY Min PA | 49 |
| Starter Min % | 50% |
| UTIL Max Single Position % | 60% |

## Primary Position Determination

Position with most games played (excluding 'P' for position players).

Tie-breaker: Alphabetical order (or user preference).

---

# 14. Records & Milestones

## Trackable Records

### Single Game
- Most HRs in a game
- Most RBIs in a game
- Most Ks (pitcher) in a game
- Longest HR distance
- Most pitches thrown

### Season
- Most HRs
- Highest AVG
- Most RBIs
- Most Wins (pitcher)
- Lowest ERA
- Most Saves

### Career
- Career HRs
- Career Hits
- Career RBIs
- Career Wins
- Career Saves
- Career WAR

### Milestones
- 50/100/200/300/400/500 HRs
- 1000/2000/3000 Hits
- 100/200/300 Wins
- 500/1000 Ks
- 100/200/300/400/500 Saves

## Maddux (SMB Version)

**Definition:** Complete game shutout under pitch threshold.

| Game Length | Pitch Threshold |
|-------------|-----------------|
| 9 innings | < 85 pitches |
| 7 innings | < 65 pitches |
| 6 innings | < 55 pitches |
| 5 innings | < 45 pitches |

Based on analysis: SMB averages **13.5 pitches/inning** vs MLB's 15.5-16.5.

---

# 15. UI/UX Guidelines

## Touch Optimization (iPad Primary)

- Minimum touch target: 44x44 points
- Generous padding around interactive elements
- Bottom navigation for primary actions (thumb-friendly)
- Swipe gestures for common actions

## Responsive Design

- Works in portrait and landscape
- Collapsible sidebars
- Adaptive layouts for different screen sizes

## Gesture Support

| Gesture | Action |
|---------|--------|
| Swipe left/right | Navigate between games |
| Pull down | Refresh |
| Long press | Context menu |
| Pinch | Zoom on stat tables |

## Keyboard Shortcuts (Desktop)

| Key | Action |
|-----|--------|
| N | Next game |
| P | Previous game |
| S | Save |
| E | End game |
| / | Search |

## Color Coding

- **Green**: Positive (clutch, fame bonus, positive adjustment)
- **Red**: Negative (choke, fame boner, negative adjustment)
- **Blue**: Informational
- **Gold**: Awards, achievements

---

# 16. Data Architecture

## Database Structure

```javascript
const appDatabase = {
  // ===== MASTER DATA (persists across seasons) =====
  players: [
    {
      id: 'player-001',
      name: 'Barry Bonds',
      positions: ['LF', 'RF'],
      bats: 'L', throws: 'L',
      ratings: { powerL: 95, powerR: 90, contact: 85, speed: 70, fielding: 75, arm: 80 },
      traits: ['Power Hitter', 'Tough Out'],
      careerStats: { /* aggregated */ },
      createdSeason: 1,
      isActive: true,
    },
    // ...
  ],

  teams: [
    {
      id: 'team-giants',
      name: 'Giants',
      stadium: 'Oracle Park',
      manager: 'manager-001',
      colors: { primary: '#FD5A1E', secondary: '#27251F' },
      isActive: true,
    },
    // ...
  ],

  stadiums: [
    { id: 'stadium-001', name: 'Oracle Park', dimensions: { /* ... */ } },
    // ...
  ],

  managers: [
    { id: 'manager-001', name: 'Joe Manager', grade: 'B+' },
    // ...
  ],

  // ===== SEASON-SPECIFIC DATA =====
  seasons: [
    {
      id: 'season-3',
      name: 'KBL Season 3',
      status: 'active',  // 'setup', 'active', 'playoffs', 'completed'

      config: {
        gamesPerTeam: 40,
        inningsPerGame: 9,
        dhRule: 'AL',
        playoffTeams: 4,
        playoffSeriesLength: 5,
      },

      // References to master data
      activeTeamIds: ['team-giants', 'team-yankees', /* ... */],

      // Rosters (player assignments for this season)
      rosters: {
        'team-giants': ['player-001', 'player-002', /* ... */],
        // ...
      },

      // Schedule
      schedule: [
        { gameId: 'game-001', away: 'team-yankees', home: 'team-giants', date: 1 },
        // ...
      ],

      // Game results
      games: [
        {
          gameId: 'game-001',
          status: 'completed',
          awayScore: 3, homeScore: 5,
          innings: 9,
          playerStats: { /* per-player stats */ },
          events: [ /* clutch, fame, etc. */ ],
        },
        // ...
      ],

      // Aggregated season stats
      playerSeasonStats: {
        'player-001': {
          gamesPlayed: 38,
          gamesAtPosition: { 'LF': 30, 'RF': 8 },
          batting: { ab: 150, h: 45, hr: 12, /* ... */ },
          pitching: null,
          war: { bWAR: 3.2, rWAR: 0.5, fWAR: 0.8 },
          clutch: { clutchPlays: 8, chokes: 2, netClutch: 6 },
          fame: { bonuses: 5, boners: 1, netFame: 4 },
          gradeHistory: [{ grade: 'A', startGame: 1, endGame: 40 }],
        },
        // ...
      },

      // Random events
      scheduledEvents: [
        { game: 5, triggered: true, eventType: 8, targetPlayer: 'player-001', result: '+10 Power' },
        { game: 12, triggered: false, eventType: null, targetPlayer: null },
        // ...
      ],

      // Awards (populated at end of season)
      awards: {
        mvp: 'player-001',
        cyYoung: 'player-015',
        roy: 'player-032',
        goldGlove: { C: 'player-005', '1B': 'player-008', /* ... */ },
        silverSlugger: { /* ... */ },
        // ...
      },
    },
    // Previous seasons archived here
  ],

  // ===== APP SETTINGS =====
  settings: {
    defaultInnings: 9,
    defaultDH: 'AL',
    theme: 'dark',
    // ...
  },
};
```

## Rookie Classification Logic

```javascript
function isRookie(player, currentSeason, allSeasons) {
  const isFirstSeason = allSeasons.filter(s => s.status === 'completed').length === 0;

  if (isFirstSeason) {
    // Season 1 rules
    if (player.rookieOverride !== undefined) return player.rookieOverride;
    if (player.age < 23 && !player.hasImportedCareerStats) return true;
    return false;
  }

  // Season 2+ rules: rookie if no stats in any previous completed season
  const previousSeasons = allSeasons.filter(s =>
    s.id !== currentSeason.id && s.status === 'completed'
  );

  return !previousSeasons.some(season =>
    season.playerSeasonStats[player.id]?.gamesPlayed > 0
  );
}
```

---

# Appendix A: SMB4 Traits Reference

## Batting Traits

| Trait | Effect |
|-------|--------|
| Power Hitter | Increased HR power |
| Contact Specialist | Increased contact |
| Tough Out | Better plate discipline |
| RBI Machine | Clutch with RISP |
| Speedster | Faster baserunning |

## Pitching Traits

| Trait | Effect |
|-------|--------|
| K Artist | More strikeouts |
| Control Freak | Better accuracy |
| Intimidator | Batters more tense |
| Rubber Arm | Less fatigue |
| Groundball Machine | More groundouts |

## Fielding Traits

| Trait | Effect |
|-------|--------|
| Dive Wizard | Better diving catches |
| Magic Hands | Better catch probability |
| Cannon Arm | Stronger throws |
| Utility | Can play multiple positions |
| Pinch Perfect | Better as substitute |

## Negative Traits

| Trait | Effect |
|-------|--------|
| Butter Fingers | More errors |
| Noodle Arm | Weaker throws |
| Wild Thrower | More throwing errors |
| Choker | Worse in clutch |

---

# Appendix B: Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Initial | Master spec consolidation |

---

*End of Master Specification Document*
