/// <reference lib="webworker" />

import { validateSnakeScarcityWitness } from '../../../engines/snakeRationalRoom';
import type {
  SnakeRationalRiskRequest,
  SnakeRationalRiskWorkerResponse,
} from '../components/snake/desk/useSnakeRationalRisks';

export interface SnakeScarcityVerifierWorkerRequest {
  verifierEpoch: number;
  request: SnakeRationalRiskRequest;
  completion: SnakeRationalRiskWorkerResponse;
  witnessSecret: string;
}

export interface SnakeScarcityVerifierWorkerResponse {
  verifierEpoch: number;
  requestKey: string;
  responseKey: string;
  phase: 'complete';
  witnessAuthTag: string | null;
  valid: boolean;
}

/** Pure installed-code seam used by the real worker and adversarial protocol tests. */
export function runSnakeScarcityVerifierWorkerRequest(
  input: SnakeScarcityVerifierWorkerRequest,
): SnakeScarcityVerifierWorkerResponse {
  const completion = input.completion;
  const witnessAuthTag = completion.scarcityWitness?.authTag ?? null;
  const valid = completion.key === input.request.key
    && completion.phase === 'complete'
    && completion.status === 'ready'
    && completion.nextPick !== null
    && completion.scarcity !== null
    && completion.scarcityWitness !== null
    && validateSnakeScarcityWitness({
      requestKey: input.request.key,
      witnessSecret: input.witnessSecret,
      room: input.request.input,
      nextPick: completion.nextPick,
      risks: completion.risks,
      scenarios: completion.scenarios,
      scarcity: completion.scarcity,
      witness: completion.scarcityWitness,
    });
  return {
    verifierEpoch: input.verifierEpoch,
    requestKey: input.request.key,
    responseKey: completion.key,
    phase: 'complete',
    witnessAuthTag,
    valid,
  };
}

self.onmessage = (event: MessageEvent<SnakeScarcityVerifierWorkerRequest>) => {
  self.postMessage(runSnakeScarcityVerifierWorkerRequest(event.data));
};

export {};
