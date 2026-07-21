/// <reference lib="webworker" />

import {
  createSnakePickFinishSafetyClassifier,
  type SimultaneousSnakeSeatingInput,
  type SnakePickFinishSafetyRow,
  type SnakeSeatingProof,
} from '../../../engines/snakeSeatingProof';

export interface SnakePickFinishWorkerRequest {
  key: string;
  current: SimultaneousSnakeSeatingInput;
  proof: SnakeSeatingProof;
  teamId: string;
  candidatePlayerIds: string[];
}

export interface SnakePickFinishWorkerResponse {
  key: string;
  phase: 'progress' | 'complete';
  rows: SnakePickFinishSafetyRow[];
  error?: string;
}

self.onmessage = (event: MessageEvent<SnakePickFinishWorkerRequest>) => {
  try {
    const classify = createSnakePickFinishSafetyClassifier(event.data);
    const rows: SnakePickFinishSafetyRow[] = [];
    const chunkSize = 24;
    for (let start = 0; start < event.data.candidatePlayerIds.length; start += chunkSize) {
      const chunk = classify(event.data.candidatePlayerIds.slice(start, start + chunkSize));
      rows.push(...chunk);
      self.postMessage({
        key: event.data.key,
        phase: 'progress',
        rows: chunk,
      } satisfies SnakePickFinishWorkerResponse);
    }
    self.postMessage({
      key: event.data.key,
      phase: 'complete',
      rows,
    } satisfies SnakePickFinishWorkerResponse);
  } catch (cause) {
    self.postMessage({
      key: event.data.key,
      phase: 'complete',
      rows: [],
      error: cause instanceof Error ? cause.message : String(cause),
    } satisfies SnakePickFinishWorkerResponse);
  }
};

export {};
