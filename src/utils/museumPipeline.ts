/**
 * Museum Data Pipeline
 *
 * Populates museum stores from career/season data.
 * MVP: Reads career batting/pitching stats and writes AllTimeLeader records.
 *
 * Called on-demand from useMuseumData when museum is empty but career data exists.
 */

import {
  getAllCareerBatting,
  getAllCareerPitching,
  calcCareerBattingAvg,
  calcCareerERA,
  type PlayerCareerBatting,
  type PlayerCareerPitching,
} from './careerStorage';

import {
  initMuseumDatabase,
  saveAllTimeLeader,
  generateMuseumId,
  type AllTimeLeader,
} from './museumStorage';

/**
 * Build AllTimeLeader record from career batting stats
 */
function battingToLeader(player: PlayerCareerBatting): AllTimeLeader {
  const avg = calcCareerBattingAvg(player);
  return {
    id: generateMuseumId('leader'),
    playerId: player.playerId,
    name: player.playerName,
    teamId: player.teamId,
    teamName: '', // filled by caller if available
    category: 'batting',
    war: player.totalWAR,
    pwar: 0,
    bwar: player.bWAR,
    rwar: player.rWAR,
    fwar: player.fWAR,
    avg: avg,
    hr: player.homeRuns,
    rbi: player.rbi,
    hits: player.hits,
    sb: player.stolenBases,
    lastUpdated: Date.now(),
  };
}

/**
 * Build AllTimeLeader record from career pitching stats
 */
function pitchingToLeader(player: PlayerCareerPitching): AllTimeLeader {
  const era = calcCareerERA(player);
  return {
    id: generateMuseumId('leader'),
    playerId: player.playerId,
    name: player.playerName,
    teamId: player.teamId,
    teamName: '', // filled by caller if available
    category: 'pitching',
    war: player.pWAR,
    pwar: player.pWAR,
    bwar: 0,
    rwar: 0,
    fwar: 0,
    era: era,
    wins: player.wins,
    strikeouts: player.strikeouts,
    saves: player.saves,
    lastUpdated: Date.now(),
  };
}

/**
 * Populate museum all-time leaders from career data.
 * Reads all career batting + pitching, converts to AllTimeLeader records,
 * and saves to museum storage. Idempotent — overwrites previous leaders.
 *
 * @returns Number of leader records written
 */
export async function populateMuseumLeaders(): Promise<number> {
  await initMuseumDatabase();

  const [batters, pitchers] = await Promise.all([
    getAllCareerBatting(),
    getAllCareerPitching(),
  ]);

  let count = 0;

  // Write batting leaders (only players with at least 1 game)
  for (const batter of batters) {
    if (batter.games > 0) {
      const leader = battingToLeader(batter);
      await saveAllTimeLeader(leader);
      count++;
    }
  }

  // Write pitching leaders (only pitchers with at least 1 game)
  for (const pitcher of pitchers) {
    if (pitcher.games > 0) {
      const leader = pitchingToLeader(pitcher);
      await saveAllTimeLeader(leader);
      count++;
    }
  }

  console.log(`[museumPipeline] Populated ${count} all-time leaders (${batters.length} batters, ${pitchers.length} pitchers)`);
  return count;
}
