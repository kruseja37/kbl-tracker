/**
 * Historical Legends app-data contract.
 *
 * The generated JSON is deliberately served as a public asset instead of being
 * bundled into the main JavaScript chunk. Both the source artifact and generated
 * public asset are pinned so every local origin imports identical verified bytes.
 */

import type { Player } from '../utils/leagueBuilderStorage';

export const HISTORICAL_LEGENDS_APP_DATA_URL = '/data/historical-legends-app-data.json';

export const EXPECTED_HISTORICAL_LEGENDS_SOURCE_SHA256 =
  'b668309ec84449d6052c768c0c2d98e3bfdc3c8b5d14385588c8b1f56384c492';
export const EXPECTED_HISTORICAL_LEGENDS_ASSET_SHA256 =
  'b1cf848205b68f625ee603008ab6ef437de7455a181a7572a3a7a0e332a3de32';

export const HISTORICAL_LEGENDS_SOURCE_DATABASE = 'HISTORICAL_LEGENDS';
export const HISTORICAL_LEGENDS_EXPECTED_PLAYER_COUNT = 345;
export const HISTORICAL_LEGENDS_EXPECTED_PROFILE_COUNT = 835;

export type HistoricalLegendProfileType = 'Career' | 'Peak' | 'Draft Pool';

export interface HistoricalLegendConfidence {
  overall: number | null;
  fields: Record<string, unknown>;
  dossier?: Record<string, unknown>;
  narrativeTraits?: Record<string, unknown>;
}

export interface HistoricalLegendAppMetadata {
  playerId: string;
  displayName: string;
  profileType: HistoricalLegendProfileType;
  sourceCardId: string;
  sourceWindowId: string;
  sourceVersionClass: string;
  imageAge: number;
  lore: Record<string, unknown>;
  rivalries: unknown[];
  confidence: HistoricalLegendConfidence;
  personalityEvidence: unknown[];
  researchFlags: string[];
  identityClaims: unknown[];
  provenance: Record<string, unknown>;
}

export interface HistoricalLegendAppPlayer extends Player {
  sourceId: string;
  historicalSourceId: string;
  versionGroupId: string;
  historicalProfileType: HistoricalLegendProfileType;
  historicalLegend: HistoricalLegendAppMetadata;
}

export interface HistoricalLegendsAppPayload {
  schemaVersion: 'historical-legends-app-v1';
  sourceEditionId: string;
  sourceContentHash: string;
  sourceSha256: string;
  generatedAt: string;
  playerCount: number;
  profileCount: number;
  profileCounts: Record<HistoricalLegendProfileType, number>;
  players: HistoricalLegendAppPlayer[];
}
