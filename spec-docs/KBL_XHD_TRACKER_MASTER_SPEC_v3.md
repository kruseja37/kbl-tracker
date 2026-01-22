# KBL XHD Tracker - Master Specification Document v3.7

> **Related Specifications**:
>
> **WAR Calculation Specs**:
> - `BWAR_CALCULATION_SPEC.md` - Batting WAR (wOBA, wRAA, replacement level)
> - `FWAR_CALCULATION_SPEC.md` - **Authoritative source for all fWAR run values**
> - `RWAR_CALCULATION_SPEC.md` - Baserunning WAR (wSB, UBR, wGDP)
> - `PWAR_CALCULATION_SPEC.md` - Pitching WAR (FIP-based)
> - `MWAR_CALCULATION_SPEC.md` - Manager WAR (decisions + overperformance)
>
> **In-Game Tracking Specs**:
> - `FIELDING_SYSTEM_SPEC.md` - Fielding UI, data schema, inference logic
> - `LEVERAGE_INDEX_SPEC.md` - Leverage Index calculation
> - `CLUTCH_ATTRIBUTION_SPEC.md` - Multi-participant clutch/choke credit
> - `RUNNER_ADVANCEMENT_RULES.md` - Runner movement, force plays, WP/PB/SB
> - `INHERITED_RUNNERS_SPEC.md` - Inherited runner responsibility tracking
> - `PITCH_COUNT_TRACKING_SPEC.md` - Pitch count per-AB and game totals
> - `SUBSTITUTION_FLOW_SPEC.md` - PH/PR/defensive sub/pitching change flows
>
> **Special Events & Fame**:
> - `SPECIAL_EVENTS_SPEC.md` - Fame Bonus/Boner events (nut shot, TOOTBLAN, etc.)
> - `fame_and_events_system.md` - Fame system, All-Star voting, random events
>
> **SMB4 Reference**:
> - `SMB4_GAME_MECHANICS.md` - ⭐ Central reference for what IS/ISN'T in SMB4
> - `SMB4_GAME_REFERENCE.md` - SMB4 game mechanics (Mojo, Chemistry, Traits)
>
> Note: Values shown in UI examples throughout this document are illustrative. See individual spec files for authoritative calculation methodology.

## Table of Contents

0. [App Flow & Main Game Loop](#0-app-flow--main-game-loop)
1. [Overview](#1-overview)
2. [Season Setup](#2-season-setup)
3. [Team Management](#3-team-management)
4. [In-Game Tracking](#4-in-game-tracking)
5. [WAR Calculations](#5-war-calculations)
6. [Clutch/Choke System](#6-clutchchoke-system)
7. [Fame Bonus/Boner System](#7-fame-bonusboner-system)
8. [All-Star Voting](#8-all-star-voting)
9. [Awards System](#9-awards-system)
10. [End-of-Season Ratings Adjustments](#10-end-of-season-ratings-adjustments)
11. [Random Events](#11-random-events)
12. [Salary System](#12-salary-system)
13. [Offseason System](#13-offseason-system)
14. [Hall of Fame & Retired Numbers](#14-hall-of-fame--retired-numbers)
15. [Records & Milestones](#15-records--milestones)
16. [Grade Tracking](#16-grade-tracking)
17. [Position Detection](#17-position-detection)
18. [UI/UX Guidelines](#18-uiux-guidelines)
19. [Data Architecture & Core Models](#19-data-architecture--core-models)
20. [Undo & Reset Features](#20-undo--reset-features)
21. [Grade Derivation Formula](#21-grade-derivation-formula)
22. [Fan Happiness System](#22-fan-happiness-system)
23. [Personality System](#23-personality-system)
24. [Museum & Historical Data](#24-museum--historical-data)
25. [In-Season Trade System](#25-in-season-trade-system)
26. [Narrative Systems](#26-narrative-systems)
27. [Transaction Log & Audit Trail](#27-transaction-log--audit-trail)
28. [Helper Functions Library](#28-helper-functions-library)
29. [Appendices](#29-appendices)

---

# 0. App Flow & Main Game Loop

## Overview

This section defines WHEN each system runs, ensuring all features have clear execution triggers.

---

## Season State Machine

```javascript
const SEASON_PHASES = {
  SETUP: 'setup',           // Season configuration
  PRE_SEASON: 'pre_season', // Before first game
  REGULAR_SEASON: 'regular_season',
  ALL_STAR_BREAK: 'all_star_break',
  POST_DEADLINE: 'post_deadline',  // After trade deadline
  PLAYOFFS: 'playoffs',
  OFFSEASON: 'offseason'
};

const PHASE_TRANSITIONS = {
  SETUP: { next: 'PRE_SEASON', trigger: 'setupComplete' },
  PRE_SEASON: { next: 'REGULAR_SEASON', trigger: 'firstGameStart' },
  REGULAR_SEASON: {
    // Multiple transitions from REGULAR_SEASON based on game number
    transitions: [
      { next: 'ALL_STAR_BREAK', trigger: (gameNumber, totalGames) => gameNumber >= Math.floor(totalGames * 0.60) },
      { next: 'POST_DEADLINE', trigger: (gameNumber, totalGames) => gameNumber >= Math.floor(totalGames * 0.65) }
    ]
  },
  ALL_STAR_BREAK: { next: 'REGULAR_SEASON', trigger: 'allStarComplete' },
  POST_DEADLINE: {
    next: 'PLAYOFFS',
    trigger: (gameNumber, totalGames) => gameNumber >= totalGames
  },
  PLAYOFFS: { next: 'OFFSEASON', trigger: 'championCrowned' },
  OFFSEASON: { next: 'SETUP', trigger: 'newSeasonStart' }
};
```

---

## Main Game Loop

### Pre-Game Flow

```javascript
async function preGameFlow(gameNumber, homeTeam, awayTeam) {
  const gameDate = getGameDate(gameNumber, season.totalGames);

  // 1. Check for special dates
  const specialDate = checkSpecialDate(gameDate);
  if (specialDate === 'TRADE_DEADLINE') {
    await showTradeDeadlinePrompt();
  }

  // 2. Generate pre-game storylines
  const storylines = generatePregameHeadlines(gameNumber, homeTeam, awayTeam);

  // 3. Check for rivalry game
  const isRivalryGame = isOfficialRival(homeTeam.id, awayTeam.id);
  const revengeGames = getRevengeGamePlayers(homeTeam, awayTeam);

  // 4. Display pre-game screen
  displayPreGameScreen({
    gameNumber,
    gameDate,
    homeTeam,
    awayTeam,
    storylines,
    isRivalryGame,
    revengeGames,
    specialDate
  });

  // 5. Log transaction
  logTransaction('GAME_START', { gameNumber, homeTeam: homeTeam.id, awayTeam: awayTeam.id });
}
```

### During Game (Stat Entry)

```javascript
async function recordGameStat(playerId, statType, value, context) {
  const player = getPlayer(playerId);
  const previousValue = player.seasonStats.fullSeason[statType];

  // 1. Update full season stats
  player.seasonStats.fullSeason[statType] += value;

  // 2. Update team split stats (if traded)
  updateTeamSplitStats(player, statType, value);

  // 3. Recalculate rate stats
  recalculateRateStats(player);

  // 4. Check for in-game triggers
  await checkInGameTriggers(player, statType, value, context);

  // 5. Log transaction
  logTransaction('STAT_RECORDED', {
    playerId,
    statType,
    value,
    previousValue,
    newValue: player.seasonStats.fullSeason[statType]
  });
}

async function checkInGameTriggers(player, statType, value, context) {
  // Check for milestone
  const milestone = checkMilestone(player, statType);
  if (milestone) {
    await handleMilestoneReached(player, milestone);
  }

  // Check for clutch/choke trigger
  if (context.isClutchSituation) {
    await evaluateClutchPerformance(player, statType, value, context);
  }

  // Check for memorable moment
  const moment = checkForMemorableMoment(player, statType, value, context);
  if (moment) {
    recordMoment(moment.type, moment.data);
  }
}
```

### Post-Game Flow (CRITICAL - Runs After EVERY Game)

```javascript
async function postGameFlow(gameResult) {
  const { gameNumber, homeTeam, awayTeam, homeScore, awayScore, playerStats } = gameResult;

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: IMMEDIATE UPDATES (Order matters!)
  // ═══════════════════════════════════════════════════════════════

  // 1.1 Update team records
  updateTeamRecord(homeTeam, homeScore > awayScore ? 'W' : 'L');
  updateTeamRecord(awayTeam, awayScore > homeScore ? 'W' : 'L');

  // 1.2 Finalize all player stats for the game
  finalizeGameStats(playerStats);

  // 1.3 Recalculate WAR for all players who played
  for (const playerId of getPlayersInGame(gameResult)) {
    recalculateWAR(playerId);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: POST-GAME CHECKS (Run after EVERY game per user decision)
  // ═══════════════════════════════════════════════════════════════

  // 2.1 Update rivalries
  updateRivalryStats(homeTeam, awayTeam, gameResult);
  recalculateOfficialRivals();  // Check if rivals have changed

  // 2.2 Check nicknames for all players
  for (const player of getAllActivePlayers()) {
    const newNickname = checkForNickname(player);
    if (newNickname && !player.nickname) {
      assignNickname(player, newNickname);
      logTransaction('NICKNAME_EARNED', { playerId: player.id, nickname: newNickname });
    }
  }

  // 2.3 Update legacy status
  for (const player of getAllActivePlayers()) {
    const newLegacyStatus = calculateLegacyStatus(player, player.currentTeam);
    if (newLegacyStatus !== player.legacyStatus) {
      player.legacyStatus = newLegacyStatus;
      logTransaction('LEGACY_STATUS_CHANGE', { playerId: player.id, status: newLegacyStatus });
    }
  }

  // 2.4 Calculate team chemistry (narrative only - no stat impact)
  for (const team of getAllTeams()) {
    team.chemistry = calculateTeamChemistry(team);
  }

  // 2.5 Update fan happiness
  for (const team of [homeTeam, awayTeam]) {
    updateFanHappiness(team, gameResult);
    checkContractionWarning(team);  // Show warning if < 30
  }

  // 2.6 Check for random event trigger
  if (shouldTriggerRandomEvent(gameNumber)) {
    await triggerRandomEvent();
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 3: GENERATE POST-GAME NARRATIVE
  // ═══════════════════════════════════════════════════════════════

  // 3.1 Generate headline
  const headline = generatePostgameHeadline(gameResult, getGameEvents(gameResult));

  // 3.2 Identify Player of the Game
  const pog = calculatePlayerOfGame(gameResult);

  // 3.3 Record memorable moments
  const moments = identifyMemorableMoments(gameResult);
  for (const moment of moments) {
    recordMoment(moment.type, moment.data);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 4: SPECIAL GAME CHECKS
  // ═══════════════════════════════════════════════════════════════

  // 4.1 Check for All-Star break trigger (60% of games)
  if (gameNumber === Math.floor(season.totalGames * 0.60)) {
    await triggerAllStarBreak();
  }

  // 4.2 Check for trade deadline (65% of games)
  if (gameNumber === Math.floor(season.totalGames * 0.65)) {
    lockTradeWindow();
    showMessage("🔒 Trade deadline has passed. Rosters locked until offseason.");
  }

  // 4.3 Check for end of regular season
  if (gameNumber === season.totalGames) {
    await triggerEndOfRegularSeason();
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 5: LOG & DISPLAY
  // ═══════════════════════════════════════════════════════════════

  // 5.1 Log game completion
  logTransaction('GAME_COMPLETE', {
    gameNumber,
    homeTeam: homeTeam.id,
    awayTeam: awayTeam.id,
    score: `${homeScore}-${awayScore}`,
    pog: pog.id
  });

  // 5.2 Display post-game summary
  displayPostGameScreen({
    gameResult,
    headline,
    pog,
    moments,
    updatedStandings: getStandings()
  });
}
```

---

## All-Star Break Flow

```javascript
async function triggerAllStarBreak() {
  season.phase = 'ALL_STAR_BREAK';

  // 1. Calculate All-Star selections using existing voting formula
  const allStars = calculateAllStarRosters();

  // 2. Apply All-Star rewards (trait assignment)
  for (const player of allStars) {
    const trait = assignAllStarTrait(player);  // 70% positive, 30% negative
    player.awards.push({ type: 'ALL_STAR', season: currentSeason });
    updateFanHappiness(player.team, { event: 'ALL_STAR_SELECTION', player });

    logTransaction('ALL_STAR_SELECTED', { playerId: player.id, trait });
  }

  // 3. Display All-Star screen
  displayAllStarScreen(allStars);

  // 4. All-Star game is SIMULATED (not played)
  const asgMVP = simulateAllStarGame(allStars);
  asgMVP.awards.push({ type: 'ALL_STAR_MVP', season: currentSeason });

  logTransaction('ALL_STAR_COMPLETE', { mvp: asgMVP.id });

  season.phase = 'REGULAR_SEASON';
}
```

---

## End of Regular Season Flow

```javascript
async function triggerEndOfRegularSeason() {
  // 1. Finalize standings
  const standings = finalizeStandings();

  // 2. Determine playoff teams based on user-configured format
  const playoffTeams = determinePlayoffTeams(standings, season.playoffConfig);

  // 3. Calculate end-of-season awards
  const awards = await calculateAllAwards();

  // 4. Apply award effects IMMEDIATELY (per user decision)
  for (const award of awards) {
    await applyAwardEffects(award);
  }

  // 5. Display end of regular season summary
  displayEndOfSeasonScreen({ standings, playoffTeams, awards });

  // 6. Transition to playoffs
  season.phase = 'PLAYOFFS';
  await initializePlayoffs(playoffTeams);
}

async function applyAwardEffects(award) {
  const player = getPlayer(award.playerId);

  // Apply salary bonus IMMEDIATELY
  if (award.salaryBonus) {
    const bonusAmount = player.salary * award.salaryBonus;
    player.salary += bonusAmount;
    player.salaryBonuses = player.salaryBonuses || [];
    player.salaryBonuses.push({
      type: award.type,
      amount: bonusAmount,
      season: currentSeason
    });

    logTransaction('SALARY_BONUS_APPLIED', {
      playerId: player.id,
      award: award.type,
      bonusAmount,
      newSalary: player.salary
    });
  }

  // Apply trait reward
  if (award.trait) {
    assignTrait(player, award.trait);
  }

  // Apply Fame bonus
  if (award.fameBonus) {
    player.fame = Math.min(5, player.fame + award.fameBonus);
  }

  // Update fan happiness
  updateFanHappiness(player.team, { event: 'AWARD_WON', award });

  // Record in player awards
  player.awards.push({ type: award.type, season: currentSeason });
}
```

---

## Awards Ceremony UI

The Awards Ceremony is a multi-screen flow that presents end-of-season awards in a dramatic, presentation-style format. Users tap through each screen to reveal winners.

### Screen 1: League Leaders

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏆 SEASON 4 AWARDS CEREMONY                                                │
│  END OF REGULAR SEASON                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📊 LEAGUE LEADERS                                                          │
│                                                                             │
│  BATTING                              PITCHING                              │
│  ─────────────────────                ─────────────────────                 │
│  HR:    Aaron Judge (52)         ⚡   ERA:   Sandy Koufax (1.89)       ⚡   │
│  AVG:   Willie Mays (.342)       ⚡   WHIP:  Sandy Koufax (0.92)       ⚡   │
│  RBI:   Hank Aaron (134)         ⚡   K:     Bob Gibson (301)          ⚡   │
│  SB:    Rickey Henderson (89)    ⚡   Wins:  Juan Marichal (25)        ⚡   │
│  Runs:  Willie Mays (128)        ⚡   Saves: Rollie Fingers (42)       ⚡   │
│                                                                             │
│  ⚡ = Rating bonus applied                                                  │
│                                                                             │
│  😬 DUBIOUS LEADERS                                                         │
│  Most K's (Batting): Dick Stuart (189) → Whiffer trait applied             │
│  Most BB (Pitching): Nolan Ryan (156) → BB Prone trait applied             │
│                                                                             │
│                           [Next: Position Awards →]                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Screen 2: Position Awards (Gold Glove & Silver Slugger)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏆 SEASON 4 AWARDS CEREMONY                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🧤 GOLD GLOVE WINNERS              ⚾ SILVER SLUGGER WINNERS               │
│  (+5 Fielding)                      (+3 Power, +3 Contact)                  │
│  ─────────────────────              ─────────────────────                   │
│  C:   Johnny Bench (Giants)         C:   Johnny Bench (Giants)              │
│  1B:  Keith Hernandez (Cards)       1B:  Willie McCovey (Giants)            │
│  2B:  Bill Mazeroski (Pirates)      2B:  Joe Morgan (Reds)                  │
│  3B:  Brooks Robinson (O's)         3B:  Eddie Mathews (Braves)             │
│  SS:  Ozzie Smith (Cards)           SS:  Ernie Banks (Cubs)                 │
│  LF:  Carl Yastrzemski (Sox)        LF:  Frank Robinson (O's)               │
│  CF:  Willie Mays (Giants) 🏅        CF:  Willie Mays (Giants)               │
│  RF:  Roberto Clemente (Pirates)    RF:  Hank Aaron (Braves)                │
│  P:   Jim Kaat (Twins)              DH:  David Ortiz (Sox)                  │
│                                                                             │
│  🏅 = PLATINUM GLOVE (Best fWAR among all Gold Glove winners)               │
│       Willie Mays: 2.8 fWAR                                                 │
│                                                                             │
│                           [Next: Major Awards →]                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Screen 3: Major Awards (ROY, Reliever, Comeback, Kara Kawaguchi, Bench)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏆 SEASON 4 AWARDS CEREMONY                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🌟 ROOKIE OF THE YEAR                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  PETE ROSE - Reds                                                     │  │
│  │  .312 / 12 HR / 67 RBI / 3.2 WAR                                      │  │
│  │  ⚡ Random trait awarded                                              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  🔥 RELIEVER OF THE YEAR            💎 KARA KAWAGUCHI AWARD                 │
│  Rollie Fingers - A's               Dusty Rhodes - Giants                   │
│  42 Saves, 1.92 ERA, +3.2 Clutch    Salary: $1.2M (8th %ile at OF)          │
│  ⚡ Clutch trait awarded             WAR: 2.8 (72nd %ile at OF)              │
│                                      +64% value over salary!                │
│                                      ⚡ Positive trait awarded               │
│                                                                             │
│  🔄 COMEBACK PLAYER                  🪑 BENCH PLAYER OF THE YEAR            │
│  Lou Gehrig - Yankees               Manny Mota - Dodgers                    │
│  From 0.2 WAR (S3) → 4.1 WAR (S4)   .289 AVG as PH, +1.8 Clutch            │
│  ⚡ Recovered trait awarded          ⚡ Pinch Perfect trait awarded          │
│                                                                             │
│                           [Next: MVP & Cy Young →]                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Screen 4: MVP & Cy Young Reveal (Dramatic)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏆 SEASON 4 AWARDS CEREMONY                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                          ⭐ MOST VALUABLE PLAYER ⭐                          │
│                                                                             │
│                            WILLIE MAYS                                      │
│                            San Francisco Giants                             │
│                                                                             │
│  .342 / 52 HR / 128 RBI / 8.9 WAR / +12.5 Clutch                           │
│                                                                             │
│  📊 VOTING BREAKDOWN:                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 1. Willie Mays (Giants)      892 pts  [████████████████████] 100%   │   │
│  │ 2. Hank Aaron (Braves)       756 pts  [████████████████░░░░]  85%   │   │
│  │ 3. Frank Robinson (O's)      612 pts  [████████████░░░░░░░░]  69%   │   │
│  │ 4. Roberto Clemente (Pirates) 445 pts [█████████░░░░░░░░░░░]  50%   │   │
│  │ 5. Mickey Mantle (Yankees)   398 pts  [████████░░░░░░░░░░░░]  45%   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ⚡ REWARDS: +1 Fame, +15% Salary Bonus, Positive Trait, +10 Happiness      │
│  Runner-up Aaron: +8% Salary, +3 Happiness                                  │
│  3rd Clemente: +3% Salary, +1 Happiness                                     │
│                                                                             │
│                              [Tap to Continue]                              │
└─────────────────────────────────────────────────────────────────────────────┘

[Second part of Screen 4]

┌─────────────────────────────────────────────────────────────────────────────┐
│  🏆 SEASON 4 AWARDS CEREMONY                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                          ⭐ CY YOUNG AWARD ⭐                                │
│                                                                             │
│                           SANDY KOUFAX                                      │
│                           Los Angeles Dodgers                               │
│                                                                             │
│  25-5 / 1.89 ERA / 0.92 WHIP / 318 K / 7.2 pWAR / +8.5 Clutch              │
│                                                                             │
│  📊 VOTING BREAKDOWN:                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 1. Sandy Koufax (Dodgers)    945 pts  [████████████████████] 100%   │   │
│  │ 2. Bob Gibson (Cardinals)    812 pts  [█████████████████░░░]  86%   │   │
│  │ 3. Juan Marichal (Giants)    689 pts  [██████████████░░░░░░]  73%   │   │
│  │ 4. Don Drysdale (Dodgers)    534 pts  [███████████░░░░░░░░░]  57%   │   │
│  │ 5. Jim Bunning (Phillies)    423 pts  [█████████░░░░░░░░░░░]  45%   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ⚡ REWARDS: +1 Fame, +15% Salary Bonus, Positive Trait, +8 Happiness       │
│                                                                             │
│                           [Next: Bust of the Year →]                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Screen 5: Bust of the Year (Shameful Reveal)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏆 SEASON 4 AWARDS CEREMONY                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                          💩 BUST OF THE YEAR 💩                             │
│                                                                             │
│                           DICK STUART                                       │
│                           Boston Red Sox                                    │
│                                                                             │
│  "Dr. Strangeglove" lives up to his name...                                │
│                                                                             │
│  💰 Salary: $8.5M (85th percentile at 1B)                                   │
│  📉 Performance: 0.3 WAR (12th percentile at 1B)                            │
│  📊 Delta: -73% (Expected much more!)                                       │
│                                                                             │
│  Season Line: .228 / 18 HR / 56 RBI / 42 Errors / -4.2 Clutch              │
│                                                                             │
│  😬 PENALTIES:                                                              │
│  • Choker trait applied                                                     │
│  • -5 Fan Happiness (Red Sox)                                               │
│  • Salary expected to drop significantly                                    │
│                                                                             │
│                              [Next: Summary →]                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Screen 6: Awards Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏆 SEASON 4 AWARDS CEREMONY - COMPLETE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📜 ALL AWARDS SUMMARY                                                      │
│                                                                             │
│  MAJOR AWARDS                         POSITION AWARDS                       │
│  ────────────────                     ─────────────────                     │
│  MVP: Willie Mays (Giants)            Gold Gloves: 10 awarded               │
│  Cy Young: Sandy Koufax (Dodgers)     Silver Sluggers: 9 awarded            │
│  ROY: Pete Rose (Reds)                Platinum Glove: Willie Mays           │
│  Reliever: Rollie Fingers (A's)                                             │
│  Manager: Walter Alston (Dodgers)     TEAM AWARDS COUNT                     │
│  Kara Kawaguchi: Dusty Rhodes         ─────────────────                     │
│  Bench Player: Manny Mota (Dodgers)   Giants: 5 awards (+22 happiness)      │
│  Comeback: Lou Gehrig (Yankees)       Dodgers: 4 awards (+18 happiness)     │
│  Bust: Dick Stuart (Red Sox)          Cardinals: 3 awards (+12 happiness)   │
│                                                                             │
│  📈 RATINGS CHANGES APPLIED                                                 │
│  ────────────────────────                                                   │
│  • 10 Gold Glove winners: +5 Fielding each                                  │
│  • 9 Silver Slugger winners: +3 Power, +3 Contact each                      │
│  • League leaders: Various boosts applied                                   │
│  • Dick Stuart: Choker trait added                                          │
│                                                                             │
│       [View Full Details]            [Continue to Playoffs →]               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Manager of the Year (Shown in Screen 3 or separate)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  👔 MANAGER OF THE YEAR                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                          WALTER ALSTON                                      │
│                          Los Angeles Dodgers                                │
│                                                                             │
│  Record: 98-64 (.605)                                                       │
│  Expected: 85-77 (.525) based on salary                                     │
│  Overperformance: +13 wins!                                                 │
│                                                                             │
│  mWAR: 4.2 (Excellent in-game decisions)                                    │
│                                                                             │
│  ⚡ REWARDS:                                                                │
│  • +5 to team's EOS adjustment bonus pool                                   │
│  • +5 Fan Happiness                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## EOS Ratings Adjustments Display

Shown during the offseason, this screen displays all rating changes based on performance vs salary expectations.

### Main EOS Adjustments Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 END-OF-SEASON RATINGS ADJUSTMENTS                                       │
│  Season 4 Complete                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [🌟 Breakout Stars]  [📉 Falling Stars]  [All Changes]  [By Team]          │
│                                                                             │
│  🌟 BREAKOUT STARS (Biggest Gainers)                                        │
│  ────────────────────────────────────────────────────────────────────       │
│  │ Player          │ Team  │ Before │ After │ Change │ Why                │
│  ├─────────────────┼───────┼────────┼───────┼────────┼────────────────────│
│  │ Dusty Rhodes    │ SF    │ C (72) │ B (78)│ +6     │ +54% WAR vs salary │
│  │ Pete Rose       │ CIN   │ C+(74) │ B-(80)│ +6     │ ROY + outperformed │
│  │ Lou Brock       │ STL   │ B-(79) │ B+(86)│ +7     │ +48% WAR vs salary │
│  │ Maury Wills     │ LA    │ C+(75) │ B (82)│ +7     │ SB leader bonus    │
│  │ Tony Oliva      │ MIN   │ B (81) │ B+(87)│ +6     │ +39% WAR vs salary │
│  ────────────────────────────────────────────────────────────────────       │
│                                                                             │
│  [Tap any player for detailed breakdown]                                    │
│                                                                             │
│                              [Continue →]                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Falling Stars Tab

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 END-OF-SEASON RATINGS ADJUSTMENTS                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [🌟 Breakout Stars]  [📉 Falling Stars]  [All Changes]  [By Team]          │
│                                                                             │
│  📉 FALLING STARS (Biggest Losers)                                          │
│  ────────────────────────────────────────────────────────────────────       │
│  │ Player          │ Team  │ Before │ After │ Change │ Why                │
│  ├─────────────────┼───────┼────────┼───────┼────────┼────────────────────│
│  │ Dick Stuart     │ BOS   │ B+(86) │ B-(79)│ -7     │ -73% WAR vs salary │
│  │ Roger Maris     │ NYY   │ A-(90) │ B+(87)│ -3     │ -28% WAR vs salary │
│  │ Don Zimmer      │ CHC   │ C+(76) │ C (71)│ -5     │ -45% WAR vs salary │
│  │ Camilo Pascual  │ MIN   │ B (83) │ B-(80)│ -3     │ -22% pWAR vs salary│
│  │ Juan Pizarro    │ CWS   │ B-(79) │ C+(75)│ -4     │ -31% pWAR vs salary│
│  ────────────────────────────────────────────────────────────────────       │
│                                                                             │
│  ⚠️ High-salary players face larger penalties for underperformance          │
│                                                                             │
│                              [Continue →]                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Player Detail Breakdown (Tap to Expand)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 DETAILED BREAKDOWN: DUSTY RHODES                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  💰 SALARY CONTEXT                                                          │
│  Salary: $1.2M                                                              │
│  Position: OF                                                               │
│  Salary Percentile at OF: 8th (Low tier - high upside potential)            │
│                                                                             │
│  📊 PERFORMANCE vs EXPECTATIONS                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Component  │ Salary %ile │ WAR %ile │  Delta   │ Factor │ Adjustment│  │
│  ├─────────────┼─────────────┼──────────┼──────────┼────────┼───────────│  │
│  │  bWAR       │     8%      │    62%   │   +54%   │  10.0  │    +5     │  │
│  │  rWAR       │     8%      │    71%   │   +63%   │  10.0  │    +6     │  │
│  │  fWAR       │     8%      │    45%   │   +37%   │  10.0  │    +4     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  📈 RATING CHANGES APPLIED                                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Category   │  Rating     │  Before  │  Change  │  After              │  │
│  ├─────────────┼─────────────┼──────────┼──────────┼─────────────────────│  │
│  │  Batting    │  Power      │    68    │    +3    │    71               │  │
│  │             │  Contact    │    65    │    +2    │    67               │  │
│  │  Running    │  Speed      │    72    │    +6    │    78               │  │
│  │  Fielding   │  Fielding   │    61    │    +2    │    63               │  │
│  │             │  Arm        │    58    │    +2    │    60               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  TOTAL: Grade C (72) → Grade B (78)                                         │
│  🏆 Also won: Kara Kawaguchi Award (+1 positive trait)                      │
│                                                                             │
│                              [Close]                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### By Team View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 EOS ADJUSTMENTS BY TEAM                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [🌟 Breakout Stars]  [📉 Falling Stars]  [All Changes]  [By Team]          │
│                                                                             │
│  Select Team: [Giants ▼]                                                    │
│                                                                             │
│  SAN FRANCISCO GIANTS - Season 4 Adjustments                                │
│  ────────────────────────────────────────────────────────────────────       │
│  │ Player          │ Position │ Before │ After │ Change │                  │
│  ├─────────────────┼──────────┼────────┼───────┼────────┤                  │
│  │ Willie Mays     │ CF       │ A+ (96)│ A+(97)│ +1     │ ← Near cap       │
│  │ Willie McCovey  │ 1B       │ A (91) │ A (92)│ +1     │                  │
│  │ Juan Marichal   │ SP       │ A (90) │ A-(89)│ -1     │ Slight under     │
│  │ Orlando Cepeda  │ 1B       │ B+(87) │ B+(88)│ +1     │                  │
│  │ Dusty Rhodes    │ OF       │ C (72) │ B (78)│ +6     │ ⭐ Breakout!     │
│  │ Jim Davenport   │ 3B       │ C+(75) │ C+(76)│ +1     │                  │
│  │ Jose Pagan      │ SS       │ C (70) │ C (71)│ +1     │                  │
│  ────────────────────────────────────────────────────────────────────       │
│                                                                             │
│  Team Average Change: +1.4 rating points                                    │
│  Manager Bonus Applied: +5 (Walter Alston MOY runner-up)                    │
│                                                                             │
│                              [Continue →]                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Summary Statistics

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 EOS ADJUSTMENTS SUMMARY                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LEAGUE-WIDE STATISTICS                                                     │
│  ─────────────────────                                                      │
│  Total Players Adjusted: 312                                                │
│  Players with Positive Change: 156 (50%)                                    │
│  Players with Negative Change: 142 (45%)                                    │
│  Players with No Change: 14 (5%)                                            │
│                                                                             │
│  Average Adjustment: +0.3 rating points                                     │
│  Largest Gain: Lou Brock (+7)                                               │
│  Largest Drop: Dick Stuart (-7)                                             │
│                                                                             │
│  GRADE CHANGES                                                              │
│  ─────────────────                                                          │
│  Grade Promotions: 45 players moved up a letter grade                       │
│  Grade Demotions: 38 players moved down a letter grade                      │
│                                                                             │
│  BY SALARY TIER                                                             │
│  ──────────────                                                             │
│  Elite (90%+): Avg -1.2 (high expectations)                                 │
│  High (75-89%): Avg -0.4                                                    │
│  Mid (25-74%): Avg +0.2                                                     │
│  Low (0-24%): Avg +1.8 (outperformance rewarded)                            │
│                                                                             │
│       [View Full Report]            [Continue to Offseason →]               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Offseason Hub & Progress Tracker

The Offseason Hub is the central navigation point for all offseason activities. It guides users through each phase and tracks completion.

### Offseason Hub - Main Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏠 OFFSEASON HUB - Season 4 → Season 5                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  OFFSEASON PROGRESS                                                         │
│  ═══════════════════════════════════════════════════════════════            │
│  ✅ 1. Awards Ceremony          ████████████████████  Complete              │
│  ✅ 2. EOS Ratings Adjustments  ████████████████████  Complete              │
│  ✅ 3. Team MVP Selection       ████████████████████  Complete              │
│  ✅ 4. Personality Updates      ████████████████████  Complete              │
│  🔄 5. RETIREMENTS              ████████████░░░░░░░░  In Progress           │
│  ⏳ 6. Hall of Fame             ░░░░░░░░░░░░░░░░░░░░  Waiting               │
│  ⏳ 7. Free Agency              ░░░░░░░░░░░░░░░░░░░░  Waiting               │
│  ⏳ 8. Expansion/Contraction    ░░░░░░░░░░░░░░░░░░░░  Waiting               │
│  ⏳ 9. Draft                    ░░░░░░░░░░░░░░░░░░░░  Waiting               │
│  ⏳ 10. Final Adjustments       ░░░░░░░░░░░░░░░░░░░░  Waiting               │
│  ═══════════════════════════════════════════════════════════════            │
│                                                                             │
│  CURRENT PHASE: RETIREMENTS                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  12 players eligible for retirement                                   │  │
│  │  3 players have announced retirement                                  │  │
│  │  2 jersey retirements pending your decision                           │  │
│  │                                                                        │  │
│  │                    [Continue Retirements →]                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐     │
│  │ 📊 Season Recap    │  │ 🏆 Awards Summary  │  │ 📈 EOS Changes     │     │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 5: Retirements Screen (Interactive)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  👴 RETIREMENTS - Season 4 Offseason                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ANNOUNCED RETIREMENTS                                                      │
│  ─────────────────────                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  👴 STAN MUSIAL - Cardinals                                           │  │
│  │  Age: 42 | 22 Seasons | Grade: B-                                     │  │
│  │  Career: .331 AVG | 475 HR | 1,951 RBI | 3,630 Hits                   │  │
│  │  Reason: Age + declining performance                                  │  │
│  │                                                                        │  │
│  │  🎽 RETIRE JERSEY #6?  [Yes, Retire] [Not Yet]                        │  │
│  │  (Qualifies: 10+ seasons, All-Star 7x, MVP, franchise icon)           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  👴 DUKE SNIDER - Dodgers                                             │  │
│  │  Age: 39 | 16 Seasons | Grade: C+                                     │  │
│  │  Career: .295 AVG | 407 HR | 1,333 RBI                                │  │
│  │  Reason: Performance decline (WAR -2.3 from expected)                 │  │
│  │                                                                        │  │
│  │  🎽 RETIRE JERSEY #4?  [Yes, Retire] [Not Yet]                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  👴 EARLY WYNN - White Sox                                            │  │
│  │  Age: 44 | 23 Seasons | Grade: C                                      │  │
│  │  Career: 300 W | 3.54 ERA | 2,334 K                                   │  │
│  │  Reason: Age (forced retirement at 44+)                               │  │
│  │                                                                        │  │
│  │  🎽 Jersey retirement not eligible (less than 8 seasons with team)    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ⚠️ ELIGIBLE BUT NOT RETIRING (may retire next year)                       │
│  • Ted Williams (41, Red Sox) - 15% retirement probability → Staying       │
│  • Warren Spahn (43, Braves) - 35% probability → Staying one more year     │
│                                                                             │
│              [Confirm Retirements]        [Back to Hub]                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 6: Hall of Fame Ceremony Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏛️ HALL OF FAME INDUCTION - Season 4 Class                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  NEW HALL OF FAME INDUCTEES                                                 │
│  ══════════════════════════                                                 │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        🏛️ STAN MUSIAL 🏛️                              │  │
│  │                                                                        │  │
│  │  "Stan the Man"                                                       │  │
│  │  St. Louis Cardinals (1941-1963)                                      │  │
│  │                                                                        │  │
│  │  CAREER HIGHLIGHTS                                                    │  │
│  │  ─────────────────                                                    │  │
│  │  • .331 Career Average (3rd all-time)                                 │  │
│  │  • 475 Home Runs | 1,951 RBI | 3,630 Hits                             │  │
│  │  • 3x MVP | 24x All-Star | 7x Batting Champion                        │  │
│  │  • 2x World Series Champion                                           │  │
│  │                                                                        │  │
│  │  MEMORABLE MOMENTS                                                    │  │
│  │  ─────────────────                                                    │  │
│  │  🏆 Walk-off HR in World Series Game 7 (Season 2)                     │  │
│  │  📈 3,000th hit milestone (May 13, Season 3)                          │  │
│  │  ⭐ 5-hit game in All-Star Game (Season 1)                            │  │
│  │                                                                        │  │
│  │  HOF Score: 94.2 (First Ballot)                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Also inducted: Duke Snider (HOF Score: 78.5)                              │
│                                                                             │
│  📊 HALL OF FAME NOW CONTAINS: 23 MEMBERS                                   │
│                                                                             │
│                    [View All HOF Members]  [Continue →]                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 7: Free Agency (Dice-Roll System)

Free Agency uses a dice-roll system to determine which players leave each team. This creates drama and unpredictability while giving users strategic control through protection and assignment choices.

**FA Overview:**
- 2 rounds of FA per offseason
- Each team potentially loses ONE player per round (determined by dice roll)
- Personality determines WHERE the player goes
- Receiving team must give back a matching position type (pitcher or position player)
- Salary rules determine the quality of return player

---

### Step 1: Protect One Player

At the start of each FA round, select ONE player to protect from leaving:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🛡️ FREE AGENCY ROUND 1 - PROTECT A PLAYER                    [Team: SF]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Choose ONE player to protect from free agency this round.                  │
│  Protected player CANNOT leave, regardless of dice roll.                    │
│                                                                             │
│  YOUR ROSTER (12 players - select 1 to protect):                            │
│  ───────────────────────────────────────────────────                        │
│  │   │ Player           │ Pos │ Grade │ Salary  │ Personality │            │
│  ├───┼──────────────────┼─────┼───────┼─────────┼─────────────┤            │
│  │ ● │ Willie Mays      │ CF  │ A+    │ $12.5M  │ Competitive │ ← PROTECT  │
│  │ ○ │ Juan Marichal    │ SP  │ A     │ $8.8M   │ Jolly       │            │
│  │ ○ │ Willie McCovey   │ 1B  │ A     │ $9.2M   │ Tough       │            │
│  │ ○ │ Orlando Cepeda   │ 1B  │ B+    │ $6.4M   │ Egotistical │            │
│  │ ○ │ Gaylord Perry    │ SP  │ B+    │ $5.8M   │ Relaxed     │            │
│  │ ○ │ Jim Ray Hart     │ 3B  │ B     │ $4.2M   │ Timid       │            │
│  │ ○ │ Tom Haller       │ C   │ B-    │ $3.8M   │ Jolly       │            │
│  │ ○ │ Jim Davenport    │ 3B  │ B-    │ $3.5M   │ Relaxed     │            │
│  │ ○ │ Jose Pagan       │ SS  │ C+    │ $2.9M   │ Droopy      │            │
│  │ ○ │ Chuck Hiller     │ 2B  │ C+    │ $2.7M   │ Competitive │            │
│  │ ○ │ Harvey Kuenn     │ OF  │ C     │ $2.2M   │ Tough       │            │
│  │ ○ │ Bob Bolin        │ RP  │ C     │ $1.8M   │ Timid       │            │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  💡 TIP: Protect your most valuable player you can't afford to lose.        │
│          Consider personality - Jolly players always stay anyway!           │
│                                                                             │
│                    [Confirm Protection: Willie Mays]                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Step 2: Assign Players to Dice Values

After protecting one player, assign the remaining 11 players to dice values 2-12. The value 7 is most likely to be rolled (6/36 = 16.7% chance), while 2 and 12 are least likely (1/36 = 2.8% each).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎲 ASSIGN DICE VALUES - Who's at Risk?                       [Team: SF]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Assign each unprotected player to a dice value (2-12).                     │
│  Higher probability values = more likely to leave!                          │
│                                                                             │
│  🛡️ PROTECTED: Willie Mays (cannot leave)                                   │
│                                                                             │
│  DICE PROBABILITY CHART:                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  2    3    4    5    6    7    8    9   10   11   12               │    │
│  │ 2.8% 5.6% 8.3% 11% 14% 16.7% 14% 11% 8.3% 5.6% 2.8%               │    │
│  │ ░░   ░░░  ░░░░ ░░░░░░░░░░░░░░░░░░░░░░ ░░░░ ░░░  ░░                │    │
│  │ SAFE ←─────────────────────────────────────────────→ SAFE          │    │
│  │              ↑ DANGER ZONE ↑                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ASSIGN PLAYERS (drag or tap to assign):                                    │
│  ───────────────────────────────────────                                    │
│  │ Dice │ Player           │ Salary  │ Personality │ Leave Odds │          │
│  ├──────┼──────────────────┼─────────┼─────────────┼────────────┤          │
│  │  2   │ Juan Marichal    │ $8.8M   │ Jolly       │ 2.8% ░     │ SAFEST   │
│  │  3   │ Willie McCovey   │ $9.2M   │ Tough       │ 5.6% ░░    │          │
│  │  4   │ Orlando Cepeda   │ $6.4M   │ Egotistical │ 8.3% ░░░   │          │
│  │  5   │ Gaylord Perry    │ $5.8M   │ Relaxed     │ 11.1% ░░░░ │          │
│  │  6   │ Jim Ray Hart     │ $4.2M   │ Timid       │ 13.9% ░░░░░│          │
│  │  7   │ Jose Pagan       │ $2.9M   │ Droopy      │ 16.7% ░░░░░░ RISKIEST │
│  │  8   │ Chuck Hiller     │ $2.7M   │ Competitive │ 13.9% ░░░░░│          │
│  │  9   │ Tom Haller       │ $3.8M   │ Jolly       │ 11.1% ░░░░ │          │
│  │ 10   │ Jim Davenport    │ $3.5M   │ Relaxed     │ 8.3% ░░░   │          │
│  │ 11   │ Harvey Kuenn     │ $2.2M   │ Tough       │ 5.6% ░░    │          │
│  │ 12   │ Bob Bolin        │ $1.8M   │ Timid       │ 2.8% ░     │ SAFEST   │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  💡 STRATEGY: Put players you want to keep at 2, 3, 11, 12 (edges).         │
│               Put expendable players at 6, 7, 8 (middle = most likely).     │
│               Remember: Jolly personalities ALWAYS stay even if rolled!     │
│                                                                             │
│       [Auto-Assign by Salary]    [Confirm Assignments]    [Reset]           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Auto-Assign Logic (if user chooses):**
- Sorts players by salary (highest = safest positions at 2/12, 3/11, etc.)
- Lowest salary players get assigned to 6, 7, 8 (most likely to leave)

---

### Step 3: Roll the Dice!

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎲 ROLL FOR FREE AGENCY - Round 1                            [Team: SF]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Time to see who (if anyone) leaves in free agency!                         │
│                                                                             │
│  Your assignments:                                                          │
│  2=Marichal  3=McCovey  4=Cepeda  5=Perry  6=Hart                          │
│  7=Pagan  8=Hiller  9=Haller  10=Davenport  11=Kuenn  12=Bolin              │
│                                                                             │
│                                                                             │
│                    ┌─────────┐      ┌─────────┐                             │
│                    │         │      │         │                             │
│                    │  🎲 ?   │      │  🎲 ?   │                             │
│                    │         │      │         │                             │
│                    └─────────┘      └─────────┘                             │
│                       DIE 1           DIE 2                                 │
│                                                                             │
│                         ┌─────────────────┐                                 │
│                         │   🎲 ROLL DICE  │                                 │
│                         └─────────────────┘                                 │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────      │
│  Or use single button:                                                      │
│                         ┌─────────────────┐                                 │
│                         │  ROLL (2-12)    │                                 │
│                         └─────────────────┘                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**After Rolling:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎲 DICE RESULT                                               [Team: SF]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    ┌─────────┐      ┌─────────┐                             │
│                    │  ⚂     │      │  ⚃     │                             │
│                    │    3    │      │    4    │                             │
│                    │         │      │         │                             │
│                    └─────────┘      └─────────┘                             │
│                                                                             │
│                         TOTAL: 7                                            │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════            │
│                                                                             │
│  ⚠️ JOSE PAGAN (SS, C+, $2.9M) IS LEAVING!                                  │
│                                                                             │
│  Personality: DROOPY                                                        │
│  Droopy players retire rather than change teams.                            │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  👴 Jose Pagan has announced his RETIREMENT                           │  │
│  │                                                                        │  │
│  │  "I'm tired. I don't want to start over somewhere new."               │  │
│  │                                                                        │  │
│  │  Career Stats: .258 AVG | 52 HR | 372 RBI | 8 Seasons                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ⚡ RESULT: You LOSE Jose Pagan (retired - no compensation)                 │
│                                                                             │
│                    [Continue to Next Team]                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Personality Destinations

When a player leaves (and doesn't retire), their personality determines where they go:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📋 PERSONALITY DESTINATION RULES                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  COMPETITIVE → Goes to team's RIVAL                                         │
│                (Team with closest head-to-head record to .500 all-time)     │
│                                                                             │
│  RELAXED → Goes to RANDOM team (dice roll 1-N where N = # of teams)         │
│            If rolls current team, player STAYS PUT                          │
│                                                                             │
│  DROOPY → RETIRES (doesn't want to start over)                              │
│           No compensation - team just loses the player                      │
│                                                                             │
│  JOLLY → STAYS with current team (always happy where they are)              │
│          If rolled, nothing happens - player doesn't leave                  │
│                                                                             │
│  TOUGH → Goes to team with HIGHEST TEAM OPS that season                     │
│          Wants to play with the best hitters                                │
│                                                                             │
│  TIMID → Goes to CHAMPIONSHIP team (last season's winner)                   │
│          Wants a ring, seeks security of proven winner                      │
│                                                                             │
│  EGOTISTICAL → Goes to WORST team (lowest total team WAR)                   │
│                Wants to be "the man" / biggest fish in small pond           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Step 4: Receiving Team Gives Back a Player

When a team receives a FA, they must give back a player that matches:
1. **Position type** (pitcher for pitcher, position player for position player)
2. **Salary threshold** based on team records

**Salary Return Rules:**
- If receiving team had a **BETTER record** than losing team: Must return player of **EQUAL or HIGHER salary**
- If receiving team had a **WORSE record** than losing team: Can return player up to **20% LOWER salary**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔄 COMPENSATION - Dodgers Receive Orlando Cepeda                [Team: SF] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Orlando Cepeda (1B, B+, $6.4M) rolled and is leaving!                      │
│  Personality: EGOTISTICAL → Goes to worst team (Mets, 48-114)               │
│                                                                             │
│  RECORD COMPARISON:                                                         │
│  • Giants (your team): 92-70                                                │
│  • Mets (receiving):   48-114 (WORSE record)                                │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════            │
│  Since Mets had WORSE record, they can return a player worth                │
│  up to 20% less: Minimum $5.12M (80% of $6.4M)                              │
│  ═══════════════════════════════════════════════════════════════            │
│                                                                             │
│  METS MUST SEND YOU A POSITION PLAYER (Cepeda was position player)          │
│                                                                             │
│  Mets eligible players to give you:                                         │
│  ───────────────────────────────────                                        │
│  │ Player           │ Pos │ Grade │ Salary  │                              │
│  ├──────────────────┼─────┼───────┼─────────┤                              │
│  │ Ed Kranepool     │ 1B  │ C+    │ $5.2M   │ ✓ Meets threshold            │
│  │ Ron Hunt         │ 2B  │ B-    │ $5.8M   │ ✓ Meets threshold            │
│  │ Joe Christopher  │ OF  │ C     │ $4.1M   │ ✗ Below $5.12M minimum       │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  🎲 AUTO-SELECT: Mets give you their lowest eligible salary player          │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  YOU RECEIVE: Ed Kranepool (1B, C+, $5.2M)                            │  │
│  │                                                                        │  │
│  │  NET RESULT:                                                          │  │
│  │  • Lost: Orlando Cepeda (B+, $6.4M)                                   │  │
│  │  • Gained: Ed Kranepool (C+, $5.2M)                                   │  │
│  │  • Salary saved: $1.2M                                                │  │
│  │  • Grade lost: 1 full grade (B+ → C+)                                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│                    [Continue]                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**When receiving team had BETTER record:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔄 COMPENSATION - Yankees Receive Jim Ray Hart                  [Team: SF] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Jim Ray Hart (3B, B, $4.2M) rolled and is leaving!                         │
│  Personality: TIMID → Goes to championship team (Yankees, 98-64)            │
│                                                                             │
│  RECORD COMPARISON:                                                         │
│  • Giants (your team): 92-70                                                │
│  • Yankees (receiving): 98-64 (BETTER record)                               │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════            │
│  Since Yankees had BETTER record, they MUST return a player worth           │
│  EQUAL or MORE: Minimum $4.2M                                               │
│  ═══════════════════════════════════════════════════════════════            │
│                                                                             │
│  YANKEES MUST SEND YOU A POSITION PLAYER                                    │
│                                                                             │
│  Yankees eligible players:                                                  │
│  ─────────────────────────                                                  │
│  │ Player           │ Pos │ Grade │ Salary  │                              │
│  ├──────────────────┼─────┼───────┼─────────┤                              │
│  │ Clete Boyer      │ 3B  │ B-    │ $4.5M   │ ✓ Meets threshold            │
│  │ Tom Tresh        │ OF  │ B-    │ $4.8M   │ ✓ Meets threshold            │
│  │ Joe Pepitone     │ 1B  │ B     │ $5.2M   │ ✓ Meets threshold            │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  YOU RECEIVE: Clete Boyer (3B, B-, $4.5M)                             │  │
│  │                                                                        │  │
│  │  NET RESULT:                                                          │  │
│  │  • Lost: Jim Ray Hart (B, $4.2M)                                      │  │
│  │  • Gained: Clete Boyer (B-, $4.5M)                                    │  │
│  │  • Salary increase: +$0.3M                                            │  │
│  │  • Grade: Down half grade (B → B-) - acceptable for worse team        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│                    [Continue]                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Special Case: Jolly Personality (Player Stays)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎲 DICE RESULT                                               [Team: SF]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    ┌─────────┐      ┌─────────┐                             │
│                    │  ⚀     │      │  ⚁     │                             │
│                    │    1    │      │    2    │                             │
│                    │         │      │         │                             │
│                    └─────────┘      └─────────┘                             │
│                                                                             │
│                         TOTAL: 3                                            │
│                                                                             │
│  Player at position 3: Juan Marichal (SP, A, $8.8M)                         │
│  Personality: JOLLY                                                         │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  😊 Juan Marichal is STAYING!                                         │  │
│  │                                                                        │  │
│  │  "I love it here! Why would I ever leave?"                            │  │
│  │                                                                        │  │
│  │  Jolly players never leave their team in free agency.                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ⚡ RESULT: No player movement - Marichal stays with Giants                 │
│                                                                             │
│                    [Continue to Next Team]                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Special Case: Relaxed Rolls Current Team

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎲 RELAXED PERSONALITY - Random Destination Roll              [Team: SF]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Gaylord Perry (SP, B+, $5.8M) is leaving!                                  │
│  Personality: RELAXED → Random team (dice roll)                             │
│                                                                             │
│  Rolling for destination (16 teams in league)...                            │
│                                                                             │
│                         ┌─────────────────┐                                 │
│                         │  ROLL FOR TEAM  │                                 │
│                         └─────────────────┘                                 │
│                                                                             │
│  Result: 7 → San Francisco Giants (CURRENT TEAM!)                           │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  😎 Gaylord Perry is STAYING!                                         │  │
│  │                                                                        │  │
│  │  "Eh, I'm fine here. Change is overrated."                            │  │
│  │                                                                        │  │
│  │  Relaxed player rolled their current team - they stay put.            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ⚡ RESULT: No player movement - Perry stays with Giants                    │
│                                                                             │
│                    [Continue to Next Team]                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### FA Round Summary (After All Teams Process)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  💰 FREE AGENCY ROUND 1 COMPLETE                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  YOUR TEAM: SAN FRANCISCO GIANTS                                            │
│  ─────────────────────────────────                                          │
│  LOST:                                                                      │
│  • Jose Pagan (SS, C+, $2.9M) - RETIRED (Droopy)                           │
│  • Orlando Cepeda (1B, B+, $6.4M) → Mets (Egotistical)                     │
│                                                                             │
│  RECEIVED:                                                                  │
│  • Ed Kranepool (1B, C+, $5.2M) ← Mets (compensation for Cepeda)           │
│  • Clete Boyer (3B, B-, $4.5M) ← Yankees (you claimed from another move)   │
│                                                                             │
│  NET: -1 player (Pagan retired), downgrade at 1B (B+ → C+)                  │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                             │
│  LEAGUE-WIDE ROUND 1 MOVEMENT                                               │
│  ────────────────────────────                                               │
│  │ Player           │ From      │ To        │ Personality │ Return        │ │
│  ├──────────────────┼───────────┼───────────┼─────────────┼───────────────│ │
│  │ Orlando Cepeda   │ Giants    │ Mets      │ Egotistical │ Ed Kranepool  │ │
│  │ Roger Maris      │ Yankees   │ Cardinals │ Competitive │ Ken Boyer     │ │
│  │ Frank Howard     │ Dodgers   │ Senators  │ Egotistical │ Don Lock      │ │
│  │ Jose Pagan       │ Giants    │ RETIRED   │ Droopy      │ (none)        │ │
│  │ Camilo Pascual   │ Twins     │ Twins     │ Relaxed     │ (stayed)      │ │
│  │ Rocky Colavito   │ Indians   │ Indians   │ Jolly       │ (stayed)      │ │
│  │ ... 8 more moves                                                       │ │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                             │
│  Players Moved: 14  |  Retirements: 3  |  Stayed (Jolly/Relaxed): 5        │
│                                                                             │
│       [Continue to Round 2]        [View All Details]                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Free Agency Results Summary

After both FA rounds complete:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  💰 FREE AGENCY COMPLETE - Season 5                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  YOUR TEAM: SAN FRANCISCO GIANTS                                            │
│  ─────────────────────────────────                                          │
│                                                                             │
│  ROUND 1 RESULTS:                                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ LOST: Jose Pagan (SS, C+, $2.9M) - RETIRED (Droopy)                   │  │
│  │ LOST: Orlando Cepeda (1B, B+, $6.4M) → Mets (Egotistical)             │  │
│  │ RECEIVED: Ed Kranepool (1B, C+, $5.2M) ← Mets                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ROUND 2 RESULTS:                                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ LOST: Gaylord Perry (SP, B+, $5.8M) → Dodgers (Competitive - rival)   │  │
│  │ RECEIVED: Claude Osteen (SP, B-, $5.1M) ← Dodgers                     │  │
│  │ RECEIVED: Clete Boyer (3B, B-, $4.5M) ← Yankees (you were destination)│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════            │
│  NET SUMMARY:                                                               │
│  • Players Lost: 3 (1 retired, 2 moved)                                     │
│  • Players Received: 3 (compensation + incoming FA)                         │
│  • Net Salary: -$1.5M (saved money)                                         │
│  • Net Quality: Downgrade (lost B+, B+ → gained C+, B-, B-)                │
│  ═══════════════════════════════════════════════════════════════            │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                             │
│  LEAGUE-WIDE FA MOVEMENT (Both Rounds)                                      │
│  ─────────────────────────────────────                                      │
│  │ Player           │ From      │ To        │ Personality │ Return        │ │
│  ├──────────────────┼───────────┼───────────┼─────────────┼───────────────│ │
│  │ Orlando Cepeda   │ Giants    │ Mets      │ Egotistical │ Ed Kranepool  │ │
│  │ Gaylord Perry    │ Giants    │ Dodgers   │ Competitive │ Claude Osteen │ │
│  │ Roger Maris      │ Yankees   │ Cardinals │ Competitive │ Ken Boyer     │ │
│  │ Frank Howard     │ Dodgers   │ Senators  │ Egotistical │ Don Lock      │ │
│  │ Jose Pagan       │ Giants    │ RETIRED   │ Droopy      │ (none)        │ │
│  │ Rocky Colavito   │ Indians   │ Indians   │ Jolly       │ (stayed)      │ │
│  │ ... 22 more moves                                                      │ │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                             │
│  📊 FA SUMMARY STATS (Both Rounds)                                          │
│  Total Players Moved: 28                                                    │
│  Retirements (Droopy): 5                                                    │
│  Stayed Put (Jolly/Relaxed rolled home): 12                                 │
│  Highest Salary Moved: Roger Maris ($7.8M) → Cardinals                      │
│  Most Players Lost: Mets (3 - all Egotistical went to worst team!)         │
│  Most Players Gained: Giants (3 - popular destination for Timid)           │
│                                                                             │
│       [View All Moves]        [Continue to Expansion/Contraction →]         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 8: Expansion/Contraction Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏟️ EXPANSION / CONTRACTION                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ⚠️ CONTRACTION ALERT                                                       │
│  ───────────────────                                                        │
│  The Kansas City Athletics are in danger of folding.                        │
│                                                                             │
│  Fan Happiness: 18 (Critical - below 30 threshold)                          │
│  Seasons Below 30: 3 consecutive                                            │
│  Contraction Probability: 70%                                               │
│                                                                             │
│  🎲 DICE ROLL RESULT: 62 (Needed < 70)                                      │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  ❌ THE KANSAS CITY ATHLETICS HAVE FOLDED                             │  │
│  │                                                                        │  │
│  │  After 12 seasons of declining attendance and fan apathy,             │  │
│  │  the Athletics franchise has ceased operations.                       │  │
│  │                                                                        │  │
│  │  PLAYER DISPERSAL:                                                    │  │
│  │  • Reggie Jackson → Oakland (expansion draft claim)                   │  │
│  │  • Catfish Hunter → Yankees (free agent signing)                      │  │
│  │  • Sal Bando → Brewers (waiver claim)                                 │  │
│  │  • All others → Free agent pool for next season                       │  │
│  │                                                                        │  │
│  │  📜 The Athletics have been added to the Museum's "Defunct Teams"     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                             │
│  🏟️ NO EXPANSION THIS YEAR                                                 │
│  (Expansion requires 14+ teams and League vote)                             │
│                                                                             │
│                              [Continue to Draft →]                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 9: Draft Screen (Interactive)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📋 SEASON 5 DRAFT                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DRAFT ORDER (Reverse Expected WAR - Worst teams pick first)                │
│  ─────────────────────────────────────────────────────────────              │
│  1. Cubs (42-118)  2. Mets (48-112)  3. Senators (52-108)  ...  12. Giants │
│                                                                             │
│  CURRENT PICK: #12 - San Francisco Giants                                   │
│  Roster Gaps to Fill: 3 (1 SP, 1 RP, 1 OF)                                  │
│                                                                             │
│  AVAILABLE DRAFT POOL                                                       │
│  ────────────────────                                                       │
│  │ Player          │ Position │ Grade │ Age │ Potential │ Best Fit?      │ │
│  ├─────────────────┼──────────┼───────┼─────┼───────────┼────────────────│ │
│  │ 🌟 Gaylord Perry│ SP       │ B-    │ 24  │ High      │ ✅ NEED SP     │ │
│  │ Ron Santo       │ 3B       │ B     │ 23  │ High      │                │ │
│  │ Jim Fregosi     │ SS       │ C+    │ 22  │ Medium    │                │ │
│  │ Tommy John      │ SP       │ C+    │ 21  │ High      │ ✅ NEED SP     │ │
│  │ Dick Allen      │ 3B       │ B-    │ 22  │ Very High │                │ │
│  │ Tug McGraw      │ RP       │ C     │ 20  │ High      │ ✅ NEED RP     │ │
│  ────────────────────────────────────────────────────────────────────       │
│                                                                             │
│  💡 RECOMMENDATION: Gaylord Perry fills your SP need with high potential    │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ SELECT: [Gaylord Perry ▼]              [Draft Player]                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [Auto-Draft Best Available]  [View Full Draft Board]  [Skip Pick]          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 10: Final Adjustments Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚙️ FINAL ADJUSTMENTS - Season 5 Preparation                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MANUAL ADJUSTMENTS AVAILABLE                                               │
│  ────────────────────────────                                               │
│                                                                             │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐     │
│  │ 🔄 PROPOSE TRADE   │  │ ✏️ EDIT PLAYER     │  │ ➕ ADD FREE AGENT  │     │
│  │                    │  │                    │  │                    │     │
│  │ Make inter-team    │  │ Adjust ratings,    │  │ Sign unsigned FA   │     │
│  │ trades before      │  │ names, positions   │  │ to fill roster     │     │
│  │ season starts      │  │ manually           │  │ gaps               │     │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘     │
│                                                                             │
│  YOUR TEAM STATUS: SAN FRANCISCO GIANTS                                     │
│  ─────────────────────────────────────                                      │
│  Roster: 26/26 (Full)                                                       │
│  Salary: $82.4M (3rd highest)                                               │
│  Expected WAR: 42.3 (1st)                                                   │
│  Fan Happiness: 78 (Very Happy)                                             │
│                                                                             │
│  ⚠️ LEAGUE NOTICES                                                          │
│  • Dodgers over salary cap - must trade before Season 5                     │
│  • Cubs need 2 more players to meet minimum roster                          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                             │
│           [Make Adjustments]            [Ready for Season 5! →]             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Offseason Complete - Launch New Season

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎉 OFFSEASON COMPLETE - READY FOR SEASON 5!                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  OFFSEASON SUMMARY                                                          │
│  ═════════════════                                                          │
│                                                                             │
│  👴 RETIREMENTS: 8 players retired                                          │
│     • 3 jerseys retired (Musial #6, Snider #4, Wynn #24)                    │
│                                                                             │
│  🏛️ HALL OF FAME: 2 inducted                                               │
│     • Stan Musial, Duke Snider                                              │
│                                                                             │
│  💰 FREE AGENCY: 34 players changed teams                                   │
│     • Giants signed: Tony Conigliaro (RF), Tug McGraw (RP)                  │
│     • Giants lost: Jack Sanford (to Dodgers)                                │
│                                                                             │
│  ❌ CONTRACTION: Kansas City Athletics folded                               │
│                                                                             │
│  📋 DRAFT: 36 players selected                                              │
│     • Giants drafted: Gaylord Perry (SP), Joe Morgan (2B)                   │
│                                                                             │
│  📈 RATINGS CHANGES: 312 players adjusted                                   │
│     • Biggest gain: Lou Brock (+7)                                          │
│     • Biggest drop: Dick Stuart (-7)                                        │
│                                                                             │
│  SEASON 5 PREVIEW                                                           │
│  ────────────────                                                           │
│  Favorites: Giants, Dodgers, Cardinals                                      │
│  Sleepers: Reds (young core), Tigers (new manager)                          │
│  Rebuild Mode: Cubs, Mets, Senators                                         │
│                                                                             │
│              [View Full Report]        [🎮 START SEASON 5! →]               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Team MVP & Cornerstone Announcement

Shown as part of the early offseason flow (Phase 2-3 in the hub):

### Team MVP Announcement Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⭐ TEAM MVP & CORNERSTONE DESIGNATIONS - Season 4                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Each team's best performer is recognized as Team MVP and designated        │
│  as the team's Cornerstone - the franchise foundation.                      │
│                                                                             │
│  🏆 YOUR TEAM: SAN FRANCISCO GIANTS                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │   ⭐ TEAM MVP: WILLIE MAYS ⭐                                          │  │
│  │                                                                        │  │
│  │   Season 4 Line: .342 / 52 HR / 128 RBI / 8.9 WAR / +12.5 Clutch      │  │
│  │                                                                        │  │
│  │   🏛️ CORNERSTONE STATUS: RETAINED (Season 2 - Present)                │  │
│  │   Legacy Status: FRANCHISE ICON (6+ seasons, 20+ WAR)                 │  │
│  │                                                                        │  │
│  │   🎯 Cornerstone Bonus: +10% less likely to leave in FA               │  │
│  │   📈 Fan Impact: Fans rally around the franchise player               │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  LEAGUE-WIDE TEAM MVPs                                                      │
│  ─────────────────────                                                      │
│  │ Team          │ Player           │ WAR  │ Cornerstone Since │           │
│  ├───────────────┼──────────────────┼──────┼───────────────────│           │
│  │ Giants        │ Willie Mays      │ 8.9  │ Season 2 (3rd yr) │           │
│  │ Dodgers       │ Sandy Koufax     │ 7.2  │ Season 3 (2nd yr) │           │
│  │ Cardinals     │ Bob Gibson       │ 6.8  │ Season 4 (NEW!)   │           │
│  │ Yankees       │ Mickey Mantle    │ 6.4  │ Season 1 (4th yr) │           │
│  │ Braves        │ Hank Aaron       │ 7.8  │ Season 1 (4th yr) │           │
│  │ Reds          │ Frank Robinson   │ 6.2  │ Season 2 (3rd yr) │           │
│  │ Pirates       │ Roberto Clemente │ 5.9  │ Season 3 (2nd yr) │           │
│  │ ...           │ ...              │ ...  │ ...               │           │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                             │
│  ⭐ NEW CORNERSTONES THIS SEASON: 3 (marked NEW!)                           │
│  🔄 CORNERSTONE CHANGES: 2 teams changed their cornerstone player           │
│                                                                             │
│                              [Continue →]                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cornerstone Change Alert (If Changed)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔄 CORNERSTONE CHANGE: ST. LOUIS CARDINALS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  OUT: Stan Musial (retired)                                                 │
│  IN:  Bob Gibson (Season 4 Team MVP - 6.8 WAR)                              │
│                                                                             │
│  "With the retirement of Stan the Man, the Cardinals look to                │
│   their ace Bob Gibson to carry the franchise forward."                     │
│                                                                             │
│  🏛️ Musial's Legacy:                                                        │
│  • Cornerstone Seasons 1-4                                                  │
│  • 3x League MVP, 7x All-Star as Cardinal                                   │
│  • Jersey #6 retired                                                        │
│  • Hall of Fame Class of Season 5                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Personality Change Notifications

Shown during Phase 3 of the offseason:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎭 PERSONALITY CHANGES - Season 4 Events                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Player personalities may shift based on season events.                     │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  ROGER MARIS                                                          │  │
│  │  Yankees | RF | Grade: B+                                             │  │
│  │                                                                        │  │
│  │  Personality Change: Humble → Egotistical                             │  │
│  │                                                                        │  │
│  │  TRIGGER: Won MVP Award                                               │  │
│  │  "After winning the MVP, Maris has become more confident...           │  │
│  │   perhaps too confident."                                              │  │
│  │                                                                        │  │
│  │  📋 FA IMPACT: Now 15% more likely to chase highest bidder            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  DICK STUART                                                          │  │
│  │  Red Sox | 1B | Grade: B-                                             │  │
│  │                                                                        │  │
│  │  Personality Change: Confident → Insecure                             │  │
│  │                                                                        │  │
│  │  TRIGGER: Won Bust of the Year                                        │  │
│  │  "A season of struggles has shaken Stuart's confidence."              │  │
│  │                                                                        │  │
│  │  📋 FA IMPACT: Now prefers stable situations over risky moves         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Total Personality Changes: 8 players                                       │
│  [View All Changes]                                                         │
│                                                                             │
│                              [Continue →]                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Playoffs Flow

```javascript
async function initializePlayoffs(playoffTeams) {
  // Playoff format is USER CONFIGURED in Season Setup
  const bracket = generatePlayoffBracket(playoffTeams, season.playoffConfig);

  // Display bracket
  displayPlayoffBracket(bracket);

  // Track playoff games separately
  season.playoffGames = [];
}

async function recordPlayoffGame(gameResult) {
  // Use same post-game flow but with playoff modifiers
  await postGameFlow(gameResult);

  // Additional playoff tracking
  updatePlayoffBracket(gameResult);

  // Check for series winner
  const seriesResult = checkSeriesResult(gameResult);
  if (seriesResult.seriesComplete) {
    await handleSeriesComplete(seriesResult);
  }

  // Check for championship
  if (seriesResult.isChampionship && seriesResult.seriesComplete) {
    await crownChampion(seriesResult.winner);
  }
}

async function crownChampion(team) {
  // Award World Series MVP
  const wsMVP = calculateWorldSeriesMVP(season.playoffGames);
  wsMVP.awards.push({ type: 'WORLD_SERIES_MVP', season: currentSeason });

  // Massive fan happiness boost
  updateFanHappiness(team, { event: 'CHAMPIONSHIP', amount: 25 });

  // Update dynasty tracking
  updateDynastyStatus(team);

  // Record memorable moment
  recordMoment('CHAMPIONSHIP', {
    team,
    mvp: wsMVP,
    season: currentSeason
  });

  logTransaction('CHAMPIONSHIP', { team: team.id, mvp: wsMVP.id });

  // Transition to offseason
  season.phase = 'OFFSEASON';
  await triggerOffseason();
}
```

---

## Playoffs Bracket & Series Display

### Playoff Bracket Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏆 SEASON 4 PLAYOFFS                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DIVISION SERIES                 LCS                    WORLD SERIES        │
│  ──────────────────────────────────────────────────────────────────         │
│                                                                             │
│  ┌─────────────┐                                                            │
│  │ (1) Giants  │─┐                                                          │
│  │ 3-1 ✓      │ │    ┌─────────────┐                                       │
│  └─────────────┘ ├───│ (1) Giants  │─┐                                      │
│  ┌─────────────┐ │    │ 4-2 ✓      │ │                                      │
│  │ (4) Reds    │─┘    └─────────────┘ │                                      │
│  │ 1-3        │                       │   ┌─────────────┐                   │
│  └─────────────┘                       ├──│ 🏆 GIANTS   │                   │
│                                        │   │ 4-3 ✓      │                   │
│  ┌─────────────┐                       │   └─────────────┘                   │
│  │ (2) Dodgers │─┐    ┌─────────────┐ │                                      │
│  │ 3-2 ✓      │ │    │ (3) Cards   │─┘                                      │
│  └─────────────┘ ├───│ 2-4        │                                         │
│  ┌─────────────┐ │    └─────────────┘                                        │
│  │ (3) Cards   │─┘                                                           │
│  │ 3-1 ✓      │                                                              │
│  └─────────────┘                                                             │
│                                                                             │
│  ──────────────────────────────────────────────────────────────────         │
│                                                                             │
│  CURRENT SERIES: WORLD SERIES GAME 7 - Giants vs Yankees                    │
│  Series: Tied 3-3 | WINNER TAKE ALL                                         │
│                                                                             │
│  [View Series Details]  [Start Game 7]  [View Playoff Stats]                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Series Detail View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏆 WORLD SERIES: GIANTS vs YANKEES                                         │
│  Series: Tied 3-3                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GAME-BY-GAME RESULTS                                                       │
│  ─────────────────────                                                      │
│  Game 1: Giants 5 - Yankees 3      @ Oracle Park          Giants lead 1-0  │
│  Game 2: Giants 2 - Yankees 7      @ Oracle Park          Series tied 1-1  │
│  Game 3: Giants 4 - Yankees 2      @ Yankee Stadium       Giants lead 2-1  │
│  Game 4: Giants 3 - Yankees 8      @ Yankee Stadium       Series tied 2-2  │
│  Game 5: Giants 6 - Yankees 4      @ Yankee Stadium       Giants lead 3-2  │
│  Game 6: Giants 2 - Yankees 5      @ Oracle Park          Series tied 3-3  │
│  Game 7: TBD                       @ Oracle Park          TONIGHT!          │
│                                                                             │
│  SERIES LEADERS                                                             │
│  ─────────────────                                                          │
│  BATTING                              PITCHING                              │
│  Mays (SF): .385, 2 HR, 6 RBI        Koufax (SF): 2-0, 1.89 ERA             │
│  Mantle (NYY): .346, 3 HR, 5 RBI     Ford (NYY): 1-1, 2.45 ERA              │
│                                                                             │
│  CLUTCH LEADERS                       CHOKE LEADERS                         │
│  Mays (SF): +4.2                      Stuart (SF): -2.1                     │
│  Cepeda (SF): +3.1                    Tresh (NYY): -1.8                     │
│                                                                             │
│  🎯 PLAYOFF CLUTCH MULTIPLIER: 2.0x (World Series)                          │
│  ⚠️ ELIMINATION GAME: Additional +0.5x                                      │
│                                                                             │
│  [Back to Bracket]  [View Full Stats]  [Start Game 7]                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Championship Celebration UI

### Championship Victory Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆│
│                                                                             │
│                    🎉 WORLD SERIES CHAMPIONS! 🎉                            │
│                                                                             │
│                      SAN FRANCISCO GIANTS                                   │
│                                                                             │
│                    Season 4 Champions                                       │
│                    Defeated Yankees 4-3                                     │
│                                                                             │
│  🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆│
│                                                                             │
│                                                                             │
│  ⭐ WORLD SERIES MVP ⭐                                                      │
│                                                                             │
│                      WILLIE MAYS                                            │
│                                                                             │
│  World Series Line: .385 / 3 HR / 8 RBI / +6.2 Clutch                      │
│  Including: Walk-off HR in Game 7!                                          │
│                                                                             │
│  ⚡ REWARDS:                                                                │
│  • +3.0 Fame (World Series MVP)                                             │
│  • +25 Fan Happiness (Championship!)                                        │
│  • Moment recorded to Museum                                                │
│                                                                             │
│                         [Celebrate! 🎊]                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Championship Detail Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏆 SEASON 4 CHAMPIONSHIP - SAN FRANCISCO GIANTS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CHAMPIONSHIP HIGHLIGHTS                                                    │
│  ───────────────────────                                                    │
│                                                                             │
│  🎆 CLINCHING MOMENT                                                        │
│  Game 7, Bottom 9th, 2 outs, down by 1...                                   │
│  Willie Mays launches a 2-run walk-off HR to right-center!                  │
│  Giants win 5-4! The city goes WILD!                                        │
│                                                                             │
│  📊 PLAYOFF RUN SUMMARY                                                     │
│  ─────────────────────                                                      │
│  Division Series: DEF Reds (3-1)                                            │
│  NLCS: DEF Cardinals (4-2)                                                  │
│  World Series: DEF Yankees (4-3)                                            │
│  Playoff Record: 11-6                                                       │
│                                                                             │
│  🌟 PLAYOFF HEROES                                                          │
│  ─────────────────                                                          │
│  • Willie Mays: .356 / 5 HR / 14 RBI / +9.8 Clutch                          │
│  • Juan Marichal: 3-0, 1.45 ERA                                             │
│  • Orlando Cepeda: .312 / 3 HR / 9 RBI                                      │
│                                                                             │
│  🏛️ DYNASTY STATUS                                                          │
│  ─────────────────                                                          │
│  Championships: 2 (Seasons 2, 4)                                            │
│  Status: EMERGING DYNASTY (2 titles in 3 years)                             │
│  Next milestone: 3 titles in 5 years = DYNASTY                              │
│                                                                             │
│  📜 CHAMPIONSHIP ADDED TO:                                                  │
│  • Museum → Championship History                                            │
│  • Giants → Franchise History                                               │
│  • Mays → Memorable Moments (Walk-off WS HR)                                │
│                                                                             │
│  [View Full Playoff Stats]  [Continue to Offseason →]                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Offseason Flow

```javascript
async function triggerOffseason() {
  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: END-OF-SEASON RATINGS ADJUSTMENTS
  // ═══════════════════════════════════════════════════════════════

  for (const player of getAllPlayers()) {
    const adjustment = calculateEOSAdjustment(player);
    await applyEOSAdjustment(player, adjustment);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: TEAM MVP & CORNERSTONE DESIGNATION
  // ═══════════════════════════════════════════════════════════════

  for (const team of getAllTeams()) {
    const teamMVP = calculateTeamMVP(team);
    teamMVP.isCornerstone = true;
    teamMVP.cornerstoneSince = teamMVP.cornerstoneSince || currentSeason;
    team.cornerstone = teamMVP.id;

    logTransaction('TEAM_MVP', { team: team.id, player: teamMVP.id });
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 3: PERSONALITY CHANGES
  // ═══════════════════════════════════════════════════════════════

  for (const player of getAllPlayers()) {
    const seasonEvents = getSeasonEvents(player);
    maybeChangePersonality(player, seasonEvents);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 4: RETIREMENTS
  // ═══════════════════════════════════════════════════════════════

  const retirements = [];
  for (const player of getAllPlayers()) {
    const retirementChance = calculateRetirementProbability(player);

    // Droopy personality = 90% retirement chance (per user decision)
    if (player.personality === 'DROOPY') {
      retirementChance = 0.90;
    }

    if (Math.random() < retirementChance) {
      retirements.push(player);
      await handleRetirement(player);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 5: HALL OF FAME
  // ═══════════════════════════════════════════════════════════════

  for (const player of retirements) {
    if (isHOFEligible(player)) {
      await inductToHallOfFame(player);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 6: FREE AGENCY
  // ═══════════════════════════════════════════════════════════════

  await conductFreeAgency();

  // ═══════════════════════════════════════════════════════════════
  // PHASE 7: CONTRACTION CHECK
  // ═══════════════════════════════════════════════════════════════

  for (const team of getAllTeams()) {
    if (team.fanHappiness < 30) {
      const contractionRoll = Math.random();
      const contractionThreshold = getContractionProbability(team.fanHappiness);

      if (contractionRoll < contractionThreshold) {
        await contractTeam(team);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 8: DRAFT
  // ═══════════════════════════════════════════════════════════════

  await conductDraft();

  // ═══════════════════════════════════════════════════════════════
  // PHASE 9: ARCHIVE & PREPARE NEW SEASON
  // ═══════════════════════════════════════════════════════════════

  archiveSeasonData(currentSeason);
  prepareNewSeason();
}
```

---

## Contraction Warning System

```javascript
function checkContractionWarning(team) {
  if (team.fanHappiness < 30 && !team.contractionWarningShown) {
    showWarning({
      title: "⚠️ FRANCHISE IN DANGER",
      message: `${team.name} fan happiness is critically low (${team.fanHappiness}).`,
      subtext: "If happiness remains below 30 at end of season, the team may be contracted.",
      severity: team.fanHappiness < 15 ? 'CRITICAL' : 'WARNING'
    });

    team.contractionWarningShown = true;
    logTransaction('CONTRACTION_WARNING', { team: team.id, happiness: team.fanHappiness });
  }

  // Reset warning flag if happiness recovers
  if (team.fanHappiness >= 30) {
    team.contractionWarningShown = false;
  }
}

function getContractionProbability(happiness) {
  if (happiness >= 30) return 0;
  if (happiness >= 15) return 0.25;  // 25% chance
  return 0.50;  // 50% chance if < 15
}
```

---

## Trade Execution Flow

```javascript
async function executeTrade(trade) {
  const { team1, team2, playersFromTeam1, playersFromTeam2, cash } = trade;

  // 1. Validate trade window is open
  if (!isTradeWindowOpen()) {
    throw new Error("Trade window is closed");
  }

  // 2. Update player teams and formerTeams arrays
  for (const player of playersFromTeam1) {
    // Add current team to formerTeams (per user decision: on ANY team change)
    player.formerTeams = player.formerTeams || [];
    player.formerTeams.push({
      teamId: team1.id,
      departedSeason: currentSeason,
      departedGame: currentGameNumber
    });

    // Execute stat split
    executeTradeStatSplit(player, team1.id, team2.id, currentGameNumber);

    // Update current team
    player.currentTeam = team2;
    player.seasonsWithTeam = 0;
  }

  // (Same for playersFromTeam2 going to team1)
  for (const player of playersFromTeam2) {
    player.formerTeams = player.formerTeams || [];
    player.formerTeams.push({
      teamId: team2.id,
      departedSeason: currentSeason,
      departedGame: currentGameNumber
    });

    executeTradeStatSplit(player, team2.id, team1.id, currentGameNumber);
    player.currentTeam = team1;
    player.seasonsWithTeam = 0;
  }

  // 3. Update team rosters
  updateTeamRoster(team1, playersFromTeam2, playersFromTeam1);
  updateTeamRoster(team2, playersFromTeam1, playersFromTeam2);

  // 4. Handle cash exchange
  if (cash) {
    team1.cash += cash.toTeam1 || 0;
    team2.cash += cash.toTeam2 || 0;
  }

  // 5. Calculate fan happiness impact
  for (const player of playersFromTeam1) {
    updateFanHappiness(team1, { event: 'PLAYER_TRADED_AWAY', player });
    updateFanHappiness(team2, { event: 'PLAYER_ACQUIRED', player });
  }
  for (const player of playersFromTeam2) {
    updateFanHappiness(team2, { event: 'PLAYER_TRADED_AWAY', player });
    updateFanHappiness(team1, { event: 'PLAYER_ACQUIRED', player });
  }

  // 6. Activate revenge game storylines
  for (const player of [...playersFromTeam1, ...playersFromTeam2]) {
    activateRevengeGameStoryline(player);
  }

  // 7. Generate trade headline
  const headline = generateTradeHeadline(trade);

  // 8. Log transaction
  logTransaction('TRADE_EXECUTED', {
    team1: team1.id,
    team2: team2.id,
    playersFromTeam1: playersFromTeam1.map(p => p.id),
    playersFromTeam2: playersFromTeam2.map(p => p.id),
    cash
  });

  return { success: true, headline };
}
```

---

# 1. Overview

## Purpose

The KBL XHD Tracker is a comprehensive stat-tracking application for Super Mega Baseball 4 couch co-op franchise play. It tracks advanced statistics, calculates WAR, manages awards, handles end-of-season ratings adjustments, and provides a rich narrative layer through Fame, Salary economics, and Random Events.

## Key Features

- Complete stat tracking for all players and teams
- WAR calculations (bWAR, pWAR, fWAR, rWAR, mWAR)
- Clutch/Choke performance tracking
- Fame Bonus/Boner narrative system
- **Salary system with ROI tracking**
- All-Star voting at 60% of season
- Comprehensive awards with trait rewards
- End-of-season ratings adjustments based on WAR
- Random event system (auto-triggered throughout season)
- **Complete offseason system** (Retirements, Free Agency, Draft)
- **Hall of Fame and Retired Numbers**
- Multi-season franchise support
- iPad/touch optimized with laptop/desktop support
- Undo and Reset features with safeguards

## Platform Support

| Device | Experience |
|--------|------------|
| **iPad/Tablet** | Primary - Touch-optimized, large buttons, swipe gestures |
| **Laptop/Desktop** | Full support - Keyboard shortcuts, hover states, mouse |
| **Phone** | Limited - Quick stat entry only |

---

# 2. Season Setup

## Season Setup Wizard (5 Steps)

### Step 1: League Configuration

```
+---------------------------------------------------------------------------+
|  NEW SEASON SETUP                                             Step 1 of 5  |
+---------------------------------------------------------------------------+
|  Season Name: [KBL Season 3                                           ]    |
|  Games Per Team: [40] v    (Options: 24, 32, 40, 48, 56, 81, 100, 162)    |
|  Innings Per Game: [9] v                                                   |
|  DH Rule: [O NL (no DH)  * AL (with DH)  O Universal DH]                  |
|  Conference Structure: [* Single  O Two Conferences  O Divisions]         |
|  Playoff Teams: [4] v                                                      |
|  Playoff Series Length: [Best of 5] v                                      |
+---------------------------------------------------------------------------+
```

**Game Count Options:** 24, 32, 40, 48, 56, 81, 100, 162

### Step 2: Team Selection

- Select teams from master database (toggle on/off)
- Option to create new teams
- Teams not selected remain in database for future seasons

### Step 3: Roster Configuration

- **Option A**: Use existing rosters (teams keep current players)
- **Option B**: Conduct Fantasy Draft (snake draft from player pool)
- **Option C**: Partial (mix of existing + draft)
- Player pool management (all players in database, toggle active/inactive)

### Step 4: Schedule Generation

- Auto-generate balanced schedule
- Import from CSV
- Manual entry
- Preview and edit

### Step 5: Confirmation & Start

- Summary of all settings
- Random events auto-scheduled (20 hidden events)
- All-Star break set at 60% of games
- **Pre-season WAR expectations calculated and locked**
- **Pre-season salaries calculated**
- Archive previous season data
- Start season

## Scalable Thresholds

All position detection thresholds scale based on **Games Per Team** setting:

```javascript
function scaleThreshold(mlbThreshold, gamesPerTeam, mlbGames = 162) {
  return Math.round(mlbThreshold * (gamesPerTeam / mlbGames));
}
```

| Threshold | MLB (162) | 40 Games | 82 Games |
|-----------|-----------|----------|----------|
| SP Min Starts | 20 | 5 | 10 |
| SP/RP Min Starts | 10 | 2 | 5 |
| RP Min Relief Apps | 40 | 10 | 20 |
| CP Min Saves | 20 | 5 | 10 |
| UTIL Games/Position | 25 | 6 | 13 |
| TWO-WAY Min Pitch Games | 20 | 5 | 10 |
| TWO-WAY Min PA | 200 | 49 | 101 |

---

# 3. Team Management

## Team Page Features

Each team has a dedicated management page with tabs:

### ROSTER Tab

| Column | Description |
|--------|-------------|
| Position | Current defensive position |
| Player | Name |
| Grade | Current SMB grade (S through D) |
| **Salary** | Current salary in millions |
| Mojo | -3 to +3 (affects in-game performance) |
| Fitness | Categorical (Hurt/Weak/Strained/Well/Fit/Juiced) |
| Actions | Edit button |

### STADIUM Tab

Comprehensive stadium tracking with spray charts and park factors.

**Stadium Data Structure:**

```javascript
const stadiumData = {
  id: 'stadium-001',
  name: 'Oracle Park',

  dimensions: {
    leftField: { distance: 339, wallHeight: 'High' },
    leftCenter: { distance: 364, wallHeight: 'Med' },
    center: { distance: 399, wallHeight: 'Med' },
    rightCenter: { distance: 365, wallHeight: 'Med' },
    rightField: { distance: 309, wallHeight: 'High' },
    foulTerritory: 'Large'
  },

  parkFactors: {
    overall: 0.92,
    runs: 0.90,
    homeRuns: 0.85,
    hits: 0.97,
    doubles: 1.02,
    triples: 1.15,
    strikeouts: 1.03,
    walks: 0.98,
    leftHandedHR: 0.78,
    rightHandedHR: 0.92,
  },

  stats: {
    gamesPlayed: 45,
    batting: { avg: 0.258, obp: 0.325, slg: 0.410, homeRunsPerGame: 1.49 },
    pitching: { era: 3.45, whip: 1.21, k9: 8.5 },
    hitDistribution: { /* spray chart data */ }
  },

  notableMoments: [],

  // Stadium Records
  records: {
    // Home Run Count Record (most HRs hit at this stadium in a single game)
    singleGameHRs: {
      record: 7,
      date: 'May 15, S3',
      teams: ['Giants', 'Dodgers'],
      details: 'Giants 12, Dodgers 9'
    },

    // HR Distance Records by Direction
    hrDistance: {
      left: {
        distance: 472,
        playerId: 'willie-mays',
        playerName: 'Willie Mays',
        team: 'Giants',
        date: 'June 12, S2',
        offPitcher: 'Sandy Koufax',
        situation: '2-run HR in 7th'
      },
      leftCenter: {
        distance: 448,
        playerId: 'aaron-judge',
        playerName: 'Aaron Judge',
        team: 'Yankees',
        date: 'Sept 5, S3',
        offPitcher: 'Mike Simmons',
        situation: 'Solo shot'
      },
      center: {
        distance: 485,
        playerId: 'giancarlo-stanton',
        playerName: 'Giancarlo Stanton',
        team: 'Yankees',
        date: 'July 22, S2',
        offPitcher: 'Carlos Rodon',
        situation: 'Grand slam'
      },
      rightCenter: {
        distance: 441,
        playerId: 'kyle-schwarber',
        playerName: 'Kyle Schwarber',
        team: 'Phillies',
        date: 'Aug 18, S3',
        offPitcher: 'Kevin Gausman',
        situation: '3-run HR'
      },
      right: {
        distance: 425,
        playerId: 'mike-trout',
        playerName: 'Mike Trout',
        team: 'Angels',
        date: 'April 4, S1',
        offPitcher: 'Logan Webb',
        situation: 'Opening Day HR'
      },

      // Overall stadium distance record
      overall: {
        distance: 485,
        direction: 'Center',
        playerId: 'giancarlo-stanton',
        playerName: 'Giancarlo Stanton',
        team: 'Yankees',
        date: 'July 22, S2',
        offPitcher: 'Carlos Rodon',
        situation: 'Grand slam'
      }
    },

    // Total HRs hit at stadium (historical)
    totalHRs: {
      count: 127,
      topHitters: [
        { playerId: 'willie-mays', name: 'Willie Mays', count: 23 },
        { playerId: 'buster-posey', name: 'Buster Posey', count: 18 },
        { playerId: 'brandon-crawford', name: 'Brandon Crawford', count: 15 }
      ]
    }
  }
};
```

### MANAGER Tab

- View manager stats (mWAR, record, grade)
- Fire Manager option -> triggers replacement flow
- Manager of the Year tracking

### STATS Tab

- Team batting/pitching stats
- Advanced metrics
- **Salary totals and ROI metrics**
- Standings comparison

### HISTORY Tab

- Season-by-season team records
- Historical rosters
- Championship banners
- **Retired Numbers**
- **Hall of Fame inductees from this team**

## Fitness System (Categorical)

| State | Value | Effect |
|-------|-------|--------|
| **Hurt** | 0% | Cannot play, on IL |
| **Weak** | 20% | Significant penalties |
| **Strained** | 40% | Moderate penalties |
| **Well** | 80% | Minor penalties |
| **Fit** | 100% | Normal performance |
| **Juiced** | 120% | Performance boost |

---

# 4. In-Game Tracking

## Trackable Events

### Batting Events
- Hits (1B, 2B, 3B, HR)
- HR Distance
- RBIs, Runs, Walks, Strikeouts
- Stolen Bases, Caught Stealing
- Errors
- GIDP (Grounded Into Double Play)
- TOOTBLAN (Thrown Out On The Basepaths Like A Nincompoop)

### Pitching Events
- Innings Pitched
- Strikeouts, Walks, Hits Allowed
- Runs/Earned Runs
- Pitch Count (NP)
- Total Batters Faced (TBF)

### Special Events
- Walk-offs (+Fame, +Clutch)
- Clutch Plays / Chokes
- Star Plays
- Killed Pitchers
- Robbed HRs
- Errors in key situations
- Hit By Pitch
- Wild Pitches
- Passed Balls
- Pickoffs
- Caught Come-Backers
- Nut Shots

### Player of the Game (POG)

App-calculated, **contributes to Fame/Narrative for voting**.

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

**POG Fame Integration:**

| POG Achievement | Fame Bonus |
|-----------------|------------|
| 5+ 1st place POG finishes | +1 |
| 10+ 1st place POG finishes | +2 (total, not additional) |
| 20+ total top-3 POG finishes | +1 |
| Season POG Leader | +2 |

---

## In-Game Tracker UI & User Experience

### Design Philosophy

The in-game tracker is designed for **speed and minimal cognitive load** while playing the actual game. Target: **~10 minutes of data entry per game**.

**Core Principles:**
1. **Smart Inference** - App tracks game state and auto-detects situational context
2. **Minimal Taps** - Most at-bats require only 2-3 taps
3. **Auto-Advance** - Lineup automatically advances; outs auto-flip innings
4. **Real-Time Feedback** - Clutch/choke/fame events shown as they're logged
5. **Forgiving** - Undo last 10 actions; score override available

### Time Budget Per Game

| Activity | Time | Details |
|----------|------|---------|
| At-bats | ~6-7 min | 70-80 at-bats × 5 seconds each |
| Pitch counts | ~3 min | 18 half-innings × 10 seconds |
| Substitutions | ~1-2 min | 5-10 subs × 15 seconds each |
| **Total** | **~10-12 min** | Target achieved |

---

## Game State Tracking (Auto-Managed)

The app maintains complete game state, updated after each user action:

```javascript
const GameState = {
  // Game Identity
  gameId: 'game-47',
  gameNumber: 47,
  season: 4,
  isPlayoff: false,
  playoffSeries: null,  // { round: 'NLCS', gameInSeries: 3, teamAWins: 1, teamBWins: 1 }

  // Teams
  awayTeam: { id: 'yankees', name: 'Yankees', manager: 'Boone' },
  homeTeam: { id: 'giants', name: 'Giants', manager: 'Kapler' },

  // Score (auto-calculated from runs scored)
  score: { away: 3, home: 4 },
  scoreByInning: {
    away: [0, 1, 0, 0, 2, 0, 0, null, null],
    home: [0, 0, 2, 0, 0, 1, 1, null, null]
  },

  // Current Situation (auto-updated)
  inning: 7,
  halfInning: 'TOP',  // 'TOP' or 'BOTTOM'
  outs: 1,

  // Runners (auto-tracked from advancement)
  runners: {
    first: { playerId: 'rizzo', name: 'Rizzo', inheritedFrom: null },
    second: { playerId: 'torres', name: 'Torres', inheritedFrom: 'simmons' },
    third: null
  },

  // Lineups (set at game start, updated on substitutions)
  awayLineup: [
    { order: 1, playerId: 'judge', position: 'RF', enteredGame: 1 },
    { order: 2, playerId: 'stanton', position: 'DH', enteredGame: 1 },
    // ... 9 batters
  ],
  homeLineup: [/* same structure */],

  // Current Batting Order Position
  awayBattingOrder: 4,  // Judge(1), Stanton(2), Rizzo(3), now Torres(4) due up
  homeBattingOrder: 7,

  // Pitchers
  awayPitcher: {
    playerId: 'cole',
    pitchCount: 72,
    pitchCountByInning: [14, 18, 12, 21, 7],
    stats: { ip: 4.1, h: 6, r: 3, er: 3, k: 5, bb: 2 }
  },
  homePitcher: {
    playerId: 'simmons',
    pitchCount: 65,
    pitchCountByInning: [14, 18, 12, 21],
    stats: { ip: 4.0, h: 5, r: 3, er: 2, k: 4, bb: 1 },
    inheritedRunners: 0,
    inheritedRunnersScored: 0
  },

  // Derived Situational Flags (auto-calculated)
  situationalContext: {
    isCloseGame: true,           // Within 2 runs
    isClutchSituation: true,     // Close game + RISP or late inning
    isRISP: true,                // Runners in scoring position
    isBasesLoaded: false,
    scoreDifferential: -1,       // Negative = batting team trailing
    isLateInning: true,          // 7th inning or later
    isTieGame: false,
    isWalkOffOpportunity: false, // Bottom 9+ with game tied or trailing by < runners on base + 1
    isGoAheadOpportunity: true,  // Hit could take the lead
    isSaveOpportunity: false,    // Closer situation
  },

  // Activity Log (displayed in UI as broadcast-style narrative, supports undo)
  activityLog: [
    {
      id: 'act-1',
      timestamp: '...',
      inning: 5,
      halfInning: 'TOP',
      outs: 1,
      type: 'AT_BAT',
      playerId: 'aaron-judge',
      playerName: 'Aaron Judge',
      team: 'Yankees',
      narrative: {
        headline: 'JUDGE GOES DEEP!',
        call: 'High drive to left-center... that ball is CRUSHED! 427 feet, 3-run shot.',
        context: 'Yankees lead 6-4.',
        color: 'Judge now 2 away from 500 career home runs.'
      },
      stats: { result: 'HR', distance: 427, direction: 'Left-Center', rbi: 3 },
      annotations: [
        { type: 'CLUTCH', value: 1.5, reason: 'Go-Ahead HR in 7th+' },
        { type: 'FAME', value: 1.0, reason: 'Home Run' }
      ],
      undone: false
    },
    // ... last 10 shown in compact form, tap for full narrative
  ],

  // Undo Stack (last 10 actions)
  undoStack: [/* full state snapshots for reverting */]
};
```

### Situational Context Auto-Detection

```javascript
function updateSituationalContext(state) {
  const { score, inning, halfInning, outs, runners } = state;

  const scoreDiff = halfInning === 'TOP'
    ? score.away - score.home
    : score.home - score.away;

  const runnersOnBase = [runners.first, runners.second, runners.third].filter(r => r !== null).length;
  const isRISP = runners.second !== null || runners.third !== null;
  const isBasesLoaded = runners.first && runners.second && runners.third;

  return {
    isCloseGame: Math.abs(scoreDiff) <= 2,
    scoreDifferential: scoreDiff,
    isRISP,
    isBasesLoaded,
    isLateInning: inning >= 7,
    isTieGame: scoreDiff === 0,

    // Clutch = close game AND (RISP OR late inning OR save situation)
    isClutchSituation: Math.abs(scoreDiff) <= 2 && (isRISP || inning >= 7),

    // Walk-off opportunity: bottom 9+, tied or trailing by less than potential runs
    isWalkOffOpportunity: halfInning === 'BOTTOM' && inning >= 9 &&
      (scoreDiff <= 0 || scoreDiff <= runnersOnBase + 1),

    // Go-ahead opportunity: any hit could take the lead
    isGoAheadOpportunity: scoreDiff <= 0 && scoreDiff > -(runnersOnBase + 1),

    // Save opportunity for pitcher
    isSaveOpportunity: halfInning === 'TOP' && inning >= 9 &&
      scoreDiff >= 1 && scoreDiff <= 3
  };
}
```

---

## Pre-Game Setup Screen

```
┌─────────────────────────────────────────────────────────────────┐
│  GAME 47: Yankees @ Giants | Oracle Park                        │
│  PRE-GAME SETUP                                    June 18th    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AWAY: YANKEES                    HOME: GIANTS                  │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐
│  │ 1. [Judge ▼]        RF     │  │ 1. [Yastrzemski ▼]   RF    │
│  │ 2. [Stanton ▼]      DH     │  │ 2. [Pederson ▼]      LF    │
│  │ 3. [Rizzo ▼]        1B     │  │ 3. [Flores ▼]        1B    │
│  │ 4. [Torres ▼]       2B     │  │ 4. [Conforto ▼]      DH    │
│  │ 5. [Volpe ▼]        SS     │  │ 5. [Estrada ▼]       2B    │
│  │ 6. [Cabrera ▼]      3B     │  │ 6. [Crawford ▼]      SS    │
│  │ 7. [Hicks ▼]        CF     │  │ 7. [Longoria ▼]      3B    │
│  │ 8. [Trevino ▼]      C      │  │ 8. [Bart ▼]          C     │
│  │ 9. [Kiner-Falefa ▼] LF     │  │ 9. [Slater ▼]        CF    │
│  └─────────────────────────────┘  └─────────────────────────────┘
│                                                                 │
│  STARTING PITCHERS                                              │
│  Away: [Cole ▼]                   Home: [Simmons ▼]             │
│                                                                 │
│  GAME SETTINGS:                                                 │
│  ☐ Day Game  ☑ Night Game                                       │
│                                                                 │
│  📰 TODAY'S STORYLINES:                                         │
│  • 🔥 Judge faces former rival Simmons (career .412 vs him)     │
│  • 🎯 Mays 2 HR away from 500 career                            │
│  • ⚔️ RIVALRY GAME - Giants vs Yankees (1.5x intensity)         │
│                                                                 │
│                    [Start Game]                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Main In-Game Tracker Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GAME 47: Yankees @ Giants                              [Box Score] [Menu]  │
│  Top 5th | 1 Out | NYY 3 - SF 4                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────────────────────────┐ │
│  │    DIAMOND      │    │  CURRENT AT-BAT                                 │ │
│  │                 │    │                                                 │ │
│  │       [2B]      │    │  Batter: Aaron Judge 🏆MVP (1-2, HR)  ← Auto    │ │
│  │      ● Torres   │    │  Pitcher: Mike Simmons (62 pitches)   ← Auto    │ │
│  │                 │    │                                                 │ │
│  │  [3B]     [1B]  │    │  Situation: RISP, 1 Out, Down 1       ← Auto    │ │
│  │   ○        ●    │    │  ⚠️ CLUTCH SITUATION                            │ │
│  │          Rizzo  │    │                                                 │ │
│  │                 │    │  RESULT:                                        │ │
│  │      [HOME]     │    │  ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐    │ │
│  └─────────────────┘    │  │ 1B ││ 2B ││ 3B ││ HR ││ BB ││IBB ││ K  │    │ │
│                         │  └────┘└────┘└────┘└────┘└────┘└────┘└────┘    │ │
│  DUE UP:                │  ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐    │ │
│  5. Volpe               │  │ KL ││ GO ││ FO ││ LO ││ PO ││ DP ││ SF │    │ │
│  6. Cabrera             │  └────┘└────┘└────┘└────┘└────┘└────┘└────┘    │ │
│  7. Hicks               │  ┌────┐┌────┐┌────┐┌────┐┌────┐                │ │
│                         │  │SAC ││HBP ││ E  ││ FC ││D3K │                │ │
│                         │  └────┘└────┘└────┘└────┘└────┘                │ │
│                         └─────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ [Pitching Change] [Pinch Hitter] [Pinch Runner] [Def Sub] [Steal]      │ │
│  │ [Wild Pitch] [Passed Ball] [Pickoff] [Balk] [⭐ Special Events ▼]      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 📻 ACTIVITY LOG (tap to undo)                           [Full View]   │ │
│  │ ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │ │ JUDGE GOES DEEP! 💥                                              │  │ │
│  │ │ 427 ft to left-center, 3-run shot. Yankees lead 6-4.             │  │ │
│  │ │ ⚡ +1.5 Clutch (Go-Ahead) 🌟 +1 Fame                             │  │ │
│  │ ├──────────────────────────────────────────────────────────────────┤  │ │
│  │ │ Torres doubles down the line! Rizzo to third.                    │  │ │
│  │ │ ⚡ +0.5 Clutch (RBI Double in close game)                        │  │ │
│  │ ├──────────────────────────────────────────────────────────────────┤  │ │
│  │ │ Rizzo strikes out looking. 😰 -1.0 Choke (K with RISP)           │  │ │
│  │ └──────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Diamond shows runners with names
- Batter/Pitcher auto-populated from lineup order
- Situation auto-detected and displayed
- "CLUTCH SITUATION" badge when applicable
- Due Up shows next 3 batters
- Activity Log in broadcast-booth style narrative with clutch/choke/fame tags
- [Full View] expands to complete play-by-play narrative
- Tap activity log entry to undo
- Smart defaults for fielder inference (override with one tap)
- Optional 7+ Pitch At-Bat tracking for plate discipline
- [⭐ Special Events] dropdown for: Robbed HR, Star Play, Killed Pitcher, Nut Shot, TOOTBLAN, Balk

**Special Events Dropdown Menu:**
```
┌─────────────────────────────────┐
│ ⭐ SPECIAL EVENTS               │
├─────────────────────────────────┤
│ 🧤 Robbed Home Run              │
│ ⭐ Star Play (Defensive Gem)    │
│ 💥 Killed Pitcher (Come-Backer) │
│ 🎯 Caught Come-Backer           │
│ 🤦 TOOTBLAN                     │
│ 😵 Nut Shot                     │
│ ⚠️ Balk                         │
│ 🎯 Runner Thrown Out            │
└─────────────────────────────────┘
```

---

## Result Entry Flows

### Smart Defaults and Fielder Auto-Inference

The app uses smart defaults to minimize data entry while preserving spray chart accuracy. Users can always override with a single tap.

**Spray Chart Data Collection:**

All balls in play capture:
- **Direction:** Left, Left-Center, Center, Right-Center, Right (5 options)
- **Exit Type:** Ground, Line Drive, Fly Ball, Pop Up

For Home Runs only:
- **Distance:** Numeric input (feet)

Zone (pull/center/opposite) is auto-calculated from direction + batter handedness - no extra input needed.

**Fielder Auto-Inference Rules:**

```javascript
function inferFielderFromHitTypeAndDirection(hitType, direction) {
  const inferenceMap = {
    // Fly Outs - Outfielders
    'FO': {
      'Left': 'LF',
      'Left-Center': 'LF',      // LF has priority in gap
      'Center': 'CF',
      'Right-Center': 'RF',     // RF has priority in gap
      'Right': 'RF'
    },
    // Line Outs - Outfielders (same as FO)
    'LO': {
      'Left': 'LF',
      'Left-Center': 'CF',      // CF has priority on liners
      'Center': 'CF',
      'Right-Center': 'CF',     // CF has priority on liners
      'Right': 'RF'
    },
    // Pop Outs - Infielders primarily
    'PO': {
      'Left': '3B',
      'Left-Center': 'SS',
      'Center': '2B',           // Or pitcher
      'Right-Center': '2B',
      'Right': '1B'
    },
    // Ground Outs - Infielders
    'GO': {
      'Left': '3B',
      'Left-Center': 'SS',
      'Center': 'P',            // Comebacker or up the middle
      'Right-Center': '2B',
      'Right': '1B'
    }
  };

  return inferenceMap[hitType]?.[direction] || null;
}

// For hits, inference is for spray chart only (no fielder credited)
function inferZoneFromHitAndDirection(hitType, direction, battersHand) {
  // Pull = opposite of batter's side
  // Opposite = same as batter's side
  if (battersHand === 'R') {
    if (direction === 'Left' || direction === 'Left-Center') return 'PULL';
    if (direction === 'Right' || direction === 'Right-Center') return 'OPPOSITE';
    return 'CENTER';
  } else {
    if (direction === 'Right' || direction === 'Right-Center') return 'PULL';
    if (direction === 'Left' || direction === 'Left-Center') return 'OPPOSITE';
    return 'CENTER';
  }
}
```

**UI Display for Auto-Inference:**

```
┌─────────────────────────────────────────────────────────────────┐
│  FIELDED BY: (auto-inferred, tap to change)                     │
│  ┌───────────────────────────────────────────────────┐          │
│  │  🎯 Crawford - SS  (inferred from GO to Left-Ctr) │ [Change] │
│  └───────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

When [Change] is tapped:
```
┌─────────────────────────────────────────────────────────────────┐
│  SELECT FIELDER:                                                │
│  ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐        │
│  │ P  ││ C  ││ 1B ││ 2B ││ 3B ││ SS ││ LF ││ CF ││ RF │        │
│  └────┘└────┘└────┘└────┘└────┘└────┘└────┘└────┘└────┘        │
│                                                                 │
│  Current: Crawford (SS) → [Select New]                          │
└─────────────────────────────────────────────────────────────────┘
```

**Note:** Fielder is REQUIRED to be specified on all outs where the runner doesn't reach base (GO, FO, LO, PO). The auto-inference provides a default, but the user must confirm or change.

---

### 7+ Pitch At-Bat Tracking

Optional tracking for marathon at-bats. A "7+ Pitch AB" toggle appears when entering any at-bat result:

```
┌─────────────────────────────────────────────────────────────────┐
│  7+ PITCH AT-BAT? ☐                                             │
│  (Check if batter saw 7 or more pitches this at-bat)            │
│                                                                 │
│  ⚡ If checked: +0.25 Clutch bonus for working the count        │
│                +0.05 bWAR for plate discipline                  │
└─────────────────────────────────────────────────────────────────┘
```

This maintains quick entry while capturing plate discipline without requiring full pitch-by-pitch tracking.

---

### After Selecting Ball In Play (1B, 2B, 3B, GO, FO, LO)

```
┌─────────────────────────────────────────────────────────────────┐
│  RESULT: Double (2B)                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DIRECTION:                                                     │
│  ┌───────┐ ┌─────────────┐ ┌────────┐ ┌──────────────┐ ┌─────┐  │
│  │ Left  │ │ Left-Center │ │ Center │ │ Right-Center │ │Right│  │
│  └───────┘ └─────────────┘ └────────┘ └──────────────┘ └─────┘  │
│                                                                 │
│  EXIT TYPE:                                                     │
│  ┌────────┐ ┌────────────┐ ┌──────────┐ ┌────────┐              │
│  │ Ground │ │ Line Drive │ │ Fly Ball │ │ Pop Up │              │
│  └────────┘ └────────────┘ └──────────┘ └────────┘              │
│                                                                 │
│  RUNNER ADVANCEMENT: (auto-suggested, adjust if needed)         │
│                                                                 │
│  Torres (was on 2B):                                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────────────┐                    │
│  │ Scored ●│ │ To 3B   │ │ Out at Home     │                    │
│  └─────────┘ └─────────┘ └─────────────────┘                    │
│                                                                 │
│  Rizzo (was on 1B):                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────────────┐                    │
│  │ To 3B   │ │ To 2B ● │ │ Out at 3B       │                    │
│  └─────────┘ └─────────┘ └─────────────────┘                    │
│                                                                 │
│  RBIs: [1] (auto-calculated from runners scored)                │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • +1.0 Clutch (2-out RBI in close game)                        │
│  • +1.0 Clutch (RBI with RISP)                                  │
│                                                                 │
│                    [Confirm At-Bat]                             │
└─────────────────────────────────────────────────────────────────┘
```

### After Selecting Single (1B) - With Beat-Out Detection

```
┌─────────────────────────────────────────────────────────────────┐
│  RESULT: Single (1B)                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DIRECTION: [Shortstop ▼]                                       │
│  EXIT TYPE: [Ground ▼]                                          │
│                                                                 │
│  SINGLE TYPE:                                                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │ Clean Hit       │ │ Beat Throw      │ │ Reached on E    │    │
│  │ (through hole)  │ │ (close play)    │ │ (use E button)  │    │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│                                                                 │
│  [If "Beat Throw" selected]                                     │
│  Fielder who threw: [Crawford - SS ▼]                           │
│                                                                 │
│  RUNNER ADVANCEMENT:                                            │
│  (same pattern as above)                                        │
│                                                                 │
│  ⚡ AUTO-LOGGED (if Beat Throw):                                │
│  • Judge: +0.15 rWAR (beat-out single)                          │
│  • Crawford: -0.014 fWAR (throw beaten)                         │
│                                                                 │
│                    [Confirm At-Bat]                             │
└─────────────────────────────────────────────────────────────────┘
```

### After Selecting Home Run (HR)

```
┌─────────────────────────────────────────────────────────────────┐
│  RESULT: HOME RUN 💥                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DISTANCE: [427] ft                                             │
│                                                                 │
│  DIRECTION:                                                     │
│  ┌───────┐ ┌─────────────┐ ┌────────┐ ┌──────────────┐ ┌─────┐  │
│  │ Left  │ │ Left-Center │ │ Center │ │ Right-Center │ │Right│  │
│  └───────┘ └─────────────┘ └────────┘ └──────────────┘ └─────┘  │
│                                                                 │
│  RUNNERS SCORED: (auto-calculated)                              │
│  ☑ Torres (from 2B)                                             │
│  ☑ Rizzo (from 1B)                                              │
│  ☑ Judge (batter)                                               │
│                                                                 │
│  RBIs: [3] (auto-calculated)                                    │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • +1.5 Clutch (Go-Ahead HR in 7th+)                            │
│  • +1.25 Clutch (2-Out RBI × 3)                                 │
│  • +1.0 Fame (HR)                                               │
│                                                                 │
│                    [Confirm At-Bat]                             │
└─────────────────────────────────────────────────────────────────┘
```

### Stadium HR Distance Record Detection

When a HR distance is entered, the app checks against stadium records:

```
┌─────────────────────────────────────────────────────────────────┐
│  🏆 NEW STADIUM RECORD! 🏆                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│     WILLIE MAYS                                                 │
│     492 ft BOMB to Center Field!                                │
│                                                                 │
│     Previous Record: 485 ft                                     │
│     Held by: Giancarlo Stanton (July 22, S2)                    │
│                                                                 │
│  ⚡ BONUS AWARDED:                                              │
│  • +3.0 Fame (New Stadium HR Distance Record!)                  │
│  • Record added to Oracle Park history                          │
│                                                                 │
│                    [Confirm At-Bat]                             │
└─────────────────────────────────────────────────────────────────┘
```

**Stadium HR Record Fame Bonuses:**

```javascript
function checkStadiumHRRecord(distance, direction, stadiumId, playerId) {
  const stadium = getStadium(stadiumId);
  const existingRecord = stadium.records.hrDistance[direction.toLowerCase()];
  const overallRecord = stadium.records.hrDistance.overall;

  let fameBonus = 0;
  const records = [];

  // Check direction-specific record
  if (!existingRecord || distance > existingRecord.distance) {
    fameBonus += 1.5;  // Direction-specific record
    records.push({
      type: 'DIRECTION_RECORD',
      direction: direction,
      newDistance: distance,
      previousDistance: existingRecord?.distance || null,
      previousHolder: existingRecord?.playerName || null
    });
  }

  // Check overall stadium record
  if (!overallRecord || distance > overallRecord.distance) {
    fameBonus += 1.5;  // Overall stadium record (additional)
    records.push({
      type: 'OVERALL_RECORD',
      newDistance: distance,
      previousDistance: overallRecord?.distance || null,
      previousHolder: overallRecord?.playerName || null
    });
  }

  // Total possible: +3.0 Fame for breaking overall record (includes direction)

  return { fameBonus, records };
}

// Update stadium records after confirmation
function updateStadiumHRRecords(stadiumId, hrData) {
  const { playerId, playerName, team, distance, direction, date, offPitcher, situation } = hrData;
  const stadium = getStadium(stadiumId);

  // Update direction record
  if (distance > (stadium.records.hrDistance[direction]?.distance || 0)) {
    stadium.records.hrDistance[direction] = {
      distance, playerId, playerName, team, date, offPitcher, situation
    };
  }

  // Update overall record
  if (distance > (stadium.records.hrDistance.overall?.distance || 0)) {
    stadium.records.hrDistance.overall = {
      distance, direction, playerId, playerName, team, date, offPitcher, situation
    };
  }

  // Add to notable moments
  stadium.notableMoments.push({
    type: 'HR_RECORD',
    ...hrData
  });
}
```

---

### After Selecting HR - Walk-Off Detected

```
┌─────────────────────────────────────────────────────────────────┐
│  🎆🎆🎆 WALK-OFF HOME RUN! 🎆🎆🎆                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    WILLIE MAYS                                  │
│                  WINS IT FOR THE GIANTS!                        │
│                                                                 │
│  DISTANCE: [___] ft                                             │
│                                                                 │
│  DIRECTION:                                                     │
│  ┌───────┐ ┌─────────────┐ ┌────────┐ ┌──────────────┐ ┌─────┐  │
│  │ Left  │ │ Left-Center │ │ Center │ │ Right-Center │ │Right│  │
│  └───────┘ └─────────────┘ └────────┘ └──────────────┘ └─────┘  │
│                                                                 │
│  RUNNERS SCORED: (auto-calculated)                              │
│  ☑ Previous runners                                             │
│  ☑ Mays (batter)                                                │
│                                                                 │
│  RBIs: [2] (auto-calculated)                                    │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • +3.0 Clutch (Walk-Off HR)                                    │
│  • +2.0 Fame (Walk-Off HR)                                      │
│  • 🎆 MEMORABLE MOMENT: Walk-Off HR vs Rival                    │
│                                                                 │
│                    [Confirm Walk-Off]                           │
└─────────────────────────────────────────────────────────────────┘
```

### After Selecting Out (GO, FO, LO, PO)

```
┌─────────────────────────────────────────────────────────────────┐
│  RESULT: Fly Out                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DIRECTION: [Left-Center ▼]                                     │
│  EXIT TYPE: [Fly Ball ▼]                                        │
│                                                                 │
│  CAUGHT BY: [Slater - CF ▼]                                     │
│                                                                 │
│  SPECIAL PLAY?                                                  │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        │
│  │ Routine   │ │ Diving    │ │ Wall Catch│ │ Running   │        │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘        │
│                                                                 │
│  [If Diving or Wall Catch]                                      │
│  Did this save a run?  [Yes] [No]                               │
│                                                                 │
│  RUNNER ADVANCEMENT (if any):                                   │
│  Torres (was on 2B):                                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────────────┐                    │
│  │ Scored  │ │ Held    │ │ Out (thrown out)│                    │
│  └─────────┘ └─────────┘ └─────────────────┘                    │
│                                                                 │
│  ⚡ AUTO-LOGGED (if diving + saves run):                        │
│  • Slater: +0.039 fWAR (diving catch)                           │
│  • +1.5 Clutch (clutch defensive play)                          │
│                                                                 │
│                    [Confirm At-Bat]                             │
└─────────────────────────────────────────────────────────────────┘
```

### After Selecting Double Play (DP)

```
┌─────────────────────────────────────────────────────────────────┐
│  RESULT: Double Play                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DIRECTION: [Shortstop ▼]                                       │
│  EXIT TYPE: [Ground ▼]                                          │
│                                                                 │
│  DP TYPE:                                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │  6-4-3  │ │  4-6-3  │ │  5-4-3  │ │  3-6-3  │ │ Other   │    │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
│                                                                 │
│  RUNNERS OUT: (auto-detected from base state)                   │
│  ☑ Rizzo (was on 1B) - out at 2B                                │
│  ☑ Judge (batter) - out at 1B                                   │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Judge: -1.25 Choke (GIDP with RISP in close game)            │
│  • Crawford (SS): +1.25 Clutch (turned clutch DP)               │
│  • Estrada (2B): +1.25 Clutch (turned clutch DP)                │
│  • Simmons (P): +1.5 Clutch (induced GIDP to escape jam)        │
│                                                                 │
│                    [Confirm At-Bat]                             │
└─────────────────────────────────────────────────────────────────┘
```

### After Selecting Error (E)

```
┌─────────────────────────────────────────────────────────────────┐
│  RESULT: Reached on Error                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  WHO COMMITTED THE ERROR?                                       │
│  [Crawford - SS ▼]                                              │
│                                                                 │
│  ERROR TYPE:                                                    │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        │
│  │ Throwing  │ │ Fielding  │ │ Dropped   │ │  Mental   │        │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘        │
│                                                                 │
│  BALL HIT DIRECTION: [SS ▼]                                     │
│  EXIT TYPE: [Ground ▼]                                          │
│                                                                 │
│  RUNNER ADVANCEMENT (beyond expected):                          │
│  Torres (was on 2B):                                            │
│  ┌─────────┐ ┌─────────┐ (normally would hold at 3B)            │
│  │ Scored ●│ │ To 3B   │                                        │
│  └─────────┘ └─────────┘                                        │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Crawford: -0.051 fWAR (fielding error)                       │
│  • Crawford: -1.5 Choke (error in clutch situation)             │
│  • Run scored marked UNEARNED for pitcher                       │
│                                                                 │
│                    [Confirm At-Bat]                             │
└─────────────────────────────────────────────────────────────────┘
```

### After Selecting Fielder's Choice (FC)

```
┌─────────────────────────────────────────────────────────────────┐
│  RESULT: Fielder's Choice                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DIRECTION: [SS ▼]                                              │
│  EXIT TYPE: [Ground ▼]                                          │
│                                                                 │
│  WHO WAS PUT OUT?                                               │
│  ┌────────────────┐ ┌────────────────┐                          │
│  │ Torres at 3B   │ │ Rizzo at 2B    │                          │
│  └────────────────┘ └────────────────┘                          │
│                                                                 │
│  BATTER: Judge reaches 1B                                       │
│                                                                 │
│  Other runners:                                                 │
│  Rizzo (was on 1B): [Stays at 1B ▼] / [To 2B] / [Out]           │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Judge: FC (no hit credit)                                    │
│  • Torres: Out on bases                                         │
│                                                                 │
│                    [Confirm At-Bat]                             │
└─────────────────────────────────────────────────────────────────┘
```

### After Selecting Strikeout (K or KL)

```
┌─────────────────────────────────────────────────────────────────┐
│  RESULT: Strikeout (Swinging)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Judge: K (swinging)                                          │
│  • -1.0 Choke (K with RISP in close game)                       │
│  • Simmons: +1.0 Clutch (K to end threat)                       │
│                                                                 │
│  [If this was 3rd out with RISP]                                │
│  • Simmons: +1.5 Clutch (K to strand runners)                   │
│                                                                 │
│                    [Confirm At-Bat]                             │
└─────────────────────────────────────────────────────────────────┘
```

---

### After Selecting Walk (BB)

```
┌─────────────────────────────────────────────────────────────────┐
│  RESULT: Walk (BB)                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RUNNER ADVANCEMENT:                                            │
│  Batter advances to 1B                                          │
│                                                                 │
│  [If runners on base - auto-advance forced runners]             │
│  Torres (was on 1B): → Advances to 2B (forced)                  │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Judge: +1 BB                                                 │
│  • Judge: +0.15 bWAR (plate discipline)                         │
│  • Simmons: +1 BB allowed                                       │
│  • Simmons: -0.1 pWAR                                           │
│                                                                 │
│  [If bases loaded walk - run scores]                            │
│  • Judge: +1 RBI (walk with bases loaded)                       │
│  • Simmons: +1 ER (walked in run)                               │
│  • Simmons: -1.5 Choke (walking in a run)                       │
│  • Judge: +0.5 Clutch (RBI walk in close game)                  │
│                                                                 │
│  7+ PITCH AT-BAT? ☐                                             │
│  (Check if batter worked a long count)                          │
│  ⚡ If checked: +0.25 Clutch bonus for plate discipline         │
│                                                                 │
│                    [Confirm Walk]                               │
└─────────────────────────────────────────────────────────────────┘
```

---

### After Selecting Intentional Walk (IBB)

```
┌─────────────────────────────────────────────────────────────────┐
│  RESULT: Intentional Walk (IBB)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RUNNER ADVANCEMENT:                                            │
│  Batter intentionally walked to 1B                              │
│                                                                 │
│  [If runners on base - auto-advance forced runners]             │
│  Torres (was on 1B): → Advances to 2B (forced)                  │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Judge: +1 IBB (intentional walk)                             │
│  • Simmons: +1 IBB issued                                       │
│  • No WAR impact (IBB is strategic, not skill)                  │
│                                                                 │
│  [If bases loaded IBB - rare but possible]                      │
│  • Judge: +1 RBI (intentional walk forces in run)               │
│  • Simmons: +1 ER                                               │
│  • Simmons: -2.0 Choke (intentionally walking in a run!)        │
│  • Kapler (MGR): -1.5 Choke (intentional bases-loaded walk)     │
│                                                                 │
│  🌟 FAME CHECK:                                                 │
│  • If Judge is being intentionally walked, indicates respect    │
│  • 3+ IBB in a season: "Feared Hitter" narrative tag            │
│                                                                 │
│                    [Confirm IBB]                                │
└─────────────────────────────────────────────────────────────────┘
```

---

### After Selecting Hit By Pitch (HBP)

```
┌─────────────────────────────────────────────────────────────────┐
│  RESULT: Hit By Pitch (HBP)                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RUNNER ADVANCEMENT:                                            │
│  Batter awarded 1B (hit by pitch)                               │
│                                                                 │
│  [If runners on base - auto-advance forced runners]             │
│  Torres (was on 1B): → Advances to 2B (forced)                  │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Judge: +1 HBP                                                │
│  • Judge: +0.1 bWAR (reached base)                              │
│  • Simmons: +1 HBP (hit batter)                                 │
│  • Simmons: -0.1 pWAR (control issue)                           │
│                                                                 │
│  [If bases loaded HBP - run scores]                             │
│  • Judge: +1 RBI (HBP with bases loaded)                        │
│  • Simmons: +1 ER (hit batter forces in run)                    │
│  • Simmons: -1.5 Choke (HBP forces in run)                      │
│                                                                 │
│  ⚠️ RETALIATION CHECK:                                         │
│  Was this intentional retaliation?                              │
│  ┌──────────────────────┐ ┌──────────────────────┐              │
│  │ No - Accidental      │ │ Yes - Intentional    │              │
│  └──────────────────────┘ └──────────────────────┘              │
│                                                                 │
│  [If Yes - Intentional]                                         │
│  ⚡ ADDITIONAL LOGGING:                                         │
│  • Simmons: -1.0 Choke (intentional HBP - loss of composure)    │
│  • Creates RIVALRY INCIDENT between teams                       │
│  • Narrative: "Bad blood brewing between Giants and Yankees"    │
│  • If star player hit: +0.5 Fame to victim (badge of respect)   │
│                                                                 │
│                    [Confirm HBP]                                │
└─────────────────────────────────────────────────────────────────┘
```

---

### After Selecting Sacrifice Bunt (SAC)

```
┌─────────────────────────────────────────────────────────────────┐
│  RESULT: Sacrifice Bunt (SAC)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BATTER OUT (sacrifice)                                         │
│                                                                 │
│  RUNNER ADVANCEMENT:                                            │
│  Torres (was on 1B): [To 2B ●] [Out at 2B] [Safe at 1B]         │
│  Rizzo (was on 2B):  [To 3B ●] [Scored]    [Held at 2B]         │
│                                                                 │
│  FIELDED BY: (auto-inferred from bunt)                          │
│  ┌───────────────────────────────────────────────────┐          │
│  │  🎯 Simmons - P  (pitcher fielded bunt)  [Change] │          │
│  └───────────────────────────────────────────────────┘          │
│                                                                 │
│  [When Change is tapped - common SAC fielders]                  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                                    │
│  │ P  │ │ C  │ │ 1B │ │ 3B │                                    │
│  └────┘ └────┘ └────┘ └────┘                                    │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Batter: +1 SAC (sacrifice bunt)                              │
│  • NO batting average penalty (SAC doesn't count as AB)         │
│  • Simmons: +0.33 IP recorded                                   │
│  • Boone (MGR): Successful sacrifice situation                  │
│                                                                 │
│  [If runner advances and scores on SAC]                         │
│  • Batter: +1 RBI (sacrifice scores run)                        │
│  • Batter: +0.5 Clutch (productive SAC)                         │
│                                                                 │
│  [If fielder throws to wrong base and runner is safe]           │
│  ⚡ This becomes a FIELDER'S CHOICE - use FC button instead     │
│                                                                 │
│                    [Confirm Sacrifice]                          │
└─────────────────────────────────────────────────────────────────┘
```

---

### After Selecting Sacrifice Fly (SF)

```
┌─────────────────────────────────────────────────────────────────┐
│  RESULT: Sacrifice Fly (SF)                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DIRECTION:                                                     │
│  ┌───────┐ ┌─────────────┐ ┌────────┐ ┌──────────────┐ ┌─────┐  │
│  │ Left  │ │ Left-Center │ │ Center │ │ Right-Center │ │Right│  │
│  └───────┘ └─────────────┘ └────────┘ └──────────────┘ └─────┘  │
│                                                                 │
│  FIELDED BY: (auto-inferred from direction)                     │
│  ┌───────────────────────────────────────────────────┐          │
│  │  🎯 Yastrzemski - RF  (inferred from Right)      [Change] │  │
│  └───────────────────────────────────────────────────┘          │
│                                                                 │
│  RUNNER ADVANCEMENT (after catch):                              │
│  Rizzo (was on 3B): [Scored ●] [Held - no tag]                  │
│  Torres (was on 2B): [To 3B] [Held ●]                           │
│  Stanton (was on 1B): [To 2B] [Held ●]                          │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Batter: +1 SF (sacrifice fly)                                │
│  • NO batting average penalty (SF doesn't count as AB)          │
│  • Batter: +1 RBI (sac fly scores run)                          │
│  • Yastrzemski: +0.014 fWAR (outfield putout)                   │
│  • Simmons: +0.33 IP, +1 ER                                     │
│                                                                 │
│  [If runner thrown out at plate]                                │
│  ⚡ This becomes an OUT - Runner must be marked "Out at Home"   │
│  • Yastrzemski: +1.5 Clutch (throws out runner at plate)        │
│  • Yastrzemski: +0.045 fWAR (outfield assist)                    │
│  • Runner: -1.0 Choke (thrown out trying to score on SF)        │
│  • Boone (MGR): -1.0 (sent runner, thrown out)                  │
│                                                                 │
│  [Clutch situation bonuses]                                     │
│  • If go-ahead run: Batter +1.5 Clutch                          │
│  • If tie game: Batter +1.0 Clutch                              │
│  • If insurance run: Batter +0.5 Clutch                         │
│                                                                 │
│                    [Confirm Sacrifice Fly]                      │
└─────────────────────────────────────────────────────────────────┘
```

---

### After Selecting Dropped Third Strike (D3K)

```
┌─────────────────────────────────────────────────────────────────┐
│  RESULT: Dropped Third Strike (D3K)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Strikeout but catcher dropped the ball!                        │
│                                                                 │
│  BATTER RESULT:                                                 │
│  ┌──────────────────────────┐ ┌──────────────────────────┐      │
│  │ SAFE AT 1B               │ │ OUT (thrown out)         │      │
│  │ (reached on dropped 3K)  │ │ (or didn't run)          │      │
│  └──────────────────────────┘ └──────────────────────────┘      │
│                                                                 │
│  [If SAFE AT 1B]                                                │
│  ⚡ AUTO-LOGGED:                                                │
│  • Batter: +1 K (strikeout still counts)                        │
│  • Batter: Reached on D3K (baserunner, no hit)                  │
│  • Simmons: +1 K (pitcher gets strikeout credit)                │
│  • Bart (C): +1 E (error on catcher - passed ball on K)         │
│  • Bart (C): -1.0 Choke (dropped third strike)                  │
│                                                                 │
│  [If OUT (thrown out at 1B)]                                    │
│  ⚡ AUTO-LOGGED:                                                │
│  • Batter: +1 K (strikeout)                                     │
│  • Simmons: +1 K                                                │
│  • Bart (C): Recovery - threw out runner                        │
│  • No error charged (made the play)                             │
│                                                                 │
│  ⚠️ ELIGIBILITY CHECK (auto-verified):                         │
│  D3K only valid when: 1B is unoccupied OR there are 2 outs      │
│  Current: [1B Empty ✓] [Outs: 1]                                │
│  ✓ D3K is valid in this situation                               │
│                                                                 │
│  [If ineligible situation detected]                             │
│  ⚠️ 1B is occupied with less than 2 outs - batter is           │
│     automatically out on strikeout. Use regular K instead.      │
│                                                                 │
│                    [Confirm D3K]                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Between-Pitch Events

Accessible via buttons on main screen for events that happen between at-bats:

### Wild Pitch / Passed Ball

```
┌─────────────────────────────────────────────────────────────────┐
│  WILD PITCH / PASSED BALL                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TYPE:                                                          │
│  ┌────────────────┐ ┌────────────────┐                          │
│  │ Wild Pitch     │ │ Passed Ball    │                          │
│  │ (Pitcher)      │ │ (Catcher)      │                          │
│  └────────────────┘ └────────────────┘                          │
│                                                                 │
│  RUNNER ADVANCEMENT:                                            │
│  Torres (was on 2B): [To 3B ●] [Scored] [Held]                  │
│  Rizzo (was on 1B):  [To 2B ●] [To 3B]  [Held]                  │
│                                                                 │
│  ⚡ AUTO-LOGGED (if Wild Pitch + run scores):                   │
│  • Simmons: -1.0 Choke (wild pitch allows run)                  │
│  • Simmons: Run charged as earned                               │
│                                                                 │
│  ⚡ AUTO-LOGGED (if Passed Ball + run scores):                  │
│  • Bart: -1.0 Choke (passed ball allows run)                    │
│  • Simmons: Run charged as unearned                             │
│                                                                 │
│                    [Confirm]                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Pickoff (Not During Steal)

```
┌─────────────────────────────────────────────────────────────────┐
│  PICKOFF ATTEMPT                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RUNNER: [Torres - 2B ▼]                                        │
│                                                                 │
│  RESULT:                                                        │
│  ┌────────────────┐ ┌────────────────┐                          │
│  │ SAFE           │ │ OUT            │                          │
│  └────────────────┘ └────────────────┘                          │
│                                                                 │
│  [If OUT]                                                       │
│  ⚡ AUTO-LOGGED:                                                │
│  • Simmons: +1.25 Clutch (pickoff in close game)                │
│  • Torres: -1.0 Choke (picked off)                              │
│  • [If ends inning]: Torres -2.0 Choke (picked off to end inn)  │
│                                                                 │
│                    [Confirm]                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Steal Attempt Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  STEAL ATTEMPT                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RUNNER: Torres (on 1B)                                         │
│  STEALING: [2B ▼]                                               │
│                                                                 │
│  RESULT:                                                        │
│  ┌────────────────┐  ┌────────────────┐                         │
│  │     SAFE       │  │      OUT       │                         │
│  └────────────────┘  └────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

[If SAFE]
┌─────────────────────────────────────────────────────────────────┐
│  STEAL: SAFE ✓                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Torres advances to 2B                                          │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Torres: +1 SB (stolen base)                                  │
│  • Torres: +0.3 rWAR                                            │
│  • [If clutch]: +1.0 Clutch (steal in clutch)                   │
│  • Boone (MGR): Successful steal call                           │
│                                                                 │
│                    [Confirm]                                    │
└─────────────────────────────────────────────────────────────────┘

[If OUT]
┌─────────────────────────────────────────────────────────────────┐
│  STEAL: OUT ✗                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Torres caught stealing                                         │
│                                                                 │
│  WHO MADE THE PLAY?                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ Catcher throw       │  │ Pickoff by pitcher  │               │
│  │ (Bart)              │  │ (Simmons)           │               │
│  └─────────────────────┘  └─────────────────────┘               │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Torres: +1 CS (caught stealing)                              │
│  • Torres: -0.5 rWAR                                            │
│  • Torres: -1.0 Choke (CS in close game)                        │
│  • [If ends inning]: -1.5 Choke (CS ends inning)                │
│  • Bart: +1.25 Clutch (throws out runner)                       │
│  • Boone (MGR): Failed steal call                               │
│                                                                 │
│                    [Confirm]                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Special In-Game Events

These events are accessible via [Menu] → Special Events, or can be logged after a play for additional context.

### Robbed Home Run

```
┌─────────────────────────────────────────────────────────────────┐
│  🧤 ROBBED HOME RUN!                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FIELDER WHO MADE THE CATCH:                                    │
│  [Mays - CF ▼]                                                  │
│                                                                 │
│  BATTER ROBBED:                                                 │
│  [Judge - Yankees ▼]                                            │
│                                                                 │
│  RUNNERS ON BASE? (would have scored)                           │
│  ☐ Runner on 1B   ☐ Runner on 2B   ☐ Runner on 3B              │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Mays: +2.0 Clutch (robbed HR)                                │
│  • Mays: +2.0 Fame (web gem!)                                   │
│  • Mays: +0.078 fWAR (robbed HR catch)                          │
│  • Judge: -0.5 Choke (robbed of HR)                             │
│  • [If runners]: Runs Saved = runners on base + 1               │
│                                                                 │
│                    [Confirm]                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Star Play (Exceptional Defensive Play)

```
┌─────────────────────────────────────────────────────────────────┐
│  ⭐ STAR PLAY!                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FIELDER:                                                       │
│  [Crawford - SS ▼]                                              │
│                                                                 │
│  PLAY TYPE:                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │ Diving Catch│ │ Leaping     │ │ Barehanded  │                │
│  │             │ │ Catch       │ │ Play        │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │ Range Play  │ │ Strong Throw│ │ Relay Throw │                │
│  │ (deep hole) │ │ (nails rnr) │ │ (perfect)   │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
│                                                                 │
│  DID THIS SAVE A RUN?                                           │
│  ☐ Yes (extra clutch credit)                                    │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Crawford: +1.0 Fame (Star Play)                              │
│  • Crawford: +0.030 fWAR (star play)                            │
│  • [If clutch]: +1.0 Clutch (star play in close game)           │
│  • [If saved run]: +1.5 Clutch (star play saves run)            │
│                                                                 │
│                    [Confirm]                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Killed Pitcher (Come-Backer)

```
┌─────────────────────────────────────────────────────────────────┐
│  💥 KILLED PITCHER! (Come-Backer)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BATTER WHO HIT IT:                                             │
│  [Stanton - Yankees ▼]                                          │
│                                                                 │
│  PITCHER HIT:                                                   │
│  [Simmons - Giants ▼]                                           │
│                                                                 │
│  OUTCOME:                                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │ Pitcher OK  │ │ Pitcher     │ │ Pitcher     │                │
│  │ (made play) │ │ Shaken Up   │ │ Exits Game  │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
│                                                                 │
│  BATTER RESULT:                                                 │
│  ┌───────┐ ┌───────┐ ┌───────┐                                  │
│  │  Out  │ │ Single│ │ Error │                                  │
│  └───────┘ └───────┘ └───────┘                                  │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Stanton: +1.0 Fame (Killed Pitcher!)                         │
│  • [If pitcher caught it]: Simmons +1.5 Clutch, +1.0 Fame       │
│  • [If pitcher injured]: Simmons marked injured                 │
│                                                                 │
│                    [Confirm]                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Caught Come-Backer (Pitcher Makes Great Play)

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 CAUGHT COME-BACKER!                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PITCHER:                                                       │
│  [Simmons - Giants ▼]                                           │
│                                                                 │
│  PLAY TYPE:                                                     │
│  ┌─────────────────┐ ┌─────────────────┐                        │
│  │ Snared Line     │ │ Quick Reaction  │                        │
│  │ Drive           │ │ Groundout       │                        │
│  └─────────────────┘ └─────────────────┘                        │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Simmons: +1.0 Fame (Caught Come-Backer!)                     │
│  • Simmons: +0.25 pWAR (self-defense)                           │
│  • [If clutch]: +1.0 Clutch (great reaction in tight spot)      │
│                                                                 │
│                    [Confirm]                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Nut Shot

```
┌─────────────────────────────────────────────────────────────────┐
│  😵 NUT SHOT!                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  VICTIM:                                                        │
│  [Bart - C ▼]                                                   │
│                                                                 │
│  HOW IT HAPPENED:                                               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │ Foul Tip       │ │ Wild Pitch      │ │ Hit by Ball     │    │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Bart: +0.5 Fame (Nut Shot! 🥜)                               │
│  • Added to season's Nut Shot counter                           │
│  • [If multiple this season]: "Taking one for the team" badge   │
│                                                                 │
│                    [Confirm]                                    │
└─────────────────────────────────────────────────────────────────┘
```

### TOOTBLAN (Thrown Out On The Basepaths Like A Nincompoop)

```
┌─────────────────────────────────────────────────────────────────┐
│  🤦 TOOTBLAN!                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RUNNER:                                                        │
│  [Torres - Yankees ▼]                                           │
│                                                                 │
│  TYPE OF BASERUNNING BLUNDER:                                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │ Picked Off     │ │ Caught in       │ │ Overran Base    │    │
│  │ (not paying    │ │ Rundown         │ │                 │    │
│  │ attention)     │ │                 │ │                 │    │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │ Thrown Out     │ │ Missed Sign     │ │ Other Mental    │    │
│  │ at Plate       │ │ (ran through    │ │ Error           │    │
│  │ (bad read)     │ │ stop sign)      │ │                 │    │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│                                                                 │
│  INNING ENDED? ☐ Yes (additional choke penalty)                 │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Torres: -1.5 Choke (TOOTBLAN!)                               │
│  • Torres: -0.3 rWAR                                            │
│  • [If ends inning]: -2.0 Choke (TOOTBLAN ends inning)          │
│  • Boone (MGR): Baserunning blunder on his watch                │
│                                                                 │
│                    [Confirm]                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Balk

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ BALK                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PITCHER:                                                       │
│  [Simmons - Giants ▼]                                           │
│                                                                 │
│  RUNNER ADVANCEMENT:                                            │
│  Torres (was on 2B): [To 3B ●]                                  │
│  Rizzo (was on 1B):  [To 2B ●]                                  │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Simmons: -0.5 Choke (balk)                                   │
│  • [If run scores]: -1.5 Choke (balk allows run)                │
│                                                                 │
│                    [Confirm]                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Runner Thrown Out (Defensive Play)

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 RUNNER THROWN OUT                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RUNNER:                                                        │
│  [Torres - Yankees ▼]                                           │
│                                                                 │
│  SITUATION:                                                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │ Thrown Out at  │ │ Thrown Out at  │ │ Thrown Out at  │    │
│  │ Home           │ │ 3rd            │ │ 2nd            │    │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│                                                                 │
│  WHO MADE THE THROW?                                            │
│  [Crawford - SS ▼]                                              │
│                                                                 │
│  PLAY TYPE:                                                     │
│  ┌─────────────────┐ ┌─────────────────┐                        │
│  │ Relay Throw    │ │ Direct Throw   │                        │
│  │ (outfield)     │ │ (infield)      │                        │
│  └─────────────────┘ └─────────────────┘                        │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Crawford: +1.25 Clutch (throws out runner)                   │
│  • Crawford: +0.016 fWAR (infield assist)     │
│  • Torres: -1.5 Choke (thrown out trying to advance)            │
│  • [If ends inning]: Torres -2.0 Choke                          │
│                                                                 │
│                    [Confirm]                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Auto-Triggered Popups

These popups appear automatically when certain events are detected during gameplay:

### Milestone Reached Celebration

Automatically triggers when a player reaches a career milestone (500 HR, 3000 hits, etc.):

```
┌─────────────────────────────────────────────────────────────────┐
│  🏆🏆🏆 MILESTONE REACHED! 🏆🏆🏆                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                      WILLIE MAYS                                │
│                   500 CAREER HOME RUNS!                         │
│                                                                 │
│  ⚾ Career HR Timeline:                                         │
│  • 100 HR - April 12, S1                                        │
│  • 200 HR - June 28, S1                                         │
│  • 300 HR - May 15, S2                                          │
│  • 400 HR - Aug 22, S3                                          │
│  • 500 HR - TODAY! (June 18, S4)                                │
│                                                                 │
│  📊 Stats at Milestone:                                         │
│  .312 AVG | 500 HR | 1,423 RBI | 2,103 Hits                     │
│                                                                 │
│  ⚡ BONUSES AWARDED:                                            │
│  • +5.0 Fame (Epic Career Milestone!)                           │
│  • +10 Fan Happiness                                            │
│  • Moment recorded to Museum                                    │
│                                                                 │
│                    [Celebrate! 🎉]                              │
└─────────────────────────────────────────────────────────────────┘
```

### Approaching Milestone Alert

Shows in Pre-Game Setup when a player is close to a milestone:

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 MILESTONE WATCH                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Willie Mays needs 2 HR to reach 500 career!                    │
│  • Current: 498 HR                                              │
│  • Next milestone: 500 HR                                       │
│                                                                 │
│  Also close:                                                    │
│  • Mays: 7 hits from 2,100 career                               │
│  • Koufax: 12 K from 2,000 career                               │
│                                                                 │
│                    [Got it]                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Single-Game Achievement Popup

For special single-game accomplishments:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔥🔥🔥 AMAZING PERFORMANCE! 🔥🔥🔥                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                   WILLIE MAYS                                   │
│                   HIT FOR THE CYCLE!                            │
│                                                                 │
│  Today's line:                                                  │
│  4-5, 1B (1st), 2B (3rd), 3B (5th), HR (7th), 4 RBI             │
│                                                                 │
│  ⚡ BONUSES AWARDED:                                            │
│  • +3.0 Fame (Cycle!)                                           │
│  • +6 Fan Happiness                                             │
│  • Moment recorded to Museum                                    │
│                                                                 │
│                    [Incredible! 🎉]                             │
└─────────────────────────────────────────────────────────────────┘
```

**Other Auto-Triggered Achievement Popups:**
- No-Hitter in Progress (after 6th inning with no hits)
- Perfect Game in Progress (after 6th inning with perfect game)
- 4-HR Game
- 20-K Game (pitching)
- Grand Slam (shows celebratory popup)
- Inside-the-Park HR

### Nickname Earned Popup

When a player earns a nickname based on their performance:

```
┌─────────────────────────────────────────────────────────────────┐
│  📛 NICKNAME EARNED!                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Willie Mays is now known as...                                 │
│                                                                 │
│            "THE SAY HEY KID"                                    │
│                                                                 │
│  Earned for: 500+ career HR with .300+ career AVG               │
│                                                                 │
│  ┌───────────────────────────────────────────────────┐          │
│  │ Accept Nickname                                   │          │
│  └───────────────────────────────────────────────────┘          │
│  ┌───────────────────────────────────────────────────┐          │
│  │ Enter Custom Nickname: [________________]         │          │
│  └───────────────────────────────────────────────────┘          │
│                                                                 │
│                    [Save]                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Substitution Flows

### Pitching Change (Mandatory Pitch Count First)

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ PITCHING CHANGE - UPDATE PITCH COUNT FIRST                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Outgoing Pitcher: Mike Simmons                                 │
│                                                                 │
│  Current pitch count by inning:                                 │
│  1st: 14  |  2nd: 18  |  3rd: 12  |  4th: 21  |  5th: [__]     │
│                                                                 │
│  Enter CUMULATIVE pitch count: [72]                             │
│  (App calculates: 5th inning = 7 pitches)                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ⚠️ You MUST enter pitch count before continuing.           ││
│  │    This data cannot be recovered after the pitcher exits.  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│            [Confirm Pitch Count & Continue]                     │
└─────────────────────────────────────────────────────────────────┘

                              ↓

┌─────────────────────────────────────────────────────────────────┐
│  PITCHING CHANGE                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Outgoing: Mike Simmons                                         │
│  Final line: 4.2 IP, 6 H, 3 R, 3 ER, 5 K, 2 BB, 72 pitches     │
│                                                                 │
│  INHERITED RUNNERS:                                             │
│  ☑ Torres on 2B (Simmons' responsibility)                       │
│  ☑ Rizzo on 1B (Simmons' responsibility)                        │
│                                                                 │
│  NEW PITCHER: [Jake Powers ▼]                                   │
│                                                                 │
│  ⚡ MANAGER DECISION LOGGED:                                    │
│  • Kapler: Pitching change with 2 runners inherited             │
│  • Will track: inherited runners scored/stranded                │
│                                                                 │
│                    [Confirm Change]                             │
└─────────────────────────────────────────────────────────────────┘
```

### Pinch Hitter

```
┌─────────────────────────────────────────────────────────────────┐
│  PINCH HITTER                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Current Batter: Kiner-Falefa (9th in order)                    │
│  Situation: Top 7th, 2 Out, RISP, Down 1                        │
│                                                                 │
│  ⚠️ CLUTCH PINCH HIT SITUATION                                  │
│                                                                 │
│  PINCH HITTER: [Austin Wells ▼]                                 │
│                                                                 │
│  WILL PLAY: [LF ▼] (replacing Kiner-Falefa's position)          │
│                                                                 │
│  ⚡ MANAGER DECISION LOGGED:                                    │
│  • Boone: PH Wells for Kiner-Falefa (clutch spot)               │
│  • Will evaluate: M-PH if delivers, M-BPH if fails              │
│                                                                 │
│                    [Confirm Substitution]                       │
└─────────────────────────────────────────────────────────────────┘
```

### Pinch Runner

```
┌─────────────────────────────────────────────────────────────────┐
│  PINCH RUNNER                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  REPLACE: Stanton (on 2B)                                       │
│                                                                 │
│  PINCH RUNNER: [Peraza ▼]                                       │
│                                                                 │
│  Peraza will bat in Stanton's spot (2nd) going forward          │
│                                                                 │
│  ⚡ MANAGER DECISION LOGGED:                                    │
│  • Boone: PR Peraza for Stanton                                 │
│  • Will evaluate: M-PRN if Peraza scores                        │
│                                                                 │
│                    [Confirm Substitution]                       │
└─────────────────────────────────────────────────────────────────┘
```

### Defensive Substitution

```
┌─────────────────────────────────────────────────────────────────┐
│  DEFENSIVE SUBSTITUTION                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  REMOVING: Stanton (was DH)                                     │
│                                                                 │
│  NEW PLAYER: [Peraza ▼]                                         │
│  POSITION: [LF ▼]                                               │
│                                                                 │
│  LINEUP ADJUSTMENT:                                             │
│  • Peraza takes Stanton's spot (2nd in order)                   │
│  • Kiner-Falefa moves from LF to... [DH ▼]                      │
│                                                                 │
│  ⚡ MANAGER DECISION LOGGED:                                    │
│  • Boone: Defensive sub Peraza for Stanton                      │
│  • Will evaluate: M-DEF if Peraza makes clutch play             │
│                                                                 │
│                    [Confirm Substitution]                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## End of Half-Inning

After 3rd out is recorded, app automatically:
1. Flips to other half (TOP → BOTTOM or vice versa)
2. Shows optional pitch count reminder

```
┌─────────────────────────────────────────────────────────────────┐
│  END OF INNING - Update Pitch Counts (Optional)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Top 5th complete                                               │
│                                                                 │
│  Simmons (SF): Cumulative pitches: [72]  (was 65, +7 this inn) │
│  Cole (NYY):   Cumulative pitches: [__]  (was 58)              │
│                                                                 │
│        [Save & Continue]     [Skip - Update Later]              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Runner Thrown Out (During Play)

When user selects "Out at [base]" for runner advancement:

```
┌─────────────────────────────────────────────────────────────────┐
│  RUNNER THROWN OUT                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Torres out at home                                             │
│                                                                 │
│  THROWN OUT BY: [Yastrzemski - RF ▼]                            │
│                                                                 │
│  RELAY THROW?                                                   │
│  ○ No (direct throw)                                            │
│  ● Yes → Relay by: [Crawford - SS ▼]                            │
│                                                                 │
│  ⚡ AUTO-LOGGED:                                                │
│  • Yastrzemski: +0.045 fWAR (outfield assist)                    │
│  • Yastrzemski: +1.5 Clutch (outfield assist in close game)     │
│  • Crawford: +1.25 Clutch (perfect relay)                       │
│  • Torres: Out on bases                                         │
│  • Boone (MGR): -1.0 (sent runner, thrown out)                  │
│                                                                 │
│                    [Confirm]                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Box Score (Accessible During Game)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 BOX SCORE - Game 47                                          [Close]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LINESCORE                                                                  │
│             1   2   3   4   5   6   7   8   9      R   H   E               │
│  Yankees    0   1   0   0   2   0   -   -   -      3   7   1               │
│  Giants     0   0   2   0   0   1   -   -   -      4   8   0               │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  YANKEES BATTING             AB   R   H  RBI  HR   K  BB   AVG             │
│  ─────────────────────────────────────────────────────────────────          │
│  Judge RF      🏆MVP          3   1   2   3   1   0   0   .298             │
│  Stanton DH                   3   1   1   0   0   1   0   .267             │
│  Rizzo 1B                     3   0   1   0   0   0   0   .275             │
│  Torres 2B                    2   1   1   0   0   0   1   .281             │
│  ...                                                                        │
│  TOTALS                      24   3   7   3   1   4   2                    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  YANKEES PITCHING            IP   H   R  ER   K  BB   PC   ERA             │
│  ─────────────────────────────────────────────────────────────────          │
│  Cole (L)                   5.0   7   4   4   6   1   78   3.42            │
│  Holmes                     1.0   1   0   0   1   0   12   2.89            │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  GIANTS BATTING              AB   R   H  RBI  HR   K  BB   AVG             │
│  ─────────────────────────────────────────────────────────────────          │
│  Yastrzemski RF              3   0   1   0   0   0   0   .254             │
│  ...                                                                        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  CLUTCH/CHOKE SUMMARY                                                       │
│  ─────────────────────────────────────────────────────────────────          │
│  🔥 CLUTCH: Judge +4.0 | Crawford +2.5 | Simmons +2.0                      │
│  😰 CHOKE: Torres -1.5 | Rizzo -1.0                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## End Game Detection

### Game Over - Regulation (Away team ahead after bottom of 9th)

App auto-detects when:
- Inning ≥ 9
- Bottom half complete (3 outs)
- Away team has more runs

```
┌─────────────────────────────────────────────────────────────────┐
│  🏁 GAME OVER                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FINAL: Yankees 5 - Giants 4                                    │
│                                                                 │
│  Update final pitch counts:                                     │
│  Holmes (NYY): [85] cumulative                                  │
│  Powers (SF):  [23] cumulative                                  │
│                                                                 │
│              [Confirm & View Summary]                           │
└─────────────────────────────────────────────────────────────────┘
```

### Walk-Off Victory (Home team takes lead in bottom of 9th+)

App auto-detects walk-off when:
- Bottom of 9th or later
- Home team's run(s) give them the lead

Walk-off celebration screen shown (see HR Walk-Off screen above)

### Extra Innings

When tied after 9 innings, app automatically continues to 10th, 11th, etc.

---

## Post-Game Summary Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏁 FINAL: GIANTS 5 - YANKEES 4                                            │
│            Game 47 of 48 - June 18th                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📰 HEADLINE:                                                               │
│  "MAYS DOES IT AGAIN! Walk-off HR sinks Yankees!"                          │
│                                                                             │
│  ⭐ PLAYER OF THE GAME:                                                     │
│  Willie Mays - 3-4, HR, 3 RBI, Walk-off HR                                  │
│  (+4.5 Clutch, +3.0 Fame this game)                                         │
│                                                                             │
│  🎆 MEMORABLE MOMENTS RECORDED:                                             │
│  • Walk-off HR vs rival (MEMORABLE - Rivalry Walk-off)                      │
│  • Mays reaches 500 career HR (EPIC - Milestone)                            │
│                                                                             │
│  📊 CLUTCH LEADERS:           😰 CHOKE LEADERS:                             │
│  Mays +4.5                    Torres -1.5 (CS ends inning)                  │
│  Crawford +2.5 (2 assists)    Judge -1.0 (K with RISP)                      │
│  Simmons +2.0 (K'd side)                                                    │
│                                                                             │
│  🏆 STANDINGS IMPACT:                                                       │
│  Giants: 34-18 (1st, +5.0 GB)                                               │
│  Yankees: 28-24 (3rd in AL)                                                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  [View Full Box Score]  [View WAR Impact]  [Next Game]  [Main Menu]    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Score Override (If Needed)

Accessible from Menu button:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚙️ SCORE OVERRIDE                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Current tracked score: NYY 3 - SF 4                            │
│                                                                 │
│  CORRECT SCORE:                                                 │
│  Yankees: [___]    Giants: [___]                                │
│                                                                 │
│  ⚠️ This overrides the calculated score. Use only if           │
│     tracking got out of sync with the actual game.              │
│                                                                 │
│  Note: This affects clutch/choke calculations going forward     │
│  but does not retroactively change already-logged events.       │
│                                                                 │
│              [Confirm Override]  [Cancel]                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Undo System

### Undo via Activity Log

Tap any entry in the Activity Log to undo:

```
┌─────────────────────────────────────────────────────────────────┐
│  UNDO ACTION                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Undo this action?                                              │
│                                                                 │
│  "Judge HR (3 RBI) → +1.5 Clutch (Go-Ahead HR)"                │
│                                                                 │
│  This will:                                                     │
│  • Remove Judge's HR from stats                                 │
│  • Remove 3 RBIs                                                │
│  • Revert score from NYY 6 - SF 4 to NYY 3 - SF 4              │
│  • Remove +1.5 Clutch credit                                    │
│  • Restore runners to previous positions                        │
│  • Restore out count                                            │
│                                                                 │
│              [Confirm Undo]  [Cancel]                           │
└─────────────────────────────────────────────────────────────────┘
```

### Undo Stack Rules

- Last 10 actions stored
- Each undo reverts complete game state
- Undone actions shown with strikethrough in Activity Log
- Can re-do by entering the action again

---

## Activity Log - Broadcast Booth Style

The Activity Log serves as a real-time play-by-play narrative, giving the feel of a broadcast booth call rather than just a data log. Each entry is crafted to tell the story of the game.

### Activity Log Data Structure

```javascript
const activityLogEntry = {
  id: 'act-47',
  timestamp: '2024-06-18T19:45:23Z',
  inning: 5,
  halfInning: 'TOP',
  outs: 1,

  // Core Event Data
  type: 'AT_BAT',           // AT_BAT, PITCHING_CHANGE, STEAL, WP, PB, PICKOFF, SUB, etc.
  playerId: 'aaron-judge',
  playerName: 'Aaron Judge',
  team: 'Yankees',

  // Narrative Components
  narrative: {
    headline: 'JUDGE GOES YARD!',                    // Short, punchy
    call: 'Deep to left-center... back at the wall... IT IS GONE! A three-run bomb for Aaron Judge!',
    context: 'That gives the Yankees a 6-4 lead heading to the bottom of the 5th.',
    color: 'Judge now has 3 RBI on the day and moves within 2 of 500 career home runs.'
  },

  // Stat Summary (for data view)
  stats: {
    result: 'HR',
    distance: 427,
    direction: 'Left-Center',
    rbi: 3,
    runsScored: ['torres', 'rizzo', 'judge']
  },

  // Clutch/Choke/Fame Annotations
  annotations: [
    { type: 'CLUTCH', value: 1.5, reason: 'Go-Ahead HR in 7th+' },
    { type: 'FAME', value: 1.0, reason: 'Home Run' }
  ],

  // Undo Support
  undone: false,
  gameStateSnapshot: { /* full state for reverting */ }
};
```

### Narrative Generation Examples

**Home Run - Standard:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📻 ACTIVITY LOG                                     [Full View]│
├─────────────────────────────────────────────────────────────────┤
│  ⚾ Top 5 | 1 Out                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  JUDGE GOES DEEP! 💥                                            │
│  High drive to left-center... that ball is CRUSHED!             │
│  427 feet, 3-run shot. Yankees lead 6-4.                        │
│  ┌────────────────────────────────────────┐                     │
│  │ ⚡ +1.5 Clutch (Go-Ahead)  🌟 +1 Fame │                     │
│  └────────────────────────────────────────┘                     │
├─────────────────────────────────────────────────────────────────┤
│  ⚾ Top 5 | 0 Out                                               │
│  Torres doubles down the line! Rizzo advances to third.         │
│  ⚡ +0.5 Clutch (RBI Double in close game)                      │
├─────────────────────────────────────────────────────────────────┤
│  ⚾ Top 4 | 2 Out                                               │
│  Rizzo works a walk. Runners at the corners.                    │
└─────────────────────────────────────────────────────────────────┘
```

**Walk-Off Home Run:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🎆🎆🎆 WALK-OFF! 🎆🎆🎆                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  MAYS ENDS IT!                                                  │
│  The pitch... BELTED to deep center! Get up, ball! GET UP!      │
│  IT'S OUTTA HERE! Giants win on a 3-run walk-off bomb!          │
│  Final: Giants 7, Yankees 6                                     │
│  ┌────────────────────────────────────────┐                     │
│  │ ⚡ +3.0 Clutch (Walk-Off HR)           │                     │
│  │ 🌟 +2.0 Fame (Walk-Off)                │                     │
│  │ 🏆 +1.5 Fame (Stadium Distance Record!)│                     │
│  └────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

**Strikeout in Clutch Situation:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚾ Bot 8 | 2 Out | Runners on 2nd and 3rd                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  STRUCK HIM OUT! 🔥                                             │
│  Cole gets Torres looking with a nasty slider. Inning over.     │
│  Runners stranded at 2nd and 3rd.                               │
│  ┌────────────────────────────────────────┐                     │
│  │ ⚡ Cole: +1.5 Clutch (K to strand 2)   │                     │
│  │ 💀 Torres: -1.0 Choke (K with RISP)    │                     │
│  └────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

**Stolen Base:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚾ Bot 3 | 1 Out                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  THERE HE GOES! 💨                                              │
│  Henderson takes off... the throw from Trevino... SAFE!         │
│  Henderson swipes second with his 47th steal of the year.       │
│  ┌────────────────────────────────────────┐                     │
│  │ ⚡ +0.3 Clutch (SB in close game)      │                     │
│  │ 💀 Trevino: -0.054 fWAR (SB allowed)   │                     │
│  └────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

**Pitching Change:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚾ Top 7 | 0 Out                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  ⚙️ PITCHING CHANGE                                             │
│  Kapler makes the call. Webb exits after 6 strong innings.      │
│  Line: 6 IP, 4 H, 2 ER, 7 K, 1 BB (92 pitches)                  │
│  Doval enters from the bullpen.                                 │
│  Inheriting: Runners at 1st and 2nd.                            │
└─────────────────────────────────────────────────────────────────┘
```

**Error:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚾ Top 4 | 1 Out                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  OH NO! E6! 😬                                                  │
│  Routine grounder to short... Crawford boots it!                │
│  Judge reaches on the error. That'll hurt.                      │
│  ┌────────────────────────────────────────┐                     │
│  │ 💀 Crawford: -0.051 fWAR (fielding E)  │                     │
│  │ 💀 Crawford: -0.5 Choke (E in close)   │                     │
│  └────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

### Narrative Generation Function

```javascript
function generateNarrative(event, gameState) {
  const templates = {
    'HR': {
      headlines: [
        'GONE!', 'DEEP!', 'SEE YA!', 'CRUSHED!',
        `${event.playerName.split(' ')[1].toUpperCase()} GOES YARD!`
      ],
      calls: (e, gs) => {
        const direction = e.direction.toLowerCase();
        const distance = e.distance;
        const rbi = e.rbi;
        return `High fly ball to ${direction}... back at the wall... IT IS GONE! ` +
               `${distance} feet, ${rbi > 1 ? rbi + '-run' : 'solo'} shot!`;
      }
    },
    'K': {
      headlines: ['STRUCK HIM OUT!', 'K!', 'GOTCHA!', 'SWING AND A MISS!'],
      calls: (e, gs) => {
        const pitcher = gs.currentPitcher.name.split(' ')[1];
        const batter = e.playerName.split(' ')[1];
        const type = e.looking ? 'looking' : 'swinging';
        return `${pitcher} gets ${batter} ${type}. That's K number ${gs.currentPitcher.stats.k}.`;
      }
    },
    'WALK_OFF': {
      headlines: ['WALK-OFF!', 'BALLGAME!', 'THEY WIN IT!'],
      calls: (e, gs) => {
        const name = e.playerName.split(' ')[1].toUpperCase();
        return `${name} ENDS IT! The crowd goes WILD!`;
      }
    },
    // ... additional templates for all event types
  };

  const template = templates[event.type];
  return {
    headline: randomChoice(template.headlines),
    call: template.calls(event, gameState),
    context: generateContext(event, gameState),
    color: generateColorCommentary(event, gameState)
  };
}

function generateContext(event, gameState) {
  const { score, inning, halfInning, outs } = gameState;
  const scoreLine = `${gameState.awayTeam.name} ${score.away}, ${gameState.homeTeam.name} ${score.home}`;

  if (outs === 3) {
    return halfInning === 'TOP'
      ? `That ends the inning. Heading to the bottom of the ${inning}th.`
      : `Side retired. We go to the ${inning + 1}${getOrdinalSuffix(inning + 1)}.`;
  }

  return `Score: ${scoreLine}. ${3 - outs} out${3 - outs > 1 ? 's' : ''} remaining.`;
}

function generateColorCommentary(event, gameState) {
  // Check for milestones, records, streaks
  const milestones = checkMilestones(event);
  if (milestones.length > 0) {
    return milestones[0].narrative;
  }

  // Check for matchup context
  if (event.type === 'HR' && event.offPitcher) {
    const matchup = getMatchupHistory(event.playerId, event.offPitcher);
    if (matchup.hrCount >= 3) {
      return `That's ${matchup.hrCount} career homers off ${event.offPitcher}. He owns him.`;
    }
  }

  return null;
}
```

### Full View - Expanded Activity Log

Accessible via [Full View] button, shows complete game narrative:

```
┌─────────────────────────────────────────────────────────────────┐
│  📻 GAME 47 - FULL PLAY-BY-PLAY                        [Close]  │
├─────────────────────────────────────────────────────────────────┤
│  INNING 1                                                       │
│  ─────────────────────────────────────────────                  │
│  TOP 1ST                                                        │
│  • Judge grounds out to short (6-3)                             │
│  • Stanton walks on 4 pitches                                   │
│  • Rizzo singles to right, Stanton to second                    │
│  • Torres flies out to center                                   │
│  • Volpe strikes out looking                                    │
│                                                                 │
│  BOTTOM 1ST                                                     │
│  • Yastrzemski singles up the middle                            │
│  • Pederson homers to right! (431 ft) 2 RBI                     │
│    ⚡ +1.0 Clutch (1st inning statement)                        │
│  • Flores grounds out (5-3)                                     │
│  • Conforto walks                                               │
│  • Estrada flies out to left                                    │
│  Score after 1: NYY 0 - SF 2                                    │
│  ─────────────────────────────────────────────                  │
│  INNING 2                                                       │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Playoff-Specific Features

When `isPlayoff: true`:

### Series Tracking Display

```
┌─────────────────────────────────────────────────────────────────┐
│  🏆 NLCS GAME 3: Giants @ Dodgers                               │
│  Series: Giants lead 2-0                                        │
│  ⚠️ ELIMINATION GAME FOR DODGERS                                │
├─────────────────────────────────────────────────────────────────┤
```

### Playoff Stats Tracked Separately

- Playoff batting/pitching stats
- Playoff clutch/choke (Mr. October tracking)
- Playoff WAR (separate from regular season)
- Playoff memorable moments

### Playoff Clutch Multiplier

All clutch values multiplied by playoff intensity:
- Division Series: 1.25x
- League Championship: 1.5x
- World Series: 2.0x
- Elimination Game: Additional +0.5x

```javascript
function getPlayoffClutchMultiplier(playoffRound, isEliminationGame) {
  const baseMultiplier = {
    'DIVISION': 1.25,
    'LEAGUE_CHAMPIONSHIP': 1.50,
    'WORLD_SERIES': 2.00
  }[playoffRound] || 1.0;

  return isEliminationGame ? baseMultiplier + 0.5 : baseMultiplier;
}
```

---

# 5. WAR Calculations

## WAR Components

| Component | What It Measures | Applies To |
|-----------|------------------|------------|
| **bWAR** | Batting value above replacement | All batters |
| **rWAR** | Baserunning value | All runners |
| **fWAR** | Fielding value | All fielders (not DH) |
| **pWAR** | Pitching value | All pitchers |
| **mWAR** | Manager value | Managers |

## Total WAR

```
Position Player WAR = bWAR + rWAR + fWAR
Pitcher WAR = pWAR + fWAR + bWAR (if batting) + rWAR (if running)
Two-Way WAR = All components
Manager WAR = mWAR
```

## Expected WAR Calculation

**CRITICAL:** Expected WAR must be calculated at season start based on **rating-specific expectations**, not overall grade.

```javascript
function getExpectedBWAR(player) {
  // bWAR driven by Power and Contact (single ratings, not L/R split)
  const avgBattingRating = (player.ratings.power + player.ratings.contact) / 2;
  return ratingToExpectedWAR(avgBattingRating, 'batting');
}

function getExpectedRWAR(player) {
  return ratingToExpectedWAR(player.ratings.speed, 'baserunning');
}

function getExpectedFWAR(player) {
  const avgFieldingRating = (player.ratings.fielding + player.ratings.arm) / 2;
  return ratingToExpectedWAR(avgFieldingRating, 'fielding');
}

function getExpectedPWAR(player) {
  const avgPitchingRating = (
    player.ratings.velocity +
    player.ratings.junk +
    player.ratings.accuracy
  ) / 3;
  return ratingToExpectedWAR(avgPitchingRating, 'pitching');
}
```

**Rating to Expected WAR Tables (per 162 games):**

| Rating | bWAR | rWAR | fWAR | pWAR |
|--------|------|------|------|------|
| 95 | 6.0 | 1.5 | 2.5 | 7.0 |
| 90 | 5.0 | 1.2 | 2.0 | 5.5 |
| 85 | 4.0 | 0.9 | 1.5 | 4.0 |
| 80 | 3.0 | 0.6 | 1.0 | 3.0 |
| 70 | 2.0 | 0.3 | 0.4 | 1.5 |
| 60 | 1.0 | 0.0 | 0.0 | 0.5 |
| 50 | 0.0 | -0.2 | -0.5 | -0.5 |
| 40 | -1.0 | -0.5 | -1.0 | -2.0 |

## Real-Time Expectations vs Actuals Tracker

Live comparison view available throughout the season:

```
+---------------------------------------------------------------------------+
|  EXPECTATIONS vs ACTUALS - Season 4 (Game 24 of 40)                        |
+---------------------------------------------------------------------------+
|  OVERPERFORMERS (Top 10)                                                   |
|  +-------------------+------+--------+--------+--------+---------+
|  | Player            | Team | ExpWAR | ActWAR | Delta  | Status  |
|  +-------------------+------+--------+--------+--------+---------+
|  | Dusty Rhodes      | NYG  | 0.8    | 1.9    | +1.1   | Hot     |
|  | Ricky Henderson   | OAK  | 1.2    | 2.1    | +0.9   | Hot     |
|  +-------------------+------+--------+--------+--------+---------+
|                                                                            |
|  UNDERPERFORMERS (Bottom 10)                                               |
|  +-------------------+------+--------+--------+--------+---------+
|  | Player            | Team | ExpWAR | ActWAR | Delta  | Status  |
|  +-------------------+------+--------+--------+--------+---------+
|  | Barry Bonds       | SFG  | 2.2    | 1.1    | -1.1   | Down    |
|  | Roger Clemens     | BOS  | 2.0    | 1.0    | -1.0   | Cold    |
|  +-------------------+------+--------+--------+--------+---------+
+---------------------------------------------------------------------------+
```

---

# 6. Clutch/Choke System

## Overview

Tracks performance in high-leverage situations. Clutch plays boost ratings; chokes penalize.

**IMPORTANT:** Most situational clutch moments require **close game** (within 2 runs).

```javascript
function isCloseGame(scoreDifferential) {
  return Math.abs(scoreDifferential) <= 2;
}
```

## CLUTCH Triggers (Positive)

### Walk-Off Situations (No close game required - inherent)

| Trigger | Clutch Value |
|---------|--------------|
| Walk-off single | +2 |
| Walk-off XBH (2B/3B) | +2 |
| Walk-off HR | +3 |
| Walk-off walk/HBP | +1 |

### Situational Hitting (Close game required)

| Trigger | Clutch Value | Close Game? |
|---------|--------------|-------------|
| Go-ahead RBI in 7th+ | +1 | **Yes** |
| Game-tying RBI in 9th+ | +2 | **Yes** |
| 2-out RBI (any inning) | +1 | **Yes** |
| Bases loaded hit | +1 | **Yes** |
| Grand slam | +2 | No |
| RBI with 2 outs and RISP | +1 | **Yes** |
| Hit on 0-2 count | +1 | **Yes** |
| ~~Hit in 3-0 or 3-1 count~~ | ~~+1~~ | **REMOVED** |

### Pitching Clutch

| Trigger | Clutch Value | Close Game? |
|---------|--------------|-------------|
| Strikeout to end inning with RISP | +1 | Yes |
| Strikeout to end inning with bases loaded | +2 | Yes |
| Getting out of bases-loaded jam (0 runs) | +2 | Yes |
| Shutdown inning after team scores 3+ runs | +1 | Yes |
| **Reliever 3+ IP, 0-1 ER** | **+2** | No (bullpen saver) |
| Scoreless relief appearance (2+ IP) | +1 | Yes |
| Save conversion | +1 | No |
| Hold (7th or 8th inning, maintain lead) | +1 | Yes |
| **Inherited runner escape (RISP, 0 runs)** | **+1** | Yes |
| **Inherited runner escape (bases loaded, 0 runs)** | **+2** | Yes |
| Picking off runner to end inning | +2 | Yes |
| Complete game | +1 | No |
| Shutout | +2 | No |
| No-hitter | +3 | No |
| Perfect game | +4 | No |

### Defensive Clutch

| Trigger | Clutch Value | Notes |
|---------|--------------|-------|
| Caught stealing to end inning | +1 | Close game |
| Outfield assist (throw out runner) | +1 | Close game |
| Double play turned with RISP | +1 | Close game |
| Diving play for out (no RISP) | +0.5 | Close game |
| Diving play saves run | +1 | Close game |
| Diving play saves game (late innings) | +2 | Close game |
| Robbed home run | +2 | Always |
| Pickoff | +1 | Close game |

### Baserunning Clutch

| Trigger | Clutch Value |
|---------|--------------|
| Stolen base leading to run scored | +1 |
| Taking extra base that leads to run | +1 |
| Tag-up from 3rd on shallow fly | +1 |
| **Score tying/go-ahead run on sac fly (7th+)** | **+0.5** |

## CHOKE Triggers (Negative)

### Batting Chokes

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

### Pitching Chokes

| Trigger | Choke Value |
|---------|-------------|
| Blown save | +2 |
| Giving up go-ahead run in 7th+ | +1 |
| Giving up game-tying run in 9th+ | +2 |
| Walking in a run | +1 |
| Wild pitch allowing run | +1 |
| ~~Balk allowing run~~ | ~~+1~~ | **REMOVED (not in SMB4)** |
| Giving up grand slam | +2 |
| Hit batter that forces in run | +1 |
| Giving up 3+ runs in an inning | +1 |
| Giving up 5+ runs in an inning | +2 |

### Defensive Chokes

| Trigger | Choke Value |
|---------|-------------|
| Error allowing run | +1 |
| Error allowing 2+ runs | +2 |
| Error on routine play | +1 |
| Passed ball allowing run | +1 |
| Missed catch on diving/leaping attempt | +1 |
| Throwing error allowing extra base | +1 |
| ~~Catcher interference~~ | ~~+1~~ | **REMOVED (not in SMB4)** |
| Fielder's choice when out at home was available | +1 |

### Baserunning Chokes

| Trigger | Choke Value |
|---------|-------------|
| TOOTBLAN | +1 |
| Caught stealing to end inning | +1 |
| Picked off to end inning | +2 |
| Picked off (not ending inning) | +1 |
| Out at home on tag-up | +1 |
| Missing sign (running into out) | +1 |

---

# 7. Fame Bonus/Boner System

## Pre-Season Fame Assignment

| Criteria | Fame Value | Examples |
|----------|------------|----------|
| **S-Grade (Legend)** | +3 | Babe Ruth, Willie Mays |
| **A+ Grade with HOF status** | +2 | Mike Trout, Ken Griffey Jr |
| **A Grade (Star)** | +1 | Current stars, former all-stars |
| **B+ Grade or lower** | 0 | Regular players |
| **Known fan favorites** | +1 | Cult heroes, beloved players |
| **Known villains/controversial** | -1 | Dirty players, scandals |
| **Rookie (first season)** | 0 | No reputation yet |

## Fame Bonus (+Fame) Triggers

| Category | Trigger | Fame Value |
|----------|---------|------------|
| **Walk-offs** | Walk-off single | +1 |
| | Walk-off HR | +2 |
| | Walk-off grand slam | +3 |
| **Spectacular** | Grand slam | +1 |
| | Cycle | +2 |
| | Inside-the-park HR | +2 |
| | Robbing HR | +2 |
| **Pitching** | No-hitter | +3 |
| | Perfect game | +5 |
| | 15+ K game | +2 |
| **Streaks** | 10+ game hit streak | +1 |
| | 20+ game hit streak | +2 |
| **Hustle** | Diving catch (saves run, close game) | +1 |
| | Outfield assist | +1 |

## Fame Boner (-Fame) Triggers

| Category | Trigger | Fame Value |
|----------|---------|------------|
| **Strikeouts** | Golden Sombrero (4+ K) | -1 |
| | K on pitch way outside zone | -1 |
| **Errors** | Error allowing run | -1 |
| | Multiple errors in game | -2 |
| **Baserunning** | TOOTBLAN | -1 |
| | Picked off to end inning | -1 |
| **Pitching** | Giving up 10+ runs | -2 |
| | Walking in a run | -1 |
| **Embarrassing** | Struck out on intentional walk pitchout | -2 |
| | Thrown out at home by outfielder | -1 |

## Two-Way Player Fame Safeguard

Two-way players don't get Fame bonuses for hits (expected to hit well):

| Event | Regular Pitcher | Two-Way Player |
|-------|-----------------|----------------|
| Getting a hit | +1 | **No bonus** |
| Hitting a HR | +2 | **+1** (reduced) |
| Walk-off hit | Normal | Normal |

---

# 8. All-Star Voting

## Timing

All-Star break triggers at **60% of games played** in the season.

Example: 40-game season -> All-Star break after Game 24.

## Voting Formula with Normalization

**IMPORTANT:** Components are normalized to 0-100 scale before weighting to ensure fair contribution.

```javascript
function scaleToRange(value, min, max, targetMin = 0, targetMax = 100) {
  if (max === min) return targetMin;
  return ((value - min) / (max - min)) * (targetMax - targetMin) + targetMin;
}

function calculateVotesScaled(player, allPlayers) {
  const warMin = Math.min(...allPlayers.map(p => p.war));
  const warMax = Math.max(...allPlayers.map(p => p.war));
  const clutchMin = Math.min(...allPlayers.map(p => p.netClutch));
  const clutchMax = Math.max(...allPlayers.map(p => p.netClutch));
  const narrativeMin = Math.min(...allPlayers.map(p => p.narrative));
  const narrativeMax = Math.max(...allPlayers.map(p => p.narrative));

  const warScaled = scaleToRange(player.war, warMin, warMax);
  const clutchScaled = scaleToRange(player.netClutch, clutchMin, clutchMax);
  const narrativeScaled = scaleToRange(player.narrative, narrativeMin, narrativeMax);

  // Apply weights (all now on 0-100 scale)
  const votes = (warScaled * 0.50) + (clutchScaled * 0.30) + (narrativeScaled * 0.20);

  return Math.round(votes);
}
```

**Result:** Best WAR player gets max 50 from WAR, best Clutch gets max 30, best Narrative gets max 20. Maximum possible: 100.

## Selection Rules

1. Top vote-getters at each position
2. Minimum team representation (at least 1 per team)
3. Pitchers selected by pWAR + pitcher-specific clutch
4. Reserves fill remaining roster spots

## All-Star Rewards

All-Stars receive a **randomized trait** (70% positive, 30% negative).

If player already has 2 traits, UI prompts for trait replacement.

---

## All-Star Roster Calculation

```javascript
function calculateAllStarRosters() {
  const allPlayers = getAllActivePlayers();
  const positionPlayers = allPlayers.filter(p => p.playerType === 'POSITION');
  const pitchers = allPlayers.filter(p => p.playerType === 'PITCHER');

  // Calculate votes for all players
  const positionVotes = positionPlayers.map(p => ({
    player: p,
    votes: calculateVotesScaled(p, positionPlayers),
    position: p.position
  })).sort((a, b) => b.votes - a.votes);

  const pitcherVotes = pitchers.map(p => ({
    player: p,
    votes: calculatePitcherVotes(p, pitchers),
    position: p.position  // SP, RP, CP
  })).sort((a, b) => b.votes - a.votes);

  // Select starters by position
  // Total: 22 All-Stars (13 position players + 8 pitchers + 1 flex)
  const POSITION_STARTERS = {
    C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1,
    LF: 1, CF: 1, RF: 1  // 8 position starters (no DH starter)
  };
  const PITCHER_STARTERS = {
    SP: 4, RP: 4  // 4 starting pitchers, 4 relievers (includes closers)
  };
  const POSITION_RESERVES = 5;  // 13 total - 8 starters = 5 reserves
  const FLEX_SPOTS = 1;  // 1 additional player of any position
  const TOTAL_ALL_STARS = 22;

  const starters = { position: {}, pitchers: {} };
  const reserves = { position: [], pitchers: [] };
  const flex = [];
  const selectedIds = new Set();

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Select 8 Position Player Starters
  // ═══════════════════════════════════════════════════════════════
  for (const [position, count] of Object.entries(POSITION_STARTERS)) {
    const candidates = positionVotes.filter(p =>
      p.position === position && !selectedIds.has(p.player.id)
    );

    starters.position[position] = [];
    for (let i = 0; i < count && i < candidates.length; i++) {
      starters.position[position].push(candidates[i]);
      selectedIds.add(candidates[i].player.id);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Select 8 Pitcher Starters (4 SP + 4 RP/CP)
  // ═══════════════════════════════════════════════════════════════
  for (const [position, count] of Object.entries(PITCHER_STARTERS)) {
    // For RP category, include both RP and CP
    const positionMatch = position === 'RP' ? ['RP', 'CP'] : [position];
    const candidates = pitcherVotes.filter(p =>
      positionMatch.includes(p.position) && !selectedIds.has(p.player.id)
    );

    starters.pitchers[position] = [];
    for (let i = 0; i < count && i < candidates.length; i++) {
      starters.pitchers[position].push(candidates[i]);
      selectedIds.add(candidates[i].player.id);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Select 5 Position Player Reserves
  // ═══════════════════════════════════════════════════════════════
  const positionReserveCandidates = positionVotes
    .filter(p => !selectedIds.has(p.player.id))
    .slice(0, POSITION_RESERVES);

  for (const candidate of positionReserveCandidates) {
    reserves.position.push(candidate);
    selectedIds.add(candidate.player.id);
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: Ensure minimum 1 player per team (uses reserve/flex spots)
  // ═══════════════════════════════════════════════════════════════
  const teams = getAllTeams();
  for (const team of teams) {
    const hasPlayer = [...selectedIds].some(id =>
      getPlayer(id).currentTeam === team.id
    );

    if (!hasPlayer) {
      // Find best unselected player from this team
      const teamPlayer = [...positionVotes, ...pitcherVotes]
        .filter(p => p.player.currentTeam === team.id && !selectedIds.has(p.player.id))
        .sort((a, b) => b.votes - a.votes)[0];

      if (teamPlayer) {
        // Add to appropriate reserve category
        if (teamPlayer.player.playerType === 'PITCHER') {
          reserves.pitchers.push(teamPlayer);
        } else {
          reserves.position.push(teamPlayer);
        }
        selectedIds.add(teamPlayer.player.id);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 5: Select 1 Flex Player (highest votes among unselected)
  // ═══════════════════════════════════════════════════════════════
  const flexCandidate = [...positionVotes, ...pitcherVotes]
    .filter(p => !selectedIds.has(p.player.id))
    .sort((a, b) => b.votes - a.votes)[0];

  if (flexCandidate && selectedIds.size < TOTAL_ALL_STARS) {
    flex.push(flexCandidate);
    selectedIds.add(flexCandidate.player.id);
  }

  // Build complete roster
  const allStarters = [
    ...Object.values(starters.position).flat(),
    ...Object.values(starters.pitchers).flat()
  ];
  const allReserves = [...reserves.position, ...reserves.pitchers];

  return {
    starters,
    reserves,
    flex,
    all: [...allStarters, ...allReserves, ...flex],
    summary: {
      positionStarters: Object.values(starters.position).flat().length,
      positionReserves: reserves.position.length,
      pitcherStarters: Object.values(starters.pitchers).flat().length,
      pitcherReserves: reserves.pitchers.length,
      flex: flex.length,
      total: selectedIds.size
    }
  };
}

function calculatePitcherVotes(pitcher, allPitchers) {
  const pwarMin = Math.min(...allPitchers.map(p => p.seasonStats.fullSeason.pWAR));
  const pwarMax = Math.max(...allPitchers.map(p => p.seasonStats.fullSeason.pWAR));
  const clutchMin = Math.min(...allPitchers.map(p => p.seasonStats.fullSeason.netClutch));
  const clutchMax = Math.max(...allPitchers.map(p => p.seasonStats.fullSeason.netClutch));
  const fameMin = Math.min(...allPitchers.map(p => p.fame || 0));
  const fameMax = Math.max(...allPitchers.map(p => p.fame || 0));

  const pwarScaled = scaleToRange(pitcher.seasonStats.fullSeason.pWAR, pwarMin, pwarMax);
  const clutchScaled = scaleToRange(pitcher.seasonStats.fullSeason.netClutch, clutchMin, clutchMax);
  const fameScaled = scaleToRange(pitcher.fame || 0, fameMin, fameMax);

  // Pitchers: 60% pWAR, 30% clutch, 10% fame (matches position player formula)
  return Math.round((pwarScaled * 0.60) + (clutchScaled * 0.30) + (fameScaled * 0.10));
}
```

---

## All-Star Trait Assignment

```javascript
const ALL_STAR_TRAIT_POOL = {
  POSITIVE: [
    'Rally Starter', 'RBI Hero', 'Stealer', 'Fastball Hitter',
    'Off-Speed Hitter', 'K Collector', 'Rally Stopper', 'Gets Ahead'
  ],
  NEGATIVE: [
    'RBI Zero', 'Easy Target', 'BB Prone', 'Falls Behind',
    'Meltdown', 'Base Jogger'
  ]
};

function assignAllStarTrait(player) {
  // 70% positive, 30% negative
  const isPositive = Math.random() < 0.70;
  const pool = isPositive ? ALL_STAR_TRAIT_POOL.POSITIVE : ALL_STAR_TRAIT_POOL.NEGATIVE;

  // Filter out traits player already has
  const existingTraits = player.traits.map(t => t.name);
  const availableTraits = pool.filter(t => !existingTraits.includes(t));

  if (availableTraits.length === 0) {
    // All traits in pool already owned, pick from full pool
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return availableTraits[Math.floor(Math.random() * availableTraits.length)];
}

function applyAllStarTrait(player, trait) {
  const newTrait = {
    name: trait,
    source: 'ALL_STAR',
    earnedSeason: currentSeason
  };

  if (player.traits.length < 2) {
    // Room for new trait
    player.traits.push(newTrait);
    return { action: 'ADDED', trait, replaced: null };
  } else {
    // Must replace - return pending state for UI
    return {
      action: 'PENDING_REPLACEMENT',
      trait,
      existingTraits: player.traits
    };
  }
}
```

---

## All-Star Break Display Screens

### Screen 1: All-Star Team Announcement

```
+==================================================================+
|                    ⭐ ALL-STAR BREAK ⭐                           |
|                      Season 4 - July 15                           |
+==================================================================+
|                                                                   |
|  🎉 22 ALL-STARS HAVE BEEN SELECTED! 🎉                           |
|                                                                   |
+------------------------------------------------------------------+
|                   STARTERS (8 Position + 8 Pitchers)              |
+------------------------------------------------------------------+
|                                                                   |
|  POSITION PLAYERS (8)                    PITCHERS (8)             |
|  ────────────────────                    ────────────             |
|  C   Yogi Berra (Yankees)     78 votes   SP  Sandy Koufax (Dodgers) 92 |
|  1B  Willie McCovey (Giants)  81 votes   SP  Juan Marichal (Giants) 88 |
|  2B  Jackie Robinson (Dodgers) 74 votes  SP  Bob Gibson (Cardinals) 85 |
|  3B  Brooks Robinson (Orioles) 72 votes  SP  Warren Spahn (Braves)   82 |
|  SS  Ernie Banks (Cubs)       85 votes   RP  Hoyt Wilhelm (Orioles)  76 |
|  LF  Ted Williams (Red Sox)   89 votes   RP  Stu Miller (Giants)     71 |
|  CF  Willie Mays (Giants)     95 votes   RP  Roy Face (Pirates)      79 |
|  RF  Hank Aaron (Braves)      91 votes   RP  Elroy Face (Pirates)    68 |
|                                                                   |
+------------------------------------------------------------------+
|                  RESERVES (5 Position Players)                    |
+------------------------------------------------------------------+
|  Roberto Clemente (Pirates) 70 | Mickey Mantle (Yankees) 68       |
|  Duke Snider (Dodgers) 65     | Frank Robinson (Reds) 63          |
|  Harmon Killebrew (Twins) 61  |                                   |
|                                                                   |
+------------------------------------------------------------------+
|                      FLEX SELECTION (1)                           |
+------------------------------------------------------------------+
|  Whitey Ford (Yankees) 60 votes - Highest remaining vote-getter   |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  📊 ROSTER BREAKDOWN: 13 Position Players + 8 Pitchers + 1 Flex   |
|  📊 TEAM REPRESENTATION                                           |
|  Giants: 4 | Dodgers: 3 | Yankees: 3 | Cardinals: 2 | Others: 10  |
|                                                                   |
|                    [CONTINUE TO TRAIT REWARDS]                    |
|                                                                   |
+==================================================================+
```

### Screen 2: Trait Rewards Overview

```
+==================================================================+
|                  ⭐ ALL-STAR TRAIT REWARDS ⭐                      |
+==================================================================+
|                                                                   |
|  Each All-Star receives a new trait! (70% positive, 30% negative) |
|                                                                   |
+------------------------------------------------------------------+
|  PLAYER               TRAIT AWARDED          TYPE    STATUS       |
+------------------------------------------------------------------+
|                                                                   |
|  Willie Mays          Rally Starter          ✅ +    Added        |
|  Hank Aaron           RBI Hero               ✅ +    Added        |
|  Ted Williams         Fastball Hitter        ✅ +    Added        |
|  Sandy Koufax         K Collector            ✅ +    Added        |
|  Roberto Clemente     Meltdown               ❌ -    Added        |
|  Mickey Mantle        Stealer                ✅ +    ⚠️ REPLACE   |
|  Duke Snider          Off-Speed Hitter       ✅ +    Added        |
|  Juan Marichal        Rally Stopper          ✅ +    Added        |
|  Yogi Berra           BB Prone               ❌ -    Added        |
|  ...                  ...                    ...     ...          |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  ⚠️ 3 PLAYERS NEED TRAIT REPLACEMENT (already have 2 traits)      |
|                                                                   |
|  [VIEW ALL 22 PLAYERS]        [HANDLE REPLACEMENTS]               |
|                                                                   |
+==================================================================+
```

### Screen 3: Individual Trait Replacement (when needed)

```
+==================================================================+
|              ⭐ TRAIT REPLACEMENT - Mickey Mantle ⭐               |
+==================================================================+
|                                                                   |
|  Mickey Mantle earned: STEALER (✅ Positive)                      |
|                                                                   |
|  Current Traits (max 2):                                          |
|  ┌──────────────────────────────────────────────────────────┐    |
|  │  1. [RBI Hero]          Source: MVP Award (S2)           │    |
|  │     Effect: +10% RBI in close games                      │    |
|  │                                                          │    |
|  │  2. [Fastball Hitter]   Source: All-Star (S3)           │    |
|  │     Effect: +15% vs fastballs                            │    |
|  └──────────────────────────────────────────────────────────┘    |
|                                                                   |
|  New Trait: [STEALER]                                             |
|  Effect: +25% stolen base success rate                            |
|                                                                   |
|  ─────────────────────────────────────────────────────────────    |
|                                                                   |
|  SELECT ACTION:                                                   |
|                                                                   |
|  ○ Replace "RBI Hero" with "Stealer"                              |
|  ○ Replace "Fastball Hitter" with "Stealer"                       |
|  ○ Decline new trait (keep current traits)                        |
|                                                                   |
|                         [CONFIRM]                                 |
|                                                                   |
+==================================================================+
```

### Screen 4: All-Star Game Results (Simulated)

```
+==================================================================+
|                   ⭐ ALL-STAR GAME RESULTS ⭐                      |
|                     July 15 - Neutral Site                        |
+==================================================================+
|                                                                   |
|              AMERICAN LEAGUE  5  -  3  NATIONAL LEAGUE            |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  🏆 ALL-STAR GAME MVP: Willie Mays (Giants)                       |
|     2-for-3, HR, 2 RBI, Spectacular diving catch                  |
|                                                                   |
|  ─────────────────────────────────────────────────────────────    |
|                                                                   |
|  GAME HIGHLIGHTS:                                                 |
|  • Willie Mays homered off Whitey Ford in the 3rd                 |
|  • Sandy Koufax struck out 4 in 2 perfect innings                 |
|  • Ted Williams drove in the go-ahead run in the 7th              |
|                                                                   |
|  TOP PERFORMERS:                                                  |
|  ├─ Willie Mays: 2-3, HR, 2 RBI                                   |
|  ├─ Hank Aaron: 1-2, 2B, RBI                                      |
|  ├─ Sandy Koufax: 2 IP, 0 H, 4 K                                  |
|  └─ Ted Williams: 1-3, RBI                                        |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  📊 AWARDS SUMMARY:                                               |
|  • 22 players selected to All-Star team                           |
|  • 22 traits awarded (15 positive, 7 negative)                    |
|  • 3 trait replacements made                                      |
|  • Willie Mays earns All-Star MVP (+4 Fan Happiness)              |
|                                                                   |
|           [RETURN TO REGULAR SEASON]                              |
|                                                                   |
+==================================================================+
```

---

## All-Star Break Execution Flow (Complete)

```javascript
async function triggerAllStarBreak() {
  season.phase = 'ALL_STAR_BREAK';

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Calculate All-Star Rosters
  // ═══════════════════════════════════════════════════════════════
  const rosters = calculateAllStarRosters();

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Display Team Announcement Screen
  // ═══════════════════════════════════════════════════════════════
  await displayAllStarAnnouncementScreen(rosters);

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Assign Traits to All Players
  // ═══════════════════════════════════════════════════════════════
  const traitAssignments = [];
  const pendingReplacements = [];

  for (const entry of rosters.all) {
    const player = entry.player;
    const trait = assignAllStarTrait(player);
    const result = applyAllStarTrait(player, trait);

    if (result.action === 'PENDING_REPLACEMENT') {
      pendingReplacements.push({ player, trait, existingTraits: result.existingTraits });
    } else {
      traitAssignments.push({
        player,
        trait,
        isPositive: ALL_STAR_TRAIT_POOL.POSITIVE.includes(trait),
        status: 'ADDED'
      });
    }

    // Record award
    player.awards.push({ type: 'ALL_STAR', season: currentSeason });

    // Update fan happiness
    updateFanHappiness(getTeam(player.currentTeam), {
      event: 'ALL_STAR_SELECTION',
      player
    });

    // Log transaction
    logTransaction('ALL_STAR_SELECTED', {
      playerId: player.id,
      votes: entry.votes,
      position: entry.position,
      trait
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: Display Trait Rewards Overview
  // ═══════════════════════════════════════════════════════════════
  await displayTraitRewardsScreen(traitAssignments, pendingReplacements);

  // ═══════════════════════════════════════════════════════════════
  // STEP 5: Handle Trait Replacements (User Input Required)
  // ═══════════════════════════════════════════════════════════════
  for (const pending of pendingReplacements) {
    const userChoice = await displayTraitReplacementScreen(pending);

    if (userChoice.action === 'REPLACE') {
      // Remove old trait
      pending.player.traits = pending.player.traits.filter(
        t => t.name !== userChoice.replacedTrait
      );
      // Add new trait
      pending.player.traits.push({
        name: pending.trait,
        source: 'ALL_STAR',
        earnedSeason: currentSeason
      });

      traitAssignments.push({
        player: pending.player,
        trait: pending.trait,
        isPositive: ALL_STAR_TRAIT_POOL.POSITIVE.includes(pending.trait),
        status: 'REPLACED',
        replacedTrait: userChoice.replacedTrait
      });
    } else {
      // User declined
      traitAssignments.push({
        player: pending.player,
        trait: pending.trait,
        isPositive: ALL_STAR_TRAIT_POOL.POSITIVE.includes(pending.trait),
        status: 'DECLINED'
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 6: Simulate All-Star Game
  // ═══════════════════════════════════════════════════════════════
  const gameResult = simulateAllStarGame(rosters);
  const mvp = gameResult.mvp;

  // Award ASG MVP
  mvp.awards.push({ type: 'ALL_STAR_MVP', season: currentSeason });
  updateFanHappiness(getTeam(mvp.currentTeam), {
    event: 'ALL_STAR_MVP',
    player: mvp,
    amount: 4
  });

  logTransaction('ALL_STAR_MVP', { playerId: mvp.id });

  // ═══════════════════════════════════════════════════════════════
  // STEP 7: Display Game Results
  // ═══════════════════════════════════════════════════════════════
  await displayAllStarGameResultsScreen(gameResult, traitAssignments);

  // ═══════════════════════════════════════════════════════════════
  // STEP 8: Log Completion and Return to Regular Season
  // ═══════════════════════════════════════════════════════════════
  logTransaction('ALL_STAR_COMPLETE', {
    allStarCount: rosters.all.length,
    traitsAwarded: traitAssignments.length,
    positiveTraits: traitAssignments.filter(t => t.isPositive).length,
    negativeTraits: traitAssignments.filter(t => !t.isPositive).length,
    mvp: mvp.id
  });

  season.allStars = rosters.all.map(e => e.player.id);
  season.allStarMVP = mvp.id;
  season.allStarBreakComplete = true;
  season.phase = 'REGULAR_SEASON';
}

function simulateAllStarGame(rosters) {
  // Simple simulation - pick MVP from top performers
  const candidates = rosters.all.slice(0, 10);  // Top 10 vote-getters
  const mvpIndex = Math.floor(Math.random() * candidates.length);
  const mvp = candidates[mvpIndex].player;

  // Generate random score
  const alScore = Math.floor(Math.random() * 8) + 2;
  const nlScore = Math.floor(Math.random() * 8) + 2;

  return {
    alScore,
    nlScore,
    winner: alScore > nlScore ? 'AL' : 'NL',
    mvp,
    highlights: generateAllStarHighlights(rosters, mvp)
  };
}

function generateAllStarHighlights(rosters, mvp) {
  return [
    `${mvp.name} had a spectacular performance`,
    `${rosters.starters.SP[0].player.name} dominated in 2 innings`,
    `The crowd went wild for the defensive plays`
  ];
}
```

---

# 9. Awards System

## Award Categories & Criteria

### MVP (Most Valuable Player)

| Factor | Weight |
|--------|--------|
| Total WAR | 50% |
| Clutch Score | 25% |
| Narrative | 20% |
| Team Success | 5% |

**Winner Reward:**
- Random **positive** trait
- +15% salary bonus
- +1 Fame
- +10 Fan Happiness
- **NO ratings boosts**

**Runners-up (2nd and 3rd):**
- Random trait (70% positive, 30% negative)
- +8% salary bonus (runner-up), +3% salary bonus (3rd)
- +3 happiness (runner-up), +1 happiness (3rd)

---

### Cy Young Award

| Factor | Weight |
|--------|--------|
| pWAR | 50% |
| FIP / True ERA | 25% |
| Clutch Score | 20% |
| Narrative | 5% |

**NO traditional stats (wins/losses).**

**Winner Reward:**
- Random **positive** trait
- +15% salary bonus
- +1 Fame
- +8 Fan Happiness
- **NO ratings boosts**

**Runners-up (2nd and 3rd):**
- Random trait (70% positive, 30% negative)
- +8% salary bonus (runner-up), +3% salary bonus (3rd)
- +3 happiness (runner-up), +1 happiness (3rd)

**Cy Young Voting Implementation:**
```javascript
const CY_YOUNG_VOTING = {
  WEIGHTS: {
    pWAR: 0.50,
    clutchFactor: 0.25,
    wins: 0.10,
    narrative: 0.10,
    team_success: 0.05
  },
  AWARDS: {
    WINNER: { happiness: 8, salary_bonus: 0.15, fame_increase: 1 },
    RUNNER_UP: { happiness: 3, salary_bonus: 0.08, fame_increase: 0 },
    THIRD_PLACE: { happiness: 1, salary_bonus: 0.03, fame_increase: 0 }
  }
};

function calculateCyYoungVoting(pitchers, season) {
  const eligiblePitchers = pitchers.filter(p =>
    p.seasonStats.inningsPitched >= scaleThreshold(100, season.length) ||
    p.seasonStats.saves >= scaleThreshold(20, season.length) ||
    p.seasonStats.appearances >= scaleThreshold(50, season.length)
  );

  const votingResults = eligiblePitchers.map(p => ({
    player: p,
    score: calculateCyYoungScore(p, season),
    breakdown: {
      pWAR: getPitchingWARScore(p),
      clutch: getClutchScore(p),
      wins: getWinsScore(p),
      narrative: getNarrativeScore(p),
      teamSuccess: getTeamSuccessScore(p, season)
    }
  }));

  votingResults.sort((a, b) => b.score - a.score);

  return {
    winner: votingResults[0],
    runnerUp: votingResults[1],
    thirdPlace: votingResults[2],
    allVotes: votingResults
  };
}
```

---

### Gold Glove (by position)

| Factor | Weight |
|--------|--------|
| fWAR | 60% |
| Fielding % | 20% |
| Eye Test (Fame + Manual Override) | 20% |

**Positions:** C, 1B, 2B, 3B, SS, LF, CF, RF, UTIL, P

**Reward:**
- +5 to Fielding rating
- +4 Fan Happiness (per winner on team)
- **NO arm bonus**

**Platinum Glove** (highest fWAR among Gold Glove winners): Recognition only.

---

### Silver Slugger (by position)

| Factor | Weight |
|--------|--------|
| bWAR | 60% |
| OPS+ / wRC+ | 25% |
| Clutch Hitting | 15% |

**Reward:**
- +3 Power
- +3 Contact
- +4 Fan Happiness (per winner on team)
- **NO trait** (too many winners per season would inflate league)

---

### Rookie of the Year

Same as MVP criteria, filtered to rookies only.

**Winner Reward:**
- Random trait (70% positive, 30% negative)
- +6 Fan Happiness
- **NO ratings boosts**

**No runner-up award.**

---

### Reliever of the Year

| Factor | Weight |
|--------|--------|
| pWAR (relief appearances only) | 50% |
| Clutch Score | 35% |
| Narrative | 15% |

**Winner Reward:**
- **Clutch trait** added (or replace existing trait if at 2)
- +5 Fan Happiness
- **NO ratings boosts**

**Runner-up:**
- Random trait (70% positive, 30% negative)
- +2 Fan Happiness

---

### Kara Kawaguchi Award

Player must be in **bottom 25% of salary at their position** (low-paid players only).

| Factor | Weight |
|--------|--------|
| WAR Percentile vs Salary Percentile (at position) | 50% |
| Clutch Score | 30% |
| Games without negative mojo | 20% |

**Eligibility:** Salary percentile ≤ 25% at position (the "bargain bin" players).

**Formula:** Score = (WAR %ile - Salary %ile) weighted by criteria above.

**Example:** A $1M SS (5th percentile salary among SS) who produces 60th percentile SS WAR has a +55% delta - strong Kara Kawaguchi candidate.

**Reward:**
- Random **positive** trait
- +5 Fan Happiness (great story for fans)
- **NO ratings boosts**

---

### Bench Player of the Year

Player started <50% of team games.

| Factor | Weight |
|--------|--------|
| WAR per game played | 40% |
| Pinch-hit performance | 30% |
| Clutch Score | 30% |

**Reward:**
- **Pinch Perfect** OR **Utility** trait (manager's choice)
- +3 Fan Happiness
- **NO ratings boosts**

---

### Manager of the Year

| Factor | Weight |
|--------|--------|
| mWAR | 60% |
| Team overperformance vs Team Salary Expectation | 40% |

**Uses Team Salary Expectation System** (see Section 12) - the same position-based salary percentile system used for fan happiness. This creates alignment: the same expectations that determine fan happiness also determine Manager of the Year.

```javascript
function calculateManagerOfYearScore(team, allPlayers, season) {
  // Get team's salary-based expectation
  const teamExpectation = calculateTeamSalaryExpectation(team, allPlayers, season.games);
  const expectedWinPct = teamExpectation.expectedWinPct;

  // Factor in prior season (60/40 split with salary expectation)
  const priorWinPct = getPriorSeasonWinPct(team, season.previousSeason);
  const blendedExpectation = priorWinPct !== null
    ? (expectedWinPct * 0.60) + (priorWinPct * 0.40)
    : expectedWinPct;

  const actualWinPct = team.wins / (team.wins + team.losses);
  const overperformance = actualWinPct - blendedExpectation;

  // Manager score = mWAR (60%) + Overperformance (40%)
  const mwarScore = team.mWAR * 0.60;
  const overperformScore = overperformance * 100 * 0.40;  // Convert to points

  return mwarScore + overperformScore;
}
```

**Reward:**
- +5 to manager's team bonus pool for EOS adjustments
- +5 Fan Happiness

---

### League Leader Rewards

| Category | Reward |
|----------|--------|
| HR Leader | +5 Power |
| AVG Leader | +5 Contact |
| RBI Leader | +3 Power, +2 Contact |
| SB Leader | +5 Speed |
| Runs Scored Leader | +5 Speed |
| ERA Leader | +3 Accuracy, +2 Junk |
| Lowest WHIP | +5 to Accuracy, Junk, OR Velocity (choice) |
| Most Pitching Ks | +5 to Junk OR Velocity (choice) |
| Most Saves | Clutch trait (no ratings boost) |
| Wins Leader | +2 to any pitching rating |
| Most Batting Ks | **Whiffer trait added** |
| Most Batting BBs | +5 Speed |
| Most Pitching BBs | **BB Prone trait added** |
| Best Hitting Pitcher | +15 Power, +15 Contact |
| WAR Leader | **No boost (will win other awards)** |

---

### Bust of the Year

Player who underperformed the most against **salary-based expectations at their position**.

**Eligibility:** Must be in top 50% of salary at their position (can't be a bust if you weren't expected to produce).

**Formula:** Largest negative delta between WAR Percentile and Salary Percentile at position.

**Penalty:**
- **Choker trait** added
- -5 Fan Happiness

---

### Comeback Player of the Year

**Eligibility:** Player must have had **negative EOS adjustments last season** (was underperforming, possibly demoted, written off, or changed teams).

**Criteria:** Among eligible players, the one with the **largest positive EOS adjustment this season**.

**Season 1:** No award (no prior season data). Consider using Kara Kawaguchi Award to recognize overperformers instead.

**The Story:** This captures players who were declining, injured, or struggling last year but bounced back. Could be a veteran proving doubters wrong, a player recovering from injury, or someone who found new life on a new team.

```javascript
function getComebackPlayerCandidates(players, currentSeason, lastSeason) {
  // Must have had negative total EOS adjustment last season
  const eligible = players.filter(p => {
    const lastSeasonAdj = getPlayerEOSAdjustment(p, lastSeason);
    return lastSeasonAdj.total < 0;  // Was underperforming
  });

  // Rank by this season's positive EOS adjustment
  return eligible
    .map(p => ({
      player: p,
      lastSeasonAdj: getPlayerEOSAdjustment(p, lastSeason).total,
      thisSeasonAdj: getPlayerEOSAdjustment(p, currentSeason).total
    }))
    .filter(p => p.thisSeasonAdj > 0)  // Must be positive this year
    .sort((a, b) => b.thisSeasonAdj - a.thisSeasonAdj);
}
```

**Reward:**
- **Clutch trait** added
- +5 Fan Happiness (great story for fans)

---

# 10. End-of-Season Ratings Adjustments

## Overview

EOS adjustments are based on **Position-Based Salary Percentiles** - comparing each player's salary and WAR against others at the same position. This creates a fair ROI-based system where high-paid players at their position are expected to produce top WAR at their position.

## The Formula

```
For each WAR component:
  1. Calculate player's salary percentile at their position
  2. Calculate player's WAR percentile at their position (for that WAR component)
  3. Performance Delta = WAR Percentile - Salary Percentile
  4. Raw Adjustment = Performance Delta x Salary Factor
  5. Final Adjustment = Round to nearest whole number, cap at +/-10
  6. Auto-distribute points equally within rating category
```

## Position-Based Salary Percentiles

```javascript
function getSalaryPercentileAtPosition(player, allPlayers) {
  const positionPeers = allPlayers.filter(p =>
    p.primaryPosition === player.primaryPosition
  );

  const salariesAtPosition = positionPeers.map(p => p.salary).sort((a, b) => a - b);
  const playerRank = salariesAtPosition.filter(s => s < player.salary).length;

  return playerRank / salariesAtPosition.length;  // 0.0 to 1.0
}

function getWARPercentileAtPosition(player, allPlayers, warComponent) {
  const positionPeers = allPlayers.filter(p =>
    p.primaryPosition === player.primaryPosition
  );

  const warsAtPosition = positionPeers.map(p => p.seasonWAR[warComponent]).sort((a, b) => a - b);
  const playerRank = warsAtPosition.filter(w => w < player.seasonWAR[warComponent]).length;

  return playerRank / warsAtPosition.length;  // 0.0 to 1.0
}
```

## Salary Percentile Tiers & Factors

| Salary Percentile | Tier | Positive Factor | Negative Factor |
|-------------------|------|-----------------|-----------------|
| **90-100%** (Top 10%) | Elite | 1.0 | 10.0 |
| **75-89%** | High | 2.0 | 7.0 |
| **50-74%** | Mid-High | 4.0 | 5.0 |
| **25-49%** | Mid-Low | 6.0 | 3.0 |
| **10-24%** | Low | 8.0 | 1.5 |
| **0-9%** (Bottom 10%) | Minimum | 10.0 | 1.0 |

**Design:** High-paid players (at their position) have small upside, large downside - you're paying for expected production. Low-paid players have large upside, small downside - overperformance is rewarded.

```javascript
function getSalaryFactor(salaryPercentile, isPositiveDelta) {
  const tier = salaryPercentile >= 0.90 ? 'elite' :
               salaryPercentile >= 0.75 ? 'high' :
               salaryPercentile >= 0.50 ? 'midHigh' :
               salaryPercentile >= 0.25 ? 'midLow' :
               salaryPercentile >= 0.10 ? 'low' : 'minimum';

  const factors = {
    elite:   { positive: 1.0,  negative: 10.0 },
    high:    { positive: 2.0,  negative: 7.0 },
    midHigh: { positive: 4.0,  negative: 5.0 },
    midLow:  { positive: 6.0,  negative: 3.0 },
    low:     { positive: 8.0,  negative: 1.5 },
    minimum: { positive: 10.0, negative: 1.0 }
  };

  return isPositiveDelta ? factors[tier].positive : factors[tier].negative;
}
```

## WAR Component -> Rating Category Mapping

| WAR Component | Applies To | Rating Categories | Auto-Distribution |
|---------------|------------|-------------------|-------------------|
| **bWAR** | All batters | Power, Contact | Split equally (odd point random) |
| **rWAR** | All runners | Speed | All to Speed |
| **fWAR** | All fielders | Fielding, Arm | Split equally (odd point random) |
| **pWAR** | All pitchers | Velocity, Junk, Accuracy | Split in thirds (remainder random) |

## Complete EOS Calculation

```javascript
function calculateEOSAdjustments(player, allPlayers, seasonLength) {
  const adjustments = { power: 0, contact: 0, speed: 0, fielding: 0, arm: 0,
                        velocity: 0, junk: 0, accuracy: 0 };

  const salaryPct = getSalaryPercentileAtPosition(player, allPlayers);
  const isPitcher = ['SP', 'RP', 'CP'].includes(player.primaryPosition);

  if (isPitcher) {
    // pWAR adjustment
    const pwarPct = getWARPercentileAtPosition(player, allPlayers, 'pWAR');
    const pwarDelta = pwarPct - salaryPct;
    const pwarFactor = getSalaryFactor(salaryPct, pwarDelta > 0);
    const pwarAdj = Math.round(pwarDelta * 100 * pwarFactor / 10);  // Scale to rating points
    const cappedPwar = Math.max(-10, Math.min(10, pwarAdj));

    // Auto-distribute to pitching ratings (thirds)
    const third = Math.floor(Math.abs(cappedPwar) / 3);
    const remainder = Math.abs(cappedPwar) % 3;
    const sign = cappedPwar > 0 ? 1 : -1;

    adjustments.velocity += sign * third;
    adjustments.junk += sign * third;
    adjustments.accuracy += sign * third;

    // Distribute remainder randomly
    const pitchStats = ['velocity', 'junk', 'accuracy'];
    for (let i = 0; i < remainder; i++) {
      const stat = pitchStats[Math.floor(Math.random() * 3)];
      adjustments[stat] += sign;
    }
  } else {
    // bWAR adjustment
    const bwarPct = getWARPercentileAtPosition(player, allPlayers, 'bWAR');
    const bwarDelta = bwarPct - salaryPct;
    const bwarFactor = getSalaryFactor(salaryPct, bwarDelta > 0);
    const bwarAdj = Math.round(bwarDelta * 100 * bwarFactor / 10);
    const cappedBwar = Math.max(-10, Math.min(10, bwarAdj));

    // Auto-distribute to Power/Contact (halves)
    const half = Math.floor(Math.abs(cappedBwar) / 2);
    const sign = cappedBwar > 0 ? 1 : -1;
    adjustments.power += sign * half;
    adjustments.contact += sign * half;
    if (Math.abs(cappedBwar) % 2 === 1) {
      adjustments[Math.random() < 0.5 ? 'power' : 'contact'] += sign;
    }

    // rWAR adjustment (all to Speed)
    const rwarPct = getWARPercentileAtPosition(player, allPlayers, 'rWAR');
    const rwarDelta = rwarPct - salaryPct;
    const rwarFactor = getSalaryFactor(salaryPct, rwarDelta > 0);
    const rwarAdj = Math.round(rwarDelta * 100 * rwarFactor / 10);
    adjustments.speed += Math.max(-10, Math.min(10, rwarAdj));

    // fWAR adjustment
    const fwarPct = getWARPercentileAtPosition(player, allPlayers, 'fWAR');
    const fwarDelta = fwarPct - salaryPct;
    const fwarFactor = getSalaryFactor(salaryPct, fwarDelta > 0);
    const fwarAdj = Math.round(fwarDelta * 100 * fwarFactor / 10);
    const cappedFwar = Math.max(-10, Math.min(10, fwarAdj));

    // Auto-distribute to Fielding/Arm (halves)
    const fHalf = Math.floor(Math.abs(cappedFwar) / 2);
    const fSign = cappedFwar > 0 ? 1 : -1;
    adjustments.fielding += fSign * fHalf;
    adjustments.arm += fSign * fHalf;
    if (Math.abs(cappedFwar) % 2 === 1) {
      adjustments[Math.random() < 0.5 ? 'fielding' : 'arm'] += fSign;
    }
  }

  return adjustments;
}
```

### Sample Calculations

| Player | Position | Salary %ile | bWAR %ile | Delta | Factor | Raw Adj | Capped |
|--------|----------|-------------|-----------|-------|--------|---------|--------|
| $12M CF | CF | 95% (Elite) | 98% | +3% | 1.0 | +0.3 | +0 |
| $12M CF | CF | 95% (Elite) | 60% | -35% | 10.0 | -35 | -10 |
| $3M SS | SS | 30% (Mid-Low) | 80% | +50% | 6.0 | +30 | +10 |
| $3M SS | SS | 30% (Mid-Low) | 15% | -15% | 3.0 | -4.5 | -5 |
| $1M 1B | 1B | 5% (Minimum) | 40% | +35% | 10.0 | +35 | +10 |

**Key Insight:** The $12M CF who is the highest-paid CF but only performs at 60th percentile among CFs gets heavily penalized (-10). Meanwhile, a $3M SS who produces 80th percentile SS production gets heavily rewarded (+10).

---

# 11. Random Events

## Overview

~20 random events are scheduled (hidden) at season start, triggering automatically between games.

## Event Categories (20 Events)

| # | Category | Description |
|---|----------|-------------|
| 1 | Random Trait (any) | Add random trait (70% positive, 30% negative) |
| 2 | Random Good Trait | Add random positive trait |
| 3 | Random Bad Trait | Add random negative trait |
| 4 | Random Secondary Position | Gain secondary position |
| 5 | Random Primary Position | Change primary position |
| 6 | Chosen Secondary Position | Player chooses new secondary |
| 7 | Down 10 in Random Category | -10 to random rating |
| 8 | Up 10 in Random Category | +10 to random rating |
| 9 | Change Personality | New chemistry personality |
| 10 | Change Stadium | Team gets new stadium |
| 11 | Random Batting Stance/Arm Angle | Cosmetic change |
| 12 | Trade | Player traded to random team |
| 13 | Injury | Player injured for X games |
| 14 | Hot Streak | +5/+5 ratings for 10 games |
| 15 | Cold Streak | -5/-5 ratings for 10 games |
| 16 | Veteran Mentor | Young player gets +3 to one rating |
| 17 | Rivalry Ignited | Two players become rivals (+2 Fame vs each other) |
| 18 | Fan Favorite | +2 Fame immediately, +1 Fame per milestone rest of season |
| 19 | Media Villain | -2 Fame immediately, extra Fame Boner scrutiny |
| 20 | Manager Fired | Team's manager replaced |

---

# 12. Salary System

## Overview

Dynamic salary system based on ratings, performance, position, and traits.

**Key Principles:**
- Single-season salaries (recalculated after year-end)
- Real-time updates when triggers occur
- Position matters (C/SS more valuable than corner OF)
- Traits affect salary (tiered impact)
- Fan happiness tied to payroll expectations
- No salary cap, but soft cap affects fan pressure

## Complete Salary Formula

```javascript
function calculateSalary(player, seasonStats, expectations, isNewTeam) {
  let salary = calculateBaseRatingSalary(player);
  salary *= getPositionMultiplier(player.primaryPosition);
  salary *= calculateAgeFactor(player);
  salary *= calculateTraitModifier(player);

  if (seasonStats && expectations) {
    salary *= calculatePerformanceModifier(player, seasonStats, expectations);
  }

  salary *= calculateFameModifier(player);

  if (isNewTeam) {
    salary *= getPersonalityModifier(player.personality);
  }

  return Math.max(0.5, Math.round(salary * 10) / 10);  // Min $500K
}
```

## Base Salary from Ratings

### Position Player Weights

| Rating | Weight |
|--------|--------|
| Power | 40% |
| Contact | 30% |
| Speed | 10% |
| Fielding | 10% |
| Arm | 10% |

```javascript
function calculatePositionPlayerBaseSalary(player) {
  const weightedRating = (
    player.ratings.power * 0.40 +
    player.ratings.contact * 0.30 +
    player.ratings.speed * 0.10 +
    player.ratings.fielding * 0.10 +
    player.ratings.arm * 0.10
  );

  return Math.pow(weightedRating / 100, 2.5) * 50;
}
```

### Pitcher Weights

| Rating | Weight |
|--------|--------|
| Velocity | 35% |
| Junk | 35% |
| Accuracy | 30% |

## Position Multipliers

| Position | Multiplier | Notes |
|----------|------------|-------|
| C | 1.15 | Most valuable |
| SS | 1.12 | Premium up-the-middle |
| CF | 1.08 | Covers most ground |
| 2B | 1.05 | Double play pivot |
| 3B | 1.02 | Hot corner |
| SP | 1.00 | Baseline |
| CP | 1.00 | Closers |
| RF | 0.98 | |
| LF | 0.95 | |
| 1B | 0.92 | Least defensive value |
| DH | 0.88 | No defensive value |
| RP | 0.85 | Less innings |
| UTIL | 1.05 | Versatility has value |
| BENCH | 0.80 | |

## Trait Salary Impact (Revised per Billy Yank Guide)

### ELITE Positive Traits (+10%)

**Position Player:** Clutch, RBI Hero, Two Way, Utility, Magic Hands, Bad Ball Hitter

**Pitcher:** Rally Stopper, Clutch, K Collector, Specialist, Pick Officer

### GOOD Positive Traits (+5%)

**Position Player:** Base Rounder, Stealer, Cannon Arm, Mind Gamer, Distractor, Rally Starter, Dive Wizard, Fastball/Off-Speed Hitter, Big Hack/Little Hack (level 2+), Ace Exterminator

**Pitcher:** Composed, Gets Ahead, Elite [Any Pitch], Reverse Splits

### MINOR Positive Traits (+2%)

**Position Player:** Bunter, Sign Stealer, Low/High/Inside/Outside Pitch, CON/POW vs LHP/RHP, Metal Head

**Pitcher:** Consistent

### SEVERE Negative Traits (-10%)

**Position Player:** Choker, RBI Zero, Easy Target

**Pitcher:** Choker, Surrounded, Meltdown, Easy Jumps

### MODERATE Negative Traits (-5%)

**Position Player:** Whiffer, Butter Fingers, Wild Thrower, Bad Jumps

**Pitcher:** BB Prone, Wild Thing, Volatile, K Neglecter, Falls Behind

### MINOR Negative Traits (-2%)

**Position Player:** Base Jogger, Slow Poke, First Pitch Prayer, Big Hack/Little Hack (level 1)

**Pitcher:** Crossed Up

## Pitcher Hitting Bonus

Pitchers who can hit receive salary bonuses:

```javascript
function calculatePitcherHittingBonus(player) {
  const hasTwoWay = player.traits.some(t => t.name === 'Two Way');
  const battingAvg = (player.ratings.power + player.ratings.contact) / 2;

  if (hasTwoWay) {
    if (battingAvg >= 70) return 0.50;  // +50% salary (elite two-way)
    if (battingAvg >= 55) return 0.35;  // +35%
    if (battingAvg >= 40) return 0.25;  // +25%
    return 0.15;  // +15% (has trait but mediocre)
  }

  // No Two-Way trait
  if (battingAvg >= 70) return 0.20;  // +20%
  if (battingAvg >= 55) return 0.12;  // +12%
  if (battingAvg >= 40) return 0.05;  // +5%
  return 0;
}
```

## Age Factor

| Age | Factor |
|-----|--------|
| ≤24 | 0.70 (Rookie scale) |
| 25-26 | 0.85 (Pre-arb) |
| 27-29 | 1.00 (Prime) |
| 30-32 | 1.10 (Peak earning) |
| 33-35 | 1.00 (Veteran) |
| 36-38 | 0.85 (Declining) |
| 39+ | 0.70 (Twilight) |

## Performance Modifier

Each WAR above/below expectation = +/-10% salary (capped +/-50%).

## Fame Modifier

Each point of fame = +/-3% salary (capped +/-30%).

## Team Salary Expectation System

Team expectations are now calculated using **Position-Based Salary Percentiles** - the same system used for EOS adjustments. This creates full alignment across player evaluation, team expectations, fan happiness, and manager performance.

### Core Concept

A team's expected win percentage is based on **how well they're paying at each position relative to the league**. A team that pays top dollar at every position SHOULD win more than a team with bargain-bin players.

```javascript
function calculateTeamSalaryExpectation(team, allPlayers, gamesInSeason) {
  const roster = team.activeRoster;

  // Calculate average salary percentile across all positions
  let totalSalaryPercentile = 0;
  let positionCount = 0;

  for (const player of roster) {
    const salaryPct = getSalaryPercentileAtPosition(player, allPlayers);
    totalSalaryPercentile += salaryPct;
    positionCount++;
  }

  const avgSalaryPercentile = totalSalaryPercentile / positionCount;

  // Convert to expected win percentage
  // 50th percentile salary = .500 win%
  // Every 10% above/below = +/- 2.5% win%
  const expectedWinPct = 0.500 + ((avgSalaryPercentile - 0.50) * 0.25);

  // Clamp to reasonable range (.350 to .650)
  const clampedWinPct = Math.max(0.350, Math.min(0.650, expectedWinPct));

  return {
    avgSalaryPercentile,
    expectedWinPct: clampedWinPct,
    expectedWins: Math.round(clampedWinPct * gamesInSeason),
    expectedLosses: gamesInSeason - Math.round(clampedWinPct * gamesInSeason)
  };
}
```

### Salary Percentile → Expected Win%

| Avg Salary Percentile | Expected Win% | Example Team |
|-----------------------|---------------|--------------|
| 90%+ (Elite payroll) | .600+ | Yankees-type "bought" roster |
| 75% (High payroll) | .562 | Contender with stars |
| 50% (Average payroll) | .500 | Middle of pack |
| 25% (Low payroll) | .438 | Rebuilding team |
| 10% (Minimum payroll) | .400 | Tank mode |

### Position-Weighted Expectations (Optional Enhancement)

For more accuracy, weight key positions higher:

```javascript
const POSITION_WEIGHTS = {
  SP: 1.5,   // Starting pitching most important
  C: 1.2,    // Premium position
  SS: 1.2,   // Premium position
  CF: 1.15,  // Premium up-the-middle (higher than corner OF)
  CP: 1.0,   // Closer matters
  '3B': 1.0,
  '2B': 1.0,
  RF: 0.9,   // Corner OF less valuable
  LF: 0.85,  // Easiest OF spot
  '1B': 0.8, // Easiest to fill
  DH: 0.8,
  RP: 0.7    // Depth position
};

function calculateWeightedTeamExpectation(team, allPlayers) {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const player of team.activeRoster) {
    const salaryPct = getSalaryPercentileAtPosition(player, allPlayers);
    const weight = POSITION_WEIGHTS[player.primaryPosition] || 1.0;

    weightedSum += salaryPct * weight;
    totalWeight += weight;
  }

  return weightedSum / totalWeight;
}
```

## Fan Happiness System

Fan happiness is now calculated using **Team Salary Expectation** - fans expect wins proportional to positional investment.

```javascript
function calculateFanHappiness(team, season, allPlayers) {
  let happiness = 50;  // Neutral start

  // Use new position-based salary expectation
  const teamExpectation = calculateTeamSalaryExpectation(team, allPlayers, season.games);
  const expectedWinPct = teamExpectation.expectedWinPct;
  const actualWinPct = team.wins / (team.wins + team.losses);
  const performanceDelta = actualWinPct - expectedWinPct;

  // HIGH PAYROLL AMPLIFIER (based on avg salary percentile, not just total payroll)
  let amplifier = 1.0;
  if (teamExpectation.avgSalaryPercentile >= 0.75 && performanceDelta < 0) {
    amplifier = 1.5;  // 50% worse for high-investment underperformers
  } else if (teamExpectation.avgSalaryPercentile >= 0.50 && performanceDelta < 0) {
    amplifier = 1.25;
  }

  // LOW PAYROLL OVERPERFORMANCE BONUS
  if (teamExpectation.avgSalaryPercentile < 0.25 && performanceDelta > 0) {
    amplifier = 1.5;  // 50% bonus for cheap team exceeding expectations
  } else if (teamExpectation.avgSalaryPercentile < 0.50 && performanceDelta > 0) {
    amplifier = 1.25;
  }

  // Each 1% delta = ~1 happiness point (amplified)
  happiness += performanceDelta * 100 * amplifier;

  // Additional factors...
  if (isLastPlace(team) && teamExpectation.avgSalaryPercentile >= 0.75) {
    happiness -= 15;  // Extra penalty for high-investment last place
  }

  return Math.max(0, Math.min(100, Math.round(happiness)));
}
```

### Example Scenarios

**Scenario 1: Yankees-type team underperforms**
- Avg Salary Percentile: 85% (elite at most positions)
- Expected Win%: .587 (95 wins in 162)
- Actual Win%: .500 (81 wins)
- Delta: -8.7%
- Amplifier: 1.5x (high-payroll underperformance)
- Happiness Impact: -13 points → **Unhappy fans**

**Scenario 2: Small-market team overperforms**
- Avg Salary Percentile: 20% (bargain-bin roster)
- Expected Win%: .425 (69 wins in 162)
- Actual Win%: .550 (89 wins)
- Delta: +12.5%
- Amplifier: 1.5x (low-payroll overperformance)
- Happiness Impact: +19 points → **Ecstatic fans**

**Scenario 3: Average team meets expectations**
- Avg Salary Percentile: 50%
- Expected Win%: .500
- Actual Win%: .506
- Delta: +0.6%
- Amplifier: 1.0x
- Happiness Impact: +1 point → **Neutral fans**

### Fan Happiness Thresholds

| Happiness | Status | Effects |
|-----------|--------|---------|
| 80-100 | Ecstatic | Immunity from contraction |
| 60-79 | Happy | Normal operations |
| 40-59 | Neutral | Normal operations |
| 20-39 | Unhappy | Manager hot seat (+10% fire chance) |
| 10-19 | Angry | Manager very hot seat (+25% fire chance) |
| 0-9 | **Furious** | Contraction risk at season end |

## ROI Leaderboards

```
+---------------------------------------------------------------------------+
|  BEST VALUE PLAYERS - Season 4                                             |
+---------------------------------------------------------------------------+
|  Rank | Player            | Team    | Salary  | WAR   | ROI (WAR/$M)       |
+---------------------------------------------------------------------------+
|  1    | Rookie Star       | MIA     | $1.2M   | 2.8   | 2.33               |
|  2    | Bargain Vet       | OAK     | $3.5M   | 3.2   | 0.91               |
+---------------------------------------------------------------------------+
```

---

# 13. Offseason System

## Overview: Offseason Flow (10 Phases)

The offseason is broken into 10 sequential phases, matching the Offseason Hub UI:

```
Season Ends (Playoffs Complete)
    ↓
Phase 1: AWARDS CEREMONY (League leaders, position awards, major awards, MVP/Cy Young)
    ↓
Phase 2: EOS RATINGS ADJUSTMENTS (Apply salary-based WAR percentile adjustments)
    ↓
Phase 3: TEAM MVP SELECTION (Each team's MVP + Cornerstone player announcement)
    ↓
Phase 4: PERSONALITY UPDATES (10% chance each player changes personality)
    ↓
Phase 5: RETIREMENTS (Age + performance based, jersey retirement decisions)
    ↓
Phase 6: HALL OF FAME (Eligible retired players inducted)
    ↓
Phase 7: FREE AGENCY (2 rounds, protect 1, dice roll, salary-based swaps)
    ↓
Phase 8: EXPANSION/CONTRACTION (Add/remove teams based on Fan Happiness)
    ↓
Phase 9: DRAFT (Fill roster gaps, reverse expected WAR order)
    ↓
Phase 10: FINAL ADJUSTMENTS (Manual trades, edits, roster finalization)
    ↓
Archive Season → Launch New Season
```

---

## PHASE 1: AWARDS CEREMONY

Awards are calculated and presented in a dramatic multi-screen ceremony (see Awards Ceremony UI in Section 0).

```javascript
async function processAwardsCeremony() {
  // Calculate all awards
  const leagueLeaders = calculateLeagueLeaders();
  const positionAwards = calculatePositionAwards();  // Gold Glove, Silver Slugger
  const majorAwards = calculateMajorAwards();  // ROY, Reliever, Comeback, etc.
  const mvp = calculateMVP();
  const cyYoung = calculateCyYoung();

  // Apply award effects (salary bonuses, traits, fame)
  for (const award of [...positionAwards, ...majorAwards, mvp, cyYoung]) {
    await applyAwardEffects(award);
  }

  // Display ceremony screens
  await displayAwardsCeremony({ leagueLeaders, positionAwards, majorAwards, mvp, cyYoung });

  logTransaction('AWARDS_CEREMONY_COMPLETE', { season: currentSeason });
}
```

---

## PHASE 2: EOS RATINGS ADJUSTMENTS

Apply rating adjustments based on position-based salary percentiles vs WAR percentiles (see Section 10 for full formula).

```javascript
async function processEOSAdjustments() {
  const allPlayers = getAllActivePlayers();
  const adjustments = [];

  for (const player of allPlayers) {
    const adjustment = calculateEOSAdjustments(player, allPlayers);
    applyRatingAdjustments(player, adjustment);
    adjustments.push({ player, adjustment });
  }

  // Categorize into Breakout Stars and Falling Stars
  const breakoutStars = adjustments.filter(a => getTotalAdjustment(a) >= 5);
  const fallingStars = adjustments.filter(a => getTotalAdjustment(a) <= -5);

  await displayEOSAdjustmentsScreen({ breakoutStars, fallingStars, allAdjustments: adjustments });

  logTransaction('EOS_ADJUSTMENTS_COMPLETE', { season: currentSeason });
}
```

---

## PHASE 3: TEAM MVP SELECTION

Each team's MVP and Cornerstone player are announced.

```javascript
async function processTeamMVPs() {
  for (const team of getAllTeams()) {
    const teamMVP = calculateTeamMVP(team);  // Highest WAR on team
    const cornerstone = identifyCornerstone(team);  // Highest salary non-MVP

    teamMVP.awards.push({ type: 'TEAM_MVP', season: currentSeason, team: team.id });

    await displayTeamMVPAnnouncement(team, teamMVP, cornerstone);
  }

  logTransaction('TEAM_MVPS_COMPLETE', { season: currentSeason });
}
```

---

## PHASE 4: PERSONALITY UPDATES

10% base chance each player's personality changes based on season events.

```javascript
async function processPersonalityUpdates() {
  const changes = [];

  for (const player of getAllActivePlayers()) {
    const seasonEvents = getPlayerSeasonEvents(player);
    const oldPersonality = player.personality;

    maybeChangePersonality(player, seasonEvents);

    if (player.personality !== oldPersonality) {
      changes.push({ player, from: oldPersonality, to: player.personality });
    }
  }

  if (changes.length > 0) {
    await displayPersonalityChangesScreen(changes);
  }

  logTransaction('PERSONALITY_UPDATES_COMPLETE', { changes: changes.length });
}
```

---

## PHASE 5: RETIREMENTS

### Retirement Probability

```javascript
function calculateRetirementProbability(player, seasonStats) {
  const age = player.age;

  let baseProbability;
  if (age >= 40) baseProbability = 0.70;
  else if (age >= 38) baseProbability = 0.50;
  else if (age >= 36) baseProbability = 0.35;
  else if (age >= 34) baseProbability = 0.20;
  else if (age >= 32) baseProbability = 0.10;
  else if (age >= 30) baseProbability = 0.05;
  else if (age >= 28) baseProbability = 0.02;
  else baseProbability = 0.01;

  // Performance modifier
  const performanceDelta = actualWAR - expectedWAR;
  let performanceModifier = 1.0;
  if (performanceDelta < -1.5) performanceModifier = 1.5;
  else if (performanceDelta < -0.5) performanceModifier = 1.25;
  else if (performanceDelta > 1.0) performanceModifier = 0.75;

  return Math.min(0.90, baseProbability * performanceModifier);
}
```

### Jersey Retirement Option

When a player retires, prompt for jersey retirement decision. Separate from Hall of Fame.

---

## PHASE 6: HALL OF FAME

Retired players who meet HOF criteria are inducted.

```javascript
async function processHallOfFame() {
  const eligiblePlayers = getRetiredPlayers().filter(player => {
    // Check HOF criteria
    return player.careerWAR >= 50 ||
           player.awards.some(a => a.type === 'MVP') ||
           player.awards.filter(a => a.type === 'ALL_STAR').length >= 5 ||
           player.hofOverride === true;  // User can override
  });

  const newInductees = [];
  for (const player of eligiblePlayers) {
    if (!player.hallOfFame) {
      player.hallOfFame = {
        inducted: true,
        inductionSeason: currentSeason,
        hofScore: calculateHOFScore(player)
      };
      newInductees.push(player);
    }
  }

  if (newInductees.length > 0) {
    await displayHallOfFameCeremony(newInductees);
  }

  logTransaction('HOF_INDUCTION_COMPLETE', { inductees: newInductees.map(p => p.id) });
}

function calculateHOFScore(player) {
  let score = 0;
  score += player.careerWAR * 1.5;  // WAR heavily weighted
  score += player.awards.filter(a => a.type === 'MVP').length * 15;
  score += player.awards.filter(a => a.type === 'CY_YOUNG').length * 15;
  score += player.awards.filter(a => a.type === 'ALL_STAR').length * 3;
  score += player.awards.filter(a => a.type === 'GOLD_GLOVE').length * 2;
  score += player.championships * 5;
  return Math.round(score * 10) / 10;
}
```

---

## PHASE 7: FREE AGENCY

### Step 1: Protect One Player

Each team protects one player from free agency.

### Step 2: Dice Assignment

11 at-risk players assigned to dice values 2-12 (sorted by desirability, 7 = most likely to leave).

### Step 3: Animated Dice Roll

Roll 2d6 to determine which player leaves.

### Step 4: Destination (Personality-Based)

| Personality | Destination |
|-------------|-------------|
| **Competitive** | Team's rival (closest H2H record to .500) |
| **Relaxed** | Random team via dice roll (current team included) |
| **Droopy** | Retires immediately (additional retirement) |
| **Jolly** | Stays with current team |
| **Tough** | Team with highest OPS |
| **Timid** | Champion team |
| **Egotistical** | Worst team by WAR |

### Step 5: Salary-Based Player Swap (Record-Dependent)

**CRITICAL:** Swaps use **salary matching**, not grades. The threshold depends on which team had the better record.

**Swap Rules:**
- Receiving team must give back a player matching **position type** (pitcher for pitcher, position player for position player)
- If receiving team had **BETTER record**: Must return player of **EQUAL or HIGHER salary**
- If receiving team had **WORSE record**: Can return player up to **20% LOWER salary**

```javascript
function calculateSwapRequirement(outgoingPlayer, receivingTeamRecord, sendingTeamRecord) {
  const outgoingSalary = outgoingPlayer.currentSalary;
  const outgoingType = isPitcher(outgoingPlayer) ? 'PITCHER' : 'POSITION';

  // Determine which team had better record
  const receiverWasBetter = receivingTeamRecord.winPct > sendingTeamRecord.winPct;

  let minSalary;
  if (receiverWasBetter) {
    // Better team receives player → must return EQUAL or HIGHER salary
    minSalary = outgoingSalary; // 100% minimum
  } else {
    // Worse team receives player → can return up to 20% LOWER salary
    minSalary = outgoingSalary * 0.80; // 80% minimum
  }

  return {
    minSalary,
    maxSalary: Infinity, // No upper limit on salary
    requiredType: outgoingType,
    receiverWasBetter
  };
}

// Find eligible return players from receiving team's roster
function getEligibleReturnPlayers(receivingTeam, swapRequirement) {
  return receivingTeam.roster.filter(player => {
    const matchesType = isPitcher(player) === (swapRequirement.requiredType === 'PITCHER');
    const meetsSalary = player.currentSalary >= swapRequirement.minSalary;
    const notProtected = player.id !== receivingTeam.protectedPlayerId;
    return matchesType && meetsSalary && notProtected;
  });
}

// Auto-select: Receiving team gives their LOWEST eligible salary player
function autoSelectReturnPlayer(eligiblePlayers) {
  return eligiblePlayers.sort((a, b) => a.currentSalary - b.currentSalary)[0];
}
```

**Example Scenarios:**

1. **Better team receives player:**
   - Giants (92-70) lose B+ 1B ($6.4M) to Mets (48-114)
   - Mets had worse record → can return player worth ≥$5.12M (80%)
   - Giants receive C+ 1B ($5.2M) - acceptable

2. **Worse team receives player:**
   - Yankees (98-64) receive B 3B ($4.2M) from Giants (92-70)
   - Yankees had better record → must return player worth ≥$4.2M (100%)
   - Giants receive B- 3B ($4.5M) - Yankees pay premium

## PHASE 8: EXPANSION/CONTRACTION

### Contraction

Teams with Fan Happiness < 30 face contraction risk (probability-based):

| Happiness | Base Probability |
|-----------|------------------|
| 30-59 | 0% |
| 15-29 | 10% |
| 5-14 | 35% |
| 0-4 | 70% |

**Modifiers:**
- +15% per consecutive unhappy season
- +20% if top 25% payroll AND last place
- -50% if won championship in last 3 seasons
- -25% if new stadium in last 2 seasons

### Contracted Team Players

When a team is contracted:

```javascript
function processContractedTeam(contractedTeam, expansionDraftPool) {
  // Auto-select 4 players for expansion draft (same rules as other teams)
  const positionPlayers = roster.filter(p => !isPitcher(p));
  const pitchers = roster.filter(p => isPitcher(p));

  // 2 position players + 2 pitchers within replacement level (+/-10%)
  const selectedPos = autoSelectForExpansion(eligiblePositionPlayers, 2);
  const selectedPit = autoSelectForExpansion(eligiblePitchers, 2);
  expansionDraftPool.push(...selectedPos, ...selectedPit);

  // Remaining players: retire (age-based probability) or enter draft pool
  for (const player of remainingPlayers) {
    if (Math.random() < calculateRetirementProbability(player)) {
      player.status = 'RETIRED';
      player.retirementReason = 'TEAM_CONTRACTION';
    } else {
      player.status = 'DRAFT_ELIGIBLE';
      addToGeneralDraftPool(player);
    }
  }
}
```

### Expansion Draft

Each existing team must make available:
- **2 position players**
- **2 pitchers**

All must be within **+/-10% of replacement level WAR**.

Expansion team:
- Picks up to 20 players (max 2 from any team)
- Must stay within salary constraints (60-90% of league average)
- Fills remaining via regular draft

## PHASE 9: DRAFT

### Draft Class Generation

Size = 3x roster gaps across all teams.

**Grade Distribution:**
- A-: 5% (rare prospects)
- B+: 15%
- B: 25%
- B-: 30% (most common)
- C+: 15%
- C: 10%

### Draft Order

Reverse order of average expected WAR per player. Minimum 1 pick per team.

### Draft Rules

- Roster size: 22 players
- Every team must draft at least once
- Teams with full roster can pass after Round 1
- If drafting with full roster, must release a player (same grade or worse)
- Undrafted players at end return to inactive pool or retire (age-based)

## PHASE 10: FINAL ADJUSTMENTS

Final trades, edits, and roster moves before new season.

---

# 14. Hall of Fame & Retired Numbers

## Retired Numbers

Displayed on Team History tab. Decided at moment of retirement.

```
+---------------------------------------------------------------------------+
|  GIANTS - RETIRED NUMBERS                                                  |
+---------------------------------------------------------------------------+
|   ┌─────────┐    ┌─────────┐    ┌─────────┐
|   │  MAYS   │    │ McCOVEY │    │  BONDS  │
|   │   24    │    │   44    │    │   25    │
|   │ GIANTS  │    │ GIANTS  │    │ GIANTS  │
|   └─────────┘    └─────────┘    └─────────┘
|    S1 - S4        S1 - S2        S2 - S4
+---------------------------------------------------------------------------+
```

## Hall of Fame Museum

Separate from retirement. Accessible anytime.

### Suggested Criteria

| Threshold | Requirement |
|-----------|-------------|
| Career WAR | 50+ |
| MVP Awards | 1+ |
| All-Star Selections | 5+ |
| Or | User override (any player) |

---

# 15. Records & Milestones

## Career Milestones (Fame Bonus)

### Batting

| Milestone | Fame Bonus |
|-----------|------------|
| 10 HR | +1 |
| 25 HR | +1 |
| 50 HR | +1 |
| 100 HR | +2 |
| Every 25 after 100 | +1 |
| 50 hits | +1 |
| 100 hits | +1 |
| 250 hits | +2 |
| Every 50 after 250 | +1 |

### Pitching

| Milestone | Fame Bonus |
|-----------|------------|
| 10 wins | +1 |
| 50 wins | +2 |
| 100 K | +1 |
| 200 K | +2 |
| 30 saves | +2 |

## Single Game Milestones

### Positive

| Milestone | Fame Bonus |
|-----------|------------|
| 4+ hits | +1 |
| 2+ HR | +1 |
| 3+ HR | +2 |
| Cycle | +3 |
| 10+ K (pitcher) | +1 |
| 15+ K | +2 |
| No-hitter | +3 |
| Perfect game | +5 |
| Maddux | +3 |
| Walk-off grand slam | +4 |

### Negative

| Milestone | Fame Boner |
|-----------|------------|
| Golden sombrero | -1 |
| Platinum sombrero (5+ K) | -2 |
| 3+ errors | -2 |
| 8+ earned runs | -2 |

## Maddux (SMB Version)

Complete game shutout under pitch threshold:

| Game Length | Pitch Threshold |
|-------------|-----------------|
| 9 innings | < 85 pitches |
| 7 innings | < 65 pitches |
| 6 innings | < 55 pitches |

---

# 16. Grade Tracking

## When to Update Grades

Grades must be confirmed after any rating change:

- Random event
- All-Star trait added
- End-of-season adjustments
- Manual modification

```
+---------------------------------------------------------+
|  GRADE CHECK - Junior Young Jr                           |
+---------------------------------------------------------+
|  Recent Change: +10 Power (Random Event)                 |
|  Previous Grade: C+                                      |
|  Check new grade in SMB4 and enter below:                |
|  New Grade: [B-] v                                       |
+---------------------------------------------------------+
```

## Grade History Tracking

```javascript
player.gradeHistory = [
  { grade: 'C+', startGame: 1, endGame: 23 },
  { grade: 'B-', startGame: 24, endGame: 40 }
];
```

---

# 17. Position Detection

## Position Categories

| Category | Detection Criteria |
|----------|-------------------|
| **C, 1B, 2B, 3B, SS, LF, CF, RF, DH** | Primary position, >=50% of team games |
| **UTIL** | 3+ positions, threshold games each, none >60% |
| **BENCH** | <50% of team games at primary, not UTIL |
| **SP** | Threshold+ starts, starts > relief appearances |
| **SP/RP** | Threshold+ starts, relief >= 50% of starts |
| **RP** | Threshold+ relief appearances, <threshold saves |
| **CP** | Threshold+ saves |
| **TWO-WAY** | Threshold+ pitching games AND threshold+ PA |

---

# 18. UI/UX Guidelines

## Touch Optimization (iPad Primary)

- Minimum touch target: 44x44 points
- Bottom navigation for primary actions
- Swipe gestures for common actions

## Color Coding

- **Green**: Positive (clutch, fame bonus)
- **Red**: Negative (choke, fame boner)
- **Blue**: Informational
- **Gold**: Awards, achievements
- **Orange**: Hot Streak
- **Light Blue**: Cold Streak

## Keyboard Shortcuts (Desktop)

| Key | Action |
|-----|--------|
| N | Next game |
| P | Previous game |
| S | Save |
| E | End game |
| / | Search |
| Ctrl+Z | Undo |

---

# 19. Data Architecture & Core Models

## Database Structure Overview

```javascript
const appDatabase = {
  // MASTER DATA (persists across seasons)
  players: [],
  teams: [],
  stadiums: [],
  managers: [],

  // SEASON-SPECIFIC DATA
  seasons: [{
    id: 'season-3',
    config: { gamesPerTeam, dhRule, ... },
    rosters: {},
    schedule: [],
    games: [],
    playerSeasonStats: {},
    preSeasonExpectations: {},  // WAR expectations locked at start
    preSeasonSalaries: {},       // Salaries at season start
    scheduledEvents: [],
    temporaryEffects: [],
    awards: {},
    undoStack: []
  }],

  // HISTORICAL DATA
  hallOfFame: [],
  retiredNumbers: {},

  // TRANSACTION LOG (Full audit trail)
  transactionLog: [],

  // APP SETTINGS
  settings: {}
};
```

---

## Core Data Models

### Player Object Schema

```javascript
const PlayerSchema = {
  // ═══════════════════════════════════════════════════════════════
  // IDENTITY
  // ═══════════════════════════════════════════════════════════════
  id: 'player_123',                    // Unique identifier
  name: 'Willie Mays',                 // Display name
  nickname: null,                      // Auto-generated or user-set
  nicknameSource: null,                // 'auto' | 'user' | null
  nicknameEarnedSeason: null,          // When nickname was earned
  age: 28,                             // Current age
  bats: 'R',                           // R | L | S (switch)
  throws: 'R',                         // R | L

  // ═══════════════════════════════════════════════════════════════
  // TEAM AFFILIATION
  // ═══════════════════════════════════════════════════════════════
  currentTeam: 'giants',               // Current team ID
  seasonsWithTeam: 5,                  // Consecutive seasons with current team
  isCornerstone: true,                 // Team MVP designation
  cornerstoneSince: 2,                 // Season when became cornerstone

  // Former teams for revenge game tracking
  formerTeams: [
    {
      teamId: 'dodgers',
      departedSeason: 3,
      departedGame: 45,                // Game number when traded/left
      acquisitionType: 'TRADE',        // TRADE | FREE_AGENT | EXPANSION_DRAFT
      seasonsPlayed: 2
    }
  ],

  // ═══════════════════════════════════════════════════════════════
  // RATINGS (0-100 scale, editable)
  // ═══════════════════════════════════════════════════════════════
  ratings: {
    // Position players
    power: 85,
    contact: 90,
    speed: 75,
    fielding: 88,
    arm: 80,

    // Pitchers (if applicable)
    velocity: null,
    junk: null,
    accuracy: null
  },

  // ═══════════════════════════════════════════════════════════════
  // DERIVED VALUES (calculated, not editable directly)
  // ═══════════════════════════════════════════════════════════════
  grade: 'A+',                         // Calculated from ratings
  position: 'CF',                      // Primary position
  secondaryPositions: ['LF', 'RF'],    // Can play these positions
  playerType: 'POSITION',              // POSITION | PITCHER | TWO_WAY

  // ═══════════════════════════════════════════════════════════════
  // TRAITS (max 2)
  // ═══════════════════════════════════════════════════════════════
  traits: [
    { name: 'RBI Hero', source: 'AWARD', earnedSeason: 2 },
    { name: 'Stealer', source: 'ALL_STAR', earnedSeason: 3 }
  ],

  // ═══════════════════════════════════════════════════════════════
  // FAME & PERSONALITY (hidden from in-game display)
  // ═══════════════════════════════════════════════════════════════
  fame: 4,                             // 0-5 scale
  peakFame: 4,                         // Highest fame ever achieved
  personality: 'COMPETITIVE',          // One of 7 personalities
  personalityHistory: [
    { personality: 'JOLLY', season: 1 },
    { personality: 'COMPETITIVE', season: 2, reason: 'WON_CHAMPIONSHIP' }
  ],

  // ═══════════════════════════════════════════════════════════════
  // SALARY & CONTRACT
  // ═══════════════════════════════════════════════════════════════
  salary: 12000000,                    // Current salary
  salaryBonuses: [
    { type: 'MVP', amount: 1800000, season: 3 }
  ],
  contractYearsRemaining: 2,

  // ═══════════════════════════════════════════════════════════════
  // CAREER STATS & AWARDS
  // ═══════════════════════════════════════════════════════════════
  careerStats: {
    seasons: 5,
    games: 200,
    atBats: 800,
    hits: 280,
    homeRuns: 55,
    rbi: 180,
    war: 18.5,
    // ... all career totals
  },

  awards: [
    { type: 'MVP', season: 3 },
    { type: 'ALL_STAR', season: 1 },
    { type: 'ALL_STAR', season: 2 },
    { type: 'ALL_STAR', season: 3 },
    { type: 'GOLD_GLOVE', season: 2 },
    { type: 'GOLD_GLOVE', season: 3 }
  ],

  // ═══════════════════════════════════════════════════════════════
  // SEASON STATS (current season with trade splits)
  // ═══════════════════════════════════════════════════════════════
  seasonStats: {
    season: 4,

    // Full season totals (always accumulated)
    fullSeason: {
      games: 95,
      atBats: 380,
      hits: 108,
      doubles: 22,
      triples: 4,
      homeRuns: 22,
      rbi: 67,
      walks: 45,
      strikeouts: 62,
      stolenBases: 12,
      caughtStealing: 3,
      avg: .284,
      obp: .365,
      slg: .520,
      ops: .885,
      war: 3.4,
      bWAR: 2.8,
      fWAR: 0.6,

      // Clutch tracking
      clutchMoments: 8,
      chokeMoments: 2,
      netClutch: 6,

      // Pitcher stats (if applicable)
      wins: null,
      losses: null,
      saves: null,
      era: null,
      whip: null,
      inningsPitched: null,
      strikeoutsPitching: null,
      pWAR: null
    },

    // Stats by team (for traded players)
    byTeam: [
      {
        teamId: 'dodgers',
        teamName: 'Dodgers',
        dateRange: { start: 'Mar 28', end: 'Jun 15' },
        gameRange: { start: 1, end: 45 },
        stats: {
          games: 45,
          atBats: 180,
          hits: 48,
          homeRuns: 12,
          rbi: 35,
          war: 1.8,
          avg: .267
          // ... all stats for this stint
        }
      },
      {
        teamId: 'giants',
        teamName: 'Giants',
        dateRange: { start: 'Jun 16', end: null },  // null = current
        gameRange: { start: 46, end: null },
        stats: {
          games: 50,
          atBats: 200,
          hits: 60,
          homeRuns: 10,
          rbi: 32,
          war: 1.6,
          avg: .300
        }
      }
    ],

    // Trade history this season
    trades: [
      {
        date: 'Jun 15',
        gameNumber: 45,
        from: 'dodgers',
        to: 'giants',
        tradedWith: ['cash_50k'],
        tradedFor: ['player_456']
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // LEGACY STATUS
  // ═══════════════════════════════════════════════════════════════
  legacyStatus: 'FRANCHISE_ICON',      // null | CORNERSTONE | ICON | LEGEND

  // Team-specific WAR for legacy calculation
  teamHistory: {
    'giants': { seasons: 5, war: 18.5 },
    'dodgers': { seasons: 2, war: 4.2 }
  },

  // ═══════════════════════════════════════════════════════════════
  // MEMORABLE MOMENTS (player-specific)
  // ═══════════════════════════════════════════════════════════════
  memorableMoments: [
    {
      type: 'MILESTONE_HR',
      description: '500th Career HR',
      date: 'Sep 2',
      season: 4,
      tier: 'EPIC'
    }
  ],

  // ═══════════════════════════════════════════════════════════════
  // RIVALRIES
  // ═══════════════════════════════════════════════════════════════
  rivalries: [
    {
      type: 'PLAYER_VS_PLAYER',
      opponentId: 'player_789',
      reason: 'AWARD_SNUB',
      intensity: 2,
      startedSeason: 3,
      expiresAfterSeason: 5
    }
  ],

  // Revenge game tracking (from trades/FA departures)
  revengeGames: [
    {
      formerTeam: 'dodgers',
      tradedSeason: 4,
      firstMeetingPlayed: true,
      performances: [
        { date: 'Jun 22', stats: { hits: 2, hr: 1, rbi: 3 } }
      ],
      duration: 3  // Seasons
    }
  ],

  // ═══════════════════════════════════════════════════════════════
  // STREAK TRACKING (for nicknames)
  // ═══════════════════════════════════════════════════════════════
  streaks: {
    consecutiveGamesWithHit: 15,
    consecutiveGamesPlayed: 95,
    consecutiveQualityStarts: 0  // Pitchers
  },

  // ═══════════════════════════════════════════════════════════════
  // INJURY TRACKING
  // ═══════════════════════════════════════════════════════════════
  injuries: {
    currentlyInjured: false,
    gamesInjuredThisSeason: 0,
    careerGamesInjured: 12,
    injuryHistory: [
      { type: 'HAMSTRING', season: 2, gamesMissed: 8 }
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // ROOKIE STATUS
  // ═══════════════════════════════════════════════════════════════
  isRookie: false,
  rookieSeason: 1,                     // Season when debuted

  // ═══════════════════════════════════════════════════════════════
  // STATUS FLAGS
  // ═══════════════════════════════════════════════════════════════
  isActive: true,
  isRetired: false,
  retiredSeason: null,
  isInHallOfFame: false,
  hofInductionSeason: null
};
```

### Team Object Schema

```javascript
const TeamSchema = {
  // ═══════════════════════════════════════════════════════════════
  // IDENTITY
  // ═══════════════════════════════════════════════════════════════
  id: 'giants',
  name: 'San Francisco Giants',
  shortName: 'Giants',
  abbreviation: 'SF',
  city: 'San Francisco',
  stadium: 'Oracle Park',
  division: 'NL West',
  conference: 'National',

  // Geographic location for rivalry calculation
  location: { lat: 37.7749, lng: -122.4194 },

  // ═══════════════════════════════════════════════════════════════
  // ROSTER
  // ═══════════════════════════════════════════════════════════════
  activeRoster: ['player_123', 'player_456', ...],  // Player IDs
  cornerstone: 'player_123',           // Team MVP player ID

  // ═══════════════════════════════════════════════════════════════
  // SEASON RECORD
  // ═══════════════════════════════════════════════════════════════
  seasonRecord: {
    wins: 32,
    losses: 18,
    winPct: .640,
    gamesBack: 0,
    streak: 'W3',
    last10: '7-3'
  },

  // ═══════════════════════════════════════════════════════════════
  // EXPECTATIONS (calculated at season start)
  // ═══════════════════════════════════════════════════════════════
  salaryExpectation: {
    avgSalaryPercentile: 0.72,
    expectedWinPct: 0.555,
    expectedWins: 22,                  // For 40-game season
    calculatedAt: 'SEASON_START'
  },

  // ═══════════════════════════════════════════════════════════════
  // FAN HAPPINESS
  // ═══════════════════════════════════════════════════════════════
  fanHappiness: 75,                    // 0-100 scale
  fanHappinessHistory: [
    { gameNumber: 10, happiness: 68, event: 'LOST_STREAK' },
    { gameNumber: 25, happiness: 75, event: 'ALL_STAR_SELECTION' }
  ],
  contractionWarningShown: false,

  // ═══════════════════════════════════════════════════════════════
  // CHEMISTRY (narrative only per user decision)
  // ═══════════════════════════════════════════════════════════════
  chemistry: {
    overall: 7,                        // -10 to +10
    effects: ['DRIVE', 'CLUBHOUSE_HARMONY'],
    description: 'Great team chemistry'
  },

  // ═══════════════════════════════════════════════════════════════
  // RIVALRIES
  // ═══════════════════════════════════════════════════════════════
  officialRival: 'dodgers',
  rivalryScore: 12,
  rivalryHistory: [
    { opponent: 'dodgers', type: 'PLAYOFF_ELIMINATION', season: 2 }
  ],

  // Head-to-head records this season
  headToHead: {
    'dodgers': { wins: 4, losses: 3 },
    'padres': { wins: 3, losses: 2 }
  },

  // ═══════════════════════════════════════════════════════════════
  // DYNASTY TRACKING
  // ═══════════════════════════════════════════════════════════════
  dynastyStatus: 'MINI_DYNASTY',       // null | CONTENDER | MINI_DYNASTY | DYNASTY
  championships: [2, 4],               // Seasons won
  playoffAppearances: [1, 2, 3, 4],    // Seasons made playoffs

  // ═══════════════════════════════════════════════════════════════
  // FINANCES
  // ═══════════════════════════════════════════════════════════════
  totalPayroll: 85000000,
  cash: 500000,                        // Cash from trades

  // ═══════════════════════════════════════════════════════════════
  // MEMORABLE MOMENTS (team-specific)
  // ═══════════════════════════════════════════════════════════════
  memorableMoments: [
    {
      type: 'CHAMPIONSHIP',
      season: 2,
      tier: 'LEGENDARY',
      description: 'Won World Series vs Yankees'
    }
  ],

  // ═══════════════════════════════════════════════════════════════
  // ROSTER COMPOSITION
  // ═══════════════════════════════════════════════════════════════
  rosterComposition: {
    homegrown: 12,
    acquired: 8,
    ratio: 0.60
  }
};
```

### Season Object Schema

```javascript
const SeasonSchema = {
  // ═══════════════════════════════════════════════════════════════
  // IDENTITY
  // ═══════════════════════════════════════════════════════════════
  id: 'season-4',
  number: 4,
  name: 'KBL Season 4',

  // ═══════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  config: {
    gamesPerTeam: 40,
    inningsPerGame: 9,
    dhRule: 'UNIVERSAL',              // NL | AL | UNIVERSAL
    conferenceStructure: 'TWO_CONFERENCES',
    numDivisions: 4
  },

  // ═══════════════════════════════════════════════════════════════
  // PLAYOFF CONFIGURATION (user configurable)
  // ═══════════════════════════════════════════════════════════════
  playoffConfig: {
    numTeams: 8,
    format: 'BRACKET',                 // BRACKET | BEST_OF
    seriesLength: {
      wildCard: 3,
      divisional: 5,
      championship: 7,
      worldSeries: 7
    },
    seedingMethod: 'DIVISION_WINNERS_PLUS_WILDCARDS',
    byeRounds: 0
  },

  // ═══════════════════════════════════════════════════════════════
  // PHASE & TIMING
  // ═══════════════════════════════════════════════════════════════
  phase: 'REGULAR_SEASON',             // From SEASON_PHASES
  currentGameNumber: 26,
  allStarBreakComplete: true,
  tradeDeadlinePassed: true,

  // ═══════════════════════════════════════════════════════════════
  // CALENDAR
  // ═══════════════════════════════════════════════════════════════
  calendar: {
    openingDay: { month: 3, day: 28 },
    allStarBreak: { month: 7, day: 15 },
    tradeDeadline: { month: 7, day: 31 },
    regularSeasonEnd: { month: 9, day: 29 }
  },

  // ═══════════════════════════════════════════════════════════════
  // GAMES
  // ═══════════════════════════════════════════════════════════════
  games: [
    {
      gameNumber: 1,
      date: 'Mar 28',
      homeTeam: 'giants',
      awayTeam: 'dodgers',
      homeScore: 5,
      awayScore: 3,
      isComplete: true,
      isPlayoff: false,
      pog: 'player_123',
      headline: 'Mays leads Giants to Opening Day victory!'
    }
  ],

  playoffGames: [],

  // ═══════════════════════════════════════════════════════════════
  // STANDINGS
  // ═══════════════════════════════════════════════════════════════
  standings: {
    'NL West': [
      { teamId: 'giants', wins: 32, losses: 18, pct: .640, gb: 0 },
      { teamId: 'dodgers', wins: 28, losses: 22, pct: .560, gb: 4 }
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // RANDOM EVENTS
  // ═══════════════════════════════════════════════════════════════
  scheduledEvents: [
    { gameNumber: 12, event: 'INJURY', triggered: true },
    { gameNumber: 30, event: 'HOT_STREAK', triggered: false }
  ],
  temporaryEffects: [
    { playerId: 'player_123', effect: 'HOT_STREAK', expiresGame: 35 }
  ],

  // ═══════════════════════════════════════════════════════════════
  // AWARDS (calculated at end of season)
  // ═══════════════════════════════════════════════════════════════
  awards: {
    MVP: { playerId: 'player_123', votes: 95 },
    CY_YOUNG: { playerId: 'player_456', votes: 88 },
    ROY: { playerId: 'player_789' },
    // ... all awards
  },

  allStars: ['player_123', 'player_456', ...],
  allStarMVP: 'player_123',

  // ═══════════════════════════════════════════════════════════════
  // UNDO STACK
  // ═══════════════════════════════════════════════════════════════
  undoStack: [
    {
      timestamp: '2024-03-28T14:30:00Z',
      action: 'STAT_RECORDED',
      data: { playerId: 'player_123', stat: 'homeRuns', oldValue: 21, newValue: 22 }
    }
  ]
};
```

### Season Events Object (for Personality Changes)

```javascript
const SeasonEventsSchema = {
  playerId: 'player_123',
  season: 4,

  // Events that can trigger personality changes
  wonChampionship: true,
  hadBadSeason: false,                 // EOS adjustment < -5
  wasBenched: false,                   // Lost starting job
  wonMVP: false,
  wasTraded: true,
  wasAllStar: true,
  hadBreakoutSeason: false,            // EOS adjustment > +5
  teamFinishedLast: false,
  wasInjured: false,                   // 10+ games
  hadClutchMoments: 8,
  hadChokeMoments: 2
};
```

---

## Geographic Rivalry Mapping

```javascript
const GEOGRAPHIC_RIVALS = {
  // California
  'giants': ['dodgers', 'athletics', 'padres'],
  'dodgers': ['giants', 'angels', 'padres'],
  'athletics': ['giants', 'angels'],
  'angels': ['dodgers', 'athletics', 'padres'],
  'padres': ['dodgers', 'giants', 'angels'],

  // New York
  'yankees': ['mets', 'red_sox'],
  'mets': ['yankees', 'phillies'],

  // Chicago
  'cubs': ['white_sox', 'cardinals', 'brewers'],
  'white_sox': ['cubs', 'twins'],

  // Add all team pairings...
};

function areGeographicRivals(team1Id, team2Id) {
  const rivals = GEOGRAPHIC_RIVALS[team1Id] || [];
  return rivals.includes(team2Id);
}
```

---

# 20. Undo & Reset Features

## Undo Feature

Always available during play entry. Stack maintains last 10 actions.

## Reset Season Feature

Located in Settings with multiple confirmation steps including typing confirmation.

---

# 21. Grade Derivation Formula

## Overview

Grades are derived from ratings using formulas reverse-engineered from analyzing 261 valid position players and 179 valid pitchers from SMB4. Analysis excluded players with incomplete ratings (e.g., historical players like Babe Ruth with zeroes).

**Key Findings:**
- Traits do NOT affect grade calculation - grades are determined purely by ratings
- Position does NOT affect the formula (same weights for all positions)
- Pitcher type (SP/RP/CP) does NOT affect the formula

## Position Player Grade Formula

**Derived Formula (r = 0.9343 correlation - HIGH confidence)**

```javascript
function calculatePositionPlayerGrade(ratings) {
  // Weighted formula: Power and Contact matter ~2.6x more than Fielding/Arm
  // Ratio: 3:3:2:1:1 (Power:Contact:Speed:Fielding:Arm)
  const weightedScore = (
    ratings.power * 0.293 +
    ratings.contact * 0.293 +
    ratings.speed * 0.190 +
    ratings.fielding * 0.103 +
    ratings.arm * 0.121
  );

  // Equivalent integer weights for clarity:
  // (Power*3 + Contact*3 + Speed*2 + Fielding*1 + Arm*1) / 10

  // Grade thresholds (derived from SMB4 data analysis)
  if (weightedScore >= 79) return 'S';
  if (weightedScore >= 78) return 'A+';  // Note: S and A+ overlap slightly
  if (weightedScore >= 73) return 'A';
  if (weightedScore >= 65) return 'A-';
  if (weightedScore >= 59) return 'B+';
  if (weightedScore >= 56) return 'B';
  if (weightedScore >= 48) return 'B-';
  if (weightedScore >= 47) return 'C+';
  if (weightedScore >= 39) return 'C';
  if (weightedScore >= 38) return 'C-';
  if (weightedScore >= 35) return 'D+';
  return 'D';
}
```

### Position Player Grade Thresholds Summary

| Grade | Score Range | Mean | Notes |
|-------|-------------|------|-------|
| S | 79-83 | 81 | Elite players |
| A+ | 78-84 | 81 | Near-elite |
| A | 73-81 | 77 | Stars |
| A- | 65-77 | 71 | Very good |
| B+ | 59-73 | 67 | Above average |
| B | 56-69 | 62 | Average |
| B- | 48-63 | 57 | Below average |
| C+ | 47-59 | 53 | Fringe |
| C | 39-53 | 48 | Replacement |
| C- | 38-44 | 41 | Poor |
| D+ | ~37 | 37 | Very poor |
| D | <35 | 33 | Worst |

## Pitcher Grade Formula

**Derived Formula (r = 0.9694 correlation - VERY HIGH confidence)**

```javascript
function calculatePitcherGrade(ratings) {
  // Simple average of all three pitching stats
  // All three are equally weighted (1:1:1)
  const avgRating = (
    ratings.velocity +
    ratings.junk +
    ratings.accuracy
  ) / 3;

  // Grade thresholds (derived from SMB4 data analysis)
  if (avgRating >= 87) return 'S';
  if (avgRating >= 79) return 'A+';
  if (avgRating >= 66) return 'A';
  if (avgRating >= 65) return 'A-';
  if (avgRating >= 57) return 'B+';
  if (avgRating >= 55) return 'B';
  if (avgRating >= 49) return 'B-';
  if (avgRating >= 43) return 'C+';
  if (avgRating >= 25) return 'C';
  if (avgRating >= 32) return 'C-';
  if (avgRating >= 34) return 'D+';
  return 'D';
}
```

### Pitcher Grade Thresholds Summary

| Grade | Score Range | Mean |
|-------|-------------|------|
| S | 87-93 | 89 |
| A+ | 79-87 | 84 |
| A | 66-81 | 76 |
| A- | 65-79 | 71 |
| B+ | 57-72 | 67 |
| B | 55-66 | 60 |
| B- | 49-61 | 54 |
| C+ | 43-53 | 49 |
| C | 25-48 | 42 |
| C- | 32-40 | 38 |
| D+ | 34-37 | 35 |
| D | <25 | 23 |

## gradeWeight Column (from SMB4 data)

The `gradeWeight` field maps directly to letter grades and appears to be a roster construction/salary cap multiplier:

| Grade | gradeWeight |
|-------|-------------|
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
| D+ | 1.5 |
| D | 1.5-1.6 |

## Key Insights

1. **Power = Contact** for position players (equally weighted at 29.3% each)
2. **Speed matters** but less than batting (19% weight)
3. **Fielding + Arm** together only account for ~22% of grade
4. **Pitchers use simple average** - no stat is more important than others
5. **Traits do NOT affect grade** - they only affect gameplay, not the grade calculation

## Generating Fictional Draft Players

```javascript
// Target scores for each grade (position players use weighted score, pitchers use simple avg)
const TARGET_SCORES = {
  position: { S: 81, 'A+': 81, A: 77, 'A-': 71, 'B+': 67, B: 62, 'B-': 57, 'C+': 53, C: 48, 'C-': 41, 'D+': 37, D: 33 },
  pitcher:  { S: 89, 'A+': 84, A: 76, 'A-': 71, 'B+': 67, B: 60, 'B-': 54, 'C+': 49, C: 42, 'C-': 38, 'D+': 35, D: 23 }
};

function generateFictionalPlayer(targetGrade, position, namesDatabase) {
  const isPitcher = ['SP', 'RP', 'CP', 'SP/RP'].includes(position);
  const targetScore = isPitcher
    ? TARGET_SCORES.pitcher[targetGrade]
    : TARGET_SCORES.position[targetGrade];

  const ratings = {};

  if (isPitcher) {
    // Pitchers: simple average, so target all three near targetScore
    ratings.velocity = generateRatingNear(targetScore, 15);
    ratings.junk = generateRatingNear(targetScore, 15);
    ratings.accuracy = generateRatingNear(targetScore, 15);
    // Pitchers also have batting stats (typically low)
    ratings.power = generateRatingNear(15, 15);
    ratings.contact = generateRatingNear(20, 15);
    ratings.speed = generateRatingNear(25, 20);
    ratings.fielding = generateRatingNear(60, 25);
    ratings.arm = 0;
  } else {
    // Position players: weighted formula (3:3:2:1:1)
    // To hit target score, we need to work backwards from the weights
    // Power and Contact are most important (29.3% each)
    // Generate batting stats higher, fielding stats lower
    const battingTarget = targetScore * 1.1;  // Batting stats run higher
    const speedTarget = targetScore * 0.95;   // Speed slightly lower
    const fieldTarget = targetScore * 0.85;   // Fielding/Arm lower impact

    ratings.power = generateRatingNear(battingTarget, 20);
    ratings.contact = generateRatingNear(battingTarget, 20);
    ratings.speed = generateRatingNear(speedTarget, 18);
    ratings.fielding = generateRatingNear(fieldTarget, 20);
    ratings.arm = generateRatingNear(fieldTarget, 20);
    ratings.velocity = 0;
    ratings.junk = 0;
    ratings.accuracy = 0;
  }

  // Clamp all ratings to 0-99
  for (const key in ratings) {
    ratings[key] = Math.max(0, Math.min(99, Math.round(ratings[key])));
  }

  const firstName = namesDatabase.firstNames[Math.floor(Math.random() * namesDatabase.firstNames.length)];
  const lastName = namesDatabase.lastNames[Math.floor(Math.random() * namesDatabase.lastNames.length)];

  // Calculate actual grade from generated ratings
  const actualGrade = isPitcher
    ? calculatePitcherGrade(ratings)
    : calculatePositionPlayerGrade(ratings);

  return {
    name: `${firstName} ${lastName}`,
    position,
    grade: actualGrade,
    ratings,
    age: 19 + Math.floor(Math.random() * 6),
    personality: randomPersonality(),
    traits: [],
    source: 'generated'
  };
}
```

---

# 22. Fan Happiness System

## Overview

Fan happiness is a 0-100 metric that updates dynamically throughout the season based on performance, milestones, awards, and roster moves. It affects Free Agency attraction and determines contraction risk.

## Fan Happiness Dashboard UI

Accessible anytime from Team Menu → Fan Happiness:

### Main Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  💚 FAN HAPPINESS - SAN FRANCISCO GIANTS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CURRENT HAPPINESS: 78 / 100                                                │
│  ████████████████████████████████████████████████░░░░░░░░░░░░  😊 HAPPY     │
│                                                                             │
│  STATUS: Fans are thrilled! The team is exceeding expectations.             │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                             │
│  📊 HAPPINESS BREAKDOWN                                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Base Happiness:                                              50       │  │
│  │                                                                        │  │
│  │ PERFORMANCE VS EXPECTATIONS                                           │  │
│  │ Expected Win%: .555 (based on salary)                                 │  │
│  │ Actual Win%:   .640 (+.085 delta)                                     │  │
│  │ Impact: +8.5 × 1.25 (low-payroll bonus) =                    +11      │  │
│  │                                                                        │  │
│  │ SEASON MILESTONES                                                     │  │
│  │ • Mays 500 HR                                                 +10     │  │
│  │ • Walk-off HR vs Dodgers                                       +5     │  │
│  │ • No-hitter by Marichal                                       +10     │  │
│  │                                                                        │  │
│  │ AWARDS (Season 4)                                                     │  │
│  │ • MVP (Mays)                                                  +10     │  │
│  │ • 5 Gold Gloves                                               +20     │  │
│  │ • 4 Silver Sluggers                                           +16     │  │
│  │                                                                        │  │
│  │ NEGATIVE EVENTS                                                       │  │
│  │ • Lost key trade (Sanford)                                     -4     │  │
│  │ • 10-game losing streak in May                                 -6     │  │
│  │ • High-paid underperformer (Stuart)                           -10     │  │
│  │                                                                        │  │
│  │ TRADES & ROSTER MOVES                                                 │  │
│  │ • Acquired Conigliaro (popular)                                +4     │  │
│  │                                                                        │  │
│  │ NET SEASON IMPACT:                                            +28     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│                                                                             │
│  [View Trend]  [Compare Teams]  [What-If Scenarios]  [Close]                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Happiness Trend Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📈 HAPPINESS TREND - Season 4                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  100 │                                                                      │
│   90 │                                    ╭───●                             │
│   80 │                           ╭────────╯                    ● Current    │
│   70 │              ╭────────────╯                                          │
│   60 │         ╭────╯                                                       │
│   50 │────●────╯                                                            │
│   40 │                                                                      │
│   30 │  - - - - - - - - - - - - - CONTRACTION ZONE - - - - - - - - - - -   │
│   20 │                                                                      │
│   10 │                                                                      │
│    0 └──────────────────────────────────────────────────────────────────    │
│       Apr   May   Jun   Jul   Aug   Sep   Oct                               │
│                                                                             │
│  KEY EVENTS:                                                                │
│  🔵 Apr 15: Season Start (50)                                               │
│  🟢 May 23: 8-game win streak (+6)                                          │
│  🔴 Jun 5:  Lost to rival Dodgers 3 straight (-4)                           │
│  🟢 Jul 12: Mays 500 HR (+10)                                               │
│  🟢 Aug 28: Clinched playoff spot (+8)                                      │
│  🟢 Oct 4:  Won World Series (+25) → 78                                     │
│                                                                             │
│                              [Back to Dashboard]                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Contraction Warning (If Applicable)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️ CONTRACTION WARNING - KANSAS CITY ATHLETICS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CURRENT HAPPINESS: 22 / 100                                                │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  😞 DISMAL         │
│                                                                             │
│  ⚠️ BELOW 30 FOR 3 CONSECUTIVE SEASONS                                     │
│                                                                             │
│  CONTRACTION PROBABILITY: 70%                                               │
│  (Will be determined at end of Season 4)                                    │
│                                                                             │
│  WHY ARE FANS UNHAPPY?                                                      │
│  ─────────────────────                                                      │
│  • Team record: 42-118 (.262)                        -28                    │
│  • Expected .420 based on salary                     (Huge miss!)           │
│  • Lost franchise player (Reggie Jackson trade)      -12                    │
│  • No playoff appearance in 6 seasons                -8                     │
│  • Zero awards                                       -4                     │
│  • Stadium considered "worst in league"              -3                     │
│                                                                             │
│  HOW TO AVOID CONTRACTION:                                                  │
│  ─────────────────────────                                                  │
│  • Win more games (exceed expectations)                                     │
│  • Sign popular free agents                                                 │
│  • Develop homegrown stars                                                  │
│  • Win an award                                                             │
│  • Achieve a memorable moment                                               │
│                                                                             │
│  🎲 If contraction occurs, players disperse to other teams                  │
│                                                                             │
│                              [Close]                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### League Happiness Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 LEAGUE FAN HAPPINESS RANKINGS                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  RANK  TEAM              HAPPINESS   STATUS         TREND                   │
│  ────────────────────────────────────────────────────────────               │
│   1.   Giants               78       😊 Happy        ↑ +8                   │
│   2.   Dodgers              72       😊 Happy        → +1                   │
│   3.   Cardinals            68       😐 Content      ↑ +5                   │
│   4.   Yankees              65       😐 Content      ↓ -3                   │
│   5.   Reds                 61       😐 Content      ↑ +12                  │
│   ...                                                                       │
│  10.   Senators             38       😟 Unhappy      ↓ -8                   │
│  11.   Mets                 32       😟 Unhappy      → 0                    │
│  12.   Athletics            22       😞 Dismal       ↓ -15  ⚠️ CONTRACTION │
│                                                                             │
│  LEAGUE AVERAGE: 52                                                         │
│                                                                             │
│  HAPPINESS THRESHOLDS:                                                      │
│  🟢 70+: Happy (FA bonus)                                                   │
│  🟡 40-69: Content (neutral)                                                │
│  🟠 30-39: Unhappy (FA penalty)                                             │
│  🔴 0-29: Dismal (contraction risk)                                         │
│                                                                             │
│                              [Close]                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Season Length Scaling

All qualifying thresholds are based on a 162-game MLB season and must be scaled proportionally:

```javascript
const BASE_SEASON_LENGTH = 162;

function scaleThreshold(baseValue, seasonLength) {
  return Math.round(baseValue * (seasonLength / BASE_SEASON_LENGTH));
}

// Milestone thresholds object with base (162-game) values
const MILESTONE_THRESHOLDS = {
  // Batting qualifiers
  MIN_AB_FOR_AVG: 200,
  MIN_IP_STARTER: 80,
  MIN_IP_ELITE_ERA: 150,

  // Season achievements
  HR_50_SEASON: 50,
  HR_60_SEASON: 60,
  HITS_200_SEASON: 200,
  WINS_20_SEASON: 20,
  WINS_25_SEASON: 25,
  K_300_SEASON: 300,
  LOSSES_20_SEASON: 20,
  BLOWN_SAVES_10: 10,
  ERRORS_40_SEASON: 40,

  // Team thresholds
  TEAM_100_LOSSES: 100,
  TEAM_110_LOSSES: 110,
  TEAM_100_WINS: 100,
  LOSING_STREAK_15: 15,
  LOSING_STREAK_20: 20,

  // Career thresholds (also scale with season length)
  CAREER_HR_TIER_1: 300,
  CAREER_HR_TIER_2: 400,
  CAREER_HR_TIER_3: 500,
  CAREER_HR_TIER_4: 600,
  CAREER_HITS_TIER_1: 1500,
  CAREER_HITS_TIER_2: 2000,
  CAREER_HITS_TIER_3: 2500,
  CAREER_HITS_TIER_4: 3000,
  CAREER_RBI_TIER_1: 1000,
  CAREER_RBI_TIER_2: 1500,
  CAREER_RBI_TIER_3: 2000,
  CAREER_SB_TIER_1: 300,
  CAREER_SB_TIER_2: 500,
  CAREER_WINS_TIER_1: 100,
  CAREER_WINS_TIER_2: 150,
  CAREER_WINS_TIER_3: 200,
  CAREER_WINS_TIER_4: 250,
  CAREER_WINS_TIER_5: 300,
  CAREER_K_PITCHER_TIER_1: 1500,
  CAREER_K_PITCHER_TIER_2: 2000,
  CAREER_K_PITCHER_TIER_3: 2500,
  CAREER_K_PITCHER_TIER_4: 3000,
  CAREER_SAVES_TIER_1: 50,
  CAREER_SAVES_TIER_2: 100,
  CAREER_SAVES_TIER_3: 200,
  CAREER_SAVES_TIER_4: 300,
  CAREER_SAVES_TIER_5: 400,
  // Negative career thresholds
  CAREER_K_BATTING_TIER_1: 1500,
  CAREER_K_BATTING_TIER_2: 2000,
  CAREER_GIDP_TIER_1: 500,
  CAREER_LOSSES_TIER_1: 100,
  CAREER_LOSSES_TIER_2: 150,
  CAREER_LOSSES_TIER_3: 200,
  CAREER_HR_ALLOWED_TIER_1: 500,
  CAREER_HR_ALLOWED_TIER_2: 600,
  CAREER_BB_TIER_1: 1000,
  CAREER_ERRORS_TIER_1: 100,
  CAREER_ERRORS_TIER_2: 150,
};

function getScaledThreshold(thresholdKey, seasonLength) {
  return scaleThreshold(MILESTONE_THRESHOLDS[thresholdKey], seasonLength);
}
```

### Scaling Reference Tables

**SEASON THRESHOLDS:**
| Threshold (162g) | 64 games | 48 games | 32 games | 16 games |
|------------------|----------|----------|----------|----------|
| 200 AB | 79 AB | 59 AB | 40 AB | 20 AB |
| 80 IP | 32 IP | 24 IP | 16 IP | 8 IP |
| 50 HR | 20 HR | 15 HR | 10 HR | 5 HR |
| 100 Losses | 40 L | 30 L | 20 L | 10 L |
| 15-game L streak | 6 games | 4 games | 3 games | 2 games |

**CAREER THRESHOLDS:**
| Threshold (162g) | 64 games | 48 games | 32 games | 16 games |
|------------------|----------|----------|----------|----------|
| 300 HR | 119 HR | 89 HR | 59 HR | 30 HR |
| 500 HR | 198 HR | 148 HR | 99 HR | 49 HR |
| 3000 Hits | 1185 H | 889 H | 593 H | 296 H |
| 300 Wins | 119 W | 89 W | 59 W | 30 W |
| 200 Losses | 79 L | 59 L | 40 L | 20 L |

## Happiness Tiers & Effects

| Happiness | Emoji | Status | Effects |
|-----------|-------|--------|---------|
| 80-100 | 😍 | **Ecstatic** | Immunity from contraction, +5% FA attraction |
| 60-79 | 😊 | **Happy** | Normal operations, +2% FA attraction |
| 40-59 | 😐 | **Neutral** | Normal operations |
| 20-39 | 😟 | **Unhappy** | Manager hot seat (+15% fire), -5% FA attraction |
| 10-19 | 😠 | **Angry** | Manager very hot seat (+30% fire), -10% FA attraction |
| 0-9 | 💀 | **Furious** | CONTRACTION RISK, -20% FA attraction |
| <15 | 🛍️ | (Paper Bags) | Fans wearing bags indicator |

## Payroll Amplifiers

```javascript
function getAmplifier(performanceDelta, payrollPercentile) {
  if (performanceDelta < 0) {
    // Underperformance: high payroll = amplified shame
    if (payrollPercentile >= 0.75) return 1.5;
    if (payrollPercentile >= 0.50) return 1.25;
  } else {
    // Overperformance: low payroll = extra credit
    if (payrollPercentile < 0.25) return 1.5;
    if (payrollPercentile < 0.50) return 1.25;
  }
  return 1.0;
}
```

## Milestone Happiness Effects

```javascript
const MILESTONE_HAPPINESS_EFFECTS = {
  // SINGLE-GAME POSITIVE (no scaling needed)
  SINGLE_GAME_POSITIVE: {
    WALK_OFF_HIT: 3,
    WALK_OFF_HR: 5,
    GRAND_SLAM: 4,
    WALK_OFF_GRAND_SLAM: 10,
    CYCLE: 6,
    FOUR_HR_GAME: 8,
    NO_HITTER: 10,
    PERFECT_GAME: 15,
    TWENTY_STRIKEOUT_GAME: 8,
    IMMACULATE_INNING: 5,
    INSIDE_THE_PARK_HR: 3,
    POSITION_PLAYER_PITCHING_WIN: 4,
    PITCHER_HITS_HR: 4,
  },

  // SINGLE-GAME NEGATIVE (no scaling needed)
  SINGLE_GAME_NEGATIVE: {
    TEAM_NO_HIT: -5,
    TEAM_PERFECT_GAMED: -8,
    BLOWN_SAVE_WALKOFF: -4,
    LOSS_AFTER_LEADING_BY_10_PLUS: -6,
    POSITION_PLAYER_PITCHES_IN_BLOWOUT_LOSS: -3,
    HIT_INTO_TRIPLE_PLAY: -2,
    FIVE_ERRORS_IN_GAME: -4,
    PITCHER_ALLOWS_4_HR_IN_INNING: -4,
    PITCHER_ALLOWS_10_RUNS_BEFORE_RECORDING_OUT: -5,
  },

  // SEASON POSITIVE (thresholds scale)
  SEASON_POSITIVE: {
    PLAYER_HR_LEADER_ELITE: 8,         // 50 HR base
    PLAYER_HR_LEADER_HISTORIC: 12,     // 60 HR base
    PLAYER_HITS_LEADER: 6,             // 200 hits base
    PLAYER_TRIPLE_CROWN: 15,
    PITCHER_WINS_LEADER: 8,            // 20 wins base
    PITCHER_WINS_DOMINANT: 12,         // 25 wins base
    PITCHER_K_LEADER: 8,               // 300 K base
    PITCHER_ELITE_ERA: 10,             // Sub-2.00 ERA
    TEAM_CLINCHES_PLAYOFF: 5,
    TEAM_CLINCHES_DIVISION: 7,
    TEAM_DOMINANT_RECORD: 10,          // 100 wins base
    TEAM_BEST_RECORD_IN_LEAGUE: 5,
  },

  // SEASON NEGATIVE (thresholds scale) - "Paper bag on head" moments
  SEASON_NEGATIVE: {
    PLAYER_BATTING_UNDER_150: -4,
    PLAYER_BATTING_UNDER_200: -2,
    PLAYER_ERRORS_LEADER: -3,
    PITCHER_ERA_OVER_7: -4,
    PITCHER_ERA_OVER_6: -2,
    PITCHER_LOSSES_LEADER: -5,
    CLOSER_BLOWN_SAVES_LEADER: -4,
    TEAM_ON_PACE_FOR_WORST: -3,
    TEAM_WORST_RECORD: -8,             // 100 losses base
    TEAM_HISTORICALLY_BAD: -12,        // 110 losses base
    TEAM_WORST_IN_LEAGUE: -5,
    TEAM_SWEPT_BY_RIVAL: -2,
    TEAM_MAJOR_LOSING_STREAK: -5,      // 15 games base
    TEAM_HISTORIC_LOSING_STREAK: -10,  // 20 games base
    STAR_PLAYER_DEMANDS_TRADE: -5,
  },

  // CAREER POSITIVE (thresholds scale)
  CAREER_POSITIVE: {
    PLAYER_CAREER_HR_TIER_1: 5,        // 300 HR base
    PLAYER_CAREER_HR_TIER_2: 8,        // 400 HR base
    PLAYER_CAREER_HR_TIER_3: 10,       // 500 HR base
    PLAYER_CAREER_HR_TIER_4: 12,       // 600 HR base
    PLAYER_CAREER_HITS_TIER_1: 3,      // 1500 hits base
    PLAYER_CAREER_HITS_TIER_2: 6,      // 2000 hits base
    PLAYER_CAREER_HITS_TIER_3: 8,      // 2500 hits base
    PLAYER_CAREER_HITS_TIER_4: 15,     // 3000 hits base
    PLAYER_CAREER_RBI_TIER_1: 4,       // 1000 RBI base
    PLAYER_CAREER_RBI_TIER_2: 8,       // 1500 RBI base
    PLAYER_CAREER_RBI_TIER_3: 12,      // 2000 RBI base
    PLAYER_CAREER_SB_TIER_1: 5,        // 300 SB base
    PLAYER_CAREER_SB_TIER_2: 8,        // 500 SB base
    PITCHER_CAREER_WINS_TIER_1: 3,     // 100 wins base
    PITCHER_CAREER_WINS_TIER_2: 5,     // 150 wins base
    PITCHER_CAREER_WINS_TIER_3: 8,     // 200 wins base
    PITCHER_CAREER_WINS_TIER_4: 10,    // 250 wins base
    PITCHER_CAREER_WINS_TIER_5: 15,    // 300 wins base
    PITCHER_CAREER_K_TIER_1: 4,        // 1500 K base
    PITCHER_CAREER_K_TIER_2: 6,        // 2000 K base
    PITCHER_CAREER_K_TIER_3: 8,        // 2500 K base
    PITCHER_CAREER_K_TIER_4: 12,       // 3000 K base
    PITCHER_CAREER_SAVES_TIER_1: 3,    // 50 saves base
    PITCHER_CAREER_SAVES_TIER_2: 5,    // 100 saves base
    PITCHER_CAREER_SAVES_TIER_3: 8,    // 200 saves base
    PITCHER_CAREER_SAVES_TIER_4: 10,   // 300 saves base
    PITCHER_CAREER_SAVES_TIER_5: 12,   // 400 saves base
  },

  // CAREER NEGATIVE (thresholds scale) - "The franchise's dark legacy"
  CAREER_NEGATIVE: {
    PLAYER_CAREER_K_BATTING_TIER_1: -3,    // 1500 K base
    PLAYER_CAREER_K_BATTING_TIER_2: -5,    // 2000 K base
    PLAYER_CAREER_GIDP_TIER_1: -2,         // 500 GIDP base
    PITCHER_CAREER_LOSSES_TIER_1: -2,      // 100 losses base
    PITCHER_CAREER_LOSSES_TIER_2: -4,      // 150 losses base
    PITCHER_CAREER_LOSSES_TIER_3: -6,      // 200 losses base
    PITCHER_CAREER_HR_ALLOWED_TIER_1: -3,  // 500 HR allowed base
    PITCHER_CAREER_HR_ALLOWED_TIER_2: -5,  // 600 HR allowed base
    PITCHER_CAREER_BB_TIER_1: -2,          // 1000 BB base
    PLAYER_CAREER_ERRORS_TIER_1: -2,       // 100 errors base
    PLAYER_CAREER_ERRORS_TIER_2: -4,       // 150 errors base
  }
};
```

## Award Happiness Effects

```javascript
const AWARD_HAPPINESS_EFFECTS = {
  // Major Awards (with runner-ups)
  MVP: { WINNER: 10, RUNNER_UP: 3, THIRD_PLACE: 1 },
  CY_YOUNG: { WINNER: 8, RUNNER_UP: 3, THIRD_PLACE: 1 },
  RELIEVER_OF_YEAR: { WINNER: 5, RUNNER_UP: 2 },  // Only 1 runner-up

  // Major Awards (winner only)
  ROOKIE_OF_YEAR: { WINNER: 6 },  // No runner-up
  KARA_KAWAGUCHI: { WINNER: 5 },
  COMEBACK_PLAYER: { WINNER: 5 },
  MANAGER_OF_YEAR: { WINNER: 5 },
  BENCH_PLAYER: { WINNER: 3 },

  // Per-position awards
  GOLD_GLOVE: { WINNER: 4 },      // Per position
  SILVER_SLUGGER: { WINNER: 4 },  // Per position

  // League Leader awards
  BATTING_TITLE: { WINNER: 5 },
  HOME_RUN_LEADER: { WINNER: 6 },
  RBI_LEADER: { WINNER: 4 },
  STOLEN_BASE_LEADER: { WINNER: 3 },
  ERA_LEADER: { WINNER: 5 },
  WINS_LEADER: { WINNER: 4 },
  STRIKEOUT_LEADER: { WINNER: 4 },
  SAVES_LEADER: { WINNER: 4 },

  // All-Star & Postseason
  ALL_STAR: { SELECTION: 2 },
  ALL_STAR_MVP: { WINNER: 4 },
  WORLD_SERIES_MVP: { WINNER: 8 },

  // Negative awards
  BUST_OF_YEAR: { HOLDER: -5 },
  GOLDEN_SOMBRERO_LEADER: { HOLDER: -2 },
  ERRORS_LEADER: { HOLDER: -3 }
};
```

## Payroll Amplifier for Awards

```javascript
function applyPayrollAmplifierToAward(baseEffect, payrollPercentile, isPositive) {
  if (isPositive) {
    // Low payroll = extra credit for achievements
    if (payrollPercentile < 0.25) return baseEffect * 1.5;
    if (payrollPercentile < 0.50) return baseEffect * 1.25;
    // High payroll = expected, less credit
    if (payrollPercentile >= 0.75) return baseEffect * 0.75;
    return baseEffect;
  } else {
    // Negative effects: high payroll = amplified shame
    if (payrollPercentile >= 0.75) return baseEffect * 1.5;
    if (payrollPercentile >= 0.50) return baseEffect * 1.25;
    return baseEffect;
  }
}
```

## Applying Milestone Effects

```javascript
function applyMilestoneToFanHappiness(team, milestone, payrollPercentile) {
  let effect = 0;

  for (const category of Object.values(MILESTONE_HAPPINESS_EFFECTS)) {
    if (category[milestone.type] !== undefined) {
      effect = category[milestone.type];
      break;
    }
  }

  if (effect === 0) return 0;

  const isPositive = effect > 0;
  effect = applyPayrollAmplifierToAward(effect, payrollPercentile, isPositive);

  team.seasonMilestones.push({
    type: milestone.type,
    effect: Math.round(effect),
    player: milestone.player,
    gameNumber: milestone.gameNumber,
    details: milestone.details
  });

  return Math.round(effect);
}
```

## Fan Happiness Display

```javascript
function getFanHappinessDisplay(happiness, recentMilestones) {
  const emoji = happiness >= 80 ? '😍' :
                happiness >= 60 ? '😊' :
                happiness >= 40 ? '😐' :
                happiness >= 20 ? '😟' :
                happiness >= 10 ? '😠' : '💀';

  const status = happiness >= 80 ? 'ECSTATIC' :
                 happiness >= 60 ? 'HAPPY' :
                 happiness >= 40 ? 'NEUTRAL' :
                 happiness >= 20 ? 'UNHAPPY' :
                 happiness >= 10 ? 'ANGRY' : 'FURIOUS';

  const paperBag = happiness < 15 ? ' 🛍️' : '';

  return {
    emoji: emoji + paperBag,
    status,
    value: happiness,
    color: happiness >= 60 ? '#4CAF50' :
           happiness >= 40 ? '#FFC107' :
           happiness >= 20 ? '#FF9800' : '#F44336',
    recentMilestones: recentMilestones.slice(-3).map(m => ({
      text: getMilestoneText(m),
      effect: m.effect > 0 ? `+${m.effect}` : `${m.effect}`
    }))
  };
}
```

## Contraction Probability

```javascript
const CONTRACTION_MODIFIERS = {
  CONSECUTIVE_UNHAPPY_SEASONS: 0.15,  // +15% per consecutive season
  HIGH_PAYROLL_LAST_PLACE: 0.20,      // +20% if top 25% payroll AND last
  RECENT_CHAMPIONSHIP: -0.50,          // -50% if champion in last 3 seasons
  NEW_STADIUM: -0.25                   // -25% if stadium built in last 2 seasons
};

// Base probability from happiness:
// 30-59: 0%, 15-29: 10%, 5-14: 35%, 0-4: 70%
```

---

# 23. Personality System

## Overview

Personalities are hidden from users and randomly assigned. They are revealed during Free Agency to determine player destinations.

## Assignment

```javascript
function assignPersonality(player) {
  const personalities = [
    { type: 'Competitive', weight: 20 },
    { type: 'Relaxed', weight: 20 },
    { type: 'Droopy', weight: 5 },      // Rare
    { type: 'Jolly', weight: 20 },
    { type: 'Tough', weight: 15 },
    { type: 'Timid', weight: 10 },
    { type: 'Egotistical', weight: 10 }
  ];
  return weightedRandom(personalities);
}
```

## Year-Over-Year Changes

```javascript
function maybeChangePersonality(player, seasonEvents) {
  const CHANGE_PROBABILITY = 0.10;  // 10% base chance

  let modifier = 1.0;
  if (seasonEvents.wonChampionship) modifier *= 0.5;
  if (seasonEvents.hadBadSeason) modifier *= 1.5;
  if (seasonEvents.wasBenched) modifier *= 2.0;

  if (Math.random() < CHANGE_PROBABILITY * modifier) {
    player.personality = assignPersonality(player);
  }
}
```

## Free Agency Destinations

| Personality | Destination |
|-------------|-------------|
| **Competitive** | Rival team (closest H2H record to .500) |
| **Relaxed** | Random team via dice (current team included) |
| **Droopy** | Retires immediately |
| **Jolly** | Stays with current team |
| **Tough** | Team with highest OPS |
| **Timid** | Champion team |
| **Egotistical** | Worst team (wants spotlight) |

---

# 24. Museum & Historical Data

## Overview

The Museum is the central hub for all league-wide historical data, separate from team-specific history.

## Museum Tabs

### 1. Hall of Fame

Inducted players with full career stats and highlights.

### 2. 50 Greatest Players

All-time leaderboard using MVP voting formula:

```javascript
function calculateGreatestScore(player) {
  const warScore = normalizeToRange(player.careerWAR, allCareerWARs) * 0.50;
  const clutchScore = normalizeToRange(player.careerClutch, allClutchScores) * 0.25;
  const fameScore = normalizeToRange(player.peakFame, allFameScores) * 0.20;
  const champScore = Math.min(player.championships * 2, 5);

  return warScore + clutchScore + fameScore + champScore;
}
```

### 3. League Records

- Career records (HR, Hits, RBI, Wins, K, Saves)
- Single-season records
- Single-game records

### 4. Championship History

Season-by-season champions, runners-up, and playoff MVPs.

### 5. All-Time Stats

Career stat leaders by category (sortable).

## Data Structure

```javascript
const museum = {
  hallOfFame: [{
    player: playerData,
    inductionSeason: 4,
    careerStats: { /* full stats */ },
    highlights: ['2x MVP', '8x All-Star'],
    teams: ['Giants (S1-S4)']
  }],

  fiftyGreatest: [/* calculated dynamically */],

  leagueRecords: {
    career: { homeRuns: { player: 'Babe Ruth', value: 714 } },
    singleSeason: { homeRuns: { player: 'Barry Bonds', value: 73, season: 2 } },
    singleGame: { strikeouts: { player: 'Roger Clemens', value: 20 } }
  },

  championshipHistory: [
    { season: 1, champion: 'Giants', runner_up: 'Dodgers', mvp: 'Willie Mays' }
  ]
};
```

**Note:** Team-specific historical data (retired numbers, team records) stays on Team History tab.

### 6. Award History

Season-by-season award winners for all major awards, searchable by player or team.

---

## Award Emblems System

Players display **award emblems** throughout the app to acknowledge their achievements. These serve as visual reminders of a player's legacy and make tracking legends more engaging.

### Emblem Icons

| Award | Emblem | Notes |
|-------|--------|-------|
| MVP | 🏆 MVP | League MVP |
| Cy Young | 🏆 CY | Best pitcher |
| Rookie of the Year | 🌟 ROY | Top rookie |
| Reliever of the Year | 🔥 ROTY | Best reliever |
| Gold Glove | 🧤 GG | Defensive excellence |
| Silver Slugger | ⚾ SS | Best hitter at position |
| Kara Kawaguchi | 💎 KK | Best value player |
| Comeback Player | 🔄 CB | Bounce-back season |
| Manager of the Year | 📋 MOY | Best manager |
| Bust of the Year | 💩 BUST | Biggest disappointment |
| All-Star | ⭐ AS | All-Star selection |
| World Series MVP | 🏆 WSMVP | Playoff MVP |
| Hall of Fame | 🎖️ HOF | Inducted legend |

### Display Locations

**1. In-Game Tracking Screen**
```
+--------------------------------------------------+
|  AT BAT: Willie Mays  🏆MVP ⭐AS(3) 🧤GG(2)       |
|  Giants | CF | A+ | .312 / 24 HR / 67 RBI        |
+--------------------------------------------------+
```
- Emblems appear next to player name
- Count in parentheses for multi-year awards (e.g., "AS(3)" = 3x All-Star)
- Shows career awards, not just current season

**2. Team Roster Page**
```
+------------------------------------------------------------------+
|  GIANTS ROSTER - Season 4                                         |
+------------------------------------------------------------------+
| # | Player           | Pos | Grade | Salary | Awards             |
+------------------------------------------------------------------+
| 24| Willie Mays      | CF  | A+    | $12.5M | 🏆MVP 🧤GG(2) ⭐(3) |
| 44| Willie McCovey   | 1B  | A     | $9.2M  | ⚾SS(2) ⭐(2)       |
| 27| Juan Marichal    | SP  | A     | $8.8M  | 🏆CY ⭐(4)          |
| 12| Dusty Rhodes     | OF  | B-    | $2.1M  | 💎KK 🔄CB          |
+------------------------------------------------------------------+
```

**3. Player Detail Card**
```
+------------------------------------------------------------------+
|  WILLIE MAYS                                                      |
|  San Francisco Giants | Center Field | Grade: A+                  |
+------------------------------------------------------------------+
|                                                                   |
|  CAREER AWARDS                                                    |
|  ├─ 🏆 MVP (Season 2)                                             |
|  ├─ 🧤 Gold Glove (Seasons 1, 3)                                  |
|  ├─ ⭐ All-Star (Seasons 1, 2, 3)                                 |
|  └─ 🏆 World Series MVP (Season 2)                                |
|                                                                   |
+------------------------------------------------------------------+
```

**4. Museum - Award History Tab**
```
+------------------------------------------------------------------+
|  MVP AWARD HISTORY                                                |
+------------------------------------------------------------------+
| Season | Winner           | Team     | WAR  | Runner-Up          |
+------------------------------------------------------------------+
| 4      | Hank Aaron       | Braves   | 8.2  | Willie Mays        |
| 3      | Roberto Clemente | Pirates  | 7.8  | Ernie Banks        |
| 2      | Willie Mays 🏆   | Giants   | 9.1  | Mickey Mantle      |
| 1      | Mickey Mantle    | Yankees  | 8.5  | Ted Williams       |
+------------------------------------------------------------------+
```

### Data Structure

```javascript
// Player award tracking
const playerAwards = {
  playerId: 'willie-mays-001',
  awards: [
    { type: 'MVP', seasons: [2], count: 1 },
    { type: 'GOLD_GLOVE', seasons: [1, 3], count: 2 },
    { type: 'ALL_STAR', seasons: [1, 2, 3], count: 3 },
    { type: 'WORLD_SERIES_MVP', seasons: [2], count: 1 }
  ]
};

// Get emblem display string
function getPlayerEmblems(player, options = { showCounts: true }) {
  const emblems = [];

  for (const award of player.awards) {
    const icon = AWARD_EMBLEMS[award.type];
    if (options.showCounts && award.count > 1) {
      emblems.push(`${icon}(${award.count})`);
    } else {
      emblems.push(icon);
    }
  }

  return emblems.join(' ');
}

const AWARD_EMBLEMS = {
  MVP: '🏆MVP',
  CY_YOUNG: '🏆CY',
  ROOKIE_OF_YEAR: '🌟ROY',
  RELIEVER_OF_YEAR: '🔥ROTY',
  GOLD_GLOVE: '🧤GG',
  SILVER_SLUGGER: '⚾SS',
  KARA_KAWAGUCHI: '💎KK',
  COMEBACK_PLAYER: '🔄CB',
  MANAGER_OF_YEAR: '📋MOY',
  BUST_OF_YEAR: '💩BUST',
  ALL_STAR: '⭐AS',
  WORLD_SERIES_MVP: '🏆WSMVP',
  HALL_OF_FAME: '🎖️HOF'
};
```

### Emblem Priority (When Space Limited)

If display space is limited, show emblems in this priority order:
1. Hall of Fame (🎖️HOF)
2. MVP (🏆MVP)
3. Cy Young (🏆CY)
4. World Series MVP (🏆WSMVP)
5. Gold Glove (🧤GG)
6. Silver Slugger (⚾SS)
7. Rookie of the Year (🌟ROY)
8. All-Star (⭐AS) - always show count
9. Other awards

**Example (limited space):** `Willie Mays 🏆MVP 🧤GG(2) ⭐(3)`

---

# 25. In-Season Trade System

## Overview

Trades can be executed at any point during the season, with the app specifically prompting at the fictional Trade Deadline (July 31). The system tracks player stats before and after trades, accumulates full-season totals, and generates trade-related storylines.

---

## Trade Execution

### Trade Window

```javascript
const TRADE_RULES = {
  // Trade can happen anytime during regular season
  TRADE_WINDOW: {
    start: 'OPENING_DAY',  // March 28
    deadline: { month: 7, day: 31 },  // July 31
    postDeadlineAllowed: false  // No trades after deadline (like MLB)
  },

  // Trade deadline prompt
  DEADLINE_PROMPT: {
    triggerGame: (totalGames) => Math.floor(totalGames * 0.65),  // ~65% through season
    message: "⏰ TRADE DEADLINE APPROACHING (July 31) - Any moves to make?"
  }
};

function isTradeWindowOpen(currentGameDate) {
  const deadline = new Date(currentGameDate.getFullYear(), 6, 31);  // July 31
  return currentGameDate <= deadline;
}
```

### Trade Interface

```
+------------------------------------------------------------------+
|  🔄 EXECUTE TRADE                                                  |
+------------------------------------------------------------------+
|                                                                    |
|  TEAM A: Giants                    TEAM B: Dodgers                 |
|  ┌─────────────────────┐          ┌─────────────────────┐         |
|  │ Select Players...   │          │ Select Players...   │         |
|  │                     │          │                     │         |
|  │ ☑ Duke Snider (OF)  │    🔄    │ ☑ Willie Davis (OF) │         |
|  │ ☐ Don Drysdale (SP) │          │ ☑ Cash ($50K)       │         |
|  │ ☐ Ron Fairly (1B)   │          │ ☐ Jim Lefebvre (2B) │         |
|  └─────────────────────┘          └─────────────────────┘         |
|                                                                    |
|  TRADE SUMMARY:                                                    |
|  Giants receive: Willie Davis (.285, 12 HR, 2.1 WAR), $50K         |
|  Dodgers receive: Duke Snider (.271, 18 HR, 2.8 WAR)               |
|                                                                    |
|  📊 WAR EXCHANGE: Giants -0.7 WAR | Dodgers +0.7 WAR               |
|  💰 SALARY EXCHANGE: Giants +$150K | Dodgers -$150K                |
|                                                                    |
|  [CANCEL]                              [CONFIRM TRADE]             |
+------------------------------------------------------------------+
```

### Trade Confirmation

```
+------------------------------------------------------------------+
|  ✅ TRADE COMPLETED - June 15th                                    |
+------------------------------------------------------------------+
|                                                                    |
|  📰 HEADLINE: "Giants acquire Willie Davis in blockbuster deal!"   |
|                                                                    |
|  GIANTS RECEIVE:                   DODGERS RECEIVE:                |
|  • Willie Davis (OF)               • Duke Snider (OF)              |
|  • $50,000 cash                                                    |
|                                                                    |
|  STORYLINES ACTIVATED:                                             |
|  🔥 Duke Snider will face former team (Giants) - Revenge Game      |
|  🔥 Willie Davis will face former team (Dodgers) - Revenge Game    |
|                                                                    |
+------------------------------------------------------------------+
```

---

## Stat Tracking Before/After Trade

### Split Stats Structure

```javascript
const PLAYER_SEASON_STATS = {
  playerId: 'player_123',
  season: 4,

  // Full season totals (always accumulated)
  fullSeason: {
    games: 95,
    atBats: 380,
    hits: 108,
    homeRuns: 22,
    rbi: 67,
    war: 3.4,
    // ... all stats
  },

  // Stats by team (for split tracking)
  byTeam: [
    {
      teamId: 'dodgers',
      teamName: 'Dodgers',
      dateRange: { start: 'Mar 28', end: 'Jun 15' },
      gameRange: { start: 1, end: 45 },
      stats: {
        games: 45,
        atBats: 180,
        hits: 48,
        homeRuns: 12,
        rbi: 35,
        war: 1.8,
        avg: .267
      }
    },
    {
      teamId: 'giants',
      teamName: 'Giants',
      dateRange: { start: 'Jun 16', end: 'Sep 29' },
      gameRange: { start: 46, end: 95 },
      stats: {
        games: 50,
        atBats: 200,
        hits: 60,
        homeRuns: 10,
        rbi: 32,
        war: 1.6,
        avg: .300
      }
    }
  ],

  // Trade history this season
  trades: [
    {
      date: 'Jun 15',
      gameNumber: 45,
      from: 'dodgers',
      to: 'giants',
      tradedWith: ['cash_50k'],
      tradedFor: ['player_456']
    }
  ]
};
```

### Stat Accumulation Logic

```javascript
function recordPlayerStat(playerId, stat, value) {
  const player = getPlayer(playerId);
  const currentTeam = player.currentTeam;

  // Always update full season totals
  player.seasonStats.fullSeason[stat] += value;

  // Update current team split
  const currentSplit = player.seasonStats.byTeam.find(
    t => t.teamId === currentTeam && !t.dateRange.end
  );

  if (currentSplit) {
    currentSplit.stats[stat] += value;
  }

  // Recalculate rate stats
  recalculateRateStats(player);
}

function executeTradeStatSplit(player, fromTeam, toTeam, gameNumber) {
  // Close out previous team's split
  const previousSplit = player.seasonStats.byTeam.find(
    t => t.teamId === fromTeam && !t.dateRange.end
  );

  if (previousSplit) {
    previousSplit.dateRange.end = getCurrentGameDate();
    previousSplit.gameRange.end = gameNumber;
  }

  // Start new team split
  player.seasonStats.byTeam.push({
    teamId: toTeam,
    teamName: getTeamName(toTeam),
    dateRange: { start: getCurrentGameDate(), end: null },
    gameRange: { start: gameNumber + 1, end: null },
    stats: initializeEmptyStats()
  });
}
```

### Split Stats Display

```
+------------------------------------------------------------------+
|  DUKE SNIDER - Season 4 Stats                                      |
+------------------------------------------------------------------+
|                                                                    |
|  📊 FULL SEASON TOTALS                                             |
|  .274 | 22 HR | 67 RBI | 3.4 WAR | 95 G                           |
|                                                                    |
|  ─────────────────────────────────────────────────────────────     |
|                                                                    |
|  📍 WITH DODGERS (Mar 28 - Jun 15)                                 |
|  .267 | 12 HR | 35 RBI | 1.8 WAR | 45 G                           |
|                                                                    |
|  📍 WITH GIANTS (Jun 16 - Present)                                 |
|  .300 | 10 HR | 32 RBI | 1.6 WAR | 50 G                           |
|  🔥 Hitting .300 since trade!                                      |
|                                                                    |
+------------------------------------------------------------------+
```

---

## Trade Deadline Prompt

### Automatic Deadline Alert

```javascript
function checkTradeDeadlinePrompt(gameNumber, totalGames) {
  const deadlineGame = Math.floor(totalGames * 0.65);

  if (gameNumber === deadlineGame) {
    return {
      show: true,
      message: "⏰ TRADE DEADLINE APPROACHING",
      subtext: "July 31st - Last chance to make moves!",
      options: [
        { label: "Make a Trade", action: 'OPEN_TRADE_SCREEN' },
        { label: "No Trades", action: 'DISMISS' }
      ]
    };
  }

  // Post-deadline warning
  if (gameNumber === deadlineGame + 1) {
    return {
      show: true,
      message: "🔒 TRADE DEADLINE HAS PASSED",
      subtext: "No more trades until next season",
      options: [
        { label: "OK", action: 'DISMISS' }
      ]
    };
  }

  return { show: false };
}
```

### Trade Deadline UI

```
+------------------------------------------------------------------+
|  ⏰ TRADE DEADLINE - JULY 31st                                     |
+------------------------------------------------------------------+
|                                                                    |
|  The trade deadline is here! After today, rosters are locked       |
|  until the offseason.                                              |
|                                                                    |
|  YOUR TEAMS' SITUATIONS:                                           |
|                                                                    |
|  GIANTS (32-18, 1st place)                                         |
|  💰 Salary Cap Space: $250K                                        |
|  📈 Contender - Consider acquiring for playoff push                |
|                                                                    |
|  DODGERS (25-25, 3rd place)                                        |
|  💰 Salary Cap Space: $180K                                        |
|  🤔 On the bubble - Buy or sell?                                   |
|                                                                    |
|  [MAKE A TRADE]              [NO TRADES - LOCK ROSTERS]            |
|                                                                    |
+------------------------------------------------------------------+
```

---

## Trade Impact on Systems

### WAR Attribution

```javascript
// WAR counts toward TEAM where it was earned
function getTeamSeasonWAR(teamId, season) {
  let totalWAR = 0;

  for (const player of getAllPlayers()) {
    const teamSplit = player.seasonStats.byTeam?.find(
      t => t.teamId === teamId
    );

    if (teamSplit) {
      totalWAR += teamSplit.stats.war;
    }
  }

  return totalWAR;
}

// WAR counts toward PLAYER's full season for awards
function getPlayerSeasonWAR(playerId, season) {
  const player = getPlayer(playerId);
  return player.seasonStats.fullSeason.war;
}
```

### Award Eligibility

```javascript
const TRADE_AWARD_RULES = {
  // MVP/Cy Young: Use full season stats regardless of teams
  MVP: { useFullSeason: true },
  CY_YOUNG: { useFullSeason: true },

  // All-Star: Based on stats at time of voting (60% mark)
  ALL_STAR: { useStatsAtVotingTime: true },

  // ROY/ROTY: Must have rookie status, full season counts
  ROY: { useFullSeason: true },
  ROTY: { useFullSeason: true },

  // Team awards: Only stats with that team
  TEAM_MVP: { useTeamSplitOnly: true },

  // Positional awards: Full season
  GOLD_GLOVE: { useFullSeason: true },
  SILVER_SLUGGER: { useFullSeason: true }
};
```

### EOS Ratings Adjustment

```javascript
// EOS adjustments apply to player's CURRENT team
function calculateEOSAdjustment(player) {
  // Use full season WAR for performance evaluation
  const fullSeasonWAR = player.seasonStats.fullSeason.war;

  // Compare against positional peers (full season)
  const warPercentile = getWARPercentileAtPosition(player, fullSeasonWAR);
  const salaryPercentile = getSalaryPercentileAtPosition(player);

  // Calculate adjustment
  const performanceDelta = warPercentile - salaryPercentile;

  return {
    adjustment: calculateAdjustmentPoints(performanceDelta, salaryPercentile),
    appliesTo: player.currentTeam,  // Current team gets the adjustment
    note: player.trades?.length > 0
      ? `Traded mid-season (${player.trades.length} trade(s))`
      : null
  };
}
```

### Fan Happiness

```javascript
// Trade impact on fan happiness
const TRADE_HAPPINESS_EFFECTS = {
  // Acquiring team
  ACQUIRE_STAR: {
    threshold: (war) => war >= 3.0,
    happiness: +8,
    message: "Fans excited about blockbuster acquisition!"
  },
  ACQUIRE_SOLID: {
    threshold: (war) => war >= 1.5,
    happiness: +3,
    message: "Fans approve of the trade"
  },

  // Losing team
  LOSE_FAN_FAVORITE: {
    threshold: (player) => player.seasonsWithTeam >= 3 && player.fame >= 2,
    happiness: -10,
    message: "Fans devastated to see {player} go"
  },
  LOSE_STAR: {
    threshold: (war) => war >= 3.0,
    happiness: -5,
    message: "Fans question trading away top talent"
  },

  // Neutral
  SALARY_DUMP: {
    threshold: (salaryDiff) => salaryDiff < -200000,
    happiness: -3,
    message: "Fans see this as a salary dump"
  }
};

function calculateTradeHappinessImpact(trade, team) {
  let impact = 0;

  // Players acquired
  for (const player of trade.playersAcquired) {
    if (player.war >= 3.0) impact += 8;
    else if (player.war >= 1.5) impact += 3;
  }

  // Players lost
  for (const player of trade.playersLost) {
    if (player.seasonsWithTeam >= 3 && player.fame >= 2) impact -= 10;
    else if (player.war >= 3.0) impact -= 5;
  }

  return impact;
}
```

---

## Trade-Related Storylines

### Revenge Game Tracking

```javascript
function activateRevengeGameStoryline(player, formerTeam) {
  player.revengeGames = player.revengeGames || [];

  player.revengeGames.push({
    formerTeam: formerTeam,
    tradedSeason: currentSeason,
    tradedDate: getCurrentGameDate(),
    firstMeetingPlayed: false,
    duration: 3  // Seasons
  });

  // Generate headline
  return {
    type: 'TRADE_REVENGE_SETUP',
    headline: `${player.name} will face former team ${formerTeam.name} soon`,
    subtext: "Circle that date on the calendar"
  };
}

// Track revenge game performance
function recordRevengeGamePerformance(player, stats, formerTeam) {
  const revengeGame = player.revengeGames.find(
    r => r.formerTeam.id === formerTeam.id
  );

  if (!revengeGame) return;

  revengeGame.performances = revengeGame.performances || [];
  revengeGame.performances.push({
    date: getCurrentGameDate(),
    stats: stats,
    headline: generateRevengeGameHeadline(player, stats, formerTeam)
  });

  // First meeting is special
  if (!revengeGame.firstMeetingPlayed) {
    revengeGame.firstMeetingPlayed = true;

    // Create memorable moment if performance was good
    if (stats.war >= 0.1 || stats.homeRuns >= 1 || stats.rbi >= 3) {
      recordMoment('REVENGE_GAME_SUCCESS', {
        player,
        team: player.currentTeam,
        opponent: formerTeam,
        stats
      });
    }
  }
}
```

### Trade Storyline Headlines

```javascript
const TRADE_HEADLINES = {
  // At trade time
  BLOCKBUSTER: "{team} lands {player} in blockbuster deal!",
  SALARY_DUMP: "{team} clears cap space, ships {player} to {newTeam}",
  PROSPECT_HAUL: "{team} trades {player}, receives promising package",

  // Revenge games
  REVENGE_FIRST: "{player} returns to face former team for first time",
  REVENGE_SUCCESS: "{player} haunts former team with {performance}!",
  REVENGE_FLOP: "{player} goes quiet in return to {formerTeam}",

  // Season narrative
  TRADE_TURNAROUND: "{player} thriving since trade to {team}",
  TRADE_REGRET: "{team} regretting trade as {player} excels elsewhere",
  DEADLINE_WINNER: "{team}'s deadline acquisitions paying dividends"
};
```

---

## Trade History & Museum

### Season Trade Log

```
+------------------------------------------------------------------+
|  📋 SEASON 4 TRADE LOG                                             |
+------------------------------------------------------------------+
|                                                                    |
|  JUNE 15 - Giants ↔ Dodgers                                        |
|  ├─ Giants receive: Willie Davis (OF), $50K                        |
|  ├─ Dodgers receive: Duke Snider (OF)                              |
|  └─ 📊 Result: Davis hitting .300 with Giants                      |
|                                                                    |
|  JULY 28 - Yankees ↔ Red Sox                                       |
|  ├─ Yankees receive: Ted Williams (OF)                             |
|  ├─ Red Sox receive: Mickey Mantle (OF), Joe Gordon (2B)           |
|  └─ 📊 Result: Blockbuster! Williams has 8 HR since trade          |
|                                                                    |
|  JULY 31 - Trade Deadline                                          |
|  └─ 🔒 Rosters locked for remainder of season                      |
|                                                                    |
+------------------------------------------------------------------+
```

### Career Trade History

```
+------------------------------------------------------------------+
|  DUKE SNIDER - TRADE HISTORY                                       |
+------------------------------------------------------------------+
|                                                                    |
|  Career Teams: Dodgers → Giants (S4)                               |
|                                                                    |
|  SEASON 4 TRADE                                                    |
|  📅 June 15 - Traded from Dodgers to Giants                        |
|  📦 Dodgers received: Willie Davis, $50K                           |
|  📊 Pre-trade: .267, 12 HR, 1.8 WAR (45 G)                         |
|  📊 Post-trade: .300, 10 HR, 1.6 WAR (50 G)                        |
|  📈 Full Season: .274, 22 HR, 3.4 WAR                              |
|                                                                    |
|  🔥 REVENGE GAMES vs Dodgers (S4):                                 |
|  ├─ Jun 22: 2-4, HR, 3 RBI - "Snider haunts former team!"          |
|  ├─ Jul 15: 1-3, 2B - Quiet night                                  |
|  └─ Aug 30: 3-5, 2 HR - "Snider destroys Dodgers again!"           |
|                                                                    |
+------------------------------------------------------------------+
```

---

# 26. Narrative Systems

## Overview

The narrative systems add storytelling depth to the franchise experience, tracking rivalries, generating storylines, celebrating legacies, and creating memorable moments that make each season feel unique.

---

## Fictional Calendar System

Games are assigned fictional dates to enhance immersion. The user inputs numbered games; the app maps them to a calendar.

### Season Calendar

```javascript
const SEASON_CALENDAR = {
  OPENING_DAY: { month: 3, day: 28 },  // March 28
  ALL_STAR_BREAK: { month: 7, day: 15 },  // Mid-July
  REGULAR_SEASON_END: { month: 9, day: 29 },  // Late September
  PLAYOFFS_START: { month: 10, day: 1 },  // October
  WORLD_SERIES_START: { month: 10, day: 21 }  // Late October
};

function getGameDate(gameNumber, totalGames, seasonYear = 1) {
  const openingDay = new Date(2024 + seasonYear, 2, 28);  // March 28
  const seasonEndDay = new Date(2024 + seasonYear, 8, 29);  // Sept 29

  const totalDays = Math.floor((seasonEndDay - openingDay) / (1000 * 60 * 60 * 24));
  const daysPerGame = totalDays / totalGames;

  const gameDate = new Date(openingDay);
  gameDate.setDate(gameDate.getDate() + Math.floor((gameNumber - 1) * daysPerGame));

  return gameDate;
}

function formatGameDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}
```

### Date Display Examples

```
+------------------------------------------------------------------+
|  GAME 24 of 48 - June 18th                                        |
|  Giants vs Dodgers @ Oracle Park                                  |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  🎉 OPENING DAY - March 28th                                      |
|  Giants vs Dodgers @ Oracle Park                                  |
|  "Play Ball! Season 4 begins!"                                    |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  GAME 48 of 48 - September 29th                                   |
|  REGULAR SEASON FINALE                                            |
|  Giants vs Padres @ Oracle Park                                   |
+------------------------------------------------------------------+
```

### Special Dates

| Event | Date | Notes |
|-------|------|-------|
| Opening Day | March 28 | Season opener celebration |
| All-Star Break | July 15-17 | Mid-season, All-Star game |
| Trade Deadline | July 31 | Last day for trades |
| September Call-ups | Sept 1 | Roster expansion |
| Regular Season End | Sept 29 | Final day |
| Playoffs Begin | Oct 1 | Postseason |
| World Series | Oct 21 | Championship |

---

## Rivalries System

Tracks heated relationships between players and teams, adding drama to matchups.

### Rivalry Types

**1. Player vs Former Team (1.0x impact)**
- Triggered when a player faces a team they previously played for
- Applies for 3 seasons after departure
- "Revenge game" narrative

**2. Official Rivals (1.5x impact)**
- Calculated at mid-season based on:
  - Head-to-head record
  - Division/geographic proximity
  - Playoff history
  - FA poaching history
- Updated as H2H records change throughout season

**3. Player vs Player Rivalries**
- Generated from specific incidents
- Tracked separately from team rivalries

### Rivalry Generation Triggers

```javascript
const RIVALRY_TRIGGERS = {
  // Team Rivalries
  PLAYOFF_ELIMINATION: {
    intensity: 3,
    duration: 5,  // seasons
    description: 'Eliminated {loser} in {round}'
  },
  DIVISION_DOMINANCE: {
    intensity: 2,
    duration: 3,
    description: 'Won division over {team} 3+ consecutive years'
  },
  FA_POACHING: {
    intensity: 2,
    duration: 3,
    description: 'Signed {player} away from {team}'
  },

  // Player vs Team
  PLAYER_DEPARTURE_BAD: {
    intensity: 2,
    duration: 3,
    description: '{player} left {team} in contentious FA'
  },
  PLAYER_TRADED_AWAY: {
    intensity: 1,
    duration: 2,
    description: '{player} was traded from {team}'
  },

  // Player vs Player
  HBP_INCIDENT: {
    intensity: 1,
    duration: 2,
    description: '{pitcher} hit {batter} in key situation'
  },
  WALK_OFF_VICTIM: {
    intensity: 1,
    duration: 1,
    description: '{batter} walked off against {pitcher}'
  },
  AWARD_SNUB: {
    intensity: 1,
    duration: 2,
    description: '{winner} beat {loser} for {award}'
  }
};
```

### Rivalry Effects

```javascript
function getRivalryMultiplier(player, opponent, situation) {
  let multiplier = 1.0;

  // Check if facing former team
  if (player.formerTeams.includes(opponent.teamId)) {
    const seasonsSinceDeparture = currentSeason - player.departureSeasons[opponent.teamId];
    if (seasonsSinceDeparture <= 3) {
      multiplier = 1.0;  // Base "revenge game" multiplier
    }
  }

  // Check if official rival (1.5x)
  if (isOfficialRival(player.currentTeam, opponent.teamId)) {
    multiplier = 1.5;
  }

  // Check player vs player rivalry
  const playerRivalry = getPlayerRivalry(player.id, opponent.batterId || opponent.pitcherId);
  if (playerRivalry) {
    multiplier = Math.max(multiplier, 1.0 + (playerRivalry.intensity * 0.25));
  }

  return multiplier;
}
```

### Rivalry Impact on Game Events

| Event | Base Effect | vs Former Team (1.0x) | vs Official Rival (1.5x) |
|-------|-------------|----------------------|--------------------------|
| Walk-off HR | +5 happiness | +5 happiness | +7.5 happiness |
| Blown Save | -4 happiness | -4 happiness | -6 happiness |
| Clutch hit | +2 Fame | +2 Fame | +3 Fame |
| Key strikeout | Normal | +1 Fame | +1.5 Fame |

### Official Rival Calculation

```javascript
function calculateOfficialRivals(teams, season) {
  const rivalries = [];

  for (const team of teams) {
    const candidates = teams.filter(t => t.id !== team.id);

    const rivalryScores = candidates.map(opponent => ({
      team: opponent,
      score: calculateRivalryScore(team, opponent, season)
    }));

    rivalryScores.sort((a, b) => b.score - a.score);

    // Top rival for each team
    rivalries.push({
      team: team.id,
      rival: rivalryScores[0].team.id,
      score: rivalryScores[0].score
    });
  }

  return rivalries;
}

function calculateRivalryScore(team1, team2, season) {
  let score = 0;

  // Division (+3)
  if (team1.division === team2.division) score += 3;

  // Geographic proximity (+2)
  if (areGeographicRivals(team1, team2)) score += 2;

  // Recent playoff matchup (+2 per series, +3 if elimination)
  score += getPlayoffHistoryScore(team1, team2);

  // H2H record this season (closer = more rivalry)
  const h2h = getHeadToHead(team1, team2, season);
  if (h2h.games >= 4 && Math.abs(h2h.team1Wins - h2h.team2Wins) <= 2) {
    score += 2;  // Competitive series
  }

  // FA poaching history
  score += getFAPoachingScore(team1, team2);

  return score;
}
```

### Rivalry UI Display

```
+------------------------------------------------------------------+
|  🔥 RIVALRY GAME 🔥                                               |
|  Giants vs Dodgers - Official Rivals                              |
|  Season Series: 4-3 (Giants lead)                                 |
+------------------------------------------------------------------+
|                                                                   |
|  RIVALRY HISTORY:                                                 |
|  • Dodgers eliminated Giants in Season 2 playoffs                 |
|  • Giants signed Willie Mays away from Dodgers (S3)               |
|  • Season 4 H2H: 4-3 Giants                                       |
|                                                                   |
|  REVENGE GAMES TODAY:                                             |
|  • Duke Snider (former Giant) - 2nd season back                   |
|  • Sandy Koufax vs Willie Mays (Award snub S3)                    |
|                                                                   |
+------------------------------------------------------------------+
```

---

## Storylines & Headlines Generator

Auto-generates narrative headlines based on game events, season context, and player situations.

### Headline Categories

```javascript
const HEADLINE_TEMPLATES = {
  // Pre-game storylines
  PREGAME: {
    REVENGE_GAME: "{player} faces former team for first time since departure",
    COMEBACK_WATCH: "Can {player} bounce back after last year's {adjustment} EOS adjustment?",
    ROOKIE_DEBUT: "Highly-touted rookie {player} makes MLB debut",
    MILESTONE_CHASE: "{player} sits {n} away from {milestone}",
    RIVALRY_SHOWDOWN: "Bitter rivals meet with playoff implications",
    ACE_DUEL: "{pitcher1} vs {pitcher2}: Battle of aces",
    SLUMP_BUSTER: "{player} looks to snap {n}-game hitless streak",
    HOT_STREAK: "{player} riding {n}-game hitting streak"
  },

  // Post-game headlines
  POSTGAME: {
    WALK_OFF: "{player} delivers walk-off {hit_type} to sink {opponent}!",
    NO_HITTER: "HISTORIC! {pitcher} throws no-hitter against {opponent}!",
    PERFECT_GAME: "PERFECTION! {pitcher} retires all 27 in perfect game!",
    COMEBACK_WIN: "{team} storms back from {deficit}-run deficit!",
    BLOWOUT: "{team} demolishes {opponent} in {score} rout",
    MILESTONE: "{player} joins elite company with {milestone}!",
    REVENGE_COMPLETE: "{player} haunts former team with {performance}!",
    ROOKIE_SPLASH: "{player} announces arrival with {performance}!",
    CLUTCH_MOMENT: "{player} comes through in the clutch!",
    COLLAPSE: "{team} blows {deficit}-run lead in devastating loss"
  },

  // Season storylines
  SEASON: {
    PLAYOFF_RACE: "{n} teams battle for final playoff spot",
    RUNAWAY: "{team} cruising to division title",
    CINDERELLA: "Nobody expected {team} to be here",
    DISAPPOINTMENT: "What went wrong for {team}?",
    MVP_RACE: "{player1} vs {player2}: MVP race heats up",
    TRADE_DEADLINE: "Will {team} be buyers or sellers?",
    SEPTEMBER_SURGE: "{team} makes late push for playoffs"
  }
};
```

### Headline Generation Logic

```javascript
function generatePregameHeadlines(game, season) {
  const headlines = [];

  // Check for revenge games
  for (const player of [...game.homeTeam.roster, ...game.awayTeam.roster]) {
    const formerTeam = game.homeTeam.id === player.formerTeams[0]
      ? game.homeTeam : game.awayTeam;
    if (formerTeam && isFirstMeetingSinceDeparture(player, formerTeam)) {
      headlines.push({
        priority: 1,
        template: 'REVENGE_GAME',
        params: { player: player.name }
      });
    }
  }

  // Check for comeback narratives
  for (const player of getAllPlayers(game)) {
    if (player.lastSeasonEOS < -5) {
      headlines.push({
        priority: 2,
        template: 'COMEBACK_WATCH',
        params: { player: player.name, adjustment: player.lastSeasonEOS }
      });
    }
  }

  // Check for milestone chases
  for (const player of getAllPlayers(game)) {
    const nearMilestones = checkNearMilestones(player);
    for (const milestone of nearMilestones) {
      headlines.push({
        priority: milestone.distance <= 1 ? 1 : 3,
        template: 'MILESTONE_CHASE',
        params: { player: player.name, n: milestone.distance, milestone: milestone.name }
      });
    }
  }

  // Sort by priority and return top 3
  return headlines.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

function generatePostgameHeadline(game, events) {
  // Priority order for headline selection
  if (events.perfectGame) return formatHeadline('PERFECT_GAME', events.perfectGame);
  if (events.noHitter) return formatHeadline('NO_HITTER', events.noHitter);
  if (events.walkOff) return formatHeadline('WALK_OFF', events.walkOff);
  if (events.milestone) return formatHeadline('MILESTONE', events.milestone);
  if (events.comeback && events.comeback.deficit >= 5) {
    return formatHeadline('COMEBACK_WIN', events.comeback);
  }
  if (events.revengeGame) return formatHeadline('REVENGE_COMPLETE', events.revengeGame);
  if (events.rookieDebut) return formatHeadline('ROOKIE_SPLASH', events.rookieDebut);

  // Default based on score differential
  const diff = Math.abs(game.homeScore - game.awayScore);
  if (diff >= 7) return formatHeadline('BLOWOUT', game);

  return formatHeadline('CLUTCH_MOMENT', game.starPlayer);
}
```

### Headlines Display

```
+------------------------------------------------------------------+
|  📰 TODAY'S STORYLINES                                            |
+------------------------------------------------------------------+
|                                                                   |
|  🔥 Duke Snider faces former team for first time since departure  |
|                                                                   |
|  📈 Willie Mays sits 2 HR away from 500 career milestone          |
|                                                                   |
|  🤔 Can Sandy Koufax bounce back after last year's -6 EOS?        |
|                                                                   |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  📰 FINAL: Giants 5, Dodgers 4                                    |
+------------------------------------------------------------------+
|                                                                   |
|  🎆 MAYS DOES IT AGAIN!                                           |
|  Willie Mays delivers walk-off HR to sink Dodgers!                |
|                                                                   |
|  "That's why he's the MVP favorite." - Auto-generated quote       |
|                                                                   |
+------------------------------------------------------------------+
```

---

## Nickname System

Players can earn nicknames based on performance, with user override option.

### Auto-Generated Nickname Triggers

```javascript
const NICKNAME_TRIGGERS = {
  // Clutch performance
  MR_OCTOBER: {
    condition: (p) => p.playoffClutchMoments >= 5,
    nickname: "Mr. October",
    description: "Clutch playoff performer"
  },
  MR_CLUTCH: {
    condition: (p) => p.walkOffHits >= 5,
    nickname: "Mr. Clutch",
    description: "Walk-off specialist"
  },

  // Dominance
  THE_ACE: {
    condition: (p) => p.cyYoungAwards >= 1 && p.seasonWins >= 20,
    nickname: "The Ace",
    description: "Dominant starting pitcher"
  },
  THE_MACHINE: {
    condition: (p) => p.consecutiveGamesWithHit >= 30,
    nickname: "The Machine",
    description: "Consistent hitting machine"
  },
  THE_NATURAL: {
    condition: (p) => p.isRookie && p.war >= 5.0,
    nickname: "The Natural",
    description: "Exceptional rookie season"
  },

  // Position-based
  THE_WIZARD: {
    condition: (p) => p.goldGloves >= 3 && ['SS', '2B'].includes(p.position),
    nickname: "The Wizard",
    description: "Defensive wizard at middle infield"
  },
  GOLDEN_ARM: {
    condition: (p) => p.position === 'RF' && p.assists >= 15,
    nickname: "Golden Arm",
    description: "Cannon arm in right field"
  },

  // Milestone-based
  MR_500: {
    condition: (p) => p.careerHR >= 500,
    nickname: "Mr. 500",
    description: "500 home run club member"
  },
  MR_3000: {
    condition: (p) => p.careerHits >= 3000,
    nickname: "Mr. 3000",
    description: "3000 hit club member"
  },

  // Style-based
  THE_KID: {
    condition: (p) => p.age <= 22 && p.allStarSelections >= 1,
    nickname: "The Kid",
    description: "Young All-Star"
  },
  THE_VETERAN: {
    condition: (p) => p.age >= 38 && p.war >= 2.0,
    nickname: "The Veteran",
    description: "Still productive veteran"
  },

  // Team-based
  CAPTAIN: {
    condition: (p) => p.seasonsWithTeam >= 8 && p.fame >= 3,
    nickname: "Captain",
    description: "Longtime franchise leader"
  },

  // Negative (dubious honors)
  THE_WHIFF_KING: {
    condition: (p) => p.seasonStrikeouts >= 200,
    nickname: "The Whiff King",
    description: "League leader in strikeouts (batting)"
  },
  MR_GLASS: {
    condition: (p) => p.injuredGames >= 50 && p.seasons >= 3,
    nickname: "Mr. Glass",
    description: "Frequently injured"
  }
};
```

### Nickname Management

```javascript
function checkForNickname(player) {
  // Skip if user has set a custom nickname
  if (player.customNickname) return player.customNickname;

  // Check triggers in priority order
  for (const [key, trigger] of Object.entries(NICKNAME_TRIGGERS)) {
    if (trigger.condition(player)) {
      return {
        nickname: trigger.nickname,
        source: 'auto',
        trigger: key,
        earnedSeason: currentSeason
      };
    }
  }

  return null;
}

// User can override
function setCustomNickname(playerId, nickname) {
  const player = getPlayer(playerId);
  player.customNickname = nickname;
  player.nicknameSource = 'user';
}

// User can clear nickname
function clearNickname(playerId) {
  const player = getPlayer(playerId);
  player.customNickname = null;
  player.nicknameSource = null;
}
```

### Nickname Display

```
+------------------------------------------------------------------+
|  WILLIE MAYS "The Say Hey Kid"                                    |
|  San Francisco Giants | CF | A+                                   |
|  📝 Nickname set by user                                          |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  SANDY KOUFAX "The Ace"                                           |
|  Los Angeles Dodgers | SP | A+                                    |
|  🤖 Earned: Cy Young winner with 20+ wins (Season 3)              |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  NICKNAME OPTIONS                          [Current: "The Ace"]   |
|                                                                   |
|  ○ Keep auto-generated: "The Ace"                                 |
|  ○ Enter custom nickname: [________________]                      |
|  ○ No nickname                                                    |
|                                                                   |
|  [SAVE]                                                           |
+------------------------------------------------------------------+
```

---

## Legacy Tracking

Tracks franchise-defining players and team dynasties.

### Franchise Cornerstone Status

```javascript
// Reduced thresholds for faster franchise progression
// Designed to have meaningful legacy tracking within 3 seasons
const LEGACY_THRESHOLDS = {
  FRANCHISE_CORNERSTONE: {
    minSeasons: 2,
    minWAR: 5.0,  // Career WAR with team (~2.5 WAR/season)
    description: "2+ seasons, 5+ WAR with team"
  },
  FRANCHISE_ICON: {
    minSeasons: 3,
    minWAR: 10.0,  // ~3.3 WAR/season
    minAwards: 1,  // MVP, Cy Young, or 2+ All-Stars
    description: "3+ seasons, 10+ WAR, at least 1 major award"
  },
  FRANCHISE_LEGEND: {
    minSeasons: 5,
    minWAR: 18.0,  // ~3.6 WAR/season
    minAwards: 2,
    hallOfFame: true,
    description: "5+ seasons, 18+ WAR, multiple awards, HOF-caliber"
  }
};

// Award counting for legacy status
function countMajorAwards(player) {
  let count = 0;

  // MVP and Cy Young count as 1 each
  count += player.mvpAwards || 0;
  count += player.cyYoungAwards || 0;

  // Every 2 All-Star selections counts as 1 major award
  const allStars = player.allStarSelections || 0;
  count += Math.floor(allStars / 2);

  // Championship MVP counts as 1
  count += player.championshipMVPs || 0;

  return count;
}

function calculateLegacyStatus(player, team) {
  const teamStats = player.teamHistory[team.id];
  if (!teamStats) return null;

  const majorAwards = countMajorAwards(player);

  // Check from highest tier down
  if (teamStats.seasons >= 5 &&
      teamStats.war >= 18 &&
      majorAwards >= 2) {
    return 'FRANCHISE_LEGEND';
  }

  if (teamStats.seasons >= 3 &&
      teamStats.war >= 10 &&
      majorAwards >= 1) {
    return 'FRANCHISE_ICON';
  }

  if (teamStats.seasons >= 2 && teamStats.war >= 5) {
    return 'FRANCHISE_CORNERSTONE';
  }

  return null;
}
```

### Player Origin Tracking

```javascript
const PLAYER_ORIGINS = {
  HOMEGROWN: "Drafted or signed as amateur by current team",
  TRADE_ACQUISITION: "Acquired via trade",
  FREE_AGENT_SIGNING: "Signed as free agent",
  EXPANSION_DRAFT: "Selected in expansion draft"
};

function getPlayerOrigin(player, team) {
  const history = player.teamHistory[team.id];
  return history ? history.acquisitionType : null;
}

// Track "Homegrown vs Mercenary" ratio for team
function getTeamHomegrownRatio(team) {
  const roster = team.activeRoster;
  const homegrown = roster.filter(p =>
    getPlayerOrigin(p, team) === 'HOMEGROWN'
  ).length;

  return {
    homegrown,
    acquired: roster.length - homegrown,
    ratio: homegrown / roster.length
  };
}
```

### Dynasty Tracking

```javascript
function checkForDynasty(team, seasons) {
  const recentSeasons = seasons.slice(-5);  // Last 5 seasons

  const championships = recentSeasons.filter(s =>
    s.champion === team.id
  ).length;

  const playoffAppearances = recentSeasons.filter(s =>
    s.playoffTeams.includes(team.id)
  ).length;

  if (championships >= 3) {
    return { type: 'DYNASTY', championships, description: '3+ titles in 5 years' };
  }

  if (championships >= 2 && playoffAppearances >= 4) {
    return { type: 'MINI_DYNASTY', championships, description: '2+ titles, consistent contender' };
  }

  if (playoffAppearances >= 5) {
    return { type: 'CONTENDER', playoffAppearances, description: '5 straight playoff appearances' };
  }

  return null;
}
```

### Legacy Display

```
+------------------------------------------------------------------+
|  GIANTS FRANCHISE LEGACY (Season 3)                               |
+------------------------------------------------------------------+
|                                                                   |
|  🏆 DYNASTY STATUS: Contender (3 straight playoff appearances)    |
|                                                                   |
|  👑 FRANCHISE LEGENDS: (5+ seasons, 18+ WAR, 2+ awards)           |
|  └─ None yet - check back in a few seasons!                       |
|                                                                   |
|  ⭐ FRANCHISE ICONS: (3+ seasons, 10+ WAR, 1+ award)              |
|  ├─ Willie Mays (3 seasons, 14.2 WAR, 1 MVP)                      |
|  └─ Juan Marichal (3 seasons, 11.8 WAR, 1 Cy Young)               |
|                                                                   |
|  🏠 FRANCHISE CORNERSTONES: (2+ seasons, 5+ WAR)                  |
|  ├─ Willie McCovey (3 seasons, 8.4 WAR)                           |
|  ├─ Orlando Cepeda (3 seasons, 7.1 WAR)                           |
|  └─ Gaylord Perry (2 seasons, 5.3 WAR)                            |
|                                                                   |
|  📊 ROSTER COMPOSITION:                                           |
|  ├─ Homegrown: 12 players (60%)                                   |
|  └─ Acquired: 8 players (40%)                                     |
|                                                                   |
+------------------------------------------------------------------+
```

### Legacy Progression Example

After just 3 seasons, a franchise can have meaningful legacy tracking:

| Season | Willie Mays Status | Requirement Met |
|--------|-------------------|-----------------|
| Season 1 | -- | 1 season, 4.8 WAR (needs 2 seasons) |
| Season 2 | 🏠 Cornerstone | 2 seasons, 9.5 WAR ✓ |
| Season 3 | ⭐ Icon | 3 seasons, 14.2 WAR, MVP ✓ |
| Season 5+ | 👑 Legend | 5 seasons, 18+ WAR, 2+ awards |

---

## Memorable Moments Log

Tracks and displays the most significant moments in franchise and league history.

### Moment Categories

```javascript
const MOMENT_TYPES = {
  // Individual achievements
  PERFECT_GAME: { tier: 'LEGENDARY', icon: '💎', retention: 'FOREVER' },
  NO_HITTER: { tier: 'EPIC', icon: '🔥', retention: 'FOREVER' },
  CYCLE: { tier: 'RARE', icon: '🔄', retention: 'FOREVER' },
  WALK_OFF_HR: { tier: 'MEMORABLE', icon: '💥', retention: '10_SEASONS' },
  WALK_OFF_GRAND_SLAM: { tier: 'EPIC', icon: '🎆', retention: 'FOREVER' },
  MILESTONE_HR: { tier: 'EPIC', icon: '🏆', retention: 'FOREVER' },
  MILESTONE_HIT: { tier: 'EPIC', icon: '🏆', retention: 'FOREVER' },
  IMMACULATE_INNING: { tier: 'RARE', icon: '⚡', retention: 'FOREVER' },

  // Team achievements
  CHAMPIONSHIP: { tier: 'LEGENDARY', icon: '🏆', retention: 'FOREVER' },
  PLAYOFF_COMEBACK: { tier: 'EPIC', icon: '🔥', retention: 'FOREVER' },
  LONGEST_WIN_STREAK: { tier: 'RARE', icon: '📈', retention: 'FOREVER' },

  // Rivalry moments
  RIVALRY_WALK_OFF: { tier: 'MEMORABLE', icon: '⚔️', retention: '10_SEASONS' },
  PLAYOFF_ELIMINATION: { tier: 'EPIC', icon: '💀', retention: 'FOREVER' },

  // Dubious moments
  WORST_LOSS: { tier: 'INFAMOUS', icon: '💩', retention: '10_SEASONS' },
  BLOWN_SAVE_COLLAPSE: { tier: 'INFAMOUS', icon: '😱', retention: '5_SEASONS' }
};
```

### Moment Recording

```javascript
function recordMoment(type, data) {
  const moment = {
    id: generateId(),
    type,
    tier: MOMENT_TYPES[type].tier,
    icon: MOMENT_TYPES[type].icon,
    date: getCurrentGameDate(),
    season: currentSeason,
    gameNumber: currentGameNumber,

    // Context
    player: data.player,
    team: data.team,
    opponent: data.opponent,

    // Details
    description: generateMomentDescription(type, data),
    stats: data.stats,

    // Narrative
    headline: generateHeadline(type, data),

    // Retention
    retention: MOMENT_TYPES[type].retention,
    expiresAfterSeason: calculateExpiration(type)
  };

  // Add to appropriate logs
  addToTeamMoments(moment.team, moment);
  addToLeagueMoments(moment);
  if (moment.player) {
    addToPlayerMoments(moment.player, moment);
  }

  return moment;
}
```

### "Remember When..." Feature

```javascript
function getRememberWhenMoments(team, count = 5) {
  const moments = team.memorableMoments
    .filter(m => !isExpired(m))
    .sort((a, b) => {
      // Sort by tier, then recency
      const tierOrder = ['LEGENDARY', 'EPIC', 'RARE', 'MEMORABLE', 'INFAMOUS'];
      const tierDiff = tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
      if (tierDiff !== 0) return tierDiff;
      return b.season - a.season;
    });

  return moments.slice(0, count);
}
```

### Moments Display

```
+------------------------------------------------------------------+
|  📜 GIANTS - REMEMBER WHEN...                                     |
+------------------------------------------------------------------+
|                                                                   |
|  💎 LEGENDARY                                                     |
|  └─ Juan Marichal's Perfect Game vs Dodgers (June 15, S3)         |
|     "Marichal retires all 27 in rivalry masterpiece"              |
|                                                                   |
|  🏆 EPIC                                                          |
|  ├─ Willie Mays' 500th HR (Sept 2, S4)                            |
|  │   "Mays joins elite 500 club with blast off Koufax"            |
|  └─ World Series Championship (Oct 28, S2)                        |
|     "Giants defeat Yankees in 7 games"                            |
|                                                                   |
|  💥 MEMORABLE                                                     |
|  ├─ Walk-off Grand Slam vs Dodgers (Aug 12, S4)                   |
|  │   "McCovey caps comeback with grand slam"                      |
|  └─ 12-game win streak (July 1-15, S3)                            |
|     "Giants' longest streak in franchise history"                 |
|                                                                   |
+------------------------------------------------------------------+
```

### Player Career Highlights

```
+------------------------------------------------------------------+
|  WILLIE MAYS - CAREER HIGHLIGHTS                                  |
+------------------------------------------------------------------+
|                                                                   |
|  🏆 500th Career HR (Sept 2, S4)                                  |
|     Off Sandy Koufax at Dodger Stadium                            |
|                                                                   |
|  💥 Walk-off HR in World Series Game 7 (Oct 28, S2)               |
|     Giants defeat Yankees, Mays named Series MVP                  |
|                                                                   |
|  🔥 3-HR Game vs Cubs (May 15, S3)                                |
|     5-for-5 with 7 RBI                                            |
|                                                                   |
|  ⭐ First All-Star Selection (July 15, S1)                        |
|     Went 2-for-3 with HR in ASG                                   |
|                                                                   |
+------------------------------------------------------------------+
```

---

## Team Chemistry System

Personality combinations create team dynamics that affect performance and happiness.

### Chemistry Calculations

```javascript
const CHEMISTRY_COMBOS = {
  // Positive synergies
  COMPETITIVE_COMPETITIVE: {
    effect: 'DRIVE',
    bonus: { clutchBonus: 0.05 },
    description: "Competitive players push each other"
  },
  JOLLY_JOLLY: {
    effect: 'CLUBHOUSE_HARMONY',
    bonus: { teamMorale: 2 },
    description: "Great clubhouse atmosphere"
  },
  TOUGH_COMPETITIVE: {
    effect: 'WARRIORS',
    bonus: { clutchBonus: 0.03, neverQuit: true },
    description: "Team never gives up"
  },

  // Negative friction
  EGOTISTICAL_EGOTISTICAL: {
    effect: 'FRICTION',
    penalty: { teamMorale: -3 },
    description: "Too many egos in the clubhouse"
  },
  EGOTISTICAL_TIMID: {
    effect: 'BULLYING',
    penalty: { timidPlayerMorale: -5 },
    description: "Ego dominates timid player"
  },
  COMPETITIVE_RELAXED: {
    effect: 'FRUSTRATION',
    penalty: { competitivePlayerMorale: -2 },
    description: "Competitive player frustrated by relaxed teammate"
  }
};

function calculateTeamChemistry(team) {
  const personalities = team.activeRoster.map(p => p.personality);
  const effects = [];

  // Check all pairings
  for (let i = 0; i < personalities.length; i++) {
    for (let j = i + 1; j < personalities.length; j++) {
      const combo = `${personalities[i]}_${personalities[j]}`;
      const reverseCombo = `${personalities[j]}_${personalities[i]}`;

      if (CHEMISTRY_COMBOS[combo]) {
        effects.push(CHEMISTRY_COMBOS[combo]);
      } else if (CHEMISTRY_COMBOS[reverseCombo]) {
        effects.push(CHEMISTRY_COMBOS[reverseCombo]);
      }
    }
  }

  return aggregateChemistryEffects(effects);
}
```

### Chemistry Impact

```javascript
const CHEMISTRY_EFFECTS = {
  // Team-wide effects
  TEAM_MORALE: {
    excellent: { threshold: 10, bonus: '+5% clutch performance' },
    good: { threshold: 5, bonus: '+2% clutch performance' },
    poor: { threshold: -5, penalty: '-2% clutch performance' },
    toxic: { threshold: -10, penalty: '-5% clutch, +10% FA departure' }
  }
};
```

### Chemistry Display

```
+------------------------------------------------------------------+
|  GIANTS TEAM CHEMISTRY                                            |
+------------------------------------------------------------------+
|                                                                   |
|  Overall: ⚗️ GOOD (+7)                                            |
|  Effect: +2% clutch performance                                   |
|                                                                   |
|  POSITIVE DYNAMICS:                                               |
|  ├─ Mays (Competitive) + McCovey (Competitive) = DRIVE            |
|  │   "These two push each other to greatness"                     |
|  ├─ Marichal (Jolly) + Cepeda (Jolly) = CLUBHOUSE HARMONY         |
|  │   "Great vibes in the clubhouse"                               |
|  └─ Perry (Tough) + Mays (Competitive) = WARRIORS                 |
|     "This team never quits"                                       |
|                                                                   |
|  FRICTION:                                                        |
|  └─ None currently                                                |
|                                                                   |
|  PERSONALITY BREAKDOWN:                                           |
|  Competitive: 4 | Jolly: 3 | Tough: 2 | Relaxed: 2 | Other: 4    |
|                                                                   |
+------------------------------------------------------------------+
```

---

# 27. Transaction Log & Audit Trail

## Overview

The Transaction Log provides a full audit trail of all actions in the app. This enables debugging, history review, and potential rollback functionality.

---

## Transaction Log Schema

```javascript
const TransactionLogEntry = {
  id: 'txn_123456',
  timestamp: '2024-06-15T14:30:00Z',
  season: 4,
  gameNumber: 45,                      // null if offseason
  phase: 'REGULAR_SEASON',

  // Transaction type
  type: 'TRADE_EXECUTED',              // See TRANSACTION_TYPES below

  // Actor (who initiated)
  actor: 'SYSTEM',                     // SYSTEM | USER

  // Transaction data (varies by type)
  data: {
    // Type-specific payload
  },

  // For rollback capability
  previousState: {
    // Snapshot of affected data before change
  },

  // Metadata
  undone: false,
  undoneAt: null,
  undoneBy: null
};
```

---

## Transaction Types

```javascript
const TRANSACTION_TYPES = {
  // ═══════════════════════════════════════════════════════════════
  // GAME FLOW
  // ═══════════════════════════════════════════════════════════════
  GAME_START: {
    description: 'Game started',
    data: ['gameNumber', 'homeTeam', 'awayTeam', 'gameDate']
  },
  GAME_COMPLETE: {
    description: 'Game completed',
    data: ['gameNumber', 'homeTeam', 'awayTeam', 'score', 'pog']
  },
  STAT_RECORDED: {
    description: 'Player stat recorded',
    data: ['playerId', 'statType', 'value', 'previousValue', 'newValue']
  },

  // ═══════════════════════════════════════════════════════════════
  // TRADES
  // ═══════════════════════════════════════════════════════════════
  TRADE_EXECUTED: {
    description: 'Trade completed',
    data: ['team1', 'team2', 'playersFromTeam1', 'playersFromTeam2', 'cash']
  },
  TRADE_WINDOW_CLOSED: {
    description: 'Trade deadline passed',
    data: ['gameNumber', 'date']
  },

  // ═══════════════════════════════════════════════════════════════
  // PLAYER UPDATES
  // ═══════════════════════════════════════════════════════════════
  NICKNAME_EARNED: {
    description: 'Player earned nickname',
    data: ['playerId', 'nickname', 'trigger']
  },
  NICKNAME_CHANGED: {
    description: 'Player nickname changed by user',
    data: ['playerId', 'oldNickname', 'newNickname']
  },
  LEGACY_STATUS_CHANGE: {
    description: 'Player legacy status updated',
    data: ['playerId', 'oldStatus', 'newStatus']
  },
  PERSONALITY_CHANGE: {
    description: 'Player personality changed',
    data: ['playerId', 'oldPersonality', 'newPersonality', 'reason']
  },
  TRAIT_ASSIGNED: {
    description: 'Trait assigned to player',
    data: ['playerId', 'trait', 'source', 'replacedTrait']
  },
  EOS_ADJUSTMENT: {
    description: 'End of season rating adjustment',
    data: ['playerId', 'category', 'adjustment', 'newRating']
  },

  // ═══════════════════════════════════════════════════════════════
  // AWARDS
  // ═══════════════════════════════════════════════════════════════
  AWARD_WON: {
    description: 'Player won award',
    data: ['playerId', 'awardType', 'votes']
  },
  ALL_STAR_SELECTED: {
    description: 'Player selected to All-Star team',
    data: ['playerId', 'votes', 'trait']
  },
  SALARY_BONUS_APPLIED: {
    description: 'Salary bonus applied from award',
    data: ['playerId', 'awardType', 'bonusAmount', 'newSalary']
  },
  TEAM_MVP: {
    description: 'Team MVP / Cornerstone designated',
    data: ['teamId', 'playerId']
  },

  // ═══════════════════════════════════════════════════════════════
  // TEAM UPDATES
  // ═══════════════════════════════════════════════════════════════
  RIVALRY_UPDATED: {
    description: 'Official rival changed',
    data: ['teamId', 'oldRival', 'newRival', 'score']
  },
  FAN_HAPPINESS_CHANGE: {
    description: 'Fan happiness updated',
    data: ['teamId', 'oldHappiness', 'newHappiness', 'event']
  },
  CONTRACTION_WARNING: {
    description: 'Contraction warning shown',
    data: ['teamId', 'happiness']
  },
  TEAM_CONTRACTED: {
    description: 'Team contracted',
    data: ['teamId', 'players']
  },

  // ═══════════════════════════════════════════════════════════════
  // OFFSEASON
  // ═══════════════════════════════════════════════════════════════
  RETIREMENT: {
    description: 'Player retired',
    data: ['playerId', 'careerStats']
  },
  HOF_INDUCTION: {
    description: 'Player inducted to Hall of Fame',
    data: ['playerId', 'votes']
  },
  FA_SIGNING: {
    description: 'Free agent signed',
    data: ['playerId', 'oldTeam', 'newTeam', 'salary']
  },
  DRAFT_PICK: {
    description: 'Player drafted',
    data: ['playerId', 'teamId', 'round', 'pick']
  },

  // ═══════════════════════════════════════════════════════════════
  // MEMORABLE MOMENTS
  // ═══════════════════════════════════════════════════════════════
  MOMENT_RECORDED: {
    description: 'Memorable moment recorded',
    data: ['type', 'tier', 'playerId', 'teamId', 'description']
  },

  // ═══════════════════════════════════════════════════════════════
  // SEASON MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  SEASON_START: {
    description: 'New season started',
    data: ['seasonNumber', 'config']
  },
  SEASON_ARCHIVED: {
    description: 'Season data archived',
    data: ['seasonNumber']
  },
  CHAMPIONSHIP: {
    description: 'Championship won',
    data: ['teamId', 'mvpId']
  },

  // ═══════════════════════════════════════════════════════════════
  // USER ACTIONS
  // ═══════════════════════════════════════════════════════════════
  UNDO_ACTION: {
    description: 'User undid an action',
    data: ['originalTransactionId', 'restoredState']
  },
  MANUAL_EDIT: {
    description: 'User manually edited data',
    data: ['entityType', 'entityId', 'field', 'oldValue', 'newValue']
  }
};
```

---

## Logging Function

```javascript
function logTransaction(type, data, previousState = null) {
  const entry = {
    id: generateTransactionId(),
    timestamp: new Date().toISOString(),
    season: currentSeason,
    gameNumber: season.currentGameNumber,
    phase: season.phase,
    type,
    actor: isUserAction() ? 'USER' : 'SYSTEM',
    data,
    previousState,
    undone: false
  };

  appDatabase.transactionLog.push(entry);

  // Keep log manageable - archive old entries
  if (appDatabase.transactionLog.length > 10000) {
    archiveOldTransactions();
  }

  return entry.id;
}

function generateTransactionId() {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

---

## Transaction Log Display

```
+------------------------------------------------------------------+
|  📋 TRANSACTION LOG - Season 4                                    |
+------------------------------------------------------------------+
|  Filter: [All Types ▼] [All Teams ▼] [Search...           ]      |
|                                                                   |
|  Jun 15, 2:30 PM - Game 45                                        |
|  ├─ TRADE_EXECUTED: Giants ↔ Dodgers                              |
|  │   Giants receive: Willie Davis                                 |
|  │   Dodgers receive: Duke Snider                                 |
|  │                                                                |
|  ├─ NICKNAME_EARNED: Duke Snider earned "The Duke"                |
|  │                                                                |
|  └─ FAN_HAPPINESS_CHANGE: Dodgers 72 → 65 (-7)                    |
|                                                                   |
|  Jun 14, 9:15 PM - Game 44                                        |
|  ├─ GAME_COMPLETE: Giants 5, Cubs 3                               |
|  │   POG: Willie Mays (3-4, 2 HR, 4 RBI)                          |
|  │                                                                |
|  ├─ MOMENT_RECORDED: Walk-off HR (MEMORABLE)                      |
|  │                                                                |
|  └─ LEGACY_STATUS_CHANGE: Mays → FRANCHISE_ICON                   |
|                                                                   |
+------------------------------------------------------------------+
```

---

# 28. Helper Functions Library

## Overview

This section provides implementations for all helper functions referenced throughout the spec.

---

## Core Data Access Functions

```javascript
// ═══════════════════════════════════════════════════════════════
// PLAYER ACCESS
// ═══════════════════════════════════════════════════════════════

function getPlayer(playerId) {
  return appDatabase.players.find(p => p.id === playerId);
}

function getAllPlayers() {
  return appDatabase.players;
}

function getAllActivePlayers() {
  return appDatabase.players.filter(p => p.isActive && !p.isRetired);
}

function getPlayersOnTeam(teamId) {
  const team = getTeam(teamId);
  return team.activeRoster.map(id => getPlayer(id));
}

function getPlayersAtPosition(position, allPlayers = null) {
  const players = allPlayers || getAllActivePlayers();
  return players.filter(p => p.position === position);
}

// ═══════════════════════════════════════════════════════════════
// TEAM ACCESS
// ═══════════════════════════════════════════════════════════════

function getTeam(teamId) {
  return appDatabase.teams.find(t => t.id === teamId);
}

function getAllTeams() {
  return appDatabase.teams.filter(t => t.isActive !== false);
}

function getTeamName(teamId) {
  const team = getTeam(teamId);
  return team ? team.name : 'Unknown Team';
}
```

---

## Calendar & Date Functions

```javascript
// ═══════════════════════════════════════════════════════════════
// FICTIONAL CALENDAR
// ═══════════════════════════════════════════════════════════════

function getGameDate(gameNumber, totalGames, seasonYear = 1) {
  const openingDay = new Date(2024 + seasonYear, 2, 28);  // March 28
  const seasonEndDay = new Date(2024 + seasonYear, 8, 29);  // Sept 29

  const totalDays = Math.floor((seasonEndDay - openingDay) / (1000 * 60 * 60 * 24));
  const daysPerGame = totalDays / totalGames;

  const gameDate = new Date(openingDay);
  gameDate.setDate(gameDate.getDate() + Math.floor((gameNumber - 1) * daysPerGame));

  return gameDate;
}

function formatGameDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function getCurrentGameDate() {
  return getGameDate(season.currentGameNumber, season.config.gamesPerTeam);
}

function checkSpecialDate(gameDate) {
  const month = gameDate.getMonth() + 1;  // 1-indexed
  const day = gameDate.getDate();

  if (month === 3 && day === 28) return 'OPENING_DAY';
  if (month === 7 && day >= 15 && day <= 17) return 'ALL_STAR_BREAK';
  if (month === 7 && day === 31) return 'TRADE_DEADLINE';
  if (month === 9 && day === 29) return 'SEASON_FINALE';

  return null;
}
```

---

## Statistical Functions

```javascript
// ═══════════════════════════════════════════════════════════════
// RATE STAT CALCULATIONS
// ═══════════════════════════════════════════════════════════════

function recalculateRateStats(player) {
  const stats = player.seasonStats.fullSeason;

  // Batting Average
  if (stats.atBats > 0) {
    stats.avg = parseFloat((stats.hits / stats.atBats).toFixed(3));
  }

  // On-Base Percentage
  const plateAppearances = stats.atBats + stats.walks + (stats.hitByPitch || 0) + (stats.sacFlies || 0);
  if (plateAppearances > 0) {
    stats.obp = parseFloat(((stats.hits + stats.walks + (stats.hitByPitch || 0)) / plateAppearances).toFixed(3));
  }

  // Slugging Percentage
  if (stats.atBats > 0) {
    const totalBases = stats.hits + stats.doubles + (stats.triples * 2) + (stats.homeRuns * 3);
    stats.slg = parseFloat((totalBases / stats.atBats).toFixed(3));
  }

  // OPS
  stats.ops = parseFloat((stats.obp + stats.slg).toFixed(3));

  // Pitcher stats
  if (stats.inningsPitched > 0) {
    stats.era = parseFloat(((stats.earnedRuns * 9) / stats.inningsPitched).toFixed(2));
    stats.whip = parseFloat(((stats.walks + stats.hitsAllowed) / stats.inningsPitched).toFixed(2));
  }

  // Also update current team split if applicable
  updateTeamSplitRateStats(player);
}

function updateTeamSplitRateStats(player) {
  const currentSplit = player.seasonStats.byTeam?.find(t => !t.dateRange.end);
  if (currentSplit) {
    const stats = currentSplit.stats;
    if (stats.atBats > 0) {
      stats.avg = parseFloat((stats.hits / stats.atBats).toFixed(3));
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// PERCENTILE CALCULATIONS
// ═══════════════════════════════════════════════════════════════

function getSalaryPercentileAtPosition(player, allPlayers = null) {
  const players = allPlayers || getAllActivePlayers();
  const positionPeers = players.filter(p => p.position === player.position);

  const salariesAtPosition = positionPeers.map(p => p.salary).sort((a, b) => a - b);
  const playerRank = salariesAtPosition.filter(s => s < player.salary).length;

  return playerRank / salariesAtPosition.length;
}

function getWARPercentileAtPosition(player, war = null, allPlayers = null) {
  const playerWAR = war ?? player.seasonStats.fullSeason.war;
  const players = allPlayers || getAllActivePlayers();
  const positionPeers = players.filter(p => p.position === player.position);

  const warsAtPosition = positionPeers.map(p => p.seasonStats.fullSeason.war).sort((a, b) => a - b);
  const playerRank = warsAtPosition.filter(w => w < playerWAR).length;

  return playerRank / warsAtPosition.length;
}

function normalizeToRange(value, allValues, min = 0, max = 100) {
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);

  if (maxVal === minVal) return min;
  return ((value - minVal) / (maxVal - minVal)) * (max - min) + min;
}
```

---

## EOS Adjustment Functions

```javascript
// ═══════════════════════════════════════════════════════════════
// END-OF-SEASON ADJUSTMENTS
// ═══════════════════════════════════════════════════════════════

function calculateAdjustmentPoints(performanceDelta, salaryPercentile) {
  // Determine adjustment factor based on salary tier
  let upsideFactor, downsideFactor;

  if (salaryPercentile >= 0.80) {
    // High-paid: small upside, large downside
    upsideFactor = 1.0;
    downsideFactor = 10.0;
  } else if (salaryPercentile >= 0.50) {
    // Mid-high: moderate both ways
    upsideFactor = 3.0;
    downsideFactor = 6.0;
  } else if (salaryPercentile >= 0.20) {
    // Mid-low: larger upside, smaller downside
    upsideFactor = 6.0;
    downsideFactor = 3.0;
  } else {
    // Low-paid: maximum upside, minimum downside
    upsideFactor = 10.0;
    downsideFactor = 1.0;
  }

  // Calculate raw adjustment
  let rawAdjustment;
  if (performanceDelta >= 0) {
    rawAdjustment = performanceDelta * upsideFactor;
  } else {
    rawAdjustment = performanceDelta * downsideFactor;
  }

  // Cap adjustments
  return Math.max(-10, Math.min(10, Math.round(rawAdjustment)));
}
```

---

## Rivalry Functions

```javascript
// ═══════════════════════════════════════════════════════════════
// RIVALRY CALCULATIONS
// ═══════════════════════════════════════════════════════════════

function isOfficialRival(team1Id, team2Id) {
  const team1 = getTeam(team1Id);
  return team1.officialRival === team2Id;
}

function getPlayerRivalry(player1Id, player2Id) {
  const player = getPlayer(player1Id);
  return player.rivalries?.find(r =>
    r.type === 'PLAYER_VS_PLAYER' && r.opponentId === player2Id
  );
}

function getHeadToHead(team1, team2, season) {
  const team1Record = team1.headToHead?.[team2.id] || { wins: 0, losses: 0 };
  return {
    games: team1Record.wins + team1Record.losses,
    team1Wins: team1Record.wins,
    team2Wins: team1Record.losses
  };
}

function getPlayoffHistoryScore(team1, team2) {
  let score = 0;

  // Check for playoff matchups in last 5 seasons
  const recentSeasons = appDatabase.seasons.slice(-5);
  for (const s of recentSeasons) {
    if (s.playoffMatchups?.some(m =>
      (m.team1 === team1.id && m.team2 === team2.id) ||
      (m.team1 === team2.id && m.team2 === team1.id)
    )) {
      score += 2;  // Base playoff matchup
      if (s.playoffEliminations?.some(e =>
        (e.winner === team1.id && e.loser === team2.id) ||
        (e.winner === team2.id && e.loser === team1.id)
      )) {
        score += 1;  // Elimination series
      }
    }
  }

  return score;
}

function getFAPoachingScore(team1, team2) {
  let score = 0;

  // Check last 3 seasons for FA signings
  const recentSeasons = appDatabase.seasons.slice(-3);
  for (const s of recentSeasons) {
    const signings = s.faSignings || [];
    for (const signing of signings) {
      if (signing.newTeam === team1.id && signing.oldTeam === team2.id) score += 1;
      if (signing.newTeam === team2.id && signing.oldTeam === team1.id) score += 1;
    }
  }

  return score;
}

function recalculateOfficialRivals() {
  for (const team of getAllTeams()) {
    const otherTeams = getAllTeams().filter(t => t.id !== team.id);

    let topRival = null;
    let topScore = 0;

    for (const opponent of otherTeams) {
      const score = calculateRivalryScore(team, opponent);
      if (score > topScore) {
        topScore = score;
        topRival = opponent;
      }
    }

    if (topRival && team.officialRival !== topRival.id) {
      const oldRival = team.officialRival;
      team.officialRival = topRival.id;
      team.rivalryScore = topScore;

      logTransaction('RIVALRY_UPDATED', {
        teamId: team.id,
        oldRival,
        newRival: topRival.id,
        score: topScore
      });
    }
  }
}

function calculateRivalryScore(team1, team2) {
  let score = 0;

  // Division (+3)
  if (team1.division === team2.division) score += 3;

  // Geographic proximity (+2)
  if (areGeographicRivals(team1.id, team2.id)) score += 2;

  // Recent playoff matchup
  score += getPlayoffHistoryScore(team1, team2);

  // H2H record this season (closer = more rivalry)
  const h2h = getHeadToHead(team1, team2);
  if (h2h.games >= 4 && Math.abs(h2h.team1Wins - h2h.team2Wins) <= 2) {
    score += 2;  // Competitive series
  }

  // FA poaching history
  score += getFAPoachingScore(team1, team2);

  return score;
}
```

---

## Moment & Milestone Functions

```javascript
// ═══════════════════════════════════════════════════════════════
// MILESTONES
// ═══════════════════════════════════════════════════════════════

function checkMilestone(player, statType) {
  const MILESTONES = {
    homeRuns: [100, 200, 300, 400, 500, 600, 700],
    hits: [500, 1000, 1500, 2000, 2500, 3000],
    rbi: [500, 1000, 1500, 2000],
    wins: [50, 100, 150, 200, 250, 300],
    strikeoutsPitching: [500, 1000, 1500, 2000, 2500, 3000],
    saves: [100, 200, 300, 400, 500]
  };

  const milestones = MILESTONES[statType];
  if (!milestones) return null;

  const careerValue = player.careerStats[statType] || 0;
  const currentValue = player.seasonStats.fullSeason[statType] || 0;
  const totalValue = careerValue + currentValue;

  // Check if we just crossed a milestone
  for (const milestone of milestones) {
    if (totalValue >= milestone && (totalValue - currentValue) < milestone) {
      return { type: statType, value: milestone };
    }
  }

  return null;
}

function getMilestoneText(milestone) {
  const texts = {
    homeRuns: `${milestone.value} Career Home Runs`,
    hits: `${milestone.value} Career Hits`,
    rbi: `${milestone.value} Career RBI`,
    wins: `${milestone.value} Career Wins`,
    strikeoutsPitching: `${milestone.value} Career Strikeouts`,
    saves: `${milestone.value} Career Saves`
  };

  return texts[milestone.type] || `${milestone.value} ${milestone.type}`;
}

// ═══════════════════════════════════════════════════════════════
// MEMORABLE MOMENTS
// ═══════════════════════════════════════════════════════════════

function isExpired(moment) {
  const RETENTION = {
    'FOREVER': Infinity,
    '10_SEASONS': 10,
    '5_SEASONS': 5
  };

  const retention = RETENTION[moment.retention] || 5;
  if (retention === Infinity) return false;

  return (currentSeason - moment.season) > retention;
}

function identifyMemorableMoments(gameResult) {
  const moments = [];

  // Check for no-hitter / perfect game
  for (const pitcher of gameResult.pitchers) {
    if (pitcher.hitsAllowed === 0 && pitcher.inningsPitched >= 9) {
      if (pitcher.walksAllowed === 0 && pitcher.errorsCommitted === 0) {
        moments.push({ type: 'PERFECT_GAME', data: { player: pitcher } });
      } else {
        moments.push({ type: 'NO_HITTER', data: { player: pitcher } });
      }
    }
  }

  // Check for walk-off
  if (gameResult.walkOff) {
    moments.push({
      type: gameResult.walkOff.type === 'HR' ? 'WALK_OFF_HR' : 'WALK_OFF',
      data: gameResult.walkOff
    });
  }

  // Check for cycle
  for (const batter of gameResult.batters) {
    if (batter.singles >= 1 && batter.doubles >= 1 &&
        batter.triples >= 1 && batter.homeRuns >= 1) {
      moments.push({ type: 'CYCLE', data: { player: batter } });
    }
  }

  return moments;
}
```

---

## Stat Initialization Functions

```javascript
// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

function initializeEmptyStats() {
  return {
    games: 0,
    atBats: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 0,
    walks: 0,
    strikeouts: 0,
    stolenBases: 0,
    caughtStealing: 0,
    avg: .000,
    obp: .000,
    slg: .000,
    ops: .000,
    war: 0.0,
    bWAR: 0.0,
    fWAR: 0.0,

    // Pitcher stats
    wins: 0,
    losses: 0,
    saves: 0,
    inningsPitched: 0,
    earnedRuns: 0,
    hitsAllowed: 0,
    walksAllowed: 0,
    strikeoutsPitching: 0,
    era: 0.00,
    whip: 0.00,
    pWAR: 0.0,

    // Clutch
    clutchMoments: 0,
    chokeMoments: 0,
    netClutch: 0
  };
}

function initializePlayerForNewSeason(player) {
  player.seasonStats = {
    season: currentSeason,
    fullSeason: initializeEmptyStats(),
    byTeam: [{
      teamId: player.currentTeam,
      teamName: getTeamName(player.currentTeam),
      dateRange: { start: 'Mar 28', end: null },
      gameRange: { start: 1, end: null },
      stats: initializeEmptyStats()
    }],
    trades: []
  };

  // Reset streaks
  player.streaks = {
    consecutiveGamesWithHit: 0,
    consecutiveGamesPlayed: 0,
    consecutiveQualityStarts: 0
  };

  // Increment seasons with team
  player.seasonsWithTeam++;
}
```

---

## Utility Functions

```javascript
// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function weightedRandom(options) {
  // options: [{ value: 'A', weight: 0.7 }, { value: 'B', weight: 0.3 }]
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  let random = Math.random() * totalWeight;

  for (const option of options) {
    random -= option.weight;
    if (random <= 0) {
      return option.value;
    }
  }

  return options[options.length - 1].value;
}

function getSeasonEvents(player) {
  return {
    playerId: player.id,
    season: currentSeason,
    wonChampionship: didPlayerWinChampionship(player),
    hadBadSeason: player.seasonStats.fullSeason.war < 0 || getLastEOSAdjustment(player) < -5,
    wasBenched: player.seasonStats.fullSeason.games < (season.config.gamesPerTeam * 0.5),
    wonMVP: player.awards.some(a => a.type === 'MVP' && a.season === currentSeason),
    wasTraded: player.seasonStats.trades?.length > 0,
    wasAllStar: player.awards.some(a => a.type === 'ALL_STAR' && a.season === currentSeason),
    hadBreakoutSeason: getLastEOSAdjustment(player) > 5,
    teamFinishedLast: didTeamFinishLast(player.currentTeam),
    wasInjured: player.injuries.gamesInjuredThisSeason >= 10,
    hadClutchMoments: player.seasonStats.fullSeason.clutchMoments,
    hadChokeMoments: player.seasonStats.fullSeason.chokeMoments
  };
}

function isTradeWindowOpen() {
  if (season.phase !== 'REGULAR_SEASON') return false;
  const deadlineGame = Math.floor(season.config.gamesPerTeam * 0.65);
  return season.currentGameNumber <= deadlineGame;
}
```

---

# 29. Appendices

## Appendix A: Pitcher vs Position Player Traits

### Pitcher-Only Traits

K Collector, K Neglecter, Gets Ahead, Falls Behind, Elite 4F, Elite 2F, Elite CF, Elite FK, Elite SL, Elite CB, Elite CH, Elite SB, BB Prone, Wild Thing, Rally Stopper, Meltdown

### Position Player-Only Traits

Stealer, Easy Target, Base Rounder, Base Jogger, Pinch Perfect, Fastball Hitter, Off-Speed Hitter, Low Pitch, High Pitch, Inside Pitch, Outside Pitch, Metal Head, Rally Starter, RBI Hero, RBI Zero, CON vs LHP, CON vs RHP, POW vs LHP, POW vs RHP, Ace Exterminator, Bunter, Big Hack, Little Hack

### Universal Traits

All other traits can apply to both pitchers and position players.

---

## Appendix B: Seven Personalities

| Personality | Free Agency Behavior |
|-------------|---------------------|
| Competitive | Goes to rival team |
| Relaxed | Random destination |
| Droopy | Retires |
| Jolly | Stays with team |
| Tough | Goes to best OPS team |
| Timid | Goes to champion |
| Egotistical | Goes to worst team (wants to be star) |

---

## Appendix C: Document History

| Version | Changes |
|---------|---------|
| 1.0 | Initial master spec |
| 2.0 | Expanded clutch triggers, fitness categories, POG, traits, All-Star voting, grade factors |
| 3.0 | Integrated all v2 corrections + Salary System + Complete Offseason System (Retirements, Free Agency, Draft) + Hall of Fame + Retired Numbers + Real-time Expectations Tracker + Voting Normalization + Bust/Comeback Awards + Two-Way Fame Safeguard + High-Payroll Amplifier |
| **3.1** | **Added: Grade Derivation Formula (Section 21) + Complete Fan Happiness System with milestone/award effects and season-length scaling (Section 22) + Hidden Personality System with year-over-year changes (Section 23) + Museum & Historical Data structure (Section 24) + Cy Young Runner-Up award + Negative career/season milestones + Salary-based FA swaps (+/-5%) + Pitcher hitting bonus + Revised trait tiers per Billy Yank guide + Contracted team → expansion draft flow + Paper bag indicator for furious fans** |
| **3.2** | **MAJOR: Replaced Grade Factor with Position-Based Salary Percentile system for EOS adjustments** - Players are now compared to positional salary peers, and WAR is compared to positional WAR peers. High-paid players at their position have small upside/large downside; low-paid have large upside/small downside. **Also added:** Complete award rewards with happiness values + salary bonuses for all awards. MVP/Cy Young winners now get +15% salary bonus, +1 Fame. ROTY has runner-up (+2 happiness). ROY has NO runner-up. Kara Kawaguchi Award updated to salary-based eligibility (bottom 25% at position). Bust of the Year updated to salary-based (top 50% at position who underperforms). Manager of Year expectation changed from grade-based to salary-based. Auto-distribute EOS points within rating categories. |
| **3.3** | **Team Salary Expectation System:** Added comprehensive team expectations based on average position-based salary percentile. Teams with higher-paid players at each position are expected to win more. This system now drives: (1) Fan Happiness calculations, (2) Manager of the Year criteria, (3) Contraction risk assessment. **Also:** Silver Slugger changed to +3 Power/+3 Contact with NO trait (prevents league inflation). Comeback Player now requires negative EOS last season + positive EOS this season (true comeback story). Added position weights for optional enhanced team expectations (CF now 1.15, higher than corner OF). |
| **3.4** | **Award Emblems System:** Added comprehensive emblem system to display player awards throughout the app. Emblems (🏆MVP, 🧤GG, ⭐AS, etc.) appear on in-game tracking screens, team rosters, player cards, and museum. Shows career awards with counts for multi-year winners. Added emblem priority order for space-limited displays. Added Award History tab to Museum for season-by-season award lookup. |
| **3.5** | **MAJOR: Complete Narrative Systems (Section 26):** Added **Fictional Calendar System** - Opening Day March 28, games mapped to fictional dates through Sept 29, special dates for All-Star Break/Trade Deadline/Playoffs. Added **Rivalries System** - Player vs Former Team (1.0x impact, 3-season duration), Official Rivals (1.5x impact, calculated mid-season from H2H, playoff history, FA poaching), Player vs Player rivalries from incidents (HBP, walk-offs, award snubs). Added **Storylines & Headlines Generator** - Auto-generated pregame storylines (revenge games, milestone chases, comeback watch) and postgame headlines (walk-offs, no-hitters, milestones, collapses). Added **Nickname System** - Auto-generated nicknames from triggers (Mr. October, The Ace, The Wizard, Captain, etc.) with user override option. Added **Legacy Tracking** - Franchise Cornerstone, Icon, Legend; Dynasty tracking; Homegrown vs Acquired roster composition. Added **Memorable Moments Log** - Tiered moments (Legendary/Epic/Rare/Memorable/Infamous) with retention periods, "Remember When..." feature, player career highlights. Added **Team Chemistry System** - Personality-based synergies and friction affecting clutch performance and FA departure risk. |
| **3.6** | **MAJOR: In-Season Trade System (Section 25):** Complete trade execution system with anytime trades + Trade Deadline prompt at July 31 (65% through season). **Split Stats Tracking** - Player stats tracked before/after trade with full season accumulation; displays show stats by team with date ranges. **Trade Impact Integration** - WAR attributed to team where earned; awards use full season stats; EOS adjustments apply to current team; fan happiness affected by acquiring/losing players (+8 for star acquisition, -10 for losing fan favorite). **Trade Storylines** - Revenge game tracking for traded players (3 seasons), auto-generated headlines for trades and revenge games. **Trade History** - Season trade log and player career trade history in Museum. **ALSO: Reduced Legacy Thresholds** for faster franchise progression - Cornerstone now 2 seasons/5 WAR, Icon now 3 seasons/10 WAR/1 award, Legend now 5 seasons/18 WAR/2 awards. Added award counting logic (MVP/CY=1, every 2 All-Stars=1, Championship MVP=1). |
| **3.7** | **MAJOR: Comprehensive Audit & Remediation** - Addressed 68 issues across the spec. **NEW Section 0: App Flow & Main Game Loop** - Complete execution flow showing WHEN every system runs. Season state machine (Setup → Pre-Season → Regular Season → All-Star Break → Post-Deadline → Playoffs → Offseason). Pre-game, during-game, and post-game flows. All narrative checks (nicknames, legacy, chemistry, rivalries) now run after EVERY game. Trade deadline triggers at 65% of games. Contraction warning system with real-time alerts when happiness < 30. **NEW Section 19: Core Data Models** - Complete Player, Team, and Season object schemas with all fields documented. Geographic rivalry mapping. SeasonEvents schema for personality changes. **NEW Section 27: Transaction Log & Audit Trail** - Full audit system with 25+ transaction types, logging function, and display UI. **NEW Section 28: Helper Functions Library** - Implementations for all 18+ previously undefined functions including: getPlayer(), getAllPlayers(), getTeamName(), getCurrentGameDate(), recalculateRateStats(), getSalaryPercentileAtPosition(), getWARPercentileAtPosition(), calculateAdjustmentPoints(), isOfficialRival(), getPlayerRivalry(), getHeadToHead(), getPlayoffHistoryScore(), getFAPoachingScore(), checkMilestone(), getMilestoneText(), isExpired(), identifyMemorableMoments(), initializeEmptyStats(), weightedRandom(), getSeasonEvents(), isTradeWindowOpen(). **User Decisions Incorporated:** Trade deadline uses 65% game count trigger. All checks run after every game. Chemistry is narrative-only (no stat impact). Team MVP grants Cornerstone designation. All-Star voting uses existing algorithm. Playoff format is user-configurable. Droopy = 90% retirement probability (not guaranteed). Salary bonuses apply immediately when award is won. Contraction shows real-time warning but only executes at end of season. formerTeams updates on ANY team change. |

---

*End of Master Specification Document v3.7*
