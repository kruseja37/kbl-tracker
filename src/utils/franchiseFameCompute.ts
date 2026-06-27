import {
  aggregateChannelFame,
  aggregateDefensiveFame,
  aggregateRolePlayerFame,
  applyHonorHeatBump,
  applyHeatUpdate,
  FAME_TUNING,
  type ChannelTaggedFameInput,
  type FameAttributionChannel,
} from '../engines/fameModel';
import type { PersistedGameState } from './gameStorage';
import {
  getFranchiseFameRecord,
  saveFranchiseFameRecordRows,
  type FranchiseFameRecordRow,
  type FranchiseFameRecordsScopeInput,
} from './franchiseFameRecordsStorage';
import { buildStadiumRecordFameHeatBumps } from './franchiseStadiumRecordFame';
import type { FranchiseStadiumRecordChange } from './franchiseStadiumRecordsStorage';
import { isFranchisePhase2FameEnabled } from './franchisePhase2Flags';
import { getGame as getScheduledGame } from './scheduleStorage';

export interface CompletedGameArchiveOptions {
  context?: {
    scheduleGameId?: string;
  };
}

export type PersistedTrueValueResult = FranchiseFameRecordsScopeInput & {
  seasonNumber: number;
  rows: unknown[];
};

export type PersistDarkFameRecordsResult = {
  status: 'dark-noop' | 'written';
  written: number;
  playerHeatDeltas: Array<{ playerId: string; heatDelta: number }>;
  reason?: string;
};

type FameEventRecord = PersistedGameState['fameEvents'][number];
type PlayerWpaTotal = NonNullable<PersistedGameState['playerWpaTotals']>[number];

// §20.9 SIM-TUNE: placeholder bridge from KBL-WPA units to Fame Heat input.
const FAME_INPUT_TUNING = {
  wpaToHeatScale: 10,
} as const;

const DEFENSIVE_FAME_EVENT_TYPES = new Set<string>([
  'WEB_GEM',
  'ROBBERY',
  'ROBBERY_GRAND_SLAM',
  'THROW_OUT_AT_HOME',
  'TRIPLE_PLAY',
  'UNASSISTED_TRIPLE_PLAY',
  'DROPPED_FLY',
  'DROPPED_FLY_CLUTCH',
  'BOOTED_GROUNDER',
  'WRONG_BASE_THROW',
  'PASSED_BALL_RUN',
  'PASSED_BALL_WINNING_RUN',
  'FAILED_ROBBERY',
  'SEASON_20_ERRORS',
  'CAREER_ERRORS_TIER',
  'CAREER_PASSED_BALLS_TIER',
]);

const ROLE_PLAYER_FAME_EVENT_TYPES = new Set<string>([
  'PINCH_HIT_HR',
  'PP_CLEAN_INNING',
  'PP_MULTIPLE_CLEAN',
  'PP_GOT_K',
  'PP_GAVE_UP_RUNS',
]);

export async function persistDarkFameRecordsForCompletedGame(
  gameState: PersistedGameState,
  fameScope: PersistedTrueValueResult,
  archiveOptions?: CompletedGameArchiveOptions,
  stadiumChanges: FranchiseStadiumRecordChange[] = [],
): Promise<PersistDarkFameRecordsResult> {
  if (!isFranchisePhase2FameEnabled()) {
    return {
      status: 'dark-noop',
      written: 0,
      playerHeatDeltas: [],
      reason: 'Phase-2 fame disabled; per-game fame compute not written.',
    };
  }

  const checkpoint = await resolveFameCheckpoint(gameState, archiveOptions);
  const playerTotals = gameState.playerWpaTotals ?? [];
  const fameEvents = gameState.fameEvents ?? [];
  const playerIds = activeFamePlayerIds(playerTotals, fameEvents);
  const rows: FranchiseFameRecordRow[] = [];
  const playerHeatDeltas: Array<{ playerId: string; heatDelta: number }> = [];
  const bumpByPlayer = new Map<string, number>(
    buildStadiumRecordFameHeatBumps(stadiumChanges).map((bump) => [bump.playerId, bump.heatDelta]),
  );

  for (const playerId of playerIds) {
    const storedRow = await getFranchiseFameRecord(fameScope, playerId);
    if (storedRow?.updatedAtCheckpoint === checkpoint) {
      continue;
    }

    const inputs = buildPlayerFameInputs(
      playerId,
      playerTotals.find((total) => total.playerId === playerId),
      fameEvents.filter((event) => event.playerId === playerId),
    );
    const breakdown = aggregateChannelFame(inputs);
    const stored = storedRow ?? { heat: 0, reachFloor: 0, wasNegative: false };
    let heat = applyHeatUpdate(stored.heat, breakdown.total);
    const bump = bumpByPlayer.get(playerId);
    if (bump !== undefined) {
      heat = applyHonorHeatBump(heat, bump);
      bumpByPlayer.delete(playerId);
    }
    const reachFloor = stored.reachFloor;
    const heatDelta = heat - stored.heat;
    const wasNegative = stored.wasNegative || heat < FAME_TUNING.heat.neutral;
    playerHeatDeltas.push({ playerId, heatDelta });

    rows.push({
      franchiseId: fameScope.franchiseId,
      seasonId: fameScope.seasonId,
      statsScopeId: fameScope.statsScopeId,
      playerId,
      heat,
      reachFloor,
      wasNegative,
      channelTotal: breakdown.total,
      channelByChannel: breakdown.byChannel,
      defensiveFame: aggregateDefensiveFame(inputs),
      rolePlayerFame: aggregateRolePlayerFame(inputs),
      updatedAtCheckpoint: checkpoint,
    });
  }

  for (const [playerId, bump] of bumpByPlayer.entries()) {
    const storedRow = await getFranchiseFameRecord(fameScope, playerId);
    const stored = storedRow ?? { heat: 0, reachFloor: 0, wasNegative: false };
    const heat = applyHonorHeatBump(stored.heat, bump);
    const heatDelta = heat - stored.heat;
    if (heatDelta === 0) continue;

    const wasNegative = stored.wasNegative || heat < FAME_TUNING.heat.neutral;
    playerHeatDeltas.push({ playerId, heatDelta });

    if (storedRow) {
      rows.push({
        ...storedRow,
        heat,
        wasNegative,
      });
      continue;
    }

    rows.push({
      franchiseId: fameScope.franchiseId,
      seasonId: fameScope.seasonId,
      statsScopeId: fameScope.statsScopeId,
      playerId,
      heat,
      reachFloor: 0,
      wasNegative,
      channelTotal: 0,
      channelByChannel: aggregateChannelFame([]).byChannel,
      defensiveFame: 0,
      rolePlayerFame: 0,
      updatedAtCheckpoint: checkpoint,
    });
  }

  await saveFranchiseFameRecordRows(rows);
  return { status: 'written', written: rows.length, playerHeatDeltas };
}

async function resolveFameCheckpoint(
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
      // non-fatal: fall back to the completed game id (matches D9d-1)
    }
  }
  return gameState.gameId;
}

function activeFamePlayerIds(
  playerTotals: readonly PlayerWpaTotal[],
  fameEvents: readonly FameEventRecord[],
): string[] {
  return Array.from(new Set([
    ...playerTotals.map((total) => total.playerId),
    ...fameEvents.map((event) => event.playerId),
  ])).filter(Boolean).sort();
}

function buildPlayerFameInputs(
  playerId: string,
  playerTotal: PlayerWpaTotal | undefined,
  playerEvents: FameEventRecord[],
): ChannelTaggedFameInput[] {
  const inputs: ChannelTaggedFameInput[] = [];

  if (playerTotal && Number.isFinite(playerTotal.totalWpa)) {
    inputs.push({
      channel: 'wpa_spine',
      fame: playerTotal.totalWpa * FAME_INPUT_TUNING.wpaToHeatScale,
    });
  }

  for (const event of playerEvents) {
    if (event.playerId !== playerId || !Number.isFinite(event.fameValue)) continue;
    inputs.push({
      channel: channelForFameEventType(event.eventType),
      fame: event.fameValue,
    });
  }

  return inputs;
}

function channelForFameEventType(eventType: string): FameAttributionChannel {
  if (DEFENSIVE_FAME_EVENT_TYPES.has(eventType)) return 'defensive';
  if (ROLE_PLAYER_FAME_EVENT_TYPES.has(eventType)) return 'role_player';
  return 'iconic_event';
}
