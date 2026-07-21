/* Pure snake setup calculations shared by setup UI, room recovery, and focused tests. */
import { HISTORICAL_ARCHETYPES } from '../../../../../data/historicalArchetypes';
import type { TaxonomyPosition } from '../../../../../data/playerArchetypeTaxonomy';
import { canCover, isLegalRoster, twoWayVariantFromTraits } from '../../../../../data/rosterConstruction';
import { BANDS, luxuryTax, shiftLuxuryCaps, type BandPriorities, type RegisteredPool, type TeamCapIdentity } from '../../../../../engines/leagueConstruction';
import type { LuxuryCapRow } from '../../../../../data/tierParams';
import { archetypeToCapIdentity, constructionArchetypeFitMultiplier, resolveClubBandPriorities } from '../../../../../engines/archetypeIdentity';
import { rosterNeedBreakdown, toRosterSlotPlayer } from '../../../../../engines/rosterNeed';
import { computeOwnValue } from '../../../../../engines/auctionMarketModel';
import { historicalToSimArchetype } from '../../../../../engines/draftabilityRanker';
import {
  auctionSinglePlayerTaxWithShiftedCaps,
} from '../../../../../engines/auctionLuxuryTax';
import { snakeLuxuryCaps } from '../../../../../engines/snakeLuxuryTax';
import { snakeMoneyAffordable } from '../../../../../engines/snakeMoney';
import {
  proveSimultaneousSnakeSeating,
  type SimultaneousSnakeSeatingInput,
  type SnakeIdentitySupportCertificate,
  type SnakeSeatingPlayer,
  type SnakeSeatingProof,
} from '../../../../../engines/snakeSeatingProof';
import {
  SNAKE_BOARD_SLOT_IDS,
  type LeagueTemplate,
  type Player,
  type SnakeSeatBoardRecord,
  type Team,
} from '../../../../../utils/leagueBuilderStorage';
import {
  buildCertifiedSeatBoard,
  seedBoardRankings,
  type DeskCandidate,
} from '../desk/deskModel';
import { buildDeskRoomPlayer, fitWord as deskFitWord, type DeskRoomPlayer } from '../desk/deskRoomModel';
import {
  snakePlayerSourceId,
  snakePlayerVersionGroupId,
} from '../../../../../utils/snakePlayerIdentity';
import type { SnakeSetupProofRunner } from './snakeSetupProofClient';

export type ProofRunner = SnakeSetupProofRunner;

export const MAX_SNAKE_COMPANION_PACKAGES = 3;

export interface SnakeVersionGroup {
  groupId: string;
  cards: Player[];
}

export interface SnakeSetupAdapterInput {
  league: LeagueTemplate | null;
  teams: Team[];
  players: Player[];
  poolPlayers: Player[];
  pool: RegisteredPool | null;
  hasSavedDraft: boolean;
  /** Unsaved one-card legacy pool is being restored and re-proved before it may enter a room. */
  legacyMigrationPending?: boolean;
  savedDraftChecked: boolean;
  savedDraftLookupError: string | null;
  flushBoardRankings: () => Promise<Team[]>;
  navigateToRoom: (leagueId: string) => void;
  navigateToPracticeRoom?: (leagueId: string) => void;
  runProof: ProofRunner;
}

function fullName(player: Player): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

function isTaxonomyPosition(position: Player['primaryPosition']): position is TaxonomyPosition {
  return ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'SP/RP', 'RP', 'CP'].includes(position);
}

function toConstructionPlayer(player: Player): SnakeSeatingPlayer['construction'] {
  const isPitcher = ['SP', 'SP/RP', 'RP', 'CP'].includes(player.primaryPosition);
  const twoWayVariant = isPitcher
    ? twoWayVariantFromTraits([player.trait1, player.trait2])
    : null;
  return {
    id: player.id,
    isPitcher,
    role: isPitcher ? player.primaryPosition as 'SP' | 'SP/RP' | 'RP' | 'CP' : undefined,
    ...(twoWayVariant ? { twoWayVariant } : {}),
    bat: { POW: player.power, CON: player.contact, SPD: player.speed, FLD: player.fielding, ARM: player.arm },
    pit: isPitcher ? { VEL: player.velocity, JNK: player.junk, ACC: player.accuracy } : undefined,
  };
}

export function deriveSnakeVersionGroups(poolPlayers: readonly Player[]): SnakeVersionGroup[] {
  const grouped = new Map<string, Player[]>();
  for (const player of poolPlayers) {
    const groupId = snakePlayerVersionGroupId(player);
    grouped.set(groupId, [...(grouped.get(groupId) ?? []), player]);
  }
  return [...grouped.entries()].map(([groupId, cards]) => ({ groupId, cards }));
}

export function selectedSnakePoolIds(
  groups: readonly SnakeVersionGroup[],
  _selections: Readonly<Record<string, string>> = {},
): string[] {
  void _selections;
  return groups.flatMap(({ cards }) => cards.map((card) => card.id));
}

export function lockedSnakeVersionSelections(
  _groups: readonly SnakeVersionGroup[],
  _lockedPlayerIds: readonly string[],
): Record<string, string> {
  void _groups;
  void _lockedPlayerIds;
  return {};
}

function capIdentityForTeam(team: Team) {
  const archetype = team.mlbArchetypeKey
    ? HISTORICAL_ARCHETYPES.find((candidate) => candidate.id === team.mlbArchetypeKey)
    : undefined;
  return archetype ? archetypeToCapIdentity(archetype) : team.capIdentity;
}

function identityArchetypeForTeam(team: Team) {
  const archetype = team.mlbArchetypeKey
    ? HISTORICAL_ARCHETYPES.find((candidate) => candidate.id === team.mlbArchetypeKey)
    : undefined;
  return archetype ? historicalToSimArchetype(archetype) : undefined;
}

export function buildLockedSnakeSeatingPlayers(input: {
  players: readonly Player[];
  pool: RegisteredPool;
}): SnakeSeatingPlayer[] {
  const playerById = new Map(input.players.map((player) => [player.id, player]));
  return [...input.pool.players].sort((left, right) => left.id.localeCompare(right.id)).map((priced) => {
    const player = playerById.get(priced.id);
    if (!player) throw new Error(`Locked snake pool player ${priced.id} is missing from the player database.`);
    if (!Number.isFinite(priced.iv)) throw new Error(`Locked snake pool player ${priced.id} has no frozen IV.`);
    return {
      playerId: player.id,
      sourceId: snakePlayerSourceId(player),
      versionGroupId: snakePlayerVersionGroupId(player),
      price: priced.iv,
      shape: toRosterSlotPlayer({
        primaryPosition: player.primaryPosition,
        secondaryPosition: player.secondaryPosition ?? null,
        traits: [player.trait1, player.trait2],
      }),
      construction: toConstructionPlayer(player),
    };
  });
}

export function buildSnakeSetupProofInput(input: {
  teams: readonly Team[];
  players: readonly Player[];
  pool: RegisteredPool;
  identityReferencePool?: RegisteredPool;
  identitySupportCertificate?: SnakeIdentitySupportCertificate;
}): SimultaneousSnakeSeatingInput {
  return {
    clubs: input.teams.map((team) => ({
      teamId: team.id,
      roster: [],
      budgetRemaining: input.pool.tierCap,
      capIdentity: capIdentityForTeam(team),
      identityArchetype: identityArchetypeForTeam(team),
    })),
    pool: buildLockedSnakeSeatingPlayers({ players: input.players, pool: input.pool }),
    ...(input.identityReferencePool
      ? {
          identityReferencePool: buildLockedSnakeSeatingPlayers({
            players: input.players,
            pool: input.identityReferencePool,
          }),
        }
      : {}),
    ...(input.identitySupportCertificate
      ? { identitySupportCertificate: input.identitySupportCertificate }
      : {}),
    baseCaps: input.pool.luxuryCaps,
    realTeamCount: input.teams.length,
    tier: input.pool.tier,
  };
}

function shortfallNumber(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

/** Compact blocker copy for the always-visible setup state. Longer proof law stays behind Help. */
export function snakeSetupProofFailureLine(
  proof: SnakeSeatingProof,
  teams: readonly Pick<Team, 'id' | 'name'>[],
): string | null {
  const shortfall = proof.shortfall;
  if (proof.feasible || !shortfall) return null;
  const team = shortfall.teamId
    ? teams.find((candidate) => candidate.id === shortfall.teamId)
    : null;
  const owner = team?.name.toUpperCase() ?? `ALL ${teams.length} CLUBS`;
  const identity = shortfall.identityName?.toUpperCase();
  const prefix = identity ? `${owner} · ${identity}` : owner;

  if (shortfall.reason === 'identity-proof-unknown') {
    // A bounded constructive search may fail without proving that any one club caused the stop.
    // Name a club only for the separate zero-variance necessary-condition check.
    if (shortfall.detail === 'identity-embodiment' && shortfall.teamId) {
      return `${prefix} · IDENTITY FIT: SELECTED SOURCE HAS NO BOOST VARIANCE.`;
    }
    return `ALL ${teams.length} CLUBS · IDENTITY CHECK: UNRESOLVED.`;
  }
  if (shortfall.detail === 'identity-legal-roster') {
    return `${prefix} · LEGAL 22: ${shortfallNumber(shortfall.available)}/${shortfallNumber(shortfall.needed)} SLOTS.`;
  }
  if (shortfall.detail === 'identity-affordability') {
    return `${prefix} · BUDGET ROOM: ${shortfallNumber(shortfall.available)}/${shortfallNumber(shortfall.needed)}.`;
  }
  if (shortfall.detail === 'identity-value-floor') {
    return `${prefix} · VALUE FLOOR: ${shortfallNumber(shortfall.available)}/${shortfallNumber(shortfall.needed)}.`;
  }
  return `${owner} · ${shortfall.label}: ${shortfallNumber(shortfall.available)}/${shortfallNumber(shortfall.needed)}, SHORT ${shortfallNumber(shortfall.shortBy)}.`;
}

/** Rebuild Practice boards from a fresh, worker-backed setup certificate. */
export async function rebuildPracticeSnakeSeatBoards(input: {
  teams: readonly Team[];
  players: readonly Player[];
  pool: RegisteredPool;
  runProof: ProofRunner;
}): Promise<Record<string, SnakeSeatBoardRecord>> {
  const certificate = await input.runProof(buildSnakeSetupProofInput(input));
  if (!certificate.feasible) throw new Error(certificate.message);
  return buildInitialSnakeSeatBoards({
    teams: input.teams,
    players: input.players,
    pool: input.pool,
    certificate,
  });
}

function materializeOrder(natural: readonly string[], explicit: readonly string[] | undefined): string[] {
  if (!explicit?.length) return [...natural];
  const allowed = new Set(natural);
  const pinned = explicit.filter((id) => allowed.has(id));
  const pinnedSet = new Set(pinned);
  return [...pinned, ...natural.filter((id) => !pinnedSet.has(id))];
}

const BALANCED_PRIORITIES = Object.fromEntries(BANDS.map((band) => [band, 1])) as BandPriorities;

function boardCandidate(input: {
  player: Player;
  roomPlayer: DeskRoomPlayer;
  iv: number;
  priorities: BandPriorities;
  archetypeName: string;
  capIdentity?: TeamCapIdentity;
  baseCaps: readonly LuxuryCapRow[];
  shiftedCaps: ReturnType<typeof snakeLuxuryCaps>;
}): DeskCandidate | null {
  if (!isTaxonomyPosition(input.player.primaryPosition)) return null;
  const need = rosterNeedBreakdown([]);
  const marginalTax = auctionSinglePlayerTaxWithShiftedCaps(input.roomPlayer.construction, input.shiftedCaps);
  return {
    id: input.player.id,
    name: fullName(input.player).toUpperCase(),
    position: input.player.primaryPosition,
    eligiblePositions: [...new Set([
      ...input.roomPlayer.eligiblePositions,
      ...(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const)
        .filter((position) => canCover(input.roomPlayer.shape, position)),
    ])],
    rosterShape: input.roomPlayer.shape,
    sourceId: input.roomPlayer.sourceId,
    versionGroupId: input.roomPlayer.versionGroupId,
    advisorWorth: computeOwnValue({
      iv: input.iv,
      archetypeWeights: input.roomPlayer.archetypeWeights,
      ownBandPriorities: input.priorities,
      archetypeFitMultiplierOverride: constructionArchetypeFitMultiplier(
        input.capIdentity,
        input.roomPlayer.construction,
      ),
      needBreakdown: need,
      shape: input.roomPlayer.shape,
      openSlots: 22,
    }),
    iv: input.iv,
    marginalTax,
    trueCost: input.iv + marginalTax,
    archetypeChip: input.archetypeName,
    fitWord: deskFitWord({
      player: input.roomPlayer,
      priorities: input.priorities,
      capIdentity: input.capIdentity,
      baseCaps: input.baseCaps,
      need,
      openSlots: 22,
    }),
    risk: 'SAFE_TO_WAIT',
    legalFinishLine: 'SETUP BOARD SNAPSHOT',
    construction: input.roomPlayer.construction,
  };
}

export function buildInitialSnakeSeatBoards(input: {
  teams: readonly Team[];
  players: readonly Player[];
  pool: RegisteredPool;
  certificate?: SnakeSeatingProof | null;
  /** Focused legacy tests only. Production callers must inject a worker-backed certificate. */
  allowSynchronousProof?: boolean;
}): Record<string, SnakeSeatBoardRecord> {
  const playerById = new Map(input.players.map((player) => [player.id, player]));
  const seatingById = new Map(buildLockedSnakeSeatingPlayers({ players: input.players, pool: input.pool }).map((player) => [player.playerId, player]));
  const roomPlayerById = new Map(input.pool.players.flatMap((priced) => {
    const player = playerById.get(priced.id);
    const seating = seatingById.get(priced.id);
    if (!player || !seating) return [];
    const roomPlayer = buildDeskRoomPlayer({ player, price: priced.iv, seating });
    return roomPlayer ? [[priced.id, roomPlayer] as const] : [];
  }));
  const normalizedCaps = snakeLuxuryCaps(input.pool.luxuryCaps);

  return Object.fromEntries(input.teams.map((team) => {
    const priorities = resolveClubBandPriorities(team) ?? BALANCED_PRIORITIES;
    const archetype = team.mlbArchetypeKey
      ? HISTORICAL_ARCHETYPES.find((candidate) => candidate.id === team.mlbArchetypeKey)
      : undefined;
    const archetypeName = (archetype?.name ?? 'BALANCED').toUpperCase();
    const capIdentity = capIdentityForTeam(team);
    const shiftedCaps = capIdentity ? shiftLuxuryCaps(normalizedCaps, capIdentity) : normalizedCaps;
    const candidates = input.pool.players.flatMap((priced) => {
      const player = playerById.get(priced.id);
      const roomPlayer = roomPlayerById.get(priced.id);
      if (!player || !roomPlayer) return [];
      const candidate = boardCandidate({
        player,
        roomPlayer,
        iv: priced.iv,
        priorities,
        archetypeName,
        capIdentity,
        baseCaps: input.pool.luxuryCaps,
        shiftedCaps,
      });
      return candidate ? [candidate] : [];
    });
    const certifiedAssignment = input.certificate?.feasible
      ? input.certificate.assignments.find((assignment) => assignment.teamId === team.id)
      : null;
    if (!certifiedAssignment && input.allowSynchronousProof !== true) {
      throw new Error(`Could not seed ${team.name}'s board without a valid seating certificate.`);
    }
    const completion: SnakeSeatingProof = certifiedAssignment ? {
      feasible: true,
      assignments: [certifiedAssignment],
      shortfall: null,
      message: input.certificate!.message,
    } : proveSimultaneousSnakeSeating({
      clubs: [{ teamId: team.id, roster: [], budgetRemaining: input.pool.tierCap, capIdentity: capIdentityForTeam(team) }],
      pool: [...seatingById.values()],
      baseCaps: input.pool.luxuryCaps,
      realTeamCount: input.teams.length,
    });
    const completionIds = new Set(completion.assignments[0]?.playerIds ?? []);
    const completionCandidates = candidates.filter((candidate) => completionIds.has(candidate.id));
    const affordable = (board: SnakeSeatBoardRecord | null): boolean => {
      if (!board) return false;
      const selected = Object.values(board.slots).flatMap((id) => seatingById.get(id) ?? []);
      if (selected.length !== 22 || !isLegalRoster(selected.map((row) => row.shape))) return false;
      if (certifiedAssignment) {
        const certifiedIds = new Set(certifiedAssignment.playerIds);
        if (selected.every((player) => certifiedIds.has(player.playerId))) {
          return snakeMoneyAffordable(certifiedAssignment.allInCost, input.pool.tierCap);
        }
      }
      const salary = selected.reduce((sum, row) => sum + row.price, 0);
      const tax = luxuryTax(selected.map((row) => row.construction), shiftedCaps, 'taxed').charged;
      return snakeMoneyAffordable(salary + tax, input.pool.tierCap);
    };
    const seeded = buildCertifiedSeatBoard(completionCandidates);
    const fullRankings = seedBoardRankings(candidates);
    if (!completion.feasible) {
      throw new Error(`Could not prove ${team.name}'s legal, affordable 22-slot snake board: ${completion.message}`);
    }
    if (!seeded.board || !affordable(seeded.board)) {
      const state = seeded.brokenSlots.length > 0
        ? `broken slots ${seeded.brokenSlots.join(', ')}`
        : !seeded.board
          ? 'no canonical 22-slot assignment'
          : 'the materialized board is not affordable under the certified cap identity';
      throw new Error(`Snake board seeding disagreed with the legal-finish certificate for ${team.name}: ${state}.`);
    }
    const overrides = team.boardRankOverrides;
    const plannedIds = SNAKE_BOARD_SLOT_IDS.flatMap((slotId) => seeded.board?.slots[slotId] ?? []);
    const plannedSet = new Set(plannedIds);
    const coherentGlobal = [
      ...plannedIds,
      ...(fullRankings.global ?? []).filter((id) => !plannedSet.has(id)),
    ];
    const byPosition = Object.fromEntries(Object.entries(fullRankings.byPosition ?? {}).map(([position, ids]) => {
      const natural = ids ?? [];
      const naturalSet = new Set(natural);
      const plannedAtPosition = plannedIds.filter((id) => naturalSet.has(id));
      const plannedAtPositionSet = new Set(plannedAtPosition);
      const coherent = [...plannedAtPosition, ...natural.filter((id) => !plannedAtPositionSet.has(id))];
      return [position, materializeOrder(coherent, overrides?.byPosition?.[position as TaxonomyPosition])];
    }));
    const frozenPlayerIds = [...new Set([
      ...(overrides?.global ?? []),
      ...Object.values(overrides?.byPosition ?? {}).flatMap((ids) => ids ?? []),
    ])];
    return [team.id, {
      ...seeded.board,
      rankings: {
        global: materializeOrder(coherentGlobal, overrides?.global),
        byPosition,
        frozenPlayerIds,
      },
    } satisfies SnakeSeatBoardRecord];
  }));
}

export function validateSnakeCompanionSeats(input: {
  teams: readonly Pick<Team, 'id' | 'name'>[];
  gmNames: Readonly<Record<string, string>>;
  seatModes: Readonly<Record<string, 'hotseat' | 'companion'>>;
}): string[] {
  const companionTeams = input.teams.filter((team) => input.seatModes[team.id] === 'companion');
  const reasons: string[] = [];
  const unnamed = companionTeams.filter((team) => !input.gmNames[team.id]?.trim());
  if (unnamed.length > 0) {
    reasons.push(`Add a GM name for ${unnamed.map((team) => team.name).join(', ')}.`);
  }
  const nameCounts = new Map<string, number>();
  for (const team of companionTeams) {
    const name = input.gmNames[team.id]?.trim().toLocaleLowerCase();
    if (name) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  if (nameCounts.size > MAX_SNAKE_COMPANION_PACKAGES) {
    reasons.push(`Choose no more than ${MAX_SNAKE_COMPANION_PACKAGES} companion GM packages.`);
  }
  return reasons;
}
