import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { supabase } from '../../../supabase';

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
  resolveFarmArchetypeIdsForSnakeTransition,
} from '../../../engines/snakeFarmSlots';
import {
  evaluateSnakeLegalFinish,
  evaluateSnakePlan,
  snakeMoneyNonnegative,
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
  setSeatBoardZeroInterest,
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
} from '../components/snake/desk/deskRoomModel';
import {
  buildSnakeAssistantBoardRequest,
  buildSnakeAssistantLivePlayer,
} from '../components/snake/desk/snakeDeskIntelligenceModel';
import { useSnakeAssistantBoard } from '../components/snake/desk/useSnakeAssistantBoard';
import { useSnakeSelectedConsequences } from '../components/snake/desk/useSnakeSelectedConsequences';
import type { SnakeSelectedConsequencesWorkerRequest } from '../workers/snakeSelectedConsequences.worker';
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
import {
  buildSnakePickFinishWorkerRequest,
  useSnakePickFinishSafety,
} from '../components/snake/desk/useSnakePickFinishSafety';
import type { SnakeRankingView } from '../components/snake/desk/RankingsView';
import { SNAKE_BOARD_SLOT_IDS, type SnakeBoardSlotId, type SnakeCompanionPickRequest, type SnakeOpenTradeOffer, type SnakeSeatBoardRecord } from '../../../utils/leagueBuilderStorage';
import { SnakeCommissionerTrade } from '../components/snake/trade/SnakeCommissionerTrade';
import { CompanionApprovalCard } from '../components/snake/companion/CompanionApprovalCard';
import { useSnakeLiveHostRoom } from '../components/snake/companion/useSnakeLiveHostRoom';
import { ensureCompanionRoom } from '../components/snake/companion/companionModel';
import { SnakeTradeGuide } from '../components/snake/trade/SnakeTradeGuide';
import {
  rebuildPracticeSnakeSeatBoards,
} from '../components/snake/setup/SnakeDraftSetupAdapter.helpers';
import {
  fingerprintSnakeSetupProofInput,
  useSnakeSetupProofClient,
} from '../components/snake/setup/snakeSetupProofClient';
import {
  executeAskedPickTrade,
  guideForAskedPick,
  prefillGuideForPackage,
  type ExecutedAskedPickTrade,
  type SnakeTradeGuidePrefill,
} from '../components/snake/trade/tradeGuideModel';
import { FarmPrivateDesk, FarmSelectedProspectCard } from '../components/snake/farm/FarmPrivateDesk';
import {
  buildFarmLivePrivateBoard,
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
  patchMlbDraftSessionFarmSeatBoard,
  patchMlbDraftSessionSeatBoard,
  patchMlbDraftSessionSnakeCompanions,
  markSnakeRosterHandoff,
  recoverCanonicalMlbSnakePickOrder,
  restoreSnakeLiveFarmRoomLocally,
  restoreSnakeLiveRoomLocally,
  saveMlbDraftRoomSession,
  updateMlbDraftSessionAtomically,
  resolveLeagueSalaryCap,
  type Player,
  type LeagueBuilderMlbDraftSession,
} from '../../../utils/leagueBuilderStorage';
import type { ProspectScoutDescriptor } from '../../../utils/prospectScoutingDraftEngine';
import { commitCompletedSnakeFarmSessionToLeagueRosters, finalizeCompletedSnakeSessionToLeagueRosters } from '../../../utils/leagueBuilderAuctionPipeline';
import { scoutHireRouteForLeague, staffHireRouteForLeague } from '../utils/draftRouting';
import { buildLiveScoutPool } from '../utils/draftStaffingPersistence';
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
import { getOrCreateSnakeLiveDeviceId } from '../../../utils/snakeLiveCapabilityStore';
import {
  buildSnakeLiveCatalog,
  buildSnakeLiveFarmCatalog,
  readSnakeLiveCatalog,
} from '../../../utils/snakeLiveCatalog';
import {
  SnakeLiveTransportError,
  type SnakeLiveIntent,
  type SnakeLiveJsonObject,
} from '../../../utils/snakeLiveRoomTypes';
import { createSnakeLiveRoomTransport } from '../../../utils/snakeLiveRoomTransport';
import {
  pendingSnakeLivePickIntentCount,
  readSnakeLivePublicSession,
} from '../../../utils/snakeLiveRoomSession';
import {
  buildSnakeLiveTradeActionPayload,
  buildSnakeLiveTradePostPayload,
  projectSnakeLiveTradeOffers,
} from '../../../utils/snakeLiveTradeIntents';

const SEASON_NUMBER = 1;
const PRACTICE_SEASON_NUMBER = 99;

interface MainPrivateIdentity {
  sessionId: string;
  leagueId: string;
  seasonNumber: number;
  teamId: string;
}

function LiveRoomRecoveryPanel(props: {
  roomCode: string;
  working: boolean;
  error: string | null;
  onRoomCodeChange: (value: string) => void;
  onRestore: () => void;
}) {
  return <div className="mt-5 border-2 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] p-4">
    <p className="text-xs font-black">RESTORE LIVE ROOM</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <input
        aria-label="Live room code"
        value={props.roomCode}
        onChange={(event) => props.onRoomCodeChange(event.currentTarget.value.replace(/\D/g, '').slice(0, 4))}
        inputMode="numeric"
        placeholder="ROOM CODE"
        className="min-h-11 w-40 border-2 border-[var(--ballpark-brass)] bg-black/30 px-3 font-mono text-sm uppercase"
      />
      <button
        className="ballpark-press-button ballpark-press-gold min-h-11"
        disabled={props.working}
        onClick={props.onRestore}
      >
        {props.working ? 'RESTORING…' : 'RESTORE'}
      </button>
    </div>
    {props.error ? <p className="mt-3 text-xs font-bold text-red-300">{props.error}</p> : null}
  </div>;
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

function snakeLiveJson(value: unknown): SnakeLiveJsonObject {
  return JSON.parse(JSON.stringify(value)) as SnakeLiveJsonObject;
}

function snakeLivePublicActionSession(
  session: LeagueBuilderMlbDraftSession,
): LeagueBuilderMlbDraftSession {
  const publicSession: LeagueBuilderMlbDraftSession = { ...session };
  delete publicSession.seatBoards;
  delete publicSession.farmSeatBoards;
  delete publicSession.roomLogByTeamId;
  delete publicSession.openTradeOffers;
  delete publicSession.snakeCompanions;
  delete publicSession.companionRoomPublication;
  delete publicSession.liveRoomRecovery;
  delete publicSession.correctionSnapshots;
  delete publicSession.farmProspectSnapshot;
  return session.snakeSetup
    ? {
        ...publicSession,
        snakeSetup: {
          ...session.snakeSetup,
        seatingCertificate: undefined,
        },
      }
    : publicSession;
}

function mergeLivePublicSession(
  local: LeagueBuilderMlbDraftSession,
  publicSession: LeagueBuilderMlbDraftSession,
): LeagueBuilderMlbDraftSession {
  if (local.id !== publicSession.id) throw new Error('THE LIVE ROOM DOES NOT MATCH THIS DRAFT.');
  return {
    ...local,
    ...publicSession,
    snakeSetup: publicSession.snakeSetup ? {
      ...publicSession.snakeSetup,
      ...(local.snakeSetup?.seatingCertificate
        ? { seatingCertificate: local.snakeSetup.seatingCertificate }
        : {}),
    } : local.snakeSetup,
    ...(local.seatBoards ? { seatBoards: local.seatBoards } : {}),
    ...(local.farmSeatBoards ? { farmSeatBoards: local.farmSeatBoards } : {}),
    ...(local.roomLogByTeamId ? { roomLogByTeamId: local.roomLogByTeamId } : {}),
    openTradeOffers: [],
    ...(local.correctionSnapshots ? { correctionSnapshots: local.correctionSnapshots } : {}),
    ...(local.farmProspectSnapshot ? { farmProspectSnapshot: local.farmProspectSnapshot } : {}),
    ...(local.snakeCompanions ? { snakeCompanions: local.snakeCompanions } : {}),
    ...(local.companionRoomPublication
      ? { companionRoomPublication: local.companionRoomPublication }
      : {}),
  };
}

const UNKNOWN_PLAYER = 'UNKNOWN PLAYER';
const UNKNOWN_TEAM = 'UNKNOWN TEAM';
const RECAP_CONFIRMATION_ERROR = 'THE DRAFT COULD NOT BE CONFIRMED. TRY AGAIN.';
const MLB_RECAP_CONFIRMATION_ERROR = 'THE COMPLETED DRAFT IS SAFE. ROSTERS WERE NOT SAVED. TRY AGAIN.';
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

function scoutDescriptor(profile: {
  id: string;
  name: string;
  specialties: string[];
  weaknesses: string[];
}): ProspectScoutDescriptor {
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
  const farmRoomParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedLeagueId = farmRoomParams.get('leagueId');
  const recoveryRoomCodeParam = farmRoomParams.get('roomCode') ?? '';
  const recoverHostRequested = farmRoomParams.get('recover') === '1';
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
  const [recoveryRoomCode, setRecoveryRoomCode] = useState(recoveryRoomCodeParam);
  const [recoveryWorking, setRecoveryWorking] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
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
      try {
        await syncEngine.pull({ throwOnError: true });
      } catch (cause) {
        if (!recoverHostRequested) throw cause;
      }
      let recoveryRoom: Awaited<ReturnType<ReturnType<typeof createSnakeLiveRoomTransport>['findRoomByCode']>> = null;
      let recoveryPublicSession: LeagueBuilderMlbDraftSession | null = null;
      if (recoverHostRequested) {
        if (!/^\d{4}$/.test(recoveryRoomCodeParam)) throw new Error('ENTER THE FOUR-DIGIT FARM ROOM CODE.');
        recoveryRoom = await createSnakeLiveRoomTransport().findRoomByCode(recoveryRoomCodeParam);
        if (!recoveryRoom || recoveryRoom.phase !== 'FARM') {
          throw new Error('NO RECOVERABLE FARM LIVE ROOM MATCHES THIS CODE.');
        }
        recoveryPublicSession = readSnakeLivePublicSession(recoveryRoom);
        if (recoveryPublicSession.draftPhase !== 'FARM') {
          throw new Error('THE LIVE ROOM DOES NOT CONTAIN A FARM DRAFT.');
        }
      }
      const [freshLeagues, freshTeams, freshPlayers] = await Promise.all([
        getAllLeagueTemplates(),
        getAllTeams(),
        getAllPlayers(),
      ]);
      const freshLeague = freshLeagues.find((row) => row.id === requestedLeagueId) ?? null;
      if (!freshLeague) throw new Error('THE LEAGUE WAS NOT FOUND.');
      if (recoveryPublicSession && recoveryPublicSession.leagueId !== freshLeague.id) {
        throw new Error('THE FARM ROOM DOES NOT MATCH THIS LEAGUE.');
      }
      const freshTeamById = new Map(freshTeams.map((team) => [team.id, team]));
      const frozenRecoveryClubs = recoveryPublicSession?.snakeSetup?.clubs ?? null;
      const activeTeamIds = frozenRecoveryClubs?.map((club) => club.teamId) ?? freshLeague.teamIds;
      if (activeTeamIds.length === 0 || new Set(activeTeamIds).size !== activeTeamIds.length) {
        throw new Error('THE FARM ROOM HAS NO VALID FROZEN CLUB ORDER.');
      }
      const freshLeagueTeams = activeTeamIds.flatMap((id) => {
        const team = freshTeamById.get(id);
        if (!team) return [];
        const frozenClub = frozenRecoveryClubs?.find((club) => club.teamId === id);
        return [{
          ...team,
          ...(frozenClub?.archetypeId ? { farmArchetypeKey: frozenClub.archetypeId } : {}),
        }];
      });
      if (freshLeagueTeams.length !== activeTeamIds.length) {
        throw new Error('THE FARM ROOM CLUBS DO NOT MATCH THIS LEAGUE.');
      }
      if (freshLeague.draftFormat !== 'snake') throw new Error('THIS LEAGUE IS CONFIGURED FOR AN AUCTION DRAFT.');
      const [initialStoredFarm, storedMlb] = recoveryPublicSession
        ? [null, null]
        : await Promise.all([
            getMlbDraftSession(freshLeague.id, FARM_SNAKE_SESSION_NUMBER),
            getMlbDraftSession(freshLeague.id, SEASON_NUMBER),
          ]);
      const nextScouts = recoveryPublicSession
        ? Object.fromEntries(buildLiveScoutPool(freshLeague.id, freshLeagueTeams).map((profile) => [
            profile.teamId,
            scoutDescriptor(profile),
          ]))
        : await (async () => {
            const savedProfiles = await getScoutProfilesForLeague(freshLeague.id);
            return Object.fromEntries(freshLeagueTeams.map((team) => {
              const profile = savedProfiles.find((row) => row.teamId === team.id);
              if (!profile) throw new Error(`Hire the scout for ${team.name} before opening the farm draft.`);
              return [team.id, scoutDescriptor(profile)];
            }));
          })();
      let storedFarm = initialStoredFarm;
      if (recoveryPublicSession && recoveryRoom) {
        const recoveryPool = buildFarmAuctionPool({
          leagueId: freshLeague.id,
          seasonNumber: SEASON_NUMBER,
          seed: recoveryPublicSession.seed,
          teamDraftOrder: freshLeagueTeams.map((team) => ({ teamId: team.id, teamName: team.name })),
          scoutsByTeamId: nextScouts,
        });
        if (JSON.stringify(recoveryPool.prospects.map((prospect) => prospect.id))
          !== JSON.stringify(recoveryPublicSession.snakeSetup?.poolPlayerIds ?? [])) {
          throw new Error('THE FROZEN FARM PROSPECTS COULD NOT BE REBUILT FOR THIS ROOM.');
        }
        storedFarm = await restoreSnakeLiveFarmRoomLocally({
          session: recoveryPublicSession,
          prospects: recoveryPool.prospects,
          recovery: {
            roomId: recoveryRoom.id,
            roomCode: recoveryRoomCodeParam,
            publicRevision: recoveryRoom.publicRevision,
          },
        });
      }
      if (!storedFarm) {
        if (!storedMlb) throw new Error('Finish the MLB snake draft before opening the farm room.');
        readSnakeDraftTruth(storedMlb, 'MLB');
        validateSnakeRosterHandoff(storedMlb, 'MLB');
        await assertSnakeRosterHandoffReady(storedMlb, 'MLB');
      }
      const stored = storedFarm ?? storedMlb!;
      if (storedFarm?.draftManifest) readSnakeDraftTruth(storedFarm, 'FARM');
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
        const farmArchetypeIdByTeamId = resolveFarmArchetypeIdsForSnakeTransition({
          mlbSession: stored,
          teams: freshLeagueTeams,
        });
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
          farmArchetypeIdByTeamId,
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
      if (!recoveryRoomCodeParam && nextSession.snakeCompanions?.roomCode) {
        setRecoveryRoomCode(nextSession.snakeCompanions.roomCode);
      }
      setRecapOpen(Boolean(nextSession.draftManifest || nextSession.currentPickIndex >= nextSession.pickOrder.length));
      await refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoadDone(true);
    }
  }, [getMlbDraftSession, recoverHostRequested, recoveryRoomCodeParam, refresh, requestedLeagueId, saveMlbDraftSession]);

  useEffect(() => { void loadFarm(); }, [loadFarm]);
  useEffect(() => { setRecoveryRoomCode(recoveryRoomCodeParam); }, [recoveryRoomCodeParam]);
  const recoverOpenFarmRoom = useCallback(async () => {
    const roomCode = recoveryRoomCode.trim();
    if (!/^\d{4}$/.test(roomCode)) {
      setRecoveryError('ENTER THE FOUR-DIGIT ROOM CODE.');
      return;
    }
    setRecoveryWorking(true);
    setRecoveryError(null);
    try {
      if (!supabase) throw new Error('CLOUD SIGN-IN IS NOT CONFIGURED ON THIS PREVIEW.');
      const { data: { session: cloudSession }, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      if (!cloudSession) throw new Error('SIGN IN TO CLOUD SYNC ON THIS PREVIEW, THEN TRY AGAIN.');
      const room = await createSnakeLiveRoomTransport().findRoomByCode(roomCode);
      if (!room || room.phase !== 'FARM') throw new Error('NO RECOVERABLE FARM LIVE ROOM MATCHES THIS CODE.');
      const publicSession = readSnakeLivePublicSession(room);
      const search = `?phase=farm&leagueId=${encodeURIComponent(publicSession.leagueId)}&roomCode=${roomCode}&recover=1`;
      if (location.search === search) await loadFarm();
      else navigate(`/snake-room${search}`, { replace: true });
    } catch (cause) {
      setRecoveryError(cause instanceof Error ? cause.message : 'THE FARM LIVE ROOM COULD NOT BE RESTORED.');
    } finally {
      setRecoveryWorking(false);
    }
  }, [loadFarm, location.search, navigate, recoveryRoomCode]);
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
  const farmLiveCatalogTeamIdsKey = session?.snakeSetup?.clubs.map((club) => club.teamId).join('\u0000') ?? '';
  const farmLiveCatalogProspectIdsKey = session?.snakeSetup?.poolPlayerIds.join('\u0000') ?? '';
  const farmLiveCatalog = useMemo(() => {
    if (!league || !farmPool || !session?.snakeSetup) return null;
    const activeTeamIds = farmLiveCatalogTeamIdsKey ? farmLiveCatalogTeamIdsKey.split('\u0000') : [];
    const activeProspectIds = farmLiveCatalogProspectIdsKey ? farmLiveCatalogProspectIdsKey.split('\u0000') : [];
    const frozenIdentityByTeamId = new Map(session.snakeSetup.clubs.map((club) => [
      club.teamId,
      club.archetypeId ?? club.farmArchetypeId,
    ]));
    try {
      return buildSnakeLiveFarmCatalog({
        league,
        teams: leagueTeams.map((team) => ({
          ...team,
          farmArchetypeKey: frozenIdentityByTeamId.get(team.id) ?? team.farmArchetypeKey,
        })),
        prospects: farmPool.prospects,
        existingFarmRostersByTeamId: rostersByTeamId,
        activeTeamIds,
        activeProspectIds,
        farmTarget: FARM_AUCTION_ROSTER_SLOTS_PER_TEAM,
      });
    } catch {
      return null;
    }
  }, [farmLiveCatalogProspectIdsKey, farmLiveCatalogTeamIdsKey, farmPool, league, leagueTeams, rostersByTeamId, session?.snakeSetup]);
  const [hostDeviceId, setHostDeviceId] = useState<string | null>(null);
  const farmLiveSessionId = session?.id ?? null;
  const liveHost = useSnakeLiveHostRoom({
    session,
    hostDeviceId,
    catalog: farmLiveCatalog,
    recoverHost: recoverHostRequested,
    enabled: Boolean(session?.snakeCompanions?.roomCode),
  });
  const liveHostRef = useRef(liveHost);
  liveHostRef.current = liveHost;

  useEffect(() => {
    if (!farmLiveSessionId) {
      setHostDeviceId(null);
      return;
    }
    let cancelled = false;
    void getOrCreateSnakeLiveDeviceId().then((deviceId) => {
      if (!cancelled) setHostDeviceId(deviceId);
    }).catch((cause) => {
      if (!cancelled) setWriteNotice(cause instanceof Error ? cause.message : String(cause));
    });
    return () => { cancelled = true; };
  }, [farmLiveSessionId]);

  useEffect(() => {
    if (!session || session.snakeCompanions?.roomCode) return;
    let cancelled = false;
    void patchMlbDraftSessionSnakeCompanions({
      leagueId: session.leagueId,
      seasonNumber: session.seasonNumber,
      patch: (current, fresh) => ensureCompanionRoom(
        { ...fresh, snakeCompanions: current },
      ).snakeCompanions!,
    }).then((saved) => {
      if (!cancelled) setSession(saved);
    }).catch((cause) => {
      if (!cancelled) setWriteNotice(cause instanceof Error ? cause.message : String(cause));
    });
    return () => { cancelled = true; };
  }, [session]);

  const mirrorFarmSessionLocally = useCallback(async (
    next: LeagueBuilderMlbDraftSession,
    options: { acceptLowerRevision?: boolean } = {},
  ): Promise<LeagueBuilderMlbDraftSession> => {
    setSession((current) => {
      if (!options.acceptLowerRevision
        && current?.id === next.id
        && (current.revision ?? 0) > (next.revision ?? 0)) return current;
      return next;
    });
    try {
      const saved = await updateMlbDraftSessionAtomically(
        next.leagueId,
        next.seasonNumber,
        (fresh) => ({
          ...next,
          farmSeatBoards: next.farmSeatBoards ?? fresh.farmSeatBoards,
          farmProspectSnapshot: next.farmProspectSnapshot ?? fresh.farmProspectSnapshot,
          snakeCompanions: fresh.snakeCompanions ?? next.snakeCompanions,
        }),
      );
      setSession((current) => {
        if (!options.acceptLowerRevision
          && current?.id === saved.id
          && (current.revision ?? 0) > (saved.revision ?? 0)) return current;
        return saved;
      });
      setWriteNotice(null);
      return saved;
    } catch (cause) {
      setWriteNotice(`THE LIVE FARM ROOM IS CURRENT. THE LOCAL BACKUP FAILED — ${cause instanceof Error ? cause.message : String(cause)}`);
      return next;
    }
  }, []);

  const farmLiveAdoptedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const remote = liveHost.publicSession;
    const room = liveHost.room;
    if (!session || !remote || !room || !liveHost.hostAccessReady || remote.id !== session.id) return;
    const key = `${room.id}:${room.publicRevision}`;
    if (farmLiveAdoptedKeyRef.current === key) return;
    farmLiveAdoptedKeyRef.current = key;
    const received = mergeLivePublicSession(session, remote);
    setSession(received);
    if (received.currentPickIndex >= received.pickOrder.length) setRecapOpen(true);
    void mirrorFarmSessionLocally(received);
  }, [liveHost.hostAccessReady, liveHost.publicSession, liveHost.room, mirrorFarmSessionLocally, session]);
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
  const recordPick = useCallback(async (
    playerId: string,
    companionRequest?: SnakeCompanionPickRequest,
    companionIntent?: SnakeLiveIntent,
  ) => {
    if (!session || !farmPool) throw new Error('THE FARM SNAKE DRAFT IS NOT READY.');
    const buildPick = (source: LeagueBuilderMlbDraftSession, reconcilePrivateBoards: boolean) => {
      const slot = source.pickOrder[source.currentPickIndex];
      const activeTeam = leagueTeams.find((team) => team.id === slot?.teamId);
      if (!slot || !activeTeam) throw new Error('THE CLUB ON THE CLOCK IS NOT READY.');
      const authorizedTeamId = companionRequest?.teamId ?? deskTeam?.id;
      if (!authorizedTeamId || authorizedTeamId !== activeTeam.id) {
        throw new Error('ONLY THE CLUB ON THE CLOCK CAN MAKE THIS PICK.');
      }
      if (source.completedPicks.some((pick) => pick.playerId === playerId)) {
        throw new Error('THAT PROSPECT IS NO LONGER AVAILABLE.');
      }
      const prospect = farmPool.prospects.find((row) => row.id === playerId);
      if (!prospect || !source.snakeSetup?.poolPlayerIds.includes(playerId)) {
        throw new Error('THAT PROSPECT IS NOT IN THE FROZEN FARM POOL.');
      }
      const pickedWithVersionState = applySnakePickWithCorrection({
        session: source,
        player: { playerId: prospect.id },
        settledSalary: farmPickSalary(source, slot.pick),
        marginalTax: 0,
        versionPool: farmPool.prospects.map((row) => ({ playerId: row.id })),
      });
      // FARM prospects are one-card identities. The shared MLB pick helper
      // creates a version ledger, but FARM must not publish or persist it.
      const picked = { ...pickedWithVersionState };
      delete picked.versionState;
      if (!reconcilePrivateBoards) return { next: picked, slot, activeTeam };
      const nextUnavailable = new Set(picked.completedPicks.map((pick) => pick.playerId));
      const nextRemainingTurns = Object.fromEntries(leagueTeams.map((team) => [team.id,
        picked.pickOrder.slice(picked.currentPickIndex).filter((row) => row.teamId === team.id).length,
      ]));
      return {
        next: reconcileFarmSeatBoards({
          session: picked,
          unavailableProspectIds: nextUnavailable,
          remainingTurnsByTeamId: nextRemainingTurns,
        }).session,
        slot,
        activeTeam,
      };
    };

    const clickedRoom = liveHostRef.current.room;
    const actionIncarnation = clickedRoom
      ? `${clickedRoom.id}:${clickedRoom.publicRevision}`
      : 'room-not-ready';
    const publish = async (retry: boolean): Promise<void> => {
      let host = liveHostRef.current;
      if (!host.liveRoomReady || !host.room || !host.publicSession) {
        throw new Error('THE LIVE FARM ROOM IS NOT READY.');
      }
      if (retry) {
        await host.refresh();
        await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
        host = liveHostRef.current;
        if (!host.room || !host.publicSession) throw new Error('THE LIVE FARM ROOM IS NOT READY.');
      }
      const requestedSlot = session.pickOrder[session.currentPickIndex];
      const requestedPick = companionRequest?.pick ?? requestedSlot?.pick;
      const requestedTeamId = companionRequest?.teamId ?? deskTeam?.id;
      const alreadySaved = host.publicSession.completedPicks.find((pick) => (
        pick.pick === requestedPick && pick.teamId === requestedTeamId
      ));
      if (alreadySaved?.playerId === playerId) {
        const received = mergeLivePublicSession(session, host.publicSession);
        await mirrorFarmSessionLocally(received);
        if (companionIntent?.status === 'pending') {
          await host.resolveIntent(companionIntent, 'accepted', `farm-pick-accepted:${companionIntent.id}`)
            .catch(() => setWriteNotice('THE PICK IS LIVE. THE COMPANION RECEIPT NEEDS A REFRESH.'));
        }
        return;
      }
      const source = snakeLivePublicActionSession(mergeLivePublicSession(session, host.publicSession));
      const result = buildPick(source, false);
      if (companionRequest && companionIntent) {
        const approved = host.claims.some((claim) => claim.deviceId === companionIntent.deviceId
          && claim.teamId === companionIntent.teamId && claim.status === 'approved');
        if (!approved
          || companionIntent.kind !== 'pick'
          || companionIntent.status !== 'pending'
          || companionIntent.expectedRoomRevision !== host.room.publicRevision
          || companionRequest.sessionRevision !== (source.revision ?? 0)
          || companionRequest.pick !== result.slot.pick
          || companionRequest.teamId !== result.activeTeam.id) {
          throw new Error('THE COMPANION FARM PICK REQUEST IS STALE.');
        }
      }
      try {
        await host.publishSession({
          session: snakeLivePublicActionSession(result.next),
          expectedRoomRevision: host.room.publicRevision,
          idempotencyKey: `farm-pick:${result.next.id}:${result.slot.pick}:${playerId}:${actionIncarnation}`,
          eventKind: 'PICK_RECORDED',
          publicEvent: { pick: result.slot.pick, teamId: result.activeTeam.id, playerId },
          status: result.next.currentPickIndex >= result.next.pickOrder.length ? 'complete' : 'open',
        });
      } catch (cause) {
        if (!retry && cause instanceof SnakeLiveTransportError && cause.code === 'stale-revision') {
          return publish(true);
        }
        throw cause;
      }
      const localPicked = mergeLivePublicSession(session, result.next);
      const nextUnavailable = new Set(localPicked.completedPicks.map((pick) => pick.playerId));
      const nextRemainingTurns = Object.fromEntries(leagueTeams.map((team) => [team.id,
        localPicked.pickOrder.slice(localPicked.currentPickIndex).filter((row) => row.teamId === team.id).length,
      ]));
      const localResult = reconcileFarmSeatBoards({
        session: localPicked,
        unavailableProspectIds: nextUnavailable,
        remainingTurnsByTeamId: nextRemainingTurns,
      });
      await mirrorFarmSessionLocally({
        ...localResult.session,
        correctionSnapshots: result.next.correctionSnapshots,
      });
      if (companionIntent) {
        await host.resolveIntent(companionIntent, 'accepted', `farm-pick-accepted:${companionIntent.id}`)
          .catch(() => setWriteNotice('THE PICK IS LIVE. THE COMPANION RECEIPT NEEDS A REFRESH.'));
      }
    };
    await publish(false);
  }, [deskTeam, farmPool, leagueTeams, mirrorFarmSessionLocally, session]);
  const finishFarm = useCallback(() => {
    if (!session || session.currentPickIndex < session.pickOrder.length) return;
    setRecapOpen(true);
  }, [session]);
  const correctLatestFarm = useCallback(async () => {
    if (!session || !liveHostRef.current.room?.correctionAvailable) return;
    const clickedRoom = liveHostRef.current.room;
    const idempotencyKey = `farm-correct:${clickedRoom.id}:${clickedRoom.publicRevision}`;
    const publish = async (retry: boolean): Promise<void> => {
      let host = liveHostRef.current;
      if (!host.liveRoomReady || !host.room || !host.publicSession) {
        throw new Error('THE LIVE FARM ROOM IS NOT READY.');
      }
      if (retry) {
        await host.refresh();
        await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
        host = liveHostRef.current;
        if (!host.room || !host.publicSession) throw new Error('THE LIVE FARM ROOM IS NOT READY.');
      }
      let restoredRoom;
      try {
        restoredRoom = await host.restorePreviousPublicState({
          expectedRoomRevision: host.room.publicRevision,
          idempotencyKey,
        });
      } catch (cause) {
        if (!retry && cause instanceof SnakeLiveTransportError && cause.code === 'stale-revision') {
          return publish(true);
        }
        throw cause;
      }
      const restoredPublic = readSnakeLivePublicSession(restoredRoom);
      const localBase = session.correctionSnapshots?.[0]
        ? restoreLatestSnakeCorrection(session)
        : session;
      const received = mergeLivePublicSession(localBase, restoredPublic);
      const nextUnavailable = new Set(received.completedPicks.map((pick) => pick.playerId));
      const nextRemainingTurns = Object.fromEntries(leagueTeams.map((team) => [team.id,
        received.pickOrder.slice(received.currentPickIndex).filter((slot) => slot.teamId === team.id).length,
      ]));
      const reconciled = reconcileFarmSeatBoards({
        session: received,
        unavailableProspectIds: nextUnavailable,
        remainingTurnsByTeamId: nextRemainingTurns,
      });
      await mirrorFarmSessionLocally({
        ...reconciled.session,
        correctionSnapshots: [],
      }, { acceptLowerRevision: true });
      setRecapOpen(false);
    };
    await publish(false);
  }, [leagueTeams, mirrorFarmSessionLocally, session]);
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
      const activeLiveRoom = liveHostRef.current.room;
      if (activeLiveRoom && activeLiveRoom.status !== 'closed') {
        await liveHostRef.current.closeRoom(
          `farm-handoff:${activeLiveRoom.id}:${activeLiveRoom.publicRevision}:${manifest.source.sessionId}`,
        ).catch(() => undefined);
      }
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
  if (error || actionError) return <main className="ballpark-page">
    <h1>THE FARM ROOM COULD NOT OPEN</h1>
    <p className="uppercase">{actionError ?? error}</p>
    <div className="mt-5 flex flex-wrap gap-2">
      <button className="ballpark-press-button ballpark-press-lg ballpark-press-gold min-h-11" onClick={() => void loadFarm()}>RETRY</button>
      <button className="ballpark-press-button ballpark-press-lg min-h-11" onClick={() => navigate('/')}>HOME</button>
    </div>
    <LiveRoomRecoveryPanel
      roomCode={recoveryRoomCode}
      working={recoveryWorking}
      error={recoveryError}
      onRoomCodeChange={setRecoveryRoomCode}
      onRestore={() => void recoverOpenFarmRoom()}
    />
  </main>;
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
  const deskHasApprovedCompanion = Boolean(deskTeam && liveHost.claims.some((claim) => (
    claim.teamId === deskTeam.id && claim.status === 'approved'
  )));
  return <>
    {liveHost.error && !liveHost.hostAccessReady && !recoverHostRequested ? <LiveRoomRecoveryPanel
      roomCode={recoveryRoomCode}
      working={recoveryWorking}
      error={recoveryError}
      onRoomCodeChange={setRecoveryRoomCode}
      onRestore={() => void recoverOpenFarmRoom()}
    /> : null}
    <SnakeDraftRoomView
    onHome={() => navigate('/')}
    teams={leagueTeams.map((team) => ({ id: team.id, name: team.name, abbreviation: team.abbreviation, colors: team.colors, logoUrl: team.logoUrl }))}
    order={session.pickOrder.map((slot, index, all) => ({ pick: slot.pick, teamId: slot.teamId, endpoint: all[index - 1]?.teamId === slot.teamId || all[index + 1]?.teamId === slot.teamId }))}
    currentPickIndex={session.currentPickIndex}
    ticker={[...session.completedPicks].reverse().map((pick) => ({ id: `${pick.pick}-${pick.playerId}`, teamId: pick.teamId, text: `PICK #${pick.pick} · ${leagueTeams.find((team) => team.id === pick.teamId)?.name ?? UNKNOWN_TEAM} SELECTED ${farmPool.prospects.find((row) => row.id === pick.playerId)?.firstName ?? UNKNOWN_PLAYER}` }))}
    rostersByTeamId={rostersByTeamId}
    ownedPicksByTeamId={ownedPicksByTeamId}
    activeSeatId={farmDraftComplete ? null : deskTeam?.id ?? null}
    canDraftFromActiveSeat={!farmDraftComplete && !deskHasApprovedCompanion && Boolean(deskBoard && deskTeam && currentTeam && deskTeam.id === currentTeam.id)}
    candidate={!deskHasApprovedCompanion && currentSlot && selected ? { id: selected.id, name: selected.name, position: selected.position, consequence: `PICK ${currentSlot.pick} PAYS $${farmPickSalary(session, currentSlot.pick).toLocaleString()} — WHOEVER TAKES IT.`, privateNote: selected.scoutsCall } : null}
    selectedPlayerCard={!deskHasApprovedCompanion && currentSlot && selected && deskTeam ? <FarmSelectedProspectCard
      card={selected}
      slotPick={currentSlot.pick}
      slotSalary={farmPickSalary(session, currentSlot.pick)}
      farmMoneyLeft={(farmBudgets[deskTeam.id] ?? 0) - teamSpent}
      teamName={deskTeam.name}
      teamLogoUrl={deskTeam.logoUrl}
    /> : undefined}
    selectedFitLabel={!deskHasApprovedCompanion && selected ? `SCOUT · ${selected.scoutedGrade}` : null}
    draftActionLabel="DRAFT PROSPECT"
    paused={false} soundsEnabled={soundsEnabled} correctionAvailable={Boolean(liveHost.room?.correctionAvailable)}
    hotseatNextName={hotseatPassName(session, currentTeam)}
    practiceMode={false}
    privateDesk={!deskHasApprovedCompanion && currentSlot ? <FarmPrivateDesk
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
    roomHelpNotes={deskHasApprovedCompanion ? [] : ['SLOT SALARIES STAY WITH THE PICKS.']}
    writeNotice={writeNotice ?? liveHost.error}
    onReloadRoom={async () => { setWriteNotice(null); await liveHost.refresh().catch(() => undefined); await loadFarm(); }}
    onDismissWriteNotice={() => setWriteNotice(null)}
    companionApproval={<CompanionApprovalCard
      roomCode={session.snakeCompanions?.roomCode ?? ''}
      teams={leagueTeams.map((team) => ({ id: team.id, name: team.name }))}
      claims={liveHost.claims}
      intents={liveHost.intents}
      ready={liveHost.liveRoomReady}
      working={liveHost.working}
      liveError={liveHost.error}
      playerName={(playerId) => farmPool.prospects.find((prospect) => prospect.id === playerId)
        ? fullName(
            farmPool.prospects.find((prospect) => prospect.id === playerId)!.firstName,
            farmPool.prospects.find((prospect) => prospect.id === playerId)!.lastName,
          )
        : 'UNKNOWN PROSPECT'}
      onResolveClaim={async (claim, status) => {
        if (status === 'approved') {
          const board = session.farmSeatBoards?.[claim.teamId];
          const teamCards = allCardsByTeamId[claim.teamId];
          if (!board || !teamCards) throw new Error('THE FARM BOARD IS NOT READY.');
          await liveHost.seedBoard({
            teamId: claim.teamId,
            board: buildFarmLivePrivateBoard({
              board,
              cards: teamCards,
              farmBudget: farmBudgets[claim.teamId] ?? 0,
            }),
          });
        }
        await liveHost.resolveClaim(
          claim,
          status,
          `farm-claim:${claim.id}:${claim.revision}:${status}`,
        );
      }}
      onApprovePick={(intent, request) => recordPick(request.playerId, request, intent)}
      onRejectPick={async (intent) => {
        await liveHost.resolveIntent(intent, 'rejected', `farm-pick-rejected:${intent.id}`);
      }}
    />}
    pendingCompanionCount={liveHost.claims.filter((claim) => claim.status === 'pending').length}
    pendingPickRequestCount={!liveHost.room
      ? 0
      : pendingSnakeLivePickIntentCount(liveHost.intents, liveHost.room.publicRevision)}
    onPauseChange={() => undefined}
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
        await correctLatestFarm();
      } catch (cause) {
        setWriteNotice(cause instanceof Error ? cause.message : String(cause));
        throw cause;
      }
    }}
    onSoundsEnabledChange={(enabled) => { setSoundsEnabled(enabled); saveSnakeSoundsEnabled(enabled); }}
      onDraftComplete={finishFarm}
    />
  </>;
}

function MlbSnakeDraftRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const { runProof: runSnakeSetupProof } = useSnakeSetupProofClient();
  const {
    leagues,
    teams,
    players: localPlayers,
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
  const recoveryRoomCodeParam = useMemo(() => new URLSearchParams(location.search).get('roomCode') ?? '', [location.search]);
  const recoverHostRequested = useMemo(() => new URLSearchParams(location.search).get('recover') === '1', [location.search]);
  const localLeague = useMemo(
    () => requestedLeagueId === null
      ? leagues[0] ?? null
      : leagues.find((entry) => entry.id === requestedLeagueId) ?? null,
    [leagues, requestedLeagueId],
  );
  const localLeagueTeams = useMemo(() => localLeague?.teamIds.flatMap((id) => {
    const team = teams.find((entry) => entry.id === id);
    return team ? [team] : [];
  }) ?? [], [localLeague, teams]);
  const [localPool, setLocalPool] = useState<Awaited<ReturnType<typeof getRegisteredPool>>>(null);
  const [session, setSession] = useState<Awaited<ReturnType<typeof getMlbDraftSession>>>(null);
  const [loadDone, setLoadDone] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [recoveryRoomCode, setRecoveryRoomCode] = useState(recoveryRoomCodeParam);
  const [recoveryWorking, setRecoveryWorking] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [writeNotice, setWriteNotice] = useState<string | null>(null);
  const [localMirrorWarning, setLocalMirrorWarning] = useState<string | null>(null);
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
  const liveSessionActive = Boolean(session);
  const liveCatalogPlayerIdsKey = session?.snakeSetup?.poolPlayerIds?.join('\u0000') ?? '';
  const liveCatalogTeamIdsKey = session?.snakeSetup?.clubs.map((club) => club.teamId).join('\u0000') ?? '';
  const liveCatalog = useMemo(() => {
    if (!localLeague || !localPool) return null;
    const activePoolPlayerIds = liveCatalogPlayerIdsKey
      ? liveCatalogPlayerIdsKey.split('\u0000')
      : [];
    const selected = new Set(activePoolPlayerIds);
    const activeTeamIds = liveCatalogTeamIdsKey ? liveCatalogTeamIdsKey.split('\u0000') : [];
    const registeredPool = {
      ...localPool,
      players: localPool.players.filter((player) => selected.has(player.id)),
    };
    try {
      return buildSnakeLiveCatalog({
        league: localLeague,
        teams: localLeagueTeams,
        players: localPlayers,
        registeredPool,
        activeTeamIds,
        activePoolPlayerIds,
      });
    } catch {
      return null;
    }
  }, [liveCatalogPlayerIdsKey, liveCatalogTeamIdsKey, localLeague, localLeagueTeams, localPlayers, localPool]);
  const [hostDeviceId, setHostDeviceId] = useState<string | null>(null);
  const liveHost = useSnakeLiveHostRoom({
    session,
    hostDeviceId,
    catalog: liveCatalog,
    recoverHost: recoverHostRequested,
    enabled: !practiceMode && liveSessionActive && Boolean(session?.snakeCompanions?.roomCode),
  });
  const cloudCatalog = useMemo(
    () => liveHost.catalog ? readSnakeLiveCatalog(liveHost.catalog.catalog) : null,
    [liveHost.catalog],
  );
  const useCloudCatalog = !practiceMode && Boolean(liveHost.room);
  const { league, leagueTeams, players, pool } = useMemo(() => ({
    league: useCloudCatalog ? cloudCatalog?.league ?? null : localLeague,
    leagueTeams: useCloudCatalog ? cloudCatalog?.teams ?? [] : localLeagueTeams,
    players: useCloudCatalog ? cloudCatalog?.players ?? [] : localPlayers,
    pool: useCloudCatalog ? cloudCatalog?.registeredPool ?? null : localPool,
  }), [cloudCatalog, localLeague, localLeagueTeams, localPlayers, localPool, useCloudCatalog]);
  const liveHostRef = useRef(liveHost);
  liveHostRef.current = liveHost;

  useEffect(() => {
    if (practiceMode || !liveSessionActive) {
      setHostDeviceId(null);
      return;
    }
    let cancelled = false;
    void getOrCreateSnakeLiveDeviceId().then((deviceId) => {
      if (!cancelled) setHostDeviceId(deviceId);
    }).catch((cause) => {
      if (!cancelled) setSyncError(cause instanceof Error ? cause.message : String(cause));
    });
    return () => { cancelled = true; };
  }, [liveSessionActive, practiceMode]);

  useEffect(() => {
    if (practiceMode || !liveSessionActive || !session || session.snakeCompanions?.roomCode) return;
    let cancelled = false;
    void patchMlbDraftSessionSnakeCompanions({
      leagueId: session.leagueId,
      seasonNumber: session.seasonNumber,
      patch: (current, fresh) => ensureCompanionRoom(
        { ...fresh, snakeCompanions: current },
      ).snakeCompanions!,
    }).then((saved) => {
      if (!cancelled) setSession(saved);
    }).catch((cause) => {
      if (!cancelled) setSyncError(cause instanceof Error ? cause.message : String(cause));
    });
    return () => { cancelled = true; };
  }, [liveSessionActive, practiceMode, session]);

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

  const loadSession = useCallback(async (leagueIdOverride?: string): Promise<boolean> => {
    setLoadDone(false);
    setActionError(null);
    try {
      const [freshLeagues, freshTeams, freshPlayers] = await Promise.all([
        getAllLeagueTemplates(),
        getAllTeams(),
        getAllPlayers(),
      ]);
      const targetLeagueId = leagueIdOverride ?? requestedLeagueId;
      const freshLeague = targetLeagueId === null
        ? freshLeagues[0] ?? null
        : freshLeagues.find((entry) => entry.id === targetLeagueId) ?? null;
      if (!freshLeague) {
        throw new Error(targetLeagueId ? 'THE LEAGUE WAS NOT FOUND.' : 'NO LEAGUE IS AVAILABLE FOR THIS DRAFT.');
      }
      if (freshLeague.draftFormat !== 'snake') throw new Error('THIS LEAGUE IS CONFIGURED FOR AN AUCTION DRAFT.');
      const [nextPool, nextSession] = await Promise.all([
        getRegisteredPool(freshLeague.id),
        getMlbDraftSession(freshLeague.id, sessionSeasonNumber),
      ]);
      if (nextSession?.draftManifest) readSnakeDraftTruth(nextSession, 'MLB');
      const remote = !practiceMode ? liveHostRef.current.publicSession : null;
      const received = nextSession && remote && nextSession.id === remote.id
        ? mergeLivePublicSession(nextSession, remote)
        : nextSession;
      setLocalPool(nextPool);
      setSession((current) => current && received && sameDraftSessionSnapshot(current, received)
        ? current
        : received);
      setRecapOpen(Boolean(received && (received.draftManifest || received.currentPickIndex >= received.pickOrder.length)));
      void freshTeams;
      void freshPlayers;
      await refresh();
      return true;
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
      return false;
    } finally {
      setLoadDone(true);
    }
  }, [getMlbDraftSession, getRegisteredPool, practiceMode, refresh, requestedLeagueId, sessionSeasonNumber]);

  useEffect(() => { void loadSession(); }, [loadSession]);

  const recoverOpenLiveRoom = useCallback(async () => {
    const roomCode = recoveryRoomCode.trim();
    if (!/^\d{4}$/.test(roomCode)) {
      setRecoveryError('ENTER THE FOUR-DIGIT ROOM CODE.');
      return;
    }
    setRecoveryWorking(true);
    setRecoveryError(null);
    try {
      if (!supabase) throw new Error('CLOUD SIGN-IN IS NOT CONFIGURED ON THIS PREVIEW.');
      const { data: { session: cloudSession }, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      if (!cloudSession) throw new Error('SIGN IN TO CLOUD SYNC ON THIS PREVIEW, THEN TRY AGAIN.');
      const transport = createSnakeLiveRoomTransport();
      const room = await transport.findRoomByCode(roomCode);
      if (!room) throw new Error('NO RECOVERABLE LIVE ROOM MATCHES THIS CODE.');
      const publicSession = readSnakeLivePublicSession(room);
      if (room.phase === 'FARM') {
        navigate(`/snake-room?phase=farm&leagueId=${encodeURIComponent(publicSession.leagueId)}&roomCode=${roomCode}&recover=1`, { replace: true });
        return;
      }
      const receipt = await transport.getCatalog(room.id);
      const catalog = receipt ? readSnakeLiveCatalog(receipt.catalog) : null;
      if (!catalog) throw new Error('THE LIVE ROOM CATALOG IS NOT AVAILABLE.');
      await restoreSnakeLiveRoomLocally({
        catalog,
        session: publicSession,
        recovery: { roomId: room.id, roomCode, publicRevision: room.publicRevision },
      });
      if (!await loadSession(catalog.league.id)) {
        throw new Error('THE RESTORED LIVE ROOM COULD NOT OPEN.');
      }
      navigate(`/snake-room?leagueId=${encodeURIComponent(catalog.league.id)}&roomCode=${roomCode}&recover=1`, { replace: true });
    } catch (cause) {
      setRecoveryError(cause instanceof Error ? cause.message : 'THE LIVE ROOM COULD NOT BE RESTORED HERE.');
    } finally {
      setRecoveryWorking(false);
    }
  }, [loadSession, navigate, recoveryRoomCode]);

  const refreshRoomTruth = useCallback(async () => {
    try {
      if (!practiceMode && liveHostRef.current.hostAccessReady) {
        await liveHostRef.current.refresh();
        await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
      }
      const freshLeagues = await getAllLeagueTemplates();
      const freshLeague = requestedLeagueId === null
        ? freshLeagues[0] ?? null
        : freshLeagues.find((entry) => entry.id === requestedLeagueId) ?? null;
      if (!freshLeague) throw new Error('THE LEAGUE WAS NOT FOUND.');
      const fresh = await getMlbDraftSession(freshLeague.id, sessionSeasonNumber);
      setSyncError(null);
      if (!fresh) return;
      if (fresh.draftManifest) readSnakeDraftTruth(fresh, 'MLB');
      const remote = !practiceMode ? liveHostRef.current.publicSession : null;
      const received = remote ? mergeLivePublicSession(fresh, remote) : fresh;
      setSession((current) => {
        if (!current) return received;
        if ((received.revision ?? 0) < (current.revision ?? 0)) return current;
        return sameDraftSessionSnapshot(current, received) ? current : received;
      });
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause);
      setSyncError(`LIVE ROOM SYNC FAILED — ${detail}`);
    }
  }, [getMlbDraftSession, practiceMode, requestedLeagueId, sessionSeasonNumber]);

  useEffect(() => {
    if (!practiceMode) return;
    return startSnakeRoomFreshness({ pullAndRefresh: refreshRoomTruth });
  }, [practiceMode, refreshRoomTruth]);

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
  const deskHasApprovedCompanion = Boolean(deskTeam && !practiceMode && liveHost.claims.some((claim) => (
    claim.teamId === deskTeam.id && claim.status === 'approved'
  )));
  useEffect(() => {
    if (deskHasApprovedCompanion) invalidatePrivateContext();
  }, [deskHasApprovedCompanion, invalidatePrivateContext]);
  const hotseatPrivateDeskActive = privateDeskActive && !deskHasApprovedCompanion;
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
  const currentBoard = deskTeam && !deskHasApprovedCompanion ? session?.seatBoards?.[deskTeam.id] : null;
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
  const seatingProofInputKey = useMemo(() => (
    seatingProofInput ? fingerprintSnakeSetupProofInput(seatingProofInput) : null
  ), [seatingProofInput]);
  const seatingProofInputRef = useRef(seatingProofInput);
  seatingProofInputRef.current = seatingProofInput;
  const [seatingProofResult, setSeatingProofResult] = useState<SnakeSeatingProof | null>(null);
  useEffect(() => {
    const seatingProofInput = seatingProofInputRef.current;
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
  }, [seatingProofInputKey, session?.snakeSetup?.seatingCertificate]);
  const deskRoomPlayers = useMemo(() => activePoolRows.flatMap((row) => {
    const player = playerById.get(row.id);
    const seating = seatingById.get(row.id);
    if (!player || !seating) return [];
    const deskPlayer = buildDeskRoomPlayer({ player, price: row.iv, seating });
    return deskPlayer ? [deskPlayer] : [];
  }), [activePoolRows, playerById, seatingById]);
  const deskRoomById = useMemo(() => new Map(deskRoomPlayers.map((player) => [player.playerId, player])), [deskRoomPlayers]);
  const finishSafetyRequest = useMemo(() => {
    if (!hotseatPrivateDeskActive || !deskTeam || !seatingProofInput || !seatingProofResult?.feasible) return null;
    const availableIds = new Set(deskRoomPlayers
      .filter((player) => !unavailable.has(player.playerId))
      .map((player) => player.playerId));
    return buildSnakePickFinishWorkerRequest({
      current: seatingProofInput,
      proof: seatingProofResult,
      teamId: deskTeam.id,
      candidatePlayerIds: [...new Set([
        ...Object.values(currentBoard?.slots ?? {}),
        ...(currentBoard?.rankings.global ?? []),
        ...deskRoomPlayers.map((player) => player.playerId),
      ].filter((playerId): playerId is string => Boolean(playerId) && availableIds.has(playerId)))],
    });
  }, [currentBoard, deskRoomPlayers, deskTeam, hotseatPrivateDeskActive, seatingProofInput, seatingProofResult, unavailable]);
  const finishSafety = useSnakePickFinishSafety(finishSafetyRequest);
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
    const finish = finishSafety.rows.get(candidateId);
    const blockReason = !finish
      ? finishSafety.status === 'pending' ? 'FINISH CHECK CALCULATING.' : 'FINISH PROOF UNAVAILABLE.'
      : finish.status === 'BLOCKED' ? finish.message : null;
    const line = blockReason ?? (finish?.status === 'DRAFTABLE'
      ? `LEGAL 22 · $${Math.round(finish.finalSalary!).toLocaleString()} SALARY · $${Math.round(finish.finalTax!).toLocaleString()} TAX · $${Math.round(finish.moneyLeft!).toLocaleString()} LEFT.`
      : finish?.message ?? 'FINISH PROOF UNAVAILABLE.');
    return {
      id: player.id,
      name: fullName(player.firstName, player.lastName),
      position: player.primaryPosition,
      consequence: line,
      blockReason,
    };
  }, [candidateId, completedPickByPlayerId, deskTeam, draftedTeamNameByPlayerId, finishSafety, playerById, pool, poolById, seatingById, session]);

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
  const liveTradeProjection = useMemo(() => (
    practiceMode
      ? {
          openOffers: session?.openTradeOffers ?? [],
          executableOffers: (session?.openTradeOffers ?? []).filter((offer) => offer.buyerNod && offer.sellerNod),
          invalidIntentIds: [],
        }
      : projectSnakeLiveTradeOffers(liveHost.intents, liveHost.room?.publicRevision ?? -1)
  ), [liveHost.intents, liveHost.room?.publicRevision, practiceMode, session?.openTradeOffers]);
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

  const mirrorLiveSessionLocally = useCallback(async (
    next: LeagueBuilderMlbDraftSession,
    options: { acceptLowerRevision?: boolean } = {},
  ): Promise<LeagueBuilderMlbDraftSession> => {
    setSession((current) => {
      if (!options.acceptLowerRevision
        && current?.id === next.id
        && (current.revision ?? 0) > (next.revision ?? 0)) return current;
      return next;
    });
    if (next.currentPickIndex >= next.pickOrder.length) setRecapOpen(true);
    try {
      const saved = await updateMlbDraftSessionAtomically(
        next.leagueId,
        next.seasonNumber,
        (fresh) => ({
          ...next,
          seatBoards: next.seatBoards ?? fresh.seatBoards,
          snakeCompanions: fresh.snakeCompanions ?? next.snakeCompanions,
        }),
      );
      setSession((current) => {
        if (!options.acceptLowerRevision
          && current?.id === saved.id
          && (current.revision ?? 0) > (saved.revision ?? 0)) return current;
        return saved;
      });
      setLocalMirrorWarning(null);
      return saved;
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause);
      setLocalMirrorWarning(`THE LIVE ROOM IS CURRENT. THE LOCAL BACKUP FAILED — ${detail}`);
      return next;
    }
  }, []);

  const liveAdoptionRef = useRef<{ key: string; promise: Promise<void> } | null>(null);
  const liveAdoptedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const remote = liveHost.publicSession;
    const liveRoom = liveHost.room;
    if (practiceMode || !session || !remote || !liveRoom || !liveHost.hostAccessReady) return;
    if (remote.id !== session.id) return;
    const key = `${liveRoom.id}:${liveRoom.publicRevision}`;
    if (liveAdoptedKeyRef.current === key || liveAdoptionRef.current?.key === key) return;
    const received = mergeLivePublicSession(session, remote);
    liveAdoptedKeyRef.current = key;
    setSession(received);
    if (received.currentPickIndex >= received.pickOrder.length) setRecapOpen(true);
    const promise = updateMlbDraftSessionAtomically(
      session.leagueId,
      session.seasonNumber,
      (fresh) => mergeLivePublicSession(fresh, remote),
    ).then((saved) => {
      if (liveAdoptedKeyRef.current !== key) return;
      setSession((current) => {
        if (current?.id === saved.id && (current.revision ?? 0) > (saved.revision ?? 0)) return current;
        return saved;
      });
      if (saved.currentPickIndex >= saved.pickOrder.length) setRecapOpen(true);
      setLocalMirrorWarning(null);
      setSyncError(null);
    }).catch((cause) => {
      if (liveAdoptedKeyRef.current === key) {
        setLocalMirrorWarning(`THE LIVE ROOM IS CURRENT. THE LOCAL BACKUP FAILED — ${cause instanceof Error ? cause.message : String(cause)}`);
      }
    }).finally(() => {
      if (liveAdoptionRef.current?.promise === promise) liveAdoptionRef.current = null;
    });
    liveAdoptionRef.current = { key, promise };
  }, [
    liveHost.hostAccessReady,
    liveHost.publicSession,
    liveHost.room,
    practiceMode,
    session,
  ]);

  const saveSeatBoard = useCallback(async (input: {
    teamId: string;
    board: SnakeSeatBoardRecord;
    expectedBoardRevision: number;
    actionKey: string;
  }): Promise<LeagueBuilderMlbDraftSession> => {
    if (!session) throw new Error('THE DRAFT ROOM IS NOT READY.');
    const claimed = !practiceMode && liveHostRef.current.claims.some((claim) => (
      claim.teamId === input.teamId && claim.status === 'approved'
    ));
    if (claimed) {
      throw new Error('THIS PRIVATE BOARD BELONGS TO A COMPANION DEVICE.');
    }
    const saved = await patchMlbDraftSessionSeatBoard({
      leagueId: session.leagueId,
      seasonNumber: session.seasonNumber,
      teamId: input.teamId,
      board: input.board,
      expectedBoardRevision: input.expectedBoardRevision,
    });
    setSession(saved);
    return saved;
  }, [practiceMode, session]);

  const planBrokenPauseRef = useRef<string | null>(null);

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
    setWriteNotice((current) => current?.startsWith('THE LIVE ROOM IS CURRENT. THE LOCAL BACKUP FAILED')
      ? current
      : 'DRAFT BOARD UPDATED — A TARGET WAS TAKEN.');
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
    if (!practiceMode) return;
    void persist(reconciled.session).catch((cause) => {
      setWriteNotice(cause instanceof Error ? cause.message : String(cause));
    });
  }, [boardEligibilityCandidates.length, persist, practiceMode, reconcileAllExistingBoards, rememberBackfillEvents, session]);

  const rationalRiskRequest = useMemo(() => {
    if (!hotseatPrivateDeskActive || !session || !pool || !deskTeam) return null;
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
  }, [candidateId, currentBoard, deskRoomById, deskRoomPlayers, deskTeam, hotseatPrivateDeskActive, leagueTeams, pool, session, unavailable]);
  const rationalRiskState = useSnakeRationalRisks(rationalRiskRequest);
  const askedRiskIds = useMemo(
    () => new Set(rationalRiskRequest?.input.askedPlayerIds ?? []),
    [rationalRiskRequest],
  );

  const deskState = useMemo(() => {
    if (!hotseatPrivateDeskActive || !session || !pool || !deskTeam) return null;
    const locked = currentLocked ?? resolveLockedSeat({ team: deskTeam, session });
    const caps = snakeLuxuryCaps(pool.luxuryCaps);
    const seats = buildRationalSeats({ teams: leagueTeams, session, playersById: deskRoomById, budget: pool.tierCap });
    const ownSeat = seats.find((seat) => seat.teamId === deskTeam.id);
    if (!ownSeat) return null;
    const need = rosterNeedBreakdown(ownSeat.roster.map((player) => player.shape));
    const teamPicks = session.completedPicks.filter((pick) => pick.teamId === deskTeam.id);
    const draftedStoredPlayers = teamPicks.flatMap((pick) => playerById.get(pick.playerId) ?? []);
    const draftedPlayersComplete = draftedStoredPlayers.length === teamPicks.length && ownSeat.roster.length === teamPicks.length;
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
      const finish = finishSafety.rows.get(player.playerId);
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
        salary: displayedSalary,
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
        legalFinishLine: completedPick ? '' : finish?.message
          ?? (finishSafety.status === 'pending' ? 'FINISH CHECK CALCULATING.' : 'FINISH PROOF UNAVAILABLE.'),
        finishStatus: completedPick ? undefined : finish?.status ?? 'OPEN',
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
    const certifiedCompletionPlayerIds = seatingProofResult?.feasible
      ? seatingProofResult.assignments.find((assignment) => assignment.teamId === deskTeam.id)?.playerIds ?? []
      : [];
    const cheapestFinishDepthByPlayerId = new Map<string, number>();
    for (const playerId of certifiedCompletionPlayerIds) {
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
      taxCoreRows: board ? buildTaxCoreRows({ candidates: displayCandidates, boardPlayerIds: Object.values(board.slots), caps, capIdentity: locked.capIdentity }) : [],
    };
  }, [askedRiskIds, backfillEventsBySeat, boardEligibilityCandidates, boardUnavailable, candidateId, completedPickByPlayerId, currentBoard, currentLocked, deskRoomById, deskRoomPlayers, deskTeam, draftedTeamNameByPlayerId, finishSafety, hotseatPrivateDeskActive, leagueTeams, playerById, pool, rationalRiskState.risks, rationalRiskState.status, seatingProofResult, session, unavailable]);

  const assistantIdentity = useMemo(() => session && deskTeam && deskState?.board && hotseatPrivateDeskActive ? {
    sessionId: session.id,
    sessionRevision: session.revision ?? 0,
    teamId: deskTeam.id,
    seatId: deskTeam.gmSeatId ?? deskTeam.id,
    deviceId: `main:${session.id}`,
    privateEpoch: privateEpochRef.current,
    boardRevision: deskState.board.revision,
  } : null, [deskState?.board, deskTeam, hotseatPrivateDeskActive, session]);
  const assistantRequest = useMemo(() => {
    if (!hotseatPrivateDeskActive || !session || !pool || !league || !deskTeam || !deskState?.board
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
        zeroInterestPlayerIds: deskState.board.rankings.zeroInterestPlayerIds,
        certifiedCompletionPlayerIds: seatingProofResult?.feasible
          ? seatingProofResult.assignments.find((assignment) => assignment.teamId === deskTeam.id)?.playerIds
          : undefined,
        tier: league.tier ?? 'juiced',
        budget: pool.tierCap,
        baseCaps: pool.luxuryCaps,
        realTeamCount: leagueTeams.length,
        capIdentity: deskState.locked.capIdentity,
      },
      savedDesignSlots: localLeagueTeams.find((team) => team.id === deskTeam.id)?.rosterDesign?.slots,
    });
  }, [assistantIdentity, assistantLivePlayers, assistantOptimizePlayerId, deskState, deskTeam, hotseatPrivateDeskActive, league, leagueTeams.length, localLeagueTeams, pool, seatingProofResult, session]);
  const assistantBoardState = useSnakeAssistantBoard(assistantRequest);
  const assistantTaxCoreRows = useMemo(() => {
    if (assistantBoardState.status !== 'ready' || !assistantBoardState.board || !deskState || !pool) return [];
    return buildTaxCoreRows({
      candidates: deskState.candidates,
      boardPlayerIds: assistantBoardState.board.slots.map((slot) => slot.playerId),
      caps: snakeLuxuryCaps(pool.luxuryCaps),
      capIdentity: deskState.locked.capIdentity,
    });
  }, [assistantBoardState.board, assistantBoardState.status, deskState, pool]);
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
  const selectedRisk = useMemo(() => rationalRiskState.status === 'ready' && candidateId
    ? rationalRiskState.risks?.find((row) => row.playerId === candidateId) ?? null
    : null, [candidateId, rationalRiskState.risks, rationalRiskState.status]);
  const selectedScarcity = useMemo(() => rationalRiskState.status === 'ready' && candidateId
    ? rationalRiskState.scarcity?.filter((row) => row.playerId === candidateId) ?? null
    : null, [candidateId, rationalRiskState.scarcity, rationalRiskState.status]);
  const replacementConsequencePlayerIds = useMemo(() => [...new Set((selectedScarcity ?? []).flatMap((row) => (
    row.replacementState === 'AVAILABLE'
    && row.replacementPlayerId
    && row.replacementPlayerId !== candidateId
    && !unavailable.has(row.replacementPlayerId)
      ? [row.replacementPlayerId]
      : []
  )))], [candidateId, selectedScarcity, unavailable]);
  const consequenceRequest = useMemo<SnakeSelectedConsequencesWorkerRequest | null>(() => {
    if (!hotseatPrivateDeskActive || !assistantIdentity || !session || !pool || !deskTeam || !deskState?.board || !candidateId) return null;
    const selectedPlayerIds = [candidateId, ...replacementConsequencePlayerIds];
    return {
      key: `snake-consequence:${assistantIdentity.sessionId}:${assistantIdentity.sessionRevision}:${assistantIdentity.teamId}:${assistantIdentity.boardRevision}:${selectedPlayerIds.join(',')}`,
      selectedPlayerIds,
      input: {
        identity: assistantIdentity,
        teamId: deskTeam.id,
        board: deskState.board,
        designSlots: localLeagueTeams.find((team) => team.id === deskTeam.id)?.rosterDesign?.slots,
        players: consequencePlayers,
        completedPicks: session.completedPicks.map((pick) => ({
          teamId: pick.teamId, playerId: pick.playerId, settledSalary: pick.settledSalary,
        })),
        versionState: session.versionState,
        versionSelections: session.snakeSetup?.versionSelections,
        budget: pool.tierCap,
        baseCaps: pool.luxuryCaps,
        realTeamCount: leagueTeams.length,
        capIdentity: deskState.locked.capIdentity,
      },
    };
  }, [assistantIdentity, candidateId, consequencePlayers, deskState, deskTeam, hotseatPrivateDeskActive, leagueTeams.length, localLeagueTeams, pool, replacementConsequencePlayerIds, session]);
  const consequenceState = useSnakeSelectedConsequences(consequenceRequest);
  const selectedConsequence = candidateId
    ? consequenceState.consequenceByPlayerId.get(candidateId) ?? null
    : null;
  const selectedDecisionFacts = useMemo(() => buildSnakeDecisionCandidateFacts({
    playerId: candidateId ?? '',
    candidate: deskState?.selectedCandidate ?? null,
    consequence: selectedConsequence,
  }), [candidateId, deskState?.selectedCandidate, selectedConsequence]);
  const replacementDecisionFacts = useMemo(() => {
    if (!hotseatPrivateDeskActive || !assistantIdentity || !session || !pool
      || !deskTeam || !deskState?.board || !candidateId || !selectedScarcity) return null;
    const candidatesById = new Map(deskState.candidates.map((candidate) => [candidate.id, candidate]));
    return replacementConsequencePlayerIds.flatMap((replacementId) => {
      const consequence = consequenceState.consequenceByPlayerId.get(replacementId) ?? null;
      return buildSnakeDecisionCandidateFacts({
        playerId: replacementId,
        candidate: candidatesById.get(replacementId) ?? null,
        consequence,
      }) ?? [];
    });
  }, [assistantIdentity, candidateId, consequenceState.consequenceByPlayerId, deskState, deskTeam, hotseatPrivateDeskActive, pool, replacementConsequencePlayerIds, selectedScarcity, session]);
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
    void updateMlbDraftSessionAtomically(session.leagueId, session.seasonNumber, (fresh) => ({
      ...fresh,
      seatBoards: { ...(fresh.seatBoards ?? {}), [deskTeam.id]: deskState.board! },
    })).then(setSession).catch((cause) => {
      setWriteNotice(cause instanceof Error ? cause.message : String(cause));
    });
  }, [currentBoard, deskTeam, deskState, session]);

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
      };
    }).then((saved) => {
      if (wrote) setSession(saved);
    }).catch((cause) => setWriteNotice(cause instanceof Error ? cause.message : String(cause)));
  }, [deskState, deskTeam, session]);

  const selectCandidate = useCallback((playerId: string) => {
    if ((unavailable.has(playerId) && !completedPickByPlayerId.has(playerId))
      || !playerById.has(playerId)
      || !poolById.has(playerId)) return;
    if (deskTeam) {
      setAssistantOptimizePlayerId(null);
      setSelectedPlayerIdByTeam((current) => ({ ...current, [deskTeam.id]: playerId }));
    }
  }, [completedPickByPlayerId, deskTeam, playerById, poolById, unavailable]);

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
      saved = await saveSeatBoard({
        teamId: deskTeam.id,
        board: reordered.board,
        expectedBoardRevision: deskState.board.revision,
        actionKey: `reorder:${session.id}:${deskTeam.id}:${deskState.board.revision}:${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
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
  }, [boardEligibilityCandidates, boardUnavailable, capturePrivateContext, deskTeam, deskState, ownCommittedPlayerIds, privateContextIsCurrent, saveSeatBoard, session]);

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
      const saved = await saveSeatBoard({
        teamId: deskTeam.id,
        board: restoredBoard,
        expectedBoardRevision: currentBoard.revision,
        actionKey: `undo:${session.id}:${deskTeam.id}:${currentBoard.revision}:${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
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
  }, [boardEligibilityCandidates, boardUndo, capturePrivateContext, deskTeam, privateContextIsCurrent, saveSeatBoard, session]);

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
      if (!privateContextIsCurrent(guard)) {
        await refreshRoomTruth();
        return;
      }
      const saved = await saveSeatBoard({
        teamId: deskTeam.id,
        board: selectedConsequence.board,
        expectedBoardRevision: deskState.board.revision,
        actionKey: `keep:${session.id}:${deskTeam.id}:${deskState.board.revision}:${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
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
  }, [boardEligibilityCandidates, capturePrivateContext, deskState?.board, deskTeam, privateContextIsCurrent, refreshRoomTruth, saveSeatBoard, selectedConsequence, session]);

  const setSelectedZeroInterest = useCallback(async (zeroInterest: boolean) => {
    if (!candidateId || !session || !deskTeam || !deskState?.board) return;
    const guard = capturePrivateContext();
    if (!guard || guard.identity.teamId !== deskTeam.id) return;
    const nextBoard = setSeatBoardZeroInterest(deskState.board, candidateId, zeroInterest);
    try {
      const saved = await saveSeatBoard({
        teamId: deskTeam.id,
        board: nextBoard,
        expectedBoardRevision: deskState.board.revision,
        actionKey: `interest:${session.id}:${deskTeam.id}:${deskState.board.revision}:${candidateId}:${zeroInterest ? 'zero' : 'restore'}`,
      });
      if (privateContextIsCurrent(guard)) {
        setSession(saved);
        setAssistantOptimizePlayerId(null);
      }
    } catch (cause) {
      if (privateContextIsCurrent(guard)) setWriteNotice(cause instanceof Error ? cause.message : String(cause));
    }
  }, [candidateId, capturePrivateContext, deskState?.board, deskTeam, privateContextIsCurrent, saveSeatBoard, session]);

  const recordPick = useCallback(async (
    playerId: string,
    companionRequest?: SnakeCompanionPickRequest,
    companionIntent?: SnakeLiveIntent,
  ) => {
    if (!session) throw new Error('THE MLB SNAKE DRAFT IS NOT READY.');
    if (!pool) throw new Error('THE MLB DRAFT POOL IS NOT READY.');
    if (!seatingProofInput || !seatingProofResult?.feasible) {
      throw new Error('THE SHARED DRAFT PROOF IS NOT READY.');
    }

    const buildPick = (source: LeagueBuilderMlbDraftSession, reconcilePrivateBoards: boolean) => {
      const slot = source.pickOrder[source.currentPickIndex];
      const activeTeam = leagueTeams.find((team) => team.id === slot?.teamId);
      if (!slot || !activeTeam) throw new Error('THE CLUB ON THE CLOCK IS NOT READY.');
      const authorizedTeamId = companionRequest?.teamId ?? deskTeam?.id;
      if (!authorizedTeamId || authorizedTeamId !== activeTeam.id) {
        throw new Error('ONLY THE CLUB ON THE CLOCK CAN MAKE THIS PICK.');
      }
      const sourceUnavailable = new Set(source.completedPicks.map((pick) => pick.playerId));
      for (const id of unavailableVersionPlayerIds(source.versionState)) sourceUnavailable.add(id);
      if (sourceUnavailable.has(playerId)) throw new Error('THE PLAYER IS NO LONGER AVAILABLE.');
      const player = seatingById.get(playerId);
      const priced = poolById.get(playerId);
      if (!player || !priced) throw new Error('THE PLAYER IS NOT IN THE FROZEN DRAFT POOL.');
      const teamPicks = source.completedPicks.filter((pick) => pick.teamId === activeTeam.id);
      const existingPlayers = teamPicks.flatMap((pick) => {
        const row = seatingById.get(pick.playerId);
        return row ? [row] : [];
      });
      if (existingPlayers.length !== teamPicks.length) throw new Error('THE DRAFTED ROSTER DATA IS INCOMPLETE.');
      const committedSpent = teamPicks.reduce((sum, pick) => (
        sum + (pick.settledSalary ?? poolById.get(pick.playerId)?.iv ?? Number.NaN)
      ), 0);
      if (!Number.isFinite(committedSpent)) throw new Error('THE DRAFTED ROSTER MONEY IS INCOMPLETE.');
      const locked = resolveLockedSeat({ team: activeTeam, session: source });
      const finish = evaluateSnakeLegalFinish({
        currentRoster: [...existingPlayers, player],
        committedSpent: committedSpent + priced.iv,
        availablePool: seatingPlayers.filter((row) => row.playerId !== playerId && !sourceUnavailable.has(row.playerId)),
        budget: pool.tierCap,
        baseCaps: pool.luxuryCaps,
        realTeamCount: leagueTeams.length,
        capIdentity: locked.capIdentity,
      });
      if (!finish.feasible
        || (!snakeMoneyNonnegative(finish.legalFinishCushion) && finish.affordability === 'BLOCKED')) {
        throw new Error('THIS PICK LEAVES NO LEGAL, AFFORDABLE 22.');
      }
      const marginalTax = auctionMarginalTaxWithCaps(
        existingPlayers.map((row) => row.construction),
        player.construction,
        locked.capIdentity,
        snakeLuxuryCaps(pool.luxuryCaps),
      );
      const pickProofKey = `${activeTeam.id}:${source.revision ?? 0}:${playerId}`;
      let simultaneous = seatingPickProofCacheRef.current.get(pickProofKey);
      if (!simultaneous) {
        simultaneous = proveSnakePickKeepsAllClubsSeated({
          current: seatingProofInput,
          teamId: activeTeam.id,
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
      const next = applySnakePickWithCorrection({
        session: source,
        player,
        settledSalary: priced.iv,
        marginalTax,
        versionPool: seatingPlayers,
      });
      if (!next.snakeSetup) throw new Error('THE FROZEN SNAKE SETUP IS MISSING.');
      if (!reconcilePrivateBoards) {
        return {
          next: {
            ...next,
            snakeSetup: { ...next.snakeSetup, seatingCertificate },
          },
          activeTeam,
          slot,
          seatingCertificate,
          backfillEvents: {} as Record<string, BoardBackfillEvent[]>,
        };
      }
      const reconciled = reconcileAllExistingBoards(next);
      if (!reconciled.session.snakeSetup) throw new Error('THE FROZEN SNAKE SETUP IS MISSING.');
      return {
        next: {
          ...reconciled.session,
          snakeSetup: { ...reconciled.session.snakeSetup, seatingCertificate },
        },
        activeTeam,
        slot,
        seatingCertificate,
        backfillEvents: reconciled.eventsByTeamId,
      };
    };

    setPrivateDeskRevealed(false);
    if (practiceMode) {
      const outcome: { result?: ReturnType<typeof buildPick> } = {};
      const saved = await updateMlbDraftSessionAtomically(session.leagueId, session.seasonNumber, (fresh) => {
        outcome.result = buildPick(fresh, true);
        return outcome.result.next;
      });
      if (!outcome.result) throw new Error('THE PICK DID NOT SAVE.');
      rememberBackfillEvents(outcome.result.backfillEvents);
      setSeatingProofResult(outcome.result.seatingCertificate);
      setSession(saved);
      return;
    }

    const clickedRoom = liveHostRef.current.room;
    const actionIncarnation = clickedRoom
      ? `${clickedRoom.id}:${clickedRoom.publicRevision}`
      : 'room-not-ready';
    const publish = async (retry: boolean): Promise<void> => {
      let host = liveHostRef.current;
      if (!host.liveRoomReady || !host.room || !host.publicSession) {
        throw new Error('THE LIVE ROOM IS NOT READY.');
      }
      if (retry) {
        await host.refresh();
        await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
        host = liveHostRef.current;
        if (!host.room || !host.publicSession) throw new Error('THE LIVE ROOM IS NOT READY.');
      }
      const requestedSlot = session.pickOrder[session.currentPickIndex];
      const requestedPick = companionRequest?.pick ?? requestedSlot?.pick;
      const requestedTeamId = companionRequest?.teamId ?? deskTeam?.id;
      const alreadySaved = host.publicSession.completedPicks.find((pick) => (
        pick.pick === requestedPick && pick.teamId === requestedTeamId
      ));
      if (alreadySaved?.playerId === playerId) {
        const received = mergeLivePublicSession(session, host.publicSession);
        let localReceived = received;
        try {
          const reconciled = reconcileAllExistingBoards(received);
          localReceived = reconciled.session;
          rememberBackfillEvents(reconciled.eventsByTeamId);
        } catch {
          setWriteNotice('THE PICK IS LIVE. THE HOTSEAT BOARD NEEDS A REFRESH.');
        }
        await mirrorLiveSessionLocally(localReceived);
        if (companionIntent?.status === 'pending') {
          await host.resolveIntent(companionIntent, 'accepted', `pick-accepted:${companionIntent.id}`)
            .catch(() => setWriteNotice('THE PICK IS LIVE. THE COMPANION REQUEST RECEIPT NEEDS A REFRESH.'));
        }
        return;
      }
      const source = snakeLivePublicActionSession(mergeLivePublicSession(session, host.publicSession));
      const result = buildPick(source, false);
      if (companionRequest && companionIntent) {
        const approved = host.claims.some((claim) => claim.deviceId === companionIntent.deviceId
          && claim.teamId === companionIntent.teamId && claim.status === 'approved');
        if (!approved
          || companionIntent.status !== 'pending'
          || companionIntent.expectedRoomRevision !== host.room.publicRevision
          || companionRequest.sessionRevision !== (source.revision ?? 0)
          || companionRequest.pick !== result.slot.pick
          || companionRequest.teamId !== result.activeTeam.id) {
          throw new Error('THE COMPANION PICK REQUEST IS STALE.');
        }
      }
      try {
        await host.publishSession({
          session: snakeLivePublicActionSession(result.next),
          expectedRoomRevision: host.room.publicRevision,
          idempotencyKey: `pick:${result.next.id}:${result.slot.pick}:${playerId}:${actionIncarnation}`,
          eventKind: 'PICK_RECORDED',
          publicEvent: { pick: result.slot.pick, teamId: result.activeTeam.id, playerId },
          status: result.next.currentPickIndex >= result.next.pickOrder.length ? 'complete' : 'open',
        });
      } catch (cause) {
        if (!retry && cause instanceof SnakeLiveTransportError && cause.code === 'stale-revision') {
          return publish(true);
        }
        throw cause;
      }
      setSeatingProofResult(result.seatingCertificate);
      const localPicked: LeagueBuilderMlbDraftSession = {
        ...mergeLivePublicSession(session, result.next),
        correctionSnapshots: result.next.correctionSnapshots,
      };
      let localNext = localPicked;
      try {
        const reconciled = reconcileAllExistingBoards(localPicked);
        localNext = reconciled.session;
        rememberBackfillEvents(reconciled.eventsByTeamId);
      } catch {
        setWriteNotice('THE PICK IS LIVE. THE HOTSEAT BOARD NEEDS A REFRESH.');
      }
      await mirrorLiveSessionLocally({
        ...localNext,
        snakeSetup: localNext.snakeSetup ? {
          ...localNext.snakeSetup,
          seatingCertificate: result.seatingCertificate,
        } : result.next.snakeSetup,
      });
      if (companionIntent) {
        await host.resolveIntent(companionIntent, 'accepted', `pick-accepted:${companionIntent.id}`)
          .catch(() => setWriteNotice('THE PICK IS LIVE. THE COMPANION REQUEST RECEIPT NEEDS A REFRESH.'));
      }
    };
    await publish(false);
  }, [deskTeam, leagueTeams, mirrorLiveSessionLocally, pool, poolById, practiceMode, reconcileAllExistingBoards, rememberBackfillEvents, seatingById, seatingPlayers, seatingProofInput, seatingProofResult, session]);

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
      if (!practiceMode && liveHostRef.current.hostAccessReady) {
        await liveHostRef.current.refresh().catch(() => undefined);
        await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
      }
      const freshSession = await getMlbDraftSession(league.id, sessionSeasonNumber);
      if (!freshSession) throw new Error('THE COMPLETED DRAFT SESSION COULD NOT BE RELOADED.');
      const freshPool = await getRegisteredPool(league.id);
      if (!freshPool) throw new Error('THE COMPLETED DRAFT POOL COULD NOT BE RELOADED.');
      const freshPlayers = await getAllPlayers();
      let liveRoom = practiceMode ? null : liveHostRef.current.room;
      let livePublicSession = practiceMode ? null : liveHostRef.current.publicSession;
      if (!practiceMode && (!liveRoom || !livePublicSession)) {
        const recovery = freshSession.liveRoomRecovery;
        if (!recovery) throw new Error('THE LIVE DRAFT IS NOT COMPLETE.');
        const recoveredRoom = await createSnakeLiveRoomTransport().getRoom(recovery.roomId);
        if (recoveredRoom) {
          const recoveredSession = readSnakeLivePublicSession(recoveredRoom);
          if (recoveredSession.id !== freshSession.id) throw new Error('THE RECOVERED LIVE ROOM DOES NOT MATCH THIS DRAFT.');
          liveRoom = recoveredRoom;
          livePublicSession = recoveredSession;
        } else {
          // The recovery receipt was created from the server's immutable public
          // snapshot. A completed draft can still be finalized when the room is
          // no longer available for a read-only refresh.
          livePublicSession = freshSession;
        }
      }
      if (!practiceMode && !livePublicSession) throw new Error('THE LIVE DRAFT IS NOT COMPLETE.');
      const completionSource = practiceMode
        ? freshSession
        : snakeLivePublicActionSession(livePublicSession!);
      if (!completionSource.draftManifest
        && completionSource.currentPickIndex < completionSource.pickOrder.length) {
        throw new Error('THE DRAFT IS NOT COMPLETE.');
      }
      const draftedPlayerIds = [...new Set(completionSource.completedPicks.map((pick) => pick.playerId))];
      const localPlayerById = new Map(freshPlayers.map((player) => [player.id, player]));
      const canonicalDraftedPlayers = draftedPlayerIds.map((playerId) => {
        const player = localPlayerById.get(playerId);
        if (!player) throw new Error(`THE LOCAL PLAYER RECORD IS MISSING FOR ${playerId}.`);
        return player;
      });
      const mlbMeta = draftFreezeMeta(canonicalDraftedPlayers);
      const mlbInputs = buildDraftFreezeInputs({
        mlbSession: null,
        mlbSnakeSession: completionSource,
        mlbRegisteredPool: freshPool,
        farmSession: null,
        metaByPlayerId: mlbMeta,
      });
      const mlbAlignment = buildSnakeDraftAlignmentInputs({
        session: completionSource,
        playersById: new Map(canonicalDraftedPlayers.map((player) => [player.id, player])),
      });
      const mlbFreeze = computeDraftFreeze(mlbInputs, { snakeFanMoraleAlignment: mlbAlignment });
      const activeMlbIds = new Set(completionSource.snakeSetup?.poolPlayerIds ?? freshPool.players.map((player) => player.id));
      const mlbExpectedRanks = rankExpectedTalentByIv(
        freshPool.players.filter((player) => activeMlbIds.has(player.id)),
      );
      const frozen = freezeSnakeDraftSession({
        session: completionSource,
        expectedPhase: 'MLB',
        poolPlayerIds: completionSource.snakeSetup?.poolPlayerIds ?? freshPool.players.map((player) => player.id),
        salaryByPlayerId: new Map(freshPool.players.map((player) => [player.id, player.iv])),
        frozenAt: freshSession.draftManifest?.frozenAt
          ?? (Number.isFinite(Date.parse(completionSource.lastModified))
            ? completionSource.lastModified
            : new Date().toISOString()),
        moraleSnapshot: buildSnakeDraftMoraleSnapshot({
          freeze: mlbFreeze,
          expectedTalentRankByPlayerId: mlbExpectedRanks,
          includeFan: true,
        }),
      });
      const boundedFrozen = practiceMode ? frozen : mergeLivePublicSession(freshSession, frozen);
      const finalized = await finalizeCompletedSnakeSessionToLeagueRosters({
        leagueId: league.id,
        session: freshSession.draftManifest ? freshSession : boundedFrozen,
        pool: freshPool,
        expectedRevision: freshSession.revision ?? 0,
        committedAt: new Date().toISOString(),
      });
      setSession(finalized.session);
      await assertSnakeRosterHandoffReady(finalized.session, 'MLB');
      const manifest = readSnakeDraftTruth(finalized.session, 'MLB').manifest!;
      const activeLiveRoom = liveHostRef.current.room;
      if (!practiceMode && activeLiveRoom && activeLiveRoom.status !== 'closed') {
        await liveHostRef.current.closeRoom(
          `handoff:${activeLiveRoom.id}:${activeLiveRoom.publicRevision}:${manifest.source.sessionId}`,
        ).catch(() => undefined);
      }
      navigate(scoutHireRouteForLeague(league));
    } catch (cause) {
      console.error('MLB snake draft finalization failed.', cause);
      setRecapError(MLB_RECAP_CONFIRMATION_ERROR);
    } finally {
      recapCommitInFlight.current = false;
      setCommittingRecap(false);
    }
  }, [getMlbDraftSession, getRegisteredPool, league, navigate, pool, practiceMode, session, sessionSeasonNumber]);

  const setPaused = useCallback(async (paused: boolean) => {
    if (!session) return;
    if (practiceMode) {
      await persist({ ...session, paused, revision: (session.revision ?? 0) + 1 });
      return;
    }
    const publish = async (retry: boolean): Promise<void> => {
      let host = liveHostRef.current;
      if (!host.liveRoomReady || !host.room || !host.publicSession) {
        throw new Error('THE LIVE ROOM IS NOT READY.');
      }
      if (retry) {
        await host.refresh();
        await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
        host = liveHostRef.current;
        if (!host.room || !host.publicSession) throw new Error('THE LIVE ROOM IS NOT READY.');
      }
      const source = mergeLivePublicSession(session, host.publicSession);
      if (source.paused === paused) {
        await mirrorLiveSessionLocally(source);
        return;
      }
      const next = {
        ...source,
        paused,
        openTradeOffers: [],
        revision: (source.revision ?? 0) + 1,
      };
      try {
        await host.publishSession({
          session: snakeLivePublicActionSession(next),
          expectedRoomRevision: host.room.publicRevision,
          idempotencyKey: `pause:${next.id}:${host.room.publicRevision}:${paused ? 'on' : 'off'}`,
          eventKind: 'PAUSE_CHANGED',
          publicEvent: { paused },
        });
      } catch (cause) {
        if (!retry && cause instanceof SnakeLiveTransportError && cause.code === 'stale-revision') {
          return publish(true);
        }
        throw cause;
      }
      await mirrorLiveSessionLocally(next);
    };
    try {
      await publish(false);
    } catch (cause) {
      setWriteNotice(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    }
  }, [mirrorLiveSessionLocally, persist, practiceMode, session]);

  useEffect(() => {
    if (!activePlanBroken || !session || session.paused || !currentSlot) return;
    const key = `${session.id}:${session.revision ?? 0}:${currentSlot.pick}`;
    if (planBrokenPauseRef.current === key) return;
    planBrokenPauseRef.current = key;
    setWriteNotice('PLAN BROKEN — NO PICK LEAVES A LEGAL, AFFORDABLE 22. THE ROOM IS PAUSED.');
    void setPaused(true).catch((cause) => {
      planBrokenPauseRef.current = null;
      setWriteNotice(cause instanceof Error ? cause.message : String(cause));
    });
  }, [activePlanBroken, currentSlot, session, setPaused]);

  const correctLatest = useCallback(async () => {
    if (!session) return;
    if (practiceMode) {
      if (!session.correctionSnapshots?.[0]) return;
      await persist(restoreLatestSnakeCorrection(session));
      return;
    }
    if (!liveHostRef.current.room?.correctionAvailable) return;
    const clickedRoom = liveHostRef.current.room;
    const idempotencyKey = `correct:${clickedRoom.id}:${clickedRoom.publicRevision}`;
    const publish = async (retry: boolean): Promise<{
      correctedTradeId: string | null;
      livePickMoved: boolean;
    }> => {
      let host = liveHostRef.current;
      if (!host.liveRoomReady || !host.room || !host.publicSession) {
        throw new Error('THE LIVE ROOM IS NOT READY.');
      }
      if (retry) {
        await host.refresh();
        await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
        host = liveHostRef.current;
        if (!host.room || !host.publicSession) throw new Error('THE LIVE ROOM IS NOT READY.');
      }
      const source = mergeLivePublicSession(session, host.publicSession);
      const liveOwnerBefore = source.pickOrder[source.currentPickIndex]?.teamId ?? null;
      let restoredRoom;
      try {
        restoredRoom = await host.restorePreviousPublicState({
          expectedRoomRevision: host.room.publicRevision,
          idempotencyKey,
        });
      } catch (cause) {
        if (!retry && cause instanceof SnakeLiveTransportError && cause.code === 'stale-revision') {
          return publish(true);
        }
        throw cause;
      }
      const restored = readSnakeLivePublicSession(restoredRoom);
      const correctedTradeId = (source.trades?.length ?? 0) > (restored.trades?.length ?? 0)
        ? source.trades?.at(-1)?.id ?? null
        : null;
      const liveOwnerAfter = restored.pickOrder[restored.currentPickIndex]?.teamId ?? null;
      await mirrorLiveSessionLocally({
        ...mergeLivePublicSession(session, restored),
        correctionSnapshots: [],
      }, { acceptLowerRevision: true });
      return { correctedTradeId, livePickMoved: liveOwnerBefore !== liveOwnerAfter };
    };
    const result = await publish(false);
    if (result.correctedTradeId) {
      setTradeReceiptsBySeat((current) => Object.fromEntries(Object.entries(current).map(([teamId, entries]) => [
        teamId,
        entries.filter((entry) => !entry.key.startsWith(`trade:${result.correctedTradeId}:`)),
      ])));
    }
    if (result.livePickMoved) setLivePickMoveRevision((revision) => revision + 1);
  }, [mirrorLiveSessionLocally, persist, practiceMode, session]);

  const askTradeGuide = useCallback((buyerTeamId: string, targetPick: number) => {
    if (!session || !seatingProofInput) {
      return { message: `No legal guide trade reaches pick ${targetPick}.`, proposal: null, nextPickMoves: [] };
    }
    return guideForAskedPick({ session, pickValueChart, seatingProofInput, buyerTeamId, targetPick });
  }, [pickValueChart, seatingProofInput, session]);

  const postTradeOffer = useCallback(async (proposal: Parameters<typeof executeAskedPickTrade>[0]['proposal']) => {
    if (!session) return;
    if (practiceMode) {
      await persist(postSnakeTradeOffer({ session, phase: 'MLB', proposal, postedAt: new Date().toISOString() }));
      return;
    }
    const submit = async (retry: boolean): Promise<void> => {
      let host = liveHostRef.current;
      if (!host.liveRoomReady || !host.room || !host.publicSession) throw new Error('THE LIVE ROOM IS NOT READY.');
      if (retry) {
        await host.refresh();
        await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
        host = liveHostRef.current;
        if (!host.room || !host.publicSession) throw new Error('THE LIVE ROOM IS NOT READY.');
      }
      const source = snakeLivePublicActionSession(mergeLivePublicSession(session, host.publicSession));
      const staged = postSnakeTradeOffer({
        session: { ...source, openTradeOffers: [] },
        phase: 'MLB',
        proposal: { ...proposal, sessionRevision: source.revision ?? 0 },
        postedAt: new Date().toISOString(),
      });
      const offer = staged.openTradeOffers?.[0];
      if (!offer) throw new Error('THE PICK OFFER COULD NOT BE BUILT.');
      try {
        await host.submitTradeIntent({
          teamId: offer.buyerTeamId,
          expectedRoomRevision: host.room.publicRevision,
          idempotencyKey: `trade:post:${host.room.id}:${host.room.publicRevision}:${offer.id}`,
          payload: buildSnakeLiveTradePostPayload(offer),
        });
      } catch (cause) {
        if (!retry && cause instanceof SnakeLiveTransportError && cause.code === 'stale-revision') return submit(true);
        throw cause;
      }
    };
    await submit(false);
  }, [persist, practiceMode, session]);

  const nodTradeOffer = useCallback(async (offerId: string, teamId: string) => {
    if (!session) return;
    if (practiceMode) {
      await persist(nodSnakeTradeOffer(session, offerId, teamId));
      return;
    }
    const submit = async (retry: boolean): Promise<void> => {
      let host = liveHostRef.current;
      if (!host.liveRoomReady || !host.room) throw new Error('THE LIVE ROOM IS NOT READY.');
      if (retry) {
        await host.refresh();
        await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
        host = liveHostRef.current;
        if (!host.room) throw new Error('THE LIVE ROOM IS NOT READY.');
      }
      const offer = projectSnakeLiveTradeOffers(host.intents, host.room.publicRevision)
        .openOffers.find((row) => row.id === offerId);
      if (!offer) throw new Error('THAT OFFER IS NO LONGER OPEN.');
      try {
        await host.submitTradeIntent({
          teamId,
          expectedRoomRevision: host.room.publicRevision,
          idempotencyKey: `trade:nod:${host.room.id}:${host.room.publicRevision}:${offer.id}:${teamId}`,
          payload: buildSnakeLiveTradeActionPayload('NOD', offer),
        });
      } catch (cause) {
        if (!retry && cause instanceof SnakeLiveTransportError && cause.code === 'stale-revision') return submit(true);
        throw cause;
      }
    };
    await submit(false);
  }, [persist, practiceMode, session]);

  const closeTradeOffer = useCallback(async (offerId: string, action: 'WITHDRAWN' | 'DECLINED') => {
    if (!session) return;
    if (practiceMode) {
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
      return;
    }
    const submit = async (retry: boolean): Promise<void> => {
      let host = liveHostRef.current;
      if (!host.liveRoomReady || !host.room) throw new Error('THE LIVE ROOM IS NOT READY.');
      if (retry) {
        await host.refresh();
        await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
        host = liveHostRef.current;
        if (!host.room) throw new Error('THE LIVE ROOM IS NOT READY.');
      }
      const offer = projectSnakeLiveTradeOffers(host.intents, host.room.publicRevision)
        .openOffers.find((row) => row.id === offerId);
      if (!offer) throw new Error('THAT OFFER IS NO LONGER OPEN.');
      const intentAction = action === 'WITHDRAWN' ? 'WITHDRAW' : 'DECLINE';
      const teamId = intentAction === 'WITHDRAW' ? offer.buyerTeamId : offer.sellerTeamId;
      try {
        await host.submitTradeIntent({
          teamId,
          expectedRoomRevision: host.room.publicRevision,
          idempotencyKey: `trade:${intentAction.toLowerCase()}:${host.room.id}:${host.room.publicRevision}:${offer.id}:${teamId}`,
          payload: buildSnakeLiveTradeActionPayload(intentAction, offer),
        });
      } catch (cause) {
        if (!retry && cause instanceof SnakeLiveTransportError && cause.code === 'stale-revision') return submit(true);
        throw cause;
      }
    };
    await submit(false);
  }, [persist, practiceMode, session]);

  const executeTrade = useCallback(async (offer: SnakeOpenTradeOffer): Promise<ExecutedAskedPickTrade> => {
    if (!session || !seatingProofInput) {
      return { valid: false, message: 'The draft moved on — refresh.', session: null, livePickMoved: false, receipts: [] };
    }
    const applyReceipts = (result: ExecutedAskedPickTrade, saved: LeagueBuilderMlbDraftSession) => {
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
    };
    const executeAgainst = (source: LeagueBuilderMlbDraftSession, currentOffer: SnakeOpenTradeOffer) => {
      const proposal = proposalFromOpenSnakeOffer({ ...source, openTradeOffers: [currentOffer] }, currentOffer);
      const result = executeAskedPickTrade({
        session: { ...source, openTradeOffers: [currentOffer] },
        pickValueChart,
        seatingProofInput,
        proposal,
      });
      if (!result.valid || !result.session) return { result, logged: null };
      let logged: LeagueBuilderMlbDraftSession = { ...result.session, openTradeOffers: [] };
      for (const receipt of result.receipts) {
        logged = appendSnakeRoomLog({
          session: logged,
          teamId: receipt.teamId,
          entry: { id: `${currentOffer.id}:executed:${receipt.teamId}`, kind: 'TRADE', text: receipt.text, createdAt: new Date().toISOString(), actionable: true },
        });
      }
      return { result, logged };
    };
    if (practiceMode) {
      const applied = executeAgainst(session, offer);
      if (!applied.logged) return applied.result;
      const saved = await persist(applied.logged);
      applyReceipts(applied.result, saved);
      return { ...applied.result, session: saved };
    }
    const publish = async (retry: boolean): Promise<ExecutedAskedPickTrade> => {
      let host = liveHostRef.current;
      if (!host.liveRoomReady || !host.room || !host.publicSession) {
        return { valid: false, message: 'THE LIVE ROOM IS NOT READY.', session: null, livePickMoved: false, receipts: [] };
      }
      if (retry) {
        await host.refresh();
        await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
        host = liveHostRef.current;
        if (!host.room || !host.publicSession) {
          return { valid: false, message: 'THE LIVE ROOM IS NOT READY.', session: null, livePickMoved: false, receipts: [] };
        }
      }
      const projection = projectSnakeLiveTradeOffers(host.intents, host.room.publicRevision);
      const currentOffer = projection.executableOffers.find((row) => row.id === offer.id);
      if (!currentOffer) {
        return { valid: false, message: 'BOTH CLUBS MUST NOD BEFORE THE COMMISSIONER CAN EXECUTE.', session: null, livePickMoved: false, receipts: [] };
      }
      const source = snakeLivePublicActionSession(mergeLivePublicSession(session, host.publicSession));
      const applied = executeAgainst(source, currentOffer);
      if (!applied.logged) return applied.result;
      try {
        await host.publishSession({
          session: snakeLivePublicActionSession(applied.logged),
          expectedRoomRevision: host.room.publicRevision,
          idempotencyKey: `trade:execute:${host.room.id}:${host.room.publicRevision}:${currentOffer.id}`,
          eventKind: 'TRADE_EXECUTED',
          publicEvent: {
            offerId: currentOffer.id,
            buyerTeamId: currentOffer.buyerTeamId,
            sellerTeamId: currentOffer.sellerTeamId,
            targetPick: currentOffer.targetPick,
          },
        });
      } catch (cause) {
        if (!retry && cause instanceof SnakeLiveTransportError && cause.code === 'stale-revision') return publish(true);
        throw cause;
      }
      const saved = await mirrorLiveSessionLocally({
        ...mergeLivePublicSession(session, applied.logged),
        correctionSnapshots: applied.logged.correctionSnapshots,
        roomLogByTeamId: {
          ...session.roomLogByTeamId,
          ...applied.logged.roomLogByTeamId,
        },
      });
      applyReceipts(applied.result, saved);
      const related = host.intents.filter((intent) => intent.kind === 'trade'
        && intent.expectedRoomRevision === host.room!.publicRevision
        && intent.payload.offerId === currentOffer.id
        && intent.status === 'pending');
      await Promise.all(related.map((intent) => host.resolveIntent(
        intent,
        'accepted',
        `trade-accepted:${currentOffer.id}:${intent.id}`,
      ).catch(() => undefined)));
      return { ...applied.result, session: saved };
    };
    try {
      return await publish(false);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setWriteNotice(message);
      return { valid: false, message: 'THE TRADE WAS NOT SAVED. TRY AGAIN.', session: null, livePickMoved: false, receipts: [] };
    }
  }, [mirrorLiveSessionLocally, persist, pickValueChart, practiceMode, seatingProofInput, session]);

  const liveRoomRecoveryPanel = !practiceMode ? <LiveRoomRecoveryPanel
    roomCode={recoveryRoomCode}
    working={recoveryWorking}
    error={recoveryError}
    onRoomCodeChange={setRecoveryRoomCode}
    onRestore={() => void recoverOpenLiveRoom()}
  /> : null;

  if (!isSnakeRoomEnabled()) return <main className="ballpark-page"><div className="ballpark-panel"><h1 className="ballpark-title">SNAKE DRAFT</h1><p className="mt-4">THE ROOM IS NOT ENABLED FOR THIS BUILD.</p></div></main>;
  if (isLoading || !loadDone) return <main className="ballpark-page"><p>OPENING THE ROOM…</p></main>;
  if (error || actionError) return <main className="ballpark-page"><div className="ballpark-panel"><h1 className="ballpark-title">THE ROOM COULD NOT OPEN</h1><p className="mt-4 uppercase">{actionError ?? error}</p>{liveRoomRecoveryPanel}<div className="mt-5 flex flex-wrap gap-3"><button className="ballpark-press-button ballpark-press-lg ballpark-press-default min-h-11" onClick={() => navigate('/')}>HOME / SIGN IN</button><button className="ballpark-press-button ballpark-press-lg ballpark-press-gold min-h-11" onClick={() => void loadSession()}>RETRY</button></div></div></main>;
  if (!league || !pool || !session) return <main className="ballpark-page"><div className="ballpark-panel"><h1 className="ballpark-title">THE ROOM IS NOT READY</h1><p className="mt-4">{snakeRoomMissingLegCopy({ league: Boolean(league), pool: Boolean(pool), session: Boolean(session) })}</p>{liveRoomRecoveryPanel}<div className="mt-5 flex flex-wrap gap-3"><button className="ballpark-press-button ballpark-press-lg ballpark-press-default min-h-11" onClick={() => navigate('/')}>HOME / SIGN IN</button><button className="ballpark-press-button ballpark-press-lg ballpark-press-gold min-h-11" onClick={() => void loadSession()}>RETRY</button></div></div></main>;

  const mlbRecapPicks = session.draftManifest
    ? readSnakeDraftTruth(session, 'MLB').completedPicks
    : session.completedPicks;
  if (recapOpen) return <SnakeDraftRecap
    phase="MLB"
    roomCode={session.snakeCompanions?.roomCode ?? session.liveRoomRecovery?.roomCode}
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
      canDraftFromActiveSeat={Boolean(!deskHasApprovedCompanion && deskTeam && draftingTeam && deskTeam.id === draftingTeam.id)}
      candidate={deskHasApprovedCompanion ? null : candidate}
      candidateProfile={!deskHasApprovedCompanion && candidateId ? playerById.get(candidateId) ?? null : null}
      selectedPlayerCard={!deskHasApprovedCompanion && deskState?.selectedCandidate && deskTeam && candidateId && playerById.get(candidateId) ? ((draftAction) => (
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
          zeroInterest={deskState.board?.rankings.zeroInterestPlayerIds?.includes(candidateId) ?? false}
          onSetZeroInterest={(zeroInterest) => { void setSelectedZeroInterest(zeroInterest); }}
          decision={draftDecision}
          onTradeDecision={prefillTradeDecision}
          actionConsequence={candidate?.consequence}
          blockReason={candidate?.blockReason}
          draftAction={draftAction}
        />
      )) : !deskHasApprovedCompanion && candidate && deskTeam ? ((draftAction) => (
        <section className="mb-3 border-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] p-3" data-testid="selected-player-card">
          <p className="text-[10px] font-black tracking-[0.16em] text-[var(--ballpark-brass)]">SELECTED PLAYER</p>
          <h2 className="text-xl font-black uppercase">{candidate.name}</h2>
          <p className="text-xs font-bold">{candidate.position}</p>
          <div className="mt-3">{draftAction}</div>
        </section>
      )) : undefined}
      selectedFitLabel={!deskHasApprovedCompanion && deskState?.selectedCandidate
        ? `FIT · ${selectedConsequence?.status === 'ready'
          ? selectedConsequence.after.fitWord
          : deskState.selectedCandidate.fitWord}`
        : null}
      draftActionLabel="DRAFT PLAYER"
      paused={Boolean(session.paused)}
      soundsEnabled={soundsEnabled}
      correctionAvailable={practiceMode
        ? Boolean(session.correctionSnapshots?.[0])
        : Boolean(liveHost.room?.correctionAvailable)}
      tradeRevision={session.trades?.length ?? 0}
      livePickMoveRevision={livePickMoveRevision}
      hotseatNextName={deskHasApprovedCompanion
        ? null
        : hotseatPassName(session, draftingTeam) ?? draftingTeam?.name ?? null}
      practiceMode={practiceMode}
      practiceFastForward={practiceFastForward}
      privateSnipeKey={privateSnipeKey}
      dangerKey={candidate?.blockReason ? `${candidate.id}:${candidate.blockReason}` : null}
      privateDesk={!deskHasApprovedCompanion && deskState?.board ? ((showHelp) => (<>
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
          assistantTaxCoreRows={assistantTaxCoreRows}
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
          draftLog={session.completedPicks.map((pick) => {
            const pickedPlayer = playerById.get(pick.playerId);
            return {
              pick: pick.pick,
              teamName: leagueTeams.find((team) => team.id === pick.teamId)?.name ?? UNKNOWN_TEAM,
              playerId: pick.playerId,
              playerName: pickedPlayer ? fullName(pickedPlayer.firstName, pickedPlayer.lastName).toUpperCase() : UNKNOWN_PLAYER,
              position: pickedPlayer?.primaryPosition ?? '—',
            };
          })}
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
            openOffers={liveTradeProjection.openOffers.filter((offer) => offer.phase === 'MLB' && (offer.buyerTeamId === deskTeam?.id || offer.sellerTeamId === deskTeam?.id))}
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
        openOffers={liveTradeProjection.openOffers.filter((offer) => offer.phase === 'MLB')}
        onAsk={askTradeGuide}
        onPost={postTradeOffer}
        onNod={nodTradeOffer}
        onClose={closeTradeOffer}
        onExecute={executeTrade}
        onFailure={refreshRoomTruth}
      />}
      roomHelpNotes={!deskHasApprovedCompanion && candidate ? ['THIS PLAYER IS SELECTED FROM YOUR PRIVATE DRAFT DESK.'] : []}
      writeNotice={localMirrorWarning ?? writeNotice ?? syncError}
      onReloadRoom={async () => { setLocalMirrorWarning(null); setWriteNotice(null); setSyncError(null); await refreshRoomTruth(); }}
      onDismissWriteNotice={() => { setLocalMirrorWarning(null); setWriteNotice(null); setSyncError(null); }}
      companionApproval={practiceMode ? undefined : <CompanionApprovalCard
        roomCode={session.snakeCompanions?.roomCode ?? ''}
        teams={leagueTeams.map((team) => ({ id: team.id, name: team.name }))}
        claims={liveHost.claims}
        intents={liveHost.intents}
        ready={liveHost.liveRoomReady}
        working={liveHost.working}
        liveError={liveHost.error}
        playerName={(playerId) => {
          const player = playerById.get(playerId);
          return player ? fullName(player.firstName, player.lastName) : 'UNKNOWN PLAYER';
        }}
        onResolveClaim={async (claim, status) => {
          if (status === 'approved') {
            const board = session.seatBoards?.[claim.teamId];
            if (!board) throw new Error('THE TEAM BOARD IS NOT READY.');
            const designSlots = localLeagueTeams.find((team) => team.id === claim.teamId)?.rosterDesign?.slots;
            await liveHost.seedBoard({
              teamId: claim.teamId,
              board: snakeLiveJson({
                ...board,
                ...(designSlots ? { designSlots } : {}),
              }),
            });
          }
          await liveHost.resolveClaim(
            claim,
            status,
            `claim:${claim.id}:${claim.revision}:${status}`,
          );
        }}
        onApprovePick={(intent, request) => recordPick(request.playerId, request, intent)}
        onRejectPick={async (intent) => {
          await liveHost.resolveIntent(intent, 'rejected', `pick-rejected:${intent.id}`);
        }}
      />}
      pendingCompanionCount={practiceMode ? 0 : liveHost.claims.filter((claim) => claim.status === 'pending').length}
      pendingPickRequestCount={practiceMode || !liveHost.room
        ? 0
        : pendingSnakeLivePickIntentCount(liveHost.intents, liveHost.room.publicRevision)}
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
