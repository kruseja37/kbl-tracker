import { HISTORICAL_ARCHETYPES } from '../../../../../data/historicalArchetypes';
import type { TaxonomyPosition } from '../../../../../data/playerArchetypeTaxonomy';
import { LEGAL_ROSTER } from '../../../../../data/rosterConstruction';
import { computeOwnValueFactors } from '../../../../../engines/auctionMarketModel';
import { archetypeStatFitMultiplier, archetypeToCapIdentity, resolveClubBandPriorities } from '../../../../../engines/archetypeIdentity';
import { BANDS, shiftLuxuryCaps, type BandPriorities } from '../../../../../engines/leagueConstruction';
import { snakeLuxuryCaps, snakePlayerTaxPressure } from '../../../../../engines/snakeLuxuryTax';
import type { LuxuryCapRow } from '../../../../../data/tierParams';
import { derivePlayerBandWeights } from '../../../../../engines/snakePlayerBands';
import { playSnakeRationalRoom, type SnakeRationalPlayer, type SnakeRationalSeat } from '../../../../../engines/snakeRationalRoom';
import type { SnakeSeatingPlayer } from '../../../../../engines/snakeSeatingProof';
import type {
  LeagueBuilderMlbDraftSession,
  Player,
  SnakeSeatBoardRecord,
  Team,
} from '../../../../../utils/leagueBuilderStorage';
import {
  canonicalDeskEligiblePositions,
  reconcileBoardAvailability,
  refitBoardSlots,
  type BoardBackfillEvent,
  type DeskEligibilityCandidate,
} from './deskModel';
import { snakePlayerSourceId } from '../../../../../utils/snakePlayerIdentity';

export interface DeskRoomPlayer extends SnakeRationalPlayer {
  stored: Player;
  position: TaxonomyPosition;
  eligiblePositions: readonly TaxonomyPosition[];
  fitKnown: boolean;
}

const BALANCED_PRIORITIES = Object.fromEntries(BANDS.map((band) => [band, 1])) as BandPriorities;

function isTaxonomyPosition(position: Player['primaryPosition']): position is TaxonomyPosition {
  return ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'SP/RP', 'RP', 'CP'].includes(position);
}

function requiredRatings(player: Player, isPitcher: boolean): number[] {
  return isPitcher
    ? [player.velocity, player.junk, player.accuracy]
    : [player.power, player.contact, player.speed, player.fielding, player.arm];
}

export function buildDeskRoomPlayer(input: {
  player: Player;
  price: number;
  seating: SnakeSeatingPlayer;
}): DeskRoomPlayer | null {
  if (!isTaxonomyPosition(input.player.primaryPosition)) return null;
  const fitKnown = requiredRatings(input.player, input.seating.construction.isPitcher).every(Number.isFinite);
  if (!fitKnown) {
    console.warn(`[SnakeDraftRoom] Player ${input.player.id} is missing ratings; archetype fit is unknown.`);
  }
  const archetypeWeights = derivePlayerBandWeights({
    isPitcher: input.seating.construction.isPitcher,
    role: input.seating.construction.role,
    power: input.player.power,
    contact: input.player.contact,
    speed: input.player.speed,
    fielding: input.player.fielding,
    arm: input.player.arm,
    velocity: input.player.velocity,
    junk: input.player.junk,
    accuracy: input.player.accuracy,
  });
  return {
    ...input.seating,
    sourceId: snakePlayerSourceId(input.player),
    price: input.price,
    worth: input.price,
    archetypeWeights,
    stored: input.player,
    position: input.player.primaryPosition,
    eligiblePositions: canonicalDeskEligiblePositions(input.player.primaryPosition, input.player.secondaryPosition),
    fitKnown,
  };
}

export function resolveLockedSeat(input: {
  team: Team;
  session: LeagueBuilderMlbDraftSession;
}): { archetypeName: string; priorities: BandPriorities; capIdentity: Team['capIdentity'] } {
  const lockedId = input.session.snakeSetup?.clubs.find((club) => club.teamId === input.team.id)?.archetypeId
    ?? input.team.mlbArchetypeKey;
  const archetype = lockedId && lockedId !== 'BALANCED'
    ? HISTORICAL_ARCHETYPES.find((entry) => entry.id === lockedId)
    : undefined;
  if (archetype) {
    return {
      archetypeName: archetype.name.toUpperCase(),
      priorities: resolveClubBandPriorities({ mlbArchetypeKey: archetype.id }) ?? BALANCED_PRIORITIES,
      capIdentity: archetypeToCapIdentity(archetype),
    };
  }
  return {
    archetypeName: 'BALANCED',
    priorities: BALANCED_PRIORITIES,
    capIdentity: undefined,
  };
}

export function fitWord(input: {
  player: DeskRoomPlayer;
  priorities: BandPriorities;
  capIdentity?: Team['capIdentity'];
  baseCaps?: readonly LuxuryCapRow[];
  need: Parameters<typeof computeOwnValueFactors>[0]['needBreakdown'];
  openSlots: number;
}): string {
  if (!input.player.fitKnown) return 'FIT UNKNOWN';
  const exactMultiplier = archetypeStatFitMultiplier(input.capIdentity, {
    isPitcher: input.player.construction.isPitcher,
    role: input.player.construction.role,
    power: input.player.stored.power,
    contact: input.player.stored.contact,
    speed: input.player.stored.speed,
    fielding: input.player.stored.fielding,
    arm: input.player.stored.arm,
    velocity: input.player.stored.velocity,
    junk: input.player.stored.junk,
    accuracy: input.player.stored.accuracy,
  });
  const multiplier = exactMultiplier ?? computeOwnValueFactors({
    archetypeWeights: input.player.archetypeWeights,
    ownBandPriorities: input.priorities,
    needBreakdown: input.need,
    shape: input.player.shape,
    openSlots: input.openSlots,
  }).archetypeFitMultiplier;
  const rawFit = multiplier >= 1.04 ? 'STRONG FIT' : multiplier <= 0.96 ? 'WEAK FIT' : 'SOLID FIT';
  if (!input.baseCaps?.length || rawFit === 'WEAK FIT') return rawFit;
  const normalized = snakeLuxuryCaps([...input.baseCaps]);
  const caps = input.capIdentity ? shiftLuxuryCaps(normalized, input.capIdentity) : normalized;
  const pressure = snakePlayerTaxPressure(input.player.construction, caps);
  const materialPressure = Math.max(5_000, input.player.price * 0.25);
  if (pressure >= materialPressure) return 'WEAK FIT';
  if (rawFit === 'STRONG FIT' && pressure > Math.max(1_000, input.player.price * 0.05)) return 'SOLID FIT';
  if (multiplier >= 1.04) return 'STRONG FIT';
  if (multiplier <= 0.96) return 'WEAK FIT';
  return 'SOLID FIT';
}

export function buildRationalSeats(input: {
  teams: readonly Team[];
  session: LeagueBuilderMlbDraftSession;
  playersById: ReadonlyMap<string, DeskRoomPlayer>;
  budget: number;
}): SnakeRationalSeat[] {
  return input.teams.map((team) => {
    const locked = resolveLockedSeat({ team, session: input.session });
    const picks = input.session.completedPicks.filter((pick) => pick.teamId === team.id);
    const settledRosterPrices = picks.map((pick) => ({
      playerId: pick.playerId,
      settledPrice: pick.settledSalary ?? input.playersById.get(pick.playerId)?.price ?? Number.NaN,
    }));
    return {
      teamId: team.id,
      roster: picks.flatMap((pick) => input.playersById.get(pick.playerId) ?? []),
      settledRosterPrices,
      committedSpent: settledRosterPrices.reduce((sum, row) => sum + row.settledPrice, 0),
      budget: input.budget,
      lockedArchetype: locked.priorities,
      capIdentity: locked.capIdentity,
    };
  });
}

export function rationalRisksForRoomUncached(input: {
  session: LeagueBuilderMlbDraftSession;
  askingTeamId: string;
  askedPlayerIds: readonly string[];
  availablePlayers: readonly DeskRoomPlayer[];
  seats: readonly SnakeRationalSeat[];
  baseCaps: Parameters<typeof playSnakeRationalRoom>[0]['baseCaps'];
  realTeamCount: number;
}) {
  return playSnakeRationalRoom({
    currentPickIndex: input.session.currentPickIndex,
    pickOrder: input.session.pickOrder,
    askingTeamId: input.askingTeamId,
    askedPlayerIds: input.askedPlayerIds,
    players: input.availablePlayers,
    seats: input.seats,
    baseCaps: input.baseCaps,
    realTeamCount: input.realTeamCount,
  }).risks;
}

const rationalRiskCache = new Map<string, ReturnType<typeof rationalRisksForRoomUncached>>();

export function rationalRiskCacheKey(input: Parameters<typeof rationalRisksForRoomUncached>[0]): string {
  const poolSignature = input.availablePlayers.map((player) => [
    player.playerId,
    player.sourceId ?? '',
    player.price,
    player.worth,
    JSON.stringify(player.archetypeWeights ?? {}),
    JSON.stringify(player.shape),
    JSON.stringify(player.construction),
  ].join(':')).join('|');
  const seatSignature = input.seats.map((seat) => (
    `${seat.teamId}:${seat.committedSpent}:${seat.budget}:${JSON.stringify(seat.lockedArchetype)}:${JSON.stringify(seat.capIdentity ?? {})}:${seat.settledRosterPrices.map((row) => `${row.playerId}=${row.settledPrice}`).join(',')}:${seat.roster.map((player) => `${player.playerId}=${player.sourceId ?? ''}=${player.price}=${JSON.stringify(player.shape)}=${JSON.stringify(player.construction)}`).join(',')}`
  )).join('|');
  return [
    input.session.id,
    input.session.revision ?? 0,
    input.session.currentPickIndex,
    input.session.pickOrder.map((slot) => `${slot.pick}:${slot.teamId}`).join(','),
    input.session.completedPicks.map((pick) => `${pick.pick}:${pick.teamId}:${pick.playerId}:${pick.settledSalary ?? ''}`).join(','),
    input.askingTeamId,
    input.askedPlayerIds.join(','),
    poolSignature,
    seatSignature,
    JSON.stringify(input.baseCaps),
    input.realTeamCount,
  ].join('::');
}

export function rationalRisksForRoom(input: Parameters<typeof rationalRisksForRoomUncached>[0]) {
  const key = rationalRiskCacheKey(input);
  const cached = rationalRiskCache.get(key);
  if (cached) return cached;
  const risks = rationalRisksForRoomUncached(input);
  rationalRiskCache.set(key, risks);
  if (rationalRiskCache.size > 8) rationalRiskCache.delete(rationalRiskCache.keys().next().value!);
  return risks;
}

export function __resetRationalRiskCacheForTests(): void {
  rationalRiskCache.clear();
}

export function updateSessionSeatBoard(
  session: LeagueBuilderMlbDraftSession,
  teamId: string,
  board: SnakeSeatBoardRecord,
): LeagueBuilderMlbDraftSession {
  return {
    ...session,
    seatBoards: { ...session.seatBoards, [teamId]: board },
    revision: (session.revision ?? 0) + 1,
  };
}

export function reconcileExistingSeatBoards(input: {
  session: LeagueBuilderMlbDraftSession;
  candidates: readonly DeskEligibilityCandidate[];
  unavailablePlayerIds: ReadonlySet<string>;
}): {
  session: LeagueBuilderMlbDraftSession;
  changed: boolean;
  eventsByTeamId: Record<string, BoardBackfillEvent[]>;
} {
  const sourceBoards = input.session.seatBoards;
  if (!sourceBoards || Object.keys(sourceBoards).length === 0) {
    return { session: input.session, changed: false, eventsByTeamId: {} };
  }

  let changed = false;
  const nextBoards = { ...sourceBoards };
  const eventsByTeamId: Record<string, BoardBackfillEvent[]> = {};
  for (const [teamId, board] of Object.entries(sourceBoards)) {
    const committedPlayerIds = input.session.completedPicks
      .filter((pick) => pick.teamId === teamId)
      .map((pick) => pick.playerId);
    const committedSet = new Set(committedPlayerIds);
    const teamUnavailable = new Set(
      [...input.unavailablePlayerIds].filter((playerId) => !committedSet.has(playerId)),
    );
    let workingBoard = board;
    const committedMissingFromBoard = committedPlayerIds.some((playerId) => (
      !Object.values(workingBoard.slots).includes(playerId)
    ));
    if (committedMissingFromBoard) {
      const candidateById = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
      const rankings: SnakeSeatBoardRecord['rankings'] = {
        ...workingBoard.rankings,
        global: [
          ...committedPlayerIds,
          ...(workingBoard.rankings.global ?? []).filter((playerId) => !committedSet.has(playerId)),
        ],
        byPosition: Object.fromEntries(Object.entries(workingBoard.rankings.byPosition ?? {}).map(([position, ids]) => [
          position,
          [
            ...committedPlayerIds.filter((playerId) => (
              candidateById.get(playerId)?.eligiblePositions ?? [candidateById.get(playerId)?.position]
            ).includes(position as TaxonomyPosition)),
            ...(ids ?? []).filter((playerId) => !committedSet.has(playerId)),
          ],
        ])),
      };
      const refit = refitBoardSlots({
        rankings,
        candidates: input.candidates,
        unavailablePlayerIds: teamUnavailable,
      });
      const refitPlayerIds = Object.values(refit.slots);
      if (refit.brokenSlots.length === 0 && !refit.invalidRoster
        && committedPlayerIds.every((playerId) => refitPlayerIds.includes(playerId))) {
        workingBoard = {
          ...workingBoard,
          slots: refit.slots as SnakeSeatBoardRecord['slots'],
          rankings,
          revision: workingBoard.revision + 1,
        };
        changed = true;
      }
    }
    const reconciled = reconcileBoardAvailability({
      board: workingBoard,
      candidates: input.candidates,
      unavailablePlayerIds: teamUnavailable,
    });
    if (reconciled.events.length > 0) eventsByTeamId[teamId] = reconciled.events;
    if (reconciled.board !== workingBoard) changed = true;
    if (workingBoard !== board || reconciled.board !== workingBoard) {
      nextBoards[teamId] = reconciled.board;
    }
  }

  return {
    session: changed
      ? { ...input.session, seatBoards: nextBoards, revision: (input.session.revision ?? 0) + 1 }
      : input.session,
    changed,
    eventsByTeamId,
  };
}

export function openRosterSlots(session: LeagueBuilderMlbDraftSession, teamId: string): number {
  return Math.max(1, LEGAL_ROSTER.size - session.completedPicks.filter((pick) => pick.teamId === teamId).length);
}
