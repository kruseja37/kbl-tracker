import { describe, expect, test, vi } from 'vitest';

const { mockGetGameEvents } = vi.hoisted(() => ({
  mockGetGameEvents: vi.fn(),
}));

vi.mock('../../../utils/eventLog', () => ({
  getGameEvents: mockGetGameEvents,
}));

import {
  compareScores,
  reconcileScoreFromEvents,
} from '../../../utils/scoreReconciliation';

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

  test('describes removing a run in the correct direction', () => {
    expect(compareScores(
      { away: 0, home: 1 },
      { away: 0, home: 0 },
    )).toEqual({
      current: { away: 0, home: 1 },
      reconciled: { away: 0, home: 0 },
      awayDelta: 0,
      homeDelta: -1,
      needsCorrection: true,
    });
  });

  test('describes adding a run in the correct direction', () => {
    expect(compareScores(
      { away: 0, home: 0 },
      { away: 0, home: 1 },
    )).toEqual({
      current: { away: 0, home: 0 },
      reconciled: { away: 0, home: 1 },
      awayDelta: 0,
      homeDelta: 1,
      needsCorrection: true,
    });
  });
});
