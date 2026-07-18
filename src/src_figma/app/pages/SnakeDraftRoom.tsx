import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { HISTORICAL_ARCHETYPES } from '../../../data/historicalArchetypes';
import {
  auctionMarginalTaxWithCaps,
} from '../../../engines/auctionLuxuryTax';
import { snakeLuxuryCaps } from '../../../engines/snakeLuxuryTax';
import { computeOwnValue } from '../../../engines/auctionMarketModel';
import { constructionArchetypeFitMultiplier } from '../../../engines/archetypeIdentity';
import { computeDraftFreeze } from '../../../engines/draftFreeze';
import { historicalToSimArchetype } from '../../../engines/draftabilityRanker';
import { derivePickValueChart } from '../../../engines/leagueConstruction';
import {
  createFarmSnakeSession,
  buildFarmMoneyLedger,
  FARM_SNAKE_SESSION_NUMBER,
  farmPickSalary,
} from '../../../engines/snakeFarmSlots';
import {
  evaluateSnakeLegalFinish,
  evaluateSnakePlan,
  snakeMoneyNonnegative,
  type SnakeLegalFinishBill,
} from '../../../engines/snakeEconomics';
import { applySnakePickWithCorrection, restoreLatestSnakeCorrection } from '../../../engines/snakeSession';
import { primeSnakeGuideSeatingProof, seedSnakeGuideSeatingProof } from '../../../engines/snakeGuideTrade';
import {
  proveSnakePickKeepsAllClubsSeated,
  type SnakeSeatingProof,
  type SimultaneousSnakeSeatingInput,
} from '../../../engines/snakeSeatingProof';
import { unavailableVersionPlayerIds } from '../../../engines/snakeVersioning';
import { applyCanonicalSnakeRiskTriggers, canonicalSnakeRoleDepth } from '../../../engines/snakeRationalRoom';
import { buildSnakeDraftAlignmentInputs, computeSnakeDraftAlignment, snakeDraftAlignmentRoomRank } from '../../../engines/snakeDraftAlignment';
import {
  appendSnakeRoomLog,
  closeSnakeTradeOffer,
  nodSnakeTradeOffer,
  postSnakeTradeOffer,
  proposalFromOpenSnakeOffer,
} from '../../../engines/snakeTradeOffers';
import { rosterNeedBreakdown, toRosterSlotPlayer } from '../../../engines/rosterNeed';
import { assembleBoard } from '../../../engines/rosterIntelligencePayload';
import * as phaseFlags from '../../../utils/franchisePhase2Flags';
import { useLeagueBuilderData, toConstructionPlayer } from '../../hooks/useLeagueBuilderData';
import { SnakeDraftRoomView, type SnakeReviewCandidate } from '../components/snake/SnakeDraftRoomView';
import { buildSnakePickTicker } from '../components/snake/snakePickTicker';
import { SnakeDraftRecap } from '../components/snake/SnakeDraftRecap';
import { PrivateDesk } from '../components/snake/desk/PrivateDesk';
import { SelectedPlayerCard } from '../components/snake/desk/SelectedPlayerCard';
import {
  buildChemistryStrip,
  buildDraftedRosterLedger,
} from '../components/snake/desk/draftTruthModel';
import {
  buildAdvisorLog,
  boardSlotPosition,
  buildSeededSeatBoard,
  buildTaxCoreRows,
  isCanonicalSnakeBoard,
  reconcileBoardAvailability,
  reorderSeatBoardRankings,
  type AdvisorLogEntry,
  type BoardBackfillEvent,
  type DeskCandidate,
} from '../components/snake/desk/deskModel';
import {
  buildDeskRoomPlayer,
  buildRationalSeats,
  fitWord,
  openRosterSlots,
  reconcileExistingSeatBoards,
  resolveLockedSeat,
  updateSessionSeatBoard,
} from '../components/snake/desk/deskRoomModel';
import {
  buildSelectedPlayerConsequence,
  buildSnakeAssistantBoardRequest,
  buildSnakeAssistantLivePlayer,
  type SelectedPlayerConsequence,
} from '../components/snake/desk/snakeDeskIntelligenceModel';
import { useSnakeAssistantBoard } from '../components/snake/desk/useSnakeAssistantBoard';
import { snakeBoardOverBudgetReason } from '../components/snake/desk/snakeDeskMoneyCopy';
import {
  buildSnakeDecisionCandidateFacts,
  buildSnakeGuideRecommendationRequest,
  resolveSnakeDraftDecision,
  snakeGuideThreatPick,
  type SnakeDraftDecision,
} from '../components/snake/desk/snakeDraftDecisionModel';
import { useSnakeGuideRecommendation } from '../components/snake/desk/useSnakeGuideRecommendation';
import {
  buildSnakeRationalRiskRequest,
  useSnakeRationalRisks,
} from '../components/snake/desk/useSnakeRationalRisks';
import type { SnakeRankingView } from '../components/snake/desk/RankingsView';
import { SNAKE_BOARD_SLOT_IDS, type SnakeBoardSlotId, type SnakeCompanionPickRequest, type SnakeOpenTradeOffer, type SnakeSeatBoardRecord } from '../../../utils/leagueBuilderStorage';
import { SnakeCommissionerTrade } from '../components/snake/trade/SnakeCommissionerTrade';
import { CompanionApprovalCard } from '../components/snake/companion/CompanionApprovalCard';
import { SnakeTradeGuide } from '../components/snake/trade/SnakeTradeGuide';
import {
  rebuildPracticeSnakeSeatBoards,
} from '../components/snake/setup/SnakeDraftSetupAdapter.helpers';
import { useSnakeSetupProofClient } from '../components/snake/setup/snakeSetupProofClient';
import {
  executeAskedPickTrade,
  guideForAskedPick,
  prefillGuideForPackage,
  type ExecutedAskedPickTrade,
  type SnakeTradeGuidePrefill,
} from '../components/snake/trade/tradeGuideModel';
import { FarmPrivateDesk, FarmSelectedProspectCard } from '../components/snake/farm/FarmPrivateDesk';
import {
  buildFarmFogCard,
  buildFarmPublicRosters,
  buildFarmScoutPressure,
  rankFarmFogCards,
  reconcileFarmSeatBoards,
  reorderFarmBoard,
  seedFarmSeatBoard,
} from '../components/snake/farm/farmRoomModel';
import {
  buildFarmAuctionPool,
  buildFarmAuctionPoolFromProspects,
  FARM_AUCTION_ROSTER_SLOTS_PER_TEAM,
  type FarmAuctionPool,
} from '../../../utils/farmAuctionPool';
import { computeFarmTierCap, computeMlbToFarmCarryover } from '../../../utils/farmAuctionWallet';
import {
  getAllLeagueTemplates,
  getAllPlayers,
  getAllTeams,
  getScoutProfilesForLeague,
  getTeamRoster,
  freezeMlbDraftRoomSessionWithRegisteredPool,
  patchMlbDraftSessionFarmSeatBoard,
  patchMlbDraftSessionSeatBoard,
  assertCompanionPickRequestApprovable,
  markSnakeRosterHandoff,
  recoverCanonicalMlbSnakePickOrder,
  saveMlbDraftRoomSession,
  updateMlbDraftSessionAtomically,
  resolveLeagueSalaryCap,
  type Player,
  type LeagueBuilderMlbDraftSession,
  type LeagueBuilderScoutProfile,
} from '../../../utils/leagueBuilderStorage';
import type { ProspectScoutDescriptor } from '../../../utils/prospectScoutingDraftEngine';
import { commitCompletedSnakeFarmSessionToLeagueRosters, commitCompletedSnakeSessionToLeagueRosters } from '../../../utils/leagueBuilderAuctionPipeline';
import { scoutHireRouteForLeague, staffHireRouteForLeague } from '../utils/draftRouting';
import { loadSnakeSoundsEnabled, saveSnakeSoundsEnabled } from '../../utils/snakeSounds';
import {
  freezeSnakeDraftSession,
  readSnakeDraftTruth,
  validateSnakeRosterHandoff,
} from '../../../utils/snakeDraftManifest';
import { assertSnakeRosterHandoffReady } from '../../../utils/snakeRosterHandoff';
import { syncEngine } from '../../../utils/syncEngine';
import { sameDraftSessionSnapshot, startSnakeRoomFreshness } from '../components/snake/snakeRoomFreshness';
import {
  buildSnakePlayerIdentityChips,
  snakePlayerSourceId,
  snakePlayerVersionGroupId,
} from '../../../utils/snakePlayerIdentity';
import { snakeRoomMissingLegCopy } from '../components/snake/snakeRoomCopy';
import { normalizeTrueValuePosition } from '../../../engines/salaryCalculator';
import {
  buildDraftFreezeInputs,
  buildSnakeDraftMoraleSnapshot,
  rankExpectedTalentByIv,
  type DraftFreezePlayerMeta,
} from '../../../utils/draftFreezeInputs';

const SEASON_NUMBER = 1;
const PRACTICE_SEASON_NUMBER = 99;

function liveRoomPublicationFailure(action: 'PICK' | 'TRADE' | 'CORRECTION', cause: unknown): Error {
  const detail = cause instanceof Error ? cause.message : String(cause);
  return new Error(
    `${action} WAS SAVED HERE, BUT COMPANION DEVICES DID NOT UPDATE. RELOAD THE ROOM AND CHECK SYNC. ${detail}`,
  );
}

interface MainPrivateIdentity {
  sessionId: string;
  leagueId: string;
  seasonNumber: number;
  teamId: string;
}

interface MainPrivateGuard {
  epoch: number;
  identity: MainPrivateIdentity;
}

function sameMainPrivateIdentity(
  left: MainPrivateIdentity | null,
  right: MainPrivateIdentity | null,
): boolean {
  return Boolean(left && right
    && left.sessionId === right.sessionId
    && left.leagueId === right.leagueId
    && left.seasonNumber === right.seasonNumber
    && left.teamId === right.teamId);
}

function isSnakeRoomEnabled(): boolean {
  const maybeEnabled = (phaseFlags as typeof phaseFlags & { isSnakeDraftV1Enabled?: () => boolean }).isSnakeDraftV1Enabled;
  return maybeEnabled?.() ?? false;
}

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

const UNKNOWN_PLAYER = 'UNKNOWN PLAYER';
const UNKNOWN_TEAM = 'UNKNOWN TEAM';
const RECAP_CONFIRMATION_ERROR = 'THE DRAFT COULD NOT BE CONFIRMED. TRY AGAIN.';
const NEUTRAL_DRAFT_MODIFIERS = { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 } as const;

function draftFreezeMeta(players: readonly {
  id: string;
  personality: string;
  hiddenPersonalityModifiers?: Player['hiddenPersonalityModifiers'];
  primaryPosition: string;
}[]): Map<string, DraftFreezePlayerMeta> {
  return new Map(players.map((player) => [player.id, {
    personality: player.personality,
    modifiers: player.hiddenPersonalityModifiers ?? NEUTRAL_DRAFT_MODIFIERS,
    position: normalizeTrueValuePosition(player.primaryPosition),
  }]));
}

function hotseatPassName(
  session: { snakeSetup?: { clubs: Array<{ teamId: string; gmName?: string; hotseat: boolean }> } } | null,
  team: { id: string; name: string } | null,
): string | null {
  if (!session || !team) return null;
  const seat = session.snakeSetup?.clubs.find((club) => club.teamId === team.id);
  if (!seat?.hotseat) return null;
  return seat.gmName?.trim() || team.name;
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
    leagues, teams, players, isLoading, error, getMlbDraftSession, saveMlbDraftSession, refresh,
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
  const [existingFarmRosterIdsByTeamId, setExistingFarmRosterIdsByTeamId] = useState<Record<string, string[]>>({});
  const [scouts, setScouts] = useState<Record<string, ProspectScoutDescriptor | undefined>>({});
  const [selectedIdByTeam, setSelectedIdByTeam] = useState<Record<string, string | null>>({});
  const [deskTeamId, setDeskTeamId] = useState<string | null>(null);
  const [loadDone, setLoadDone] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [writeNotice, setWriteNotice] = useState<string | null>(null);
  const [soundsEnabled, setSoundsEnabled] = useState(loadSnakeSoundsEnabled);
  const [farmAdvisorLogBySeat, setFarmAdvisorLogBySeat] = useState<Record<string, AdvisorLogEntry[]>>({});
  const [recapOpen, setRecapOpen] = useState(false);
  const [recapError, setRecapError] = useState<string | null>(null);
  const [committingRecap, setCommittingRecap] = useState(false);
  const recapCommitInFlight = useRef(false);
  const persist = useCallback(async (next: NonNullable<typeof session>) => {
    const saved = await saveMlbDraftRoomSession(next, session?.revision ?? 0);
    setSession(saved);
    return saved;
  }, [session?.revision]);

  const loadFarm = useCallback(async () => {
    setLoadDone(false);
    setActionError(null);
    try {
      await syncEngine.pull({ throwOnError: true });
      const [freshLeagues, freshTeams, freshPlayers] = await Promise.all([
        getAllLeagueTemplates(),
        getAllTeams(),
        getAllPlayers(),
      ]);
      const freshLeague = freshLeagues.find((row) => row.id === requestedLeagueId) ?? null;
      if (!freshLeague) throw new Error('THE LEAGUE WAS NOT FOUND.');
      const freshLeagueTeams = freshLeague.teamIds.flatMap((id) => {
        const team = freshTeams.find((row) => row.id === id);
        return team ? [team] : [];
      });
      if (freshLeagueTeams.length === 0) throw new Error('THIS LEAGUE HAS NO DRAFT CLUBS.');
      if (freshLeague.draftFormat !== 'snake') throw new Error('THIS LEAGUE IS CONFIGURED FOR AN AUCTION DRAFT.');
      const [storedFarm, storedMlb] = await Promise.all([
        getMlbDraftSession(freshLeague.id, FARM_SNAKE_SESSION_NUMBER),
        getMlbDraftSession(freshLeague.id, SEASON_NUMBER),
      ]);
      if (!storedMlb) throw new Error('Finish the MLB snake draft before opening the farm room.');
      readSnakeDraftTruth(storedMlb, 'MLB');
      validateSnakeRosterHandoff(storedMlb, 'MLB');
      await assertSnakeRosterHandoffReady(storedMlb, 'MLB');
      const stored = storedFarm ?? storedMlb;
      if (storedFarm?.draftManifest) readSnakeDraftTruth(storedFarm, 'FARM');
      const savedProfiles = await getScoutProfilesForLeague(freshLeague.id);
      const nextScouts = Object.fromEntries(freshLeagueTeams.map((team) => {
        const profile = savedProfiles.find((row) => row.teamId === team.id);
        if (!profile) throw new Error(`Hire the scout for ${team.name} before opening the farm draft.`);
        return [team.id, scoutDescriptor(profile)];
      }));
      const seed = storedFarm
        ? storedFarm.draftManifest?.seed ?? storedFarm.seed
        : `${stored.draftManifest?.seed ?? stored.seed}:farm`;
      if (storedFarm && !storedFarm.farmProspectSnapshot) {
        throw new Error('This farm draft has no frozen prospect snapshot. Run It Back before continuing.');
      }
      const nextPool = storedFarm
        ? buildFarmAuctionPoolFromProspects(storedFarm.farmProspectSnapshot!)
        : buildFarmAuctionPool({
            leagueId: freshLeague.id,
            seasonNumber: SEASON_NUMBER,
            seed,
            teamDraftOrder: freshLeagueTeams.map((team) => ({ teamId: team.id, teamName: team.name })),
            scoutsByTeamId: nextScouts,
          });
      if (storedFarm?.snakeSetup?.poolPlayerIds) {
        const snapshotIds = nextPool.prospects.map((prospect) => prospect.id);
        if (JSON.stringify(snapshotIds) !== JSON.stringify(storedFarm.snakeSetup.poolPlayerIds)) {
          throw new Error('The frozen farm prospect snapshot does not match this draft session.');
        }
      }
      const farmTierCap = computeFarmTierCap(nextPool.auctionPlayers.map((row) => row.iv));
      const salaryById = new Map(freshPlayers.map((player) => [player.id, player.settledSalary ?? player.salary ?? 0]));
      const rosters = await Promise.all(freshLeagueTeams.map(async (team) => [team.id, await getTeamRoster(team.id)] as const));
      const nextBudgets = Object.fromEntries(rosters.map(([teamId, roster]) => {
        const mlbSpent = (roster?.mlbRoster ?? []).reduce((sum, id) => sum + (salaryById.get(id) ?? 0), 0);
        const farmCommitted = (roster?.farmRoster ?? []).reduce((sum, id) => sum + (salaryById.get(id) ?? 0), 0);
        const carryover = computeMlbToFarmCarryover(Math.max(0, resolveLeagueSalaryCap(freshLeague) - mlbSpent));
        return [teamId, Math.max(0, farmTierCap - farmCommitted) + carryover];
      }));

      let nextSession = stored;
      if (!storedFarm) {
        const recoveredMlbPickOrder = recoverCanonicalMlbSnakePickOrder(stored);
        const order = recoveredMlbPickOrder
          .filter((slot) => slot.round === 1)
          .map((slot) => slot.teamId);
        const now = new Date().toISOString();
        nextSession = await saveMlbDraftSession(createFarmSnakeSession({
          mlbSession: stored,
          teamOrder: order,
          existingFarmRosterCountsByTeamId: Object.fromEntries(rosters.map(([teamId, roster]) => [teamId, roster?.farmRoster.length ?? 0])),
          farmBudgetsByTeamId: nextBudgets,
          farmArchetypeIdByTeamId: Object.fromEntries(freshLeagueTeams.map((team) => [team.id, team.farmArchetypeKey])),
          prospectIds: nextPool.prospects.map((prospect) => prospect.id),
          prospects: nextPool.prospects,
          now,
        }), { phaseTransition: 'MLB_TO_FARM' });
      }
      setScouts(nextScouts);
      setFarmBudgets(nextBudgets);
      setExistingFarmRosterIdsByTeamId(Object.fromEntries(rosters.map(([teamId, roster]) => [teamId, [...(roster?.farmRoster ?? [])]])));
      setFarmPool(nextPool);
      setSession(nextSession);
      setRecapOpen(Boolean(nextSession.draftManifest || nextSession.currentPickIndex >= nextSession.pickOrder.length));
      await refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoadDone(true);
    }
  }, [getMlbDraftSession, refresh, requestedLeagueId, saveMlbDraftSession]);

  useEffect(() => { void loadFarm(); }, [loadFarm]);
  const unavailable = useMemo(() => new Set(session?.completedPicks.map((pick) => pick.playerId) ?? []), [session]);
  const currentSlot = session?.pickOrder[session.currentPickIndex] ?? null;
  const currentTeam = leagueTeams.find((team) => team.id === currentSlot?.teamId) ?? null;
  useLayoutEffect(() => { setDeskTeamId(currentTeam?.id ?? null); }, [currentSlot?.pick, currentTeam?.id]);
  const deskTeam = leagueTeams.find((team) => team.id === deskTeamId) ?? currentTeam;
  const allCardsByTeamId = useMemo(() => farmPool ? Object.fromEntries(leagueTeams.map((team) => [team.id,
    rankFarmFogCards(farmPool.prospects.map((prospect) => buildFarmFogCard({
      prospect,
      scout: scouts[team.id],
      seed: session?.seed ?? '',
    }))),
  ])) : {}, [farmPool, leagueTeams, scouts, session?.seed]);
  const cards = useMemo(() => (deskTeam ? allCardsByTeamId[deskTeam.id] ?? [] : [])
    .filter((card) => !unavailable.has(card.id)), [allCardsByTeamId, deskTeam, unavailable]);
  const selectedId = deskTeam ? selectedIdByTeam[deskTeam.id] ?? null : null;
  useEffect(() => {
    if (!deskTeam) return;
    if (!selectedId || unavailable.has(selectedId)) {
      setSelectedIdByTeam((current) => ({ ...current, [deskTeam.id]: cards[0]?.id ?? null }));
    }
  }, [cards, deskTeam, selectedId, unavailable]);
  const selected = cards.find((card) => card.id === selectedId) ?? cards[0] ?? null;
  const rostersByTeamId = useMemo(() => buildFarmPublicRosters({
    teamIds: leagueTeams.map((team) => team.id),
    existingFarmRosterIdsByTeamId,
    storedPlayers: players,
    completedPicks: session?.completedPicks ?? [],
    prospects: farmPool?.prospects ?? [],
  }), [existingFarmRosterIdsByTeamId, farmPool, leagueTeams, players, session?.completedPicks]);
  const ownedPicksByTeamId = useMemo(() => Object.fromEntries(leagueTeams.map((team) => [team.id,
    (session?.pickOrder ?? []).slice(session?.currentPickIndex ?? 0).filter((slot) => slot.teamId === team.id).map((slot) => slot.pick),
  ])), [leagueTeams, session]);
  const remainingTurnsByTeamId = useMemo(() => Object.fromEntries(leagueTeams.map((team) => [team.id,
    (session?.pickOrder ?? []).slice(session?.currentPickIndex ?? 0).filter((slot) => slot.teamId === team.id).length,
  ])), [leagueTeams, session]);
  useEffect(() => {
    if (!session || !farmPool || leagueTeams.length === 0 || session.currentPickIndex >= session.pickOrder.length) return;
    let seeded = false;
    const farmSeatBoards = { ...(session.farmSeatBoards ?? {}) };
    for (const team of leagueTeams) {
      if (farmSeatBoards[team.id]) continue;
      const teamCards = allCardsByTeamId[team.id] ?? [];
      farmSeatBoards[team.id] = seedFarmSeatBoard({
        candidates: teamCards.map((card) => ({ id: card.id, eligiblePositions: card.eligiblePositions })),
        rankedIds: teamCards.map((card) => card.id),
        remainingTurns: remainingTurnsByTeamId[team.id] ?? 0,
      });
      seeded = true;
    }
    const base = seeded ? { ...session, farmSeatBoards } : session;
    const reconciled = reconcileFarmSeatBoards({
      session: base,
      unavailableProspectIds: unavailable,
      remainingTurnsByTeamId,
    });
    if (!seeded && !reconciled.changed) return;
    const next = reconciled.changed ? reconciled.session : {
      ...base,
      revision: (session.revision ?? 0) + 1,
    };
    void persist(next).catch((cause) => setWriteNotice(cause instanceof Error ? cause.message : String(cause)));
  }, [allCardsByTeamId, farmPool, leagueTeams, persist, remainingTurnsByTeamId, session, unavailable]);
  const pressure = selected ? buildFarmScoutPressure({ card: selected, publicRosters: rostersByTeamId, farmTarget: FARM_AUCTION_ROSTER_SLOTS_PER_TEAM }) : null;
  useEffect(() => {
    if (!deskTeam || !selected || !pressure || !session) return;
    if (session.draftManifest || session.currentPickIndex >= session.pickOrder.length) return;
    setFarmAdvisorLogBySeat((current) => ({
      ...current,
      [deskTeam.id]: buildAdvisorLog(current[deskTeam.id] ?? [], [{
        key: `farm-pressure:${session.currentPickIndex}:${selected.id}`,
        playerId: selected.id,
        text: pressure,
        actionable: true,
      }]),
    }));
  }, [deskTeam, pressure, selected, session]);
  useEffect(() => {
    if (!session || !deskTeam) return;
    if (session.draftManifest || session.currentPickIndex >= session.pickOrder.length) return;
    const active = farmAdvisorLogBySeat[deskTeam.id] ?? [];
    let wrote = false;
    void updateMlbDraftSessionAtomically(session.leagueId, session.seasonNumber, (fresh) => {
      const existing = fresh.roomLogByTeamId?.[deskTeam.id] ?? [];
      let next = fresh;
      for (const entry of active) {
        next = appendSnakeRoomLog({
          session: next,
          teamId: deskTeam.id,
          entry: {
            id: `${fresh.id}:${deskTeam.id}:${entry.key}`,
            kind: 'ADVISOR',
            text: entry.text,
            createdAt: new Date().toISOString(),
            actionable: entry.actionable,
            expired: entry.expired,
          },
        });
      }
      if ((next.roomLogByTeamId?.[deskTeam.id] ?? []).length === existing.length) return fresh;
      wrote = true;
      return { ...next, revision: (fresh.revision ?? 0) + 1 };
    }).then((saved) => {
      if (wrote) setSession(saved);
    }).catch((cause) => setWriteNotice(cause instanceof Error ? cause.message : String(cause)));
  }, [deskTeam, farmAdvisorLogBySeat, session]);
  const recordPick = useCallback(async (playerId: string) => {
    if (!session || !currentSlot || !farmPool) return;
    if (!deskTeam || !currentTeam || deskTeam.id !== currentTeam.id) throw new Error('Only the club on the clock can record this pick.');
    if (!session.farmSeatBoards) throw new Error('The private farm boards are still opening.');
    const prospect = farmPool.prospects.find((row) => row.id === playerId);
    if (!prospect) throw new Error('That prospect is no longer in the farm pool.');
    const saved = await updateMlbDraftSessionAtomically(session.leagueId, session.seasonNumber, (fresh) => {
      const freshSlot = fresh.pickOrder[fresh.currentPickIndex];
      if (!freshSlot || freshSlot.pick !== currentSlot.pick || freshSlot.teamId !== currentSlot.teamId) {
        throw new Error('The farm draft moved before this pick could be saved.');
      }
      const picked = applySnakePickWithCorrection({
        session: fresh,
        player: { playerId: prospect.id },
        settledSalary: farmPickSalary(fresh, freshSlot.pick),
        marginalTax: 0,
        versionPool: farmPool.prospects.map((row) => ({ playerId: row.id })),
      });
      const nextUnavailable = new Set(picked.completedPicks.map((pick) => pick.playerId));
      const nextRemainingTurns = Object.fromEntries(leagueTeams.map((team) => [team.id,
        picked.pickOrder.slice(picked.currentPickIndex).filter((slot) => slot.teamId === team.id).length,
      ]));
      return reconcileFarmSeatBoards({
        session: picked,
        unavailableProspectIds: nextUnavailable,
        remainingTurnsByTeamId: nextRemainingTurns,
      }).session;
    });
    setSession(saved);
  }, [currentSlot, currentTeam, deskTeam, farmPool, leagueTeams, session]);
  const finishFarm = useCallback(() => {
    if (!session || session.currentPickIndex < session.pickOrder.length) return;
    setRecapOpen(true);
  }, [session]);
  const confirmFarm = useCallback(async () => {
    if (recapCommitInFlight.current || !league || !session || !farmPool || (!session.draftManifest && session.currentPickIndex < session.pickOrder.length)) return;
    recapCommitInFlight.current = true;
    setCommittingRecap(true);
    setRecapError(null);
    try {
      const freshSession = await getMlbDraftSession(league.id, FARM_SNAKE_SESSION_NUMBER);
      if (!freshSession) throw new Error('THE COMPLETED FARM DRAFT SESSION COULD NOT BE RELOADED.');
      if (!freshSession.draftManifest && freshSession.currentPickIndex < freshSession.pickOrder.length) {
        throw new Error('THE FARM DRAFT IS NOT COMPLETE.');
      }
      const farmMeta = draftFreezeMeta(farmPool.prospects);
      const farmFreeze = computeDraftFreeze(buildDraftFreezeInputs({
        mlbSession: null,
        farmSession: null,
        farmSnakeSession: freshSession,
        metaByPlayerId: farmMeta,
      }));
      const farmExpectedRanks = rankExpectedTalentByIv(
        farmPool.auctionPlayers.map((player) => ({ id: player.playerId, iv: player.iv })),
      );
      const frozen = freezeSnakeDraftSession({
        session: freshSession,
        expectedPhase: 'FARM',
        poolPlayerIds: farmPool.prospects.map((prospect) => prospect.id),
        frozenAt: new Date().toISOString(),
        moraleSnapshot: buildSnakeDraftMoraleSnapshot({
          freeze: farmFreeze,
          expectedTalentRankByPlayerId: farmExpectedRanks,
          includeFan: false,
          includeExpectedTalentRanks: false,
        }),
      });
      const persisted = frozen === freshSession
        ? freshSession
        : await saveMlbDraftRoomSession(frozen, freshSession.revision ?? 0);
      setSession(persisted);
      await commitCompletedSnakeFarmSessionToLeagueRosters({ leagueId: league.id, session: persisted, pool: farmPool });
      const manifest = readSnakeDraftTruth(persisted, 'FARM').manifest!;
      const handedOff = await markSnakeRosterHandoff({
        leagueId: league.id,
        seasonNumber: FARM_SNAKE_SESSION_NUMBER,
        phase: 'FARM',
        sourceSessionId: manifest.source.sessionId,
        manifestPoolIdentity: manifest.pool.identity,
        committedAt: new Date().toISOString(),
      });
      setSession(handedOff);
      await assertSnakeRosterHandoffReady(handedOff, 'FARM');
      navigate(staffHireRouteForLeague(league));
    } catch {
      setRecapError(RECAP_CONFIRMATION_ERROR);
    } finally {
      recapCommitInFlight.current = false;
      setCommittingRecap(false);
    }
  }, [farmPool, getMlbDraftSession, league, navigate, session]);
  const teamSpent = deskTeam && session ? session.completedPicks
    .filter((pick) => pick.teamId === deskTeam.id)
    .reduce((sum, pick) => sum + farmPickSalary(session, pick.pick), 0) : 0;
  const deskBoard = deskTeam ? session?.farmSeatBoards?.[deskTeam.id] ?? null : null;
  const deskRemainingTurns = deskTeam ? remainingTurnsByTeamId[deskTeam.id] ?? 0 : 0;
  const farmMoneyLedger = deskTeam && session
    ? buildFarmMoneyLedger(session, deskTeam.id, farmBudgets[deskTeam.id] ?? 0)
    : null;
  const reorderDeskBoard = useCallback(async (view: string, orderedIds: string[]) => {
    if (!session || !deskTeam) return;
    const board = session.farmSeatBoards?.[deskTeam.id];
    if (!board) return;
    const teamCards = allCardsByTeamId[deskTeam.id] ?? [];
    const nextBoard = reorderFarmBoard({
      board,
      view,
      orderedIds,
      candidates: teamCards.map((card) => ({ id: card.id, eligiblePositions: card.eligiblePositions })),
      remainingTurns: deskRemainingTurns,
      unavailableProspectIds: unavailable,
    });
    const saved = await patchMlbDraftSessionFarmSeatBoard({
      leagueId: session.leagueId,
      seasonNumber: session.seasonNumber,
      teamId: deskTeam.id,
      board: nextBoard,
      expectedBoardRevision: board.revision,
    });
    setSession(saved);
  }, [allCardsByTeamId, deskRemainingTurns, deskTeam, session, unavailable]);

  if (!isSnakeRoomEnabled()) return <main className="ballpark-page"><p>THE ROOM IS NOT ENABLED FOR THIS BUILD.</p></main>;
  if (isLoading || !loadDone) return <main className="ballpark-page"><p>OPENING THE FARM ROOM…</p></main>;
  if (error || actionError) return <main className="ballpark-page"><h1>THE FARM ROOM COULD NOT OPEN</h1><p className="uppercase">{actionError ?? error}</p><button className="ballpark-press-button ballpark-press-lg ballpark-press-gold mt-5 min-h-11" onClick={() => void loadFarm()}>RETRY</button></main>;
  if (!league || !session || !farmPool) return <main className="ballpark-page"><p>THE FARM ROOM IS NOT READY.</p></main>;
  const farmRecapPicks = session.draftManifest
    ? readSnakeDraftTruth(session, 'FARM').completedPicks
    : session.completedPicks;
  if (recapOpen) return <SnakeDraftRecap
    phase="FARM"
    teams={leagueTeams.map((team) => ({ id: team.id, name: team.name, abbreviation: team.abbreviation, colors: team.colors, logoUrl: team.logoUrl }))}
    picks={farmRecapPicks.map((pick) => {
      const prospect = farmPool.prospects.find((row) => row.id === pick.playerId);
      return {
        pick: pick.pick,
        teamId: pick.teamId,
        playerId: pick.playerId,
        playerName: prospect ? `${prospect.firstName} ${prospect.lastName}` : UNKNOWN_PLAYER,
        ...(prospect?.primaryPosition ? { position: prospect.primaryPosition } : {}),
        ...(typeof pick.settledSalary === 'number' ? { salary: pick.settledSalary } : {}),
      };
    })}
    committing={committingRecap}
    error={recapError}
    onConfirm={confirmFarm}
    onBack={session.draftManifest ? undefined : () => setRecapOpen(false)}
  />;
  const farmDraftComplete = session.currentPickIndex >= session.pickOrder.length;
  return <SnakeDraftRoomView
    onHome={() => navigate('/')}
    teams={leagueTeams.map((team) => ({ id: team.id, name: team.name, abbreviation: team.abbreviation, colors: team.colors, logoUrl: team.logoUrl }))}
    order={session.pickOrder.map((slot, index, all) => ({ pick: slot.pick, teamId: slot.teamId, endpoint: all[index - 1]?.teamId === slot.teamId || all[index + 1]?.teamId === slot.teamId }))}
    currentPickIndex={session.currentPickIndex}
    ticker={[...session.completedPicks].reverse().map((pick) => ({ id: `${pick.pick}-${pick.playerId}`, teamId: pick.teamId, text: `PICK #${pick.pick} · ${leagueTeams.find((team) => team.id === pick.teamId)?.name ?? UNKNOWN_TEAM} SELECTED ${farmPool.prospects.find((row) => row.id === pick.playerId)?.firstName ?? UNKNOWN_PLAYER}` }))}
    rostersByTeamId={rostersByTeamId}
    ownedPicksByTeamId={ownedPicksByTeamId}
    activeSeatId={farmDraftComplete ? null : deskTeam?.id ?? null}
    canDraftFromActiveSeat={!farmDraftComplete && Boolean(deskBoard && deskTeam && currentTeam && deskTeam.id === currentTeam.id)}
    candidate={currentSlot && selected ? { id: selected.id, name: selected.name, position: selected.position, consequence: `PICK ${currentSlot.pick} PAYS $${farmPickSalary(session, currentSlot.pick).toLocaleString()} — WHOEVER TAKES IT.`, privateNote: selected.scoutsCall } : null}
    selectedPlayerCard={currentSlot && selected && deskTeam ? <FarmSelectedProspectCard
      card={selected}
      slotPick={currentSlot.pick}
      slotSalary={farmPickSalary(session, currentSlot.pick)}
      farmMoneyLeft={(farmBudgets[deskTeam.id] ?? 0) - teamSpent}
      teamName={deskTeam.name}
      teamLogoUrl={deskTeam.logoUrl}
    /> : undefined}
    selectedFitLabel={selected ? `SCOUT · ${selected.scoutedGrade}` : null}
    draftActionLabel="DRAFT PROSPECT"
    paused={Boolean(session.paused)} soundsEnabled={soundsEnabled} correctionAvailable={Boolean(session.correctionSnapshots?.[0])}
    hotseatNextName={hotseatPassName(session, currentTeam)}
    practiceMode={false}
    privateDesk={currentSlot ? <FarmPrivateDesk
      key={deskTeam?.id ?? 'none'}
      cards={cards}
      selectedId={selected?.id ?? null}
      slotPick={currentSlot.pick}
      slotSalary={farmPickSalary(session, currentSlot.pick)}
      farmMoneyLeft={(farmBudgets[deskTeam?.id ?? ''] ?? 0) - teamSpent}
      advisorLog={[
        ...(session.roomLogByTeamId?.[deskTeam?.id ?? ''] ?? []).map((entry) => ({ key: entry.id, text: entry.text, actionable: entry.actionable, expired: entry.expired })),
        ...(farmAdvisorLogBySeat[deskTeam?.id ?? ''] ?? []).filter((entry) => !(session.roomLogByTeamId?.[deskTeam?.id ?? ''] ?? []).some((row) => row.id.endsWith(`:${entry.key}`))),
      ]}
      board={deskBoard}
      remainingTurns={deskRemainingTurns}
      moneyLedger={farmMoneyLedger}
      onChoose={(playerId) => deskTeam && setSelectedIdByTeam((current) => ({ ...current, [deskTeam.id]: playerId }))}
      onReorder={(view, ids) => {
        void reorderDeskBoard(view, ids).catch((cause) => {
          setWriteNotice(cause instanceof Error ? cause.message : String(cause));
        });
      }}
    /> : undefined}
    roomHelpNotes={['SLOT SALARIES STAY WITH THE PICKS.']}
    writeNotice={writeNotice}
    onReloadRoom={async () => { setWriteNotice(null); await loadFarm(); }}
    onDismissWriteNotice={() => setWriteNotice(null)}
    onPauseChange={async (paused) => {
      try {
        await persist({ ...session, paused, revision: (session.revision ?? 0) + 1 });
      } catch (cause) {
        setWriteNotice(cause instanceof Error ? cause.message : String(cause));
        throw cause;
      }
    }}
    onActiveSeatChange={setDeskTeamId}
    onRecordPick={async (playerId) => {
      try {
        await recordPick(playerId);
      } catch (cause) {
        setWriteNotice(cause instanceof Error ? cause.message : String(cause));
        throw cause;
      }
    }}
    onCorrectLatest={async () => {
      try {
        const restored = restoreLatestSnakeCorrection(session);
        await persist(restored);
      } catch (cause) {
        setWriteNotice(cause instanceof Error ? cause.message : String(cause));
        throw cause;
      }
    }}
    onSoundsEnabledChange={(enabled) => { setSoundsEnabled(enabled); saveSnakeSoundsEnabled(enabled); }}
    onDraftComplete={finishFarm}
  />;
}

function MlbSnakeDraftRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const { runProof: runSnakeSetupProof } = useSnakeSetupProofClient();
  const {
    leagues,
    teams,
    players,
    isLoading,
    error,
    getRegisteredPool,
    getMlbDraftSession,
    refresh,
  } = useLeagueBuilderData();
  const practiceRequested = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return location.pathname.includes('snake-practice') || params.get('practice') === '1';
  }, [location.pathname, location.search]);
  const sessionSeasonNumber = practiceRequested ? PRACTICE_SEASON_NUMBER : SEASON_NUMBER;
  const requestedLeagueId = useMemo(() => new URLSearchParams(location.search).get('leagueId'), [location.search]);
  const league = useMemo(
    () => requestedLeagueId === null
      ? leagues[0] ?? null
      : leagues.find((entry) => entry.id === requestedLeagueId) ?? null,
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
  const [writeNotice, setWriteNotice] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [soundsEnabled, setSoundsEnabled] = useState(loadSnakeSoundsEnabled);
  const [advisorLogBySeat, setAdvisorLogBySeat] = useState<Record<string, AdvisorLogEntry[]>>({});
  const [backfillEventsBySeat, setBackfillEventsBySeat] = useState<Record<string, BoardBackfillEvent[]>>({});
  const [tradeReceiptsBySeat, setTradeReceiptsBySeat] = useState<Record<string, AdvisorLogEntry[]>>({});
  const [assistantOptimizePlayerId, setAssistantOptimizePlayerId] = useState<string | null>(null);
  const [assistantOptimizeRevision, setAssistantOptimizeRevision] = useState(0);
  const [guidePrefillState, setGuidePrefillState] = useState<{
    scopeKey: string;
    prefill: SnakeTradeGuidePrefill;
  } | null>(null);
  const [boardUndo, setBoardUndo] = useState<{
    teamId: string;
    board: SnakeSeatBoardRecord;
    expectedBoardRevision: number;
    identity: MainPrivateIdentity;
    changedSlotCount: number;
  } | null>(null);
  const [undoWorking, setUndoWorking] = useState(false);
  const [livePickMoveRevision, setLivePickMoveRevision] = useState(0);
  const [privateDeskRevealed, setPrivateDeskRevealed] = useState(false);
  const [privateDeskReady, setPrivateDeskReady] = useState(false);
  const privateDeskActive = privateDeskRevealed && privateDeskReady;
  const [deskTeamId, setDeskTeamId] = useState<string | null>(null);
  const [selectedPlayerIdByTeam, setSelectedPlayerIdByTeam] = useState<Record<string, string | null>>({});
  const [recapOpen, setRecapOpen] = useState(false);
  const [recapError, setRecapError] = useState<string | null>(null);
  const [committingRecap, setCommittingRecap] = useState(false);
  const [practiceFastForward, setPracticeFastForward] = useState(false);
  const recapCommitInFlight = useRef(false);
  const legalFinishCacheRef = useRef(new Map<string, SnakeLegalFinishBill>());
  const seatingPickProofCacheRef = useRef(new Map<string, SnakeSeatingProof>());
  const privateEpochRef = useRef(0);
  const privateRevealedRef = useRef(false);
  const privateIdentityRef = useRef<MainPrivateIdentity | null>(null);
  const privateIdentityKeyRef = useRef<string | null>(null);
  const undoOperationRef = useRef<object | null>(null);
  const invalidatePrivateContext = useCallback(() => {
    privateEpochRef.current += 1;
    privateRevealedRef.current = false;
    setPrivateDeskReady(false);
    setPrivateDeskRevealed(false);
    setAssistantOptimizePlayerId(null);
    setAssistantOptimizeRevision(0);
    setGuidePrefillState(null);
    setBoardUndo(null);
    undoOperationRef.current = null;
    setUndoWorking(false);
  }, []);
  const capturePrivateContext = useCallback((): MainPrivateGuard | null => {
    const identity = privateIdentityRef.current;
    if (!privateRevealedRef.current || !identity) return null;
    return { epoch: privateEpochRef.current, identity: { ...identity } };
  }, []);
  const privateContextIsCurrent = useCallback((guard: MainPrivateGuard): boolean => (
    privateRevealedRef.current
    && privateEpochRef.current === guard.epoch
    && sameMainPrivateIdentity(privateIdentityRef.current, guard.identity)
  ), []);
  const practiceMode = practiceRequested || Boolean(session?.workflowVersion.toLowerCase().includes('practice'));

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
    setLoadDone(false);
    setActionError(null);
    try {
      await syncEngine.pull({ throwOnError: true });
      const [freshLeagues, freshTeams, freshPlayers] = await Promise.all([
        getAllLeagueTemplates(),
        getAllTeams(),
        getAllPlayers(),
      ]);
      const freshLeague = requestedLeagueId === null
        ? freshLeagues[0] ?? null
        : freshLeagues.find((entry) => entry.id === requestedLeagueId) ?? null;
      if (!freshLeague) {
        throw new Error(requestedLeagueId ? 'THE LEAGUE WAS NOT FOUND.' : 'NO LEAGUE IS AVAILABLE FOR THIS DRAFT.');
      }
      if (freshLeague.draftFormat !== 'snake') throw new Error('THIS LEAGUE IS CONFIGURED FOR AN AUCTION DRAFT.');
      const [nextPool, nextSession] = await Promise.all([
        getRegisteredPool(freshLeague.id),
        getMlbDraftSession(freshLeague.id, sessionSeasonNumber),
      ]);
      if (nextSession?.draftManifest) readSnakeDraftTruth(nextSession, 'MLB');
      setPool(nextPool);
      setSession(nextSession);
      setRecapOpen(Boolean(nextSession && (nextSession.draftManifest || nextSession.currentPickIndex >= nextSession.pickOrder.length)));
      void freshTeams;
      void freshPlayers;
      await refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoadDone(true);
    }
  }, [getMlbDraftSession, getRegisteredPool, refresh, requestedLeagueId, sessionSeasonNumber]);

  useEffect(() => { void loadSession(); }, [loadSession]);

  const refreshRoomTruth = useCallback(async () => {
    try {
      await syncEngine.pull({ throwOnError: true });
      const freshLeagues = await getAllLeagueTemplates();
      const freshLeague = requestedLeagueId === null
        ? freshLeagues[0] ?? null
        : freshLeagues.find((entry) => entry.id === requestedLeagueId) ?? null;
      if (!freshLeague) throw new Error('THE LEAGUE WAS NOT FOUND.');
      const fresh = await getMlbDraftSession(freshLeague.id, sessionSeasonNumber);
      setSyncError(null);
      if (!fresh) return;
      if (fresh.draftManifest) readSnakeDraftTruth(fresh, 'MLB');
      setSession((current) => {
        if (!current) return fresh;
        if ((fresh.revision ?? 0) < (current.revision ?? 0)) return current;
        return sameDraftSessionSnapshot(current, fresh) ? current : fresh;
      });
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause);
      setSyncError(`LIVE ROOM SYNC FAILED — ${detail}`);
    }
  }, [getMlbDraftSession, requestedLeagueId, sessionSeasonNumber]);

  useEffect(() => {
    return startSnakeRoomFreshness({ pullAndRefresh: refreshRoomTruth });
  }, [refreshRoomTruth]);

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
  const draftingTeam = leagueTeams.find((team) => team.id === currentSlot?.teamId) ?? null;
  useLayoutEffect(() => {
    setDeskTeamId(draftingTeam?.id ?? null);
  }, [draftingTeam?.id, session?.currentPickIndex]);
  const deskTeam = leagueTeams.find((team) => team.id === deskTeamId) ?? draftingTeam;
  const completedPickByPlayerId = useMemo(() => new Map(
    (session?.completedPicks ?? []).map((pick) => [pick.playerId, pick]),
  ), [session?.completedPicks]);
  const draftedTeamNameByPlayerId = useMemo(() => new Map(
    (session?.completedPicks ?? []).map((pick) => [
      pick.playerId,
      leagueTeams.find((team) => team.id === pick.teamId)?.name ?? UNKNOWN_TEAM,
    ]),
  ), [leagueTeams, session?.completedPicks]);
  const ownCommittedPlayerIds = useMemo(() => new Set(
    (session?.completedPicks ?? [])
      .filter((pick) => pick.teamId === deskTeam?.id)
      .map((pick) => pick.playerId),
  ), [deskTeam?.id, session?.completedPicks]);
  const boardUnavailable = useMemo(() => new Set(
    [...unavailable].filter((playerId) => !ownCommittedPlayerIds.has(playerId)),
  ), [ownCommittedPlayerIds, unavailable]);
  const currentPrivateIdentity: MainPrivateIdentity | null = session && deskTeam ? {
    sessionId: session.id,
    leagueId: session.leagueId,
    seasonNumber: session.seasonNumber,
    teamId: deskTeam.id,
  } : null;
  const currentPrivateIdentityKey = currentPrivateIdentity
    ? `${currentPrivateIdentity.sessionId}|${currentPrivateIdentity.leagueId}|${currentPrivateIdentity.seasonNumber}|${currentPrivateIdentity.teamId}`
    : null;
  if (privateIdentityKeyRef.current !== currentPrivateIdentityKey) {
    privateIdentityKeyRef.current = currentPrivateIdentityKey;
    privateEpochRef.current += 1;
  }
  const currentPrivateScopeKey = currentPrivateIdentityKey
    ? `${currentPrivateIdentityKey}|${privateEpochRef.current}`
    : null;
  privateIdentityRef.current = currentPrivateIdentity;
  useLayoutEffect(() => {
    setAssistantOptimizePlayerId(null);
    setBoardUndo(null);
    undoOperationRef.current = null;
    setUndoWorking(false);
  }, [currentPrivateIdentityKey]);
  const currentLocked = useMemo(() => deskTeam && session
    ? resolveLockedSeat({ team: deskTeam, session })
    : null, [deskTeam, session]);
  const liveAlignment = useMemo(() => {
    if (!session || session.completedPicks.some((pick) => !playerById.has(pick.playerId))) return [];
    return computeSnakeDraftAlignment(buildSnakeDraftAlignmentInputs({ session, playersById: playerById }));
  }, [playerById, session]);
  const deskAlignment = deskTeam
    ? liveAlignment.find((row) => row.teamId === deskTeam.id) ?? null
    : null;
  const currentBoard = deskTeam ? session?.seatBoards?.[deskTeam.id] : null;
  const defaultCandidateId = useMemo(() => {
    const ranked = [
      ...(currentBoard?.rankings.global ?? []),
      ...Object.values(currentBoard?.slots ?? {}),
      ...activePoolRows.map((row) => row.id),
    ];
    return ranked.find((id) => !unavailable.has(id) && playerById.has(id) && poolById.has(id)) ?? null;
  }, [activePoolRows, currentBoard, playerById, poolById, unavailable]);
  const selectedPlayerId = deskTeam ? selectedPlayerIdByTeam[deskTeam.id] ?? null : null;
  useEffect(() => {
    if (!deskTeam) return;
    if (!selectedPlayerId
      || (unavailable.has(selectedPlayerId) && !ownCommittedPlayerIds.has(selectedPlayerId))
      || !playerById.has(selectedPlayerId)
      || !poolById.has(selectedPlayerId)) {
      setSelectedPlayerIdByTeam((current) => current[deskTeam.id] === defaultCandidateId
        ? current
        : { ...current, [deskTeam.id]: defaultCandidateId });
    }
  }, [defaultCandidateId, deskTeam, ownCommittedPlayerIds, playerById, poolById, selectedPlayerId, unavailable]);
  const candidateId = selectedPlayerId
    && (!unavailable.has(selectedPlayerId) || ownCommittedPlayerIds.has(selectedPlayerId))
    && playerById.has(selectedPlayerId)
    && poolById.has(selectedPlayerId)
      ? selectedPlayerId
      : defaultCandidateId;
  const seatingPlayers = useMemo(() => activePoolRows.flatMap((row) => {
    const player = playerById.get(row.id);
    if (!player) return [];
    return [{
      playerId: player.id,
      sourceId: snakePlayerSourceId(player),
      versionGroupId: snakePlayerVersionGroupId(player),
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
  const truthPlayersById = useMemo(() => new Map(activePoolRows.flatMap((row) => {
    const player = playerById.get(row.id);
    const seating = seatingById.get(row.id);
    return player && seating ? [[row.id, { player, construction: seating.construction }] as const] : [];
  })), [activePoolRows, playerById, seatingById]);
  const frozenIvById = useMemo(() => new Map(activePoolRows.map((row) => [row.id, row.iv])), [activePoolRows]);
  const publicTruthByTeamId = useMemo(() => {
    if (!session || !pool) return {};
    return Object.fromEntries(leagueTeams.map((team) => {
      const picks = session.completedPicks.filter((pick) => pick.teamId === team.id);
      const resolvedPlayers = picks.flatMap((pick) => truthPlayersById.get(pick.playerId)?.player ?? []);
      const chemistry = buildChemistryStrip(resolvedPlayers.length === picks.length ? resolvedPlayers : null);
      const ledger = buildDraftedRosterLedger({
        picks,
        playersById: truthPlayersById,
        frozenIvById,
        budget: pool.tierCap,
        baseCaps: pool.luxuryCaps,
        realTeamCount: leagueTeams.length,
        capIdentity: resolveLockedSeat({ team, session }).capIdentity,
      });
      return [team.id, { ledger, chemistry }];
    }));
  }, [frozenIvById, leagueTeams, pool, session, truthPlayersById]);
  const pickValueChart = useMemo(() => derivePickValueChart(
    activePoolRows.map((row) => row.iv),
    session?.pickOrder.length ?? 0,
    Math.max(1, leagueTeams.length),
  ), [activePoolRows, leagueTeams.length, session?.pickOrder.length]);
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
  const [seatingProofResult, setSeatingProofResult] = useState<SnakeSeatingProof | null>(null);
  useEffect(() => {
    if (!seatingProofInput) {
      setSeatingProofResult(null);
      return;
    }
    const persisted = session?.snakeSetup?.seatingCertificate;
    if (persisted && seedSnakeGuideSeatingProof(seatingProofInput, persisted)) {
      setSeatingProofResult(persisted);
      return;
    }
    let cancelled = false;
    setSeatingProofResult(null);
    const run = () => {
      const proof = primeSnakeGuideSeatingProof(seatingProofInput);
      if (!cancelled) setSeatingProofResult(proof);
    };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run);
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const id = globalThis.setTimeout(run, 0);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(id);
    };
  }, [seatingProofInput, session?.snakeSetup?.seatingCertificate]);
  const deskRoomPlayers = useMemo(() => activePoolRows.flatMap((row) => {
    const player = playerById.get(row.id);
    const seating = seatingById.get(row.id);
    if (!player || !seating) return [];
    const deskPlayer = buildDeskRoomPlayer({ player, price: row.iv, seating });
    return deskPlayer ? [deskPlayer] : [];
  }), [activePoolRows, playerById, seatingById]);
  const deskRoomById = useMemo(() => new Map(deskRoomPlayers.map((player) => [player.playerId, player])), [deskRoomPlayers]);
  const assistantLivePlayers = useMemo(() => activePoolRows.flatMap((row) => {
    const player = playerById.get(row.id);
    const seating = seatingById.get(row.id);
    const deskPlayer = deskRoomById.get(row.id);
    if (!player || !seating || !deskPlayer) return [];
    return [buildSnakeAssistantLivePlayer({
      player,
      frozenIv: row.iv,
      seating,
      archetypeWeights: deskPlayer.archetypeWeights,
    })];
  }), [activePoolRows, deskRoomById, playerById, seatingById]);
  const boardEligibilityCandidates = useMemo(() => deskRoomPlayers.map((player) => ({
    id: player.playerId,
    iv: player.price,
    position: player.position,
    eligiblePositions: player.eligiblePositions,
    rosterShape: player.shape,
    sourceId: player.sourceId,
    versionGroupId: player.versionGroupId,
  })), [deskRoomPlayers]);

  const candidate = useMemo<SnakeReviewCandidate | null>(() => {
    if (!candidateId || !session || !pool || !deskTeam) return null;
    const player = playerById.get(candidateId);
    const priced = poolById.get(candidateId);
    const model = seatingById.get(candidateId);
    if (!player || !priced || !model) return null;
    const completedPick = completedPickByPlayerId.get(candidateId);
    if (completedPick) {
      const draftedBy = draftedTeamNameByPlayerId.get(candidateId) ?? UNKNOWN_TEAM;
      return {
        id: player.id,
        name: fullName(player.firstName, player.lastName),
        position: player.primaryPosition,
        consequence: completedPick.teamId === deskTeam.id
          ? 'COMMITTED TO YOUR 22-MAN ROSTER.'
          : `DRAFTED BY ${draftedBy.toUpperCase()}.`,
        blockReason: completedPick.teamId === deskTeam.id
          ? 'ALREADY ON YOUR ROSTER.'
          : `ALREADY DRAFTED BY ${draftedBy.toUpperCase()}.`,
      };
    }
    const teamPicks = session.completedPicks.filter((pick) => pick.teamId === deskTeam.id);
    const roster = teamPicks.flatMap((pick) => {
      const row = seatingById.get(pick.playerId);
      return row ? [row] : [];
    });
    const rosterTruthComplete = roster.length === teamPicks.length && teamPicks.every((pick) => (
      Number.isFinite(pick.settledSalary ?? poolById.get(pick.playerId)?.iv)
    ));
    if (!rosterTruthComplete) {
      return {
        id: player.id,
        name: fullName(player.firstName, player.lastName),
        position: player.primaryPosition,
        consequence: 'MONEY AND ROSTER IMPACT —',
        blockReason: 'DRAFTED ROSTER DATA IS INCOMPLETE.',
      };
    }
    const spent = teamPicks.reduce((sum, pick) => sum + (pick.settledSalary ?? poolById.get(pick.playerId)?.iv ?? 0), 0);
    const remaining = seatingPlayers.filter((row) => row.playerId !== candidateId && !unavailable.has(row.playerId));
    const marginalTax = auctionMarginalTaxWithCaps(
      roster.map((entry) => entry.construction),
      model.construction,
      currentLocked?.capIdentity,
      snakeLuxuryCaps(pool.luxuryCaps),
    );
    const cacheKey = `${deskTeam.id}:${session.revision ?? 0}:${candidateId}`;
    let bill = legalFinishCacheRef.current.get(cacheKey);
    if (!bill) {
      bill = evaluateSnakeLegalFinish({
        currentRoster: [...roster, model],
        committedSpent: spent + priced.iv,
        availablePool: remaining,
        budget: pool.tierCap,
        baseCaps: pool.luxuryCaps,
        realTeamCount: leagueTeams.length,
        capIdentity: currentLocked?.capIdentity,
      });
      legalFinishCacheRef.current.set(cacheKey, bill);
    }
    const pickProofKey = `${deskTeam.id}:${session.revision ?? 0}:${candidateId}`;
    let simultaneous = seatingPickProofCacheRef.current.get(pickProofKey) ?? null;
    if (!simultaneous && seatingProofInput && seatingProofResult?.feasible) {
      simultaneous = proveSnakePickKeepsAllClubsSeated({
        current: seatingProofInput,
        teamId: deskTeam.id,
        player: model,
        allInCost: priced.iv + marginalTax,
        currentProof: seatingProofResult,
      });
      seatingPickProofCacheRef.current.set(pickProofKey, simultaneous);
    }
    const blockReason = !bill.feasible
      ? 'THIS PICK LEAVES NO LEGAL 22.'
      : !snakeMoneyNonnegative(bill.legalFinishCushion) && bill.affordability === 'BLOCKED'
        ? `YOU NEED $${Math.abs(Math.round(bill.legalFinishCushion)).toLocaleString()} MORE TO FINISH A LEGAL 22.`
        : !simultaneous?.feasible
          ? simultaneous?.message ?? 'THIS PICK BREAKS THE SHARED DRAFT PLAN.'
        : null;
    const line = blockReason ?? (bill.affordability === 'OPEN'
      ? 'FINISH COST CHECK OPEN.'
      : `AFTER THIS PICK AND A LEGAL FINISH: $${Math.round(bill.legalFinishCushion).toLocaleString()} LEFT.`);
    return {
      id: player.id,
      name: fullName(player.firstName, player.lastName),
      position: player.primaryPosition,
      consequence: line,
      blockReason,
    };
  }, [candidateId, completedPickByPlayerId, currentLocked, deskTeam, draftedTeamNameByPlayerId, leagueTeams.length, playerById, pool, poolById, seatingById, seatingPlayers, seatingProofInput, seatingProofResult, session, unavailable]);

  const activePlanBroken = useMemo(() => {
    if (!session || !draftingTeam || !currentSlot || !seatingProofResult) return false;
    if (!seatingProofResult.feasible) return true;
    // A successful constructive proof reserves a complete, affordable roster
    // from the one shared pool. Its next reserved card is therefore a concrete
    // legal pick; scanning and re-solving every visible candidate is redundant.
    const assignment = seatingProofResult.assignments.find((row) => row.teamId === draftingTeam.id);
    return !assignment || assignment.playerIds.length === 0;
  }, [currentSlot, draftingTeam, seatingProofResult, session]);

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
  const ticker = useMemo(() => buildSnakePickTicker({
    picks: session?.completedPicks ?? [],
    players,
    teams: leagueTeams,
    versionState: session?.versionState,
    unknownPlayer: UNKNOWN_PLAYER,
    unknownTeam: UNKNOWN_TEAM,
  }), [leagueTeams, players, session?.completedPicks, session?.versionState]);
  const latestPick = session?.completedPicks.at(-1);
  const currentBoardPlayerIds = new Set([
    ...(currentBoard?.rankings.global ?? []),
    ...Object.values(currentBoard?.slots ?? {}),
  ]);
  const privateSnipeKey = latestPick && currentBoardPlayerIds.has(latestPick.playerId)
    ? `${latestPick.pick}:${latestPick.playerId}`
    : null;

  const persist = useCallback(async (next: NonNullable<typeof session>) => {
    const saved = await saveMlbDraftRoomSession(next, session?.revision ?? 0);
    setSession(saved);
    return saved;
  }, [session?.revision]);
  const planBrokenPauseRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activePlanBroken || !session || session.paused || !currentSlot) return;
    const key = `${session.id}:${session.revision ?? 0}:${currentSlot.pick}`;
    if (planBrokenPauseRef.current === key) return;
    planBrokenPauseRef.current = key;
    setWriteNotice('PLAN BROKEN — NO PICK LEAVES A LEGAL, AFFORDABLE 22. THE ROOM IS PAUSED.');
    void persist({ ...session, paused: true, revision: (session.revision ?? 0) + 1 }).catch((cause) => {
      planBrokenPauseRef.current = null;
      setWriteNotice(cause instanceof Error ? cause.message : String(cause));
    });
  }, [activePlanBroken, currentSlot, persist, session]);

  const rememberBackfillEvents = useCallback((eventsByTeamId: Record<string, BoardBackfillEvent[]>) => {
    if (Object.keys(eventsByTeamId).length === 0) return;
    setBackfillEventsBySeat((current) => {
      const next = { ...current };
      let changed = false;
      for (const [teamId, events] of Object.entries(eventsByTeamId)) {
        const previous = next[teamId] ?? [];
        const known = new Set(previous.map((event) => `${event.slotId}:${event.gonePlayerId}`));
        const additions = events.filter((event) => !known.has(`${event.slotId}:${event.gonePlayerId}`));
        if (additions.length === 0) continue;
        next[teamId] = [...previous, ...additions];
        changed = true;
      }
      return changed ? next : current;
    });
  }, []);
  const backfillToastCountRef = useRef(0);
  const backfillToastCount = Object.values(backfillEventsBySeat).reduce((sum, rows) => sum + rows.length, 0);
  useEffect(() => {
    if (backfillToastCount <= backfillToastCountRef.current) return;
    backfillToastCountRef.current = backfillToastCount;
    setWriteNotice('DRAFT BOARD UPDATED — A TARGET WAS TAKEN.');
  }, [backfillToastCount]);

  const reconcileAllExistingBoards = useCallback((source: NonNullable<typeof session>) => {
    const sourceUnavailable = new Set(source.completedPicks.map((pick) => pick.playerId));
    for (const id of unavailableVersionPlayerIds(source.versionState)) sourceUnavailable.add(id);
    return reconcileExistingSeatBoards({
      session: source,
      candidates: boardEligibilityCandidates,
      unavailablePlayerIds: sourceUnavailable,
    });
  }, [boardEligibilityCandidates]);

  useEffect(() => {
    if (!session || boardEligibilityCandidates.length === 0) return;
    const reconciled = reconcileAllExistingBoards(session);
    rememberBackfillEvents(reconciled.eventsByTeamId);
    if (!reconciled.changed) return;
    void persist(reconciled.session).catch((cause) => {
      setWriteNotice(cause instanceof Error ? cause.message : String(cause));
    });
  }, [boardEligibilityCandidates.length, persist, reconcileAllExistingBoards, rememberBackfillEvents, session]);

  const acceptCompanionSession = useCallback((saved: NonNullable<typeof session>) => {
    setSession(saved);
  }, []);

  const publishCurrentCompanionRoom = useCallback(async () => {
    if (!session) throw new Error('THE CURRENT ROOM IS NOT READY.');
    const expectedRevision = session.revision ?? 0;
    const expectedSessionId = session.id;
    const publishedRevision = expectedRevision + 1;
    const publishedAt = new Date().toISOString();
    const publicationId = globalThis.crypto?.randomUUID?.()
      ?? `snake-room-publication-${expectedSessionId}-${publishedRevision}-${Date.now()}`;
    const saved = await updateMlbDraftSessionAtomically(
      session.leagueId,
      session.seasonNumber,
      (fresh) => {
        if (fresh.id !== expectedSessionId || (fresh.revision ?? 0) !== expectedRevision) {
          throw new Error('THE DRAFT MOVED. RELOAD THE ROOM, THEN SYNC COMPANIONS AGAIN.');
        }
        return {
          ...fresh,
          revision: publishedRevision,
          companionRoomPublication: {
            formatVersion: 'snake-companion-room-publication-v1',
            publicationId,
            supersedesRevision: expectedRevision,
            publishedRevision,
            publishedAt,
          },
        };
      },
    );
    setSession(saved);
    try {
      await syncEngine.publishCommissionerSnakeRoom(saved);
      setSyncError(null);
      setWriteNotice(null);
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause);
      setWriteNotice(`THE ROOM IS STILL SAVED HERE. COMPANION SYNC FAILED — ${detail}`);
      throw cause;
    }
  }, [session]);

  const rationalRiskRequest = useMemo(() => {
    if (!privateDeskActive || !session || !pool || !deskTeam) return null;
    const available = deskRoomPlayers.filter((player) => !unavailable.has(player.playerId));
    const seats = buildRationalSeats({
      teams: leagueTeams,
      session,
      playersById: deskRoomById,
      budget: pool.tierCap,
    });
    return buildSnakeRationalRiskRequest({
      session,
      askingTeamId: deskTeam.id,
      askedPlayerIds: [...new Set([
        candidateId,
        ...Object.values(currentBoard?.slots ?? {}),
        ...(currentBoard?.rankings.global ?? []).slice(0, 22),
      ].filter((playerId): playerId is string => Boolean(playerId)
        && available.some((player) => player.playerId === playerId)))],
      availablePlayers: available,
      seats,
      baseCaps: pool.luxuryCaps,
      realTeamCount: leagueTeams.length,
    });
  }, [candidateId, currentBoard, deskRoomById, deskRoomPlayers, deskTeam, leagueTeams, pool, privateDeskActive, session, unavailable]);
  const rationalRiskState = useSnakeRationalRisks(rationalRiskRequest);
  const askedRiskIds = useMemo(
    () => new Set(rationalRiskRequest?.input.askedPlayerIds ?? []),
    [rationalRiskRequest],
  );

  const deskState = useMemo(() => {
    if (!privateDeskActive || !session || !pool || !deskTeam) return null;
    const locked = currentLocked ?? resolveLockedSeat({ team: deskTeam, session });
    const caps = snakeLuxuryCaps(pool.luxuryCaps);
    const seats = buildRationalSeats({ teams: leagueTeams, session, playersById: deskRoomById, budget: pool.tierCap });
    const ownSeat = seats.find((seat) => seat.teamId === deskTeam.id);
    if (!ownSeat) return null;
    const need = rosterNeedBreakdown(ownSeat.roster.map((player) => player.shape));
    const teamPicks = session.completedPicks.filter((pick) => pick.teamId === deskTeam.id);
    const draftedStoredPlayers = teamPicks.flatMap((pick) => playerById.get(pick.playerId) ?? []);
    const draftedPlayersComplete = draftedStoredPlayers.length === teamPicks.length && ownSeat.roster.length === teamPicks.length;
    const draftedMoneyComplete = draftedPlayersComplete && teamPicks.every((pick) => Number.isFinite(
      pick.settledSalary ?? poolById.get(pick.playerId)?.iv,
    ));
    const draftedChemistry = buildChemistryStrip(draftedPlayersComplete ? draftedStoredPlayers : null);
    const openSlots = openRosterSlots(session, deskTeam.id);
    const available = deskRoomPlayers.filter((player) => !unavailable.has(player.playerId));
    const risks = rationalRiskState.risks ?? [];
    const riskById = new Map(risks.map((row) => [row.playerId, row]));
    const fitWorthById = new Map(deskRoomPlayers.map((player) => [player.playerId, computeOwnValue({
      iv: player.price,
      archetypeWeights: player.archetypeWeights,
      ownBandPriorities: locked.priorities,
      archetypeFitMultiplierOverride: constructionArchetypeFitMultiplier(
        locked.capIdentity,
        player.construction,
      ),
      needBreakdown: need,
      shape: player.shape,
      openSlots,
    })]));
    const contextualCandidates = deskRoomPlayers.flatMap((player) => {
      const contextualWorth = fitWorthById.get(player.playerId);
      return Number.isFinite(contextualWorth) ? [{
        playerId: player.playerId,
        iv: contextualWorth!,
        candidate: player.stored,
        shape: player.shape,
      }] : [];
    });
    const contextualWorthComplete = contextualCandidates.length === deskRoomPlayers.length;
    const assembled = assembleBoard({
      candidates: contextualCandidates,
      rosterPlayers: ownSeat.roster.flatMap((player) => playerById.get(player.playerId) ?? []),
      need,
    });
    const advisorWorthById = new Map(assembled.map((row) => [row.playerId, row.worth]));
    const candidates: DeskCandidate[] = deskRoomPlayers.flatMap((player) => {
      const advisorWorth = advisorWorthById.get(player.playerId);
      if (!contextualWorthComplete || !Number.isFinite(advisorWorth)) return [];
      const completedPick = completedPickByPlayerId.get(player.playerId);
      const draftedByActiveTeam = completedPick?.teamId === deskTeam.id;
      const committedRosterForTax = draftedByActiveTeam
        ? ownSeat.roster.filter((entry) => entry.playerId !== player.playerId)
        : ownSeat.roster;
      const marginalTax = auctionMarginalTaxWithCaps(
        committedRosterForTax.map((entry) => entry.construction),
        player.construction,
        locked.capIdentity,
        caps,
      );
      const displayedSalary = draftedByActiveTeam
        ? completedPick.settledSalary ?? player.price
        : player.price;
      const risk = riskById.get(player.playerId);
      return [{
        id: player.playerId,
        name: fullName(player.stored.firstName, player.stored.lastName).toUpperCase(),
        identityChips: buildSnakePlayerIdentityChips(player.stored, deskRoomPlayers.map((entry) => entry.stored)),
        position: player.position,
        eligiblePositions: player.eligiblePositions,
        rosterShape: player.shape,
        sourceId: player.sourceId,
        versionGroupId: player.versionGroupId,
        advisorWorth: advisorWorth!,
        iv: player.price,
        marginalTax,
        trueCost: displayedSalary + marginalTax,
        archetypeChip: locked.archetypeName,
        fitWord: fitWord({
          player,
          priorities: locked.priorities,
          capIdentity: locked.capIdentity,
          baseCaps: pool.luxuryCaps,
          need,
          openSlots,
        }),
        risk: risk?.risk ?? 'SAFE_TO_WAIT',
        riskPending: askedRiskIds.has(player.playerId) && (rationalRiskState.status === 'pending'
          || (rationalRiskState.status === 'ready' && !risk)),
        riskUnavailable: askedRiskIds.has(player.playerId) && rationalRiskState.status === 'unavailable',
        hasNextPick: risk?.nextPick !== null,
        riskReason: risk
          ? `${risk.rationalBuyersBeforeTurn} ${risk.rationalBuyersBeforeTurn === 1 ? 'CLUB COULD' : 'CLUBS COULD'} SELECT THIS PLAYER BEFORE YOUR TURN.`
          : rationalRiskState.status === 'unavailable'
            ? 'NEXT-TURN RISK IS UNAVAILABLE.'
            : 'NEXT-TURN RISK CALCULATING.',
        legalFinishLine: '',
        construction: player.construction,
        drafted: Boolean(completedPick),
        draftedByActiveTeam,
        draftedByTeamName: completedPick ? draftedTeamNameByPlayerId.get(player.playerId) : undefined,
        consequencesKnown: draftedPlayersComplete,
      }];
    });
    const seeded = currentBoard ? null : buildSeededSeatBoard(candidates);
    const availability = currentBoard
      ? reconcileBoardAvailability({ board: currentBoard, candidates, unavailablePlayerIds: boardUnavailable })
      : seeded?.board
        ? reconcileBoardAvailability({ board: seeded.board, candidates, unavailablePlayerIds: boardUnavailable })
        : null;
    const board = availability?.board ?? seeded?.board ?? null;
    const brokenSlots = [...new Set([
      ...(availability?.brokenSlots ?? seeded?.brokenSlots ?? []),
      ...SNAKE_BOARD_SLOT_IDS.filter((slotId) => !board?.slots[slotId]),
    ])];
    const boardIsCanonical = Boolean(board && isCanonicalSnakeBoard({
      slots: board.slots,
      candidates: boardEligibilityCandidates,
    }));
    const planBill = board && brokenSlots.length === 0 && boardIsCanonical
      ? evaluateSnakePlan({
          boardPlayerIds: Object.values(board.slots),
          players: deskRoomPlayers,
          budget: pool.tierCap,
          baseCaps: pool.luxuryCaps,
          realTeamCount: leagueTeams.length,
          capIdentity: locked.capIdentity,
        })
      : null;
    const cheapestFinish = draftedMoneyComplete ? evaluateSnakeLegalFinish({
      currentRoster: ownSeat.roster,
      committedSpent: ownSeat.committedSpent,
      availablePool: available,
      budget: pool.tierCap,
      baseCaps: pool.luxuryCaps,
      realTeamCount: leagueTeams.length,
      capIdentity: locked.capIdentity,
    }) : null;
    const cheapestFinishDepthByPlayerId = new Map<string, number>();
    for (const playerId of cheapestFinish?.completionPlayerIds ?? []) {
      const completionPlayer = deskRoomById.get(playerId);
      if (!completionPlayer) continue;
      cheapestFinishDepthByPlayerId.set(playerId, canonicalSnakeRoleDepth(
        completionPlayer.shape,
        available.map((entry) => entry.shape),
      ));
    }
    const planStoredPlayers = planBill?.playerIds.flatMap((playerId) => playerById.get(playerId) ?? []) ?? [];
    const planChemistry = buildChemistryStrip(planBill && planStoredPlayers.length === planBill.playerIds.length ? planStoredPlayers : null);
    const displayCandidates = candidates.map((candidate): DeskCandidate => {
      const canonicalRisk = applyCanonicalSnakeRiskTriggers({
        playoutRisk: candidate.risk,
        planCushion: planBill?.planCushion ?? null,
        cheapestFinishPositionDepth: cheapestFinishDepthByPlayerId.get(candidate.id) ?? null,
      });
      return {
        ...candidate,
        risk: canonicalRisk,
        riskPending: candidate.riskPending && canonicalRisk === 'SAFE_TO_WAIT',
        riskReason: snakeBoardOverBudgetReason(planBill?.planCushion ?? null)
          ?? ((cheapestFinishDepthByPlayerId.get(candidate.id) ?? Number.POSITIVE_INFINITY) <= 2
            ? `ONLY ${cheapestFinishDepthByPlayerId.get(candidate.id)} CANONICAL ROLE OPTIONS REMAIN FOR THE CHEAPEST LEGAL FINISH.`
            : candidate.riskReason),
      };
    });
    const candidateById = new Map(displayCandidates.map((candidate) => [candidate.id, candidate]));
    const slotDepth = Object.fromEntries(Object.keys(board?.slots ?? {}).map((slotId) => {
      const position = boardSlotPosition(slotId as SnakeBoardSlotId)
        ?? candidateById.get(board?.slots[slotId as SnakeBoardSlotId] ?? '')?.position;
      const ranked = position ? board?.rankings.byPosition?.[position] ?? [] : [];
      return [slotId, ranked.filter((id) => !unavailable.has(id)).length];
    }));
    const seatBackfillEvents = [...new Map([
      ...(backfillEventsBySeat[deskTeam.id] ?? []),
      ...(availability?.events ?? []),
    ].map((event) => [`${event.slotId}:${event.gonePlayerId}`, event])).values()];
    const activeLog: AdvisorLogEntry[] = [
      ...seatBackfillEvents.map((event) => {
        const gone = candidateById.get(event.gonePlayerId)?.name ?? UNKNOWN_PLAYER;
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
      ...Object.entries(slotDepth).flatMap(([slotId, depth]) => depth <= 1 ? [{
        key: `depth:${slotId}`,
        text: `ONLY ${depth} AVAILABLE NAME${depth === 1 ? '' : 'S'} REMAIN FOR ${slotId}.`,
        actionable: true,
      }] : []),
      ...(planBill && !snakeMoneyNonnegative(planBill.planCushion) ? [{
        key: 'plan:over-budget',
        text: `YOUR 22-MAN PLAN IS $${Math.abs(Math.round(planBill.planCushion)).toLocaleString()} OVER THE SAFE FINISH LINE.`,
        actionable: true,
      }] : []),
      ...Object.values(board?.slots ?? {}).flatMap((playerId) => {
        const player = candidateById.get(playerId);
        return player?.risk === 'LIKELY_GONE'
          ? [{
              key: `risk:${playerId}`,
              playerId,
              text: `${player.name} → LIKELY GONE — ${player.riskReason}`,
              actionable: true,
            }]
          : [];
      }),
    ];
    return {
      locked,
      assistantWorthComplete: candidates.length === deskRoomPlayers.length,
      candidates: displayCandidates,
      board,
      brokenSlots,
      planBill,
      planChemistry,
      draftedChemistry,
      assistantNeed: draftedPlayersComplete ? need : null,
      selectedCandidate: candidateId ? candidateById.get(candidateId) ?? null : null,
      activeLog,
      availability,
      slotDepth,
      taxCoreRows: board ? buildTaxCoreRows({ candidates: displayCandidates, boardPlayerIds: Object.values(board.slots), caps }) : [],
    };
  }, [askedRiskIds, backfillEventsBySeat, boardEligibilityCandidates, boardUnavailable, candidateId, completedPickByPlayerId, currentBoard, currentLocked, deskRoomById, deskRoomPlayers, deskTeam, draftedTeamNameByPlayerId, leagueTeams, playerById, pool, poolById, privateDeskActive, rationalRiskState.risks, rationalRiskState.status, session, unavailable]);

  const assistantIdentity = useMemo(() => session && deskTeam && deskState?.board && privateDeskActive ? {
    sessionId: session.id,
    sessionRevision: session.revision ?? 0,
    teamId: deskTeam.id,
    seatId: deskTeam.gmSeatId ?? deskTeam.id,
    deviceId: `main:${session.id}`,
    privateEpoch: privateEpochRef.current,
    boardRevision: deskState.board.revision,
  } : null, [deskState?.board, deskTeam, privateDeskActive, session]);
  const assistantRequest = useMemo(() => {
    if (!privateDeskActive || !session || !pool || !league || !deskTeam || !deskState?.board
      || !deskState.assistantWorthComplete || !assistantIdentity) return null;
    const archetypeId = session.snakeSetup?.clubs.find((club) => club.teamId === deskTeam.id)?.archetypeId
      ?? deskTeam.mlbArchetypeKey;
    const historical = HISTORICAL_ARCHETYPES.find((entry) => entry.id === archetypeId);
    return buildSnakeAssistantBoardRequest({
      identity: assistantIdentity,
      frozenPoolIdentity: `${session.id}:${session.snakeSetup?.orderSeed ?? ''}`,
      engineInput: {
        activePool: assistantLivePlayers,
        completedPicks: session.completedPicks.map((pick) => ({
          teamId: pick.teamId,
          playerId: pick.playerId,
          settledSalary: pick.settledSalary,
        })),
        versionState: session.versionState,
        versionSelections: session.snakeSetup?.versionSelections,
        selectedPinPlayerId: assistantOptimizePlayerId,
        archetype: historical ? historicalToSimArchetype(historical) : { name: 'Balanced', rawShift: {} },
        ownBandPriorities: deskState.locked.priorities,
        gmRankOverrides: deskState.board.rankings,
        tier: league.tier ?? 'juiced',
        budget: pool.tierCap,
        baseCaps: pool.luxuryCaps,
        realTeamCount: leagueTeams.length,
        capIdentity: deskState.locked.capIdentity,
      },
      savedDesignSlots: deskTeam.rosterDesign?.slots,
    });
  }, [assistantIdentity, assistantLivePlayers, assistantOptimizePlayerId, deskState, deskTeam, league, leagueTeams.length, pool, privateDeskActive, session]);
  const assistantBoardState = useSnakeAssistantBoard(assistantRequest);
  const consequencePlayers = useMemo(() => {
    const candidateById = new Map((deskState?.candidates ?? []).map((entry) => [entry.id, entry]));
    return assistantLivePlayers.flatMap((player) => {
      const candidate = candidateById.get(player.playerId);
      return candidate ? [{
        ...player,
        advisorWorth: candidate.advisorWorth,
        fitWord: candidate.fitWord,
        eligiblePositions: candidate.eligiblePositions ?? [candidate.position],
      }] : [];
    });
  }, [assistantLivePlayers, deskState?.candidates]);
  const selectedConsequence = useMemo<SelectedPlayerConsequence | null>(() => {
    if (!privateDeskActive || !assistantIdentity || !session || !pool || !deskTeam || !deskState?.board) return null;
    return buildSelectedPlayerConsequence({
      identity: assistantIdentity,
      selectedPlayerId: candidateId,
      teamId: deskTeam.id,
      board: deskState.board,
      designSlots: deskTeam.rosterDesign?.slots,
      players: consequencePlayers,
      completedPicks: session.completedPicks.map((pick) => ({
        teamId: pick.teamId,
        playerId: pick.playerId,
        settledSalary: pick.settledSalary,
      })),
      versionState: session.versionState,
      versionSelections: session.snakeSetup?.versionSelections,
      budget: pool.tierCap,
      baseCaps: pool.luxuryCaps,
      realTeamCount: leagueTeams.length,
      capIdentity: deskState.locked.capIdentity,
    });
  }, [assistantIdentity, candidateId, consequencePlayers, deskState, deskTeam, leagueTeams.length, pool, privateDeskActive, session]);

  const selectedRisk = useMemo(() => rationalRiskState.status === 'ready' && candidateId
    ? rationalRiskState.risks?.find((row) => row.playerId === candidateId) ?? null
    : null, [candidateId, rationalRiskState.risks, rationalRiskState.status]);
  const selectedScarcity = useMemo(() => rationalRiskState.status === 'ready' && candidateId
    ? rationalRiskState.scarcity?.filter((row) => row.playerId === candidateId) ?? null
    : null, [candidateId, rationalRiskState.scarcity, rationalRiskState.status]);
  const selectedDecisionFacts = useMemo(() => buildSnakeDecisionCandidateFacts({
    playerId: candidateId ?? '',
    candidate: deskState?.selectedCandidate ?? null,
    consequence: selectedConsequence,
  }), [candidateId, deskState?.selectedCandidate, selectedConsequence]);
  const replacementDecisionFacts = useMemo(() => {
    if (!privateDeskActive || !assistantIdentity || !session || !pool
      || !deskTeam || !deskState?.board || !candidateId || !selectedScarcity) return null;
    const candidatesById = new Map(deskState.candidates.map((candidate) => [candidate.id, candidate]));
    const replacementIds = [...new Set(selectedScarcity.flatMap((row) => (
      row.replacementState === 'AVAILABLE'
      && row.replacementPlayerId
      && row.replacementPlayerId !== candidateId
      && !unavailable.has(row.replacementPlayerId)
        ? [row.replacementPlayerId]
        : []
    )))];
    return replacementIds.flatMap((replacementId) => {
      const consequence = buildSelectedPlayerConsequence({
        identity: assistantIdentity,
        selectedPlayerId: replacementId,
        teamId: deskTeam.id,
        board: deskState.board!,
        designSlots: deskTeam.rosterDesign?.slots,
        players: consequencePlayers,
        completedPicks: session.completedPicks.map((pick) => ({
          teamId: pick.teamId,
          playerId: pick.playerId,
          settledSalary: pick.settledSalary,
        })),
        versionState: session.versionState,
        versionSelections: session.snakeSetup?.versionSelections,
        budget: pool.tierCap,
        baseCaps: pool.luxuryCaps,
        realTeamCount: leagueTeams.length,
        capIdentity: deskState.locked.capIdentity,
      });
      return buildSnakeDecisionCandidateFacts({
        playerId: replacementId,
        candidate: candidatesById.get(replacementId) ?? null,
        consequence,
      }) ?? [];
    });
  }, [assistantIdentity, candidateId, consequencePlayers, deskState, deskTeam, leagueTeams.length, pool, privateDeskActive, selectedScarcity, session, unavailable]);
  const assistantPriorityPlayerIds = assistantBoardState.status === 'ready'
    ? assistantBoardState.board?.playerIds ?? null
    : null;
  const infeasibleForPlayerId = assistantBoardState.infeasibleReason
    && assistantOptimizePlayerId === candidateId
      ? candidateId
      : null;
  const guideThreatPick = snakeGuideThreatPick({
    selectedPlayerId: candidateId,
    askingTeamId: deskTeam?.id ?? null,
    livePickTeamId: currentSlot?.teamId ?? null,
    assistantPriorityPlayerIds,
    assistantInfeasibleReason: assistantBoardState.infeasibleReason,
    infeasibleForPlayerId,
    selected: selectedDecisionFacts,
    risk: selectedRisk,
    scarcity: selectedScarcity,
  });
  const guideRecommendationRequest = useMemo(() => {
    if (!session || !deskTeam || !seatingProofInput || guideThreatPick === null) return null;
    return buildSnakeGuideRecommendationRequest({
      session,
      buyerTeamId: deskTeam.id,
      earliestThreatPick: guideThreatPick,
      pickValueChart,
      seatingProofInput,
    });
  }, [deskTeam, guideThreatPick, pickValueChart, seatingProofInput, session]);
  const guideRecommendation = useSnakeGuideRecommendation(
    guideRecommendationRequest,
    assistantRequest?.key ?? null,
  );
  const draftDecision = resolveSnakeDraftDecision({
    selectedPlayerId: candidateId,
    askingTeamId: deskTeam?.id ?? null,
    livePickTeamId: currentSlot?.teamId ?? null,
    assistantPriorityPlayerIds,
    assistantInfeasibleReason: assistantBoardState.infeasibleReason,
    infeasibleForPlayerId,
    selected: selectedDecisionFacts,
    replacements: replacementDecisionFacts,
    risk: selectedRisk,
    scarcity: selectedScarcity,
    guide: guideRecommendation,
  });
  const guideDecisionKey = draftDecision?.kind === 'TRADE_TO_PICK'
    ? [
        draftDecision.playerId,
        draftDecision.targetPick,
        draftDecision.proposal.sessionRevision,
        draftDecision.proposal.offerPickNumbers.join(','),
        draftDecision.proposal.receivePickNumbers.join(','),
      ].join(':')
    : null;
  const currentGuideScopeKey = assistantRequest && session && deskTeam && guideDecisionKey
    ? `${assistantRequest.key}|${session.revision ?? 0}|${deskTeam.id}|${guideDecisionKey}`
    : null;
  const activeGuidePrefill = currentGuideScopeKey
    && guidePrefillState?.scopeKey === currentGuideScopeKey
      ? guidePrefillState.prefill
      : null;
  const prefillTradeDecision = useCallback((decision: Extract<SnakeDraftDecision, { kind: 'TRADE_TO_PICK' }>) => {
    if (!session || !currentGuideScopeKey || draftDecision?.kind !== 'TRADE_TO_PICK'
      || decision.playerId !== draftDecision.playerId
      || decision.targetPick !== draftDecision.targetPick) return;
    setGuidePrefillState({
      scopeKey: currentGuideScopeKey,
      prefill: prefillGuideForPackage({ session, proposal: decision.proposal }),
    });
  }, [currentGuideScopeKey, draftDecision, session]);

  useEffect(() => {
    if (!session || !deskTeam || !deskState?.board) return;
    if (session.draftManifest || session.currentPickIndex >= session.pickOrder.length) return;
    const needsSeed = !currentBoard;
    if (!needsSeed) return;
    void persist(updateSessionSeatBoard(session, deskTeam.id, deskState.board)).catch((cause) => {
      setWriteNotice(cause instanceof Error ? cause.message : String(cause));
    });
  }, [currentBoard, deskTeam, deskState, persist, session]);

  useEffect(() => {
    if (!deskTeam || !deskState) return;
    setAdvisorLogBySeat((current) => {
      const previous = current[deskTeam.id] ?? [];
      const next = buildAdvisorLog(previous, deskState.activeLog);
      return JSON.stringify(previous) === JSON.stringify(next) ? current : { ...current, [deskTeam.id]: next };
    });
  }, [deskTeam, deskState]);

  useEffect(() => {
    if (!session || !deskTeam || !deskState) return;
    if (session.draftManifest || session.currentPickIndex >= session.pickOrder.length) return;
    const activeLog = deskState.activeLog.filter((entry) => entry.actionable);
    let wrote = false;
    void updateMlbDraftSessionAtomically(session.leagueId, session.seasonNumber, (fresh) => {
      const existing = fresh.roomLogByTeamId?.[deskTeam.id] ?? [];
      const activeById = new Map(activeLog.map((entry) => [
        `${fresh.id}:${deskTeam.id}:${entry.key}`,
        entry,
      ]));
      const next = existing.map((row) => {
        if (row.kind !== 'ADVISOR' && row.kind !== 'BACKFILL') return row;
        const active = activeById.get(row.id);
        return active
          ? { ...row, text: active.text, actionable: true, expired: false }
          : { ...row, expired: true };
      });
      const known = new Set(existing.map((row) => row.id));
      for (const [id, entry] of activeById) {
        if (known.has(id)) continue;
        next.unshift({
          id,
          kind: entry.key.startsWith('backfill:') ? 'BACKFILL' : 'ADVISOR',
          text: entry.text,
          createdAt: new Date().toISOString(),
          actionable: true,
          expired: false,
        });
      }
      if (JSON.stringify(existing) === JSON.stringify(next)) return fresh;
      wrote = true;
      return {
        ...fresh,
        roomLogByTeamId: { ...fresh.roomLogByTeamId, [deskTeam.id]: next.slice(0, 100) },
        revision: (fresh.revision ?? 0) + 1,
      };
    }).then((saved) => {
      if (wrote) setSession(saved);
    }).catch((cause) => setWriteNotice(cause instanceof Error ? cause.message : String(cause)));
  }, [deskState, deskTeam, session]);

  const selectCandidate = useCallback((playerId: string) => {
    if ((unavailable.has(playerId) && !ownCommittedPlayerIds.has(playerId))
      || !playerById.has(playerId)
      || !poolById.has(playerId)) return;
    if (deskTeam) {
      setAssistantOptimizePlayerId(null);
      setSelectedPlayerIdByTeam((current) => ({ ...current, [deskTeam.id]: playerId }));
    }
  }, [deskTeam, ownCommittedPlayerIds, playerById, poolById, unavailable]);

  const reorderRanking = useCallback(async (view: SnakeRankingView, orderedIds: readonly string[]) => {
    if (!session || !deskTeam || !deskState?.board) return;
    const guard = capturePrivateContext();
    if (!guard || guard.identity.teamId !== deskTeam.id) return;
    const priorBoard = structuredClone(deskState.board);
    const reordered = reorderSeatBoardRankings({
      board: deskState.board,
      view,
      orderedIds,
      candidates: boardEligibilityCandidates,
      unavailablePlayerIds: boardUnavailable,
      committedPlayerIds: ownCommittedPlayerIds,
    });
    if (!reordered.board) {
      if (privateContextIsCurrent(guard)) {
        setWriteNotice(reordered.invalidRoster
          ? 'MY BOARD COULD NOT REFIT — THE RESULT IS NOT A LEGAL 22-PLAYER ROSTER.'
          : `MY BOARD COULD NOT REFIT — ${reordered.brokenSlots.join(', ')} HAS NO AVAILABLE PLAYER.`);
      }
      return;
    }
    let saved: LeagueBuilderMlbDraftSession;
    try {
      saved = await patchMlbDraftSessionSeatBoard({
        leagueId: session.leagueId,
        seasonNumber: session.seasonNumber,
        teamId: deskTeam.id,
        board: reordered.board,
        expectedBoardRevision: deskState.board.revision,
      });
    } catch (cause) {
      if (privateContextIsCurrent(guard)) {
        setWriteNotice(cause instanceof Error ? cause.message : String(cause));
      }
      return;
    }
    const savedBoard = saved.seatBoards?.[deskTeam.id];
    setSession(saved);
    if (!savedBoard || !privateContextIsCurrent(guard)) return;
    setBoardUndo({
      teamId: deskTeam.id,
      board: priorBoard,
      expectedBoardRevision: savedBoard.revision,
      identity: guard.identity,
      changedSlotCount: reordered.changedSlotCount,
    });
  }, [boardEligibilityCandidates, boardUnavailable, capturePrivateContext, deskTeam, deskState, ownCommittedPlayerIds, privateContextIsCurrent, session]);

  const undoBoardUpdate = useCallback(async () => {
    if (!session || !deskTeam || !boardUndo || boardUndo.teamId !== deskTeam.id || undoOperationRef.current) return;
    const guard = capturePrivateContext();
    if (!guard || !sameMainPrivateIdentity(guard.identity, boardUndo.identity)) {
      setBoardUndo(null);
      return;
    }
    const currentBoard = session.seatBoards?.[deskTeam.id];
    if (!currentBoard || currentBoard.revision !== boardUndo.expectedBoardRevision) {
      setBoardUndo(null);
      setWriteNotice('THE DRAFT MOVED BEFORE UNDO COULD BE SAVED. RELOAD THE ROOM.');
      return;
    }
    const restoredBoard: SnakeSeatBoardRecord = {
      ...structuredClone(boardUndo.board),
      revision: currentBoard.revision + 1,
    };
    if (!isCanonicalSnakeBoard({ slots: restoredBoard.slots, candidates: boardEligibilityCandidates })) {
      setBoardUndo(null);
      setWriteNotice('MY BOARD COULD NOT BE SAVED — THE RESULT IS NOT A LEGAL 22-PLAYER ROSTER.');
      return;
    }
    const operation = {};
    undoOperationRef.current = operation;
    setUndoWorking(true);
    try {
      const saved = await patchMlbDraftSessionSeatBoard({
        leagueId: session.leagueId,
        seasonNumber: session.seasonNumber,
        teamId: deskTeam.id,
        board: restoredBoard,
        expectedBoardRevision: currentBoard.revision,
      });
      setSession(saved);
      if (privateContextIsCurrent(guard)) setBoardUndo(null);
    } catch (cause) {
      if (privateContextIsCurrent(guard)) {
        setWriteNotice(cause instanceof Error ? cause.message : String(cause));
      }
    } finally {
      if (undoOperationRef.current === operation) {
        undoOperationRef.current = null;
        setUndoWorking(false);
      }
    }
  }, [boardEligibilityCandidates, boardUndo, capturePrivateContext, deskTeam, privateContextIsCurrent, session]);

  const keepSelectedConsequence = useCallback(async () => {
    if (selectedConsequence?.status !== 'ready' || !session || !deskTeam || !deskState?.board) return;
    const guard = capturePrivateContext();
    const previewIdentity = selectedConsequence.identity;
    if (!guard
      || guard.epoch !== previewIdentity.privateEpoch
      || guard.identity.teamId !== previewIdentity.teamId
      || (session.revision ?? 0) !== previewIdentity.sessionRevision
      || deskState.board.revision !== previewIdentity.boardRevision) {
      setWriteNotice('THE DRAFT MOVED BEFORE THIS BOARD CHANGE COULD BE SAVED. RELOAD THE ROOM.');
      await refreshRoomTruth();
      return;
    }
    if (!isCanonicalSnakeBoard({ slots: selectedConsequence.board.slots, candidates: boardEligibilityCandidates })) {
      setWriteNotice('MY BOARD COULD NOT BE SAVED — THE RESULT IS NOT A LEGAL 22-PLAYER ROSTER.');
      return;
    }
    try {
      await syncEngine.pull({ throwOnError: true });
      const fresh = await getMlbDraftSession(session.leagueId, session.seasonNumber);
      if (!fresh
        || (fresh.revision ?? 0) !== previewIdentity.sessionRevision
        || fresh.seatBoards?.[deskTeam.id]?.revision !== previewIdentity.boardRevision) {
        setWriteNotice('THE DRAFT MOVED BEFORE THIS BOARD CHANGE COULD BE SAVED. RELOAD THE ROOM.');
        await refreshRoomTruth();
        return;
      }
      if (!privateContextIsCurrent(guard)) {
        await refreshRoomTruth();
        return;
      }
      const saved = await patchMlbDraftSessionSeatBoard({
        leagueId: session.leagueId,
        seasonNumber: session.seasonNumber,
        teamId: deskTeam.id,
        board: selectedConsequence.board,
        expectedBoardRevision: deskState.board.revision,
      });
      if (!privateContextIsCurrent(guard)) {
        await refreshRoomTruth();
        return;
      }
      setSession(saved);
    } catch (cause) {
      if (privateContextIsCurrent(guard)) {
        setWriteNotice(cause instanceof Error ? cause.message : String(cause));
        await refreshRoomTruth();
      }
    }
  }, [boardEligibilityCandidates, capturePrivateContext, deskState?.board, deskTeam, getMlbDraftSession, privateContextIsCurrent, refreshRoomTruth, selectedConsequence, session]);

  const recordPick = useCallback(async (playerId: string, companionRequest?: SnakeCompanionPickRequest) => {
    if (!session) throw new Error('The MLB snake draft session is no longer available.');
    if (!pool) throw new Error('The registered MLB draft pool is no longer available.');
    if (!draftingTeam) throw new Error('The active MLB draft team is no longer available.');
    const authorizedTeamId = companionRequest?.teamId ?? deskTeam?.id;
    if (!authorizedTeamId || authorizedTeamId !== draftingTeam.id) throw new Error('Only the club on the clock can record this pick.');
    if (unavailable.has(playerId)) throw new Error('The selected player is no longer available.');
    const player = seatingById.get(playerId);
    const priced = poolById.get(playerId);
    if (!player) throw new Error('The selected player is not in the active MLB draft model.');
    if (!priced) throw new Error('The selected player has no frozen MLB draft price.');
    const teamPicks = session.completedPicks.filter((pick) => pick.teamId === draftingTeam.id);
    const existingPlayers = teamPicks.flatMap((pick) => {
      const row = seatingById.get(pick.playerId);
      return row ? [row] : [];
    });
    if (existingPlayers.length !== teamPicks.length) throw new Error('The drafted roster data is incomplete.');
    const committedSpent = teamPicks.reduce((sum, pick) => (
      sum + (pick.settledSalary ?? poolById.get(pick.playerId)?.iv ?? Number.NaN)
    ), 0);
    if (!Number.isFinite(committedSpent)) throw new Error('The drafted roster money is incomplete.');
    const finish = evaluateSnakeLegalFinish({
      currentRoster: [...existingPlayers, player],
      committedSpent: committedSpent + priced.iv,
      availablePool: seatingPlayers.filter((row) => row.playerId !== playerId && !unavailable.has(row.playerId)),
      budget: pool.tierCap,
      baseCaps: pool.luxuryCaps,
      realTeamCount: leagueTeams.length,
      capIdentity: resolveLockedSeat({ team: draftingTeam, session }).capIdentity,
    });
    if (!finish.feasible
      || (!snakeMoneyNonnegative(finish.legalFinishCushion) && finish.affordability === 'BLOCKED')) {
      throw new Error('THIS PICK LEAVES NO LEGAL, AFFORDABLE 22.');
    }
    const existing = teamPicks.flatMap((pick) => {
      const row = seatingById.get(pick.playerId);
      return row ? [row.construction] : [];
    });
    const caps = snakeLuxuryCaps(pool.luxuryCaps);
    const marginalTax = auctionMarginalTaxWithCaps(
      existing,
      player.construction,
      resolveLockedSeat({ team: draftingTeam, session }).capIdentity,
      caps,
    );
    if (!seatingProofInput || !seatingProofResult?.feasible) {
      throw new Error('The shared draft seating proof is not ready.');
    }
    const pickProofKey = `${draftingTeam.id}:${session.revision ?? 0}:${playerId}`;
    let simultaneous = seatingPickProofCacheRef.current.get(pickProofKey);
    if (!simultaneous) {
      simultaneous = proveSnakePickKeepsAllClubsSeated({
        current: seatingProofInput,
        teamId: draftingTeam.id,
        player,
        allInCost: priced.iv + marginalTax,
        currentProof: seatingProofResult,
      });
      seatingPickProofCacheRef.current.set(pickProofKey, simultaneous);
    }
    if (!simultaneous.feasible) throw new Error(simultaneous.message);
    const seatingCertificate = {
      feasible: true as const,
      assignments: simultaneous.assignments,
      shortfall: null,
      message: simultaneous.message,
    };
    setPrivateDeskRevealed(false);
    let backfillEvents: Record<string, BoardBackfillEvent[]> = {};
    const expectedSlot = session.pickOrder[session.currentPickIndex];
    const saved = await updateMlbDraftSessionAtomically(session.leagueId, session.seasonNumber, (fresh) => {
      const freshSlot = fresh.pickOrder[fresh.currentPickIndex];
      if (!expectedSlot || !freshSlot || freshSlot.pick !== expectedSlot.pick || freshSlot.teamId !== expectedSlot.teamId) {
        throw new Error('The draft moved before this pick could be saved.');
      }
      if (companionRequest) {
        assertCompanionPickRequestApprovable({
          session: fresh,
          request: companionRequest,
          teamId: freshSlot.teamId,
          playerId,
          pick: freshSlot.pick,
        });
      }
      const freshWithoutPickRequest = fresh.snakeCompanions?.pickRequest ? {
        ...fresh,
        snakeCompanions: {
          ...fresh.snakeCompanions,
          pickRequest: undefined,
        },
      } : fresh;
      const next = applySnakePickWithCorrection({
        session: freshWithoutPickRequest,
        player,
        settledSalary: priced.iv,
        marginalTax,
        versionPool: seatingPlayers,
      });
      const reconciled = reconcileAllExistingBoards(next);
      backfillEvents = reconciled.eventsByTeamId;
      if (!reconciled.session.snakeSetup) throw new Error('The frozen snake setup is missing.');
      return {
        ...reconciled.session,
        snakeSetup: {
          ...reconciled.session.snakeSetup,
          seatingCertificate,
        },
      };
    });
    rememberBackfillEvents(backfillEvents);
    setSeatingProofResult(seatingCertificate);
    setSession(saved);
    try {
      await syncEngine.flush({ throwOnPending: true });
    } catch (cause) {
      throw liveRoomPublicationFailure('PICK', cause);
    }
  }, [deskTeam, draftingTeam, leagueTeams.length, pool, poolById, reconcileAllExistingBoards, rememberBackfillEvents, seatingById, seatingPlayers, seatingProofInput, seatingProofResult, session, unavailable]);

  useEffect(() => {
    if (!practiceMode || !session || session.paused || !draftingTeam || !deskTeam || deskTeam.id !== draftingTeam.id) return;
    const humanTeamId = session.pickOrder[0]?.teamId;
    if (!humanTeamId || draftingTeam.id === humanTeamId) return;
    const assignment = seatingProofResult?.feasible
      ? seatingProofResult.assignments.find((row) => row.teamId === draftingTeam.id)
      : null;
    const playerId = assignment?.playerIds.find((id) => !unavailable.has(id));
    if (!playerId) return;
    const id = globalThis.setTimeout(() => {
      void recordPick(playerId).catch((cause) => {
        setWriteNotice(cause instanceof Error ? cause.message : String(cause));
      });
    }, practiceFastForward ? 20 : 350);
    return () => globalThis.clearTimeout(id);
  }, [deskTeam, draftingTeam, practiceFastForward, practiceMode, recordPick, seatingProofResult, session, unavailable]);

  const restartPractice = useCallback(async () => {
    if (!practiceMode || !session || !pool) return;
    setCommittingRecap(true);
    setRecapError(null);
    try {
      const now = new Date().toISOString();
      const restarted: LeagueBuilderMlbDraftSession = {
        ...session,
        completedPicks: [],
        currentPickIndex: 0,
        seatBoards: await rebuildPracticeSnakeSeatBoards({
          teams: leagueTeams,
          players,
          pool,
          runProof: runSnakeSetupProof,
        }),
        versionState: undefined,
        correctionSnapshots: [],
        trades: [],
        openTradeOffers: [],
        roomLogByTeamId: {},
        paused: false,
        draftManifest: undefined,
        rosterHandoff: undefined,
        revision: (session.revision ?? 0) + 1,
        createdDate: now,
        lastModified: now,
      };
      await persist(restarted);
      setPracticeFastForward(false);
      setPrivateDeskRevealed(false);
      setRecapOpen(false);
    } catch {
      setRecapError(RECAP_CONFIRMATION_ERROR);
    } finally {
      setCommittingRecap(false);
    }
  }, [leagueTeams, persist, players, pool, practiceMode, runSnakeSetupProof, session]);

  const confirmMlb = useCallback(async () => {
    if (recapCommitInFlight.current || !league || !session || !pool || (!session.draftManifest && session.currentPickIndex < session.pickOrder.length)) return;
    recapCommitInFlight.current = true;
    setCommittingRecap(true);
    setRecapError(null);
    try {
      const freshSession = await getMlbDraftSession(league.id, sessionSeasonNumber);
      if (!freshSession) throw new Error('THE COMPLETED DRAFT SESSION COULD NOT BE RELOADED.');
      if (!freshSession.draftManifest && freshSession.currentPickIndex < freshSession.pickOrder.length) {
        throw new Error('THE DRAFT IS NOT COMPLETE.');
      }
      const mlbMeta = draftFreezeMeta(players);
      const mlbInputs = buildDraftFreezeInputs({
        mlbSession: null,
        mlbSnakeSession: freshSession,
        mlbRegisteredPool: pool,
        farmSession: null,
        metaByPlayerId: mlbMeta,
      });
      const mlbAlignment = buildSnakeDraftAlignmentInputs({
        session: freshSession,
        playersById: new Map(players.map((player) => [player.id, player])),
      });
      const mlbFreeze = computeDraftFreeze(mlbInputs, { snakeFanMoraleAlignment: mlbAlignment });
      const activeMlbIds = new Set(freshSession.snakeSetup?.poolPlayerIds ?? pool.players.map((player) => player.id));
      const mlbExpectedRanks = rankExpectedTalentByIv(
        pool.players.filter((player) => activeMlbIds.has(player.id)),
      );
      const frozen = freezeSnakeDraftSession({
        session: freshSession,
        expectedPhase: 'MLB',
        poolPlayerIds: freshSession.snakeSetup?.poolPlayerIds ?? pool.players.map((player) => player.id),
        salaryByPlayerId: new Map(pool.players.map((player) => [player.id, player.iv])),
        frozenAt: new Date().toISOString(),
        moraleSnapshot: buildSnakeDraftMoraleSnapshot({
          freeze: mlbFreeze,
          expectedTalentRankByPlayerId: mlbExpectedRanks,
          includeFan: true,
        }),
      });
      const persisted = frozen === freshSession ? freshSession : await freezeMlbDraftRoomSessionWithRegisteredPool({
        session: frozen,
        registeredPool: pool,
        expectedRevision: freshSession.revision ?? 0,
      });
      setSession(persisted);
      await commitCompletedSnakeSessionToLeagueRosters({ leagueId: league.id, session: persisted, pool });
      const manifest = readSnakeDraftTruth(persisted, 'MLB').manifest!;
      const handedOff = await markSnakeRosterHandoff({
        leagueId: league.id,
        seasonNumber: sessionSeasonNumber,
        phase: 'MLB',
        sourceSessionId: manifest.source.sessionId,
        manifestPoolIdentity: manifest.pool.identity,
        committedAt: new Date().toISOString(),
      });
      setSession(handedOff);
      await assertSnakeRosterHandoffReady(handedOff, 'MLB');
      navigate(scoutHireRouteForLeague(league));
    } catch {
      setRecapError(RECAP_CONFIRMATION_ERROR);
    } finally {
      recapCommitInFlight.current = false;
      setCommittingRecap(false);
    }
  }, [getMlbDraftSession, league, navigate, players, pool, session, sessionSeasonNumber]);

  const setPaused = useCallback(async (paused: boolean) => {
    if (!session) return;
    try {
      await persist({ ...session, paused, revision: (session.revision ?? 0) + 1 });
    } catch (cause) {
      setWriteNotice(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    }
  }, [persist, session]);
  const correctLatest = useCallback(async () => {
    if (!session?.correctionSnapshots?.[0]) return;
    const correctedTradeId = session.correctionSnapshots[0].action === 'trade' ? session.trades?.at(-1)?.id : null;
    const restored = restoreLatestSnakeCorrection(session);
    const liveOwnerBefore = session.pickOrder[session.currentPickIndex]?.teamId ?? null;
    const liveOwnerAfter = restored.pickOrder[restored.currentPickIndex]?.teamId ?? null;
    try {
      await persist(restored);
    } catch (cause) {
      setWriteNotice(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    }
    try {
      await syncEngine.flush({ throwOnPending: true });
    } catch (cause) {
      const failure = liveRoomPublicationFailure('CORRECTION', cause);
      setWriteNotice(failure.message);
      throw failure;
    }
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

  const postTradeOffer = useCallback(async (proposal: Parameters<typeof executeAskedPickTrade>[0]['proposal']) => {
    if (!session) return;
    await persist(postSnakeTradeOffer({ session, phase: 'MLB', proposal, postedAt: new Date().toISOString() }));
  }, [persist, session]);

  const nodTradeOffer = useCallback(async (offerId: string, teamId: string) => {
    if (!session) return;
    await persist(nodSnakeTradeOffer(session, offerId, teamId));
  }, [persist, session]);

  const closeTradeOffer = useCallback(async (offerId: string, action: 'WITHDRAWN' | 'DECLINED') => {
    if (!session) return;
    const offer = session.openTradeOffers?.find((row) => row.id === offerId);
    let next = closeSnakeTradeOffer(session, offerId);
    if (offer) {
      for (const teamId of [offer.buyerTeamId, offer.sellerTeamId]) {
        next = appendSnakeRoomLog({
          session: next,
          teamId,
          entry: { id: `${offer.id}:${action}:${teamId}`, kind: 'TRADE', text: `THE PICK OFFER WAS ${action}.`, createdAt: new Date().toISOString(), actionable: false },
        });
      }
    }
    await persist(next);
  }, [persist, session]);

  const executeTrade = useCallback(async (offer: SnakeOpenTradeOffer): Promise<ExecutedAskedPickTrade> => {
    if (!session || !seatingProofInput) {
      return { valid: false, message: 'The draft moved on — refresh.', session: null, livePickMoved: false, receipts: [] };
    }
    const proposal = proposalFromOpenSnakeOffer(session, offer);
    const result = executeAskedPickTrade({ session, pickValueChart, seatingProofInput, proposal });
    if (!result.valid || !result.session) return result;
    let logged = result.session;
    for (const receipt of result.receipts) {
      logged = appendSnakeRoomLog({
        session: logged,
        teamId: receipt.teamId,
        entry: { id: `${offer.id}:executed:${receipt.teamId}`, kind: 'TRADE', text: receipt.text, createdAt: new Date().toISOString(), actionable: true },
      });
    }
    let saved: LeagueBuilderMlbDraftSession;
    try {
      saved = await persist(logged);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setWriteNotice(message);
      return { valid: false, message: 'THE TRADE WAS NOT SAVED. TRY AGAIN.', session: null, livePickMoved: false, receipts: [] };
    }
    const tradeId = saved.trades?.at(-1)?.id ?? `revision-${saved.revision ?? 0}`;
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
    try {
      await syncEngine.flush({ throwOnPending: true });
    } catch (cause) {
      const failure = liveRoomPublicationFailure('TRADE', cause);
      setWriteNotice(failure.message);
      return { ...result, message: failure.message, session: saved };
    }
    return { ...result, session: saved };
  }, [persist, pickValueChart, seatingProofInput, session]);

  if (!isSnakeRoomEnabled()) return <main className="ballpark-page"><div className="ballpark-panel"><h1 className="ballpark-title">SNAKE DRAFT</h1><p className="mt-4">THE ROOM IS NOT ENABLED FOR THIS BUILD.</p></div></main>;
  if (isLoading || !loadDone) return <main className="ballpark-page"><p>OPENING THE ROOM…</p></main>;
  if (error || actionError) return <main className="ballpark-page"><div className="ballpark-panel"><h1 className="ballpark-title">THE ROOM COULD NOT OPEN</h1><p className="mt-4 uppercase">{actionError ?? error}</p><button className="ballpark-press-button ballpark-press-lg ballpark-press-gold mt-5 min-h-11" onClick={() => void loadSession()}>RETRY</button></div></main>;
  if (!league || !pool || !session) return <main className="ballpark-page"><div className="ballpark-panel"><h1 className="ballpark-title">THE ROOM IS NOT READY</h1><p className="mt-4">{snakeRoomMissingLegCopy({ league: Boolean(league), pool: Boolean(pool), session: Boolean(session) })}</p></div></main>;

  const mlbRecapPicks = session.draftManifest
    ? readSnakeDraftTruth(session, 'MLB').completedPicks
    : session.completedPicks;
  if (recapOpen) return <SnakeDraftRecap
    phase="MLB"
    teams={leagueTeams.map((team) => ({ id: team.id, name: team.name, abbreviation: team.abbreviation, colors: team.colors, logoUrl: team.logoUrl }))}
    picks={mlbRecapPicks.map((pick) => {
      const player = playerById.get(pick.playerId);
      return {
        pick: pick.pick,
        teamId: pick.teamId,
        playerId: pick.playerId,
        playerName: player ? fullName(player.firstName, player.lastName) : UNKNOWN_PLAYER,
        ...(player?.primaryPosition ? { position: player.primaryPosition } : {}),
        ...(typeof pick.settledSalary === 'number' ? { salary: pick.settledSalary } : {}),
        ...(typeof pick.marginalTax === 'number' ? { tax: pick.marginalTax } : {}),
        identityChips: player ? buildSnakePlayerIdentityChips(player, [...playerById.values()]) : [],
      };
    })}
    committing={committingRecap}
    error={recapError}
    confirmLabel={practiceMode ? 'RESTART PRACTICE' : undefined}
    onConfirm={practiceMode ? restartPractice : confirmMlb}
    onBack={session.draftManifest ? undefined : () => setRecapOpen(false)}
  />;

  return (
    <SnakeDraftRoomView
      onHome={() => navigate('/')}
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
      publicTruthByTeamId={publicTruthByTeamId}
      activeSeatId={deskTeam?.id ?? null}
      consolidatedMlb
      canDraftFromActiveSeat={Boolean(deskTeam && draftingTeam && deskTeam.id === draftingTeam.id)}
      candidate={candidate}
      candidateProfile={candidateId ? playerById.get(candidateId) ?? null : null}
      selectedPlayerCard={deskState?.selectedCandidate && deskTeam && candidateId && playerById.get(candidateId) ? ((draftAction) => (
        <SelectedPlayerCard
          player={playerById.get(candidateId)!}
          candidate={deskState.selectedCandidate!}
          consequence={selectedConsequence}
          teamLogoUrl={deskTeam.logoUrl}
          teamName={deskTeam.name}
          onOptimizeAround={() => {
            setAssistantOptimizePlayerId(candidateId);
            setAssistantOptimizeRevision((revision) => revision + 1);
          }}
          onKeep={() => { void keepSelectedConsequence(); }}
          decision={draftDecision}
          onTradeDecision={prefillTradeDecision}
          actionConsequence={candidate?.consequence}
          blockReason={candidate?.blockReason}
          draftAction={draftAction}
        />
      )) : candidate && deskTeam ? ((draftAction) => (
        <section className="mb-3 border-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] p-3" data-testid="selected-player-card">
          <p className="text-[10px] font-black tracking-[0.16em] text-[var(--ballpark-brass)]">SELECTED PLAYER</p>
          <h2 className="text-xl font-black uppercase">{candidate.name}</h2>
          <p className="text-xs font-bold">{candidate.position}</p>
          <div className="mt-3">{draftAction}</div>
        </section>
      )) : undefined}
      selectedFitLabel={deskState?.selectedCandidate
        ? `FIT · ${selectedConsequence?.status === 'ready'
          ? selectedConsequence.after.fitWord
          : deskState.selectedCandidate.fitWord}`
        : null}
      draftActionLabel="DRAFT PLAYER"
      paused={Boolean(session.paused)}
      soundsEnabled={soundsEnabled}
      correctionAvailable={Boolean(session.correctionSnapshots?.[0])}
      tradeRevision={session.trades?.length ?? 0}
      livePickMoveRevision={livePickMoveRevision}
      hotseatNextName={hotseatPassName(session, draftingTeam)}
      practiceMode={practiceMode}
      practiceFastForward={practiceFastForward}
      privateSnipeKey={privateSnipeKey}
      dangerKey={candidate?.blockReason ? `${candidate.id}:${candidate.blockReason}` : null}
      privateDesk={deskState?.board ? ((showHelp) => (<>
        {boardUndo
          && privateDeskRevealed
          && sameMainPrivateIdentity(boardUndo.identity, currentPrivateIdentity)
          && boardUndo.expectedBoardRevision === deskState.board!.revision ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-2 border-[var(--ballpark-status-warn)] bg-[var(--ballpark-warn-panel)] p-3" data-testid="main-board-update-banner">
            <p className="font-bold" role="status">MY BOARD UPDATED — {boardUndo.changedSlotCount} SLOT{boardUndo.changedSlotCount === 1 ? '' : 'S'} CHANGED.</p>
            <button
              type="button"
              className="ballpark-press-button ballpark-press-sm ballpark-press-action min-h-11"
              disabled={undoWorking}
              onClick={() => void undoBoardUpdate()}
            >{undoWorking ? 'UNDOING…' : 'UNDO BOARD UPDATE'}</button>
          </div>
        ) : null}
        {deskAlignment ? (
          <section
            className="mb-3 border-2 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] p-3"
            aria-label="Private roster archetype alignment"
            data-testid="private-roster-alignment"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 font-black">
              <span>ARCHETYPE ALIGNMENT · {deskAlignment.alignmentGrade}</span>
              <span>
                ROOM {snakeDraftAlignmentRoomRank(liveAlignment, deskAlignment.teamId) ?? '—'}/{liveAlignment.length}
                {' · '}FAN {deskAlignment.delta >= 0 ? '+' : ''}{deskAlignment.delta}
              </span>
            </div>
            <p className="mt-1 text-[10px] font-bold text-[var(--ballpark-chalk)]/70">
              {deskAlignment.pickCount}/22 PICKS · FIT {deskAlignment.alignmentScore.toFixed(3)}
            </p>
            {showHelp ? (
              <p className="mt-2 border-t border-[var(--ballpark-brass)]/40 pt-2 text-xs font-bold">
                FAN IS THE LIVE SNAKE-DRAFT PROJECTION FROM THIS CLUB'S CUMULATIVE ARCHETYPE FIT.
              </p>
            ) : null}
          </section>
        ) : null}
        <PrivateDesk
          candidates={deskState.candidates}
          rankings={deskState.board!.rankings.byPosition ?? {}}
          overallRankings={deskState.board!.rankings.global ?? []}
          boardSlots={deskState.board!.slots}
          brokenSlots={deskState.brokenSlots}
          planBill={deskState.planBill}
          planChemistry={deskState.planChemistry}
          draftedChemistry={deskState.draftedChemistry}
          assistantNeed={deskState.assistantNeed ?? undefined}
          logScopeId={deskTeam?.id}
          advisorLog={[
            ...(session.roomLogByTeamId?.[deskTeam?.id ?? ''] ?? []).map((entry) => ({
              key: entry.id,
              text: entry.text,
              actionable: entry.actionable,
              expired: entry.expired,
            })),
            ...(tradeReceiptsBySeat[deskTeam?.id ?? ''] ?? []).filter((entry) => !(session.roomLogByTeamId?.[deskTeam?.id ?? ''] ?? []).some((row) => row.text === entry.text)),
            ...(advisorLogBySeat[deskTeam?.id ?? ''] ?? []).filter((entry) => !(session.roomLogByTeamId?.[deskTeam?.id ?? ''] ?? []).some((row) => row.id.endsWith(`:${entry.key}`))),
          ]}
          taxCoreRows={deskState.taxCoreRows}
          slotDepth={deskState.slotDepth}
          assistantBoard={assistantBoardState}
          assistantOptimizationKey={assistantOptimizePlayerId
            ? `${currentPrivateScopeKey ?? deskTeam?.id ?? 'desk'}:${assistantOptimizePlayerId}:${assistantOptimizeRevision}`
            : null}
          assistantOptimizationLabel={assistantOptimizePlayerId
            ? `OPTIMIZED FOR ${deskState.candidates.find((entry) => entry.id === assistantOptimizePlayerId)?.name ?? 'SELECTED PLAYER'}`
            : null}
          privateScopeKey={currentPrivateScopeKey ?? undefined}
          tradePrefillKey={activeGuidePrefill?.key ?? null}
          showHelp={showHelp}
          selectedCandidateId={candidateId}
          onSelectCandidate={selectCandidate}
          onReorder={(position, orderedIds) => {
            void reorderRanking(position, orderedIds);
          }}
          onReorderOverall={(orderedIds) => {
            void reorderRanking('OVERALL', orderedIds);
          }}
          teamColors={deskTeam?.colors}
          tradeGuide={<SnakeTradeGuide
            showHelp={showHelp}
            teams={leagueTeams.map((team) => ({ id: team.id, name: team.name }))}
            fixedBuyerTeamId={deskTeam?.id ?? null}
            pickValueChart={pickValueChart}
            sessionRevision={session.revision ?? 0}
            privateScopeKey={currentPrivateScopeKey}
            onAsk={askTradeGuide}
            onPost={postTradeOffer}
            openOffers={(session.openTradeOffers ?? []).filter((offer) => offer.phase === 'MLB' && (offer.buyerTeamId === deskTeam?.id || offer.sellerTeamId === deskTeam?.id))}
            onNod={nodTradeOffer}
            onClose={closeTradeOffer}
            onFailure={refreshRoomTruth}
            prefill={activeGuidePrefill}
          />}
        />
      </>)) : privateDeskRevealed ? <p className="font-bold" data-testid="private-draft-desk">CALCULATING THE DESK…</p> : null}
      commissionerTrade={(showHelp) => <SnakeCommissionerTrade
        showHelp={showHelp}
        teams={leagueTeams.map((team) => ({ id: team.id, name: team.name }))}
        ownedPicksByTeamId={ownedPicksByTeamId}
        sessionRevision={session.revision ?? 0}
        openOffers={(session.openTradeOffers ?? []).filter((offer) => offer.phase === 'MLB')}
        onAsk={askTradeGuide}
        onPost={postTradeOffer}
        onNod={nodTradeOffer}
        onClose={closeTradeOffer}
        onExecute={executeTrade}
        onFailure={refreshRoomTruth}
      />}
      roomHelpNotes={candidate ? ['THIS PLAYER IS SELECTED FROM YOUR PRIVATE DRAFT DESK.'] : []}
      writeNotice={writeNotice ?? syncError}
      onReloadRoom={async () => { setWriteNotice(null); setSyncError(null); await refreshRoomTruth(); }}
      onDismissWriteNotice={() => { setWriteNotice(null); setSyncError(null); }}
      companionApproval={practiceMode ? undefined : <CompanionApprovalCard
        session={session}
        teams={leagueTeams.map((team) => ({ id: team.id, name: team.name }))}
        playerName={(playerId) => {
          const player = playerById.get(playerId);
          return player ? fullName(player.firstName, player.lastName) : 'UNKNOWN PLAYER';
        }}
        onApprovePick={(request) => recordPick(request.playerId, request)}
        onPublishCurrentRoom={publishCurrentCompanionRoom}
        onChange={acceptCompanionSession}
      />}
      pendingCompanionCount={practiceMode ? 0 : (session.snakeCompanions?.claims.filter((claim) => claim.status === 'pending').length ?? 0)}
      onPauseChange={setPaused}
      onPracticeFastForwardChange={setPracticeFastForward}
      onRecordPick={async (playerId) => {
        try {
          await recordPick(playerId);
        } catch (cause) {
          setWriteNotice(cause instanceof Error ? cause.message : String(cause));
          throw cause;
        }
      }}
      onCorrectLatest={correctLatest}
      onSoundsEnabledChange={(enabled) => { setSoundsEnabled(enabled); saveSnakeSoundsEnabled(enabled); }}
      onPrivateSeatRevealedChange={(revealed) => {
        if (!revealed) {
          invalidatePrivateContext();
          return;
        }
        privateRevealedRef.current = true;
        setPrivateDeskRevealed(true);
      }}
      onActiveSeatChange={(teamId) => {
        invalidatePrivateContext();
        setDeskTeamId(teamId);
        void refreshRoomTruth();
      }}
      onDraftComplete={() => setRecapOpen(true)}
    />
  );
}

export default function SnakeDraftRoom() {
  const location = useLocation();
  return new URLSearchParams(location.search).get('phase') === 'farm'
    ? <FarmSnakeRoom />
    : <MlbSnakeDraftRoom />;
}
