/**
 * Relationship Integration for Figma GameTracker
 * Per Ralph Framework S-F001, S-F002, S-F003
 *
 * Integrates the legacy relationshipEngine into the Figma codebase.
 * Provides chemistry system with 9 relationship types.
 */

// Import from legacy relationshipEngine
import {
  // Types/Constants
  RelationshipType,
  RELATIONSHIP_ICONS,

  // Interfaces
  type Relationship,
  type TradeWarning,

  // Functions
  generateRelationshipId,
  canCreateRelationship,
  createRelationship,
  getPlayerRelationships,
  calculateMoraleEffect,
  getMoraleBreakdown,
  generateTradeWarnings,
  endRelationship,
  getRelationshipDisplayName,
} from '../../../engines/relationshipEngine';

// Import relationship LI types and constants from leverageCalculator
import {
  type RevengeArc,
  type RomanticMatchup,
  REVENGE_ARC_MULTIPLIERS,
  ROMANTIC_MATCHUP_MULTIPLIERS,
} from '../../../engines/leverageCalculator';

// Re-export all
export {
  RelationshipType,
  RELATIONSHIP_ICONS,
  type Relationship,
  type TradeWarning,
  generateRelationshipId,
  canCreateRelationship,
  createRelationship,
  getPlayerRelationships,
  calculateMoraleEffect,
  getMoraleBreakdown,
  generateTradeWarnings,
  endRelationship,
  getRelationshipDisplayName,
};

// ============================================
// FIGMA-SPECIFIC HELPERS
// ============================================

/**
 * Relationship category for UI grouping
 */
export type RelationshipCategory = 'ROMANTIC' | 'FRIENDSHIP' | 'CONFLICT' | 'PROFESSIONAL';

/**
 * Get relationship category
 */
export function getRelationshipCategory(type: typeof RelationshipType[keyof typeof RelationshipType]): RelationshipCategory {
  switch (type) {
    case RelationshipType.DATING:
    case RelationshipType.MARRIED:
    case RelationshipType.DIVORCED:
    case RelationshipType.CRUSH:
      return 'ROMANTIC';
    case RelationshipType.BEST_FRIENDS:
      return 'FRIENDSHIP';
    case RelationshipType.RIVALS:
    case RelationshipType.BULLY_VICTIM:
    case RelationshipType.JEALOUS:
      return 'CONFLICT';
    case RelationshipType.MENTOR_PROTEGE:
      return 'PROFESSIONAL';
    default:
      return 'PROFESSIONAL';
  }
}

/**
 * Full display info for relationship type
 */
export interface RelationshipDisplayInfo {
  name: string;
  icon: string;
  category: RelationshipCategory;
  color: string;
  description: string;
  moraleEffect: { player1: number; player2: number };
}

/**
 * Get full display info for a relationship type
 */
export function getRelationshipDisplayInfo(type: typeof RelationshipType[keyof typeof RelationshipType]): RelationshipDisplayInfo {
  const displayInfo: Record<typeof RelationshipType[keyof typeof RelationshipType], RelationshipDisplayInfo> = {
    [RelationshipType.DATING]: {
      name: 'Dating',
      icon: '💑',
      category: 'ROMANTIC',
      color: '#ec4899',  // Pink
      description: 'Players are in a romantic relationship',
      moraleEffect: { player1: 8, player2: 8 },
    },
    [RelationshipType.MARRIED]: {
      name: 'Married',
      icon: '💍',
      category: 'ROMANTIC',
      color: '#f59e0b',  // Gold
      description: 'Players are married to each other',
      moraleEffect: { player1: 12, player2: 12 },
    },
    [RelationshipType.DIVORCED]: {
      name: 'Divorced',
      icon: '💔',
      category: 'ROMANTIC',
      color: '#6b7280',  // Gray
      description: 'Players were previously married',
      moraleEffect: { player1: -8, player2: -8 },
    },
    [RelationshipType.BEST_FRIENDS]: {
      name: 'Best Friends',
      icon: '🤝',
      category: 'FRIENDSHIP',
      color: '#22c55e',  // Green
      description: 'Players have a close friendship',
      moraleEffect: { player1: 6, player2: 6 },
    },
    [RelationshipType.MENTOR_PROTEGE]: {
      name: 'Mentor/Protégé',
      icon: '🎓',
      category: 'PROFESSIONAL',
      color: '#3b82f6',  // Blue
      description: 'Veteran mentoring a younger player',
      moraleEffect: { player1: 4, player2: 7 },
    },
    [RelationshipType.RIVALS]: {
      name: 'Rivals',
      icon: '👊',
      category: 'CONFLICT',
      color: '#ef4444',  // Red
      description: 'Competitive rivalry between players',
      moraleEffect: { player1: -5, player2: -5 },
    },
    [RelationshipType.BULLY_VICTIM]: {
      name: 'Bully/Victim',
      icon: '😰',
      category: 'CONFLICT',
      color: '#dc2626',  // Dark Red
      description: 'Toxic relationship - one player bullies the other',
      moraleEffect: { player1: 3, player2: -10 },
    },
    [RelationshipType.JEALOUS]: {
      name: 'Jealous',
      icon: '😤',
      category: 'CONFLICT',
      color: '#f97316',  // Orange
      description: 'One player is jealous of the other',
      moraleEffect: { player1: -6, player2: 0 },
    },
    [RelationshipType.CRUSH]: {
      name: 'Has Crush On',
      icon: '😍',
      category: 'ROMANTIC',
      color: '#ec4899',  // Pink
      description: 'Unrequited romantic interest',
      moraleEffect: { player1: 5, player2: 0 },
    },
  };

  return displayInfo[type] || {
    name: 'Unknown',
    icon: '❓',
    category: 'PROFESSIONAL',
    color: '#6b7280',
    description: 'Unknown relationship type',
    moraleEffect: { player1: 0, player2: 0 },
  };
}

/**
 * Get all relationship types organized by category
 */
export function getRelationshipsByCategory(): Record<RelationshipCategory, typeof RelationshipType[keyof typeof RelationshipType][]> {
  return {
    ROMANTIC: [
      RelationshipType.DATING,
      RelationshipType.MARRIED,
      RelationshipType.DIVORCED,
      RelationshipType.CRUSH,
    ],
    FRIENDSHIP: [
      RelationshipType.BEST_FRIENDS,
    ],
    CONFLICT: [
      RelationshipType.RIVALS,
      RelationshipType.BULLY_VICTIM,
      RelationshipType.JEALOUS,
    ],
    PROFESSIONAL: [
      RelationshipType.MENTOR_PROTEGE,
    ],
  };
}

/**
 * Summary of team chemistry
 */
export interface TeamChemistrySummary {
  totalRelationships: number;
  positiveRelationships: number;
  negativeRelationships: number;
  netMoraleEffect: number;
  chemistryRating: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR' | 'TOXIC';
  topPositiveRelationship?: Relationship;
  topNegativeRelationship?: Relationship;
}

/**
 * Calculate team chemistry summary
 */
export function calculateTeamChemistry(
  relationships: Relationship[],
  teamPlayerIds: string[]
): TeamChemistrySummary {
  // Filter to team relationships only
  const teamRelationships = relationships.filter(
    r => r.isActive &&
      teamPlayerIds.includes(r.player1Id) &&
      teamPlayerIds.includes(r.player2Id)
  );

  let positiveCount = 0;
  let negativeCount = 0;
  let netMoraleEffect = 0;
  let topPositive: { rel: Relationship; effect: number } | null = null;
  let topNegative: { rel: Relationship; effect: number } | null = null;

  for (const rel of teamRelationships) {
    const info = getRelationshipDisplayInfo(rel.type);
    const totalEffect = info.moraleEffect.player1 + info.moraleEffect.player2;
    netMoraleEffect += totalEffect;

    if (totalEffect > 0) {
      positiveCount++;
      if (!topPositive || totalEffect > topPositive.effect) {
        topPositive = { rel, effect: totalEffect };
      }
    } else if (totalEffect < 0) {
      negativeCount++;
      if (!topNegative || totalEffect < topNegative.effect) {
        topNegative = { rel, effect: totalEffect };
      }
    }
  }

  // Calculate chemistry rating
  let chemistryRating: TeamChemistrySummary['chemistryRating'];
  if (netMoraleEffect >= 30) {
    chemistryRating = 'EXCELLENT';
  } else if (netMoraleEffect >= 10) {
    chemistryRating = 'GOOD';
  } else if (netMoraleEffect >= -10) {
    chemistryRating = 'AVERAGE';
  } else if (netMoraleEffect >= -30) {
    chemistryRating = 'POOR';
  } else {
    chemistryRating = 'TOXIC';
  }

  return {
    totalRelationships: teamRelationships.length,
    positiveRelationships: positiveCount,
    negativeRelationships: negativeCount,
    netMoraleEffect,
    chemistryRating,
    topPositiveRelationship: topPositive?.rel,
    topNegativeRelationship: topNegative?.rel,
  };
}

/**
 * Get chemistry rating color
 */
export function getChemistryRatingColor(rating: TeamChemistrySummary['chemistryRating']): string {
  switch (rating) {
    case 'EXCELLENT': return '#22c55e';  // Green
    case 'GOOD': return '#84cc16';  // Lime
    case 'AVERAGE': return '#eab308';  // Yellow
    case 'POOR': return '#f97316';  // Orange
    case 'TOXIC': return '#dc2626';  // Red
    default: return '#6b7280';  // Gray
  }
}

// ============================================
// RELATIONSHIP LI DETECTOR FUNCTIONS
// Per LEVERAGE_INDEX_SPEC.md §10.5-10.6
// ============================================

/**
 * Relationship types that produce revenge arcs when ended.
 * Maps source relationship type → arc generation logic.
 *
 * Only these 4 types produce arcs:
 * - DATING / MARRIED → SCORNED_LOVER (both players)
 * - BEST_FRIENDS → ESTRANGED_FRIEND (both players)
 * - MENTOR_PROTEGE → SURPASSED_MENTOR (protégé only, player2)
 * - BULLY_VICTIM → VICTIM_REVENGE (victim, player2) + BULLY_CONFRONTED (bully, player1)
 */
const REVENGE_ARC_SOURCES = new Set<string>([
  RelationshipType.DATING,
  RelationshipType.MARRIED,
  RelationshipType.BEST_FRIENDS,
  RelationshipType.MENTOR_PROTEGE,
  RelationshipType.BULLY_VICTIM,
]);

/**
 * Romantic relationship types that produce matchups.
 * - DATING (active) → LOVERS_RIVALRY
 * - MARRIED (active) → MARRIED_OPPONENTS
 * - DIVORCED (any isActive) → EX_SPOUSE_REVENGE
 */
const ROMANTIC_MATCHUP_SOURCES = new Set<string>([
  RelationshipType.DATING,
  RelationshipType.MARRIED,
  RelationshipType.DIVORCED,
]);

/**
 * Check if two players are on opposite teams (cross-team).
 */
function isCrossTeam(
  player1Id: string,
  player2Id: string,
  homePlayerIds: string[],
  awayPlayerIds: string[]
): boolean {
  const p1Home = homePlayerIds.includes(player1Id);
  const p1Away = awayPlayerIds.includes(player1Id);
  const p2Home = homePlayerIds.includes(player2Id);
  const p2Away = awayPlayerIds.includes(player2Id);

  return (p1Home && p2Away) || (p1Away && p2Home);
}

/**
 * Detect revenge arcs from ended relationships between cross-team players.
 * Per LEVERAGE_INDEX_SPEC.md §10.5
 *
 * Revenge arcs are ONLY generated from ENDED relationships where
 * players are on OPPOSITE teams. Each arc type has a specific LI multiplier.
 *
 * Special cases:
 * - BULLY_VICTIM: Produces TWO asymmetric arcs
 *   - Victim (player2) → VICTIM_REVENGE (1.75×)
 *   - Bully (player1) → BULLY_CONFRONTED (0.9×)
 * - MENTOR_PROTEGE: Produces ONE arc
 *   - Protégé (player2) → SURPASSED_MENTOR (1.3×)
 *
 * @param relationships - All relationships in the system
 * @param homePlayerIds - IDs of players on the home team
 * @param awayPlayerIds - IDs of players on the away team
 * @returns Array of revenge arcs for the current game
 */
export function detectRevengeArcs(
  relationships: Relationship[],
  homePlayerIds: string[],
  awayPlayerIds: string[]
): RevengeArc[] {
  const arcs: RevengeArc[] = [];

  for (const rel of relationships) {
    // Only ended relationships produce revenge arcs
    if (rel.isActive) continue;

    // Only specific relationship types produce arcs
    if (!REVENGE_ARC_SOURCES.has(rel.type)) continue;

    // Only cross-team pairs
    if (!isCrossTeam(rel.player1Id, rel.player2Id, homePlayerIds, awayPlayerIds)) continue;

    switch (rel.type) {
      case RelationshipType.DATING:
      case RelationshipType.MARRIED:
        // Both players get SCORNED_LOVER arcs
        arcs.push({
          playerId: rel.player1Id,
          formerPartnerId: rel.player2Id,
          arcType: 'SCORNED_LOVER',
          liMultiplier: REVENGE_ARC_MULTIPLIERS.SCORNED_LOVER,
        });
        arcs.push({
          playerId: rel.player2Id,
          formerPartnerId: rel.player1Id,
          arcType: 'SCORNED_LOVER',
          liMultiplier: REVENGE_ARC_MULTIPLIERS.SCORNED_LOVER,
        });
        break;

      case RelationshipType.BEST_FRIENDS:
        // Both players get ESTRANGED_FRIEND arcs
        arcs.push({
          playerId: rel.player1Id,
          formerPartnerId: rel.player2Id,
          arcType: 'ESTRANGED_FRIEND',
          liMultiplier: REVENGE_ARC_MULTIPLIERS.ESTRANGED_FRIEND,
        });
        arcs.push({
          playerId: rel.player2Id,
          formerPartnerId: rel.player1Id,
          arcType: 'ESTRANGED_FRIEND',
          liMultiplier: REVENGE_ARC_MULTIPLIERS.ESTRANGED_FRIEND,
        });
        break;

      case RelationshipType.MENTOR_PROTEGE:
        // Only protégé (player2) gets SURPASSED_MENTOR arc
        arcs.push({
          playerId: rel.player2Id,
          formerPartnerId: rel.player1Id,
          arcType: 'SURPASSED_MENTOR',
          liMultiplier: REVENGE_ARC_MULTIPLIERS.SURPASSED_MENTOR,
        });
        break;

      case RelationshipType.BULLY_VICTIM:
        // Victim (player2) gets VICTIM_REVENGE
        arcs.push({
          playerId: rel.player2Id,
          formerPartnerId: rel.player1Id,
          arcType: 'VICTIM_REVENGE',
          liMultiplier: REVENGE_ARC_MULTIPLIERS.VICTIM_REVENGE,
        });
        // Bully (player1) gets BULLY_CONFRONTED
        arcs.push({
          playerId: rel.player1Id,
          formerPartnerId: rel.player2Id,
          arcType: 'BULLY_CONFRONTED',
          liMultiplier: REVENGE_ARC_MULTIPLIERS.BULLY_CONFRONTED,
        });
        break;
    }
  }

  return arcs;
}

/**
 * Detect romantic matchups from cross-team romantic relationships.
 * Per LEVERAGE_INDEX_SPEC.md §10.6
 *
 * Romantic matchups are generated from:
 * - DATING (active only) → LOVERS_RIVALRY (1.3×)
 * - MARRIED (active only) → MARRIED_OPPONENTS (1.4×)
 * - DIVORCED (regardless of isActive) → EX_SPOUSE_REVENGE (1.6×)
 *
 * Non-romantic types (BEST_FRIENDS, RIVALS, MENTOR_PROTEGE, etc.) do NOT produce matchups.
 *
 * @param relationships - All relationships in the system
 * @param homePlayerIds - IDs of players on the home team
 * @param awayPlayerIds - IDs of players on the away team
 * @returns Array of romantic matchups for the current game
 */
export function detectRomanticMatchups(
  relationships: Relationship[],
  homePlayerIds: string[],
  awayPlayerIds: string[]
): RomanticMatchup[] {
  const matchups: RomanticMatchup[] = [];

  for (const rel of relationships) {
    // Only romantic types produce matchups
    if (!ROMANTIC_MATCHUP_SOURCES.has(rel.type)) continue;

    // Only cross-team pairs
    if (!isCrossTeam(rel.player1Id, rel.player2Id, homePlayerIds, awayPlayerIds)) continue;

    switch (rel.type) {
      case RelationshipType.DATING:
        // Must be active
        if (!rel.isActive) continue;
        matchups.push({
          playerAId: rel.player1Id,
          playerBId: rel.player2Id,
          matchupType: 'LOVERS_RIVALRY',
          liMultiplier: ROMANTIC_MATCHUP_MULTIPLIERS.LOVERS_RIVALRY,
        });
        break;

      case RelationshipType.MARRIED:
        // Must be active
        if (!rel.isActive) continue;
        matchups.push({
          playerAId: rel.player1Id,
          playerBId: rel.player2Id,
          matchupType: 'MARRIED_OPPONENTS',
          liMultiplier: ROMANTIC_MATCHUP_MULTIPLIERS.MARRIED_OPPONENTS,
        });
        break;

      case RelationshipType.DIVORCED:
        // Regardless of isActive — divorce is permanent
        matchups.push({
          playerAId: rel.player1Id,
          playerBId: rel.player2Id,
          matchupType: 'EX_SPOUSE_REVENGE',
          liMultiplier: ROMANTIC_MATCHUP_MULTIPLIERS.EX_SPOUSE_REVENGE,
        });
        break;
    }
  }

  return matchups;
}
