/**
 * Relationship Integration - Detector Function Tests
 * Per LEVERAGE_INDEX_SPEC.md §10.5-10.6
 *
 * Tests detectRevengeArcs() and detectRomanticMatchups() which scan
 * relationships to find cross-team arcs and matchups.
 */
import { describe, it, expect } from 'vitest';
import {
  detectRevengeArcs,
  detectRomanticMatchups,
  RelationshipType,
  type Relationship,
} from '../../app/engines/relationshipIntegration';

// ============================================
// TEST FIXTURES
// ============================================

const HOME_IDS = ['home-alice', 'home-bob', 'home-charlie'];
const AWAY_IDS = ['away-dave', 'away-eve', 'away-frank'];

function makeRelationship(overrides: Partial<Relationship> = {}): Relationship {
  return {
    relationshipId: `rel-${Math.random().toString(36).slice(2, 8)}`,
    player1Id: HOME_IDS[0],
    player2Id: AWAY_IDS[0],
    type: RelationshipType.DATING,
    createdAt: new Date('2024-01-01'),
    isActive: true,
    ...overrides,
  };
}

// ============================================
// DETECT REVENGE ARCS
// ============================================

describe('detectRevengeArcs', () => {
  it('returns empty array when no relationships exist', () => {
    expect(detectRevengeArcs([], HOME_IDS, AWAY_IDS)).toEqual([]);
  });

  it('ignores active relationships (revenge arcs only from ended)', () => {
    const rels = [makeRelationship({ isActive: true })];
    expect(detectRevengeArcs(rels, HOME_IDS, AWAY_IDS)).toEqual([]);
  });

  it('ignores ended relationships where both players are on same team', () => {
    const rels = [makeRelationship({
      player1Id: HOME_IDS[0],
      player2Id: HOME_IDS[1],
      isActive: false,
      endedAt: new Date(),
    })];
    expect(detectRevengeArcs(rels, HOME_IDS, AWAY_IDS)).toEqual([]);
  });

  it('detects SCORNED_LOVER from ended DATING cross-team', () => {
    const rels = [makeRelationship({
      type: RelationshipType.DATING,
      isActive: false,
      endedAt: new Date(),
    })];
    const arcs = detectRevengeArcs(rels, HOME_IDS, AWAY_IDS);
    expect(arcs.length).toBe(2); // Both players get an arc
    expect(arcs[0].arcType).toBe('SCORNED_LOVER');
    expect(arcs[0].liMultiplier).toBe(1.5);
    expect(arcs[1].arcType).toBe('SCORNED_LOVER');
  });

  it('detects SCORNED_LOVER from ended MARRIED cross-team', () => {
    const rels = [makeRelationship({
      type: RelationshipType.MARRIED,
      isActive: false,
      endedAt: new Date(),
    })];
    const arcs = detectRevengeArcs(rels, HOME_IDS, AWAY_IDS);
    expect(arcs.length).toBe(2);
    expect(arcs.every(a => a.arcType === 'SCORNED_LOVER')).toBe(true);
  });

  it('detects ESTRANGED_FRIEND from ended BEST_FRIENDS cross-team', () => {
    const rels = [makeRelationship({
      type: RelationshipType.BEST_FRIENDS,
      isActive: false,
      endedAt: new Date(),
    })];
    const arcs = detectRevengeArcs(rels, HOME_IDS, AWAY_IDS);
    expect(arcs.length).toBe(2);
    expect(arcs.every(a => a.arcType === 'ESTRANGED_FRIEND')).toBe(true);
    expect(arcs[0].liMultiplier).toBe(1.25);
  });

  it('detects SURPASSED_MENTOR from ended MENTOR_PROTEGE cross-team', () => {
    const rels = [makeRelationship({
      type: RelationshipType.MENTOR_PROTEGE,
      player1Id: HOME_IDS[0], // mentor
      player2Id: AWAY_IDS[0], // protégé
      isActive: false,
      endedAt: new Date(),
    })];
    const arcs = detectRevengeArcs(rels, HOME_IDS, AWAY_IDS);
    expect(arcs.length).toBe(1); // Only protégé gets this arc
    expect(arcs[0].arcType).toBe('SURPASSED_MENTOR');
    expect(arcs[0].playerId).toBe(AWAY_IDS[0]); // protégé
    expect(arcs[0].formerPartnerId).toBe(HOME_IDS[0]); // mentor
    expect(arcs[0].liMultiplier).toBe(1.3);
  });

  it('detects VICTIM_REVENGE and BULLY_CONFRONTED from ended BULLY_VICTIM', () => {
    const rels = [makeRelationship({
      type: RelationshipType.BULLY_VICTIM,
      player1Id: HOME_IDS[0], // bully
      player2Id: AWAY_IDS[0], // victim
      isActive: false,
      endedAt: new Date(),
    })];
    const arcs = detectRevengeArcs(rels, HOME_IDS, AWAY_IDS);
    expect(arcs.length).toBe(2);

    const victimArc = arcs.find(a => a.arcType === 'VICTIM_REVENGE');
    const bullyArc = arcs.find(a => a.arcType === 'BULLY_CONFRONTED');

    expect(victimArc).toBeDefined();
    expect(victimArc!.playerId).toBe(AWAY_IDS[0]); // victim
    expect(victimArc!.liMultiplier).toBe(1.75);

    expect(bullyArc).toBeDefined();
    expect(bullyArc!.playerId).toBe(HOME_IDS[0]); // bully
    expect(bullyArc!.liMultiplier).toBe(0.9);
  });

  it('does NOT generate arcs for ended RIVALS, JEALOUS, CRUSH, or DIVORCED', () => {
    const rels = [
      makeRelationship({ type: RelationshipType.RIVALS, isActive: false, endedAt: new Date() }),
      makeRelationship({ type: RelationshipType.JEALOUS, isActive: false, endedAt: new Date() }),
      makeRelationship({ type: RelationshipType.CRUSH, isActive: false, endedAt: new Date() }),
      makeRelationship({ type: RelationshipType.DIVORCED, isActive: false, endedAt: new Date() }),
    ];
    expect(detectRevengeArcs(rels, HOME_IDS, AWAY_IDS)).toEqual([]);
  });
});

// ============================================
// DETECT ROMANTIC MATCHUPS
// ============================================

describe('detectRomanticMatchups', () => {
  it('returns empty array when no relationships exist', () => {
    expect(detectRomanticMatchups([], HOME_IDS, AWAY_IDS)).toEqual([]);
  });

  it('ignores same-team relationships', () => {
    const rels = [makeRelationship({
      player1Id: HOME_IDS[0],
      player2Id: HOME_IDS[1],
      type: RelationshipType.DATING,
    })];
    expect(detectRomanticMatchups(rels, HOME_IDS, AWAY_IDS)).toEqual([]);
  });

  it('detects LOVERS_RIVALRY from active DATING cross-team', () => {
    const rels = [makeRelationship({
      type: RelationshipType.DATING,
      isActive: true,
    })];
    const matchups = detectRomanticMatchups(rels, HOME_IDS, AWAY_IDS);
    expect(matchups.length).toBe(1);
    expect(matchups[0].matchupType).toBe('LOVERS_RIVALRY');
    expect(matchups[0].liMultiplier).toBe(1.3);
  });

  it('does NOT detect LOVERS_RIVALRY from ended DATING', () => {
    const rels = [makeRelationship({
      type: RelationshipType.DATING,
      isActive: false,
      endedAt: new Date(),
    })];
    const matchups = detectRomanticMatchups(rels, HOME_IDS, AWAY_IDS);
    expect(matchups.length).toBe(0);
  });

  it('detects MARRIED_OPPONENTS from active MARRIED cross-team', () => {
    const rels = [makeRelationship({
      type: RelationshipType.MARRIED,
      isActive: true,
    })];
    const matchups = detectRomanticMatchups(rels, HOME_IDS, AWAY_IDS);
    expect(matchups.length).toBe(1);
    expect(matchups[0].matchupType).toBe('MARRIED_OPPONENTS');
    expect(matchups[0].liMultiplier).toBe(1.4);
  });

  it('does NOT detect MARRIED_OPPONENTS from ended MARRIED', () => {
    const rels = [makeRelationship({
      type: RelationshipType.MARRIED,
      isActive: false,
      endedAt: new Date(),
    })];
    const matchups = detectRomanticMatchups(rels, HOME_IDS, AWAY_IDS);
    expect(matchups.length).toBe(0);
  });

  it('detects EX_SPOUSE_REVENGE from DIVORCED cross-team (regardless of isActive)', () => {
    // DIVORCED relationships may have any isActive state
    const rels = [makeRelationship({
      type: RelationshipType.DIVORCED,
      isActive: true, // or false - doesn't matter
    })];
    const matchups = detectRomanticMatchups(rels, HOME_IDS, AWAY_IDS);
    expect(matchups.length).toBe(1);
    expect(matchups[0].matchupType).toBe('EX_SPOUSE_REVENGE');
    expect(matchups[0].liMultiplier).toBe(1.6);
  });

  it('does NOT detect matchups for non-romantic relationship types', () => {
    const rels = [
      makeRelationship({ type: RelationshipType.BEST_FRIENDS }),
      makeRelationship({ type: RelationshipType.RIVALS }),
      makeRelationship({ type: RelationshipType.MENTOR_PROTEGE }),
      makeRelationship({ type: RelationshipType.BULLY_VICTIM }),
      makeRelationship({ type: RelationshipType.JEALOUS }),
      makeRelationship({ type: RelationshipType.CRUSH }),
    ];
    expect(detectRomanticMatchups(rels, HOME_IDS, AWAY_IDS)).toEqual([]);
  });

  it('detects multiple matchups from multiple relationships', () => {
    const rels = [
      makeRelationship({
        player1Id: HOME_IDS[0],
        player2Id: AWAY_IDS[0],
        type: RelationshipType.DATING,
        isActive: true,
      }),
      makeRelationship({
        player1Id: HOME_IDS[1],
        player2Id: AWAY_IDS[1],
        type: RelationshipType.DIVORCED,
        isActive: false,
      }),
    ];
    const matchups = detectRomanticMatchups(rels, HOME_IDS, AWAY_IDS);
    expect(matchups.length).toBe(2);
    expect(matchups.find(m => m.matchupType === 'LOVERS_RIVALRY')).toBeDefined();
    expect(matchups.find(m => m.matchupType === 'EX_SPOUSE_REVENGE')).toBeDefined();
  });
});
