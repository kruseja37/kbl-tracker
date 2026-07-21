import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  let authChange: ((event: string, session: { user: { id: string; email?: string } } | null) => void) | null = null;
  return {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    setAuthenticatedUser: vi.fn(),
    prepareForSignOut: vi.fn(),
    setAuthChange(callback: typeof authChange) {
      authChange = callback;
    },
    emitAuthChange(session: { user: { id: string; email?: string } } | null) {
      authChange?.('SIGNED_IN', session);
    },
  };
});

vi.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
      onAuthStateChange: vi.fn((callback) => {
        mocks.setAuthChange(callback);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
  },
}));

vi.mock('../../utils/syncEngine', () => ({
  syncEngine: {
    setAuthenticatedUser: mocks.setAuthenticatedUser,
    prepareForSignOut: mocks.prepareForSignOut,
  },
}));

import { useAuth } from '../useAuth';

describe('useAuth live-room independence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setAuthChange(null);
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.setAuthenticatedUser.mockResolvedValue(undefined);
    mocks.prepareForSignOut.mockResolvedValue(undefined);
  });

  test('authenticates even when generic backup binding fails', async () => {
    mocks.setAuthenticatedUser.mockRejectedValue(new Error('OUTBOX UNAVAILABLE'));
    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      mocks.emitAuthChange({ user: { id: 'user-1', email: 'gm@example.test' } });
    });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user?.id).toBe('user-1');
    expect(result.current.error).toBeNull();
  });

  test('finishes sign-out even when generic backup quarantine fails', async () => {
    mocks.prepareForSignOut.mockRejectedValue(new Error('OUTBOX UNAVAILABLE'));
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      mocks.emitAuthChange({ user: { id: 'user-1' } });
    });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await expect(result.current.signOut()).resolves.toBeUndefined();
    });

    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(result.current.user).toBeNull();
  });

  test('keeps companion auth separate from the generic backup engine', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'gm@example.test' } } },
    });
    const { result } = renderHook(() => useAuth({ bindGenericSync: false }));

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    act(() => {
      mocks.emitAuthChange({ user: { id: 'user-2', email: 'other@example.test' } });
    });
    await waitFor(() => expect(result.current.user?.id).toBe('user-2'));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mocks.setAuthenticatedUser).not.toHaveBeenCalled();
    expect(mocks.prepareForSignOut).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
});
