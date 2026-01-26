/**
 * PlayoffBracket - Visual playoff bracket display
 * Per Ralph Framework S-C014
 *
 * Features:
 * - Bracket structure (4 or 8 teams)
 * - Teams placed in seeded positions
 * - Series scores shown
 */

interface TeamSeed {
  teamId: string;
  teamName: string;
  seed: number;
  record?: { wins: number; losses: number };
}

interface MatchupSeries {
  id: string;
  round: 'wildcard' | 'division' | 'championship' | 'finals';
  team1?: TeamSeed;
  team2?: TeamSeed;
  team1Wins: number;
  team2Wins: number;
  winnerId?: string;
  gamesToWin: number; // 3 for best of 5, 4 for best of 7
}

interface PlayoffBracketProps {
  matchups: MatchupSeries[];
  teamCount: 4 | 8;
  onMatchupClick?: (matchupId: string) => void;
  currentMatchupId?: string;
}

export default function PlayoffBracket({
  matchups,
  teamCount,
  onMatchupClick,
  currentMatchupId,
}: PlayoffBracketProps) {
  const getRoundMatchups = (round: MatchupSeries['round']): MatchupSeries[] => {
    return matchups.filter((m) => m.round === round);
  };

  const getRoundLabel = (round: MatchupSeries['round']): string => {
    const labels: Record<string, string> = {
      wildcard: 'Wild Card',
      division: 'Division Series',
      championship: 'Championship',
      finals: 'Finals',
    };
    return labels[round] || round;
  };

  const renderMatchup = (matchup: MatchupSeries) => {
    const isComplete = matchup.winnerId !== undefined;
    const isCurrent = matchup.id === currentMatchupId;
    const team1IsWinner = matchup.winnerId === matchup.team1?.teamId;
    const team2IsWinner = matchup.winnerId === matchup.team2?.teamId;

    return (
      <div
        key={matchup.id}
        style={{
          ...styles.matchup,
          ...(isCurrent ? styles.currentMatchup : {}),
        }}
        onClick={() => onMatchupClick?.(matchup.id)}
      >
        {/* Team 1 */}
        <div
          style={{
            ...styles.team,
            ...(team1IsWinner ? styles.winnerTeam : {}),
            ...(isComplete && !team1IsWinner ? styles.loserTeam : {}),
          }}
        >
          {matchup.team1 ? (
            <>
              <span style={styles.seed}>{matchup.team1.seed}</span>
              <span style={styles.teamName}>{matchup.team1.teamName}</span>
              <span style={styles.seriesScore}>{matchup.team1Wins}</span>
            </>
          ) : (
            <span style={styles.tbd}>TBD</span>
          )}
        </div>

        {/* Team 2 */}
        <div
          style={{
            ...styles.team,
            ...(team2IsWinner ? styles.winnerTeam : {}),
            ...(isComplete && !team2IsWinner ? styles.loserTeam : {}),
          }}
        >
          {matchup.team2 ? (
            <>
              <span style={styles.seed}>{matchup.team2.seed}</span>
              <span style={styles.teamName}>{matchup.team2.teamName}</span>
              <span style={styles.seriesScore}>{matchup.team2Wins}</span>
            </>
          ) : (
            <span style={styles.tbd}>TBD</span>
          )}
        </div>

        {/* Series Status */}
        <div style={styles.seriesStatus}>
          {isComplete ? (
            <span style={styles.complete}>Final</span>
          ) : matchup.team1 && matchup.team2 ? (
            <span style={styles.inProgress}>
              Best of {matchup.gamesToWin * 2 - 1}
            </span>
          ) : (
            <span style={styles.pending}>Pending</span>
          )}
        </div>
      </div>
    );
  };

  // For 4-team bracket: semifinals + finals
  // For 8-team bracket: wildcard + division + championship + finals
  const rounds = teamCount === 4
    ? ['division', 'finals'] as const
    : ['wildcard', 'division', 'championship', 'finals'] as const;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Playoff Bracket</h2>

      <div style={styles.bracket}>
        {rounds.map((round, roundIndex) => {
          const roundMatchups = getRoundMatchups(round);
          if (roundMatchups.length === 0 && round !== 'finals') return null;

          return (
            <div key={round} style={styles.round}>
              <div style={styles.roundHeader}>
                <span style={styles.roundLabel}>{getRoundLabel(round)}</span>
                {round !== 'finals' && (
                  <span style={styles.roundCount}>
                    {roundMatchups.length} series
                  </span>
                )}
              </div>
              <div
                style={{
                  ...styles.matchupsList,
                  marginTop: roundIndex > 0 ? `${roundIndex * 24}px` : '0',
                }}
              >
                {roundMatchups.map(renderMatchup)}
                {roundMatchups.length === 0 && (
                  <div style={styles.emptyRound}>
                    Waiting for previous round
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: '#22c55e' }} />
          <span>Winner</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: '#3b82f6' }} />
          <span>In Progress</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: '#64748b' }} />
          <span>Eliminated</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
  },
  title: {
    margin: '0 0 24px 0',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#fff',
    textAlign: 'center',
  },
  bracket: {
    display: 'flex',
    gap: '24px',
    overflowX: 'auto',
    padding: '20px 0',
  },
  round: {
    minWidth: '200px',
    flex: 1,
  },
  roundHeader: {
    marginBottom: '16px',
    textAlign: 'center',
  },
  roundLabel: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  roundCount: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  matchupsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  matchup: {
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #334155',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  currentMatchup: {
    borderColor: '#3b82f6',
    boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)',
  },
  team: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    borderBottom: '1px solid #334155',
  },
  winnerTeam: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  loserTeam: {
    opacity: 0.5,
  },
  seed: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#94a3b8',
  },
  teamName: {
    flex: 1,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  seriesScore: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#fff',
    minWidth: '20px',
    textAlign: 'center',
  },
  tbd: {
    flex: 1,
    fontSize: '0.8125rem',
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  seriesStatus: {
    padding: '6px 12px',
    backgroundColor: '#0f172a',
    textAlign: 'center',
  },
  complete: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#22c55e',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  inProgress: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  pending: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontStyle: 'italic',
  },
  emptyRound: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '0.875rem',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    border: '1px dashed #334155',
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginTop: '24px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.8125rem',
    color: '#94a3b8',
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
};
