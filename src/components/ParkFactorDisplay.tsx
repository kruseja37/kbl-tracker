/**
 * ParkFactorDisplay - Stadium park factors
 * Per Ralph Framework S-F008
 *
 * Features:
 * - Overall park factor shown
 * - Breakdown (HR, Hits, Runs)
 * - Confidence indicator based on games
 */

interface ParkFactors {
  overall: number;
  hr: number;
  hits: number;
  runs: number;
  strikeouts: number;
}

interface ParkFactorDisplayProps {
  stadiumName: string;
  factors: ParkFactors;
  gamesPlayed: number;
  confidenceThreshold?: number;
}

export default function ParkFactorDisplay({
  stadiumName,
  factors,
  gamesPlayed,
  confidenceThreshold = 30,
}: ParkFactorDisplayProps) {
  const isHighConfidence = gamesPlayed >= confidenceThreshold;

  const formatFactor = (value: number): string => {
    return value.toFixed(2);
  };

  const getFactorColor = (value: number): string => {
    if (value > 1.1) return '#ef4444'; // Hitter friendly
    if (value < 0.9) return '#3b82f6'; // Pitcher friendly
    return '#94a3b8'; // Neutral
  };

  const getFactorLabel = (value: number): string => {
    if (value > 1.15) return 'Very Hitter Friendly';
    if (value > 1.05) return 'Hitter Friendly';
    if (value < 0.85) return 'Very Pitcher Friendly';
    if (value < 0.95) return 'Pitcher Friendly';
    return 'Neutral';
  };

  const factorBreakdown = [
    { label: 'HR', value: factors.hr, icon: '💣' },
    { label: 'Hits', value: factors.hits, icon: '🏏' },
    { label: 'Runs', value: factors.runs, icon: '🏃' },
    { label: 'K', value: factors.strikeouts, icon: 'K' },
  ];

  return (
    <div style={styles.container}>
      {/* Stadium Name */}
      <div style={styles.header}>
        <span style={styles.stadiumIcon}>🏟️</span>
        <span style={styles.stadiumName}>{stadiumName}</span>
      </div>

      {/* Confidence Indicator */}
      <div
        style={{
          ...styles.confidenceBadge,
          backgroundColor: isHighConfidence
            ? 'rgba(34, 197, 94, 0.15)'
            : 'rgba(251, 191, 36, 0.15)',
          color: isHighConfidence ? '#22c55e' : '#fbbf24',
        }}
      >
        {isHighConfidence ? '✓ High' : '⚠️ Low'} confidence ({gamesPlayed} games)
      </div>

      {/* Overall Factor */}
      <div style={styles.overallSection}>
        <div style={styles.overallLabel}>Overall Park Factor</div>
        <div
          style={{
            ...styles.overallValue,
            color: getFactorColor(factors.overall),
          }}
        >
          {formatFactor(factors.overall)}
        </div>
        <div
          style={{
            ...styles.overallDescription,
            color: getFactorColor(factors.overall),
          }}
        >
          {getFactorLabel(factors.overall)}
        </div>
      </div>

      {/* Factor Breakdown */}
      <div style={styles.breakdownGrid}>
        {factorBreakdown.map((item) => (
          <div key={item.label} style={styles.factorCard}>
            <span style={styles.factorIcon}>{item.icon}</span>
            <span style={styles.factorLabel}>{item.label}</span>
            <span
              style={{
                ...styles.factorValue,
                color: getFactorColor(item.value),
              }}
            >
              {formatFactor(item.value)}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: '#ef4444' }} />
          <span>&gt;1.0 = More offense</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: '#3b82f6' }} />
          <span>&lt;1.0 = Less offense</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #334155',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  stadiumIcon: {
    fontSize: '1.5rem',
  },
  stadiumName: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#fff',
  },
  confidenceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: '100px',
    fontSize: '0.75rem',
    fontWeight: 600,
    marginBottom: '20px',
  },
  overallSection: {
    textAlign: 'center',
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: '#0f172a',
    borderRadius: '12px',
  },
  overallLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '8px',
  },
  overallValue: {
    fontSize: '3rem',
    fontWeight: 900,
    lineHeight: 1,
    marginBottom: '8px',
  },
  overallDescription: {
    fontSize: '0.8125rem',
    fontWeight: 600,
  },
  breakdownGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    marginBottom: '20px',
  },
  factorCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 8px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    gap: '4px',
  },
  factorIcon: {
    fontSize: '1rem',
  },
  factorLabel: {
    fontSize: '0.625rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  factorValue: {
    fontSize: '1.125rem',
    fontWeight: 700,
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    paddingTop: '12px',
    borderTop: '1px solid #334155',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: '#64748b',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
};
