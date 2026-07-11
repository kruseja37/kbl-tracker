import { act } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { appendDetectedFameEvents } from '../../app/hooks/useFameTracking';
import { detectWalkOffHREvent } from '../../app/engines/fameAutoDetections';
import type { AtBatEvent } from '../../../utils/eventLog';
import {
  initializeGame,
  getHarnessMocks,
  renderGameStateHook,
  resetHarnessMocks,
} from './huntfixTrackerTestHarness';

const mocks = getHarnessMocks();

function processedFameEvents() {
  return mocks.processCompletedGame.mock.calls.at(-1)?.[0]?.fameEvents ?? [];
}

async function recordThreeStrikeouts(
  result: ReturnType<typeof renderGameStateHook>['result'],
) {
  for (let index = 0; index < 3; index += 1) {
    await act(async () => {
      await result.current.recordOut('K');
    });
  }
}

async function recordImmaculateHalfInning(
  result: ReturnType<typeof renderGameStateHook>['result'],
  pitcherId: string,
  finalCount: number,
) {
  await recordThreeStrikeouts(result);
  act(() => result.current.endInning());
  await act(async () => {
    await result.current.confirmPitchCount(pitcherId, finalCount);
  });

  const pitchEvent = mocks.logBetweenPlayEvent.mock.calls
    .map(([event]) => event)
    .filter((event) => event.type === 'pitch_count_update')
    .at(-1);
  expect(pitchEvent?.eventId).toBeTruthy();
  return pitchEvent;
}

function configureLedgerUndo({
  pitchEvent,
  pairedAtBatId,
  beforeAtBatIds = [pairedAtBatId],
  beforeBetweenPlayIds = [pitchEvent.eventId],
  additionallyUndoneBetweenPlayIds = [],
}: {
  pitchEvent: { eventId: string; eventIndex: number };
  pairedAtBatId: string;
  beforeAtBatIds?: string[];
  beforeBetweenPlayIds?: string[];
  additionallyUndoneBetweenPlayIds?: string[];
}) {
  const beforeAtBats = beforeAtBatIds.map((eventId) => ({ eventId }));
  const afterAtBats = beforeAtBatIds.map((eventId) => ({
    eventId,
    ...(eventId === pairedAtBatId ? { undoneAt: 1 } : {}),
  }));
  const newlyUndoneBetweenPlayIds = new Set([
    pitchEvent.eventId,
    ...additionallyUndoneBetweenPlayIds,
  ]);
  const allBetweenPlayIds = [
    ...new Set([
      ...beforeBetweenPlayIds,
      ...additionallyUndoneBetweenPlayIds,
    ]),
  ];
  const beforeBetweenPlays = allBetweenPlayIds.map((eventId) => ({ eventId }));
  const afterBetweenPlays = allBetweenPlayIds.map((eventId) => ({
    eventId,
    ...(newlyUndoneBetweenPlayIds.has(eventId) ? { undoneAt: 1 } : {}),
  }));

  mocks.getGameEvents
    .mockResolvedValueOnce(beforeAtBats)
    .mockResolvedValueOnce(afterAtBats);
  mocks.getBetweenPlayEvents
    .mockResolvedValueOnce(beforeBetweenPlays)
    .mockResolvedValueOnce(afterBetweenPlays);
  mocks.getBetweenPlayEvent.mockResolvedValueOnce(pitchEvent);
  mocks.undoMostRecentGameAction
    .mockResolvedValueOnce({
      kind: 'betweenPlay',
      eventId: pitchEvent.eventId,
      eventIndex: pitchEvent.eventIndex,
    })
    .mockResolvedValueOnce({
      kind: 'atBat',
      eventId: pairedAtBatId,
      eventIndex: Number(pairedAtBatId.split('_').at(-1)),
    });
}

async function flushCurrentGameSnapshot() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1_000);
  });
  const snapshot = mocks.saveCurrentGame.mock.calls.at(-1)?.[0];
  expect(snapshot).toBeTruthy();
  return snapshot;
}

describe('HUNTFIX-TRACKER-1 T4 fame undo linkage', () => {
  beforeEach(resetHarnessMocks);

  test('play plus fame then paired undo removes fame from the next archive snapshot', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 't4-single');
    const pitchEvent = await recordImmaculateHalfInning(result, 'home-sp', 9);
    configureLedgerUndo({
      pitchEvent,
      pairedAtBatId: 't4-single_3',
    });

    await act(async () => {
      await result.current.undoLastAction({ skipReload: true });
      await result.current.endGame();
    });

    expect(processedFameEvents()).toEqual([]);
  });

  test('undoing the last of two fame plays preserves only the earlier fame event', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 't4-multiple');
    const firstPitchEvent = await recordImmaculateHalfInning(result, 'home-sp', 9);
    const secondPitchEvent = await recordImmaculateHalfInning(result, 'away-sp', 9);
    configureLedgerUndo({
      pitchEvent: secondPitchEvent,
      pairedAtBatId: 't4-multiple_6',
      beforeAtBatIds: ['t4-multiple_3', 't4-multiple_6'],
      beforeBetweenPlayIds: [firstPitchEvent.eventId, secondPitchEvent.eventId],
    });

    await act(async () => {
      await result.current.undoLastAction({ skipReload: true });
      await result.current.endGame();
    });

    expect(processedFameEvents()).toHaveLength(1);
    expect(processedFameEvents()[0]).toMatchObject({
      eventType: 'IMMACULATE_INNING',
      playerId: 'home-sp',
      sourceEventIds: [firstPitchEvent.eventId],
    });
  });

  test('refresh then grouped paired undo removes fame for every newly-undone row', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 't4-refresh-group');
    const pitchEvent = await recordImmaculateHalfInning(result, 'home-sp', 9);
    const savedSnapshot = await flushCurrentGameSnapshot();
    expect(savedSnapshot.fameEvents[0].sourceEventIds).toEqual([
      pitchEvent.eventId,
    ]);

    const relatedEventId = 't4-refresh-group_related';
    const refreshSnapshot = {
      ...savedSnapshot,
      fameEvents: [
        ...savedSnapshot.fameEvents,
        {
          ...savedSnapshot.fameEvents[0],
          id: 't4-refresh-group_fame_related',
          eventType: 'GROUP_RELATED_FAME',
          sourceEventIds: [relatedEventId],
        },
      ],
    };
    mocks.loadCurrentGame.mockResolvedValueOnce(refreshSnapshot);
    mocks.getBetweenPlayEvents.mockResolvedValueOnce([]);
    await act(async () => {
      expect(await result.current.loadExistingGame({ preferSnapshot: true })).toBe(true);
    });

    configureLedgerUndo({
      pitchEvent,
      pairedAtBatId: 't4-refresh-group_3',
      additionallyUndoneBetweenPlayIds: [relatedEventId],
    });
    await act(async () => {
      await result.current.undoLastAction({ skipReload: true });
      await result.current.endGame();
    });

    expect(processedFameEvents()).toEqual([]);
  });

  test('elimination archive receives the hook fame ledger exactly once', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 't4-elimination', {
      competitionType: 'elimination',
      competitionId: 'elimination-run-1',
    });
    await recordImmaculateHalfInning(result, 'home-sp', 9);

    await act(async () => {
      await result.current.endGame({
        competitionType: 'elimination',
        competitionId: 'elimination-run-1',
      });
    });

    expect(mocks.appendEliminationGameFameToRun).toHaveBeenCalledTimes(1);
    const archivedFame = mocks.appendEliminationGameFameToRun.mock.calls[0][2];
    expect(archivedFame).toHaveLength(1);
    expect(archivedFame[0].eventType).toBe('IMMACULATE_INNING');
    expect(processedFameEvents()).toHaveLength(1);
  });

  test('auto-detected walk-off reaches the archive exactly once', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 'fame-cleanup-walkoff');
    const sourceAtBat = {
      eventId: 'fame-cleanup-walkoff_27',
      result: 'HR',
      isWalkOff: true,
      halfInning: 'BOTTOM',
      inning: 9,
      batterId: 'home-batter-1',
      batterName: 'Home Batter 1',
      leverageIndex: 4.2,
    } as AtBatEvent;
    const detections = detectWalkOffHREvent(sourceAtBat, 9);
    const recordedDetectionKeys = new Set<string>();

    act(() => {
      appendDetectedFameEvents({
        events: detections,
        recordedDetectionKeys,
        appendFameEvent: result.current.appendFameEvent,
        sourceEventIds: [sourceAtBat.eventId],
      });
      appendDetectedFameEvents({
        events: detections,
        recordedDetectionKeys,
        appendFameEvent: result.current.appendFameEvent,
        sourceEventIds: [sourceAtBat.eventId],
      });
    });

    await act(async () => {
      await result.current.endGame();
    });

    expect(processedFameEvents()).toHaveLength(1);
    expect(processedFameEvents()[0]).toMatchObject({
      eventType: 'WALK_OFF_HR',
      playerId: 'home-batter-1',
      sourceEventIds: [sourceAtBat.eventId],
    });
  });

  test('game-end detection is archived unlinked before final persistence', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 'fame-cleanup-game-end');

    act(() => {
      appendDetectedFameEvents({
        events: [{
          detectionKey: 'game-end:fame-cleanup-game-end:PERFECT_GAME:home-sp',
          eventType: 'PERFECT_GAME',
          playerId: 'home-sp',
          playerName: 'Home Starter',
          inning: 9,
          halfInning: 'BOTTOM',
          leverageIndex: 1,
        }],
        recordedDetectionKeys: new Set<string>(),
        appendFameEvent: result.current.appendFameEvent,
      });
    });

    await act(async () => {
      await result.current.endGame();
    });

    expect(processedFameEvents()).toHaveLength(1);
    expect(processedFameEvents()[0]).toMatchObject({
      eventType: 'PERFECT_GAME',
      playerId: 'home-sp',
    });
    expect(processedFameEvents()[0]).not.toHaveProperty('sourceEventIds');
  });

  test('web-gem provenance makes undo remove its fame from the archive', async () => {
    const { result } = renderGameStateHook();
    await initializeGame(result, 'fame-cleanup-web-gem');
    const sourceEventId = 'fame-cleanup-web-gem_1';

    act(() => {
      result.current.startGame();
    });

    await act(async () => {
      await result.current.recordEvent('WEB_GEM', 'home-batter-2', {
        actorId: 'home-batter-2',
        actorName: 'Home Batter 2',
        sourceEventIds: [sourceEventId],
      });
    });

    mocks.getGameEvents
      .mockResolvedValueOnce([{ eventId: sourceEventId }])
      .mockResolvedValueOnce([{ eventId: sourceEventId, undoneAt: 1 }]);
    mocks.getBetweenPlayEvents
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mocks.undoMostRecentGameAction.mockResolvedValueOnce({
      kind: 'atBat',
      eventId: sourceEventId,
      eventIndex: 1,
    });

    await act(async () => {
      await result.current.undoLastAction({ skipReload: true });
      await result.current.endGame();
    });

    expect(processedFameEvents()).toEqual([]);
  });
});
