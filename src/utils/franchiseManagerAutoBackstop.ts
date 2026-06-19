/**
 * L11-3b — dark per-game manager auto-backstop trigger.
 *
 * Mirrors the L10 completed-game hook shape: flag-gate first, resolve the
 * scheduled game number and persisted event timestamp, then check only the two
 * completed-game teams. The payroll-band managerFireProbability refinement is
 * intentionally deferred because team-payroll ranking is not available at this
 * seam; v1 uses the conservative flat §16 per-game probability.
 */

import type { PersistedGameState } from './gameStorage';
import {
  getGameEvents,
  getSeasonGames,
  type GameHeader,
} from './eventLog';
import { getAllFranchiseTeams } from './franchisePlayerStorage';
import {
  getFranchiseMoraleSnapshot,
  type FranchiseMoraleScope,
} from './franchiseMoraleState';
import { isFranchisePhase2L11Enabled } from './franchisePhase2Flags';
import { getGame as getScheduledGame } from './scheduleStorage';
import {
  fireManager,
  type FireManagerParams,
  type FireManagerResult,
} from './franchiseManagerFiring';
import { LEAGUE_BUILDER_MANAGER_INSTANCE_ID } from './managerIdentityStorage';
import type { CompletedGameArchiveOptions } from './franchiseCheckpointSweepCompute';

export const L11_AUTO_BACKSTOP_TUNING = {
  armingThreshold: 25,
  perGameProbability: 0.004,
} as const;

export type L11AutoBackstopScope = FranchiseMoraleScope;

export type PersistDarkL11AutoBackstopResult = {
  status: 'dark-noop' | 'checked';
  fired: number;
  checked: number;
  reason?: string;
};

type LeagueAndInstance = {
  leagueId: string;
  instanceId: string;
};

async function resolveLeagueAndInstance(scope: L11AutoBackstopScope): Promise<LeagueAndInstance | null> {
  const leagueId = (await getAllFranchiseTeams(scope.franchiseId))[0]?.leagueIds?.[0];
  if (!leagueId) return null;

  // Franchise manager assignments are keyed by [mode='franchise', instanceId=LEAGUE_BUILDER_MANAGER_INSTANCE_ID, teamId].
  return {
    leagueId,
    instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
  };
}

async function getTeamFanMorale(scope: L11AutoBackstopScope, teamId: string): Promise<number> {
  const snapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', teamId);
  return snapshot?.currentValue ?? 50;
}

function hashStringToUint32(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rollManagerBackstop(seed: string): number {
  return hashStringToUint32(seed) / 0x100000000;
}

async function callFireManager(params: FireManagerParams): Promise<FireManagerResult> {
  return fireManager(params);
}

export const autoBackstopSeam = {
  resolveLeagueAndInstance,
  getTeamFanMorale,
  rollManagerBackstop,
  fireManager: callFireManager,
};

export async function persistDarkL11AutoBackstopForCompletedGame(
  gameState: PersistedGameState,
  scope: L11AutoBackstopScope,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<PersistDarkL11AutoBackstopResult> {
  if (!isFranchisePhase2L11Enabled()) {
    return {
      status: 'dark-noop',
      fired: 0,
      checked: 0,
      reason: 'Phase-2 L11 disabled.',
    };
  }

  const gameNumber = await resolveL11GameNumber(gameState, archiveOptions);
  if (gameNumber == null) {
    return {
      status: 'dark-noop',
      fired: 0,
      checked: 0,
      reason: 'Unresolved league game number; cannot place an L11 auto-backstop roll.',
    };
  }

  const createdAt = await resolveCreatedAtIso(scope.seasonId, gameState);
  if (!createdAt) {
    return {
      status: 'dark-noop',
      fired: 0,
      checked: 0,
      reason: 'No persisted event/header timestamp; cannot timestamp L11 manager firing.',
    };
  }

  const resolved = await autoBackstopSeam.resolveLeagueAndInstance(scope);
  if (!resolved) {
    return {
      status: 'dark-noop',
      fired: 0,
      checked: 0,
      reason: 'Unresolved leagueId/instanceId; cannot fire manager from L11 auto-backstop.',
    };
  }

  const teamIds = getCompletedGameTeamIds(gameState);
  if (teamIds.length === 0) {
    return {
      status: 'dark-noop',
      fired: 0,
      checked: 0,
      reason: 'No completed-game teams to check for L11 auto-backstop.',
    };
  }

  let fired = 0;
  let checked = 0;

  for (const teamId of teamIds) {
    checked += 1;
    const morale = await autoBackstopSeam.getTeamFanMorale(scope, teamId);
    if (morale >= L11_AUTO_BACKSTOP_TUNING.armingThreshold) continue;

    const seed = `${scope.franchiseId}:${scope.seasonId}:${gameNumber}:${teamId}:manager-backstop`;
    const roll = autoBackstopSeam.rollManagerBackstop(seed);
    if (roll >= L11_AUTO_BACKSTOP_TUNING.perGameProbability) continue;

    try {
      const result = await autoBackstopSeam.fireManager({
        ...scope,
        leagueId: resolved.leagueId,
        teamId,
        mode: 'franchise',
        instanceId: resolved.instanceId,
        reason: 'auto-backstop',
        endDate: createdAt,
      });
      if (result.status === 'fired') fired += 1;
    } catch (error) {
      console.warn(`[L11] auto-backstop manager firing skipped for team ${teamId}:`, error);
    }
  }

  return { status: 'checked', fired, checked };
}

async function resolveL11GameNumber(
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
    // non-fatal: unresolved schedule ids dark-noop instead of blocking game completion
  }

  return null;
}

async function resolveCreatedAtIso(
  seasonId: string,
  gameState: PersistedGameState,
): Promise<string | null> {
  const games = await getSeasonGames(seasonId);
  const eventLists = await Promise.all(games.map((game) => getGameEvents(game.gameId)));
  const atBatEvents = eventLists.flat();

  const maxAtBatTimestamp = atBatEvents.reduce<number | null>((max, event) => {
    if (!Number.isFinite(event.timestamp)) return max;
    return max == null ? event.timestamp : Math.max(max, event.timestamp);
  }, null);
  const timestamp = maxAtBatTimestamp ?? resolveHeaderTimestamp(games, gameState);
  return timestamp == null ? null : new Date(timestamp).toISOString();
}

function resolveHeaderTimestamp(
  games: readonly GameHeader[],
  gameState: PersistedGameState,
): number | null {
  const matchingHeader = games.find((game) => game.gameId === gameState.gameId);
  if (matchingHeader && Number.isFinite(matchingHeader.date)) {
    return matchingHeader.date;
  }

  return games.reduce<number | null>((max, game) => {
    if (!Number.isFinite(game.date)) return max;
    return max == null ? game.date : Math.max(max, game.date);
  }, null);
}

function getCompletedGameTeamIds(gameState: PersistedGameState): string[] {
  return Array.from(
    new Set([gameState.homeTeamId, gameState.awayTeamId].filter((teamId) => teamId.trim())),
  );
}
