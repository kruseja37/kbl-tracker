import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const engineProfile = vi.hoisted(() => ({
  rationalRoom: 0,
  legalFinish: 0,
  seatingProof: 0,
  pickProof: 0,
  seatingProofResult: null as unknown,
}));
const useLeagueBuilderDataMock = vi.hoisted(() => vi.fn());

vi.mock('../../../engines/snakeRationalRoom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../engines/snakeRationalRoom')>();
  return {
    ...actual,
    playSnakeRationalRoom: (...args: Parameters<typeof actual.playSnakeRationalRoom>) => {
      engineProfile.rationalRoom += 1;
      return actual.playSnakeRationalRoom(...args);
    },
  };
});

vi.mock('../../../engines/snakeEconomics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../engines/snakeEconomics')>();
  return {
    ...actual,
    evaluateSnakeLegalFinish: (...args: Parameters<typeof actual.evaluateSnakeLegalFinish>) => {
      engineProfile.legalFinish += 1;
      return actual.evaluateSnakeLegalFinish(...args);
    },
  };
});

vi.mock('../../../engines/snakeSeatingProof', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../engines/snakeSeatingProof')>();
  return {
    ...actual,
    proveSimultaneousSnakeSeating: (...args: Parameters<typeof actual.proveSimultaneousSnakeSeating>) => {
      engineProfile.seatingProof += 1;
      // Profiling instrumentation: every production call is counted, while the identical
      // proof input is executed once so the pre-fix combinatorial loop cannot kill Vitest.
      if (!engineProfile.seatingProofResult) {
        engineProfile.seatingProofResult = actual.proveSimultaneousSnakeSeating(...args);
      }
      return engineProfile.seatingProofResult as ReturnType<typeof actual.proveSimultaneousSnakeSeating>;
    },
    proveSnakePickKeepsAllClubsSeated: (...args: Parameters<typeof actual.proveSnakePickKeepsAllClubsSeated>) => {
      engineProfile.pickProof += 1;
      return actual.proveSnakePickKeepsAllClubsSeated(...args);
    },
  };
});

vi.mock('../../hooks/useLeagueBuilderData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useLeagueBuilderData')>();
  return { ...actual, useLeagueBuilderData: useLeagueBuilderDataMock };
});

vi.mock('../../../utils/franchisePhase2Flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/franchisePhase2Flags')>();
  return { ...actual, isSnakeDraftV1Enabled: () => true };
});

vi.mock('../../utils/snakeSounds', () => ({
  loadSnakeSoundsEnabled: () => false,
  saveSnakeSoundsEnabled: vi.fn(),
  createSnakeSoundPlayer: () => ({ play: vi.fn() }),
}));

import { LUXURY_CAP_TABLES, TIER_CAPS } from '../../../data/tierParams';
import { buildSnakeOrder, derivePickValueChart } from '../../../engines/leagueConstruction';
import type { RegisteredPool } from '../../../engines/leagueConstruction';
import { searchSnakeGuidePackage } from '../../../engines/snakeGuideTrade';
import type {
  LeagueBuilderMlbDraftSession,
  Player,
  SnakeBoardSlotId,
  SnakeSeatBoardRecord,
  Team,
} from '../../../utils/leagueBuilderStorage';
import type { UseLeagueBuilderDataReturn } from '../../hooks/useLeagueBuilderData';
import SnakeDraftRoom from '../../app/pages/SnakeDraftRoom';

const LEAGUE_ID = 'perfroom-scale';
const TEAM_IDS = Array.from({ length: 8 }, (_, index) => `perf-team-${index + 1}`);
const POSITION_CYCLE = [
  'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'C', '1B', '2B', 'SS', 'LF',
  'SP', 'SP', 'SP', 'SP/RP', 'RP', 'RP', 'RP', 'CP', 'SP/RP',
] as const satisfies readonly Player['primaryPosition'][];
let profileSession: LeagueBuilderMlbDraftSession;
let profilePool: RegisteredPool;

function player(index: number): Player {
  const primaryPosition = POSITION_CYCLE[index % POSITION_CYCLE.length];
  const pitcher = ['SP', 'SP/RP', 'RP', 'CP'].includes(primaryPosition);
  return {
    id: `perf-player-${index + 1}`,
    firstName: 'Scale',
    lastName: `Player ${index + 1}`,
    gender: 'M', age: 25, bats: 'R', throws: 'R', primaryPosition,
    secondaryPosition: primaryPosition === 'C' ? '1B' : undefined,
    power: pitcher ? 20 : 45 + (index % 40),
    contact: pitcher ? 20 : 45 + ((index * 3) % 40),
    speed: 45 + ((index * 5) % 40), fielding: 45 + ((index * 7) % 40), arm: 45 + ((index * 11) % 40),
    velocity: pitcher ? 45 + ((index * 13) % 40) : 0,
    junk: pitcher ? 45 + ((index * 17) % 40) : 0,
    accuracy: pitcher ? 45 + ((index * 19) % 40) : 0,
    arsenal: pitcher ? ['4F'] : [], overallGrade: 'B', personality: 'Competitive', chemistry: 'Competitive',
    morale: 50, mojo: 'Normal', fame: 0, salary: 10_000 + index * 100,
    leagueAssignments: [{ leagueId: LEAGUE_ID, teamId: '', rosterStatus: 'FREE_AGENT' }],
    hiddenPersonalityModifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
    createdDate: '2026-07-11', lastModified: '2026-07-11', isCustom: true,
  } as Player;
}

function team(id: string, index: number): Team {
  return {
    id, name: `Performance Club ${index + 1}`, abbreviation: `P${index + 1}`,
    location: 'Scale', nickname: `Club ${index + 1}`,
    colors: { primary: '#16324f', secondary: '#f5c542', accent: '#f04e30' },
    stadium: 'Scale Park', controlledBy: 'human', leagueIds: [LEAGUE_ID], mlbArchetypeKey: 'balanced',
    createdDate: '2026-07-11', lastModified: '2026-07-11',
  };
}

function board(): SnakeSeatBoardRecord {
  const ids = POSITION_CYCLE.map((_, index) => `perf-player-${index + 1}`);
  const slots: Record<SnakeBoardSlotId, string> = {
    C: ids[0], '1B': ids[1], '2B': ids[2], '3B': ids[3], SS: ids[4], LF: ids[5], CF: ids[6], RF: ids[7],
    BACKUP_C: ids[8], FLEX1: ids[9], FLEX2: ids[10], FLEX3: ids[11], FLEX4: ids[12],
    SP1: ids[13], SP2: ids[14], SP3: ids[15], SP4: ids[16], RP1: ids[17], RP2: ids[18], RP3: ids[19],
    CP: ids[20], SWING: ids[21],
  };
  return {
    slots,
    rankings: {
      global: Array.from({ length: 250 }, (_, index) => `perf-player-${index + 1}`),
      byPosition: {},
      frozenPlayerIds: [],
    },
    revision: 1,
  };
}

function fixture(): UseLeagueBuilderDataReturn {
  const players = Array.from({ length: 250 }, (_, index) => player(index));
  const teams = TEAM_IDS.map(team);
  const pickOrder = buildSnakeOrder(TEAM_IDS, 22);
  const session: LeagueBuilderMlbDraftSession = {
    id: `mlb-draft:${LEAGUE_ID}:1`, leagueId: LEAGUE_ID, seasonNumber: 1, seed: 'perfroom-seed',
    workflowVersion: 'snake-v1', engineMethodVersion: 'snake-s1a', tier: 'standard', balanceMode: 'taxed', rounds: 22,
    pickOrder, completedPicks: [], seatBoards: { [TEAM_IDS[0]]: board() },
    snakeSetup: {
      poolPlayerIds: players.map((row) => row.id), versionSelections: {},
      clubs: TEAM_IDS.map((teamId) => ({ teamId, gmName: teamId, hotseat: true, archetypeId: 'BALANCED' })),
      orderSeed: 'perf-order',
    },
    revision: 1, currentPickIndex: 0, createdDate: '2026-07-11', lastModified: '2026-07-11',
  };
  const pool: RegisteredPool = {
    leagueId: LEAGUE_ID, tier: 'standard', balanceMode: 'taxed', generatedAt: '2026-07-11', locked: true,
    players: players.map((row, index) => ({ id: row.id, iv: 10_000 + index * 100, salary: 10_000 + index * 100 })),
    tierCap: TIER_CAPS.standard.tierCap, luxuryCaps: LUXURY_CAP_TABLES.standard,
    pickValueChart: [], totalSlots: 176, poolSurplusWarning: false,
  };
  profileSession = session;
  profilePool = pool;
  const saveMlbDraftSession = vi.fn(async (next: LeagueBuilderMlbDraftSession) => next);
  return {
    leagues: [{
      id: LEAGUE_ID, name: 'Performance League', teamIds: TEAM_IDS, conferences: [], divisions: [],
      defaultRulesPreset: 'standard', draftFormat: 'snake', tier: 'standard', balanceMode: 'taxed',
      salaryCap: TIER_CAPS.standard.tierCap, createdDate: '2026-07-11', lastModified: '2026-07-11',
    }],
    teams, players, isLoading: false, error: null,
    getRegisteredPool: vi.fn(async () => pool),
    getMlbDraftSession: vi.fn(async () => session),
    saveMlbDraftSession,
  } as unknown as UseLeagueBuilderDataReturn;
}

function resetProfile(): void {
  engineProfile.rationalRoom = 0;
  engineProfile.legalFinish = 0;
  engineProfile.seatingProof = 0;
  engineProfile.pickProof = 0;
  engineProfile.seatingProofResult = null;
}

function resetCallCounts(): void {
  engineProfile.rationalRoom = 0;
  engineProfile.legalFinish = 0;
  engineProfile.seatingProof = 0;
  engineProfile.pickProof = 0;
}

describe('PERFROOM production-scale call profile', () => {
  beforeEach(() => {
    resetProfile();
    useLeagueBuilderDataMock.mockReturnValue(fixture());
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test('profiles initial room render and a pure re-render at 250 players / 8 clubs / 176 picks', async () => {
    const start = performance.now();
    const ui = <MemoryRouter initialEntries={[`/snake-room?leagueId=${LEAGUE_ID}`]}><SnakeDraftRoom /></MemoryRouter>;
    const view = render(ui);
    await screen.findByTestId('snake-draft-room', {}, { timeout: 30_000 });
    await waitFor(() => expect(engineProfile.seatingProof).toBe(1), { timeout: 30_000 });
    const initialMs = performance.now() - start;
    const afterInitial = { ...engineProfile };

    const rerenderStart = performance.now();
    view.rerender(ui);
    await act(async () => { await Promise.resolve(); });
    const rerenderMs = performance.now() - rerenderStart;

    const profile = {
      initialMs: Math.round(initialMs),
      rerenderMs: Math.round(rerenderMs),
      initialRationalRoomCalls: afterInitial.rationalRoom,
      initialLegalFinishCalls: afterInitial.legalFinish,
      initialSeatingProofCalls: afterInitial.seatingProof,
      initialPickProofCalls: afterInitial.pickProof,
      pureRerenderRationalRoomCalls: engineProfile.rationalRoom - afterInitial.rationalRoom,
      pureRerenderLegalFinishCalls: engineProfile.legalFinish - afterInitial.legalFinish,
      pureRerenderSeatingProofCalls: engineProfile.seatingProof - afterInitial.seatingProof,
      pureRerenderPickProofCalls: engineProfile.pickProof - afterInitial.pickProof,
    };
    console.info('PERFROOM_PROFILE render', JSON.stringify(profile));
    expect(profile.initialRationalRoomCalls).toBe(0);
    expect(profile.initialLegalFinishCalls).toBe(1);
    expect(profile.initialSeatingProofCalls).toBe(1);
    expect(profile.pureRerenderRationalRoomCalls).toBe(0);
    expect(profile.pureRerenderLegalFinishCalls).toBe(0);
    expect(profile.pureRerenderSeatingProofCalls).toBe(0);
    expect(profile.initialPickProofCalls).toBeLessThanOrEqual(1);
    expect(profile.pureRerenderPickProofCalls).toBe(0);

    resetCallCounts();
    const revealStart = performance.now();
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL PERFORMANCE CLUB 1 SEAT' }));
    await screen.findByTestId('private-draft-desk', {}, { timeout: 30_000 });
    console.info('PERFROOM_PROFILE reveal', JSON.stringify({
      revealMs: Math.round(performance.now() - revealStart),
      rationalRoomCalls: engineProfile.rationalRoom,
      legalFinishCalls: engineProfile.legalFinish,
      seatingProofCalls: engineProfile.seatingProof,
    }));
    // JSDOM has no Worker. The desk must stay interactive without ever running
    // the future-pick playout synchronously on React's UI thread.
    expect(engineProfile.rationalRoom).toBe(0);
    expect(engineProfile.legalFinish).toBeLessThanOrEqual(22);
  }, 60_000);

  test('profiles one early-draft guide ask without precomputing any other pick', async () => {
    const directStart = performance.now();
    searchSnakeGuidePackage({
      session: profileSession,
      buyerTeamId: TEAM_IDS[0],
      targetPick: 2,
      pickValueChart: derivePickValueChart(profilePool.players.map((row) => row.iv), 176, 8),
      seatingProofInput: { clubs: [], pool: [], baseCaps: [], realTeamCount: 8 },
    });
    const directSearchMs = performance.now() - directStart;
    resetCallCounts();
    render(<MemoryRouter initialEntries={[`/snake-room?leagueId=${LEAGUE_ID}`]}><SnakeDraftRoom /></MemoryRouter>);
    await screen.findByTestId('snake-draft-room', {}, { timeout: 30_000 });
    await waitFor(() => expect(engineProfile.seatingProof).toBe(1), { timeout: 30_000 });
    resetCallCounts();

    fireEvent.click(screen.getByRole('button', { name: 'THE GUIDE' }));
    fireEvent.change(screen.getByLabelText('WHAT WOULD IT COST TO REACH PICK N?'), { target: { value: '2' } });
    const start = performance.now();
    fireEvent.click(screen.getByRole('button', { name: 'CHECK PICK 2' }));
    await waitFor(() => expect(screen.getByLabelText('Shared trade guide').textContent).toMatch(/OFFER|NO LEGAL GUIDE TRADE/i), { timeout: 60_000 });
    const guideMs = performance.now() - start;
    console.info('PERFROOM_PROFILE guide', JSON.stringify({
      directSearchMs: Math.round(directSearchMs),
      guideMs: Math.round(guideMs),
      seatingProofCalls: engineProfile.seatingProof,
      rationalRoomCalls: engineProfile.rationalRoom,
      legalFinishCalls: engineProfile.legalFinish,
    }));
    expect(engineProfile.seatingProof).toBeLessThanOrEqual(1);
  }, 90_000);
});
