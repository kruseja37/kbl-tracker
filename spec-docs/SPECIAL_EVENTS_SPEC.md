# Special Events Specification

> **Purpose**: Define KBL-specific special events that add flavor and narrative to game tracking
> **Integration**: fame_and_events_system.md (Fame Bonus/Boner system)
> **Related Specs**: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §7 (Special Events)
> **SMB4 Reference**: SMB4_GAME_MECHANICS.md

---

## Table of Contents

1. [Overview](#1-overview)
2. [Nut Shot](#2-nut-shot)
3. [TOOTBLAN](#3-tootblan)
4. [Killed Pitcher](#4-killed-pitcher)
5. [Additional Special Events](#5-additional-special-events)
6. [Data Schema](#6-data-schema)
7. [UI Integration](#7-ui-integration)
8. [Narrative Generation](#8-narrative-generation)

---

## 1. Overview

### What are Special Events?

Special events are memorable, unusual, or noteworthy occurrences that go beyond standard baseball statistics. They add narrative richness and entertainment value to the KBL experience.

### Design Philosophy

- **Fun over formality** - These events celebrate the joy of the game
- **Easy to record** - Quick toggles, not complex data entry
- **Narrative fuel** - Feed into commentary and season summaries
- **Fame integration** - Events award Fame Bonus (+1) or Fame Boner (-1)
- **No double-counting** - Fame is NARRATIVE only; Clutch/LI already in mWAR

### How Fame Works (from fame_and_events_system.md)

Fame is a **narrative reputation system** that impacts:
- **All-Star Voting**: 6.67% of formula (within Traditional/Milestone/Narrative bucket)
- **MVP/Cy Young/Awards**: 5% narrative component
- **Team Fan Morale**: Aggregate team Fame affects fan narrative (see future spec)

**Net Fame** = Total Fame Bonuses - Total Fame Boners

Fame does NOT directly affect WAR/mWAR calculations. It's purely about fan perception and subjective awards.

> **Note on Gold Glove**: Gold Glove awards use fWAR + LI-weighted clutch plays, NOT Fame.
> Fielding excellence is measured by defensive performance, not narrative moments.

### Event Categories

| Category | Events | Fame Impact |
|----------|--------|-------------|
| **Highlight Plays** | Web Gem, Robbery, Cycle, Walk-off | Fame Bonus (+1) |
| **Pitching Dominance** | No-Hitter, Immaculate Inning, Maddux | Fame Bonus (+1 to +3) |
| **Comedy/Embarrassment** | Nut Shot (fielder), Golden Sombrero | Fame Boner (-1) |
| **Baserunning Blunders** | TOOTBLAN | Fame Boner (-1) |
| **Mental Errors** | Throwing to wrong base, Rally killer | Fame Boner (-1) |
| **Meltdowns** | Giving up 6+ runs, Back-to-back-to-back HR | Fame Boner (-1) |

---

## 2. Nut Shot

### 2.1 Definition

A **Nut Shot** occurs when a batted ball strikes a fielder in the groin area, typically causing visible discomfort and comedic effect.

### 2.2 When to Record

Record a Nut Shot when:
- A batted ball visibly hits a fielder in the groin
- The fielder shows a pain reaction
- It's notable enough to mention in game highlights

### 2.3 Data Captured

```typescript
interface NutShotEvent {
  eventType: 'NUT_SHOT';
  gameId: string;
  inning: number;
  halfInning: 'top' | 'bottom';

  // Who got hit
  victimId: string;
  victimName: string;
  victimPosition: Position;

  // Who hit the ball
  batterId: string;
  batterName: string;

  // Play context
  playResult: 'OUT' | 'HIT' | 'ERROR';  // Did they still make the play?
  ballType: 'GROUNDER' | 'LINE_DRIVE' | 'COMEBACKER';

  // Optional flavor
  severity?: 'MILD' | 'MODERATE' | 'DEVASTATING';
  remainedInGame?: boolean;

  // For stats
  isCareerFirst?: boolean;  // Track career nut shots
}
```

### 2.4 Statistical Impact

**Fame Boner for Fielder (-1):**
- Per fame_and_events_system.md: "Getting nutshot by comebacker (comedy penalty)"
- The FIELDER gets a Fame Boner (-1) for the embarrassing moment
- It's comedic - fans laugh at the victim

**Fame Bonus for Batter (+1):**
- The BATTER also gets a Fame Bonus (+1) for the intimidation/dominance
- Additionally, nut shots can knock down pitcher's **Mojo** in SMB4
- This has real gameplay impact beyond just narrative

**Exception - Tough Guy Bonus:**
- If fielder makes the play ANYWAY despite getting hit → Fame Bonus (+1) instead of boner
- This overrides the boner - showing toughness earns respect

**Tracking:**
- Career Nut Shots Delivered (batter stat)
- Career Nut Shots Received (fielder stat)
- Career "Tough Guy" plays (made play despite nut shot)

```typescript
function applyNutShotFame(event: NutShotEvent) {
  // Batter ALWAYS gets credit for dominance
  addFameBonus(event.batterId, 1, 'NUT_SHOT_DELIVERED');

  if (event.playResult === 'OUT') {
    // Made the play despite the pain - that's legendary
    addFameBonus(event.victimId, 1, 'NUT_SHOT_TOUGH_GUY');
  } else {
    // Comedy moment - fame boner for the victim
    addFameBoner(event.victimId, 1, 'NUT_SHOT_VICTIM');
  }
}
```

**SMB4 Gameplay Impact:**
- Nut shots visibly affect pitcher Mojo (confidence meter)
- Lower Mojo = worse pitcher performance
- This is a real tactical advantage, not just narrative

### 2.5 UI Entry

```
┌─────────────────────────────────────────────────────────────────┐
│  🥜 NUT SHOT DETECTED                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Victim: [Select fielder ▼]                                     │
│  Batter: (Auto-filled: current batter)                          │
│                                                                 │
│  Made the play anyway? [Yes] [No]                               │
│  Remained in game? [Yes] [No]                                   │
│                                                                 │
│  Severity (optional):                                           │
│  [Mild] [Moderate] [Devastating]                                │
│                                                                 │
│         [Cancel]                    [Record Nut Shot]           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. TOOTBLAN

### 3.1 Definition

**TOOTBLAN** = "Thrown Out On The Bases Like A Nincompoop"

A TOOTBLAN occurs when a runner makes a boneheaded baserunning mistake resulting in an out, beyond a normal caught stealing.

### 3.2 TOOTBLAN Qualifying Criteria

A baserunning out qualifies as TOOTBLAN if ANY of:
- Runner picked off with no throw (wandering off base)
- Runner thrown out trying to advance on a play where they should have held
- Runner passes another runner on the basepaths
- Runner runs into an obvious tag (not a close play)
- Runner forgets the number of outs (e.g., tagging from 3rd with 2 outs on a fly ball to the infield)
- Any other clearly avoidable baserunning out

### 3.3 NOT a TOOTBLAN

- Normal caught stealing (close play)
- Thrown out stretching a double to triple (aggressive, not stupid)
- Thrown out at home on close play
- Hit into double play (batter's issue, not runner)
- Tagged out on line drive (reaction time)

### 3.4 Data Captured

```typescript
interface TootblanEvent {
  eventType: 'TOOTBLAN';
  gameId: string;
  inning: number;
  halfInning: 'top' | 'bottom';
  outs: number;

  // The nincompoop
  runnerId: string;
  runnerName: string;
  fromBase: '1B' | '2B' | '3B' | 'HOME';  // Where they were
  wasGoingTo?: '2B' | '3B' | 'HOME';       // Where they tried to go

  // What happened
  tootblanType: TootblanType;
  description?: string;  // Optional narrative

  // Context
  situationBefore: string;  // "R1R3, 1 out, tie game"
  outsAfter: number;        // Always outs + 1 (or inning ends)

  // Impact
  runsPrevented?: number;   // If TOOTBLAN killed a rally
  wasRallyKiller: boolean;  // 2-out TOOTBLAN with RISP
}

type TootblanType =
  | 'PICKED_OFF'          // Wandered off base
  | 'WRONG_BASE'          // Tried to advance when shouldn't have
  | 'PASSED_RUNNER'       // Passed another runner
  | 'RAN_INTO_TAG'        // Obvious tag
  | 'FORGOT_OUTS'         // Thought there were different outs
  | 'MISSED_BASE'         // Didn't touch base
  | 'LEFT_EARLY'          // Left before fly caught (appeal)
  | 'OTHER';              // General boneheadedness
```

### 3.5 Statistical Impact

**Fame Boner:** -1 (embarrassing baserunning mistake)

The baserunning out itself is already captured in the play-by-play and affects runs/outs. Fame Boner is the NARRATIVE penalty - fans remember boneheaded plays.

**Rally-Killing TOOTBLAN:** -2 Fame Boners if:
- Killed a rally with RISP
- Was the 3rd out with runners in scoring position
- Cost the team in a close game

```typescript
function calculateTootblanFame(event: TootblanEvent): number {
  let boners = 1;  // Base penalty

  if (event.wasRallyKiller && event.runnersInScoringPosition >= 1) {
    boners += 1;  // Extra shame for killing rally
  }

  return -boners;
}
```

### 3.6 UI Entry

```
┌─────────────────────────────────────────────────────────────────┐
│  🤦 TOOTBLAN                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Who committed the TOOTBLAN?                                    │
│  [Select runner ▼]                                              │
│                                                                 │
│  What happened?                                                 │
│  [●] Picked off (wandered off base)                             │
│  [ ] Tried to advance when shouldn't have                       │
│  [ ] Passed another runner                                      │
│  [ ] Ran into obvious tag                                       │
│  [ ] Forgot number of outs                                      │
│  [ ] Other baserunning blunder                                  │
│                                                                 │
│  Additional notes (optional): [_______________]                 │
│                                                                 │
│  ⚠️ This will apply a mWAR penalty to the runner                │
│                                                                 │
│         [Cancel]                    [Record TOOTBLAN]           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Killed Pitcher

### 4.1 Definition

**Killed Pitcher** occurs when a comebacker or batted ball strikes the pitcher forcefully, potentially causing injury or removing them from the game.

### 4.2 When to Record

Record Killed Pitcher when:
- A batted ball visibly strikes the pitcher
- The pitcher shows significant impact reaction
- The pitcher may be injured or removed

### 4.3 Distinction from Nut Shot

| Event | Target Area | Typical Result |
|-------|-------------|----------------|
| Nut Shot | Groin | Comedic, usually stays in |
| Killed Pitcher | Head/Body | Serious, may leave game |

*Note: A pitcher hit in the groin could be both a Nut Shot AND a Killed Pitcher event.*

### 4.4 Data Captured

```typescript
interface KilledPitcherEvent {
  eventType: 'KILLED_PITCHER';
  gameId: string;
  inning: number;
  halfInning: 'top' | 'bottom';

  // The pitcher
  pitcherId: string;
  pitcherName: string;

  // Who hit the ball
  batterId: string;
  batterName: string;

  // Impact details
  hitLocation: 'HEAD' | 'BODY' | 'ARM' | 'LEG' | 'GROIN';
  ballType: 'LINE_DRIVE' | 'COMEBACKER' | 'GROUNDER';

  // Outcome
  pitcherRemoved: boolean;
  playResult: 'OUT' | 'HIT' | 'ERROR' | 'PLAY_DEAD';

  // Context (for Clutch+ consideration)
  gameContext: {
    inning: number;
    outs: number;
    score: { home: number; away: number };
    runnersOn: ('1B' | '2B' | '3B')[];
  };
}
```

### 4.5 Statistical Impact

**Fame Bonus for Batter (+3):**
- Killed Pitcher gives the BATTER a Fame Bonus (+3)
- Represents major dominance - "he hit it so hard he knocked the pitcher down"
- This IS intimidation at its peak
- Higher value (+3 vs +1 for nut shot) reflects the significant tactical advantage:
  - Directly impacts pitcher's **Fitness** (stamina)
  - Directly impacts pitcher's **Mojo** (confidence)
  - May force early pitching change
  - Can swing momentum of the game

**Fame Bonus for Pitcher if they stay in (+1):**
- If pitcher stays in game after being hit → Fame Bonus (+1)
- "Tough as nails" narrative

**For the Pitcher (game flow):**
- If removed, triggers pitching change flow
- Remaining stats frozen at removal point

**SMB4 Gameplay Impact:**
- Killed Pitcher affects pitcher's **Fitness** (stamina meter)
- Lower Fitness = pitcher tires faster, may need earlier exit
- Also impacts **Mojo** (confidence) negatively
- This has real tactical advantage - batter weakened the pitcher

```typescript
function applyKilledPitcherFame(event: KilledPitcherEvent) {
  // Batter gets +3 fame bonus - significant tactical advantage
  addFameBonus(event.batterId, 3, 'KILLED_PITCHER');

  // Pitcher gets fame bonus if they tough it out
  if (!event.pitcherRemoved) {
    addFameBonus(event.pitcherId, 1, 'STAYED_IN_AFTER_HIT');
  }
}
```

### 4.6 UI Entry

```
┌─────────────────────────────────────────────────────────────────┐
│  💥 KILLED PITCHER                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Pitcher hit: (Auto-filled: current pitcher)                    │
│  Batter: (Auto-filled: current batter)                          │
│                                                                 │
│  Where hit?                                                     │
│  [Head] [Body] [Arm] [Leg] [Groin]                              │
│                                                                 │
│  Pitcher removed from game? [Yes] [No]                          │
│                                                                 │
│  Play result:                                                   │
│  [Out made] [Hit allowed] [Error] [Play dead]                   │
│                                                                 │
│         [Cancel]                    [Record Event]              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Additional Special Events (SMB4-Tied)

These events are tied to actual SMB4 gameplay occurrences and have statistical impact.

---

### 5.1 Web Gem / Defensive Highlight

A spectacular defensive play - diving catch, wall catch, etc.

```typescript
interface WebGemEvent {
  eventType: 'WEB_GEM';
  fielderId: string;
  fielderName: string;
  position: Position;

  playType: 'DIVING_CATCH' | 'WALL_CATCH' | 'LEAPING_CATCH' | 'BARE_HAND' | 'THROW' | 'DOUBLE_PLAY';
  description?: string;
  runsSaved?: number;  // Estimated runs prevented
}
```

**Fame Bonus:** +0.75 Fame for fielder

---

### 5.2 Robbery (HR-Saving Catch)

Outfielder catches ball at/over wall that would have been HR.

```typescript
interface RobberyEvent {
  eventType: 'ROBBERY';
  fielderId: string;
  robbedBatterId: string;
  runnersOn: number;           // RBIs prevented
  wouldHaveBeenGrandSlam: boolean;
}
```

**Fame Bonus:** +1 Fame for fielder (same for grand slam robbery - the difficulty is similar, just more runners on base)

---

### 5.3 Walk-Off Hit

Game-ending hit in bottom of final inning.

```typescript
interface WalkOffEvent {
  eventType: 'WALK_OFF';
  batterId: string;
  hitType: '1B' | '2B' | '3B' | 'HR' | 'BB' | 'HBP' | 'SF' | 'E';
  rbiOnPlay: number;
  winningRun: string;  // Player who scored winning run
  finalScore: { home: number; away: number };
  wasExtraInnings: boolean;
}
```

**Fame Bonus:** +1 (narrative recognition for dramatic moment)
*Note: Clutch value already captured via LI in mWAR - no separate Clutch+ bonus*

---

### 5.4 Blown Save → Walk-Off

When a closer blows a save and opponent walks off.

```typescript
interface BlownSaveWalkOffEvent {
  eventType: 'BLOWN_SAVE_WALKOFF';
  closerId: string;
  walkOffHitterId: string;
  leadWhenEntered: number;
  finalScore: { home: number; away: number };
}
```

**Fame Boner:** -2 (blown save + loss = ultimate shame)
*Note: Statistical impact already captured via LI in mWAR*

---

### 5.5 Comeback Win

Team wins after trailing by significant deficit.

```typescript
interface ComebackWinEvent {
  eventType: 'COMEBACK_WIN';
  deficitOvercome: number;      // Max deficit during game
  inningOfMaxDeficit: number;
  winningTeam: string;

  // Key contributors
  comebackHeroes: {
    playerId: string;
    contribution: string;  // "3-run HR in 8th", "2 RBI in 9th"
  }[];
}
```

**Auto-detected:** When winning team trailed by 4+ runs at any point.
**Fame Bonus:** +1 for "comeback heroes" (key contributors identified in event)
*Note: Individual clutch plays already weighted via LI in mWAR*

---

### 5.6 Cycle Completion

Player hits for the cycle (1B, 2B, 3B, HR in same game).

```typescript
interface CycleEvent {
  eventType: 'CYCLE';
  batterId: string;
  hitSequence: ('1B' | '2B' | '3B' | 'HR')[];  // Order achieved
  completedInInning: number;
  wasNatural: boolean;  // 1B→2B→3B→HR order
}
```

**Fame Bonus:** +3.0 Fame (+4.0 if natural cycle)

---

### 5.7 Multi-HR Game

Player hits 2+ home runs in a single game.

```typescript
interface MultiHREvent {
  eventType: 'MULTI_HR';
  batterId: string;
  homeRunCount: number;
  totalRBI: number;
  innings: number[];  // Which innings
}
```

**Fame Bonus:**
- 2 HR: +1.0 Fame
- 3 HR: +2.5 Fame
- 4+ HR: +5.0 Fame (historic)

---

### 5.8 Golden Sombrero / Hat Trick (K)

Batter strikes out 3+ times in a game.

```typescript
interface StrikeoutShameEvent {
  eventType: 'GOLDEN_SOMBRERO' | 'HAT_TRICK_K' | 'PLATINUM_SOMBRERO';
  batterId: string;
  strikeoutCount: number;  // 3 = Hat Trick, 4 = Golden, 5 = Platinum
  atBats: number;
  lookingCount: number;
  swingingCount: number;
}
```

**Narrative only** - No penalty (bad luck happens)

---

### 5.9 Immaculate Inning

Pitcher strikes out the side on exactly 9 pitches (3 K, 3 pitches each).

```typescript
interface ImmaculateInningEvent {
  eventType: 'IMMACULATE_INNING';
  pitcherId: string;
  inning: number;
  battersFaced: string[];  // The 3 victims
}
```

**Fame Bonus:** +2.0 Fame for pitcher
**Auto-detected:** If user tracks pitch counts per AB, can flag potential

---

### 5.10 Maddux (Complete Game Shutout, Efficient Pitching)

Complete game shutout with efficient pitch count. Threshold scales with game length:

| Game Length | Maddux Threshold |
|-------------|------------------|
| 9 innings | < 85 pitches |
| 7 innings | < 66 pitches |
| 6 innings | < 57 pitches |
| 5 innings | < 47 pitches |

*Formula: `threshold = Math.floor(innings × 9.44)` (85/9 ≈ 9.44 pitches/inning)*

```typescript
interface MadduxEvent {
  eventType: 'MADDUX';
  pitcherId: string;
  pitchCount: number;
  gameInnings: number;
  threshold: number;  // Calculated based on game length
  hits: number;
  walks: number;
  strikeouts: number;
}

function isMaddux(pitchCount: number, innings: number): boolean {
  const threshold = Math.floor(innings * 9.44);
  return pitchCount < threshold;
}
```

**Fame Bonus:** +3
**Detected:** At end of CGSO, check pitch count vs threshold

---

### 5.11 Rally Starter

Player who starts a rally that leads to 3+ runs.

```typescript
interface RallyStarterEvent {
  eventType: 'RALLY_STARTER';
  batterId: string;
  howStarted: '1B' | '2B' | '3B' | 'BB' | 'HBP' | 'E';
  runsScored: number;        // In the rally
  outsBefore: number;        // Outs when rally started
  inning: number;
  tiedOrTookLead: boolean;   // Did rally change game?
}
```

**Fame Bonus:** +1 if rally tied or took lead (hero narrative)
*Note: Individual at-bat value captured via LI - this is pure narrative*

---

### 5.12 Rally Killer

Player who ends a rally with RISP.

```typescript
interface RallyKillerEvent {
  eventType: 'RALLY_KILLER';
  batterId: string;
  howEnded: 'K' | 'DP' | 'GIDP' | 'PO' | 'FO' | 'LO';
  runnersStranded: number;
  runnersInScoringPosition: number;  // On 2B or 3B
  outs: number;  // Was it 2nd out (not as bad) or 3rd out?
  inning: number;
  wasClutchSituation: boolean;  // Late game, close score
}
```

**Fame Boner Conditions (Tiered):**

| Condition | Fame | Rationale |
|-----------|------|-----------|
| Standard: 3rd out with 2+ RISP | -1 | Memorable failure |
| Aggravated: K or DP/GIDP with 2+ RISP in 7th+ inning, close game | -2 | Choked in clutch |

```typescript
function calculateRallyKillerFame(event: RallyKillerEvent): number {
  // Only a Rally Killer if 3rd out with RISP
  if (event.outs !== 3 || event.runnersInScoringPosition < 2) {
    return 0;  // Not a Rally Killer
  }

  let boners = -1;  // Base penalty

  // Aggravated conditions: clutch choke
  const aggravated =
    event.wasClutchSituation &&
    event.inning >= 7 &&
    ['K', 'DP', 'GIDP'].includes(event.howEnded);

  if (aggravated) {
    boners = -2;  // Double shame for clutch K/DP
  }

  return boners;
}
```

*Note: Statistical failure already captured via LI - this is narrative only*

---

### 5.13 Bases Loaded Opportunity

Track what happens with bases loaded.

```typescript
interface BasesLoadedEvent {
  eventType: 'BASES_LOADED_RESULT';
  batterId: string;
  result: 'GRAND_SLAM' | 'HIT' | 'WALK' | 'SAC_FLY' | 'OUT' | 'K' | 'DP';
  rbiOnPlay: number;
  outs: number;
}
```

**Fame Impact:**
- Grand Slam: +1 Fame Bonus (clutch grand slam is memorable)
- K or DP with 0 RBI: -1 Fame Boner (choked with bases loaded)
*Note: Run value of the play is captured via LI in mWAR*

---

### 5.14 Shutdown Inning

Pitcher gets out of jam with no runs.

```typescript
interface ShutdownInningEvent {
  eventType: 'SHUTDOWN_INNING';
  pitcherId: string;
  inning: number;
  runnersInherited: number;
  runnersOnWhenEntered: number;
  outsWhenEntered: number;
  strikeoutsInInning: number;
}
```

**Fame Bonus:** +1 for escaping jam (2+ runners stranded)
*Note: Statistical value captured via LI - this is narrative recognition*

---

### 5.15 First Career Event

Track notable firsts for narrative.

```typescript
interface FirstCareerEvent {
  eventType: 'FIRST_CAREER';
  playerId: string;
  achievementType: 'HR' | 'HIT' | 'RBI' | 'WIN' | 'SAVE' | 'K' | 'SB';
  gameContext: string;
}
```

**Fame Bonus:** +0.5 (small milestone recognition)

---

### 5.16 Back-to-Back HRs

Consecutive batters hit home runs.

```typescript
interface BackToBackHREvent {
  eventType: 'BACK_TO_BACK_HR';
  firstBatterId: string;
  secondBatterId: string;
  inning: number;
  wasBackToBackToBack?: boolean;  // 3 in a row!
}
```

**Fame Bonus:** +0.5 each batter

---

### 5.17 Inside-the-Park HR

Home run without ball leaving play.

```typescript
interface InsideParkHREvent {
  eventType: 'INSIDE_PARK_HR';
  batterId: string;
  rbiOnPlay: number;
  involvedError: boolean;  // Did error contribute?
}
```

**Fame Bonus:** +1.5 Fame (rare and exciting)

---

### 5.18 Position Player Pitching

Non-pitcher takes the mound (blowout situations).

```typescript
interface PositionPlayerPitchingEvent {
  eventType: 'POSITION_PLAYER_PITCHING';
  playerId: string;
  normalPosition: Position;
  inningsPitched: number;
  runsAllowed: number;
  strikeouts: number;
  scoreDifferential: number;  // How much team was losing by
}
```

**Fame Impact (based on performance):**
- Clean inning (0 runs): +1 Fame Bonus
- Multiple clean innings: +2 Fame Bonus
- Gets a strikeout: +1 Fame Bonus (additional)
- Gives up 3+ runs: -1 Fame Boner (made it worse)

This is rare and memorable - doing well deserves recognition!

---

## 5B. Fame Boner Events (Embarrassing Moments)

These events give players Fame Boners (-1), hurting their narrative standing. Per the master spec (fame_and_events_system.md), Fame Boners represent "hilarious failures, mental errors, choking."

---

### 5B.1 Golden Sombrero (4+ Ks)

Already tracked in 5.8, but clarifying Fame impact:
- 4 K in game (Golden Sombrero): -1 Fame Boner
- 5 K in game (Platinum Sombrero): -2 Fame Boners

---

### 5B.2 Pitcher Meltdown

Pitcher gives up 6+ runs in an appearance.

```typescript
interface MeltdownEvent {
  eventType: 'MELTDOWN';
  pitcherId: string;
  runsAllowed: number;
  inningsPitched: number;
  earnedRuns: number;
  wasStarter: boolean;
}
```

**Fame Boner:** -1 (or -2 if 10+ runs allowed)

---

### 5B.3 Back-to-Back-to-Back HRs Allowed

Pitcher gives up 3+ consecutive home runs.

```typescript
interface ConsecutiveHRsAllowedEvent {
  eventType: 'CONSECUTIVE_HRS_ALLOWED';
  pitcherId: string;
  homeRunCount: number;  // 3 = back-to-back-to-back
  batterIds: string[];
  inning: number;
}
```

**Fame Boner:** -1

---

### 5B.4 Dropped Fly Ball (Routine)

Fielder drops a routine fly ball (not a difficult play).

```typescript
interface DroppedFlyBallEvent {
  eventType: 'DROPPED_FLY';
  fielderId: string;
  wasRoutine: boolean;
  runnersScored: number;
  wasClutchSituation: boolean;
}
```

**Fame Boner:** -1 (or -2 if clutch situation and runners scored)

---

### 5B.5 Passed Ball Allowing Run

Catcher's passed ball allows a run to score.

```typescript
interface PassedBallRunEvent {
  eventType: 'PASSED_BALL_RUN';
  catcherId: string;
  runsScored: number;
  wasWinningRun: boolean;
}
```

**Fame Boner:** -1 (or -2 if winning run)

---

### 5B.6 Throwing to Wrong Base

Fielder throws to wrong base, allowing runners to advance.

```typescript
interface WrongBaseThrowEvent {
  eventType: 'WRONG_BASE_THROW';
  fielderId: string;
  threwTo: '1B' | '2B' | '3B' | 'HOME';
  shouldHaveThrown: '1B' | '2B' | '3B' | 'HOME';
  runnersAdvanced: number;
}
```

**Fame Boner:** -1

---

### 5B.7 Picked Off to End Game/Inning

Runner picked off for the final out of game or inning with RISP.

```typescript
interface PickedOffEndingEvent {
  eventType: 'PICKED_OFF_ENDING';
  runnerId: string;
  endedGame: boolean;
  endedInning: boolean;
  runnersStranded: number;
}
```

**Fame Boner:** -1 (or -2 if ended game)

---

### 5B.8 Strikeout Looking on Ball 4

Batter called out looking on a pitch that was actually ball 4 (bad ump, but still embarrassing).

```typescript
interface StrikeoutOnBall4Event {
  eventType: 'K_ON_BALL_4';
  batterId: string;
  wasClutchSituation: boolean;
}
```

**Fame Boner:** -1 (didn't argue enough!)

---

### 5B.9 Hit Into Triple Play

Batter hits into a triple play.

```typescript
interface TriplePlayHitIntoEvent {
  eventType: 'HIT_INTO_TP';
  batterId: string;
  triplePlayType: string;  // "5-4-3" etc.
}
```

**Fame Boner:** -1 (rare but devastating)

---

### 5B.10 Error on Easy Ground Ball

Infielder boots an easy grounder (not a difficult play).

```typescript
interface BootedGrounderEvent {
  eventType: 'BOOTED_GROUNDER';
  fielderId: string;
  wasRoutine: boolean;
  runnersAdvanced: number;
  ledToRuns: boolean;
}
```

**Fame Boner:** -1 if routine and led to runs

---

### 5B.11 Whiff on Fastball Down the Middle

Batter swings and misses badly on a meatball pitch.

```typescript
interface MeatballWhiffEvent {
  eventType: 'MEATBALL_WHIFF';
  batterId: string;
  pitchLocation: 'CENTER' | 'HEART';
  wasStrikeThree: boolean;
  wasClutch: boolean;
}
```

**Fame Boner:** -1 if strike three in clutch

---

### 5B.12 Blown Save

Closer enters in save situation and blows it.

```typescript
interface BlownSaveEvent {
  eventType: 'BLOWN_SAVE';
  pitcherId: string;
  leadWhenEntered: number;
  finalResult: 'LOSS' | 'NO_DECISION';
  runsAllowed: number;
}
```

**Fame Boner:** -1 (or -2 if team loses)

---

### 5B.13 Baserunning Blunder (Non-TOOTBLAN)

Less egregious than TOOTBLAN but still a mistake.

```typescript
interface BaserunningBlunderEvent {
  eventType: 'BASERUNNING_BLUNDER';
  runnerId: string;
  blunderType: 'MISSED_SIGN' | 'LATE_START' | 'BAD_READ' | 'HESITATION';
  advancementLost: number;  // Bases they should have taken
}
```

**Fame Boner:** -1 if cost the team (no out, but lost opportunity)

---

### 5B.14 Intentional Walk Strikeout

Player strikes out during an intentional walk situation (swings at pitchout).

```typescript
interface IBBStrikeoutEvent {
  eventType: 'IBB_STRIKEOUT';
  batterId: string;
}
```

**Fame Boner:** -2 (this is legendary embarrassment)

---

### ~~5B.15 Runner Interference~~ - NOT IN SMB4

> ⚠️ **Not implemented in SMB4.** Do not track.

---

## 5C. Additional Fame Bonus Events

These positive events weren't covered in Section 5 but align with fame_and_events_system.md.

---

### 5C.1 No-Hitter / Perfect Game

```typescript
interface NoHitterEvent {
  eventType: 'NO_HITTER' | 'PERFECT_GAME';
  pitcherId: string;
  pitchCount: number;
  strikeouts: number;
  walks: number;  // 0 for perfect game
}
```

**Fame Bonus:** +3 (No-Hitter) or +5 (Perfect Game)

---

### 5C.2 Career Milestone

Player achieves a career milestone (100 HR, 1000 hits, etc.).

```typescript
interface CareerMilestoneEvent {
  eventType: 'CAREER_MILESTONE';
  playerId: string;
  milestoneType: string;
  value: number;
}
```

**Fame Bonus:** +1

---

### 5C.3 Clutch Grand Slam

Grand slam that ties or gives the lead.

```typescript
interface ClutchGrandSlamEvent {
  eventType: 'CLUTCH_GRAND_SLAM';
  batterId: string;
  tiedGame: boolean;
  tookLead: boolean;
  inning: number;
}
```

**Fame Bonus:** +1 (in addition to normal walk-off/clutch bonuses if applicable)

---

### 5C.4 Unassisted Triple Play

Rarest play in baseball - fielder completes triple play alone.

```typescript
interface UnassistedTriplePlayEvent {
  eventType: 'UNASSISTED_TRIPLE_PLAY';
  fielderId: string;
  position: Position;
}
```

**Fame Bonus:** +3 (extremely rare)

---

### 5C.5 9-Pitch Inning (Not Just Strikeouts)

Pitcher retires the side on exactly 9 pitches (any combination of outs).

```typescript
interface NinePitchInningEvent {
  eventType: 'NINE_PITCH_INNING';
  pitcherId: string;
  inning: number;
  outTypes: ('K' | 'GO' | 'FO' | 'LO' | 'PO')[];
}
```

**Fame Bonus:** +1 (Immaculate Inning with 3 Ks gets +2 instead)

---

## 6. Data Schema

### 6.1 Master Special Events Record

```typescript
interface GameSpecialEvents {
  gameId: string;

  // All special events in chronological order
  events: SpecialEvent[];

  // Quick counts
  nutShots: number;
  killedPitchers: number;
  tootblans: number;
  webGems: number;
  robberies: number;
  walkOffs: number;
  comebackWin: boolean;
}

type SpecialEvent =
  | NutShotEvent
  | TootblanEvent
  | KilledPitcherEvent
  | WebGemEvent
  | RobberyEvent
  | WalkOffEvent
  | BlownSaveWalkOffEvent
  | ComebackWinEvent
  | CycleEvent
  | MultiHREvent
  | StrikeoutShameEvent
  | ImmaculateInningEvent
  | MadduxEvent
  | RallyStarterEvent
  | RallyKillerEvent
  | BasesLoadedEvent
  | ShutdownInningEvent
  | FirstCareerEvent
  | BackToBackHREvent
  | InsideParkHREvent
  | PositionPlayerPitchingEvent;
```

### 6.2 Season/Career Tracking

```typescript
interface PlayerSpecialStats {
  playerId: string;
  season: number;

  // Intimidation (as batter)
  nutShotsDelivered: number;
  killedPitchers: number;

  // Intimidation (as fielder/pitcher)
  nutShotsReceived: number;
  timesKilledAsPitcher: number;

  // Blunders
  tootblans: number;
  goldenSombreros: number;
  rallyKillers: number;

  // Highlights
  webGems: number;
  robberies: number;
  walkOffHits: number;
  cyclesHit: number;
  multiHRGames: number;
  insideParkHRs: number;

  // Pitching
  immaculateInnings: number;
  madduxes: number;
  shutdownInnings: number;

  // Clutch
  rallyStarters: number;
  basesLoadedClutchHits: number;

  // Fame accumulated from special events
  specialEventsFame: number;
}
```

### 6.3 Auto-Detection Rules

Some events can be auto-detected from play-by-play:

```typescript
const AUTO_DETECT_EVENTS = {
  // After each play, check these conditions
  WALK_OFF: (game) => game.isOver && game.winningRunScoredInBottom,
  COMEBACK_WIN: (game) => game.maxDeficit >= 4 && game.won,
  CYCLE: (player) => player.hasHitTypes(['1B', '2B', '3B', 'HR']),
  MULTI_HR: (player) => player.homeRuns >= 2,
  GOLDEN_SOMBRERO: (player) => player.strikeouts >= 4,
  BACK_TO_BACK_HR: (plays) => plays.lastTwo.every(p => p.result === 'HR'),

  // These require user confirmation
  NEEDS_USER_INPUT: ['NUT_SHOT', 'KILLED_PITCHER', 'WEB_GEM', 'ROBBERY', 'TOOTBLAN']
};
```

---

## 7. UI Integration

### 7.1 Special Events Quick Access

During game tracking, provide quick access buttons for MANUAL events:

```
┌─────────────────────────────────────────────────────────────────┐
│  SPECIAL EVENTS (tap to record)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Intimidation:                                                  │
│  [🥜 Nut Shot]  [💥 Killed Pitcher]                             │
│                                                                 │
│  Blunders:                                                      │
│  [🤦 TOOTBLAN]                                                  │
│                                                                 │
│  Highlights:                                                    │
│  [⭐ Web Gem]  [🎭 Robbery]  [🏠 Inside Park HR]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Post-Play Prompts

After certain plays, prompt for special events:

| Play Type | Possible Prompts |
|-----------|------------------|
| Comebacker | "Killed Pitcher?" / "Nut Shot?" |
| Ground ball through infield | "Nut Shot?" |
| Caught Stealing | "Was this a TOOTBLAN?" |
| Picked Off | "TOOTBLAN?" (likely yes) |
| Diving Catch | "Web Gem?" |
| Wall Catch | "Web Gem?" / "Robbery?" |
| Runner out advancing | "TOOTBLAN?" |

### 7.3 Auto-Detected Event Notifications

When auto-detected events occur, show confirmation toast:

```
┌─────────────────────────────────────────────────────────────────┐
│  🎉 CYCLE COMPLETE!                                             │
│  Davis hits for the cycle! (+3.0 Fame)                          │
│                              [Dismiss]  [View Details]          │
└─────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────┐
│  🔥 BACK-TO-BACK HOMERS!                                        │
│  Johnson and Smith go yard consecutively! (+0.5 Fame each)      │
│                              [Dismiss]  [View Details]          │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Event Log View

```
┌─────────────────────────────────────────────────────────────────┐
│  SPECIAL EVENTS LOG                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  2nd inning: 🥜 Johnson (SS) - Nut Shot on grounder             │
│              → Smith gets +0.5 Fame (intimidation)              │
│  4th inning: 🤦 Williams - TOOTBLAN (picked off 2B)             │
│              → -0.05 mWAR penalty                               │
│  6th inning: ⭐ Martinez - Web Gem diving catch                  │
│              → +0.75 Fame                                       │
│  7th inning: 🔥 Davis - 2nd HR of game                          │
│              → Multi-HR game! +1.0 Fame                         │
│  9th inning: 🎯 Wilson - Walk-off single!                       │
│              → +1 Fame Bonus                                    │
│                                                                 │
│  Game Summary: Comeback win! (trailed 5-1 in 4th)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.5 End-of-Game Summary

After game completion, show special events summary:

```
┌─────────────────────────────────────────────────────────────────┐
│  SPECIAL EVENTS SUMMARY                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🏆 COMEBACK WIN! (overcame 4-run deficit)                      │
│                                                                 │
│  Fame Earned This Game:                                         │
│  • Davis: +2.0 (Multi-HR, Walk-off)                             │
│  • Martinez: +0.75 (Web Gem)                                    │
│  • Smith: +0.5 (Nut Shot delivered)                             │
│                                                                 │
│  Fame Boners:                                                   │
│  • Williams: -1 (TOOTBLAN)                                      │
│  • Thompson: -1 (Dropped routine fly in 3rd)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Narrative Generation

### 8.1 Game Summary Integration

Special events should appear in game summaries:

```
GAME HIGHLIGHTS:
- Davis went yard twice and delivered the walk-off single in the 9th
- Martinez's diving catch in the 6th robbed Wilson of extra bases
- The team overcame a 4-run deficit for a dramatic comeback win

BLOOPER REEL:
- Williams got picked off second base with the tying run at third
- Smith's rocket found Johnson where it hurts most

INTIMIDATION FACTOR:
- Smith established dominance with a nut shot off Johnson
- Garcia's comebacker left the pitcher on the ground
```

### 8.2 Season Awards Candidates

Track special events for season awards:

```typescript
interface SeasonAwardsNominations {
  season: number;

  // Positive awards
  mrClutch: {
    playerId: string;
    walkOffs: number;
    clutchPlusTotal: number;
  };

  webGemKing: {
    playerId: string;
    webGems: number;
    robberies: number;
    bestPlay: string;
  };

  intimidationAward: {  // Most nut shots + killed pitchers
    playerId: string;
    nutShots: number;
    killedPitchers: number;
  };

  ironMan: {  // Most "stayed in after hit" as pitcher
    pitcherId: string;
    timesHit: number;
    stayedIn: number;
  };

  // Dubious honors
  tootblanKing: {
    playerId: string;
    count: number;
    worstOne: string;
  };

  rallyKillerAward: {
    playerId: string;
    ralliesKilled: number;
    runnersStranded: number;
  };

  goldenSombreroChamp: {
    playerId: string;
    sombreros: number;
    totalKs: number;
  };
}
```

### 8.3 Commentary Triggers

Special events trigger specific commentary lines:

```typescript
const SPECIAL_EVENT_COMMENTARY = {
  NUT_SHOT: [
    "That's gonna leave a mark!",
    "Right in the breadbasket... lower.",
    "He won't be sitting comfortably tonight.",
    "The batter established dominance there."
  ],
  KILLED_PITCHER: [
    "That got him! Right back up the middle.",
    "Hope he's okay after that one.",
    "Scary moment there on the mound.",
    "That's why they call it a dangerous position."
  ],
  TOOTBLAN: [
    "What was he thinking?!",
    "Little league baserunning there.",
    "That's going on the blooper reel.",
    "He'll want that one back."
  ],
  WEB_GEM: [
    "What a play!",
    "He robbed him!",
    "That's SportsCenter material.",
    "The highlight reel just got longer."
  ],
  ROBBERY: [
    "He stole a home run!",
    "That ball was gone and he brought it back!",
    "The batter can't believe it.",
    "What a robbery at the wall!"
  ],
  WALK_OFF: [
    "WALK OFF!",
    "Ball game! The home team wins!",
    "Pandemonium!",
    "And the crowd goes wild!"
  ],
  COMEBACK_WIN: [
    "What a comeback!",
    "They were down but never out!",
    "That's one for the ages!",
    "Resilience personified."
  ],
  CYCLE: [
    "He's hit for the cycle!",
    "A rare achievement!",
    "Single, double, triple, homer - he's done it all!",
    "Circle this one in the record books!"
  ],
  MULTI_HR: [
    "He's gone yard again!",
    "Another one! He's having a night!",
    "The long ball is his friend tonight.",
    "He's seeing the ball like a beach ball."
  ],
  BACK_TO_BACK: [
    "Back to back!",
    "And another one right behind it!",
    "The baseballs are flying out of here!",
    "Consecutive jacks!"
  ]
};
```

### 8.4 Weekly/Season Narrative Hooks

Generate narrative summaries for longer timeframes:

```typescript
function generateWeeklyNarrative(events: SpecialEvent[]): string[] {
  const narratives = [];

  // Find notable streaks/trends
  const nutShotLeader = findLeader(events, 'NUT_SHOT');
  if (nutShotLeader && nutShotLeader.count >= 2) {
    narratives.push(`${nutShotLeader.name} continues to terrorize infielders with ${nutShotLeader.count} nut shots this week.`);
  }

  const comebacks = events.filter(e => e.eventType === 'COMEBACK_WIN');
  if (comebacks.length >= 2) {
    narratives.push(`The team has pulled off ${comebacks.length} comeback wins, showing incredible resilience.`);
  }

  const tootblanRepeat = findRepeatOffender(events, 'TOOTBLAN');
  if (tootblanRepeat) {
    narratives.push(`${tootblanRepeat.name} might need some baserunning coaching after ${tootblanRepeat.count} TOOTBLANs.`);
  }

  return narratives;
}
```

---

## Appendix: Quick Reference

### Event Recording Checklist

| Event | When to Record | Impact | Auto-Detect? |
|-------|----------------|--------|--------------|
| **Nut Shot** | Ball visibly hits groin | +1 Batter, -1 Fielder | ❌ Manual |
| **Killed Pitcher** | Pitcher hit by batted ball | +3 Batter, (+1 Pitcher if stays) | ❌ Manual |
| **TOOTBLAN** | Boneheaded baserunning out | -1 Fame Boner | ❌ Manual |
| **Web Gem** | Spectacular defensive play | +0.75 Fame (fielder) | ❌ Manual |
| **Robbery** | HR-saving catch | +1 Fame (fielder) | ❌ Manual |
| **Walk-Off** | Game-ending hit | +1 Fame Bonus | ✅ Auto |
| **Comeback Win** | Won after 4+ run deficit | +1 Fame Bonus (heroes) | ✅ Auto |
| **Cycle** | 1B, 2B, 3B, HR same game | +3.0 Fame | ✅ Auto |
| **Multi-HR** | 2+ HR in game | +1.0 to +5.0 Fame | ✅ Auto |
| **Golden Sombrero** | 4+ K in game | Narrative only | ✅ Auto |
| **Immaculate Inning** | 9-pitch 3-K inning | +2.0 Fame | ⚠️ Needs pitch tracking |
| **Maddux** | CGSO <100 pitches | +3.0 Fame | ⚠️ Needs pitch tracking |
| **Rally Starter** | Started 3+ run rally | +1 Fame Bonus (if tied/lead) | ✅ Auto |
| **Rally Killer** | Ended rally with RISP | -1 Fame Boner | ✅ Auto |
| **Back-to-Back HR** | Consecutive batters HR | +0.5 Fame each | ✅ Auto |
| **Inside Park HR** | HR without leaving field | +1.5 Fame | ❌ Manual |

### Fame Bonus Summary (+1 per event unless noted)

| Event | Fame | Recipient |
|-------|------|-----------|
| **Highlight Plays** | | |
| Walk-Off Hit | +1 | Batter |
| Web Gem | +1 | Fielder |
| Robbery (HR-saving catch) | +1 | Fielder |
| Inside-the-Park HR | +1 | Batter |
| Cycle | +1 | Batter |
| Multi-HR Game (2+) | +1 | Batter |
| Back-to-Back HRs | +1 | Each batter |
| Clutch Grand Slam | +1 | Batter |
| Unassisted Triple Play | +3 | Fielder |
| **Pitching** | | |
| No-Hitter | +3 | Pitcher |
| Perfect Game | +5 | Pitcher |
| Immaculate Inning (9-pitch 3K) | +2 | Pitcher |
| Maddux (CGSO < threshold) | +3 | Pitcher |
| 9-Pitch Inning (non-immaculate) | +1 | Pitcher |
| **Intimidation** | | |
| Nut Shot | +1 | Batter (always) |
| Nut Shot (made the play anyway) | +1 | Fielder (replaces boner) |
| Killed Pitcher | +3 | Batter |
| Stayed in after being hit | +1 | Pitcher |
| **Position Player Pitching** | | |
| Clean inning | +1 | Position player |
| Multiple clean innings | +2 | Position player |
| Got a strikeout | +1 | Position player |
| **Other** | | |
| Career Milestone | +1 | Player |

### Fame Boner Summary (-1 per event unless noted)

| Event | Fame | Recipient |
|-------|------|-----------|
| **Batting** | | |
| Golden Sombrero (4 K) | -1 | Batter |
| Platinum Sombrero (5 K) | -2 | Batter |
| IBB Strikeout (swing at pitchout) | -2 | Batter |
| Hit Into Triple Play | -1 | Batter |
| Meatball Whiff (K on center pitch) | -1 | Batter |
| **Pitching** | | |
| Meltdown (6+ runs allowed) | -1 | Pitcher |
| Meltdown (10+ runs allowed) | -2 | Pitcher |
| Back-to-back-to-back HRs allowed | -1 | Pitcher |
| Blown Save | -1 | Pitcher |
| Blown Save + Loss | -2 | Pitcher |
| **Fielding** | | |
| Nut Shot (didn't make play) | -1 | Fielder |
| Dropped Routine Fly Ball | -1 | Fielder |
| Dropped Fly in Clutch + Runs | -2 | Fielder |
| Booted Easy Grounder | -1 | Fielder |
| Throwing to Wrong Base | -1 | Fielder |
| Passed Ball Allowing Run | -1 | Catcher |
| Passed Ball Allowing Winning Run | -2 | Catcher |
| **Baserunning** | | |
| TOOTBLAN | -1 | Runner |
| Picked Off to End Game | -2 | Runner |
| Picked Off to End Inning | -1 | Runner |
| **Position Player Pitching** | | |
| Gave up 3+ runs | -1 | Position player |

### TOOTBLAN Quick Guide

**IS a TOOTBLAN:**
- ✅ Picked off not paying attention
- ✅ Running on fly ball with <2 outs (not tagging)
- ✅ Passed another runner
- ✅ Overran a base and tagged out
- ✅ Forgot number of outs

**NOT a TOOTBLAN:**
- ❌ Close play at any base
- ❌ Aggressive (not stupid) baserunning
- ❌ Hit into double play
- ❌ Caught stealing on good throw

### Note on Clutch+ / LI

**IMPORTANT:** Fame is purely NARRATIVE. It does NOT affect mWAR calculations.

Clutch situations are already captured via Leverage Index (LI) in the mWAR system. Special events that happen in clutch situations get their statistical weight through LI, not through Fame.

Fame only affects:
- All-Star voting (6.67% of formula)
- MVP/Cy Young (5% narrative component)
- Team Fan Morale (aggregate team Fame - future spec)

**Gold Glove uses fWAR + LI-weighted clutch plays, NOT Fame.**

Do NOT add Clutch+ bonuses to special events - that would be double-counting since LI already weights clutch plays appropriately in mWAR.

### Future: Team Fan Morale

Team-level Fame could influence fan narrative:
- Teams with high aggregate Fame = exciting, fan-favorite team
- Teams with lots of Fame Boners = "lovable losers" or "frustrating to watch"
- Could affect attendance, merchandise (if we track that), offseason narratives
- **Spec TBD** - will be covered in a future Fan Morale system doc

---

*Last Updated: January 24, 2026*
*Version: 3.3 - Robbery Fame standardized to +1 for all types (no grand slam bonus); resolved internal inconsistencies*
*Version: 3.2 - Killed Pitcher Fame increased from +1 to +3 for batter (reflects significant tactical impact on Mojo/Fitness)*
