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
import { deriveAdaptiveStandardsConfig, type AdaptiveStandardsConfigInput } from './franchiseAdaptiveStandards';
import { getSeasonMetadata, saveSeasonMetadata } from './seasonStorage';
import { calculateAndPersistSeasonWAR } from '../src_figma/app/engines/warOrchestrator';
import { calculateAndPersistFranchiseTrueValueForSeason } from './franchiseTrueValueStorage';
import { calculateAndPersistProjectedFranchiseDesignationsForSeason } from './franchiseDesignationStorage';

export interface ProcessGameResult {
  aggregation: GameAggregationResult;
}

export interface CompletedGameArchiveOptions {
  finalScore?: { away: number; home: number };
  inningScores?: { away: number; home: number }[];
  seasonId?: string;
  context?: Parameters<typeof archiveCompletedGame>[4];
}

type ProcessCompletedGameAggregationOptions = GameAggregationOptions & AdaptiveStandardsConfigInput;
type WarMetadataSource = ProcessCompletedGameAggregationOptions;
type PersistedWarScope = {
  seasonId: string;
  statsScopeId: string;
};
type PersistedTrueValueScope = PersistedWarScope & {
  franchiseId: string;
  seasonNumber: number;
};

function positiveFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function getCompletedGameSeasonId(
  gameState: PersistedGameState,
  options?: ProcessCompletedGameAggregationOptions,
  archiveOptions?: CompletedGameArchiveOptions,
): string | null {
  // X5: WAR must use the same season scope aggregateGameToSeason receives.
  return (
    options?.seasonId ??
    archiveOptions?.seasonId ??
    gameState.statsScopeId ??
    gameState.seasonId ??
    null
  );
}

function getParticipantIds(gameState: PersistedGameState): string[] {
  return Array.from(new Set([
    ...Object.keys(gameState.playerStats),
    ...gameState.pitcherGameStats.map((stats) => stats.pitcherId),
  ])).filter(Boolean).sort();
}

function collectLineupPositions(gameState: PersistedGameState): Map<string, string> {
  const positions = new Map<string, string>();
  const add = (playerId: unknown, position: unknown) => {
    if (typeof playerId === 'string' && playerId.trim() && typeof position === 'string' && position.trim()) {
      positions.set(playerId, position);
    }
  };

  for (const entry of gameState.awayLineup ?? []) add(entry.playerId, entry.position);
  for (const entry of gameState.homeLineup ?? []) add(entry.playerId, entry.position);
  for (const entry of gameState.awayLineupState?.lineup ?? []) add(entry.playerId, entry.position);
  for (const entry of gameState.homeLineupState?.lineup ?? []) add(entry.playerId, entry.position);
  add(gameState.awayLineupState?.currentPitcher?.playerId, gameState.awayLineupState?.currentPitcher?.position);
  add(gameState.homeLineupState?.currentPitcher?.playerId, gameState.homeLineupState?.currentPitcher?.position);

  return positions;
}

async function buildWarPlayerPositions(
  gameState: PersistedGameState,
  participantIds: string[],
  leagueId: string | null,
): Promise<Map<string, string>> {
  const positions = collectLineupPositions(gameState);
  if (!leagueId) return positions;

  for (const playerId of participantIds) {
    if (positions.has(playerId)) continue;
    try {
      const player = await getEffectivePlayer(playerId, leagueId);
      if (player?.primaryPosition) positions.set(playerId, player.primaryPosition);
    } catch (error) {
      console.warn(`[WAR] player position unresolved for ${playerId}:`, error);
    }
  }

  return positions;
}

function explicitGamesPerTeamFromAdaptiveInput(input: WarMetadataSource | undefined): number | null {
  if (!input) return null;

  return (
    positiveFiniteNumber(input.gamesPerTeam) ??
    positiveFiniteNumber(input.milestoneConfig?.gamesPerSeason) ??
    positiveFiniteNumber(input.gamesPerSeason) ??
    positiveFiniteNumber(input.seasonLength?.gamesPerTeam) ??
    positiveFiniteNumber(input.seasonLength?.expectedRegularSeasonGamesPerTeam) ??
    positiveFiniteNumber(input.season?.gamesPerSeason) ??
    positiveFiniteNumber(input.season?.gamesPerTeam) ??
    positiveFiniteNumber(input.rulesSnapshot?.gamesPerTeam)
  );
}

async function resolveSeasonGamesForWar(
  seasonId: string,
  options?: ProcessCompletedGameAggregationOptions,
): Promise<number | null> {
  const metadata = await getSeasonMetadata(seasonId);
  const metadataGamesPerTeam = positiveFiniteNumber(metadata?.gamesPerTeam);
  if (metadataGamesPerTeam !== null) return metadataGamesPerTeam;

  const explicitGamesPerTeam = explicitGamesPerTeamFromAdaptiveInput(options as WarMetadataSource | undefined);
  if (explicitGamesPerTeam === null) return null;

  // W1-B: use the shared adaptive standards resolver, but only after a non-default
  // season-length source is present so WAR never silently inherits default games.
  const adaptive = deriveAdaptiveStandardsConfig({
    ...(options as AdaptiveStandardsConfigInput | undefined),
    gamesPerTeam: explicitGamesPerTeam,
    gamesPerSeason: options?.milestoneConfig?.gamesPerSeason ?? explicitGamesPerTeam,
    inningsPerGame: options?.milestoneConfig?.inningsPerGame ?? (options as WarMetadataSource | undefined)?.inningsPerGame,
  });

  if (metadata) {
    await saveSeasonMetadata({ ...metadata, gamesPerTeam: adaptive.gamesPerSeason });
  }

  return positiveFiniteNumber(adaptive.gamesPerSeason);
}

async function persistSeasonWarAfterAggregation(
  gameState: PersistedGameState,
  options: ProcessCompletedGameAggregationOptions | undefined,
  archiveOptions: CompletedGameArchiveOptions | undefined,
  leagueId: string | null,
): Promise<PersistedWarScope | null> {
  const seasonId = getCompletedGameSeasonId(gameState, options, archiveOptions);
  if (!seasonId) {
    console.warn('[WAR] skipped: seasonId unresolved for completed game ' + gameState.gameId);
    return null;
  }

  const seasonGames = await resolveSeasonGamesForWar(seasonId, options);
  if (seasonGames === null) {
    console.warn('[WAR] skipped: gamesPerTeam unresolved for season ' + seasonId);
    return null;
  }

  const participantIds = getParticipantIds(gameState);
  const playerPositions = await buildWarPlayerPositions(gameState, participantIds, leagueId);
  await calculateAndPersistSeasonWAR(seasonId, seasonGames, participantIds, playerPositions);
  return {
    seasonId,
    statsScopeId: seasonId,
  };
}

function getCompletedGameFranchiseId(
  gameState: PersistedGameState,
  archiveOptions?: CompletedGameArchiveOptions,
): string | null {
  const competitionType = archiveOptions?.context?.competitionType ?? gameState.competitionType;
  const competitionId = archiveOptions?.context?.competitionId ?? gameState.competitionId;
  return (
    archiveOptions?.context?.franchiseId ??
    gameState.franchiseId ??
    (competitionType === 'franchise' ? competitionId : null) ??
    null
  );
}

async function persistTrueValueAfterWar(
  gameState: PersistedGameState,
  warScope: PersistedWarScope,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<PersistedTrueValueScope | null> {
  const franchiseId = getCompletedGameFranchiseId(gameState, archiveOptions);
  if (!franchiseId) {
    console.warn('[TrueValue] skipped: franchiseId unresolved for completed game ' + gameState.gameId);
    return null;
  }
  if (!Number.isInteger(gameState.seasonNumber) || gameState.seasonNumber <= 0) {
    console.warn('[TrueValue] skipped: seasonNumber unresolved for completed game ' + gameState.gameId);
    return null;
  }

  // TV1 R-4: True Value recomputes immediately after successful WAR storage,
  // using the same season scope; WAR failures skip this path in processCompletedGame.
  const result = await calculateAndPersistFranchiseTrueValueForSeason({
    franchiseId,
    seasonId: warScope.seasonId,
    statsScopeId: warScope.statsScopeId,
    seasonNumber: gameState.seasonNumber,
  });
  if (!result.persisted) {
    console.warn('[Designations] skipped: True Value did not persist for completed game ' + gameState.gameId, result.blockers);
    return null;
  }
  return {
    franchiseId,
    seasonId: warScope.seasonId,
    statsScopeId: warScope.statsScopeId,
    seasonNumber: gameState.seasonNumber,
  };
}

async function persistProjectedDesignationsAfterTrueValue(
  gameState: PersistedGameState,
  trueValueScope: PersistedTrueValueScope,
): Promise<void> {
  // TV2 MODE_2_CANON §17 + R-4 extension: projected designations recompute
  // after True Value rows persist. Upstream WAR/True Value failure skips this.
  const result = await calculateAndPersistProjectedFranchiseDesignationsForSeason(trueValueScope);
  void result.designationEvents;
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
  options?: ProcessCompletedGameAggregationOptions,
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

    let warScope: PersistedWarScope | null = null;
    try {
      warScope = await persistSeasonWarAfterAggregation(gameState, options, archiveOptions, resolvedLeagueId ?? null);
    } catch (error) {
      console.warn('[WAR] failed to persist season WAR for completed game ' + gameState.gameId + ':', error);
    }
    if (warScope) {
      let trueValueScope: PersistedTrueValueScope | null = null;
      try {
        trueValueScope = await persistTrueValueAfterWar(gameState, warScope, archiveOptions);
      } catch (error) {
        console.warn('[TrueValue] failed to persist True Value for completed game ' + gameState.gameId + ':', error);
      }
      if (trueValueScope) {
        try {
          await persistProjectedDesignationsAfterTrueValue(gameState, trueValueScope);
        } catch (error) {
          console.warn('[Designations] failed to persist projected designations for completed game ' + gameState.gameId + ':', error);
        }
      }
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
