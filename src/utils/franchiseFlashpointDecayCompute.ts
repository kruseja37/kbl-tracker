/**
 * §13 tooth #2 / LS-19 — dark per-game flashpoint-decay compute.
 *
 * Mirrors franchiseFameCompute.ts: a per-game, DEFAULT-OFF, dark accumulator
 * wired into processCompletedGame. For each player currently "turned on" (a
 * locked Albatross, a trade-demander) who stays on the roster, accumulate a
 * compounding per-game fan-morale tax into the franchiseFlashpointDecay store.
 *
 * SEAM-NEUTRAL for trade-demanders until L10/L13: the "turned-on player"
 * source list is resolved by resolveTurnedOnPlayers(), which now reads active
 * or locked Albatross designation holders for each team in the completed game.
 * So even with the Phase-2 flashpoint flag ON, this writes NOTHING unless an
 * active/locked Albatross exists for the home/away team.
 *
 * L5b ONLY accumulates the tax artifact (decay-on-write running state). It does
 * NOT mutate any fan-morale snapshot — applying the accumulated tax to live fan
 * morale is a later L5/L7 tooth.
 */

import { computeFlashpointGameTax, type FlashpointKind } from '../engines/flashpointDecay';
import type { PersistedGameState } from './gameStorage';
import { getFranchiseDesignationRow } from './franchiseDesignationStorage';
import {
  getFranchiseFlashpointDecayRow,
  saveFranchiseFlashpointDecayRows,
  type FranchiseFlashpointDecayRow,
  type FranchiseFlashpointDecayScopeInput,
} from './franchiseFlashpointDecayStorage';
import { isFranchisePhase2FlashpointEnabled } from './franchisePhase2Flags';
import { getGame as getScheduledGame } from './scheduleStorage';

export interface CompletedGameArchiveOptions {
  context?: {
    scheduleGameId?: string;
  };
}

export type FlashpointScope = FranchiseFlashpointDecayScopeInput & {
  seasonNumber: number;
};

export type PersistDarkFlashpointDecayResult = {
  status: 'dark-noop' | 'written';
  written: number;
  reason?: string;
};

/** A player who is currently turned-on this game (the L7/L10/L13 seam). */
export interface TurnedOnPlayer {
  playerId: string;
  kind: Exclude<FlashpointKind, null>;
}

/**
 * SEAM: resolve the players currently "turned on" (a locked Albatross or a
 * trade-demander) for this scope/game. Albatross is resolved from the persisted
 * active|locked designation row; trade-demander stays empty until L10/L13 land.
 * Keep this the single explicit seam so L5b stays gated and mockable.
 *
 * Exposed on `flashpointSeam` so the per-game compute (and tests) call it
 * through one mockable indirection.
 */
export async function resolveTurnedOnPlayers(
  scope: FlashpointScope,
  gameState: PersistedGameState,
): Promise<TurnedOnPlayer[]> {
  const teamIds = Array.from(
    new Set(
      [gameState.homeTeamId, gameState.awayTeamId]
        .map((teamId) => teamId?.trim())
        .filter((teamId): teamId is string => Boolean(teamId)),
    ),
  );
  const turnedOnPlayers: TurnedOnPlayer[] = [];

  for (const teamId of teamIds) {
    const row = await getFranchiseDesignationRow({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
      teamId,
      type: 'ALBATROSS',
    });

    // AUTH-4 DEFAULTS-TAKEN: turned-on = a team's active|locked Albatross
    // holder, not 'projected'. The per-GAME tax applies to the completed
    // game's home+away Albatrosses; the active designation already implies
    // roster membership ("who stays"), so there is no extra lineup-presence
    // check here.
    if (row && (row.status === 'active' || row.status === 'locked') && row.playerId) {
      turnedOnPlayers.push({ playerId: row.playerId, kind: 'albatross' });
    }
  }

  // SEAM (still empty): L10/L13 trade-demander fills 'trade_demander'.
  return turnedOnPlayers;
}

/** Single indirection point so the seam is mockable from the compute path. */
export const flashpointSeam = {
  resolveTurnedOnPlayers,
};

export async function persistDarkFlashpointDecayForCompletedGame(
  gameState: PersistedGameState,
  scope: FlashpointScope,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<PersistDarkFlashpointDecayResult> {
  if (!isFranchisePhase2FlashpointEnabled()) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'Phase-2 flashpoint disabled; per-game flashpoint-decay not written.',
    };
  }

  const turnedOn = await flashpointSeam.resolveTurnedOnPlayers(scope, gameState);
  if (turnedOn.length === 0) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'No turned-on players (seam empty until L7/L10/L13); nothing accumulated.',
    };
  }

  const checkpoint = await resolveFlashpointCheckpoint(gameState, archiveOptions);
  const rows: FranchiseFlashpointDecayRow[] = [];

  for (const player of turnedOn) {
    const storedRow = await getFranchiseFlashpointDecayRow(scope, player.playerId);

    // Re-entry guard: this checkpoint already processed → no double-decay.
    if (storedRow?.updatedAtCheckpoint === checkpoint) {
      continue;
    }

    const priorGames = storedRow?.consecutiveGamesUnresolved ?? 0;
    const consecutiveGamesUnresolved = priorGames + 1;
    const taxResult = computeFlashpointGameTax({
      kind: player.kind,
      consecutiveGamesUnresolved,
    });
    const priorAccumulated = storedRow?.accumulatedFanMoraleTax ?? 0;

    rows.push({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
      playerId: player.playerId,
      flashpointKind: player.kind,
      consecutiveGamesUnresolved,
      accumulatedFanMoraleTax: priorAccumulated + taxResult.gameTax,
      lastGameTax: taxResult.gameTax,
      updatedAtCheckpoint: checkpoint,
    });
  }

  await saveFranchiseFlashpointDecayRows(rows);
  return { status: 'written', written: rows.length };
}

async function resolveFlashpointCheckpoint(
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
      // non-fatal: fall back to the completed game id (matches franchiseFameCompute)
    }
  }
  return gameState.gameId;
}
