/**
 * Live Stats Calculator
 * Merges stored season stats with current game stats to display real-time statistics.
 * No DB writes during gameplay - purely in-memory calculation.
 */

import type { PlayerSeasonBatting, PlayerSeasonPitching } from './seasonStorage';
import { calculateBattingDerived, calculatePitchingDerived } from './seasonStorage';

// ============================================
// TYPES
// ============================================

/** Current game batting stats (from playerStats in GameTracker) */
export interface GameBattingStats {
  odlcli: string;
  plateAppearances: number;
  atBats: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  runs: number;
  walks: number;
  strikeouts: number;
  hitByPitch: number;
  sacFlies: number;
  sacBunts: number;
  stolenBases: number;
  caughtStealing: number;
}

/** Current game pitching stats (from pitcherGameStats in GameTracker) */
export interface GamePitchingStats {
  odlcli: string;
  pitcherName: string;
  outsRecorded: number;
  hitsAllowed: number;
  walksAllowed: number;
  strikeouts: number;
  homeRunsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  hitBatsmen: number;
  wildPitches: number;
  basesReachedViaError: number;
}

/** Live batting stats with derived calculations */
export interface LiveBattingStats {
  // Counting stats (season + game)
  games: number;
  pa: number;
  ab: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  runs: number;
  walks: number;
  strikeouts: number;
  stolenBases: number;
  caughtStealing: number;

  // Derived stats
  avg: number;
  obp: number;
  slg: number;
  ops: number;

  // This game only (for display)
  gameHits: number;
  gameAB: number;
  gameHR: number;
  gameRBI: number;

  // Fame
  fameBonuses: number;
  fameBoners: number;
  fameNet: number;
}

/** Live pitching stats with derived calculations */
export interface LivePitchingStats {
  // Counting stats (season + game)
  games: number;
  gamesStarted: number;
  wins: number;
  losses: number;
  saves: number;
  outsRecorded: number;
  hitsAllowed: number;
  walksAllowed: number;
  strikeouts: number;
  homeRunsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;

  // Derived stats
  era: number;
  whip: number;
  inningsPitched: string;  // Formatted (e.g., "45.2")

  // This game only (for display)
  gameOuts: number;
  gameHits: number;
  gameER: number;
  gameK: number;

  // Fame
  fameBonuses: number;
  fameBoners: number;
  fameNet: number;
}

// ============================================
// EMPTY STAT OBJECTS
// ============================================

/** Empty season batting stats for players with no history */
export function emptySeasonBatting(playerId: string, seasonId: string): PlayerSeasonBatting {
  return {
    seasonId,
    playerId,
    playerName: '',
    teamId: '',
    games: 0,
    pa: 0,
    ab: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 0,
    runs: 0,
    walks: 0,
    strikeouts: 0,
    hitByPitch: 0,
    sacFlies: 0,
    sacBunts: 0,
    stolenBases: 0,
    caughtStealing: 0,
    gidp: 0,
    fameBonuses: 0,
    fameBoners: 0,
    fameNet: 0,
    lastUpdated: Date.now(),
  };
}

/** Empty season pitching stats for pitchers with no history */
export function emptySeasonPitching(playerId: string, seasonId: string): PlayerSeasonPitching {
  return {
    seasonId,
    playerId,
    playerName: '',
    teamId: '',
    games: 0,
    gamesStarted: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    holds: 0,
    outsRecorded: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walksAllowed: 0,
    strikeouts: 0,
    homeRunsAllowed: 0,
    hitBatters: 0,
    wildPitches: 0,
    blownSaves: 0,
    qualityStarts: 0,
    completeGames: 0,
    shutouts: 0,
    noHitters: 0,
    perfectGames: 0,
    fameBonuses: 0,
    fameBoners: 0,
    fameNet: 0,
    lastUpdated: Date.now(),
  };
}

// ============================================
// MERGE FUNCTIONS
// ============================================

/**
 * Format outs as innings pitched string (e.g., 136 outs = "45.1")
 */
function formatIP(outs: number): string {
  const full = Math.floor(outs / 3);
  const partial = outs % 3;
  return partial === 0 ? `${full}.0` : `${full}.${partial}`;
}

/**
 * Merge season batting stats with current game stats to get live totals.
 */
export function calculateLiveBatting(
  season: PlayerSeasonBatting | null,
  game: GameBattingStats | null
): LiveBattingStats {
  const s = season || emptySeasonBatting('', '');
  const g = game || {
    plateAppearances: 0, atBats: 0, hits: 0, singles: 0, doubles: 0, triples: 0,
    homeRuns: 0, rbi: 0, runs: 0, walks: 0, strikeouts: 0, hitByPitch: 0,
    sacFlies: 0, sacBunts: 0, stolenBases: 0, caughtStealing: 0,
  };

  // Combined counting stats
  const combined = {
    pa: s.pa + g.plateAppearances,
    ab: s.ab + g.atBats,
    hits: s.hits + g.hits,
    singles: s.singles + g.singles,
    doubles: s.doubles + g.doubles,
    triples: s.triples + g.triples,
    homeRuns: s.homeRuns + g.homeRuns,
    rbi: s.rbi + g.rbi,
    runs: s.runs + g.runs,
    walks: s.walks + g.walks,
    strikeouts: s.strikeouts + g.strikeouts,
    hitByPitch: s.hitByPitch + g.hitByPitch,
    sacFlies: s.sacFlies + g.sacFlies,
    sacBunts: s.sacBunts + g.sacBunts,
    stolenBases: s.stolenBases + g.stolenBases,
    caughtStealing: s.caughtStealing + g.caughtStealing,
  };

  // Calculate derived stats from combined totals
  const derived = calculateBattingDerived({
    ...s,
    ...combined,
  });

  return {
    games: s.games + (g.plateAppearances > 0 ? 1 : 0),
    ...combined,
    avg: derived.avg,
    obp: derived.obp,
    slg: derived.slg,
    ops: derived.ops,
    gameHits: g.hits,
    gameAB: g.atBats,
    gameHR: g.homeRuns,
    gameRBI: g.rbi,
    fameBonuses: s.fameBonuses,
    fameBoners: s.fameBoners,
    fameNet: s.fameNet,
  };
}

/**
 * Merge season pitching stats with current game stats to get live totals.
 */
export function calculateLivePitching(
  season: PlayerSeasonPitching | null,
  game: GamePitchingStats | null
): LivePitchingStats {
  const s = season || emptySeasonPitching('', '');
  const g = game || {
    outsRecorded: 0, hitsAllowed: 0, walksAllowed: 0, strikeouts: 0,
    homeRunsAllowed: 0, runsAllowed: 0, earnedRuns: 0, hitBatsmen: 0, wildPitches: 0,
  };

  // Combined counting stats
  const combinedOuts = s.outsRecorded + g.outsRecorded;
  const combinedHits = s.hitsAllowed + g.hitsAllowed;
  const combinedWalks = s.walksAllowed + g.walksAllowed;
  const combinedK = s.strikeouts + g.strikeouts;
  const combinedHR = s.homeRunsAllowed + g.homeRunsAllowed;
  const combinedRuns = s.runsAllowed + g.runsAllowed;
  const combinedER = s.earnedRuns + g.earnedRuns;

  // Calculate derived stats from combined totals
  const derived = calculatePitchingDerived({
    ...s,
    outsRecorded: combinedOuts,
    hitsAllowed: combinedHits,
    walksAllowed: combinedWalks,
    earnedRuns: combinedER,
  });

  return {
    games: s.games + (g.outsRecorded > 0 ? 1 : 0),
    gamesStarted: s.gamesStarted,
    wins: s.wins,
    losses: s.losses,
    saves: s.saves,
    outsRecorded: combinedOuts,
    hitsAllowed: combinedHits,
    walksAllowed: combinedWalks,
    strikeouts: combinedK,
    homeRunsAllowed: combinedHR,
    runsAllowed: combinedRuns,
    earnedRuns: combinedER,
    era: derived.era,
    whip: derived.whip,
    inningsPitched: formatIP(combinedOuts),
    gameOuts: g.outsRecorded,
    gameHits: g.hitsAllowed,
    gameER: g.earnedRuns,
    gameK: g.strikeouts,
    fameBonuses: s.fameBonuses,
    fameBoners: s.fameBoners,
    fameNet: s.fameNet,
  };
}

// ============================================
// FORMATTING HELPERS
// ============================================

/**
 * Format batting average for display (e.g., ".285" or "---" for no ABs)
 */
export function formatAvg(avg: number, ab: number): string {
  if (ab === 0) return '---';
  return avg.toFixed(3).replace(/^0/, '');
}

/**
 * Format ERA for display (e.g., "3.45" or "---" for no innings)
 */
export function formatERA(era: number, outs: number): string {
  if (outs === 0) return '---';
  if (!isFinite(era)) return '∞';
  return era.toFixed(2);
}

/**
 * Format game line for batter (e.g., "2-4, HR, 2 RBI")
 */
export function formatBatterGameLine(stats: LiveBattingStats): string {
  const parts: string[] = [];

  // Hits-AB
  parts.push(`${stats.gameHits}-${stats.gameAB}`);

  // Notable events
  if (stats.gameHR > 0) {
    parts.push(stats.gameHR === 1 ? 'HR' : `${stats.gameHR} HR`);
  }
  if (stats.gameRBI > 0) {
    parts.push(stats.gameRBI === 1 ? 'RBI' : `${stats.gameRBI} RBI`);
  }

  return parts.join(', ');
}

/**
 * Format game line for pitcher (e.g., "5.2 IP, 3 H, 1 ER, 6 K")
 */
export function formatPitcherGameLine(stats: LivePitchingStats): string {
  const ip = formatIP(stats.gameOuts);
  return `${ip} IP, ${stats.gameHits} H, ${stats.gameER} ER, ${stats.gameK} K`;
}
