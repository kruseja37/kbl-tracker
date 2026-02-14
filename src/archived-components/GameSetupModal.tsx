/**
 * GameSetupModal - Configure matchup before starting a game
 * Per S-B003, S-B004
 */

import { useState, useEffect } from 'react';
import { getAllTeams, getTeamRotation, type TeamData, type PlayerData } from '../data/playerDatabase';

interface GameSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (awayTeamId: string, homeTeamId: string, awayPitcherId?: string, homePitcherId?: string) => void;
}

export default function GameSetupModal({
  isOpen,
  onClose,
  onConfirm,
}: GameSetupModalProps) {
  const teams = getAllTeams();
  const [awayTeamId, setAwayTeamId] = useState<string>('');
  const [homeTeamId, setHomeTeamId] = useState<string>('');
  const [awayPitcherId, setAwayPitcherId] = useState<string>('');
  const [homePitcherId, setHomePitcherId] = useState<string>('');

  // Get rotation pitchers for selected teams
  const awayRotation: PlayerData[] = awayTeamId ? getTeamRotation(awayTeamId) : [];
  const homeRotation: PlayerData[] = homeTeamId ? getTeamRotation(homeTeamId) : [];

  // Auto-select first pitcher when team is selected (or when rotation is available)
  useEffect(() => {
    if (awayTeamId && awayRotation.length > 0 && !awayPitcherId) {
      setAwayPitcherId(awayRotation[0].id);
    }
  }, [awayTeamId, awayRotation, awayPitcherId]);

  useEffect(() => {
    if (homeTeamId && homeRotation.length > 0 && !homePitcherId) {
      setHomePitcherId(homeRotation[0].id);
    }
  }, [homeTeamId, homeRotation, homePitcherId]);

  // Reset pitcher selection when team changes
  const handleAwayTeamChange = (teamId: string) => {
    setAwayTeamId(teamId);
    setAwayPitcherId(''); // Reset pitcher - useEffect will auto-select first
  };

  const handleHomeTeamChange = (teamId: string) => {
    setHomeTeamId(teamId);
    setHomePitcherId(''); // Reset pitcher - useEffect will auto-select first
  };

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (awayTeamId && homeTeamId && awayPitcherId && homePitcherId) {
      onConfirm(awayTeamId, homeTeamId, awayPitcherId, homePitcherId);
    }
  };

  // Per S-B004 AC-3: Must have both teams AND both pitchers selected
  const canConfirm = awayTeamId && homeTeamId && awayTeamId !== homeTeamId &&
                     awayPitcherId && homePitcherId;

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
              onChange={(e) => handleAwayTeamChange(e.target.value)}
            >
              <option value="">Select team...</option>
              {teams.map((team: TeamData) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* Away Pitcher - only show when team selected */}
          {awayTeamId && awayRotation.length > 0 && (
            <div style={styles.pitcherGroup}>
              <label style={styles.pitcherLabel}>⚾ STARTING PITCHER</label>
              <select
                style={styles.pitcherSelect}
                value={awayPitcherId}
                onChange={(e) => setAwayPitcherId(e.target.value)}
              >
                {awayRotation.map((pitcher: PlayerData) => (
                  <option key={pitcher.id} value={pitcher.id}>
                    {pitcher.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* VS Indicator */}
          <div style={styles.vsIndicator}>@</div>

          {/* Home Team */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>HOME TEAM</label>
            <select
              style={styles.select}
              value={homeTeamId}
              onChange={(e) => handleHomeTeamChange(e.target.value)}
            >
              <option value="">Select team...</option>
              {teams.map((team: TeamData) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* Home Pitcher - only show when team selected */}
          {homeTeamId && homeRotation.length > 0 && (
            <div style={styles.pitcherGroup}>
              <label style={styles.pitcherLabel}>⚾ STARTING PITCHER</label>
              <select
                style={styles.pitcherSelect}
                value={homePitcherId}
                onChange={(e) => setHomePitcherId(e.target.value)}
              >
                {homeRotation.map((pitcher: PlayerData) => (
                  <option key={pitcher.id} value={pitcher.id}>
                    {pitcher.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
  // Pitcher selection styles (S-B004)
  pitcherGroup: {
    width: '100%',
    marginTop: '-8px',
    paddingLeft: '16px',
    borderLeft: '2px solid #334155',
    marginLeft: '8px',
  },
  pitcherLabel: {
    display: 'block',
    color: '#64748b',
    fontSize: '10px',
    letterSpacing: '0.5px',
    marginBottom: '6px',
    fontWeight: 500,
  },
  pitcherSelect: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: '6px',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
  },
};
