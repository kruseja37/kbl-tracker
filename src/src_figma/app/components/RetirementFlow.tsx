import { useState, useEffect, useMemo, useCallback } from "react";
import { ArrowLeft, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Trophy, CheckCircle, X } from "lucide-react";
import { useOffseasonData, type OffseasonPlayer, type OffseasonTeam } from "@/hooks/useOffseasonData";
import { useOffseasonState, type RetirementDecision } from "../../hooks/useOffseasonState";

// Types
type Position = "SP" | "RP" | "CP" | "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF";
type Grade = "S" | "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D+" | "D";

interface Player {
  id: string;
  name: string;
  position: Position;
  grade: Grade;
  age: number;
  seasons: number;
  war: number;
  teamId: string;
  jerseyNumber: number;
  awards: string[];
  careerStats: string;
}

interface Team {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
}

interface PlayerHistory {
  teamId: string;
  seasons: number;
  war: number;
  awards: string[];
  jerseyNumber: number;
}

interface Retirement {
  player: Player;
  team: Team;
  jerseyRetirements: string[]; // team IDs where jersey is retired
}

type Screen = 
  | "PROBABILITY" 
  | "ROLLING" 
  | "NO_RETIREMENT" 
  | "RETIREMENT_ANNOUNCEMENT" 
  | "JERSEY_DECISION"
  | "JERSEY_CEREMONY"
  | "PHASE_SUMMARY";

// Mock Data (fallback when real data not available)
const MOCK_TEAMS: Team[] = [];

const MOCK_PLAYERS: Player[] = [];

/**
 * Convert OffseasonPlayer to local Player format
 */
function convertToLocalPlayer(player: OffseasonPlayer): Player {
  return {
    id: player.id,
    name: player.name,
    position: player.position,
    grade: player.grade,
    age: player.age,
    seasons: player.seasons,
    war: player.war,
    teamId: player.teamId,
    jerseyNumber: player.jerseyNumber,
    awards: player.awards,
    careerStats: player.careerStats,
  };
}

/**
 * Convert OffseasonTeam to local Team format
 */
function convertToLocalTeam(team: OffseasonTeam): Team {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
  };
}

// Calculate retirement probability based on age
function calculateRetirementProbability(age: number): number {
  if (age >= 42) return 47;
  if (age >= 41) return 42;
  if (age >= 40) return 38;
  if (age >= 39) return 35;
  if (age >= 38) return 31;
  if (age >= 37) return 27;
  if (age >= 36) return 23;
  if (age >= 35) return 19;
  if (age >= 34) return 16;
  if (age >= 33) return 14;
  if (age >= 32) return 12;
  if (age >= 31) return 10;
  if (age >= 30) return 8;
  if (age >= 29) return 7;
  if (age >= 28) return 6;
  if (age >= 27) return 5;
  if (age >= 26) return 4;
  if (age >= 25) return 3;
  return 2;
}

// Get probability bar color based on percentage
function getProbabilityColor(probability: number): string {
  if (probability >= 40) return "#DC143C"; // Red
  if (probability >= 25) return "#FFA500"; // Orange
  if (probability >= 15) return "#FFD700"; // Yellow
  if (probability >= 5) return "#228B22"; // Green
  return "#4682B4"; // Blue
}

// Get grade color
function getGradeColor(grade: Grade): string {
  const tier = { "S": 11, "A+": 10, "A": 9, "A-": 8, "B+": 7, "B": 6, "B-": 5, "C+": 4, "C": 3, "C-": 2, "D+": 1, "D": 0 }[grade];
  if (tier >= 8) return "#228B22";
  if (tier >= 5) return "#4682B4";
  if (tier >= 2) return "#CD853F";
  return "#B22222";
}

// Generate flavor text for retirement announcement
function getFlavorText(player: Player): string {
  if (player.age >= 40) return `Going out on top after ${player.seasons} seasons`;
  if (player.age >= 35) return "Hanging up the cleats while still in his prime";
  if (player.age >= 30) return "A career cut short, but what a career it was";
  if (player.war > 100) return "One of the all-time greats calls it a career";
  if (player.seasons >= 15) return "A franchise legend says goodbye";
  if (player.awards.some(a => a.includes("MVP"))) return "An MVP-caliber career comes to a close";
  return "A journeyman's journey comes to an end";
}

// Roll retirement dice for a roster
function rollRetirement(roster: Player[]): Player | null {
  // Calculate cumulative probabilities
  const probabilities = roster.map(p => calculateRetirementProbability(p.age));
  const totalProbability = probabilities.reduce((sum, p) => sum + p, 0);
  
  // Roll dice (0-100)
  const roll = Math.random() * 100;
  
  // Check if anyone retires
  let cumulative = 0;
  for (let i = 0; i < roster.length; i++) {
    cumulative += (probabilities[i] / totalProbability) * 50; // 50% base chance someone retires
    if (roll < cumulative) {
      return roster[i];
    }
  }
  
  return null;
}

interface RetirementFlowProps {
  onClose: () => void;
  onRetirementsComplete?: (retiredJerseys: Array<{
    number: number;
    name: string;
    years: string;
    position: string;
    teamId: string;
    retiredYear: number;
  }>) => void;
  seasonId?: string;
  seasonNumber?: number;
}

export function RetirementFlow({ onClose, onRetirementsComplete, seasonId = 'season-1', seasonNumber = 1 }: RetirementFlowProps) {
  // Load real data from playerDatabase via hook
  const { teams: realTeams, players: realPlayers, hasRealData, isLoading } = useOffseasonData();

  // Wire to offseason state for persistence
  const offseasonState = useOffseasonState(seasonId, seasonNumber);
  const [isSaving, setIsSaving] = useState(false);

  // Convert real data to local format, with mock fallback
  const TEAMS: Team[] = useMemo(() => {
    if (hasRealData && realTeams.length > 0) {
      return realTeams.slice(0, 8).map(convertToLocalTeam);
    }
    return MOCK_TEAMS;
  }, [realTeams, hasRealData]);

  const ALL_PLAYERS: Player[] = useMemo(() => {
    if (hasRealData && realPlayers.length > 0) {
      return realPlayers.map(convertToLocalPlayer);
    }
    return MOCK_PLAYERS;
  }, [realPlayers, hasRealData]);

  const [screen, setScreen] = useState<Screen>("PROBABILITY");
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [retirements, setRetirements] = useState<Retirement[]>([]);
  const [currentRetiredPlayer, setCurrentRetiredPlayer] = useState<Player | null>(null);
  const [retirementsThisTeam, setRetirementsThisTeam] = useState(0);
  const [selectedJerseyTeams, setSelectedJerseyTeams] = useState<string[]>([]);
  const [ceremonyTeamIndex, setCeremonyTeamIndex] = useState(0);
  const [isRolling, setIsRolling] = useState(false);

  const currentTeam = TEAMS[currentTeamIndex];

  // Get roster for current team
  const getTeamRoster = (teamId: string): Player[] => {
    return ALL_PLAYERS.filter(p => p.teamId === teamId);
  };

  const currentRoster = getTeamRoster(currentTeam?.id || '');

  // Show loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
        <div className="text-[#E8E8D8] text-xl">Loading retirement data...</div>
      </div>
    );
  }

  // Handle dice roll
  const handleRoll = () => {
    setScreen("ROLLING");
    setIsRolling(true);

    setTimeout(() => {
      const retiredPlayer = rollRetirement(currentRoster);
      
      if (retiredPlayer) {
        setCurrentRetiredPlayer(retiredPlayer);
        setRetirementsThisTeam(retirementsThisTeam + 1);
        setScreen("RETIREMENT_ANNOUNCEMENT");
      } else {
        setScreen("NO_RETIREMENT");
      }
      
      setIsRolling(false);
    }, 2000);
  };

  // Advance to jersey decision
  const handleProceedToJersey = () => {
    setScreen("JERSEY_DECISION");
  };

  // Skip jersey retirement
  const handleSkipJersey = () => {
    if (currentRetiredPlayer) {
      const retirement: Retirement = {
        player: currentRetiredPlayer,
        team: currentTeam,
        jerseyRetirements: [],
      };
      setRetirements([...retirements, retirement]);
    }
    advanceToNextTeam();
  };

  // Confirm jersey retirements
  const handleConfirmJersey = () => {
    if (selectedJerseyTeams.length > 0) {
      setCeremonyTeamIndex(0);
      setScreen("JERSEY_CEREMONY");
    } else {
      handleSkipJersey();
    }
  };

  // Continue from jersey ceremony
  const handleContinueFromCeremony = () => {
    if (ceremonyTeamIndex < selectedJerseyTeams.length - 1) {
      setCeremonyTeamIndex(ceremonyTeamIndex + 1);
    } else {
      // All ceremonies complete
      if (currentRetiredPlayer) {
        const retirement: Retirement = {
          player: currentRetiredPlayer,
          team: currentTeam,
          jerseyRetirements: selectedJerseyTeams,
        };
        setRetirements([...retirements, retirement]);
      }
      advanceToNextTeam();
    }
  };

  // Try another roll
  const handleTryAgain = () => {
    if (retirementsThisTeam < 2) {
      setScreen("PROBABILITY");
    } else {
      advanceToNextTeam();
    }
  };

  // Skip to next team
  const handleSkipToNext = () => {
    advanceToNextTeam();
  };

  // Advance to next team
  const advanceToNextTeam = () => {
    if (currentTeamIndex < TEAMS.length - 1) {
      setCurrentTeamIndex(currentTeamIndex + 1);
      setScreen("PROBABILITY");
      setCurrentRetiredPlayer(null);
      setRetirementsThisTeam(0);
      setSelectedJerseyTeams([]);
      setCeremonyTeamIndex(0);
    } else {
      setScreen("PHASE_SUMMARY");
      if (onRetirementsComplete) {
        const retiredJerseys = retirements.flatMap(retirement =>
          retirement.jerseyRetirements.map(teamId => ({
            number: retirement.player.jerseyNumber,
            name: retirement.player.name,
            years: `${retirement.player.seasons} seasons`,
            position: retirement.player.position,
            teamId: teamId,
            retiredYear: 2026,
          }))
        );
        onRetirementsComplete(retiredJerseys);
      }
    }
  };

  // Save retirements and close
  const saveAndClose = useCallback(async () => {
    if (retirements.length === 0) {
      onClose();
      return;
    }

    try {
      setIsSaving(true);
      // Convert to RetirementDecision format
      const retirementDecisions: RetirementDecision[] = retirements.map(r => ({
        playerId: r.player.id,
        playerName: r.player.name,
        teamId: r.team.id,
        age: r.player.age,
        finalOverall: r.player.grade,
        careerWAR: r.player.war,
        reason: r.player.age >= 38 ? 'AGE' : 'VOLUNTARY',
        hallOfFameEligible: r.player.war >= 60 || r.player.seasons >= 15,
        retiredAt: Date.now(),
      }));

      await offseasonState.saveRetirementDecisions(retirementDecisions);
      console.log(`[RetirementFlow] Saved ${retirementDecisions.length} retirements`);
      onClose();
    } catch (err) {
      console.error('[RetirementFlow] Failed to save retirements:', err);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [retirements, offseasonState, onClose]);

  return (
    <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto">
      <div className="min-h-screen p-4">
        {/* Header */}
        <div className="max-w-5xl mx-auto mb-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-[#E8E8D8] hover:text-[#DD0000] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <div className="text-center">
            <div className="text-xl text-[#E8E8D8]">RETIREMENTS - Phase 5</div>
            {screen !== "PHASE_SUMMARY" && (
              <div className="text-xs text-[#E8E8D8]/60">Team {currentTeamIndex + 1} of {TEAMS.length}</div>
            )}
          </div>
          <div className="w-20"></div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto">
          {screen === "PROBABILITY" && (
            <ProbabilityScreen
              team={currentTeam}
              roster={currentRoster}
              retirementsThisTeam={retirementsThisTeam}
              onRoll={handleRoll}
            />
          )}

          {screen === "ROLLING" && (
            <RollingScreen />
          )}

          {screen === "NO_RETIREMENT" && (
            <NoRetirementScreen
              retirementsThisTeam={retirementsThisTeam}
              onTryAgain={handleTryAgain}
              onSkipToNext={handleSkipToNext}
            />
          )}

          {screen === "RETIREMENT_ANNOUNCEMENT" && currentRetiredPlayer && (
            <RetirementAnnouncementScreen
              player={currentRetiredPlayer}
              retirementsThisTeam={retirementsThisTeam}
              onProceedToJersey={handleProceedToJersey}
              onSecondRoll={retirementsThisTeam < 2 ? handleTryAgain : undefined}
            />
          )}

          {screen === "JERSEY_DECISION" && currentRetiredPlayer && (
            <JerseyDecisionScreen
              player={currentRetiredPlayer}
              selectedTeams={selectedJerseyTeams}
              onToggleTeam={(teamId) => {
                if (selectedJerseyTeams.includes(teamId)) {
                  setSelectedJerseyTeams(selectedJerseyTeams.filter(t => t !== teamId));
                } else {
                  setSelectedJerseyTeams([...selectedJerseyTeams, teamId]);
                }
              }}
              onSkip={handleSkipJersey}
              onConfirm={handleConfirmJersey}
              allTeams={TEAMS}
            />
          )}

          {screen === "JERSEY_CEREMONY" && currentRetiredPlayer && (
            <JerseyCeremonyScreen
              player={currentRetiredPlayer}
              team={TEAMS.find(t => t.id === selectedJerseyTeams[ceremonyTeamIndex])!}
              onContinue={handleContinueFromCeremony}
            />
          )}

          {screen === "PHASE_SUMMARY" && (
            <PhaseSummaryScreen
              retirements={retirements}
              onClose={saveAndClose}
              teamsCount={TEAMS.length}
              isSaving={isSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Screen: Probability Table
function ProbabilityScreen({
  team,
  roster,
  retirementsThisTeam,
  onRoll,
}: {
  team: Team;
  roster: Player[];
  retirementsThisTeam: number;
  onRoll: () => void;
}) {
  const sortedRoster = [...roster].sort((a, b) => 
    calculateRetirementProbability(b.age) - calculateRetirementProbability(a.age)
  );

  return (
    <div className="space-y-4">
      {/* Team Header */}
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl text-white font-bold"
            style={{ backgroundColor: team.primaryColor }}
          >
            {team.shortName[0]}
          </div>
          <div>
            <div className="text-xl text-[#E8E8D8]">{team.name}</div>
          </div>
        </div>
        <div className="text-sm text-[#E8E8D8]/80">
          Review retirement probabilities for this team. Older players have higher chances of retiring.
        </div>
      </div>

      {/* Probability Table */}
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg text-[#E8E8D8]">📊 RETIREMENT PROBABILITIES</div>
          <div className="text-xs text-[#E8E8D8]/60">Sorted by Risk ▼</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#E8E8D8]/20">
                <th className="text-left py-2 px-3 text-[#E8E8D8]/80">AGE</th>
                <th className="text-left py-2 px-3 text-[#E8E8D8]/80">PLAYER</th>
                <th className="text-left py-2 px-3 text-[#E8E8D8]/80">POS</th>
                <th className="text-left py-2 px-3 text-[#E8E8D8]/80">GRADE</th>
                <th className="text-left py-2 px-3 text-[#E8E8D8]/80">RETIRE %</th>
              </tr>
            </thead>
            <tbody>
              {sortedRoster.map((player) => {
                const probability = calculateRetirementProbability(player.age);
                const color = getProbabilityColor(probability);
                
                return (
                  <tr key={player.id} className="border-b border-[#E8E8D8]/10">
                    <td className="py-3 px-3 text-[#E8E8D8] font-bold text-center">{player.age}</td>
                    <td className="py-3 px-3 text-[#E8E8D8]">{player.name}</td>
                    <td className="py-3 px-3 text-[#E8E8D8]/60">{player.position}</td>
                    <td className="py-3 px-3">
                      <span
                        className="px-2 py-1 text-xs text-white rounded"
                        style={{ backgroundColor: getGradeColor(player.grade) }}
                      >
                        {player.grade}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[120px] bg-[#E8E8D8]/20 h-4 rounded overflow-hidden">
                          <div
                            className="h-full"
                            style={{ 
                              width: `${(probability / 50) * 100}%`,
                              backgroundColor: color 
                            }}
                          ></div>
                        </div>
                        <span className="text-xs text-[#E8E8D8]/80 w-12">{probability}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Footer */}
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4">
        <div className="flex items-center justify-between text-sm text-[#E8E8D8]">
          <div>Retirements this team: <span className="font-bold">{retirementsThisTeam}/2</span></div>
          <div className="text-[#E8E8D8]/60">Target: 1-2 per team</div>
        </div>
      </div>

      {/* Roll Button */}
      <button
        onClick={onRoll}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        🎲 REVEAL RETIREMENT 🎲
      </button>

      <div className="text-center text-xs text-[#E8E8D8]/60">
        Roll to see if anyone retires. Probability determines who.
      </div>
    </div>
  );
}

// Screen: Rolling Animation
function RollingScreen() {
  return (
    <div className="space-y-8 py-12">
      <div className="text-center">
        <div className="w-32 h-32 mx-auto mb-6 animate-bounce">
          <div className="text-8xl">🎲</div>
        </div>
        <div className="text-2xl text-[#E8E8D8] mb-2">Rolling...</div>
        <div className="text-sm text-[#E8E8D8]/60">Checking retirement rolls...</div>
      </div>

      <div className="max-w-md mx-auto bg-[#5A8352] border-[5px] border-[#C4A853] p-4">
        <div className="bg-[#4A6844] h-6 rounded overflow-hidden">
          <div className="h-full bg-[#E8E8D8] animate-pulse" style={{ width: '60%' }}></div>
        </div>
        <div className="text-center text-xs text-[#E8E8D8]/60 mt-2">▲ Scanning roster...</div>
      </div>
    </div>
  );
}

// Screen: No Retirement
function NoRetirementScreen({
  retirementsThisTeam,
  onTryAgain,
  onSkipToNext,
}: {
  retirementsThisTeam: number;
  onTryAgain: () => void;
  onSkipToNext: () => void;
}) {
  return (
    <div className="space-y-6 py-12">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-12 text-center">
        <div className="text-6xl mb-4">✓</div>
        <div className="text-2xl text-[#E8E8D8] mb-4">NO RETIREMENT</div>
        <div className="text-base text-[#E8E8D8]/80">
          The dice rolled in their favor — everyone stays!
        </div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4">
        <div className="text-sm text-[#E8E8D8] text-center">
          Retirements this team: <span className="font-bold">{retirementsThisTeam}/2</span>
        </div>
      </div>

      <div className="flex gap-4">
        {retirementsThisTeam < 2 && (
          <button
            onClick={onTryAgain}
            className="flex-1 bg-[#4A6844] border-[5px] border-[#5A8352] py-3 text-base text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            🎲 TRY AGAIN
          </button>
        )}
        <button
          onClick={onSkipToNext}
          className="flex-1 bg-[#5A8352] border-[5px] border-[#4A6844] py-3 text-base text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          SKIP TO NEXT TEAM →
        </button>
      </div>

      <div className="text-center text-xs text-[#E8E8D8]/60">
        Each team may have 0-2 retirements. No retirement is valid.
      </div>
    </div>
  );
}

// Screen: Retirement Announcement
function RetirementAnnouncementScreen({
  player,
  retirementsThisTeam,
  onProceedToJersey,
  onSecondRoll,
}: {
  player: Player;
  retirementsThisTeam: number;
  onProceedToJersey: () => void;
  onSecondRoll?: () => void;
}) {
  const flavorText = getFlavorText(player);

  return (
    <div className="space-y-6">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 text-center">
        <div className="text-2xl text-[#E8E8D8]">🎩 RETIREMENT 🎩</div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-12">
        <div className="max-w-md mx-auto text-center space-y-6">
          {/* Player Photo */}
          <div className="w-32 h-32 bg-[#E8E8D8] rounded-full flex items-center justify-center text-4xl mx-auto">
            {player.name.split(' ').map(n => n[0]).join('')}
          </div>

          {/* Player Name */}
          <div>
            <div className="text-3xl text-[#E8E8D8] mb-2">{player.name}</div>
            <div className="text-base text-[#E8E8D8]/80">
              Age {player.age} • {player.position} • Grade {player.grade}
            </div>
          </div>

          {/* Flavor Text */}
          <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4 italic text-[#E8E8D8]">
            "{flavorText}"
          </div>

          {/* Career Highlights */}
          <div className="text-left bg-[#4A6844] border-[3px] border-[#5A8352] p-6">
            <div className="text-lg text-[#E8E8D8] mb-3 border-b border-[#E8E8D8]/20 pb-2">
              CAREER HIGHLIGHTS
            </div>
            <div className="space-y-2 text-sm text-[#E8E8D8]/90">
              <div>• {player.seasons} Seasons</div>
              <div>• {player.careerStats}</div>
              {player.awards.map((award, i) => (
                <div key={i}>• {award}</div>
              ))}
              <div>• Career WAR: {player.war.toFixed(1)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4">
        <div className="text-sm text-[#E8E8D8] text-center">
          Retirements this team: <span className="font-bold">{retirementsThisTeam}/2</span>
        </div>
      </div>

      <div className="flex gap-4">
        {onSecondRoll && (
          <button
            onClick={onSecondRoll}
            className="flex-1 bg-[#4A6844] border-[5px] border-[#5A8352] py-3 text-base text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            🎲 SECOND ROLL
          </button>
        )}
        <button
          onClick={onProceedToJersey}
          className="flex-1 bg-[#5A8352] border-[5px] border-[#4A6844] py-3 text-base text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          RETIRE JERSEY →
        </button>
      </div>
    </div>
  );
}

// Screen: Jersey Decision
function JerseyDecisionScreen({
  player,
  selectedTeams,
  onToggleTeam,
  onSkip,
  onConfirm,
  allTeams,
}: {
  player: Player;
  selectedTeams: string[];
  onToggleTeam: (teamId: string) => void;
  onSkip: () => void;
  onConfirm: () => void;
  allTeams: Team[];
}) {
  // Mock: player has played for 2 teams (use first 2 from allTeams)
  const teamsPlayedFor = [
    {
      team: allTeams[0],
      seasons: 8,
      war: 32.1,
      awards: ["2× Cy Young"],
      jerseyNumber: player.jerseyNumber
    },
    {
      team: allTeams[1],
      seasons: 12,
      war: 48.7,
      awards: ["3× Cy Young", "1× MVP"],
      jerseyNumber: player.jerseyNumber
    },
  ].filter(h => h.team); // Filter out undefined teams

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 text-center">
        <div className="text-2xl text-[#E8E8D8]">🏆 JERSEY RETIREMENT 🏆</div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
        <div className="text-base text-[#E8E8D8] mb-2">
          {player.name} has retired.
        </div>
        <div className="text-sm text-[#E8E8D8]/80">
          Would you like to retire his jersey?
        </div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
        <div className="text-lg text-[#E8E8D8] mb-4">TEAMS PLAYED FOR:</div>

        <div className="space-y-3">
          {teamsPlayedFor.map((history) => {
            const isSelected = selectedTeams.includes(history.team.id);
            
            return (
              <button
                key={history.team.id}
                onClick={() => onToggleTeam(history.team.id)}
                className="w-full bg-[#4A6844] border-[3px] border-[#5A8352] p-4 hover:bg-[#3F5A3A] transition-colors text-left"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#E8E8D8] border-[#E8E8D8]' : 'border-[#E8E8D8]'}`}>
                    {isSelected && <CheckCircle className="w-6 h-6 text-[#228B22]" />}
                  </div>
                  
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: history.team.primaryColor }}
                  >
                    {history.team.shortName[0]}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-base text-[#E8E8D8] mb-1">
                      {history.team.name} (#{history.jerseyNumber})
                    </div>
                    <div className="text-sm text-[#E8E8D8]/70">
                      {history.seasons} seasons | {history.war.toFixed(1)} WAR | {history.awards.join(" | ")}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-[#4169E1]/20 border-l-4 border-[#4169E1] p-4">
        <div className="flex items-start gap-2 text-sm text-[#E8E8D8]">
          <span className="text-lg">💡</span>
          <div>
            <div className="font-bold mb-1">Retired numbers cannot be reassigned to future players.</div>
            <div className="text-[#E8E8D8]/80">
              This decision is entirely your choice — no eligibility rules.
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onSkip}
          className="flex-1 bg-[#4A6844] border-[5px] border-[#5A8352] py-3 text-base text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          SKIP
        </button>
        <button
          onClick={onConfirm}
          disabled={selectedTeams.length === 0}
          className="flex-1 bg-[#5A8352] border-[5px] border-[#4A6844] py-3 text-base text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          RETIRE SELECTED
        </button>
      </div>
    </div>
  );
}

// Screen: Jersey Ceremony
function JerseyCeremonyScreen({
  player,
  team,
  onContinue,
}: {
  player: Player;
  team: Team;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-8 py-12">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 text-center">
        <div className="text-2xl text-[#E8E8D8]">🏆 JERSEY RETIRED 🏆</div>
      </div>

      <div className="text-center">
        {/* Jersey Display */}
        <div 
          className="w-48 h-64 mx-auto rounded-lg border-8 flex flex-col items-center justify-center relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
          style={{ 
            backgroundColor: team.primaryColor,
            borderColor: team.secondaryColor,
          }}
        >
          <div 
            className="text-2xl font-bold mb-2"
            style={{ color: team.secondaryColor }}
          >
            {player.name.split(' ')[1].toUpperCase()}
          </div>
          <div 
            className="text-7xl font-bold"
            style={{ color: team.secondaryColor }}
          >
            {player.jerseyNumber}
          </div>
        </div>
        
        <div className="text-xl text-[#E8E8D8] mt-6 mb-2">2026</div>
        <div className="text-2xl text-[#E8E8D8] mb-6">{team.name}</div>

        <div className="max-w-md mx-auto border-t border-b border-[#E8E8D8]/20 py-4 mb-8">
          <div className="text-base text-[#E8E8D8] italic">
            "Jersey #{player.jerseyNumber} will hang in the rafters forever at {team.name.split(' ')[0]} Stadium"
          </div>
        </div>
      </div>

      <button
        onClick={onContinue}
        className="max-w-md mx-auto block w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        CONTINUE
      </button>
    </div>
  );
}

// Screen: Phase Summary
function PhaseSummaryScreen({
  retirements,
  onClose,
  teamsCount,
  isSaving,
}: {
  retirements: Retirement[];
  onClose: () => void;
  teamsCount: number;
  isSaving?: boolean;
}) {
  const totalRetirements = retirements.length;
  const totalJerseyRetirements = retirements.reduce((sum, r) => sum + r.jerseyRetirements.length, 0);

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 text-center">
        <div className="text-2xl text-[#E8E8D8] mb-6">RETIREMENT PHASE COMPLETE</div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4">
            <div className="text-3xl text-[#E8E8D8]">{totalRetirements}</div>
            <div className="text-xs text-[#E8E8D8]/60">PLAYERS<br/>Retired</div>
          </div>
          <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4">
            <div className="text-3xl text-[#E8E8D8]">{totalJerseyRetirements}</div>
            <div className="text-xs text-[#E8E8D8]/60">JERSEYS<br/>Retired</div>
          </div>
          <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4">
            <div className="text-3xl text-[#E8E8D8]">{teamsCount}</div>
            <div className="text-xs text-[#E8E8D8]/60">TEAMS<br/>Processed</div>
          </div>
        </div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
        <div className="text-lg text-[#E8E8D8] mb-4">RETIREMENTS</div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {retirements.map((retirement, index) => (
            <div key={index} className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎩</span>
                  <div>
                    <div className="text-base text-[#E8E8D8]">
                      {retirement.player.name} ({retirement.player.position}, {retirement.player.grade})
                    </div>
                    <div className="text-sm text-[#E8E8D8]/60">
                      {retirement.team.shortName}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-[#E8E8D8]/80">
                  {retirement.jerseyRetirements.length > 0 ? (
                    <span>🏆 #{retirement.player.jerseyNumber} retired</span>
                  ) : (
                    <span>(no jersey)</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {retirements.length === 0 && (
            <div className="text-center py-8 text-[#E8E8D8]/60">
              No retirements this season
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4">
        <div className="text-sm text-[#E8E8D8]">
          <span className="font-bold">EMPTY ROSTER SLOTS CREATED: {totalRetirements}</span>
        </div>
        <div className="text-xs text-[#E8E8D8]/60 mt-1">
          These will be filled during the Draft phase.
        </div>
      </div>

      <button
        onClick={onClose}
        disabled={isSaving}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50 active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        {isSaving ? 'Saving Retirements...' : 'SAVE & CONTINUE TO FREE AGENCY'}
      </button>
    </div>
  );
}