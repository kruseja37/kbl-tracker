/**
 * WalkoffCelebration - Displays walkoff victory celebration
 * Per Ralph Framework S-B016
 *
 * Features:
 * - Large "WALKOFF!" banner
 * - Hero name prominently displayed
 * - Fame bonus shown
 * - Play description
 * - Auto-dismiss or tap to continue
 */

import { useEffect, useState, useCallback } from 'react';
import type { WalkoffResult } from '../../utils/walkoffDetector';
import { getWalkoffDescription, getWalkoffFameBonus, isExtraInningsWalkoff } from '../../utils/walkoffDetector';

interface WalkoffCelebrationProps {
  walkoff: WalkoffResult;
  homeTeamName: string;
  homeScore: number;
  awayScore: number;
  onDismiss: () => void;
  autoHideMs?: number;
}

export default function WalkoffCelebration({
  walkoff,
  homeTeamName,
  homeScore,
  awayScore,
  onDismiss,
  autoHideMs = 8000,
}: WalkoffCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const fameBonus = getWalkoffFameBonus(walkoff);
  const description = getWalkoffDescription(walkoff);
  const isExtraInnings = isExtraInningsWalkoff(walkoff);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 500);
  }, [onDismiss]);

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    const timer = setTimeout(handleDismiss, autoHideMs);
    return () => clearTimeout(timer);
  }, [autoHideMs, handleDismiss]);

  if (!walkoff.isWalkoff) return null;

  return (
    <div
      style={{
        ...styles.overlay,
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}
      onClick={handleDismiss}
    >
      <div
        style={{
          ...styles.content,
          transform: isVisible && !isExiting ? 'scale(1)' : 'scale(0.8)',
          opacity: isVisible && !isExiting ? 1 : 0,
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Confetti-like decorations */}
        <div style={styles.confettiContainer}>
          {['🎉', '⚾', '🏆', '⭐', '🔥'].map((emoji, i) => (
            <span
              key={i}
              style={{
                ...styles.confetti,
                left: `${10 + i * 20}%`,
                animationDelay: `${i * 0.1}s`,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>

        {/* Main Banner */}
        <div style={styles.banner}>
          <div style={styles.walkoffText}>WALKOFF!</div>
          {isExtraInnings && (
            <div style={styles.extraInnings}>
              {walkoff.inning}th Inning Thriller!
            </div>
          )}
        </div>

        {/* Hero Section */}
        <div style={styles.heroSection}>
          <div style={styles.heroLabel}>HERO</div>
          <div style={styles.heroName}>{walkoff.heroName}</div>
          <div style={styles.description}>{description}</div>
        </div>

        {/* Score */}
        <div style={styles.scoreSection}>
          <div style={styles.teamName}>{homeTeamName} Win!</div>
          <div style={styles.score}>
            <span style={styles.homeScore}>{homeScore}</span>
            <span style={styles.scoreDash}>-</span>
            <span style={styles.awayScore}>{awayScore}</span>
          </div>
        </div>

        {/* Fame Bonus */}
        <div style={styles.fameSection}>
          <div style={styles.fameIcon}>⭐</div>
          <div style={styles.fameValue}>+{fameBonus} Fame</div>
          <div style={styles.fameRecipient}>for {walkoff.heroName}</div>
        </div>

        {/* Play Type Badge */}
        <div style={styles.playTypeBadge}>
          {getPlayTypeEmoji(walkoff.playType)} {getPlayTypeLabel(walkoff.playType)}
        </div>

        {/* Dismiss Hint */}
        <div style={styles.dismissHint}>Tap anywhere to continue</div>
      </div>
    </div>
  );
}

function getPlayTypeEmoji(playType: string | null): string {
  const emojis: Record<string, string> = {
    HR: '💣',
    HIT: '🏏',
    WALK: '🚶',
    HBP: '💢',
    ERROR: '❌',
    SAC: '🎯',
    OTHER: '⚾',
  };
  return emojis[playType || 'OTHER'];
}

function getPlayTypeLabel(playType: string | null): string {
  const labels: Record<string, string> = {
    HR: 'Walkoff Homer',
    HIT: 'Walkoff Hit',
    WALK: 'Walkoff Walk',
    HBP: 'Walkoff HBP',
    ERROR: 'Walkoff Error',
    SAC: 'Walkoff Sac',
    OTHER: 'Walkoff Winner',
  };
  return labels[playType || 'OTHER'];
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    cursor: 'pointer',
  },
  content: {
    textAlign: 'center',
    maxWidth: '400px',
    padding: '40px 30px',
    position: 'relative',
  },
  confettiContainer: {
    position: 'absolute',
    top: '-20px',
    left: 0,
    right: 0,
    height: '100px',
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  confetti: {
    position: 'absolute',
    fontSize: '2rem',
    animation: 'confettiFall 2s ease-out infinite',
  },
  banner: {
    marginBottom: '30px',
  },
  walkoffText: {
    fontSize: '4rem',
    fontWeight: 900,
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 4px 20px rgba(251, 191, 36, 0.5)',
    letterSpacing: '-0.02em',
  },
  extraInnings: {
    fontSize: '1.25rem',
    color: '#fbbf24',
    marginTop: '8px',
    fontWeight: 600,
  },
  heroSection: {
    marginBottom: '25px',
  },
  heroLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    marginBottom: '8px',
  },
  heroName: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#fff',
    marginBottom: '8px',
  },
  description: {
    fontSize: '1rem',
    color: '#cbd5e1',
  },
  scoreSection: {
    marginBottom: '25px',
    padding: '16px',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: '12px',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
  teamName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#22c55e',
    marginBottom: '8px',
  },
  score: {
    fontSize: '2.5rem',
    fontWeight: 800,
    color: '#fff',
  },
  homeScore: {
    color: '#22c55e',
  },
  scoreDash: {
    margin: '0 12px',
    color: '#64748b',
  },
  awayScore: {
    color: '#94a3b8',
  },
  fameSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '12px 20px',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: '100px',
    marginBottom: '20px',
  },
  fameIcon: {
    fontSize: '1.5rem',
  },
  fameValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#fbbf24',
  },
  fameRecipient: {
    fontSize: '0.875rem',
    color: '#fcd34d',
  },
  playTypeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    borderRadius: '100px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#60a5fa',
    marginBottom: '24px',
  },
  dismissHint: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '20px',
  },
};

// Add keyframes for confetti animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes confettiFall {
    0% {
      transform: translateY(-20px) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(400px) rotate(360deg);
      opacity: 0;
    }
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('#walkoff-styles')) {
  styleSheet.id = 'walkoff-styles';
  document.head.appendChild(styleSheet);
}
