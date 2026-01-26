/**
 * Lineup Panel Component
 * Shows all 9 batting order positions with player names, defensive positions,
 * and Mojo/Fitness indicators.
 */

import type { LineupState } from '../../types/game';
import { MOJO_STATES, type MojoLevel } from '../../engines/mojoEngine';
import { FITNESS_STATES, type FitnessState } from '../../engines/fitnessEngine';

interface LineupPanelProps {
  lineupState: LineupState;
  isOpen: boolean;
  onClose: () => void;
  halfInning: 'TOP' | 'BOTTOM';
  onPlayerClick?: (playerId: string, playerName: string, teamId: string) => void;
  teamId: string;
  // Mojo levels by player ID (defaults to 0 if not provided)
  playerMojoLevels?: Record<string, MojoLevel>;
  // Fitness states by player ID (defaults to FIT if not provided)
  playerFitnessStates?: Record<string, FitnessState>;
}

// Mojo indicator colors per level
const MOJO_COLORS: Record<MojoLevel, string> = {
  [-2]: '#ef4444', // red - Rattled
  [-1]: '#f97316', // orange - Tense
  [0]: '#6b7280',  // gray - Normal
  [1]: '#22c55e',  // green - Locked In
  [2]: '#3b82f6',  // blue - Jacked
};

const MOJO_BG_COLORS: Record<MojoLevel, string> = {
  [-2]: 'rgba(239, 68, 68, 0.15)',
  [-1]: 'rgba(249, 115, 22, 0.15)',
  [0]: 'rgba(107, 114, 128, 0.15)',
  [1]: 'rgba(34, 197, 94, 0.15)',
  [2]: 'rgba(59, 130, 246, 0.15)',
};

function MojoBadge({ level }: { level: MojoLevel }) {
  const state = MOJO_STATES[level];
  return (
    <div
      style={{
        ...mojoStyles.badge,
        color: MOJO_COLORS[level],
        backgroundColor: MOJO_BG_COLORS[level],
      }}
      title={`Mojo: ${state.displayName}`}
    >
      {state.emoji}
    </div>
  );
}

function FitnessBadge({ state }: { state: FitnessState }) {
  const fitnessInfo = FITNESS_STATES[state];
  return (
    <div
      style={{
        ...fitnessStyles.badge,
        color: fitnessInfo.color,
        backgroundColor: `${fitnessInfo.color}20`,
        borderColor: fitnessInfo.color,
      }}
      title={`Fitness: ${fitnessInfo.displayName}`}
    >
      {fitnessInfo.emoji}
    </div>
  );
}

export default function LineupPanel({
  lineupState,
  isOpen,
  onClose,
  halfInning,
  onPlayerClick,
  teamId,
  playerMojoLevels = {},
  playerFitnessStates = {},
}: LineupPanelProps) {
  if (!isOpen) return null;

  // Get lineup sorted by batting order
  const sortedLineup = [...lineupState.lineup]
    .filter(p => p.battingOrder >= 1 && p.battingOrder <= 9)
    .sort((a, b) => a.battingOrder - b.battingOrder);

  // Get mojo level for a player (default to 0)
  const getMojoLevel = (playerId: string): MojoLevel => {
    return playerMojoLevels[playerId] ?? 0;
  };

  // Get fitness state for a player (default to FIT)
  const getFitnessState = (playerId: string): FitnessState => {
    return playerFitnessStates[playerId] ?? 'FIT';
  };

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

              {/* Mojo & Fitness Indicators */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <MojoBadge level={getMojoLevel(player.playerId)} />
                <FitnessBadge state={getFitnessState(player.playerId)} />
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
              <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                <MojoBadge level={getMojoLevel(lineupState.currentPitcher.playerId)} />
                <FitnessBadge state={getFitnessState(lineupState.currentPitcher.playerId)} />
              </div>
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

const mojoStyles: Record<string, React.CSSProperties> = {
  badge: {
    fontSize: '12px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 600,
    minWidth: '28px',
    textAlign: 'center',
  },
};

const fitnessStyles: Record<string, React.CSSProperties> = {
  badge: {
    fontSize: '11px',
    padding: '2px 5px',
    borderRadius: '4px',
    fontWeight: 600,
    minWidth: '24px',
    textAlign: 'center',
    border: '1px solid',
  },
};

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
    width: '340px',
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
    gap: '10px',
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
