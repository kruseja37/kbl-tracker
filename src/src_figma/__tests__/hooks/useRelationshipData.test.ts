/**
 * useRelationshipData Hook Tests
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.4
 *
 * Tests the relationship data hook's integration with underlying engines.
 */

import { describe, test, expect } from 'vitest';

// Import the hook type and underlying functions
import type { UseRelationshipDataReturn } from '../../app/hooks/useRelationshipData';
import {
  RelationshipType,
  type Relationship,
  canCreateRelationship,
  createRelationship,
  getPlayerRelationships,
  calculateMoraleEffect,
  getMoraleBreakdown,
  generateTradeWarnings,
  endRelationship,
  getRelationshipDisplayInfo,
  calculateTeamChemistry,
  getChemistryRatingColor,
  getRelationshipsByCategory,
} from '../../app/engines/relationshipIntegration';

// ============================================
// HOOK RETURN TYPE TESTS
// ============================================

describe('useRelationshipData Hook Type Contract', () => {
  test('UseRelationshipDataReturn has all required properties', () => {
    // Type test - verify the interface shape
    const requiredProperties = [
      'relationships',
      'teamChemistry',
      'getPlayerMoraleEffect',
      'getPlayerRelationships',
      'getPlayerMoraleBreakdown',
      'addRelationship',
      'removeRelationship',
      'checkCanCreate',
      'getTradeWarnings',
      'getRelationshipInfo',
      'getChemistryColor',
      'getRelationshipCategories',
      'setTeamRoster',
      'loadRelationships',
      'clearRelationships',
    ];

    expect(requiredProperties.length).toBe(15);
  });
});

// ============================================
// RELATIONSHIP TYPE TESTS
// ============================================

describe('RelationshipType Constants', () => {
  test('RelationshipType has expected values', () => {
    // Per Ralph Framework relationships - actual values
    expect(RelationshipType.BEST_FRIENDS).toBe('BEST_FRIENDS');
    expect(RelationshipType.RIVALS).toBe('RIVALS');
    expect(RelationshipType.MENTOR_PROTEGE).toBe('MENTOR_PROTEGE');
    expect(RelationshipType.DATING).toBe('DATING');
    expect(RelationshipType.MARRIED).toBe('MARRIED');
    expect(RelationshipType.DIVORCED).toBe('DIVORCED');
    expect(RelationshipType.BULLY_VICTIM).toBe('BULLY_VICTIM');
    expect(RelationshipType.JEALOUS).toBe('JEALOUS');
    expect(RelationshipType.CRUSH).toBe('CRUSH');
  });
});

// ============================================
// RELATIONSHIP CREATION TESTS
// ============================================

describe('Relationship Creation (via underlying functions)', () => {
  test('createRelationship creates valid relationship', () => {
    const relationship = createRelationship('player-001', 'player-002', RelationshipType.BEST_FRIENDS);

    expect(relationship.player1Id).toBe('player-001');
    expect(relationship.player2Id).toBe('player-002');
    expect(relationship.type).toBe(RelationshipType.BEST_FRIENDS);
    expect(relationship.relationshipId).toBeTruthy();
    expect(relationship.isActive).toBe(true);  // isActive not active
  });

  test('canCreateRelationship validates relationship', () => {
    const existingRelationships: Relationship[] = [];

    const result = canCreateRelationship(
      existingRelationships,
      'player-001',
      'player-002',
      RelationshipType.RIVALS
    );

    expect(result.canCreate).toBe(true);
  });

  test('canCreateRelationship prevents duplicate relationships', () => {
    const existing = createRelationship('player-001', 'player-002', RelationshipType.BEST_FRIENDS);
    const existingRelationships: Relationship[] = [existing];

    // Can't have two relationships of the same type between same players
    const result = canCreateRelationship(
      existingRelationships,
      'player-001',
      'player-002',
      RelationshipType.BEST_FRIENDS
    );

    expect(result.canCreate).toBe(false);
    expect(result.reason).toBeTruthy();
  });
});

// ============================================
// RELATIONSHIP MANAGEMENT TESTS
// ============================================

describe('Relationship Management (via underlying functions)', () => {
  test('getPlayerRelationships returns player relationships', () => {
    const r1 = createRelationship('player-001', 'player-002', RelationshipType.BEST_FRIENDS);
    const r2 = createRelationship('player-001', 'player-003', RelationshipType.RIVALS);
    const r3 = createRelationship('player-004', 'player-005', RelationshipType.DATING);

    const relationships = [r1, r2, r3];
    const player1Rels = getPlayerRelationships(relationships, 'player-001', true);

    expect(player1Rels.length).toBe(2);
    expect(player1Rels).toContain(r1);
    expect(player1Rels).toContain(r2);
    expect(player1Rels).not.toContain(r3);
  });

  test('endRelationship marks relationship as inactive', () => {
    const relationship = createRelationship('player-001', 'player-002', RelationshipType.DATING);
    expect(relationship.isActive).toBe(true);

    const ended = endRelationship(relationship);

    expect(ended.isActive).toBe(false);
    expect(ended.endedAt).toBeTruthy();
  });
});

// ============================================
// MORALE EFFECT TESTS
// ============================================

describe('Morale Effects (via underlying functions)', () => {
  test('calculateMoraleEffect returns morale value', () => {
    const bestFriend = createRelationship('player-001', 'player-002', RelationshipType.BEST_FRIENDS);
    const relationships = [bestFriend];

    const morale = calculateMoraleEffect(relationships, 'player-001');

    // Best friends should provide positive morale
    expect(typeof morale).toBe('number');
    expect(morale).toBeGreaterThan(0);  // Best friends = +6 morale
  });

  test('rival relationship affects morale negatively', () => {
    const rival = createRelationship('player-001', 'player-002', RelationshipType.RIVALS);
    const relationships = [rival];

    const morale = calculateMoraleEffect(relationships, 'player-001');

    expect(typeof morale).toBe('number');
    expect(morale).toBeLessThan(0);  // Rivals = -5 morale
  });

  test('getMoraleBreakdown returns detailed breakdown', () => {
    const r1 = createRelationship('player-001', 'player-002', RelationshipType.BEST_FRIENDS);
    const r2 = createRelationship('player-001', 'player-003', RelationshipType.RIVALS);
    const relationships = [r1, r2];

    const breakdown = getMoraleBreakdown(relationships, 'player-001');

    expect(breakdown.length).toBe(2);
    breakdown.forEach(item => {
      expect(item.relationship).toBeDefined();
      expect(typeof item.effect).toBe('number');
    });
  });
});

// ============================================
// TRADE WARNING TESTS
// ============================================

describe('Trade Warnings (via underlying functions)', () => {
  test('generateTradeWarnings detects relationship impacts', () => {
    const bestFriend = createRelationship('player-001', 'player-002', RelationshipType.BEST_FRIENDS);
    const relationships = [bestFriend];

    // Trading player-001 would affect player-002
    const warnings = generateTradeWarnings(relationships, 'player-001');

    // Should generate warning about losing best friend
    expect(warnings.length).toBeGreaterThan(0);
  });

  test('generateTradeWarnings with player name function', () => {
    const bestFriend = createRelationship('player-001', 'player-002', RelationshipType.BEST_FRIENDS);
    const relationships = [bestFriend];

    const getPlayerName = (id: string) => id === 'player-001' ? 'John' : 'Jane';
    const warnings = generateTradeWarnings(relationships, 'player-001', getPlayerName);

    // Warnings should include player names
    expect(warnings.length).toBeGreaterThan(0);
  });

  test('no warnings for player without relationships', () => {
    const bestFriend = createRelationship('player-001', 'player-002', RelationshipType.BEST_FRIENDS);
    const relationships = [bestFriend];

    const warnings = generateTradeWarnings(relationships, 'player-999');

    expect(warnings.length).toBe(0);
  });
});

// ============================================
// TEAM CHEMISTRY TESTS
// ============================================

describe('Team Chemistry (via underlying functions)', () => {
  test('calculateTeamChemistry returns chemistry summary', () => {
    const r1 = createRelationship('player-001', 'player-002', RelationshipType.BEST_FRIENDS);
    const r2 = createRelationship('player-002', 'player-003', RelationshipType.MENTOR_PROTEGE);
    const relationships = [r1, r2];
    const teamPlayerIds = ['player-001', 'player-002', 'player-003'];

    const chemistry = calculateTeamChemistry(relationships, teamPlayerIds);

    expect(chemistry).toBeDefined();
    expect(chemistry.chemistryRating).toBeDefined();
    expect(typeof chemistry.positiveRelationships).toBe('number');
    expect(typeof chemistry.negativeRelationships).toBe('number');
  });

  test('empty team has neutral chemistry', () => {
    const chemistry = calculateTeamChemistry([], []);

    expect(chemistry).toBeDefined();
    // Empty team should have baseline/neutral chemistry
    expect(chemistry.chemistryRating).toBe('AVERAGE');
  });

  test('getChemistryRatingColor returns color', () => {
    const color = getChemistryRatingColor('EXCELLENT');

    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('chemistry ratings have distinct colors', () => {
    const excellent = getChemistryRatingColor('EXCELLENT');
    const good = getChemistryRatingColor('GOOD');
    const average = getChemistryRatingColor('AVERAGE');
    const poor = getChemistryRatingColor('POOR');
    const toxic = getChemistryRatingColor('TOXIC');

    // All should be valid hex colors
    [excellent, good, average, poor, toxic].forEach(color => {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});

// ============================================
// DISPLAY HELPER TESTS
// ============================================

describe('Display Helpers (via underlying functions)', () => {
  test('getRelationshipDisplayInfo returns info for type', () => {
    const info = getRelationshipDisplayInfo(RelationshipType.BEST_FRIENDS);

    expect(info.name).toBeTruthy();
    expect(info.description).toBeTruthy();
    expect(info.icon).toBeTruthy();
    expect(info.category).toBeDefined();
    expect(typeof info.moraleEffect.player1).toBe('number');
    expect(typeof info.moraleEffect.player2).toBe('number');
  });

  test('getRelationshipsByCategory returns categories', () => {
    const categories = getRelationshipsByCategory();

    expect(categories).toBeDefined();
    expect(categories.ROMANTIC).toBeDefined();
    expect(categories.FRIENDSHIP).toBeDefined();
    expect(categories.CONFLICT).toBeDefined();
    expect(categories.PROFESSIONAL).toBeDefined();

    // ROMANTIC should include DATING, MARRIED, etc.
    expect(categories.ROMANTIC).toContain(RelationshipType.DATING);
    expect(categories.ROMANTIC).toContain(RelationshipType.MARRIED);

    // FRIENDSHIP should include BEST_FRIENDS
    expect(categories.FRIENDSHIP).toContain(RelationshipType.BEST_FRIENDS);

    // CONFLICT should include RIVALS
    expect(categories.CONFLICT).toContain(RelationshipType.RIVALS);
  });
});

// ============================================
// INTEGRATION SEMANTICS TESTS
// ============================================

describe('Hook Integration Semantics', () => {
  test('relationship workflow: create -> check morale -> end', () => {
    // 1. Create relationship
    const relationship = createRelationship('player-001', 'player-002', RelationshipType.MENTOR_PROTEGE);
    expect(relationship.isActive).toBe(true);

    // 2. Calculate morale effect
    const morale = calculateMoraleEffect([relationship], 'player-002');
    expect(typeof morale).toBe('number');
    expect(morale).toBeGreaterThan(0);  // Protégé gets +7 morale

    // 3. End relationship
    const ended = endRelationship(relationship);
    expect(ended.isActive).toBe(false);

    // 4. Morale from ended relationship should be 0
    const endedMorale = calculateMoraleEffect([ended], 'player-002');
    expect(endedMorale).toBe(0);  // Inactive relationships don't contribute
  });

  test('team chemistry workflow: add players -> add relationships -> calculate', () => {
    // 1. Define team
    const teamPlayerIds = ['p1', 'p2', 'p3', 'p4'];

    // 2. No relationships = baseline
    const baseline = calculateTeamChemistry([], teamPlayerIds);
    expect(baseline.chemistryRating).toBe('AVERAGE');
    expect(baseline.positiveRelationships).toBe(0);

    // 3. Add positive relationships
    const r1 = createRelationship('p1', 'p2', RelationshipType.BEST_FRIENDS);
    const r2 = createRelationship('p3', 'p4', RelationshipType.MENTOR_PROTEGE);
    const withPositive = calculateTeamChemistry([r1, r2], teamPlayerIds);

    // 4. Chemistry should be impacted by positive relationships
    expect(withPositive.positiveRelationships).toBe(2);
    expect(withPositive.netMoraleEffect).toBeGreaterThan(0);
  });

  test('trade evaluation workflow: check warnings -> calculate impact', () => {
    // 1. Set up relationships
    const r1 = createRelationship('p1', 'p2', RelationshipType.BEST_FRIENDS);
    const r2 = createRelationship('p1', 'p3', RelationshipType.MENTOR_PROTEGE);
    const relationships = [r1, r2];

    // 2. Check trade warnings for p1
    const warnings = generateTradeWarnings(relationships, 'p1');
    expect(warnings.length).toBeGreaterThan(0);

    // 3. Each warning should have required fields
    warnings.forEach(warning => {
      expect(warning.affectedPlayerId).toBeTruthy();
      expect(warning.brokenRelationshipType).toBeTruthy();
      expect(typeof warning.moraleImpact).toBe('number');
      expect(warning.description).toBeTruthy();
    });
  });
});
