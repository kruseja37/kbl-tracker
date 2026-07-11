import { useCallback, useEffect, useMemo, useState } from 'react';

import { auctionMarginalTaxWithCaps, normalizeAuctionLuxuryCapsForLeagueSize } from '../../../engines/auctionLuxuryTax';
import { derivePickValueChart } from '../../../engines/leagueConstruction';
import { evaluateSnakeLegalFinish, evaluateSnakePlan, evaluateSnakePlanWhatIf } from '../../../engines/snakeEconomics';
import type { SimultaneousSnakeSeatingInput, SnakeSeatingPlayer } from '../../../engines/snakeSeatingProof';
import { unavailableVersionPlayerIds } from '../../../engines/snakeVersioning';
import { rosterNeedBreakdown, toRosterSlotPlayer } from '../../../engines/rosterNeed';
import * as phaseFlags from '../../../utils/franchisePhase2Flags';
import { syncEngine } from '../../../utils/syncEngine';
import type { LeagueBuilderMlbDraftSession, SnakeBoardSlotId, SnakeSeatBoardRecord } from '../../../utils/leagueBuilderStorage';
import { useLeagueBuilderData, toConstructionPlayer } from '../../hooks/useLeagueBuilderData';
import { CompanionClaimScreen } from '../components/snake/companion/CompanionClaimScreen';
import { SnakeCompanionFrame } from '../components/snake/companion/SnakeCompanionFrame';
import { startCompanionFreshness } from '../components/snake/companion/companionFreshness';
import {
  approvedClaimForDevice,
  claimForDevice,
  COMPANION_STALE_COPY,
  submitCompanionClaim,
  updateApprovedCompanionBoard,
} from '../components/snake/companion/companionModel';
import { PrivateDesk } from '../components/snake/desk/PrivateDesk';
import {
  boardSlotPosition,
  buildTaxCoreRows,
  isCandidateEligibleForBoardSlot,
  type DeskCandidate,
} from '../components/snake/desk/deskModel';
import {
  buildDeskRoomPlayer,
  buildRationalSeats,
  fitWord,
  openRosterSlots,
  rationalRisksForRoom,
  resolveLockedSeat,
} from '../components/snake/desk/deskRoomModel';
import type { DeskWhatIf } from '../components/snake/desk/WhatIfSandbox';
import { SnakeTradeGuide } from '../components/snake/trade/SnakeTradeGuide';
import { guideForAskedPick as buildAskedPickGuide } from '../components/snake/trade/tradeGuideModel';

const SEASON_NUMBER = 1;
const DEVICE_KEY = 'kbl-snake-companion-device-id';
const FRESHNESS_MS = 5_000;

function snakeEnabled(): boolean {
  const enabled = (phaseFlags as typeof phaseFlags & { isSnakeDraftV1Enabled?: () => boolean }).isSnakeDraftV1Enabled;
  return enabled?.() ?? false;
}

function deviceId(): string {
  const saved = localStorage.getItem(DEVICE_KEY);
  if (saved) return saved;
  const created = globalThis.crypto?.randomUUID?.() ?? `companion-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(DEVICE_KEY, created);
  return created;
}

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export default function SnakeCompanion() {
  const {
    leagues, teams, players, isLoading, error,
    getRegisteredPool, getMlbDraftSession, saveMlbDraftSession,
  } = useLeagueBuilderData();
  const [ownDeviceId] = useState(deviceId);
  const [session, setSession] = useState<LeagueBuilderMlbDraftSession | null>(null);
  const [pool, setPool] = useState<Awaited<ReturnType<typeof getRegisteredPool>>>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [whatIf, setWhatIf] = useState<{ view: DeskWhatIf; board: SnakeSeatBoardRecord } | null>(null);

  const findDeviceSession = useCallback(async () => {
    for (const league of leagues) {
      const candidate = await getMlbDraftSession(league.id, SEASON_NUMBER);
      if (candidate && claimForDevice(candidate, ownDeviceId)) return candidate;
    }
    return null;
  }, [getMlbDraftSession, leagues, ownDeviceId]);

  useEffect(() => {
    if (isLoading) return;
    void findDeviceSession().then(setSession).catch((cause) => setMessage(cause instanceof Error ? cause.message : String(cause)));
  }, [findDeviceSession, isLoading]);

  const refreshSession = useCallback(async () => {
    await syncEngine.pull();
    if (session) {
      const fresh = await getMlbDraftSession(session.leagueId, session.seasonNumber);
      setSession(fresh);
    } else {
      setSession(await findDeviceSession());
    }
  }, [findDeviceSession, getMlbDraftSession, session]);

  useEffect(() => {
    return startCompanionFreshness({ pullAndRefresh: refreshSession, intervalMs: FRESHNESS_MS });
  }, [refreshSession]);

  useEffect(() => {
    if (!session) { setPool(null); return; }
    void getRegisteredPool(session.leagueId).then(setPool).catch((cause) => setMessage(cause instanceof Error ? cause.message : String(cause)));
  }, [getRegisteredPool, session?.leagueId]);

  const claimDesk = useCallback(async (gmName: string, roomCode: string) => {
    setMessage(null);
    for (const league of leagues) {
      const candidate = await getMlbDraftSession(league.id, SEASON_NUMBER);
      if (candidate?.snakeCompanions?.roomCode !== roomCode) continue;
      const result = submitCompanionClaim(candidate, { deviceId: ownDeviceId, gmName, roomCode });
      if (!result.ok || !result.session) { setMessage(result.message); return; }
      const saved = await saveMlbDraftSession(result.session);
      setSession(saved);
      setMessage(result.message);
      return;
    }
    setMessage('THAT ROOM CODE DOES NOT MATCH.');
  }, [getMlbDraftSession, leagues, ownDeviceId, saveMlbDraftSession]);

  const approved = session ? approvedClaimForDevice(session, ownDeviceId) : null;
  const activeClaim = session ? claimForDevice(session, ownDeviceId) : null;
  const league = leagues.find((entry) => entry.id === session?.leagueId) ?? null;
  const leagueTeams = useMemo(() => league?.teamIds.flatMap((id) => {
    const team = teams.find((entry) => entry.id === id);
    return team ? [team] : [];
  }) ?? [], [league, teams]);
  const team = leagueTeams.find((entry) => entry.id === approved?.teamId) ?? null;
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const activePoolRows = useMemo(() => {
    const selected = session?.snakeSetup?.poolPlayerIds;
    if (!selected?.length) return pool?.players ?? [];
    const selectedIds = new Set(selected);
    return (pool?.players ?? []).filter((row) => selectedIds.has(row.id));
  }, [pool, session?.snakeSetup?.poolPlayerIds]);
  const poolById = useMemo(() => new Map(activePoolRows.map((row) => [row.id, row])), [activePoolRows]);
  const seatingPlayers = useMemo(() => activePoolRows.flatMap((row): SnakeSeatingPlayer[] => {
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
  const seatingById = useMemo(() => new Map(seatingPlayers.map((entry) => [entry.playerId, entry])), [seatingPlayers]);
  const deskPlayers = useMemo(() => activePoolRows.flatMap((row) => {
    const player = playerById.get(row.id);
    const seating = seatingById.get(row.id);
    if (!player || !seating) return [];
    const built = buildDeskRoomPlayer({ player, price: row.iv, seating });
    return built ? [built] : [];
  }), [activePoolRows, playerById, seatingById]);
  const deskById = useMemo(() => new Map(deskPlayers.map((entry) => [entry.playerId, entry])), [deskPlayers]);
  const unavailable = useMemo(() => {
    const ids = new Set(session?.completedPicks.map((pick) => pick.playerId) ?? []);
    for (const id of unavailableVersionPlayerIds(session?.versionState)) ids.add(id);
    return ids;
  }, [session]);
  const board = team ? session?.seatBoards?.[team.id] ?? null : null;

  const deskState = useMemo(() => {
    if (!session || !pool || !team || !board) return null;
    const locked = resolveLockedSeat({ team, session });
    const caps = normalizeAuctionLuxuryCapsForLeagueSize(pool.luxuryCaps, leagueTeams.length);
    const seats = buildRationalSeats({ teams: leagueTeams, session, playersById: deskById, budget: pool.tierCap });
    const ownSeat = seats.find((seat) => seat.teamId === team.id);
    if (!ownSeat) return null;
    const need = rosterNeedBreakdown(ownSeat.roster.map((entry) => entry.shape));
    const openSlots = openRosterSlots(session, team.id);
    const available = deskPlayers.filter((entry) => !unavailable.has(entry.playerId));
    const risks = rationalRisksForRoom({
      session, askingTeamId: team.id, askedPlayerIds: available.map((entry) => entry.playerId),
      availablePlayers: available, seats, baseCaps: pool.luxuryCaps, realTeamCount: leagueTeams.length,
    });
    const riskById = new Map(risks.map((risk) => [risk.playerId, risk]));
    const candidates: DeskCandidate[] = deskPlayers.map((entry) => {
      const marginalTax = auctionMarginalTaxWithCaps(ownSeat.roster.map((row) => row.construction), entry.construction, locked.capIdentity, caps);
      const finish = evaluateSnakeLegalFinish({
        currentRoster: [...ownSeat.roster, entry], committedSpent: ownSeat.committedSpent + entry.price,
        availablePool: available.filter((row) => row.playerId !== entry.playerId), budget: pool.tierCap,
        baseCaps: pool.luxuryCaps, realTeamCount: leagueTeams.length, capIdentity: locked.capIdentity,
      });
      const risk = riskById.get(entry.playerId);
      return {
        id: entry.playerId,
        name: fullName(entry.stored.firstName, entry.stored.lastName).toUpperCase(),
        position: entry.position,
        advisorWorth: entry.price,
        iv: entry.price,
        marginalTax,
        trueCost: entry.price + marginalTax,
        archetypeChip: locked.archetypeName,
        fitWord: fitWord({ player: entry, priorities: locked.priorities, need, openSlots }),
        risk: risk?.risk ?? 'SAFE_TO_WAIT',
        riskReason: risk ? `${risk.rationalBuyersBeforeTurn} RATIONAL ${risk.rationalBuyersBeforeTurn === 1 ? 'BUYER' : 'BUYERS'} BEFORE YOUR TURN.` : 'NO RATIONAL BUYER BEFORE YOUR TURN.',
        legalFinishLine: !finish.feasible ? 'THIS PICK LEAVES NO LEGAL 22.' : `LEGAL-FINISH CUSHION: $${Math.round(finish.legalFinishCushion).toLocaleString()} LEFT.`,
        boardFallout: Object.entries(board.slots).find(([, id]) => id === entry.playerId)?.[0]
          ? `FITS YOUR BOARD — ${Object.entries(board.slots).find(([, id]) => id === entry.playerId)?.[0]} SLOT`
          : 'OFF-BOARD: CHOOSE A SLOT TO PRICE THE CHANGE.',
        construction: entry.construction,
        drafted: unavailable.has(entry.playerId),
      };
    });
    const brokenSlots = Object.entries(board.slots).filter(([, id]) => unavailable.has(id)).map(([slot]) => slot as SnakeBoardSlotId);
    const planBill = brokenSlots.length ? null : evaluateSnakePlan({
      boardPlayerIds: Object.values(board.slots), players: deskPlayers, budget: pool.tierCap,
      baseCaps: pool.luxuryCaps, realTeamCount: leagueTeams.length, capIdentity: locked.capIdentity,
    });
    const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const slotDepth = Object.fromEntries(Object.keys(board.slots).map((slotId) => {
      const position = boardSlotPosition(slotId as SnakeBoardSlotId) ?? candidateById.get(board.slots[slotId as SnakeBoardSlotId])?.position;
      return [slotId, position ? (board.rankings.byPosition?.[position] ?? []).filter((id) => !unavailable.has(id)).length : 0];
    }));
    return {
      candidates, brokenSlots, planBill, slotDepth,
      taxCoreRows: buildTaxCoreRows({ candidates, boardPlayerIds: Object.values(board.slots), caps }),
      advisorLog: brokenSlots.map((slotId) => ({ key: `broken:${slotId}`, text: `YOUR ${slotId} PLAN IS BROKEN — YOUR RANKING HAS NO AVAILABLE NAME.`, actionable: true })),
    };
  }, [board, deskById, deskPlayers, leagueTeams, pool, session, team, unavailable]);

  const saveBoard = useCallback(async (nextBoard: SnakeSeatBoardRecord) => {
    if (!session || !board) return;
    const current = await getMlbDraftSession(session.leagueId, session.seasonNumber);
    if (!current) { setMessage(COMPANION_STALE_COPY); return; }
    const result = updateApprovedCompanionBoard({
      session: current, deviceId: ownDeviceId, expectedSessionRevision: session.revision ?? 0,
      expectedBoardRevision: board.revision, board: nextBoard,
    });
    if (!result.ok || !result.session) { setMessage(result.message); await refreshSession(); return; }
    const saved = await saveMlbDraftSession(result.session);
    setSession(saved);
    setMessage('SAVED.');
  }, [board, getMlbDraftSession, ownDeviceId, refreshSession, saveMlbDraftSession, session]);

  const reorder = useCallback((position: DeskCandidate['position'], orderedIds: readonly string[]) => {
    if (!board) return;
    const frozen = new Set(board.rankings.frozenPlayerIds ?? []);
    orderedIds.forEach((id) => frozen.add(id));
    void saveBoard({
      ...board,
      rankings: { ...board.rankings, byPosition: { ...board.rankings.byPosition, [position]: [...orderedIds] }, frozenPlayerIds: [...frozen] },
      revision: board.revision + 1,
    });
  }, [board, saveBoard]);

  const startWhatIf = useCallback((slotId: SnakeBoardSlotId, playerId: string) => {
    if (!board || !deskState || !pool || !team || !session) return;
    const slots = { ...board.slots };
    const priorPlayerId = slots[slotId];
    const existingSlot = Object.entries(slots).find(([, id]) => id === playerId)?.[0] as SnakeBoardSlotId | undefined;
    const candidate = deskState.candidates.find((row) => row.id === playerId);
    const displaced = deskState.candidates.find((row) => row.id === priorPlayerId);
    if (!candidate || !displaced) return;
    slots[slotId] = playerId;
    if (existingSlot && existingSlot !== slotId) slots[existingSlot] = priorPlayerId;
    const legal = isCandidateEligibleForBoardSlot(slotId, candidate)
      && (!existingSlot || existingSlot === slotId || isCandidateEligibleForBoardSlot(existingSlot, displaced));
    const locked = resolveLockedSeat({ team, session });
    const bill = evaluateSnakePlanWhatIf({
      boardPlayerIds: Object.values(slots), players: deskPlayers, budget: pool.tierCap,
      baseCaps: pool.luxuryCaps, realTeamCount: leagueTeams.length, capIdentity: locked.capIdentity,
    });
    setWhatIf({
      board: { ...board, slots, revision: board.revision + 1 },
      view: {
        slotId, playerId, planCost: bill.planCost, planTax: bill.planTax, planCushion: bill.planCushion, legal,
        legalityLine: legal ? 'THE CHOSEN BOARD SLOTS STILL WORK.' : `PLAN BROKEN — ${candidate.name} CANNOT FILL ${slotId}.`,
        legalFinishLine: candidate.legalFinishLine,
      },
    });
  }, [board, deskPlayers, deskState, leagueTeams.length, pool, session, team]);

  const pickValueChart = useMemo(() => derivePickValueChart(activePoolRows.map((row) => row.iv)).slice(0, session?.pickOrder.length ?? 0), [activePoolRows, session?.pickOrder.length]);
  const seatingProofInput = useMemo<SimultaneousSnakeSeatingInput | null>(() => {
    if (!session || !pool) return null;
    return {
      clubs: leagueTeams.map((entry) => {
        const completed = session.completedPicks.filter((pick) => pick.teamId === entry.id);
        const roster = completed.flatMap((pick) => seatingById.get(pick.playerId) ?? []);
        return {
          teamId: entry.id, roster,
          budgetRemaining: pool.tierCap - completed.reduce((sum, pick) => sum + (pick.settledSalary ?? poolById.get(pick.playerId)?.iv ?? 0) + (pick.marginalTax ?? 0), 0),
          committedConstruction: roster.map((row) => row.construction),
          capIdentity: resolveLockedSeat({ team: entry, session }).capIdentity,
        };
      }),
      pool: seatingPlayers.filter((entry) => !unavailable.has(entry.playerId)),
      baseCaps: pool.luxuryCaps, realTeamCount: leagueTeams.length, versionState: session.versionState,
    };
  }, [leagueTeams, pool, poolById, seatingById, seatingPlayers, session, unavailable]);
  const askGuide = useCallback((buyerTeamId: string, targetPick: number) => {
    if (!session || !seatingProofInput) return { message: `No legal guide trade reaches pick ${targetPick}.`, proposal: null, nextPickMoves: [] };
    return buildAskedPickGuide({ session, pickValueChart, seatingProofInput, buyerTeamId, targetPick });
  }, [pickValueChart, seatingProofInput, session]);

  if (!snakeEnabled()) return <main className="ballpark-page"><h1 className="ballpark-title">PAGE NOT FOUND</h1></main>;
  if (isLoading) return <main className="ballpark-page"><p>OPENING THE COMPANION…</p></main>;
  if (error) return <main className="ballpark-page"><p>{error}</p></main>;
  if (!approved || !team || !session) {
    return <CompanionClaimScreen pending={activeClaim?.status === 'pending'} message={message} onClaim={claimDesk} />;
  }
  if (!pool || !board || !deskState) return <main className="ballpark-page"><section className="ballpark-panel"><h1 className="ballpark-title">YOUR DESK IS NOT READY</h1><p className="mt-3">OPEN THIS CLUB'S DESK ON THE MAIN DEVICE FIRST.</p></section></main>;

  const ticker = session.completedPicks.slice(-6).reverse().map((pick) => {
    const pickTeam = leagueTeams.find((entry) => entry.id === pick.teamId);
    const player = playerById.get(pick.playerId);
    return `${(pickTeam?.name ?? 'CLUB').toUpperCase()} SELECTED ${(player ? fullName(player.firstName, player.lastName) : 'A PLAYER').toUpperCase()}`;
  });
  return <SnakeCompanionFrame
    team={{ id: team.id, name: team.name, abbreviation: team.abbreviation, logoUrl: team.logoUrl }}
    currentPick={session.pickOrder[session.currentPickIndex]?.pick ?? session.currentPickIndex + 1}
    order={session.pickOrder.slice(session.currentPickIndex, session.currentPickIndex + 8).map((slot) => ({ pick: slot.pick, teamName: leagueTeams.find((entry) => entry.id === slot.teamId)?.name ?? 'CLUB' }))}
    ticker={ticker}
    onSignOut={() => { setSession(null); setMessage('THIS DEVICE IS COVERED. CLAIM IT AGAIN TO RETURN.'); }}
    privateDesk={<PrivateDesk
      candidates={deskState.candidates}
      rankings={board.rankings.byPosition ?? {}}
      boardSlots={board.slots}
      brokenSlots={deskState.brokenSlots}
      planBill={deskState.planBill}
      advisorLog={deskState.advisorLog}
      taxCoreRows={deskState.taxCoreRows}
      slotDepth={deskState.slotDepth}
      whatIf={whatIf?.view ?? null}
      onReorder={reorder}
      onStartWhatIf={startWhatIf}
      onKeepWhatIf={() => { if (whatIf) void saveBoard(whatIf.board); setWhatIf(null); }}
      onRevertWhatIf={() => setWhatIf(null)}
      tradeGuide={<SnakeTradeGuide
        teams={leagueTeams.map((entry) => ({ id: entry.id, name: entry.name }))}
        fixedBuyerTeamId={team.id}
        pickValueChart={pickValueChart}
        sessionRevision={session.revision ?? 0}
        onAsk={askGuide}
      />}
    />}
    tradeGuide={<SnakeTradeGuide
      teams={leagueTeams.map((entry) => ({ id: entry.id, name: entry.name }))}
      fixedBuyerTeamId={team.id}
      pickValueChart={pickValueChart}
      sessionRevision={session.revision ?? 0}
      onAsk={askGuide}
    />}
  />;
}
