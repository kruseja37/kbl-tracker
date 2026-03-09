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
  const qualifiedRunners = stats.filter((player) => (player.stolenBases || 0) >= 1);
  const qualifiedClutch = stats.filter((player) => (player.rbi || 0) >= 1);

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
        `${formatRate(bestPitcher.era || 0)} ERA, ${bestPitcher.pitchingGames || 0} G, ${bestPitcher.inningsPitched || 0} IP`
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

  return awards;
}
