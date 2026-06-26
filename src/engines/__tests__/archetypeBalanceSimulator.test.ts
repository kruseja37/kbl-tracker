import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runBalanceSim, type SimPlayer, type SimArchetype } from '../archetypeBalanceSimulator';
import { CAP_MODIFICATION_FRACTIONS } from '../../data/tierParams';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORACLE_PATH = path.resolve(__dirname, '../../../spec-docs/reference/iv_oracle.json');

interface OracleEntry {
  id: string;
  name: string;
  position: string;
  role: string;
  kblIV: number;
  input: {
    isPitcher: boolean;
    role: string;
    position: string;
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
      id: e.id,
      isPitcher: !!e.input.isPitcher,
      role: e.input.isPitcher ? (e.input.role as SimPlayer['role']) : undefined,
      bat: { POW: br.POW ?? 0, CON: br.CON ?? 0, SPD: br.SPD ?? 0, FLD: br.FLD ?? 0, ARM: br.ARM ?? 0 },
      pit: pr ? { VEL: pr.VEL ?? 0, JNK: pr.JNK ?? 0, ACC: pr.ACC ?? 0 } : undefined,
      iv: e.kblIV,
      salary: e.kblIV,
      position: e.input.position,
    } satisfies SimPlayer;
  });
}

// The named archetypes from the workbook (exclude the null '--' and the 8 atomic single-stat mods).
const ATOMIC = new Set(['--', 'POW', 'CON', 'SPD', 'FLD', 'ARM', 'VEL', 'JNK', 'ACC']);
function workbookArchetypes(): SimArchetype[] {
  return Object.keys(CAP_MODIFICATION_FRACTIONS)
    .filter((name) => !ATOMIC.has(name))
    .map((name) => ({ name, increase: [name], decrease: [] }));
}

describe('archetype balance simulator — workbook baseline', () => {
  it('runs the EV-flatness check on the workbook archetypes (standard tier) and prints the parity table', () => {
    const pool = loadPool();
    const archetypes = workbookArchetypes();
    const report = runBalanceSim(pool, archetypes, 'standard', 0.1);

    const fmt = (n: number) => Math.round(n).toLocaleString();
    const rows = [...report.results]
      .map((r) => ({ ...r, dev: (r.totalIv - report.meanIv) / report.meanIv }))
      .sort((a, b) => b.totalIv - a.totalIv);

    // eslint-disable-next-line no-console
    console.log(`\n=== ARCHETYPE BALANCE (tier=standard, budget=$${fmt(report.budget)}, mean roster IV=$${fmt(report.meanIv)}) ===`);
    // eslint-disable-next-line no-console
    console.log('archetype'.padEnd(20) + 'totalIV'.padStart(12) + 'dev%'.padStart(9) + 'tax'.padStart(12) + '  solvent');
    for (const r of rows) {
      // eslint-disable-next-line no-console
      console.log(
        r.name.padEnd(20) +
          `$${fmt(r.totalIv)}`.padStart(12) +
          `${(r.dev * 100).toFixed(1)}%`.padStart(9) +
          `$${fmt(r.totalTax)}`.padStart(12) +
          `  ${r.solvent ? 'yes' : 'NO'}`,
      );
    }
    // eslint-disable-next-line no-console
    console.log(`\nmax deviation: ${(report.maxDeviation * 100).toFixed(1)}%   within ±${report.band * 100}% band: ${report.withinBand}`);
    if (report.outliers.length) {
      // eslint-disable-next-line no-console
      console.log('OUTLIERS: ' + report.outliers.map((o) => `${o.name} ${(o.deviation * 100).toFixed(1)}%`).join(', '));
    }

    // Sanity: the sim ran over the real pool and every archetype built a full roster.
    expect(pool.length).toBe(440);
    expect(report.results.length).toBe(archetypes.length);
    expect(report.results.every((r) => r.rosterSize === 22)).toBe(true);
    expect(report.budget).toBeGreaterThan(0);
  });
});
