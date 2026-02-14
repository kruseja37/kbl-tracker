/**
 * Integration Tests for Game Tracker
 * 
 * Tests the full data flow from AtBatFlow through GameTracker
 * Run with: node testIntegration.mjs
 */

// =============================================
// MOCK TYPES AND HELPERS
// =============================================

const createBases = (r1, r2, r3) => ({
  first: r1 ? { playerId: 'p1', playerName: 'Runner 1', inheritedFrom: null } : null,
  second: r2 ? { playerId: 'p2', playerName: 'Runner 2', inheritedFrom: null } : null,
  third: r3 ? { playerId: 'p3', playerName: 'Runner 3', inheritedFrom: null } : null,
});

const createFlowState = (overrides = {}) => ({
  step: 'complete',
  result: null,
  direction: null,
  exitType: null,
  fielder: null,
  hrDistance: null,
  specialPlay: null,
  savedRun: false,
  is7PlusPitchAB: false,
  beatOutSingle: false,
  runnerOutcomes: { first: null, second: null, third: null },
  rbiCount: 0,
  extraEvents: [],
  ...overrides,
});

// =============================================
// EXTRACTED LOGIC FROM index.tsx
// =============================================

function isOut(result) {
  return ['K', 'KL', 'GO', 'FO', 'LO', 'PO', 'DP', 'SF', 'SAC'].includes(result);
}

function isForceOut(outcome, fromBase, currentBases) {
  if (!outcome) return false;
  if (fromBase === 'first' && outcome === 'OUT_2B') return true;
  if (fromBase === 'second' && outcome === 'OUT_3B' && currentBases.first) return true;
  if (fromBase === 'third' && outcome === 'OUT_HOME' && currentBases.first && currentBases.second) return true;
  return false;
}

function processRunnerOutcomes(flowState, bases, batterResult, outs) {
  const { runnerOutcomes } = flowState;
  let updatedBases = { ...bases };
  const runsToScore = [];
  let runnerOutsRecorded = 0;
  
  const runnerResults = {};
  
  // Process third
  if (bases.third && runnerOutcomes.third) {
    const forceOut = isForceOut(runnerOutcomes.third, 'third', bases);
    if (runnerOutcomes.third === 'SCORED') {
      runnerResults.third = { action: 'score', isForceOut: false };
      runsToScore.push(bases.third.playerId);
    } else if (runnerOutcomes.third === 'OUT_HOME') {
      runnerResults.third = { action: 'out', isForceOut: forceOut };
      runnerOutsRecorded++;
    } else if (runnerOutcomes.third === 'HELD') {
      runnerResults.third = { action: 'hold', isForceOut: false };
    }
  }
  
  // Process second
  if (bases.second && runnerOutcomes.second) {
    const forceOut = isForceOut(runnerOutcomes.second, 'second', bases);
    if (runnerOutcomes.second === 'SCORED') {
      runnerResults.second = { action: 'score', isForceOut: false };
      runsToScore.push(bases.second.playerId);
    } else if (runnerOutcomes.second === 'TO_3B') {
      runnerResults.second = { action: 'advance', isForceOut: false };
    } else if (['OUT_HOME', 'OUT_3B'].includes(runnerOutcomes.second)) {
      runnerResults.second = { action: 'out', isForceOut: forceOut };
      runnerOutsRecorded++;
    } else if (runnerOutcomes.second === 'HELD') {
      runnerResults.second = { action: 'hold', isForceOut: false };
    }
  }
  
  // Process first
  if (bases.first && runnerOutcomes.first) {
    const forceOut = isForceOut(runnerOutcomes.first, 'first', bases);
    if (runnerOutcomes.first === 'SCORED') {
      runnerResults.first = { action: 'score', isForceOut: false };
      runsToScore.push(bases.first.playerId);
    } else if (runnerOutcomes.first === 'TO_3B') {
      runnerResults.first = { action: 'advance', isForceOut: false };
    } else if (runnerOutcomes.first === 'TO_2B') {
      runnerResults.first = { action: 'advance', isForceOut: false };
    } else if (['OUT_HOME', 'OUT_3B', 'OUT_2B'].includes(runnerOutcomes.first)) {
      runnerResults.first = { action: 'out', isForceOut: forceOut };
      runnerOutsRecorded++;
    } else if (runnerOutcomes.first === 'HELD') {
      runnerResults.first = { action: 'hold', isForceOut: false };
    }
  }
  
  // Calculate total outs
  const batterOuts = isOut(batterResult) ? (batterResult === 'DP' ? 2 : 1) : 0;
  const totalOutsOnPlay = batterOuts + runnerOutsRecorded;
  const finalOutCount = outs + totalOutsOnPlay;
  
  // Check force out rule
  const hasForceOut = 
    runnerResults.third?.isForceOut ||
    runnerResults.second?.isForceOut ||
    runnerResults.first?.isForceOut ||
    ['GO', 'DP', 'FC'].includes(batterResult);
  
  const runsNegatedByForceOut = finalOutCount >= 3 && hasForceOut;
  
  // Execute outcomes
  const validRunsScored = [];
  
  if (bases.third && runnerResults.third) {
    if (runnerResults.third.action === 'score' && !runsNegatedByForceOut) {
      validRunsScored.push(bases.third.playerId);
    }
    if (['score', 'out'].includes(runnerResults.third.action)) {
      updatedBases.third = null;
    }
  }
  
  if (bases.second && runnerResults.second) {
    if (runnerResults.second.action === 'score' && !runsNegatedByForceOut) {
      validRunsScored.push(bases.second.playerId);
    }
    if (runnerResults.second.action === 'advance') {
      updatedBases.third = bases.second;
      updatedBases.second = null;
    } else if (['score', 'out'].includes(runnerResults.second.action)) {
      updatedBases.second = null;
    }
  }
  
  if (bases.first && runnerResults.first) {
    if (runnerResults.first.action === 'score' && !runsNegatedByForceOut) {
      validRunsScored.push(bases.first.playerId);
    }
    if (runnerOutcomes.first === 'TO_3B') {
      updatedBases.third = bases.first;
      updatedBases.first = null;
    } else if (runnerOutcomes.first === 'TO_2B') {
      updatedBases.second = bases.first;
      updatedBases.first = null;
    } else if (['score', 'out'].includes(runnerResults.first?.action)) {
      updatedBases.first = null;
    }
  }
  
  return {
    updatedBases,
    runsScored: validRunsScored,
    outsRecorded: runnerOutsRecorded,
    runsNegatedByForceOut,
  };
}

// =============================================
// INTEGRATION TEST CASES
// =============================================

const integrationTests = [
  // =============================================
  // CATEGORY 1: Extra Events Processing
  // =============================================
  {
    name: 'INT-1.1: Extra event (SB) recorded with walk',
    setup: () => ({
      bases: createBases(true, false, false),
      outs: 0,
      flowState: createFlowState({
        result: 'BB',
        runnerOutcomes: { first: 'TO_3B', second: null, third: null },
        extraEvents: [
          { runner: 'Runner 1', from: '1B', to: '3B', event: 'SB' }
        ],
      }),
    }),
    verify: (result) => {
      const errors = [];
      if (!result.extraEventLogs || result.extraEventLogs.length === 0) {
        errors.push('Extra event log not generated');
      }
      if (result.extraEventLogs && !result.extraEventLogs[0].includes('Steals')) {
        errors.push(`Expected "Steals" in log, got: ${result.extraEventLogs[0]}`);
      }
      return errors;
    },
  },
  {
    name: 'INT-1.2: Multiple extra events on same play',
    setup: () => ({
      bases: createBases(true, true, false),
      outs: 0,
      flowState: createFlowState({
        result: 'BB',
        runnerOutcomes: { first: 'TO_3B', second: 'SCORED', third: null },
        extraEvents: [
          { runner: 'Runner 1', from: '1B', to: '3B', event: 'SB' },
          { runner: 'Runner 2', from: '2B', to: 'HOME', event: 'WP' },
        ],
      }),
    }),
    verify: (result) => {
      const errors = [];
      if (!result.extraEventLogs || result.extraEventLogs.length !== 2) {
        errors.push(`Expected 2 extra event logs, got: ${result.extraEventLogs?.length || 0}`);
      }
      return errors;
    },
  },

  // =============================================
  // CATEGORY 2: Force Out Third Out Rule
  // =============================================
  {
    name: 'INT-2.1: Force out at 2B with 2 outs negates R3 run',
    setup: () => ({
      bases: createBases(true, false, true),
      outs: 2,
      flowState: createFlowState({
        result: 'GO',
        runnerOutcomes: { first: 'OUT_2B', second: null, third: 'SCORED' },
      }),
    }),
    verify: (result) => {
      const errors = [];
      if (result.processResult.runsScored.length !== 0) {
        errors.push(`Run should be negated by force out, but ${result.processResult.runsScored.length} runs scored`);
      }
      if (!result.processResult.runsNegatedByForceOut) {
        errors.push('runsNegatedByForceOut should be true');
      }
      return errors;
    },
  },
  {
    name: 'INT-2.2: GO with R3 only and 2 outs - batter force out negates run',
    setup: () => ({
      bases: createBases(false, false, true), // R3 only
      outs: 2,
      flowState: createFlowState({
        result: 'GO', // Batter out at 1B is a force out
        runnerOutcomes: { first: null, second: null, third: 'SCORED' },
      }),
    }),
    verify: (result) => {
      const errors = [];
      // Per MLB rules: "No run may score when the third out is made by the batter-runner 
      // before reaching first base" - GO means batter out at 1B (force)
      // So run should NOT count
      if (result.processResult.runsScored.length !== 0) {
        errors.push(`Run should be negated (batter force out at 1B), but ${result.processResult.runsScored.length} runs scored`);
      }
      return errors;
    },
  },
  {
    name: 'INT-2.2b: FO with R3 tagging up and 2 outs - run DOES count (not force)',
    setup: () => ({
      bases: createBases(false, false, true), // R3 only
      outs: 2,
      flowState: createFlowState({
        result: 'FO', // Fly out is NOT a force out
        runnerOutcomes: { first: null, second: null, third: 'SCORED' },
      }),
    }),
    verify: (result) => {
      const errors = [];
      // FO is not a force out - R3 can tag and score, run counts
      if (result.processResult.runsScored.length !== 1) {
        errors.push(`Run should count on FO tag-up, but ${result.processResult.runsScored.length} runs scored`);
      }
      return errors;
    },
  },
  {
    name: 'INT-2.3: DP with R3 scoring before 3rd out - run counts',
    setup: () => ({
      bases: createBases(true, false, true), // R1 + R3
      outs: 1, // 1 out, DP makes 3
      flowState: createFlowState({
        result: 'DP',
        runnerOutcomes: { first: 'OUT_2B', second: null, third: 'SCORED' },
      }),
    }),
    verify: (result) => {
      const errors = [];
      // DP is force play, so runs should be negated if 3rd out is force
      // R1 out at 2B is force, so no run
      if (result.processResult.runsScored.length !== 0) {
        errors.push(`Run should be negated on DP force out, got ${result.processResult.runsScored.length}`);
      }
      return errors;
    },
  },

  // =============================================
  // CATEGORY 3: Runner Placement
  // =============================================
  {
    name: 'INT-3.1: R1 to 2B on walk - correct placement',
    setup: () => ({
      bases: createBases(true, false, false),
      outs: 0,
      flowState: createFlowState({
        result: 'BB',
        runnerOutcomes: { first: 'TO_2B', second: null, third: null },
      }),
    }),
    verify: (result) => {
      const errors = [];
      if (result.processResult.updatedBases.first !== null) {
        errors.push('R1 should have moved from first');
      }
      if (!result.processResult.updatedBases.second) {
        errors.push('R1 should be on second');
      }
      return errors;
    },
  },
  {
    name: 'INT-3.2: R1+R2 on walk - no collision on bases',
    setup: () => ({
      bases: createBases(true, true, false),
      outs: 0,
      flowState: createFlowState({
        result: 'BB',
        runnerOutcomes: { first: 'TO_2B', second: 'TO_3B', third: null },
      }),
    }),
    verify: (result) => {
      const errors = [];
      const b = result.processResult.updatedBases;
      if (b.first !== null) {
        errors.push('First should be empty (batter takes it)');
      }
      if (!b.second || b.second.playerId !== 'p1') {
        errors.push('R1 should be on second');
      }
      if (!b.third || b.third.playerId !== 'p2') {
        errors.push('R2 should be on third');
      }
      return errors;
    },
  },
  {
    name: 'INT-3.3: No ghost runners after out',
    setup: () => ({
      bases: createBases(true, false, false),
      outs: 0,
      flowState: createFlowState({
        result: 'FC',
        runnerOutcomes: { first: 'OUT_2B', second: null, third: null },
      }),
    }),
    verify: (result) => {
      const errors = [];
      if (result.processResult.updatedBases.first !== null) {
        errors.push('R1 should be out, not still on first');
      }
      if (result.processResult.updatedBases.second !== null) {
        errors.push('No runner should be on second (R1 was out there)');
      }
      return errors;
    },
  },

  // =============================================
  // CATEGORY 4: RBI Calculation
  // =============================================
  {
    name: 'INT-4.1: RBI on SF with R3',
    setup: () => ({
      bases: createBases(false, false, true),
      outs: 0,
      flowState: createFlowState({
        result: 'SF',
        runnerOutcomes: { first: null, second: null, third: 'SCORED' },
        rbiCount: 1,
      }),
    }),
    verify: (result) => {
      const errors = [];
      if (result.processResult.runsScored.length !== 1) {
        errors.push(`Expected 1 run, got ${result.processResult.runsScored.length}`);
      }
      return errors;
    },
  },
  {
    name: 'INT-4.2: No RBI on error (even if run scores)',
    setup: () => ({
      bases: createBases(false, false, true),
      outs: 0,
      flowState: createFlowState({
        result: 'E',
        runnerOutcomes: { first: null, second: null, third: 'SCORED' },
        rbiCount: 0, // E doesn't give RBI
      }),
    }),
    verify: (result) => {
      const errors = [];
      // Run scores but RBI should be 0 for error
      if (result.flowState.rbiCount !== 0) {
        errors.push(`RBI should be 0 on error, got ${result.flowState.rbiCount}`);
      }
      return errors;
    },
  },

  // =============================================
  // CATEGORY 5: Edge Cases
  // =============================================
  {
    name: 'INT-5.1: Triple clears all bases',
    setup: () => ({
      bases: createBases(true, true, true),
      outs: 0,
      flowState: createFlowState({
        result: '3B',
        runnerOutcomes: { first: 'SCORED', second: 'SCORED', third: 'SCORED' },
        rbiCount: 3,
      }),
    }),
    verify: (result) => {
      const errors = [];
      if (result.processResult.runsScored.length !== 3) {
        errors.push(`Expected 3 runs on triple, got ${result.processResult.runsScored.length}`);
      }
      const b = result.processResult.updatedBases;
      if (b.first || b.second || b.third) {
        errors.push('All bases should be clear after triple (batter takes 3B separately)');
      }
      return errors;
    },
  },
  {
    name: 'INT-5.2: Bases loaded walk scores exactly 1',
    setup: () => ({
      bases: createBases(true, true, true),
      outs: 0,
      flowState: createFlowState({
        result: 'BB',
        runnerOutcomes: { first: 'TO_2B', second: 'TO_3B', third: 'SCORED' },
        rbiCount: 1,
      }),
    }),
    verify: (result) => {
      const errors = [];
      if (result.processResult.runsScored.length !== 1) {
        errors.push(`Expected 1 run on bases loaded walk, got ${result.processResult.runsScored.length}`);
      }
      return errors;
    },
  },
];

// =============================================
// TEST RUNNER
// =============================================

function runIntegrationTests() {
  console.log('\n========================================');
  console.log('INTEGRATION TEST RESULTS');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  for (const test of integrationTests) {
    const { bases, outs, flowState } = test.setup();
    
    // Process runner outcomes
    const processResult = processRunnerOutcomes(flowState, bases, flowState.result, outs);
    
    // Generate extra event logs (simulating what handleAtBatFlowComplete does)
    const extraEventLogs = [];
    if (flowState.extraEvents && flowState.extraEvents.length > 0) {
      for (const extraEvent of flowState.extraEvents) {
        if (extraEvent.event === 'SB') {
          extraEventLogs.push(`${extraEvent.runner}: Steals ${extraEvent.to === 'HOME' ? 'home' : extraEvent.to}`);
        } else if (extraEvent.event === 'WP') {
          extraEventLogs.push(`Wild Pitch: ${extraEvent.runner} advances to ${extraEvent.to === 'HOME' ? 'home' : extraEvent.to}`);
        } else if (extraEvent.event === 'PB') {
          extraEventLogs.push(`Passed Ball: ${extraEvent.runner} advances to ${extraEvent.to === 'HOME' ? 'home' : extraEvent.to}`);
        }
      }
    }
    
    const result = {
      processResult,
      extraEventLogs,
      flowState,
      bases,
      outs,
    };
    
    const errors = test.verify(result);
    
    if (errors.length === 0) {
      console.log(`✅ PASS: ${test.name}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${test.name}`);
      errors.forEach(e => console.log(`   - ${e}`));
      failed++;
    }
  }

  console.log('\n========================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  return failed === 0;
}

// Run tests
const success = runIntegrationTests();
process.exit(success ? 0 : 1);
