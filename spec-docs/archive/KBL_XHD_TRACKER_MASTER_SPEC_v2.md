# KBL XHD Tracker - Master Specification Document v2.0

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
17. [Undo & Reset Features](#17-undo--reset-features)

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
- Undo and Reset features with safeguards

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
+---------------------------------------------------------------------------+
|  NEW SEASON SETUP                                             Step 1 of 5  |
+---------------------------------------------------------------------------+
|  Season Name: [KBL Season 3                                           ]    |
|  Games Per Team: [40] v    (Options: 24, 32, 40, 48, 56, 81, 100, 162)    |
|  Innings Per Game: [9] v                                                   |
|  DH Rule: [O NL (no DH)  * AL (with DH)  O Universal DH]                  |
|  Conference Structure: [* Single  O Two Conferences  O Divisions]         |
|  Playoff Teams: [4] v                                                      |
|  Playoff Series Length: [Best of 5] v                                      |
+---------------------------------------------------------------------------+
```

**Game Count Options:** 24, 32, 40, 48, 56, 81, 100, 162

```javascript
const GAME_COUNT_OPTIONS = [24, 32, 40, 48, 56, 81, 100, 162];
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
| Fitness | Categorical (Hurt/Weak/Strained/Well/Fit/Juiced) |
| Actions | Edit button |

**Quick Actions:**
- Adjust Mojo (between games)
- Adjust Fitness (between games)
- Swap Positions (in lineup)

### STADIUM Tab

- View current home stadium
- Change stadium anytime (dropdown of all stadiums in database)
- **Stadium-specific stats tracking**

#### Stadium Stats to Track

**Batting Stats at Stadium:**
- AVG / OBP / SLG / OPS
- HR total and HR/game
- Runs scored per game

**Pitching Stats at Stadium:**
- ERA
- WHIP
- HR allowed per game

**Park Factors:**
- Run Factor (vs league average)
- HR Factor
- Hit Factor

**Notable Events at Stadium:**
- Longest HR hit
- No-hitters/Perfect games thrown
- Walk-off wins
- Biggest blowouts

```
+---------------------------------------------------------------------------+
|  STADIUM - Oracle Park                                                     |
+---------------------------------------------------------------------------+
|  PARK FACTORS (vs League Avg)                                              |
|  * Runs: 0.92 (pitcher-friendly)                                           |
|  * HR: 0.85 (suppresses HR)                                                |
|  * Hits: 0.97                                                              |
|                                                                            |
|  BATTING AT THIS PARK          PITCHING AT THIS PARK                       |
|  AVG: .258                     ERA: 3.45                                   |
|  HR: 45 (1.1/game)             WHIP: 1.21                                  |
|  Runs/Game: 4.2                K/9: 8.5                                    |
|                                                                            |
|  NOTABLE MOMENTS                                                           |
|  * Longest HR: 465 ft (Barry Bonds, Game 23)                               |
|  * Walk-off wins: 3                                                        |
|  * No-hitters: 1 (Tom Seaver, Game 31)                                     |
+---------------------------------------------------------------------------+
```

### MANAGER Tab

- View manager stats (mWAR, record, grade)
- Fire Manager option -> triggers replacement flow
- Manager of the Year tracking

### STATS Tab

- Team batting/pitching stats
- Advanced metrics
- Standings comparison

### HISTORY Tab

- Season-by-season team records
- Historical rosters
- Championship banners

## Fitness System (Categorical)

Fitness is **categorical**, not a percentage slider:

| State | Value | Effect |
|-------|-------|--------|
| **Hurt** | 0% | Cannot play, on IL |
| **Weak** | 20% | Significant penalties |
| **Strained** | 40% | Moderate penalties |
| **Well** | 80% | Minor penalties |
| **Fit** | 100% | Normal performance |
| **Juiced** | 120% | Performance boost |

```javascript
const FITNESS_STATES = {
  HURT: { value: 0, label: 'Hurt', effect: 'Cannot play' },
  WEAK: { value: 20, label: 'Weak', effect: 'Significant penalties' },
  STRAINED: { value: 40, label: 'Strained', effect: 'Moderate penalties' },
  WELL: { value: 80, label: 'Well', effect: 'Minor penalties' },
  FIT: { value: 100, label: 'Fit', effect: 'Normal performance' },
  JUICED: { value: 120, label: 'Juiced', effect: 'Performance boost' },
};
```

### Fitness UI

```
+---------------------------------------------------------+
|  FITNESS - Junior Young Jr                               |
+---------------------------------------------------------+
|  Current: Strained (40%)                                 |
|                                                          |
|  Select new Fitness state:                               |
|  O Hurt (0%) - Cannot play                               |
|  O Weak (20%)                                            |
|  O Strained (40%) <- Current                             |
|  * Well (80%)                                            |
|  O Fit (100%)                                            |
|  O Juiced (120%)                                         |
|                                                          |
|  Reason: [Rest day, feeling better    ]                  |
|                          [CANCEL]  [SAVE]                |
+---------------------------------------------------------+
```

## Player Edit Modal

```
+---------------------------------------------------------+
|  EDIT PLAYER - Junior Young Jr                           |
+---------------------------------------------------------+
|  MOJO: Current -1 -> New: [0] v                          |
|  Reason: [Good game last night        ]                  |
|                                                          |
|  FITNESS: [Well] v                                       |
|  Reason: [Rest day                    ]                  |
|                                                          |
|                          [CANCEL]  [SAVE]                |
+---------------------------------------------------------+
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
- GIDP (Grounded Into Double Play)
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

**App-calculated for fun/tracking only - no stat impact.**

The app auto-calculates POG based on game performance:

```javascript
function calculatePOGScore(playerGameStats) {
  let score = 0;

  // Batting contributions
  score += playerGameStats.hits * 1;
  score += playerGameStats.doubles * 0.5;
  score += playerGameStats.triples * 1;
  score += playerGameStats.homeRuns * 2;
  score += playerGameStats.rbi * 1;
  score += playerGameStats.runs * 0.5;
  score += playerGameStats.walks * 0.3;
  score += playerGameStats.stolenBases * 0.5;
  score -= playerGameStats.strikeouts * 0.2;
  score -= playerGameStats.errors * 1;

  // Pitching contributions
  score += playerGameStats.inningsPitched * 0.5;
  score += playerGameStats.strikeoutsPitching * 0.3;
  score -= playerGameStats.earnedRuns * 1;
  score += playerGameStats.win ? 1 : 0;
  score += playerGameStats.save ? 1.5 : 0;

  // Clutch bonus
  score += playerGameStats.clutchPlays * 1;
  score += playerGameStats.walkOffs * 3;

  return score;
}
```

**Display:**
```
+---------------------------------------------------------+
|  PLAYERS OF THE GAME                                     |
+---------------------------------------------------------+
|  1st: Barry Bonds - 3-4, HR, 4 RBI                       |
|  2nd: Tom Seaver - 7 IP, 10 K, 1 ER                      |
|  3rd: Ozzie Smith - 2-3, diving catch                    |
+---------------------------------------------------------+
```

**Tracking:**
- Season POG leader (most 1st place finishes)
- Career POG totals
- No additional stat bonuses (already captured in WAR, Clutch, etc.)

## In-Game Position Swaps

Players can swap defensive positions mid-game without substitution (since SMB4 allows this):

```
+---------------------------------------------------------+
|  IN-GAME POSITION SWAP                                   |
+---------------------------------------------------------+
|  Swap: [Barry Bonds v] <-> [Amos Otis v]                 |
|         LF             <->  CF                           |
|                                                          |
|  Warning: Position swap only - both players remain in game|
|                          [CANCEL]  [SWAP]                |
+---------------------------------------------------------+
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

## CLUTCH Triggers (Positive)

### Walk-Off Situations
| Trigger | Clutch Value |
|---------|--------------|
| Walk-off single | +2 |
| Walk-off XBH (2B/3B) | +2 |
| Walk-off HR | +3 |
| Walk-off walk/HBP | +1 |
| Walk-off wild pitch/passed ball (pitcher/catcher gets choke) | +0 (runner) |
| Walk-off error (fielder gets choke) | +0 (batter) |

### Situational Hitting
| Trigger | Clutch Value |
|---------|--------------|
| Go-ahead RBI in 7th inning or later | +1 |
| Game-tying RBI in 9th inning or later | +2 |
| 2-out RBI (any inning) | +1 |
| Bases loaded hit (any result) | +1 |
| Grand slam | +2 |
| RBI with 2 outs and RISP | +1 |
| Hit in 3-0 or 3-1 count | +1 |
| Hit on 0-2 count | +1 |

### Pitching Clutch
| Trigger | Clutch Value |
|---------|--------------|
| Strikeout to end inning with RISP | +1 |
| Strikeout to end inning with bases loaded | +2 |
| Getting out of bases-loaded jam (0 runs) | +2 |
| Shutdown inning after team scores 3+ runs | +1 |
| Scoreless relief appearance (2+ IP) | +1 |
| Save conversion | +1 |
| Hold | +1 |
| Picking off runner to end inning | +2 |
| Complete game | +1 |
| Shutout | +2 |
| No-hitter | +3 |
| Perfect game | +4 |

### Defensive Clutch
| Trigger | Clutch Value |
|---------|--------------|
| Caught stealing to end inning | +1 |
| Outfield assist (throw out runner) | +1 |
| Double play turned with RISP | +1 |
| Diving/leaping catch to save run(s) | +1 |
| Robbed home run | +2 |
| Pickoff | +1 |

### Baserunning Clutch
| Trigger | Clutch Value |
|---------|--------------|
| Stolen base leading to run scored | +1 |
| Taking extra base that leads to run | +1 |
| Tag-up from 3rd on shallow fly | +1 |

## CHOKE Triggers (Negative)

### Batting Chokes
| Trigger | Choke Value |
|---------|-------------|
| Strikeout with RISP | +1 |
| Strikeout with bases loaded | +2 |
| GIDP with RISP | +1 |
| GIDP with bases loaded | +2 |
| Called 3rd strike with RISP | +1 (additional) |
| Pop-up with RISP, less than 2 outs | +1 |
| 0-fer game with 4+ at-bats | +1 |
| Golden sombrero (4+ K in game) | +1 |

### Pitching Chokes
| Trigger | Choke Value |
|---------|-------------|
| Blown save | +2 |
| Giving up go-ahead run in 7th+ | +1 |
| Giving up game-tying run in 9th+ | +2 |
| Walking in a run | +1 |
| Wild pitch allowing run | +1 |
| Balk allowing run | +1 |
| Giving up grand slam | +2 |
| Hit batter that forces in run | +1 |
| Giving up 3+ runs in an inning | +1 |
| Giving up 5+ runs in an inning | +2 |

### Defensive Chokes
| Trigger | Choke Value |
|---------|-------------|
| Error allowing run | +1 |
| Error allowing 2+ runs | +2 |
| Error on routine play | +1 |
| Passed ball allowing run | +1 |
| Missed catch on diving/leaping attempt | +1 |
| Throwing error allowing extra base | +1 |
| Catcher interference | +1 |
| Fielder's choice when out at home was available | +1 |

### Baserunning Chokes
| Trigger | Choke Value |
|---------|-------------|
| TOOTBLAN (thrown out on basepaths) | +1 |
| Caught stealing to end inning | +1 |
| Picked off with 2 outs | +1 |
| Picked off to end inning | +2 |
| Out at home on tag-up | +1 |
| Missing sign (running into out) | +1 |

## Clutch Score Calculation

```
Net Clutch = Clutch Points - Choke Points
Clutch Multiplier = Based on grade (higher grades get smaller multipliers)
Final Clutch Score = Net Clutch x Clutch Multiplier
```

---

# 7. Fame Bonus/Boner System

## Overview

Narrative/fan perception element affecting subjective awards (MVP, All-Star, etc.).

## Pre-Season Fame Assignment

| Criteria | Fame Value | Examples |
|----------|------------|----------|
| **S-Grade (Legend)** | +3 | Babe Ruth, Willie Mays |
| **A+ Grade with HOF status** | +2 | Mike Trout, Ken Griffey Jr |
| **A Grade (Star)** | +1 | Current stars, former all-stars |
| **B+ Grade or lower** | 0 | Regular players |
| **Known fan favorites** | +1 | Cult heroes, beloved players |
| **Known villains/controversial** | -1 | Dirty players, scandals |
| **Rookie (first season)** | 0 | No reputation yet |

```javascript
function assignPreSeasonFame(player) {
  let fame = 0;

  // Grade-based
  if (player.grade === 'S') fame += 3;
  else if (player.grade === 'A+') fame += 2;
  else if (player.grade === 'A') fame += 1;

  // Override flags (manual settings)
  if (player.isHallOfFamer) fame = Math.max(fame, 2);
  if (player.isFanFavorite) fame += 1;
  if (player.isControversial) fame -= 1;

  return fame;
}
```

### UI for Pre-Season Fame

```
+---------------------------------------------------------------------------+
|  PRE-SEASON FAME ASSIGNMENT                                                |
+---------------------------------------------------------------------------+
|  Auto-assigned based on grade:                                             |
|  * S-Grade players: +3 Fame (5 players)                                    |
|  * A+ Grade players: +2 Fame (12 players)                                  |
|  * A Grade players: +1 Fame (28 players)                                   |
|                                                                            |
|  Manual Overrides:                                                         |
|  [+ ADD OVERRIDE]                                                          |
|                                                                            |
|  | Player          | Grade | Auto | Override | Final |                    |
|  +-----------------+-------+------+----------+-------+                    |
|  | Babe Ruth       | S     | +3   | -        | +3    |                    |
|  | Pete Rose       | A     | +1   | -1       | 0     | [Edit]             |
|  | Moonlight Graham| C     | 0    | +1       | +1    | [Edit]             |
|                                                                            |
|                                    [RESET ALL]  [CONFIRM]                  |
+---------------------------------------------------------------------------+
```

## Fame Bonus (+Fame) Triggers

| Category | Trigger | Fame Value |
|----------|---------|------------|
| **Walk-offs** | Walk-off single | +1 |
| | Walk-off HR | +2 to +3 |
| **Spectacular** | Grand slam | +1 |
| | Cycle | +2 |
| | Inside-the-park HR | +2 |
| | Robbing HR | +2 |
| **Pitching** | No-hitter | +3 |
| | Perfect game | +5 |
| | 15+ K game | +2 |
| **Streaks** | 10+ game hit streak | +1 |
| | 20+ game hit streak | +2 |
| **Hustle** | Diving catch | +1 |
| | Outfield assist | +1 |

## Fame Boner (-Fame) Triggers

| Category | Trigger | Fame Value |
|----------|---------|------------|
| **Strikeouts** | 4+ K in game (Golden Sombrero) | -1 |
| | K on pitch way outside zone | -1 |
| **Errors** | Error allowing run | -1 |
| | Multiple errors in game | -2 |
| **Baserunning** | TOOTBLAN | -1 |
| | Picked off to end inning | -1 |
| **Pitching** | Giving up 10+ runs | -2 |
| | Walking in a run | -1 |
| **Embarrassing** | Struck out on intentional walk pitchout | -2 |
| | Thrown out at home by outfielder | -1 |

---

# 8. All-Star Voting

## Timing

All-Star break triggers at **60% of games played** in the season.

Example: 40-game season -> All-Star break after Game 24.

## Voting Formula

```
Votes = (WAR x 0.50 + Clutch x 0.30 + Narrative x 0.20) x 10
```

Where:
- **WAR (50%)**: Total WAR through All-Star break
- **Clutch (30%)**: Net clutch score
- **Narrative (20%)**: Fame + Milestones (NOT traditional stats - those are already in WAR)

```javascript
function calculateNarrativeScore(player) {
  let score = 0;

  // Current Fame (including pre-season and earned)
  score += player.currentFame * 2;  // Weight fame heavily

  // Seasonal milestones hit (count positive, subtract negative)
  score += player.seasonMilestonesPositive * 1;
  score -= player.seasonMilestonesNegative * 0.5;

  return score;
}
```

## Pitcher All-Star Voting

**SAME FORMULA** for pitchers:

```
Votes = (pWAR x 0.50 + Clutch x 0.30 + Narrative x 0.20) x 10
```

Pitchers use pWAR instead of total WAR, but same weights for Clutch and Narrative.

## Selection Rules

1. Top vote-getters at each position
2. Minimum team representation (at least 1 per team)
3. Pitchers selected by pWAR + pitcher-specific clutch
4. Reserves fill remaining roster spots

## All-Star Rewards

All-Stars receive a **randomized trait** (70% positive, 30% negative).

If player already has 2 traits, UI prompts for trait replacement:

```
+---------------------------------------------------------+
|  TRAIT REPLACEMENT - Barry Bonds                         |
+---------------------------------------------------------+
|  Current Traits:                                         |
|  1. RBI Hero                                             |
|  2. Tough Out                                            |
|                                                          |
|  New All-Star Trait: Choker                              |
|                                                          |
|  Replace which trait?                                    |
|  O RBI Hero                                              |
|  O Tough Out                                             |
|  O Decline new trait                                     |
|                                                          |
|                          [CONFIRM]                       |
+---------------------------------------------------------+
```

---

# 9. Awards System

## Award Categories & Criteria

### MVP (Most Valuable Player)

| Factor | Weight | Description |
|--------|--------|-------------|
| Total WAR | 50% | bWAR + rWAR + fWAR |
| Clutch Score | 25% | Net clutch performance |
| Narrative | 20% | Fame + Milestones |
| Team Success | 5% | Playoff position/wins |

**Reward:**
- +5 to one rating category of player's choice
- +3 to a second rating category
- Random trait (70% positive, 30% negative)

---

### Cy Young Award

| Factor | Weight |
|--------|--------|
| pWAR | 50% |
| FIP / True ERA | 25% |
| Clutch Score | 20% |
| Narrative (Fame + Milestones) | 5% |

**NO traditional stats (wins/losses).**

**Reward:**
- +5 to one pitching rating (VEL/JNK/ACC)
- +3 to another pitching rating
- Random trait (70% positive, 30% negative)

---

### Gold Glove (by position)

| Factor | Weight |
|--------|--------|
| fWAR | 60% |
| Fielding % | 20% |
| Eye Test (Fame + Manual Override +/-5) | 20% |

**Positions:** C, 1B, 2B, 3B, SS, LF, CF, RF, UTIL, P

**Reward:**
- **+5 to Fielding rating**
- **+3 to Arm rating**
- (NOT a trait - direct stat bonus)

---

### Silver Slugger (by position)

| Factor | Weight |
|--------|--------|
| bWAR | 60% |
| OPS+ / wRC+ | 25% |
| Clutch Hitting | 15% |

*Note: Clutch hitting already factors into bWAR partially, but we give extra weight here.*

**Reward:**
- +5 to Contact OR Power (player's choice)
- +3 to the other (Contact or Power)
- Random trait (70% positive, 30% negative)

---

### Rookie of the Year

Same as MVP criteria, filtered to rookies only.

**Reward:**
- +5 to two rating categories of choice
- Random trait (70% positive, 30% negative)

---

### Reliever of the Year

| Factor | Weight |
|--------|--------|
| pWAR (relief appearances only) | 50% |
| Clutch Score | 35% |
| Narrative (Fame + Milestones) | 15% |

**NOTE:** Saves and Holds are NOT separately counted - they're already reflected in Clutch Score and Fame.

**Reward:**
- +5 to one pitching rating
- +3 to another pitching rating
- Random trait (70% positive, 30% negative)

---

### Manager of the Year

| Factor | Weight |
|--------|--------|
| mWAR | 60% |
| Team overperformance vs preseason expectation | 40% |

**NO playoff success** (regular season award).

**Reward:**
- +5 to manager's team bonus pool for EOS adjustments

---

### Kara Kawaguchi Award

**This is NOT "Bench Player of the Year"** - it's specifically for **consistent performance despite low grade**.

**Criteria:**
- Player must be **C+ grade or lower**
- Measures consistency of overperformance vs grade expectation

| Factor | Weight |
|--------|--------|
| WAR vs Grade-Expected WAR | 50% |
| Clutch Score | 30% |
| Games without negative mojo | 20% |

**Reward:**
- +5 to one rating category
- "Clutch" trait (if doesn't have it)

---

### Bench Player of the Year (SEPARATE AWARD)

**Criteria:**
- Player started <50% of team games
- Measures impact in limited playing time

| Factor | Weight |
|--------|--------|
| WAR per game played | 40% |
| Pinch-hit performance | 30% |
| Clutch Score | 30% |

**Reward:**
- +3 to one rating category
- "Pinch Perfect" trait

---

### League Leaders Rewards

| Category | Reward |
|----------|--------|
| HR Leader | +5 Power (L and R) |
| AVG Leader | +5 Contact (L and R) |
| RBI Leader | +3 Power, +2 Contact |
| SB Leader | +5 Speed |
| ERA Leader (min IP) | +3 Accuracy, +2 Junk |
| K Leader | +3 Velocity, +2 Junk |
| Saves Leader | +3 Velocity, +2 Accuracy |
| WAR Leader (overall) | +3 to any two ratings |
| Wins Leader | +2 to any pitching rating |

---

## Trait Randomization

When randomly assigning a trait (All-Stars, awards, events):

```javascript
function randomizeTrait(player, awardType) {
  const isPositive = Math.random() < 0.70;  // 70% positive, 30% negative

  const traitPool = isPositive
    ? getPositiveTraitsForAward(awardType)
    : getNegativeTraitsForCategory(awardType);

  // Filter out traits player already has
  const available = traitPool.filter(t => !player.traits.includes(t));

  // Randomly select
  return available[Math.floor(Math.random() * available.length)];
}
```

This applies to:
- All-Star selections
- Award winners
- Random events

---

# 10. End-of-Season Ratings Adjustments

## Overview

Players receive ratings adjustments based on their WAR performance compared to positional peers, weighted by their grade.

## The Formula

```
For each WAR component:
  1. Calculate peer median (same position)
  2. Difference = Player's WAR - Peer Median
  3. Raw Adjustment = Difference x Grade Factor
  4. Final Adjustment = Round to nearest whole number, cap at +/-10
```

## WAR Component -> Rating Category Mapping

| WAR Component | Applies To | Rating Categories | Cap |
|---------------|------------|-------------------|-----|
| **bWAR** | All batters | Power (L/R), Contact (L/R) | +/-10 total |
| **rWAR** | All runners | Speed | +/-10 |
| **fWAR** | All fielders | Fielding, Arm | +/-10 total |
| **pWAR** | All pitchers | Velocity, Junk, Accuracy | +/-10 total |

**DH Exception:** DHs have no fWAR; display "N/A" for fielding adjustment.

## Grade Factors (Asymmetric) - REVISED

High-grade players: Small upside, large downside (expected to perform)
Low-grade players: Large upside, small downside (overperformance rewarded)

**Increased ~5x from original to produce meaningful adjustments (80% of players between -5 and +5):**

| Grade | Positive Factor | Negative Factor |
|-------|-----------------|-----------------|
| **S** | 0.5 | 5.0 |
| **A+** | 0.75 | 4.0 |
| **A** | 1.0 | 3.5 |
| **A-** | 1.5 | 3.0 |
| **B+** | 2.0 | 2.5 |
| **B** | 2.5 | 2.0 |
| **B-** | 3.0 | 1.5 |
| **C+** | 3.5 | 1.0 |
| **C** | 4.0 | 0.75 |
| **C-** | 4.5 | 0.5 |
| **D+** | 5.0 | 0.4 |
| **D** | 5.5 | 0.3 |

```javascript
const GRADE_FACTORS = {
  'S':  { positive: 0.5, negative: 5.0 },
  'A+': { positive: 0.75, negative: 4.0 },
  'A':  { positive: 1.0, negative: 3.5 },
  'A-': { positive: 1.5, negative: 3.0 },
  'B+': { positive: 2.0, negative: 2.5 },
  'B':  { positive: 2.5, negative: 2.0 },
  'B-': { positive: 3.0, negative: 1.5 },
  'C+': { positive: 3.5, negative: 1.0 },
  'C':  { positive: 4.0, negative: 0.75 },
  'C-': { positive: 4.5, negative: 0.5 },
  'D+': { positive: 5.0, negative: 0.4 },
  'D':  { positive: 5.5, negative: 0.3 },
};
```

### Sample Analysis with Revised Factors

| Player | WAR Diff | Grade | Factor | Raw Adj | Rounded |
|--------|----------|-------|--------|---------|---------|
| Star CF | +2.0 | A- | 1.5 | +3.0 | +3 |
| Average SS | +0.2 | B | 2.5 | +0.5 | +1 |
| Scrub 1B | +1.0 | C | 4.0 | +4.0 | +4 |
| Bad Pitcher | -2.0 | B | 2.0 | -4.0 | -4 |
| Legend | +1.3 | S | 0.5 | +0.65 | +1 |
| Legend Bad | -1.0 | S | 5.0 | -5.0 | -5 |

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
+-- Power (L): +1
+-- Power (R): +2
+-- Contact (L): +1
+-- Contact (R): +2

Baserunning Adjustment: +3
+-- Speed: +3 (auto-applied, only one rating)

Fielding Adjustment: +4
+-- Fielding: +2
+-- Arm: +2

Pitching Adjustment: -5
+-- Velocity: -2
+-- Junk: -2
+-- Accuracy: -1
```

## Manager Adjustment System

### Manager Pool Calculation

```javascript
const BASE_POOL = 20;  // All managers start with +/-20

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

## Event Categories (20 Events)

| # | Category | Description |
|---|----------|-------------|
| 1 | Random Trait (any) | Add random trait (70% positive, 30% negative) |
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
| 14 | Hot Streak | +5/+5 ratings for 10 games |
| 15 | Cold Streak | -5/-5 ratings for 10 games |
| 16 | Veteran Mentor | Young player gets +3 to one rating |
| 17 | Rivalry Ignited | Two players become rivals (+2 Fame vs each other) |
| 18 | Fan Favorite | +2 Fame immediately, +1 Fame per milestone rest of season |
| 19 | Media Villain | -2 Fame immediately, extra Fame Boner scrutiny |
| 20 | Manager Fired | Team's manager replaced |

## Hot Streak Event

**Effect:** +5 to two rating categories (randomly selected)
**Duration:** 10 games
**Display:** "ON FIRE" badge on player

```javascript
const hotStreakEvent = {
  type: 'HOT_STREAK',
  duration: 10,  // games
  effects: [
    { category: 'Power', modifier: +5 },
    { category: 'Contact', modifier: +5 }
  ]
};
```

## Cold Streak Event

**Effect:** -5 to two rating categories (randomly selected)
**Duration:** 10 games
**Display:** "SLUMPING" badge on player

```javascript
const coldStreakEvent = {
  type: 'COLD_STREAK',
  duration: 10,
  effects: [
    { category: 'Power', modifier: -5 },
    { category: 'Contact', modifier: -5 }
  ]
};
```

## Veteran Mentor Event

- Random veteran (age 30+) mentors random young player (age <25)
- Young player gets +3 to one rating

## Rivalry Ignited Event

- Two random players from different teams become rivals
- Both get +2 Fame when facing each other's team
- Both get "Clutch" situations when batting/pitching against each other

## Fan Favorite Event

- Random player becomes fan favorite
- +2 Fame immediately
- +1 Fame for rest of season for any milestone

## Media Villain Event

- Random player gets bad press
- -2 Fame immediately
- Extra Fame Boner scrutiny for rest of season

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
+---------------------------------------------------------+
|  GRADE CHECK - Junior Young Jr                           |
+---------------------------------------------------------+
|  Recent Change: +10 Power (Random Event)                 |
|                                                          |
|  Previous Grade: C+                                      |
|  Check new grade in SMB4 and enter below:                |
|                                                          |
|  New Grade: [B-] v                                       |
|                                                          |
|  Warning: Grade change affects:                          |
|  * MVP Weight Factor                                     |
|  * Clutch/Choke Multipliers                              |
|  * End-of-Season Adjustment Factors                      |
|                                                          |
|                          [CANCEL]  [CONFIRM]             |
+---------------------------------------------------------+
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
| **C** | Primary position = C, >=50% of team games |
| **1B** | Primary position = 1B, >=50% of team games |
| **2B** | Primary position = 2B, >=50% of team games |
| **3B** | Primary position = 3B, >=50% of team games |
| **SS** | Primary position = SS, >=50% of team games |
| **LF** | Primary position = LF, >=50% of team games |
| **CF** | Primary position = CF, >=50% of team games |
| **RF** | Primary position = RF, >=50% of team games |
| **DH** | Primary position = DH, >=50% of team games |
| **UTIL** | 3+ positions, threshold games each, none >60% |
| **BENCH** | <50% of team games at primary position, not UTIL |
| **SP** | Threshold+ starts, starts > relief appearances |
| **SP/RP** | Threshold+ starts, relief >= 50% of starts |
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

**Tie-breaker:** User chooses when games are equal.

```
+---------------------------------------------------------+
|  POSITION TIE-BREAKER - Ozzie Smith                      |
+---------------------------------------------------------+
|  Player has equal games at multiple positions:           |
|                                                          |
|  * SS: 20 games                                          |
|  * 2B: 20 games                                          |
|                                                          |
|  Select primary position for this player:                |
|  * SS (Shortstop)                                        |
|  O 2B (Second Base)                                      |
|                                                          |
|                          [CONFIRM]                       |
+---------------------------------------------------------+
```

---

# 14. Records & Milestones

## Career Milestones

### Batting Milestones (Fame Bonus)

| Milestone | Fame Bonus |
|-----------|------------|
| **Home Runs** | |
| 10 career HR | +1 |
| 25 career HR | +1 |
| 50 career HR | +1 |
| 75 career HR | +1 |
| 100 career HR | +2 |
| Every 25 after 100 | +1 |
| **Hits** | |
| 50 career hits | +1 |
| 100 career hits | +1 |
| 150 career hits | +1 |
| 200 career hits | +1 |
| 250 career hits | +2 |
| Every 50 after 250 | +1 |
| **RBI** | |
| 25 career RBI | +1 |
| 50 career RBI | +1 |
| 75 career RBI | +1 |
| 100 career RBI | +2 |
| Every 25 after 100 | +1 |
| **Stolen Bases** | |
| 10 career SB | +1 |
| 25 career SB | +1 |
| 50 career SB | +2 |
| Every 25 after 50 | +1 |

### Pitching Milestones (Fame Bonus)

| Milestone | Fame Bonus |
|-----------|------------|
| **Wins** | |
| 10 career wins | +1 |
| 20 career wins | +1 |
| 30 career wins | +1 |
| 40 career wins | +1 |
| 50 career wins | +2 |
| Every 10 after 50 | +1 |
| **Strikeouts** | |
| 50 career K | +1 |
| 100 career K | +1 |
| 150 career K | +1 |
| 200 career K | +2 |
| Every 50 after 200 | +1 |
| **Saves** | |
| 10 career saves | +1 |
| 20 career saves | +1 |
| 30 career saves | +2 |
| Every 10 after 30 | +1 |

### Negative Career Milestones (Fame Boner)

| Milestone | Fame Boner |
|-----------|------------|
| **Strikeouts (Batting)** | |
| 50 career K | -1 |
| 100 career K | -1 |
| Every 50 after | -1 |
| **Errors** | |
| 10 career errors | -1 |
| 25 career errors | -1 |
| Every 25 after | -1 |
| **Losses (Pitching)** | |
| 10 career losses | -1 |
| 20 career losses | -1 |
| Every 10 after | -1 |
| **GIDP** | |
| 10 career GIDP | -1 |
| 25 career GIDP | -1 |
| Every 25 after | -1 |

## Season Milestones

### Positive (Fame Bonus)

| Milestone | Fame Bonus |
|-----------|------------|
| 10 HR in a season | +1 |
| 15 HR in a season | +1 |
| 20 HR in a season | +2 |
| 40 hits in a season | +1 |
| 50 hits in a season | +1 |
| 30 RBI in a season | +1 |
| 40 RBI in a season | +2 |
| 10 SB in a season | +1 |
| 15 SB in a season | +2 |
| 10 wins in a season | +1 |
| 15 wins in a season | +2 |
| 50 K in a season (pitcher) | +1 |
| 75 K in a season | +2 |
| 10 saves in a season | +1 |
| 15 saves in a season | +2 |
| .300+ batting average (min 50 AB) | +1 |
| .350+ batting average | +2 |
| ERA under 3.00 (min 30 IP) | +1 |
| ERA under 2.00 | +2 |

### Negative (Fame Boner)

| Milestone | Fame Boner |
|-----------|------------|
| 30+ K in a season (batting) | -1 |
| 40+ K in a season | -1 |
| 5+ errors in a season | -1 |
| 10+ errors in a season | -1 |
| 5+ blown saves | -1 |
| 10+ losses in a season | -1 |
| ERA over 6.00 (min 20 IP) | -1 |
| AVG under .200 (min 50 AB) | -1 |
| 10+ GIDP in a season | -1 |

## Single Game Milestones

### Positive (Fame Bonus)

| Milestone | Fame Bonus |
|-----------|------------|
| 4+ hits in a game | +1 |
| 5+ hits in a game | +2 |
| 2+ HR in a game | +1 |
| 3+ HR in a game | +2 |
| 5+ RBI in a game | +1 |
| 7+ RBI in a game | +2 |
| Cycle (1B, 2B, 3B, HR) | +3 |
| 3+ SB in a game | +1 |
| 10+ K in a game (pitcher) | +1 |
| 15+ K in a game | +2 |
| Complete game shutout | +2 |
| No-hitter | +3 |
| Perfect game | +5 |
| Maddux (CG SHO < 85 pitches) | +3 |
| Inside-the-park HR | +2 |
| Walk-off grand slam | +4 |

### Negative (Fame Boner)

| Milestone | Fame Boner |
|-----------|------------|
| Golden sombrero (4+ K) | -1 |
| Platinum sombrero (5+ K) | -2 |
| 3+ errors in a game | -2 |
| 8+ earned runs allowed | -2 |
| 0-5 or worse in a game | -1 |
| Hit into 2+ double plays | -1 |
| 2+ wild pitches in a game | -1 |
| 2+ passed balls in a game | -1 |

## Unique/Rare Milestones

| Milestone | Fame Effect |
|-----------|-------------|
| First career HR | +1 |
| First career hit | +1 |
| First career win | +1 |
| First career save | +1 |
| Hitting for career cycle (at least one of each hit type) | +1 |
| 3 consecutive HR | +2 |
| Back-to-back-to-back HR (team) | +1 each player |
| Grand slam in consecutive games | +2 |
| Walk-off in consecutive games | +2 |
| Immaculate inning (9 pitches, 3 K) | +2 |
| 4-strikeout inning (dropped 3rd strike) | +1 |
| Hitting HR from both sides (switch hitter) | +1 |
| Position player pitching and recording out | +1 |
| Pitcher getting a hit | +1 |
| Pitcher hitting HR | +2 |
| Unassisted triple play | +3 |
| Turning triple play | +2 |

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
| Ctrl+Z | Undo |

## Color Coding

- **Green**: Positive (clutch, fame bonus, positive adjustment)
- **Red**: Negative (choke, fame boner, negative adjustment)
- **Blue**: Informational
- **Gold**: Awards, achievements
- **Orange**: Hot Streak
- **Light Blue**: Cold Streak

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
      traits: ['RBI Hero', 'Tough Out'],
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
    {
      id: 'stadium-001',
      name: 'Oracle Park',
      dimensions: { /* ... */ },
      stats: {
        parkFactors: { runs: 0.92, hr: 0.85, hits: 0.97 },
        battingStats: { avg: 0.258, hr: 45, runsPerGame: 4.2 },
        pitchingStats: { era: 3.45, whip: 1.21, k9: 8.5 },
        notableMoments: []
      }
    },
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

      // Active temporary effects
      temporaryEffects: [
        {
          playerId: 'player-001',
          type: 'HOT_STREAK',
          startGame: 15,
          endGame: 25,
          effects: [{ category: 'Power', modifier: +5 }, { category: 'Contact', modifier: +5 }]
        },
        // ...
      ],

      // Awards (populated at end of season)
      awards: {
        mvp: 'player-001',
        cyYoung: 'player-015',
        roy: 'player-032',
        goldGlove: { C: 'player-005', '1B': 'player-008', /* ... */ },
        silverSlugger: { /* ... */ },
        karaKawaguchi: 'player-042',
        benchPlayer: 'player-033',
        relieverOfYear: 'player-018',
        managerOfYear: 'manager-003',
        // ...
      },

      // Undo stack
      undoStack: [
        { action: 'HR', playerId: 'player-001', gameId: 'game-032', details: { /* ... */ } },
        // ...
      ],
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

# 17. Undo & Reset Features

## Undo Feature

- **Always available** during at-bat/play entry
- Undo stack maintains last 10 actions
- Each action shows what will be undone

```
+---------------------------------------------------------+
|  UNDO LAST ACTION                                        |
+---------------------------------------------------------+
|  Last action: HR recorded for Barry Bonds                |
|  This will remove:                                       |
|  * 1 HR from Barry Bonds                                 |
|  * 1 RBI from Barry Bonds                                |
|  * 1 Run from Barry Bonds                                |
|  * Fame bonus from HR milestone                          |
|                                                          |
|                          [CANCEL]  [UNDO]                |
+---------------------------------------------------------+
```

## Reset Season Feature

Located in Settings, with multiple confirmation steps:

```
+---------------------------------------------------------+
|  WARNING: RESET SEASON                                   |
+---------------------------------------------------------+
|  This will permanently delete all data for Season 3:     |
|  * All game results                                      |
|  * All player stats                                      |
|  * All awards                                            |
|  * All random events                                     |
|                                                          |
|  Type "RESET SEASON 3" to confirm:                       |
|  [                                        ]              |
|                                                          |
|                          [CANCEL]  [RESET]               |
+---------------------------------------------------------+
```

After typing confirmation:

```
+---------------------------------------------------------+
|  WARNING: FINAL CONFIRMATION                             |
+---------------------------------------------------------+
|  Are you ABSOLUTELY sure?                                |
|  This cannot be undone.                                  |
|                                                          |
|  [Cancel - Take me back]    [Yes, Reset Everything]      |
+---------------------------------------------------------+
```

---

# Appendix A: SMB4 Traits Reference (Corrected)

## COMPETITIVE (Orange)

| Trait | Type |
|-------|------|
| Cannon Arm | Positive |
| Durable | Positive |
| First Pitch Slayer | Positive |
| Sprinter | Positive |
| K Collector | Positive |
| Tough Out | Positive |
| K Neglecter | Negative |
| Whiffer | Negative |
| Slow Poke | Negative |
| First Pitch Prayer | Negative |
| Injury Prone | Negative |
| Noodle Arm | Negative |

## CRAFTY (Green)

| Trait | Type |
|-------|------|
| Stimulated | Positive |
| Specialist | Positive |
| Reverse Splits | Positive |
| Stealer | Positive |
| Pick Officer | Positive |
| Sign Stealer | Positive |
| Mind Gamer | Positive |
| Distractor | Positive |
| Bad Ball Hitter | Positive |
| Bad Jumps | Negative |
| Easy Jumps | Negative |
| Wild Thrower | Negative |
| Easy Target | Negative |

## DISCIPLINED (Purple)

| Trait | Type |
|-------|------|
| Pinch Perfect | Positive |
| Base Rounder | Positive |
| Composed | Positive |
| Magic Hands | Positive |
| Fastball Hitter | Positive |
| Off-Speed Hitter | Positive |
| Low Pitch | Positive |
| High Pitch | Positive |
| Inside Pitch | Positive |
| Outside Pitch | Positive |
| Metal Head | Positive |
| Consistent | Positive |
| Base Jogger | Negative |
| BB Prone | Negative |
| Butter Fingers | Negative |
| Volatile | Negative |

## SPIRITED (Yellow)

| Trait | Type |
|-------|------|
| Two Way | Positive |
| Rally Stopper | Positive |
| Clutch | Positive |
| Dive Wizard | Positive |
| Rally Starter | Positive |
| RBI Hero | Positive |
| CON vs LHP | Positive |
| CON vs RHP | Positive |
| POW vs LHP | Positive |
| POW vs RHP | Positive |
| Choker | Negative |
| Meltdown | Negative |
| Surrounded | Negative |
| Wild Thing | Negative |
| RBI Zero | Negative |

## SCHOLARLY (Blue)

| Trait | Type |
|-------|------|
| Ace Exterminator | Positive |
| Bunter | Positive |
| Utility | Positive |
| Big Hack | Positive |
| Little Hack | Positive |
| Gets Ahead | Positive |
| Elite 4F | Positive |
| Elite 2F | Positive |
| Elite CF | Positive |
| Elite FK | Positive |
| Elite SL | Positive |
| Elite CB | Positive |
| Elite CH | Positive |
| Elite SB | Positive |
| Falls Behind | Negative |
| Crossed Up | Negative |

---

# Appendix B: Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Initial | Master spec consolidation |
| 2.0 | Update | Incorporated all corrections: game counts, fitness categories, POG system, expanded clutch/choke triggers, revised milestones, pre-season fame, All-Star voting narrative, trait randomization, all award criteria and rewards, grade factors (5x increase), hot/cold streak mechanics, new random events, correct SMB4 trait names, undo/reset features, position tie-breaker |

---

# Appendix C: Still To Be Addressed

- **Retirements and Free Agency** (offseason system - awaiting user explanation)

---

*End of Master Specification Document v2.0*
