# Legacy ↔ Figma Reconciliation Plan

> **Created**: 2026-02-03
> **Status**: ✅ COMPLETE
> **Purpose**: Fix build errors and properly integrate legacy engines into Figma

---

## Current Build Status: ✅ PASSING

**All 42 TypeScript errors FIXED** on 2026-02-03. Build now passes successfully.

```
> npm run build
> tsc -b && vite build
✓ 1806 modules transformed.
✓ built in 3.26s
```

---

## Root Cause Analysis

The Figma codebase has "integration" files that wrap legacy engines, but:

1. **API signatures don't match** - Integration files expect different function parameters
2. **Type definitions conflict** - Properties like `result.retired` vs `result.shouldRetire`
3. **Some imports are broken** - Missing modules like `franchiseStorage`

### Error Breakdown by File

| File | Errors | Root Cause |
|------|--------|------------|
| `useFanMorale.ts` | 21 | Wrong FanMorale interface, wrong function signatures |
| `fanMoraleIntegration.ts` | 8 | FanState enum values don't match legacy |
| `useAgingData.ts` | 5 | Using wrong AgingResult properties |
| `agingIntegration.ts` | 3 | Passing wrong arguments to processEndOfSeasonAging |
| `useMWARCalculations.ts` | 3 | Missing leverageCalculator import, wrong types |
| `mwarIntegration.ts` | 1 | Return type mismatch |
| `milestoneAggregator.ts` | 1 | Missing franchiseStorage import |

---

## Recommended Fix Strategy

### Option 1: Fix Integration Files (RECOMMENDED)

Update the Figma integration files to match the actual legacy engine APIs.

**Pros:**
- Maintains cross-import architecture
- No code duplication
- Tested legacy code remains unchanged

**Cons:**
- Need to understand both APIs
- May require significant refactoring

**Effort:** 2-4 hours

### Option 2: Stub Out Broken Files

Replace broken integration files with minimal stubs that return mock data.

**Pros:**
- Quick fix
- Gets build passing

**Cons:**
- Features won't work
- Technical debt

**Effort:** 30 minutes

### Option 3: Copy Legacy Files to Figma

Copy the legacy engines directly into Figma, updating import paths.

**Pros:**
- Self-contained Figma codebase
- No cross-import complexity

**Cons:**
- Code duplication (~10,000+ lines)
- Divergence risk
- Double maintenance

**Effort:** 4-8 hours

---

## Phase 1: Critical Build Fixes ✅ COMPLETE

All fixes have been applied and build now passes:

### 1.1 Fix `agingIntegration.ts` (3 errors)

**Problem:** Passing single number where object expected

```typescript
// CURRENT (wrong):
const result = processEndOfSeasonAging(
  player.currentAge,
  player.overallRating,  // ❌ Should be Record<string, number>
  player.fame || 0,
  player.performanceModifier || 0
);
result.ratingChange;  // ❌ Should be ratingChanges (array)
result.retired;       // ❌ Should be shouldRetire

// FIXED:
const result = processEndOfSeasonAging(
  player.currentAge,
  { overall: player.overallRating },  // ✅ Wrap in object
  player.fame || 0,
  player.performanceModifier || 0
);
const ratingChange = result.ratingChanges.reduce((sum, r) => sum + r.change, 0);  // ✅
if (result.shouldRetire) {  // ✅
  retirements.push(player.playerId);
}
```

### 1.2 Fix `useAgingData.ts` (5 errors)

**Same issues as agingIntegration.ts** - update to use correct AgingResult properties.

### 1.3 Fix `fanMoraleIntegration.ts` (8 errors)

**Problem:** Using FanState enum values that don't exist in legacy

```typescript
// CURRENT (wrong):
case 'ELECTRIC':  // ❌ Not a valid FanState
case 'HYPED':     // ❌ Not a valid FanState
case 'FURIOUS':   // ❌ Not a valid FanState

// Need to check what FanState actually has in legacy
```

### 1.4 Fix `useFanMorale.ts` (21 errors)

**Problem:** Completely wrong interface expectations

- Needs FanMorale interface to match legacy
- Needs function call signatures to match
- Needs return type handling

### 1.5 Fix `useMWARCalculations.ts` (3 errors)

**Problem:** Wrong import path for leverageCalculator

```typescript
// CURRENT (wrong):
import { getLeverageIndex } from '../../../../engines/leverageCalculator';

// Should verify this path resolves correctly
```

### 1.6 Fix `mwarIntegration.ts` (1 error)

**Problem:** Function returns void but type expects GameManagerStats

### 1.7 Fix `milestoneAggregator.ts` (1 error)

**Problem:** Imports from non-existent `./franchiseStorage`

```typescript
// CURRENT (wrong):
import { ... } from './franchiseStorage';

// This file doesn't exist in Figma - need to either:
// 1. Import from legacy: '../../utils/franchiseStorage'
// 2. Create stub in Figma
// 3. Remove the import if not used
```

---

## Phase 2: Feature Completion (After Build Passes)

Once build is green, these are the remaining gaps:

### 2.1 Missing Utils (HIGH priority)

| File | Action |
|------|--------|
| `franchiseStorage.ts` | Import from legacy OR copy |
| `offseasonStorage.ts` | Import from legacy OR copy |
| `playoffStorage.ts` | Import from legacy OR copy |
| `scheduleStorage.ts` | Import from legacy OR copy |
| `leagueBuilderStorage.ts` | Import from legacy OR copy |

### 2.2 Missing Engines (HIGH priority)

| Engine | Action |
|--------|--------|
| WAR calculators (bwar, pwar, fwar, rwar) | Already imported by useWARCalculations - verify working |
| `leverageCalculator.ts` | Verify import path |
| `detectionFunctions.ts` | Already wrapped by detectionIntegration |

### 2.3 Missing Hooks (MEDIUM priority)

| Hook | Action |
|------|--------|
| `useGamePersistence.ts` | May need for save/load |
| `useClutchCalculations.ts` | For clutch stats |

---

## Verification Checklist

After implementing fixes:

```
□ npm run build → Exit 0
□ npm test → All tests pass
□ GameTracker loads in browser
□ FranchiseHome loads without errors
□ Offseason flows work
```

---

## Appendix: Legacy Engine API Reference

### agingEngine.ts

```typescript
interface AgingResult {
  newAge: number;
  ratingChanges: { attribute: string; change: number }[];
  shouldRetire: boolean;
  retirementProbability: number;
  phase: CareerPhase;
}

function processEndOfSeasonAging(
  currentAge: number,
  ratings: Record<string, number>,  // NOT a single number!
  fame?: number,
  performanceModifier?: number
): AgingResult
```

### fanMoraleEngine.ts

Need to check actual FanState enum values and FanMorale interface.

### leverageCalculator.ts

Need to verify GameStateForLI interface.

---

*Last Updated: 2026-02-03*
