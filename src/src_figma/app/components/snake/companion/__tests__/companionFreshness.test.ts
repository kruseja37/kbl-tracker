import { afterEach, describe, expect, it, vi } from 'vitest';

import { startCompanionFreshness } from '../companionFreshness';

afterEach(() => vi.useRealTimers());

describe('S5 companion freshness', () => {
  it('pulls every five seconds and whenever the companion becomes visible, then cleans up', () => {
    vi.useFakeTimers();
    const pullAndRefresh = vi.fn();
    const stop = startCompanionFreshness({ pullAndRefresh });

    vi.advanceTimersByTime(10_000);
    expect(pullAndRefresh).toHaveBeenCalledTimes(2);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(pullAndRefresh).toHaveBeenCalledTimes(3);

    stop();
    vi.advanceTimersByTime(5_000);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(pullAndRefresh).toHaveBeenCalledTimes(3);
  });
});
