import { useNavigate, useLocation } from "react-router";
import { Trophy, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { getTeamColors } from "@/config/teamColors";
import { useState } from "react";

export function PostGameSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const [boxScoreExpanded, setBoxScoreExpanded] = useState(false);

  // Get game mode from navigation state to route back appropriately
  const navigationState = location.state as {
    gameMode?: 'exhibition' | 'franchise' | 'playoff';
    franchiseId?: string;
  } | null;

  const gameMode = navigationState?.gameMode || 'franchise';
  const franchiseId = navigationState?.franchiseId || '1';

  // Team IDs - in production these would come from game data
  const homeTeamId = 'sox';
  const awayTeamId = 'tigers';

  // Mock box score data
  const awayBatters = [
    { name: "R. JOHNSON", pos: "CF", ab: 4, r: 1, h: 2, rbi: 1, bb: 0, so: 1, avg: ".312" },
    { name: "M. DAVIS", pos: "SS", ab: 4, r: 0, h: 1, rbi: 0, bb: 0, so: 2, avg: ".289" },
    { name: "K. BROOKS", pos: "3B", ab: 4, r: 1, h: 1, rbi: 1, bb: 0, so: 1, avg: ".276" },
    { name: "D. WILSON", pos: "1B", ab: 3, r: 0, h: 0, rbi: 0, bb: 1, so: 1, avg: ".301" },
    { name: "T. GARCIA", pos: "LF", ab: 4, r: 1, h: 2, rbi: 1, bb: 0, so: 0, avg: ".295" },
    { name: "S. ANDERSON", pos: "RF", ab: 3, r: 0, h: 0, rbi: 0, bb: 0, so: 2, avg: ".265" },
    { name: "J. THOMAS", pos: "C", ab: 3, r: 0, h: 1, rbi: 0, bb: 0, so: 1, avg: ".258" },
    { name: "B. RODRIGUEZ", pos: "2B", ab: 3, r: 0, h: 0, rbi: 0, bb: 0, so: 1, avg: ".271" },
    { name: "L. HERNANDEZ", pos: "P", ab: 2, r: 0, h: 0, rbi: 0, bb: 0, so: 2, avg: ".125" },
  ];

  const homeBatters = [
    { name: "J. MARTINEZ", pos: "SS", ab: 4, r: 2, h: 3, rbi: 4, bb: 0, so: 0, avg: ".335" },
    { name: "T. WILLIAMS", pos: "CF", ab: 3, r: 1, h: 2, rbi: 2, bb: 1, so: 0, avg: ".318" },
    { name: "C. JACKSON", pos: "1B", ab: 4, r: 0, h: 1, rbi: 0, bb: 0, so: 1, avg: ".292" },
    { name: "A. RAMIREZ", pos: "3B", ab: 4, r: 1, h: 2, rbi: 0, bb: 0, so: 1, avg: ".288" },
    { name: "P. MARTIN", pos: "LF", ab: 3, r: 0, h: 0, rbi: 0, bb: 1, so: 2, avg: ".267" },
    { name: "E. LOPEZ", pos: "RF", ab: 4, r: 0, h: 1, rbi: 0, bb: 0, so: 1, avg: ".279" },
    { name: "N. WHITE", pos: "C", ab: 3, r: 0, h: 0, rbi: 0, bb: 0, so: 1, avg: ".254" },
    { name: "M. TAYLOR", pos: "2B", ab: 3, r: 0, h: 1, rbi: 0, bb: 0, so: 0, avg: ".281" },
    { name: "R. SMITH", pos: "P", ab: 2, r: 0, h: 0, rbi: 0, bb: 0, so: 1, avg: ".089" },
  ];

  const awayPitchers = [
    { name: "L. HERNANDEZ", ip: "6.0", h: 8, r: 4, er: 4, bb: 2, so: 5, era: "3.45" },
    { name: "J. PHILLIPS", ip: "2.0", h: 2, r: 0, er: 0, bb: 0, so: 3, era: "2.89" },
  ];

  const homePitchers = [
    { name: "R. SMITH", ip: "7.0", h: 5, r: 3, er: 3, bb: 1, so: 8, era: "2.98" },
    { name: "D. BARNES", ip: "2.0", h: 2, r: 0, er: 0, bb: 0, so: 3, era: "3.12" },
  ];

  // Inning-by-inning scoring
  const scoreboard = {
    innings: [
      { away: 1, home: 0 }, // Inning 1
      { away: 0, home: 2 }, // Inning 2
      { away: 2, home: 0 }, // Inning 3
      { away: 0, home: 1 }, // Inning 4
      { away: 0, home: 0 }, // Inning 5
      { away: 0, home: 0 }, // Inning 6
      { away: 0, home: 1 }, // Inning 7
      { away: 0, home: 0 }, // Inning 8
      { away: 0, home: 0 }, // Inning 9
    ],
    away: { runs: 3, hits: 7, errors: 1 },
    home: { runs: 4, hits: 10, errors: 0 },
  };

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
                      LIVE
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
          <div className="grid gap-[1px] mb-2" style={{ gridTemplateColumns: '26px 90px repeat(9, 24px) 24px 6px 28px 28px 28px 6px 50px 8px 1fr' }}>
            {/* Header row */}
            <div className="text-[#E8E8D8] text-[9px] font-bold">P</div>
            <div></div>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(inning => (
              <div key={inning} className="text-[#E8E8D8] text-[9px] font-bold text-center">{inning}</div>
            ))}
            <div className="text-[#E8E8D8] text-[9px] font-bold text-center">10</div>
            <div></div>
            <div className="text-[#E8E8D8] text-[9px] font-bold text-center">R</div>
            <div className="text-[#E8E8D8] text-[9px] font-bold text-center">H</div>
            <div className="text-[#E8E8D8] text-[9px] font-bold text-center">E</div>
            <div></div>
            <div className="text-[#E8E8D8] text-[9px] font-bold text-center">REC</div>
            <div></div>
            <div></div>
            
            {/* Away team row */}
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] min-h-[20px] flex items-center justify-center">
              <span className="text-[#E8E8D8] text-xs font-bold">9</span>
            </div>
            <div className="text-[#E8E8D8] text-[11px] font-bold flex items-center pl-2" style={{ 
              textShadow: '1px 1px 0px rgba(0,0,0,0.7)'
            }}>TIGERS</div>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(inning => {
              const awayScore = scoreboard.innings[inning - 1]?.away;
              return (
                <div key={inning} className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold min-h-[20px] flex items-center justify-center">
                  {awayScore !== undefined ? awayScore : ''}
                </div>
              );
            })}
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] min-h-[20px]"></div>
            <div></div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.away.runs}</div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.away.hits}</div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.away.errors}</div>
            <div></div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-[9px] font-bold flex items-center justify-center">47-38</div>
            <div></div>
            <div className="row-span-2 flex items-center gap-3 px-[15px] py-[0px]">
              {/* Concessions Section */}
              <div className="flex flex-col items-start justify-center">
                <div className="text-[#C4A853] text-[8px] font-bold tracking-wider mb-0.5" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.8)' }}>CONCESSIONS</div>
                <div className="text-[#E8E8D8] text-[9px] leading-tight" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.8)' }}>HOT DOG • 10¢</div>
                <div className="text-[#E8E8D8] text-[9px] leading-tight" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.8)' }}>PEANUTS • 5¢</div>
                <div className="text-[#E8E8D8] text-[9px] leading-tight" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.8)' }}>CRACKER JACK • 15¢</div>
              </div>
              
              {/* Kruse Cola Ad */}
              <div className="border-2 border-[#E8E8D8] px-3 py-2">
                <div className="text-[#E8E8D8] text-[10px] font-bold tracking-wider text-center" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.8)' }}>KRUSE COLA</div>
                <div className="text-[#C4A853] text-[7px] font-bold text-center mt-0.5" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.8)' }}>ICE COLD • 5¢</div>
              </div>
            </div>
            
            {/* Home team row */}
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] min-h-[20px] flex items-center justify-center">
              <span className="text-[#E8E8D8] text-xs font-bold">9</span>
            </div>
            <div className="text-[#E8E8D8] text-[11px] font-bold flex items-center pl-2" style={{ 
              textShadow: '1px 1px 0px rgba(0,0,0,0.7)'
            }}>SOX</div>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(inning => {
              const homeScore = scoreboard.innings[inning - 1]?.home;
              return (
                <div key={inning} className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold min-h-[20px] flex items-center justify-center">
                  {homeScore !== undefined ? homeScore : ''}
                </div>
              );
            })}
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] min-h-[20px]"></div>
            <div></div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.home.runs}</div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.home.hits}</div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.home.errors}</div>
            <div></div>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-[9px] font-bold flex items-center justify-center">52-33</div>
            <div></div>
          </div>
          
          {/* Bottom indicator row - FINAL message */}
          <div className="border-t-2 border-[#E8E8D8] pt-2 text-center">
            <div className="text-sm font-bold" style={{ 
              color: getTeamColors(homeTeamId).secondary,
              textShadow: getTeamColors(homeTeamId).secondary.toLowerCase() === '#ffffff' || getTeamColors(homeTeamId).secondary.toLowerCase() === 'white' ? '1px 1px 2px black' : '1px 1px 2px white'
            }}>★ SOX WIN! ★</div>
          </div>
        </div>

        {/* Players of the game */}
        <div 
          className="border-[5px] border-[#C4A853] p-4 mb-4"
          style={{
            backgroundColor: getTeamColors(homeTeamId).primary
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-white" />
            <div className="text-sm text-white">POG ★★★</div>
          </div>
          <div className="text-lg text-white">J. MARTINEZ</div>
          <div className="text-[8px] text-white/80">3-4 • 2 HR • 4 RBI</div>
        </div>

        <div 
          className="border-[5px] border-[#E8E8D8] p-4 mb-4"
          style={{
            backgroundColor: getTeamColors(homeTeamId).primary
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-white" />
            <div className="text-sm text-white">POG ★★</div>
          </div>
          <div className="text-lg text-white">T. WILLIAMS</div>
          <div className="text-[8px] text-white/80">2-3 • 1 HR • 2 RBI</div>
        </div>

        <div 
          className="border-[5px] border-white p-4 mb-4"
          style={{
            backgroundColor: getTeamColors(awayTeamId).primary
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-white" />
            <div className="text-sm text-white">POG ★</div>
          </div>
          <div className="text-lg text-white">R. JOHNSON</div>
          <div className="text-[8px] text-white/80">2-4 • 1 2B • 1 RBI</div>
        </div>

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
            // Expanded: Full box score
            <div className="space-y-4 mt-3">
              {/* Away Team Batting */}
              <div>
                <div className="text-[10px] text-[#E8E8D8] mb-2 font-bold">TIGERS BATTING</div>
                <div className="text-[7px]">
                  {/* Header */}
                  <div className="grid grid-cols-9 gap-1 mb-1 text-[#E8E8D8]/60">
                    <div className="col-span-2 text-left">PLAYER</div>
                    <div className="text-center">AB</div>
                    <div className="text-center">R</div>
                    <div className="text-center">H</div>
                    <div className="text-center">RBI</div>
                    <div className="text-center">BB</div>
                    <div className="text-center">SO</div>
                    <div className="text-center">AVG</div>
                  </div>
                  {/* Players */}
                  {awayBatters.map((player, idx) => (
                    <div key={idx} className="grid grid-cols-9 gap-1 text-[#E8E8D8] py-[2px]">
                      <div className="col-span-2 text-left">{player.name} {player.pos}</div>
                      <div className="text-center">{player.ab}</div>
                      <div className="text-center">{player.r}</div>
                      <div className="text-center">{player.h}</div>
                      <div className="text-center">{player.rbi}</div>
                      <div className="text-center">{player.bb}</div>
                      <div className="text-center">{player.so}</div>
                      <div className="text-center">{player.avg}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Away Team Pitching */}
              <div>
                <div className="text-[10px] text-[#E8E8D8] mb-2 font-bold">TIGERS PITCHING</div>
                <div className="text-[7px]">
                  {/* Header */}
                  <div className="grid grid-cols-8 gap-1 mb-1 text-[#E8E8D8]/60">
                    <div className="col-span-2 text-left">PITCHER</div>
                    <div className="text-center">IP</div>
                    <div className="text-center">H</div>
                    <div className="text-center">R</div>
                    <div className="text-center">ER</div>
                    <div className="text-center">BB</div>
                    <div className="text-center">SO</div>
                  </div>
                  {/* Pitchers */}
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

              {/* Divider */}
              <div className="border-t-2 border-[#4A6844]"></div>

              {/* Home Team Batting */}
              <div>
                <div className="text-[10px] text-[#E8E8D8] mb-2 font-bold">SOX BATTING</div>
                <div className="text-[7px]">
                  {/* Header */}
                  <div className="grid grid-cols-9 gap-1 mb-1 text-[#E8E8D8]/60">
                    <div className="col-span-2 text-left">PLAYER</div>
                    <div className="text-center">AB</div>
                    <div className="text-center">R</div>
                    <div className="text-center">H</div>
                    <div className="text-center">RBI</div>
                    <div className="text-center">BB</div>
                    <div className="text-center">SO</div>
                    <div className="text-center">AVG</div>
                  </div>
                  {/* Players */}
                  {homeBatters.map((player, idx) => (
                    <div key={idx} className="grid grid-cols-9 gap-1 text-[#E8E8D8] py-[2px]">
                      <div className="col-span-2 text-left">{player.name} {player.pos}</div>
                      <div className="text-center">{player.ab}</div>
                      <div className="text-center">{player.r}</div>
                      <div className="text-center">{player.h}</div>
                      <div className="text-center">{player.rbi}</div>
                      <div className="text-center">{player.bb}</div>
                      <div className="text-center">{player.so}</div>
                      <div className="text-center">{player.avg}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Home Team Pitching */}
              <div>
                <div className="text-[10px] text-[#E8E8D8] mb-2 font-bold">SOX PITCHING</div>
                <div className="text-[7px]">
                  {/* Header */}
                  <div className="grid grid-cols-8 gap-1 mb-1 text-[#E8E8D8]/60">
                    <div className="col-span-2 text-left">PITCHER</div>
                    <div className="text-center">IP</div>
                    <div className="text-center">H</div>
                    <div className="text-center">R</div>
                    <div className="text-center">ER</div>
                    <div className="text-center">BB</div>
                    <div className="text-center">SO</div>
                  </div>
                  {/* Pitchers */}
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
                navigate("/world-series");
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