/// <reference lib="webworker" />

import {
  createSnakeIdentitySupportCertificate,
  proveSimultaneousSnakeSeating,
} from '../../../engines/snakeSeatingProof';
import type {
  SnakeSetupProofWorkerRequest,
  SnakeSetupProofWorkerResponse,
} from '../components/snake/setup/snakeSetupProofClient';

self.onmessage = (event: MessageEvent<SnakeSetupProofWorkerRequest>) => {
  const { key, input } = event.data;
  try {
    const proof = proveSimultaneousSnakeSeating(input);
    const response: SnakeSetupProofWorkerResponse = {
      key,
      ok: true,
      proof,
      // This independent validation stays in the disposable worker. A successful search result is
      // not reusable shaping authority until it is rebound to the exact Full Sources input here.
      identitySupportCertificate: createSnakeIdentitySupportCertificate(input, proof),
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
