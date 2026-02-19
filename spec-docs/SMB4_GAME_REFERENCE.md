# SMB4 Game Reference

> **Purpose**: Comprehensive reference for Super Mega Baseball 4 game mechanics
> **Source**: BillyYank's Guide (3rd Edition) + Jester's SMB Reference V2
> **Created**: January 21, 2026
> **IMPORTANT**: Read this BEFORE implementing any game-specific features

---

## Table of Contents

1. [Game Overview](#1-game-overview)
2. [Player Ratings](#2-player-ratings)
3. [Mojo System](#3-mojo-system)
4. [Chemistry & Traits](#4-chemistry--traits)
5. [Pitching Arsenal](#5-pitching-arsenal)
6. [Fielding by Position](#6-fielding-by-position)
7. [Franchise Mode](#7-franchise-mode)
8. [SMB4-Specific Events](#8-smb4-specific-events)
9. [Stats to Track](#9-stats-to-track)
10. [Reference Documents](#10-reference-documents)

---

## 1. Game Overview

SMB4 is a highly customizable baseball game with three pre-built leagues:

| League | Teams | Description |
|--------|-------|-------------|
| Super Mega League | 20 | Balanced teams with characters from previous games |
| Legends League | 8 | Retired MLB players at different career stages |
| Creators Classic | 8 | Blend of SML, Legends, and baseball personalities |

### Ego System
Four independent difficulty settings (0-99 each):
- **Batting** - How hard it is to hit
- **Pitching** - How hard it is to pitch effectively
- **Fielding** - How hard it is to field
- **Baserunning** - How hard it is to run bases

---

## 2. Player Ratings

All skills range from **0 to 99**.

### Position Players

| Rating | Description | In-Game Effect |
|--------|-------------|----------------|
| **Power (POW)** | How hard player hits | Size of batting reticle center dot |
| **Contact (CON)** | Ability to make contact | Size of batting reticle outer circle |
| **Speed (SPD)** | Running speed | Used for both fielding and baserunning |
| **Fielding (FLD)** | Fielding ability | Fewer errors, better range, diving plays |
| **Arm (ARM)** | Throw speed/distance | Critical for C, SS, CF, 3B positions |

### Pitchers

| Rating | Description | Notes |
|--------|-------------|-------|
| **Velocity (VEL)** | Fastball speed | Critical for fastball-heavy arsenals |
| **Junk (JNK)** | Pitch curve amount | Critical for off-speed pitches |
| **Accuracy (ACC)** | Pitch control | Can compensate for low VEL/JNK |

### Player Tiers

| Tier | Salary Range | Description |
|------|--------------|-------------|
| S | $15M+ | Elite players |
| A | $9-15M | Stars |
| B | $5.5-9M | Quality starters |
| C | $2.5-5.5M | Role players |
| D | <$2.5M | Bench/replacement |

---

## 3. Mojo System

Mojo is a fluctuating mood stat that affects performance. **This is critical for Fame tracking.**

### Mojo Levels (High to Low)

**Mojo uses a 5-level scale from -2 to +2:**

| Level | Value | Enum | Description | Effect |
|-------|-------|------|-------------|--------|
| **Jacked** | +2 | VERY_HIGH | Peak performance, rarely achieved | Huge bonuses (~+15-20%) |
| **Locked In** | +1 | HIGH | Having a great game | Good bonuses (~+8-10%) |
| **Normal** | 0 | NEUTRAL | Default starting state | Baseline |
| **Tense** | -1 | LOW | Struggling | Decreased stats (~-8-10%) |
| **Rattled** | -2 | VERY_LOW | Sustained failure, hard to escape | Significant penalties (~-15-20%) |

> **Note**: "Locked In" is the +1 Mojo state. It may also be referred to as "On Fire" in some contexts - they are the same level. The system uses 5 levels total, not 6.

### Mojo Triggers

**Positive (Mojo Up)**:
- Getting hits (especially extra-base hits)
- Stealing bases
- Making outs (pitchers)
- Strikeouts (pitchers)

**Negative (Mojo Down)**:
- Making outs (batters)
- Strikeouts (batters)
- Committing errors
- Getting caught stealing
- Allowing walks/hits/runs (pitchers)

### Pressure Situations
Mojo effects are **amplified** in high-pressure situations:
- Tied games in late innings
- Runners in scoring position
- Close games

---

## 4. Chemistry & Traits

### Chemistry Types (5 Colors)

| Chemistry | Color | Focus |
|-----------|-------|-------|
| **Competitive** | Orange | Two-strike performance, durability |
| **Spirited** | Yellow | Batting versatility, comeback ability |
| **Crafty** | Green | Baserunning, platoon advantages |
| **Disciplined** | Purple | Count management, composure |
| **Scholarly** | Blue | Power hitting, mental game |

### Trait Potency Levels

Traits scale based on team chemistry composition:

| Players of Chemistry Type | Potency Level | Effect |
|---------------------------|---------------|--------|
| 0-2 | Level 1 | Minimal bonus |
| 3-6 | Level 2 | Mid-level bonus |
| 7+ | Level 3 | Huge bonus |

**Max 22 players per team** → Can only max out 2-3 chemistry types

### Key Traits by Chemistry

#### COMPETITIVE (Orange)
| Trait | Effect | Notes |
|-------|--------|-------|
| **K Collector** | +VEL/JNK on 2-strike counts | One of the best pitcher traits |
| **Tough Out** | +CON on 2-strike counts | Excellent for batters |
| **Cannon Arm** | Increased throw speed | Best for C, SS, CF, 3B |
| **Durable** | Reduced injury risk, slower fitness decay | Critical for catchers |
| **First Pitch Slayer** | +POW/CON on 0-0 count | Forces tough pitcher decisions |
| **Sprinter** | Faster out of batter's box | Good for speed guys |
| K Neglecter | -VEL/JNK on 2-strike counts | **AVOID** |
| Whiffer | -CON on 2-strike counts | **AVOID** |
| Slow Poke | Slower out of batter's box | **AVOID** |

#### CRAFTY (Green)
| Trait | Effect | Notes |
|-------|--------|-------|
| **Stealer** | Faster steal speed | Can make average runners threats |
| **Specialist** | Debuffs same-handed batters | Affects 53% of batters (RH) |
| **Reverse Splits** | Debuffs opposite-handed batters | Only way to neutralize switch hitters |
| **Bad Ball Hitter** | Reduced penalty on edge pitches | Expands effective zone |
| **Mind Gamer** | Opposing pitcher -ACC | Constant advantage |
| **Distractor** | Opposing pitcher -ACC when on base | Hilarious and effective |
| **Pick Officer** | Opposing runners slower stealing | Great for limiting steals |
| Bad Jumps | Slower steal speed | Situationally bad |
| Easy Jumps | Opposing runners faster stealing | **AVOID** |
| Wild Thrower | +Error chance | **AVOID** |

#### DISCIPLINED (Purple)
| Trait | Effect | Notes |
|-------|--------|-------|
| **Composed** | +ACC on 3-ball counts | Good for junkballers |
| **Base Rounder** | Faster rounding bases | Always useful |
| BB Prone | -ACC on 3-ball counts | Bad for low-ACC pitchers |
| Base Jogger | Slower rounding bases | Situationally bad |

#### SPIRITED (Yellow)
| Trait | Effect | Notes |
|-------|--------|-------|
| **Rally Starter** | Bonus when team is losing | Comeback potential |
| **Stopper** | Bonus when team is winning | Lock down wins |

#### SCHOLARLY (Blue)
| Trait | Effect | Notes |
|-------|--------|-------|
| **Power Surge** | Situational power boost | Extra pop |
| **Extra Bases** | Better at stretching hits | More doubles/triples |

---

## 5. Pitching Arsenal

### Pitch Types

**Fastballs** (high VEL important):
| Pitch | Movement | Notes |
|-------|----------|-------|
| Four Seam (4F) | Straight | Basic fastball |
| Two Seam (2F) | Slight horizontal | Moves with junk |
| Cutter (CT) | Slight horizontal | Moves with junk |

**Off-Speed** (high JNK important):
| Pitch | Movement | Notes |
|-------|----------|-------|
| Change Up (CH) | Slow, slight drop | Speed deception |
| Curveball (CB) | Slow, significant drop | Classic breaking ball |
| Slider (SL) | Faster, diagonal drop | Sweeping movement |
| Forkball (FK) | Quick vertical drop | Sharp late break |
| Screwball (SC) | Sudden horizontal | Rare, deceptive |

### Pitcher Positions

| Position | Stamina | Rest Needed | Notes |
|----------|---------|-------------|-------|
| SP (Starter) | ~70 pitches | 3 games | Best stamina |
| SP/RP | ~45 pitches | 2 games | Versatile, no mojo penalty |
| RP (Reliever) | ~25 pitches | 1 game | Middle relief |
| CP (Closer) | ~20 pitches | Fastest | 8th+ inning only, or mojo penalty |

**Important**: Using pitchers outside their role causes **mojo penalty**.

---

## 6. Fielding by Position

### Minimum Requirements (Rule of Thumb)

| Position | FLD | SPD | ARM | Notes |
|----------|-----|-----|-----|-------|
| **C** | 60+ | - | 70+ | Must stop steals, handle every pitch |
| **1B** | 35+ | - | 25+ | Easiest position, prioritize hitting |
| **2B** | 50+ | 50+ | 25+ | Need range, short throw |
| **SS** | 65+ | 65+ | 65+ | Highest demands, most critical |
| **3B** | 60+ | - | 65+ | Long throw, line drives |
| **LF** | 25+ | 50+ | 30+ | Easiest OF, prioritize hitting |
| **CF** | 40+ | 70+ | 70+ | Most ground to cover |
| **RF** | 40+ | 50+ | 65+ | Long throws to 3B/home |

### Position Priority

Defense matters most at: **C > SS > CF > 3B > RF > 2B > 1B > LF**

Offense matters most at: **1B > LF > RF > 3B > 2B > CF > SS > C**

### Catcher Special Rules
- **Cannot play non-catchers at C** (too many chances per game)
- Catchers need rest (~1 of every 4 games)
- Always need a backup catcher

---

## 7. Franchise Mode

### Budget System
- Team budget: ~$175M
- Unspent salary → PDO (Player Development Opportunity) funds
- Young/cheap roster = more development funds

### PDOs (Player Development Opportunities)
- Random stat improvements
- Can gain/lose traits
- Also increases player Loyalty

### Loyalty System
- **High Loyalty**: Player accepts below-market salary
- **Low Loyalty**: Player demands premium to stay
- Manager Moments affect Loyalty (positive or negative choices)
- PDOs increase Loyalty

### Off-Season
- 32 rounds of free agency
- AI snaps up players around round 14
- Players reduce demands each round
- Keep chemistry composition in mind when signing

### Player Aging
- Young players (18-29): Generally improve
- Older players (30+): Generally decline
- Max age: 49 (most retire earlier)

---

## 8. SMB4-Specific Events

### Comebacker Scenarios
| Event | Impact |
|-------|--------|
| Normal comebacker | P gets assist, +fWAR |
| Comebacker caught | P gets putout, +Clutch if ends inning |
| Pitcher injured by comebacker | Significant fitness hit, may exit game |

### Nutshot Event
Ball hits pitcher in groin area (unique SMB4 animation):
- Mojo penalty to pitcher
- No fitness penalty
- Play may or may not be made

### Failed HR Robbery
Outfielder attempts to rob HR, ball bounces off glove over fence:
- **-1 Fame** to fielder
- Still counts as HR

### Bad Hop
Ball takes unexpected bounce over fielder:
- NOT an error (bad luck ≠ error)
- Track separately for analysis
- Affects spray chart accuracy

---

## 9. Stats to Track

### Batting Stats (from Jester's Reference)
| Stat | Column | Description |
|------|--------|-------------|
| G | Games played |
| AB | At bats |
| H | Hits |
| HR | Home runs |
| RBI | Runs batted in |
| R | Runs scored |
| TB | Total bases |
| 2B | Doubles |
| 3B | Triples |
| BB | Walks |
| SO | Strikeouts |
| SB | Stolen bases |
| CS | Caught stealing |
| HBP | Hit by pitch |
| SAC | Sacrifice bunts |
| SF | Sacrifice flies |
| E | Errors |
| PB | Passed balls (catchers) |

### Pitching Stats
| Stat | Column | Description |
|------|--------|-------------|
| W | Wins |
| L | Losses |
| RA | Runs allowed |
| ER | Earned runs |
| Gp | Games pitched |
| GS | Games started |
| SV | Saves |
| IP | Innings pitched |
| Ha | Hits allowed |
| K | Strikeouts |
| BBa | Walks allowed |
| WP | Wild pitches |
| HRa | Home runs allowed |
| CG | Complete games |
| SHO | Shutouts |
| HB | Hit batters |
| TBF | Total batters faced |
| NP | Number of pitches |

### Defensive Stats
Position-specific plate appearances tracked:
- PA_C, PA_1B, PA_2B, PA_3B, PA_SS, PA_LF, PA_CF, PA_RF, PA_DH

DRS (Defensive Runs Saved) by position:
- DRS_P, DRS_C, DRS_1B, DRS_2B, DRS_3B, DRS_SS, DRS_LF, DRS_CF, DRS_RF

### Calculated Stats
| Stat | Description |
|------|-------------|
| OBP | On-base percentage |
| SLG | Slugging percentage |
| OPS+ | OPS adjusted for league |
| wOBA | Weighted on-base average |
| wRC | Weighted runs created |
| wRAA | Weighted runs above average |
| wRC+ | wRC adjusted for league |
| batRAA | Batting runs above average |
| bsrRAA | Baserunning runs above average |
| fldRAA | Fielding runs above average |
| posADJ | Positional adjustment |
| bWAR | Position player WAR |

### Awards Tracked
- All-Star
- Cy Young Award
- Most Valuable Player
- Rookie of the Year
- Gold Glove
- Platinum Glove
- Silver Slugger
- Rolaids Relief Pitcher of the Year
- Golden Spikes
- Postseason MVP
- Champion

---

## 10. Reference Documents

### Available in `/reference-docs/`:

1. **BillyYank Super Mega Baseball Guide 3rd Edition.docx**
   - Complete SMB4 guide (~90+ pages)
   - Trait analysis with player examples
   - Team rankings and analysis
   - Park dimensions

2. **Jester's Super Mega Baseball Reference V2 clean.xlsx**
   - Season-over-season stat tracking template
   - WAR calculations
   - Leaderboards and awards
   - FIP defense adjustments

### How to Use These Documents

For **trait implementation**: Read BillyYank's Traits section (starts around page 18)
For **stat tracking schema**: Use Jester's PLAYER LOG columns as reference
For **WAR calculations**: See Jester's formula columns and GUTS sheet

---

## Key Takeaways for KBL Tracker

1. **Mojo is central** to SMB4 - track events that affect it
2. **Chemistry/Traits** create complex interactions - must track potency
3. **Fielding positions** have very different requirements
4. **Catchers are special** - fatigue faster, can't be played by non-catchers
5. **Pitcher roles matter** - using wrong role = mojo penalty
6. **PDOs and Loyalty** are key to franchise success
7. **Track everything** - the reference spreadsheet shows ~220 columns per player

---

*This document extracts key SMB4 mechanics. For full details, consult the original reference documents.*
