/**
 * Season Simulator — 162-Game Full Season Test
 *
 * The old synthetic 162-game harness omitted product-mode identity. Its
 * preflight and full-season entry points must now fail closed before creating
 * phantom regular-season data.
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

const SEASON_ID = 'sim-162-season';
const SEED = 77777;

const awayRoster = generateRoster('EAGLES', 'Eagles');
const homeRoster = generateRoster('HAWKS', 'Hawks');

// ============================================
// PREFLIGHT: 1-Game Proof
// ============================================

describe('162-Game Simulator: Preflight', () => {
  test('identityless synthetic game is rejected instead of creating a phantom season mode', { timeout: 10_000 }, async () => {
    const game = generateSyntheticGame(awayRoster, homeRoster, {
      seed: SEED,
      gameNumber: 0,
    });

    expect(game.gameId).toBeDefined();
    expect(game.awayScore + game.homeScore).toBeGreaterThan(0);

    await expect(processCompletedGame(game, {
      seasonId: 'sim-162-preflight',
      detectMilestones: false,
    })).rejects.toBeInstanceOf(UnclassifiableGameModeError);
  });

});

// ============================================
// FULL 162-GAME SEASON
// ============================================

describe('162-Game Full Season Simulation', () => {
  test('identityless 162-game harness rejects instead of archiving a fourth mode', async () => {
    const identitylessGame = generateSyntheticGame(awayRoster, homeRoster, {
      seed: SEED + 2000,
      gameNumber: 0,
    });

    await expect(processCompletedGame(identitylessGame, {
      seasonId: SEASON_ID,
      detectMilestones: false,
    })).rejects.toBeInstanceOf(UnclassifiableGameModeError);
  });

});
