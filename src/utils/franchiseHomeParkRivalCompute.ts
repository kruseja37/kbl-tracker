export interface HomeParkRivalCandidate {
  teamId: string;
  winsAtPark: number;
  recordsHeld: number;
}

export interface ComputeHomeParkRivalInput {
  homeTeamId: string;
  candidates: HomeParkRivalCandidate[];
  distinctVisitorCount: number;
  currentRivalTeamId: string | null;
}

export interface ComputeHomeParkRivalResult {
  rivalTeamId: string | null;
  rivalWinsAtPark: number;
  rivalRecordsHeld: number;
  outcome: 'no-eligible' | 'crowned' | 'retained' | 'overtaken';
}

function normalizeCandidate(candidate: HomeParkRivalCandidate): HomeParkRivalCandidate {
  return {
    teamId: candidate.teamId,
    winsAtPark: Math.max(0, candidate.winsAtPark),
    recordsHeld: Math.max(0, candidate.recordsHeld),
  };
}

function compareCandidates(left: HomeParkRivalCandidate, right: HomeParkRivalCandidate): number {
  return (
    right.winsAtPark - left.winsAtPark ||
    right.recordsHeld - left.recordsHeld ||
    left.teamId.localeCompare(right.teamId)
  );
}

function strictlyOvertakes(challenger: HomeParkRivalCandidate, incumbent: HomeParkRivalCandidate): boolean {
  return (
    challenger.winsAtPark > incumbent.winsAtPark ||
    (challenger.winsAtPark === incumbent.winsAtPark && challenger.recordsHeld > incumbent.recordsHeld)
  );
}

export function computeHomeParkRival(input: ComputeHomeParkRivalInput): ComputeHomeParkRivalResult {
  const candidates = input.candidates
    .map(normalizeCandidate)
    .filter((candidate) => candidate.teamId !== input.homeTeamId);
  const eligible = candidates
    .filter((candidate) => input.distinctVisitorCount >= 2 && candidate.winsAtPark >= 1)
    .sort(compareCandidates);
  const topEligible = eligible[0] ?? null;

  if (!input.currentRivalTeamId) {
    if (!topEligible) {
      return {
        rivalTeamId: null,
        rivalWinsAtPark: 0,
        rivalRecordsHeld: 0,
        outcome: 'no-eligible',
      };
    }
    return {
      rivalTeamId: topEligible.teamId,
      rivalWinsAtPark: topEligible.winsAtPark,
      rivalRecordsHeld: topEligible.recordsHeld,
      outcome: 'crowned',
    };
  }

  const incumbent = candidates.find((candidate) => candidate.teamId === input.currentRivalTeamId) ?? {
    teamId: input.currentRivalTeamId,
    winsAtPark: 0,
    recordsHeld: 0,
  };
  const challenger = eligible.find((candidate) => candidate.teamId !== incumbent.teamId) ?? null;

  if (challenger && strictlyOvertakes(challenger, incumbent)) {
    return {
      rivalTeamId: challenger.teamId,
      rivalWinsAtPark: challenger.winsAtPark,
      rivalRecordsHeld: challenger.recordsHeld,
      outcome: 'overtaken',
    };
  }

  return {
    rivalTeamId: incumbent.teamId,
    rivalWinsAtPark: incumbent.winsAtPark,
    rivalRecordsHeld: incumbent.recordsHeld,
    outcome: 'retained',
  };
}
