import { describe, expect, test } from 'vitest';

import {
  CAP_MODIFICATION_FRACTIONS,
  LUXURY_CAP_TABLES,
  type LuxuryCapRow,
  type TierKey,
} from '../../data/tierParams';
import { HISTORICAL_ARCHETYPES } from '../../data/historicalArchetypes';
import {
  luxuryTax,
  shiftLuxuryCaps,
  type BandPriorities,
  type ConstructionPlayer,
  type TeamCapIdentity,
} from '../leagueConstruction';
import {
  auctionMarginalTax,
  auctionMarginalTaxWithCaps,
  auctionSinglePlayerTaxWithShiftedCaps,
  auctionShiftedCaps,
  computeAuctionTeamProjectedTax,
  normalizeAuctionLuxuryCapsForLeagueSize,
} from '../auctionLuxuryTax';
import { archetypeToCapIdentity } from '../archetypeIdentity';

const lowBat: ConstructionPlayer['bat'] = {
  POW: 1,
  CON: 1,
  SPD: 1,
  FLD: 1,
  ARM: 1,
};

const zeroPriorities: BandPriorities = {
  Power: 0,
  Contact: 0,
  Speed: 0,
  Defense: 0,
  Rotation: 0,
  Bullpen: 0,
};

function hitter(id: string, ratings: Partial<ConstructionPlayer['bat']>): ConstructionPlayer {
  return {
    id,
    isPitcher: false,
    bat: { ...lowBat, ...ratings },
  };
}

function pitcher(
  id: string,
  role: NonNullable<ConstructionPlayer['role']>,
  ratings: ConstructionPlayer['pit'],
): ConstructionPlayer {
  return { id, isPitcher: true, role, bat: lowBat, pit: ratings };
}

function findCap(
  caps: LuxuryCapRow[],
  group: LuxuryCapRow['group'],
  stat: LuxuryCapRow['stat'],
): LuxuryCapRow {
  const row = caps.find((candidate) => candidate.group === group && candidate.stat === stat);
  if (!row) {
    throw new Error(`Missing cap row for ${group}/${stat}`);
  }
  return row;
}

describe('auctionLuxuryTax', () => {
  test('CAPFIX keeps the complete 20-team stock tax table byte-identical', () => {
    for (const tier of ['juiced', 'standard', 'nerfed'] as const) {
      const before = LUXURY_CAP_TABLES[tier];
      const serializedBefore = JSON.stringify(before);
      const after = normalizeAuctionLuxuryCapsForLeagueSize(before, 20);

      expect(after).toBe(before);
      expect(after).toEqual(before);
      expect(JSON.stringify(after)).toBe(serializedBefore);
    }
  });

  test('CAPFIX relaxes sub-20 thresholds smoothly and monotonically from one parameter', () => {
    const base = LUXURY_CAP_TABLES.standard;
    const referenceCap = findCap(base, 'hitters', 'POW').cap;
    const scales = Array.from({ length: 20 }, (_, index) => {
      const teams = index + 1;
      const caps = normalizeAuctionLuxuryCapsForLeagueSize(base, teams);
      return findCap(caps, 'hitters', 'POW').cap / referenceCap;
    });

    expect(scales[19]).toBe(1);
    for (let index = 1; index < scales.length; index += 1) {
      expect(scales[index]).toBeLessThan(scales[index - 1]);
    }
    expect(scales[3]).toBeCloseTo(5 ** 0.55, 12);
  });

  test('no identity uses base tier caps and matches ratified luxuryTax output', () => {
    const tier = 'standard';
    const roster = Array.from({ length: 8 }, (_, index) => hitter(`power-${index}`, { POW: 99 }));

    const caps = auctionShiftedCaps(undefined, tier);
    const actual = computeAuctionTeamProjectedTax(roster, null, undefined, tier);
    const expected = luxuryTax(roster, LUXURY_CAP_TABLES[tier], 'taxed').charged;

    expect(caps).toBe(LUXURY_CAP_TABLES[tier]);
    expect(actual).toBeGreaterThan(0);
    expect(actual).toBeCloseTo(expected, 8);
  });

  test('single-player fast path matches usage-aware Two Way settlement exactly', () => {
    const candidate: ConstructionPlayer = {
      id: 'two-way', isPitcher: true, role: 'SP', twoWayVariant: 'C',
      bat: { POW: 80, CON: 0, SPD: 0, FLD: 0, ARM: 99 },
      pit: { VEL: 70, JNK: 0, ACC: 0 },
    };
    const caps: LuxuryCapRow[] = [
      { group: 'hitters', stat: 'POW', topN: 1, cap: 0, penaltyCurve: 1, penaltyPer100: 100, minAdder: 0, ratingBasis: 'pitcher-role-usage-v1' },
      { group: 'hitters', stat: 'ARM', topN: 1, cap: 0, penaltyCurve: 1, penaltyPer100: 100, minAdder: 0, ratingBasis: 'pitcher-role-usage-v1' },
      { group: 'rotation', stat: 'POW', topN: 1, cap: 0, penaltyCurve: 1, penaltyPer100: 100, minAdder: 0, ratingBasis: 'pitcher-role-usage-v1' },
      { group: 'rotation', stat: 'VEL', topN: 1, cap: 0, penaltyCurve: 1, penaltyPer100: 100, minAdder: 0, ratingBasis: 'pitcher-role-usage-v1' },
    ];

    expect(auctionSinglePlayerTaxWithShiftedCaps(candidate, caps)).toBe(150);
    expect(auctionSinglePlayerTaxWithShiftedCaps(candidate, caps)).toBe(luxuryTax([candidate], caps, 'taxed').charged);
  });

  test('selected cap identity shifts the prioritized band cap through shiftLuxuryCaps', () => {
    const capIdentity: TeamCapIdentity = {
      bandPriorities: { ...zeroPriorities, Defense: 5 },
      increase: ['FLD'],
      decrease: [],
    };

    const base = LUXURY_CAP_TABLES.juiced;
    const shifted = auctionShiftedCaps(capIdentity, 'juiced');
    const expectedShifted = shiftLuxuryCaps(base, { increase: ['FLD'], decrease: [] });
    const baseFld = findCap(base, 'hitters', 'FLD');
    const shiftedFld = findCap(shifted, 'hitters', 'FLD');

    expect(shifted).toEqual(expectedShifted);
    expect(shifted).not.toBe(base);
    expect(shiftedFld.cap).not.toBe(baseFld.cap);
    expect(shiftedFld.cap).toBeCloseTo(
      baseFld.cap * (1 + CAP_MODIFICATION_FRACTIONS.FLD.FLD),
      10,
    );
  });

  test('identity fit taxes on-archetype roster strictly less than off-archetype roster', () => {
    const tier = 'standard';
    const capIdentity: TeamCapIdentity = {
      increase: ['POW'],
      decrease: ['CON'],
    };
    const onArchetypeRoster = Array.from({ length: 8 }, (_, index) => hitter(`pow-${index}`, { POW: 99 }));
    const offArchetypeRoster = Array.from({ length: 8 }, (_, index) => hitter(`con-${index}`, { CON: 99 }));

    const onTax = computeAuctionTeamProjectedTax(onArchetypeRoster, null, capIdentity, tier);
    const offTax = computeAuctionTeamProjectedTax(offArchetypeRoster, null, capIdentity, tier);

    expect(onTax).toBeGreaterThan(0);
    expect(offTax).toBeGreaterThan(onTax);
  });

  test('candidate variant returns the would-be tax after adding the candidate', () => {
    const tier = 'standard';
    const capIdentity: TeamCapIdentity = {
      increase: ['POW'],
      decrease: ['CON'],
    };
    const committedRoster = Array.from({ length: 7 }, (_, index) => hitter(`committed-${index}`, { POW: 95 }));
    const candidate = hitter('candidate', { POW: 99 });
    const caps = auctionShiftedCaps(capIdentity, tier);

    const withoutCandidate = computeAuctionTeamProjectedTax(committedRoster, null, capIdentity, tier);
    const withCandidate = computeAuctionTeamProjectedTax(committedRoster, candidate, capIdentity, tier);
    const expected = luxuryTax([...committedRoster, candidate], caps, 'taxed').charged;

    expect(withCandidate).toBeCloseTo(expected, 8);
    expect(withCandidate).toBeGreaterThan(withoutCandidate);
    expect(auctionMarginalTax(committedRoster, candidate, capIdentity, tier)).toBeCloseTo(
      withCandidate - withoutCandidate,
      8,
    );
  });

  test('the empty-roster fast path is exact for hitters and every pitching group across all identities and tiers', () => {
    const candidates: ConstructionPlayer[] = [
      hitter('fast-hitter', { POW: 99, CON: 87, SPD: 76, FLD: 65, ARM: 54 }),
      pitcher('fast-sp', 'SP', { VEL: 99, JNK: 88, ACC: 77 }),
      pitcher('fast-swing', 'SP/RP', { VEL: 91, JNK: 82, ACC: 73 }),
      pitcher('fast-rp', 'RP', { VEL: 96, JNK: 84, ACC: 72 }),
      pitcher('fast-cp', 'CP', { VEL: 97, JNK: 85, ACC: 74 }),
    ];
    const identities = [undefined, ...HISTORICAL_ARCHETYPES.map(archetypeToCapIdentity)];

    for (const tier of ['juiced', 'standard', 'nerfed'] as const) {
      for (const identity of identities) {
        const shifted = identity
          ? shiftLuxuryCaps(LUXURY_CAP_TABLES[tier], identity)
          : LUXURY_CAP_TABLES[tier];
        for (const candidate of candidates) {
          const expected = luxuryTax([candidate], shifted, 'taxed').charged;
          expect(auctionSinglePlayerTaxWithShiftedCaps(candidate, shifted)).toBeCloseTo(expected, 12);
          expect(auctionMarginalTaxWithCaps([], candidate, identity, LUXURY_CAP_TABLES[tier])).toBeCloseTo(expected, 12);
        }
      }
    }
  });
});

/**
 * TAXPRECISION (2026-07-09, spec-docs/contracts/CONTRACT_TAXPRECISION_2026-07-09.md): the auction
 * tax must read a capIdentity's exact `rawShift` fractions -- the same short-circuit `shiftLuxuryCaps`
 * (leagueConstruction.ts) and the production snake room already honor --
 * not the coarse `CAP_MODIFICATION_FRACTIONS` per-name table. Pre-fix, `auctionShiftedCapsWithBaseCaps`
 * rebuilt `{ increase, decrease }` from the capIdentity and dropped `rawShift` entirely, so every
 * archetype-selected team's auction-side caps were computed off the coarse table instead of its
 * ratified exact percentages.
 */
describe('TAXPRECISION -- the auction reads a capIdentity\'s exact rawShift (repro then fix)', () => {
  test('BUG REPRO: rangy-defenders (3 boosts) -- a roster over the coarse-shifted SPD cap but under the exact rawShift-shifted SPD cap owes zero tax', () => {
    const tier: TierKey = 'standard';
    const archetype = HISTORICAL_ARCHETYPES.find((candidate) => candidate.id === 'rangy-defenders');
    if (!archetype) throw new Error('Fixture archetype rangy-defenders not found');
    const capIdentity = archetypeToCapIdentity(archetype);

    // rangy-defenders boosts = ['SPD', 'ARM', 'FLD']; rawShift.SPD = 1 * ARCHETYPE_STAT_UNIT.SPD = 0.12.
    // The coarse table's own 'SPD' row is only 0.045455 -- a materially smaller shift.
    expect(capIdentity.rawShift?.SPD).toBeCloseTo(0.12, 10);
    expect(CAP_MODIFICATION_FRACTIONS.SPD.SPD).toBeCloseTo(0.045455, 6);

    const baseCap = LUXURY_CAP_TABLES[tier].find((row) => row.group === 'hitters' && row.stat === 'SPD');
    if (!baseCap) throw new Error('Missing hitters/SPD cap row');
    const coarseShiftedCap = baseCap.cap * (1 + CAP_MODIFICATION_FRACTIONS.SPD.SPD); // ~615.67
    const exactShiftedCap = baseCap.cap * (1 + 0.12); // 659.568

    // 8 hitters at SPD 80 -> top-8 SPD sum = 640: above the (wrong) coarse-shifted cap, below the
    // (correct) exact rawShift-shifted cap.
    const roster = Array.from({ length: 8 }, (_, index) => hitter(`spd-${index}`, { SPD: 80 }));
    expect(640).toBeGreaterThan(coarseShiftedCap);
    expect(640).toBeLessThanOrEqual(exactShiftedCap);

    const tax = computeAuctionTeamProjectedTax(roster, null, capIdentity, tier);
    expect(tax).toBe(0);
  });

  test('BUG REPRO: murderers-row (2 boosts, 1 nerf) -- the auction tax must equal the tax computed with the exact rawShift-shifted caps', () => {
    const tier: TierKey = 'standard';
    const archetype = HISTORICAL_ARCHETYPES.find((candidate) => candidate.id === 'murderers-row');
    if (!archetype) throw new Error('Fixture archetype murderers-row not found');
    const capIdentity = archetypeToCapIdentity(archetype);

    // rawShift differs from the coarse per-name table for every one of this archetype's mods.
    expect(capIdentity.rawShift?.POW).toBeCloseTo(0.075, 10);
    expect(CAP_MODIFICATION_FRACTIONS.POW.POW).toBeCloseTo(0.02, 6);

    const roster = Array.from({ length: 8 }, (_, index) => hitter(`pow-${index}`, { POW: 99 }));
    const baseCaps = LUXURY_CAP_TABLES[tier];
    const exactCaps = shiftLuxuryCaps(baseCaps, capIdentity); // uses rawShift (identityCapShift short-circuit)
    const expectedTax = luxuryTax(roster, exactCaps, 'taxed').charged;

    const actualTax = computeAuctionTeamProjectedTax(roster, null, capIdentity, tier);
    expect(actualTax).toBeCloseTo(expectedTax, 8);
  });

  test('coarse-only identity (no rawShift) stays byte-identical after the fix', () => {
    const tier: TierKey = 'juiced';
    const capIdentity: TeamCapIdentity = {
      bandPriorities: { ...zeroPriorities, Defense: 5 },
      increase: ['FLD'],
      decrease: ['POW'],
    };
    const base = LUXURY_CAP_TABLES[tier];
    const shifted = auctionShiftedCaps(capIdentity, tier);
    const fld = findCap(shifted, 'hitters', 'FLD');
    const pow = findCap(shifted, 'hitters', 'POW');
    const baseFld = findCap(base, 'hitters', 'FLD');
    const basePow = findCap(base, 'hitters', 'POW');

    // Hand-computed expected values from the coarse CAP_MODIFICATION_FRACTIONS table -- pinned so a
    // future change to shiftLuxuryCaps's delegation can't silently drift the coarse (rawShift-less)
    // path, which is the vast majority of hand-built (non-archetype) teams.
    expect(fld.cap).toBeCloseTo(baseFld.cap * (1 + CAP_MODIFICATION_FRACTIONS.FLD.FLD), 10);
    expect(pow.cap).toBeCloseTo(basePow.cap * (1 - CAP_MODIFICATION_FRACTIONS.POW.POW), 10);
  });

  test('24-archetype conformance sweep: the auction-path shifted caps equal shiftLuxuryCaps(rawShift) exactly, for every archetype and tier', () => {
    const tiers: TierKey[] = ['juiced', 'standard', 'nerfed'];
    let checked = 0;

    for (const archetype of HISTORICAL_ARCHETYPES) {
      const capIdentity = archetypeToCapIdentity(archetype);
      for (const tier of tiers) {
        const baseCaps = LUXURY_CAP_TABLES[tier];
        const auctionCaps = auctionShiftedCaps(capIdentity, tier);
        const canonicalCaps = shiftLuxuryCaps(baseCaps, capIdentity);
        expect(auctionCaps).toEqual(canonicalCaps);
        checked += 1;
      }
    }

    // 24 archetypes x 3 tiers -- fails loudly (not silently 0) if the catalog ever shrinks/grows
    // without this test being revisited.
    expect(checked).toBe(HISTORICAL_ARCHETYPES.length * tiers.length);
    expect(HISTORICAL_ARCHETYPES.length).toBe(24);
  });
});
