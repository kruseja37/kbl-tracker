# KBL XHD Tracker - Offseason & Awards System Design (v2)

## Key Updates from v1
- Fame Bonus/Boner system integrated
- All-Star break at 60% of season (mid-season awards)
- All-Stars get traits, not ratings adjustments
- Cy Young: No traditional stats
- Eye Test = Fame/Narrative for fielding
- Trait replacement UI when player has 2 traits
- Expanded random events (30 total)

---

## 1. Season Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│                        SEASON TIMELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  START ──────────────────────────────────────────────────> END  │
│    │                      │                              │      │
│    │                      │                              │      │
│  0%                      60%                           100%     │
│    │                      │                              │      │
│    ▼                      ▼                              ▼      │
│ Season               ALL-STAR                      End of       │
│ Begins               BREAK                         Season       │
│                                                                 │
│ Random Events:    • Finalize voting              • All awards   │
│ @ 25%, 50%,       • Select All-Stars             • Ratings adj  │
│ 75%, 80-95%       • Assign traits                • Offseason    │
│                   • HR Derby (fun)                              │
│                   • Resume season                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. All-Star Voting (Tracked Throughout Season)

### Display: Top 5 Per Position with Votes

```
╔══════════════════════════════════════════════════════════════════╗
║                    ALL-STAR VOTING - CATCHER                      ║
║                    (Season Progress: 47/80 games - 59%)           ║
╠══════════════════════════════════════════════════════════════════╣
║ Rank │ Player          │ Team    │ Votes │ WAR  │ Clutch │ Fame  ║
╠══════╪═════════════════╪═════════╪═══════╪══════╪════════╪═══════╣
║  1   │ Mike Piazza     │ Mets    │  187  │ 2.8  │ +22    │  +5   ║
║  2   │ Johnny Bench    │ Reds    │  164  │ 2.5  │ +18    │  +3   ║
║  3   │ Ivan Rodriguez  │ Rangers │  151  │ 2.3  │ +15    │  +2   ║
║  4   │ Yogi Berra      │ Yankees │  142  │ 2.1  │ +12    │  +4   ║
║  5   │ Carlton Fisk    │ Red Sox │  138  │ 2.0  │ +14    │  +1   ║
╚══════╧═════════════════╧═════════╧═══════╧══════╧════════╧═══════╝
```

### Voting Formula

```
Raw Score = (WAR × 0.50) + (Clutch Rating × 0.30) + (Narrative × 0.20)

Narrative = (Traditional Score × 0.333) + (Milestones × 0.333) + (Fame × 0.333)

Votes = Raw Score × 10 (rounded to whole number)
```

### Component Details

**WAR (50%)**
- Position players: bWAR + rWAR + fWAR
- Pitchers: pWAR

**Clutch Rating (30%)**
```
Clutch Rating = (Net Clutch Points / Total Clutch Opportunities) × 100
```
Normalized to 0-100 scale for calculation

**Narrative (20%)** - Split three ways:

*Traditional (6.67%):*
```
Batters: (AVG × 200) + (HR × 1.5) + (RBI × 0.5) + (SB × 1) + (OPS × 50)
Pitchers: (Wins × 3) + (Saves × 4) + (K × 0.3) - (ERA × 10) + (IP × 0.2)
→ Normalized against league average
```

*Milestones (6.67%):*
```
+0.5 per positive milestone
-0.25 per negative milestone
```

*Fame (6.67%):*
```
Net Fame × 0.5
(+0.5 per Fame Bonus, -0.5 per Fame Boner)
```

### All-Star Selection Process

**At 60% of Season:**

1. **Calculate Final Votes** for all eligible players
2. **Select Starters** (highest vote-getter per position)
3. **Select Reserves** (next highest vote-getters)
4. **Minimum Representation Check** (1 All-Star per team minimum)
5. **User Confirmation** of final roster
6. **Trait Assignment** via randomizer for each All-Star

### All-Star Trait Assignment

All-Stars receive a **random trait** (not ratings):
- Pool is position-appropriate
- Chemistry-weighted selection
- If player has 2 traits, user chooses replacement

---

## 3. Award Voting System (End of Season)

### Award Processing Order

1. **League Leaders** (auto-calculated, stats-based rewards)
2. **Gold Gloves** (per position, hybrid voting)
3. **Platinum Glove** (from Gold Glove winners)
4. **Booger Glove** (worst fielding, negative trait)
5. **Silver Sluggers** (per position, hybrid voting)
6. **Reliever of the Year** (AL/NL)
7. **Bench Player of the Year**
8. **Rookie of the Year** (AL/NL + runner-up)
9. **Cy Young** (AL/NL, top 3)
10. **MVP** (AL/NL, top 3)
11. **Kara Kawaguchi Award**
12. **Bust of the Year**
13. **Comeback Player of the Year**
14. **Postseason MVP** (after playoffs)

### Hybrid Voting Flow

```
╔══════════════════════════════════════════════════════════════╗
║                    MVP VOTING - AL                            ║
╠══════════════════════════════════════════════════════════════╣
║  System Recommendation based on:                              ║
║  • WAR (40%) • Clutch (25%) • Team (12%) • Fame (8%)         ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ RANK │ PLAYER           │ SCORE │ WAR  │ CLUTCH │ FAME │  ║
║  ├──────┼──────────────────┼───────┼──────┼────────┼──────┤  ║
║  │  1   │ ★ Babe Ruth      │ 94.2  │ 5.8  │ +38    │ +12  │  ║
║  │  2   │ Lou Gehrig       │ 89.7  │ 5.4  │ +32    │  +8  │  ║
║  │  3   │ Ted Williams     │ 85.3  │ 5.1  │ +28    │  +6  │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  ★ = System Recommendation                                    ║
║                                                               ║
║  [Confirm #1]  [Select #2]  [Select #3]  [Other Player...]   ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 4. Award Criteria Details

### MVP (40% WAR, 25% Clutch, 15% Traditional, 12% Team, 8% Fame)

```javascript
const mvpScore = {
  totalWAR: player.bWAR + player.rWAR + player.fWAR,
  clutchRating: player.clutchNetPoints / player.clutchOpportunities,
  traditionalStats: calculateTraditionalBatting(player),
  teamSuccess: team.winPercentage,
  narrative: player.netFame + (player.positivesMilestones * 0.5)
};

// Weighted calculation
score = (WAR * 0.40) + (clutch * 0.25) + (traditional * 0.15)
      + (team * 0.12) + (narrative * 0.08);
```

### Cy Young (40% pWAR, 25% FIP/TrueERA, 25% Clutch, 5% Team, 5% Fame)

**No traditional stats** per your request:

```javascript
const cyYoungScore = {
  pWAR: player.pWAR,
  advancedPitching: (inverseFIP + inverseTrueERA) / 2, // lower is better
  clutchRating: player.pitchingClutch / player.pitchingOpportunities,
  teamSuccess: team.winPercentage,
  narrative: player.netFame + (player.positiveMilestones * 0.5)
};

score = (pWAR * 0.40) + (advanced * 0.25) + (clutch * 0.25)
      + (team * 0.05) + (narrative * 0.05);
```

### Gold Glove (55% fWAR, 25% Clutch Plays, 20% Eye Test/Fame)

```javascript
const goldGloveScore = {
  fWAR: player.fWAR,
  clutchPlays: player.fieldingClutchCount, // raw count
  eyeTest: player.fieldingFameNet + userAdjustment // -5 to +5 manual
};

score = (fWAR * 0.55) + (clutchPlays * 0.25) + (eyeTest * 0.20);
```

**Eye Test UI:**
```
╔══════════════════════════════════════════════════════════════╗
║                 GOLD GLOVE - SHORTSTOP                        ║
╠══════════════════════════════════════════════════════════════╣
║  Player: Ozzie Smith                                          ║
║                                                               ║
║  Stats:                                                       ║
║  • fWAR: 2.4                                                  ║
║  • Clutch Plays: 8                                            ║
║  • Fame (Fielding): +4                                        ║
║                                                               ║
║  Eye Test Adjustment: [-5] [-2] [0] [+2] [+5]                ║
║                              ▲                                ║
║                          (current)                            ║
║                                                               ║
║  "Did this player pass the eye test? Adjust based on your    ║
║   observation of their defensive performance."                ║
║                                                               ║
║  Final Score: 87.4                                            ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 5. Complete Trait/Reward Assignments

### Awards with Trait Rewards

| Award | Trait Reward |
|-------|--------------|
| MVP Winner | Random positive trait (chemistry-weighted) |
| MVP Runner-up | Random trait (any) |
| MVP 3rd Place | Random trait (any) |
| Cy Young Winner | Random positive trait (pitching pool) |
| Cy Young Runner-up | Random trait (any) |
| Cy Young 3rd Place | Random trait (any) |
| AL Reliever of Year | **Clutch** (guaranteed) |
| NL Reliever of Year | **Clutch** (guaranteed) |
| Bench Player of Year | **Pinch Perfect** (custom trait) |
| Rookie of the Year | Random trait |
| ROY Runner-up | Random trait |
| Kara Kawaguchi | **Tough Out** + Random positive (if room) |
| Bust of the Year | **Choker** (guaranteed negative) |
| All-Star Selection | Random trait (position-appropriate) |

### Awards with Stats Rewards

| Award | Stats Reward |
|-------|--------------|
| Comeback Player | Restore Old Ratings |
| Postseason MVP | +10 points (max 5 to any 1 category) |

### League Leader Rewards

| Leader | Reward |
|--------|--------|
| AVG (AL) | +5 Contact |
| AVG (NL) | +5 Contact |
| HR | +5 Power |
| RBI (AL) | +3 Contact, +3 Power |
| RBI (NL) | +3 Contact, +3 Power |
| ERA (AL) | +5 to any: ACC, JNK, or VEL (user choice) |
| ERA (NL) | +5 to any: ACC, JNK, or VEL (user choice) |
| WHIP | +5 to any: ACC, JNK, or VEL (user choice) |
| K Leader (AL) | +5 to JNK or VEL (user choice) |
| K Leader (NL) | +5 to JNK or VEL (user choice) |
| Most Hitting K's (AL) | **Whiffer** trait |
| Most Hitting K's (NL) | **Whiffer** trait |
| Most Hitting BB's | +5 Speed |
| Highest Net SB% | **Stealer** trait OR +5 Speed (user choice) |
| Most Saves | **Clutch** trait |
| Most BB Ratio (BB/9) | **BB Prone** trait |
| Most Runs (AL) | +5 Speed |
| Most Runs (NL) | +5 Speed |
| Best Hitting Pitcher (AL) | +15 Power, +15 Contact |
| Best Hitting Pitcher (NL) | +15 Power, +15 Contact |
| Gold Glove (each) | +5 Fielding |
| Platinum Glove | +5 Fielding (additional, total +10) |
| Booger Glove | **Butter Fingers** OR lose positive trait |

---

## 6. Trait Replacement System

### When Replacement Needed

Player already has 2 traits and wins award with trait reward.

### Replacement UI

```
╔══════════════════════════════════════════════════════════════╗
║                   TRAIT REPLACEMENT                           ║
╠══════════════════════════════════════════════════════════════╣
║  Player: Mike Trout                                           ║
║  Award: All-Star Selection                                    ║
║                                                               ║
║  Current Traits:                                              ║
║    ┌─────────────────────────────────────────────────────┐   ║
║    │ 1. RBI Hero (Spirited)                              │   ║
║    │    "Bonus POW/CON with runner on 2B or 3B"          │   ║
║    │                                                     │   ║
║    │ 2. Tough Out (Competitive)                          │   ║
║    │    "Increased Contact with 2-strike count"          │   ║
║    └─────────────────────────────────────────────────────┘   ║
║                                                               ║
║  New Trait Assigned:                                          ║
║    ┌─────────────────────────────────────────────────────┐   ║
║    │ ★ Clutch (Spirited) ★                               │   ║
║    │    "Boost to all skills when pressure is high"      │   ║
║    └─────────────────────────────────────────────────────┘   ║
║                                                               ║
║  Select action:                                               ║
║                                                               ║
║  [Replace RBI Hero]  [Replace Tough Out]  [Decline New Trait] ║
╚══════════════════════════════════════════════════════════════╝
```

### Replacement Rules

1. User must choose which trait to replace
2. Cannot keep both + new (max 2 traits)
3. "Decline" option available (rare - player keeps existing traits)
4. Log records the replacement for history

---

## 7. End-of-Season Ratings Adjustment

### Algorithm
```
EOS Adjustment = (Weighted MVP Rating - Midpoint) × MVP Weight × Adjustment Factor
```

### Midpoints by Role

| Role | Midpoint |
|------|----------|
| Starting Position Players | 9.5 |
| Bench Position Players | 2.1 |
| Starting Pitchers | 7.0 |
| SP/RPs, RPs, CPs | 0.7 |

### Weight Factors by Grade

| Grade | MVP Weight | Adj Factor (Positive) | Adj Factor (Negative) |
|-------|------------|----------------------|----------------------|
| S | 0.5 | 0.1 | 10 |
| A+ | 0.6 | 0.2 | 8 |
| A | 0.7 | 0.3 | 7 |
| A- | 0.8 | 0.4 | 5 |
| B+ | 0.9 | 0.5 | 4 |
| B | 1.0 | 0.75 | 3 |
| B- | 1.1 | 1.0 | 2 |
| C+ | 1.2 | 1.4 | 1 |
| C | 1.3 | 2.0 | 0.8 |
| C- | 1.4 | 2.5 | 0.5 |
| D+ or less | 1.5 | 3.0 | 0.3 |

### Philosophy

- **High-grade players** (S, A+, A): Small rewards for overperforming, big penalties for underperforming
- **Low-grade players** (C, C-, D+): Big rewards for overperforming, small penalties for underperforming
- This creates meaningful regression/progression based on expectations

### Integration with Traits

The ratings adjustment is calculated based on MVP Score, which already reflects:
- Performance throughout the season
- Impact of any traits gained mid-season (All-Star break)
- Fame Bonus/Boner contributions

---

## 8. Offseason Processing Flow

```
╔══════════════════════════════════════════════════════════════╗
║              KBL XHD TRACKER - OFFSEASON 2024                ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ┌──────────────────────────────────────────────────────────┐║
║  │ Step 1: FINAL STANDINGS                          [Done]  │║
║  │ Step 2: LEAGUE LEADERS (auto)                    [Done]  │║
║  │ Step 3: GOLD GLOVES (9 positions)               [3/9]   │║
║  │ Step 4: PLATINUM/BOOGER GLOVE                   [Pending]│║
║  │ Step 5: SILVER SLUGGERS                         [Pending]│║
║  │ Step 6: RELIEVER OF THE YEAR                    [Pending]│║
║  │ Step 7: BENCH PLAYER OF THE YEAR                [Pending]│║
║  │ Step 8: ROOKIE OF THE YEAR                      [Pending]│║
║  │ Step 9: CY YOUNG (AL/NL)                        [Pending]│║
║  │ Step 10: MVP (AL/NL)                            [Pending]│║
║  │ Step 11: SPECIAL AWARDS                         [Pending]│║
║  │ Step 12: TRAIT RANDOMIZATION                    [Pending]│║
║  │ Step 13: RATINGS ADJUSTMENTS                    [Pending]│║
║  │ Step 14: SEASON SUMMARY                         [Pending]│║
║  └──────────────────────────────────────────────────────────┘║
║                                                               ║
║  Progress: [████████░░░░░░░░░░░░] 35% Complete               ║
║                                                               ║
║  [Continue to Gold Glove - 3B]                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 9. Trait Randomization Wheel UI

```
╔══════════════════════════════════════════════════════════════╗
║                   TRAIT LOTTERY                               ║
╠══════════════════════════════════════════════════════════════╣
║  Award: Cy Young - AL                                         ║
║  Winner: Jacob deGrom                                         ║
║  Pool: Positive Pitching Traits                               ║
║                                                               ║
║           ┌─────────────────────────────────┐                ║
║           │                                 │                ║
║           │         🎰 SPINNING...          │                ║
║           │                                 │                ║
║           │   K Collector → Rally Stopper   │                ║
║           │         → Specialist →          │                ║
║           │   Composed ← Gets Ahead ←       │                ║
║           │                                 │                ║
║           │         ▼ ▼ ▼ ▼ ▼              │                ║
║           │                                 │                ║
║           │      ★ K COLLECTOR ★            │                ║
║           │                                 │                ║
║           │  "+30 VEL/JNK with 2-strike"   │                ║
║           │  Chemistry: Competitive         │                ║
║           │  Team Tier: 2 (5 players)       │                ║
║           │                                 │                ║
║           └─────────────────────────────────┘                ║
║                                                               ║
║   [✓ Accept Trait]     [🔄 Re-Roll (1 left)]                 ║
╚══════════════════════════════════════════════════════════════╝
```

### Re-Roll Rules
- 1 free re-roll per award
- Must accept second result
- Re-roll cannot land on same trait

---

## 10. Data Models

### Fame Event
```javascript
{
  id: 'fame_001',
  playerId: 'player_123',
  seasonId: 2024,
  gameId: 'game_456',
  type: 'bonus', // 'bonus' or 'boner'
  value: 1,
  reason: 'Walk-off grand slam',
  category: 'batting', // batting, pitching, fielding, baserunning
  createdAt: '2024-07-15T22:30:00Z'
}
```

### Award Record
```javascript
{
  id: 'award_001',
  seasonId: 2024,
  awardType: 'MVP',
  league: 'AL', // null for league-wide awards
  position: null, // for positional awards like Gold Glove
  winnerId: 'player_123',
  runnerUpId: 'player_456',
  thirdPlaceId: 'player_789',
  scores: {
    winner: 94.2,
    runnerUp: 89.7,
    thirdPlace: 85.3
  },
  traitAssigned: 'Clutch',
  traitReplaced: null, // if replacement occurred
  userOverride: false,
  createdAt: '2024-10-15T18:00:00Z'
}
```

### All-Star Selection
```javascript
{
  id: 'allstar_001',
  seasonId: 2024,
  league: 'AL',
  playerId: 'player_123',
  position: 'SS',
  isStarter: true,
  votes: 187,
  components: {
    war: 2.8,
    clutch: 22,
    traditional: 1.15,
    milestones: 2,
    fame: 5
  },
  traitAssigned: 'Utility',
  traitReplaced: 'Base Rounder',
  createdAt: '2024-07-01T12:00:00Z'
}
```

### Ratings Adjustment
```javascript
{
  id: 'adj_001',
  playerId: 'player_123',
  seasonId: 2024,
  preSeasonGrade: 'A-',
  weightedMVP: 18.3,
  midpoint: 7.0,
  mvpWeight: 0.8,
  adjFactor: 0.4,
  adjustment: 3.62,
  previousRating: 87,
  newRating: 91,
  newGrade: 'A',
  createdAt: '2024-10-20T10:00:00Z'
}
```
