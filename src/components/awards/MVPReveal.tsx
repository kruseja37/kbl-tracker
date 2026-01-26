/**
 * MVPReveal - Dramatic MVP announcement
 * Per Ralph Framework S-D006, S-D007
 *
 * Features:
 * - Build-up display
 * - Winner revealed with animation
 * - WAR breakdown (bWAR, fWAR, rWAR)
 * - +10 Fame bonus shown
 */

import { useState, useEffect } from 'react';

interface MVPData {
  playerId: string;
  playerName: string;
  teamName: string;
  position: string;
  totalWar: number;
  bwar: number;
  fwar: number;
  rwar: number;
  seasonStats: {
    avg: number;
    hr: number;
    rbi: number;
    runs: number;
    sb: number;
  };
}

interface MVPRevealProps {
  winner: MVPData;
  onContinue: () => void;
  onPlayerClick?: (playerId: string) => void;
}

export default function MVPReveal({
  winner,
  onContinue,
  onPlayerClick,
}: MVPRevealProps) {
  const [phase, setPhase] = useState<'buildup' | 'reveal' | 'stats'>('buildup');

  useEffect(() => {
    // Buildup phase
    const timer1 = setTimeout(() => setPhase('reveal'), 2000);
    // Stats phase
    const timer2 = setTimeout(() => setPhase('stats'), 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const formatAvg = (avg: number): string => {
    return avg.toFixed(3).replace(/^0/, '');
  };

  return (
    <div style={styles.container}>
      {/* Build-up Phase */}
      {phase === 'buildup' && (
        <div style={styles.buildupContainer}>
          <div style={styles.buildupText}>And the MVP is...</div>
          <div style={styles.drumroll}>🥁🥁🥁</div>
        </div>
      )}

      {/* Reveal Phase */}
      {(phase === 'reveal' || phase === 'stats') && (
        <div style={styles.revealContainer}>
          {/* Trophy */}
          <div style={styles.trophy}>🏆</div>

          {/* MVP Label */}
          <div style={styles.mvpLabel}>MOST VALUABLE PLAYER</div>

          {/* Winner Name */}
          <div
            style={styles.winnerName}
            onClick={() => onPlayerClick?.(winner.playerId)}
          >
            {winner.playerName}
          </div>

          {/* Team & Position */}
          <div style={styles.winnerInfo}>
            {winner.teamName} • {winner.position}
          </div>

          {/* Stats (after reveal) */}
          {phase === 'stats' && (
            <>
              {/* WAR Breakdown */}
              <div style={styles.warSection}>
                <div style={styles.warTotal}>
                  <span style={styles.warValue}>{winner.totalWar.toFixed(1)}</span>
                  <span style={styles.warLabel}>Total WAR</span>
                </div>
                <div style={styles.warBreakdown}>
                  <div style={styles.warComponent}>
                    <span style={styles.warCompValue}>{winner.bwar.toFixed(1)}</span>
                    <span style={styles.warCompLabel}>bWAR</span>
                  </div>
                  <div style={styles.warComponent}>
                    <span style={styles.warCompValue}>{winner.fwar.toFixed(1)}</span>
                    <span style={styles.warCompLabel}>fWAR</span>
                  </div>
                  <div style={styles.warComponent}>
                    <span style={styles.warCompValue}>{winner.rwar.toFixed(1)}</span>
                    <span style={styles.warCompLabel}>rWAR</span>
                  </div>
                </div>
              </div>

              {/* Season Stats */}
              <div style={styles.seasonStats}>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>
                    {formatAvg(winner.seasonStats.avg)}
                  </span>
                  <span style={styles.statLabel}>AVG</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{winner.seasonStats.hr}</span>
                  <span style={styles.statLabel}>HR</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{winner.seasonStats.rbi}</span>
                  <span style={styles.statLabel}>RBI</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{winner.seasonStats.runs}</span>
                  <span style={styles.statLabel}>R</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{winner.seasonStats.sb}</span>
                  <span style={styles.statLabel}>SB</span>
                </div>
              </div>

              {/* Fame Bonus */}
              <div style={styles.fameBonus}>
                <span style={styles.fameIcon}>⭐</span>
                <span style={styles.fameText}>+10 Fame</span>
              </div>

              {/* Continue Button */}
              <button style={styles.continueButton} onClick={onContinue}>
                Continue to Cy Young Award
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  buildupContainer: {
    textAlign: 'center',
  },
  buildupText: {
    fontSize: '2rem',
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: '24px',
    animation: 'pulse 1s infinite',
  },
  drumroll: {
    fontSize: '3rem',
    letterSpacing: '0.5em',
    animation: 'shake 0.1s infinite',
  },
  revealContainer: {
    textAlign: 'center',
    maxWidth: '600px',
    width: '100%',
  },
  trophy: {
    fontSize: '6rem',
    marginBottom: '24px',
    animation: 'bounce 0.5s ease',
  },
  mvpLabel: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#fbbf24',
    letterSpacing: '0.3em',
    marginBottom: '16px',
  },
  winnerName: {
    fontSize: '3rem',
    fontWeight: 900,
    color: '#fff',
    marginBottom: '8px',
    cursor: 'pointer',
    textShadow: '0 4px 20px rgba(251, 191, 36, 0.3)',
  },
  winnerInfo: {
    fontSize: '1.25rem',
    color: '#94a3b8',
    marginBottom: '32px',
  },
  warSection: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
  warTotal: {
    marginBottom: '16px',
  },
  warValue: {
    display: 'block',
    fontSize: '3rem',
    fontWeight: 900,
    color: '#22c55e',
  },
  warLabel: {
    fontSize: '0.875rem',
    color: '#22c55e',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  warBreakdown: {
    display: 'flex',
    justifyContent: 'center',
    gap: '32px',
  },
  warComponent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  warCompValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  warCompLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  seasonStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  statLabel: {
    fontSize: '0.6875rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  fameBonus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: '100px',
    marginBottom: '32px',
  },
  fameIcon: {
    fontSize: '1.5rem',
  },
  fameText: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#fbbf24',
  },
  continueButton: {
    padding: '16px 48px',
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

// Add keyframes
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-2px); }
    75% { transform: translateX(2px); }
  }
  @keyframes bounce {
    0% { transform: scale(0); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('#mvp-reveal-styles')) {
  styleSheet.id = 'mvp-reveal-styles';
  document.head.appendChild(styleSheet);
}
