import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import {
  buildNumericPoolDiagnostics,
  quotaShapeFromPool,
  runScenarioMatrix,
  type AuctionSimPlayer,
} from '../auctionSim';

function hitter(position: string): RosterSlotPlayer {
  return { isPitcher: false, position, secondaryPosition: position === 'C' ? null : 'IF/OF' };
}

function player(id: string, numericGrade: number, bucketIndex: number): AuctionSimPlayer {
  return {
    playerId: id,
    iv: Math.round(2_000 + numericGrade * 1_250),
    numericGrade,
    pos: hitter(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'][bucketIndex % 8]),
    fitScore: ((bucketIndex * 17) % 100) / 100,
  };
}

function candidatePool(): AuctionSimPlayer[] {
  const players: AuctionSimPlayer[] = [];
  for (let i = 0; i < 20; i += 1) players.push(player(`high-${String(i).padStart(2, '0')}`, 82 + i * 0.2, i));
  for (let i = 0; i < 80; i += 1) players.push(player(`middle-${String(i).padStart(2, '0')}`, 59 + (i % 17), i));
  for (let i = 0; i < 30; i += 1) players.push(player(`low-${String(i).padStart(2, '0')}`, 45 + i * 0.3, i));
  return players;
}

describe('Lever B numeric pool shaping', () => {
  test('quota pool selection is deterministic and uses numeric grades, not letter buckets', () => {
    const pool = candidatePool();
    const first = quotaShapeFromPool(pool, { targetSize: 88 });
    const second = quotaShapeFromPool([...pool].reverse(), { targetSize: 88 });

    expect(first.players.map((p) => p.playerId)).toEqual(second.players.map((p) => p.playerId));
    expect(first.players.every((p) => typeof p.numericGrade === 'number')).toBe(true);
  });

  test('numeric curve accounting reports high tail, middle mass, low tail, and display letters separately', () => {
    const shaped = quotaShapeFromPool(candidatePool(), { targetSize: 88 });
    const diagnostics = buildNumericPoolDiagnostics(shaped.players);

    expect(diagnostics.numericGradeHistogram.length).toBeGreaterThan(0);
    expect(diagnostics.medianNumericGrade).not.toBeNull();
    expect(diagnostics.letterGradeSummary).not.toEqual({});
    expect(diagnostics.highTailShare).toBeLessThanOrEqual(0.2);
    expect(diagnostics.middleMassShare).toBeGreaterThan(0.55);
    expect(diagnostics.distributionDistanceFromTarget).toBeLessThan(0.35);
  });

  test('quota shortfalls are explicit when a numeric window lacks supply', () => {
    const thin = [
      ...Array.from({ length: 8 }, (_, index) => player(`only-high-${index}`, 88 + index, index)),
      ...Array.from({ length: 8 }, (_, index) => player(`only-low-${index}`, 46 + index, index)),
    ];
    const shaped = quotaShapeFromPool(thin, { targetSize: 16 });

    expect(shaped.quotaShortfalls.some((shortfall) => shortfall.windowId.includes('middle'))).toBe(true);
    expect(shaped.selectedSize).toBeLessThan(shaped.targetSize);
  });

  test('scenario matrix output is deterministic under the same seeds', () => {
    const input = {
      currentPool: candidatePool(),
      teams: [{ teamId: 't1' }, { teamId: 't2' }],
      seeds: ['a', 'b'],
      nominationPolicies: ['starFirst'] as const,
      quotaTargetSize: 44,
      baseConfig: {
        teamCount: 2,
        rosterSize: 22,
        budgetPerTeam: 1_000_000,
        bidIncrement: 1_000,
        spotBudgetCheckpoint: 11,
      },
    };
    expect(runScenarioMatrix(input)).toEqual(runScenarioMatrix(input));
  });

  test('Lever B modules stay isolated from UI and production pool builders', () => {
    const files = ['poolDiagnostics.ts', 'poolShapePolicies.ts', 'scenarioMatrix.ts'];
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), 'src/engines/auctionSim', file), 'utf8');
      expect(source).not.toContain('src_figma');
      expect(source).not.toContain('LeagueBuilderDraftSetup');
      expect(source).not.toContain('draftPoolExtractor');
      expect(source).not.toContain('poolFromDemand');
    }
  });
});
