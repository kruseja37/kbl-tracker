import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LeagueBuilderMlbDraftSession, LeagueTemplate } from '../../../../../../utils/leagueBuilderStorage';
import { approveCompanionClaim } from '../companionModel';

type TestUser = { id: string; email: string };
type TestDeviceStore = {
  leagues: LeagueTemplate[];
  sessions: Map<string, LeagueBuilderMlbDraftSession>;
};

const harness = vi.hoisted(() => ({
  authUser: null as TestUser | null,
  authError: null as string | null,
  cloudByUser: new Map<string, TestDeviceStore>(),
  device: { leagues: [], sessions: new Map() } as TestDeviceStore,
  freshness: null as null | (() => Promise<void>),
  pullGate: null as null | { promise: Promise<void>; resolve: () => void },
  pull: vi.fn(async () => {
    if (harness.pullGate) await harness.pullGate.promise;
    const cloud = harness.authUser ? harness.cloudByUser.get(harness.authUser.id) : null;
    harness.device = cloud
      ? { leagues: structuredClone(cloud.leagues), sessions: new Map([...cloud.sessions].map(([key, value]) => [key, structuredClone(value)])) }
      : { leagues: [], sessions: new Map() };
  }),
  getMlbDraftSession: vi.fn(async (leagueId: string, seasonNumber = 1) => (
    harness.device.sessions.get(`${leagueId}:${seasonNumber}`) ?? null
  )),
  saveMlbDraftSession: vi.fn(async (session: LeagueBuilderMlbDraftSession) => {
    const saved = structuredClone(session);
    harness.device.sessions.set(`${saved.leagueId}:${saved.seasonNumber}`, saved);
    if (harness.authUser) {
      const cloud = harness.cloudByUser.get(harness.authUser.id) ?? { leagues: [], sessions: new Map() };
      cloud.sessions.set(`${saved.leagueId}:${saved.seasonNumber}`, structuredClone(saved));
      harness.cloudByUser.set(harness.authUser.id, cloud);
    }
    return saved;
  }),
  patchMlbDraftSessionSnakeCompanions: vi.fn(async (input: {
    leagueId: string;
    seasonNumber?: number;
    patch: (current: LeagueBuilderMlbDraftSession['snakeCompanions']) => NonNullable<LeagueBuilderMlbDraftSession['snakeCompanions']>;
  }) => {
    const key = `${input.leagueId}:${input.seasonNumber ?? 1}`;
    const current = harness.device.sessions.get(key);
    if (!current) throw new Error('session missing');
    const saved = {
      ...current,
      snakeCompanions: input.patch(current.snakeCompanions),
      revision: (current.revision ?? 0) + 1,
    };
    harness.device.sessions.set(key, structuredClone(saved));
    if (harness.authUser) {
      const cloud = harness.cloudByUser.get(harness.authUser.id) ?? { leagues: [], sessions: new Map() };
      cloud.sessions.set(key, structuredClone(saved));
      harness.cloudByUser.set(harness.authUser.id, cloud);
    }
    return saved;
  }),
  patchMlbDraftSessionSeatBoard: vi.fn(),
}));

vi.mock('../../../../../../utils/leagueBuilderStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../../utils/leagueBuilderStorage')>();
  return {
    ...actual,
    patchMlbDraftSessionSnakeCompanions: harness.patchMlbDraftSessionSnakeCompanions,
    patchMlbDraftSessionSeatBoard: harness.patchMlbDraftSessionSeatBoard,
  };
});

vi.mock('../../../../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: harness.authUser,
    isAuthenticated: harness.authUser !== null,
    isLoading: false,
    error: harness.authError,
    signIn: async (email: string) => {
      harness.authError = null;
      harness.authUser = {
        id: email === 'owner@example.com' ? 'user-owner' : 'user-other',
        email,
      };
    },
    signOut: async () => {
      harness.authUser = null;
    },
  }),
}));

vi.mock('../../../../../hooks/useLeagueBuilderData', async () => {
  const React = await import('react');
  return {
    toConstructionPlayer: vi.fn(),
    useLeagueBuilderData: () => {
      const [, redraw] = React.useReducer((value: number) => value + 1, 0);
      const refresh = React.useCallback(async () => { redraw(); }, []);
      return {
        leagues: harness.device.leagues,
        teams: [],
        players: [],
        rulesPresets: [],
        isLoading: false,
        error: null,
        getRegisteredPool: vi.fn(async () => null),
        getMlbDraftSession: harness.getMlbDraftSession,
        saveMlbDraftSession: harness.saveMlbDraftSession,
        refresh,
      };
    },
  };
});

vi.mock('../../../../../../utils/syncEngine', () => ({
  syncEngine: { pull: harness.pull },
}));

vi.mock('../../../../../../utils/franchisePhase2Flags', () => ({
  isSnakeDraftV1Enabled: () => true,
}));

vi.mock('../companionFreshness', () => ({
  startCompanionFreshness: (input: { pullAndRefresh: () => Promise<void> }) => {
    harness.freshness = input.pullAndRefresh;
    return () => { harness.freshness = null; };
  },
}));

import SnakeCompanion from '../../../../pages/SnakeCompanion';

function league(): LeagueTemplate {
  return {
    id: 'league-1',
    name: 'Phone Test League',
    description: '',
    teamIds: ['team-a'],
    rulesPresetId: 'rules-1',
    createdDate: '2026-07-12T00:00:00.000Z',
    lastModified: '2026-07-12T00:00:00.000Z',
  };
}

function session(): LeagueBuilderMlbDraftSession {
  return {
    id: 'mlb-draft-league-1-1',
    leagueId: 'league-1',
    seasonNumber: 1,
    seed: 'seed',
    workflowVersion: 'snake-v2',
    engineMethodVersion: 'snake-v2',
    tier: 'standard',
    balanceMode: 'balanced',
    rounds: 22,
    pickOrder: [],
    completedPicks: [],
    currentPickIndex: 0,
    createdDate: '2026-07-12T00:00:00.000Z',
    lastModified: '2026-07-12T00:00:00.000Z',
    revision: 1,
    snakeSetup: {
      poolPlayerIds: [],
      clubs: [{ teamId: 'team-a', gmName: 'Alex', seatMode: 'companion' }],
      draftOrderTeamIds: ['team-a'],
    },
    snakeCompanions: { roomCode: '4821', claims: [] },
  };
}

function deferredPull() {
  let resolve = () => undefined;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('COMPANIONAUTH two-origin flow', () => {
  beforeEach(() => {
    localStorage.clear();
    harness.authUser = null;
    harness.authError = null;
    harness.device = { leagues: [], sessions: new Map() };
    harness.cloudByUser.clear();
    harness.cloudByUser.set('user-owner', {
      leagues: [league()],
      sessions: new Map([['league-1:1', session()]]),
    });
    harness.freshness = null;
    harness.pullGate = null;
    harness.pull.mockClear();
    harness.getMlbDraftSession.mockClear();
    harness.saveMlbDraftSession.mockClear();
    harness.patchMlbDraftSessionSnakeCompanions.mockClear();
    harness.patchMlbDraftSessionSeatBoard.mockClear();
  });

  afterEach(() => {
    harness.pullGate?.resolve();
  });

  it('gates a fresh device on auth, pulls the owner room, and round-trips claim approval', async () => {
    harness.pullGate = deferredPull();
    const view = render(<SnakeCompanion />);

    expect(screen.getByRole('heading', { name: 'SIGN IN' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'owner@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'SIGN IN' }));
    await act(async () => undefined);
    view.rerender(<SnakeCompanion />);

    expect(screen.getByText('PULLING YOUR LEAGUES…')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).not.toBeInTheDocument();

    harness.pullGate.resolve();
    harness.pullGate = null;
    expect(await screen.findByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).toBeInTheDocument();
    expect(screen.getByText(/ACCOUNT OWNER@EXAMPLE.COM/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('GM NAME'), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText('ROOM CODE'), { target: { value: '4821' } });
    fireEvent.click(screen.getByRole('button', { name: 'ASK TO SEE MY DESK' }));

    await waitFor(() => {
      const mainCopy = harness.cloudByUser.get('user-owner')?.sessions.get('league-1:1');
      expect(mainCopy?.snakeCompanions?.claims).toEqual([
        expect.objectContaining({ gmName: 'Alex', status: 'pending' }),
      ]);
    });
    expect(harness.pull).toHaveBeenCalledTimes(2);
    expect(harness.patchMlbDraftSessionSnakeCompanions).toHaveBeenCalledOnce();
    expect(harness.saveMlbDraftSession).not.toHaveBeenCalled();

    const mainCopy = harness.cloudByUser.get('user-owner')?.sessions.get('league-1:1');
    const pendingDeviceId = mainCopy?.snakeCompanions?.claims[0]?.deviceId;
    expect(mainCopy).toBeTruthy();
    expect(pendingDeviceId).toBeTruthy();
    const approved = approveCompanionClaim(mainCopy as LeagueBuilderMlbDraftSession, pendingDeviceId as string, 'approved');
    harness.cloudByUser.get('user-owner')?.sessions.set('league-1:1', approved);

    await act(async () => {
      await harness.freshness?.();
    });
    expect(harness.device.sessions.get('league-1:1')?.snakeCompanions?.claims[0]?.status).toBe('approved');
  });

  it('shows an honest account-empty state for a different signed-in user', async () => {
    harness.authUser = { id: 'user-other', email: 'other@example.com' };
    render(<SnakeCompanion />);

    expect(await screen.findByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).toBeInTheDocument();
    expect(await screen.findByText('NO OPEN SNAKE ROOM FOUND ON THIS ACCOUNT.')).toBeInTheDocument();
    expect(screen.queryByText('THAT ROOM CODE DOES NOT MATCH.')).not.toBeInTheDocument();
  });
});
