/**
 * Offseason Flow Component
 *
 * Guides users through the offseason phases with
 * interactive ceremonies, reveals, and confirmations.
 *
 * Per OFFSEASON_SYSTEM_SPEC.md v3, phases are:
 * 1. Season End Processing
 * 2. Awards Ceremony
 * 3. True Value Recalibration
 * 4. Contraction Check
 * 5. Retirement & Legacy
 * 6. Free Agency
 * 7. Draft
 * 8. Farm Reconciliation
 * 9. Chemistry Rebalancing
 * 10. Offseason Trades
 * 11. New Season Prep
 *
 * @see OFFSEASON_SYSTEM_SPEC.md
 */

import React, { useState, useCallback } from 'react';
import {
  processSeasonEnd,
  createEmptyPreviousSeasonState,
  getSeasonEndSummary,
  type SeasonEndResult,
  type SeasonEndConfig,
} from '../../utils/seasonEndProcessor';

// ============================================
// TYPES
// ============================================

type OffseasonPhase =
  | 'INTRO'
  | 'SEASON_END'
  | 'AWARDS'
  | 'TRUE_VALUE'
  | 'CONTRACTION'
  | 'RETIREMENT'
  | 'FREE_AGENCY'
  | 'DRAFT'
  | 'FARM'
  | 'CHEMISTRY'
  | 'TRADES'
  | 'NEW_SEASON'
  | 'COMPLETE';

interface OffseasonFlowProps {
  seasonId: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface PhaseConfig {
  id: OffseasonPhase;
  name: string;
  emoji: string;
  description: string;
  implemented: boolean;
}

// ============================================
// PHASE CONFIGURATION
// ============================================

const PHASES: PhaseConfig[] = [
  {
    id: 'INTRO',
    name: 'Offseason',
    emoji: '⚾',
    description: 'Begin the offseason process',
    implemented: true,
  },
  {
    id: 'SEASON_END',
    name: 'Season End',
    emoji: '📊',
    description: 'Process final standings and stats',
    implemented: true,
  },
  {
    id: 'AWARDS',
    name: 'Awards Ceremony',
    emoji: '🏆',
    description: 'Present season awards (MVP, Cy Young, etc.)',
    implemented: false,
  },
  {
    id: 'TRUE_VALUE',
    name: 'True Value',
    emoji: '💰',
    description: 'Recalibrate player valuations',
    implemented: false,
  },
  {
    id: 'CONTRACTION',
    name: 'Contraction Check',
    emoji: '🎲',
    description: 'Check for team contraction',
    implemented: false,
  },
  {
    id: 'RETIREMENT',
    name: 'Retirement & Legacy',
    emoji: '👋',
    description: 'Process retirements and hall of fame',
    implemented: false,
  },
  {
    id: 'FREE_AGENCY',
    name: 'Free Agency',
    emoji: '✍️',
    description: 'Handle free agent signings',
    implemented: false,
  },
  {
    id: 'DRAFT',
    name: 'Draft',
    emoji: '🎰',
    description: 'Conduct the annual draft',
    implemented: false,
  },
  {
    id: 'FARM',
    name: 'Farm System',
    emoji: '🌱',
    description: 'Reconcile farm rosters',
    implemented: false,
  },
  {
    id: 'CHEMISTRY',
    name: 'Chemistry',
    emoji: '🤝',
    description: 'Rebalance team chemistry',
    implemented: false,
  },
  {
    id: 'TRADES',
    name: 'Offseason Trades',
    emoji: '🔄',
    description: 'Process offseason trades',
    implemented: false,
  },
  {
    id: 'NEW_SEASON',
    name: 'New Season Prep',
    emoji: '🎉',
    description: 'Prepare for the new season',
    implemented: true,
  },
];

// ============================================
// COMPONENTS
// ============================================

/**
 * Phase progress indicator
 */
function PhaseProgress({ currentPhase }: { currentPhase: OffseasonPhase }) {
  const currentIndex = PHASES.findIndex(p => p.id === currentPhase);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '4px',
      marginBottom: '24px',
    }}>
      {PHASES.filter(p => p.id !== 'INTRO' && p.id !== 'COMPLETE').map((phase, i) => {
        const phaseIndex = i + 1; // Skip INTRO
        const isActive = phase.id === currentPhase;
        const isComplete = currentIndex > phaseIndex;
        const isPending = currentIndex < phaseIndex;

        return (
          <div
            key={phase.id}
            title={phase.name}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              backgroundColor: isActive ? '#3b82f6' :
                              isComplete ? '#22c55e' :
                              '#374151',
              color: '#fff',
              opacity: isPending && !phase.implemented ? 0.3 : 1,
              transition: 'all 0.3s ease',
            }}
          >
            {isComplete ? '✓' : phase.emoji}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Introduction phase
 */
function IntroPhase({ onStart }: { onStart: () => void }) {
  return (
    <div style={styles.phaseContent}>
      <div style={styles.emoji}>⚾</div>
      <h2 style={styles.title}>Offseason Begins</h2>
      <p style={styles.description}>
        The season is over! Time to process awards, free agency, and prepare for next year.
      </p>

      <div style={styles.phaseList}>
        <div style={styles.phaseListTitle}>Offseason Phases:</div>
        {PHASES.filter(p => p.id !== 'INTRO' && p.id !== 'COMPLETE').map(phase => (
          <div key={phase.id} style={{
            ...styles.phaseListItem,
            opacity: phase.implemented ? 1 : 0.5,
          }}>
            <span style={styles.phaseEmoji}>{phase.emoji}</span>
            <span style={styles.phaseName}>{phase.name}</span>
            {!phase.implemented && (
              <span style={styles.comingSoon}>Coming Soon</span>
            )}
          </div>
        ))}
      </div>

      <button onClick={onStart} style={styles.primaryButton}>
        Begin Offseason →
      </button>
    </div>
  );
}

/**
 * Season End phase - processes stats
 */
function SeasonEndPhase({
  seasonId,
  onComplete,
  result,
}: {
  seasonId: string;
  onComplete: (result: SeasonEndResult) => void;
  result: SeasonEndResult | null;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localResult, setLocalResult] = useState<SeasonEndResult | null>(result);

  const runProcessing = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const config: SeasonEndConfig = {
        seasonId,
        previousSeasonState: createEmptyPreviousSeasonState(),
        playerCareerStats: new Map(),
        seasonAwards: new Map(),
      };

      const processedResult = await processSeasonEnd(config);
      setLocalResult(processedResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, [seasonId]);

  if (isProcessing) {
    return (
      <div style={styles.phaseContent}>
        <div style={styles.spinner}>⏳</div>
        <h2 style={styles.title}>Processing Season...</h2>
        <p style={styles.description}>
          Calculating final standings, stats, and achievements...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.phaseContent}>
        <div style={styles.emoji}>❌</div>
        <h2 style={styles.title}>Error</h2>
        <p style={styles.errorText}>{error}</p>
        <button onClick={runProcessing} style={styles.secondaryButton}>
          Retry
        </button>
      </div>
    );
  }

  if (localResult) {
    const summary = getSeasonEndSummary(localResult);

    return (
      <div style={styles.phaseContent}>
        <div style={styles.emoji}>✅</div>
        <h2 style={styles.title}>Season Complete!</h2>

        <div style={styles.summaryBox}>
          <pre style={styles.summaryText}>{summary}</pre>
        </div>

        <div style={styles.statRow}>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{localResult.playersProcessed}</span>
            <span style={styles.statLabel}>Players</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{localResult.teamsProcessed}</span>
            <span style={styles.statLabel}>Teams</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{localResult.fameEvents.length}</span>
            <span style={styles.statLabel}>Fame Events</span>
          </div>
        </div>

        <button onClick={() => onComplete(localResult)} style={styles.primaryButton}>
          Continue to Awards →
        </button>
      </div>
    );
  }

  return (
    <div style={styles.phaseContent}>
      <div style={styles.emoji}>📊</div>
      <h2 style={styles.title}>Season End Processing</h2>
      <p style={styles.description}>
        Calculate final standings, aggregate career stats, and determine team MVPs.
      </p>

      <button onClick={runProcessing} style={styles.primaryButton}>
        Process Season End
      </button>
    </div>
  );
}

/**
 * Placeholder phase for unimplemented phases
 */
function PlaceholderPhase({
  phase,
  onContinue,
}: {
  phase: PhaseConfig;
  onContinue: () => void;
}) {
  return (
    <div style={styles.phaseContent}>
      <div style={styles.emoji}>{phase.emoji}</div>
      <h2 style={styles.title}>{phase.name}</h2>
      <p style={styles.description}>{phase.description}</p>

      <div style={styles.placeholder}>
        <span style={styles.placeholderIcon}>🚧</span>
        <span style={styles.placeholderText}>
          This phase is not yet implemented.
          <br />
          Full implementation coming soon!
        </span>
      </div>

      <button onClick={onContinue} style={styles.primaryButton}>
        Skip to Next Phase →
      </button>
    </div>
  );
}

/**
 * New Season Prep phase
 */
function NewSeasonPhase({ onComplete }: { onComplete: () => void }) {
  return (
    <div style={styles.phaseContent}>
      <div style={styles.emoji}>🎉</div>
      <h2 style={styles.title}>Ready for Next Season!</h2>
      <p style={styles.description}>
        The offseason is complete. Your team is ready for the new season!
      </p>

      <div style={styles.checklist}>
        <div style={styles.checkItem}>✓ Stats aggregated to careers</div>
        <div style={styles.checkItem}>✓ Team MVPs determined</div>
        <div style={styles.checkItem}>✓ Fame events processed</div>
        <div style={styles.checkItem}>○ Awards ceremony (coming soon)</div>
        <div style={styles.checkItem}>○ Free agency (coming soon)</div>
        <div style={styles.checkItem}>○ Draft (coming soon)</div>
      </div>

      <button onClick={onComplete} style={styles.primaryButton}>
        Start New Season! 🎉
      </button>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function OffseasonFlow({ seasonId, onComplete, onCancel }: OffseasonFlowProps) {
  const [currentPhase, setCurrentPhase] = useState<OffseasonPhase>('INTRO');
  const [seasonEndResult, setSeasonEndResult] = useState<SeasonEndResult | null>(null);

  const advancePhase = useCallback(() => {
    const currentIndex = PHASES.findIndex(p => p.id === currentPhase);
    if (currentIndex < PHASES.length - 1) {
      setCurrentPhase(PHASES[currentIndex + 1].id);
    }
  }, [currentPhase]);

  const handleSeasonEndComplete = useCallback((result: SeasonEndResult) => {
    setSeasonEndResult(result);
    advancePhase();
  }, [advancePhase]);

  const getCurrentPhaseConfig = () => PHASES.find(p => p.id === currentPhase);

  const renderPhase = () => {
    switch (currentPhase) {
      case 'INTRO':
        return <IntroPhase onStart={advancePhase} />;

      case 'SEASON_END':
        return (
          <SeasonEndPhase
            seasonId={seasonId}
            onComplete={handleSeasonEndComplete}
            result={seasonEndResult}
          />
        );

      case 'AWARDS':
      case 'TRUE_VALUE':
      case 'CONTRACTION':
      case 'RETIREMENT':
      case 'FREE_AGENCY':
      case 'DRAFT':
      case 'FARM':
      case 'CHEMISTRY':
      case 'TRADES':
        const config = getCurrentPhaseConfig();
        return config ? (
          <PlaceholderPhase phase={config} onContinue={advancePhase} />
        ) : null;

      case 'NEW_SEASON':
        return <NewSeasonPhase onComplete={onComplete} />;

      case 'COMPLETE':
        return null;

      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onCancel} style={styles.cancelButton}>
          ← Back
        </button>
        <h1 style={styles.headerTitle}>Offseason</h1>
        <div style={{ width: '60px' }} /> {/* Spacer for centering */}
      </div>

      {/* Progress */}
      {currentPhase !== 'INTRO' && currentPhase !== 'COMPLETE' && (
        <PhaseProgress currentPhase={currentPhase} />
      )}

      {/* Phase Content */}
      {renderPhase()}
    </div>
  );
}

// ============================================
// MODAL WRAPPER
// ============================================

interface OffseasonModalProps {
  isOpen: boolean;
  seasonId: string;
  onComplete: () => void;
  onClose: () => void;
}

export function OffseasonModal({ isOpen, seasonId, onComplete, onClose }: OffseasonModalProps) {
  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <OffseasonFlow
          seasonId={seasonId}
          onComplete={onComplete}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    backgroundColor: '#0d1117',
    color: '#e5e7eb',
    padding: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  headerTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#f9fafb',
    margin: 0,
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #374151',
    borderRadius: '6px',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  phaseContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    textAlign: 'center',
    padding: '24px',
  },
  emoji: {
    fontSize: '4rem',
    marginBottom: '16px',
  },
  spinner: {
    fontSize: '4rem',
    marginBottom: '16px',
    animation: 'spin 1s linear infinite',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#f9fafb',
    margin: '0 0 12px 0',
  },
  description: {
    fontSize: '1rem',
    color: '#9ca3af',
    marginBottom: '24px',
    maxWidth: '400px',
  },
  errorText: {
    fontSize: '0.875rem',
    color: '#ef4444',
    marginBottom: '24px',
    padding: '12px',
    backgroundColor: '#ef444420',
    borderRadius: '8px',
  },
  primaryButton: {
    padding: '12px 32px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    padding: '12px 32px',
    backgroundColor: '#374151',
    border: 'none',
    borderRadius: '8px',
    color: '#e5e7eb',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  phaseList: {
    backgroundColor: '#111827',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
    width: '100%',
    maxWidth: '400px',
  },
  phaseListTitle: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '12px',
  },
  phaseListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    borderBottom: '1px solid #1f2937',
  },
  phaseEmoji: {
    fontSize: '1.25rem',
  },
  phaseName: {
    flex: 1,
    fontSize: '0.875rem',
    color: '#d1d5db',
  },
  comingSoon: {
    fontSize: '0.625rem',
    color: '#6b7280',
    padding: '2px 6px',
    backgroundColor: '#1f2937',
    borderRadius: '4px',
  },
  summaryBox: {
    backgroundColor: '#111827',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    width: '100%',
    maxWidth: '500px',
    textAlign: 'left',
  },
  summaryText: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    margin: 0,
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
  },
  statRow: {
    display: 'flex',
    gap: '24px',
    marginBottom: '24px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#111827',
    borderRadius: '8px',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#f9fafb',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '24px',
    backgroundColor: '#1f293720',
    borderRadius: '12px',
    border: '2px dashed #374151',
    marginBottom: '24px',
    maxWidth: '400px',
  },
  placeholderIcon: {
    fontSize: '2rem',
  },
  placeholderText: {
    fontSize: '0.875rem',
    color: '#6b7280',
    textAlign: 'center',
  },
  checklist: {
    backgroundColor: '#111827',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
    width: '100%',
    maxWidth: '300px',
    textAlign: 'left',
  },
  checkItem: {
    padding: '8px 0',
    fontSize: '0.875rem',
    color: '#d1d5db',
    borderBottom: '1px solid #1f2937',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#0d1117',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
};

export default OffseasonFlow;
