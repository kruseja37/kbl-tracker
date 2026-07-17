/// <reference lib="webworker" />

import { proveSimultaneousSnakeSeating } from '../../../engines/snakeSeatingProof';
import type {
  SnakeSetupProofWorkerRequest,
  SnakeSetupProofWorkerResponse,
} from '../components/snake/setup/snakeSetupProofClient';

self.onmessage = (event: MessageEvent<SnakeSetupProofWorkerRequest>) => {
  const { key, input } = event.data;
  try {
    const response: SnakeSetupProofWorkerResponse = {
      key,
      ok: true,
      proof: proveSimultaneousSnakeSeating(input),
    };
    self.postMessage(response);
  } catch (error) {
    const response: SnakeSetupProofWorkerResponse = {
      key,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};

export {};
