# KEEP.md — Protected Files & Components

## Purpose
This document lists files and components that are OFF-LIMITS for modification during GameTracker delta work and playoff playthrough development. These represent working, polished code that took significant effort to build. Any agent that modifies these without explicit JK approval is in violation.

## Status: ACTIVE
Last updated: 2026-03-06

---

## Protected: Figma UI Pages (DO NOT REWRITE)
These pages have polished UI that should be preserved. Changes to these are ONLY permitted when fixing a specific bug identified during the playoff playthrough.

```
src/src_figma/app/pages/AppHome.tsx
src/src_figma/app/pages/FranchiseSelector.tsx
src/src_figma/app/pages/FranchiseSetup.tsx
src/src_figma/app/pages/FranchiseHome.tsx
src/src_figma/app/pages/PostGameSummary.tsx
src/src_figma/app/pages/ExhibitionGame.tsx
src/src_figma/app/pages/SeasonSummary.tsx
src/src_figma/app/pages/LeagueBuilder.tsx
src/src_figma/app/pages/LeagueBuilderLeagues.tsx
src/src_figma/app/pages/LeagueBuilderTeams.tsx
src/src_figma/app/pages/LeagueBuilderPlayers.tsx
src/src_figma/app/pages/LeagueBuilderRosters.tsx
src/src_figma/app/pages/LeagueBuilderDraft.tsx
src/src_figma/app/pages/LeagueBuilderRules.tsx
```

**Exception:** `GameTracker.tsx` and `WorldSeries.tsx` are NOT protected — they are the active work targets.

## Protected: Shared Engines (DO NOT REWRITE)
These engines have passing boundary-value tests. Modify ONLY if a test proves the formula is wrong per spec, and only the specific function that fails.

```
src/engines/bwarCalculator.ts
src/engines/pwarCalculator.ts
src/engines/fwarCalculator.ts
src/engines/rwarCalculator.ts
src/engines/mwarCalculator.ts
src/engines/leverageCalculator.ts
src/engines/wpaCalculator.ts
src/engines/salaryCalculator.ts
src/engines/mojoEngine.ts
src/engines/fitnessEngine.ts
src/engines/fameEngine.ts
src/engines/fanMoraleEngine.ts
src/engines/fanFavoriteEngine.ts
src/engines/gradeEngine.ts
src/engines/clutchCalculator.ts
src/engines/narrativeEngine.ts
src/engines/headlineEngine.ts
src/engines/playoffEngine.ts
src/engines/parkFactorDeriver.ts
src/engines/winExpectancyTable.ts
```

## Protected: Static Data (DO NOT MODIFY)
Player databases, league structures, team colors took extensive effort to build and verify.

```
src/data/                         (entire directory)
src/src_figma/config/teamColors.ts
```

## Protected: Test Infrastructure
```
vite.config.ts                    (build + test config)
src/test-setup.ts
tsconfig.app.json                 (TypeScript build config)
```

**Exception:** Additive exclusion changes to `vite.config.ts` and `tsconfig.app.json` are permitted (adding paths to `exclude` arrays) when quarantining dead code. Logic changes, plugin changes, and alias changes are NOT permitted.

## Protected: Mode 3 Offseason Flows (DO NOT REWRITE)
These flows are ~98% complete per JK assessment. Changes only for specific bugs.

```
src/src_figma/app/components/AwardsCeremonyFlow.tsx
src/src_figma/app/components/DraftFlow.tsx
src/src_figma/app/components/FreeAgencyFlow.tsx
src/src_figma/app/components/RetirementFlow.tsx
src/src_figma/app/components/RatingsAdjustmentFlow.tsx
src/src_figma/app/components/TradeFlow.tsx
src/src_figma/app/components/SeasonEndFlow.tsx
src/src_figma/app/components/FinalizeAdvanceFlow.tsx
src/src_figma/app/components/PlayoffSeedingFlow.tsx
src/src_figma/app/components/SpringTrainingFlow.tsx
src/src_figma/app/components/ContractionExpansionFlow.tsx
```

## NOT Protected (Active Work Targets)
These files are expected to be modified during GameTracker delta work:

```
src/src_figma/app/pages/GameTracker.tsx     — UI updates to match spec
src/src_figma/app/pages/WorldSeries.tsx     — Playoff bracket wiring
src/src_figma/hooks/useGameState.ts         — Event model updates
src/utils/eventLog.ts                       — Event persistence updates
src/types/game.ts                           — Type definition updates
src/src_figma/app/engines/*                 — Integration engine updates
src/src_figma/app/components/modals/*       — GameTracker modal updates
src/src_figma/app/components/*.tsx           — GameTracker sub-components
src/utils/playoffStorage.ts                 — Playoff persistence
```

## Rules for Protected Files
1. **Never refactor** a protected file for "code quality" or "consistency"
2. **Never rename** exports, props, or interfaces in protected files
3. **Bug fixes only** — and only for bugs found during the playoff playthrough
4. **Each fix** must be on its own branch with a specific bug reference
5. **If an agent proposes touching a protected file**, it must cite the specific bug and explain why the fix can't be made elsewhere
