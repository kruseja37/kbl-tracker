import 'fake-indexeddb/auto';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { Player, Team } from '../leagueBuilderStorage';
import {
  assignTeamFanHopefuls,
  assignTeamCaptains,
  computeTeamFanHopefuls,
  computeTeamCaptains,
  generateFranchiseHiddenModifierBackfill,
} from '../franchiseInitializer';
import {
  deleteFranchiseFarmRecordsForSeason,
  saveFranchiseFarmRecord,
} from '../franchiseFarmStorage';
import {
  deleteFranchiseDatabase,
  getAllFranchisePlayers,
  getFranchiseTeam,
  saveFranchisePlayer,
  saveFranchiseTeam,
} from '../franchisePlayerStorage';

function makePlayer(
  overrides: Partial<Player> & Pick<Player, 'id'> & {
    prospectProfile?: { scoutedGrade?: string };
  },
): Player {
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
      deleteFranchiseDatabase('franchise-fan-hopeful'),
      deleteFranchiseDatabase('franchise-no-fan-hopeful'),
      deleteFranchiseFarmRecordsForSeason('franchise-fan-hopeful', 'season-1'),
      deleteFranchiseFarmRecordsForSeason('franchise-no-fan-hopeful', 'season-1'),
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

  test('computeTeamCaptains picks max loyalty plus charisma among MLB players with no charisma floor', () => {
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
          id: 'low-charisma-high-score',
          leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
          hiddenPersonalityModifiers: { loyalty: 100, ambition: 50, resilience: 50, charisma: 69 },
        }),
      ],
    );

    expect(assignments).toEqual([
      {
        teamId: 'team-a',
        captainPlayerId: 'low-charisma-high-score',
      },
    ]);
  });

  test('assignTeamCaptains writes null and warns when a team has no MLB players', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await saveFranchiseTeam('franchise-no-captain', makeTeam({ id: 'team-a' }));
    await saveFranchisePlayer('franchise-no-captain', makePlayer({
      id: 'farm-player',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'FARM' }],
      hiddenPersonalityModifiers: { loyalty: 99, ambition: 50, resilience: 50, charisma: 99 },
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

  test('computeTeamFanHopefuls deterministically picks one top-3 farm prospect by visible scoutedGrade', () => {
    const farmPlayerIdsByTeamId = new Map([
      ['team-a', ['scouted-b', 'scouted-a', 'scouted-c', 'scouted-a-minus', 'hidden-overall-s']],
    ]);
    const teams = [makeTeam({ id: 'team-a' })];
    const players = [
      makePlayer({ id: 'scouted-b', prospectProfile: { scoutedGrade: 'B' } }),
      makePlayer({ id: 'scouted-a', prospectProfile: { scoutedGrade: 'A' } }),
      makePlayer({ id: 'scouted-c', prospectProfile: { scoutedGrade: 'C' } }),
      makePlayer({ id: 'scouted-a-minus', prospectProfile: { scoutedGrade: 'A-' } }),
      makePlayer({ id: 'hidden-overall-s', overallGrade: 'S', prospectProfile: { scoutedGrade: 'D' } }),
    ];

    const first = computeTeamFanHopefuls(teams, players, farmPlayerIdsByTeamId, 'season-1');
    const second = computeTeamFanHopefuls(teams, players, farmPlayerIdsByTeamId, 'season-1');

    expect(second).toEqual(first);
    expect(['scouted-a', 'scouted-a-minus', 'scouted-b']).toContain(first[0].fanHopefulPlayerId);
    expect(first[0].fanHopefulPlayerId).not.toBe('hidden-overall-s');
  });

  test('assignTeamFanHopefuls persists a visible-safe farm assignment', async () => {
    await saveFranchiseTeam('franchise-fan-hopeful', makeTeam({ id: 'team-a' }));
    for (const player of [
      makePlayer({ id: 'farm-a', prospectProfile: { scoutedGrade: 'A' } }),
      makePlayer({ id: 'farm-b', prospectProfile: { scoutedGrade: 'B' } }),
      makePlayer({ id: 'farm-c', prospectProfile: { scoutedGrade: 'C' } }),
      makePlayer({ id: 'farm-d', overallGrade: 'S', prospectProfile: { scoutedGrade: 'D' } }),
    ]) {
      await saveFranchisePlayer('franchise-fan-hopeful', player);
      await saveFranchiseFarmRecord({
        franchiseId: 'franchise-fan-hopeful',
        seasonId: 'season-1',
        seasonNumber: 1,
        teamId: 'team-a',
        playerId: player.id,
      });
    }

    const assignments = await assignTeamFanHopefuls('franchise-fan-hopeful', 'season-1');

    expect(['farm-a', 'farm-b', 'farm-c']).toContain(assignments[0].fanHopefulPlayerId);
    await expect(getFranchiseTeam('franchise-fan-hopeful', 'team-a')).resolves.toEqual(
      expect.objectContaining({ fanHopefulPlayerId: assignments[0].fanHopefulPlayerId }),
    );
  });

  test('assignTeamFanHopefuls writes null and warns when a team has no farm prospects', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await saveFranchiseTeam('franchise-no-fan-hopeful', makeTeam({ id: 'team-a' }));

    await expect(assignTeamFanHopefuls('franchise-no-fan-hopeful', 'season-1')).resolves.toEqual([
      {
        teamId: 'team-a',
        fanHopefulPlayerId: null,
      },
    ]);

    await expect(getFranchiseTeam('franchise-no-fan-hopeful', 'team-a')).resolves.toEqual(
      expect.objectContaining({ fanHopefulPlayerId: null }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[franchiseInitializer] No eligible Fan Hopeful found for team team-a; fanHopefulPlayerId set to null.',
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
