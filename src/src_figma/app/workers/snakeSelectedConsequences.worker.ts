/// <reference lib="webworker" />

import {
  buildSelectedPlayerConsequence,
  type SelectedPlayerConsequence,
  type SelectedPlayerConsequenceInput,
} from '../components/snake/desk/snakeDeskIntelligenceModel';

export interface SnakeSelectedConsequencesWorkerRequest {
  key: string;
  input: Omit<SelectedPlayerConsequenceInput, 'selectedPlayerId'>;
  selectedPlayerIds: string[];
}

export interface SnakeSelectedConsequencesWorkerResponse {
  key: string;
  results: SelectedPlayerConsequence[];
  error?: string;
}

self.onmessage = (event: MessageEvent<SnakeSelectedConsequencesWorkerRequest>) => {
  try {
    self.postMessage({
      key: event.data.key,
      results: event.data.selectedPlayerIds.map((selectedPlayerId) => buildSelectedPlayerConsequence({
        ...event.data.input,
        selectedPlayerId,
      })),
    } satisfies SnakeSelectedConsequencesWorkerResponse);
  } catch (cause) {
    self.postMessage({
      key: event.data.key,
      results: [],
      error: cause instanceof Error ? cause.message : String(cause),
    } satisfies SnakeSelectedConsequencesWorkerResponse);
  }
};

export {};
