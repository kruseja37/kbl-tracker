---
name: elimination-mode-verifier
description: Verify that the KBL Tracker Elimination Mode implementation fully matches ELIMINATION_MODE_SPEC.md — from home screen entry through bracket completion and awards. Three-layer audit covering static wiring (code analysis), interaction flows (handler chain tracing), and end-to-end journeys (Playwright tests). Produces a structured pass/fail report with zero tolerance for assumptions. Trigger on "verify elimination mode", "test elimination flow", "check if elimination works", "elimination mode audit", "does the bracket work end to end", or any request to validate Elimination Mode against spec.
---

# Elimination Mode Verifier — Final

## Philosophy

Three layers of verification, each catching what the previous layer misses:

1. **Layer A — Static Wiring:** Does the code exist and connect correctly? (grep + read)
2. **Layer B — Interaction Chains:** When a user taps X, does the full handler chain fire correctly? (trace function calls through React state updates)
3. **Layer C — End-to-End Journeys:** Can a user actually complete the workflow? (Playwright scripts against dev server)

Most AI audit skills only do Layer A. That's why they miss the bugs you're seeing. This skill does all three.

---

## Ground Rules (MANDATORY — violating any invalidates the report)

### Rule 1: Evidence or FAIL
Every check requires **pasted source code** as evidence. Not a description. The actual lines from the actual file with file path + line numbers. If you cannot paste the code, the result is FAIL with reason "unable to locate evidence."

### Rule 2: Binary Results Only
PASS, FAIL, or NOT_IMPLEMENTED. No PARTIAL. Either it works or it doesn't.

### Rule 3: Negative Assertions Required
Every check must verify BOTH that the correct thing exists AND that the wrong thing does NOT exist.

### Rule 4: Trace Boundaries, Don't Assume Compatibility
For data flow checks: paste the sender's output, paste the receiver's input, confirm field-by-field match.

### Rule 5: Quote the Spec Before Checking the Code
For every check, FIRST paste the relevant spec quote. THEN paste the code. THEN compare.

### Rule 6: No Inferred Behavior
Do NOT say "this function likely does X based on its name." Read the function body.

### Rule 7: Build Gate
Run `npm run build` first. If it fails, stop. Do not audit broken code.

### Rule 8: Handler Chains Must Be Fully Traced
For any "user taps X" check, trace the COMPLETE chain:
```
User action → React onClick → handler function → state update → re-render → what user sees
```
Every link in the chain must be pasted as evidence. If any link is broken (handler exists but doesn't call state update, state update exists but component doesn't re-render from it), the check is FAIL.

### Rule 9: No "Looks Correct" Conclusions
The phrase "this looks correct" or "this appears to work" is BANNED. Replace with "this PASSES because [specific evidence]" or "this FAILS because [specific evidence]."

---

## Pre-Flight

### Step 1: Build Gate
```bash
cd /path/to/kbl-tracker && npm run build
```
If it fails, STOP. Report errors.

### Step 2: Read Spec (full)
Read `spec-docs/ELIMINATION_MODE_SPEC.md` sections 1-14 completely.
Read `spec-docs/v1-simplification/MODE_2_V1_FINAL.md` §3.1-§3.7 completely.

For each section, extract the exact spec quotes you'll compare code against. Store them — you'll reference them in every check.

### Step 3: File Existence Audit
For EACH file below, verify it exists AND record its line count:

```
REQUIRED FILES:
- src/App.tsx
- src/src_figma/app/pages/AppHome.tsx
- src/src_figma/app/pages/EliminationSelector.tsx
- src/src_figma/app/pages/EliminationSetup.tsx
- src/src_figma/app/pages/EliminationHome.tsx
- src/src_figma/app/pages/GameTracker.tsx
- src/src_figma/app/pages/PostGameSummary.tsx
- src/src_figma/app/components/EliminationTeamHub.tsx
- src/src_figma/app/components/EnhancedInteractiveField.tsx
- src/src_figma/app/components/QuickBar.tsx
- src/src_figma/app/components/FenwayBoard.tsx
- src/src_figma/app/components/PlayLogPanel.tsx
- src/src_figma/app/components/LineupCard.tsx
- src/src_figma/app/components/RunnerPopover.tsx
- src/src_figma/app/components/FielderPopover.tsx
- src/src_figma/app/components/MiniScoreboard.tsx
- src/src_figma/hooks/useGameState.ts
- src/src_figma/app/hooks/usePlayerState.ts
- src/utils/eliminationManager.ts
- src/utils/eliminationRosterStorage.ts
- src/utils/playoffStorage.ts
- src/utils/trackerDb.ts
- src/utils/processCompletedGame.ts
- src/utils/gameStorage.ts
- src/utils/eventLog.ts

OPTIONAL FILES (may or may not exist):
- src/utils/mojoFitnessStorage.ts
- src/utils/eliminationAwards.ts
```

### Step 4: Proof-of-Life
Run this script and include output in report:
```bash
node -e "
const fs = require('fs');
const required = [
  'src/utils/eliminationManager.ts',
  'src/utils/eliminationRosterStorage.ts',
  'src/utils/playoffStorage.ts',
  'src/utils/trackerDb.ts',
  'src/src_figma/app/pages/EliminationHome.tsx',
  'src/src_figma/app/pages/EliminationSetup.tsx',
  'src/src_figma/app/pages/EliminationSelector.tsx',
  'src/src_figma/app/components/EliminationTeamHub.tsx',
];
const optional = ['src/utils/mojoFitnessStorage.ts', 'src/utils/eliminationAwards.ts'];
required.forEach(f => {
  const ex = fs.existsSync(f);
  const lines = ex ? fs.readFileSync(f,'utf8').split('\n').length : 0;
  console.log(ex ? 'OK' : 'MISSING', f, ex ? lines+'L' : '');
});
optional.forEach(f => {
  console.log(fs.existsSync(f) ? 'OK' : 'NOT_IMPL', f);
});
"
```

---

## LAYER A: Static Wiring Checks (Sections 1-13)

[Full content of all 13 sections with 74+ checks — see above for complete specification]

### Section A-1: Entry Point & Routes (6 checks)
### Section A-2: Storage — No New Databases (5 checks)
### Section A-3: EliminationSelector (4 checks)
### Section A-4: EliminationSetup "Start Playoffs" (7 checks)
### Section A-5: Roster Snapshots (5 checks)
### Section A-6: EliminationHome (15 checks)
### Section A-7: EliminationTeamHub (7 checks)
### Section A-8: GameTracker Mode Checks (7 checks)
### Section A-9: Game Completion Pipeline (6 checks)
### Section A-10: Mojo/Fitness Persistence (7 checks)
### Section A-11: PostGameSummary Return Nav (5 checks)
### Section A-12: Awards (5 checks)
### Section A-13: Pitfall Compliance (10 checks)

---

## LAYER B: Interaction Chain Verification (Section 14)

### B-14.1: Tap [K] on QuickBar → Game State Updates
### B-14.2: Tap [1B] on QuickBar → Runner Advances
### B-14.3: Tap [HR] on QuickBar → All Runners Score
### B-14.4: Record 3 Outs → Inning Flips
### B-14.5: Tap Runner on Diamond → Popover Appears
### B-14.6: Tap Fielder on Diamond → Substitution Flow
### B-14.7: Pitching Change Flow
### B-14.8: End Game Flow
### B-14.9: ActionSelector (HIT/OUT/OTHER) Still Rendering?
### B-14.10: QuickBar Button Inventory
### B-14.11: LineupCard Accessibility
### B-14.12: Play Log — Kc Toggle
### B-14.13: Diamond Proportions
### B-14.14: FenwayBoard Content

---

## LAYER C: End-to-End Journey Tests (Playwright)

### Journey E-1: Create Elimination Bracket
### Journey E-2: Play One Elimination Game
### Journey E-3: Verify Stats Flow to Leaders Tab
### Journey E-4: Complete a Series
### Journey E-5: Team Hub Lineup Edit

---

## Anti-Hallucination Enforcement

1. If you marked a check PASS without pasting evidence → go back, add evidence or change to FAIL
2. If you used the phrase "looks correct" or "appears to work" → rewrite with specific evidence
3. If you traced an interaction chain but skipped a link → the chain is FAIL
4. If a Playwright test timed out or threw an unexpected error → that's a FAIL, not "needs investigation"
5. If you're unsure whether something works → it's FAIL until proven PASS. The burden of proof is on PASS.

## Final Integrity Check

Before submitting the report, answer these questions:
1. Did I paste actual code for every PASS? (If no → go fix)
2. Did I trace every interaction chain link-by-link? (If no → go fix)
3. Did I run the Playwright tests, or did I skip them? (If skipped → mark NOT_EXECUTED)
4. Would a human developer reviewing my report trust every conclusion? (If no → go fix)
5. If JK opens the app and tries exactly what I said PASSES, will it actually work? (If uncertain → change to FAIL)
