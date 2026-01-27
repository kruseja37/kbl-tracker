/**
 * RosterView - Team roster display
 * Per Ralph Framework S-C009, S-C010
 *
 * Features:
 * - All players listed (22-man roster)
 * - Position shown
 * - Grouped by type (Catchers, Infielders, Outfielders, Pitchers)
 * - Key stats per player
 * - Click opens PlayerCard
 * - ChemistryDisplay shows team chemistry score
 */

import { useMemo, useState } from 'react';
import ChemistryDisplay from '../components/ChemistryDisplay';

// Types for chemistry pairings
interface PlayerPairing {
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  chemistryBonus: number;
  relationshipType?: string;
}

interface RosterPlayer {
  playerId: string;
  playerName: string;
  position: string;
  secondaryPosition?: string;
  age: number;
  bats: 'L' | 'R' | 'S';
  throws: 'L' | 'R';
  // Batting stats
  games?: number;
  avg?: number;
  hr?: number;
  rbi?: number;
  obp?: number;
  slg?: number;
  // Pitching stats
  wins?: number;
  losses?: number;
  era?: number;
  saves?: number;
  strikeouts?: number;
  // Ratings
  power?: number;
  contact?: number;
  speed?: number;
  velocity?: number;
  junk?: number;
  accuracy?: number;
  // Salary
  salary?: number;
  overall?: string;
  originalTeamId?: string;
}

// Format salary for display
function formatSalary(amount: number | undefined): string {
  if (!amount) return '-';
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  return `$${(amount / 1000).toFixed(0)}K`;
}

interface RosterViewProps {
  players: RosterPlayer[];
  teamName: string;
  onPlayerClick?: (playerId: string) => void;
  onDeletePlayer?: (playerId: string) => void;
  showRatings?: boolean;
  chemistryScore?: number;
  topPairings?: PlayerPairing[];
  worstPairings?: PlayerPairing[];
  showChemistry?: boolean;
}

type PlayerGroup = 'positionPlayers' | 'pitchers';

export default function RosterView({
  players,
  teamName,
  onPlayerClick,
  onDeletePlayer,
  showRatings = false,
  chemistryScore = 70,
  topPairings = [],
  worstPairings = [],
  showChemistry = false,
}: RosterViewProps) {
  const [isChemistryExpanded, setIsChemistryExpanded] = useState(false);
  // Group players: Position Players and Pitchers, sorted by salary descending
  const groupedPlayers = useMemo(() => {
    const groups: Record<PlayerGroup, RosterPlayer[]> = {
      positionPlayers: [],
      pitchers: [],
    };

    players.forEach((player) => {
      const pos = player.position.toUpperCase();
      if (['SP', 'RP', 'CL', 'P'].includes(pos)) {
        groups.pitchers.push(player);
      } else {
        groups.positionPlayers.push(player);
      }
    });

    // Sort each group by salary descending
    groups.positionPlayers.sort((a, b) => (b.salary || 0) - (a.salary || 0));
    groups.pitchers.sort((a, b) => (b.salary || 0) - (a.salary || 0));

    return groups;
  }, [players]);

  const formatAvg = (avg: number | undefined): string => {
    if (avg === undefined) return '-';
    return avg.toFixed(3).replace(/^0/, '');
  };

  const formatEra = (era: number | undefined): string => {
    if (era === undefined) return '-';
    return era.toFixed(2);
  };

  const renderBatterRow = (player: RosterPlayer) => (
    <div
      key={player.playerId}
      style={styles.playerRow}
      onClick={() => onPlayerClick?.(player.playerId)}
    >
      <div style={styles.playerInfo}>
        <div style={styles.position}>{player.position}</div>
        <div style={styles.playerDetails}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={styles.playerName}>{player.playerName}</span>
            {player.overall && (
              <span style={styles.overallBadge}>{player.overall}</span>
            )}
          </div>
          <span style={styles.playerMeta}>
            {player.bats}/{player.throws} • Age {player.age}
            {player.originalTeamId && ` • from ${player.originalTeamId}`}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {showRatings ? (
          <div style={styles.ratings}>
            <span style={styles.rating}>POW {player.power || '-'}</span>
            <span style={styles.rating}>CON {player.contact || '-'}</span>
            <span style={styles.rating}>SPD {player.speed || '-'}</span>
          </div>
        ) : (
          <div style={styles.stats}>
            <span style={styles.stat}>
              <span style={styles.statValue}>{formatAvg(player.avg)}</span>
              <span style={styles.statLabel}>AVG</span>
            </span>
            <span style={styles.stat}>
              <span style={styles.statValue}>{player.hr ?? '-'}</span>
              <span style={styles.statLabel}>HR</span>
            </span>
            <span style={styles.stat}>
              <span style={styles.statValue}>{player.rbi ?? '-'}</span>
              <span style={styles.statLabel}>RBI</span>
            </span>
          </div>
        )}
        <div style={styles.salaryDisplay}>
          {formatSalary(player.salary)}
        </div>
        {onDeletePlayer && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeletePlayer(player.playerId);
            }}
            style={styles.deleteButton}
            title="Remove player"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );

  const renderPitcherRow = (player: RosterPlayer) => (
    <div
      key={player.playerId}
      style={styles.playerRow}
      onClick={() => onPlayerClick?.(player.playerId)}
    >
      <div style={styles.playerInfo}>
        <div style={styles.position}>{player.position}</div>
        <div style={styles.playerDetails}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={styles.playerName}>{player.playerName}</span>
            {player.overall && (
              <span style={styles.overallBadge}>{player.overall}</span>
            )}
          </div>
          <span style={styles.playerMeta}>
            {player.throws} • Age {player.age}
            {player.originalTeamId && ` • from ${player.originalTeamId}`}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {showRatings ? (
          <div style={styles.ratings}>
            <span style={styles.rating}>VEL {player.velocity || '-'}</span>
            <span style={styles.rating}>JNK {player.junk || '-'}</span>
            <span style={styles.rating}>ACC {player.accuracy || '-'}</span>
          </div>
        ) : (
          <div style={styles.stats}>
            <span style={styles.stat}>
              <span style={styles.statValue}>
                {player.wins ?? 0}-{player.losses ?? 0}
              </span>
              <span style={styles.statLabel}>W-L</span>
            </span>
            <span style={styles.stat}>
              <span style={styles.statValue}>{formatEra(player.era)}</span>
              <span style={styles.statLabel}>ERA</span>
            </span>
            {player.position === 'RP' || player.position === 'CL' ? (
              <span style={styles.stat}>
                <span style={styles.statValue}>{player.saves ?? 0}</span>
                <span style={styles.statLabel}>SV</span>
              </span>
            ) : (
              <span style={styles.stat}>
                <span style={styles.statValue}>{player.strikeouts ?? '-'}</span>
                <span style={styles.statLabel}>K</span>
              </span>
            )}
          </div>
        )}
        <div style={styles.salaryDisplay}>
          {formatSalary(player.salary)}
        </div>
        {onDeletePlayer && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeletePlayer(player.playerId);
            }}
            style={styles.deleteButton}
            title="Remove player"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );

  const groupLabels: Record<PlayerGroup, string> = {
    positionPlayers: 'Position Players',
    pitchers: 'Pitchers',
  };

  const groupIcons: Record<PlayerGroup, string> = {
    positionPlayers: '⚾',
    pitchers: '💪',
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>{teamName} Roster</h1>
        <div style={styles.count}>{players.length} players</div>
      </div>

      {/* Team Chemistry Section */}
      {showChemistry && (
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => setIsChemistryExpanded(!isChemistryExpanded)}
            style={styles.chemistryToggle}
          >
            <span>⚗️</span>
            <span>Team Chemistry: {chemistryScore}/100</span>
            <span>{isChemistryExpanded ? '▼' : '▶'}</span>
          </button>
          {isChemistryExpanded && (
            <ChemistryDisplay
              teamName={teamName}
              chemistryScore={chemistryScore}
              topPairings={topPairings}
              worstPairings={worstPairings}
              onPlayerClick={onPlayerClick}
            />
          )}
        </div>
      )}

      {/* Position Players */}
      {groupedPlayers.positionPlayers.length > 0 && (
        <div style={styles.group}>
          <div style={styles.groupHeader}>
            <span style={styles.groupIcon}>{groupIcons.positionPlayers}</span>
            <span style={styles.groupLabel}>{groupLabels.positionPlayers}</span>
            <span style={styles.groupCount}>{groupedPlayers.positionPlayers.length}</span>
          </div>
          <div style={styles.playerList}>
            {groupedPlayers.positionPlayers.map(renderBatterRow)}
          </div>
        </div>
      )}

      {/* Pitchers */}
      {groupedPlayers.pitchers.length > 0 && (
        <div style={styles.group}>
          <div style={styles.groupHeader}>
            <span style={styles.groupIcon}>{groupIcons.pitchers}</span>
            <span style={styles.groupLabel}>{groupLabels.pitchers}</span>
            <span style={styles.groupCount}>{groupedPlayers.pitchers.length}</span>
          </div>
          <div style={styles.playerList}>
            {groupedPlayers.pitchers.map(renderPitcherRow)}
          </div>
        </div>
      )}

      {players.length === 0 && (
        <div style={styles.empty}>No players on roster</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#fff',
  },
  count: {
    fontSize: '0.875rem',
    color: '#64748b',
    backgroundColor: '#1e293b',
    padding: '6px 12px',
    borderRadius: '100px',
  },
  group: {
    marginBottom: '24px',
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    padding: '8px 12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
  },
  groupIcon: {
    fontSize: '1.125rem',
  },
  groupLabel: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  groupCount: {
    fontSize: '0.75rem',
    color: '#64748b',
    backgroundColor: '#1e293b',
    padding: '2px 8px',
    borderRadius: '100px',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  playerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    border: '1px solid transparent',
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  position: {
    width: '32px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#3b82f6',
    textAlign: 'center',
  },
  playerDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  playerName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  playerMeta: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  stats: {
    display: 'flex',
    gap: '16px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '40px',
  },
  statValue: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  statLabel: {
    fontSize: '0.625rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  ratings: {
    display: 'flex',
    gap: '12px',
  },
  rating: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#94a3b8',
    padding: '4px 8px',
    backgroundColor: '#0f172a',
    borderRadius: '4px',
  },
  empty: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#64748b',
  },
  overallBadge: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: '#fbbf24',
    padding: '2px 6px',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: '4px',
  },
  salaryDisplay: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#22c55e',
    minWidth: '70px',
    textAlign: 'right' as const,
  },
  deleteButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: '1px solid #475569',
    borderRadius: '4px',
    color: '#94a3b8',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  chemistryToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '12px',
  },
};
