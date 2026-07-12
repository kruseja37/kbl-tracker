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
  TRAIT_ACQUISITION_TUNING,
} from '../engines/traitAcquisition';
import type { HiddenModifiers } from '../types/game';
import type { PersistedGameState } from './gameStorage';
import { getFranchiseMoraleSnapshot } from './franchiseMoraleState';
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
  scoreSmb4Player,
  type Smb4Grade,
} from '../engines/smb4GradeEmulator';
import {
  putFranchiseTraitOverlay,
  type FranchiseTraitOverlayRow,
  type FranchiseTraitOverlayScopeInput,
} from './franchiseTraitOverlayStorage';
import {
  deriveAdaptiveStandardsConfig,
} from './franchiseAdaptiveStandards';
import { checkpointCountForCadence } from '../data/rosterEngineConstants';
import {
  isCheckpointBoundary,
  resolvePreviousCheckpointGameNumber,
  type CompletedGameArchiveOptions,
} from './franchiseCheckpointSweepCompute';
import { isFranchisePhase2TraitsEnabled } from './franchisePhase2Flags';
import {
  getAllFieldingStats,
  getSeasonBattingStats,
  getSeasonPitchingStats,
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
  bats: 'L' | 'R' | 'S';
  throws: 'L' | 'R';
  primaryPosition: string;
  speed: number;
  fielding: number;
  arm: number;
  grade?: Smb4Grade;
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
  seasonPitchingByPlayer: Map<string, { outsRecorded: number; games: number; gamesStarted: number }>;
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

    const isPitcher = getPlayerIsPitcher(player);
    const playerMoraleSnapshot = await getFranchiseMoraleSnapshot(scope, 'player', player.id);
    roster.push({
      playerId: player.id,
      role: isPitcher ? 'pitcher' : 'position',
      personality: player.personality,
      modifiers: player.hiddenPersonalityModifiers,
      currentMorale: playerMoraleSnapshot?.currentValue ?? player.morale,
      heldTraitNames: [player.trait1, player.trait2].filter((trait): trait is string => Boolean(trait)),
      bats: player.bats,
      throws: player.throws,
      primaryPosition: player.primaryPosition,
      speed: player.speed,
      fielding: player.fielding,
      arm: player.arm,
      grade: isPitcher
        ? scoreSmb4Player({
            primaryPosition: player.primaryPosition,
            bats: player.bats,
            throws: player.throws,
            velocity: player.velocity,
            junk: player.junk,
            accuracy: player.accuracy,
            trait1: player.trait1,
            trait2: player.trait2,
          }).grade
        : undefined,
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

  const seasonMetadata = await getSeasonMetadata(scope.seasonId);
  const totalGames = seasonMetadata?.totalGames;
  if (!totalGames || totalGames <= 0) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'No season totalGames; cannot place a trait-grant checkpoint.',
    };
  }

  // T-7 (§8 EOS): the end-of-season trait grant is simply the FINAL 20%-grid
  // checkpoint — the last game (gameNumber === totalGames) is ALWAYS a checkpoint
  // boundary (isCheckpointBoundary, test-pinned), so the season-end trait pass runs
  // here as "one more checkpoint" with the same thresholds. There is NO separate EOS
  // event / Trait-Wheel-Spin (deprecated for v1; see TRAIT_GAIN_LOSS_THRESHOLD_SPEC §8).
  const checkpointCount = checkpointCountForCadence(seasonMetadata?.checkpointCadence);
  if (!isCheckpointBoundary(gameNumber, totalGames, checkpointCount)) {
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
  const candidateInput = {
    players: candidatePlayers,
    atBatEvents: seasonData.atBatEvents,
    betweenPlayEvents: seasonData.betweenPlayEvents,
    fieldingEvents: seasonData.fieldingEvents,
    seasonFieldingByPlayer: seasonData.seasonFieldingByPlayer,
    seasonPitchingByPlayer: seasonData.seasonPitchingByPlayer,
    injuryCountsByPlayer: seasonData.injuryCountsByPlayer,
    gamesByPlayer: seasonData.gamesByPlayer,
    batterHandByPlayer: new Map(roster.map((e) => [e.playerId, e.bats])),
    pitcherHandByPlayer: new Map(roster.map((e) => [e.playerId, e.throws])),
    primaryPositionByPlayer: new Map(roster.map((e) => [e.playerId, e.primaryPosition])),
    speedByPlayer: new Map(roster.map((e) => [e.playerId, e.speed])),
    fielderRatingsByPlayer: new Map(roster.map((e) => [e.playerId, { fielding: e.fielding, arm: e.arm }])),
    pitcherGradeByPlayer: new Map(
      roster
        .filter((e) => e.role === 'pitcher' && e.grade != null)
        .map((e) => [e.playerId, e.grade as Smb4Grade]),
    ),
  };
  const candidatesByPlayer = traitGrantSeam.computeSeasonTraitCandidates(candidateInput, config);
  const prevBoundary = resolvePreviousCheckpointGameNumber(gameNumber, totalGames, checkpointCount);
  const recentByPlayer = (TRAIT_ACQUISITION_TUNING.trendTiltWeight ?? 0) > 0 && prevBoundary > 0
    ? await computeRecentPercentilesByPlayer({
        seasonData,
        candidateInput,
        config,
        prevBoundary,
        currentGameNumber: gameNumber,
      })
    : new Map<string, Map<string, number>>();

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
      primaryPosition: entry.primaryPosition,
      heldTraits,
      candidates: attachRecentPercentiles(
        candidates,
        recentByPlayer.get(entry.playerId),
      ),
      seed: `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:${entry.playerId}:${sourceEventId}`,
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

async function computeRecentPercentilesByPlayer(args: {
  seasonData: LoadedSeasonTraitData;
  candidateInput: Parameters<typeof computeSeasonTraitCandidates>[0];
  config: ReturnType<typeof deriveAdaptiveStandardsConfig>;
  prevBoundary: number;
  currentGameNumber: number;
}): Promise<Map<string, Map<string, number>>> {
  const windowGameIds = await resolveTraitGrantWindowGameIds(
    args.seasonData.games,
    args.prevBoundary,
    args.currentGameNumber,
  );
  const recentCandidatesByPlayer = traitGrantSeam.computeSeasonTraitCandidates({
    ...args.candidateInput,
    atBatEvents: filterEventsByGameId(args.seasonData.atBatEvents, windowGameIds),
    betweenPlayEvents: filterEventsByGameId(args.seasonData.betweenPlayEvents, windowGameIds),
    fieldingEvents: filterEventsByGameId(args.seasonData.fieldingEvents, windowGameIds),
  }, args.config);
  const recentByPlayer = new Map<string, Map<string, number>>();

  for (const [playerId, candidates] of recentCandidatesByPlayer) {
    const byTrait = new Map<string, number>();
    for (const candidate of candidates) {
      if (candidate.score.sufficient === true && candidate.score.realityPercentile != null) {
        byTrait.set(candidate.traitName, candidate.score.realityPercentile);
      }
    }
    if (byTrait.size > 0) {
      recentByPlayer.set(playerId, byTrait);
    }
  }

  return recentByPlayer;
}

async function resolveTraitGrantWindowGameIds(
  games: readonly GameHeader[],
  prevBoundary: number,
  currentGameNumber: number,
): Promise<Set<string>> {
  const gameIds = new Set<string>();

  for (const game of games) {
    if (!game.scheduleGameId) continue;

    try {
      const scheduledGame = await getScheduledGame(game.scheduleGameId);
      if (
        scheduledGame
        && Number.isInteger(scheduledGame.gameNumber)
        && scheduledGame.gameNumber > prevBoundary
        && scheduledGame.gameNumber <= currentGameNumber
      ) {
        gameIds.add(game.gameId);
      }
    } catch {
      // non-fatal: unresolved schedule ids stay out of the recent window
    }
  }

  return gameIds;
}

function filterEventsByGameId<T extends { gameId: string }>(
  events: readonly T[],
  gameIds: ReadonlySet<string>,
): T[] {
  return events.filter((event) => gameIds.has(event.gameId));
}

function attachRecentPercentiles(
  candidates: readonly SeasonTraitCandidate[],
  recentForPlayer: ReadonlyMap<string, number> | undefined,
): readonly SeasonTraitCandidate[] {
  if (!recentForPlayer || recentForPlayer.size === 0) {
    return candidates;
  }

  return candidates.map((candidate) => {
    const recentPercentile = recentForPlayer.get(candidate.traitName);
    return recentPercentile == null
      ? candidate
      : { ...candidate, recentPercentile };
  });
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
  const [injuryCountsByPlayer, fieldingStats, battingStats, pitchingStats] = await Promise.all([
    getSeasonInjuryCountsByPlayer(seasonId),
    getAllFieldingStats(seasonId),
    getSeasonBattingStats(seasonId),
    getSeasonPitchingStats(seasonId),
  ]);
  const seasonFieldingByPlayer = new Map<string, { outfieldAssists?: number; baserunnersHeld?: number; games?: number }>();
  const seasonPitchingByPlayer = new Map<string, { outsRecorded: number; games: number; gamesStarted: number }>();
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

  for (const row of pitchingStats) {
    seasonPitchingByPlayer.set(row.playerId, {
      outsRecorded: row.outsRecorded,
      games: row.games,
      gamesStarted: row.gamesStarted,
    });
  }

  return {
    games,
    atBatEvents,
    betweenPlayEvents,
    fieldingEvents,
    seasonFieldingByPlayer,
    seasonPitchingByPlayer,
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
