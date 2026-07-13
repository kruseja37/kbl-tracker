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
  let response: SnakeRationalRiskWorkerResponse;
  try {
    const result = playSnakeRationalRoom(event.data.input);
    response = {
      key: event.data.key,
      status: result.status,
      risks: result.risks,
      scarcity: result.scarcity,
      scenarios: result.scenarios,
      nextPick: result.nextPick,
    };
  } catch {
    response = {
      key: event.data.key,
      status: 'unavailable',
      risks: [],
      scarcity: [],
      scenarios: [],
      nextPick: null,
    };
  }
  self.postMessage(response);
};

export {};
