/**
 * FieldingStatsAggregator - Aggregate fielding stats by position
 * Per Ralph Framework S-F011
 *
 * Features:
 * - Per-position stats (PO, A, E, FLD%)
 * - Season totals per player-position
 * - Support for Gold Glove awards
 */

export interface PositionFieldingStats {
  position: string;
  games: number;
  innings: number;
  putouts: number;
  assists: number;
  errors: number;
  doublePlays: number;
  fieldingPct: number;
  rangeFactor: number;
  uzr: number; // Ultimate Zone Rating estimate
}

export interface PlayerFieldingProfile {
  playerId: string;
  playerName: string;
  teamId: string;
  seasonId: string;
  primaryPosition: string;
  positionStats: PositionFieldingStats[];
  totalGames: number;
  totalInnings: number;
  totalPutouts: number;
  totalAssists: number;
  totalErrors: number;
  overallFldPct: number;
}

export interface FieldingPlay {
  playId: string;
  gameId: string;
  inning: number;
  fielderId: string;
  fielderName: string;
  position: string;
  playType: 'putout' | 'assist' | 'error' | 'double_play';
  hitZone?: string;
  difficulty?: number; // 0-1 scale
}

const STORAGE_KEY = 'kbl_fielding_stats';

export function getSeasonFieldingStats(seasonId: string): PlayerFieldingProfile[] {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${seasonId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading fielding stats:', e);
  }
  return [];
}

export function saveSeasonFieldingStats(
  seasonId: string,
  stats: PlayerFieldingProfile[]
): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${seasonId}`, JSON.stringify(stats));
  } catch (e) {
    console.error('Error saving fielding stats:', e);
  }
}

export function recordFieldingPlay(seasonId: string, play: FieldingPlay): void {
  const stats = getSeasonFieldingStats(seasonId);

  // Find or create player profile
  let profile = stats.find((p) => p.playerId === play.fielderId);
  if (!profile) {
    profile = createEmptyProfile(play.fielderId, play.fielderName, seasonId);
    stats.push(profile);
  }

  // Find or create position stats
  let posStats = profile.positionStats.find((ps) => ps.position === play.position);
  if (!posStats) {
    posStats = createEmptyPositionStats(play.position);
    profile.positionStats.push(posStats);
  }

  // Update stats based on play type
  switch (play.playType) {
    case 'putout':
      posStats.putouts++;
      profile.totalPutouts++;
      break;
    case 'assist':
      posStats.assists++;
      profile.totalAssists++;
      break;
    case 'error':
      posStats.errors++;
      profile.totalErrors++;
      break;
    case 'double_play':
      posStats.doublePlays++;
      posStats.assists++;
      profile.totalAssists++;
      break;
  }

  // Recalculate percentages
  recalculateFieldingPercentages(profile);

  saveSeasonFieldingStats(seasonId, stats);
}

export function recordGamePlayed(
  seasonId: string,
  playerId: string,
  playerName: string,
  position: string,
  innings: number = 9
): void {
  const stats = getSeasonFieldingStats(seasonId);

  let profile = stats.find((p) => p.playerId === playerId);
  if (!profile) {
    profile = createEmptyProfile(playerId, playerName, seasonId);
    stats.push(profile);
  }

  let posStats = profile.positionStats.find((ps) => ps.position === position);
  if (!posStats) {
    posStats = createEmptyPositionStats(position);
    profile.positionStats.push(posStats);
  }

  posStats.games++;
  posStats.innings += innings;
  profile.totalGames++;
  profile.totalInnings += innings;

  // Update primary position if this is where they play most
  const maxGames = Math.max(...profile.positionStats.map((ps) => ps.games));
  const primaryPos = profile.positionStats.find((ps) => ps.games === maxGames);
  if (primaryPos) {
    profile.primaryPosition = primaryPos.position;
  }

  // Recalculate range factor
  recalculateRangeFactor(posStats);

  saveSeasonFieldingStats(seasonId, stats);
}

function createEmptyProfile(
  playerId: string,
  playerName: string,
  seasonId: string
): PlayerFieldingProfile {
  return {
    playerId,
    playerName,
    teamId: '',
    seasonId,
    primaryPosition: '',
    positionStats: [],
    totalGames: 0,
    totalInnings: 0,
    totalPutouts: 0,
    totalAssists: 0,
    totalErrors: 0,
    overallFldPct: 1.0,
  };
}

function createEmptyPositionStats(position: string): PositionFieldingStats {
  return {
    position,
    games: 0,
    innings: 0,
    putouts: 0,
    assists: 0,
    errors: 0,
    doublePlays: 0,
    fieldingPct: 1.0,
    rangeFactor: 0,
    uzr: 0,
  };
}

function recalculateFieldingPercentages(profile: PlayerFieldingProfile): void {
  // Per-position
  for (const ps of profile.positionStats) {
    const chances = ps.putouts + ps.assists + ps.errors;
    ps.fieldingPct = chances > 0 ? (ps.putouts + ps.assists) / chances : 1.0;
  }

  // Overall
  const totalChances = profile.totalPutouts + profile.totalAssists + profile.totalErrors;
  profile.overallFldPct =
    totalChances > 0
      ? (profile.totalPutouts + profile.totalAssists) / totalChances
      : 1.0;
}

function recalculateRangeFactor(posStats: PositionFieldingStats): void {
  // Range Factor = (PO + A) * 9 / Innings
  if (posStats.innings > 0) {
    posStats.rangeFactor =
      ((posStats.putouts + posStats.assists) * 9) / posStats.innings;
  }
}

export function getGoldGloveCandidates(
  seasonId: string,
  position: string,
  minGames: number = 20
): PlayerFieldingProfile[] {
  const stats = getSeasonFieldingStats(seasonId);

  return stats
    .filter((p) => {
      const posStats = p.positionStats.find((ps) => ps.position === position);
      return posStats && posStats.games >= minGames;
    })
    .sort((a, b) => {
      const aPos = a.positionStats.find((ps) => ps.position === position)!;
      const bPos = b.positionStats.find((ps) => ps.position === position)!;

      // Sort by UZR first, then fielding %
      if (Math.abs(aPos.uzr - bPos.uzr) > 1) {
        return bPos.uzr - aPos.uzr;
      }
      return bPos.fieldingPct - aPos.fieldingPct;
    });
}

export function getPlayerFieldingStats(
  seasonId: string,
  playerId: string
): PlayerFieldingProfile | null {
  const stats = getSeasonFieldingStats(seasonId);
  return stats.find((p) => p.playerId === playerId) || null;
}

export function aggregateSeasonTotals(seasonId: string): {
  totalPlays: number;
  totalErrors: number;
  leagueFieldingPct: number;
} {
  const stats = getSeasonFieldingStats(seasonId);

  let totalPO = 0;
  let totalA = 0;
  let totalE = 0;

  for (const profile of stats) {
    totalPO += profile.totalPutouts;
    totalA += profile.totalAssists;
    totalE += profile.totalErrors;
  }

  const totalChances = totalPO + totalA + totalE;
  const leagueFldPct = totalChances > 0 ? (totalPO + totalA) / totalChances : 0;

  return {
    totalPlays: totalPO + totalA,
    totalErrors: totalE,
    leagueFieldingPct: leagueFldPct,
  };
}

export function estimateUZR(
  posStats: PositionFieldingStats,
  leagueAvgRF: number
): number {
  // Simplified UZR estimate based on range factor vs league average
  // Real UZR would need zone data
  if (posStats.innings < 100) return 0;

  const rfDiff = posStats.rangeFactor - leagueAvgRF;
  const gamesEquiv = posStats.innings / 9;

  // Rough conversion: RF difference * games * 0.5
  return rfDiff * gamesEquiv * 0.5;
}
