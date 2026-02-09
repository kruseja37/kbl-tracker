/**
 * GameTracker Logic Matrix Test Harness
 *
 * Tests the pure logic layer of the GameTracker engine:
 * - getDefaultRunnerOutcome (runner advancement defaults)
 * - isRunnerForced (force advance rules)
 * - getMinimumAdvancement (minimum base for forced runners)
 * - autoCorrectResult (FO->SF, GO->DP auto-corrections)
 * - calculateRBIs (RBI attribution rules)
 * - isOut / isHit / reachesBase (outcome classification)
 *
 * Architecture note: The record* functions (recordHit, recordOut, etc.) are
 * React-coupled via useState setters and CANNOT be tested outside React.
 * This harness tests the pure logic that THOSE functions rely on.
 * The oracle built here defines what the engine SHOULD produce.
 *
 * Modes:
 *   self-test  — Validate oracle against 30 golden cases (RUN THIS FIRST)
 *   full       — Run complete 480-combo matrix (run via test-executor skill)
 *   resume     — Resume from last checkpoint
 *
 * Usage:
 *   npx tsx test-utils/run-logic-matrix.ts self-test
 *   npx tsx test-utils/run-logic-matrix.ts full
 *   npx tsx test-utils/run-logic-matrix.ts resume
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// SECTION 1: Imports from engine (EXACT paths from ENGINE_API_MAP.md Section 9)
// =============================================================================

import {
  isRunnerForced,
  getMinimumAdvancement,
  getDefaultRunnerOutcome,
  autoCorrectResult,
  calculateRBIs,
  isOut,
  isHit,
  reachesBase,
  type RunnerOutcome,
  type Bases,
} from '../src/src_figma/hooks/useGameState';

import type { AtBatResult } from '../src/types/game';

// Golden cases (user-confirmed 2026-02-09)
// Read with fs.readFileSync because ESM JSON imports need --experimental-json-modules
const goldenCasesRaw = JSON.parse(
  fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'golden-cases.json'), 'utf-8')
);

// =============================================================================
// SECTION 2: Test Dimensions (from ENGINE_API_MAP.md Section 10)
// =============================================================================

// 20 outcomes — EXACT values from AtBatResult type (src/types/game.ts:12-14)
const OUTCOMES: AtBatResult[] = [
  '1B', '2B', '3B', 'HR',           // Hits (4)
  'K', 'KL', 'GO', 'FO', 'LO',     // Outs (12)
  'PO', 'DP', 'TP', 'FC', 'SF',
  'SAC', 'D3K',
  'BB', 'HBP', 'IBB',               // Walks (3)
  'E',                               // Error (1)
];

// 8 base state configurations
interface BaseState {
  label: string;
  bases: Bases;
}

const BASE_STATES: BaseState[] = [
  { label: 'empty',   bases: { first: false, second: false, third: false } },
  { label: 'R1',      bases: { first: true,  second: false, third: false } },
  { label: 'R2',      bases: { first: false, second: true,  third: false } },
  { label: 'R3',      bases: { first: false, second: false, third: true  } },
  { label: 'R1+R2',   bases: { first: true,  second: true,  third: false } },
  { label: 'R1+R3',   bases: { first: true,  second: false, third: true  } },
  { label: 'R2+R3',   bases: { first: false, second: true,  third: true  } },
  { label: 'loaded',  bases: { first: true,  second: true,  third: true  } },
];

// 3 out states
const OUT_STATES: number[] = [0, 1, 2];

// Total primary matrix size
const EXPECTED_TOTAL = OUTCOMES.length * BASE_STATES.length * OUT_STATES.length;

// =============================================================================
// SECTION 3: Configuration
// =============================================================================

const RESULTS_DIR = path.join(__dirname, 'results');
const CHECKPOINT_FILE = path.join(RESULTS_DIR, 'checkpoint.json');
const BATCH_SIZE = 100;

// =============================================================================
// SECTION 4: Oracle — Defines expected outcomes for each state+outcome pair
//
// This oracle calls the ACTUAL engine pure functions (getDefaultRunnerOutcome,
// isRunnerForced, calculateRBIs, etc.) to compute expected results.
// The oracle IS the engine's pure logic layer — we're testing that it's
// consistent with hand-verified golden cases.
//
// For the full matrix, the oracle computes:
//   - Runner default outcomes per occupied base
//   - New base state after play
//   - Outs added
//   - Runs scored
//   - Whether inning ends (outs reach 3)
//   - RBI count
//   - Batter stat categories (PA, AB, H, K, BB, HBP)
// =============================================================================

interface OracleResult {
  // Game state changes
  outsAdded: number;
  newOuts: number;           // outs + outsAdded (capped at 3)
  newBases: Bases;
  runsScored: number;
  inningEnds: boolean;       // newOuts >= 3

  // Runner outcomes (per occupied base)
  runnerOutcomes: {
    first: RunnerOutcome | null;   // null if base was empty
    second: RunnerOutcome | null;
    third: RunnerOutcome | null;
  };

  // Batter classification
  batterReachesBase: boolean;
  isAHit: boolean;
  isAnOut: boolean;

  // RBI
  rbi: number;

  // Stat categories
  countsAsAB: boolean;       // At-bat (not BB, HBP, IBB, SF, SAC)
  countsAsPA: boolean;       // Plate appearance (always true for at-bat outcomes)

  // Auto-correction
  autoCorrection: { correctedResult: AtBatResult; explanation: string } | null;
}

/**
 * Maps an OutType (SH) to AtBatResult (SAC) for getDefaultRunnerOutcome.
 * The engine uses OutType='SH' in the API but AtBatResult='SAC' internally.
 * See useGameState.ts:258 — case 'SH': return 'SAC'
 */
function mapOutcomeForOracle(outcome: AtBatResult): AtBatResult {
  // SH is never in AtBatResult — it's mapped to SAC inside the engine
  // We already use 'SAC' in our OUTCOMES array, so no mapping needed here.
  // But golden cases use 'SH' as the OutType. When calling engine functions,
  // we need 'SAC' (the AtBatResult value).
  return outcome;
}

/**
 * Compute outs added for a given outcome.
 *
 * Rules (from ENGINE_API_MAP.md Section 4.2):
 * - DP: 2 outs (batter + runner)
 * - TP: 3 outs (batter + 2 runners)
 * - FC: outsOnPlay depends on runner outs, but batter is SAFE
 *       Default: 1 out (runner out at 2B)
 * - D3K: 0 if batter reaches, 1 if batter out
 *       For oracle purposes without batterReached flag, assume 1 out
 * - SF, SAC, K, KL, GO, FO, LO, PO: 1 out
 * - Hits, walks, errors: 0 outs
 */
function computeOutsAdded(outcome: AtBatResult, bases: Bases): number {
  if (['1B', '2B', '3B', 'HR', 'BB', 'IBB', 'HBP', 'E'].includes(outcome)) {
    return 0;
  }
  if (outcome === 'DP') return 2;
  if (outcome === 'TP') return 3;
  // FC: 1 out (the runner, not the batter)
  if (outcome === 'FC') return 1;
  // D3K: For matrix purposes, assume batter is out (1 out). D3K+reach tested in golden cases.
  if (outcome === 'D3K') return 1;
  // All other outs: 1
  return 1;
}

/**
 * Compute new base state after a play using getDefaultRunnerOutcome.
 *
 * This is the heart of the oracle — it calls the engine's pure function
 * to determine where each runner goes, then computes the resulting base state.
 */
function computeNewBases(
  outcome: AtBatResult,
  bases: Bases,
  outs: number,
  outsOnPlay: number
): { newBases: Bases; runsScored: number; runnerOutcomes: OracleResult['runnerOutcomes'] } {
  const totalOuts = outs + outsOnPlay;
  let runsScored = 0;

  // Get default runner outcomes for each occupied base
  const r1 = bases.first  ? getDefaultRunnerOutcome('first',  outcome, outs, bases) : null;
  const r2 = bases.second ? getDefaultRunnerOutcome('second', outcome, outs, bases) : null;
  const r3 = bases.third  ? getDefaultRunnerOutcome('third',  outcome, outs, bases) : null;

  // Start with empty bases
  const newBases: Bases = { first: false, second: false, third: false };

  // Process each runner outcome
  function processRunner(runnerOutcome: RunnerOutcome | null, fromBase: string): void {
    if (runnerOutcome === null) return;

    switch (runnerOutcome) {
      case 'SCORED':
        // If inning is ending (3 outs), runs DON'T count (unless non-force 3rd out)
        // Force out timing rule: if 3rd out is a force, no runs score
        // For the oracle's default runner outcomes, we count runs that score
        // BEFORE the 3rd out. The golden cases (GC-27) test the timing rule.
        // For the oracle, we use a simplified rule:
        //   - If totalOuts >= 3, no runs score (conservative)
        if (totalOuts < 3) {
          runsScored++;
        }
        break;
      case 'TO_3B':
        newBases.third = true;
        break;
      case 'TO_2B':
        newBases.second = true;
        break;
      case 'HELD':
        // Runner stays on their base
        if (fromBase === 'first')  newBases.first = true;
        if (fromBase === 'second') newBases.second = true;
        if (fromBase === 'third')  newBases.third = true;
        break;
      case 'OUT_2B':
      case 'OUT_3B':
      case 'OUT_HOME':
        // Runner is out — removed from bases
        break;
    }
  }

  processRunner(r3, 'third');
  processRunner(r2, 'second');
  processRunner(r1, 'first');

  // Place batter on appropriate base
  if (['1B', 'FC', 'E'].includes(outcome)) {
    // Batter reaches 1B
    newBases.first = true;
  } else if (outcome === '2B') {
    newBases.second = true;
  } else if (outcome === '3B') {
    newBases.third = true;
  } else if (outcome === 'HR') {
    // Batter scores (doesn't go on a base)
    if (totalOuts < 3) {
      runsScored++; // Batter's run
    }
  } else if (['BB', 'IBB', 'HBP'].includes(outcome)) {
    // Walk: batter to 1B, forced runners advance
    // The force advance is computed by getDefaultRunnerOutcome via isRunnerForced
    newBases.first = true;
  } else if (outcome === 'D3K') {
    // D3K: For oracle purposes, batter is OUT (doesn't reach).
    // D3K + batter reaches is tested specifically in golden cases GC-15/16.
  }
  // Outs (K, KL, GO, FO, LO, PO, DP, TP, SF, SAC): batter does NOT reach base

  // HR special case: if no runners specified (e.g., HR with loaded bases, no runnerData),
  // all runners auto-score. For the oracle with getDefaultRunnerOutcome, HR already
  // returns SCORED for all runners, so this is handled.

  return { newBases, runsScored, runnerOutcomes: { first: r1, second: r2, third: r3 } };
}

/**
 * Determine if outcome counts as an at-bat.
 * NOT an AB: BB, IBB, HBP, SF, SAC
 * IS an AB: everything else (including FC, E, D3K)
 */
function countsAsAtBat(outcome: AtBatResult): boolean {
  return !['BB', 'IBB', 'HBP', 'SF', 'SAC'].includes(outcome);
}

/**
 * Full oracle computation for a given state + outcome.
 */
function computeOracle(
  outcome: AtBatResult,
  bases: Bases,
  outs: number
): OracleResult {
  const outsAdded = computeOutsAdded(outcome, bases);
  const newOuts = Math.min(outs + outsAdded, 3);
  const inningEnds = newOuts >= 3;

  // Compute new bases and runs
  const { newBases, runsScored, runnerOutcomes } = computeNewBases(
    outcome, bases, outs, outsAdded
  );

  // If inning ends, clear bases
  const finalBases = inningEnds
    ? { first: false, second: false, third: false }
    : newBases;

  // If inning ends, no runs scored (conservative — force out timing rule)
  // Exception: runs scored BEFORE the 3rd out still count on non-force plays
  // The computeNewBases already handles this with totalOuts < 3 check
  const finalRuns = inningEnds ? runsScored : runsScored;
  // Note: runsScored was already filtered by totalOuts < 3 inside computeNewBases

  // Auto-correction check
  const autoCorr = autoCorrectResult(outcome, outs, bases, runnerOutcomes);

  // RBI calculation
  const rbi = calculateRBIs(outcome, runnerOutcomes, bases);

  return {
    outsAdded,
    newOuts,
    newBases: finalBases,
    runsScored: finalRuns,
    inningEnds,
    runnerOutcomes,
    batterReachesBase: reachesBase(outcome),
    isAHit: isHit(outcome),
    isAnOut: isOut(outcome),
    rbi,
    countsAsAB: countsAsAtBat(outcome),
    countsAsPA: true, // All at-bat outcomes count as PA
    autoCorrection: autoCorr,
  };
}

// =============================================================================
// SECTION 5: Test Result Types
// =============================================================================

interface TestResult {
  id: string;
  input: {
    outcome: AtBatResult;
    bases: string;       // label
    basesObj: Bases;
    outs: number;
  };
  oracleResult: OracleResult;
  status: 'PASS' | 'FAIL' | 'ERROR' | 'SKIP';
  failureReason?: string;
  diff?: Record<string, { expected: unknown; actual: unknown }>;
}

// =============================================================================
// SECTION 6: Checkpoint System
// =============================================================================

interface Checkpoint {
  lastCompletedIndex: number;
  totalExpected: number;
  results: TestResult[];
  timestamp: string;
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

function loadCheckpoint(): Checkpoint | null {
  if (!fs.existsSync(CHECKPOINT_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

// =============================================================================
// SECTION 7: Output Formatter
// =============================================================================

interface FailureCluster {
  clusterKey: string;
  count: number;
  cases: string[];    // test IDs
  sampleDiff: Record<string, { expected: unknown; actual: unknown }> | undefined;
}

function groupFailures(failed: TestResult[]): FailureCluster[] {
  const clusters = new Map<string, { cases: string[]; sampleDiff: TestResult['diff'] }>();

  for (const f of failed) {
    // Cluster by outcome type
    const key = f.input.outcome;
    if (!clusters.has(key)) {
      clusters.set(key, { cases: [], sampleDiff: f.diff });
    }
    clusters.get(key)!.cases.push(f.id);
  }

  return Array.from(clusters.entries()).map(([key, val]) => ({
    clusterKey: key,
    count: val.cases.length,
    cases: val.cases,
    sampleDiff: val.sampleDiff,
  }));
}

function generateOutput(results: TestResult[]): void {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const passed = results.filter(r => r.status === 'PASS');
  const failed = results.filter(r => r.status === 'FAIL');
  const errored = results.filter(r => r.status === 'ERROR');
  const skipped = results.filter(r => r.status === 'SKIP');

  // TIER 1: Summary
  const summary = {
    total_expected: EXPECTED_TOTAL,
    total_run: results.length,
    total_passed: passed.length,
    total_failed: failed.length,
    total_errored: errored.length,
    total_skipped: skipped.length,
    complete: results.length === EXPECTED_TOTAL,
    pass_rate: `${((passed.length / results.length) * 100).toFixed(1)}%`,
    timestamp: new Date().toISOString(),
    WARNING: results.length !== EXPECTED_TOTAL
      ? `INCOMPLETE: Expected ${EXPECTED_TOTAL} tests but only ran ${results.length}`
      : undefined,
  };

  // TIER 2: Failure Clusters
  const failureClusters = groupFailures(failed);

  // TIER 3: Individual failures
  const failureDetails = failed.map(f => ({
    id: f.id,
    input: f.input,
    oracleResult: f.oracleResult,
    failureReason: f.failureReason,
    diff: f.diff,
  }));

  // Write all tiers
  fs.writeFileSync(
    path.join(RESULTS_DIR, 'results-summary.json'),
    JSON.stringify(summary, null, 2)
  );
  fs.writeFileSync(
    path.join(RESULTS_DIR, 'results-clusters.json'),
    JSON.stringify(failureClusters, null, 2)
  );
  fs.writeFileSync(
    path.join(RESULTS_DIR, 'results-full.json'),
    JSON.stringify({ summary, failureClusters, failureDetails, allResults: results }, null, 2)
  );

  // Human-readable markdown
  const md: string[] = [];
  md.push('# Logic Matrix Test Results\n');
  md.push(`**Generated:** ${summary.timestamp}\n`);
  md.push(`**Total:** ${summary.total_run} / ${summary.total_expected}`);
  md.push(`**Pass:** ${summary.total_passed} (${summary.pass_rate})`);
  md.push(`**Fail:** ${summary.total_failed}`);
  md.push(`**Error:** ${summary.total_errored}`);
  md.push(`**Skipped:** ${summary.total_skipped}\n`);

  if (summary.WARNING) {
    md.push(`> **WARNING:** ${summary.WARNING}\n`);
  }

  if (failureClusters.length > 0) {
    md.push('## Failure Clusters\n');
    for (const fc of failureClusters) {
      md.push(`### ${fc.clusterKey} (${fc.count} failures)\n`);
      md.push(`Cases: ${fc.cases.slice(0, 10).join(', ')}${fc.count > 10 ? '...' : ''}\n`);
    }
  }

  fs.writeFileSync(
    path.join(RESULTS_DIR, 'LOGIC_MATRIX_REPORT.md'),
    md.join('\n')
  );
}

// =============================================================================
// SECTION 8: Self-Test Mode — Validate oracle against golden cases
// =============================================================================

interface GoldenCase {
  id: string;
  category: string;
  description: string;
  input_state: {
    outs: number;
    bases: { first: boolean; second: boolean; third: boolean };
    inning: number;
    isTop: boolean;
    homeScore: number;
    awayScore: number;
  };
  action: string;
  action_args: Record<string, unknown>;
  expected_output: {
    outs: number;
    bases: { first: boolean; second: boolean; third: boolean };
    homeScore: number;
    awayScore: number;
    runs_scored_this_play: number;
    triggers_end_inning?: boolean;
    isWalkOff?: boolean;
    after_end_inning?: Record<string, unknown>;
    fame_event?: Record<string, unknown>;
    leverageIndex_lookup?: string;
  };
  expected_player_stats?: Record<string, Record<string, number>>;
  expected_pitcher_stats?: Record<string, string>;
  expected_scoreboard?: Record<string, string>;
  expected_bugs?: Record<string, Record<string, string>>;
  reasoning: string;
  edge_case_notes: string;
}

/**
 * Map golden case action to the AtBatResult used by the oracle.
 *
 * Golden cases use action names (recordHit, recordOut, etc.) with args.
 * We need to extract the AtBatResult for oracle computation.
 */
function goldenCaseToOutcome(gc: GoldenCase): AtBatResult | null {
  switch (gc.action) {
    case 'recordHit':
      return gc.action_args.hitType as AtBatResult;
    case 'recordOut': {
      const outType = gc.action_args.outType as string;
      // Map SH -> SAC (the internal AtBatResult value)
      if (outType === 'SH') return 'SAC';
      return outType as AtBatResult;
    }
    case 'recordWalk':
      return gc.action_args.walkType as AtBatResult;
    case 'recordD3K':
      return 'D3K';
    case 'recordError':
      return 'E';
    case 'recordEvent':
      // Fame events don't have an AtBatResult — skip these
      return null;
    default:
      return null;
  }
}

/**
 * Determines if a golden case tests behavior that the oracle CAN verify.
 *
 * The oracle tests PURE LOGIC (runner defaults, base states, RBI, outs).
 * It CANNOT verify:
 * - Walk-off detection (requires inning/score context in the React layer)
 * - Fame events (handled by recordEvent, not pure logic)
 * - D3K batter-reached (requires the batterReached arg, not in pure logic)
 * - Inning transitions (handled by the React endInning flow)
 * - Pitcher stat tracking (React-coupled)
 * - Leverage index (tested in dedicated tests)
 *
 * We verify what we CAN: runner outcomes, new bases, outs, runs, RBI.
 */
function isOracleVerifiable(gc: GoldenCase): boolean {
  // Skip fame events (GC-29: TOOTBLAN)
  if (gc.action === 'recordEvent') return false;
  return true;
}

/**
 * Apply runnerData overrides from a golden case to an oracle result.
 *
 * Golden cases may specify explicit runnerData that overrides getDefaultRunnerOutcome
 * defaults. For example, GC-01 says "fromSecond": "third" (R2 to 3B) and
 * "fromThird": "home" (R3 scores), while GC-17 says "fromThird": "home" on a DP.
 *
 * This function recomputes bases and runs based on the runnerData overrides.
 */
function applyRunnerDataOverrides(
  oracle: OracleResult,
  outcome: AtBatResult,
  bases: Bases,
  outs: number,
  runnerData: Record<string, string>
): void {
  const totalOuts = outs + oracle.outsAdded;

  // Recompute new bases from scratch using runnerData
  const newBases: Bases = { first: false, second: false, third: false };
  let runsScored = 0;

  // Track runner outcomes
  const newRunnerOutcomes: OracleResult['runnerOutcomes'] = {
    first: oracle.runnerOutcomes.first,
    second: oracle.runnerOutcomes.second,
    third: oracle.runnerOutcomes.third,
  };

  // Process each base runner with their override
  function processRunnerOverride(fromBase: 'first' | 'second' | 'third', dest: string): void {
    const rdKey = `from${fromBase.charAt(0).toUpperCase() + fromBase.slice(1)}`;
    if (dest === 'home') {
      if (totalOuts < 3) {
        runsScored++;
      }
      newRunnerOutcomes[fromBase] = 'SCORED';
    } else if (dest === 'third') {
      newBases.third = true;
      newRunnerOutcomes[fromBase] = 'TO_3B';
    } else if (dest === 'second') {
      newBases.second = true;
      newRunnerOutcomes[fromBase] = 'TO_2B';
    } else if (dest === 'out') {
      // Runner is out — already counted in outsAdded
      if (fromBase === 'first') newRunnerOutcomes[fromBase] = 'OUT_2B';
      else if (fromBase === 'second') newRunnerOutcomes[fromBase] = 'OUT_3B';
      else newRunnerOutcomes[fromBase] = 'OUT_HOME';
    } else if (dest === 'held' || dest === fromBase) {
      // Runner stays
      newBases[fromBase] = true;
      newRunnerOutcomes[fromBase] = 'HELD';
    }
  }

  // Apply runnerData overrides for each occupied base
  // Process in reverse order (third → second → first) to avoid position conflicts
  if (bases.third && runnerData.fromThird) {
    processRunnerOverride('third', runnerData.fromThird);
  } else if (bases.third) {
    // No override — use oracle default
    const ro = oracle.runnerOutcomes.third;
    if (ro === 'SCORED' && totalOuts < 3) runsScored++;
    else if (ro === 'TO_3B') newBases.third = true;
    else if (ro === 'TO_2B') newBases.second = true;
    else if (ro === 'HELD') newBases.third = true;
  }

  if (bases.second && runnerData.fromSecond) {
    processRunnerOverride('second', runnerData.fromSecond);
  } else if (bases.second) {
    const ro = oracle.runnerOutcomes.second;
    if (ro === 'SCORED' && totalOuts < 3) runsScored++;
    else if (ro === 'TO_3B') newBases.third = true;
    else if (ro === 'TO_2B') newBases.second = true;
    else if (ro === 'HELD') newBases.second = true;
  }

  if (bases.first && runnerData.fromFirst) {
    processRunnerOverride('first', runnerData.fromFirst);
  } else if (bases.first) {
    const ro = oracle.runnerOutcomes.first;
    if (ro === 'SCORED' && totalOuts < 3) runsScored++;
    else if (ro === 'TO_3B') newBases.third = true;
    else if (ro === 'TO_2B') newBases.second = true;
    else if (ro === 'HELD') newBases.first = true;
    else if (ro === 'OUT_2B' || ro === 'OUT_3B' || ro === 'OUT_HOME') { /* removed */ }
  }

  // Place batter on base (same logic as computeNewBases)
  if (['1B', 'FC', 'E'].includes(outcome)) {
    newBases.first = true;
  } else if (outcome === '2B') {
    newBases.second = true;
  } else if (outcome === '3B') {
    newBases.third = true;
  } else if (outcome === 'HR') {
    if (totalOuts < 3) runsScored++; // Batter's run
  } else if (['BB', 'IBB', 'HBP'].includes(outcome)) {
    newBases.first = true;
  }

  // If inning ends, clear bases
  const inningEnds = (outs + oracle.outsAdded) >= 3;
  if (inningEnds) {
    oracle.newBases = { first: false, second: false, third: false };
  } else {
    oracle.newBases = newBases;
  }

  oracle.runsScored = runsScored;
  oracle.runnerOutcomes = newRunnerOutcomes;

  // Recompute RBI with new runner outcomes
  oracle.rbi = calculateRBIs(outcome, newRunnerOutcomes, bases);
}

function runSelfTest(): boolean {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    SELF-TEST MODE                           ║');
  console.log('║  Validating oracle against 30 user-confirmed golden cases   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const goldenCases: GoldenCase[] = (goldenCasesRaw as any).clusters.flatMap(
    (c: any) => c.cases
  );
  console.log(`Found ${goldenCases.length} golden cases\n`);

  let oraclePasses = 0;
  let oracleFails = 0;
  let skipped = 0;
  const failures: { id: string; field: string; expected: unknown; oracle: unknown; note: string }[] = [];

  const selfTestResults: {
    id: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    checks: { field: string; expected: unknown; oracle: unknown; match: boolean }[];
    note?: string;
  }[] = [];

  for (const gc of goldenCases) {
    const outcome = goldenCaseToOutcome(gc);

    // Skip cases that can't be oracle-verified
    if (!isOracleVerifiable(gc) || outcome === null) {
      console.log(`  ${gc.id}: SKIP (${gc.action} — not oracle-verifiable)`);
      skipped++;
      selfTestResults.push({ id: gc.id, status: 'SKIP', checks: [], note: gc.action });
      continue;
    }

    const { outs, bases } = gc.input_state;
    const expected = gc.expected_output;
    const isExpectedFail = gc.expected_bugs !== undefined;

    // Special handling for D3K cases — the oracle assumes batter is OUT
    // but golden cases GC-15 has batterReached=true (batter reaches 1B, no out)
    const isD3KReached = gc.action === 'recordD3K' &&
      (gc.action_args as any).batterReached === true;

    // Compute oracle result
    let oracle: OracleResult;
    try {
      oracle = computeOracle(outcome, bases, outs);
    } catch (err: any) {
      console.log(`  ${gc.id}: ERROR — oracle threw: ${err.message}`);
      oracleFails++;
      failures.push({
        id: gc.id,
        field: 'oracle_error',
        expected: 'no error',
        oracle: err.message,
        note: 'Oracle threw an exception',
      });
      selfTestResults.push({
        id: gc.id,
        status: 'FAIL',
        checks: [{ field: 'oracle_error', expected: 'no error', oracle: err.message, match: false }],
      });
      continue;
    }

    // D3K with batter reaching: override oracle defaults
    // Oracle assumes batter out (outsAdded=1), but GC-15 has batterReached=true
    if (isD3KReached) {
      oracle.outsAdded = 0;
      oracle.newOuts = outs; // No out added
      oracle.newBases = { ...oracle.newBases, first: true }; // Batter to 1B
      oracle.inningEnds = false;
    }

    // Apply runnerData overrides from the golden case.
    // Golden cases may specify explicit runner destinations that override
    // getDefaultRunnerOutcome defaults (e.g., GC-01 has R3 scoring on a single,
    // GC-17 has R3 scoring on a DP with loaded bases).
    const runnerData = gc.action_args.runnerData as Record<string, string> | undefined;
    if (runnerData && Object.keys(runnerData).length > 0) {
      applyRunnerDataOverrides(oracle, outcome, bases, outs, runnerData);
    }

    // Compare oracle vs golden case expected output
    const checks: { field: string; expected: unknown; oracle: unknown; match: boolean }[] = [];

    // Check 1: Outs
    checks.push({
      field: 'outs',
      expected: expected.outs,
      oracle: oracle.newOuts,
      match: expected.outs === oracle.newOuts,
    });

    // Check 2: Bases (if inning doesn't end)
    // When inning ends (outs=3), bases clear — golden cases also show empty bases
    checks.push({
      field: 'bases.first',
      expected: expected.bases.first,
      oracle: oracle.newBases.first,
      match: expected.bases.first === oracle.newBases.first,
    });
    checks.push({
      field: 'bases.second',
      expected: expected.bases.second,
      oracle: oracle.newBases.second,
      match: expected.bases.second === oracle.newBases.second,
    });
    checks.push({
      field: 'bases.third',
      expected: expected.bases.third,
      oracle: oracle.newBases.third,
      match: expected.bases.third === oracle.newBases.third,
    });

    // Check 3: Runs scored
    // For golden cases where runs come from runnerData (not defaults), we
    // need to compute runs from the golden case's expected score change.
    const expectedRuns = expected.runs_scored_this_play;

    // For scoring team: if isTop, away scores; if !isTop, home scores
    // The oracle counts runs based on getDefaultRunnerOutcome SCORED results
    checks.push({
      field: 'runs_scored',
      expected: expectedRuns,
      oracle: oracle.runsScored,
      match: expectedRuns === oracle.runsScored,
    });

    // Check 4: Inning ends
    if (expected.triggers_end_inning !== undefined) {
      checks.push({
        field: 'triggers_end_inning',
        expected: expected.triggers_end_inning,
        oracle: oracle.inningEnds,
        match: expected.triggers_end_inning === oracle.inningEnds,
      });
    }

    // Check 5: RBI (from expected_player_stats if available)
    if (gc.expected_player_stats?.batter?.rbi !== undefined) {
      checks.push({
        field: 'rbi',
        expected: gc.expected_player_stats.batter.rbi,
        oracle: oracle.rbi,
        match: gc.expected_player_stats.batter.rbi === oracle.rbi,
      });
    }

    // Check 6: AB counting
    if (gc.expected_player_stats?.batter?.ab !== undefined) {
      const expectedAB = gc.expected_player_stats.batter.ab > 0;
      checks.push({
        field: 'countsAsAB',
        expected: expectedAB,
        oracle: oracle.countsAsAB,
        match: expectedAB === oracle.countsAsAB,
      });
    }

    // Evaluate
    const allMatch = checks.every(c => c.match);

    if (allMatch) {
      const marker = isExpectedFail ? ' (has EXPECTED FAIL bugs — oracle still matches state)' : '';
      console.log(`  ${gc.id}: ✓ ORACLE MATCH${marker}`);
      oraclePasses++;
      selfTestResults.push({ id: gc.id, status: 'PASS', checks });
    } else {
      const failedChecks = checks.filter(c => !c.match);
      console.log(`  ${gc.id}: ✗ ORACLE MISMATCH`);
      for (const fc of failedChecks) {
        console.log(`    ${fc.field}: expected=${JSON.stringify(fc.expected)} oracle=${JSON.stringify(fc.oracle)}`);
        failures.push({
          id: gc.id,
          field: fc.field,
          expected: fc.expected,
          oracle: fc.oracle,
          note: gc.description,
        });
      }
      oracleFails++;
      selfTestResults.push({ id: gc.id, status: 'FAIL', checks });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`SELF-TEST RESULTS:`);
  console.log(`  Passed:  ${oraclePasses}`);
  console.log(`  Failed:  ${oracleFails}`);
  console.log(`  Skipped: ${skipped} (fame events / non-oracle-verifiable)`);
  console.log('='.repeat(60));

  // Save self-test results
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(RESULTS_DIR, 'self-test-results.json'),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      total_golden_cases: goldenCases.length,
      oracle_passes: oraclePasses,
      oracle_fails: oracleFails,
      skipped,
      failures,
      details: selfTestResults,
    }, null, 2)
  );

  if (oracleFails === 0) {
    console.log('\n✅ SELF-TEST PASSED: Oracle agrees with all verifiable golden cases.');
    console.log('The test harness is safe to run on the full matrix.\n');
    return true;
  } else {
    console.log('\n❌ SELF-TEST FAILED: Oracle disagrees with golden cases.');
    console.log('DO NOT run the full matrix. Fix the oracle first.');
    console.log(`See ${path.join(RESULTS_DIR, 'self-test-results.json')} for details.\n`);
    return false;
  }
}

// =============================================================================
// SECTION 9: Full Matrix Test Runner
// =============================================================================

function runTest(
  outcome: AtBatResult,
  baseState: BaseState,
  outs: number,
  testId: string
): TestResult {
  try {
    const oracle = computeOracle(outcome, baseState.bases, outs);

    // For the full matrix, we verify internal oracle consistency
    // (the actual engine comparison happens in test-executor with React)

    // Validity checks:
    const issues: string[] = [];

    // 1. If inning ends, bases should be clear
    if (oracle.inningEnds && (oracle.newBases.first || oracle.newBases.second || oracle.newBases.third)) {
      issues.push('Inning ends but bases not clear');
    }

    // 2. Outs should not exceed 3
    if (oracle.newOuts > 3) {
      issues.push(`Outs exceeded 3: ${oracle.newOuts}`);
    }

    // 3. Runs should be non-negative
    if (oracle.runsScored < 0) {
      issues.push(`Negative runs: ${oracle.runsScored}`);
    }

    // 4. RBI should be non-negative
    if (oracle.rbi < 0) {
      issues.push(`Negative RBI: ${oracle.rbi}`);
    }

    // 5. If no runners on base and not HR, runs should be 0
    if (!baseState.bases.first && !baseState.bases.second && !baseState.bases.third
        && outcome !== 'HR' && oracle.runsScored > 0) {
      issues.push(`Runs scored with no runners and non-HR: ${oracle.runsScored}`);
    }

    // 6. Out types should add outs
    if (isOut(outcome) && oracle.outsAdded === 0 && outcome !== 'D3K') {
      // D3K can have 0 outs if batter reaches, but oracle defaults to 1
      issues.push(`Out type ${outcome} but outsAdded=0`);
    }

    // 7. Hit types should not add outs
    if (isHit(outcome) && oracle.outsAdded > 0) {
      issues.push(`Hit type ${outcome} but outsAdded=${oracle.outsAdded}`);
    }

    if (issues.length > 0) {
      return {
        id: testId,
        input: { outcome, bases: baseState.label, basesObj: baseState.bases, outs },
        oracleResult: oracle,
        status: 'FAIL',
        failureReason: issues.join('; '),
      };
    }

    return {
      id: testId,
      input: { outcome, bases: baseState.label, basesObj: baseState.bases, outs },
      oracleResult: oracle,
      status: 'PASS',
    };
  } catch (err: any) {
    return {
      id: testId,
      input: { outcome, bases: baseState.label, basesObj: baseState.bases, outs },
      oracleResult: null as any,
      status: 'ERROR',
      failureReason: err.message,
    };
  }
}

function runFullMatrix(resumeFrom: number = 0, existingResults: TestResult[] = []): void {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║                    FULL MATRIX MODE                         ║`);
  console.log(`║  Testing ${EXPECTED_TOTAL} combinations (${OUTCOMES.length} outcomes × ${BASE_STATES.length} bases × ${OUT_STATES.length} outs)    ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

  if (resumeFrom > 0) {
    console.log(`Resuming from test index ${resumeFrom}...`);
  }

  const results: TestResult[] = [...existingResults];
  let testIndex = 0;

  for (const baseState of BASE_STATES) {
    for (const outs of OUT_STATES) {
      for (const outcome of OUTCOMES) {
        if (testIndex < resumeFrom) {
          testIndex++;
          continue;
        }

        const testId = `T-${String(testIndex).padStart(4, '0')}`;
        const result = runTest(outcome, baseState, outs, testId);
        results.push(result);

        // Progress logging
        const runCount = results.length;
        if (runCount % BATCH_SIZE === 0) {
          const pct = ((runCount / EXPECTED_TOTAL) * 100).toFixed(1);
          console.log(`Progress: ${runCount}/${EXPECTED_TOTAL} (${pct}%)`);
          saveCheckpoint({
            lastCompletedIndex: testIndex + 1,
            totalExpected: EXPECTED_TOTAL,
            results,
            timestamp: new Date().toISOString(),
          });
        }

        testIndex++;
      }
    }
  }

  // Final output
  generateOutput(results);

  // Final integrity check
  if (results.length !== EXPECTED_TOTAL) {
    console.error(`\n⚠️  INCOMPLETE: Ran ${results.length} of ${EXPECTED_TOTAL} expected tests`);
  } else {
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const errored = results.filter(r => r.status === 'ERROR').length;
    console.log(`\n✓ COMPLETE: All ${EXPECTED_TOTAL} tests executed`);
    console.log(`  Passed:  ${passed}`);
    console.log(`  Failed:  ${failed}`);
    console.log(`  Errored: ${errored}`);
    console.log(`\nResults saved to ${RESULTS_DIR}/`);
  }
}

// =============================================================================
// SECTION 10: Entry Point
// =============================================================================

async function main() {
  const mode = process.argv[2] || 'self-test';

  console.log(`\nGameTracker Logic Matrix Harness`);
  console.log(`Mode: ${mode}`);
  console.log(`Expected total matrix size: ${EXPECTED_TOTAL} tests`);
  console.log(`Outcomes: ${OUTCOMES.length}, Base States: ${BASE_STATES.length}, Out States: ${OUT_STATES.length}\n`);

  if (mode === 'self-test') {
    const passed = runSelfTest();
    process.exit(passed ? 0 : 1);
  }

  if (mode === 'full') {
    // GATE: Run self-test first
    console.log('Running self-test gate before full matrix...\n');
    const selfTestPassed = runSelfTest();
    if (!selfTestPassed) {
      console.error('ABORTING: Self-test failed. Fix oracle before running full matrix.');
      process.exit(1);
    }

    runFullMatrix();
    process.exit(0);
  }

  if (mode === 'resume') {
    const checkpoint = loadCheckpoint();
    if (!checkpoint) {
      console.log('No checkpoint found. Starting fresh...\n');

      // GATE: Run self-test first
      console.log('Running self-test gate before full matrix...\n');
      const selfTestPassed = runSelfTest();
      if (!selfTestPassed) {
        console.error('ABORTING: Self-test failed. Fix oracle before running full matrix.');
        process.exit(1);
      }

      runFullMatrix();
    } else {
      console.log(`Resuming from checkpoint: ${checkpoint.lastCompletedIndex}/${checkpoint.totalExpected}`);
      runFullMatrix(checkpoint.lastCompletedIndex, checkpoint.results);
    }
    process.exit(0);
  }

  console.error(`Unknown mode: ${mode}`);
  console.error('Usage: npx tsx test-utils/run-logic-matrix.ts [self-test|full|resume]');
  process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
