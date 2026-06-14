---
name: season-simulator
description: Programmatically simulate a full KBL Tracker season at the engine level, feeding synthetic game results into the stats/standings/WAR pipeline and verifying coherence after every game. Architecture adapts based on franchise-engine-discovery findings (pure Node vs Vitest+RTL vs Playwright). Tests accumulated state over 162 games that no manual testing can cover. Trigger on "simulate season", "test full season", "accumulated state test", "season integration test", or as Phase 3 of the franchise testing pipeline.
---

# Season Simulator

## Purpose

Some bugs only appear after 50+ games of accumulated data. Standings drift. Stats stop adding up. WAR calculations go haywire when the denominator gets large. This skill stress-tests the entire season lifecycle by simulating 162 games (or as many as the architecture supports) and checking coherence at every step.

## Pre-Flight

1. Read `spec-docs/FRANCHISE_API_MAP.md` — REQUIRED. Specifically:
   - Pipeline architecture classification (A/B/C/D)
   - Completed-game data contract (the TypeScript type)
   - Fan-out topology
2. Read `spec-docs/DATA_PIPELINE_TRACE_REPORT.md` — REQUIRED (know which pipelines work before simulating)
3. Read `spec-docs/ENGINE_API_MAP.md` — for GameTracker engine reference
4. Run `npm run build` — must exit 0

### Architecture Decision Gate

**Based on FRANCHISE_API_MAP.md pipeline classification:**

```
IF Pipeline Architecture = A (Clean Function Call):
  → Use Mode A: Pure Node Simulator
  → Can simulate 162 games in minutes
  → Highest confidence, fastest execution

IF Pipeline Architecture = B (Orchestrated but Extractable):
  → Use Mode B: Wrapper + Node Simulator
  → First build a thin wrapper function, then use Mode A
  → Adds 15-30 min of wrapper building, then same speed as Mode A

IF Pipeline Architecture = C (React Side-Effect Cascade):
  → Use Mode C: Vitest + React Testing Library
  → Mount components, trigger state changes, verify side effects
  → Slower — realistic target is 20-50 games
  → Still catches accumulated state bugs, just fewer games

IF Pipeline Architecture = D (Mixed):
  → Use Mode D: Hybrid
  → Pure Node for extractable pipelines
  → Vitest+RTL for React-coupled pipelines  
  → Run both, cross-reference results

IF Pipeline classification is unknown:
  → STOP. Run franchise-engine-discovery first.
```

**ONLY proceed with the mode matching the pipeline classification. Do not assume Mode A.**

### Preflight Proof

Before simulating a full season, verify the simulator can process ONE game:

```
PREFLIGHT PROOF:
1. Create 1 synthetic game result matching the completed-game data contract
2. Feed it into the game completion processor (using the appropriate mode)
3. Verify: did downstream state change? Did stats update? Did standings update?
4. If YES → simulator is viable. Proceed.
5. If NO → document why and STOP. The pipeline may need fixing first.
```

**Capture the real game output shape:** Before generating synthetic data, if possible, record ONE real game through the GameTracker and capture its output. Use that EXACT shape as the template for synthetic games. This prevents shape mismatches.

## Phase 1: Synthetic Game Generator

### Game Result Template

Based on the completed-game data contract from FRANCHISE_API_MAP.md:

```typescript
interface SyntheticGame {
  // Use the EXACT type from FRANCHISE_API_MAP.md
  // Do not invent fields
  // Fill every required field with realistic values
  // Include optional fields in some games, omit in others
}

function generateGame(
  gameNumber: number,
  homeTeam: TeamData,
  awayTeam: TeamData,
  options?: {
    forceHomeWin?: boolean;
    forceBlowout?: boolean;
    forceExtraInnings?: boolean;
    forceShutout?: boolean;
    forceNoHitter?: boolean;
  }
): SyntheticGame {
  // Generate realistic but deterministic game results
  // Use seeded random for reproducibility
  // Include: final score, player stats, inning-by-inning linescore
  // Player stats should be realistic (not 50 HR in one game)
}
```

### Team and Player Setup

```typescript
// Create a minimal but realistic league setup
const LEAGUE_SETUP = {
  teams: 8,  // Or whatever KBL Tracker uses — check spec docs
  playersPerTeam: 25,  // Check spec docs
  gamesPerSeason: 162, // Or whatever SMB4 uses — check spec docs
};

function generateLeague(): LeagueData {
  // Create teams with rosters
  // Each player has a name, position, and initial stats (all zeros)
  // Use deterministic generation (seeded, not random)
}
```

### Schema Validation

Every synthetic game MUST pass TypeScript type checking:

```typescript
function validateGameShape(game: SyntheticGame): boolean {
  // Verify every required field exists and has correct type
  // This uses the same type the real app uses
  // If validation fails, the synthetic data is wrong — fix the generator, not the app
}
```

## Phase 2: Simulation Execution

### Mode A/B: Pure Node Simulator

```typescript
async function simulateSeason() {
  const league = generateLeague();
  const results: CoherenceCheckResult[] = [];

  // Initialize season
  const seasonState = initializeSeason(league);  // Use actual engine function

  for (let gameNum = 1; gameNum <= TOTAL_GAMES; gameNum++) {
    // Generate this game's result
    const [homeTeam, awayTeam] = getMatchup(seasonState, gameNum);
    const game = generateGame(gameNum, homeTeam, awayTeam);

    // Validate shape
    if (!validateGameShape(game)) {
      console.error(`SHAPE VALIDATION FAILED for game ${gameNum}`);
      break;
    }

    // Process through the engine (using actual app function)
    processCompletedGame(game);  // Or whatever the entry point is

    // Run coherence checks after every game
    const check = runCoherenceChecks(seasonState, gameNum, game);
    results.push(check);

    // Checkpoint every 10 games
    if (gameNum % 10 === 0) {
      saveCheckpoint(gameNum, seasonState, results);
      console.log(`Game ${gameNum}/${TOTAL_GAMES} — ${check.passCount}/${check.totalChecks} checks passed`);
    }

    // STOP on critical failure
    if (check.hasCriticalFailure) {
      console.error(`CRITICAL FAILURE at game ${gameNum}. Stopping simulation.`);
      console.error(`Failure: ${check.criticalFailureDescription}`);
      break;
    }
  }

  generateReport(results);
}
```

### Mode C: Vitest + RTL Simulator

```typescript
// This runs as a Vitest test file
import { render } from '@testing-library/react';
import { act } from 'react';

describe('Season Simulation', () => {
  it('processes 50 games with coherence', async () => {
    // Mount the app's provider tree
    const { /* relevant queries */ } = render(
      <AppProviders>
        <SeasonContext>
          {/* Components that trigger side effects on game completion */}
        </SeasonContext>
      </AppProviders>
    );

    for (let gameNum = 1; gameNum <= 50; gameNum++) {
      const game = generateGame(gameNum, ...);

      // Trigger game completion through React state
      await act(async () => {
        // Set game state as if GameTracker just finished
        // This triggers the useEffect cascade
      });

      // Verify coherence
      // Read state from hooks/context/store
      // Compare against expected accumulated values
    }
  });
});
```

**NOTE:** Mode C is significantly more complex to write. The skill should write it BUT also flag that it may need manual adjustment based on the app's specific provider structure.

## Phase 3: Coherence Checks

Run AFTER EVERY GAME. These catch drift before it compounds.

```typescript
interface CoherenceCheckResult {
  gameNumber: number;
  totalChecks: number;
  passCount: number;
  failCount: number;
  hasCriticalFailure: boolean;
  criticalFailureDescription?: string;
  checks: IndividualCheck[];
}

function runCoherenceChecks(
  state: SeasonState,
  gameNumber: number,
  lastGame: SyntheticGame
): CoherenceCheckResult {
  const checks: IndividualCheck[] = [];

  // CHECK 1: Total games played across all teams = gameNumber * 2
  // (Each game has 2 teams)
  checks.push(checkTotalGamesPlayed(state, gameNumber));

  // CHECK 2: Total wins across all teams = total losses across all teams
  checks.push(checkWinsEqualLosses(state));

  // CHECK 3: Total runs scored across all teams = total runs allowed across all teams
  checks.push(checkRunsBalanced(state));

  // CHECK 4: Each team's record matches their game-by-game results
  checks.push(checkTeamRecordsConsistent(state));

  // CHECK 5: Player stats sum to team stats
  // (Sum of all players' hits = team's total hits for the season)
  checks.push(checkPlayerStatsSum(state));

  // CHECK 6: Batting stats are internally consistent
  // (H = 1B + 2B + 3B + HR, PA = AB + BB + HBP + SF + SH, etc.)
  for (const player of getAllPlayers(state)) {
    checks.push(checkBattingStatsConsistent(player));
  }

  // CHECK 7: Pitching stats are internally consistent
  // (W + L <= GS, ER <= R, etc.)
  for (const pitcher of getAllPitchers(state)) {
    checks.push(checkPitchingStatsConsistent(pitcher));
  }

  // CHECK 8: WAR calculations are current
  // (Recalculate WAR from raw stats and compare to stored WAR)
  checks.push(checkWARCurrent(state));

  // CHECK 9: Standings match win-loss records
  checks.push(checkStandingsMatchRecords(state));

  // CHECK 10: No NaN, Infinity, or undefined in any stat field
  checks.push(checkNoInvalidValues(state));

  // CHECK 11: Batting averages are between 0 and 1 (or .000 to 1.000)
  checks.push(checkStatsInValidRange(state));

  // CHECK 12: Last game's stats were properly added
  // (Compare player stats before and after this game)
  checks.push(checkLastGameStatsApplied(state, lastGame));

  return summarizeChecks(checks, gameNumber);
}
```

### Critical vs Non-Critical Failures

```
CRITICAL (stop simulation):
- Total games played is wrong (fundamental counting error)
- Wins ≠ losses across league (data corruption)
- NaN or Infinity in any calculation
- Player stats DECREASED after a game (negative stats added)

NON-CRITICAL (log and continue):
- WAR slightly different from recalculation (floating-point drift — expected after many games)
- Standings sort order wrong (cosmetic)
- Missing optional stat field (incomplete but not corrupt)
```

## Phase 4: Edge Case Games

After the main 162-game simulation, inject specific edge case games:

```
EDGE CASE SCENARIOS:
1. Blowout: 20-0 game (tests large stat accumulation)
2. Extra innings: 15-inning game (tests unusual game structure)
3. No-hitter: pitcher with 0 hits allowed (tests zero-stat display)
4. Player with 0 PA in game (bench player — tests division by zero in averages)
5. Trade mid-season: move player to different team (tests stat splitting)
6. Season game 163: tiebreaker (if applicable in SMB4)
7. All-Star break point: verify mid-season stats are correct
8. Final game: verify season totals are correct and complete
```

## Phase 5: Report Generation

### Checkpoint-Based Progress

```
CHECKPOINT FORMAT (saved every 10 games):
{
  "gameNumber": 50,
  "totalGames": 162,
  "checksRun": 600,
  "checksPassed": 598,
  "checksFailed": 2,
  "failures": [
    {
      "gameNumber": 37,
      "check": "WAR current",
      "expected": 2.34,
      "actual": 2.31,
      "severity": "NON-CRITICAL",
      "note": "Floating-point drift — 0.03 WAR after 37 games"
    }
  ],
  "timestamp": "..."
}
```

### Final Report

```markdown
# Season Simulation Report
Generated: [date]
Mode: [A/B/C/D]
Games simulated: [X] / [total target]
Status: [COMPLETE / STOPPED AT GAME N / INCOMPLETE]

## Simulation Summary
- Teams: [count]
- Players: [count]
- Games processed: [count]
- Coherence checks run: [count]
- Checks passed: [count] ([percentage]%)
- Checks failed: [count]
- Critical failures: [count]

## Coherence Over Time
[Table or chart showing check pass rate at games 10, 20, 30, ... 162]
[Does coherence degrade over time? If so, when does drift become significant?]

| Games Played | Checks Run | Passed | Failed | Pass Rate |
|-------------|-----------|--------|--------|-----------|
| 10          | 120       | 120    | 0      | 100%      |
| 20          | 240       | 239    | 1      | 99.6%     |
| ...         | ...       | ...    | ...    | ...       |

## Failures by Type
| Check | First Failed | Total Failures | Severity | Pattern |
|-------|-------------|---------------|----------|---------|
| WAR current | Game 37 | 12 | NON-CRITICAL | Drift increases linearly |
| Stats sum | Game 89 | 1 | CRITICAL | Player stats stopped accumulating |

## Critical Failure Details
[For each critical failure: game number, what happened, expected vs actual]

## Drift Analysis
[For non-critical failures that accumulate: is the drift linear? Exponential?
 Will it become user-visible by end of season?]

## Edge Case Results
[Results of the 8 edge case games from Phase 4]

## Data Integrity at Season End
- All batting stats internally consistent: [YES/NO]
- All pitching stats internally consistent: [YES/NO]
- Standings match records: [YES/NO]
- WAR values within tolerance: [YES/NO] (tolerance: ±[value])
- No invalid values (NaN, Infinity, undefined): [YES/NO]

## Recommendations
1. [Critical issues to fix before anything else]
2. [Drift issues that need long-term fixes]
3. [Edge cases that need handling]
```

## Output

1. `spec-docs/SEASON_SIMULATION_REPORT.md` — human-readable report
2. `test-utils/season-simulator.ts` — the executable simulator script
3. `test-utils/season-results/` — checkpoint files and raw data
4. Updated `spec-docs/SESSION_LOG.md`

## Resumability

The simulator checkpoints every 10 games. If interrupted:

```bash
# Resume from last checkpoint
npx tsx test-utils/season-simulator.ts resume
```

The checkpoint includes the full accumulated state, so no games need replaying.

## Integrity Checks

1. ✅ Pipeline classification from FRANCHISE_API_MAP.md determined the mode
2. ✅ Preflight proof passed (1 synthetic game processed successfully)
3. ✅ Synthetic game shape matches the real completed-game data contract
4. ✅ Coherence checks run after EVERY game (not just at the end)
5. ✅ Critical failures stop the simulation (don't run 162 games with corrupt data)
6. ✅ Checkpoint system works (can resume from interruption)
7. ✅ Games simulated count matches expected count (or stop reason is documented)
8. ✅ Edge case games were run

## Anti-Hallucination Rules

- Do NOT assume Mode A (pure Node) without evidence from FRANCHISE_API_MAP.md
- Do NOT generate synthetic game data that doesn't match the EXACT completed-game data contract type
- Do NOT skip coherence checks to "save time" — they're the whole point
- Do NOT continue simulation past a critical failure — stop and report
- Do NOT claim 162 games were simulated if the simulation stopped early — report exact count
- If the preflight proof fails, STOP. Do not try to "work around" a broken pipeline.
- Do NOT use real player names or team data from outside the app — generate deterministic test data
- If Mode C (Vitest+RTL) is needed, acknowledge the complexity and flag that the test file may need manual adjustment for the app's specific provider tree
