import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useCallback } from 'react';
import { getTeam } from '../data/playerDatabase';
import { generateHeadline, generateSubheadline, getHeadlineToneColor } from '../utils/headlineGenerator';
import BoxScoreView from '../components/BoxScoreView';
import ChampionshipCelebration from '../components/ChampionshipCelebration';
import { exportBoxScore } from '../services/dataExportService';

// Championship data type
interface ChampionshipData {
  year: number;
  teamId: string;
  teamName: string;
  teamColor?: string;
  opponentId: string;
  opponentName: string;
  seriesResult: string;
  mvp: {
    playerId: string;
    playerName: string;
    statLine: string;
  };
  championships: number;
}

/**
 * PostGameScreen - Comprehensive post-game summary
 * Per Ralph Framework S-B006, S-B007, S-B008, S-B018
 *
 * Styled with SNES retro aesthetic (SMB4 colors)
 */

interface TopBatter {
  name: string;
  stats: string;
  teamId: string;
}

interface TopPitcher {
  name: string;
  stats: string;
  decision: 'W' | 'L' | 'S' | 'H' | null;
  teamId: string;
}

interface PlayerOfGame {
  name: string;
  teamId: string;
  stats: string;
  fameBonus: number;
}

export default function PostGameScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showBoxScore, setShowBoxScore] = useState(false);
  const [showChampionship, setShowChampionship] = useState(false);

  // Check if this is a championship-winning game
  const isChampionshipGame = searchParams.get('championship') === 'true';
  const championshipData: ChampionshipData | null = useMemo(() => {
    if (!isChampionshipGame) return null;
    try {
      const champParam = searchParams.get('champData');
      if (champParam) return JSON.parse(decodeURIComponent(champParam));
    } catch { /* ignore */ }
    return null;
  }, [isChampionshipGame, searchParams]);

  // Get game data from URL params
  const awayTeamId = searchParams.get('away') || 'sirloins';
  const homeTeamId = searchParams.get('home') || 'beewolves';
  const awayScore = parseInt(searchParams.get('awayScore') || '0', 10);
  const homeScore = parseInt(searchParams.get('homeScore') || '0', 10);
  const innings = parseInt(searchParams.get('innings') || '9', 10);
  const isWalkoff = searchParams.get('walkoff') === 'true';

  // Get team data
  const awayTeam = getTeam(awayTeamId);
  const homeTeam = getTeam(homeTeamId);
  const awayTeamName = awayTeam?.name || awayTeamId.toUpperCase();
  const homeTeamName = homeTeam?.name || homeTeamId.toUpperCase();

  // Determine winner
  const winner = useMemo(() => {
    if (awayScore > homeScore) return 'away';
    if (homeScore > awayScore) return 'home';
    return null;
  }, [awayScore, homeScore]);

  const winningTeamName = winner === 'away' ? awayTeamName : homeTeamName;

  // Parse top performers from URL (JSON encoded)
  const topBatters: TopBatter[] = useMemo(() => {
    try {
      const battersParam = searchParams.get('topBatters');
      if (battersParam) return JSON.parse(decodeURIComponent(battersParam));
    } catch { /* ignore parse errors */ }
    return [
      { name: 'Player A', stats: '2-4, 2 RBI, HR', teamId: awayTeamId },
      { name: 'Player B', stats: '3-5, R, 2B', teamId: homeTeamId },
    ];
  }, [searchParams, awayTeamId, homeTeamId]);

  const topPitchers: TopPitcher[] = useMemo(() => {
    try {
      const pitchersParam = searchParams.get('topPitchers');
      if (pitchersParam) return JSON.parse(decodeURIComponent(pitchersParam));
    } catch { /* ignore parse errors */ }
    return [
      { name: 'Starter A', stats: 'W, 6 IP, 2 ER, 5 K', decision: 'W', teamId: awayTeamId },
      { name: 'Closer B', stats: 'S, 1 IP, 0 ER, 2 K', decision: 'S', teamId: homeTeamId },
    ];
  }, [searchParams, awayTeamId, homeTeamId]);

  const playerOfGame: PlayerOfGame | null = useMemo(() => {
    try {
      const pogParam = searchParams.get('pog');
      if (pogParam) return JSON.parse(decodeURIComponent(pogParam));
    } catch { /* ignore parse errors */ }
    return {
      name: 'Star Player',
      teamId: winner === 'away' ? awayTeamId : homeTeamId,
      stats: '3-4, 3 RBI, HR, 2 R',
      fameBonus: 2,
    };
  }, [searchParams, winner, awayTeamId, homeTeamId]);

  // Generate headline
  const headline = useMemo(() => {
    const winScore = winner === 'away' ? awayScore : homeScore;
    const loseScore = winner === 'away' ? homeScore : awayScore;
    const winTeam = winner === 'away' ? awayTeamName : homeTeamName;
    const loseTeam = winner === 'away' ? homeTeamName : awayTeamName;

    return generateHeadline({
      winningTeam: winTeam,
      losingTeam: loseTeam,
      winningScore: winScore,
      losingScore: loseScore,
      isWalkoff,
      isShutout: loseScore === 0,
      inningsPlayed: innings,
      topPerformer: playerOfGame ? {
        name: playerOfGame.name,
        statLine: playerOfGame.stats,
        type: 'batter',
      } : undefined,
    });
  }, [winner, awayScore, homeScore, awayTeamName, homeTeamName, isWalkoff, innings, playerOfGame]);

  const handleContinue = () => {
    navigate('/season');
  };

  // Handler for exporting box score data
  const handleExportBoxScore = useCallback((format: 'csv' | 'json') => {
    const gameId = searchParams.get('gameId') || `game_${Date.now()}`;
    const date = new Date().toISOString().split('T')[0];

    const boxScoreData = {
      gameId,
      date,
      homeTeam: homeTeamName,
      awayTeam: awayTeamName,
      homeScore,
      awayScore,
      innings,
      homePlayers: topBatters
        .filter(b => b.teamId === homeTeamId)
        .map(b => ({
          playerId: `home_${b.name.replace(/\s+/g, '_')}`,
          playerName: b.name,
          position: 'IF',
          ab: parseInt(b.stats.split('-')[1]?.split(',')[0] || '4'),
          r: b.stats.includes('R') ? 1 : 0,
          h: parseInt(b.stats.split('-')[0] || '1'),
          rbi: parseInt(b.stats.match(/(\d+) RBI/)?.[1] || '0'),
          bb: 0,
          so: 0,
          avg: 0.000,
        })),
      awayPlayers: topBatters
        .filter(b => b.teamId === awayTeamId)
        .map(b => ({
          playerId: `away_${b.name.replace(/\s+/g, '_')}`,
          playerName: b.name,
          position: 'IF',
          ab: parseInt(b.stats.split('-')[1]?.split(',')[0] || '4'),
          r: b.stats.includes('R') ? 1 : 0,
          h: parseInt(b.stats.split('-')[0] || '1'),
          rbi: parseInt(b.stats.match(/(\d+) RBI/)?.[1] || '0'),
          bb: 0,
          so: 0,
          avg: 0.000,
        })),
    };

    exportBoxScore(boxScoreData, format);
    console.log(`[PostGame] Exported box score as ${format.toUpperCase()}`);
  }, [searchParams, homeTeamName, awayTeamName, homeScore, awayScore, innings, topBatters, homeTeamId, awayTeamId]);

  const getDecisionBadgeClass = (decision: TopPitcher['decision']) => {
    switch (decision) {
      case 'W': return 'bg-retro-green-bright text-white';
      case 'L': return 'bg-retro-red text-white';
      case 'S': return 'bg-retro-blue text-white';
      case 'H': return 'bg-purple-500 text-white';
      default: return '';
    }
  };

  // Show championship celebration if this was the championship-winning game
  if (championshipData && !showChampionship) {
    return (
      <ChampionshipCelebration
        data={championshipData}
        onDismiss={() => setShowChampionship(true)}
        onSaveToHistory={() => {
          console.log('[PostGame] Championship saved to history');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-retro-green relative overflow-hidden">
      {/* Background layers */}
      <div className="bg-field-stripes absolute inset-0" />
      <div className="bg-scanlines absolute inset-0 pointer-events-none z-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        {/* Header Card - FINAL */}
        <div className="retro-card mb-6">
          <div className="retro-header-gold">
            <div className="flex items-center justify-center gap-2">
              <span className="font-pixel text-retro-navy text-xs">⚾ FINAL</span>
              {innings > 9 && (
                <span className="bg-retro-navy text-retro-gold font-pixel text-[0.5rem] px-2 py-0.5">
                  {innings} INN
                </span>
              )}
            </div>
          </div>
          <div className="retro-body p-6 text-center">
            <h1 className="font-pixel text-retro-blue text-xl mb-2" style={{ textShadow: '2px 2px 0 #c41e3a' }}>
              {winningTeamName} WIN!
            </h1>
            {isWalkoff && (
              <span className="inline-block font-pixel text-[0.6rem] bg-retro-red text-white px-3 py-1 animate-blink">
                WALKOFF!
              </span>
            )}
          </div>
        </div>

        {/* Headline Card */}
        <div className="retro-card mb-6">
          <div className="retro-header-blue">
            <span className="font-pixel text-white text-xs">📰 HEADLINE</span>
          </div>
          <div className="retro-body p-4 text-center">
            <div
              className="font-bold text-lg text-retro-navy mb-2"
              style={{ color: getHeadlineToneColor(headline.tone) }}
            >
              {headline.text}
            </div>
            <div className="text-sm text-gray-600 italic">
              — <span className="font-medium text-retro-blue">{headline.reporter}</span>, KBL Sports
            </div>
          </div>
        </div>

        {/* Score Card */}
        <div className="retro-card mb-6">
          <div className="retro-header-blue">
            <span className="font-pixel text-white text-xs">SCORE</span>
          </div>
          <div className="retro-body p-4">
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* Away Team */}
              <div className={`text-center p-4 border-2 ${winner === 'away' ? 'border-retro-gold bg-retro-gold/10' : 'border-retro-blue'}`}>
                <div className={`font-bold mb-1 ${winner === 'away' ? 'text-retro-gold' : 'text-retro-navy'}`}>
                  {awayTeamName}
                </div>
                <div className={`font-pixel text-3xl ${winner === 'away' ? 'text-retro-gold' : 'text-retro-blue'}`}>
                  {awayScore}
                </div>
              </div>

              {/* VS Divider */}
              <div className="text-center">
                <span className="font-pixel text-retro-blue text-lg">@</span>
              </div>

              {/* Home Team */}
              <div className={`text-center p-4 border-2 ${winner === 'home' ? 'border-retro-gold bg-retro-gold/10' : 'border-retro-blue'}`}>
                <div className={`font-bold mb-1 ${winner === 'home' ? 'text-retro-gold' : 'text-retro-navy'}`}>
                  {homeTeamName}
                </div>
                <div className={`font-pixel text-3xl ${winner === 'home' ? 'text-retro-gold' : 'text-retro-blue'}`}>
                  {homeScore}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Player of the Game */}
        {playerOfGame && (
          <div className="retro-card mb-6" style={{ border: '3px solid #d4a017' }}>
            <div className="retro-header-gold">
              <div className="flex items-center justify-center gap-2">
                <span>⭐</span>
                <span className="font-pixel text-retro-navy text-xs">PLAYER OF THE GAME</span>
                <span>⭐</span>
              </div>
            </div>
            <div className="retro-body p-6 text-center bg-gradient-to-b from-retro-gold/10 to-transparent">
              <div className="font-pixel text-retro-blue text-lg mb-2" style={{ textShadow: '1px 1px 0 #d4a017' }}>
                {playerOfGame.name}
              </div>
              <div className="text-retro-navy mb-3">{playerOfGame.stats}</div>
              <div className="inline-flex items-center gap-1 bg-retro-green text-white font-pixel text-[0.6rem] px-3 py-1 border-2 border-retro-green-bright">
                ⭐ +{playerOfGame.fameBonus} FAME
              </div>
            </div>
          </div>
        )}

        {/* Top Batters */}
        <div className="retro-card mb-6">
          <div className="retro-header-blue">
            <span className="font-pixel text-white text-xs">🏏 TOP BATTERS</span>
          </div>
          <div className="retro-body p-2">
            {topBatters.map((batter, i) => (
              <div
                key={i}
                className={`flex justify-between items-center p-3 bg-white border-2 border-retro-blue ${i < topBatters.length - 1 ? 'mb-1' : ''}`}
              >
                <span className="font-bold text-retro-navy">{batter.name}</span>
                <span className="text-sm text-gray-600 font-mono">{batter.stats}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pitchers */}
        <div className="retro-card mb-6">
          <div className="retro-header-red">
            <span className="font-pixel text-white text-xs">⚾ PITCHING</span>
          </div>
          <div className="retro-body p-2">
            {topPitchers.map((pitcher, i) => (
              <div
                key={i}
                className={`flex justify-between items-center p-3 bg-white border-2 border-retro-blue ${i < topPitchers.length - 1 ? 'mb-1' : ''}`}
              >
                <div className="flex items-center gap-2">
                  {pitcher.decision && (
                    <span className={`font-pixel text-[0.5rem] px-2 py-0.5 ${getDecisionBadgeClass(pitcher.decision)}`}>
                      {pitcher.decision}
                    </span>
                  )}
                  <span className="font-bold text-retro-navy">{pitcher.name}</span>
                </div>
                <span className="text-sm text-gray-600 font-mono">{pitcher.stats}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Box Score Button */}
          <button
            onClick={() => setShowBoxScore(true)}
            className="retro-btn w-full bg-retro-navy text-white hover:bg-retro-blue-dark py-3"
          >
            <span className="font-pixel text-xs">📊 VIEW BOX SCORE</span>
          </button>

          {/* Export Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleExportBoxScore('csv')}
              className="retro-btn bg-gray-600 text-white hover:bg-gray-700 py-2"
            >
              <span className="font-pixel text-[0.6rem]">📥 EXPORT CSV</span>
            </button>
            <button
              onClick={() => handleExportBoxScore('json')}
              className="retro-btn bg-gray-600 text-white hover:bg-gray-700 py-2"
            >
              <span className="font-pixel text-[0.6rem]">📥 EXPORT JSON</span>
            </button>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="retro-btn retro-btn-blue w-full py-4 group"
          >
            <span className="font-pixel text-sm flex items-center justify-center gap-2">
              CONTINUE TO SEASON
              <span className="group-hover:translate-x-1 transition-transform animate-blink">▶</span>
            </span>
          </button>
        </div>
      </div>

      {/* Box Score Modal */}
      {showBoxScore && (
        <div
          className="fixed inset-0 bg-black/80 flex justify-center items-start p-8 overflow-y-auto z-[1000]"
          onClick={() => setShowBoxScore(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="max-w-[900px] w-full">
            <div className="retro-card">
              <div className="retro-header-blue flex items-center justify-between">
                <span className="font-pixel text-white text-xs">📊 BOX SCORE</span>
                <button
                  onClick={() => setShowBoxScore(false)}
                  className="text-white hover:text-retro-gold transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="retro-body p-4">
                <BoxScoreView
                  data={{
                    awayTeamName,
                    homeTeamName,
                    awayBatters: (() => {
                      try {
                        const param = searchParams.get('awayBatters');
                        if (param) return JSON.parse(decodeURIComponent(param));
                      } catch { /* ignore */ }
                      return topBatters
                        .filter(b => b.teamId === awayTeamId)
                        .map((b, i) => ({
                          playerId: `away-${i}`,
                          name: b.name,
                          position: 'IF',
                          ab: 4,
                          r: 1,
                          h: parseInt(b.stats.split('-')[0]) || 1,
                          rbi: parseInt(b.stats.match(/(\d+) RBI/)?.[1] || '0'),
                          bb: 0,
                          k: 0,
                        }));
                    })(),
                    homeBatters: (() => {
                      try {
                        const param = searchParams.get('homeBatters');
                        if (param) return JSON.parse(decodeURIComponent(param));
                      } catch { /* ignore */ }
                      return topBatters
                        .filter(b => b.teamId === homeTeamId)
                        .map((b, i) => ({
                          playerId: `home-${i}`,
                          name: b.name,
                          position: 'IF',
                          ab: 4,
                          r: 1,
                          h: parseInt(b.stats.split('-')[0]) || 1,
                          rbi: parseInt(b.stats.match(/(\d+) RBI/)?.[1] || '0'),
                          bb: 0,
                          k: 0,
                        }));
                    })(),
                    awayPitchers: topPitchers
                      .filter(p => p.teamId === awayTeamId)
                      .map((p, i) => ({
                        playerId: `away-p-${i}`,
                        name: p.name,
                        ip: p.stats.match(/(\d+\.?\d*) IP/)?.[1] || '0',
                        h: parseInt(p.stats.match(/(\d+) H/)?.[1] || '0'),
                        r: parseInt(p.stats.match(/(\d+) R/)?.[1] || '0'),
                        er: parseInt(p.stats.match(/(\d+) ER/)?.[1] || '0'),
                        bb: parseInt(p.stats.match(/(\d+) BB/)?.[1] || '0'),
                        k: parseInt(p.stats.match(/(\d+) K/)?.[1] || '0'),
                        decision: p.decision,
                      })),
                    homePitchers: topPitchers
                      .filter(p => p.teamId === homeTeamId)
                      .map((p, i) => ({
                        playerId: `home-p-${i}`,
                        name: p.name,
                        ip: p.stats.match(/(\d+\.?\d*) IP/)?.[1] || '0',
                        h: parseInt(p.stats.match(/(\d+) H/)?.[1] || '0'),
                        r: parseInt(p.stats.match(/(\d+) R/)?.[1] || '0'),
                        er: parseInt(p.stats.match(/(\d+) ER/)?.[1] || '0'),
                        bb: parseInt(p.stats.match(/(\d+) BB/)?.[1] || '0'),
                        k: parseInt(p.stats.match(/(\d+) K/)?.[1] || '0'),
                        decision: p.decision,
                      })),
                  }}
                  onClose={() => setShowBoxScore(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
