import { useState, useEffect, useMemo, useCallback } from "react";
import { Lock, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Trophy, Heart, Frown, Smile, Zap, Shield, Crown, ArrowRight, ArrowLeft, CheckCircle, Star, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { useOffseasonData, type OffseasonPlayer, type OffseasonTeam } from "@/hooks/useOffseasonData";
import { useOffseasonState, type FreeAgentSigning } from "../../hooks/useOffseasonState";

// Types
type Personality = "COMPETITIVE" | "RELAXED" | "DROOPY" | "JOLLY" | "TOUGH" | "TIMID" | "EGOTISTICAL";
type Grade = "S" | "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D+" | "D";
type Position = "SP" | "RP" | "CP" | "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF";

interface Player {
  id: string;
  name: string;
  position: Position;
  grade: Grade;
  personality: Personality;
  salary: number;
  teamId: string;
}

interface Team {
  id: string;
  name: string;
  shortName: string;
  record: { wins: number; losses: number };
  primaryColor: string;
  secondaryColor: string;
}

interface DiceAssignment {
  diceValue: number;
  player: Player;
  probability: number;
}

interface Move {
  player: Player;
  fromTeam: Team;
  toTeam: Team | null;
  reason: string;
  returnPlayer?: Player;
  outcome: "MOVED" | "STAYED" | "RETIRED";
  round: number;
}

type Screen = "PROTECTION" | "DICE_ROLL" | "DESTINATION" | "EXCHANGE" | "ROUND_SUMMARY" | "FINAL_SUMMARY";

// Empty fallback — populated from IndexedDB when available
const EMPTY_TEAMS: Team[] = [];

const EMPTY_PLAYERS: Player[] = [];

/**
 * Convert OffseasonPlayer to local Player format
 */
function convertToLocalPlayer(player: OffseasonPlayer): Player {
  return {
    id: player.id,
    name: player.name,
    position: player.position,
    grade: player.grade,
    personality: player.personality,
    salary: player.salary,
    teamId: player.teamId,
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
    record: team.record,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
  };
}

const PERSONALITY_INFO = {
  COMPETITIVE: { icon: Trophy, color: "#FFD700", label: "COMPETITIVE", description: "Wants to beat the best" },
  RELAXED: { icon: Heart, color: "#20B2AA", label: "RELAXED", description: "Goes with the flow" },
  DROOPY: { icon: Frown, color: "#808080", label: "DROOPY", description: "Lost the spark" },
  JOLLY: { icon: Smile, color: "#FFA500", label: "JOLLY", description: "Happy where they are" },
  TOUGH: { icon: Zap, color: "#DC143C", label: "TOUGH", description: "Wants to hit dingers" },
  TIMID: { icon: Shield, color: "#4169E1", label: "TIMID", description: "Wants a sure thing" },
  EGOTISTICAL: { icon: Crown, color: "#8B008B", label: "EGOTISTICAL", description: "Wants to be the star" },
};

const DICE_PROBABILITIES = [
  { value: 2, probability: 2.8 },
  { value: 3, probability: 5.6 },
  { value: 4, probability: 8.3 },
  { value: 5, probability: 11.1 },
  { value: 6, probability: 13.9 },
  { value: 7, probability: 16.7 },
  { value: 8, probability: 13.9 },
  { value: 9, probability: 11.1 },
  { value: 10, probability: 8.3 },
  { value: 11, probability: 5.6 },
  { value: 12, probability: 2.8 },
];

function getGradeTier(grade: Grade): number {
  const tiers: { [key in Grade]: number } = {
    "S": 11, "A+": 10, "A": 9, "A-": 8,
    "B+": 7, "B": 6, "B-": 5,
    "C+": 4, "C": 3, "C-": 2,
    "D+": 1, "D": 0,
  };
  return tiers[grade];
}

function getGradeColor(grade: Grade): string {
  const tier = getGradeTier(grade);
  if (tier >= 8) return "#228B22";
  if (tier >= 5) return "#4682B4";
  if (tier >= 2) return "#CD853F";
  return "#B22222";
}

function getDiceIcon(value: number) {
  const icons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
  return icons[Math.min(value - 1, 5)] || Dice6;
}

interface FreeAgencyFlowProps {
  onClose: () => void;
  seasonId?: string;
  seasonNumber?: number;
}

export function FreeAgencyFlow({ onClose, seasonId = 'season-1', seasonNumber = 1 }: FreeAgencyFlowProps) {
  // Load real data from playerDatabase via hook
  const { teams: realTeams, players: realPlayers, hasRealData, isLoading } = useOffseasonData();

  // Wire to offseason state for persistence
  const offseasonState = useOffseasonState(seasonId, seasonNumber);
  const [isSaving, setIsSaving] = useState(false);

  // Convert real data to local format, with mock fallback
  const TEAMS: Team[] = useMemo(() => {
    if (hasRealData && realTeams.length > 0) {
      return realTeams.slice(0, 8).map(convertToLocalTeam); // Limit to 8 teams for free agency flow
    }
    return EMPTY_TEAMS;
  }, [realTeams, hasRealData]);

  const ALL_PLAYERS: Player[] = useMemo(() => {
    if (hasRealData && realPlayers.length > 0) {
      return realPlayers.map(convertToLocalPlayer);
    }
    return EMPTY_PLAYERS;
  }, [realPlayers, hasRealData]);

  const [screen, setScreen] = useState<Screen>("PROTECTION");
  const [currentRound, setCurrentRound] = useState(1);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [protectedPlayers, setProtectedPlayers] = useState<{ [teamId: string]: Player }>({});
  const [selectedProtection, setSelectedProtection] = useState<Player | null>(null);
  const [diceAssignments, setDiceAssignments] = useState<DiceAssignment[]>([]);
  const [rolledValue, setRolledValue] = useState<number | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [destinationTeam, setDestinationTeam] = useState<Team | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<Player | null>(null);
  const [allMoves, setAllMoves] = useState<Move[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(1);

  const currentTeam = TEAMS[currentTeamIndex];

  // Get roster for current team
  const getTeamRoster = (teamId: string): Player[] => {
    return ALL_PLAYERS.filter(p => p.teamId === teamId);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
        <div className="text-[#E8E8D8] text-xl">Loading free agency data...</div>
      </div>
    );
  }

  // Create dice assignments for current team
  const createDiceAssignments = (teamId: string, protectedPlayerId?: string): DiceAssignment[] => {
    const roster = getTeamRoster(teamId).filter(p => p.id !== protectedPlayerId);
    const sorted = [...roster].sort((a, b) => getGradeTier(b.grade) - getGradeTier(a.grade));
    
    return DICE_PROBABILITIES.map((dice, index) => ({
      diceValue: dice.value,
      player: sorted[index] || sorted[0],
      probability: dice.probability,
    }));
  };

  // Start protection selection
  useEffect(() => {
    if (screen === "PROTECTION") {
      setSelectedProtection(null);
    }
  }, [screen, currentTeamIndex]);

  // Confirm protection
  const confirmProtection = () => {
    if (!selectedProtection) return;
    
    setProtectedPlayers({ ...protectedPlayers, [currentTeam.id]: selectedProtection });
    const assignments = createDiceAssignments(currentTeam.id, selectedProtection.id);
    setDiceAssignments(assignments);
    setScreen("DICE_ROLL");
  };

  // Roll dice
  const rollDice = () => {
    if (!diceAssignments || diceAssignments.length === 0) {
      console.error("Cannot roll dice: assignments are empty");
      return;
    }
    
    setIsRolling(true);
    
    // Capture current assignments to avoid stale closure
    const currentAssignments = [...diceAssignments];
    
    // Animate dice
    const interval = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      const finalDice1 = Math.floor(Math.random() * 6) + 1;
      const finalDice2 = Math.floor(Math.random() * 6) + 1;
      const total = finalDice1 + finalDice2;
      
      setDice1(finalDice1);
      setDice2(finalDice2);
      setRolledValue(total);
      
      const assignment = currentAssignments.find(a => a.diceValue === total);
      if (assignment) {
        setSelectedPlayer(assignment.player);
      } else {
        console.error(`No assignment found for dice value ${total}`);
      }
      
      setIsRolling(false);
    }, 1500);
  };

  // Determine destination based on personality
  const determineDestination = (): { team: Team | null; outcome: "MOVED" | "STAYED" | "RETIRED"; reason: string } => {
    if (!selectedPlayer) return { team: null, outcome: "STAYED", reason: "" };

    const personality = selectedPlayer.personality;
    const currentTeam = TEAMS.find(t => t.id === selectedPlayer.teamId)!;

    switch (personality) {
      case "COMPETITIVE": {
        // Find rival (closest to .500 head-to-head)
        const rival = TEAMS.find(t => t.id === "redsox") || TEAMS[1];
        return { team: rival, outcome: "MOVED", reason: `Your rival! (${rival.record.wins}-${rival.record.losses})` };
      }
      case "RELAXED": {
        // 50% stay, 50% random team
        if (Math.random() > 0.5) {
          return { team: currentTeam, outcome: "STAYED", reason: "Likes it here" };
        }
        const randomTeam = TEAMS[Math.floor(Math.random() * TEAMS.length)];
        return { team: randomTeam, outcome: "MOVED", reason: "Felt like a change" };
      }
      case "DROOPY": {
        return { team: null, outcome: "RETIRED", reason: "Lost the spark" };
      }
      case "JOLLY": {
        return { team: currentTeam, outcome: "STAYED", reason: "Happy where they are" };
      }
      case "TOUGH": {
        // Highest OPS team
        const bestTeam = TEAMS.reduce((a, b) => a.record.wins > b.record.wins ? a : b);
        return { team: bestTeam, outcome: "MOVED", reason: "Wants to mash" };
      }
      case "TIMID": {
        // Best record team
        const champion = TEAMS.reduce((a, b) => a.record.wins > b.record.wins ? a : b);
        return { team: champion, outcome: "MOVED", reason: "Wants a ring" };
      }
      case "EGOTISTICAL": {
        // Worst team
        const worstTeam = TEAMS.reduce((a, b) => a.record.wins < b.record.wins ? a : b);
        return { team: worstTeam, outcome: "MOVED", reason: "Wants to be the star" };
      }
      default:
        return { team: currentTeam, outcome: "STAYED", reason: "" };
    }
  };

  const seeDestination = () => {
    const destination = determineDestination();
    setDestinationTeam(destination.team);
    
    if (destination.outcome === "MOVED" && destination.team && destination.team.id !== currentTeam.id) {
      setScreen("DESTINATION");
    } else {
      // Record move and continue
      recordMove(destination.team, destination.outcome, destination.reason);
      advanceToNextTeam();
    }
  };

  const recordMove = (toTeam: Team | null, outcome: "MOVED" | "STAYED" | "RETIRED", reason: string, returnPlayer?: Player) => {
    if (!selectedPlayer) return;
    
    const move: Move = {
      player: selectedPlayer,
      fromTeam: currentTeam,
      toTeam,
      reason,
      returnPlayer,
      outcome,
      round: currentRound,
    };
    
    setAllMoves([...allMoves, move]);
  };

  const continueFromDestination = () => {
    if (!selectedPlayer || !destinationTeam) return;
    
    // Check if exchange needed
    const needsExchange = destinationTeam.id !== currentTeam.id;
    
    if (needsExchange) {
      setScreen("EXCHANGE");
    } else {
      recordMove(destinationTeam, "STAYED", "Happy here");
      advanceToNextTeam();
    }
  };

  const confirmExchange = () => {
    if (!selectedReturn) return;
    
    recordMove(destinationTeam, "MOVED", PERSONALITY_INFO[selectedPlayer!.personality].description, selectedReturn);
    advanceToNextTeam();
  };

  const advanceToNextTeam = () => {
    if (currentTeamIndex < TEAMS.length - 1) {
      setCurrentTeamIndex(currentTeamIndex + 1);
      setScreen("PROTECTION");
      setSelectedProtection(null);
      setRolledValue(null);
      setSelectedPlayer(null);
      setDestinationTeam(null);
      setSelectedReturn(null);
      setDiceAssignments([]);
      setDice1(1);
      setDice2(1);
    } else {
      // Round complete
      if (currentRound === 1) {
        setScreen("ROUND_SUMMARY");
      } else {
        setScreen("FINAL_SUMMARY");
      }
    }
  };

  const startNextRound = () => {
    setCurrentRound(2);
    setCurrentTeamIndex(0);
    setScreen("PROTECTION");
    setProtectedPlayers({});
  };

  const roster = getTeamRoster(currentTeam.id);
  const eligible = roster.filter(p => !protectedPlayers[currentTeam.id] || protectedPlayers[currentTeam.id].id !== p.id);
  const sortedRoster = [...roster].sort((a, b) => getGradeTier(b.grade) - getGradeTier(a.grade));
  const recommended = sortedRoster[0];

  // Save free agency results and close
  const saveAndClose = useCallback(async () => {
    try {
      setIsSaving(true);
      // Convert moves to FreeAgentSigning format
      const signings: FreeAgentSigning[] = allMoves
        .filter(m => m.outcome === 'MOVED' && m.toTeam)
        .map(m => ({
          playerId: m.player.id,
          playerName: m.player.name,
          previousTeamId: m.fromTeam.id,
          newTeamId: m.toTeam!.id,
          contractYears: 1, // Default 1 year
          contractValue: m.player.salary * 1000000, // Convert to full value
          signedAt: Date.now(),
        }));

      const declinedPlayers = allMoves
        .filter(m => m.outcome === 'RETIRED')
        .map(m => m.player.id);

      if (signings.length > 0 || declinedPlayers.length > 0) {
        await offseasonState.saveFreeAgentSignings(signings, declinedPlayers);
        console.log(`[FreeAgencyFlow] Saved ${signings.length} signings, ${declinedPlayers.length} declined`);
      }
      onClose();
    } catch (err) {
      console.error('[FreeAgencyFlow] Failed to save free agency data:', err);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [allMoves, offseasonState, onClose]);

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
            <div className="text-xl text-[#E8E8D8]">FREE AGENCY - {screen.replace("_", " ")}</div>
            <div className="text-xs text-[#E8E8D8]/60">ROUND {currentRound} OF 2</div>
          </div>
          <div className="w-20"></div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto">
          {screen === "PROTECTION" && (
            <ProtectionScreen
              team={currentTeam}
              roster={sortedRoster}
              recommended={recommended}
              selectedProtection={selectedProtection}
              onSelectProtection={setSelectedProtection}
              onConfirm={confirmProtection}
            />
          )}

          {screen === "DICE_ROLL" && (
            <DiceRollScreen
              team={currentTeam}
              protectedPlayer={protectedPlayers[currentTeam.id]}
              assignments={diceAssignments}
              dice1={dice1}
              dice2={dice2}
              rolledValue={rolledValue}
              selectedPlayer={selectedPlayer}
              isRolling={isRolling}
              onRoll={rollDice}
              onContinue={seeDestination}
              onUpdateAssignments={setDiceAssignments}
              protectedPlayerId={protectedPlayers[currentTeam.id]?.id}
              createDiceAssignments={createDiceAssignments}
              teamId={currentTeam.id}
            />
          )}

          {screen === "DESTINATION" && (
            <DestinationScreen
              player={selectedPlayer!}
              fromTeam={currentTeam}
              toTeam={destinationTeam}
              onContinue={continueFromDestination}
            />
          )}

          {screen === "EXCHANGE" && (
            <ExchangeScreen
              incomingPlayer={selectedPlayer!}
              fromTeam={currentTeam}
              toTeam={destinationTeam!}
              selectedReturn={selectedReturn}
              onSelectReturn={setSelectedReturn}
              onConfirm={confirmExchange}
              allPlayers={ALL_PLAYERS}
            />
          )}

          {screen === "ROUND_SUMMARY" && (
            <RoundSummaryScreen
              round={currentRound}
              moves={allMoves.filter(m => m.round === currentRound)}
              onContinue={startNextRound}
            />
          )}

          {screen === "FINAL_SUMMARY" && (
            <FinalSummaryScreen
              moves={allMoves}
              onClose={saveAndClose}
              isSaving={isSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Protection Screen Component
function ProtectionScreen({
  team,
  roster,
  recommended,
  selectedProtection,
  onSelectProtection,
  onConfirm,
}: {
  team: Team;
  roster: Player[];
  recommended: Player;
  selectedProtection: Player | null;
  onSelectProtection: (player: Player) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-[#E8E8D8] rounded-full flex items-center justify-center text-2xl">
            {team.shortName[0]}
          </div>
          <div>
            <div className="text-xl text-[#E8E8D8]">{team.name}</div>
            <div className="text-sm text-[#E8E8D8]/60">{team.record.wins}-{team.record.losses}</div>
          </div>
        </div>
        <div className="text-sm text-[#E8E8D8]">
          Select ONE player to protect from free agency. This player cannot be selected by the dice roll.
        </div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-[#E8E8D8]" />
          <div className="text-lg text-[#E8E8D8]">PROTECTION SELECTION</div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {roster.map(player => {
            const isRecommended = player.id === recommended.id;
            const isSelected = selectedProtection?.id === player.id;
            
            return (
              <button
                key={player.id}
                onClick={() => onSelectProtection(player)}
                className="w-full flex items-center gap-4 p-3 bg-[#4A6844] border-[3px] border-[#5A8352] hover:bg-[#3F5A3A] transition-colors text-left"
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-[#E8E8D8] border-[#E8E8D8]' : 'border-[#E8E8D8]'}`}>
                  {isSelected && <div className="w-3 h-3 rounded-full bg-[#5A8352]"></div>}
                </div>
                
                <div className="w-12 h-12 bg-[#E8E8D8] rounded-full flex items-center justify-center text-sm">
                  {player.name.split(' ').map(n => n[0]).join('')}
                </div>
                
                <div className="flex-1">
                  <div className="text-base text-[#E8E8D8]">{player.name}</div>
                  <div className="text-xs text-[#E8E8D8]/60">{player.position}</div>
                </div>
                
                <div
                  className="px-3 py-1 text-sm text-white rounded"
                  style={{ backgroundColor: getGradeColor(player.grade) }}
                >
                  {player.grade}
                </div>
                
                {isRecommended && (
                  <div className="flex items-center gap-1 text-xs text-[#FFD700]">
                    <Star className="w-4 h-4 fill-current" />
                    <span>Recommended</span>
                  </div>
                )}
                
                {isSelected && (
                  <div className="flex items-center gap-1 text-xs text-[#228B22]">
                    <CheckCircle className="w-4 h-4" />
                    <span>SELECTED</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={onConfirm}
        disabled={!selectedProtection}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        CONFIRM PROTECTION
        {selectedProtection && (
          <div className="text-sm mt-1">{selectedProtection.name}</div>
        )}
      </button>
    </div>
  );
}

// Dice Roll Screen Component
function DiceRollScreen({
  team,
  protectedPlayer,
  assignments,
  dice1,
  dice2,
  rolledValue,
  selectedPlayer,
  isRolling,
  onRoll,
  onContinue,
  onUpdateAssignments,
  protectedPlayerId,
  createDiceAssignments,
  teamId,
}: {
  team: Team;
  protectedPlayer: Player | undefined;
  assignments: DiceAssignment[];
  dice1: number;
  dice2: number;
  rolledValue: number | null;
  selectedPlayer: Player | null;
  isRolling: boolean;
  onRoll: () => void;
  onContinue: () => void;
  onUpdateAssignments: (assignments: DiceAssignment[]) => void;
  protectedPlayerId: string | undefined;
  createDiceAssignments: (teamId: string, protectedPlayerId?: string) => DiceAssignment[];
  teamId: string;
}) {
  const Dice1Icon = getDiceIcon(dice1);
  const Dice2Icon = getDiceIcon(dice2);

  // Safety check
  if (!protectedPlayer) {
    return <div className="text-center py-12 text-[#E8E8D8]">Loading...</div>;
  }

  // Handler to swap two players in assignments
  const swapPlayers = (index1: number, index2: number) => {
    const newAssignments = [...assignments];
    const player1 = newAssignments[index1].player;
    const player2 = newAssignments[index2].player;
    
    newAssignments[index1] = { ...newAssignments[index1], player: player2 };
    newAssignments[index2] = { ...newAssignments[index2], player: player1 };
    
    onUpdateAssignments(newAssignments);
  };

  // Handler to reset to auto arrangement
  const resetToAuto = () => {
    const autoAssignments = createDiceAssignments(teamId, protectedPlayerId);
    onUpdateAssignments(autoAssignments);
  };

  const canReorder = rolledValue === null && !isRolling;

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-[#E8E8D8] rounded-full flex items-center justify-center text-2xl">
            {team.shortName[0]}
          </div>
          <div>
            <div className="text-xl text-[#E8E8D8]">{team.name}</div>
            <div className="text-sm text-[#E8E8D8]/60">
              <Lock className="w-4 h-4 inline mr-1" />
              Protected: {protectedPlayer.name} ({protectedPlayer.position}, {protectedPlayer.grade})
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg text-[#E8E8D8]">DICE ASSIGNMENTS</div>
          <div className="text-xs text-[#E8E8D8]/60">Sorted by risk ▼</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#E8E8D8]/20">
                <th className="text-left py-2 text-[#E8E8D8]/80">DICE</th>
                <th className="text-left py-2 text-[#E8E8D8]/80">PLAYER</th>
                <th className="text-left py-2 text-[#E8E8D8]/80">POS</th>
                <th className="text-left py-2 text-[#E8E8D8]/80">GRADE</th>
                <th className="text-left py-2 text-[#E8E8D8]/80">PROBABILITY</th>
                {canReorder && <th className="text-center py-2 text-[#E8E8D8]/80">REORDER</th>}
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment, index) => {
                const isSelected = rolledValue === assignment.diceValue;
                const canMoveUp = index > 0;
                const canMoveDown = index < assignments.length - 1;
                
                return (
                  <tr
                    key={assignment.diceValue}
                    className={`border-b border-[#E8E8D8]/10 transition-all ${
                      isSelected ? 'bg-[#FFD700]/20 scale-[1.02]' : ''
                    }`}
                  >
                    <td className="py-3 text-[#E8E8D8]">
                      {isSelected && <span className="mr-1">►</span>}
                      {assignment.diceValue}
                      {isSelected && <span className="ml-1">◄</span>}
                    </td>
                    <td className="py-3 text-[#E8E8D8]">{assignment.player.name}</td>
                    <td className="py-3 text-[#E8E8D8]/60">{assignment.player.position}</td>
                    <td className="py-3">
                      <span
                        className="px-2 py-1 text-xs text-white rounded"
                        style={{ backgroundColor: getGradeColor(assignment.player.grade) }}
                      >
                        {assignment.player.grade}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[200px] bg-[#E8E8D8]/20 h-4 rounded overflow-hidden">
                          <div
                            className="h-full bg-[#DD0000]"
                            style={{ width: `${(assignment.probability / 16.7) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-[#E8E8D8]/60 w-12">{assignment.probability}%</span>
                      </div>
                    </td>
                    {canReorder && (
                      <td className="py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => canMoveUp && swapPlayers(index, index - 1)}
                            disabled={!canMoveUp}
                            className={`p-1 ${canMoveUp ? 'text-[#E8E8D8] hover:text-[#5599FF] cursor-pointer' : 'text-[#E8E8D8]/20 cursor-not-allowed'}`}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => canMoveDown && swapPlayers(index, index + 1)}
                            disabled={!canMoveDown}
                            className={`p-1 ${canMoveDown ? 'text-[#E8E8D8] hover:text-[#5599FF] cursor-pointer' : 'text-[#E8E8D8]/20 cursor-not-allowed'}`}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {canReorder && (
          <div className="text-center mt-4">
            <button
              onClick={resetToAuto}
              className="flex items-center gap-1 mx-auto px-3 py-2 text-xs text-[#E8E8D8]/80 hover:text-[#E8E8D8] bg-[#4A6844] border-[2px] border-[#5A8352] hover:bg-[#3F5A3A] transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              RESET TO AUTO
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-8 py-8">
        <div className={`w-20 h-20 bg-[#E8E8D8] rounded-lg flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] ${isRolling ? 'animate-bounce' : ''}`}>
          <Dice1Icon className="w-16 h-16 text-[#DD0000]" />
        </div>
        <div className={`w-20 h-20 bg-[#E8E8D8] rounded-lg flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] ${isRolling ? 'animate-bounce' : ''}`}>
          <Dice2Icon className="w-16 h-16 text-[#DD0000]" />
        </div>
        {rolledValue && (
          <div className="text-2xl text-[#E8E8D8]">= {rolledValue}</div>
        )}
      </div>

      {selectedPlayer && rolledValue && (
        <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-8 text-center">
          <div className="text-xl text-[#E8E8D8] mb-4">YOU ROLLED: {rolledValue}</div>
          
          <div className="max-w-md mx-auto bg-[#4A6844] border-[3px] border-[#5A8352] p-6">
            <div className="w-24 h-24 bg-[#E8E8D8] rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              {selectedPlayer.name.split(' ').map(n => n[0]).join('')}
            </div>
            
            <div className="text-2xl text-[#E8E8D8] mb-2">{selectedPlayer.name}</div>
            <div className="flex items-center justify-center gap-2 mb-4 text-sm text-[#E8E8D8]/80">
              <span>{selectedPlayer.position}</span>
              <span>•</span>
              <span>Grade: {selectedPlayer.grade}</span>
              <span>•</span>
              <span>{selectedPlayer.personality}</span>
            </div>
            
            <div className="text-sm text-[#E8E8D8]/60">This player will leave the team.</div>
          </div>
        </div>
      )}

      {!rolledValue ? (
        <button
          onClick={onRoll}
          disabled={isRolling}
          className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50 active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          {isRolling ? 'ROLLING...' : 'ROLL DICE'}
        </button>
      ) : (
        <button
          onClick={onContinue}
          className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          SEE DESTINATION
        </button>
      )}
    </div>
  );
}

// Destination Screen Component
function DestinationScreen({
  player,
  fromTeam,
  toTeam,
  onContinue,
}: {
  player: Player;
  fromTeam: Team;
  toTeam: Team | null;
  onContinue: () => void;
}) {
  const personalityInfo = PERSONALITY_INFO[player.personality];
  const PersonalityIcon = personalityInfo.icon;
  const isRetired = toTeam === null;
  const isStaying = toTeam?.id === fromTeam.id;

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 text-center">
        <div className="text-2xl text-[#E8E8D8]">🃏 FREE AGENT DESTINATION 🃏</div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-12">
        <div className="max-w-md mx-auto space-y-8">
          {/* Player Card */}
          <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-6 text-center">
            <div className={`w-32 h-32 bg-[#E8E8D8] rounded-full flex items-center justify-center text-4xl mx-auto mb-4 ${isRetired ? 'grayscale' : ''}`}>
              {player.name.split(' ').map(n => n[0]).join('')}
            </div>
            
            <div className="text-2xl text-[#E8E8D8] mb-2">{player.name}</div>
            <div className="flex items-center justify-center gap-2 mb-4 text-sm text-[#E8E8D8]/80">
              <span>{player.position}</span>
              <span>•</span>
              <span>Grade: {player.grade}</span>
            </div>
            
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded"
              style={{ backgroundColor: personalityInfo.color + '20', color: personalityInfo.color }}
            >
              <PersonalityIcon className="w-5 h-5" />
              <div>
                <div className="text-sm font-bold">{personalityInfo.label}</div>
                <div className="text-xs">"{personalityInfo.description}"</div>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="text-center">
            <ArrowRight className="w-12 h-12 text-[#E8E8D8] mx-auto rotate-90" />
          </div>

          {/* Destination */}
          <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-6 text-center">
            {isRetired ? (
              <>
                <div className="text-4xl mb-4">🎩</div>
                <div className="text-2xl text-[#E8E8D8] mb-2">RETIRES FROM BASEBALL</div>
                <div className="text-sm text-[#E8E8D8]/60">
                  After a great career, {player.name.split(' ')[0]} hangs up the cleats.
                </div>
              </>
            ) : isStaying ? (
              <>
                <div className="text-4xl mb-4">🏠</div>
                <div className="text-2xl text-[#E8E8D8] mb-2">STAYS WITH THE {fromTeam.shortName}!</div>
                <div className="text-sm text-[#E8E8D8]/60">
                  {player.name.split(' ')[0]} is thrilled to remain in {fromTeam.name.split(' ')[0]}!
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-[#E8E8D8] rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                  {toTeam?.shortName[0]}
                </div>
                <div className="text-2xl text-[#E8E8D8] mb-2">JOINS THE {toTeam?.shortName}</div>
                <div className="text-sm text-[#E8E8D8]/60">
                  {toTeam?.name} • {toTeam?.record.wins}-{toTeam?.record.losses}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        CONTINUE
      </button>
    </div>
  );
}

// Exchange Screen Component
function ExchangeScreen({
  incomingPlayer,
  fromTeam,
  toTeam,
  selectedReturn,
  onSelectReturn,
  onConfirm,
  allPlayers,
}: {
  incomingPlayer: Player;
  fromTeam: Team;
  toTeam: Team;
  selectedReturn: Player | null;
  onSelectReturn: (player: Player) => void;
  onConfirm: () => void;
  allPlayers: Player[];
}) {
  const toTeamRoster = allPlayers.filter(p => p.teamId === toTeam.id);
  const incomingTrueValue = incomingPlayer.salary;
  const salaryMin = incomingTrueValue * 0.9;
  const salaryMax = incomingTrueValue * 1.1;
  
  // Calculate salary-based eligibility (±10%)
  const eligiblePlayers = toTeamRoster.filter(p => {
    return p.salary >= salaryMin && p.salary <= salaryMax;
  });

  // Fallback: if no eligible players, find the next closest to the threshold
  let closestPlayer: Player | null = null;
  const fallbackTriggered = eligiblePlayers.length === 0;
  
  if (fallbackTriggered && toTeamRoster.length > 0) {
    // Find players above and below the threshold
    const playersAbove = toTeamRoster.filter(p => p.salary > salaryMax);
    const playersBelow = toTeamRoster.filter(p => p.salary < salaryMin);
    
    // Get the closest from each group
    const closestAbove = playersAbove.length > 0 
      ? playersAbove.reduce((closest, p) => p.salary < closest.salary ? p : closest, playersAbove[0])
      : null;
    const closestBelow = playersBelow.length > 0
      ? playersBelow.reduce((closest, p) => p.salary > closest.salary ? p : closest, playersBelow[0])
      : null;
    
    // Choose whichever is closer to the valid range
    if (closestAbove && closestBelow) {
      const distanceAbove = closestAbove.salary - salaryMax;
      const distanceBelow = salaryMin - closestBelow.salary;
      closestPlayer = distanceAbove < distanceBelow ? closestAbove : closestBelow;
    } else if (closestAbove) {
      closestPlayer = closestAbove;
    } else if (closestBelow) {
      closestPlayer = closestBelow;
    }
  }
  
  const playersToShow = fallbackTriggered && closestPlayer ? [closestPlayer] : toTeamRoster;

  // Auto-select closest player if fallback triggered
  useEffect(() => {
    if (fallbackTriggered && closestPlayer && !selectedReturn) {
      onSelectReturn(closestPlayer);
    }
  }, [fallbackTriggered, closestPlayer, selectedReturn, onSelectReturn]);

  // Calculate percentage delta for a player
  const getSalaryDelta = (playerSalary: number): number => {
    return ((playerSalary - incomingTrueValue) / incomingTrueValue) * 100;
  };

  // Get badge info for a player
  const getBadgeInfo = (player: Player): { text: string; color: string; bgColor: string } => {
    if (fallbackTriggered && player.id === closestPlayer?.id) {
      return { 
        text: "⚠️ REQUIRED (Closest)", 
        color: "#FFA500", 
        bgColor: "#FFA500" 
      };
    }
    
    const delta = getSalaryDelta(player.salary);
    
    if (player.salary >= salaryMin && player.salary <= salaryMax) {
      return { 
        text: `✓ WITHIN RANGE (${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%)`, 
        color: "#228B22", 
        bgColor: "#228B22" 
      };
    }
    
    if (player.salary < salaryMin) {
      return { 
        text: `✗ TOO LOW (${delta.toFixed(0)}%)`, 
        color: "#B22222", 
        bgColor: "#B22222" 
      };
    }
    
    return { 
      text: `✗ TOO HIGH (+${delta.toFixed(0)}%)`, 
      color: "#B22222", 
      bgColor: "#B22222" 
    };
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
        <div className="text-xl text-[#E8E8D8] mb-2">PLAYER EXCHANGE</div>
        <div className="text-sm text-[#E8E8D8]/80">
          {toTeam.name} must return a player to {fromTeam.name}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 items-center">
        <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4 text-center">
          <div className="text-xs text-[#E8E8D8]/60 mb-2">INCOMING</div>
          <div className="w-16 h-16 bg-[#E8E8D8] rounded-full flex items-center justify-center text-xl mx-auto mb-2">
            {incomingPlayer.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="text-sm text-[#E8E8D8]">{incomingPlayer.name}</div>
          <div className="text-xs text-[#E8E8D8]/60">{incomingPlayer.position} • {incomingPlayer.grade}</div>
          <div className="text-xs text-[#E8E8D8]/80 mt-2">True Value: ${incomingTrueValue.toFixed(1)}M</div>
          <div className="text-xs text-[#E8E8D8]/40">FROM: {fromTeam.shortName}</div>
        </div>

        <div className="text-center text-2xl text-[#E8E8D8]">↔</div>

        <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4 text-center">
          <div className="text-xs text-[#E8E8D8]/60 mb-2">OUTGOING</div>
          {selectedReturn ? (
            <>
              <div className="w-16 h-16 bg-[#E8E8D8] rounded-full flex items-center justify-center text-xl mx-auto mb-2">
                {selectedReturn.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="text-sm text-[#E8E8D8]">{selectedReturn.name}</div>
              <div className="text-xs text-[#E8E8D8]/60">{selectedReturn.position} • {selectedReturn.grade}</div>
              <div className="text-xs text-[#E8E8D8]/80 mt-2">True Value: ${selectedReturn.salary.toFixed(1)}M</div>
              <div className="text-xs text-[#E8E8D8]/40">TO: {fromTeam.shortName}</div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-[#E8E8D8]/20 rounded-full flex items-center justify-center text-4xl mx-auto mb-2 text-[#E8E8D8]/40">
                ?
              </div>
              <div className="text-sm text-[#E8E8D8]/60">Any player</div>
              <div className="text-xs text-[#E8E8D8]/40">Within ±10% salary range</div>
            </>
          )}
        </div>
      </div>

      {/* Fallback Warning Banner */}
      {fallbackTriggered && (
        <div className="bg-[#FFA500]/20 border-l-4 border-[#FFA500] p-4 text-sm text-[#E8E8D8]">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <div className="font-bold mb-1">FALLBACK RULE TRIGGERED</div>
              <div className="text-[#E8E8D8]/90">
                No players meet the ±10% salary threshold (${salaryMin.toFixed(1)}M - ${salaryMax.toFixed(1)}M). 
                You must give your CLOSEST-VALUE player on roster: <span className="font-bold">{closestPlayer?.name}</span> (${closestPlayer?.salary.toFixed(1)}M).
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
        <div className="text-lg text-[#E8E8D8] mb-4">SELECT RETURN PLAYER</div>
        
        {!fallbackTriggered && (
          <div className="bg-[#4169E1]/20 border-l-4 border-[#4169E1] p-3 mb-4 text-sm text-[#E8E8D8]">
            ℹ️ Salary threshold: <span className="font-bold">${salaryMin.toFixed(1)}M - ${salaryMax.toFixed(1)}M</span> (±10% of ${incomingTrueValue.toFixed(1)}M)
          </div>
        )}

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {playersToShow.map(player => {
            const isEligible = fallbackTriggered 
              ? player.id === closestPlayer?.id 
              : eligiblePlayers.some(p => p.id === player.id);
            const isSelected = selectedReturn?.id === player.id;
            const badgeInfo = getBadgeInfo(player);
            const delta = getSalaryDelta(player.salary);
            
            return (
              <button
                key={player.id}
                onClick={() => isEligible && onSelectReturn(player)}
                disabled={!isEligible || fallbackTriggered}
                className={`w-full flex items-center gap-4 p-3 border-[3px] transition-colors text-left ${
                  isEligible 
                    ? 'bg-[#4A6844] border-[#5A8352] hover:bg-[#3F5A3A]' 
                    : 'bg-[#4A6844]/40 border-[#5A8352]/40 cursor-not-allowed opacity-50'
                } ${fallbackTriggered && player.id === closestPlayer?.id ? 'ring-2 ring-[#FFA500]' : ''}`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-[#E8E8D8] border-[#E8E8D8]' : 'border-[#E8E8D8]'}`}>
                  {isSelected && <div className="w-3 h-3 rounded-full bg-[#5A8352]"></div>}
                </div>
                
                <div className="w-12 h-12 bg-[#E8E8D8] rounded-full flex items-center justify-center text-sm">
                  {player.name.split(' ').map(n => n[0]).join('')}
                </div>
                
                <div className="flex-1">
                  <div className="text-base text-[#E8E8D8]">{player.name}</div>
                  <div className="text-xs text-[#E8E8D8]/60">{player.position} • ${player.salary.toFixed(1)}M</div>
                </div>
                
                <div
                  className="px-3 py-1 text-sm text-white rounded"
                  style={{ backgroundColor: getGradeColor(player.grade) }}
                >
                  {player.grade}
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  <div 
                    className="text-xs font-bold px-2 py-1 rounded"
                    style={{ color: badgeInfo.color }}
                  >
                    {badgeInfo.text}
                  </div>
                  {!fallbackTriggered && (
                    <div className="text-xs text-[#E8E8D8]/60">
                      {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                    </div>
                  )}
                </div>
              </button>
            );
          })}
          
          {!fallbackTriggered && toTeamRoster.filter(p => !eligiblePlayers.some(ep => ep.id === p.id)).map(player => {
            const badgeInfo = getBadgeInfo(player);
            const delta = getSalaryDelta(player.salary);
            
            return (
              <button
                key={player.id}
                disabled
                className="w-full flex items-center gap-4 p-3 border-[3px] transition-colors text-left bg-[#4A6844]/40 border-[#5A8352]/40 cursor-not-allowed opacity-50"
              >
                <div className="w-6 h-6 rounded-full border-2 border-[#E8E8D8]"></div>
                
                <div className="w-12 h-12 bg-[#E8E8D8] rounded-full flex items-center justify-center text-sm">
                  {player.name.split(' ').map(n => n[0]).join('')}
                </div>
                
                <div className="flex-1">
                  <div className="text-base text-[#E8E8D8]">{player.name}</div>
                  <div className="text-xs text-[#E8E8D8]/60">{player.position} • ${player.salary.toFixed(1)}M</div>
                </div>
                
                <div
                  className="px-3 py-1 text-sm text-white rounded"
                  style={{ backgroundColor: getGradeColor(player.grade) }}
                >
                  {player.grade}
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  <div 
                    className="text-xs font-bold px-2 py-1 rounded"
                    style={{ color: badgeInfo.color }}
                  >
                    {badgeInfo.text}
                  </div>
                  <div className="text-xs text-[#E8E8D8]/60">
                    {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4">
        {!fallbackTriggered && (
          <button
            onClick={() => {
              if (eligiblePlayers.length > 0) {
                const randomPlayer = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
                onSelectReturn(randomPlayer);
              }
            }}
            className="flex-1 bg-[#4A6844] border-[5px] border-[#5A8352] py-3 text-sm text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            AUTO-SELECT
          </button>
        )}
        <button
          onClick={onConfirm}
          disabled={!selectedReturn}
          className="flex-1 bg-[#5A8352] border-[5px] border-[#4A6844] py-3 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          CONFIRM EXCHANGE
        </button>
      </div>
    </div>
  );
}

// Round Summary Screen Component
function RoundSummaryScreen({
  round,
  moves,
  onContinue,
}: {
  round: number;
  moves: Move[];
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 text-center">
        <div className="text-2xl text-[#E8E8D8]">ROUND {round} COMPLETE</div>
        <div className="text-sm text-[#E8E8D8]/60 mt-1">{moves.length} total moves</div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
        <div className="text-lg text-[#E8E8D8] mb-4">ROUND {round} MOVES</div>
        
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {moves.map((move, index) => {
            const personalityInfo = PERSONALITY_INFO[move.player.personality];
            const PersonalityIcon = personalityInfo.icon;
            
            return (
              <div key={index} className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4">
                <div className="flex items-center gap-3 mb-2">
                  <PersonalityIcon className="w-5 h-5" style={{ color: personalityInfo.color }} />
                  <div className="text-base text-[#E8E8D8]">
                    {move.player.name} ({move.player.grade}, {move.player.position})
                  </div>
                </div>
                
                <div className="text-sm text-[#E8E8D8]/80">
                  {move.fromTeam.shortName} → {
                    move.outcome === "RETIRED" ? "RETIRED" :
                    move.outcome === "STAYED" ? "STAYED" :
                    move.toTeam?.shortName
                  }
                  {move.reason && (
                    <span className="text-[#E8E8D8]/60"> ({move.reason})</span>
                  )}
                </div>
                
                {move.returnPlayer && (
                  <div className="text-xs text-[#E8E8D8]/60 mt-1">
                    ↩ Return: {move.returnPlayer.name} ({move.returnPlayer.grade}, {move.returnPlayer.position})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        START ROUND 2
      </button>
    </div>
  );
}

// Final Summary Screen Component
function FinalSummaryScreen({
  moves,
  onClose,
  isSaving,
}: {
  moves: Move[];
  onClose: () => void;
  isSaving?: boolean;
}) {
  const totalMoves = moves.filter(m => m.outcome === "MOVED").length;
  const totalRetirements = moves.filter(m => m.outcome === "RETIRED").length;
  const totalStayed = moves.filter(m => m.outcome === "STAYED").length;

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 text-center">
        <div className="text-2xl text-[#E8E8D8] mb-4">FREE AGENCY COMPLETE</div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4">
            <div className="text-3xl text-[#E8E8D8]">{totalMoves}</div>
            <div className="text-xs text-[#E8E8D8]/60">MOVES</div>
          </div>
          <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4">
            <div className="text-3xl text-[#E8E8D8]">{totalRetirements}</div>
            <div className="text-xs text-[#E8E8D8]/60">RETIREMENTS</div>
          </div>
          <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-4">
            <div className="text-3xl text-[#E8E8D8]">{totalStayed}</div>
            <div className="text-xs text-[#E8E8D8]/60">STAYED</div>
          </div>
        </div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
        <div className="text-lg text-[#E8E8D8] mb-4">ALL MOVES</div>
        
        <div className="space-y-6 max-h-[500px] overflow-y-auto">
          {[1, 2].map(round => {
            const roundMoves = moves.filter(m => m.round === round);
            if (roundMoves.length === 0) return null;
            
            return (
              <div key={round}>
                <div className="text-sm text-[#E8E8D8]/80 mb-2 pb-2 border-b border-[#E8E8D8]/20">
                  ROUND {round}
                </div>
                
                <div className="space-y-2">
                  {roundMoves.map((move, index) => {
                    const personalityInfo = PERSONALITY_INFO[move.player.personality];
                    const PersonalityIcon = personalityInfo.icon;
                    
                    return (
                      <div key={index} className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3">
                        <div className="flex items-center gap-3 mb-1">
                          <PersonalityIcon className="w-4 h-4" style={{ color: personalityInfo.color }} />
                          <div className="text-sm text-[#E8E8D8]">
                            {move.player.name} ({move.player.grade}, {move.player.position})
                          </div>
                        </div>
                        
                        <div className="text-xs text-[#E8E8D8]/80">
                          {move.fromTeam.shortName} → {
                            move.outcome === "RETIRED" ? "RETIRED" :
                            move.outcome === "STAYED" ? "STAYED" :
                            move.toTeam?.shortName
                          }
                        </div>
                        
                        {move.returnPlayer && (
                          <div className="text-xs text-[#E8E8D8]/60 mt-1">
                            ↩ {move.returnPlayer.name} ({move.returnPlayer.grade}, {move.returnPlayer.position})
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onClose}
        disabled={isSaving}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50 active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        {isSaving ? 'Saving...' : 'SAVE & CONTINUE'}
      </button>
    </div>
  );
}