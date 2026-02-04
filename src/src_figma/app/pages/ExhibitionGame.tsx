import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TeamRoster, type Player, type Pitcher } from "@/app/components/TeamRoster";
import { getTeamColors } from "@/config/teamColors";
import { defaultTigersPlayers, defaultTigersPitchers, defaultSoxPlayers, defaultSoxPitchers } from "@/data/defaultRosters";

export function ExhibitionGame() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"select" | "lineups">("select");
  
  // State for rosters - deep copy to avoid mutating defaults
  const [awayPlayers, setAwayPlayers] = useState<Player[]>(JSON.parse(JSON.stringify(defaultTigersPlayers)));
  const [awayPitchers, setAwayPitchers] = useState<Pitcher[]>(JSON.parse(JSON.stringify(defaultTigersPitchers)));
  const [homePlayers, setHomePlayers] = useState<Player[]>(JSON.parse(JSON.stringify(defaultSoxPlayers)));
  const [homePitchers, setHomePitchers] = useState<Pitcher[]>(JSON.parse(JSON.stringify(defaultSoxPitchers)));

  const awayTeamId = 'tigers';
  const homeTeamId = 'sox';

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

          {step === "select" && (
            <div className="space-y-4">
              {/* Away team selection */}
              <div className="bg-[#5A7A52] border-[6px] border-[#E8E8D8] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]">
                <div className="text-xs text-[#C4A853] mb-3 font-bold tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>▲ AWAY TEAM</div>
                <select className="w-full bg-[#4A6A42] border-4 border-[#E8E8D8] p-3 text-sm text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                  <option>SELECT AWAY TEAM...</option>
                  <option>DETROIT TIGERS</option>
                  <option>CHICAGO SOX</option>
                  <option>NEW YORK BOMBERS</option>
                  <option>TAMPA BAY RAYS</option>
                </select>
              </div>

              {/* Home team selection */}
              <div className="bg-[#5A7A52] border-[6px] border-[#E8E8D8] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]">
                <div className="text-xs text-[#C4A853] mb-3 font-bold tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>▼ HOME TEAM</div>
                <select className="w-full bg-[#4A6A42] border-4 border-[#E8E8D8] p-3 text-sm text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                  <option>SELECT HOME TEAM...</option>
                  <option>DETROIT TIGERS</option>
                  <option>CHICAGO SOX</option>
                  <option>NEW YORK BOMBERS</option>
                  <option>TAMPA BAY RAYS</option>
                </select>
              </div>

              <button
                onClick={() => setStep("lineups")}
                className="w-full bg-[#C4A853] border-[6px] border-[#E8E8D8] py-5 text-base text-[#4A6A42] font-bold tracking-wide hover:bg-[#B59A4A] active:scale-95 transition-transform shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
              >
                CONTINUE ▶
              </button>
            </div>
          )}

          {step === "lineups" && (
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
                  teamName="TIGERS"
                  teamColor={getTeamColors(awayTeamId).primary}
                  teamBorderColor={getTeamColors(awayTeamId).secondary}
                  players={awayPlayers}
                  pitchers={awayPitchers}
                  isAway={true}
                  onSubstitution={handleAwaySubstitution}
                  onPitcherSubstitution={handleAwayPitcherSubstitution}
                  onPositionSwap={handleAwayPositionSwap}
                />
                <TeamRoster
                  teamName="SOX"
                  teamColor={getTeamColors(homeTeamId).primary}
                  teamBorderColor={getTeamColors(homeTeamId).secondary}
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
                  className="bg-[#C4A853] border-[5px] border-[#E8E8D8] py-4 text-sm text-[#4A6A42] font-bold hover:bg-[#B59A4A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
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