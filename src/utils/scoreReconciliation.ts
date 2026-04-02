import { getGameEvents, type AtBatEvent } from './eventLog';

export interface ReconciledScore {
  away: number;
  home: number;
}

export interface ScoreComparison {
  current: ReconciledScore;
  reconciled: ReconciledScore;
  awayDelta: number;
  homeDelta: number;
  needsCorrection: boolean;
}

function getRunsScoredCount(event: Pick<AtBatEvent, 'runsScored'>): number {
  return Array.isArray(event.runsScored) ? event.runsScored.length : event.runsScored;
}

export async function reconcileScoreFromEvents(gameId: string): Promise<ReconciledScore> {
  const events = await getGameEvents(gameId);

  return events.reduce<ReconciledScore>((score, event) => {
    const runsScored = getRunsScoredCount(event);
    if (runsScored <= 0) {
      return score;
    }

    if (event.halfInning === 'TOP') {
      score.away += runsScored;
    } else {
      score.home += runsScored;
    }

    return score;
  }, { away: 0, home: 0 });
}

export function compareScores(
  current: ReconciledScore,
  reconciled: ReconciledScore,
): ScoreComparison {
  const awayDelta = reconciled.away - current.away;
  const homeDelta = reconciled.home - current.home;

  return {
    current,
    reconciled,
    awayDelta,
    homeDelta,
    needsCorrection: awayDelta !== 0 || homeDelta !== 0,
  };
}
