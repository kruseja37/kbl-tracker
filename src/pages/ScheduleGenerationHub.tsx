/**
 * ScheduleGenerationHub - Schedule Generation phase
 * Per Ralph Framework S-E001
 *
 * Features:
 * - Season length selection (32/48/64/128 games)
 * - Generate schedule button
 * - Start new season button after generation
 */

import { useState, useMemo } from 'react';

interface ScheduledGame {
  gameNumber: number;
  awayTeamId: string;
  awayTeamName: string;
  homeTeamId: string;
  homeTeamName: string;
  isPlayed: boolean;
  date?: string;
}

interface Team {
  teamId: string;
  teamName: string;
}

interface ScheduleGenerationHubProps {
  teams: Team[];
  currentSeason: number;
  onStartSeason: (schedule: ScheduledGame[], seasonLength: number) => void;
}

type SeasonLength = 32 | 48 | 64 | 128;

const SEASON_LENGTH_OPTIONS: { value: SeasonLength; label: string }[] = [
  { value: 32, label: '32 games - Quick Season' },
  { value: 48, label: '48 games - Short Season' },
  { value: 64, label: '64 games - Half Season' },
  { value: 128, label: '128 games - Full Season' },
];

function generateSchedule(teams: Team[], gamesPerTeam: SeasonLength): ScheduledGame[] {
  const schedule: ScheduledGame[] = [];
  const numTeams = teams.length;

  if (numTeams < 2) {
    return schedule;
  }

  // Calculate games per matchup based on season length
  const totalMatchups = (numTeams * (numTeams - 1)) / 2;
  const seriesPerMatchup = Math.ceil(gamesPerTeam / (numTeams - 1));
  const totalGames = totalMatchups * seriesPerMatchup;

  let gameNumber = 1;

  // Round-robin: each team plays each other team
  for (let round = 0; round < seriesPerMatchup; round++) {
    for (let i = 0; i < numTeams; i++) {
      for (let j = i + 1; j < numTeams; j++) {
        // Alternate home/away based on round
        const homeTeam = round % 2 === 0 ? teams[i] : teams[j];
        const awayTeam = round % 2 === 0 ? teams[j] : teams[i];

        schedule.push({
          gameNumber: gameNumber++,
          awayTeamId: awayTeam.teamId,
          awayTeamName: awayTeam.teamName,
          homeTeamId: homeTeam.teamId,
          homeTeamName: homeTeam.teamName,
          isPlayed: false,
        });

        if (gameNumber > totalGames) break;
      }
      if (gameNumber > totalGames) break;
    }
    if (gameNumber > totalGames) break;
  }

  // Shuffle for variety (Fisher-Yates)
  for (let i = schedule.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [schedule[i], schedule[j]] = [schedule[j], schedule[i]];
  }

  // Re-number after shuffle
  schedule.forEach((game, index) => {
    game.gameNumber = index + 1;
  });

  return schedule.slice(0, gamesPerTeam);
}

export default function ScheduleGenerationHub({
  teams,
  currentSeason,
  onStartSeason,
}: ScheduleGenerationHubProps) {
  const [seasonLength, setSeasonLength] = useState<SeasonLength>(64);
  const [generatedSchedule, setGeneratedSchedule] = useState<ScheduledGame[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSchedule = () => {
    setIsGenerating(true);
    // Simulate slight delay for UX
    setTimeout(() => {
      const schedule = generateSchedule(teams, seasonLength);
      setGeneratedSchedule(schedule);
      setIsGenerating(false);
    }, 500);
  };

  const handleStartSeason = () => {
    if (generatedSchedule) {
      onStartSeason(generatedSchedule, seasonLength);
    }
  };

  const schedulePreview = useMemo(() => {
    if (!generatedSchedule) return [];
    return generatedSchedule.slice(0, 5);
  }, [generatedSchedule]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Schedule Generation</h1>
        <div style={styles.seasonBadge}>Season {currentSeason + 1}</div>
      </div>

      {/* Configuration */}
      <div style={styles.configCard}>
        <div style={styles.configTitle}>Season Configuration</div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Season Length</label>
          <select
            style={styles.select}
            value={seasonLength}
            onChange={(e) => {
              setSeasonLength(Number(e.target.value) as SeasonLength);
              setGeneratedSchedule(null);
            }}
            disabled={generatedSchedule !== null}
          >
            {SEASON_LENGTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.teamCount}>
          {teams.length} teams in league
        </div>

        {!generatedSchedule && (
          <button
            style={styles.generateButton}
            onClick={handleGenerateSchedule}
            disabled={isGenerating || teams.length < 2}
          >
            {isGenerating ? 'Generating...' : 'Generate Schedule'}
          </button>
        )}
      </div>

      {/* Schedule Preview */}
      {generatedSchedule && (
        <div style={styles.previewCard}>
          <div style={styles.previewTitle}>
            Schedule Generated - {generatedSchedule.length} Games
          </div>

          <div style={styles.previewList}>
            {schedulePreview.map((game) => (
              <div key={game.gameNumber} style={styles.previewGame}>
                <span style={styles.gameNumber}>#{game.gameNumber}</span>
                <span style={styles.matchup}>
                  {game.awayTeamName} @ {game.homeTeamName}
                </span>
              </div>
            ))}
            {generatedSchedule.length > 5 && (
              <div style={styles.moreGames}>
                ...and {generatedSchedule.length - 5} more games
              </div>
            )}
          </div>

          <div style={styles.startSection}>
            <div style={styles.readyMessage}>
              ⚾ Ready to start Season {currentSeason + 1}!
            </div>
            <button style={styles.startButton} onClick={handleStartSeason}>
              Start New Season
            </button>
          </div>
        </div>
      )}

      {teams.length < 2 && (
        <div style={styles.warning}>
          Need at least 2 teams to generate a schedule.
        </div>
      )}
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
    maxWidth: '600px',
    margin: '0 auto 32px',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 900,
    color: '#fff',
  },
  seasonBadge: {
    padding: '8px 20px',
    backgroundColor: '#3b82f6',
    borderRadius: '100px',
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#fff',
  },
  configCard: {
    maxWidth: '500px',
    margin: '0 auto 24px',
    padding: '32px',
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    border: '1px solid #334155',
  },
  configTitle: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '24px',
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    color: '#94a3b8',
    marginBottom: '8px',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  teamCount: {
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '24px',
  },
  generateButton: {
    width: '100%',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  previewCard: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '32px',
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    border: '2px solid #22c55e',
  },
  previewTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#22c55e',
    textAlign: 'center',
    marginBottom: '24px',
  },
  previewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '24px',
  },
  previewGame: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
  },
  gameNumber: {
    fontSize: '0.75rem',
    color: '#64748b',
    minWidth: '32px',
  },
  matchup: {
    fontSize: '0.875rem',
    color: '#e2e8f0',
  },
  moreGames: {
    textAlign: 'center',
    fontSize: '0.8125rem',
    color: '#64748b',
    fontStyle: 'italic',
    padding: '8px',
  },
  startSection: {
    textAlign: 'center',
    paddingTop: '16px',
    borderTop: '1px solid #334155',
  },
  readyMessage: {
    fontSize: '1rem',
    color: '#e2e8f0',
    marginBottom: '16px',
  },
  startButton: {
    padding: '16px 48px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1.125rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  warning: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '16px',
    backgroundColor: '#7c2d12',
    borderRadius: '8px',
    color: '#fbbf24',
    textAlign: 'center',
    fontSize: '0.875rem',
  },
};
