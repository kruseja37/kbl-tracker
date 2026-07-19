import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  enterLiveRoomIsolation: vi.fn(async () => undefined),
  leaveLiveRoomIsolation: vi.fn(),
  setAuthenticatedUser: vi.fn(async () => undefined),
  init: vi.fn(async () => undefined),
  pull: vi.fn(async () => undefined),
  useLive: vi.fn(),
}));

vi.mock('../../../../../../supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
    },
  },
}));

vi.mock('../../../../../../utils/syncEngine', () => ({
  syncEngine: {
    enterLiveRoomIsolation: mocks.enterLiveRoomIsolation,
    leaveLiveRoomIsolation: mocks.leaveLiveRoomIsolation,
    setAuthenticatedUser: mocks.setAuthenticatedUser,
    init: mocks.init,
    pull: mocks.pull,
  },
}));

vi.mock('../../../../../../utils/franchisePhase2Flags', () => ({
  isSnakeDraftV1Enabled: () => true,
}));

vi.mock('../useSnakeLiveCompanionRoom', () => ({
  useSnakeLiveCompanionRoom: (options: unknown) => mocks.useLive(options),
}));

vi.mock('../../setup/snakeSetupProofClient', () => ({
  fingerprintSnakeSetupProofInput: () => 'proof',
  useSnakeSetupProofClient: () => ({ runProof: vi.fn() }),
}));

import SnakeCompanion from '../../../../pages/SnakeCompanion';

describe('SnakeCompanion generic sync isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-owner', email: 'owner@example.test' } } },
    });
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.useLive.mockReturnValue({
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
      claimDesk: vi.fn(),
      writeBoard: vi.fn(),
      submitIntent: vi.fn(),
      disconnect: vi.fn(async () => undefined),
    });
  });

  test('opens account access without starting account-wide sync work', async () => {
    const view = render(<SnakeCompanion />);

    expect(await screen.findByRole('heading', { name: 'CLAIM YOUR PRIVATE DESK' })).toBeInTheDocument();
    expect(mocks.enterLiveRoomIsolation).toHaveBeenCalledOnce();
    expect(mocks.useLive).toHaveBeenLastCalledWith({ ownerUserId: 'user-owner', enabled: true });
    expect(mocks.setAuthenticatedUser).not.toHaveBeenCalled();
    expect(mocks.init).not.toHaveBeenCalled();
    expect(mocks.pull).not.toHaveBeenCalled();

    view.unmount();
    expect(mocks.leaveLiveRoomIsolation).toHaveBeenCalledOnce();
  });
});
