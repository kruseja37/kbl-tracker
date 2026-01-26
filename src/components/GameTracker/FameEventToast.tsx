/**
 * FameEventToast - In-game Fame event notifications
 * Per Ralph Framework S-B017
 *
 * Features:
 * - Toast appears when Fame events occur during game
 * - Shows event type and fame value
 * - Auto-dismisses after 3 seconds
 * - Stacks multiple toasts
 */

import { useEffect, useState, useCallback } from 'react';
import type { FameEvent } from '../../types/game';
import { FAME_EVENT_LABELS } from '../../types/game';

interface FameEventToastProps {
  events: FameEvent[];
  onDismiss: (eventId: string) => void;
  maxVisible?: number;
  autoHideMs?: number;
}

export default function FameEventToast({
  events,
  onDismiss,
  maxVisible = 3,
  autoHideMs = 4000,
}: FameEventToastProps) {
  // Only show the most recent toasts
  const visibleEvents = events.slice(-maxVisible);

  if (visibleEvents.length === 0) return null;

  return (
    <div style={styles.container}>
      {visibleEvents.map((event, index) => (
        <SingleToast
          key={event.id}
          event={event}
          onDismiss={() => onDismiss(event.id)}
          autoHideMs={autoHideMs + index * 500} // Stagger dismissal
          index={index}
        />
      ))}
    </div>
  );
}

// Individual toast component
interface SingleToastProps {
  event: FameEvent;
  onDismiss: () => void;
  autoHideMs: number;
  index: number;
}

function SingleToast({ event, onDismiss, autoHideMs, index }: SingleToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(onDismiss, 200); // Wait for exit animation
  }, [onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    const timer = setTimeout(handleDismiss, autoHideMs);
    return () => clearTimeout(timer);
  }, [autoHideMs, handleDismiss]);

  const isBonus = event.fameType === 'bonus';
  const icon = isBonus ? '⭐' : '💀';
  const label = FAME_EVENT_LABELS[event.eventType] || event.eventType;

  return (
    <div
      style={{
        ...styles.toast,
        ...(isBonus ? styles.bonusToast : styles.bonerToast),
        transform: `translateY(${index * -10}px)`,
        opacity: isExiting ? 0 : 1,
        animation: isExiting ? 'slideOut 0.2s ease-in' : 'slideIn 0.3s ease-out',
      }}
      onClick={handleDismiss}
    >
      {/* Icon */}
      <span style={styles.icon}>{icon}</span>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.title}>
          {isBonus ? 'Fame Bonus!' : 'Fame Boner'}
        </div>
        <div style={styles.playerName}>{event.playerName}</div>
        <div style={styles.eventLabel}>{label}</div>
      </div>

      {/* Fame Value */}
      <div
        style={{
          ...styles.fameValue,
          color: isBonus ? '#22c55e' : '#ef4444',
        }}
      >
        {event.fameValue > 0 ? '+' : ''}
        {event.fameValue}
      </div>

      {/* Close hint */}
      <div style={styles.closeHint}>tap to dismiss</div>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 1100,
    display: 'flex',
    flexDirection: 'column-reverse',
    gap: '8px',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    maxWidth: '320px',
    minWidth: '280px',
  },
  bonusToast: {
    backgroundColor: '#0f172a',
    borderLeft: '4px solid #22c55e',
  },
  bonerToast: {
    backgroundColor: '#0f172a',
    borderLeft: '4px solid #ef4444',
  },
  icon: {
    fontSize: '1.75rem',
    lineHeight: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  playerName: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#fff',
    marginTop: '2px',
  },
  eventLabel: {
    fontSize: '0.8125rem',
    color: '#cbd5e1',
    marginTop: '2px',
  },
  fameValue: {
    fontSize: '1.5rem',
    fontWeight: 800,
  },
  closeHint: {
    position: 'absolute',
    bottom: '4px',
    right: '8px',
    fontSize: '0.625rem',
    color: '#475569',
  },
};

// Add keyframes for animations via style tag (in a real app this would be in CSS)
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('#fame-toast-styles')) {
  styleSheet.id = 'fame-toast-styles';
  document.head.appendChild(styleSheet);
}
