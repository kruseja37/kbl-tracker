/**
 * PreGameScreen - Shows matchup info before game starts
 * Per S-B001, S-B002
 */

import { useNavigate } from 'react-router-dom';
import { getTeam, getTeamRotation, type PlayerData } from '../data/playerDatabase';

interface PitcherStats {
  wins: number;
  losses: number;
  era: number;
}

interface PreGameScreenProps {
  awayTeamId: string;
  homeTeamId: string;
  awayStarterId?: string;  // If not provided, uses first in rotation
  homeStarterId?: string;  // If not provided, uses first in rotation
  stadiumName?: string;
  onStartGame: () => void;
}

// Get pitcher season stats (placeholder - returns default for new season)
function getPitcherStats(_pitcherId: string): PitcherStats {
  // TODO: Wire to actual season storage when available
  return { wins: 0, losses: 0, era: 0.00 };
}

// Format ERA with 2 decimal places
function formatERA(era: number): string {
  return era.toFixed(2);
}

export default function PreGameScreen({
  awayTeamId,
  homeTeamId,
  awayStarterId,
  homeStarterId,
  stadiumName = 'Home Stadium',
  onStartGame,
}: PreGameScreenProps) {
  const navigate = useNavigate();
  const awayTeam = getTeam(awayTeamId);
  const homeTeam = getTeam(homeTeamId);

  // Get starting pitchers
  const awayRotation = getTeamRotation(awayTeamId);
  const homeRotation = getTeamRotation(homeTeamId);

  const awayStarter: PlayerData | undefined = awayStarterId
    ? awayRotation.find(p => p.id === awayStarterId)
    : awayRotation[0];
  const homeStarter: PlayerData | undefined = homeStarterId
    ? homeRotation.find(p => p.id === homeStarterId)
    : homeRotation[0];

  const awayPitcherStats = awayStarter ? getPitcherStats(awayStarter.id) : null;
  const homePitcherStats = homeStarter ? getPitcherStats(homeStarter.id) : null;

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

      {/* Pitching Matchup */}
      <div style={styles.pitchingSection}>
        <div style={styles.pitchingHeader}>STARTING PITCHERS</div>
        <div style={styles.pitchersContainer}>
          {/* Away Starter */}
          <div style={styles.pitcherCard}>
            <div style={styles.pitcherName}>{awayStarter?.name || 'TBD'}</div>
            {awayPitcherStats && (
              <div style={styles.pitcherStats}>
                <span style={styles.statRecord}>
                  {awayPitcherStats.wins}-{awayPitcherStats.losses}
                </span>
                <span style={styles.statDivider}>|</span>
                <span style={styles.statEra}>
                  {formatERA(awayPitcherStats.era)} ERA
                </span>
              </div>
            )}
          </div>

          {/* VS */}
          <div style={styles.pitcherVs}>vs</div>

          {/* Home Starter */}
          <div style={styles.pitcherCard}>
            <div style={styles.pitcherName}>{homeStarter?.name || 'TBD'}</div>
            {homePitcherStats && (
              <div style={styles.pitcherStats}>
                <span style={styles.statRecord}>
                  {homePitcherStats.wins}-{homePitcherStats.losses}
                </span>
                <span style={styles.statDivider}>|</span>
                <span style={styles.statEra}>
                  {formatERA(homePitcherStats.era)} ERA
                </span>
              </div>
            )}
          </div>
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
  pitchingSection: {
    marginTop: '16px',
    textAlign: 'center',
  },
  pitchingHeader: {
    color: '#64748b',
    fontSize: '11px',
    letterSpacing: '1.5px',
    fontWeight: 600,
    marginBottom: '12px',
  },
  pitchersContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
  },
  pitcherCard: {
    backgroundColor: '#1e293b',
    padding: '16px 24px',
    borderRadius: '8px',
    border: '1px solid #334155',
    minWidth: '180px',
    textAlign: 'center',
  },
  pitcherName: {
    color: '#e2e8f0',
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  pitcherStats: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  statRecord: {
    color: '#94a3b8',
    fontSize: '14px',
    fontWeight: 500,
  },
  statDivider: {
    color: '#475569',
    fontSize: '14px',
  },
  statEra: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  pitcherVs: {
    color: '#475569',
    fontSize: '16px',
    fontWeight: 600,
  },
};
