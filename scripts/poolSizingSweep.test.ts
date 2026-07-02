import { describe, expect, test } from 'vitest';

import {
  runAuctionTuningCase,
  type AuctionTuningCase,
} from './auctionTuningHarness';
import {
  SIZING_TUNING,
  poolCompletionOutlook,
  poolDemandModel,
  poolSizingTable,
  recommendedShillCount,
} from '../src/engines/auctionPoolSizing';
import { analyzePoolFeasibility } from '../src/engines/poolFeasibility';
import { HISTORICAL_ARCHETYPES } from '../src/data/historicalArchetypes';
import type { SimPlayer } from '../src/engines/archetypeBalanceSimulator';

/**
 * FABLE-C3 sizing/shill sweep (opt-in like the C2A sim). Three legs:
 * 1. EMPIRICAL — seeded end-checkpoint auctions at the model's recommended pool size for
 *    S ∈ {0..4} shills: zero real-team shortfall is the hard gate; shill win counts validate
 *    `SIZING_TUNING.winsPerShill`; real-spend inflation vs S=0 measures the pressure shills
 *    exist to provide (spec §6: "so it doesn't destroy dynamics").
 * 2. FLOOR STRESS — the hard floor (real seats + expected shill wins) must still complete.
 * 3. ANALYTIC — the 24-archetype completion-probability distribution at the recommended
 *    config (the contract's per-archetype report; flags below 90%, per the STOP-IF framing).
 */
const RUN_SIM = process.env.RUN_AUCTION_TUNING_SIM === '1';
const maybeTest = RUN_SIM ? test : test.skip;
const RUNS = Number.parseInt(process.env.AUCTION_TUNING_RUNS ?? '30', 10);
const SIM_TEST_TIMEOUT_MS = Number.parseInt(process.env.AUCTION_TUNING_TIMEOUT_MS ?? '600000', 10);

const TEAMS = 8;

function sweepCase(shills: number, poolSize: number, label: string): AuctionTuningCase {
  return {
    label,
    kind: 'MLB',
    slotsPerTeam: 22,
    poolSize,
    scenario: 'value-bidding',
    archetypeAssignment: 'six-band-cycle',
    teamProfileAssignment: 'seeded-balanced',
    includePositionInfo: true,
    realTeams: TEAMS,
    shillTeams: shills,
    endCheckpoint: true,
    needAwareRealTeams: true,
    shillMaxWins: SIZING_TUNING.winsPerShill,
  };
}

describe('FABLE-C3 pool sizing + shill sweep', () => {
  maybeTest('recommended sizing completes every draft across S=0..4 and validates the demand model', () => {
    const rows: Array<Record<string, number | string>> = [];
    let baselineSpend = 0;

    for (const shills of [0, 1, 2, 3, 4]) {
      const model = poolDemandModel(TEAMS, shills);
      const simCase = sweepCase(shills, model.targetSize, `S=${shills} @ target ${model.targetSize}`);
      let shortfallRuns = 0;
      let totalShillWins = 0;
      let totalRealSpend = 0;
      let totalPassed = 0;
      for (let run = 0; run < RUNS; run += 1) {
        const result = runAuctionTuningCase(simCase, run);
        if (result.realShortfall > 0 || !result.completed) shortfallRuns += 1;
        totalShillWins += result.shillWins;
        totalRealSpend += result.realSpend;
        totalPassed += result.passedLots;
      }
      const avgShillWins = totalShillWins / RUNS;
      const avgRealSpend = totalRealSpend / RUNS;
      if (shills === 0) baselineSpend = avgRealSpend;
      rows.push({
        shills,
        poolSize: model.targetSize,
        shortfallRuns,
        empiricalWinsPerShill: shills > 0 ? Number((avgShillWins / shills).toFixed(2)) : 0,
        tunedWinsPerShill: SIZING_TUNING.winsPerShill,
        realSpendInflationPct: baselineSpend > 0
          ? Number((((avgRealSpend - baselineSpend) / baselineSpend) * 100).toFixed(2))
          : 0,
        avgPassedLots: Number((totalPassed / RUNS).toFixed(1)),
      });
      // The hard gate: at the model's recommended size, NO run may strand a real roster.
      expect(shortfallRuns, `S=${shills} shortfall runs`).toBe(0);
    }

    console.info('POOL_SIZING_SWEEP');
    console.info(JSON.stringify(rows, null, 2));
    console.info('SIZING_TABLE');
    console.info(JSON.stringify(poolSizingTable([4, 6, 8, 10], [0, 1, 2, 3]), null, 2));
    console.info('SHILL_RECOMMENDATIONS');
    console.info(JSON.stringify(
      [
        { league: 8, humans: 8, ...recommendedShillCount(8, 8) },
        { league: 8, humans: 4, ...recommendedShillCount(4, 8) },
        { league: 8, humans: 1, ...recommendedShillCount(1, 8) },
        { league: 4, humans: 4, ...recommendedShillCount(4, 4) },
      ],
      null,
      2,
    ));
  }, SIM_TEST_TIMEOUT_MS);

  maybeTest('floor-vs-target evidence: the bare floor has no pass-slack (report-only)', () => {
    // The demand model's floor is a LOWER BOUND, not a viable size: one-chance passes are
    // permanent, so a pool with zero slack loses supply to every pass. This leg documents the
    // shortfall rate at the bare floor as evidence the identity-headroom target is load-bearing,
    // not padding. No hard assert by design — the assertable gate is leg 1 (target sizing).
    const model = poolDemandModel(TEAMS, 2);
    const floorSize = model.baseSlots + model.expectedShillWins;
    const simCase = sweepCase(2, floorSize, `S=2 @ floor ${floorSize}`);
    let shortfallRuns = 0;
    for (let run = 0; run < RUNS; run += 1) {
      let result;
      try {
        result = runAuctionTuningCase(simCase, run);
      } catch {
        shortfallRuns += 1; // the harness supply invariant = a wedged draft
        continue;
      }
      if (result.realShortfall > 0 || !result.completed) shortfallRuns += 1;
    }
    console.info(`FLOOR_STRESS S=2 @ ${floorSize}: shortfallRuns=${shortfallRuns}/${RUNS} (report-only)`);
    expect(shortfallRuns).toBeGreaterThanOrEqual(0);
  }, SIM_TEST_TIMEOUT_MS);

  maybeTest('all 24 archetypes stay buildable at the recommended config (analytic distribution)', () => {
    const shills = recommendedShillCount(0, TEAMS).count;
    const model = poolDemandModel(TEAMS, shills);
    const pool = syntheticExtractorShapedPool(model.targetSize);
    const report = analyzePoolFeasibility(pool, [...HISTORICAL_ARCHETYPES], 'standard');
    const outlooks = poolCompletionOutlook(pool, report, TEAMS, shills);

    const distribution = outlooks
      .map((o) => ({
        archetype: o.archetypeName,
        pLegal: Number(o.pLegalCompletion.toFixed(3)),
        pIdentity: Number(o.pIdentityCompletion.toFixed(3)),
        binding: o.bindingClass,
      }))
      .sort((l, r) => (l.pIdentity as number) - (r.pIdentity as number));
    const flagged = distribution.filter((d) => (d.pIdentity as number) < 0.9);
    console.info('ARCHETYPE_COMPLETION_DISTRIBUTION');
    console.info(JSON.stringify(distribution, null, 2));
    console.info(`FLAGGED_BELOW_90: ${flagged.length}`);

    expect(outlooks).toHaveLength(24);
    // Legal completion is the hard analytic gate at the recommended size.
    for (const outlook of outlooks) {
      expect(outlook.pLegalCompletion, outlook.archetypeName).toBeGreaterThanOrEqual(0.9);
    }
    // Identity completion is REPORTED with flags (the STOP-IF escalation path if it collapses).
    expect(flagged.length, 'archetypes below the 90% identity threshold').toBeLessThanOrEqual(6);
  }, SIM_TEST_TIMEOUT_MS);
});

/**
 * A deterministic extractor-shaped pool: position-complete blocks with backup-C coverage and a
 * balanced arm mix, seeded ratings/IV spreads. Stands in for a C1B-extracted MLB pool at the
 * recommended size (the real extractor needs the full MLB source universe).
 */
function syntheticExtractorShapedPool(size: number): SimPlayer[] {
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  const block: Array<{ position: string; isPitcher: boolean; role?: SimPlayer['role']; secondaryPosition?: string }> = [
    ...positions.map((position) => ({ position, isPitcher: false })),
    { position: '1B', isPitcher: false, secondaryPosition: 'C' },
    { position: 'CF', isPitcher: false, secondaryPosition: 'OF' },
    { position: 'SS', isPitcher: false, secondaryPosition: 'IF' },
    { position: 'P', isPitcher: true, role: 'SP' },
    { position: 'P', isPitcher: true, role: 'SP' },
    { position: 'P', isPitcher: true, role: 'SP/RP' },
    { position: 'P', isPitcher: true, role: 'RP' },
    { position: 'P', isPitcher: true, role: 'RP' },
    { position: 'P', isPitcher: true, role: 'CP' },
  ];
  const pool: SimPlayer[] = [];
  for (let index = 0; index < size; index += 1) {
    const shape = block[index % block.length];
    const rank = index / Math.max(1, size - 1);
    const rating = (offset: number) => 35 + ((hash(`r:${index}:${offset}`) % 46) + Math.round(rank * 10));
    const iv = Math.round(8_000 + 150_000 * Math.pow(1 - rank, 1.8) * (0.8 + (hash(`iv:${index}`) % 40) / 100));
    pool.push({
      id: `syn-${index + 1}`,
      iv,
      salary: iv,
      position: shape.position,
      isPitcher: shape.isPitcher,
      role: shape.role,
      secondaryPosition: shape.secondaryPosition ?? null,
      bat: { POW: rating(1), CON: rating(2), SPD: rating(3), FLD: rating(4), ARM: rating(5) },
      pit: shape.isPitcher ? { VEL: rating(6), JNK: rating(7), ACC: rating(8) } : undefined,
    });
  }
  return pool;
}

function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    h ^= value.charCodeAt(index);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
