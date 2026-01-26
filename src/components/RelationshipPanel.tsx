/**
 * RelationshipPanel - Display player relationships
 * Per Ralph Framework S-F004
 *
 * Features:
 * - Shows in PlayerCard
 * - Type icons for each relationship
 * - Related player clickable
 */

import type { Relationship } from '../engines/relationshipEngine';
import {
  RELATIONSHIP_ICONS,
  getRelationshipDisplayName,
  getMoraleBreakdown,
} from '../engines/relationshipEngine';

interface RelationshipPanelProps {
  playerId: string;
  relationships: Relationship[];
  getPlayerName: (id: string) => string;
  onPlayerClick?: (playerId: string) => void;
}

export default function RelationshipPanel({
  playerId,
  relationships,
  getPlayerName,
  onPlayerClick,
}: RelationshipPanelProps) {
  const breakdown = getMoraleBreakdown(relationships, playerId);

  if (breakdown.length === 0) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Relationships</h3>
        <div style={styles.empty}>No active relationships</div>
      </div>
    );
  }

  const totalMorale = breakdown.reduce((sum, item) => sum + item.effect, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Relationships</h3>
        <span
          style={{
            ...styles.totalEffect,
            color: totalMorale >= 0 ? '#22c55e' : '#ef4444',
          }}
        >
          {totalMorale >= 0 ? '+' : ''}
          {totalMorale} Morale
        </span>
      </div>

      <div style={styles.relationshipsList}>
        {breakdown.map(({ relationship, effect }) => {
          const otherPlayerId =
            relationship.player1Id === playerId
              ? relationship.player2Id
              : relationship.player1Id;
          const otherPlayerName = getPlayerName(otherPlayerId);
          const icon = RELATIONSHIP_ICONS[relationship.type];
          const displayName = getRelationshipDisplayName(relationship.type);

          return (
            <div key={relationship.relationshipId} style={styles.relationshipCard}>
              <div style={styles.iconContainer}>{icon}</div>
              <div style={styles.info}>
                <span style={styles.typeName}>{displayName}</span>
                <span
                  style={styles.playerName}
                  onClick={() => onPlayerClick?.(otherPlayerId)}
                >
                  {otherPlayerName}
                </span>
              </div>
              <div
                style={{
                  ...styles.effect,
                  color: effect >= 0 ? '#22c55e' : '#ef4444',
                }}
              >
                {effect >= 0 ? '+' : ''}
                {effect}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #334155',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    margin: 0,
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  totalEffect: {
    fontSize: '0.8125rem',
    fontWeight: 700,
  },
  empty: {
    textAlign: 'center',
    padding: '20px',
    color: '#64748b',
    fontSize: '0.875rem',
  },
  relationshipsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  relationshipCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
  },
  iconContainer: {
    fontSize: '1.5rem',
    width: '32px',
    textAlign: 'center',
  },
  info: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  typeName: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  playerName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#3b82f6',
    cursor: 'pointer',
    transition: 'color 0.15s ease',
  },
  effect: {
    fontSize: '0.9375rem',
    fontWeight: 700,
  },
};
