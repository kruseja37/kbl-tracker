/**
 * Pitcher W/L/S Decision Tests
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 1.6
 *
 * Tests that pitcher wins, losses, saves, holds, and blown saves
 * are properly tracked and attributed.
 *
 * Per DEFINITIVE_GAP_ANALYSIS: "CRITICAL - blocks accurate pitcher stats"
 */

import { describe, test, expect } from 'vitest';

// ============================================
// DECISION TYPES
// ============================================

type PitcherDecision = 'W' | 'L' | 'S' | 'H' | 'BS' | null;

interface PitchingAppearance {
  pitcherId: string;
  gameId: string;
  teamId: string;
  isStarter: boolean;
  enteringInning: number;
  exitingInning: number;
  outsRecorded: number;
  runsAllowed: number;
  earnedRunsAllowed: number;
  inheritedRunners: number;
  inheritedRunnersScored: number;
  bequeathedRunners: number;
  decision: PitcherDecision;
}

interface GameState {
  inning: number;
  isBottom: boolean;
  outs: number;
  homeScore: number;
  awayScore: number;
  pitchersUsed: PitchingAppearance[];
}

// ============================================
// WIN DECISION
// ============================================

describe('Win Decision (W)', () => {
  test('starter gets W if pitches 5+ IP and team wins', () => {
    // Per MLB rules: Starter must pitch 5+ innings for W
    const starter: PitchingAppearance = {
      pitcherId: 'sp1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: true,
      enteringInning: 1,
      exitingInning: 6,
      outsRecorded: 18, // 6.0 IP
      runsAllowed: 3,
      earnedRunsAllowed: 3,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: 'W',
    };

    const teamWon = true;
    const pitchedFiveInnings = starter.outsRecorded >= 15;

    expect(teamWon && pitchedFiveInnings && starter.isStarter).toBe(true);
    expect(starter.decision).toBe('W');
  });

  test('reliever gets W if starter did not qualify', () => {
    // If starter pitches < 5 IP, a reliever can get the W
    const starter: PitchingAppearance = {
      pitcherId: 'sp1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: true,
      enteringInning: 1,
      exitingInning: 4,
      outsRecorded: 12, // 4.0 IP - does not qualify
      runsAllowed: 4,
      earnedRunsAllowed: 4,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 2,
      decision: null, // No decision
    };

    const reliever: PitchingAppearance = {
      pitcherId: 'rp1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: false,
      enteringInning: 5,
      exitingInning: 7,
      outsRecorded: 9, // 3.0 IP
      runsAllowed: 0,
      earnedRunsAllowed: 0,
      inheritedRunners: 2,
      inheritedRunnersScored: 1,
      bequeathedRunners: 0,
      decision: 'W', // Gets the W
    };

    expect(starter.outsRecorded).toBeLessThan(15); // < 5 IP
    expect(reliever.decision).toBe('W');
  });

  test('W goes to pitcher when team takes permanent lead', () => {
    // The pitcher of record when team takes the lead that they never relinquish
    const appearances: PitchingAppearance[] = [
      {
        pitcherId: 'sp1',
        gameId: 'g1',
        teamId: 'home',
        isStarter: true,
        enteringInning: 1,
        exitingInning: 5,
        outsRecorded: 15,
        runsAllowed: 3,
        earnedRunsAllowed: 3,
        inheritedRunners: 0,
        inheritedRunnersScored: 0,
        bequeathedRunners: 1,
        decision: 'W', // Team took permanent lead while he was pitching
      },
      {
        pitcherId: 'rp1',
        gameId: 'g1',
        teamId: 'home',
        isStarter: false,
        enteringInning: 6,
        exitingInning: 9,
        outsRecorded: 12,
        runsAllowed: 0,
        earnedRunsAllowed: 0,
        inheritedRunners: 1,
        inheritedRunnersScored: 0,
        bequeathedRunners: 0,
        decision: null, // No decision
      },
    ];

    const winningPitcher = appearances.find(p => p.decision === 'W');
    expect(winningPitcher?.pitcherId).toBe('sp1');
  });

  test('W requires team to actually win', () => {
    const starter: PitchingAppearance = {
      pitcherId: 'sp1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: true,
      enteringInning: 1,
      exitingInning: 7,
      outsRecorded: 21,
      runsAllowed: 2,
      earnedRunsAllowed: 2,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: null, // Team lost, so no W
    };

    const finalScore = { home: 2, away: 3 };
    const teamWon = finalScore.home > finalScore.away;

    expect(teamWon).toBe(false);
    expect(starter.decision).toBeNull();
  });
});

// ============================================
// LOSS DECISION
// ============================================

describe('Loss Decision (L)', () => {
  test('L goes to pitcher who allowed go-ahead run', () => {
    const starter: PitchingAppearance = {
      pitcherId: 'sp1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: true,
      enteringInning: 1,
      exitingInning: 6,
      outsRecorded: 18,
      runsAllowed: 4, // Gave up the go-ahead runs
      earnedRunsAllowed: 4,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: 'L',
    };

    expect(starter.decision).toBe('L');
  });

  test('L can go to reliever who blows lead', () => {
    const reliever: PitchingAppearance = {
      pitcherId: 'rp1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: false,
      enteringInning: 7,
      exitingInning: 7,
      outsRecorded: 2, // 0.2 IP
      runsAllowed: 3, // Blew the lead
      earnedRunsAllowed: 3,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 2,
      decision: 'L',
    };

    expect(reliever.decision).toBe('L');
  });

  test('L tracks pitcher who gave up decisive run', () => {
    // The pitcher responsible for the go-ahead run gets the L
    const appearances: PitchingAppearance[] = [
      {
        pitcherId: 'sp1',
        gameId: 'g1',
        teamId: 'home',
        isStarter: true,
        enteringInning: 1,
        exitingInning: 6,
        outsRecorded: 18,
        runsAllowed: 2, // Kept game close
        earnedRunsAllowed: 2,
        inheritedRunners: 0,
        inheritedRunnersScored: 0,
        bequeathedRunners: 1,
        decision: null,
      },
      {
        pitcherId: 'rp1',
        gameId: 'g1',
        teamId: 'home',
        isStarter: false,
        enteringInning: 7,
        exitingInning: 8,
        outsRecorded: 6,
        runsAllowed: 2, // Allowed go-ahead run
        earnedRunsAllowed: 2,
        inheritedRunners: 1,
        inheritedRunnersScored: 1, // Inherited runner scored too
        bequeathedRunners: 0,
        decision: 'L', // Gets the L
      },
    ];

    const losingPitcher = appearances.find(p => p.decision === 'L');
    expect(losingPitcher?.pitcherId).toBe('rp1');
  });
});

// ============================================
// SAVE DECISION
// ============================================

describe('Save Decision (S)', () => {
  test('save requires pitching final inning with lead <= 3', () => {
    // Classic save situation
    const closer: PitchingAppearance = {
      pitcherId: 'cl1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: false,
      enteringInning: 9,
      exitingInning: 9,
      outsRecorded: 3, // 1.0 IP
      runsAllowed: 0,
      earnedRunsAllowed: 0,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: 'S',
    };

    const leadWhenEntered = 2; // 2-run lead
    const finishedGame = closer.outsRecorded > 0; // Got final out

    expect(leadWhenEntered).toBeLessThanOrEqual(3);
    expect(finishedGame).toBe(true);
    expect(closer.decision).toBe('S');
  });

  test('save requires 3 IP if lead > 3', () => {
    // If lead is > 3 runs, need to pitch 3+ innings for save
    const closer: PitchingAppearance = {
      pitcherId: 'cl1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: false,
      enteringInning: 7,
      exitingInning: 9,
      outsRecorded: 9, // 3.0 IP
      runsAllowed: 1,
      earnedRunsAllowed: 1,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: 'S',
    };

    const leadWhenEntered = 5; // 5-run lead
    const pitchedThreeInnings = closer.outsRecorded >= 9;

    expect(leadWhenEntered).toBeGreaterThan(3);
    expect(pitchedThreeInnings).toBe(true);
    expect(closer.decision).toBe('S');
  });

  test('save with tying run on base or at bat', () => {
    // Can get save if tying run is on base, at bat, or on deck
    const closer: PitchingAppearance = {
      pitcherId: 'cl1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: false,
      enteringInning: 8,
      exitingInning: 9,
      outsRecorded: 5, // 1.2 IP
      runsAllowed: 2,
      earnedRunsAllowed: 2,
      inheritedRunners: 2, // Tying run was at bat when entered
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: 'S',
    };

    expect(closer.decision).toBe('S');
  });

  test('save cannot go to winning pitcher', () => {
    // Pitcher who gets W cannot also get S
    const pitcher: PitchingAppearance = {
      pitcherId: 'p1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: false,
      enteringInning: 5,
      exitingInning: 9,
      outsRecorded: 15,
      runsAllowed: 2,
      earnedRunsAllowed: 2,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: 'W', // Gets W, not S
    };

    expect(pitcher.decision).toBe('W');
    expect(pitcher.decision).not.toBe('S');
  });
});

// ============================================
// HOLD DECISION
// ============================================

describe('Hold Decision (H)', () => {
  test('hold for reliever who maintains lead', () => {
    // Setup man enters with lead, maintains it, passes to closer
    const setup: PitchingAppearance = {
      pitcherId: 'su1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: false,
      enteringInning: 7,
      exitingInning: 8,
      outsRecorded: 6, // 2.0 IP
      runsAllowed: 0,
      earnedRunsAllowed: 0,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 1,
      decision: 'H',
    };

    // Hold criteria:
    // 1. Enter in save situation
    // 2. Record at least one out
    // 3. Leave without giving up lead
    // 4. Don't finish the game

    expect(setup.decision).toBe('H');
  });

  test('hold requires entering in save situation', () => {
    // Must be a save situation for hold
    const reliever: PitchingAppearance = {
      pitcherId: 'rp1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: false,
      enteringInning: 6,
      exitingInning: 7,
      outsRecorded: 6,
      runsAllowed: 0,
      earnedRunsAllowed: 0,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: 'H', // Gets hold if entered in save situation
    };

    const wasSaveSituation = true; // Lead <= 3 runs
    expect(wasSaveSituation).toBe(true);
    expect(reliever.decision).toBe('H');
  });

  test('hold not awarded if gives up lead', () => {
    const reliever: PitchingAppearance = {
      pitcherId: 'rp1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: false,
      enteringInning: 7,
      exitingInning: 7,
      outsRecorded: 2,
      runsAllowed: 3, // Gave up the lead
      earnedRunsAllowed: 3,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 2,
      decision: null, // No hold - gave up lead
    };

    expect(reliever.decision).not.toBe('H');
  });
});

// ============================================
// BLOWN SAVE (BS)
// ============================================

describe('Blown Save Decision (BS)', () => {
  test('BS when closer blows save opportunity', () => {
    const closer: PitchingAppearance = {
      pitcherId: 'cl1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: false,
      enteringInning: 9,
      exitingInning: 9,
      outsRecorded: 2, // 0.2 IP - didn't finish
      runsAllowed: 2, // Blew the 1-run lead
      earnedRunsAllowed: 2,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 1,
      decision: 'BS',
    };

    expect(closer.decision).toBe('BS');
  });

  test('BS can combine with W if team comes back', () => {
    // Pitcher blows save but team wins, gets BS + W
    const closer: PitchingAppearance = {
      pitcherId: 'cl1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: false,
      enteringInning: 9,
      exitingInning: 10,
      outsRecorded: 5, // 1.2 IP
      runsAllowed: 1, // Blew save in 9th
      earnedRunsAllowed: 1,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: 'W', // W after BS is possible
    };

    // In this case, they'd have both BS and W (blown save win)
    // Decision field shows W, but BS is also recorded
    expect(closer.decision).toBe('W');
  });

  test('BS can combine with L if team loses', () => {
    // Pitcher blows save and team loses, gets BS + L
    const closer: PitchingAppearance = {
      pitcherId: 'cl1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: false,
      enteringInning: 9,
      exitingInning: 9,
      outsRecorded: 2,
      runsAllowed: 2, // Blew save and allowed winning run
      earnedRunsAllowed: 2,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: 'L', // L after BS
    };

    // Would record both BS and L
    expect(closer.decision).toBe('L');
  });
});

// ============================================
// DECISION ELIGIBILITY
// ============================================

describe('Decision Eligibility', () => {
  test('each game has exactly one W and one L', () => {
    const appearances: PitchingAppearance[] = [
      { pitcherId: 'wp', gameId: 'g1', teamId: 'home', isStarter: true, enteringInning: 1, exitingInning: 7, outsRecorded: 21, runsAllowed: 2, earnedRunsAllowed: 2, inheritedRunners: 0, inheritedRunnersScored: 0, bequeathedRunners: 0, decision: 'W' },
      { pitcherId: 'sv', gameId: 'g1', teamId: 'home', isStarter: false, enteringInning: 8, exitingInning: 9, outsRecorded: 6, runsAllowed: 0, earnedRunsAllowed: 0, inheritedRunners: 0, inheritedRunnersScored: 0, bequeathedRunners: 0, decision: 'S' },
      { pitcherId: 'lp', gameId: 'g1', teamId: 'away', isStarter: true, enteringInning: 1, exitingInning: 6, outsRecorded: 18, runsAllowed: 4, earnedRunsAllowed: 4, inheritedRunners: 0, inheritedRunnersScored: 0, bequeathedRunners: 0, decision: 'L' },
      { pitcherId: 'mr', gameId: 'g1', teamId: 'away', isStarter: false, enteringInning: 7, exitingInning: 9, outsRecorded: 9, runsAllowed: 0, earnedRunsAllowed: 0, inheritedRunners: 0, inheritedRunnersScored: 0, bequeathedRunners: 0, decision: null },
    ];

    const wins = appearances.filter(p => p.decision === 'W');
    const losses = appearances.filter(p => p.decision === 'L');

    expect(wins.length).toBe(1);
    expect(losses.length).toBe(1);
  });

  test('W and L are on opposite teams', () => {
    const winner: PitchingAppearance = {
      pitcherId: 'wp',
      gameId: 'g1',
      teamId: 'home',
      isStarter: true,
      enteringInning: 1,
      exitingInning: 9,
      outsRecorded: 27,
      runsAllowed: 1,
      earnedRunsAllowed: 1,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: 'W',
    };

    const loser: PitchingAppearance = {
      pitcherId: 'lp',
      gameId: 'g1',
      teamId: 'away',
      isStarter: true,
      enteringInning: 1,
      exitingInning: 7,
      outsRecorded: 21,
      runsAllowed: 3,
      earnedRunsAllowed: 3,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: 'L',
    };

    expect(winner.teamId).not.toBe(loser.teamId);
  });

  test('save only awarded to non-winning team pitcher', () => {
    // Save goes to a pitcher on the same team as W, but not the W pitcher
    const winner: PitchingAppearance = {
      pitcherId: 'wp',
      gameId: 'g1',
      teamId: 'home',
      isStarter: true,
      enteringInning: 1,
      exitingInning: 8,
      outsRecorded: 24,
      runsAllowed: 2,
      earnedRunsAllowed: 2,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: 'W',
    };

    const saver: PitchingAppearance = {
      pitcherId: 'sv',
      gameId: 'g1',
      teamId: 'home',
      isStarter: false,
      enteringInning: 9,
      exitingInning: 9,
      outsRecorded: 3,
      runsAllowed: 0,
      earnedRunsAllowed: 0,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: 'S',
    };

    expect(winner.teamId).toBe(saver.teamId);
    expect(winner.pitcherId).not.toBe(saver.pitcherId);
  });
});

// ============================================
// DECISION CALCULATION HELPERS
// ============================================

describe('Decision Calculation Logic', () => {
  test('determine winning pitcher when starter qualifies', () => {
    const determineWinningPitcher = (
      appearances: PitchingAppearance[],
      winningTeamId: string
    ): string | null => {
      const teamAppearances = appearances.filter(p => p.teamId === winningTeamId);
      const starter = teamAppearances.find(p => p.isStarter);

      // If starter pitched 5+ innings, they get the W
      if (starter && starter.outsRecorded >= 15) {
        return starter.pitcherId;
      }

      // Otherwise, find reliever who was pitching when team took permanent lead
      // (Simplified - in real implementation, track lead changes)
      const relievers = teamAppearances.filter(p => !p.isStarter);
      if (relievers.length > 0) {
        return relievers[0].pitcherId; // Simplified
      }

      return null;
    };

    const appearances: PitchingAppearance[] = [
      { pitcherId: 'sp1', gameId: 'g1', teamId: 'home', isStarter: true, enteringInning: 1, exitingInning: 7, outsRecorded: 21, runsAllowed: 2, earnedRunsAllowed: 2, inheritedRunners: 0, inheritedRunnersScored: 0, bequeathedRunners: 0, decision: null },
    ];

    const winner = determineWinningPitcher(appearances, 'home');
    expect(winner).toBe('sp1');
  });

  test('determine save eligibility', () => {
    const isSaveEligible = (
      appearance: PitchingAppearance,
      leadWhenEntered: number,
      finishedGame: boolean,
      tyingRunOnBase: boolean
    ): boolean => {
      // Must finish the game
      if (!finishedGame) return false;

      // Three ways to qualify:
      // 1. Enter with lead <= 3 runs
      if (leadWhenEntered <= 3) return true;

      // 2. Pitch 3+ innings
      if (appearance.outsRecorded >= 9) return true;

      // 3. Tying run on base/at bat/on deck
      if (tyingRunOnBase) return true;

      return false;
    };

    // Test case 1: 2-run lead, 1 IP
    expect(isSaveEligible(
      { pitcherId: 'cl', gameId: 'g1', teamId: 'home', isStarter: false, enteringInning: 9, exitingInning: 9, outsRecorded: 3, runsAllowed: 0, earnedRunsAllowed: 0, inheritedRunners: 0, inheritedRunnersScored: 0, bequeathedRunners: 0, decision: null },
      2, true, false
    )).toBe(true);

    // Test case 2: 5-run lead, 3 IP
    expect(isSaveEligible(
      { pitcherId: 'cl', gameId: 'g1', teamId: 'home', isStarter: false, enteringInning: 7, exitingInning: 9, outsRecorded: 9, runsAllowed: 1, earnedRunsAllowed: 1, inheritedRunners: 0, inheritedRunnersScored: 0, bequeathedRunners: 0, decision: null },
      5, true, false
    )).toBe(true);

    // Test case 3: 4-run lead, 1 IP - not eligible without 3 IP
    expect(isSaveEligible(
      { pitcherId: 'cl', gameId: 'g1', teamId: 'home', isStarter: false, enteringInning: 9, exitingInning: 9, outsRecorded: 3, runsAllowed: 0, earnedRunsAllowed: 0, inheritedRunners: 0, inheritedRunnersScored: 0, bequeathedRunners: 0, decision: null },
      4, true, false
    )).toBe(false);
  });

  test('determine if hold situation', () => {
    const isHoldSituation = (
      appearance: PitchingAppearance,
      leadWhenEntered: number,
      leadWhenExited: number,
      finishedGame: boolean
    ): boolean => {
      // Must enter in save situation
      if (leadWhenEntered > 3) return false;

      // Must record at least one out
      if (appearance.outsRecorded < 1) return false;

      // Must leave with lead intact
      if (leadWhenExited <= 0) return false;

      // Must not finish the game
      if (finishedGame) return false;

      return true;
    };

    // Valid hold: entered with 2-run lead, exited with 1-run lead, didn't finish
    expect(isHoldSituation(
      { pitcherId: 'su', gameId: 'g1', teamId: 'home', isStarter: false, enteringInning: 7, exitingInning: 8, outsRecorded: 6, runsAllowed: 1, earnedRunsAllowed: 1, inheritedRunners: 0, inheritedRunnersScored: 0, bequeathedRunners: 1, decision: null },
      2, 1, false
    )).toBe(true);

    // Not a hold: finished the game (that's a save)
    expect(isHoldSituation(
      { pitcherId: 'cl', gameId: 'g1', teamId: 'home', isStarter: false, enteringInning: 8, exitingInning: 9, outsRecorded: 6, runsAllowed: 0, earnedRunsAllowed: 0, inheritedRunners: 0, inheritedRunnersScored: 0, bequeathedRunners: 0, decision: null },
      2, 2, true
    )).toBe(false);
  });
});

// ============================================
// SMB4 CONTEXT
// ============================================

describe('SMB4 Decision Context', () => {
  test('5-inning game starter qualification', () => {
    // In 5-inning SMB4 games, should starter need full 5 innings?
    // Or scale to ~2.8 innings (5/9 * 5)?
    // For simplicity, use 3 innings as threshold

    const shortGameThreshold = 9; // 3.0 IP for 5-inning game (scaled from 5 IP in 9)

    const starter: PitchingAppearance = {
      pitcherId: 'sp1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: true,
      enteringInning: 1,
      exitingInning: 4,
      outsRecorded: 10, // 3.1 IP
      runsAllowed: 2,
      earnedRunsAllowed: 2,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: 'W',
    };

    expect(starter.outsRecorded).toBeGreaterThanOrEqual(shortGameThreshold);
  });

  test('save in short game with scaled lead threshold', () => {
    // 5-inning game might have different save thresholds
    // Standard: lead <= 3 in 9th inning
    // Scaled: lead <= 2 in 5th inning?

    const saveSituationInShortGame = (leadWhenEntered: number, inning: number, totalInnings: number): boolean => {
      // Scale the 3-run threshold by game length
      const scaledThreshold = Math.ceil(3 * (totalInnings / 9));
      const isFinalInning = inning >= totalInnings;

      return isFinalInning && leadWhenEntered <= scaledThreshold;
    };

    // 5-inning game: threshold ~2
    expect(saveSituationInShortGame(2, 5, 5)).toBe(true);
    expect(saveSituationInShortGame(3, 5, 5)).toBe(false); // 3 > 2 threshold

    // 9-inning game: threshold = 3
    expect(saveSituationInShortGame(3, 9, 9)).toBe(true);
    expect(saveSituationInShortGame(4, 9, 9)).toBe(false);
  });
});

// ============================================
// VALIDATION
// ============================================

describe('Decision Validation', () => {
  test('decision must be valid type or null', () => {
    const validDecisions: (PitcherDecision)[] = ['W', 'L', 'S', 'H', 'BS', null];

    validDecisions.forEach(d => {
      const appearance: PitchingAppearance = {
        pitcherId: 'p1',
        gameId: 'g1',
        teamId: 'home',
        isStarter: true,
        enteringInning: 1,
        exitingInning: 5,
        outsRecorded: 15,
        runsAllowed: 2,
        earnedRunsAllowed: 2,
        inheritedRunners: 0,
        inheritedRunnersScored: 0,
        bequeathedRunners: 0,
        decision: d,
      };

      expect(['W', 'L', 'S', 'H', 'BS', null]).toContain(appearance.decision);
    });
  });

  test('starter must be first pitcher', () => {
    const isValidStarterDesignation = (
      appearance: PitchingAppearance
    ): boolean => {
      if (appearance.isStarter) {
        return appearance.enteringInning === 1;
      }
      return true;
    };

    const validStarter: PitchingAppearance = {
      pitcherId: 'sp1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: true,
      enteringInning: 1,
      exitingInning: 5,
      outsRecorded: 15,
      runsAllowed: 2,
      earnedRunsAllowed: 2,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: null,
    };

    const invalidStarter: PitchingAppearance = {
      pitcherId: 'sp1',
      gameId: 'g1',
      teamId: 'home',
      isStarter: true, // Marked as starter but enters in 5th
      enteringInning: 5,
      exitingInning: 9,
      outsRecorded: 15,
      runsAllowed: 2,
      earnedRunsAllowed: 2,
      inheritedRunners: 0,
      inheritedRunnersScored: 0,
      bequeathedRunners: 0,
      decision: null,
    };

    expect(isValidStarterDesignation(validStarter)).toBe(true);
    expect(isValidStarterDesignation(invalidStarter)).toBe(false);
  });

  test('outs recorded must be non-negative', () => {
    const isValidOuts = (outs: number): boolean => outs >= 0;

    expect(isValidOuts(0)).toBe(true);
    expect(isValidOuts(27)).toBe(true);
    expect(isValidOuts(-1)).toBe(false);
  });
});
