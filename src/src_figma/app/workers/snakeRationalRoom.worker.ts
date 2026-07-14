/// <reference lib="webworker" />

import {
  playSnakeRationalRoomProgressively,
} from '../../../engines/snakeRationalRoom';
import type {
  SnakeRationalRiskWorkerRequest,
  SnakeRationalRiskWorkerResponse,
} from '../components/snake/desk/useSnakeRationalRisks';

export function runSnakeRationalRiskWorkerRequest(
  request: SnakeRationalRiskWorkerRequest,
  postMessage: (response: SnakeRationalRiskWorkerResponse) => void,
): void {
  let response: SnakeRationalRiskWorkerResponse;
  try {
    const complete = playSnakeRationalRoomProgressively(
      { ...request.input, includeScarcity: true },
      (decision) => postMessage({
        key: request.key,
        phase: 'decision',
        status: 'ready',
        risks: decision.risks,
        scarcity: null,
        scarcityWitness: null,
        scenarios: decision.scenarios,
        nextPick: decision.nextPick,
      } satisfies SnakeRationalRiskWorkerResponse),
      { requestKey: request.key, witnessSecret: request.witnessSecret },
    );
    response = {
      key: request.key,
      phase: 'complete',
      status: complete.status,
      risks: complete.risks,
      scarcity: complete.scarcity,
      scarcityWitness: complete.scarcityWitness,
      scenarios: complete.scenarios,
      nextPick: complete.nextPick,
    };
  } catch {
    response = {
      key: request.key,
      phase: 'complete',
      status: 'unavailable',
      risks: [],
      scarcity: [],
      scarcityWitness: null,
      scenarios: [],
      nextPick: null,
    };
  }
  postMessage(response);
}

self.onmessage = (event: MessageEvent<SnakeRationalRiskWorkerRequest>) => {
  runSnakeRationalRiskWorkerRequest(event.data, (response) => self.postMessage(response));
};

export {};
