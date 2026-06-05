/**
 * Game Completion Orchestrator
 *
 * Runs a completed game through the full stats pipeline:
 *   1. aggregateGameToSeason() — regular-season batting/pitching/fielding/fame/milestone aggregation
 *   2. archiveCompletedGame() — writes to completedGames store
 *
 * Stat truth boundary:
 * - franchise/exhibition completions aggregate into regular-season season stats.
 * - playoff/elimination completions are archived here, then their callers write to
 *   postseason-specific stores. They must not contaminate regular-season rows.
 *
 * Adapted from test-utils/processCompletedGame.ts for production use.
 * Import paths fixed for src/utils/ location.
 *
 * Pipeline classification: B (Orchestrated but Extractable)
 * Per FRANCHISE_API_MAP.md §11
 */

import type { PersistedGameState, PlayerRatingsSnapshot } from './gameStorage';
import {
  aggregateGameToSeason,
  type GameAggregationOptions,
  type GameAggregationResult,
} from './seasonAggregator';
import {
  archiveCompletedGame,
  getCompletedGameById,
  resolveExhibitionLeagueId,
} from './gameStorage';
import { getGameHeader, markAggregationFailed, markGameAggregated } from './eventLog';
import { getEffectivePlayer } from './playerOverrides';
import { registerAlmanacPlayers } from './registerAlmanacPlayers';

export interface ProcessGameResult {
  aggregation: GameAggregationResult;
}

export interface CompletedGameArchiveOptions {
  finalScore?: { away: number; home: number };
  inningScores?: { away: number; home: number }[];
  seasonId?: string;
  context?: Parameters<typeof archiveCompletedGame>[4];
}

export function shouldAggregateToRegularSeasonStats(
  gameState: PersistedGameState,
  archiveOptions?: CompletedGameArchiveOptions,
): boolean {
  const competitionType =
    archiveOptions?.context?.competitionType ?? gameState.competitionType;
  const playoffId = archiveOptions?.context?.playoffId ?? gameState.playoffId;
  const playoffSeriesId =
    archiveOptions?.context?.playoffSeriesId ?? gameState.playoffSeriesId;
  const playoffGameNumber =
    archiveOptions?.context?.playoffGameNumber ?? gameState.playoffGameNumber;
  const isEliminationGame =
    archiveOptions?.context?.isEliminationGame ?? gameState.isEliminationGame;

  return (
    competitionType !== 'playoff' &&
    competitionType !== 'elimination' &&
    !playoffId &&
    !playoffSeriesId &&
    playoffGameNumber === undefined &&
    isEliminationGame !== true
  );
}

function buildPlayerRatingsSnapshot(
  playerId: string,
  player: NonNullable<Awaited<ReturnType<typeof getEffectivePlayer>>>
): PlayerRatingsSnapshot {
  return {
    playerId,
    firstName: player.firstName,
    lastName: player.lastName,
    nickname: player.nickname,
    hometown: player.hometown,
    age: player.age,
    gender: player.gender,
    bats: player.bats,
    throws: player.throws,
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fielding: player.fielding,
    arm: player.arm,
    velocity: player.velocity,
    junk: player.junk,
    accuracy: player.accuracy,
    arsenal: [...player.arsenal],
    overallGrade: player.overallGrade,
    trait1: player.trait1,
    trait2: player.trait2,
    personality: player.personality,
    chemistry: player.chemistry,
    morale: player.morale,
    mojo: player.mojo,
    fame: player.fame,
    salary: player.salary,
  };
}

async function capturePlayerRatingsSnapshots(
  gameState: PersistedGameState,
  leagueId: string
): Promise<void> {
  const playerIds = new Set<string>([
    ...Object.keys(gameState.playerStats),
    ...gameState.pitcherGameStats.map((stats) => stats.pitcherId),
  ]);

  const snapshots = await Promise.all(
    Array.from(playerIds).map(async (playerId) => {
      const effectivePlayer = await getEffectivePlayer(playerId, leagueId);
      if (!effectivePlayer) {
        return null;
      }

      return [playerId, buildPlayerRatingsSnapshot(playerId, effectivePlayer)] as const;
    })
  );

  gameState.playerRatingsSnapshots = Object.fromEntries(
    snapshots.filter((entry): entry is readonly [string, PlayerRatingsSnapshot] => entry !== null)
  );
}

/**
 * Process a completed game through the full pipeline.
 *
 * This is the non-React equivalent of completeGameInternal.
 * Accepts a fully-built PersistedGameState (with pitcher decisions
 * already calculated) and runs it through aggregation + archival.
 */
export async function processCompletedGame(
  gameState: PersistedGameState,
  options?: GameAggregationOptions,
  leagueId?: string,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<ProcessGameResult> {
  const resolvedLeagueId = leagueId ?? resolveExhibitionLeagueId(gameState);
  const registerCompletedGameForAlmanac = async (): Promise<void> => {
    const almanacCompetitionType =
      archiveOptions?.context?.competitionType ?? gameState.competitionType;
    const almanacCompetitionId =
      archiveOptions?.context?.competitionId ?? gameState.competitionId;
    const almanacFranchiseId =
      archiveOptions?.context?.franchiseId ?? gameState.franchiseId;
    const shouldRegisterAlmanac =
      Boolean(resolvedLeagueId) ||
      almanacCompetitionType === 'franchise' ||
      almanacCompetitionType === 'playoff' ||
      almanacCompetitionType === 'elimination';

    if (shouldRegisterAlmanac) {
      await registerAlmanacPlayers(gameState, resolvedLeagueId, {
        competitionType: almanacCompetitionType,
        competitionId: almanacCompetitionId,
        competitionName: archiveOptions?.context?.competitionName ?? gameState.competitionName,
        franchiseId: almanacFranchiseId,
        leagueId: resolvedLeagueId,
      });
    }
  };

  const existingArchive = await getCompletedGameById(gameState.gameId);
  if (existingArchive && existingArchive.aggregationStatus !== 'incomplete') {
    return { aggregation: { success: true, milestones: null } };
  }

  const header = await getGameHeader(gameState.gameId);
  if (header?.aggregated === true) {
    await archiveCompletedGame(
      gameState,
      archiveOptions?.finalScore ?? {
        away: gameState.awayScore,
        home: gameState.homeScore,
      },
      archiveOptions?.inningScores ?? [],
      archiveOptions?.seasonId ?? options?.seasonId,
      archiveOptions?.context ?? {
        leagueId: resolvedLeagueId,
      },
    );
    await registerCompletedGameForAlmanac();
    return { aggregation: { success: true, milestones: null } };
  }

  let aggregation: GameAggregationResult = { success: true, milestones: null };

  if (shouldAggregateToRegularSeasonStats(gameState, archiveOptions)) {
    // Step 1: Aggregate regular-season game stats to season totals.
    aggregation = await aggregateGameToSeason(gameState, options);

    if (aggregation.success !== true) {
      try {
        await markAggregationFailed(
          gameState.gameId,
          aggregation.error ||
            `Failed to aggregate completed game ${gameState.gameId} to season stats`,
        );
      } catch (error) {
        console.warn('[processCompletedGame] Failed to mark aggregation failure:', error);
      }
      throw new Error(
        aggregation.error ||
          `Failed to aggregate completed game ${gameState.gameId} to season stats`,
      );
    }
  }

  try {
    await markGameAggregated(gameState.gameId);
  } catch (error) {
    console.warn('[processCompletedGame] Failed to mark game aggregated:', error);
  }

  if (resolvedLeagueId) {
    await capturePlayerRatingsSnapshots(gameState, resolvedLeagueId);
  }

  // Step 2: Archive to completedGames store
  await archiveCompletedGame(
    gameState,
    archiveOptions?.finalScore ?? {
      away: gameState.awayScore,
      home: gameState.homeScore,
    },
    archiveOptions?.inningScores ?? [],
    archiveOptions?.seasonId ?? options?.seasonId,
    archiveOptions?.context ?? {
      leagueId: resolvedLeagueId,
    }
  );

  // Step 3: Register players in Almanac canonical registry. Franchise
  // archives may not have an exhibition league id, but they still have a
  // durable franchise/competition instance for Almanac continuity.
  await registerCompletedGameForAlmanac();

  return { aggregation };
}
