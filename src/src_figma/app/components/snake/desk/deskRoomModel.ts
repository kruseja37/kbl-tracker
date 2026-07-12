import { HISTORICAL_ARCHETYPES } from '../../../../../data/historicalArchetypes';
import type { TaxonomyPosition } from '../../../../../data/playerArchetypeTaxonomy';
import { LEGAL_ROSTER } from '../../../../../data/rosterConstruction';
import { computeOwnValueFactors } from '../../../../../engines/auctionMarketModel';
import { archetypeToCapIdentity, resolveClubBandPriorities } from '../../../../../engines/archetypeIdentity';
import { BANDS, type BandPriorities } from '../../../../../engines/leagueConstruction';
import { derivePlayerBandWeights } from '../../../../../engines/snakePlayerBands';
import { playSnakeRationalRoom, type SnakeRationalPlayer, type SnakeRationalSeat } from '../../../../../engines/snakeRationalRoom';
import type { SnakeSeatingPlayer } from '../../../../../engines/snakeSeatingProof';
import type {
  LeagueBuilderMlbDraftSession,
  Player,
  SnakeSeatBoardRecord,
  Team,
} from '../../../../../utils/leagueBuilderStorage';

export interface DeskRoomPlayer extends SnakeRationalPlayer {
  stored: Player;
  position: TaxonomyPosition;
  fitKnown: boolean;
}

const BALANCED_PRIORITIES = Object.fromEntries(BANDS.map((band) => [band, 1])) as BandPriorities;

function isTaxonomyPosition(position: Player['primaryPosition']): position is TaxonomyPosition {
  return ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'SP/RP', 'RP', 'CP'].includes(position);
}

function sourceId(player: Player): string | undefined {
  const carried = player as Player & { sourceId?: unknown; historicalSourceId?: unknown };
  if (typeof carried.historicalSourceId === 'string' && carried.historicalSourceId.trim()) return carried.historicalSourceId.trim();
  if (typeof carried.sourceId === 'string' && carried.sourceId.trim()) return carried.sourceId.trim();
  return undefined;
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
    sourceId: sourceId(input.player),
    price: input.price,
    worth: input.price,
    archetypeWeights,
    stored: input.player,
    position: input.player.primaryPosition,
    fitKnown,
  };
}

export function resolveLockedSeat(input: {
  team: Team;
  session: LeagueBuilderMlbDraftSession;
}): { archetypeName: string; priorities: BandPriorities; capIdentity: Team['capIdentity'] } {
  const lockedId = input.session.snakeSetup?.clubs.find((club) => club.teamId === input.team.id)?.archetypeId;
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
  need: Parameters<typeof computeOwnValueFactors>[0]['needBreakdown'];
  openSlots: number;
}): string {
  if (!input.player.fitKnown) return 'FIT UNKNOWN';
  const multiplier = computeOwnValueFactors({
    archetypeWeights: input.player.archetypeWeights,
    ownBandPriorities: input.priorities,
    needBreakdown: input.need,
    shape: input.player.shape,
    openSlots: input.openSlots,
  }).archetypeFitMultiplier;
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
    return {
      teamId: team.id,
      roster: picks.flatMap((pick) => input.playersById.get(pick.playerId) ?? []),
      committedSpent: picks.reduce((sum, pick) => (
        sum + (pick.settledSalary ?? input.playersById.get(pick.playerId)?.price ?? 0)
      ), 0),
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

function rationalRiskCacheKey(input: Parameters<typeof rationalRisksForRoomUncached>[0]): string {
  const poolSignature = input.availablePlayers.map((player) => [
    player.playerId,
    player.sourceId ?? '',
    player.price,
    player.worth ?? '',
    JSON.stringify(player.archetypeWeights ?? {}),
    JSON.stringify(player.construction),
  ].join(':')).join('|');
  const seatSignature = input.seats.map((seat) => (
    `${seat.teamId}:${seat.committedSpent}:${seat.budget}:${JSON.stringify(seat.lockedArchetype)}:${JSON.stringify(seat.capIdentity ?? {})}:${seat.roster.map((player) => player.playerId).join(',')}`
  )).join('|');
  return [
    input.session.id,
    input.session.revision ?? 0,
    input.session.currentPickIndex,
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

export function openRosterSlots(session: LeagueBuilderMlbDraftSession, teamId: string): number {
  return Math.max(1, LEGAL_ROSTER.size - session.completedPicks.filter((pick) => pick.teamId === teamId).length);
}
