/**
 * ContractionWarning - Team contraction risk warning
 * Per Ralph Framework S-G007
 *
 * Features:
 * - Warning at <30 morale
 * - Risk factors shown
 * - Dismissible
 */

import { useState } from 'react';

interface RiskFactor {
  factor: string;
  value: number | string;
  threshold: number | string;
  isCritical: boolean;
}

interface ContractionWarningProps {
  teamMorale: number;
  riskFactors: RiskFactor[];
  contractionThreshold?: number;
  onDismiss?: () => void;
  onLearnMore?: () => void;
}

export default function ContractionWarning({
  teamMorale,
  riskFactors,
  contractionThreshold = 30,
  onDismiss,
  onLearnMore,
}: ContractionWarningProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || teamMorale >= contractionThreshold) {
    return null;
  }

  const criticalFactors = riskFactors.filter((f) => f.isCritical);
  const severity = teamMorale < 20 ? 'CRITICAL' : 'WARNING';

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      style={{
        ...styles.container,
        borderColor: severity === 'CRITICAL' ? '#ef4444' : '#f97316',
        backgroundColor:
          severity === 'CRITICAL'
            ? 'rgba(239, 68, 68, 0.1)'
            : 'rgba(249, 115, 22, 0.1)',
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.warningIcon}>
          {severity === 'CRITICAL' ? '🚨' : '⚠️'}
        </div>
        <div style={styles.headerText}>
          <span
            style={{
              ...styles.title,
              color: severity === 'CRITICAL' ? '#ef4444' : '#f97316',
            }}
          >
            {severity === 'CRITICAL'
              ? 'CRITICAL: Contraction Imminent'
              : 'Contraction Risk Warning'}
          </span>
          <span style={styles.subtitle}>
            Team morale at {teamMorale} (threshold: {contractionThreshold})
          </span>
        </div>
        <button style={styles.dismissButton} onClick={handleDismiss}>
          ×
        </button>
      </div>

      {/* Morale Bar */}
      <div style={styles.moraleSection}>
        <div style={styles.moraleBarContainer}>
          <div
            style={{
              ...styles.moraleBarFill,
              width: `${teamMorale}%`,
              backgroundColor:
                teamMorale < 20
                  ? '#ef4444'
                  : teamMorale < 30
                  ? '#f97316'
                  : '#fbbf24',
            }}
          />
          <div
            style={{
              ...styles.moraleThreshold,
              left: `${contractionThreshold}%`,
            }}
          />
        </div>
        <div style={styles.moraleLabels}>
          <span>0</span>
          <span style={styles.thresholdLabel}>
            ⚠️ {contractionThreshold}
          </span>
          <span>100</span>
        </div>
      </div>

      {/* Risk Factors */}
      {riskFactors.length > 0 && (
        <div style={styles.factorsSection}>
          <span style={styles.factorsTitle}>Risk Factors:</span>
          <div style={styles.factorsList}>
            {riskFactors.map((factor, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.factorItem,
                  borderColor: factor.isCritical ? '#ef4444' : '#334155',
                }}
              >
                <span style={styles.factorName}>{factor.factor}</span>
                <span
                  style={{
                    ...styles.factorValue,
                    color: factor.isCritical ? '#ef4444' : '#fbbf24',
                  }}
                >
                  {factor.value} (need: {factor.threshold})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning Message */}
      <div style={styles.warningMessage}>
        {severity === 'CRITICAL' ? (
          <>
            <strong>Your franchise will be contracted</strong> at the end of this
            season if morale remains below {contractionThreshold}. Take immediate
            action!
          </>
        ) : (
          <>
            Your franchise is at risk of contraction. Improve fan morale by winning
            games, signing popular players, or making fan-friendly decisions.
          </>
        )}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        {onLearnMore && (
          <button style={styles.learnMoreButton} onClick={onLearnMore}>
            How to Improve Morale
          </button>
        )}
        <button style={styles.dismissTextButton} onClick={handleDismiss}>
          Dismiss for now
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    borderRadius: '12px',
    border: '2px solid',
    marginBottom: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '16px',
  },
  warningIcon: {
    fontSize: '1.5rem',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  title: {
    fontSize: '1rem',
    fontWeight: 700,
  },
  subtitle: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
  },
  dismissButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#64748b',
    fontSize: '1.25rem',
    cursor: 'pointer',
    lineHeight: 1,
  },
  moraleSection: {
    marginBottom: '16px',
  },
  moraleBarContainer: {
    position: 'relative',
    height: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  moraleBarFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.3s ease',
  },
  moraleThreshold: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '2px',
    backgroundColor: '#fff',
  },
  moraleLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
    fontSize: '0.6875rem',
    color: '#64748b',
  },
  thresholdLabel: {
    color: '#fbbf24',
    fontWeight: 600,
  },
  factorsSection: {
    marginBottom: '16px',
  },
  factorsTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: '8px',
    display: 'block',
  },
  factorsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  factorItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    border: '1px solid',
  },
  factorName: {
    fontSize: '0.8125rem',
    color: '#e2e8f0',
  },
  factorValue: {
    fontSize: '0.8125rem',
    fontWeight: 600,
  },
  warningMessage: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    lineHeight: 1.5,
    marginBottom: '16px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  learnMoreButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  dismissTextButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '0.8125rem',
    cursor: 'pointer',
  },
};
