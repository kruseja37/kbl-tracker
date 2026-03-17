# Pre-Browser Cleanup: Orphan Deletion + Detection Dead Code Removal

## Overview

Clean the codebase so what's on disk is what's live. Delete orphaned EIF-era
files, remove dead detection scaffolding, and extract the one shared constant
that the live GameTracker still needs from fielderInference.ts.

ROUTE: Codex 5.3 | high

### Prompt (copy-paste to Codex):

```
You are the GameTracker Dead Code Cleanup Specialist.

GOAL:
Three tasks:
1. Delete 11 orphaned EIF-era component and engine files
2. Remove dead detection scaffolding from GameTracker.tsx and delete detectionIntegration.ts
3. Extract POSITION_NUMBER into a shared constant, then delete fielderInference.ts

CONTEXT:
EnhancedInteractiveField.tsx has been deleted. GameDiamond.tsx is the live field.
The live GameTracker page is src/src_figma/app/pages/GameTracker.tsx.
src/App.tsx confirms all routes point to src/src_figma/app/pages/.
detectionIntegration.ts is imported by GameTracker.tsx but runPlayDetections() is
never actually called anywhere. The import, the pendingDetections state, and any
UI rendering of detection results are dead scaffolding.
The shared engine src/engines/detectionFunctions.ts is NOT being deleted — only
the stale Figma adapter layer and its uncalled scaffolding.

SOURCE OF TRUTH:
- spec-docs/CURRENT_STATE.md — confirms EIF deleted, GameDiamond is live field
- src/App.tsx — confirms all routes point to src/src_figma/app/pages/

TASK 1 — DELETE ORPHANED FILES:

Verify each is truly orphaned (grep for imports across src/src_figma/) before deleting.
If ANY file turns out to be imported by a live path, DO NOT delete — report instead.

Files to delete (all in src/src_figma/app/components/):
1. ActionSelector.tsx
2. BaserunnerDragDrop.tsx
3. DragDropFieldDemo.tsx
4. ErrorTypePopup.tsx
5. MiniScoreboard.tsx
6. ModifierButtonBar.tsx
7. OutcomeButtons.tsx
8. RunnerOutcomeArrows.tsx
9. SidePanel.tsx

Files in src/src_figma/app/engines/:
10. adaptiveLearningEngine.ts
11. adaptiveLearningIntegration.ts

TASK 2 — REMOVE DETECTION DEAD CODE:

detectionIntegration.ts is imported by GameTracker.tsx but never called.
runPlayDetections() has zero call sites in GameTracker.tsx.
pendingDetections state and any detection-result UI rendering are dead scaffolding.

Steps:
1. In GameTracker.tsx, remove:
   - The import of runPlayDetections and UIDetectionResult from detectionIntegration
   - Any useState for pendingDetections or detection-related UI state
   - Any JSX that renders detection results (if any exists)
   - Any handler or callback that references runPlayDetections
2. Delete src/src_figma/app/engines/detectionIntegration.ts
3. Check src/src_figma/app/engines/index.ts — if it re-exports detectionIntegration,
   remove that re-export
4. Do NOT delete src/engines/detectionFunctions.ts — that's the shared engine,
   not the dead adapter layer

TASK 3 — FIELDER INFERENCE EXTRACTION:

GameTracker.tsx line ~107 imports only POSITION_NUMBER from fielderInference.ts.
The rest of fielderInference.ts (260+ lines of directional inference logic) is
not imported by any live component.

Steps:
1. Check all live files for any import from fielderInference.ts
   (GameTracker.tsx, GameDiamond.tsx, HistoricalEventEditor.tsx, EnrichmentPanel.tsx,
    all files in src/src_figma/app/utils/, all files in src/src_figma/hooks/)
2. Extract POSITION_NUMBER and POSITION_MAP into a minimal shared constant file
   (e.g., src/src_figma/app/utils/positionConstants.ts)
3. Update all imports to point to the new location
4. If no other live file imports from fielderInference.ts beyond the constants:
   delete fielderInference.ts
5. If something else imports it: report what and why

CONSTRAINTS:
- Do NOT touch: src/components/GameTracker/ (legacy, separate concern)
- Do NOT touch: useGameState.ts (stable, don't risk regressions)
- Do NOT touch: eventLog.ts (stable)
- Do NOT touch: src/engines/detectionFunctions.ts (shared engine, not being deleted)
- For Task 1: verify orphan status with grep before each deletion
- For Task 2: verify runPlayDetections has zero call sites before removing
- For Task 3: verify all imports before deleting fielderInference.ts
- If deleting any file causes build failure: immediately restore and report

VERIFICATION:
1. npm run build — must pass after all changes
2. Orphan check — grep for deleted file names across src/src_figma/:
   grep -rn "ActionSelector\|BaserunnerDragDrop\|DragDropFieldDemo\|ErrorTypePopup\|MiniScoreboard\|ModifierButtonBar\|OutcomeButtons\|RunnerOutcomeArrows\|SidePanel" src/src_figma/app/pages/ src/src_figma/hooks/ src/src_figma/app/components/GameDiamond.tsx
   — should return zero results
3. Detection removal check:
   grep -rn "detectionIntegration\|runPlayDetections\|pendingDetections\|UIDetectionResult" src/src_figma/
   — should return zero results
4. Adaptive learning check:
   grep -rn "adaptiveLearningEngine\|adaptiveLearningIntegration" src/src_figma/
   — should return zero results
5. Fielder inference check:
   grep -rn "fielderInference" src/src_figma/
   — should return zero results (replaced by positionConstants or equivalent)
6. Shared engine preserved:
   ls src/engines/detectionFunctions.ts
   — should still exist

FORMAT — Your response must contain exactly these sections:
1. ORPHAN VERIFICATION (grep evidence for each file before deletion)
2. FILES DELETED (list each)
3. FILES CREATED (if any, e.g., positionConstants.ts)
4. FILES MODIFIED (list each with specific changes)
5. VERIFICATION OUTPUT (all 6 checks + build result)
6. STATUS

FAILURE PROTOCOL:
- If any "orphaned" file turns out to be imported by live code → do not delete, report
- If removing detection imports from GameTracker.tsx causes type errors → report what depends on it
- If deleting a file causes build failure → immediately restore and report
- If fielderInference.ts has live consumers beyond POSITION_NUMBER → report them, don't delete
```
