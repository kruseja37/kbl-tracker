import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import type { SimPlayer } from '../archetypeBalanceSimulator';
import {
  defaultPoolTargetSize,
  extractDraftPool,
  EXTRACTOR_TUNING,
  MLB_POOL_STRUCTURE,
} from '../draftPoolExtractor';
import { HISTORICAL_ARCHETYPES } from '../../data/historicalArchetypes';

/**
 * FABLE-C1B: the reverse one-click — archetypes → a balanced, draftable pool from a larger source.
 * Real-source behavior is proven on the IV oracle; verdict-machinery cases use shaped synthetics
 * with the mechanics floor injected (same convention as the ranker suite).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORACLE_PATH = path.resolve(__dirname, '../../../spec-docs/reference/iv_oracle.json');

interface OracleEntry {
  id: string;
  kblIV: number;
  input: {
    isPitcher: boolean;
    role: string;
    position: string;
    batterRatings?: { POW?: number; CON?: number; SPD?: number; FLD?: number; ARM?: number };
    pitcherRatings?: { VEL?: number; JNK?: number; ACC?: number };
  };
}

function loadOracleSource(): SimPlayer[] {
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

const pick = (...ids: string[]) => HISTORICAL_ARCHETYPES.filter((a) => ids.includes(a.id));

describe('defaultPoolTargetSize', () => {
  it('scales roster demand by the oversupply dial', () => {
    expect(defaultPoolTargetSize(8)).toBe(Math.ceil(8 * 22 * EXTRACTOR_TUNING.oversupply));
    expect(MLB_POOL_STRUCTURE.slotsPerTeam).toBe(22);
  });
});

describe('extractDraftPool — oracle source (real players)', () => {
  const source = loadOracleSource();
  const SELECTED = pick('murderers-row', 'whiteyball', 'bomba-squad', 'the-opener');

  it('carves a draftable pool for four disparate identities at an identity-roomy dial, deterministically', () => {
    // 1.5× oversupply: the league-feasibility BODY floors (8×13 hitters + 8×8 pitchers ≈ 202 at
    // 1.2×) stop dominating the target, so identity selection has room. The 1.2×-is-tight reality
    // is asserted separately below — surfaced, never hidden (audit C1B-1).
    const run = () =>
      extractDraftPool(source, SELECTED, 'standard', { teams: 8, oversupply: 1.5, maxRepairRounds: 3 });
    const first = run();

    expect(first.verdicts).toHaveLength(SELECTED.length);
    expect(first.verdicts.every((v) => v.band !== 'LOCKED'), first.notes.join(' | ')).toBe(true);
    // The size cap holds unless identity builds/floors genuinely claim more (then it is NAMED).
    if (first.size > first.targetSize) {
      expect(first.notes.join(' ')).toContain('exceeds');
    }
    expect(first.size).toBeLessThan(source.length);

    const second = run();
    expect(second.players.map((p) => p.id)).toEqual(first.players.map((p) => p.id));
    expect(second.verdicts.map((v) => `${v.archetypeId}:${v.band}`)).toEqual(
      first.verdicts.map((v) => `${v.archetypeId}:${v.band}`),
    );
  }, 300_000);

  it('at the tight default dial (1.2×), the feasibility squeeze is NAMED, never silent', () => {
    const result = extractDraftPool(source, SELECTED, 'standard', { teams: 8, maxRepairRounds: 2 });
    // Feasibility floors ≈ the target at 1.2× — whatever gives (size cap, identity expression,
    // tax dependence), the extractor must SAY so in verdict reasons or notes.
    const story = result.notes.join(' ') + result.verdicts.flatMap((v) => v.reasons).join(' ');
    expect(story.length).toBeGreaterThan(0);
    for (const v of result.verdicts) {
      if (v.band !== 'GREEN') expect(v.reasons.length, v.name).toBeGreaterThan(0);
    }
  }, 300_000);
});

// ── Shaped synthetic source (verdict machinery; mechanics floor injected) ──────────────────────

const HITTER_PROFILES = [
  { POW: 18, CON: 4, SPD: -10, FLD: -4, ARM: 2 },
  { POW: -6, CON: 16, SPD: 6, FLD: 0, ARM: -4 },
  { POW: -12, CON: 2, SPD: 18, FLD: 6, ARM: -2 },
  { POW: -8, CON: -2, SPD: 2, FLD: 16, ARM: 10 },
  { POW: 12, CON: 12, SPD: -12, FLD: -8, ARM: -4 },
  { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0 },
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

function mkPitcher(id: string, role: 'SP' | 'RP' | 'CP' | 'SP/RP', i: number): SimPlayer {
  const base = 34 + (i % 4) * 9;
  const clamp = (x: number) => Math.max(10, Math.min(95, x));
  const pit = { VEL: clamp(base + ((i * 9) % 14)), JNK: clamp(base + ((i * 5) % 14)), ACC: clamp(base + ((i * 7) % 14)) };
  const iv = (pit.VEL + pit.JNK + pit.ACC) / 3;
  return { id, isPitcher: true, role, bat: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0 }, pit, iv, salary: iv, position: role };
}

/** A big synthetic source: `catchers` primary-Cs, 40 deep at the other positions, a wide arms rack. */
function syntheticSource(catchers: number): SimPlayer[] {
  const src: SimPlayer[] = [];
  let n = 0;
  for (let i = 0; i < catchers; i += 1) src.push(mkHitter(`c${i}`, 'C', n++));
  for (const pos of ['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']) {
    for (let i = 0; i < 40; i += 1) src.push(mkHitter(`${pos.toLowerCase()}-${i}`, pos, n++));
  }
  for (let i = 0; i < 60; i += 1) src.push(mkPitcher(`sp${i}`, i % 4 === 3 ? 'SP/RP' : 'SP', n++));
  for (let i = 0; i < 50; i += 1) src.push(mkPitcher(`rp${i}`, i % 5 === 4 ? 'CP' : 'RP', n++));
  return src;
}

describe('extractDraftPool — synthetic sources (machinery)', () => {
  const TWO = pick('bomba-squad', 'whiteyball'); // disjoint needs: raw power vs speed+glove

  it('a rich source yields a balanced pool for disjoint-need identities', () => {
    const result = extractDraftPool(syntheticSource(24), TWO, 'standard', {
      teams: 8,
      minEmbodimentZ: -1,
      maxRepairRounds: 3,
    });
    expect(result.verdicts.every((v) => v.band !== 'LOCKED'), result.notes.join(' | ')).toBe(true);
    expect(result.balanced, result.notes.join(' | ')).toBe(true);
    // The floors guarantee league-wide catching depth rides along.
    const coverage = result.players.filter((p) => !p.isPitcher && p.position === 'C').length;
    expect(coverage).toBeGreaterThanOrEqual(Math.ceil(8 * 2 * EXTRACTOR_TUNING.oversupply));
  }, 120_000);

  it('a catcher-starved source is NAMED, pulls every coverage body it has, and never fabricates', () => {
    const result = extractDraftPool(syntheticSource(6), TWO, 'standard', {
      teams: 8,
      minEmbodimentZ: -1,
      maxRepairRounds: 2,
    });
    expect(result.notes.join(' ')).toContain('short on catching');
    const pooledCs = result.players.filter((p) => !p.isPitcher && p.position === 'C').length;
    expect(pooledCs).toBe(6); // all six the source had
  }, 120_000);
});

describe('audit-fix regressions — C1B-1/2/3/4', () => {
  const TWO = pick('bomba-squad', 'whiteyball');

  it('C1B-2: the exported scorer IS the builder\'s posture-weighted fit (aggressive ≠ optimal on a boosted player)', async () => {
    const { archetypeFitScorer } = await import('../archetypeBalanceSimulator');
    const { archetypeCapShift } = await import('../../data/historicalArchetypes');
    const bomba = HISTORICAL_ARCHETYPES.find((a) => a.id === 'bomba-squad')!;
    const sim = { name: bomba.name, rawShift: archetypeCapShift(bomba) };
    const slugger = mkHitter('slug', '1B', 0); // profile 0 = slugger (POW-heavy)
    const optimal = archetypeFitScorer(sim, 'standard', 'optimal')(slugger);
    const aggressive = archetypeFitScorer(sim, 'standard', 'aggressive')(slugger);
    // Aggressive over-weights the BOOSTED band (×1.25) — a POW-heavy player must score higher
    // under aggressive than optimal for a POW-boost archetype. Equality = the divergence bug.
    expect(aggressive).toBeGreaterThan(optimal);
    // And the default is optimal (back-compat with C1's climb).
    expect(archetypeFitScorer(sim, 'standard')(slugger)).toBe(optimal);
  });

  it('C1B-1: an all-swing arms rack cannot silently satisfy league pitcher-BODY demand', () => {
    // Only 20 SP/RP arms: capability floors would be "satisfied" by ~20 dual-counted bodies, but
    // 8 teams need 64 pitcher BODIES. The total-body floor pulls every arm and NAMES the shortfall.
    const src: SimPlayer[] = [];
    let n = 0;
    for (let i = 0; i < 24; i += 1) src.push(mkHitter(`c${i}`, 'C', n++));
    for (const pos of ['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']) {
      for (let i = 0; i < 40; i += 1) src.push(mkHitter(`${pos.toLowerCase()}-${i}`, pos, n++));
    }
    for (let i = 0; i < 20; i += 1) src.push(mkPitcher(`sw${i}`, 'SP/RP', n++));

    const result = extractDraftPool(src, TWO, 'standard', {
      teams: 8,
      minEmbodimentZ: -1,
      maxRepairRounds: 1,
    });
    const pooledArms = result.players.filter((p) => p.isPitcher).length;
    expect(pooledArms).toBe(20); // every body the source had
    expect(result.notes.join(' ')).toContain('short on pitcher bodies');
    expect(result.notes.join(' ')).toContain('for 64 needed');
  }, 120_000);

  it('C1B-3: a non-MLB (farm) structure fails LOUDLY with the ruled farm semantics named', () => {
    const farmish = {
      slotsPerTeam: 10,
      primariesPerPosition: 1,
      catcherCoverage: 1,
      startableArms: 2,
      relievableArms: 2,
      minPitchers: 4,
      minPositionPlayers: 6,
    };
    expect(() =>
      extractDraftPool(syntheticSource(24), TWO, 'standard', { structure: farmish }),
    ).toThrow(/farm|MLB/);
  });

  it('C1B-R2-1: a PRIMARY-catcher shortfall is named even when coverage bodies mask it', () => {
    // 6 primary-C + 10 secondary-C coverers: coverage = 16 ≥ 8×2 (no coverage note), but 8 teams
    // need 8 primary-C STARTERS (Ruling A) — the primary shortfall must be NAMED, not silent.
    const src = syntheticSource(6);
    for (let i = 0; i < 10; i += 1) {
      src.push({ ...mkHitter(`covc${i}`, '1B', i + 3), id: `covc${i}`, secondaryPosition: 'C' });
    }
    const result = extractDraftPool(src, TWO, 'standard', {
      teams: 8,
      minEmbodimentZ: -1,
      maxRepairRounds: 1,
    });
    expect(result.notes.join(' ')).toContain('short on primary catchers: 6 for 8');
    expect(result.notes.join(' ')).not.toContain('short on catching'); // coverage itself sufficed
  }, 120_000);

  it('C1B-R2-2: the non-MLB guard is STRUCTURAL — a 22-slot non-MLB shape still fails loudly; a field-equal clone passes', () => {
    const sneaky = { ...MLB_POOL_STRUCTURE, catcherCoverage: 1 }; // 22 slots, not the MLB law
    expect(() =>
      extractDraftPool(syntheticSource(24), TWO, 'standard', { structure: sneaky }),
    ).toThrow(/farm|MLB/);

    const clone = { ...MLB_POOL_STRUCTURE }; // different object, identical fields — value identity OK
    const result = extractDraftPool(syntheticSource(24), TWO, 'standard', {
      teams: 8,
      minEmbodimentZ: -1,
      maxRepairRounds: 1,
      structure: clone,
    });
    expect(result.verdicts).toHaveLength(TWO.length);
  }, 120_000);

  it('C1B-4: extraction is a function of the player SET — reversed input order yields the identical pool', () => {
    const src = syntheticSource(24);
    const forward = extractDraftPool(src, TWO, 'standard', { teams: 8, minEmbodimentZ: -1, maxRepairRounds: 1 });
    const reversed = extractDraftPool([...src].reverse(), TWO, 'standard', {
      teams: 8,
      minEmbodimentZ: -1,
      maxRepairRounds: 1,
    });
    expect(reversed.players.map((p) => p.id)).toEqual(forward.players.map((p) => p.id));
    expect(reversed.verdicts.map((v) => `${v.archetypeId}:${v.band}`)).toEqual(
      forward.verdicts.map((v) => `${v.archetypeId}:${v.band}`),
    );
  }, 120_000);
});
