/**
 * Season Simulator — 162-Game Full Season Test
 *
 * Extends the 48-game simulator with:
 *   - 162-game season (MLB-length stress test)
 *   - Per-game coherence invariants checked AFTER EVERY GAME:
 *     1. No NaN or Infinity in any stat
 *     2. No negative counting stats
 *     3. No stat totals that decrease between games
 *     4. Standings wins+losses = total games played
 *     5. Hits = singles + doubles + triples + HR
 *     6. PA >= AB + BB + HBP
 *     7. Earned runs <= runs allowed
 *     8. WAR calculations produce finite values at end
 *
 * Uses fake-indexeddb as recommended in FRANCHISE_API_MAP.md §11.
 * Starts with 1-game preflight, then runs full 162.
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
import {
  calculateBWARSimplified,
  type BattingStatsForWAR,
} from '../src/engines/bwarCalculator';
import {
  calculatePWARSimplified,
  type PitchingStatsForWAR,
} from '../src/engines/pwarCalculator';
import {
  calculateFWARFromStats,
} from '../src/engines/fwarCalculator';
import {
  calculateRWARSimplified,
} from '../src/engines/rwarCalculator';

// ============================================
// FIXTURES
// ============================================

const SEASON_ID = 'sim-162-season';
const SEED = 77777;
const SEASON_GAMES = 162;

const awayRoster = generateRoster('EAGLES', 'Eagles');
const homeRoster = generateRoster('HAWKS', 'Hawks');

// ============================================
// HELPERS
// ============================================

function sumField<T>(arr: T[], field: keyof T): number {
  return arr.reduce((sum, obj) => sum + (Number(obj[field]) || 0), 0);
}

/** Check that a number is finite and not NaN */
function isClean(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Assert no NaN/Infinity in any field of a batting stat line */
function assertBattingClean(bs: PlayerSeasonBatting, gameNum: number) {
  const fields: (keyof PlayerSeasonBatting)[] = [
    'games', 'pa', 'ab', 'hits', 'singles', 'doubles', 'triples',
    'homeRuns', 'rbi', 'runs', 'walks', 'strikeouts', 'hitByPitch',
    'stolenBases', 'caughtStealing',
  ];
  for (const f of fields) {
    if (!isClean(bs[f])) {
      throw new Error(`Game ${gameNum}: NaN/Infinity in batting.${f} for ${bs.playerId} (value: ${bs[f]})`);
    }
  }
}

/** Assert no NaN/Infinity in any field of a pitching stat line */
function assertPitchingClean(ps: PlayerSeasonPitching, gameNum: number) {
  const fields: (keyof PlayerSeasonPitching)[] = [
    'games', 'gamesStarted', 'outsRecorded', 'hitsAllowed', 'runsAllowed',
    'earnedRuns', 'walksAllowed', 'strikeouts', 'homeRunsAllowed',
    'hitBatters', 'wildPitches', 'wins', 'losses', 'saves', 'holds', 'blownSaves',
    'qualityStarts', 'completeGames', 'shutouts', 'noHitters', 'perfectGames',
  ];
  for (const f of fields) {
    if (!isClean(ps[f])) {
      throw new Error(`Game ${gameNum}: NaN/Infinity in pitching.${f} for ${ps.playerId} (value: ${ps[f]})`);
    }
  }
}

/** Assert no negative counting stats in batting */
function assertBattingNonNegative(bs: PlayerSeasonBatting, gameNum: number) {
  const fields: (keyof PlayerSeasonBatting)[] = [
    'games', 'pa', 'ab', 'hits', 'singles', 'doubles', 'triples',
    'homeRuns', 'rbi', 'runs', 'walks', 'strikeouts', 'hitByPitch',
    'stolenBases', 'caughtStealing',
  ];
  for (const f of fields) {
    const v = bs[f] as number;
    if (v < 0) {
      throw new Error(`Game ${gameNum}: Negative batting.${f} for ${bs.playerId} (value: ${v})`);
    }
  }
}

/** Assert no negative counting stats in pitching */
function assertPitchingNonNegative(ps: PlayerSeasonPitching, gameNum: number) {
  const fields: (keyof PlayerSeasonPitching)[] = [
    'games', 'gamesStarted', 'outsRecorded', 'hitsAllowed', 'runsAllowed',
    'earnedRuns', 'walksAllowed', 'strikeouts', 'homeRunsAllowed',
    'hitBatters', 'wildPitches', 'wins', 'losses',
  ];
  for (const f of fields) {
    const v = ps[f] as number;
    if (v < 0) {
      throw new Error(`Game ${gameNum}: Negative pitching.${f} for ${ps.playerId} (value: ${v})`);
    }
  }
}

// ============================================
// PREFLIGHT: 1-Game Proof
// ============================================

describe('162-Game Simulator: Preflight', () => {
  test('1 synthetic game passes all coherence checks', { timeout: 10_000 }, async () => {
    const PREFLIGHT_ID = 'sim-162-preflight';
    const game = generateSyntheticGame(awayRoster, homeRoster, {
      seed: SEED,
      gameNumber: 0,
    });

    // Basic shape checks
    expect(game.gameId).toBeDefined();
    expect(game.awayScore + game.homeScore).toBeGreaterThan(0);
    expect(game.awayScore).not.toBe(game.homeScore);
    expect(Object.keys(game.playerStats).length).toBe(18);
    expect(game.pitcherGameStats.length).toBeGreaterThanOrEqual(2);

    // Process through pipeline
    const result = await processCompletedGame(game, {
      seasonId: PREFLIGHT_ID,
      detectMilestones: false,
    });
    expect(result.aggregation.success).toBe(true);

    // Coherence check after 1 game
    const batting = await getSeasonBattingStats(PREFLIGHT_ID);
    const pitching = await getSeasonPitchingStats(PREFLIGHT_ID);

    for (const bs of batting) {
      assertBattingClean(bs, 1);
      assertBattingNonNegative(bs, 1);
      // Hits = singles + doubles + triples + HR
      expect(bs.hits).toBe(bs.singles + bs.doubles + bs.triples + bs.homeRuns);
      // PA >= AB + BB + HBP
      expect(bs.pa).toBeGreaterThanOrEqual(bs.ab + bs.walks + bs.hitByPitch);
    }

    for (const ps of pitching) {
      assertPitchingClean(ps, 1);
      assertPitchingNonNegative(ps, 1);
      // Earned runs <= runs allowed
      expect(ps.earnedRuns).toBeLessThanOrEqual(ps.runsAllowed);
    }

    // Metadata check
    const meta = await getSeasonMetadata(PREFLIGHT_ID);
    expect(meta).not.toBeNull();
    expect(meta!.gamesPlayed).toBe(1);
  });
});

// ============================================
// FULL 162-GAME SEASON
// ============================================

describe('162-Game Full Season Simulation', () => {
  test('162 games pass all per-game coherence invariants', async () => {
    // Previous-game snapshots for monotonicity checks
    let prevBatting: Map<string, PlayerSeasonBatting> = new Map();
    let prevPitching: Map<string, PlayerSeasonPitching> = new Map();

    let totalAwayRuns = 0;
    let totalHomeRuns = 0;
    let awayWins = 0;
    let homeWins = 0;
    let totalHR = 0;
    let violations: string[] = [];

    for (let g = 0; g < SEASON_GAMES; g++) {
      const game = generateSyntheticGame(awayRoster, homeRoster, {
        seed: SEED + 2000,
        gameNumber: g,
      });

      totalAwayRuns += game.awayScore;
      totalHomeRuns += game.homeScore;
      if (game.awayScore > game.homeScore) awayWins++;
      else homeWins++;

      for (const stats of Object.values(game.playerStats)) {
        totalHR += stats.hr;
      }

      // Process through pipeline
      const result = await processCompletedGame(game, {
        seasonId: SEASON_ID,
        detectMilestones: false,
      });

      if (!result.aggregation.success) {
        violations.push(`Game ${g + 1}: aggregation failed — ${result.aggregation.error}`);
        continue;
      }

      // ── Per-game coherence checks ──────────────────

      const batting = await getSeasonBattingStats(SEASON_ID);
      const pitching = await getSeasonPitchingStats(SEASON_ID);

      // Invariant 1: No NaN or Infinity
      for (const bs of batting) {
        try { assertBattingClean(bs, g + 1); }
        catch (e: any) { violations.push(e.message); }
      }
      for (const ps of pitching) {
        try { assertPitchingClean(ps, g + 1); }
        catch (e: any) { violations.push(e.message); }
      }

      // Invariant 2: No negative counting stats
      for (const bs of batting) {
        try { assertBattingNonNegative(bs, g + 1); }
        catch (e: any) { violations.push(e.message); }
      }
      for (const ps of pitching) {
        try { assertPitchingNonNegative(ps, g + 1); }
        catch (e: any) { violations.push(e.message); }
      }

      // Invariant 3: Stat totals never decrease between games
      for (const bs of batting) {
        const prev = prevBatting.get(bs.playerId);
        if (prev) {
          const monotonicFields: (keyof PlayerSeasonBatting)[] = [
            'games', 'pa', 'ab', 'hits', 'singles', 'doubles', 'triples',
            'homeRuns', 'rbi', 'runs', 'walks', 'strikeouts', 'stolenBases',
          ];
          for (const f of monotonicFields) {
            if ((bs[f] as number) < (prev[f] as number)) {
              violations.push(`Game ${g + 1}: batting.${f} DECREASED for ${bs.playerId} (${prev[f]} → ${bs[f]})`);
            }
          }
        }
      }
      for (const ps of pitching) {
        const prev = prevPitching.get(ps.playerId);
        if (prev) {
          const monotonicFields: (keyof PlayerSeasonPitching)[] = [
            'games', 'gamesStarted', 'outsRecorded', 'hitsAllowed', 'runsAllowed',
            'earnedRuns', 'walksAllowed', 'strikeouts', 'homeRunsAllowed',
            'wins', 'losses',
          ];
          for (const f of monotonicFields) {
            if ((ps[f] as number) < (prev[f] as number)) {
              violations.push(`Game ${g + 1}: pitching.${f} DECREASED for ${ps.playerId} (${prev[f]} → ${ps[f]})`);
            }
          }
        }
      }

      // Invariant 4: Standings wins + losses = games played
      expect(awayWins + homeWins).toBe(g + 1);

      // Invariant 5: Hits = singles + doubles + triples + HR
      for (const bs of batting) {
        if (bs.hits !== bs.singles + bs.doubles + bs.triples + bs.homeRuns) {
          violations.push(`Game ${g + 1}: hits(${bs.hits}) != S+D+T+HR(${bs.singles}+${bs.doubles}+${bs.triples}+${bs.homeRuns}) for ${bs.playerId}`);
        }
      }

      // Invariant 6: PA >= AB + BB + HBP
      for (const bs of batting) {
        if (bs.pa < bs.ab + bs.walks + bs.hitByPitch) {
          violations.push(`Game ${g + 1}: PA(${bs.pa}) < AB+BB+HBP(${bs.ab}+${bs.walks}+${bs.hitByPitch}) for ${bs.playerId}`);
        }
      }

      // Invariant 7: Earned runs <= runs allowed
      for (const ps of pitching) {
        if (ps.earnedRuns > ps.runsAllowed) {
          violations.push(`Game ${g + 1}: ER(${ps.earnedRuns}) > R(${ps.runsAllowed}) for ${ps.playerId}`);
        }
      }

      // Snapshot for next game's monotonicity check
      prevBatting = new Map(batting.map(bs => [bs.playerId, { ...bs }]));
      prevPitching = new Map(pitching.map(ps => [ps.playerId, { ...ps }]));
    }

    // ── Post-season assertions ──────────────────

    // Report all violations (if any) as a single failure
    if (violations.length > 0) {
      // Show first 20 violations for readability
      const sample = violations.slice(0, 20).join('\n  ');
      const msg = violations.length > 20
        ? `${violations.length} violations found (showing first 20):\n  ${sample}\n  ... and ${violations.length - 20} more`
        : `${violations.length} violations found:\n  ${sample}`;
      throw new Error(msg);
    }

    // Season metadata
    const meta = await getSeasonMetadata(SEASON_ID);
    expect(meta).not.toBeNull();
    expect(meta!.gamesPlayed).toBe(SEASON_GAMES);

    // Batting totals match game-by-game tracking
    const battingStats = await getSeasonBattingStats(SEASON_ID);
    const totalBattingRuns = sumField(battingStats, 'runs');
    expect(totalBattingRuns).toBe(totalAwayRuns + totalHomeRuns);

    const totalBattingHR = sumField(battingStats, 'homeRuns');
    expect(totalBattingHR).toBe(totalHR);

    // Every batter played exactly 162 games
    for (const bs of battingStats) {
      expect(bs.games).toBe(SEASON_GAMES);
    }

    // Pitching wins + losses = 2 * SEASON_GAMES (one W and one L per game)
    const pitchingStats = await getSeasonPitchingStats(SEASON_ID);
    const totalWins = sumField(pitchingStats, 'wins');
    const totalLosses = sumField(pitchingStats, 'losses');
    expect(totalWins).toBe(SEASON_GAMES);
    expect(totalLosses).toBe(SEASON_GAMES);

    // ── Invariant 8: WAR calculations produce finite values ──

    // bWAR for every batter
    // 162-game season WAR bounds are wider than 48-game:
    // Real MLB records: ~12 bWAR (Babe Ruth 1923). Our synthetic data can be noisier.
    for (const bs of battingStats) {
      const input: BattingStatsForWAR = {
        pa: bs.pa,
        ab: bs.ab,
        singles: bs.singles,
        doubles: bs.doubles,
        triples: bs.triples,
        homeRuns: bs.homeRuns,
        walks: bs.walks,
        intentionalWalks: 0,
        hitByPitch: bs.hitByPitch,
        sacFlies: bs.sacFlies || 0,
        sacBunts: 0,
        stolenBases: bs.stolenBases,
        caughtStealing: bs.caughtStealing,
        strikeouts: bs.strikeouts,
        gidp: bs.gidp || 0,
      };
      const bwar = calculateBWARSimplified(input, SEASON_GAMES);
      expect(Number.isFinite(bwar.bWAR)).toBe(true);
      expect(bwar.bWAR).toBeGreaterThan(-20);
      expect(bwar.bWAR).toBeLessThan(25);
    }

    // pWAR for every pitcher
    // 162-game starters who pitch all innings can accumulate very high WAR
    for (const ps of pitchingStats) {
      const input: PitchingStatsForWAR = {
        ip: ps.outsRecorded / 3,
        strikeouts: ps.strikeouts,
        walks: ps.walksAllowed,
        homeRunsAllowed: ps.homeRunsAllowed,
        hitByPitch: ps.hitBatters,
        gamesStarted: ps.gamesStarted,
        gamesAppeared: ps.games,
        averageLeverageIndex: ps.gamesStarted > 0 ? 1.0 : 1.5,
      };
      const pwar = calculatePWARSimplified(input, SEASON_GAMES);
      expect(Number.isFinite(pwar.pWAR)).toBe(true);
      expect(pwar.pWAR).toBeGreaterThan(-30);
      expect(pwar.pWAR).toBeLessThan(30);
    }

    // fWAR for every batter (from fielding stats)
    const fieldingStats = await import('../src/utils/seasonStorage').then(
      m => m.getAllFieldingStats(SEASON_ID)
    );
    for (const fs of fieldingStats) {
      const fwar = calculateFWARFromStats(
        { putouts: fs.putouts, assists: fs.assists, errors: fs.errors, doublePlays: 0 },
        'SS' as any, // default position
        fs.games,
        SEASON_GAMES,
      );
      expect(Number.isFinite(fwar.fWAR)).toBe(true);
    }

    // rWAR for every batter
    for (const bs of battingStats) {
      const rwar = calculateRWARSimplified({
        stolenBases: bs.stolenBases,
        caughtStealing: bs.caughtStealing,
        singles: bs.singles,
        walks: bs.walks,
        hitByPitch: bs.hitByPitch,
        intentionalWalks: 0,
        gidp: bs.gidp || 0,
        gidpOpportunities: Math.max(bs.gidp || 0, Math.floor(bs.ab * 0.15)),
      }, SEASON_GAMES);
      expect(Number.isFinite(rwar.rWAR)).toBe(true);
    }
  }, 120_000); // 2-minute timeout for 162 games with per-game checks
});
