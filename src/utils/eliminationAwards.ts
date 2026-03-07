import { getPlayoffStats, type PlayoffPlayerStats } from './playoffStorage';

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
  const stats = await getPlayoffStats(playoffId);
  const awards: EliminationAward[] = [];

  const qualifiedBatters = stats.filter((player) => player.atBats >= 5);
  const qualifiedPitchers = stats.filter(
    (player) => (player.pitchingGames || 0) >= 2 && (player.inningsPitched || 0) >= 3
  );

  const postseasonMvp = [...qualifiedBatters].sort((a, b) => (b.ops || 0) - (a.ops || 0))[0];
  if (postseasonMvp) {
    awards.push(
      buildAward(
        'Postseason MVP',
        postseasonMvp,
        `${formatRate(postseasonMvp.ops)} OPS, ${postseasonMvp.homeRuns} HR, ${postseasonMvp.rbi} RBI`
      )
    );
  }

  const bestPitcher = [...qualifiedPitchers].sort((a, b) => (a.era || 0) - (b.era || 0))[0];
  if (bestPitcher) {
    awards.push(
      buildAward(
        'Best Pitcher',
        bestPitcher,
        `${formatRate(bestPitcher.era || 0)} ERA, ${formatRate(bestPitcher.whip || 0)} WHIP, ${bestPitcher.pitchingStrikeouts || 0} K`
      )
    );
  }

  const bestHitter = [...qualifiedBatters].sort((a, b) => (b.avg || 0) - (a.avg || 0))[0];
  if (bestHitter) {
    awards.push(
      buildAward(
        'Best Hitter',
        bestHitter,
        `${formatRate(bestHitter.avg)} AVG, ${bestHitter.hits} H, ${bestHitter.runs} R`
      )
    );
  }

  const bestPower = [...stats]
    .filter((player) => player.atBats > 0)
    .sort((a, b) => (b.homeRuns || 0) - (a.homeRuns || 0))[0];
  if (bestPower) {
    awards.push(
      buildAward(
        'Best Power',
        bestPower,
        `${bestPower.homeRuns} HR, ${bestPower.hits} H, ${formatRate(bestPower.slg)} SLG`
      )
    );
  }

  const clutchPerformer = [...stats]
    .filter((player) => player.atBats > 0 || (player.rbi || 0) > 0)
    .sort((a, b) => (b.rbi || 0) - (a.rbi || 0))[0];
  if (clutchPerformer) {
    awards.push(
      buildAward(
        'Clutch Performer',
        clutchPerformer,
        `${clutchPerformer.rbi} RBI, ${clutchPerformer.hits} H, ${formatRate(clutchPerformer.ops)} OPS`
      )
    );
  }

  return awards;
}
