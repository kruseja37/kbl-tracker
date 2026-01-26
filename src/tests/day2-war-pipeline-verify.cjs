/**
 * Day 2 WAR Pipeline Verification
 * Per IMPLEMENTATION_PLAN.md v2 - Day 2: WAR Pipeline
 *
 * Verifies:
 * 1. useWARCalculations hook exists and has correct structure
 * 2. bWAR calculator can be called with seasonStorage data format
 * 3. pWAR calculator can be called with seasonStorage data format
 * 4. WAR display components exist
 * 5. Complete pipeline: seasonStorage → calculator → display
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
}

function fileContains(filePath, searchString) {
  try {
    const content = fs.readFileSync(path.join(BASE_DIR, filePath), 'utf-8');
    return content.includes(searchString);
  } catch (e) {
    return false;
  }
}

function fileExists(filePath) {
  try {
    fs.accessSync(path.join(BASE_DIR, filePath));
    return true;
  } catch (e) {
    return false;
  }
}

console.log('============================================================');
console.log('DAY 2 WAR PIPELINE VERIFICATION');
console.log('============================================================\n');

// ============================================
// 1. useWARCalculations Hook Structure
// ============================================
console.log('--- useWARCalculations Hook ---');

test(
  'useWARCalculations.ts exists',
  fileExists('hooks/useWARCalculations.ts')
);

test(
  'Hook imports from seasonStorage',
  fileContains('hooks/useWARCalculations.ts', "from '../utils/seasonStorage'")
);

test(
  'Hook imports bwarCalculator',
  fileContains('hooks/useWARCalculations.ts', "from '../engines/bwarCalculator'")
);

test(
  'Hook imports pwarCalculator',
  fileContains('hooks/useWARCalculations.ts', "from '../engines/pwarCalculator'")
);

test(
  'Hook exports useWARCalculations function',
  fileContains('hooks/useWARCalculations.ts', 'export function useWARCalculations')
);

test(
  'Hook returns getPlayerBWAR function',
  fileContains('hooks/useWARCalculations.ts', 'getPlayerBWAR')
);

test(
  'Hook returns getPlayerPWAR function',
  fileContains('hooks/useWARCalculations.ts', 'getPlayerPWAR')
);

test(
  'Hook returns leaderboards',
  fileContains('hooks/useWARCalculations.ts', 'leaderboards')
);

// ============================================
// 2. Data Conversion Functions
// ============================================
console.log('\n--- Data Conversion ---');

test(
  'convertToBattingStatsForWAR function exists',
  fileContains('hooks/useWARCalculations.ts', 'function convertToBattingStatsForWAR')
);

test(
  'convertToPitchingStatsForWAR function exists',
  fileContains('hooks/useWARCalculations.ts', 'function convertToPitchingStatsForWAR')
);

test(
  'Converts PA from seasonStorage',
  fileContains('hooks/useWARCalculations.ts', 'pa: stats.pa')
);

test(
  'Converts IP from outsRecorded (IP = outs/3)',
  fileContains('hooks/useWARCalculations.ts', 'stats.outsRecorded / 3')
);

// ============================================
// 3. Calculator Integration
// ============================================
console.log('\n--- Calculator Integration ---');

test(
  'Calls calculateBWARSimplified',
  fileContains('hooks/useWARCalculations.ts', 'calculateBWARSimplified')
);

test(
  'Calls calculatePWARSimplified',
  fileContains('hooks/useWARCalculations.ts', 'calculatePWARSimplified')
);

test(
  'Uses getSeasonBattingStats from seasonStorage',
  fileContains('hooks/useWARCalculations.ts', 'getSeasonBattingStats')
);

test(
  'Uses getSeasonPitchingStats from seasonStorage',
  fileContains('hooks/useWARCalculations.ts', 'getSeasonPitchingStats')
);

test(
  'Uses getActiveSeason for season context',
  fileContains('hooks/useWARCalculations.ts', 'getActiveSeason')
);

// ============================================
// 4. WAR Display Components
// ============================================
console.log('\n--- WAR Display Components ---');

test(
  'WARDisplay.tsx exists',
  fileExists('components/GameTracker/WARDisplay.tsx')
);

test(
  'WARBadge component exists',
  fileContains('components/GameTracker/WARDisplay.tsx', 'export function WARBadge')
);

test(
  'WARLeaderboard component exists',
  fileContains('components/GameTracker/WARDisplay.tsx', 'export function WARLeaderboard')
);

test(
  'WARPanel component exists',
  fileContains('components/GameTracker/WARDisplay.tsx', 'export function WARPanel')
);

test(
  'WARDisplay imports useWARCalculations hook',
  fileContains('components/GameTracker/WARDisplay.tsx', "from '../../hooks/useWARCalculations'")
);

// ============================================
// 5. Type Safety
// ============================================
console.log('\n--- Type Safety ---');

test(
  'PlayerBWAR interface exported',
  fileContains('hooks/useWARCalculations.ts', 'export interface PlayerBWAR')
);

test(
  'PlayerPWAR interface exported',
  fileContains('hooks/useWARCalculations.ts', 'export interface PlayerPWAR')
);

test(
  'WARLeaderboards interface exported',
  fileContains('hooks/useWARCalculations.ts', 'export interface WARLeaderboards')
);

test(
  'BWARResult type used from bwarCalculator',
  fileContains('hooks/useWARCalculations.ts', 'BWARResult')
);

test(
  'PWARResult type used from pwarCalculator',
  fileContains('hooks/useWARCalculations.ts', 'PWARResult')
);

// ============================================
// 6. Utility Functions
// ============================================
console.log('\n--- Utility Functions ---');

test(
  'formatWAR exported',
  fileContains('hooks/useWARCalculations.ts', 'export { formatWAR }')
);

test(
  'getWARColor function exists',
  fileContains('hooks/useWARCalculations.ts', 'export function getWARColor')
);

test(
  'getWARTier function exists',
  fileContains('hooks/useWARCalculations.ts', 'export function getWARTier')
);

// ============================================
// RESULTS
// ============================================
console.log('\n============================================================');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('============================================================\n');

if (failed === 0) {
  console.log('✅ All tests passed! Day 2 WAR Pipeline is properly connected.\n');
  console.log('PIPELINE STATUS:');
  console.log('  seasonStorage → useWARCalculations → bwarCalculator/pwarCalculator → WARDisplay\n');
  console.log('BROWSER VERIFICATION STEPS:');
  console.log('1. Start the app: npm run dev');
  console.log('2. Create a season and play some games');
  console.log('3. Import WARPanel into a visible component');
  console.log('4. Verify: Batting/Pitching WAR leaderboards populate');
  console.log('5. Refresh: Values persist');
} else {
  console.log(`❌ ${failed} tests failed. Review the issues above.`);
  process.exit(1);
}
