# MODE 3: OFFSEASON WORKSHOP — Gospel Specification

**Version:** 1.0 (Gospel)
**Status:** CANONICAL — This document is the single source of truth for Mode 3
**Created:** 2026-02-23
**Supersedes:** OFFSEASON_SYSTEM_SPEC.md, EOS_RATINGS_ADJUSTMENT_SPEC.md, EOS_RATINGS_FIGMA_SPEC.md, AWARDS_CEREMONY_FIGMA_SPEC.md, RETIREMENT_FIGMA_SPEC.md, FREE_AGENCY_FIGMA_SPEC.md, DRAFT_FIGMA_SPEC.md, TRADE_FIGMA_SPEC.md, FINALIZE_ADVANCE_FIGMA_SPEC.md, SEASON_END_FIGMA_SPEC.md, portions of SALARY_SYSTEM_SPEC.md (triple recalc), FARM_SYSTEM_SPEC.md (farm reconciliation), TRADE_SYSTEM_SPEC.md (offseason window), PERSONALITY_SYSTEM_SPEC.md (FA destinations), SCOUTING_SYSTEM_SPEC.md (draft scouting), PROSPECT_GENERATION_SPEC.md (annual draft class)
**Cross-references:** SPINE_ARCHITECTURE.md (shared data contracts), MODE_1_LEAGUE_BUILDER.md (what creates the franchise), MODE_2_FRANCHISE_SEASON.md (what feeds into offseason), ALMANAC.md (historical data consumer)

**STEP4 Decisions Applied:** C-041, C-042, C-043, C-044, C-046, C-049, C-051, C-052, C-053, C-066, C-083, C-085, C-086, C-090, C-094. Resolved: C-063 (by C-086), C-064 (by C-086).
**Reconciliation Findings Applied:** F-124, F-125, F-126, F-127, F-130, F-131, F-132, F-133.

---

## 1. Overview & Mode Definition

### 1.1 What Mode 3 Is

Mode 3 — the Offseason Workshop — is the **between-season processing hub** where users execute a structured 13-phase sequence of awards, roster management, economic adjustments, and league-wide transitions. It runs once per season boundary, after Mode 2 (Franchise Season) completes and before the next season of Mode 2 begins.

> **Per C-049:** The Offseason Workshop uses a 13-phase structure. The original 11-phase design has been expanded to restore Farm Reconciliation (Phase 11) and Chemistry Rebalancing (Phase 12) as standalone phases, extracted from what was previously bundled into Finalize & Advance.

The Offseason Workshop is a **ceremony-driven experience**. Each phase presents decisions with dramatic reveals, dice rolls, wheel spins, and card animations. The design philosophy is "game night" — offseason processing should feel like a tabletop event, not a spreadsheet operation.

### 1.2 What Mode 3 Produces

When Mode 3 completes its 13-phase sequence, it has:

1. **Awarded recognition** — league leaders, Gold/Silver/Platinum Gloves, MVP, Cy Young, ROY, MOY, special awards, all with trait rewards
2. **Adjusted ratings** — end-of-season performance-based rating changes with manager-distributed bonus/penalty points
3. **Recalculated salaries** — three-pass salary recalculation (post-ratings, post-draft, post-trades) ensuring economic accuracy
4. **Expanded the league** (optional) — added expansion team(s) via expansion draft
5. **Changed stadiums** (optional) — teams can change home stadiums
6. **Retired players** — age-based retirement ceremonies with jersey retirement decisions
7. **Redistributed players** — free agency with personality-driven destinations and salary-matched exchanges
8. **Drafted prospects** — annual draft from generated prospect pool into farm rosters
9. **Executed trades** — offseason trade window with no salary matching requirement
10. **Reconciled farm rosters** — resolved farm roster overflows, enforced call-up/send-down rules
11. **Rebalanced chemistry** — recalculated team chemistry compositions after all roster changes
12. **Finalized and advanced** — validated all rosters (22 MLB + 10 Farm), archived the season, aged players, advanced to next season

### 1.3 What Mode 3 Does NOT Do

- Track any games or at-bats (that's Mode 2)
- Create franchises, leagues, teams, or players from scratch (that's Mode 1)
- Run mid-season roster moves (that's Mode 2's call-up/send-down/trade system)
- Display historical cross-season data (that's the Almanac)
- Simulate AI-vs-AI games (that's Mode 2's AI Game Engine)

### 1.4 Entry & Exit Points

| Transition | Trigger | What Happens |
|-----------|---------|--------------|
| Mode 2 → Mode 3 | Season ends (last scheduled game completed + optional playoffs) | Season End Processing (Phase 1) begins automatically |
| Mode 3 → Mode 2 | Phase 13 (Finalize & Advance) completed | New season initialized, schedule active, Mode 2 dashboard loads |
| Mode 3 resume | User closes app mid-offseason and returns | Resumes at last incomplete phase |

### 1.5 Key Principles

1. **Sequential, non-skippable phases** — Each phase must complete before the next begins. No jumping ahead. Users can save and resume between phases.
2. **Ceremony-first design** — Awards, retirements, and draft use dramatic reveals. The offseason is entertainment, not admin.
3. **Triple salary recalculation** — Salaries update at Phases 3, 8, and 10 to stay current with all roster changes.
4. **Personality drives outcomes** — Free agency destinations, retirement decisions, and morale effects are all personality-informed.
5. **No salary matching in trades** — Fan morale and AI evaluation provide natural constraints instead.
6. **Farm-first draft** — All draft picks go to farm rosters. Call-up to MLB is a separate decision.
7. **13-phase structure** — Per C-049, farm reconciliation and chemistry rebalancing are standalone phases, not bundled into finalize.

---

## 2. Phase Structure

### 2.1 The 13 Phases

> **Per C-049:** Expanded from original 11 to 13 phases.

| # | Phase | Scope | Purpose |
|---|-------|-------|---------|
| 1 | Season End Processing | All teams | Finalize standings, MVP selection, championship bonuses, mojo reset |
| 2 | Awards Ceremony | Human-only | 13 award categories with voting, trait rewards, wheel spin |
| 3 | EOS Ratings & Salary Recalculation #1 | Human-only | Performance-based rating adjustments + first salary pass |
| 4 | Expansion / Stadium (optional) | All teams | Add expansion team(s) via draft; change team stadiums |
| 5 | Retirements | All teams | Age-based retirement dice rolls, jersey retirement ceremonies |
| 6 | Free Agency | All teams | Two-round FA with personality-driven destinations, salary-matched exchanges |
| 7 | Draft | All teams | Annual prospect draft from generated pool into farm rosters |
| 8 | Salary Recalculation #2 | Human-only | Post-draft salary update |
| 9 | Offseason Trades | All teams | Trade window with no salary matching; AI proposals; waiver wire |
| 10 | Salary Recalculation #3 | Human-only | Post-trade final salary baseline |
| 11 | Farm Reconciliation | All teams | Resolve farm overflows, enforce roster limits, option resets |
| 12 | Chemistry Rebalancing | All teams | Recalculate team chemistry after all offseason roster changes |
| 13 | Finalize & Advance | All teams | Validate rosters (22+10), archive season, age players, advance |

### 2.2 Phase Scope (Franchise Type Integration)

Each phase has a scope that determines behavior for AI-controlled teams:

```typescript
type PhaseScope = 'all-teams' | 'human-only';
```

**When scope is `all-teams`:** The phase runs for every team in the league. For AI teams, outcomes are either auto-resolved or presented to the user-as-commissioner for approval.

**When scope is `human-only`:** AI teams auto-resolve with default behavior (flat salary, no discretionary changes). Only human-controlled teams get the full ceremony experience.

> The `offseasonPhaseScopes` array is configured during Mode 1 (League Builder §2.5) and can be customized per franchise. The defaults above are the Solo/Custom presets.

**Couch Co-Op special case:** When franchise type is `couch-coop`, ALL teams are human. Every phase is effectively `all-teams` with full ceremony for every team. No AI auto-resolution needed.

### 2.3 Phase Persistence

```typescript
interface OffseasonState {
  franchiseId: string;
  seasonNumber: number;
  currentPhase: number;          // 1-13
  phaseStatus: PhaseStatus[];    // Per-phase completion status
  completedAt?: string;          // ISO timestamp when all 13 phases done
}

type PhaseStatus = 'pending' | 'in-progress' | 'completed';
```

Offseason state is persisted to IndexedDB after each phase completes. If the user closes the app, they resume at the last incomplete phase on return.

### 2.4 Interaction Modes

The Offseason Workshop supports two interaction modes, configured per franchise:

**Game Night Mode (default):** Full ceremony experience with animations, dramatic reveals, dice rolls, wheel spins, and card flips. Each award, retirement, and draft pick gets its moment.

**Streamlined Mode:** Batch processing with condensed UI. Key ceremonies (MVP, Cy Young, ROY) still get reveals; minor awards show summary tables. Trade and FA rounds still interactive. Target: reduce offseason time by ~60% while keeping critical decisions interactive.

---

## 3. Phase 1: Season End Processing

### 3.1 Purpose

Close the completed season: finalize standings, select postseason MVP (if playoffs occurred), distribute championship rewards, and reset all player mojo to baseline.

### 3.2 Screen Flow (7 screens)

**Screen 1 — Final Standings**
Display division standings as they ended. Confirm before proceeding.

> **Per F-128:** Tiebreaker is run differential. If still tied after run differential, user selects which team advances.

**Screen 2 — Postseason MVP (conditional: playoffs occurred)**
Card reveal interaction: user flips cards to reveal MVP candidates. System pre-selects based on postseason WAR, user can override.

**Screen 3 — MVP Selection Confirmation**
Show selected MVP with rating bonus distribution. Bonus points allocated to player's lowest-rated categories.

**Screen 4 — Championship Processing (conditional: playoffs occurred)**
Display champion team. Apply:
- Fame bonus: +1 fame to all championship team players
- Morale boost: +20 morale to championship team players
- Beat reporter note: championship narrative entry logged

**Screen 5 — Mojo Reset Confirmation**
All players across all teams reset to Normal mojo (baseline). Display confirmation with count of players affected.

**Screen 6 — Season Archive Confirmation**
Season saved to league history (franchise IndexedDB). All season stats, standings, and game headers archived.

**Screen 7 — Phase Complete Summary**
Checklist of completed tasks. "Continue to Awards Ceremony" button.

**No-Playoffs Path (4 screens):**
If no playoffs occurred, skip Screens 2-4. Flow: Final Standings → Mojo Reset → Season Archive → Phase Complete.

### 3.3 Data Operations

```typescript
// Season End Processing outputs
interface SeasonEndResult {
  finalStandings: DivisionStandings[];
  postseasonMvp?: PlayerId;        // null if no playoffs
  championTeamId?: TeamId;         // null if no playoffs
  mojoResetCount: number;
  seasonArchiveId: string;
}
```

| Operation | Store | Effect |
|-----------|-------|--------|
| Finalize standings | standingsStore | Mark as final, lock |
| Select MVP | playerStore | +rating bonus to lowest categories |
| Championship bonuses | playerStore, fameStore | +1 fame, +20 morale |
| Mojo reset | playerStore | All players → Normal mojo |
| Archive season | seasonArchiveStore | Copy season stats, standings, headers |

---

## 4. Phase 2: Awards Ceremony

### 4.1 Purpose

Recognize outstanding player performances with 13 award categories. Awards grant trait rewards via wheel spin ceremony. Hybrid voting: system recommends, user can override.

> **Per C-086:** Trait assignment uses a wheel spin ceremony. Chemistry affects trait **potency** only, not eligibility. This resolves both C-063 (trait timing: traits in Phase 2, ratings in Phase 3) and C-064 (eligibility vs potency).

> **Per C-053:** Team Captain is awarded in this phase. Selected by highest combined (Loyalty + Charisma) among team players. No minimum tenure or trait value required.

### 4.2 Screen Flow (13 screens)

**Screen 1 — League Leaders**
Auto-calculated statistical leaders with inline rewards:
- Batting: AVG, HR, RBI, SB, OPS
- Pitching: ERA, W, K, SV, WHIP
- Inline trait reward: batting/pitching triple crown winners get a trait (if under 2-trait max)

**Screen 2 — Gold Glove Awards (9 positions)**
Hybrid voting system:
- System recommendation: fWAR (55%) + Clutch Plays (25%) + Eye Test (20%)
- Eye Test: user ranks fielders with ties allowed
- Positions: C, 1B, 2B, 3B, SS, LF, CF, RF, P
- Winner gets trait via wheel spin
- "Other Player..." modal for unlisted candidates

**Screen 3 — Platinum Glove**
Best overall fielder selected from Gold Glove winners. Additional trait wheel spin.

**Screen 4 — Booger Glove**
Worst fielder in the league. Penalty: negative trait application (if applicable).

**Screen 5 — Silver Slugger Awards (9 positions)**
Hybrid voting: OPS (40%) + wRC+ (30%) + bWAR (30%). Winner gets trait via wheel spin.

**Screen 6 — Reliever of the Year (AL/NL)**
Guaranteed CLUTCH trait for winner.

**Screen 7 — Bench Player of the Year**
Players with <50% starts eligible. Trait wheel spin.

**Screen 8 — Rookie of the Year (AL/NL)**
Random positive trait for winner.

**Screen 9 — Cy Young Award (AL/NL)**
Hybrid voting: pWAR (40%) + Advanced (25%) + Clutch (25%) + Team (5%) + Fame (5%).
Winner, runner-up, and 3rd place all receive trait wheel spin.

**Screen 10 — MVP Award (AL/NL)**
Most dramatic reveal — largest photo, extended animation.
Hybrid voting: WAR (40%) + Clutch (25%) + Traditional (15%) + Team (12%) + Fame (8%).
Winner + runner-up get trait wheel spin.

**Screen 11 — Manager of the Year (AL/NL)**
Auto-selected based on mWAR (highest mWAR wins). User can override.

> **Per F-132:** Team Captain designation is awarded here. Selected by highest combined (Loyalty + Charisma) on each team. No minimums. This is a formal designation, not a voted award.

**Screen 12 — Special Awards**
- Kara Kawaguchi Award: Best value player (highest WAR per $M)
- Bust of the Year: Worst value player (lowest WAR per $M among high-salary players)
- Comeback Player of the Year: Largest positive WAR delta from prior season

**Screen 13 — Awards Summary**
Comprehensive display of all awards and rewards. All trait assignments listed.

### 4.3 Trait Wheel Spin Ceremony

> **Per C-086:** Wheel spin is the trait assignment mechanism.

When a player earns a trait reward:

1. **Eligibility check:** Player must have fewer than 2 traits. If at 2, a trait replacement modal appears (user picks which existing trait to replace).
2. **Pool construction:** Award-specific trait pool filtered to position-appropriate traits.
3. **Wheel spin animation:** Visual spinning wheel with trait options. Lands on random selection.
4. **Assignment:** Trait added to player record.
5. **Potency calculation:** Trait potency is determined by the player's team Chemistry composition (see §16.2). Chemistry does NOT affect which traits are available — only how strong they are.

**Trait distribution probability:**
- 60% of award winners receive a trait
- 30% of top performers (non-winners) receive a trait
- 5% of regular players receive a trait (end-of-season development)

**Trait max:** 2 traits per player. If at max, replacement modal required.

### 4.4 Award Voting Data Model

```typescript
interface AwardVote {
  awardId: AwardType;
  systemRecommendation: PlayerId;
  systemScores: { playerId: PlayerId; score: number }[];
  userOverride?: PlayerId;
  eyeTestRankings?: { playerId: PlayerId; rank: number }[];
  finalWinner: PlayerId;
  traitAwarded?: TraitId;
}

type AwardType =
  | 'gold-glove-c' | 'gold-glove-1b' | 'gold-glove-2b' | 'gold-glove-3b'
  | 'gold-glove-ss' | 'gold-glove-lf' | 'gold-glove-cf' | 'gold-glove-rf'
  | 'gold-glove-p' | 'platinum-glove' | 'booger-glove'
  | 'silver-slugger-c' | 'silver-slugger-1b' | 'silver-slugger-2b'
  | 'silver-slugger-3b' | 'silver-slugger-ss' | 'silver-slugger-lf'
  | 'silver-slugger-cf' | 'silver-slugger-rf' | 'silver-slugger-dh'
  | 'reliever-al' | 'reliever-nl'
  | 'bench-player'
  | 'roy-al' | 'roy-nl'
  | 'cy-young-al' | 'cy-young-nl'
  | 'mvp-al' | 'mvp-nl'
  | 'moy-al' | 'moy-nl'
  | 'kara-kawaguchi' | 'bust-of-year' | 'comeback-player';
```

### 4.5 AI Team Award Handling

When phase scope is `human-only`, AI team players are still eligible for league-wide awards (Gold Glove, MVP, etc.) but their candidacy is based on available data — stats accumulated from games involving human teams only. The user-as-commissioner can override any selection.

---

## 5. Phase 3: EOS Ratings & Salary Recalculation #1

### 5.1 Purpose

Adjust player ratings based on end-of-season performance, then recalculate salaries incorporating the new ratings. This is the first of three salary recalculation passes.

> **Per C-046:** All salary changes are deferred to offseason recalculation. Rating changes take gameplay effect immediately during Mode 2, but salary adjusts only here.
> **Per C-044:** Fan morale acts as a modifier on positive rating adjustments: low morale = 0.7× positive adjustments.
> **Per C-090:** EOS Figma calculation errors have been corrected in this gospel.

### 5.2 Screen Flow (6 screens)

**Screen 1 — Overview Dashboard**
High-level summary: count of improved/declined/unchanged players, top risers and fallers.

**Screen 2 — Team Reveal**
Team-by-team detailed view of all rating changes. Player cards show before/after comparisons.

**Screen 3 — DH Special Case**
DHs display "N/A" for fielding stats — excluded from fielding adjustment calculation.

**Screen 4 — Pitcher Adjustment Card**
Pitcher-specific adjustments across Velocity/Junk/Accuracy.

**Screen 5 — Manager Distribution**
Human team managers allocate bonus/penalty points:
- Base pool: ±20 points
- mWAR bonus: scales with team mWAR performance and grade factors
- MOY bonus: ±5 additional points if team manager won MOY
- Points distributed to individual player rating categories (capped ±10 per category)

**Screen 6 — League Summary**
Final overview of all changes across the league.

### 5.3 Position Detection Algorithm

> **Per C-043:** All detection thresholds scale with season length via `gamesPerTeam / 162`.

Players are classified into positions for peer-group comparison:

**Pitcher check (first):**
1. Two-Way: ≥ scaled SP threshold AND ≥ 100 PA (scaled)
2. SP: ≥ scaled starts threshold (20 × ratio)
3. SP/RP: ≥ 50% starts of total appearances
4. CP: ≥ scaled saves threshold (15 × ratio)
5. RP: remaining pitchers with ≥ scaled relief appearances (40 × ratio)

**Position player check (then):**
1. UTIL: ≥ 3 positions with ≥ 15% starts each
2. BENCH: < 50% starts threshold
3. DH: ≥ 70% of starts at DH
4. Primary position: most starts at that position

**Minimum pool size:** 6 players per position group for meaningful peer comparisons. If smaller, merge with similar positions: CP↔RP, 1B↔3B, 2B↔SS, LF↔CF↔RF, UTIL↔BENCH.

### 5.4 Rating Adjustment Formula

Each WAR component maps to rating categories:

| WAR Component | Rating Categories |
|--------------|-------------------|
| bWAR | Power, Contact |
| rWAR | Speed |
| fWAR | Fielding, Arm |
| pWAR | Velocity, Junk, Accuracy |

**Adjustment calculation:**

```
WAR_percentile = player's component WAR rank among position peers (0-100)
salary_percentile = player's salary rank among position peers (0-100)
raw_delta = WAR_percentile - salary_percentile
adjustment = raw_delta × grade_factor × morale_modifier
```

**Grade factors (asymmetric — high-grade players resist decline, low-grade players resist improvement):**

| Grade | Positive Factor | Negative Factor |
|-------|----------------|-----------------|
| S | +0.10 | -2.50 |
| A+ | +0.15 | -2.00 |
| A | +0.25 | -1.50 |
| A- | +0.40 | -1.20 |
| B+ | +0.60 | -0.90 |
| B | +0.80 | -0.80 |
| B- | +0.90 | -0.60 |
| C+ | +1.20 | -0.40 |
| C | +1.50 | -0.25 |
| C- | +2.00 | -0.15 |
| D | +2.25 | -0.20 |
| D- | +2.50 | -0.10 |
| F | +3.00 | -0.05 |

**Cap:** ±10 per rating category per season.

> **Per C-044:** Morale modifier: when team fan morale is below threshold, positive adjustments multiplied by 0.7×. This represents a demoralized team environment suppressing player development.

### 5.5 Salary Recalculation #1

After ratings are adjusted, salaries recalculate using the full salary formula from SALARY_SYSTEM_SPEC:

> **Per C-051:** No salary cap in v1. Soft economic pressure comes from fan morale only — high-payroll teams that underperform face amplified morale penalties.

**Salary formula components:**
1. **Base salary** — position-weighted ratings (3:3:2:1:1 for position players, 1:1:1 for pitchers)
2. **Position multiplier** — C +15%, SS +12%, CF +8%, 1B -8%, DH -12%, RP -15%
3. **Age factor** — Rookie 70%, Prime 100%, Peak 110%, Twilight 70%
4. **Trait modifier** — Elite +10%, Good +5%, Minor +2% (scaled by Chemistry-tier potency)
5. **Performance modifier** — ±10% per WAR vs expectations (capped ±50%)
6. **Fame modifier** — +/-3% per fame point (capped ±30%)

**True Value calculation:** Position-relative comparison — what salary the player's actual WAR would command among position peers. Used for trade evaluation and FA matching.

### 5.6 Farm Call-Up Threshold

> **Per C-043:** The threshold for determining when farm prospects deserve MLB call-up in salary calculations scales with season length: `threshold = gamesPerTeam × 0.20` (20% of games played).

---

## 6. Phase 4: Expansion & Stadium Changes (Optional)

### 6.1 Purpose

Optionally add expansion team(s) to the league via expansion draft. Additionally, any team can change their home stadium.

> **Per C-041/C-085:** Contraction has been fully removed from v1. This phase is expansion-only. All contraction references from the original OFFSEASON_SYSTEM_SPEC and CONTRACTION_EXPANSION_FIGMA_SPEC have been archived (per C-083/C-094).

> **Per F-130:** Stadium change mechanic is v1 scope. Teams can change their home stadium during this phase.

### 6.2 Expansion Draft Flow

1. **Expansion team creation** — Name, branding, stadium, league/division assignment
2. **Protection selection** — Existing teams each protect a configurable number of players
3. **Expansion draft** — New team selects from unprotected player pool
4. **Prospect allocation** — New team receives generated prospects for farm roster
5. **Salary initialization** — New team gets salary ledger initialized

### 6.3 Stadium Change Flow

1. **Stadium selection** — Any team's manager can request a stadium change
2. **Stadium picker** — Choose from available stadiums or create custom
3. **Park factor reset** — New stadium starts with seed park factors (from PARK_FACTOR_SEED_SPEC); blending begins next season
4. **Confirmation** — Change takes effect for next season

### 6.4 Skip Conditions

This phase can be skipped entirely (auto-advance to Phase 5) if:
- No expansion is desired
- No stadium changes requested
- User clicks "Skip Phase"

---

## 7. Phase 5: Retirements

### 7.1 Purpose

Process age-based retirements across all teams, with dice roll ceremonies and jersey retirement decisions.

### 7.2 Screen Flow (7 screens)

**Screen 1 — Retirement Probability Table**
All players sorted by retirement risk. Probability bar colors:
- Red (40%+) — high risk
- Orange (25-39%) — moderate risk
- Yellow (15-24%) — some risk
- Green (5-14%) — low risk
- Blue (<5%) — minimal risk

**Screen 2 — Retirement Reveal Animation**
Dice roll animation for each retirement-eligible player. Result determines whether player retires.

**Screen 3 — Retirement Announcement (conditional)**
Celebrate retiring player with ceremony-style display. Career highlights, key stats, awards. Flavor text varies by age, WAR, tenure, and awards.

**Screen 4 — No Retirement Result (conditional)**
When dice roll results in no retirement — player continues.

**Screen 5 — Jersey Retirement Decision**
User selects which teams should retire the jersey. Entirely user choice — no eligibility rules.

**Screen 6 — Jersey Retirement Ceremony**
Visual celebration: jersey display (160pt × 200pt) with team colors, spotlight animation, confetti.

**Screen 7 — Phase Summary**
All retirements and jersey retirements across all teams.

### 7.3 Retirement Probability Calculation

**Goal:** 1-2 retirements per team per season.

Base probability by age bracket:
| Age | Base Probability |
|-----|-----------------|
| 28-30 | 2-5% |
| 31-33 | 5-15% |
| 34-36 | 15-30% |
| 37-39 | 30-50% |
| 40+ | 50-90% |

**Modifiers:**
- High Resilience (hidden modifier): -10% probability
- Low Resilience: +10% probability
- Recent award winner: -5%
- Team captain: -5%
- High fame (5+): -5%
- Low WAR (< 0.5) last season: +10%
- High salary relative to production: +5%

**Personality influence:**
- COMPETITIVE: less likely to retire early (seeks "one more ring")
- RELAXED: average retirement probability
- TOUGH: less likely (pushes through)
- TIMID: more likely (fears declining performance)
- DROOPY: more likely (pessimistic about future)
- JOLLY: average
- EGOTISTICAL: less likely if still getting attention; more likely if relegated

### 7.4 Retired Player Database

Retired players enter the **Inactive Player Database**. They can be:
- Inducted into the Hall of Fame Museum (Almanac feature)
- Optionally re-added to future draft classes (via Phase 7 pre-draft selection)

```typescript
interface RetiredPlayer {
  playerId: string;
  retiredSeason: number;
  retiredAge: number;
  careerStats: CareerStatsSummary;
  awardsWon: AwardRecord[];
  teamsPlayed: TeamId[];
  jerseyRetirements: { teamId: TeamId; jerseyNumber: number }[];
  eligibleForHof: boolean;   // True after retirement
}
```

---

## 8. Phase 6: Free Agency

### 8.1 Purpose

Redistribute players across teams via a two-round free agency system driven by personality-based destination selection and salary-matched exchanges.

> **Per F-125:** FA player exchange uses ±20% True Value match with no position restriction. This resolves the contradiction between the original Figma spec (±10% salary/no position) and the Offseason System Spec (grade+position type).

> **Per C-066:** Cornerstone-designated players receive +10% FA retention bonus (reduced probability of departure).

> **Per C-052:** The 4-modifier personality system (7 visible types + 4 hidden modifiers) drives all FA destination logic.

### 8.2 Screen Flow (6 screens)

**Screen 1 — Protection Selection**
Each team selects one player to protect from being drafted in this round. Protected player cannot leave via FA.

**Screen 2 — Dice Roll**
Two-dice roll (2d6) determines which player departs. Users can drag-to-reorder the departure list before rolling.

**Dice distribution (2d6 — 7 is most likely):**
| Roll | Probability | Departure Target |
|------|------------|-----------------|
| 2 | 2.8% | Highest-salary unprotected player |
| 3-4 | 8.3-11.1% | High-salary range |
| 5-6 | 13.9% | Mid-high range |
| 7 | 16.7% | Middle of roster |
| 8-9 | 13.9% | Mid-low range |
| 10-11 | 8.3-11.1% | Low-salary range |
| 12 | 2.8% | Lowest-salary unprotected player |

**Screen 3 — Destination Reveal**
Personality-driven destination. Each personality type has preferred destination characteristics:

| Personality | Destination Preference |
|------------|----------------------|
| COMPETITIVE | Contender (best record) |
| RELAXED | Random (no strong preference) |
| JOLLY | Best team chemistry match |
| TOUGH | Rebuilding team (wants to be "the guy") |
| TIMID | Closest to current team (least change) |
| DROOPY | Worst team (self-fulfilling pessimism) |
| EGOTISTICAL | Biggest market / highest visibility |

**Hidden modifier influence:**
- High Loyalty: +15% chance to stay with current team
- High Ambition: prefers contenders regardless of personality
- Cornerstone designation: +10% retention (per C-066)

**Screen 4 — Player Exchange**
Receiving team returns a salary-matched player:

> **Per F-125:** Match threshold is ±20% of departing player's True Value. No position restriction — any player within the salary band qualifies.

**Fallback rule:** If no players on the receiving team fall within the ±20% True Value range:
1. Expand to ±30%
2. If still none, receiving team sends their lowest-salary MLB player
3. The "leftover" salary difference is absorbed (no compensation mechanism in v1)

**Screen 5 — Round Summary**
All moves from completed round displayed.

**Screen 6 — Final Summary**
Complete overview after both rounds with team impact table showing net salary change, roster composition change, and chemistry impact.

### 8.3 Two-Round Structure

Free agency runs exactly 2 rounds:
- **Round 1:** Each team protects 1 player. Dice roll determines departure. Exchange occurs.
- **Round 2:** Same process. Players who moved in Round 1 are NOT eligible to move again in Round 2 (but new arrivals from Round 1 ARE eligible to depart in Round 2).

### 8.4 Free Agent Pool Signing

After both rounds, any unsigned free agents (from FA pool or released during offseason) are available for signing. Teams with roster space can claim players on a first-come basis (user-as-commissioner decides order for human teams; AI teams auto-resolve).

### 8.5 Data Operations

```typescript
interface FreeAgencyResult {
  round: 1 | 2;
  departingPlayer: PlayerId;
  fromTeam: TeamId;
  toTeam: TeamId;
  returnPlayer: PlayerId;
  destinationReason: PersonalityType;
  diceRoll: number;
  trueValueMatch: { departing: number; returning: number; delta: number };
}
```

---

## 9. Phase 7: Draft

### 9.1 Purpose

Annual prospect draft from a generated pool into farm rosters. All picks go to farm — call-up is a separate decision in Phase 11/13.

> **Per F-126:** Draft grade distribution uses the full A–D range (not just B–C-). Bell curve centered on B/B-/C+ at 15% each.
> **Per F-127:** Rookie salary is draft-round-based and locked at draft time: R1 $2.0M, R2 $1.2M, R3 $0.7M, R4+ $0.5M. Salary does not change at call-up.
> **Per F-131:** Scout grade deviation uses a fat-tail distribution, not uniform.

### 9.2 Screen Flow (9 screens)

**Screen 1 — Pre-Draft Inactive Player Selection**
Add retired players back to the draft class. These are players who retired in Phase 5 (or earlier seasons) and are being "un-retired" for the draft.

**Screen 2 — Draft Class Preview**
Show complete draft class with scouted grades, positions, chemistry types, and personalities. All scouted — true ratings hidden until call-up.

**Screen 3 — Draft Order Reveal**
Reverse average expected WAR determines draft order (worst team picks first). Display farm roster status for each team.

**Screen 4 — Draft Board**
Main draft interface. Available prospects displayed with scouted information:
- Scouted grade (may differ from true grade per scout accuracy)
- Position
- Chemistry type (per F-124: Competitive, Crafty, Disciplined, Spirited, Scholarly)
- Personality (visible type only)
- Traits (if any — ~30% have 0, ~50% have 1, ~20% have 2)
- Potential Ceiling (prominently displayed)

**Screen 5 — Pick Selection Modal**
Confirm prospect selection with potential ceiling display.

**Screen 6 — Release Player Modal (conditional)**
If team's farm roster is at 10 max, must release a farm player to make room. Released player enters inactive database.

**Screen 7 — Pick Confirmation**
Celebration and transaction summary. Prospect assigned draft-round salary.

**Screen 8 — Undrafted Retirements**
After all rounds, show released players who went undrafted. They return to inactive database.

**Screen 9 — Draft Summary**
Comprehensive summary with all picks by team, organized by farm.

### 9.3 Draft Class Generation

> Prospect generation reuses the system defined in MODE_1_LEAGUE_BUILDER.md §8.4, with the annual draft class specifics:

**Draft class size:** `baseSize = 40 + (numTeams × 2)` (for 20 teams = ~80 prospects)

**Grade distribution (per F-126 — full A-D range, bell curve):**

| Grade | Probability |
|-------|------------|
| A | 2% |
| A- | 5% |
| B+ | 10% |
| B | 15% |
| B- | 15% |
| C+ | 15% |
| C | 18% |
| C- | 12% |
| D | 8% |

**Note:** Draft never generates A+ (only obtainable through Mode 2 development). D- and F are not generated — prospects at that level don't enter professional baseball.

**Position distribution:** Weighted by realistic needs (SP 20, RP 12, C 7, 1B 7, 2B 7, 3B 7, SS 8, LF 6, CF 8, RF 6, DH 5, UTIL 3).

**Chemistry distribution (per F-124):** ~20% each of 5 real SMB4 chemistry types: Competitive, Crafty, Disciplined, Spirited, Scholarly.

**Trait distribution:** Same 30/50/20 ratio as initial league. Position-appropriate traits assigned.

### 9.4 Scouting Accuracy

> **Per F-131:** Scout grade deviation uses a fat-tail distribution.

**Accuracy by position:**

| Position | Accuracy % |
|----------|-----------|
| DH | 85% |
| 1B | 80% |
| RF | 78% |
| LF | 75% |
| 3B | 73% |
| 2B | 70% |
| C | 70% |
| CF | 65% |
| SS | 68% |
| SP | 72% |
| RP | 70% |
| CP | 68% |

**Deviation formula:** `σ = (100 - accuracy) / 22`

Most scouted grades land within ±1 step of true grade. Fat-tail model means rare outliers can deviate ±3 or ±4 steps beyond the mean, but extreme misses are uncommon.

### 9.5 Draft Rounds and Order

**Number of rounds:** Configurable in Mode 1 rules (default: 4 rounds).

**Draft order:** Reverse average expected WAR (worst team picks first). Calculated from current roster WAR projections.

**Pick options per team per round:**
- Select a prospect (if farm < 10)
- Pass/skip (if farm is full or no desirable prospects)
- Auto-draft: system selects highest-ceiling available prospect

### 9.6 Draft-Round Salary (per F-127)

| Round | Rookie Salary |
|-------|--------------|
| 1 | $2.0M |
| 2 | $1.2M |
| 3 | $0.7M |
| 4+ | $0.5M |

Salary is set at draft time and locked until end of the player's first MLB season (rookie season). After that, normal salary recalculation applies.

---

## 10. Phase 8: Salary Recalculation #2

### 10.1 Purpose

Second salary pass incorporating roster changes from Phases 4-7 (expansion, retirements, free agency, draft).

### 10.2 Process

Same formula as Phase 3 (§5.5) but applied to updated rosters:
- New draft picks have draft-round salary (already set in Phase 7)
- FA acquisitions recalculated with new team context
- Expansion team players recalculated
- Retired player salaries removed from team payroll

### 10.3 UI

Condensed version of Phase 3 screens: overview dashboard → team summary → league summary. No manager distribution in this pass (only Phase 3 has manager distribution).

---

## 11. Phase 9: Offseason Trades

### 11.1 Purpose

Open trade window for all teams. No salary matching requirement — fan morale and AI evaluation provide natural constraints.

> **Per TRADE_SYSTEM_SPEC:** Offseason trade window (Phase 9) has no salary matching requirement. Any combination of players, prospects, and draft swaps is valid.

### 11.2 Screen Flow (9 screens)

**Screen 1 — Trade Interface (Main)**
Two-way and three-way trade builder with side-by-side panels. Running totals and salary impact displayed.

**Screen 2 — Beat Reporter Warnings**

> **Per F-133:** Beat reporter pre-decision warnings are v1 scope. These are advisory warnings that appear before finalizing trades — they don't block execution.

Warnings include: team chemistry disruption, fan favorite departure, cornerstone trade, personality conflict on receiving team.

**Screen 3 — Trade Proposal Confirmation**
Final confirmation with salary impact, chemistry impact, and roster composition changes.

**Screen 4 — AI Response**
For trades proposed to AI teams:
- Accept: trade executes
- Reject: trade declined with reason
- Counter: AI generates counter-offer

**AI Trade Logic:**
| Factor | Weight |
|--------|--------|
| Value assessment | 30% |
| Needs fit | 25% |
| Future value | 20% |
| Chemistry fit | 10% |
| Competitive window | 15% |

**Screen 5 — Trade Proposals Inbox**
View AI-initiated trade offers. AI teams propose trades based on their needs and competitive position.

**Screen 6 — AI Proposal Detail**
Full details with beat writer commentary and trade analysis.

**Screen 7 — Waiver Wire Claim**
Claim released players (from retirement phase, farm cuts, etc.) in reverse standings order.

**Screen 8 — Waiver Wire Results**
Summary of all waiver claims.

**Screen 9 — Trade History**
All completed trades with filtering by team, player, or type.

### 11.3 Tradeable Assets

| Asset Type | Rules |
|-----------|-------|
| MLB player | Any player on 22-man MLB roster |
| Farm prospect | Reveals contract value (salary shown) but true ratings remain hidden |
| Draft swap | Upcoming year's draft pick only (no multi-year swaps in v1) |

### 11.4 Three-Team Trades

Fully supported. Each team must send ≥1 asset and receive ≥1 asset. Flow visualization shows all asset movements.

### 11.5 Counter-Offers

CPU teams generate counters when a trade proposal is borderline (close to acceptable but not quite). Counter-offers may add draft swaps or reduce the AI team's give.

### 11.6 Player Morale Effects

| Effect | Base | Personality Modifier |
|--------|------|---------------------|
| Trade shock | -10 morale | — |
| COMPETITIVE traded to contender | — | +15 |
| EGOTISTICAL traded to bigger market | — | +10 |
| TIMID traded anywhere | — | -10 additional |
| JOLLY traded from high-chemistry team | — | -8 |
| TOUGH traded | — | +5 (embraces challenge) |

### 11.7 Trade Veto (Multiplayer Only)

In Couch Co-Op and Custom franchises with multiple human teams: simple majority of non-trading human teams can veto within a configurable window. Solo franchises have no veto mechanism.

---

## 12. Phase 10: Salary Recalculation #3

### 12.1 Purpose

Third and final salary pass incorporating all trade changes from Phase 9. This establishes the definitive salary baseline for the upcoming season.

### 12.2 Process

Same formula as Phases 3/8. Final pass — no more roster changes after this point except Phase 11 farm reconciliation and Phase 13 call-ups/send-downs (which trigger immediate salary recalculation for affected players only).

### 12.3 UI

Same condensed format as Phase 8: overview → team summary → league summary.

---

## 13. Phase 11: Farm Reconciliation

### 13.1 Purpose

> **Per C-049:** Farm Reconciliation is a standalone phase, extracted from the original Finalize & Advance bundle.

Resolve all farm roster issues: enforce the 10-player farm maximum, process option resets (options counter resets each season), and handle any farm overflows from trades or expansion.

> **Per C-042:** The `recentPerformance` field has been removed from farm morale calculations. Farm prospects do not have simulated stats — there is no proxy for recent performance.

### 13.2 Operations

1. **Option counter reset** — All players' option counters reset to 0 for the new season (options accumulate per-season only in Mode 2)
2. **Farm overflow resolution** — If any team has >10 farm players (from trades, expansion draft, etc.):
   - User selects which prospects to release (human teams)
   - AI auto-resolves by releasing lowest-ceiling prospects (AI teams)
   - Released prospects enter inactive database
3. **Farm morale update** — Recalculate farm prospect morale without `recentPerformance`:
   - Factors: draft position, team competitiveness, number of MLB opportunities, peer comparison
   - No simulated stats factor (per C-042)

### 13.3 Data Model

```typescript
interface FarmReconciliationResult {
  teamId: TeamId;
  releasedPlayers: PlayerId[];
  optionResets: PlayerId[];
  finalFarmCount: number;        // Must be ≤ 10
  moraleUpdates: { playerId: PlayerId; oldMorale: number; newMorale: number }[];
}
```

---

## 14. Phase 12: Chemistry Rebalancing

### 14.1 Purpose

> **Per C-049:** Chemistry Rebalancing is a standalone phase, extracted from the original Finalize & Advance bundle.

Recalculate team chemistry compositions after all offseason roster changes (FA, draft, trades, retirements, farm reconciliation). Chemistry affects trait potency, which affects salary and gameplay.

> **Per F-124:** Chemistry types use the real SMB4 names: Competitive, Crafty, Disciplined, Spirited, Scholarly. The original spec used 4 invented names (Spirited, Crafty, Tough, Flashy) — these have been replaced.

### 14.2 Chemistry Calculation

Team chemistry is determined by the distribution of chemistry types across the roster:

```typescript
interface TeamChemistry {
  teamId: TeamId;
  composition: {
    competitive: number;    // Count of players with this chemistry
    crafty: number;
    disciplined: number;
    spirited: number;
    scholarly: number;
  };
  dominantType: ChemistryType;  // Plurality
  tier: 1 | 2 | 3 | 4;         // Based on concentration
  traitPotencyMultiplier: number; // 1.0 (Tier 1) to 1.75 (Tier 4)
}

type ChemistryType = 'competitive' | 'crafty' | 'disciplined' | 'spirited' | 'scholarly';
```

**Chemistry Tiers:**

| Tier | Concentration | Potency Multiplier |
|------|--------------|-------------------|
| 1 | No type > 30% | 1.00× (no bonus) |
| 2 | One type 30-44% | 1.25× |
| 3 | One type 45-59% | 1.50× |
| 4 | One type 60%+ | 1.75× |

### 14.3 Screen Flow

**Screen 1 — Chemistry Changes Overview**
For each team: before/after chemistry composition, tier change, and trait potency impact.

**Screen 2 — Detailed Team View**
Expandable per-team view showing which roster moves caused the chemistry shift.

**Screen 3 — Phase Summary**
League-wide chemistry tier distribution.

---

## 15. Phase 13: Finalize & Advance

### 15.1 Purpose

Final validation, season transition processing, and advancement to the next season. This is the last phase — completion triggers Mode 2 for the new season.

### 15.2 Screen Flow (11 screens)

**Screen 1 — Roster Management (Main)**
Central hub for final call-ups and send-downs. Must reach 22 MLB + 10 Farm per team.

**Screen 2 — Call-Up Confirmation Modal**
Confirm prospect promotion to MLB:
- Status changes to ROOKIE
- Salary remains at draft-round rate (per F-127 — locked until end of rookie season)
- True ratings revealed (scouted grades replaced)
- Call-up reveal ceremony: dramatic comparison of scouted grade vs true grade

**Screen 3 — Send-Down Confirmation Modal**
Confirm demotion to farm:
- Retirement risk calculation applies (see §7.3 modifiers + demotion-specific risk)
- High-grade player warning if sending down an A- or above prospect
- Beat reporter warning (per F-133) for high-profile demotions

**Demotion retirement risk factors:**
| Factor | Effect |
|--------|--------|
| Age 34+ | +20% base risk |
| Prior demotions (2+) | +15% per additional demotion |
| High salary relative to farm peers | +10% |
| Low Resilience hidden modifier | +10% |
| High Resilience | -10% |

**Screen 4 — AI Processing Summary**
AI team roster changes auto-resolved: call-ups by highest ceiling, send-downs by lowest WAR.

**Screen 5 — Validation Summary**
Roster validation check: every team must have exactly 22 MLB + 10 Farm = 32 total.
- ✅ Valid teams listed
- ❌ Invalid teams with specific issues (over/under on MLB or Farm)
- Cannot advance until all teams valid

**Screen 6 — Transaction Report**
All roster changes formatted for SMB4 sync reference.

**Screen 7 — Season Transition Processing**
Batch operations:
- **Player aging:** All players age +1 year. Age affects salary multiplier, retirement probability, and development rate.
- **Salary recalculation:** Affected players only (those who were called up or sent down in this phase)
- **Mojo reset:** Already done in Phase 1, but confirm clean state
- **Stats initialization:** Empty stats stores for new season
- **Schedule generation:** New season schedule generated (or user-edited)

**Screen 8 — Chemistry Rebalancing Summary**
Recap of Phase 12 chemistry changes (read-only in this phase — changes already applied).

**Screen 9 — Advance Confirmation**
Final confirmation before Season N+1 begins. Shows:
- Season N summary (wins, losses, championship, MVP)
- Key offseason moves (trades, FA, draft highlights)
- Roster changes from this phase
- "Start Season [N+1]" button

**Screen 10 — Post-Advance Welcome**
Welcome to the new season with next steps:
- Schedule overview
- Key matchups
- Storylines to watch (if narrative engine active)

**Screen 11 — Add Game Modal (conditional)**
If schedule is empty, quick-add option to create games.

### 15.3 Season Archive Data

When advancing, the following data is archived to the franchise's season history:

```typescript
interface SeasonArchive {
  seasonNumber: number;
  finalStandings: DivisionStandings[];
  championTeamId?: TeamId;
  mvpPlayerId?: PlayerId;
  awardsGiven: AwardRecord[];
  retiredPlayers: RetiredPlayer[];
  draftPicks: DraftPick[];
  trades: TradeRecord[];
  freeAgencyMoves: FreeAgencyResult[];
  rosterSnapshots: { teamId: TeamId; mlbRoster: PlayerId[]; farmRoster: PlayerId[] }[];
  teamStats: TeamSeasonStats[];
  playerStats: PlayerSeasonStats[];
}
```

---

## 16. Shared Systems Reference

These systems are defined in their primary gospel but are consumed by Mode 3. This section describes Mode 3's specific usage — not the full system definition.

### 16.1 Personality System (Primary: MODE_1_LEAGUE_BUILDER.md §6)

Mode 3 consumes personality for:
- **FA destinations** (Phase 6): personality type determines preferred team characteristics
- **Retirement probability** (Phase 5): hidden Resilience modifier affects probability
- **Trade morale** (Phase 9): personality type affects morale impact of being traded
- **Team Captain selection** (Phase 2): Loyalty + Charisma hidden modifiers determine captain (per C-053)

### 16.2 Chemistry & Trait Potency (Primary: MODE_1_LEAGUE_BUILDER.md §6.4)

Mode 3 consumes chemistry for:
- **Trait potency after assignment** (Phase 2): chemistry tier determines how strong awarded traits are
- **FA exchange evaluation** (Phase 6): chemistry impact shown in exchange preview
- **Trade preview** (Phase 9): chemistry impact of trades displayed
- **Rebalancing** (Phase 12): chemistry recalculated after all roster changes

> **Per C-086/C-064:** Chemistry affects POTENCY only — never eligibility. Any player can receive any position-appropriate trait regardless of team chemistry. The chemistry tier only determines the multiplier on that trait's effect.

### 16.3 Salary System (Primary: SALARY_SYSTEM_SPEC.md, consumed across Modes 1-3)

Mode 3 owns the triple recalculation:
- Phase 3: Post-ratings adjustment
- Phase 8: Post-draft
- Phase 10: Post-trades

All three use the same formula (§5.5). Mode 3 also handles:
- Rookie salary assignment at draft (Phase 7, §9.6)
- Salary removal for retired players (Phase 5)
- Salary initialization for expansion team players (Phase 4)

### 16.4 Farm System (Primary: FARM_SYSTEM_SPEC.md, consumed across Modes 1-3)

Mode 3 owns:
- Farm reconciliation (Phase 11): enforce 10-player max, resolve overflows
- Draft-to-farm pipeline (Phase 7): all draft picks go to farm
- Call-up/send-down in finalization (Phase 13): promote from farm to MLB

Mode 2 owns: in-season call-ups, send-downs, options tracking.

### 16.5 Scouting System (Primary: SCOUTING_SYSTEM_SPEC.md)

Mode 3 consumes scouting for:
- Draft prospect evaluation (Phase 7): scouted grades displayed, true ratings hidden
- Call-up reveal ceremony (Phase 13): dramatic reveal of true ratings vs scouted grades
- Scout accuracy varies by position (§9.4)

### 16.6 Prospect Generation (Primary: PROSPECT_GENERATION_SPEC.md)

Mode 3 consumes prospect generation for:
- Annual draft class creation (Phase 7): generate prospects with grades, positions, chemistry, personality, traits
- Inactive player database integration: retired players can re-enter draft class

---

## 17. Franchise Type Implications

### 17.1 Solo (1P)

- User manages one team through all 13 phases
- AI teams auto-resolve in `human-only` phases (Phases 2, 3, 8, 10)
- AI teams participate in `all-teams` phases with auto-resolution or commissioner override
- User acts as commissioner for all league-wide decisions

### 17.2 Couch Co-Op

- ALL teams are human — every phase runs for every team
- No AI auto-resolution needed
- Full ceremony for every team in every phase
- Longest offseason experience (most interactions)
- Turn order: teams process in standing order (worst first for draft, alphabetical for ceremonies)

### 17.3 Custom

- 2+ human teams, rest AI
- Human teams get full ceremony; AI teams auto-resolve
- Per-phase scope is configurable (set in Mode 1 §2.5)
- Commissioner powers available to all human team managers

### 17.4 Phase Scope Configuration

```typescript
interface OffseasonPhaseConfig {
  phase: number;              // 1-13
  scope: PhaseScope;          // 'all-teams' | 'human-only'
  aiResolutionStrategy: 'auto' | 'commissioner-approval';
}
```

Default scopes (Solo/Custom):

| Phase | Default Scope | AI Resolution |
|-------|--------------|---------------|
| 1 Season End | all-teams | Auto (standings are universal) |
| 2 Awards | human-only | Auto (AI players still eligible for league awards) |
| 3 EOS Ratings/Salary #1 | human-only | Auto (flat — no rating changes for AI players) |
| 4 Expansion/Stadium | all-teams | Commissioner approval |
| 5 Retirements | all-teams | Auto (dice rolls run for all teams) |
| 6 Free Agency | all-teams | Auto (personality-driven destinations) |
| 7 Draft | all-teams | Auto (highest-ceiling picks) |
| 8 Salary #2 | human-only | Auto (flat) |
| 9 Trades | all-teams | Auto (AI proposes/accepts based on logic) |
| 10 Salary #3 | human-only | Auto (flat) |
| 11 Farm Recon | all-teams | Auto (release lowest-ceiling) |
| 12 Chemistry | all-teams | Auto (recalculate) |
| 13 Finalize | all-teams | Auto (highest-ceiling call-ups) |

---

## 18. Data Architecture

### 18.1 Storage

All offseason data is stored in the franchise's IndexedDB instance (per FRANCHISE_MODE_SPEC architecture):

| Store | Contents | Phase(s) |
|-------|----------|----------|
| offseasonStateStore | Phase progress, completion timestamps | All |
| awardsStore | Award votes, winners, trait assignments | 2 |
| ratingsAdjustmentStore | Before/after ratings, manager distributions | 3 |
| retirementStore | Retirement results, jersey retirements | 5 |
| freeAgencyStore | FA moves, dice rolls, exchanges | 6 |
| draftStore | Draft picks, class composition | 7 |
| tradeStore | Trade history, proposals, vetoes | 9 |
| seasonArchiveStore | Full season snapshot | 13 |

### 18.2 Cross-Store Operations

Some operations span multiple stores:
- **Player trade:** Updates playerStore (team assignment), tradeStore (history), salaryStore (recalc)
- **Retirement:** Updates playerStore (status), retirementStore (record), salaryStore (removal), careerStore (finalize)
- **Draft pick:** Updates draftStore (record), farmRosterStore (addition), salaryStore (initialization)

### 18.3 Offseason State Machine

```typescript
type OffseasonPhaseTransition = {
  from: number;       // Current phase (0 = not started)
  to: number;         // Next phase
  guard: () => boolean; // Must return true to advance
};

// Transitions are strictly sequential: 0→1→2→...→13→complete
// No skipping (except Phase 4 which can be skipped if no expansion/stadium changes)
```

---

## 19. V2 Material (Explicitly Out of Scope)

These features are referenced in source specs but are NOT part of v1:

| Feature | Status | Notes |
|---------|--------|-------|
| Contraction | Removed from v1 (C-041/C-085) | Expansion only in v1 |
| Salary cap (hard/soft) | Removed from v1 (C-051) | Soft pressure via fan morale only |
| Arbitration | Future | Not in v1 offseason economics |
| Revenue sharing | Future | Not in v1 |
| Sound effects / animations | Polish layer | V2 (core ceremonies have animation specs but detailed SFX deferred) |
| Multiplayer turn management | V2 | Couch Co-Op handles turn order via standing order |
| Multi-year draft pick trades | Future | V1 allows current-year draft swaps only |
| AI game simulation during offseason | Future | Offseason is fully user-driven |
| Cloud sync for offseason state | Future | Requires account system |

---

## 20. Cross-References

| Document | Relationship |
|----------|-------------|
| **SPINE_ARCHITECTURE.md** | Shared data contracts (Player, Team, Event, etc.) referenced by all gospels |
| **MODE_1_LEAGUE_BUILDER.md** | What creates the franchise. Personality assignment (§6), draft system (§8), rules config (§9), franchise type (§2) |
| **MODE_2_FRANCHISE_SEASON.md** | What feeds into offseason. Season stats, standings, WAR, milestones, designations, narrative |
| **ALMANAC.md** | Read-only consumer of season archives, career stats, HOF, retired jerseys |

### Source Specs Consumed

This gospel supersedes the following specs for Mode 3 purposes:

| Spec | What Was Consumed | Remaining Valid Content |
|------|------------------|----------------------|
| OFFSEASON_SYSTEM_SPEC.md | Entire spec (restructured to 13 phases per C-049) | None — fully consumed |
| EOS_RATINGS_ADJUSTMENT_SPEC.md | Rating formulas, position detection, grade factors | None — fully consumed |
| EOS_RATINGS_FIGMA_SPEC.md | Phase 3 UI (corrected per C-090) | None — fully consumed |
| AWARDS_CEREMONY_FIGMA_SPEC.md | Phase 2 UI, wheel spin (per C-086) | None — fully consumed |
| RETIREMENT_FIGMA_SPEC.md | Phase 5 UI | None — fully consumed |
| FREE_AGENCY_FIGMA_SPEC.md | Phase 6 UI | None — fully consumed |
| DRAFT_FIGMA_SPEC.md | Phase 7 UI | None — fully consumed |
| TRADE_FIGMA_SPEC.md | Phase 9 UI | None — fully consumed |
| FINALIZE_ADVANCE_FIGMA_SPEC.md | Phase 13 UI | None — fully consumed |
| SEASON_END_FIGMA_SPEC.md | Phase 1 UI | None — fully consumed |
| SALARY_SYSTEM_SPEC.md | Triple recalc formula, True Value, position multipliers | In-season salary rules (Mode 2), initial salary (Mode 1) |
| FARM_SYSTEM_SPEC.md | Farm reconciliation, draft-to-farm, call-up/send-down | In-season farm operations (Mode 2), startup draft (Mode 1) |
| TRADE_SYSTEM_SPEC.md | Offseason trade rules, AI logic, counter-offers | In-season trade window (Mode 2) |
| PERSONALITY_SYSTEM_SPEC.md | FA destinations, retirement modifiers, trade morale | Personality assignment (Mode 1), behavior effects (Mode 2) |
| SCOUTING_SYSTEM_SPEC.md | Draft scouting, accuracy tables, fat-tail model | Startup scouting (Mode 1) |
| PROSPECT_GENERATION_SPEC.md | Annual draft class generation | Startup prospect pool (Mode 1) |

---

## 21. Decision Traceability

Every STEP4 decision applied in this gospel:

| ID | Decision | Section |
|----|----------|---------|
| C-041 | Contraction fully removed from v1 | §6.1, §19 |
| C-042 | Remove recentPerformance from farm morale | §13.2 |
| C-043 | EOS farm call-up threshold scales with season length | §5.3, §5.6 |
| C-044 | Fan morale → EOS modifier (0.7× at low morale) | §5.4 |
| C-046 | Mid-season salary changes deferred to offseason | §5.1 |
| C-049 | Expand to 13 phases (restore farm recon + chemistry) | §2.1, §13, §14 |
| C-051 | No salary cap in v1 | §5.5, §19 |
| C-052 | 4-modifier personality approved (7 types + 4 hidden) | §8.1, §16.1 |
| C-053 | Team Captain: Loyalty+Charisma, no minimums | §4.2 (Screen 11) |
| C-063 | Resolved by C-086: trait timing (Phase 2 traits, Phase 3 ratings) | §4.1 |
| C-064 | Resolved by C-086: chemistry = potency only | §4.3, §16.2 |
| C-066 | Cornerstone +10% FA retention | §8.1, §8.2 (Screen 3) |
| C-083 | Archive contraction Figma spec | §6.1, §19 |
| C-085 | Remove contraction from gospel | §6.1 |
| C-086 | Trait assignment: wheel spin, potency-only | §4.1, §4.3 |
| C-090 | Fix EOS Figma calculation error | §5.2 |
| C-094 | Archive contraction personality refs | §6.1 |

### Reconciliation Findings Applied

| Finding | Decision | Section |
|---------|----------|---------|
| F-124 | Chemistry types use real SMB4 names (5 types) | §9.3, §14.1 |
| F-125 | FA exchange ±20% True Value, no position restriction | §8.1, §8.2 |
| F-126 | Draft grade range: full A–D, bell curve | §9.3 |
| F-127 | Rookie salary: draft-round-based, locked | §9.6 |
| F-130 | Stadium change mechanic: v1 scope, Phase 4 | §6.1, §6.3 |
| F-131 | Scout grade deviation: fat-tail distribution | §9.4 |
| F-132 | Team Captain: v1 scope, Loyalty+Charisma driven | §4.2 |
| F-133 | Beat reporter pre-decision warning: v1 scope | §11.2, §15.2 |

---

## Changelog

- v1.0 (2026-02-23): Initial gospel draft. Consolidates 17 source specs + 17 STEP4 decisions + 8 reconciliation findings + Franchise Type Design Note. Restructured from 11 to 13 phases per C-049.

---

*This is a GOSPEL document. It is the single source of truth for Mode 3 (Offseason Workshop). If any source spec contradicts this document, this document wins. Source specs should be considered superseded for Mode 3 purposes.*
