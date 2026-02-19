# Tier 1 Verification Report

**Date**: 2026-02-13
**Build**: PASS (5653 tests, 0 failures, 134 files)
**Commits**: ba382fe through 0bd310c (7 commits)

---

## Summary

| ID | Issue | Status | Fix Commit | Evidence |
|----|-------|--------|------------|----------|
| T1-01 | Fame per-player tracking | CONDITIONAL | N/A | Works, but accuracy depends on T1-08 fix. Re-verify after T1-08. |
| T1-02 | Pinch runner credit | FIXED | 8b8505c | getBaseRunnerNames() syncs from tracker; pinch_run updates tracker |
| T1-03 | Runner name shows "R3" | FIXED | 8b8505c | useEffect syncs runnerNames from runnerTrackerRef on every base change |
| T1-04 | Ghost runner on base | FIXED | 8b8505c | runnerIdentityVersion counter forces re-sync on substitution |
| T1-05 | Fielding inference not auto-populating | FIXED | 21aa89c | inferFielderCredits() auto-infers from fieldingSequence, skips modal |
| T1-06 | Error prompt on OUT | FIXED | 02876e5 | Stale React state cleared at function start; local variable for check |
| T1-07 | Scoreboard runs display | RESOLVED | N/A | Core works; 9-column cosmetic for 6-inning games is minor |
| T1-08 | Post-game stats doubled | FIXED | ba382fe | Idempotency guards in completeGameInternal + endGame |
| T1-09 | Mojo/Fitness factors | VERIFIED CORRECT | N/A | Multiplier tables match spec exactly |
| T1-10 | Pitcher rotation in SIM | FIXED | 8c52ba8 | Rotation cycling, closer usage, save/hold detection added |
| T1-11 | SMB4 traits made-up | FIXED | 0bd310c | 32 fake traits replaced with 63 real SMB4 traits |

---

## Fix Details

### T1-01: Fame Per-Player Tracking
**Status**: CONDITIONAL — depends on T1-08 stat doubling fix.
- Fame events DO fire and ARE attributed to individual players
- "MULTI HR 2" triggered incorrectly due to doubled stats
- After T1-08 fix (idempotency guards), fame counts should be correct
- **Needs runtime re-verification** in a full game

### T1-02/03/04: Runner Identity Bugs
**Status**: FIXED (commit 8b8505c)
- Root cause: `runnerNames` state in GameTracker.tsx maintained separately from `runnerTrackerRef` in useGameState.ts, only synced during at-bat completions
- Fix: Added `getBaseRunnerNames()` that reads directly from tracker, `useEffect` sync on base state changes, `runnerIdentityVersion` counter for pinch runner updates
- Files: useGameState.ts, GameTracker.tsx
- **Needs runtime verification** for pinch runner scenario

### T1-05: Fielding Inference Auto-Population
**Status**: FIXED (commit 21aa89c)
- Root cause: FielderCreditModal always shown even when `fieldingSequence` has complete chain
- Fix: `inferFielderCredits()` applies standard baseball rules (last fielder = putout, others = assists, DP distribution), skips modal when confident
- Falls back to manual modal for empty sequence or ambiguous cases
- File: GameTracker.tsx
- **Needs runtime verification** for GO and DP plays

### T1-06: Error Prompt Trigger on OUT
**Status**: FIXED (commit 02876e5)
- Root cause: `runnersWithExtraAdvance` React state read via stale closure — value from PREVIOUS render persisted. Play 1 (hit) set state, Play 2 (OUT) read stale value.
- Fix: Clear state at start of `handleEnhancedPlayComplete`, use `localExtraAdvances` variable for same-call check
- File: GameTracker.tsx
- **Needs runtime verification** to confirm no false error prompts on OUT plays

### T1-07: Scoreboard Runs Display
**Status**: RESOLVED (Phase 1 diagnostic confirmed)
- Scoreboard correctly shows runs per inning, R/H/E totals
- Minor cosmetic: 9-column display for 6-inning games (not a bug, just display logic)

### T1-08: Post-Game Stats Doubled
**Status**: FIXED (commit ba382fe)
- Root cause: Both `completeGameInternal()` and `endGame()` processed stats independently
- Fix: Idempotency guards prevent double-processing
- **Verified in Playwright**: Post-game stats showed correct (non-doubled) values

### T1-09: Mojo/Fitness Factors
**Status**: VERIFIED CORRECT
- Mojo multipliers: RATTLED(0.82), TENSE(0.90), NORMAL(1.00), LOCKED_IN(1.10), JACKED(1.18)
- Fitness multipliers: JUICED(1.20), FIT(1.00), WELL(0.95), STRAINED(0.85), WEAK(0.70), HURT(0.00)
- Both match spec exactly

### T1-10: Pitcher Rotation in SIM
**Status**: FIXED (commit 8c52ba8)
- Root cause: SIM always picked first SP, hardcoded save=false, no closer distinction
- Fix: Rotation cycling per team across batch games, closer in save situations, save/hold/blown save detection, proper W/L/SV attribution
- Files: syntheticGameFactory.ts, FranchiseHome.tsx
- 6 verification tests pass (saves generated, never to starters, W+SV mutual exclusion, etc.)

### T1-11: SMB4 Traits
**Status**: FIXED (commit 0bd310c)
- `traitPools.ts` had 32 fabricated traits (Clutch Master, Ace, Five Tool, etc.) not in SMB4
- Replaced with 63 real SMB4 traits from smb4_traits_reference.md
- Salary calculator and fitness engine already used correct names (unaffected)
- TraitLotteryWheel.tsx now gets authentic SMB4 traits via `getWeightedTraitPool()`

---

## Items Requiring Runtime Verification

The following fixes are UNVERIFIED at runtime and should be tested in a full franchise game:

1. **T1-01**: Play a game with HR — verify fame popup shows correct count (not doubled)
2. **T1-02/03/04**: Make a pinch runner substitution — verify runner name updates on bases
3. **T1-05**: Record a GO 6-3 with runner on base — verify FielderCreditModal does NOT appear (auto-inferred)
4. **T1-06**: Play a hit followed by an OUT — verify ErrorOnAdvanceModal does NOT falsely trigger on the OUT

---

## Build Verification

```
npm run build → PASS (exit 0)
npm test → 5653 passed, 0 failed, 134 files
```
