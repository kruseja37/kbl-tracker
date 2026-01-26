/**
 * InningEndSummary - Shows summary at end of each half-inning
 * Per Ralph Framework S-B011
 *
 * Features:
 * - Appears on inning flip (3 outs)
 * - Shows half-inning stats (R, H, LOB)
 * - Auto-dismisses after 3 seconds
 */

import { useEffect, useState } from 'react';
import type { HalfInning } from '../../types/game';

interface InningEndSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  inning: number;
  halfInning: HalfInning;
  teamName: string;
  runs: number;
  hits: number;
  lob: number; // Left on base
  errors?: number;
  autoHideMs?: number;
}

export default function InningEndSummary({
  isOpen,
  onClose,
  inning,
  halfInning,
  teamName,
  runs,
  hits,
  lob,
  errors = 0,
  autoHideMs = 3000,
}: InningEndSummaryProps) {
  const [progress, setProgress] = useState(100);

  // Auto-hide timer with progress bar
  useEffect(() => {
    if (!isOpen || autoHideMs <= 0) return;

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / autoHideMs) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        onClose();
      }
    }, 50);

    return () => clearInterval(timer);
  }, [isOpen, autoHideMs, onClose]);

  // Reset progress when opening
  useEffect(() => {
    if (isOpen) setProgress(100);
  }, [isOpen]);

  if (!isOpen) return null;

  const inningLabel = halfInning === 'TOP' ? `Top ${inning}` : `Bottom ${inning}`;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.inningLabel}>End of {inningLabel}</span>
          <button style={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Team Name */}
        <div style={styles.teamName}>{teamName}</div>

        {/* Stats Grid */}
        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{runs}</div>
            <div style={styles.statLabel}>RUNS</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{hits}</div>
            <div style={styles.statLabel}>HITS</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{lob}</div>
            <div style={styles.statLabel}>LOB</div>
          </div>
          {errors > 0 && (
            <div style={{ ...styles.statBox, ...styles.errorBox }}>
              <div style={styles.statValue}>{errors}</div>
              <div style={styles.statLabel}>ERRORS</div>
            </div>
          )}
        </div>

        {/* Summary Line */}
        <div style={styles.summaryLine}>
          {runs === 0 && hits === 0 && (
            <span style={styles.quickInning}>Quick inning!</span>
          )}
          {runs >= 3 && (
            <span style={styles.bigInning}>Big inning!</span>
          )}
        </div>

        {/* Progress Bar */}
        <div style={styles.progressContainer}>
          <div
            style={{
              ...styles.progressBar,
              width: `${progress}%`,
            }}
          />
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out',
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '1.5rem',
    minWidth: '280px',
    maxWidth: '400px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    animation: 'slideIn 0.3s ease-out',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  inningLabel: {
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
  teamName: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#fff',
    textAlign: 'center',
    marginBottom: '1rem',
  },
  statsGrid: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  },
  statBox: {
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    textAlign: 'center',
    minWidth: '60px',
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#fff',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '0.625rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '0.25rem',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
  },
  summaryLine: {
    textAlign: 'center',
    marginBottom: '1rem',
    minHeight: '1.5rem',
  },
  quickInning: {
    fontSize: '0.875rem',
    color: '#22c55e',
    fontWeight: 600,
  },
  bigInning: {
    fontSize: '0.875rem',
    color: '#fbbf24',
    fontWeight: 600,
  },
  progressContainer: {
    height: '3px',
    backgroundColor: '#334155',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.05s linear',
  },
};
