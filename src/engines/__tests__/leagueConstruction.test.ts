import { describe, expect, test } from 'vitest';

import {
  POOL_SURPLUS_MAX,
  SOLVENCY_RED_MARGIN,
  SOLVENCY_SEVERE_TAX_FRAC,
  TRADE_TOLERANCE_BAND,
} from '../../data/rosterEngineConstants';
import {
  CAP_MODIFICATION_FRACTIONS,
  LUXURY_CAP_TABLES,
  T3_DERIVATION_INPUTS,
  TIER_CAPS,
  type LuxuryCapRow,
  type ModStat,
  type TierKey,
} from '../../data/tierParams';
import {
  MOD_STAT_TO_LUX,
  type BandPriorities,
  type ConstructionPlayer,
  applyIdentitySelection,
  assignLuxuryTaxPitchingGroups,
  assessSolvency,
  buildSnakeOrder,
  cheapestFillCost,
  composeIdentity,
  computePoolTierCap,
  derivePickValueChart,
  identityCapShift,
  luxuryTax,
  pickMarginalTax,
  registerPool,
  shiftLuxuryCaps,
  validateTrade,
} from '../leagueConstruction';
import { auctionMarginalTaxWithCaps } from '../auctionLuxuryTax';
import { LEGAL_ROSTER } from '../../data/rosterConstruction';

const MOD_STATS = Object.keys(MOD_STAT_TO_LUX) as ModStat[];

const zeroPriorities: BandPriorities = {
  Power: 0,
  Contact: 0,
  Speed: 0,
  Defense: 0,
  Rotation: 0,
  Bullpen: 0,
};

const composeGoldens: Array<{ name: string; priorities: BandPriorities; increase: string[] }> = [
  { name: 'power_only', priorities: { ...zeroPriorities, Power: 5 }, increase: ['Great Bambino', 'Fence Swingers'] },
  { name: 'contact_only', priorities: { ...zeroPriorities, Contact: 5 }, increase: ['Bloop Hitters', 'Warning Track'] },
  { name: 'speed_only', priorities: { ...zeroPriorities, Speed: 5 }, increase: ['Run Like the Wind', 'Warning Track'] },
  // CONTRACT_TAXSWING_2026-07-10 Amendment 1: the 0.85 pitching retune moves Defense First ahead.
  { name: 'defense_only', priorities: { ...zeroPriorities, Defense: 5 }, increase: ['Defense First', 'Catch the Ball!'] },
  { name: 'rotation_only', priorities: { ...zeroPriorities, Rotation: 5 }, increase: ['JNK', 'Rotation Boost'] },
  { name: 'bullpen_only', priorities: { ...zeroPriorities, Bullpen: 5 }, increase: ['Junk Ballers', 'JNK'] },
  { name: 'power_rotation', priorities: { ...zeroPriorities, Power: 4, Rotation: 4 }, increase: ['POW', 'JNK'] },
  { name: 'defense_speed_contact', priorities: { ...zeroPriorities, Contact: 2, Speed: 3, Defense: 4 }, increase: ['Catch the Ball!', 'Run Like the Wind'] },
  { name: 'all_equal', priorities: { Power: 1, Contact: 1, Speed: 1, Defense: 1, Rotation: 1, Bullpen: 1 }, increase: ['Junk Ballers', 'Bloop Hitters'] },
  { name: 'pitching_equal', priorities: { ...zeroPriorities, Rotation: 3, Bullpen: 3 }, increase: ['Junk Ballers', 'JNK'] },
];

const shiftGoldens: Array<{ identity: { increase: string[]; decrease: string[] }; shift: Record<ModStat, number> }> = [
  {
    identity: { increase: ['POW', 'CON'], decrease: [] },
    shift: { POW: 0.02, CON: 0.045871559633027525, SPD: 0, FLD: 0, ARM: 0, RVEL: 0, RJNK: 0, RACC: 0, PVEL: 0, PJNK: 0, PACC: 0 },
  },
  {
    identity: { increase: ['Defense First', 'Bullpen Boost'], decrease: ['Call Your Shot'] },
    shift: {
      POW: -0.22, CON: -0.07339449541284404, SPD: 0.23636363636363636, FLD: 0.6102564102564103, ARM: 0.3008849557522124,
      // CONTRACT_TAXSWING_2026-07-10 Amendment 1: recomputed from the ruled 0.85 pitching fractions.
      RVEL: -0.17, RJNK: -0.130769, RACC: -0.08173, PVEL: -0.007692, PJNK: 0.073333, PACC: 0.109091,
    },
  },
  {
    identity: { increase: ['Fireballers', 'Junk Ballers'], decrease: ['Pinpoint Pitchers', 'We Got Gas'] },
    shift: {
      POW: 0.074, CON: 0.06788990825688074, SPD: 0.06727272727272728, FLD: 0.06324786324786325, ARM: 0.06548672566371681,
      RVEL: 0.02, RJNK: 0.45, RACC: -0.6346153846153846, PVEL: 0.15384615384615385, PJNK: 0.78, PACC: -0.696969696969697,
    },
  },
  {
    identity: { increase: ['Well Rounded', "Run n' Gun"], decrease: ['Big and Clumsy'] },
    shift: {
      POW: -0.07, CON: 0.009174311926605505, SPD: 0.07272727272727272, FLD: 0.3247863247863248, ARM: 0.20353982300884957,
      RVEL: 0.05, RJNK: 0.019230769230769232, RACC: 0.019230769230769232, PVEL: 0.07692307692307693, PJNK: 0.03333333333333333, PACC: 0.030303030303030304,
    },
  },
];

function directShift(identity: { increase: string[]; decrease: string[] }): Record<ModStat, number> {
  const net = Object.fromEntries(MOD_STATS.map((stat) => [stat, 0])) as Record<ModStat, number>;
  for (const name of identity.increase.filter((item) => item !== '--')) {
    for (const stat of MOD_STATS) net[stat] += CAP_MODIFICATION_FRACTIONS[name][stat];
  }
  for (const name of identity.decrease.filter((item) => item !== '--')) {
    for (const stat of MOD_STATS) net[stat] -= CAP_MODIFICATION_FRACTIONS[name][stat];
  }
  return net;
}

function expectShiftClose(actual: Record<ModStat, number>, expected: Record<ModStat, number>, precision = 5) {
  for (const stat of MOD_STATS) {
    expect(actual[stat], stat).toBeCloseTo(expected[stat], precision);
  }
}

function powTaxCaps(cap = 50, penaltyPer100 = 500): LuxuryCapRow[] {
  return [{
    group: 'hitters',
    stat: 'POW',
    topN: 1,
    cap,
    penaltyCurve: 1,
    penaltyPer100,
    minAdder: 0,
  }];
}

const noTaxCaps: LuxuryCapRow[] = powTaxCaps(1_000, 500);

function hitter(id: string, ratings: Partial<ConstructionPlayer['bat']>): ConstructionPlayer {
  return {
    id,
    isPitcher: false,
    bat: { POW: 50, CON: 50, SPD: 50, FLD: 50, ARM: 50, ...ratings },
  };
}

function pitcher(
  id: string,
  role: NonNullable<ConstructionPlayer['role']>,
  pit: Partial<NonNullable<ConstructionPlayer['pit']>>,
  bat: Partial<ConstructionPlayer['bat']> = {},
): ConstructionPlayer {
  return {
    id,
    isPitcher: true,
    role,
    bat: { POW: 20, CON: 20, SPD: 20, FLD: 50, ARM: 50, ...bat },
    pit: { VEL: 50, JNK: 50, ACC: 50, ...pit },
  };
}

const PITCHING_TAX_STATS = ['VEL', 'JNK', 'ACC'] as const;

function pitchingAssignmentCaps(bullpenCap = 0): LuxuryCapRow[] {
  return PITCHING_TAX_STATS.flatMap((stat) => [
    {
      group: 'rotation' as const,
      stat,
      topN: LEGAL_ROSTER.startingPitchers,
      cap: 0,
      penaltyCurve: 1,
      penaltyPer100: 100,
      minAdder: 0,
    },
    {
      group: 'bullpen' as const,
      stat,
      topN: LEGAL_ROSTER.startingPitchers,
      cap: bullpenCap,
      penaltyCurve: 1,
      penaltyPer100: 100,
      minAdder: 0,
    },
  ]);
}

function bindingOver(
  result: ReturnType<typeof luxuryTax>,
  group: 'rotation' | 'bullpen',
  stat: (typeof PITCHING_TAX_STATS)[number],
): number {
  return result.binding.find((row) => row.group === group && row.stat === stat)?.over ?? 0;
}

function groupTax(result: ReturnType<typeof luxuryTax>, group: 'rotation' | 'bullpen'): number {
  return result.binding
    .filter((row) => row.group === group)
    .reduce((sum, row) => sum + row.tax, 0);
}

function expectedTax(roster: ConstructionPlayer[], caps: LuxuryCapRow[]) {
  const hitters = roster.filter((player) => !player.isPitcher);
  const rotation = roster.filter((player) => player.isPitcher && (player.role === 'SP' || player.role === 'SP/RP'));
  const bullpen = roster.filter((player) => player.isPitcher && (player.role === 'RP' || player.role === 'CP' || player.role === 'SP/RP'));
  const binding: Array<{ group: string; stat: string; over: number; tax: number }> = [];
  let wouldBeTax = 0;
  for (const row of caps) {
    const group = row.group === 'hitters' ? hitters : row.group === 'rotation' ? rotation : bullpen;
    const vals = group
      .map((player) => (row.stat === 'VEL' || row.stat === 'JNK' || row.stat === 'ACC') ? player.pit?.[row.stat] ?? 0 : player.bat[row.stat])
      .sort((left, right) => right - left)
      .slice(0, row.topN);
    const over = vals.reduce((sum, val) => sum + val, 0) - Math.max(row.cap, 0);
    if (over > 0) {
      const tax = row.penaltyPer100 * (over / 100) ** row.penaltyCurve + row.minAdder;
      wouldBeTax += tax;
      binding.push({ group: row.group, stat: row.stat, over, tax });
    }
  }
  binding.sort((left, right) => right.tax - left.tax);
  return { charged: wouldBeTax, wouldBeTax, binding };
}

describe('leagueConstruction T8a pure engine', () => {
  test('composeIdentity matches Python compose_identity oracle for golden priority vectors', () => {
    // Goldens were obtained by importing scripts/analyze-pool.py, loading the workbook mods via
    // load_luxury(WORKBOOK), computing band_scores(...), and calling compose_identity(...) for
    // these exact vectors. This exercises the Python L1175-L1214 greedy/tiebreak behavior.
    for (const golden of composeGoldens) {
      const actual = composeIdentity(golden.priorities);
      expect(actual.increase, golden.name).toEqual(golden.increase);
      expect(actual.increase.length).toBeLessThanOrEqual(2);
      expect(actual.increase.every((name) => name in CAP_MODIFICATION_FRACTIONS)).toBe(true);
      expect(actual.decrease).toEqual([]);
    }
  });

  test('applyIdentitySelection validates vocabulary and neutral drops without a count cap', () => {
    expect(applyIdentitySelection({ increase: ['POW', '--'], decrease: ['--', 'CON'] })).toEqual({
      increase: ['POW'],
      decrease: ['CON'],
    });
    expect(applyIdentitySelection({ increase: ['POW', 'CON', 'SPD'], decrease: ['ARM', 'FLD', 'ACC'] })).toEqual({
      increase: ['POW', 'CON', 'SPD'],
      decrease: ['ARM', 'FLD', 'ACC'],
    });
    expect(() => applyIdentitySelection({ increase: ['Not A Mod'], decrease: [] })).toThrow(/Unknown identity modification/);
  });

  test('identityCapShift matches direct CAP_MODIFICATION_FRACTIONS math and Python identity_cap_shift goldens', () => {
    for (const golden of shiftGoldens) {
      const actual = identityCapShift(golden.identity);
      expect(actual).toEqual(directShift(golden.identity));
      expectShiftClose(actual, golden.shift);
    }
  });

  test('shiftLuxuryCaps returns new rows, applies routed cap fractions, and clamps below zero', () => {
    const caps = LUXURY_CAP_TABLES.juiced;
    const shifted = shiftLuxuryCaps(caps, { increase: ['POW'], decrease: [] });
    const pow = shifted.find((row) => row.group === 'hitters' && row.stat === 'POW');
    const sourcePow = caps.find((row) => row.group === 'hitters' && row.stat === 'POW');
    expect(shifted).not.toBe(caps);
    expect(pow).not.toBe(sourcePow);
    expect(pow?.cap).toBeCloseTo((sourcePow?.cap ?? 0) * 1.02, 10);

    const bullpenJnk = caps.find((row) => row.group === 'bullpen' && row.stat === 'JNK');
    const clamped = shiftLuxuryCaps([{ ...bullpenJnk!, cap: 100 }], { increase: [], decrease: ['JNK', 'Junk Ballers'] });
    expect(clamped[0].cap).toBe(0);
  });

  test('luxuryTax matches §5.3 formula for hitter overages and advisory/off charge semantics', () => {
    const roster = Array.from({ length: 8 }, (_, index) => hitter(`h${index}`, { POW: 95, CON: 90, SPD: 85, FLD: 84, ARM: 83 }));
    const caps = LUXURY_CAP_TABLES.juiced.filter((row) => row.group === 'hitters');
    const actual = luxuryTax(roster, caps, 'taxed');
    const expected = expectedTax(roster, caps);

    expect(actual.wouldBeTax).toBeCloseTo(expected.wouldBeTax, 8);
    expect(actual.charged).toBeCloseTo(expected.charged, 8);
    expect(actual.binding).toEqual(expected.binding);
    expect(luxuryTax(roster, caps, 'advisory').charged).toBe(0);
    expect(luxuryTax(roster, caps, 'advisory').wouldBeTax).toBeGreaterThan(0);
    expect(luxuryTax(roster, caps, 'off').charged).toBe(0);
    expect(luxuryTax(roster, caps, 'off').wouldBeTax).toBeGreaterThan(0);
  });

  test('luxuryTax matches §5.3 formula for pitcher batting and rotation concentration rows', () => {
    const roster = [
      pitcher('sp1', 'SP', { VEL: 95, JNK: 85, ACC: 80 }, { POW: 40, CON: 35, SPD: 45, FLD: 80 }),
      pitcher('sp2', 'SP', { VEL: 92, JNK: 80, ACC: 78 }, { POW: 35, CON: 34, SPD: 42, FLD: 78 }),
      pitcher('sp3', 'SP', { VEL: 90, JNK: 78, ACC: 76 }, { POW: 33, CON: 32, SPD: 41, FLD: 76 }),
      pitcher('sp4', 'SP', { VEL: 88, JNK: 76, ACC: 74 }, { POW: 31, CON: 31, SPD: 40, FLD: 74 }),
    ];
    const caps = LUXURY_CAP_TABLES.juiced.filter((row) => row.group === 'rotation');
    const actual = luxuryTax(roster, caps, 'taxed');
    const expected = expectedTax(roster, caps);

    expect(actual.wouldBeTax).toBeCloseTo(expected.wouldBeTax, 8);
    expect(actual.binding).toEqual(expected.binding);
    expect(actual.binding.some((row) => row.group === 'rotation' && row.stat === 'VEL' && row.over > 0)).toBe(true);
    expect(actual.binding.some((row) => row.group === 'rotation' && row.stat === 'FLD' && row.over > 0)).toBe(true);
  });

  describe('TAXSWING named single-assignment scenarios', () => {
    const pureStarters = [
      pitcher('sp-a', 'SP', { VEL: 40, JNK: 41, ACC: 42 }),
      pitcher('sp-b', 'SP', { VEL: 50, JNK: 51, ACC: 52 }),
      pitcher('sp-c', 'SP', { VEL: 60, JNK: 61, ACC: 62 }),
      pitcher('sp-d', 'SP', { VEL: 70, JNK: 71, ACC: 72 }),
    ];
    const eliteSwing = pitcher('swing-elite', 'SP/RP', { VEL: 99, JNK: 99, ACC: 99 });

    test('A. 4 SP + elite SP/RP taxes the four pure starters in rotation and the swing arm only in the bullpen', () => {
      const roster = [...pureStarters, eliteSwing];
      const assignment = assignLuxuryTaxPitchingGroups(roster);
      const actual = luxuryTax(roster, pitchingAssignmentCaps(), 'taxed');

      expect(assignment.rotation.map((player) => player.id)).toEqual(['sp-a', 'sp-b', 'sp-c', 'sp-d']);
      expect(assignment.bullpen.map((player) => player.id)).toEqual(['swing-elite']);
      expect(bindingOver(actual, 'rotation', 'VEL')).toBe(40 + 50 + 60 + 70);
      expect(bindingOver(actual, 'rotation', 'JNK')).toBe(41 + 51 + 61 + 71);
      expect(bindingOver(actual, 'rotation', 'ACC')).toBe(42 + 52 + 62 + 72);
      for (const stat of PITCHING_TAX_STATS) {
        expect(bindingOver(actual, 'bullpen', stat), stat).toBe(99);
      }
    });

    test('B. 3 SP + elite SP/RP promotes the swing arm into rotation and excludes it from bullpen', () => {
      const roster = [...pureStarters.slice(0, 3), eliteSwing];
      const assignment = assignLuxuryTaxPitchingGroups(roster);
      const actual = luxuryTax(roster, pitchingAssignmentCaps(), 'taxed');

      expect(assignment.rotation.map((player) => player.id)).toEqual(['sp-a', 'sp-b', 'sp-c', 'swing-elite']);
      expect(assignment.bullpen).toEqual([]);
      expect(bindingOver(actual, 'rotation', 'VEL')).toBe(40 + 50 + 60 + 99);
      expect(bindingOver(actual, 'rotation', 'JNK')).toBe(41 + 51 + 61 + 99);
      expect(bindingOver(actual, 'rotation', 'ACC')).toBe(42 + 52 + 62 + 99);
      for (const stat of PITCHING_TAX_STATS) {
        expect(bindingOver(actual, 'bullpen', stat), stat).toBe(0);
      }
    });

    test('C. adding a fourth pure SP reassigns the swing arm to the pen and preserves a negative signed auction marginal', () => {
      const rosterB = [...pureStarters.slice(0, 3), eliteSwing];
      const fourthPureStarter = pitcher('sp-new-fourth', 'SP', { VEL: 10, JNK: 10, ACC: 10 });
      const caps = pitchingAssignmentCaps(10_000);
      const before = luxuryTax(rosterB, caps, 'taxed');
      const after = luxuryTax([...rosterB, fourthPureStarter], caps, 'taxed');
      const afterAssignment = assignLuxuryTaxPitchingGroups([...rosterB, fourthPureStarter]);
      const expectedMarginal = after.charged - before.charged;
      const auctionMarginal = auctionMarginalTaxWithCaps(
        rosterB,
        fourthPureStarter,
        undefined,
        caps,
      );

      expect(afterAssignment.rotation.map((player) => player.id)).toEqual([
        'sp-a',
        'sp-b',
        'sp-c',
        'sp-new-fourth',
      ]);
      expect(afterAssignment.bullpen.map((player) => player.id)).toEqual(['swing-elite']);
      expect(groupTax(after, 'rotation')).toBeLessThan(groupTax(before, 'rotation'));
      expect(expectedMarginal).toBeLessThan(0);
      expect(auctionMarginal).toBe(expectedMarginal);
      expect(auctionMarginal).toBeLessThan(0);
    });

    test('D. an all-swing staff promotes only the best four mean-rated arms and taxes the remainder in the bullpen', () => {
      const roster = [
        pitcher('swing-90', 'SP/RP', { VEL: 90, JNK: 90, ACC: 90 }),
        pitcher('swing-80', 'SP/RP', { VEL: 80, JNK: 80, ACC: 80 }),
        pitcher('swing-70', 'SP/RP', { VEL: 70, JNK: 70, ACC: 70 }),
        pitcher('swing-60', 'SP/RP', { VEL: 60, JNK: 60, ACC: 60 }),
        pitcher('swing-50', 'SP/RP', { VEL: 50, JNK: 50, ACC: 50 }),
      ];
      const assignment = assignLuxuryTaxPitchingGroups(roster);
      const actual = luxuryTax(roster, pitchingAssignmentCaps(), 'taxed');

      expect(assignment.rotation.map((player) => player.id)).toEqual([
        'swing-90',
        'swing-80',
        'swing-70',
        'swing-60',
      ]);
      expect(assignment.bullpen.map((player) => player.id)).toEqual(['swing-50']);
      for (const stat of PITCHING_TAX_STATS) {
        expect(bindingOver(actual, 'rotation', stat), stat).toBe(90 + 80 + 70 + 60);
        expect(bindingOver(actual, 'bullpen', stat), stat).toBe(50);
      }
    });

    test('E. equal-mean swing promotions break ties by player id ascending, independent of roster order', () => {
      const equalMeanArms = [
        pitcher('z-last', 'SP/RP', { VEL: 100, JNK: 40, ACC: 40 }),
        pitcher('d-fourth', 'SP/RP', { VEL: 60, JNK: 60, ACC: 60 }),
        pitcher('b-second', 'SP/RP', { VEL: 80, JNK: 50, ACC: 50 }),
        pitcher('a-first', 'SP/RP', { VEL: 90, JNK: 45, ACC: 45 }),
        pitcher('c-third', 'SP/RP', { VEL: 70, JNK: 55, ACC: 55 }),
      ];
      const caps = pitchingAssignmentCaps();
      const assignment = assignLuxuryTaxPitchingGroups(equalMeanArms);
      const actual = luxuryTax(equalMeanArms, caps, 'taxed');
      const reversed = luxuryTax([...equalMeanArms].reverse(), caps, 'taxed');

      expect(assignment.rotation.map((player) => player.id)).toEqual([
        'a-first',
        'b-second',
        'c-third',
        'd-fourth',
      ]);
      expect(assignment.bullpen.map((player) => player.id)).toEqual(['z-last']);
      expect(actual).toEqual(reversed);
      expect(bindingOver(actual, 'rotation', 'VEL')).toBe(90 + 80 + 70 + 60);
      expect(bindingOver(actual, 'rotation', 'JNK')).toBe(45 + 50 + 55 + 60);
      expect(bindingOver(actual, 'rotation', 'ACC')).toBe(45 + 50 + 55 + 60);
      expect(bindingOver(actual, 'bullpen', 'VEL')).toBe(100);
      expect(bindingOver(actual, 'bullpen', 'JNK')).toBe(40);
      expect(bindingOver(actual, 'bullpen', 'ACC')).toBe(40);
    });
  });

  test('derivePickValueChart sorts descending, preserves length, and reflects steeper juiced-shaped pools', () => {
    const chart = derivePickValueChart([20, 100, 50, 50, 5]);
    expect(chart).toEqual([
      { pick: 1, value: 100 },
      { pick: 2, value: 50 },
      { pick: 3, value: 50 },
      { pick: 4, value: 20 },
      { pick: 5, value: 5 },
    ]);
    expect(chart).toHaveLength(5);
    for (let i = 1; i < chart.length; i += 1) {
      expect(chart[i].value).toBeLessThanOrEqual(chart[i - 1].value);
    }

    const juiced = derivePickValueChart([240, 180, 130, 95, 70]);
    const nerfed = derivePickValueChart([120, 105, 95, 88, 82]);
    expect((juiced[0].value - juiced[4].value) / juiced[0].value).toBeGreaterThan((nerfed[0].value - nerfed[4].value) / nerfed[0].value);
  });

  test('validateTrade applies the §7.3 15% advisory tolerance and favored side', () => {
    const chart = derivePickValueChart([100, 90, 80, 70, 60]);
    const balanced = validateTrade([{ pick: 1 }], [{ pick: 2 }], chart);
    expect(balanced.imbalancePct).toBeCloseTo(0.10, 10);
    expect(balanced.imbalancePct).toBeLessThanOrEqual(TRADE_TOLERANCE_BAND);
    expect(balanced).toMatchObject({ balanced: true, favored: 'none', overridable: true });

    const imbalanced = validateTrade([{ pick: 1 }], [{ pick: 4 }], chart);
    expect(imbalanced.imbalancePct).toBeCloseTo(0.30, 10);
    expect(imbalanced).toMatchObject({ balanced: false, favored: 'A', overridable: true });

    const sideB = validateTrade([{ pick: 5 }], [{ pick: 2 }], chart);
    expect(sideB).toMatchObject({ balanced: false, favored: 'B', overridable: true });
  });
});

describe('T8d-1 snake draft and solvency guardrail', () => {
  test('buildSnakeOrder mirrors the farm draft snake pattern with global picks', () => {
    expect(buildSnakeOrder(['A', 'B', 'C'], 2)).toEqual([
      { round: 1, pick: 1, teamId: 'A' },
      { round: 1, pick: 2, teamId: 'B' },
      { round: 1, pick: 3, teamId: 'C' },
      { round: 2, pick: 4, teamId: 'C' },
      { round: 2, pick: 5, teamId: 'B' },
      { round: 2, pick: 6, teamId: 'A' },
    ]);
  });

  test('buildSnakeOrder handles a single team and zero rounds', () => {
    expect(buildSnakeOrder(['Solo'], 3)).toEqual([
      { round: 1, pick: 1, teamId: 'Solo' },
      { round: 2, pick: 2, teamId: 'Solo' },
      { round: 3, pick: 3, teamId: 'Solo' },
    ]);
    expect(buildSnakeOrder(['A', 'B'], 0)).toEqual([]);
  });

  test('cheapestFillCost returns the pool minimum and Infinity for an empty pool', () => {
    expect(cheapestFillCost([42, 12, 99, 12])).toBe(12);
    expect(cheapestFillCost([])).toBe(Number.POSITIVE_INFINITY);
  });

  test('assessSolvency returns GREEN for a cheap no-tax pick with ample budget', () => {
    const assessment = assessSolvency({
      committedRoster: [],
      committedSalaries: 0,
      candidate: hitter('cheap', { POW: 55 }),
      candidateSalary: 100,
      caps: noTaxCaps,
      mode: 'taxed',
      tierCap: 1_000,
      rosterSize: 2,
      remainingPoolSalaries: [100],
    });

    expect(assessment.signal).toBe('GREEN');
    expect(assessment.confirmable).toBe(true);
    expect(assessment.slotsRemaining).toBe(1);
    expect(assessment.cheapestFillCost).toBe(100);
    expect(assessment.reserve).toBe(100);
    expect(assessment.pickMarginalTax).toBe(0);
    expect(assessment.totalAfterPick).toBe(100);
    expect(assessment.slack).toBe(800);
  });

  test('assessSolvency returns YELLOW in taxed mode when tax triggers but solvency is safe', () => {
    const candidate = hitter('taxed-yellow', { POW: 60 });
    const caps = powTaxCaps();
    const assessment = assessSolvency({
      committedRoster: [],
      committedSalaries: 0,
      candidate,
      candidateSalary: 100,
      caps,
      mode: 'taxed',
      tierCap: 1_000,
      rosterSize: 2,
      remainingPoolSalaries: [100],
    });

    expect(pickMarginalTax([], candidate, caps, 'taxed')).toBeCloseTo(50, 10);
    expect(assessment.signal).toBe('YELLOW');
    expect(assessment.confirmable).toBe(true);
    expect(assessment.pickMarginalTax).toBeCloseTo(50, 10);
    expect(assessment.wouldBePickMarginalTax).toBeCloseTo(50, 10);
    expect(assessment.slack).toBeGreaterThan(SOLVENCY_RED_MARGIN * assessment.remainingBudget);
    expect(assessment.wouldBePickMarginalTax).toBeLessThan(SOLVENCY_SEVERE_TAX_FRAC * assessment.remainingBudget);
  });

  test('assessSolvency returns RED when slack is within the red margin of remaining budget', () => {
    const assessment = assessSolvency({
      committedRoster: [],
      committedSalaries: 0,
      candidate: hitter('near-line', { POW: 55 }),
      candidateSalary: 850,
      caps: noTaxCaps,
      mode: 'taxed',
      tierCap: 1_000,
      rosterSize: 2,
      remainingPoolSalaries: [100],
    });

    expect(assessment.signal).toBe('RED');
    expect(assessment.confirmable).toBe(true);
    expect(assessment.slack).toBe(50);
    expect(assessment.slack).toBeLessThanOrEqual(SOLVENCY_RED_MARGIN * assessment.remainingBudget);
    expect(assessment.wouldBePickMarginalTax).toBe(0);
  });

  test('assessSolvency returns RED when marginal would-be tax is severe', () => {
    const assessment = assessSolvency({
      committedRoster: [],
      committedSalaries: 0,
      candidate: hitter('severe-tax', { POW: 90 }),
      candidateSalary: 100,
      caps: powTaxCaps(),
      mode: 'taxed',
      tierCap: 1_000,
      rosterSize: 2,
      remainingPoolSalaries: [100],
    });

    expect(assessment.signal).toBe('RED');
    expect(assessment.confirmable).toBe(true);
    expect(assessment.wouldBePickMarginalTax).toBeCloseTo(200, 10);
    expect(assessment.wouldBePickMarginalTax).toBeGreaterThanOrEqual(SOLVENCY_SEVERE_TAX_FRAC * assessment.remainingBudget);
    expect(assessment.slack).toBeGreaterThan(SOLVENCY_RED_MARGIN * assessment.remainingBudget);
  });

  test('assessSolvency BLOCKS strict overspend beyond budget minus reserve', () => {
    const assessment = assessSolvency({
      committedRoster: [],
      committedSalaries: 0,
      candidate: hitter('overspend', { POW: 55 }),
      candidateSalary: 901,
      caps: noTaxCaps,
      mode: 'taxed',
      tierCap: 1_000,
      rosterSize: 2,
      remainingPoolSalaries: [100],
    });

    expect(assessment.signal).toBe('BLOCKED');
    expect(assessment.confirmable).toBe(false);
    expect(assessment.totalAfterPick).toBe(901);
    expect(assessment.slack).toBe(-1);
  });

  test('assessSolvency BLOCKS infeasible fill when slots remain and the remaining pool is empty', () => {
    const assessment = assessSolvency({
      committedRoster: [],
      committedSalaries: 0,
      candidate: hitter('no-fill', { POW: 55 }),
      candidateSalary: 100,
      caps: noTaxCaps,
      mode: 'taxed',
      tierCap: 1_000,
      rosterSize: 2,
      remainingPoolSalaries: [],
    });

    expect(assessment.signal).toBe('BLOCKED');
    expect(assessment.confirmable).toBe(false);
    expect(assessment.cheapestFillCost).toBe(Number.POSITIVE_INFINITY);
    expect(assessment.reserve).toBe(Number.POSITIVE_INFINITY);
    expect(assessment.slack).toBe(Number.NEGATIVE_INFINITY);
  });

  test('assessSolvency is mode-aware: taxed drain can block, advisory warns, off has no tax signal', () => {
    const candidate = hitter('mode-ruling', { POW: 80 });
    const input = {
      committedRoster: [],
      committedSalaries: 0,
      candidate,
      candidateSalary: 890,
      caps: powTaxCaps(),
      tierCap: 1_000,
      rosterSize: 1,
      remainingPoolSalaries: [],
    };

    const taxed = assessSolvency({ ...input, mode: 'taxed' });
    const advisory = assessSolvency({ ...input, mode: 'advisory' });
    const off = assessSolvency({ ...input, mode: 'off' });

    expect(taxed.signal).toBe('BLOCKED');
    expect(taxed.confirmable).toBe(false);
    expect(taxed.pickMarginalTax).toBeCloseTo(150, 10);
    expect(taxed.totalAfterPick).toBeCloseTo(1_040, 10);
    expect(taxed.slack).toBeCloseTo(-40, 10);

    expect(advisory.signal).toBe('YELLOW');
    expect(advisory.confirmable).toBe(true);
    expect(advisory.pickMarginalTax).toBe(0);
    expect(advisory.wouldBePickMarginalTax).toBeCloseTo(150, 10);
    expect(advisory.totalAfterPick).toBe(890);
    expect(advisory.slack).toBe(110);

    expect(off.signal).toBe('GREEN');
    expect(off.confirmable).toBe(true);
    expect(off.pickMarginalTax).toBe(0);
    expect(off.wouldBePickMarginalTax).toBeCloseTo(150, 10);
    expect(off.signal).not.toBe('YELLOW');
    expect(off.totalAfterPick).toBe(890);
    expect(off.slack).toBe(110);
  });
});

describe('registerPool T8b assembler', () => {
  const tiers: TierKey[] = ['juiced', 'standard', 'nerfed'];
  const players = [
    { id: 'mid', iv: 50_000, salary: 51_000 },
    { id: 'top', iv: 90_000, salary: 91_000 },
    { id: 'low', iv: 10_000, salary: 11_000 },
  ];

  test('assembles a pool-relative tier cap (Option B) + tier-fixed luxury caps for each tier', () => {
    const ivs = players.map((player) => player.iv);
    for (const tier of tiers) {
      const pool = registerPool({
        leagueId: `league-${tier}`,
        tier,
        balanceMode: 'taxed',
        totalSlots: 22,
        players,
      });

      // Option B: the cap is derived from the ACTUAL pool's IVs, scaled by tier — not the static table.
      expect(pool.tierCap).toBe(computePoolTierCap(ivs, tier));
      expect(pool.luxuryCaps).toBe(LUXURY_CAP_TABLES[tier]); // luxury caps stay tier-fixed
      expect(pool.tier).toBe(tier);
    }
    // The tier is the multiplier: juiced > standard > nerfed for the same pool.
    expect(computePoolTierCap(ivs, 'juiced')).toBeGreaterThan(computePoolTierCap(ivs, 'standard'));
    expect(computePoolTierCap(ivs, 'standard')).toBeGreaterThan(computePoolTierCap(ivs, 'nerfed'));
  });

  test('stamps an explicit salary cap as the team draft budget without changing luxury caps', () => {
    const pool = registerPool({
      leagueId: 'league-hard-cap',
      tier: 'standard',
      balanceMode: 'taxed',
      totalSlots: 22,
      salaryCap: 777_777,
      players,
    });

    expect(pool.tierCap).toBe(777_777);
    expect(pool.tierCap).not.toBe(computePoolTierCap(players.map((player) => player.iv), 'standard'));
    expect(pool.luxuryCaps).toBe(LUXURY_CAP_TABLES.standard);
  });

  test('pool-relative cap tracks pool talent: removing the top player lowers the cap', () => {
    const full = computePoolTierCap(players.map((player) => player.iv), 'standard');
    const lighter = computePoolTierCap(
      players.filter((player) => player.id !== 'top').map((player) => player.iv),
      'standard',
    );
    expect(lighter).toBeLessThan(full);
  });

  test('pool-relative cap reproduces the published TIER_CAPS within ~0.1% on the stock-mean pool', () => {
    const stockMeanPool = Array.from({ length: 12 }, () => T3_DERIVATION_INPUTS.poolMeanIV);
    for (const tier of tiers) {
      const cap = computePoolTierCap(stockMeanPool, tier);
      const drift = Math.abs(cap - TIER_CAPS[tier].tierCap) / TIER_CAPS[tier].tierCap;
      expect(drift).toBeLessThan(0.01);
    }
  });

  test('derives pick value chart from player IV sorted descending', () => {
    const pool = registerPool({
      leagueId: 'league-chart',
      tier: 'juiced',
      balanceMode: 'taxed',
      totalSlots: 22,
      players,
    });

    expect(pool.pickValueChart).toEqual([
      { pick: 1, value: 90_000 },
      { pick: 2, value: 50_000 },
      { pick: 3, value: 10_000 },
    ]);
  });

  test('passes through leagueId, balanceMode, totalSlots, and players', () => {
    const pool = registerPool({
      leagueId: 'league-pass',
      tier: 'standard',
      balanceMode: 'advisory',
      totalSlots: 44,
      players,
    });

    expect(pool.leagueId).toBe('league-pass');
    expect(pool.balanceMode).toBe('advisory');
    expect(pool.totalSlots).toBe(44);
    expect(pool.players).toBe(players);
  });

  test('poolSurplusWarning is true iff players exceed total slots times surplus max', () => {
    const totalSlots = 10;
    const boundaryCount = Math.floor(totalSlots * POOL_SURPLUS_MAX);
    const boundaryPlayers = Array.from({ length: boundaryCount }, (_, index) => ({
      id: `boundary-${index}`,
      iv: index,
      salary: index,
    }));
    const surplusPlayers = [
      ...boundaryPlayers,
      { id: 'surplus', iv: 1, salary: 1 },
    ];

    expect(registerPool({
      leagueId: 'league-boundary',
      tier: 'nerfed',
      balanceMode: 'off',
      totalSlots,
      players: boundaryPlayers,
    }).poolSurplusWarning).toBe(false);

    expect(registerPool({
      leagueId: 'league-surplus',
      tier: 'nerfed',
      balanceMode: 'off',
      totalSlots,
      players: surplusPlayers,
    }).poolSurplusWarning).toBe(true);
  });

  test('is pure for the same input', () => {
    const cfg = {
      leagueId: 'league-pure',
      tier: 'juiced' as const,
      balanceMode: 'taxed' as const,
      totalSlots: 22,
      players,
    };

    expect(registerPool(cfg)).toEqual(registerPool(cfg));
  });
});
