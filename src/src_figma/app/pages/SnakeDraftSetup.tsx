import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LUXURY_CAP_TABLES, TIER_CAPS } from '../../../data/tierParams';
import { buildSnakeOrder } from '../../../engines/leagueConstruction';
import { toRosterSlotPlayer } from '../../../engines/rosterNeed';
import { seededSnakeShuffle } from '../../../engines/snakeDraftPoc';
import {
  proveSimultaneousSnakeSeating,
  type SimultaneousSnakeSeatingInput,
  type SnakeSeatingPlayer,
  type SnakeSeatingProof,
} from '../../../engines/snakeSeatingProof';
import { deriveVersionGroupId } from '../../../engines/snakeVersioning';
import {
  getAllLeagueTemplates,
  getAllPlayers,
  getAllTeams,
  getRegisteredPool,
  getPlayerLeagueAssignment,
  resolveLeagueSalaryCap,
  saveMlbDraftSession,
  createMlbDraftSessionId,
  type LeagueBuilderMlbDraftSession,
  type LeagueTemplate,
  type Player,
  type Team,
} from '../../../utils/leagueBuilderStorage';
import { registerLeaguePoolForLeague } from '../../../utils/leagueBuilderPoolRegistration';
import {
  addPlayersToLeaguePool,
  lockLeaguePool,
  removePlayersFromLeaguePool,
  unlockLeaguePool,
} from '../../../utils/leagueBuilderPoolBuilder';
import { demandPlayerFromLeaguePlayer } from '../engines/leaguePlayerAdapter';

export interface SnakeSetupPlayer extends SnakeSeatingPlayer {
  name: string;
  sourceLeagueId: string | null;
  versionLabel: string;
}

export interface SnakeSetupClub {
  teamId: string;
  teamName: string;
  gmName: string;
  seatMode: 'companion' | 'hotseat';
  archetype: string;
}

export interface SnakeSetupSourceLeague {
  id: string;
  name: string;
}

type ProofRunner = (input: SimultaneousSnakeSeatingInput) => SnakeSeatingProof | Promise<SnakeSeatingProof>;

export interface SnakeDraftSetupProps {
  leagueId?: string;
  sourceLeagues?: SnakeSetupSourceLeague[];
  initialPlayers?: SnakeSetupPlayer[];
  initialClubs?: SnakeSetupClub[];
  runProof?: ProofRunner;
  createSession?: (session: LeagueBuilderMlbDraftSession) => Promise<unknown>;
}

function playerName(player: Player): string {
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

function toSetupPlayer(player: Player, sourceLeagueId: string | null): SnakeSetupPlayer {
  const demand = demandPlayerFromLeaguePlayer(player);
  return {
    playerId: player.id,
    name: playerName(player),
    sourceId: historicalSourceId(player),
    sourceLeagueId,
    versionLabel: versionLabel(player),
    price: demand.iv,
    shape: toRosterSlotPlayer({
      primaryPosition: player.primaryPosition,
      secondaryPosition: player.secondaryPosition ?? null,
      traits: [player.trait1, player.trait2],
    }),
    construction: {
      id: demand.id,
      isPitcher: demand.isPitcher,
      role: demand.role,
      bat: demand.bat,
      pit: demand.pit,
    },
  };
}

function toSetupClub(team: Team): SnakeSetupClub {
  return {
    teamId: team.id,
    teamName: team.name,
    gmName: team.gmSeatName || team.managerName || '',
    seatMode: 'hotseat',
    archetype: team.mlbArchetypeKey || 'BALANCED',
  };
}

function duplicateIdentityWarnings(players: readonly SnakeSetupPlayer[]): string[] {
  const byName = new Map<string, SnakeSetupPlayer[]>();
  for (const player of players) {
    const key = player.name.trim().toLocaleUpperCase();
    byName.set(key, [...(byName.get(key) ?? []), player]);
  }
  return [...byName.entries()].flatMap(([name, cards]) => {
    if (cards.length < 2 || cards.every((card) => Boolean(card.sourceId?.trim() || card.versionGroupId?.trim()))) return [];
    return [`TWO CARDS NAMED ${name} — TREATED AS DIFFERENT PEOPLE. REBUILD THE POOL FROM THE LEGENDS LIBRARY TO LINK THEM.`];
  });
}

function samePlayerIds(left: readonly string[], right: readonly string[]): boolean {
  const sortedLeft = [...new Set(left)].sort((a, b) => a.localeCompare(b));
  const sortedRight = [...new Set(right)].sort((a, b) => a.localeCompare(b));
  return sortedLeft.length === sortedRight.length
    && sortedLeft.every((id, index) => id === sortedRight[index]);
}

async function registerPickedSnakePool(leagueId: string, pickedPlayerIds: readonly string[]): Promise<void> {
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

function setupCard(title: string, children: React.ReactNode) {
  return (
    <section className="ballpark-panel">
      <div className="ballpark-panel-strip px-5 py-3">
        <h2 className="ballpark-title text-xl">{title}</h2>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

export function SnakeDraftSetup({
  leagueId: leagueIdProp,
  sourceLeagues: sourceLeaguesProp,
  initialPlayers,
  initialClubs,
  runProof = proveSimultaneousSnakeSeating,
  createSession = saveMlbDraftSession,
}: SnakeDraftSetupProps = {}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [league, setLeague] = useState<LeagueTemplate | null>(null);
  const [sourceLeagues, setSourceLeagues] = useState<SnakeSetupSourceLeague[]>(sourceLeaguesProp ?? []);
  const [players, setPlayers] = useState<SnakeSetupPlayer[]>(initialPlayers ?? []);
  const [clubs, setClubs] = useState<SnakeSetupClub[]>(initialClubs ?? []);
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<Set<string>>(
    () => new Set((sourceLeaguesProp ?? []).map((entry) => entry.id)),
  );
  const [removedPlayerIds, setRemovedPlayerIds] = useState<Set<string>>(new Set());
  const [pickedVersionByGroup, setPickedVersionByGroup] = useState<Record<string, string>>({});
  const [seed, setSeed] = useState('OPENING-DAY');
  const [order, setOrder] = useState<string[]>(() => initialClubs?.map((club) => club.teamId) ?? []);
  const [swapFirst, setSwapFirst] = useState<string | null>(null);
  const [proof, setProof] = useState<SnakeSeatingProof | null>(null);
  const [checking, setChecking] = useState(true);
  const [loadMessage, setLoadMessage] = useState('');
  const revision = useRef(0);

  useEffect(() => {
    if (initialPlayers || initialClubs || sourceLeaguesProp) return;
    let live = true;
    void Promise.all([getAllLeagueTemplates(), getAllTeams(), getAllPlayers()]).then(([leagues, teams, storedPlayers]) => {
      if (!live) return;
      const requestedId = leagueIdProp ?? params.get('leagueId');
      const target = leagues.find((entry) => entry.id === requestedId)
        ?? leagues.find((entry) => entry.draftFormat === 'snake')
        ?? null;
      if (!target) {
        setLoadMessage('MAKE A SNAKE DRAFT LEAGUE FIRST.');
        setChecking(false);
        return;
      }
      const sources = leagues.map(({ id, name }) => ({ id, name }));
      const chosenSources = new Set(target.sourceLeagueIds ?? sources.map((entry) => entry.id));
      const targetTeams = teams.filter((team) => target.teamIds.includes(team.id));
      setLeague(target);
      setSourceLeagues(sources);
      setSelectedLeagueIds(chosenSources);
      setPlayers(storedPlayers.map((player) => {
        const sourceLeague = leagues.find((candidate) => getPlayerLeagueAssignment(player, candidate.id));
        return toSetupPlayer(player, sourceLeague?.id ?? null);
      }));
      const nextClubs = targetTeams.map(toSetupClub);
      setClubs(nextClubs);
      setOrder(nextClubs.map((club) => club.teamId));
    }).catch((error) => {
      console.warn('[SnakeDraftSetup] Could not load setup data.', error);
      if (live) {
        setLoadMessage('THE DRAFT ROOM COULD NOT LOAD. TRY AGAIN.');
        setChecking(false);
      }
    });
    return () => { live = false; };
  }, [initialClubs, initialPlayers, leagueIdProp, params, sourceLeaguesProp]);

  const sourcePool = useMemo(() => players.filter((player) => (
    !removedPlayerIds.has(player.playerId)
    && (player.sourceLeagueId === null || selectedLeagueIds.has(player.sourceLeagueId))
  )), [players, removedPlayerIds, selectedLeagueIds]);

  const groups = useMemo(() => {
    const grouped = new Map<string, SnakeSetupPlayer[]>();
    for (const player of sourcePool) {
      const key = deriveVersionGroupId(player);
      grouped.set(key, [...(grouped.get(key) ?? []), player]);
    }
    return [...grouped.entries()].map(([groupId, cards]) => ({ groupId, cards }));
  }, [sourcePool]);

  const proofPool = useMemo(() => groups.map(({ groupId, cards }) => (
    cards.find((card) => card.playerId === pickedVersionByGroup[groupId]) ?? cards[0]
  )), [groups, pickedVersionByGroup]);

  const warnings = useMemo(() => duplicateIdentityWarnings(sourcePool), [sourcePool]);
  const clubBudget = league ? resolveLeagueSalaryCap(league) : TIER_CAPS.juiced.tierCap;
  const proofInput = useMemo<SimultaneousSnakeSeatingInput>(() => ({
    clubs: clubs.map((club) => ({ teamId: club.teamId, roster: [], budgetRemaining: clubBudget })),
    pool: proofPool,
    baseCaps: LUXURY_CAP_TABLES[league?.tier ?? 'juiced'],
    realTeamCount: clubs.length,
  }), [clubBudget, clubs, league?.tier, proofPool]);

  useEffect(() => {
    if (clubs.length === 0) return;
    const requestRevision = ++revision.current;
    setChecking(true);
    setProof(null);
    void Promise.resolve(runProof(proofInput)).then((nextProof) => {
      if (revision.current !== requestRevision) return;
      setProof(nextProof);
      setChecking(false);
    }).catch((error) => {
      if (revision.current !== requestRevision) return;
      console.warn('[SnakeDraftSetup] The room check failed.', error);
      setProof(null);
      setChecking(false);
    });
  }, [order, proofInput, runProof, seed]);

  useEffect(() => {
    for (const warning of warnings) console.warn(`[SnakeDraftSetup] ${warning}`);
  }, [warnings]);

  function toggleSource(id: string) {
    setSelectedLeagueIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function updateClub(teamId: string, patch: Partial<SnakeSetupClub>) {
    setClubs((current) => current.map((club) => club.teamId === teamId ? { ...club, ...patch } : club));
  }

  function shuffleOrder() {
    setOrder(seededSnakeShuffle(clubs.map((club) => club.teamId), seed));
    setSwapFirst(null);
  }

  function tapOrder(teamId: string) {
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
  }

  async function startDraft() {
    if (!proof?.feasible || checking || order.length === 0) return;
    const targetLeagueId = leagueIdProp ?? league?.id ?? params.get('leagueId') ?? 'snake-draft';
    const pickedPlayerIds = proofPool.map((player) => player.playerId);
    // ROOMFIX: the room reads a league-keyed registered pool with no fallback. Seed and lock the
    // exact version-picked membership before the session exists; registering the league's default
    // assignment membership alone can produce a technically-present but empty room.
    if (league) await registerPickedSnakePool(targetLeagueId, pickedPlayerIds);
    const now = new Date().toISOString();
    const session: LeagueBuilderMlbDraftSession = {
      id: createMlbDraftSessionId(targetLeagueId, 1),
      leagueId: targetLeagueId,
      seasonNumber: 1,
      seed,
      workflowVersion: 'snake-v1',
      engineMethodVersion: 'snake-s1a',
      tier: league?.tier ?? 'juiced',
      balanceMode: league?.balanceMode ?? 'taxed',
      rounds: 22,
      pickOrder: buildSnakeOrder(order, 22),
      completedPicks: [],
      snakeSetup: {
        poolPlayerIds: pickedPlayerIds,
        versionSelections: Object.fromEntries(groups
          .filter(({ cards }) => cards.length > 1)
          .map(({ groupId, cards }) => [
            groupId,
            cards.find((card) => card.playerId === pickedVersionByGroup[groupId])?.playerId ?? cards[0].playerId,
          ])),
        clubs: clubs.map((club) => ({
          teamId: club.teamId,
          ...(club.gmName.trim() ? { gmName: club.gmName.trim() } : {}),
          hotseat: club.seatMode === 'hotseat',
          ...(club.archetype.trim() ? { archetypeId: club.archetype.trim() } : {}),
        })),
        orderSeed: seed,
      },
      currentPickIndex: 0,
      revision: 0,
      createdDate: now,
      lastModified: now,
    };
    await createSession(session);
    navigate(`/snake-room?leagueId=${encodeURIComponent(targetLeagueId)}`);
  }

  const clubById = new Map(clubs.map((club) => [club.teamId, club]));

  return (
    <main className="min-h-screen bg-[var(--ballpark-page-bg)] px-4 py-8 text-[var(--ballpark-chalk)]">
      <div className="mx-auto max-w-5xl space-y-7">
        <header>
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">SNAKE DRAFT</p>
          <h1 className="ballpark-title text-3xl">BUILD THE ROOM</h1>
        </header>

        {loadMessage ? <div className="border-4 border-[var(--ballpark-warn-border)] bg-[var(--ballpark-warn-panel)] p-4 font-bold uppercase">{loadMessage}</div> : null}
        {warnings.map((warning) => <div key={warning} className="border-4 border-[var(--ballpark-warn-border)] bg-[var(--ballpark-warn-panel)] p-4 font-bold uppercase text-[var(--ballpark-warn-text)]">{warning}</div>)}

        {setupCard('POOL', <>
          <div className="grid gap-2 sm:grid-cols-2">
            {sourceLeagues.map((source) => (
              <label key={source.id} className="flex items-center gap-3 border-4 border-[var(--ballpark-panel-border)] p-3 font-bold">
                <input type="checkbox" checked={selectedLeagueIds.has(source.id)} onChange={() => toggleSource(source.id)} />
                {source.name.toUpperCase()}
              </label>
            ))}
          </div>
          <div className="space-y-2">
            {groups.map(({ groupId, cards }) => {
              const name = cards[0].name.toUpperCase();
              return (
                <div key={groupId} className="grid gap-2 border-b-2 border-[var(--ballpark-panel-border)] py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <strong>{cards.length > 1 ? `${name} — ${cards.length} CARDS` : name}</strong>
                  {cards.length > 1 ? (
                    <select
                      aria-label={`PICK A ${name} CARD`}
                      value={pickedVersionByGroup[groupId] ?? cards[0].playerId}
                      onChange={(event) => setPickedVersionByGroup((current) => ({ ...current, [groupId]: event.target.value }))}
                      className="border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-action-green)] p-2 font-bold"
                    >
                      {cards.map((card) => <option key={card.playerId} value={card.playerId}>{card.versionLabel.toUpperCase()}</option>)}
                    </select>
                  ) : <span className="text-sm text-[var(--ballpark-brass)]">{cards[0].versionLabel}</span>}
                  <button type="button" onClick={() => setRemovedPlayerIds((current) => new Set(current).add(
                    cards.find((card) => card.playerId === pickedVersionByGroup[groupId])?.playerId ?? cards[0].playerId,
                  ))} className="text-sm font-bold text-[var(--ballpark-brass)] hover:underline">REMOVE</button>
                </div>
              );
            })}
          </div>
          {removedPlayerIds.size > 0 ? (
            <div className="space-y-2 border-4 border-[var(--ballpark-panel-border)] p-3">
              <strong>HAND ADD</strong>
              <p className="text-sm font-bold">THESE ARE PLAYERS YOU REMOVED. ADD BACK ANYONE YOU STILL WANT.</p>
              {[...removedPlayerIds].map((playerId) => {
                const removed = players.find((player) => player.playerId === playerId);
                if (!removed) return null;
                return (
                  <div key={playerId} className="flex items-center justify-between gap-3">
                    <span>{removed.name.toUpperCase()} — {removed.versionLabel}</span>
                    <button type="button" onClick={() => setRemovedPlayerIds((current) => {
                      const next = new Set(current);
                      next.delete(playerId);
                      return next;
                    })} className="text-sm font-bold text-[var(--ballpark-brass)] hover:underline">ADD BACK</button>
                  </div>
                );
              })}
            </div>
          ) : null}
          <p className="border-4 border-[var(--ballpark-panel-border)] p-3 font-bold" aria-live="polite">
            {checking ? 'CHECKING…' : proof?.message ?? 'THE ROOM CHECK DID NOT FINISH.'}
          </p>
        </>)}

        {setupCard('CLUBS', <div className="space-y-3">
          {clubs.map((club, index) => (
            <details key={club.teamId} className="border-4 border-[var(--ballpark-panel-border)] p-3">
              <summary className="cursor-pointer font-bold">SEAT {index + 1} · {club.teamName.toUpperCase()} · {club.gmName.toUpperCase() || 'NAME NEEDED'}</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-bold">GM NAME<input aria-label={`${club.teamName} GM NAME`} value={club.gmName} onChange={(event) => updateClub(club.teamId, { gmName: event.target.value })} className="mt-1 w-full border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-action-green)] p-2" /></label>
                <label className="text-xs font-bold">SEAT<select aria-label={`${club.teamName} SEAT`} value={club.seatMode} onChange={(event) => updateClub(club.teamId, { seatMode: event.target.value as SnakeSetupClub['seatMode'] })} className="mt-1 w-full border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-action-green)] p-2"><option value="hotseat">HOTSEAT</option><option value="companion">COMPANION</option></select></label>
                <label className="text-xs font-bold">TEAM STYLE<input aria-label={`${club.teamName} TEAM STYLE`} value={club.archetype} onChange={(event) => updateClub(club.teamId, { archetype: event.target.value })} className="mt-1 w-full border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-action-green)] p-2" /></label>
              </div>
            </details>
          ))}
        </div>)}

        {setupCard('ORDER', <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-bold">DRAFT SEED<input aria-label="DRAFT SEED" value={seed} onChange={(event) => setSeed(event.target.value)} className="mt-1 block border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-action-green)] p-2" /><span className="mt-1 block">THIS CODE MAKES THE SAME SHUFFLE AGAIN.</span></label>
            <button type="button" onClick={shuffleOrder} className="border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-brass)] px-4 py-2 font-bold text-black">SHUFFLE</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {order.map((teamId, index) => <button key={teamId} type="button" onClick={() => tapOrder(teamId)} aria-pressed={swapFirst === teamId} className="border-4 border-[var(--ballpark-panel-border)] p-3 text-left font-bold">{index + 1}. {clubById.get(teamId)?.teamName.toUpperCase() ?? teamId}</button>)}
          </div>
          <p className="font-bold text-[var(--ballpark-brass)]">R1: 1→8 · R2: 8→1</p>
          <p className="text-sm font-bold">THE ORDER REVERSES EACH ROUND.</p>
          {order.length > 1 ? <p className="text-sm font-bold">{clubById.get(order.at(-1)!)?.teamName.toUpperCase()} PICKS TWICE AT THE TURN. {clubById.get(order[0])?.teamName.toUpperCase()} PICKS TWICE AT THE NEXT TURN.</p> : null}
        </>)}

        {setupCard('GO', <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="font-bold">{checking ? 'CHECKING…' : proof?.feasible ? 'THE ROOM IS READY.' : proof?.message ?? 'THE ROOM IS NOT READY.'}</p>
          <button type="button" disabled={checking || !proof?.feasible} onClick={() => void startDraft()} className="border-4 border-[var(--ballpark-chalk)] bg-[var(--ballpark-brass)] px-6 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-40">START THE DRAFT</button>
        </div>)}
      </div>
    </main>
  );
}

export default SnakeDraftSetup;
