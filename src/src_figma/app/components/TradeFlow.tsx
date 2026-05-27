import { useState, useMemo, useCallback, useEffect } from "react";
import { X, ChevronDown, ArrowRight, Trophy, Users, Clock, TrendingUp, TrendingDown, AlertCircle, CheckCircle, XCircle, RefreshCw, History, FileText } from "lucide-react";
import { useOffseasonData, type OffseasonPlayer, type OffseasonTeam } from "@/hooks/useOffseasonData";
import { useOffseasonState, type Trade as StoredTrade } from "../../hooks/useOffseasonState";
import {
  FRANCHISE_TRADE_CALCULATION_VERSION,
  runFranchiseTradeDryRun,
  type FranchiseTradeAdapterData,
} from "../../../utils/franchiseTradeAdapter";
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
}: {
  seasonId: string;
  franchiseId: string;
}) {
  return (
    <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-6 min-h-[320px]">
      <div className="space-y-4">
        <div className="bg-[#4A6844] border-[3px] border-[#3F5A3A] p-4">
          <div className="text-xl text-[#E8E8D8]">Trade Fit Preview</div>
          <div className="text-[10px] text-[#FFD700] mt-1">{FRANCHISE_TRADE_CALCULATION_VERSION}</div>
          <div className="text-[10px] text-[#E8E8D8]/80 mt-3">
            Preview only: no trades are executed, no players are moved, and no franchise, League Builder, transaction, prototype trade, or offseason state records are written.
          </div>
        </div>

        <div className="bg-[#5A2F2F] border-[3px] border-[#DD0000] p-4">
          <div className="text-xs text-[#E8E8D8] mb-2">BLOCKING ISSUE</div>
          <div className="text-[10px] text-[#FFD700]">MISSING_SEASON_NUMBER</div>
          <div className="text-[10px] text-[#E8E8D8]/80 mt-1">
            Franchise trade preview requires an explicit franchise seasonNumber. The preview was not started because silently defaulting to season 1 can scope data to the wrong season.
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
    if (
      typeof franchiseSeasonNumber !== "number" ||
      !Number.isFinite(franchiseSeasonNumber) ||
      franchiseSeasonNumber < 1
    ) {
      return (
        <FranchiseTradeContextIssueSurface
          franchiseId={props.franchiseId}
          seasonId={props.seasonId}
        />
      );
    }

    return (
      <FranchiseTradePreviewSurface
        franchiseId={props.franchiseId}
        seasonId={props.seasonId}
        seasonNumber={franchiseSeasonNumber}
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
