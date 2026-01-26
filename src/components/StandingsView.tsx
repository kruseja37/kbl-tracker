/**
 * StandingsView - League standings display
 * Per Ralph Framework S-C001, S-C002, S-C003
 *
 * Features:
 * - All teams listed sorted by winning percentage
 * - W-L-PCT columns
 * - Games Back (GB) column
 * - Win/Loss Streak column (color coded)
 */

import { useMemo } from 'react';

interface TeamStanding {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  runsScored: number;
  runsAllowed: number;
  streak: { type: 'W' | 'L'; count: number };
  lastTenWins: number;
  homeRecord: { wins: number; losses: number };
  awayRecord: { wins: number; losses: number };
}

interface StandingsViewProps {
  standings: TeamStanding[];
  onTeamClick?: (teamId: string) => void;
  compact?: boolean;
}

export default function StandingsView({
  standings,
  onTeamClick,
  compact = false,
}: StandingsViewProps) {
  // Sort by winning percentage
  const sortedStandings = useMemo(() => {
    return [...standings].sort((a, b) => {
      const pctA = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0;
      const pctB = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0;
      return pctB - pctA;
    });
  }, [standings]);

  // Calculate leader for GB calculation
  const leader = sortedStandings[0];

  // Calculate GB for each team
  const standingsWithGB = useMemo(() => {
    return sortedStandings.map((team) => {
      if (!leader || team === leader) {
        return { ...team, gamesBack: null };
      }
      // GB = ((LeaderWins - TeamWins) + (TeamLosses - LeaderLosses)) / 2
      const gb = ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2;
      return { ...team, gamesBack: gb };
    });
  }, [sortedStandings, leader]);

  const calculatePCT = (wins: number, losses: number): string => {
    if (wins + losses === 0) return '.000';
    const pct = wins / (wins + losses);
    return pct.toFixed(3).replace(/^0/, '');
  };

  const formatGB = (gb: number | null): string => {
    if (gb === null) return '-';
    if (gb === 0) return '-';
    return gb % 1 === 0 ? gb.toString() : gb.toFixed(1);
  };

  const formatStreak = (streak: TeamStanding['streak']): string => {
    return `${streak.type}${streak.count}`;
  };

  const getStreakColor = (streak: TeamStanding['streak']): string => {
    if (streak.type === 'W') {
      return streak.count >= 5 ? '#22c55e' : '#4ade80';
    }
    return streak.count >= 5 ? '#ef4444' : '#f87171';
  };

  return (
    <div style={styles.container}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={{ ...styles.th, ...styles.thTeam }}>Team</th>
            <th style={styles.th}>W</th>
            <th style={styles.th}>L</th>
            <th style={styles.th}>PCT</th>
            <th style={styles.th}>GB</th>
            {!compact && (
              <>
                <th style={styles.th}>STRK</th>
                <th style={styles.th}>L10</th>
                <th style={styles.th}>HOME</th>
                <th style={styles.th}>AWAY</th>
                <th style={styles.th}>DIFF</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {standingsWithGB.map((team, index) => {
            const runDiff = team.runsScored - team.runsAllowed;
            return (
              <tr
                key={team.teamId}
                style={{
                  ...styles.row,
                  ...(index === 0 ? styles.leaderRow : {}),
                  cursor: onTeamClick ? 'pointer' : 'default',
                }}
                onClick={() => onTeamClick?.(team.teamId)}
              >
                <td style={{ ...styles.td, ...styles.tdTeam }}>
                  <span style={styles.rank}>{index + 1}</span>
                  <span style={styles.teamName}>{team.teamName}</span>
                </td>
                <td style={styles.td}>{team.wins}</td>
                <td style={styles.td}>{team.losses}</td>
                <td style={styles.td}>
                  {calculatePCT(team.wins, team.losses)}
                </td>
                <td style={styles.td}>{formatGB(team.gamesBack)}</td>
                {!compact && (
                  <>
                    <td
                      style={{
                        ...styles.td,
                        color: getStreakColor(team.streak),
                        fontWeight: 600,
                      }}
                    >
                      {formatStreak(team.streak)}
                    </td>
                    <td style={styles.td}>
                      {team.lastTenWins}-{10 - team.lastTenWins}
                    </td>
                    <td style={styles.td}>
                      {team.homeRecord.wins}-{team.homeRecord.losses}
                    </td>
                    <td style={styles.td}>
                      {team.awayRecord.wins}-{team.awayRecord.losses}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        color: runDiff > 0 ? '#22c55e' : runDiff < 0 ? '#ef4444' : '#94a3b8',
                        fontWeight: 600,
                      }}
                    >
                      {runDiff > 0 ? '+' : ''}
                      {runDiff}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {standings.length === 0 && (
        <div style={styles.empty}>
          No standings data available yet. Play some games!
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #334155',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  headerRow: {
    backgroundColor: '#0f172a',
  },
  th: {
    padding: '12px 8px',
    textAlign: 'center',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  thTeam: {
    textAlign: 'left',
    paddingLeft: '16px',
  },
  row: {
    borderBottom: '1px solid #334155',
    transition: 'background-color 0.15s ease',
  },
  leaderRow: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  td: {
    padding: '10px 8px',
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#e2e8f0',
  },
  tdTeam: {
    textAlign: 'left',
    paddingLeft: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  rank: {
    width: '20px',
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: 600,
  },
  teamName: {
    fontWeight: 600,
    color: '#fff',
  },
  empty: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#64748b',
  },
};
