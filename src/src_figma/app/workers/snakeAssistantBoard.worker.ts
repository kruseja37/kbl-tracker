/// <reference lib="webworker" />

import {
  runSnakeAssistantBoardRequest,
  type SnakeAssistantBoardRequest,
} from '../components/snake/desk/snakeDeskIntelligenceModel';
import type { SnakeAssistantBoardWorkerResponse } from '../components/snake/desk/useSnakeAssistantBoard';

self.onmessage = (event: MessageEvent<SnakeAssistantBoardRequest>) => {
  const response: SnakeAssistantBoardWorkerResponse = {
    key: event.data.key,
    result: runSnakeAssistantBoardRequest(event.data),
  };
  self.postMessage(response);
};

export {};
