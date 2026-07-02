import { describe, expect, it } from 'vitest';
import { traitPotencyDollarDelta, type IVPlayerInput } from '../ivEngine';
import {
  chemistryRemovalImpact,
  chemistryTipPremium,
  rosterChemistryProfile,
  type ChemistryContextPlayer,
} from '../chemistryTierValue';

function hitterIv(overrides: Partial<IVPlayerInput> = {}): IVPlayerInput {
  return {
    isPitcher: false,
    bats: 'R',
    primaryPosition: '1B',
    batterRatings: { power: 70, contact: 65, speed: 55, fielding: 60, arm: 60 },
    traits: [],
    arsenal: [],
    ...overrides,
  };
}

function pitcherIv(overrides: Partial<IVPlayerInput> = {}): IVPlayerInput {
  return {
    isPitcher: true,
    bats: 'R',
    pitcherRole: 'SP/RP',
    batterRatings: { power: 0, contact: 0, speed: 0, fielding: 0, arm: 0 },
    pitcherRatings: { velocity: 70, junk: 62, accuracy: 66 },
    traits: [],
    arsenal: [],
    ...overrides,
  };
}

function player(
  chemistry: string,
  traits: string[],
  iv: IVPlayerInput = hitterIv(),
): ChemistryContextPlayer {
  return { chemistry, traits, iv };
}

describe('traitPotencyDollarDelta (the ivEngine primitive)', () => {
  it('is zero for a same-tier move and for unknown traits', () => {
    expect(traitPotencyDollarDelta(hitterIv(), 'Big Hack', 'L2', 'L2')).toBe(0);
    expect(traitPotencyDollarDelta(hitterIv(), 'Not A Real Trait', 'L1', 'L3')).toBe(0);
  });

  it('prices a positive trait up when the tier rises and down when it falls', () => {
    const up = traitPotencyDollarDelta(hitterIv(), 'Big Hack', 'L2', 'L3');
    const down = traitPotencyDollarDelta(hitterIv(), 'Big Hack', 'L2', 'L1');
    expect(up).toBeGreaterThan(0);
    expect(down).toBeLessThan(0);
  });

  it('prices a NEGATIVE trait up when the tier rises (the malus shrinks) with no hand-flip', () => {
    // Whiffer: CON −15 at L2; −45 at L1; −7.5 at L3 (inverted scale).
    expect(traitPotencyDollarDelta(hitterIv(), 'Whiffer', 'L1', 'L2')).toBeGreaterThan(0);
    expect(traitPotencyDollarDelta(hitterIv(), 'Whiffer', 'L2', 'L3')).toBeGreaterThan(0);
  });

  it('is antisymmetric and path-additive across tiers', () => {
    const iv = hitterIv();
    const l1l2 = traitPotencyDollarDelta(iv, 'Cannon Arm', 'L1', 'L2');
    const l2l3 = traitPotencyDollarDelta(iv, 'Cannon Arm', 'L2', 'L3');
    const l1l3 = traitPotencyDollarDelta(iv, 'Cannon Arm', 'L1', 'L3');
    const l3l1 = traitPotencyDollarDelta(iv, 'Cannon Arm', 'L3', 'L1');
    expect(l1l3).toBeCloseTo(l1l2 + l2l3, 6);
    expect(l3l1).toBeCloseTo(-l1l3, 6);
  });

  it('the strong tier uses the canonical 3.0x ramp: L2->L3 lift exceeds the L1->L2 lift', () => {
    // Positive ramp 0.5/1.0/3.0: L2->L3 moves 2.0x of the L2 delta; L1->L2 moves 0.5x.
    const iv = hitterIv();
    const l1l2 = traitPotencyDollarDelta(iv, 'Big Hack', 'L1', 'L2');
    const l2l3 = traitPotencyDollarDelta(iv, 'Big Hack', 'L2', 'L3');
    expect(l2l3).toBeGreaterThan(l1l2);
  });

  it('excludes flatFee/multiplier-only traits entirely (potency-invariant by spec)', () => {
    // Elite 4F: zero deltas, flatFee $22000 + multipliers — re-tiering must price 0.
    expect(traitPotencyDollarDelta(pitcherIv({ pitcherRole: 'SP' }), 'Elite 4F', 'L1', 'L3')).toBe(0);
  });

  it('handles the SP/RP negative-trait block rule and pitcher shapes without throwing', () => {
    const value = traitPotencyDollarDelta(pitcherIv(), 'K Neglector', 'L1', 'L3');
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThan(0); // negative trait, rising tier => malus shrinks
  });

  it('returns 0 instead of throwing on unpriceable input shapes', () => {
    const broken = { isPitcher: false, primaryPosition: 'NOT-A-POS' } as unknown as IVPlayerInput;
    expect(traitPotencyDollarDelta(broken, 'Big Hack', 'L1', 'L3')).toBe(0);
  });
});

describe('chemistryTipPremium', () => {
  it('no crossing, no traits: premium is zero and the counts/distance report is exact', () => {
    const result = chemistryTipPremium(player('Scholarly', []), [
      player('Competitive', []),
      player('Spirited', []),
    ]);
    expect(result.premium).toBe(0);
    expect(result.teamLift).toBe(0);
    expect(result.ownContext).toBe(0);
    expect(result.crossing).toBeNull();
    expect(result.family).toBe('SCH');
    expect(result.countsAfter.SCH).toBe(1);
    expect(result.distanceToNextTier).toBe(2); // 1 -> needs 3 for L2
  });

  it('tipping 2->3 lifts every EXISTING matching-family trait on the roster', () => {
    const roster = [
      player('Scholarly', ['Big Hack']),
      player('Scholarly', []),
      player('Competitive', ['Cannon Arm']), // CMP trait: must NOT be lifted by a SCH add
    ];
    const result = chemistryTipPremium(player('Scholarly', []), roster);
    expect(result.crossing).toBe('L1->L2');
    expect(result.teamLift).toBeGreaterThan(0);
    expect(result.liftedTraitCount).toBe(1); // Big Hack only
    expect(result.teamLift).toBe(
      traitPotencyDollarDelta(roster[0].iv, 'Big Hack', 'L1', 'L2'),
    );
  });

  it('tipping 6->7 is the enormous one: exceeds the 2->3 lift for the same trait portfolio', () => {
    const holder = player('Scholarly', ['Big Hack']);
    const filler = (n: number) => Array.from({ length: n }, () => player('Scholarly', []));
    const small = chemistryTipPremium(player('Scholarly', []), [holder, ...filler(1)]);
    const large = chemistryTipPremium(player('Scholarly', []), [holder, ...filler(5)]);
    expect(large.crossing).toBe('L2->L3');
    expect(large.teamLift).toBeGreaterThan(small.teamLift);
  });

  it('ownContext reprices the candidate from the L2 standard: L1 landing is a negative correction', () => {
    // SCH candidate w/ SCH trait joins a roster with zero SCH: his trait lands L1 (count 1).
    const result = chemistryTipPremium(player('Scholarly', ['Big Hack']), [
      player('Competitive', []),
    ]);
    expect(result.ownContext).toBeLessThan(0);
    expect(result.ownContext).toBe(
      traitPotencyDollarDelta(hitterIv(), 'Big Hack', 'L2', 'L1'),
    );
  });

  it('the candidate never double-counts: own crossing trait prices in ownContext only', () => {
    // 6 SCH teammates hold no SCH traits; the candidate's own Big Hack crosses to L3 with him.
    const roster = Array.from({ length: 6 }, () => player('Scholarly', []));
    const result = chemistryTipPremium(player('Scholarly', ['Big Hack']), roster);
    expect(result.crossing).toBe('L2->L3');
    expect(result.teamLift).toBe(0);
    expect(result.ownContext).toBe(
      traitPotencyDollarDelta(hitterIv(), 'Big Hack', 'L2', 'L3'),
    );
  });

  it('cross-family holdings price at the OTHER family count, unmoved by the candidate add', () => {
    // CMP candidate holding a SCH trait; roster already has 3 SCH -> trait sits L2 -> no correction.
    const roster = [
      player('Scholarly', []),
      player('Scholarly', []),
      player('Scholarly', []),
    ];
    const result = chemistryTipPremium(player('Competitive', ['Big Hack']), roster);
    expect(result.ownContext).toBe(0);
    expect(result.teamLift).toBe(0); // no CMP traits on the roster
  });
});

describe('chemistryRemovalImpact', () => {
  it('a down-crossing removal prices the remaining roster loss, excluding the departing player', () => {
    const departing = player('Scholarly', ['Big Hack']);
    const teammate = player('Scholarly', ['Big Hack']);
    const roster = [departing, teammate, player('Scholarly', [])];
    const result = chemistryRemovalImpact(departing, roster);
    expect(result.crossing).toBe('L2->L1');
    expect(result.affectedTraitCount).toBe(1); // teammate only — departing's own trait leaves with him
    expect(result.teamLoss).toBeLessThan(0);
    expect(result.teamLoss).toBe(
      traitPotencyDollarDelta(teammate.iv, 'Big Hack', 'L2', 'L1'),
    );
    expect(result.slack).toBe(0);
  });

  it('a buffered removal costs nothing and reports the slack', () => {
    const departing = player('Scholarly', []);
    const roster = [departing, ...Array.from({ length: 3 }, () => player('Scholarly', ['Big Hack']))];
    const result = chemistryRemovalImpact(departing, roster); // 4 -> 3 stays L2
    expect(result.crossing).toBeNull();
    expect(result.teamLoss).toBe(0);
    expect(result.slack).toBe(1);
  });
});

describe('rosterChemistryProfile', () => {
  it('reports count, tier, distance, slack and trait supply per family', () => {
    const roster = [
      player('Scholarly', ['Big Hack']),
      player('Scholarly', []),
      player('Scholarly', ['Bunter']),
      player('Competitive', ['Cannon Arm']),
    ];
    const profile = rosterChemistryProfile(roster);
    const sch = profile.find((f) => f.family === 'SCH');
    const cmp = profile.find((f) => f.family === 'CMP');
    const cra = profile.find((f) => f.family === 'CRA');
    expect(sch).toMatchObject({ count: 3, tier: 'L2', distanceToNextTier: 4, slack: 0, traitCount: 2 });
    expect(cmp).toMatchObject({ count: 1, tier: 'L1', distanceToNextTier: 2, traitCount: 1 });
    expect(cra).toMatchObject({ count: 0, tier: 'L1', traitCount: 0 });
  });
});
