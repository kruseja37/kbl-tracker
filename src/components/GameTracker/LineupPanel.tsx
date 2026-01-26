/**
 * Lineup Panel Component
 * Shows all 9 batting order positions with player names and defensive positions
 */

import type { LineupState } from '../../types/game';

interface LineupPanelProps {
  lineupState: LineupState;
  isOpen: boolean;
  onClose: () => void;
  halfInning: 'TOP' | 'BOTTOM';
  onPlayerClick?: (playerId: string, playerName: string, teamId: string) => void;
  teamId: string;
}

export default function LineupPanel({
  lineupState,
  isOpen,
  onClose,
  halfInning,
  onPlayerClick,
  teamId,
}: LineupPanelProps) {
  if (!isOpen) return null;

  // Get lineup sorted by batting order
  const sortedLineup = [...lineupState.lineup]
    .filter(p => p.battingOrder >= 1 && p.battingOrder <= 9)
    .sort((a, b) => a.battingOrder - b.battingOrder);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.title}>
            {halfInning === 'TOP' ? '⬆️' : '⬇️'} BATTING LINEUP
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Lineup List */}
        <div style={styles.list}>
          {sortedLineup.map((player) => (
            <div
              key={player.playerId}
              style={styles.row}
              onClick={() => onPlayerClick?.(player.playerId, player.playerName, teamId)}
            >
              {/* Batting Order */}
              <div style={styles.order}>{player.battingOrder}</div>

              {/* Player Info */}
              <div style={styles.playerInfo}>
                <span style={styles.name}>{player.playerName}</span>
                <span style={styles.position}>{player.position}</span>
              </div>

              {/* Entry info for subs */}
              {!player.isStarter && (
                <div style={styles.subBadge}>
                  IN: {player.enteredInning}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pitcher Info */}
        {lineupState.currentPitcher && (
          <div style={styles.pitcherSection}>
            <div style={styles.pitcherLabel}>PITCHING</div>
            <div
              style={styles.pitcherRow}
              onClick={() => onPlayerClick?.(
                lineupState.currentPitcher!.playerId,
                lineupState.currentPitcher!.playerName,
                teamId
              )}
            >
              <span style={styles.name}>{lineupState.currentPitcher.playerName}</span>
              <span style={styles.position}>P</span>
            </div>
          </div>
        )}

        {/* Bench Preview */}
        {lineupState.bench.length > 0 && (
          <div style={styles.benchSection}>
            <div style={styles.benchLabel}>BENCH ({lineupState.bench.length})</div>
            <div style={styles.benchNames}>
              {lineupState.bench.slice(0, 3).map(p => p.playerName).join(', ')}
              {lineupState.bench.length > 3 && '...'}
            </div>
          </div>
        )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  panel: {
    backgroundColor: '#1a1f2e',
    borderRadius: '12px',
    border: '1px solid #374151',
    width: '320px',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #374151',
    backgroundColor: '#111827',
    borderRadius: '12px 12px 0 0',
  },
  title: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.5px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  list: {
    padding: '8px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    backgroundColor: '#1f2937',
    borderRadius: '8px',
    marginBottom: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  order: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    borderRadius: '50%',
    fontSize: '12px',
    fontWeight: 700,
    color: '#d1d5db',
  },
  playerInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  name: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#f3f4f6',
  },
  position: {
    fontSize: '11px',
    color: '#9ca3af',
    backgroundColor: '#374151',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 500,
  },
  subBadge: {
    fontSize: '10px',
    color: '#fbbf24',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 600,
  },
  pitcherSection: {
    borderTop: '1px solid #374151',
    padding: '12px 16px',
    backgroundColor: '#111827',
  },
  pitcherLabel: {
    fontSize: '10px',
    color: '#6b7280',
    fontWeight: 600,
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  pitcherRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  benchSection: {
    borderTop: '1px solid #374151',
    padding: '12px 16px',
    backgroundColor: '#0f172a',
    borderRadius: '0 0 12px 12px',
  },
  benchLabel: {
    fontSize: '10px',
    color: '#6b7280',
    fontWeight: 600,
    letterSpacing: '1px',
    marginBottom: '4px',
  },
  benchNames: {
    fontSize: '12px',
    color: '#9ca3af',
  },
};
