import { describe, expect, it, vi } from 'vitest';

import { runCompanionTradeWrite } from '../companionTradeWrite';

describe('companion trade writes', () => {
  it('pulls cloud truth before it writes', async () => {
    const order: string[] = [];
    const saved = await runCompanionTradeWrite({
      pull: vi.fn(async () => { order.push('pull'); }),
      write: vi.fn(async () => { order.push('write'); return 'saved'; }),
      refreshAfterFailure: vi.fn(async () => { order.push('refresh'); }),
    });

    expect(saved).toBe('saved');
    expect(order).toEqual(['pull', 'write']);
  });

  it('never writes after a failed pull and refreshes before reporting the failure', async () => {
    const order: string[] = [];
    const failure = new Error('cloud unavailable');
    const write = vi.fn(async () => { order.push('write'); return 'saved'; });

    await expect(runCompanionTradeWrite({
      pull: vi.fn(async () => { order.push('pull'); throw failure; }),
      write,
      refreshAfterFailure: vi.fn(async () => { order.push('refresh'); }),
    })).rejects.toBe(failure);

    expect(write).not.toHaveBeenCalled();
    expect(order).toEqual(['pull', 'refresh']);
  });

  it('refreshes and rethrows a rejected atomic write', async () => {
    const order: string[] = [];
    const failure = new Error('draft moved');

    await expect(runCompanionTradeWrite({
      pull: vi.fn(async () => { order.push('pull'); }),
      write: vi.fn(async () => { order.push('write'); throw failure; }),
      refreshAfterFailure: vi.fn(async () => { order.push('refresh'); }),
    })).rejects.toBe(failure);

    expect(order).toEqual(['pull', 'write', 'refresh']);
  });
});
