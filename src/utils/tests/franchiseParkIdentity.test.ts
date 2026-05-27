import { describe, expect, test } from 'vitest';
import type { Team } from '../franchisePlayerStorage';
import { withFranchiseTeamParkIdentity } from '../franchisePlayerStorage';

function makeTeam(stadium: string): Team {
  return {
    id: 'team-a',
    name: 'Team A',
    abbreviation: 'TMA',
    location: 'Town',
    nickname: 'A',
    colors: {
      primary: '#111111',
      secondary: '#eeeeee',
    },
    stadium,
    leagueIds: ['league-1'],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
  };
}

describe('franchise park identity', () => {
  test('adds stable stadium id and seed park factors to franchise-owned team snapshots', () => {
    const team = withFranchiseTeamParkIdentity(makeTeam('Apple Field'));

    expect(team).toMatchObject({
      stadium: 'Apple Field',
      stadiumId: 'apple-field',
      parkFactors: {
        stadiumId: 'apple-field',
        stadiumName: 'Apple Field',
        source: 'SEED',
      },
    });
  });

  test('keeps custom stadium identity but defers custom park factors', () => {
    const team = withFranchiseTeamParkIdentity(makeTeam('Custom Yard'));

    expect(team.stadiumId).toBe('custom-yard');
    expect(team.parkFactors).toBeUndefined();
  });
});
