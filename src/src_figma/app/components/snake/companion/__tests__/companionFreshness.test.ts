import { afterEach, describe, expect, it, vi } from 'vitest';

import { sameDraftSessionSnapshot, startCompanionFreshness } from '../companionFreshness';

afterEach(() => vi.useRealTimers());

describe('S5 companion freshness', () => {
  it('treats unchanged rows as stable but detects a claim change even at the same revision', () => {
    const current = {
      id: 'draft-1', lastModified: '2026-07-14T00:00:00.000Z', revision: 4,
      snakeCompanions: { claims: [{ claimId: 'claim-1', status: 'approved' }] },
      seatBoards: { 'team-a': { revision: 2 } },
      farmSeatBoards: { 'team-a': { revision: 3 } },
    };
    expect(sameDraftSessionSnapshot(current, structuredClone(current))).toBe(true);
    expect(sameDraftSessionSnapshot(current, {
      ...structuredClone(current),
      snakeCompanions: { claims: [{ claimId: 'claim-1', status: 'revoked' }] },
    })).toBe(false);
    expect(sameDraftSessionSnapshot(current, {
      ...structuredClone(current),
      seatBoards: { 'team-a': { revision: 3 } },
    })).toBe(false);
    expect(sameDraftSessionSnapshot(current, {
      ...structuredClone(current),
      farmSeatBoards: { 'team-a': { revision: 4 } },
    })).toBe(false);
  });

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

  it('never overlaps a slow pull and resumes after that pull settles', async () => {
    vi.useFakeTimers();
    let finishPull: (() => void) | null = null;
    const pullAndRefresh = vi.fn(() => new Promise<void>((resolve) => { finishPull = resolve; }));
    const stop = startCompanionFreshness({ pullAndRefresh });

    vi.advanceTimersByTime(15_000);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(pullAndRefresh).toHaveBeenCalledTimes(1);

    finishPull?.();
    await Promise.resolve();
    vi.advanceTimersByTime(5_000);
    expect(pullAndRefresh).toHaveBeenCalledTimes(2);

    stop();
  });
});
