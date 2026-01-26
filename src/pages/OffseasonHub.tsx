/**
 * OffseasonHub - Offseason navigation and phase management
 * Per Ralph Framework S-E001, S-E002
 *
 * Features:
 * - All 11 offseason phases listed
 * - Current phase highlighted
 * - Locked phases show icon
 * - Navigate to specific phases
 */

import { useMemo } from 'react';

interface OffseasonPhase {
  id: number;
  name: string;
  description: string;
  route: string;
}

interface OffseasonHubProps {
  currentPhase: number;
  completedPhases: number[];
  onNavigate: (route: string) => void;
}

const OFFSEASON_PHASES: OffseasonPhase[] = [
  { id: 1, name: 'Awards Ceremony', description: 'Celebrate season achievements', route: '/offseason/awards' },
  { id: 2, name: 'End of Season Ratings', description: 'Review player development', route: '/offseason/eos-ratings' },
  { id: 3, name: 'Retirements', description: 'Honor retiring players', route: '/offseason/retirements' },
  { id: 4, name: 'FA Protection', description: 'Protect one player from FA', route: '/offseason/fa-protection' },
  { id: 5, name: 'Free Agency Round 1', description: 'Sign available players', route: '/offseason/free-agency/1' },
  { id: 6, name: 'Free Agency Round 2', description: 'Second wave signings', route: '/offseason/free-agency/2' },
  { id: 7, name: 'Free Agency Round 3', description: 'Final free agent signings', route: '/offseason/free-agency/3' },
  { id: 8, name: 'Draft', description: 'Select prospects for farm system', route: '/offseason/draft' },
  { id: 9, name: 'Trade Period', description: 'Make trades with other teams', route: '/offseason/trades' },
  { id: 10, name: 'Spring Training', description: 'Set opening day roster', route: '/offseason/spring-training' },
  { id: 11, name: 'Schedule Release', description: 'View new season schedule', route: '/offseason/schedule' },
];

export default function OffseasonHub({
  currentPhase,
  completedPhases,
  onNavigate,
}: OffseasonHubProps) {
  const phasesWithStatus = useMemo(() => {
    return OFFSEASON_PHASES.map((phase) => ({
      ...phase,
      isCompleted: completedPhases.includes(phase.id),
      isCurrent: phase.id === currentPhase,
      isLocked: phase.id > Math.max(...completedPhases, 0) + 1,
    }));
  }, [completedPhases, currentPhase]);

  const handlePhaseClick = (phase: typeof phasesWithStatus[0]) => {
    if (phase.isLocked) return;
    onNavigate(phase.route);
  };

  const progress = Math.round((completedPhases.length / OFFSEASON_PHASES.length) * 100);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Offseason</h1>
        <p style={styles.subtitle}>Complete each phase to prepare for next season</p>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <span style={styles.progressLabel}>Progress</span>
          <span style={styles.progressValue}>{progress}%</span>
        </div>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${progress}%`,
            }}
          />
        </div>
        <div style={styles.progressStats}>
          <span>{completedPhases.length} of {OFFSEASON_PHASES.length} phases complete</span>
        </div>
      </div>

      {/* Phases List */}
      <div style={styles.phasesList}>
        {phasesWithStatus.map((phase) => (
          <div
            key={phase.id}
            style={{
              ...styles.phaseCard,
              ...(phase.isCurrent ? styles.currentPhase : {}),
              ...(phase.isCompleted ? styles.completedPhase : {}),
              ...(phase.isLocked ? styles.lockedPhase : {}),
              cursor: phase.isLocked ? 'not-allowed' : 'pointer',
            }}
            onClick={() => handlePhaseClick(phase)}
          >
            {/* Phase Number/Status */}
            <div style={styles.phaseStatus}>
              {phase.isCompleted ? (
                <span style={styles.checkmark}>✓</span>
              ) : phase.isLocked ? (
                <span style={styles.lockIcon}>🔒</span>
              ) : (
                <span style={styles.phaseNumber}>{phase.id}</span>
              )}
            </div>

            {/* Phase Info */}
            <div style={styles.phaseInfo}>
              <div style={styles.phaseName}>{phase.name}</div>
              <div style={styles.phaseDescription}>{phase.description}</div>
            </div>

            {/* Arrow */}
            {!phase.isLocked && (
              <div style={styles.arrow}>→</div>
            )}

            {/* Current Indicator */}
            {phase.isCurrent && (
              <div style={styles.currentBadge}>CURRENT</div>
            )}
          </div>
        ))}
      </div>
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
  title: {
    margin: '0 0 8px 0',
    fontSize: '2.5rem',
    fontWeight: 900,
    color: '#fff',
  },
  subtitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#94a3b8',
  },
  progressSection: {
    maxWidth: '600px',
    margin: '0 auto 40px',
    padding: '20px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  progressLabel: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  progressValue: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#22c55e',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#0f172a',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  progressStats: {
    marginTop: '12px',
    textAlign: 'center',
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  phasesList: {
    maxWidth: '600px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  phaseCard: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    transition: 'all 0.15s ease',
  },
  currentPhase: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3b82f6',
  },
  completedPhase: {
    opacity: 0.7,
  },
  lockedPhase: {
    opacity: 0.5,
    backgroundColor: '#0f172a',
  },
  phaseStatus: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    backgroundColor: '#0f172a',
    marginRight: '16px',
  },
  phaseNumber: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#3b82f6',
  },
  checkmark: {
    fontSize: '1.25rem',
    color: '#22c55e',
  },
  lockIcon: {
    fontSize: '1rem',
  },
  phaseInfo: {
    flex: 1,
  },
  phaseName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '4px',
  },
  phaseDescription: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  arrow: {
    fontSize: '1.25rem',
    color: '#64748b',
    marginLeft: '16px',
  },
  currentBadge: {
    position: 'absolute',
    top: '-8px',
    right: '16px',
    padding: '4px 12px',
    backgroundColor: '#3b82f6',
    borderRadius: '100px',
    fontSize: '0.625rem',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.1em',
  },
};
