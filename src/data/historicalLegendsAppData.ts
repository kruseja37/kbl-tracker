/**
 * Historical Legends app-data contract.
 *
 * The generated JSON is deliberately served as a public asset instead of being
 * bundled into the main JavaScript chunk. The source hash remains unpinned until
 * the independently examined 345-player artifact is final.
 */

import type { Player } from '../utils/leagueBuilderStorage';

export const HISTORICAL_LEGENDS_APP_DATA_URL = '/data/historical-legends-app-data.json';

/** Filled only after the final independently examined source artifact exists. */
export const EXPECTED_HISTORICAL_LEGENDS_SOURCE_SHA256: string | null = null;
/** Filled only after the final generated app asset is independently examined. */
export const EXPECTED_HISTORICAL_LEGENDS_ASSET_SHA256: string | null = null;

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
