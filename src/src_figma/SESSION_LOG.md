# KBL Tracker Session Log

## Session: 2026-02-03 (Continued)

### Context Recovery
- Session continued from previous context that was compacted
- Previous work: TBL fix, runner outcome persistence, D3K fixes

### Work Completed

#### 1. BASEBALL_LOGIC_AUDIT.md - Major Update
Incorporated three spec documents into the audit:

**RUNNER_ADVANCEMENT_RULES.md findings:**
- D3K exists in SMB4 but **ONLY via K + WP/PB** (swing & miss with 2 strikes)
- Balks, Catcher Interference, Obstruction do NOT exist in SMB4
- Infield Fly Rule IS in SMB4
- Added `isForced()` function documentation
- Added force play validation rules

**AUTO_CORRECTION_SYSTEM_SPEC.md findings:**
- GO → DP auto-correction rules (not yet implemented)
- FO → SF auto-correction (already implemented)
- Button availability rules (WP/PB/SB/CS should be disabled with no runners)
- Force out negates runs on 3rd out rule

**ADAPTIVE_STANDARDS_ENGINE_SPEC.md findings:**
- Opportunity Factor: (games × innings) / (162 × 9)
- SMB4 baselines differ from MLB (.288 AVG vs .250, 4.04 ERA vs 4.25)
- Linear weights calculated via Jester method

#### 2. Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| D3K via K+WP/PB flow | D3K only occurs on strikeout + wild pitch/passed ball in SMB4 |
| Remove Balk option | Balks do NOT exist in SMB4 |
| Keep IFR | Infield Fly Rule IS in SMB4 |
| Add `isForced()` | Need validation to prevent impossible UI states |

### Pending/Next Steps

1. **CRITICAL**: Remove Balk option from OTHER events
2. Verify D3K is properly integrated into K+WP/PB flow
3. Add `isForced()` validation function to runnerDefaults.ts
4. Hide "Hold" option for forced runners in UI
5. Disable WP/PB/SB/CS buttons when no runners on base
6. Add GO → DP auto-correction

### Files Modified
- `/spec-docs/BASEBALL_LOGIC_AUDIT.md` - Major update with all three spec docs

### Files Created
- `/spec-docs/SESSION_LOG.md` - This file
- `/spec-docs/CURRENT_STATE.md` - Current state documentation

---

## Previous Session Notes (from compaction)

### TBL Fix
- Changed TBL (TOOTBLAN) from "runners advance" group to "runner OUT" group
- Runner is now marked OUT on baserunning blunder

### Runner Outcome Persistence
- Fixed `handleEndAtBat` to pass `runnerOutcomes` to `onPlayComplete`
- Added `runnerOutcomes?: RunnerDefaults` to `PlayData` interface
- User adjustments to runner outcomes now persist after End At-Bat

### D3K Fixes (VALID FOR SMB4)
- Fixed D3K legality checking (1B empty OR 2 outs)
- Added `calculateD3KDefaults()` function
- **NOTE**: D3K in SMB4 only occurs via K + WP/PB (swing & miss with 2 strikes)
- The legality rules still apply: batter can reach if 1B empty OR 2 outs
