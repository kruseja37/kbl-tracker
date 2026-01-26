import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { getTeam } from '../data/playerDatabase';
import { generateHeadline, generateSubheadline, getHeadlineToneColor } from '../utils/headlineGenerator';
import BoxScoreView from '../components/BoxScoreView';

/**
 * PostGameScreen - Comprehensive post-game summary
 * Per Ralph Framework S-B006, S-B007, S-B008, S-B018
 *
 * Shows:
 * - Generated headline with reporter byline
 * - Final score with winner highlighted
 * - Top performers (batters and pitchers)
 * - Player of the Game with Fame bonus
 * - Continue to Season button
 */

interface TopBatter {
  name: string;
  stats: string; // e.g., "3-4, 2 RBI, HR"
  teamId: string;
}

interface TopPitcher {
  name: string;
  stats: string; // e.g., "W, 7 IP, 2 ER, 8 K"
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
    return null; // Tie (shouldn't happen in baseball)
  }, [awayScore, homeScore]);

  const winningTeamName = winner === 'away' ? awayTeamName : homeTeamName;

  // Parse top performers from URL (JSON encoded)
  const topBatters: TopBatter[] = useMemo(() => {
    try {
      const battersParam = searchParams.get('topBatters');
      if (battersParam) return JSON.parse(decodeURIComponent(battersParam));
    } catch { /* ignore parse errors */ }
    // Default mock data if not provided
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
    // Default mock data if not provided
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
    // Default mock data if not provided
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

  // Styles matching the app's dark theme
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      padding: '2rem',
      color: '#fff',
    },
    content: {
      maxWidth: '800px',
      margin: '0 auto',
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '2rem',
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#94a3b8',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.2em',
      marginBottom: '0.5rem',
    },
    winnerBanner: {
      fontSize: '2.5rem',
      fontWeight: 800,
      color: '#fbbf24',
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
    },
    walkoffTag: {
      fontSize: '1rem',
      backgroundColor: '#dc2626',
      color: '#fff',
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontWeight: 600,
    },
    scoreCard: {
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      gap: '1rem',
      alignItems: 'center',
      backgroundColor: 'rgba(30, 41, 59, 0.8)',
      padding: '1.5rem',
      borderRadius: '12px',
      marginBottom: '2rem',
      border: '1px solid rgba(148, 163, 184, 0.2)',
    },
    teamScore: {
      textAlign: 'center' as const,
    },
    teamName: {
      fontSize: '1.25rem',
      fontWeight: 600,
      marginBottom: '0.25rem',
    },
    score: {
      fontSize: '3rem',
      fontWeight: 800,
    },
    scoreDivider: {
      fontSize: '1.5rem',
      color: '#64748b',
      fontWeight: 300,
    },
    section: {
      backgroundColor: 'rgba(30, 41, 59, 0.6)',
      borderRadius: '12px',
      padding: '1.25rem',
      marginBottom: '1.5rem',
      border: '1px solid rgba(148, 163, 184, 0.15)',
    },
    sectionTitle: {
      fontSize: '0.875rem',
      fontWeight: 600,
      color: '#94a3b8',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      marginBottom: '0.75rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    playerRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.5rem 0',
      borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
    },
    playerName: {
      fontWeight: 600,
      color: '#e2e8f0',
    },
    playerStats: {
      color: '#94a3b8',
      fontSize: '0.875rem',
    },
    decisionBadge: {
      display: 'inline-block',
      padding: '0.125rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: 700,
      marginRight: '0.5rem',
    },
    pogCard: {
      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
      border: '2px solid rgba(251, 191, 36, 0.4)',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      textAlign: 'center' as const,
    },
    pogTitle: {
      fontSize: '0.75rem',
      fontWeight: 600,
      color: '#fbbf24',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.2em',
      marginBottom: '0.5rem',
    },
    pogName: {
      fontSize: '1.75rem',
      fontWeight: 800,
      color: '#fff',
      marginBottom: '0.25rem',
    },
    pogStats: {
      color: '#cbd5e1',
      marginBottom: '0.75rem',
    },
    fameBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      color: '#22c55e',
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontWeight: 600,
      fontSize: '0.875rem',
    },
    continueButton: {
      width: '100%',
      padding: '1rem',
      fontSize: '1.125rem',
      fontWeight: 700,
      backgroundColor: '#3b82f6',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
    },
    extraInnings: {
      fontSize: '0.875rem',
      color: '#94a3b8',
    },
    headlineCard: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      textAlign: 'center' as const,
    },
    headlineText: {
      fontSize: '1.5rem',
      fontWeight: 700,
      color: '#fff',
      marginBottom: '0.75rem',
      lineHeight: 1.3,
    },
    byline: {
      fontSize: '0.875rem',
      color: '#64748b',
      fontStyle: 'italic' as const,
    },
    reporterName: {
      color: '#94a3b8',
      fontWeight: 500,
    },
  };

  const getDecisionStyle = (decision: TopPitcher['decision']) => {
    switch (decision) {
      case 'W':
        return { ...styles.decisionBadge, backgroundColor: '#22c55e', color: '#fff' };
      case 'L':
        return { ...styles.decisionBadge, backgroundColor: '#ef4444', color: '#fff' };
      case 'S':
        return { ...styles.decisionBadge, backgroundColor: '#3b82f6', color: '#fff' };
      case 'H':
        return { ...styles.decisionBadge, backgroundColor: '#8b5cf6', color: '#fff' };
      default:
        return styles.decisionBadge;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.title}>Final</div>
          <div style={styles.winnerBanner}>
            {winningTeamName} Win!
            {isWalkoff && <span style={styles.walkoffTag}>WALKOFF!</span>}
          </div>
          {innings > 9 && (
            <div style={styles.extraInnings}>({innings} innings)</div>
          )}
        </div>

        {/* Headline */}
        <div style={styles.headlineCard}>
          <div style={{
            ...styles.headlineText,
            color: getHeadlineToneColor(headline.tone),
          }}>
            {headline.text}
          </div>
          <div style={styles.byline}>
            — <span style={styles.reporterName}>{headline.reporter}</span>, KBL Sports
          </div>
        </div>

        {/* Score Card */}
        <div style={styles.scoreCard}>
          <div style={styles.teamScore}>
            <div style={{
              ...styles.teamName,
              color: winner === 'away' ? '#fbbf24' : '#e2e8f0',
            }}>
              {awayTeamName}
            </div>
            <div style={{
              ...styles.score,
              color: winner === 'away' ? '#fbbf24' : '#e2e8f0',
            }}>
              {awayScore}
            </div>
          </div>
          <div style={styles.scoreDivider}>@</div>
          <div style={styles.teamScore}>
            <div style={{
              ...styles.teamName,
              color: winner === 'home' ? '#fbbf24' : '#e2e8f0',
            }}>
              {homeTeamName}
            </div>
            <div style={{
              ...styles.score,
              color: winner === 'home' ? '#fbbf24' : '#e2e8f0',
            }}>
              {homeScore}
            </div>
          </div>
        </div>

        {/* Player of the Game */}
        {playerOfGame && (
          <div style={styles.pogCard}>
            <div style={styles.pogTitle}>Player of the Game</div>
            <div style={styles.pogName}>{playerOfGame.name}</div>
            <div style={styles.pogStats}>{playerOfGame.stats}</div>
            <div style={styles.fameBadge}>
              ⭐ +{playerOfGame.fameBonus} Fame
            </div>
          </div>
        )}

        {/* Top Batters */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            <span>🏏</span> Top Batters
          </div>
          {topBatters.map((batter, i) => (
            <div key={i} style={{
              ...styles.playerRow,
              borderBottom: i === topBatters.length - 1 ? 'none' : styles.playerRow.borderBottom,
            }}>
              <span style={styles.playerName}>{batter.name}</span>
              <span style={styles.playerStats}>{batter.stats}</span>
            </div>
          ))}
        </div>

        {/* Top Pitchers */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            <span>⚾</span> Pitching
          </div>
          {topPitchers.map((pitcher, i) => (
            <div key={i} style={{
              ...styles.playerRow,
              borderBottom: i === topPitchers.length - 1 ? 'none' : styles.playerRow.borderBottom,
            }}>
              <span style={styles.playerName}>
                {pitcher.decision && (
                  <span style={getDecisionStyle(pitcher.decision)}>
                    {pitcher.decision}
                  </span>
                )}
                {pitcher.name}
              </span>
              <span style={styles.playerStats}>{pitcher.stats}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button
            style={{
              ...styles.continueButton,
              flex: 1,
              backgroundColor: '#475569',
            }}
            onClick={() => setShowBoxScore(true)}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#64748b';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#475569';
            }}
          >
            📊 View Box Score
          </button>
        </div>

        {/* Continue Button */}
        <button
          style={styles.continueButton}
          onClick={handleContinue}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Continue to Season
        </button>
      </div>

      {/* Box Score Modal */}
      {showBoxScore && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '2rem',
          overflowY: 'auto',
          zIndex: 1000,
        }} onClick={() => setShowBoxScore(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '100%' }}>
            <BoxScoreView
              data={{
                awayTeamName,
                homeTeamName,
                // Parse box score data from URL params or use mock data
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
      )}
    </div>
  );
}
