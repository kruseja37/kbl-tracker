/**
 * franchiseL13RelationshipFlareNewsAdapter — the build-DARK L13 reporter tap.
 *
 * Maps deterministic relationship-edge ground truth plus a separate REP-4
 * relationship-intel take into a SeasonNewsEvent. The take may be hedged as
 * unconfirmed, but the edge facts are copied verbatim and never distorted.
 *
 * PURE: no LLM call, no network, no I/O, no wall-clock, no randomness.
 * id/createdAt fields are intentionally NOT produced here.
 */

import type { NarrativeEventType } from '../../../../engines/narrativeEngine';
import type { RelationshipEdgeRow } from '../../../../utils/franchiseRelationshipEdgesStorage';
import type { RelationshipIntelTake } from '../../../../utils/franchiseRelationshipIntel';
import type { SeasonNewsEvent } from './seasonNewsGenerator';

export const L13_RELATIONSHIP_FLARE_NEWS_DRAMATIC_WEIGHT = {
  base: {
    RIVALRY: 0.55,
    FEUD: 0.65,
    MENTORSHIP: 0.45,
    FRIENDSHIP: 0.35,
    ROMANCE: 0.45,
    HISTORY: 0.5,
  },
  intensityScale: 0.25,
  potentialPenalty: 0.1,
} as const;

export type RelationshipFlareTrigger = 'pre-move' | 'roster-move' | 'charged-matchup';

export interface FranchiseRelationshipFlareNewsInput {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  teamId: string;
  teamName?: string;
  edge: Pick<
    RelationshipEdgeRow,
    | 'id'
    | 'player1Id'
    | 'player2Id'
    | 'type'
    | 'intensity'
    | 'potential'
    | 'accuracy'
    | 'formedAtGameNumber'
    | 'dissolvedAtGameNumber'
  >;
  take: Pick<
    RelationshipIntelTake,
    'moveId' | 'seed' | 'roll' | 'confidence' | 'unconfirmed'
  >;
  trigger: RelationshipFlareTrigger;
  relationshipFlareSourceEventId?: string;
  facts?: Record<string, unknown>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function buildFranchiseRelationshipFlareSeasonNewsEvent(
  input: FranchiseRelationshipFlareNewsInput,
): SeasonNewsEvent {
  const eventType: NarrativeEventType = 'RELATIONSHIP_FLARE';
  const edgeIntensity = Number.isFinite(input.edge.intensity) ? input.edge.intensity : 0;
  const dramaticWeight = clamp(
    L13_RELATIONSHIP_FLARE_NEWS_DRAMATIC_WEIGHT.base[input.edge.type] +
      L13_RELATIONSHIP_FLARE_NEWS_DRAMATIC_WEIGHT.intensityScale * edgeIntensity -
      (input.edge.potential ? L13_RELATIONSHIP_FLARE_NEWS_DRAMATIC_WEIGHT.potentialPenalty : 0),
    0,
    1,
  );

  return {
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    seasonNumber: input.seasonNumber,
    eventType,
    subjectIds: [input.edge.player1Id, input.edge.player2Id],
    facts: {
      ...input.facts,
      teamId: input.teamId,
      teamName: input.teamName,
      trigger: input.trigger,
      edgeId: input.edge.id,
      player1Id: input.edge.player1Id,
      player2Id: input.edge.player2Id,
      relationshipType: input.edge.type,
      intensity: input.edge.intensity,
      potential: input.edge.potential,
      edgeAccuracy: input.edge.accuracy,
      formedAtGameNumber: input.edge.formedAtGameNumber,
      dissolvedAtGameNumber: input.edge.dissolvedAtGameNumber,
      relationshipIntelMoveId: input.take.moveId,
      relationshipIntelSeed: input.take.seed,
      relationshipIntelRoll: input.take.roll,
      relationshipIntelConfidence: input.take.confidence,
      relationshipIntelUnconfirmed: input.take.unconfirmed,
      relationshipFlareSourceEventId: input.relationshipFlareSourceEventId,
    },
    dramaticWeight,
  };
}
