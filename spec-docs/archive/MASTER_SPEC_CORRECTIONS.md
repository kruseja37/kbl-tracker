# KBL XHD Tracker - Master Specification CORRECTIONS & UPDATES

This document addresses all corrections and clarifications to the Master Specification.

---

## 1. Season Game Count Options

**CORRECTION:** Update game count options

**Old:** 20, 40, 60, 82, 100, 162
**New:** 24, 32, 40, 48, 56, 81, 100, 162

```javascript
const GAME_COUNT_OPTIONS = [24, 32, 40, 48, 56, 81, 100, 162];
```

---

## 2. Stadium Stats Tracking

**ADDITION:** Yes, the Stadium tab should include stadium-specific stats.

### Stadium Stats to Track

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
┌─────────────────────────────────────────────────────────────────────┐
│  STADIUM - Oracle Park                                              │
├─────────────────────────────────────────────────────────────────────┤
│  PARK FACTORS (vs League Avg)                                       │
│  • Runs: 0.92 (pitcher-friendly)                                    │
│  • HR: 0.85 (suppresses HR)                                         │
│  • Hits: 0.97                                                       │
│                                                                     │
│  BATTING AT THIS PARK          PITCHING AT THIS PARK                │
│  AVG: .258                     ERA: 3.45                            │
│  HR: 45 (1.1/game)             WHIP: 1.21                           │
│  Runs/Game: 4.2                K/9: 8.5                             │
│                                                                     │
│  NOTABLE MOMENTS                                                    │
│  • Longest HR: 465 ft (Barry Bonds, Game 23)                        │
│  • Walk-off wins: 3                                                 │
│  • No-hitters: 1 (Tom Seaver, Game 31)                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Fitness Categories

**CORRECTION:** Fitness is categorical, not a percentage slider.

### Fitness States

| State | Value | Effect |
|-------|-------|--------|
| **Hurt** | 0% | Cannot play, on IL |
| **Weak** | 20% | Significant penalties |
| **Strained** | 40% | Moderate penalties |
| **Well** | 80% | Minor penalties |
| **Fit** | 100% | Normal performance |
| **Juiced** | 120% | Performance boost |

### Fitness UI

```
┌─────────────────────────────────────────────────────────┐
│  FITNESS - Junior Young Jr                              │
├─────────────────────────────────────────────────────────┤
│  Current: Strained (40%)                                │
│                                                         │
│  Select new Fitness state:                              │
│  ○ Hurt (0%) - Cannot play                              │
│  ○ Weak (20%)                                           │
│  ○ Strained (40%) ← Current                             │
│  ● Well (80%)                                           │
│  ○ Fit (100%)                                           │
│  ○ Juiced (120%)                                        │
│                                                         │
│  Reason: [Rest day, feeling better    ]                 │
│                          [CANCEL]  [SAVE]               │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Player of the Game (POG) System

**CORRECTION:** POG should be app-calculated for fun/tracking only, no stat impact.

### POG Logic

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
┌─────────────────────────────────────────────────────────┐
│  PLAYERS OF THE GAME                                    │
├─────────────────────────────────────────────────────────┤
│  🥇 1st: Barry Bonds - 3-4, HR, 4 RBI                   │
│  🥈 2nd: Tom Seaver - 7 IP, 10 K, 1 ER                  │
│  🥉 3rd: Ozzie Smith - 2-3, diving catch                │
└─────────────────────────────────────────────────────────┘
```

**Tracking:**
- Season POG leader (most 1st place finishes)
- Career POG totals
- No additional stat bonuses (already captured in WAR, Clutch, etc.)

---

## 5. Expanded Clutch/Choke Triggers

**ADDITION:** Comprehensive list of all situational triggers.

### CLUTCH Triggers (Positive)

#### Walk-Off Situations
| Trigger | Clutch Value |
|---------|--------------|
| Walk-off single | +2 |
| Walk-off XBH (2B/3B) | +2 |
| Walk-off HR | +3 |
| Walk-off walk/HBP | +1 |
| Walk-off wild pitch/passed ball (pitcher/catcher gets choke) | +0 (runner) |
| Walk-off error (fielder gets choke) | +0 (batter) |

#### Situational Hitting
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

#### Pitching Clutch
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

#### Defensive Clutch
| Trigger | Clutch Value |
|---------|--------------|
| Caught stealing to end inning | +1 |
| Outfield assist (throw out runner) | +1 |
| Double play turned with RISP | +1 |
| Diving/leaping catch to save run(s) | +1 |
| Robbed home run | +2 |
| Pickoff | +1 |

#### Baserunning Clutch
| Trigger | Clutch Value |
|---------|--------------|
| Stolen base leading to run scored | +1 |
| Taking extra base that leads to run | +1 |
| Tag-up from 3rd on shallow fly | +1 |

### CHOKE Triggers (Negative)

#### Batting Chokes
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

#### Pitching Chokes
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

#### Defensive Chokes
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

#### Baserunning Chokes
| Trigger | Choke Value |
|---------|-------------|
| TOOTBLAN (thrown out on basepaths) | +1 |
| Caught stealing to end inning | +1 |
| Picked off with 2 outs | +1 |
| Picked off to end inning | +2 |
| Out at home on tag-up | +1 |
| Missing sign (running into out) | +1 |

---

## 6. Revised Milestones (Smaller Increments)

**CORRECTION:** Milestones should be achievable in a shorter-season format.

### Career Milestones

#### Batting Milestones (Fame Bonus)

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

#### Pitching Milestones (Fame Bonus)

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

### Season Milestones

#### Positive (Fame Bonus)

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

#### Negative (Fame Boner)

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

### Single Game Milestones

#### Positive (Fame Bonus)

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

#### Negative (Fame Boner)

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

### Unique/Rare Milestones

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

---

## 7. Pre-Season Fame Logic

**CLARIFICATION:** How to assign pre-season Fame based on player attributes.

### Pre-Season Fame Assignment

| Criteria | Fame Value | Examples |
|----------|------------|----------|
| **S-Grade (Legend)** | +3 | Babe Ruth, Willie Mays |
| **A+ Grade with HOF status** | +2 | Mike Trout, Ken Griffey Jr |
| **A Grade (Star)** | +1 | Current stars, former all-stars |
| **B+ Grade or lower** | 0 | Regular players |
| **Known fan favorites** | +1 | Cult heroes, beloved players |
| **Known villains/controversial** | -1 | Dirty players, scandals |
| **Rookie (first season)** | 0 | No reputation yet |

### Implementation

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
┌─────────────────────────────────────────────────────────────────────┐
│  PRE-SEASON FAME ASSIGNMENT                                         │
├─────────────────────────────────────────────────────────────────────┤
│  Auto-assigned based on grade:                                      │
│  • S-Grade players: +3 Fame (5 players)                            │
│  • A+ Grade players: +2 Fame (12 players)                          │
│  • A Grade players: +1 Fame (28 players)                           │
│                                                                     │
│  Manual Overrides:                                                  │
│  [+ ADD OVERRIDE]                                                   │
│                                                                     │
│  │ Player          │ Grade │ Auto │ Override │ Final │            │
│  ├─────────────────┼───────┼──────┼──────────┼───────┤            │
│  │ Babe Ruth       │ S     │ +3   │ -        │ +3    │            │
│  │ Pete Rose       │ A     │ +1   │ -1       │ 0     │ [Edit]     │
│  │ Moonlight Graham│ C     │ 0    │ +1       │ +1    │ [Edit]     │
│                                                     │
│                                    [RESET ALL]  [CONFIRM]          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. All-Star Voting - Replace Traditional Stats

**CORRECTION:** Use Milestones + Fame instead of traditional stats for the 20% "Narrative" component.

### Updated All-Star Voting Formula

```
Votes = (WAR × 0.50 + Clutch × 0.30 + Narrative × 0.20) × 10
```

Where **Narrative (20%)** is calculated from:
- **Seasonal Milestones reached** (positive and negative)
- **Current Fame score** (including pre-season + earned)
- **NOT traditional stats** (those are already in WAR)

```javascript
function calculateNarrativeScore(player) {
  let score = 0;

  // Current Fame (including pre-season and earned)
  score += player.currentFame * 2;  // Weight fame heavily

  // Seasonal milestones hit (count positive, subtract negative)
  score += player.seasonMilestonesPositive * 1;
  score -= player.seasonMilestonesNegative * 0.5;

  // Normalize to scale
  return score;
}
```

### Pitcher All-Star Voting

**SAME FORMULA** for pitchers:

```
Votes = (pWAR × 0.50 + Clutch × 0.30 + Narrative × 0.20) × 10
```

Pitchers use pWAR instead of total WAR, but same weights for Clutch and Narrative.

---

## 9. Trait Randomization - Include Negative Traits

**CORRECTION:** All-Stars and award winners CAN receive negative traits.

### Trait Pool for Randomization

When randomly assigning a trait:
1. **70% chance of positive trait** from appropriate category
2. **30% chance of negative trait** from appropriate category

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

## 10. Award Criteria and Rewards - FULL REVIEW

### MVP

**Criteria:**
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

### Cy Young

**Criteria:**
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
- Random trait

---

### Gold Glove (by position)

**Criteria:**
| Factor | Weight |
|--------|--------|
| fWAR | 60% |
| Fielding % | 20% |
| Eye Test (Fame + Manual Override ±5) | 20% |

**Positions:** C, 1B, 2B, 3B, SS, LF, CF, RF, UTIL, P

**Reward:**
- **+5 to Fielding rating**
- **+3 to Arm rating**
- (NOT a trait)

---

### Silver Slugger (by position)

**Criteria:**
| Factor | Weight |
|--------|--------|
| bWAR | 60% |
| OPS+ / wRC+ | 25% |
| Clutch Hitting | 15% |

*Note: Clutch hitting already factors into bWAR partially, but we give extra weight here.*

**Reward:**
- +5 to Contact OR Power (player's choice)
- +3 to the other (Contact or Power)
- Random trait

---

### Rookie of the Year

**Criteria:** Same as MVP, filtered to rookies only.

**Reward:**
- +5 to two rating categories of choice
- Random trait

---

### Reliever of the Year

**Criteria:**
| Factor | Weight |
|--------|--------|
| pWAR (relief appearances only) | 50% |
| Clutch Score | 35% |
| Narrative (Fame + Milestones) | 15% |

**NOTE:** Saves and Holds are NOT separately counted - they're already reflected in Clutch Score and Fame.

**Reward:**
- +5 to one pitching rating
- +3 to another pitching rating
- Random trait

---

### Manager of the Year

**Criteria:**
| Factor | Weight |
|--------|--------|
| mWAR | 60% |
| Team overperformance vs preseason expectation | 40% |

**NO playoff success** (regular season award).

**Reward:**
- +5 to manager's team bonus pool for EOS adjustments

---

### Kara Kawaguchi Award

**CLARIFICATION:** This is NOT "Bench Player of the Year" - it's specifically for **consistent performance despite low grade**.

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

## 11. Grade Factor Verification

**QUESTION:** Are grade factors large enough to produce meaningful adjustments?

### Analysis

Let's test with sample data:

**Scenario: 40-game season, typical WAR distribution**

| Player | Position | WAR | Peer Median | Diff | Grade | Factor (Pos) | Raw Adj |
|--------|----------|-----|-------------|------|-------|--------------|---------|
| Star CF | CF | 3.5 | 1.5 | +2.0 | A- | 0.30 | +0.6 |
| Average SS | SS | 1.2 | 1.0 | +0.2 | B | 0.75 | +0.15 |
| Scrub 1B | 1B | 1.8 | 0.8 | +1.0 | C | 1.50 | +1.5 |
| Bad Pitcher | SP | -0.5 | 1.5 | -2.0 | B | 1.00 | -2.0 |
| Legend | LF | 2.5 | 1.2 | +1.3 | S | 0.10 | +0.13 |
| Legend Bad | RF | 0.5 | 1.5 | -1.0 | S | 2.50 | -2.5 |

**Problem identified:** Most adjustments are between -2 and +2, which when split across 4 ratings in a category, becomes negligible.

### SOLUTION: Increase Base Factors

**Revised Grade Factors:**

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

### Revised Analysis

| Player | WAR Diff | Grade | Factor | Raw Adj | Rounded |
|--------|----------|-------|--------|---------|---------|
| Star CF | +2.0 | A- | 1.5 | +3.0 | +3 |
| Average SS | +0.2 | B | 2.5 | +0.5 | +1 |
| Scrub 1B | +1.0 | C | 4.0 | +4.0 | +4 |
| Bad Pitcher | -2.0 | B | 2.0 | -4.0 | -4 |
| Legend | +1.3 | S | 0.5 | +0.65 | +1 |
| Legend Bad | -1.0 | S | 5.0 | -5.0 | -5 |

**Now 80% of players fall between -5 and +5**, which is meaningful when distributed across ratings.

---

## 12. Random Events - Hot/Cold Streak Fix

**CORRECTION:** Hot/Cold Streaks should be temporary rating boosts, not mojo changes.

### Hot Streak Event

**Effect:** +5 to two rating categories (randomly selected)
**Duration:** 10 games
**Display:** "ON FIRE 🔥" badge on player

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

### Cold Streak Event

**Effect:** -5 to two rating categories (randomly selected)
**Duration:** 10 games
**Display:** "SLUMPING ❄️" badge on player

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

---

## 13. Replace Contract Dispute and Call-Up Events

**REMOVAL:** Contract Dispute and Call-Up are not implementable.

**REPLACEMENTS:**

### New Event: Veteran Mentor
- Random veteran (age 30+) mentors random young player (age <25)
- Young player gets +3 to one rating

### New Event: Rivalry Ignited
- Two random players from different teams become rivals
- Both get +2 Fame when facing each other's team
- Both get "Clutch" situations when batting/pitching against each other

### New Event: Fan Favorite
- Random player becomes fan favorite
- +2 Fame immediately
- +1 Fame for rest of season for any milestone

### New Event: Media Villain
- Random player gets bad press
- -2 Fame immediately
- Extra Fame Boner scrutiny for rest of season

### Updated Random Events List (20 events)

1. Random Trait (any)
2. Random Good Trait
3. Random Bad Trait
4. Random Secondary Position
5. Random Primary Position
6. Chosen Secondary Position
7. Down 10 in Random Category
8. Up 10 in Random Category
9. Change Personality (Chemistry)
10. Change Stadium
11. Random Batting Stance/Arm Angle
12. Trade
13. Injury (X games)
14. Hot Streak (+5/+5 for 10 games)
15. Cold Streak (-5/-5 for 10 games)
16. Veteran Mentor
17. Rivalry Ignited
18. Fan Favorite (+Fame)
19. Media Villain (-Fame)
20. Manager Fired

---

## 14. Correct SMB4 Trait Names

**CORRECTION:** Ensure all trait names match SMB4 exactly.

### Corrected Trait List

**COMPETITIVE (Orange)**
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

**CRAFTY (Green)**
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

**DISCIPLINED (Purple)**
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

**SPIRITED (Yellow)**
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

**SCHOLARLY (Blue)**
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

## 15. Undo and Reset Features

**ADDITION:** Add Undo and Reset capabilities.

### Undo Feature

- **Always available** during at-bat/play entry
- Undo stack maintains last 10 actions
- Each action shows what will be undone

```
┌─────────────────────────────────────────────────────────┐
│  UNDO LAST ACTION                                       │
├─────────────────────────────────────────────────────────┤
│  Last action: HR recorded for Barry Bonds              │
│  This will remove:                                      │
│  • 1 HR from Barry Bonds                               │
│  • 1 RBI from Barry Bonds                              │
│  • 1 Run from Barry Bonds                              │
│  • Fame bonus from HR milestone                         │
│                                                         │
│                          [CANCEL]  [UNDO]               │
└─────────────────────────────────────────────────────────┘
```

### Reset Season Feature

Located in Settings, with multiple confirmation steps:

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ RESET SEASON                                        │
├─────────────────────────────────────────────────────────┤
│  This will permanently delete all data for Season 3:    │
│  • All game results                                     │
│  • All player stats                                     │
│  • All awards                                           │
│  • All random events                                    │
│                                                         │
│  Type "RESET SEASON 3" to confirm:                      │
│  [                                        ]             │
│                                                         │
│                          [CANCEL]  [RESET]              │
└─────────────────────────────────────────────────────────┘
```

After typing confirmation:

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ FINAL CONFIRMATION                                  │
├─────────────────────────────────────────────────────────┤
│  Are you ABSOLUTELY sure?                               │
│  This cannot be undone.                                 │
│                                                         │
│  [Cancel - Take me back]    [Yes, Reset Everything]     │
└─────────────────────────────────────────────────────────┘
```

---

## 16. Primary Position Tie-Breaker

**CORRECTION:** Let user choose when games are equal.

```
┌─────────────────────────────────────────────────────────┐
│  POSITION TIE-BREAKER - Ozzie Smith                     │
├─────────────────────────────────────────────────────────┤
│  Player has equal games at multiple positions:          │
│                                                         │
│  • SS: 20 games                                         │
│  • 2B: 20 games                                         │
│                                                         │
│  Select primary position for this player:               │
│  ● SS (Shortstop)                                       │
│  ○ 2B (Second Base)                                     │
│                                                         │
│                          [CONFIRM]                      │
└─────────────────────────────────────────────────────────┘
```

---

## Summary of All Changes

| Item | Change |
|------|--------|
| Game counts | 24, 32, 40, 48, 56, 81, 100, 162 |
| Stadium stats | Added park factors and notable events |
| Fitness | Changed to categorical (Hurt/Weak/Strained/Well/Fit/Juiced) |
| POG | App-calculated, no stat impact, tracking only |
| Clutch/Choke | Comprehensive trigger list added |
| Milestones | Smaller increments, negative milestones added |
| Pre-season Fame | Clarified (S=+3, A+=+2, A=+1, overrides available) |
| All-Star voting | Narrative = Fame + Milestones (not traditional stats) |
| Pitcher voting | Same formula as position players (WAR/Clutch/Narrative) |
| Traits | 70% positive, 30% negative for all random assignments |
| Award rewards | Fully revised with correct bonuses |
| Gold Glove | +5 Fielding, +3 Arm (not a trait) |
| Reliever of Year | Removed saves/holds from criteria (in Clutch already) |
| Manager of Year | Removed playoff success (regular season award) |
| Kara Kawaguchi | Clarified as overperformance award for low-grade players |
| Grade factors | Increased ~5x to produce meaningful adjustments |
| Hot/Cold Streak | Changed to +/-5 ratings for 10 games |
| Random events | Replaced Contract Dispute and Call-Up |
| Trait names | Corrected to match SMB4 exactly |
| Undo/Reset | Added with confirmation safeguards |
| Position ties | User chooses primary position |

---

## Still To Address

- **Retirements and Free Agency** (you mentioned explaining this separately)
- Additional testing of grade factors with real data
- Any other corrections from review
