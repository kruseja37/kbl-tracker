# Dummy Data Scrubber Skill — Comprehensive Audit Report

**Date**: 2026-02-05
**Status**: READ-ONLY AUDIT (No files modified)
**Reviewed Files**:
- `.claude/skills/dummy-data-scrubber/SKILL.md`
- `.claude/skills/dummy-data-scrubber/references/DATA_SOURCES.md`

---

## SUMMARY

**Total Issues Found**: 8
**HIGH Severity**: 1
**MEDIUM Severity**: 3
**LOW Severity**: 4

---

## ISSUES IDENTIFIED

### HIGH SEVERITY

#### Issue #1: Hardcoded Dummy Data in Production Hook
**File**: `src/src_figma/hooks/useFranchiseData.ts` (Line 121)
**Current Value**: `{ team: "Sirloins", wins: 36, losses: 54, gamesBack: "22.0", runDiff: "-88" }`
**Problem**: Hardcoded team standing data using mock team name "Sirloins" (SMB4 franchise). This is exactly the type of dummy data the skill is designed to find and replace.
**What Should Be**: Dynamic data pulled from franchiseStorage or leagueBuilderStorage
**Action Required**: Replace with dynamic data pull from storage layer.

---

### MEDIUM SEVERITY

#### Issue #2: Incomplete Hook Documentation — Figma App Hooks
**File**: `DATA_SOURCES.md` → "Hooks (React State → UI)" → "Figma App Hooks (`src/src_figma/app/hooks/`)"
**Claims**: 7 hooks listed in table
**Actually Exists**: 8 hooks
**Missing**: `useSeasonStats.ts` not in table
**Impact**: Users may miss this hook when identifying data sources.

---

#### Issue #3: Incomplete Hook Documentation — Base Hooks
**File**: `DATA_SOURCES.md` → "Base Hooks (`src/hooks/`)"
**Claims**: Table shows hooks but documentation may imply incomplete list
**Actually Exists**: 18 hooks
**All Listed Hooks Do Exist**: ✓ Verified all entries
**Impact**: If user counts table rows, they may think only ~14 exist when 18 do.

---

#### Issue #4: Incomplete Engine Documentation
**File**: `DATA_SOURCES.md` → "Figma Integration Engines (`src/src_figma/app/engines/`)"
**Claims**: 11 engines in table
**Actually Exists**: 14 engines
**Missing from Table**:
- `narrativeIntegration.ts`
- `warOrchestrator.ts`

**Impact**: Skill users may not know about these integration points, leading to missed dummy data replacements.

---

### LOW SEVERITY

#### Issue #5: Stale Line Count — GameTracker.tsx
**File**: `SKILL.md` → "Critical File Paths"
**Claims**: "3,316 lines"
**Actual**: 3,754 lines
**Discrepancy**: 438 lines off (11.7% error)

#### Issue #6: Stale Line Count — useGameState.ts
**File**: `SKILL.md` → "Critical File Paths"
**Claims**: "2,344 lines"
**Actual**: 2,968 lines
**Discrepancy**: 624 lines off (21% error)

#### Issue #7: Stale File Size — FranchiseHome.tsx
**File**: `SKILL.md` → "Critical File Paths"
**Claims**: "232KB"
**Actual**: 228KB
**Discrepancy**: 4KB (~1.7% error, negligible)

---

## VERIFIED AS CORRECT

✓ **Architecture Note** (Shared-source pattern correctly described)
✓ **All 14 Critical File Paths** (All pages verified to exist)
✓ **All 20 Storage Files** (All files exist at documented paths)
✓ **All 17 Base Engines** (All verified correct)
✓ **All Detection Patterns** (Grep commands are valid)
✓ **Component/Modal Counts** (36 + 9 verified correct)
✓ **Data Flow Diagram** (Accurately represents pipeline)
✓ **vite.config.ts** (Confirms `@/` alias = `src/src_figma`)

---

## DETAILED FINDINGS TABLE

| # | File | What It Claims | What Exists | Severity |
|----|------|---|---|---|
| 1 | useFranchiseData.ts:121 | Hardcoded "Sirloins" standings | Should be dynamic from storage | HIGH |
| 2 | DATA_SOURCES.md | 7 Figma App hooks | 8 exist (missing useSeasonStats.ts) | MEDIUM |
| 3 | DATA_SOURCES.md | Base hooks count unclear | 18 exist (all listed do exist) | MEDIUM |
| 4 | DATA_SOURCES.md | 11 Figma integration engines | 14 exist (missing narrativeIntegration.ts, warOrchestrator.ts) | MEDIUM |
| 5 | SKILL.md | GameTracker: 3,316 lines | 3,754 lines | LOW |
| 6 | SKILL.md | useGameState: 2,344 lines | 2,968 lines | LOW |
| 7 | SKILL.md | FranchiseHome: 232KB | 228KB | LOW |

---

## RECOMMENDATIONS

### Must Fix (HIGH)
1. Replace hardcoded franchise data in `useFranchiseData.ts:121` with dynamic storage pull

### Should Fix (MEDIUM)
2. Update `DATA_SOURCES.md`:
   - Add `useSeasonStats.ts` to Figma App Hooks table
   - Add `narrativeIntegration.ts` and `warOrchestrator.ts` to Figma Integration Engines
   - Clarify base hooks count (18 exist)

### Nice to Have (LOW)
3. Update line counts in `SKILL.md`:
   - GameTracker.tsx: 3,316 → 3,754
   - useGameState.ts: 2,344 → 2,968
   - FranchiseHome.tsx: 232KB → 228KB

---

## CONCLUSION

The dummy-data-scrubber skill is **FUNCTIONAL** with **DOCUMENTATION GAPS**:

1. **Shared-source architecture is correctly described**
2. **One confirmed dummy data instance found** (validates skill purpose)
3. **Incomplete hook/engine inventories** could cause missed replacements
4. **Stale metrics** don't affect functionality but reduce documentation credibility

**Assessment**: Ready for use with recommended documentation updates.
