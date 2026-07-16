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
import { deriveLuxuryTaxUsageWeights } from '../../data/rosterEngineConstants';
import { LUXURY_CAP_TABLES, type LuxuryCapRow, type TierKey } from '../../data/tierParams';
import {
  buildBestRoster,
  buildIdentityRoster,
  runBalanceSim,
  type SimArchetype,
  type SimPlayer,
} from '../archetypeBalanceSimulator';
import { assignLuxuryTaxPitchingGroups, computePoolTierCap } from '../leagueConstruction';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORACLE_PATH = path.resolve(__dirname, '../../../spec-docs/reference/iv_oracle.json');
const AFFECTED = ['bash-brothers', 'launch-and-leather', 'flamethrowers', 'hdh-royals'] as const;
const TIERS = ['standard', 'nerfed'] as const satisfies readonly TierKey[];
const RAW_OVERAGE_LADDER = [10, 25, 50] as const;

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
      return sum + (role ? player.bat[stat] * deriveLuxuryTaxUsageWeights(role)[stat] : 0);
    }, 0);
    return [stat, { raw, weighted }];
  })) as Record<'POW' | 'CON', { raw: number; weighted: number }>;
}

describe('SNAKE-PITCHER-HITTING-RECALIBRATION-30', () => {
  const pool = loadPool();
  const affected = AFFECTED.map((id) => HISTORICAL_ARCHETYPES.find((candidate) => candidate.id === id)!);
  const all = HISTORICAL_ARCHETYPES.map(toSim);

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
        const usageWeight = usageAware ? deriveLuxuryTaxUsageWeights('SP').POW : 1;
        const headroom = (['POW', 'CON'] as const).flatMap((stat) => {
          const shift = shifts[`rotation/${stat}`] ?? 0;
          if (shift === 0) return [];
          const row = LUXURY_CAP_TABLES[tier].find((candidate) => candidate.group === 'rotation' && candidate.stat === stat)!;
          const weighted = row.cap * shift;
          return [{
            stat,
            shift,
            weighted,
            rawEquivalent: weighted / usageWeight,
            reliefByRawOverage: taxReliefLadder(row, shift, usageWeight),
          }];
        });

        expect(completeBest.legalRoster && completeBest.solvent).toBe(true);
        expect(ablatedBest.legalRoster && ablatedBest.solvent).toBe(true);
        expect(completeIdentity.legalRoster && completeIdentity.solvent).toBe(true);
        expect(ablatedIdentity.legalRoster && ablatedIdentity.solvent).toBe(true);

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
            rotation: rotationBatTotals(completeIdentity.players),
          },
          ablatedIdentity: {
            iv: ablatedIdentity.totalIv,
            salary: ablatedIdentity.totalSalary,
            tax: ablatedIdentity.totalTax,
            allIn: ablatedIdentity.totalSalary + ablatedIdentity.totalTax,
            rotation: rotationBatTotals(ablatedIdentity.players),
          },
        };
      });
    });

    // Diagnostic evidence is intentionally machine-readable so the exact same test can be run at
    // the 9e5901d7 reference and the usage-aware base without estimating from prose.
    // eslint-disable-next-line no-console
    console.log(`\nPITCHER_HITTING_RECALIBRATION=${JSON.stringify(measurements)}`);
    expect(measurements).toHaveLength(8);
  });
});
