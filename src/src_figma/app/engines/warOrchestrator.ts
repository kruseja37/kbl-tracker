/**
 * WAR Orchestrator
 *
 * MAJ-01: Wire all 5 WAR calculators to UI.
 *
 * Plain async function (NOT a React hook) that runs once at game end.
 * Loads season stats from IndexedDB, calculates all WAR components
 * for game participants, persists results back to season storage.
 *
 * WAR is recalculated from season totals after each game (cumulative,
 * not single-game fractions).
 */

// WAR Calculators
import { calculateBWAR } from '../../../engines/bwarCalculator';
import { calculatePWAR, createDefaultPitchingContext } from '../../../engines/pwarCalculator';
import { calculatePreferredFWARFromPersistedFieldingSet, type Position } from '../../../engines/fwarCalculator';
import { calculateRWARSimplified } from '../../../engines/rwarCalculator';

// Types
import {
  type BattingStatsForWAR,
  type BWARResult,
  createDefaultLeagueContext,
  type ParkFactors,
  SMB4_BASELINES,
} from '../../../types/war';
import type { PitchingStatsForWAR } from '../../../engines/pwarCalculator';
import type { PWARResult } from '../../../engines/pwarCalculator';
import type { FWARResult } from '../../../engines/fwarCalculator';
import type { BaserunningStats, RWARResult } from '../../../engines/rwarCalculator';

// Season Storage
import {
  type PlayerSeasonBatting,
  type PlayerSeasonPitching,
  type PlayerSeasonFielding,
  getSeasonBattingStats,
  getSeasonPitchingStats,
  getAllFieldingStats,
  getSeasonMetadata,
  updateBattingStats,
  updatePitchingStats,
} from '../../../utils/seasonStorage';
import type { CompetitionType } from '../../../utils/gameStorage';
import { getFieldingEventsForScope } from '../../../utils/eventLog';
import { getAllFranchiseTeams } from '../../../utils/franchisePlayerStorage';
import {
  getDerivedParkFactorsIfAvailable,
  isParkFactorAdjustmentActive,
} from '../../../engines/parkFactorDeriver';

// ============================================
// TYPES
// ============================================

export interface PlayerWARSummary {
  playerId: string;
  playerName: string;
  position: string;

  // WAR components
  bwar: number;
  pwar: number;
  fwar: number;
  rwar: number;
  totalWar: number;

  // Key metrics for display
  wOBA?: number;
  fip?: number;
  wSB?: number;

  // Role
  isPitcher: boolean;
}

export interface WARParkFactorContext {
  franchiseId?: string | null;
  homeTeamId?: string | null;
  stadiumName?: string | null;
  parkFactors?: ParkFactors | null;
  gamesPlayed?: number | null;
}

// ============================================
// STAT MAPPING: Season Storage → Calculator Input
// ============================================

/**
 * Map PlayerSeasonBatting → BattingStatsForWAR
 * Direct field-for-field mapping (types align well).
 */
type PlayerSeasonBattingWithHomeSplit = PlayerSeasonBatting & {
  homePA?: number;
  roadPA?: number;
};

function optionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function mapBattingStats(stats: PlayerSeasonBatting): BattingStatsForWAR {
  const homeAwareStats = stats as PlayerSeasonBattingWithHomeSplit;

  return {
    pa: stats.pa,
    ab: stats.ab,
    hits: stats.hits,
    singles: stats.singles,
    doubles: stats.doubles,
    triples: stats.triples,
    homeRuns: stats.homeRuns,
    walks: stats.walks,
    intentionalWalks: 0, // Not tracked separately in season storage
    hitByPitch: stats.hitByPitch,
    sacFlies: stats.sacFlies,
    sacBunts: stats.sacBunts,
    strikeouts: stats.strikeouts,
    gidp: stats.gidp,
    stolenBases: stats.stolenBases,
    caughtStealing: stats.caughtStealing,
    homePA: optionalFiniteNumber(homeAwareStats.homePA),
    roadPA: optionalFiniteNumber(homeAwareStats.roadPA),
    teamId: stats.teamId,
  };
}

/**
 * Map PlayerSeasonPitching → PitchingStatsForWAR (pwarCalculator format)
 * Key conversions:
 *   - outsRecorded → ip (divide by 3)
 *   - walksAllowed → walks
 *   - hitBatters → hitByPitch
 *   - games → gamesAppeared
 */
function mapPitchingStats(stats: PlayerSeasonPitching): PitchingStatsForWAR {
  return {
    ip: stats.outsRecorded / 3,
    strikeouts: stats.strikeouts,
    walks: stats.walksAllowed,
    hitByPitch: stats.hitBatters,
    homeRunsAllowed: stats.homeRunsAllowed,
    gamesStarted: stats.gamesStarted,
    gamesAppeared: stats.games,
    saves: stats.saves,
    holds: stats.holds,
  };
}

/**
 * Map PlayerSeasonBatting → BaserunningStats (rwarCalculator format)
 */
function mapBaserunningStats(stats: PlayerSeasonBatting): BaserunningStats {
  return {
    stolenBases: stats.stolenBases,
    caughtStealing: stats.caughtStealing,
    singles: stats.singles,
    walks: stats.walks,
    hitByPitch: stats.hitByPitch,
    intentionalWalks: 0,
    gidp: stats.gidp,
    gidpOpportunities: 0, // Not tracked; rWAR will estimate
    plateAppearances: stats.pa,
  };
}

function inferCompetitionTypeForScope(scopeId: string): CompetitionType | undefined {
  if (scopeId.startsWith('elimination-')) return 'elimination';
  return 'franchise';
}

function seedParkFactorsFromStoredOrDerived(
  stadiumName?: string | null,
  parkFactors?: ParkFactors | null,
): ParkFactors | undefined {
  if (parkFactors?.source === 'SEED') return parkFactors;
  return getDerivedParkFactorsIfAvailable(stadiumName ?? undefined);
}

function pitcherParkFactorFromSeed(parkFactors: ParkFactors | undefined): number | undefined {
  if (!parkFactors) return undefined;
  return parkFactors.homeRuns ?? parkFactors.overall;
}

function fallbackGamesPlayed(
  allBatting: PlayerSeasonBatting[],
  allPitching: PlayerSeasonPitching[],
): number {
  return Math.max(
    0,
    ...allBatting.map((stats) => stats.games),
    ...allPitching.map((stats) => stats.games),
  );
}

async function buildSeedParkFactorsByTeamId(
  parkContext: WARParkFactorContext | undefined,
): Promise<Map<string, ParkFactors>> {
  const byTeamId = new Map<string, ParkFactors>();
  const fallbackParkFactors = seedParkFactorsFromStoredOrDerived(
    parkContext?.stadiumName,
    parkContext?.parkFactors,
  );

  if (!fallbackParkFactors) return byTeamId;

  if (parkContext?.franchiseId) {
    try {
      const teams = await getAllFranchiseTeams(parkContext.franchiseId);
      for (const team of teams) {
        const seedParkFactors = seedParkFactorsFromStoredOrDerived(team.stadium, team.parkFactors);
        if (seedParkFactors) byTeamId.set(team.id, seedParkFactors);
      }
    } catch (error) {
      console.warn(`[WAR] seed park factors unavailable for franchise ${parkContext.franchiseId}:`, error);
    }
  }

  if (parkContext?.homeTeamId && !byTeamId.has(parkContext.homeTeamId)) {
    byTeamId.set(parkContext.homeTeamId, fallbackParkFactors);
  }

  return byTeamId;
}

// ============================================
// MAIN ORCHESTRATOR
// ============================================

/**
 * Calculate and persist season WAR for all game participants.
 *
 * Called once at game end, AFTER aggregateGameToSeason() has persisted
 * the updated counting stats.
 *
 * @param seasonId - The current season ID
 * @param seasonGames - Total games in the season (typically 50 for SMB4)
 * @param participantIds - Player IDs that participated in this game
 * @param playerPositions - Map of playerId → primary position string
 * @returns PlayerWARSummary[] for participants only (for PostGameSummary display)
 */
export async function calculateAndPersistSeasonWAR(
  seasonId: string,
  seasonGames: number,
  participantIds: string[],
  playerPositions: Map<string, string>,
  parkContext?: WARParkFactorContext
): Promise<PlayerWARSummary[]> {
  // Load ALL season stats (not just participants - needed for context)
  const [allBatting, allPitching, allFielding, seasonMetadata] = await Promise.all([
    getSeasonBattingStats(seasonId),
    getSeasonPitchingStats(seasonId),
    getAllFieldingStats(seasonId),
    getSeasonMetadata(seasonId).catch(() => null),
  ]);

  // Index by playerId for fast lookup
  const battingMap = new Map<string, PlayerSeasonBatting>();
  for (const stats of allBatting) {
    battingMap.set(stats.playerId, stats);
  }

  const pitchingMap = new Map<string, PlayerSeasonPitching>();
  for (const stats of allPitching) {
    pitchingMap.set(stats.playerId, stats);
  }

  const fieldingMap = new Map<string, PlayerSeasonFielding>();
  for (const stats of allFielding) {
    fieldingMap.set(stats.playerId, stats);
  }

  // Create league contexts
  const leagueContext = createDefaultLeagueContext(seasonId, seasonGames);
  const pitchingContext = createDefaultPitchingContext(seasonId, seasonGames);
  const gamesPlayedForParkGate =
    optionalFiniteNumber(parkContext?.gamesPlayed) ??
    optionalFiniteNumber(seasonMetadata?.gamesPlayed) ??
    fallbackGamesPlayed(allBatting, allPitching);
  const parkFactorsActive = isParkFactorAdjustmentActive(gamesPlayedForParkGate, seasonGames);
  const seedParkFactorsByTeamId = parkFactorsActive
    ? await buildSeedParkFactorsByTeamId(parkContext)
    : new Map<string, ParkFactors>();
  const inferredCompetitionType = inferCompetitionTypeForScope(seasonId);
  const scopedFieldingEvents = await getFieldingEventsForScope({
    statsScopeId: seasonId,
    seasonId,
    competitionType: inferredCompetitionType,
    isComplete: true,
  });

  // Calculate WAR for all players with season data (not just participants)
  // This ensures cumulative WAR is correct across the full roster
  const summaries: PlayerWARSummary[] = [];
  const battingUpdates: PlayerSeasonBatting[] = [];
  const pitchingUpdates: PlayerSeasonPitching[] = [];

  // Process all batters
  for (const batting of allBatting) {
    if (batting.pa === 0) continue; // Skip players with no plate appearances

    const battingInput = mapBattingStats(batting);
    const baserunningInput = mapBaserunningStats(batting);

    // Calculate bWAR
    let bwarResult: BWARResult | null = null;
    try {
      const parkFactors = seedParkFactorsByTeamId.get(batting.teamId);
      bwarResult = parkFactors
        ? calculateBWAR(battingInput, leagueContext, {
            parkFactors,
            batterHand: 'S',
          })
        : calculateBWAR(battingInput, leagueContext);
    } catch (e) {
      console.warn(`[WAR] bWAR calc failed for ${batting.playerName}:`, e);
    }

    // Calculate rWAR
    let rwarResult: RWARResult | null = null;
    try {
      rwarResult = calculateRWARSimplified(baserunningInput, seasonGames);
    } catch (e) {
      console.warn(`[WAR] rWAR calc failed for ${batting.playerName}:`, e);
    }

    // Calculate fWAR (if fielding data exists)
    let fwarResult: FWARResult | null = null;
    const fielding = fieldingMap.get(batting.playerId);
    const posStr = playerPositions.get(batting.playerId) || 'DH';
    const position = normalizePosition(posStr);
    if (fielding && fielding.games > 0) {
      try {
        fwarResult = calculatePreferredFWARFromPersistedFieldingSet(
          scopedFieldingEvents,
          batting.playerId,
          position,
          fielding.games,
          seasonGames,
          {
            teamId: fielding.teamId,
            fallbackStats: {
              putouts: fielding.putouts,
              assists: fielding.assists,
              errors: fielding.errors,
              doublePlays: fielding.doublePlays,
            },
          }
        );
      } catch (e) {
        console.warn(`[WAR] fWAR calc failed for ${batting.playerName}:`, e);
      }
    }

    // Aggregate
    const bwar = bwarResult?.bWAR ?? 0;
    const rwar = rwarResult?.rWAR ?? 0;
    const fwar = fwarResult?.fWAR ?? 0;
    const totalWar = bwar + rwar + fwar;

    // Update batting record with WAR
    batting.bwar = bwar;
    batting.rwar = rwar;
    batting.fwar = fwar;
    batting.totalWar = totalWar;
    battingUpdates.push(batting);

    // Build summary for participants
    if (participantIds.includes(batting.playerId)) {
      summaries.push({
        playerId: batting.playerId,
        playerName: batting.playerName,
        position: posStr,
        bwar,
        pwar: 0,
        fwar,
        rwar,
        totalWar,
        wOBA: bwarResult?.wOBA,
        isPitcher: false,
      });
    }
  }

  // Process all pitchers
  for (const pitching of allPitching) {
    if (pitching.outsRecorded === 0) continue; // Skip pitchers with no IP

    const pitchingInput = mapPitchingStats(pitching);

    let pwarResult: PWARResult | null = null;
    try {
      const parkFactor = pitcherParkFactorFromSeed(seedParkFactorsByTeamId.get(pitching.teamId));
      pwarResult = parkFactor === undefined
        ? calculatePWAR(pitchingInput, pitchingContext)
        : calculatePWAR(pitchingInput, pitchingContext, { parkFactor });
    } catch (e) {
      console.warn(`[WAR] pWAR calc failed for ${pitching.playerName}:`, e);
    }

    const pwar = pwarResult?.pWAR ?? 0;

    // Update pitching record
    pitching.pwar = pwar;
    pitchingUpdates.push(pitching);

    // Build summary for participants
    if (participantIds.includes(pitching.playerId)) {
      // Check if this pitcher already has a batter summary (they can have both)
      const existingSummary = summaries.find(s => s.playerId === pitching.playerId);
      if (existingSummary) {
        existingSummary.pwar = pwar;
        existingSummary.totalWar += pwar;
        existingSummary.fip = pwarResult?.fip;
        existingSummary.isPitcher = true;
      } else {
        summaries.push({
          playerId: pitching.playerId,
          playerName: pitching.playerName,
          position: playerPositions.get(pitching.playerId) || 'P',
          bwar: 0,
          pwar,
          fwar: 0,
          rwar: 0,
          totalWar: pwar,
          fip: pwarResult?.fip,
          isPitcher: true,
        });
      }
    }
  }

  // Persist all WAR updates back to season storage
  const persistPromises: Promise<void>[] = [];
  for (const batting of battingUpdates) {
    persistPromises.push(updateBattingStats(batting));
  }
  for (const pitching of pitchingUpdates) {
    persistPromises.push(updatePitchingStats(pitching));
  }
  await Promise.all(persistPromises);

  return summaries;
}

// ============================================
// HELPERS
// ============================================

/**
 * Normalize position string to fWAR Position type.
 * Handles various formats: "SS", "ss", "Shortstop", numeric, etc.
 */
function normalizePosition(pos: string): Position {
  const upper = pos.toUpperCase().trim();

  const posMap: Record<string, Position> = {
    'C': 'C',
    'CATCHER': 'C',
    '2': 'C',
    '1B': '1B',
    'FIRST': '1B',
    'FIRST BASE': '1B',
    '3': '1B',
    '2B': '2B',
    'SECOND': '2B',
    'SECOND BASE': '2B',
    '4': '2B',
    '3B': '3B',
    'THIRD': '3B',
    'THIRD BASE': '3B',
    '5': '3B',
    'SS': 'SS',
    'SHORTSTOP': 'SS',
    '6': 'SS',
    'LF': 'LF',
    'LEFT': 'LF',
    'LEFT FIELD': 'LF',
    '7': 'LF',
    'CF': 'CF',
    'CENTER': 'CF',
    'CENTER FIELD': 'CF',
    '8': 'CF',
    'RF': 'RF',
    'RIGHT': 'RF',
    'RIGHT FIELD': 'RF',
    '9': 'RF',
    'DH': 'DH',
    'DESIGNATED': 'DH',
    'DESIGNATED HITTER': 'DH',
    'P': 'P',
    'PITCHER': 'P',
    '1': 'P',
    'SP': 'P',
    'RP': 'P',
    'CL': 'P',
    'CP': 'P',
  };

  return posMap[upper] || 'DH';
}
