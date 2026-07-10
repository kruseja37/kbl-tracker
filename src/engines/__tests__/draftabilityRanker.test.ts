import { describe, expect, it } from 'vitest';

import { buildIdentityRoster, type SimPlayer } from '../archetypeBalanceSimulator';
import { computePoolTierCap } from '../leagueConstruction';
import {
  DRAFTABILITY_TUNING,
  fieldingRobustnessSweep,
  rankArchetypeDraftability,
} from '../draftabilityRanker';
import { archetypeCapShift, HISTORICAL_ARCHETYPES } from '../../data/historicalArchetypes';

/**
 * Snipe-test draftability verdicts (RATIFIED formula, DECISIONS_LOG 2026-07-01) on DETERMINISTIC
 * synthetic pools: deletion-resilience K-rebuilds × tax bands → GREEN/YELLOW/LOCKED with named
 * reasons. Pools are crafted (no randomness) so the catcher-scarcity verdicts are exact.
 */

/**
 * Deterministic pool with SHAPED players: a tier spread (i%4 → base 34..61, so cheap fillers exist
 * and an under-cap build is always possible) × orthogonal PROFILES (slugger / contact / burner /
 * glove / balanced, cycled by i) so stats are DECORRELATED like real SMB4 players — an identity can
 * load its boosted band at the same price by taking specialists who sacrifice elsewhere. A pool
 * where every stat correlates with price makes nerf-heavy fit scores invert on stars (the flat-pool
 * trap this factory replaces).
 */
const HITTER_PROFILES = [
  { POW: 18, CON: 4, SPD: -10, FLD: -4, ARM: 2 }, // slugger
  { POW: -6, CON: 16, SPD: 6, FLD: 0, ARM: -4 }, // contact
  { POW: -12, CON: 2, SPD: 18, FLD: 6, ARM: -2 }, // burner
  { POW: -8, CON: -2, SPD: 2, FLD: 16, ARM: 10 }, // glove
  { POW: 12, CON: 12, SPD: -12, FLD: -8, ARM: -4 }, // masher (POW+CON together — Murderers'-Row food)
  { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0 }, // balanced
] as const;

function mkHitter(id: string, position: string, i: number): SimPlayer {
  const base = 34 + (i % 4) * 9;
  const profile = HITTER_PROFILES[i % HITTER_PROFILES.length];
  const clamp = (x: number) => Math.max(10, Math.min(95, x));
  const bat = {
    POW: clamp(base + profile.POW + ((i * 7) % 5)),
    CON: clamp(base + profile.CON + ((i * 3) % 5)),
    SPD: clamp(base + profile.SPD + ((i * 11) % 5)),
    FLD: clamp(base + profile.FLD + ((i * 5) % 5)),
    ARM: clamp(base + profile.ARM + ((i * 13) % 5)),
  };
  const iv = (bat.POW + bat.CON + bat.SPD + bat.FLD + bat.ARM) / 5;
  return { id, isPitcher: false, bat, iv, salary: iv, position };
}

const PITCHER_PROFILES = [
  { VEL: 16, JNK: -8, ACC: -2 }, // flamethrower
  { VEL: -8, JNK: 16, ACC: 0 }, // junkballer
  { VEL: -2, JNK: -6, ACC: 16 }, // command
  { VEL: 0, JNK: 0, ACC: 0 }, // balanced
] as const;

function mkPitcher(
  id: string,
  role: 'SP' | 'RP' | 'CP' | 'SP/RP',
  i: number,
  twoWayVariant?: 'IF' | 'OF' | 'C',
): SimPlayer {
  const base = 34 + (i % 4) * 9;
  const profile = PITCHER_PROFILES[i % PITCHER_PROFILES.length];
  const clamp = (x: number) => Math.max(10, Math.min(95, x));
  const pit = {
    VEL: clamp(base + profile.VEL + ((i * 9) % 5)),
    JNK: clamp(base + profile.JNK + ((i * 5) % 5)),
    ACC: clamp(base + profile.ACC + ((i * 7) % 5)),
  };
  const iv = (pit.VEL + pit.JNK + pit.ACC) / 3;
  return {
    id,
    isPitcher: true,
    role,
    bat: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0 },
    pit,
    iv,
    salary: iv,
    position: role,
    twoWayVariant: twoWayVariant ?? null,
  };
}

/** A pool with `catchers` primary-Cs, 8 deep everywhere else, and a full arms rack. */
function syntheticPool(catchers: number): SimPlayer[] {
  const pool: SimPlayer[] = [];
  let n = 0;
  for (let i = 0; i < catchers; i += 1) pool.push(mkHitter(`c${i}`, 'C', n++));
  for (const pos of ['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']) {
    for (let i = 0; i < 8; i += 1) pool.push(mkHitter(`${pos.toLowerCase()}-${i}`, pos, n++));
  }
  for (let i = 0; i < 12; i += 1) pool.push(mkPitcher(`sp${i}`, i % 4 === 3 ? 'SP/RP' : 'SP', n++));
  for (let i = 0; i < 12; i += 1) pool.push(mkPitcher(`rp${i}`, i >= 8 ? 'CP' : 'RP', n++));
  return pool;
}

/**
 * Hitter-boost archetypes whose identities the synthetic profiles express cleanly (probed): the
 * verdict-MECHANICS cases use these. (Speed/glove identities need real-shaped pools — the oracle
 * embodiment test covers all 24 against real players; this file tests the verdict machinery.)
 */
const SUBSET = HISTORICAL_ARCHETYPES.filter((a) =>
  ['murderers-row', 'bomba-squad', 'bash-brothers'].includes(a.id),
);

/** A deep, snipe-survivable pool: 10 catchers, 12 per position, 20 SP-side / 18 relief arms. */
function deepPool(): SimPlayer[] {
  const pool: SimPlayer[] = [];
  let n = 0;
  for (let i = 0; i < 10; i += 1) pool.push(mkHitter(`c${i}`, 'C', n++));
  for (const pos of ['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']) {
    for (let i = 0; i < 12; i += 1) pool.push(mkHitter(`${pos.toLowerCase()}-${i}`, pos, n++));
  }
  for (let i = 0; i < 20; i += 1) pool.push(mkPitcher(`sp${i}`, i % 4 === 3 ? 'SP/RP' : 'SP', n++));
  for (let i = 0; i < 18; i += 1) pool.push(mkPitcher(`rp${i}`, i % 4 === 3 ? 'CP' : 'RP', n++));
  return pool;
}

describe('rankArchetypeDraftability — snipe-test verdicts', () => {
  it('a buildable pool ranks without LOCKED verdicts and orders bands best-first', () => {
    const rows = rankArchetypeDraftability(syntheticPool(8), SUBSET, 'standard', { realTeamCount: 20, minEmbodimentZ: -1 });
    expect(rows).toHaveLength(SUBSET.length);
    expect(rows.every((r) => r.band !== 'LOCKED')).toBe(true);
    expect(rows.every((r) => r.resilience >= 1)).toBe(true);
    // Ranks are 1..N in sorted band order.
    expect(rows.map((r) => r.rank)).toEqual(rows.map((_, i) => i + 1));
    for (let i = 1; i < rows.length; i += 1) {
      const order = { GREEN: 0, YELLOW: 1, LOCKED: 2 } as const;
      expect(order[rows[i - 1].band]).toBeLessThanOrEqual(order[rows[i].band]);
    }
  }, 30_000);

  it('a DEEP pool survives repeated snipes without tax → GREEN', () => {
    const rows = rankArchetypeDraftability(deepPool(), SUBSET, 'standard', { realTeamCount: 20, minEmbodimentZ: -1 });
    const greens = rows.filter((r) => r.band === 'GREEN');
    expect(greens.length, rows.map((r) => `${r.archetypeId}:${r.band}(res=${r.resilience})`).join(' ')).toBeGreaterThan(0);
    for (const g of greens) {
      expect(g.noTaxBuilds).toBeGreaterThanOrEqual(DRAFTABILITY_TUNING.greenNoTaxBuilds);
      expect(g.resilience).toBeGreaterThanOrEqual(2);
    }
    expect(rows[0].band).toBe('GREEN');
  }, 30_000);

  it('exactly two primary catchers → the snipe kills the rebuild: fragile YELLOW with the reason', () => {
    const rows = rankArchetypeDraftability(syntheticPool(2), SUBSET, 'standard', { realTeamCount: 20, minEmbodimentZ: -1 });
    for (const row of rows) {
      expect(row.band, row.name).toBe('YELLOW');
      expect(row.resilience, row.name).toBe(1);
      expect(row.reasons.join(' '), row.name).toContain('fragile');
    }
  }, 30_000);

  it('a single primary catcher → LOCKED with the catcher named', () => {
    const rows = rankArchetypeDraftability(syntheticPool(1), SUBSET, 'standard', { realTeamCount: 20, minEmbodimentZ: -1 });
    for (const row of rows) {
      expect(row.band, row.name).toBe('LOCKED');
      expect(row.resilience, row.name).toBe(0);
      expect(row.reasons.join(' '), row.name).toMatch(/legal roster|primary-C/);
    }
  }, 30_000);

  it('tuning dials are the ratified defaults (§16-tunable)', () => {
    expect(DRAFTABILITY_TUNING.maxRebuilds).toBe(3);
    expect(DRAFTABILITY_TUNING.greenNoTaxBuilds).toBe(2);
  });
});

describe('audit-fix regressions — F3 (Ruling-A backup-C), F4 (SP/RP matching), F5 (bullpen snipe)', () => {
  const budgetFor = (pool: SimPlayer[]) => computePoolTierCap(pool.map((p) => p.iv), 'standard');
  const MURDERERS = HISTORICAL_ARCHETYPES.find((a) => a.id === 'murderers-row')!;
  const simOf = (a: (typeof HISTORICAL_ARCHETYPES)[number]) => ({ name: a.name, rawShift: archetypeCapShift(a) });

  it('F3a: the ONLY backup catcher is a secondary-C hitter → identity build is LEGAL, not LOCKED', () => {
    const pool = syntheticPool(1); // one primary-C
    pool.push({ ...mkHitter('sec-c', '1B', 2), id: 'sec-c', secondaryPosition: 'C' });
    const build = buildIdentityRoster(pool, simOf(MURDERERS), 'standard', budgetFor(pool), { realTeamCount: 20, posture: 'optimal' });
    expect(build.rosterSize).toBe(22);
    expect(build.legalRoster).toBe(true);
    expect(build.players.filter((p) => !p.isPitcher && p.position === 'C')).toHaveLength(1);
    expect(build.players.some((p) => p.id === 'sec-c')).toBe(true);

    const rows = rankArchetypeDraftability(pool, [MURDERERS], 'standard', { realTeamCount: 20, minEmbodimentZ: -1 });
    expect(rows[0].band).not.toBe('LOCKED');
  }, 30_000);

  it('F3b: the ONLY backup catcher is a Two Way (C) pitcher → 13/9 shape, LEGAL', () => {
    const pool = syntheticPool(1);
    pool.push(mkPitcher('twc', 'RP', 3, 'C'));
    const build = buildIdentityRoster(pool, simOf(MURDERERS), 'standard', budgetFor(pool), { realTeamCount: 20, posture: 'optimal' });
    expect(build.rosterSize).toBe(22);
    expect(build.legalRoster).toBe(true);
    expect(build.players.some((p) => p.id === 'twc')).toBe(true);
    expect(build.players.filter((p) => p.isPitcher)).toHaveLength(9);
  }, 30_000);

  it('F4: 4 pure SP + 3 SP/RP + 1 CP and ZERO generic RP → a legal staff is still found', () => {
    const pool: SimPlayer[] = [];
    let n = 0;
    for (let i = 0; i < 8; i += 1) pool.push(mkHitter(`c${i}`, 'C', n++));
    for (const pos of ['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']) {
      for (let i = 0; i < 8; i += 1) pool.push(mkHitter(`${pos.toLowerCase()}-${i}`, pos, n++));
    }
    for (let i = 0; i < 4; i += 1) pool.push(mkPitcher(`sp${i}`, 'SP', n++));
    for (let i = 0; i < 3; i += 1) pool.push(mkPitcher(`sw${i}`, 'SP/RP', n++));
    pool.push(mkPitcher('cp0', 'CP', n++));
    const build = buildIdentityRoster(pool, simOf(MURDERERS), 'standard', budgetFor(pool), { realTeamCount: 20, posture: 'optimal' });
    expect(build.rosterSize).toBe(22);
    expect(build.legalRoster).toBe(true); // pure SPs start, swings relieve, CP closes — the F4 counterexample
  }, 30_000);

  it('F5: a bullpen-boosted archetype gets its relief corps sniped; a hitter archetype does not', () => {
    const OPENER = HISTORICAL_ARCHETYPES.find((a) => a.id === 'the-opener')!;
    expect(OPENER.boosts.some((s) => s.startsWith('PEN_'))).toBe(true);
    // Deep everywhere EXCEPT relief: 8 relievable arms (enough pool variance for a positive pen z,
    // small enough that banning the used pen starves a later rebuild) — the pen-boost snipe is the
    // only difference between the two archetypes' resilience on this pool.
    const pool: SimPlayer[] = [];
    let n = 0;
    for (let i = 0; i < 8; i += 1) pool.push(mkHitter(`c${i}`, 'C', n++));
    for (const pos of ['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']) {
      for (let i = 0; i < 12; i += 1) pool.push(mkHitter(`${pos.toLowerCase()}-${i}`, pos, n++));
    }
    for (let i = 0; i < 20; i += 1) pool.push(mkPitcher(`sp${i}`, 'SP', n++));
    for (let i = 0; i < 8; i += 1) pool.push(mkPitcher(`rp${i}`, i % 4 === 3 ? 'CP' : 'RP', n++));

    const [opener] = rankArchetypeDraftability(pool, [OPENER], 'standard', { realTeamCount: 20, minEmbodimentZ: -1 });
    const [hitterArch] = rankArchetypeDraftability(pool, [MURDERERS], 'standard', { realTeamCount: 20, minEmbodimentZ: -1 });
    expect(hitterArch.band).not.toBe('LOCKED');
    expect(opener.resilience).toBeLessThan(hitterArch.resilience);
    expect(opener.resilience).toBeGreaterThanOrEqual(1);
    expect(opener.reasons.join(' ')).toContain('fragile');
  }, 60_000);
});

describe('fieldingRobustnessSweep — yardstick sensitivity', () => {
  it('re-ranks under scaled fielding value and reports rank stability', () => {
    const report = fieldingRobustnessSweep(syntheticPool(8), SUBSET, 'standard', [1.3], { realTeamCount: 20 });
    expect(report.base).toHaveLength(SUBSET.length);
    expect(report.sweeps).toHaveLength(1);
    expect(report.sweeps[0].multiplier).toBe(1.3);
    expect(report.sweeps[0].ranks).toHaveLength(SUBSET.length);
    expect(report.maxRankShift).toBeGreaterThanOrEqual(0);
    expect(report.shifts).toHaveLength(SUBSET.length);
    expect(typeof report.stable).toBe('boolean');
  }, 60_000);
});
