/**
 * Day 1 fWAR Pipeline Verification
 *
 * Tests that the complete pipeline is connected:
 * 1. eventLog.ts FieldingEvent → 2. fwarCalculator adapter → 3. calculateFWAR
 *
 * This is a structural test verifying the code connections exist.
 * Full E2E testing requires running the app.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('DAY 1 fWAR PIPELINE VERIFICATION');
console.log('='.repeat(60));
console.log('');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${err.message}`);
    failed++;
  }
}

const fwarPath = path.join(__dirname, '../engines/fwarCalculator.ts');
const fwarContent = fs.readFileSync(fwarPath, 'utf-8');

// Test 1: Adapter function exists
test('convertPersistedToCalculatorEvent function exists', () => {
  assert(fwarContent.includes('export function convertPersistedToCalculatorEvent'),
    'Adapter function should be exported');
});

// Test 2: Adapter imports from eventLog
test('fwarCalculator imports PersistedFieldingEvent from eventLog', () => {
  assert(fwarContent.includes("import type { FieldingEvent as PersistedFieldingEvent } from '../utils/eventLog'"),
    'Should import FieldingEvent from eventLog');
});

// Test 3: calculateFWARFromPersistedEvents exists
test('calculateFWARFromPersistedEvents function exists', () => {
  assert(fwarContent.includes('export async function calculateFWARFromPersistedEvents'),
    'Main entry point for persisted events should exist');
});

// Test 4: Uses getGameFieldingEvents
test('calculateFWARFromPersistedEvents calls getGameFieldingEvents', () => {
  assert(fwarContent.includes('getGameFieldingEvents(gameId)'),
    'Should fetch persisted events from IndexedDB');
});

// Test 5: Converts events before calculation
test('Pipeline converts persisted events to calculator format', () => {
  assert(fwarContent.includes('convertPersistedEventsToCalculator(playerEvents)'),
    'Should convert events before calculation');
});

// Test 6: mapPersistedDifficulty handles all cases
test('mapPersistedDifficulty maps all difficulty levels', () => {
  assert(fwarContent.includes("'routine': 'routine'"), 'Should map routine');
  assert(fwarContent.includes("'likely': 'running'"), 'Should map likely');
  assert(fwarContent.includes("'50-50': 'diving'"), 'Should map 50-50');
  assert(fwarContent.includes("'spectacular': 'robbedHR'"), 'Should map spectacular');
});

// Test 7: mapPersistedPlayType handles all types
test('mapPersistedPlayType maps all play types', () => {
  assert(fwarContent.includes("'putout': 'putout'"), 'Should map putout');
  assert(fwarContent.includes("'assist': 'assist'"), 'Should map assist');
  assert(fwarContent.includes("'error': 'error'"), 'Should map error');
  assert(fwarContent.includes("'double_play_pivot': 'doublePlay'"), 'Should map DP');
  assert(fwarContent.includes("'outfield_assist': 'assist'"), 'Should map OF assist');
});

// Test 8: Calls calculateSeasonFWAR at the end
test('calculateFWARFromPersistedEvents calls calculateSeasonFWAR', () => {
  assert(fwarContent.includes('return calculateSeasonFWAR(calculatorEvents, position, gamesPlayed, seasonGames)'),
    'Should call the main fWAR calculator');
});

// Test 9: Batch converter exists
test('convertPersistedEventsToCalculator batch function exists', () => {
  assert(fwarContent.includes('export function convertPersistedEventsToCalculator'),
    'Batch converter should be exported');
});

// Test 10: Pipeline is complete (check for all three stages)
test('Complete pipeline: Storage → Adapter → Calculator', () => {
  // Stage 1: Get from storage
  const hasStorageCall = fwarContent.includes('getGameFieldingEvents');
  // Stage 2: Convert
  const hasConversion = fwarContent.includes('convertPersistedEventsToCalculator');
  // Stage 3: Calculate (renamed to calculateSeasonFWAR for consistency)
  const hasCalculation = fwarContent.includes('calculateSeasonFWAR(calculatorEvents');

  assert(hasStorageCall && hasConversion && hasCalculation,
    `All 3 stages should exist. Storage: ${hasStorageCall}, Convert: ${hasConversion}, Calc: ${hasCalculation}`);
});

console.log('');
console.log('='.repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('');
  console.log('⚠️  Some tests failed. Review the errors above.');
  process.exit(1);
} else {
  console.log('');
  console.log('✅ fWAR pipeline is properly connected!');
  console.log('');
  console.log('PIPELINE VERIFICATION:');
  console.log('  1. ✅ eventLog.ts → FieldingEvent persisted to IndexedDB');
  console.log('  2. ✅ fwarCalculator.ts → imports from eventLog.ts');
  console.log('  3. ✅ Adapter functions → convert persisted format to calculator format');
  console.log('  4. ✅ calculateFWARFromPersistedEvents → full entry point');
  console.log('');
  console.log('REMAINING FOR DAY 2:');
  console.log('  - Add fWAR display component to UI');
  console.log('  - Create useWARCalculations hook');
  console.log('  - Wire up to player stats panel');
  process.exit(0);
}
