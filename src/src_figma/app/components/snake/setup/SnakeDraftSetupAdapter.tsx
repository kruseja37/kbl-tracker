import { useEffect, useMemo, useRef, useState } from 'react';

import { HISTORICAL_ARCHETYPES } from '../../../../../data/historicalArchetypes';
import type { TaxonomyPosition } from '../../../../../data/playerArchetypeTaxonomy';
import { buildSnakeOrder } from '../../../../../engines/leagueConstruction';
import { archetypeToCapIdentity } from '../../../../../engines/archetypeIdentity';
import { toRosterSlotPlayer } from '../../../../../engines/rosterNeed';
import { seededSnakeShuffle } from '../../../../../engines/snakeDraftPoc';
import {
  proveSimultaneousSnakeSeating,
  type SimultaneousSnakeSeatingInput,
  type SnakeSeatingPlayer,
  type SnakeSeatingProof,
} from '../../../../../engines/snakeSeatingProof';
import { deriveVersionGroupId } from '../../../../../engines/snakeVersioning';
import type { RegisteredPool } from '../../../../../engines/leagueConstruction';
import {
  createMlbDraftSessionId,
  getRegisteredPool,
  saveMlbDraftSession,
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

type ProofRunner = (input: SimultaneousSnakeSeatingInput) => SnakeSeatingProof | Promise<SnakeSeatingProof>;

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
  runProof?: ProofRunner;
}

function fullName(player: Player): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

function historicalSourceId(player: Player): string | undefined {
  const carried = player as Player & { sourceId?: unknown; historicalSourceId?: unknown };
  if (typeof carried.historicalSourceId === 'string' && carried.historicalSourceId.trim()) {
    return carried.historicalSourceId.trim();
  }
  if (typeof carried.sourceId === 'string' && carried.sourceId.trim()) return carried.sourceId.trim();
  return undefined;
}

function versionLabel(player: Player): string {
  const source = historicalSourceId(player);
  if (source) return source.split(':').at(-1)?.toUpperCase() ?? source.toUpperCase();
  return player.nickname?.trim() || player.overallGrade || player.id;
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
    const groupId = deriveVersionGroupId({ playerId: player.id, sourceId: historicalSourceId(player) });
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
      sourceId: historicalSourceId(player),
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

function boardCandidate(player: Player, iv: number): DeskCandidate | null {
  if (!isTaxonomyPosition(player.primaryPosition)) return null;
  return {
    id: player.id,
    name: fullName(player).toUpperCase(),
    position: player.primaryPosition,
    advisorWorth: iv,
    iv,
    marginalTax: 0,
    trueCost: iv,
    archetypeChip: 'SETUP',
    fitWord: 'SETUP RANK',
    risk: 'SAFE_TO_WAIT',
    legalFinishLine: 'SETUP BOARD SNAPSHOT',
    construction: toConstructionPlayer(player),
  };
}

export function buildInitialSnakeSeatBoards(input: {
  teams: readonly Team[];
  players: readonly Player[];
  pool: RegisteredPool;
}): Record<string, SnakeSeatBoardRecord> {
  const playerById = new Map(input.players.map((player) => [player.id, player]));
  const candidates = input.pool.players.flatMap((priced) => {
    const player = playerById.get(priced.id);
    if (!player) return [];
    const candidate = boardCandidate(player, priced.iv);
    return candidate ? [candidate] : [];
  });

  return Object.fromEntries(input.teams.map((team) => {
    const seeded = buildSeededSeatBoard(candidates);
    if (!seeded.board) {
      throw new Error(`Could not seed ${team.name}'s 22-slot snake board: ${seeded.brokenSlots.join(', ')}.`);
    }
    const overrides = team.boardRankOverrides;
    const byPosition = Object.fromEntries(Object.entries(seeded.board.rankings.byPosition ?? {}).map(([position, ids]) => [
      position,
      materializeOrder(ids ?? [], overrides?.byPosition?.[position as TaxonomyPosition]),
    ]));
    const frozenPlayerIds = [...new Set([
      ...(overrides?.global ?? []),
      ...Object.values(overrides?.byPosition ?? {}).flatMap((ids) => ids ?? []),
    ])];
    return [team.id, {
      ...seeded.board,
      rankings: {
        global: materializeOrder(seeded.board.rankings.global ?? [], overrides?.global),
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
  const [versionSelections, setVersionSelections] = useState<Record<string, string>>({});
  const [gmNames, setGmNames] = useState<Record<string, string>>({});
  const [seatModes, setSeatModes] = useState<Record<string, 'hotseat' | 'companion'>>({});
  const [seed, setSeed] = useState('OPENING-DAY');
  const [order, setOrder] = useState<string[]>([]);
  const [swapFirst, setSwapFirst] = useState<string | null>(null);
  const [proof, setProof] = useState<SnakeSeatingProof | null>(null);
  const [checking, setChecking] = useState(false);
  const proofRevision = useRef(0);

  const teamIdsKey = teams.map((team) => team.id).join('|');
  useEffect(() => {
    setOrder((current) => (
      current.length === teams.length && current.every((id) => teams.some((team) => team.id === id))
        ? current
        : teams.map((team) => team.id)
    ));
    setGmNames((current) => Object.fromEntries(teams.map((team) => [team.id, current[team.id] ?? team.gmSeatName ?? team.managerName ?? ''])));
    setSeatModes((current) => Object.fromEntries(teams.map((team) => [team.id, current[team.id] ?? 'hotseat'])));
  }, [teamIdsKey, teams]);

  const selectedPoolIds = useMemo(
    () => selectedSnakePoolIds(groups, versionSelections),
    [groups, versionSelections],
  );

  const proofInput = useMemo(() => (
    pool?.locked ? buildSnakeSetupProofInput({ teams, players, pool }) : null
  ), [players, pool, teams]);

  useEffect(() => {
    const revision = ++proofRevision.current;
    if (!proofInput || teams.length === 0) {
      setProof(null);
      setChecking(false);
      return;
    }
    setProof(null);
    setChecking(true);
    void Promise.resolve(runProof(proofInput)).then((next) => {
      if (proofRevision.current !== revision) return;
      setProof(next);
      setChecking(false);
    }).catch(() => {
      if (proofRevision.current !== revision) return;
      setProof(null);
      setChecking(false);
    });
  }, [proofInput, runProof, teams.length]);

  const readinessReasons = useMemo(() => {
    if (!input.savedDraftChecked) return ['Checking for a saved draft.'];
    if (input.savedDraftLookupError) return [input.savedDraftLookupError];
    if (input.hasSavedDraft) return [];
    if (!pool?.locked) return ['Choose each player version, then LOCK POOL. The room check runs on those locked players and prices.'];
    if (checking) return ['Checking whether every club can finish a legal 22 with its chosen team identity.'];
    if (!proof) return ['The snake room check did not finish.'];
    if (!proof.feasible) return [proof.message];
    if (order.length !== teams.length) return ['Finish the draft order before entering the room.'];
    return [];
  }, [checking, input.hasSavedDraft, input.savedDraftChecked, input.savedDraftLookupError, order.length, pool?.locked, proof, teams.length]);

  const ready = Boolean(pool?.locked && proof?.feasible && !checking && order.length === teams.length);

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
    setOrder((current) => {
      const next = [...current];
      const firstIndex = next.indexOf(swapFirst);
      const secondIndex = next.indexOf(teamId);
      [next[firstIndex], next[secondIndex]] = [next[secondIndex], next[firstIndex]];
      return next;
    });
    setSwapFirst(null);
  };

  const enterDraft = async () => {
    if (!league) return;
    if (input.hasSavedDraft) {
      input.navigateToRoom(league.id);
      return;
    }
    if (!pool?.locked || !proof?.feasible || checking) return;
    const lockedIds = pool.players.map((row) => row.id);
    await registerPickedSnakePool(league.id, lockedIds);
    const rankedTeams = await input.flushBoardRankings();
    const now = new Date().toISOString();
    const session: LeagueBuilderMlbDraftSession = {
      id: createMlbDraftSessionId(league.id, 1),
      leagueId: league.id,
      seasonNumber: 1,
      seed,
      workflowVersion: 'snake-v1',
      engineMethodVersion: 'snake-s1a',
      tier: league.tier ?? 'juiced',
      balanceMode: league.balanceMode ?? 'taxed',
      rounds: 22,
      pickOrder: buildSnakeOrder(order, 22),
      completedPicks: [],
      seatBoards: buildInitialSnakeSeatBoards({ teams: rankedTeams, players, pool }),
      snakeSetup: {
        poolPlayerIds: lockedIds,
        versionSelections: Object.fromEntries(groups
          .filter(({ cards }) => cards.length > 1)
          .map(({ groupId, cards }) => [groupId, cards.find((card) => lockedIds.includes(card.id))?.id ?? cards[0].id])),
        clubs: rankedTeams.map((team) => ({
          teamId: team.id,
          ...(gmNames[team.id]?.trim() ? { gmName: gmNames[team.id].trim() } : {}),
          hotseat: (seatModes[team.id] ?? 'hotseat') === 'hotseat',
          ...(team.mlbArchetypeKey ? { archetypeId: team.mlbArchetypeKey } : {}),
        })),
        orderSeed: seed,
      },
      currentPickIndex: 0,
      revision: 0,
      createdDate: now,
      lastModified: now,
    };
    await saveMlbDraftSession(session);
    input.navigateToRoom(league.id);
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
    ready,
    shuffleOrder,
    tapOrder,
    enterDraft,
  };
}

export function SnakeDraftSetupPanels({ adapter, teams, locked, disabled }: {
  adapter: ReturnType<typeof useSnakeDraftSetupAdapter>;
  teams: readonly Team[];
  locked: boolean;
  disabled: boolean;
}) {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const turn = adapter.order.length > 1
    ? `${teamById.get(adapter.order.at(-1)!)?.name.toUpperCase()} picks twice at one turn. ${teamById.get(adapter.order[0])?.name.toUpperCase()} picks twice at the next.`
    : '';
  return (
    <div className="space-y-6" data-testid="snake-setup-adapter">
      <section className="ballpark-panel" aria-label="Snake versions">
        <div className="ballpark-panel-strip"><strong>5 · VERSIONS</strong></div>
        <div className="space-y-3 p-4">
          <p className="text-sm font-bold">Pick one card for each real person before you lock the pool.</p>
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
                {cards.map((card) => <option key={card.id} value={card.id}>{versionLabel(card).toUpperCase()}</option>)}
              </select>
            </label>
          ))}
          {adapter.groups.every(({ cards }) => cards.length === 1) ? <p className="text-sm">No duplicate player versions in this pool.</p> : null}
          {locked ? <p className="font-bold text-[var(--ballpark-brass)]">UNLOCK THE POOL TO CHANGE VERSIONS.</p> : null}
        </div>
      </section>

      <section className="ballpark-panel" aria-label="Snake club extras">
        <div className="ballpark-panel-strip"><strong>6 · CLUB SEATS</strong></div>
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
                  <option value="companion">COMPANION</option>
                </select>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="ballpark-panel" aria-label="Snake order">
        <div className="ballpark-panel-strip"><strong>7 · ORDER</strong></div>
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
          {turn ? <p className="text-sm font-bold">{turn}</p> : null}
        </div>
      </section>

      <section className="ballpark-panel" aria-label="Snake readiness">
        <div className="ballpark-panel-strip"><strong>8 · READINESS</strong></div>
        <div className="space-y-2 p-4" aria-live="polite">
          <p className="font-bold">{adapter.checking ? 'CHECKING…' : adapter.proof?.message ?? 'LOCK THE POOL TO CHECK THE ROOM.'}</p>
          {adapter.readinessReasons.map((reason) => <p key={reason} className="text-sm text-[var(--ballpark-warn-text)]">• {reason}</p>)}
        </div>
      </section>
    </div>
  );
}
