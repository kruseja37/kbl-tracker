# Milestone System Specification

> **GOSPEL ANNOTATION (2026-02-21):** Trigger point moves from post-game batch to event creation time per **KBL_UNIFIED_ARCHITECTURE_SPEC.md Appendix B**. Detection logic, milestone definitions, and Fame Bonus/Boner scaling remain **valid and authoritative**.

> **Purpose**: Define milestone tracking across single-game, season, and career scopes, including both positive (Fame Bonus) and negative (Fame Boner) milestones
> **Status**: IMPLEMENTATION (Phase 1 complete - types, detection logic, scaling)
> **Priority**: Medium (builds on stat tracking infrastructure)
> **Related Specs**: STAT_TRACKING_ARCHITECTURE_SPEC.md, FAME_SYSTEM_TRACKING.md, FAN_MORALE_SYSTEM_SPEC.md, ADAPTIVE_STANDARDS_ENGINE_SPEC.md

---

## Implementation Status

### Completed (Phase 1) - January 2026
- [x] **FameEventType definitions** - All single-game, season, and career milestone types in `src/types/game.ts`
- [x] **FAME_VALUES, FAME_EVENT_LABELS, FAME_TARGET** - Complete mappings for all milestone types
- [x] **Career storage infrastructure** - `src/utils/careerStorage.ts` with IndexedDB operations
- [x] **Milestone detection logic** - `src/utils/milestoneDetector.ts` with:
  - [x] MLB baseline thresholds (dynamically scaled at runtime)
  - [x] Three scaling types: `counting`, `innings`, `none`
  - [x] Season milestone detection with adaptive scaling
  - [x] Career milestone detection (batting, pitching, aggregate, negative)
  - [x] Milestone Watch feature for approaching milestones
- [x] **Per-inning pitch tracking** - State in GameTracker for Immaculate Inning detection
- [x] **Single-game detection functions** - In `src/hooks/useFameDetection.ts`
- [x] **Dual scaling factors** - `gamesPerSeason` AND `inningsPerGame` support

### In Progress (Phase 2)
- [ ] Wire milestone detection into game-end stat aggregation flow
- [ ] Add `MilestoneConfig` to franchise/season metadata storage

### Deferred (Phase 3 - UI Design)
- [ ] Franchise settings UI for season/game configuration
- [ ] Milestone Watch display component
- [ ] Multi-threshold crossing celebration UI
- [ ] Game end milestone summary modal

**Decision (Jan 2026)**: UI design deferred until all backend calculations are complete. The config structure is simple (two numbers), and SMB4 defaults (128 games, 6 innings) work for most users without UI.

---

## 1. Overview

Milestones are **achievement thresholds** at three scopes:
- **Single-Game**: Historic individual performances (e.g., 4 HR game, no-hitter)
- **Season**: Full-season achievements (e.g., 30-30 club, Triple Crown)
- **Career**: Cumulative lifetime stats (e.g., 500 HR, 3000 hits)

Milestones can be **positive** (Fame Bonus) or **negative** (Fame Boner), both contributing to the narrative and affecting player morale, fan morale, and simulation variance.

### 1.1 Design Principles

- **Real-time detection**: Milestones detected immediately when crossed
- **Automatic tracking**: No user input required
- **Adaptive scaling**: Thresholds adjust based on franchise's average season length
- **Fame integration**: Milestones are a primary Fame driver
- **Narrative depth**: Both achievements and failures create stories
- **Morale/Happiness impact**: Milestones affect player morale and fan morale

---

## 2. Adaptive Threshold Scaling

### 2.1 The Problem

With 128-game seasons (vs MLB's 162) AND 6-inning games (vs MLB's 9), players may never reach traditional MLB milestones if we use fixed thresholds. Different stat types are affected differently:

- **Counting stats** (HR, Hits, RBI, Wins) - Affected by season length only
- **Innings-based stats** (IP, Pitcher K, Wild Pitches) - Affected by BOTH season length AND game length
- **Rare events** (No-hitters, Perfect Games, Awards) - No scaling needed

### 2.2 Solution: Dual-Factor Dynamic Scaling

**Implemented in**: `src/utils/milestoneDetector.ts`

Thresholds are stored as **MLB baseline values** and scaled at runtime based on franchise configuration:

```typescript
// Configuration (set during franchise setup)
interface MilestoneConfig {
  gamesPerSeason: number;    // e.g., 128 for SMB4
  inningsPerGame: number;    // e.g., 6 for SMB4
}

// MLB baseline constants
const MLB_BASELINE_GAMES = 162;
const MLB_BASELINE_INNINGS = 9;

// SMB4 defaults
const SMB4_DEFAULT_GAMES = 128;
const SMB4_DEFAULT_INNINGS = 6;

// Scaling factors
function getSeasonScalingFactor(config: MilestoneConfig): number {
  return config.gamesPerSeason / MLB_BASELINE_GAMES;  // e.g., 128/162 = 0.79
}

function getInningsScalingFactor(config: MilestoneConfig): number {
  return config.inningsPerGame / MLB_BASELINE_INNINGS;  // e.g., 6/9 = 0.67
}

function getCombinedScalingFactor(config: MilestoneConfig): number {
  return getSeasonScalingFactor(config) * getInningsScalingFactor(config);  // e.g., 0.79 × 0.67 = 0.53
}
```

### 2.3 Scaling Types

Each milestone threshold specifies its scaling type:

| Scaling Type | Formula | Use Case | Example |
|-------------|---------|----------|---------|
| `counting` | `threshold × seasonFactor` | HR, Hits, RBI, Wins, Saves | 500 HR → 395 HR |
| `innings` | `threshold × combinedFactor` | IP, Pitcher K, Wild Pitches | 3000 IP → 1590 IP |
| `none` | No scaling | No-hitters, Awards, All-Stars | 1 is 1 |

### 2.4 Example Scaling (128-game, 6-inning season)

**Season Factor**: 128/162 = **0.79**
**Innings Factor**: 6/9 = **0.67**
**Combined Factor**: 0.79 × 0.67 = **0.53**

| Stat Type | MLB Threshold | Scaling | SMB4 Threshold |
|-----------|---------------|---------|----------------|
| Career HR | 500 | counting (×0.79) | **395** |
| Career Hits | 3000 | counting (×0.79) | **2370** |
| Career Wins | 300 | counting (×0.79) | **237** |
| Career IP | 3000 | innings (×0.53) | **1590** |
| Career Pitcher K | 3000 | innings (×0.53) | **1590** |
| No-Hitters | 1 | none | **1** |
| MVP Awards | 1 | none | **1** |
| 3000 K | 2370 | **2375 K** |
| 60 HR (season) | 47.4 | **45 HR** |
| 200 Hits (season) | 158 | **160 Hits** |
| 30-30 Club | 23.7-23.7 | **25-25 Club** |
| 40-40 Club | 31.6-31.6 | **30-30 Club** |
| 50-50 Club | 39.5-39.5 | **40-40 Club** |

**Note**: We use the scaled numbers literally. Our "30-30 Club" requires 30 HR + 30 SB in a 128-game season, which is equivalent to MLB's ~38-38 pace.

### 2.4 Threshold Recalculation

Thresholds recalculate at season end if `gamesPerTeam` changes:
- Existing milestones remain valid (earned under previous thresholds)
- Future thresholds adjust based on updated franchise average
- UI shows both raw stat and can optionally show "MLB-equivalent" pace

---

## 2.5 Adaptive Standards Engine

Beyond simple game-count scaling, the **Adaptive Standards Engine** learns from actual franchise data to set contextually appropriate thresholds for rate stats (like ERA and BA) and calculates replacement level for WAR.

> **Full specification**: See `ADAPTIVE_STANDARDS_ENGINE_SPEC.md`

### Key Concepts (Summary)

| Concept | Description |
|---------|-------------|
| **League Baselines** | Calculated after each season (leagueAVG, leagueERA, etc.) |
| **Adaptive Rate Thresholds** | "Elite ERA" = 60% of league ERA, "Mendoza Line" = league AVG - .065 |
| **Replacement Level** | Derived from bottom quintile performance, used for WAR |
| **Year-over-Year Smoothing** | Weighted average (50% current, 30% last year, 20% two years ago) |
| **First-Season Bootstrap** | Uses MLB-like defaults until franchise data exists |

### How Milestones Use the Engine

```typescript
// Counting stats: simple scaling
const hr500Threshold = adaptiveEngine.getScaledThreshold(500);  // → 395

// Rate stats: context-aware
const thresholds = adaptiveEngine.getAdaptiveRateThresholds();
const mendozaLine = thresholds.mendozaLine;  // Varies by league context
const eliteERA = thresholds.eliteERA;        // 60% of league ERA
```

---

## 3. Single-Game Milestones

### 3.1 Positive Single-Game Milestones (Fame Bonus)

#### Batting

| Milestone | Requirement | Fame Bonus | Notes |
|-----------|-------------|------------|-------|
| **Multi-HR Game** | 2 HR in one game | +0.5 | Common but notable |
| **3 HR Game** | 3 HR in one game | +1.5 | Rare power display |
| **4 HR Game** | 4 HR in one game | +4.0 | Historic (16 times in MLB) |
| **Cycle** | Single, double, triple, HR | +2.0 | Speed + power |
| **Natural Cycle** | Cycle in order (1B→2B→3B→HR) | +3.0 | Extremely rare (14 in MLB) |
| **6+ Hit Game** | 6+ hits in one game | +2.0 | Perfect day |
| **7 Hit Game** | 7 hits in one game | +3.5 | Tied MLB record |
| **5+ RBI Game** | 5+ RBI in one game | +0.5 | Clutch production |
| **8+ RBI Game** | 8+ RBI in one game | +2.0 | Monster game |
| **10+ RBI Game** | 10+ RBI in one game | +4.0 | Historic |
| **3+ SB Game** | 3+ stolen bases | +0.5 | Speed showcase |
| **5+ SB Game** | 5+ stolen bases | +2.0 | Elite speed |
| **Walk-Off HR** | Game-winning HR in final at-bat | +1.0 | Dramatic finish |
| **Walk-Off Grand Slam** | Bases-loaded walk-off HR | +3.0 | Ultimate drama |
| **Grand Slam in Debut** | Grand slam in MLB debut | +3.0 | Unforgettable start |

#### Pitching

| Milestone | Requirement | Fame Bonus | Notes |
|-----------|-------------|------------|-------|
| **Perfect Game** | 9+ IP, 27 up, 27 down | +10.0 | Rarest achievement (24 in MLB) |
| **No-Hitter** | 9+ IP, 0 hits allowed | +6.0 | Elite dominance |
| **Combined No-Hitter** | Team no-hitter (multiple pitchers) | +2.0 each | Shared glory |
| **Maddux** | Complete game shutout <100 pitches | +2.5 | Efficiency mastery |
| **Super Maddux** | CGSO <85 pitches | +4.0 | Exceptional efficiency |
| **20 K Game** | 20 strikeouts | +4.0 | Tied MLB record |
| **15+ K Game** | 15+ strikeouts | +1.5 | Dominant stuff |
| **Immaculate Inning** | 3 K on 9 pitches | +1.5 | Perfect inning |
| **Multiple Immaculate** | 2+ immaculate innings same game | +4.0 | Never happened in MLB |
| **Complete Game** | Pitch entire game | +0.5 | Old-school value |
| **Shutout** | Complete game, 0 runs | +1.0 | Dominance |

#### Fielding

| Milestone | Requirement | Fame Bonus | Notes |
|-----------|-------------|------------|-------|
| **Unassisted Triple Play** | 3 outs on one play, solo | +5.0 | Rarest play (15 in MLB) |
| **Triple Play** | 3 outs on one play | +2.0 | Rare defensive gem |
| **Robbed HR** | Catch ball over fence | +1.0 | Highlight reel |
| **Multi-Robbed HR** | 2+ robbed HRs same game | +3.0 | Defensive masterclass |
| **5+ Assist Game** | 5+ assists (infielder) | +0.5 | Busy day |
| **Outfield Assist** | Throw out runner from OF | +0.5 | Strong arm |
| **2+ OF Assists** | Multiple outfield assists | +1.5 | Exceptional arm |

### 3.2 Negative Single-Game Milestones (Fame Boner)

#### Batting

| Milestone | Requirement | Fame Boner | Notes |
|-----------|-------------|------------|-------|
| **Golden Sombrero** | 4 K in one game | -0.5 | Embarrassing |
| **Platinum Sombrero** | 5 K in one game | -1.5 | Brutal day |
| **Titanium Sombrero** | 6 K in one game | -3.0 | Historic futility |
| **0-fer (5+ AB)** | 0 hits in 5+ at-bats | -0.25 | Rough outing |
| **0-for-6+** | 0 hits in 6+ at-bats | -0.5 | Very rough outing |
| **TOOTBLAN** | Thrown out on bases, like a ninny | -0.5 | Baserunning blunder |
| **Multiple TOOTBLAN** | 2+ TOOTBLANs same game | -1.5 | What are you doing? |
| **Picked Off to End Game** | Picked off for final out | -1.0 | Crushing mistake |
| **GIDP in Clutch** | GIDP with RISP, 2 outs, late | -0.5 | Rally killer |

#### Pitching

| Milestone | Requirement | Fame Boner | Notes |
|-----------|-------------|------------|-------|
| **Blown Save** | Enter with lead, leave without | -0.5 | Closer's nightmare |
| **Epic Blown Save** | Blow 3+ run lead in 9th | -1.5 | Devastating |
| **5+ Walk Game** | 5+ walks issued | -0.5 | No control |
| **8+ Walk Game** | 8+ walks issued | -1.5 | Unplayable |
| **5+ ER in <1 IP** | Give up 5+ ER without recording 3 outs | -1.0 | Disaster start |
| **10+ Runs Allowed** | Allow 10+ runs | -2.0 | Shellacked |
| **Hit 3+ Batters** | Hit 3+ batters in one game | -0.5 | Loss of control |
| **Wild Pitch Walk-Off** | Wild pitch scores winning run | -1.5 | Crushing |

#### Fielding

| Milestone | Requirement | Fame Boner | Notes |
|-----------|-------------|------------|-------|
| **3+ Error Game** | 3+ errors in one game | -1.5 | Defensive meltdown |
| **4+ Error Game** | 4+ errors in one game | -3.0 | Historic bad day |
| **Error on Final Out** | Error that prolongs game, leads to loss | -1.0 | Costly mistake |
| **Dropped Pop-Up (bases loaded)** | Drop easy pop-up with bases loaded | -1.5 | Inexcusable |
| **Outfield Collision** | Collide with teammate, ball drops | -0.5 | Communication failure |

---

## 4. Season Milestones

### 4.1 Positive Season Milestones (Fame Bonus)

#### Batting "Clubs" (Using Scaled Numbers)

| Milestone | Requirement | Fame Bonus | MLB Equivalent |
|-----------|-------------|------------|----------------|
| **15-15 Club** | 15 HR + 15 SB | +0.5 | ~19-19 |
| **20-20 Club** | 20 HR + 20 SB | +1.0 | ~25-25 |
| **25-25 Club** | 25 HR + 25 SB | +2.0 | ~32-32 |
| **30-30 Club** | 30 HR + 30 SB | +3.5 | ~38-38 |
| **40-40 Club** | 40 HR + 40 SB | +6.0 | ~51-51 (historic) |
| **15-15-15 Club** | 15 2B + 15 3B + 15 HR | +3.0 | ~19-19-19 |
| **.400 Season** | .400+ batting average | +6.0 | Same (rate stat) |
| **Triple Crown** | Lead league in AVG, HR, RBI | +8.0 | Same |

*Note: Club names use literal scaled numbers. Our "30-30 Club" is equivalent to MLB's ~38-38 pace.*

#### Batting Counting Stats (Scaled Thresholds)

| Milestone | Scaled Threshold | Fame Bonus | MLB Equivalent |
|-----------|-----------------|------------|----------------|
| **40 HR Season** | 40 HR | +2.5 | ~51 HR |
| **45 HR Season** | 45 HR | +4.0 | ~57 HR |
| **55 HR Season** | 55 HR | +6.0 | ~70 HR (record) |
| **160 Hit Season** | 160 hits | +2.0 | ~203 hits |
| **120 RBI Season** | 120 RBI | +2.5 | ~152 RBI |
| **40 SB Season** | 40 SB | +1.5 | ~51 SB |
| **80 SB Season** | 80 SB | +4.0 | ~101 SB |

#### Pitching (Scaled Thresholds)

| Milestone | Scaled Threshold | Fame Bonus | MLB Equivalent |
|-----------|-----------------|------------|----------------|
| **15 Win Season** | 15 wins | +1.5 | ~19 wins |
| **20 Win Season** | 20 wins | +3.0 | ~25 wins |
| **25 Win Season** | 25 wins | +5.0 | ~32 wins (historic) |
| **235 K Season** | 235 K | +2.5 | ~298 K |
| **Sub-2.00 ERA** | ERA < 2.00 (min IP) | +3.0 | Same (rate stat) |
| **Sub-1.50 ERA** | ERA < 1.50 (min IP) | +5.0 | Same (rate stat) |
| **40 Save Season** | 40 saves | +2.5 | ~51 saves |
| **Multiple No-Hitters** | 2+ no-hitters same season | +5.0 | Same |
| **Pitching Triple Crown** | Lead league in W, K, ERA | +6.0 | Same |

#### WAR-Based Season Milestones

| Milestone | Requirement | Fame Bonus | Notes |
|-----------|-------------|------------|-------|
| **5 WAR Season** | 5.0+ total WAR | +1.5 | All-Star caliber |
| **7 WAR Season** | 7.0+ total WAR | +3.0 | MVP candidate |
| **10 WAR Season** | 10.0+ total WAR | +5.0 | Historic season |
| **12+ WAR Season** | 12.0+ total WAR | +8.0 | Inner-circle HOF season |
| **5+ bWAR Season** | 5.0+ batting WAR | +2.0 | Elite offensive value |
| **5+ pWAR Season** | 5.0+ pitching WAR | +2.0 | Elite pitching value |
| **3+ fWAR Season** | 3.0+ fielding WAR | +2.0 | Gold Glove caliber |
| **2+ rWAR Season** | 2.0+ baserunning WAR | +1.5 | Elite baserunning |

**Note**: WAR thresholds do NOT scale with season length because WAR already accounts for playing time. A 10 WAR season is equally impressive whether in 128 or 162 games.

**Total WAR Calculation by Player Type:**
```typescript
// ALL players get ALL applicable WAR components
// Since pitchers hit (no universal DH), everyone accumulates bWAR, fWAR, rWAR
// Pitchers ALSO get pWAR for their pitching value

function calculateTotalWAR(player: Player, stats: SeasonStats): number {
  // Base components everyone gets (batting, fielding, baserunning)
  let totalWAR = stats.bWAR + stats.fWAR + stats.rWAR;

  // Add pitching WAR if player pitched
  if (stats.pitchingGames > 0) {
    totalWAR += stats.pWAR;
  }

  return totalWAR;
}

// Summary:
// Position Player WAR = bWAR + fWAR + rWAR
// Pitcher WAR = pWAR + bWAR + fWAR + rWAR (pitchers hit!)
// Two-Way Player WAR = pWAR + bWAR + fWAR + rWAR (same as pitcher, but with significant batting)
```

**Note**: Since SMB4 allows pitchers to hit (DH is optional), ALL players accumulate batting, fielding, and baserunning WAR. Pitchers simply add their pWAR on top. The "two-way" designation is about *significant* batting production (49+ PA), not whether they hit at all.

**Two-Way Detection Thresholds** (from EOS_RATINGS_ADJUSTMENT_SPEC):
- 5+ pitching games AND 49+ PA (for 40-game season)
- Scales with season length: `round(20 × seasonGames/162)` and `round(200 × seasonGames/162)`

*Note: ERA thresholds are rate stats and don't scale. After Season 1, the Adaptive Standards Engine may adjust these based on actual league ERA.*

### 4.2 Negative Season Milestones (Fame Boner)

#### Batting

| Milestone | Requirement | Fame Boner | Notes |
|-----------|-------------|------------|-------|
| **200 K Season** | 200+ strikeouts | -1.0 | Whiff city |
| **250 K Season** | 250+ strikeouts | -2.0 | Historic futility |
| **Sub-.200 Season** | BA < .200 (min PA) | -1.5 | Mendoza line failure |
| **30+ GIDP Season** | 30+ ground into DP | -1.0 | Rally killer |
| **20+ Error Season** | 20+ errors | -1.5 | Defensive liability |

#### Pitching

| Milestone | Requirement | Fame Boner | Notes |
|-----------|-------------|------------|-------|
| **20 Loss Season** | 20+ losses | -2.0 | Rough year |
| **6.00+ ERA Season** | ERA 6.00+ (min IP) | -1.5 | Unplayable |
| **100+ BB Season** | 100+ walks issued | -0.5 | Control issues |
| **20+ Blown Save Season** | 20+ blown saves | -2.0 | Not a closer |
| **40+ HR Allowed** | 40+ HR given up | -1.0 | Home run derby |

---

## 5. Career Milestones

### 5.0 Career Milestone Methodology

> **AUTHORITATIVE DECISION (January 2026)**: Hall of Fame and elite career thresholds use **Dynamic Top 10%** as the primary methodology. Fixed thresholds serve as a **minimum floor** for early-franchise situations and as historical reference points.

#### Dual-Threshold System

Career milestones use a **dual-threshold approach**:

1. **Dynamic 10% Threshold (Primary)**: Calculated from actual franchise history
   - Recalculated after each season based on all completed careers
   - Represents "top 10% of all players who have played in this franchise"
   - Adapts naturally to franchise-specific performance levels

2. **Fixed Threshold Floor (Secondary)**: Pre-scaled MLB-based minimums
   - Prevents HOF/elite status from being "too easy" in early franchise years
   - Ensures baseline achievement standards
   - Gradually becomes irrelevant as franchise history accumulates

```typescript
function getEffectiveThreshold(
  stat: string,
  franchiseHistory: FranchiseHistory
): number {
  const dynamicThreshold = calculateTop10Percentile(
    franchiseHistory.getAllCareerValues(stat)
  );
  const fixedFloor = FIXED_THRESHOLD_FLOORS[stat];

  // Use whichever is HIGHER (more demanding)
  return Math.max(dynamicThreshold, fixedFloor);
}

// Example: Career HR
// - Year 2: Dynamic 10% might be 45 HR, Fixed floor is 395 HR → Use 395
// - Year 15: Dynamic 10% might be 420 HR, Fixed floor is 395 HR → Use 420
```

#### When Dynamic Thresholds Activate

Dynamic thresholds become meaningful when:
- Franchise has **10+ completed careers** (retired players)
- At least **3 seasons** of history exist

Before these minimums are met, fixed floors are used exclusively.

### 5.1 Positive Career Milestones (Fame Bonus)

> **Note**: The thresholds below are **fixed floors** (scaled from MLB baselines). Once franchise history is sufficient, the **dynamic 10% threshold** may be higher and takes precedence.

#### Batting (Fixed Floor Thresholds)

| Stat | Floor Thresholds (scaled for 0.79) | Fame Bonus per Tier |
|------|------------------------------|---------------------|
| **Career HR** | 20, 40, 80, 120, 160, 200, 240, 315, 395, 475, 555 | 0.25 → 0.5 → 1.0 → 1.0 → 1.5 → 2.0 → 3.0 → 4.0 → 6.0 → 8.0 → 10.0 |
| **Career Hits** | 200, 395, 790, 1185, 1580, 1975, 2370 | 0.25 → 0.5 → 1.0 → 1.5 → 2.5 → 4.0 → 6.0 |
| **Career RBI** | 200, 395, 590, 790, 1185, 1580 | 0.25 → 0.5 → 0.75 → 1.0 → 1.5 → 2.0 |
| **Career Runs** | 200, 395, 590, 790, 1185, 1580 | 0.25 → 0.5 → 0.75 → 1.0 → 1.5 → 2.0 |
| **Career SB** | 40, 80, 160, 240, 315, 395 | 0.25 → 0.5 → 1.0 → 1.5 → 2.0 → 3.0 |
| **Career 2B** | 80, 160, 240, 315, 395, 475 | 0.25 → 0.5 → 1.0 → 1.5 → 2.0 → 2.5 |
| **Career BB** | 200, 395, 590, 790, 1185, 1580 | 0.25 → 0.5 → 0.75 → 1.0 → 1.5 → 2.0 |
| **Career Grand Slams** | 4, 8, 12, 16, 20 | 0.5 → 1.0 → 1.5 → 2.0 → 3.0 |

#### Pitching (Fixed Floor Thresholds)

| Stat | Floor Thresholds (scaled) | Fame Bonus per Tier |
|------|---------------------|---------------------|
| **Career Wins** | 20, 40, 80, 120, 160, 200, 240 | 0.25 → 0.5 → 1.0 → 1.5 → 3.0 → 4.0 → 6.0 |
| **Career K** | 200, 395, 790, 1185, 1580, 1975, 2370 | 0.25 → 0.5 → 1.0 → 1.5 → 2.5 → 4.0 → 6.0 |
| **Career Saves** | 40, 80, 120, 160, 200, 240, 315, 395 | 0.5 → 1.0 → 1.5 → 2.0 → 3.0 → 4.0 → 5.0 → 7.0 |
| **Career IP** | 395, 790, 1185, 1580, 1975, 2370 | 0.25 → 0.5 → 1.0 → 1.5 → 2.0 → 2.5 |
| **Career Shutouts** | 8, 16, 24, 32, 40, 48 | 0.5 → 1.0 → 1.5 → 2.0 → 3.0 → 4.0 |
| **Career CG** | 20, 40, 60, 80, 120 | 0.5 → 1.0 → 1.5 → 2.0 → 3.0 |
| **Career No-Hitters** | 1, 2, 3, 4, 5, 6, 7 | 2.0 → 3.0 → 4.0 → 5.0 → 6.0 → 7.0 → 8.0 |
| **Career Perfect Games** | 1, 2 | 5.0 → 8.0 |

#### Aggregate (Scaled Thresholds)

> **Important Scaling Note**: Unlike SEASON WAR milestones (which don't scale because WAR is rate-adjusted), CAREER WAR milestones DO scale with `opportunityFactor` because career accumulation depends on season length.
>
> A player in 50-game seasons accumulates WAR at 50/162 = 0.31× the rate of a 162-game player. After 10 seasons, they'd have ~31% of the career WAR. Thresholds scale accordingly.

| Stat | MLB Baseline | Scaling | 50-game/9-inn Example |
|------|--------------|---------|----------------------|
| **Career WAR** | 10, 20, 30, 40, 50, 60, 70, 80, 100 | `× opportunityFactor` | 3, 6, 9, 12, 15, 18, 22, 25, 31 |
| **Career Games** | 200, 395, 590, 790, 1185, 1580 | `× gamesPerSeason/162` | 62, 122, 182, 244, 366, 488 |
| **Career All-Stars** | 1, 3, 5, 7, 10, 12, 15 | No scaling | Same (awards don't scale) |
| **Career MVPs** | 1, 2, 3, 4 | No scaling | Same (awards don't scale) |
| **Career Cy Youngs** | 1, 2, 3, 4, 5 | No scaling | Same (awards don't scale) |

**Fame Bonus per Tier (unchanged):**
- Career WAR: 0.5 → 1.0 → 2.0 → 3.0 → 5.0 → 6.0 → 8.0 → 10.0 → 15.0
- Career Games: 0.25 → 0.5 → 0.75 → 1.0 → 1.5 → 2.0
- Career All-Stars: 0.5 → 1.0 → 1.5 → 2.5 → 4.0 → 5.0 → 7.0
- Career MVPs: 2.0 → 4.0 → 7.0 → 10.0
- Career Cy Youngs: 2.0 → 4.0 → 7.0 → 10.0 → 12.0

#### WAR Component Milestones (Career)

These milestones recognize excellence in specific aspects of the game, using our established WAR component system (bWAR, pWAR, fWAR, rWAR).

| Stat | Thresholds | Fame Bonus per Tier | Notes |
|------|------------|---------------------|-------|
| **Career bWAR** (Batting) | 5, 15, 25, 35, 50, 65 | 0.5 → 1.0 → 2.0 → 3.0 → 5.0 → 7.0 | wOBA → wRAA → Batting Runs |
| **Career pWAR** (Pitching) | 5, 15, 25, 35, 50, 65 | 0.5 → 1.0 → 2.0 → 3.0 → 5.0 → 7.0 | FIP-based value |
| **Career fWAR** (Fielding) | 3, 8, 15, 22, 30 | 0.5 → 1.0 → 2.0 → 3.0 → 5.0 | Per-play OAA-style |
| **Career rWAR** (Baserunning) | 2, 5, 10, 15, 20 | 0.5 → 1.0 → 1.5 → 2.5 → 4.0 | wSB + UBR + wGDP |

**Design Note**: These thresholds are lower than total WAR thresholds because component WAR naturally caps lower. A 50 career fWAR would be historically elite (like Ozzie Smith levels); 20 career rWAR would be an all-time baserunning legend.

### 5.2 Team MVP & Franchise Cornerstone Status (WAR-Based)

#### Team MVP (Season WAR Leader)

At the end of each season, the player with the **highest WAR on each team** is designated as **Team MVP** and becomes the team's **Cornerstone** for the next season.

| Achievement | Fame Bonus | Notes |
|-------------|------------|-------|
| **Team MVP (Season WAR Leader)** | +1.5 | Highest WAR on team; becomes Cornerstone |
| **Retained Cornerstone** | +0.5 | Remained team's best player for consecutive season |
| **New Cornerstone** | +1.0 | Took over Cornerstone status from previous holder |

**Cornerstone Benefits**:
- Receives emblem/visual indicator in UI
- +10% less likely to leave in free agency
- Fans rally around the franchise player (happiness boost)

#### Legacy Status Tiers

Players achieve special "Legacy Status" tiers based on sustained WAR production with a single team. These are cumulative milestones that recognize franchise loyalty combined with production.

> **Reference**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md, Section 9815+

| Status | Requirements | Fame Bonus | Description |
|--------|--------------|------------|-------------|
| **Franchise Cornerstone** | 2+ seasons, 5+ WAR with team | +2.0 | Established contributor |
| **Franchise Icon** | 3+ seasons, 10+ WAR, 1+ major award | +4.0 | Team defining player |
| **Franchise Legend** | 5+ seasons, 18+ WAR, 2+ awards, HOF-caliber | +8.0 | All-time great status |

**Major Awards** (for Icon/Legend status):
- MVP
- Cy Young
- Rookie of the Year
- All-Star Game MVP
- League Championship Series MVP
- World Series MVP

**HOF-Caliber** (for Legend status):
- Career WAR ≥ 50 OR
- 8+ All-Star selections OR
- 3+ MVP/Cy Young awards

```typescript
interface FranchiseCornerstoneStatus {
  tier: 'cornerstone' | 'icon' | 'legend' | null;
  seasonsWithTeam: number;
  warWithTeam: number;
  majorAwards: string[];
  isHofCaliber: boolean;
  achievedAt?: {
    seasonId: string;
    timestamp: number;
  };
}

const CORNERSTONE_THRESHOLDS = {
  cornerstone: {
    minSeasons: 2,
    minWAR: 5.0,
    minAwards: 0,
    requiresHOF: false,
  },
  icon: {
    minSeasons: 3,
    minWAR: 10.0,
    minAwards: 1,
    requiresHOF: false,
  },
  legend: {
    minSeasons: 5,
    minWAR: 18.0,
    minAwards: 2,
    requiresHOF: true,
  },
};
```

**Implementation Notes**:
1. **Team-Specific**: WAR must be accumulated with the SAME team. Traded players start fresh with new team.
2. **Check Timing**: Evaluated at end of each season, not mid-season.
3. **One-Time Award**: Each tier is awarded once per player per team. A player can be a Cornerstone with multiple teams.
4. **Retirement Consideration**: Status persists after retirement. A player who was a "Franchise Legend" remains so in history.

### 5.3 Negative Career Milestones (Fame Boner)

#### Batting

| Stat | Thresholds (scaled) | Fame Boner per Tier |
|------|---------------------|---------------------|
| **Career K (batter)** | 395, 790, 1185, 1580, 2050 | -0.25 → -0.5 → -1.0 → -1.5 → -2.0 |
| **Career GIDP** | 80, 160, 240, 315 | -0.25 → -0.5 → -1.0 → -1.5 |
| **Career CS** | 80, 120, 160, 200 | -0.25 → -0.5 → -0.75 → -1.0 |

#### Pitching

| Stat | Thresholds (scaled) | Fame Boner per Tier |
|------|---------------------|---------------------|
| **Career Losses** | 80, 120, 160, 200, 250 | -0.25 → -0.5 → -1.0 → -1.5 → -2.0 |
| **Career Blown Saves** | 20, 40, 60, 80, 100 | -0.5 → -1.0 → -1.5 → -2.0 → -3.0 |
| **Career Wild Pitches** | 80, 120, 160, 200, 270 | -0.25 → -0.5 → -0.75 → -1.0 → -1.5 |
| **Career HBP (pitcher)** | 80, 120, 160, 200, 220 | -0.25 → -0.5 → -0.75 → -1.0 → -1.5 |

#### Fielding

| Stat | Thresholds (scaled) | Fame Boner per Tier |
|------|---------------------|---------------------|
| **Career Errors** | 80, 160, 315, 475, 630, 790 | -0.25 → -0.5 → -1.0 → -1.5 → -2.0 → -3.0 |
| **Career Passed Balls** | 40, 80, 120, 160 | -0.25 → -0.5 → -1.0 → -1.5 |

---

## 6. Franchise Firsts & Leaders

This section covers individual player fame events tied to franchise history—being the first to achieve something in franchise history, or holding/taking franchise records.

### 6.1 Franchise Firsts (Fame Bonus)

Players receive a Fame boost for being the **first player in franchise history** to achieve any milestone. This creates excitement in early franchise seasons and rewards pioneers.

| Milestone Type | First-Ever Fame Bonus | Notes |
|---------------|----------------------|-------|
| **First HR** | +0.5 | First home run ever hit in franchise |
| **First Grand Slam** | +1.0 | First grand slam in franchise history |
| **First No-Hitter** | +2.0 | First no-hitter thrown for franchise |
| **First Perfect Game** | +3.0 | First perfect game in franchise |
| **First Cycle** | +1.0 | First cycle hit in franchise |
| **First Walk-Off HR** | +0.75 | First walk-off HR in franchise |
| **First 30-30 Season** | +1.5 | First 30-30 club member |
| **First 40-40 Season** | +2.5 | First 40-40 club member |
| **First Triple Crown** | +2.0 | First batting/pitching triple crown |
| **First 20-Win Season** | +1.0 | First 20-game winner |
| **First 40-Save Season** | +1.0 | First 40-save closer |
| **First 100 Career HR** | +0.5 | First to 100 HR (any tier first counts) |
| **First 200 Career HR** | +0.75 | First to 200 HR |
| **First 300 Career HR** | +1.0 | First to 300 HR |
| **First 1000 Career Hits** | +0.75 | First to 1000 hits |
| **First 2000 Career Hits** | +1.5 | First to 2000 hits |
| **First 100 Career Wins** | +0.75 | First to 100 pitching wins |
| **First 200 Career Wins** | +1.5 | First to 200 pitching wins |
| **First 1000 Career K** | +0.75 | First to 1000 pitcher strikeouts |
| **First 2000 Career K** | +1.5 | First to 2000 pitcher strikeouts |

**Implementation Note**: Track `franchiseFirsts` in franchise metadata. When any milestone is achieved, check if it's the first instance in franchise history.

```typescript
interface FranchiseFirstsTracker {
  franchiseId: string;
  firsts: {
    [milestoneKey: string]: {
      playerId: string;
      playerName: string;
      achievedAt: number;
      seasonId: string;
      value: number;
    };
  };
}

// Example milestoneKey values:
// 'first_hr', 'first_grand_slam', 'first_no_hitter'
// 'first_career_hr_100', 'first_career_hr_200', etc.
// 'first_season_30_30', 'first_season_triple_crown'
```

### 6.2 Franchise Leader Fame (Fame Bonus)

Players receive ongoing Fame boosts for **being the franchise leader** or **becoming a new franchise leader** in key statistical categories.

#### When Franchise Leaders Are Tracked

- **First check**: After 50% of first season complete (dynamically calculated: `gamesPerSeason / 2`)
  - Example: 128-game season → game 64; 162-game season → game 81; 48-game season → game 24
- **Subsequent checks**: After every game when career stats update
- **Leader threshold**: Must have played at least 1 full season OR be in first season past midpoint

```typescript
function isLeaderTrackingActive(
  currentGame: number,
  gamesPerSeason: number,
  currentSeason: number
): boolean {
  const midpointGame = Math.floor(gamesPerSeason / 2);
  return currentSeason > 1 || currentGame >= midpointGame;
}
```

#### Taking the Lead (One-Time Bonus)

| Category | Fame Bonus | Notes |
|----------|------------|-------|
| **New HR Leader** | +1.0 | Taking franchise lead in career HR |
| **New Hits Leader** | +1.0 | Taking franchise lead in career hits |
| **New RBI Leader** | +0.75 | Taking franchise lead in career RBI |
| **New SB Leader** | +0.75 | Taking franchise lead in career SB |
| **New Wins Leader** | +1.0 | Taking franchise lead in career wins |
| **New Saves Leader** | +0.75 | Taking franchise lead in career saves |
| **New K Leader (pitcher)** | +1.0 | Taking franchise lead in career K |
| **New WAR Leader** | +1.5 | Taking franchise lead in career WAR |

#### Holding the Lead (Season-End Bonus)

At the end of each season, players who are franchise leaders receive a small bonus:

| Category | Annual Leader Bonus | Notes |
|----------|---------------------|-------|
| **HR Leader** | +0.25 | Retained each full season as leader |
| **Hits Leader** | +0.25 | Retained each full season as leader |
| **RBI Leader** | +0.2 | Retained each full season as leader |
| **Wins Leader** | +0.25 | Retained each full season as leader |
| **WAR Leader** | +0.3 | Retained each full season as leader |

#### Franchise Record Breaking

When a player extends their own record OR breaks a previous player's record significantly:

| Achievement | Fame Bonus | Condition |
|-------------|------------|-----------|
| **Beat Previous Record** | +0.5 | Pass previous franchise record holder |
| **Extend Record by 10%** | +0.5 | Beat your own record by 10%+ |
| **Double Previous Record** | +1.5 | Reach 2× the old franchise record |

### 6.3 Franchise Leader Categories

**Batting Leaders Tracked:**
- Home Runs
- Hits
- RBI
- Runs
- Stolen Bases
- Doubles
- Triples
- Walks
- Batting Average (min PA)
- OPS (min PA)

**Pitching Leaders Tracked:**
- Wins
- Saves
- Strikeouts
- Innings Pitched
- Shutouts
- Complete Games
- ERA (min IP, lower is better)
- WHIP (min IP, lower is better)

**Aggregate Leaders Tracked:**
- WAR
- Games Played
- All-Star Selections
- MVP Awards
- Cy Young Awards

### 6.4 Data Structure

```typescript
interface FranchiseLeaders {
  franchiseId: string;
  lastUpdated: number;

  leaders: {
    [category: string]: {
      current: {
        playerId: string;
        playerName: string;
        value: number;
        sinceSeasonId: string;  // When they took the lead
      };
      allTime: Array<{
        playerId: string;
        playerName: string;
        finalValue: number;
        seasonsAsLeader: number;
      }>;
    };
  };
}

interface FranchiseLeaderEvent {
  type: 'took_lead' | 'retained_lead' | 'broke_record' | 'extended_record';
  category: string;
  playerId: string;
  playerName: string;
  newValue: number;
  previousLeader?: {
    playerId: string;
    playerName: string;
    value: number;
  };
  fameBonus: number;
}
```

### 6.5 Implementation Notes

1. **Early Season Handling**: In the first half of Season 1, no franchise leaders exist yet. After the midpoint, initialize leaders from current stats.

2. **Tied Leaders**: If players are tied, the player who reached the value first is the leader. New player must exceed (not just tie) to take the lead.

3. **Retired Players**: Retired players remain in all-time lists but cannot hold "current leader" status. Active players compete against their records.

4. **Adaptive Thresholds**: Franchise records use the same scaling as milestone thresholds. A "franchise HR record" of 45 in a 128-game league is equivalent to ~57 in MLB.

5. **Fame Integration**: Franchise leader events are FameEvents with types like `FRANCHISE_FIRST_HR`, `FRANCHISE_NEW_HR_LEADER`, `FRANCHISE_LEADER_RETAINED`.

---

## 7. Team Milestones

### 7.1 Positive Team Milestones

| Milestone | Requirement | Fame Bonus (all players) | Fan Morale |
|-----------|-------------|--------------------------|---------------|
| **100-Win Season** | 100+ wins (scaled: 79+) | +0.5 each | +15% |
| **110-Win Season** | 110+ wins (scaled: 87+) | +1.0 each | +25% |
| **Division Title** | Win division | +0.5 each | +10% |
| **Pennant** | Win league championship | +1.5 each | +20% |
| **World Series Win** | Win championship | +3.0 each | +40% |
| **Repeat Champions** | Back-to-back titles | +5.0 each | +50% |
| **Dynasty** | 3+ titles in 5 years | +8.0 each | +60% |
| **Perfect Record vs Rival** | Sweep season series vs rival | +0.25 each | +5% |
| **Longest Win Streak** | Franchise record win streak | +0.5 each | +8% |

### 7.2 Negative Team Milestones (Fame Boner)

| Milestone | Requirement | Fame Boner (all players) | Fan Morale |
|-----------|-------------|--------------------------|---------------|
| **100-Loss Season** | 100+ losses (scaled: 79+) | -0.5 each | -20% |
| **110-Loss Season** | 110+ losses (scaled: 87+) | -1.0 each | -35% |
| **Worst Record** | Worst in franchise history | -1.5 each | -40% |
| **Playoff Sweep Loss** | Get swept in playoffs | -0.5 each | -15% |
| **Blown 3-0 Lead** | Lose series after 3-0 start | -2.0 each | -30% |
| **Longest Losing Streak** | Franchise record loss streak | -0.5 each | -10% |
| **Winless vs Rival** | Go 0-fer in season series | -0.25 each | -8% |
| **No Playoffs (5+ years)** | Miss playoffs 5+ straight | -0.25 each | -5%/year |

---

## 8. Multi-Threshold Crossing

### 8.1 Handling Threshold Jumps

When a player crosses multiple thresholds in one play (e.g., RBI goes from 497 to 502):

```typescript
function handleMultiThresholdCrossing(
  oldValue: number,
  newValue: number,
  thresholds: number[],
  context: GameContext
): AchievedMilestone[] {
  const crossed = thresholds.filter(t => oldValue < t && newValue >= t);

  // Celebrate all crossed thresholds, but emphasize the highest
  return crossed.map((threshold, index) => ({
    threshold,
    isPrimary: index === crossed.length - 1,  // Highest threshold is primary
    // ... rest of milestone data
  }));
}
```

### 8.2 UI Treatment

When multiple thresholds crossed:
- Show **primary celebration** for highest threshold
- List other crossed thresholds in "also achieved" section
- Example: "500 RBI! (also passed 498, 499)" - but for real thresholds

---

## 9. Impact on Other Systems

### 9.1 Player Morale Impact

Milestones affect inferred player morale:

```typescript
interface MilestoneMoraleEffect {
  // Positive milestones boost morale
  positiveBoost: number;      // +0.05 to +0.15 based on tier
  boostDuration: number;      // Games the effect lasts

  // Negative milestones hurt morale
  negativePenalty: number;    // -0.03 to -0.10 based on severity
  penaltyDuration: number;
}

// Career milestone gives lasting morale boost
// Single-game boner gives temporary morale penalty
```

### 9.2 Fan Morale Impact

Milestones affect team fan morale:

```typescript
interface MilestoneFanEffect {
  type: 'player' | 'team';
  happinessChange: number;    // Percentage change

  // Player milestones affect individual player's fan following
  // Team milestones affect overall franchise happiness
}
```

**Examples:**
- Player reaches 500 HR: +2% team happiness, player becomes fan favorite
- Team has 100-loss season: -20% happiness, fans frustrated
- Player has Golden Sombrero: -0.1% happiness (minor embarrassment)
- Team wins World Series: +40% happiness, parade!

### 9.3 Simulation Variance

Milestones influence simulation:

```typescript
interface MilestoneSimEffect {
  // Players approaching major milestones
  approachingBoost: number;     // Slight boost when close

  // Players with recent negative milestones
  slumpPenalty: number;         // May continue struggling

  // High-fame players with many positive milestones
  clutchBonus: number;          // Better in big moments
}
```

---

## 10. Data Structures

### 10.1 Milestone Type Definition

```typescript
type MilestoneScope = 'single_game' | 'season' | 'career';
type MilestonePolarity = 'positive' | 'negative';
type MilestoneCategory = 'batting' | 'pitching' | 'fielding' | 'team' | 'aggregate';

interface MilestoneDefinition {
  id: string;
  scope: MilestoneScope;
  polarity: MilestonePolarity;
  category: MilestoneCategory;

  name: string;                // "4 HR Game"
  description: string;         // "Hit 4 home runs in a single game"

  // Detection
  statKey: string;             // "hr"
  threshold: number;           // 4
  comparison: 'gte' | 'lte' | 'eq';  // >= 4

  // For career milestones with multiple tiers
  thresholds?: number[];       // [50, 100, 200, 300, 400, 500]

  // Rewards/penalties
  fameChange: number;          // +4.0 or -1.0
  moraleEffect?: MilestoneMoraleEffect;
  fanEffect?: MilestoneFanEffect;

  // UI
  celebrationTier: 'minor' | 'major' | 'legendary';
  icon: string;                // Emoji or icon name

  // Scaling
  scalesWithSeason: boolean;   // Does threshold scale?
}
```

### 10.2 Achieved Milestone Record

```typescript
interface AchievedMilestone {
  id: string;
  definitionId: string;
  playerId: string;
  playerName: string;
  teamId: string;

  // Context
  scope: MilestoneScope;
  polarity: MilestonePolarity;
  threshold: number;           // The threshold crossed
  actualValue: number;         // The actual value achieved

  // When/where
  achievedAt: {
    timestamp: number;
    seasonId: string;
    seasonNumber: number;
    gameId?: string;           // Not present for career milestones at season end
    gameNumber?: number;
    inning?: number;
    playDescription?: string;  // "Solo HR to left field"
  };

  // Historical
  isFirstInFranchise: boolean;
  franchiseRank: number;

  // Effects applied
  famePointsAwarded: number;

  // Metadata
  wasSimulated: boolean;
}
```

---

## 11. Detection Logic

### 11.1 Detection Timing

| Scope | When to Check | Example |
|-------|---------------|---------|
| **Single-Game** | After each at-bat/play | 4th HR in a game |
| **Season** | After each game + season end | 40-40 club |
| **Career** | After each stat update | 500th career HR |

### 11.2 Multi-Stat Milestone Detection

For "club" milestones requiring multiple stats:

```typescript
function checkClubMilestone(
  playerSeasonStats: PlayerSeasonStats,
  clubDef: ClubMilestoneDefinition
): boolean {
  // Example: 30-30 club
  // clubDef.requirements = [{ stat: 'hr', threshold: 30 }, { stat: 'sb', threshold: 30 }]

  return clubDef.requirements.every(req =>
    playerSeasonStats[req.stat] >= getScaledThreshold(req.threshold)
  );
}
```

---

## 12. Resolved Questions

| Question | Decision |
|----------|----------|
| Threshold scaling | ✅ Adaptive scaling based on franchise avg games/season |
| Negative milestones | ✅ Yes, affects morale and fan morale |
| Multi-threshold crossing | ✅ Celebrate highest, note others |
| Team milestones | ✅ Yes, separate category affecting all players |
| Grand slam = 1 HR | ✅ Correct, affects RBI milestones not HR |
| **HOF/Elite Threshold Methodology** | ✅ **Dynamic 10%** is authoritative (Jan 2026). Fixed thresholds serve as minimum floor only. See Section 5.0 and OFFSEASON_SYSTEM_SPEC.md Section 16. |

---

## 13. References

| Document | Relevance |
|----------|-----------|
| STAT_TRACKING_ARCHITECTURE_SPEC.md | Career stat aggregation |
| FAME_SYSTEM_TRACKING.md | Fame bonus/boner integration |
| FAN_MORALE_SYSTEM_SPEC.md | Happiness effects |
| GAME_SIMULATION_SPEC.md | Simulation variance |
| **OFFSEASON_SYSTEM_SPEC.md (Section 16)** | **Authoritative HOF eligibility criteria using Dynamic 10%** |

**Research Sources:**
- [MLB Single-Game Records](https://en.wikipedia.org/wiki/List_of_Major_League_Baseball_single-game_records)
- [30-30 Club History](https://en.wikipedia.org/wiki/30%E2%80%9330_club)
- [40-40 Club](https://en.wikipedia.org/wiki/40%E2%80%9340_club)
- [Career Error Leaders](https://www.baseball-reference.com/leaders/E_tf_career.shtml)
- [MLB Worst Records](https://www.espn.com/mlb/story/_/id/40711227/what-worst-records-mlb-history)

---

*Last Updated: January 23, 2026 (v3 - implementation phase started)*
*Status: IMPLEMENTATION*

## Implementation Progress

### Completed
- [x] FameEventType definitions in `src/types/game.ts` (all single-game, season, career types)
- [x] FAME_VALUES, FAME_EVENT_LABELS, FAME_TARGET mappings
- [x] Career storage infrastructure (`src/utils/careerStorage.ts`)
- [x] Milestone detection logic (`src/utils/milestoneDetector.ts`)
  - [x] Pre-scaled career thresholds matching spec (0.79 factor)
  - [x] Season milestone detection with adaptive scaling
  - [x] Career milestone detection (batting, pitching, aggregate)
  - [x] Negative milestone detection
  - [x] Milestone Watch feature for approaching milestones
- [x] Per-inning pitch tracking for Immaculate Inning detection
- [x] Single-game detection functions in `useFameDetection.ts`

### In Progress
- [x] Wire milestone detection into stat aggregation flow (Jan 2026 - `milestoneAggregator.ts`)
- [ ] Configurable gamesPerSeason (currently uses constant)

### Completed (Phase 2) - January 2026
- [x] **Milestone Aggregation** - `src/utils/milestoneAggregator.ts` wires detection into game-end flow
- [x] **Franchise Firsts tracking** - `src/utils/franchiseStorage.ts` tracks first-ever achievements
- [x] **Franchise Leaders system** - Tracks and awards fame for franchise record holders
- [x] Franchise leader detection starting at dynamic season midpoint (`gamesPerSeason / 2`)
- [x] **Career stat aggregation** - Game → Season → Career flow with milestone detection
- [x] **Franchise-aware aggregation** - `aggregateGameToSeason()` accepts franchise context

### Pending
- [ ] UI components for Milestone Watch display
- [ ] Multi-threshold crossing celebration UI
- [ ] Team milestones
- [ ] **WAR Component Milestones** - bWAR, pWAR, fWAR, rWAR threshold tracking (Section 5.1)
- [ ] **Season WAR Milestones** - 5/7/10/12+ WAR season thresholds (Section 4.1)
- [ ] **Team MVP / Cornerstone** - Season WAR leader designation + Fame bonus (Section 5.2)
- [ ] **Franchise Cornerstone Legacy Status** - Cornerstone/Icon/Legend tier detection (Section 5.2)
- [ ] **Two-Way Player WAR** - Ensure total WAR = bWAR + pWAR + fWAR + rWAR for two-way players
