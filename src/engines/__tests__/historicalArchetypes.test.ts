import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runBalanceSim, type SimPlayer, type SimArchetype } from '../archetypeBalanceSimulator';

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

// Value-calibrated per-stat unit shift (small for valuable/binding stats, large for cheap ones —
// the workbook's own calibration direction). A first-pass magnitude; the sim tells us what to tune.
const U: Record<string, number> = {
  POW: 0.05, CON: 0.1, SPD: 0.12, FLD: 0.22, ARM: 0.12,
  ROT_VEL: 0.16, ROT_JNK: 0.3, ROT_ACC: 0.25, PEN_VEL: 0.2, PEN_JNK: 0.35, PEN_ACC: 0.3,
};
const KEY: Record<string, string> = {
  POW: 'hitters/POW', CON: 'hitters/CON', SPD: 'hitters/SPD', FLD: 'hitters/FLD', ARM: 'hitters/ARM',
  ROT_VEL: 'rotation/VEL', ROT_JNK: 'rotation/JNK', ROT_ACC: 'rotation/ACC',
  PEN_VEL: 'bullpen/VEL', PEN_JNK: 'bullpen/JNK', PEN_ACC: 'bullpen/ACC',
};
function shift(spec: Record<string, number>): Record<string, number> {
  const rs: Record<string, number> = {};
  for (const [s, m] of Object.entries(spec)) rs[KEY[s]] = m * U[s];
  return rs;
}

// 16 distinct, deduped historical identities (boost level + / nerf level −; magnitude × unit).
const HISTORICAL: SimArchetype[] = [
  { name: "Murderers' Row", rawShift: shift({ POW: 1.5, CON: 1, SPD: -1.5 }) },
  { name: 'Bomba Squad', rawShift: shift({ POW: 2, CON: -1.5, SPD: -1 }) },
  { name: 'Bash Brothers', rawShift: shift({ POW: 1.5, ARM: 1, ROT_ACC: -1, PEN_ACC: -1 }) },
  { name: 'Whiteyball', rawShift: shift({ SPD: 1.5, FLD: 1.5, POW: -2 }) },
  { name: 'Go-Go Small Ball', rawShift: shift({ CON: 1.5, FLD: 1, POW: -2 }) },
  { name: 'Dead-Ball Suppressors', rawShift: shift({ ROT_JNK: 1.5, CON: 1, POW: -2, PEN_VEL: -1 }) },
  { name: 'Billy Ball Burners', rawShift: shift({ SPD: 2, POW: -1.5, ROT_ACC: -1 }) },
  { name: 'Junkball Surgeons', rawShift: shift({ ROT_ACC: 1.5, ROT_JNK: 1, POW: -1, ROT_VEL: -1 }) },
  { name: 'Flamethrowers', rawShift: shift({ ROT_VEL: 2, POW: -1, CON: -1 }) },
  { name: 'Nasty Boys', rawShift: shift({ PEN_VEL: 2, PEN_ACC: -1.5 }) },
  { name: 'HDH Royals', rawShift: shift({ PEN_ACC: 1.5, SPD: 1, POW: -1.5, ROT_ACC: -1 }) },
  { name: 'The Opener', rawShift: shift({ PEN_VEL: 1.5, PEN_JNK: 1, ROT_VEL: -1.5, ROT_ACC: -1 }) },
  { name: 'The Oriole Way', rawShift: shift({ FLD: 1.5, ROT_ACC: 1.5, SPD: -1, PEN_VEL: -1 }) },
  { name: 'Shift-Era Suppressors', rawShift: shift({ FLD: 1.5, ROT_VEL: 1, CON: -1.5, PEN_ACC: -1 }) },
  { name: 'Big Red Machine', rawShift: shift({ CON: 1.5, FLD: 1, POW: 0.5, ROT_VEL: -1.5, ROT_ACC: -1 }) },
];

describe('historical team archetypes — first balance pass', () => {
  it('runs the historical set through the sim and prints the landscape (standard tier)', () => {
    const pool = loadPool();
    const report = runBalanceSim(pool, HISTORICAL, 'standard', 0.1);
    const fmt = (n: number) => Math.round(n).toLocaleString();
    const rows = report.results
      .map((r) => ({ ...r, dev: (r.totalIv - report.meanIv) / report.meanIv }))
      .sort((a, b) => b.dev - a.dev);
    // eslint-disable-next-line no-console
    console.log(`\n=== HISTORICAL ARCHETYPES (standard, mean roster IV $${fmt(report.meanIv)}) ===`);
    for (const r of rows) {
      // eslint-disable-next-line no-console
      console.log(`${r.name.padEnd(24)} dev ${(r.dev * 100).toFixed(1).padStart(6)}%   tax $${fmt(r.totalTax).padStart(9)}   solvent ${r.solvent ? 'yes' : 'NO'}`);
    }
    // eslint-disable-next-line no-console
    console.log(`max deviation ${(report.maxDeviation * 100).toFixed(1)}%   within ±10%: ${report.results.length - report.outliers.length}/${report.results.length}`);
    expect(report.results.length).toBe(HISTORICAL.length);
  });
});
