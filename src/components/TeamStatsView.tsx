/**
 * TeamStatsView - Team aggregate statistics
 * Per Ralph Framework S-C011
 *
 * Features:
 * - Team batting totals (R, H, HR, AVG)
 * - Team pitching totals (ERA, WHIP, K)
 * - League rank for each stat
 */

interface TeamStats {
  teamId: string;
  teamName: string;
  // Batting
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  walks: number;
  strikeouts: number;
  stolenBases: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  // Pitching
  era: number;
  whip: number;
  qualityStarts: number;
  saves: number;
  blownSaves: number;
  pitchingStrikeouts: number;
  pitchingWalks: number;
  runsAllowed: number;
  earnedRuns: number;
  inningsPitched: number;
}

interface LeagueRanks {
  [statKey: string]: number; // 1 = best in league
}

interface TeamStatsViewProps {
  stats: TeamStats;
  leagueRanks?: LeagueRanks;
  compact?: boolean;
}

export default function TeamStatsView({
  stats,
  leagueRanks = {},
  compact = false,
}: TeamStatsViewProps) {
  const formatAvg = (value: number): string => {
    return value.toFixed(3).replace(/^0/, '');
  };

  const formatEra = (value: number): string => {
    return value.toFixed(2);
  };

  const formatWhip = (value: number): string => {
    return value.toFixed(2);
  };

  const getRankBadge = (statKey: string) => {
    const rank = leagueRanks[statKey];
    if (!rank) return null;

    const isTop3 = rank <= 3;
    return (
      <span
        style={{
          ...styles.rankBadge,
          backgroundColor: isTop3 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 116, 139, 0.2)',
          color: isTop3 ? '#22c55e' : '#64748b',
        }}
      >
        {getRankOrdinal(rank)}
      </span>
    );
  };

  const getRankOrdinal = (rank: number): string => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = rank % 100;
    return rank + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  };

  const battingStats = [
    { key: 'runs', label: 'Runs', value: stats.runs, format: 'number' },
    { key: 'hits', label: 'Hits', value: stats.hits, format: 'number' },
    { key: 'homeRuns', label: 'HR', value: stats.homeRuns, format: 'number' },
    { key: 'rbi', label: 'RBI', value: stats.rbi, format: 'number' },
    { key: 'stolenBases', label: 'SB', value: stats.stolenBases, format: 'number' },
    { key: 'avg', label: 'AVG', value: formatAvg(stats.avg), format: 'string' },
    { key: 'obp', label: 'OBP', value: formatAvg(stats.obp), format: 'string' },
    { key: 'slg', label: 'SLG', value: formatAvg(stats.slg), format: 'string' },
    { key: 'ops', label: 'OPS', value: formatAvg(stats.ops), format: 'string' },
  ];

  const pitchingStats = [
    { key: 'era', label: 'ERA', value: formatEra(stats.era), format: 'string' },
    { key: 'whip', label: 'WHIP', value: formatWhip(stats.whip), format: 'string' },
    { key: 'pitchingStrikeouts', label: 'K', value: stats.pitchingStrikeouts, format: 'number' },
    { key: 'qualityStarts', label: 'QS', value: stats.qualityStarts, format: 'number' },
    { key: 'saves', label: 'SV', value: stats.saves, format: 'number' },
    { key: 'runsAllowed', label: 'RA', value: stats.runsAllowed, format: 'number' },
    { key: 'inningsPitched', label: 'IP', value: stats.inningsPitched.toFixed(1), format: 'string' },
  ];

  if (compact) {
    return (
      <div style={compactStyles.container}>
        <div style={compactStyles.section}>
          <div style={compactStyles.sectionTitle}>Batting</div>
          <div style={compactStyles.statsRow}>
            {battingStats.slice(0, 4).map((stat) => (
              <div key={stat.key} style={compactStyles.stat}>
                <span style={compactStyles.statValue}>{stat.value}</span>
                <span style={compactStyles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={compactStyles.section}>
          <div style={compactStyles.sectionTitle}>Pitching</div>
          <div style={compactStyles.statsRow}>
            {pitchingStats.slice(0, 4).map((stat) => (
              <div key={stat.key} style={compactStyles.stat}>
                <span style={compactStyles.statValue}>{stat.value}</span>
                <span style={compactStyles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{stats.teamName} Team Stats</h2>

      <div style={styles.grid}>
        {/* Batting Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>🏏</span>
            <span style={styles.sectionTitle}>Team Batting</span>
          </div>
          <div style={styles.statsGrid}>
            {battingStats.map((stat) => (
              <div key={stat.key} style={styles.statCard}>
                <div style={styles.statHeader}>
                  <span style={styles.statLabel}>{stat.label}</span>
                  {getRankBadge(stat.key)}
                </div>
                <div style={styles.statValue}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pitching Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>⚾</span>
            <span style={styles.sectionTitle}>Team Pitching</span>
          </div>
          <div style={styles.statsGrid}>
            {pitchingStats.map((stat) => (
              <div key={stat.key} style={styles.statCard}>
                <div style={styles.statHeader}>
                  <span style={styles.statLabel}>{stat.label}</span>
                  {getRankBadge(stat.key)}
                </div>
                <div style={styles.statValue}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Run Differential */}
      <div style={styles.diffSection}>
        <div style={styles.diffItem}>
          <span style={styles.diffLabel}>Runs Scored</span>
          <span style={styles.diffValue}>{stats.runs}</span>
        </div>
        <div style={styles.diffDivider}>-</div>
        <div style={styles.diffItem}>
          <span style={styles.diffLabel}>Runs Allowed</span>
          <span style={styles.diffValue}>{stats.runsAllowed}</span>
        </div>
        <div style={styles.diffDivider}>=</div>
        <div style={styles.diffItem}>
          <span style={styles.diffLabel}>Run Differential</span>
          <span
            style={{
              ...styles.diffValue,
              color: stats.runs - stats.runsAllowed > 0 ? '#22c55e' : stats.runs - stats.runsAllowed < 0 ? '#ef4444' : '#94a3b8',
            }}
          >
            {stats.runs - stats.runsAllowed > 0 ? '+' : ''}
            {stats.runs - stats.runsAllowed}
          </span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #334155',
  },
  title: {
    margin: '0 0 20px 0',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#fff',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '24px',
  },
  section: {
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    padding: '16px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  sectionIcon: {
    fontSize: '1.25rem',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  statCard: {
    padding: '12px',
    backgroundColor: '#1e293b',
    borderRadius: '6px',
  },
  statHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  rankBadge: {
    fontSize: '0.625rem',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  diffSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
  },
  diffItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  diffLabel: {
    fontSize: '0.6875rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  diffValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  diffDivider: {
    fontSize: '1.5rem',
    color: '#475569',
    fontWeight: 300,
  },
};

const compactStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  section: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  statsRow: {
    display: 'flex',
    gap: '12px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  statValue: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  statLabel: {
    fontSize: '0.625rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
};
