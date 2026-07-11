import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';

import {
  auctionMarginalTaxWithCaps,
  normalizeAuctionLuxuryCapsForLeagueSize,
} from '../../../engines/auctionLuxuryTax';
import { evaluateSnakeLegalFinish } from '../../../engines/snakeEconomics';
import { applySnakePickWithCorrection, restoreLatestSnakeCorrection } from '../../../engines/snakeSession';
import { unavailableVersionPlayerIds } from '../../../engines/snakeVersioning';
import { toRosterSlotPlayer } from '../../../engines/rosterNeed';
import * as phaseFlags from '../../../utils/franchisePhase2Flags';
import { useLeagueBuilderData, toConstructionPlayer } from '../../hooks/useLeagueBuilderData';
import { SnakeDraftRoomView, type SnakeReviewCandidate } from '../components/snake/SnakeDraftRoomView';

const SEASON_NUMBER = 1;

function isSnakeRoomEnabled(): boolean {
  const maybeEnabled = (phaseFlags as typeof phaseFlags & { isSnakeDraftV1Enabled?: () => boolean }).isSnakeDraftV1Enabled;
  return maybeEnabled?.() ?? false;
}

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export default function SnakeDraftRoom() {
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
  const [soundsEnabled, setSoundsEnabled] = useState(true);

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
  const poolById = useMemo(() => new Map((pool?.players ?? []).map((row) => [row.id, row])), [pool]);
  const unavailable = useMemo(() => {
    const ids = new Set(session?.completedPicks.map((pick) => pick.playerId) ?? []);
    for (const id of unavailableVersionPlayerIds(session?.versionState)) ids.add(id);
    return ids;
  }, [session]);
  const currentSlot = session?.pickOrder[session.currentPickIndex] ?? null;
  const currentTeam = leagueTeams.find((team) => team.id === currentSlot?.teamId) ?? null;
  const currentBoard = currentTeam ? session?.seatBoards?.[currentTeam.id] : null;
  const candidateId = useMemo(() => {
    const ranked = [
      ...(currentBoard?.rankings.global ?? []),
      ...Object.values(currentBoard?.slots ?? {}),
      ...(pool?.players.map((row) => row.id) ?? []),
    ];
    return ranked.find((id) => !unavailable.has(id) && playerById.has(id) && poolById.has(id)) ?? null;
  }, [currentBoard, playerById, pool, poolById, unavailable]);

  const seatingPlayers = useMemo(() => (pool?.players ?? []).flatMap((row) => {
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
  }), [playerById, pool]);
  const seatingById = useMemo(() => new Map(seatingPlayers.map((player) => [player.playerId, player])), [seatingPlayers]);

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
      capIdentity: currentTeam.capIdentity,
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
      privateNote: 'THIS PLAYER CAME FROM YOUR SAVED BOARD ORDER.',
    };
  }, [candidateId, currentTeam, leagueTeams.length, playerById, pool, poolById, seatingById, seatingPlayers, session, unavailable]);

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
    const saved = await saveMlbDraftSession(next);
    setSession(saved);
  }, [saveMlbDraftSession]);

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
    await persist(next);
  }, [currentTeam, leagueTeams.length, persist, pool, poolById, seatingById, seatingPlayers, session]);

  const setPaused = useCallback(async (paused: boolean) => {
    if (!session) return;
    await persist({ ...session, paused, revision: (session.revision ?? 0) + 1 });
  }, [persist, session]);
  const correctLatest = useCallback(async () => {
    if (!session?.correctionSnapshots?.[0]) return;
    await persist(restoreLatestSnakeCorrection(session));
  }, [persist, session]);

  if (!isSnakeRoomEnabled()) return <main className="ballpark-page"><div className="ballpark-panel"><h1 className="ballpark-title">SNAKE DRAFT</h1><p className="mt-4">THE ROOM IS NOT ENABLED FOR THIS BUILD.</p></div></main>;
  if (isLoading || !loadDone) return <main className="ballpark-page"><p>OPENING THE ROOM…</p></main>;
  if (error || actionError) return <main className="ballpark-page"><div className="ballpark-panel"><h1 className="ballpark-title">THE ROOM COULD NOT OPEN</h1><p className="mt-4">{actionError ?? error}</p></div></main>;
  if (!league || !pool || !session) return <main className="ballpark-page"><div className="ballpark-panel"><h1 className="ballpark-title">THE ROOM IS NOT READY</h1><p className="mt-4">FINISH SNAKE DRAFT SETUP FIRST.</p></div></main>;

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
      practiceMode={session.workflowVersion.toLowerCase().includes('practice')}
      privateSnipeKey={privateSnipeKey}
      dangerKey={candidate?.blockReason ? `${candidate.id}:${candidate.blockReason}` : null}
      onPauseChange={(paused) => void setPaused(paused)}
      onRecordPick={recordPick}
      onCorrectLatest={correctLatest}
      onSoundsEnabledChange={setSoundsEnabled}
    />
  );
}
