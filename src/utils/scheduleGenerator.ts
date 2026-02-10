/**
 * Schedule Generator — Pure Function
 *
 * Generates a round-robin season schedule for a set of teams.
 * Extracted from ScheduleGenerationHub.tsx for reuse by franchise initialization.
 *
 * Algorithm:
 * 1. Calculate series per matchup based on games/team and team count
 * 2. Round-robin: each team plays each other team
 * 3. Alternate home/away between rounds
 * 4. Fisher-Yates shuffle for variety
 * 5. Re-number and slice to exact season length
 */

export interface ScheduleTeam {
  teamId: string;
  teamName: string;
}

export interface GeneratedGame {
  gameNumber: number;
  awayTeamId: string;
  awayTeamName: string;
  homeTeamId: string;
  homeTeamName: string;
}

/**
 * Generate a balanced round-robin schedule.
 *
 * @param teams — Array of teams to schedule
 * @param gamesPerTeam — Number of games each team plays (season length)
 * @returns Array of GeneratedGame, length = gamesPerTeam * teams.length / 2
 */
export function generateSchedule(
  teams: ScheduleTeam[],
  gamesPerTeam: number,
): GeneratedGame[] {
  const schedule: GeneratedGame[] = [];
  const numTeams = teams.length;

  if (numTeams < 2) {
    return schedule;
  }

  // Calculate games per matchup based on season length
  const seriesPerMatchup = Math.ceil(gamesPerTeam / (numTeams - 1));

  let gameNumber = 1;
  const totalGamesTarget = (gamesPerTeam * numTeams) / 2;

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
        });

        if (gameNumber > totalGamesTarget) break;
      }
      if (gameNumber > totalGamesTarget) break;
    }
    if (gameNumber > totalGamesTarget) break;
  }

  // Fisher-Yates shuffle for variety
  for (let i = schedule.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [schedule[i], schedule[j]] = [schedule[j], schedule[i]];
  }

  // Re-number after shuffle
  schedule.forEach((game, index) => {
    game.gameNumber = index + 1;
  });

  // Slice to exact season length (total league games = gamesPerTeam * numTeams / 2)
  const totalLeagueGames = Math.floor((gamesPerTeam * numTeams) / 2);
  return schedule.slice(0, totalLeagueGames);
}
