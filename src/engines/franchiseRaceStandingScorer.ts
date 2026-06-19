import { getPercentile } from './percentile';
import { FAME_TIER_RANK, resolveFameTier } from './fameModel';

export interface RaceStandingCandidate {
  playerId: string;
  meritScore: number;
  fameHeat: number;
  fameReachFloor: number;
}

export interface RaceWeightProfile {
  wMerit: number;
  wFame: number;
  fameAlwaysOn: boolean;
  tiltWindow: number;
  meritFloor: number;
  bandGap: number;
}

export interface RaceStanding {
  playerId: string;
  meritScore: number;
  fameRank: number;
  fameActive: boolean;
  composite: number;
  marginToWinner: number;
  band: number;
  rank: number;
}

export const MERIT_RACE_WEIGHTS: RaceWeightProfile = {
  // Simulation-Gate placeholder: merit is the primary award-race signal.
  wMerit: 1,
  // Simulation-Gate placeholder: fame is a bounded close-race nudge.
  wFame: 0.15,
  fameAlwaysOn: false,
  // Simulation-Gate placeholder: merit-unit window for close-race fame tilt.
  tiltWindow: 0.5,
  // Simulation-Gate placeholder: minimum merit required before fame can tilt.
  meritFloor: 1,
  // Simulation-Gate placeholder: composite-score gap that starts a new band.
  bandGap: 0.08,
};

export const FAN_VOTE_WEIGHTS: RaceWeightProfile = {
  // Simulation-Gate placeholder: fan-vote races keep merit as a minority signal.
  wMerit: 0.35,
  // Simulation-Gate placeholder: fan-vote races are fame-led.
  wFame: 0.65,
  fameAlwaysOn: true,
  // Simulation-Gate placeholder: always-on fame makes the close-race window irrelevant.
  tiltWindow: Number.POSITIVE_INFINITY,
  // Simulation-Gate placeholder: always-on fame makes the merit floor irrelevant.
  meritFloor: Number.NEGATIVE_INFINITY,
  // Simulation-Gate placeholder: composite-score gap that starts a new band.
  bandGap: 0.08,
};

export function computeFranchiseRaceStanding(input: {
  candidates: readonly RaceStandingCandidate[];
  weights: RaceWeightProfile;
}): RaceStanding[] {
  if (input.candidates.length === 0) {
    return [];
  }

  const candidatesWithFame = input.candidates.map((candidate) => ({
    ...candidate,
    fameRank: FAME_TIER_RANK[resolveFameTier(candidate.fameHeat, candidate.fameReachFloor)],
  }));
  const meritScoresAsc = candidatesWithFame
    .map((candidate) => candidate.meritScore)
    .sort((left, right) => left - right);
  const fameRanksAsc = candidatesWithFame
    .map((candidate) => candidate.fameRank)
    .sort((left, right) => left - right);
  const leaderMeritScore = Math.max(...candidatesWithFame.map((candidate) => candidate.meritScore));

  const scored = candidatesWithFame
    .map((candidate) => {
      const meritNorm = getPercentile(candidate.meritScore, meritScoresAsc);
      const fameNorm = getPercentile(candidate.fameRank, fameRanksAsc);
      const marginToWinner = round3(candidate.meritScore - leaderMeritScore);
      const fameActive = input.weights.fameAlwaysOn || (
        Math.abs(marginToWinner) < input.weights.tiltWindow &&
        candidate.meritScore > input.weights.meritFloor &&
        leaderMeritScore > input.weights.meritFloor
      );
      const composite = round6(
        (input.weights.wMerit * meritNorm) +
        (fameActive ? input.weights.wFame * fameNorm : 0),
      );

      return {
        playerId: candidate.playerId,
        meritScore: candidate.meritScore,
        fameRank: candidate.fameRank,
        fameActive,
        composite,
        marginToWinner,
        band: 0,
        rank: 0,
      };
    })
    .sort((left, right) =>
      right.composite - left.composite ||
      right.meritScore - left.meritScore ||
      left.playerId.localeCompare(right.playerId),
    );

  let currentBand = 1;
  return scored.map((candidate, index) => {
    if (
      index > 0 &&
      (scored[index - 1].composite - candidate.composite) > input.weights.bandGap
    ) {
      currentBand += 1;
    }

    return {
      ...candidate,
      band: currentBand,
      rank: index + 1,
    };
  });
}

const round3 = (value: number): number => Number(value.toFixed(3));
const round6 = (value: number): number => Math.round(value * 1e6) / 1e6;
