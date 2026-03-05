---
name: safe-fix-protocol
description: Disciplined single-bug fix workflow that prevents hallucinated fixes, regressions, and unfounded FIXED claims. Use for any GameTracker or franchise bug fix where code is complex or regression risk is non-trivial. Enforces 8 mandatory gates — reproduce, understand, propose, implement, verify, rollback — with explicit STOP points at every failure.
---

# SAFE FIX PROTOCOL

## Purpose
Disciplined single-bug fix workflow that prevents hallucinated fixes, 
regressions, and unfounded "FIXED" claims. Use for any bug fix where 
the code is complex or the risk of regression is non-trivial.

## When to Use
- Any GameTracker bug fix (state machines, event flows, multi-step interactions)
- Any bug where changing one system could break another
- Any fix that touches code you haven't read yet
- Any time a batch prompt says "Read the safe-fix-protocol skill"

## The Protocol

Every bug fix follows these 8 gates in order. You CANNOT skip a gate. 
If any gate fails, you MUST revert and report — do NOT fix forward.

### GATE 1: BASELINE
Before touching any code:
```bash
git status                    # Must be clean
git diff --stat               # Must show 0 changes
npm run build && npm test     # Record exact test count
```
Record:
- BASELINE_TESTS: [count]
- BASELINE_BUILD: PASS

Start dev server. Open Playwright. Capture console errors.
- BASELINE_ERRORS: [list or "none beyond React dev warnings"]

### GATE 2: REPRODUCE
Attempt to reproduce the bug in Playwright. Document EXACTLY what you did 
and what you observed. Take screenshots if possible.

Possible outcomes:
- **REPRODUCED**: Describe what you saw. Proceed to Gate 3.
- **CANNOT REPRODUCE**: The bug may already be fixed or may require specific 
  conditions you can't trigger. Report what you tried. **STOP. Do not fix 
  what you cannot see broken.**
- **PARTIALLY REPRODUCED**: Describe what part you saw. Proceed, but scope 
  your fix ONLY to the part you confirmed.

### GATE 3: UNDERSTAND
Read ALL relevant code before proposing any change.

Required actions:
1. Find the relevant functions using grep. Paste ALL output.
2. Read each function body FULLY. Paste them.
3. Answer these questions IN WRITING:
   - What is the current behavior? (describe from code, not guessing)
   - What is the root cause? (specific line/logic, not "it's broken")
   - What other systems read from or write to the same state?
   - What could break if you change this?

You must be able to explain the bug to a human before you can fix it.
If you cannot identify the root cause after reading the code, say 
"ROOT CAUSE UNCLEAR" and describe what you found. Ask for guidance.

### GATE 4: PROPOSE
State your fix in plain English BEFORE writing any code:

"I will change [function] in [file] to [do what] because [root cause]. 
This touches [N] files. Other systems that could be affected: [list]. 
My fix should NOT change behavior for: [list unaffected scenarios]."

If the fix requires >50 lines of new logic, flag it:
"This is a LARGE fix. Confidence: HIGH/MEDIUM/LOW. Risk areas: [list]."

### GATE 5: IMPLEMENT
Now write the code. After implementing:
1. Paste the changed code (not just "I changed line X")
2. For each changed function, verify it still handles all existing 
   callers correctly

### GATE 6: BUILD + TESTS
```bash
npm run build        # Must pass. If FAIL → revert, report.
npm test             # Must match BASELINE_TESTS or higher. 
                     # If new failures → revert, report.
```

If build or tests fail:
```bash
git checkout -- .    # Revert ALL changes
```
Report: "BUILD/TEST FAILED after fix. Reverted. Error: [paste error]"
**STOP. Do not attempt to fix the test failure. Report and wait.**

### GATE 7: RUNTIME VERIFY
In Playwright:
1. Reproduce the SAME steps from Gate 2
2. Is the bug fixed? Describe what you see now.
3. Capture console errors. Compare to BASELINE_ERRORS.

Possible outcomes:
- **FIXED**: Bug no longer reproduces. No new console errors. Proceed.
- **NOT FIXED**: Bug still reproduces. Revert, report what happened.
- **FIXED BUT NEW ERRORS**: Assess severity. If errors indicate broken 
  functionality, revert. If benign warnings, note and proceed.

If not fixed:
```bash
git checkout -- .    # Revert
```
Report: "Fix did not resolve bug at runtime. Reverted. 
What I expected: [X]. What happened: [Y]."
**STOP.**

### GATE 8: REGRESSION CHECK
While still in Playwright, verify that NOTHING ELSE broke:
1. Play through at least 1 full at-bat cycle (pitch → outcome → next batter)
2. Verify half-inning transitions still work
3. Verify any fixes from previous phases still work
4. Check: League Leaders real names? Standings update? Schedule advance?

If ANY regression:
```bash
git checkout -- .    # Revert
```
Report: "Fix caused regression: [what broke]. Reverted."
**STOP.**

### COMMIT
Only after ALL 8 gates pass:
```bash
git add -u && git commit -m "[Bug ID]: [Brief description] — [root cause]"
```

Report format:
```
[Bug ID] COMPLETE

Gate 1 (Baseline): BASELINE_TESTS=[count], BASELINE_BUILD=PASS
Gate 2 (Reproduce): REPRODUCED — [what you saw]
Gate 3 (Understand): Root cause = [specific cause at file:line]
Gate 4 (Propose): [1-sentence fix description]
Gate 5 (Implement): [files changed, lines changed]
Gate 6 (Build+Tests): PASS — [test count], 0 failures
Gate 7 (Runtime): FIXED — [what you see now]
Gate 8 (Regression): NO REGRESSIONS
Commit: [hash]
```

## Rollback Rules

These are NON-NEGOTIABLE:

1. **Build fails after fix** → revert immediately, report, stop
2. **New test failures** → revert immediately, report, stop
3. **Bug not fixed at runtime** → revert immediately, report, stop
4. **New console errors indicating broken functionality** → revert, report, stop
5. **Any regression in previous fixes** → revert, report, stop
6. **Cannot identify root cause** → do not attempt fix, report, ask for guidance

NEVER fix forward. NEVER suppress a failing test. NEVER commit code 
that didn't pass all 8 gates.

## Anti-Hallucination Rules

1. **Do NOT claim a bug is fixed based on code reading alone.** 
   You must verify in Playwright.
2. **Do NOT invent line numbers.** Use grep output.
3. **Do NOT assume what code does from function names.** Read the body.
4. **Do NOT claim "CANNOT REPRODUCE" after one attempt.** 
   Try at least 2 different approaches before giving up.
5. **Do NOT fix a different bug than the one you're assigned.** 
   If you discover a new bug, note it and move on.
6. **Do NOT combine fixes.** One bug per commit, even if you see 
   another bug in the same function.
