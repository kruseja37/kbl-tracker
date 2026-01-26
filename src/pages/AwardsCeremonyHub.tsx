/**
 * AwardsCeremonyHub - Guided awards ceremony flow
 * Per Ralph Framework S-D001, S-D002
 *
 * Features:
 * - All award categories listed
 * - Progress indicator
 * - Next button navigation
 * - Skip to summary option
 */

import { useState, useMemo } from 'react';

type AwardCategory =
  | 'leaders'
  | 'goldglove'
  | 'silverslugger'
  | 'mvp'
  | 'cyyoung'
  | 'roy'
  | 'summary';

interface AwardStep {
  id: AwardCategory;
  label: string;
  icon: string;
  description: string;
}

interface AwardsCeremonyHubProps {
  onNavigateToAward: (awardId: AwardCategory) => void;
  completedAwards: AwardCategory[];
  currentAward?: AwardCategory;
  onSkipToSummary: () => void;
  seasonYear: number;
}

export default function AwardsCeremonyHub({
  onNavigateToAward,
  completedAwards,
  currentAward,
  onSkipToSummary,
  seasonYear,
}: AwardsCeremonyHubProps) {
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const awardSteps: AwardStep[] = useMemo(() => [
    {
      id: 'leaders',
      label: 'League Leaders',
      icon: '👑',
      description: 'Batting & Pitching Triple Crown',
    },
    {
      id: 'goldglove',
      label: 'Gold Glove Awards',
      icon: '🧤',
      description: 'Best defensive player at each position',
    },
    {
      id: 'silverslugger',
      label: 'Silver Slugger Awards',
      icon: '🏏',
      description: 'Best offensive player at each position',
    },
    {
      id: 'mvp',
      label: 'Most Valuable Player',
      icon: '🏆',
      description: 'Outstanding overall performance',
    },
    {
      id: 'cyyoung',
      label: 'Cy Young Award',
      icon: '⚾',
      description: 'Best pitcher of the season',
    },
    {
      id: 'roy',
      label: 'Rookie of the Year',
      icon: '⭐',
      description: 'Outstanding first-year player',
    },
  ], []);

  const progress = useMemo(() => {
    return {
      completed: completedAwards.length,
      total: awardSteps.length,
      percent: (completedAwards.length / awardSteps.length) * 100,
    };
  }, [completedAwards, awardSteps]);

  const getStepStatus = (stepId: AwardCategory): 'completed' | 'current' | 'pending' => {
    if (completedAwards.includes(stepId)) return 'completed';
    if (stepId === currentAward) return 'current';
    return 'pending';
  };

  const getNextAward = (): AwardCategory | null => {
    for (const step of awardSteps) {
      if (!completedAwards.includes(step.id)) {
        return step.id;
      }
    }
    return 'summary';
  };

  const handleSkipConfirm = () => {
    setShowSkipConfirm(false);
    onSkipToSummary();
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.year}>{seasonYear}</div>
        <h1 style={styles.title}>Awards Ceremony</h1>
        <p style={styles.subtitle}>
          Celebrate the season's best performances
        </p>
      </div>

      {/* Progress */}
      <div style={styles.progressSection}>
        <div style={styles.progressInfo}>
          <span style={styles.progressLabel}>Progress</span>
          <span style={styles.progressCount}>
            {progress.completed} of {progress.total} awards
          </span>
        </div>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${progress.percent}%`,
            }}
          />
        </div>
      </div>

      {/* Award Steps */}
      <div style={styles.stepsContainer}>
        {awardSteps.map((step, index) => {
          const status = getStepStatus(step.id);
          return (
            <div
              key={step.id}
              style={{
                ...styles.step,
                ...(status === 'completed' ? styles.stepCompleted : {}),
                ...(status === 'current' ? styles.stepCurrent : {}),
              }}
              onClick={() => onNavigateToAward(step.id)}
            >
              <div style={styles.stepNumber}>
                {status === 'completed' ? '✓' : index + 1}
              </div>
              <div style={styles.stepIcon}>{step.icon}</div>
              <div style={styles.stepInfo}>
                <div style={styles.stepLabel}>{step.label}</div>
                <div style={styles.stepDescription}>{step.description}</div>
              </div>
              <div style={styles.stepArrow}>
                {status === 'current' ? '→' : status === 'completed' ? '' : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div style={styles.actions}>
        <button
          style={styles.skipButton}
          onClick={() => setShowSkipConfirm(true)}
        >
          Skip to Summary
        </button>
        <button
          style={styles.nextButton}
          onClick={() => {
            const next = getNextAward();
            if (next) onNavigateToAward(next);
          }}
        >
          {progress.completed === progress.total
            ? 'View Summary'
            : `Next: ${awardSteps.find((s) => s.id === getNextAward())?.label || 'Summary'}`}
        </button>
      </div>

      {/* Skip Confirmation Modal */}
      {showSkipConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalIcon}>⏭️</div>
            <h3 style={styles.modalTitle}>Skip to Summary?</h3>
            <p style={styles.modalText}>
              You can skip the individual award presentations and go straight
              to the awards summary. All awards will still be calculated.
            </p>
            <div style={styles.modalActions}>
              <button
                style={styles.modalCancel}
                onClick={() => setShowSkipConfirm(false)}
              >
                Cancel
              </button>
              <button
                style={styles.modalConfirm}
                onClick={handleSkipConfirm}
              >
                Skip to Summary
              </button>
            </div>
          </div>
        </div>
      )}
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
  year: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#64748b',
    letterSpacing: '0.2em',
    marginBottom: '8px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '2.5rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#94a3b8',
  },
  progressSection: {
    maxWidth: '600px',
    margin: '0 auto 32px',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  progressLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
  },
  progressCount: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#334155',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  stepsContainer: {
    maxWidth: '600px',
    margin: '0 auto 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  step: {
    display: 'grid',
    gridTemplateColumns: '36px 48px 1fr 24px',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  stepCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  stepCurrent: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3b82f6',
    boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)',
  },
  stepNumber: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderRadius: '50%',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#94a3b8',
  },
  stepIcon: {
    fontSize: '1.75rem',
    textAlign: 'center',
  },
  stepInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  stepLabel: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  stepDescription: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  stepArrow: {
    fontSize: '1.25rem',
    color: '#3b82f6',
    fontWeight: 700,
  },
  actions: {
    maxWidth: '600px',
    margin: '0 auto',
    display: 'flex',
    gap: '12px',
  },
  skipButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: 'transparent',
    border: '1px solid #475569',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  nextButton: {
    flex: 2,
    padding: '14px',
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '0.9375rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '400px',
    textAlign: 'center',
    border: '1px solid #334155',
  },
  modalIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
  },
  modalTitle: {
    margin: '0 0 12px 0',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#fff',
  },
  modalText: {
    margin: '0 0 24px 0',
    fontSize: '0.9375rem',
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
  },
  modalCancel: {
    flex: 1,
    padding: '12px',
    backgroundColor: 'transparent',
    border: '1px solid #475569',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  modalConfirm: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
