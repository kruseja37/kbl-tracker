/// <reference lib="webworker" />

import {
  playSnakeRationalRoom,
  type PlaySnakeRationalRoomInput,
} from '../../../engines/snakeRationalRoom';
import type { SnakeRationalRiskWorkerResponse } from '../components/snake/desk/useSnakeRationalRisks';

interface SnakeRationalRiskWorkerRequest {
  key: string;
  input: PlaySnakeRationalRoomInput;
}

self.onmessage = (event: MessageEvent<SnakeRationalRiskWorkerRequest>) => {
  const result = playSnakeRationalRoom(event.data.input);
  const response: SnakeRationalRiskWorkerResponse = {
    key: event.data.key,
    risks: result.risks,
  };
  self.postMessage(response);
};

export {};
