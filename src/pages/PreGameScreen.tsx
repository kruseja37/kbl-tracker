/**
 * PreGameScreen - Shows matchup info before game starts
 * Per S-B001
 */

import { useNavigate } from 'react-router-dom';
import { getTeam } from '../data/playerDatabase';

interface PreGameScreenProps {
  awayTeamId: string;
  homeTeamId: string;
  stadiumName?: string;
  onStartGame: () => void;
}

export default function PreGameScreen({
  awayTeamId,
  homeTeamId,
  stadiumName = 'Home Stadium',
  onStartGame,
}: PreGameScreenProps) {
  const navigate = useNavigate();
  const awayTeam = getTeam(awayTeamId);
  const homeTeam = getTeam(homeTeamId);

  const handleStartGame = () => {
    onStartGame();
    navigate('/game');
  };

  return (
    <div style={styles.container}>
      {/* Stadium Banner */}
      <div style={styles.stadiumBanner}>
        <span style={styles.stadiumIcon}>🏟️</span>
        <span style={styles.stadiumName}>{stadiumName}</span>
      </div>

      {/* Matchup Header */}
      <div style={styles.matchupHeader}>
        <span style={styles.gameLabel}>TODAY'S MATCHUP</span>
      </div>

      {/* Teams Display */}
      <div style={styles.teamsContainer}>
        {/* Away Team */}
        <div style={styles.teamCard}>
          <div style={styles.teamLabel}>AWAY</div>
          <div style={styles.teamName}>{awayTeam?.name || awayTeamId}</div>
          <div style={styles.teamRecord}>--</div>
        </div>

        {/* VS Divider */}
        <div style={styles.vsContainer}>
          <span style={styles.atSymbol}>@</span>
        </div>

        {/* Home Team */}
        <div style={styles.teamCard}>
          <div style={styles.teamLabel}>HOME</div>
          <div style={styles.teamName}>{homeTeam?.name || homeTeamId}</div>
          <div style={styles.teamRecord}>--</div>
        </div>
      </div>

      {/* Start Game Button */}
      <button style={styles.startButton} onClick={handleStartGame}>
        Start Game
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    gap: '24px',
  },
  stadiumBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#1e293b',
    padding: '12px 24px',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  stadiumIcon: {
    fontSize: '24px',
  },
  stadiumName: {
    color: '#94a3b8',
    fontSize: '16px',
    fontWeight: 500,
  },
  matchupHeader: {
    textAlign: 'center',
  },
  gameLabel: {
    color: '#64748b',
    fontSize: '12px',
    letterSpacing: '2px',
    fontWeight: 600,
  },
  teamsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  teamCard: {
    backgroundColor: '#1e293b',
    padding: '32px 48px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid #334155',
    minWidth: '200px',
  },
  teamLabel: {
    color: '#64748b',
    fontSize: '10px',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  teamName: {
    color: '#f1f5f9',
    fontSize: '28px',
    fontWeight: 700,
    marginBottom: '8px',
  },
  teamRecord: {
    color: '#64748b',
    fontSize: '14px',
  },
  vsContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  atSymbol: {
    color: '#475569',
    fontSize: '32px',
    fontWeight: 700,
  },
  startButton: {
    backgroundColor: '#22c55e',
    color: '#000',
    fontSize: '18px',
    fontWeight: 700,
    padding: '16px 48px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '24px',
    transition: 'background-color 0.2s',
  },
};
