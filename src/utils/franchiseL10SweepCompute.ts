/**
 * L10-3 — dark random-event (light-chaos) league-sweep hook.
 *
 * Wires the L10-1 pure event-selection engine (`computeFranchiseL10Events`) to
 * the L10-2 dark store (`franchiseL10Overlays`). Mirrors the L9b-3b-ii
 * trait-grant hook shape EXACTLY: flag-gate first, resolve the league game
 * number, gate on the 20%-of-season checkpoint boundary, enumerate the league
 * MLB roster + per-team fan morale, build L10 candidates (players + teams),
 * roll the deterministic sweep, then write pending overlay rows.
 *
 * Doubly-dark by default: the default-OFF Phase-2 L10 flag guards the whole
 * compute (normal play is a zero-cost no-op — no loads), and every written
 * overlay row is `pending` + `applied:false`, so it is inert until a post-D13
 * confirm/apply step promotes it.
 *
 * DEFAULTS-TAKEN (spec-docs/L10_SCOPE_MAP.md §4/§7):
 * - single-cadence collapse: L10 fires at the existing 20% checkpoint boundary,
 *   reusing the L8/L9 cadence gate (`isCheckpointBoundary`).
 * - intensity dial = 'standard' (no franchise intensity setting is wired yet).
 * - seedBase = `${franchiseId}:${seasonId}:${gameNumber}` (reproducible sweep).
 * - candidates = the league MLB roster (player candidates) + each distinct team
 *   (team candidates). Team candidates carry per-team fan morale so the engine
 *   can suppress team/stadium events when fans are happy.
 * - performanceSignal = True Value `valueDelta` normalized via the L8b checkpoint
 *   tuning; players with no True Value row contribute no performance signal.
 * - fan-morale fallback = 50 (dark-safe and neutral when the morale store is
 *   empty under the default-OFF morale flag).
 * - createdAt is derived from the max persisted at-bat timestamp / header date,
 *   never wall-clock time.
 *
 * Determinism: no runtime randomness, caller timestamps, or direct IndexedDB opens.
 */

import {
  computeFranchiseL10Events,
  type FranchiseL10Candidate,
  type FranchiseL10EventReport,
} from '../engines/franchiseL10EventEngine';
import {
  normalizePerformanceSignal,
  RATINGS_DEVELOPMENT_TUNING,
  type RatingsDevelopmentTuning,
} from '../engines/ratingsDevelopment';
import { normalizePersonality } from '../engines/masterMoraleMatrix';
import type { TierKey } from '../data/tierParams';
import type { PersistedGameState } from './gameStorage';
import {
  getSeasonGames,
  getGameEvents,
  type GameHeader,
} from './eventLog';
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
} from './franchisePlayerStorage';
import {
  getPlayerRosterStatusForLeague,
  getPlayerTeamIdForLeague,
  type Player,
} from './leagueBuilderStorage';
import { getFranchiseTrueValueRows } from './franchiseTrueValueStorage';
import { getFranchiseMoraleSnapshot } from './franchiseMoraleState';
import {
  isCheckpointBoundary,
  type CompletedGameArchiveOptions,
} from './franchiseCheckpointSweepCompute';
import {
  putFranchiseL10Overlay,
  type FranchiseL10OverlayRow,
  type FranchiseL10OverlayScopeInput,
} from './franchiseL10OverlayStorage';
import { isFranchisePhase2L10Enabled } from './franchisePhase2Flags';
import { getSeasonMetadata } from './seasonStorage';
import { getGame as getScheduledGame } from './scheduleStorage';

// §16 placeholder: mirror the L8b checkpoint tuning so the performance signal
// scale matches the True Value `valueDelta` magnitude (signed dollars).
const L10_PERFORMANCE_SIGNAL_TUNING: RatingsDevelopmentTuning = {
  ...RATINGS_DEVELOPMENT_TUNING,
  performanceSignalScale: 200000,
};

// Default intensity dial — no franchise intensity setting is wired in v1.
const DEFAULT_L10_INTENSITY: TierKey = 'standard';

const PITCHER_POSITIONS = new Set(['SP', 'RP', 'CP', 'SP/RP', 'TWO-WAY', 'P']);

export type L10SweepScope = FranchiseL10OverlayScopeInput & {
  franchiseId: string;
  seasonNumber: number;
};

export type PersistDarkL10Result = {
  status: 'dark-noop' | 'not-checkpoint' | 'written';
  written: number;
  reason?: string;
};

/**
 * Resolve the league MLB roster + the distinct team set into L10 candidates.
 * Mirrors `resolveCheckpointRoster` (franchiseCheckpointSweepCompute.ts:116-187):
 * MLB-only enumeration, per-team fan morale memoized, performance signal from
 * the persisted True Value rows.
 */
export async function resolveL10Candidates(
  scope: FranchiseL10OverlayScopeInput & { franchiseId: string },
): Promise<FranchiseL10Candidate[]> {
  const leagueId = (await getAllFranchiseTeams(scope.franchiseId))[0]?.leagueIds?.[0];
  if (!leagueId) return [];

  const [players, trueValueRows] = await Promise.all([
    getAllFranchisePlayers(scope.franchiseId),
    getFranchiseTrueValueRows({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
    }),
  ]);
  const trueValueRowsByPlayerId = new Map(trueValueRows.map((row) => [row.playerId, row]));
  const teamFanMoraleByTeamId = new Map<string, Promise<number>>();
  const playerCandidates: FranchiseL10Candidate[] = [];

  for (const player of players) {
    if (getPlayerRosterStatusForLeague(player, leagueId) !== 'MLB') continue;

    const teamId = getPlayerTeamIdForLeague(player, leagueId);
    if (!teamId) continue;

    if (!teamFanMoraleByTeamId.has(teamId)) {
      teamFanMoraleByTeamId.set(
        teamId,
        getFranchiseMoraleSnapshot(scope, 'team-fan', teamId).then(
          (snapshot) => snapshot?.currentValue ?? 50,
        ),
      );
    }

    const trueValueRow = trueValueRowsByPlayerId.get(player.id);
    const performanceSignal = trueValueRow
      ? normalizePerformanceSignal(trueValueRow.valueDelta, L10_PERFORMANCE_SIGNAL_TUNING)
      : undefined;

    playerCandidates.push({
      id: player.id,
      kind: 'player',
      role: getPlayerIsPitcher(player) ? 'pitcher' : 'position',
      personality: normalizePersonality(player.personality),
      playerMorale: player.morale,
      fanMorale: await teamFanMoraleByTeamId.get(teamId)!,
      performanceSignal,
    });
  }

  // Distinct team candidates (carry per-team fan morale for team/stadium
  // suppression). Only teams that actually have an MLB-rostered player.
  const teamCandidates: FranchiseL10Candidate[] = [];
  for (const [teamId, fanMoralePromise] of teamFanMoraleByTeamId) {
    teamCandidates.push({
      id: teamId,
      kind: 'team',
      fanMorale: await fanMoralePromise,
    });
  }

  return [...playerCandidates, ...teamCandidates].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

export const l10SweepSeam = {
  resolveL10Candidates,
  computeFranchiseL10Events,
};

export async function persistDarkL10ForCompletedGame(
  gameState: PersistedGameState,
  scope: L10SweepScope,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<PersistDarkL10Result> {
  if (!isFranchisePhase2L10Enabled()) {
    return { status: 'dark-noop', written: 0, reason: 'Phase-2 L10 disabled.' };
  }

  const gameNumber = await resolveL10GameNumber(gameState, archiveOptions);
  if (gameNumber == null) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'Unresolved league game number; cannot place an L10 sweep.',
    };
  }

  const totalGames = (await getSeasonMetadata(scope.seasonId))?.totalGames;
  if (!totalGames || totalGames <= 0) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'No season totalGames; cannot place an L10 sweep.',
    };
  }

  if (!isCheckpointBoundary(gameNumber, totalGames)) {
    return { status: 'not-checkpoint', written: 0 };
  }

  const candidates = await l10SweepSeam.resolveL10Candidates(scope);
  if (candidates.length === 0) {
    return { status: 'dark-noop', written: 0, reason: 'Empty L10 candidate set.' };
  }

  const createdAt = await resolveCreatedAtIso(scope.seasonId, gameState);
  if (!createdAt) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'No persisted event/header timestamp; cannot timestamp L10 overlays.',
    };
  }

  const seedBase = `${scope.franchiseId}:${scope.seasonId}:${gameNumber}`;
  const report: FranchiseL10EventReport = l10SweepSeam.computeFranchiseL10Events({
    candidates,
    intensity: DEFAULT_L10_INTENSITY,
    seedBase,
  });

  const sourceEventId = `l10-${gameNumber}`;
  const rows: FranchiseL10OverlayRow[] = report.events.map((event) => ({
    id: `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:${event.targetId}:${event.family}:${event.eventType}:${sourceEventId}`,
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    targetId: event.targetId,
    targetKind: event.targetKind,
    family: event.family,
    eventType: event.eventType,
    valence: event.valence,
    magnitude: event.magnitude,
    probability: event.probability,
    confirmationStatus: 'pending',
    applied: false,
    source: 'l10-random-event',
    sourceEventId,
    createdAtGameNumber: gameNumber,
    createdAt,
  }));

  for (const row of rows) {
    await putFranchiseL10Overlay(row);
  }

  return { status: 'written', written: rows.length };
}

async function resolveL10GameNumber(
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

function getPlayerIsPitcher(player: Player): boolean {
  return (
    (player as Player & { isPitcher?: boolean }).isPitcher === true ||
    PITCHER_POSITIONS.has(player.primaryPosition)
  );
}
