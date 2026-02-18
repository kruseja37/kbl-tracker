# KBL TRACKER — PROMPT CONTRACTS
# Created: 2026-02-17
# Standard templates for all Codex prompts. Never deviate from this format.

---

## Why Prompt Contracts Matter

Vague prompts produce vague results. Every Codex prompt must:
- Define a single, scoped role
- Reference the exact source of truth
- List exact files to touch AND files to avoid
- Define what "done" looks like before Codex starts
- Include hard stops for ambiguity

A prompt without these elements will produce code that looks right and breaks something else.

---

## THE MASTER TEMPLATE

```
You are [Specific Role, e.g., "the GameTracker Reducer Migration Specialist"].

GOAL:
[One sentence describing exactly what needs to be done. No more.]

SOURCE OF TRUTH:
[Exact file path(s) or FINDING-NNN from AUDIT_LOG.md that defines correct behavior]
Quote the relevant section or finding verbatim if it affects your changes.

CONSTRAINTS:
- Only edit these files: [list exact paths, one per line]
- Do NOT touch: [list exact paths, one per line]
- Do NOT add new dependencies
- Do NOT rename existing functions or types
- Do NOT change behavior beyond the stated goal
- Work directly on main branch (no new branches or worktrees)
- Reference the exact FINDING-NNN or spec ID for every change you make

EXPECTED OUTPUT:
[Describe exactly what the code should look like or do after this change.
Be specific: function signatures, state shape, guard conditions, etc.]

VERIFICATION:
Run these exact commands and paste the output:
1. [e.g., npm run build]
2. [e.g., grep -n "isRehydrated" src/src_figma/hooks/useGamePersistence.ts]
3. [e.g., npx vitest run src/src_figma/__tests__/gameTracker/AtBatFlow.test.tsx]

FORMAT — Your response must contain exactly these sections:
1. FILES CHANGED: [list exact paths]
2. CHANGES MADE: [describe each change, reference FINDING-NNN or spec ID]
3. VERIFICATION OUTPUT: [paste exact command output]
4. STATUS: "[Task name] complete" OR "BLOCKED: [exact reason and what you need]"

FAILURE PROTOCOL:
- If anything is ambiguous → quote the exact ambiguous section and stop
- If you cannot open a file → stop and report the exact filename
- If a required change is in a file not listed in CONSTRAINTS → stop and report
- If tests fail after your change → stop, report which tests, paste the failure output
- Never summarize changes — describe each one specifically
- Never batch unrelated changes into one response
- Never assume intent — ask

Use HIGH reasoning effort. Think step-by-step before writing any code.
```

---

## EXAMPLE CONTRACTS (Reference These When Building New Ones)

### Example 1: Targeted Bug Fix

```
You are the GameTracker Rehydration Bug Fixer.

GOAL:
Remove the stale autosave debounce in useGameState.ts and replace it with a
hook-local timer that is cancelled on unmount and on end-game, per FINDING-007.

SOURCE OF TRUTH:
spec-docs/AUDIT_LOG.md → FINDING-007
Quote: "Shared debounce persists across game boundaries; hook-local timer with
cancellation required at init, load, unmount, and end-game."

CONSTRAINTS:
- Only edit these files:
  src/src_figma/hooks/useGameState.ts
- Do NOT touch:
  src/components/GameTracker/index.tsx
  src/src_figma/app/pages/GameTrackerPage.tsx
  src/utils/trackerDb.ts
- Do NOT add new dependencies
- Do NOT rename saveCurrentGame or loadCurrentGame
- Reference FINDING-007 in a code comment at the changed lines

EXPECTED OUTPUT:
- The shared debounce import is removed
- A useRef<NodeJS.Timeout | null> holds the local timer
- The timer is cleared in: component init, game load, component unmount, end-game handler
- saveCurrentGame is called directly (not via debounce) when the timer fires
- No other behavior changes

VERIFICATION:
1. npm run build
2. grep -n "debounce\|clearTimeout\|timerRef" src/src_figma/hooks/useGameState.ts
3. npx vitest run src/src_figma/__tests__/gameTracker/AtBatFlow.test.tsx

FORMAT:
1. FILES CHANGED
2. CHANGES MADE (reference FINDING-007)
3. VERIFICATION OUTPUT
4. STATUS

FAILURE PROTOCOL: [standard]

Use HIGH reasoning effort. Think step-by-step.
```

---

### Example 2: Refactor (Modal Dumbing — Phase A)

```
You are the DefensiveSubModal Refactor Specialist.

GOAL:
Refactor DefensiveSubModal.tsx so it contains zero lineup calculation logic —
it only collects user intent and dispatches a DEFENSIVE_SUBSTITUTION action
to the GameTracker reducer, per FINDING-023.

SOURCE OF TRUTH:
spec-docs/AUDIT_LOG.md → FINDING-023
spec-docs/AUDIT_PLAN.md → Phase A: Modal Dumbing

CONSTRAINTS:
- Only edit these files:
  src/src_figma/app/components/DefensiveSubModal.tsx
- Do NOT touch:
  src/components/GameTracker/index.tsx (reducer lives here — do not modify)
  src/src_figma/hooks/useGameState.ts
- The DEFENSIVE_SUBSTITUTION action type must already exist in the reducer
  before this change. If it does not exist, STOP and report.
- Do NOT add new state to the modal
- Do NOT change the modal's visual design or prop interface

EXPECTED OUTPUT:
- Modal receives current lineup as props (read-only)
- Modal renders player picker UI (no changes here)
- On confirm: dispatches { type: 'DEFENSIVE_SUBSTITUTION', payload: { inPlayer, outPlayer, position } }
- All lineup validity logic (e.g., duplicate position checks) is removed from modal
  and will live in the reducer's DEFENSIVE_SUBSTITUTION handler

VERIFICATION:
1. npm run build
2. grep -n "useState\|useEffect\|calculate\|filter\|sort" src/src_figma/app/components/DefensiveSubModal.tsx
   (expect: zero or near-zero hits — modal should be a pure picker)
3. grep -n "dispatch" src/src_figma/app/components/DefensiveSubModal.tsx
   (expect: exactly one dispatch call on confirm)

FORMAT: [standard]
FAILURE PROTOCOL: [standard]

Use HIGH reasoning effort. Think step-by-step.
```

---

### Example 3: New File Creation

```
You are the Fame Engine Architect.

GOAL:
Create src/components/GameTracker/fameEngine.ts — a pure, stateless module
containing all fame event auto-detection logic (no-hitters, cycles, clutch hits,
immaculate innings), extracted from GameTracker.tsx, per FINDING-031.

SOURCE OF TRUTH:
spec-docs/AUDIT_LOG.md → FINDING-031
spec-docs/AUDIT_PLAN.md → Phase B: The Fame & Mojo Engine
src/src_figma/hooks/useFameDetection.ts → existing detection logic to port

CONSTRAINTS:
- Create only this new file:
  src/components/GameTracker/fameEngine.ts
- Do NOT modify any existing files in this prompt
  (wiring fameEngine into the reducer is a separate prompt)
- All functions must be pure (no React imports, no useState, no side effects)
- Function signatures must accept GameState and return FameEvent[] or null
- Export each detector as a named function

EXPECTED OUTPUT:
- detectNoHitter(state: GameState): FameEvent | null
- detectCycle(state: GameState, batterId: string): FameEvent | null
- detectImmaculateInning(state: GameState): FameEvent | null
- detectClutchHit(state: GameState, atBat: AtBatResult): FameEvent | null
- All existing logic from useFameDetection.ts ported faithfully (no behavior changes)

VERIFICATION:
1. npm run build
2. grep -n "useState\|useEffect\|import.*React" src/components/GameTracker/fameEngine.ts
   (expect: zero hits — must be pure)
3. npx vitest run src/__tests__/fameEngine.test.ts
   (if test file doesn't exist yet, report that — test creation is a separate task)

FORMAT: [standard]
FAILURE PROTOCOL: [standard]

Use HIGH reasoning effort. Think step-by-step.
```

---

## PROMPT QUALITY CHECKLIST

Before sending any prompt to Codex, verify:

- [ ] Role is specific (not "a developer" — "the X Fixer" or "X Specialist")
- [ ] Goal is one sentence
- [ ] Source of truth references a real file or FINDING-NNN
- [ ] Files to touch are listed explicitly
- [ ] Files NOT to touch are listed explicitly
- [ ] Expected output is specific enough to verify against
- [ ] Verification commands are exact and runnable
- [ ] Failure protocol is included
- [ ] "High reasoning effort. Think step-by-step." is at the end

If any checkbox is empty → rewrite the prompt before sending.
