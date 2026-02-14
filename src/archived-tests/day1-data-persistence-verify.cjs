/**
 * Day 1 E2E Verification - Data Persistence Foundation
 *
 * Tests that:
 * 1. FIELDING_EVENTS store exists in IndexedDB
 * 2. FieldingEvent schema matches spec
 * 3. AtBatEvent includes leverageIndex
 * 4. logFieldingEvent function exists and is callable
 *
 * NOTE: Full browser E2E tests require running the app.
 * This file tests the schema and function exports.
 */

// Since we can't directly test IndexedDB in Node, we verify the TypeScript/JS structure
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('DAY 1 E2E VERIFICATION - DATA PERSISTENCE FOUNDATION');
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

// Test 1: eventLog.ts exports logFieldingEvent
test('eventLog.ts exports logFieldingEvent function', () => {
  const eventLogPath = path.join(__dirname, '../utils/eventLog.ts');
  const content = fs.readFileSync(eventLogPath, 'utf-8');

  assert(content.includes('export async function logFieldingEvent'),
    'logFieldingEvent should be exported');
});

// Test 2: FieldingEvent interface exists in eventLog.ts
test('FieldingEvent interface is defined in eventLog.ts', () => {
  const eventLogPath = path.join(__dirname, '../utils/eventLog.ts');
  const content = fs.readFileSync(eventLogPath, 'utf-8');

  assert(content.includes('export interface FieldingEvent'),
    'FieldingEvent interface should be exported');
  assert(content.includes('fieldingEventId: string'),
    'FieldingEvent should have fieldingEventId');
  assert(content.includes('playType:'),
    'FieldingEvent should have playType');
  assert(content.includes('difficulty:'),
    'FieldingEvent should have difficulty');
});

// Test 3: FIELDING_EVENTS store is defined
test('FIELDING_EVENTS store is defined in eventLog.ts', () => {
  const eventLogPath = path.join(__dirname, '../utils/eventLog.ts');
  const content = fs.readFileSync(eventLogPath, 'utf-8');

  assert(content.includes("FIELDING_EVENTS: 'fieldingEvents'"),
    'FIELDING_EVENTS store should be defined');
});

// Test 4: AtBatEvent includes leverageIndex
test('AtBatEvent interface includes leverageIndex', () => {
  const eventLogPath = path.join(__dirname, '../utils/eventLog.ts');
  const content = fs.readFileSync(eventLogPath, 'utf-8');

  assert(content.includes('leverageIndex: number'),
    'AtBatEvent should have leverageIndex field');
});

// Test 5: GameTracker imports logFieldingEvent
test('GameTracker imports logFieldingEvent', () => {
  const gameTrackerPath = path.join(__dirname, '../components/GameTracker/index.tsx');
  const content = fs.readFileSync(gameTrackerPath, 'utf-8');

  assert(content.includes('logFieldingEvent'),
    'GameTracker should import logFieldingEvent');
});

// Test 6: GameTracker calls logFieldingEvent
test('GameTracker calls logFieldingEvent when fieldingData exists', () => {
  const gameTrackerPath = path.join(__dirname, '../components/GameTracker/index.tsx');
  const content = fs.readFileSync(gameTrackerPath, 'utf-8');

  assert(content.includes('await logFieldingEvent(fieldingEvent)'),
    'GameTracker should call logFieldingEvent');
});

// Test 7: logAtBatToEventLog accepts fieldingData parameter
test('logAtBatToEventLog accepts fieldingData parameter', () => {
  const gameTrackerPath = path.join(__dirname, '../components/GameTracker/index.tsx');
  const content = fs.readFileSync(gameTrackerPath, 'utf-8');

  assert(content.includes('fieldingData?: FieldingData'),
    'logAtBatToEventLog should accept fieldingData parameter');
});

// Test 8: handleAtBatFlowComplete passes fieldingData
test('handleAtBatFlowComplete passes flowState.fieldingData', () => {
  const gameTrackerPath = path.join(__dirname, '../components/GameTracker/index.tsx');
  const content = fs.readFileSync(gameTrackerPath, 'utf-8');

  assert(content.includes('flowState.fieldingData'),
    'handleAtBatFlowComplete should pass flowState.fieldingData');
});

// Test 8a: getPlayerByPosition helper function exists
test('getPlayerByPosition helper function exists for player lookup', () => {
  const gameTrackerPath = path.join(__dirname, '../components/GameTracker/index.tsx');
  const content = fs.readFileSync(gameTrackerPath, 'utf-8');

  assert(content.includes('const getPlayerByPosition = (position: Position)'),
    'getPlayerByPosition helper should exist');
  assert(content.includes('playerId: player.playerId, playerName: player.playerName'),
    'getPlayerByPosition should return both playerId and playerName');
});

// Test 8b: Fielding event uses player lookup, not position string
test('Fielding event uses getPlayerByPosition for actual player info', () => {
  const gameTrackerPath = path.join(__dirname, '../components/GameTracker/index.tsx');
  const content = fs.readFileSync(gameTrackerPath, 'utf-8');

  assert(content.includes('const fielderInfo = getPlayerByPosition(fieldingData.primaryFielder)'),
    'Should lookup fielder info from lineup');
  assert(content.includes("playerId: fielderInfo?.playerId || fieldingData.primaryFielder"),
    'playerId should use actual player ID with fallback');
  assert(content.includes("playerName: fielderInfo?.playerName || fieldingData.primaryFielder"),
    'playerName should use actual player name with fallback');
});

// Test 9: Helper functions exist for mapping
test('Helper functions exist for mapping fielding data', () => {
  const gameTrackerPath = path.join(__dirname, '../components/GameTracker/index.tsx');
  const content = fs.readFileSync(gameTrackerPath, 'utf-8');

  assert(content.includes('mapPlayTypeToTrajectory'),
    'mapPlayTypeToTrajectory helper should exist');
  assert(content.includes('mapDirectionToZone'),
    'mapDirectionToZone helper should exist');
  assert(content.includes('mapPlayTypeToDifficulty'),
    'mapPlayTypeToDifficulty helper should exist');
});

// Test 10: getGameFieldingEvents function exists
test('getGameFieldingEvents retrieval function exists', () => {
  const eventLogPath = path.join(__dirname, '../utils/eventLog.ts');
  const content = fs.readFileSync(eventLogPath, 'utf-8');

  assert(content.includes('export async function getGameFieldingEvents'),
    'getGameFieldingEvents should be exported');
});

// Test 11: BallInPlayData type is exported
test('BallInPlayData type is exported from eventLog.ts', () => {
  const eventLogPath = path.join(__dirname, '../utils/eventLog.ts');
  const content = fs.readFileSync(eventLogPath, 'utf-8');

  assert(content.includes('export interface BallInPlayData'),
    'BallInPlayData should be exported');
});

// Test 12: FieldingData type is imported in GameTracker
test('FieldingData type is imported in GameTracker', () => {
  const gameTrackerPath = path.join(__dirname, '../components/GameTracker/index.tsx');
  const content = fs.readFileSync(gameTrackerPath, 'utf-8');

  assert(content.includes('FieldingData,'),
    'FieldingData should be imported');
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
  console.log('✅ All tests passed! Day 1 Data Persistence is properly wired.');
  console.log('');
  console.log('BROWSER VERIFICATION STEPS:');
  console.log('1. Start the app: npm run dev');
  console.log('2. Record 5 at-bats with varied fielding plays (GO, FO, diving catch, error)');
  console.log('3. Open DevTools → Application → IndexedDB → kbl-event-log → fieldingEvents');
  console.log('4. Verify: Each at-bat with fielding shows a FieldingEvent record');
  console.log('5. Check: playType, difficulty, success fields are populated');
  process.exit(0);
}
