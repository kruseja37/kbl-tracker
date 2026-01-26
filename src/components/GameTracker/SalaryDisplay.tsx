/**
 * Salary Display Component
 * Per IMPLEMENTATION_PLAN.md v3 - Day 11: Stretch Goal - Salary Calculations Visible
 *
 * Displays player salary with breakdown.
 */

import React from 'react';
import {
  type SalaryBreakdown,
  formatSalary,
  getSalaryTier,
  getSalaryColor,
  getROITierDisplay,
  calculateSimpleROI,
} from '../../engines/salaryCalculator';

// ============================================
// TYPES
// ============================================

interface SalaryBadgeProps {
  salary: number;
  showTier?: boolean;
}

interface SalaryBreakdownDisplayProps {
  breakdown: SalaryBreakdown;
  playerName?: string;
}

interface SalaryCompactProps {
  salary: number;
  war?: number;
}

// ============================================
// SALARY BADGE
// ============================================

export function SalaryBadge({ salary, showTier = true }: SalaryBadgeProps) {
  const color = getSalaryColor(salary);
  const tier = getSalaryTier(salary);

  return (
    <div style={styles.badge}>
      <span style={{ ...styles.salaryValue, color }}>{formatSalary(salary)}</span>
      {showTier && <span style={styles.salaryTier}>{tier}</span>}
    </div>
  );
}

// ============================================
// SALARY BREAKDOWN DISPLAY
// ============================================

export function SalaryBreakdownDisplay({ breakdown, playerName }: SalaryBreakdownDisplayProps) {
  const modifiers = [
    { label: 'Base (from ratings)', value: breakdown.baseSalary, multiplier: null },
    { label: 'Position', value: breakdown.components.afterPosition, multiplier: breakdown.positionMultiplier },
    { label: 'Traits', value: breakdown.components.afterTraits, multiplier: breakdown.traitModifier },
    { label: 'Age', value: breakdown.components.afterAge, multiplier: breakdown.ageFactor },
    { label: 'Performance', value: breakdown.components.afterPerformance, multiplier: breakdown.performanceModifier },
    { label: 'Fame', value: breakdown.components.afterFame, multiplier: breakdown.fameModifier },
  ];

  // Only show personality if it's not 1.0
  if (breakdown.personalityModifier !== 1.0) {
    modifiers.push({
      label: 'Personality',
      value: breakdown.components.afterPersonality,
      multiplier: breakdown.personalityModifier,
    });
  }

  return (
    <div style={styles.breakdownContainer}>
      {playerName && <div style={styles.breakdownTitle}>Salary Breakdown: {playerName}</div>}

      <div style={styles.breakdownTable}>
        {modifiers.map((mod, idx) => (
          <div key={mod.label} style={styles.breakdownRow}>
            <span style={styles.breakdownLabel}>{mod.label}</span>
            <span style={styles.breakdownMultiplier}>
              {mod.multiplier !== null && mod.multiplier !== 1.0 && (
                <span style={{
                  color: mod.multiplier > 1 ? '#22c55e' : mod.multiplier < 1 ? '#ef4444' : '#6b7280'
                }}>
                  ×{mod.multiplier.toFixed(2)}
                </span>
              )}
            </span>
            <span style={styles.breakdownValue}>{formatSalary(mod.value)}</span>
          </div>
        ))}
      </div>

      <div style={styles.finalSalary}>
        <span style={styles.finalLabel}>Final Salary</span>
        <span style={{ ...styles.finalValue, color: getSalaryColor(breakdown.finalSalary) }}>
          {formatSalary(breakdown.finalSalary)}
        </span>
      </div>

      <div style={styles.tierDisplay}>
        {getSalaryTier(breakdown.finalSalary)}
      </div>
    </div>
  );
}

// ============================================
// SALARY WITH ROI (COMPACT)
// ============================================

export function SalaryCompact({ salary, war }: SalaryCompactProps) {
  const roi = war !== undefined ? calculateSimpleROI(salary, war) : null;

  return (
    <div style={styles.compactContainer}>
      <div style={styles.compactSalary}>
        <span style={styles.compactLabel}>Salary</span>
        <span style={{ ...styles.compactValue, color: getSalaryColor(salary) }}>
          {formatSalary(salary)}
        </span>
      </div>

      {roi && (
        <div style={styles.compactRoi}>
          <span style={styles.compactLabel}>Value</span>
          <span style={{
            ...styles.compactValue,
            color: roi.roiTier === 'ELITE_VALUE' || roi.roiTier === 'GREAT_VALUE'
              ? '#22c55e'
              : roi.roiTier === 'BUST' || roi.roiTier === 'POOR_VALUE'
              ? '#ef4444'
              : '#f59e0b'
          }}>
            {roi.roiTier.replace('_', ' ')}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================
// SALARY SECTION (FOR PLAYER CARD)
// ============================================

interface SalarySectionProps {
  salary: number;
  war?: number;
  showBreakdown?: boolean;
  breakdown?: SalaryBreakdown;
}

export function SalarySection({ salary, war, showBreakdown = false, breakdown }: SalarySectionProps) {
  const roi = war !== undefined ? calculateSimpleROI(salary, war) : null;

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>CONTRACT</div>

      <div style={styles.salaryRow}>
        <div>
          <span style={{ ...styles.salaryAmount, color: getSalaryColor(salary) }}>
            {formatSalary(salary)}
          </span>
          <span style={styles.salaryTierSmall}>{getSalaryTier(salary)}</span>
        </div>

        {roi && (
          <div style={styles.roiSection}>
            <span style={styles.roiLabel}>WAR/$M:</span>
            <span style={{
              ...styles.roiValue,
              color: roi.roiTier === 'ELITE_VALUE' || roi.roiTier === 'GREAT_VALUE'
                ? '#22c55e'
                : roi.roiTier === 'BUST' || roi.roiTier === 'POOR_VALUE'
                ? '#ef4444'
                : '#f59e0b'
            }}>
              {roi.roiWARPerMillion.toFixed(2)}
            </span>
            <span style={styles.roiTierLabel}>{getROITierDisplay(roi.roiTier)}</span>
          </div>
        )}
      </div>

      {showBreakdown && breakdown && (
        <div style={styles.breakdownMini}>
          <div style={styles.breakdownMiniRow}>
            <span>Position</span>
            <span>×{breakdown.positionMultiplier.toFixed(2)}</span>
          </div>
          <div style={styles.breakdownMiniRow}>
            <span>Age</span>
            <span>×{breakdown.ageFactor.toFixed(2)}</span>
          </div>
          {breakdown.traitModifier !== 1.0 && (
            <div style={styles.breakdownMiniRow}>
              <span>Traits</span>
              <span style={{ color: breakdown.traitModifier > 1 ? '#22c55e' : '#ef4444' }}>
                ×{breakdown.traitModifier.toFixed(2)}
              </span>
            </div>
          )}
          {breakdown.fameModifier !== 1.0 && (
            <div style={styles.breakdownMiniRow}>
              <span>Fame</span>
              <span style={{ color: breakdown.fameModifier > 1 ? '#22c55e' : '#ef4444' }}>
                ×{breakdown.fameModifier.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const styles: Record<string, React.CSSProperties> = {
  badge: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  salaryValue: {
    fontSize: '1rem',
    fontWeight: 700,
  },
  salaryTier: {
    fontSize: '0.625rem',
    color: '#6b7280',
    textTransform: 'uppercase',
  },

  // Breakdown styles
  breakdownContainer: {
    backgroundColor: '#111827',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #374151',
  },
  breakdownTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#f3f4f6',
    marginBottom: '12px',
    borderBottom: '1px solid #374151',
    paddingBottom: '8px',
  },
  breakdownTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  breakdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.75rem',
  },
  breakdownLabel: {
    color: '#9ca3af',
    flex: 1,
  },
  breakdownMultiplier: {
    width: '50px',
    textAlign: 'center',
    fontSize: '0.625rem',
  },
  breakdownValue: {
    width: '70px',
    textAlign: 'right',
    color: '#d1d5db',
  },
  finalSalary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #374151',
  },
  finalLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#f3f4f6',
  },
  finalValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
  },
  tierDisplay: {
    textAlign: 'center',
    marginTop: '8px',
    fontSize: '0.75rem',
    color: '#9ca3af',
  },

  // Compact styles
  compactContainer: {
    display: 'flex',
    gap: '16px',
  },
  compactSalary: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  compactRoi: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  compactLabel: {
    fontSize: '0.625rem',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  compactValue: {
    fontSize: '0.875rem',
    fontWeight: 600,
  },

  // Section styles (for PlayerCard)
  section: {
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  salaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#111827',
    borderRadius: '6px',
    padding: '10px 12px',
  },
  salaryAmount: {
    fontSize: '1.125rem',
    fontWeight: 700,
    display: 'block',
  },
  salaryTierSmall: {
    fontSize: '0.625rem',
    color: '#6b7280',
    display: 'block',
    marginTop: '2px',
  },
  roiSection: {
    textAlign: 'right',
  },
  roiLabel: {
    fontSize: '0.625rem',
    color: '#6b7280',
    marginRight: '4px',
  },
  roiValue: {
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  roiTierLabel: {
    display: 'block',
    fontSize: '0.625rem',
    marginTop: '2px',
  },
  breakdownMini: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#1f2937',
    borderRadius: '4px',
    fontSize: '0.625rem',
  },
  breakdownMiniRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#9ca3af',
    padding: '2px 0',
  },
};

// ============================================
// EXPORTS
// ============================================

export default SalarySection;
