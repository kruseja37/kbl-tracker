import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockGetPlayersByTeam,
  mockGetTeam,
  mockGetAllFranchisePlayers,
  mockGetFranchiseTeam,
} = vi.hoisted(() => ({
  mockGetPlayersByTeam: vi.fn(),
  mockGetTeam: vi.fn(),
  mockGetAllFranchisePlayers: vi.fn(),
  mockGetFranchiseTeam: vi.fn(),
}));

vi.mock('../../../utils/leagueBuilderStorage', () => ({
  getPlayersByTeam: mockGetPlayersByTeam,
  getTeam: mockGetTeam,
}));

vi.mock('../../../utils/franchisePlayerStorage', () => ({
  getAllFranchisePlayers: mockGetAllFranchisePlayers,
  getFranchiseTeam: mockGetFranchiseTeam,
}));

import { buildOptimalLineupSnapshot } from '../../../utils/optimalLineup';
import {
  applyFranchiseStarterSelectionToRosterSnapshot,
  buildFranchiseGameTrackerRoster,
  buildFranchisePregameReadiness,
  collectFranchiseRosterPlayerIds,
} from '../../app/utils/franchiseGameTrackerRoster';

describe('franchise GameTracker roster identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTeam.mockResolvedValue(null);
    mockGetFranchiseTeam.mockResolvedValue(null);
    mockGetAllFranchisePlayers.mockResolvedValue([]);
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

  test('validates Franchise pregame readiness before benchmark registration', () => {
    const batterStats = { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 };
    const pitcherStats = { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 };
    const pitcher = {
      playerId: 'sp-1',
      name: 'S. STARTER',
      stats: pitcherStats,
      throwingHand: 'R' as const,
    };
    const player = (battingOrder: number, position: string) => ({
      playerId: `p-${battingOrder}-${position}`,
      name: `Player ${battingOrder}`,
      battingOrder,
      position,
      stats: batterStats,
      battingHand: 'R' as const,
    });

    const incomplete = buildFranchisePregameReadiness({
      teams: [
        {
          teamName: 'Away Team',
          players: [player(1, 'C')],
          pitchers: [pitcher],
          selectedStarterIdx: 0,
          useDH: false,
        },
      ],
    });

    expect(incomplete.isReady).toBe(false);
    expect(incomplete.issues).toEqual(
      expect.arrayContaining([
        'Away Team: needs 9 batting-order players for GameTracker start; found 1.',
        'Away Team: needs 8 non-pitcher lineup slots for no-DH benchmark; found 1.',
      ]),
    );

    const activeNoDhReady = buildFranchisePregameReadiness({
      teams: [
        {
          teamName: 'Active No DH Team',
          players: [
            ...['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'].map((position, index) =>
              player(index + 1, position),
            ),
            { ...player(9, 'P'), playerId: 'sp-1', name: 'S. STARTER' },
          ],
          pitchers: [pitcher],
          selectedStarterIdx: 0,
          useDH: false,
        },
      ],
    });
    expect(activeNoDhReady.isReady).toBe(true);

    const noDhReady = buildFranchisePregameReadiness({
      teams: [
        {
          teamName: 'No DH Team',
          players: [
            ...['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'].map((position, index) =>
              player(index + 1, position),
            ),
            { ...player(9, 'P'), playerId: 'sp-1', name: 'S. STARTER' },
          ],
          pitchers: [pitcher],
          selectedStarterIdx: 0,
          useDH: false,
        },
      ],
    });
    expect(noDhReady.isReady).toBe(true);
  });

  test('loads franchise saved no-DH lineup and RHP/LHP optimal benchmarks for game launch', async () => {
    const franchisePlayers = [
      {
        id: 'c',
        firstName: 'Casey',
        lastName: 'Catcher',
        primaryPosition: 'C',
        secondaryPosition: '1B',
        bats: 'R',
        throws: 'R',
        age: 28,
        power: 70,
        contact: 70,
        speed: 40,
        fielding: 80,
        arm: 80,
        velocity: 0,
        junk: 0,
        accuracy: 0,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
      },
      {
        id: 'ss',
        firstName: 'Sam',
        lastName: 'Short',
        primaryPosition: 'SS',
        secondaryPosition: '2B',
        bats: 'L',
        throws: 'R',
        age: 25,
        power: 80,
        contact: 82,
        speed: 75,
        fielding: 88,
        arm: 83,
        velocity: 0,
        junk: 0,
        accuracy: 0,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
      },
      {
        id: 'lf',
        firstName: 'Dana',
        lastName: 'Hitter',
        primaryPosition: 'LF',
        secondaryPosition: 'OF',
        bats: 'S',
        throws: 'R',
        age: 31,
        power: 90,
        contact: 74,
        speed: 35,
        fielding: 45,
        arm: 45,
        velocity: 0,
        junk: 0,
        accuracy: 0,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
      },
      {
        id: 'sp-l',
        firstName: 'Lia',
        lastName: 'Lefty',
        primaryPosition: 'SP',
        secondaryPosition: 'P',
        bats: 'L',
        throws: 'L',
        age: 30,
        power: 10,
        contact: 10,
        speed: 20,
        fielding: 55,
        arm: 70,
        velocity: 90,
        junk: 82,
        accuracy: 77,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
      },
    ];
    const candidates = franchisePlayers.map((player) => ({
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      bats: player.bats,
      primaryPosition: player.primaryPosition,
      secondaryPosition: player.secondaryPosition,
      power: player.power,
      contact: player.contact,
      speed: player.speed,
      fielding: player.fielding,
      arm: player.arm,
    }));
    const rhpSnapshot = buildOptimalLineupSnapshot({
      teamId: 'team-1',
      mode: 'franchise',
      opposingPitcherHand: 'R',
      candidates,
      dhEnabled: false,
      generatedAt: 100,
      generatedFrom: 'team_hub',
      sourceConfidence: 'engine_calculated',
    });
    const lhpSnapshot = buildOptimalLineupSnapshot({
      teamId: 'team-1',
      mode: 'franchise',
      opposingPitcherHand: 'L',
      candidates,
      dhEnabled: false,
      generatedAt: 200,
      generatedFrom: 'team_hub',
      sourceConfidence: 'engine_calculated',
    });

    mockGetFranchiseTeam.mockResolvedValue({
      id: 'team-1',
      leagueIds: ['league-1'],
      startingRotation: ['sp-l'],
      lineupWithoutDH: [
        { battingOrder: 1, playerId: 'ss', fieldingPosition: 'SS' },
        { battingOrder: 2, playerId: 'c', fieldingPosition: 'C' },
        { battingOrder: 3, playerId: 'lf', fieldingPosition: 'LF' },
      ],
      optimalLineupVsRHPWithoutDH: rhpSnapshot,
      optimalLineupVsLHPWithoutDH: lhpSnapshot,
    });
    mockGetAllFranchisePlayers.mockResolvedValue(franchisePlayers);

    const roster = await buildFranchiseGameTrackerRoster('team-1', {
      franchiseId: 'franchise-1',
      leagueId: 'league-1',
      useDH: false,
    });

    expect(roster.players.slice(0, 3).map((player) => player.playerId)).toEqual(['ss', 'c', 'lf']);
    expect(roster.pitchers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerId: 'sp-l', isStarter: true, throwingHand: 'L' }),
      ]),
    );
    expect(roster.optimalLineups?.vsRHP).toBe(rhpSnapshot);
    expect(roster.optimalLineups?.vsLHP).toBe(lhpSnapshot);
  });

  test('loads saved no-DH franchise lineup and rotation starter for game launch', async () => {
    const batter = (id: string, firstName: string, lastName: string, primaryPosition: string) => ({
      id,
      firstName,
      lastName,
      primaryPosition,
      secondaryPosition: 'OF',
      bats: 'R',
      throws: 'R',
      age: 27,
      power: 70,
      contact: 70,
      speed: 60,
      fielding: 70,
      arm: 70,
      velocity: 0,
      junk: 0,
      accuracy: 0,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
    });
    const starter = (id: string, firstName: string, lastName: string) => ({
      id,
      firstName,
      lastName,
      primaryPosition: 'SP',
      secondaryPosition: 'P',
      bats: 'R',
      throws: 'R',
      age: 30,
      power: 10,
      contact: 10,
      speed: 20,
      fielding: 55,
      arm: 70,
      velocity: 90,
      junk: 80,
      accuracy: 75,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
    });
    const franchisePlayers = [
      batter('b1', 'Batter', 'One', 'C'),
      batter('b2', 'Batter', 'Two', '1B'),
      batter('b3', 'Batter', 'Three', '2B'),
      batter('b4', 'Batter', 'Four', 'SS'),
      batter('b5', 'Batter', 'Five', '3B'),
      batter('b6', 'Batter', 'Six', 'LF'),
      batter('b7', 'Batter', 'Seven', 'CF'),
      batter('b8', 'Batter', 'Eight', 'RF'),
      starter('sp-a', 'Starter', 'Alpha'),
      starter('sp-b', 'Starter', 'Beta'),
    ];

    mockGetFranchiseTeam.mockResolvedValue({
      id: 'team-1',
      leagueIds: ['league-1'],
      startingRotation: ['sp-b', 'sp-a'],
      lineupWithoutDH: [
        { battingOrder: 1, playerId: 'b2', fieldingPosition: '1B' },
        { battingOrder: 2, playerId: 'b1', fieldingPosition: 'C' },
        { battingOrder: 3, playerId: 'b3', fieldingPosition: '2B' },
        { battingOrder: 4, playerId: 'b4', fieldingPosition: 'SS' },
        { battingOrder: 5, playerId: 'b5', fieldingPosition: '3B' },
        { battingOrder: 6, playerId: 'b6', fieldingPosition: 'LF' },
        { battingOrder: 7, playerId: 'b7', fieldingPosition: 'CF' },
        { battingOrder: 8, playerId: 'b8', fieldingPosition: 'RF' },
        { battingOrder: 9, playerId: 'sp-b', fieldingPosition: 'P' },
      ],
    });
    mockGetAllFranchisePlayers.mockResolvedValue(franchisePlayers);

    const roster = await buildFranchiseGameTrackerRoster('team-1', {
      franchiseId: 'franchise-1',
      leagueId: 'league-1',
      useDH: false,
    });

    expect(roster.players.map((player) => player.playerId)).toEqual([
      'b2',
      'b1',
      'b3',
      'b4',
      'b5',
      'b6',
      'b7',
      'b8',
      'sp-b',
    ]);
    expect(roster.players[8]).toMatchObject({ playerId: 'sp-b', position: 'P', battingOrder: 9 });
    expect(roster.pitchers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerId: 'sp-b', isStarter: true }),
      ]),
    );
  });

  test('launch roster derives the next starter from team games played and wraps a four-man rotation', async () => {
    const batter = (id: string, primaryPosition: string) => ({
      id,
      firstName: 'Batter',
      lastName: id,
      primaryPosition,
      secondaryPosition: 'OF',
      bats: 'R',
      throws: 'R',
      age: 27,
      power: 70,
      contact: 70,
      speed: 60,
      fielding: 70,
      arm: 70,
      velocity: 0,
      junk: 0,
      accuracy: 0,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
    });
    const starter = (id: string) => ({
      id,
      firstName: 'Starter',
      lastName: id,
      primaryPosition: 'SP',
      secondaryPosition: 'P',
      bats: 'R',
      throws: 'R',
      age: 30,
      power: 10,
      contact: 10,
      speed: 20,
      fielding: 55,
      arm: 70,
      velocity: 90,
      junk: 80,
      accuracy: 75,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
    });

    mockGetFranchiseTeam.mockResolvedValue({
      id: 'team-1',
      leagueIds: ['league-1'],
      startingRotation: ['sp-a', 'sp-b', 'sp-c', 'sp-d'],
    });
    mockGetAllFranchisePlayers.mockResolvedValue([
      batter('b1', 'C'),
      batter('b2', '1B'),
      batter('b3', '2B'),
      batter('b4', 'SS'),
      batter('b5', '3B'),
      batter('b6', 'LF'),
      batter('b7', 'CF'),
      batter('b8', 'RF'),
      starter('sp-a'),
      starter('sp-b'),
      starter('sp-c'),
      starter('sp-d'),
    ]);

    const roster = await buildFranchiseGameTrackerRoster('team-1', {
      franchiseId: 'franchise-1',
      leagueId: 'league-1',
      useDH: false,
      teamGamesPlayed: 4,
    });

    expect(roster.pitchers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerId: 'sp-a', isStarter: true, isActive: true }),
        expect.objectContaining({ playerId: 'sp-b', isStarter: false, isActive: false }),
      ]),
    );
    expect(roster.players[8]).toMatchObject({ playerId: 'sp-a', position: 'P', battingOrder: 9 });
  });

  test('starter override updates no-DH P batting slot without moving pitcher to leadoff', () => {
    const batterStats = { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 };
    const pitcherStats = { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 };
    const players = [
      {
        playerId: 'saved-sp',
        name: 'Saved Starter',
        position: 'P',
        primaryPosition: 'P',
        battingOrder: 1,
        stats: batterStats,
        battingHand: 'R' as const,
      },
      ...['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'].map((position, index) => ({
        playerId: `b${index + 1}`,
        name: `Batter ${index + 1}`,
        position,
        primaryPosition: position,
        battingOrder: index + 2,
        stats: batterStats,
        battingHand: 'R' as const,
      })),
    ];
    const pitchers = [
      {
        playerId: 'saved-sp',
        name: 'Saved Starter',
        stats: pitcherStats,
        throwingHand: 'R' as const,
        isStarter: true,
        isActive: true,
      },
      {
        playerId: 'override-sp',
        name: 'Override Starter',
        stats: pitcherStats,
        throwingHand: 'L' as const,
        isStarter: false,
        isActive: false,
        power: 12,
        contact: 14,
      },
    ];

    const snapshot = applyFranchiseStarterSelectionToRosterSnapshot({
      players,
      pitchers,
      selectedStarterIdx: 1,
      useDH: false,
    });

    expect(snapshot.pitchers).toEqual([
      expect.objectContaining({ playerId: 'saved-sp', isStarter: false, isActive: false }),
      expect.objectContaining({ playerId: 'override-sp', isStarter: true, isActive: true }),
    ]);
    expect(snapshot.players[0]).toMatchObject({ playerId: 'b1', battingOrder: 1 });
    expect(snapshot.players[8]).toMatchObject({
      playerId: 'override-sp',
      name: 'Override Starter',
      position: 'P',
      battingOrder: 9,
      battingHand: 'L',
      power: 12,
      contact: 14,
    });
    expect(snapshot.players.find((player) => player.playerId === 'saved-sp')).toBeUndefined();
  });

  test('filters franchise launch rosters to active MLB assignments only', async () => {
    mockGetFranchiseTeam.mockResolvedValue({
      id: 'team-1',
      leagueIds: ['league-1'],
      startingRotation: ['active-sp'],
    });
    mockGetAllFranchisePlayers.mockResolvedValue([
      {
        id: 'active-c',
        firstName: 'Active',
        lastName: 'Catcher',
        primaryPosition: 'C',
        secondaryPosition: '1B',
        bats: 'R',
        throws: 'R',
        age: 28,
        power: 70,
        contact: 70,
        speed: 40,
        fielding: 80,
        arm: 80,
        velocity: 0,
        junk: 0,
        accuracy: 0,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
      },
      {
        id: 'active-sp',
        firstName: 'Active',
        lastName: 'Starter',
        primaryPosition: 'SP',
        secondaryPosition: 'P',
        bats: 'R',
        throws: 'R',
        age: 30,
        power: 10,
        contact: 10,
        speed: 20,
        fielding: 50,
        arm: 70,
        velocity: 90,
        junk: 80,
        accuracy: 75,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
      },
      {
        id: 'farm-ss',
        firstName: 'Farm',
        lastName: 'Short',
        primaryPosition: 'SS',
        secondaryPosition: '2B',
        bats: 'L',
        throws: 'R',
        age: 22,
        power: 65,
        contact: 65,
        speed: 70,
        fielding: 70,
        arm: 70,
        velocity: 0,
        junk: 0,
        accuracy: 0,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      },
      {
        id: 'free-agent-of',
        firstName: 'Free',
        lastName: 'Agent',
        primaryPosition: 'CF',
        secondaryPosition: 'OF',
        bats: 'R',
        throws: 'R',
        age: 29,
        power: 60,
        contact: 60,
        speed: 80,
        fielding: 65,
        arm: 65,
        velocity: 0,
        junk: 0,
        accuracy: 0,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FREE_AGENT' }],
      },
    ]);

    const roster = await buildFranchiseGameTrackerRoster('team-1', {
      franchiseId: 'franchise-1',
      leagueId: 'league-1',
      useDH: false,
    });

    const launchedIds = new Set([
      ...roster.players.map((player) => player.playerId),
      ...roster.pitchers.map((pitcher) => pitcher.playerId),
    ]);

    expect(launchedIds.has('active-c')).toBe(true);
    expect(launchedIds.has('active-sp')).toBe(true);
    expect(launchedIds.has('farm-ss')).toBe(false);
    expect(launchedIds.has('free-agent-of')).toBe(false);
  });

  test('launch rosters reflect current franchise assignments after roster movement and trades', async () => {
    mockGetFranchiseTeam.mockImplementation((franchiseId: string, teamId: string) =>
      Promise.resolve({
        id: teamId,
        leagueIds: ['league-1'],
        startingRotation: teamId === 'team-1' ? ['called-up-sp'] : ['traded-sp'],
      }),
    );
    mockGetAllFranchisePlayers.mockResolvedValue([
      {
        id: 'sent-down-c',
        firstName: 'Sent',
        lastName: 'Down',
        primaryPosition: 'C',
        secondaryPosition: '1B',
        bats: 'R',
        throws: 'R',
        age: 28,
        power: 70,
        contact: 70,
        speed: 40,
        fielding: 80,
        arm: 80,
        velocity: 0,
        junk: 0,
        accuracy: 0,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      },
      {
        id: 'called-up-sp',
        firstName: 'Called',
        lastName: 'Up',
        primaryPosition: 'SP',
        secondaryPosition: 'P',
        bats: 'R',
        throws: 'R',
        age: 24,
        power: 10,
        contact: 10,
        speed: 20,
        fielding: 50,
        arm: 70,
        velocity: 90,
        junk: 80,
        accuracy: 75,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
      },
      {
        id: 'traded-of',
        firstName: 'Traded',
        lastName: 'Outfield',
        primaryPosition: 'CF',
        secondaryPosition: 'OF',
        bats: 'L',
        throws: 'R',
        age: 26,
        power: 65,
        contact: 70,
        speed: 85,
        fielding: 75,
        arm: 70,
        velocity: 0,
        junk: 0,
        accuracy: 0,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-2', rosterStatus: 'MLB' }],
      },
      {
        id: 'traded-sp',
        firstName: 'Traded',
        lastName: 'Starter',
        primaryPosition: 'SP',
        secondaryPosition: 'P',
        bats: 'R',
        throws: 'R',
        age: 29,
        power: 10,
        contact: 10,
        speed: 20,
        fielding: 50,
        arm: 70,
        velocity: 88,
        junk: 77,
        accuracy: 74,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-2', rosterStatus: 'MLB' }],
      },
    ]);

    const teamOneRoster = await buildFranchiseGameTrackerRoster('team-1', {
      franchiseId: 'franchise-1',
      leagueId: 'league-1',
      useDH: false,
    });
    const teamTwoRoster = await buildFranchiseGameTrackerRoster('team-2', {
      franchiseId: 'franchise-1',
      leagueId: 'league-1',
      useDH: false,
    });

    const teamOneIds = new Set([
      ...teamOneRoster.players.map((player) => player.playerId),
      ...teamOneRoster.pitchers.map((pitcher) => pitcher.playerId),
    ]);
    const teamTwoIds = new Set([
      ...teamTwoRoster.players.map((player) => player.playerId),
      ...teamTwoRoster.pitchers.map((pitcher) => pitcher.playerId),
    ]);

    expect(teamOneIds.has('called-up-sp')).toBe(true);
    expect(teamOneIds.has('sent-down-c')).toBe(false);
    expect(teamOneIds.has('traded-of')).toBe(false);
    expect(teamTwoIds.has('traded-of')).toBe(true);
    expect(teamTwoIds.has('traded-sp')).toBe(true);
  });
});
