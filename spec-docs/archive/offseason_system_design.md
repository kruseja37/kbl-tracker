# KBL XHD Tracker - Offseason & Awards System Design

## Overview

The offseason system handles:
1. Award voting (hybrid: system suggests, user confirms)
2. Trait randomization for award winners
3. Rating updates based on award outcomes
4. All-Star leaderboard tracking during season

---

## 1. All-Star Leaderboard (During Season)

### Display: Top 5 Per Position

**Position Groups:**
- C (Catcher)
- 1B (First Base)
- 2B (Second Base)
- SS (Shortstop)
- 3B (Third Base)
- LF (Left Field)
- CF (Center Field)
- RF (Right Field)
- DH (Designated Hitter) - if league uses DH
- SP (Starting Pitcher)
- RP (Relief Pitcher)

### Ranking Formula
```
All-Star Score = (Total WAR × 0.5) + (Clutch Rating × 0.3) + (Traditional Score × 0.2)

Traditional Score (Position Players):
= (AVG × 100) + (HR × 2) + (RBI × 1) + (SB × 1.5) + (OPS × 50)

Traditional Score (Pitchers):
= (Wins × 3) + (Saves × 2) + (K × 0.5) - (ERA × 10) + (IP × 0.5)
```

### Leaderboard Display
```
╔══════════════════════════════════════════════════════════════╗
║                    ALL-STAR RACE - CATCHER                    ║
╠══════════════════════════════════════════════════════════════╣
║ Rank │ Player          │ Team    │ WAR  │ Clutch │ Score    ║
╠══════╪═════════════════╪═════════╪══════╪════════╪══════════╣
║  1   │ Jake Martinez   │ TBD     │ 2.3  │ +18    │ 45.2     ║
║  2   │ Bobby Chen      │ LAR     │ 2.1  │ +12    │ 41.8     ║
║  3   │ Mike Thompson   │ NYM     │ 1.9  │ +15    │ 39.5     ║
║  4   │ Carlos Rivera   │ CHI     │ 1.7  │ +8     │ 35.2     ║
║  5   │ Sam Williams    │ BOS     │ 1.5  │ +11    │ 33.1     ║
╚══════╧═════════════════╧═════════╧══════╧════════╧══════════╝
```

### Conference Split (8+ teams)
- Show separate leaderboards per conference
- 1 starter per position per conference for All-Star game

---

## 2. Award Voting System

### Voting Workflow

```
Step 1: REGULAR SEASON ENDS
         ↓
Step 2: SYSTEM CALCULATES CANDIDATES
         - Generates top 3-5 candidates per award
         - Calculates weighted scores
         ↓
Step 3: SYSTEM PRESENTS SUGGESTION
         "Based on the season data, here are the top candidates for MVP:
          1. Player A (WAR: 5.2, Clutch: +32, Score: 87.4) ← RECOMMENDED
          2. Player B (WAR: 4.8, Clutch: +28, Score: 82.1)
          3. Player C (WAR: 4.5, Clutch: +35, Score: 80.9)"
         ↓
Step 4: USER CONFIRMS OR OVERRIDES
         [Confirm Recommendation] [Select #2] [Select #3] [Other...]
         ↓
Step 5: AWARD RECORDED
         ↓
Step 6: TRAIT RANDOMIZATION (if applicable)
         - System shows which trait will be assigned
         - User confirms
         ↓
Step 7: RATING UPDATE
         - Apply bonuses/penalties
         - Update KBL XHD rating
```

### Award Categories & Criteria

#### MVP (Per League if 8+ teams)
```javascript
const mvpScore = {
  totalWAR: player.bWAR + player.rWAR + player.fWAR,
  weight_WAR: 0.40,

  clutchRating: player.clutchPoints / player.clutchOpportunities,
  weight_Clutch: 0.25,

  traditionalStats: calculateTraditionalBatting(player),
  weight_Traditional: 0.15,

  teamSuccess: team.winPercentage,
  weight_Team: 0.12,

  narrative: player.milestones.length + player.records.length,
  weight_Narrative: 0.08
};
```

#### Cy Young (Per League if 8+ teams)
```javascript
const cyYoungScore = {
  pWAR: player.pWAR,
  weight_pWAR: 0.40,

  traditionalStats: (wins * 3) + (saves * 2) + (K * 0.2) - (ERA * 5),
  weight_Traditional: 0.15,

  advancedStats: calculateFIP_TrueERA(player),
  weight_Advanced: 0.20,

  clutchRating: player.pitchingClutch / player.pitchingOpportunities,
  weight_Clutch: 0.20,

  teamSuccess: team.winPercentage,
  weight_Team: 0.05
};
```

#### Gold Glove (Per Position)
```javascript
const goldGloveScore = {
  fWAR: player.fWAR,
  weight_fWAR: 0.60,

  clutchPlays: player.fieldingClutchCount, // raw count, not points
  weight_ClutchPlays: 0.25,

  eyeTest: 0, // user can adjust
  weight_EyeTest: 0.15
};
```

#### Platinum Glove (Best of Gold Glove Winners)
- Winner receives +10 total fielding bonus (+5 from Gold + +5 from Platinum)

#### Silver Slugger (Per Position)
```javascript
const silverSluggerScore = {
  offensiveWAR: player.bWAR + player.rWAR,
  weight_WAR: 0.50,

  slugging: player.SLG,
  weight_SLG: 0.25,

  clutch: player.battingClutchPoints,
  weight_Clutch: 0.25
};
```

#### Batting Title
- Highest AVG with minimum PA (3.1 × team games)
- No voting - purely statistical

#### Triple Crown
- Lead league in AVG, HR, and RBI
- No voting - purely statistical

#### ROY (Per League if 8+ teams)
```javascript
// Eligibility: First year players only
const royScore = {
  totalWAR: player.bWAR + player.rWAR + player.fWAR + player.pWAR,
  weight_WAR: 0.50,

  clutchRating: player.clutchRating,
  weight_Clutch: 0.30,

  traditionalStats: calculateByPosition(player),
  weight_Traditional: 0.20
};
```

#### Manager of the Year (Per League if 8+ teams)
- **Regular season only** (no playoff consideration)
```javascript
const motyScore = {
  winPercentage: team.wins / team.games,
  weight_WinPct: 0.40,

  overPerformance: team.actualWins - team.projectedWins,
  weight_Overperform: 0.35,

  clutchManagement: team.managerClutchPoints,
  weight_Clutch: 0.25
};
```

#### Kara Kawaguchi Award
- Eligibility: B- or worse grade, POW < 50, CON < 50
```javascript
const karaScore = {
  clutchPoints: player.clutchPoints,
  weight_Clutch: 0.50,

  totalWAR: player.bWAR + player.rWAR + player.fWAR,
  weight_WAR: 0.30,

  defyingOdds: Math.max(0, player.actualPerformance - player.expectedPerformance),
  weight_Defying: 0.20
};
```

#### Bust of the Year
- Eligibility: B+ or better grade
```javascript
const bustScore = {
  underperformance: player.expectedWAR - player.actualWAR,
  weight_Under: 0.50,

  chokePoints: player.chokePoints,
  weight_Choke: 0.35,

  negativeClutch: Math.min(0, player.clutchNetPoints),
  weight_NegClutch: 0.15
};
```

#### League Leaders (Statistical Awards)
If 8+ teams, track per conference:
- AVG Leader
- HR Leader
- RBI Leader
- SB Leader (replaced by rWAR Leader)
- ERA Leader
- Wins Leader
- Saves Leader
- K Leader

---

## 3. Trait Randomization System

### When Traits Are Assigned

| Award | Trait Type | Chemistry Weight |
|-------|------------|------------------|
| MVP | Offensive/Baserunning | Player's existing chemistry |
| Cy Young | Pitching | Player's existing chemistry |
| Gold Glove | Defensive | Player's existing chemistry |
| Platinum Glove | Defensive | Player's existing chemistry |
| Silver Slugger | Offensive | Player's existing chemistry |
| ROY | Position-appropriate | Player's existing chemistry |
| Kara Kawaguchi | Clutch-related | Player's existing chemistry |
| Bust of the Year | **NEGATIVE** | Player's existing chemistry |

### Randomization Algorithm

```javascript
function assignTrait(player, awardType) {
  // Get eligible traits for this award type
  const eligibleTraits = getTraitsForAward(awardType);

  // Filter out traits player already has
  const availableTraits = eligibleTraits.filter(t =>
    !player.traits.includes(t.name) &&
    player.traits.length < 2
  );

  if (availableTraits.length === 0) {
    return null; // Player already has 2 traits or all applicable
  }

  // Weight by chemistry match
  const weighted = availableTraits.map(trait => ({
    trait,
    weight: trait.chemistry === player.chemistry ? 3 : 1
  }));

  // Random selection
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;

  for (const w of weighted) {
    random -= w.weight;
    if (random <= 0) {
      return w.trait;
    }
  }

  return weighted[weighted.length - 1].trait;
}
```

### Trait Pools by Award

```javascript
const traitPools = {
  MVP: [
    'First Pitch Slayer', 'Tough Out', 'Bad Ball Hitter', 'Rally Starter',
    'RBI Hero', 'CON vs LHP', 'CON vs RHP', 'POW vs LHP', 'POW vs RHP',
    'Ace Exterminator', 'Big Hack', 'Little Hack', 'Sprinter', 'Base Rounder',
    'Stealer', 'Clutch'
  ],

  CyYoung: [
    'K Collector', 'Rally Stopper', 'Specialist', 'Reverse Splits',
    'Composed', 'Gets Ahead', 'Clutch', 'Pick Officer',
    'Elite 4F', 'Elite 2F', 'Elite CF', 'Elite FK',
    'Elite SL', 'Elite CB', 'Elite CH', 'Elite SB'
  ],

  GoldGlove: [
    'Cannon Arm', 'Magic Hands', 'Dive Wizard', 'Utility', 'Durable'
  ],

  SilverSlugger: [
    'First Pitch Slayer', 'Bad Ball Hitter', 'RBI Hero', 'Big Hack',
    'Ace Exterminator', 'Fastball Hitter', 'Off-Speed Hitter',
    'Low Pitch', 'High Pitch', 'Inside Pitch', 'Outside Pitch'
  ],

  KaraKawaguchi: [
    'Clutch', 'RBI Hero', 'Rally Starter', 'Tough Out', 'Stealer',
    'Magic Hands', 'Rally Stopper'
  ],

  BustOfYear: [
    // Negative traits only
    'K Neglecter', 'Whiffer', 'Slow Poke', 'First Pitch Prayer',
    'Injury Prone', 'Bad Jumps', 'Wild Thrower', 'Easy Target',
    'Base Jogger', 'BB Prone', 'Butter Fingers', 'Choker',
    'RBI Zero', 'Falls Behind', 'Crossed Up'
  ]
};
```

### Trait Assignment UI

```
╔══════════════════════════════════════════════════════════════╗
║                   TRAIT RANDOMIZATION                         ║
╠══════════════════════════════════════════════════════════════╣
║  Award: MVP - National League                                 ║
║  Winner: Devon Godsendez (Sirloins)                          ║
║                                                               ║
║  Current Traits: RBI Hero                                     ║
║  Chemistry: Spirited                                          ║
║                                                               ║
║  ╔════════════════════════════════════════════════════════╗  ║
║  ║  🎲 SPINNING...                                        ║  ║
║  ║                                                        ║  ║
║  ║  [Clutch] [Rally Starter] [POW vs RHP] [Stealer]      ║  ║
║  ║           ↓                                            ║  ║
║  ║        ★ CLUTCH ★                                      ║  ║
║  ║                                                        ║  ║
║  ║  "Boost to all skills when pressure is high"          ║  ║
║  ║  Tier 2 Spirited: +5 to all skills                    ║  ║
║  ╚════════════════════════════════════════════════════════╝  ║
║                                                               ║
║           [✓ Confirm Trait]  [🔄 Re-Roll (1 remaining)]       ║
╚══════════════════════════════════════════════════════════════╝
```

### Re-Roll Rules
- User gets 1 free re-roll per award
- Must accept second result
- Re-roll option adds fun/suspense

---

## 4. Rating Updates

### Award Bonuses

| Award | Rating Bonus |
|-------|--------------|
| MVP | +3 overall |
| Cy Young | +3 overall |
| ROY | +2 overall |
| Gold Glove | +5 fielding |
| Platinum Glove | +5 fielding (total +10 with Gold) |
| Silver Slugger | +3 contact OR +3 power (user choice) |
| Batting Title | +2 contact |
| Triple Crown | +5 overall |
| Kara Kawaguchi | +2 overall |
| Bust of the Year | -2 overall |
| All-Star Selection | +1 overall |
| League Leader | +1 in relevant stat |

### KBL XHD End-of-Season Rating

```javascript
function calculateEndOfSeasonRating(player) {
  const baseRating = player.currentRating;

  // Performance adjustment
  const performanceAdj = (player.actualWAR - player.expectedWAR) * 0.5;

  // Award bonuses
  let awardBonus = 0;
  for (const award of player.awardsWon) {
    awardBonus += AWARD_BONUSES[award.type];
  }

  // Clutch factor
  const clutchAdj = player.clutchNetPoints * 0.1;

  // Age regression/progression
  const ageAdj = calculateAgeAdjustment(player.age, player.position);

  return Math.round(baseRating + performanceAdj + awardBonus + clutchAdj + ageAdj);
}

const ageAdjustments = {
  under24: +1,   // Young players improve
  '24-29': 0,    // Prime years
  '30-32': -0.5, // Early decline
  '33-35': -1,   // Decline
  '36+': -1.5    // Late career
};
```

---

## 5. Offseason Tab UI Flow

### Main Offseason Dashboard

```
╔══════════════════════════════════════════════════════════════╗
║              KBL XHD TRACKER - OFFSEASON 2024                ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  ║
║  │  📊 FINAL       │  │  🏆 AWARD       │  │  🎲 TRAIT    │  ║
║  │  STANDINGS      │  │  VOTING         │  │  LOTTERY     │  ║
║  │                 │  │                 │  │              │  ║
║  │  [View]         │  │  [Start]        │  │  [Start]     │  ║
║  └─────────────────┘  └─────────────────┘  └──────────────┘  ║
║                                                               ║
║  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  ║
║  │  📈 RATING      │  │  📋 SEASON      │  │  🆕 NEW      │  ║
║  │  UPDATES        │  │  SUMMARY        │  │  SEASON      │  ║
║  │                 │  │                 │  │              │  ║
║  │  [Process]      │  │  [Generate]     │  │  [Begin]     │  ║
║  └─────────────────┘  └─────────────────┘  └──────────────┘  ║
║                                                               ║
║  Progress: [███████░░░░░░░░░░░░░░] 35% Complete              ║
║  Next Step: Award Voting                                      ║
╚══════════════════════════════════════════════════════════════╝
```

### Award Voting Sequence

1. **League Leader Awards** (auto-calculated, just display)
2. **Gold Gloves** (per position)
3. **Silver Sluggers** (per position)
4. **ROY** (per league if applicable)
5. **Manager of the Year** (per league if applicable)
6. **Cy Young** (per league if applicable)
7. **MVP** (per league if applicable)
8. **Platinum Glove** (from Gold Glove winners)
9. **Kara Kawaguchi Award**
10. **Bust of the Year**
11. **Batting Title / Triple Crown** (auto-calculated)

### Post-Award Summary

```
╔══════════════════════════════════════════════════════════════╗
║              2024 SEASON AWARD SUMMARY                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  🏆 MVP - NL: Devon Godsendez (Sirloins)                     ║
║     → Gained trait: Clutch                                    ║
║     → Rating: 94 → 97 (+3)                                    ║
║                                                               ║
║  🏆 MVP - AL: Hammer Longballo (Wideloads)                   ║
║     → Gained trait: RBI Hero (already had 2 traits)          ║
║     → Rating: 92 → 95 (+3)                                    ║
║                                                               ║
║  🏆 Cy Young - NL: Hurley Bender (Beewolves)                 ║
║     → Gained trait: K Collector                               ║
║     → Rating: 96 → 99 (+3)                                    ║
║                                                               ║
║  💩 Bust of the Year: Jon Ronero (Sawteeth)                  ║
║     → Gained trait: Choker                                    ║
║     → Rating: 82 → 80 (-2)                                    ║
║                                                               ║
║  [Export Summary]  [View All Awards]  [Continue to Ratings]   ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 6. Data Storage

### Awards Table
```javascript
{
  awardId: 1,
  seasonId: 2024,
  awardType: 'MVP',
  league: 'NL',
  winnerId: 'player_123',
  winnerName: 'Devon Godsendez',
  teamId: 'sirloins',
  score: 87.4,
  runnerUpId: 'player_456',
  runnerUpScore: 82.1,
  traitAssigned: 'Clutch',
  ratingChange: +3,
  votedAt: '2024-10-15T18:00:00Z',
  userOverride: false
}
```

### Trait Changes Log
```javascript
{
  changeId: 1,
  playerId: 'player_123',
  seasonId: 2024,
  traitName: 'Clutch',
  source: 'MVP_Award',
  previousTraits: ['RBI Hero'],
  newTraits: ['RBI Hero', 'Clutch'],
  changedAt: '2024-10-15T18:05:00Z'
}
```

### Rating Changes Log
```javascript
{
  changeId: 1,
  playerId: 'player_123',
  seasonId: 2024,
  previousRating: 94,
  newRating: 97,
  breakdown: {
    awardBonus: 3,
    performanceAdj: 0.5,
    clutchAdj: 0.3,
    ageAdj: 0
  },
  changedAt: '2024-10-15T18:10:00Z'
}
```
