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
import { getFranchisePlayer } from './franchisePlayerStorage';
import { registerAlmanacPlayers } from './registerAlmanacPlayers';
import { deriveAdaptiveStandardsConfig, type AdaptiveStandardsConfigInput } from './franchiseAdaptiveStandards';
import { getSeasonMetadata, saveSeasonMetadata } from './seasonStorage';
import { calculateAndPersistSeasonWAR } from '../src_figma/app/engines/warOrchestrator';
import {
  calculateAndPersistFranchiseTrueValueForSeason,
  type FranchiseTrueValueRow,
} from './franchiseTrueValueStorage';
import {
  saveFranchiseTrueValueSnapshotRows,
  type FranchiseTrueValueSnapshotCheckpoint,
} from './franchiseTrueValueSnapshotsStorage';
import { calculateAndPersistProjectedFranchiseDesignationsForSeason } from './franchiseDesignationStorage';
import { getGame as getScheduledGame } from './scheduleStorage';
import type { DesignationEvent, FranchiseDesignationType } from './franchiseDesignations';
import {
  composeMoraleConsequence,
  type MasterMoraleEventType,
} from '../engines/masterMoraleMatrix';
import {
  applyFranchiseMoraleMatrixConsequence,
  getFranchiseMoraleSnapshot,
} from './franchiseMoraleState';
import {
  isFranchisePhase2FameEnabled,
  isFranchisePhase2CheckpointEnabled,
  isFranchisePhase2FlashpointEnabled,
  isFranchisePhase2MoraleEnabled,
  isFranchisePhase2TraitsEnabled,
  isFranchisePhase2L10Enabled,
  isFranchisePhase2L11Enabled,
  isFranchisePhase2L12Enabled,
  isFranchisePhase2L13Enabled,
} from './franchisePhase2Flags';
import { persistDarkFameRecordsForCompletedGame } from './franchiseFameCompute';
import { persistDarkFlashpointDecayForCompletedGame } from './franchiseFlashpointDecayCompute';
import { persistDarkCheckpointSweepForCompletedGame } from './franchiseCheckpointSweepCompute';
import { persistDarkTraitGrantForCompletedGame } from './franchiseTraitGrantCompute';
import { persistDarkRelationshipFormationForCompletedGame } from './franchiseRelationshipFormationCompute';
import { persistDarkRelationshipIntensityForCompletedGame } from './franchiseRelationshipIntensityCompute';
import { persistDarkRelationshipMoraleForCompletedGame } from './franchiseRelationshipMoraleCompute';
import { persistDarkL10ForCompletedGame } from './franchiseL10SweepCompute';
import { persistDarkL11AutoBackstopForCompletedGame } from './franchiseManagerAutoBackstop';
import { recomputeFranchiseL12StandingsForCompletedGame } from './franchiseRaceStandingsCompute';
import { persistFranchiseAllStarRosterForCompletedGame } from './franchiseAllStarRosterCompute';
import type { HiddenModifiers } from '../types/game';

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
type PersistedTrueValueResult = PersistedTrueValueScope & {
  rows: FranchiseTrueValueRow[];
};

const NEUTRAL_HIDDEN_MODIFIERS: HiddenModifiers = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
  charisma: 50,
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
): Promise<PersistedTrueValueResult | null> {
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
    rows: result.rows,
  };
}

async function resolveTrueValueSnapshotCheckpoint(
  gameState: PersistedGameState,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<FranchiseTrueValueSnapshotCheckpoint> {
  const scheduleGameId = archiveOptions?.context?.scheduleGameId ?? gameState.scheduleGameId;
  if (scheduleGameId) {
    try {
      const scheduledGame = await getScheduledGame(scheduleGameId);
      if (scheduledGame && Number.isInteger(scheduledGame.gameNumber) && scheduledGame.gameNumber > 0) {
        return scheduledGame.gameNumber;
      }
    } catch {
      // Fall back to the completed game id; snapshot persistence has its own non-fatal warning path.
    }
  }
  return gameState.gameId;
}

async function persistTrueValueSnapshotsForCompletedGame(
  gameState: PersistedGameState,
  trueValueResult: PersistedTrueValueResult,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<void> {
  const checkpoint = await resolveTrueValueSnapshotCheckpoint(gameState, archiveOptions);
  await saveFranchiseTrueValueSnapshotRows(
    trueValueResult.rows.map((row) => ({
      franchiseId: trueValueResult.franchiseId,
      seasonId: trueValueResult.seasonId,
      statsScopeId: trueValueResult.statsScopeId,
      playerId: row.playerId,
      checkpoint,
      trueValue: row.trueValue,
      valueDelta: row.valueDelta,
      warPercentile: row.warPercentile,
      computedAt: row.computedAt,
    })),
  );
}

async function persistProjectedDesignationsAfterTrueValue(
  gameState: PersistedGameState,
  trueValueScope: PersistedTrueValueScope,
): Promise<void> {
  // TV2 MODE_2_CANON §17 + R-4 extension: projected designations recompute
  // after True Value rows persist. Upstream WAR/True Value failure skips this.
  const result = await calculateAndPersistProjectedFranchiseDesignationsForSeason(trueValueScope);
  await persistDesignationMoraleConsequencesAfterTrueValue(result.designationEvents, trueValueScope);
}

function designationEventToMoraleEvent(
  event: DesignationEvent,
): MasterMoraleEventType | null {
  if (event.transition === 'lost') {
    return null;
  }

  const designationTypeToMoraleEvent: Partial<Record<FranchiseDesignationType, MasterMoraleEventType>> = {
    TEAM_MVP: 'TEAMMATE_AWARD',
    ACE: 'TEAMMATE_AWARD',
    FAN_FAVORITE: 'FAN_FAVORITE_LOCKED',
    ALBATROSS: 'ALBATROSS_LOCKED',
  };

  return designationTypeToMoraleEvent[event.designationType] ?? null;
}

function resolveHiddenModifiers(modifiers: Partial<HiddenModifiers> | null | undefined): HiddenModifiers {
  return {
    loyalty: Number.isFinite(modifiers?.loyalty) ? Number(modifiers?.loyalty) : NEUTRAL_HIDDEN_MODIFIERS.loyalty,
    ambition: Number.isFinite(modifiers?.ambition) ? Number(modifiers?.ambition) : NEUTRAL_HIDDEN_MODIFIERS.ambition,
    resilience: Number.isFinite(modifiers?.resilience) ? Number(modifiers?.resilience) : NEUTRAL_HIDDEN_MODIFIERS.resilience,
    charisma: Number.isFinite(modifiers?.charisma) ? Number(modifiers?.charisma) : NEUTRAL_HIDDEN_MODIFIERS.charisma,
  };
}

async function currentMoraleValue(
  scope: Pick<PersistedTrueValueScope, 'franchiseId' | 'seasonId' | 'statsScopeId'>,
  targetType: 'player' | 'team-fan',
  targetId: string,
  fallback: number,
): Promise<number> {
  const snapshot = await getFranchiseMoraleSnapshot(scope, targetType, targetId);
  return snapshot?.currentValue ?? fallback;
}

async function persistDesignationMoraleConsequencesAfterTrueValue(
  designationEvents: DesignationEvent[],
  trueValueScope: PersistedTrueValueScope,
): Promise<void> {
  if (!isFranchisePhase2MoraleEnabled() || designationEvents.length === 0) return;

  for (const event of designationEvents) {
    const moraleEventType = designationEventToMoraleEvent(event);
    if (!moraleEventType) continue;

    try {
      const player = await getFranchisePlayer(event.franchiseId, event.playerId);
      const currentPlayerMorale = await currentMoraleValue(event, 'player', event.playerId, player?.morale ?? 50);
      const currentFanMorale = await currentMoraleValue(event, 'team-fan', event.teamId, 50);
      const consequence = composeMoraleConsequence(
        { type: moraleEventType },
        player?.personality,
        resolveHiddenModifiers(player?.hiddenPersonalityModifiers),
        currentPlayerMorale,
        currentFanMorale,
      );

      await applyFranchiseMoraleMatrixConsequence({
        franchiseId: event.franchiseId,
        seasonId: event.seasonId,
        statsScopeId: event.statsScopeId,
        seasonNumber: trueValueScope.seasonNumber,
        playerId: event.playerId,
        teamId: event.teamId,
        consequence,
        sourceEventId: [
          'designation',
          event.franchiseId,
          event.seasonId,
          event.statsScopeId,
          event.teamId,
          event.designationType,
          event.transition,
          event.playerId,
          event.previousPlayerId ?? 'none',
          event.calculatedAt,
        ].join(':'),
        timestamp: event.calculatedAt,
      });
    } catch (error) {
      console.warn('[MoraleMatrix] designation event skipped:', error);
    }
  }
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
      let trueValueScope: PersistedTrueValueResult | null = null;
      try {
        trueValueScope = await persistTrueValueAfterWar(gameState, warScope, archiveOptions);
      } catch (error) {
        console.warn('[TrueValue] failed to persist True Value for completed game ' + gameState.gameId + ':', error);
      }
      if (trueValueScope) {
        try {
          await persistTrueValueSnapshotsForCompletedGame(gameState, trueValueScope, archiveOptions);
        } catch (error) {
          console.warn('[TrueValueSnapshots] failed to persist True Value snapshots for completed game ' + gameState.gameId + ':', error);
        }
        if (isFranchisePhase2FameEnabled()) {
          try {
            await persistDarkFameRecordsForCompletedGame(gameState, trueValueScope, archiveOptions);
          } catch (e) {
            console.warn('[Fame] dark fame compute skipped for completed game ' + gameState.gameId + ':', e);
          }
        }
        if (isFranchisePhase2FlashpointEnabled()) {
          try {
            await persistDarkFlashpointDecayForCompletedGame(gameState, trueValueScope, archiveOptions);
          } catch (e) {
            console.warn('[Flashpoint] dark flashpoint-decay compute skipped for completed game ' + gameState.gameId + ':', e);
          }
        }
        if (isFranchisePhase2CheckpointEnabled()) {
          try {
            await persistDarkCheckpointSweepForCompletedGame(gameState, trueValueScope, archiveOptions);
          } catch (e) {
            console.warn('[Checkpoint] dark ratings-development checkpoint sweep skipped for completed game ' + gameState.gameId + ':', e);
          }
        }
        if (isFranchisePhase2TraitsEnabled()) {
          try {
            await persistDarkTraitGrantForCompletedGame(gameState, trueValueScope, archiveOptions);
          } catch (e) {
            console.warn('[Traits] dark trait-grant compute skipped for completed game ' + gameState.gameId + ':', e);
          }
        }
        if (isFranchisePhase2L13Enabled()) {
          try {
            await persistDarkRelationshipFormationForCompletedGame(gameState, trueValueScope, archiveOptions);
          } catch (e) {
            console.warn('[L13] dark relationship formation skipped for completed game ' + gameState.gameId + ':', e);
          }
          try {
            await persistDarkRelationshipIntensityForCompletedGame(gameState, trueValueScope, archiveOptions);
          } catch (e) {
            console.warn('[L13] dark relationship intensity skipped for completed game ' + gameState.gameId + ':', e);
          }
          try {
            await persistDarkRelationshipMoraleForCompletedGame(gameState, trueValueScope, archiveOptions);
          } catch (e) {
            console.warn('[L13] dark relationship morale skipped for completed game ' + gameState.gameId + ':', e);
          }
        }
        if (isFranchisePhase2L10Enabled()) {
          try {
            await persistDarkL10ForCompletedGame(gameState, trueValueScope, archiveOptions);
          } catch (e) {
            console.warn('[L10] dark random-event sweep skipped for completed game ' + gameState.gameId + ':', e);
          }
        }
        if (isFranchisePhase2L11Enabled()) {
          try {
            await persistDarkL11AutoBackstopForCompletedGame(gameState, trueValueScope, archiveOptions);
          } catch (e) {
            console.warn('[L11] auto-backstop dark compute failed', e);
          }
        }
        if (isFranchisePhase2L12Enabled()) {
          try {
            await recomputeFranchiseL12StandingsForCompletedGame(gameState, trueValueScope, archiveOptions);
          } catch (e) {
            console.warn('[L12] dark race-standing recompute skipped for completed game ' + gameState.gameId + ':', e);
          }
          try {
            await persistFranchiseAllStarRosterForCompletedGame(gameState, trueValueScope, archiveOptions);
          } catch (e) {
            console.warn('[L12] dark All-Star roster persist skipped for completed game ' + gameState.gameId + ':', e);
          }
        }
        try {
          const designationScope: PersistedTrueValueScope = {
            franchiseId: trueValueScope.franchiseId,
            seasonId: trueValueScope.seasonId,
            statsScopeId: trueValueScope.statsScopeId,
            seasonNumber: trueValueScope.seasonNumber,
          };
          await persistProjectedDesignationsAfterTrueValue(gameState, designationScope);
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
