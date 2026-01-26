/**
 * AgingDisplay - Show player career phase
 * Per Ralph Framework S-F007
 *
 * Features:
 * - Phase indicator (Development, Prime, Decline)
 * - Age shown
 * - Decline warning for older players
 */

import {
  CareerPhase,
  getCareerPhase,
  getCareerPhaseDisplayName,
  getCareerPhaseColor,
  getYearsRemainingEstimate,
  calculateRetirementProbability,
} from '../engines/agingEngine';

interface AgingDisplayProps {
  age: number;
  overallRating?: number;
  fame?: number;
  compact?: boolean;
  showRetirementRisk?: boolean;
}

export default function AgingDisplay({
  age,
  overallRating = 70,
  fame = 0,
  compact = false,
  showRetirementRisk = true,
}: AgingDisplayProps) {
  const phase = getCareerPhase(age);
  const phaseColor = getCareerPhaseColor(phase);
  const phaseName = getCareerPhaseDisplayName(phase);
  const yearsRemaining = getYearsRemainingEstimate(age);
  const retirementRisk = calculateRetirementProbability(age, overallRating, fame);

  const getPhaseIcon = (): string => {
    switch (phase) {
      case CareerPhase.DEVELOPMENT:
        return '📈';
      case CareerPhase.PRIME:
        return '⭐';
      case CareerPhase.DECLINE:
        return '📉';
      case CareerPhase.FORCED_RETIREMENT:
        return '🚪';
      default:
        return '';
    }
  };

  if (compact) {
    return (
      <div style={compactStyles.container}>
        <span style={compactStyles.age}>{age}</span>
        <span
          style={{
            ...compactStyles.phaseBadge,
            backgroundColor: `${phaseColor}20`,
            color: phaseColor,
          }}
        >
          {phaseName}
        </span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Age Display */}
      <div style={styles.ageSection}>
        <span style={styles.ageLabel}>Age</span>
        <span style={styles.ageValue}>{age}</span>
      </div>

      {/* Phase Indicator */}
      <div
        style={{
          ...styles.phaseCard,
          borderColor: phaseColor,
        }}
      >
        <span style={styles.phaseIcon}>{getPhaseIcon()}</span>
        <div style={styles.phaseInfo}>
          <span style={{ ...styles.phaseName, color: phaseColor }}>
            {phaseName}
          </span>
          <span style={styles.yearsRemaining}>~{yearsRemaining} years left</span>
        </div>
      </div>

      {/* Decline Warning */}
      {phase === CareerPhase.DECLINE && (
        <div style={styles.warningBanner}>
          <span style={styles.warningIcon}>⚠️</span>
          <span style={styles.warningText}>Beginning decline phase</span>
        </div>
      )}

      {/* Retirement Risk */}
      {showRetirementRisk && retirementRisk > 0 && (
        <div style={styles.retirementSection}>
          <span style={styles.retirementLabel}>Retirement Risk</span>
          <div style={styles.riskMeter}>
            <div
              style={{
                ...styles.riskFill,
                width: `${retirementRisk * 100}%`,
                backgroundColor:
                  retirementRisk > 0.5
                    ? '#ef4444'
                    : retirementRisk > 0.25
                    ? '#fbbf24'
                    : '#22c55e',
              }}
            />
          </div>
          <span style={styles.riskPercent}>
            {Math.round(retirementRisk * 100)}%
          </span>
        </div>
      )}

      {/* Forced Retirement Notice */}
      {phase === CareerPhase.FORCED_RETIREMENT && (
        <div style={styles.forcedRetirementBanner}>
          <span style={styles.forcedIcon}>🚪</span>
          <span style={styles.forcedText}>
            Must retire at end of season (max age 49)
          </span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  ageSection: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  ageLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  ageValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#fff',
  },
  phaseCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    borderLeft: '4px solid',
  },
  phaseIcon: {
    fontSize: '1.5rem',
  },
  phaseInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  phaseName: {
    fontSize: '0.9375rem',
    fontWeight: 700,
  },
  yearsRemaining: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  warningBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(251, 191, 36, 0.3)',
  },
  warningIcon: {
    fontSize: '1rem',
  },
  warningText: {
    fontSize: '0.8125rem',
    color: '#fbbf24',
    fontWeight: 500,
  },
  retirementSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  retirementLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    whiteSpace: 'nowrap',
  },
  riskMeter: {
    flex: 1,
    height: '6px',
    backgroundColor: '#0f172a',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  riskFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  riskPercent: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#94a3b8',
    minWidth: '40px',
    textAlign: 'right',
  },
  forcedRetirementBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  forcedIcon: {
    fontSize: '1.25rem',
  },
  forcedText: {
    fontSize: '0.875rem',
    color: '#ef4444',
    fontWeight: 600,
  },
};

const compactStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  age: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  phaseBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
};
