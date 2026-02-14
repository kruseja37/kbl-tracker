# KBL Narrative System Specification

**Version**: 1.1
**Status**: Draft
**Last Updated**: January 2026

## Changelog

- v1.1 - 2026-01-24 - **Major expansion of consequences schema**: Added full mechanical effects from old random events system including `positionChanges`, `pitchChanges`, `injuries` (with severity/duration), `teamChanges` (stadium/manager), `cosmeticChanges` (stance, accessories, name), and `specialEffects` (wild card, fountain of youth, heel turn, etc.). Added comprehensive validation for all new consequence types. Updated event application logic to handle all effects.

---

## 1. Overview

The Narrative System creates emergent storytelling throughout the KBL experience. At its core is the **Beat Reporter** - a named character assigned to each team who observes, reports, and influences the fanbase. Stories emerge from game data, player movements, and historical context, creating a living narrative that makes each franchise feel unique.

### 1.1 Design Philosophy

- **Emergent, not scripted**: Stories arise from actual game events and data
- **Character-driven**: Beat reporters have personalities that color their coverage
- **Influential**: Reporting affects fan morale (for better or worse)
- **Contextual**: Engine aware of lineups, matchups, history, disparities
- **Memorable**: System remembers and callbacks to past events
- **Casual & fun**: Tone is accessible, not ESPN-stiff (unless that's the reporter's personality!)
- **Human, not robotic**: 80/20 personality alignment means characters aren't perfectly predictable

### 1.2 Core Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NARRATIVE SYSTEM ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   CONTEXT    │────▶│   NARRATIVE  │────▶│    OUTPUT    │                │
│  │   ENGINE     │     │   GENERATOR  │     │   CHANNELS   │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│         │                    │                    │                         │
│         ▼                    ▼                    ▼                         │
│  • Lineup analysis     • Beat Reporter      • League News                  │
│  • Performance data    • LLM/Templates      • Team Feed                    │
│  • Historical memory   • Tone/Voice         • Pre-Game                     │
│  • Disparity detection • Story arcs         • Post-Game                    │
│  • Trend spotting      • Quote generation   • In-Game                      │
│                                              • Offseason                    │
│                              │                                              │
│                              ▼                                              │
│                     ┌──────────────┐                                        │
│                     │  FAN MORALE  │                                        │
│                     │   INFLUENCE  │                                        │
│                     └──────────────┘                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Beat Reporter System

### 2.1 Beat Reporter Entity

Each team has an assigned beat reporter who covers the team throughout the season.

```typescript
interface BeatReporter {
  id: string;
  firstName: string;          // From SMB-approved name list
  lastName: string;           // From SMB-approved name list
  teamId: string;

  // Hidden from users
  personality: ReporterPersonality;

  // Visible attributes
  tenure: number;             // Seasons covering this team
  reputation: 'ROOKIE' | 'ESTABLISHED' | 'VETERAN' | 'LEGENDARY';

  // Tracking
  storiesWritten: number;
  fanMoraleInfluence: number; // Cumulative impact this season
  hiredDate: GameDate;
}

// Hidden personality affects tone and fan morale influence
type ReporterPersonality =
  | 'OPTIMIST'      // Finds silver linings, boosts morale
  | 'PESSIMIST'     // Focuses on negatives, drains morale
  | 'BALANCED'      // Neutral, minimal morale influence
  | 'DRAMATIC'      // Amplifies everything, bigger swings
  | 'ANALYTICAL'    // Stats-focused, moderate influence
  | 'HOMER'         // Team cheerleader, strong positive bias
  | 'CONTRARIAN'    // Goes against consensus, unpredictable
  | 'INSIDER'       // Clubhouse access, reveals chemistry/morale
  | 'OLD_SCHOOL'    // Traditional takes, skeptical of analytics
  | 'HOT_TAKE'      // Provocative, volatile morale swings
```

### 2.2 Personality Distribution

```typescript
const REPORTER_PERSONALITY_WEIGHTS = {
  OPTIMIST: 15,      // Common - fans generally like positive coverage
  PESSIMIST: 10,     // Less common but creates drama
  BALANCED: 20,      // Most common - neutral baseline
  DRAMATIC: 12,      // Amplifies storylines
  ANALYTICAL: 10,    // Stats nerds
  HOMER: 8,          // Rare but beloved
  CONTRARIAN: 8,     // Creates tension
  INSIDER: 7,        // Clubhouse scoops
  OLD_SCHOOL: 5,     // Grumpy veterans
  HOT_TAKE: 5        // Rare - most volatile
};
```

### 2.3 Reporter Voice Profiles

Each personality has a distinct writing style:

```typescript
const VOICE_PROFILES: Record<ReporterPersonality, VoiceProfile> = {
  OPTIMIST: {
    tone: 'encouraging',
    vocabulary: ['silver lining', 'turning point', 'breakthrough', 'promising'],
    winReaction: 'enthusiastic celebration',
    lossReaction: 'focus on positives, lessons learned',
    exampleHeadline: "Thunder Find Their Groove in Statement Win"
  },

  PESSIMIST: {
    tone: 'skeptical',
    vocabulary: ['concerning', 'troubling signs', 'question marks', 'worrying'],
    winReaction: 'tempered, waiting for the other shoe',
    lossReaction: 'told you so, deeper problems',
    exampleHeadline: "Win Streak Masks Thunder's Underlying Issues"
  },

  BALANCED: {
    tone: 'neutral',
    vocabulary: ['solid', 'reasonable', 'as expected', 'straightforward'],
    winReaction: 'matter-of-fact reporting',
    lossReaction: 'objective analysis',
    exampleHeadline: "Thunder Top Red Sox 6-4 in Series Opener"
  },

  DRAMATIC: {
    tone: 'theatrical',
    vocabulary: ['stunning', 'electrifying', 'epic', 'collapse', 'miracle'],
    winReaction: 'THIS CHANGES EVERYTHING',
    lossReaction: 'DISASTER, CRISIS MODE',
    exampleHeadline: "THUNDER STORM: Seventh Straight Win Sends Message"
  },

  ANALYTICAL: {
    tone: 'data-driven',
    vocabulary: ['xwOBA', 'expected', 'statistically', 'regression', 'sample size'],
    winReaction: 'cites underlying metrics',
    lossReaction: 'points to process over results',
    exampleHeadline: "Thunder's xBA Surge Finally Translating to Results"
  },

  HOMER: {
    tone: 'fanboy',
    vocabulary: ['our boys', 'gutsy', 'heart', 'believe', 'we'],
    winReaction: 'unbridled joy',
    lossReaction: 'blames umps, bad luck, anything but team',
    exampleHeadline: "Our Thunder Show Heart in Gritty Road Victory"
  },

  CONTRARIAN: {
    tone: 'against the grain',
    vocabulary: ['actually', 'unpopular opinion', 'overlooked', 'contrary to'],
    winReaction: 'warns against overreaction',
    lossReaction: 'actually not that bad',
    exampleHeadline: "Why Thunder's Win Streak Should Worry Fans"
  },

  INSIDER: {
    tone: 'connected',
    vocabulary: ['sources say', 'behind closed doors', 'I'm told', 'clubhouse'],
    winReaction: 'reveals what was said in locker room',
    lossReaction: 'reports on closed-door meetings',
    exampleHeadline: "Inside the Clubhouse: How Thunder Turned Season Around"
  },

  OLD_SCHOOL: {
    tone: 'traditional',
    vocabulary: ['back in my day', 'fundamentals', 'the right way', 'grit'],
    winReaction: 'praises hustle and fundamentals',
    lossReaction: 'blames lack of discipline, new generation',
    exampleHeadline: "Thunder Win the Old-Fashioned Way: Pitching and Defense"
  },

  HOT_TAKE: {
    tone: 'provocative',
    vocabulary: ['overrated', 'fraud', 'actually elite', 'league-best'],
    winReaction: 'extreme proclamations',
    lossReaction: 'calls for firings, trades',
    exampleHeadline: "Thunder Are Officially the Team to Beat in the AL"
  }
};
```

### 2.4 Reporter Fan Morale Influence

Beat reporters influence fan morale through their coverage.

#### The 80/20 Rule

**Reporters align with their personality 80% of the time, but go "off-brand" 20% of the time.**

This creates more human, less predictable characters:
- An OPTIMIST occasionally writes a critical piece
- A PESSIMIST sometimes genuinely celebrates a win
- A HOMER might question a front office decision

**Benefits:**
- Characters feel more realistic and three-dimensional
- Softens extreme personalities (overly positive/negative)
- Creates surprise moments that feel authentic
- Prevents users from perfectly predicting coverage

```typescript
const PERSONALITY_ALIGNMENT_RATE = 0.80;  // 80% on-brand, 20% off-brand

function shouldAlignWithPersonality(): boolean {
  return Math.random() < PERSONALITY_ALIGNMENT_RATE;
}

function getEffectivePersonality(reporter: BeatReporter): ReporterPersonality {
  if (shouldAlignWithPersonality()) {
    return reporter.personality;  // Normal: use their personality
  } else {
    // Off-brand: use a contrasting or neutral personality
    return getOffBrandPersonality(reporter.personality);
  }
}

function getOffBrandPersonality(base: ReporterPersonality): ReporterPersonality {
  const offBrandMap: Record<ReporterPersonality, ReporterPersonality[]> = {
    OPTIMIST: ['BALANCED', 'ANALYTICAL', 'PESSIMIST'],  // Occasionally critical
    PESSIMIST: ['BALANCED', 'ANALYTICAL', 'OPTIMIST'],  // Occasionally positive
    BALANCED: ['OPTIMIST', 'PESSIMIST', 'DRAMATIC'],    // Shows some bias
    DRAMATIC: ['BALANCED', 'ANALYTICAL'],               // Tones it down
    ANALYTICAL: ['DRAMATIC', 'OPTIMIST', 'PESSIMIST'],  // Gets emotional
    HOMER: ['BALANCED', 'CONTRARIAN'],                  // Questions the team
    CONTRARIAN: ['BALANCED', 'HOMER'],                  // Goes with consensus
    INSIDER: ['ANALYTICAL', 'DRAMATIC'],                // Less scoopy
    OLD_SCHOOL: ['ANALYTICAL', 'BALANCED'],             // Embraces new thinking
    HOT_TAKE: ['BALANCED', 'ANALYTICAL']                // Measured take
  };

  return pickRandom(offBrandMap[base]);
}
```

#### Morale Influence Configuration

```typescript
interface ReporterMoraleInfluence {
  // Base influence per story by personality
  baseInfluence: Record<ReporterPersonality, number>;

  // Situational modifiers
  winModifier: number;
  lossModifier: number;
  streakModifier: number;
  bigMomentModifier: number;
}

const REPORTER_MORALE_INFLUENCE = {
  OPTIMIST: {
    basePerStory: +0.5,        // Slight positive bias
    winBoost: +1,              // Extra boost on wins
    lossBuffer: +0.5,          // Softens blow of losses
    streakAmplifier: 1.2       // Amplifies positive streaks
  },

  PESSIMIST: {
    basePerStory: -0.5,        // Slight negative bias
    winBoost: 0,               // Doesn't celebrate wins
    lossBuffer: -1,            // Piles on losses
    streakAmplifier: 0.8       // Dampens positive momentum
  },

  BALANCED: {
    basePerStory: 0,           // No bias
    winBoost: +0.5,
    lossBuffer: -0.5,
    streakAmplifier: 1.0
  },

  DRAMATIC: {
    basePerStory: 0,           // No consistent bias
    winBoost: +2,              // HUGE wins
    lossBuffer: -2,            // DEVASTATING losses
    streakAmplifier: 1.5       // Everything is amplified
  },

  HOMER: {
    basePerStory: +1,          // Strong positive bias
    winBoost: +2,
    lossBuffer: 0,             // Protects from negativity
    streakAmplifier: 1.3
  },

  HOT_TAKE: {
    basePerStory: 0,           // Unpredictable
    winBoost: randomRange(+1, +3),
    lossBuffer: randomRange(-3, 0),
    streakAmplifier: randomRange(0.5, 2.0)
  },

  // ... other personalities
};

function applyReporterInfluence(
  team: Team,
  story: Narrative,
  reporter: BeatReporter
): number {
  // 80/20 rule: use effective personality (may differ from base)
  const effectivePersonality = getEffectivePersonality(reporter);
  const influence = REPORTER_MORALE_INFLUENCE[effectivePersonality];

  let moraleChange = influence.basePerStory;

  // Apply situational modifiers
  if (story.context.wasWin) {
    moraleChange += influence.winBoost;
  } else if (story.context.wasLoss) {
    moraleChange += influence.lossBuffer;
  }

  // Streak amplification
  if (Math.abs(team.currentStreak) >= 3) {
    moraleChange *= influence.streakAmplifier;
  }

  // Big moment amplification
  if (story.priority === 1) {
    moraleChange *= 1.5;
  }

  // Tenure modifier (veteran reporters have more influence)
  const tenureBonus = Math.min(reporter.tenure * 0.1, 0.5);
  moraleChange *= (1 + tenureBonus);

  // Track when reporter went off-brand (for narrative variety)
  if (effectivePersonality !== reporter.personality) {
    story.metadata.reporterWentOffBrand = true;
    story.metadata.usedPersonality = effectivePersonality;
  }

  return moraleChange;
}
```

---

## 3. Reporter Hiring & Firing

### 3.1 Initial Assignment

When a franchise starts or a reporter is fired:

```typescript
function assignNewReporter(team: Team): BeatReporter {
  const firstName = pickRandom(SMB_APPROVED_FIRST_NAMES);
  const lastName = pickRandom(SMB_APPROVED_LAST_NAMES);

  const personality = weightedRandom(REPORTER_PERSONALITY_WEIGHTS);

  return {
    id: generateId(),
    firstName,
    lastName,
    teamId: team.id,
    personality,  // Hidden from user
    tenure: 0,
    reputation: 'ROOKIE',
    storiesWritten: 0,
    fanMoraleInfluence: 0,
    hiredDate: getCurrentDate()
  };
}
```

### 3.2 Reporter Firing (Random Event)

Reporter firing is a random event that can trigger based on various conditions:

```typescript
interface ReporterFiringEvent extends RandomEvent {
  type: 'REPORTER_FIRED';
  triggers: ReporterFiringTrigger[];
  probability: number;
  effects: ReporterFiringEffects;
}

type ReporterFiringTrigger =
  | 'CONTROVERSIAL_TAKE'     // Reporter said something that backfired
  | 'TEAM_COMPLAINT'         // Team complained about coverage
  | 'FAN_BACKLASH'          // Fans turned on reporter
  | 'PUBLICATION_RESTRUCTURE' // Newspaper/site cutbacks
  | 'RETIREMENT'            // Veteran reporter retires
  | 'POACHED'               // Another outlet hired them away
  | 'SCANDAL'               // Reporter involved in scandal

const REPORTER_FIRING_CONFIG = {
  // Base probability per season
  baseProbability: 0.05,  // 5% chance per season

  // Modifiers
  modifiers: {
    lowFanMorale: +0.03,      // Bad morale = someone's gotta be blamed
    highTenure: -0.02,        // Established reporters harder to fire
    hotTakePersonality: +0.05, // Hot takes get you in trouble
    homerPersonality: +0.02,   // Team might complain about bias
    pessimistWithWinningTeam: +0.04, // Fans don't want negativity during success
  },

  // Check frequency
  checkFrequency: 'MONTHLY'  // Roll once per month
};

function checkReporterFiring(team: Team, reporter: BeatReporter): boolean {
  let probability = REPORTER_FIRING_CONFIG.baseProbability;

  // Apply modifiers
  if (team.fanMorale.current < 40) {
    probability += REPORTER_FIRING_CONFIG.modifiers.lowFanMorale;
  }
  if (reporter.tenure >= 5) {
    probability += REPORTER_FIRING_CONFIG.modifiers.highTenure;
  }
  if (reporter.personality === 'HOT_TAKE') {
    probability += REPORTER_FIRING_CONFIG.modifiers.hotTakePersonality;
  }
  if (reporter.personality === 'PESSIMIST' && team.record.winPct > 0.550) {
    probability += REPORTER_FIRING_CONFIG.modifiers.pessimistWithWinningTeam;
  }

  return Math.random() < probability;
}
```

### 3.3 Firing Effects

```typescript
interface ReporterFiringEffects {
  immediateMoraleChange: number;  // Usually negative (fans liked them)
  personalityDelta: PersonalityChange;  // New reporter different?
}

function processReporterFiring(
  team: Team,
  oldReporter: BeatReporter,
  trigger: ReporterFiringTrigger
): ReporterTransition {
  // Immediate fan reaction (usually slight negative)
  let moraleChange = -3;  // Base: fans don't like change

  // But some firings are welcomed
  if (trigger === 'FAN_BACKLASH') {
    moraleChange = +2;  // Fans wanted this
  }
  if (oldReporter.personality === 'PESSIMIST' && team.fanMorale.current > 60) {
    moraleChange = +1;  // Good riddance to negativity
  }

  // Hire new reporter
  const newReporter = assignNewReporter(team);

  // Calculate personality delta for future morale impact
  const personalityDelta = comparePersonalities(
    oldReporter.personality,
    newReporter.personality
  );

  // Generate narrative about the change
  const narrative = generateReporterChangeNarrative(
    oldReporter,
    newReporter,
    trigger
  );

  return {
    oldReporter,
    newReporter,
    trigger,
    moraleChange,
    personalityDelta,
    narrative
  };
}
```

### 3.4 Reporter Change Narratives

```
╔══════════════════════════════════════════════════════════════╗
║  📰 BEAT REPORTER CHANGE                                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  After 7 seasons covering the Thunder, veteran reporter      ║
║  Mike Sullivan has announced his retirement.                 ║
║                                                               ║
║  "It's been an incredible run," Sullivan said. "From the     ║
║  rebuild to the championship, I've seen it all."             ║
║                                                               ║
║  Taking over Thunder coverage will be Sarah Chen, who        ║
║  previously covered the Cubs organization.                    ║
║                                                               ║
║  Fan Reaction: 😢 -3 morale (beloved reporter leaving)       ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 4. Context Engine

The Context Engine analyzes game state to identify story-worthy situations.

### 4.1 Lineup Analysis

```typescript
interface LineupAnalysis {
  // Starter vs Bench disparities
  starterBenched: StarterBenchedSituation[];

  // Platoon situations
  platoonActive: PlatoonSituation[];

  // Prospect/veteran dynamics
  prospectOverVeteran: ProspectSituation[];
  veteranOverProspect: VeteranSituation[];

  // Contract situations
  contractYearPlayers: ContractYearPlayer[];
  expensiveBenchWarmer: ExpensiveBench[];

  // Recent performance affecting lineup
  hotPlayerBenched: HotPlayerBenched[];
  coldPlayerStarting: ColdPlayerStarting[];

  // Age dynamics
  rookieStarting: RookieStarter[];
  veteranResting: VeteranRest[];
}

interface StarterBenchedSituation {
  benchedPlayer: Player;
  startingInstead: Player;
  reason: 'REST' | 'MATCHUP' | 'PERFORMANCE' | 'INJURY' | 'UNKNOWN';
  disparity: {
    trueValueDiff: number;
    salaryDiff: number;
    ageDiff: number;
    recentPerfDiff: number;  // Last 10 games
  };
  storyWorthy: boolean;
  narrativeAngle: string;
}

function analyzeLineup(
  todayLineup: Lineup,
  usualLineup: Lineup,
  team: Team
): LineupAnalysis {
  const analysis: LineupAnalysis = {
    starterBenched: [],
    platoonActive: [],
    prospectOverVeteran: [],
    // ... etc
  };

  // Find unusual lineup decisions
  for (const position of POSITIONS) {
    const usualStarter = usualLineup.getStarter(position);
    const todayStarter = todayLineup.getStarter(position);

    if (usualStarter.id !== todayStarter.id) {
      const situation = analyzeStarterChange(
        usualStarter,
        todayStarter,
        team,
        position
      );

      if (situation.storyWorthy) {
        analysis.starterBenched.push(situation);
      }
    }
  }

  // Check for prospect over veteran situations
  for (const starter of todayLineup.starters) {
    if (starter.isProspect && starter.serviceTime < 1) {
      const blockedVeteran = findBlockedVeteran(starter, team);
      if (blockedVeteran && blockedVeteran.salary > 5_000_000) {
        analysis.prospectOverVeteran.push({
          prospect: starter,
          veteran: blockedVeteran,
          salaryDisparity: blockedVeteran.salary - starter.salary,
          storyAngle: generateProspectStoryAngle(starter, blockedVeteran)
        });
      }
    }
  }

  // Check recent performance vs lineup spot
  for (const starter of todayLineup.starters) {
    const last10 = starter.getRecentPerformance(10);
    if (last10.ops < 0.550 && starter.battingOrder <= 5) {
      analysis.coldPlayerStarting.push({
        player: starter,
        recentOPS: last10.ops,
        battingOrder: starter.battingOrder,
        storyAngle: "struggling bat still in heart of order"
      });
    }
  }

  return analysis;
}
```

### 4.2 Story-Worthy Detection

```typescript
interface StoryWorthyCheck {
  situation: string;
  worthiness: number;  // 0-100
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'VERY_RARE';
  narrativeHooks: string[];
}

const STORY_WORTHY_THRESHOLDS = {
  // Lineup disparities
  salaryDisparity: 10_000_000,      // $10M+ difference is notable
  ageDisparity: 8,                  // 8+ years difference
  trueValueDisparity: 2.0,          // 2+ WAR difference

  // Performance
  hotStreak: {                      // Last 10 games
    ops: 1.000,
    avg: 0.350,
    hr: 4
  },
  coldStreak: {
    ops: 0.500,
    avg: 0.150,
    strikeoutRate: 0.35
  },

  // Historical
  milestoneApproaching: 5,          // Within 5 of milestone
  anniversaryWindow: 7,             // Within 7 days of anniversary

  // Matchup
  careerDominance: {
    minAB: 20,
    avgAgainst: 0.350,
    opsAgainst: 1.000
  },
  careerStruggle: {
    minAB: 20,
    avgAgainst: 0.150,
    opsAgainst: 0.450
  }
};

function isStoryWorthy(situation: any, type: string): StoryWorthyCheck {
  switch (type) {
    case 'PROSPECT_OVER_VETERAN':
      const worthiness = calculateProspectStoryWorthiness(situation);
      return {
        situation: `${situation.prospect.name} starting over $${situation.veteran.salary}M veteran`,
        worthiness,
        rarity: worthiness > 80 ? 'RARE' : 'UNCOMMON',
        narrativeHooks: [
          'youth movement',
          'expensive benchwarmer',
          'prospect hype',
          'front office decision'
        ]
      };

    case 'HOT_PLAYER_BENCHED':
      // Benching someone hitting .400 over last 10? That's a story.
      return {
        situation: `${situation.player.name} benched despite ${situation.recentOPS} OPS`,
        worthiness: 85,
        rarity: 'RARE',
        narrativeHooks: [
          'curious decision',
          'rest day?',
          'matchup concern',
          'manager has explaining to do'
        ]
      };

    // ... other cases
  }
}
```

### 4.3 Historical Memory

```typescript
interface NarrativeMemory {
  // Track significant moments for callbacks
  historicalMoments: HistoricalMoment[];

  // Track ongoing storylines
  activeStorylines: Storyline[];

  // Track player narratives
  playerArcs: Map<string, PlayerArc>;

  // Track team narratives
  teamArcs: TeamArc;

  // Anniversaries and milestones
  upcomingAnniversaries: Anniversary[];
}

interface HistoricalMoment {
  id: string;
  date: GameDate;
  type: MomentType;
  description: string;
  players: string[];
  significance: 1 | 2 | 3 | 4 | 5;  // 5 = franchise-defining

  // For callbacks
  callbackTriggers: string[];  // What situations should reference this
  lastReferenced: GameDate | null;
}

// Examples of historical moments to track:
const TRACKABLE_MOMENTS = [
  'CHAMPIONSHIP_WIN',
  'CHAMPIONSHIP_LOSS',
  'NO_HITTER',
  'PERFECT_GAME',
  'WALK_OFF_WIN_PLAYOFFS',
  'COLLAPSE',           // e.g., 10+ game lead lost
  'COMEBACK',           // e.g., came back from 10+ down
  'TRADE_HEIST',        // Trade that worked out amazingly
  'TRADE_DISASTER',     // Trade that backfired
  'PROSPECT_DEBUT',     // Especially impactful debuts
  'RIVALRY_BRAWL',
  'MILESTONE_ACHIEVED', // 3000 hits, 500 HR, etc.
  'STREAK_RECORD',      // Team or player streak
  'CONTRACTION_SCARE',  // Team almost contracted
  'EXPANSION',          // If team was expansion
];

function findRelevantHistory(
  currentSituation: GameContext,
  memory: NarrativeMemory
): HistoricalMoment[] {
  return memory.historicalMoments.filter(moment => {
    // Check if any callback triggers match current situation
    for (const trigger of moment.callbackTriggers) {
      if (matchesTrigger(currentSituation, trigger)) {
        // Don't reference same moment too often
        if (!moment.lastReferenced ||
            daysSince(moment.lastReferenced) > 30) {
          return true;
        }
      }
    }
    return false;
  });
}
```

---

## 5. Narrative Generation

### 5.1 Generation Pipeline

```typescript
interface NarrativeGenerationPipeline {
  // Step 1: Gather context
  gatherContext(game: Game): NarrativeContext;

  // Step 2: Identify story opportunities
  identifyStories(context: NarrativeContext): StoryOpportunity[];

  // Step 3: Prioritize stories
  prioritizeStories(stories: StoryOpportunity[]): StoryOpportunity[];

  // Step 4: Generate narratives
  generateNarratives(
    stories: StoryOpportunity[],
    reporter: BeatReporter
  ): Promise<Narrative[]>;

  // Step 5: Apply reporter influence
  applyReporterInfluence(
    narratives: Narrative[],
    reporter: BeatReporter,
    team: Team
  ): NarrativeWithInfluence[];
}
```

### 5.2 LLM Integration

We use a **50/50 split** between local and cloud LLM to maximize storytelling quality while maintaining cost awareness. This allows Claude's richer narrative capabilities to drive more of the emergent storytelling.

```typescript
interface LLMNarrativeGenerator {
  // Configuration
  model: 'LOCAL_SMALL' | 'CLOUD_CLAUDE';

  // When to use which
  routingLogic: NarrativeRoutingLogic;

  // Generation
  generate(prompt: NarrativePrompt): Promise<string>;
}

// 50/50 ROUTING SPLIT
// Cloud Claude handles ~50% of narratives for richer storytelling
// Local LLM handles ~50% for cost efficiency on simpler content
const CLOUD_ROUTING_PERCENTAGE = 0.50;  // Can be adjusted if costs need tuning

const NARRATIVE_ROUTING = {
  // ALWAYS use local LLM (cost-efficient for truly routine content)
  LOCAL_ONLY: [
    'BASIC_STAT_LINE',      // Just numbers
    'SIMPLE_SCORE_UPDATE',  // "Team wins 5-3"
    'ROUTINE_LINEUP'        // No surprises
  ],

  // ALWAYS use Claude API (complex narratives that benefit most from quality)
  CLOUD_ONLY: [
    'NO_HITTER',
    'PERFECT_GAME',
    'MILESTONE',
    'HISTORICAL_CALLBACK',
    'CONTROVERSY',
    'TRADE_AFTERMATH',
    'PLAYOFF_CLINCH',
    'CHAMPIONSHIP'
  ],

  // 50/50 SPLIT for these (randomly routed)
  SHARED_POOL: [
    'GAME_RECAP',
    'WALK_OFF',
    'BLOWOUT_WIN',
    'BLOWOUT_LOSS',
    'CLOSE_GAME',
    'PLAYER_HIGHLIGHT',
    'STREAK_UPDATE',
    'STANDINGS_IMPACT',
    'RIVALRY_GAME',
    'EMOTIONAL_MOMENT',
    'LINEUP_ANALYSIS',
    'PRE_GAME_PREVIEW',
    'POST_GAME_QUOTE'
  ]
};

async function generateNarrative(
  context: NarrativeContext,
  reporter: BeatReporter
): Promise<Narrative> {
  const routing = determineRouting(context);

  const prompt = buildNarrativePrompt(context, reporter);

  if (routing === 'LOCAL') {
    return await localLLM.generate(prompt);
  } else {
    return await claudeAPI.generate(prompt);
  }
}

function determineRouting(context: NarrativeContext): 'LOCAL' | 'CLOUD' {
  const { narrativeType } = context;

  // Check mandatory local routing
  if (NARRATIVE_ROUTING.LOCAL_ONLY.includes(narrativeType)) {
    return 'LOCAL';
  }

  // Check mandatory cloud routing
  if (NARRATIVE_ROUTING.CLOUD_ONLY.includes(narrativeType)) {
    return 'CLOUD';
  }

  // For shared pool: 50/50 random split
  if (NARRATIVE_ROUTING.SHARED_POOL.includes(narrativeType)) {
    return Math.random() < CLOUD_ROUTING_PERCENTAGE ? 'CLOUD' : 'LOCAL';
  }

  // Default: use 50/50 split
  return Math.random() < CLOUD_ROUTING_PERCENTAGE ? 'CLOUD' : 'LOCAL';
}

// Cost monitoring - track usage to adjust if needed
interface LLMUsageTracker {
  localCalls: number;
  cloudCalls: number;
  cloudCostEstimate: number;  // Track API costs

  // Alert if costs spike
  checkBudget(): boolean;

  // Allow runtime adjustment
  adjustRoutingPercentage(newPercentage: number): void;
}

function buildNarrativePrompt(
  context: NarrativeContext,
  reporter: BeatReporter
): NarrativePrompt {
  const voice = VOICE_PROFILES[reporter.personality];

  return {
    systemPrompt: `
      You are ${reporter.firstName} ${reporter.lastName}, a ${reporter.reputation.toLowerCase()}
      beat reporter covering the ${context.team.name}.

      Your personality: ${reporter.personality}
      Your tone: ${voice.tone}
      Vocabulary you favor: ${voice.vocabulary.join(', ')}

      Write in a casual, fun style. Keep it concise.
      ${voice.additionalInstructions || ''}
    `,

    userPrompt: `
      Write a ${context.narrativeType} about:
      ${context.summary}

      Key facts:
      ${context.keyFacts.join('\n')}

      Tone for this situation: ${voice[context.situationType]}

      ${context.historicalCallback ? `Reference this past event: ${context.historicalCallback}` : ''}

      Keep it under ${context.maxLength} words.
    `,

    // For quote generation
    playerPersonalities: context.relevantPlayers.map(p => ({
      name: p.name,
      personality: p.hiddenPersonality,
      recentMood: p.morale
    }))
  };
}
```

### 5.3 Quote Generation

Quotes align with hidden player personality, but with the **80/20 rule** to keep players feeling human.

#### The 80/20 Rule for Players

**Players speak in character 80% of the time, but say something "off-brand" 20% of the time.**

This creates authentic variation:
- A COMPETITIVE player occasionally shows vulnerability
- An EGOTISTICAL player sometimes deflects credit to teammates
- A RELAXED player can get fired up after a big win
- A DROOPY player might crack a joke

**This also affects morale perception** - fans can't perfectly predict player reactions, which adds mystery to the hidden personality system.

```typescript
const PLAYER_PERSONALITY_ALIGNMENT_RATE = 0.80;  // 80% on-brand

interface PlayerQuote {
  playerId: string;
  quote: string;
  context: string;
  personalityAligned: boolean;  // Was this an on-brand or off-brand quote?
  effectivePersonality: PersonalityType;  // What personality drove this quote
}

function getEffectivePlayerPersonality(player: Player): PersonalityType {
  if (Math.random() < PLAYER_PERSONALITY_ALIGNMENT_RATE) {
    return player.hiddenPersonality;  // Normal: use their personality
  } else {
    // Off-brand: influenced by mood, situation, or randomness
    return getOffBrandPlayerPersonality(player);
  }
}

function getOffBrandPlayerPersonality(player: Player): PersonalityType {
  // Mood can influence off-brand behavior
  if (player.morale > 80) {
    // Very happy players more likely to be positive
    return pickRandom(['JOLLY', 'RELAXED', 'COMPETITIVE']);
  } else if (player.morale < 30) {
    // Unhappy players more likely to show frustration
    return pickRandom(['COMPETITIVE', 'DROOPY', 'TOUGH']);
  }

  // Default off-brand mapping
  const offBrandMap: Record<PersonalityType, PersonalityType[]> = {
    COMPETITIVE: ['RELAXED', 'JOLLY', 'TIMID'],      // Shows softer side
    RELAXED: ['COMPETITIVE', 'JOLLY'],               // Gets fired up
    DROOPY: ['JOLLY', 'RELAXED'],                    // Lightens up
    JOLLY: ['COMPETITIVE', 'RELAXED'],               // Gets serious
    TOUGH: ['JOLLY', 'RELAXED', 'TIMID'],            // Shows vulnerability
    TIMID: ['COMPETITIVE', 'JOLLY'],                 // Steps up
    EGOTISTICAL: ['RELAXED', 'COMPETITIVE']          // Deflects credit
  };

  return pickRandom(offBrandMap[player.hiddenPersonality]);
}
```

#### Quote Templates by Personality

```typescript
const QUOTE_TEMPLATES_BY_PERSONALITY = {
  COMPETITIVE: {
    win: [
      "We're not satisfied. We've got more work to do.",
      "That's what we expect from ourselves every night.",
      "Good teams find ways to win. That's what we did."
    ],
    loss: [
      "That's not acceptable. Period.",
      "We need to be better. I need to be better.",
      "We'll bounce back. That's not who we are."
    ],
    personalMilestone: [
      "Individual stats don't matter if we're not winning.",
      "It's nice, but we've got bigger goals."
    ]
  },

  RELAXED: {
    win: [
      "Good vibes out there today.",
      "We just went out and played our game.",
      "Fun day at the ballpark."
    ],
    loss: [
      "It happens. We'll get 'em tomorrow.",
      "Can't win 'em all.",
      "On to the next one."
    ]
  },

  EGOTISTICAL: {
    win: [
      "I knew I was going to come through there.",
      "That's why they brought me here.",
      "I've been saying all along I can do this."
    ],
    personalMilestone: [
      "I always knew I'd reach this. It was just a matter of time.",
      "This is what greatness looks like."
    ]
  },

  JOLLY: {
    win: [
      "Man, that was a blast!",
      "I love this team. Best guys in baseball.",
      "Can you believe that?! What a game!"
    ],
    loss: [
      "Hey, we're still having fun out there.",
      "Baseball's a long season. We'll be fine."
    ]
  },

  DROOPY: {
    win: [
      "Yeah, it was good. We needed that.",
      "Nice to get one."
    ],
    loss: [
      "Tough one. Really tough.",
      "I don't know what to say."
    ]
  },

  TOUGH: {
    win: [
      "We showed 'em what we're made of.",
      "That's how you play winning baseball.",
      "Nobody pushes us around."
    ],
    loss: [
      "We got punched. We'll punch back tomorrow.",
      "Not our night. But we'll be ready next time."
    ]
  },

  TIMID: {
    win: [
      "The guys played great. I just tried to contribute.",
      "It was a team effort, really."
    ],
    loss: [
      "I feel like I could have done more.",
      "Hopefully I can help more next time."
    ],
    personalMilestone: [
      "I'm just grateful for the opportunity. The team made it possible.",
      "It's nice, I guess. Just trying to help the team."
    ]
  },

  // ... other personalities
};

function generatePlayerQuote(
  player: Player,
  situation: QuoteSituation,
  useLLM: boolean
): Promise<PlayerQuote> {
  // Apply 80/20 rule
  const effectivePersonality = getEffectivePlayerPersonality(player);
  const isOnBrand = effectivePersonality === player.hiddenPersonality;

  if (!useLLM) {
    // Use template with effective personality
    const templates = QUOTE_TEMPLATES_BY_PERSONALITY[effectivePersonality];
    const quote = pickRandom(templates[situation.type] || templates.win);

    return {
      playerId: player.id,
      quote,
      context: situation.context,
      personalityAligned: isOnBrand,
      effectivePersonality
    };
  } else {
    // Use LLM for unique quote, passing effective personality
    return llm.generateQuote({
      playerName: player.name,
      personality: effectivePersonality,  // Use effective, not hidden
      isOffBrand: !isOnBrand,
      situation: situation,
      mood: player.morale,
      recentPerformance: player.last10Games
    });
  }
}
```

---

## 6. Output Channels

### 6.1 League News Tab

Global stories from around the league:

```typescript
interface LeagueNewsFeed {
  stories: LeagueNewsStory[];
  filters: NewsFilter[];
  refreshRate: number;  // Minutes
}

interface LeagueNewsStory {
  id: string;
  type: 'BREAKING' | 'HEADLINE' | 'UPDATE' | 'RUMOR' | 'FEATURE';
  teams: string[];
  headline: string;
  summary: string;
  fullStory?: string;
  timestamp: GameDate;
  priority: 1 | 2 | 3;

  // For filtering
  tags: string[];
  isUserTeam: boolean;
  isDivision: boolean;
}

const NEWS_FREQUENCY = {
  // Stories generated per game day
  BREAKING: 0.1,      // ~1 per 10 days (rare, important)
  HEADLINE: 2,        // ~2 per day (main stories)
  UPDATE: 5,          // ~5 per day (smaller updates)
  RUMOR: 1,           // ~1 per day (speculation)
  FEATURE: 0.3        // ~1 per 3 days (longer pieces)
};
```

```
╔══════════════════════════════════════════════════════════════╗
║  📺 LEAGUE NEWS                                    Aug 15    ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  🔴 BREAKING                                                  ║
║  Cubs call up top prospect Sam Wilson                        ║
║  The #2 overall prospect gets the call after torching AAA    ║
║  Posted by: Marcus Webb (Cubs beat) • 2h ago                 ║
║                                                               ║
║  ──────────────────────────────────────────────────────────  ║
║                                                               ║
║  📊 STANDINGS WATCH                                          ║
║  Dodgers drop third straight, Giants now 2 back              ║
║  "Concerning trend" says LA reporter Elena Vasquez           ║
║  Posted by: Elena Vasquez (Dodgers beat) • 4h ago            ║
║                                                               ║
║  ──────────────────────────────────────────────────────────  ║
║                                                               ║
║  💬 RUMOR MILL                                               ║
║  Yankees exploring SP market before deadline                  ║
║  Sources tell NY beat reporter rotation depth is concern     ║
║  Posted by: Tony Marino (Yankees beat) • 6h ago              ║
║                                                               ║
║  [All] [My Team] [Division] [Breaking Only]                  ║
╚══════════════════════════════════════════════════════════════╝
```

### 6.2 Team News Feed

Dedicated team coverage from your beat reporter:

```
╔══════════════════════════════════════════════════════════════╗
║  📰 THUNDER BEAT                        Sarah Chen reporting ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  LATEST FROM SARAH CHEN                                      ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐ ║
║  │ "Martinez Delivers in Return to Boston"                │ ║
║  │                                                         │ ║
║  │ The July acquisition had something to prove, and boy   │ ║
║  │ did he deliver. A 2-out, go-ahead double in the 8th    │ ║
║  │ silenced the Fenway faithful and extended the Thunder  │ ║
║  │ win streak to seven.                                   │ ║
║  │                                                         │ ║
║  │ "I had something to prove," Martinez said after the    │ ║
║  │ game. "That's not who we are."                         │ ║
║  │                                                         │ ║
║  │ The trade is looking better by the day...              │ ║
║  │                                           [Read More]   │ ║
║  └────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  EARLIER TODAY                                               ║
║  • Lineup note: Judge gets rest day, Stanton to RF          ║
║  • Sources: Clubhouse energy "best it's been all year"      ║
║                                                               ║
║  THIS WEEK                                                   ║
║  • Win streak analysis: What's driving the surge            ║
║  • Prospect Watch: Rodriguez update from AAA                 ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

### 6.3 Pre-Game Narratives

```typescript
interface PreGameNarratives {
  // Primary storyline
  mainStory: Narrative;

  // Additional context
  subStories: Narrative[];

  // Lineup notes
  lineupNotes: LineupNote[];

  // Matchup context
  matchupContext: MatchupNarrative;

  // Historical callback (if relevant)
  historicalNote?: HistoricalCallback;
}

function generatePreGameNarratives(game: Game): PreGameNarratives {
  const context = gatherPreGameContext(game);
  const reporter = getTeamReporter(game.homeTeam);

  // Analyze lineup for story-worthy situations
  const lineupAnalysis = analyzeLineup(game.lineup, game.usualLineup, game.homeTeam);

  // Check for revenge games, milestones, etc.
  const specialSituations = findSpecialSituations(game);

  // Check historical relevance
  const history = findRelevantHistory(context, narrativeMemory);

  // Generate main story
  const mainStory = await generateNarrative({
    type: 'PRE_GAME',
    context,
    specialSituations,
    history,
    reporter
  });

  // Generate lineup notes
  const lineupNotes = lineupAnalysis.storyWorthy.map(situation =>
    generateLineupNote(situation, reporter)
  );

  return {
    mainStory,
    subStories: specialSituations.map(s => generateSubStory(s, reporter)),
    lineupNotes,
    matchupContext: generateMatchupNarrative(game),
    historicalNote: history.length > 0 ? formatHistoricalCallback(history[0]) : undefined
  };
}
```

### 6.4 Post-Game Narratives

```typescript
interface PostGameNarratives {
  // Main recap
  gameRecap: Narrative;

  // Key moment narratives
  keyMoments: MomentNarrative[];

  // Player spotlights
  playerSpotlights: PlayerSpotlight[];

  // What it means
  implications: ImplicationNarrative;

  // Looking ahead
  lookAhead: Narrative;

  // Fan morale impact summary
  moraleImpact: MoraleImpactSummary;
}
```

### 6.5 In-Game Pop-ups

Real-time narrative moments during gameplay:

```typescript
interface InGameNarrative {
  trigger: InGameTrigger;
  narrative: string;
  timing: 'BEFORE_AB' | 'DURING_AB' | 'AFTER_PLAY' | 'BETWEEN_INNINGS';
  priority: number;
  displayDuration: number;  // Seconds
}

type InGameTrigger =
  | 'MILESTONE_APPROACHING'    // "One HR away from 40"
  | 'REVENGE_AB'              // "First AB against former team"
  | 'STREAK_ON_LINE'          // "Hitting streak at 20 games"
  | 'KEY_MATCHUP'             // "Career .450 against this pitcher"
  | 'INJURY_RETURN'           // "First AB since returning from IL"
  | 'ROOKIE_MOMENT'           // "Making MLB debut"
  | 'CLUTCH_SITUATION'        // "Team is 2-15 with RISP today"
  | 'HISTORICAL_ECHO';        // "Last time this happened..."

// Example pop-up
const examplePopup: InGameNarrative = {
  trigger: 'REVENGE_AB',
  narrative: "Martinez steps in against his former team for the first time since the trade. Boston fans letting him hear it.",
  timing: 'BEFORE_AB',
  priority: 2,
  displayDuration: 5
};
```

### 6.6 Offseason Narratives

Rich storytelling during offseason ceremonies:

```typescript
interface OffseasonNarratives {
  phase: OffseasonPhase;
  openingNarrative: Narrative;
  eventNarratives: EventNarrative[];
  closingNarrative: Narrative;
  reporterCommentary: ReporterCommentary[];
}

// Example: Draft ceremony narrative
const draftNarrative: OffseasonNarratives = {
  phase: 'DRAFT',
  openingNarrative: {
    headline: "Thunder Hold #3 Pick in Deep Draft",
    body: "After a disappointing season, the Thunder have a chance to add a cornerstone piece. Beat reporter Sarah Chen reports the front office is torn between college bat Marcus Johnson and prep arm Tyler Williams."
  },
  eventNarratives: [
    {
      pick: 1,
      narrative: "With the first pick, the rebuilding Tigers select Marcus Johnson. A no-brainer selection that gives Detroit their first baseman of the future."
    },
    {
      pick: 2,
      narrative: "Cubs go with prep arm Tyler Williams. A bit of a surprise - most had them taking a college bat."
    },
    {
      pick: 3,
      narrative: "Thunder on the clock... This pick could define their rebuild."
    }
  ],
  reporterCommentary: [
    {
      afterPick: 3,
      comment: "Interesting choice by the Thunder. Sarah Chen reports the clubhouse is buzzing about the selection."
    }
  ]
};
```

---

## 7. User Customization

### 7.1 Narrative Preferences

```typescript
interface NarrativePreferences {
  // Frequency
  narrativeFrequency: 'MINIMAL' | 'NORMAL' | 'VERBOSE';

  // Content preferences
  showPreGameStories: boolean;
  showPostGameRecaps: boolean;
  showInGamePopups: boolean;
  showLeagueNews: boolean;

  // Quote preferences
  includePlayerQuotes: boolean;

  // Historical callbacks
  historicalCallbackFrequency: 'RARE' | 'NORMAL' | 'FREQUENT';

  // Spoiler control
  hideOtherTeamResults: boolean;  // Don't spoil other games

  // Beat reporter
  showReporterName: boolean;
  showReporterPersonalityHints: boolean;  // Subtle hints about their bias
}

const DEFAULT_PREFERENCES: NarrativePreferences = {
  narrativeFrequency: 'NORMAL',
  showPreGameStories: true,
  showPostGameRecaps: true,
  showInGamePopups: true,
  showLeagueNews: true,
  includePlayerQuotes: true,
  historicalCallbackFrequency: 'NORMAL',
  hideOtherTeamResults: false,
  showReporterName: true,
  showReporterPersonalityHints: false
};
```

### 7.2 Frequency Settings

```typescript
const NARRATIVE_FREQUENCY_CONFIG = {
  MINIMAL: {
    preGameStories: 1,          // Just main story
    postGameStories: 1,         // Just recap
    inGamePopups: 0.3,          // Only major moments
    leagueNewsPerDay: 3,        // Just headlines
    reporterInfluence: 0.5      // Reduced morale impact
  },

  NORMAL: {
    preGameStories: 3,          // Main + 2 sub
    postGameStories: 3,         // Recap + spotlights
    inGamePopups: 1.0,          // All relevant moments
    leagueNewsPerDay: 8,        // Full coverage
    reporterInfluence: 1.0      // Standard morale impact
  },

  VERBOSE: {
    preGameStories: 5,          // All stories
    postGameStories: 5,         // Full breakdown
    inGamePopups: 1.5,          // Extra color
    leagueNewsPerDay: 15,       // Deep coverage
    reporterInfluence: 1.2      // Enhanced morale impact
  }
};
```

---

## 8. Integration Points

### 8.1 Fan Morale Integration

```typescript
// In FAN_MORALE_SYSTEM_SPEC.md
function processNarrativeEvent(narrative: Narrative, team: Team): void {
  const reporter = getTeamReporter(team);
  const influence = applyReporterInfluence(team, narrative, reporter);

  // Apply to fan morale
  const moraleEvent: MoraleEvent = {
    type: 'NARRATIVE_INFLUENCE',
    baseImpact: influence,
    source: `Beat reporter: ${reporter.firstName} ${reporter.lastName}`,
    narrative: narrative.headline
  };

  processMoraleEvent(team, moraleEvent);
}
```

### 8.2 Random Events Integration

```typescript
// In random events system
const REPORTER_EVENTS: RandomEvent[] = [
  {
    type: 'REPORTER_FIRED',
    triggers: ['MONTHLY_CHECK'],
    probability: calculateReporterFiringProbability,
    effect: processReporterFiring
  },
  {
    type: 'REPORTER_CONTROVERSY',
    triggers: ['POST_LOSS', 'POST_TRADE'],
    probability: 0.02,
    effect: processReporterControversy  // Hot take goes viral
  },
  {
    type: 'REPORTER_SCOOP',
    triggers: ['PRE_TRADE_DEADLINE', 'PRE_FREE_AGENCY'],
    probability: 0.05,
    effect: processReporterScoop  // Insider info revealed
  }
];
```

### 8.3 Chemistry/Morale Integration

INSIDER personality reporters can reveal hidden chemistry and morale:

```typescript
function generateInsiderScoop(
  team: Team,
  reporter: BeatReporter
): Narrative | null {
  if (reporter.personality !== 'INSIDER') return null;

  // Chance to reveal clubhouse dynamics
  const revealChance = 0.1;  // 10% per story

  if (Math.random() < revealChance) {
    // Find interesting chemistry or morale situation
    const lowMoralePlayers = team.roster.filter(p => p.morale < 40);
    const chemistryConflicts = team.chemistry.conflicts;

    if (lowMoralePlayers.length > 0) {
      const player = pickRandom(lowMoralePlayers);
      return {
        headline: "Sources: Frustration Building for Key Player",
        body: `${reporter.firstName} ${reporter.lastName} reports that sources close to the team indicate ${player.name} is "not in a great place right now." The ${player.position} has been quieter than usual in the clubhouse lately.`,
        type: 'INSIDER_SCOOP',
        revealsHiddenInfo: true
      };
    }
  }

  return null;
}
```

---

## 9. Data Models

### 9.1 Complete Types

```typescript
interface NarrativeSystem {
  // Core components
  reporters: Map<string, BeatReporter>;  // By team ID
  memory: NarrativeMemory;
  generator: NarrativeGenerator;

  // Active content
  leagueNews: LeagueNewsFeed;
  teamFeeds: Map<string, TeamNewsFeed>;

  // Configuration
  preferences: NarrativePreferences;

  // Stats
  totalStoriesGenerated: number;
  llmCallsToday: number;
  cacheHitRate: number;
}

interface Narrative {
  id: string;
  type: NarrativeType;
  scope: 'LEAGUE' | 'TEAM' | 'PLAYER' | 'GAME';

  // Content
  headline: string;
  body: string;
  quotes?: PlayerQuote[];

  // Metadata
  author: BeatReporter;
  tone: NarrativeTone;
  priority: 1 | 2 | 3;

  // Context
  relatedEntities: string[];
  tags: string[];
  historicalReferences?: string[];

  // Timing
  generatedAt: GameDate;
  publishedAt: GameDate;
  expiresAt: GameDate;

  // Influence
  moraleInfluence: number;
  applied: boolean;
}

type NarrativeType =
  | 'PRE_GAME_MAIN'
  | 'PRE_GAME_SUB'
  | 'POST_GAME_RECAP'
  | 'POST_GAME_SPOTLIGHT'
  | 'IN_GAME_MOMENT'
  | 'LEAGUE_HEADLINE'
  | 'LEAGUE_UPDATE'
  | 'RUMOR'
  | 'FEATURE'
  | 'INSIDER_SCOOP'
  | 'OFFSEASON_CEREMONY'
  | 'MILESTONE'
  | 'TRADE_REACTION'
  | 'LINEUP_NOTE';

type NarrativeTone =
  | 'CELEBRATORY'
  | 'CRITICAL'
  | 'NEUTRAL'
  | 'DRAMATIC'
  | 'ANALYTICAL'
  | 'HOPEFUL'
  | 'CONCERNED'
  | 'NOSTALGIC';
```

---

## 10. AI-Driven Event Generation (Replaces Random Events)

### 10.1 Philosophy: Context-Aware Events, Not Dice Rolls

The old "Random Events" system used dice rolls and lookup tables to trigger ~20 events per season. This felt artificial and disconnected from actual gameplay.

**The new approach**: Claude API analyzes the full game context (player stats, relationships, morale, team needs, historical moments) and generates narratively coherent events that feel like they emerge from the story, not from a random number generator.

**Key Principles**:
1. **Events should make sense** - A veteran mentor event only triggers if a veteran and rookie are actually on the same team with compatible personalities
2. **Events connect to existing narratives** - If two players have a RIVALS relationship, an event might escalate or resolve that tension
3. **Events create future story hooks** - Every event should plant seeds for future narratives
4. **Events respect player personality** - A TIMID player doesn't randomly become a "Media Villain"
5. **Events have consequences** - Not just stat changes, but morale, relationships, and fan reactions

### 10.2 Event Categories (Absorbed from Old System)

The old 20 random events are now **contextually generated** based on team state:

| Old Event | New AI-Driven Trigger | Context Required |
|-----------|----------------------|------------------|
| Random Trait | Player performance triggers trait emergence | 10+ games of consistent behavior pattern |
| Good/Bad Trait | Same as above, weighted by morale/performance | High/low morale + performance match |
| Secondary Position | Player versatility or team need | Cross-training opportunity or injury cover |
| Change Personality | Major life event triggers growth | Award, trade, mentorship, trauma |
| Trade | AI identifies trade candidates | Morale, performance, team fit issues |
| Injury | Fitness state + workload analysis | LOW_STAMINA + heavy usage pattern |
| Hot/Cold Streak | Mojo carryover + narrative momentum | 3+ games of consistent Mojo state |
| Veteran Mentor | MENTOR_PROTEGE relationship detection | Compatible players identified |
| Rivalry Ignited | RIVALS relationship detection | Same position + competitive personalities |
| Fan Favorite | Exceptional value + personality fit | High jersey sales + JOLLY/RELAXED |
| Media Villain | Controversy + personality fit | Low jersey sales + EGOTISTICAL |
| Manager Fired | Team underperformance | 15+ games below expectation |
| Rating Changes | Performance-driven development | Sustained over/under-performance |

### 10.3 The Event Generation Prompt

```typescript
interface EventGenerationContext {
  // Team state
  team: {
    id: string;
    name: string;
    record: { wins: number; losses: number };
    morale: number;
    chemistry: ChemistryReport;
    expectations: TeamExpectations;
    recentTrends: string[];  // "3-game losing streak", "callup performing well"
  };

  // All players with relevant data
  roster: {
    playerId: string;
    name: string;
    position: string;
    age: number;
    grade: string;
    personality: PersonalityType;
    morale: number;
    moraleFactors: MoraleFactors;
    recentPerformance: string;  // "hot", "cold", "steady"
    relationships: RelationshipSummary[];
    traits: string[];
    mojoStreak: number;  // Consecutive games On Fire or Rattled
    fitnessState: FitnessState;
    isStarter: boolean;
    seasonsPlayed: number;
  }[];

  // Relationship network
  activeRelationships: {
    type: RelationshipType;
    playerA: string;
    playerB: string;
    strength: number;
    status: 'ACTIVE' | 'STRAINED';
    recentEvents: string[];
  }[];

  // Historical context
  recentEvents: {
    season: number;
    game: number;
    type: string;
    description: string;
    playersInvolved: string[];
  }[];

  // Season context
  seasonContext: {
    gameNumber: number;
    totalGames: number;
    phase: 'EARLY' | 'MIDSEASON' | 'STRETCH' | 'PLAYOFFS';
    tradeDeadlinePassed: boolean;
    allStarBreak: boolean;
  };

  // Event budget
  eventsThisSeason: number;
  targetEventsPerSeason: number;  // ~20
  eventsSinceLastOne: number;

  // ═══════════════════════════════════════════════════════════════
  // FARM SYSTEM CONTEXT (see FARM_SYSTEM_SPEC.md for full details)
  // ═══════════════════════════════════════════════════════════════
  farmRoster: FarmPlayerContext[];      // All 10 farm players with personality, morale, storylines
  crossLevelRelationships: CrossLevelRelationship[];  // MLB ↔ Farm relationships
  farmOnlyRelationships: FarmRelationship[];          // Farm ↔ Farm relationships
  callUpRecommendations: CallUpRecommendation[];      // AI-suggested call-ups with narrative reasons
  sendDownRecommendations: SendDownRecommendation[];  // AI-suggested send-downs with ripple effects
}

async function generateContextualEvent(
  context: EventGenerationContext
): Promise<GeneratedEvent | null> {
  // Check if we should even try to generate an event
  if (!shouldAttemptEventGeneration(context)) {
    return null;
  }

  const prompt = buildEventGenerationPrompt(context);

  const response = await claudeAPI.generate({
    systemPrompt: EVENT_GENERATION_SYSTEM_PROMPT,
    userPrompt: prompt,
    responseFormat: 'json',
    maxTokens: 1000
  });

  const event = parseEventResponse(response);

  // Validate event makes sense given context
  if (!validateGeneratedEvent(event, context)) {
    return null;  // AI hallucinated something impossible
  }

  return event;
}
```

### 10.4 System Prompt for Event Generation

```typescript
const EVENT_GENERATION_SYSTEM_PROMPT = `
You are the narrative engine for a baseball franchise simulation. Your job is to generate
meaningful events that emerge naturally from the current team situation.

RULES:
1. Events must be grounded in the provided context - no inventing players or situations
2. Events should connect to existing relationships, morale states, or performance trends
3. Events should create consequences (morale changes, relationship formation/changes, stat effects)
4. Events should plant seeds for future storylines
5. Respect player personalities - a TIMID player doesn't become a media villain
6. Consider team chemistry - toxic clubhouses breed different events than harmonious ones
7. Events should feel earned, not random

EVENT TYPES YOU CAN GENERATE:

TRAIT & PERSONALITY:
- TRAIT_EMERGENCE: Player develops a new trait based on behavior pattern
- PERSONALITY_SHIFT: Major event causes personality change

RELATIONSHIPS (can be same-team, cross-team, or player + non-player):
- RELATIONSHIP_FORMED: Two players form a new relationship (friendship, rivalry, mentor, romantic)
- RELATIONSHIP_EVOLVED: Existing relationship strengthens, strains, or transforms
- RELATIONSHIP_ENDED: Relationship breaks due to conflict or circumstance
- DATING_BEGUN: Two players start dating (same-team more common, cross-team possible)
- DATING_CROSS_TEAM: Players on different teams begin dating (met during series)
- MARRIAGE: Dating couple gets married (requires 40+ games of dating, strength 7+)
- MARRIAGE_NON_PLAYER: Single player marries someone outside the league
- DIVORCE: Married couple divorces (requires strained relationship or trigger event)
- DIVORCE_NON_PLAYER: Player divorces non-player spouse

PERFORMANCE:
- INJURY: Player suffers injury (must be grounded in fitness/workload)
- HOT_STREAK: Player enters a hot streak (must connect to recent Mojo trends)
- COLD_STREAK: Player enters a cold streak

NARRATIVE:
- TRADE_RUMOR: Trade speculation begins (must connect to morale/performance issues)
- FAN_FAVORITE_DECLARED: Player becomes fan favorite
- MEDIA_VILLAIN_DECLARED: Player becomes media villain
- MANAGER_PRESSURE: Manager faces firing pressure
- VETERAN_WISDOM: Veteran shares wisdom with younger player (may trigger mentorship)
- CLUBHOUSE_INCIDENT: Conflict erupts (must involve compatible personalities)
- BREAKTHROUGH_MOMENT: Young player has breakthrough (connects to mentorship or morale)
- REVENGE_MOTIVATION: Player motivated by upcoming matchup vs former team/player
- CONTRACT_TENSION: Contract year creates pressure

ROMANTIC RELATIONSHIP NOTES:
- 90% of romantic relationships are opposite-sex (M/F)
- 10% are same-sex (M/M or F/F) - less common but fully supported
- Cross-team dating: love at first sight! Just need to face each other ONCE
- Same-team dating requires ~12 games together (scaled for season length)
- Marriage requires ~25 games of dating and relationship strength 7+ (scaled for season length)
- On marriage: women take husband's name; for same-sex, lower-WAR player takes spouse's name
- Divorce causes severe morale hit (-35 for dumped party, -15 for initiator)
- Divorced players facing ex-spouse get 1.6× LI boost (revenge motivation)

FAMILY EVENTS:
- CHILD_BORN: Married couple has a child (requires 20+ games married, 5% chance per season)
  - Adds +10 morale to both parents
  - Non-player spouse marriages: child adds +0.1× LI at home games (family in stands!)
  - Max +0.5× child bonus (5 kids)
  - Creates memorable narrative moment

FARM SYSTEM EVENTS (can involve farm players):
- PROSPECT_BLOCKED_FRUSTRATION: Farm player frustrated by veteran blocking their path
- CROSS_LEVEL_MENTOR_FORMED: MLB veteran begins mentoring farm prospect
- CROSS_LEVEL_ROMANTIC: Romance forms between MLB and farm player
- FARM_RIVALRY_HEATS_UP: Two prospects competing for same call-up spot
- FARM_FRIENDSHIP_FORMED: Two prospects become close friends
- PROSPECT_PROVING_DOUBTERS: Previously passed-over prospect now dominating
- PROSPECT_STRUGGLING_PRESSURE: High-ceiling prospect crumbling under expectations
- CALLUP_RECOMMENDATION: Narrative reasons emerge to call up a specific prospect
- SENDDOWN_RECOMMENDATION: Narrative reasons emerge to send down an MLB player
- MENTOR_ADVOCATES_CALLUP: MLB mentor lobbies for their protege's promotion
- TRADE_BAIT_SWIRLING: Contending team's expendable prospect drawing interest
- CALLUP_SEPARATES_FRIENDS: Call-up breaks up farm friendship
- CALLUP_REUNITES_COUPLE: Call-up brings romantic partners together
- HOMETOWN_HERO_PRESSURE: Local prospect facing fan pressure for call-up

RESPONSE FORMAT (JSON):
{
  "shouldGenerateEvent": boolean,  // false if context doesn't support a natural event
  "event": {
    "type": "EVENT_TYPE",
    "headline": "Short headline for display",
    "description": "1-2 sentence description",
    "playersInvolved": ["player_id_1", "player_id_2"],
    "consequences": {
      // === PLAYER MORALE & PERSONALITY ===
      "moraleChanges": [{ "playerId": "...", "change": +/-N, "reason": "..." }],
      "personalityChanges": [{ "playerId": "...", "from": "...", "to": "..." }],

      // === RELATIONSHIPS ===
      "relationshipChanges": [{
        "type": "FORMED|EVOLVED|ENDED|MARRIED|DIVORCED",
        "relType": "DATING|MARRIED|DIVORCED|BEST_FRIENDS|MENTOR_PROTEGE|RIVALS|BULLY_VICTIM|JEALOUS|CRUSH",
        "players": ["player_id_1", "player_id_2"],
        "isCrossTeam": boolean,             // true if players on different teams
        "isNonPlayer": boolean,             // true if playerB is non-player spouse
        "nonPlayerSpouse": {                // only if isNonPlayer=true
          "name": "...",
          "gender": "M|F",
          "occupation": "..."
        },
        "initiator": "player_id",           // who initiated (for breakups/divorce)
        "reason": "..."                     // narrative reason
      }],

      // === RATINGS & TRAITS ===
      "statChanges": [{
        "playerId": "...",
        "stat": "POW|CON|SPD|FLD|ARM|VEL|JNK|ACC|ALL",  // "ALL" for all stats
        "change": +/-N,          // -10 to +10 typical
        "duration": N,           // games, or "season" for permanent until EOS
        "isPermanent": boolean   // true = immediate EOS adjustment
      }],
      "traitChanges": [{
        "playerId": "...",
        "action": "ADD|REMOVE|SWAP",
        "trait": "...",
        "replaceTrait": "..."    // only if action=SWAP
      }],

      // === POSITION CHANGES ===
      "positionChanges": [{
        "playerId": "...",
        "type": "PRIMARY|SECONDARY|LOSE_SECONDARY",
        "newPosition": "C|1B|2B|3B|SS|LF|CF|RF|SP|RP|CP",
        "oldPosition": "..."     // for logging/narrative
      }],

      // === PITCH REPERTOIRE (pitchers only) ===
      "pitchChanges": [{
        "playerId": "...",
        "action": "ADD|REMOVE",
        "pitch": "Fastball|Changeup|Slider|Curveball|Cutter|Sinker|Splitter|Knuckleball|Screwball"
      }],

      // === INJURY SYSTEM ===
      "injuries": [{
        "playerId": "...",
        "severity": "MINOR|MODERATE|SEVERE",
        "gamesOut": N,           // 3-5 minor, 10-20 moderate, 30-60 severe
        "affectedStat": "...",   // optional: stat that takes -5 when returning
        "description": "..."     // "Hamstring strain", "Elbow soreness", etc.
      }],

      // === TEAM-LEVEL CHANGES ===
      "teamChanges": [{
        "teamId": "...",
        "type": "STADIUM_CHANGE|MANAGER_FIRED|MANAGER_HIRED",
        "details": {
          "newStadium": "...",   // for STADIUM_CHANGE
          "oldManager": "...",   // for MANAGER_FIRED
          "newManager": "...",   // for MANAGER_HIRED (random or named)
          "reason": "..."        // narrative reason
        }
      }],

      // === COSMETIC CHANGES (fun/flavor) ===
      "cosmeticChanges": [{
        "playerId": "...",
        "type": "BATTING_STANCE|ARM_ANGLE|FACIAL_HAIR|ACCESSORY|NAME",
        "details": {
          "newValue": "...",     // new stance/angle/style
          "accessoryType": "SILLY|COOL",  // for ACCESSORY
          "newFirstName": "...", // for NAME (boy first name)
          "newLastName": "..."   // for NAME (girl last name)
        }
      }],

      // === SPECIAL/COMPOUND EVENTS ===
      "specialEffects": [{
        "type": "WILD_CARD|REROLL|FOUNTAIN_OF_YOUTH|SECOND_WIND|REDEMPTION_ARC|HEEL_TURN",
        "details": {
          // WILD_CARD: apply two events
          "secondEvent": {...},
          // FOUNTAIN_OF_YOUTH: age adjustment
          "ageAdjustment": -5,
          // SECOND_WIND: restore peak ratings temporarily
          "restorePeakRatings": true,
          "duration": N,
          // REDEMPTION_ARC: double future clutch points
          "clutchMultiplier": 2.0,
          // HEEL_TURN: fame boners + stat boost
          "fameBoners": 3,
          "statBoost": { "POW": 10 }
        }
      }]
    },
    "narrativeHook": "Future story thread this plants",
    "beatReporterAngle": "How the beat reporter might cover this"
  },
  "reasoning": "Why this event makes sense given the context"
}
`;
```

### 10.5 Event Validation

The AI might hallucinate impossible events. We validate before applying:

```typescript
function validateGeneratedEvent(
  event: GeneratedEvent,
  context: EventGenerationContext
): boolean {
  // Check all players exist (MLB roster OR farm roster)
  for (const playerId of event.playersInvolved) {
    const inMLB = context.roster.find(p => p.playerId === playerId);
    const inFarm = context.farmRoster?.find(p => p.playerId === playerId);
    if (!inMLB && !inFarm) {
      console.warn(`Event references non-existent player: ${playerId}`);
      return false;
    }
  }

  // For farm-specific events, verify farm context exists
  const farmEventTypes = [
    'PROSPECT_BLOCKED_FRUSTRATION', 'CROSS_LEVEL_MENTOR_FORMED', 'CROSS_LEVEL_ROMANTIC',
    'FARM_RIVALRY_HEATS_UP', 'FARM_FRIENDSHIP_FORMED', 'PROSPECT_PROVING_DOUBTERS',
    'PROSPECT_STRUGGLING_PRESSURE', 'CALLUP_RECOMMENDATION', 'SENDDOWN_RECOMMENDATION',
    'MENTOR_ADVOCATES_CALLUP', 'TRADE_BAIT_SWIRLING', 'CALLUP_SEPARATES_FRIENDS',
    'CALLUP_REUNITES_COUPLE', 'HOMETOWN_HERO_PRESSURE'
  ];
  if (farmEventTypes.includes(event.type) && !context.farmRoster?.length) {
    console.warn(`Farm event ${event.type} generated but no farm roster in context`);
    return false;
  }

  // Type-specific validation
  switch (event.type) {
    case 'RELATIONSHIP_FORMED':
      return validateRelationshipFormation(event, context);

    case 'TRAIT_EMERGENCE':
      return validateTraitEmergence(event, context);

    case 'PERSONALITY_SHIFT':
      return validatePersonalityShift(event, context);

    case 'INJURY':
      return validateInjury(event, context);

    case 'MENTOR_PROTEGE':
      return validateMentorship(event, context);

    default:
      // For all events, validate consequence-specific rules
      return validateConsequences(event, context);
  }
}

// ═══════════════════════════════════════════════════════════════
// CONSEQUENCE-SPECIFIC VALIDATION
// ═══════════════════════════════════════════════════════════════

function validateConsequences(
  event: GeneratedEvent,
  context: EventGenerationContext
): boolean {
  const { consequences } = event;

  // Validate stat changes
  if (consequences.statChanges?.length) {
    for (const sc of consequences.statChanges) {
      const player = context.roster.find(p => p.playerId === sc.playerId) ||
                     context.farmRoster?.find(p => p.playerId === sc.playerId);
      if (!player) return false;

      // Validate stat is appropriate for player type
      const pitcherStats = ['VEL', 'JNK', 'ACC'];
      const batterStats = ['POW', 'CON', 'SPD', 'FLD', 'ARM'];

      if (sc.stat !== 'ALL') {
        if (player.isPitcher && batterStats.includes(sc.stat)) {
          console.warn(`Cannot apply batter stat ${sc.stat} to pitcher ${sc.playerId}`);
          return false;
        }
        if (!player.isPitcher && pitcherStats.includes(sc.stat)) {
          console.warn(`Cannot apply pitcher stat ${sc.stat} to position player ${sc.playerId}`);
          return false;
        }
      }

      // Validate change magnitude is reasonable
      if (Math.abs(sc.change) > 20) {
        console.warn(`Stat change ${sc.change} exceeds maximum ±20`);
        return false;
      }
    }
  }

  // Validate position changes
  if (consequences.positionChanges?.length) {
    const validPositions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'RP', 'CP', 'DH'];

    for (const pc of consequences.positionChanges) {
      const player = context.roster.find(p => p.playerId === pc.playerId) ||
                     context.farmRoster?.find(p => p.playerId === pc.playerId);
      if (!player) return false;

      if (!validPositions.includes(pc.newPosition)) {
        console.warn(`Invalid position: ${pc.newPosition}`);
        return false;
      }

      // Cannot change pitcher to position player or vice versa
      const isPitcherPosition = ['SP', 'RP', 'CP'].includes(pc.newPosition);
      if (player.isPitcher && !isPitcherPosition && pc.type === 'PRIMARY') {
        console.warn(`Cannot change pitcher to position player`);
        return false;
      }
      if (!player.isPitcher && isPitcherPosition && pc.type === 'PRIMARY') {
        console.warn(`Cannot change position player to pitcher`);
        return false;
      }
    }
  }

  // Validate pitch changes
  if (consequences.pitchChanges?.length) {
    const validPitches = [
      'Fastball', 'Changeup', 'Slider', 'Curveball', 'Cutter',
      'Sinker', 'Splitter', 'Knuckleball', 'Screwball'
    ];

    for (const pc of consequences.pitchChanges) {
      const player = context.roster.find(p => p.playerId === pc.playerId) ||
                     context.farmRoster?.find(p => p.playerId === pc.playerId);
      if (!player) return false;

      if (!player.isPitcher) {
        console.warn(`Cannot modify pitches for position player ${pc.playerId}`);
        return false;
      }

      if (!validPitches.includes(pc.pitch)) {
        console.warn(`Invalid pitch type: ${pc.pitch}`);
        return false;
      }

      // Cannot remove last pitch
      if (pc.action === 'REMOVE' && player.pitches?.length <= 1) {
        console.warn(`Cannot remove last pitch from ${pc.playerId}`);
        return false;
      }
    }
  }

  // Validate injuries
  if (consequences.injuries?.length) {
    for (const injury of consequences.injuries) {
      const player = context.roster.find(p => p.playerId === injury.playerId) ||
                     context.farmRoster?.find(p => p.playerId === injury.playerId);
      if (!player) return false;

      // Validate severity and games out are consistent
      const severityRanges = {
        MINOR: { min: 3, max: 10 },
        MODERATE: { min: 10, max: 30 },
        SEVERE: { min: 30, max: 81 }
      };

      const range = severityRanges[injury.severity];
      if (injury.gamesOut < range.min || injury.gamesOut > range.max) {
        console.warn(`Injury games (${injury.gamesOut}) inconsistent with severity ${injury.severity}`);
        return false;
      }
    }
  }

  // Validate team changes
  if (consequences.teamChanges?.length) {
    for (const tc of consequences.teamChanges) {
      const team = context.team?.id === tc.teamId ? context.team :
                   context.allTeams?.find(t => t.id === tc.teamId);
      if (!team) {
        console.warn(`Team ${tc.teamId} not found`);
        return false;
      }
    }
  }

  // Validate personality changes have valid values
  if (consequences.personalityChanges?.length) {
    const validPersonalities = [
      'COMPETITIVE', 'RELAXED', 'DROOPY', 'JOLLY', 'TOUGH', 'TIMID', 'EGOTISTICAL'
    ];

    for (const pc of consequences.personalityChanges) {
      if (!validPersonalities.includes(pc.to)) {
        console.warn(`Invalid personality type: ${pc.to}`);
        return false;
      }
    }
  }

  // Validate traits exist in trait registry
  if (consequences.traitChanges?.length) {
    for (const tc of consequences.traitChanges) {
      if (!VALID_TRAITS.includes(tc.trait)) {
        console.warn(`Invalid trait: ${tc.trait}`);
        return false;
      }

      if (tc.action === 'SWAP' && tc.replaceTrait && !VALID_TRAITS.includes(tc.replaceTrait)) {
        console.warn(`Invalid replacement trait: ${tc.replaceTrait}`);
        return false;
      }
    }
  }

  return true;
}

/**
 * RELATIONSHIP COMPATIBILITY CRITERIA
 * Players are considered "compatible" for relationship formation if ANY of:
 * 1. Personality match/complement (defined in RELATIONSHIP_REQUIREMENTS)
 * 2. Shared team history ≥50 games together
 * 3. Shared minor league level (were teammates in farm system)
 */
function isCompatibleForRelationship(playerA: Player, playerB: Player, context: EventGenerationContext): boolean {
  // Check personality compatibility (match or complement)
  const personalityCompatible = arePersonalitiesCompatible(playerA.personality, playerB.personality);

  // Check shared team history (50+ games together)
  const sharedGames = context.teamHistory?.gamesAsTeammates?.[playerA.playerId]?.[playerB.playerId] ?? 0;
  const sharedHistory = sharedGames >= 50;

  // Check shared minor league level
  const sharedMinors = playerA.farmHistory?.some(f =>
    playerB.farmHistory?.some(bf => bf.season === f.season)
  ) ?? false;

  return personalityCompatible || sharedHistory || sharedMinors;
}

function validateRelationshipFormation(
  event: GeneratedEvent,
  context: EventGenerationContext
): boolean {
  const [playerA, playerB] = event.playersInvolved;
  const pA = context.roster.find(p => p.playerId === playerA);
  const pB = context.roster.find(p => p.playerId === playerB);

  if (!pA || !pB) return false;

  // Must be compatible per criteria above
  if (!isCompatibleForRelationship(pA, pB, context)) {
    console.warn(`Players ${pA.name} and ${pB.name} are not compatible for relationship`);
    return false;
  }

  const relChange = event.consequences.relationshipChanges?.[0];
  if (!relChange) return false;

  // Check relationship-specific requirements
  const requirements = RELATIONSHIP_REQUIREMENTS[relChange.relType];
  if (!requirements) return false;

  for (const req of requirements.requirements) {
    if (!req.check(pA, pB)) {
      console.warn(`Relationship ${relChange.relType} failed requirement: ${req.type}`);
      return false;
    }
  }

  // Check limits
  const existingCount = context.activeRelationships.filter(
    r => (r.playerA === playerA || r.playerB === playerA) && r.type === relChange.relType
  ).length;

  if (existingCount >= RELATIONSHIP_LIMITS[relChange.relType]) {
    console.warn(`Player ${playerA} already at limit for ${relChange.relType}`);
    return false;
  }

  return true;
}

function validateMentorship(
  event: GeneratedEvent,
  context: EventGenerationContext
): boolean {
  const [mentorId, protegeId] = event.playersInvolved;
  const mentor = context.roster.find(p => p.playerId === mentorId);
  const protege = context.roster.find(p => p.playerId === protegeId);

  if (!mentor || !protege) return false;

  // Must have 8+ year age gap
  if (Math.abs(mentor.age - protege.age) < 8) return false;

  // Mentor must be older
  if (mentor.age <= protege.age) return false;

  // Must have compatible or same personality
  if (mentor.personality !== protege.personality) {
    const compatible = MENTORSHIP_COMPATIBLE_PERSONALITIES[mentor.personality];
    if (!compatible?.includes(protege.personality)) return false;
  }

  return true;
}
```

### 10.6 Event Application

Once validated, events are applied to the game state:

```typescript
async function applyGeneratedEvent(
  event: GeneratedEvent,
  gameState: GameState
): Promise<void> {
  const { consequences } = event;

  // ═══════════════════════════════════════════════════════════════
  // PLAYER MORALE & PERSONALITY
  // ═══════════════════════════════════════════════════════════════

  // Apply morale changes
  for (const mc of consequences.moraleChanges || []) {
    const player = getPlayer(mc.playerId);
    applyMoraleChange(player, mc.change, event.type);
  }

  // Apply personality changes
  for (const pc of consequences.personalityChanges || []) {
    changePersonality(pc.playerId, pc.to, event.type);
  }

  // ═══════════════════════════════════════════════════════════════
  // RELATIONSHIPS
  // ═══════════════════════════════════════════════════════════════

  for (const rc of consequences.relationshipChanges || []) {
    if (rc.type === 'FORMED') {
      createRelationship(rc.players[0], rc.players[1], rc.relType);
    } else if (rc.type === 'EVOLVED') {
      evolveRelationship(rc.relationshipId, rc.evolution);
    } else if (rc.type === 'ENDED') {
      endRelationship(rc.relationshipId, rc.reason);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RATINGS & TRAITS
  // ═══════════════════════════════════════════════════════════════

  // Apply stat changes (temporary or permanent)
  for (const sc of consequences.statChanges || []) {
    const player = getPlayer(sc.playerId);

    if (sc.stat === 'ALL') {
      // Apply to all applicable stats
      const stats = player.isPitcher
        ? ['VEL', 'JNK', 'ACC']
        : ['POW', 'CON', 'SPD', 'FLD', 'ARM'];
      for (const stat of stats) {
        if (sc.isPermanent) {
          applyPermanentStatChange(sc.playerId, stat, sc.change);
        } else {
          applyTemporaryStat(sc.playerId, stat, sc.change, sc.duration);
        }
      }
    } else {
      if (sc.isPermanent) {
        applyPermanentStatChange(sc.playerId, sc.stat, sc.change);
      } else {
        applyTemporaryStat(sc.playerId, sc.stat, sc.change, sc.duration);
      }
    }
  }

  // Apply trait changes
  for (const tc of consequences.traitChanges || []) {
    const player = getPlayer(tc.playerId);
    if (tc.action === 'ADD') {
      addTrait(tc.playerId, tc.trait);
    } else if (tc.action === 'REMOVE') {
      removeTrait(tc.playerId, tc.trait);
    } else if (tc.action === 'SWAP') {
      removeTrait(tc.playerId, tc.replaceTrait);
      addTrait(tc.playerId, tc.trait);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // POSITION CHANGES
  // ═══════════════════════════════════════════════════════════════

  for (const posChange of consequences.positionChanges || []) {
    const player = getPlayer(posChange.playerId);

    switch (posChange.type) {
      case 'PRIMARY':
        player.primaryPosition = posChange.newPosition;
        logTransaction('POSITION_CHANGE_PRIMARY', {
          playerId: posChange.playerId,
          from: posChange.oldPosition,
          to: posChange.newPosition,
          reason: event.headline
        });
        break;

      case 'SECONDARY':
        if (!player.secondaryPositions) player.secondaryPositions = [];
        player.secondaryPositions.push(posChange.newPosition);
        logTransaction('POSITION_GAINED_SECONDARY', {
          playerId: posChange.playerId,
          position: posChange.newPosition,
          reason: event.headline
        });
        break;

      case 'LOSE_SECONDARY':
        player.secondaryPositions = player.secondaryPositions?.filter(
          p => p !== posChange.oldPosition
        );
        logTransaction('POSITION_LOST_SECONDARY', {
          playerId: posChange.playerId,
          position: posChange.oldPosition,
          reason: event.headline
        });
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PITCH REPERTOIRE
  // ═══════════════════════════════════════════════════════════════

  for (const pitchChange of consequences.pitchChanges || []) {
    const player = getPlayer(pitchChange.playerId);
    if (!player.isPitcher) continue;

    if (pitchChange.action === 'ADD') {
      if (!player.pitches) player.pitches = [];
      if (!player.pitches.includes(pitchChange.pitch)) {
        player.pitches.push(pitchChange.pitch);
        logTransaction('PITCH_ADDED', {
          playerId: pitchChange.playerId,
          pitch: pitchChange.pitch,
          reason: event.headline
        });
      }
    } else if (pitchChange.action === 'REMOVE') {
      // Cannot remove if only 1 pitch left
      if (player.pitches && player.pitches.length > 1) {
        player.pitches = player.pitches.filter(p => p !== pitchChange.pitch);
        logTransaction('PITCH_REMOVED', {
          playerId: pitchChange.playerId,
          pitch: pitchChange.pitch,
          reason: event.headline
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INJURIES
  // ═══════════════════════════════════════════════════════════════

  for (const injury of consequences.injuries || []) {
    const player = getPlayer(injury.playerId);

    player.injury = {
      severity: injury.severity,
      gamesRemaining: injury.gamesOut,
      description: injury.description,
      returnStatPenalty: injury.affectedStat ? {
        stat: injury.affectedStat,
        change: -5,
        duration: 10  // First 10 games back
      } : null
    };

    // Move to IL
    moveToInjuredList(player);

    logTransaction('INJURY_OCCURRED', {
      playerId: injury.playerId,
      severity: injury.severity,
      gamesOut: injury.gamesOut,
      description: injury.description,
      reason: event.headline
    });

    // Morale impact on team
    const teammateMoraleImpact = injury.severity === 'SEVERE' ? -5 : -2;
    for (const teammate of getTeammates(player)) {
      applyMoraleChange(teammate, teammateMoraleImpact, 'TEAMMATE_INJURED');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TEAM-LEVEL CHANGES
  // ═══════════════════════════════════════════════════════════════

  for (const teamChange of consequences.teamChanges || []) {
    const team = getTeam(teamChange.teamId);

    switch (teamChange.type) {
      case 'STADIUM_CHANGE':
        const oldStadium = team.stadium;
        team.stadium = teamChange.details.newStadium;
        logTransaction('STADIUM_CHANGE', {
          teamId: teamChange.teamId,
          from: oldStadium,
          to: teamChange.details.newStadium,
          reason: teamChange.details.reason || event.headline
        });
        // Fan morale boost for new stadium
        updateFanMorale(team, { event: 'NEW_STADIUM', boost: +15 });
        break;

      case 'MANAGER_FIRED':
        const firedManager = team.manager;
        team.manager = null;
        logTransaction('MANAGER_FIRED', {
          teamId: teamChange.teamId,
          manager: firedManager,
          reason: teamChange.details.reason || event.headline
        });
        // Mixed morale effect - relief but uncertainty
        for (const player of getTeamRoster(team)) {
          const moraleChange = player.personality === 'COMPETITIVE' ? +5 : -3;
          applyMoraleChange(player, moraleChange, 'MANAGER_FIRED');
        }
        break;

      case 'MANAGER_HIRED':
        team.manager = teamChange.details.newManager || generateRandomManager();
        logTransaction('MANAGER_HIRED', {
          teamId: teamChange.teamId,
          manager: team.manager,
          reason: event.headline
        });
        // Fresh start morale boost
        for (const player of getTeamRoster(team)) {
          applyMoraleChange(player, +3, 'NEW_MANAGER');
        }
        updateFanMorale(team, { event: 'NEW_MANAGER', boost: +5 });
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // COSMETIC CHANGES (fun/flavor - logged but don't affect gameplay)
  // ═══════════════════════════════════════════════════════════════

  for (const cosmetic of consequences.cosmeticChanges || []) {
    const player = getPlayer(cosmetic.playerId);

    switch (cosmetic.type) {
      case 'BATTING_STANCE':
        player.cosmetics = player.cosmetics || {};
        player.cosmetics.battingStance = cosmetic.details.newValue;
        break;

      case 'ARM_ANGLE':
        player.cosmetics = player.cosmetics || {};
        player.cosmetics.armAngle = cosmetic.details.newValue;
        break;

      case 'FACIAL_HAIR':
        player.cosmetics = player.cosmetics || {};
        player.cosmetics.facialHair = cosmetic.details.newValue;
        break;

      case 'ACCESSORY':
        player.cosmetics = player.cosmetics || {};
        player.cosmetics.accessories = player.cosmetics.accessories || [];
        player.cosmetics.accessories.push({
          type: cosmetic.details.accessoryType,
          item: cosmetic.details.newValue
        });
        // Silly accessories get Fame Boner, Cool get Fame Bonus
        const fameChange = cosmetic.details.accessoryType === 'SILLY' ? -0.5 : +0.5;
        addFameEvent(player, fameChange, `New ${cosmetic.details.accessoryType.toLowerCase()} accessory`);
        break;

      case 'NAME':
        const oldName = `${player.firstName} ${player.lastName}`;
        player.firstName = cosmetic.details.newFirstName || player.firstName;
        player.lastName = cosmetic.details.newLastName || player.lastName;
        logTransaction('NAME_CHANGE', {
          playerId: cosmetic.playerId,
          from: oldName,
          to: `${player.firstName} ${player.lastName}`,
          reason: event.headline
        });
        // Name change gets +1 Fame Bonus (memorable)
        addFameEvent(player, +1, 'Legal name change');
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SPECIAL EFFECTS (compound events, dramatic turns)
  // ═══════════════════════════════════════════════════════════════

  for (const special of consequences.specialEffects || []) {
    switch (special.type) {
      case 'WILD_CARD':
        // Apply a second event (recursive)
        if (special.details.secondEvent) {
          await applyGeneratedEvent(special.details.secondEvent, gameState);
        }
        break;

      case 'FOUNTAIN_OF_YOUTH':
        // Player acts younger for ratings purposes
        const youthPlayer = getPlayer(event.playersInvolved[0]);
        youthPlayer.effectiveAge = youthPlayer.age + (special.details.ageAdjustment || -5);
        youthPlayer.effectiveAgeDuration = special.details.duration || 'season';
        break;

      case 'SECOND_WIND':
        // Restore peak ratings temporarily
        const windPlayer = getPlayer(event.playersInvolved[0]);
        if (windPlayer.peakRatings) {
          for (const [stat, value] of Object.entries(windPlayer.peakRatings)) {
            applyTemporaryStat(windPlayer.id, stat, value - windPlayer.ratings[stat], special.details.duration || 20);
          }
        }
        break;

      case 'REDEMPTION_ARC':
        // Double clutch points going forward
        const redemptionPlayer = getPlayer(event.playersInvolved[0]);
        redemptionPlayer.clutchMultiplier = special.details.clutchMultiplier || 2.0;
        redemptionPlayer.clutchMultiplierDuration = special.details.duration || 'season';
        break;

      case 'HEEL_TURN':
        // Popular player becomes villain
        const heelPlayer = getPlayer(event.playersInvolved[0]);
        addFameEvent(heelPlayer, -(special.details.fameBoners || 3), 'Heel turn - villain arc');
        if (special.details.statBoost) {
          for (const [stat, value] of Object.entries(special.details.statBoost)) {
            applyTemporaryStat(heelPlayer.id, stat, value, 'season');
          }
        }
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // LOGGING & NARRATIVE OUTPUT
  // ═══════════════════════════════════════════════════════════════

  // Log the event
  logNarrativeEvent(event);

  // Generate beat reporter coverage
  const narrative = await generateEventCoverage(event, gameState.team.reporter);
  displayNarrative(narrative);

  // Notify fan morale system
  processFanMoraleFromEvent(event, gameState.team);
}
```

### 10.7 Event Timing and Frequency

```typescript
const EVENT_FREQUENCY_CONFIG = {
  targetEventsPerSeason: 20,
  minGamesBetweenEvents: 3,
  maxGamesBetweenEvents: 12,

  // Phase-based frequency
  phaseMultipliers: {
    EARLY: 0.8,       // Fewer events early (establishing baseline)
    MIDSEASON: 1.0,   // Normal frequency
    STRETCH: 1.3,     // More events in pennant race
    PLAYOFFS: 1.5     // Peak drama
  },

  // Context-based triggers
  highProbabilityTriggers: [
    { condition: 'teamMorale < 30', multiplier: 1.5 },        // Struggling teams generate drama
    { condition: 'newRelationshipEligible', multiplier: 1.3 }, // Ripe for new connections
    { condition: 'tradedPlayerFirst5Games', multiplier: 2.0 }, // Trade aftermath
    { condition: 'calledUpFirst10Games', multiplier: 1.5 },    // Rookie adjustment
    { condition: 'revengeGameToday', multiplier: 1.8 }         // Former teammate matchup
  ]
};

function shouldAttemptEventGeneration(context: EventGenerationContext): boolean {
  // Check minimum gap
  if (context.eventsSinceLastOne < EVENT_FREQUENCY_CONFIG.minGamesBetweenEvents) {
    return false;
  }

  // Calculate probability based on pacing
  const seasonProgress = context.seasonContext.gameNumber / context.seasonContext.totalGames;
  const expectedEventsSoFar = EVENT_FREQUENCY_CONFIG.targetEventsPerSeason * seasonProgress;
  const eventDeficit = expectedEventsSoFar - context.eventsThisSeason;

  // Base probability increases as we fall behind target
  let probability = 0.15 + (eventDeficit * 0.05);

  // Apply phase multiplier
  probability *= EVENT_FREQUENCY_CONFIG.phaseMultipliers[context.seasonContext.phase];

  // Apply context triggers
  for (const trigger of EVENT_FREQUENCY_CONFIG.highProbabilityTriggers) {
    if (evaluateTrigger(trigger.condition, context)) {
      probability *= trigger.multiplier;
    }
  }

  // Cap probability
  probability = Math.min(0.5, probability);

  return Math.random() < probability;
}
```

### 10.8 Relationship-Driven Event Seeding

The AI isn't generating from nothing - it's given "event seeds" based on relationship states:

```typescript
function getEventSeeds(context: EventGenerationContext): EventSeed[] {
  const seeds: EventSeed[] = [];

  // Seed: Strained relationships might break
  for (const rel of context.activeRelationships) {
    if (rel.status === 'STRAINED') {
      seeds.push({
        type: 'RELATIONSHIP_CRISIS',
        players: [rel.playerA, rel.playerB],
        relType: rel.type,
        suggestion: `The ${rel.type} relationship between these players is strained. Consider: reconciliation, escalation, or breakup.`
      });
    }
  }

  // Seed: Low morale players might act out
  for (const player of context.roster) {
    if (player.morale < 25) {
      seeds.push({
        type: 'MORALE_CRISIS',
        players: [player.playerId],
        suggestion: `${player.name} is miserable (morale ${player.morale}). Consider: trade request, clubhouse incident, or breakthrough moment.`
      });
    }
  }

  // Seed: Compatible players without relationships
  const eligiblePairs = findEligibleRelationshipPairs(context);
  for (const pair of eligiblePairs.slice(0, 3)) {  // Top 3 most eligible
    seeds.push({
      type: 'RELATIONSHIP_OPPORTUNITY',
      players: [pair.playerA, pair.playerB],
      eligibleTypes: pair.eligibleTypes,
      suggestion: `These players could form a ${pair.eligibleTypes.join(' or ')} relationship.`
    });
  }

  // Seed: Mojo streaks might crystallize
  for (const player of context.roster) {
    if (Math.abs(player.mojoStreak) >= 3) {
      const streakType = player.mojoStreak > 0 ? 'hot' : 'cold';
      seeds.push({
        type: 'STREAK_CRYSTALLIZATION',
        players: [player.playerId],
        suggestion: `${player.name} has been ${streakType} for ${Math.abs(player.mojoStreak)} games. Consider: making it a formal streak, trait emergence, or confidence event.`
      });
    }
  }

  // Seed: Mentor/protege opportunities
  const mentorCandidates = findMentorProtegeCandidates(context);
  for (const pair of mentorCandidates.slice(0, 2)) {
    seeds.push({
      type: 'MENTORSHIP_OPPORTUNITY',
      players: [pair.mentor, pair.protege],
      suggestion: `Veteran ${pair.mentorName} could mentor rookie ${pair.protegeName}. They share ${pair.commonality}.`
    });
  }

  return seeds;
}

// Include seeds in the prompt
function buildEventGenerationPrompt(context: EventGenerationContext): string {
  const seeds = getEventSeeds(context);

  return `
CURRENT TEAM STATE:
${JSON.stringify(context.team, null, 2)}

ROSTER (${context.roster.length} players):
${context.roster.map(p => `- ${p.name} (${p.position}, ${p.personality}, morale: ${p.morale})`).join('\n')}

ACTIVE RELATIONSHIPS:
${context.activeRelationships.map(r => `- ${r.type}: ${r.playerA} ↔ ${r.playerB} (strength: ${r.strength}, status: ${r.status})`).join('\n')}

RECENT EVENTS (last 10 games):
${context.recentEvents.slice(-5).map(e => `- Game ${e.game}: ${e.description}`).join('\n')}

EVENT SEEDS (situations ripe for events):
${seeds.map(s => `- ${s.type}: ${s.suggestion}`).join('\n')}

SEASON CONTEXT:
- Game ${context.seasonContext.gameNumber} of ${context.seasonContext.totalGames}
- Phase: ${context.seasonContext.phase}
- Events this season: ${context.eventsThisSeason} (target: ${context.targetEventsPerSeason})

Based on this context, should an event occur? If so, generate one that feels natural and connected to the existing narrative threads.
  `;
}
```

### 10.9 Narrative Memory Integration

Events feed back into narrative memory for future callbacks:

```typescript
function logNarrativeEvent(event: GeneratedEvent): void {
  const memoryEntry: NarrativeMemoryEntry = {
    id: generateId(),
    season: getCurrentSeason(),
    game: getCurrentGame(),
    type: event.type,
    headline: event.headline,
    description: event.description,
    playersInvolved: event.playersInvolved,
    consequences: summarizeConsequences(event.consequences),
    narrativeHook: event.narrativeHook,
    timestamp: new Date().toISOString(),

    // For future callbacks
    callbackTriggers: [
      { type: 'ANNIVERSARY', gamesFromNow: 81 },  // Half-season later
      { type: 'PLAYER_MILESTONE', players: event.playersInvolved },
      { type: 'RELATIONSHIP_STATUS_CHANGE', players: event.playersInvolved }
    ]
  };

  addToNarrativeMemory(memoryEntry);
}

// Beat reporter can callback to past events
function findRelevantCallbacks(
  currentContext: NarrativeContext
): NarrativeMemoryEntry[] {
  const callbacks = [];

  // Check for anniversary callbacks
  const currentGame = getCurrentGame();
  for (const memory of getNarrativeMemory()) {
    for (const trigger of memory.callbackTriggers) {
      if (trigger.type === 'ANNIVERSARY') {
        const gamesSince = currentGame - memory.game;
        if (gamesSince === trigger.gamesFromNow) {
          callbacks.push(memory);
        }
      }

      if (trigger.type === 'PLAYER_MILESTONE') {
        if (currentContext.relevantPlayers.some(p => trigger.players.includes(p.id))) {
          callbacks.push(memory);
        }
      }
    }
  }

  return callbacks;
}
```

---

## 11. Summary

### What This System Provides

✅ **Named beat reporters** with hidden personalities
✅ **Reporter influence on fan morale** (positive or negative bias)
✅ **Reporter firing** as random event with morale consequences
✅ **Lineup awareness** - spots unusual decisions, disparities
✅ **Performance context** - recent hot/cold streaks
✅ **Historical memory** - callbacks to past events
✅ **Personality-aligned player quotes**
✅ **Multiple output channels** (League News, Team Feed, Pre/Post Game, In-Game)
✅ **LLM integration options** (local + cloud hybrid)
✅ **User customization** of frequency and content
✅ **INSIDER reporters** can reveal hidden chemistry/morale

### Story-Worthy Detection

The engine notices:
- Prospect starting over expensive veteran
- Hot player benched unexpectedly
- Struggling bat still in heart of order
- Contract year performance
- Revenge games against former teams
- Milestone approaching
- Historical echoes
- Chemistry conflicts (via Insider reporters)

### Emergent Storytelling

Stories emerge from actual game data, not random generation:
- Trades create aftermath tracking periods
- Streaks build momentum narratives
- Reporter personalities color all coverage
- Fan morale responds to reporter bias
- Firing a negative reporter can improve morale
- History accumulates and gets referenced
