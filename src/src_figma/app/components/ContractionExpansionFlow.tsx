import { useState, useEffect, useMemo } from "react";
import { ChevronDown, AlertTriangle, Dice1, Users, Award, TrendingDown, Building2, FileText, BarChart3 } from "lucide-react";
import { useOffseasonData, type OffseasonTeam, type OffseasonPlayer } from "@/hooks/useOffseasonData";

// Mock teams for fallback
const MOCK_AT_RISK_TEAMS: Team[] = [
  {
    id: "KC",
    name: "Athletics",
    city: "Kansas City",
    league: "AL",
    division: "AL Central",
    fanMorale: 18,
    record: "48-114",
    attendance: 12450,
    seasons: 12,
    championships: 1,
    playoffAppearances: 3,
    rosterSize: 22,
    cornerstonePlayer: "Marcus Johnson (SS)"
  },
  {
    id: "TB",
    name: "Stingrays",
    city: "Tampa Bay",
    league: "AL",
    division: "AL East",
    fanMorale: 28,
    record: "62-100",
    attendance: 18200,
    seasons: 8,
    championships: 0,
    playoffAppearances: 1,
    rosterSize: 21,
    cornerstonePlayer: "Roberto Diaz (CF)"
  },
  {
    id: "MON",
    name: "Expos",
    city: "Montreal",
    league: "NL",
    division: "NL East",
    fanMorale: 42,
    record: "71-91",
    attendance: 22100,
    seasons: 15,
    championships: 0,
    playoffAppearances: 4,
    rosterSize: 20,
    cornerstonePlayer: "Andre Dawson Jr. (RF)"
  }
];

const MOCK_ALL_TEAMS: Team[] = [
  { id: "NYY", name: "Yankees", city: "New York", league: "AL", division: "AL East", fanMorale: 85, record: "98-64", attendance: 45000, seasons: 25, championships: 5, playoffAppearances: 18, rosterSize: 22 },
  { id: "LAD", name: "Dodgers", city: "Los Angeles", league: "NL", division: "NL West", fanMorale: 78, record: "95-67", attendance: 48000, seasons: 25, championships: 3, playoffAppearances: 15, rosterSize: 21 },
  { id: "BOS", name: "Red Sox", city: "Boston", league: "AL", division: "AL East", fanMorale: 72, record: "89-73", attendance: 38000, seasons: 25, championships: 2, playoffAppearances: 12, rosterSize: 22 },
];

// Helper to convert OffseasonTeam to local Team format
function convertToLocalTeam(team: OffseasonTeam, players: OffseasonPlayer[], index: number): Team {
  const teamPlayers = players.filter(p => p.teamId === team.id);
  return {
    id: team.id,
    name: team.name,
    city: team.name.split(' ')[0] || team.name, // Use first word as city approximation
    league: index % 2 === 0 ? "AL" : "NL",
    division: index < 5 ? "AL East" : index < 10 ? "AL Central" : index < 15 ? "NL East" : "NL West",
    fanMorale: 30 + Math.floor(Math.random() * 60), // Random morale for demo
    record: `${70 + Math.floor(Math.random() * 25)}-${70 + Math.floor(Math.random() * 25)}`,
    attendance: 20000 + Math.floor(Math.random() * 30000),
    seasons: 10 + Math.floor(Math.random() * 15),
    championships: Math.floor(Math.random() * 5),
    playoffAppearances: Math.floor(Math.random() * 15),
    rosterSize: teamPlayers.length,
    cornerstonePlayer: teamPlayers.length > 0 ? `${teamPlayers[0].name} (${teamPlayers[0].position})` : undefined
  };
}

// Helper to convert OffseasonPlayer to local Player format
function convertToLocalPlayer(player: OffseasonPlayer, league: League): Player {
  const gradeMap: Record<string, string> = {
    'S': 'A+', 'A+': 'A+', 'A': 'A', 'A-': 'A-',
    'B+': 'B+', 'B': 'B', 'B-': 'B-',
    'C+': 'C+', 'C': 'C', 'C-': 'C-',
    'D+': 'D+', 'D': 'D',
  };
  return {
    id: player.id,
    name: player.name,
    position: player.position,
    grade: gradeMap[player.grade] || 'B',
    age: player.age,
    salary: (player.salary || 1000000),
    war: 1.0 + Math.random() * 5, // Random WAR for demo
    team: player.teamId,
    league: league,
    traits: []
  };
}

type League = "AL" | "NL";

interface Team {
  id: string;
  name: string;
  city: string;
  league: League;
  division: string;
  fanMorale: number;
  record: string;
  attendance: number;
  logo?: string;
  seasons: number;
  championships: number;
  playoffAppearances: number;
  rosterSize: number;
  cornerstonePlayer?: string;
}

interface Player {
  id: string;
  name: string;
  position: string;
  grade: string;
  age: number;
  salary: number;
  war: number;
  team: string;
  league: League;
  traits: string[];
}

interface ContractionResult {
  team: Team;
  contracted: boolean;
  roll?: number;
  voluntary?: boolean;
}

interface ScornedPlayer extends Player {
  oldPersonality: string;
  newPersonality: string;
  trustDamage: number;
  volatility: string;
}

type FlowStep = 
  | "risk-assessment"
  | "contraction-roll"
  | "voluntary-sale"
  | "protection-selection"
  | "legacy-cornerstone"
  | "expansion-draft"
  | "scorned-effects"
  | "player-disposal"
  | "museum-entry"
  | "expansion-creation"
  | "expansion-team-draft"
  | "summary";

interface ContractionExpansionFlowProps {
  onComplete: () => void;
}

export function ContractionExpansionFlow({ onComplete }: ContractionExpansionFlowProps) {
  // Get real data from hook
  const { teams: realTeams, players: realPlayers, hasRealData, isLoading } = useOffseasonData();

  const [currentStep, setCurrentStep] = useState<FlowStep>("risk-assessment");
  const [contractedTeams, setContractedTeams] = useState<ContractionResult[]>([]);
  const [voluntarySales, setVoluntarySales] = useState<Team[]>([]);
  const [protectedPlayers, setProtectedPlayers] = useState<Record<string, Player[]>>({});
  const [scornedPlayers, setScornedPlayers] = useState<ScornedPlayer[]>([]);
  const [expansionTeams, setExpansionTeams] = useState<Team[]>([]);
  const [currentRollTeamIndex, setCurrentRollTeamIndex] = useState(0);

  // Convert real teams to local format with mock fallback
  const allTeamsData = useMemo(() => {
    if (hasRealData && realTeams.length > 0 && realPlayers.length > 0) {
      return realTeams.slice(0, 20).map((team, index) =>
        convertToLocalTeam(team, realPlayers, index)
      );
    }
    return MOCK_ALL_TEAMS;
  }, [realTeams, realPlayers, hasRealData]);

  // Teams at risk (filter for low morale)
  const atRiskTeams = useMemo(() => {
    if (hasRealData && allTeamsData.length > 3) {
      // Pick 3 teams with lowest morale as "at risk"
      return [...allTeamsData]
        .sort((a, b) => a.fanMorale - b.fanMorale)
        .slice(0, 3);
    }
    return MOCK_AT_RISK_TEAMS;
  }, [allTeamsData, hasRealData]);

  // Convert real players to local format for a given team
  const getTeamRoster = useMemo(() => {
    return (teamId: string, league: League): Player[] => {
      if (hasRealData && realPlayers.length > 0) {
        return realPlayers
          .filter(p => p.teamId === teamId)
          .slice(0, 10)
          .map(p => convertToLocalPlayer(p, league));
      }
      // Return mock roster
      return [
        { id: "1", name: "Marcus Johnson", position: "SS", grade: "A", age: 29, salary: 15000000, war: 5.2, team: teamId, league, traits: ["CORNERSTONE"] },
        { id: "2", name: "Tommy Richards", position: "SP", grade: "A-", age: 29, salary: 12500000, war: 4.2, team: teamId, league, traits: [] },
        { id: "3", name: "Jake Wilson", position: "CF", grade: "B+", age: 26, salary: 8200000, war: 3.8, team: teamId, league, traits: [] },
        { id: "4", name: "Diego Martinez", position: "3B", grade: "B", age: 31, salary: 6500000, war: 2.1, team: teamId, league, traits: [] },
        { id: "5", name: "Chris Taylor", position: "2B", grade: "B", age: 28, salary: 5800000, war: 1.9, team: teamId, league, traits: [] },
        { id: "6", name: "Juan Soto Jr.", position: "RF", grade: "B-", age: 24, salary: 3200000, war: 1.2, team: teamId, league, traits: [] },
      ];
    };
  }, [realPlayers, hasRealData]);

  const getContractionProbability = (morale: number): number => {
    if (morale < 10) return 85;
    if (morale < 20) return 60;
    if (morale < 30) return 35;
    if (morale < 40) return 15;
    if (morale < 50) return 5;
    return 0;
  };

  const getRiskLevel = (morale: number): { label: string; color: string; emoji: string } => {
    if (morale < 20) return { label: "CRITICAL", color: "#DD0000", emoji: "🔴" };
    if (morale < 30) return { label: "HIGH", color: "#FF8800", emoji: "🟠" };
    if (morale < 50) return { label: "LOW", color: "#FFD700", emoji: "🟡" };
    return { label: "SAFE", color: "#00CC00", emoji: "✅" };
  };

  const renderRiskAssessment = () => {
    const totalTeams = 20;
    const safe = totalTeams - atRiskTeams.length;

    return (
      <div className="space-y-4">
        <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-4">
          <div className="flex items-center justify-between">
            <div className="text-lg text-[#E8E8D8]">⚠️ CONTRACTION RISK ASSESSMENT</div>
            <div className="text-xs text-[#E8E8D8]/60">Screen 1 of 12</div>
          </div>
          <div className="text-xs text-[#E8E8D8]/60 mt-1 text-center">Phase 4: Contraction/Expansion</div>
        </div>

        <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-3">
          <div className="text-sm text-[#E8E8D8] text-center">
            LEAGUE OVERVIEW
          </div>
          <div className="text-xs text-[#E8E8D8]/80 text-center mt-1">
            Teams: {totalTeams} │ At Risk: {atRiskTeams.length} │ Safe: {safe}
          </div>
        </div>

        <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-[#E8E8D8]">🚨 TEAMS AT RISK</div>
            <div className="text-xs text-[#E8E8D8]/60">Sort: Morale</div>
          </div>

          <div className="space-y-3">
            {atRiskTeams.map((team) => {
              const risk = getRiskLevel(team.fanMorale);
              const probability = getContractionProbability(team.fanMorale);

              return (
                <div key={team.id} className="bg-[#4A6844] border-[3px] border-[#5599FF] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{risk.emoji}</span>
                    <span className="text-sm text-[#E8E8D8] font-bold" style={{ color: risk.color }}>
                      {risk.label}:
                    </span>
                    <span className="text-sm text-[#E8E8D8]">
                      {team.city} {team.name}
                    </span>
                  </div>

                  <div className="mb-2">
                    <div className="text-xs text-[#E8E8D8]/60 mb-1">Fan Morale: {team.fanMorale}</div>
                    <div className="bg-[#2A3424] h-3 border-[2px] border-[#5599FF]">
                      <div 
                        className="h-full bg-[#5599FF]"
                        style={{ width: `${team.fanMorale}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-[#FFD700] mb-2">
                    Contraction Probability: {probability}%
                  </div>

                  <div className="text-[10px] text-[#E8E8D8]/60">
                    Record: {team.record} │ Attendance: {team.attendance.toLocaleString()} avg
                    {team.fanMorale < 20 && " │ 4 consecutive losing seasons"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-3">
          <div className="text-xs text-[#E8E8D8] mb-2">PROBABILITY REFERENCE</div>
          <div className="text-[9px] text-[#E8E8D8]/80 space-y-1">
            <div>🔴 0-9 Morale: 85% │ 🔴 10-19: 60% │ 🟠 20-29: 35%</div>
            <div>🟡 30-39: 15% │ 🟡 40-49: 5% │ ✅ 50+: Safe</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setCurrentStep("contraction-roll")}
            className="flex-1 bg-[#5A8352] border-[5px] border-[#DD0000] py-3 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            Begin Contraction Rolls →
          </button>
          <button
            onClick={() => setCurrentStep("voluntary-sale")}
            className="flex-1 bg-[#5A8352] border-[5px] border-[#5599FF] py-3 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            Skip to Voluntary Sales
          </button>
        </div>
      </div>
    );
  };

  const renderContractionRoll = () => {
    return (
      <ContractionRollScreen
        teams={atRiskTeams}
        currentIndex={currentRollTeamIndex}
        onRollComplete={(result) => {
          setContractedTeams(prev => [...prev, result]);
          if (currentRollTeamIndex < atRiskTeams.length - 1) {
            setCurrentRollTeamIndex(prev => prev + 1);
          } else {
            setCurrentStep("voluntary-sale");
          }
        }}
      />
    );
  };

  const renderVoluntarySale = () => {
    return (
      <VoluntarySaleScreen
        contractedTeams={contractedTeams}
        allTeams={allTeamsData}
        onContinue={() => {
          // If we have contracted teams, go to protection selection
          if (contractedTeams.length > 0) {
            setCurrentStep("protection-selection");
          } else {
            // Skip to summary if no contractions
            setCurrentStep("summary");
          }
        }}
        onSellTeam={(team) => {
          setVoluntarySales(prev => [...prev, team]);
          setContractedTeams(prev => [...prev, { team, contracted: true, voluntary: true }]);
        }}
      />
    );
  };

  const renderProtectionSelection = () => {
    const currentContractedIndex = Object.keys(protectedPlayers).length;
    const allContracted = contractedTeams.filter(r => r.contracted);
    
    if (currentContractedIndex >= allContracted.length) {
      // All teams processed, move to legacy cornerstone
      setCurrentStep("legacy-cornerstone");
      return null;
    }

    const currentTeam = allContracted[currentContractedIndex].team;

    return (
      <ProtectionSelectionScreen
        team={currentTeam}
        roster={getTeamRoster(currentTeam.id, currentTeam.league)}
        onComplete={(protectedPlayersList) => {
          setProtectedPlayers(prev => ({ ...prev, [currentTeam.id]: protectedPlayersList }));
        }}
      />
    );
  };

  const renderLegacyCornerstone = () => {
    const allContracted = contractedTeams.filter(r => r.contracted);
    const currentIndex = Object.keys(protectedPlayers).length - 1;
    
    if (currentIndex < 0 || currentIndex >= allContracted.length) {
      setCurrentStep("expansion-draft");
      return null;
    }

    const currentTeam = allContracted[currentIndex].team;
    const protectedList = protectedPlayers[currentTeam.id];

    return (
      <LegacyCornerstoneScreen
        team={currentTeam}
        cornerstonePlayer={protectedList[0]}
        onContinue={() => {
          if (currentIndex < allContracted.length - 1) {
            // More teams to process - go back to protection selection
            setCurrentStep("protection-selection");
          } else {
            // All done, move to expansion draft
            setCurrentStep("expansion-draft");
          }
        }}
      />
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <div className="text-[#E8E8D8] text-xl">Loading contraction/expansion data...</div>
      </div>
    );
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "risk-assessment":
        return renderRiskAssessment();
      case "contraction-roll":
        return renderContractionRoll();
      case "voluntary-sale":
        return renderVoluntarySale();
      case "protection-selection":
        return renderProtectionSelection();
      case "legacy-cornerstone":
        return renderLegacyCornerstone();
      case "expansion-draft":
        return <ExpansionDraftScreen onContinue={() => setCurrentStep("scorned-effects")} contractedTeams={contractedTeams} protectedPlayers={protectedPlayers} />;
      case "scorned-effects":
        return <ScornedEffectsScreen scornedPlayers={scornedPlayers} onContinue={() => setCurrentStep("player-disposal")} />;
      case "player-disposal":
        return <PlayerDisposalScreen contractedTeams={contractedTeams} protectedPlayers={protectedPlayers} onContinue={() => setCurrentStep("museum-entry")} />;
      case "museum-entry":
        return <MuseumEntryScreen contractedTeams={contractedTeams} onContinue={() => setCurrentStep("expansion-creation")} />;
      case "expansion-creation":
        return <ExpansionCreationScreen onContinue={() => setCurrentStep("expansion-team-draft")} onSkip={() => setCurrentStep("summary")} />;
      case "expansion-team-draft":
        return <ExpansionTeamDraftScreen onContinue={() => setCurrentStep("summary")} />;
      case "summary":
        return <SummaryScreen contractedTeams={contractedTeams} expansionTeams={expansionTeams} onComplete={onComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-4xl mx-auto">
        {renderCurrentStep()}
      </div>
    </div>
  );
}

// Screen 2: Contraction Roll
function ContractionRollScreen({ 
  teams, 
  currentIndex, 
  onRollComplete 
}: { 
  teams: Team[]; 
  currentIndex: number; 
  onRollComplete: (result: ContractionResult) => void;
}) {
  const [rolling, setRolling] = useState(false);
  const [roll, setRoll] = useState<number | null>(null);
  const [currentRoll, setCurrentRoll] = useState(0);

  const team = teams[currentIndex];
  const probability = team.fanMorale < 10 ? 85 : team.fanMorale < 20 ? 60 : team.fanMorale < 30 ? 35 : team.fanMorale < 40 ? 15 : 5;

  // Reset roll state when moving to a new team
  useEffect(() => {
    setRoll(null);
    setCurrentRoll(0);
    setRolling(false);
  }, [currentIndex]);

  const handleRoll = () => {
    setRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setCurrentRoll(Math.floor(Math.random() * 100) + 1);
      count++;
      if (count > 15) {
        clearInterval(interval);
        const finalRoll = Math.floor(Math.random() * 100) + 1;
        setCurrentRoll(finalRoll);
        setRoll(finalRoll);
        setRolling(false);
      }
    }, 150);
  };

  const contracted = roll !== null && roll <= probability;

  return (
    <div className="space-y-6">
      <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-lg text-[#E8E8D8]">🎲 CONTRACTION ROLL {roll !== null && "- RESULT"}</div>
          <div className="text-xs text-[#E8E8D8]/60">Screen 2 of 12</div>
        </div>
        <div className="text-sm text-[#E8E8D8]/60 text-center">{team.city} {team.name}</div>
      </div>

      {roll !== null && (
        <div className="text-center py-4 animate-fadeIn">
          <div className="text-2xl mb-2" style={{ color: contracted ? "#DD0000" : "#00DD00" }}>
            {contracted ? "❌ FRANCHISE CONTRACTED ❌" : "✅ FRANCHISE SURVIVES ✅"}
          </div>
        </div>
      )}

      <div className="text-center">
        <div className="w-32 h-32 bg-[#E8E8D8] rounded-full mx-auto mb-4 flex items-center justify-center text-4xl" style={{ opacity: roll !== null && contracted ? 0.5 : 1 }}>
          🏟️
        </div>
        <div className="text-xl text-[#E8E8D8] mb-1">{team.city} {team.name}</div>
        {roll !== null && contracted && (
          <div className="text-sm text-[#E8E8D8]/60">1983 - 2026</div>
        )}
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
        <div className="text-sm text-[#E8E8D8] mb-3">FRANCHISE STATUS</div>
        <div className="space-y-2 text-xs text-[#E8E8D8]/80">
          <div>Fan Morale: {team.fanMorale} / 100</div>
          <div>Contraction Probability: {probability}%</div>
          <div className="border-t border-[#E8E8D8]/20 my-2" />
          <div>Seasons in League: {team.seasons}</div>
          <div>Championships: {team.championships}</div>
          <div>Playoff Appearances: {team.playoffAppearances}</div>
          <div>Current Roster: {team.rosterSize} players</div>
          {team.cornerstonePlayer && <div>Cornerstone: {team.cornerstonePlayer}</div>}
        </div>
      </div>

      {roll === null ? (
        <>
          <div className="bg-[#5A8352] border-[5px] border-[#5599FF] p-3 text-center">
            <div className="text-xs text-[#E8E8D8]">
              Roll 1-{probability} = CONTRACTED │ Roll {probability + 1}-100 = SURVIVES
            </div>
          </div>

          <button
            onClick={handleRoll}
            disabled={rolling}
            className="w-full bg-[#5A8352] border-[5px] border-[#DD0000] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-70 active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            style={rolling ? { animation: 'pulse 0.5s ease-in-out infinite' } : {}}
          >
            {rolling ? (
              <span className="flex items-center justify-center gap-2">
                🎲 Rolling... <span className="text-2xl text-[#FFD700]">{currentRoll}</span>
              </span>
            ) : (
              "🎲 ROLL FOR FATE 🎲"
            )}
          </button>

          <div className="text-center text-xs text-[#E8E8D8]/60">
            Remaining at-risk teams: {teams.length - currentIndex}
          </div>
        </>
      ) : (
        <>
          <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-4">
            <div className="text-center">
              <div className="text-2xl text-[#FFD700] mb-2">🎲 ROLL: {roll}</div>
              <div className="text-xs text-[#E8E8D8]/60 mb-1">Threshold: ≤{probability} = Contracted</div>
              <div className="text-sm text-[#E8E8D8]">
                Result: {roll} {contracted ? "≤" : ">"} {probability} → {contracted ? "CONTRACTED" : "SURVIVED"}
              </div>
            </div>
          </div>

          {contracted ? (
            <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
              <div className="text-sm text-[#E8E8D8] mb-2">WHAT HAPPENS NEXT</div>
              <div className="space-y-1 text-xs text-[#E8E8D8]/80">
                <div>1. Select 4 protected players</div>
                <div>2. Other teams draft from remaining {team.rosterSize - 4} players</div>
                <div>3. Undrafted players: retirement check (+30%) or Free Agency</div>
                <div>4. Team added to Museum's "Defunct Teams"</div>
              </div>
            </div>
          ) : (
            <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-4">
              <div className="text-sm text-[#FFD700] mb-2">⚠️ WARNING</div>
              <div className="text-xs text-[#E8E8D8]/80">
                The {team.name} survived this year, but fan morale remains critically low. Another losing season could spell the end.
              </div>
              <div className="text-xs text-[#E8E8D8]/60 mt-2">
                Current Morale: {team.fanMorale} → Target for Safety: 50+
              </div>
            </div>
          )}

          {roll !== null && contracted && (
            <div className="text-center text-xs text-[#E8E8D8]/60 italic">
              After {team.seasons} seasons, the {team.city} {team.name} have ceased operations. Their legacy will be preserved in the Museum.
            </div>
          )}

          <button
            onClick={() => onRollComplete({ team, contracted, roll })}
            className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            Continue {currentIndex < teams.length - 1 ? "to Next At-Risk Team" : "to Voluntary Sales"} →
          </button>
        </>
      )}
    </div>
  );
}

// Screen 3: Voluntary Sale
function VoluntarySaleScreen({
  contractedTeams,
  allTeams,
  onContinue,
  onSellTeam
}: {
  contractedTeams: ContractionResult[];
  allTeams: Team[];
  onContinue: () => void;
  onSellTeam: (team: Team) => void;
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const contractedIds = contractedTeams.map(r => r.team.id);
  const availableTeams = allTeams.filter(t => !contractedIds.includes(t.id));

  const handleSellClick = (team: Team) => {
    setSelectedTeam(team);
    setShowConfirmModal(true);
  };

  const handleConfirmSale = () => {
    if (selectedTeam && confirmText === "SELL") {
      onSellTeam(selectedTeam);
      setShowConfirmModal(false);
      setSelectedTeam(null);
      setConfirmText("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg text-[#E8E8D8]">💰 VOLUNTARY TEAM SALE</div>
          <div className="text-xs text-[#E8E8D8]/60">Screen 3 of 12</div>
        </div>
      </div>

      <div className="text-sm text-[#E8E8D8] text-center">
        Would you like to sell any additional teams?
      </div>
      <div className="text-xs text-[#E8E8D8]/60 text-center">
        (This triggers contraction without a dice roll)
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#DD0000] p-4">
        <div className="text-xs text-[#FFD700] mb-2">⚠️ SCORNED PLAYER WARNING</div>
        <div className="text-[10px] text-[#E8E8D8]/80 space-y-1">
          <div>Selling a team with Fan Morale ≥ 50 will cause players to feel betrayed. They will receive:</div>
          <div>• Random negative personality shift</div>
          <div>• Trust damage (-20 to -40)</div>
          <div>• Performance volatility for 2 seasons</div>
        </div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4 max-h-[400px] overflow-y-auto">
        <div className="text-sm text-[#E8E8D8] mb-3">AVAILABLE TEAMS</div>
        <div className="space-y-2">
          {availableTeams.map(team => {
            const risk = team.fanMorale >= 50 ? { label: "Safe", emoji: "✅" } : 
                        team.fanMorale >= 40 ? { label: "Low Risk", emoji: "🟡" } :
                        { label: "At Risk", emoji: "🟠" };

            return (
              <div key={team.id} className="bg-[#4A6844] border-[2px] border-[#5599FF] p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input type="radio" disabled className="w-4 h-4" />
                  <div>
                    <div className="text-xs text-[#E8E8D8]">{team.city} {team.name}</div>
                    <div className="text-[10px] text-[#E8E8D8]/60">
                      Morale: {team.fanMorale} {risk.emoji} {risk.label}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleSellClick(team)}
                  className="bg-[#DD0000] border-[3px] border-[#000] px-3 py-1 text-xs text-[#E8E8D8] hover:bg-[#BB0000] active:scale-95 transition-transform"
                >
                  Sell Team
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {contractedTeams.length > 0 && (
        <div className="text-xs text-[#E8E8D8]/60 text-center">
          Already contracted this phase: {contractedTeams.map(r => `${r.team.city} ${r.team.name}`).join(", ")}
        </div>
      )}

      <button
        onClick={onContinue}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        No More Sales - Continue →
      </button>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#5A8352] border-[5px] border-[#DD0000] p-6 max-w-lg w-full">
            <div className="text-lg text-[#FFD700] mb-4 text-center">⚠️ CONFIRM TEAM SALE</div>
            
            <div className="text-sm text-[#E8E8D8] mb-4 text-center">
              Are you sure you want to sell the {selectedTeam.city.toUpperCase()} {selectedTeam.name.toUpperCase()}?
            </div>

            <div className="bg-[#4A6844] border-[3px] border-[#DD0000] p-4 mb-4">
              <div className="text-xs text-[#E8E8D8] mb-2">Current Fan Morale: {selectedTeam.fanMorale} {selectedTeam.fanMorale >= 50 ? "(HIGH)" : "(LOW)"}</div>
              
              {selectedTeam.fanMorale >= 50 && (
                <>
                  <div className="text-sm text-[#DD0000] mb-2">🚨 SCORNED PLAYER EFFECTS WILL APPLY 🚨</div>
                  <div className="text-[10px] text-[#E8E8D8]/80 space-y-1">
                    <div>18 players will become SCORNED:</div>
                    <div>• Personality shifts to negative</div>
                    <div>• Trust damage: -20 to -40</div>
                    <div>• Rating volatility for 2 seasons</div>
                  </div>
                </>
              )}

              <div className="text-xs text-[#FFD700] mt-2">This action CANNOT be undone.</div>
            </div>

            <div className="mb-4">
              <div className="text-xs text-[#E8E8D8] mb-2">Type "SELL" to confirm:</div>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full bg-[#2A3424] border-[3px] border-[#5599FF] p-2 text-sm text-[#E8E8D8]"
                placeholder="SELL"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedTeam(null);
                  setConfirmText("");
                }}
                className="flex-1 bg-[#4A6844] border-[3px] border-[#5599FF] py-2 text-sm text-[#E8E8D8] hover:bg-[#3A5434] active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSale}
                disabled={confirmText !== "SELL"}
                className="flex-1 bg-[#DD0000] border-[3px] border-[#000] py-2 text-sm text-[#E8E8D8] hover:bg-[#BB0000] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
              >
                Confirm Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Screen 4: Protection Selection
function ProtectionSelectionScreen({
  team,
  roster,
  onComplete
}: {
  team: Team;
  roster: Player[];
  onComplete: (protectedPlayersList: Player[]) => void;
}) {
  const [protectedPlayers, setProtectedPlayers] = useState<Player[]>([]);

  // Cornerstone auto-protected (first player with CORNERSTONE trait, or first player if none)
  const cornerstone = roster.find(p => p.traits.includes("CORNERSTONE")) || roster[0];
  const availablePlayers = roster.filter(p => p.id !== cornerstone?.id && !protectedPlayers.find(pp => pp.id === p.id));

  const handleProtect = (player: Player) => {
    if (protectedPlayers.length < 3) {
      setProtectedPlayers([...protectedPlayers, player]);
    }
  };

  const handleRemoveProtection = (player: Player) => {
    setProtectedPlayers(protectedPlayers.filter(p => p.id !== player.id));
  };

  const canContinue = protectedPlayers.length === 3;

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-lg text-[#E8E8D8]">🛡️ PROTECTION SELECTION</div>
          <div className="text-xs text-[#E8E8D8]/60">Screen 4 of 12</div>
        </div>
        <div className="text-sm text-[#E8E8D8]/60 text-center">{team.city} {team.name}</div>
      </div>

      <div className="text-xs text-[#E8E8D8] text-center">
        Select 4 players to protect from the expansion draft.
      </div>
      <div className="text-xs text-[#E8E8D8]/60 text-center">
        Protected players will enter Free Agency instead of the draft pool.
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
        <div className="text-sm text-[#E8E8D8] mb-3">🛡️ PROTECTED PLAYERS (4 slots)</div>
        
        <div className="space-y-2">
          {/* Slot 1: Cornerstone (locked) */}
          <div className="bg-[#4A6844] border-[3px] border-[#FFD700] p-2">
            <div className="text-xs text-[#E8E8D8]">
              Slot 1: 🔒 {cornerstone?.name} ({cornerstone?.position}) - {cornerstone?.grade}
            </div>
            <div className="text-[10px] text-[#FFD700]">← CORNERSTONE (Auto)</div>
            <div className="text-[10px] text-[#5599FF]">Becomes: LEGACY CORNERSTONE</div>
          </div>

          {/* Slots 2-4 */}
          {[0, 1, 2].map((index) => {
            const player = protectedPlayers[index];
            return (
              <div key={index} className="bg-[#4A6844] border-[3px] border-[#5599FF] p-2">
                {player ? (
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[#E8E8D8]">
                      Slot {index + 2}: {player.name} ({player.position}) - {player.grade}
                    </div>
                    <button
                      onClick={() => handleRemoveProtection(player)}
                      className="bg-[#DD0000] border-[2px] border-[#000] px-2 py-1 text-[10px] text-[#E8E8D8] hover:bg-[#BB0000] active:scale-95 transition-transform"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-[#E8E8D8]/60">Slot {index + 2}: [ Select Player ]</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4 max-h-[300px] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-[#E8E8D8]">ROSTER ({availablePlayers.length} unprotected)</div>
          <div className="text-xs text-[#E8E8D8]/60">Sort: Grade</div>
        </div>

        <div className="space-y-2">
          {availablePlayers.map(player => (
            <div key={player.id} className="bg-[#4A6844] border-[2px] border-[#5599FF] p-2 flex items-center justify-between">
              <div>
                <div className="text-xs text-[#E8E8D8]">{player.name} ({player.position})</div>
                <div className="text-[10px] text-[#E8E8D8]/60">
                  Grade: {player.grade} │ Age: {player.age} │ Salary: ${(player.salary / 1000000).toFixed(1)}M │ WAR: {player.war}
                </div>
              </div>
              <button
                onClick={() => handleProtect(player)}
                disabled={protectedPlayers.length >= 3}
                className="bg-[#5599FF] border-[2px] border-[#000] px-3 py-1 text-xs text-[#E8E8D8] hover:bg-[#3366FF] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
              >
                Protect
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-[#E8E8D8]/60 text-center">
        Protected: {protectedPlayers.length + 1}/4
      </div>

      <button
        onClick={() => onComplete([cornerstone!, ...protectedPlayers])}
        disabled={!canContinue}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Continue →
      </button>
    </div>
  );
}

// Screen 5: Legacy Cornerstone
function LegacyCornerstoneScreen({
  team,
  cornerstonePlayer,
  onContinue
}: {
  team: Team;
  cornerstonePlayer: Player;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg text-[#E8E8D8]">🏛️ LEGACY CORNERSTONE DESIGNATION</div>
          <div className="text-xs text-[#E8E8D8]/60">Screen 5 of 12</div>
        </div>
      </div>

      <div className="text-center">
        <div className="w-40 h-40 bg-[#E8E8D8] rounded-full mx-auto mb-4 flex items-center justify-center text-5xl">
          ⭐
        </div>
        <div className="text-2xl text-[#FFD700] mb-2">🏛️ LEGACY CORNERSTONE 🏛️</div>
      </div>

      <div className="text-center">
        <div className="text-2xl text-[#E8E8D8] mb-1">{cornerstonePlayer.name}</div>
        <div className="text-sm text-[#E8E8D8]/60">{cornerstonePlayer.position}</div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
        <div className="text-sm text-[#FFD700] mb-3">LEGACY STATUS AWARDED</div>
        
        <div className="text-xs text-[#E8E8D8]/80 space-y-2 mb-4">
          <div>
            As the heart and soul of the {team.city} {team.name}, {cornerstonePlayer.name} has been designated as a LEGACY CORNERSTONE.
          </div>
          
          <div className="text-[10px] text-[#E8E8D8]/60">This permanent designation recognizes:</div>
          <div className="text-[10px] text-[#E8E8D8]/60 space-y-1 pl-2">
            <div>• The tragic loss of his franchise home</div>
            <div>• His dedication through difficult years</div>
            <div>• His role as the foundation of a fallen team</div>
          </div>
        </div>

        <div className="border-t border-[#E8E8D8]/20 my-3" />

        <div className="text-xs text-[#E8E8D8]/80 space-y-1">
          <div className="text-[#5599FF] mb-1">CAREER WITH {team.name.toUpperCase()}:</div>
          <div className="text-[10px]">Seasons: 8 │ WAR: 32.5 │ All-Star: 4× │ Silver Slugger: 2×</div>
        </div>

        <div className="border-t border-[#E8E8D8]/20 my-3" />

        <div className="text-xs text-[#E8E8D8]/80 space-y-1">
          <div className="text-[#5599FF] mb-1">EFFECTS:</div>
          <div className="text-[10px] space-y-1">
            <div>• Badge: "Legacy Cornerstone of {team.city} {team.name}"</div>
            <div>• Museum entry in Defunct Teams section</div>
            <div>• Affects future team chemistry (narrative weight)</div>
            <div>• Status is PERMANENT (never removed)</div>
          </div>
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Continue to Expansion Draft →
      </button>
    </div>
  );
}

// Screen 6: Expansion Draft (placeholder)
function ExpansionDraftScreen({ 
  onContinue,
  contractedTeams,
  protectedPlayers
}: { 
  onContinue: () => void;
  contractedTeams: ContractionResult[];
  protectedPlayers: Record<string, Player[]>;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-lg text-[#E8E8D8]">📋 EXPANSION DRAFT - PLAYER SELECTION</div>
          <div className="text-xs text-[#E8E8D8]/60">Screen 6 of 12</div>
        </div>
        <div className="text-xs text-[#E8E8D8]/60 text-center">From: Contraction Pool</div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-6 text-center">
        <div className="text-sm text-[#E8E8D8] mb-2">DRAFT IN PROGRESS</div>
        <div className="text-xs text-[#E8E8D8]/60">
          Teams are selecting players from the contraction pool...
        </div>
        <div className="text-xs text-[#E8E8D8]/60 mt-4">
          (Full draft simulation coming in next phase)
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Continue to Player Disposal →
      </button>
    </div>
  );
}

// Screen 7: Scorned Effects (placeholder)
function ScornedEffectsScreen({ 
  scornedPlayers,
  onContinue 
}: { 
  scornedPlayers: ScornedPlayer[];
  onContinue: () => void;
}) {
  // Skip if no scorned players
  useEffect(() => {
    if (scornedPlayers.length === 0) {
      onContinue();
    }
  }, [scornedPlayers.length, onContinue]);

  if (scornedPlayers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg text-[#E8E8D8]">😤 SCORNED PLAYERS</div>
          <div className="text-xs text-[#E8E8D8]/60">Screen 7 of 12</div>
        </div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-6 text-center">
        <div className="text-sm text-[#E8E8D8]">No scorned players this phase</div>
      </div>

      <button
        onClick={onContinue}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Continue →
      </button>
    </div>
  );
}

// Screen 8: Player Disposal (placeholder)
function PlayerDisposalScreen({ 
  contractedTeams,
  protectedPlayers,
  onContinue 
}: { 
  contractedTeams: ContractionResult[];
  protectedPlayers: Record<string, Player[]>;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-lg text-[#E8E8D8]">📤 PLAYER DISPOSAL</div>
          <div className="text-xs text-[#E8E8D8]/60">Screen 8 of 12</div>
        </div>
        <div className="text-xs text-[#E8E8D8]/60 text-center">Remaining Players</div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-6 text-center">
        <div className="text-sm text-[#E8E8D8] mb-2">RETIREMENT CHECKS COMPLETE</div>
        <div className="text-xs text-[#E8E8D8]/60">
          Undrafted players have been processed with +30% retirement probability
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Continue to Museum Entry →
      </button>
    </div>
  );
}

// Screen 9: Museum Entry (placeholder)
function MuseumEntryScreen({ 
  contractedTeams,
  onContinue 
}: { 
  contractedTeams: ContractionResult[];
  onContinue: () => void;
}) {
  const contracted = contractedTeams.find(r => r.contracted);
  if (!contracted) {
    onContinue();
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-lg text-[#E8E8D8]">🏛️ MUSEUM: DEFUNCT TEAMS</div>
          <div className="text-xs text-[#E8E8D8]/60">Screen 9 of 12</div>
        </div>
        <div className="text-xs text-[#E8E8D8]/60 text-center">{contracted.team.city} {contracted.team.name} Added</div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-6">
        <div className="text-center mb-4">
          <div className="w-32 h-32 bg-[#E8E8D8] rounded-full mx-auto mb-4 flex items-center justify-center text-4xl opacity-60">
            🏟️
          </div>
          <div className="text-xl text-[#E8E8D8] mb-1" style={{ filter: 'sepia(0.5)' }}>
            {contracted.team.city} {contracted.team.name}
          </div>
          <div className="text-sm text-[#E8E8D8]/60">1983 - 2026</div>
        </div>

        <div className="border-t border-[#E8E8D8]/20 my-4" />

        <div className="text-xs text-[#E8E8D8]/80 space-y-2">
          <div className="text-[#5599FF] mb-2">FRANCHISE HISTORY</div>
          <div className="text-[10px] space-y-1">
            <div>Seasons Active: {contracted.team.seasons}</div>
            <div>Championships: {contracted.team.championships}</div>
            <div>Playoff Appearances: {contracted.team.playoffAppearances}</div>
            <div>Final Record: {contracted.team.record}</div>
            <div>Final Fan Morale: {contracted.team.fanMorale}</div>
            <div>Contraction Reason: {contracted.voluntary ? "Voluntary Sale" : "Low Fan Morale"}</div>
          </div>
        </div>

        <div className="border-t border-[#E8E8D8]/20 my-4" />

        <div className="text-xs text-[#E8E8D8]/80">
          <div className="text-[#5599FF] mb-1">LEGACY CORNERSTONE: {contracted.team.cornerstonePlayer}</div>
          <div className="text-[10px] text-[#E8E8D8]/60 italic">
            "The last light of a fallen franchise"
          </div>
        </div>
      </div>

      <div className="text-xs text-[#E8E8D8]/60 text-center">
        This entry has been added to the Museum's Defunct Teams section.
      </div>

      <div className="flex gap-2">
        <button
          className="flex-1 bg-[#5A8352] border-[5px] border-[#5599FF] py-3 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          View in Museum
        </button>
        <button
          onClick={onContinue}
          className="flex-1 bg-[#5A8352] border-[5px] border-[#4A6844] py-3 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// Screen 10: Expansion Creation (placeholder)
function ExpansionCreationScreen({ 
  onContinue,
  onSkip
}: { 
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg text-[#E8E8D8]">🏟️ CREATE EXPANSION TEAM</div>
          <div className="text-xs text-[#E8E8D8]/60">Screen 10 of 12</div>
        </div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-6 text-center">
        <div className="text-sm text-[#E8E8D8] mb-2">Would you like to create a new expansion team?</div>
        <div className="text-xs text-[#E8E8D8]/60">
          (Full team creation wizard coming in next phase)
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSkip}
          className="flex-1 bg-[#5A8352] border-[5px] border-[#5599FF] py-3 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          Skip - No Expansion
        </button>
        <button
          onClick={onSkip}
          className="flex-1 bg-[#5A8352] border-[5px] border-[#4A6844] py-3 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          Create Team →
        </button>
      </div>
    </div>
  );
}

// Screen 11: Expansion Team Draft (placeholder)
function ExpansionTeamDraftScreen({ 
  onContinue 
}: { 
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg text-[#E8E8D8]">📋 EXPANSION TEAM DRAFT</div>
          <div className="text-xs text-[#E8E8D8]/60">Screen 11 of 12</div>
        </div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-6 text-center">
        <div className="text-sm text-[#E8E8D8]">No expansion teams created</div>
      </div>

      <button
        onClick={onContinue}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        Continue to Summary →
      </button>
    </div>
  );
}

// Screen 12: Summary
function SummaryScreen({ 
  contractedTeams,
  expansionTeams,
  onComplete 
}: { 
  contractedTeams: ContractionResult[];
  expansionTeams: Team[];
  onComplete: () => void;
}) {
  const contracted = contractedTeams.filter(r => r.contracted);
  const survived = contractedTeams.filter(r => !r.contracted);

  return (
    <div className="space-y-4">
      <div className="bg-[#5A8352] border-[5px] border-[#FFD700] p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-lg text-[#E8E8D8]">📊 CONTRACTION/EXPANSION SUMMARY</div>
          <div className="text-xs text-[#E8E8D8]/60">Screen 12 of 12</div>
        </div>
        <div className="text-xs text-[#E8E8D8]/60 text-center">Season 26 Complete</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
          <div className="text-sm text-[#E8E8D8] mb-3">CONTRACTION RESULTS</div>
          <div className="text-xs text-[#E8E8D8]/80 space-y-2">
            <div>Teams at Risk: {contractedTeams.length}</div>
            <div className="border-t border-[#E8E8D8]/20 my-2" />
            {contracted.map(r => (
              <div key={r.team.id} className="text-[10px]">
                ❌ {r.team.city} {r.team.name}<br />
                <span className="text-[#E8E8D8]/60">Morale: {r.team.fanMorale} → Contracted</span>
              </div>
            ))}
            {survived.map(r => (
              <div key={r.team.id} className="text-[10px]">
                ✅ {r.team.city} {r.team.name}<br />
                <span className="text-[#E8E8D8]/60">Morale: {r.team.fanMorale} → Survived</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
          <div className="text-sm text-[#E8E8D8] mb-3">EXPANSION RESULTS</div>
          <div className="text-xs text-[#E8E8D8]/80">
            {expansionTeams.length === 0 ? (
              <div className="text-[#E8E8D8]/60">No new teams created</div>
            ) : (
              <div>New Teams: {expansionTeams.length}</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
        <div className="text-sm text-[#E8E8D8] mb-2">LEAGUE STRUCTURE</div>
        <div className="text-xs text-[#E8E8D8]/80">
          Previous: 20 teams │ Now: {20 - contracted.length + expansionTeams.length} teams 
          {contracted.length > 0 && ` (−${contracted.length} contracted`}
          {expansionTeams.length > 0 && `, +${expansionTeams.length} expansion`}
          {(contracted.length > 0 || expansionTeams.length > 0) && ')'}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="flex-1 bg-[#5A8352] border-[5px] border-[#5599FF] py-3 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          Export Summary
        </button>
        <button
          onClick={onComplete}
          className="flex-1 bg-[#5A8352] border-[5px] border-[#4A6844] py-3 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          Continue to Next Phase →
        </button>
      </div>
    </div>
  );
}