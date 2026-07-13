/* eslint-disable react-refresh/only-export-components -- setup helpers and their tested hook form one adapter contract */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { HISTORICAL_ARCHETYPES } from '../../../../../data/historicalArchetypes';
import type { TaxonomyPosition } from '../../../../../data/playerArchetypeTaxonomy';
import { isLegalRoster } from '../../../../../data/rosterConstruction';
import { BANDS, buildSnakeOrder, luxuryTax, shiftLuxuryCaps, type BandPriorities } from '../../../../../engines/leagueConstruction';
import { archetypeToCapIdentity, resolveClubBandPriorities } from '../../../../../engines/archetypeIdentity';
import { rosterNeedBreakdown, toRosterSlotPlayer } from '../../../../../engines/rosterNeed';
import { computeOwnValue } from '../../../../../engines/auctionMarketModel';
import {
  auctionSinglePlayerTaxWithShiftedCaps,
  normalizeAuctionLuxuryCapsForLeagueSize,
} from '../../../../../engines/auctionLuxuryTax';
import { seededSnakeShuffle } from '../../../../../engines/snakeShuffle';
import {
  proveSimultaneousSnakeSeating,
  type SimultaneousSnakeSeatingInput,
  type SnakeSeatingPlayer,
  type SnakeSeatingProof,
} from '../../../../../engines/snakeSeatingProof';
import type { RegisteredPool } from '../../../../../engines/leagueConstruction';
import {
  createMlbDraftSessionId,
  getRegisteredPool,
  saveMlbDraftSession,
  SNAKE_BOARD_SLOT_IDS,
  type LeagueBuilderMlbDraftSession,
  type LeagueTemplate,
  type Player,
  type SnakeSeatBoardRecord,
  type Team,
} from '../../../../../utils/leagueBuilderStorage';
import { registerLeaguePoolForLeague } from '../../../../../utils/leagueBuilderPoolRegistration';
import {
  addPlayersToLeaguePool,
  lockLeaguePool,
  removePlayersFromLeaguePool,
  unlockLeaguePool,
} from '../../../../../utils/leagueBuilderPoolBuilder';
import { buildSeededSeatBoard, type DeskCandidate } from '../desk/deskModel';
import { buildDeskRoomPlayer, fitWord as deskFitWord, type DeskRoomPlayer } from '../desk/deskRoomModel';
import {
  snakePlayerSourceId,
  snakePlayerVersionGroupId,
  snakePlayerVersionLabel,
} from '../../../../../utils/snakePlayerIdentity';

type ProofRunner = (input: SimultaneousSnakeSeatingInput) => SnakeSeatingProof | Promise<SnakeSeatingProof>;

export const MAX_SNAKE_COMPANION_SEATS = 3;

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
  savedDraftChecked: boolean;
  savedDraftLookupError: string | null;
  flushBoardRankings: () => Promise<Team[]>;
  navigateToRoom: (leagueId: string) => void;
  navigateToPracticeRoom?: (leagueId: string) => void;
  runProof?: ProofRunner;
}

function fullName(player: Player): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

function isTaxonomyPosition(position: Player['primaryPosition']): position is TaxonomyPosition {
  return ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'SP/RP', 'RP', 'CP'].includes(position);
}

function toConstructionPlayer(player: Player): SnakeSeatingPlayer['construction'] {
  const isPitcher = ['SP', 'SP/RP', 'RP', 'CP'].includes(player.primaryPosition);
  return {
    id: player.id,
    isPitcher,
    role: isPitcher ? player.primaryPosition as 'SP' | 'SP/RP' | 'RP' | 'CP' : undefined,
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
  selections: Readonly<Record<string, string>>,
): string[] {
  return groups.map(({ groupId, cards }) => (
    cards.find((card) => card.id === selections[groupId])?.id ?? cards[0].id
  ));
}

export function lockedSnakeVersionSelections(
  groups: readonly SnakeVersionGroup[],
  lockedPlayerIds: readonly string[],
): Record<string, string> {
  const locked = new Set(lockedPlayerIds);
  return Object.fromEntries(groups
    .filter(({ cards }) => cards.length > 1)
    .map(({ groupId, cards }) => [
      groupId,
      cards.find((card) => locked.has(card.id))?.id ?? cards[0].id,
    ]));
}

function capIdentityForTeam(team: Team) {
  const archetype = team.mlbArchetypeKey
    ? HISTORICAL_ARCHETYPES.find((candidate) => candidate.id === team.mlbArchetypeKey)
    : undefined;
  return archetype ? archetypeToCapIdentity(archetype) : team.capIdentity;
}

export function buildLockedSnakeSeatingPlayers(input: {
  players: readonly Player[];
  pool: RegisteredPool;
}): SnakeSeatingPlayer[] {
  const playerById = new Map(input.players.map((player) => [player.id, player]));
  return input.pool.players.map((priced) => {
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
}): SimultaneousSnakeSeatingInput {
  return {
    clubs: input.teams.map((team) => ({
      teamId: team.id,
      roster: [],
      budgetRemaining: input.pool.tierCap,
      capIdentity: capIdentityForTeam(team),
    })),
    pool: buildLockedSnakeSeatingPlayers({ players: input.players, pool: input.pool }),
    baseCaps: input.pool.luxuryCaps,
    realTeamCount: input.teams.length,
  };
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
  shiftedCaps: ReturnType<typeof normalizeAuctionLuxuryCapsForLeagueSize>;
}): DeskCandidate | null {
  if (!isTaxonomyPosition(input.player.primaryPosition)) return null;
  const need = rosterNeedBreakdown([]);
  const marginalTax = auctionSinglePlayerTaxWithShiftedCaps(input.roomPlayer.construction, input.shiftedCaps);
  return {
    id: input.player.id,
    name: fullName(input.player).toUpperCase(),
    position: input.player.primaryPosition,
    advisorWorth: computeOwnValue({
      iv: input.iv,
      archetypeWeights: input.roomPlayer.archetypeWeights,
      ownBandPriorities: input.priorities,
      needBreakdown: need,
      shape: input.roomPlayer.shape,
      openSlots: 22,
    }),
    iv: input.iv,
    marginalTax,
    trueCost: input.iv + marginalTax,
    archetypeChip: input.archetypeName,
    fitWord: deskFitWord({ player: input.roomPlayer, priorities: input.priorities, need, openSlots: 22 }),
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
  const normalizedCaps = normalizeAuctionLuxuryCapsForLeagueSize(input.pool.luxuryCaps, input.teams.length);

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
      const candidate = boardCandidate({ player, roomPlayer, iv: priced.iv, priorities, archetypeName, shiftedCaps });
      return candidate ? [candidate] : [];
    });
    const certifiedAssignment = input.certificate?.feasible
      ? input.certificate.assignments.find((assignment) => assignment.teamId === team.id)
      : null;
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
          return certifiedAssignment.allInCost <= input.pool.tierCap + 1e-9;
        }
      }
      const salary = selected.reduce((sum, row) => sum + row.price, 0);
      const tax = luxuryTax(selected.map((row) => row.construction), shiftedCaps, 'taxed').charged;
      return salary + tax <= input.pool.tierCap + 1e-9;
    };
    let seeded = buildSeededSeatBoard(completionCandidates);
    if (!affordable(seeded.board)) {
      const extras = candidates
        .filter((candidate) => !completionIds.has(candidate.id))
        .sort((left, right) => left.trueCost - right.trueCost || left.id.localeCompare(right.id));
      for (const extra of extras) {
        const trial = buildSeededSeatBoard([...completionCandidates, extra]);
        if (!affordable(trial.board)) continue;
        seeded = trial;
        break;
      }
    }
    const fullRankings = buildSeededSeatBoard(candidates).board?.rankings;
    if (!completion.feasible || !seeded.board || !affordable(seeded.board) || !fullRankings) {
      throw new Error(`Could not seed ${team.name}'s legal, affordable 22-slot snake board: ${completion.message}`);
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

function samePlayerIds(left: readonly string[], right: readonly string[]): boolean {
  const sortedLeft = [...new Set(left)].sort((a, b) => a.localeCompare(b));
  const sortedRight = [...new Set(right)].sort((a, b) => a.localeCompare(b));
  return sortedLeft.length === sortedRight.length
    && sortedLeft.every((id, index) => id === sortedRight[index]);
}

export function validateSnakeCompanionSeats(input: {
  teams: readonly Pick<Team, 'id' | 'name'>[];
  gmNames: Readonly<Record<string, string>>;
  seatModes: Readonly<Record<string, 'hotseat' | 'companion'>>;
}): string[] {
  const companionTeams = input.teams.filter((team) => input.seatModes[team.id] === 'companion');
  const reasons: string[] = [];
  if (companionTeams.length > MAX_SNAKE_COMPANION_SEATS) {
    reasons.push(`Choose no more than ${MAX_SNAKE_COMPANION_SEATS} companion seats.`);
  }
  const unnamed = companionTeams.filter((team) => !input.gmNames[team.id]?.trim());
  if (unnamed.length > 0) {
    reasons.push(`Add a GM name for ${unnamed.map((team) => team.name).join(', ')}.`);
  }
  const nameCounts = new Map<string, number>();
  for (const team of companionTeams) {
    const name = input.gmNames[team.id]?.trim().toLocaleLowerCase();
    if (name) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  if ([...nameCounts.values()].some((count) => count > 1)) {
    reasons.push('Give every companion seat a unique GM name.');
  }
  return reasons;
}

/** ROOMFIX wholesale adapter: exact picked membership is locked before the session can exist. */
export async function registerPickedSnakePool(leagueId: string, pickedPlayerIds: readonly string[]): Promise<void> {
  const picked = [...new Set(pickedPlayerIds)];
  const existing = await getRegisteredPool(leagueId);
  if (existing?.locked && samePlayerIds(existing.players.map((row) => row.id), picked)) return;
  if (existing?.locked) await unlockLeaguePool(leagueId);

  const defaultPool = await registerLeaguePoolForLeague(leagueId);
  const defaultIds = new Set(defaultPool.players.map((row) => row.id));
  const pickedIds = new Set(picked);
  const toAdd = picked.filter((id) => !defaultIds.has(id));
  const toRemove = [...defaultIds].filter((id) => !pickedIds.has(id));
  if (toAdd.length > 0) await addPlayersToLeaguePool(toAdd, leagueId);
  if (toRemove.length > 0) await removePlayersFromLeaguePool(toRemove, leagueId);
  await lockLeaguePool(leagueId, { expectedPlayerIds: picked });
}

export function useSnakeDraftSetupAdapter(input: SnakeSetupAdapterInput) {
  const { league, teams, players, poolPlayers, pool, runProof = proveSimultaneousSnakeSeating } = input;
  const groups = useMemo(() => deriveSnakeVersionGroups(poolPlayers), [poolPlayers]);
  const versionLedgerGroups = useMemo(() => {
    const sourceIds = new Set(league?.snakeVersionSourcePlayerIds ?? []);
    if (sourceIds.size === 0) return groups;
    return deriveSnakeVersionGroups(players.filter((player) => sourceIds.has(player.id)));
  }, [groups, league?.snakeVersionSourcePlayerIds, players]);
  const [versionSelections, setVersionSelections] = useState<Record<string, string>>({});
  const [gmNameEdits, setGmNames] = useState<Record<string, string>>({});
  const [seatModeEdits, setSeatModes] = useState<Record<string, 'hotseat' | 'companion'>>({});
  const [seed, setSeed] = useState('OPENING-DAY');
  const [orderEdits, setOrder] = useState<string[]>([]);
  const [swapFirst, setSwapFirst] = useState<string | null>(null);
  const proofRevision = useRef(0);

  const teamIds = useMemo(() => teams.map((team) => team.id), [teams]);
  const order = useMemo(() => (
    orderEdits.length === teamIds.length && orderEdits.every((id) => teamIds.includes(id))
      ? orderEdits
      : teamIds
  ), [orderEdits, teamIds]);
  const gmNames = useMemo(
    () => Object.fromEntries(teams.map((team) => [team.id, gmNameEdits[team.id] ?? team.gmSeatName ?? team.managerName ?? ''])),
    [gmNameEdits, teams],
  );
  const seatModes = useMemo<Record<string, 'hotseat' | 'companion'>>(
    () => Object.fromEntries(teams.map((team) => [team.id, seatModeEdits[team.id] ?? 'hotseat'])),
    [seatModeEdits, teams],
  );

  const selectedPoolIds = useMemo(
    () => selectedSnakePoolIds(groups, versionSelections),
    [groups, versionSelections],
  );
  const proofPool = useMemo(() => {
    if (!pool) return null;
    const selected = new Set(selectedPoolIds);
    const selectedPlayers = pool.players.filter((player) => selected.has(player.id));
    return selectedPlayers.length === selected.size
      ? { ...pool, players: selectedPlayers }
      : null;
  }, [pool, selectedPoolIds]);

  const companionSeatReasons = useMemo(() => validateSnakeCompanionSeats({
    teams,
    gmNames,
    seatModes,
  }), [gmNames, seatModes, teams]);

  const proofInput = useMemo(() => (
    proofPool ? buildSnakeSetupProofInput({ teams, players, pool: proofPool }) : null
  ), [players, proofPool, teams]);
  const [proofResult, setProofResult] = useState<{
    input: SimultaneousSnakeSeatingInput;
    runner: ProofRunner;
    proof: SnakeSeatingProof | null;
  } | null>(null);
  const proofMatches = proofResult?.input === proofInput && proofResult.runner === runProof;
  const proof = proofMatches ? proofResult.proof : null;
  const checking = Boolean(proofInput) && !proofMatches;

  useEffect(() => {
    const revision = ++proofRevision.current;
    if (!proofInput || teams.length === 0) return;
    void Promise.resolve(runProof(proofInput)).then((next) => {
      if (proofRevision.current !== revision) return;
      setProofResult({ input: proofInput, runner: runProof, proof: next });
    }).catch(() => {
      if (proofRevision.current !== revision) return;
      setProofResult({ input: proofInput, runner: runProof, proof: null });
    });
  }, [proofInput, runProof, teams.length]);

  const readinessReasons = useMemo(() => {
    if (!input.savedDraftChecked) return ['Checking for a saved draft.'];
    if (input.savedDraftLookupError) return [input.savedDraftLookupError];
    if (input.hasSavedDraft) return [];
    if (companionSeatReasons.length > 0) return companionSeatReasons;
    if (!pool) return [];
    if (pool && !proofPool) return ['The selected player versions do not match the priced pool.'];
    if (checking) return ['Checking every club\'s legal, affordable 22.'];
    if (!proof) return ['The snake room check did not finish.'];
    if (!proof.feasible) return [proof.message];
    if (!pool?.locked) return [];
    if (!seed.trim()) return ['Enter a draft seed.'];
    if (order.length !== teams.length) return ['Finish the draft order before entering the room.'];
    return [];
  }, [checking, companionSeatReasons, input.hasSavedDraft, input.savedDraftChecked, input.savedDraftLookupError, order.length, pool, proof, proofPool, seed, teams.length]);

  const lockProofBlocked = Boolean(pool && !pool.locked && (
    !proofPool || checking || !proof?.feasible
  ));

  const ready = Boolean(pool?.locked
    && proof?.feasible
    && !checking
    && Boolean(seed.trim())
    && order.length === teams.length
    && companionSeatReasons.length === 0);

  const shuffleOrder = () => {
    setOrder(seededSnakeShuffle(teams.map((team) => team.id), seed));
    setSwapFirst(null);
  };

  const tapOrder = (teamId: string) => {
    if (!swapFirst) {
      setSwapFirst(teamId);
      return;
    }
    if (swapFirst === teamId) {
      setSwapFirst(null);
      return;
    }
    const next = [...order];
    const firstIndex = next.indexOf(swapFirst);
    const secondIndex = next.indexOf(teamId);
    [next[firstIndex], next[secondIndex]] = [next[secondIndex], next[firstIndex]];
    setOrder(next);
    setSwapFirst(null);
  };

  const createRoomSession = async (options: {
    seasonNumber: number;
    workflowVersion: string;
    navigate: (leagueId: string) => void;
  }) => {
    if (!league) return;
    if (!pool?.locked || !proof?.feasible || checking || companionSeatReasons.length > 0 || !seed.trim()) return;
    const draftSeed = seed.trim();
    const lockedIds = pool.players.map((row) => row.id);
    await registerPickedSnakePool(league.id, lockedIds);
    const rankedTeams = await input.flushBoardRankings();
    const now = new Date().toISOString();
    const session: LeagueBuilderMlbDraftSession = {
      id: createMlbDraftSessionId(league.id, options.seasonNumber),
      leagueId: league.id,
      seasonNumber: options.seasonNumber,
      seed: draftSeed,
      workflowVersion: options.workflowVersion,
      engineMethodVersion: 'snake-s1a',
      tier: league.tier ?? 'juiced',
      balanceMode: league.balanceMode ?? 'taxed',
      rounds: 22,
      pickOrder: buildSnakeOrder(order, 22),
      completedPicks: [],
      seatBoards: buildInitialSnakeSeatBoards({ teams: rankedTeams, players, pool, certificate: proof }),
      snakeSetup: {
        poolPlayerIds: lockedIds,
        versionSelections: lockedSnakeVersionSelections(versionLedgerGroups, lockedIds),
        clubs: rankedTeams.map((team) => ({
          teamId: team.id,
          ...(gmNames[team.id]?.trim() ? { gmName: gmNames[team.id].trim() } : {}),
          hotseat: options.workflowVersion.includes('practice')
            ? team.id === order[0]
            : (seatModes[team.id] ?? 'hotseat') === 'hotseat',
          ...(team.mlbArchetypeKey ? { archetypeId: team.mlbArchetypeKey } : {}),
        })),
        orderSeed: draftSeed,
        seatingCertificate: {
          feasible: true,
          assignments: proof.assignments,
          shortfall: null,
          message: proof.message,
        },
      },
      currentPickIndex: 0,
      revision: 0,
      createdDate: now,
      lastModified: now,
    };
    await saveMlbDraftSession(session);
    options.navigate(league.id);
  };

  const enterDraft = async () => {
    if (!league) return;
    if (input.hasSavedDraft) {
      input.navigateToRoom(league.id);
      return;
    }
    await createRoomSession({ seasonNumber: 1, workflowVersion: 'snake-v1', navigate: input.navigateToRoom });
  };

  const enterPractice = async () => {
    await createRoomSession({
      seasonNumber: 99,
      workflowVersion: 'snake-practice-v1',
      navigate: input.navigateToPracticeRoom ?? input.navigateToRoom,
    });
  };

  return {
    groups,
    versionSelections,
    setVersionSelections,
    selectedPoolIds,
    gmNames,
    setGmNames,
    seatModes,
    setSeatModes,
    seed,
    setSeed,
    order,
    swapFirst,
    proof,
    checking,
    readinessReasons,
    companionSeatReasons,
    lockProofBlocked,
    ready,
    shuffleOrder,
    tapOrder,
    enterDraft,
    enterPractice,
  };
}

function HelpNote({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 border-l-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] px-3 py-2 text-xs leading-relaxed text-[var(--ballpark-chalk)]/75">
      {children}
    </div>
  );
}

export function SnakeDraftSetupPanels({ adapter, teams, locked, disabled, lockDisabled = false, showHelp = false, poolControls, onLock, onUnlock }: {
  adapter: ReturnType<typeof useSnakeDraftSetupAdapter>;
  teams: readonly Team[];
  locked: boolean;
  disabled: boolean;
  lockDisabled?: boolean;
  showHelp?: boolean;
  poolControls?: ReactNode;
  onLock?: () => void;
  onUnlock?: () => void;
}) {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const turn = adapter.order.length > 1
    ? `${teamById.get(adapter.order.at(-1)!)?.name.toUpperCase()} picks twice at one turn. ${teamById.get(adapter.order[0])?.name.toUpperCase()} picks twice at the next.`
    : '';
  const companionSeatCount = teams.filter((team) => adapter.seatModes[team.id] === 'companion').length;
  return (
    <div className="space-y-6" data-testid="snake-setup-adapter">
      <section className="ballpark-panel" aria-label="Snake pool">
        <div className="ballpark-panel-strip"><strong>1 · POOL</strong></div>
        <div className="space-y-3 p-4">
          {showHelp ? <HelpNote>Pick one card for each real person before you lock the pool. Choose each player version, then LOCK POOL. The room check runs on those locked players and prices.</HelpNote> : null}
          {adapter.groups.filter(({ cards }) => cards.length > 1).map(({ groupId, cards }) => (
            <label key={groupId} className="grid gap-2 sm:grid-cols-[1fr_240px] sm:items-center">
              <span className="font-bold">{fullName(cards[0]).toUpperCase()}</span>
              <select
                aria-label={`PICK A ${fullName(cards[0]).toUpperCase()} CARD`}
                disabled={disabled || locked}
                value={adapter.versionSelections[groupId] ?? cards[0].id}
                onChange={(event) => adapter.setVersionSelections((current) => ({ ...current, [groupId]: event.target.value }))}
                className="border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-action-green)] p-2 font-bold"
              >
                {cards.map((card) => <option key={card.id} value={card.id}>{(snakePlayerVersionLabel(card, cards) ?? card.overallGrade).toUpperCase()}</option>)}
              </select>
            </label>
          ))}
          {adapter.groups.every(({ cards }) => cards.length === 1) ? <p className="text-sm">No duplicate player versions in this pool.</p> : null}
          {!locked ? poolControls : null}
          {locked ? <p className="font-bold text-[var(--ballpark-brass)]">UNLOCK THE POOL TO CHANGE VERSIONS.</p> : null}
          <button type="button" disabled={disabled || (!locked && lockDisabled)} onClick={locked ? onUnlock : onLock} className="ballpark-press-button ballpark-press-md ballpark-press-gold">
            {locked ? 'UNLOCK POOL' : 'LOCK POOL'}
          </button>
        </div>
      </section>

      <section className="ballpark-panel" aria-label="Snake club extras">
        <div className="ballpark-panel-strip"><strong>2 · CLUBS</strong></div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {teams.map((team) => (
            <div key={team.id} className="grid gap-2 border-4 border-[var(--ballpark-panel-border)] p-3">
              <strong>{team.name.toUpperCase()}</strong>
              <label className="text-xs font-bold">GM NAME
                <input aria-label={`${team.name} GM NAME`} disabled={disabled} value={adapter.gmNames[team.id] ?? ''} onChange={(event) => adapter.setGmNames((current) => ({ ...current, [team.id]: event.target.value }))} className="mt-1 w-full border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-action-green)] p-2 disabled:opacity-45" />
              </label>
              <label className="text-xs font-bold">SEAT
                <select aria-label={`${team.name} SEAT`} disabled={disabled} value={adapter.seatModes[team.id] ?? 'hotseat'} onChange={(event) => adapter.setSeatModes((current) => ({ ...current, [team.id]: event.target.value as 'hotseat' | 'companion' }))} className="mt-1 w-full border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-action-green)] p-2 disabled:opacity-45">
                  <option value="hotseat">HOTSEAT</option>
                  <option
                    value="companion"
                    disabled={adapter.seatModes[team.id] !== 'companion' && companionSeatCount >= MAX_SNAKE_COMPANION_SEATS}
                  >COMPANION</option>
                </select>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="ballpark-panel" aria-label="Snake order">
        <div className="ballpark-panel-strip"><strong>3 · ORDER</strong></div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-bold">DRAFT SEED
              <input aria-label="DRAFT SEED" disabled={disabled} value={adapter.seed} onChange={(event) => adapter.setSeed(event.target.value)} className="mt-1 block border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-action-green)] p-2 disabled:opacity-45" />
            </label>
            <button type="button" disabled={disabled} onClick={adapter.shuffleOrder} className="border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-brass)] px-4 py-2 font-bold text-black disabled:opacity-45">SHUFFLE</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {adapter.order.map((teamId, index) => <button key={teamId} type="button" disabled={disabled} onClick={() => adapter.tapOrder(teamId)} aria-pressed={adapter.swapFirst === teamId} className="border-4 border-[var(--ballpark-panel-border)] p-3 text-left font-bold disabled:opacity-45">{index + 1}. {teamById.get(teamId)?.name.toUpperCase() ?? teamId}</button>)}
          </div>
          <p className="font-bold text-[var(--ballpark-brass)]">R1: 1→{adapter.order.length} · R2: {adapter.order.length}→1</p>
          {showHelp && turn ? <HelpNote>{turn}</HelpNote> : null}
        </div>
      </section>
    </div>
  );
}
