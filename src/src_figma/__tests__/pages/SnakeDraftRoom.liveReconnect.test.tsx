import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const state = vi.hoisted(() => ({
  local: null as import('../../../utils/leagueBuilderStorage').LeagueBuilderMlbDraftSession | null,
  remote: null as import('../../../utils/leagueBuilderStorage').LeagueBuilderMlbDraftSession | null,
  league: null as import('../../../utils/leagueBuilderStorage').LeagueTemplate | null,
  teams: [] as import('../../../utils/leagueBuilderStorage').Team[],
  players: [] as import('../../../utils/leagueBuilderStorage').Player[],
  pool: null as import('../../../engines/leagueConstruction').RegisteredPool | null,
  atomicUpdate: vi.fn(),
}));

vi.mock('../../hooks/useLeagueBuilderData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useLeagueBuilderData')>();
  return {
    ...actual,
    useLeagueBuilderData: () => ({
      leagues: state.league ? [state.league] : [],
      teams: state.teams,
      players: state.players,
      isLoading: false,
      error: null,
      getRegisteredPool: vi.fn(async () => state.pool),
      getMlbDraftSession: vi.fn(async () => state.local),
      saveMlbDraftSession: vi.fn(async (next) => next),
      refresh: vi.fn(async () => undefined),
    }),
  };
});

vi.mock('../../../utils/leagueBuilderStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/leagueBuilderStorage')>();
  return {
    ...actual,
    getAllLeagueTemplates: vi.fn(async () => state.league ? [state.league] : []),
    getAllTeams: vi.fn(async () => state.teams),
    getAllPlayers: vi.fn(async () => state.players),
    getScoutProfilesForLeague: vi.fn(async () => []),
    getTeamRoster: vi.fn(async () => null),
    updateMlbDraftSessionAtomically: state.atomicUpdate,
    patchMlbDraftSessionSnakeCompanions: vi.fn(async () => state.local),
    saveMlbDraftRoomSession: vi.fn(async (next) => next),
  };
});

vi.mock('../../app/components/snake/companion/useSnakeLiveHostRoom', () => ({
  useSnakeLiveHostRoom: (options: { enabled?: boolean }) => ({
    room: options.enabled && state.remote ? {
      id: 'live-room-1',
      ownerUserId: 'owner-1',
      sessionId: `run:${state.remote.id}`,
      roomCode: '2468',
      phase: 'MLB',
      status: state.remote.currentPickIndex >= state.remote.pickOrder.length ? 'complete' : 'open',
      publicRevision: state.remote.currentPickIndex,
      publicState: {},
      hostDeviceId: 'host-device',
      createdAt: state.remote.createdDate,
      updatedAt: state.remote.lastModified,
    } : null,
    publicSession: options.enabled ? state.remote : null,
    claims: [], intents: [], events: [],
    status: options.enabled ? 'live' : 'idle',
    subscriptionStatus: options.enabled ? 'SUBSCRIBED' : null,
    error: null,
    working: false,
    hostAccessReady: Boolean(options.enabled && state.remote),
    liveRoomReady: Boolean(options.enabled && state.remote),
    refresh: vi.fn(async () => undefined),
    publishSession: vi.fn(), resolveClaim: vi.fn(), resolveIntent: vi.fn(),
    submitTradeIntent: vi.fn(), seedBoard: vi.fn(), closeRoom: vi.fn(),
  }),
}));

vi.mock('../../../utils/snakeLiveCapabilityStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/snakeLiveCapabilityStore')>();
  return { ...actual, getOrCreateSnakeLiveDeviceId: vi.fn(async () => 'host-device') };
});

vi.mock('../../../engines/snakeGuideTrade', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../engines/snakeGuideTrade')>();
  return {
    ...actual,
    seedSnakeGuideSeatingProof: () => false,
    primeSnakeGuideSeatingProof: () => ({ feasible: false, assignments: [], reason: 'TEST PROOF' }),
  };
});

vi.mock('../../app/components/snake/snakeRoomFreshness', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/components/snake/snakeRoomFreshness')>();
  return { ...actual, startSnakeRoomFreshness: () => () => undefined };
});

vi.mock('../../../utils/franchisePhase2Flags', () => ({ isSnakeDraftV1Enabled: () => true }));
vi.mock('../../../utils/syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    pull: vi.fn(async () => undefined),
    flush: vi.fn(async () => undefined),
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock('../../utils/snakeSounds', () => ({
  loadSnakeSoundsEnabled: () => false,
  saveSnakeSoundsEnabled: vi.fn(),
  createSnakeSoundPlayer: () => ({ play: vi.fn() }),
}));

import type { RegisteredPool } from '../../../engines/leagueConstruction';
import type {
  LeagueBuilderMlbDraftSession,
  LeagueTemplate,
  Player,
  SnakeBoardSlotId,
  SnakeSeatBoardRecord,
  Team,
} from '../../../utils/leagueBuilderStorage';
import SnakeDraftRoom from '../../app/pages/SnakeDraftRoom';

const LEAGUE_ID = 'live-reconnect-league';
const TEAM_IDS = Array.from({ length: 8 }, (_, index) => `team-${index + 1}`);
const POSITIONS = [
  'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'C', '1B', '2B', 'SS', 'LF',
  'SP', 'SP', 'SP', 'SP/RP', 'RP', 'RP', 'RP', 'CP', 'SP/RP',
] as const satisfies readonly Player['primaryPosition'][];

function player(index: number): Player {
  const primaryPosition = POSITIONS[index % POSITIONS.length];
  const pitcher = ['SP', 'SP/RP', 'RP', 'CP'].includes(primaryPosition);
  return {
    id: `player-${index + 1}`,
    firstName: 'Live', lastName: `Player ${index + 1}`, gender: 'M', age: 25,
    bats: 'R', throws: 'R', primaryPosition,
    secondaryPosition: primaryPosition === 'C' ? '1B' : undefined,
    power: pitcher ? 20 : 55, contact: pitcher ? 20 : 55, speed: 55, fielding: 55, arm: 55,
    velocity: pitcher ? 55 : 0, junk: pitcher ? 55 : 0, accuracy: pitcher ? 55 : 0,
    arsenal: pitcher ? ['4F'] : [], overallGrade: 'B', personality: 'Competitive',
    chemistry: 'Competitive', morale: 50, mojo: 'Normal', fame: 0, salary: 10_000,
    leagueAssignments: [{ leagueId: LEAGUE_ID, teamId: '', rosterStatus: 'FREE_AGENT' }],
    hiddenPersonalityModifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
    createdDate: '2026-07-19T00:00:00.000Z', lastModified: '2026-07-19T00:00:00.000Z',
    isCustom: true,
  } as Player;
}

function privateBoard(): SnakeSeatBoardRecord {
  const ids = POSITIONS.map((_, index) => `player-${index + 1}`);
  const slots: Record<SnakeBoardSlotId, string> = {
    C: ids[0], '1B': ids[1], '2B': ids[2], '3B': ids[3], SS: ids[4], LF: ids[5], CF: ids[6], RF: ids[7],
    BACKUP_C: ids[8], FLEX1: ids[9], FLEX2: ids[10], FLEX3: ids[11], FLEX4: ids[12],
    SP1: ids[13], SP2: ids[14], SP3: ids[15], SP4: ids[16], RP1: ids[17], RP2: ids[18], RP3: ids[19],
    CP: ids[20], SWING: ids[21],
  };
  return {
    slots,
    rankings: { global: ids, byPosition: {}, frozenPlayerIds: [], zeroInterestPlayerIds: ['private-zero-interest'] },
    revision: 9,
  };
}

function draftSession(completedCount: number): LeagueBuilderMlbDraftSession {
  const pickOrder = Array.from({ length: 176 }, (_, index) => ({
    round: Math.floor(index / 8) + 1,
    pick: index + 1,
    teamId: TEAM_IDS[index % TEAM_IDS.length],
  }));
  return {
    id: `mlb-draft:${LEAGUE_ID}:1`, leagueId: LEAGUE_ID, seasonNumber: 1,
    seed: 'live-reconnect', workflowVersion: 'snake-v1', engineMethodVersion: 'snake-s1a',
    tier: 'standard', balanceMode: 'taxed', rounds: 22, pickOrder,
    completedPicks: pickOrder.slice(0, completedCount).map((slot, index) => ({
      ...slot, playerId: `player-${index + 1}`, settledSalary: 10_000, marginalTax: 0,
    })),
    currentPickIndex: completedCount,
    revision: completedCount,
    seatBoards: { [TEAM_IDS[0]]: privateBoard() },
    roomLogByTeamId: { [TEAM_IDS[0]]: [{ id: 'private-note', kind: 'SYSTEM', text: 'PRIVATE', createdAt: '2026-07-19T00:00:00.000Z' }] },
    snakeCompanions: { roomCode: '2468', claims: [] },
    snakeSetup: {
      poolPlayerIds: Array.from({ length: 200 }, (_, index) => `player-${index + 1}`),
      versionSelections: {},
      clubs: TEAM_IDS.map((teamId) => ({ teamId, hotseat: true, archetypeId: 'BALANCED' })),
      orderSeed: 'live-reconnect-order',
    },
    createdDate: '2026-07-19T00:00:00.000Z',
    lastModified: `2026-07-19T00:${String(completedCount).padStart(2, '0')}:00.000Z`,
  } as LeagueBuilderMlbDraftSession;
}

function setFixture(localCount: number, remoteCount: number): SnakeSeatBoardRecord {
  state.players = Array.from({ length: 200 }, (_, index) => player(index));
  state.teams = TEAM_IDS.map((id, index): Team => ({
    id, name: `Live Club ${index + 1}`, abbreviation: `L${index + 1}`, location: 'Live', nickname: 'Club',
    colors: { primary: '#234f32', secondary: '#f5d77a' }, stadium: 'Live Park', controlledBy: 'human',
    leagueIds: [LEAGUE_ID], mlbArchetypeKey: 'balanced', createdDate: '2026-07-19', lastModified: '2026-07-19',
  }));
  state.league = {
    id: LEAGUE_ID, name: 'Live Reconnect League', teamIds: TEAM_IDS, conferences: [], divisions: [],
    defaultRulesPreset: 'standard', draftFormat: 'snake', tier: 'standard', balanceMode: 'taxed',
    salaryCap: 10_000_000, createdDate: '2026-07-19', lastModified: '2026-07-19',
  } as LeagueTemplate;
  state.pool = {
    leagueId: LEAGUE_ID, tier: 'standard', balanceMode: 'taxed', locked: true,
    players: state.players.map((row) => ({ id: row.id, iv: 10_000, salary: 10_000 })),
    tierCap: 10_000_000, luxuryCaps: [], pickValueChart: [], totalSlots: 176,
    poolSurplusWarning: false,
  } as RegisteredPool;
  state.local = draftSession(localCount);
  const privateBefore = structuredClone(state.local.seatBoards![TEAM_IDS[0]]);
  state.remote = draftSession(remoteCount);
  delete state.remote.seatBoards;
  delete state.remote.roomLogByTeamId;
  delete state.remote.snakeCompanions;
  return privateBefore;
}

function renderRoom(): void {
  render(<MemoryRouter initialEntries={[`/snake-room?leagueId=${LEAGUE_ID}`]}><SnakeDraftRoom /></MemoryRouter>);
}

describe('SnakeDraftRoom live reconnect mirror', () => {
  beforeEach(() => {
    state.atomicUpdate.mockReset().mockImplementation(async (
      _leagueId: string,
      _seasonNumber: number,
      update: (current: LeagueBuilderMlbDraftSession) => LeagueBuilderMlbDraftSession,
    ) => {
      if (!state.local) throw new Error('The local session is missing.');
      state.local = update(structuredClone(state.local));
      return state.local;
    });
  });

  afterEach(() => cleanup());

  test('reload adopts an ordinary pick committed by the host before the network failed', async () => {
    const privateBefore = setFixture(10, 11);
    renderRoom();

    await waitFor(() => expect(state.local?.currentPickIndex).toBe(11), { timeout: 10_000 });
    expect(state.local?.completedPicks).toHaveLength(11);
    expect(state.local?.completedPicks.at(-1)?.playerId).toBe('player-11');
    expect(state.local?.seatBoards?.[TEAM_IDS[0]]).toEqual(privateBefore);
    expect(state.local?.roomLogByTeamId?.[TEAM_IDS[0]]?.[0]?.text).toBe('PRIVATE');
  });

  test('reload adopts the final 176th pick and opens the completed recap', async () => {
    const privateBefore = setFixture(175, 176);
    renderRoom();

    await waitFor(() => expect(state.local?.currentPickIndex).toBe(176), { timeout: 10_000 });
    expect(state.local?.completedPicks).toHaveLength(176);
    expect(state.local?.seatBoards?.[TEAM_IDS[0]]).toEqual(privateBefore);
    expect(await screen.findByRole('heading', { name: 'MLB DRAFT RECAP' }, { timeout: 10_000 })).toBeInTheDocument();
  });
});
