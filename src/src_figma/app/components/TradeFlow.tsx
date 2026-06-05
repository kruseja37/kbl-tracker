import { useState, useMemo, useCallback, useEffect } from "react";
import { X, ChevronDown, ArrowRight, Trophy, Users, Clock, TrendingUp, TrendingDown, AlertCircle, CheckCircle, XCircle, RefreshCw, History, FileText, type LucideIcon } from "lucide-react";
import { useOffseasonData, type OffseasonPlayer, type OffseasonTeam } from "@/hooks/useOffseasonData";
import { useOffseasonState, type Trade as StoredTrade } from "../../hooks/useOffseasonState";
import {
  FRANCHISE_TRADE_CALCULATION_VERSION,
  executeManualFranchiseTrade,
  runFranchiseTradeDryRun,
  type FranchiseTradeAdapterData,
} from "../../../utils/franchiseTradeAdapter";
import {
  callUpFranchisePlayer,
  sendDownFranchisePlayer,
  type FranchiseRosterMovementResult,
} from "../../../utils/franchiseRosterMovement";
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
  type Player as FranchisePlayer,
  type Team as FranchiseTeam,
} from "../../../utils/franchisePlayerStorage";
import {
  getFranchiseFarmRecordsForSeason,
  type FranchiseFarmRecord,
} from "../../../utils/franchiseFarmStorage";
import {
  getTransactionsByFranchiseSeason,
  type Mode2V1TransactionType,
  type TransactionLogEntry,
} from "../../../utils/transactionStorage";
import type { FranchiseOffseasonAdapterIssue } from "../../../utils/franchiseOffseasonAdapters";

type TradeMode = "two-way" | "three-way";
type Screen = 
  | "trade-builder"
  | "beat-reporter-warnings"
  | "trade-confirmation"
  | "ai-response"
  | "ai-proposals-inbox"
  | "ai-proposal-detail"
  | "waiver-wire-claim"
  | "waiver-results"
  | "trade-history";

type AIResponseType = "accepted" | "rejected" | "counter";

interface Player {
  id: string;
  name: string;
  position: string;
  overall: number;
  salary: number;
  age: number;
  lastSeasonStats?: string;
  war?: number;
  isFarm?: boolean;
  isDraftee?: boolean;
}

interface Team {
  id: string;
  name: string;
  players: Player[];
  payroll: number;
  isUserTeam?: boolean;
}

interface Trade {
  team1Id: string;
  team1Players: Player[];
  team2Id: string;
  team2Players: Player[];
  team3Id?: string;
  team3Players?: Player[];
  salaryImpact: {
    team1: number;
    team2: number;
    team3?: number;
  };
}

interface BeatReporterWarning {
  id: string;
  message: string;
  author: string;
  title: string;
}

interface AIProposal {
  id: string;
  fromTeam: Team;
  offering: Player[];
  wanting: Player[];
  salaryImpact: number;
  beatReporterNote?: string;
  isNew?: boolean;
}

interface WaiverPlayer {
  player: Player;
  releasedBy: string;
  claimOrder: Array<{
    teamName: string;
    status: "claimed" | "passed" | "waiting" | "deciding";
  }>;
}

// Grade to overall conversion
function gradeToOverall(grade: string): number {
  const gradeMap: Record<string, number> = {
    'S': 99, 'A+': 95, 'A': 90, 'A-': 87,
    'B+': 84, 'B': 80, 'B-': 77,
    'C+': 74, 'C': 70, 'C-': 67,
    'D+': 64, 'D': 60,
  };
  return gradeMap[grade] || 75;
}

/**
 * Convert OffseasonPlayer to local Player format
 */
function convertToLocalPlayer(player: OffseasonPlayer): Player {
  return {
    id: player.id,
    name: player.name,
    position: player.position,
    overall: gradeToOverall(player.grade),
    salary: player.salary * 1000000, // Convert from millions to dollars
    age: player.age,
    war: player.war,
    lastSeasonStats: player.careerStats,
  };
}

/**
 * Convert OffseasonTeam to local Team format with players
 */
function convertToLocalTeam(team: OffseasonTeam, allPlayers: OffseasonPlayer[], index: number): Team {
  const teamPlayers = allPlayers.filter(p => p.teamId === team.id);
  const convertedPlayers = teamPlayers.map(convertToLocalPlayer);
  const payroll = convertedPlayers.reduce((sum, p) => sum + p.salary, 0);

  return {
    id: team.id,
    name: team.name,
    players: convertedPlayers,
    payroll,
    isUserTeam: index === 0, // First team is user team
  };
}

// Empty fallback — populated from IndexedDB when available
const EMPTY_TEAMS: Team[] = [];

interface TradeFlowProps {
  seasonId: string;
  seasonNumber?: number;
  franchiseId?: string;
  onComplete?: () => void;
}

type FranchiseTransactionConsoleTab = "moves" | "trade" | "history" | "preview";
type FranchiseRosterAssignmentStatus = "MLB" | "FARM" | "FREE_AGENT" | "RELEASED" | "RETIRED" | "INACTIVE" | "UNKNOWN";
type TransactionStatus = { kind: "success" | "error"; message: string } | null;

const FRANCHISE_HISTORY_TYPES = new Set<Mode2V1TransactionType>([
  "trade",
  "call_up",
  "send_down",
  "release",
  "free_agent_signing",
]);

function franchiseTeamName(team: FranchiseTeam | undefined, fallback: string): string {
  return String((team as Record<string, unknown> | undefined)?.name ?? fallback);
}

function franchisePlayerName(player: FranchisePlayer | undefined, fallback: string): string {
  const source = player as Record<string, unknown> | undefined;
  const explicit = String(source?.name ?? "").trim();
  if (explicit) return explicit;
  const composed = `${source?.firstName ?? ""} ${source?.lastName ?? ""}`.trim();
  return composed || fallback;
}

function franchisePlayerPosition(player: FranchisePlayer): string {
  return String(player.primaryPosition ?? player.secondaryPosition ?? "POS").toUpperCase();
}

function franchisePlayerRevealState(player: FranchisePlayer): "hidden" | "revealed" | undefined {
  const state = String((player as FranchisePlayer & Record<string, unknown>).ratingRevealState ?? "").toLowerCase();
  if (state === "hidden" || state === "revealed") return state;
  return undefined;
}

function franchiseVisibleScoutedGrade(player: FranchisePlayer): string | undefined {
  const carrier = player as FranchisePlayer & {
    prospectProfile?: {
      scoutedGrade?: unknown;
      potentialGrade?: unknown;
    };
    scoutedGrade?: unknown;
    potentialGrade?: unknown;
  };
  const scouted = carrier.prospectProfile?.scoutedGrade ?? carrier.scoutedGrade;
  if (typeof scouted === "string" && scouted.trim().length > 0) return scouted.trim();
  const potential = carrier.prospectProfile?.potentialGrade ?? carrier.potentialGrade;
  if (typeof potential === "string" && potential.trim().length > 0) return `Potential ${potential.trim()}`;
  return undefined;
}

function franchisePlayerGradeLabel(player: FranchisePlayer, teamId: string): string {
  const status = franchiseRosterStatus(player, teamId);
  if (status === "FARM" && franchisePlayerRevealState(player) !== "revealed") {
    const scouted = franchiseVisibleScoutedGrade(player);
    return scouted ? `Scouted ${scouted}` : "Hidden FARM grade";
  }

  return `Grade ${String((player as unknown as Record<string, unknown>).overallGrade ?? "--")}`;
}

function assignmentForTeam(player: FranchisePlayer, teamId: string) {
  return (player.leagueAssignments ?? []).find((assignment) => assignment.teamId === teamId);
}

function franchiseRosterStatus(player: FranchisePlayer, teamId: string): FranchiseRosterAssignmentStatus {
  const status = String(assignmentForTeam(player, teamId)?.rosterStatus ?? "UNKNOWN").toUpperCase();
  if (
    status === "MLB" ||
    status === "FARM" ||
    status === "FREE_AGENT" ||
    status === "RELEASED" ||
    status === "RETIRED" ||
    status === "INACTIVE"
  ) {
    return status;
  }
  return "UNKNOWN";
}

function franchisePlayersForTeam(players: FranchisePlayer[], teamId: string): FranchisePlayer[] {
  return players
    .filter((player) => ["MLB", "FARM"].includes(franchiseRosterStatus(player, teamId)))
    .sort((a, b) => franchisePlayerName(a, a.id).localeCompare(franchisePlayerName(b, b.id)));
}

function formatTransactionTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;
  return parsed.toLocaleString();
}

function transactionDataString(entry: TransactionLogEntry, key: string): string | undefined {
  const value = entry.data?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function transactionDataStrings(entry: TransactionLogEntry, key: string): string[] {
  const value = entry.data?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function formatHistoryType(type: TransactionLogEntry["type"]): string {
  return String(type).replaceAll("_", " ").toUpperCase();
}

function describeHistoryPlayers(entry: TransactionLogEntry): string {
  if (entry.type === "trade") {
    const sourcePlayers = Array.isArray(entry.data.sourcePlayers) ? entry.data.sourcePlayers : [];
    const targetPlayers = Array.isArray(entry.data.targetPlayers) ? entry.data.targetPlayers : [];
    const describeSide = (players: unknown[]) =>
      players
        .map((item) => {
          const row = item as Record<string, unknown>;
          const id = String(row.playerId ?? "");
          const name = String(row.playerName ?? id);
          const status = String(row.rosterStatus ?? "UNKNOWN");
          return `${name} (${id}, ${status})`;
        })
        .filter(Boolean)
        .join(", ");
    const source = describeSide(sourcePlayers);
    const target = describeSide(targetPlayers);
    if (source || target) return [source, target].filter(Boolean).join(" / ");
  }

  const playerName = transactionDataString(entry, "playerName");
  const playerId = transactionDataString(entry, "playerId");
  const playerIds = transactionDataStrings(entry, "playerIds");
  if (playerName && playerId) return `${playerName} (${playerId})`;
  if (playerId) return playerId;
  return playerIds.join(", ") || "No player ids recorded";
}

function describeHistoryTeams(entry: TransactionLogEntry): string {
  const sourceTeamId = transactionDataString(entry, "sourceTeamId") ?? transactionDataString(entry, "oldTeam");
  const targetTeamId = transactionDataString(entry, "targetTeamId") ?? transactionDataString(entry, "newTeam");
  if (sourceTeamId || targetTeamId) return `${sourceTeamId ?? "UNKNOWN"} -> ${targetTeamId ?? "UNKNOWN"}`;
  return transactionDataString(entry, "teamId") ?? "UNKNOWN";
}

function describeHistoryStatuses(entry: TransactionLogEntry): string {
  if (entry.type === "trade") {
    const movedFarm = transactionDataStrings(entry, "movedFarmPlayerIds");
    return movedFarm.length > 0 ? `Mixed MLB/FARM trade; farm moved: ${movedFarm.join(", ")}` : "MLB/FARM statuses preserved per player";
  }

  const source = transactionDataString(entry, "sourceRosterStatus");
  const target = transactionDataString(entry, "targetRosterStatus");
  if (source || target) return `${source ?? "UNKNOWN"} -> ${target ?? "UNKNOWN"}`;
  return "Status not recorded";
}

function FranchiseTransactionConsole({
  seasonId,
  seasonNumber,
  franchiseId,
  onComplete,
}: {
  seasonId: string;
  seasonNumber: number;
  franchiseId: string;
  onComplete?: () => void;
}) {
  const [activeConsoleTab, setActiveConsoleTab] = useState<FranchiseTransactionConsoleTab>("moves");
  const [teams, setTeams] = useState<FranchiseTeam[]>([]);
  const [players, setPlayers] = useState<FranchisePlayer[]>([]);
  const [farmRecords, setFarmRecords] = useState<FranchiseFarmRecord[]>([]);
  const [history, setHistory] = useState<TransactionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rosterTeamId, setRosterTeamId] = useState("");
  const [callUpPlayerId, setCallUpPlayerId] = useState("");
  const [sendDownPlayerId, setSendDownPlayerId] = useState("");
  const [sourceTeamId, setSourceTeamId] = useState("");
  const [targetTeamId, setTargetTeamId] = useState("");
  const [sourcePlayerIds, setSourcePlayerIds] = useState<Set<string>>(new Set());
  const [targetPlayerIds, setTargetPlayerIds] = useState<Set<string>>(new Set());
  const [rosterStatusMessage, setRosterStatusMessage] = useState<TransactionStatus>(null);
  const [tradeStatusMessage, setTradeStatusMessage] = useState<TransactionStatus>(null);
  const [movementLoading, setMovementLoading] = useState(false);
  const [tradeLoading, setTradeLoading] = useState(false);

  const refreshConsoleData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [loadedTeams, loadedPlayers, loadedFarmRecords, loadedTransactions] = await Promise.all([
        getAllFranchiseTeams(franchiseId),
        getAllFranchisePlayers(franchiseId),
        getFranchiseFarmRecordsForSeason(franchiseId, seasonId),
        getTransactionsByFranchiseSeason(franchiseId, seasonId),
      ]);

      const scopedHistory = loadedTransactions
        .filter((entry) =>
          entry.franchiseId === franchiseId &&
          entry.seasonId === seasonId &&
          (entry.statsScopeId ?? seasonId) === seasonId &&
          FRANCHISE_HISTORY_TYPES.has(entry.type as Mode2V1TransactionType) &&
          !entry.undone,
        )
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      setTeams(loadedTeams);
      setPlayers(loadedPlayers);
      setFarmRecords(loadedFarmRecords);
      setHistory(scopedHistory);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [franchiseId, seasonId]);

  useEffect(() => {
    void refreshConsoleData();
  }, [refreshConsoleData]);

  useEffect(() => {
    if (!rosterTeamId && teams[0]) setRosterTeamId(teams[0].id);
    if (!sourceTeamId && teams[0]) setSourceTeamId(teams[0].id);
    if (!targetTeamId && teams[1]) setTargetTeamId(teams[1].id);
  }, [rosterTeamId, sourceTeamId, targetTeamId, teams]);

  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const rosterPlayers = useMemo(() => franchisePlayersForTeam(players, rosterTeamId), [players, rosterTeamId]);
  const callUpCandidates = rosterPlayers.filter((player) => franchiseRosterStatus(player, rosterTeamId) === "FARM");
  const sendDownCandidates = rosterPlayers.filter((player) => franchiseRosterStatus(player, rosterTeamId) === "MLB");
  const sourcePlayers = useMemo(() => franchisePlayersForTeam(players, sourceTeamId), [players, sourceTeamId]);
  const targetPlayers = useMemo(() => franchisePlayersForTeam(players, targetTeamId), [players, targetTeamId]);

  useEffect(() => {
    if (callUpPlayerId && !callUpCandidates.some((player) => player.id === callUpPlayerId)) setCallUpPlayerId("");
    if (sendDownPlayerId && !sendDownCandidates.some((player) => player.id === sendDownPlayerId)) setSendDownPlayerId("");
  }, [callUpCandidates, callUpPlayerId, sendDownCandidates, sendDownPlayerId]);

  const toggleTradeSelection = (side: "source" | "target", playerId: string) => {
    const setter = side === "source" ? setSourcePlayerIds : setTargetPlayerIds;
    setter((current) => {
      const next = new Set(current);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const handleRosterMovement = async (movement: "call_up" | "send_down") => {
    const playerId = movement === "call_up" ? callUpPlayerId : sendDownPlayerId;
    const player = playersById.get(playerId);
    const assignment = player ? assignmentForTeam(player, rosterTeamId) : undefined;

    setRosterStatusMessage(null);
    if (!rosterTeamId || !playerId || !player || !assignment) {
      setRosterStatusMessage({ kind: "error", message: "Select an eligible player before executing the roster move." });
      return;
    }

    setMovementLoading(true);
    try {
      const commonInput = {
        franchiseId,
        seasonId,
        statsScopeId: seasonId,
        seasonNumber,
        teamId: rosterTeamId,
        playerId,
        leagueId: assignment.leagueId,
        actor: "USER" as const,
        rosterMovementPhase: "REGULAR_SEASON" as const,
      };
      const result: FranchiseRosterMovementResult = movement === "call_up"
        ? await callUpFranchisePlayer(commonInput)
        : await sendDownFranchisePlayer({ ...commonInput, rosterLevel: "AAA" });

      if (!result.success) {
        setRosterStatusMessage({
          kind: "error",
          message: `${result.errorCode ?? "ROSTER_MOVE_FAILED"}: ${result.errorMessage ?? "Roster move failed."}`,
        });
        return;
      }

      setRosterStatusMessage({
        kind: "success",
        message: `${movement === "call_up" ? "Call-up" : "Send-down"} logged as ${result.transactionId ?? "transaction"}.`,
      });
      setCallUpPlayerId("");
      setSendDownPlayerId("");
      await refreshConsoleData();
      onComplete?.();
    } catch (error) {
      setRosterStatusMessage({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setMovementLoading(false);
    }
  };

  const handleManualTrade = async () => {
    setTradeStatusMessage(null);
    if (!sourceTeamId || !targetTeamId || sourceTeamId === targetTeamId) {
      setTradeStatusMessage({ kind: "error", message: "Select two different teams before executing a manual trade." });
      return;
    }
    if (sourcePlayerIds.size === 0 || targetPlayerIds.size === 0) {
      setTradeStatusMessage({ kind: "error", message: "Select at least one player from each team." });
      return;
    }

    setTradeLoading(true);
    try {
      const result = await executeManualFranchiseTrade(
        {
          franchiseId,
          seasonId,
          statsScopeId: seasonId,
          seasonNumber,
          offseasonStateId: `regular-season-${seasonId}`,
          dryRun: false,
        },
        {
          transactionPhase: "REGULAR_SEASON",
          requestedTrade: {
            sourceTeamId,
            targetTeamId,
            outgoingPlayerIds: Array.from(sourcePlayerIds),
            incomingPlayerIds: Array.from(targetPlayerIds),
          },
        },
      );

      if (!result.success) {
        setTradeStatusMessage({
          kind: "error",
          message: `${result.errorCode ?? "TRADE_FAILED"}: ${result.message ?? "Manual trade failed."}`,
        });
        return;
      }

      setTradeStatusMessage({
        kind: "success",
        message: `Manual trade logged as ${result.data?.executedTrade?.transactionId ?? "transaction"}.`,
      });
      setSourcePlayerIds(new Set());
      setTargetPlayerIds(new Set());
      await refreshConsoleData();
      onComplete?.();
    } catch (error) {
      setTradeStatusMessage({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setTradeLoading(false);
    }
  };

  const renderStatus = (status: TransactionStatus) => {
    if (!status) return null;
    return (
      <div
        role="status"
        className={`border-[3px] p-3 text-xs ${
          status.kind === "success"
            ? "bg-[#315C37] border-[#00AA55] text-[#E8E8D8]"
            : "bg-[#5A2F2F] border-[#DD0000] text-[#E8E8D8]"
        }`}
      >
        {status.message}
      </div>
    );
  };

  const renderPlayerPicker = (
    list: FranchisePlayer[],
    selectedIds: Set<string>,
    onToggle: (playerId: string) => void,
    teamId: string,
  ) => (
    <div className="space-y-2 max-h-[360px] overflow-y-auto">
      {list.length === 0 ? (
        <div className="bg-[#4A6844] border-2 border-[#E8E8D8]/20 p-3 text-[10px] text-[#E8E8D8]/60">
          No MLB/FARM players are available for this team.
        </div>
      ) : list.map((player) => {
        const selected = selectedIds.has(player.id);
        const status = franchiseRosterStatus(player, teamId);
        return (
          <button
            key={player.id}
            type="button"
            onClick={() => onToggle(player.id)}
            className={`w-full text-left p-3 border-2 transition ${
              selected
                ? "bg-[#C4A853] border-[#C4A853] text-black"
                : "bg-[#4A6844] border-[#E8E8D8]/30 text-[#E8E8D8] hover:bg-[#3D5A37]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold">{franchisePlayerName(player, player.id)}</div>
                <div className={`text-[10px] ${selected ? "text-black/70" : "text-[#E8E8D8]/70"}`}>
                  {player.id} / {franchisePlayerPosition(player)} / {status} / {franchisePlayerGradeLabel(player, teamId)}
                </div>
              </div>
              <div className="text-xs font-bold">{selected ? "SELECTED" : status}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
  const consoleTabs: Array<{ id: FranchiseTransactionConsoleTab; label: string; Icon: LucideIcon }> = [
    { id: "moves", label: "ROSTER MOVES", Icon: Users },
    { id: "trade", label: "MANUAL TRADE", Icon: ArrowRight },
    { id: "history", label: "HISTORY", Icon: History },
    { id: "preview", label: "FIT PREVIEW", Icon: FileText },
  ];

  return (
    <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-6 min-h-[520px]">
      <div className="bg-[#4A6844] border-[3px] border-[#3F5A3A] p-4 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xl text-[#E8E8D8]">Regular-Season Roster Desk</div>
            <div className="text-[10px] text-[#E8E8D8]/70 mt-1">Franchise Mode 2 v1 durable transaction surface</div>
          </div>
          <button
            type="button"
            onClick={() => void refreshConsoleData()}
            className="bg-[#5A8352] border-[2px] border-[#E8E8D8]/30 px-3 py-2 text-[10px] text-[#E8E8D8] hover:bg-[#4F7D4B]"
          >
            <RefreshCw className="w-3 h-3 inline mr-1" />
            REFRESH
          </button>
        </div>
        <div className="text-[10px] text-[#E8E8D8]/80 mt-3 leading-relaxed">
          Manual call-ups, send-downs, and explicit user-selected trades write through franchise-owned storage and canonical scoped transactions. Trade AI, suggestions, salary matching, generated players, and League Builder roster writes are not used here.
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        {consoleTabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveConsoleTab(id)}
            className={`border-[3px] px-3 py-3 text-[10px] transition ${
              activeConsoleTab === id
                ? "bg-[#4A6844] border-[#C4A853] text-[#E8E8D8]"
                : "bg-[#5A8352] border-[#4A6844] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
            }`}
          >
            <Icon className="w-4 h-4 inline mr-2" />
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4 text-xs text-[#E8E8D8]">
          Loading franchise roster transaction data...
        </div>
      )}

      {loadError && (
        <div role="alert" className="bg-[#5A2F2F] border-[3px] border-[#DD0000] p-4 text-xs text-[#E8E8D8]">
          {loadError}
        </div>
      )}

      {!loading && !loadError && activeConsoleTab === "moves" && (
        <div className="space-y-5">
          <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-4">
            <div className="text-sm text-[#E8E8D8] font-bold mb-3">TEAM</div>
            <select
              value={rosterTeamId}
              onChange={(event) => {
                setRosterTeamId(event.target.value);
                setCallUpPlayerId("");
                setSendDownPlayerId("");
                setRosterStatusMessage(null);
              }}
              className="w-full bg-[#4A6844] text-[#E8E8D8] px-4 py-3 border-2 border-[#E8E8D8]/30"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{franchiseTeamName(team, team.id)}</option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-3 mt-4 text-center">
              <div className="bg-[#4A6844] p-3">
                <div className="text-[9px] text-[#E8E8D8]/60">MLB</div>
                <div className="text-lg text-[#E8E8D8]">{sendDownCandidates.length}</div>
              </div>
              <div className="bg-[#4A6844] p-3">
                <div className="text-[9px] text-[#E8E8D8]/60">Farm Assignments</div>
                <div className="text-lg text-[#E8E8D8]">{callUpCandidates.length}</div>
              </div>
              <div className="bg-[#4A6844] p-3">
                <div className="text-[9px] text-[#E8E8D8]/60">Farm Records</div>
                <div className="text-lg text-[#E8E8D8]">{farmRecords.filter((record) => record.teamId === rosterTeamId).length}</div>
              </div>
            </div>
          </div>

          {renderStatus(rosterStatusMessage)}

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-4">
              <div className="text-sm text-[#E8E8D8] font-bold mb-3">CALL UP FROM FARM</div>
              <select
                value={callUpPlayerId}
                onChange={(event) => setCallUpPlayerId(event.target.value)}
                className="w-full bg-[#4A6844] text-[#E8E8D8] px-4 py-3 border-2 border-[#E8E8D8]/30 mb-3"
              >
                <option value="">Select FARM player</option>
                {callUpCandidates.map((player) => (
                  <option key={player.id} value={player.id}>
                    {franchisePlayerName(player, player.id)} ({player.id})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleRosterMovement("call_up")}
                disabled={movementLoading || !callUpPlayerId}
                className="w-full bg-[#C4A853] border-[3px] border-[#9A7B2C] py-3 text-sm text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CALL UP
              </button>
            </div>

            <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-4">
              <div className="text-sm text-[#E8E8D8] font-bold mb-3">SEND DOWN TO FARM</div>
              <select
                value={sendDownPlayerId}
                onChange={(event) => setSendDownPlayerId(event.target.value)}
                className="w-full bg-[#4A6844] text-[#E8E8D8] px-4 py-3 border-2 border-[#E8E8D8]/30 mb-3"
              >
                <option value="">Select MLB player</option>
                {sendDownCandidates.map((player) => (
                  <option key={player.id} value={player.id}>
                    {franchisePlayerName(player, player.id)} ({player.id})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleRosterMovement("send_down")}
                disabled={movementLoading || !sendDownPlayerId}
                className="w-full bg-[#C4A853] border-[3px] border-[#9A7B2C] py-3 text-sm text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                SEND DOWN
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !loadError && activeConsoleTab === "trade" && (
        <div className="space-y-5">
          {renderStatus(tradeStatusMessage)}
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-4">
              <div className="text-sm text-[#E8E8D8] font-bold mb-3">SOURCE TEAM SENDS</div>
              <select
                value={sourceTeamId}
                onChange={(event) => {
                  setSourceTeamId(event.target.value);
                  setSourcePlayerIds(new Set());
                  setTradeStatusMessage(null);
                }}
                className="w-full bg-[#4A6844] text-[#E8E8D8] px-4 py-3 border-2 border-[#E8E8D8]/30 mb-3"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{franchiseTeamName(team, team.id)}</option>
                ))}
              </select>
              {renderPlayerPicker(sourcePlayers, sourcePlayerIds, (playerId) => toggleTradeSelection("source", playerId), sourceTeamId)}
            </div>

            <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-4">
              <div className="text-sm text-[#E8E8D8] font-bold mb-3">TARGET TEAM SENDS</div>
              <select
                value={targetTeamId}
                onChange={(event) => {
                  setTargetTeamId(event.target.value);
                  setTargetPlayerIds(new Set());
                  setTradeStatusMessage(null);
                }}
                className="w-full bg-[#4A6844] text-[#E8E8D8] px-4 py-3 border-2 border-[#E8E8D8]/30 mb-3"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{franchiseTeamName(team, team.id)}</option>
                ))}
              </select>
              {renderPlayerPicker(targetPlayers, targetPlayerIds, (playerId) => toggleTradeSelection("target", playerId), targetTeamId)}
            </div>
          </div>

          <div className="bg-[#5A8352] border-[4px] border-[#C4A853] p-4">
            <div className="text-sm text-[#E8E8D8] font-bold mb-2">MANUAL TRADE SUMMARY</div>
            <div className="text-[10px] text-[#E8E8D8]/80 mb-3">
              {franchiseTeamName(teamsById.get(sourceTeamId), sourceTeamId)} sends {sourcePlayerIds.size} player(s); {franchiseTeamName(teamsById.get(targetTeamId), targetTeamId)} sends {targetPlayerIds.size} player(s). MLB/FARM status stays with each player.
            </div>
            <button
              type="button"
              onClick={() => void handleManualTrade()}
              disabled={tradeLoading || sourcePlayerIds.size === 0 || targetPlayerIds.size === 0}
              className="w-full bg-[#C4A853] border-[3px] border-[#9A7B2C] py-3 text-sm text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              EXECUTE MANUAL TRADE
            </button>
          </div>
        </div>
      )}

      {!loading && !loadError && activeConsoleTab === "history" && (
        <div className="bg-[#5A8352] border-[4px] border-[#4A6844]">
          <div className="bg-[#4A6844] p-3 text-sm text-[#E8E8D8] font-bold">RECENT SCOPED TRANSACTIONS</div>
          <div className="p-4 space-y-3 max-h-[560px] overflow-y-auto">
            {history.length === 0 ? (
              <div className="text-[10px] text-[#E8E8D8]/60 text-center py-6">
                No scoped roster transactions have been logged for this franchise season.
              </div>
            ) : history.map((entry) => (
              <div key={entry.id} className="bg-[#4A6844] border-2 border-[#E8E8D8]/20 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-[#E8E8D8]">{formatHistoryType(entry.type)}</div>
                    <div className="text-[9px] text-[#E8E8D8]/60">{entry.id} / {formatTransactionTimestamp(entry.timestamp)}</div>
                  </div>
                  <div className="text-[9px] text-[#FFD700]">{entry.phase}</div>
                </div>
                <div className="grid md:grid-cols-3 gap-2 mt-3 text-[10px] text-[#E8E8D8]/80">
                  <div>
                    <div className="text-[#E8E8D8]/50">Players</div>
                    <div>{describeHistoryPlayers(entry)}</div>
                  </div>
                  <div>
                    <div className="text-[#E8E8D8]/50">Teams</div>
                    <div>{describeHistoryTeams(entry)}</div>
                  </div>
                  <div>
                    <div className="text-[#E8E8D8]/50">Status</div>
                    <div>{describeHistoryStatuses(entry)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !loadError && activeConsoleTab === "preview" && (
        <FranchiseTradePreviewSurface
          franchiseId={franchiseId}
          seasonId={seasonId}
          seasonNumber={seasonNumber}
        />
      )}
    </div>
  );
}

function FranchiseTradePreviewSurface({
  seasonId,
  seasonNumber,
  franchiseId,
}: {
  seasonId: string;
  seasonNumber: number;
  franchiseId: string;
}) {
  const [previewData, setPreviewData] = useState<FranchiseTradeAdapterData | null>(null);
  const [previewIssues, setPreviewIssues] = useState<FranchiseOffseasonAdapterIssue[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);

    runFranchiseTradeDryRun(
      {
        franchiseId,
        seasonId,
        statsScopeId: seasonId,
        seasonNumber,
        offseasonStateId: `offseason-${seasonId}`,
        phase: "TRADES",
        dryRun: true,
      },
      { dryRun: true },
    )
      .then((result) => {
        if (cancelled) return;
        setPreviewData(result.data ?? null);
        setPreviewIssues(result.issues ?? []);
        if (!result.success) {
          setPreviewError(result.message || "Trade preview failed validation.");
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setPreviewData(null);
        setPreviewIssues([]);
        setPreviewError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [franchiseId, seasonId, seasonNumber]);

  const reports = previewData?.teamReports ?? [];
  const fitPreviews = previewData?.fitPreviews ?? [];
  const issueGroups = previewIssues.reduce<Record<string, FranchiseOffseasonAdapterIssue[]>>((acc, issue) => {
    const key = issue.severity ?? "info";
    acc[key] = [...(acc[key] ?? []), issue];
    return acc;
  }, {});

  return (
    <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-6 min-h-[420px]">
      <div className="space-y-5">
        <div className="bg-[#4A6844] border-[3px] border-[#3F5A3A] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xl text-[#E8E8D8]">Trade Fit Preview</div>
              <div className="text-[10px] text-[#E8E8D8]/70 mt-1">Franchise Mode 2 v1 dry-run boundary</div>
            </div>
            <div className="text-[10px] text-[#FFD700] text-right">
              {FRANCHISE_TRADE_CALCULATION_VERSION}
            </div>
          </div>
          <div className="text-[10px] text-[#E8E8D8]/80 mt-3 leading-relaxed">
            Preview only: no trades are executed, no players are moved, no teams, farm records, transactions, League Builder data, prototype trade records, or offseason state are written.
          </div>
          <div className="text-[10px] text-[#E8E8D8]/70 mt-2">
            Trade AI acceptance, chemistry, morale, injuries, salary-cap enforcement, and roster movement remain deferred.
          </div>
        </div>

        {previewLoading && (
          <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4 text-xs text-[#E8E8D8]">
            Loading franchise trade preview...
          </div>
        )}

        {previewError && (
          <div className="bg-[#5A2F2F] border-[3px] border-[#DD0000] p-4 text-xs text-[#E8E8D8]">
            {previewError}
          </div>
        )}

        {previewData && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
                <div className="text-[9px] text-[#E8E8D8]/60">Teams reviewed</div>
                <div className="text-xl text-[#E8E8D8]">{reports.length}</div>
              </div>
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
                <div className="text-[9px] text-[#E8E8D8]/60">Fit previews</div>
                <div className="text-xl text-[#E8E8D8]">{fitPreviews.length}</div>
              </div>
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
                <div className="text-[9px] text-[#E8E8D8]/60">Warnings/issues</div>
                <div className="text-xl text-[#E8E8D8]">{previewIssues.length}</div>
              </div>
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3">
                <div className="text-[9px] text-[#E8E8D8]/60">Execution</div>
                <div className="text-xs text-[#FFD700] mt-2">Unavailable</div>
              </div>
            </div>

            <div className="bg-[#5A8352] border-[3px] border-[#4A6844]">
              <div className="bg-[#4A6844] p-2 text-[10px] text-[#E8E8D8]">TEAM NEEDS / SURPLUS</div>
              <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto">
                {reports.length === 0 ? (
                  <div className="text-[10px] text-[#E8E8D8]/60 text-center py-4">
                    No franchise-owned teams were available for trade preview.
                  </div>
                ) : reports.map((report) => (
                  <div key={report.teamId} className="bg-[#4A6844] border-[2px] border-[#3F5A3A] p-3 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-[#E8E8D8]">{report.teamName}</div>
                        <div className="text-[9px] text-[#E8E8D8]/60">{report.teamId}</div>
                      </div>
                      <div className="text-[10px] text-[#FFD700] uppercase">
                        {report.riskLevel} risk / {report.trustLevel} trust
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] text-[#E8E8D8]">
                      <div>MLB: {report.mlbCount}</div>
                      <div>Farm: {report.farmCount}</div>
                      <div>Needs: {report.needs.length}</div>
                      <div>Surplus: {report.surpluses.length}</div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[9px] text-[#E8E8D8]/60 mb-1">Needs</div>
                        {report.needs.length > 0 ? report.needs.map((need) => (
                          <div key={`${report.teamId}-need-${need.role}`} className="text-[9px] text-[#E8E8D8]/80">
                            {need.role}: {need.currentCount}/{need.targetCount} ({need.severity})
                          </div>
                        )) : (
                          <div className="text-[9px] text-[#E8E8D8]/50">No needs detected.</div>
                        )}
                      </div>
                      <div>
                        <div className="text-[9px] text-[#E8E8D8]/60 mb-1">Surplus</div>
                        {report.surpluses.length > 0 ? report.surpluses.map((surplus) => (
                          <div key={`${report.teamId}-surplus-${surplus.role}`} className="text-[9px] text-[#E8E8D8]/80">
                            {surplus.role}: +{surplus.surplus}
                          </div>
                        )) : (
                          <div className="text-[9px] text-[#E8E8D8]/50">No surplus detected.</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#E8E8D8]/60 mb-1">Evidence</div>
                      <ul className="space-y-1">
                        {report.evidence.map((item) => (
                          <li key={item} className="text-[9px] text-[#E8E8D8]/80">{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#5A8352] border-[3px] border-[#4A6844]">
              <div className="bg-[#4A6844] p-2 text-[10px] text-[#E8E8D8]">NON-EXECUTABLE FIT PREVIEWS</div>
              <div className="p-4 space-y-3">
                {fitPreviews.length === 0 ? (
                  <div className="text-[10px] text-[#E8E8D8]/60 text-center py-4">
                    No trade-fit previews were generated.
                  </div>
                ) : fitPreviews.map((preview) => (
                  <div key={preview.id} className="bg-[#4A6844] border-[2px] border-[#3F5A3A] p-3">
                    <div className="text-xs text-[#E8E8D8]">
                      {preview.sourceTeamName} → {preview.targetTeamName}: {preview.role}
                    </div>
                    <div className="text-[10px] text-[#FFD700] mt-1">Non-executable advisory preview</div>
                    <div className="text-[9px] text-[#E8E8D8]/80 mt-2">
                      Source surplus: {preview.sourceSurplus} / Target gap: {preview.targetGap} / Candidates: {preview.candidatePlayerIds.length}
                    </div>
                    <ul className="space-y-1 mt-2">
                      {preview.evidence.map((item) => (
                        <li key={item} className="text-[9px] text-[#E8E8D8]/75">{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4">
              <div className="text-xs text-[#E8E8D8] mb-2">LIMITATIONS</div>
              <ul className="space-y-1">
                {previewData.limitations.map((limitation) => (
                  <li key={limitation} className="text-[10px] text-[#E8E8D8]/80">{limitation}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        {previewIssues.length > 0 && (
          <div className="bg-[#5A8352] border-[3px] border-[#DDC45A] p-4">
            <div className="text-xs text-[#E8E8D8] mb-2">WARNINGS / ISSUES</div>
            <div className="text-[9px] text-[#E8E8D8]/60 mb-2">
              Errors: {issueGroups.error?.length ?? 0} / Warnings: {issueGroups.warning?.length ?? 0}
            </div>
            <div className="space-y-2">
              {previewIssues.map((issue, index) => (
                <div key={`${issue.code}-${index}`} className="bg-[#4A6844] p-2">
                  <div className="text-[10px] text-[#FFD700]">{issue.code}</div>
                  <div className="text-[9px] text-[#E8E8D8]/80">{issue.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FranchiseTradeContextIssueSurface({
  seasonId,
  franchiseId,
  issueCode,
}: {
  seasonId: string;
  franchiseId: string;
  issueCode: "MISSING_SEASON_ID" | "MISSING_SEASON_NUMBER";
}) {
  const issueMessage = issueCode === "MISSING_SEASON_ID"
    ? "Franchise transaction workflow requires an explicit canonical seasonId. The roster desk was not started because silently using a blank season scope can write transactions to the wrong place."
    : "Franchise transaction workflow requires an explicit franchise seasonNumber. The roster desk was not started because silently defaulting to season 1 can scope data to the wrong season.";

  return (
    <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-6 min-h-[320px]">
      <div className="space-y-4">
        <div className="bg-[#4A6844] border-[3px] border-[#3F5A3A] p-4">
          <div className="text-xl text-[#E8E8D8]">Regular-Season Roster Desk</div>
          <div className="text-[10px] text-[#FFD700] mt-1">{FRANCHISE_TRADE_CALCULATION_VERSION}</div>
          <div className="text-[10px] text-[#E8E8D8]/80 mt-3">
            Blocking issue: no roster moves, trades, previews, or history reads were started.
          </div>
        </div>

        <div className="bg-[#5A2F2F] border-[3px] border-[#DD0000] p-4">
          <div className="text-xs text-[#E8E8D8] mb-2">BLOCKING ISSUE</div>
          <div className="text-[10px] text-[#FFD700]">{issueCode}</div>
          <div className="text-[10px] text-[#E8E8D8]/80 mt-1">
            {issueMessage}
          </div>
          <div className="text-[9px] text-[#E8E8D8]/60 mt-2">
            franchiseId: {franchiseId} / seasonId: {seasonId}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TradeFlow(props: TradeFlowProps) {
  if (props.franchiseId) {
    const franchiseSeasonNumber = props.seasonNumber;
    if (!props.seasonId || props.seasonId.trim().length === 0) {
      return (
        <FranchiseTradeContextIssueSurface
          franchiseId={props.franchiseId}
          seasonId={props.seasonId}
          issueCode="MISSING_SEASON_ID"
        />
      );
    }

    if (
      typeof franchiseSeasonNumber !== "number" ||
      !Number.isFinite(franchiseSeasonNumber) ||
      franchiseSeasonNumber < 1
    ) {
      return (
        <FranchiseTradeContextIssueSurface
          franchiseId={props.franchiseId}
          seasonId={props.seasonId}
          issueCode="MISSING_SEASON_NUMBER"
        />
      );
    }

    return (
      <FranchiseTransactionConsole
        franchiseId={props.franchiseId}
        seasonId={props.seasonId}
        seasonNumber={franchiseSeasonNumber}
        onComplete={props.onComplete}
      />
    );
  }

  return <ActiveTradeFlow {...props} />;
}

function ActiveTradeFlow({ seasonId, seasonNumber = 1, franchiseId, onComplete }: TradeFlowProps) {
  // Offseason state hook for persistence
  const { addNewTrade, trades: storedTrades } = useOffseasonState(seasonId, seasonNumber, { franchiseId });
  // Load real data from playerDatabase via hook
  const { teams: realTeams, players: realPlayers, hasRealData, isLoading } = useOffseasonData();

  // Convert real data to local format, with mock fallback
  const teams: Team[] = useMemo(() => {
    if (hasRealData && realTeams.length > 0 && realPlayers.length > 0) {
      return realTeams.map((team, index) => convertToLocalTeam(team, realPlayers, index));
    }
    return EMPTY_TEAMS;
  }, [realTeams, realPlayers, hasRealData]);

  const [currentScreen, setCurrentScreen] = useState<Screen>("trade-builder");
  const [tradeMode, setTradeMode] = useState<TradeMode>("two-way");

  // Trade Builder State - use first team IDs from loaded teams
  const defaultTeam1 = teams[0]?.id || "team-1";
  const defaultTeam2 = teams[1]?.id || "team-2";
  const defaultTeam3 = teams[2]?.id || "team-3";

  const [team1Id, setTeam1Id] = useState(defaultTeam1);
  const [team2Id, setTeam2Id] = useState(defaultTeam2);
  const [team3Id, setTeam3Id] = useState(defaultTeam3);
  const [selectedTeam1Players, setSelectedTeam1Players] = useState<Set<string>>(new Set());
  const [selectedTeam2Players, setSelectedTeam2Players] = useState<Set<string>>(new Set());
  const [selectedTeam3Players, setSelectedTeam3Players] = useState<Set<string>>(new Set());

  // Trade Flow State
  const [currentTrade, setCurrentTrade] = useState<Trade | null>(null);
  const [beatReporterWarnings, setBeatReporterWarnings] = useState<BeatReporterWarning[]>([]);
  const [aiResponse, setAIResponse] = useState<AIResponseType | null>(null);
  const [aiCounter, setAICounter] = useState<Trade | null>(null);

  // AI Proposals
  const [aiProposals, setAIProposals] = useState<AIProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<AIProposal | null>(null);

  // Waiver Wire
  const [waiverPlayers, setWaiverPlayers] = useState<WaiverPlayer[]>([]);
  const [selectedWaiverPlayer, setSelectedWaiverPlayer] = useState<WaiverPlayer | null>(null);
  const [playerToDrop, setPlayerToDrop] = useState<string | null>(null);

  // Trade History
  const [completedTrades, setCompletedTrades] = useState<Array<Trade & { date: string; tradeNumber: number }>>([]);

  // Helper functions that don't depend on teams data - defined before early return
  const formatSalary = useCallback((amount: number): string => {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }, []);

  const clearTrade = useCallback(() => {
    setSelectedTeam1Players(new Set());
    setSelectedTeam2Players(new Set());
    setSelectedTeam3Players(new Set());
    setCurrentTrade(null);
    setBeatReporterWarnings([]);
    setAIResponse(null);
    setAICounter(null);
  }, []);

  // Save completed trade to storage - must be defined before early return to satisfy hooks rules
  const handleTradeComplete = useCallback(async () => {
    if (!currentTrade) return;
    if (franchiseId) return;

    try {
      // Build trade data matching the Trade interface
      // team1Receives = players coming FROM team2 (what team1 gets)
      // team2Receives = players coming FROM team1 (what team2 gets)
      const team1Receives = currentTrade.team2Players.map(p => p.id);
      const team2Receives = currentTrade.team1Players.map(p => p.id);

      // Save to IndexedDB
      await addNewTrade({
        team1Id: currentTrade.team1Id,
        team2Id: currentTrade.team2Id,
        team1Receives,
        team2Receives,
        proposedBy: 'USER',
        status: 'ACCEPTED',
        executedAt: Date.now(),
      });

      // Add to local completed trades list
      setCompletedTrades(prev => [...prev, {
        ...currentTrade,
        date: new Date().toLocaleDateString(),
        tradeNumber: prev.length + 1,
      }]);

      // Clear and return to builder
      clearTrade();
      setCurrentScreen("trade-builder");
    } catch (error) {
      console.error('[TradeFlow] Failed to save trade:', error);
      // Still clear and continue even if save fails
      clearTrade();
      setCurrentScreen("trade-builder");
    }
  }, [currentTrade, addNewTrade, clearTrade, franchiseId]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-[#E8E8D8] text-xl">Loading trade data...</div>
      </div>
    );
  }

  // Mock AI proposals
  const mockAIProposals: AIProposal[] = [
    {
      id: "prop1",
      fromTeam: teams[0],
      offering: [teams[0].players[0]],
      wanting: [teams[1].players[1]],
      salaryImpact: 2700000,
      isNew: true,
      beatReporterNote: "The Tigers are desperate for pitching. Rodriguez has been unhappy with his role lately - this could be a win-win if Chen fits your rotation plans.",
    },
  ];

  const getTeam = (teamId: string): Team => {
    return teams.find(t => t.id === teamId) || teams[0];
  };

  const togglePlayerSelection = (teamNum: 1 | 2 | 3, playerId: string) => {
    const setters = {
      1: setSelectedTeam1Players,
      2: setSelectedTeam2Players,
      3: setSelectedTeam3Players,
    };
    const getters = {
      1: selectedTeam1Players,
      2: selectedTeam2Players,
      3: selectedTeam3Players,
    };
    
    const currentSet = getters[teamNum];
    const newSet = new Set(currentSet);
    
    if (newSet.has(playerId)) {
      newSet.delete(playerId);
    } else {
      newSet.add(playerId);
    }
    
    setters[teamNum](newSet);
  };

  const getSelectedPlayers = (teamId: string, selectedIds: Set<string>): Player[] => {
    const team = getTeam(teamId);
    return team.players.filter(p => selectedIds.has(p.id));
  };

  const calculateTotalSalary = (players: Player[]): number => {
    return players.reduce((sum, p) => sum + p.salary, 0);
  };

  const canProposeTrade = (): boolean => {
    if (tradeMode === "two-way") {
      return selectedTeam1Players.size > 0 && selectedTeam2Players.size > 0;
    } else {
      return selectedTeam1Players.size > 0 && selectedTeam2Players.size > 0 && selectedTeam3Players.size > 0;
    }
  };

  const handleProposeTrade = () => {
    const team1Players = getSelectedPlayers(team1Id, selectedTeam1Players);
    const team2Players = getSelectedPlayers(team2Id, selectedTeam2Players);
    
    const trade: Trade = {
      team1Id,
      team1Players,
      team2Id,
      team2Players,
      salaryImpact: {
        team1: calculateTotalSalary(team2Players) - calculateTotalSalary(team1Players),
        team2: calculateTotalSalary(team1Players) - calculateTotalSalary(team2Players),
      },
    };

    if (tradeMode === "three-way") {
      const team3Players = getSelectedPlayers(team3Id, selectedTeam3Players);
      trade.team3Id = team3Id;
      trade.team3Players = team3Players;
      trade.salaryImpact.team3 = 0; // Calculate based on three-way flow
    }

    setCurrentTrade(trade);
    
    // Generate beat reporter warnings (mock logic)
    const warnings: BeatReporterWarning[] = [];
    if (team1Players.some(p => p.overall >= 90)) {
      warnings.push({
        id: "w1",
        message: "Word is the clubhouse isn't thrilled about this deal. Rodriguez was popular in the locker room - a real leader type. The young guys looked up to him.",
        author: "Mike Thompson",
        title: "Beat Writer",
      });
    }
    if (Math.abs(trade.salaryImpact.team1) > 5000000) {
      warnings.push({
        id: "w2",
        message: "Fans might not understand trading a fan favorite for salary relief. Expect some backlash on social media.",
        author: "Sarah Chen",
        title: "Columnist",
      });
    }
    
    setBeatReporterWarnings(warnings);
    
    if (warnings.length > 0) {
      setCurrentScreen("beat-reporter-warnings");
    } else {
      setCurrentScreen("trade-confirmation");
    }
  };

  const handleConfirmTrade = () => {
    // Simulate AI decision
    const random = Math.random();
    if (random < 0.4) {
      setAIResponse("accepted");
    } else if (random < 0.7) {
      setAIResponse("rejected");
    } else {
      setAIResponse("counter");
      // Generate counter offer
      if (currentTrade) {
        setAICounter({
          ...currentTrade,
          team1Players: [...currentTrade.team1Players, teams[0].players[4]], // Add extra player
          team2Players: [...currentTrade.team2Players, teams[1].players[4]],
        });
      }
    }
    setCurrentScreen("ai-response");
  };

  return (
    <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-6">
      
      {/* Screen: Trade Builder */}
      {currentScreen === "trade-builder" && (
        <div>
          {/* Trade Mode Toggle */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => {
                setTradeMode("two-way");
                clearTrade();
              }}
              className={`flex-1 py-4 px-6 border-[4px] transition-all ${
                tradeMode === "two-way"
                  ? "bg-[#4A6844] border-[#C4A853] text-[#E8E8D8]"
                  : "bg-[#5A8352] border-[#4A6844] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
              }`}
            >
              <div className="text-sm font-bold">TWO-WAY TRADE</div>
            </button>
            <button
              onClick={() => {
                setTradeMode("three-way");
                clearTrade();
              }}
              className={`flex-1 py-4 px-6 border-[4px] transition-all ${
                tradeMode === "three-way"
                  ? "bg-[#4A6844] border-[#C4A853] text-[#E8E8D8]"
                  : "bg-[#5A8352] border-[#4A6844] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
              }`}
            >
              <div className="text-sm font-bold">THREE-WAY TRADE</div>
            </button>
          </div>

          {/* Two-Way Trade */}
          {tradeMode === "two-way" && (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Team 1 Panel */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-4">TEAM 1</div>
                  
                  <div className="mb-4">
                    <select
                      value={team1Id}
                      onChange={(e) => {
                        setTeam1Id(e.target.value);
                        setSelectedTeam1Players(new Set());
                      }}
                      className="w-full bg-[#4A6844] text-[#E8E8D8] px-4 py-3 border-2 border-[#E8E8D8]/30"
                    >
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.isUserTeam ? "⭐ " : ""}{team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto">
                    {getTeam(team1Id).players.map(player => (
                      <button
                        key={player.id}
                        onClick={() => togglePlayerSelection(1, player.id)}
                        className={`w-full text-left p-3 border-2 transition-all ${
                          selectedTeam1Players.has(player.id)
                            ? "bg-[#C4A853] border-[#C4A853]"
                            : "bg-[#4A6844] border-[#E8E8D8]/30 hover:bg-[#3D5A37]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 border-2 ${
                              selectedTeam1Players.has(player.id)
                                ? "bg-[#C4A853] border-[#C4A853]"
                                : "bg-transparent border-[#E8E8D8]/60"
                            } flex items-center justify-center`}>
                              {selectedTeam1Players.has(player.id) && (
                                <CheckCircle className="w-3 h-3 text-black" />
                              )}
                            </div>
                            <div>
                              <div className={`text-sm font-bold ${selectedTeam1Players.has(player.id) ? "text-black" : "text-[#E8E8D8]"}`}>{player.name}</div>
                              <div className={`text-xs ${selectedTeam1Players.has(player.id) ? "text-black/70" : "text-[#E8E8D8]/70"}`}>
                                {player.position} • OVR {player.overall}
                                {player.isFarm && " • 🌱 FARM"}
                                {player.isDraftee && " • 🌱 DRAFTEE"}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-bold ${selectedTeam1Players.has(player.id) ? "text-black" : "text-[#E8E8D8]"}`}>{formatSalary(player.salary)}</div>
                            {selectedTeam1Players.has(player.id) && (
                              <div className="text-xs text-black">✓</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="pt-4 border-t-2 border-[#4A6844]">
                    <div className="text-sm text-[#E8E8D8]/80">
                      TRADING: {selectedTeam1Players.size} players
                    </div>
                    <div className="text-sm text-[#E8E8D8]/80">
                      TOTAL: {formatSalary(calculateTotalSalary(getSelectedPlayers(team1Id, selectedTeam1Players)))}
                    </div>
                  </div>
                </div>

                {/* Team 2 Panel */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-4">TEAM 2</div>
                  
                  <div className="mb-4">
                    <select
                      value={team2Id}
                      onChange={(e) => {
                        setTeam2Id(e.target.value);
                        setSelectedTeam2Players(new Set());
                      }}
                      className="w-full bg-[#4A6844] text-[#E8E8D8] px-4 py-3 border-2 border-[#E8E8D8]/30"
                    >
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto">
                    {getTeam(team2Id).players.map(player => (
                      <button
                        key={player.id}
                        onClick={() => togglePlayerSelection(2, player.id)}
                        className={`w-full text-left p-3 border-2 transition-all ${
                          selectedTeam2Players.has(player.id)
                            ? "bg-[#C4A853] border-[#C4A853]"
                            : "bg-[#4A6844] border-[#E8E8D8]/30 hover:bg-[#3D5A37]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 border-2 ${
                              selectedTeam2Players.has(player.id)
                                ? "bg-[#C4A853] border-[#C4A853]"
                                : "bg-transparent border-[#E8E8D8]/60"
                            } flex items-center justify-center`}>
                              {selectedTeam2Players.has(player.id) && (
                                <CheckCircle className="w-3 h-3 text-black" />
                              )}
                            </div>
                            <div>
                              <div className={`text-sm font-bold ${selectedTeam2Players.has(player.id) ? "text-black" : "text-[#E8E8D8]"}`}>{player.name}</div>
                              <div className={`text-xs ${selectedTeam2Players.has(player.id) ? "text-black/70" : "text-[#E8E8D8]/70"}`}>
                                {player.position} • OVR {player.overall}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-bold ${selectedTeam2Players.has(player.id) ? "text-black" : "text-[#E8E8D8]"}`}>{formatSalary(player.salary)}</div>
                            {selectedTeam2Players.has(player.id) && (
                              <div className="text-xs text-[#E8E8D8]">✓</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="pt-4 border-t-2 border-[#4A6844]">
                    <div className="text-sm text-[#E8E8D8]/80">
                      TRADING: {selectedTeam2Players.size} players
                    </div>
                    <div className="text-sm text-[#E8E8D8]/80">
                      TOTAL: {formatSalary(calculateTotalSalary(getSelectedPlayers(team2Id, selectedTeam2Players)))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Trade Summary */}
              {canProposeTrade() && (
                <div className="bg-[#5A8352] border-[4px] border-[#C4A853] p-6 mb-6">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-3">TRADE SUMMARY</div>
                  <div className="text-sm text-[#E8E8D8]">
                    <div className="mb-2">
                      {getTeam(team1Id).name} send: {getSelectedPlayers(team1Id, selectedTeam1Players).map(p => `${p.name} (${p.position})`).join(", ")} → {formatSalary(calculateTotalSalary(getSelectedPlayers(team1Id, selectedTeam1Players)))}
                    </div>
                    <div className="mb-2">
                      {getTeam(team2Id).name} send: {getSelectedPlayers(team2Id, selectedTeam2Players).map(p => `${p.name} (${p.position})`).join(", ")} → {formatSalary(calculateTotalSalary(getSelectedPlayers(team2Id, selectedTeam2Players)))}
                    </div>
                    <div className="text-[#E8E8D8]/70 text-xs mt-3">
                      Net salary impact: {getTeam(team1Id).name} {formatSalary(calculateTotalSalary(getSelectedPlayers(team2Id, selectedTeam2Players)) - calculateTotalSalary(getSelectedPlayers(team1Id, selectedTeam1Players)))} | {getTeam(team2Id).name} {formatSalary(calculateTotalSalary(getSelectedPlayers(team1Id, selectedTeam1Players)) - calculateTotalSalary(getSelectedPlayers(team2Id, selectedTeam2Players)))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Three-Way Trade */}
          {tradeMode === "three-way" && (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* Team 1 */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-4">
                  <div className="text-sm text-[#E8E8D8] font-bold mb-3">TEAM 1</div>
                  <select
                    value={team1Id}
                    onChange={(e) => {
                      setTeam1Id(e.target.value);
                      setSelectedTeam1Players(new Set());
                    }}
                    className="w-full bg-[#4A6844] text-[#E8E8D8] px-3 py-2 border-2 border-[#E8E8D8]/30 mb-3 text-xs"
                  >
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.isUserTeam ? "⭐ " : ""}{team.name}
                      </option>
                    ))}
                  </select>

                  <div className="text-xs text-[#E8E8D8] mb-2 font-bold">SENDS TO TEAM 2:</div>
                  <div className="space-y-1 mb-3">
                    {getTeam(team1Id).players.map(player => (
                      <button
                        key={player.id}
                        onClick={() => togglePlayerSelection(1, player.id)}
                        className={`w-full text-left p-2 border-2 text-xs ${
                          selectedTeam1Players.has(player.id)
                            ? "bg-[#C4A853] border-[#C4A853] text-black"
                            : "bg-[#4A6844] border-[#E8E8D8]/30"
                        }`}
                      >
                        {selectedTeam1Players.has(player.id) ? "☑" : "☐"} {player.name} ({player.position}) — {formatSalary(player.salary)}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs text-[#E8E8D8] mb-2 font-bold">RECEIVES FROM T3:</div>
                  <div className="bg-[#4A6844] p-2 border-2 border-[#E8E8D8]/30 text-xs text-[#E8E8D8]/70 mb-3">
                    → (Selected from Team 3)
                  </div>

                  <div className="pt-2 border-t-2 border-[#4A6844] text-xs text-[#E8E8D8]/80">
                    <div>TRADING: {selectedTeam1Players.size} player</div>
                    <div>TOTAL: {formatSalary(calculateTotalSalary(getSelectedPlayers(team1Id, selectedTeam1Players)))}</div>
                  </div>
                </div>

                {/* Team 2 */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-4">
                  <div className="text-sm text-[#E8E8D8] font-bold mb-3">TEAM 2</div>
                  <select
                    value={team2Id}
                    onChange={(e) => {
                      setTeam2Id(e.target.value);
                      setSelectedTeam2Players(new Set());
                    }}
                    className="w-full bg-[#4A6844] text-[#E8E8D8] px-3 py-2 border-2 border-[#E8E8D8]/30 mb-3 text-xs"
                  >
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>

                  <div className="text-xs text-[#E8E8D8] mb-2 font-bold">SENDS TO TEAM 3:</div>
                  <div className="space-y-1 mb-3">
                    {getTeam(team2Id).players.map(player => (
                      <button
                        key={player.id}
                        onClick={() => togglePlayerSelection(2, player.id)}
                        className={`w-full text-left p-2 border-2 text-xs ${
                          selectedTeam2Players.has(player.id)
                            ? "bg-[#C4A853] border-[#C4A853] text-black"
                            : "bg-[#4A6844] border-[#E8E8D8]/30"
                        }`}
                      >
                        {selectedTeam2Players.has(player.id) ? "☑" : "☐"} {player.name} ({player.position}) — {formatSalary(player.salary)}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs text-[#E8E8D8] mb-2 font-bold">RECEIVES FROM T1:</div>
                  <div className="bg-[#4A6844] p-2 border-2 border-[#E8E8D8]/30 text-xs text-[#E8E8D8]/70 mb-3">
                    → (Selected from Team 1)
                  </div>

                  <div className="pt-2 border-t-2 border-[#4A6844] text-xs text-[#E8E8D8]/80">
                    <div>TRADING: {selectedTeam2Players.size} player</div>
                    <div>TOTAL: {formatSalary(calculateTotalSalary(getSelectedPlayers(team2Id, selectedTeam2Players)))}</div>
                  </div>
                </div>

                {/* Team 3 */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-4">
                  <div className="text-sm text-[#E8E8D8] font-bold mb-3">TEAM 3</div>
                  <select
                    value={team3Id}
                    onChange={(e) => {
                      setTeam3Id(e.target.value);
                      setSelectedTeam3Players(new Set());
                    }}
                    className="w-full bg-[#4A6844] text-[#E8E8D8] px-3 py-2 border-2 border-[#E8E8D8]/30 mb-3 text-xs"
                  >
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>

                  <div className="text-xs text-[#E8E8D8] mb-2 font-bold">SENDS TO TEAM 1:</div>
                  <div className="space-y-1 mb-3">
                    {getTeam(team3Id).players.map(player => (
                      <button
                        key={player.id}
                        onClick={() => togglePlayerSelection(3, player.id)}
                        className={`w-full text-left p-2 border-2 text-xs ${
                          selectedTeam3Players.has(player.id)
                            ? "bg-[#C4A853] border-[#C4A853] text-black"
                            : "bg-[#4A6844] border-[#E8E8D8]/30"
                        }`}
                      >
                        {selectedTeam3Players.has(player.id) ? "☑" : "☐"} {player.name} ({player.position}) — {formatSalary(player.salary)}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs text-[#E8E8D8] mb-2 font-bold">RECEIVES FROM T2:</div>
                  <div className="bg-[#4A6844] p-2 border-2 border-[#E8E8D8]/30 text-xs text-[#E8E8D8]/70 mb-3">
                    → (Selected from Team 2)
                  </div>

                  <div className="pt-2 border-t-2 border-[#4A6844] text-xs text-[#E8E8D8]/80">
                    <div>TRADING: {selectedTeam3Players.size} player</div>
                    <div>TOTAL: {formatSalary(calculateTotalSalary(getSelectedPlayers(team3Id, selectedTeam3Players)))}</div>
                  </div>
                </div>
              </div>

              {/* Three-Way Flow Visualization */}
              {canProposeTrade() && (
                <div className="bg-[#5A8352] border-[4px] border-[#C4A853] p-6 mb-6">
                  <div className="text-sm text-[#E8E8D8] font-bold mb-3">THREE-WAY TRADE FLOW</div>
                  <div className="text-xs text-[#E8E8D8] text-center">
                    {getTeam(team1Id).name} ({getSelectedPlayers(team1Id, selectedTeam1Players).map(p => p.name).join(", ")}) → {getTeam(team2Id).name} ({getSelectedPlayers(team2Id, selectedTeam2Players).map(p => p.name).join(", ")}) → {getTeam(team3Id).name} ({getSelectedPlayers(team3Id, selectedTeam3Players).map(p => p.name).join(", ")}) → {getTeam(team1Id).name}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={clearTrade}
              className="bg-[#4A6844] border-[4px] border-[#E8E8D8]/30 px-6 py-3 text-[#E8E8D8] hover:bg-[#3D5A37] transition-all"
            >
              CLEAR
            </button>
            <button
              onClick={() => setCurrentScreen("ai-proposals-inbox")}
              className="bg-[#5A8352] border-[4px] border-[#4A6844] px-6 py-3 text-[#E8E8D8] hover:bg-[#4F7D4B] transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              AI Proposals ({mockAIProposals.length})
            </button>
            <button
              onClick={() => setCurrentScreen("trade-history")}
              className="bg-[#5A8352] border-[4px] border-[#4A6844] px-6 py-3 text-[#E8E8D8] hover:bg-[#4F7D4B] transition-all flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              History
            </button>
            <button
              onClick={handleProposeTrade}
              disabled={!canProposeTrade()}
              className={`flex-1 border-[4px] px-8 py-3 text-[#E8E8D8] font-bold transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] ${
                canProposeTrade()
                  ? "bg-[#5A8352] border-[#C4A853] hover:bg-[#4F7D4B] active:scale-95"
                  : "bg-[#4A6844] border-[#E8E8D8]/30 opacity-50 cursor-not-allowed"
              }`}
            >
              ⚡ PROPOSE TRADE
            </button>
          </div>
        </div>
      )}

      {/* Screen: Beat Reporter Warnings */}
      {currentScreen === "beat-reporter-warnings" && (
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">📰 BEAT WRITER REPORTS</h2>
          </div>

          <div className="space-y-6 mb-8">
            {beatReporterWarnings.map(warning => (
              <div key={warning.id} className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                <div className="text-sm text-[#E8E8D8] italic mb-4">
                  "{warning.message}"
                </div>
                <div className="text-xs text-[#E8E8D8]/70 text-right">
                  — {warning.author}, {warning.title}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#5A8352] border-[4px] border-[#FFC107] p-6 mb-6">
            <div className="text-sm text-[#E8E8D8] text-center">
              ⚠️ These reports may or may not be accurate. Proceed with the trade?
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setCurrentScreen("trade-builder")}
              className="bg-[#4A6844] border-[4px] border-[#E8E8D8]/30 px-8 py-3 text-[#E8E8D8] hover:bg-[#3D5A37] transition-all"
            >
              Cancel Trade
            </button>
            <button
              onClick={() => setCurrentScreen("trade-confirmation")}
              className="bg-[#5A8352] border-[4px] border-[#C4A853] px-8 py-3 text-[#E8E8D8] font-bold hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center gap-2"
            >
              Proceed Anyway <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Screen: Trade Confirmation */}
      {currentScreen === "trade-confirmation" && currentTrade && (
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">⚡ CONFIRM TRADE PROPOSAL</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Team 1 Sends */}
            <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
              <div className="text-lg text-[#E8E8D8] font-bold mb-4">
                {getTeam(currentTrade.team1Id).name.toUpperCase()} SEND:
              </div>
              <div className="space-y-3">
                {currentTrade.team1Players.map(player => (
                  <div key={player.id} className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                    <div className="text-sm text-[#E8E8D8] font-bold">{player.name}</div>
                    <div className="text-xs text-[#E8E8D8]/70">
                      {player.position} • OVR {player.overall} • {formatSalary(player.salary)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t-2 border-[#4A6844] text-sm text-[#E8E8D8]">
                Total: {formatSalary(calculateTotalSalary(currentTrade.team1Players))}
              </div>
            </div>

            {/* Team 2 Sends */}
            <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
              <div className="text-lg text-[#E8E8D8] font-bold mb-4">
                {getTeam(currentTrade.team2Id).name.toUpperCase()} SEND:
              </div>
              <div className="space-y-3">
                {currentTrade.team2Players.map(player => (
                  <div key={player.id} className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                    <div className="text-sm text-[#E8E8D8] font-bold">{player.name}</div>
                    <div className="text-xs text-[#E8E8D8]/70">
                      {player.position} • OVR {player.overall} • {formatSalary(player.salary)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t-2 border-[#4A6844] text-sm text-[#E8E8D8]">
                Total: {formatSalary(calculateTotalSalary(currentTrade.team2Players))}
              </div>
            </div>
          </div>

          {/* Salary Impact */}
          <div className="bg-[#5A8352] border-[4px] border-[#C4A853] p-6 mb-6">
            <div className="text-lg text-[#E8E8D8] font-bold mb-3">SALARY IMPACT</div>
            <div className="text-sm text-[#E8E8D8] space-y-2">
              <div>
                {getTeam(currentTrade.team1Id).name}: {currentTrade.salaryImpact.team1 > 0 ? "+" : ""}{formatSalary(currentTrade.salaryImpact.team1)} payroll (from {formatSalary(getTeam(currentTrade.team1Id).payroll)} to {formatSalary(getTeam(currentTrade.team1Id).payroll + currentTrade.salaryImpact.team1)})
              </div>
              <div>
                {getTeam(currentTrade.team2Id).name}: {currentTrade.salaryImpact.team2 > 0 ? "+" : ""}{formatSalary(currentTrade.salaryImpact.team2)} payroll (from {formatSalary(getTeam(currentTrade.team2Id).payroll)} to {formatSalary(getTeam(currentTrade.team2Id).payroll + currentTrade.salaryImpact.team2)})
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setCurrentScreen("beat-reporter-warnings")}
              className="bg-[#4A6844] border-[4px] border-[#E8E8D8]/30 px-8 py-3 text-[#E8E8D8] hover:bg-[#3D5A37] transition-all flex items-center gap-2"
            >
              ← Back
            </button>
            <button
              onClick={handleConfirmTrade}
              className="bg-[#5A8352] border-[4px] border-[#C4A853] px-12 py-3 text-[#E8E8D8] font-bold hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center gap-2"
            >
              Send Proposal <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Screen: AI Response */}
      {currentScreen === "ai-response" && aiResponse && currentTrade && (
        <div className="max-w-3xl mx-auto">
          {/* Accepted */}
          {aiResponse === "accepted" && (
            <div>
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🤝</div>
                <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">✅ TRADE ACCEPTED</h2>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#4CAF50] p-8 mb-6">
                <div className="text-lg text-[#E8E8D8] mb-6 text-center">
                  The {getTeam(currentTrade.team2Id).name} have accepted your trade proposal!
                </div>
                <div className="grid grid-cols-2 gap-6 text-sm text-[#E8E8D8]">
                  <div>
                    <div className="font-bold mb-2">{getTeam(currentTrade.team1Id).name.toUpperCase()} RECEIVE:</div>
                    <ul className="space-y-1">
                      {currentTrade.team2Players.map(p => (
                        <li key={p.id}>• {p.name} ({p.position})</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-bold mb-2">{getTeam(currentTrade.team2Id).name.toUpperCase()} RECEIVE:</div>
                    <ul className="space-y-1">
                      {currentTrade.team1Players.map(p => (
                        <li key={p.id}>• {p.name} ({p.position})</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
                <div className="text-sm text-[#E8E8D8] italic">
                  📰 "A blockbuster deal! Both teams addressed major needs here."
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={handleTradeComplete}
                  className="bg-[#5A8352] border-[4px] border-[#C4A853] px-12 py-4 text-[#E8E8D8] font-bold hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Rejected */}
          {aiResponse === "rejected" && (
            <div>
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🚫</div>
                <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">❌ TRADE REJECTED</h2>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#DD0000] p-8 mb-6">
                <div className="text-lg text-[#E8E8D8] mb-4 text-center">
                  The {getTeam(currentTrade.team2Id).name} have declined your trade proposal.
                </div>
                <div className="text-sm text-[#E8E8D8] italic text-center">
                  "We don't see enough value in this deal. {currentTrade.team1Players[0]?.name} is one of the best {currentTrade.team1Players[0]?.position}s in the league, and we'd need more coming back our way."
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setCurrentScreen("trade-builder");
                  }}
                  className="bg-[#4A6844] border-[4px] border-[#E8E8D8]/30 px-6 py-3 text-[#E8E8D8] hover:bg-[#3D5A37] transition-all"
                >
                  Modify Offer
                </button>
                <button
                  onClick={() => {
                    clearTrade();
                    setCurrentScreen("trade-builder");
                  }}
                  className="bg-[#4A6844] border-[4px] border-[#E8E8D8]/30 px-6 py-3 text-[#E8E8D8] hover:bg-[#3D5A37] transition-all"
                >
                  Try Different Trade
                </button>
                <button
                  onClick={() => {
                    setCurrentScreen("trade-builder");
                    clearTrade();
                  }}
                  className="bg-[#5A8352] border-[4px] border-[#C4A853] px-8 py-3 text-[#E8E8D8] font-bold hover:bg-[#4F7D4B] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Counter Offer */}
          {aiResponse === "counter" && aiCounter && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">🔄 COUNTER-OFFER FROM {getTeam(currentTrade.team2Id).name.toUpperCase()}</h2>
                <div className="text-sm text-[#E8E8D8]/70">They're interested, but want to modify the deal</div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Original Offer */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-4">YOUR ORIGINAL OFFER:</div>
                  <div className="mb-4">
                    <div className="text-xs text-[#E8E8D8]/70 mb-2">You send:</div>
                    {currentTrade.team1Players.map(p => (
                      <div key={p.id} className="text-sm text-[#E8E8D8] mb-1">• {p.name} ({p.position})</div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs text-[#E8E8D8]/70 mb-2">You get:</div>
                    {currentTrade.team2Players.map(p => (
                      <div key={p.id} className="text-sm text-[#E8E8D8] mb-1">• {p.name} ({p.position})</div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t-2 border-[#4A6844] text-sm text-[#E8E8D8]">
                    Salary: {currentTrade.salaryImpact.team1 > 0 ? "+" : ""}{formatSalary(currentTrade.salaryImpact.team1)}
                  </div>
                </div>

                {/* Counter Offer */}
                <div className="bg-[#5A8352] border-[4px] border-[#FFC107] p-6">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-4">THEIR COUNTER:</div>
                  <div className="mb-4">
                    <div className="text-xs text-[#E8E8D8]/70 mb-2">You send:</div>
                    {aiCounter.team1Players.map((p, idx) => (
                      <div key={p.id} className="text-sm text-[#E8E8D8] mb-1">
                        • {p.name} ({p.position}) {idx >= currentTrade.team1Players.length && <span className="text-[#FFC107]">← ADDED</span>}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs text-[#E8E8D8]/70 mb-2">You get:</div>
                    {aiCounter.team2Players.map((p, idx) => (
                      <div key={p.id} className="text-sm text-[#E8E8D8] mb-1">
                        • {p.name} ({p.position}) {idx >= currentTrade.team2Players.length && <span className="text-[#FFC107]">← ADDED</span>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t-2 border-[#4A6844] text-sm text-[#E8E8D8]">
                    Salary: {aiCounter.salaryImpact.team1 > 0 ? "+" : ""}{formatSalary(aiCounter.salaryImpact.team1)}
                  </div>
                </div>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
                <div className="text-sm text-[#E8E8D8] italic">
                  📰 "The {getTeam(currentTrade.team2Id).name} want a reliever included. They're high on {aiCounter.team1Players[aiCounter.team1Players.length - 1]?.name}'s arm."
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setAIResponse("accepted");
                  }}
                  className="bg-[#5A8352] border-[4px] border-[#4CAF50] px-8 py-3 text-[#E8E8D8] font-bold hover:bg-[#4F7D4B] transition-all"
                >
                  Accept Counter
                </button>
                <button
                  onClick={() => {
                    setCurrentScreen("trade-builder");
                  }}
                  className="bg-[#4A6844] border-[4px] border-[#E8E8D8]/30 px-8 py-3 text-[#E8E8D8] hover:bg-[#3D5A37] transition-all"
                >
                  Modify Further
                </button>
                <button
                  onClick={() => {
                    setCurrentScreen("trade-builder");
                    clearTrade();
                  }}
                  className="bg-[#4A6844] border-[4px] border-[#E8E8D8]/30 px-8 py-3 text-[#E8E8D8] hover:bg-[#3D5A37] transition-all"
                >
                  Decline
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Screen: AI Proposals Inbox */}
      {currentScreen === "ai-proposals-inbox" && (
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl text-[#E8E8D8] font-bold">📨 TRADE PROPOSALS</h2>
            <div className="text-sm text-[#E8E8D8]/70">{mockAIProposals.length} pending</div>
          </div>

          <div className="space-y-4 mb-6">
            {mockAIProposals.map(proposal => (
              <div key={proposal.id} className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-lg text-[#5599FF]">🔵</div>
                    <div className="text-lg text-[#E8E8D8] font-bold">{proposal.fromTeam.name.toUpperCase()}</div>
                  </div>
                  {proposal.isNew && (
                    <div className="text-xs bg-[#DD0000] text-[#E8E8D8] px-2 py-1">NEW</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <div className="text-xs text-[#E8E8D8]/70 mb-2">Offering:</div>
                    {proposal.offering.map(p => (
                      <div key={p.id} className="text-sm text-[#E8E8D8]">• {p.name} ({p.position}, {p.overall})</div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs text-[#E8E8D8]/70 mb-2">Wanting:</div>
                    {proposal.wanting.map(p => (
                      <div key={p.id} className="text-sm text-[#E8E8D8]">• {p.name} ({p.position}, {p.overall})</div>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-[#E8E8D8] mb-4">
                  Salary Impact: {proposal.salaryImpact > 0 ? "+" : ""}{formatSalary(proposal.salaryImpact)}
                </div>

                <button
                  onClick={() => {
                    setSelectedProposal(proposal);
                    setCurrentScreen("ai-proposal-detail");
                  }}
                  className="bg-[#4A6844] border-[3px] border-[#E8E8D8]/30 px-6 py-2 text-[#E8E8D8] text-sm hover:bg-[#3D5A37] transition-all flex items-center gap-2 ml-auto"
                >
                  VIEW DETAILS <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => setCurrentScreen("trade-builder")}
              className="bg-[#5A8352] border-[4px] border-[#4A6844] px-8 py-3 text-[#E8E8D8] hover:bg-[#4F7D4B] transition-all"
            >
              Back to Trade Builder
            </button>
          </div>
        </div>
      )}

      {/* Screen: AI Proposal Detail */}
      {currentScreen === "ai-proposal-detail" && selectedProposal && (
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">📨 TRADE PROPOSAL FROM {selectedProposal.fromTeam.name.toUpperCase()}</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* They Offer */}
            <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
              <div className="text-lg text-[#E8E8D8] font-bold mb-4">{selectedProposal.fromTeam.name.toUpperCase()} OFFER:</div>
              {selectedProposal.offering.map(player => (
                <div key={player.id} className="bg-[#4A6844] border-[3px] border-[#E8E8D8]/30 p-4 mb-3">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-2">{player.name.toUpperCase()}</div>
                  <div className="text-xs text-[#E8E8D8]/80 mb-3">
                    {player.position} • OVR: {player.overall} • Age: {player.age}
                  </div>
                  <div className="text-xs text-[#E8E8D8]/80 mb-2">
                    Salary: {formatSalary(player.salary)}
                  </div>
                  {player.lastSeasonStats && (
                    <div>
                      <div className="text-xs text-[#E8E8D8]/60 mb-1">Last Season:</div>
                      <div className="text-xs text-[#E8E8D8]/80">{player.lastSeasonStats}</div>
                      {player.war && <div className="text-xs text-[#E8E8D8]/80">{player.war.toFixed(1)} WAR</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* They Want */}
            <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
              <div className="text-lg text-[#E8E8D8] font-bold mb-4">THEY WANT:</div>
              {selectedProposal.wanting.map(player => (
                <div key={player.id} className="bg-[#4A6844] border-[3px] border-[#E8E8D8]/30 p-4 mb-3">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-2">{player.name.toUpperCase()}</div>
                  <div className="text-xs text-[#E8E8D8]/80 mb-3">
                    {player.position} • OVR: {player.overall} • Age: {player.age}
                  </div>
                  <div className="text-xs text-[#E8E8D8]/80 mb-2">
                    Salary: {formatSalary(player.salary)}
                  </div>
                  {player.lastSeasonStats && (
                    <div>
                      <div className="text-xs text-[#E8E8D8]/60 mb-1">Last Season:</div>
                      <div className="text-xs text-[#E8E8D8]/80">{player.lastSeasonStats}</div>
                      {player.war && <div className="text-xs text-[#E8E8D8]/80">{player.war.toFixed(1)} WAR</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Salary Impact */}
          <div className="bg-[#5A8352] border-[4px] border-[#C4A853] p-6 mb-6">
            <div className="text-lg text-[#E8E8D8] font-bold mb-2">SALARY IMPACT: {selectedProposal.salaryImpact > 0 ? "+" : ""}{formatSalary(selectedProposal.salaryImpact)}</div>
            <div className="text-sm text-[#E8E8D8]/80">
              Your payroll: {formatSalary(getTeam(team1Id).payroll)} → {formatSalary(getTeam(team1Id).payroll + selectedProposal.salaryImpact)}
            </div>
          </div>

          {/* Beat Reporter Note */}
          {selectedProposal.beatReporterNote && (
            <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
              <div className="text-sm text-[#E8E8D8] italic">
                📰 BEAT WRITER: "{selectedProposal.beatReporterNote}"
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setAIResponse("accepted");
                setCurrentScreen("ai-response");
              }}
              className="bg-[#5A8352] border-[4px] border-[#4CAF50] px-8 py-3 text-[#E8E8D8] font-bold hover:bg-[#4F7D4B] transition-all"
            >
              ACCEPT
            </button>
            <button
              onClick={() => setCurrentScreen("ai-proposals-inbox")}
              className="bg-[#4A6844] border-[4px] border-[#E8E8D8]/30 px-8 py-3 text-[#E8E8D8] hover:bg-[#3D5A37] transition-all"
            >
              COUNTER
            </button>
            <button
              onClick={() => setCurrentScreen("ai-proposals-inbox")}
              className="bg-[#4A6844] border-[4px] border-[#E8E8D8]/30 px-8 py-3 text-[#E8E8D8] hover:bg-[#3D5A37] transition-all"
            >
              DECLINE
            </button>
          </div>
        </div>
      )}

      {/* Screen: Trade History */}
      {currentScreen === "trade-history" && (
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl text-[#E8E8D8] font-bold">📜 TRADE HISTORY - OFFSEASON</h2>
            <select className="bg-[#4A6844] text-[#E8E8D8] px-4 py-2 border-2 border-[#E8E8D8]/30 text-sm">
              <option>All Teams</option>
              <option>Tigers</option>
              <option>Sox</option>
            </select>
          </div>

          {completedTrades.length === 0 ? (
            <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-12 text-center">
              <div className="text-lg text-[#E8E8D8]/60 mb-2">No trades completed yet</div>
              <div className="text-sm text-[#E8E8D8]/40">Completed trades will appear here</div>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {completedTrades.map(trade => (
                <div key={`${trade.tradeNumber}`} className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-lg text-[#E8E8D8] font-bold">TRADE #{trade.tradeNumber}</div>
                    <div className="text-xs text-[#E8E8D8]/60">{trade.date}</div>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-sm text-[#E8E8D8] font-bold">{getTeam(trade.team1Id).name.toUpperCase()}</div>
                    <div className="text-sm text-[#E8E8D8]">←→</div>
                    <div className="text-sm text-[#E8E8D8] font-bold">{getTeam(trade.team2Id).name.toUpperCase()}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 text-xs text-[#E8E8D8]">
                    <div>
                      <div className="text-[#E8E8D8]/70 mb-2">{getTeam(trade.team1Id).name} received:</div>
                      {trade.team2Players.map(p => (
                        <div key={p.id}>• {p.name} ({p.position})</div>
                      ))}
                    </div>
                    <div>
                      <div className="text-[#E8E8D8]/70 mb-2">{getTeam(trade.team2Id).name} received:</div>
                      {trade.team1Players.map(p => (
                        <div key={p.id}>• {p.name} ({p.position})</div>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-[#E8E8D8]/60 mt-3">
                    Salary: {getTeam(trade.team1Id).name} {trade.salaryImpact.team1 > 0 ? "+" : ""}{formatSalary(trade.salaryImpact.team1)} | {getTeam(trade.team2Id).name} {trade.salaryImpact.team2 > 0 ? "+" : ""}{formatSalary(trade.salaryImpact.team2)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => setCurrentScreen("trade-builder")}
              className="bg-[#5A8352] border-[4px] border-[#4A6844] px-8 py-3 text-[#E8E8D8] hover:bg-[#4F7D4B] transition-all"
            >
              Back to Trade Builder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
