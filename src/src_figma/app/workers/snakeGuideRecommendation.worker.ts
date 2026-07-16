/// <reference lib="webworker" />

import {
  runSnakeGuideRecommendationRequest,
  type SnakeGuideRecommendationRequest,
} from '../components/snake/desk/snakeDraftDecisionModel';
import type { SnakeGuideRecommendationWorkerResponse } from '../components/snake/desk/useSnakeGuideRecommendation';

self.onmessage = (event: MessageEvent<SnakeGuideRecommendationRequest>) => {
  let response: SnakeGuideRecommendationWorkerResponse;
  try {
    response = {
      key: event.data.key,
      result: runSnakeGuideRecommendationRequest(event.data),
    };
  } catch {
    response = { key: event.data?.key ?? '', result: { status: 'unavailable' } };
  }
  self.postMessage(response);
};

export {};
