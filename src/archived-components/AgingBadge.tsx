/**
 * AgingBadge - Display player career phase and retirement probability
 * Per Ralph Framework GAP-042
 *
 * Shows:
 * - Career phase (Development/Prime/Decline)
 * - Retirement probability for older players
 */

import {
  getCareerPhase,
  getCareerPhaseDisplayName,
  getCareerPhaseColor,
  calculateRetirementProbability,
  CareerPhase,
} from '../engines/agingEngine';

interface AgingBadgeProps {
  age: number;
  overallRating?: number;
  fame?: number;
  showRetirementProb?: boolean;
  size?: 'small' | 'medium';
}

export default function AgingBadge({
  age,
  overallRating = 70,
  fame = 0,
  showRetirementProb = true,
  size = 'small',
}: AgingBadgeProps) {
  const phase = getCareerPhase(age);
  const phaseName = getCareerPhaseDisplayName(phase);
  const phaseColor = getCareerPhaseColor(phase);

  // Only show retirement probability for players 35+
  const retirementProb = age >= 35
    ? calculateRetirementProbability(age, overallRating, fame)
    : 0;

  const isSmall = size === 'small';

  return (
    <div style={styles.container}>
      {/* Career Phase Badge */}
      <div
        style={{
          ...styles.phaseBadge,
          backgroundColor: `${phaseColor}20`,
          color: phaseColor,
          padding: isSmall ? '2px 8px' : '4px 12px',
          fontSize: isSmall ? '0.625rem' : '0.75rem',
        }}
      >
        {phaseName}
      </div>

      {/* Retirement Probability */}
      {showRetirementProb && retirementProb > 0 && (
        <div
          style={{
            ...styles.retirementBadge,
            padding: isSmall ? '2px 8px' : '4px 12px',
            fontSize: isSmall ? '0.625rem' : '0.75rem',
          }}
        >
          {Math.round(retirementProb * 100)}% retire
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  phaseBadge: {
    borderRadius: '100px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
  },
  retirementBadge: {
    borderRadius: '100px',
    fontWeight: 600,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    whiteSpace: 'nowrap',
  },
};

// Export types for use elsewhere
export type { AgingBadgeProps };
