import { describe, expect, test } from 'vitest';

import {
  DEFAULT_AUCTION_TUNING_CASES,
  placeholderAuctionPriceBandPredictor,
  runAuctionTuningSuite,
} from './auctionTuningHarness';

const RUN_SIM = process.env.RUN_AUCTION_TUNING_SIM === '1';
const maybeTest = RUN_SIM ? test : test.skip;
const DEFAULT_RUNS = 2000;
const SIM_TEST_TIMEOUT_MS = Number.parseInt(process.env.AUCTION_TUNING_TIMEOUT_MS ?? '600000', 10);

describe('auction tuning simulation', () => {
  maybeTest('runs seeded roster-fill sweeps and reports price-band coverage', () => {
    const runs = Number.parseInt(process.env.AUCTION_TUNING_RUNS ?? `${DEFAULT_RUNS}`, 10);
    const summaries = runAuctionTuningSuite({
      cases: DEFAULT_AUCTION_TUNING_CASES,
      runs,
      predictor: placeholderAuctionPriceBandPredictor,
    });

    const failures = summaries.flatMap((summary) => summary.failures);

    expect(failures).toEqual([]);
    expect(summaries.every((summary) => summary.coverage.observedLots > 0)).toBe(true);
    expect(summaries.every((summary) => summary.coverage.soldLots > 0)).toBe(true);
    expect(summaries.every((summary) => Number.isFinite(summary.coverage.coverageRate))).toBe(true);

    console.info('AUCTION_TUNING_SIM_SUMMARY');
    console.info(JSON.stringify(summaries, null, 2));
  }, SIM_TEST_TIMEOUT_MS);
});
