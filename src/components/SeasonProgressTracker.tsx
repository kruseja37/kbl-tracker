/**
 * SeasonProgressTracker - Displays season progress
 * Per Ralph Framework S-C008
 *
 * Features:
 * - Progress bar visualization
 * - Games count (X/Y)
 * - Phase indicator (Regular Season, Playoffs, etc.)
 */

interface SeasonProgressTrackerProps {
  gamesPlayed: number;
  totalGames: number;
  phase: 'preseason' | 'regular' | 'allstar' | 'tradedeadline' | 'playoffs' | 'offseason';
  playoffRound?: 'wildcard' | 'division' | 'championship' | 'worldseries';
  compact?: boolean;
}

export default function SeasonProgressTracker({
  gamesPlayed,
  totalGames,
  phase,
  playoffRound,
  compact = false,
}: SeasonProgressTrackerProps) {
  const progressPercent = totalGames > 0 ? (gamesPlayed / totalGames) * 100 : 0;

  const getPhaseLabel = (): string => {
    switch (phase) {
      case 'preseason':
        return 'Spring Training';
      case 'regular':
        return 'Regular Season';
      case 'allstar':
        return 'All-Star Break';
      case 'tradedeadline':
        return 'Trade Deadline';
      case 'playoffs':
        if (playoffRound) {
          const roundLabels: Record<string, string> = {
            wildcard: 'Wild Card Round',
            division: 'Division Series',
            championship: 'Championship Series',
            worldseries: 'World Series',
          };
          return roundLabels[playoffRound] || 'Playoffs';
        }
        return 'Playoffs';
      case 'offseason':
        return 'Offseason';
      default:
        return 'Season';
    }
  };

  const getPhaseColor = (): string => {
    switch (phase) {
      case 'preseason':
        return '#8b5cf6'; // Purple
      case 'regular':
        return '#3b82f6'; // Blue
      case 'allstar':
        return '#f59e0b'; // Amber
      case 'tradedeadline':
        return '#ec4899'; // Pink
      case 'playoffs':
        return '#ef4444'; // Red
      case 'offseason':
        return '#64748b'; // Gray
      default:
        return '#3b82f6';
    }
  };

  const getPhaseIcon = (): string => {
    switch (phase) {
      case 'preseason':
        return '🌱';
      case 'regular':
        return '⚾';
      case 'allstar':
        return '⭐';
      case 'tradedeadline':
        return '📋';
      case 'playoffs':
        return '🏆';
      case 'offseason':
        return '❄️';
      default:
        return '📅';
    }
  };

  const getMilestones = (): { position: number; label: string }[] => {
    // Only show milestones in regular season
    if (phase !== 'regular') return [];

    return [
      { position: 25, label: '¼' },
      { position: 50, label: '½' },
      { position: 75, label: '¾' },
    ];
  };

  if (compact) {
    return (
      <div style={compactStyles.container}>
        <div style={compactStyles.info}>
          <span style={compactStyles.icon}>{getPhaseIcon()}</span>
          <span style={compactStyles.count}>
            Game {gamesPlayed + 1} of {totalGames}
          </span>
        </div>
        <div style={compactStyles.barContainer}>
          <div
            style={{
              ...compactStyles.bar,
              width: `${progressPercent}%`,
              backgroundColor: getPhaseColor(),
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.phaseInfo}>
          <span style={styles.phaseIcon}>{getPhaseIcon()}</span>
          <span style={{ ...styles.phaseLabel, color: getPhaseColor() }}>
            {getPhaseLabel()}
          </span>
        </div>
        <div style={styles.gameCount}>
          <span style={styles.currentGame}>{gamesPlayed}</span>
          <span style={styles.separator}>/</span>
          <span style={styles.totalGames}>{totalGames}</span>
          <span style={styles.gamesLabel}>games</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressContainer}>
        <div style={styles.progressBackground}>
          <div
            style={{
              ...styles.progressBar,
              width: `${Math.min(progressPercent, 100)}%`,
              backgroundColor: getPhaseColor(),
            }}
          />
          {/* Milestones */}
          {getMilestones().map((milestone) => (
            <div
              key={milestone.position}
              style={{
                ...styles.milestone,
                left: `${milestone.position}%`,
              }}
            >
              <div style={styles.milestoneLine} />
              <span style={styles.milestoneLabel}>{milestone.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div style={styles.statsRow}>
        <div style={styles.stat}>
          <span style={styles.statValue}>{gamesPlayed}</span>
          <span style={styles.statLabel}>Played</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{totalGames - gamesPlayed}</span>
          <span style={styles.statLabel}>Remaining</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{progressPercent.toFixed(0)}%</span>
          <span style={styles.statLabel}>Complete</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #334155',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  phaseInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  phaseIcon: {
    fontSize: '1.5rem',
  },
  phaseLabel: {
    fontSize: '1.125rem',
    fontWeight: 600,
  },
  gameCount: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  currentGame: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#fff',
  },
  separator: {
    fontSize: '1rem',
    color: '#64748b',
  },
  totalGames: {
    fontSize: '1rem',
    fontWeight: 500,
    color: '#94a3b8',
  },
  gamesLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginLeft: '4px',
  },
  progressContainer: {
    marginBottom: '16px',
  },
  progressBackground: {
    position: 'relative',
    height: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    overflow: 'visible',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.3s ease',
    boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)',
  },
  milestone: {
    position: 'absolute',
    top: '-4px',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  milestoneLine: {
    width: '2px',
    height: '20px',
    backgroundColor: '#475569',
  },
  milestoneLabel: {
    marginTop: '4px',
    fontSize: '0.625rem',
    color: '#64748b',
    fontWeight: 500,
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-around',
    paddingTop: '8px',
    borderTop: '1px solid #334155',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
};

const compactStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  info: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
  },
  icon: {
    fontSize: '1rem',
  },
  count: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#94a3b8',
  },
  barContainer: {
    flex: 1,
    height: '6px',
    backgroundColor: '#0f172a',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
};
