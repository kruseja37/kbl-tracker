import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle, Plus, Trash2 } from "lucide-react";
interface ScheduledGame {
  id: string;
  seasonNumber: number;
  gameNumber: number;
  dayNumber: number;
  date?: string;
  time?: string;
  awayTeamId: string;
  homeTeamId: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  result?: {
    awayScore: number;
    homeScore: number;
    winningTeamId: string;
    losingTeamId: string;
  };
}

interface ScheduleContentProps {
  games: ScheduledGame[];
  selectedTeam: string;
  onTeamChange: (team: string) => void;
  availableTeams: string[];
  onAddGame: () => void;
  dropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
  stadiumMap: Record<string, string>;
  seasonNumber?: number;
  teamNameMap?: Record<string, string>;
  onDeleteGame?: (gameId: string) => void;
}

export function ScheduleContent({
  games,
  selectedTeam,
  onTeamChange,
  availableTeams,
  onAddGame,
  dropdownOpen,
  setDropdownOpen,
  stadiumMap,
  seasonNumber = 1,
  teamNameMap = {},
  onDeleteGame,
}: ScheduleContentProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Helper: resolve team ID to display name
  const teamName = (id: string) => teamNameMap[id] || id;
  const filteredGames = selectedTeam === "FULL LEAGUE" 
    ? games 
    : games.filter(g => g.awayTeamId === selectedTeam || g.homeTeamId === selectedTeam);

  const completedGames = filteredGames.filter(g => g.status === 'COMPLETED').reverse();
  const upcomingGames = filteredGames.filter(g => g.status === 'SCHEDULED');
  const nextGame = upcomingGames[0];

  const renderDeleteButton = (gameId: string) => {
    if (!onDeleteGame) return null;
    if (confirmDeleteId === gameId) {
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteGame(gameId); setConfirmDeleteId(null); }}
            className="bg-[#DC3545] border-[2px] border-[#8B0000] px-2 py-0.5 text-[8px] text-white font-bold hover:bg-[#8B0000] transition-colors"
          >
            DELETE
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
            className="bg-[#4A6844] border-[2px] border-[#3F5A3A] px-2 py-0.5 text-[8px] text-[#E8E8D8] font-bold hover:bg-[#3F5A3A] transition-colors"
          >
            CANCEL
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(gameId); }}
        className="text-[#E8E8D8]/40 hover:text-[#DC3545] transition-colors p-1"
        title="Remove game"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    );
  };

  // Get team stats if filtering by team
  const getTeamStats = () => {
    if (selectedTeam === "FULL LEAGUE") return null;
    
    const teamGames = games.filter(g => 
      (g.awayTeamId === selectedTeam || g.homeTeamId === selectedTeam) && 
      g.status === 'COMPLETED'
    );
    
    const wins = teamGames.filter(g => g.result?.winningTeamId === selectedTeam).length;
    const losses = teamGames.length - wins;
    const winPct = teamGames.length > 0 ? (wins / teamGames.length).toFixed(3) : ".000";
    const gamesRemaining = games.filter(g => 
      (g.awayTeamId === selectedTeam || g.homeTeamId === selectedTeam) && 
      g.status === 'SCHEDULED'
    ).length;

    return { wins, losses, winPct, gamesRemaining };
  };

  const teamStats = getTeamStats();

  return (
    <div className="space-y-4">
      {/* Header with Add Game button */}
      <div className="bg-[#5A8352] p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-[#E8E8D8]">📅 SEASON {seasonNumber} SCHEDULE</div>
          <button
            onClick={onAddGame}
            className="bg-[#5599FF] border-[3px] border-[#3366FF] px-3 py-1 text-xs text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Game
          </button>
        </div>
        
        {teamStats ? (
          <div className="text-xs text-[#E8E8D8]/80">
            ⭐ {selectedTeam} │ {teamStats.wins}-{teamStats.losses} ({teamStats.winPct}) │ {teamStats.gamesRemaining} games remaining
          </div>
        ) : (
          <div className="text-xs text-[#E8E8D8]/80">
            Full League │ {games.length} games scheduled
          </div>
        )}
      </div>

      {/* Filter Dropdown */}
      <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
        <div className="text-[8px] text-[#E8E8D8] mb-3">▶ SEASON {seasonNumber} SCHEDULE</div>
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full bg-[#4A6844] py-2 px-3 text-[10px] text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform flex items-center justify-between"
          >
            <span>Filter: {selectedTeam}</span>
            {dropdownOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#4A6844] border-[3px] border-[#E8E8D8] z-10 max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  onTeamChange("FULL LEAGUE");
                  setDropdownOpen(false);
                }}
                className="w-full py-2 px-3 text-[10px] text-[#E8E8D8] hover:bg-[#3F5A3A] flex items-center justify-between border-b border-[#3F5A3A]"
              >
                <span>FULL LEAGUE</span>
                {selectedTeam === "FULL LEAGUE" && <CheckCircle className="w-3 h-3 text-[#E8E8D8]" />}
              </button>
              {availableTeams.map(team => (
                <button
                  key={team}
                  onClick={() => {
                    onTeamChange(team);
                    setDropdownOpen(false);
                  }}
                  className="w-full py-2 px-3 text-[10px] text-[#E8E8D8] hover:bg-[#3F5A3A] flex items-center justify-between border-b border-[#3F5A3A]"
                >
                  <span>{team}</span>
                  {selectedTeam === team && <CheckCircle className="w-3 h-3 text-[#E8E8D8]" />}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {selectedTeam !== "FULL LEAGUE" && filteredGames.length > 0 && (
          <div className="text-xs text-[#E8E8D8]/60 mt-2 text-center">
            Showing: {filteredGames.length} games
          </div>
        )}
      </div>

      {/* Empty State */}
      {games.length === 0 && (
        <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-12 text-center">
          <div className="text-4xl mb-4">📭</div>
          <div className="text-lg text-[#E8E8D8] mb-2">NO GAMES SCHEDULED</div>
          <div className="text-sm text-[#E8E8D8]/80 mb-6">
            Your Season {seasonNumber} schedule is empty.<br />
            Add games as you play them in SMB4.
          </div>
          <div className="space-y-3">
            <button
              onClick={onAddGame}
              className="bg-[#5599FF] border-[3px] border-[#3366FF] px-6 py-3 text-sm text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Game
            </button>
            <div className="text-xs text-[#E8E8D8]/60">or</div>
            <button
              onClick={onAddGame}
              className="bg-[#5599FF] border-[3px] border-[#3366FF] px-6 py-3 text-sm text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Series (3 games)
            </button>
          </div>
        </div>
      )}

      {/* Games List */}
      {games.length > 0 && (
        <div className="space-y-3">
          {/* Next Game - Highlighted */}
          {nextGame && selectedTeam === "FULL LEAGUE" && (
            <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-[#E8E8D8]">
                  {nextGame.date || `DAY ${nextGame.dayNumber}`} {nextGame.date && "• TODAY"}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[8px] text-[#E8E8D8] bg-[#4A6844] px-2 py-1">NEXT GAME</div>
                  {renderDeleteButton(nextGame.id)}
                </div>
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-right">
                  <div className="text-base text-[#E8E8D8]">{teamName(nextGame.awayTeamId)}</div>
                  <div className="text-[8px] text-[#E8E8D8]/60">(AWAY)</div>
                </div>
                <div className="text-center px-2">
                  <div className="text-xl text-[#E8E8D8]">@</div>
                  <div className="text-[7px] text-[#E8E8D8]/70 italic mt-1">{stadiumMap[nextGame.homeTeamId] || teamName(nextGame.homeTeamId)}</div>
                </div>
                <div className="text-left">
                  <div className="text-base text-[#E8E8D8]">{teamName(nextGame.homeTeamId)}</div>
                  <div className="text-[8px] text-[#E8E8D8]/60">(HOME)</div>
                </div>
              </div>
              {nextGame.time && (
                <div className="text-[8px] text-[#E8E8D8]/60 text-center mt-2">{nextGame.time}</div>
              )}
              <div className="text-[8px] text-[#E8E8D8]/60 text-right mt-2">Game {nextGame.gameNumber}</div>
            </div>
          )}

          {/* Upcoming Games */}
          {selectedTeam !== "FULL LEAGUE" && upcomingGames.length > 0 && (
            <>
              <div className="text-xs text-[#E8E8D8] bg-[#4A6844] px-3 py-2">
                UPCOMING ({upcomingGames.length} games scheduled)
              </div>
              {upcomingGames.slice(0, 5).map((game, index) => (
                <div key={game.id} className="bg-[#5A8352] border-[5px] border-[#4A6844] p-3">
                  <div className="flex items-center justify-between text-[10px] text-[#E8E8D8]/80 mb-2">
                    <span>Game {game.gameNumber} │ Day {game.dayNumber}</span>
                    <div className="flex items-center gap-2">
                      {index === 0 && <span className="text-[#FFD700]">← NEXT GAME</span>}
                      {renderDeleteButton(game.id)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#E8E8D8]">
                    <span>{game.awayTeamId === selectedTeam ? "vs" : "@"} {teamName(game.awayTeamId === selectedTeam ? game.homeTeamId : game.awayTeamId)}</span>
                    <span>{game.awayTeamId === selectedTeam ? "Home" : "Away"}</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Other Scheduled Games (Full League view) */}
          {selectedTeam === "FULL LEAGUE" && upcomingGames.slice(1, 6).map(game => (
            <div key={game.id} className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-[#E8E8D8]">
                  {game.date || `DAY ${game.dayNumber}`}
                </div>
                <div className="flex items-center gap-2">
                  {game.time && (
                    <div className="text-[8px] text-[#E8E8D8] bg-[#4A6844] px-2 py-1">{game.time}</div>
                  )}
                  {renderDeleteButton(game.id)}
                </div>
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-right">
                  <div className="text-base text-[#E8E8D8]">{teamName(game.awayTeamId)}</div>
                  <div className="text-[8px] text-[#E8E8D8]/60">(AWAY)</div>
                </div>
                <div className="text-center px-2">
                  <div className="text-xl text-[#E8E8D8]">@</div>
                  <div className="text-[7px] text-[#E8E8D8]/70 italic mt-1">{stadiumMap[game.homeTeamId] || teamName(game.homeTeamId)}</div>
                </div>
                <div className="text-left">
                  <div className="text-base text-[#E8E8D8]">{teamName(game.homeTeamId)}</div>
                  <div className="text-[8px] text-[#E8E8D8]/60">(HOME)</div>
                </div>
              </div>
              <div className="text-[8px] text-[#E8E8D8]/60 text-right mt-2">Game {game.gameNumber}</div>
            </div>
          ))}

          {/* Divider */}
          {completedGames.length > 0 && (
            <>
              <div className="border-t-[3px] border-[#4A6844] my-2"></div>
              <div className="text-center text-[8px] text-[#E8E8D8]/60 py-2">▼ COMPLETED GAMES ({completedGames.length})</div>
            </>
          )}

          {/* Completed Games */}
          {selectedTeam !== "FULL LEAGUE" && completedGames.length > 0 && (
            <>
              <div className="text-xs text-[#E8E8D8] bg-[#4A6844] px-3 py-2">
                COMPLETED ({completedGames.length} games)
              </div>
              {completedGames.slice(0, 10).map(game => {
                const isWin = game.result?.winningTeamId === selectedTeam;
                const opponent = game.awayTeamId === selectedTeam ? game.homeTeamId : game.awayTeamId;
                const location = game.awayTeamId === selectedTeam ? "Away" : "Home";
                const score = game.result ? 
                  (game.awayTeamId === selectedTeam 
                    ? `${game.result.awayScore}-${game.result.homeScore}`
                    : `${game.result.homeScore}-${game.result.awayScore}`)
                  : "--";

                return (
                  <div key={game.id} className="bg-[#5A8352] border-[5px] border-[#4A6844] p-3">
                    <div className="flex items-center justify-between text-[10px] text-[#E8E8D8]/80">
                      <span>Game {game.gameNumber} │ Day {game.dayNumber} │ {game.awayTeamId === selectedTeam ? "@" : "vs"} {teamName(opponent)} │ {location}</span>
                      <span className={isWin ? "text-[#00DD00]" : "text-[#DD0000]"}>
                        {isWin ? "W" : "L"} {score}
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Completed Games - Full League view */}
          {selectedTeam === "FULL LEAGUE" && completedGames.slice(0, 5).map(game => (
            <div key={game.id} className="bg-[#5A8352] border-[5px] border-[#4A6844] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-[#E8E8D8]">
                  {game.date || `DAY ${game.dayNumber}`}
                </div>
                <div className="text-[8px] text-[#E8E8D8] bg-[#4A6844] px-2 py-1">FINAL</div>
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-right">
                  <div className="text-base text-[#E8E8D8]">{teamName(game.awayTeamId)}</div>
                  <div className="text-[8px] text-[#E8E8D8]/60">(AWAY)</div>
                </div>
                <div className="text-center px-2">
                  {game.result ? (
                    <div className="text-2xl text-[#E8E8D8] font-bold">
                      {game.result.awayScore}-{game.result.homeScore}
                    </div>
                  ) : (
                    <div className="text-xl text-[#E8E8D8]">@</div>
                  )}
                </div>
                <div className="text-left">
                  <div className="text-base text-[#E8E8D8]">{teamName(game.homeTeamId)}</div>
                  <div className="text-[8px] text-[#E8E8D8]/60">(HOME)</div>
                </div>
              </div>
              <div className="text-[8px] text-[#E8E8D8]/60 text-right mt-2">Game {game.gameNumber}</div>
            </div>
          ))}

          {/* Unscheduled notice for team view */}
          {selectedTeam !== "FULL LEAGUE" && (
            <div className="bg-[#5A8352] border-[5px] border-[#4A6844] p-3 flex items-center justify-between">
              <div className="text-xs text-[#E8E8D8]/80">
                {teamStats && teamStats.gamesRemaining === 0 
                  ? "All games scheduled for this season" 
                  : `Unscheduled: games remaining`}
              </div>
              <button
                onClick={onAddGame}
                className="bg-[#5599FF] border-[2px] border-[#3366FF] px-3 py-1 text-xs text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Game
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}