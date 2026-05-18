import { getAllCompletedGames } from './gameStorage';
import {
  getPlayoffStats,
  getSeriesByPlayoff,
  type PlayoffPlayerStats,
} from './playoffStorage';

export interface EliminationAward {
  category: string;
  playerName: string;
  playerId: string;
  teamId: string;
  statLine: string;
}

function formatRate(value: number): string {
  return value.toFixed(3);
}

function formatSignedRate(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}

function formatEra(value: number): string {
  return value.toFixed(2);
}

function formatInningsPitched(value: number): string {
  const outs = Math.round(value * 3);
  const innings = Math.floor(outs / 3);
  const partialOuts = outs % 3;
  return partialOuts === 0 ? String(innings) : `${innings}.${partialOuts}`;
}

function buildAward(
  category: string,
  player: PlayoffPlayerStats,
  statLine: string
): EliminationAward {
  return {
    category,
    playerName: player.playerName,
    playerId: player.playerId,
    teamId: player.teamId,
    statLine,
  };
}

export async function computeEliminationAwards(playoffId: string): Promise<EliminationAward[]> {
  const [stats, seriesList, completedGames] = await Promise.all([
    getPlayoffStats(playoffId),
    getSeriesByPlayoff(playoffId),
    getAllCompletedGames(),
  ]);
  const awards: EliminationAward[] = [];

  const qualifiedBatters = stats.filter((player) => player.atBats >= 5);
  const qualifiedPitchers = stats.filter(
    (player) => (player.pitchingGames || 0) >= 2 && (player.inningsPitched || 0) >= 3
  );
  const qualifiedRunners = stats.filter((player) => (player.stolenBases || 0) >= 1);
  const qualifiedClutch = stats.filter((player) => (player.rbi || 0) >= 1);
  const qualifiedFielders = stats.filter(
    (player) => typeof player.fieldingWAR === 'number' && typeof player.fieldingPlays === 'number' && player.fieldingPlays >= 2
  );

  const postseasonMvp = [...qualifiedBatters].sort((a, b) => {
    if ((b.ops || 0) !== (a.ops || 0)) return (b.ops || 0) - (a.ops || 0);
    return (b.rbi || 0) - (a.rbi || 0);
  })[0];
  if (postseasonMvp) {
    awards.push(
      buildAward(
        'Postseason MVP',
        postseasonMvp,
        `${formatRate(postseasonMvp.ops)} OPS, ${postseasonMvp.hits} H, ${postseasonMvp.rbi} RBI`
      )
    );
  }

  const bestPitcher = [...qualifiedPitchers].sort((a, b) => {
    if ((a.era || 0) !== (b.era || 0)) return (a.era || 0) - (b.era || 0);
    return (b.pitchingStrikeouts || 0) - (a.pitchingStrikeouts || 0);
  })[0];
  if (bestPitcher) {
    awards.push(
      buildAward(
        'Best Pitcher',
        bestPitcher,
        `${formatEra(bestPitcher.era || 0)} ERA, ${bestPitcher.pitchingGames || 0} G, ${formatInningsPitched(bestPitcher.inningsPitched || 0)} IP`
      )
    );
  }

  const bestRunner = [...qualifiedRunners].sort((a, b) => {
    if ((b.stolenBases || 0) !== (a.stolenBases || 0)) return (b.stolenBases || 0) - (a.stolenBases || 0);
    return (b.runs || 0) - (a.runs || 0);
  })[0];
  if (bestRunner) {
    awards.push(
      buildAward(
        'Best Runner',
        bestRunner,
        `${bestRunner.stolenBases || 0} SB, ${bestRunner.runs || 0} R, ${bestRunner.hits || 0} H`
      )
    );
  }

  const clutchPerformer = [...qualifiedClutch].sort((a, b) => {
    if ((b.rbi || 0) !== (a.rbi || 0)) return (b.rbi || 0) - (a.rbi || 0);
    return (b.ops || 0) - (a.ops || 0);
  })[0];
  if (clutchPerformer) {
    awards.push(
      buildAward(
        'Clutch Performer',
        clutchPerformer,
        `${clutchPerformer.rbi} RBI, ${clutchPerformer.hits} H, ${formatRate(clutchPerformer.ops)} OPS`
      )
    );
  }

  const bestFielder = [...qualifiedFielders].sort((a, b) => {
    if ((b.fieldingWAR || 0) !== (a.fieldingWAR || 0)) return (b.fieldingWAR || 0) - (a.fieldingWAR || 0);
    if ((b.fieldingRunsSaved || 0) !== (a.fieldingRunsSaved || 0)) return (b.fieldingRunsSaved || 0) - (a.fieldingRunsSaved || 0);
    return (b.fieldingPlays || 0) - (a.fieldingPlays || 0);
  })[0];
  if (bestFielder) {
    awards.push(
      buildAward(
        'Best Fielder',
        bestFielder,
        `${bestFielder.fieldingPrimaryPosition || 'DEF'} · ${formatSignedRate(bestFielder.fieldingWAR || 0)} fWAR · ${formatSignedRate(bestFielder.fieldingRunsSaved || 0)} RS`
      )
    );
  }

  const seriesAwards = seriesList
    .filter((series) => series.status === 'COMPLETED')
    .map((series) => {
      const seriesGames = completedGames.filter(
        (game) => game.playoffSeriesId === series.id,
      );
      const byPlayer = new Map<
        string,
        {
          playerName: string;
          teamId: string;
          hits: number;
          homeRuns: number;
          rbi: number;
          runs: number;
          atBats: number;
          walks: number;
          outsRecorded: number;
          earnedRuns: number;
          strikeouts: number;
        }
      >();

      for (const game of seriesGames) {
        for (const [playerId, batting] of Object.entries(game.playerStats)) {
          const current =
            byPlayer.get(playerId) ??
            {
              playerName: batting.playerName,
              teamId: batting.teamId,
              hits: 0,
              homeRuns: 0,
              rbi: 0,
              runs: 0,
              atBats: 0,
              walks: 0,
              outsRecorded: 0,
              earnedRuns: 0,
              strikeouts: 0,
            };
          current.playerName = batting.playerName;
          current.teamId = batting.teamId;
          current.hits += batting.h;
          current.homeRuns += batting.hr;
          current.rbi += batting.rbi;
          current.runs += batting.r;
          current.atBats += batting.ab;
          current.walks += batting.bb;
          byPlayer.set(playerId, current);
        }

        for (const pitcher of game.pitcherGameStats) {
          const current =
            byPlayer.get(pitcher.pitcherId) ??
            {
              playerName: pitcher.pitcherName,
              teamId: pitcher.teamId,
              hits: 0,
              homeRuns: 0,
              rbi: 0,
              runs: 0,
              atBats: 0,
              walks: 0,
              outsRecorded: 0,
              earnedRuns: 0,
              strikeouts: 0,
            };
          current.playerName = pitcher.pitcherName;
          current.teamId = pitcher.teamId;
          current.outsRecorded += pitcher.outsRecorded;
          current.earnedRuns += pitcher.earnedRuns;
          current.strikeouts += pitcher.strikeoutsThrown;
          byPlayer.set(pitcher.pitcherId, current);
        }
      }

      const winner = [...byPlayer.entries()]
        .map(([playerId, player]) => {
          const battingScore =
            player.hits +
            player.rbi +
            player.runs +
            player.homeRuns * 2 +
            (player.atBats > 0 ? (player.hits + player.walks) / player.atBats : 0);
          const pitchingScore =
            player.outsRecorded / 3 + player.strikeouts * 0.35 - player.earnedRuns * 1.5;
          const usePitchingLine = pitchingScore > battingScore;

          return {
            playerId,
            ...player,
            score: Math.max(battingScore, pitchingScore),
            statLine: usePitchingLine
              ? `${formatInningsPitched(player.outsRecorded / 3)} IP, ${player.strikeouts} K, ${player.earnedRuns} ER`
              : `${player.hits} H, ${player.homeRuns} HR, ${player.rbi} RBI`,
          };
        })
        .sort((a, b) => b.score - a.score || b.rbi - a.rbi || a.playerName.localeCompare(b.playerName))[0];

      if (!winner) {
        return null;
      }

      return {
        category: `Series MVP · ${series.roundName}`,
        playerName: winner.playerName,
        playerId: winner.playerId,
        teamId: winner.teamId,
        statLine: winner.statLine,
      } satisfies EliminationAward;
    })
    .filter((award): award is EliminationAward => award !== null);

  awards.push(...seriesAwards);

  return awards;
}
