import { useNavigate, useLocation, useParams } from "react-router";
import { Trophy, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { getTeamColors } from "@/config/teamColors";
import { useState, useEffect } from "react";
import { getCompletedGameById, type CompletedGameRecord } from "../../utils/gameStorage";

// Helper to format innings pitched from outs recorded
function formatIP(outsRecorded: number): string {
  const fullInnings = Math.floor(outsRecorded / 3);
  const partialOuts = outsRecorded % 3;
  return partialOuts === 0 ? `${fullInnings}.0` : `${fullInnings}.${partialOuts}`;
}

// Helper to format batting average
function formatAvg(hits: number, atBats: number): string {
  if (atBats === 0) return ".000";
  const avg = hits / atBats;
  return avg.toFixed(3).replace(/^0/, "");
}

export function PostGameSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams<{ gameId: string }>();
  const [boxScoreExpanded, setBoxScoreExpanded] = useState(false);
  const [gameData, setGameData] = useState<CompletedGameRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get game mode from navigation state to route back appropriately
  const navigationState = location.state as {
    gameMode?: 'exhibition' | 'franchise' | 'playoff';
    franchiseId?: string;
  } | null;

  const gameMode = navigationState?.gameMode || 'franchise';
  const franchiseId = navigationState?.franchiseId || '1';

  // Load game data from IndexedDB
  useEffect(() => {
    async function loadGameData() {
      if (!gameId) {
        setError("No game ID provided");
        setIsLoading(false);
        return;
      }

      try {
        const data = await getCompletedGameById(gameId);
        if (data) {
          setGameData(data);
        } else {
          setError("Game not found");
        }
      } catch (err) {
        console.error("Failed to load game data:", err);
        setError("Failed to load game data");
      } finally {
        setIsLoading(false);
      }
    }

    loadGameData();
  }, [gameId]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#2a3a2d] text-white p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#C4A853]" />
          <div className="text-lg">Loading game summary...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !gameData) {
    return (
      <div className="min-h-screen bg-[#2a3a2d] text-white p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-lg text-red-400">{error || "Game data not available"}</div>
          <button
            onClick={() => navigate("/exhibition")}
            className="bg-[#556B55] border-[3px] border-white px-6 py-3 text-sm hover:bg-[#6B9462]"
          >
            BACK TO MENU
          </button>
        </div>
      </div>
    );
  }

  // Extract data from game record
  const homeTeamId = gameData.homeTeamId;
  const awayTeamId = gameData.awayTeamId;
  const homeTeamName = gameData.homeTeamName;
  const awayTeamName = gameData.awayTeamName;

  // Build batter stats from playerStats
  // Player IDs have format "away-{name}" or "home-{name}"
  const allBatters = Object.entries(gameData.playerStats || {}).map(([playerId, stats]) => {
    // Determine team from playerId prefix (e.g., "away-john-smith" or "home-jane-doe")
    const isAway = playerId.toLowerCase().startsWith('away-');

    // Extract player name: remove "away-" or "home-" prefix, then convert dashes to spaces and title case
    const nameFromId = playerId.replace(/^(away|home)-/, '').replace(/-/g, ' ');
    const formattedName = nameFromId
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return {
      playerId,
      name: formattedName,
      isAway,
      ab: stats.ab,
      r: stats.r,
      h: stats.h,
      rbi: stats.rbi,
      bb: stats.bb,
      so: stats.k,
      avg: formatAvg(stats.h, stats.ab),
    };
  });

  // Build pitcher stats
  const allPitchers = (gameData.pitcherGameStats || []).map(pitcher => ({
    pitcherId: pitcher.pitcherId,
    name: pitcher.pitcherName,
    teamId: pitcher.teamId,
    isAway: pitcher.teamId === awayTeamId,
    ip: formatIP(pitcher.outsRecorded),
    h: pitcher.hitsAllowed,
    r: pitcher.runsAllowed,
    er: pitcher.earnedRuns,
    bb: pitcher.walksAllowed,
    so: pitcher.strikeoutsThrown,
    isStarter: pitcher.isStarter,
  }));

  const awayPitchers = allPitchers.filter(p => p.isAway);
  const homePitchers = allPitchers.filter(p => !p.isAway);

  // Calculate team hits from player stats (using player ID prefix)
  let awayHits = 0;
  let homeHits = 0;
  Object.entries(gameData.playerStats || {}).forEach(([playerId, stats]) => {
    const isAway = playerId.toLowerCase().startsWith('away-');
    if (isAway) {
      awayHits += stats.h;
    } else {
      homeHits += stats.h;
    }
  });

  // Inning-by-inning scoring — use actual innings played, not hardcoded 9
  const inningScores = gameData.inningScores || [];
  const numInnings = inningScores.length || 9; // fallback to 9 if no data
  const scoreboard = {
    innings: inningScores,
    away: { runs: gameData.finalScore.away, hits: awayHits, errors: 0 },
    home: { runs: gameData.finalScore.home, hits: homeHits, errors: 0 },
  };

  // Determine winner
  const homeWon = gameData.finalScore.home > gameData.finalScore.away;
  const winnerName = homeWon ? homeTeamName : awayTeamName;
  const winnerId = homeWon ? homeTeamId : awayTeamId;

  // Find players of the game (top performers by hits + RBI)
  const sortedBatters = [...allBatters].sort((a, b) => {
    const aScore = a.h * 2 + a.rbi + a.r;
    const bScore = b.h * 2 + b.rbi + b.r;
    return bScore - aScore;
  });

  const topPerformers = sortedBatters.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#2a3a2d] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* TV Frame */}
        <div className="border-[12px] border-[#1a1a1a] bg-black rounded-lg shadow-[0_0_40px_rgba(0,0,0,0.9)] relative">
          {/* Screen bezel shadow */}
          <div className="border-[6px] border-[#0a0a0a] bg-[#1a1a1a] p-1">
            {/* Inner screen glow */}
            <div className="border-[2px] border-[#333] bg-black p-0">
              {/* Broadcast header */}
              <div className="bg-gradient-to-r from-[#DD0000] via-[#CC44CC] to-[#0066FF] p-3 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#DD0000] text-white text-[10px] font-bold px-2 py-1 border-2 border-white">
                      FINAL
                    </div>
                    <div className="text-white text-lg font-bold tracking-wider" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                      POST-GAME REPORT
                    </div>
                  </div>
                  {/* Super Mega Baseball Logo */}
                  <div className="bg-white border-[4px] border-[#0066FF] px-[12px] py-[6px] shadow-[2px_2px_0px_0px_#DD0000]">
                    <div className="text-[10px] text-[#DD0000] tracking-wide leading-tight font-bold">SUPER MEGA</div>
                    <div className="text-[13px] text-[#0066FF] tracking-wide leading-tight font-bold">BASEBALL</div>
                  </div>
                </div>
              </div>

              {/* Screen content */}
              <div className="bg-[#2a3a2d] p-6">
        {/* Final Score Banner - Fenway-style Scoreboard */}
        <div className="bg-[#556B55] border-[4px] border-[#3d5240] p-2 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
          {/* Stadium name header */}
          <div className="text-center text-[#E8E8D8] text-xs font-bold tracking-[0.3em] mb-1">
            {getTeamColors(homeTeamId).stadium || 'BALLPARK'}
          </div>

          {/* Scoreboard grid */}
          <div className="grid gap-[1px] mb-2" style={{ gridTemplateColumns: `90px repeat(${numInnings}, 24px) 6px 28px 28px 28px` }}>
            {/* Header row */}
            <div></div>
            {Array.from({ length: numInnings }, (_, i) => i + 1).map(inning => (
              <div key={inning} className="text-[#E8E8D8] text-[9px] font-bold text-center">{inning}</div>
            ))}
            <div></div>
            <div className="text-[#E8E8D8] text-[9px] font-bold text-center">R</div>
            <div className="text-[#E8E8D8] text-[9px] font-bold text-center">H</div>
            <div className="text-[#E8E8D8] text-[9px] font-bold text-center">E</div>

            {/* Away team row */}
            <div className="text-[#E8E8D8] text-[11px] font-bold flex items-center pl-2" style={{
              textShadow: '1px 1px 0px rgba(0,0,0,0.7)'
            }}>{awayTeamName.toUpperCase()}</div>
            {Array.from({ length: numInnings }, (_, idx) => {
              const score = scoreboard.innings[idx]?.away;
              return (
                <div key={idx} className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold min-h-[20px] flex items-center justify-center">
                  {score !== undefined ? score : '-'}
                </div>
              );
            })}
            <div></div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.away.runs}</div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.away.hits}</div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.away.errors}</div>

            {/* Home team row */}
            <div className="text-[#E8E8D8] text-[11px] font-bold flex items-center pl-2" style={{
              textShadow: '1px 1px 0px rgba(0,0,0,0.7)'
            }}>{homeTeamName.toUpperCase()}</div>
            {Array.from({ length: numInnings }, (_, idx) => {
              const score = scoreboard.innings[idx]?.home;
              return (
                <div key={idx} className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold min-h-[20px] flex items-center justify-center">
                  {score !== undefined ? score : '-'}
                </div>
              );
            })}
            <div></div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.home.runs}</div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.home.hits}</div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.home.errors}</div>
          </div>

          {/* Bottom indicator row - FINAL message */}
          <div className="border-t-2 border-[#E8E8D8] pt-2 text-center">
            <div className="text-sm font-bold" style={{
              color: getTeamColors(winnerId).secondary || '#C4A853',
              textShadow: '1px 1px 2px black'
            }}>★ {winnerName.toUpperCase()} WIN! ★</div>
          </div>
        </div>

        {/* Players of the game */}
        {topPerformers.length > 0 && topPerformers[0].h > 0 && (
          <div
            className="border-[5px] border-[#C4A853] p-4 mb-4"
            style={{
              backgroundColor: getTeamColors(topPerformers[0].isAway ? awayTeamId : homeTeamId).primary || '#2a3a2d'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-white" />
              <div className="text-sm text-white">POG ★★★</div>
            </div>
            <div className="text-lg text-white">{topPerformers[0].name}</div>
            <div className="text-[8px] text-white/80">
              {topPerformers[0].h}-{topPerformers[0].ab} • {topPerformers[0].rbi} RBI • {topPerformers[0].r} R
            </div>
          </div>
        )}

        {topPerformers.length > 1 && topPerformers[1].h > 0 && (
          <div
            className="border-[5px] border-[#E8E8D8] p-4 mb-4"
            style={{
              backgroundColor: getTeamColors(topPerformers[1].isAway ? awayTeamId : homeTeamId).primary || '#2a3a2d'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-white" />
              <div className="text-sm text-white">POG ★★</div>
            </div>
            <div className="text-lg text-white">{topPerformers[1].name}</div>
            <div className="text-[8px] text-white/80">
              {topPerformers[1].h}-{topPerformers[1].ab} • {topPerformers[1].rbi} RBI • {topPerformers[1].r} R
            </div>
          </div>
        )}

        {topPerformers.length > 2 && topPerformers[2].h > 0 && (
          <div
            className="border-[5px] border-white p-4 mb-4"
            style={{
              backgroundColor: getTeamColors(topPerformers[2].isAway ? awayTeamId : homeTeamId).primary || '#2a3a2d'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-white" />
              <div className="text-sm text-white">POG ★</div>
            </div>
            <div className="text-lg text-white">{topPerformers[2].name}</div>
            <div className="text-[8px] text-white/80">
              {topPerformers[2].h}-{topPerformers[2].ab} • {topPerformers[2].rbi} RBI • {topPerformers[2].r} R
            </div>
          </div>
        )}

        {/* Box score preview */}
        <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4 mb-4">
          <button
            onClick={() => setBoxScoreExpanded(!boxScoreExpanded)}
            className="w-full text-center hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
          >
            <div className="text-sm text-[#E8E8D8]">BOX SCORE</div>
            {boxScoreExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#E8E8D8]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#E8E8D8]" />
            )}
          </button>

          {boxScoreExpanded && (
            <div className="space-y-4 mt-3">
              {/* Away Team Pitching */}
              {awayPitchers.length > 0 && (
                <div>
                  <div className="text-[10px] text-[#E8E8D8] mb-2 font-bold">{awayTeamName.toUpperCase()} PITCHING</div>
                  <div className="text-[7px]">
                    <div className="grid grid-cols-8 gap-1 mb-1 text-[#E8E8D8]/60">
                      <div className="col-span-2 text-left">PITCHER</div>
                      <div className="text-center">IP</div>
                      <div className="text-center">H</div>
                      <div className="text-center">R</div>
                      <div className="text-center">ER</div>
                      <div className="text-center">BB</div>
                      <div className="text-center">SO</div>
                    </div>
                    {awayPitchers.map((pitcher, idx) => (
                      <div key={idx} className="grid grid-cols-8 gap-1 text-[#E8E8D8] py-[2px]">
                        <div className="col-span-2 text-left">{pitcher.name}</div>
                        <div className="text-center">{pitcher.ip}</div>
                        <div className="text-center">{pitcher.h}</div>
                        <div className="text-center">{pitcher.r}</div>
                        <div className="text-center">{pitcher.er}</div>
                        <div className="text-center">{pitcher.bb}</div>
                        <div className="text-center">{pitcher.so}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="border-t-2 border-[#4A6844]"></div>

              {/* Home Team Pitching */}
              {homePitchers.length > 0 && (
                <div>
                  <div className="text-[10px] text-[#E8E8D8] mb-2 font-bold">{homeTeamName.toUpperCase()} PITCHING</div>
                  <div className="text-[7px]">
                    <div className="grid grid-cols-8 gap-1 mb-1 text-[#E8E8D8]/60">
                      <div className="col-span-2 text-left">PITCHER</div>
                      <div className="text-center">IP</div>
                      <div className="text-center">H</div>
                      <div className="text-center">R</div>
                      <div className="text-center">ER</div>
                      <div className="text-center">BB</div>
                      <div className="text-center">SO</div>
                    </div>
                    {homePitchers.map((pitcher, idx) => (
                      <div key={idx} className="grid grid-cols-8 gap-1 text-[#E8E8D8] py-[2px]">
                        <div className="col-span-2 text-left">{pitcher.name}</div>
                        <div className="text-center">{pitcher.ip}</div>
                        <div className="text-center">{pitcher.h}</div>
                        <div className="text-center">{pitcher.r}</div>
                        <div className="text-center">{pitcher.er}</div>
                        <div className="text-center">{pitcher.bb}</div>
                        <div className="text-center">{pitcher.so}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show message if no pitcher stats */}
              {awayPitchers.length === 0 && homePitchers.length === 0 && (
                <div className="text-center text-[#E8E8D8]/60 text-xs py-4">
                  No pitcher statistics recorded
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              // Route based on game mode
              if (gameMode === 'exhibition') {
                navigate("/exhibition");
              } else if (gameMode === 'playoff') {
                // Return to franchise home (bracket tab) — NOT /world-series
                navigate(`/franchise/${franchiseId}`);
              } else {
                navigate(`/franchise/${franchiseId}`);
              }
            }}
            className="bg-[#556B55] border-[5px] border-white py-[16px] text-sm text-[#E8E8D8] hover:bg-[#6B9462] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] m-[0px] px-[10px]"
          >
            CONTINUE
          </button>
        </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
