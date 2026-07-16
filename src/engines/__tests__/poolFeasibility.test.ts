import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  analyzePoolFeasibility,
  DEMAND_HITTER,
  type FeasibilityShortfall,
} from '../poolFeasibility';
import type { SimPlayer } from '../archetypeBalanceSimulator';
import { HISTORICAL_ARCHETYPES, type ArchetypeStat, type HistoricalArchetype } from '../../data/historicalArchetypes';

// Timeout-only housekeeping (JK/Fable 2026-07-01): the pool-feasibility sim needs ~10s under batch
// load, over vitest's 5s default → a phantom "batch-flake" red. Raise the file-wide test timeout;
// assertions untouched.
vi.setConfig({ testTimeout: 30000 });

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

type PlayerGroup = 'hitters' | 'rotation' | 'bullpen';

function isGroupMember(player: SimPlayer, group: PlayerGroup): boolean {
  if (group === 'hitters') return !player.isPitcher;
  if (group === 'rotation') return player.isPitcher && (player.role === 'SP' || player.role === 'SP/RP');
  return player.isPitcher && (player.role === 'RP' || player.role === 'CP' || player.role === 'SP/RP');
}

function ratingForStat(player: SimPlayer, stat: ArchetypeStat): number {
  switch (stat) {
    case 'POW':
    case 'CON':
    case 'SPD':
    case 'FLD':
    case 'ARM':
      return player.bat[stat] ?? 0;
    case 'ROT_POW':
      return player.bat.POW ?? 0;
    case 'ROT_CON':
      return player.bat.CON ?? 0;
    case 'ROT_VEL':
    case 'PEN_VEL':
      return player.pit?.VEL ?? 0;
    case 'ROT_JNK':
    case 'PEN_JNK':
      return player.pit?.JNK ?? 0;
    case 'ROT_ACC':
    case 'PEN_ACC':
      return player.pit?.ACC ?? 0;
  }
}

function p67(pool: SimPlayer[], stat: ArchetypeStat, group: PlayerGroup): number {
  const ratings = pool
    .filter((player) => isGroupMember(player, group))
    .map((player) => ratingForStat(player, stat))
    .sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(ratings.length - 1, Math.ceil(0.67 * ratings.length) - 1));
  return ratings[idx] ?? 0;
}

function getResult(report: ReturnType<typeof analyzePoolFeasibility>, archetypeId: string) {
  const result = report.results.find((entry) => entry.archetypeId === archetypeId);
  expect(result).toBeDefined();
  return result!;
}

function getShortfall(shortfalls: FeasibilityShortfall[], stat: ArchetypeStat): FeasibilityShortfall {
  const shortfall = shortfalls.find((entry) => entry.stat === stat);
  expect(shortfall).toBeDefined();
  return shortfall!;
}

function syntheticPlayer(id: string, overrides: Partial<SimPlayer>): SimPlayer {
  return {
    id,
    isPitcher: false,
    bat: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0 },
    iv: 100_000,
    salary: 1,
    position: '1B',
    ...overrides,
  } satisfies SimPlayer;
}

function buildSyntheticPool(): SimPlayer[] {
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'C', '1B', '2B', '3B', 'SS'];
  const hitters = positions.map((position, index) => {
    const rating = index + 1;
    return syntheticPlayer(`h-${index}`, {
      position,
      bat: { POW: rating, CON: rating, SPD: rating, FLD: rating, ARM: rating },
    });
  });
  const starters = Array.from({ length: 9 }, (_, index) => syntheticPlayer(`sp-${index}`, {
    isPitcher: true,
    role: 'SP',
    position: 'SP',
    bat: { POW: index + 1, CON: index + 1, SPD: 0, FLD: 0, ARM: 0 },
    pit: { VEL: index + 1, JNK: index + 1, ACC: index + 1 },
  }));
  const relievers = Array.from({ length: 5 }, (_, index) => syntheticPlayer(`rp-${index}`, {
    isPitcher: true,
    role: index === 4 ? 'CP' : 'RP',
    position: index === 4 ? 'CP' : 'RP',
    pit: { VEL: index + 1, JNK: index + 1, ACC: index + 1 },
  }));
  return [...hitters, ...starters, ...relievers];
}

function archetype(id: string, name: string, stat: ArchetypeStat): HistoricalArchetype {
  return {
    id,
    name,
    exemplars: [],
    era: 'test',
    lore: 'test',
    identity: 'test',
    boosts: [stat],
    nerfs: [],
    spec: { [stat]: 1 },
  };
}

describe('pool feasibility analyzer', () => {
  it('classifies every archetype as supported on the full canonical pool', () => {
    const pool = loadPool();
    const report = analyzePoolFeasibility(pool, HISTORICAL_ARCHETYPES, 'standard', 20, pool);

    expect(pool).toHaveLength(440);
    expect(report.poolSize).toBe(440);
    expect(report.results).toHaveLength(HISTORICAL_ARCHETYPES.length);
    expect(report.results.map((result) => result.archetypeId)).toEqual(HISTORICAL_ARCHETYPES.map((arch) => arch.id));
    expect(report.results.every((result) => result.support === 'supported')).toBe(true);
    expect(report.results.every((result) => result.activationPrompt === null)).toBe(true);
  });

  it('requires the same starters to carry every boosted pitcher-hitting axis', () => {
    const reference = buildSyntheticPool();
    const complete = archetype('complete-starters', 'Complete Starters', 'ROT_POW');
    complete.boosts = ['ROT_POW', 'ROT_CON'];
    complete.spec = { ROT_POW: 1, ROT_CON: 1 };
    const stripped = reference.map((player) => {
      if (player.id === 'sp-8' || player.id === 'sp-6') return { ...player, bat: { ...player.bat, CON: 0 } };
      if (player.id === 'sp-7') return { ...player, bat: { ...player.bat, POW: 0 } };
      return player;
    });

    const starved = getResult(analyzePoolFeasibility(stripped, [complete], 'standard', 2, reference), complete.id);
    const joint = starved.shortfalls.find((row) => row.jointStats?.length === 2);
    expect(joint).toMatchObject({ binding: true, needCount: 3, supply: 0 });
    expect(starved.support).toBe('starved');

    const restored = getResult(analyzePoolFeasibility(reference, [complete], 'standard', 2, reference), complete.id);
    expect(restored.shortfalls.find((row) => row.jointStats?.length === 2)).toMatchObject({
      binding: true,
      needCount: 0,
      supply: 3,
    });
  });

  it('flags FLD shortfalls in glove-stripped archetypes against the full-pool reference', () => {
    const fullPool = loadPool();
    const fldThreshold = p67(fullPool, 'FLD', 'hitters');
    const strippedPool = fullPool.filter((player) => player.isPitcher || player.bat.FLD < fldThreshold);
    const report = analyzePoolFeasibility(strippedPool, HISTORICAL_ARCHETYPES, 'standard', 20, fullPool);

    for (const archetypeId of ['whiteyball', 'go-go-small-ball', 'the-oriole-way']) {
      const result = getResult(report, archetypeId);
      const fld = getShortfall(result.shortfalls, 'FLD');
      expect(fld.needCount).toBeGreaterThan(0);
      expect(fld.descriptor).toBe('rangy defenders');
      expect(result.activationPrompt).not.toBeNull();
    }
  });

  it('flags binding ROT_ACC shortfalls as starved in command-stripped archetypes', () => {
    const fullPool = loadPool();
    const accThreshold = p67(fullPool, 'ROT_ACC', 'rotation');
    const strippedPool = fullPool.filter((player) => (
      !isGroupMember(player, 'rotation') || ratingForStat(player, 'ROT_ACC') < accThreshold
    ));
    const report = analyzePoolFeasibility(strippedPool, HISTORICAL_ARCHETYPES, 'standard', 20, fullPool);

    for (const archetypeId of ['junkball-surgeons', 'the-oriole-way']) {
      const result = getResult(report, archetypeId);
      const acc = getShortfall(result.shortfalls, 'ROT_ACC');
      expect(acc.needCount).toBeGreaterThan(0);
      expect(result.support).toBe('starved');
    }
  });

  it('marks a too-thin pool starved and emits the fieldability prompt', () => {
    const thinPool = loadPool().filter((player) => !player.isPitcher).slice(0, 18);
    const report = analyzePoolFeasibility(thinPool, HISTORICAL_ARCHETYPES, 'standard', 20);
    const tooThin = report.results.find((result) => (
      result.built.rosterSize < 22 &&
      result.activationPrompt === `This pool is too thin to field a full ${result.archetypeName} roster — add more players.`
    ));

    expect(tooThin).toBeDefined();
    expect(tooThin?.support).toBe('starved');
  });

  it('is deterministic for identical inputs', () => {
    const pool = loadPool();
    const first = analyzePoolFeasibility(pool, HISTORICAL_ARCHETYPES, 'standard', 20, pool);
    const second = analyzePoolFeasibility(pool, HISTORICAL_ARCHETYPES, 'standard', 20, pool);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('uses an explicit budget override for the surfaced feasibility budget', () => {
    const pool = loadPool();
    const report = analyzePoolFeasibility(pool, HISTORICAL_ARCHETYPES.slice(0, 2), 'standard', 20, pool, 777_777);

    expect(report.budget).toBe(777_777);
  });

  it('classifies equal-sized flavor shortfalls as thin and binding shortfalls as starved', () => {
    const pool = buildSyntheticPool();
    const flavor = archetype('flavor-gloves', 'Flavor Gloves', 'FLD');
    const binding = archetype('binding-power', 'Binding Power', 'POW');
    const report = analyzePoolFeasibility(pool, [flavor, binding], 'standard', 20);
    const flavorResult = getResult(report, 'flavor-gloves');
    const bindingResult = getResult(report, 'binding-power');
    const fld = getShortfall(flavorResult.shortfalls, 'FLD');
    const pow = getShortfall(bindingResult.shortfalls, 'POW');

    expect(fld.needCount).toBe(DEMAND_HITTER - 5);
    expect(pow.needCount).toBe(fld.needCount);
    expect(flavorResult.shortfalls.filter((shortfall) => shortfall.needCount > 0).map((shortfall) => shortfall.stat)).toEqual(['FLD']);
    expect(bindingResult.shortfalls.filter((shortfall) => shortfall.needCount > 0).map((shortfall) => shortfall.stat)).toEqual(['POW']);
    expect(flavorResult.support).toBe('thin');
    expect(bindingResult.support).toBe('starved');
  });
});
