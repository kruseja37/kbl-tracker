/**
 * Leverage Calculator - Relationship LI Modifier Tests
 * Per LEVERAGE_INDEX_SPEC.md §10.5-10.7
 *
 * Tests the 3 relationship-based LI modifiers:
 * - Revenge Arc (§10.5)
 * - Romantic Matchup (§10.6)
 * - Family Home Game (§10.7)
 *
 * And the composite calculateLIWithRelationships() function.
 */
import { describe, it, expect } from 'vitest';
import {
  getRevengeArcModifier,
  getRomanticMatchupModifier,
  getFamilyHomeLIModifier,
  calculateLIWithRelationships,
  REVENGE_ARC_MULTIPLIERS,
  ROMANTIC_MATCHUP_MULTIPLIERS,
  HOME_FAMILY_LI_CONFIG,
  type RevengeArc,
  type RomanticMatchup,
  type RelationshipLIContext,
  type GameStateForLI,
} from '../../../engines/leverageCalculator';

// ============================================
// TEST FIXTURES
// ============================================

const BATTER_ID = 'away-john-smith';
const PITCHER_ID = 'home-jane-doe';
const OTHER_PLAYER_ID = 'away-bob-jones';

function makeRevengeArc(overrides: Partial<RevengeArc> = {}): RevengeArc {
  return {
    playerId: BATTER_ID,
    formerPartnerId: PITCHER_ID,
    arcType: 'SCORNED_LOVER',
    liMultiplier: REVENGE_ARC_MULTIPLIERS.SCORNED_LOVER,
    ...overrides,
  };
}

function makeRomanticMatchup(overrides: Partial<RomanticMatchup> = {}): RomanticMatchup {
  return {
    playerAId: BATTER_ID,
    playerBId: PITCHER_ID,
    matchupType: 'LOVERS_RIVALRY',
    liMultiplier: ROMANTIC_MATCHUP_MULTIPLIERS.LOVERS_RIVALRY,
    ...overrides,
  };
}

function makeGameState(overrides: Partial<GameStateForLI> = {}): GameStateForLI {
  return {
    inning: 5,
    halfInning: 'TOP',
    outs: 1 as 0 | 1 | 2,
    runners: { first: false, second: false, third: false },
    homeScore: 3,
    awayScore: 2,
    ...overrides,
  };
}

function makeRelationshipContext(overrides: Partial<RelationshipLIContext> = {}): RelationshipLIContext {
  return {
    revengeArcs: [],
    romanticMatchups: [],
    familyPlayers: new Map(),
    isHomeGame: false,
    ...overrides,
  };
}

// ============================================
// §10.5 REVENGE ARC MODIFIER
// ============================================

describe('getRevengeArcModifier', () => {
  it('returns 1.0 when no revenge arcs exist', () => {
    expect(getRevengeArcModifier(BATTER_ID, PITCHER_ID, [])).toBe(1.0);
  });

  it('returns 1.0 when batter/pitcher are not involved in any arc', () => {
    const arcs: RevengeArc[] = [
      makeRevengeArc({ playerId: 'other-1', formerPartnerId: 'other-2' }),
    ];
    expect(getRevengeArcModifier(BATTER_ID, PITCHER_ID, arcs)).toBe(1.0);
  });

  it('applies SCORNED_LOVER modifier (1.5×)', () => {
    const arcs = [makeRevengeArc({ arcType: 'SCORNED_LOVER', liMultiplier: REVENGE_ARC_MULTIPLIERS.SCORNED_LOVER })];
    expect(getRevengeArcModifier(BATTER_ID, PITCHER_ID, arcs)).toBe(1.5);
  });

  it('applies ESTRANGED_FRIEND modifier (1.25×)', () => {
    const arcs = [makeRevengeArc({ arcType: 'ESTRANGED_FRIEND', liMultiplier: REVENGE_ARC_MULTIPLIERS.ESTRANGED_FRIEND })];
    expect(getRevengeArcModifier(BATTER_ID, PITCHER_ID, arcs)).toBe(1.25);
  });

  it('applies SURPASSED_MENTOR modifier (1.3×)', () => {
    const arcs = [makeRevengeArc({ arcType: 'SURPASSED_MENTOR', liMultiplier: REVENGE_ARC_MULTIPLIERS.SURPASSED_MENTOR })];
    expect(getRevengeArcModifier(BATTER_ID, PITCHER_ID, arcs)).toBe(1.3);
  });

  it('applies VICTIM_REVENGE modifier (1.75×)', () => {
    const arcs = [makeRevengeArc({ arcType: 'VICTIM_REVENGE', liMultiplier: REVENGE_ARC_MULTIPLIERS.VICTIM_REVENGE })];
    expect(getRevengeArcModifier(BATTER_ID, PITCHER_ID, arcs)).toBe(1.75);
  });

  it('BULLY_CONFRONTED (0.9×) does not boost LI (stays at 1.0 via Math.max)', () => {
    // Per spec: Math.max(1.0, 0.9) = 1.0 — bully doesn't get emotional boost
    // The 0.9 means "no boost for bully" while victim gets 1.75×
    const arcs = [makeRevengeArc({ arcType: 'BULLY_CONFRONTED', liMultiplier: REVENGE_ARC_MULTIPLIERS.BULLY_CONFRONTED })];
    expect(getRevengeArcModifier(BATTER_ID, PITCHER_ID, arcs)).toBe(1.0);
    expect(REVENGE_ARC_MULTIPLIERS.BULLY_CONFRONTED).toBe(0.9); // Constant still correct
  });

  it('works when batter is formerPartner (reversed matchup)', () => {
    const arcs = [makeRevengeArc({
      playerId: PITCHER_ID,
      formerPartnerId: BATTER_ID,
      arcType: 'SCORNED_LOVER',
      liMultiplier: REVENGE_ARC_MULTIPLIERS.SCORNED_LOVER,
    })];
    expect(getRevengeArcModifier(BATTER_ID, PITCHER_ID, arcs)).toBe(1.5);
  });

  it('uses highest modifier when multiple arcs apply', () => {
    const arcs = [
      makeRevengeArc({ arcType: 'ESTRANGED_FRIEND', liMultiplier: REVENGE_ARC_MULTIPLIERS.ESTRANGED_FRIEND }),
      makeRevengeArc({ arcType: 'VICTIM_REVENGE', liMultiplier: REVENGE_ARC_MULTIPLIERS.VICTIM_REVENGE }),
    ];
    expect(getRevengeArcModifier(BATTER_ID, PITCHER_ID, arcs)).toBe(1.75);
  });
});

// ============================================
// §10.6 ROMANTIC MATCHUP MODIFIER
// ============================================

describe('getRomanticMatchupModifier', () => {
  it('returns 1.0 when no romantic matchups exist', () => {
    expect(getRomanticMatchupModifier(BATTER_ID, PITCHER_ID, [])).toBe(1.0);
  });

  it('returns 1.0 when batter/pitcher are not involved', () => {
    const matchups = [makeRomanticMatchup({ playerAId: 'other-1', playerBId: 'other-2' })];
    expect(getRomanticMatchupModifier(BATTER_ID, PITCHER_ID, matchups)).toBe(1.0);
  });

  it('applies LOVERS_RIVALRY modifier (1.3×)', () => {
    const matchups = [makeRomanticMatchup({
      matchupType: 'LOVERS_RIVALRY',
      liMultiplier: ROMANTIC_MATCHUP_MULTIPLIERS.LOVERS_RIVALRY,
    })];
    expect(getRomanticMatchupModifier(BATTER_ID, PITCHER_ID, matchups)).toBe(1.3);
  });

  it('applies MARRIED_OPPONENTS modifier (1.4×)', () => {
    const matchups = [makeRomanticMatchup({
      matchupType: 'MARRIED_OPPONENTS',
      liMultiplier: ROMANTIC_MATCHUP_MULTIPLIERS.MARRIED_OPPONENTS,
    })];
    expect(getRomanticMatchupModifier(BATTER_ID, PITCHER_ID, matchups)).toBe(1.4);
  });

  it('applies EX_SPOUSE_REVENGE modifier (1.6×)', () => {
    const matchups = [makeRomanticMatchup({
      matchupType: 'EX_SPOUSE_REVENGE',
      liMultiplier: ROMANTIC_MATCHUP_MULTIPLIERS.EX_SPOUSE_REVENGE,
    })];
    expect(getRomanticMatchupModifier(BATTER_ID, PITCHER_ID, matchups)).toBe(1.6);
  });

  it('works with reversed player order', () => {
    const matchups = [makeRomanticMatchup({
      playerAId: PITCHER_ID,
      playerBId: BATTER_ID,
    })];
    expect(getRomanticMatchupModifier(BATTER_ID, PITCHER_ID, matchups)).toBe(1.3);
  });

  it('uses highest modifier when multiple matchups apply', () => {
    const matchups = [
      makeRomanticMatchup({
        matchupType: 'LOVERS_RIVALRY',
        liMultiplier: ROMANTIC_MATCHUP_MULTIPLIERS.LOVERS_RIVALRY,
      }),
      makeRomanticMatchup({
        matchupType: 'EX_SPOUSE_REVENGE',
        liMultiplier: ROMANTIC_MATCHUP_MULTIPLIERS.EX_SPOUSE_REVENGE,
      }),
    ];
    expect(getRomanticMatchupModifier(BATTER_ID, PITCHER_ID, matchups)).toBe(1.6);
  });
});

// ============================================
// §10.7 FAMILY HOME GAME MODIFIER
// ============================================

describe('getFamilyHomeLIModifier', () => {
  it('returns 1.0 when not a home game', () => {
    const family = new Map([[BATTER_ID, { childCount: 3 }]]);
    expect(getFamilyHomeLIModifier(BATTER_ID, family, false)).toBe(1.0);
  });

  it('returns 1.0 when player has no family data', () => {
    expect(getFamilyHomeLIModifier(BATTER_ID, new Map(), true)).toBe(1.0);
  });

  it('returns base modifier (1.1×) for non-player spouse with no kids', () => {
    const family = new Map([[BATTER_ID, { childCount: 0 }]]);
    expect(getFamilyHomeLIModifier(BATTER_ID, family, true)).toBe(HOME_FAMILY_LI_CONFIG.NON_PLAYER_SPOUSE);
    expect(getFamilyHomeLIModifier(BATTER_ID, family, true)).toBe(1.1);
  });

  it('adds +0.1 per child', () => {
    const family1 = new Map([[BATTER_ID, { childCount: 1 }]]);
    expect(getFamilyHomeLIModifier(BATTER_ID, family1, true)).toBeCloseTo(1.2, 5);

    const family3 = new Map([[BATTER_ID, { childCount: 3 }]]);
    expect(getFamilyHomeLIModifier(BATTER_ID, family3, true)).toBeCloseTo(1.4, 5);
  });

  it('caps child bonus at +0.5 (5+ kids)', () => {
    const family5 = new Map([[BATTER_ID, { childCount: 5 }]]);
    expect(getFamilyHomeLIModifier(BATTER_ID, family5, true)).toBeCloseTo(1.6, 5);

    // 7 kids should also cap at 1.6
    const family7 = new Map([[BATTER_ID, { childCount: 7 }]]);
    expect(getFamilyHomeLIModifier(BATTER_ID, family7, true)).toBeCloseTo(1.6, 5);
  });

  it('returns 1.0 for different player ID', () => {
    const family = new Map([[BATTER_ID, { childCount: 2 }]]);
    expect(getFamilyHomeLIModifier(OTHER_PLAYER_ID, family, true)).toBe(1.0);
  });
});

// ============================================
// STACKING & COMPOSITE RULES
// ============================================

describe('calculateLIWithRelationships', () => {
  it('returns base LI when no relationship context', () => {
    const gameState = makeGameState();
    const context = makeRelationshipContext();
    const result = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, context);
    // Should be same as base LI since no modifiers
    expect(result.leverageIndex).toBeGreaterThan(0);
  });

  it('applies revenge arc modifier to base LI', () => {
    const gameState = makeGameState();
    const context = makeRelationshipContext({
      revengeArcs: [makeRevengeArc({
        arcType: 'VICTIM_REVENGE',
        liMultiplier: REVENGE_ARC_MULTIPLIERS.VICTIM_REVENGE,
      })],
    });
    const baseResult = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, makeRelationshipContext());
    const modifiedResult = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, context);

    // Modified should be higher (1.75× multiplier)
    expect(modifiedResult.rawLI).toBeCloseTo(baseResult.rawLI * 1.75, 2);
  });

  it('applies romantic matchup modifier to base LI', () => {
    const gameState = makeGameState();
    const context = makeRelationshipContext({
      romanticMatchups: [makeRomanticMatchup({
        matchupType: 'MARRIED_OPPONENTS',
        liMultiplier: ROMANTIC_MATCHUP_MULTIPLIERS.MARRIED_OPPONENTS,
      })],
    });
    const baseResult = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, makeRelationshipContext());
    const modifiedResult = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, context);

    expect(modifiedResult.rawLI).toBeCloseTo(baseResult.rawLI * 1.4, 2);
  });

  it('revenge and romantic use Math.max (do NOT stack)', () => {
    const gameState = makeGameState();
    // Both revenge (1.75) and romantic (1.6) present
    const context = makeRelationshipContext({
      revengeArcs: [makeRevengeArc({
        arcType: 'VICTIM_REVENGE',
        liMultiplier: REVENGE_ARC_MULTIPLIERS.VICTIM_REVENGE, // 1.75
      })],
      romanticMatchups: [makeRomanticMatchup({
        matchupType: 'EX_SPOUSE_REVENGE',
        liMultiplier: ROMANTIC_MATCHUP_MULTIPLIERS.EX_SPOUSE_REVENGE, // 1.6
      })],
    });
    const baseResult = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, makeRelationshipContext());
    const modifiedResult = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, context);

    // Should use max(1.75, 1.6) = 1.75, NOT 1.75 * 1.6 = 2.8
    expect(modifiedResult.rawLI).toBeCloseTo(baseResult.rawLI * 1.75, 2);
  });

  it('family modifier stacks multiplicatively with relationship modifier', () => {
    const gameState = makeGameState({ halfInning: 'BOTTOM' }); // Home team batting
    const familyMap = new Map([[BATTER_ID, { childCount: 2 }]]);
    const context = makeRelationshipContext({
      revengeArcs: [makeRevengeArc({
        arcType: 'SCORNED_LOVER',
        liMultiplier: REVENGE_ARC_MULTIPLIERS.SCORNED_LOVER, // 1.5
      })],
      familyPlayers: familyMap, // 1.1 + 0.2 = 1.3
    });
    const baseResult = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, makeRelationshipContext());
    const modifiedResult = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, context);

    // Expected: 1.5 (revenge) × 1.3 (family) = 1.95× base
    expect(modifiedResult.rawLI).toBeCloseTo(baseResult.rawLI * 1.5 * 1.3, 1);
  });

  it('caps final LI at 10.0', () => {
    // Create a high-leverage game state
    const gameState = makeGameState({
      inning: 9,
      halfInning: 'BOTTOM',
      outs: 2 as 0 | 1 | 2,
      runners: { first: true, second: true, third: true },
      homeScore: 5,
      awayScore: 6,
    });
    // Max revenge modifier
    const context = makeRelationshipContext({
      revengeArcs: [makeRevengeArc({
        arcType: 'VICTIM_REVENGE',
        liMultiplier: REVENGE_ARC_MULTIPLIERS.VICTIM_REVENGE, // 1.75
      })],
    });
    const result = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, context);
    expect(result.leverageIndex).toBeLessThanOrEqual(10.0);
  });

  it('respects enableRevengeArcModifier config flag', () => {
    const gameState = makeGameState();
    const context = makeRelationshipContext({
      revengeArcs: [makeRevengeArc({
        arcType: 'VICTIM_REVENGE',
        liMultiplier: REVENGE_ARC_MULTIPLIERS.VICTIM_REVENGE,
      })],
    });

    const disabled = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, context, {
      enableRevengeArcModifier: false,
    });
    const enabled = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, context, {
      enableRevengeArcModifier: true,
    });

    // Disabled should match base (no modifier)
    const base = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, makeRelationshipContext());
    expect(disabled.rawLI).toBeCloseTo(base.rawLI, 5);
    // Enabled should have modifier applied
    expect(enabled.rawLI).toBeCloseTo(base.rawLI * 1.75, 2);
  });

  it('respects enableRomanticMatchupModifier config flag', () => {
    const gameState = makeGameState();
    const context = makeRelationshipContext({
      romanticMatchups: [makeRomanticMatchup({
        matchupType: 'EX_SPOUSE_REVENGE',
        liMultiplier: ROMANTIC_MATCHUP_MULTIPLIERS.EX_SPOUSE_REVENGE,
      })],
    });

    const disabled = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, context, {
      enableRomanticMatchupModifier: false,
    });
    const base = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, makeRelationshipContext());
    expect(disabled.rawLI).toBeCloseTo(base.rawLI, 5);
  });

  it('respects enableFamilyHomeModifier config flag', () => {
    const gameState = makeGameState({ halfInning: 'BOTTOM' });
    const familyMap = new Map([[BATTER_ID, { childCount: 3 }]]);
    const context = makeRelationshipContext({ familyPlayers: familyMap });

    const disabled = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, context, {
      enableFamilyHomeModifier: false,
    });
    const base = calculateLIWithRelationships(gameState, BATTER_ID, PITCHER_ID, makeRelationshipContext());
    expect(disabled.rawLI).toBeCloseTo(base.rawLI, 5);
  });
});

// ============================================
// CONSTANT VERIFICATION
// ============================================

describe('LI Relationship Constants', () => {
  it('REVENGE_ARC_MULTIPLIERS match spec values', () => {
    expect(REVENGE_ARC_MULTIPLIERS.SCORNED_LOVER).toBe(1.5);
    expect(REVENGE_ARC_MULTIPLIERS.ESTRANGED_FRIEND).toBe(1.25);
    expect(REVENGE_ARC_MULTIPLIERS.SURPASSED_MENTOR).toBe(1.3);
    expect(REVENGE_ARC_MULTIPLIERS.VICTIM_REVENGE).toBe(1.75);
    expect(REVENGE_ARC_MULTIPLIERS.BULLY_CONFRONTED).toBe(0.9);
  });

  it('ROMANTIC_MATCHUP_MULTIPLIERS match spec values', () => {
    expect(ROMANTIC_MATCHUP_MULTIPLIERS.LOVERS_RIVALRY).toBe(1.3);
    expect(ROMANTIC_MATCHUP_MULTIPLIERS.MARRIED_OPPONENTS).toBe(1.4);
    expect(ROMANTIC_MATCHUP_MULTIPLIERS.EX_SPOUSE_REVENGE).toBe(1.6);
  });

  it('HOME_FAMILY_LI_CONFIG matches spec values', () => {
    expect(HOME_FAMILY_LI_CONFIG.NON_PLAYER_SPOUSE).toBe(1.1);
    expect(HOME_FAMILY_LI_CONFIG.PER_CHILD).toBe(0.1);
    expect(HOME_FAMILY_LI_CONFIG.MAX_CHILD_BONUS).toBe(0.5);
  });
});

// NOTE: Detector function tests (detectRevengeArcs, detectRomanticMatchups)
// are in relationshipIntegration.test.ts since they live in the integration adapter.
