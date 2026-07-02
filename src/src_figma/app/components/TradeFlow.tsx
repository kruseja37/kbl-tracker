import { useState, useMemo, useCallback, useEffect } from "react";
import { ArrowRight, Users, RefreshCw, History, FileText, type LucideIcon } from "lucide-react";
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
import {
  LEGAL_ROSTER,
  canCover,
  depthReport,
  isLegalRoster,
  type RosterSlotPlayer,
} from "../../../data/rosterConstruction";
import {
  rosterNeedBreakdown,
  toRosterSlotPlayer,
  wouldStrandRoster,
  type RosterPositionMap,
} from "../../../engines/rosterNeed";

interface TradeFlowProps {
  seasonId: string;
  seasonNumber?: number;
  franchiseId: string;
  onComplete?: () => void;
}

type FranchiseTransactionConsoleTab = "moves" | "trade" | "history" | "preview";
type FranchiseRosterAssignmentStatus = "MLB" | "FARM" | "FREE_AGENT" | "RELEASED" | "RETIRED" | "INACTIVE" | "UNKNOWN";
type TransactionStatus = { kind: "success" | "warning" | "error"; message: string } | null;

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

function franchiseRosterSlotPlayer(player: FranchisePlayer): RosterSlotPlayer {
  return toRosterSlotPlayer({
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition ?? null,
    traits: [player.trait1, player.trait2],
  });
}

function franchiseRosterPositionMap(players: FranchisePlayer[]): RosterPositionMap {
  return Object.fromEntries(players.map((player) => [player.id, franchiseRosterSlotPlayer(player)]));
}

export function sendDownRosterLegalityAdvisory(
  mlbPlayers: FranchisePlayer[],
  outgoingPlayerId: string,
): string | null {
  const projectedPlayers = mlbPlayers.filter((player) => player.id !== outgoingPlayerId);
  const projectedSlots = projectedPlayers.map(franchiseRosterSlotPlayer);
  const legalAfterSendDown = isLegalRoster(projectedSlots);
  const depth = depthReport(projectedSlots);
  const need = rosterNeedBreakdown(projectedSlots);
  const stranded = wouldStrandRoster(
    projectedPlayers.map((player) => player.id),
    outgoingPlayerId,
    franchiseRosterPositionMap(mlbPlayers),
  );
  const catcherCoverers = projectedSlots.filter((player) => canCover(player, "C")).length;

  if (catcherCoverers < LEGAL_ROSTER.minCatchers) {
    return `Heads up: this leaves you with ${catcherCoverers} catcher${catcherCoverers === 1 ? "" : "s"} (roster needs ${LEGAL_ROSTER.minCatchers}). The move will still go through.`;
  }

  if (
    !need.infeasible &&
    need.missingPrimaries.length === 0 &&
    need.pitcherNeed === 0 &&
    need.hitterFloorNeed === 0 &&
    need.pitcherFloorNeed === 0 &&
    !stranded
  ) {
    return null;
  }

  const issues = [
    need.missingPrimaries.length > 0 ? `missing ${need.missingPrimaries.join("/")}` : "",
    need.pitcherNeed > 0 ? "pitching minimums" : "",
    need.hitterFloorNeed > 0 ? "position-player minimum" : "",
    need.pitcherFloorNeed > 0 ? "pitcher minimum" : "",
    need.infeasible || stranded ? "legal roster completion" : "",
    !legalAfterSendDown && depth.thinPositions.length > 0 ? `thin ${depth.thinPositions.join("/")}` : "",
  ].filter(Boolean);

  return `Heads up: this move creates a roster-legality warning${issues.length > 0 ? ` (${issues.join(", ")})` : ""}. The move will still go through.`;
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
      const sendDownWarning = movement === "send_down"
        ? sendDownRosterLegalityAdvisory(sendDownCandidates, playerId)
        : null;
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
        kind: sendDownWarning ? "warning" : "success",
        message: `${sendDownWarning ? `${sendDownWarning} ` : ""}${movement === "call_up" ? "Call-up" : "Send-down"} logged as ${result.transactionId ?? "transaction"}.`,
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
            : status.kind === "warning"
              ? "bg-[#5A4A2F] border-[#C4A853] text-[#E8E8D8]"
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
