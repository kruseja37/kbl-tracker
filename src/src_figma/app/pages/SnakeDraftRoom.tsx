import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import {
  auctionMarginalTaxWithCaps,
  normalizeAuctionLuxuryCapsForLeagueSize,
} from '../../../engines/auctionLuxuryTax';
import { computeOwnValue } from '../../../engines/auctionMarketModel';
import { derivePickValueChart } from '../../../engines/leagueConstruction';
import {
  createFarmSnakeSession,
  executeFarmGuidePackage,
  FARM_SNAKE_SESSION_NUMBER,
  farmPickSalary,
  farmSlotPickValueChart,
  searchFarmGuidePackage,
} from '../../../engines/snakeFarmSlots';
import { evaluateSnakeLegalFinish, evaluateSnakePlan, evaluateSnakePlanWhatIf } from '../../../engines/snakeEconomics';
import { applySnakePickWithCorrection, restoreLatestSnakeCorrection } from '../../../engines/snakeSession';
import { primeSnakeGuideSeatingProof } from '../../../engines/snakeGuideTrade';
import type { SimultaneousSnakeSeatingInput } from '../../../engines/snakeSeatingProof';
import { unavailableVersionPlayerIds } from '../../../engines/snakeVersioning';
import { rosterNeedBreakdown, toRosterSlotPlayer } from '../../../engines/rosterNeed';
import { assembleBoard } from '../../../engines/rosterIntelligencePayload';
import * as phaseFlags from '../../../utils/franchisePhase2Flags';
import { useLeagueBuilderData, toConstructionPlayer } from '../../hooks/useLeagueBuilderData';
import { SnakeDraftRoomView, type SnakeReviewCandidate } from '../components/snake/SnakeDraftRoomView';
import { PrivateDesk } from '../components/snake/desk/PrivateDesk';
import {
  buildAdvisorLog,
  boardSlotPosition,
  buildSeededSeatBoard,
  buildTaxCoreRows,
  isCandidateEligibleForBoardSlot,
  reconcileBoardAvailability,
  type AdvisorLogEntry,
  type DeskCandidate,
} from '../components/snake/desk/deskModel';
import {
  buildDeskRoomPlayer,
  buildRationalSeats,
  fitWord,
  openRosterSlots,
  rationalRisksForRoom,
  resolveLockedSeat,
  updateSessionSeatBoard,
} from '../components/snake/desk/deskRoomModel';
import type { DeskWhatIf } from '../components/snake/desk/WhatIfSandbox';
import type { SnakeBoardSlotId, SnakeSeatBoardRecord } from '../../../utils/leagueBuilderStorage';
import { SnakeCommissionerTrade } from '../components/snake/trade/SnakeCommissionerTrade';
import { CompanionApprovalCard } from '../components/snake/companion/CompanionApprovalCard';
import { SnakeTradeGuide } from '../components/snake/trade/SnakeTradeGuide';
import {
  executeAskedPickTrade,
  guideForAskedPick,
  type ExecutedAskedPickTrade,
} from '../components/snake/trade/tradeGuideModel';
import { FarmPrivateDesk } from '../components/snake/farm/FarmPrivateDesk';
import { buildFarmFogCard, buildFarmScoutPressure, rankFarmFogCards } from '../components/snake/farm/farmRoomModel';
import { buildFarmAuctionPool, FARM_AUCTION_ROSTER_SLOTS_PER_TEAM, type FarmAuctionPool } from '../../../utils/farmAuctionPool';
import { computeFarmTierCap, computeMlbToFarmCarryover } from '../../../utils/farmAuctionWallet';
import {
  getScoutProfilesForLeague,
  saveMlbDraftRoomSession,
  resolveLeagueSalaryCap,
  type LeagueBuilderScoutProfile,
} from '../../../utils/leagueBuilderStorage';
import type { ProspectScoutDescriptor } from '../../../utils/prospectScoutingDraftEngine';
import { buildLiveScoutPool } from '../utils/draftStaffingPersistence';
import { commitCompletedSnakeFarmSessionToLeagueRosters } from '../../../utils/leagueBuilderAuctionPipeline';
import { staffHireRouteForLeague } from '../utils/draftRouting';
import { loadSnakeSoundsEnabled, saveSnakeSoundsEnabled } from '../../utils/snakeSounds';

const SEASON_NUMBER = 1;

export function snakeRoomMissingLegCopy(input: {
  league: boolean;
  pool: boolean;
  session: boolean;
}): string {
  const missing = [
    !input.league ? 'LEAGUE' : null,
    !input.pool ? 'SAVED DRAFT POOL' : null,
    !input.session ? 'DRAFT SESSION' : null,
  ].filter((value): value is string => Boolean(value));
  const subject = missing.length > 1
    ? `${missing.slice(0, -1).join(', ')} AND ${missing.at(-1)}`
    : missing[0] ?? 'ROOM DATA';
  return `THE ${subject} ${missing.length === 1 ? 'IS' : 'ARE'} MISSING. GO BACK TO SNAKE DRAFT SETUP AND PRESS START THE DRAFT AGAIN.`;
}

function isSnakeRoomEnabled(): boolean {
  const maybeEnabled = (phaseFlags as typeof phaseFlags & { isSnakeDraftV1Enabled?: () => boolean }).isSnakeDraftV1Enabled;
  return maybeEnabled?.() ?? false;
}

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function scoutDescriptor(profile: LeagueBuilderScoutProfile): ProspectScoutDescriptor {
  return {
    scoutId: profile.id,
    scoutName: profile.name,
    specialties: profile.specialties as ProspectScoutDescriptor['specialties'],
    weaknesses: profile.weaknesses as ProspectScoutDescriptor['weaknesses'],
  };
}

function FarmSnakeRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    leagues, teams, players, isLoading, error, getMlbDraftSession, saveMlbDraftSession, getRoster,
  } = useLeagueBuilderData();
  const requestedLeagueId = useMemo(() => new URLSearchParams(location.search).get('leagueId'), [location.search]);
  const league = useMemo(() => leagues.find((row) => row.id === requestedLeagueId) ?? null, [leagues, requestedLeagueId]);
  const leagueTeams = useMemo(() => league?.teamIds.flatMap((id) => {
    const team = teams.find((row) => row.id === id);
    return team ? [team] : [];
  }) ?? [], [league, teams]);
  const [session, setSession] = useState<Awaited<ReturnType<typeof getMlbDraftSession>>>(null);
  const [farmPool, setFarmPool] = useState<FarmAuctionPool | null>(null);
  const [farmBudgets, setFarmBudgets] = useState<Record<string, number>>({});
  const [scouts, setScouts] = useState<Record<string, ProspectScoutDescriptor | undefined>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadDone, setLoadDone] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [soundsEnabled, setSoundsEnabled] = useState(loadSnakeSoundsEnabled);
  const [farmAdvisorLogBySeat, setFarmAdvisorLogBySeat] = useState<Record<string, AdvisorLogEntry[]>>({});

  const loadFarm = useCallback(async () => {
    if (!league || leagueTeams.length === 0) return;
    setLoadDone(false);
    setActionError(null);
    try {
      const [storedFarm, storedMlb] = await Promise.all([
        getMlbDraftSession(league.id, FARM_SNAKE_SESSION_NUMBER),
        getMlbDraftSession(league.id, SEASON_NUMBER),
      ]);
      const stored = storedFarm ?? storedMlb;
      if (!stored) throw new Error('Finish the MLB snake draft before opening the farm room.');
      if (!storedFarm && stored.currentPickIndex < stored.pickOrder.length) {
        throw new Error('Finish the MLB snake draft before opening the farm room.');
      }
      const savedProfiles = await getScoutProfilesForLeague(league.id);
      const fallback = buildLiveScoutPool(league.id, leagueTeams);
      const nextScouts = Object.fromEntries(leagueTeams.map((team) => {
        const profile = savedProfiles.find((row) => row.teamId === team.id);
        const generated = fallback.find((row) => row.teamId === team.id);
        return [team.id, profile ? scoutDescriptor(profile) : generated ? {
          scoutId: generated.id,
          scoutName: generated.name,
          specialties: generated.specialties as ProspectScoutDescriptor['specialties'],
          weaknesses: generated.weaknesses as ProspectScoutDescriptor['weaknesses'],
        } : undefined];
      }));
      const seed = storedFarm ? stored.seed : `${stored.seed}:farm`;
      const nextPool = buildFarmAuctionPool({
        leagueId: league.id,
        seasonNumber: SEASON_NUMBER,
        seed,
        teamDraftOrder: leagueTeams.map((team) => ({ teamId: team.id, teamName: team.name })),
        scoutsByTeamId: nextScouts,
      });
      const farmTierCap = computeFarmTierCap(nextPool.auctionPlayers.map((row) => row.iv));
      const salaryById = new Map(players.map((player) => [player.id, player.settledSalary ?? player.salary ?? 0]));
      const rosters = await Promise.all(leagueTeams.map(async (team) => [team.id, await getRoster(team.id)] as const));
      const nextBudgets = Object.fromEntries(rosters.map(([teamId, roster]) => {
        const mlbSpent = (roster?.mlbRoster ?? []).reduce((sum, id) => sum + (salaryById.get(id) ?? 0), 0);
        const farmCommitted = (roster?.farmRoster ?? []).reduce((sum, id) => sum + (salaryById.get(id) ?? 0), 0);
        const carryover = computeMlbToFarmCarryover(Math.max(0, resolveLeagueSalaryCap(league) - mlbSpent));
        return [teamId, Math.max(0, farmTierCap - farmCommitted) + carryover];
      }));

      let nextSession = stored;
      if (!storedFarm) {
        const firstRoundOrder = stored.pickOrder.slice(0, leagueTeams.length).map((slot) => slot.teamId);
        const order = firstRoundOrder.length === leagueTeams.length ? firstRoundOrder : leagueTeams.map((team) => team.id);
        const now = new Date().toISOString();
        nextSession = await saveMlbDraftSession(createFarmSnakeSession({
          mlbSession: stored,
          teamOrder: order,
          existingFarmRosterCountsByTeamId: Object.fromEntries(rosters.map(([teamId, roster]) => [teamId, roster?.farmRoster.length ?? 0])),
          farmBudgetsByTeamId: nextBudgets,
          prospectIds: nextPool.prospects.map((prospect) => prospect.id),
          now,
        }));
      }
      setScouts(nextScouts);
      setFarmBudgets(nextBudgets);
      setFarmPool(nextPool);
      setSession(nextSession);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoadDone(true);
    }
  }, [getMlbDraftSession, getRoster, league, leagueTeams, players, saveMlbDraftSession]);

  useEffect(() => { void loadFarm(); }, [loadFarm]);
  const unavailable = useMemo(() => new Set(session?.completedPicks.map((pick) => pick.playerId) ?? []), [session]);
  const currentSlot = session?.pickOrder[session.currentPickIndex]
    ?? (session && session.currentPickIndex === session.pickOrder.length ? session.pickOrder.at(-1) ?? null : null);
  const currentTeam = leagueTeams.find((team) => team.id === currentSlot?.teamId) ?? null;
  const cards = useMemo(() => farmPool && currentTeam ? rankFarmFogCards(farmPool.prospects
    .filter((prospect) => !unavailable.has(prospect.id))
    .map((prospect) => buildFarmFogCard({ prospect, scout: scouts[currentTeam.id], seed: session?.seed ?? '' }))) : [],
  [currentTeam, farmPool, scouts, session?.seed, unavailable]);
  useEffect(() => {
    if (!selectedId || unavailable.has(selectedId)) setSelectedId(cards[0]?.id ?? null);
  }, [cards, selectedId, unavailable]);
  const selected = cards.find((card) => card.id === selectedId) ?? cards[0] ?? null;
  const rostersByTeamId = useMemo(() => Object.fromEntries(leagueTeams.map((team) => [team.id,
    (session?.completedPicks ?? []).filter((pick) => pick.teamId === team.id).flatMap((pick) => {
      const prospect = farmPool?.prospects.find((row) => row.id === pick.playerId);
      return prospect ? [{ id: prospect.id, name: `${prospect.firstName} ${prospect.lastName}`, position: prospect.primaryPosition }] : [];
    }),
  ])), [farmPool, leagueTeams, session]);
  const ownedPicksByTeamId = useMemo(() => Object.fromEntries(leagueTeams.map((team) => [team.id,
    (session?.pickOrder ?? []).slice(session?.currentPickIndex ?? 0).filter((slot) => slot.teamId === team.id).map((slot) => slot.pick),
  ])), [leagueTeams, session]);
  const pressure = selected ? buildFarmScoutPressure({ card: selected, publicRosters: rostersByTeamId, farmTarget: FARM_AUCTION_ROSTER_SLOTS_PER_TEAM }) : null;
  useEffect(() => {
    if (!currentTeam || !selected || !pressure || !session) return;
    setFarmAdvisorLogBySeat((current) => ({
      ...current,
      [currentTeam.id]: buildAdvisorLog(current[currentTeam.id] ?? [], [{
        key: `farm-pressure:${session.currentPickIndex}:${selected.id}`,
        playerId: selected.id,
        text: pressure,
        actionable: true,
      }]),
    }));
  }, [currentTeam, pressure, selected, session]);
  const persist = useCallback(async (next: NonNullable<typeof session>) => setSession(await saveMlbDraftRoomSession(next)), []);
  const recordPick = useCallback(async (playerId: string) => {
    if (!session || !currentSlot || !farmPool) return;
    const prospect = farmPool.prospects.find((row) => row.id === playerId);
    if (!prospect) throw new Error('That prospect is no longer in the farm pool.');
    await persist(applySnakePickWithCorrection({
      session,
      player: { playerId: prospect.id },
      settledSalary: farmPickSalary(session, currentSlot.pick),
      marginalTax: 0,
      versionPool: farmPool.prospects.map((row) => ({ playerId: row.id })),
    }));
  }, [currentSlot, farmPool, persist, session]);
  const finishFarm = useCallback(async () => {
    if (!league || !session || !farmPool || session.currentPickIndex < session.pickOrder.length) return;
    await commitCompletedSnakeFarmSessionToLeagueRosters({ leagueId: league.id, session, pool: farmPool });
    navigate(staffHireRouteForLeague(league));
  }, [farmPool, league, navigate, session]);
  const pickValueChart = useMemo(() => session ? farmSlotPickValueChart(session) : [], [session]);
  const askTradeGuide = useCallback((buyerTeamId: string, targetPick: number) => {
    if (!session) return { message: `No legal guide trade reaches pick ${targetPick}.`, proposal: null, nextPickMoves: [] };
    const answer = searchFarmGuidePackage({
      session,
      buyerTeamId,
      targetPick,
      farmBudgetsByTeamId: farmBudgets,
      remainingUniqueProspects: cards.length,
    });
    return { message: answer.message, proposal: answer.package, nextPickMoves: [] };
  }, [cards.length, farmBudgets, session]);
  const executeTrade = useCallback(async (proposal: Parameters<typeof executeFarmGuidePackage>[0]['proposal']): Promise<ExecutedAskedPickTrade> => {
    if (!session) return { valid: false, message: 'The draft moved on — refresh.', session: null, livePickMoved: false, receipts: [] };
    const before = session.pickOrder[session.currentPickIndex]?.teamId ?? null;
    const result = executeFarmGuidePackage({ session, proposal, farmBudgetsByTeamId: farmBudgets, remainingUniqueProspects: cards.length });
    if (!result.valid || !result.session) return { valid: false, message: result.message, session: null, livePickMoved: false, receipts: [] };
    await persist(result.session);
    const after = result.session.pickOrder[result.session.currentPickIndex]?.teamId ?? null;
    return {
      valid: true,
      message: result.message,
      session: result.session,
      livePickMoved: before !== after,
      receipts: [proposal.buyerTeamId, proposal.sellerTeamId].map((teamId) => ({
        teamId,
        text: `THE FARM PICK TRADE IS RECORDED.`,
      })),
    };
  }, [cards.length, farmBudgets, persist, session]);
  const teamSpent = currentTeam && session ? session.completedPicks
    .filter((pick) => pick.teamId === currentTeam.id)
    .reduce((sum, pick) => sum + farmPickSalary(session, pick.pick), 0) : 0;

  if (!isSnakeRoomEnabled()) return <main className="ballpark-page"><p>THE ROOM IS NOT ENABLED FOR THIS BUILD.</p></main>;
  if (isLoading || !loadDone) return <main className="ballpark-page"><p>OPENING THE FARM ROOM…</p></main>;
  if (error || actionError) return <main className="ballpark-page"><h1>THE FARM ROOM COULD NOT OPEN</h1><p className="uppercase">{actionError ?? error}</p></main>;
  if (!league || !session || !farmPool || !currentSlot) return <main className="ballpark-page"><p>THE FARM ROOM IS NOT READY.</p></main>;
  return <SnakeDraftRoomView
    teams={leagueTeams.map((team) => ({ id: team.id, name: team.name, abbreviation: team.abbreviation, colors: team.colors, logoUrl: team.logoUrl }))}
    order={session.pickOrder.map((slot, index, all) => ({ pick: slot.pick, teamId: slot.teamId, endpoint: all[index - 1]?.teamId === slot.teamId || all[index + 1]?.teamId === slot.teamId }))}
    currentPickIndex={session.currentPickIndex}
    ticker={session.completedPicks.slice(-8).reverse().map((pick) => ({ id: `${pick.pick}-${pick.playerId}`, teamId: pick.teamId, text: `${leagueTeams.find((team) => team.id === pick.teamId)?.name ?? 'CLUB'} SELECTED ${farmPool.prospects.find((row) => row.id === pick.playerId)?.firstName ?? 'A PROSPECT'}` }))}
    rostersByTeamId={rostersByTeamId}
    ownedPicksByTeamId={ownedPicksByTeamId}
    activeSeatId={currentTeam?.id ?? null}
    candidate={selected ? { id: selected.id, name: selected.name, position: selected.position, consequence: `PICK ${currentSlot.pick} PAYS $${farmPickSalary(session, currentSlot.pick).toLocaleString()} — WHOEVER TAKES IT.`, privateNote: selected.scoutsCall } : null}
    paused={Boolean(session.paused)} soundsEnabled={soundsEnabled} correctionAvailable={Boolean(session.correctionSnapshots?.[0])}
    practiceMode={false}
    privateDesk={<FarmPrivateDesk cards={cards} selectedId={selected?.id ?? null} slotPick={currentSlot.pick} slotSalary={farmPickSalary(session, currentSlot.pick)} farmMoneyLeft={(farmBudgets[currentTeam?.id ?? ''] ?? 0) - teamSpent} advisorLog={farmAdvisorLogBySeat[currentTeam?.id ?? ''] ?? []} onChoose={setSelectedId} />}
    tradeGuide={(showHelp) => <SnakeTradeGuide showHelp={showHelp} teams={leagueTeams.map((team) => ({ id: team.id, name: team.name }))} pickValueChart={pickValueChart} sessionRevision={session.revision ?? 0} onAsk={askTradeGuide} />}
    commissionerTrade={(showHelp) => <SnakeCommissionerTrade showHelp={showHelp} teams={leagueTeams.map((team) => ({ id: team.id, name: team.name }))} ownedPicksByTeamId={ownedPicksByTeamId} sessionRevision={session.revision ?? 0} onAsk={askTradeGuide} onExecute={executeTrade} />}
    roomHelpNotes={['SLOT SALARIES STAY WITH THE PICKS.']}
    onPauseChange={(paused) => { void persist({ ...session, paused, revision: (session.revision ?? 0) + 1 }); }}
    onRecordPick={recordPick}
    onCorrectLatest={() => { void persist(restoreLatestSnakeCorrection(session)); }}
    onSoundsEnabledChange={(enabled) => { setSoundsEnabled(enabled); saveSnakeSoundsEnabled(enabled); }}
    onDraftComplete={finishFarm}
  />;
}

function MlbSnakeDraftRoom() {
  const location = useLocation();
  const {
    leagues,
    teams,
    players,
    isLoading,
    error,
    getRegisteredPool,
    getMlbDraftSession,
    saveMlbDraftSession,
  } = useLeagueBuilderData();
  const requestedLeagueId = useMemo(() => new URLSearchParams(location.search).get('leagueId'), [location.search]);
  const league = useMemo(
    () => leagues.find((entry) => entry.id === requestedLeagueId) ?? leagues[0] ?? null,
    [leagues, requestedLeagueId],
  );
  const leagueTeams = useMemo(() => league?.teamIds.flatMap((id) => {
    const team = teams.find((entry) => entry.id === id);
    return team ? [team] : [];
  }) ?? [], [league, teams]);
  const [pool, setPool] = useState<Awaited<ReturnType<typeof getRegisteredPool>>>(null);
  const [session, setSession] = useState<Awaited<ReturnType<typeof getMlbDraftSession>>>(null);
  const [loadDone, setLoadDone] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [soundsEnabled, setSoundsEnabled] = useState(loadSnakeSoundsEnabled);
  const [advisorLogBySeat, setAdvisorLogBySeat] = useState<Record<string, AdvisorLogEntry[]>>({});
  const [tradeReceiptsBySeat, setTradeReceiptsBySeat] = useState<Record<string, AdvisorLogEntry[]>>({});
  const [whatIf, setWhatIf] = useState<{ view: DeskWhatIf; board: SnakeSeatBoardRecord } | null>(null);
  const [livePickMoveRevision, setLivePickMoveRevision] = useState(0);
  const [privateDeskRevealed, setPrivateDeskRevealed] = useState(false);
  const [privateDeskReady, setPrivateDeskReady] = useState(false);

  useEffect(() => {
    if (!privateDeskRevealed) {
      setPrivateDeskReady(false);
      return;
    }
    const ready = () => setPrivateDeskReady(true);
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(ready);
      return () => window.cancelIdleCallback(id);
    }
    const id = globalThis.setTimeout(ready, 0);
    return () => globalThis.clearTimeout(id);
  }, [privateDeskRevealed]);

  const loadSession = useCallback(async () => {
    if (!league) return;
    setLoadDone(false);
    setActionError(null);
    try {
      const [nextPool, nextSession] = await Promise.all([
        getRegisteredPool(league.id),
        getMlbDraftSession(league.id, SEASON_NUMBER),
      ]);
      setPool(nextPool);
      setSession(nextSession);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoadDone(true);
    }
  }, [getMlbDraftSession, getRegisteredPool, league]);

  useEffect(() => { void loadSession(); }, [loadSession]);

  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const activePoolRows = useMemo(() => {
    const selected = session?.snakeSetup?.poolPlayerIds;
    if (!selected?.length) return pool?.players ?? [];
    const selectedIds = new Set(selected);
    return (pool?.players ?? []).filter((row) => selectedIds.has(row.id));
  }, [pool, session?.snakeSetup?.poolPlayerIds]);
  const poolById = useMemo(() => new Map(activePoolRows.map((row) => [row.id, row])), [activePoolRows]);
  const unavailable = useMemo(() => {
    const ids = new Set(session?.completedPicks.map((pick) => pick.playerId) ?? []);
    for (const id of unavailableVersionPlayerIds(session?.versionState)) ids.add(id);
    return ids;
  }, [session]);
  const currentSlot = session?.pickOrder[session.currentPickIndex] ?? null;
  const currentTeam = leagueTeams.find((team) => team.id === currentSlot?.teamId) ?? null;
  const currentLocked = useMemo(() => currentTeam && session
    ? resolveLockedSeat({ team: currentTeam, session })
    : null, [currentTeam, session]);
  const currentBoard = currentTeam ? session?.seatBoards?.[currentTeam.id] : null;
  const candidateId = useMemo(() => {
    const ranked = [
      ...(currentBoard?.rankings.global ?? []),
      ...Object.values(currentBoard?.slots ?? {}),
      ...activePoolRows.map((row) => row.id),
    ];
    return ranked.find((id) => !unavailable.has(id) && playerById.has(id) && poolById.has(id)) ?? null;
  }, [activePoolRows, currentBoard, playerById, poolById, unavailable]);

  const seatingPlayers = useMemo(() => activePoolRows.flatMap((row) => {
    const player = playerById.get(row.id);
    if (!player) return [];
    return [{
      playerId: player.id,
      price: row.iv,
      shape: toRosterSlotPlayer({
        primaryPosition: player.primaryPosition,
        secondaryPosition: player.secondaryPosition ?? null,
        traits: [player.trait1, player.trait2],
      }),
      construction: toConstructionPlayer(player),
    }];
  }), [activePoolRows, playerById]);
  const seatingById = useMemo(() => new Map(seatingPlayers.map((player) => [player.playerId, player])), [seatingPlayers]);
  const pickValueChart = useMemo(() => derivePickValueChart(activePoolRows.map((row) => row.iv))
    .slice(0, session?.pickOrder.length ?? 0), [activePoolRows, session?.pickOrder.length]);
  const seatingProofInput = useMemo<SimultaneousSnakeSeatingInput | null>(() => {
    if (!session || !pool) return null;
    return {
      clubs: leagueTeams.map((team) => {
        const completed = session.completedPicks.filter((pick) => pick.teamId === team.id);
        const roster = completed.flatMap((pick) => {
          const row = seatingById.get(pick.playerId);
          return row ? [row] : [];
        });
        const committedSpent = completed.reduce((sum, pick) => (
          sum + (pick.settledSalary ?? poolById.get(pick.playerId)?.iv ?? 0) + (pick.marginalTax ?? 0)
        ), 0);
        return {
          teamId: team.id,
          roster,
          budgetRemaining: pool.tierCap - committedSpent,
          committedConstruction: roster.map((player) => player.construction),
          capIdentity: resolveLockedSeat({ team, session }).capIdentity,
        };
      }),
      pool: seatingPlayers.filter((player) => !unavailable.has(player.playerId)),
      baseCaps: pool.luxuryCaps,
      realTeamCount: leagueTeams.length,
      versionState: session.versionState,
    };
  }, [leagueTeams, pool, poolById, seatingById, seatingPlayers, session, unavailable]);
  useEffect(() => {
    if (!seatingProofInput) return;
    const run = () => { primeSnakeGuideSeatingProof(seatingProofInput); };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run);
      return () => window.cancelIdleCallback(id);
    }
    const id = globalThis.setTimeout(run, 0);
    return () => globalThis.clearTimeout(id);
  }, [seatingProofInput]);
  const deskRoomPlayers = useMemo(() => activePoolRows.flatMap((row) => {
    const player = playerById.get(row.id);
    const seating = seatingById.get(row.id);
    if (!player || !seating) return [];
    const deskPlayer = buildDeskRoomPlayer({ player, price: row.iv, seating });
    return deskPlayer ? [deskPlayer] : [];
  }), [activePoolRows, playerById, seatingById]);
  const deskRoomById = useMemo(() => new Map(deskRoomPlayers.map((player) => [player.playerId, player])), [deskRoomPlayers]);

  const candidate = useMemo<SnakeReviewCandidate | null>(() => {
    if (!candidateId || !session || !pool || !currentTeam) return null;
    const player = playerById.get(candidateId);
    const priced = poolById.get(candidateId);
    const model = seatingById.get(candidateId);
    if (!player || !priced || !model) return null;
    const teamPicks = session.completedPicks.filter((pick) => pick.teamId === currentTeam.id);
    const roster = teamPicks.flatMap((pick) => {
      const row = seatingById.get(pick.playerId);
      return row ? [row] : [];
    });
    const spent = teamPicks.reduce((sum, pick) => sum + (pick.settledSalary ?? poolById.get(pick.playerId)?.iv ?? 0), 0);
    const remaining = seatingPlayers.filter((row) => row.playerId !== candidateId && !unavailable.has(row.playerId));
    const bill = evaluateSnakeLegalFinish({
      currentRoster: [...roster, model],
      committedSpent: spent + priced.iv,
      availablePool: remaining,
      budget: pool.tierCap,
      baseCaps: pool.luxuryCaps,
      realTeamCount: leagueTeams.length,
      capIdentity: currentLocked?.capIdentity,
    });
    const blockReason = !bill.feasible
      ? 'THIS PICK LEAVES NO LEGAL 22.'
      : bill.legalFinishCushion < 0
        ? `YOU NEED $${Math.abs(Math.round(bill.legalFinishCushion)).toLocaleString()} MORE TO FINISH A LEGAL 22.`
        : null;
    return {
      id: player.id,
      name: fullName(player.firstName, player.lastName),
      position: player.primaryPosition,
      consequence: blockReason ?? `AFTER THIS PICK AND A LEGAL FINISH: $${Math.round(bill.legalFinishCushion).toLocaleString()} LEFT.`,
      blockReason,
    };
  }, [candidateId, currentLocked, currentTeam, leagueTeams.length, playerById, pool, poolById, seatingById, seatingPlayers, session, unavailable]);

  const rostersByTeamId = useMemo(() => Object.fromEntries(leagueTeams.map((team) => [
    team.id,
    (session?.completedPicks ?? []).filter((pick) => pick.teamId === team.id).flatMap((pick) => {
      const player = playerById.get(pick.playerId);
      return player ? [{ id: player.id, name: fullName(player.firstName, player.lastName), position: player.primaryPosition }] : [];
    }),
  ])), [leagueTeams, playerById, session]);
  const ownedPicksByTeamId = useMemo(() => Object.fromEntries(leagueTeams.map((team) => [
    team.id,
    (session?.pickOrder ?? []).slice(session?.currentPickIndex ?? 0).filter((slot) => slot.teamId === team.id).map((slot) => slot.pick),
  ])), [leagueTeams, session]);
  const ticker = useMemo(() => (session?.completedPicks ?? []).slice(-8).reverse().map((pick) => ({
    id: `${pick.round}-${pick.pick}-${pick.playerId}`,
    teamId: pick.teamId,
    text: `${(leagueTeams.find((team) => team.id === pick.teamId)?.name ?? 'CLUB').toUpperCase()} SELECTED ${(playerById.get(pick.playerId) ? fullName(playerById.get(pick.playerId)!.firstName, playerById.get(pick.playerId)!.lastName) : pick.playerId).toUpperCase()}`,
  })), [leagueTeams, playerById, session]);
  const latestPick = session?.completedPicks.at(-1);
  const currentBoardPlayerIds = new Set([
    ...(currentBoard?.rankings.global ?? []),
    ...Object.values(currentBoard?.slots ?? {}),
  ]);
  const privateSnipeKey = latestPick && currentBoardPlayerIds.has(latestPick.playerId)
    ? `${latestPick.pick}:${latestPick.playerId}`
    : null;

  const persist = useCallback(async (next: NonNullable<typeof session>) => {
    const saved = await saveMlbDraftRoomSession(next);
    setSession(saved);
  }, []);

  const acceptCompanionSession = useCallback((saved: NonNullable<typeof session>) => {
    setSession(saved);
  }, []);

  const deskState = useMemo(() => {
    if (!privateDeskReady || !session || !pool || !currentTeam) return null;
    const locked = currentLocked ?? resolveLockedSeat({ team: currentTeam, session });
    const caps = normalizeAuctionLuxuryCapsForLeagueSize(pool.luxuryCaps, leagueTeams.length);
    const seats = buildRationalSeats({ teams: leagueTeams, session, playersById: deskRoomById, budget: pool.tierCap });
    const ownSeat = seats.find((seat) => seat.teamId === currentTeam.id);
    if (!ownSeat) return null;
    const need = rosterNeedBreakdown(ownSeat.roster.map((player) => player.shape));
    const openSlots = openRosterSlots(session, currentTeam.id);
    const available = deskRoomPlayers.filter((player) => !unavailable.has(player.playerId));
    const risks = rationalRisksForRoom({
      session,
      askingTeamId: currentTeam.id,
      askedPlayerIds: available.map((player) => player.playerId),
      availablePlayers: available,
      seats,
      baseCaps: pool.luxuryCaps,
      realTeamCount: leagueTeams.length,
    });
    const riskById = new Map(risks.map((row) => [row.playerId, row]));
    const fitWorthById = new Map(deskRoomPlayers.map((player) => [player.playerId, computeOwnValue({
      iv: player.price,
      archetypeWeights: player.archetypeWeights,
      ownBandPriorities: locked.priorities,
      needBreakdown: need,
      shape: player.shape,
      openSlots,
    })]));
    const assembled = assembleBoard({
      candidates: deskRoomPlayers.map((player) => ({
        playerId: player.playerId,
        iv: fitWorthById.get(player.playerId) ?? player.price,
        candidate: player.stored,
        shape: player.shape,
      })),
      rosterPlayers: ownSeat.roster.flatMap((player) => playerById.get(player.playerId) ?? []),
      need,
    });
    const advisorWorthById = new Map(assembled.map((row) => [row.playerId, row.worth]));
    const candidates: DeskCandidate[] = deskRoomPlayers.map((player) => {
      const marginalTax = auctionMarginalTaxWithCaps(
        ownSeat.roster.map((entry) => entry.construction),
        player.construction,
        locked.capIdentity,
        caps,
      );
      const risk = riskById.get(player.playerId);
      return {
        id: player.playerId,
        name: fullName(player.stored.firstName, player.stored.lastName).toUpperCase(),
        position: player.position,
        advisorWorth: advisorWorthById.get(player.playerId) ?? player.price,
        iv: player.price,
        marginalTax,
        trueCost: player.price + marginalTax,
        archetypeChip: locked.archetypeName,
        fitWord: fitWord({ player, priorities: locked.priorities, need, openSlots }),
        risk: risk?.risk ?? 'SAFE_TO_WAIT',
        riskReason: risk
          ? `${risk.rationalBuyersBeforeTurn} ${risk.rationalBuyersBeforeTurn === 1 ? 'CLUB COULD' : 'CLUBS COULD'} TAKE HIM BEFORE YOUR TURN.`
          : 'NO CLUB IS LIKELY TO TAKE HIM BEFORE YOUR TURN.',
        legalFinishLine: '',
        construction: player.construction,
        drafted: unavailable.has(player.playerId),
      };
    });
    const seeded = currentBoard ? null : buildSeededSeatBoard(candidates);
    const availability = currentBoard
      ? reconcileBoardAvailability({ board: currentBoard, candidates, unavailablePlayerIds: unavailable })
      : seeded?.board
        ? reconcileBoardAvailability({ board: seeded.board, candidates, unavailablePlayerIds: unavailable })
        : null;
    const board = availability?.board ?? seeded?.board ?? null;
    const brokenSlots = availability?.brokenSlots ?? seeded?.brokenSlots ?? [];
    const planBill = board && brokenSlots.length === 0
      ? evaluateSnakePlan({
          boardPlayerIds: Object.values(board.slots),
          players: deskRoomPlayers,
          budget: pool.tierCap,
          baseCaps: pool.luxuryCaps,
          realTeamCount: leagueTeams.length,
          capIdentity: locked.capIdentity,
        })
      : null;
    const boardSlotByPlayerId = new Map(Object.entries(board?.slots ?? {}).map(([slotId, playerId]) => [playerId, slotId]));
    const displayCandidates = candidates.map((candidate): DeskCandidate => {
      const boardSlot = boardSlotByPlayerId.get(candidate.id);
      const targetSlot = Object.keys(board?.slots ?? {}).find((slotId) => (
        boardSlotPosition(slotId as SnakeBoardSlotId) === candidate.position
      ));
      return {
        ...candidate,
        boardFallout: boardSlot
          ? `FITS YOUR BOARD — ${boardSlot} SLOT`
          : targetSlot
            ? `NOT ON YOUR BOARD: TAKING HIM PUSHES YOUR ${targetSlot} PLAN DOWN TO A BACKUP.`
            : `NOT ON YOUR BOARD: CHOOSE A SLOT TO PRICE THE CHANGE.`,
      };
    });
    const candidateById = new Map(displayCandidates.map((candidate) => [candidate.id, candidate]));
    const legalFinishLineCache = new Map<string, string>();
    const legalFinishLineForCandidate = (candidateId: string): string => {
      const cached = legalFinishLineCache.get(candidateId);
      if (cached) return cached;
      const player = deskRoomById.get(candidateId);
      if (!player) return 'THIS PLAYER IS NO LONGER IN THE DRAFT POOL.';
      const finish = evaluateSnakeLegalFinish({
        currentRoster: [...ownSeat.roster, player],
        committedSpent: ownSeat.committedSpent + player.price,
        availablePool: available.filter((entry) => entry.playerId !== player.playerId),
        budget: pool.tierCap,
        baseCaps: pool.luxuryCaps,
        realTeamCount: leagueTeams.length,
        capIdentity: locked.capIdentity,
      });
      const line = !finish.feasible
        ? 'THIS PICK LEAVES NO LEGAL 22.'
        : finish.legalFinishCushion < 0
          ? `YOU ARE $${Math.abs(Math.round(finish.legalFinishCushion)).toLocaleString()} SHORT AFTER SAVING ENOUGH TO FINISH YOUR TEAM.`
          : `MONEY LEFT AFTER SAVING ENOUGH TO FINISH YOUR TEAM: $${Math.round(finish.legalFinishCushion).toLocaleString()}.`;
      legalFinishLineCache.set(candidateId, line);
      return line;
    };
    const slotDepth = Object.fromEntries(Object.keys(board?.slots ?? {}).map((slotId) => {
      const position = boardSlotPosition(slotId as SnakeBoardSlotId)
        ?? candidateById.get(board?.slots[slotId as SnakeBoardSlotId] ?? '')?.position;
      const ranked = position ? board?.rankings.byPosition?.[position] ?? [] : [];
      return [slotId, ranked.filter((id) => !unavailable.has(id)).length];
    }));
    const activeLog: AdvisorLogEntry[] = [
      ...(availability?.events ?? []).map((event) => {
        const gone = candidateById.get(event.gonePlayerId)?.name ?? event.gonePlayerId;
        const promoted = event.promotedPlayerId ? candidateById.get(event.promotedPlayerId)?.name : undefined;
        return {
          key: `backfill:${event.slotId}:${event.gonePlayerId}`,
          playerId: event.gonePlayerId,
          text: promoted
            ? `${gone} GONE — ${promoted} STEPS UP AS YOUR ${event.slotId} PLAN.`
            : `${gone} GONE — YOUR ${event.slotId} PLAN IS BROKEN.`,
          actionable: true,
        };
      }),
      ...brokenSlots.map((slotId) => ({
        key: `broken:${slotId}`,
        text: `YOUR ${slotId} PLAN IS BROKEN — YOUR RANKING HAS NO AVAILABLE NAME.`,
        actionable: true,
      })),
      ...Object.entries(board?.slots ?? {}).flatMap(([slotId, playerId]) => {
        const risk = riskById.get(playerId);
        const player = candidateById.get(playerId);
        return risk?.risk === 'LIKELY_GONE' && player
          ? [{
              key: `risk:${playerId}`,
              playerId,
              text: `${player.name} → LIKELY GONE — ${risk.rationalBuyersBeforeTurn} ${risk.rationalBuyersBeforeTurn === 1 ? 'CLUB COULD' : 'CLUBS COULD'} TAKE HIM BEFORE YOUR TURN.`,
              actionable: true,
            }]
          : [];
      }),
    ];
    return {
      locked,
      candidates: displayCandidates,
      board,
      brokenSlots,
      planBill,
      activeLog,
      availability,
      slotDepth,
      taxCoreRows: board ? buildTaxCoreRows({ candidates: displayCandidates, boardPlayerIds: Object.values(board.slots), caps }) : [],
      legalFinishLineForCandidate,
    };
  }, [currentBoard, currentLocked, currentTeam, deskRoomById, deskRoomPlayers, leagueTeams, playerById, pool, privateDeskReady, session, unavailable]);

  useEffect(() => {
    if (!session || !currentTeam || !deskState?.board) return;
    const needsSeed = !currentBoard;
    const needsBackfill = Boolean(deskState.availability && deskState.availability.board !== currentBoard);
    if (!needsSeed && !needsBackfill) return;
    void persist(updateSessionSeatBoard(session, currentTeam.id, deskState.board)).catch((cause) => {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    });
  }, [currentBoard, currentTeam, deskState, persist, session]);

  useEffect(() => {
    if (!currentTeam || !deskState) return;
    setAdvisorLogBySeat((current) => {
      const previous = current[currentTeam.id] ?? [];
      const next = buildAdvisorLog(previous, deskState.activeLog);
      return JSON.stringify(previous) === JSON.stringify(next) ? current : { ...current, [currentTeam.id]: next };
    });
  }, [currentTeam, deskState]);

  useEffect(() => { setWhatIf(null); }, [currentTeam?.id, session?.currentPickIndex]);

  const reorderRanking = useCallback(async (position: DeskCandidate['position'], orderedIds: readonly string[]) => {
    if (!session || !currentTeam || !deskState?.board) return;
    const frozen = new Set(deskState.board.rankings.frozenPlayerIds ?? []);
    for (const id of orderedIds) frozen.add(id);
    const board: SnakeSeatBoardRecord = {
      ...deskState.board,
      rankings: {
        ...deskState.board.rankings,
        byPosition: { ...deskState.board.rankings.byPosition, [position]: [...orderedIds] },
        frozenPlayerIds: [...frozen],
      },
      revision: deskState.board.revision + 1,
    };
    await persist(updateSessionSeatBoard(session, currentTeam.id, board));
  }, [currentTeam, deskState, persist, session]);

  const startWhatIf = useCallback((slotId: SnakeBoardSlotId, playerId: string) => {
    if (!deskState?.board || !pool || !currentTeam || !session) return;
    const slots = { ...deskState.board.slots };
    const priorPlayerId = slots[slotId];
    const existingSlot = Object.entries(slots).find(([, id]) => id === playerId)?.[0] as SnakeBoardSlotId | undefined;
    const candidate = deskState.candidates.find((row) => row.id === playerId);
    const displaced = deskState.candidates.find((row) => row.id === priorPlayerId);
    if (!candidate || !displaced) return;
    slots[slotId] = playerId;
    if (existingSlot && existingSlot !== slotId) slots[existingSlot] = priorPlayerId;
    const legal = isCandidateEligibleForBoardSlot(slotId, candidate)
      && (!existingSlot || existingSlot === slotId || isCandidateEligibleForBoardSlot(existingSlot, displaced));
    const board = { ...deskState.board, slots, revision: deskState.board.revision + 1 };
    const bill = evaluateSnakePlanWhatIf({
      boardPlayerIds: Object.values(slots),
      players: deskRoomPlayers,
      budget: pool.tierCap,
      baseCaps: pool.luxuryCaps,
      realTeamCount: leagueTeams.length,
      capIdentity: deskState.locked.capIdentity,
    });
    setWhatIf({
      view: {
        slotId,
        playerId,
        planCost: bill.planCost,
        planTax: bill.planTax,
        planCushion: bill.planCushion,
        legal,
        legalityLine: legal ? 'THE CHOSEN BOARD SLOTS STILL WORK.' : `PLAN BROKEN — ${candidate.name} CANNOT FILL ${slotId}.`,
        legalFinishLine: deskState.legalFinishLineForCandidate(candidate.id),
      },
      board,
    });
  }, [currentTeam, deskRoomPlayers, deskState, leagueTeams.length, pool, session]);

  const keepWhatIf = useCallback(async () => {
    if (!whatIf || !session || !currentTeam) return;
    await persist(updateSessionSeatBoard(session, currentTeam.id, whatIf.board));
    setWhatIf(null);
  }, [currentTeam, persist, session, whatIf]);

  const recordPick = useCallback(async (playerId: string) => {
    if (!session || !pool || !currentTeam) return;
    const player = seatingById.get(playerId);
    const priced = poolById.get(playerId);
    if (!player || !priced) return;
    const existing = session.completedPicks.filter((pick) => pick.teamId === currentTeam.id).flatMap((pick) => {
      const row = seatingById.get(pick.playerId);
      return row ? [row.construction] : [];
    });
    const caps = normalizeAuctionLuxuryCapsForLeagueSize(pool.luxuryCaps, leagueTeams.length);
    const marginalTax = auctionMarginalTaxWithCaps(existing, player.construction, currentTeam.capIdentity, caps);
    const next = applySnakePickWithCorrection({
      session,
      player,
      settledSalary: priced.iv,
      marginalTax,
      versionPool: seatingPlayers,
    });
    setPrivateDeskRevealed(false);
    await persist(next);
  }, [currentTeam, leagueTeams.length, persist, pool, poolById, seatingById, seatingPlayers, session]);

  const setPaused = useCallback(async (paused: boolean) => {
    if (!session) return;
    await persist({ ...session, paused, revision: (session.revision ?? 0) + 1 });
  }, [persist, session]);
  const correctLatest = useCallback(async () => {
    if (!session?.correctionSnapshots?.[0]) return;
    const correctedTradeId = session.correctionSnapshots[0].action === 'trade' ? session.trades?.at(-1)?.id : null;
    const restored = restoreLatestSnakeCorrection(session);
    const liveOwnerBefore = session.pickOrder[session.currentPickIndex]?.teamId ?? null;
    const liveOwnerAfter = restored.pickOrder[restored.currentPickIndex]?.teamId ?? null;
    await persist(restored);
    if (correctedTradeId) {
      setTradeReceiptsBySeat((current) => Object.fromEntries(Object.entries(current).map(([teamId, entries]) => [
        teamId,
        entries.filter((entry) => !entry.key.startsWith(`trade:${correctedTradeId}:`)),
      ])));
      if (liveOwnerBefore !== liveOwnerAfter) setLivePickMoveRevision((revision) => revision + 1);
    }
  }, [persist, session]);

  const askTradeGuide = useCallback((buyerTeamId: string, targetPick: number) => {
    if (!session || !seatingProofInput) {
      return { message: `No legal guide trade reaches pick ${targetPick}.`, proposal: null, nextPickMoves: [] };
    }
    return guideForAskedPick({ session, pickValueChart, seatingProofInput, buyerTeamId, targetPick });
  }, [pickValueChart, seatingProofInput, session]);

  const executeTrade = useCallback(async (proposal: Parameters<typeof executeAskedPickTrade>[0]['proposal']): Promise<ExecutedAskedPickTrade> => {
    if (!session || !seatingProofInput) {
      return { valid: false, message: 'The draft moved on — refresh.', session: null, livePickMoved: false, receipts: [] };
    }
    const result = executeAskedPickTrade({ session, pickValueChart, seatingProofInput, proposal });
    if (!result.valid || !result.session) return result;
    try {
      await persist(result.session);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setActionError(message);
      return { valid: false, message: 'THE TRADE WAS NOT SAVED. TRY AGAIN.', session: null, livePickMoved: false, receipts: [] };
    }
    const tradeId = result.session.trades?.at(-1)?.id ?? `revision-${result.session.revision ?? 0}`;
    setTradeReceiptsBySeat((current) => {
      const next = { ...current };
      for (const receipt of result.receipts) {
        next[receipt.teamId] = [
          ...(next[receipt.teamId] ?? []),
          { key: `trade:${tradeId}:${receipt.teamId}`, text: receipt.text, actionable: true },
        ];
      }
      return next;
    });
    if (result.livePickMoved) setLivePickMoveRevision((revision) => revision + 1);
    return result;
  }, [persist, pickValueChart, seatingProofInput, session]);

  if (!isSnakeRoomEnabled()) return <main className="ballpark-page"><div className="ballpark-panel"><h1 className="ballpark-title">SNAKE DRAFT</h1><p className="mt-4">THE ROOM IS NOT ENABLED FOR THIS BUILD.</p></div></main>;
  if (isLoading || !loadDone) return <main className="ballpark-page"><p>OPENING THE ROOM…</p></main>;
  if (error || actionError) return <main className="ballpark-page"><div className="ballpark-panel"><h1 className="ballpark-title">THE ROOM COULD NOT OPEN</h1><p className="mt-4 uppercase">{actionError ?? error}</p></div></main>;
  if (!league || !pool || !session) return <main className="ballpark-page"><div className="ballpark-panel"><h1 className="ballpark-title">THE ROOM IS NOT READY</h1><p className="mt-4">{snakeRoomMissingLegCopy({ league: Boolean(league), pool: Boolean(pool), session: Boolean(session) })}</p></div></main>;

  return (
    <SnakeDraftRoomView
      teams={leagueTeams.map((team) => ({ id: team.id, name: team.name, abbreviation: team.abbreviation, colors: team.colors, logoUrl: team.logoUrl }))}
      order={session.pickOrder.map((slot, index, all) => ({
        pick: slot.pick,
        teamId: slot.teamId,
        endpoint: all[index - 1]?.teamId === slot.teamId || all[index + 1]?.teamId === slot.teamId,
      }))}
      currentPickIndex={session.currentPickIndex}
      ticker={ticker}
      rostersByTeamId={rostersByTeamId}
      ownedPicksByTeamId={ownedPicksByTeamId}
      activeSeatId={currentTeam?.id ?? null}
      candidate={candidate}
      paused={Boolean(session.paused)}
      soundsEnabled={soundsEnabled}
      correctionAvailable={Boolean(session.correctionSnapshots?.[0])}
      tradeRevision={session.trades?.length ?? 0}
      livePickMoveRevision={livePickMoveRevision}
      practiceMode={session.workflowVersion.toLowerCase().includes('practice')}
      privateSnipeKey={privateSnipeKey}
      dangerKey={candidate?.blockReason ? `${candidate.id}:${candidate.blockReason}` : null}
      privateDesk={deskState?.board ? ((showHelp) => (
        <PrivateDesk
          candidates={deskState.candidates}
          rankings={deskState.board!.rankings.byPosition ?? {}}
          boardSlots={deskState.board!.slots}
          brokenSlots={deskState.brokenSlots}
          planBill={deskState.planBill}
          advisorLog={[
            ...(tradeReceiptsBySeat[currentTeam?.id ?? ''] ?? []),
            ...(advisorLogBySeat[currentTeam?.id ?? ''] ?? []),
          ]}
          taxCoreRows={deskState.taxCoreRows}
          slotDepth={deskState.slotDepth}
          whatIf={whatIf?.view ?? null}
          showHelp={showHelp}
          resolveLegalFinishLine={deskState.legalFinishLineForCandidate}
          onReorder={(position, orderedIds) => { void reorderRanking(position, orderedIds); }}
          onStartWhatIf={startWhatIf}
          onKeepWhatIf={() => { void keepWhatIf(); }}
          onRevertWhatIf={() => setWhatIf(null)}
          tradeGuide={<SnakeTradeGuide
            showHelp={showHelp}
            teams={leagueTeams.map((team) => ({ id: team.id, name: team.name }))}
            fixedBuyerTeamId={currentTeam?.id ?? null}
            pickValueChart={pickValueChart}
            sessionRevision={session.revision ?? 0}
            onAsk={askTradeGuide}
          />}
        />
      )) : privateDeskRevealed ? <p className="font-bold" data-testid="private-draft-desk">CALCULATING THE DESK…</p> : null}
      tradeGuide={(showHelp) => <SnakeTradeGuide
        showHelp={showHelp}
        teams={leagueTeams.map((team) => ({ id: team.id, name: team.name }))}
        pickValueChart={pickValueChart}
        sessionRevision={session.revision ?? 0}
        onAsk={askTradeGuide}
      />}
      commissionerTrade={(showHelp) => <SnakeCommissionerTrade
        showHelp={showHelp}
        teams={leagueTeams.map((team) => ({ id: team.id, name: team.name }))}
        ownedPicksByTeamId={ownedPicksByTeamId}
        sessionRevision={session.revision ?? 0}
        onAsk={askTradeGuide}
        onExecute={executeTrade}
      />}
      roomHelpNotes={candidate ? ['THIS PLAYER CAME FROM YOUR SAVED BOARD ORDER.'] : []}
      companionApproval={<CompanionApprovalCard
        session={session}
        teams={leagueTeams.map((team) => ({ id: team.id, name: team.name }))}
        onChange={acceptCompanionSession}
      />}
      onPauseChange={(paused) => void setPaused(paused)}
      onRecordPick={recordPick}
      onCorrectLatest={correctLatest}
      onSoundsEnabledChange={(enabled) => { setSoundsEnabled(enabled); saveSnakeSoundsEnabled(enabled); }}
      onPrivateSeatRevealedChange={setPrivateDeskRevealed}
    />
  );
}

export default function SnakeDraftRoom() {
  const location = useLocation();
  return new URLSearchParams(location.search).get('phase') === 'farm'
    ? <FarmSnakeRoom />
    : <MlbSnakeDraftRoom />;
}
