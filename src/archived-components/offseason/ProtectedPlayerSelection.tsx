/**
 * ProtectedPlayerSelection - Protect one player from FA
 * Per Ralph Framework S-E008
 *
 * Features:
 * - Full roster shown for selection
 * - Single selection only
 * - Confirm protection
 */

import { useState } from 'react';

interface RosterPlayer {
  playerId: string;
  playerName: string;
  position: string;
  overall: string;
  age: number;
  salary: number;
  yearsRemaining: number;
}

interface ProtectedPlayerSelectionProps {
  roster: RosterPlayer[];
  teamName: string;
  onProtect: (playerId: string) => void;
  onSkip: () => void;
}

export default function ProtectedPlayerSelection({
  roster,
  teamName,
  onProtect,
  onSkip,
}: ProtectedPlayerSelectionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (playerId: string) => {
    setSelectedId(selectedId === playerId ? null : playerId);
  };

  const handleConfirm = () => {
    if (selectedId) {
      onProtect(selectedId);
    }
  };

  const selectedPlayer = roster.find((p) => p.playerId === selectedId);

  const formatSalary = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.icon}>🛡️</div>
        <h1 style={styles.title}>Protect One Player</h1>
        <p style={styles.subtitle}>
          {teamName} may protect one player from free agency
        </p>
      </div>

      {/* Info Card */}
      <div style={styles.infoCard}>
        <span style={styles.infoIcon}>ℹ️</span>
        <span style={styles.infoText}>
          Protected players cannot be signed by other teams during free agency.
          You may protect one player per offseason.
        </span>
      </div>

      {/* Roster List */}
      <div style={styles.rosterList}>
        {roster.map((player) => (
          <div
            key={player.playerId}
            style={{
              ...styles.playerCard,
              ...(selectedId === player.playerId ? styles.selectedCard : {}),
            }}
            onClick={() => handleSelect(player.playerId)}
          >
            <div style={styles.selectionIndicator}>
              {selectedId === player.playerId ? (
                <span style={styles.checkmark}>✓</span>
              ) : (
                <span style={styles.emptyCircle}>○</span>
              )}
            </div>
            <div style={styles.playerInfo}>
              <span style={styles.playerName}>{player.playerName}</span>
              <span style={styles.playerDetails}>
                {player.position} · {player.overall} · Age {player.age}
              </span>
            </div>
            <div style={styles.contractInfo}>
              <span style={styles.salary}>{formatSalary(player.salary)}</span>
              <span style={styles.years}>
                {player.yearsRemaining} yr{player.yearsRemaining !== 1 ? 's' : ''} left
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Summary */}
      {selectedPlayer && (
        <div style={styles.selectedSummary}>
          <span style={styles.selectedLabel}>Selected:</span>
          <span style={styles.selectedName}>{selectedPlayer.playerName}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div style={styles.buttonRow}>
        <button style={styles.skipButton} onClick={onSkip}>
          Skip Protection
        </button>
        <button
          style={{
            ...styles.confirmButton,
            ...(selectedId ? {} : styles.disabledButton),
          }}
          onClick={handleConfirm}
          disabled={!selectedId}
        >
          Protect Player
        </button>
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
    marginBottom: '24px',
  },
  icon: {
    fontSize: '4rem',
    marginBottom: '16px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '2rem',
    fontWeight: 900,
    color: '#fff',
  },
  subtitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#94a3b8',
  },
  infoCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    maxWidth: '600px',
    margin: '0 auto 32px',
    padding: '16px 20px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '12px',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  infoIcon: {
    fontSize: '1.25rem',
    flexShrink: 0,
  },
  infoText: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  rosterList: {
    maxWidth: '600px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  playerCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  selectedCard: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  selectionIndicator: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '16px',
  },
  checkmark: {
    fontSize: '1.5rem',
    color: '#22c55e',
    fontWeight: 700,
  },
  emptyCircle: {
    fontSize: '1.25rem',
    color: '#64748b',
  },
  playerInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  playerName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#fff',
  },
  playerDetails: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
  },
  contractInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px',
  },
  salary: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#fbbf24',
  },
  years: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  selectedSummary: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    margin: '24px auto',
    padding: '16px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: '100px',
    maxWidth: '400px',
  },
  selectedLabel: {
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  selectedName: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#22c55e',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginTop: '32px',
  },
  skipButton: {
    padding: '16px 32px',
    backgroundColor: 'transparent',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  disabledButton: {
    background: '#334155',
    color: '#64748b',
    cursor: 'not-allowed',
  },
};
