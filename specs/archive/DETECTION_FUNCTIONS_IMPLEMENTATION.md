# Detection Functions Implementation Guide

> **Purpose**: Comprehensive list of all detection functions required for KBL Tracker
> **Source**: SPECIAL_EVENTS_SPEC.md, CLUTCH_ATTRIBUTION_SPEC.md, MILESTONE_SYSTEM_SPEC.md
> **Status**: PLANNING (per user decision: implement ALL functions, not a subset)
> **Created**: January 23, 2026

---

## Overview

This document catalogs all ~45 detection functions required for the KBL Tracker. Functions are organized by:
1. **Auto-Detection** - System detects from play-by-play (no user input)
2. **Prompt Detection** - System suggests, user confirms
3. **Manual Detection** - User triggers via UI

---

## 1. Auto-Detected Events (System Detects)

These functions run automatically after each play or at game end.

### 1.1 Batting Events

| Function | Trigger | Fame Impact | Threshold |
|----------|---------|-------------|-----------|
| `detectCycle()` | After each hit | +3 (+4 natural) | 1B+2B+3B+HR in game |
| `detectMultiHR()` | After HR | +1 to +5 | 2+ HR in game |
| `detectGoldenSombrero()` | After K | -1 to -2 | 4+ K in game |
| `detectGrandSlam()` | After HR | +1 | HR with bases loaded |
| `detectClutchGrandSlam()` | After grand slam | +1 (additional) | Ties or takes lead |
| `detectFirstCareerHit()` | After hit | +0.5 | First career hit |
| `detectFirstCareerHR()` | After HR | +0.5 | First career HR |
| `detectHitIntoTriplePlay()` | After TP | -1 | Batter in TP |

```typescript
function detectCycle(player: GamePlayerStats): CycleEvent | null {
  const hitTypes = new Set(player.hits.map(h => h.type));
  if (hitTypes.has('1B') && hitTypes.has('2B') && hitTypes.has('3B') && hitTypes.has('HR')) {
    const sequence = player.hits.filter(h => ['1B','2B','3B','HR'].includes(h.type)).map(h => h.type);
    const isNatural = sequence.join(',') === '1B,2B,3B,HR';
    return {
      eventType: 'CYCLE',
      batterId: player.id,
      hitSequence: sequence,
      completedInInning: player.hits[player.hits.length-1].inning,
      wasNatural: isNatural
    };
  }
  return null;
}

function detectMultiHR(player: GamePlayerStats): MultiHREvent | null {
  if (player.homeRuns >= 2) {
    return {
      eventType: 'MULTI_HR',
      batterId: player.id,
      homeRunCount: player.homeRuns,
      totalRBI: player.rbiFromHR,
      innings: player.hits.filter(h => h.type === 'HR').map(h => h.inning)
    };
  }
  return null;
}

function detectGoldenSombrero(player: GamePlayerStats): StrikeoutShameEvent | null {
  if (player.strikeouts >= 4) {
    const type = player.strikeouts >= 5 ? 'PLATINUM_SOMBRERO' : 'GOLDEN_SOMBRERO';
    return {
      eventType: type,
      batterId: player.id,
      strikeoutCount: player.strikeouts,
      atBats: player.atBats,
      lookingCount: player.kLooking,
      swingingCount: player.kSwinging
    };
  }
  return null;
}
```

### 1.2 Pitching Events

| Function | Trigger | Fame Impact | Threshold |
|----------|---------|-------------|-----------|
| `detectNoHitter()` | At game end | +3 | 0 H, CG |
| `detectPerfectGame()` | At game end | +5 | 0 H, 0 BB, 0 HBP, 0 E, CG |
| `detectMaddux()` | At game end | +3 | CGSO with < 85 NP (9 inn) |
| `detectImmaculateInning()` | After inning | +2 | 3 K on 9 pitches |
| `detectNinePitchInning()` | After inning | +1 | 3 outs on 9 pitches |
| `detectMeltdown()` | During/after appearance | -1 to -2 | 6+ runs allowed |
| `detectConsecutiveHRsAllowed()` | After HR | -1 | 3+ consecutive HR |
| `detectBlownSave()` | At game end | -1 to -2 | Entered save situation, lead lost |

```typescript
function detectNoHitter(pitcher: GamePitchingStats, gameState: GameState): NoHitterEvent | null {
  if (pitcher.isCompleteGame && pitcher.hitsAllowed === 0) {
    const isPerfect = pitcher.walksAllowed === 0 &&
                      pitcher.hbpAllowed === 0 &&
                      pitcher.errorsBehinHim === 0;
    return {
      eventType: isPerfect ? 'PERFECT_GAME' : 'NO_HITTER',
      pitcherId: pitcher.id,
      pitchCount: pitcher.pitchCount,
      strikeouts: pitcher.strikeouts,
      walks: pitcher.walksAllowed
    };
  }
  return null;
}

function detectMaddux(pitcher: GamePitchingStats, config: FranchiseConfig): MadduxEvent | null {
  if (pitcher.isCompleteGame && pitcher.isShutout) {
    const threshold = Math.floor(config.inningsPerGame * 9.44);
    if (pitcher.pitchCount < threshold) {
      return {
        eventType: 'MADDUX',
        pitcherId: pitcher.id,
        pitchCount: pitcher.pitchCount,
        gameInnings: config.inningsPerGame,
        threshold: threshold,
        hits: pitcher.hitsAllowed,
        walks: pitcher.walksAllowed,
        strikeouts: pitcher.strikeouts
      };
    }
  }
  return null;
}

function detectImmaculateInning(inning: InningPitchingStats): ImmaculateInningEvent | null {
  if (inning.outs === 3 &&
      inning.strikeouts === 3 &&
      inning.pitchCount === 9) {
    return {
      eventType: 'IMMACULATE_INNING',
      pitcherId: inning.pitcherId,
      inning: inning.inningNumber,
      battersFaced: inning.battersFaced
    };
  }
  return null;
}
```

### 1.3 Game-Level Events

| Function | Trigger | Fame Impact | Threshold |
|----------|---------|-------------|-----------|
| `detectWalkOff()` | At game end | +1 | Game-winning run in bottom of final inning |
| `detectComebackWin()` | At game end | +1 (heroes) | Won after trailing by 4+ runs |
| `detectBlownSaveWalkOff()` | At game end | -2 | Closer blows save, opponent walks off |
| `detectBackToBackHR()` | After HR | +0.5 each | Consecutive batters HR |

```typescript
function detectWalkOff(gameState: GameState): WalkOffEvent | null {
  if (gameState.isGameOver &&
      gameState.homeTeamWon &&
      gameState.winningRunScoredInBottomOfFinal) {
    return {
      eventType: 'WALK_OFF',
      batterId: gameState.lastBatter.id,
      hitType: gameState.lastPlayResult,
      rbiOnPlay: gameState.lastPlayRBI,
      winningRun: gameState.winningRunScorer.id,
      finalScore: gameState.finalScore,
      wasExtraInnings: gameState.inning > gameState.config.inningsPerGame
    };
  }
  return null;
}

function detectComebackWin(gameState: GameState): ComebackWinEvent | null {
  if (gameState.isGameOver && gameState.maxDeficitOvercome >= 4) {
    const heroes = identifyComebackHeroes(gameState);
    return {
      eventType: 'COMEBACK_WIN',
      deficitOvercome: gameState.maxDeficitOvercome,
      inningOfMaxDeficit: gameState.inningOfMaxDeficit,
      winningTeam: gameState.winningTeamId,
      comebackHeroes: heroes
    };
  }
  return null;
}
```

### 1.4 Baserunning/Fielding (Auto-Detected)

| Function | Trigger | Fame Impact | Threshold |
|----------|---------|-------------|-----------|
| `detectTriplePlay()` | After play | +3 (fielder) | 3 outs on one play |
| `detectUnassistedTriplePlay()` | After TP | +3 | Single fielder TP |

---

## 2. Prompt-Detection Events (System Suggests, User Confirms)

These prompt the user after specific play types.

### 2.1 After Catches

| Function | Play Trigger | Prompt | Fame Impact |
|----------|--------------|--------|-------------|
| `promptWebGem()` | Diving/leaping catch | "Web Gem?" | +0.75 |
| `promptRobbery()` | Wall catch | "Robbery (HR-saving)?" | +1 |

### 2.2 After Runner Outs

| Function | Play Trigger | Prompt | Fame Impact |
|----------|--------------|--------|-------------|
| `promptTOOTBLAN()` | Picked off, caught advancing | "Was this a TOOTBLAN?" | -1 |

### 2.3 After Comebackers

| Function | Play Trigger | Prompt | Fame Impact |
|----------|--------------|--------|-------------|
| `promptKilledPitcher()` | Comebacker | "Killed pitcher?" | +0.5 batter |
| `promptNutShot()` | Ground ball | "Nut shot?" | +1 batter, -1 fielder |

```typescript
function promptWebGem(play: PlayResult): boolean {
  // Show prompt after diving/wall/leaping catches
  const suggestPrompt = ['DIVING_CATCH', 'WALL_CATCH', 'LEAPING_CATCH'].includes(play.catchType);
  return suggestPrompt;
}

function promptTOOTBLAN(play: PlayResult): boolean {
  // Suggest TOOTBLAN check after:
  // - Picked off
  // - Runner out advancing on non-extra-base hit
  // - Runner passes another runner
  return play.runnerOut &&
         (play.outType === 'PICKED_OFF' ||
          play.outType === 'OUT_ADVANCING' ||
          play.wasObviouslyBad);
}
```

---

## 3. Manual Detection Events (User Triggers)

User clicks button to record these events.

### 3.1 Comedy/Embarrassment

| Event | Button | Fame Impact |
|-------|--------|-------------|
| Nut Shot | "🥜 Nut Shot" | +1 batter, -1 fielder |
| TOOTBLAN | "🤦 TOOTBLAN" | -1 runner |
| Killed Pitcher | "💥 Killed Pitcher" | +0.5 batter |

### 3.2 Highlight Plays

| Event | Button | Fame Impact |
|-------|--------|-------------|
| Web Gem | "⭐ Web Gem" | +0.75 fielder |
| Robbery | "🎭 Robbery" | +1 fielder |
| Inside Park HR | "🏠 Inside Park HR" | +1.5 batter |

### 3.3 Blunders (Non-TOOTBLAN)

| Event | Button | Fame Impact |
|-------|--------|-------------|
| Dropped Fly Ball | Manual | -1 to -2 |
| Throwing to Wrong Base | Manual | -1 |
| Passed Ball Run | Manual | -1 to -2 |
| Baserunning Blunder | Manual | -1 |

---

## 4. Clutch Detection Functions

These detect clutch situations for Clutch+ attribution.

### 4.1 Leverage-Based

| Function | Description | Threshold |
|----------|-------------|-----------|
| `calculateLeverageIndex()` | Per-play LI | Uses RE24 matrix |
| `isHighLeverage()` | High-stakes PA | LI >= 1.5 |
| `isClutchSituation()` | Clutch window | Late, close, runners |

### 4.2 Situation-Based

| Function | Description | Threshold |
|----------|-------------|-----------|
| `detectBasesLoadedClutch()` | Bases loaded, 2 outs | RISP + 2 outs |
| `detectShutdownInning()` | Pitcher escapes jam | 2+ runners stranded |
| `detectRallyStarter()` | First batter in rally | 3+ runs follow |
| `detectRallyKiller()` | Ends rally | 2+ RISP stranded |

---

## 5. Milestone Detection Functions

Career milestone tracking.

| Function | Threshold (MVP - 50g, 9inn season) |
|----------|----------------------------------|
| `detectCareerHR()` | 25, 50, 75, 100, 125, 150+ |
| `detectCareerHits()` | 100, 200, 300, 400, 500+ |
| `detectCareerRBI()` | 100, 200, 300, 400+ |
| `detectCareerWins()` | 25, 50, 75, 100+ |
| `detectCareerSaves()` | 25, 50, 75, 100+ |
| `detectCareerK()` | 200, 400, 600, 800+ |
| `detectCareerSB()` | 50, 100, 150, 200+ |

*Note: Thresholds scale with Opportunity Factor per ADAPTIVE_STANDARDS_ENGINE_SPEC.md*

---

## 6. Implementation Priority

Per user decision: **Implement ALL functions** (not a subset).

### Phase 1: Core Auto-Detection
1. `detectWalkOff()` - Most common, high visibility
2. `detectMultiHR()` - Common, easy logic
3. `detectGoldenSombrero()` - Simple K count
4. `detectComebackWin()` - Game-level, popular
5. `detectBackToBackHR()` - Sequential check

### Phase 2: Pitching Achievements
6. `detectNoHitter()` / `detectPerfectGame()`
7. `detectMaddux()`
8. `detectImmaculateInning()`
9. `detectMeltdown()`
10. `detectBlownSave()`

### Phase 3: Rare Events
11. `detectCycle()` - Rare but high value
12. `detectTriplePlay()` / `detectUnassistedTriplePlay()`
13. `detectInsideParkHR()` - User confirms
14. `detectGrandSlam()` / `detectClutchGrandSlam()`

### Phase 4: Prompts & Manual
15. `promptWebGem()` / `promptRobbery()`
16. `promptTOOTBLAN()` / `promptKilledPitcher()`
17. All manual UI buttons

### Phase 5: Clutch & Milestones
18. All leverage/clutch detection
19. All career milestone detection

---

## 7. Integration Points

### 7.1 After Each Play
```typescript
function onPlayComplete(play: PlayResult, gameState: GameState) {
  // Auto-detect batting events
  checkCycleProgress(play.batter);
  checkMultiHR(play.batter);
  checkGoldenSombrero(play.batter);
  checkBackToBackHR(play, gameState.previousPlay);

  // Auto-detect pitching events
  if (play.isEndOfInning) {
    checkImmaculateInning(gameState.currentPitcher);
    checkNinePitchInning(gameState.currentPitcher);
  }

  // Prompt detection
  if (shouldPromptWebGem(play)) showPrompt('WEB_GEM');
  if (shouldPromptRobbery(play)) showPrompt('ROBBERY');
  if (shouldPromptTOOTBLAN(play)) showPrompt('TOOTBLAN');
}
```

### 7.2 At Game End
```typescript
function onGameComplete(gameState: GameState) {
  // Check all game-level events
  checkWalkOff(gameState);
  checkComebackWin(gameState);
  checkNoHitter(gameState.startingPitcher);
  checkPerfectGame(gameState.startingPitcher);
  checkMaddux(gameState.startingPitcher);
  checkBlownSave(gameState.closer);

  // Show summary of all detected events
  showSpecialEventsSummary(gameState.detectedEvents);
}
```

---

## 8. Testing Checklist

| Event | Unit Test | Integration Test | Manual QA |
|-------|-----------|------------------|-----------|
| Walk-off | ☐ | ☐ | ☐ |
| Cycle | ☐ | ☐ | ☐ |
| Multi-HR | ☐ | ☐ | ☐ |
| Golden Sombrero | ☐ | ☐ | ☐ |
| No-Hitter | ☐ | ☐ | ☐ |
| Perfect Game | ☐ | ☐ | ☐ |
| Maddux | ☐ | ☐ | ☐ |
| ... | ... | ... | ... |

---

## Changelog

| Date | Changes |
|------|---------|
| 2026-01-23 | Initial document created cataloging all ~45 detection functions |
| 2026-01-23 | Added implementation priority and integration points |

---

*Last Updated: January 23, 2026*
*Status: PLANNING*
