/**
 * PitcherExitPrompt - Prompts user when pitcher reaches fatigue thresholds
 * Per Ralph Framework S-B012
 *
 * Features:
 * - Triggers at pitch count thresholds (85, 100, 115)
 * - Shows current pitch count and stats
 * - Options to keep pitcher or make change
 * - Non-blocking (can be dismissed)
 */

import { useMemo } from 'react';

interface PitcherExitPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onKeepIn: () => void;
  onChangePitcher: () => void;
  pitcherName: string;
  pitchCount: number;
  // Game stats for context
  ip: string; // e.g., "5.2"
  hits: number;
  runs: number;
  strikeouts: number;
  walks: number;
}

// Fatigue thresholds
const THRESHOLDS = {
  MONITOR: 85,   // Yellow - getting tired
  CAUTION: 100,  // Orange - should consider change
  DANGER: 115,   // Red - definitely pull
};

export default function PitcherExitPrompt({
  isOpen,
  onClose,
  onKeepIn,
  onChangePitcher,
  pitcherName,
  pitchCount,
  ip,
  hits,
  runs,
  strikeouts,
  walks,
}: PitcherExitPromptProps) {
  // Determine fatigue level
  const fatigueLevel = useMemo(() => {
    if (pitchCount >= THRESHOLDS.DANGER) return 'danger';
    if (pitchCount >= THRESHOLDS.CAUTION) return 'caution';
    if (pitchCount >= THRESHOLDS.MONITOR) return 'monitor';
    return 'normal';
  }, [pitchCount]);

  const fatigueColors = {
    normal: { bg: '#22c55e', text: '#fff', label: 'Fresh' },
    monitor: { bg: '#eab308', text: '#000', label: 'Getting Tired' },
    caution: { bg: '#f97316', text: '#fff', label: 'Fatigued' },
    danger: { bg: '#ef4444', text: '#fff', label: 'Exhausted' },
  };

  const colors = fatigueColors[fatigueLevel];

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerIcon}>&#9918;</span>
          <span style={styles.headerText}>Pitcher Check</span>
          <button style={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Pitcher Name */}
        <div style={styles.pitcherName}>{pitcherName}</div>

        {/* Pitch Count Display */}
        <div style={styles.pitchCountContainer}>
          <div
            style={{
              ...styles.pitchCountBadge,
              backgroundColor: colors.bg,
              color: colors.text,
            }}
          >
            <span style={styles.pitchCountValue}>{pitchCount}</span>
            <span style={styles.pitchCountLabel}>PITCHES</span>
          </div>
          <div
            style={{
              ...styles.fatigueLabel,
              color: colors.bg,
            }}
          >
            {colors.label}
          </div>
        </div>

        {/* Pitch Count Bar */}
        <div style={styles.pitchBar}>
          <div
            style={{
              ...styles.pitchBarFill,
              width: `${Math.min(100, (pitchCount / 120) * 100)}%`,
              backgroundColor: colors.bg,
            }}
          />
          {/* Threshold markers */}
          <div style={{ ...styles.thresholdMarker, left: `${(85 / 120) * 100}%` }} />
          <div style={{ ...styles.thresholdMarker, left: `${(100 / 120) * 100}%` }} />
          <div style={{ ...styles.thresholdMarker, left: `${(115 / 120) * 100}%` }} />
        </div>

        {/* Game Stats */}
        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{ip}</span>
            <span style={styles.statLabel}>IP</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{hits}</span>
            <span style={styles.statLabel}>H</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{runs}</span>
            <span style={styles.statLabel}>R</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{strikeouts}</span>
            <span style={styles.statLabel}>K</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{walks}</span>
            <span style={styles.statLabel}>BB</span>
          </div>
        </div>

        {/* Prompt Message */}
        <div style={styles.promptMessage}>
          {fatigueLevel === 'danger' && (
            <span style={{ color: '#ef4444' }}>
              Pitcher is exhausted. Consider making a change.
            </span>
          )}
          {fatigueLevel === 'caution' && (
            <span style={{ color: '#f97316' }}>
              Pitcher is showing fatigue. Monitor closely.
            </span>
          )}
          {fatigueLevel === 'monitor' && (
            <span style={{ color: '#eab308' }}>
              Pitch count is climbing. Stay alert.
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div style={styles.buttonRow}>
          <button style={styles.keepButton} onClick={onKeepIn}>
            Keep In
          </button>
          <button style={styles.changeButton} onClick={onChangePitcher}>
            Make Change
          </button>
        </div>
      </div>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '1.5rem',
    width: '340px',
    maxWidth: '90vw',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  headerIcon: {
    fontSize: '1.25rem',
  },
  headerText: {
    flex: 1,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0',
    lineHeight: 1,
  },
  pitcherName: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#fff',
    textAlign: 'center',
    marginBottom: '1rem',
  },
  pitchCountContainer: {
    textAlign: 'center',
    marginBottom: '0.75rem',
  },
  pitchCountBadge: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
  },
  pitchCountValue: {
    fontSize: '2.5rem',
    fontWeight: 800,
    lineHeight: 1,
  },
  pitchCountLabel: {
    fontSize: '0.625rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    marginTop: '0.25rem',
    opacity: 0.8,
  },
  fatigueLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    marginTop: '0.5rem',
  },
  pitchBar: {
    position: 'relative',
    height: '8px',
    backgroundColor: '#0f172a',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '1rem',
  },
  pitchBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    transition: 'width 0.3s ease',
  },
  thresholdMarker: {
    position: 'absolute',
    top: 0,
    width: '2px',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '1rem',
    padding: '0.75rem',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#fff',
  },
  statLabel: {
    fontSize: '0.625rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: '0.125rem',
  },
  promptMessage: {
    textAlign: 'center',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    minHeight: '1.25rem',
  },
  buttonRow: {
    display: 'flex',
    gap: '0.75rem',
  },
  keepButton: {
    flex: 1,
    padding: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    backgroundColor: '#334155',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  changeButton: {
    flex: 1,
    padding: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
