import { describe, expect, test } from 'vitest';

import type { SimPlayer } from '../archetypeBalanceSimulator';
import {
  SIZING_TUNING,
  archetypeCompletionOutlook,
  poolCompletionOutlook,
  poolDemandModel,
  poolSizingTable,
  recommendedShillCount,
} from '../auctionPoolSizing';
import { analyzePoolFeasibility } from '../poolFeasibility';
import { HISTORICAL_ARCHETYPES } from '../../data/historicalArchetypes';

// ---------------------------------------------------------------------------------------------
// Layer 1 — the demand model.
// ---------------------------------------------------------------------------------------------

describe('poolDemandModel', () => {
  test('reproduces the C1B 8-team feasibility floor (~202 bodies) and the identity-roomy target', () => {
    const model = poolDemandModel(8, 0);
    expect(model.baseSlots).toBe(176);
    // ceil(8×8×1.2) pitchers + ceil(8×13×1.2) hitters = 77 + 125 = 202 — the queued C1B evidence.
    expect(model.feasibilityFloor).toBe(202);
    expect(model.expectedShillWins).toBe(0);
    // Identity headroom dominates the floor at 1.5×.
    expect(model.targetSize).toBe(Math.ceil(176 * SIZING_TUNING.identityHeadroom));
  });

  test('shills add expected WINS, never 22-seat phantom demand (the end-checkpoint)', () => {
    const withShills = poolDemandModel(8, 2);
    const without = poolDemandModel(8, 0);
    expect(withShills.expectedShillWins).toBe(2 * SIZING_TUNING.winsPerShill);
    expect(withShills.targetSize).toBe(without.targetSize + 2 * SIZING_TUNING.winsPerShill);
    expect(withShills.targetSize).toBeLessThan(without.targetSize + 2 * 22);
  });

  test('class floors carry the catcher-coverage doubling and are monotone in team count', () => {
    const model = poolDemandModel(8, 0);
    const catcher = model.classFloors.find((c) => c.key === 'primary-C')!;
    const shortstop = model.classFloors.find((c) => c.key === 'primary-SS')!;
    const closer = model.classFloors.find((c) => c.key === 'closer-arms')!;
    expect(catcher.demand).toBe(Math.ceil(8 * 2 * SIZING_TUNING.feasibilityHeadroom));
    expect(shortstop.demand).toBe(Math.ceil(8 * 1 * SIZING_TUNING.feasibilityHeadroom));
    expect(closer.demand).toBe(Math.ceil(8 * 1 * SIZING_TUNING.feasibilityHeadroom));
    const bigger = poolDemandModel(10, 0);
    expect(bigger.feasibilityFloor).toBeGreaterThan(model.feasibilityFloor);
  });

  test('the sizing table emits one row per (teams, shills) pair', () => {
    const table = poolSizingTable([4, 8], [0, 2]);
    expect(table).toHaveLength(4);
    expect(table.map((row) => [row.teams, row.shills])).toEqual([
      [4, 0], [4, 2], [8, 0], [8, 2],
    ]);
    for (const row of table) {
      expect(row.targetSize).toBeGreaterThanOrEqual(row.feasibilityFloor + row.expectedShillWins);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// Layer 2 — the completion outlook.
// ---------------------------------------------------------------------------------------------

function simPlayer(
  id: string,
  shape: Partial<SimPlayer> & { position: string; isPitcher: boolean },
  ratings = 60,
): SimPlayer {
  return {
    id,
    iv: 10_000,
    salary: 10_000,
    bat: { POW: ratings, CON: ratings, SPD: ratings, FLD: ratings, ARM: ratings },
    pit: shape.isPitcher ? { VEL: ratings, JNK: ratings, ACC: ratings } : undefined,
    ...shape,
  } as SimPlayer;
}

/** A generously stocked, position-complete pool for `teams` teams. */
function richPool(teams: number): SimPlayer[] {
  const pool: SimPlayer[] = [];
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  let n = 0;
  for (let copy = 0; copy < teams * 2; copy += 1) {
    for (const pos of positions) {
      pool.push(simPlayer(`h-${n += 1}`, { position: pos, isPitcher: false }, 40 + ((n * 7) % 50)));
    }
    // Backup-catcher depth: coverage supply must exceed the 2-per-team demand for a pool to be
    // genuinely "generous" (exact-supply coverage is a real market coin flip, by design).
    pool.push(
      simPlayer(`bc-${n += 1}`, { position: '1B', isPitcher: false, secondaryPosition: 'C' }, 40 + ((n * 7) % 50)),
    );
    pool.push(simPlayer(`sp-${n += 1}`, { position: 'P', isPitcher: true, role: 'SP' }, 40 + ((n * 7) % 50)));
    pool.push(simPlayer(`sp2-${n += 1}`, { position: 'P', isPitcher: true, role: 'SP' }, 40 + ((n * 7) % 50)));
    pool.push(simPlayer(`swing-${n += 1}`, { position: 'P', isPitcher: true, role: 'SP/RP' }, 40 + ((n * 7) % 50)));
    pool.push(simPlayer(`rp-${n += 1}`, { position: 'P', isPitcher: true, role: 'RP' }, 40 + ((n * 7) % 50)));
    pool.push(simPlayer(`cp-${n += 1}`, { position: 'P', isPitcher: true, role: 'CP' }, 40 + ((n * 7) % 50)));
  }
  return pool;
}

describe('archetypeCompletionOutlook', () => {
  const teams = 4;
  const pool = richPool(teams);
  const report = analyzePoolFeasibility(pool, [...HISTORICAL_ARCHETYPES], 'standard');

  test('a generously stocked pool clears legal completion for every archetype', () => {
    const outlooks = poolCompletionOutlook(pool, report, teams, 0);
    expect(outlooks).toHaveLength(24);
    for (const outlook of outlooks) {
      expect(outlook.pLegalCompletion).toBeGreaterThan(0.9);
      expect(outlook.pIdentityCompletion).toBeGreaterThan(0);
      expect(outlook.pIdentityCompletion).toBeLessThanOrEqual(outlook.pLegalCompletion);
    }
  });

  test('a catcher-starved pool collapses legal completion and names the binding class', () => {
    const starved = pool.filter((p) => p.position !== 'C');
    const starvedReport = analyzePoolFeasibility(starved, [...HISTORICAL_ARCHETYPES], 'standard');
    const outlook = archetypeCompletionOutlook(starved, starvedReport.results[0], teams, 0);
    expect(outlook.pLegalCompletion).toBeLessThan(0.05);
    expect(outlook.bindingClass).toMatch(/C|catcher/);
  });

  test('shill pressure lowers every probability, monotonically', () => {
    const calm = poolCompletionOutlook(pool, report, teams, 0);
    const pressured = poolCompletionOutlook(pool, report, teams, 3);
    for (let i = 0; i < calm.length; i += 1) {
      expect(pressured[i].pLegalCompletion).toBeLessThanOrEqual(calm[i].pLegalCompletion + 1e-12);
      expect(pressured[i].pIdentityCompletion).toBeLessThanOrEqual(calm[i].pIdentityCompletion + 1e-12);
    }
  });

  test('deterministic: identical inputs, identical outlooks', () => {
    const a = poolCompletionOutlook(pool, report, teams, 2);
    const b = poolCompletionOutlook(pool, report, teams, 2);
    expect(a).toEqual(b);
  });
});

// ---------------------------------------------------------------------------------------------
// Layer 3 — the shill recommendation.
// ---------------------------------------------------------------------------------------------

describe('recommendedShillCount', () => {
  test('an 8-team league defaults to the tuned table value at full pressure', () => {
    const rec = recommendedShillCount(0, 8);
    expect(rec.count).toBe(SIZING_TUNING.shillRecommendationByLeagueSize[8]);
    expect(rec.rationale).toContain('8-team');
  });

  test('a fully-human league halves the pressure need', () => {
    const allHuman = recommendedShillCount(8, 8);
    const noHumans = recommendedShillCount(0, 8);
    expect(allHuman.count).toBeLessThanOrEqual(noHumans.count);
    expect(allHuman.count).toBe(Math.round(noHumans.count * 0.5));
  });

  test('unknown league sizes snap to the nearest tuned size', () => {
    expect(recommendedShillCount(0, 7).count).toBeGreaterThan(0);
    expect(recommendedShillCount(0, 100).count).toBe(
      SIZING_TUNING.shillRecommendationByLeagueSize[12],
    );
  });
});
