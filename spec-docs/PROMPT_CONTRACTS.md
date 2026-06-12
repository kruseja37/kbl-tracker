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


---

## PROMPT CONTRACT: FINDING-100 — Remove Legacy Field Toggle
**Date:** 2026-02-18 | **Route:** Claude Code CLI | sonnet | standard effort

---

You are a careful dead-code removal specialist.

GOAL:
Remove the Legacy InteractiveField toggle and its entire dead branch from GameTracker.tsx,
delete the handlePlayComplete stub, and archive DragDropGameTracker.tsx.
No logic changes. No behavior changes to the Enhanced field path. Deletion only.

SOURCE OF TRUTH:
FINDING-100 in spec-docs/FINDINGS/FINDINGS_056_onwards.md

CONSTRAINTS:
- Only edit these files:
    src/src_figma/app/pages/GameTracker.tsx
- Only move/delete this file:
    src/src_figma/app/components/DragDropGameTracker.tsx
      → move to: src/archived-components/DragDropGameTracker.tsx
- Do NOT touch:
    src/src_figma/app/components/EnhancedInteractiveField.tsx
    src/src_figma/app/components/FieldCanvas.tsx
    src/src_figma/hooks/useGameState.ts
    Any other file
- Work directly on main branch

CHANGES REQUIRED (in order):

1. In GameTracker.tsx — remove the import:
   import { InteractiveField } from "@/app/components/DragDropGameTracker";
   Delete this line entirely.

2. In GameTracker.tsx — remove the useState:
   const [useEnhancedField, setUseEnhancedField] = useState(...)
   Delete this line entirely.

3. In GameTracker.tsx — remove the toggle button from JSX:
   Find the button element that calls setUseEnhancedField(!useEnhancedField)
   and renders "ENHANCED FIELD ✓" / "LEGACY FIELD" text.
   Delete the entire button element and any wrapping div that exists solely
   to contain it.

4. In GameTracker.tsx — collapse the conditional field render:
   The JSX currently reads:
     {useEnhancedField ? ( <Enhanced branch> ) : ( <Legacy branch> )}
   Replace the entire ternary expression with ONLY the Enhanced branch content
   (the first branch), unwrapped from the ternary.
   Delete the legacy SVG field and InteractiveField JSX entirely.
   Preserve the outer div structure exactly.

5. In GameTracker.tsx — remove the dead handlePlayComplete stub:
   const handlePlayComplete = (playData: any) => {
     console.log("Play complete:", playData);
     // Update game state based on play data
     // This would update bases, outs, scores, etc.
   };
   Delete the entire function.

6. Move DragDropGameTracker.tsx to archive:
   git mv src/src_figma/app/components/DragDropGameTracker.tsx \
          src/archived-components/DragDropGameTracker.tsx

EXPECTED OUTPUT:
- GameTracker.tsx has no reference to useEnhancedField, InteractiveField,
  handlePlayComplete, or DragDropGameTracker anywhere
- EnhancedInteractiveField renders unconditionally
- DragDropGameTracker.tsx exists only in archived-components/

VERIFICATION:
1. npm run build   — must pass with 0 errors
2. grep -n "useEnhancedField\|handlePlayComplete\|DragDropGameTracker\|InteractiveField" \
       src/src_figma/app/pages/GameTracker.tsx
   — must return NO OUTPUT
3. ls src/archived-components/DragDropGameTracker.tsx   — must exist

FORMAT:
1. Files changed (list exact paths)
2. Changes made (describe each, reference FINDING-100)
3. Verification result (paste exact output of all 3 commands)
4. "FINDING-100 complete" OR "BLOCKED: [exact reason]"

FAILURE PROTOCOL:
- If anything is ambiguous → quote the exact section and stop
- If a change would require touching a file not listed → STOP and report
- If build fails → git checkout -- . to revert, then report the error
- Never summarize or batch changes
- Never assume intent — ask

Use high reasoning effort. Think step-by-step. This is deletion only — do not add anything.


---

## PROMPT CONTRACT: FINDING-101 — Fix Fan Morale Method Name + Season Wiring
**Date:** 2026-02-18 | **Route:** Codex | 5.1 mini | medium effort

---

You are a careful bug-fix specialist.

GOAL:
Fix two bugs in how GameTracker.tsx calls the fan morale hook at end-game:
Bug A — wrong method name (processGameResult → recordGameResult)
Bug B — hardcoded season/game numbers ({ season: 1, game: 1 } → real values)

SOURCE OF TRUTH:
FINDING-101 in spec-docs/FINDINGS/FINDINGS_056_onwards.md

CONSTRAINTS:
- Only edit this file:
    src/src_figma/app/pages/GameTracker.tsx
- Do NOT touch:
    src/hooks/useFanMorale.ts
    src/engines/fanMoraleEngine.ts
    Any other file
- Work directly on main branch

CHANGES REQUIRED:

1. Find these two call sites (lines ~2138 and ~2152):
     homeFanMorale.processGameResult(homeResult, { season: 1, game: 1 }, ...)
     awayFanMorale.processGameResult(awayResult, { season: 1, game: 1 }, ...)

   Rename processGameResult → recordGameResult on both call sites.

   Note: recordGameResult takes only ONE argument: (result: GameResult)
   The current calls pass 3 arguments. The hook signature is:
     recordGameResult: (result: GameResult) => void
   Drop the second argument ({ season: 1, game: 1 }) and third argument
   (the rival team name string) — they are not part of the hook interface.

2. The GameResult object (homeResult / awayResult) already has a gameId field.
   No changes needed to the result objects themselves.

EXPECTED OUTPUT:
- Both call sites use recordGameResult with a single argument
- No other changes to GameTracker.tsx

VERIFICATION:
1. npm run build — must pass with 0 new errors
2. grep -n "processGameResult" src/src_figma/app/pages/GameTracker.tsx
   — must return NO OUTPUT
3. grep -n "recordGameResult" src/src_figma/app/pages/GameTracker.tsx
   — must show exactly 2 lines

FORMAT:
1. Files changed (list exact paths)
2. Changes made (describe each, reference FINDING-101)
3. Verification result (paste exact output of all 3 commands)
4. "FINDING-101 complete" OR "BLOCKED: [exact reason]"

FAILURE PROTOCOL:
- If the hook signature differs from what is described above → quote what you see and STOP
- If build fails → git checkout -- . to revert, then report the error
- Never touch useFanMorale.ts or fanMoraleEngine.ts

Use high reasoning effort. Two-line fix. Do not change anything else.


---

## PROMPT CONTRACT: T1 — IV Curve & Trait Pricing Data Extraction
**Date:** 2026-06-09 | **Route:** Claude Code CLI | Fable 5 | high reasoning effort
**Spec:** spec-docs/IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §3, §13 (T1)

---

You are the IV Curve Data Extraction Specialist.

GOAL:
Extract the complete salary-curve parameter tables, trait rating-equivalents, pitch/arsenal
pricing, and auxiliary pricing from the XBL workbook into two typed TypeScript data files —
data only, zero logic.

SOURCE OF TRUTH:
spec-docs/reference/Team_Builder_Archetype_Logic_Template.xlsx (committed 64da95b)
spec-docs/IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §3.2–§3.6 (schema + verified samples)
Key facts from the spec you must honor:
- Position→row mapping (Lists!AN2:AO19): C→5, 1B→11, 2B→17, SS→23, 3B→29, LF→35, CF→41,
  RF→47, IF→53, OF→59, IF/OF→65, "-"→71, SP→77, SP/RP→85, RP→93, CP→101, 1B/OF→109, EXTRA→117
- Each position block on the "Salary Cap" sheet: hitters carry 5 attribute rows
  (POW/CON/SPD/FLD/ARM), pitchers carry 7 (POW/CON/SPD/FLD/VEL/JNK/ACC)
- Columns C–H per attribute row = primary curve {min, curve1, mid, midSal, curve2, sal100}
- Columns I–N per attribute row = SUB-MINIMUM REVERSE curve params (pitchers) — extract these
  too; they are a P1 fidelity requirement per spec §3.4
- "Traits" sheet = trait rating-equivalents (L2 values) + chemistry type + flat fees
- PitchCalcs / LeagueSettings = pitch type costs, bullpen arsenal tax table, aux pricing
  (switch hitter, secondary positions, arm angle)

CONSTRAINTS:
- Create only these new files:
    src/data/ivCurves.ts
    src/data/traitPricing.ts
    scripts/extract-iv-data.py        (the extraction script — committed for reproducibility)
- Do NOT touch:
    src/engines/** (engine implementation is T4, a separate prompt)
    src/data/rosterEngineConstants.ts (does not exist yet; created in T6)
    Any existing salary system files
- Do NOT add npm dependencies. Python openpyxl for extraction is fine (script only).
- Data files must contain ONLY typed constants — no functions, no React, no computation.
- Use the AttributeCurve interface shape from spec §3.2 verbatim.
- Extraction must be SCRIPT-DRIVEN from the workbook, not hand-transcribed. The spec's
  §3.3/§3.6 tables are verification anchors, not the source — read the workbook itself.

SPECIFIC REQUIRED CHECKS:
1. Verify the four trait-table blank cells flagged "·" in spec §3.6 (e.g., Bad Jumps POW,
   Big Hack CON, Little Hack POW, Crossed Up POW, Rally Stopper hitter cols, Easy Target
   pitcher cols, Two Way variants, Wild Thrower ACC, Metal Head POW/CON, Elite-pitch
   VEL/JNK/ACC cols). For each: report whether the source cell is truly empty (→ 0) or
   contains a value the earlier extraction missed. List every resolution in your response.
2. Confirm C-position curve params match spec §3.3 exactly (POW 0/1/50/8000/1.5/56000 etc.).
   Any mismatch → STOP and report; do not "correct" the spec silently.
3. Count check: 18 position blocks extracted; hitter blocks have 5 attribute entries,
   pitcher blocks 7; every pitcher attribute has both primary AND sub-min curve params
   (sub-min may be null/absent for some attributes — record what the workbook actually has,
   do not invent).

EXPECTED OUTPUT:
- src/data/ivCurves.ts: exported `IV_CURVES: Record<PositionKey, PositionCurveBlock>` where
  PositionCurveBlock = { attributes: Record<Attr, { primary: AttributeCurve;
  subMin?: AttributeCurve }> }; plus POSITION_ROW_MAP as a documented comment.
- src/data/traitPricing.ts: exported `TRAIT_PRICING: TraitPricingEntry[]` (name, chemistry,
  polarity, per-attribute deltas, flatFee), plus PITCH_COSTS, ARSENAL_TAX_TABLE,
  AUX_PRICING (switch/secondary-position/arm-angle), each as typed constants.
- scripts/extract-iv-data.py: rerunnable; regenerates both files deterministically from
  the workbook path.
- A header comment in both .ts files: source workbook path, extraction date, script name,
  spec section references.

VERIFICATION:
Run these exact commands and paste the output:
1. python3 scripts/extract-iv-data.py && git diff --stat src/data/
   (second run must produce no diff — determinism check)
2. npm run build  (or npx tsc --noEmit if data files aren't yet imported anywhere)
3. node -e "const c=require('./src/data/ivCurves.ts')" — if ESM/TS prevents this, instead:
   npx tsx -e "import {IV_CURVES} from './src/data/ivCurves'; console.log(Object.keys(IV_CURVES).length, IV_CURVES.C.attributes.POW.primary)"
   (expect: 18, and {min:0,curve1:1,mid:50,midSal:8000,curve2:1.5,sal100:56000})
4. npx tsx -e "import {TRAIT_PRICING} from './src/data/traitPricing'; console.log(TRAIT_PRICING.length)"
   (expect: ~75; report exact count)

FORMAT — Your response must contain exactly these sections:
1. FILES CHANGED
2. CHANGES MADE (reference spec §3.2–§3.6; include the blank-cell resolution list from
   SPECIFIC REQUIRED CHECKS #1)
3. VERIFICATION OUTPUT (paste exact output of all 4 commands)
4. STATUS: "T1 complete" OR "BLOCKED: [exact reason and what you need]"

FAILURE PROTOCOL:
- If the workbook structure differs from the spec's described layout → quote what you see
  (sheet, cell range) and STOP
- If C-position verification anchors mismatch → STOP, report both values
- If any required change is outside the three listed files → STOP and report
- Never summarize — list every position block and trait extracted (counts + spot samples)
- Never assume intent — ask

Use high reasoning effort. Think step-by-step. Data fidelity is the entire job —
a wrong curve parameter silently corrupts every salary in the app.


---

## PROMPT CONTRACT: T1-AUDIT — Independent Audit of IV Data Extraction
**Date:** 2026-06-10 | **Route:** Codex 5.5 | high reasoning effort
**Spec:** spec-docs/IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §3.2–§3.6, §13 audit gate
**Builder:** Fable 5 CLI (T1). You are the independent auditor — different model family by design.

---

You are the T1 Extraction Auditor.

GOAL:
Independently verify that src/data/ivCurves.ts and src/data/traitPricing.ts are a faithful,
deterministic, logic-free extraction of the XBL workbook, WITHOUT trusting the builder's
report. Evidence = the workbook, the files, and commands you run yourself.

AUDIT PRINCIPLE (non-negotiable):
The builder's session report is a CLAIM, not evidence. Do not grade it. Re-derive every
verdict from primary sources: the workbook at
spec-docs/reference/Team_Builder_Archetype_Logic_Template.xlsx, the three files under audit,
and the spec. Where your findings disagree with the builder's claims, report the disagreement —
do not reconcile silently in either direction.

FILES UNDER AUDIT (read-only — you change NOTHING in this task):
  src/data/ivCurves.ts
  src/data/traitPricing.ts
  scripts/extract-iv-data.py

CONSTRAINTS:
- Modify NO files. This is a read-and-execute audit. You may write throwaway scripts to
  /tmp only.
- Do NOT "fix" anything you find — findings go in the report; fixes are a separate
  builder ticket.
- python3 + openpyxl for workbook reads is expected.

AUDIT CHECKLIST (execute every item; paste command output as evidence):

A. SCOPE INTEGRITY
A1. git status --porcelain — confirm the only NEW files are the three under audit.
    Pre-existing modified spec-docs (PROMPT_CONTRACTS.md, SPECIAL_EVENTS_SPEC.md,
    TRAIT_INTEGRATION_SPEC.md) are expected and out of scope.
A2. grep -n "function\|=>\|import React\|useState" src/data/ivCurves.ts src/data/traitPricing.ts
    — expect zero logic (type/interface declarations and const exports only).

B. DETERMINISM & BUILD
B1. shasum src/data/ivCurves.ts src/data/traitPricing.ts && python3 scripts/extract-iv-data.py
    && shasum src/data/ivCurves.ts src/data/traitPricing.ts — hashes must be identical
    before/after rerun.
B2. npm run build — exit 0.

C. WORKBOOK FIDELITY — independent random sampling (the heart of this audit)
C1. Write your own /tmp spot-check script (do NOT reuse scripts/extract-iv-data.py logic —
    independent read path). From the "Salary Cap" sheet, sample AT MINIMUM:
    - All 5 C-position attribute rows (rows 5–9, cols C–H) vs IV_CURVES.C — must also match
      spec §3.3 anchors (POW 0/1/50/8000/1.5/56000, CON, SPD, FLD, ARM).
    - 10 RANDOM (position, attribute) pairs you choose across other blocks, incl. at least
      2 pitcher blocks and the EXTRA block, vs the .ts values.
    - Sub-min claim: verify cols I–N carry curve params ONLY on the VEL rows of SP/SP-RP/RP/CP
      ("Below Midpoint Velo"), and that ivCurves.ts has subMin exactly there and nowhere else.
      Spot-verify SP subMin {0,1.2,30,7500,1.3,18000} against the source cells.
    - EXTRA block shape: confirm from the workbook it is pitcher-shaped (7 attr rows incl.
      VEL/JNK/ACC) as the .ts records.
C2. Traits sheet: confirm exactly 75 trait rows (A3:U77). Sample 8 random traits' delta
    columns vs TRAIT_PRICING entries, plus these specific high-value checks:
    - Cannon Arm ARM=+45; Workhorse VEL/JNK/ACC=14/14/14 flat 2000
    - MULTIPLIER COLUMNS (L–S): independently read Elite 4F (expect VEL×1.9, ACC×1.1,
      flat 22000), Reverse Splits (×1.45/×1.4/×1.4), Specialist (×1.3/×1.4/×1.3),
      Rally Stopper (VEL×1.15) — confirm the .ts multipliers match the source. This was the
      builder's headline discovery; verify it is real and complete (scan ALL 75 rows' L–S for
      any non-1 multiplier the .ts might have missed).
    - BLANK-CELL RESOLUTIONS: independently confirm 6 of the flagged cells are truly empty
      in the source (your choice, e.g. Bad Jumps C5, Big Hack D9, Metal Head C47/D47,
      Rally Stopper C57, Wild Thrower J76).
C3. PITCH_COSTS (Traits rows 81–88): 8 pitch types, flat 500 each, spot-check 4F and SB
    multipliers. ARSENAL_TAX_TABLE vs LeagueSettings!A47:B59 (13 rows, 8→−12000 … 20→+24000).
    AUX_PRICING: switch +5/+5; spot-check 3 secondary positions; Sub arm angle flat 4000
    + VEL×1.075/JNK×1.2.

D. TEST-SUITE CLAIM
D1. npx vitest run (or project test command) — record pass/fail counts. The builder claims
    4 pre-existing failures (wpaRuntimeBoundary, franchiseNarrativeEventEligibility,
    franchiseManualSmokeFixture, franchiseOffseasonGuards) unrelated to T1. Verify
    unrelatedness cheaply: git stash -u (stashing the three new files), rerun ONLY those 4
    test files, git stash pop. Same failures without the files = claim confirmed.

E. SPEC CONFORMANCE
E1. AttributeCurve interface verbatim vs spec §3.2; IV_CURVES covers all 18 POSITION_ROW_MAP
    keys; TRAIT_PRICING field shape covers name/chemistry/polarity/deltas/flatFee (+
    multipliers — an addition beyond contract minimum; assess whether it is spec-grounded
    per §3.5's "multiplier terms (attrCost × mult − attrCost)" or scope creep).
E2. File header comments present: source path, date, script name, spec refs.

FORMAT — Your response must contain exactly these sections:
1. EVIDENCE LOG: per checklist item (A1…E2): command(s) run + pasted output + PASS/FAIL
2. DISAGREEMENTS WITH BUILDER REPORT: any finding where your evidence contradicts the
   builder's claims (or "none")
3. FINDINGS REQUIRING ACTION: anything wrong/missing, each with severity
   (BLOCKER / MAJOR / MINOR) and the exact cell/line evidence
4. VERDICT: "T1 AUDIT: CONFORMS — ready for JK sign-off" OR
   "T1 AUDIT: DEVIATIONS — [count] findings above" OR "BLOCKED: [exact reason]"

FAILURE PROTOCOL:
- If the workbook or any audited file is missing → STOP, report path.
- If you cannot independently read the workbook → STOP (do not fall back to trusting
  the builder's extraction script as your read path).
- If a stash/restore step fails → restore the tree first (git stash pop), then report.
- Never patch files to make checks pass. Auditors do not fix.

Use high reasoning effort. Think step-by-step. Your value is independence: every number you
confirm must trace to a workbook cell or a command you ran, not to the builder's prose.


---

## PROMPT CONTRACT: T2 — TraitInteractionMatrix Authoring
**Date:** 2026-06-10 | **Route:** Claude Code CLI | Fable 5 | MAX reasoning effort
**Spec:** spec-docs/IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §4.3, §13 (T2 — judgment-artifact exception: Fable builds)

---

You are the Trait Interaction Matrix Author.

GOAL:
Author src/data/traitInteractionMatrix.ts — the machine-evaluable activation predicate,
target, delta vector, and per-tier scaling for ALL 75 traits — derived from the guide's
prose, with a guide citation on every predicate.

SOURCE OF TRUTH (in precedence order):
1. spec-docs/reference/BillyYank_Super_Mega_Baseball_Guide_3rd_Edition.docx — predicate
   semantics (WHEN does each trait fire, on WHOM). Read it in full before authoring.
2. src/data/traitPricing.ts (committed 8ce3b04) — the 75-trait name list (exact names,
   polarity, chemistry) and L2 delta/multiplier magnitudes. Your matrix must cover exactly
   these 75 names, no more, no fewer.
3. spec §4.3 — schema intent, known predicate examples (Ace Exterminator, Specialist,
   Mind Gamer, Pinch Perfect, Rally Stopper, Clutch/Choker, 2-strike family, splits,
   Stimulated, Durable/Injury Prone, Workhorse), and guide-explicit per-tier values
   (K Collector +8/+15/+30; First Pitch Slayer +5/+8 → +10/+15 → +20/+30).
4. spec §3.5 potency rule: default per-tier scale 0.5×/1.0×/2.0× of L2 values UNLESS the
   guide states explicit per-tier numbers — then use those verbatim with a citation.

THIS IS A JUDGMENT TASK:
You are not transcribing a table — you are deciding, from prose, the precise predicate for
each trait. Where the guide is ambiguous, choose the most defensible reading, cite the
passage, and add the trait name to an AMBIGUITIES list in the file header for JK
adjudication. NEVER silently guess without flagging.

CONSTRAINTS:
- Create only this file: src/data/traitInteractionMatrix.ts
- Do NOT touch: src/data/traitPricing.ts, src/data/ivCurves.ts, src/engines/** (the
  evaluator that consumes this matrix is T6, a separate prompt)
- Data only: typed constants, no functions beyond none, no React.
- Every entry MUST have a non-empty `citation` field: guide section/heading + a short
  quoted fragment (<15 words) supporting the predicate. Entries grounded only in
  spec §4.3 or traitPricing.ts cite those instead — but prefer the guide.

SCHEMA (define these types in the file, then the data):
```typescript
type PredicateCondition =
  | { kind: 'always' }
  | { kind: 'count'; balls?: number; strikes?: number }          // exact-count traits (0-0, 2-strike)
  | { kind: 'twoStrikes' } | { kind: 'firstPitch' }
  | { kind: 'pressure'; level: 'high' | 'extreme' }
  | { kind: 'runnersOn' } | { kind: 'risp' }
  | { kind: 'vsHand'; hand: 'L' | 'R' | 'same' | 'opposite' }
  | { kind: 'opponentTier'; minGrade: string }                    // e.g. Ace Exterminator 'A-'
  | { kind: 'substitutionAB' }
  | { kind: 'inningRange'; from?: number; final?: boolean; lastNInnings?: number }
  | { kind: 'onBasePath' }                                        // steal/baserunning traits
  | { kind: 'fieldingChance' };                                   // fielding-context traits

interface TraitMatrixEntry {
  name: string;                       // EXACT match to traitPricing.ts
  target: 'self' | 'opponent';
  effect:
    | { kind: 'ratingDelta'; deltas: Partial<Record<Attr, number>>;  // L2 values
        perTier?: { l1: Partial<Record<Attr, number>>; l3: Partial<Record<Attr, number>> } } // only when guide-explicit
    | { kind: 'mojoTransitionRate'; factor: number }               // Volatile/Consistent
    | { kind: 'fitnessDecayRate'; factor: number }                 // Durable/Injury Prone
    | { kind: 'staminaModifier'; pitches: number }                 // Workhorse
    | { kind: 'expectedValueNote'; description: string };          // randomized traits (Stimulated) — model as EV, document
  predicates: PredicateCondition[];   // AND-combined; [{kind:'always'}] for unconditional
  potency: 'standard' | 'guideExplicit';   // standard = 0.5/1/2 scaling of effect deltas
  citation: string;                   // REQUIRED — guide heading + <15-word fragment
  notes?: string;                     // interpretation rationale where non-obvious
}

export const TRAIT_INTERACTION_MATRIX: TraitMatrixEntry[] = [ /* exactly 75 */ ];
```
If a trait genuinely needs a condition kind not listed, ADD it to the union with a comment —
do not shoehorn. Traits with no in-game conditional behavior (pure rating identity already
priced in traitPricing) still get entries with [{kind:'always'}] so coverage is total.

KNOWN HARD CASES (give these explicit care + notes):
- Mind Gamer: target='opponent', −ACC on opposing pitcher (spec §4.3)
- Rally Stopper: pitcher trait, runnersOn predicate, self VEL/JNK/ACC
- Ace Exterminator: opponentTier predicate; guide says persists vs fatigued ace — capture in notes
- Clutch/Choker: pressure predicate; doubled at extreme per spec — use perTier? No: model the
  extreme doubling via TWO entries or a notes-documented pressure interaction; choose and justify
- Specialist: vsHand 'same' — confirm batter-vs-pitcher direction from guide and cite
- Stimulated: random late-game fitness juice → expectedValueNote with inningRange predicate
- Volatile/Consistent/Durable/Injury Prone/Workhorse: non-ratingDelta effect kinds above
- Splits traits (POW/CON vs LHP/RHP): vsHand with explicit hand, NOT 'same'/'opposite'

VERIFICATION:
1. npm run build (or npx tsc --noEmit)
2. npx tsx -e "import {TRAIT_INTERACTION_MATRIX as M} from './src/data/traitInteractionMatrix';
   console.log(M.length, M.filter(e=>!e.citation?.trim()).length, M.filter(e=>e.target==='opponent').map(e=>e.name))"
   (expect: 75, 0, and the opponent-target list — report it)
3. npx tsx cross-check: every M name exists in TRAIT_PRICING and vice versa (paste the script + output)
4. Paste the full AMBIGUITIES list from the file header.

FORMAT:
1. FILES CHANGED
2. CHANGES MADE — per-trait coverage summary by predicate kind (counts), the opponent-target
   list, the hard-cases decisions with rationale, the AMBIGUITIES list
3. VERIFICATION OUTPUT (all 4)
4. STATUS: "T2 complete" OR "BLOCKED: [exact reason]"

FAILURE PROTOCOL:
- Guide unreadable/missing → STOP, report path
- A traitPricing name with no guide coverage at all → entry from spec/traitPricing grounds,
  cite accordingly, add to AMBIGUITIES
- Never leave citation empty; never invent guide quotes — quote only text actually present

Use MAX reasoning effort. Re-read the guide section for every single trait before writing
its predicate. A subtly wrong predicate ships wrong recommendations to every surface.

---

## PROMPT CONTRACT: T2-AUDIT — Structural Audit of TraitInteractionMatrix
**Date:** 2026-06-10 | **Route:** Codex 5.5 | high reasoning effort
**Spec:** spec-docs/IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §4.3, §13
**Builder:** Fable 5 CLI (T2). This audit is STRUCTURAL ONLY — predicate-interpretation
judgment is explicitly OUT of audit scope (flag, never adjudicate; JK is the tiebreaker).

---

You are the T2 Structural Auditor.

GOAL:
Verify src/data/traitInteractionMatrix.ts is complete, schema-valid, magnitude-consistent
with committed pricing data, citation-covered, and free of obviously unsupported predicates —
WITHOUT re-deriving predicate interpretations yourself.

AUDIT PRINCIPLE:
The builder's report is a claim. Evidence = the file, traitPricing.ts, the guide (for
citation spot-checks only), and commands you run. Required section: DISAGREEMENTS WITH
BUILDER REPORT.

CONSTRAINTS:
- Modify NOTHING. Throwaway scripts to /tmp only. Auditors do not fix.

CHECKLIST:
S1. COVERAGE: exactly 75 entries; name set identical to TRAIT_PRICING (both directions);
    no duplicates. Script it.
S2. SCHEMA: every entry parses against the declared types; predicates non-empty; every
    perTier presence has potency='guideExplicit'; every potency='guideExplicit' has either
    perTier or a notes justification.
S3. MAGNITUDE CONSISTENCY: for every ratingDelta entry whose trait has nonzero deltas in
    TRAIT_PRICING, the matrix L2 deltas must equal the pricing deltas OR carry a notes field
    explaining the divergence (guide-explicit values may differ — e.g. K Collector pricing
    9/9/4 vs guide +15/+15 at L2; divergence + citation + note = acceptable; silent
    divergence = MAJOR finding). Script the comparison, paste all divergences found.
S4. TIER RULE: potency='standard' entries must NOT carry perTier. Spot-check 3
    guideExplicit entries' citations against the guide (K Collector, First Pitch Slayer,
    + 1 of your choice) — the quoted fragment must exist in the docx text.
S5. CITATIONS: zero empty citations; sample 10 random entries, confirm each quoted fragment
    actually appears in the guide (python-docx text search). Fabricated quote = BLOCKER.
S6. FLAG PASS (flag, don't judge): list any entry where the citation text does not on its
    face mention the predicate's condition (e.g. predicate says twoStrikes but quote says
    nothing about counts). Output as FLAGGED FOR JK with entry name + quote + predicate.
S7. CONSUMPTION SMOKE: npm run build; npx tsx import + count check; confirm no engine
    files reference the matrix yet (T6 is the consumer — grep).
S8. Paste the builder's AMBIGUITIES list alongside your S6 flags so JK adjudicates once.

FORMAT:
1. EVIDENCE LOG (S1–S8: commands + output + PASS/FAIL)
2. DISAGREEMENTS WITH BUILDER REPORT
3. FLAGGED FOR JK (S6 + S8 merged, deduped)
4. FINDINGS REQUIRING ACTION (severity-rated)
5. VERDICT: "T2 AUDIT: STRUCTURALLY CONFORMS — N items flagged for JK adjudication" OR
   "T2 AUDIT: DEVIATIONS — [count]" OR "BLOCKED: [reason]"

FAILURE PROTOCOL:
- Guide or matrix file missing → STOP. Never patch. Never adjudicate interpretation —
  predicate-vs-guide judgment calls belong to JK, not you.

Use high reasoning effort. Your job is completeness and consistency, not baseball judgment.


---

## PROMPT CONTRACT: T3 — Empirical Pool Analysis & Tier Parameter Derivation
**Date:** 2026-06-10 | **Route:** Claude Code CLI | Fable 5 | MAX reasoning effort
**Spec:** spec-docs/IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §5.1–§5.3, §7.4, §13 (T3)
**Depends on:** T1 (8ce3b04: ivCurves.ts, traitPricing.ts), T2 (cc09dde: traitInteractionMatrix.ts)

---

You are the Pool Analyst.

GOAL:
Compute the IV distribution of the full 440-player SMB4 database, then derive every
empirical constant the spec defers to T3: tier shift parameters (Juiced/Standard/Nerfed),
tier caps, tier-scaled luxury caps, farm-draft nerf parameters — and run the EV-flatness
verification across composed identities. Deliver data + a findings doc.

SOURCE OF TRUTH:
- Player DB: locate the committed 440-player TypeScript dataset (search src/ for the
  SMB4 player database — report the exact path you used; if absent or <440 players, STOP).
- Curves/pricing: src/data/ivCurves.ts, src/data/traitPricing.ts (NEVER re-extract from
  the workbook; the .ts files are authoritative post-T1).
- Formulas: spec §3.2 (two-segment curve), §3.4 (sub-min), §3.5 (trait marginal pricing,
  potency 0.5/1/2 positives, INVERTED 2.0/1.0/0.5 negatives per v1.1.5), §3.6 (pitch/
  arsenal/aux), §5.2 (cap derivation), §5.3 (percentile method + modification rescaling),
  §6.2 (44 modifications), §6.3 (composition).

THE BOOTSTRAP RULE (important):
src/engines/ivEngine.ts does NOT exist yet (T4). You implement the IV formula INSIDE your
analysis script only — do NOT create anything under src/engines/. Your script's IV math
must validate against the workbook's cached golden players before any analysis runs:
open spec-docs/reference/Team_Builder_Archetype_Logic_Template.xlsx Roster sheet, locate
at least 4 priced players incl. Eovaldi ($54,582) and deGrom ($71,609), reproduce their
salaries within ±$5 (rounding). Anchors fail → STOP and report the per-component breakdown
(attribute/trait/pitch/aux) for the worst mismatch. Do not proceed on broken IV math.

CONSTRAINTS:
- Create only: scripts/analyze-pool.py (or .ts via node — your call, must be rerunnable
  + deterministic), src/data/tierParams.ts, spec-docs/T3_POOL_ANALYSIS.md
- Do NOT touch: src/engines/**, existing data files, the spec itself (findings that imply
  spec changes go in the doc's "SPEC AMENDMENT CANDIDATES" section for JK)
- Every derived number in tierParams.ts must trace to a formula + inputs shown in the doc.
  No hand-picked values (spec §5.1: "do NOT hand-pick the means").

REQUIRED ANALYSES (doc sections mirror these):
R1. IV DISTRIBUTION: per-player IV for all 440; histogram stats (mean/median/p10/p25/p75/
    p90/max) overall, by role (hitter/SP/RP/CP), by position. Grade overlay: distribution
    of letter grades and IV-by-grade (the DB carries SMB4 grades — confirm and use).
R2. TIER DERIVATION (§5.1): Juiced = observed distribution. Standard/Nerfed = leftward
    shifts targeting ~1 and ~2 grade-step drops in mean. Express shifts as IV-space
    transforms the Player Generator can apply (e.g. quantile mapping or mean/sd shift —
    justify the choice). Farm-draft nerf params (§7.4) derived the same way.
R3. TIER CAPS (§5.2): tierCap = max(maxIV/0.33, 22 × medianIV × 1.15) per tier. Show both
    branches; flag if maxIV-branch dominates by >1.5× (signals starBudgetShare retune).
R4. LUXURY CAP SCALING (§5.3): per stat group, distribution of best-plausible top-N sums
    in the pool; neutral cap = 65th percentile (luxuryCapPercentile); rescale all 44
    modification deltas proportionally ("+337 FLD" → +X% of tier FLD cap). Emit the full
    tier-scaled tables into tierParams.ts.
R5. EV-FLATNESS (§5.3 acceptance criterion): for each composed identity (at minimum: the
    6 single-band identities + 6 representative crosses you justify), greedy-build the
    best-achievable 22-man roster under tierCap with taxes at balanceMode='taxed';
    report optimal roster total IV per identity. PASS = all within ±10% of cross-identity
    mean (evFlatnessTolerance). Any identity outside band: report which stats/taxes bind
    and a proposed scaling adjustment — do NOT silently retune; JK decides.
R6. SANITY NARRATIVE: 5 named-player spot checks a human can argue with (e.g. "X grades
    A- but IVs in the p65 because his value sits on cheap FLD curves") — the doc must be
    readable by JK, not just parseable.

VERIFICATION:
1. Golden anchors output (≥4 players, ±$5)
2. Determinism: run twice, diff tierParams.ts (empty) or identical hashes
3. npm run build (tierParams.ts compiles; imported nowhere yet — expected)
4. Paste R5 EV-flatness table verbatim

FORMAT: 1. FILES CHANGED · 2. CHANGES MADE (R1–R6 summaries + SPEC AMENDMENT CANDIDATES)
· 3. VERIFICATION OUTPUT · 4. STATUS: "T3 complete" / "T3 complete WITH FLAGS: [...]" /
"BLOCKED: [reason]"

FAILURE PROTOCOL: DB missing/short → STOP. Anchors fail → STOP with breakdown. EV-flatness
fails → NOT a blocker; complete with flags + proposed adjustments for JK. Never tune
constants to force a PASS.

Use MAX reasoning effort. Every number you emit becomes a league-balance constant —
show your work like it will be audited, because it will be.

---

## PROMPT CONTRACT: T3-AUDIT — Independent Audit of Pool Analysis
**Date:** 2026-06-10 | **Route:** Codex 5.5 | high reasoning effort
**Builder:** Fable 5 CLI (T3). Audit = reproduce-and-verify; analytical judgment calls
(shift method choice, identity selection) are flag-for-JK, not adjudicate.

---

You are the T3 Analysis Auditor.

GOAL:
Independently verify the pool analysis is reproducible, anchor-valid, formula-faithful,
and that tierParams.ts contains exactly what the analysis derives — without trusting the
builder's report or reusing its code paths where independence matters.

AUDIT PRINCIPLE: builder report = claim. Evidence = files, workbook, commands you run.
Mandatory section: DISAGREEMENTS WITH BUILDER REPORT. Modify NOTHING; /tmp only;
auditors do not fix.

CHECKLIST:
P1. SCOPE: git status — only the three T3 files new/changed (+ known pre-existing dirty
    spec docs). No src/engines/** created. Grep: tierParams imported nowhere.
P2. ANCHOR INDEPENDENCE (the heart): write your OWN /tmp IV calculator from spec §3.2/
    §3.5/§3.6 + the committed data files (do not import the builder's script). Reproduce
    the ≥4 golden players within ±$5 against workbook cached values YOU read yourself.
    Then compute IV for 20 seeded-random DB players and compare to the builder's per-player
    output (require a dump or rerun their script to get it): mismatches >±$5 = MAJOR.
P3. DETERMINISM: rerun builder script twice; identical tierParams.ts hashes.
P4. FORMULA FIDELITY: recompute from the builder's own R1 stats: tierCap branches (§5.2
    formula, exact); 3 seeded-random luxury caps from the top-N sum distributions (65th
    pct); 3 modification rescalings. Mismatch vs tierParams.ts = MAJOR.
P5. EV-FLATNESS REPRODUCTION: rerun the builder's R5 path; confirm the table reproduces.
    Then ONE independent probe: your own greedy best-roster for ONE identity of your
    choice; if your optimum beats the builder's by >5%, the builder's greedy is leaving
    value on the table — flag (MAJOR if it flips a PASS/FAIL band).
P6. DOC HONESTY: every constant in tierParams.ts appears in the doc with formula+inputs;
    no constant in the file absent from the doc (and vice versa). Spot-read R6 narratives
    against the data (grades/IVs as claimed for those 5 players).
P7. npm run build.

FORMAT: 1. EVIDENCE LOG (P1–P7) · 2. DISAGREEMENTS WITH BUILDER REPORT · 3. FLAGGED FOR JK
(method judgment calls + any EV-flatness band issues) · 4. FINDINGS REQUIRING ACTION
(severity) · 5. VERDICT: "T3 AUDIT: CONFORMS — ready for JK sign-off" / "DEVIATIONS — [n]"
/ "BLOCKED: [reason]"

FAILURE PROTOCOL: cannot build independent IV calculator that hits the workbook anchors →
report YOUR breakdown vs the builder's; one of you is wrong and the evidence decides —
do not assume it's you. Never patch. Never retune.

Use high reasoning effort. Independence of the P2 read path is the entire value of this audit.


---

## T3-AUDIT ADDENDUM (read together with T3-AUDIT contract above)
**Date:** 2026-06-10 | applies to the Codex 5.5 audit of the completed T3 build

The builder's report changes audit priorities. Execute the base T3-AUDIT checklist with
these modifications:

AD1. SPEC-AMENDMENT CLAIMS ARE NOW THE HIGHEST-STAKES AUDIT TARGET. The builder asserts
the spec's formula text is wrong in ways that will define T4's golden tests. Independently
verify each against the workbook formulas (read the ArrayFormula text yourself):
  - A1 claim: sub-min reflection denominator = primary.min − subMin.min (spec §3.4 says
    (mid2−min2)). Read the SP VEL AE-column formula and decide from the formula text.
  - A4 claim: ROUNDUP is per-component, not per-player-total (spec §3.7 says total).
    Locate the ROUNDUP calls in the cost formulas; report exactly where rounding occurs.
  - A2 claim: arsenal tax is team-level, not part of computeIV. Verify which sheet/row
    consumes the arsenal count.
  - A5 claim: modification table has 42 real entries, not 44. Count the AT:BE rows yourself.
  Each: CONFIRMED / REFUTED / INCONCLUSIVE with formula-text evidence. These verdicts gate
  spec v1.1.6 — do not soft-pedal an INCONCLUSIVE into a CONFIRMED.

AD2. P2 scope update: anchors are now 21 cached players, not 4. Your independent calculator
must reproduce ALL 21 (±$5; builder claims ±$0 — report your exact deltas). NOTE: to hit
the anchors your calculator must implement the builder's A1/A3/A4 interpretations — doing
so and PASSING is itself evidence FOR those amendments; document this circularity
explicitly in your AD1 verdicts (formula-text reading remains the primary evidence).

AD3. P5 update: the tierCap EV-flatness table is structurally trivial (salary=IV ⇒
full-budget tax-free rosters tie — verify this reasoning holds, then move on). The
meaningful reproduction target is the SENSITIVITY runs: reproduce the 1.5× and 2.0×
tierCap results, confirm the two identities that fail at 2.0× and the −11.8% figure,
and run your independent greedy probe at 2.0× (not 1.0×) where the optimizer actually
faces binding constraints.

AD4. DATA-GAP VERIFICATION: independently count pitchers lacking batterRatings in
src/data/playerDatabase.ts (builder: 89/178) and confirm exactly 8 pitcher-batting luxury
rows are disabled in tierParams.ts with the disablement visibly marked (not silently
dropped).

AD5. The builder appended its own SESSION_LOG entry (4th changed file) — this is
protocol-mandated, not scope creep; verify the entry exists and matches the work.

Everything else in the base contract stands, including: independence of your IV read path,
determinism rerun, formula-fidelity recomputation (P4), doc-honesty check (P6), and the
rule that interpretation judgment terminates with JK.


---

## PROMPT CONTRACT: DB1 — playerDatabase.ts Regeneration from Source of Truth
**Date:** 2026-06-10 | **Route:** Codex 5.5 | high reasoning effort → Fable 5 CLI audit
**Spec:** spec-docs/IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md (consumes); T3_POOL_ANALYSIS.md F1
**Context:** Three-way reconciliation (2026-06-10) proved src/data/playerDatabase.ts is
pervasively corrupted: 276/430 matched players carry >=1 wrong rating (~895 field errors,
all attributes affected), 88 pitchers missing batterRatings, 10 name mismatches. The
cleaned workbook is authoritative and CSV-corroborated (0 rating mismatches across 440).

---

You are the Player Database Regenerator.

GOAL:
Regenerate the 440 team-rostered players in src/data/playerDatabase.ts from the Source of
Truth workbook — script-driven, deterministic, schema-preserving — adding the new armSlot
field. Free agents are preserved untouched.

SOURCE OF TRUTH (precedence order):
1. reference-docs/SOURCE_OF_TRUTH_Super Mega Baseball 4 Rosters.xlsx (canonical: names,
   ratings, traits, positions, roles, bats/throws, age, chemistry, arsenal, arm slot;
   salary columns deliberately deleted — NEVER reintroduce salary data)
2. spec-docs/data/players_final.csv — ONLY for the 9 Overdogs chemistry cells empty in
   the workbook (larry la'joy Scholarly, chasey kim Scholarly, werner bergenberg Scholarly,
   carrie wayward Crafty, slick pickman Scholarly, brawn thunderchump Scholarly,
   david diggler Spirited, rocket ramon Spirited, doug nerdwerd Spirited)
3. JK rulings (2026-06-10, already written into the workbook — listed here as verification
   anchors): arm slots Dot Dacornas=High, Swirly Cutstiff=High, Slick Pickman=Low,
   Sergio Slider=Low, Danny Deals=Low, Cutter Crackebarrel=High. Trait disputes: Gem
   Qualita=Composed only; Brawn Thunderchump=Clutch only; Kara Kawaguchi=Pinch Perfect only.
4. Authoritative name spellings (SOT wins): Geoffrey Jenkins, Kent Ratherswell, Danny Deals.

CONSTRAINTS:
- Create: scripts/regenerate-player-db.py (rerunnable, deterministic)
- Modify: src/data/playerDatabase.ts ONLY. Nothing else.
- SCHEMA: preserve the existing interface exactly, PLUS add `armSlot?: 'High'|'Mid'|'Low'|'Sub'`
  to the player interface (pitchers only carry it). Preserve existing field conventions:
  chemistry as the existing abbreviation codes (map full names from SOT to the DB's codes —
  enumerate the mapping you derive from existing entries and print it), traits as
  { trait1?, trait2? } with existing trait-name spellings (normalize SOT variants: '-' /
  '' / 'None' = absent; 'Slowpoke' -> 'Slow Poke'; verify every SOT trait name resolves to
  a name in src/data/traitPricing.ts — unresolvable names are a STOP, not a guess),
  arsenal as string[] from the SOT comma list, positions/roles per existing enums.
- ID PRESERVATION: keep every existing player id. Match SOT->DB by (team, name) after the
  3 spelling fixes; for the ~10 known hard cases (incl. danno yoshida, lars stadkleef,
  seymour socks, pex flexi and the entries whose DB name field differs), produce an
  EXPLICIT mapping table in your report (old DB name -> SOT name -> id kept). NO silent
  fuzzy matching: any SOT player you cannot map to exactly one DB id is a STOP-and-report.
- FREE AGENTS: every free-agent entry passes through byte-identical.
- Ratings, traits, grades, ages, bats/throws, positions, roles: SOT values overwrite DB
  values in ALL cases (the DB is presumed wrong wherever they differ — that is the point).

VERIFICATION (run all, paste output):
1. Determinism: run script twice, identical file hash.
2. Independent check: a verification mode in the script (or second script) that re-reads
   the SOT and the regenerated DB and asserts: 440 team players; 0 missing batterRatings
   on pitchers; 0 rating mismatches on any field; 179/179 pitcher armSlot coverage;
   arsenal non-empty for all pitchers; 9 Overdogs chem fills present; 3 trait rulings hold.
3. npm run build (node at ~/.nvm/versions/node/v20.20.0/bin if PATH lacks it).
4. Full test suite: report deltas vs the known baseline (2 reproducible pre-existing
   failures + 1 suite-order flake). Player-data-dependent test failures are EXPECTED if
   tests assert old corrupted values — list each, with the old-vs-new value, do NOT "fix"
   tests by reverting data; flag them for a follow-up ticket.
5. Re-run scripts/analyze-pool.py and paste the NEW tier caps + shifts alongside the old
   (J/S/N were $1,251,237/$981,174/$850,671; shifts x0.7842/x0.6799). Do not edit
   tierParams.ts by hand — the script regenerates it. Report the 8 previously-disabled
   pitcher-batting luxury rows: with the data gap closed, flip the disablement rule and
   report the derived caps (this is the F1 closure).

FORMAT: 1. FILES CHANGED · 2. CHANGES MADE (chem mapping, name mapping table, trait
normalizations applied) · 3. VERIFICATION OUTPUT (all 5) · 4. STATUS: "DB1 complete" /
"DB1 complete WITH FLAGS: [...]" / "BLOCKED: [exact reason]"

FAILURE PROTOCOL: unresolvable trait name, unmappable player, or SOT structure surprise ->
STOP with specifics. Never invent data. Never reintroduce salary. Never touch free agents.

Use high reasoning effort. This file is the substrate every engine prices — a silent
mismatch here corrupts every downstream constant twice over.


---

## PROMPT CONTRACT: DB1-AUDIT — Independent Audit of Player DB Regeneration
**Date:** 2026-06-10 | **Route:** Claude Code CLI | Fable 5 | high reasoning effort
**Builder:** Codex 5.5 (DB1). You are the independent auditor — different model family by design.
**Spec/context:** PROMPT_CONTRACTS DB1; SESSION_LOG 2026-06-10 reconciliation entries.

---

You are the DB1 Audit Specialist.

GOAL:
Independently verify the regenerated src/data/playerDatabase.ts is a faithful, complete,
schema-correct transcription of the SOT workbook — via your OWN extraction path, never the
builder's script or report.

AUDIT PRINCIPLE (non-negotiable):
The builder's report is a CLAIM. Evidence = the SOT workbook, the regenerated file, git,
and commands you run. Do NOT reuse scripts/regenerate-player-db.py for your comparison —
write your own /tmp extractor (header-aware: the Overdogs sheet has a different column
layout — no spacer columns; pitcher blocks have their own header row with Arsenal and
Arm Slot). Mandatory report section: DISAGREEMENTS WITH BUILDER REPORT.
Modify NOTHING. /tmp only. Auditors do not fix.

CHECKLIST:

D1. SCOPE: git status/diff — changed files are exactly src/data/playerDatabase.ts +
    scripts/regenerate-player-db.py (+ known pre-existing dirty files untouched).
    tierParams.ts and analyze-pool.py must show NO diff (builder restored them per
    contract — verify the restoration actually happened).
D2. FULL-FIELD COMPARISON (the heart — note: the prior reconciliation compared RATINGS
    only; you compare EVERYTHING): for all 440 team players, SOT vs regenerated DB on:
    batting POW/CON/SPD/FLD/ARM (hitters; pitchers have no ARM in SOT — confirm DB arm
    handling is consistent and documented), pitching VEL/JNK/ACC, primaryPosition/
    pitcherRole/role (CRITICAL: position/role corruption was NOT counted before — e.g.
    verify Norm Fenomeno is now SP/RP + isPitcher:true + armSlot 'Sub'), grade, age,
    bats/throws, chemistry (full-name -> code mapping: Competitive CMP, Crafty CRA,
    Disciplined DIS, Scholarly SCH, Spirited SPI), traits (normalized; '-'/'None' absent),
    arsenal arrays, armSlot (179/179, values in High/Mid/Low/Sub only, NEVER on hitters).
    Expected mismatches: ZERO. Each mismatch = MAJOR.
D3. ANCHOR SET: independently confirm the 9 JK rulings — 6 arm slots (Dot Dacornas High,
    Swirly Cutstiff High, Slick Pickman Low, Sergio Slider Low, Danny Deals Low, Cutter
    Crackebarrel High) + 3 traits (Gem Qualita Composed ONLY, Brawn Thunderchump Clutch
    ONLY, Kara Kawaguchi Pinch Perfect ONLY) + 9 Overdogs chem fills.
D4. NAME DIRECTION: final names must be SOT spellings. Verify Geoffrey Jenkins, Kent
    Ratherswell, Danny Deals, and the 4 ID-mapped players (Danno Yoshida, Seymour Socks,
    Lars Stadkleef, Pex Flexi) carry SOT spellings in the file with their ORIGINAL ids
    (bzd-yoshida, htc-socks, htc-stadkleef, swt-flexi). Old-DB typo spellings surviving =
    MAJOR.
D5. ID & FA INTEGRITY: id set identical to pre-DB1 HEAD (no ids created/dropped); all 66
    free-agent entries byte-identical vs pre-DB1 HEAD (script the diff yourself).
D6. SCHEMA & HYGIENE: armSlot type union exact; no salary-like fields anywhere in PLAYERS
    (grep salary/Sal/\$); interface change is additive only; grep confirms no logic added
    to the data file.
D7. DETERMINISM + BUILD: regenerate twice, identical hashes; npm run build exit 0
    (node at ~/.nvm/versions/node/v20.20.0/bin if PATH lacks it).
D8. TEST CLAIM: confirm suite failures are exactly the 3 known baseline items and zero
    player-data-dependent failures (builder claims none — verify by reading the 3
    failures' assertions yourself).
D9. CONSTANTS PREVIEW SANITY: rerun scripts/analyze-pool.py once YOURSELF (then
    git checkout -- src/data/tierParams.ts to restore); confirm the builder's reported
    new caps (J/S/N $1,323,633/$1,169,013/$1,048,489, shifts x0.8832/x0.7921) reproduce.
    Spot-sanity Fenomeno's new IV from the analyzer output and report it (expected: large
    increase from $101k; this previews the A12/two-way discussion, do not judge it).

FORMAT: 1. EVIDENCE LOG (D1–D9) · 2. DISAGREEMENTS WITH BUILDER REPORT · 3. FINDINGS
REQUIRING ACTION (severity) · 4. VERDICT: "DB1 AUDIT: CONFORMS — ready for JK sign-off" /
"DEVIATIONS — [n]" / "BLOCKED: [reason]"

FAILURE PROTOCOL: SOT unreadable -> STOP. Comparison mismatch -> report the exact cell vs
line, both values; never decide which is right (the SOT is right by definition; a DB
divergence is a build defect). Restore any file you touched in D9 before reporting.
Never patch. Never fix.

Use high reasoning effort. Independence of your extraction path is the entire value here —
the builder already believes the file is correct; your job is to give that belief teeth
or break it.


---

## PROMPT CONTRACT: V117 — kblIV Usage Layer + F1 Row Flip + Final Tier Constants
**Date:** 2026-06-10 | **Route:** Codex 5.5 | high reasoning effort → Fable 5 CLI audit
**Spec:** IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md **§3.9 (read it in full — it IS this ticket's design)**, §12 registry v1.1.7 rows, §13 V117.
**Context:** DB1 (a2d245d) made the player DB trustworthy. The analyzer still prices pitcher batting on raw workbook semantics, producing the A12 anomaly (Drake C+ at $219k for a bat he never uses; Fenomeno $436,799 overshoot). §3.9 defines the corrective usage model, JK-designed.

---

You are the Usage Layer Implementer.

GOAL:
Implement the kblIV usage layer in scripts/analyze-pool.py per spec §3.9, flip the 8
previously-disabled pitcher-batting luxury rows (data gap closed by DB1), regenerate
tierParams.ts (third and FINAL derivation), and verify the named acceptance ordering.

CONSTRAINTS:
- Modify: scripts/analyze-pool.py, src/data/tierParams.ts (generated output only — never
  hand-edit), spec-docs/T3_POOL_ANALYSIS.md (APPEND a "V117 ADDENDUM" section only).
- Do NOT touch: src/engines/**, src/data/playerDatabase.ts, ivCurves.ts, traitPricing.ts,
  traitInteractionMatrix.ts, the spec.
- TWO-LAYER RULE (non-negotiable): rawIV (workbook-exact) stays intact and the 21 golden
  anchors + Jon Gray −$2,136 MUST still pass against it — they validate raw semantics.
  kblIV = rawIV transformed per §3.9; ALL pool analysis (distributions, tier caps, shifts,
  luxury derivation, EV-flatness, pick-value inputs) switches to kblIV.

IMPLEMENT (per §3.9 — do not re-derive the design, it is settled):
V1. Usage weight vectors from registry-style inputs (startShare/paRatio/phFloor per role;
    4-man rotation): POW/CON ≈ SP 0.20 / SP-RP 0.15 / RP 0.08 / CP 0.05; SPD adds PR
    floor; FLD always 1.00. Emit the derived weights table to stdout + addendum.
V2. ALL pitcher batting reprices on HITTER curves × usage weight: Two Way trait players
    at their TRAIT POSITION's curve block; non-trait pitchers on the neutral IF/OF block.
    Pitcher-block batting curves retire from kblIV (remain in rawIV).
V3. Two Way trait reprices as the usage unlock: hitterCurveCost(bat, traitPos) ×
    (1.00 − roleBatWeight) + tier-laddered defense: FLD via potency machinery; ARM via
    twoWayArmByTier {60/80/99} at the trait position's ARM curve. Flat +15/15/15/10
    deltas removed from kblIV trait pricing for Two Way (C)/(IF)/(OF) only.
V4. IV stays potency-neutral at L2 for ALL traits (no change — assert it).
V5. F1 flip: with DB1 data (179/179 batterRatings), enable the 8 pitcher-batting luxury
    rows; derive their caps from the now-real distributions (per the §5.3 percentile
    method); update the DISABLED_LUXURY_ROWS mechanism + stale 89/178 wording.
V6. Regenerate tierParams.ts; rerun the EV-flatness suite (1.0×/1.5×/2.0×).

VERIFICATION (paste all):
1. Golden anchors: 21/21 at ±$0 on rawIV + Jon Gray −$2,136 (UNCHANGED — if any anchor
   moves, your layering leaked; STOP).
2. ACCEPTANCE ORDERING (spec-named): kblIV Fenomeno > Pastimm > Drake. Paste all three
   with component breakdowns (Fenomeno expected well below $436,799; Drake expected to
   crash — his POW-92 now weighs ≈0.15).
3. Determinism: two runs, identical tierParams.ts hashes.
4. Old-vs-new constants table: caps/shifts (old: $1,323,633/$1,169,013/$1,048,489,
   ×0.8832/×0.7921 — those were pre-usage-model previews) + the 8 newly-enabled luxury
   rows' caps.
5. EV-flatness verdicts at 1.0×/1.5×/2.0× (report; do not tune).
6. npm run build exit 0 (node: ~/.nvm/versions/node/v20.20.0/bin). Test suite: 3 known
   baseline failures only.

FORMAT: 1. FILES CHANGED · 2. CHANGES MADE (V1–V6) · 3. VERIFICATION OUTPUT (all 6) ·
4. STATUS: "V117 complete" / "V117 complete WITH FLAGS: [...]" / "BLOCKED: [reason]"

FAILURE PROTOCOL: anchor regression → STOP (layering defect). Acceptance ordering fails →
STOP and report the three breakdowns — do NOT tune weights to force it (the ordering is
JK's gameplay oracle; a failure means the implementation diverged from §3.9, or the model
needs JK review — either way, his call). Never touch files outside the three listed.

Use high reasoning effort. The two-layer separation is the whole game: rawIV proves we
decoded the workbook; kblIV proves we understand the sport.

---

## V117 ADDENDUM (V118) — SP/RP Arm Interpolation + Revised Acceptance
**Date:** 2026-06-10 | applies to the V117 contract above; Codex 5.5 | high → Fable 5 audit
**Spec:** §3.9 v1.1.8 additions (READ THE UPDATED §3.9 — the SP/RP arm pricing block and
the rewritten acceptance test), D16, registry rows spRpStartShare/spRpFlexPremium/parityBand.
**Context:** Your first run correctly BLOCKED — the oracle failure was diagnostic, not a
defect. JK ruled: A12 had a second half (SP/RP pitching curves carry the same crude
roster-scarcity premium the batting curves did). Your V1–V6 work stands; add:

V7. SP/RP ARM INTERPOLATION (kblIV only): for every SP/RP pitcher, VEL/JNK/ACC and the
    sub-min mirror price as `spRpStartShare × SPcurveCost + (1 − spRpStartShare) ×
    RPcurveCost`, then × spRpFlexPremium. Registry defaults: α=0.30, premium=1.12.
    Multiplier traits (Specialist, Elite-pitch, etc.) stack on the INTERPOLATED base.
    rawIV stays workbook-exact — all 21 anchors + Jon Gray must still pass untouched.

V8. ACCEPTANCE TEST (replaces the strict ordering — read §3.9 v1.1.8 verbatim, as
    CORRECTED post-DB1; the earlier "Drake crashes" criterion was corrupted-era data
    folklore — true Drake is VEL 92, a trait-less elite arm):
    (1) REQUIRED (crash): Lad Bradwick (SP, CON 97, no Two Way trait) kblIV ≤ 50% of
        his rawIV.
    (2) OBSERVED (parity): report |Fenomeno − Pastimm| / mean vs parityBand ±20%.
        In-band = HYPOTHESIS CONFIRMED. Out-of-band = "V117 complete WITH FLAGS" + full
        component breakdowns for JK — do NOT tune any constant toward the band.
    (3) OBSERVED (arm probe): Pastimm vs Drake on the interpolated curves — the gap
        isolates the trait-stack contribution. Report both with breakdowns.

Then complete the original V117 verification suite in full (determinism, old-vs-new
constants table incl. the 8 enabled luxury rows, EV-flatness 1.0×/1.5×/2.0×, build, tests,
T3_POOL_ANALYSIS "V117 ADDENDUM" section). Same constraints, same failure protocol;
anchor regression remains a hard STOP.

---

## PROMPT CONTRACT: V117-AUDIT — Independent Audit of kblIV Usage Layer
**Date:** 2026-06-10 | **Route:** Claude Code CLI | Fable 5 | high reasoning effort
**Builder:** Codex 5.5 (V117 + V118 addendum). Status: "complete WITH FLAGS" — parity
hypothesis FAILED (Fenomeno $137,183 vs Pastimm $199,054, gap 36.8% vs ±20% band; no
tuning applied, correctly). JK adjudicates the flag AFTER this audit verifies the numbers.
**Spec:** §3.9 v1.1.8 (incl. corrected acceptance test), D15/D16/D17, registry v1.1.7/8 rows.

---

You are the V117 Audit Specialist.

GOAL:
Verify the kblIV implementation is accounting-correct (nothing counted twice, nothing
retired-but-surviving, nothing dropped), spec-faithful, and reproducible — then decompose
the Fenomeno-Pastimm gap into named causes so JK can rule on the parity flag with
verified numbers. The builder's report is a CLAIM; evidence = code, data files, spec,
and commands you run. Mandatory section: DISAGREEMENTS WITH BUILDER REPORT.
Modify NOTHING (except git checkout restores of files you re-dirty). /tmp only.

CHECKLIST:

W1. SCOPE & BASELINE: git diff names = analyze-pool.py, tierParams.ts, T3_POOL_ANALYSIS.md
    (+ known dirty files + spec/PROMPT_CONTRACTS/SESSION_LOG which carry v1.1.7/8 edits —
    those are Claude's, not the builder's; confirm builder didn't touch the spec).
    Rerun the script twice yourself: anchors 21/21 ±$0 + Jon Gray −$2,136 on rawIV;
    identical tierParams hashes (builder: ae7eb4de…); build green; 3 baseline test
    failures only.

W2. DOUBLE-COUNT AUDIT (the heart — JK's explicit concern):
  a. UNLOCK IDENTITY, numerically: for Fenomeno AND one more two-way if the pool has one,
     verify base battingAttributes + twoWayUnlock batting term = hitterCurveCost(bat,
     traitPos) × exactly 1.00 per attribute (POW/CON/SPD). Any attribute summing ≠ 1.00× = MAJOR.
  b. RETIRED COMPONENTS REALLY RETIRED, in kblIV: no pitcher-block batting cost anywhere;
     no workbook Two Way +15/15/15-20 POW/CON/SPD deltas (FLD delta SHOULD survive as the
     quality marginal); flat fees confirmed 0 in data so nothing dropped.
  c. SECONDARY-POSITION deltas on pitchers: determine whether FLD/ARM bonuses are
     usage-weighted or always-on. Per doctrine (FLD always-on), weighting them = MINOR
     under-count; report what the code does with line evidence.
  d. ARM-SLOT multipliers (Sub: VEL×1.075/JNK×1.2): verify they consume the INTERPOLATED
     SP/RP pitch cells, not raw cells (Fenomeno is Sub — check his actual numbers).
  e. A3-IN-kblIV DIVERGENCE: builder routes SP/RP negative-trait deltas onto interpolated
     curves instead of A3's RP-curve rule (rawIV keeps A3 — anchors prove it). Confirm
     the code comment + behavior, and confirm NO SP/RP negative-trait player creates a
     refund larger in kblIV than rawIV would give (the exploit A3 guarded). Flag for JK
     sign-off either way.
  f. CONSERVATION RECOMPUTE: pick Fenomeno + Bradwick + 1 seeded-random pitcher + 1
     seeded-random hitter; recompute kblIV BY HAND in /tmp from ivCurves/traitPricing/
     tierParams registry constants and §3.9 formulas (your own code, not the builder's
     functions); match the script's per-player output to the dollar. Mismatch = MAJOR.

W3. ACCEPTANCE REPRODUCTION: rerun and confirm Bradwick crash ($58,417 ≤ 50% of
    $124,115), parity numbers ($137,183 / $199,054 / 36.8%), arm probe ($199,054 vs
    $100,975). Confirm NO constant in the diff differs from the registry defaults
    (α=0.30, premium=1.12, weights inputs) — i.e., verify no covert tuning.

W4. PARITY GAP DECOMPOSITION (for JK's adjudication — analyze, do NOT judge):
    Build a side-by-side component table for Fenomeno vs Pastimm: interpolated arm cost,
    pitch/arsenal, arm-slot effect, batting (which curve BLOCK and why), trait terms
    (unlock vs multiplier stack, itemized per trait). Then answer specifically:
  a. CURVE-BLOCK QUESTION: Fenomeno's bat prices on the generic IF block. Quantify the
     counterfactual: his batting + unlock if priced on SS curves and on 2B curves instead
     (the IF block is the flat/cheap utility set — mid 65, curve2 1 — this choice may be
     the single largest gap contributor; measure it).
  b. MULTIPLIER STACK SHARE: what fraction of Pastimm's kblIV is Specialist + Elite 4F
     multiplier terms on the interpolated base? (Arm probe says ~$98k vs Drake.)
  c. Report the gap as: gap = Σ(named contributors), so JK can see exactly which design
     choice(s) would close it and decide whether the model or the hypothesis is wrong.

FORMAT: 1. EVIDENCE LOG (W1–W4) · 2. DISAGREEMENTS WITH BUILDER REPORT · 3. FLAGGED FOR
JK (A3-divergence sign-off + parity decomposition + anything from W2c) · 4. FINDINGS
REQUIRING ACTION (severity) · 5. VERDICT: "V117 AUDIT: CONFORMS (accounting verified) —
parity flag ready for JK adjudication" / "DEVIATIONS — [n]" / "BLOCKED: [reason]"

FAILURE PROTOCOL: conservation mismatch or identity break → MAJOR with the exact terms;
never patch; never tune; never adjudicate the parity flag yourself — decompose it.
Restore tierParams.ts (git checkout) after your reruns so the tree matches the builder's
delivered state before you report.

Use high reasoning effort. JK asked one question: "did we count anything twice?" —
answer it with arithmetic, not assurance.

---

## PROMPT CONTRACT: V117-FIX — Audit Remediations + Final Constants (4th derivation)
**Date:** 2026-06-10 | **Route:** Codex 5.5 | high reasoning effort → Fable 5 delta re-verify
**Spec:** §3.9 v1.1.8 AS AMENDED 2026-06-10 (FLD carve-out, parity retirement, A3 symmetry
ratified, registry spdFloors + armSlot rows) — read the amended sections before coding.
**Context:** V117 audit verdict CONFORMS (accounting verified 440/440, no double-counts).
JK ratified all four flagged rulings. This ticket executes the remediations.

---

You are the V117 Remediation Implementer.

CHANGES (all in scripts/analyze-pool.py + regenerated src/data/tierParams.ts +
T3_POOL_ANALYSIS.md addendum updates — nothing else):

X1. WIRE armSlot: parse_players() reads the DB's armSlot field; pool rawIV AND kblIV price
    arm angle per workbook §3.6 (Sub = flat $4,000 + VEL×1.075/JNK×1.2; High/Mid/Low $0).
    kblIV multipliers consume the player's kbl pitch cells (interpolated for SP/RP);
    rawIV consumes raw cells. Fix the stale comment at ~line 300. Expected: 5 Sub players
    (Slinger, Rhubarb, Biggsworth, Fenomeno, Lapada); audit counterfactual says Fenomeno
    kblIV → ~$143,641.
X2. SP/RP FLD interpolates (D16 consistency): non-two-way SP/RP mound FLD = α-blend of
    SP and RP FLD cells × flexPremium, same as other pitch-block attrs. (Audit: Pastimm
    $596 → ~$668.) All other roles' mound FLD unchanged (own block).
X3. Delete the dead A3 pitch_delta_block assignment (~lines 586-590); fold its rationale
    into the D16 comment. Behavior must NOT change (A3 symmetry was ratified as-built).
X4. SPD floors move to named module-level registry constants matching spec §12 spdFloors
    row exactly (.02/.10, .02/.08, .02/.06, .01/.05) — consumed, not inlined.
X5. ACCEPTANCE updated per amended spec: Bradwick crash gate KEPT (kblIV ≤ 50% rawIV;
    re-verify with arm slots wired — Bradwick has no Sub so should be unchanged);
    parity band REMOVED — instead print the Fenomeno/Pastimm component bridge (the
    audit's W4 table format) as a REPORT, no pass/fail. Arm probe print kept.
X6. Regenerate tierParams.ts (4th + final derivation). Update T3_POOL_ANALYSIS V117
    ADDENDUM: record the FLD carve-out ruling, armSlot wiring, A3 ratification, final
    constants, and the bridge table (closes audit F6).

VERIFICATION (paste all): anchors 21/21 ±$0 + Jon Gray −$2,136 (rawIV anchor gate uses
workbook rows which carry their own angle column — UNCHANGED expected); Bradwick gate;
the bridge report; determinism (two runs, hashes); old→new constants table (from
$1,205,836/$1,064,108/$954,058); EV-flatness 1.0×/1.5×/2.0×; npm run build; tests = 3
baseline failures only.

FORMAT: FILES CHANGED · CHANGES MADE (X1-X6) · VERIFICATION OUTPUT · STATUS.
FAILURE PROTOCOL: anchor movement → STOP (X1 wired angle into the wrong layer). Never
tune. Nothing outside the three files.

Note: pool rawIV gains arm-slot pricing (X1) — this changes pool rawIV values vs the T3
era; that is CORRECT (T3 simply lacked the data) and does not touch the anchor gate,
whose 21 workbook rows are priced from workbook columns, not the DB.


---

## PROMPT CONTRACT: T4 — IV Engine (`src/engines/ivEngine.ts`, BOTH layers)
**Date:** 2026-06-10 | **Route:** Codex 5.5 | very high reasoning effort → Fable 5 CLI audit (T4-AUDIT below)
**Spec:** IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md v1.1.8 — §3.1–3.9 (read §3.9 VERBATIM), §11, §12.
**Context:** T1–T3 + DB1 + V117/V117-FIX arc CLOSED. `scripts/analyze-pool.py` is the
anchor-gated (21/21 ±$0 + Jon Gray −$2,136), deterministic, audited reference
implementation of both IV layers. T4 ports that math to a pure TypeScript engine,
validated to the dollar against a frozen oracle generated from the script.
**Scope decisions (JK-confirmed 2026-06-10):** (1) oracle dump = serialization-only
addition to analyze-pool.py; (2) rosterEngineConstants.ts created NOW with IV-layer
constants only (T6 extends it); (3) golden tests hard-encode the FINAL oracle numbers.

---

You are the IV Engine Implementer (TypeScript, pure functions).

GOAL:
Implement `computeIV` producing BOTH layers — rawIV (exact workbook semantics) and
kblIV (§3.9 usage model) — with golden tests proving dollar-exact parity with
analyze-pool.py across all 440 stock players plus the workbook anchors.

SOURCE OF TRUTH:
Spec §3 as amended v1.1.8. WHERE PROSE IS AMBIGUOUS, `scripts/analyze-pool.py`'s
behavior is the arbiter (it is anchor-proven); oracle parity is the acceptance test.
Never resolve an ambiguity by choosing what makes a test pass — match the script.

STEP 0 — FROZEN ORACLE (serialization-only change to analyze-pool.py):
Add `--dump-oracle <path>` flag. It must REUSE the existing engine objects (zero
pricing-logic changes; the diff to this file must contain ONLY serialization code and
flag plumbing) and must run the anchor gate FIRST — no oracle is written if the gate
fails. JSON contents:
- meta: generatedAt, git sha, sha256 of analyze-pool.py
- anchors: per workbook Roster anchor — name, cached expected $, computed rawIV, AND
  the FULL INPUT PROFILE as parsed from the workbook (position/role, all ratings,
  traits, pitches, handedness, secondary pos, arm angle) so the TS tests can construct
  these players and reprice them independently. Include Jon Gray with the isolated
  injuryProneDelta: -2136.
- players: all 440 — id, name, role/position, rawIV, kblIV, and component breakdowns
  for both layers (attributes, traits itemized, pitches, aux, armSlot, sub-min terms,
  unlock term where applicable).
Run it once: output to `spec-docs/reference/iv_oracle.json`. Record the JSON's sha256
in your report. The oracle is then FROZEN — if the engine disagrees with it, the
engine is wrong or you report a FINDING; you never regenerate to converge.

STEP 1 — CONSTANTS REGISTRY (`src/data/rosterEngineConstants.ts`, NEW):
IV-layer constants ONLY, values copied from analyze-pool.py EXACTLY (parity arbiter);
every row commented with its spec §12 source and CALIBRATE flag where marked:
- USAGE_INPUTS per role {startShare, paRatio, phFloor, prFloor, rangeFloor}:
  SP .25/.625/.04/.02/.10 · SP/RP .18/.625/.0375/.02/.08 · RP 0/.625/.08/.02/.06 ·
  CP 0/.625/.05/.01/.05. POW/CON weight = startShare×paRatio+phFloor; SPD adds floors
  capped at 1.0; FLD handled by carve-out (never a batting weight).
- SP_RP_INNINGS_ALPHA = 0.30 (D16 arm interpolation). NAMED DISTINCTLY — this is NOT
  the SP/RP batting startShare (0.18). Conflating these two constants is the #1
  foreseeable implementation error in this ticket.
- SP_RP_FLEX_PREMIUM = 1.12 (D16)
- TWO_WAY_ARM_BY_TIER = {L1: 60, L2: 80, L3: 99} (D15, CALIBRATE)
- TWO_WAY_USAGE = 1.00 (D15, JK ruling — all attributes)
- POTENCY_SCALE: positives {L1 0.5, L2 1.0, L3 2.0}; negatives standardInverted
  {L1 2.0, L2 1.0, L3 0.5} (JK ruling 2026-06-10)
- PITCHER_ASSUMED_ARM = 99 — exported for simulation consumers; ivEngine pricing must
  NEVER consume it (unpriced by design, §3.9)

STEP 2 — ENGINE (`src/engines/ivEngine.ts`, NEW):
Pure module: no React, no IndexedDB, no DOM, no side effects, deterministic. Exports
per spec §11: `computeIV(p, curves, traits, potency): IVResult`, with IVResult carrying
BOTH layers' totals and component breakdowns (mirror the oracle JSON shape so parity
tests diff per-component). Consumes ivCurves.ts, traitPricing.ts,
rosterEngineConstants.ts. Does NOT import traitInteractionMatrix.ts (T6 territory),
tierParams.ts (league environment), or playerDatabase.ts (callers supply players;
tests may import it).

MUST-IMPLEMENT SEMANTICS — rawIV (each item gets a dedicated test beyond parity):
R1. §3.2 two-segment curve exactly; per-COMPONENT ROUNDUP away-from-zero (A4): every
    component cell (each attribute, each trait, each pitch, handed, 2nd-pos, angle)
    rounds; total = Σ rounded components. Multiplier terms consume ROUNDED attribute
    cells; delta terms consume exact curve math.
R2. §3.4 sub-min reverse curve per v1.1.6/A1 semantics — match analyze-pool's exact
    reflection formula (anchor-proven). Sub-min params exist ONLY on SP/SP-RP/RP/CP
    VEL rows (optional in type). EXTRA block (row 117) is PITCHER-shaped — handle it.
R3. §3.5/A3: NEGATIVE-trait delta-marginals on SP/RP players price on RP curves
    (anti-refund-farming). Golden: Jon Gray Injury Prone = −$2,136 exactly.
R4. A2: NO arsenal tax anywhere in computeIV (team-level, lands in T8).
R5. Aux: switch-hitter +5 POW/+5 CON; pitch flats + their multiplier terms; secondary
    positions per §3.6; armSlot Sub = flat $4,000 + VEL×1.075/JNK×1.2 on RAW cells.

MUST-IMPLEMENT SEMANTICS — kblIV (§3.9 verbatim; each gets a dedicated test):
K1. Non-pitchers: kblIV ≡ rawIV (identity, all 262 hitters).
K2. Pitcher batting POW/CON/SPD prices on HITTER curves × per-attribute usage weights
    derived from USAGE_INPUTS. Non-trait pitchers → neutral IF block; Two Way trait
    holders → their TRAIT POSITION's block. Pitcher-block batting curves retire from
    kblIV (remain in rawIV).
K3. FLD carve-out (V117 W2b, ratified): non-two-way pitcher FLD = MOUND fielding on
    his PITCHER block's FLD curve; SP/RP FLD interpolated per D16. Two Way holders'
    FLD on the trait position's curve via potency-scaled delta machinery.
K4. Two Way unlock: traitValue = hitterCurveCost(bat, traitPos) × (1.00 − roleBatWeight)
    + tier-laddered defense (ARM via TWO_WAY_ARM_BY_TIER, priced on trait-position
    curves). Flat +15/+15/+15/+10 deltas retire in kblIV. Usage for holders = 1.00
    ALL attributes.
K5. D16 SP/RP arm: VEL/JNK/ACC (and sub-min terms) = SP_RP_INNINGS_ALPHA-blend of SP
    and RP curve costs × SP_RP_FLEX_PREMIUM. Multiplier traits stack on the
    interpolated base. Sub armSlot multipliers consume the kbl (interpolated) pitch
    cells in this layer.
K6. Potency: IV is potency-NEUTRAL at L2 reference; the potency parameter scales trait
    Δ per POTENCY_SCALE (standardInverted for negatives) — L2 input must reproduce the
    oracle exactly.

STEP 3 — GOLDEN TESTS (`src/engines/__tests__/ivEngine.test.ts`, vitest):
G1. Workbook anchors: construct each anchor from the oracle's input profiles; rawIV
    matches cached salary ±$0 for all 21 (incl. Eovaldi $54,582, deGrom $71,609).
G2. Jon Gray Injury Prone isolated delta = −$2,136 exactly (A3 gate).
G3. Full parity: for ALL 440 players, rawIV AND kblIV equal the frozen oracle to the
    dollar — assert per-component, not just totals.
G4. FINAL oracle four (hard-coded): Fenomeno $143,641 · Pastimm $199,126 ·
    Drake $101,003 · Bradwick $58,417 (kblIV).
G5. Bradwick crash gate: kblIV ≤ 50% of rawIV (acceptance §3.9.1).
G6. Two Way unlock identity: holders' usage = 1.00 all attributes (assert via
    component breakdown; pick a holder, e.g. Fenomeno).
G7. Hitter invariance: kblIV === rawIV for every non-pitcher.
G8. Purity gate: test asserts ivEngine.ts source contains no react/idb/dom imports.
G9. Determinism: two full-pool passes produce identical totals.

CONSTRAINTS:
- Only create/edit: src/engines/ivEngine.ts, src/engines/__tests__/ivEngine.test.ts,
  src/data/rosterEngineConstants.ts, scripts/analyze-pool.py (dump flag ONLY),
  spec-docs/reference/iv_oracle.json (generated once, then frozen).
- Do NOT touch: src/data/ivCurves.ts, traitPricing.ts, tierParams.ts,
  traitInteractionMatrix.ts, playerDatabase.ts; any spec doc; anything under
  src/src_figma/ or GameTracker. Work on codex/franchise-v1-next, no new worktrees.
- NEVER tune a constant, formula, or oracle value to make a test pass. Any
  engine-vs-oracle mismatch = FINDING: report player id, layer, component-level diff
  (expected vs actual), then STOP.
- Quote the spec §/A-rule ID for every semantic you implement.

EXPECTED OUTPUT:
computeIV reproduces analyze-pool.py to the dollar on both layers for all 440 players
and all 21 anchors; G1–G9 green.

VERIFICATION (paste exact output):
1. npx vitest run src/engines/__tests__/ivEngine.test.ts — all green, G1–G9 named
2. npm run build — exit 0
3. Full suite: ONLY the 3 known baseline failures (wpaRuntimeBoundary,
   franchiseNarrativeEventEligibility, franchiseManualSmokeFixture flake) — zero new
4. git diff scripts/analyze-pool.py — paste it (must read as serialization-only)
5. sha256 of iv_oracle.json + confirmation the anchor gate ran during the dump

FORMAT:
1. FILES CHANGED (exact paths) · 2. CHANGES MADE (per R/K/G item, spec ID quoted) ·
3. VERIFICATION OUTPUT (all 5 pasted) · 4. "T4 complete" OR "BLOCKED: [exact reason]"

FAILURE PROTOCOL:
Ambiguity → quote the exact spec section and analyze-pool lines, ask. Parity mismatch
→ FINDING + STOP (never converge by editing the oracle or constants). Anchor movement
in Step 0 → STOP immediately (the dump touched pricing logic). File outside the list
needed → STOP and report. Never summarize or batch. Never assume intent.

Use very high reasoning effort. Think step-by-step.

---

## PROMPT CONTRACT: T4-AUDIT — IV Engine Audit (Fable 5 CLI)
**Date:** 2026-06-10 | **Route:** Claude Code CLI | Fable 5 | high reasoning effort
**Pattern:** builder/auditor decorrelation (spec §13 v1.1.4). Audit the `git diff` and
rerun verification yourself — NEVER grade the builder's self-report.

---

You are the T4 Auditor. The builder's report is a claim, not evidence.

W1. ORACLE INTEGRITY: verify the diff to scripts/analyze-pool.py is serialization-only
    — read it line-by-line; any touched pricing path = MAJOR. Rerun the script WITHOUT
    the flag: anchors 21/21 ±$0 + Jon Gray −$2,136 + determinism hash must hold. Rerun
    WITH the flag to a temp path; sha256 must match the committed iv_oracle.json — a
    mismatch means the oracle was regenerated mid-build to converge (MAJOR).
W2. TEST HONESTY: read ivEngine.test.ts assertions against the contract. Confirm G4
    hard-codes $143,641/$199,126/$101,003/$58,417; G3 asserts per-component across all
    440 on BOTH layers (not a sampled subset, not totals-only); G1 reprices anchors
    from input profiles (not echoing oracle rawIV back at itself).
W3. NFL FALSIFICATION (document every attempt): (a) mutate SP_RP_FLEX_PREMIUM to 1.0
    → G3/G4 must fail; restore. (b) Swap SP_RP_INNINGS_ALPHA (0.30) with SP/RP batting
    startShare (0.18) → tests must fail (the conflation trap). (c) Craft a synthetic
    player exercising ROUNDUP semantics (component sums vs total-rounding diverge) and
    confirm the engine matches workbook semantics. (d) Synthetic SP/RP with a negative
    trait → confirm RP-curve pricing (A3) by hand-computing the delta. (e) Confirm
    arsenal tax absent (grep + a pitcher-heavy synthetic).
W4. SPEC CONFORMANCE: section-by-section read of ivEngine.ts against §3.9 (K1–K6) and
    §3.2–3.7 (R1–R5); quote file lines per claim. Verify PITCHER_ASSUMED_ARM is
    exported but never consumed in pricing. Verify purity (no react/idb/dom).
W5. RERUN: vitest target file + npm run build + full suite (3 baseline failures only)
    yourself; paste outputs.

FORMAT: 1. EVIDENCE LOG (W1–W5) · 2. DISAGREEMENTS WITH BUILDER REPORT (mandatory
section) · 3. FINDINGS REQUIRING ACTION (severity) · 4. VERDICT: "T4 AUDIT: CONFORMS"
/ "DEVIATIONS — [n]" / "BLOCKED: [reason]"

FAILURE PROTOCOL: never patch the engine yourself; never tune; oracle regeneration or
weakened assertions = MAJOR regardless of green tests. Restore any files you mutated
during NFL before reporting.

Use high reasoning effort.


---

## PROMPT CONTRACT: T4-FIX — Audit LOW Remediations (F2/F3/F4)
**Date:** 2026-06-11 | **Route:** Codex 5.5 | medium reasoning effort → Fable 5 delta verify
**Context:** T4 audit verdict CONFORMS (zero MAJOR). JK approved remediation of the three
LOW findings. T4 is CLOSED; this is a scoped hardening pass. The frozen-oracle and
never-tune rules from the T4 contract remain in force.

---

You are the T4 Remediation Implementer.

CHANGES (only: src/engines/ivEngine.ts, src/engines/__tests__/ivEngine.test.ts,
scripts/analyze-pool.py [X2 meta-serialization only], spec-docs/reference/iv_oracle.json
[regenerated once under X2] — nothing else):

X1 (F2). PIN RAW LAYER TO L2: the raw layer's trait pricing must structurally ignore
    the `potency` parameter (force L2/identity scale on the raw path; the kbl layer
    continues consuming potency per K6). "rawIV = exact workbook semantics, NEVER
    modified" becomes true by construction, not by caller convention. NEW TEST G10:
    for a trait-carrying player, computeIV at L1 and at L3 → rawIV identical to L2
    (kblIV MAY differ where two-way/trait machinery consumes potency).
X2 (F3). BYTE-EXACT ORACLE FREEZE: remove `meta.generatedAt` from the oracle payload
    (keep gitSha + analyzePoolSha256 + anchorGate meta). Serialization-only change.
    Regenerate iv_oracle.json ONCE; the anchors and players blocks must be
    BYTE-IDENTICAL to the current committed oracle (diff limited to the meta block) —
    paste proof. Future freeze checks are then plain sha256.
X3 (F4). HITTER armSlot EDGE: do NOT change behavior (parity with analyze-pool is the
    arbiter and the path is unreachable in current data — no hitter carries armSlot,
    DB1-verified). Add an explanatory comment at the armSlot pricing site + a test
    documenting current behavior (synthetic hitter with armSlot 'Sub' → flat $4,000
    charged, multiplier terms vacuous), marked as a documented edge pending spec §15
    review. If you believe a guard is safer, STOP and ask — do not diverge from the
    script unilaterally.

VERIFICATION (paste all):
1. npx vitest run src/engines/__tests__/ivEngine.test.ts — G1–G10 + X3 test green
2. Mutation self-check: temporarily remove the X1 pin → G10 must FAIL; restore, rerun
   green (paste both runs)
3. Oracle regen proof: diff old vs new iv_oracle.json — meta block only; sha256 of new
   file recorded
4. npm run build exit 0; full suite = 3 known baseline failures only
5. git diff scripts/analyze-pool.py — serialization-only

FORMAT: FILES CHANGED · CHANGES (X1–X3) · VERIFICATION OUTPUT · STATUS.
FAILURE PROTOCOL: any anchors/players byte in the oracle changes under X2 → STOP (the
meta removal touched more than meta). Never tune. Nothing outside the four files.

FABLE 5 DELTA VERIFY (not a full audit): read the diff; rerun verification items 1–4
yourself; confirm G10 is mutation-sensitive (re-perform item 2 independently); confirm
oracle anchors/players blocks byte-identical pre/post. Verdict: DELTA VERIFIED /
DEVIATIONS.


---

## PROMPT CONTRACT: T5 — Salary Spec Integration Seam (kblIV becomes the salary base)
**Date:** 2026-06-11 | **Route:** Codex 5.5 | very high reasoning effort → Fable 5 CLI audit (T5-AUDIT, persistence-adjacent salary state; audit non-negotiable)
**Spec:** IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md v1.1.8 — §3.8 (seam map), §3.9, §8.4 (rookie scale), D15/D16/D17. SALARY_SYSTEM_SPEC_UPDATED.md (surviving components). FINDING-127 (rookie salary lock).
**Context:** T4 CLOSED (d696eb6): `src/engines/ivEngine.ts` computeIV is oracle-proven
(440/440 + 21 anchors ±$0 + Jon Gray −$2,136). T5 makes kblIV the base of the live
salary pipeline, retires the old Steps 1/2/trait-tier machinery, enforces D15
potency-neutrality in salary, and adds the §8.4 rookie-scale override hook.

---

You are the Salary Integration Engineer (TypeScript, pure functions where possible).

GOAL:
Replace the base of the salary pipeline with `computeIV(...).kblIV` per spec §3.8,
retire Steps 1/2 and the trait-tier tables, enforce D15 potency-neutrality, add the
§8.4 rookie-scale override, and prove True Value / designation machinery survives
the re-denomination — without touching the IV engine or its oracle.

SOURCE OF TRUTH:
IV spec §3.8 disposition table + §3.9 + §8.4 + D15. Where the old salary spec and
the IV spec conflict, the IV spec wins (it is the declared amending document).
`src/engines/ivEngine.ts` + `spec-docs/reference/iv_oracle.json` are FROZEN
upstream truth — if salary output disagrees with kblIV at neutral modifiers, the
salary seam is wrong, never the engine.

STEP 0 — SPEC AMENDMENTS (pre-build, JK-ratified at 2026-06-11 vision session):
A1. SALARY_SYSTEM_SPEC_UPDATED.md "Chemistry-Tier Trait Potency Factor" section
    (~lines 872–941): DELETE the Salary Multiplier column, the entire "Salary
    Wiring" block (calculateTraitModifierWithPotency), and the update-summary
    bullet claiming potency scales salary. REPLACE with the D15 doctrine, verbatim
    intent: "IV and salary are potency-neutral at the L2 reference forever.
    Realized potency is construction surplus captured downstream by Effective
    Ratings → True Value (T6+). Salary never reprices for chemistry composition."
    Potency's gameplay-tier table (L1/L2/L3 mechanical impact) SURVIVES.
A2. MODE_2_V1_FINAL.md §15.5 wiring point 3 AND
    MODE_2_CANON_FRANCHISE_SEASON_UPDATED.md §15.5 wiring point 3 ("Salary
    Impact: ... higher salary valuation"): REPLACE with the same D15 statement.
    Points 1–2 (aggregate contribution, global activation) survive unchanged.
A3. IV spec §3.8 final row (stale): replace "tunable constant
    `pitcherBattingUsageWeight`, default 0.25 non-DH" with a pointer to §3.9
    USAGE_INPUTS per-role derived weights (startShare × paRatio + phFloor) —
    the single-constant model was superseded by D15/v1.1.7.
Quote D15 as the finding ID for all three edits.

STEP 1 — DENOMINATION BRIDGE (one-off script, documented constants):
The old pipeline is $M-scale (MIN 0.5 / MAX 50); kblIV is absolute dollars
(per-player ~$5k–$120k; Juiced team cap $1,205,836 per tierParams.ts). Dollars
become the ONLY canonical denomination after T5.
- Write `scripts/t5-denomination-bridge.ts`: for all 440 stock players, compute
  oldSalary via the legacy pipeline (neutral age/perf/fame, no personality) and
  kblIV via computeIV. Output median(old), median(kblIV), and
  BRIDGE = median(old $) / median(kblIV $) with old expressed in raw dollars
  (×1,000,000). Paste the output in your report.
- Re-denominate every scale-dependent constant in salaryCalculator.ts via BRIDGE,
  each flagged `// CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)`:
  MIN_SALARY, MAX_SALARY, ROI_THRESHOLDS (re-expressed as WAR per $100k),
  BASE_DRAFT_ALLOCATION, STANDINGS_BONUS_PER_POSITION, getSalaryTier /
  getSalaryColor bands, getRatingSalaryScale, formatSalary (display $X,XXX /
  $X.XXM as magnitude warrants), calculateSwapRequirement tolerances if absolute.
- True Value percentile machinery (calculateTrueValue, getPercentile,
  getValueAtPercentile, peer pools) must NOT be edited for scale — it is
  scale-invariant by construction and the regression tests prove it.

STEP 2 — PIPELINE REPLACEMENT (src/engines/salaryCalculator.ts):
New base per §3.8: `salary = kblIV(p) × ageFactor × perfMod × fameMod ×
personalityMod(FA only)`, then relativity / True Value exactly per existing spec.
- calculateSalary / calculateSalaryWithBreakdown: base = computeIV(p).kblIV.
  SalaryBreakdown gains `ivBase` (+ optional component detail passed through from
  ivEngine's breakdown); baseSalary/positionMultiplier/traitModifier fields are
  preserved in the type for back-compat but populated as ivBase / 1.0 / 1.0.
- RETIRED FROM PIPELINE (mark @deprecated, do NOT delete — legacy needed by the
  bridge script and matrix tests): calculateBaseRatingSalary,
  calculatePositionPlayerBaseSalary, calculatePitcherBaseSalary,
  calculatePitcherBattingBonus, calculateTwoWayBaseSalary,
  calculateTraitModifier + the ELITE/GOOD/MINOR/SEVERE/MODERATE trait arrays,
  TRAIT_SALARY_IMPACT, PITCHER_BATTING_BONUS, TWO_WAY_PREMIUM.
- POSITION_MULTIPLIERS: keep exported, RESET ALL VALUES TO 1.0 (spec §3.8 "tuning
  knobs defaulted 1.0"), still applied in the pipeline as a knob.
- POTENCY: the salary path must contain ZERO chemistry-count logic. kblIV is
  L2-pinned upstream (T4 G10 mutation gate). Do not import POTENCY_SCALE here.

STEP 3 — ROOKIE-SCALE OVERRIDE (§8.4, D6, FINDING-127):
- Add `rookieScaleActive?: boolean` to the salary-calculation options (threaded
  through calculateSalaryWithBreakdown). When true: ageFactor is REPLACED by
  `ROOKIE_SCALE_FACTOR = 0.50` (new constant, spec §8.4 / D6 — no double
  discount; perf/fame/personality still apply).
- T5 wires the HOOK + constant + tests only. The call-up ledger, dead-money rates,
  and Phase 3 reprice triggers are T7 scope — do not build them here. Callers
  default rookieScaleActive to false/undefined everywhere in T5.

STEP 4 — CALL-SITE SWEEP (signature-compatible; behavior change = new numbers):
Update to compile and stay semantically correct under dollar denomination:
src/utils/franchiseSalary.ts (hidden-farm-prospect safety logic must remain
hidden-safe — scout-obscured IV display is T8, keep current concealment),
src/utils/franchiseRatingsSalaryAdapter.ts, src/src_figma/hooks/useOffseasonData.ts,
src/utils/leagueBuilderStorage.ts, src/engines/seasonTransitionEngine.ts,
src/engines/ratingsAdjustmentEngine.ts, src/components/GameTracker/
SalaryDisplay.tsx + PlayerCard.tsx (display formatting only).
If any consumer hardcodes $M-scale assumptions (literals like 50, 0.5, "M"),
re-denominate and list each in the report.

STEP 5 — REGRESSION TESTS (new file src/engines/__tests__/salarySeam.t5.test.ts
+ update the two salaryCalculator test files):
R1 NEUTRAL-PIPELINE GOLDEN: pick ≥3 players from iv_oracle.json's `players`
   array (one hitter, one SP, one RP) and hard-encode their oracle kblIV values:
   salary at neutral modifiers (prime age band, perf 1.0, fame 1.0, no
   personality) === oracle kblIV exactly, to the dollar. (NOTE: Eovaldi $54,582 /
   deGrom $71,609 are RAWIV workbook anchors, NOT in the 440 stock pool — do not
   use them here; that layer is already gated by ivEngine.test.ts G1–G10.)
R2 POTENCY-NEUTRALITY (D15): same player on a roster with 7 shared-chemistry
   players vs 0 → identical salary. Assert no chemistry-count import in the
   salary path (grep-style structural test acceptable).
R3 ROOKIE SCALE: rookieScaleActive → base × 0.50 × perf × fame, ageFactor NOT
   applied (prove no double discount with a non-prime age fixture).
R4 TRUE VALUE SCALE-INVARIANCE: fixture league; multiply every salary by k=10 →
   warPercentile identical, trueValue scales by exactly k, ROI tier stable under
   the re-denominated thresholds.
R5 DESIGNATION REGRESSION: run franchiseDesignationEligibility fixtures under
   dollar salaries — expectations derived from the designation RULES applied to
   the new numbers (rank/threshold semantics preserved), not from old outputs.
R6 POSITION_MULTIPLIERS knob: all values 1.0; a structural test asserts the
   pipeline still applies the knob (set one to 1.1 in-test → salary ×1.1).

CONSTRAINTS:
- Only edit: the 4 spec files in STEP 0, src/engines/salaryCalculator.ts, the
  STEP 4 call-site list, scripts/t5-denomination-bridge.ts (new), the test files
  named in STEP 5, IV spec §13 (T5 row status only, at completion).
- Do NOT touch: src/engines/ivEngine.ts, src/engines/__tests__/ivEngine.test.ts,
  spec-docs/reference/iv_oracle.json, scripts/analyze-pool.py,
  src/data/tierParams.ts, src/data/rosterEngineConstants.ts (import-only),
  src/data/playerDatabase.ts. The oracle and golden tests G1–G10 are FROZEN.
- Work directly on codex/franchise-v1-next (no new worktrees).
- Quote the spec section or D-ruling ID for every change you make.
- Known pre-existing baseline: 2 failing tests (wpaRuntimeBoundary allowlist,
  franchiseNarrativeEventEligibility) + 1 suite-order flake. Do not fix, do not
  worsen — report their status unchanged.

EXPECTED OUTPUT:
Salary pipeline base = kblIV in absolute dollars; old Steps 1/2/trait-tiers
deprecated out of the live path; POSITION_MULTIPLIERS all 1.0; zero potency logic
in salary; rookie-scale hook present and tested; all scale-dependent constants
re-denominated via a documented BRIDGE; R1–R6 green; specs amended per STEP 0.

VERIFICATION:
1. npm run build → passes
2. npx vitest run → R1–R6 pass; ivEngine.test.ts untouched and green; only the
   2 known baseline failures (+1 flake) remain
3. node scripts (or ts-node) t5-denomination-bridge.ts → paste full output
4. grep -rn "calculateBaseRatingSalary" src/ → only deprecated definition, bridge
   script, and legacy matrix tests; zero live-pipeline callers
5. grep -n "POTENCY\|countChemistryType" src/engines/salaryCalculator.ts → empty

FORMAT:
1. Files changed (exact paths) 2. Changes per file w/ spec/D-ruling citation
3. BRIDGE computation output + every re-denominated constant (old → new)
4. Verification outputs pasted verbatim
5. "T5 complete" OR "BLOCKED: [exact reason]"

FAILURE PROTOCOL:
- Ambiguity in spec or seam → quote the exact section, STOP, ask. Never resolve
  an ambiguity by choosing what makes a test pass.
- A constant with no mechanical BRIDGE conversion → STOP, report as
  FIX-DECISION for JK.
- Any change that would require touching a protected file → STOP and report.
- Never summarize or batch changes. Never assume intent — ask.

Use very high reasoning effort. Think step-by-step.


---

## PROMPT CONTRACT: T5-AUDIT — Salary Seam Audit (Fable 5 CLI)
**Date:** 2026-06-11 | **Route:** Claude Code CLI | Fable 5 | high reasoning effort
**Pattern:** builder/auditor decorrelation. Audit the working-tree `git diff 165a78a`
and rerun verification yourself — NEVER grade the builder's self-report.
**ENV WARNING (Captain-verified 2026-06-11):** this machine's login shell exports
`NODE_ENV=production`, which silently breaks vitest (production React, node: builtin
resolution). Prefix EVERY node/vitest/tsx command with `NODE_ENV= ` or your runs
will produce ~1,800 false failures. Treat any mass failure as harness suspicion
FIRST.

---

You are the T5 Auditor. The builder's report is a claim, not evidence. T5 work is
UNCOMMITTED — audit `git diff 165a78a` plus untracked
scripts/t5-denomination-bridge.ts and src/engines/__tests__/salarySeam.t5.test.ts.

W1. FROZEN-BOUNDARY INTEGRITY: `git diff 165a78a --name-only` must NOT contain
    src/engines/ivEngine.ts, src/engines/__tests__/ivEngine.test.ts,
    spec-docs/reference/iv_oracle.json, scripts/analyze-pool.py,
    src/data/tierParams.ts, src/data/rosterEngineConstants.ts,
    src/data/playerDatabase.ts. Any hit = MAJOR, stop. Then rerun
    `NODE_ENV= npx vitest run src/engines/__tests__/ivEngine.test.ts` — 11/11 or
    the seam corrupted the engine's inputs somehow (MAJOR).
W2. PIPELINE TRUTH (read salaryCalculator.ts line-by-line against IV spec §3.8):
    base must be computeIV(p).kblIV — confirm rawIV is NOT consumed anywhere in
    the live path. Modifier order: kblIV × ageFactor × perfMod × fameMod ×
    personalityMod(FA only); relativity/True Value machinery structurally
    unchanged. POSITION_MULTIPLIERS all 1.0 AND still applied as a knob. Zero
    chemistry/potency logic (grep POTENCY, countChemistryType, chemistry — must
    be empty in the live path). Deprecated functions present but unreferenced by
    the pipeline.
W3. BRIDGE HONESTY: read scripts/t5-denomination-bridge.ts — it must call the
    LEGACY deprecated functions for the old side (with the OLD position
    multipliers, which are now 1.0 in the live table — verify the script carries
    its own legacy-multiplier copy and that copy matches the pre-T5 git values
    via `git show 165a78a:src/engines/salaryCalculator.ts`). Rerun it:
    BRIDGE=300.032521 must reproduce. Then verify every re-denominated constant
    in salaryCalculator.ts is old-value × or ÷ BRIDGE (hand-check at least
    MIN_SALARY, MAX_SALARY, ROI_THRESHOLDS, BASE_DRAFT_ALLOCATION against the
    pre-T5 values from git show) and carries the CALIBRATE flag. Any constant
    that is hand-tuned rather than bridged = MAJOR (silent rebalancing).
W4. TEST HONESTY (salarySeam.t5.test.ts vs contract R1–R6): R1 uses stock-pool
    players from iv_oracle.json `players` (NOT Eovaldi/deGrom anchors) with
    hard-coded oracle kblIV values — verify the hard-coded dollars against the
    oracle JSON yourself. R2 potency-neutrality is a real behavioral test, not
    only a grep. R3 proves ageFactor is REPLACED (non-prime fixture), not
    stacked. R4 uses k=10 and asserts exact ×k trueValue + identical percentile.
    R5 designation expectations derive from rules, not from old outputs. R6
    knob test mutates one multiplier and asserts proportional effect. Map each
    of the 8 tests to an R-id; an R-id with no covering test = MAJOR.

W5. NFL FALSIFICATION (document every attempt, restore after each):
    (a) In a scratch copy of the pipeline call, feed a roster with 7
        shared-chemistry players vs 0 → identical salary (D15 live proof beyond
        the test). (b) Mutate ROOKIE_SCALE_FACTOR to 1.0 → R3 must fail.
    (c) Set one POSITION_MULTIPLIER to 1.5 → R6 must fail (knob is live).
    (d) Temporarily point the base at rawIV instead of kblIV → at least one of
        R1/R4 must fail for a pitcher-bearing fixture (proves tests can tell the
        layers apart). (e) Hand-compute one stock player's full salary
        (oracle kblIV × known modifiers) and match the engine to the dollar.
W6. CALL-SITE & SCALE SWEEP: for each changed consumer (franchiseSalary,
    useOffseasonData, leagueBuilderStorage, seasonTransitionEngine,
    ratingsAdjustmentEngine, PlayerCard, SalaryDisplay) confirm no surviving
    $M-scale literal or formatting assumption. EXPLICITLY audit the UNCHANGED
    src/utils/franchiseRatingsSalaryAdapter.ts for $M assumptions the builder
    may have missed (builder left it unedited; compiling ≠ correct). Audit the
    two beyond-contract test edits (SalaryDisplay.test.tsx,
    franchiseSalary.test.ts) for weakened assertions — loosened tolerances or
    deleted expectations = MAJOR.
W7. OPEN QUESTION TO ADJUDICATE: src/engines/index.ts:690 still re-exports
    calculateBaseRatingSalary (compat surface; legacy CJS fixture also uses
    it). Recommend KEEP-DEPRECATED or REMOVE with evidence of external
    consumers; this is a finding for JK, not a unilateral edit.
W8. SPEC AMENDMENTS: confirm A1/A2/A3 exactly per the T5 contract STEP 0 —
    D15 text present, potency salary-multiplier table/JS/bullet gone, both
    MODE_2 §15.5 point-3 rewrites, IV §3.8 DH row cites §3.9. Gameplay potency
    tiers must SURVIVE in all three docs (over-deletion = MAJOR).
W9. RERUN YOURSELF (paste outputs): `NODE_ENV= npx vitest run` full suite —
    exactly 3 baseline failures (wpaRuntimeBoundary,
    franchiseNarrativeEventEligibility, franchiseManualSmokeFixture order-flake
    which passes solo); `npm run build`; the W3 bridge run.

FORMAT: 1. EVIDENCE LOG (W1–W9) · 2. DISAGREEMENTS WITH BUILDER REPORT (mandatory
section) · 3. FINDINGS REQUIRING ACTION (severity MAJOR/LOW) · 4. VERDICT:
"T5 AUDIT: CONFORMS" / "DEVIATIONS — [n]" / "BLOCKED: [reason]"

FAILURE PROTOCOL: never patch the seam yourself; never tune constants; weakened
assertions or hand-tuned bridge constants = MAJOR regardless of green tests.
Restore every file you mutated during NFL before reporting (verify with
`git status` + the untracked-file list unchanged).

Use high reasoning effort.


---

## PROMPT CONTRACT: T5-FIX — Audit Remediations (MAJOR-1, MAJOR-2, LOW-3, LOW-4)
**Date:** 2026-06-11 | **Route:** Codex 5.5 | medium reasoning effort → Fable 5 delta verify
**Source:** T5-AUDIT verdict "DEVIATIONS — 2 MAJOR, 4 LOW" (2026-06-11). Findings 5
(armSlot franchise data gap), 6 (PlayerCard isTwoWay heuristic), 7 (barrel
re-export) are PENDING JK RULINGS — do not touch them in this ticket.
**ENV:** prefix every node/vitest/tsx command with `NODE_ENV= ` (login shell
exports NODE_ENV=production, which breaks vitest with ~1,800 false failures).

---

You are the T5-FIX Implementer.

GOAL:
Remediate the two MAJORs and two mechanical LOWs from T5-AUDIT. Surgical edits
only; no architecture changes.

SOURCE OF TRUTH:
T5-AUDIT report findings 1–4 (PROMPT_CONTRACTS T5-AUDIT). BRIDGE=300.032521 from
scripts/t5-denomination-bridge.ts (do not re-derive).

X1 — MAJOR-1, prospect placeholders ($M-scale → bridged dollars):
  src/utils/prospectSalary.ts currently returns 2.0/1.2/0.7/0.5 ($M). Convert
  each via oldM × 1,000,000 ÷ BRIDGE using the SAME rounding convention as the
  bridged constants in salaryCalculator.ts (2 decimals):
  round 1 → 6665.94 · round 2 → 3999.57 · round 3 → 2333.08 · round 4 → 1666.49.
  Flag each `// CALIBRATE (T5 bridge)`. Round 4 must equal MIN_SALARY exactly —
  add a test asserting `prospectSalaryForDraftRound(4) === MIN_SALARY` plus one
  asserting all four values are within [MIN_SALARY, MAX_SALARY] and strictly
  descending. Concealment semantics in franchiseSalary.ts unchanged. Note: this
  function also feeds leagueBuilderStartupFarmDraft.ts and
  prospectScoutingDraftEngine.ts (Captain-verified) — fixing the source covers
  them; do NOT edit those files.

X2 — MAJOR-2, R3 falsification gap:
  In src/engines/__tests__/salarySeam.t5.test.ts R3, add the literal pin
  `expect(ROOKIE_SCALE_FACTOR).toBe(0.5);` (spec §8.4 / D6) so a mutated
  constant kills the suite. Keep the existing replace-not-stack assertions.

X3 — LOW-3: add a comment block at the top of scripts/t5-denomination-bridge.ts
  documenting WHY it reimplements the legacy pipeline instead of importing the
  deprecated exports (salaryCalculator import chain drags supabase
  `import.meta.env` into tsx and crashes) and that equivalence was
  audit-verified against `git show 165a78a` (strict-legacy variant produced the
  identical BRIDGE).

X4 — LOW-4: add individual `@deprecated T5/D15` tags to ELITE/GOOD/MINOR
  positive trait arrays, SEVERE/MODERATE/MINOR negative arrays,
  TRAIT_SALARY_IMPACT, PITCHER_BATTING_BONUS, TWO_WAY_PREMIUM in
  salaryCalculator.ts. Comments only — zero behavior change.

CONSTRAINTS:
- Only edit: src/utils/prospectSalary.ts, src/engines/__tests__/
  salarySeam.t5.test.ts, scripts/t5-denomination-bridge.ts (comment only),
  src/engines/salaryCalculator.ts (tags only), and ONE test location for the X1
  assertions (new block in salarySeam.t5.test.ts or
  src/utils/tests/franchiseSalary.test.ts — pick one, state which).
- Do NOT touch findings 5/6/7 surfaces (PlayerCard.tsx, engines/index.ts,
  franchise Player data model). All T5 frozen files remain frozen.

VERIFICATION (paste outputs):
1. NODE_ENV= npx vitest run src/engines/__tests__/salarySeam.t5.test.ts
   src/utils/tests/franchiseSalary.test.ts → green incl. new assertions
2. Mutation self-check: temporarily set ROOKIE_SCALE_FACTOR=1.0 → suite must
   FAIL; restore; rerun green. State this was performed with the failing output.
3. NODE_ENV= npx vitest run → exactly the 3 baseline failures
4. npm run build → passes
5. git diff --stat → only the allowed files

FORMAT: 1. Files changed 2. Changes w/ finding ID 3. Verification outputs
verbatim 4. "T5-FIX complete" OR "BLOCKED: [exact reason]"

FAILURE PROTOCOL: ambiguity → quote and stop. Any edit outside the allowed list
→ stop and report. Never adjust BRIDGE or any other bridged constant.


---

## T5-FIX-2 ADDENDUM (read together with T5-FIX above) — unblock full-suite verification
**Date:** 2026-06-11 | **Route:** Codex 5.5 | medium → Fable 5 delta verify (same pass as T5-FIX)
**Context:** T5-FIX correctly BLOCKED — X1 exposed stale $M assumptions downstream.
Captain classified the 5 new failing suites: 4 are stale test constants (engine
output verified correct); 1 (TeamHubContent) is live bespoke $M formatters with
test coverage. Four MORE components carry uncovered $M logic — those are
FINDING-134, explicitly OUT OF SCOPE here (wiring must be verified before edits).

The allowed-file list is EXTENDED by exactly these six files:

Y1 — TeamHubContent.tsx live fix:
  Lines 270 and 591: delete both bespoke `(salary / 1000000).toFixed(1)M`
  formatters; import and use the canonical `formatSalary` from
  src/engines/salaryCalculator.ts (already bridged in T5). No other changes in
  the file. Update src/src_figma/__tests__/franchiseMode/
  TeamHubContent.franchiseReads.test.tsx expectations to the canonical
  formatter's output (hand-derive from the fixture salaries; do not snapshot).

Y2 — Mechanical re-denomination of stale test constants (values only):
  src/utils/tests/franchiseSalarySystem.test.ts ($1.2→3999.57, payroll sums
  recomputed from bridged components; toBeCloseTo precision may move to
  2-decimal dollars but NEVER looser in relative terms),
  src/utils/tests/franchiseValueInputs.test.ts (1.2→3999.57),
  src/utils/tests/prospectScoutingDraftEngine.test.ts (2→6665.94),
  src/utils/tests/franchiseStartupProspectDraft.test.ts (re-derive the boolean's
  underlying comparison: if it gates on an old $M constant, re-express via the
  X1 bridged values; if it encodes BEHAVIOR beyond denomination → STOP and
  report the exact assertion).
  RULE: only numeric constants re-expressed in bridged dollars. Deleting
  assertions, loosening relative tolerances, or changing what is asserted =
  forbidden.

Y3 — FORBIDDEN: FinalizeAdvanceFlow.tsx, TradeFlow.tsx, AwardsCeremonyFlow.tsx,
  FreeAgencyFlow.tsx (FINDING-134 — separate verified pass). If suite-green
  requires touching ANY of them, STOP and report which test forces it.

VERIFICATION (paste outputs):
1. NODE_ENV= npx vitest run [the 6 files above + salarySeam.t5.test.ts] → green
2. NODE_ENV= npx vitest run → EXACTLY the 3 baseline failures
3. npm run build → passes
4. Re-state the X2 mutation self-check remains intact (no re-run needed if the
   pin line is untouched; show the line)

FORMAT/FAILURE PROTOCOL: identical to T5-FIX.


---

## PROMPT CONTRACT: T5-FIX-VERIFY — Delta Verify (Fable 5 CLI)
**Date:** 2026-06-11 | **Route:** Claude Code CLI | Fable 5 | high reasoning effort
**Scope:** verify X1–X4 (T5-FIX) + Y1–Y2 (T5-FIX-2) ONLY. The T5 seam itself was
already audited (T5-AUDIT: DEVIATIONS — 2 MAJOR, 4 LOW); do not re-audit it.
**ENV:** prefix every node/vitest command with `NODE_ENV= `.
**No commit boundary exists between T5 and T5-FIX** (both uncommitted) — verify
by reading the enumerated changes below, not by diffing a base.

---

You are the T5-FIX Delta Verifier. Builder and Captain reports are claims.

V1. X1: src/utils/prospectSalary.ts returns 6665.94/3999.57/2333.08/1666.49
    with CALIBRATE flags. Recompute each as oldM×1e6÷300.032521 yourself and
    confirm round-4 === MIN_SALARY in salaryCalculator.ts. Confirm the new
    bounds/descending/MIN_SALARY tests exist in franchiseSalary.test.ts and
    actually import the constants they compare (not re-hardcoded duplicates of
    the implementation — at minimum the MIN_SALARY assertion must import it).
V2. X2: the pin `expect(ROOKIE_SCALE_FACTOR).toBe(0.5)` exists inside R3
    (salarySeam.t5.test.ts ~line 228). Rerun the mutation yourself:
    ROOKIE_SCALE_FACTOR=1.0 → suite must fail on the pin; RESTORE; rerun green.
V3. X3/X4: bridge-script provenance comment present; @deprecated T5/D15 tags on
    the trait arrays, TRAIT_SALARY_IMPACT, PITCHER_BATTING_BONUS,
    TWO_WAY_PREMIUM; confirm X3/X4 diffs are comment-only (no token outside
    comments changed in those hunks).
V4. Y1: TeamHubContent.tsx — ALL FOUR bespoke $M formatters replaced with
    canonical formatSalary (≈ lines 271/592/690/3444; the Y1 contract named
    two; Captain ruled the two siblings a justified same-pattern fix — confirm
    they ARE the same pattern and nothing else in the file changed beyond the
    import + 4 call sites). grep `1000000` in the file → zero hits.
V5. Y2: diff the four re-denominated test files — ONLY numeric constants moved
    to bridged dollars; no deleted assertions; no loosened relative tolerances;
    franchiseStartupProspectDraft's boolean re-derivation encodes denomination
    only. TeamHubContent.franchiseReads expectations hand-check against
    formatSalary's actual output for the fixture salaries.
V6. FORBIDDEN-SURFACE CHECK: git diff --name-only contains NO FINDING-134 files
    (TradeFlow/FreeAgencyFlow/AwardsCeremonyFlow/FinalizeAdvanceFlow), and
    engines/index.ts unchanged. GameTracker PlayerCard.tsx changes must be
    T5-original only (its diff must contain nothing prospect/TeamHub/bridge-
    related).
V7. RERUN YOURSELF: focused 7-file suite green; full suite — baseline is now
    characterized as 2 fixed failures (wpaRuntimeBoundary,
    franchiseNarrativeEventEligibility) + ≥2 ORDER-FLAKES
    (franchiseManualSmokeFixture, GameTrackerLaunchState — each passes solo;
    Captain observed GameTrackerLaunchState flake on 2026-06-11). A run with 3
    or 4 failures drawn ONLY from those four files = baseline; anything else =
    investigate. npm run build passes.

FORMAT: EVIDENCE LOG V1–V7 · DISAGREEMENTS (mandatory) · VERDICT:
"T5-FIX DELTA VERIFIED" / "DEVIATIONS — [n]" / "BLOCKED: [reason]"
FAILURE PROTOCOL: never patch; restore all mutations; verify git status matches
pre-verify state before reporting.


---

## PROMPT CONTRACT: W1 — WAR Orchestrator Persistence + gamesPerTeam Metadata (+ F5 armSlot, F7 barrel)
**Date:** 2026-06-12 | **Route:** Codex 5.5 | high reasoning effort → Fable 5 CLI audit (persistence-adjacent; audit non-negotiable)
**Source:** MODE2_SYSTEMS_INTEGRATION_MAP.md §4.4 (gating fix for value spine); FINDING-103; IV spec §3.9; SESSION_LOG 2026-06-11 addendum (JK rulings: F5+F7 fold into W1).
**JK ratifications (2026-06-12):** (R1) WAR reads gamesPerTeam from Franchise Setup
Wizard config via SeasonMetadata snapshot; unresolvable → skip-and-warn, NEVER a
silent default. (R2) F7 = salaryCalculator re-export block only, not the whole barrel.
**Parked (logged, not in scope):** wizard free-input gamesPerTeam UI (replace static
button list [16,32,40,80,128,162] in FranchiseSetup.tsx — Codex 5.5 medium,
opportunistic; needs validation bounds); whole-barrel src/engines/index.ts deadness
(fresh grep 2026-06-12: zero importers of any engines barrel import — future cited
cleanup, no drive-by); mid-season gamesPerTeam edits (snapshot-at-creation is
canonical semantics; changing that is a deliberate future design decision).
**ENV:** prefix every node/vitest/tsx command with `NODE_ENV= ` (login shell exports
NODE_ENV=production; poisons vitest with ~1,800 false failures).

```
You are a senior TypeScript engineer executing ticket W1 on the KBL Tracker franchise value spine.

GOAL:
Wire season-WAR persistence into the post-game pipeline with trustworthy season-length
metadata, add the armSlot field to the franchise Player model (F5), and delete the dead
salaryCalculator barrel re-export block (F7).

SOURCE OF TRUTH:
- MODE2_SYSTEMS_INTEGRATION_MAP.md §4.4 (gating dependency: WAR persistence + gamesPerTeam metadata)
- FINDING-103 (warOrchestrator has zero product callers)
- IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §3.9 (armSlot pricing: only 'Sub' prices; null ≡ non-Sub)
- SESSION_LOG.md 2026-06-11 addendum (JK rulings: F5+F7 fold into W1; armSlot:null generator default)

CONSTRAINTS:
- Only edit these files:
  src/utils/processCompletedGame.ts
  src/utils/seasonStorage.ts
  src/utils/leagueBuilderStorage.ts
  src/engines/smb4PlayerGenerator.ts
  src/utils/prospectScoutingDraftEngine.ts
  src/utils/franchiseStartupProspectDraft.ts
  src/engines/index.ts
  src/types/index.ts (ONLY if the W1-C type addition requires it; report if touched)
  plus NEW test files under src/utils/tests/ or src/engines/__tests__/
- Do NOT touch: src/engines/ivEngine.ts, src/engines/rosterEngineConstants.ts,
  src/engines/__tests__/ivEngine.test.ts oracle fixtures, src/engines/tierParams.ts,
  src/engines/salaryCalculator.ts, src/src_figma/app/engines/warOrchestrator.ts
  (call it; do not modify it), any spec-docs.
- Work directly on branch codex/franchise-v1-next (no new worktrees).
- Quote the W1 sub-item ID (W1-A/B/C/D) for every change.
- ENV: prefix every node/vitest/tsx command with `NODE_ENV= `.

W1-A — WIRE WAR PERSISTENCE:
In src/utils/processCompletedGame.ts, after aggregateGameToSeason succeeds (and only
when shouldAggregateToRegularSeasonStats returned true), call
calculateAndPersistSeasonWAR(seasonId, seasonGames, participantIds, playerPositions).
- participantIds: union of Object.keys(gameState.playerStats) and
  gameState.pitcherGameStats[].pitcherId (same set capturePlayerRatingsSnapshots uses).
- playerPositions: derive primary position per participant. If PersistedGameState
  carries lineup/defensive position data, use it; otherwise use
  getEffectivePlayer(playerId, leagueId).primaryPosition. Report which source you used.
  If neither is available for a player, omit that player from the map (orchestrator
  handles missing positions) — do not invent positions.
- WAR failure must NOT fail the game pipeline: wrap in try/catch, console.warn on error,
  game completion proceeds. Aggregation failure handling is unchanged.

W1-B — gamesPerTeam METADATA:
1. Add `gamesPerTeam: number | null` to SeasonMetadata (src/utils/seasonStorage.ts:153).
   This is per-team season length. Do NOT conflate with the existing totalGames field
   (league-wide scheduled count); do not modify totalGames semantics.
2. Populate gamesPerTeam at getOrCreateSeason time from franchise config
   (franchiseConfig.season.gamesPerTeam), threaded from the caller. Existing stored
   seasons without the field read as null (no destructive migration).
3. At the W1-A call site, resolve seasonGames: SeasonMetadata.gamesPerTeam first, then
   the franchiseAdaptiveStandards resolution chain as fallback. NEVER derive it from
   schedule-row counting and NEVER silently default (no hardcoded 50). If unresolvable
   → skip the WAR call entirely + console.warn('[WAR] skipped: gamesPerTeam unresolved
   for season ' + seasonId).

W1-C — F5 armSlot:
1. Add `armSlot?: 'High' | 'Mid' | 'Low' | 'Sub' | null` to the franchise Player
   interface (src/utils/leagueBuilderStorage.ts:189). Stored records without the field
   normalize to null on load if a load-time normalization site exists; otherwise
   undefined ≡ null is acceptable (financially identical per IV §3.9 — only 'Sub' prices).
2. Thread player.armSlot through every site that builds a salary/IV input from the
   franchise Player and currently omits or hardcodes it. Use explicit `armSlot:
   player.armSlot ?? null`. List every site touched.
3. Generators: smb4PlayerGenerator.ts, prospectScoutingDraftEngine.ts,
   franchiseStartupProspectDraft.ts — add explicit `armSlot: null` to every generated
   player construction site (JK ruling 2026-06-11: null is the correct financial
   default; Sub-slot prospect generation is a D8 design question, NOT this ticket).

W1-D — F7 BARREL RE-EXPORT:
Delete the salaryCalculator re-export block in src/engines/index.ts (begins line 686
`export {` under the "Salary Calculator - Player Value System" banner; line 690 =
calculateBaseRatingSalary). Delete the whole block including its type re-exports if
part of the same dead block. Do NOT delete anything else in the file. Pre-deletion
verification required: grep proving zero importers of the removed names via the barrel
path — paste the (empty) output.

EXPECTED OUTPUT:
- Completing a regular-season franchise game persists WAR rows for all season
  participants (bWAR/rWAR/fWAR/pWAR per orchestrator) without blocking game completion.
- SeasonMetadata carries gamesPerTeam from config; a manual-schedule franchise can
  never feed 0 or a row-count into WAR scaling — it skips with a warning instead.
- Franchise Player type-checks with armSlot; all generators emit armSlot: null;
  Sub-slot players entering the franchise layer reprice through the existing
  salaryCalculator threading.
- src/engines/index.ts no longer re-exports salaryCalculator names; build is clean.

VERIFICATION (run all, paste exact output):
1. NODE_ENV= npm run build — passes
2. NODE_ENV= npx vitest run src/utils/tests/processCompletedGame.statBoundary.test.ts
   plus your NEW tests — pass
3. NEW TEST (W1-A, mutation-honest): completes a game through processCompletedGame and
   asserts WAR rows exist in persistence afterward. Must FAIL if the
   calculateAndPersistSeasonWAR call is removed — state how you confirmed this
   (comment the call out, run, show red, restore).
4. NEW TEST (W1-B): gamesPerTeam unresolvable → WAR call skipped, pipeline still
   succeeds; gamesPerTeam present → passed through verbatim (no 50 default).
5. NEW TEST (W1-C): a generated player carries armSlot: null; a Player with
   armSlot:'Sub' produces a different salary than armSlot:null through the franchise
   reprice path.
6. W1-D grep (zero barrel importers) — paste output.
7. NODE_ENV= npx vitest run (full suite) — baseline = failures confined to
   wpaRuntimeBoundary, franchiseNarrativeEventEligibility, and order-flakes
   franchiseManualSmokeFixture / GameTrackerLaunchState (each passes solo). Any failure
   outside that four-file set = report and stop.

FORMAT:
1. Files changed (exact paths)
2. Changes made (each tagged W1-A/B/C/D)
3. Verification results (paste exact output for items 1–7)
4. "W1 complete" OR "BLOCKED: [exact reason]"

FAILURE PROTOCOL:
- If anything is ambiguous → quote the exact section and ask
- If position derivation (W1-A) has no clean source → stop and report what
  PersistedGameState actually carries
- If a change would require touching a file not listed → stop and report
- Never summarize or batch changes; never assume intent

Use high reasoning effort. Think step-by-step.
```

*End W1 contract — appended 2026-06-12, JK-ratified R1/R2 in header.*

---

## W1 ADDENDUM 1 (2026-06-12) — allowed-file list correction (Codex BLOCKED, Captain-verified, APPROVED)
**Trigger:** Codex correctly BLOCKED per failure protocol: W1-C threading requires
`src/utils/franchiseSalary.ts`, absent from the allowed-file list.
**Captain verification (fresh grep):** buildFranchiseSalaryPlayer (franchiseSalary.ts:133)
builds PlayerForSalary with zero armSlot occurrences in file; 9 production importers
confirm it is THE live franchise reprice path. Block accurate. List omission was a
Captain drafting error — W1-C's "every site" mandate already covered this site.
**Amendment:** ADD to allowed files: `src/utils/franchiseSalary.ts` — SURGICAL scope:
exactly one threading line `armSlot: player.armSlot ?? null,` inside
buildFranchiseSalaryPlayer. Nothing else in that file may change (it neighbors
FINDING-134-adjacent consumers; keep the diff to that one line).
**Verification unchanged:** existing test #5 (armSlot:'Sub' vs null produce different
salaries through the franchise reprice path) is the acceptance gate for this line.
All other W1 constraints, forbidden files, and verification items unchanged.

---

## PROMPT CONTRACT: W1-AUDIT — WAR Persistence + Metadata Audit (Fable 5 CLI)
**Date:** 2026-06-12 | **Route:** Claude Code CLI | Fable 5 | high reasoning effort | audit against git diff
*(Note: ran 2026-06-12 without the explicit effort directive — Captain drafting omission, caught by JK; restored here for the record and for any re-run.)*
**Source:** W1 contract + ADDENDUM 1 above. Codex reported "W1 complete" 2026-06-12.
Captain pre-verified: scope clean, frozen files untouched, focused suite 11/11,
build green, franchiseSalary.ts diff = exactly 1 line.
**ENV:** prefix every node/vitest/tsx command with `NODE_ENV= `. Node is at
~/.nvm/versions/node/v20.20.0/bin (non-interactive shells lack it on PATH).

```
You are the auditing engineer for ticket W1. You audit the UNCOMMITTED git diff on
branch codex/franchise-v1-next against the W1 contract + ADDENDUM 1 in
spec-docs/PROMPT_CONTRACTS.md. You verify with fresh evidence; you never trust the
builder's report. You never patch code — you report.

SCOPE: git diff (9 modified files) + 3 new test files. Read the W1 contract first.

V1. SCOPE & FROZEN: git diff --name-only matches the W1 allowed list (+ Addendum 1
    franchiseSalary.ts). ivEngine.ts, rosterEngineConstants.ts, tierParams.ts,
    salaryCalculator.ts, warOrchestrator.ts, oracle fixtures: UNTOUCHED.
    franchiseSalary.ts diff = exactly one line (armSlot threading), nothing else.
V2. W1-A LOGIC REVIEW (processCompletedGame.ts, +140 lines): WAR call fires ONLY
    after successful regular-season aggregation (gated by
    shouldAggregateToRegularSeasonStats); try/catch never blocks game completion;
    participantIds = batting keys ∪ pitcher ids; position derivation = lineup state
    first, getEffectivePlayer fallback, OMITS unresolved (never invents). Confirm no
    behavior change to existing aggregation/archive/almanac paths.
V3. W1-B METADATA: SeasonMetadata.gamesPerTeam added; legacy records normalize to
    null; BACKFILL writes ONLY when stored value is null — prove it can never
    overwrite a non-null value. Resolution order at the WAR call site: stored
    metadata first, then fallback. DEVIATION CHECK: contract specified the
    franchiseAdaptiveStandards resolution chain as fallback; builder described
    "explicit adaptive/milestone input" — determine what was implemented and verdict
    whether it satisfies contract intent (config-truth, never schedule-row counts).
    Grep-prove: no hardcoded 50 (or any default) anywhere in the new resolution path;
    unresolved → skip + warn.
V4. W1-C COVERAGE: enumerate EVERY player-construction site in smb4PlayerGenerator
    (Captain flagged lines ~636/660 vs the single armSlot at ~827 — prove all
    constructed players carry armSlot or flow through the 827 assembly),
    prospectScoutingDraftEngine, franchiseStartupProspectDraft (threads
    player.armSlot ?? null — verify source pool type legitimately carries armSlot).
    Player interface union exact: 'High'|'Mid'|'Low'|'Sub'|null.
V5. W1-D DELETION: the 81 deleted lines in src/engines/index.ts are confined to the
    "Salary Calculator - Player Value System" banner (value + type re-exports).
    Re-run the zero-importers grep yourself. Nothing else removed.
V6. MUTATION RE-CHECK: comment out the calculateAndPersistSeasonWAR call →
    warPersistence test goes RED; restore → green. Set gamesPerTeam resolution to a
    hardcoded 50 → warMetadata test goes RED; restore. Set franchiseSalary armSlot
    line to null → franchiseArmSlot Sub-vs-null test goes RED; restore. git status
    must match pre-audit state after restores.
V7. SUITE: NODE_ENV= full suite — baseline = failures confined to wpaRuntimeBoundary,
    franchiseNarrativeEventEligibility, franchiseManualSmokeFixture,
    GameTrackerLaunchState (order-flakes pass solo). NODE_ENV= npm run build passes.

FORMAT: EVIDENCE LOG V1–V7 · DISAGREEMENTS (mandatory section, "none" if none) ·
VERDICT: "W1 VERIFIED" / "DEVIATIONS — [n] MAJOR, [n] LOW" / "BLOCKED: [reason]"
FAILURE PROTOCOL: never patch; restore all mutations; verify git status matches
pre-audit state before reporting.
```

---

## PROMPT CONTRACT: W1-FIX — Audit Remediations (MAJOR-1 fuel line, LOW-2 seasonId)
**Date:** 2026-06-12 | **Route:** Codex 5.5 | high reasoning effort → Fable 5 delta verify
**Source:** W1-AUDIT verdict "DEVIATIONS — 1 MAJOR, 1 LOW" (2026-06-12). MAJOR-1: WAR
persistence live-dead — no production caller supplies a gamesPerTeam source. LOW-2:
WAR seasonId resolution prefers archiveOptions.seasonId; aggregation writes under
options.seasonId. Captain root-cause (fresh greps 2026-06-12): franchiseInitializer
deriveSeasonTotalGames = schedule-row counting (§4.4 anti-pattern, pre-existing);
config.season.gamesPerTeam already in hand at initializeFranchise; repair path runs
on franchise load → null-only backfill heals existing seasons; useGameState has zero
config access → metadata-first fix means it needs NO changes.
**ENV:** prefix every node/vitest/tsx command with `NODE_ENV= `. Node:
~/.nvm/versions/node/v20.20.0/bin on non-interactive shells.

```
You are a senior TypeScript engineer executing W1-FIX on branch codex/franchise-v1-next.
W1 built a correct WAR-persistence engine with no production fuel line. You connect it.

GOAL:
Make SeasonMetadata.gamesPerTeam live in production (creation + repair paths +
FranchiseHome call sites) and fix WAR seasonId resolution to mirror aggregation.

SOURCE OF TRUTH:
W1 + ADDENDUM 1 + W1-AUDIT report (this file). R1 ruling: config truth only,
skip-and-warn, NEVER a silent default, NEVER schedule-row counts for gamesPerTeam.

CONSTRAINTS:
- Only edit: src/utils/franchiseInitializer.ts, src/utils/processCompletedGame.ts,
  src/src_figma/app/pages/FranchiseHome.tsx, plus existing/new W1 test files.
- Do NOT touch: src/src_figma/hooks/useGameState.ts (X4 below is a deliberate
  non-change), src/utils/seasonStorage.ts (W1 invariants frozen: null-only backfill,
  normalization), warOrchestrator.ts, all W1 frozen files, any spec-docs.
- totalGames semantics UNCHANGED — do not modify deriveSeasonTotalGames or any
  totalGames flow. gamesPerTeam is threaded BESIDE it, never derived from it.
- Quote X-item IDs for every change.

X1 — CREATION PATH: extend ensureFranchiseSeasonMetadata to accept gamesPerTeam:
number | null and pass it to getOrCreateSeason (5th param). initializeFranchise
threads config.season.gamesPerTeam. createFranchiseSeasonMetadata callers thread
whatever config value they hold; if a caller has no config source, pass null
explicitly (never a derived count).

X2 — REPAIR/HEAL PATH: repairFranchisePersistence loads the franchise config
(franchiseId is in hand) and threads config.season.gamesPerTeam into
ensureFranchiseSeasonMetadata. The existing-metadata branch backfills gamesPerTeam
ONLY when the stored value is null; a non-null stored value is NEVER overwritten,
including when config disagrees (snapshot-at-creation is canonical per W1 R1).
If config is unavailable, pass null — no fallback derivation.

X3 — FRANCHISEHOME CALL SITES: both processCompletedGame calls (handleSimulate
~:3595, batch sim ~:3703) add the W1 options gamesPerTeam source from
franchiseData.franchiseConfig?.season?.gamesPerTeam (pass undefined/omit when
absent — never 0, never a row count). This is belt-and-braces: it also triggers
the W1 WAR-site backfill for existing null-metadata seasons immediately.

X4 — DELIBERATE NON-CHANGE: useGameState is NOT edited. After X1/X2, its
processCompletedGame calls resolve gamesPerTeam via stored SeasonMetadata
(metadata-first resolution already built in W1). State this in your report.

X5 — LOW-2 SEASONID: WAR-site season-id resolution mirrors the aggregation target:
options.seasonId FIRST, then archiveOptions.seasonId. The orchestrator must load
and persist under the same scope aggregateGameToSeason wrote to.

X6 — LIVENESS TEST (mutation-honest, production-shaped): a test that (a) creates
season metadata WITH gamesPerTeam populated, (b) calls processCompletedGame with
options = { seasonId } ONLY (the exact useGameState/FranchiseHome shape — no
milestoneConfig), (c) asserts WAR rows persisted. Must go RED if metadata
gamesPerTeam is null (skip-and-warn proven in the same file). Plus a test pinning
X5: when options.seasonId ≠ archiveOptions.seasonId, WAR loads/persists under
options.seasonId — flipping the preference goes RED.

VERIFICATION (run all, paste exact output):
1. NODE_ENV= npm run build — passes
2. NODE_ENV= npx vitest run on statBoundary + all W1/W1-FIX test files — pass
3. X6 mutation evidence: show the RED runs (null metadata; flipped preference),
   restore, show green
4. Full suite — baseline = failures confined to the characterized four-file set
5. git diff --name-only — exactly the allowed files

FORMAT:
1. Files changed (exact paths)
2. Changes made (each tagged X1–X6; X4 = explicit non-change statement)
3. Verification results (paste exact output 1–5)
4. "W1-FIX complete" OR "BLOCKED: [exact reason]"

FAILURE PROTOCOL:
- If repairFranchisePersistence has no clean config accessor → stop and report
  what franchiseManager/storage actually exposes
- If the W1 options shape doesn't accept a gamesPerTeam source at the
  processCompletedGame boundary → quote the actual options type and ask
- If a change needs an unlisted file → stop and report
- Never summarize or batch changes; never assume intent

Use high reasoning effort. Think step-by-step.
```

---

## PROMPT CONTRACT: W1-FIX-VERIFY — Delta Verify (Fable 5 CLI)
**Date:** 2026-06-12 | **Route:** Claude Code CLI | Fable 5 | high reasoning effort | delta verify
**Source:** W1-AUDIT "DEVIATIONS — 1 MAJOR, 1 LOW" → W1-FIX (Codex 5.5 high) reported
complete 2026-06-12. Captain pre-verified: 6 files/22 tests green, X1/X2 null-only
backfill condition explicit, X3 zero-safe (`|| undefined`), X5 in place, useGameState
untouched. Workspace flag (adjudicated, expected): worktree carries the combined
W1 + W1-FIX diff + PROMPT_CONTRACTS.md appends + untracked CSV — the commit unit is
the combined diff; evaluate it as such.
**ENV:** `NODE_ENV= ` prefix mandatory. Node: ~/.nvm/versions/node/v20.20.0/bin.

```
You are the delta-verifying engineer for W1-FIX. You previously audited W1 and
issued MAJOR-1 (WAR live-dead, no production gamesPerTeam source) and LOW-2
(seasonId resolution divergence). Verify the fix delta with fresh evidence. Never
trust the builder report. Never patch.

D1. MAJOR-1 CLOSED — FUEL LINE LIVE: trace all three production ignition paths:
    (a) creation — initializeFranchise → ensureFranchiseSeasonMetadata →
    getOrCreateSeason carries config.season.gamesPerTeam; (b) heal —
    repairFranchisePersistence loads config and backfills ONLY when stored
    gamesPerTeam === null (prove non-null is never overwritten, including when
    config disagrees); (c) belt-and-braces — both FranchiseHome call sites pass a
    config-sourced value, zero-safe, never row counts. Confirm the X6 liveness test
    is production-shaped: options = { seasonId } only, WAR rows persist via
    metadata-first resolution.
D2. X4 NON-CHANGE: git diff contains NO useGameState.ts changes. Reason through
    (do not just assert) why useGameState's call now produces live WAR: its
    seasonId reaches metadata that X1/X2 populated. Flag if any franchise flow
    exists where metadata is never populated and no options source fires (e.g.
    a path that bypasses both initializeFranchise and repairFranchisePersistence).
D3. LOW-2 CLOSED: WAR scope resolution = options.seasonId ?? archiveOptions.seasonId
    (mirrors aggregation). Archive call sites unchanged (archiveOptions-first is
    correct for archiving). Mutation: flip the WAR-site preference → X6 scope test
    RED; restore.
D4. MUTATION RE-RUN: null-metadata skip test RED when metadata gamesPerTeam nulled;
    restore. All restores verified — git status byte-identical to pre-verify state.
D5. FROZEN/INVARIANT CHECK: seasonStorage.ts diff unchanged from your W1-AUDIT
    snapshot (W1-FIX did not touch it); totalGames semantics and
    deriveSeasonTotalGames untouched; W1 frozen files still clean; FranchiseHome
    diff contains ONLY the two X3 option additions (no drive-bys in a 4k-line page).
D6. SUITE & BUILD: NODE_ENV= full suite — baseline = failures confined to the
    characterized four-file set. NODE_ENV= npm run build passes. New-test count
    delta consistent with X6 additions.

FORMAT: EVIDENCE LOG D1–D6 · DISAGREEMENTS (mandatory) · VERDICT:
"W1-FIX DELTA VERIFIED" / "DEVIATIONS — [n]" / "BLOCKED: [reason]"
FAILURE PROTOCOL: never patch; restore all mutations; confirm git status matches
pre-verify state before reporting.

Use high reasoning effort. Think step-by-step.
```


---

## CONTRACT: F134-F135-DISCOVERY (drafted 2026-06-12, JK-confirmed)

**ROUTE: Fable 5 CLI | discovery/audit | high reasoning effort**

```
You are the Discovery Auditor for the KBL Tracker denomination and
season-metadata sweep. This is a READ-ONLY discovery pass. You produce
evidence and classification — you change NOTHING.

GOAL:
Produce a per-site wiring-evidence report for (A) all residual $M-scale
salary logic in four Figma flows (FINDING-134) and (B) every consumer of
SeasonMetadata.totalGames (FINDING-135), classified so fix contracts can
be cut directly from the report.

SOURCE OF TRUTH:
- spec-docs/FINDINGS/FINDINGS_056_onwards.md — FINDING-134 (:2241) and
  FINDING-135 (:2251), including known sites and the data-field-consumer
  sweep doctrine
- spec-docs/MODE2_SYSTEMS_INTEGRATION_MAP.md §4.4 (totalGames anti-pattern)
- Canonical denomination state: salaries are kblIV CANONICAL DOLLARS
  (T5 arc; BRIDGE=300.032521 in scripts/t5-denomination-bridge.ts)
- W1 closure: gamesPerTeam is config-sourced metadata; totalGames
  semantics deliberately UNCHANGED by W1
- Skills: spec-ui-alignment, franchise-button-audit — use their
  dual-direction methodology (top-down from component render path +
  bottom-up from data layer) for wiring verdicts

ENV:
- All CLI verification commands MUST be prefixed `NODE_ENV= `
- Non-interactive shells: node at ~/.nvm/versions/node/v20.20.0/bin

SCOPE — PART A (FINDING-134):
Components (known sites from F-134; you must ALSO re-grep fresh — do not
trust the line numbers, the tree has moved since 2026-06-11):
1. src/src_figma/app/components/FinalizeAdvanceFlow.tsx
2. src/src_figma/app/components/TradeFlow.tsx
3. src/src_figma/app/components/AwardsCeremonyFlow.tsx
4. src/src_figma/app/components/FreeAgencyFlow.tsx

For EACH component answer with evidence:
A1. Is it reachable from the active app? (route/import chain from
    App.tsx or an active page — quote the chain)
A2. Does it read live franchise data (player.salary from
    leagueBuilderStorage/franchise stores) or dummy/local data? Quote
    the data-source line(s).
A3. Enumerate EVERY $M-scale site: x1e6 conversions, /1e6 formatters,
    grade-to-dollar tables, absolute dollar thresholds. Exact line + code.
A4. For each site classify: LIVE-BROKEN (wired to canonical dollars,
    math is wrong) | DUMMY-INERT (dummy data, wrong but no user impact)
    | DEAD (unreachable code).
A5. Sweep completeness check: grep the four files for `1000000`, `1e6`,
    `/ 1000`, M-suffix formatters, and any hardcoded dollar literal
    >= 100000. Report anything beyond the F-134 known sites.

SCOPE — PART B (FINDING-135):
B1. Enumerate EVERY consumer of SeasonMetadata.totalGames (grep
    totalGames across src/, trace each read site). Exact file:line +
    surrounding code for each.
B2. For each consumer classify: ROW-COUNT-CORRECT (counting scheduled
    rows is the right semantics for this use) | CONFIG-TRUTH-NEEDED
    (should read gamesPerTeam instead) | DEAD.
B3. Confirm deriveSeasonTotalGames call sites and whether any consumer
    breaks on totalGames=0 (empty schedule) or partial counts.


---

## CONTRACT: F135-T1 — useSeasonStats season-length source (drafted 2026-06-12; RETRO-LOGGED post-handoff — executed by Codex from chat before this file write; text verbatim from handoff)

**ROUTE: Codex 5.5 | high → Fable 5 CLI audit | high reasoning effort**

```
You are the Season-Length Resolution Engineer for KBL Tracker's leader-board
WAR pipeline.

GOAL:
Replace SeasonMetadata.totalGames as the WAR season-length source in
useSeasonStats with a gamesPerTeam-first resolution, guarded so that
zero/absent values can never produce +/-Infinity or mis-scaled WAR.

SOURCE OF TRUTH:
- FINDING-137 (spec-docs/FINDINGS/FINDINGS_056_onwards.md) + discovery
  report B-1/B-2 (spec-docs/F134_F135_DISCOVERY_REPORT.md section 2)
- W1 canon: SeasonMetadata.gamesPerTeam (seasonStorage.ts:162,
  number|null, normalized at every read/write) is the config-truth
  per-team season length
- R1' RULING (JK 2026-06-12, this contract): WAR season-length
  resolution = gamesPerTeam (non-null, > 0) -> DEFAULT_TOTAL_GAMES (162)
  with a single console.warn per season load. SeasonMetadata.totalGames
  is NEVER consulted for WAR scaling — it is league-total schedule rows,
  not per-team games, and is wrong even when the schedule is complete.

ENV:
- CLI verification MUST be prefixed `NODE_ENV= `
- node at ~/.nvm/versions/node/v20.20.0/bin on non-interactive shells

CONSTRAINTS:
- Only edit: src/hooks/useSeasonStats.ts
- Only create: src/hooks/__tests__/useSeasonStats.seasonLength.test.ts
- Do NOT touch: src/src_figma/app/hooks/useSeasonStats.ts (dead
  duplicate, C-7 — cleanup belongs to F135-T2), bwarCalculator.ts,
  rwarCalculator.ts, pwarCalculator.ts, fwar paths,
  franchiseAdaptiveStandards.ts, seasonStorage.ts, useFranchiseData.ts,
  TeamHubContent.tsx, any W1-frozen file
- totalGames semantics elsewhere UNCHANGED (W1 constraint stands)
- Quote FINDING-137 for every change

EXPECTED OUTPUT:
1. New exported pure function resolveSeasonGamesForWAR(metadata) —
   implements R1' exactly; single warn on fallback.
2. Lines :331 and :366 both consume resolveSeasonGamesForWAR. No other
   read of metadata.totalGames remains (grep zero functional hits).
3. Belt-and-braces: every WAR component assignment passes through
   Number.isFinite(x) ? x : 0 (try/catch + isNaN does not catch
   +/-Infinity).
4. Tests T-A..T-E (mutation-honest) + mutations M1-M3 each shown RED
   then restored:
   T-A: {gamesPerTeam: 64, totalGames: 512} -> 64 (NOT 512)
   T-B: {gamesPerTeam: null, totalGames: 512} -> 162 (NOT 512)
   T-C: {gamesPerTeam: null, totalGames: 0} -> 162 (NOT 0)
   T-D: null metadata -> 162
   T-E: seasonGames forced to 0 yields finite WAR (0), not Infinity
   M1: resolver reads totalGames first -> T-A/T-B RED
   M2: remove zero-guard -> T-C RED
   M3: remove isFinite clamp -> T-E RED

VERIFICATION:
- NODE_ENV= npx vitest run (focused file) -> green
- NODE_ENV= npm run build -> passes
- NODE_ENV= full suite -> failures confined to characterized baseline
- grep -n "totalGames" src/hooks/useSeasonStats.ts -> zero functional hits

FORMAT: files changed · changes (citing FINDING-137/R1') · mutation log
RED/restored · verification output · "F135-T1 complete" OR "BLOCKED".
FAILURE PROTOCOL: stop on forbidden-file need; stop on out-of-baseline
suite failures; never assume intent — ask.

Use high reasoning effort. Think step-by-step.
```

**Execution record (2026-06-12):** Codex 5.5 high reported "F135-T1
complete" — resolver + finiteWAR clamps + 6 tests, M1-M3 all RED/restored,
focused 6/6 green, build green, full suite 3 fails (characterized set),
grep zero hits. ONE DEVIATION for audit: state widened to
SeasonMetadata | null | undefined (init undefined), :350 ternary bypasses
resolver while undefined (warn-noise control) — D2 in the audit contract.
Captain spot-check 2026-06-12: resolver R1'-exact, clamps at 6 assignment
points, focused tests independently re-run 6/6 green.

---

## CONTRACT: F135-T1-AUDIT (drafted 2026-06-12)

**ROUTE: Fable 5 CLI | audit | high reasoning effort**

```
You are the Delta Auditor for F135-T1 (useSeasonStats season-length
resolution). Audit the change against its contract. You may run tests
and apply temporary mutations; every mutation MUST be restored
byte-identical before you report.

SOURCE OF TRUTH:
- CONTRACT F135-T1 (this file, above) including R1' ruling
- FINDING-137 + spec-docs/F134_F135_DISCOVERY_REPORT.md §2 (B-1/B-2)
- Codex completion report (SESSION_LOG 2026-06-12 entry, pending)

SCOPE OF DIFF: git diff on src/hooks/useSeasonStats.ts +
src/hooks/__tests__/useSeasonStats.seasonLength.test.ts. Anything
outside these two files in the diff is an automatic MAJOR.

ENV: prefix `NODE_ENV= `; node at ~/.nvm/versions/node/v20.20.0/bin.

DELTAS TO VERIFY:
D1. R1' CONFORMANCE: resolveSeasonGamesForWAR = gamesPerTeam
    (non-null, finite, > 0) else warn-once-per-seasonKey + 162.
    `grep -n totalGames src/hooks/useSeasonStats.ts` → zero hits.
    Confirm DEFAULT_TOTAL_GAMES is still 162 and the warn cannot spam
    (Set-based dedupe survives re-renders; check module-level scope).
D2. DEVIATION RULING — the undefined ternary (:350): Codex widened
    state to SeasonMetadata | null | undefined (init undefined) so the
    unloaded render silently uses 162 without the resolver/warn.
    Trace every setSeasonMetadata call: after load completes, can the
    state EVER be undefined again (re-load path, error path, season
    switch)? If yes, loaded metadata could bypass the resolver —
    MAJOR. If undefined is provably transient-pre-load only, classify
    LOW (sanctioned noise-control) and say so explicitly.
D3. MUTATION RE-RUNS (apply, show RED, restore byte-identical,
    confirm via git status/diff):
    M1 resolver reads totalGames first → resolver tests + hook mock
       assertions RED
    M2 remove zero fallback → zero-row test RED
    M3 remove finiteWAR clamp → Infinity test RED
D4. CLAMP COVERAGE: enumerate every WAR field assignment in entry
    builders (bWAR, rWAR, fWAR, pWAR, totalWAR, fielding map) —
    each passes finiteWAR. Flag any numeric WAR output path that
    does not.
D5. SCOPE & FROZEN: forbidden files untouched (bwar/rwar/pwar
    calculators, franchiseAdaptiveStandards, seasonStorage,
    useFranchiseData, TeamHubContent, src_figma dead duplicate).
    totalGames semantics elsewhere unchanged.
D6. SUITE & BUILD: NODE_ENV= full suite — failures confined to the
    characterized baseline set (wpaRuntimeBoundary,
    franchiseNarrativeEventEligibility + order-flakes
    franchiseManualSmokeFixture, GameTrackerLaunchState).
    NODE_ENV= npm run build passes. Test count delta consistent with
    +6 new tests.

FORMAT: EVIDENCE LOG D1-D6 · DISAGREEMENTS (mandatory) · VERDICT:
"F135-T1 DELTA VERIFIED" / "DEVIATIONS — [n]" / "BLOCKED: [reason]"
FAILURE PROTOCOL: never patch; restore all mutations; confirm git
status matches pre-audit state before reporting.

Use high reasoning effort. Think step-by-step.
```

**Audit record (2026-06-12):** Fable F135-T1-AUDIT verdict: **"F135-T1 DELTA
VERIFIED."** D1 R1'-exact (warn-dedupe module-level, survives re-renders);
D2 undefined ternary ruled LOW — single state write at :401 from a
Promise<SeasonMetadata|null>, undefined provably transient-pre-load, return
re-narrows via ?? null; D3 M1/M2/M3 all RED, restored hash-verified
byte-identical twice; D4 clamp coverage 6/6 assignment points; D5 frozen
files clean; D6 suite 7,192/3 (characterized set), build green, +6 delta
holds. Disagreements (4, none MAJOR): #1 spec-docs in working tree =
Captain documentation-cycle writes (JK scope ruling: fold into closure
commit); #2 M2b mutant survives — no test pins gamesPerTeam 0/negative/NaN
(one-line resolver test PARKED to F135-T2); #3 T-E implemented stronger
than written (conforms); #4 warn quieter than spec'd (no action).


---

## CONTRACT: F134-T1 — FreeAgencyFlow canonical pass (drafted 2026-06-12)

**ROUTE: Codex 5.5 | high → Fable 5 CLI audit | high reasoning effort**

```
You are the Denomination Engineer for KBL Tracker's Free Agency flow.

GOAL:
Remove all $M-scale salary logic from FreeAgencyFlow so that, when the
offseason flag flips, the flow persists and displays canonical kblIV
dollars correctly.

SOURCE OF TRUTH:
- FINDING-136 (spec-docs/FINDINGS/FINDINGS_056_onwards.md) +
  spec-docs/F134_F135_DISCOVERY_REPORT.md section 1.4 (site table,
  line numbers fresh as of 2026-06-12 — re-verify before editing)
- Canonical denomination: player.salary entering this flow is ALREADY
  canonical T5 dollars (useOffseasonData.ts:38; convertToLocalPlayer
  at FreeAgencyFlow:69-77 passes it RAW — no conversion exists or is
  needed)
- Canonical formatter: formatSalary (src/engines/salaryCalculator.ts
  :1337) — precedent: TeamHubContent adoption under T5-FIX-2

ENV:
- CLI verification MUST be prefixed `NODE_ENV= `
- node at ~/.nvm/versions/node/v20.20.0/bin on non-interactive shells

CONSTRAINTS:
- Only edit: src/src_figma/app/components/FreeAgencyFlow.tsx
- Only create: src/src_figma/__tests__/offseason/
  FreeAgencyFlowDenomination.test.tsx (adjust dir to suite convention
  if an offseason test dir already exists — report which)
- Do NOT touch: useOffseasonData.ts (F-138 is a SEPARATE ticket),
  offseasonStorage.ts, leagueBuilderStorage.ts, salaryCalculator.ts,
  TradeFlow.tsx, AwardsCeremonyFlow.tsx, FinalizeAdvanceFlow.tsx,
  FranchiseHome.tsx (the flag stays FALSE), ivEngine/tierParams/oracle
  (frozen)
- The +-10% return-player matching block (:1353-1382) is RATIO MATH —
  scale-invariant and CORRECT. Do NOT modify its logic; only its
  display strings change via the formatter swap.
- Quote FINDING-136 for every change

EXPECTED OUTPUT:
1. :541 `contractValue: m.player.salary * 1000000` -> contractValue:
   m.player.salary (canonical dollars persisted as-is)
2. All 7 raw-`M` formatter sites (:1457, :1472, :1495, :1496, :1508,
   :1542, :1587) render via formatSalary imported from
   src/engines/salaryCalculator — zero remaining
   `.toFixed(1)}M`-style salary strings in the file
3. Sweep proof: grep the file for `1000000`, `1e6`, and
   `toFixed(1)}M`-pattern salary strings -> zero functional hits
4. Tests (mutation-honest; component-level or extracted-helper level,
   whichever the file structure supports without refactor creep):
   T-A: a signing built from salary S persists contractValue === S
        (NOT S*1e6)
   T-B: salary display for a canonical value (e.g. 143641) renders the
        formatSalary output, not "143641.0M"
   T-C: the +-10% match window for incoming salary S is [0.9S, 1.1S]
        computed in canonical dollars (pins the ratio block unchanged)
   MUTATIONS (run each, show RED, restore):
   M1: reinstate * 1000000 at the contractValue site -> T-A RED
   M2: revert one display site to raw toFixed(1)+"M" -> T-B RED
   M3: scale the match window by 1e6 -> T-C RED

VERIFICATION:
- NODE_ENV= npx vitest run (focused new test file) -> green
- NODE_ENV= npm run build -> passes
- NODE_ENV= full suite -> failures confined to characterized baseline
  (wpaRuntimeBoundary, franchiseNarrativeEventEligibility + order-
  flakes franchiseManualSmokeFixture, GameTrackerLaunchState)
- grep -nE "1000000|1e6" src/src_figma/app/components/FreeAgencyFlow.tsx
  -> zero functional hits

FORMAT:
1. Files changed (exact paths)
2. Changes made (each citing FINDING-136)
3. Mutation log: M1-M3 each shown RED then restored
4. Verification result (paste exact output)
5. "F134-T1 complete" OR "BLOCKED: [exact reason]"

FAILURE PROTOCOL:
- If formatSalary's import path or signature differs from cited -> stop
  and report (do not write a local formatter)
- If any line number from the site table has drifted -> re-locate by
  code content, report old->new, proceed only on exact code match
- If the change would require touching a forbidden file -> stop and
  report
- Never assume intent — ask

Use high reasoning effort. Think step-by-step.
```


---

## CONTRACT: F134-T1-AUDIT (drafted 2026-06-12)

**ROUTE: Fable 5 CLI | audit | high reasoning effort**

```
You are the Delta Auditor for F134-T1 (FreeAgencyFlow canonical pass).
Audit the change against its contract. You may run tests and apply
temporary mutations; every mutation MUST be restored byte-identical
before you report.

SOURCE OF TRUTH:
- CONTRACT F134-T1 (this file, above)
- FINDING-136 + spec-docs/F134_F135_DISCOVERY_REPORT.md section 1.4
- Codex completion report + Captain triage (SESSION_LOG 2026-06-12,
  pending): the BLOCK on franchiseOffseasonGuards.component.test.tsx
  was resolved as a newly observed ORDER-FLAKE (solo 24/24 green;
  pairwise with the new test file green both orders; full-suite re-run
  failed on exactly the prior characterized set with guards green;
  diff adds zero module-scope mutable state)

SCOPE OF DIFF: git diff on
src/src_figma/app/components/FreeAgencyFlow.tsx + the new
src/src_figma/__tests__/offseason/FreeAgencyFlowDenomination.test.tsx.
CARVE-OUT: spec-docs/ changes by the Captain documentation cycle are
expected in the working tree and are NOT scope violations. Any OTHER
file in the diff is an automatic MAJOR.

ENV: prefix `NODE_ENV= `; node at ~/.nvm/versions/node/v20.20.0/bin.

DELTAS TO VERIFY:
D1. SITE CONFORMANCE: contractValue persists raw canonical salary
    (no *1e6); all 7 formatter sites (:1457/:1472/:1495/:1496/:1508/
    :1542/:1587 pre-diff numbering) render via engine formatSalary;
    grep -nE "1000000|1e6" -> zero functional hits; no remaining
    raw `.toFixed(1)}M`-style salary strings anywhere in the file.
D2. RATIO BLOCK UNCHANGED: the +-10% return-player matching logic is
    behavior-identical — the extracted
    getFreeAgencyExchangeSalaryWindow returns exactly
    [0.9*S, 1.1*S] and the match filter consumes it equivalently to
    the pre-diff inline math. Only display strings changed.
D3. CONSUMER SWEEP (F-134 root-lesson, data-field doctrine): we
    changed the WRITE scale of FreeAgentSigning.contractValue.
    Enumerate every READER of contractValue (and of
    saveFreeAgentSignings output) across src/ — for each, verify it
    does not assume $M units (e.g., a /1e6 display or threshold
    elsewhere would now be wrong in the OTHER direction). Any $M-
    assuming reader is a DEVIATION with a finding-candidate note.
D4. REFACTOR-CREEP RULING: Codex extracted pure helpers
    (getFreeAgencyExchangeSalaryWindow, buildFreeAgentSigningFromMove)
    and exported previously-internal types for testability. Verify:
    sanctioned under the contract's "extracted-helper level" clause;
    all additions pure (no module-scope mutable state); component
    behavior unchanged for equal inputs. Classify creep beyond that.
D5. MUTATION RE-RUNS (apply, show RED, restore byte-identical via
    hash + git status):
    M1 reinstate *1000000 at contractValue -> RED
    M2 revert one display site to raw toFixed(1)+"M" -> RED
    M3 scale the match window by 1e6 -> RED
D6. SCOPE & FROZEN: forbidden files untouched (useOffseasonData.ts,
    offseasonStorage.ts, leagueBuilderStorage.ts, salaryCalculator.ts,
    TradeFlow.tsx, AwardsCeremonyFlow.tsx, FinalizeAdvanceFlow.tsx,
    FranchiseHome.tsx — flag still FALSE, ivEngine/tierParams/oracle).
D7. SUITE & BUILD: NODE_ENV= full suite — failures confined to:
    wpaRuntimeBoundary, franchiseNarrativeEventEligibility (fixed
    failures) + order-flakes franchiseManualSmokeFixture,
    GameTrackerLaunchState, franchiseOffseasonGuards.component
    (CONDITIONAL: if guards fires, it must pass solo to stay
    characterized — run it solo and report). NODE_ENV= npm run build
    passes. Test count 7,198 (+3 vs 7,195).

FORMAT: EVIDENCE LOG D1-D7 · DISAGREEMENTS (mandatory) · VERDICT:
"F134-T1 DELTA VERIFIED" / "DEVIATIONS — [n]" / "BLOCKED: [reason]"
FAILURE PROTOCOL: never patch; restore all mutations; confirm git
status matches pre-audit state before reporting.

Use high reasoning effort. Think step-by-step.
```

**Audit record (2026-06-12):** Fable F134-T1-AUDIT verdict: **"F134-T1 DELTA
VERIFIED."** D1 sites conform (9 formatSalary calls, zero 1e6/raw-M hits;
remaining toFixed sites are percentages); D2 ratio block bit-identical via
pure helper; D3 consumer sweep — contractValue has ZERO product readers
(write-only field; forward-safe; dead-data one-liner → F135-T2 list);
D4 refactor sanctioned (pure helpers, type exports, zero module-scope
mutable state; two micro-deltas equivalent-or-better); D5 M1/M2/M3 each
killed by exactly its intended test, restored hash-verified ×2; D6 frozen
clean (incl. corrected paths for rosterEngineConstants/tierParams/oracle);
D7 suite 7,195/3 = characterized set, guards didn't fire + 24/24 solo,
build green, count 7,198 exact. Disagreements 4/0-MAJOR: #1 uncommitted
F135-T1 sibling residue (hash-verified untouched; ruling → commit cadence);
#2 test-dir placement cosmetic; #3 fallback banner now "N/A" vs malformed
"($M)" (improvement); #4 write-only contractValue (parked).

**Captain triage record (pre-audit, 2026-06-12):** Codex BLOCKED on an
outside-baseline failure (franchiseOffseasonGuards.component.test.tsx,
TradeFlow preview assertion). Triage evidence chain: solo 24/24 green;
pairwise with the new test file green BOTH orders; F134-T1 diff adds zero
module-scope mutable state (pure helpers + type exports only); full-suite
re-run failed on EXACTLY the prior characterized 3 with guards green
(failure moved = flake). RULING: newly observed order-flake, third family
member (with franchiseManualSmokeFixture, GameTrackerLaunchState).
F134-T1 unblocked by baseline re-characterization — zero code changed to
appease the suite.


---

## CONTRACT: F134-T2 — AwardsCeremonyFlow canonical pass (drafted 2026-06-12)

**ROUTE: Codex 5.5 | high → Fable 5 CLI audit | high reasoning effort**

```
You are the Denomination Engineer for KBL Tracker's Awards Ceremony flow.

GOAL:
Remove all $M-scale salary logic from AwardsCeremonyFlow: canonical
salaries pass through unconverted, displays use the engine formatter,
and vote-percentage math is re-based per FINDING-139.

SOURCE OF TRUTH:
- FINDING-136 + spec-docs/F134_F135_DISCOVERY_REPORT.md section 1.3
  (site table; line numbers fresh 2026-06-12 — re-verify before edit)
- FINDING-139 RULING (JK 2026-06-12): vote divisor 500000 -> 1666
  (= Math.round(500000 / 300.032521), BRIDGE per
  scripts/t5-denomination-bridge.ts) — faithful translation of the
  original sensitivity. Define ONE named constant
  (e.g., VOTE_PCT_SALARY_SPREAD_DIVISOR = 1666) with a comment citing
  FINDING-139 + BRIDGE; both vote sites consume it.
- Salary entering the flow is ALREADY canonical (useOffseasonData.ts:38)
- Canonical formatter: formatSalary (src/engines/salaryCalculator.ts
  :1337; T5-FIX-2 precedent)

ENV: prefix `NODE_ENV= `; node ~/.nvm/versions/node/v20.20.0/bin.

CONSTRAINTS:
- Only edit: src/src_figma/app/components/AwardsCeremonyFlow.tsx
- Only create: src/src_figma/__tests__/offseason/
  AwardsCeremonyFlowDenomination.test.tsx
- Do NOT touch: useOffseasonData.ts (F-138 separate), offseasonStorage,
  salaryCalculator.ts, the other three flows, FranchiseHome.tsx (flag
  stays FALSE), frozen IV files
- OUT OF SCOPE: salary-as-merit-proxy in winner selection (report C-6)
  — ranking is monotonic and JK-parked; selection logic UNCHANGED
- Quote FINDING-136/139 for every change

EXPECTED OUTPUT:
1. :116 `salary: p.salary * 1000000` -> salary: p.salary (canonical
   pass-through)
2. Vote-pct sites (:1335 Cy Young, :1480 MVP): /500000 -> the named
   1666 constant; clamps (55-97 / 55-92-style bounds) UNCHANGED
3. Display sites :1364, :1513, :1800, :1915 -> formatSalary; zero
   remaining raw-`M`/÷1e6 salary strings in the file
4. Sweep: grep -nE "1000000|1e6|500000" -> zero functional hits
5. Tests (mutation-honest):
   T-A: convertToAwardPlayer keeps salary === input (no *1e6)
   T-B: vote pct for winner 80000 vs runner-up 63340 (spread 16660)
        = base + 10 pts via the 1666 divisor (pin exact number)
   T-C: a winner display renders formatSalary output, not raw "M"
   MUTATIONS: M1 reinstate *1e6 -> T-A RED; M2 revert divisor to
   500000 -> T-B RED; M3 revert one display site -> T-C RED
   (each shown RED, restored)

VERIFICATION: focused tests green; NODE_ENV= npm run build passes;
NODE_ENV= full suite confined to characterized baseline (fixed:
wpaRuntimeBoundary, franchiseNarrativeEventEligibility; order-flakes:
franchiseManualSmokeFixture, GameTrackerLaunchState,
franchiseOffseasonGuards.component — if one fires it must pass solo);
sweep grep zero hits.

FORMAT: files changed · changes (citing F-136/139) · mutation log ·
verification output · "F134-T2 complete" OR "BLOCKED: [exact reason]".
FAILURE PROTOCOL: line drift -> relocate by code content, report
old->new, proceed only on exact match; forbidden-file need -> stop;
formatSalary mismatch -> stop, never write a local formatter; never
assume intent — ask.

Use high reasoning effort. Think step-by-step.
```

---

## CONTRACT: F134-T3 — FinalizeAdvanceFlow canonical pass (drafted 2026-06-12)

**ROUTE: Codex 5.5 | high → Fable 5 CLI audit | high reasoning effort**

```
You are the Denomination Engineer for KBL Tracker's Finalize & Advance
flow. CARE: this file hosts the season-transition trigger — your scope
is roster-UI salary logic ONLY.

GOAL:
Remove all $M-scale salary logic from FinalizeAdvanceFlow and bring its
call-up salary handling into F-127 canon: salary is set at draft and
UNCHANGED at call-up — no recompute.

SOURCE OF TRUTH:
- FINDING-136 + spec-docs/F134_F135_DISCOVERY_REPORT.md section 1.1
  (site table; re-verify line numbers before edit)
- FINDING-140 RULING (JK 2026-06-12): DELETE calculateRookieSalary and
  its grade table (:376-380). The call-up path (:302) carries
  selectedPlayer.salary AS-IS. Recompute-at-call-up contradicted
  FINDING-127 canon (draft-set, locked, unchanged at call-up)
  independent of scale.
- Retirement-risk thresholds re-base by BRIDGE 300.032521:
  10000000 -> 33330, 5000000 -> 16665 (Math.round(X / BRIDGE)).
  Define named constants citing FINDING-136 + BRIDGE; the :2071
  threshold display text consumes the SAME constants.
- Fallback :130: `player.salary || 1000000` -> `player.salary ?? 0`
  (nullish — a legitimate 0 passes; no wrong-scale literal)
- Canonical formatter: formatSalary (salaryCalculator.ts:1337)

ENV: prefix `NODE_ENV= `; node ~/.nvm/versions/node/v20.20.0/bin.

CONSTRAINTS:
- Only edit: src/src_figma/app/components/FinalizeAdvanceFlow.tsx
- Only create: src/src_figma/__tests__/offseason/
  FinalizeAdvanceFlowDenomination.test.tsx
- Do NOT touch: the season-transition/Phase-11 logic in this file,
  the isFranchiseContext gates (:219, :261, :270, :279, :314,
  disabled buttons :783/:835 — behavior preserved exactly),
  useOffseasonData.ts, getAllFranchisePlayers usage, the other three
  flows, FranchiseHome.tsx, frozen IV files
- Quote FINDING-136/140 for every change

EXPECTED OUTPUT:
1. calculateRookieSalary + grade table DELETED; :302 call-up path uses
   selectedPlayer.salary unchanged; all display sites that rendered
   the computed rookie salary (:1446, :1486, :1983 pre-diff) render
   the player's actual salary via formatSalary
2. Retirement-risk thresholds (:396-397) -> named canonical constants
   (33330 / 16665); :2071 display text consumes the same constants
3. Fallback :130 -> `?? 0`
4. Formatters :793, :2071 -> formatSalary; zero remaining raw-`M`/÷1e6
   salary strings
5. Sweep: grep -nE "1000000|1e6|10000000|5000000|1500000" -> zero
   functional hits
6. Tests (mutation-honest):
   T-A: call-up result salary === selectedPlayer.salary for a player
        whose grade-table value would have differed (kills the table)
   T-B: retirement risk crosses +15%/+10% at exactly 33330/16665
   T-C: a roster-list salary renders formatSalary output
   MUTATIONS: M1 reinstate grade-table recompute -> T-A RED;
   M2 revert thresholds to 10000000/5000000 -> T-B RED;
   M3 revert one formatter -> T-C RED (each shown RED, restored)

VERIFICATION: focused tests green; NODE_ENV= npm run build passes;
NODE_ENV= full suite confined to characterized baseline (same set as
F134-T2, incl. conditional solo-pass rule for order-flakes); sweep
grep zero hits.

FORMAT: files changed · changes (citing F-136/140) · mutation log ·
verification output · "F134-T3 complete" OR "BLOCKED: [exact reason]".
FAILURE PROTOCOL: if any deletion would touch season-transition or
gate logic -> STOP and report; line drift -> relocate by content,
report old->new; never assume intent — ask.

Use high reasoning effort. Think step-by-step.
```


---

## ADDENDUM: F134-T2 + F134-T3 PARALLEL EXECUTION (JK-approved 2026-06-12)

Applies to both contracts above. T2 and T3 MAY run as parallel Codex 5.5 |
high agents in the same worktree (files disjoint; no git worktrees — the
template ban stands). Modified verification:
1. Each agent runs ONLY: focused test file, mutation runs M1-M3, and its
   sweep greps. Each agent SKIPS the full suite and the build.
2. Report format gains a line: "PARALLEL MODE: full suite + build deferred
   to combined gate."
3. After BOTH agents report complete, the COMBINED GATE runs ONCE
   (Captain): NODE_ENV= npm run build + NODE_ENV= full suite over the
   combined diff, judged against the characterized baseline (fixed:
   wpaRuntimeBoundary, franchiseNarrativeEventEligibility; order-flakes
   conditional-solo: franchiseManualSmokeFixture, GameTrackerLaunchState,
   franchiseOffseasonGuards.component). Neither ticket is complete until
   the combined gate passes.
4. PRECONDITION: the F135-T1 + F134-T1 closure commit lands BEFORE
   parallel execution starts, so the tree carries only T2+T3 deltas.

---

## CONTRACT: F134-T2-AUDIT (drafted 2026-06-12)

**ROUTE: Fable 5 CLI | audit | high reasoning effort** (run in the same
session as F134-T3-AUDIT, sequentially; restore all mutations between)

```
You are the Delta Auditor for F134-T2 (AwardsCeremonyFlow canonical pass).
Audit against CONTRACT F134-T2 + the PARALLEL EXECUTION ADDENDUM above.

SCOPE OF DIFF: AwardsCeremonyFlow.tsx + the new
AwardsCeremonyFlowDenomination.test.tsx.
CARVE-OUTS (NOT scope violations): spec-docs/ Captain documentation-cycle
writes; the F134-T3 sibling diff (FinalizeAdvanceFlow.tsx + its test) —
verify by hash/diff that T2 did not edit the T3 files, then treat as
expected residue. Any OTHER file in the diff is an automatic MAJOR.

ENV: prefix `NODE_ENV= `; node ~/.nvm/versions/node/v20.20.0/bin.

DELTAS:
D1. SITES: :116 canonical pass-through (no *1e6); both vote sites consume
    ONE named divisor constant = 1666 with FINDING-139 + BRIDGE citation;
    clamp bounds unchanged; 4 display sites on engine formatSalary; grep
    -nE "1000000|1e6|500000" -> zero functional hits; no raw-M strings.
D2. SELECTION UNCHANGED: winner-selection / ranking logic (salary-as-
    proxy, C-6) byte-equivalent to pre-diff — only conversion, divisor,
    and display strings changed.
D3. VOTE MATH: verify T-B pins the exact divisor arithmetic (spread
    16660 -> +10 pts) and that the 1666 constant = Math.round(500000 /
    300.032521) — recompute it yourself.
D4. MUTATIONS M1-M3: re-run each, RED, restore byte-identical
    (hash + git status).
D5. PERSISTENCE UNCHANGED: saveAwards payload shape carries no salary
    field (offseasonStorage AwardWinner) — confirm the diff did not add
    one.
D6. COMBINED GATE (run once, covers T3 audit too — cross-reference):
    NODE_ENV= npm run build; NODE_ENV= full suite vs characterized
    baseline (conditional-solo rule for the 3 order-flakes); test count
    delta consistent with both new test files.

FORMAT: EVIDENCE LOG D1-D6 · DISAGREEMENTS (mandatory) · VERDICT:
"F134-T2 DELTA VERIFIED" / "DEVIATIONS — [n]" / "BLOCKED: [reason]"
FAILURE PROTOCOL: never patch; restore mutations; pre-audit git state
re-verified before reporting.

Use high reasoning effort. Think step-by-step.
```

---

## CONTRACT: F134-T3-AUDIT (drafted 2026-06-12)

**ROUTE: Fable 5 CLI | audit | high reasoning effort** (same session as
F134-T2-AUDIT)

```
You are the Delta Auditor for F134-T3 (FinalizeAdvanceFlow canonical pass
+ F-127 canon conformance). Audit against CONTRACT F134-T3 + the PARALLEL
EXECUTION ADDENDUM.

SCOPE OF DIFF: FinalizeAdvanceFlow.tsx + the new
FinalizeAdvanceFlowDenomination.test.tsx.
CARVE-OUTS: spec-docs/ Captain writes; the F134-T2 sibling diff
(AwardsCeremonyFlow.tsx + its test) — hash-verify T3 did not edit them,
then treat as residue. Any OTHER file: automatic MAJOR.

ENV: prefix `NODE_ENV= `; node ~/.nvm/versions/node/v20.20.0/bin.

DELTAS:
D1. F-140 CANON: calculateRookieSalary + grade table fully deleted (grep
    the file for the function name and any 1500000-class grade literal:
    zero hits); call-up path carries selectedPlayer.salary unchanged;
    the pre-diff display sites of the computed value now render actual
    salary via formatSalary.
D2. THRESHOLDS: named constants 33330/16665 = Math.round(X /
    300.032521) — recompute yourself; logic (:396-class) AND display
    (:2071-class) consume the SAME constants (no text/logic split).
D3. FALLBACK: `?? 0` (nullish) — verify a salary of 0 passes through
    and no 1e6-class literal remains; sweep grep
    "1000000|1e6|10000000|5000000|1500000" -> zero functional hits.
D4. GATES PRESERVED (critical): isFranchiseContext early-returns and
    disabled-button gates byte-equivalent; season-transition / Phase-11
    logic untouched by the diff — enumerate the diff hunks and confirm
    every hunk is roster-UI salary scope.
D5. MUTATIONS M1-M3: re-run each, RED, restore byte-identical.
D6. COMBINED GATE: if F134-T2-AUDIT already ran it this session,
    cross-reference its result; otherwise run it here (build + full
    suite vs characterized baseline, conditional-solo rule).

FORMAT: EVIDENCE LOG D1-D6 · DISAGREEMENTS (mandatory) · VERDICT:
"F134-T3 DELTA VERIFIED" / "DEVIATIONS — [n]" / "BLOCKED: [reason]"
FAILURE PROTOCOL: never patch; restore mutations; pre-audit git state
re-verified before reporting.

Use high reasoning effort. Think step-by-step.
```
