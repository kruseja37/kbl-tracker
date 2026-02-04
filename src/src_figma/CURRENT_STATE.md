# KBL Tracker - Current State

> **Last Updated**: 2026-02-03
> **Component**: GameTracker (Enhanced Drag-Drop)

---

## Implementation Status

### ✅ WORKING

| Feature | Notes |
|---------|-------|
| Drag-drop fielder placement | Core mechanic |
| Play classification | playClassifier.ts |
| Runner defaults calculation | runnerDefaults.ts |
| Runner outcome persistence | Fixed 2026-02-03 |
| Hit recording with runners | Fixed 2026-02-03 |
| TBL (TOOTBLAN) | Runner OUT on bases |
| WP/PB advancement | Runners advance 1 base |
| FO → SF auto-correction | Already implemented |

### ⚠️ NEEDS FIX

| Issue | Priority | Notes |
|-------|----------|-------|
| Balk option exists | 🔴 HIGH | **REMOVE** - Not in SMB4 |
| D3K should be in K+WP/PB flow | 🟡 MEDIUM | Ensure integrated flow |
| WP/PB enabled with no runners | 🟡 MEDIUM | Should be disabled |
| SB/CS enabled with no runners | 🟡 MEDIUM | Should be disabled |
| Forced runner shows "Hold" | 🟡 MEDIUM | Should hide invalid option |
| GO → DP not auto-corrected | 🟡 MEDIUM | Should auto-correct |
| No `isForced()` validation | 🟡 MEDIUM | Allows impossible states |

### ❌ NOT IMPLEMENTED (by design)

| Feature | Reason |
|---------|--------|
| Balk handling | **NOT IN SMB4** |
| Catcher Interference | **NOT IN SMB4** |
| Obstruction | **NOT IN SMB4** |

---

## SMB4 Limitations (CRITICAL)

**These events do NOT exist in Super Mega Baseball 4:**

| Event | Status |
|-------|--------|
| Balks | ❌ No balk mechanic |
| Catcher Interference | ❌ Not implemented |
| Obstruction | ❌ Not implemented |

**These events ARE in SMB4:**
- Dropped 3rd Strike (D3K) ⚠️ **ONLY via K + WP/PB** (swing & miss, 2 strikes)
- Infield Fly Rule (IFR) ✅
- Ground Rule Double (rare) ⚠️

---

## Key Files

| File | Purpose | Size |
|------|---------|------|
| `EnhancedInteractiveField.tsx` | Main GameTracker | ~124KB |
| `playClassifier.ts` | Play inference | ~19KB |
| `runnerDefaults.ts` | Runner outcomes | ~8KB |
| `GameTracker.tsx` | Page component | ~15KB |
| `useGameState.ts` | Game state hooks | ~20KB |

---

## Recent Changes (2026-02-03)

1. **Runner outcome persistence fix**
   - Added `runnerOutcomes` to PlayData interface
   - handleEndAtBat now passes outcomes to onPlayComplete

2. **BASEBALL_LOGIC_AUDIT.md update**
   - Incorporated RUNNER_ADVANCEMENT_RULES.md
   - Incorporated AUTO_CORRECTION_SYSTEM_SPEC.md
   - Incorporated ADAPTIVE_STANDARDS_ENGINE_SPEC.md
   - Documented SMB4 limitations
   - Added action items summary

---

## Next Priority Actions

### 🔴 CRITICAL (This Session)

1. Remove Balk option from OTHER events
2. Verify D3K is properly integrated into K+WP/PB flow

### 🟡 HIGH (Next Session)

3. Add `isForced()` validation function
4. Disable buttons when no runners
5. Add GO → DP auto-correction

---

## Known Bugs

| Bug ID | Description | Status |
|--------|-------------|--------|
| BUG-001 | Position validation on subs | Open |
| BUG-011 | HR distance validation | Open |
| BUG-013 | Button disable without runners | Open |
| BUG-015 | HR fielding attempt options | Open |
