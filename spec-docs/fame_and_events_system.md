# KBL XHD Tracker - Fame System & Random Events

> **Related Spec**: For detailed Fame Bonus/Boner event definitions and values, see `SPECIAL_EVENTS_SPEC.md`
> **SMB4 Reference**: See `SMB4_GAME_MECHANICS.md` for game-specific limitations

## Overview

This document covers:
1. Fame Bonus/Boner system (fan narrative impact)
2. All-Star voting calculation with Fame
3. Improved Random Event Generator
4. Updated Award System with trait assignments
5. End-of-Season Ratings Adjustment integration

---

## 1. Fame System

### Concept
Fame represents a player's narrative standing with fans - their reputation, memorable moments, and overall "story." This impacts subjective awards and All-Star voting.

### Fame Types

| Type | Value | Description |
|------|-------|-------------|
| **Fame Bonus** | +1 each | Positive narrative moment - awesome plays, clutch performances, being a legend |
| **Fame Boner** | -1 each | Embarrassing moment - hilarious failures, mental errors, choking |

### When to Award Fame

**Fame Bonus Examples (values in parentheses):**
- Walk-off hit/HR (+1)
- Robbing a home run (+1.5, or +2.5 if grand slam robbery)
- Turning an unassisted triple play (+3)
- Immaculate inning - striking out side on 9 pitches (+2)
- 9-pitch inning, non-immaculate (+1)
- Hitting for the cycle (+3, or +4 if natural cycle)
- Grand slam in clutch situation (+1)
- Coming back from injury to perform well (+1)
- Legendary player reputation (+1)
- Dramatic comeback win contribution (+1)
- Making a highlight-reel defensive play / Web Gem (+0.75)
- No-hitter (+3)
- Perfect game (+5)
- Maddux - CGSO under pitch threshold (+3)
- Inside-the-park home run (+1.5)
- Multi-HR game: 2 HR (+1), 3 HR (+2.5), 4+ HR (+5)
- Back-to-back HRs (+0.5 each batter)
- Career milestone achievement (+1)
- First career event (HR, hit, etc.) (+0.5)
- Nut shot delivered - batter intimidation (+1)
- Killed pitcher - batter dominance (+3)
- Pitcher stayed in after being hit (+1)
- Position player pitching: clean inning (+1), multiple clean innings (+2), got K (+1)

**Fame Boner Examples (values in parentheses):**
- Striking out on an intentional walk via pitchouts (-2)
- Dropped routine fly ball (-1, or -2 if clutch + runs scored)
- Passed ball allowing run (-1, or -2 if winning run)
- TOOTBLAN (-1, or -2 if rally-killer)
- Mental error leading to runs (-1)
- Getting picked off to end game (-2) or end inning (-1)
- Golden Sombrero - 4 K in game (-1)
- Platinum Sombrero - 5 K in game (-2)
- Pitcher giving up back-to-back-to-back HRs (-1)
- Meltdown - 6+ runs allowed (-1), 10+ runs allowed (-2)
- Blown save (-1, or -2 if team loses)
- Fielding error on routine play in clutch (-1)
- Meatball whiff - K on pitch down the middle in clutch (-1)
- Hit into triple play (-1)
- Booted easy grounder leading to runs (-1)
- Throwing to wrong base (-1)
- Nut shot victim - fielder didn't make play (-1)
- Position player pitching - gave up 3+ runs (-1)

### Fame Entry UI
```
╔══════════════════════════════════════════════════════════════╗
║                    ADD FAME MOMENT                            ║
╠══════════════════════════════════════════════════════════════╣
║  Player: [Dropdown - All Players]                            ║
║                                                               ║
║  Type:   ○ Fame Bonus (+1)    ○ Fame Boner (-1)             ║
║                                                               ║
║  Reason: [________________________________]                   ║
║          "Struck out on intentional walk pitchout"           ║
║                                                               ║
║  Game:   [Select Game] (optional - for context)              ║
║                                                               ║
║         [Cancel]                    [Add Fame Moment]         ║
╚══════════════════════════════════════════════════════════════╝
```

### Fame in Calculations

**Net Fame** = Total Fame Bonuses - Total Fame Boners

Fame is incorporated into subjective awards and All-Star voting as part of the "Narrative" component.

---

## 2. All-Star Voting System

### Trigger
All-Star break triggers after **60% of games** have been played.

### Voting Formula (renamed to "Votes")

```
Raw Score = (WAR × 0.50) + (Clutch Rating × 0.30) + (Traditional/Milestone/Narrative × 0.20)

Votes = Raw Score × 10 (rounded to whole number)
```

### Component Breakdown

**WAR (50%)**
- Position players: bWAR + rWAR + fWAR
- Pitchers: pWAR

**Clutch Rating (30%)**
- Opportunity-adjusted clutch performance
- (Clutch Points / Clutch Opportunities) × 100

**Traditional/Milestone/Narrative (20%)**
Split equally:
- Traditional Stats (6.67%): AVG, HR, RBI, SB for batters; W, ERA, K, SV for pitchers
- Milestones (6.67%): Positive milestones achieved
- Narrative/Fame (6.67%): Net Fame score

### Traditional Stats Normalization

**Batters:**
```
Traditional Score = (AVG × 200) + (HR × 1.5) + (RBI × 0.5) + (SB × 1) + (OPS × 50)
Normalized = Traditional Score / League Average Traditional Score
```

**Pitchers:**
```
Traditional Score = (Wins × 3) + (Saves × 4) + (K × 0.3) - (ERA × 10) + (IP × 0.2)
Normalized = Traditional Score / League Average Traditional Score
```

### Milestone Impact
Each positive milestone adds +0.5 to raw score
Each negative milestone subtracts -0.25 from raw score

### Fame/Narrative Impact
```
Fame Score = Net Fame × 0.5
```
(Each Fame Bonus adds 0.5, each Fame Boner subtracts 0.5)

### Example Calculation

```
Player: Devon Godsendez
Position: LF

Components:
- Total WAR: 3.2 (bWAR 2.5 + rWAR 0.4 + fWAR 0.3)
- Clutch Rating: 85 (28 points / 33 opportunities × 100)
- Traditional: 1.15 (above average)
- Milestones: 2 positive (+1.0)
- Fame: +4 net (+2.0)

Raw Score:
= (3.2 × 0.50) + (0.85 × 0.30) + ((1.15 + 1.0 + 2.0) × 0.0667)
= 1.60 + 0.255 + 0.277
= 2.132

Votes = 2.132 × 10 = 21 votes
```

### All-Star Selection Rules

**Minimum Representation:**
- Each team must have at least 1 All-Star
- If a team has no players in top vote-getters, highest-voted player from that team is added

**Starters (by position):**
- C, 1B, 2B, SS, 3B, LF, CF, RF, DH (if applicable)
- Highest vote-getter at each position

**Reserves:**
- Next highest vote-getters regardless of position
- Enough to fill roster (typically 25-30 total per league)

**Pitchers:**
- SP: Top 4-5 vote-getters
- RP/CP: Top 3-4 vote-getters

### All-Star Trait Rewards

All selected All-Stars receive a **randomized trait** (not ratings adjustment):
- Winners get random trait from position-appropriate pool
- Can replace existing trait if player already has 2

---

## 3. Improved Random Event Generator

### Current Events (from spreadsheet)
1. Random trait
2. Random good trait
3. Random bad trait
4. Random secondary position
5. Random primary position
6. Chosen secondary position
7. Down 10 in random category
8. Up 10 in random category
9. Change personality
10. Change stadium
11. Random batting stance/arm angle
12. Add a random pitch
13. Subtract a random pitch
14. Add silly accessory
15. Add cool accessory
16. Change facial hair
17. Fire manager
18. Wild card!
19. Change name (boy first name, girl last name)
20. Re-roll

### Improved Event List (30 Events)

| # | Event | Category | Description |
|---|-------|----------|-------------|
| 1 | Random Trait | Trait | Gain any random trait (positive or negative) |
| 2 | Random Good Trait | Trait | Gain a random positive trait |
| 3 | Random Bad Trait | Trait | Gain a random negative trait |
| 4 | Lose a Trait | Trait | Lose one of your existing traits randomly |
| 5 | Trait Swap | Trait | Swap one trait for another random trait |
| 6 | Random Secondary Position | Position | Gain a random secondary position |
| 7 | Random Primary Position | Position | Primary position changes randomly |
| 8 | Chosen Secondary Position | Position | User chooses new secondary position |
| 9 | Lose Secondary Position | Position | Lose ability to play secondary position |
| 10 | +10 Random Category | Stats | Boost random stat by 10 |
| 11 | -10 Random Category | Stats | Drop random stat by 10 |
| 12 | +5 All Categories | Stats | Small boost to all stats |
| 13 | -5 All Categories | Stats | Small drop to all stats |
| 14 | Hot Streak | Stats | +15 to POW and CON for rest of season |
| 15 | Cold Streak | Stats | -15 to POW and CON for rest of season |
| 16 | Change Personality | Cosmetic | Personality type changes |
| 17 | Change Stadium | Team | Team's home stadium changes |
| 18 | Random Batting Stance | Cosmetic | Batting stance or pitching motion changes |
| 19 | Add Random Pitch | Pitching | Pitcher gains a new pitch type |
| 20 | Subtract Random Pitch | Pitching | Pitcher loses a pitch type |
| 21 | Add Silly Accessory | Cosmetic | Gain a funny accessory |
| 22 | Add Cool Accessory | Cosmetic | Gain a stylish accessory |
| 23 | Change Facial Hair | Cosmetic | Facial hair style changes |
| 24 | Fire Manager | Team | Team's manager is fired (new random manager) |
| 25 | Contract Extension | Status | Player gets +2 Fame Bonus (fan favorite) |
| 26 | Controversy | Status | Player gets +2 Fame Boners (scandal/drama) |
| 27 | Injury Scare | Status | Player misses 3-5 games |
| 28 | Name Change | Cosmetic | Boy first name, girl last name |
| 29 | Wild Card! | Special | Roll twice, apply both events |
| 30 | Re-Roll | Special | Discard this result, roll again |

### New Event Ideas to Consider

**Performance Events:**
- **Fountain of Youth**: Player acts 5 years younger for ratings purposes
- **Old Age Hits**: Player acts 5 years older for ratings purposes
- **Second Wind**: Restore player to peak career ratings temporarily
- **Rookie Regression**: Player drops to rookie-level performance for 10 games

**Team Events:**
- **Trade Rumor**: Player gets -1 Fame Boner (distracted by rumors)
- **Fan Favorite Day**: Player gets +2 Fame Bonus
- **Rivalry Boost**: +10 to all stats vs division rival
- **Playoff Push**: Team gets collective +5 to clutch situations

**Dramatic Events:**
- **Redemption Arc**: If negative clutch rating, double all future clutch points
- **Heel Turn**: Popular player becomes villain (+3 Fame Boners, but +10 POW)
- **Underdog Story**: C+ or lower player gets +20 to all stats for 5 games
- **Villain's Downfall**: High-rated player with bad attitude gets -15 all stats

**Fun/Cosmetic Events:**
- **Nickname Change**: Player gets a new nickname
- **Walk-Up Song Change**: New walk-up music (flavor text)
- **Superstition**: Player must wear specific accessory or suffers -5 all stats
- **Lucky Charm**: +3 Fame Bonus and +5 Clutch situations

### Event Frequency
- **4 times per season** (as current)
- Trigger points: 25%, 50%, 75%, and randomly between 80-95%
- Can be manual trigger or automatic

### Event Application Rules
1. Roll 1-30 for event type
2. Roll for random player (alphabetical assignment)
3. If event doesn't apply (e.g., "Add pitch" to position player), re-roll event
4. Apply event and log to player history

---

## 4. Updated Award System

### Award Timing
- **All-Star Break (60% games)**: All-Star voting finalized, traits assigned
- **End of Regular Season**: All other awards

### Trait Assignments by Award

| Award | Trait Reward | Notes |
|-------|--------------|-------|
| **MVP Winner** | Random positive trait | Chemistry-weighted |
| **MVP Runner-up** | Random trait | Can be positive or negative |
| **MVP 3rd Place** | Random trait | Can be positive or negative |
| **Cy Young Winner** | Random positive trait | Pitching-focused pool |
| **Cy Young Runner-up** | Random trait | Can be positive or negative |
| **Cy Young 3rd Place** | Random trait | Can be positive or negative |
| **AL Reliever of Year** | Clutch trait | Guaranteed |
| **NL Reliever of Year** | Clutch trait | Guaranteed |
| **Bench Player of Year** | Pinch Perfect trait | Guaranteed (custom trait?) |
| **Rookie of the Year** | Random trait | Any trait |
| **ROY Runner-up** | Random trait | Any trait |
| **Kara Kawaguchi Award** | Tough Out + Random positive | Two traits if room |
| **Bust of the Year** | Choker trait | Guaranteed negative |
| **Comeback Player** | Restore Old Ratings | Not a trait - ratings restore |
| **Postseason MVP** | +10 points (max 5 to 1 category) | Stats, not trait |
| **All-Star Selection** | Random trait | Position-appropriate |

### Trait Replacement Rules

When assigning a trait:
1. If player has 0-1 traits: Add new trait
2. If player has 2 traits: User chooses which to replace
3. Replacement UI shows both current traits and new trait
4. User confirms replacement

```
╔══════════════════════════════════════════════════════════════╗
║                   TRAIT REPLACEMENT                           ║
╠══════════════════════════════════════════════════════════════╣
║  Player: Devon Godsendez                                      ║
║  Award: MVP Winner                                            ║
║                                                               ║
║  Current Traits:                                              ║
║    1. RBI Hero (Spirited)                                     ║
║    2. Bad Ball Hitter (Crafty)                                ║
║                                                               ║
║  New Trait Assigned:                                          ║
║    ★ Clutch (Spirited) ★                                      ║
║                                                               ║
║  Which trait should be replaced?                              ║
║                                                               ║
║  [Replace RBI Hero]  [Replace Bad Ball Hitter]  [Keep Both*] ║
║                                                               ║
║  *Keep Both only available if special condition met           ║
╚══════════════════════════════════════════════════════════════╝
```

### League Leader Awards (Stats-Based)

| Award | Reward |
|-------|--------|
| AVG Leader (AL) | +5 Contact |
| AVG Leader (NL) | +5 Contact |
| HR Leader | +5 Power |
| RBI Leader (AL) | +3 Contact, +3 Power |
| RBI Leader (NL) | +3 Contact, +3 Power |
| ERA Leader (AL) | +5 to any: ACC, JNK, or VEL |
| ERA Leader (NL) | +5 to any: ACC, JNK, or VEL |
| WHIP Leader | +5 to any: ACC, JNK, or VEL |
| K Leader (AL) | +5 to JNK or VEL |
| K Leader (NL) | +5 to JNK or VEL |
| Most Hitting K's (AL) | Whiffer trait |
| Most Hitting K's (NL) | Whiffer trait |
| Most Hitting BB's | +5 Speed |
| Highest Net SB% | Stealer trait OR +5 Speed |
| Most Saves | Clutch trait |
| Most Walk Ratio (BB/9) | BB Prone trait |
| Most Runs (AL) | +5 Speed |
| Most Runs (NL) | +5 Speed |
| Best Hitting Pitcher (AL) | +15 Power, +15 Contact |
| Best Hitting Pitcher (NL) | +15 Power, +15 Contact |
| Gold Glove (each position) | +5 Fielding |
| Platinum Glove | +5 Fielding (additional, total +10) |
| Booger Glove | Butter Fingers trait OR lose positive trait |

---

## 5. Cy Young Award Criteria (Updated)

Per your feedback, removing traditional stats:

```javascript
const cyYoungScore = {
  pWAR: player.pWAR,
  weight_pWAR: 0.40,

  advancedStats: {
    FIP: player.FIP,
    TrueERA: player.trueERA // ERA adjusted for fielding luck
  },
  weight_Advanced: 0.25,

  clutchRating: player.pitchingClutchPoints / player.pitchingOpportunities,
  weight_Clutch: 0.25,

  teamSuccess: team.winPercentage,
  weight_Team: 0.05,

  narrative: player.netFame + player.milestones.length,
  weight_Narrative: 0.05
};
```

**Cy Young Weights:**
- pWAR: 40%
- FIP/True ERA: 25%
- Clutch Rating: 25%
- Team Success: 5%
- Narrative (Fame): 5%

---

## 6. Gold Glove Awards

**Gold Glove uses defensive metrics, NOT Fame.**

Fame is for narrative/subjective awards. Gold Glove should be based on actual defensive performance.

**Gold Glove Formula:**
```javascript
const goldGloveScore = {
  fWAR: player.fWAR,
  weight_fWAR: 0.70,

  // LI-weighted clutch defensive plays
  clutchPlays: player.fieldingClutchPoints, // weighted by leverage
  weight_ClutchPlays: 0.30
};
```

**Optional User Override:**
If user feels metrics don't capture reality, they can add a small manual adjustment (-3 to +3).
This is NOT Fame-based - it's for cases where the user observed something the stats missed.

---

## 7. End-of-Season Ratings Adjustment

### Current Algorithm (from spreadsheet)
```
Weighted MVP Rating [minus] Midpoint MVP Rating [times] Positive/Negative Weight Factor
```

### Midpoints by Position Type
| Position Type | Midpoint |
|---------------|----------|
| Starting Position Players | 9.5 |
| Bench Position Players | 2.1 |
| Starting Pitchers | 7.0 |
| SP/RPs, RPs, CPs | 0.7 |

### Weight Factors by Grade

**MVP Weight Factors (performance multiplier):**
| Grade | Weight |
|-------|--------|
| S | 0.5 |
| A+ | 0.6 |
| A | 0.7 |
| A- | 0.8 |
| B+ | 0.9 |
| B | 1.0 |
| B- | 1.1 |
| C+ | 1.2 |
| C | 1.3 |
| C- | 1.4 |
| D+ or less | 1.5 |

**Ratings Adjustment Factor:**
| Grade | If Positive | If Negative |
|-------|-------------|-------------|
| S | 0.1 | 10 |
| A+ | 0.2 | 8 |
| A | 0.3 | 7 |
| A- | 0.4 | 5 |
| B+ | 0.5 | 4 |
| B | 0.75 | 3 |
| B- | 1.0 | 2 |
| C+ | 1.4 | 1 |
| C | 2.0 | 0.8 |
| C- | 2.5 | 0.5 |
| D+ or less | 3.0 | 0.3 |

### Calculation Example

```
Player: Jacob deGrom
Position: SP
Grade: A-
Weighted MVP Rating: 18.3
Midpoint (SP): 7.0

Difference: 18.3 - 7.0 = 11.3 (positive)

MVP Weight Factor (A-): 0.8
Ratings Adj Factor (A-, positive): 0.4

EOS Adjustment = 11.3 × 0.8 × 0.4 = 3.62 points
```

### Integration Notes

The ratings adjustment calculator operates **separately** from trait assignments:
- Traits are assigned based on awards won
- Ratings adjustment is calculated based on MVP Score vs expectation
- Both happen during offseason processing
- If a player gained a trait that boosted performance, that's already reflected in their MVP Score

---

## 8. Data Storage for Fame

### Fame Events Table
```javascript
{
  fameId: 1,
  playerId: 'player_123',
  seasonId: 2024,
  gameId: 'game_456', // optional
  fameType: 'bonus', // 'bonus' or 'boner'
  value: 1, // typically 1, but can be more for special events
  reason: 'Walk-off grand slam in Game 7',
  createdAt: '2024-08-15T21:30:00Z'
}
```

### Player Season Fame Summary
```javascript
{
  playerId: 'player_123',
  seasonId: 2024,
  totalBonuses: 7,
  totalBoners: 2,
  netFame: 5,
  fameEvents: [...] // array of all fame events
}
```

---

## 9. Summary of Key Changes

1. **Fame Bonus/Boner**: New system for tracking narrative moments
2. **All-Star Calculation**: WAR 50%, Clutch 30%, Traditional/Milestones/Fame 20%, × 10 for Votes
3. **All-Star Timing**: Triggers at 60% of season
4. **All-Star Reward**: Random trait (not ratings adjustment)
5. **Random Events**: Expanded from 20 to 30 events with more variety
6. **Cy Young**: Removed traditional stats - now pWAR, FIP/True ERA, Clutch, Team, Fame
7. **Gold Glove**: Uses fWAR (70%) + LI-weighted clutch plays (30%), NOT Fame. Optional user override is NOT Fame-based.
8. **Trait Replacement**: UI for choosing which trait to replace when at max
9. **Fame in All Subjective Awards**: MVP, Cy Young, ROY, etc. all include narrative component
