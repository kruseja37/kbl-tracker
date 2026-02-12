import { useState, useMemo, useCallback, useEffect } from "react";
import { X, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Trophy, BarChart3, CheckCircle, Users, FileText, Clock, TrendingUp, Award, Flame, Sunrise } from "lucide-react";
import { useOffseasonData, type OffseasonTeam, type OffseasonPlayer } from "@/hooks/useOffseasonData";
import { SpringTrainingFlow } from "./SpringTrainingFlow";
import { executeSeasonTransition, type TransitionResult } from "../../../engines/seasonTransitionEngine";
import { updateFranchiseMetadata, getActiveFranchise } from "../../../utils/franchiseManager";
import { generateNewSeasonSchedule } from "../../../utils/franchiseInitializer";

type Screen =
  | "roster-management"
  | "ai-processing"
  | "validation"
  | "transaction-report"
  | "season-transition"
  | "chemistry-rebalancing"
  | "spring-training"
  | "advance-confirmation"
  | "post-advance-welcome";

type Position = "SP" | "RP" | "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF" | "IF" | "OF";
type Grade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D+" | "D" | "D-";

interface Player {
  id: string;
  name: string;
  position: Position;
  grade: Grade;
  age: number;
  salary: number;
  war: number;
  ceiling?: Grade;
  yearsInMinors?: number;
  isRookie?: boolean;
  morale?: number;
  retirementRisk?: number;
  yearsOfService?: number;
  priorDemotions?: number;
}

interface Transaction {
  id: string;
  type: "call-up" | "send-down" | "retirement";
  player: Player;
  team: string;
  timestamp: number;
}

interface Team {
  id: string;
  name: string;
  mlbRoster: Player[];
  farmRoster: Player[];
  isUserControlled: boolean;
  chemistry: number;
  chemistryChange?: number;
  chemistryFactors?: Array<{
    description: string;
    change: number;
  }>;
}

interface FinalizeAdvanceFlowProps {
  onClose: () => void;
  onAdvanceComplete: () => void;
  seasonNumber?: number;
}

// Helper to convert OffseasonPlayer to local Player format
function convertToLocalPlayer(player: OffseasonPlayer, index: number): Player {
  const gradeMap: Record<string, Grade> = {
    'S': 'A+', 'A+': 'A+', 'A': 'A', 'A-': 'A-',
    'B+': 'B+', 'B': 'B', 'B-': 'B-',
    'C+': 'C+', 'C': 'C', 'C-': 'C-',
    'D+': 'D+', 'D': 'D', 'D-': 'D-',
  };
  const positionMap: Record<string, Position> = {
    'SP': 'SP', 'RP': 'RP', 'CP': 'RP',
    'C': 'C', '1B': '1B', '2B': '2B', '3B': '3B', 'SS': 'SS',
    'LF': 'LF', 'CF': 'CF', 'RF': 'RF', 'DH': '1B',
  };
  return {
    id: player.id,
    name: player.name,
    position: positionMap[player.position] || 'IF',
    grade: gradeMap[player.grade] || 'B',
    age: player.age,
    salary: player.salary || 1000000,
    war: 1.0 + Math.random() * 4,
    yearsOfService: Math.max(0, player.age - 22),
    ceiling: gradeMap[player.grade] || 'B',
    yearsInMinors: index < 22 ? 0 : Math.floor(Math.random() * 3) + 1,
  };
}

// Empty teams fallback — populated from IndexedDB when available
const EMPTY_TEAMS: Team[] = [];

export function FinalizeAdvanceFlow({ onClose, onAdvanceComplete, seasonNumber = 1 }: FinalizeAdvanceFlowProps) {
  const nextSeason = seasonNumber + 1;
  // Get real data from hook
  const { teams: realTeams, players: realPlayers, hasRealData, isLoading } = useOffseasonData();

  const [currentScreen, setCurrentScreen] = useState<Screen>("roster-management");
  const [showIncompleteRosterConfirm, setShowIncompleteRosterConfirm] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("sf-giants");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showCallUpModal, setShowCallUpModal] = useState(false);
  const [showSendDownModal, setShowSendDownModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [mlbSortBy, setMlbSortBy] = useState<"grade" | "age" | "salary">("grade");
  const [farmSortBy, setFarmSortBy] = useState<"ceiling" | "age" | "years">("ceiling");
  const [processingStep, setProcessingStep] = useState(0);
  const [transitionResult, setTransitionResult] = useState<TransitionResult | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [expandedChemistry, setExpandedChemistry] = useState<Set<string>>(new Set());

  // Convert real data to local format
  const convertedTeams = useMemo((): Team[] => {
    if (hasRealData && realTeams.length > 0 && realPlayers.length > 0) {
      return realTeams.map((team, index) => {
        const teamPlayers = realPlayers.filter(p => p.teamId === team.id);
        const mlbPlayers = teamPlayers.slice(0, Math.min(22, teamPlayers.length));
        const farmPlayers = teamPlayers.slice(22);

        return {
          id: team.id,
          name: team.name,
          isUserControlled: index === 0, // First team is user-controlled
          chemistry: 50 + Math.floor(Math.random() * 30),
          chemistryChange: Math.floor(Math.random() * 20) - 5,
          mlbRoster: mlbPlayers.map((p, i) => convertToLocalPlayer(p, i)),
          farmRoster: farmPlayers.map((p, i) => convertToLocalPlayer(p, i + 22)),
          chemistryFactors: [
            { description: "Season transactions impact", change: Math.floor(Math.random() * 10) - 2 },
            { description: "Veteran leadership", change: Math.floor(Math.random() * 5) },
          ],
        };
      });
    }
    return EMPTY_TEAMS;
  }, [realTeams, realPlayers, hasRealData]);

  const [teams, setTeams] = useState<Team[]>(convertedTeams);

  // Sync teams state when async data arrives from IndexedDB
  useEffect(() => {
    if (convertedTeams.length > 0 && teams.length === 0) {
      setTeams(convertedTeams);
      setSelectedTeamId(convertedTeams[0]?.id || "");
    }
  }, [convertedTeams]);

  const selectedTeam = teams.find(t => t.id === selectedTeamId) || teams[0] || null;

  const handleCallUp = (player: Player) => {
    setSelectedPlayer(player);
    setShowCallUpModal(true);
  };

  const handleSendDown = (player: Player) => {
    setSelectedPlayer(player);
    setShowSendDownModal(true);
  };

  const confirmCallUp = () => {
    if (!selectedPlayer) return;
    
    const transaction: Transaction = {
      id: `txn-${Date.now()}`,
      type: "call-up",
      player: selectedPlayer,
      team: selectedTeam.name,
      timestamp: Date.now(),
    };
    
    setTransactions([...transactions, transaction]);
    
    // Update rosters
    setTeams(teams.map(t => {
      if (t.id === selectedTeamId) {
        return {
          ...t,
          mlbRoster: [...t.mlbRoster, { ...selectedPlayer, isRookie: true, salary: calculateRookieSalary(selectedPlayer.grade) }],
          farmRoster: t.farmRoster.filter(p => p.id !== selectedPlayer.id),
        };
      }
      return t;
    }));
    
    setShowCallUpModal(false);
    setSelectedPlayer(null);
  };

  const confirmSendDown = () => {
    if (!selectedPlayer) return;
    
    const retirementRisk = calculateRetirementRisk(selectedPlayer);
    const willRetire = Math.random() * 100 < retirementRisk;
    
    if (willRetire) {
      const transaction: Transaction = {
        id: `txn-${Date.now()}`,
        type: "retirement",
        player: selectedPlayer,
        team: selectedTeam.name,
        timestamp: Date.now(),
      };
      
      setTransactions([...transactions, transaction]);
      
      // Remove from roster
      setTeams(teams.map(t => {
        if (t.id === selectedTeamId) {
          return {
            ...t,
            mlbRoster: t.mlbRoster.filter(p => p.id !== selectedPlayer.id),
          };
        }
        return t;
      }));
    } else {
      const transaction: Transaction = {
        id: `txn-${Date.now()}`,
        type: "send-down",
        player: selectedPlayer,
        team: selectedTeam.name,
        timestamp: Date.now(),
      };
      
      setTransactions([...transactions, transaction]);
      
      // Update rosters
      setTeams(teams.map(t => {
        if (t.id === selectedTeamId) {
          return {
            ...t,
            mlbRoster: t.mlbRoster.filter(p => p.id !== selectedPlayer.id),
            farmRoster: [...t.farmRoster, { ...selectedPlayer, morale: (selectedPlayer.morale || 50) - 18 }],
          };
        }
        return t;
      }));
    }
    
    setShowSendDownModal(false);
    setSelectedPlayer(null);
  };

  const calculateRookieSalary = (grade: Grade): number => {
    const salaries: Record<string, number> = {
      "A+": 1500000, "A": 1400000, "A-": 1300000,
      "B+": 1200000, "B": 1200000, "B-": 1100000,
      "C+": 1000000, "C": 900000, "C-": 800000,
    };
    return salaries[grade] || 1000000;
  };

  const calculateRetirementRisk = (player: Player): number => {
    let risk = 0;
    
    // Age factor
    if (player.age >= 35) risk += 20;
    else if (player.age >= 32) risk += 10;
    else if (player.age >= 30) risk += 5;
    
    // Years of service
    if (player.yearsOfService && player.yearsOfService >= 10) risk += 15;
    else if (player.yearsOfService && player.yearsOfService >= 7) risk += 10;
    
    // Salary (higher salary = less willing to accept demotion)
    if (player.salary >= 10000000) risk += 15;
    else if (player.salary >= 5000000) risk += 10;
    
    // Prior demotions
    if (player.priorDemotions) risk += player.priorDemotions * 10;
    
    // High-grade players
    if (["A+", "A", "A-"].includes(player.grade)) risk += 25;
    
    return Math.min(risk, 95);
  };

  const undoLastTransaction = () => {
    if (transactions.length === 0) return;
    
    const lastTransaction = transactions[transactions.length - 1];
    
    // Reverse the transaction
    setTeams(teams.map(t => {
      if (t.name === lastTransaction.team) {
        if (lastTransaction.type === "call-up") {
          return {
            ...t,
            mlbRoster: t.mlbRoster.filter(p => p.id !== lastTransaction.player.id),
            farmRoster: [...t.farmRoster, lastTransaction.player],
          };
        } else if (lastTransaction.type === "send-down") {
          return {
            ...t,
            mlbRoster: [...t.mlbRoster, lastTransaction.player],
            farmRoster: t.farmRoster.filter(p => p.id !== lastTransaction.player.id),
          };
        }
      }
      return t;
    }));
    
    setTransactions(transactions.slice(0, -1));
  };

  const clearAllTransactions = () => {
    // Reset rosters to initial state
    setTransactions([]);
    // In production, would reload from saved state
  };

  const isRosterValid = (team: Team): boolean => {
    return team.mlbRoster.length === 22 && team.farmRoster.length === 10;
  };

  const allRostersValid = teams.every(isRosterValid);

  const processAITeams = () => {
    setCurrentScreen("ai-processing");
    // Simulate processing steps
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setProcessingStep(step);
      if (step >= 4) {
        clearInterval(interval);
        setTimeout(() => setCurrentScreen("validation"), 500);
      }
    }, 800);
  };

  const startSeasonTransition = useCallback(async () => {
    setCurrentScreen("season-transition");
    setProcessingStep(0);
    setTransitionError(null);

    try {
      // Execute REAL season transition operations via the engine
      const result = await executeSeasonTransition(seasonNumber, (stepNumber: number, stepName: string, details?: string) => {
        // Map engine's 8 steps to UI's 7 display steps:
        // Engine steps: 1=Archive, 2=Ages, 3=Salaries, 4=Mojo, 5=ClearStats, 6=Rookies, 7=Service, 8=Finalize
        // UI steps: 1=Archive, 2=Ages, 3=Salaries, 4=Mojo, 5=ClearStats, 6=Rookies, 7=Service
        // Engine step 8 (Finalize) maps to completing step 7 in the UI
        const uiStep = Math.min(stepNumber, 7);
        setProcessingStep(uiStep);
      });

      setTransitionResult(result);

      if (result.success) {
        // After engine finishes, ensure UI shows step 7 complete
        setProcessingStep(7);

        // Update FranchiseMetadata.currentSeason in IndexedDB
        const franchiseId = await getActiveFranchise();
        if (franchiseId) {
          await updateFranchiseMetadata(franchiseId, {
            currentSeason: seasonNumber + 1,
          });

          // Generate schedule for the new season
          const gamesScheduled = await generateNewSeasonSchedule(franchiseId, seasonNumber + 1);
          console.log(`[SeasonTransition] Generated ${gamesScheduled} games for Season ${seasonNumber + 1}`);
        }
      } else {
        const failedStep = result.steps.find((s: { status: string }) => s.status === 'error');
        setTransitionError(
          `Transition failed at "${failedStep?.name || 'unknown'}": ${failedStep?.error || 'Unknown error'}`
        );
      }
    } catch (err) {
      setTransitionError(err instanceof Error ? err.message : 'Season transition failed');
    }
  }, [seasonNumber]);

  const getChemistryLabel = (score: number): { label: string; color: string; icon: string } => {
    if (score >= 80) return { label: "Excellent", color: "#4CAF50", icon: "🟢" };
    if (score >= 60) return { label: "Good", color: "#8BC34A", icon: "🔷" };
    if (score >= 40) return { label: "Average", color: "#FFC107", icon: "🟡" };
    if (score >= 20) return { label: "Poor", color: "#FF9800", icon: "🟠" };
    return { label: "Toxic", color: "#F44336", icon: "🔴" };
  };

  const toggleExpandTeam = (teamId: string) => {
    const newSet = new Set(expandedTeams);
    if (newSet.has(teamId)) {
      newSet.delete(teamId);
    } else {
      newSet.add(teamId);
    }
    setExpandedTeams(newSet);
  };

  const toggleExpandChemistry = (teamId: string) => {
    const newSet = new Set(expandedChemistry);
    if (newSet.has(teamId)) {
      newSet.delete(teamId);
    } else {
      newSet.add(teamId);
    }
    setExpandedChemistry(newSet);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
        <div className="text-[#E8E8D8] text-xl">Loading finalize & advance data...</div>
      </div>
    );
  }

  // No teams loaded — show empty state instead of crashing on selectedTeam.mlbRoster
  if (teams.length === 0 || !selectedTeam) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-[#E8E8D8] text-xl">No team data available</div>
          <div className="text-[#E8E8D8]/60 text-sm">Team rosters could not be loaded for the finalize phase.</div>
          <button
            onClick={onClose}
            className="bg-[#5A8352] border-[4px] border-[#4A6844] px-6 py-3 text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-all"
          >
            Back to Offseason
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1a1a1a] border-[6px] border-[#C4A853] w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
        
        {/* Header */}
        <div className="bg-[#5A8352] border-b-[6px] border-[#4A6844] p-6 flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <FileText className="w-6 h-6 text-[#E8E8D8]" />
              <h2 className="text-2xl text-[#E8E8D8] font-bold">FINALIZE & ADVANCE</h2>
            </div>
            <div className="text-sm text-[#E8E8D8]/70">Season {nextSeason} Preparation</div>
          </div>
          <button
            onClick={onClose}
            className="text-[#E8E8D8] hover:text-[#DD0000] transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Screen: Roster Management */}
        {currentScreen === "roster-management" && (
          <div className="p-8">
            {/* Team Selector */}
            <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <label className="text-[#E8E8D8] font-bold">SELECT TEAM:</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="bg-[#4A6844] text-[#E8E8D8] px-4 py-2 border-2 border-[#E8E8D8]/30 flex-1 max-w-md"
                >
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.isUserControlled ? "⭐ " : ""}{team.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="text-sm text-[#E8E8D8]">
                Roster: {isRosterValid(selectedTeam) ? (
                  <span className="text-[#4CAF50]">✓ Full ({selectedTeam.mlbRoster.length} MLB + {selectedTeam.farmRoster.length} Farm = {selectedTeam.mlbRoster.length + selectedTeam.farmRoster.length})</span>
                ) : (
                  <span className="text-[#FFD700]">⚠ {selectedTeam.mlbRoster.length} MLB + {selectedTeam.farmRoster.length} Farm = {selectedTeam.mlbRoster.length + selectedTeam.farmRoster.length} (ideal: 32)</span>
                )}
              </div>
            </div>

            {/* Roster Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* MLB Roster */}
              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg text-[#E8E8D8] font-bold">
                    MLB ROSTER ({selectedTeam.mlbRoster.length}/22) {selectedTeam.mlbRoster.length === 22 ? "✓" : ""}
                  </div>
                  <select
                    value={mlbSortBy}
                    onChange={(e) => setMlbSortBy(e.target.value as any)}
                    className="bg-[#4A6844] text-[#E8E8D8] text-xs px-2 py-1 border-2 border-[#E8E8D8]/30"
                  >
                    <option value="grade">Sort: Grade</option>
                    <option value="age">Sort: Age</option>
                    <option value="salary">Sort: Salary</option>
                  </select>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {selectedTeam.mlbRoster.map(player => (
                    <div key={player.id} className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <span className="text-[#E8E8D8] font-bold">{player.name}</span>
                          <span className="text-[#E8E8D8]/60 text-xs ml-2">{player.position}</span>
                          <span className="text-[#5599FF] text-xs ml-2">{player.grade}</span>
                          <span className="text-[#E8E8D8]/60 text-xs ml-2">{player.age}</span>
                        </div>
                        {selectedTeam.isUserControlled && (
                          <button
                            onClick={() => handleSendDown(player)}
                            className="text-xs bg-[#5A8352] text-[#E8E8D8] px-2 py-1 border-2 border-[#E8E8D8]/30 hover:bg-[#4F7D4B] flex items-center gap-1"
                          >
                            <ArrowDown className="w-3 h-3" />
                            Send
                          </button>
                        )}
                      </div>
                      <div className="text-[#E8E8D8]/60 text-xs">
                        ${(player.salary / 1000000).toFixed(1)}M • WAR: {player.war.toFixed(1)}
                      </div>
                    </div>
                  ))}
                  
                  {selectedTeam.mlbRoster.length === 0 && (
                    <div className="text-center text-[#E8E8D8]/60 py-8 text-sm">No MLB players</div>
                  )}
                </div>
              </div>

              {/* Farm Roster */}
              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg text-[#E8E8D8] font-bold">
                    FARM ROSTER ({selectedTeam.farmRoster.length}/10) {selectedTeam.farmRoster.length === 10 ? "✓" : ""}
                  </div>
                  <select
                    value={farmSortBy}
                    onChange={(e) => setFarmSortBy(e.target.value as any)}
                    className="bg-[#4A6844] text-[#E8E8D8] text-xs px-2 py-1 border-2 border-[#E8E8D8]/30"
                  >
                    <option value="ceiling">Sort: Ceiling</option>
                    <option value="age">Sort: Age</option>
                    <option value="years">Sort: Years</option>
                  </select>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {selectedTeam.farmRoster.map(player => (
                    <div key={player.id} className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <span className="text-[#E8E8D8] font-bold">{player.name}</span>
                          <span className="text-[#E8E8D8]/60 text-xs ml-2">{player.position}</span>
                          <span className="text-[#5599FF] text-xs ml-2">{player.grade}</span>
                          <span className="text-[#CC44CC] text-xs ml-2">{player.ceiling}</span>
                          <span className="text-[#E8E8D8]/60 text-xs ml-2">{player.age}</span>
                        </div>
                        {selectedTeam.isUserControlled && (
                          <button
                            onClick={() => handleCallUp(player)}
                            className="text-xs bg-[#5A8352] text-[#E8E8D8] px-2 py-1 border-2 border-[#E8E8D8]/30 hover:bg-[#4F7D4B] flex items-center gap-1"
                          >
                            <ArrowUp className="w-3 h-3" />
                            Call
                          </button>
                        )}
                      </div>
                      <div className="text-[#E8E8D8]/60 text-xs">
                        Yrs: {player.yearsInMinors} • Ceil: {player.ceiling}
                      </div>
                    </div>
                  ))}
                  
                  {selectedTeam.farmRoster.length === 0 && (
                    <div className="text-center text-[#E8E8D8]/60 py-8 text-sm">No Farm players</div>
                  )}
                </div>
              </div>
            </div>

            {/* Pending Transactions */}
            {transactions.length > 0 && (
              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg text-[#E8E8D8] font-bold">PENDING TRANSACTIONS (This Session)</div>
                  <div className="flex gap-2">
                    <button
                      onClick={undoLastTransaction}
                      className="text-xs bg-[#4A6844] text-[#E8E8D8] px-3 py-1 border-2 border-[#E8E8D8]/30 hover:bg-[#3D5A37]"
                    >
                      Undo Last
                    </button>
                    <button
                      onClick={clearAllTransactions}
                      className="text-xs bg-[#4A6844] text-[#E8E8D8] px-3 py-1 border-2 border-[#E8E8D8]/30 hover:bg-[#3D5A37]"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {transactions.slice(-5).reverse().map(txn => (
                    <div key={txn.id} className="text-sm text-[#E8E8D8]/80">
                      • {txn.type === "call-up" && `Called up ${txn.player.name} (${txn.player.position}) from Farm`}
                      {txn.type === "send-down" && `Sent down ${txn.player.name} (${txn.player.position}) to Farm`}
                      {txn.type === "retirement" && `${txn.player.name} (${txn.player.position}) retired`}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-4">
                <button
                  onClick={processAITeams}
                  className="bg-[#5A8352] border-[4px] border-[#4A6844] px-6 py-3 text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                >
                  Process AI Teams
                </button>
                <button
                  onClick={() => setCurrentScreen("validation")}
                  className="bg-[#5A8352] border-[4px] border-[#4A6844] px-6 py-3 text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                >
                  View Validation
                </button>
                <button
                  onClick={() => setCurrentScreen("transaction-report")}
                  className="bg-[#5A8352] border-[4px] border-[#4A6844] px-6 py-3 text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                >
                  Transaction Report
                </button>
              </div>
              
              <button
                onClick={() => setCurrentScreen("validation")}
                className="bg-[#5A8352] border-[4px] border-[#C4A853] px-8 py-3 text-[#E8E8D8] text-lg font-bold hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
              >
                Continue to Advance →
              </button>
            </div>
          </div>
        )}

        {/* Screen: AI Processing */}
        {currentScreen === "ai-processing" && (
          <div className="p-8">
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl text-[#E8E8D8] font-bold mb-2">🤖 AI ROSTER MANAGEMENT</h3>
                <div className="text-sm text-[#E8E8D8]/70">Processing non-user controlled teams</div>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
                <div className="text-lg text-[#E8E8D8] font-bold mb-4">PROCESSING STATUS</div>
                
                <div className="bg-[#4A6844] h-8 mb-4 border-2 border-[#E8E8D8]/30">
                  <div
                    className="bg-[#5599FF] h-full transition-all duration-500"
                    style={{ width: `${(processingStep / 4) * 100}%` }}
                  />
                </div>

                <div className="space-y-2 text-sm text-[#E8E8D8]">
                  {processingStep >= 1 && <div>✓ 19 teams processed</div>}
                  {processingStep >= 2 && <div>✓ 12 call-ups made</div>}
                  {processingStep >= 3 && <div>✓ 14 send-downs made</div>}
                  {processingStep >= 4 && (
                    <>
                      <div>✓ 3 retirements triggered</div>
                      <div>✓ All AI teams now valid (22 + 10)</div>
                    </>
                  )}
                </div>
              </div>

              {processingStep >= 4 && (
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-lg text-[#E8E8D8] font-bold">AI TRANSACTIONS BY TEAM</div>
                    <button className="text-xs text-[#E8E8D8] hover:text-[#5599FF]">
                      Expand All
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {teams.filter(t => !t.isUserControlled).map(aiTeam => {
                      const aiTxns = transactions.filter(t => t.team === aiTeam.name);
                      return (
                        <div key={aiTeam.id} className="bg-[#4A6844] p-4 border-2 border-[#E8E8D8]/30">
                          <button
                            onClick={() => toggleExpandTeam(aiTeam.id)}
                            className="w-full flex items-center justify-between text-[#E8E8D8] text-sm font-bold"
                          >
                            <span>{aiTeam.name} ({aiTxns.length} transaction{aiTxns.length !== 1 ? 's' : ''})</span>
                            {expandedTeams.has(aiTeam.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {expandedTeams.has(aiTeam.id) && (
                            <div className="mt-3 space-y-2 text-xs text-[#E8E8D8]/80 pl-4">
                              {aiTxns.length === 0 ? (
                                <div className="text-[#E8E8D8]/50">No transactions</div>
                              ) : aiTxns.map(txn => (
                                <div key={txn.id}>
                                  {txn.type === 'call-up' && `⬆️ Called up ${txn.player.name} (${txn.player.position}, ${txn.player.grade}) - ROOKIE`}
                                  {txn.type === 'send-down' && `⬇️ Sent down ${txn.player.name} (${txn.player.position}, ${txn.player.grade}) to Farm`}
                                  {txn.type === 'retirement' && `💀 ${txn.player.name} (${txn.player.position}, ${txn.player.grade}) retired - declined demotion`}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {teams.filter(t => !t.isUserControlled).length === 0 && (
                      <div className="text-sm text-[#E8E8D8]/50 text-center py-4">No AI teams in league</div>
                    )}
                  </div>
                </div>
              )}

              {processingStep >= 4 && (
                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => setCurrentScreen("roster-management")}
                    className="bg-[#4A6844] border-[4px] border-[#E8E8D8]/30 px-6 py-3 text-[#E8E8D8] hover:bg-[#3D5A37] active:scale-95 transition-all"
                  >
                    Back to Roster Management
                  </button>
                  <button
                    onClick={() => setCurrentScreen("validation")}
                    className="bg-[#5A8352] border-[4px] border-[#C4A853] px-8 py-3 text-[#E8E8D8] font-bold hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                  >
                    Continue →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Screen: Validation Summary */}
        {currentScreen === "validation" && (
          <div className="p-8">
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl text-[#E8E8D8] font-bold mb-2">✓ ROSTER VALIDATION</h3>
                <div className="text-sm text-[#E8E8D8]/70">Ideal roster: 22 MLB + 10 Farm = 32 players</div>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
                <div className="text-lg text-[#E8E8D8] font-bold mb-2">
                  ROSTER STATUS: {allRostersValid ? "✓ ALL TEAMS AT FULL STRENGTH" : `⚠ ${teams.length - teams.filter(isRosterValid).length} team(s) have incomplete rosters`}
                </div>
                <div className="text-sm text-[#E8E8D8]/80">
                  {teams.filter(isRosterValid).length} of {teams.length} teams at ideal roster size
                  {!allRostersValid && " — teams with fewer players will have a thinner bench"}
                </div>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
                <div className="text-lg text-[#E8E8D8] font-bold mb-4">TEAM ROSTER STATUS</div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {teams.map(team => {
                    const valid = isRosterValid(team);
                    return (
                      <div
                        key={team.id}
                        className={`p-3 border-2 ${valid ? "bg-[#4A6844] border-[#4CAF50]/30" : "bg-[#5A3A3A] border-[#DD0000]/30"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-[#E8E8D8]">
                            {valid ? "✓" : "✗"} {team.isUserControlled ? "⭐ " : ""}{team.name}
                          </div>
                          <div className="text-xs text-[#E8E8D8]/70">
                            {team.mlbRoster.length} MLB │ {team.farmRoster.length} Farm │ {team.mlbRoster.length + team.farmRoster.length} Total
                          </div>
                        </div>
                        {!valid && (
                          <div className="mt-2 text-xs text-[#E8E8D8]/80">
                            Note: {team.mlbRoster.length !== 22 && `MLB roster has ${team.mlbRoster.length}/22 players`}
                            {team.mlbRoster.length !== 22 && team.farmRoster.length !== 10 && " │ "}
                            {team.farmRoster.length !== 10 && `Farm roster has ${team.farmRoster.length}/10 players`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentScreen("roster-management")}
                  className="bg-[#4A6844] border-[4px] border-[#E8E8D8]/30 px-6 py-3 text-[#E8E8D8] hover:bg-[#3D5A37] active:scale-95 transition-all"
                >
                  Back
                </button>
                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentScreen("transaction-report")}
                    className="bg-[#5A8352] border-[4px] border-[#4A6844] px-6 py-3 text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                  >
                    View Transaction Report
                  </button>
                  <button
                    onClick={() => {
                      if (!allRostersValid) {
                        setShowIncompleteRosterConfirm(true);
                      } else {
                        setCurrentScreen("transaction-report");
                      }
                    }}
                    className="bg-[#5A8352] border-[4px] border-[#C4A853] px-8 py-3 text-[#E8E8D8] font-bold hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                  >
                    Continue →
                  </button>
                </div>

                {showIncompleteRosterConfirm && (
                  <div className="mt-4 bg-[#5A3A3A] border-[3px] border-[#DD0000]/50 p-4">
                    <div className="text-sm text-[#E8E8D8] mb-3">
                      {teams.length - teams.filter(isRosterValid).length} team(s) have incomplete rosters. Teams with fewer players will have a thinner bench — this is a gameplay consequence, not an error.
                    </div>
                    <div className="text-sm text-[#E8E8D8]/70 mb-4">Advance anyway?</div>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setShowIncompleteRosterConfirm(false)}
                        className="bg-[#4A6844] border-[3px] border-[#E8E8D8]/30 px-4 py-2 text-sm text-[#E8E8D8] hover:bg-[#3D5A37] active:scale-95 transition-all"
                      >
                        Go Back
                      </button>
                      <button
                        onClick={() => {
                          setShowIncompleteRosterConfirm(false);
                          setCurrentScreen("transaction-report");
                        }}
                        className="bg-[#5A8352] border-[3px] border-[#C4A853] px-4 py-2 text-sm text-[#E8E8D8] font-bold hover:bg-[#4F7D4B] active:scale-95 transition-all"
                      >
                        Advance Anyway →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Screen: Transaction Report */}
        {currentScreen === "transaction-report" && (
          <div className="p-8">
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl text-[#E8E8D8] font-bold mb-2">📋 TRANSACTION REPORT</h3>
                <div className="text-sm text-[#E8E8D8]/70">Season {nextSeason} Preparation</div>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
                <div className="text-lg text-[#E8E8D8] font-bold mb-4">REPORT SUMMARY</div>
                <div className="grid grid-cols-3 gap-4 text-sm text-[#E8E8D8]">
                  <div>
                    <div className="text-[#E8E8D8]/60">Total Transactions</div>
                    <div className="text-2xl font-bold">{transactions.length}</div>
                  </div>
                  <div>
                    <div className="text-[#E8E8D8]/60">Call-Ups</div>
                    <div className="text-2xl font-bold text-[#4CAF50]">
                      {transactions.filter(t => t.type === "call-up").length}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#E8E8D8]/60">Send-Downs</div>
                    <div className="text-2xl font-bold text-[#FFC107]">
                      {transactions.filter(t => t.type === "send-down").length}
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-[#E8E8D8]">
                  All {teams.length} teams validated ✓
                </div>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg text-[#E8E8D8] font-bold">TRANSACTIONS</div>
                  <div className="flex gap-2">
                    <button className="text-xs bg-[#4A6844] text-[#E8E8D8] px-3 py-1 border-2 border-[#E8E8D8]/30 hover:bg-[#3D5A37]">
                      Print
                    </button>
                    <button className="text-xs bg-[#4A6844] text-[#E8E8D8] px-3 py-1 border-2 border-[#E8E8D8]/30 hover:bg-[#3D5A37]">
                      Copy
                    </button>
                  </div>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {/* User Team Transactions */}
                  {transactions.filter(t => teams.find(team => team.name === t.team)?.isUserControlled).length > 0 && (
                    <div className="bg-[#4A6844] p-4 border-2 border-[#FFD700]">
                      <div className="text-sm text-[#FFD700] font-bold mb-3">
                        ⭐ {teams.find(t => t.isUserControlled)?.name.toUpperCase()} (User-Controlled)
                      </div>
                      <div className="space-y-2">
                        {transactions
                          .filter(t => teams.find(team => team.name === t.team)?.isUserControlled)
                          .map(txn => (
                            <div key={txn.id} className="text-xs text-[#E8E8D8] pl-4">
                              {txn.type === "call-up" && (
                                <>
                                  <div>⬆️ CALL UP: {txn.player.name} ({txn.player.position}, {txn.player.grade}) → MLB</div>
                                  <div className="text-[#E8E8D8]/60 pl-4">
                                    💰 Salary: ${calculateRookieSalary(txn.player.grade).toLocaleString()}
                                  </div>
                                  <div className="text-[#E8E8D8]/60 pl-4">🌟 Status: ROOKIE</div>
                                </>
                              )}
                              {txn.type === "send-down" && (
                                <>
                                  <div>⬇️ SEND DOWN: {txn.player.name} ({txn.player.position}, {txn.player.grade}) → Farm</div>
                                  <div className="text-[#E8E8D8]/60 pl-4">😔 Morale: -18</div>
                                </>
                              )}
                              {txn.type === "retirement" && (
                                <>
                                  <div>💀 RETIRED: {txn.player.name} ({txn.player.position}, {txn.player.grade}) - Declined demotion</div>
                                  <div className="text-[#E8E8D8]/60 pl-4">📁 Added to Inactive Player Database</div>
                                </>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* AI Teams */}
                  {teams.filter(t => !t.isUserControlled).map(aiTeam => {
                    const aiTxns = transactions.filter(t => t.team === aiTeam.name);
                    return (
                      <div key={aiTeam.id} className="bg-[#4A6844] p-4 border-2 border-[#E8E8D8]/30">
                        <div className="text-sm text-[#E8E8D8] font-bold mb-3">
                          {aiTeam.name.toUpperCase()} (AI-Controlled)
                        </div>
                        <div className="space-y-2 text-xs text-[#E8E8D8] pl-4">
                          {aiTxns.length === 0 ? (
                            <div className="text-[#E8E8D8]/50">No transactions</div>
                          ) : aiTxns.map(txn => (
                            <div key={txn.id}>
                              {txn.type === 'call-up' && (
                                <>
                                  <div>⬆️ CALL UP: {txn.player.name} ({txn.player.position}, {txn.player.grade}) → MLB</div>
                                  <div className="text-[#E8E8D8]/60 pl-4">
                                    💰 Salary: ${calculateRookieSalary(txn.player.grade).toLocaleString()}
                                  </div>
                                  <div className="text-[#E8E8D8]/60 pl-4">🌟 Status: ROOKIE</div>
                                </>
                              )}
                              {txn.type === 'send-down' && (
                                <div className="mt-2">⬇️ SEND DOWN: {txn.player.name} ({txn.player.position}, {txn.player.grade}) → Farm</div>
                              )}
                              {txn.type === 'retirement' && (
                                <>
                                  <div className="mt-2">💀 RETIRED: {txn.player.name} ({txn.player.position}, {txn.player.grade}) - Declined demotion</div>
                                  <div className="text-[#E8E8D8]/60 pl-4">📁 Added to Inactive Player Database</div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentScreen("validation")}
                  className="bg-[#4A6844] border-[4px] border-[#E8E8D8]/30 px-6 py-3 text-[#E8E8D8] hover:bg-[#3D5A37] active:scale-95 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={startSeasonTransition}
                  className="bg-[#5A8352] border-[4px] border-[#C4A853] px-8 py-3 text-[#E8E8D8] font-bold hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                >
                  Continue to Advance →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Screen: Season Transition */}
        {currentScreen === "season-transition" && (
          <div className="p-8">
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl text-[#E8E8D8] font-bold mb-2">
                  {processingStep >= 7 ? "✓ SEASON TRANSITION COMPLETE" : "⏳ PROCESSING SEASON TRANSITION"}
                </h3>
                <div className="text-sm text-[#E8E8D8]/70">
                  {processingStep >= 7 ? `Season ${nextSeason} is ready to begin` : `Please wait while we prepare Season ${nextSeason}`}
                </div>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
                <div className="text-lg text-[#E8E8D8] font-bold mb-4">
                  {processingStep >= 7 ? "TRANSITION SUMMARY" : "PROCESSING STEPS"}
                </div>

                <div className="space-y-3">
                  <div className={`flex items-center justify-between p-3 ${processingStep >= 1 ? "bg-[#4A6844]" : "bg-[#3D5A37]"} border-2 border-[#E8E8D8]/30`}>
                    <div className="text-sm text-[#E8E8D8]">
                      {processingStep >= 1 ? "✓" : "○"} Archiving Season {seasonNumber} data...
                      {processingStep >= 1 && transitionResult?.steps[0]?.details && (
                        <span className="text-xs text-[#E8E8D8]/60 ml-2">({transitionResult.steps[0].details})</span>
                      )}
                    </div>
                    <div className="text-xs text-[#E8E8D8]/60">
                      {processingStep >= 1 ? "Complete" : "Pending"}
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-3 ${processingStep >= 2 ? "bg-[#4A6844]" : "bg-[#3D5A37]"} border-2 border-[#E8E8D8]/30`}>
                    <div className="text-sm text-[#E8E8D8]">
                      {processingStep >= 2 ? "✓" : "○"} Incrementing player ages...
                      {processingStep >= 2 && (
                        <span className="text-xs text-[#E8E8D8]/60 ml-2">
                          ({transitionResult?.summary.playersAged ?? 0} players aged +1 year)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#E8E8D8]/60">
                      {processingStep >= 2 ? "Complete" : "Pending"}
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-3 ${processingStep >= 3 ? "bg-[#4A6844]" : "bg-[#3D5A37]"} border-2 border-[#E8E8D8]/30`}>
                    <div className="text-sm text-[#E8E8D8]">
                      {processingStep >= 3 ? "✓" : "○"} Recalculating salaries...
                      {processingStep >= 3 && (
                        <span className="text-xs text-[#E8E8D8]/60 ml-2">
                          ({transitionResult?.summary.salariesRecalculated ?? 0} salaries changed)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#E8E8D8]/60">
                      {processingStep >= 3 ? "Complete" : "Pending"}
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-3 ${processingStep >= 4 ? "bg-[#4A6844]" : "bg-[#3D5A37]"} border-2 border-[#E8E8D8]/30`}>
                    <div className="text-sm text-[#E8E8D8]">
                      {processingStep >= 4 ? "✓" : "○"} Resetting player mojo...
                      {processingStep >= 4 && (
                        <span className="text-xs text-[#E8E8D8]/60 ml-2">
                          ({transitionResult?.summary.mojosReset ?? 0} mojos reset to NORMAL)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#E8E8D8]/60">
                      {processingStep >= 4 ? "Complete" : "Pending"}
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-3 ${processingStep >= 5 ? "bg-[#4A6844]" : "bg-[#3D5A37]"} border-2 border-[#E8E8D8]/30`}>
                    <div className="text-sm text-[#E8E8D8]">
                      {processingStep >= 5 ? "✓" : "○"} Clearing seasonal statistics...
                      {processingStep >= 5 && (
                        <span className="text-xs text-[#E8E8D8]/60 ml-2">(Career totals preserved)</span>
                      )}
                    </div>
                    <div className="text-xs text-[#E8E8D8]/60">
                      {processingStep >= 5 ? "Complete" : "Pending"}
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-3 ${processingStep >= 6 ? "bg-[#4A6844]" : "bg-[#3D5A37]"} border-2 border-[#E8E8D8]/30`}>
                    <div className="text-sm text-[#E8E8D8]">
                      {processingStep >= 6 ? "✓" : "○"} Applying rookie designations...
                      {processingStep >= 6 && (
                        <span className="text-xs text-[#E8E8D8]/60 ml-2">
                          ({transitionResult?.summary.rookiesApplied ?? 0} rookies designated)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#E8E8D8]/60">
                      {processingStep >= 6 ? "Complete" : "Pending"}
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-3 ${processingStep >= 7 ? "bg-[#4A6844]" : "bg-[#3D5A37]"} border-2 border-[#E8E8D8]/30`}>
                    <div className="text-sm text-[#E8E8D8]">
                      {processingStep >= 7 ? "✓" : "○"} Incrementing years of service...
                      {processingStep >= 7 && (
                        <span className="text-xs text-[#E8E8D8]/60 ml-2">
                          ({transitionResult?.summary.serviceIncremented ?? 0} records updated)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#E8E8D8]/60">
                      {processingStep >= 7 ? "Complete" : "Pending"}
                    </div>
                  </div>

                  {/* Error display */}
                  {transitionError && (
                    <div className="flex items-center justify-between p-3 bg-[#8B2500] border-2 border-[#FF4444]/50 mt-2">
                      <div className="text-sm text-[#FF9999]">
                        ⚠️ {transitionError}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {processingStep >= 7 && transitionResult?.success && (
                <>
                  <div className="bg-[#5A8352] border-[4px] border-[#FFD700] p-6 mb-6">
                    <div className="text-lg text-[#E8E8D8] font-bold mb-4">SEASON {seasonNumber} TRANSITION SUMMARY</div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-[#E8E8D8]">
                      <div>
                        <div className="text-[#E8E8D8]/60">👤 Players Aged</div>
                        <div className="font-bold">{transitionResult.summary.playersAged} players +1 year</div>
                      </div>
                      <div>
                        <div className="text-[#E8E8D8]/60">💰 Salaries Changed</div>
                        <div className="font-bold">{transitionResult.summary.salariesRecalculated} recalculated</div>
                      </div>
                      <div>
                        <div className="text-[#E8E8D8]/60">🔄 Mojo Reset</div>
                        <div className="font-bold">{transitionResult.summary.mojosReset} players to NORMAL</div>
                      </div>
                      <div>
                        <div className="text-[#E8E8D8]/60">⭐ New Rookies</div>
                        <div className="font-bold">{transitionResult.summary.rookiesApplied} designated</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mb-6">
                    <div className="text-sm text-[#E8E8D8]/60">
                      Season {seasonNumber} → Season {nextSeason} transition complete
                    </div>
                  </div>
                </>
              )}

              {processingStep >= 7 && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setCurrentScreen("chemistry-rebalancing")}
                    className="bg-[#5A8352] border-[4px] border-[#C4A853] px-8 py-3 text-[#E8E8D8] font-bold hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                  >
                    Continue to Season {nextSeason} →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Screen: Chemistry Rebalancing */}
        {currentScreen === "chemistry-rebalancing" && (
          <div className="p-8">
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl text-[#E8E8D8] font-bold mb-2">⚗️ CHEMISTRY REBALANCING</h3>
                <div className="text-sm text-[#E8E8D8]/70">How offseason roster changes affected team chemistry</div>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
                <div className="text-lg text-[#E8E8D8] font-bold mb-4">LEAGUE SUMMARY</div>
                <div className="flex items-center justify-center gap-8 text-sm text-[#E8E8D8]">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#4CAF50]">5</div>
                    <div className="text-[#E8E8D8]/60">📈 Teams Improved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#DD0000]">2</div>
                    <div className="text-[#E8E8D8]/60">📉 Teams Declined</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#E8E8D8]">1</div>
                    <div className="text-[#E8E8D8]/60">➖ Team Unchanged</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
                <div className="text-lg text-[#E8E8D8] font-bold mb-4">TEAM CHEMISTRY CHANGES</div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {teams.map(team => {
                    const chemInfo = getChemistryLabel(team.chemistry);
                    const isExpanded = expandedChemistry.has(team.id);
                    
                    return (
                      <div key={team.id} className="bg-[#4A6844] p-4 border-2 border-[#E8E8D8]/30">
                        <button
                          onClick={() => toggleExpandChemistry(team.id)}
                          className="w-full"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{chemInfo.icon}</span>
                              <span className="text-sm text-[#E8E8D8] font-bold">
                                {team.name.toUpperCase()}
                              </span>
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-[#E8E8D8]" /> : <ChevronDown className="w-4 h-4 text-[#E8E8D8]" />}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div className="text-[#E8E8D8]">
                              Chemistry: {team.chemistry - (team.chemistryChange || 0)} → {team.chemistry}{" "}
                              <span className={team.chemistryChange! > 0 ? "text-[#4CAF50]" : "text-[#DD0000]"}>
                                ({team.chemistryChange! > 0 ? "+" : ""}{team.chemistryChange})
                              </span>
                            </div>
                            <div style={{ color: chemInfo.color }}>
                              {chemInfo.label} {team.chemistryChange! > 0 ? "📈" : team.chemistryChange! < 0 ? "📉" : "➖"}
                            </div>
                          </div>
                        </button>

                        {isExpanded && team.chemistryFactors && (
                          <div className="mt-3 pt-3 border-t border-[#E8E8D8]/20 space-y-2">
                            <div className="text-xs text-[#E8E8D8]/70 font-bold mb-2">CHANGE FACTORS:</div>
                            {team.chemistryFactors.map((factor, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-[#E8E8D8]/80">
                                <span className={factor.change > 0 ? "text-[#4CAF50]" : "text-[#DD0000]"}>
                                  {factor.change > 0 ? "📈" : "📉"} {factor.change > 0 ? "+" : ""}{factor.change}
                                </span>
                                <span>{factor.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => setCurrentScreen("spring-training")}
                  className="bg-[#5A8352] border-[4px] border-[#C4A853] px-8 py-3 text-[#E8E8D8] font-bold hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                >
                  Continue to Spring Training →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Screen: Spring Training */}
        {currentScreen === "spring-training" && (
          <div className="p-8">
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Sunrise className="w-8 h-8 text-[#FFD700]" />
                  <h3 className="text-2xl text-[#E8E8D8] font-bold">SPRING TRAINING</h3>
                </div>
                <div className="text-sm text-[#E8E8D8]/70">Review projected player development for the upcoming season</div>
              </div>

              <SpringTrainingFlow onComplete={() => {}} />

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCurrentScreen("chemistry-rebalancing")}
                  className="bg-[#4A6844] border-[4px] border-[#E8E8D8]/30 px-6 py-3 text-[#E8E8D8] hover:bg-[#3D5A37] active:scale-95 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentScreen("advance-confirmation")}
                  className="bg-[#5A8352] border-[4px] border-[#C4A853] px-8 py-3 text-[#E8E8D8] font-bold hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                >
                  Continue to Advance →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Screen: Advance Confirmation */}
        {currentScreen === "advance-confirmation" && (
          <div className="p-8">
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl text-[#E8E8D8] font-bold mb-2">🚀 READY TO BEGIN SEASON 2</h3>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
                <div className="text-lg text-[#E8E8D8] font-bold mb-4">PRE-ADVANCE CHECKLIST</div>
                <div className="space-y-2 text-sm text-[#E8E8D8]">
                  <div>✓ All rosters validated (22 MLB + 10 Farm per team)</div>
                  <div>✓ Transaction report generated</div>
                  <div>✓ AI teams processed</div>
                  <div>✓ Season transition complete</div>
                  <div>✓ Season {seasonNumber} archived</div>
                </div>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#DD0000] p-6 mb-6">
                <div className="text-lg text-[#E8E8D8] font-bold mb-4">⚠️ IMPORTANT: SYNC WITH SMB4</div>
                <div className="space-y-3 text-sm text-[#E8E8D8]">
                  <div>Before continuing, make sure you:</div>
                  <div className="pl-4 space-y-2">
                    <div>1. Apply all roster changes to Super Mega Baseball 4</div>
                    <div className="pl-4 text-[#E8E8D8]/70">(Use the Transaction Report as your guide)</div>
                    <div>2. Advance to the new season in SMB4</div>
                    <div>3. Return here to begin tracking Season {nextSeason}</div>
                  </div>
                  <div className="text-center pt-4">
                    <button
                      onClick={() => setCurrentScreen("transaction-report")}
                      className="text-sm bg-[#4A6844] text-[#E8E8D8] px-4 py-2 border-2 border-[#E8E8D8]/30 hover:bg-[#3D5A37]"
                    >
                      View Transaction Report
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#C4A853] p-8 text-center">
                <button
                  onClick={() => setCurrentScreen("post-advance-welcome")}
                  className="bg-[#4A6844] border-[4px] border-[#FFD700] px-12 py-6 text-xl text-[#E8E8D8] font-bold hover:bg-[#3D5A37] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                >
                  BEGIN SEASON 2
                </button>
                <div className="text-xs text-[#E8E8D8]/60 mt-4">
                  Note: Schedule will start empty. Add games as you play them.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Screen: Post-Advance Welcome */}
        {currentScreen === "post-advance-welcome" && (
          <div className="p-8">
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
              <div className="text-center mb-8 py-8">
                <h3 className="text-4xl text-[#E8E8D8] font-bold mb-4">🎉 WELCOME TO SEASON 2! 🎉</h3>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
                <div className="text-lg text-[#E8E8D8] font-bold mb-4">NEXT STEPS</div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="text-[#E8E8D8] font-bold">1.</div>
                    <div>
                      <div className="text-sm text-[#E8E8D8] mb-2">Apply roster changes to SMB4 (if not done already)</div>
                      <button
                        onClick={() => setCurrentScreen("transaction-report")}
                        className="text-xs bg-[#4A6844] text-[#E8E8D8] px-3 py-1 border-2 border-[#E8E8D8]/30 hover:bg-[#3D5A37]"
                      >
                        View Transaction Report
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="text-[#E8E8D8] font-bold">2.</div>
                    <div className="text-sm text-[#E8E8D8]">Advance to Season {nextSeason} in SMB4</div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="text-[#E8E8D8] font-bold">3.</div>
                    <div className="text-sm text-[#E8E8D8]">Add games to your schedule as you play them</div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="text-[#E8E8D8] font-bold">4.</div>
                    <div className="text-sm text-[#E8E8D8]">Start tracking your first game!</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
                <div className="text-lg text-[#E8E8D8] font-bold mb-4">SEASON 2 ROOKIES TO WATCH</div>
                <div className="space-y-2 text-sm text-[#E8E8D8]">
                  {transactions
                    .filter(t => t.type === "call-up")
                    .slice(0, 3)
                    .map(txn => (
                      <div key={txn.id}>
                        🌟 {txn.player.name} ({txn.player.position}, {txn.player.grade}) - {txn.team}
                      </div>
                    ))}
                  {transactions.filter(t => t.type === "call-up").length > 3 && (
                    <div className="text-[#E8E8D8]/60">[+{transactions.filter(t => t.type === "call-up").length - 3} more rookies]</div>
                  )}
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => {
                    onAdvanceComplete();
                    onClose();
                  }}
                  className="bg-[#5A8352] border-[4px] border-[#C4A853] px-12 py-4 text-xl text-[#E8E8D8] font-bold hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                >
                  Go to Regular Season →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Call-Up Modal */}
        {showCallUpModal && selectedPlayer && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] w-full max-w-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
              <div className="bg-[#5A8352] border-b-[5px] border-[#4A6844] p-4">
                <h3 className="text-xl text-[#E8E8D8] font-bold">⬆️ CALL UP TO MLB</h3>
              </div>

              <div className="p-6">
                {/* Player Card */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6 text-center">
                  <div className="text-2xl text-[#E8E8D8] font-bold mb-2">{selectedPlayer.name}</div>
                  <div className="text-sm text-[#E8E8D8]/80 mb-4">
                    {selectedPlayer.position} │ Grade: {selectedPlayer.grade} │ Age: {selectedPlayer.age}
                  </div>
                  <div className="text-lg text-[#FFD700]">⭐ POTENTIAL CEILING: {selectedPlayer.ceiling}</div>
                  <div className="text-sm text-[#E8E8D8]/70">Years in Minors: {selectedPlayer.yearsInMinors}</div>
                </div>

                {/* Call-Up Details */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-4">CALL-UP DETAILS</div>
                  <div className="space-y-2 text-sm text-[#E8E8D8]">
                    <div>📍 Destination: MLB Roster ({selectedTeam.mlbRoster.length}/22 → {selectedTeam.mlbRoster.length + 1}/22)</div>
                    <div>💰 Salary: ${calculateRookieSalary(selectedPlayer.grade).toLocaleString()} (Grade {selectedPlayer.grade} rookie rate)</div>
                    <div>🌟 Status: Will be designated ROOKIE for Season {nextSeason}</div>
                  </div>
                </div>

                {/* Roster Status */}
                {selectedTeam.mlbRoster.length >= 22 ? (
                  <div className="bg-[#5A3A3A] border-[4px] border-[#DD0000] p-6 mb-6">
                    <div className="text-lg text-[#DD0000] font-bold mb-2">⚠️ MLB ROSTER FULL</div>
                    <div className="text-sm text-[#E8E8D8] mb-4">
                      Your MLB roster is at 22/22. You must send down a player first.
                    </div>
                    <button
                      onClick={() => {
                        setShowCallUpModal(false);
                        // Would show send-down picker
                      }}
                      className="text-sm bg-[#4A6844] text-[#E8E8D8] px-4 py-2 border-2 border-[#E8E8D8]/30 hover:bg-[#3D5A37]"
                    >
                      Send Down...
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#4A6844] border-[4px] border-[#4CAF50] p-6 mb-6">
                    <div className="text-sm text-[#4CAF50]">✓ Roster has space - ready to call up</div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between gap-4">
                  <button
                    onClick={() => {
                      setShowCallUpModal(false);
                      setSelectedPlayer(null);
                    }}
                    className="bg-[#4A6844] border-[4px] border-[#E8E8D8]/30 px-6 py-3 text-[#E8E8D8] hover:bg-[#3D5A37] active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmCallUp}
                    disabled={selectedTeam.mlbRoster.length >= 22}
                    className={`bg-[#5A8352] border-[4px] border-[#4CAF50] px-8 py-3 text-[#E8E8D8] font-bold hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] ${selectedTeam.mlbRoster.length >= 22 ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    ✓ Confirm Call-Up
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Send-Down Modal */}
        {showSendDownModal && selectedPlayer && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#6B9462] border-[5px] border-[#4A6844] w-full max-w-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
              <div className="bg-[#5A8352] border-b-[5px] border-[#4A6844] p-4">
                <h3 className="text-xl text-[#E8E8D8] font-bold">⬇️ SEND DOWN TO FARM</h3>
              </div>

              <div className="p-6">
                {/* Player Card */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6 text-center">
                  <div className="text-2xl text-[#E8E8D8] font-bold mb-2">{selectedPlayer.name}</div>
                  <div className="text-sm text-[#E8E8D8]/80 mb-4">
                    {selectedPlayer.position} │ Grade: {selectedPlayer.grade} │ Age: {selectedPlayer.age}
                  </div>
                  <div className="space-y-1 text-sm text-[#E8E8D8]/70">
                    <div>💰 Salary: ${selectedPlayer.salary.toLocaleString()}</div>
                    <div>📊 Last Season WAR: {selectedPlayer.war.toFixed(1)}</div>
                    <div>📅 Years of Service: {selectedPlayer.yearsOfService}</div>
                  </div>
                </div>

                {/* Send-Down Impact */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6 mb-6">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-4">SEND-DOWN IMPACT</div>
                  <div className="space-y-2 text-sm text-[#E8E8D8] mb-4">
                    <div>📍 Destination: Farm Roster ({selectedTeam.farmRoster.length}/10)</div>
                    <div>😔 Morale Impact: -18 (based on {selectedPlayer.yearsOfService} years service)</div>
                    <div className="text-[#DD0000]">⚠️ Retirement Risk: {calculateRetirementRisk(selectedPlayer)}%</div>
                  </div>

                  <div className="bg-[#4A6844] p-4 border-2 border-[#E8E8D8]/30">
                    <div className="text-xs text-[#E8E8D8] font-bold mb-2">RISK BREAKDOWN:</div>
                    <div className="space-y-1 text-xs text-[#E8E8D8]/80">
                      <div>• Age ({selectedPlayer.age}): {selectedPlayer.age >= 35 ? "+20%" : selectedPlayer.age >= 32 ? "+10%" : selectedPlayer.age >= 30 ? "+5%" : "+0%"}</div>
                      <div>• Years of Service ({selectedPlayer.yearsOfService}): {(selectedPlayer.yearsOfService || 0) >= 10 ? "+15%" : (selectedPlayer.yearsOfService || 0) >= 7 ? "+10%" : "+0%"}</div>
                      <div>• Salary (${(selectedPlayer.salary / 1000000).toFixed(1)}M): {selectedPlayer.salary >= 10000000 ? "+15%" : selectedPlayer.salary >= 5000000 ? "+10%" : "+0%"}</div>
                      {selectedPlayer.priorDemotions && <div>• Prior Demotions ({selectedPlayer.priorDemotions}): +{selectedPlayer.priorDemotions * 10}%</div>}
                      <div className="border-t border-[#E8E8D8]/20 pt-1 mt-1">TOTAL RISK: {calculateRetirementRisk(selectedPlayer)}%</div>
                    </div>
                  </div>
                </div>

                {/* High-Grade Warning */}
                {["A+", "A", "A-"].includes(selectedPlayer.grade) && (
                  <div className="bg-[#5A3A3A] border-[4px] border-[#DD0000] p-6 mb-6">
                    <div className="text-lg text-[#DD0000] font-bold mb-2">🚨 WARNING: HIGH-GRADE PLAYER</div>
                    <div className="text-sm text-[#E8E8D8] mb-2">
                      {selectedPlayer.name} is an {selectedPlayer.grade} grade player.
                    </div>
                    <div className="text-sm text-[#E8E8D8] mb-2">
                      High-grade players (A- and above) rarely accept demotion to the minor leagues. This player has a very high retirement risk.
                    </div>
                    <div className="text-sm text-[#DD0000] font-bold">
                      ⚠️ Retirement Risk: {calculateRetirementRisk(selectedPlayer)}%
                    </div>
                  </div>
                )}

                {/* Roster Status */}
                {selectedTeam.farmRoster.length >= 10 && (
                  <div className="bg-[#5A3A3A] border-[4px] border-[#DD0000] p-6 mb-6">
                    <div className="text-lg text-[#DD0000] font-bold mb-2">⚠️ FARM ROSTER FULL</div>
                    <div className="text-sm text-[#E8E8D8] mb-4">
                      Your Farm roster is at 10/10. You must call up a player first.
                    </div>
                    <button className="text-sm bg-[#4A6844] text-[#E8E8D8] px-4 py-2 border-2 border-[#E8E8D8]/30 hover:bg-[#3D5A37]">
                      Call Up...
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between gap-4">
                  <button
                    onClick={() => {
                      setShowSendDownModal(false);
                      setSelectedPlayer(null);
                    }}
                    className="bg-[#4A6844] border-[4px] border-[#E8E8D8]/30 px-6 py-3 text-[#E8E8D8] hover:bg-[#3D5A37] active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmSendDown}
                    disabled={selectedTeam.farmRoster.length >= 10}
                    className={`bg-[#5A8352] border-[4px] border-[#FFC107] px-8 py-3 text-[#E8E8D8] font-bold hover:bg-[#4F7D4B] active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] ${selectedTeam.farmRoster.length >= 10 ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {["A+", "A", "A-"].includes(selectedPlayer.grade) ? "Yes, Send Down Anyway" : "✓ Confirm Send-Down"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
