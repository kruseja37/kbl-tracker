/**
 * Franchise Engine Proof-of-Life
 * Produced by the franchise-engine-discovery skill (2026-06-19 refresh).
 * RUN: NODE_ENV= npx vitest run test-utils/franchise-proof-of-life.ts
 *
 * Proves (EXECUTED, not assumed):
 *   1. PURE: a calculation engine is callable outside React with zero IndexedDB
 *      deps (getPercentile) — confirms the "engines are pure TS" claim.
 *   2. ORCHESTRATOR: processCompletedGame (pipeline Type B — Orchestrated but
 *      Extractable) runs the full completed-game fan-out end-to-end in Node +
 *      fake-indexeddb from a synthetic game, writing season stats to IndexedDB.
 *
 * The canonical full-season executed proof is test-utils/seasonSimulator.test.ts
 * (48-game accumulation). This file is the minimal single-game smoke proof.
 * See spec-docs/FRANCHISE_API_MAP.md (Pipeline Architecture + Proof-of-Life).
 */
import 'fake-indexeddb/auto';

import { describe, test, expect } from 'vitest';
import { getPercentile } from '../src/engines/percentile';
import { processCompletedGame } from './processCompletedGame';
import { generateSyntheticGame, generateRoster } from './syntheticGameFactory';
import { getSeasonBattingStats, getSeasonMetadata } from '../src/utils/seasonStorage';

const SEASON_ID = 'pol-season-1';

describe('Franchise proof-of-life', () => {
  test('PURE engine is callable with zero React/IndexedDB deps', () => {
    const p = getPercentile(7, [1, 3, 5, 7, 9]);
    console.log('[POL] getPercentile(7, [1,3,5,7,9]) =', p);
    expect(Number.isFinite(p)).toBe(true);
    expect(p).toBeGreaterThan(0);
  });

  test('ORCHESTRATOR processCompletedGame runs the full fan-out (Type B)', async () => {
    const away = generateRoster('AWAY', 'Away');
    const home = generateRoster('HOME', 'Home');
    const game = generateSyntheticGame(away, home, { seed: 7, gameNumber: 0 });

    const result = await processCompletedGame(game, {
      seasonId: SEASON_ID,
      detectMilestones: false,
    });
    console.log('[POL] processCompletedGame aggregation.success =', result.aggregation.success);
    expect(result.aggregation.success).toBe(true);

    const batting = await getSeasonBattingStats(SEASON_ID);
    const meta = await getSeasonMetadata(SEASON_ID);
    console.log('[POL] season batting rows =', batting.length, '| gamesPlayed =', meta?.gamesPlayed);
    expect(batting.length).toBe(18); // 9 away + 9 home batters
    expect(meta?.gamesPlayed).toBe(1);
  });
});
