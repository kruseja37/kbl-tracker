# KBL Tracker - Current State

> **Last Updated**: 2026-02-03 (Session 2 continued)
> **Component**: GameTracker (Enhanced Drag-Drop)

---

## ✅ PERSISTENCE LAYER NOW EXISTS

**Session 2026-02-03**: Major codebase buildout completed. The following were added:

### Phase 1: Types & Persistence
| File | Size | Status |
|------|------|--------|
| `app/types/game.ts` | 50KB | ✅ Added - All core game types |
| `app/types/war.ts` | 14KB | ✅ Added - All WAR types |
| `utils/eventLog.ts` | 26KB | ✅ Added - AtBatEvent persistence |
| `utils/seasonStorage.ts` | 26KB | ✅ Added - Season stats persistence |
| `utils/careerStorage.ts` | 30KB | ✅ Added - Career stats persistence |
| `utils/gameStorage.ts` | 10KB | ✅ Added - Game state persistence |
| `utils/seasonAggregator.ts` | 11KB | ✅ Added - Game→Season aggregation |
| `utils/milestoneDetector.ts` | 52KB | ✅ Added - Milestone detection |
| `utils/milestoneAggregator.ts` | 28KB | ✅ Added - Milestone aggregation |

### Phase 2: Engine Integrations
| Engine | Integration | Hook | Status |
|--------|-------------|------|--------|
| mwarCalculator | mwarIntegration.ts (9KB) | useMWARCalculations.ts (7KB) | ✅ Wired |
| fanMoraleEngine | fanMoraleIntegration.ts (8KB) | useFanMorale.ts (7KB) | ✅ Wired |
| relationshipEngine | relationshipIntegration.ts (8KB) | useRelationshipData.ts (6KB) | ✅ Wired |
| agingEngine | agingIntegration.ts (6KB) | useAgingData.ts (8KB) | ✅ Wired |

**NOTE**: These hooks/utils are now available but may need to be wired into UI components.

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

3. **Testing Plan Updated** (Session 2 continued)
   - Added Phase 5: Persistence & Integration Layer tests
   - Added 18 new test files to create:
     - 7 persistence layer tests (eventLog, seasonStorage, etc.)
     - 4 engine integration tests (mWAR, Fan Morale, Relationship, Aging)
     - 4 hook tests (useMWARCalculations, useFanMorale, etc.)
     - 3 aggregation utils tests
   - Updated sprint timeline (now 5 sprints)
   - Updated success criteria targets

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

## Stat Tracking Gaps (vs STAT_TRACKING_ARCHITECTURE_SPEC.md)

> **Analysis Date**: 2026-02-03

### 🔴 CRITICAL (Blocking Features)

| Gap | Impact | Fix Required |
|-----|--------|--------------|
| pitchCount | Never incremented | Add pitch count input per at-bat |
| basesReachedViaError | Missing from PitcherGameStats | Add field, update on Error |
| inherited/bequeathed runners | Not tracked | Track on pitcher substitution |

### 🟡 HIGH (Accuracy Issues)

| Gap | Impact | Fix Required |
|-----|--------|--------------|
| HBP vs BB | HBP counted as walks | Separate hbp field |
| hitBatters (pitcher) | Not tracked | Add to PitcherGameStats |
| hitOrder[] | Missing | Add for cycle detection |
| Leverage Index | Hardcoded 1.0 | Calculate from game state |

### 🟢 MEDIUM (Nice to Have)

| Gap | Impact | Fix Required |
|-----|--------|--------------|
| ballInPlay data | All null | Add trajectory/velocity input |
| Fielding stats | Not tracked | Infer from fielder sequence |
| WPA | Hardcoded 0 | Calculate win probability delta |
| isClutch/isWalkOff | Hardcoded false | Detect from game state |

### Fielding Stats (ENTIRELY MISSING)

- Putouts: ❌ Not tracked
- Assists: ❌ Not tracked
- Errors per fielder: ❌ Not tracked (only team total)
- **Potential fix**: Infer from fielder sequence (6-4-3 = SS assist, 2B assist, 1B putout)

---

## Known Bugs

| Bug ID | Description | Status |
|--------|-------------|--------|
| BUG-001 | Position validation on subs | Open |
| BUG-011 | HR distance validation | Open |
| BUG-013 | Button disable without runners | Open |
| BUG-015 | HR fielding attempt options | Open |
| BUG-016 | pitchCount never incremented | Open (NEW) |
| BUG-017 | basesReachedViaError missing | Open (NEW) |
| BUG-018 | HBP counted as BB | Open (NEW) |
