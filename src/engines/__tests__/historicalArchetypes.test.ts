import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runBalanceSim, type SimPlayer, type SimArchetype } from '../archetypeBalanceSimulator';
import { HISTORICAL_ARCHETYPES, archetypeCapShift } from '../../data/historicalArchetypes';
import type { TierKey } from '../../data/tierParams';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORACLE_PATH = path.resolve(__dirname, '../../../spec-docs/reference/iv_oracle.json');

interface OracleEntry {
  id: string; kblIV: number;
  input: {
    isPitcher: boolean; role: string; position: string;
    batterRatings?: { POW?: number; CON?: number; SPD?: number; FLD?: number; ARM?: number };
    pitcherRatings?: { VEL?: number; JNK?: number; ACC?: number };
  };
}
function loadPool(): SimPlayer[] {
  const oracle = JSON.parse(readFileSync(ORACLE_PATH, 'utf-8')) as { players: OracleEntry[] };
  return oracle.players.map((e) => {
    const br = e.input.batterRatings ?? {};
    const pr = e.input.pitcherRatings;
    return {
      id: e.id, isPitcher: !!e.input.isPitcher,
      role: e.input.isPitcher ? (e.input.role as SimPlayer['role']) : undefined,
      bat: { POW: br.POW ?? 0, CON: br.CON ?? 0, SPD: br.SPD ?? 0, FLD: br.FLD ?? 0, ARM: br.ARM ?? 0 },
      pit: pr ? { VEL: pr.VEL ?? 0, JNK: pr.JNK ?? 0, ACC: pr.ACC ?? 0 } : undefined,
      iv: e.kblIV, salary: e.kblIV, position: e.input.position,
    } satisfies SimPlayer;
  });
}

// The canonical set → sim archetypes (custom rawShift profiles).
const SIM_SET: SimArchetype[] = HISTORICAL_ARCHETYPES.map((a) => ({ name: a.name, rawShift: archetypeCapShift(a) }));

describe('historical team archetypes — locked set, all tiers', () => {
  it('is 24 distinct archetypes', () => {
    expect(HISTORICAL_ARCHETYPES.length).toBe(24);
    expect(new Set(HISTORICAL_ARCHETYPES.map((a) => a.id)).size).toBe(24);
  });

  // Timeout-only housekeeping (JK/Fable 2026-07-01): the 3-tier balance sim needs ~6.5s, over vitest's
  // 5s default → the assertions never ran and the test read as a phantom parity RED. Raise the per-test
  // timeout; the parity assertions below are UNTOUCHED (frozen gate).
  it('stays within the ±10% parity band across juiced / standard / nerfed, and prints the landscape', { timeout: 30000 }, () => {
    const pool = loadPool();
    for (const tier of ['juiced', 'standard', 'nerfed'] as const satisfies readonly TierKey[]) {
      const report = runBalanceSim(pool, SIM_SET, tier, 0.1);
      const inBand = report.results.length - report.outliers.length;
      const rows = report.results
        .map((r) => ({ name: r.name, dev: (r.totalIv - report.meanIv) / report.meanIv }))
        .sort((a, b) => b.dev - a.dev);
      // eslint-disable-next-line no-console
      console.log(
        `\n[${tier}] within ±10%: ${inBand}/${report.results.length}   maxDev ${(report.maxDeviation * 100).toFixed(1)}%   ` +
          (report.outliers.length ? `OUT: ${report.outliers.map((o) => `${o.name} ${(o.deviation * 100).toFixed(0)}%`).join(', ')}` : 'all in band'),
      );
      // eslint-disable-next-line no-console
      console.log('  ' + rows.map((r) => `${r.name} ${(r.dev * 100).toFixed(1)}%`).join('  ·  '));
      expect(report.results.every((r) => r.rosterSize === 22)).toBe(true);
      // Every archetype must field a LEGAL SMB4 roster (8 field + backup C + 13-14 position / 8-9 pitchers,
      // ≥4 SP + ≥4 RP) — so the parity result translates to a real auction draft, not impossible teams (JK 2026-06-30).
      expect(report.results.every((r) => r.legalRoster)).toBe(true);
      expect(report.withinBand).toBe(true);
    }
  });
});
