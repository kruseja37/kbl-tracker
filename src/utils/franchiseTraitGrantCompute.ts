/**
 * §9 / L9b-3b-ii — dark trait-grant checkpoint sweep.
 *
 * Mirrors the L8b ratings-development checkpoint sweep shape:
 * flag-gate first, resolve the league game number, check the 20%-of-season
 * boundary, load season-wide data, compute candidate reality signals, compute
 * acquisition proposals, then write pending overlay rows.
 *
 * Doubly-dark by default: the default-OFF Phase-2 traits flag guards the whole
 * compute, and every written trait overlay is pending + unapplied. L9b-3c owns
 * confirmation and categorical trait1/trait2 mutation.
 *
 * DEFAULTS-TAKEN:
 * - held traits that are not buildable/scorable this season use neutral
 *   strength 0.5 for displacement ordering.
 * - rosterRole is 'unknown' in v1 because no bench/starter signal exists here.
 * - createdAt is derived from loaded persisted event/header timestamps, never
 *   wall-clock time.
 */

import {
  computeSeasonTraitCandidates,
  type SeasonTraitCandidate,
  type SeasonTraitPlayer,
} from '../engines/traitCandidateBuilder';
import {
  computeTraitAcquisition,
  type TraitCandidate,
} from '../engines/traitAcquisition';
import type { HiddenModifiers } from '../types/game';
import type { PersistedGameState } from './gameStorage';
import {
  getBetweenPlayEvents,
  getGameEvents,
  getGameFieldingEvents,
  getSeasonGames,
  getSeasonInjuryCountsByPlayer,
  type AtBatEvent,
  type BetweenPlayEvent,
  type FieldingEvent,
  type GameHeader,
} from './eventLog';
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
} from './franchisePlayerStorage';
import {
  getPlayerRosterStatusForLeague,
  type Player,
} from './leagueBuilderStorage';
import {
  putFranchiseTraitOverlay,
  type FranchiseTraitOverlayRow,
  type FranchiseTraitOverlayScopeInput,
} from './franchiseTraitOverlayStorage';
import {
  deriveAdaptiveStandardsConfig,
} from './franchiseAdaptiveStandards';
import {
  isCheckpointBoundary,
  type CompletedGameArchiveOptions,
} from './franchiseCheckpointSweepCompute';
import { isFranchisePhase2TraitsEnabled } from './franchisePhase2Flags';
import {
  getAllFieldingStats,
  getSeasonBattingStats,
} from './seasonStorage';
import { getSeasonMetadata } from './seasonStorage';
import { getGame as getScheduledGame } from './scheduleStorage';

const PITCHER_POSITIONS = new Set(['SP', 'RP', 'CP', 'SP/RP', 'TWO-WAY', 'P']);

export type TraitGrantScope = FranchiseTraitOverlayScopeInput & {
  franchiseId: string;
  seasonNumber: number;
};

export interface TraitGrantRosterEntry {
  playerId: string;
  role: 'pitcher' | 'position';
  personality: string;
  modifiers?: HiddenModifiers;
  currentMorale?: number;
  heldTraitNames: string[];
}

export type PersistDarkTraitGrantResult = {
  status: 'dark-noop' | 'not-checkpoint' | 'written';
  written: number;
  reason?: string;
};

interface LoadedSeasonTraitData {
  games: GameHeader[];
  atBatEvents: AtBatEvent[];
  betweenPlayEvents: BetweenPlayEvent[];
  fieldingEvents: FieldingEvent[];
  seasonFieldingByPlayer: Map<string, { outfieldAssists?: number; baserunnersHeld?: number; games?: number }>;
  injuryCountsByPlayer: Map<string, number>;
  gamesByPlayer: Map<string, number>;
}

export async function resolveTraitGrantRoster(
  scope: FranchiseTraitOverlayScopeInput,
): Promise<TraitGrantRosterEntry[]> {
  const leagueId = (await getAllFranchiseTeams(scope.franchiseId))[0]?.leagueIds?.[0];
  if (!leagueId) return [];

  const players = await getAllFranchisePlayers(scope.franchiseId);
  const roster: TraitGrantRosterEntry[] = [];

  for (const player of players) {
    if (getPlayerRosterStatusForLeague(player, leagueId) !== 'MLB') continue;

    roster.push({
      playerId: player.id,
      role: getPlayerIsPitcher(player) ? 'pitcher' : 'position',
      personality: player.personality,
      modifiers: player.hiddenPersonalityModifiers,
      currentMorale: player.morale,
      heldTraitNames: [player.trait1, player.trait2].filter((trait): trait is string => Boolean(trait)),
    });
  }

  return roster.sort((left, right) => left.playerId.localeCompare(right.playerId));
}

export const traitGrantSeam = {
  resolveTraitGrantRoster,
  computeSeasonTraitCandidates,
  computeTraitAcquisition,
};

export async function persistDarkTraitGrantForCompletedGame(
  gameState: PersistedGameState,
  scope: TraitGrantScope,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<PersistDarkTraitGrantResult> {
  if (!isFranchisePhase2TraitsEnabled()) {
    return { status: 'dark-noop', written: 0, reason: 'Phase-2 traits disabled.' };
  }

  const gameNumber = await resolveTraitGrantGameNumber(gameState, archiveOptions);
  if (gameNumber == null) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'Unresolved league game number; cannot place a trait-grant checkpoint.',
    };
  }

  const totalGames = (await getSeasonMetadata(scope.seasonId))?.totalGames;
  if (!totalGames || totalGames <= 0) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'No season totalGames; cannot place a trait-grant checkpoint.',
    };
  }

  if (!isCheckpointBoundary(gameNumber, totalGames)) {
    return { status: 'not-checkpoint', written: 0 };
  }

  const seasonData = await loadSeasonTraitData(scope.seasonId);
  const roster = (await traitGrantSeam.resolveTraitGrantRoster(scope))
    .sort((left, right) => left.playerId.localeCompare(right.playerId));
  if (roster.length === 0) {
    return { status: 'dark-noop', written: 0, reason: 'Empty trait-grant roster.' };
  }

  const createdAt = resolveCreatedAtIso(seasonData.atBatEvents, seasonData.games, gameState);
  if (!createdAt) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'No persisted event/header timestamp; cannot timestamp trait overlays.',
    };
  }

  const config = deriveAdaptiveStandardsConfig({ gamesPerSeason: totalGames });
  const candidatePlayers: SeasonTraitPlayer[] = roster.map((entry) => ({
    playerId: entry.playerId,
    role: entry.role,
  }));
  const candidatesByPlayer = traitGrantSeam.computeSeasonTraitCandidates({
    players: candidatePlayers,
    atBatEvents: seasonData.atBatEvents,
    betweenPlayEvents: seasonData.betweenPlayEvents,
    fieldingEvents: seasonData.fieldingEvents,
    seasonFieldingByPlayer: seasonData.seasonFieldingByPlayer,
    injuryCountsByPlayer: seasonData.injuryCountsByPlayer,
    gamesByPlayer: seasonData.gamesByPlayer,
  }, config);

  const rows: FranchiseTraitOverlayRow[] = [];
  const sourceEventId = `trait-grant-${gameNumber}`;

  for (const entry of roster) {
    const candidates = candidatesByPlayer.get(entry.playerId) ?? [];
    const heldTraits = entry.heldTraitNames.map((traitName) => ({
      traitName,
      strength: candidates.find((candidate) => candidate.traitName === traitName)
        ?.score.realityPercentile ?? 0.5,
    }));
    const acquisition = traitGrantSeam.computeTraitAcquisition({
      playerRole: entry.role,
      personality: entry.personality,
      modifiers: entry.modifiers,
      currentMorale: entry.currentMorale,
      rosterRole: 'unknown',
      heldTraits,
      candidates: candidates as TraitCandidate[],
    });

    for (const proposal of acquisition.proposals) {
      rows.push({
        id: `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:${entry.playerId}:${proposal.traitName}:${sourceEventId}`,
        franchiseId: scope.franchiseId,
        seasonId: scope.seasonId,
        statsScopeId: scope.statsScopeId,
        playerId: entry.playerId,
        valence: proposal.valence,
        traitName: proposal.traitName,
        displacesTraitName: proposal.displaces ?? null,
        realityPercentile: proposal.realityPercentile,
        probability: proposal.probability,
        confirmationStatus: 'pending',
        applied: false,
        source: 'trait-grant',
        sourceEventId,
        createdAtGameNumber: gameNumber,
        createdAt,
      });
    }
  }

  for (const row of rows) {
    await putFranchiseTraitOverlay(row);
  }

  return { status: 'written', written: rows.length };
}

async function loadSeasonTraitData(seasonId: string): Promise<LoadedSeasonTraitData> {
  const games = await getSeasonGames(seasonId);
  const eventTriples = await Promise.all(
    games.map((game) =>
      Promise.all([
        getGameEvents(game.gameId),
        getBetweenPlayEvents(game.gameId),
        getGameFieldingEvents(game.gameId),
      ]),
    ),
  );
  const atBatEvents = eventTriples.flatMap(([events]) => events);
  const betweenPlayEvents = eventTriples.flatMap(([, events]) => events);
  const fieldingEvents = eventTriples.flatMap(([, , events]) => events);
  const [injuryCountsByPlayer, fieldingStats, battingStats] = await Promise.all([
    getSeasonInjuryCountsByPlayer(seasonId),
    getAllFieldingStats(seasonId),
    getSeasonBattingStats(seasonId),
  ]);
  const seasonFieldingByPlayer = new Map<string, { outfieldAssists?: number; baserunnersHeld?: number; games?: number }>();
  const gamesByPlayer = new Map<string, number>();

  for (const row of fieldingStats) {
    seasonFieldingByPlayer.set(row.playerId, {
      outfieldAssists: row.outfieldAssists,
      baserunnersHeld: row.baserunnersHeld,
      games: row.games,
    });
    gamesByPlayer.set(row.playerId, Math.max(gamesByPlayer.get(row.playerId) ?? 0, row.games ?? 0));
  }

  for (const row of battingStats) {
    gamesByPlayer.set(row.playerId, Math.max(gamesByPlayer.get(row.playerId) ?? 0, row.games ?? 0));
  }

  return {
    games,
    atBatEvents,
    betweenPlayEvents,
    fieldingEvents,
    seasonFieldingByPlayer,
    injuryCountsByPlayer,
    gamesByPlayer,
  };
}

async function resolveTraitGrantGameNumber(
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

function resolveCreatedAtIso(
  atBatEvents: readonly AtBatEvent[],
  games: readonly GameHeader[],
  gameState: PersistedGameState,
): string | null {
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
