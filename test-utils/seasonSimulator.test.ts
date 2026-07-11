/**
 * Season Simulator — Integration Test
 *
 * Legacy synthetic games intentionally omit product-mode identity. Verify the
 * production completion pipeline now rejects those fixtures instead of
 * treating them as a fourth, casual-season mode. Synthetic generation itself
 * remains useful for deterministic score checks.
 *
 * NOTE: detectMilestones=false because careerStorage opens kbl-tracker at v3
 * while seasonStorage opens at v2. In a fresh fake-indexeddb, this creates a
 * version conflict (the v2 connection blocks the v3 upgrade). In the browser
 * the DB persists at v3 from the first load, so this never happens. This is a
 * known test-only limitation; milestone aggregation is tested separately in
 * milestoneDetector.test.ts.
 *
 * Per FRANCHISE_API_MAP.md: Classification B (Orchestrated but Extractable)
 * Uses fake-indexeddb as recommended in §11.
 */

// ============================================
// SHIM: Must come before ALL imports that touch IndexedDB
// ============================================
import 'fake-indexeddb/auto';

import { describe, test, expect } from 'vitest';
import { processCompletedGame } from './processCompletedGame';
import { generateSyntheticGame, generateRoster } from './syntheticGameFactory';
import { UnclassifiableGameModeError } from '../src/utils/gameStorage';

// ============================================
// FIXTURES
// ============================================

const SEASON_ID = 'sim-season-1';
const SEED = 42;

const awayRoster = generateRoster('TIGERS', 'Tigers');
const homeRoster = generateRoster('SOX', 'Sox');

// ============================================
// PREFLIGHT: 1 Synthetic Game
// ============================================

describe('Preflight: Single game through pipeline', () => {
  test('identityless synthetic game is rejected instead of creating a phantom season mode', { timeout: 10_000 }, async () => {
    const game = generateSyntheticGame(awayRoster, homeRoster, {
      seed: SEED,
      gameNumber: 0,
    });

    expect(game.gameId).toContain('sim-game-0');
    expect(game.awayScore + game.homeScore).toBeGreaterThan(0);

    await expect(processCompletedGame(game, {
      seasonId: SEASON_ID,
      detectMilestones: false,
    })).rejects.toBeInstanceOf(UnclassifiableGameModeError);
  });

  test('game stats sum correctly across playerStats', async () => {
    const game = generateSyntheticGame(awayRoster, homeRoster, {
      seed: SEED + 1,
      gameNumber: 99,
    });

    // Total runs in playerStats should match team scores
    // (approximately — RNG may not perfectly align due to HR counting)
    const awayPlayerRuns = awayRoster.batters.reduce(
      (sum, b) => sum + (game.playerStats[b.playerId]?.r || 0), 0
    );
    const homePlayerRuns = homeRoster.batters.reduce(
      (sum, b) => sum + (game.playerStats[b.playerId]?.r || 0), 0
    );

    expect(awayPlayerRuns).toBe(game.awayScore);
    expect(homePlayerRuns).toBe(game.homeScore);
  });
});

// ============================================
// FULL SEASON: 48-Game Simulation
// ============================================

describe('Full 48-game season simulation', () => {
  const FULL_SEASON_ID = 'sim-full-season';

  test('identityless 48-game harness rejects instead of archiving a fourth mode', async () => {
    const identitylessGame = generateSyntheticGame(awayRoster, homeRoster, {
      seed: SEED + 1000,
      gameNumber: 0,
    });

    await expect(processCompletedGame(identitylessGame, {
      seasonId: FULL_SEASON_ID,
      detectMilestones: false,
    })).rejects.toBeInstanceOf(UnclassifiableGameModeError);
  });

  test('deterministic seed produces identical results', async () => {
    const DETERM_SEASON = 'sim-deterministic';
    const FIXED_SEED = 12345;

    // Run 5 games with one seed
    const results1: number[] = [];
    for (let g = 0; g < 5; g++) {
      const game = generateSyntheticGame(awayRoster, homeRoster, {
        seed: FIXED_SEED,
        gameNumber: g,
      });
      results1.push(game.awayScore, game.homeScore);
    }

    // Run 5 games with same seed
    const results2: number[] = [];
    for (let g = 0; g < 5; g++) {
      const game = generateSyntheticGame(awayRoster, homeRoster, {
        seed: FIXED_SEED,
        gameNumber: g,
      });
      results2.push(game.awayScore, game.homeScore);
    }

    expect(results1).toEqual(results2);
  });
});
