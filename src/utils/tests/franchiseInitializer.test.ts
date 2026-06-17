import 'fake-indexeddb/auto';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { Player, Team } from '../leagueBuilderStorage';
import {
  assignTeamCaptains,
  computeTeamCaptains,
  generateFranchiseHiddenModifierBackfill,
} from '../franchiseInitializer';
import {
  deleteFranchiseDatabase,
  getAllFranchisePlayers,
  getFranchiseTeam,
  saveFranchisePlayer,
  saveFranchiseTeam,
} from '../franchisePlayerStorage';

function makePlayer(overrides: Partial<Player> & Pick<Player, 'id'>): Player {
  return {
    id: overrides.id,
    firstName: 'Test',
    lastName: overrides.id,
    gender: 'M',
    age: 28,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    power: 50,
    contact: 50,
    speed: 50,
    fielding: 50,
    arm: 50,
    velocity: 50,
    junk: 50,
    accuracy: 50,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 1000,
    leagueAssignments: [],
    editHistory: [],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Player;
}

function makeTeam(overrides: Partial<Team> & Pick<Team, 'id'>): Team {
  return {
    id: overrides.id,
    name: `Team ${overrides.id}`,
    abbreviation: overrides.id.slice(0, 3).toUpperCase(),
    location: 'Test City',
    nickname: 'Testers',
    colors: {
      primary: '#111111',
      secondary: '#eeeeee',
    },
    stadium: 'Test Park',
    leagueIds: ['league-1'],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Team;
}

describe('franchiseInitializer hidden modifiers and Team Captain assignment', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all([
      deleteFranchiseDatabase('franchise-backfill'),
      deleteFranchiseDatabase('franchise-captains'),
      deleteFranchiseDatabase('franchise-no-captain'),
    ]);
  });

  test('backfill gives every franchise player hidden personality modifiers without overwriting existing values', async () => {
    await saveFranchisePlayer('franchise-backfill', makePlayer({ id: 'player-missing' }));
    await saveFranchisePlayer('franchise-backfill', makePlayer({
      id: 'player-existing',
      hiddenPersonalityModifiers: {
        loyalty: 11,
        ambition: 22,
        resilience: 33,
        charisma: 44,
      },
    }));

    const result = await generateFranchiseHiddenModifierBackfill('franchise-backfill');
    const storedPlayers = await getAllFranchisePlayers('franchise-backfill');

    expect(result.backfilledCount).toBe(1);
    expect(storedPlayers).toHaveLength(2);
    expect(storedPlayers.every((player) => player.hiddenPersonalityModifiers)).toBe(true);
    expect(storedPlayers.find((player) => player.id === 'player-missing')?.hiddenPersonalityModifiers)
      .toEqual(expect.objectContaining({
        loyalty: expect.any(Number),
        ambition: expect.any(Number),
        resilience: expect.any(Number),
        charisma: expect.any(Number),
      }));
    expect(storedPlayers.find((player) => player.id === 'player-existing')?.hiddenPersonalityModifiers)
      .toEqual({
        loyalty: 11,
        ambition: 22,
        resilience: 33,
        charisma: 44,
      });
  });

  test('computeTeamCaptains picks max loyalty plus charisma among MLB players with charisma at least 70', () => {
    const assignments = computeTeamCaptains(
      [makeTeam({ id: 'team-a' })],
      [
        makePlayer({
          id: 'eligible-lower-score',
          leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
          hiddenPersonalityModifiers: { loyalty: 90, ambition: 50, resilience: 50, charisma: 70 },
        }),
        makePlayer({
          id: 'eligible-higher-score',
          leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
          hiddenPersonalityModifiers: { loyalty: 82, ambition: 50, resilience: 50, charisma: 85 },
        }),
        makePlayer({
          id: 'farm-not-eligible',
          leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'FARM' }],
          hiddenPersonalityModifiers: { loyalty: 100, ambition: 50, resilience: 50, charisma: 100 },
        }),
        makePlayer({
          id: 'charisma-gate-fails',
          leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
          hiddenPersonalityModifiers: { loyalty: 100, ambition: 50, resilience: 50, charisma: 69 },
        }),
      ],
    );

    expect(assignments).toEqual([
      {
        teamId: 'team-a',
        captainPlayerId: 'eligible-higher-score',
      },
    ]);
  });

  test('assignTeamCaptains writes null and warns when no MLB player clears the charisma gate', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await saveFranchiseTeam('franchise-no-captain', makeTeam({ id: 'team-a' }));
    await saveFranchisePlayer('franchise-no-captain', makePlayer({
      id: 'not-charismatic',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
      hiddenPersonalityModifiers: { loyalty: 99, ambition: 50, resilience: 50, charisma: 69 },
    }));

    await expect(assignTeamCaptains('franchise-no-captain')).resolves.toEqual([
      {
        teamId: 'team-a',
        captainPlayerId: null,
      },
    ]);

    await expect(getFranchiseTeam('franchise-no-captain', 'team-a')).resolves.toEqual(
      expect.objectContaining({ captainPlayerId: null }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[franchiseInitializer] No eligible Team Captain found for team team-a; captainPlayerId set to null.',
    );
  });

  test('captainPlayerId persists on Team round-trip after assignment', async () => {
    await saveFranchiseTeam('franchise-captains', makeTeam({ id: 'team-a' }));
    await saveFranchisePlayer('franchise-captains', makePlayer({
      id: 'captain-a',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
      hiddenPersonalityModifiers: { loyalty: 75, ambition: 50, resilience: 50, charisma: 88 },
    }));

    await assignTeamCaptains('franchise-captains');

    await expect(getFranchiseTeam('franchise-captains', 'team-a')).resolves.toEqual(
      expect.objectContaining({ captainPlayerId: 'captain-a' }),
    );
  });
});
