/// <reference lib="webworker" />

import { extractPoolFromDemand } from '../../../engines/poolFromDemand';
import type {
  SnakePoolShapeInput,
  SnakePoolShapeWorkerResponse,
} from '../components/snake/setup/snakePoolShapeClient';

self.onmessage = (event: MessageEvent<SnakePoolShapeInput>) => {
  try {
    const input = event.data;
    const response: SnakePoolShapeWorkerResponse = {
      ok: true,
      result: extractPoolFromDemand(
        input.universe,
        input.designs,
        input.selectedArchetypes,
        input.tier,
        input.options,
      ),
    };
    self.postMessage(response);
  } catch (error) {
    const response: SnakePoolShapeWorkerResponse = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};

export {};
