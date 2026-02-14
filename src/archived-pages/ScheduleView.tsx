/**
 * ScheduleView - Season schedule display
 * Per Ralph Framework S-C004, S-C005
 *
 * Features:
 * - All games listed (48-game season)
 * - Past games show score
 * - Future games show matchup
 * - Team filter dropdown
 */

import { useState, useMemo } from 'react';

interface ScheduledGame {
  gameNumber: number;
  awayTeamId: string;
  awayTeamName: string;
  homeTeamId: string;
  homeTeamName: string;
  isPlayed: boolean;
  awayScore?: number;
  homeScore?: number;
  date?: string;
}

interface Team {
  teamId: string;
  teamName: string;
}

interface ScheduleViewProps {
  games: ScheduledGame[];
  teams: Team[];
  currentGameNumber: number;
  onGameClick?: (gameNumber: number) => void;
}

export default function ScheduleView({
  games,
  teams,
  currentGameNumber,
  onGameClick,
}: ScheduleViewProps) {
  const [filterTeam, setFilterTeam] = useState<string>('all');

  // Filter games by team
  const filteredGames = useMemo(() => {
    if (filterTeam === 'all') return games;
    return games.filter(
      (game) => game.awayTeamId === filterTeam || game.homeTeamId === filterTeam
    );
  }, [games, filterTeam]);

  const getGameStatus = (game: ScheduledGame): 'completed' | 'current' | 'upcoming' => {
    if (game.isPlayed) return 'completed';
    if (game.gameNumber === currentGameNumber) return 'current';
    return 'upcoming';
  };

  const getWinner = (game: ScheduledGame): 'away' | 'home' | null => {
    if (!game.isPlayed || game.awayScore === undefined || game.homeScore === undefined) {
      return null;
    }
    if (game.awayScore > game.homeScore) return 'away';
    if (game.homeScore > game.awayScore) return 'home';
    return null;
  };

  return (
    <div style={styles.container}>
      {/* Header with Filter */}
      <div style={styles.header}>
        <h2 style={styles.title}>Season Schedule</h2>
        <div style={styles.filterContainer}>
          <label style={styles.filterLabel}>Filter by Team:</label>
          <select
            style={styles.filterSelect}
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
          >
            <option value="all">All Teams</option>
            {teams.map((team) => (
              <option key={team.teamId} value={team.teamId}>
                {team.teamName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress Summary */}
      <div style={styles.summary}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Completed</span>
          <span style={styles.summaryValue}>
            {games.filter((g) => g.isPlayed).length}
          </span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Remaining</span>
          <span style={styles.summaryValue}>
            {games.filter((g) => !g.isPlayed).length}
          </span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Total</span>
          <span style={styles.summaryValue}>{games.length}</span>
        </div>
      </div>

      {/* Games List */}
      <div style={styles.gamesList}>
        {filteredGames.map((game) => {
          const status = getGameStatus(game);
          const winner = getWinner(game);

          return (
            <div
              key={game.gameNumber}
              style={{
                ...styles.gameCard,
                ...(status === 'current' ? styles.currentGame : {}),
                ...(status === 'completed' ? styles.completedGame : {}),
                cursor: onGameClick ? 'pointer' : 'default',
              }}
              onClick={() => onGameClick?.(game.gameNumber)}
            >
              {/* Game Number */}
              <div style={styles.gameNumber}>#{game.gameNumber}</div>

              {/* Matchup */}
              <div style={styles.matchup}>
                <div
                  style={{
                    ...styles.team,
                    ...(winner === 'away' ? styles.winningTeam : {}),
                    ...(winner === 'home' ? styles.losingTeam : {}),
                  }}
                >
                  <span style={styles.teamName}>{game.awayTeamName}</span>
                  {game.isPlayed && (
                    <span style={styles.score}>{game.awayScore}</span>
                  )}
                </div>
                <div style={styles.atSymbol}>@</div>
                <div
                  style={{
                    ...styles.team,
                    ...(winner === 'home' ? styles.winningTeam : {}),
                    ...(winner === 'away' ? styles.losingTeam : {}),
                  }}
                >
                  <span style={styles.teamName}>{game.homeTeamName}</span>
                  {game.isPlayed && (
                    <span style={styles.score}>{game.homeScore}</span>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div
                style={{
                  ...styles.statusBadge,
                  ...(status === 'completed'
                    ? styles.statusCompleted
                    : status === 'current'
                    ? styles.statusCurrent
                    : styles.statusUpcoming),
                }}
              >
                {status === 'completed'
                  ? 'Final'
                  : status === 'current'
                  ? 'Next'
                  : 'Scheduled'}
              </div>
            </div>
          );
        })}
      </div>

      {filteredGames.length === 0 && (
        <div style={styles.empty}>
          No games match the selected filter.
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#fff',
  },
  filterContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  filterLabel: {
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  filterSelect: {
    padding: '8px 12px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  summary: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  summaryLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  summaryValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  gamesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  gameCard: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 80px',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    border: '1px solid #334155',
    transition: 'all 0.15s ease',
  },
  currentGame: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3b82f6',
  },
  completedGame: {
    opacity: 0.8,
  },
  gameNumber: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#64748b',
  },
  matchup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  team: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '140px',
  },
  teamName: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: '#e2e8f0',
  },
  score: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#fff',
  },
  atSymbol: {
    fontSize: '0.875rem',
    color: '#64748b',
  },
  winningTeam: {
    color: '#22c55e',
  },
  losingTeam: {
    color: '#94a3b8',
  },
  statusBadge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '100px',
    textAlign: 'center',
  },
  statusCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
  },
  statusCurrent: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
  },
  statusUpcoming: {
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    color: '#64748b',
  },
  empty: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#64748b',
  },
};
