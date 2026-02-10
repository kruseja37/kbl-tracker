/**
 * Synthetic Game Data Factory
 *
 * Generates realistic PersistedGameState objects for season simulation.
 * All data is random but statistically plausible for SMB4.
 *
 * Each team has 9 batters + 1 starter + 0-2 relievers.
 * Stats are sampled from realistic ranges.
 */

import type { PersistedGameState } from '../src/utils/gameStorage';

// ============================================
// ROSTER TEMPLATES
// ============================================

interface RosterPlayer {
  playerId: string;
  playerName: string;
}

interface TeamRoster {
  teamId: string;
  teamName: string;
  batters: RosterPlayer[];
  starter: RosterPlayer;
  relievers: RosterPlayer[];
}

/**
 * Generate a deterministic roster for a team.
 * Uses a seed-based approach for reproducibility.
 */
function generateRoster(teamId: string, teamName: string): TeamRoster {
  const batters: RosterPlayer[] = [];
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
  for (let i = 0; i < 9; i++) {
    batters.push({
      playerId: `${teamId}-bat-${i}`,
      playerName: `${teamName} ${positions[i]}`,
    });
  }

  const starter: RosterPlayer = {
    playerId: `${teamId}-sp-0`,
    playerName: `${teamName} SP`,
  };

  const relievers: RosterPlayer[] = [
    { playerId: `${teamId}-rp-0`, playerName: `${teamName} RP1` },
    { playerId: `${teamId}-rp-1`, playerName: `${teamName} RP2` },
  ];

  return { teamId, teamName, batters, starter, relievers };
}

// ============================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================

/**
 * Simple seeded PRNG (mulberry32).
 * Produces deterministic results for reproducible tests.
 */
function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================
// GAME GENERATION
// ============================================

export interface GameFactoryOptions {
  /** Random seed for reproducibility */
  seed?: number;
  /** Season ID for aggregation */
  seasonId?: string;
  /** Game number in season (for unique IDs) */
  gameNumber?: number;
  /** Override innings count (default: 9) */
  innings?: number;
}

/**
 * Generate a single synthetic completed game.
 *
 * Produces realistic baseball stat lines:
 * - Each batter gets 3-5 PA
 * - Hit rates ~.250, walk rate ~.08, K rate ~.22
 * - Pitcher stats derived from batters faced
 * - One team wins (no ties)
 * - Pitcher decisions assigned (W/L)
 */
export function generateSyntheticGame(
  awayRoster: TeamRoster,
  homeRoster: TeamRoster,
  options: GameFactoryOptions = {}
): PersistedGameState {
  const {
    seed = Date.now(),
    gameNumber = 1,
    innings = 9,
  } = options;

  const rng = createRng(seed + gameNumber);

  const gameId = `sim-game-${gameNumber}-${seed}`;

  // Generate batter stats for both teams
  const playerStats: PersistedGameState['playerStats'] = {};
  const playerInfo: Record<string, { playerName: string; teamId: string }> = {};

  let awayRuns = 0;
  let homeRuns = 0;

  // Helper: generate one batter's game
  function generateBatterGame(player: RosterPlayer, teamId: string): {
    pa: number; ab: number; h: number; singles: number; doubles: number;
    triples: number; hr: number; rbi: number; r: number; bb: number;
    hbp: number; k: number; sb: number; cs: number; putouts: number;
    assists: number; fieldingErrors: number;
  } {
    const pa = 3 + Math.floor(rng() * 3); // 3-5 PA
    let bb = 0, hbp = 0, k = 0, h = 0, singles = 0, doubles = 0, triples = 0, hr = 0;

    let remaining = pa;

    // Walks (~8%)
    for (let i = 0; i < remaining && bb < 2; i++) {
      if (rng() < 0.08) { bb++; remaining--; }
    }

    // HBP (~1%)
    if (rng() < 0.03 && remaining > 0) { hbp = 1; remaining--; }

    const ab = remaining;

    // Strikeouts (~22% of AB)
    for (let i = 0; i < ab; i++) {
      if (rng() < 0.22) k++;
    }

    // Hits (~25% of AB)
    const hitCount = Math.min(ab - k, Math.round(ab * (0.15 + rng() * 0.20)));
    h = hitCount;

    // Distribute hit types
    for (let i = 0; i < h; i++) {
      const roll = rng();
      if (roll < 0.05) { hr++; }
      else if (roll < 0.08) { triples++; }
      else if (roll < 0.25) { doubles++; }
      else { singles++; }
    }

    // RBI: HR always score 1+, other hits sometimes
    const rbi = hr + Math.floor((singles + doubles + triples) * rng() * 0.4);
    const r = (rng() < 0.3 ? 1 : 0) + (hr > 0 ? 1 : 0);

    // SB/CS
    const sb = rng() < 0.15 ? 1 : 0;
    const cs = sb > 0 && rng() < 0.25 ? 1 : 0;

    return {
      pa, ab, h, singles, doubles, triples, hr, rbi, r,
      bb, hbp, k, sb, cs,
      putouts: Math.floor(rng() * 4),
      assists: Math.floor(rng() * 2),
      fieldingErrors: rng() < 0.05 ? 1 : 0,
    };
  }

  // Generate away team batters
  for (const batter of awayRoster.batters) {
    const stats = generateBatterGame(batter, awayRoster.teamId);
    playerStats[batter.playerId] = stats;
    playerInfo[batter.playerId] = { playerName: batter.playerName, teamId: awayRoster.teamId };
    awayRuns += stats.r;
  }

  // Generate home team batters
  for (const batter of homeRoster.batters) {
    const stats = generateBatterGame(batter, homeRoster.teamId);
    playerStats[batter.playerId] = stats;
    playerInfo[batter.playerId] = { playerName: batter.playerName, teamId: homeRoster.teamId };
    homeRuns += stats.r;
  }

  // Ensure no tie — bump winner by 1 if equal
  if (awayRuns === homeRuns) {
    if (rng() < 0.5) {
      awayRuns += 1;
      // Give a run to a random away batter
      const idx = Math.floor(rng() * awayRoster.batters.length);
      playerStats[awayRoster.batters[idx].playerId].r += 1;
    } else {
      homeRuns += 1;
      const idx = Math.floor(rng() * homeRoster.batters.length);
      playerStats[homeRoster.batters[idx].playerId].r += 1;
    }
  }

  // Generate pitcher stats
  const pitcherGameStats: PersistedGameState['pitcherGameStats'] = [];

  function generatePitcherStats(
    pitcher: RosterPlayer,
    teamId: string,
    isStarter: boolean,
    outsRecorded: number,
    runsAllowed: number,
    entryInning: number
  ) {
    const ip = outsRecorded / 3;
    const battersFaced = Math.max(outsRecorded, Math.round(ip * 4.2 + rng() * 2));
    const hitsAllowed = Math.round(ip * (0.8 + rng() * 0.5));
    const walksAllowed = Math.round(ip * (0.2 + rng() * 0.2));
    const strikeoutsThrown = Math.round(ip * (0.7 + rng() * 0.6));
    const earnedRuns = Math.min(runsAllowed, Math.round(runsAllowed * (0.7 + rng() * 0.3)));
    const homeRunsAllowed = Math.floor(rng() * Math.max(1, runsAllowed));

    return {
      pitcherId: pitcher.playerId,
      pitcherName: pitcher.playerName,
      teamId,
      isStarter,
      entryInning,
      outsRecorded,
      hitsAllowed,
      runsAllowed,
      earnedRuns,
      walksAllowed,
      strikeoutsThrown,
      homeRunsAllowed,
      hitBatters: rng() < 0.15 ? 1 : 0,
      basesReachedViaError: 0,
      wildPitches: rng() < 0.10 ? 1 : 0,
      pitchCount: Math.round(ip * (14 + rng() * 4)),
      battersFaced,
      consecutiveHRsAllowed: 0,
      firstInningRuns: isStarter && entryInning === 1 ? Math.min(runsAllowed, Math.floor(rng() * 2)) : 0,
      basesLoadedWalks: rng() < 0.03 ? 1 : 0,
      inningsComplete: Math.floor(outsRecorded / 3),
      decision: null as 'W' | 'L' | 'ND' | null,
      save: false,
      hold: false,
      blownSave: false,
    };
  }

  // Away team pitching: starter + maybe reliever
  const awayStarterOuts = Math.min(innings * 3, 15 + Math.floor(rng() * 12)); // 5-9 IP
  const awayRelieverOuts = Math.max(0, innings * 3 - awayStarterOuts);
  const awayStarterRuns = Math.min(homeRuns, Math.round(homeRuns * (0.5 + rng() * 0.5)));
  const awayRelieverRuns = homeRuns - awayStarterRuns;

  pitcherGameStats.push(generatePitcherStats(
    awayRoster.starter, awayRoster.teamId, true, awayStarterOuts, awayStarterRuns, 1
  ));

  if (awayRelieverOuts > 0 && awayRoster.relievers.length > 0) {
    const relieverInning = Math.floor(awayStarterOuts / 3) + 1;
    pitcherGameStats.push(generatePitcherStats(
      awayRoster.relievers[0], awayRoster.teamId, false, awayRelieverOuts, awayRelieverRuns, relieverInning
    ));
    playerInfo[awayRoster.relievers[0].playerId] = { playerName: awayRoster.relievers[0].playerName, teamId: awayRoster.teamId };
  }

  // Home team pitching: starter + maybe reliever
  const homeStarterOuts = Math.min(innings * 3, 15 + Math.floor(rng() * 12));
  const homeRelieverOuts = Math.max(0, innings * 3 - homeStarterOuts);
  const homeStarterRuns = Math.min(awayRuns, Math.round(awayRuns * (0.5 + rng() * 0.5)));
  const homeRelieverRuns = awayRuns - homeStarterRuns;

  pitcherGameStats.push(generatePitcherStats(
    homeRoster.starter, homeRoster.teamId, true, homeStarterOuts, homeStarterRuns, 1
  ));

  if (homeRelieverOuts > 0 && homeRoster.relievers.length > 0) {
    const relieverInning = Math.floor(homeStarterOuts / 3) + 1;
    pitcherGameStats.push(generatePitcherStats(
      homeRoster.relievers[0], homeRoster.teamId, false, homeRelieverOuts, homeRelieverRuns, relieverInning
    ));
    playerInfo[homeRoster.relievers[0].playerId] = { playerName: homeRoster.relievers[0].playerName, teamId: homeRoster.teamId };
  }

  // Also add pitcher playerInfo
  playerInfo[awayRoster.starter.playerId] = { playerName: awayRoster.starter.playerName, teamId: awayRoster.teamId };
  playerInfo[homeRoster.starter.playerId] = { playerName: homeRoster.starter.playerName, teamId: homeRoster.teamId };

  // Assign pitcher decisions (simplified from useGameState.ts:776)
  const winningTeam = homeRuns > awayRuns ? homeRoster.teamId : awayRoster.teamId;
  for (const ps of pitcherGameStats) {
    if (ps.teamId === winningTeam && ps.isStarter) {
      ps.decision = 'W';
    } else if (ps.teamId !== winningTeam && ps.isStarter) {
      ps.decision = 'L';
    } else {
      ps.decision = 'ND';
    }
  }

  return {
    id: 'current',
    gameId,
    savedAt: Date.now(),
    inning: innings,
    halfInning: 'BOTTOM' as const,
    outs: 3,
    homeScore: homeRuns,
    awayScore: awayRuns,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: Object.values(playerStats).reduce((sum, s) => sum + s.pa, 0),
    awayTeamId: awayRoster.teamId,
    homeTeamId: homeRoster.teamId,
    awayTeamName: awayRoster.teamName,
    homeTeamName: homeRoster.teamName,
    playerInfo,
    playerStats,
    pitcherGameStats,
    fameEvents: [],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [],
  };
}

// ============================================
// EXPORTED ROSTER FACTORY
// ============================================

export { generateRoster };
export type { TeamRoster, RosterPlayer };
