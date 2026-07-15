import { afterEach, describe, expect, it, vi } from 'vitest';

import { pullSnakeRoomTruth, startSnakeRoomFreshness } from '../snakeRoomFreshness';

afterEach(() => vi.useRealTimers());

describe('snake room cloud freshness', () => {
  it('pulls every five seconds and again when the main room becomes visible', () => {
    vi.useFakeTimers();
    const pullAndRefresh = vi.fn();
    const stop = startSnakeRoomFreshness({ pullAndRefresh });

    vi.advanceTimersByTime(10_000);
    expect(pullAndRefresh).toHaveBeenCalledTimes(2);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(pullAndRefresh).toHaveBeenCalledTimes(3);

    stop();
    vi.advanceTimersByTime(5_000);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(pullAndRefresh).toHaveBeenCalledTimes(3);
  });

  it('finishes the cloud pull before reading local room truth', async () => {
    const order: string[] = [];
    const result = await pullSnakeRoomTruth({
      pull: async () => { order.push('pull'); },
      read: async () => { order.push('read'); return 'fresh'; },
    });

    expect(result).toBe('fresh');
    expect(order).toEqual(['pull', 'read']);
  });

  it('does not read stale local room truth after a failed pull', async () => {
    const read = vi.fn(async () => 'stale');
    await expect(pullSnakeRoomTruth({
      pull: async () => { throw new Error('offline'); },
      read,
    })).rejects.toThrow('offline');
    expect(read).not.toHaveBeenCalled();
  });
});
