/**
 * GameSetupModal - Configure matchup before starting a game
 * Per S-B003
 */

import { useState } from 'react';
import { getAllTeams, type TeamData } from '../data/playerDatabase';

interface GameSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (awayTeamId: string, homeTeamId: string) => void;
}

export default function GameSetupModal({
  isOpen,
  onClose,
  onConfirm,
}: GameSetupModalProps) {
  const teams = getAllTeams();
  const [awayTeamId, setAwayTeamId] = useState<string>('');
  const [homeTeamId, setHomeTeamId] = useState<string>('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (awayTeamId && homeTeamId) {
      onConfirm(awayTeamId, homeTeamId);
    }
  };

  const canConfirm = awayTeamId && homeTeamId && awayTeamId !== homeTeamId;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.title}>New Game Setup</span>
          <button style={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Team Selection */}
        <div style={styles.content}>
          {/* Away Team */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>AWAY TEAM</label>
            <select
              style={styles.select}
              value={awayTeamId}
              onChange={(e) => setAwayTeamId(e.target.value)}
            >
              <option value="">Select team...</option>
              {teams.map((team: TeamData) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* VS Indicator */}
          <div style={styles.vsIndicator}>@</div>

          {/* Home Team */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>HOME TEAM</label>
            <select
              style={styles.select}
              value={homeTeamId}
              onChange={(e) => setHomeTeamId(e.target.value)}
            >
              <option value="">Select team...</option>
              {teams.map((team: TeamData) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Same team warning */}
        {awayTeamId && homeTeamId && awayTeamId === homeTeamId && (
          <div style={styles.warning}>
            Away and home teams must be different
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{
              ...styles.confirmBtn,
              opacity: canConfirm ? 1 : 0.5,
              cursor: canConfirm ? 'pointer' : 'not-allowed',
            }}
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
    minWidth: '400px',
    maxWidth: '500px',
    border: '1px solid #334155',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #334155',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '20px',
    fontWeight: 700,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '28px',
    cursor: 'pointer',
    padding: '0 8px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignItems: 'center',
  },
  fieldGroup: {
    width: '100%',
  },
  label: {
    display: 'block',
    color: '#94a3b8',
    fontSize: '11px',
    letterSpacing: '1px',
    marginBottom: '8px',
    fontWeight: 600,
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    border: '1px solid #475569',
    borderRadius: '8px',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
  },
  vsIndicator: {
    color: '#475569',
    fontSize: '24px',
    fontWeight: 700,
    margin: '8px 0',
  },
  warning: {
    color: '#f87171',
    fontSize: '13px',
    textAlign: 'center',
    marginTop: '12px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #334155',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  confirmBtn: {
    flex: 1,
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: '#22c55e',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
