# KBL XHD Tracker - Farm System Specification v1.1

## Overview

Every team maintains a farm team of prospects alongside their 22-man major league roster. The farm system creates strategic roster management decisions, provides hope for struggling teams, and enables meaningful consequences for personnel moves.

> **Key Insight**: Bad teams can keep fans engaged by calling up exciting prospects, signaling a commitment to rebuilding. Good teams face pressure to maximize their window with veterans rather than developing youth.

> **v1.1 UPDATE (February 2026)**: Farm roster is now UNLIMITED during the regular season. The 22 MLB / 10 Farm constraint is only enforced at the Phase 11 Finalize & Advance cut-down deadline. Players are limited to 3 options (send-downs) per season.

---

## Farm Roster Structure

### Composition

```typescript
interface FarmRoster {
  teamId: string;
  players: FarmPlayer[];  // Unlimited during season; 10 at Phase 11 cut-down
}
```

### Roster Constraints

| Constraint | During Season | At Phase 11 Finalize |
|-----------|---------------|---------------------|
| MLB Roster | 22 players | 22 players |
| Farm Roster | **Unlimited** | 10 players |
| Options per player per season | **3 max** | N/A |
| Call-up reveals true ratings | **Yes** | N/A |

### Options System

Each player may be optioned (sent to farm) a maximum of **3 times per season**. After 3 options, the player must either remain on the MLB roster or be released outright.

```typescript
interface OptionsTracking {
  playerId: string;
  seasonId: number;
  optionsUsed: number;  // 0-3
  optionDates: GameDate[];
  isOutOfOptions: boolean;  // true when optionsUsed >= 3
}

function canOptionPlayer(player: Player, tracking: OptionsTracking): boolean {
  return tracking.optionsUsed < 3;
}

function optionPlayer(player: Player, tracking: OptionsTracking): void {
  if (!canOptionPlayer(player, tracking)) {
    throw new Error(`${player.name} is out of options (${tracking.optionsUsed}/3 used)`);
  }
  tracking.optionsUsed++;
  tracking.optionDates.push(getCurrentGameDate());
  player.level = 'FARM';
}
```

### Call-Up Rating Reveal

When a farm prospect is called up to the MLB roster, their **true ratings are revealed** for the first time. Before call-up, the user only sees the scouted grade (B, B-, C+, etc.). Upon call-up, the actual numeric ratings (Power, Contact, Speed, etc.) become visible.

```typescript
function callUpPlayer(player: FarmPlayer): MLBPlayer {
  // Reveal true ratings (were hidden as grade-only before)
  player.ratingsRevealed = true;
  player.level = 'MLB';
  
  // True ratings may differ from scouted grade
  // A C+ prospect might reveal A- caliber ratings (scout was wrong)
  // A B prospect might reveal C caliber ratings (scout was overly optimistic)
  
  return player;
}
```

interface FarmPlayer {
  id: string;
  name: string;
  position: Position;
  age: number;
  gender: 'M' | 'F';  // For pronoun generation

  // Rating: full grade range A through D (matches draft class distribution)
  overallRating: 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D';

  // Potential ceiling (what they could become)
  potentialRating: 'A' | 'A-' | 'B+' | 'B' | 'B-';

  // Years in farm system
  yearsInMinors: number;

  // Morale (affected by being passed over, sent down, etc.)
  morale: number;  // 0-100
  moraleFactors: FarmMoraleFactors;

  // Origin
  draftYear: string;
  draftRound: number;

  // ═══════════════════════════════════════════════════════════════
  // PERSONALITY & NARRATIVE (mirrors MLB player schema)
  // ═══════════════════════════════════════════════════════════════
  personality: PersonalityType;  // One of 7 personalities

  // Relationships (can form with MLB players AND other farm players)
  relationships: FarmRelationship[];
  formerRelationships: FormerRelationship[];

  // Narrative tracking
  storylines: FarmStoryline[];  // Active narrative threads
  milestones: FarmMilestone[]; // Notable events in minors
}

interface FarmMoraleFactors {
  baseline: number;              // From personality
  yearsWaiting: number;          // -3 per year after year 2
  passedOver: number;            // -10 each time worse prospect called up
  mentorship: number;            // +5 if has MLB mentor
  recentPerformance: number;     // +/- based on AAA stats (simulated)
  teamProspectRank: number;      // +5 if top prospect, -5 if low ranked
  callUpProximity: number;       // +10 if "next in line"
}

interface FarmRelationship {
  relationshipId: string;
  type: RelationshipType;
  partnerPlayerId: string;
  partnerLocation: 'MLB' | 'FARM';  // Can cross levels!
  role: string;
  isPublic: boolean;
  status: 'ACTIVE' | 'STRAINED' | 'ENDED';
}

interface FarmStoryline {
  id: string;
  type: FarmStorylineType;
  startedSeason: number;
  description: string;
  resolution: string | null;     // How it ended (if ended)
}

type FarmStorylineType =
  | 'BLOCKED_BY_VETERAN'        // Can't get called up because veteran has position
  | 'MENTOR_RELATIONSHIP'       // Being mentored by MLB player
  | 'RIVALRY_WITH_PROSPECT'     // Competing with another prospect
  | 'ROMANTIC_ACROSS_LEVELS'    // Dating MLB player
  | 'PROVING_DOUBTERS_WRONG'    // Was passed over, now excelling
  | 'STRUGGLING_WITH_PRESSURE'  // High expectations, not meeting them
  | 'TRADE_BAIT'                // Being shopped
  | 'HOMETOWN_HERO'             // Local fan favorite before call-up
  | 'ORGANIZATIONAL_FAVORITE';  // Front office loves them
```

### Rating Distribution

Prospects are generated with a normal distribution weighted toward the middle:

| Rating | Distribution | Description |
|--------|-------------|-------------|
| B | 10% | Top prospect, nearly MLB-ready |
| B- | 20% | Solid prospect with upside |
| C+ | 35% | Average prospect, could contribute |
| C | 25% | Filler, depth piece |
| C- | 10% | Organizational player |

### Potential Ceiling

Each prospect has a potential rating representing their ceiling if everything goes right:

```typescript
function generateProspectPotential(currentRating: string): string {
  // Higher current rating = higher likely ceiling
  const potentialMap = {
    'B':  { 'A': 0.20, 'A-': 0.40, 'B+': 0.30, 'B': 0.10 },
    'B-': { 'A': 0.05, 'A-': 0.25, 'B+': 0.40, 'B': 0.30 },
    'C+': { 'A-': 0.05, 'B+': 0.25, 'B': 0.45, 'B-': 0.25 },
    'C':  { 'B+': 0.10, 'B': 0.30, 'B-': 0.60 },
    'C-': { 'B': 0.15, 'B-': 0.85 },
  };

  return weightedRandomSelect(potentialMap[currentRating]);
}
```

---

## Roster Management

### Call-Up (Farm → MLB)

#### Beat Reporter Pre-Decision Warning

Before the call-up is executed, if the narrative system has relevant data (relationship conflicts, morale implications, farm player storylines), a beat reporter warning modal appears. This is a **blocking modal** — the user must acknowledge or dismiss it before the call-up proceeds.

```
╔══════════════════════════════════════════════════════════════╗
║  📰 BEAT REPORTER: HEADS UP                                  ║
╠══════════════════════════════════════════════════════════════╣
║  You're about to call up Jake Morrison (CF).                 ║
║                                                              ║
║  Reporter Sarah Kim notes:                                   ║
║  "Morrison and your CF starter Luis Vega have had tension    ║
║   since last season's locker room incident. This call-up     ║
║   could affect team chemistry."                              ║
║                                                              ║
║    [ Proceed Anyway ]        [ Cancel ]                      ║
╚══════════════════════════════════════════════════════════════╝
```

**Trigger conditions** (modal only appears if at least one is true):
- The prospect has an active negative relationship with a current MLB roster player
- Calling up this player would pass over a higher-morale prospect (morale event risk)
- The prospect has a narrative storyline flagged as `callUpSensitive: true`

**No-data behavior**: If none of the above conditions are met, the call-up executes immediately with no modal.

When a prospect is called up:

1. **Prospect leaves farm roster** (creates vacancy)
2. **Prospect joins MLB roster** (replaces sent-down player or fills open spot)
3. **Happiness effects applied** (see below)
4. **Prospect's contract begins** (rookie salary per draft round — set at draft, not at call-up)

### Rookie Salary Calculation

> **Decision — February 2026**: Rookie salary is committed at draft time based on draft round/position. Ratings, traits, and true grade are all hidden until call-up. The salary does NOT update when ratings are revealed at call-up. It remains locked until EOS recalculation after the player's first full MLB season (their rookie season).

```typescript
/**
 * Calculate rookie salary at the moment of drafting.
 * Called when the user drafts a prospect in the annual draft or the
 * League Builder startup prospect draft.
 *
 * The salary is permanently set here and locked until EOS after their
 * first MLB season — regardless of what ratings are revealed at call-up.
 *
 * Reference: SALARY_SYSTEM_SPEC.md defines league minimum as $0.5M
 */
function calculateRookieSalary(draftRound: number): number {
  const LEAGUE_MINIMUM = 0.5;  // $500K

  const rookieSalaryByRound: Record<number, number> = {
    1: 2.0,   // Round 1: $2.0M — top pick, could be A-tier franchise player
    2: 1.2,   // Round 2: $1.2M — solid prospect
    3: 0.7,   // Round 3: $700K — depth pick
    4: 0.5,   // Round 4+: league minimum
  };

  // Round 4 and beyond all receive league minimum
  const round = Math.min(draftRound, 4);
  return rookieSalaryByRound[round] ?? LEAGUE_MINIMUM;
}
```

| Draft Round | Salary ($M) | Notes |
|-------------|-------------|-------|
| Round 1 | $2.0 | Top pick; true grade unknown at time of signing |
| Round 2 | $1.2 | Solid prospect |
| Round 3 | $0.7 | Depth pick |
| Round 4+ | $0.5 | League minimum |

**Salary lock rule**: Rookie salary is fixed at draft time and does NOT change when true ratings/grade are revealed at call-up. The salary recalculates normally at the next EOS cycle after their first full MLB season.

**Years of Control**: All called-up prospects begin with **3 years of team control** at the rookie salary before becoming arbitration-eligible.

```typescript
interface CallUpEvent {
  playerId: string;
  playerName: string;
  fromFarm: true;
  rating: string;
  potential: string;
  teamRecord: { wins: number; losses: number };
  playoffStatus: PlayoffStatus;
}
```

### Send-Down (MLB → Farm)

#### Beat Reporter Pre-Decision Warning

Same blocking modal pattern as call-up. Appears before the send-down executes if:
- The player being sent down is a Cornerstone, Fan Favorite, or Captain
- The player has a narrative storyline flagged as `sendDownSensitive: true`
- Sending down this player would trigger a high-risk immediate retirement assessment (veteran with 3+ send-down history)

When a major leaguer is sent down:

1. **Player leaves MLB roster**
2. **Player joins farm roster** (replaces called-up prospect)
3. **Player morale hit** (-15 to -25 depending on tenure)
4. **Demotion counter incremented** (affects retirement/free agency risk)
5. **Immediate retirement risk assessed** (veterans may retire rather than accept demotion)
6. **Contract implications** (still counts against payroll, can't leave in free agency mid-season)

```typescript
interface SendDownEvent {
  playerId: string;
  playerName: string;
  toFarm: true;
  wasAlbatross: boolean;
  yearsOfService: number;
  salary: number;
  retirementRisk: number;       // 0-100% chance they retire immediately
  careerDemotionCount: number;  // Total times sent down (cumulative)
}

function calculateImmediateRetirementRisk(player: Player): number {
  // Veterans are more likely to retire than accept demotion
  let risk = 0;

  // Age factor
  if (player.age >= 35) risk += 40;
  else if (player.age >= 32) risk += 20;
  else if (player.age >= 30) risk += 10;

  // Service time factor
  if (player.yearsOfService >= 10) risk += 30;
  else if (player.yearsOfService >= 6) risk += 15;

  // Salary factor (higher paid = more pride)
  if (player.salary >= 20) risk += 20;
  else if (player.salary >= 10) risk += 10;

  // Previous all-star/awards = more pride
  if (player.careerAwards.length > 0) risk += 15;

  // CUMULATIVE DEMOTION FACTOR - each prior demotion increases risk
  // "I'm not going through this again"
  risk += player.careerDemotionCount * 10;

  return Math.min(90, risk);  // Cap at 90% - always small chance they accept
}
```

### Demotion History Tracking

Every send-down is tracked on the player's record, affecting future decisions:

```typescript
interface PlayerDemotionHistory {
  playerId: string;
  demotions: DemotionRecord[];
  totalDemotionCount: number;
}

interface DemotionRecord {
  seasonId: string;
  date: Date;
  teamId: string;
  wasRecalled: boolean;       // Did they make it back to MLB that season?
  daysInMinors: number;       // How long were they down?
}
```

### End-of-Season Effects (If Player Finishes in MLB)

Players who were demoted during the season but finish on the MLB roster have increased offseason attrition risk:

```typescript
interface OffseasonAttritionRisk {
  retirementRisk: number;      // Chance they retire in offseason
  freeAgencyMotivation: number; // How badly they want to leave (affects demands)
}

function calculateOffseasonAttritionRisk(
  player: Player,
  seasonDemotions: number,      // Times sent down THIS season
  careerDemotions: number       // Total career demotions
): OffseasonAttritionRisk {
  let retirementRisk = 0;
  let freeAgencyMotivation = 0;

  // Base retirement risk from age
  if (player.age >= 35) retirementRisk += 25;
  else if (player.age >= 33) retirementRisk += 15;
  else if (player.age >= 31) retirementRisk += 5;

  // THIS SEASON'S demotions - fresh wounds
  retirementRisk += seasonDemotions * 15;        // +15% per demotion this year
  freeAgencyMotivation += seasonDemotions * 20;  // +20% desire to leave per demotion

  // CAREER demotions - accumulated damage to pride
  retirementRisk += careerDemotions * 5;         // +5% per career demotion
  freeAgencyMotivation += careerDemotions * 8;   // +8% desire to leave per career demotion

  // Multiple demotions in same season = especially demoralizing
  if (seasonDemotions >= 2) {
    retirementRisk += 20;           // "They clearly don't believe in me"
    freeAgencyMotivation += 30;     // "I need a fresh start"
  }

  // If they were the Albatross AND got demoted, extra sting
  if (player.wasAlbatrossThisSeason && seasonDemotions > 0) {
    freeAgencyMotivation += 25;     // "The fans hate me here"
  }

  return {
    retirementRisk: Math.min(80, retirementRisk),
    freeAgencyMotivation: Math.min(100, freeAgencyMotivation),
  };
}
```

### Free Agency Motivation Effects

When a player has high free agency motivation, it affects their offseason behavior:

```typescript
function applyFreeAgencyMotivation(
  player: Player,
  motivation: number,  // 0-100
  currentTeam: Team
): FreeAgencyBehavior {
  // Low motivation (0-30): Normal free agency
  if (motivation < 30) {
    return {
      willingToRe-sign: true,
      hometeamDiscount: 0.05,  // 5% discount to stay
      demandPremium: 0,
    };
  }

  // Medium motivation (30-60): Wants to test market
  if (motivation < 60) {
    return {
      willingToRe-sign: true,
      hometeamDiscount: 0,       // No discount - prove you want me
      demandPremium: 0.05,       // Asking 5% more to stay
    };
  }

  // High motivation (60-85): Actively wants out
  if (motivation < 85) {
    return {
      willingToRe-sign: true,    // Will re-sign but at a premium
      hometeamDiscount: -0.10,   // Actually demands 10% MORE to stay
      demandPremium: 0.15,       // Wants 15% premium from current team
      preferredDestinations: getContenders(), // Wants to go somewhere competitive
    };
  }

  // Very high motivation (85+): Desperate to leave
  return {
    willingToRe-sign: false,    // Will not re-sign at any price
    hometeamDiscount: 0,
    demandPremium: 0,
    willTakeDiscount: 0.10,     // Will take 10% LESS to join a contender
    preferredDestinations: getContenders(),
  };
}
```

### Demotion Impact Summary

| Demotions This Season | Retirement Risk Boost | FA Motivation Boost | Special Effect |
|-----------------------|----------------------|---------------------|----------------|
| 1 | +15% | +20% | — |
| 2 | +30% + 20% bonus | +40% + 30% bonus | "They don't believe in me" |
| 3+ | +45%+ | +60%+ | Likely won't re-sign |

| Career Demotions | Additional Retirement Risk | Additional FA Motivation |
|------------------|---------------------------|-------------------------|
| 1-2 | +5-10% | +8-16% |
| 3-4 | +15-20% | +24-32% |
| 5+ | +25%+ | +40%+ |
```

### Swap Transaction

Most common operation - simultaneously call up a prospect and send down a veteran:

```typescript
interface RosterSwap {
  callUp: FarmPlayer;
  sendDown: Player;
  teamId: string;
  timestamp: Date;

  // Calculated effects
  happinessEffect: number;
  narrativeType: SwapNarrativeType;
}

type SwapNarrativeType =
  | 'REBUILD_SIGNAL'      // Bad team calls up prospect (positive)
  | 'YOUTH_MOVEMENT'      // Neutral team tries young player
  | 'DESPERATION_MOVE'    // Good team benches struggling vet
  | 'ALBATROSS_BENCHED'   // Specifically benching the Albatross
  | 'QUESTIONABLE_TIMING' // Good team plays worse player
  | 'VETERAN_EXILE';      // Fan favorite sent down (very negative)
```

---

## Fan Morale Effects

### Call-Up Happiness

The happiness effect of calling up a prospect depends heavily on team context:

```typescript
function calculateCallUpHappiness(
  prospect: FarmPlayer,
  team: Team,
  standings: Standings
): number {
  const playoffStatus = getPlayoffStatus(team, standings);
  const winPct = team.wins / (team.wins + team.losses);

  let baseHappiness = 0;

  // Losing teams get hope from prospects
  if (winPct < 0.400) {
    baseHappiness = +5;  // "At least we're building for the future"

    if (prospect.potentialRating.startsWith('A')) {
      baseHappiness += 3;  // "This kid could be special!"
    }
  }
  // Mediocre teams - neutral to slight positive
  else if (winPct < 0.550) {
    baseHappiness = +2;  // "Interesting to see what he can do"
  }
  // Winning teams - fans worried you're weakening roster
  else {
    baseHappiness = -1;  // "Why are we playing a rookie now?"

    if (playoffStatus === 'IN_HUNT') {
      baseHappiness = -3;  // "We're trying to WIN!"
    }
  }

  // Modifier: If prospect is replacing Albatross, boost happiness
  // (handled in swap calculation)

  return baseHappiness;
}
```

### Send-Down Happiness

```typescript
function calculateSendDownHappiness(
  player: Player,
  team: Team,
  designations: TeamDesignationState
): number {
  let happiness = 0;

  // Sending down the Albatross is always positive
  if (designations.projectedAlbatross?.playerId === player.id ||
      designations.lockedAlbatross === player.id) {
    happiness = +8;  // "Finally! Should've done it sooner"
  }
  // Sending down Fan Favorite is devastating
  else if (designations.projectedFanFavorite?.playerId === player.id ||
           designations.lockedFanFavorite === player.id) {
    happiness = -12;  // "How could you do this to him?!"
  }
  // Sending down Cornerstone is very bad
  else if (designations.cornerstones.some(c => c.playerId === player.id)) {
    happiness = -15;  // "He's a franchise legend!"
  }
  // Regular player - mild negative (fans don't like seeing guys demoted)
  else {
    happiness = -2;

    // Unless they were clearly struggling
    if (player.currentSeasonWAR < 0) {
      happiness = +1;  // "Yeah, he needed to figure things out"
    }
  }

  return happiness;
}
```

### Combined Swap Happiness

```typescript
function calculateSwapHappiness(
  swap: RosterSwap,
  team: Team,
  standings: Standings,
  designations: TeamDesignationState
): number {
  const callUpEffect = calculateCallUpHappiness(swap.callUp, team, standings);
  const sendDownEffect = calculateSendDownHappiness(swap.sendDown, team, designations);

  // Net effect
  let netEffect = callUpEffect + sendDownEffect;

  // Special case: Albatross sent down for prospect on losing team
  // This is the "hope" play - extra bonus
  const isAlbatross = designations.projectedAlbatross?.playerId === swap.sendDown.id;
  const isLosingTeam = (team.wins / (team.wins + team.losses)) < 0.400;

  if (isAlbatross && isLosingTeam) {
    netEffect += 5;  // "New era begins! Goodbye dead weight!"
  }

  // Special case: Good player sent down for worse prospect on winning team
  // This is the "tanking accusations" scenario
  const isWinningTeam = (team.wins / (team.wins + team.losses)) >= 0.550;
  const prospectWorse = getRatingValue(swap.callUp.overallRating) <
                        getRatingValue(swap.sendDown.overallRating);

  if (isWinningTeam && prospectWorse && !isAlbatross) {
    netEffect -= 5;  // "Are we giving up on the season?!"
  }

  return netEffect;
}
```

### Happiness Effect Summary

| Scenario | Losing Team | .500 Team | Winning Team |
|----------|-------------|-----------|--------------|
| Call up high-potential prospect | +8 | +3 | -1 |
| Call up average prospect | +5 | +2 | -2 |
| Send down Albatross | +8 | +8 | +8 |
| Send down Fan Favorite | -12 | -12 | -15 |
| Send down Cornerstone | -15 | -15 | -18 |
| Send down struggling vet | +1 | +1 | +1 |
| Albatross → Prospect (losing) | +18 | — | — |
| Good player → Worse prospect (winning) | — | — | -8 |

---

## The Revenge Arc System

When a player is traded and subsequently outperforms their contract with their new team, the original team suffers consequences. This creates meaningful trade decisions and long-term narratives.

### Tracking Traded Players

```typescript
interface TradedPlayerTracker {
  playerId: string;
  playerName: string;
  originalTeamId: string;
  newTeamId: string;
  tradeDate: Date;

  // Contract at time of trade
  contractAtTrade: {
    salary: number;
    yearsRemaining: number;
  };

  // Was this player the Albatross when traded?
  wasAlbatross: boolean;

  // Was this player the Fan Favorite when traded?
  wasFanFavorite: boolean;

  // Performance tracking
  seasonsTracked: RevengeSeasonData[];
}

interface RevengeSeasonData {
  seasonId: string;
  war: number;
  valueDelta: number;  // True Value - Contract
  outperformed: boolean;  // valueDelta > 0

  // Effects applied to original team
  happinessEffect: number;
  mwarEffect: number;
}
```

### Revenge Arc Calculation

```typescript
function calculateRevengeArcEffect(
  tracker: TradedPlayerTracker,
  currentSeason: SeasonData
): RevengeEffect {
  const yearsSinceTrade = tracker.seasonsTracked.length;

  // Did they outperform this season?
  const outperformed = currentSeason.valueDelta > 0;
  if (!outperformed) {
    return { happiness: 0, mwar: 0, liBoost: 0 };
  }

  // Base effect (diminishes over time)
  // Year 1: 100%, Year 2: 50%, Year 3: 25%, Year 4: 12.5%, etc.
  const diminishingFactor = Math.pow(0.5, yearsSinceTrade - 1);

  // Magnitude based on how much they outperformed
  const outperformMagnitude = getOutperformMagnitude(currentSeason.valueDelta);

  // Extra sting if they were traded as Albatross and became good
  const albatrossRedemptionBonus = tracker.wasAlbatross ? 1.5 : 1.0;

  // Calculate effects
  const baseHappinessHit = -5 * outperformMagnitude * albatrossRedemptionBonus;
  const baseMwarHit = -0.5 * outperformMagnitude * albatrossRedemptionBonus;

  return {
    happiness: baseHappinessHit * diminishingFactor,
    mwar: baseMwarHit * diminishingFactor,
    liBoost: 0.2 * diminishingFactor,  // LI boost when facing old team
  };
}

function getOutperformMagnitude(valueDelta: number): number {
  // How dramatically did they outperform?
  if (valueDelta >= 15) return 3.0;   // Massive bargain
  if (valueDelta >= 10) return 2.0;   // Great value
  if (valueDelta >= 5) return 1.5;    // Good value
  if (valueDelta >= 2) return 1.0;    // Solid value
  return 0.5;                          // Slight outperformance
}
```

### Revenge Arc Diminishing Scale

| Years Since Trade | Effect Multiplier | Example: Albatross becomes All-Star |
|-------------------|-------------------|-------------------------------------|
| Year 1 | 100% | -7.5 happiness, -0.75 mWAR |
| Year 2 | 50% | -3.75 happiness, -0.375 mWAR |
| Year 3 | 25% | -1.875 happiness, -0.19 mWAR |
| Year 4 | 12.5% | -0.94 happiness, -0.09 mWAR |
| Year 5+ | 6.25%... | Minimal but never zero |

### Head-to-Head LI Boost

When a traded player faces their former team, they get an LI boost representing extra motivation:

```typescript
function getRevengeGameLIBoost(
  player: Player,
  opponent: Team,
  tracker: TradedPlayerTracker
): number {
  if (tracker.originalTeamId !== opponent.id) return 0;

  const yearsSinceTrade = getYearsSinceTrade(tracker);
  const diminishingFactor = Math.pow(0.5, yearsSinceTrade - 1);

  // Base boost: +0.5 LI (significant but not overwhelming)
  // "He always plays his best against us..."
  let boost = 0.5 * diminishingFactor;

  // Extra motivation if traded as Albatross (chip on shoulder)
  if (tracker.wasAlbatross) {
    boost *= 1.5;
  }

  // Extra motivation if traded away as Fan Favorite (betrayal)
  if (tracker.wasFanFavorite) {
    boost *= 1.3;
  }

  return boost;
}
```

### Narrative Headlines

```typescript
const REVENGE_ARC_HEADLINES = {
  ALBATROSS_REDEMPTION: [
    "{player} putting up All-Star numbers after {oldTeam} dumped him",
    "Former 'Albatross' {player} making {oldTeam} look foolish",
    "{oldTeam} fans sick watching {player} thrive with {newTeam}",
  ],

  FAN_FAVORITE_REVENGE: [
    "Beloved {player} coming back to haunt {oldTeam}",
    "{player} saving his best for games against former team",
    "{oldTeam} regretting letting {player} walk",
  ],

  QUIET_OUTPERFORMANCE: [
    "{player} quietly outplaying his contract with {newTeam}",
    "Trade looking one-sided as {player} excels",
  ],

  FACING_OLD_TEAM: [
    "{player} circles this date on the calendar",
    "Revenge game: {player} faces the team that traded him",
    "{player} has something to prove against {oldTeam}",
  ],
};
```

---

## Offseason Roster Requirements

Before advancing to the next season, teams must have:

1. **22-man MLB roster** (fully filled)
2. **10-man farm roster** (fully filled)

### Filling Vacancies

```typescript
interface OffseasonRosterCheck {
  teamId: string;
  mlbRosterSize: number;      // Must be 22
  farmRosterSize: number;     // Must be 10
  mlbVacancies: number;
  farmVacancies: number;
}

function getVacancyFillingSources(team: Team): VacancySource[] {
  return [
    'DRAFT',           // Primary source for farm prospects
    'FREE_AGENCY',     // For MLB roster (if budget allows)
    'TRADE',           // Can trade for players
    'CALL_UP',         // Promote from own farm (creates farm vacancy)
    'WAIVER_WIRE',     // Claim released players
  ];
}
```

### Draft Integration

Farm vacancies are primarily filled through the draft:

```typescript
interface DraftPick {
  round: number;
  pick: number;
  teamId: string;

  // Generated prospect
  prospect: FarmPlayer;
}

function generateDraftProspect(round: number): FarmPlayer {
  // Earlier rounds = better prospects
  const ratingDistribution = getDraftRoundDistribution(round);
  const rating = weightedRandomSelect(ratingDistribution);

  return {
    id: generateId(),
    name: generateName(),
    position: randomPosition(),
    age: 18 + Math.floor(Math.random() * 4),  // 18-21
    overallRating: rating,
    potentialRating: generateProspectPotential(rating),
    yearsInMinors: 0,
    morale: 75,  // Fresh and optimistic
    draftYear: currentSeason,
    draftRound: round,
  };
}

function getDraftRoundDistribution(round: number): Record<string, number> {
  // Round 1: Better chance at B-tier prospects
  if (round === 1) {
    return { 'B': 0.25, 'B-': 0.35, 'C+': 0.25, 'C': 0.10, 'C-': 0.05 };
  }
  // Rounds 2-3: Standard distribution
  if (round <= 3) {
    return { 'B': 0.10, 'B-': 0.20, 'C+': 0.35, 'C': 0.25, 'C-': 0.10 };
  }
  // Later rounds: More organizational players
  return { 'B': 0.05, 'B-': 0.15, 'C+': 0.30, 'C': 0.30, 'C-': 0.20 };
}
```

---

## Player Morale Effects

### Morale Impacts

```typescript
const MORALE_EFFECTS = {
  // Positive
  CALLED_UP: +20,              // Dream realized
  RECALLED_AFTER_DEMOTION: +10, // "They still believe in me" (less than first call-up)
  STARTING_REGULARLY: +5,      // Per month of starting
  PLAYOFF_ROSTER: +15,         // Making the playoff roster

  // Negative
  SENT_DOWN_FIRST_TIME: -20,   // First demotion - painful but recoverable
  SENT_DOWN_SECOND_TIME: -30,  // "Here we go again..."
  SENT_DOWN_THIRD_PLUS: -40,   // "They'll never believe in me"
  PASSED_OVER_FOR_CALLUP: -10, // Watch worse prospect get called up
  STUCK_IN_MINORS_3_YEARS: -15, // Career stagnation (prospects only)
  DEMOTED_AS_ALBATROSS: -35,   // Public humiliation

  // Neutral/Recovery
  MORALE_RECOVERY_PER_MONTH: +3, // Gradual healing in minors
  MORALE_RECOVERY_MLB: +5,       // Faster recovery when back in MLB
};

function applyDemotionMoraleEffect(player: Player): void {
  const demotionCount = player.careerDemotionCount;

  let effect: number;
  if (demotionCount === 1) {
    effect = MORALE_EFFECTS.SENT_DOWN_FIRST_TIME;
  } else if (demotionCount === 2) {
    effect = MORALE_EFFECTS.SENT_DOWN_SECOND_TIME;
  } else {
    effect = MORALE_EFFECTS.SENT_DOWN_THIRD_PLUS;
  }

  // Extra sting if demoted while being the Albatross
  if (player.isCurrentAlbatross) {
    effect += MORALE_EFFECTS.DEMOTED_AS_ALBATROSS - MORALE_EFFECTS.SENT_DOWN_FIRST_TIME;
  }

  player.morale = Math.max(0, Math.min(100, player.morale + effect));

  // Low morale affects performance
  if (player.morale < 30) {
    player.mojo -= 5;  // Temporary performance hit
  }
}

function applyRecallMoraleEffect(player: Player): void {
  // First call-up ever = full bonus
  if (player.careerDemotionCount === 0) {
    player.morale += MORALE_EFFECTS.CALLED_UP;
  } else {
    // Being recalled after demotion = smaller bonus (trust damaged)
    player.morale += MORALE_EFFECTS.RECALLED_AFTER_DEMOTION;
  }

  player.morale = Math.min(100, player.morale);
}
```

### Morale → Performance Link

```typescript
function getMoralePerformanceModifier(morale: number): number {
  if (morale >= 80) return 1.05;   // Confident, playing loose
  if (morale >= 60) return 1.00;   // Normal
  if (morale >= 40) return 0.97;   // Pressing slightly
  if (morale >= 20) return 0.93;   // Really struggling
  return 0.88;                      // Broken confidence
}
```

---

## Farm System Narratives

### Overview

Farm players are fully integrated into the narrative system. They have personalities, can form relationships (with MLB players AND other prospects), and generate storylines that create reasons for roster moves.

### Cross-Level Relationships

Farm players can form relationships with MLB players:

```typescript
const CROSS_LEVEL_RELATIONSHIPS = {
  // MLB player mentoring farm prospect
  MENTOR_PROTEGE: {
    requirements: [
      { type: 'same_position_family', check: (mlb, farm) => samePositionFamily(mlb.position, farm.position) },
      { type: 'age_gap_6_plus', check: (mlb, farm) => mlb.age - farm.age >= 6 },
      { type: 'mlb_grade_B_or_higher', check: (mlb, farm) => gradeToNumber(mlb.grade) >= gradeToNumber('B-') },
      { type: 'same_personality_or_compatible', check: (mlb, farm) => canMentor(mlb.personality, farm.personality) }
    ],
    baseChance: 0.10,  // Higher than MLB-only (intentional pairing)
    moraleEffects: {
      mentor: +3,       // MLB player feels valued
      protege: +8       // Farm player feels supported
    },
    narrativeHooks: [
      'MENTOR_VISIT_TO_MINORS',     // Vet goes to watch prospect
      'PHONE_CALL_ADVICE',          // Mentor gives tips
      'PROSPECT_CALLUP_REUNION',    // They're teammates now!
      'MENTOR_ADVOCATES_CALLUP'     // Vet lobbies for prospect
    ]
  },

  // Romantic relationship across levels
  ROMANTIC: {
    requirements: [
      { type: 'opposite_gender', check: (mlb, farm) => mlb.gender !== farm.gender },
      { type: 'age_within_8_years', check: (mlb, farm) => Math.abs(mlb.age - farm.age) <= 8 },
      { type: 'both_single', check: (mlb, farm) => !hasActiveRelationship(mlb, 'ROMANTIC') && !hasActiveRelationship(farm, 'ROMANTIC') }
    ],
    baseChance: 0.02,
    moraleEffects: {
      mlb: +5,
      farm: +10        // Farm player extra happy (dating a big leaguer!)
    },
    narrativeHooks: [
      'LONG_DISTANCE_LOVE',        // Different cities
      'CALLUP_REUNITES_COUPLE',    // Finally same team!
      'TRADE_SEPARATES_COUPLE',    // One gets traded
      'MLB_PLAYER_VISITS_MINORS'   // Uses off-day to visit
    ]
  }
};
```

### Farm-Only Relationships

Prospects can also form relationships with each other:

```typescript
const FARM_ONLY_RELATIONSHIPS = {
  // Two prospects competing for same call-up spot
  RIVALS: {
    requirements: [
      { type: 'same_team_farm', check: (a, b) => a.teamId === b.teamId },
      { type: 'same_position', check: (a, b) => a.position === b.position },
      { type: 'similar_rating', check: (a, b) => Math.abs(gradeToNumber(a.overallRating) - gradeToNumber(b.overallRating)) <= 1 }
    ],
    baseChance: 0.08,
    moraleEffects: {
      bothOngoing: -3,             // Tension
      passedOverForRival: -15,     // "He got called up instead of me"
      callUpOverRival: +10         // "I beat him"
    },
    narrativeHooks: [
      'COMPETING_FOR_CALLUP',      // Both vying for MLB spot
      'ONE_CALLED_UP',             // Creates drama for other
      'RIVALRY_MOTIVATES_BOTH',    // Healthy competition
      'FRIENDSHIP_AFTER_CALLUP'    // Reconcile once both in MLB
    ]
  },

  // Best friends in the minors
  BEST_FRIENDS: {
    requirements: [
      { type: 'same_team_farm', check: (a, b) => a.teamId === b.teamId },
      { type: 'similar_age', check: (a, b) => Math.abs(a.age - b.age) <= 3 },
      { type: 'compatible_personality', check: (a, b) => arePersonalitiesCompatible(a.personality, b.personality) }
    ],
    baseChance: 0.06,
    moraleEffects: {
      bothOngoing: +5,
      oneSeparated: -8             // Trade or call-up separates them
    },
    narrativeHooks: [
      'MINORS_ROOMMATES',          // Shared apartment
      'CALLED_UP_TOGETHER',        // Both make it!
      'ONE_LEFT_BEHIND',           // Bittersweet separation
      'REUNITED_IN_MLB'            // Both eventually make it
    ]
  }
};
```

### Storyline Generation

AI generates farm-specific storylines based on context:

```typescript
const FARM_STORYLINE_TRIGGERS = {
  BLOCKED_BY_VETERAN: {
    detection: (prospect, team) => {
      const mlbStarter = team.mlbRoster.find(p =>
        p.position === prospect.position &&
        p.isStarter &&
        gradeToNumber(p.grade) >= gradeToNumber(prospect.overallRating)
      );
      return mlbStarter && prospect.yearsInMinors >= 2;
    },
    moraleEffect: -5,  // Per season blocked
    narrativePrompt: `${prospect.name} is MLB-ready but blocked by ${mlbStarter.name}. Consider: trade request, position change, or patience storyline.`,
    resolutions: [
      'VETERAN_TRADED',           // Clearing path
      'VETERAN_INJURED',          // Opportunity knocks
      'PROSPECT_TRADED',          // Fresh start elsewhere
      'PROSPECT_POSITION_CHANGE', // Learns new position
      'PROSPECT_PATIENCE_REWARDED' // Finally gets chance
    ]
  },

  PROVING_DOUBTERS_WRONG: {
    detection: (prospect, team) => {
      return prospect.moraleFactors.passedOver <= -20 &&  // Passed over multiple times
             prospect.recentPerformance === 'EXCELLENT';   // But now killing it
    },
    moraleEffect: +10,  // Fighting spirit
    narrativePrompt: `${prospect.name} was passed over repeatedly but is now dominating AAA. This is a redemption arc.`,
    resolutions: [
      'CALLUP_VINDICATION',       // Finally gets the call
      'TRADED_TO_TEAM_THAT_BELIEVES', // Fresh start
      'PROVES_ORIGINAL_TEAM_WRONG'    // Excels after trade
    ]
  },

  STRUGGLING_WITH_PRESSURE: {
    detection: (prospect, team) => {
      return prospect.potentialRating >= 'A-' &&          // High expectations
             prospect.recentPerformance === 'POOR' &&     // Not meeting them
             prospect.morale < 40;                         // Feeling it
    },
    moraleEffect: -8,
    narrativePrompt: `${prospect.name} was supposed to be a star but is crumbling under pressure. Consider: mentor intervention, position change, or confidence event.`,
    resolutions: [
      'MENTOR_HELPS_BREAKTHROUGH',    // Veteran guidance
      'PRESSURE_RELEASE_EVENT',       // Funny moment lightens mood
      'DEMOTION_TO_AA',               // Step back to rebuild
      'TRADE_FRESH_START'             // New environment helps
    ]
  },

  TRADE_BAIT: {
    detection: (prospect, team) => {
      return team.isContender &&
             prospect.potentialRating >= 'B+' &&
             team.tradeNeedsIncludePosition(prospect.position) === false;  // Expendable
    },
    moraleEffect: -5,  // Uncertainty
    narrativePrompt: `${prospect.name} is a valuable chip for a contending team. Trade rumors swirl.`,
    resolutions: [
      'TRADED_FOR_RENTAL',           // Team goes for it
      'KEPT_DESPITE_RUMORS',         // Front office believes
      'TRADED_BECOMES_STAR'          // The one that got away
    ]
  },

  HOMETOWN_HERO: {
    detection: (prospect, team) => {
      return prospect.isLocalDraftPick &&
             prospect.potentialRating >= 'B+' &&
             prospect.morale >= 60;
    },
    moraleEffect: +8,  // Community support
    narrativePrompt: `${prospect.name} is a local kid making good. The community is rallying behind them.`,
    resolutions: [
      'HOMETOWN_CALLUP',             // Dream comes true
      'TRADED_BREAKS_HEARTS',        // Fans devastated
      'BECOMES_FRANCHISE_CORNERSTONE' // Long-term hero
    ]
  }
};
```

### Call-Up Decision Drivers

Narratives create concrete reasons to call up (or not call up) a prospect:

```typescript
interface CallUpRecommendation {
  prospectId: string;
  urgency: 'IMMEDIATE' | 'SOON' | 'MONITOR' | 'NOT_READY';
  reasons: CallUpReason[];
  moraleRisk: number;        // Risk of morale damage if NOT called up
  narrativeOpportunity: string;
}

interface CallUpReason {
  type: CallUpReasonType;
  description: string;
  weight: number;  // How compelling this reason is
}

type CallUpReasonType =
  | 'MENTOR_ADVOCATES'           // MLB mentor lobbying for them (+15)
  | 'BLOCKED_TOO_LONG'           // 3+ years blocked, morale tanking (+12)
  | 'RIVALRY_RESOLUTION'         // Called up over rival, good story (+8)
  | 'ROMANTIC_REUNION'           // Partner is on MLB roster (+5)
  | 'STORYLINE_CLIMAX'           // Current storyline ready to resolve (+10)
  | 'MORALE_CRISIS'              // Below 25, need intervention (+15)
  | 'PERFORMANCE_DEMANDS_IT'     // Dominating AAA, undeniable (+12)
  | 'VETERAN_INJURY_COVER'       // MLB player down, need replacement (+8)
  | 'HOMETOWN_PRESSURE'          // Fans demanding local kid (+6)
  | 'TRADE_VALUE_SHOWCASE';      // Call up to show off before deadline (+5)

function generateCallUpRecommendations(team: Team): CallUpRecommendation[] {
  const recommendations: CallUpRecommendation[] = [];

  for (const prospect of team.farmRoster) {
    const reasons: CallUpReason[] = [];

    // Check for mentor advocacy
    const mentor = findMentorRelationship(prospect);
    if (mentor && mentor.strength >= 7) {
      reasons.push({
        type: 'MENTOR_ADVOCATES',
        description: `${mentor.mlbPlayer.name} has been lobbying for ${prospect.name}'s call-up.`,
        weight: 15
      });
    }

    // Check for blocking duration
    if (prospect.yearsInMinors >= 3 && isBlockedByVeteran(prospect, team)) {
      reasons.push({
        type: 'BLOCKED_TOO_LONG',
        description: `${prospect.name} has been blocked for ${prospect.yearsInMinors} years. Morale at risk.`,
        weight: 12
      });
    }

    // Check for rivalry resolution opportunity
    const rival = findFarmRivalry(prospect);
    if (rival && prospect.recentPerformance === 'EXCELLENT') {
      reasons.push({
        type: 'RIVALRY_RESOLUTION',
        description: `Calling up ${prospect.name} over rival ${rival.name} would be a great story.`,
        weight: 8
      });
    }

    // Check for romantic reunion
    const mlbPartner = findRomanticPartnerOnMLB(prospect, team);
    if (mlbPartner) {
      reasons.push({
        type: 'ROMANTIC_REUNION',
        description: `${prospect.name} and ${mlbPartner.name} are dating. Call-up would reunite them.`,
        weight: 5
      });
    }

    // Check morale crisis
    if (prospect.morale < 25) {
      reasons.push({
        type: 'MORALE_CRISIS',
        description: `${prospect.name}'s morale is critically low (${prospect.morale}). Risk of quitting.`,
        weight: 15
      });
    }

    // Compile recommendation
    if (reasons.length > 0) {
      const totalWeight = reasons.reduce((sum, r) => sum + r.weight, 0);
      recommendations.push({
        prospectId: prospect.id,
        urgency: getUrgencyFromWeight(totalWeight),
        reasons,
        moraleRisk: calculateMoraleRiskIfNotCalledUp(prospect),
        narrativeOpportunity: getBestNarrativeAngle(reasons)
      });
    }
  }

  return recommendations.sort((a, b) =>
    b.reasons.reduce((s, r) => s + r.weight, 0) -
    a.reasons.reduce((s, r) => s + r.weight, 0)
  );
}
```

### Send-Down Decision Drivers

Similarly, narratives can drive send-down decisions:

```typescript
interface SendDownRecommendation {
  playerId: string;
  urgency: 'NECESSARY' | 'CONSIDER' | 'AVOID';
  reasons: SendDownReason[];
  moraleImpact: number;         // Damage to player
  rippleEffects: RippleEffect[];
}

interface SendDownReason {
  type: SendDownReasonType;
  description: string;
  weight: number;
}

type SendDownReasonType =
  | 'CLEAR_PATH_FOR_PROSPECT'    // Prospect ready, vet blocking (+12)
  | 'ALBATROSS_DEMOTION'         // Underperforming overpaid player (+10)
  | 'RELATIONSHIP_SEPARATION'    // Bully being removed (+8, victim gains +15)
  | 'RIVALRY_LOSER'              // Lost position battle to rival (+5)
  | 'NEEDS_RESET'                // Performance tanking, needs confidence reset (+6)
  | 'FARM_MENTOR_OPPORTUNITY';   // Send vet down to mentor struggling prospect (+4)

interface RippleEffect {
  playerId: string;
  type: 'MORALE_BOOST' | 'MORALE_HIT' | 'RELATIONSHIP_CHANGE';
  description: string;
  magnitude: number;
}

function generateSendDownRecommendations(team: Team): SendDownRecommendation[] {
  const recommendations: SendDownRecommendation[] = [];

  for (const player of team.mlbRoster) {
    if (player.isProtected) continue;  // Can't send down cornerstone

    const reasons: SendDownReason[] = [];
    const rippleEffects: RippleEffect[] = [];

    // Check if blocking a ready prospect
    const blockedProspect = findBlockedProspect(player, team);
    if (blockedProspect && blockedProspect.yearsInMinors >= 2) {
      reasons.push({
        type: 'CLEAR_PATH_FOR_PROSPECT',
        description: `Sending down ${player.name} would clear path for ${blockedProspect.name}.`,
        weight: 12
      });
      rippleEffects.push({
        playerId: blockedProspect.id,
        type: 'MORALE_BOOST',
        description: `${blockedProspect.name} finally gets their chance`,
        magnitude: 15
      });
    }

    // Check if player is a bully
    const bullyRelationship = findBullyRelationship(player);
    if (bullyRelationship) {
      const victim = getPlayer(bullyRelationship.playerB);
      reasons.push({
        type: 'RELATIONSHIP_SEPARATION',
        description: `${player.name} has been bullying ${victim.name}. Removing bully improves clubhouse.`,
        weight: 8
      });
      rippleEffects.push({
        playerId: victim.id,
        type: 'MORALE_BOOST',
        description: `${victim.name} relieved that bully is gone`,
        magnitude: 15
      });
    }

    // Check if veteran could mentor struggling prospect
    const strugglingProspect = findStrugglingProspectInFarm(team, player.position);
    if (strugglingProspect && player.personality === 'JOLLY' && player.age >= 32) {
      reasons.push({
        type: 'FARM_MENTOR_OPPORTUNITY',
        description: `${player.name} could mentor struggling ${strugglingProspect.name} in AAA.`,
        weight: 4
      });
      rippleEffects.push({
        playerId: strugglingProspect.id,
        type: 'MORALE_BOOST',
        description: `${strugglingProspect.name} gets veteran guidance`,
        magnitude: 10
      });
    }

    if (reasons.length > 0) {
      recommendations.push({
        playerId: player.id,
        urgency: getUrgencyFromWeight(reasons.reduce((s, r) => s + r.weight, 0)),
        reasons,
        moraleImpact: calculateDemotionMoraleImpact(player),
        rippleEffects
      });
    }
  }

  return recommendations;
}
```

### Farm Narrative Headlines

Beat reporters cover farm system stories:

```typescript
const FARM_NARRATIVE_TEMPLATES = {
  PROSPECT_DOMINATING: [
    "{prospect} is tearing up AAA with a {stat_line}. The {team} can't ignore this much longer.",
    "Sources say {prospect}'s call-up is 'imminent' after another monster week in the minors."
  ],

  BLOCKED_PROSPECT_FRUSTRATED: [
    "{prospect} has done everything asked, but {veteran} isn't going anywhere. Frustration is building.",
    "How long can the {team} keep {prospect} in AAA? The {position} is ready for the show."
  ],

  MENTOR_VISITS_MINORS: [
    "{mentor} made a surprise visit to AAA to work with {prospect}. 'I see a lot of myself in that kid.'",
    "The bond between {mentor} and {prospect} is special. The veteran spent his off-day in {farm_city}."
  ],

  ROMANTIC_SEPARATION: [
    "The {team}'s decision to keep {prospect} in AAA means {{SUBJECT}} and {mlb_partner} remain apart.",
    "Long-distance love: {prospect} and {mlb_partner} make it work despite being in different cities."
  ],

  RIVALRY_HEATS_UP: [
    "{prospect_a} and {prospect_b} are battling for one call-up spot. Only one can win.",
    "The competition between {prospect_a} and {prospect_b} is pushing both to new heights."
  ],

  CALLUP_VINDICATION: [
    "{prospect} finally gets the call after being passed over twice. 'I never stopped believing.'",
    "The wait is over. {prospect} is headed to the big leagues after {years} years in the minors."
  ],

  CALLUP_BREAKS_UP_FRIENDSHIP: [
    "{called_up} is thrilled, but best friend {left_behind} struggles to hide the disappointment.",
    "Bittersweet moment: {called_up} makes the show while {left_behind} stays in AAA."
  ],

  TRADE_RUMOR_SWIRLS: [
    "{prospect} is drawing heavy interest from contenders. The {team} may not be able to hold onto the {position}.",
    "League sources indicate {prospect} could be moved before the deadline. Several teams calling."
  ],

  MORALE_CRISIS_BREWING: [
    "Concerning reports from {farm_city}: {prospect}'s confidence appears shattered after another passed-over.",
    "{prospect}'s body language has coaches worried. The former top pick may need a change of scenery."
  ]
};
```

### Integration with AI Event Generation

Farm context is included in the event generation prompt:

```typescript
function buildEventGenerationPromptWithFarm(context: EventGenerationContext): string {
  const farmSeeds = getFarmEventSeeds(context);

  return `
${buildEventGenerationPrompt(context)}

═══════════════════════════════════════════════════════════════
FARM SYSTEM CONTEXT
═══════════════════════════════════════════════════════════════

FARM ROSTER (${context.farmRoster.length} prospects):
${context.farmRoster.map(p => `
- ${p.name} (${p.position}, ${p.overallRating}→${p.potentialRating} potential)
  Morale: ${p.morale}, Personality: ${p.personality}
  Years in minors: ${p.yearsInMinors}
  Active storylines: ${p.storylines.map(s => s.type).join(', ') || 'None'}
`).join('')}

CROSS-LEVEL RELATIONSHIPS:
${context.crossLevelRelationships.map(r => `
- ${r.type}: ${r.mlbPlayerName} (MLB) ↔ ${r.farmPlayerName} (FARM)
  Status: ${r.status}, Strength: ${r.strength}
`).join('') || 'None'}

FARM-ONLY RELATIONSHIPS:
${context.farmOnlyRelationships.map(r => `
- ${r.type}: ${r.playerA} ↔ ${r.playerB}
  Status: ${r.status}
`).join('') || 'None'}

FARM EVENT SEEDS:
${farmSeeds.map(s => `- ${s.type}: ${s.suggestion}`).join('\n')}

CALL-UP CANDIDATES:
${context.callUpRecommendations.slice(0, 3).map(r => `
- ${r.prospectId}: ${r.urgency} urgency
  Reasons: ${r.reasons.map(rr => rr.description).join('; ')}
`).join('')}

Consider events that:
1. Advance farm player storylines
2. Create reasons for roster moves (call-ups, send-downs)
3. Connect farm players to MLB narrative threads
4. Resolve or escalate cross-level relationships
  `;
}
```

---

## Integration with Designations

### Prospect as Fan Favorite

A called-up prospect CAN become Fan Favorite if they outperform their rookie contract:

```typescript
function canProspectBeFanFavorite(prospect: Player): boolean {
  // Rookies on minimum deals are prime Fan Favorite candidates
  // if they produce above expectations
  return prospect.salary <= getLeagueMinimum() * 1.1 &&
         prospect.yearsOfService < 3;
}
```

### Eliminated Team Prospect Showcase

When a team is eliminated, calling up prospects has enhanced positive effects:

```typescript
function getEliminatedTeamProspectBonus(
  team: Team,
  prospect: FarmPlayer
): number {
  if (!team.eliminated) return 0;

  // "At least we're seeing what the kids can do"
  let bonus = +3;

  // High-potential prospects generate more excitement
  if (prospect.potentialRating.startsWith('A')) {
    bonus += 4;  // "This could be the future!"
  }

  return bonus;
}
```

---

## UI Considerations

### Farm Roster View

```
+------------------------------------------------------------------+
|  FARM TEAM - Giants                              Spots: 10/10    |
+------------------------------------------------------------------+
| Name              | Pos | Age | Rating | Potential | Morale      |
|-------------------|-----|-----|--------|-----------|-------------|
| Tommy Prospect    | SS  | 21  | B      | A-        | 85 😊       |
| Mike Hopeful      | OF  | 23  | B-     | B+        | 72 😐       |
| Joe Average       | 1B  | 22  | C+     | B         | 65 😐       |
| ...               |     |     |        |           |             |
+------------------------------------------------------------------+
| [Call Up]  [View Details]  [Trade]                               |
+------------------------------------------------------------------+
```

### Roster Swap Modal

```
+------------------------------------------------------------------+
|  ROSTER MOVE                                                      |
+------------------------------------------------------------------+
|                                                                   |
|  CALLING UP:                    SENDING DOWN:                     |
|  ┌─────────────────┐           ┌─────────────────┐               |
|  │ Tommy Prospect  │    ←→     │ Big Contract Bob│               |
|  │ SS • B (A- pot) │           │ 1B • B+ • $28M  │               |
|  │ Age 21 • 85 😊  │           │ Age 34 • ALBATROSS              |
|  └─────────────────┘           └─────────────────┘               |
|                                                                   |
|  PROJECTED EFFECTS:                                               |
|  • Fan Morale: +16 📈 (losing team + albatross benched)       |
|  • Bob's Morale: -25 (risk of retirement: 45%)                   |
|  • Payroll: Unchanged ($28M still counts)                        |
|                                                                   |
|  [Confirm Swap]                              [Cancel]             |
+------------------------------------------------------------------+
```

---

## Mechanical Effects for Farm Players

Farm players can receive the same AI-driven narrative events as MLB players, with some farm-specific limitations:

### Supported Event Consequences for Farm Players

| Consequence Type | Farm Support | Notes |
|-----------------|--------------|-------|
| **Morale Changes** | ✅ Full | Same system as MLB |
| **Personality Changes** | ✅ Full | Same 7 personalities |
| **Relationship Changes** | ✅ Full | Can form cross-level relationships |
| **Trait Changes** | ✅ Full | Traits carry to MLB on call-up |
| **Stat Changes** | ⚠️ Limited | Only affects `overallRating` bucket shifts |
| **Position Changes** | ✅ Full | Primary and secondary positions |
| **Pitch Changes** | ✅ Full | For pitcher prospects |
| **Injuries** | ✅ Full | Blocks call-up eligibility |
| **Cosmetic Changes** | ✅ Full | Carries to MLB appearance |
| **Name Changes** | ✅ Full | Same fun rules |
| **Team Changes** | N/A | Farm players don't trigger stadium/manager changes |

### Farm-Specific Stat Changes

Since farm players don't have granular ratings like MLB players, stat changes work differently:

```typescript
function applyFarmStatChange(
  prospect: FarmPlayer,
  change: number,
  duration: number | 'permanent'
): void {
  // Farm players use rating bucket shifts instead of +/- numbers
  // +10 or more = chance to upgrade rating bucket
  // -10 or more = chance to downgrade rating bucket

  if (Math.abs(change) >= 10) {
    const direction = change > 0 ? 'up' : 'down';
    const probability = Math.min(1.0, Math.abs(change) / 20); // 10 = 50%, 20 = 100%

    if (Math.random() < probability) {
      const ratingOrder = ['C-', 'C', 'C+', 'B-', 'B'];
      const currentIndex = ratingOrder.indexOf(prospect.overallRating);

      if (direction === 'up' && currentIndex < ratingOrder.length - 1) {
        prospect.overallRating = ratingOrder[currentIndex + 1];
        logTransaction('PROSPECT_RATING_IMPROVED', {
          prospectId: prospect.id,
          from: ratingOrder[currentIndex],
          to: ratingOrder[currentIndex + 1]
        });
      } else if (direction === 'down' && currentIndex > 0) {
        prospect.overallRating = ratingOrder[currentIndex - 1];
        logTransaction('PROSPECT_RATING_DECLINED', {
          prospectId: prospect.id,
          from: ratingOrder[currentIndex],
          to: ratingOrder[currentIndex - 1]
        });
      }
    }
  }

  // Temporary boosts affect "hot prospect" status but not rating bucket
  if (duration !== 'permanent') {
    prospect.temporaryBoost = {
      change,
      gamesRemaining: duration
    };
  }
}
```

### Farm Injuries

Farm injuries follow the same severity system but have additional effects:

```typescript
interface FarmInjury {
  severity: 'MINOR' | 'MODERATE' | 'SEVERE';
  gamesOut: number;
  description: string;

  // Farm-specific
  blocksCallUp: boolean;           // Cannot be called up while injured
  developmentImpact: number;       // -1 to potential rating if severe
}

const FARM_INJURY_EFFECTS = {
  MINOR: {
    blocksCallUp: true,            // Still blocks call-up
    developmentImpact: 0,          // No long-term effect
    moraleImpact: -5
  },
  MODERATE: {
    blocksCallUp: true,
    developmentImpact: 0,
    moraleImpact: -10
  },
  SEVERE: {
    blocksCallUp: true,
    developmentImpact: -1,         // Potential rating drops by 1 tier
    moraleImpact: -20
  }
};
```

### Carrying Effects to MLB

When a prospect is called up, all accumulated effects carry over:

```typescript
function promoteProspectToMLB(prospect: FarmPlayer, mlbSlot: number): MLBPlayer {
  // Convert farm player to MLB player
  const mlbPlayer: MLBPlayer = {
    id: prospect.id,
    name: prospect.name,
    position: prospect.position,
    age: prospect.age,

    // Convert rating bucket to actual ratings
    ratings: convertRatingBucketToRatings(prospect.overallRating, prospect.position),

    // Carry over ALL narrative elements
    personality: prospect.personality,
    morale: prospect.morale,
    traits: prospect.traits || [],                    // Traits earned in farm
    relationships: prospect.relationships,            // Including cross-level
    formerRelationships: prospect.formerRelationships,

    // Carry cosmetic changes
    cosmetics: prospect.cosmetics,

    // Carry pitch repertoire for pitchers
    pitches: prospect.pitches,

    // Mark as rookie
    isRookie: true,
    serviceTime: 0,

    // Salary based on rating
    salary: calculateRookieSalary(prospect.overallRating),

    // Transfer storylines to "narrative memory" for callbacks
    callUpStorylines: prospect.storylines
  };

  return mlbPlayer;
}
```

---

## Summary

| Component | Description |
|-----------|-------------|
| **Farm Size** | 10 prospects per team |
| **Prospect Ratings** | B to C- (normal distribution centered on C+) |
| **Call-Up Effect** | Positive for losing teams, negative for winning teams |
| **Send-Down Effect** | Based on player designation (Albatross = good, Fan Fav = bad) |
| **Veteran Send-Down** | Retirement risk based on age, salary, service time |
| **Revenge Arc** | Diminishing effects when traded player outperforms (50% per year) |
| **LI Boost** | Traded players get motivation boost vs. former team |
| **Roster Requirement** | 22 MLB + 10 Farm before season can advance |
| **Mechanical Events** | Farm players can receive most AI-driven events; effects carry to MLB |

---

## Changelog

- v1.2 - 2026-01-24 - Added "Mechanical Effects for Farm Players" section: farm players can now receive AI-driven events with trait changes, position changes, pitch changes, injuries, and cosmetics. Effects carry over to MLB on call-up. Added `applyFarmStatChange()` for rating bucket shifts, farm injury effects (blocks call-up, development impact), and `promoteProspectToMLB()` to preserve all narrative elements.
- v1.1 - 2026-01-23 - Added cumulative demotion tracking: each send-down increases retirement risk and free agency motivation. Players who finish season in MLB after demotions have heightened offseason attrition risk.
- v1.0 - 2026-01-23 - Initial spec

