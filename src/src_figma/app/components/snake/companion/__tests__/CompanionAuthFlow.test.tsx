import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  authUser: null as { id: string; email: string } | null,
  authError: null as string | null,
  signIn: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
  forbiddenCatalogPull: vi.fn(() => { throw new Error('GENERIC SYNC MUST NOT RUN.'); }),
  enterLiveRoomIsolation: vi.fn(async () => undefined),
  leaveLiveRoomIsolation: vi.fn(),
  forbiddenLeagueBuilderHook: vi.fn(() => { throw new Error('LOCAL LEAGUE BUILDER DATA MUST NOT BE READ.'); }),
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
  useLeagueBuilderData: harness.forbiddenLeagueBuilderHook,
}));

vi.mock('../../../../../../utils/syncEngine', () => ({
  syncEngine: {
    pull: harness.forbiddenCatalogPull,
    enterLiveRoomIsolation: harness.enterLiveRoomIsolation,
    leaveLiveRoomIsolation: harness.leaveLiveRoomIsolation,
  },
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
    catalog: null,
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
    resumedFromCapability: false,
    refresh: vi.fn(async () => undefined),
    claimDesk: vi.fn(async () => [{ status: 'pending' }]),
    writeBoard: vi.fn(),
    submitIntent: vi.fn(),
    disconnect: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('SnakeCompanion live-room entry', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/snake-companion');
    harness.authUser = null;
    harness.authError = null;
    harness.signIn.mockClear();
    harness.signOut.mockClear();
    harness.forbiddenCatalogPull.mockClear();
    harness.enterLiveRoomIsolation.mockClear();
    harness.leaveLiveRoomIsolation.mockClear();
    harness.forbiddenLeagueBuilderHook.mockClear();
    harness.runProof.mockClear();
    setLiveRoom();
    harness.useLive.mockReset().mockImplementation(() => harness.live);
  });

  it('keeps a signed-out device behind the account gate', () => {
    render(<SnakeCompanion />);

    expect(screen.getByRole('heading', { name: 'SIGN IN' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).not.toBeInTheDocument();
  });

  it('opens room claim without generic sync or local League Builder data', async () => {
    harness.authUser = { id: 'user-owner', email: 'owner@example.com' };

    render(<SnakeCompanion />);

    expect(await screen.findByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).toBeInTheDocument();
    expect(harness.enterLiveRoomIsolation).toHaveBeenCalledOnce();
    expect(harness.useLive).toHaveBeenLastCalledWith({ ownerUserId: 'user-owner', enabled: true });
    fireEvent.change(screen.getByLabelText('GM NAME'), { target: { value: 'Poke Foster' } });
    fireEvent.change(screen.getByLabelText('ROOM CODE'), { target: { value: '1252' } });
    fireEvent.click(screen.getByRole('button', { name: 'ASK TO SEE MY DESK' }));

    await waitFor(() => {
      expect(harness.live.claimDesk).toHaveBeenCalledWith('Poke Foster', '1252');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('ASK THE MAIN DEVICE TO APPROVE THIS DESK.');
    expect(harness.forbiddenCatalogPull).not.toHaveBeenCalled();
    expect(harness.forbiddenLeagueBuilderHook).not.toHaveBeenCalled();
  });

  it('keeps live room claim usable with an empty local League Builder database', async () => {
    harness.authUser = { id: 'user-owner', email: 'owner@example.com' };

    render(<SnakeCompanion />);

    expect(await screen.findByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('GM NAME'), { target: { value: 'Poke Foster' } });
    fireEvent.change(screen.getByLabelText('ROOM CODE'), { target: { value: '1252' } });
    fireEvent.click(screen.getByRole('button', { name: 'ASK TO SEE MY DESK' }));

    await waitFor(() => expect(harness.live.claimDesk).toHaveBeenCalledOnce());
    expect(harness.forbiddenCatalogPull).not.toHaveBeenCalled();
    expect(harness.forbiddenLeagueBuilderHook).not.toHaveBeenCalled();
  });

  it('lets an unclaimed device reach room claim even when the prior desk was covered', async () => {
    harness.authUser = { id: 'user-owner', email: 'owner@example.com' };
    localStorage.setItem('kbl-snake-companion-device-covered', 'true');
    const refresh = vi.fn(async () => undefined);
    setLiveRoom({ refresh });

    render(<SnakeCompanion />);

    expect(await screen.findByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
