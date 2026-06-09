import { describe, expect, test } from 'vitest';
import {
  buildFranchisePlayoffSeedingReview,
  reviewMatchesPlayoffScope,
} from '../franchisePlayoffSeedingReview';

function standing(teamId: string, wins: number, losses: number, runDiff: number, teamName = teamId) {
  return {
    teamId,
    teamName,
    wins,
    losses,
    runsScored: Math.max(0, runDiff),
    runsAllowed: Math.max(0, -runDiff),
    runDiff,
    winPct: wins + losses > 0 ? wins / (wins + losses) : 0,
    streak: { type: 'W' as const, count: 1 },
    lastTenWins: 5,
    homeRecord: { wins: 0, losses: 0 },
    awayRecord: { wins: 0, losses: 0 },
    gamesBack: 0,
  };
}

const franchiseTeams = [
  { id: 'team-a', name: 'Alpha', conference: 'Eastern' },
  { id: 'team-b', name: 'Bravo', conference: 'Eastern' },
  { id: 'team-c', name: 'Charlie', conference: 'Western' },
  { id: 'team-d', name: 'Delta', conference: 'Western' },
];

describe('franchise playoff seeding review', () => {
  test('orders tied records by run differential and separates eliminated teams', () => {
    const review = buildFranchisePlayoffSeedingReview({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      standings: [
        standing('team-a', 10, 6, 8),
        standing('team-b', 10, 6, 21),
        standing('team-c', 8, 8, 0),
        standing('team-d', 7, 9, -12),
      ],
      franchiseTeams,
      teamsQualifying: 2,
      generatedAt: 1234,
    });

    expect(review.blockers).toEqual([]);
    expect(review.qualifiedTeams.map((team) => [team.teamId, team.seed])).toEqual([
      ['team-b', 1],
      ['team-a', 2],
    ]);
    expect(review.eliminatedTeams.map((team) => team.teamId)).toEqual(['team-c', 'team-d']);
    expect(review.tieGroups).toEqual([
      expect.objectContaining({
        wins: 10,
        losses: 6,
        teamIds: ['team-b', 'team-a'],
        resolvedByRunDifferential: true,
        unresolved: false,
      }),
    ]);
    expect(reviewMatchesPlayoffScope(review, {
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      teamsQualifying: 2,
    })).toBe(true);
  });

  test('blocks unresolved same-record same-run-differential ties inside the qualifying cut', () => {
    const review = buildFranchisePlayoffSeedingReview({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      standings: [
        standing('team-a', 10, 6, 8),
        standing('team-b', 10, 6, 8),
        standing('team-c', 8, 8, 0),
        standing('team-d', 7, 9, -12),
      ],
      franchiseTeams,
      teamsQualifying: 2,
    });

    expect(review.blockers).toEqual([
      expect.stringMatching(/Manual playoff seeding resolution required/),
    ]);
    expect(review.tieGroups).toEqual([
      expect.objectContaining({
        wins: 10,
        losses: 6,
        teamIds: ['team-a', 'team-b'],
        resolvedByRunDifferential: false,
        unresolved: true,
      }),
    ]);
    expect(reviewMatchesPlayoffScope(review, {
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      teamsQualifying: 2,
    })).toBe(false);
  });

  test('blocks partial unresolved run-differential ties inside a mixed W-L tie group', () => {
    const review = buildFranchisePlayoffSeedingReview({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      standings: [
        standing('team-a', 10, 6, 45),
        standing('team-b', 10, 6, 45),
        standing('team-c', 10, 6, 20),
        standing('team-d', 7, 9, -12),
      ],
      franchiseTeams,
      teamsQualifying: 3,
    });

    expect(review.blockers).toEqual([
      expect.stringMatching(/Manual playoff seeding resolution required/),
    ]);
    expect(review.tieGroups).toEqual([
      expect.objectContaining({
        wins: 10,
        losses: 6,
        teamIds: ['team-a', 'team-b', 'team-c'],
        resolvedByRunDifferential: true,
        unresolved: true,
      }),
    ]);
    expect(reviewMatchesPlayoffScope(review, {
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      teamsQualifying: 3,
    })).toBe(false);
  });

  test('does not block same-record same-run-differential ties outside the qualifying field', () => {
    const review = buildFranchisePlayoffSeedingReview({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      standings: [
        standing('team-a', 10, 6, 45),
        standing('team-b', 9, 7, 30),
        standing('team-c', 7, 9, 0),
        standing('team-d', 7, 9, 0),
      ],
      franchiseTeams,
      teamsQualifying: 2,
    });

    expect(review.blockers).toEqual([]);
    expect(review.qualifiedTeams.map((team) => team.teamId)).toEqual(['team-a', 'team-b']);
    expect(review.tieGroups).toEqual([
      expect.objectContaining({
        wins: 7,
        losses: 9,
        teamIds: ['team-c', 'team-d'],
        resolvedByRunDifferential: false,
        unresolved: false,
      }),
    ]);
  });

  test('blocks missing scope or missing franchise-owned team snapshots', () => {
    const review = buildFranchisePlayoffSeedingReview({
      franchiseId: '',
      seasonId: ' ',
      seasonNumber: 0,
      standings: [standing('team-a', 10, 6, 8)],
      franchiseTeams: [],
      teamsQualifying: 2,
    });

    expect(review.blockers).toEqual(expect.arrayContaining([
      'Missing franchiseId for playoff seeding review.',
      'Missing seasonId for playoff seeding review.',
      'Missing positive seasonNumber for playoff seeding review.',
      'Cannot review playoff seeding without franchise-owned team snapshots.',
      'Cannot review playoff seeding: 1 standings rows for 2 qualifying teams.',
    ]));
  });
});
