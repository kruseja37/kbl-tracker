/**
 * FanMoralePanel - Fan morale status display
 * Per Ralph Framework S-C013
 *
 * Features:
 * - Morale value display (0-100)
 * - State name (HOSTILE, FRUSTRATED, APATHETIC, CONTENT, SUPPORTIVE, EUPHORIC)
 * - Trend indicator (rising/falling)
 */

interface FanMoralePanelProps {
  morale: number; // 0-100
  trend: 'rising' | 'falling' | 'stable';
  recentChange?: number; // Recent change amount
  compact?: boolean;
}

export default function FanMoralePanel({
  morale,
  trend,
  recentChange,
  compact = false,
}: FanMoralePanelProps) {
  const getMoraleState = (): {
    name: string;
    color: string;
    emoji: string;
    description: string;
  } => {
    if (morale <= 20) {
      return {
        name: 'HOSTILE',
        color: '#dc2626',
        emoji: '😡',
        description: 'Fans are furious',
      };
    }
    if (morale <= 35) {
      return {
        name: 'FRUSTRATED',
        color: '#ef4444',
        emoji: '😤',
        description: 'Growing discontent',
      };
    }
    if (morale <= 50) {
      return {
        name: 'APATHETIC',
        color: '#64748b',
        emoji: '😐',
        description: 'Losing interest',
      };
    }
    if (morale <= 65) {
      return {
        name: 'CONTENT',
        color: '#3b82f6',
        emoji: '🙂',
        description: 'Casually engaged',
      };
    }
    if (morale <= 80) {
      return {
        name: 'SUPPORTIVE',
        color: '#22c55e',
        emoji: '😊',
        description: 'Strong support',
      };
    }
    return {
      name: 'EUPHORIC',
      color: '#fbbf24',
      emoji: '🤩',
      description: 'Maximum hype!',
    };
  };

  const getTrendIcon = (): string => {
    if (trend === 'rising') return '↗️';
    if (trend === 'falling') return '↘️';
    return '→';
  };

  const getTrendColor = (): string => {
    if (trend === 'rising') return '#22c55e';
    if (trend === 'falling') return '#ef4444';
    return '#64748b';
  };

  const state = getMoraleState();

  if (compact) {
    return (
      <div style={compactStyles.container}>
        <div style={compactStyles.gauge}>
          <div
            style={{
              ...compactStyles.gaugeFill,
              width: `${morale}%`,
              backgroundColor: state.color,
            }}
          />
        </div>
        <div style={compactStyles.info}>
          <span style={compactStyles.emoji}>{state.emoji}</span>
          <span style={{ ...compactStyles.state, color: state.color }}>
            {state.name}
          </span>
          <span style={{ ...compactStyles.trend, color: getTrendColor() }}>
            {getTrendIcon()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Fan Morale</h3>
        <div style={{ ...styles.trendBadge, backgroundColor: getTrendColor() + '20', color: getTrendColor() }}>
          <span>{getTrendIcon()}</span>
          <span>{trend.charAt(0).toUpperCase() + trend.slice(1)}</span>
          {recentChange !== undefined && recentChange !== 0 && (
            <span>
              ({recentChange > 0 ? '+' : ''}{recentChange})
            </span>
          )}
        </div>
      </div>

      {/* Main Gauge */}
      <div style={styles.gaugeContainer}>
        <div style={styles.gaugeBackground}>
          <div
            style={{
              ...styles.gaugeFill,
              width: `${morale}%`,
              backgroundColor: state.color,
            }}
          />
        </div>
        <div style={styles.gaugeLabels}>
          <span style={styles.gaugeMin}>0</span>
          <span style={styles.gaugeMax}>100</span>
        </div>
      </div>

      {/* State Display */}
      <div style={styles.stateSection}>
        <span style={styles.stateEmoji}>{state.emoji}</span>
        <div style={styles.stateInfo}>
          <span style={{ ...styles.stateName, color: state.color }}>
            {state.name}
          </span>
          <span style={styles.stateDescription}>{state.description}</span>
        </div>
        <span style={styles.moraleValue}>{morale}</span>
      </div>

      {/* Effects */}
      <div style={styles.effectsSection}>
        <div style={styles.effectsTitle}>Effects</div>
        <div style={styles.effectsList}>
          {getMoraleEffects(morale).map((effect, i) => (
            <div key={i} style={styles.effectItem}>
              <span style={styles.effectIcon}>{effect.icon}</span>
              <span style={styles.effectText}>{effect.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getMoraleEffects(morale: number): { icon: string; text: string }[] {
  if (morale <= 20) {
    return [
      { icon: '💰', text: 'Ticket revenue -30%' },
      { icon: '😢', text: 'Player morale penalty' },
      { icon: '📰', text: 'Negative media coverage' },
    ];
  }
  if (morale <= 35) {
    return [
      { icon: '💰', text: 'Ticket revenue -15%' },
      { icon: '📉', text: 'Attendance declining' },
    ];
  }
  if (morale <= 50) {
    return [
      { icon: '😐', text: 'No special effects' },
      { icon: '📊', text: 'Average attendance' },
    ];
  }
  if (morale <= 65) {
    return [
      { icon: '📈', text: 'Attendance stable' },
      { icon: '💪', text: 'Normal support' },
    ];
  }
  if (morale <= 80) {
    return [
      { icon: '💰', text: 'Ticket revenue +10%' },
      { icon: '🎉', text: 'Home field advantage boost' },
    ];
  }
  return [
    { icon: '💰', text: 'Ticket revenue +25%' },
    { icon: '⭐', text: 'Fame bonus +1 for home games' },
    { icon: '🏟️', text: 'Sellout crowds' },
  ];
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
  title: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  trendBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '100px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  gaugeContainer: {
    marginBottom: '16px',
  },
  gaugeBackground: {
    height: '16px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: '8px',
    transition: 'width 0.5s ease, background-color 0.3s ease',
    boxShadow: '0 0 10px currentColor',
  },
  gaugeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '4px',
  },
  gaugeMin: {
    fontSize: '0.625rem',
    color: '#64748b',
  },
  gaugeMax: {
    fontSize: '0.625rem',
    color: '#64748b',
  },
  stateSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  stateEmoji: {
    fontSize: '2rem',
  },
  stateInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  stateName: {
    fontSize: '1.125rem',
    fontWeight: 700,
  },
  stateDescription: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
  },
  moraleValue: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#e2e8f0',
  },
  effectsSection: {
    padding: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
  },
  effectsTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  effectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  effectItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  effectIcon: {
    fontSize: '0.875rem',
  },
  effectText: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
  },
};

const compactStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  gauge: {
    height: '8px',
    backgroundColor: '#0f172a',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  info: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  emoji: {
    fontSize: '1.25rem',
  },
  state: {
    fontSize: '0.8125rem',
    fontWeight: 600,
  },
  trend: {
    marginLeft: 'auto',
    fontSize: '1rem',
  },
};
