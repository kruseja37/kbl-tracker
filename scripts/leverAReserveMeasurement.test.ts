import { describe, expect, test } from 'vitest';

import { runLeverAReserveMeasurement } from '../src/engines/auctionSim';

const RUN_MEASUREMENT = process.env.RUN_LEVER_A_MEASUREMENT === '1';
const maybeTest = RUN_MEASUREMENT ? test : test.skip;

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

describe('Lever A reserve-price measurement', () => {
  maybeTest('runs the 4-team grounded/balanced k=0 and k=0.65 acceptance legs', () => {
    const report = runLeverAReserveMeasurement();
    const reserveRows = report.rows.filter((row) => row.legId === 'k065-reserve');
    const baselineByPreset = new Map(report.rows
      .filter((row) => row.legId === 'k0-baseline')
      .map((row) => [row.preset, row]));

    expect(report.baselineReproduced).toBe(true);
    expect(reserveRows.length).toBe(2);

    console.info('LEVER_A_RESERVE_MEASUREMENT');
    console.info(JSON.stringify({
      baselineReproduced: report.baselineReproduced,
      rows: report.rows.map((row) => ({
        preset: row.preset,
        leg: row.legId,
        k: row.reserveFractionK,
        runs: row.runs,
        spot11Mean: pct(row.spot11BudgetMean),
        spot11Median: pct(row.spot11BudgetMedian),
        belowReserveSales: row.belowReserveSaleCount,
        stuckTeams: row.stuckTeamCount,
        incompleteTeams: row.incompleteTeamCount,
        illegalFullTeams: row.illegalFullTeamCount,
        spreadMean: pct(row.rosterStrengthSpreadMean),
        spreadMedian: pct(row.rosterStrengthSpreadMedian),
        invariantFailures: row.invariantFailureCount,
      })),
    }, null, 2));

    for (const row of reserveRows) {
      const baseline = baselineByPreset.get(row.preset);
      expect(row.spot11BudgetMean, `${row.preset} spot-11 mean`).toBeGreaterThanOrEqual(0.35);
      expect(row.belowReserveSaleCount, `${row.preset} below-reserve sales`).toBe(0);
      expect(row.stuckTeamCount, `${row.preset} stuck teams`).toBe(0);
      expect(row.invariantFailureCount, `${row.preset} invariant failures`).toBe(0);
      expect(baseline, `${row.preset} baseline row`).toBeDefined();
      expect(row.rosterStrengthSpreadMean, `${row.preset} spread improved`).toBeLessThan(
        baseline?.rosterStrengthSpreadMean ?? Number.POSITIVE_INFINITY,
      );
    }
  }, 120_000);
});
