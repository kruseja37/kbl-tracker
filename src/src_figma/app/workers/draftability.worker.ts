/// <reference lib="webworker" />

import {
  rankAllArchetypesForPool,
  type ArchetypeDraftability,
  type RankDraftabilityOptions,
} from '../../../engines/draftabilityRanker';
import type { SimPlayer } from '../../../engines/archetypeBalanceSimulator';
import type { TierKey } from '../../../data/tierParams';

interface DraftabilityWorkerRequest {
  pool: SimPlayer[];
  tier: TierKey;
  options: RankDraftabilityOptions;
}

self.onmessage = (event: MessageEvent<DraftabilityWorkerRequest>) => {
  const rows: ArchetypeDraftability[] = rankAllArchetypesForPool(
    event.data.pool,
    event.data.tier,
    event.data.options,
  );
  self.postMessage({ rows });
};

export {};
