import { isFranchisePhase2L13Enabled } from './franchisePhase2Flags';
import {
  getFranchiseRelationshipEdgesByScope,
  type FranchiseRelationshipEdgeScopeInput,
  type RelationshipEdgeRow,
} from './franchiseRelationshipEdgesStorage';

export const RELATIONSHIP_INTEL_INACCURACY_RATE = 0.1;
export const RELATIONSHIP_INTEL_NOTABLE_INTENSITY_FLOOR = 0.18;

export type RelationshipIntelConfidence = 'confirmed' | 'unconfirmed';

export interface RelationshipIntelSeedInput {
  franchiseId: string;
  seasonId: string;
  moveId: string;
}

export interface RelationshipIntelTake {
  edgeId: string;
  player1Id: string;
  player2Id: string;
  type: RelationshipEdgeRow['type'];
  intensity: number;
  potential: boolean;
  formedAtGameNumber: number | null;
  dissolvedAtGameNumber: number | null;
  edgeAccuracy: number;
  moveId: string;
  seed: string;
  roll: number;
  confidence: RelationshipIntelConfidence;
  unconfirmed: boolean;
}

export interface PreMoveRelationshipAdvisoryInput extends RelationshipIntelSeedInput {
  movedPlayerIds: readonly string[];
  edges: readonly RelationshipEdgeRow[];
}

export interface PreMoveRelationshipAdvisoryReport {
  status: 'dark-noop' | 'checked';
  blocked: false;
  advisoryOnly: true;
  moveId: string;
  movedPlayerIds: string[];
  intel: RelationshipIntelTake[];
  notableEdgeCount: number;
  reason?: string;
}

export interface LoadPreMoveRelationshipAdvisoryInput extends RelationshipIntelSeedInput, FranchiseRelationshipEdgeScopeInput {
  movedPlayerIds: readonly string[];
}

export const franchiseRelationshipIntelSeam = {
  getEdges: getFranchiseRelationshipEdgesByScope,
};

export function fnv1aRelationshipIntelSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function relationshipIntelSeed(input: RelationshipIntelSeedInput): string {
  return [input.franchiseId, input.seasonId, input.moveId].join(':');
}

export function relationshipIntelRoll(input: RelationshipIntelSeedInput): number {
  return fnv1aRelationshipIntelSeed(relationshipIntelSeed(input)) / 0x100000000;
}

export function isRelationshipIntelUnconfirmed(input: RelationshipIntelSeedInput): boolean {
  return relationshipIntelRoll(input) < RELATIONSHIP_INTEL_INACCURACY_RATE;
}

export function buildRelationshipIntelTake(
  edge: RelationshipEdgeRow,
  seedInput: RelationshipIntelSeedInput,
): RelationshipIntelTake {
  const seed = relationshipIntelSeed(seedInput);
  const roll = relationshipIntelRoll(seedInput);
  const unconfirmed = roll < RELATIONSHIP_INTEL_INACCURACY_RATE;

  return {
    edgeId: edge.id,
    player1Id: edge.player1Id,
    player2Id: edge.player2Id,
    type: edge.type,
    intensity: edge.intensity,
    potential: edge.potential,
    formedAtGameNumber: edge.formedAtGameNumber,
    dissolvedAtGameNumber: edge.dissolvedAtGameNumber,
    edgeAccuracy: edge.accuracy,
    moveId: seedInput.moveId,
    seed,
    roll,
    confidence: unconfirmed ? 'unconfirmed' : 'confirmed',
    unconfirmed,
  };
}

export function buildPreMoveRelationshipAdvisory(
  input: PreMoveRelationshipAdvisoryInput,
): PreMoveRelationshipAdvisoryReport {
  const movedPlayerIds = Array.from(new Set(input.movedPlayerIds.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right),
  );
  const movedPlayerSet = new Set(movedPlayerIds);
  const intel = input.edges
    .filter((edge) => isNotablePreMoveRelationshipEdge(edge, movedPlayerSet))
    .map((edge) => buildRelationshipIntelTake(edge, input))
    .sort((left, right) =>
      Number(right.potential) - Number(left.potential) ||
      right.intensity - left.intensity ||
      left.edgeId.localeCompare(right.edgeId),
    );

  return {
    status: 'checked',
    blocked: false,
    advisoryOnly: true,
    moveId: input.moveId,
    movedPlayerIds,
    intel,
    notableEdgeCount: intel.length,
  };
}

export async function loadPreMoveRelationshipAdvisory(
  input: LoadPreMoveRelationshipAdvisoryInput,
): Promise<PreMoveRelationshipAdvisoryReport> {
  if (!isFranchisePhase2L13Enabled()) {
    return {
      status: 'dark-noop',
      blocked: false,
      advisoryOnly: true,
      moveId: input.moveId,
      movedPlayerIds: Array.from(new Set(input.movedPlayerIds.filter(Boolean))).sort((left, right) =>
        left.localeCompare(right),
      ),
      intel: [],
      notableEdgeCount: 0,
      reason: 'Phase-2 L13 disabled.',
    };
  }

  const edges = await franchiseRelationshipIntelSeam.getEdges(input);
  return buildPreMoveRelationshipAdvisory({ ...input, edges });
}

function isNotablePreMoveRelationshipEdge(
  edge: RelationshipEdgeRow,
  movedPlayerIds: ReadonlySet<string>,
): boolean {
  if (edge.dissolvedAtGameNumber !== null) return false;
  if (!movedPlayerIds.has(edge.player1Id) && !movedPlayerIds.has(edge.player2Id)) return false;
  if (edge.potential) return true;
  return Number.isFinite(edge.intensity) &&
    edge.intensity >= RELATIONSHIP_INTEL_NOTABLE_INTENSITY_FLOOR;
}
