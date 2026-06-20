import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { writeLsimH2Report } from './report';
import { runLsimH2Suite, summarizeH2SuiteForConsole } from './seasonRunner';
import {
  CHECKPOINT_CADENCE_DEFAULT,
  normalizeCheckpointCadence,
} from '../../src/data/rosterEngineConstants';

describe('L-SIM H2 season runner and invariant suite', () => {
  const originalConsoleLog = console.log;
  const RealDate = Date;
  const fixedNow = Date.UTC(2026, 5, 19, 12, 0, 0);

  beforeEach(() => {
    class FrozenDate extends RealDate {
      constructor(...args: ConstructorParameters<DateConstructor>) {
        if (args.length === 0) {
          super(fixedNow);
        } else {
          super(...args);
        }
      }

      static now(): number {
        return fixedNow;
      }

      static parse(value: string): number {
        return RealDate.parse(value);
      }

      static UTC(
        year: number,
        monthIndex: number,
        date?: number,
        hours?: number,
        minutes?: number,
        seconds?: number,
        ms?: number,
      ): number {
        return RealDate.UTC(year, monthIndex, date ?? 1, hours ?? 0, minutes ?? 0, seconds ?? 0, ms ?? 0);
      }
    }

    globalThis.Date = FrozenDate as DateConstructor;
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].startsWith('[L-SIM')) {
        originalConsoleLog(...args);
      }
    });
  });

  afterEach(() => {
    globalThis.Date = RealDate;
    vi.restoreAllMocks();
  });

  test('runs the baseline season leg and same-seed determinism leg', async () => {
    const gamesPerTeam = Number(process.env.LSIM_H2_GAMES_PER_TEAM ?? 20);
    const checkpointCadence = normalizeCheckpointCadence(
      process.env.LSIM_H2_CHECKPOINT_CADENCE ?? CHECKPOINT_CADENCE_DEFAULT,
    );
    const summary = await runLsimH2Suite({
      seed: 'lsim-h2-baseline',
      gamesPerTeam,
      checkpointCadence,
      teamCount: 6,
      checkpointEvery: 10,
      writeCheckpoints: true,
    });

    await writeLsimH2Report(summary);
    console.log('[L-SIM-H2] summary', summarizeH2SuiteForConsole(summary));

    expect(summary.baseline.gamesSimulated).toBeGreaterThan(0);
    expect(summary.baseline.totalScheduledGames).toBe(Math.floor((6 * gamesPerTeam) / 2));
    expect(summary.determinism.firstGamesSimulated).toBeGreaterThan(0);
    expect(summary.determinism.secondGamesSimulated).toBeGreaterThan(0);
  }, 900_000);
});
