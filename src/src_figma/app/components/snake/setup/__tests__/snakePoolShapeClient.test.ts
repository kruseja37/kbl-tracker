import { describe, expect, it } from 'vitest';

import type { PoolFromDemandResult } from '../../../../../../engines/poolFromDemand';
import {
  runSnakePoolShape,
  type SnakePoolShapeInput,
  type SnakePoolShapeWorkerLike,
  type SnakePoolShapeWorkerResponse,
} from '../snakePoolShapeClient';

const INPUT: SnakePoolShapeInput = {
  universe: [],
  designs: [],
  selectedArchetypes: [],
  tier: 'standard',
  options: { teams: 8 },
};

const RESULT: PoolFromDemandResult = {
  players: [],
  size: 0,
  floors: {
    players: [],
    size: 0,
    targetSize: 0,
    claimedIds: [],
    floorIds: [],
    verdicts: [],
    balanced: true,
    repairRounds: 0,
    notes: [],
  },
  cells: [],
  shortfalls: [],
  designVerdicts: [],
  positionSupplyFloors: [],
};

class FakeWorker implements SnakePoolShapeWorkerLike {
  onmessage: ((event: MessageEvent<SnakePoolShapeWorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  messages: SnakePoolShapeInput[] = [];
  terminated = false;

  postMessage(message: SnakePoolShapeInput): void {
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(response: SnakePoolShapeWorkerResponse): void {
    this.onmessage?.({ data: response } as MessageEvent<SnakePoolShapeWorkerResponse>);
  }
}

describe('runSnakePoolShape', () => {
  it('moves the full shape request through a disposable worker', async () => {
    const worker = new FakeWorker();
    const pending = runSnakePoolShape(INPUT, { workerFactory: () => worker });
    expect(worker.messages).toEqual([INPUT]);
    worker.emit({ ok: true, result: RESULT });
    await expect(pending).resolves.toBe(RESULT);
    expect(worker.terminated).toBe(true);
  });

  it('terminates stale work when the caller aborts', async () => {
    const worker = new FakeWorker();
    const controller = new AbortController();
    const pending = runSnakePoolShape(INPUT, {
      signal: controller.signal,
      workerFactory: () => worker,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker.terminated).toBe(true);
  });

  it('surfaces worker failures without retrying on the UI thread', async () => {
    const worker = new FakeWorker();
    const pending = runSnakePoolShape(INPUT, { workerFactory: () => worker });
    worker.emit({ ok: false, error: 'shape failed' });
    await expect(pending).rejects.toThrow('shape failed');
    expect(worker.terminated).toBe(true);
  });
});
