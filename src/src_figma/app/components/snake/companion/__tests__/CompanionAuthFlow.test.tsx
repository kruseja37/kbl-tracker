import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  authUser: null as { id: string; email: string } | null,
  authError: null as string | null,
  signIn: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
  pullCatalog: vi.fn(async () => undefined),
  refreshCatalog: vi.fn(async () => undefined),
  getRegisteredPool: vi.fn(async () => null),
  runProof: vi.fn(),
  useLive: vi.fn(),
  live: {} as Record<string, unknown>,
}));

vi.mock('../../../../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: harness.authUser,
    isAuthenticated: harness.authUser !== null,
    isLoading: false,
    error: harness.authError,
    signIn: harness.signIn,
    signOut: harness.signOut,
  }),
}));

vi.mock('../../../../../hooks/useLeagueBuilderData', () => ({
  toConstructionPlayer: vi.fn(),
  useLeagueBuilderData: () => ({
    leagues: [],
    teams: [],
    players: [],
    rulesPresets: [],
    isLoading: false,
    error: null,
    getRegisteredPool: harness.getRegisteredPool,
    refresh: harness.refreshCatalog,
  }),
}));

vi.mock('../../../../../../utils/syncEngine', () => ({
  syncEngine: { pull: harness.pullCatalog },
}));

vi.mock('../../../../../../utils/franchisePhase2Flags', () => ({
  isSnakeDraftV1Enabled: () => true,
}));

vi.mock('../useSnakeLiveCompanionRoom', () => ({
  useSnakeLiveCompanionRoom: (options: unknown) => harness.useLive(options),
}));

vi.mock('../../setup/snakeSetupProofClient', () => ({
  fingerprintSnakeSetupProofInput: () => 'proof',
  useSnakeSetupProofClient: () => ({ runProof: harness.runProof }),
}));

import SnakeCompanion from '../../../../pages/SnakeCompanion';

function setLiveRoom(overrides: Record<string, unknown> = {}) {
  harness.live = {
    room: null,
    activeRoomId: null,
    publicSession: null,
    deviceId: null,
    claims: [],
    intents: [],
    boardsByTeamId: {},
    events: [],
    status: 'idle',
    subscriptionStatus: null,
    error: null,
    working: false,
    accessReady: false,
    refresh: vi.fn(async () => undefined),
    claimDesk: vi.fn(async () => [{ status: 'pending' }]),
    writeBoard: vi.fn(),
    submitIntent: vi.fn(),
    disconnect: vi.fn(async () => undefined),
    ...overrides,
  };
}

function deferredCatalogPull() {
  let resolve = () => undefined;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('SnakeCompanion live-room entry', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/snake-companion');
    harness.authUser = null;
    harness.authError = null;
    harness.signIn.mockClear();
    harness.signOut.mockClear();
    harness.pullCatalog.mockReset().mockResolvedValue(undefined);
    harness.refreshCatalog.mockClear();
    harness.getRegisteredPool.mockClear();
    harness.runProof.mockClear();
    setLiveRoom();
    harness.useLive.mockReset().mockImplementation(() => harness.live);
  });

  it('keeps a signed-out device behind the account gate', () => {
    render(<SnakeCompanion />);

    expect(screen.getByRole('heading', { name: 'SIGN IN' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).not.toBeInTheDocument();
  });

  it('opens room claim at once and does not wait for the static catalog pull', async () => {
    harness.authUser = { id: 'user-owner', email: 'owner@example.com' };
    const pull = deferredCatalogPull();
    harness.pullCatalog.mockImplementationOnce(async () => pull.promise);

    render(<SnakeCompanion />);

    expect(screen.getByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).toBeInTheDocument();
    expect(harness.useLive).toHaveBeenLastCalledWith({ ownerUserId: 'user-owner', enabled: true });
    fireEvent.change(screen.getByLabelText('GM NAME'), { target: { value: 'Poke Foster' } });
    fireEvent.change(screen.getByLabelText('ROOM CODE'), { target: { value: '1252' } });
    fireEvent.click(screen.getByRole('button', { name: 'ASK TO SEE MY DESK' }));

    await waitFor(() => {
      expect(harness.live.claimDesk).toHaveBeenCalledWith('Poke Foster', '1252');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('ASK THE MAIN DEVICE TO APPROVE THIS DESK.');
    expect(harness.refreshCatalog).not.toHaveBeenCalled();

    pull.resolve();
    await waitFor(() => expect(harness.refreshCatalog).toHaveBeenCalledOnce());
  });

  it('keeps live room claim usable when the static catalog pull fails', async () => {
    harness.authUser = { id: 'user-owner', email: 'owner@example.com' };
    harness.pullCatalog.mockRejectedValueOnce(new Error('STATIC CATALOG IS OFFLINE.'));

    render(<SnakeCompanion />);

    await waitFor(() => expect(harness.pullCatalog).toHaveBeenCalledOnce());
    expect(screen.getByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('GM NAME'), { target: { value: 'Poke Foster' } });
    fireEvent.change(screen.getByLabelText('ROOM CODE'), { target: { value: '1252' } });
    fireEvent.click(screen.getByRole('button', { name: 'ASK TO SEE MY DESK' }));

    await waitFor(() => expect(harness.live.claimDesk).toHaveBeenCalledOnce());
  });

  it('keeps the privacy cover until live refresh succeeds', async () => {
    harness.authUser = { id: 'user-owner', email: 'owner@example.com' };
    localStorage.setItem('kbl-snake-companion-device-covered', 'true');
    const refresh = vi.fn(async () => undefined);
    setLiveRoom({ refresh });

    render(<SnakeCompanion />);

    expect(screen.getByRole('heading', { name: 'DEVICE COVERED' })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'RETURN TO DESK' }));
    });

    expect(refresh).toHaveBeenCalledOnce();
    expect(localStorage.getItem('kbl-snake-companion-device-covered')).toBeNull();
    expect(screen.getByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).toBeInTheDocument();
  });
});
