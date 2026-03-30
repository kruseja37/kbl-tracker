import { describe, expect, test, vi } from 'vitest';

const { mockGetGameEvents } = vi.hoisted(() => ({
  mockGetGameEvents: vi.fn(),
}));

vi.mock('../../../utils/eventLog', () => ({
  getGameEvents: mockGetGameEvents,
}));

import { reconcileScoreFromEvents } from '../../../utils/scoreReconciliation';

describe('scoreReconciliation', () => {
  test('totals runs for the correct team from persisted at-bat events', async () => {
    mockGetGameEvents.mockResolvedValue([
      { halfInning: 'TOP', runsScored: 2 },
      { halfInning: 'BOTTOM', runsScored: ['runner-1'] },
      { halfInning: 'BOTTOM', runsScored: ['runner-2', 'runner-3'] },
      { halfInning: 'TOP', runsScored: 0 },
    ]);

    await expect(reconcileScoreFromEvents('game-1')).resolves.toEqual({
      away: 2,
      home: 3,
    });
  });
});
