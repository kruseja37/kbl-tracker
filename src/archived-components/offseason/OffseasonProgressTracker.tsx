/**
 * OffseasonProgressTracker - Compact progress indicator
 * Per Ralph Framework S-E003
 *
 * Features:
 * - Progress bar showing completion
 * - Completed phases get checkmarks
 * - Remaining phases grayed out
 * - Compact for sidebar use
 */

interface OffseasonProgressTrackerProps {
  completedPhases: number[];
  totalPhases?: number;
}

const PHASE_NAMES = [
  'Awards',
  'EOS Ratings',
  'Retirements',
  'Protection',
  'FA Round 1',
  'FA Round 2',
  'FA Round 3',
  'Draft',
  'Trades',
  'Spring Training',
  'Schedule',
];

export default function OffseasonProgressTracker({
  completedPhases,
  totalPhases = 11,
}: OffseasonProgressTrackerProps) {
  const progress = Math.round((completedPhases.length / totalPhases) * 100);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>Offseason Progress</span>
        <span style={styles.percentage}>{progress}%</span>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressBar}>
        <div
          style={{
            ...styles.progressFill,
            width: `${progress}%`,
          }}
        />
      </div>

      {/* Phase List */}
      <div style={styles.phaseList}>
        {PHASE_NAMES.map((name, index) => {
          const phaseNumber = index + 1;
          const isCompleted = completedPhases.includes(phaseNumber);
          const isPending = !isCompleted;

          return (
            <div
              key={phaseNumber}
              style={{
                ...styles.phaseItem,
                ...(isPending ? styles.pendingPhase : {}),
              }}
            >
              <span style={styles.phaseIndicator}>
                {isCompleted ? (
                  <span style={styles.checkmark}>✓</span>
                ) : (
                  <span style={styles.phaseNumber}>{phaseNumber}</span>
                )}
              </span>
              <span
                style={{
                  ...styles.phaseName,
                  ...(isCompleted ? styles.completedName : {}),
                }}
              >
                {name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div style={styles.summary}>
        {completedPhases.length} of {totalPhases} complete
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #334155',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  percentage: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#22c55e',
  },
  progressBar: {
    height: '6px',
    backgroundColor: '#0f172a',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '16px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  phaseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '12px',
  },
  phaseItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  pendingPhase: {
    opacity: 0.5,
  },
  phaseIndicator: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    backgroundColor: '#0f172a',
    fontSize: '0.6875rem',
  },
  phaseNumber: {
    color: '#64748b',
    fontWeight: 600,
  },
  checkmark: {
    color: '#22c55e',
    fontWeight: 700,
  },
  phaseName: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  completedName: {
    color: '#e2e8f0',
    textDecoration: 'line-through',
    opacity: 0.7,
  },
  summary: {
    textAlign: 'center',
    fontSize: '0.6875rem',
    color: '#64748b',
    paddingTop: '8px',
    borderTop: '1px solid #334155',
  },
};
