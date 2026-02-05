/**
 * Inherited Runner Tracking Tests
 *
 * Phase 1.5 of Testing Implementation Plan
 *
 * Tests the inheritedRunnerTracker.ts engine which tracks:
 * - Which pitcher is responsible for runners on base
 * - Earned run (ER) attribution when runners score
 * - Bequeathed runners (left for next pitcher)
 * - Inherited runners (taken over from previous pitcher)
 *
 * Key baseball rule: When a runner scores, the ER is charged to the
 * pitcher who ALLOWED THEM ON BASE, not the pitcher who allowed them to score.
 */

import { describe, test, expect } from 'vitest';
import {
  createRunnerTrackingState,
  addRunner,
  advanceRunner,
  runnerOut,
  handlePitchingChange,
  handlePinchRunner,
  clearBases,
  nextInning,
  nextAtBat,
  getERSummary,
  getCurrentBases,
  type RunnerTrackingState,
  type TrackedRunner,
} from '../../app/engines/inheritedRunnerTracker';

// ============================================
// STATE CREATION TESTS
// ============================================

describe('State Creation', () => {
  test('createRunnerTrackingState initializes correctly', () => {
    const state = createRunnerTrackingState('pitcher-1', 'John Doe');

    expect(state.currentPitcherId).toBe('pitcher-1');
    expect(state.currentPitcherName).toBe('John Doe');
    expect(state.runners).toHaveLength(0);
    expect(state.inning).toBe(1);
    expect(state.atBatNumber).toBe(1);
  });

  test('pitcher stats are initialized for starting pitcher', () => {
    const state = createRunnerTrackingState('pitcher-1', 'John Doe');

    expect(state.pitcherStats.has('pitcher-1')).toBe(true);
    const stats = state.pitcherStats.get('pitcher-1')!;
    expect(stats.pitcherName).toBe('John Doe');
    expect(stats.runnersOnBase).toHaveLength(0);
    expect(stats.runnersScored).toHaveLength(0);
    expect(stats.inheritedRunners).toHaveLength(0);
    expect(stats.bequeathedRunnerCount).toBe(0);
  });
});

// ============================================
// RUNNER PLACEMENT TESTS
// ============================================

describe('Runner Placement', () => {
  test('addRunner places runner on first base', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');

    expect(state.runners).toHaveLength(1);
    expect(state.runners[0].currentBase).toBe('1B');
    expect(state.runners[0].runnerName).toBe('Batter One');
    expect(state.runners[0].responsiblePitcherId).toBe('pitcher-1');
  });

  test('addRunner places runner on second base', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '2B', 'hit');

    expect(state.runners[0].currentBase).toBe('2B');
    expect(state.runners[0].startingBase).toBe('2B');
  });

  test('addRunner tracks howReached correctly', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');

    state = addRunner(state, 'runner-1', 'Batter 1', '1B', 'hit');
    expect(state.runners[0].howReached).toBe('hit');

    state = addRunner(state, 'runner-2', 'Batter 2', '1B', 'walk');
    expect(state.runners[1].howReached).toBe('walk');

    state = addRunner(state, 'runner-3', 'Batter 3', '1B', 'error');
    expect(state.runners[2].howReached).toBe('error');
  });

  test('addRunner updates pitcher stats', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');

    const stats = state.pitcherStats.get('pitcher-1')!;
    expect(stats.runnersOnBase).toHaveLength(1);
    expect(stats.runnersOnBase[0].runnerId).toBe('runner-1');
  });

  test('multiple runners can be added', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');
    state = addRunner(state, 'runner-2', 'Batter Two', '2B', 'walk');
    state = addRunner(state, 'runner-3', 'Batter Three', '3B', 'hbp');

    expect(state.runners).toHaveLength(3);

    const stats = state.pitcherStats.get('pitcher-1')!;
    expect(stats.runnersOnBase).toHaveLength(3);
  });
});

// ============================================
// RUNNER ADVANCEMENT TESTS
// ============================================

describe('Runner Advancement', () => {
  test('advanceRunner moves runner from 1B to 2B', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');

    const result = advanceRunner(state, 'runner-1', '2B');
    state = result.state;

    expect(state.runners[0].currentBase).toBe('2B');
    expect(result.scoredEvent).toBeNull();
  });

  test('advanceRunner moves runner from 2B to 3B', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '2B', 'hit');

    const result = advanceRunner(state, 'runner-1', '3B');
    state = result.state;

    expect(state.runners[0].currentBase).toBe('3B');
  });

  test('advanceRunner to HOME scores runner', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '3B', 'hit');

    const result = advanceRunner(state, 'runner-1', 'HOME');
    state = result.state;

    expect(state.runners).toHaveLength(0); // Runner removed from active
    expect(result.scoredEvent).not.toBeNull();
    expect(result.scoredEvent!.wasEarnedRun).toBe(true);
  });

  test('advanceRunner returns null scoredEvent for non-scoring advance', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');

    const result = advanceRunner(state, 'runner-1', '2B');
    expect(result.scoredEvent).toBeNull();
  });

  test('advanceRunner with invalid runner ID returns unchanged state', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');

    const result = advanceRunner(state, 'non-existent', '2B');
    expect(result.state).toEqual(state);
    expect(result.scoredEvent).toBeNull();
  });
});

// ============================================
// EARNED RUN ATTRIBUTION TESTS
// ============================================

describe('Earned Run Attribution', () => {
  test('runner who reached via hit scores as earned run', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');

    const result = advanceRunner(state, 'runner-1', 'HOME');
    expect(result.scoredEvent!.wasEarnedRun).toBe(true);
    expect(result.scoredEvent!.chargedToPitcherId).toBe('pitcher-1');
  });

  test('runner who reached via walk scores as earned run', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'walk');

    const result = advanceRunner(state, 'runner-1', 'HOME');
    expect(result.scoredEvent!.wasEarnedRun).toBe(true);
  });

  test('runner who reached via HBP scores as earned run', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hbp');

    const result = advanceRunner(state, 'runner-1', 'HOME');
    expect(result.scoredEvent!.wasEarnedRun).toBe(true);
  });

  test('runner who reached via error scores as UNEARNED run', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'error');

    const result = advanceRunner(state, 'runner-1', 'HOME');
    expect(result.scoredEvent!.wasEarnedRun).toBe(false);
  });

  test('runner who reached via FC scores as EARNED run (CRIT-03 fix: FC runs are earned per baseball rules)', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'FC');

    const result = advanceRunner(state, 'runner-1', 'HOME');
    // FC runs ARE earned — only error-reached runners produce unearned runs
    expect(result.scoredEvent!.wasEarnedRun).toBe(true);
  });

  test('ER charged to original pitcher even after pitching change', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '3B', 'walk');

    // Pitching change
    const changeResult = handlePitchingChange(state, 'pitcher-2', 'Pitcher B');
    state = changeResult.state;

    // Runner scores with new pitcher
    const scoreResult = advanceRunner(state, 'runner-1', 'HOME');

    // ER charged to Pitcher A (who allowed the walk), not Pitcher B
    expect(scoreResult.scoredEvent!.chargedToPitcherId).toBe('pitcher-1');
    expect(scoreResult.scoredEvent!.chargedToPitcherName).toBe('Pitcher A');
    expect(scoreResult.scoredEvent!.wasInherited).toBe(true);
  });
});

// ============================================
// RUNNER OUT TESTS
// ============================================

describe('Runner Out', () => {
  test('runnerOut removes runner from active list', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');
    state = addRunner(state, 'runner-2', 'Batter Two', '2B', 'hit');

    state = runnerOut(state, 'runner-1');

    expect(state.runners).toHaveLength(1);
    expect(state.runners[0].runnerId).toBe('runner-2');
  });

  test('runnerOut removes from pitcher stats', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');

    state = runnerOut(state, 'runner-1');

    const stats = state.pitcherStats.get('pitcher-1')!;
    expect(stats.runnersOnBase).toHaveLength(0);
  });

  test('runnerOut with invalid ID returns unchanged state', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');

    const originalLength = state.runners.length;
    state = runnerOut(state, 'non-existent');

    expect(state.runners.length).toBe(originalLength);
  });
});

// ============================================
// PITCHING CHANGE TESTS
// ============================================

describe('Pitching Change - Inherited/Bequeathed Runners', () => {
  test('pitching change transfers current pitcher', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');

    const result = handlePitchingChange(state, 'pitcher-2', 'Pitcher B');
    state = result.state;

    expect(state.currentPitcherId).toBe('pitcher-2');
    expect(state.currentPitcherName).toBe('Pitcher B');
  });

  test('pitching change marks runners as inherited', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');
    state = addRunner(state, 'runner-2', 'Batter Two', '2B', 'walk');

    const result = handlePitchingChange(state, 'pitcher-2', 'Pitcher B');
    state = result.state;

    // Runners are now inherited
    expect(state.runners[0].isInherited).toBe(true);
    expect(state.runners[0].inheritedFromPitcherId).toBe('pitcher-1');
    expect(state.runners[1].isInherited).toBe(true);
    expect(state.runners[1].inheritedFromPitcherId).toBe('pitcher-1');
  });

  test('pitching change tracks bequeathed runners for outgoing pitcher', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');
    state = addRunner(state, 'runner-2', 'Batter Two', '2B', 'walk');

    const result = handlePitchingChange(state, 'pitcher-2', 'Pitcher B');

    expect(result.bequeathedRunners).toHaveLength(2);
    expect(result.inheritedRunnerCount).toBe(2);

    const pitcherAStats = result.state.pitcherStats.get('pitcher-1')!;
    expect(pitcherAStats.bequeathedRunnerCount).toBe(2);
  });

  test('pitching change tracks inherited runners for incoming pitcher', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');

    const result = handlePitchingChange(state, 'pitcher-2', 'Pitcher B');

    const pitcherBStats = result.state.pitcherStats.get('pitcher-2')!;
    expect(pitcherBStats.inheritedRunners).toHaveLength(1);
    expect(pitcherBStats.inheritedRunners[0].runnerId).toBe('runner-1');
  });

  test('inherited runner who scores updates correct stats', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '3B', 'hit');

    const changeResult = handlePitchingChange(state, 'pitcher-2', 'Pitcher B');
    state = changeResult.state;

    const scoreResult = advanceRunner(state, 'runner-1', 'HOME');
    state = scoreResult.state;

    // ER goes to Pitcher A
    const pitcherAStats = state.pitcherStats.get('pitcher-1')!;
    expect(pitcherAStats.runnersScored).toHaveLength(1);

    // Inherited runner scored tracked for Pitcher B
    const pitcherBStats = state.pitcherStats.get('pitcher-2')!;
    expect(pitcherBStats.inheritedRunnersScored).toHaveLength(1);
  });

  test('pitching change with empty bases', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');

    const result = handlePitchingChange(state, 'pitcher-2', 'Pitcher B');

    expect(result.bequeathedRunners).toHaveLength(0);
    expect(result.inheritedRunnerCount).toBe(0);
  });

  test('runners added after pitching change NOT inherited', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');

    const changeResult = handlePitchingChange(state, 'pitcher-2', 'Pitcher B');
    state = changeResult.state;

    // Add runner after pitching change
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');

    // This runner is NOT inherited - Pitcher B put them on
    expect(state.runners[0].isInherited).toBe(false);
    expect(state.runners[0].responsiblePitcherId).toBe('pitcher-2');
  });
});

// ============================================
// PINCH RUNNER TESTS
// ============================================

describe('Pinch Runner', () => {
  test('pinch runner keeps same pitcher responsibility', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Original Runner', '2B', 'hit');

    state = handlePinchRunner(state, 'runner-1', 'pinch-1', 'Pinch Runner');

    expect(state.runners[0].runnerId).toBe('pinch-1');
    expect(state.runners[0].runnerName).toBe('Pinch Runner');
    expect(state.runners[0].responsiblePitcherId).toBe('pitcher-1');
  });

  test('pinch runner preserves inherited status', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Original Runner', '2B', 'hit');

    // Pitching change
    const changeResult = handlePitchingChange(state, 'pitcher-2', 'Pitcher B');
    state = changeResult.state;

    // Pinch runner
    state = handlePinchRunner(state, 'runner-1', 'pinch-1', 'Pinch Runner');

    expect(state.runners[0].isInherited).toBe(true);
    expect(state.runners[0].inheritedFromPitcherId).toBe('pitcher-1');
  });

  test('pinch runner scores - ER charged to original responsible pitcher', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Original Runner', '3B', 'walk');

    // Pinch runner
    state = handlePinchRunner(state, 'runner-1', 'pinch-1', 'Pinch Runner');

    // Score
    const result = advanceRunner(state, 'pinch-1', 'HOME');

    expect(result.scoredEvent!.chargedToPitcherId).toBe('pitcher-1');
    expect(result.scoredEvent!.wasEarnedRun).toBe(true);
  });

  test('pinch runner with invalid original ID returns unchanged state', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Original Runner', '2B', 'hit');

    const originalState = state;
    state = handlePinchRunner(state, 'non-existent', 'pinch-1', 'Pinch Runner');

    expect(state.runners[0].runnerId).toBe('runner-1'); // Unchanged
  });
});

// ============================================
// INNING MANAGEMENT TESTS
// ============================================

describe('Inning Management', () => {
  test('clearBases removes all runners', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');
    state = addRunner(state, 'runner-2', 'Batter Two', '2B', 'walk');

    state = clearBases(state);

    expect(state.runners).toHaveLength(0);
  });

  test('nextInning clears bases and increments inning', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');

    state = nextInning(state);

    expect(state.runners).toHaveLength(0);
    expect(state.inning).toBe(2);
    expect(state.atBatNumber).toBe(1); // Reset
  });

  test('nextAtBat increments at-bat number', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');

    state = nextAtBat(state);
    expect(state.atBatNumber).toBe(2);

    state = nextAtBat(state);
    expect(state.atBatNumber).toBe(3);
  });
});

// ============================================
// SUMMARY FUNCTIONS TESTS
// ============================================

describe('Summary Functions', () => {
  test('getERSummary returns correct earned/unearned counts', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');

    // Earned run
    state = addRunner(state, 'runner-1', 'ER Runner', '3B', 'hit');
    let result = advanceRunner(state, 'runner-1', 'HOME');
    state = result.state;

    // Unearned run
    state = addRunner(state, 'runner-2', 'UER Runner', '3B', 'error');
    result = advanceRunner(state, 'runner-2', 'HOME');
    state = result.state;

    const summary = getERSummary(state);

    expect(summary).toHaveLength(1);
    expect(summary[0].earnedRuns).toBe(1);
    expect(summary[0].unearnedRuns).toBe(1);
  });

  test('getERSummary tracks inherited runners scored', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '3B', 'hit');

    // Pitching change
    const changeResult = handlePitchingChange(state, 'pitcher-2', 'Pitcher B');
    state = changeResult.state;

    // Inherited runner scores
    const scoreResult = advanceRunner(state, 'runner-1', 'HOME');
    state = scoreResult.state;

    const summary = getERSummary(state);

    // Find Pitcher B's stats
    const pitcherBSummary = summary.find(s => s.pitcherId === 'pitcher-2')!;
    expect(pitcherBSummary.inheritedRunnersScored).toBe(1);

    // ER charged to Pitcher A
    const pitcherASummary = summary.find(s => s.pitcherId === 'pitcher-1')!;
    expect(pitcherASummary.earnedRuns).toBe(1);
  });

  test('getERSummary tracks bequeathed runners', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');
    state = addRunner(state, 'runner-2', 'Batter Two', '2B', 'hit');

    const changeResult = handlePitchingChange(state, 'pitcher-2', 'Pitcher B');
    state = changeResult.state;

    const summary = getERSummary(state);

    const pitcherASummary = summary.find(s => s.pitcherId === 'pitcher-1')!;
    expect(pitcherASummary.bequeathedRunners).toBe(2);
  });

  test('getCurrentBases returns correct base state', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'First Base', '1B', 'hit');
    state = addRunner(state, 'runner-2', 'Second Base', '2B', 'walk');
    state = addRunner(state, 'runner-3', 'Third Base', '3B', 'hbp');

    const bases = getCurrentBases(state);

    expect(bases.first?.playerName).toBe('First Base');
    expect(bases.second?.playerName).toBe('Second Base');
    expect(bases.third?.playerName).toBe('Third Base');
  });

  test('getCurrentBases shows inherited status', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');

    const changeResult = handlePitchingChange(state, 'pitcher-2', 'Pitcher B');
    state = changeResult.state;

    const bases = getCurrentBases(state);

    expect(bases.first?.inheritedFrom).toBe('pitcher-1');
  });

  test('getCurrentBases with empty bases', () => {
    const state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    const bases = getCurrentBases(state);

    expect(bases.first).toBeNull();
    expect(bases.second).toBeNull();
    expect(bases.third).toBeNull();
  });
});

// ============================================
// COMPLEX SCENARIO TESTS
// ============================================

describe('Complex Scenarios', () => {
  test('multiple pitching changes track inherited runners correctly', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '1B', 'hit');

    // First pitching change
    let changeResult = handlePitchingChange(state, 'pitcher-2', 'Pitcher B');
    state = changeResult.state;

    // Pitcher B adds another runner
    state = addRunner(state, 'runner-2', 'Batter Two', '2B', 'walk');

    // Second pitching change
    changeResult = handlePitchingChange(state, 'pitcher-3', 'Pitcher C');
    state = changeResult.state;

    // Both runners now inherited by Pitcher C
    expect(changeResult.inheritedRunnerCount).toBe(2);

    // runner-1 was originally Pitcher A's responsibility
    const runner1 = state.runners.find(r => r.runnerId === 'runner-1')!;
    expect(runner1.responsiblePitcherId).toBe('pitcher-1');

    // runner-2 was originally Pitcher B's responsibility
    const runner2 = state.runners.find(r => r.runnerId === 'runner-2')!;
    expect(runner2.responsiblePitcherId).toBe('pitcher-2');
  });

  test('inning with multiple runs tracks ER correctly', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');

    // Pitcher A allows bases loaded
    state = addRunner(state, 'runner-1', 'Walk 1', '3B', 'walk');
    state = addRunner(state, 'runner-2', 'Walk 2', '2B', 'walk');
    state = addRunner(state, 'runner-3', 'Error reach', '1B', 'error');

    // Pitching change with bases loaded
    const changeResult = handlePitchingChange(state, 'pitcher-2', 'Pitcher B');
    state = changeResult.state;

    // Grand slam clears the bases
    let result = advanceRunner(state, 'runner-1', 'HOME');
    state = result.state;
    expect(result.scoredEvent!.wasEarnedRun).toBe(true);
    expect(result.scoredEvent!.chargedToPitcherId).toBe('pitcher-1');

    result = advanceRunner(state, 'runner-2', 'HOME');
    state = result.state;
    expect(result.scoredEvent!.wasEarnedRun).toBe(true);
    expect(result.scoredEvent!.chargedToPitcherId).toBe('pitcher-1');

    result = advanceRunner(state, 'runner-3', 'HOME');
    state = result.state;
    expect(result.scoredEvent!.wasEarnedRun).toBe(false); // Reached on error
    expect(result.scoredEvent!.chargedToPitcherId).toBe('pitcher-1');

    // Summary check
    const summary = getERSummary(state);
    const pitcherA = summary.find(s => s.pitcherId === 'pitcher-1')!;
    expect(pitcherA.earnedRuns).toBe(2); // 2 walks scored as ER
    expect(pitcherA.unearnedRuns).toBe(1); // Error runner scored as UER

    const pitcherB = summary.find(s => s.pitcherId === 'pitcher-2')!;
    expect(pitcherB.inheritedRunnersScored).toBe(3);
    expect(pitcherB.earnedRuns).toBe(0); // Didn't allow any himself
  });

  test('combination of runners scoring and getting out', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Runner 1', '3B', 'hit');
    state = addRunner(state, 'runner-2', 'Runner 2', '2B', 'hit');
    state = addRunner(state, 'runner-3', 'Runner 3', '1B', 'hit');

    // Runner 1 scores
    let result = advanceRunner(state, 'runner-1', 'HOME');
    state = result.state;

    // Runner 2 is out
    state = runnerOut(state, 'runner-2');

    // Runner 3 advances and scores
    result = advanceRunner(state, 'runner-3', '3B');
    state = result.state;
    result = advanceRunner(state, 'runner-3', 'HOME');
    state = result.state;

    const summary = getERSummary(state);
    const pitcherA = summary.find(s => s.pitcherId === 'pitcher-1')!;
    expect(pitcherA.earnedRuns).toBe(2);

    // Check state.runners is empty (all scored or out)
    expect(state.runners).toHaveLength(0);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('same pitcher for entire game', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');

    // Multiple innings, no pitching change
    for (let i = 0; i < 9; i++) {
      state = addRunner(state, `runner-${i}`, `Batter ${i}`, '3B', 'hit');
      const result = advanceRunner(state, `runner-${i}`, 'HOME');
      state = result.state;
      state = nextInning(state);
    }

    const summary = getERSummary(state);
    expect(summary).toHaveLength(1);
    expect(summary[0].earnedRuns).toBe(9);
    expect(summary[0].inheritedRunnersScored).toBe(0);
  });

  test('all runners reach on error - 0 ER', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');

    state = addRunner(state, 'runner-1', 'Error 1', '3B', 'error');
    let result = advanceRunner(state, 'runner-1', 'HOME');
    state = result.state;

    state = addRunner(state, 'runner-2', 'Error 2', '3B', 'error');
    result = advanceRunner(state, 'runner-2', 'HOME');
    state = result.state;

    const summary = getERSummary(state);
    expect(summary[0].earnedRuns).toBe(0);
    expect(summary[0].unearnedRuns).toBe(2);
  });

  test('runner tracking persists through inning boundaries', () => {
    let state = createRunnerTrackingState('pitcher-1', 'Pitcher A');
    state = addRunner(state, 'runner-1', 'Batter One', '3B', 'hit');

    // Pitch change at end of inning (rare but possible)
    const changeResult = handlePitchingChange(state, 'pitcher-2', 'Pitcher B');
    state = changeResult.state;

    // Runner scores in next inning
    const scoreResult = advanceRunner(state, 'runner-1', 'HOME');
    state = scoreResult.state;

    // Still charged to Pitcher A
    expect(scoreResult.scoredEvent!.chargedToPitcherId).toBe('pitcher-1');
  });
});
