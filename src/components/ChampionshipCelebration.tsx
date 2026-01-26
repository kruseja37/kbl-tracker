/**
 * ChampionshipCelebration - Championship victory celebration
 * Per Ralph Framework S-C015
 *
 * Features:
 * - Champion team prominently displayed
 * - Series MVP shown
 * - Saves to franchise history
 */

import { useEffect, useState, useCallback } from 'react';

interface ChampionshipData {
  year: number;
  teamId: string;
  teamName: string;
  teamColor?: string;
  opponentId: string;
  opponentName: string;
  seriesResult: string; // e.g., "4-2"
  mvp: {
    playerId: string;
    playerName: string;
    statLine: string;
  };
  championships: number; // Total franchise championships
}

interface ChampionshipCelebrationProps {
  data: ChampionshipData;
  onDismiss: () => void;
  onSaveToHistory?: () => void;
}

export default function ChampionshipCelebration({
  data,
  onDismiss,
  onSaveToHistory,
}: ChampionshipCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Stop confetti after a while
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = useCallback(() => {
    onSaveToHistory?.();
    onDismiss();
  }, [onSaveToHistory, onDismiss]);

  const getOrdinalSuffix = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div style={styles.overlay}>
      {/* Confetti */}
      {showConfetti && (
        <div style={styles.confettiContainer}>
          {Array.from({ length: 50 }).map((_, i) => (
            <span
              key={i}
              style={{
                ...styles.confetti,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                backgroundColor: ['#fbbf24', '#22c55e', '#3b82f6', '#ef4444', '#8b5cf6'][
                  Math.floor(Math.random() * 5)
                ],
              }}
            />
          ))}
        </div>
      )}

      <div
        style={{
          ...styles.content,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(0.9)',
        }}
      >
        {/* Trophy */}
        <div style={styles.trophy}>🏆</div>

        {/* Champion Banner */}
        <div style={styles.banner}>
          <div style={styles.year}>{data.year}</div>
          <div style={styles.championTitle}>CHAMPIONS</div>
        </div>

        {/* Team Name */}
        <div style={styles.teamSection}>
          <div
            style={{
              ...styles.teamName,
              color: data.teamColor || '#fbbf24',
            }}
          >
            {data.teamName}
          </div>
          {data.championships > 1 && (
            <div style={styles.dynastyBadge}>
              {getOrdinalSuffix(data.championships)} Championship
            </div>
          )}
        </div>

        {/* Series Result */}
        <div style={styles.seriesSection}>
          <div style={styles.seriesLabel}>defeated</div>
          <div style={styles.opponentName}>{data.opponentName}</div>
          <div style={styles.seriesResult}>{data.seriesResult}</div>
        </div>

        {/* MVP Section */}
        <div style={styles.mvpSection}>
          <div style={styles.mvpLabel}>🌟 Series MVP 🌟</div>
          <div style={styles.mvpName}>{data.mvp.playerName}</div>
          <div style={styles.mvpStats}>{data.mvp.statLine}</div>
        </div>

        {/* Fame Bonus */}
        <div style={styles.fameSection}>
          <div style={styles.fameItem}>
            <span style={styles.fameIcon}>⭐</span>
            <span style={styles.fameText}>+10 Fame to all players</span>
          </div>
          <div style={styles.fameItem}>
            <span style={styles.fameIcon}>👑</span>
            <span style={styles.fameText}>
              +15 Fame to {data.mvp.playerName} (MVP)
            </span>
          </div>
        </div>

        {/* Continue Button */}
        <button style={styles.continueButton} onClick={handleContinue}>
          Continue to Offseason
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3000,
    overflow: 'hidden',
  },
  confettiContainer: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    top: '-20px',
    width: '10px',
    height: '10px',
    borderRadius: '2px',
    animation: 'confettiFall 4s ease-out forwards',
  },
  content: {
    textAlign: 'center',
    padding: '40px',
    transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  trophy: {
    fontSize: '6rem',
    marginBottom: '20px',
    animation: 'pulse 2s infinite',
  },
  banner: {
    marginBottom: '24px',
  },
  year: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#94a3b8',
    letterSpacing: '0.2em',
  },
  championTitle: {
    fontSize: '3.5rem',
    fontWeight: 900,
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '0.15em',
    textShadow: '0 4px 20px rgba(251, 191, 36, 0.5)',
  },
  teamSection: {
    marginBottom: '24px',
  },
  teamName: {
    fontSize: '2.5rem',
    fontWeight: 800,
    marginBottom: '8px',
  },
  dynastyBadge: {
    display: 'inline-block',
    padding: '6px 16px',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderRadius: '100px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fbbf24',
  },
  seriesSection: {
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: '12px',
  },
  seriesLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '8px',
  },
  opponentName: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: '8px',
  },
  seriesResult: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#22c55e',
  },
  mvpSection: {
    marginBottom: '32px',
    padding: '24px',
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
    borderRadius: '12px',
    border: '1px solid rgba(139, 92, 246, 0.3)',
  },
  mvpLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#8b5cf6',
    letterSpacing: '0.1em',
    marginBottom: '12px',
  },
  mvpName: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#fff',
    marginBottom: '8px',
  },
  mvpStats: {
    fontSize: '1rem',
    color: '#cbd5e1',
  },
  fameSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '32px',
    padding: '16px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: '8px',
  },
  fameItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  fameIcon: {
    fontSize: '1.25rem',
  },
  fameText: {
    fontSize: '0.9375rem',
    color: '#22c55e',
    fontWeight: 500,
  },
  continueButton: {
    padding: '16px 48px',
    fontSize: '1.125rem',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    color: '#000',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    transition: 'transform 0.15s ease',
  },
};

// Add keyframes via style tag
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes confettiFall {
    0% {
      transform: translateY(-20px) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(100vh) rotate(720deg);
      opacity: 0;
    }
  }
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('#championship-styles')) {
  styleSheet.id = 'championship-styles';
  document.head.appendChild(styleSheet);
}
