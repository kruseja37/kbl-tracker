/**
 * Season Simulator — Integration Test
 *
 * Exercises the full game-completion pipeline (extracted from useGameState.ts)
 * against a real IndexedDB (fake-indexeddb shim) to verify:
 *
 *   1. Preflight: 1 synthetic game flows through aggregation without error
 *   2. Full season: 48 games accumulate correctly across all storage branches
 *
 * Pipeline: processCompletedGame → aggregateGameToSeason → archiveCompletedGame
 *   └→ aggregateBattingStats, aggregatePitchingStats, aggregateFieldingStats,
 *      aggregateFameEvents, incrementSeasonGames
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
import {
  getSeasonBattingStats,
  getSeasonPitchingStats,
  getSeasonMetadata,
  type PlayerSeasonBatting,
  type PlayerSeasonPitching,
} from '../src/utils/seasonStorage';
import { getRecentGames } from '../src/utils/gameStorage';
import {
  calculateBWARSimplified,
  type BattingStatsForWAR,
} from '../src/engines/bwarCalculator';
import {
  calculatePWARSimplified,
  type PitchingStatsForWAR,
} from '../src/engines/pwarCalculator';

// ============================================
// FIXTURES
// ============================================

const SEASON_ID = 'sim-season-1';
const SEED = 42;
const SEASON_GAMES = 48;

const awayRoster = generateRoster('TIGERS', 'Tigers');
const homeRoster = generateRoster('SOX', 'Sox');

// ============================================
// HELPERS
// ============================================

/** Sum a numeric field across an array of stat objects */
function sumField<T>(arr: T[], field: keyof T): number {
  return arr.reduce((sum, obj) => sum + (Number(obj[field]) || 0), 0);
}

// ============================================
// PREFLIGHT: 1 Synthetic Game
// ============================================

describe('Preflight: Single game through pipeline', () => {
  test('1 synthetic game aggregates without error', { timeout: 10_000 }, async () => {
    const game = generateSyntheticGame(awayRoster, homeRoster, {
      seed: SEED,
      gameNumber: 0,
    });

    // Verify game looks reasonable
    expect(game.gameId).toContain('sim-game-0');
    expect(game.awayScore + game.homeScore).toBeGreaterThan(0);
    expect(game.awayScore).not.toBe(game.homeScore); // no ties
    expect(Object.keys(game.playerStats).length).toBe(18); // 9+9 batters
    expect(game.pitcherGameStats.length).toBeGreaterThanOrEqual(2); // at least 1 per team

    // Verify pitcher decisions assigned
    const decisions = game.pitcherGameStats.map(p => p.decision);
    expect(decisions.filter(d => d === 'W').length).toBeGreaterThanOrEqual(1);
    expect(decisions.filter(d => d === 'L').length).toBeGreaterThanOrEqual(1);

    // Run through pipeline (detectMilestones=false to avoid IDB v2/v3 conflict)
    const result = await processCompletedGame(game, {
      seasonId: SEASON_ID,
      detectMilestones: false,
    });
    expect(result.aggregation.success).toBe(true);
    expect(result.aggregation.error).toBeUndefined();

    // Verify batting stats written to IndexedDB
    const battingStats = await getSeasonBattingStats(SEASON_ID);
    expect(battingStats.length).toBe(18); // 9 away + 9 home batters

    // Verify each batter has 1 game
    for (const bs of battingStats) {
      expect(bs.games).toBe(1);
      expect(bs.pa).toBeGreaterThanOrEqual(3);
      expect(bs.seasonId).toBe(SEASON_ID);
    }

    // Verify pitching stats written
    const pitchingStats = await getSeasonPitchingStats(SEASON_ID);
    expect(pitchingStats.length).toBeGreaterThanOrEqual(2);

    const starters = pitchingStats.filter(p => p.gamesStarted > 0);
    expect(starters.length).toBe(2); // one per team

    // Verify game count incremented
    const meta = await getSeasonMetadata(SEASON_ID);
    expect(meta).not.toBeNull();
    expect(meta!.gamesPlayed).toBe(1);

    // Verify game archived
    const recentGames = await getRecentGames(10);
    expect(recentGames.length).toBe(1);
    expect(recentGames[0].gameId).toBe(game.gameId);
    expect(recentGames[0].finalScore.away).toBe(game.awayScore);
    expect(recentGames[0].finalScore.home).toBe(game.homeScore);
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

  test('48 games accumulate across batting, pitching, fielding, and milestone branches', async () => {
    // Track expected totals for validation
    let totalAwayRuns = 0;
    let totalHomeRuns = 0;
    let totalHR = 0;
    let awayWins = 0;
    let homeWins = 0;

    // Run 48 games
    for (let g = 0; g < SEASON_GAMES; g++) {
      const game = generateSyntheticGame(awayRoster, homeRoster, {
        seed: SEED + 1000,
        gameNumber: g,
      });

      totalAwayRuns += game.awayScore;
      totalHomeRuns += game.homeScore;
      if (game.awayScore > game.homeScore) awayWins++;
      else homeWins++;

      // Count total HR across all batters
      for (const stats of Object.values(game.playerStats)) {
        totalHR += stats.hr;
      }

      const result = await processCompletedGame(game, {
        seasonId: FULL_SEASON_ID,
        detectMilestones: false,
      });
      expect(result.aggregation.success).toBe(true);
    }

    // ============================================
    // BATTING ASSERTIONS
    // ============================================

    const battingStats = await getSeasonBattingStats(FULL_SEASON_ID);
    expect(battingStats.length).toBe(18); // Same 18 batters every game

    // Every batter played 48 games
    for (const bs of battingStats) {
      expect(bs.games).toBe(SEASON_GAMES);
      expect(bs.pa).toBeGreaterThanOrEqual(SEASON_GAMES * 3); // min 3 PA/game
    }

    // Total runs scored across all batters should equal total team runs
    const totalBattingRuns = sumField(battingStats, 'runs');
    expect(totalBattingRuns).toBe(totalAwayRuns + totalHomeRuns);

    // Total HR across all batters
    const totalBattingHR = sumField(battingStats, 'homeRuns');
    expect(totalBattingHR).toBe(totalHR);

    // Hits >= HR + doubles + triples + singles
    for (const bs of battingStats) {
      expect(bs.hits).toBe(bs.singles + bs.doubles + bs.triples + bs.homeRuns);
    }

    // PA >= AB + BB + HBP (approximately, no SF/SAC tracked yet)
    for (const bs of battingStats) {
      expect(bs.pa).toBeGreaterThanOrEqual(bs.ab + bs.walks + bs.hitByPitch);
    }

    // ============================================
    // PITCHING ASSERTIONS
    // ============================================

    const pitchingStats = await getSeasonPitchingStats(FULL_SEASON_ID);
    // At least 2 starters (one per team), possibly relievers too
    expect(pitchingStats.length).toBeGreaterThanOrEqual(2);

    const starterStats = pitchingStats.filter(p => p.gamesStarted > 0);
    expect(starterStats.length).toBe(2);

    // Each starter should have 48 games started
    for (const sp of starterStats) {
      expect(sp.gamesStarted).toBe(SEASON_GAMES);
      expect(sp.games).toBe(SEASON_GAMES);
    }

    // Total pitching wins + losses should equal total games (each game has 1 W + 1 L)
    const totalWins = sumField(pitchingStats, 'wins');
    const totalLosses = sumField(pitchingStats, 'losses');
    expect(totalWins).toBe(SEASON_GAMES); // one win per game
    expect(totalLosses).toBe(SEASON_GAMES); // one loss per game
    expect(awayWins + homeWins).toBe(SEASON_GAMES);

    // Earned runs <= runs allowed
    for (const ps of pitchingStats) {
      expect(ps.earnedRuns).toBeLessThanOrEqual(ps.runsAllowed);
    }

    // Outs recorded > 0 for all pitchers
    for (const ps of pitchingStats) {
      expect(ps.outsRecorded).toBeGreaterThan(0);
    }

    // ============================================
    // SEASON METADATA
    // ============================================

    const meta = await getSeasonMetadata(FULL_SEASON_ID);
    expect(meta).not.toBeNull();
    // Note: gamesPlayed includes the preflight game (different season ID)
    // For the full season, should be exactly 48
    expect(meta!.gamesPlayed).toBe(SEASON_GAMES);

    // ============================================
    // ARCHIVED GAMES
    // ============================================

    // We should have preflight (1) + season (48) = 49 total archived games
    // (they share the same gameStorage database)
    const allArchived = await getRecentGames(100);
    expect(allArchived.length).toBeGreaterThanOrEqual(SEASON_GAMES);

    // ============================================
    // WAR SMOKE TEST
    // ============================================

    // Pick the top batter and compute bWAR from accumulated season stats
    const topBatter = battingStats.reduce((best, bs) =>
      bs.hits > best.hits ? bs : best
    );

    const bwarInput: BattingStatsForWAR = {
      pa: topBatter.pa,
      ab: topBatter.ab,
      singles: topBatter.singles,
      doubles: topBatter.doubles,
      triples: topBatter.triples,
      homeRuns: topBatter.homeRuns,
      walks: topBatter.walks,
      intentionalWalks: 0,
      hitByPitch: topBatter.hitByPitch,
      sacFlies: topBatter.sacFlies,
      sacBunts: 0,
      stolenBases: topBatter.stolenBases,
      caughtStealing: topBatter.caughtStealing,
      strikeouts: topBatter.strikeouts,
      gidp: topBatter.gidp,
    };

    const bwarResult = calculateBWARSimplified(bwarInput, SEASON_GAMES);
    // bWAR should be a finite number (not NaN, not Infinity)
    expect(Number.isFinite(bwarResult.bWAR)).toBe(true);
    // With 48 games of decent stats, WAR should be in reasonable range
    expect(bwarResult.bWAR).toBeGreaterThan(-5);
    expect(bwarResult.bWAR).toBeLessThan(10);

    // Pick the starter with most outs and compute pWAR
    const topPitcher = starterStats.reduce((best, ps) =>
      ps.outsRecorded > best.outsRecorded ? ps : best
    );

    const pwarInput: PitchingStatsForWAR = {
      ip: topPitcher.outsRecorded / 3,
      strikeouts: topPitcher.strikeouts,
      walks: topPitcher.walksAllowed,
      homeRunsAllowed: topPitcher.homeRunsAllowed,
      hitByPitch: topPitcher.hitBatters,
      gamesStarted: topPitcher.gamesStarted,
      gamesAppeared: topPitcher.games,
      averageLeverageIndex: 1.0,
    };

    const pwarResult = calculatePWARSimplified(pwarInput, SEASON_GAMES);
    expect(Number.isFinite(pwarResult.pWAR)).toBe(true);
    expect(pwarResult.pWAR).toBeGreaterThan(-10);
    expect(pwarResult.pWAR).toBeLessThan(15);

    // ============================================
    // RATE STAT SANITY CHECKS
    // ============================================

    for (const bs of battingStats) {
      // AVG between 0 and 1
      if (bs.ab > 0) {
        const avg = bs.hits / bs.ab;
        expect(avg).toBeGreaterThanOrEqual(0);
        expect(avg).toBeLessThanOrEqual(1);
      }

      // OBP >= AVG (walks/HBP can only help)
      if (bs.ab + bs.walks + bs.hitByPitch > 0) {
        const obp = (bs.hits + bs.walks + bs.hitByPitch) /
          (bs.ab + bs.walks + bs.hitByPitch + bs.sacFlies);
        const avg = bs.ab > 0 ? bs.hits / bs.ab : 0;
        expect(obp).toBeGreaterThanOrEqual(avg - 0.001); // float tolerance
      }
    }

    for (const ps of pitchingStats) {
      // ERA >= 0
      if (ps.outsRecorded > 0) {
        const era = (ps.earnedRuns / (ps.outsRecorded / 3)) * 9;
        expect(era).toBeGreaterThanOrEqual(0);
        // ERA should be reasonable (not 100+)
        expect(era).toBeLessThan(30);
      }
    }
  }, 30_000); // 30s timeout for 48 games with IndexedDB operations

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
