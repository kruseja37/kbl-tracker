import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockGetPlayersByTeam } = vi.hoisted(() => ({
  mockGetPlayersByTeam: vi.fn(),
}));

vi.mock('../../../utils/leagueBuilderStorage', () => ({
  getPlayersByTeam: mockGetPlayersByTeam,
}));

import {
  buildFranchiseGameTrackerRoster,
  collectFranchiseRosterPlayerIds,
} from '../../app/utils/franchiseGameTrackerRoster';

describe('franchise GameTracker roster identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('preserves stable League Builder ids when building franchise launch rosters', async () => {
    mockGetPlayersByTeam.mockResolvedValue([
      {
        id: 'lb-catcher',
        firstName: 'Jane',
        lastName: 'Catcher',
        primaryPosition: 'C',
        secondaryPosition: '1B',
        bats: 'R',
        throws: 'R',
        age: 28,
        power: 72,
        contact: 68,
        speed: 44,
        fielding: 70,
        arm: 63,
        velocity: 0,
        junk: 0,
        accuracy: 0,
        trait1: 'Cannon Arm',
        trait2: 'Clutch',
      },
      {
        id: 'lb-shortstop',
        firstName: 'Alex',
        lastName: 'Short',
        primaryPosition: 'SS',
        secondaryPosition: '2B',
        bats: 'S',
        throws: 'R',
        age: 24,
        power: 64,
        contact: 81,
        speed: 78,
        fielding: 79,
        arm: 76,
        velocity: 0,
        junk: 0,
        accuracy: 0,
      },
      {
        id: 'lb-starter',
        firstName: 'Sam',
        lastName: 'Starter',
        primaryPosition: 'SP',
        secondaryPosition: '1B',
        bats: 'L',
        throws: 'L',
        age: 30,
        power: 22,
        contact: 18,
        speed: 20,
        fielding: 41,
        arm: 58,
        velocity: 82,
        junk: 77,
        accuracy: 74,
      },
    ]);

    const roster = await buildFranchiseGameTrackerRoster('team-1');

    expect(roster.players.some((player) => player.playerId === 'lb-catcher')).toBe(true);
    expect(roster.players.some((player) => player.playerId === 'lb-shortstop')).toBe(true);
    expect(roster.players.some((player) => player.playerId === 'lb-starter' && player.position === 'P')).toBe(true);
    expect(roster.pitchers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: 'lb-starter',
          name: 'S. STARTER',
          isStarter: true,
          isActive: true,
        }),
      ])
    );
  });

  test('collects stable ids for milestone-watch lookups before falling back to names', () => {
    const ids = collectFranchiseRosterPlayerIds([
      {
        players: [
          { playerId: 'lb-1', name: 'J. CATCHER', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' },
          { name: 'Legacy Name', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' },
        ],
        pitchers: [
          { playerId: 'lb-sp', name: 'S. STARTER', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'L' },
        ],
      },
    ]);

    expect(Array.from(ids)).toEqual(expect.arrayContaining(['lb-1', 'lb-sp', 'Legacy Name']));
    expect(ids.has('J. CATCHER')).toBe(false);
  });
});
