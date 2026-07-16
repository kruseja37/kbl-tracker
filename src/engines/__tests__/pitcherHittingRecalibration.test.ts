import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  HISTORICAL_ARCHETYPES,
  archetypeCapShift,
  type HistoricalArchetype,
} from '../../data/historicalArchetypes';
import { twoWayVariantFromTraits } from '../../data/rosterConstruction';
import { USAGE_INPUTS } from '../../data/rosterEngineConstants';
import { LUXURY_CAP_TABLES, type LuxuryCapRow, type TierKey } from '../../data/tierParams';
import {
  buildBestRoster,
  buildIdentityRoster,
  identityEmbodiment,
  runBalanceSim,
  type SimArchetype,
  type SimPlayer,
} from '../archetypeBalanceSimulator';
import {
  assignLuxuryTaxPitchingGroups,
  computePoolTierCap,
  luxuryTax,
} from '../leagueConstruction';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORACLE_PATH = path.resolve(__dirname, '../../../spec-docs/reference/iv_oracle.json');
const AFFECTED = ['bash-brothers', 'launch-and-leather', 'flamethrowers', 'hdh-royals'] as const;
const TIERS = ['standard', 'nerfed'] as const satisfies readonly TierKey[];
const RAW_OVERAGE_LADDER = [10, 25, 50] as const;

function usageWeight(role: NonNullable<SimPlayer['role']>, stat: 'POW' | 'CON' | 'SPD' | 'FLD'): number {
  const input = USAGE_INPUTS[role];
  const bat = input.startShare * input.paRatio + input.phFloor;
  if (stat === 'POW' || stat === 'CON') return bat;
  if (stat === 'SPD') return Math.min(1, bat + input.prFloor + input.rangeFloor);
  return Math.max(input.startShare, input.rangeFloor);
}

interface OracleEntry {
  id: string;
  kblIV: number;
  input: {
    isPitcher: boolean;
    role: string;
    position: string;
    batterRatings?: { POW?: number; CON?: number; SPD?: number; FLD?: number; ARM?: number };
    pitcherRatings?: { VEL?: number; JNK?: number; ACC?: number };
    traits?: string[];
  };
}

function loadPool(): SimPlayer[] {
  const oracle = JSON.parse(readFileSync(ORACLE_PATH, 'utf-8')) as { players: OracleEntry[] };
  return oracle.players.map((entry) => {
    const bat = entry.input.batterRatings ?? {};
    const pit = entry.input.pitcherRatings;
    return {
      id: entry.id,
      isPitcher: entry.input.isPitcher,
      role: entry.input.isPitcher ? entry.input.role as SimPlayer['role'] : undefined,
      twoWayVariant: entry.input.isPitcher ? twoWayVariantFromTraits(entry.input.traits ?? []) : null,
      bat: {
        POW: bat.POW ?? 0,
        CON: bat.CON ?? 0,
        SPD: bat.SPD ?? 0,
        FLD: bat.FLD ?? 0,
        ARM: bat.ARM ?? 0,
      },
      pit: pit ? { VEL: pit.VEL ?? 0, JNK: pit.JNK ?? 0, ACC: pit.ACC ?? 0 } : undefined,
      iv: entry.kblIV,
      salary: entry.kblIV,
      position: entry.input.position,
    } satisfies SimPlayer;
  });
}

function toSim(archetype: HistoricalArchetype): SimArchetype {
  return { name: archetype.name, rawShift: archetypeCapShift(archetype) };
}

function withoutStarterHitting(archetype: HistoricalArchetype): SimArchetype {
  const rawShift = { ...archetypeCapShift(archetype) };
  rawShift['rotation/POW'] = 0;
  rawShift['rotation/CON'] = 0;
  return { name: `${archetype.name} (zero starter hitting)`, rawShift };
}

function taxAtOverage(row: LuxuryCapRow, overage: number): number {
  if (overage <= 0) return 0;
  return row.penaltyPer100 * (overage / 100) ** row.penaltyCurve + row.minAdder;
}

function taxReliefLadder(
  row: LuxuryCapRow,
  shift: number,
  usageWeight: number,
): Record<string, number> {
  const shiftedHeadroom = row.cap * shift;
  return Object.fromEntries(RAW_OVERAGE_LADDER.map((rawOverage) => {
    const weightedOverage = rawOverage * usageWeight;
    return [
      String(rawOverage),
      Math.round(taxAtOverage(row, weightedOverage) - taxAtOverage(row, weightedOverage - shiftedHeadroom)),
    ];
  }));
}

function rotationBatTotals(players: readonly SimPlayer[]): Record<'POW' | 'CON', { raw: number; weighted: number }> {
  const rotation = assignLuxuryTaxPitchingGroups([...players]).rotation.filter((player) => player.twoWayVariant == null);
  return Object.fromEntries((['POW', 'CON'] as const).map((stat) => {
    const raw = rotation.reduce((sum, player) => sum + player.bat[stat], 0);
    const weighted = rotation.reduce((sum, player) => {
      const role = player.role;
      return sum + (role ? player.bat[stat] * usageWeight(role, stat) : 0);
    }, 0);
    return [stat, { raw, weighted }];
  })) as Record<'POW' | 'CON', { raw: number; weighted: number }>;
}

describe('SNAKE-PITCHER-HITTING-RECALIBRATION-30', () => {
  const pool = loadPool();
  const affected = AFFECTED.map((id) => HISTORICAL_ARCHETYPES.find((candidate) => candidate.id === id)!);
  const all = HISTORICAL_ARCHETYPES.map(toSim);
  const usageAwareBase = LUXURY_CAP_TABLES.standard.some(
    (row) => row.ratingBasis === 'pitcher-role-usage-v1',
  );

  test('measures complete identities against zero-axis ablations at Standard and Nerfed', { timeout: 120_000 }, () => {
    const measurements = TIERS.flatMap((tier) => {
      const budget = computePoolTierCap(pool.map((player) => player.iv), tier);
      const report = runBalanceSim(pool, all, tier, 20, 0.1);
      return affected.map((archetype) => {
        const complete = toSim(archetype);
        const ablated = withoutStarterHitting(archetype);
        const completeBest = report.results.find((result) => result.name === archetype.name)!;
        const ablatedBest = buildBestRoster(pool, ablated, tier, budget, 20);
        const completeIdentity = buildIdentityRoster(pool, complete, tier, budget, {
          realTeamCount: 20,
          posture: 'optimal',
        });
        const ablatedIdentity = buildIdentityRoster(pool, ablated, tier, budget, {
          realTeamCount: 20,
          posture: 'optimal',
        });
        const shifts = complete.rawShift ?? {};
        const usageAware = LUXURY_CAP_TABLES[tier].some((row) => row.ratingBasis === 'pitcher-role-usage-v1');
        const starterUsageWeight = usageAware ? usageWeight('SP', 'POW') : 1;
        const headroom = (['POW', 'CON'] as const).flatMap((stat) => {
          const shift = shifts[`rotation/${stat}`] ?? 0;
          if (shift === 0) return [];
          const row = LUXURY_CAP_TABLES[tier].find((candidate) => candidate.group === 'rotation' && candidate.stat === stat)!;
          const weighted = row.cap * shift;
          return [{
            stat,
            shift,
            weighted,
            rawEquivalent: weighted / starterUsageWeight,
            reliefByRawOverage: taxReliefLadder(row, shift, starterUsageWeight),
          }];
        });

        // The 9e5901d7 reference predates the later absolute-solvency simulator repair. Preserve its
        // result honestly for comparison, but enforce current legality/solvency only on the corrected
        // usage-aware base. The final gate below separately checks every current Standard/Nerfed build.
        if (usageAware) {
          expect(completeBest.legalRoster && completeBest.solvent).toBe(true);
          expect(ablatedBest.legalRoster && ablatedBest.solvent).toBe(true);
          expect(completeIdentity.legalRoster && completeIdentity.solvent).toBe(true);
          expect(ablatedIdentity.legalRoster && ablatedIdentity.solvent).toBe(true);
        }

        const completeRotation = rotationBatTotals(completeIdentity.players);
        const ablatedRotation = rotationBatTotals(ablatedIdentity.players);
        const ablatedUnderCompleteIdentity = identityEmbodiment(ablatedIdentity.players, complete, tier, pool);
        const shiftedStats = (['POW', 'CON'] as const).filter((stat) => (shifts[`rotation/${stat}`] ?? 0) > 0);
        const rawAxisGain = shiftedStats.reduce(
          (sum, stat) => sum + completeRotation[stat].raw - ablatedRotation[stat].raw,
          0,
        );
        const weightedAxisGain = shiftedStats.reduce(
          (sum, stat) => sum + completeRotation[stat].weighted - ablatedRotation[stat].weighted,
          0,
        );
        expect(rawAxisGain, `${tier} ${archetype.name} raw starter-hitting effect`).toBeGreaterThan(0);
        expect(weightedAxisGain, `${tier} ${archetype.name} weighted starter-hitting effect`).toBeGreaterThan(0);
        expect(headroom.every((row) => Object.values(row.reliefByRawOverage).some((relief) => relief > 0))).toBe(true);

        return {
          tier,
          archetype: archetype.name,
          usageAware,
          headroom,
          completeBest,
          ablatedBest,
          completeDeviation: (completeBest.totalIv - report.meanIv) / report.meanIv,
          ablatedDeviationAgainstCompleteMean: (ablatedBest.totalIv - report.meanIv) / report.meanIv,
          completeIdentity: {
            iv: completeIdentity.totalIv,
            salary: completeIdentity.totalSalary,
            tax: completeIdentity.totalTax,
            allIn: completeIdentity.totalSalary + completeIdentity.totalTax,
            rotation: completeRotation,
            boostZ: completeIdentity.embodiment.boostZ,
          },
          ablatedIdentity: {
            iv: ablatedIdentity.totalIv,
            salary: ablatedIdentity.totalSalary,
            tax: ablatedIdentity.totalTax,
            allIn: ablatedIdentity.totalSalary + ablatedIdentity.totalTax,
            rotation: ablatedRotation,
            boostZUnderCompleteIdentity: ablatedUnderCompleteIdentity.boostZ,
            boostZDelta: completeIdentity.embodiment.boostZ - ablatedUnderCompleteIdentity.boostZ,
          },
        };
      });
    });

    // Diagnostic evidence is intentionally machine-readable so the exact same test can be run at
    // the 9e5901d7 reference and the usage-aware base without estimating from prose.
    console.log(`\nPITCHER_HITTING_RECALIBRATION=${JSON.stringify(measurements)}`);
    expect(measurements).toHaveLength(8);
  });

  test('pins the smallest evidence-backed starter-hitting multipliers', () => {
    if (!usageAwareBase) return;
    const spec = Object.fromEntries(affected.map((archetype) => [archetype.id, archetype.spec]));
    expect(spec['bash-brothers'].ROT_POW).toBe(1.5);
    expect(spec['launch-and-leather'].ROT_POW).toBe(1);
    expect(spec['launch-and-leather'].ROT_CON).toBe(1);
    expect(spec.flamethrowers.ROT_POW).toBe(3);
    expect(spec.flamethrowers.ROT_CON).toBe(3);
    expect(spec['hdh-royals'].ROT_CON).toBe(4);
  });

  test('keeps all 24 archetypes legal, solvent, and inside ±10% at every tier', { timeout: 120_000 }, () => {
    if (!usageAwareBase) return;
    for (const tier of ['juiced', ...TIERS] as const satisfies readonly TierKey[]) {
      const report = runBalanceSim(pool, all, tier, 20, 0.1);
      expect(report.results.every((result) => result.legalRoster && result.solvent), `${tier} legal/solvent`).toBe(true);
      expect(report.outliers, `${tier} parity`).toEqual([]);
    }
  });

  test('builds all 48 priority-tier identity rosters legally and solvently', { timeout: 180_000 }, () => {
    if (!usageAwareBase) return;
    for (const tier of TIERS) {
      const budget = computePoolTierCap(pool.map((player) => player.iv), tier);
      for (const archetype of all) {
        const roster = buildIdentityRoster(pool, archetype, tier, budget, {
          realTeamCount: 20,
          posture: 'optimal',
        });
        expect(roster.rosterSize, `${tier} ${archetype.name} size`).toBe(22);
        expect(roster.legalRoster, `${tier} ${archetype.name} legal`).toBe(true);
        expect(roster.solvent, `${tier} ${archetype.name} solvent`).toBe(true);
        expect(roster.floorMet, `${tier} ${archetype.name} value floor`).toBe(true);
      }
    }
  });

  test('discounts ordinary RP/CP hitting and settles their real Standard bullpen rows from weighted ratings', () => {
    if (!usageAwareBase) return;
    const reliefPlayer = (id: string, role: 'RP' | 'CP'): SimPlayer => ({
      id,
      isPitcher: true,
      role,
      twoWayVariant: null,
      position: role,
      bat: { POW: 80, CON: 80, SPD: 80, FLD: 80, ARM: 99 },
      pit: { VEL: 50, JNK: 50, ACC: 50 },
      iv: 1,
      salary: 1,
    });
    const rp = reliefPlayer('rp', 'RP');
    const cp = reliefPlayer('cp', 'CP');
    const secondaryRows = LUXURY_CAP_TABLES.standard.filter(
      (row) => row.group === 'bullpen' && ['POW', 'CON', 'SPD', 'FLD'].includes(row.stat),
    );
    const zeroCapRows = secondaryRows.map((row) => ({
      ...row,
      topN: 1,
      cap: 0,
      penaltyCurve: 1,
      penaltyPer100: 100,
      minAdder: 0,
    }));
    const ratings = (player: SimPlayer) => Object.fromEntries(
      luxuryTax([player], zeroCapRows, 'taxed').binding.map((entry) => [entry.stat, entry.over]),
    );

    expect(usageWeight('RP', 'POW')).toBe(0.08);
    expect(usageWeight('RP', 'CON')).toBe(0.08);
    expect(usageWeight('RP', 'SPD')).toBe(0.16);
    expect(usageWeight('RP', 'FLD')).toBe(0.06);
    expect(usageWeight('CP', 'POW')).toBe(0.05);
    expect(usageWeight('CP', 'CON')).toBe(0.05);
    expect(usageWeight('CP', 'SPD')).toBeCloseTo(0.11, 12);
    expect(usageWeight('CP', 'FLD')).toBe(0.05);
    expect(ratings(rp)).toMatchObject({ POW: 6.4, CON: 6.4, SPD: 12.8, FLD: 4.8 });
    const cpRatings = ratings(cp);
    expect(cpRatings.POW).toBe(4);
    expect(cpRatings.CON).toBe(4);
    expect(cpRatings.SPD).toBeCloseTo(8.8, 12);
    expect(cpRatings.FLD).toBe(4);

    const settled = luxuryTax([rp, cp], secondaryRows, 'taxed');
    expect(settled.binding.map((row) => ({
      stat: row.stat,
      over: Number(row.over.toFixed(1)),
      tax: Math.round(row.tax),
    }))).toEqual([
      { stat: 'POW', over: 3.8, tax: 7780 },
      { stat: 'CON', over: 3.7, tax: 4630 },
      { stat: 'SPD', over: 0.5, tax: 2933 },
    ]);
  });

  test('treats a Two Way reliever as a full-use hitter without a bullpen secondary double charge', () => {
    if (!usageAwareBase) return;
    const twoWay: SimPlayer = {
      id: 'two-way-rp',
      isPitcher: true,
      role: 'RP',
      twoWayVariant: 'IF',
      position: 'RP',
      bat: { POW: 80, CON: 80, SPD: 80, FLD: 80, ARM: 99 },
      pit: { VEL: 70, JNK: 0, ACC: 0 },
      iv: 1,
      salary: 1,
    };
    const row = (
      group: LuxuryCapRow['group'],
      stat: LuxuryCapRow['stat'],
    ): LuxuryCapRow => ({
      group,
      stat,
      topN: 1,
      cap: 0,
      penaltyCurve: 1,
      penaltyPer100: 100,
      minAdder: 0,
      ratingBasis: 'pitcher-role-usage-v1',
    });
    const rows = [
      row('hitters', 'POW'),
      row('hitters', 'CON'),
      row('hitters', 'SPD'),
      row('hitters', 'FLD'),
      row('bullpen', 'POW'),
      row('bullpen', 'CON'),
      row('bullpen', 'SPD'),
      row('bullpen', 'FLD'),
      row('bullpen', 'VEL'),
    ];
    const result = luxuryTax([twoWay], rows, 'taxed');

    expect(result.binding.map(({ group, stat, over }) => ({ group, stat, over }))).toEqual([
      { group: 'hitters', stat: 'POW', over: 80 },
      { group: 'hitters', stat: 'CON', over: 80 },
      { group: 'hitters', stat: 'SPD', over: 80 },
      { group: 'hitters', stat: 'FLD', over: 80 },
      { group: 'bullpen', stat: 'VEL', over: 70 },
    ]);
    expect(result.wouldBeTax).toBe(390);
  });
});
