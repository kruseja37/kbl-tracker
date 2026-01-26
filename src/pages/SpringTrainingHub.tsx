/**
 * SpringTrainingHub - Spring Training phase
 * Per Ralph Framework S-E001
 *
 * Features:
 * - View roster with projected development changes
 * - Shows career phase for each player
 * - Complete phase to proceed to schedule generation
 */

import { useMemo } from 'react';
import {
  getCareerPhase,
  getCareerPhaseDisplayName,
  getCareerPhaseColor,
  calculateRatingChange,
} from '../engines/agingEngine';

interface PlayerProjection {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  isPitcher: boolean;
  // Current ratings
  power?: number;
  contact?: number;
  speed?: number;
  velocity?: number;
  junk?: number;
  accuracy?: number;
}

interface SpringTrainingHubProps {
  players: PlayerProjection[];
  teamName: string;
  onComplete: () => void;
}

interface ProjectedChange {
  attribute: string;
  current: number;
  projected: number;
  change: number;
}

function calculateProjectedChanges(player: PlayerProjection): ProjectedChange[] {
  const changes: ProjectedChange[] = [];
  const nextAge = player.age + 1;

  if (player.isPitcher) {
    if (player.velocity !== undefined) {
      const change = calculateRatingChange(player.velocity, nextAge);
      changes.push({
        attribute: 'VEL',
        current: player.velocity,
        projected: player.velocity + change,
        change,
      });
    }
    if (player.junk !== undefined) {
      const change = calculateRatingChange(player.junk, nextAge);
      changes.push({
        attribute: 'JNK',
        current: player.junk,
        projected: player.junk + change,
        change,
      });
    }
    if (player.accuracy !== undefined) {
      const change = calculateRatingChange(player.accuracy, nextAge);
      changes.push({
        attribute: 'ACC',
        current: player.accuracy,
        projected: player.accuracy + change,
        change,
      });
    }
  } else {
    if (player.power !== undefined) {
      const change = calculateRatingChange(player.power, nextAge);
      changes.push({
        attribute: 'POW',
        current: player.power,
        projected: player.power + change,
        change,
      });
    }
    if (player.contact !== undefined) {
      const change = calculateRatingChange(player.contact, nextAge);
      changes.push({
        attribute: 'CON',
        current: player.contact,
        projected: player.contact + change,
        change,
      });
    }
    if (player.speed !== undefined) {
      const change = calculateRatingChange(player.speed, nextAge);
      changes.push({
        attribute: 'SPD',
        current: player.speed,
        projected: player.speed + change,
        change,
      });
    }
  }

  return changes;
}

export default function SpringTrainingHub({
  players,
  teamName,
  onComplete,
}: SpringTrainingHubProps) {
  const playerProjections = useMemo(() => {
    return players.map((player) => ({
      ...player,
      careerPhase: getCareerPhase(player.age + 1),
      projectedChanges: calculateProjectedChanges(player),
    }));
  }, [players]);

  const developingCount = playerProjections.filter(
    (p) => p.careerPhase === 'DEVELOPMENT'
  ).length;
  const primeCount = playerProjections.filter(
    (p) => p.careerPhase === 'PRIME'
  ).length;
  const decliningCount = playerProjections.filter(
    (p) => p.careerPhase === 'DECLINE'
  ).length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Spring Training</h1>
        <div style={styles.teamBadge}>{teamName}</div>
      </div>

      {/* Overview */}
      <div style={styles.overview}>
        <div style={styles.overviewTitle}>Roster Outlook</div>
        <div style={styles.phaseCounts}>
          <div style={styles.phaseCount}>
            <span
              style={{
                ...styles.phaseCountValue,
                color: getCareerPhaseColor('DEVELOPMENT'),
              }}
            >
              {developingCount}
            </span>
            <span style={styles.phaseCountLabel}>Developing</span>
          </div>
          <div style={styles.phaseCount}>
            <span
              style={{
                ...styles.phaseCountValue,
                color: getCareerPhaseColor('PRIME'),
              }}
            >
              {primeCount}
            </span>
            <span style={styles.phaseCountLabel}>Prime</span>
          </div>
          <div style={styles.phaseCount}>
            <span
              style={{
                ...styles.phaseCountValue,
                color: getCareerPhaseColor('DECLINE'),
              }}
            >
              {decliningCount}
            </span>
            <span style={styles.phaseCountLabel}>Declining</span>
          </div>
        </div>
      </div>

      {/* Player List */}
      <div style={styles.playerList}>
        {playerProjections.map((player) => (
          <div key={player.playerId} style={styles.playerCard}>
            <div style={styles.playerHeader}>
              <div style={styles.playerInfo}>
                <span style={styles.playerName}>{player.playerName}</span>
                <span style={styles.playerDetails}>
                  {player.position} · Age {player.age} → {player.age + 1}
                </span>
              </div>
              <div
                style={{
                  ...styles.phaseBadge,
                  backgroundColor: getCareerPhaseColor(player.careerPhase),
                }}
              >
                {getCareerPhaseDisplayName(player.careerPhase)}
              </div>
            </div>

            {/* Projected Changes */}
            <div style={styles.projectionsRow}>
              {player.projectedChanges.map((pc) => (
                <div key={pc.attribute} style={styles.projectionItem}>
                  <span style={styles.projectionLabel}>{pc.attribute}</span>
                  <span style={styles.projectionCurrent}>{pc.current}</span>
                  <span style={styles.projectionArrow}>→</span>
                  <span
                    style={{
                      ...styles.projectionValue,
                      color:
                        pc.change > 0
                          ? '#22c55e'
                          : pc.change < 0
                          ? '#ef4444'
                          : '#94a3b8',
                    }}
                  >
                    {pc.projected}
                  </span>
                  {pc.change !== 0 && (
                    <span
                      style={{
                        ...styles.projectionChange,
                        color: pc.change > 0 ? '#22c55e' : '#ef4444',
                      }}
                    >
                      ({pc.change > 0 ? '+' : ''}
                      {pc.change})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {players.length === 0 && (
        <div style={styles.empty}>No players on roster</div>
      )}

      {/* Complete Button */}
      <button style={styles.completeButton} onClick={onComplete}>
        Complete Spring Training
      </button>
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '800px',
    margin: '0 auto 24px',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 900,
    color: '#fff',
  },
  teamBadge: {
    padding: '8px 20px',
    backgroundColor: '#3b82f6',
    borderRadius: '100px',
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#fff',
  },
  overview: {
    maxWidth: '600px',
    margin: '0 auto 32px',
    padding: '24px',
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    border: '1px solid #334155',
    textAlign: 'center',
  },
  overviewTitle: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '16px',
  },
  phaseCounts: {
    display: 'flex',
    justifyContent: 'center',
    gap: '32px',
  },
  phaseCount: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  phaseCountValue: {
    fontSize: '2rem',
    fontWeight: 900,
  },
  phaseCountLabel: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  playerList: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  playerCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '16px 20px',
    border: '1px solid #334155',
  },
  playerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  playerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  playerName: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#fff',
  },
  playerDetails: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
  },
  phaseBadge: {
    padding: '4px 12px',
    borderRadius: '100px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#fff',
  },
  projectionsRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  projectionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
  },
  projectionLabel: {
    fontSize: '0.625rem',
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  projectionCurrent: {
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  projectionArrow: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  projectionValue: {
    fontSize: '0.875rem',
    fontWeight: 700,
  },
  projectionChange: {
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748b',
  },
  completeButton: {
    display: 'block',
    margin: '40px auto 0',
    padding: '16px 48px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
