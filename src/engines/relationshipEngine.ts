import type { RelationshipEdgeType } from '../utils/franchiseRelationshipEdgesStorage';

/**
 * RelationshipEngine - Player relationship management
 * Per Ralph Framework S-F001, S-F002, S-F003
 *
 * Features:
 * - 9 relationship types supported
 * - Morale effects calculated
 * - Trade warnings generated
 */

// Legacy 9-literal relationship types. Deprecated as canonical L13 edge
// vocabulary, but retained as source sub-discriminators for LI detectors,
// UI hooks, and MORALE_EFFECTS base deltas until L13-3 is the sole writer.
export const RelationshipType = {
  /** @deprecated L13-Q1: canonical edge type is ROMANCE; retain as legacy subtype. */
  DATING: 'DATING',
  /** @deprecated L13-Q1: canonical edge type is ROMANCE; retain as legacy subtype. */
  MARRIED: 'MARRIED',
  /** @deprecated L13-Q1: canonical edge type is ROMANCE; retain as legacy subtype. */
  DIVORCED: 'DIVORCED',
  /** @deprecated L13-Q1: canonical edge type is FRIENDSHIP; retain as legacy subtype. */
  BEST_FRIENDS: 'BEST_FRIENDS',
  /** @deprecated L13-Q1: canonical edge type is MENTORSHIP; retain as legacy subtype. */
  MENTOR_PROTEGE: 'MENTOR_PROTEGE',
  /** @deprecated L13-Q1: canonical edge type is RIVALRY; retain as legacy subtype. */
  RIVALS: 'RIVALS',
  /** @deprecated L13-Q1: canonical edge type is FEUD; retain as legacy subtype. */
  BULLY_VICTIM: 'BULLY_VICTIM',
  /** @deprecated L13-Q1: canonical edge type is RIVALRY; retain as legacy subtype. */
  JEALOUS: 'JEALOUS',
  /** @deprecated L13-Q1: canonical edge type is ROMANCE; retain as legacy subtype. */
  CRUSH: 'CRUSH',
} as const;

export type RelationshipType = (typeof RelationshipType)[keyof typeof RelationshipType];

export const RELATIONSHIP_9_TO_6_MAP = {
  [RelationshipType.DATING]: 'ROMANCE',
  [RelationshipType.MARRIED]: 'ROMANCE',
  [RelationshipType.DIVORCED]: 'ROMANCE',
  [RelationshipType.CRUSH]: 'ROMANCE',
  [RelationshipType.BULLY_VICTIM]: 'FEUD',
  [RelationshipType.RIVALS]: 'RIVALRY',
  [RelationshipType.JEALOUS]: 'RIVALRY',
  [RelationshipType.BEST_FRIENDS]: 'FRIENDSHIP',
  [RelationshipType.MENTOR_PROTEGE]: 'MENTORSHIP',
} as const satisfies Record<RelationshipType, RelationshipEdgeType>;

export const RELATIONSHIP_6_TO_9_COVERAGE = {
  RIVALRY: [RelationshipType.RIVALS, RelationshipType.JEALOUS],
  FEUD: [RelationshipType.BULLY_VICTIM],
  MENTORSHIP: [RelationshipType.MENTOR_PROTEGE],
  FRIENDSHIP: [RelationshipType.BEST_FRIENDS],
  ROMANCE: [
    RelationshipType.DATING,
    RelationshipType.MARRIED,
    RelationshipType.DIVORCED,
    RelationshipType.CRUSH,
  ],
  HISTORY: [],
} as const satisfies Record<RelationshipEdgeType, readonly RelationshipType[]>;

export function map9To6(literal: RelationshipType): RelationshipEdgeType {
  return RELATIONSHIP_9_TO_6_MAP[literal];
}

// Relationship data structure
export interface Relationship {
  relationshipId: string;
  player1Id: string;
  player2Id: string;
  type: RelationshipType;
  createdAt: Date;
  endedAt?: Date;
  isActive: boolean;
}

// Morale effects by relationship type
const MORALE_EFFECTS: Record<RelationshipType, { player1: number; player2: number }> = {
  [RelationshipType.DATING]: { player1: 8, player2: 8 },
  [RelationshipType.MARRIED]: { player1: 12, player2: 12 },
  [RelationshipType.DIVORCED]: { player1: -8, player2: -8 },
  [RelationshipType.BEST_FRIENDS]: { player1: 6, player2: 6 },
  [RelationshipType.MENTOR_PROTEGE]: { player1: 4, player2: 7 },
  [RelationshipType.RIVALS]: { player1: -5, player2: -5 },
  [RelationshipType.BULLY_VICTIM]: { player1: 3, player2: -10 },
  [RelationshipType.JEALOUS]: { player1: -6, player2: 0 },
  [RelationshipType.CRUSH]: { player1: 5, player2: 0 },
};

// Relationship icons for display
export const RELATIONSHIP_ICONS: Record<RelationshipType, string> = {
  [RelationshipType.DATING]: '💑',
  [RelationshipType.MARRIED]: '💍',
  [RelationshipType.DIVORCED]: '💔',
  [RelationshipType.BEST_FRIENDS]: '🤝',
  [RelationshipType.MENTOR_PROTEGE]: '🎓',
  [RelationshipType.RIVALS]: '👊',
  [RelationshipType.BULLY_VICTIM]: '😰',
  [RelationshipType.JEALOUS]: '😤',
  [RelationshipType.CRUSH]: '😍',
};

// Exclusive relationship types (one per player)
const EXCLUSIVE_TYPES = new Set<RelationshipType>([
  RelationshipType.DATING,
  RelationshipType.MARRIED,
]);

/**
 * Generate unique relationship ID
 */
export function generateRelationshipId(
  player1Id: string,
  player2Id: string,
  type: RelationshipType
): string {
  const sortedIds = [player1Id, player2Id].sort().join('-');
  return `${sortedIds}-${type}-${Date.now()}`;
}

/**
 * Check if a relationship can be created
 */
export function canCreateRelationship(
  existingRelationships: Relationship[],
  player1Id: string,
  player2Id: string,
  type: RelationshipType
): { canCreate: boolean; reason?: string } {
  // Check for exclusive relationship violations
  if (EXCLUSIVE_TYPES.has(type)) {
    const hasExclusive = existingRelationships.some(
      (r) =>
        r.isActive &&
        EXCLUSIVE_TYPES.has(r.type) &&
        (r.player1Id === player1Id ||
          r.player2Id === player1Id ||
          r.player1Id === player2Id ||
          r.player2Id === player2Id)
    );

    if (hasExclusive) {
      return {
        canCreate: false,
        reason: `One or both players already in an exclusive relationship (DATING/MARRIED)`,
      };
    }
  }

  // Check for duplicate relationships
  const hasDuplicate = existingRelationships.some(
    (r) =>
      r.isActive &&
      r.type === type &&
      ((r.player1Id === player1Id && r.player2Id === player2Id) ||
        (r.player1Id === player2Id && r.player2Id === player1Id))
  );

  if (hasDuplicate) {
    return {
      canCreate: false,
      reason: `Relationship of type ${type} already exists between these players`,
    };
  }

  return { canCreate: true };
}

/**
 * Create a new relationship
 */
export function createRelationship(
  player1Id: string,
  player2Id: string,
  type: RelationshipType
): Relationship {
  return {
    relationshipId: generateRelationshipId(player1Id, player2Id, type),
    player1Id,
    player2Id,
    type,
    createdAt: new Date(),
    isActive: true,
  };
}

/**
 * Get all relationships for a player
 */
export function getPlayerRelationships(
  relationships: Relationship[],
  playerId: string,
  activeOnly: boolean = true
): Relationship[] {
  return relationships.filter(
    (r) =>
      (r.player1Id === playerId || r.player2Id === playerId) &&
      (!activeOnly || r.isActive)
  );
}

/**
 * Calculate total morale effect for a player
 */
export function calculateMoraleEffect(
  relationships: Relationship[],
  playerId: string
): number {
  let totalEffect = 0;

  const playerRelationships = getPlayerRelationships(relationships, playerId, true);

  for (const rel of playerRelationships) {
    const effect = MORALE_EFFECTS[rel.type];
    if (rel.player1Id === playerId) {
      totalEffect += effect.player1;
    } else {
      totalEffect += effect.player2;
    }
  }

  return totalEffect;
}

/**
 * Get morale breakdown by relationship
 */
export function getMoraleBreakdown(
  relationships: Relationship[],
  playerId: string
): { relationship: Relationship; effect: number }[] {
  const playerRelationships = getPlayerRelationships(relationships, playerId, true);

  return playerRelationships.map((rel) => {
    const effect = MORALE_EFFECTS[rel.type];
    const playerEffect = rel.player1Id === playerId ? effect.player1 : effect.player2;
    return { relationship: rel, effect: playerEffect };
  });
}

/**
 * Trade warning interface
 */
export interface TradeWarning {
  affectedPlayerId: string;
  affectedPlayerName?: string;
  brokenRelationshipType: RelationshipType;
  moraleImpact: number;
  description: string;
}

/**
 * Generate trade warnings for breaking relationships
 */
export function generateTradeWarnings(
  relationships: Relationship[],
  tradedPlayerId: string,
  getPlayerName?: (id: string) => string
): TradeWarning[] {
  const warnings: TradeWarning[] = [];
  const playerRelationships = getPlayerRelationships(relationships, tradedPlayerId, true);

  for (const rel of playerRelationships) {
    const otherPlayerId =
      rel.player1Id === tradedPlayerId ? rel.player2Id : rel.player1Id;
    const effect = MORALE_EFFECTS[rel.type];
    const otherPlayerEffect =
      rel.player1Id === tradedPlayerId ? effect.player2 : effect.player1;

    // Only warn if relationship was positive for the other player
    if (otherPlayerEffect > 0) {
      const playerName = getPlayerName?.(otherPlayerId) || otherPlayerId;
      warnings.push({
        affectedPlayerId: otherPlayerId,
        affectedPlayerName: playerName,
        brokenRelationshipType: rel.type,
        moraleImpact: -Math.abs(otherPlayerEffect),
        description: `Breaking ${rel.type.replace('_', ' ').toLowerCase()} with ${playerName}`,
      });
    }
  }

  return warnings;
}

/**
 * End a relationship
 */
export function endRelationship(relationship: Relationship): Relationship {
  return {
    ...relationship,
    isActive: false,
    endedAt: new Date(),
  };
}

/**
 * Get relationship display name
 */
export function getRelationshipDisplayName(type: RelationshipType): string {
  const displayNames: Record<RelationshipType, string> = {
    [RelationshipType.DATING]: 'Dating',
    [RelationshipType.MARRIED]: 'Married',
    [RelationshipType.DIVORCED]: 'Divorced',
    [RelationshipType.BEST_FRIENDS]: 'Best Friends',
    [RelationshipType.MENTOR_PROTEGE]: 'Mentor/Protégé',
    [RelationshipType.RIVALS]: 'Rivals',
    [RelationshipType.BULLY_VICTIM]: 'Bully/Victim',
    [RelationshipType.JEALOUS]: 'Jealous',
    [RelationshipType.CRUSH]: 'Has Crush On',
  };
  return displayNames[type] || type;
}
