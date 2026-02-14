/**
 * LeagueLeadersAward - League leaders recognition
 * Per Ralph Framework S-D003
 *
 * Features:
 * - Batting Triple Crown (AVG, HR, RBI)
 * - Pitching Triple Crown (ERA, W, K)
 * - Special banner for actual triple crown winner
 */

interface LeaderData {
  playerId: string;
  playerName: string;
  teamName: string;
  value: number;
}

interface LeagueLeadersAwardProps {
  battingLeaders: {
    avg: LeaderData;
    hr: LeaderData;
    rbi: LeaderData;
  };
  pitchingLeaders: {
    era: LeaderData;
    wins: LeaderData;
    strikeouts: LeaderData;
  };
  battingTripleCrownWinner?: LeaderData;
  pitchingTripleCrownWinner?: LeaderData;
  onContinue: () => void;
  onPlayerClick?: (playerId: string) => void;
}

export default function LeagueLeadersAward({
  battingLeaders,
  pitchingLeaders,
  battingTripleCrownWinner,
  pitchingTripleCrownWinner,
  onContinue,
  onPlayerClick,
}: LeagueLeadersAwardProps) {
  const formatStat = (value: number, stat: string): string => {
    if (['avg'].includes(stat)) {
      return value.toFixed(3).replace(/^0/, '');
    }
    if (['era'].includes(stat)) {
      return value.toFixed(2);
    }
    return Math.round(value).toString();
  };

  const renderLeaderRow = (
    label: string,
    leader: LeaderData,
    stat: string
  ) => (
    <div
      style={styles.leaderRow}
      onClick={() => onPlayerClick?.(leader.playerId)}
    >
      <div style={styles.crownIcon}>👑</div>
      <div style={styles.leaderInfo}>
        <div style={styles.leaderCategory}>{label}</div>
        <div style={styles.leaderName}>{leader.playerName}</div>
        <div style={styles.leaderTeam}>{leader.teamName}</div>
      </div>
      <div style={styles.leaderValue}>{formatStat(leader.value, stat)}</div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.icon}>👑</div>
        <h1 style={styles.title}>League Leaders</h1>
        <p style={styles.subtitle}>Statistical Champions</p>
      </div>

      {/* Batting Triple Crown Winner */}
      {battingTripleCrownWinner && (
        <div style={styles.tripleCrownBanner}>
          <div style={styles.tripleCrownIcon}>🏆👑🏆</div>
          <div style={styles.tripleCrownLabel}>TRIPLE CROWN WINNER!</div>
          <div style={styles.tripleCrownName}>
            {battingTripleCrownWinner.playerName}
          </div>
          <div style={styles.tripleCrownNote}>
            Led the league in AVG, HR, and RBI
          </div>
        </div>
      )}

      {/* Batting Leaders */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionIcon}>🏏</span>
          <span style={styles.sectionTitle}>Batting Leaders</span>
        </div>
        <div style={styles.leadersList}>
          {renderLeaderRow('Batting Average', battingLeaders.avg, 'avg')}
          {renderLeaderRow('Home Runs', battingLeaders.hr, 'hr')}
          {renderLeaderRow('Runs Batted In', battingLeaders.rbi, 'rbi')}
        </div>
      </div>

      {/* Pitching Triple Crown Winner */}
      {pitchingTripleCrownWinner && (
        <div style={styles.tripleCrownBanner}>
          <div style={styles.tripleCrownIcon}>🏆👑🏆</div>
          <div style={styles.tripleCrownLabel}>PITCHING TRIPLE CROWN!</div>
          <div style={styles.tripleCrownName}>
            {pitchingTripleCrownWinner.playerName}
          </div>
          <div style={styles.tripleCrownNote}>
            Led the league in ERA, Wins, and Strikeouts
          </div>
        </div>
      )}

      {/* Pitching Leaders */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionIcon}>⚾</span>
          <span style={styles.sectionTitle}>Pitching Leaders</span>
        </div>
        <div style={styles.leadersList}>
          {renderLeaderRow('Earned Run Average', pitchingLeaders.era, 'era')}
          {renderLeaderRow('Wins', pitchingLeaders.wins, 'wins')}
          {renderLeaderRow('Strikeouts', pitchingLeaders.strikeouts, 'strikeouts')}
        </div>
      </div>

      {/* Continue Button */}
      <button style={styles.continueButton} onClick={onContinue}>
        Continue to Gold Glove Awards
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  icon: {
    fontSize: '4rem',
    marginBottom: '16px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '2rem',
    fontWeight: 800,
    color: '#fbbf24',
  },
  subtitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#94a3b8',
  },
  tripleCrownBanner: {
    maxWidth: '500px',
    margin: '0 auto 32px',
    padding: '24px',
    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)',
    borderRadius: '16px',
    border: '2px solid #fbbf24',
    textAlign: 'center',
    animation: 'pulse 2s infinite',
  },
  tripleCrownIcon: {
    fontSize: '2.5rem',
    marginBottom: '8px',
  },
  tripleCrownLabel: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#fbbf24',
    letterSpacing: '0.15em',
    marginBottom: '8px',
  },
  tripleCrownName: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#fff',
    marginBottom: '8px',
  },
  tripleCrownNote: {
    fontSize: '0.875rem',
    color: '#fcd34d',
  },
  section: {
    maxWidth: '500px',
    margin: '0 auto 24px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #334155',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 20px',
    backgroundColor: '#0f172a',
  },
  sectionIcon: {
    fontSize: '1.25rem',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  leadersList: {
    display: 'flex',
    flexDirection: 'column',
  },
  leaderRow: {
    display: 'grid',
    gridTemplateColumns: '48px 1fr auto',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    borderBottom: '1px solid #334155',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  crownIcon: {
    fontSize: '1.5rem',
    textAlign: 'center',
  },
  leaderInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  leaderCategory: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  leaderName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  leaderTeam: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
  },
  leaderValue: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#fbbf24',
  },
  continueButton: {
    display: 'block',
    maxWidth: '500px',
    width: '100%',
    margin: '0 auto',
    padding: '16px',
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
