import { getPercentile } from './percentile';

export interface TvFamilyValueInput {
  playerId: string;
  valueDelta: number;
  trueValue: number;
}

export interface TvFamilySnapshotInput {
  playerId: string;
  checkpoint: string | number;
  trueValue: number;
}

export interface TvFamilyCandidate {
  playerId: string;
  score: number;
  percentile: number;
  rank: number;
}

export interface FranchiseTvFamilyResult {
  kk: TvFamilyCandidate[];
  bust: TvFamilyCandidate[];
  comeback: TvFamilyCandidate[];
}

export function computeFranchiseTvFamilyRaces(input: {
  values: readonly TvFamilyValueInput[];
  snapshots: readonly TvFamilySnapshotInput[];
}): FranchiseTvFamilyResult {
  const snapshotsByPlayer = groupSnapshotsByPlayer(input.snapshots);

  return {
    kk: rankCandidates(input.values.map((value) => ({
      playerId: value.playerId,
      score: value.valueDelta,
    }))),
    bust: rankCandidates(input.values.map((value) => ({
      playerId: value.playerId,
      score: -value.valueDelta,
    }))),
    comeback: rankCandidates(input.values.map((value) => {
      const playerSnapshots = snapshotsByPlayer.get(value.playerId) ?? [];
      const seasonLow = Math.min(value.trueValue, ...playerSnapshots.map((snapshot) => snapshot.trueValue));

      return {
        playerId: value.playerId,
        score: value.trueValue - seasonLow,
      };
    })),
  };
}

function groupSnapshotsByPlayer(
  snapshots: readonly TvFamilySnapshotInput[],
): Map<string, TvFamilySnapshotInput[]> {
  const grouped = new Map<string, TvFamilySnapshotInput[]>();

  for (const snapshot of snapshots) {
    const existing = grouped.get(snapshot.playerId) ?? [];
    existing.push(snapshot);
    grouped.set(snapshot.playerId, existing);
  }

  return grouped;
}

function rankCandidates(
  rawCandidates: Array<Omit<TvFamilyCandidate, 'percentile' | 'rank'>>,
): TvFamilyCandidate[] {
  const scoresAscending = rawCandidates
    .map((candidate) => candidate.score)
    .sort((left, right) => left - right);

  return rawCandidates
    .map((candidate) => ({
      ...candidate,
      percentile: getPercentile(candidate.score, scoresAscending),
      rank: 0,
    }))
    .sort((left, right) => {
      const scoreOrder = right.score - left.score;
      return scoreOrder || left.playerId.localeCompare(right.playerId);
    })
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));
}
