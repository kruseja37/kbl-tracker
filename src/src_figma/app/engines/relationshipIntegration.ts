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
