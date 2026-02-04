import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TeamRoster, type Player as RosterPlayer, type Pitcher as RosterPitcher } from "@/app/components/TeamRoster";
import { useLeagueBuilderData, type LeagueTemplate, type Team, type Player as LBPlayer } from "../../hooks/useLeagueBuilderData";

// Convert League Builder player to TeamRoster player format
function convertToRosterPlayer(player: LBPlayer, battingOrder?: number, position?: string): RosterPlayer {
  const fullName = `${player.firstName} ${player.lastName}`;
  return {
    name: fullName,
    position: position || player.primaryPosition || 'DH',
    battingOrder,
    stats: {
      ab: 0,
      h: 0,
      r: 0,
      rbi: 0,
      bb: 0,
      k: 0,
    },
    battingHand: player.bats === 'S' ? 'S' : (player.bats as 'L' | 'R'),
  };
}

// Convert League Builder player (pitcher) to TeamRoster pitcher format
function convertToRosterPitcher(player: LBPlayer, isActive: boolean): RosterPitcher {
  const fullName = `${player.firstName} ${player.lastName}`;
  return {
    name: fullName,
    stats: {
      ip: '0',
      h: 0,
      r: 0,
      er: 0,
      bb: 0,
      k: 0,
      pitches: 0,
    },
    throwingHand: player.throws,
    isStarter: player.primaryPosition === 'SP',
    isActive,
  };
}

export function ExhibitionGame() {
  const navigate = useNavigate();
  const { leagues, teams, players, isLoading, error } = useLeagueBuilderData();
  const [step, setStep] = useState<"league" | "select" | "lineups">("league");

  // League and team selection state
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [selectedAwayTeamId, setSelectedAwayTeamId] = useState<string | null>(null);
  const [selectedHomeTeamId, setSelectedHomeTeamId] = useState<string | null>(null);

  // State for rosters
  const [awayPlayers, setAwayPlayers] = useState<RosterPlayer[]>([]);
  const [awayPitchers, setAwayPitchers] = useState<RosterPitcher[]>([]);
  const [homePlayers, setHomePlayers] = useState<RosterPlayer[]>([]);
  const [homePitchers, setHomePitchers] = useState<RosterPitcher[]>([]);

  // Get teams in selected league
  const leagueTeams = useMemo(() => {
    if (!selectedLeagueId) return [];
    const league = leagues.find(l => l.id === selectedLeagueId);
    if (!league) return [];
    return teams.filter(t => league.teamIds?.includes(t.id));
  }, [selectedLeagueId, leagues, teams]);

  // Get players for a specific team (using currentTeamId)
  const getTeamPlayersList = (teamId: string): LBPlayer[] => {
    return players.filter(p => p.currentTeamId === teamId);
  };

  // Load roster when team is selected
  useEffect(() => {
    if (selectedAwayTeamId) {
      const teamPlayersList = getTeamPlayersList(selectedAwayTeamId);
      const batters = teamPlayersList.filter(p => !['SP', 'RP', 'CL'].includes(p.primaryPosition));
      const pitchersList = teamPlayersList.filter(p => ['SP', 'RP', 'CL'].includes(p.primaryPosition));

      // Set up batting lineup (first 9 batters)
      const lineup = batters.slice(0, 9).map((p, idx) => convertToRosterPlayer(p, idx + 1, p.primaryPosition));
      const bench = batters.slice(9).map(p => convertToRosterPlayer(p, undefined, p.primaryPosition));
      setAwayPlayers([...lineup, ...bench]);

      // Set up pitching staff (first SP is active)
      const starters = pitchersList.filter(p => p.primaryPosition === 'SP');
      const relievers = pitchersList.filter(p => p.primaryPosition !== 'SP');
      setAwayPitchers([
        ...starters.map((p, idx) => convertToRosterPitcher(p, idx === 0)),
        ...relievers.map(p => convertToRosterPitcher(p, false)),
      ]);
    }
  }, [selectedAwayTeamId, players]);

  useEffect(() => {
    if (selectedHomeTeamId) {
      const teamPlayersList = getTeamPlayersList(selectedHomeTeamId);
      const batters = teamPlayersList.filter(p => !['SP', 'RP', 'CL'].includes(p.primaryPosition));
      const pitchersList = teamPlayersList.filter(p => ['SP', 'RP', 'CL'].includes(p.primaryPosition));

      const lineup = batters.slice(0, 9).map((p, idx) => convertToRosterPlayer(p, idx + 1, p.primaryPosition));
      const bench = batters.slice(9).map(p => convertToRosterPlayer(p, undefined, p.primaryPosition));
      setHomePlayers([...lineup, ...bench]);

      const starters = pitchersList.filter(p => p.primaryPosition === 'SP');
      const relievers = pitchersList.filter(p => p.primaryPosition !== 'SP');
      setHomePitchers([
        ...starters.map((p, idx) => convertToRosterPitcher(p, idx === 0)),
        ...relievers.map(p => convertToRosterPitcher(p, false)),
      ]);
    }
  }, [selectedHomeTeamId, players]);

  // Get selected team objects
  const awayTeam = teams.find(t => t.id === selectedAwayTeamId);
  const homeTeam = teams.find(t => t.id === selectedHomeTeamId);

  // Handle batting order changes for away team
  const handleAwayBattingOrderChange = (player1Name: string, player2Name: string) => {
    setAwayPlayers(prev => {
      const newPlayers = [...prev];
      const player1Index = newPlayers.findIndex(p => p.name === player1Name);
      const player2Index = newPlayers.findIndex(p => p.name === player2Name);
      
      if (player1Index !== -1 && player2Index !== -1) {
        // Swap batting orders
        const temp = newPlayers[player1Index].battingOrder;
        newPlayers[player1Index].battingOrder = newPlayers[player2Index].battingOrder;
        newPlayers[player2Index].battingOrder = temp;
      }
      
      return newPlayers;
    });
  };

  // Handle position swaps for away team
  const handleAwayPositionSwap = (player1Name: string, player2Name: string) => {
    setAwayPlayers(prev => {
      const newPlayers = [...prev];
      const player1Index = newPlayers.findIndex(p => p.name === player1Name);
      const player2Index = newPlayers.findIndex(p => p.name === player2Name);
      
      if (player1Index !== -1 && player2Index !== -1) {
        // Swap positions
        const tempPos = newPlayers[player1Index].position;
        newPlayers[player1Index].position = newPlayers[player2Index].position;
        newPlayers[player2Index].position = tempPos;
      }
      
      return newPlayers;
    });
  };

  // Handle substitutions for away team
  const handleAwaySubstitution = (benchPlayerName: string, lineupPlayerName: string) => {
    setAwayPlayers(prev => {
      const newPlayers = [...prev];
      const benchIndex = newPlayers.findIndex(p => p.name === benchPlayerName);
      const lineupIndex = newPlayers.findIndex(p => p.name === lineupPlayerName);
      
      if (benchIndex !== -1 && lineupIndex !== -1) {
        // Swap batting order and position
        const tempOrder = newPlayers[lineupIndex].battingOrder;
        const tempPos = newPlayers[lineupIndex].position;
        
        newPlayers[benchIndex].battingOrder = tempOrder;
        newPlayers[benchIndex].position = tempPos;
        
        newPlayers[lineupIndex].battingOrder = undefined;
        newPlayers[lineupIndex].position = newPlayers[benchIndex].position;
      }
      
      return newPlayers;
    });
  };

  // Handle pitcher substitutions for away team
  const handleAwayPitcherSubstitution = (newPitcherName: string, replacedName: string, replacedType: 'player' | 'pitcher') => {
    if (replacedType === 'pitcher') {
      setAwayPitchers(prev => {
        const newPitchers = [...prev];
        const newPitcherIndex = newPitchers.findIndex(p => p.name === newPitcherName);
        const replacedIndex = newPitchers.findIndex(p => p.name === replacedName);
        
        if (newPitcherIndex !== -1 && replacedIndex !== -1) {
          newPitchers[newPitcherIndex].isActive = true;
          newPitchers[replacedIndex].isActive = false;
        }
        
        return newPitchers;
      });
    }
  };

  // Same handlers for home team
  const handleHomeBattingOrderChange = (player1Name: string, player2Name: string) => {
    setHomePlayers(prev => {
      const newPlayers = [...prev];
      const player1Index = newPlayers.findIndex(p => p.name === player1Name);
      const player2Index = newPlayers.findIndex(p => p.name === player2Name);
      
      if (player1Index !== -1 && player2Index !== -1) {
        const temp = newPlayers[player1Index].battingOrder;
        newPlayers[player1Index].battingOrder = newPlayers[player2Index].battingOrder;
        newPlayers[player2Index].battingOrder = temp;
      }
      
      return newPlayers;
    });
  };

  const handleHomePositionSwap = (player1Name: string, player2Name: string) => {
    setHomePlayers(prev => {
      const newPlayers = [...prev];
      const player1Index = newPlayers.findIndex(p => p.name === player1Name);
      const player2Index = newPlayers.findIndex(p => p.name === player2Name);
      
      if (player1Index !== -1 && player2Index !== -1) {
        const tempPos = newPlayers[player1Index].position;
        newPlayers[player1Index].position = newPlayers[player2Index].position;
        newPlayers[player2Index].position = tempPos;
      }
      
      return newPlayers;
    });
  };

  const handleHomeSubstitution = (benchPlayerName: string, lineupPlayerName: string) => {
    setHomePlayers(prev => {
      const newPlayers = [...prev];
      const benchIndex = newPlayers.findIndex(p => p.name === benchPlayerName);
      const lineupIndex = newPlayers.findIndex(p => p.name === lineupPlayerName);
      
      if (benchIndex !== -1 && lineupIndex !== -1) {
        const tempOrder = newPlayers[lineupIndex].battingOrder;
        const tempPos = newPlayers[lineupIndex].position;
        
        newPlayers[benchIndex].battingOrder = tempOrder;
        newPlayers[benchIndex].position = tempPos;
        
        newPlayers[lineupIndex].battingOrder = undefined;
        newPlayers[lineupIndex].position = newPlayers[benchIndex].position;
      }
      
      return newPlayers;
    });
  };

  const handleHomePitcherSubstitution = (newPitcherName: string, replacedName: string, replacedType: 'player' | 'pitcher') => {
    if (replacedType === 'pitcher') {
      setHomePitchers(prev => {
        const newPitchers = [...prev];
        const newPitcherIndex = newPitchers.findIndex(p => p.name === newPitcherName);
        const replacedIndex = newPitchers.findIndex(p => p.name === replacedName);
        
        if (newPitcherIndex !== -1 && replacedIndex !== -1) {
          newPitchers[newPitcherIndex].isActive = true;
          newPitchers[replacedIndex].isActive = false;
        }
        
        return newPitchers;
      });
    }
  };

  const handleStartGame = () => {
    // Pass the configured rosters to the game tracker
    navigate("/game-tracker/exhibition-1", {
      state: {
        awayPlayers,
        awayPitchers,
        homePlayers,
        homePitchers
      }
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-[#6B9462] text-[#E8E8D8] p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate("/")}
              className="p-2 bg-[#4A6A42] hover:bg-[#5A7A52] border-4 border-[#E8E8D8] transition active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-[#E8E8D8]" />
            </button>
            <div className="bg-[#4A6A42] border-[6px] border-[#E8E8D8] px-6 py-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
              <h1 className="text-lg text-[#E8E8D8] tracking-wider font-bold" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>EXHIBITION GAME</h1>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-[#C4A853]" />
              <span className="ml-3 text-[#E8E8D8]">Loading leagues...</span>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertCircle className="w-8 h-8 text-[#DD0000] mb-3" />
              <p className="text-[#DD0000] mb-2">Failed to load leagues</p>
              <p className="text-xs text-[#E8E8D8]/70">{error}</p>
            </div>
          )}

          {/* No Leagues State */}
          {!isLoading && !error && leagues.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertCircle className="w-8 h-8 text-[#C4A853] mb-3" />
              <p className="text-[#E8E8D8] mb-2">No leagues found</p>
              <p className="text-xs text-[#E8E8D8]/70 mb-4">Create a league in League Builder first</p>
              <button
                onClick={() => navigate("/league-builder")}
                className="px-6 py-3 bg-[#C4A853] border-4 border-[#E8E8D8] text-[#4A6A42] font-bold text-sm hover:bg-[#B59A4A] transition-all"
              >
                GO TO LEAGUE BUILDER
              </button>
            </div>
          )}

          {/* Step 1: League Selection */}
          {!isLoading && !error && leagues.length > 0 && step === "league" && (
            <div className="space-y-4">
              <div className="bg-[#5A7A52] border-[6px] border-[#E8E8D8] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]">
                <div className="text-xs text-[#C4A853] mb-3 font-bold tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SELECT LEAGUE</div>
                <div className="space-y-2">
                  {leagues.map(league => {
                    const teamCount = teams.filter(t => league.teamIds?.includes(t.id)).length;
                    const isSelected = selectedLeagueId === league.id;
                    return (
                      <button
                        key={league.id}
                        onClick={() => {
                          setSelectedLeagueId(league.id);
                          setSelectedAwayTeamId(null);
                          setSelectedHomeTeamId(null);
                        }}
                        className={`w-full text-left p-4 border-4 transition-all ${
                          isSelected
                            ? "border-[#C4A853] bg-[#C4A853]/20"
                            : "border-[#E8E8D8] bg-[#4A6A42] hover:border-[#C4A853]"
                        }`}
                      >
                        <div className="text-sm font-bold text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                          {league.name.toUpperCase()}
                        </div>
                        <div className="text-xs text-[#E8E8D8]/70" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
                          {teamCount} teams
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setStep("select")}
                disabled={!selectedLeagueId}
                className={`w-full border-[6px] border-[#E8E8D8] py-5 text-base font-bold tracking-wide transition-transform shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] ${
                  selectedLeagueId
                    ? "bg-[#C4A853] text-[#4A6A42] hover:bg-[#B59A4A] active:scale-95"
                    : "bg-[#3A5A32] text-[#8A9A82] cursor-not-allowed"
                }`}
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
              >
                CONTINUE ▶
              </button>
            </div>
          )}

          {/* Step 2: Team Selection */}
          {!isLoading && !error && step === "select" && (
            <div className="space-y-4">
              {/* Away team selection */}
              <div className="bg-[#5A7A52] border-[6px] border-[#E8E8D8] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]">
                <div className="text-xs text-[#C4A853] mb-3 font-bold tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>▲ AWAY TEAM</div>
                <select
                  value={selectedAwayTeamId || ""}
                  onChange={(e) => setSelectedAwayTeamId(e.target.value || null)}
                  className="w-full bg-[#4A6A42] border-4 border-[#E8E8D8] p-3 text-sm text-[#E8E8D8] font-bold"
                  style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                >
                  <option value="">SELECT AWAY TEAM...</option>
                  {leagueTeams.map(team => (
                    <option key={team.id} value={team.id} disabled={team.id === selectedHomeTeamId}>
                      {team.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Home team selection */}
              <div className="bg-[#5A7A52] border-[6px] border-[#E8E8D8] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]">
                <div className="text-xs text-[#C4A853] mb-3 font-bold tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>▼ HOME TEAM</div>
                <select
                  value={selectedHomeTeamId || ""}
                  onChange={(e) => setSelectedHomeTeamId(e.target.value || null)}
                  className="w-full bg-[#4A6A42] border-4 border-[#E8E8D8] p-3 text-sm text-[#E8E8D8] font-bold"
                  style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                >
                  <option value="">SELECT HOME TEAM...</option>
                  {leagueTeams.map(team => (
                    <option key={team.id} value={team.id} disabled={team.id === selectedAwayTeamId}>
                      {team.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStep("league")}
                  className="bg-[#4A6A42] border-[5px] border-[#E8E8D8] py-4 text-sm text-[#E8E8D8] font-bold hover:bg-[#5A7A52] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
                  style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                >
                  ◀ BACK
                </button>
                <button
                  onClick={() => setStep("lineups")}
                  disabled={!selectedAwayTeamId || !selectedHomeTeamId}
                  className={`border-[5px] border-[#E8E8D8] py-4 text-sm font-bold transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] ${
                    selectedAwayTeamId && selectedHomeTeamId
                      ? "bg-[#C4A853] text-[#4A6A42] hover:bg-[#B59A4A] active:scale-95"
                      : "bg-[#3A5A32] text-[#8A9A82] cursor-not-allowed"
                  }`}
                  style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
                >
                  CONTINUE ▶
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Lineups */}
          {!isLoading && !error && step === "lineups" && awayTeam && homeTeam && (
            <div className="space-y-4">
              <div className="bg-[#5A7A52] border-[6px] border-[#E8E8D8] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]">
                <div className="text-sm text-[#E8E8D8] mb-2 font-bold tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>CONFIRM LINEUPS</div>
                <div className="text-xs text-[#E8E8D8]/80 mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
                  DRAG AND DROP TO ADJUST BATTING ORDER, POSITIONS, AND STARTING PITCHER
                </div>
                <div className="text-[10px] text-[#E8E8D8]/60" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
                  CHANGES WILL CARRY THROUGH TO THE GAME
                </div>
              </div>

              {/* Team Rosters with Drag-and-Drop */}
              <div className="grid grid-cols-2 gap-3">
                <TeamRoster
                  teamName={awayTeam.name.toUpperCase()}
                  teamColor={awayTeam.colors?.primary || '#4A6A42'}
                  teamBorderColor={awayTeam.colors?.secondary || '#E8E8D8'}
                  players={awayPlayers}
                  pitchers={awayPitchers}
                  isAway={true}
                  onSubstitution={handleAwaySubstitution}
                  onPitcherSubstitution={handleAwayPitcherSubstitution}
                  onPositionSwap={handleAwayPositionSwap}
                />
                <TeamRoster
                  teamName={homeTeam.name.toUpperCase()}
                  teamColor={homeTeam.colors?.primary || '#4A6A42'}
                  teamBorderColor={homeTeam.colors?.secondary || '#E8E8D8'}
                  players={homePlayers}
                  pitchers={homePitchers}
                  isAway={false}
                  onSubstitution={handleHomeSubstitution}
                  onPitcherSubstitution={handleHomePitcherSubstitution}
                  onPositionSwap={handleHomePositionSwap}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStep("select")}
                  className="bg-[#4A6A42] border-[5px] border-[#E8E8D8] py-4 text-sm text-[#E8E8D8] font-bold hover:bg-[#5A7A52] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
                  style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                >
                  ◀ BACK
                </button>
                <button
                  onClick={handleStartGame}
                  disabled={awayPlayers.length === 0 || homePlayers.length === 0}
                  className={`border-[5px] border-[#E8E8D8] py-4 text-sm font-bold transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] ${
                    awayPlayers.length > 0 && homePlayers.length > 0
                      ? "bg-[#C4A853] text-[#4A6A42] hover:bg-[#B59A4A] active:scale-95"
                      : "bg-[#3A5A32] text-[#8A9A82] cursor-not-allowed"
                  }`}
                  style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
                >
                  START ▶
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
}