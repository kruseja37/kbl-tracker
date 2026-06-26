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
import { getFranchiseConfig } from './franchiseManager';
import { getEffectivePlayer } from './playerOverrides';
import { getFranchisePlayer } from './franchisePlayerStorage';
import { registerAlmanacPlayers } from './registerAlmanacPlayers';
import { deriveAdaptiveStandardsConfig, type AdaptiveStandardsConfigInput } from './franchiseAdaptiveStandards';
import { getSeasonMetadata, saveSeasonMetadata } from './seasonStorage';
import {
  calculateAndPersistSeasonWAR,
  type WARParkFactorContext,
} from '../src_figma/app/engines/warOrchestrator';
import {
  calculateAndPersistFranchiseTrueValueForSeason,
  type FranchiseTrueValueRow,
} from './franchiseTrueValueStorage';
import {
  saveFranchiseTrueValueSnapshotRows,
  type FranchiseTrueValueSnapshotCheckpoint,
} from './franchiseTrueValueSnapshotsStorage';
import {
  calculateAndPersistProjectedFranchiseDesignationsForSeason,
  getFranchiseDesignationRow,
} from './franchiseDesignationStorage';
import { getGame as getScheduledGame } from './scheduleStorage';
import type { DesignationEvent, FranchiseDesignationType } from './franchiseDesignations';
import {
  composeMoraleConsequence,
  type ResolvedMoraleConsequence,
  type MasterMoraleEventType,
} from '../engines/masterMoraleMatrix';
import {
  applyFranchiseMoraleMatrixConsequence,
  getFranchiseMoraleSnapshot,
} from './franchiseMoraleState';
import { getFranchiseFameRecord } from './franchiseFameRecordsStorage';
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
  isFranchisePhase2StadiumRecordsEnabled,
} from './franchisePhase2Flags';
import {
  persistDarkFameRecordsForCompletedGame,
  type PersistDarkFameRecordsResult,
} from './franchiseFameCompute';
import { persistDarkFlashpointDecayForCompletedGame } from './franchiseFlashpointDecayCompute';
import { persistDarkCheckpointSweepForCompletedGame } from './franchiseCheckpointSweepCompute';
import { persistDarkTraitGrantForCompletedGame } from './franchiseTraitGrantCompute';
import { getFranchiseTradeDemandRowsByScope } from './franchiseTradeDemandStorage';
import { persistDarkRelationshipFormationForCompletedGame } from './franchiseRelationshipFormationCompute';
import { persistDarkRelationshipIntensityForCompletedGame } from './franchiseRelationshipIntensityCompute';
import { persistDarkRelationshipMoraleForCompletedGame } from './franchiseRelationshipMoraleCompute';
import { persistDarkL10ForCompletedGame } from './franchiseL10SweepCompute';
import { persistDarkL11AutoBackstopForCompletedGame } from './franchiseManagerAutoBackstop';
import { recomputeFranchiseL12StandingsForCompletedGame } from './franchiseRaceStandingsCompute';
import { persistFranchiseAllStarRosterForCompletedGame } from './franchiseAllStarRosterCompute';
import { persistDarkStadiumRecordsForCompletedGame } from './franchiseStadiumRecordsTap';
import { persistDarkHomeParkRivalForCompletedGame } from './franchiseHomeParkRivalTap';
import type { FranchiseStadiumRecordChange } from './franchiseStadiumRecordsStorage';
import type { HiddenModifiers } from '../types/game';
import { FAME_TUNING } from '../engines/fameModel';
import {
  applyDesignationSwingTilt,
  computeDesignationSteadyFanSentiment,
  computeFameVolume,
} from '../engines/designationFanMorale';
import {
  createGameMoraleEvent,
  type GameDate,
  type GameResult,
} from '../engines/fanMoraleEngine';
import { areRivals } from '../data/leagueStructure';

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
export type PersistedTrueValueScope = PersistedWarScope & {
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
  await calculateAndPersistSeasonWAR(
    seasonId,
    seasonGames,
    participantIds,
    playerPositions,
    buildWarParkFactorContext(gameState, archiveOptions),
  );
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

function buildWarParkFactorContext(
  gameState: PersistedGameState,
  archiveOptions?: CompletedGameArchiveOptions,
): WARParkFactorContext {
  return {
    franchiseId: getCompletedGameFranchiseId(gameState, archiveOptions),
    homeTeamId: gameState.homeTeamId,
    stadiumName: gameState.stadiumName ?? null,
    parkFactors: archiveOptions?.context?.parkFactors ?? gameState.parkFactors ?? null,
  };
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

type FameMoraleHeatDelta = PersistDarkFameRecordsResult['playerHeatDeltas'][number];

function sourceTeamIdForFameMorale(
  gameState: PersistedGameState,
  playerId: string,
  player: { leagueAssignments?: Array<{ teamId?: string; rosterStatus?: string }> } | null | undefined,
): string | null {
  return (
    gameState.playerWpaTotals?.find((total) => total.playerId === playerId)?.teamId ??
    gameState.fameEvents?.find((event) => event.playerId === playerId && event.teamId)?.teamId ??
    gameState.playerStats[playerId]?.teamId ??
    gameState.pitcherGameStats.find((stats) => stats.pitcherId === playerId)?.teamId ??
    player?.leagueAssignments?.find((assignment) =>
      assignment.rosterStatus !== 'FREE_AGENT' && Boolean(assignment.teamId),
    )?.teamId ??
    player?.leagueAssignments?.find((assignment) => Boolean(assignment.teamId))?.teamId ??
    null
  );
}

function fameMoraleSourceCheckpoint(
  gameState: PersistedGameState,
  archiveOptions?: CompletedGameArchiveOptions,
): string {
  return archiveOptions?.context?.scheduleGameId ?? gameState.scheduleGameId ?? gameState.gameId;
}

function fameMoraleSourceEventId(
  gameState: PersistedGameState,
  trueValueScope: PersistedTrueValueScope,
  playerId: string,
  archiveOptions?: CompletedGameArchiveOptions,
): string {
  return [
    'fame',
    trueValueScope.franchiseId,
    trueValueScope.seasonId,
    trueValueScope.statsScopeId,
    fameMoraleSourceCheckpoint(gameState, archiveOptions),
    playerId,
    'heat-delta',
  ].join(':');
}

export async function persistFameMoraleConsequencesAfterFame(
  gameState: PersistedGameState,
  trueValueScope: PersistedTrueValueScope,
  playerHeatDeltas: FameMoraleHeatDelta[],
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<void> {
  for (const { playerId, heatDelta } of playerHeatDeltas) {
    if (heatDelta === 0) continue;

    try {
      const player = await getFranchisePlayer(trueValueScope.franchiseId, playerId);
      const teamId = sourceTeamIdForFameMorale(gameState, playerId, player);
      if (!teamId) {
        console.warn('[MoraleMatrix] fame event skipped: missing team id for player ' + playerId);
        continue;
      }

      const currentPlayerMorale = await currentMoraleValue(trueValueScope, 'player', playerId, player?.morale ?? 50);
      const currentFanMorale = await currentMoraleValue(trueValueScope, 'team-fan', teamId, 50);
      const consequence = composeMoraleConsequence(
        { kind: 'fame', type: 'FAME_HEAT_CHANGED', heatDelta },
        player?.personality,
        resolveHiddenModifiers(player?.hiddenPersonalityModifiers),
        currentPlayerMorale,
        currentFanMorale,
      );

      await applyFranchiseMoraleMatrixConsequence({
        franchiseId: trueValueScope.franchiseId,
        seasonId: trueValueScope.seasonId,
        statsScopeId: trueValueScope.statsScopeId,
        seasonNumber: trueValueScope.seasonNumber,
        playerId,
        teamId,
        consequence,
        sourceEventId: fameMoraleSourceEventId(gameState, trueValueScope, playerId, archiveOptions),
        timestamp: String(gameState.savedAt ?? gameState.gameId),
      });
    } catch (error) {
      console.warn('[MoraleMatrix] fame event skipped:', error);
    }
  }
}

export type PersistDarkFanMoraleChannelResult = {
  status: 'dark-noop' | 'written';
  written: number;
  reason?: string;
};

async function resolveTradeDemandGameNumber(
  gameState: PersistedGameState,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<number | null> {
  const scheduleGameId = archiveOptions?.context?.scheduleGameId ?? gameState.scheduleGameId;
  if (!scheduleGameId) return null;

  try {
    const scheduledGame = await getScheduledGame(scheduleGameId);
    if (scheduledGame && Number.isInteger(scheduledGame.gameNumber) && scheduledGame.gameNumber > 0) {
      return scheduledGame.gameNumber;
    }
  } catch {
    // Non-fatal: unresolved schedule ids dark-noop instead of blocking game completion.
  }

  return null;
}

export async function persistDarkTradeDemandMoraleForCompletedGame(
  gameState: PersistedGameState,
  trueValueScope: PersistedTrueValueScope,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<PersistDarkFanMoraleChannelResult> {
  if (!isFranchisePhase2MoraleEnabled()) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'Phase-2 morale disabled; TRADE_DEMAND matrix consequence not written.',
    };
  }

  const thisGameNumber = await resolveTradeDemandGameNumber(gameState, archiveOptions);
  if (thisGameNumber == null) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'Unresolved league game number; cannot place a TRADE_DEMAND morale consequence.',
    };
  }

  const rows = await getFranchiseTradeDemandRowsByScope(trueValueScope);
  const newlyConfirmedRows = rows.filter(
    (row) => row.status === 'active' && row.confirmedAtGameNumber === thisGameNumber,
  );
  if (newlyConfirmedRows.length === 0) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'No newly confirmed trade-demand rows for this game.',
    };
  }

  let written = 0;
  for (const row of newlyConfirmedRows) {
    try {
      const player = await getFranchisePlayer(row.franchiseId, row.playerId);
      const currentPlayerMorale = await currentMoraleValue(row, 'player', row.playerId, player?.morale ?? 50);
      const currentFanMorale = await currentMoraleValue(row, 'team-fan', row.teamId, 50);
      const consequence = composeMoraleConsequence(
        { type: 'TRADE_DEMAND' },
        player?.personality,
        resolveHiddenModifiers(player?.hiddenPersonalityModifiers),
        currentPlayerMorale,
        currentFanMorale,
      );

      const result = await applyFranchiseMoraleMatrixConsequence({
        franchiseId: row.franchiseId,
        seasonId: row.seasonId,
        statsScopeId: row.statsScopeId,
        seasonNumber: trueValueScope.seasonNumber,
        playerId: row.playerId,
        teamId: row.teamId,
        consequence,
        sourceEventId: [
          'trade-demand',
          row.franchiseId,
          row.seasonId,
          row.statsScopeId,
          row.playerId,
          row.confirmedAtCheckpoint,
        ].join(':'),
        timestamp: row.confirmedAtIso,
      });
      if (result.applied.length > 0) {
        written += 1;
      }
    } catch (error) {
      console.warn('[MoraleMatrix] trade-demand event skipped:', error);
    }
  }

  return { status: 'written', written };
}

export async function persistDarkParkRecordMoraleForCompletedGame(
  gameState: PersistedGameState,
  scope: PersistedTrueValueScope,
  stadiumChanges: FranchiseStadiumRecordChange[],
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<void> {
  if (!isFranchisePhase2MoraleEnabled()) return;

  const config = await getFranchiseConfig(scope.franchiseId);
  if (!config) return;

  const checkpoint = fameMoraleSourceCheckpoint(gameState, archiveOptions);

  for (const change of stadiumChanges) {
    try {
      if (change.newLeaderPlayerIds.length !== 1) continue;
      const holderId = change.newLeaderPlayerIds[0];
      const homeTeamId = config.stadiums?.find((stadium) => stadium.stadiumId === change.stadiumId)?.teamId;
      if (!homeTeamId) continue;

      const player = await getFranchisePlayer(scope.franchiseId, holderId);
      const holderTeamId = sourceTeamIdForFameMorale(gameState, holderId, player);
      if (holderTeamId !== homeTeamId) continue;

      const currentPlayerMorale = await currentMoraleValue(scope, 'player', holderId, player?.morale ?? 50);
      const currentFanMorale = await currentMoraleValue(scope, 'team-fan', homeTeamId, 50);
      const consequence = composeMoraleConsequence(
        { type: 'PARK_RECORD_SET' },
        player?.personality,
        resolveHiddenModifiers(player?.hiddenPersonalityModifiers),
        currentPlayerMorale,
        currentFanMorale,
      );
      const sourceEventId = [
        'park-record-set',
        scope.franchiseId,
        scope.seasonId,
        scope.statsScopeId,
        checkpoint,
        change.stadiumId,
        change.recordType,
        change.recordKey,
        change.changeKind,
        holderId,
      ].join(':');

      await applyFranchiseMoraleMatrixConsequence({
        franchiseId: scope.franchiseId,
        seasonId: scope.seasonId,
        statsScopeId: scope.statsScopeId,
        seasonNumber: scope.seasonNumber,
        playerId: holderId,
        teamId: homeTeamId,
        consequence,
        sourceEventId,
        timestamp: String(gameState.savedAt ?? gameState.gameId),
      });
    } catch (error) {
      console.warn('[ParkRecordMorale] dark park-record morale skipped for completed game ' + gameState.gameId + ':', error);
    }
  }
}

const STORE_BACKED_DESIGNATION_TYPES: FranchiseDesignationType[] = [
  'TEAM_MVP',
  'ACE',
  'FAN_FAVORITE',
  'ALBATROSS',
];

function completedGameTeamIds(gameState: PersistedGameState): string[] {
  return Array.from(
    new Set(
      [gameState.homeTeamId, gameState.awayTeamId]
        .map((teamId) => teamId?.trim())
        .filter((teamId): teamId is string => Boolean(teamId)),
    ),
  );
}

async function resolveFanMoraleCheckpoint(
  gameState: PersistedGameState,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<string> {
  const scheduleGameId = archiveOptions?.context?.scheduleGameId ?? gameState.scheduleGameId;
  if (scheduleGameId) {
    try {
      const scheduledGame = await getScheduledGame(scheduleGameId);
      if (scheduledGame && Number.isInteger(scheduledGame.gameNumber) && scheduledGame.gameNumber > 0) {
        return String(scheduledGame.gameNumber);
      }
    } catch {
      // Non-fatal: fall back to the completed game id, matching the dark fame/flashpoint writers.
    }
  }
  return gameState.gameId;
}

function fanMoraleTimestamp(
  gameState: PersistedGameState,
  checkpoint: string,
): GameDate {
  const gameNumber = Number(checkpoint);
  return {
    season: gameState.seasonNumber,
    game: Number.isFinite(gameNumber) && gameNumber > 0 ? gameNumber : 0,
    date: String(gameState.savedAt ?? gameState.gameId),
  };
}

function deriveCompletedGameResultContext(
  gameState: PersistedGameState,
  leagueId: string | null,
): Map<string, { result: GameResult; rivalName?: string }> {
  const homeWon = gameState.homeScore > gameState.awayScore;
  const homeRunDiff = gameState.homeScore - gameState.awayScore;
  const isBlowout = Math.abs(homeRunDiff) >= 7;
  const isRivalMatchup = Boolean(
    leagueId && areRivals(leagueId, gameState.homeTeamId, gameState.awayTeamId),
  );

  let isNoHitter = false;
  let isShutout = false;
  for (const pStats of gameState.pitcherGameStats) {
    if (pStats.isStarter && pStats.outsRecorded >= 27) {
      if (pStats.hitsAllowed === 0 && pStats.runsAllowed === 0) {
        isNoHitter = true;
      }
      if (pStats.runsAllowed === 0) {
        isShutout = true;
      }
    }
  }

  const isWalkOff = homeWon && gameState.halfInning === 'BOTTOM';
  const context = new Map<string, { result: GameResult; rivalName?: string }>();

  context.set(gameState.homeTeamId, {
    result: {
      gameId: gameState.gameId,
      won: homeWon,
      isWalkOff,
      isNoHitter: isNoHitter && homeWon,
      isShutout: isShutout && homeWon,
      isBlowout,
      vsRival: isRivalMatchup,
      runDifferential: homeRunDiff,
      playerPerformances: [],
    },
    rivalName: isRivalMatchup ? gameState.awayTeamName : undefined,
  });

  context.set(gameState.awayTeamId, {
    result: {
      gameId: gameState.gameId,
      won: !homeWon,
      isWalkOff,
      isNoHitter: isNoHitter && !homeWon,
      isShutout: isShutout && !homeWon,
      isBlowout,
      vsRival: isRivalMatchup,
      runDifferential: -homeRunDiff,
      playerPerformances: [],
    },
    rivalName: isRivalMatchup ? gameState.homeTeamName : undefined,
  });

  return context;
}

function topWpaStandoutForTeam(
  gameState: PersistedGameState,
  teamId: string,
): NonNullable<PersistedGameState['playerWpaTotals']>[number] | null {
  let standout: NonNullable<PersistedGameState['playerWpaTotals']>[number] | null = null;
  for (const total of gameState.playerWpaTotals ?? []) {
    if (total.teamId !== teamId || !Number.isFinite(total.totalWpa)) continue;
    if (
      !standout ||
      total.totalWpa > standout.totalWpa ||
      (total.totalWpa === standout.totalWpa && total.playerId.localeCompare(standout.playerId) < 0)
    ) {
      standout = total;
    }
  }
  return standout;
}

function isHeldDesignationRow(
  row: Awaited<ReturnType<typeof getFranchiseDesignationRow>>,
  playerId?: string,
): row is NonNullable<Awaited<ReturnType<typeof getFranchiseDesignationRow>>> {
  if (!row || !row.playerId) return false;
  if (playerId && row.playerId !== playerId) return false;
  return row.status === 'active' || row.status === 'locked';
}

async function heldDesignationTypeForPlayer(
  scope: PersistedTrueValueScope,
  teamId: string,
  playerId: string,
): Promise<FranchiseDesignationType | null> {
  for (const type of STORE_BACKED_DESIGNATION_TYPES) {
    const row = await getFranchiseDesignationRow({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
      teamId,
      type,
    });
    if (isHeldDesignationRow(row, playerId)) {
      return type;
    }
  }
  return null;
}

async function fameVolumeForStandout(
  scope: PersistedTrueValueScope,
  playerId: string,
): Promise<number> {
  if (!isFranchisePhase2FameEnabled()) {
    return computeFameVolume(FAME_TUNING.heat.neutral);
  }

  const fameRecord = await getFranchiseFameRecord(scope, playerId);
  return computeFameVolume(fameRecord?.heat ?? FAME_TUNING.heat.neutral);
}

function clampProjectedMorale(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(99, Math.round(value)));
}

function teamFanOnlyConsequence(
  eventType: string,
  teamFanMoraleDelta: number,
  currentFanMorale: number,
  reason: string,
): ResolvedMoraleConsequence {
  return {
    eventType,
    personality: 'RELAXED',
    base: {
      selfPlayerMoraleDelta: 0,
      teamFanMoraleDelta,
      otherTouched: [],
      reason,
    },
    selfPlayerMoraleDelta: 0,
    teamFanMoraleDelta,
    fanMoraleToPlayerMoraleDelta: 0,
    totalPlayerMoraleDelta: 0,
    projectedPlayerMorale: 50,
    projectedFanMorale: clampProjectedMorale(currentFanMorale + teamFanMoraleDelta),
    otherTouched: [],
    reason,
    isNeutral: teamFanMoraleDelta === 0,
  };
}

export async function persistDarkChannelAFanMoraleForCompletedGame(
  gameState: PersistedGameState,
  trueValueScope: PersistedTrueValueScope,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<PersistDarkFanMoraleChannelResult> {
  if (!isFranchisePhase2MoraleEnabled()) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'Phase-2 morale disabled; §20.6 Channel A fan-morale swing not written.',
    };
  }

  const checkpoint = await resolveFanMoraleCheckpoint(gameState, archiveOptions);
  const leagueId = archiveOptions?.context?.leagueId ?? resolveExhibitionLeagueId(gameState) ?? null;
  const resultByTeam = deriveCompletedGameResultContext(gameState, leagueId);
  const timestamp = fanMoraleTimestamp(gameState, checkpoint);
  let written = 0;

  for (const teamId of completedGameTeamIds(gameState)) {
    const teamResult = resultByTeam.get(teamId);
    const standout = topWpaStandoutForTeam(gameState, teamId);
    if (!teamResult || !standout) continue;

    const moraleEvent = createGameMoraleEvent(teamResult.result, timestamp, teamResult.rivalName);
    const fameVolume = await fameVolumeForStandout(trueValueScope, standout.playerId);
    const designationType = await heldDesignationTypeForPlayer(trueValueScope, teamId, standout.playerId);
    const volumeSwing = moraleEvent.finalImpact * fameVolume;
    const amplified = designationType
      ? applyDesignationSwingTilt(designationType, volumeSwing)
      : volumeSwing;
    if (!Number.isFinite(amplified) || amplified === 0) continue;

    const currentFanMorale = await currentMoraleValue(trueValueScope, 'team-fan', teamId, 50);
    const consequence = teamFanOnlyConsequence(
      'FAN_MORALE_CHANNEL_A_GAME_SWING',
      amplified,
      currentFanMorale,
      `fan_morale.channel_a.${moraleEvent.type.toLowerCase()}`,
    );
    const result = await applyFranchiseMoraleMatrixConsequence({
      franchiseId: trueValueScope.franchiseId,
      seasonId: trueValueScope.seasonId,
      statsScopeId: trueValueScope.statsScopeId,
      seasonNumber: trueValueScope.seasonNumber,
      playerId: standout.playerId,
      teamId,
      consequence,
      sourceEventId: `channel-a-game-swing:${checkpoint}:${teamId}`,
      actorDisplayName: standout.playerName,
      timestamp: String(gameState.savedAt ?? gameState.gameId),
    });
    if (result.applied.length > 0) {
      written += 1;
    }
  }

  return { status: 'written', written };
}

export async function persistDarkChannelBSteadyFanMoraleForCompletedGame(
  gameState: PersistedGameState,
  trueValueScope: PersistedTrueValueScope,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<PersistDarkFanMoraleChannelResult> {
  if (!isFranchisePhase2MoraleEnabled()) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'Phase-2 morale disabled; §20.6 Channel B steady Fan Favorite warmth not written.',
    };
  }

  const checkpoint = await resolveFanMoraleCheckpoint(gameState, archiveOptions);
  let written = 0;

  for (const teamId of completedGameTeamIds(gameState)) {
    const row = await getFranchiseDesignationRow({
      franchiseId: trueValueScope.franchiseId,
      seasonId: trueValueScope.seasonId,
      statsScopeId: trueValueScope.statsScopeId,
      teamId,
      type: 'FAN_FAVORITE',
    });
    if (!isHeldDesignationRow(row)) continue;

    const sentiment = computeDesignationSteadyFanSentiment('FAN_FAVORITE').sentiment;
    if (!Number.isFinite(sentiment) || sentiment === 0) continue;

    const currentFanMorale = await currentMoraleValue(trueValueScope, 'team-fan', teamId, 50);
    const consequence = teamFanOnlyConsequence(
      'FAN_MORALE_CHANNEL_B_FAN_FAVORITE_STEADY',
      sentiment,
      currentFanMorale,
      'fan_morale.channel_b.fan_favorite_steady',
    );
    const result = await applyFranchiseMoraleMatrixConsequence({
      franchiseId: trueValueScope.franchiseId,
      seasonId: trueValueScope.seasonId,
      statsScopeId: trueValueScope.statsScopeId,
      seasonNumber: trueValueScope.seasonNumber,
      playerId: row.playerId,
      teamId,
      consequence,
      sourceEventId: `designation-steady-fan:${checkpoint}:${teamId}:FAN_FAVORITE`,
      actorDisplayName: row.playerName,
      timestamp: String(gameState.savedAt ?? gameState.gameId),
    });
    if (result.applied.length > 0) {
      written += 1;
    }
  }

  return { status: 'written', written };
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
        let stadiumChanges: FranchiseStadiumRecordChange[] = [];
        if (isFranchisePhase2StadiumRecordsEnabled()) {
          try {
            const stadiumResult = await persistDarkStadiumRecordsForCompletedGame(gameState, trueValueScope, archiveOptions);
            stadiumChanges = stadiumResult.changeList;
          } catch (e) {
            console.warn('[StadiumRecords] dark stadium-records detect tap skipped for completed game ' + gameState.gameId + ':', e);
          }
        }
        if (isFranchisePhase2StadiumRecordsEnabled()) {
          try {
            await persistDarkHomeParkRivalForCompletedGame(gameState, trueValueScope, archiveOptions);
          } catch (e) {
            console.warn('[HomeParkRival] dark home-park rival tap skipped for completed game ' + gameState.gameId + ':', e);
          }
        }
        if (isFranchisePhase2FameEnabled()) {
          try {
            const fameResult = await persistDarkFameRecordsForCompletedGame(gameState, trueValueScope, archiveOptions, stadiumChanges);
            await persistFameMoraleConsequencesAfterFame(
              gameState,
              trueValueScope,
              fameResult.playerHeatDeltas,
              archiveOptions,
            );
          } catch (e) {
            console.warn('[Fame] dark fame compute skipped for completed game ' + gameState.gameId + ':', e);
          }
        }
        if (isFranchisePhase2MoraleEnabled()) {
          try {
            await persistDarkParkRecordMoraleForCompletedGame(gameState, trueValueScope, stadiumChanges, archiveOptions);
          } catch (e) {
            console.warn('[ParkRecordMorale] dark park-record morale skipped for completed game ' + gameState.gameId + ':', e);
          }
        }
        if (isFranchisePhase2FlashpointEnabled()) {
          try {
            await persistDarkFlashpointDecayForCompletedGame(gameState, trueValueScope, archiveOptions);
          } catch (e) {
            console.warn('[Flashpoint] dark flashpoint-decay compute skipped for completed game ' + gameState.gameId + ':', e);
          }
        }
        try {
          await persistDarkChannelAFanMoraleForCompletedGame(gameState, trueValueScope, archiveOptions);
        } catch (e) {
          console.warn('[FanMorale] dark §20.6 Channel A game-swing write skipped for completed game ' + gameState.gameId + ':', e);
        }
        try {
          await persistDarkChannelBSteadyFanMoraleForCompletedGame(gameState, trueValueScope, archiveOptions);
        } catch (e) {
          console.warn('[FanMorale] dark §20.6 Channel B steady Fan Favorite write skipped for completed game ' + gameState.gameId + ':', e);
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
        try {
          await persistDarkTradeDemandMoraleForCompletedGame(gameState, trueValueScope, archiveOptions);
        } catch (e) {
          console.warn('[MoraleMatrix] dark trade-demand morale write skipped for completed game ' + gameState.gameId + ':', e);
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
