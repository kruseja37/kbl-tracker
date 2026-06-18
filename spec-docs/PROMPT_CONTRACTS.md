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

**Audit record (2026-06-12):** Fable dual verdict: **"F134-T2 DELTA VERIFIED"
+ "F134-T3 DELTA VERIFIED"** (one session, sequential, mutations restored
between; all six mutants killed by exactly their intended tests; hashes
verified across both audits — zero cross-contamination between sibling
diffs). T2 highlights: both vote paths route through one
calculateAwardWinnerVotePct consuming VOTE_PCT_SALARY_SPREAD_DIVISOR=1666
(Fable recomputed 500000/300.032521 independently); selection/ranking
byte-equivalent (C-6 stays parked); persisted AwardWinner shape unchanged.
T3 highlights: calculateRookieSalary + grade table fully deleted (zero
grade-literal hits); call-up carries salary AS-IS via
buildFinalizeAdvanceCallUpPlayer, modal renders "(unchanged at call-up)";
thresholds 33330/16665 recomputed independently, consumed by BOTH logic and
display; D4 critical check — zero diff lines touch isFranchiseContext /
season-transition / disabled gates, every hunk roster-UI salary scope.
Combined gate: build green; suite 7,201/4 of 7,205 (+7 exact); both
order-flakes FIRED and PASSED SOLO (4/4, 9/9) — first live exercise of the
conditional-solo rule, characterized status holds. Disagreements 3+3, none
MAJOR: T2 #3 formatAwardSalary = trivial wrapper (OK); T3 #2 extra :2062
display swap (in-spirit); T3 #3 T-A pins canon at helper level (helper is
the single salary authority — acceptable).
**Process note:** Codex ran the combined gate the addendum assigned to
Captain; harmless here (Captain spot-checked + Fable re-ran the gate), but
future parallel addenda will state: the combined gate is run by Captain or
the auditor, NEVER by a builder agent.


---

## CONTRACT: F134-T4 — DELETE ActiveTradeFlow legacy branch (drafted 2026-06-12)

**ROUTE: Codex 5.5 | high → Fable 5 CLI audit | high reasoning effort**
(HIGH-by-rule: trade state file, though the deleted code is unreachable)

```
You are the Dead-Code Surgeon for KBL Tracker's TradeFlow. This ticket
is a DELETION: remove the unreachable legacy trade UI in its entirety.
You add no features and re-denominate nothing — dead code does not get
fixed, it gets removed.

GOAL:
Delete ActiveTradeFlow and everything that exists only to serve it,
killing the last 4 FINDING-136 sites and ~1,200 lines of drift risk,
while leaving the live FranchiseTransactionConsole path byte-untouched.

SOURCE OF TRUTH:
- FINDING-136 + spec-docs/F134_F135_DISCOVERY_REPORT.md section 1.2
  (R5/R6 reachability proof: export branch at TradeFlow.tsx:1096;
  ActiveTradeFlow requires falsy franchiseId, which no caller produces
  — FranchiseHome:1409 always passes it)
- JK RULING (2026-06-12): DELETE rather than re-denominate; recommended
  disposition of the export branch = franchiseId becomes a REQUIRED
  prop and the falsy branch is removed entirely

ENV: prefix `NODE_ENV= `; node ~/.nvm/versions/node/v20.20.0/bin.

CONSTRAINTS:
- Only edit: src/src_figma/app/components/TradeFlow.tsx
- Permitted IF REQUIRED by the prop-type tightening: a caller-side type
  adjustment in FranchiseHome.tsx ONLY if the compiler demands it
  (report the exact error first; expected: none, since FranchiseHome
  already passes franchiseId)
- Do NOT touch: FranchiseTransactionConsole and the entire live console
  region — zero diff lines inside it; franchiseTradeAdapter.ts;
  useOffseasonState.ts; useOffseasonData.ts; the other three flows;
  frozen IV files
- Quote FINDING-136 for every deletion block

DELETION SCOPE (verify each is legacy-only by fresh grep before
deleting; anything with a live consumer gets REPORTED, not deleted):
1. ActiveTradeFlow function + every screen/section local to it
2. convertToLocalPlayer / convertToLocalTeam (legacy ×1e6 converters)
3. The mock-AI proposals block (incl. salaryImpact literals)
4. The local formatSalary (legacy ÷1e6) + the beat-reporter salary
   warning threshold
5. Legacy-only local types/constants/state hooks orphaned by 1-4
6. The export-branch conditional: TradeFlow renders the console path
   unconditionally; franchiseId becomes required in TradeFlowProps

EXPECTED OUTPUT:
1. grep -n "ActiveTradeFlow|convertToLocalPlayer|convertToLocalTeam"
   src/ -r -> zero hits anywhere
2. grep -nE "1000000|1e6|/ 1000000" TradeFlow.tsx -> zero functional
   hits (the last F-136 sites die with the branch)
3. Reported line-count delta (expect roughly -1,100 to -1,300)
4. The live console region byte-identical: produce a diff proof that
   no hunk falls inside the console code span
5. No new tests REQUIRED (deletion is pinned by grep + build + the
   existing guards coverage); if the prop tightening breaks any
   existing test, that test was pinning dead code -> BLOCK and report
   the test name + assertion, do NOT modify the test

VERIFICATION:
- NODE_ENV= npm run build -> passes (the compiler is the primary
  deletion-correctness check)
- NODE_ENV= npx vitest run src/src_figma/__tests__/franchiseMode/
  franchiseOffseasonGuards.component.test.tsx -> 24/24 (the live
  TradeFlow console canary)
- NODE_ENV= full suite -> characterized baseline only (fixed:
  wpaRuntimeBoundary, franchiseNarrativeEventEligibility; order-flakes
  conditional-solo: franchiseManualSmokeFixture, GameTrackerLaunchState,
  franchiseOffseasonGuards.component); count expected UNCHANGED at
  7,205 (no test files added or removed)

FORMAT: files changed · deletion blocks (each citing F-136 + the fresh
grep proving legacy-only) · console-region untouched proof ·
verification output · "F134-T4 complete" OR "BLOCKED: [exact reason]"
FAILURE PROTOCOL: any symbol in the deletion scope with a live consumer
-> report, do not delete; any test failure from prop tightening ->
BLOCK with specifics; any temptation to edit console code -> STOP;
never assume intent — ask.

Use high reasoning effort. Think step-by-step.
```


---

## ADDENDUM v2: F134-T4 + F135-T2 PARALLEL EXECUTION (2026-06-12)

Same pattern as the T2+T3 addendum with ONE correction baked in from that
arc's lesson: **the combined gate (build + full suite) is run by Captain or
the auditor, NEVER by a builder agent.** Each builder runs only its focused
verification (greps, focused tests, mutation runs where applicable) and
reports "PARALLEL MODE: combined gate deferred." Files are disjoint
(TradeFlow.tsx vs the F135-T2 list — verified no overlap). PRECONDITION
satisfied: closure commit 2dfc2d6 landed; tree carries only this pair's
deltas during execution. Expected suite-count movement is NONZERO this
time (F135-T2 adds one test and may remove dead-module test files) — the
combined gate reconciles the exact delta against both reports.

---

## CONTRACT: F135-T2 — dead-code cleanup batch (drafted 2026-06-12)

**ROUTE: Codex 5.5 | high → Fable 5 CLI audit | high reasoning effort**

```
You are the Dead-Code Surgeon for the F135 cleanup batch. Every deletion
in this contract must be INDEPENDENTLY re-proven dead by fresh grep
before you delete it. The discovery report's verdicts are your map, not
your evidence — anything with a live consumer gets REPORTED, not deleted.

SOURCE OF TRUTH:
- FINDING-137 + spec-docs/F134_F135_DISCOVERY_REPORT.md section 2
  (consumer table B-5..B-18) and section 4 (C-4, C-7)
- F135-T1 audit disagreement #2 (M2b test-strength gap)

ENV: prefix `NODE_ENV= `; node ~/.nvm/versions/node/v20.20.0/bin.

SCOPE — DELETE (each item: fresh grep for importers/references across
src/ excluding archived-* and the item's own files; zero hits required;
paste the grep; then delete):
D-1. src/hooks/useWARCalculations.ts (B-5)
D-2. src/components/GameTracker/PlayerCard.tsx,
     src/components/GameTracker/SeasonSummary.tsx,
     src/components/GameTracker/WARDisplay.tsx (B-5/B-6 orphan trio —
     careful: SeasonSummary name collides with the LIVE
     src/src_figma/app/pages/SeasonSummary.tsx; verify paths exactly)
D-3. src/src_figma/app/components/SeasonEndFlow.tsx (B-7)
D-4. src/src_figma/app/hooks/useSeasonStats.ts (C-7 dead duplicate —
     NOT src/hooks/useSeasonStats.ts, the live one)
D-5. The unused FranchiseStats interface in src/utils/
     franchiseManager.ts (B-12) — type-only deletion from a LIVE file;
     zero references required, file otherwise untouched
D-6. Test files belonging EXCLUSIVELY to modules deleted above (fresh
     grep each; report names + test-count impact)

SCOPE — CHANGE:
C-1. src/src_figma/hooks/useFranchiseData.ts (~:580): the computed
     totalGames (`?? 64`) is un-rendered per B-3. Fresh-grep every
     reader of the hook's totalGames return field AND nextGame
     .totalGames. ZERO readers -> delete the field from the return +
     the nextGame object + the computation. ANY reader -> BLOCK and
     report (do not re-source; that becomes a JK decision).
C-2. Add ONE test to src/hooks/__tests__/useSeasonStats.seasonLength
     .test.ts: resolveSeasonGamesForWAR({ gamesPerTeam: 0, ... })
     === 162 (closes the M2b surviving-mutant gap; gamesPerTeam <= 0
     and non-finite now pinned)

EXPLICITLY OUT OF SCOPE (documented exclusions — do NOT delete):
calibrationService.ts (candidate T12 recalibration seed);
tradeEngine.ts deadline fns (future trade-window design);
calendarEngine.ts (future schedule design); fanMoraleEngine.ts
(D3 design pending; protected class); FreeAgentSigning.contractValue
(forward-use field); archived-* dirs.

EXPECTED OUTPUT:
1. Per-item: the fresh grep (verbatim) proving zero consumers, then
   the deletion
2. C-1 resolution (deleted with grep proof, or BLOCKED with the reader)
3. C-2 test added; run focused: 7/7 (6 existing + 1 new)
4. Line-count delta per file; total files deleted
5. PARALLEL MODE: combined gate deferred

FOCUSED VERIFICATION (builder-scope only):
- NODE_ENV= npx vitest run src/hooks/__tests__/useSeasonStats
  .seasonLength.test.ts -> 7/7
- NODE_ENV= npx tsc --noEmit (type-level deletion check; full build
  belongs to the combined gate)
- grep sweeps: zero references to every deleted symbol/file

FORMAT: per-item evidence blocks · C-1/C-2 results · deltas ·
"F135-T2 complete" OR "BLOCKED: [exact item + reason]"
FAILURE PROTOCOL: ANY live consumer -> report, do not delete, continue
with remaining items, list partials at the end; name-collision doubt
(D-2) -> stop and report paths; never assume intent — ask.

Use high reasoning effort. Think step-by-step.
```


---

## CONTRACT: F134-T4-AUDIT (drafted 2026-06-12)

**ROUTE: Fable 5 CLI | audit | high reasoning effort** (same session as
F135-T2-AUDIT, sequential; the combined gate runs ONCE in this session
and covers both — per ADDENDUM v2 the gate is the auditor's, not a
builder's)

```
You are the Delta Auditor for F134-T4 (ActiveTradeFlow deletion). Audit
against CONTRACT F134-T4 + ADDENDUM v2.

SCOPE OF DIFF: TradeFlow.tsx (+ FranchiseHome.tsx ONLY if the contract's
compiler-demanded exception was exercised — if so, verify the hunk is
type-only). CARVE-OUTS: spec-docs/ Captain writes; the F135-T2 sibling
diff (its full file list) — hash/diff-verify T4 touched none of them.
Any OTHER file: automatic MAJOR.

ENV: prefix `NODE_ENV= `; node ~/.nvm/versions/node/v20.20.0/bin.

DELTAS:
D1. TOTALITY: grep -rn "ActiveTradeFlow|convertToLocalPlayer|
    convertToLocalTeam" src/ -> zero hits; grep -nE "1000000|1e6"
    TradeFlow.tsx -> zero functional hits. The last 4 FINDING-136
    sites are dead — FINDING-136 fully resolved pending your verdict.
D2. CONSOLE UNTOUCHED (critical): the live FranchiseTransactionConsole
    region is byte-identical — verify via diff hunk spans; zero hunks
    inside the console code. franchiseTradeAdapter.ts CLEAN.
D3. EXPORT SHAPE: TradeFlow renders the console path unconditionally;
    franchiseId required in props; FranchiseHome:1409-class call site
    type-checks; no orphaned legacy types/constants remain (sweep the
    file for unused declarations the deletion stranded).
D4. NO TEST PINNED DEAD CODE: confirm no existing test was modified or
    deleted by T4; guards canary 24/24.
D5. DELETION-ONLY CHARACTER: the diff contains no added logic beyond
    the prop-type tightening — enumerate added lines; anything beyond
    types/exports is a DEVIATION.
D6. COMBINED GATE (run once, covers F135-T2 too): NODE_ENV= npm run
    build; NODE_ENV= full suite vs characterized baseline (fixed:
    wpaRuntimeBoundary, franchiseNarrativeEventEligibility;
    order-flakes conditional-solo: franchiseManualSmokeFixture,
    GameTrackerLaunchState, franchiseOffseasonGuards.component).
    Reconcile the EXACT test-count delta against both builders'
    reports (T4 expects zero count change; F135-T2 reports +1 new test
    and any dead test files removed).

FORMAT: EVIDENCE LOG D1-D6 · DISAGREEMENTS (mandatory) · VERDICT:
"F134-T4 DELTA VERIFIED" / "DEVIATIONS — [n]" / "BLOCKED: [reason]"
FAILURE PROTOCOL: never patch; pre-audit git state re-verified before
reporting.

Use high reasoning effort. Think step-by-step.
```

---

## CONTRACT: F135-T2-AUDIT (drafted 2026-06-12)

**ROUTE: Fable 5 CLI | audit | high reasoning effort** (same session as
F134-T4-AUDIT)

```
You are the Delta Auditor for F135-T2 (dead-code cleanup batch). Audit
against CONTRACT F135-T2 + ADDENDUM v2.

SCOPE OF DIFF: the contract's D-1..D-6 + C-1/C-2 file list. CARVE-OUTS:
spec-docs/ Captain writes; the F134-T4 sibling diff (TradeFlow.tsx) —
hash-verify untouched by this ticket. Any OTHER file: automatic MAJOR.

ENV: prefix `NODE_ENV= `; node ~/.nvm/versions/node/v20.20.0/bin.

DELTAS:
D1. DEADNESS RE-PROVEN: for EVERY deleted file/symbol, re-run the
    zero-consumer grep YOURSELF (do not trust the builder's paste);
    special attention to the D-2 name collision — the LIVE
    src/src_figma/app/pages/SeasonSummary.tsx must be untouched and
    still imported by its route.
D2. LIVE-FILE SURGERY: franchiseManager.ts diff = the FranchiseStats
    interface removal ONLY; useFranchiseData.ts diff = the un-rendered
    totalGames removal ONLY (or BLOCKED per contract) — verify no
    behavioral hunk in either live file beyond the sanctioned ones,
    and that useFranchiseData's hook return type change breaks no
    consumer (compile + grep its destructuring sites).
D3. EXCLUSIONS HELD: calibrationService.ts, tradeEngine.ts,
    calendarEngine.ts, fanMoraleEngine.ts all CLEAN (git diff --quiet
    each) — the conservative-exclusion ruling was respected.
D4. M2b CLOSED: the new resolver test pins gamesPerTeam: 0 -> 162;
    re-run the previously-surviving mutant (relax the resolver guard
    to bare `!== null`) -> now RED; restore byte-identical.
D5. TEST-FILE ACCOUNTING: every removed test file belonged exclusively
    to a deleted module (re-grep); focused seasonLength run 7/7.
D6. COMBINED GATE: if F134-T4-AUDIT already ran it this session,
    cross-reference; otherwise run here. Reconcile exact count delta.

FORMAT: EVIDENCE LOG D1-D6 · DISAGREEMENTS (mandatory) · VERDICT:
"F135-T2 DELTA VERIFIED" / "DEVIATIONS — [n]" / "BLOCKED: [reason]"
FAILURE PROTOCOL: never patch; restore the D4 mutant byte-identical;
pre-audit git state re-verified before reporting.

Use high reasoning effort. Think step-by-step.
```


---

## F135-T2 ADDENDUM 1 — D-5 resolution (JK-approved 2026-06-12, Captain-executed)

Codex correctly BLOCKED D-5: FranchiseStats had one consumer — the
'FranchiseStats has expected shape' block in franchiseManager.contract
.test.ts (a contract test pinning dead API surface; zero production
consumers, triple-confirmed: discovery B-12, Codex fresh grep, Captain
grep). JK RULING: delete BOTH the interface and its test block (the test
was defending dead code against cleanup; no named future claim, unlike
the four excluded engines). Captain executed three surgical excisions:
the interface (franchiseManager.ts), the type import line, and the test
block (other 19 contract tests untouched). Verified: grep zero
FranchiseStats hits anywhere; contract test 19/19; tsc --noEmit clean.

## AUDIT NOTES for F134-T4-AUDIT + F135-T2-AUDIT (Captain, pre-handoff)

1. D-5 status for F135-T2-AUDIT D2/D3: franchiseManager.ts now carries
   the sanctioned FranchiseStats removal (ADDENDUM 1) — the audit's
   "BLOCKED-held, file CLEAN" expectation is superseded; verify the
   three excisions instead, and that contract test = 19 tests.
2. EXPECTED ARTIFACT: FranchiseHomeLaunch.test.tsx hunk = removal of a
   stale vi.mock stub for the deleted SeasonEndFlow (mock of a
   nonexistent module errors at resolution; build green post-deletion
   proves FranchiseHome never imported it). D-6-class. Codex
   UNDERREPORTED this file — flag the reporting gap, not the change.
3. T4 totality grep nuance: convertToLocalPlayer/convertToLocalTeam
   hits in FinalizeAdvanceFlow.tsx and RetirementFlow.tsx are
   independent same-named LOCAL functions of those flows, not TradeFlow
   references — zero ActiveTradeFlow hits anywhere is the real
   totality check. (Captain's T4 contract wording was over-broad.)
4. RetirementFlow swept clean for $M (Captain 2026-06-12); F-138 scope
   addendum logged (four stock-data flows, not three).
5. Combined-gate count expectation: 7,113 (7,205 - 3 dead test files
   [~92 tests] + 1 M2b test - 1 FranchiseStats contract test = exact
   reconciliation is the audit's D5/D6 job).
6. FranchiseHome.tsx T4 hunk = `franchiseId!` non-null assertion
   (compiler-demanded, type-only, single line).

**Audit record (2026-06-12):** Fable dual verdict: **"F134-T4 DELTA VERIFIED" +
"F135-T2 DELTA VERIFIED."** T4: totality proven (zero ActiveTradeFlow hits
anywhere; convertToLocal* survivors are independent file-local functions per
audit note 3); console region byte-identical by three-hunk arithmetic
(lines 162-1093 untouched); export unconditional, franchiseId required;
stranded-declaration sweep zero; numstat +22/−1,328; zero TradeFlow tests
touched. T2: every deadness grep re-proven by Fable itself; name-collision
guard held (live SeasonSummary page untouched + still routed); both live-file
surgeries exactly sanctioned (incl. ADDENDUM 1 three excisions, contract test
19/19); exclusions all CLEAN; M2b mutant re-applied -> RED, killed by exactly
the new test, restored hash-identical; 92 deleted tests accounted (21+41+30).
Combined gate: build green; suite 7,110/3 of 7,113 — EXACT reconciliation
(7,205 − 92 + 1 − 1); one flake fired, solo-green. Disagreements 2+3/0-MAJOR:
underreporting of the FranchiseHomeLaunch mock removal flagged as a builder
reporting-discipline gap (change itself sanctioned); NEW CANDIDATE C-8 —
second orphan useWARCalculations copy in src_figma/app/hooks (zero importers,
correctly out-of-scope, F135-T3-class). **FINDING-136 FULLY RESOLVED.**


---

# TV1 — TRUE VALUE CANONICAL PASS (build contract)
**Drafted:** 2026-06-12 | **Ratified rulings:** R-1..R-5 (JK, 2026-06-12, this session)
**ROUTE: Codex 5.5 | very high → Fable 5 CLI audit**
(persists new franchise state; standing rule: state/persistence = minimum
high; new persistence shape + post-game pipeline wiring justifies very high.
Audit non-negotiable.)

## Ratified rulings (binding inputs to this contract)
- **R-1 (scope):** TV1 = True Value canonical pass ONLY (audit slice 2).
  Designation slice (storage + projected, audit slices 3-4) = **TV2**,
  drafted immediately after TV1 verifies.
- **R-2 (method):** OPTION A — spec-faithful step-percentile lookup
  (salaryCalculator.ts calculateTrueValue) is THE canonical method. The
  preview's interpolated/average-rank math was never a deliberate design
  and is DELETED. Smoothing, if ever wanted, is a future spec amendment.
- **R-3 (peer-pool floor):** merge groups per spec; if a merged pool is
  still < 6, the existing whole-league fallback STAYS as a never-expected
  safety net (JK: RP pools will always be big enough to absorb CP), with
  a documenting test.
- **R-4 (trigger):** True Value recomputes + persists automatically on
  every completed regular-season game, immediately after successful WAR
  persistence, same seasonId scope. No manual trigger.
- **R-5 (trust):** after TV1, displayed True Value numbers ARE canonical,
  but NO consumer acts on them yet — designation/morale trust flags stay
  hard-typed false until TV2 flips them deliberately.

## Contract (handoff text)

```
You are a senior TypeScript engineer executing the True Value canonical pass
(TV1) for KBL Tracker.

GOAL:
Make True Value / Value Delta canonical: ONE spec-faithful implementation,
persisted per-player rows computed from canonical salary (T5) and persisted
season WAR (W1), wired into the post-game pipeline.

SOURCE OF TRUTH:
- SALARY_SYSTEM_SPEC_UPDATED.md, "True Value Calculation" (lines 516-658) —
  percentile machinery, merge groups, Value Delta classifications
- IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §3.8 — True Value applies
  downstream of canonical salary, unchanged; potency surplus is captured BY
  True Value, never an input to it (D15)
- MODE2_SYSTEMS_INTEGRATION_MAP.md §3.2 and §6 step 3
- R1' ruling: season length = gamesPerTeam config-truth; totalGames BANNED
- Ratified rulings R-1..R-5 (header above, JK 2026-06-12)

CONSTRAINTS:
- Only edit: src/engines/salaryCalculator.ts (True Value section only),
  src/utils/processCompletedGame.ts (one wiring hunk after the
  calculateAndPersistSeasonWAR call), src/utils/franchiseTrueValuePreview.ts,
  src/utils/franchiseValueInputs.ts (ONLY if WAR-source rewiring is required
  per DISCOVERY 1), ONE new persistence module
  (src/utils/franchiseTrueValueStorage.ts), and their test files.
- Do NOT touch: src/engines/ivEngine.ts, rosterEngineConstants.ts, the
  frozen IV oracle, tierParams.ts, warOrchestrator.ts internals,
  franchiseDesignations*.ts (TV2 scope), fanMoraleEngine.ts,
  fanFavoriteEngine.ts, any offseason flow.
- The canonical implementation is calculateTrueValue
  (src/engines/salaryCalculator.ts:986), step-percentile method per R-2.
  The preview's private math (rankPercentileByWar, salaryAtPercentile) is
  DELETED; the preview consumes the engine function. Trust flags in the
  preview/value-input contracts remain hard-typed false (R-5) — designation
  trust flips in TV2, not here.
- Persisted row shape: { franchiseId, seasonId, statsScopeId, playerId,
  trueValue, contractValue, valueDelta, warPercentile, position,
  peerPoolSize, calculationVersion, computedAt }. Salary input = canonical
  franchise salary (T5 path, getVisibleSafeFranchisePlayerSalary). WAR
  input = persisted season WAR rows written by calculateAndPersistSeasonWAR
  — never recomputed ad hoc, never scaled by totalGames.
- Persist trigger per R-4: in processCompletedGame, after successful WAR
  persistence, same seasonId scope. WAR persist failure → skip True Value
  persist and warn — never persist True Value from stale WAR.
- DISCOVERY 1 (report BEFORE implementing): trace whether
  franchiseValueInputs' warPreviewValues rows are the orchestrator-persisted
  WAR values or an independent derivation. Independent → rewire to persisted
  rows; identical → cite file:line proving it.
- DISCOVERY 2 (report only, NO changes): list every TeamHubContent.tsx
  True Value / value-delta display site and every franchiseDesignations.ts
  valueDelta consumption point (file:line). TV2 input.
- Quote spec section or ruling ID (R-1..R-5) for every change.
- Work directly on codex/franchise-v1-next. No new worktrees.
- EVERY changed file must appear in the report, including mechanically-
  forced test/mock adjustments.

EXPECTED OUTPUT:
- ONE True Value implementation in the codebase (grep for the deleted
  preview helpers returns zero); preview surface behavior preserved except
  where its interpolated numbers shift to the canonical step method —
  document the shift with one before/after example.
- New storage module with get/save keyed by franchise/season/scope/player;
  rows written on completed regular-season games after WAR persist.
- Mutation-pinned tests: (a) step-percentile golden cases consistent with
  the spec's True Value Examples table semantics; (b) merge-group +
  whole-league-fallback documenting test (R-3); (c) WAR-persist-failure →
  no True Value row; (d) totalGames never read (grep-pinned); (e) persisted
  row recomputes after a new completed game.

VERIFICATION:
- NODE_ENV= npm run build (node ~/.nvm/versions/node/v20.20.0/bin)
- NODE_ENV= npx vitest run [new + touched test files] — all green
- Full suite green except the characterized set (fixed failures:
  wpaRuntimeBoundary, franchiseNarrativeEventEligibility; order-flakes,
  conditional-solo: franchiseManualSmokeFixture, GameTrackerLaunchState,
  franchiseOffseasonGuards.component). Baseline 7,113/380; report exact
  new-test delta.
- grep -rn "rankPercentileByWar\|salaryAtPercentile" src → zero hits
- grep -rn "totalGames" src/utils/franchiseTrueValue* → zero hits

FORMAT:
1. Files changed (exact paths, incl. forced test/mock adjustments)
2. Changes made (each with spec/ruling ID)
3. DISCOVERY 1 + 2 findings (file:line evidence)
4. Verification result (paste exact output)
5. "TV1 complete" OR "BLOCKED: [exact reason]"

FAILURE PROTOCOL:
- Ambiguity → quote the exact section and ask
- Cannot open a file → stop and report the filename
- Change requires a file not listed above → stop and report
- Suite failure outside the characterized set → BLOCK; never bend code or
  tests to the suite
- Never summarize or batch changes. Never assume intent — ask.

Use very high reasoning effort. Think step-by-step.
```

**Execution record:** [pending — Codex run + Fable audit verdict logged here]


---

# TV1-AUDIT — Fable 5 CLI audit of the TV1 build (contract)
**Drafted:** 2026-06-12 | **Builder report:** Codex 5.5, "BLOCKED" only on
audit-tool availability (procedural misread — audit is this separate stage);
build side complete with full verification pasted.
**ROUTE: Fable 5 CLI | high reasoning effort**

```
You are the independent auditor for TV1 (True Value canonical pass).
You did not write this code. Assume failure until proven otherwise.

GOAL:
Verify the TV1 build against its contract (PROMPT_CONTRACTS.md, TV1 section,
rulings R-1..R-5) using fresh evidence. Verdict: "TV1 DELTA VERIFIED" or
itemized MAJOR/MINOR disagreements.

SOURCE OF TRUTH:
- TV1 contract + ratified rulings R-1..R-5 (PROMPT_CONTRACTS.md)
- SALARY_SYSTEM_SPEC_UPDATED.md "True Value Calculation" (516-658)
- IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §3.8 / D15
- FINDING-142 (FINDINGS_142_onwards.md) — the DISCOVERY-1 pWAR fix
- Audit against: git diff of the TV1 changeset on codex/franchise-v1-next

AUDIT DIRECTIVES (in priority order):
D1 — FINDING-142 blast radius. The pWAR-composition fix changes WAR preview
  totals for pitchers/two-way players, shifting percentiles and True Value
  across shared peer pools. Verify: (a) the combination math is
  bWAR + pWAR persisted rows, no double-count when a stat-row totalWar
  already includes both; (b) enumerate which existing tests' expected
  values changed because of it and confirm each change is this mechanism,
  not test-bending; (c) confirm the fix is minimal — no other value-input
  semantics altered.
D2 — Canonical method (R-2). calculateTrueValue is the ONLY implementation;
  step-percentile per spec; deleted helpers gone (re-run the greps
  yourself). Preview consumes the engine function; preview-only behavior
  otherwise preserved.
D3 — Persistence + trigger (R-4). Row shape per contract; written in
  processCompletedGame strictly AFTER successful WAR persistence, same
  seasonId scope; WAR failure → skip + warn, no stale-WAR rows. Mutation:
  force WAR persist failure, prove no TV row.
D4 — Trust flags (R-5). valueDeltaTrustedForDesignations and friends remain
  hard-typed false; zero new consumers act on TV (grep designations/
  morale/fanFavorite for new reads).
D5 — No-touch sweep. ivEngine.ts, frozen oracle, tierParams.ts,
  warOrchestrator.ts internals, franchiseDesignations*.ts, fanMoraleEngine,
  fanFavoriteEngine, offseason flows: prove untouched by the diff.
D6 — Builder report oddity: the before/after example cites "expected wins /
  baseline" fixture values (14.0/6.0 → 12.0/10.0). TV1 must not touch
  expected wins. Confirm this is fixture nomenclature in a TeamHub test,
  not scope creep; name the file:line.
D7 — Combined gate (auditor runs it, never the builder):
  NODE_ENV= npm run build; full suite. Reconcile counts EXACTLY:
  7,113 + 9 = 7,122 tests, 380 + 2 = 382 files; failures limited to the
  characterized set (fixed: wpaRuntimeBoundary,
  franchiseNarrativeEventEligibility; order-flakes conditional-solo:
  franchiseManualSmokeFixture, GameTrackerLaunchState,
  franchiseOffseasonGuards.component).
D8 — Mutation re-runs on the five contracted test categories (step-
  percentile goldens; merge-group/whole-league fallback; WAR-fail-no-row;
  totalGames grep-pin; recompute-on-new-game). Each mutant RED, killed by
  exactly its intended test; restore hash-verified.

CARVE-OUTS:
- Sibling spec-doc appends (PROMPT_CONTRACTS, FINDINGS_142_onwards,
  FRANCHISE_ENGINE_MAP D0-agenda note) are sanctioned session documentation,
  not build-diff violations.

FORMAT:
1. Verdict line first.
2. Per-directive evidence (commands + exact output).
3. Disagreements: MAJOR/MINOR, each with file:line.
4. New finding candidates if any.

Use high reasoning effort. Think step-by-step.
```

**Execution record:** [pending — Fable verdict logged here]


**Execution record (TV1, 2026-06-12):** Codex 5.5 | very high. Report:
5 product files + 5 test files; canonical step method sole implementation
(preview helpers deleted, preview delegates to engine); storage module
keyed franchise/season/scope/player; post-game persist gated on successful
WAR persistence; trust flags hard false. DISCOVERY 1 found + fixed a real
pre-existing defect (pWAR dropped from value-input WAR composition →
FINDING-142). DISCOVERY 2 inventory delivered (TeamHubContent.tsx:1641
display sites; franchiseDesignations.ts:31 trueValue input, NO valueDelta
consumer exists yet — TV2 must add it). Codex self-BLOCKED only on
audit-tool availability (procedural misread; build complete). Suite
7,119/7,122, build green, +9 tests / +2 files exact.

**Audit record (TV1-AUDIT, 2026-06-12):** Fable 5 CLI verdict:
**"TV1 DELTA VERIFIED."** All 8 directives pass; 6 mutations each killed by
exactly its intended test, restores hash-verified; M-142 revert probe
proved zero pre-existing expectations depend on the F-142 fix (method-shift
changes isolated to sanctioned R-2). Double-count ruled out at the
orchestrator write level (pwar never reaches batting totalWar). D6 oddity
resolved: "expected wins" values were downstream test arithmetic of the
step-method shift; expected-wins logic diff-CLEAN. Gate reconciled exactly
(7,113+9 / 380+2); one flake fired, solo-green. Disagreements 3 MINOR /
0 MAJOR: (1) separate IndexedDB database kbl-franchise-true-values vs
shared-DB convention — JK ruling needed before TV2 adds stores;
(2) position-normalization mapping (P→SP/RP, IF/OF→UTIL) is inferred
policy — ratify one line in TV2's contract; (3) computedAt wall-clock
nondeterminism — noted, no action.


---

# TV1-FIX — resolve TV1 audit MINORs 1+2 per JK rulings R-6/R-7 (contract)
**Drafted:** 2026-06-12 | **ROUTE: Codex 5.5 | high → Fable 5 audit**
(persistence relocation + computation change feeding persisted rows)

## Ratified rulings (JK, 2026-06-12 — CANONICAL, cite verbatim)
- **R-6 (position taxonomy + data-driven doctrine):** NO player may carry
  "P" as a position anywhere, and "IF/OF" is never a PRIMARY position.
  Pitcher primaries: SP, SP/RP, RP, CP. Position-player primaries: C, 1B,
  2B, SS, 3B, LF, CF, RF. Secondary-only additions: 1B/OF, OF, IF, IF/OF.
  No DH anywhere (standing ruling). In-season franchise decisions are
  DATA-DRIVEN: positions players ACTUALLY played during the season, never
  profile-label assumptions (a player may play most of a season at his
  secondary position, or many positions). Non-canonical labels reaching an
  engine are a DATA DEFECT to surface (skip-with-reason), NEVER to
  normalize away. Taxonomy block queued for next spec-cleanup batch
  (DH-row precedent).
- **R-7 (storage):** shared-DB convention confirmed (Elimination Mode
  key-prefix precedent). TV1's separate kbl-franchise-true-values DB was
  a divergence; True Value rows relocate to the shared database, and TV2's
  designation storage goes there too.

## Contract (handoff text)

```
You are a senior TypeScript engineer executing TV1-FIX for KBL Tracker.

GOAL:
Resolve TV1-AUDIT MINORs 1 and 2 per rulings R-6/R-7: relocate True Value
storage to the shared database, and replace position normalization with
strict canonical-label validation (skip-with-reason, never normalize).

SOURCE OF TRUTH:
- Rulings R-6/R-7 (TV1-FIX header above, JK 2026-06-12)
- TV1-AUDIT disagreements 1+2 (PROMPT_CONTRACTS.md, TV1-AUDIT record)
- TV1 contract row-shape and trigger semantics (unchanged by this fix)

CONSTRAINTS:
- Only edit: src/utils/franchiseTrueValueStorage.ts,
  src/engines/salaryCalculator.ts (normalizeTrueValuePosition site only),
  and their test files. Plus the shared-DB module ONLY for the additive
  store registration (X1 discovery names the exact file/pattern).
- Do NOT touch: processCompletedGame.ts trigger logic, calculateTrueValue
  step machinery, franchiseTrueValuePreview.ts, franchiseValueInputs.ts,
  all TV1 no-touch files.

X1 — Storage relocation (R-7): move True Value rows into the shared
  database following the existing store-addition pattern (DISCOVERY:
  identify the shared-DB module and its versioning convention FIRST;
  report file:line before implementing — the Feb-11 version-conflict
  class is the known hazard). Delete the kbl-franchise-true-values DB
  creation. NO data migration: pre-release, rows regenerate on the next
  completed game; state this in a code comment.
X2 — Position validation (R-6): DELETE normalizeTrueValuePosition's
  inferred mapping (P→SP/RP, IF/OF→UTIL). Replace with validation against
  the R-6 canonical PRIMARY set {SP, SP/RP, RP, CP, C, 1B, 2B, SS, 3B,
  LF, CF, RF}. Any other label → row skipped with an explicit reason
  naming the offending label (loud data-defect surfacing). No silent
  drops, no remapping, no DH.
X3 — DISCOVERY (report only, no changes): trace the source of
  franchiseValueInputs' valuePosition — is it derived from positions
  ACTUALLY PLAYED this season (R-6 data-driven doctrine) or from the
  profile primary label? Cite file:line. If profile-only, report as a
  finding candidate for TV2/D1; do not fix here.

EXPECTED OUTPUT:
- Zero references to kbl-franchise-true-values; True Value store lives in
  the shared DB; existing TV1 trigger/row-shape tests still green.
- grep -rn "normalizeTrueValuePosition" src → only the strict validator
  (or zero if renamed); no P/IF/OF/UTIL remapping logic anywhere in the
  True Value path.
- Mutation-pinned tests: (a) non-canonical label (e.g. "P") → skipped with
  reason naming the label; (b) every canonical primary accepted;
  (c) storage round-trip against the shared DB.

VERIFICATION:
- NODE_ENV= npm run build green
- NODE_ENV= npx vitest run [touched test files] green
- Full suite: characterized set only (baseline 7,122/382; report delta)

FORMAT:
1. Files changed (all, incl. forced test/mock adjustments)
2. Changes made (cite R-6/R-7 per change)
3. X1 + X3 discovery findings (file:line)
4. Verification output (exact)
5. "TV1-FIX complete" OR "BLOCKED: [exact reason]"

FAILURE PROTOCOL:
- Shared-DB versioning ambiguity → STOP and report before touching it
- Ambiguity elsewhere → quote the exact section and ask
- Suite failure outside the characterized set → BLOCK; never bend tests

Use high reasoning effort. Think step-by-step.
```

**Execution record:** [pending]


---

# TV1-FIX-AUDIT — Fable 5 CLI delta audit (contract)
**Drafted:** 2026-06-12 | **ROUTE: Fable 5 CLI | high reasoning effort**

```
You are the independent auditor for TV1-FIX. You did not write this code.
Assume failure until proven otherwise. Audit the git diff of the TV1-FIX
changeset (uncommitted, on codex/franchise-v1-next, post-1f3f2cc/163a756).

GOAL:
Verify TV1-FIX against its contract (rulings R-6/R-7). Verdict:
"TV1-FIX DELTA VERIFIED" or itemized MAJOR/MINOR disagreements.

DIRECTIVES:
D1 — trackerDb v13 upgrade safety (THE risk center; Feb-11 hazard class).
  Verify the bump follows the centralized single-upgrade-handler
  convention; all pre-existing stores preserved; franchiseTrueValueRows
  registration additive only; no destructive paths. Prove by reading the
  full upgrade handler, not the diff alone.
D2 — Storage delegation (R-7): franchiseTrueValueStorage delegates to
  getTrackerDb(); zero references to kbl-franchise-true-values (re-run the
  grep yourself); no-migration comment present; TV1 row-shape and
  processCompletedGame trigger semantics UNCHANGED (both files diff-CLEAN
  except sanctioned storage edits).
D3 — Strict validation (R-6): canonical-primary set exactly {SP, SP/RP,
  RP, CP, C, 1B, 2B, SS, 3B, LF, CF, RF}; non-canonical labels skip with
  a reason NAMING the label; zero remapping logic anywhere in the True
  Value path. Mutation: reintroduce a P→SP/RP remap → must go RED on
  exactly the skip test.
D4 — Suite reconciliation: baseline 7,122/382 → expect 7,125 total
  (+3: skip test, canonical-accept test, shared-DB round-trip), 382 files.
  Reconcile EXACTLY; characterized-set failures only; fired flakes pass
  solo.
D5 — No-touch sweep: processCompletedGame.ts trigger logic,
  calculateTrueValue step machinery, franchiseTrueValuePreview.ts,
  franchiseValueInputs.ts (X3 was report-only), all TV1 frozen files.
D6 — Captain pre-audit note to confirm: with R-6 enforcement, the salary
  spec's UTIL/BENCH merge-group rows become unreachable in the True Value
  path. Confirm dead-but-harmless (or refute); TV2 cleanup input either
  way.
D7 — FINDING-143 scope check: confirm the X3 fix was NOT attempted
  (valuePosition source unchanged) — deferred per contract.

CARVE-OUTS: sibling spec-doc appends (PROMPT_CONTRACTS, FINDINGS_142,
AUDIT_LOG) are sanctioned session documentation.

FORMAT: verdict line first; per-directive evidence (commands + output);
disagreements MAJOR/MINOR with file:line; new finding candidates.

Use high reasoning effort. Think step-by-step.
```

**Execution record:** [pending]


---

# RULING R-8 — Effective Position & Peer-Pool Taxonomy (JK-ratified 2026-06-12)
**Canonical for True Value, TV2 designations, and the FINDING-143 fix.
Supersedes the TV1-FIX strict-label-only approach as the END STATE
(R-6 taxonomy remains the label vocabulary).**

1. **Effective position (ALL position players):** plurality-with-incumbency
   over position-player games actually played this season. Day-zero
   incumbent = profile primary position. The incumbent holds on any tie;
   re-resolution only when another position takes an OUTRIGHT plurality
   lead. Deterministic, recomputed per completed game, self-correcting.
2. **Peer pools:** position players pool by effective position; spec merge
   groups apply below MIN_POOL_SIZE as today.
3. **Reserve pool:** position players below a starts-share threshold
   (CALIBRATE constant, ~"started <40% of team games to date") pool in ONE
   league-wide Reserve pool — bench roles are fungible; per-position bench
   pools would be too thin. Expensive benched players cratering vs reserve
   salaries is a FEATURE (true Albatross story). §17 minimum-games floors
   stack on top.
4. **Pitchers:** pool by PROFILE role (SP, SP/RP, RP, CP) in v1 — role
   identity is sticky and the IV usage model (startShare) is role-priced;
   usage-based role re-resolution is CALIBRATE/v2 (CP undetectable from
   appearance data without save-situation inference). CP↔RP merge absorbs
   edge unfairness.
5. **Two-way players (the trait):** EXCLUDED from all single-position peer
   pools (hybrid salaries would pollute distributions). Valued
   COMPOSITIONALLY: arm True Value = pWAR percentile vs profile-role pool's
   salaries; bat True Value = batting+fielding+baserunning WAR percentile
   vs the RESOLVED trait position's pool; True Value = arm TV + bat TV
   (mirrors IV's compositional pricing; consumes the orchestrator's
   already-separate persisted WAR rows UNCOMBINED).
6. **Trait-group resolution:** Two Way (C) → C. Two Way (IF) → plurality-
   with-incumbency over {1B, 2B, SS, 3B}; Two Way (OF) → over {LF, CF, RF}.
   IF/OF are resolution SCOPES, never positions. Pre-data day-zero anchor
   per group (e.g. IF→2B, OF→CF) = CALIBRATE; build contract must include
   a discovery step on what trait holders' profiles actually carry.
7. **Emergency appearances excluded:** cross-domain cameos (position player
   mop-up pitching; pitcher pinch-running) never count toward effective
   position; only the Two Way trait unlocks dual valuation.

**Placement:** FINDING-143 closes via this ruling. Implementation home
(TV2 vs D1 vs its own ticket) = JK decision at TV2 drafting; R-8 is the
quoted source of truth either way. Taxonomy block queued for the next
spec-cleanup batch alongside R-6.


---

# TV2 — DESIGNATION SLICE: canonical storage + projected designations (contract)
**Drafted:** 2026-06-12 | **ROUTE: Codex 5.5 | very high → Fable 5 CLI audit**
(new persistence + post-game state pipeline; audit non-negotiable)
**Scope = audit slices 3+4 ONLY.** Season-end locking (slice 5) and
Captain/Fan Hopeful (slice 6) are LATER tickets. EP1 (R-8 effective
positions) follows TV2; until then peer pools are profile-position — a
DOCUMENTED LIMITATION, not a defect (FINDING-143 closes with EP1).

## Quoted gospel (MODE_2_CANON_FRANCHISE_SEASON_UPDATED.md §17 — verbatim authority)
- All performance designations (MVP, Ace, Fan Favorite, Albatross)
  "recalculate after every completed game"; mid-season values are ALWAYS
  projected (dotted badge); locking ONLY at season end (NOT this ticket).
- §17.1 Team MVP: highest total WAR on team; min games 20% of season
  (min 5).
- §17.2 Ace: highest pWAR among team pitchers; min 20% of season as
  pitcher (min 4); min pWAR 0.5.
- §17.3 Fan Favorite: HIGHEST POSITIVE Value Delta (True Value − Contract);
  min games 10% of season (min 3); carries over until 10% of new season.
- §17.4 Albatross: MOST NEGATIVE Value Delta; same floors; same carryover;
  15% trade discount per C-056 (discount wiring is NOT this ticket —
  offseason flows flag-gated per F-138).
- §17.8 badge visuals: dotted border + "Proj." prefix for all mid-season
  badges; colors per the §17.8 table.

## Contract (handoff text)

```
You are a senior TypeScript engineer executing TV2 (designation slice) for
KBL Tracker.

GOAL:
Canonical designation storage + projected MVP/Ace/Fan Favorite/Albatross
recalculated after every completed game, consuming persisted WAR and
canonical True Value rows. Projected-only: zero locked effects.

SOURCE OF TRUTH:
- TV2 header above: quoted §17 gospel (criteria, cadence, floors,
  carryover, badge rules) — cite per change
- Rulings R-5 (trust flips deliberately HERE for projected designations),
  R-6/R-7 (taxonomy, shared DB), R-8 noted as EP1's future input
- FRANCHISE_V1_AUDIT_SALARY_DESIGNATIONS_ANALYTICS.md slices 3-4 (record
  shape)
- R1' ruling: season-length floors derive from gamesPerTeam config-truth;
  totalGames BANNED

PHASE 0 — DISCOVERY (report and STOP for Captain sign-off before building):
- Inventory the existing designation surface: franchiseDesignations.ts,
  franchiseDesignationEligibility.ts, franchiseDesignationMoraleBridge.ts,
  franchiseDesignationMoraleContextAdapter.ts,
  franchiseDesignationReadinessReport.ts (+ any others grep finds).
  Classify each ADOPT / AMEND / WIRE / REBUILD with file:line evidence —
  "it exists" is a grep result, not a memory.
- Confirm per-player games-played counts (batting games; pitching
  appearances) are derivable from persisted season stat rows for the §17
  floors; cite file:line.
- Confirm the trueValue input at franchiseDesignations.ts:31 and the
  ABSENCE of any valueDelta consumer (TV1 DISCOVERY 2 baseline).

PHASE 1 — BUILD (after sign-off):
- Storage: designation records in the SHARED trackerDb (R-7; additive
  store, version bump follows the centralized upgrade-handler convention —
  the v13 hazard discipline applies). Record shape per audit slice 3:
  { franchiseId, seasonId, teamId, playerId, type, status
  ('projected'|'locked'), sourceInputs, calculationVersion, lockedAt
  (null this ticket), carryover metadata }.
- Engine: projected recalc per §17 criteria. MVP/Ace from persisted WAR
  rows (team-scoped). Fan Favorite/Albatross from CANONICAL valueDelta —
  read persisted True Value rows (franchiseTrueValueStorage); this is the
  new valueDelta consumer. Floors from gamesPerTeam config-truth (reuse
  the resolveSeasonGamesForWAR pattern; NEVER totalGames). Below-floor →
  no projected holder (not a default holder).
- Trigger: processCompletedGame, after True Value persistence succeeds
  (extending the TV1 gate chain: WAR → TV → designations; any upstream
  failure skips downstream with a warn).
- Trust: flip valueDeltaTrustedForDesignations TRUE for the PROJECTED path
  only, with a documented limitation string: "peer pools are
  profile-position until EP1 (R-8)". Locked effects (Fame writes, morale
  writes, trade discount) remain OFF — grep-pinned absent.
- Cleanup (folded): remove the unreachable UTIL/BENCH merge-group rows
  from POSITION_MERGE_GROUPS (dead under R-6 enforcement; cite TV1-FIX
  audit D6).
- Badges: projected badge data exposed per §17.8 (dotted/"Proj." semantics)
  for TeamHub display sites (TV1 DISCOVERY 2 inventory); display wiring
  minimal — data contract first.

CONSTRAINTS:
- Do NOT touch: ivEngine.ts, frozen oracle, tierParams.ts,
  warOrchestrator.ts internals, calculateTrueValue step machinery,
  fanMoraleEngine.ts, fanFavoriteEngine.ts (legacy — Phase 0 classifies
  it), offseason flows, season-end/locking logic.
- Mutation-pinned tests: each §17 criterion; each floor (incl. Ace
  pWAR≥0.5); below-floor → no holder; upstream-failure → no designation
  write; carryover metadata round-trip; locked-effects-absent grep-pin;
  totalGames grep-pin.

VERIFICATION:
- NODE_ENV= npm run build green; focused tests green; full suite =
  characterized set only (report exact delta vs post-TV1-FIX baseline).

FORMAT:
Phase 0 report → STOP. Then: files changed (all); changes (cite §17
line/ruling per change); verification output (exact); "TV2 complete" OR
"BLOCKED: [exact reason]".

FAILURE PROTOCOL:
- Phase 0 reveals a REBUILD-class conflict with existing designation code
  → STOP, report, await ruling
- Ambiguity → quote the exact section and ask
- Suite failure outside the characterized set → BLOCK; never bend tests

Use very high reasoning effort. Think step-by-step.
```

**Execution record:** [pending]


**Execution record (TV1-FIX, 2026-06-12):** Codex 5.5 | high. R-7: True
Value store relocated into shared kbl-tracker DB (TRACKER_DB_VERSION 13,
additive guarded store franchiseTrueValueRows; standalone DB opener
deleted; no-migration comment). R-6: inferred remaps deleted; strict
12-label canonical-primary validator; skips name the offending label.
X1: trackerDb.ts:16-17 centralized single-handler convention confirmed.
X3: valuePosition = profile primaryPosition (franchiseValueInputs.ts:502)
→ FINDING-143 (CONFIRMED-OPEN, closes via R-8/EP1). Suite 7,122/7,125,
build green. Codex self-BLOCKED on the same audit-tool misread (build
complete).

**Audit record (TV1-FIX-AUDIT, 2026-06-12):** Fable 5 CLI verdict:
**"TV1-FIX DELTA VERIFIED."** 7/7 directives; full 314-line upgrade-handler
read (not diff-only): all ~25 pre-existing stores contains-guarded, zero
deleteObjectStore, v13 block additive-only, zero second openers of
kbl-tracker (Feb-11 class cleared). Mutation (P→SP/RP remap reintroduced)
RED on exactly the skip test; restore hash-verified. Gate exact: 7,125/382
(+3/+0); flake fired, solo 4/4. D6 reachability proven: UTIL/BENCH could
never reach getPositionPeerPool post-R-6. Disagreements 2 MINOR / 0 MAJOR:
(1) builder deleted the dead UTIL/BENCH merge rows — beyond contract
letter, behavior-neutral by D6 proof, pre-completes TV2's folded cleanup;
Captain recommends RATIFY (JK confirmation pending); TV2's cleanup item is
hereby pre-completed. (2) R-6 residue in the salary-calculation path →
FINDING-144.

**PHASE 0 SIGN-OFF (Captain, 2026-06-12) — TV2 PHASE 1 ADDENDUM:**
REBUILD direction APPROVED. Binding decisions:
1. Canonical projected designation rows in shared trackerDb (additive v14,
   same hazard discipline as v13) are the SINGLE source of designation
   truth. Player-embedded designation persistence RETIRES.
2. syncActiveTeamMvpAceDesignationsFromEligibility and its TeamHub
   load-time call (TeamHubContent.tsx:1605) are REMOVED, not bypassed —
   display surfaces never write state (one-directional-writes ruling).
   TeamHub READS canonical rows; badges per §17.8 projected semantics.
3. Stale player-embedded designation fields: stop writing, leave inert
   (pre-release, regenerable); scrubbing them is a logged cleanup
   candidate, NOT TV2 scope.
4. Per Phase 0 classifications: franchiseDesignations.ts REBUILD around
   canonical storage ('projected'|'locked' statuses only — 'active'
   retires); Eligibility AMEND (add §17 floors via gamesPerTeam pattern
   + batting games / pitching appearances+starts rows cited in Phase 0;
   unblock FanFav/Albatross via valueDelta from getFranchiseTrueValueRows);
   ReadinessReport AMEND (trust flips projected-only + limitation string);
   morale bridges ADOPT as guardrails — effects stay OFF;
   fanFavoriteEngine remains NO-TOUCH (retirement = future cleanup once
   unreferenced).
5. Explicit Phase 1 only-edit list: franchiseDesignations.ts,
   franchiseDesignationEligibility.ts,
   franchiseDesignationReadinessReport.ts, trackerDb.ts (v14 additive
   block only), processCompletedGame.ts (extend the gate chain hunk),
   TeamHubContent.tsx (sync removal + badge read wiring), ONE new storage
   module (franchiseDesignationStorage.ts), and their test files. All
   other Phase 0-inventoried files: read-only.
6. Added test pin: zero designation writes occur on TeamHub mount
   (mutation: reintroduce the sync call → RED).
All other TV2 contract terms unchanged. Proceed to Phase 1.


---

# TV2-AUDIT — Fable 5 CLI audit of the TV2 build (contract)
**Drafted:** 2026-06-12 | **ROUTE: Fable 5 CLI | high reasoning effort**

```
You are the independent auditor for TV2 (designation slice). You did not
write this code. Assume failure until proven otherwise. Audit the git diff
of the TV2 changeset (uncommitted, post-7b8b031) against the TV2 contract
+ Phase 0 sign-off addendum (PROMPT_CONTRACTS.md).

GOAL: verdict "TV2 DELTA VERIFIED" or itemized MAJOR/MINOR disagreements.

DIRECTIVES:
D1 — trackerDb v14: full-handler read (v13 discipline). Additive only,
  contains-guarded, zero destructive paths, no second kbl-tracker opener.
D2 — Sync removal pin: syncActiveTeamMvpAceDesignationsFromEligibility and
  its TeamHubContent.tsx:1605 call GONE; zero designation writes on
  TeamHub mount. Mutation: reintroduce the sync call → must go RED on
  exactly the mount pin test.
D3 — §17 fidelity vs the QUOTED gospel in the TV2 header: MVP highest team
  WAR / floor 20% (min 5); Ace highest team pWAR / 20% as pitcher (min 4)
  / pWAR≥0.5; FanFav highest POSITIVE valueDelta / Albatross most NEGATIVE
  / floors 10% (min 3); below-floor → NO holder (never a default);
  CARRYOVER METADATA present on FanFav/Albatross rows and round-trip
  tested (builder report silent on this — verify or flag). Floors derive
  from gamesPerTeam config-truth + the batting-games / pitching
  appearances+starts rows cited in Phase 0; totalGames grep-pinned absent.
D4 — Gate chain: WAR → True Value → projected designations in
  processCompletedGame; each upstream failure skips downstream with warn.
  Mutation: force TV-persist failure → no designation write.
D5 — valueDelta consumer: FanFav/Albatross read PERSISTED canonical rows
  via getFranchiseTrueValueRows — never recomputed, never preview values.
D6 — Trust scope: readiness flips projected-only WITH the limitation
  string "peer pools are profile-position until EP1 (R-8)"; locked
  effects (Fame/morale/trade-discount writes) grep-pinned absent;
  morale bridges still guardrail-only.
D7 — Suite reconciliation, FULL enumeration (PRIORITY — Captain flag):
  net +2 (7,125→7,127) cannot be netted. Enumerate every ADDED and every
  DELETED test from the diff; each deletion must be a test defending the
  retired 'active'/player-embedded path (sanctioned by the REBUILD) —
  any other deletion is a MAJOR. Reconcile totals exactly.
D8 — File enumeration (Captain flag): list every changed file from the
  diff; builder named ~6 of "12 paths" — the gap repeats the logged
  reporting-discipline lesson; adjudicate each unnamed change.
D9 — Eligibility disposition (Captain flag): addendum point 4 said AMEND
  franchiseDesignationEligibility.ts (floors + valueDelta unblock);
  builder's list omits it. Determine: logic relocated into the rebuilt
  franchiseDesignations.ts (adjudicate as deviation, possibly sanctioned)
  or amendment skipped (MAJOR — §17 gates would be bypassable via the
  old eligibility surface).
D10 — No-touch sweep: fanFavoriteEngine.ts, fanMoraleEngine.ts,
  calculateTrueValue machinery, warOrchestrator internals, ivEngine/
  oracle/tierParams, offseason flows, season-end/locking logic — all
  diff-CLEAN. Stale embedded fields: writes stopped, fields inert (no
  scrub attempted).

CARVE-OUTS: sibling spec-doc appends are sanctioned session documentation.
FORMAT: verdict first; per-directive evidence (commands + output);
disagreements MAJOR/MINOR with file:line; new finding candidates.

Use high reasoning effort. Think step-by-step.
```

**Execution record:** [pending]


**Execution record (TV2, 2026-06-12):** Codex 5.5 | very high, two-phase.
Phase 0 caught the REBUILD-class conflict (TeamHub load-time writes
'active' MVP/Ace onto player records) → Captain sign-off addendum 7b8b031.
Phase 1: shared-DB v14 franchiseDesignationRows (one holder per team per
type); §17 projected engine (MVP/Ace from persisted WAR, FanFav/Albatross
from canonical valueDelta rows, floors from gamesPerTeam, below-floor = no
holder); gate chain WAR → TV → designations; TeamHub sync side effect
REMOVED, badges read canonical rows; trust flipped projected-only with the
EP1 limitation string. Builder report named ~6 of 12 paths (gap → audit
D8) and was silent on carryover (resolved by audit D3).

**Audit record (TV2-AUDIT, 2026-06-12):** Fable 5 CLI verdict:
**"TV2 DELTA VERIFIED."** 10/10 directives; 2 mutations killed (D2
mount-write mutant: 22 RED across distributed write-pins; D4 gate mutant:
exactly its test), restores hash-verified 12/12. D7 full enumeration:
13 added / 11 deleted = +2 exact (7,127/382 new baseline); all 11
deletions sanctioned (3 rename-subsumptions verified line-by-line, 8
defended the retired 'active'/embedded path). D9: AMEND-eligibility
implemented as RELOCATION; bypass risk REFUTED (zero write paths remain
through eligibility) but stale 'active'/persistable semantics still feed
context surfaces → FINDING-145. Disagreements 4 MINOR / 0 MAJOR:
(1) eligibility consistency debt (F-145); (2) builder reporting gap
REPEAT — next contract template gains "list every path in git status";
(3) mount pin distributed across 22 write-pins vs one named test —
invariant stronger in practice, phrasing mismatch only; (4) §17.8 badge
backgrounds are dark-palette variants of the table's "Light X" prose —
JK ratification pending.


---

# RULING R-9 — Reserve-Pool Starts Source + F-145 Placement (JK-ratified 2026-06-12)
**Canonical for EP1 and the R-8 pt-3 Reserve pool.**

1. "Starts" means actual starting-lineup membership — NEVER an innings
   or appearances proxy. The defensive-replacement bench player (many
   appearances, few starts) is exactly who the Reserve pool must
   capture; appearance/innings proxies misclassify him. Innings-based
   approximations REJECTED.
2. Source hierarchy (build executes in order; choice is pre-ruled):
   a. DERIVE — if starting lineups are recoverable from persisted game
      records (GameTracker sets the starting nine pre-game), count
      starts from existing data. Zero new persistence.
   b. SNAPSHOT — otherwise, persist a starters snapshot at game
      completion (both teams' starter playerIds + positions on the
      completed-game record). Pre-release: no backfill; old fixtures
      regenerate.
3. Starts-share denominator = that team's COMPLETED games to date
   (count of completed game records; NOT totalGames, NOT schedule
   rows). RESERVE_STARTS_SHARE_THRESHOLD stays CALIBRATE (default
   0.40).
4. Codex STOPs only if BOTH paths hit a structural conflict — the
   path choice itself is already ruled here.

**Also ruled (same session): FINDING-145 placement = SLICE 5** —
season-end locking rewrites designation status vocabulary; the
'active' retirement + embedded-field scrub belong there. EP1 stays
single-purpose.


---

# EP1 — R-8 EFFECTIVE-POSITION ENGINE (contract)
**Drafted:** 2026-06-12 | **ROUTE: Codex 5.5 | very high → Fable 5 CLI audit**
(True Value input semantics change; TV-level golden regression
non-negotiable; heaviest ticket since T5)
**Closes FINDING-143.** FINDING-145 = slice 5 per R-9 (NOT this
ticket). FINDING-144 salary-path remaps = spec-cleanup batch (NOT this
ticket). EP1-AUDIT contract drafted during Phase 1 build (pipelining).

## Quoted source of truth — RULING R-8 points 1-7 + RULING R-9
(both above in this file, verbatim authority; cite point per change)
R-8 governs: (1) plurality-with-incumbency effective position for ALL
position players (day-zero incumbent = profile primary; incumbent
holds ties; re-resolution only on OUTRIGHT plurality lead; recomputed
per completed game); (2) pools by effective position, merge groups
below the peer floor as today; (3) league-wide Reserve pool below the
starts-share threshold; (4) pitchers pool by PROFILE role v1; (5)
two-way trait holders EXCLUDED from single pools, valued
compositionally (arm TV vs profile-role pool + bat TV vs resolved
trait position, consuming orchestrator WAR rows UNCOMBINED); (6) Two
Way (C)→C, (IF)→plurality over {1B,2B,SS,3B}, (OF)→over {LF,CF,RF} —
resolution SCOPES, never positions; day-zero anchors CALIBRATE; (7)
emergency cross-domain cameos never count. R-9 governs the starts
source (DERIVE → SNAPSHOT hierarchy, innings proxies rejected,
completed-games denominator).

## Pinned anatomy (Captain-verified 2026-06-12; Codex re-verifies and cites)
- franchiseValueInputs.ts:502 — valuePosition = player.primaryPosition
  (THE FINDING-143 site)
- franchiseTrueValueStorage.ts:107 — valuePosition → detectedPosition
  (strict R-6 validation); TRUE_VALUE_CALCULATION_VERSION lives here
- salaryCalculator.ts:969 POSITION_MERGE_GROUPS / :985
  getPositionPeerPool / :1015 calculateTrueValue (step-percentile
  machinery NO-TOUCH; pool construction IS in scope)
- seasonStorage.ts PlayerSeasonFielding.gamesByPosition — played-
  position APPEARANCES source (plurality input)
- salaryCalculator.ts:700-701 — invents 'Two Way (OF)' when
  player.isTwoWay carries no trait label (R-6-class inventing remap
  inside the detection path — D-B flags it)

## Contract (handoff text)

```
You are a senior TypeScript engineer executing EP1 (R-8 effective-
position engine) for KBL Tracker.

GOAL:
Replace profile-position peer pooling with R-8 effective-position
pooling in the True Value pipeline: plurality-with-incumbency for
position players, league-wide Reserve pool per R-9 starts-share,
compositional two-way valuation, trait-group resolution scopes.
Closes FINDING-143.

SOURCE OF TRUTH:
- RULING R-8 points 1-7 + RULING R-9 (PROMPT_CONTRACTS.md) — cite the
  point per change
- R-6 taxonomy (label vocabulary unchanged; strict validation stands)
- R1' ruling: totalGames BANNED; season-length denominators from
  gamesPerTeam config-truth; R-9 starts-share denominator = team
  COMPLETED games to date
- Pinned anatomy in the EP1 header above (re-verify, then cite)

PHASE 0 — DISCOVERY (report and STOP for Captain sign-off before
building):
- D-A Starts source (R-9 hierarchy): determine whether starting
  lineups are recoverable from persisted game records — file:line
  evidence either way. Report DERIVE or SNAPSHOT as the build path.
  If SNAPSHOT: name the exact completed-game record type and the
  write site, for the sign-off only-edit list. Innings/appearance
  proxies are REJECTED (R-9 pt 1) — do not propose them.
- D-B Two-way detection: inventory what trait holders ACTUALLY carry —
  trait label strings, player.isTwoWay flag, profile primaryPosition
  values. Flag salaryCalculator.ts:700-701 (invented 'Two Way (OF)').
  Report the canonical detection source EP1 should use.
- D-C Persisted WAR row shape: confirm batting and pitching WAR rows
  are retrievable UNCOMBINED per player (R-8 pt 5 requires it);
  file:line.
- D-D Pool-construction blast radius: every caller of
  calculateTrueValue / getPositionPeerPool beyond the canonical
  persistence path; every consumer of
  FranchiseValueInputRow.valuePosition.
- D-E Day-zero anchors: report profile primaryPosition distribution
  of current Two Way (IF)/(OF) holders so JK can set CALIBRATE
  anchors at sign-off.
- D-F Recalc determinism: confirm effective-position resolution can
  run inside the post-game gate chain (WAR → TV → designations) with
  inputs available at that point; identify where incumbency state
  lives (derived fresh each recalc from season rows + profile anchor
  vs persisted) — propose, with the determinism argument, for
  sign-off.

PHASE 1 — BUILD (after sign-off; only-edit list finalized in the
sign-off addendum):
- Effective-position resolution module (new): position players only;
  plurality-with-incumbency per R-8 pt 1; cameo exclusion per pt 7
  (position-player pitching appearances and pitcher position
  appearances never count); deterministic — same inputs, same output.
- Starts counting per the D-A path (R-9): DERIVE from existing
  records, or SNAPSHOT starter playerIds + positions on game
  completion. Starts-share = player starts / team completed games to
  date.
- valuePosition (franchiseValueInputs.ts:502) becomes effective
  position for position players; PROFILE role for pitchers (pt 4,
  behavior unchanged); two-way holders tagged for the compositional
  path (pt 5), never assigned a single-pool valuePosition.
- Pool construction: Reserve membership (starts-share <
  RESERVE_STARTS_SHARE_THRESHOLD, CALIBRATE constant, default 0.40)
  routes to ONE league-wide Reserve pool; otherwise effective-
  position pool with existing merge-group + league fallback below
  TRUE_VALUE_MIN_PEER_POOL_SIZE. Step-percentile machinery
  (getPercentile/getValueAtPercentile) UNTOUCHED.
- Two-way compositional valuation: arm TV = pWAR percentile vs
  profile-role pool salaries; bat TV = batting+fielding+baserunning
  WAR percentile vs resolved trait-position pool; True Value =
  arm TV + bat TV; consumes persisted WAR rows UNCOMBINED (pt 5);
  trait-group scopes per pt 6.
- TRUE_VALUE_CALCULATION_VERSION bumped; rows persist the effective
  position used; readiness/limitation strings drop "peer pools are
  profile-position until EP1 (R-8)" and document Reserve/two-way
  semantics + the D-A starts-source path taken.
- Designation engine criteria (§17) UNCHANGED — it consumes upgraded
  True Value rows automatically.

CONSTRAINTS:
- Do NOT touch: ivEngine.ts, frozen oracle, tierParams.ts,
  warOrchestrator.ts internals, step-percentile machinery, §17
  designation criteria/floors, fanMoraleEngine.ts, offseason flows,
  salary-path remaps (FINDING-144 — cleanup batch), eligibility
  'active' semantics (FINDING-145 — slice 5 per R-9).
- TV-level GOLDEN REGRESSION: capture pre-EP1 True Value rows for the
  fixture league; post-EP1 diff must attribute EVERY changed row to a
  sanctioned cause (effective ≠ profile position, Reserve membership,
  two-way compositional). Unattributed delta = BLOCKED.
- Mutation-pinned tests: incumbency tie-hold; outright-plurality
  flip; day-zero anchor; cameo exclusion (both directions); Reserve
  threshold boundary; defensive-replacement case (high appearances,
  low starts → Reserve); two-way single-pool exclusion; compositional
  sum; trait-scope resolution per group; pitcher profile-role
  stability; calculationVersion bump; totalGames grep-pin.

VERIFICATION:
- NODE_ENV= npm run build green; focused tests green; full suite =
  characterized set only (exact delta vs 7,127/382); golden
  regression artifact attached to the report.

FORMAT:
Phase 0 report → STOP. Then: files changed (list EVERY path in git
status, including mechanically-forced test/mock adjustments); changes
(cite the R-8/R-9 point per change); verification output (exact);
golden regression attribution table; "EP1 complete" OR "BLOCKED:
[exact reason]".

FAILURE PROTOCOL:
- BOTH R-9 starts paths structurally blocked → STOP at Phase 0,
  await ruling
- Any REBUILD-class conflict with existing code → STOP, report
- Ambiguity → quote the exact R-8/R-9 point and ask
- Suite failure outside the characterized set → BLOCK; never bend
  tests

Use very high reasoning effort. Think step-by-step.
```

**Execution record:** [pending]


---

# RULING R-10 — Effective-Position Plurality Unit = STARTS (JK-ratified 2026-06-12)
**Refines R-8 pt 1 for EP1.** The plurality count runs over per-game
STARTING positions (GameHeader.startingLineups), not all appearances.
Rationale: a start is the manager's deliberate role assignment (the
R-8 role framing); sub cameos must not flip peer pools; the Reserve
pool already keys on starts — one ordered data source. Players the
distinction "misses" (many sub appearances, few starts) land in the
Reserve pool, where exact position is moot. Appearances-based
plurality is the documented CALIBRATE upgrade path — the plurality
input is a single swap point in the effective-position module; pay
the event-scan cost later only if real play shows mispooling.

**PHASE 0 SIGN-OFF (Captain, 2026-06-12) — EP1 PHASE 1 ADDENDUM:**
Codex Phase 0 report VERIFIED (Captain re-checked every load-bearing
citation: eventLog.ts GameHeader startingLineups/startingPitchers/
isComplete/date + getGameHeadersForScope; TWO_WAY_TRAIT_POSITION +
hasTwoWayTrait; bwar/rwar/fwar/totalWar + pwar row shapes; two-way
holder profiles). Binding decisions:
1. D-A: DERIVE approved. Starts counted from persisted
   GameHeader.startingLineups via getGameHeadersForScope
   ({ isComplete: true }), scoped per season. Replay ordered by
   (date, gameId). ZERO new persistence.
2. R-10 governs the plurality unit (STARTS). Captain-surfaced basis:
   incumbency is history-dependent, so resolution REPLAYS the season
   in game order each recalc; starting lineups are the only ordered
   per-game position source — per-game sub positions would require
   full event-stream scans every recalc (rejected as the default).
3. D-B: two-way detection = canonical trait labels via
   TWO_WAY_TRAIT_POSITION only. salaryCalculator.ts:700-701 inventing
   path is NOT a detection source; residue stays untouched (F-144
   cleanup batch).
4. D-E anchors RATIFIED: Two Way (C)→C, Two Way (IF)→2B,
   Two Way (OF)→CF (pre-data day-zero anchors per R-8 pt 6).
5. D-F: incumbency derived FRESH each recalc by ordered replay from
   day-zero anchor; NO persisted incumbency state. Determinism: same
   headers + same WAR/fielding rows + same anchors → same effective
   position.
6. Only-edit list FINAL: franchiseValueInputs.ts,
   franchiseTrueValueStorage.ts, franchiseTrueValuePreview.ts,
   salaryCalculator.ts (pool construction ONLY — step-percentile
   machinery untouched), NEW src/utils/franchiseEffectivePosition.ts,
   franchiseDesignationReadinessReport.ts, and their test files.
   eventLog.ts is READ-ONLY (consume getGameHeadersForScope as-is).
   All other Phase 0-inventoried files: read-only.
7. Added test pins: (a) incumbency path-dependence — profile 2B,
   early outright SS lead, later 3-3 tie → SS holds (replay
   correctness; mutation: tie falls to profile primary → RED);
   (b) sub-appearance exclusion — plurality counts starts only
   (mutation: count gamesByPosition appearances → RED);
   (c) anchor pin — zero-start Two Way (IF) resolves to 2B.
All other EP1 contract terms unchanged. Proceed to Phase 1.


---

# EP1 — EXECUTION RECORD (Codex 5.5 | very high, Phase 1 build)
**2026-06-12.** New franchiseEffectivePosition.ts (ordered starts-replay,
incumbent tie-hold, Reserve threshold 0.40, cameo exclusion, anchors
C→C/IF→2B/OF→CF) + pool-construction changes in salaryCalculator (step-
percentile machinery untouched) + value-inputs/storage/preview/readiness
wiring; TRUE_VALUE_CALCULATION_VERSION → v2. Self-reported green (focused
151/151, tsc clean, build green, suite "7,136/383"). Captain reconciliation
NFL flagged the builder file/count underreport (FOURTH instance) pre-audit.
Build code UNCOMMITTED pending audit verdict. Audited by Opus 4.8 Max
(Fable unavailable) — verdict NOT VERIFIED, D8 BLOCK (see EP1-AUDIT record
below). Closure deferred to post-EP1-GOLDEN.


---

# EP1-AUDIT — Fable 5 CLI audit of the EP1 build (contract)
**Drafted:** 2026-06-12 | **ROUTE: Fable 5 CLI | high reasoning effort**
(True Value input semantics changed; golden regression + replay
correctness are the primary targets; audit non-negotiable)

**AUDITOR SUBSTITUTION (JK-ratified 2026-06-12):** Fable 5 CLI
UNAVAILABLE this session. EP1 audit routed to **Opus 4.8 | Max** as
the independent auditor. Triangle PRESERVED — auditor (Opus) ≠ builder
(Codex); the rule protects auditor-≠-builder, not Fable-identity.
Conditions: SAME contract verbatim (this block, commit 667fccf); same
ten directives + mutations; block-on-missing-golden-table holds;
adversarial stance ("assume failure") carries over unchanged. CAVEAT:
Opus-as-auditor is UNCHARACTERIZED — a "DELTA VERIFIED" verdict here is
this configuration's first; JK browser pass carries extra weight on
the audit leg accordingly.

```
You are the independent auditor for EP1 (R-8 effective-position
engine). You did not write this code. Assume failure until proven
otherwise. Audit the git diff of the EP1 changeset (uncommitted,
post-f8d5f82) against the EP1 contract + RULING R-8 + R-9 + R-10 +
the Phase 0 sign-off addendum (PROMPT_CONTRACTS.md).

GOAL: verdict "EP1 DELTA VERIFIED" or itemized MAJOR/MINOR
disagreements.

DIRECTIVES:

D1 — File enumeration (PRIORITY — third repeat of the reporting gap):
  List EVERY changed path from `git status --short` (modified, new,
  untracked-but-staged). Builder named 6 source files + "tests for the
  same surfaces"; actual is 6 source + new franchiseEffectivePosition.ts
  + 5 test files (incl. src_figma/__tests__/engines/salaryCalculator
  .test.ts). Adjudicate each path: in the addendum point-6 only-edit
  list, or a MAJOR scope breach. eventLog.ts MUST be absent from the
  diff (read-only pin); any edit there is a MAJOR.

D2 — Suite reconciliation, FULL enumeration: baseline 7,127/382 →
  reported 7,136/383 (+9 tests / +1 file). Enumerate every ADDED test;
  the +1 file is franchiseEffectivePosition.test.ts (confirm). Confirm
  all 4 reported failures are the CHARACTERIZED set only
  (wpaRuntimeBoundary, franchiseNarrativeEventEligibility, order-flakes
  franchiseManualSmokeFixture + GameTrackerLaunchState) — re-run each
  order-flake solo to confirm green in isolation. Any non-characterized
  failure → BLOCK.

D3 — R-10 plurality unit = STARTS (mutation-pinned): effective position
  counts GameHeader.startingLineups membership ONLY, never
  gamesByPosition appearances. Mutation: repoint the plurality count at
  fielding gamesByPosition → must go RED on the sub-appearance-exclusion
  test. Confirm the test exists and is real (not a tautology).

D4 — Incumbency replay correctness (R-8 pt 1, the hardest logic):
  resolution replays completed games in (date, gameId) order; day-zero
  incumbent = profile primary (or trait anchor); incumbent HOLDS on any
  tie; re-resolution ONLY on an OUTRIGHT plurality lead. Mutation: make
  a tie fall to current-plurality-leader (or profile) instead of the
  incumbent → must go RED on the path-dependence test (profile 2B,
  early outright SS lead, later 3-3 tie → SS holds). Confirm
  determinism: no persisted incumbency state (grep-pin); same inputs →
  same output.

D5 — Reserve pool (R-8 pt 3 / R-9): starts-share < 0.40 (CALIBRATE
  constant, confirm the name + default) routes to ONE league-wide
  Reserve pool; denominator = team COMPLETED games to date (NOT
  totalGames — grep-pin absent; NOT schedule rows). Mutation: flip the
  comparator or swap the denominator → RED on the threshold-boundary
  test. Confirm the defensive-replacement case (high appearances, low
  starts) lands in Reserve.

D6 — Two-way compositional valuation (R-8 pt 5/6): trait holders
  EXCLUDED from single-position pools; detection via
  TWO_WAY_TRAIT_POSITION labels ONLY (NOT player.isTwoWay; NOT the
  salaryCalculator.ts:700-701 invented path — confirm that path is
  untouched). True Value = arm TV (pWAR percentile vs profile-role pool
  salaries) + bat TV (batting+fielding+baserunning WAR percentile vs
  resolved trait-position pool), consuming persisted WAR rows
  UNCOMBINED. Trait scopes: (C)→C, (IF)→plurality over {1B,2B,SS,3B}
  anchor 2B, (OF)→over {LF,CF,RF} anchor CF. Mutation: combine the two
  WAR sources before percentile, or assign a two-way holder a single
  pool → RED on the composite/exclusion tests. Confirm zero-start
  Two Way (IF) resolves to 2B (anchor pin).

D7 — Step-percentile machinery UNTOUCHED (contract NO-TOUCH): the
  percentile fns (getPercentile/getValueAtPercentile) are byte-clean in
  the diff; only pool CONSTRUCTION (getPositionPeerPool +
  trueValuePool/RESERVE/exclusion plumbing) changed. Confirm via diff
  that calculation internals were not edited.

D8 — TV-level GOLDEN REGRESSION (PRIORITY): obtain the builder's
  pre/post True Value attribution table (contract-required artifact). If
  ABSENT → MAJOR (contract deliverable missing). If present: every
  changed True Value row must attribute to a SANCTIONED cause
  (effective ≠ profile position, Reserve membership, two-way
  compositional). Spot-check ≥3 rows against the engine by hand:
  one position player whose effective ≠ profile, one Reserve member,
  one two-way holder. Any UNATTRIBUTED delta → BLOCK/MAJOR.

D9 — calculationVersion bump: TRUE_VALUE_CALCULATION_VERSION changed
  (semantics changed → version must move). Confirm the new value is
  persisted on rows and the readiness limitation string dropped "peer
  pools are profile-position until EP1 (R-8)" and now documents
  Reserve/two-way + the starts-source path.

D10 — No-touch sweep: ivEngine.ts, frozen oracle, tierParams.ts,
  warOrchestrator internals, §17 designation criteria/floors,
  fanMoraleEngine.ts, offseason flows, salary-path remaps (F-144),
  eligibility 'active' semantics (F-145) — all diff-CLEAN.

CARVE-OUTS: sibling spec-doc appends are sanctioned session
documentation.

FORMAT: verdict first; per-directive evidence (commands + output);
disagreements MAJOR/MINOR with file:line; new finding candidates;
explicit confirmation that FINDING-143 is closed by this changeset.

Use high reasoning effort. Think step-by-step.
```

**Execution record:** [pending]
 — see verdict below.

**Execution record (EP1-AUDIT, 2026-06-12):** Opus 4.8 | Max
(substituted for Fable, JK-ratified; triangle preserved auditor≠builder).
**VERDICT: NOT "EP1 DELTA VERIFIED" — 1 MAJOR (BLOCK) / 4 MINOR.**
Engine logic correct + well-architected; ALL FOUR mutations killed
RED→restore→GREEN (byte-identical sha restores verified): D3 starts-only
plurality, D4 incumbency tie-hold (SS→3B flip under mutation), D5 Reserve
strict-`<` boundary, D6 two-way uncombined composition (bat WAR 2→5 fold
caught). D1 PASS (13 paths, all in only-edit list; eventLog absent — read-
only pin holds). D2 PASS (7,140 total = baseline 7,127 +13 / 0 deletions;
383 files = +1; 4 failures = characterized set, both hard failures
reproduce on CLEAN HEAD → EP1-independent, both order-flakes pass solo).
D7 PASS (step-percentile fns byte-clean; only pool construction changed).
D9 PASS (version → 'true-value-effective-position-v2', persisted both
paths). D10 PASS (all no-touch surfaces diff-clean; F-144 invented path
untouched). **D8 ❌ MAJOR/BLOCK:** golden-regression attribution table
ABSENT (repo/+/tmp/fixtures searched; builder conceded) → FINDING-146.
MINOR #1 → FINDING-147 (live stale limitation string in designation rows).
MINOR #2/#3/#4 → non-finding dispositions (FINDINGS_142_onwards.md).
FINDING-143: implemented + code-verified + mutation-proven, NOT delta-
certified (gated on D8). Working tree left pristine (diff 58,403 B, 13
paths, both probed files restored). NEXT: EP1-GOLDEN (Codex produces the
table) → D8-only re-audit → closure.


---

# EP1-GOLDEN — TV golden-regression table (closes FINDING-146 D8 block)
**SUPERSEDED 2026-06-12 by EP1-GOLDEN-R — NEVER EXECUTED.** Its Phase 0
(harness discovery) ran and correctly found no ready fixture; but its
fixture question ("reuse harness vs minimal overlay vs real data") spun
into the EXTRACT detour. EP1-GOLDEN-R resolves it: deterministic
ADVERSARIAL SYNTHETIC fixture, Node script, no browser. Text retained for
the reasoning trail; the Phase 0 finding (no existing full-league TV
harness) carries forward into R.
**Drafted:** 2026-06-12 | **ROUTE: Codex 5.5 | high**
(scoped artifact generation, NOT logic — engine already mutation-proven;
this produces the contract-required PRIORITY deliverable the EP1 build
omitted)

## Why this exists
EP1-AUDIT (Opus 4.8 Max) returned NOT VERIFIED on ONE ground: the TV-level
golden-regression attribution table (contract D8 / FINDING-146) was never
produced. Engine logic is code-verified + mutation-proven (D1-D7, D9-D10
PASS; 4 mutations killed). This ticket delivers ONLY that table, then a
D8-only re-audit closes EP1. No engine changes.

## Contract (handoff text)

```
You are a senior TypeScript engineer producing the EP1 golden-regression
deliverable for KBL Tracker. This is an EVIDENCE artifact, not a logic
change.

GOAL:
Produce a pre/post True Value attribution table over the fixture league
that proves EVERY True Value row that changed between pre-EP1 (HEAD
f8d5f82) and post-EP1 (current working tree) attributes to a SANCTIONED
cause: (1) effective position ≠ profile position, (2) Reserve-pool
membership, (3) two-way compositional valuation. Any UNATTRIBUTED delta
is the finding the whole table exists to surface — report it, do not
hide it.

SOURCE OF TRUTH:
- EP1-AUDIT contract D8 (PROMPT_CONTRACTS.md) — the three sanctioned
  causes and the "zero unattributed delta" bar
- RULING R-8 / R-9 / R-10 + Phase 0 sign-off addendum — what each
  sanctioned cause means
- FINDING-146 (FINDINGS_142_onwards.md) — the exact deliverable gap

PHASE 0 — HARNESS DISCOVERY (report and STOP for Captain sign-off before
generating):
- H-A Does a runnable harness exist to compute True Value rows over the
  fixture league OUTSIDE React? Search: existing test fixtures that build
  a LeagueContext / full-league player set; any season-simulator or
  franchise-engine-discovery output; scripts under spec-docs or repo root
  that already drive calculateTrueValue / getFranchiseTrueValueRows over
  many players. Report file:line for anything found.
- H-B What is the canonical FIXTURE LEAGUE for this regression? Identify
  the player dataset the existing TV tests already use (or the most
  representative full-league fixture). It MUST contain: position players
  whose played-starts differ from profile primary; at least one likely
  Reserve member (low starts-share); at least one Two Way trait holder
  (the audit found Fenomeno IF, Hall/Ankiel OF). Confirm coverage of all
  three sanctioned causes exists in the chosen fixture; if a cause is
  unrepresented, report it (the table cannot prove what the fixture
  cannot exercise).
- H-C Build path decision: if H-A finds a usable harness → REUSE it
  (name it). If NOT → propose a MINIMAL standalone extraction script
  (Node, reads the fixture, runs the canonical TV path pre and post,
  emits a row-keyed diff) — name the exact file you would add and where.
  Do NOT write it until sign-off.

PHASE 1 — GENERATE (after sign-off):
- Run the canonical True Value path over the fixture league at pre-EP1
  state and post-EP1 state. Pre-EP1 = the logic at f8d5f82 (use git to
  obtain the prior engine; do NOT hand-reconstruct it). Post-EP1 =
  current working tree.
- Emit a table keyed by playerId with columns: playerName, profile
  primaryPosition, EP1 effective position (or Reserve / two-way),
  pre-EP1 trueValue, post-EP1 trueValue, delta, ATTRIBUTION
  (one of: UNCHANGED / effective≠profile / Reserve / two-way-composite /
  UNATTRIBUTED).
- Every nonzero delta MUST carry a non-UNATTRIBUTED attribution. Any
  UNATTRIBUTED row is a BLOCKING finding — list it explicitly with the
  player and the unexplained delta.
- Save the table as a committed artifact:
  spec-docs/EP1_GOLDEN_REGRESSION.md (human-readable table + a one-
  paragraph summary: N players, N changed, breakdown by attribution,
  count of UNATTRIBUTED).

CONSTRAINTS:
- Do NOT modify any EP1 engine/source file. If generating the table
  requires a NEW script only, that script is the sole code addition and
  must not import-cycle into shipping code paths. If you believe an
  engine file MUST change to produce the table, STOP — that is a finding,
  not a license to edit.
- Do NOT commit the EP1 build code (it stays uncommitted for the D8 re-
  audit against the live diff).
- The fixture-league run must use the CANONICAL TV path (calculateTrueValue
  via the franchise storage/preview entry), not a reimplementation.

VERIFICATION:
- NODE_ENV= npm run build green (if a script was added); the table
  artifact exists and is internally consistent (every nonzero delta
  attributed); report the UNATTRIBUTED count explicitly (target: 0).

FORMAT:
Phase 0 report → STOP. Then: files added (exact paths); how the pre/post
states were obtained (git commands); the attribution summary (N total /
N changed / breakdown / UNATTRIBUTED count); "EP1-GOLDEN complete" OR
"BLOCKED: [exact reason]" OR "UNATTRIBUTED DELTA FOUND: [rows]".

FAILURE PROTOCOL:
- Fixture cannot exercise a sanctioned cause → report at Phase 0, await
  ruling (table would be incomplete)
- Producing the table appears to require an engine edit → STOP, report
- Any UNATTRIBUTED delta → STOP after Phase 1, report the rows (this is
  the real defect the table hunts; do not paper over it)

Use high reasoning effort. Think step-by-step.
```

**Execution record:** [pending]


---

# EP1-GOLDEN-EXTRACT — pull real franchise data from the preview app
**SUPERSEDED 2026-06-12 — NEVER EXECUTED.** Abandoned after a scope-creep
recognition (JK + Captain): chasing real played-season data for D8 walked
the plan from "write a table" → "extract browser IndexedDB" → "script a
season" → "Playwright game-player." Root cause: Captain over-read D8's
"fixture league" as demanding EMPIRICAL realism when it needs only
COVERAGE (the three sanctioned causes exercised). A deterministic
ADVERSARIAL SYNTHETIC fixture satisfies D8 — the synthetic concern was
ever only about the engine hand-authoring ANSWERS, never about synthetic
INPUTS. Absent Fable (which would likely have accepted a synthetic
coverage fixture directly), the real-data road was a detour. Superseded by
EP1-GOLDEN-R below. Contract text retained for the reasoning trail.
**Drafted:** 2026-06-12 | **ROUTE: Codex 5.5 | high**
(infrastructure + inventory only — NO table generation, NO engine edits;
resolves the EP1-GOLDEN H-B fixture gap with REAL played-season data
instead of a synthetic overlay)

## Why this exists
EP1-GOLDEN Phase 0 found no fixture exercising all three sanctioned
causes; the synthetic player pool has no game history (no effective-
position or Reserve cases). JK has real franchise data in the deployed
preview app (https://kbl-tracker.vercel.app/), but it lives in that
browser profile's IndexedDB — unreachable from the filesystem. This
ticket extracts it via a Playwright attach to JK's own Chrome, then
INVENTORIES coverage. The table itself is the next ticket, only after we
confirm the data exercises the three causes. Env pinned (Captain-
verified): node/npx at ~/.nvm/versions/node/v20.20.0/bin; Chrome at
/Applications/Google Chrome.app; Playwright 1.60 + chromium installed.

## Contract (handoff text)

```
You are a senior TypeScript engineer building a data-extraction +
inventory tool for KBL Tracker. This is INFRASTRUCTURE, not a logic
change and not the golden table.

GOAL:
Extract the real franchise data from JK's running Chrome (preview app
IndexedDB) to a committed JSON fixture, then report an INVENTORY of
whether that data exercises EP1's three sanctioned causes. STOP after
the inventory — do not generate the golden-regression table.
SETUP (JK performs; script depends on it):
- JK fully quits Chrome, then relaunches with remote debugging against
  the DEFAULT profile (so the existing IndexedDB is visible):
  /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
    --remote-debugging-port=9222
  Do NOT pass a fresh --user-data-dir — that opens an empty profile
  WITHOUT the franchise data (the per-profile-storage trap).
- JK navigates to https://kbl-tracker.vercel.app/, opens the franchise
  so its stores populate, confirms in DevTools > Application >
  IndexedDB that franchise data is present, then tells you to proceed.

PHASE 0 — DISCOVERY (report and STOP before writing the script):
- Identify EVERY IndexedDB database + object store the EP1 True Value
  path depends on: event-log game headers (startingLineups — the
  starts source), season stat rows (batting bwar/rwar/fwar/totalWar,
  pitching pwar), franchise players (profile primaryPosition, isTwoWay,
  trait labels), franchise config (gamesPerTeam). Cite the DB names +
  store names from the codebase (initEventLogDB, seasonStorage,
  franchisePlayerStorage, etc.) with file:line — "it exists" is a grep
  result, not a memory.
- Confirm the Playwright connectOverCDP attach pattern against
  endpoint http://localhost:9222 (NOT a fresh chromium launch — the
  whole point is JK's existing IndexedDB).
- Name the exact files you will add. Report and STOP.

PHASE 1 — BUILD + EXTRACT + INVENTORY (after sign-off):
- Add scripts/ep1-extract-preview-data.mjs: connectOverCDP to
  localhost:9222, find the app page/context, read ALL stores
  identified in Phase 0 via page.evaluate over IndexedDB, write the
  raw dump to spec-docs/data/ep1-preview-fixture.json (gitignored if
  large; otherwise committed). Deterministic, read-only — the script
  NEVER writes to the app's IndexedDB.
- Add scripts/ep1-inventory.mjs (or fold into the same script): from
  the dumped fixture, compute and print an INVENTORY:
  * total completed games (headers with isComplete + startingLineups)
  * per-player START COUNTS by position (from startingLineups, ordered
    by date,gameId) — flag any player whose plurality start position
    != profile primaryPosition (EFFECTIVE-POSITION cause present?)
  * per-player starts-share vs team completed games — flag any below
    0.40 (RESERVE cause present?)
  * each Two Way trait holder (Fenomeno/Hall/Ankiel or others) — do
    they appear with game history + WAR rows? (TWO-WAY cause present?)
  * whether persisted WAR rows exist at all (bwar/pwar populated)
- Write the inventory as spec-docs/EP1_FIXTURE_INVENTORY.md: the three
  cause-coverage verdicts (PRESENT / ABSENT, with the specific
  players), game count, WAR-row presence. This is the deliverable that
  decides whether the golden table can run on real data or needs JK to
  play more games.

CONSTRAINTS:
- Do NOT generate the golden-regression table (next ticket, gated on
  this inventory).
- Do NOT modify any EP1 engine/source file or the app's IndexedDB.
- Do NOT commit the EP1 build code (still uncommitted for D8 re-audit).
- The script is the only code addition; it must not import-cycle into
  shipping paths.
- If connectOverCDP finds no app page or an EMPTY franchise DB → STOP,
  report (likely the wrong Chrome profile per the SETUP note); do not
  fabricate a fixture.

VERIFICATION:
- The fixture JSON exists and is non-empty; the inventory .md exists
  with the three cause-coverage verdicts explicitly stated. Report the
  game count and the three PRESENT/ABSENT verdicts in the handoff.

FORMAT:
Phase 0 report → STOP. Then: files added (exact paths); how the attach
was made (CDP endpoint, page found); the INVENTORY (game count, WAR-row
presence, three cause verdicts with named players); "EP1-GOLDEN-EXTRACT
complete — [N] games, causes [X/Y/Z]" OR "BLOCKED: [exact reason]".

FAILURE PROTOCOL:
- Empty/missing franchise DB on attach → STOP (wrong profile)
- connectOverCDP cannot reach localhost:9222 → STOP (Chrome not
  launched with the debug flag, or already running without it)
- Any cause ABSENT in the inventory → report it as the finding; JK
  decides whether to play more games (this is success, not failure —
  the inventory did its job)

Use high reasoning effort. Think step-by-step.
```

**Execution record:** [pending]


---

# EP1-GOLDEN-R — adversarial synthetic fixture golden regression (closes FINDING-146 D8)
**Drafted:** 2026-06-12 | **ROUTE: Codex 5.5 | high → audit by current independent auditor (Opus 4.8 Max while Fable unavailable)**
(scoped artifact generation, NOT engine logic — engine mutation-proven;
supersedes EP1-GOLDEN + EP1-GOLDEN-EXTRACT)

## Why this, and why synthetic is correct
EP1-AUDIT passed 9/10 + killed 4 mutations; the ONLY block is D8 — no
golden-regression table. D8 needs COVERAGE (every TV delta attributes to
a sanctioned cause), not empirical realism. A DETERMINISTIC ADVERSARIAL
SYNTHETIC fixture satisfies it: synthetic INPUTS are fine; the engine —
not the fixture author — computes the True Values, so no answer is hand-
authored. The honesty guarantee is that the fixture is built to PROBE the
engine (boundary + conflict cases), its construction is logged, and the
auditor judges whether it was a fair test. No browser, no played season.

## The three sanctioned causes the fixture MUST exercise (adversarially)
1. EFFECTIVE-POSITION ≠ PROFILE: a position player whose plurality of
   STARTS is at a position different from profile primaryPosition —
   INCLUDING a near-tie case (e.g. profile 2B, 4 SS starts vs 3 2B
   starts) to stress incumbency, and a clean-flip case.
2. RESERVE: a player whose starts-share is below 0.40 of team completed
   games — INCLUDING one sitting exactly AT the 0.40 boundary (must NOT
   be Reserve, strict `<`) and one clearly below.
3. TWO-WAY COMPOSITE: a Two Way trait holder (real label, e.g. Two Way
   (IF)/(OF)) with BOTH arm (pWAR) and bat (bwar/rwar/fwar) WAR rows, so
   compositional valuation fires and the holder is excluded from single
   pools.

## Contract (handoff text)

```
You are a senior TypeScript engineer producing the EP1 golden-regression
deliverable for KBL Tracker via a DETERMINISTIC ADVERSARIAL SYNTHETIC
fixture. This is an EVIDENCE artifact, NOT an engine change, and runs as
a Node script — NO browser, NO Playwright, NO IndexedDB.

GOAL:
Build a synthetic fixture that adversarially exercises EP1's three
sanctioned causes, run the canonical True Value path over it at pre-EP1
(git f8d5f82) and post-EP1 (working tree), and emit a pre/post
attribution table proving EVERY changed row attributes to a sanctioned
cause. Any UNATTRIBUTED delta is the finding the table exists to surface.

SOURCE OF TRUTH:
- EP1-AUDIT D8 (three causes; "zero unattributed delta" bar)
- RULING R-8/R-9/R-10 + Phase 0 sign-off addendum (cause definitions)
- FINDING-146 (the deliverable gap)
- The three-causes block in the EP1-GOLDEN-R header above (adversarial
  cases REQUIRED: near-tie incumbency, 0.40 boundary, clean flip,
  two-way with both WAR sides)

PHASE 0 — FIXTURE DESIGN (report and STOP for Captain sign-off before
generating):
- Specify the EXACT fixture: list each synthetic player (id, name,
  profile primaryPosition, trait labels, salary), each player's
  per-game STARTING position sequence (so plurality + starts-share are
  computable by hand), and each player's WAR rows (bwar/rwar/fwar for
  bats, pwar for arms). Show by hand-calc that the fixture produces:
  the near-tie switcher, the clean-flip switcher, the 0.40-boundary
  non-Reserve, the sub-0.40 Reserve, and the two-way composite holder.
- Identify the CANONICAL entry point the script will call (the same
  calculateTrueValue path via franchise storage/preview that production
  uses — NOT a reimplementation); cite file:line.
- Identify how the script obtains the pre-EP1 engine (git show/
  worktree at f8d5f82 — NOT hand-reconstructed) and runs BOTH versions
  against the SAME fixture.
- Name the exact files to add. Report and STOP.

PHASE 1 — GENERATE (after sign-off):
- Add scripts/ep1-golden-regression.mjs (Node, no browser): construct
  the signed-off fixture, run the canonical TV path pre + post, diff by
  playerId.
- Add spec-docs/EP1_GOLDEN_REGRESSION.md: a table keyed by playerId
  (playerName, profile primary, EP1 effective/Reserve/two-way, pre-EP1
  trueValue, post-EP1 trueValue, delta, ATTRIBUTION ∈ {UNCHANGED,
  effective≠profile, Reserve, two-way-composite, UNATTRIBUTED}), plus a
  summary (N players, N changed, breakdown, UNATTRIBUTED count) AND a
  FIXTURE-DESIGN section restating the adversarial cases so the auditor
  can judge whether the fixture probes or flatters.
- Every nonzero delta MUST carry a non-UNATTRIBUTED attribution. Any
  UNATTRIBUTED row → STOP and report it (player + unexplained delta) —
  this is the real defect the table hunts; do not paper over it.

CONSTRAINTS:
- Do NOT modify any EP1 engine/source file. The script + the .md are
  the only additions; the script must not import-cycle into shipping
  paths.
- Do NOT commit the EP1 build code (stays uncommitted for the D8
  re-audit against the live diff).
- Pre-EP1 numbers come from the real f8d5f82 engine via git, NOT memory.
- The fixture is SYNTHETIC INPUTS only; the engine computes all True
  Values. If producing the table appears to require an engine edit →
  STOP, report (that is a finding, not a license to edit).

VERIFICATION:
- NODE_ENV= npm run build green; the table .md exists and is internally
  consistent (every nonzero delta attributed); report the UNATTRIBUTED
  count explicitly (target: 0) and confirm all three causes appear with
  nonzero, correctly-attributed deltas.

FORMAT:
Phase 0 fixture design → STOP. Then: files added (exact paths); how
pre/post engines were obtained (git commands); the attribution summary
(N total / N changed / breakdown / UNATTRIBUTED count); the three causes
confirmed present; "EP1-GOLDEN-R complete" OR "BLOCKED: [reason]" OR
"UNATTRIBUTED DELTA FOUND: [rows]".

FAILURE PROTOCOL:
- A sanctioned cause cannot be exercised by the fixture → fix the
  fixture design at Phase 0 (the whole point is coverage)
- Producing the table needs an engine edit → STOP, report
- Any UNATTRIBUTED delta → STOP after Phase 1, report the rows

Use high reasoning effort. Think step-by-step.
```

**Execution record:** [pending]


---

# EP1-GOLDEN-R — PHASE 0 REVISION REQUEST (Captain, 2026-06-12)
**NOT signed off. Fixture is structurally correct but numerically
TOOTHLESS — re-spec required, then re-report Phase 0.** Cite drift noted
(non-blocking): resolver export is franchiseEffectivePosition.ts:171, not
:141; preview composite arm/bat at :290/:296. Entry point + strict-`<0.4`
boundary logic VERIFIED correct.

## Why the current fixture proves nothing
True Value is a PERCENTILE within a pool: warPercentile of the player's
WAR among pool WARs → salary at that percentile among pool salaries. The
draft put EVERY adversarial player at WAR 0.05-0.20 — DEAD LAST in its
pools both pre and post. At the bottom percentile, TV maps to the pool
floor; with the cohort salary ladders as drafted, the deltas collapse to
~zero. The table would render "cause present, ~0 delta" — coverage in
appearance, proof in substance NONE. This is the flatter-not-probe
failure this checkpoint exists to catch.

## Required fixes (keep structure; re-number WAR + salaries)
Captain pre-verified the following produce nonzero, hand-predictable,
correctly-signed deltas (rank-percentile model; confirm against the real
step-percentile engine in Phase 0):

1. **Switchers land INTERIOR + paired pools get ASYMMETRIC salary shapes.**
   - near_2b_ss + clean_lf_cf: set WAR so each sits mid-pack in its pools
     (e.g. total WAR 1.25 against cohorts laddered 1.00-1.50).
   - 2B cohort cheap+flat (all 100k); SS cohort expensive+spread
     (200k-450k) → 2B→SS switch moves TV ~+200k (pre 100k → post 300k).
   - LF cohort flat (300k); CF cohort spread (400k-900k) → LF→CF switch
     moves TV ~+300k.
   - Hand-calc MUST now show expected delta MAGNITUDE + DIRECTION, not
     just the resolved position.

2. **Reserve player is EXPENSIVE + LOW-WAR (the Albatross story), NOT
   interior.** A high-salary player (~700k) with low WAR (~0.30) and
   <0.40 starts: pre-EP1 pools with its profile cohort (RF, expensive)
   → bottom percentile → high pool salary (~700k); post-EP1 drops to the
   league-wide Reserve pool (cheap bench mix ~90-130k) where its 0.30 WAR
   is MID/HIGH percentile → ~120k. Delta ~ −580k. THIS is what proves
   Reserve repositioning moves value. (An interior-WAR reserve player
   nets ~0 — Captain verified — so do NOT make this one interior.)

3. **Two-way composite lands INTERIOR on BOTH sides.** tw_if: arm WAR
   interior vs the SP/RP cohort (laddered salaries 100k-200k → arm TV
   ~140k), bat WAR interior vs the 2B anchor cohort → bat TV. Post total
   = arm + bat. CRITICAL pre/post framing: pre-EP1 has NO two-way path —
   the holder is valued as a SINGLE pool (its profile SP/RP, one WAR
   figure); post-EP1 splits into arm+bat composite. The delta to show is
   single-value(pre) vs composite(post). Confirm in Phase 0 exactly how
   pre-EP1 treats a Two Way (IF) holder (profile SP/RP single pool?) so
   the composite delta is real, not an artifact of mismatched inputs.

## Re-report Phase 0 with
- The re-numbered fixture table (WAR + salary per player/cohort).
- Hand-calc per adversarial player: pre TV, post TV, expected delta
  (magnitude + sign), and which sanctioned cause it demonstrates.
- Phase 0 confirmation of the pre-EP1 two-way treatment (point 3).
- Then STOP again for Captain sign-off.

Use high reasoning effort. Think step-by-step.


---

# EP1-GOLDEN-R — PHASE 0 SIGN-OFF (Captain, 2026-06-12)
**Revised fixture APPROVED. Proceed to Phase 1.** Captain re-ran ALL five
adversarial cases through the EXACT engine step-percentile formula
(getPercentile = count(WAR ≤ value)/n; getValueAtPercentile =
floor(pct×n) clamped) — salaryCalculator.ts:944-969. Pool-size verified:
every pool = 6 cohort + adversarial player = 7 members, above the merge
floor, so NO merge-group contamination. Reserve post-pool = res_1..5 +
reserve_rf = 6 members.

## Verified deltas (engine-exact) — four MATCH, one CORRECTED
| player | cause | pre TV | post TV | delta | vs Codex |
|---|---|---:|---:|---:|---|
| near_2b_ss | effective≠profile (near-tie SS) | 100k | 400k | +300k | MATCH |
| clean_lf_cf | effective≠profile (clean CF) | 300k | 800k | +500k | MATCH |
| boundary_3b | 0.40 boundary NON-Reserve | 800k | 800k | 0 | MATCH |
| reserve_rf | Reserve (expensive low-WAR) | 700k | 130k | −570k | MATCH |
| tw_if | two-way composite | 180k | **280k** | **+100k** | **CORRECTED** (Codex said 260k/+80k) |

## The one correction (binding for the generated table)
Codex's tw_if hand-calc put arm TV at 160k; the engine gives 180k. Arm
side prices pWAR 1.25 vs the SP/RP pool: pct = 0.571, index =
floor(0.571×7) = 4; sorted arm salaries [100,120,140,160,180,200,200]k →
index 4 = **180k** (not 160k). Bat side = 100k (correct). Post total =
arm 180k + bat 100k = **280k**; delta = +100k. The EP1_GOLDEN_REGRESSION
.md MUST use 280k / +100k as tw_if's expected post/delta. This is an
arithmetic fix, not a fixture change — do NOT alter the fixture numbers.

## Phase 1 authorization
Generate exactly the signed-off fixture (revised table, this entry's
corrected tw_if target). Files: scripts/ep1-golden-regression.mjs +
spec-docs/EP1_GOLDEN_REGRESSION.md. Pre-EP1 via git f8d5f82 (NOT memory;
two-way confirmed single SP/RP pre-EP1 per Codex's franchiseValueInputs
.ts:502 + preview:150-163 trace). Every nonzero delta must attribute to a
sanctioned cause and MATCH this table; any deviation between generated and
expected → STOP and report (it means the engine or the fixture differs
from this hand-calc, which is exactly what the table must surface). Then
STOP for D8-only re-audit.

Use high reasoning effort. Think step-by-step.


---

# EP1-GOLDEN-R — SIGN-OFF CORRECTION REVERSED (Captain, 2026-06-12)
**Codex BLOCK was CORRECT. Captain's tw_if "correction" was the error.**
The prior sign-off (242697c) wrongly raised tw_if's target to 280k/+100k
by including tw_if in its own arm peer pool (7 members → 180k arm TV).
That violates R-8 pt 5: two-way holders are EXCLUDED from single-position
pools. Engine verified self-exclusion at franchiseTrueValuePreview.ts:253
(allPlayers filters kind==='single') and franchiseTrueValueStorage.ts:430
(singleEntries only). Codex refused to hand-author around the canonical
path to hit a wrong target — the stop-gate working exactly as designed.

## Corrected (engine-exact, self-exclusion applied)
- ARM: pWAR 1.25 vs 6-member sprp pool (excl tw_if): pct 0.500, index 3,
  salaries [100,120,140,160,180,200]k → armTV **160k**.
- BAT: bat WAR 1.25 (1.10+0.05+0.10) vs 6-member 2B anchor pool (excl
  tw_if): pct 0.500, index 3, salaries all 100k → batTV **100k**.
- POST = 160k + 100k = **260k**.
- PRE: pre-EP1 has no two-way path → tw_if is a single SP/RP row, IN its
  own 7-member pool, total WAR 2.50: pct 0.571 → **180k**.
- DELTA = +80k. (Codex's original Phase 0 figure was correct.)

Note the instructive asymmetry: pre-EP1 the holder sits IN its pool;
post-EP1 it is EXCLUDED from both — the exclusion itself is part of the
value change. Good two-way coverage; magnitude +80k, not +100k.

## BINDING TARGETS for the generated table (this entry supersedes 242697c's tw_if row)
| player | cause | pre TV | post TV | delta |
|---|---|---:|---:|---:|
| near_2b_ss | effective≠profile (near-tie) | 100k | 400k | +300k |
| clean_lf_cf | effective≠profile (clean) | 300k | 800k | +500k |
| boundary_3b | 0.40 boundary NON-Reserve | 800k | 800k | 0 |
| reserve_rf | Reserve | 700k | 130k | −570k |
| tw_if | two-way composite | 180k | **260k** | **+80k** |

## Phase 1 RE-AUTHORIZED — generate now
Proceed with the signed-off fixture (UNCHANGED numbers) and the table
above as the binding expected column. tw_if = 260k / +80k. All other rows
unchanged from 242697c (those four were verified MATCH). Generate
scripts/ep1-golden-regression.mjs + spec-docs/EP1_GOLDEN_REGRESSION.md;
pre-EP1 via git f8d5f82; every generated delta must match this table;
deviation → STOP. Then STOP for D8-only re-audit.

Use high reasoning effort. Think step-by-step.


---

# EP1-GOLDEN-R-AUDIT — D8-only re-audit of the golden-regression table
**Drafted:** 2026-06-12 | **ROUTE: Opus 4.8 Max | high reasoning effort**
(independent auditor; Fable unavailable — same substitution as EP1-AUDIT,
triangle preserved auditor≠builder. NARROW SCOPE: D8 only — EP1-AUDIT D1-D7,
D9-D10 already PASSED and the engine diff is unchanged since.)

## Why narrow
EP1-AUDIT returned 9/10 PASS + 4 mutations killed; the ONLY block was D8
(golden-regression table absent → FINDING-146). EP1-GOLDEN-R produced the
table. This re-audit verifies ONLY that the table genuinely closes D8. Do
NOT re-run D1-D7/D9-D10 — the EP1 engine changeset is byte-unchanged
(confirm that first; if it changed, STOP — scope is void).

```
You are the independent auditor for the EP1 golden-regression deliverable.
You did not write it. Assume failure until proven otherwise. Audit
spec-docs/EP1_GOLDEN_REGRESSION.md + scripts/ep1-golden-regression.mjs
against EP1-AUDIT D8 + the EP1-GOLDEN-R sign-off/reversal entries
(PROMPT_CONTRACTS.md) + RULING R-8/R-9/R-10.

GOAL: verdict "EP1 D8 VERIFIED — FINDING-146 CLOSED" or itemized
MAJOR/MINOR.

PRECONDITION (confirm, else STOP):
- The EP1 engine changeset is unchanged since EP1-AUDIT: `git diff --stat`
  shows the SAME 12 build paths (10 modified + 2 untracked
  franchiseEffectivePosition.ts/.test.ts) plus now the 2 EP1-GOLDEN-R
  artifacts (script + .md). No EP1 ENGINE file may have moved since
  EP1-AUDIT. If an engine file changed, the prior 9/10 pass is stale →
  STOP and report.

DIRECTIVES (D8 facets):
G1 — Script integrity: ep1-golden-regression.mjs obtains pre-EP1 from
  git f8d5f82 (NOT hand-reconstructed — confirm the git show/archive
  invocation), runs the SAME synthetic fixture through pre and post
  canonical TV paths (buildFranchiseTrueValuePreviewReport, NOT a
  reimplementation), and REFUSES to write the .md unless the 5 binding
  rows match. Mutation: change a binding target in the script → it must
  refuse to write (or fail loudly). Confirm the refusal is real.
G2 — Binding rows match the reversed sign-off (d13a350): near_2b_ss
  +300k, clean_lf_cf +500k, boundary_3b 0, reserve_rf −570k, tw_if
  180k→260k +80k. tw_if MUST be 260k (R-8 pt5 self-exclusion — NOT the
  reverted 280k). Re-derive all 5 by hand against the engine formula
  (getPercentile = count(≤)/n; getValueAtPercentile = floor(pct·n)
  clamp). Any mismatch → MAJOR.
G3 — Coverage: all THREE sanctioned causes appear with nonzero,
  correctly-signed, correctly-attributed deltas (effective≠profile,
  Reserve, two-way-composite). A cause with only zero-deltas = hollow
  fixture = MAJOR.
G4 — Zero UNATTRIBUTED: every one of the 13 changed rows carries a
  non-UNATTRIBUTED attribution AND that attribution is CORRECT (not just
  present). PRIORITY hand-checks (Captain-flagged as least intuitive):
  * res_4 (130k→700k, +570k, Reserve) and res_5 (800k→700k, −100k,
    Reserve): verify these are arithmetic consequences of reserve_rf
    (700k salary) entering the league-wide Reserve pool and reshaping
    its salary distribution — NOT a bug. Note res_5 is an 800k-salary
    "reserve" player (a second Albatross-shaped row); confirm the pool
    composition (700k + 800k among ~100k benchwarmers) explains both
    deltas exactly.
  * 2b_5/2b_6 (−350k) and lf_5/lf_6 (−600k): verify these are the
    switchers LEAVING those pools (near_2b_ss 450k left 2B; clean_lf_cf
    900k left LF), dropping the pool salary ceiling.
  * ss_4 (+50k), cf_4 (+100k): switchers ARRIVING.
  * sprp_4 (−20k): tw_if EXITING the SP/RP single pool.
  Any row whose stated attribution does not mechanically explain its
  delta → MAJOR (mislabeled delta is exactly what D8 hunts).
G5 — Build: NODE_ENV= npm run build green with the script present; the
  script does not import-cycle into shipping paths.

CARVE-OUTS: spec-doc appends sanctioned. The 2 new artifacts (script +
.md) are the expected additions; they are NOT EP1 engine files.

FORMAT: verdict first; per-G evidence (commands + output); the 5 binding
rows re-derived by hand; the res_4/res_5 mechanism shown explicitly;
disagreements MAJOR/MINOR; explicit statement whether FINDING-146 is
CLOSED and FINDING-143 is now DELTA-CERTIFIED.

Use high reasoning effort. Think step-by-step.
```

**Execution record:** [pending]


---

# EP1 — CLOSURE RECORDS (2026-06-12)

**Execution record (EP1-GOLDEN-R, 2026-06-12):** Codex 5.5 | high.
Two-phase. Phase 0 fixture design returned twice: first numerically
toothless (every adversarial player bottom-percentile → ~0 deltas;
Captain revision request), then re-spec'd with interior percentiles +
asymmetric paired pools. Captain Phase-0 sign-off (242697c) wrongly
raised tw_if to 280k/+100k by including the holder in its own arm pool;
Codex BLOCKED at Phase 1 — correctly citing R-8 pt5 self-exclusion
(franchiseTrueValuePreview.ts:253, franchiseTrueValueStorage.ts:430).
Captain reversed (d13a350): tw_if = 260k/+80k, Codex's original figure.
Phase 1 then produced scripts/ep1-golden-regression.mjs + spec-docs/
EP1_GOLDEN_REGRESSION.md: pre-EP1 via git show f8d5f82, post via working
tree, both through canonical buildFranchiseTrueValuePreviewReport; script
self-refuses to write unless the 5 binding rows match. Result: 52 players,
13 changed (effective≠profile 8 / Reserve 3 / two-way-composite 2),
UNATTRIBUTED 0; all binding rows matched incl tw_if 180k→260k/+80k.

**Audit record (EP1-GOLDEN-R-AUDIT, 2026-06-12):** Opus 4.8 Max
(substituted for Fable; triangle preserved). **Verdict: "EP1 D8 VERIFIED
— FINDING-146 CLOSED."** D8-only scope (precondition confirmed: engine
diff byte-unchanged at 58,403; effPos sha b0aedcf). G1 PASS (pre from git
show f8d5f82; canonical path; refusal gate killed a tamper-mutation —
target 400k→401k → throw + exit 1 + .md unwritten; deterministic .md sha
b472cdda). G2 PASS — all 5 binding rows re-derived by hand against the
engine formula; tw_if correctly 260k (arm pool excludes holder, 6
members → 160k; NOT the reverted 280k). G3 PASS (3 causes, nonzero
signed). G4 PASS — all 13 rows hand-verified incl the res_4 (+570k) /
res_5 (−100k) Reserve mechanism. G5 PASS (build green, no import-cycle).
No MAJOR/MINOR against correctness. 3 observations (logged below).

**EP1 BUILD record — CLOSED.** EP1-AUDIT 9/10 + 4 mutations killed;
D8 closed by EP1-GOLDEN-R-AUDIT. FINDING-143 DELTA-CERTIFIED on the
deterministic synthetic fixture (the agreed D8 bar). MINOR #2 (sibling
eventLog mocks) FIXED in the closure changeset (getGameHeadersForScope
added to processCompletedGame.warMetadata + warPersistence test mocks;
5/5 pass, swallowed-error noise gone). Build code committed in the EP1
closure commit. CAVEAT (standing): both EP1 audit legs ran on Opus-as-
auditor (Fable unavailable) — uncharacterized config; JK browser pass on
real franchise data is the final real-world confirmation.

## EP1-GOLDEN-R-AUDIT observations (non-blocking)
- OBS-1 (Captain prose error, CORRECTED): the G4 hint called res_5 "an
  800k-salary reserve player." res_5's SALARY is 130k; its 800k was a
  pre-EP1 True Value artifact from the 1B→3B pool MERGE (1B pool <6
  members pre-EP1). The Reserve pool holds ONE large salary (reserve_rf
  700k), not "700k+800k." Deltas engine-correct + correctly attributed;
  only the Captain's prose was wrong. Auditor also surfaced the 1B→3B
  merge as the source of res_5's pre-value — a mechanism the Captain had
  missed.
- OBS-2 (forward note): the script's support-row attributionFor
  (ep1-golden-regression.mjs:281-292) is profile-bucket-based, not
  per-row mechanistic. Correct for THIS fixture (all 13 proven); if the
  generator is ever re-run on a different fixture, make attribution
  mechanistic first.
- OBS-3 (cosmetic): assertTargets binding-row attribution is self-
  referential; only the pre/post/delta VALUE check gates (that gate is
  real — tamper-proven). Fine as-is.


---

# CLEANUP-F147 — retire stale EP1 limitation string (post-EP1 accuracy)
**Drafted:** 2026-06-12 | **ROUTE: Codex 5.5 | high**
**Planner: Opus 4.8, high.** (Mechanical; correctness grep- + suite-
checkable. Low-risk per Fable-less triage — verification is external to
planner judgment.)

## Why
EP1 shipped (commit 27e277a): peer pools are now EFFECTIVE-position, not
profile-position. The constant FRANCHISE_DESIGNATION_EP1_LIMITATION =
'peer pools are profile-position until EP1 (R-8)' (franchiseDesignations
.ts:13) is now FALSE and is stamped into EVERY designation record's
sourceInputs.peerPoolLimitation (:223). FINDING-147. Option 1 (JK-ratified):
KEEP the field, make the string accurate (do NOT drop the field / change
record shape).

## Contract (handoff text)
```
You are a senior TypeScript engineer making a mechanical accuracy fix to
KBL Tracker. NOT a logic change.

GOAL:
Replace the now-false EP1 peer-pool limitation string with accurate
post-EP1 wording. Keep the field and record shape unchanged. Closes
FINDING-147.

SOURCE OF TRUTH:
- FINDING-147 (FINDINGS_142_onwards.md)
- EP1 is live (27e277a): pools are effective-position (R-8); remaining v1
  limitations are pitcher profile-role pooling and two-way CALIBRATE
  anchors (C→C/IF→2B/OF→CF).

EDIT (exactly these, nothing else):
- franchiseDesignations.ts:13 — replace the constant VALUE. Rename the
  constant for accuracy if trivial (e.g. FRANCHISE_DESIGNATION_POOL_NOTE)
  ONLY if every reference is updated in the same change; otherwise keep
  the existing export name and change only its string value. New value
  states: peer pools are effective-position per R-8 EP1; pitchers pool by
  profile role (v1); two-way holders valued compositionally with CALIBRATE
  trait anchors. Keep it one concise sentence.
- franchiseDesignations.ts:223 — no change needed if the constant name is
  kept; if renamed, update this reference.
- Update the two test references to match the new string/name:
  src/utils/tests/franchiseDesignations.test.ts:58 (asserts the value
  includes 'EP1' — keep an EP1 reference in the new string so this still
  holds, OR update the assertion to match new wording)
  src/src_figma/__tests__/franchiseMode/TeamHubContent.franchiseReads
  .test.tsx:443 (hardcoded old string in a fixture — update to new value)

CONSTRAINTS:
- Do NOT change the record shape: peerPoolLimitation stays a string field
  on sourceInputs. (Option 2 / field removal is explicitly OUT.)
- Do NOT touch any other file. Do NOT bump calculationVersion (the
  designation logic is unchanged; only a descriptive caveat string moves).
- Do NOT touch EP1 engine files, §17 criteria, eligibility semantics
  (F-145), or salary-path residue (F-144).

VERIFICATION:
- grep: the literal 'peer pools are profile-position until EP1 (R-8)'
  returns ZERO hits across src/ after the change.
- NODE_ENV= npm run build green.
- The two named test files pass; full suite delta vs 7,140/383 is ZERO
  (mechanical string change adds/removes no tests).

FORMAT:
Files changed (every path in git status); the old vs new string verbatim;
grep-zero proof; build + test output; "CLEANUP-F147 complete" OR
"BLOCKED: [reason]".

Use high reasoning effort. Think step-by-step.
```

**Execution record (CLEANUP-F147, 2026-06-12):** Codex 5.5 | high.
Complete. Constant name KEPT (FRANCHISE_DESIGNATION_EP1_LIMITATION),
value replaced → "EP1 R-8 peer pools use starts-derived effective
positions/Reserve; pitchers pool by profile role in v1; two-way holders
are valued compositionally with CALIBRATE trait anchors." 3 files
(franchiseDesignations.ts:13 + 2 test refs). Captain VERIFICATION (Opus
4.8 high, mechanical — NO independent audit needed, oracle is grep +
suite count): grep-zero on the old literal CONFIRMED independently; only
the 3 intended files modified; new string in place at :13; suite 7140/383
zero delta (run showed 7137 pass / 3 fail — one order-flake didn't trip;
franchiseManualSmokeFixture solo 4/4; characterized, not regression).
FINDING-147 CLOSED. No calculationVersion bump (descriptive caveat only).


---

## CONTRACT: T6 — Effective Ratings Engine + DefensivePlacementRisk + constants registry (drafted 2026-06-14)

**ROUTE: Codex 5.5 | high → audit (Fable 5 CLI per spec; Opus 4.8 while Fable unavailable — auditor ≠ builder) | high reasoning effort**

**STATUS: DRAFTED — NOT YET HANDED OFF. Pending JK final review.** Asset gate
satisfied (R-T6-1 approved by JK 2026-06-14); do not send to Codex until JK OKs
this drafted text.

### Ratified rulings (binding inputs — JK 2026-06-14)
- **R-T6-1 (SMB4 asset gate — APPROVED):** T6 builds the §4.2 6-state ADDITIVE
  mojo model (Rattled/Tense/Normal/Locked In/On Fire/Jacked = −10/−5/0/+5/+10/+15)
  and the §4.4 fatigue-decay deltas as a NEW model living entirely inside the new
  `effectiveRatings.ts`, with FRESH constants in the registry. It MUST NOT modify,
  import, or mutate `src/engines/mojoEngine.ts` or `src/engines/fitnessEngine.ts`
  (the live 5-state multiplicative SMB4 assets stay intact). Reconciling the
  legacy multiplicative mojo with this additive model is **explicitly deferred to
  T9** (GameTracker sub-rec rebuild). "Follows the OOTP/spec pattern AND preserves
  the SMB4 asset intact" is satisfied because the legacy engines are untouched.
- **R-T6-2 (scope line — PURE ENGINE ONLY):** T6 delivers the two pure engine
  functions + the constants-registry extension + becomes the FIRST production
  reader of `traitInteractionMatrix.ts`. It MUST NOT wire effective ratings into
  the persisted True Value / IV pipeline and MUST NOT modify the golden-frozen
  `ivEngine.ts` or `salaryCalculator.ts`. The "Ratings → True Value" wiring and
  every consuming surface (lineup optimizer, sub recs, call-up/send-down) are
  T7–T9. This keeps T6 a pure-function engine → route stays `high` (no state/
  persistence touch).
- **R-T6-3 (registry thresholds — DEFER):** `subRecThreshold` / `calloutThreshold`
  (spec line 615, "TBD in T6/T7") are SURFACE thresholds; they are NOT added in
  T6. They belong to the T7 (call-up/send-down) and T9 (in-game subs) tickets.

### Why this exists / what is already built (do NOT duplicate — Captain-verified 2026-06-14)
- **Greenfield confirmed:** 0 grep hits for `effectiveRating(s)` / `EffectiveRatings`
  / `DefensivePlacementRisk` symbols/types/files anywhere in `src/`. The only
  `DefensivePlacementRisk` occurrences are 4 spec-breadcrumb comments inside
  `traitInteractionMatrix.ts` (:123 predicate comment, :222/:543/:835
  expectedValueNote text) describing the intended errorLikelihood/
  spectacularLikelihood model. No engine exists.
- **EP1 (`src/utils/franchiseEffectivePosition.ts`) — DONE, do not re-derive:**
  owns starts-by-position topology / valuePosition / Reserve pooling / two-way
  anchoring. T6 is about effective RATINGS (a different axis), not effective
  position.
- **TV1/TV2 — DONE, do not re-wire:** `franchiseValueInputs.ts` +
  `franchiseTrueValueStorage.ts` + `calculateTrueValue` (`salaryCalculator.ts:1027`).
  True Value today is 100% WAR+salary; ratings never enter it. Per R-T6-2 that
  wiring stays deferred.
- **Golden-frozen — forbidden to touch:** `ivEngine.ts` (oracle `iv_oracle.json`;
  `ivEngine.test.ts:184` asserts it must NEVER import the trait matrix),
  `salaryCalculator.ts`. The TV value-input row is a versioned read-only contract
  with 7 consumers.
- **Naming trap:** `src/utils/effectiveValues.ts` is a fame-only helper —
  UNRELATED to Effective Ratings; do not overload it. `ratingsAdjustmentEngine.ts`
  is WAR/percentile salary adjustment — distinct from T6; do not conflate.

```
You are the Effective Ratings Engine Implementer (TypeScript, pure functions).

GOAL:
Implement the Effective Ratings Engine per IV spec §4 as a NEW pure module
`src/engines/effectiveRatings.ts` exporting exactly:
  - effectiveRatings(p, state, ctx, potency?='L2'): Ratings        (§4.1–§4.4)
  - defensivePlacementRisk(p, pos): PlacementRisk                  (§4.5)
plus EXTEND `src/data/rosterEngineConstants.ts` with the §4/§4.5/§12
effective-ratings + placement constants. This module is the FIRST production
consumer of `src/data/traitInteractionMatrix.ts` (T2 artifact). No surfaces, no
persistence, no edits to the golden IV/salary/mojo/fitness engines.

SOURCE OF TRUTH:
- IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §4 (4.1–4.5), §11 (interface
  signatures), §12 (constants registry), §13 row T6. READ §4 VERBATIM.
- src/data/traitInteractionMatrix.ts — its POTENCY RULING header, the A1–A16
  ambiguity rulings (esp. A14 Clutch/Choker), the "T6 NOTE" predicate-kinds list
  (lines ~87–91), and the TraitMatrixEntry / PredicateCondition schema
  (lines ~98–141). This is BOTH the data and the spec for how to consume it.
- Conflict rule: where the IV spec prose and the matrix disagree on a MAGNITUDE,
  the matrix's documented value wins (A13: the matrix carries in-game effect
  values; traitPricing carries salary equivalents). Where either is silent, the
  value is a CALIBRATE placeholder — name it, comment it, do not invent precision.

ENV: prefix every CLI with `NODE_ENV= `; node at ~/.nvm/versions/node/v20.20.0/bin.

CONSTRAINTS — FILES:
- CREATE only:
    src/engines/effectiveRatings.ts
    src/engines/__tests__/effectiveRatings.test.ts
- MODIFY only (ADD-ONLY):
    src/data/rosterEngineConstants.ts  (append new constants; do NOT change,
    rename, reorder, or re-type ANY existing export — they are consumed by the
    golden ivEngine and a test snapshots them)
- Do NOT touch (read-only consume where noted, otherwise hands off):
    src/engines/ivEngine.ts, src/engines/salaryCalculator.ts,
    src/engines/mojoEngine.ts, src/engines/fitnessEngine.ts,
    src/data/traitInteractionMatrix.ts (consume read-only — never edit),
    src/data/traitPricing.ts, src/data/ivCurves.ts, src/data/tierParams.ts,
    src/data/playerDatabase.ts, src/utils/franchiseEffectivePosition.ts,
    src/utils/franchiseValueInputs.ts, src/utils/franchiseTrueValueStorage.ts,
    src/utils/franchiseTrueValuePreview.ts, src/utils/effectiveValues.ts,
    src/engines/ratingsAdjustmentEngine.ts

CONSTRAINTS — PURITY (mirror the ivEngine discipline):
- Pure module: no React, no IndexedDB/storage, no DOM, no I/O, no Date.now/random,
  deterministic. No new npm dependencies.
- effectiveRatings.ts MUST NOT import: ivEngine.ts, salaryCalculator.ts,
  tierParams.ts, playerDatabase.ts, mojoEngine.ts, fitnessEngine.ts, or any
  storage/util that touches IndexedDB. Allowed imports: traitInteractionMatrix.ts,
  traitPricing.ts (types), rosterEngineConstants.ts, and a type-only import of the
  canonical Player shape (src/utils/leagueBuilderStorage.ts Player, line 189) — if
  that type-only import drags runtime code, define a local minimal input interface
  instead and FLAG it.

STEP 1 — CONSTANTS REGISTRY EXTENSION (src/data/rosterEngineConstants.ts, ADD-ONLY):
Append the §4/§4.5 effective-ratings constants below the existing IV-layer block.
Every new export carries a `// §<n> <source>` comment and a `CALIBRATE` marker
where the spec marks the magnitude unpublished. Add EXACTLY these (and only these
— the other §12 rows like starBudgetShare/deadMoneyRate/rookieScaleFactor belong
to T5/T7/T8/T11 surfaces, NOT T6):
  1. MOJO_STATES: the ordered 6 states (§4.2).
  2. MOJO_DELTAS: per-state additive delta applied to ALL attributes —
     Rattled −10 / Tense −5 / Normal 0 / Locked In +5 / On Fire +10 / Jacked +15.
     CALIBRATE (§4.2 honest constraint, §12, §15.4).
  3. PRESSURE_MULTIPLIER: { high: 1.5, extreme: 2.0 } — pressure amplifies the
     rating effect of current mojo (§4.2). CALIBRATE magnitude.
  4. ROLE_MISUSE_MOJO_PENALTY: mojo-LEVEL penalties (§4.2, CANONICAL JK 2026-06-10)
     — SP-relieving −1, RP-starting −1, CP-starting −2, CP-entering-before-second-
     to-last-inning −1 (game-length-relative, NOT a fixed inning), SP/RP immune
     both directions. Encode levels, not rating points.
  5. OUT_OF_POSITION_MOJO_PENALTY = 1 (mojo level) — playing a position that is
     NEITHER primary NOR secondary (§4.2/§4.5, CANONICAL). Secondary = 0 mojo
     penalty; Two Way trait position = secondary-equivalent (0 mojo penalty).
  6. FATIGUE_MODEL (§4.4): per-role stamina thresholds + decay (SP ~70 pitches /
     3-game recovery; SP/RP ~45; RP ~25 fast recovery; CP ~20 fastest), catcher
     fastest fitness decay (~1-in-4 rest), Durable/Injury Prone factors 0.75/1.25
     (A9 PLACEHOLDER), and the mojo→decay coupling factor (higher mojo slows
     decay). ALL CALIBRATE.
  7. DefensivePlacementRisk constants (§4.5): POSITION_CHANCE_FREQUENCY per
     position (SS/C/CF high, LF/1B low), the secondary/other-position fielding
     penalty multipliers, the errorLikelihood/spectacularLikelihood base scaling,
     and the mojo-drift up/down step constants. ALL CALIBRATE.

STEP 2 — TYPES (define in effectiveRatings.ts; reuse where one already exists):
- Attr = the 8 PricedAttr (POW/CON/SPD/FLD/ARM/VEL/JNK/ACC) — reuse from
  traitInteractionMatrix.ts / traitPricing.ts.
- MojoState = the 6-state union (from MOJO_STATES).
- FitnessState = local union by the SMB4 names (JUICED/FIT/WELL/STRAINED/WEAK/HURT)
  — defined locally with T6's OWN decay inputs; do NOT import fitnessEngine.
- PlayerState = { mojo: MojoState; fitness: FitnessState; workload?: <role/usage
  inputs §4.4> }.
- GameContext = §4.1 base fields (count?, pressure:'none'|'high'|'extreme',
  runnersOn, risp, opposingHand:'L'|'R', opposingPlayer?, inning, isSubstitutionAB?)
  EXTENDED with every datum needed to evaluate all 26 PredicateCondition kinds in
  the matrix (the "T6 NOTE" list: stealAttempt, roundingBase, runningOutOfBox,
  buntAttempt, pitchType, pitchLocation, countIn, teamLosing, basesEmpty,
  consecutiveBaserunnersAllowed, comebackerToPitcher, playingPosition,
  onBasePath.nextBaseOpen). Reuse PredicateCondition from the matrix.
- Ratings = Record<Attr, number> (the effective output vector).
- PlacementRisk = { chanceFrequency; errorLikelihood; spectacularLikelihood;
  expectedMojoDriftPerGame } (§4.5 EXACT field names).
- Position = local union of concrete positions (C/1B/2B/SS/3B/LF/CF/RF/DH/SP/RP/CP).
  Do NOT import PlayerPosition from salaryCalculator (golden file). Unifying the
  position vocabularies is a known follow-up — FLAG it.

STEP 3 — effectiveRatings(p, state, ctx, potency='L2') (§4.1):
Compose deterministically (this DISSOLVES "ratings vs form" — D9):
  baseRatings(p)                                   // map Player flat fields → Ratings
    + traitDeltas(p, ctx, potency)                 // §4.3 self-target trait matrix
    + opponentImposedDeltas(ctx.opposingPlayer,ctx)// §4.1 opponent-target traits
    + mojoModifier(state.mojo, ctx.pressure)       // §4.2
    − fatigueDecay(state.fitness, p.role, workload)// §4.4
    + handednessBonus(p, ctx.opposingHand)         // §4.1 splits
Required semantics:
  - PREDICATE EVALUATOR: a pure evaluatePredicate(cond, ctx) covering ALL 26
    PredicateCondition kinds; the matrix's `predicates` array is AND-combined; a
    predicate whose required ctx datum is absent evaluates FALSE (conservative).
  - POTENCY: scale each active ratingDelta by POTENCY_SCALE — positives use
    `positives[tier]`, negatives flagged `standardInverted` use
    `standardInverted[tier]`; `guideExplicit` uses perTier {l1,l3} for L1/L3 and
    `deltas` for L2. `potency` param defaults 'L2' (the neutral reference; realized
    team-chemistry tier is supplied by callers — surfaces, T7/T8).
  - A14: for Clutch and Choker, at ctx.pressure==='extreme', DOUBLE the active
    deltas (per the matrix A14 note — single-entry integrity preserved).
  - EFFECT-KIND ROUTING (be explicit; do not silently drop): `ratingDelta` →
    attribute deltas here; `fitnessDecayRate` + `staminaModifier` → inputs to
    fatigueDecay (Durable/Injury Prone/Workhorse); `fieldingPenaltyReduction` →
    consumed by defensivePlacementRisk (Step 4), NOT here; `mojoTransitionRate`
    (Volatile/Consistent) is a BETWEEN-EVENTS dynamic — expose it but do NOT apply
    it to a single effective-ratings call (mojo state is an input here); FLAG.
    `expectedValueNote` + `pitchQualityModifier` magnitudes are unpublished — model
    as documented no-op/EV in v1 with a clear comment; FLAG.
  - mojoModifier applies MOJO_DELTAS[state.mojo] to all attributes, scaled by
    PRESSURE_MULTIPLIER[ctx.pressure] when pressure is high/extreme.

STEP 4 — defensivePlacementRisk(p, pos) (§4.5):
Return { chanceFrequency: POSITION_CHANCE_FREQUENCY[pos];
  errorLikelihood: from p FLD + position-eligibility penalty (primary full / NONE
    — secondary small / other severe, per guide) + p ARM for throws, REDUCED by
    Utility/Two-Way fieldingPenaltyReduction from the trait matrix;
  spectacularLikelihood: from p FLD + p SPD range;
  expectedMojoDriftPerGame: chanceFrequency × (spectacularLikelihood×upStep −
    errorLikelihood×downStep) }.
Honor §4.2/§4.5 BOTH costs: a position neither primary nor secondary incurs the
severe fielding penalty AND the −1 mojo level (OUT_OF_POSITION_MOJO_PENALTY);
secondary = small fielding penalty, NO mojo level; Two-Way trait position =
secondary-equivalent; Utility reduces the secondary fielding penalty (its
fieldingPenaltyReduction) but does NOT help out-of-position and does NOT prevent
the mojo hit. Positional value is a VECTOR across eligible positions — the function
prices ONE (p,pos) cell; callers sweep positions. All magnitudes from STEP 1
CALIBRATE constants.

STEP 5 — TESTS (src/engines/__tests__/effectiveRatings.test.ts):
No oracle exists (unlike T4) — these are unit/property tests:
  E1 baseRatings maps Player flat fields → correct Attr vector.
  E2 mojoModifier: each of 6 states applies its additive delta; pressure scales it
     (×1.5 high, ×2.0 extreme).
  E3 predicate evaluator: ≥1 activate-vs-not case per predicate-kind family
     (always/count/twoStrikes/pressure/runnersOn min2/vsHand/opponentTier/
     substitutionAB/playingPosition + a sample of the ADDED kinds).
  E4 potency scaling: a positive trait ascends L1<L2<L3; a standardInverted trait
     descends; a guideExplicit trait uses perTier at L1/L3.
  E5 A14: Clutch (and Choker) deltas double at pressure='extreme'.
  E6 opponentImposedDeltas: Mind Gamer (target opponent) lowers OUR ACC.
  E7 handednessBonus applied by opposingHand (a splits trait).
  E8 fatigueDecay: decay past role threshold; Durable slows, Injury Prone
     accelerates; higher mojo reduces decay.
  E9 defensivePlacementRisk: high-traffic + low-FLD ⇒ high errorLikelihood +
     negative expectedMojoDriftPerGame; out-of-position adds the mojo-level cost;
     secondary adds none; Two-Way = secondary-equivalent; Utility reduces the
     secondary fielding penalty but not out-of-position.
  E10 PURITY SEAM (mirror ivEngine.test.ts:184): assert effectiveRatings.ts source
     does NOT match /ivEngine|salaryCalculator|tierParams|playerDatabase|
     mojoEngine|fitnessEngine|indexedDB|gameStorage/; assert determinism (same
     inputs → identical output twice).
  E11 REGISTRY NON-MUTATION: snapshot every PRE-EXISTING rosterEngineConstants
     export (USAGE_INPUTS, SP_RP_INNINGS_ALPHA, SP_RP_FLEX_PREMIUM,
     TWO_WAY_ARM_BY_TIER, TWO_WAY_USAGE, POTENCY_SCALE, PITCHER_ASSUMED_ARM,
     TWO_WAY_TRAIT_POSITION, deriveUsageWeights output) and assert unchanged; assert
     the new constants exist with expected shapes.
  E12 FIRST-CONSUMER: assert effectiveRatings.ts imports TRAIT_INTERACTION_MATRIX
     (the wire now exists).

VERIFICATION (run and paste actual output):
- NODE_ENV= npx vitest run src/engines/__tests__/effectiveRatings.test.ts  → all green
- NODE_ENV= npx tsc --noEmit  → clean
- NODE_ENV= npm run build  → exit 0
- git diff --stat  → ONLY the 3 intended files (effectiveRatings.ts,
  effectiveRatings.test.ts, rosterEngineConstants.ts) appear
- grep proof that ivEngine.ts / salaryCalculator.ts / mojoEngine.ts /
  fitnessEngine.ts are byte-unchanged (git diff names them: nothing)
- Full suite: NODE_ENV= npx vitest run  → baseline 7,140/383 + the new
  effectiveRatings tests; NO new RED outside the documented characterized set
  (wpaRuntimeBoundary, franchiseNarrativeEventEligibility, + the 3 order-flakes).

FLAGGED FOR JK (flag, don't block):
  F1 effectiveRatings takes a 4th defaulted `potency='L2'` param, extending §11's
     3-arg signature (consistent with ivEngine's defaulted-param pattern). Confirm
     or constrain to strictly 3 args.
  F2 ALL magnitudes (MOJO_DELTAS, PRESSURE_MULTIPLIER, FATIGUE_MODEL,
     POSITION_CHANCE_FREQUENCY, error/spectacular scaling) are CALIBRATE
     placeholders per §4.2/§4.4/§15.4 — shipped with spec estimates, playtest-tuned.
  F3 expectedValueNote + pitchQualityModifier traits have unpublished magnitudes →
     documented no-op/EV in v1 effective ratings.
  F4 FitnessState + Position vocabularies are defined LOCALLY (purity) and not yet
     unified with fitnessEngine / salaryCalculator — known follow-up.
  F5 mojoTransitionRate (Volatile/Consistent) modeled as a between-events dynamic,
     not applied per effective-ratings call.

FORMAT:
1. Files changed (every path in git status)
2. Changes made per file, each citing the §/finding/ruling it implements
3. The 5 STEP-2 type definitions + the predicate-evaluator coverage list
4. Verification results (paste actual command output for every VERIFICATION line)
5. FLAGGED FOR JK (F1–F5 + anything new you hit)
6. "T6 complete" OR "BLOCKED: [exact reason]"

FAILURE PROTOCOL:
- A change that would require editing any do-NOT-touch file → STOP and report.
- Any matrix predicate kind you cannot satisfy from a definable GameContext field
  → implement the field, or if genuinely impossible, FLAG (do not silently make it
  always-false without noting it).
- A magnitude the spec/matrix leaves unpublished AND not in the CALIBRATE list →
  STOP and ask; never invent a precise number.
- Never summarize or batch; enumerate every changed path.

Use high reasoning effort. Think step-by-step.
```


---

## T6-AUDIT + EXECUTION RECORD (2026-06-14)

**ROUTE actual:** Codex 5.5 | high BUILT (invoked by Captain via the codex CLI,
`codex exec`, workspace-write sandbox, `model_reasoning_effort=high`) → Opus 4.8
AUDIT (Fable unavailable; auditor ≠ builder — Captain wrote the T6 contract but
NOT the code, so the decorrelated triangle holds: builder gpt-5.5 family ≠
auditor Opus family).

### Builder result (Codex 5.5)
Created `src/engines/effectiveRatings.ts` (535 lines, 2 pure exports:
`effectiveRatings`, `defensivePlacementRisk`) + `src/engines/__tests__/
effectiveRatings.test.ts` (267 lines, E1–E12); extended
`src/data/rosterEngineConstants.ts` (+114 lines, ADD-ONLY). First production
reader of `traitInteractionMatrix.ts`. Did not commit.

### AUDIT VERDICT: CONFORMS
Independent re-verification by the auditor (every command rerun — NOT graded
from the builder self-report):
- `NODE_ENV= npx tsc --noEmit` → rc=0, 0 TS errors
- `NODE_ENV= npm run build` → rc=0 (built in 7.90s)
- focused `vitest run effectiveRatings.test.ts` → 12/12
- full `vitest run` → 7,149 pass / 3 fail; reconciles EXACTLY as 7,140 baseline
  + 12 new T6 tests = 7,152 / 384 files; the 3 fails are the documented
  characterized set (wpaRuntimeBoundary, franchiseNarrativeEventEligibility,
  franchiseManualSmokeFixture order-flake). NO new RED.
- Golden/SMB4-asset files BYTE-UNCHANGED: `git diff --name-only` names none of
  ivEngine / salaryCalculator / mojoEngine / fitnessEngine / traitInteractionMatrix
  / traitPricing / ivCurves / tierParams / playerDatabase; only the 2 new engine
  files are untracked.
- `rosterEngineConstants.ts` ADD-ONLY (0 removed lines; E11 snapshots every
  pre-existing export by exact value).
- Independent oracle spot-check (hand math, not the suite): Clutch + Jacked +
  extreme → POW 90 = MATCH (base 50 + Clutch +5×2 A14 + mojo +15×2 pressure).
- Audit gate (T4–T11): (1) tests pass ✓ (2) NFL + documented falsification ✓
  (3) §4 section-by-section conformance ✓ (4) state/persistence migration N/A —
  pure engine, no persistence/IndexedDB.

### Disagreements with builder / findings (severity-rated)
1. [MEDIUM → RESOLVED] `handednessBonus` is not a discrete §4.1 term; handedness
   applied only via matrix `vsHand` split traits (consistent with the contract's
   "§4.1 splits" gloss; no published universal-platoon magnitude). **JK ruling
   2026-06-14:** T6 splits-handling is correct AS-IS; the STATIC switch>left>right
   base premium belongs in base IV pricing (AUX_PRICING) → tracked as **FINDING-148**
   (separate JK-gated ticket). Finding #1 closed for T6.
2. [LOW] opponent traits scale by the SUBJECT's potency tier (effectiveRatings.ts
   line 493), not the opponent's — moot at L2 default; flag for T7/T8 surfaces.
3. [LOW] pitcher ARM=99 hardcoded inline in `defensivePlacementRisk` (line 510)
   instead of importing `PITCHER_ASSUMED_ARM` (correct value, wrong source).
4. [LOW] unconsumed registry constants: `ROLE_MISUSE_MOJO_PENALTY` (legit T9 /
   between-events data) + `FATIGUE_MODEL.{recoveryGames,durableFactor,
   injuryProneFactor}` (last two duplicate the matrix's Durable/Injury-Prone
   factor the engine actually uses — dead duplicates; wire or drop).
5. [LOW under-flag] `Player` → local `EffectiveRatingsPlayer` structural-type
   substitution not explicitly flagged (contract permitted it "and FLAG it").
6. [INFO] mojo delta applied to all 8 attrs incl. pitcher attrs for hitters —
   harmless; §4.2 says "all attributes".
Builder F1–F5 all valid; builder verification claims reproduced exactly. The
builder's "dirty-worktree git diff --stat" caveat is fair (Captain's uncommitted
doc edits + untracked new files mean `--stat` alone can't show "only 3 files";
the golden-unchanged grep + untracked-file list confirm the real 3-file scope).

### JK ratification (2026-06-14)
Findings #2–#6 + builder F1–F5 RATIFIED for v1 (all CALIBRATE / surface /
cleanup-class). Finding #1 RESOLVED via FINDING-148. **T6 = built + audited
CONFORMS.** Browser sign-off N/A for T6 itself (no user-visible surface, R-T6-2);
attaches when a T7+ surface consumes the engine. SMB4-asset gate satisfied by
R-T6-1 approval + audit confirming the legacy mojo/fitness engines are untouched.


---

## CONTRACT: T7a — Optimal Lineups vs L/R + one-button re-optimize (IV-of-effectiveRatings) (drafted 2026-06-14)

**ROUTE: Codex 5.5 | very high → audit (Fable 5 CLI per spec; Opus 4.8 while Fable unavailable — auditor ≠ builder) | very high reasoning effort**

**STATUS: DRAFTED + JK-APPROVED for handoff (2026-06-14).** Flag rulings ratified:
**F1** behavior-change acknowledged → JK browser-verify on real data is the close;
**F2** BATTING_ORDER_SLOT_WEIGHTS drafted, JK approves at audit; **F3** §8.2
last-3-games mojo-trajectory proxy **DEFERRED** (v1 = live mojo/fitness if present,
else neutral { mojo:'Normal', fitness:'FIT' }); **F4** in-place optimalLineup.ts
scoring swap + ALGORITHM_VERSION bump **confirmed**.

### Ratified rulings (binding inputs)
- **R-T7-SPLIT (JK 2026-06-14):** T7 is sliced into THREE feature tickets —
  **T7a** = §8.1/§8.2 optimal lineups + re-optimize (THIS), **T7b** = §8.3
  call-up/send-down recs, **T7c** = §8.4 season salary ledger. T7a does NOT
  build the ledger, call-up/send-down recs, `recommendRosterMoves`, or
  `ledgerCapCharge` — those are T7b/T7c.
- **R-T6-2 (carried, load-bearing):** IV-of-effectiveRatings here is the
  TRANSIENT lineup-optimizer score ONLY. It MUST NOT be wired into the persisted
  True Value pipeline (`calculateTrueValue` / `franchiseTrueValueStorage` /
  `FranchiseValueInputRow`). No persisted-TrueValue change in T7a.
- **Golden-frozen consume-only:** `ivEngine.ts` (`computeIV`) and
  `salaryCalculator.ts` are called, NEVER edited (oracle `iv_oracle.json`;
  `ivEngine.test.ts:184`). `effectiveRatings.ts` (T6) consume-only.

### What is already built (CONSUME / refactor — do NOT rebuild) — Captain-verified 2026-06-14
- **The optimizer machinery exists:** `src/utils/optimalLineup.ts` (750 lines) —
  `buildOptimalLineupSnapshot` (:229), `buildSnapshot` (:432), `buildSlot`
  (:467), `platoonBonus` (:626), the snapshot field helpers, comparison, and
  persistence. The per-candidate SCORE today is `offense + defense +
  platoonBonus(candidate, hand) + fitness + mojo + traits` (~:520, :543) — a RAW-
  rating heuristic. T7a SWAPS this scoring core to IV-of-effectiveRatings and
  KEEPS the public API + snapshot/persistence shape stable.
- **The UI exists:** `TeamHubContent.tsx` OPTIMAL LINEUP BENCHMARKS vs RHP/LHP
  (:2949–3054) with COMPARE/APPLY/RECALC/SET + DH toggle; handler
  `handleRecalculateFranchiseOptimal`. T7a feeds it PlayerStates and the new
  scoring; it does NOT redesign the panel.
- **Persistence sink exists:** `Team.optimalLineupVs{R,L}HP{With,Without}DH`
  (`leagueBuilderStorage.ts:95`, `OptimalLineupSnapshot`). Reuse — no new store.
- **The engines exist:** T6 `effectiveRatings(p,state,ctx)` /
  `defensivePlacementRisk(p,pos)` + T4 `computeIV` — all audited CONFORMS.

```
You are the Mode 2 Lineup Optimizer Implementer (TypeScript). HIGH-RISK ticket:
you are changing the SCORING of a LIVE, persisted, user-visible optimizer. Very
high reasoning effort. Think step-by-step.

GOAL:
Make the optimal-lineup optimizer score by IV spec §8.1 — "maximize Σ IV-of-
effectiveRatings over lineup slots" — instead of the current raw-rating heuristic.
Create the §11 pure engine `src/engines/rosterAnalyzer.ts` exporting
`optimizeLineup(team, vs, states): LineupRecommendation`, refactor
`src/utils/optimalLineup.ts` to score through it (public API UNCHANGED), and feed
the existing Team Hub RECALC/re-optimize path the player states it needs. NO new
persistence, NO True Value wiring, NO edits to the golden engines.

SOURCE OF TRUTH:
- IV spec §8.1 (optimal lineups vs L/R), §8.2 (one-button re-optimize), §11
  (rosterAnalyzer signatures). §9 (Lineup Delta WPA) is T10 — OUT of scope here.
- T6 engine: src/engines/effectiveRatings.ts (effectiveRatings, defensivePlacementRisk).
- THE IV SEAM (verified — implement EXACTLY): src/engines/ivEngine.ts —
  `mapBatterRatings` (:166) returns `{...input.ratings}` when `input.ratings` is
  set (full override); for NON-pitchers `computeIV` (:646-648) sets
  `kbl = cloneBreakdown(raw)` so the hitter override reaches kblIV.
  `mapPitcherRatings` (:183) reads `input.pitcherRatings` EXCLUSIVELY (VEL/JNK/ACC)
  and NEVER `input.ratings`.

ENV: prefix every CLI with `NODE_ENV= `; node at ~/.nvm/versions/node/v20.20.0/bin.

THE LOAD-BEARING SEAM (get this exactly right or pitcher scoring is silently wrong):
To price IV-of-effectiveRatings for a candidate at a slot:
  1. Build the slot's GameContext: opposingHand = vs ('L'|'R'), plus the player's
     state (mojo/fitness/workload) from `states`. (Lineup optimization is a
     pre-game, full-PA evaluation — use neutral count/pressure/runners; handedness
     + mojo/fitness/fatigue + handedness-split traits are the active inputs.)
  2. eff = effectiveRatings(player, state, ctx)  // Ratings over POW..ACC
  3. Construct the player's IVPlayerInput AND SPLIT eff into BOTH channels:
       input.ratings        = { POW, CON, SPD, FLD, ARM }   // hitter path
       input.pitcherRatings = { velocity: VEL, junk: JNK, accuracy: ACC } // pitcher path
     — because input.ratings is read on the hitter path only and pitcherRatings on
     the pitcher path only. input.ratings is a FULL override: pass all five hitter
     attrs (unset attrs zero out). Preserve the rest of IVPlayerInput (isPitcher,
     primaryPosition, pitcherRole, traits, arsenal, armSlot, secondaryPosition)
     from the player so curve-block resolution is correct.
  4. slotScore = computeIV(input).kblIV
Sum slotScore across the batting order; solve the defensive arrangement JOINTLY
using defensivePlacementRisk(player, pos) (a low-FLD player at a high-traffic
position is penalized). Assignment problem: greedy + local-swap is acceptable v1
(exact Hungarian optional). Verify no out-of-curve-range blowup when effective
ratings are clamped/extreme.

STEP 1 — NEW ENGINE src/engines/rosterAnalyzer.ts (pure: no React/IndexedDB/DOM/
Date.now/random):
- Define §11 types: LineupRecommendation (recommended batting order [slot→player],
  defensive assignment [pos→player], per-slot justification strings, totalScore),
  PlayerStates (Record<playerId, PlayerState> reusing the T6 PlayerState).
- export optimizeLineup(team: Team, vs: 'L'|'R', states: PlayerStates):
  LineupRecommendation — the IV-of-effectiveRatings scorer + joint assignment above.
- Justification strings per §8.2 cite the dominant factor ("Tense mojo",
  "POW vs RHP active", "fitness low / catcher rest"). Derive from the
  effectiveRatings inputs, not invented.
- Do NOT add recommendRosterMoves or ledgerCapCharge (T7b/T7c).
- Use the salaryCalculator `Team` (leagueBuilderStorage.ts:95) — NOT types/index Team.

STEP 2 — REFACTOR src/utils/optimalLineup.ts scoring (KEEP PUBLIC API STABLE):
- Replace the raw per-candidate score (`offense + defense + platoonBonus + fitness
  + mojo + traits`, ~:520/:543 in buildSlot/buildSnapshot) with the IV-of-
  effectiveRatings score from STEP 1 (call rosterAnalyzer or a shared scoring fn).
- effectiveRatings ALREADY composes platoon/mojo/fitness/traits — do NOT double-
  count by also adding the old heuristic terms. The old platoonBonus/fitness/mojo/
  traits scoring is SUBSUMED; remove from the score (keep the functions only if
  still referenced elsewhere — grep first).
- buildOptimalLineupSnapshot signature, OptimalLineupSnapshot shape, snapshot
  fields, persistence, comparison helpers, OPTIMAL_LINEUP_ALGORITHM_VERSION
  (BUMP it — the algorithm changed) MUST stay API-compatible. Existing callers
  (TeamHub, GameTracker launch) keep working.
- optimalLineup.ts must now thread PlayerStates through to the scorer. Where the
  caller has no live states, default each to { mojo:'Normal', fitness:'FIT' }
  (neutral) — see FLAG F3.

STEP 3 — BATTING-ORDER SLOT WEIGHTS (§8.1 / §15.2 — "Claude drafts, JK approves"):
- Add BATTING_ORDER_SLOT_WEIGHTS to src/data/rosterEngineConstants.ts (ADD-ONLY,
  CALIBRATE) — a drafted per-slot weight vector (leadoff/2-hole/3/cleanup/... )
  with a one-line rationale comment. These are NOT yet user-approved — FLAG F2.

STEP 4 — WIRE Team Hub re-optimize:
- `handleRecalculateFranchiseOptimal` (TeamHubContent.tsx) must supply PlayerStates
  to the optimize/snapshot call. v1: best-available mojo/fitness per player, else
  neutral default (F3). Keep COMPARE/APPLY/SET behavior intact.

STEP 5 — TESTS (src/engines/__tests__/rosterAnalyzer.test.ts + optimalLineup
scoring tests):
- SEAM: a player whose effectiveRatings differ from base produces a DIFFERENT
  computeIV().kblIV via the override; specifically a PITCHER's effective VEL/JNK/ACC
  changes kblIV ONLY because they are written to input.pitcherRatings (prove the
  split — a test that writes pitcher attrs to input.ratings alone does NOT move
  pitcher kblIV).
- HITTER override reaches kblIV (non-pitcher kbl = clone(raw)).
- optimizeLineup ranks a high-effectiveRatings player above a low one; vs-L vs
  vs-R differ when a handedness-split trait is present; defensivePlacementRisk
  pulls a low-FLD player off a high-traffic position in the arrangement.
- PURITY SEAM: rosterAnalyzer.ts source does NOT import salaryCalculator/
  tierParams/playerDatabase/storage/React; determinism.
- API-STABILITY: buildOptimalLineupSnapshot still returns the documented shape;
  registry add-only (snapshot pre-existing exports unchanged).

CONSTRAINTS — do NOT touch: src/engines/ivEngine.ts, src/engines/salaryCalculator.ts,
src/engines/effectiveRatings.ts, src/data/traitInteractionMatrix.ts, the golden
oracle/cases (must stay byte-unchanged). No new IndexedDB store, no DB version bump
(that's T7c). rosterEngineConstants.ts ADD-ONLY. Do NOT extend the pre-existing
`rosterAnalyzerEngine.ts` (advisory report — that is T7b territory); author the new
`rosterAnalyzer.ts`. Do NOT wire effectiveRatings into persisted TrueValue (R-T6-2).

VERIFICATION (run and paste actual output):
- NODE_ENV= npx vitest run src/engines/__tests__/rosterAnalyzer.test.ts (+ optimalLineup tests) → green
- NODE_ENV= npx tsc --noEmit → clean
- NODE_ENV= npm run build → exit 0
- NODE_ENV= npx vitest run (full) → no new RED outside the characterized set (baseline 7,152/384 + your new tests)
- GOLDEN BYTE-UNCHANGED: ivEngine/salaryCalculator/effectiveRatings/iv_oracle.json/
  golden cases appear in NO diff (git diff --stat + a grep)
- git diff --stat → only rosterAnalyzer.ts (+test), optimalLineup.ts,
  rosterEngineConstants.ts, TeamHubContent.tsx (and any test mocks — enumerate ALL)
- (Encouraged, not closing) a Playwright pre-check that RECALC produces a lineup
  and the panel renders — report it; JK's browser sign-off on real franchise data
  is the SOLE close (this ticket CHANGES recommended lineups — F1).

FLAGGED FOR JK:
  F1 BEHAVIOR CHANGE: recommended lineups WILL differ from today (raw → IV-of-
     effectiveRatings, spec-mandated §8.1). Requires JK browser-verify on real data.
  F2 BATTING_ORDER_SLOT_WEIGHTS drafted (§15.2) — needs JK approval.
  F3 PlayerStates source: v1 uses live mojo/fitness if present else neutral default;
     the §8.2 "last-3-games mojo-trajectory proxy" is NOT implemented here — confirm
     defer to a follow-up, or in-scope for T7a.
  F4 optimalLineup.ts refactor approach: in-place scoring swap with stable API +
     ALGORITHM_VERSION bump — confirm acceptable (vs a larger consolidation).

FORMAT:
1. Files changed (every git status path, incl. test mocks)
2. Per-file changes citing the §/ruling each implements
3. The seam implementation (how eff splits into ratings + pitcherRatings) quoted
4. Verification results (actual output for every line above)
5. FLAGGED FOR JK (F1–F4 + anything new)
6. "T7a complete" OR "BLOCKED: [exact reason]"

FAILURE PROTOCOL:
- A change needing an edit to any do-NOT-touch file → STOP and report.
- If the API-stable refactor of optimalLineup.ts is not achievable without breaking
  a caller → STOP and report the caller, do not break it.
- A magnitude not derivable from spec/workbook and not in the CALIBRATE set →
  STOP and ask; never invent a precise number.
- Enumerate every changed path; never summarize or batch.

Use very high reasoning effort. Think step-by-step.
```


---

## T7a-AUDIT + EXECUTION RECORD (2026-06-14)

**ROUTE actual:** Codex 5.5 | very high (codex CLI, workspace-write,
model_reasoning_effort=high = codex's top tier; "very high" is our max-effort +
audit-non-negotiable class) BUILT → Opus 4.8 AUDIT (Fable unavailable; auditor ≠
builder — Captain wrote the contract, not the code).

### Builder result (Codex 5.5)
CREATED src/engines/rosterAnalyzer.ts (431 lines, `optimizeLineup` ONLY) +
rosterAnalyzer.test.ts (8 tests). MODIFIED optimalLineup.ts (scoring swapped to
IV-of-effectiveRatings via rosterAnalyzer; public API stable; ALGORITHM_VERSION
bumped; optional playerStates threaded), optimalLineup.test.ts (version
expectation), rosterEngineConstants.ts (add-only BATTING_ORDER_SLOT_WEIGHTS +
CALIBRATE), TeamHubContent.tsx (RECALC/current/compare pass player states).

### AUDIT VERDICT: CONFORMS
Independent re-verification (every command rerun):
- tsc rc=0; build rc=0 (7.79s); focused 22/22; full suite 7,157 pass / 3 fail —
  reconciles as 7,152 baseline + 8 new = 7,160 / 385; the 3 fails are the
  characterized set. NO new RED.
- Golden/SMB4 byte-unchanged: git diff names none of ivEngine / salaryCalculator /
  effectiveRatings / iv_oracle.json.
- rosterEngineConstants ADD-ONLY (0 removed lines).
- THE SEAM (load-bearing) verified + strongly tested: a test proves pitcher
  effective VEL/JNK/ACC written to input.ratings are a NO-OP (=== base) and ONLY
  input.pitcherRatings moves kblIV (> base) — the split is necessary and correct.
  A full-loop test (real effectiveRatings(On Fire) → split → computeIV) > base.
- R-T7-SPLIT boundary proven: `Object.keys(module) === ['optimizeLineup']` (no
  recommendRosterMoves / ledgerCapCharge).
- No double-count: buildSlot uses `input.projectedValueScore ?? fallback`
  (either/or, NOT a sum); the old heuristic remains a fallback for legacy paths.
- Purity seam test passes; potency L2-neutral; defensivePlacementRisk drives the
  defensive arrangement (low-FLD pulled off SS).
- Audit gate: (1) tests ✓ (2) NFL + falsification ✓ (3) §8.1/§8.2/§11 conformance ✓
  (4) persistence migration N/A — no new store (that is T7c).

### Findings (LOW, ratified by JK 2026-06-14)
1. Codex added a CALIBRATE object (lineupDefensiveRiskIvPenalty 300_000, display +
   WPA divisors) beyond BATTING_ORDER_SLOT_WEIGHTS — optimizer tuning constants,
   add-only; extends F2 (JK approves). lineupSnapshotWpaDivisor feeds a PRE-EXISTING
   snapshot display field, NOT the T10 Lineup-Delta-WPA standard (boundary held).
2. Old projectedValueScore heuristic retained as a fallback (not a double-count).
3. Permissive AnalysisTeam/AnalysisPlayer input typing (pragmatic; like T6).
Builder F1–F4 valid; "Playwright not run" honestly flagged.

### JK ratification (2026-06-14)
Findings + F2/F3/F4 ratified. **F1 BEHAVIOR CHANGE → BROWSER-PENDING** (batched in
CURRENT_STATE BROWSER-VERIFY; JK browser sign-off on real franchise data is the
close). T7a = built + audited CONFORMS, COMMITTED. Standing mode adopted (JK):
auto-commit verified-complete tickets + proceed; pause only for scope/design/asset
decisions + browser-batch.


---

## CONTRACT: T7b — Call-up / send-down recommendations (advisory, leak-safe) (drafted 2026-06-14)

**ROUTE: Codex 5.5 | very high → audit (Fable 5 CLI per spec; Opus 4.8 while Fable unavailable — auditor ≠ builder) | very high reasoning effort**

**STATUS: DRAFTED + JK-APPROVED for handoff (2026-06-14)** (design decisions
resolved with JK below; per the standing mode this goes straight to Codex).

### Ratified rulings (binding inputs — JK 2026-06-14)
- **R-T7-SPLIT:** T7b = §8.3 call-up/send-down RECS only. T7a ✅ done; T7c = §8.4 ledger.
- **R-T7b-ADVISORY:** T7b surfaces ranked, READ-ONLY advisory recs. It MUST NOT
  execute moves (does NOT call `callUpFranchisePlayer`/`sendDownFranchisePlayer`),
  MUST NOT mutate roster/ledger state. Executing a rec + the ledger consequence is
  T7c.
- **R-T7b-LEAK (no-oracle-leak principle — DECISIONS_LOG 2026-06-14):** the rec
  engine may consume ONLY scout-visible information when valuing a player whose
  true ratings are HIDDEN. Farm prospects are valued from `scoutedGrade` +
  `scoutConfidence` (scout-visible), NEVER from true ratings / true overall / true
  IV. MLB players (known commodities) use true TV2 value. A rec built on true value
  is an oracle that leaks hidden ratings — forbidden.
- **Golden/frozen consume-only:** ivEngine, salaryCalculator, effectiveRatings, and
  the persisted TV2 rows (READ `getFranchiseTrueValueRows` / `calculateTrueValue`;
  never recompute or wire ratings into persisted TrueValue — R-T6-2).

### What is already built (consume / unblock — do NOT rebuild) — Captain-verified 2026-06-14
- **The recs are stubbed, not missing:** `rosterAnalyzerEngine.ts` (1108 lines)
  defines `call_up_advice`/`send_down_advice` kinds; FOUR emitters (~:947, :975,
  :1004, :1050) emit `kind:'farm_monitor'`, `execution:'blocked_future_work'`,
  `blockedBy:['call_up_send_down_execution_not_in_mvp']`. The rec factory already
  defaults `execution: input.execution ?? 'read_only'` (:466-471). T7b UNBLOCKS
  these four sites.
- **Executors exist (do NOT call — advisory-only):** `franchiseRosterMovement.ts`
  `callUpFranchisePlayer` (:576) / `sendDownFranchisePlayer` (:417).
- **MLB surplus exists:** TV2 `calculateTrueValue` `valueDelta` (TrueValue − salary);
  persisted `franchiseTrueValueRows` via `getFranchiseTrueValueRows`. READ.
- **Scout-visible farm valuation EXISTS (no T8 dependency):** `franchisePlayerProfile.ts`
  carries `scoutedGrade` + `scoutConfidence`; `franchiseSalary.ts:108`
  `prospectSalaryForDraftRound(safeRoundFromScoutedGrade(profile.scoutedGrade))`
  already derives a prospect salary from the scouted grade. The §7.4 CONTINUOUS
  scout-obscured trueIV range is T8 — NOT needed here.
- **Adapter:** `rosterAnalyzerFranchiseAdapter.ts` hardcodes `eligibleForSendDown:
  false` (:218) — T7b computes real eligibility. `FranchiseFarmRecord` carries
  `ratingRevealState: 'hidden'|'revealed'`.
- **Rec surface exists:** the analyzer recs render through the existing
  FranchiseRosterAnalyzerPanel / Team Hub — T7b's unblocked recs flow through it,
  no new panel.

```
You are the Roster-Move Recommendation Implementer (TypeScript). Very high
reasoning effort. LEAK-SAFETY is the load-bearing correctness property of this
ticket — read R-T7b-LEAK twice.

GOAL:
Make call-up/send-down recommendations LIVE as ranked, READ-ONLY, leak-safe
advisory (§8.3). Add `recommendRosterMoves(team, farm, league): MoveRecommendation[]`
to the EXISTING src/engines/rosterAnalyzer.ts (keep optimizeLineup), unblock the
four stubbed emitters in rosterAnalyzerEngine.ts, extend the franchise adapter to
compute real send-down eligibility + feed SCOUT-VISIBLE farm valuation, and add
calloutThreshold (CALIBRATE). NO execution, NO ledger, NO state mutation.

SOURCE OF TRUTH: IV spec §8.3 (recs), §7.4 (scout leak rule), §11
(recommendRosterMoves signature); DECISIONS_LOG "no-oracle-leak principle".
ENV: prefix every CLI with `NODE_ENV= `; node at ~/.nvm/versions/node/v20.20.0/bin.

THE RECOMMENDATION LOGIC (§8.3, leak-safe per R-T7b-LEAK):
- MLB player surplus = TrueValue − salary = TV2 valueDelta (READ persisted
  franchiseTrueValueRows via getFranchiseTrueValueRows, or calculateTrueValue with
  already-known inputs). KNOWN/certain side.
- Farm player projected surplus = projectedValue(scoutedGrade) − rookieScaleSalary,
  where projectedValue derives ONLY from the SCOUT-VISIBLE `scoutedGrade` (NEVER
  true ratings/overall/IV), and rookieScaleSalary = ROOKIE_SCALE_FACTOR (0.50) ×
  the prospect's scout-visible salary (franchiseSalary prospectSalaryForDraftRound).
  UNCERTAIN side.
- Recommend swaps where (farmSurplus − mlbSurplus) > calloutThreshold AND positional
  fit holds; rank by the surplus gap.
- LEAK-SAFE DISPLAY: rec message = "projects as a positive-surplus replacement"
  plus a scout-confidence label derived from `scoutConfidence`. NEVER expose the
  prospect's hidden ratings, true overall, or true IV pre-call-up. Send-down recs
  (MLB → farm, known under-performers) are the certain side.

STEP 1 — ENGINE (src/engines/rosterAnalyzer.ts, ADD recommendRosterMoves; keep
optimizeLineup; pure: no React/IndexedDB/DOM/Date.now/random):
- Define MoveRecommendation { kind:'call_up'|'send_down'; playerId; replacesPlayerId?;
  surplusGap:number; scoutConfidence?:string; positionalFit:boolean; justification:string }
  and PlayerStates/FarmRoster usage per §11. recommendRosterMoves(team, farm, league)
  returns ranked MoveRecommendation[].
- MUST NOT import or call the franchiseRosterMovement executors (advisory-only).
- MUST NOT read a hidden farm player's true ratings/overall/IV — only scoutedGrade/
  scoutConfidence. (Structure the inputs so true ratings are not even in scope for
  hidden-state farm players.)

STEP 2 — UNBLOCK rosterAnalyzerEngine.ts (the 4 emitters): grep the literal
'call_up_send_down_execution_not_in_mvp' to find every site; flip
kind 'farm_monitor' → 'call_up_advice'/'send_down_advice' (as appropriate),
execution 'blocked_future_work' → 'read_only', remove the blockedBy stub. Recs
carry the leak-safe message + scout-confidence. Do not otherwise change analyzeRoster.

STEP 3 — ADAPTER rosterAnalyzerFranchiseAdapter.ts: replace the hardcoded
`eligibleForSendDown: false` (:218) with real eligibility (option/roster rules —
e.g. on MLB roster, options remaining); feed scoutedGrade/scoutConfidence into the
rec inputs for farm players. For hidden-state farm players NEVER pass true ratings.

STEP 4 — CONSTANTS rosterEngineConstants.ts (ADD-ONLY): calloutThreshold (CALIBRATE,
TBD playtest — deferred from T6 R-T6-3). If a grade→projectedValue mapping constant
is needed, add it CALIBRATE with a rationale comment (reuse an existing grade→value/
salary curve if one exists — grep first). FLAG both (F1/F2).

STEP 5 — SURFACE: the unblocked recs render through the existing analyzer rec panel
(FranchiseRosterAnalyzerPanel / Team Hub). Confirm they display read-only + leak-safe;
do NOT build a new panel and do NOT add an execute button (R-T7b-ADVISORY).

STEP 6 — TESTS:
- LEAK TEST (the load-bearing one): for a hidden-state farm prospect, changing the
  TRUE ratings/overall while holding scoutedGrade/scoutConfidence constant produces
  the SAME recommendation; changing scoutedGrade DOES change it. Proves the rec
  consumes only scout-visible info.
- ADVISORY TEST: recommendRosterMoves source does NOT import/call
  callUpFranchisePlayer/sendDownFranchisePlayer (no execution).
- LOGIC: a low-cost high-scouted-surplus prospect is recommended over a high-cost
  underperforming MLB player when the gap exceeds calloutThreshold; positional fit
  gate works; ranking by surplus gap.
- PURITY: rosterAnalyzer.ts stays free of salaryCalculator/tierParams/playerDatabase/
  React/storage imports for the new code (it may already import computeIV/effectiveRatings
  from T7a — that is fine; recommendRosterMoves itself reads TV2 via a passed-in
  league/rows input, NOT by importing storage).
- The four unblocked emitters now emit read_only call_up_advice/send_down_advice
  (no blocked_future_work / blockedBy remains for these).

CONSTRAINTS — do NOT touch: ivEngine.ts, salaryCalculator.ts, effectiveRatings.ts,
the franchiseRosterMovement executors (no calls), traitInteractionMatrix.ts. NO new
IndexedDB store / DB version bump (T7c). NO ledger. NO persisted-TrueValue recompute
(read only; R-T6-2). rosterEngineConstants ADD-ONLY. Do NOT expose hidden ratings.

VERIFICATION (run + paste):
- NODE_ENV= npx vitest run <new tests> → green
- NODE_ENV= npx tsc --noEmit → clean
- NODE_ENV= npm run build → exit 0
- NODE_ENV= npx vitest run (full) → no new RED outside the characterized set (baseline 7,160/385 + your new tests)
- GOLDEN/SMB4 byte-unchanged: git diff --name-only lists none of ivEngine/
  salaryCalculator/effectiveRatings/iv_oracle.json
- git diff --stat → enumerate every changed path (rosterAnalyzer.ts, rosterAnalyzerEngine.ts,
  rosterAnalyzerFranchiseAdapter.ts, rosterEngineConstants.ts, tests, any surface file)

FLAGGED FOR JK:
  F1 grade→projectedValue mapping for farm = CALIBRATE draft — approve.
  F2 calloutThreshold = CALIBRATE placeholder (TBD playtest).
  F3 proactive call-up notification hook stays stubbed / default-off (§8.3) — deferred.
  F4 advisory-only — executing a rec + the ledger consequence is T7c.
  F5 scout-confidence label surfaced on each rec (risk/reward made visible, leak-safe).

FORMAT: (1) files changed (every path) (2) per-file changes citing §/ruling
(3) the leak-safety implementation (how hidden ratings are kept out of scope)
(4) verification output (5) FLAGGED FOR JK (6) "T7b complete" OR "BLOCKED: [reason]".

FAILURE PROTOCOL: a change needing a do-NOT-touch edit → STOP and report. If real
send-down eligibility cannot be computed from available roster/option data → report
what's missing, do not guess. If valuing a farm prospect would require its true
(hidden) ratings → STOP (that violates R-T7b-LEAK) and report. Enumerate every path.

Use very high reasoning effort. Think step-by-step. Do NOT commit — leave changes
in the working tree for audit.
```


---

## T7b-AUDIT + EXECUTION RECORD (2026-06-14)

**ROUTE actual:** Codex 5.5 | very high (codex CLI, workspace-write,
model_reasoning_effort=high) BUILT → Opus 4.8 AUDIT (Fable unavailable; auditor ≠
builder — Captain wrote the contract, not the code).

### Builder result (Codex 5.5)
ADDED `recommendRosterMoves` to src/engines/rosterAnalyzer.ts (advisory §11);
UNBLOCKED the 4 stubbed emitters in rosterAnalyzerEngine.ts (→ read_only
call_up_advice/send_down_advice); EXTENDED rosterAnalyzerFranchiseAdapter.ts (real
eligibleForSendDown + scout-visible farm valuation + hidden-rating strip); add-only
rosterEngineConstants (ROSTER_MOVE_CALLOUT_THRESHOLD, ROOKIE_SCALE_FACTOR,
FARM_SCOUTED_GRADE_PROJECTED_VALUE); TeamHubContent reads TV2 rows + displays the
recs (no new panel, no execute button). 11 files, +751/−55.

### AUDIT VERDICT: CONFORMS
Independent re-verification (every command rerun):
- tsc 0; build 0 (7.82s); focused 70/70; full suite 7,161 pass / 3 fail —
  reconciles 7,160 + 4 new = 7,164 / 385; the 3 fails are the characterized set.
  NO new RED.
- Golden/SMB4 byte-unchanged (ivEngine / salaryCalculator / effectiveRatings /
  iv_oracle.json).
- rosterEngineConstants ADD-ONLY (0 removed lines).
- LEAK-SAFETY (load-bearing, R-T7b-LEAK) implemented + PROVEN: farm surplus =
  FARM_SCOUTED_GRADE_PROJECTED_VALUE[scoutedGrade] − scoutVisibleSalary×rookieScale
  (scout-visible ONLY); the adapter strips hidden-farm ratings to `{}`. The leak
  test asserts flipping a hidden prospect's trueRatings/trueOverall/trueIV is INERT
  (`.toEqual(base)`) while scoutedGrade changes the rec; the justification never
  matches `/true|IV|overall|rating/`.
- ADVISORY-ONLY (R-T7b-ADVISORY): no executor import in rosterAnalyzer.ts (grep +
  source-guard test). No state mutation, no ledger.
- §8.3 logic correct: MLB surplus (TV2 valueDelta, KNOWN) vs farm scout-visible
  surplus (UNCERTAIN), gap > calloutThreshold, positional fit, ranked by gap.

### Findings (LOW, ratified by JK 2026-06-14)
1. ROOKIE_SCALE_FACTOR duplicated (salaryCalculator.ts:380 + rosterEngineConstants
   .ts:213, both 0.50) — benign now; SINGLE-SOURCE in T7c (which owns the ledger /
   rookie-scale registry constants).
2. eligibleForSendDown/eligibleForCallUp default `true` in the engine if unset — the
   adapter supplies the real gate; acceptable.
Builder F1–F6 valid (F6: rec ranking is naturally limited until TV2 rows exist — expected).

### JK ratification (2026-06-14)
Findings + F1–F6 ratified. **BROWSER-PENDING** (recs panel renders read-only +
leak-safe). T7b = built + audited CONFORMS, COMMITTED.


---

## CONTRACT: T7c — Season Salary Ledger (§8.4) (drafted 2026-06-14)

**ROUTE: Codex 5.5 | very high → audit (Fable 5 CLI per spec; Opus 4.8 while Fable unavailable — auditor ≠ builder) | very high reasoning effort. PERSISTENCE/MIGRATION AUDIT NON-NEGOTIABLE** (new IndexedDB store + DB version bump + producer wiring into live executors).

**STATUS: DRAFTED + JK-APPROVED for handoff (2026-06-14)** (scope decisions
resolved with JK below; per the standing mode this goes straight to Codex).

### Ratified rulings (binding inputs — JK 2026-06-14)
- **R-T7-SPLIT:** T7c = §8.4 ledger. T7a/T7b ✅ done.
- **R-T7c-SCOPE:** T7c builds the ledger store + LedgerEntry/LedgerStatus state
  machine + capCharge + the call-up/demotion PRODUCER + `rookieScaleActive` flip +
  Phase-3 reset + constants. **DEFER** (do NOT build): the payroll-expectation
  baseline, the capCharge→fan-morale consequence, the declared-budget concept, and
  one-click execute-from-rec. Rationale: the consumer machinery is orphaned
  (`calculateFanExpectations` 0 callers) / hard-gated (`fanMoraleMutationAllowed:
  false`), and the declared-budget anchor (v1.1.2) does not exist yet. capCharge
  persists, ready for that future ticket. Execution stays the user's existing
  manual roster action.
- **R-T7c-MIGRATION:** the ledger store goes in the shared `kbl-tracker` DB via
  `src/utils/trackerDb.ts` ONLY (the v-conflict-hang landmine — never open
  `kbl-tracker` elsewhere). Bump `TRACKER_DB_VERSION` 14→15 with a
  `contains()`-guarded add-only `createObjectStore` block appended at the END of
  `onupgradeneeded` (clone the v13/v14 pattern); NO destructive migration, NO
  data backfill.
- **Golden/frozen:** ivEngine + the frozen oracle untouched (capCharge is a
  downstream multiplier of an already-priced salary — keep it OUT of the IV layer).
  salaryCalculator's ENGINE is not edited — T7c is a CALLER that passes
  `rookieScaleActive: true` to its existing option (:104-106, consumed :790).

### What is already built (consume / clone — do NOT rebuild) — Captain-verified 2026-06-14
- `trackerDb.ts:17` `TRACKER_DB_VERSION = 14`; the v13 (`franchiseTrueValueRows`
  :117-127) and v14 (`franchiseDesignationRows` :132-145) add-only store blocks are
  the EXACT template (guarded createObjectStore + composite keyPath + by_scope
  index). T7c bumps to 15 + appends one block.
- `franchiseTrueValueStorage.ts` is the storage-module precedent to CLONE:
  `initX() => getTrackerDb()`, `scopeKey` → `[franchiseId,seasonId,statsScopeId]`,
  `rowKey` → `[...,playerId]`, replace-for-scope, STORE_NAME const, test reset helpers.
- `franchisePersistenceContract.ts` `getFranchiseSeasonId(fid,n)` =
  `${fid}-season-${n}`, `statsScopeId === seasonId`. Phase-3 reset = a fresh
  seasonNumber → fresh seasonId → naturally empty ledger scope (no row deletion).
- PRODUCER seam: `franchiseRosterMovement.ts` `callUpFranchisePlayer` (:576, hook
  after the successful txn ~:676) / `sendDownFranchisePlayer` (:417, ~:546). Both
  carry `RosterMoveEvent.salaryMovementApplied` hardcoded `false` (:86,:256) — the
  flag T7c flips to true.
- `salaryCalculator.ts` `rookieScaleActive?` option (:104-106) consumed at :790 as
  `ageFactor = rookieScaleActive ? ROOKIE_SCALE_FACTOR : calculateAgeFactor(age)`
  (REPLACES age factor — NO stacking/double-discount, D6/FINDING-127).
  `ROOKIE_SCALE_FACTOR` (:380) is canonical (consumed internally); the
  `rosterEngineConstants.ts:213` copy (T7b) is the redundant one to remove.
- `franchiseSalaryLifecycle.ts` is a stateless STATUS CLASSIFIER, NOT a ledger —
  naming-collision trap; do NOT extend it.

```
You are the Season Salary Ledger Implementer (TypeScript). PERSISTENCE-CRITICAL,
very high reasoning effort. The IndexedDB version-conflict-hang is the #1 landmine
(see R-T7c-MIGRATION) — get the store registration exactly right.

GOAL:
Build the §8.4 Season Salary Ledger: a new season-scoped IndexedDB store (trackerDb
v14→15) + LedgerEntry/LedgerStatus state machine + capCharge + the call-up/demotion
PRODUCER hooked into the existing executors (first call-up→active + flip
rookieScaleActive; demotion→deadMoney at deadMoneyRate; re-call-up→active, NO
stacking) + ledgerCapCharge engine fn (§11) + constants + Phase-3 reset. DEFER the
payroll-expectation baseline, fan-morale consequence, declared-budget, and one-click
execute (R-T7c-SCOPE).

SOURCE OF TRUTH: IV spec §8.4 (ledger), §11 (ledgerCapCharge); DECISIONS_LOG.
ENV: prefix every CLI with `NODE_ENV= `; node at ~/.nvm/versions/node/v20.20.0/bin.

STEP 1 — STORE (src/utils/trackerDb.ts): bump TRACKER_DB_VERSION 14→15; append ONE
contains()-guarded createObjectStore block at the END of onupgradeneeded for the
ledger store (e.g. 'franchiseSeasonLedgerRows') keyPath [franchiseId,seasonId,
statsScopeId,playerId] + a 'by_scope' index [franchiseId,seasonId,statsScopeId].
Mirror the v13/v14 blocks EXACTLY — no destructive migration, no backfill. NEVER
open 'kbl-tracker' anywhere but trackerDb.ts.

STEP 2 — STORAGE MODULE (new src/utils/franchiseSeasonLedgerStorage.ts, clone
franchiseTrueValueStorage.ts): LedgerRow { franchiseId; seasonId; statsScopeId;
playerId; salary; status: LedgerStatus; capCharge; calculationVersion; computedAt }.
save / get-for-scope / replace-for-scope / upsert-one via getTrackerDb; hasExplicitScope
guard; STORE_NAME const; a test reset helper. Pure async storage — no React.

STEP 3 — STATE MACHINE + ledgerCapCharge:
- Types: LedgerStatus = 'active'|'deadMoney'|'unrostered'; LedgerEntry per §8.4.
- Pure transition fns: firstCallUp → active; demotion → deadMoney (at deadMoneyRate);
  re-call-up → active, NO stacking / NO per-transaction charge (idempotent).
- ledgerCapCharge(entries: LedgerEntry[], rate: number): number = Σ salary ×
  (active 1.0 / deadMoney rate / unrostered 0). ADD to src/engines/rosterAnalyzer.ts
  (the §11 home; keep optimizeLineup + recommendRosterMoves). Pure.

STEP 4 — PRODUCER (wire into the existing executors; persistence-sensitive):
- callUpFranchisePlayer (after the successful txn ~:676): upsert the player's
  LedgerEntry → status active for the current season scope; if this is the player's
  FIRST call-up this season (a prospect), set rookieScaleActive=true for the salary
  recompute (REPLACES age factor — verify NO double-discount with deadMoney). Flip
  RosterMoveEvent.salaryMovementApplied → true.
- sendDownFranchisePlayer (after the successful txn ~:546): transition the player's
  LedgerEntry active → deadMoney at deadMoneyRate; flip salaryMovementApplied → true.
- Idempotent: re-call-up flips deadMoney → active, same salary, NO stacking.
- The ledger write MUST be scoped to the current franchise/season (getFranchiseSeasonId).
  If the executor lacks the season scope, thread it from the existing inputs; do NOT
  invent a key format — reuse franchisePersistenceContract.

STEP 5 — CONSTANTS (src/data/rosterEngineConstants.ts): ADD-ONLY deadMoneyRate
(0.75 default, CALIBRATE; the 100/75/50 league-config presets are DEFERRED with the
wizard). SINGLE-SOURCE the ROOKIE_SCALE_FACTOR dup: REMOVE the rosterEngineConstants
:213 copy and repoint its consumer (rosterAnalyzer.ts recommendRosterMoves) to import
ROOKIE_SCALE_FACTOR from salaryCalculator (the canonical :380; importing a const is
not an engine edit). This is the documented reconciliation — it is the ONLY removal
allowed in this add-only file.

STEP 6 — PHASE-3 RESET: confirm the ledger is season-scoped so offseason Phase-3
advance (new seasonNumber → new seasonId) yields a fresh empty ledger scope with NO
deletion (old-season rows persist under their scope, like trueValue). If a Phase-3
transition explicitly should stamp/seal the prior ledger, wire that minimally; else
document that fresh-scope-on-advance is the reset mechanism.

STEP 7 — DEFERRED (do NOT build, per R-T7c-SCOPE): payroll-expectation baseline;
capCharge→fan-morale; declaredBudget field/UI; one-click execute-from-rec. Leave
capCharge persisted + ledgerCapCharge available for the future consumer.

STEP 8 — TESTS:
- MIGRATION SAFETY (load-bearing): opening the DB at v15 creates the ledger store AND
  preserves every v12/v13/v14 store (no data loss); only trackerDb.ts opens the DB.
- STATE MACHINE: first call-up→active; demotion→deadMoney (capCharge = salary×rate);
  re-call-up→active, NO stacking; capCharge math for all three statuses; ledgerCapCharge
  sums correctly.
- ROOKIE-SCALE: call-up sets rookieScaleActive→ salary uses 0.50× REPLACING age factor
  (NO double-discount); demotion/dead-money does not double-apply.
- PRODUCER: callUp/sendDown update the ledger + flip salaryMovementApplied; idempotent.
- SINGLE-SOURCE: ROOKIE_SCALE_FACTOR defined in exactly ONE place after T7c (grep).
- PERSISTENCE round-trip: save → get-for-scope returns the rows.

CONSTRAINTS — do NOT touch: src/engines/ivEngine.ts, the frozen oracle, salaryCalculator's
ENGINE logic (pass the option, don't edit), traitInteractionMatrix.ts. Open 'kbl-tracker'
ONLY via trackerDb.ts. Do NOT extend franchiseSalaryLifecycle.ts. NO fan-morale /
expectation / declared-budget code. rosterEngineConstants ADD-ONLY except the documented
ROOKIE_SCALE_FACTOR dup removal.

VERIFICATION (run + paste):
- NODE_ENV= npx vitest run <new tests> → green (incl. migration-safety + state machine + rookie-scale)
- NODE_ENV= npx tsc --noEmit → clean
- NODE_ENV= npm run build → exit 0
- NODE_ENV= npx vitest run (full) → no new RED outside the characterized set (baseline 7,164/385 + new tests)
- GOLDEN/SMB4 byte-unchanged: git diff --name-only lists none of ivEngine/salaryCalculator/effectiveRatings/iv_oracle.json (salaryCalculator must be byte-unchanged — T7c only CALLS it)
- git diff --stat → enumerate EVERY changed path

FLAGGED FOR JK:
  F1 deadMoneyRate = 0.75 default (CALIBRATE); the 100/75/50 league-config presets +
     the Setup-Wizard control are DEFERRED with the declared-budget ticket.
  F2 DEFERRED FUTURE TICKET (needs a declared-budget design): payroll-expectation
     baseline + capCharge→fan-morale consequence (extend the existing gated
     franchiseFanMoralePerformanceGapFormula → franchiseRandomEventGenerator draft path).
  F3 Phase-3 reset mechanism = fresh-seasonId-scope (confirm vs an explicit seal).
  F4 ROOKIE_SCALE_FACTOR single-sourced to salaryCalculator:380.

FORMAT: (1) files changed (every path) (2) per-file changes citing §/ruling
(3) the store-registration diff + the producer hook points quoted (4) verification
output (5) FLAGGED FOR JK (6) "T7c complete" OR "BLOCKED: [reason]".

FAILURE PROTOCOL: a change needing a do-NOT-touch edit (esp. salaryCalculator engine,
ivEngine, oracle) → STOP and report. If wiring the producer would require opening
'kbl-tracker' outside trackerDb.ts → STOP (v-conflict landmine). If the executor lacks
the season scope needed for the ledger key → report what's missing, do not invent a key.
Enumerate every changed path; never summarize or batch.

Use very high reasoning effort. Think step-by-step. Do NOT commit — leave changes in
the working tree for audit.
```


---

## T7c-AUDIT + EXECUTION RECORD (2026-06-14) — completes the T7 stack

**ROUTE actual:** Codex 5.5 | very high BUILT → Opus 4.8 AUDIT (Fable unavailable;
auditor ≠ builder). Persistence/migration audit.

### Builder result (Codex 5.5)
trackerDb v14→15 + guarded `franchiseSeasonLedgerRows` store; NEW
`franchiseSeasonLedgerStorage.ts` (clone of the True Value pattern, getTrackerDb);
LedgerStatus/LedgerEntry + pure transitions + `ledgerCapCharge` in rosterAnalyzer.ts;
producer hooks in franchiseRosterMovement.ts (call-up→active+rookieScaleActive,
send-down→deadMoney, flip salaryMovementApplied); franchiseSalary.ts caller option;
leagueBuilderStorage.ts persisted rookieScaleActiveBySeason (additive); REMOVED the
ROOKIE_SCALE_FACTOR dup + added DEAD_MONEY_RATE=0.75. 10 files (8 mod + 2 new).

### AUDIT VERDICT: CONFORMS
Independent re-verification:
- tsc 0; build 0 (7.97s); focused 44/44; full suite 7,168 pass / 3 fail —
  reconciles 7,164 + 7 new = 7,171 / 386; the 3 fails are the characterized set. NO new RED.
- MIGRATION SAFETY (load-bearing, R-T7c-MIGRATION) PROVEN: a test opens the DB at v15
  and asserts objectStoreNames === all 31 prior stores + franchiseSeasonLedgerRows (no
  store dropped / no data loss) + the by_scope index; a source test asserts the ledger
  module uses getTrackerDb and never indexedDB.open('kbl-tracker').
- salaryCalculator.ts BYTE-UNCHANGED (T7c only CALLS the rookieScaleActive option);
  ivEngine/effectiveRatings/iv_oracle byte-unchanged.
- STATE MACHINE correct: ledgerCapCharge = active×1.0 / deadMoney×rate / unrostered×0;
  transitionLedgerForCallUp returns firstCallUp:true ONLY when no entry exists (re-call-up
  uses recallLedgerEntry — active, NO stacking, NO rookie-scale re-trigger → no
  double-discount). Producer hooks rollback-safe (existing executor rollback tests pass).
- ROOKIE_SCALE_FACTOR single-sourced to salaryCalculator:380 (+ a guard test asserting
  exactly one definition). leagueBuilderStorage change additive (0 removed, no DB version bump).
- DEFERRED per R-T7c-SCOPE: payroll-expectation baseline, capCharge→fan-morale,
  declared-budget, one-click execute — NOT built. capCharge persists for the future consumer.

### Findings (LOW, ratified by JK 2026-06-14)
1. rookieScaleActiveBySeason persisted on the player (leagueBuilderStorage) rather than
   derived from the ledger — additive design choice, tested; acceptable.
2. Builder's "other files open kbl-tracker" flag = VERIFIED NON-ISSUE: the other
   open(DB_NAME) sites are SEPARATE DBs (schedule/museum/farm/relationship/playoff/etc.),
   not 'kbl-tracker'; the migration test passing (no v-conflict hang) confirms trackerDb
   is the sole opener of 'kbl-tracker'.
Builder F1–F4 valid.

### JK ratification (2026-06-14)
Findings + F1–F4 ratified. BROWSER-PENDING. T7c = built + audited CONFORMS, COMMITTED.
**T7 STACK COMPLETE (T7a/T7b/T7c).** DEFERRED future ticket logged: payroll-expectation
baseline → fan-morale consequence (needs a declared-budget design).


---

## T8a CONTRACT (2026-06-14) — Mode 1 League Construction Engine (pure core)

**ROUTE:** Codex 5.5 | very high reasoning effort → Opus 4.8 audit (Fable unavailable;
auditor ≠ builder). Pure engine — no persistence, no UI, BELOW the risk-halt line.
First ticket of the T8 stack (split per DECISIONS_LOG 2026-06-14; see `T8_SCOPE_MAP.md`).

```
You are the KBL Tracker BUILDER (Codex 5.5).

GOAL:
Create the pure, spec-faithful CORE of the Mode 1 League Construction engine —
src/engines/leagueConstruction.ts — by porting the §6.3 identity composition, §5.3
luxury tax, §7.3 pick-value chart, and the trade validator from the proven Python
reference scripts/analyze-pool.py, DECISION-IDENTICAL. Plus add the §12 tunable
constants this engine consumes. This is T8a ONLY: no persistence, no UI, no pool
sourcing, no salary relativity, no registerPool body (those are T8b–T8d).

SOURCE OF TRUTH:
- spec-docs/IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §5.2, §5.3, §5.4, §6.1, §6.2,
  §6.3, §7.2, §7.3, §11, §12.
- Python ORACLE you port (decision-identical): scripts/analyze-pool.py — BANDS/
  BAND_STATS/MOD_STAT_TO_LUX (L1149-1159), band_scores (L1162-1172), compose_identity
  (L1175-1214), identity_cap_shift (L1217-1226), roster_tax (L1238-1264).
- Read-only DATA you CONSUME: src/data/tierParams.ts — TierKey, TIER_CAPS,
  LUXURY_CAP_TABLES (LuxuryCapRow), CAP_MODIFICATION_FRACTIONS (ModStat), FARM_NERF_SCALES.
- spec-docs/T8_SCOPE_MAP.md (full T8 context; this is the T8a slice).
- JK RULING (2026-06-14): identity DECREASES are OPTIONAL — composeIdentity must NOT
  force decreases; default decrease = [] (empty). Max customizability is the goal.

CONSTRAINTS:
- CREATE ONLY: src/engines/leagueConstruction.ts
                src/engines/__tests__/leagueConstruction.test.ts
                src/engines/__tests__/leagueConstruction.golden.json (if you emit a fixture)
- EDIT ONLY (add-only, append; do not reorder/modify existing exports):
    src/data/rosterEngineConstants.ts — append TRADE_TOLERANCE_BAND=0.15,
    BALANCE_MODE_DEFAULT='taxed', EV_FLATNESS_TOLERANCE=0.10 with §12 doc comments.
- DO NOT TOUCH: src/data/tierParams.ts (generated, read-only), src/engines/ivEngine.ts,
  salaryCalculator.ts, effectiveRatings.ts, rosterAnalyzer.ts, scripts/analyze-pool.py,
  spec-docs/reference/iv_oracle.json, ANY UI (src/src_figma/**), ANY storage/IndexedDB
  (trackerDb.ts, *Storage.ts), playerDatabase.ts.
- PURE functions only — NO React, NO IndexedDB/persistence, NO runtime file I/O
  (engine-discovery/season-simulator compatible, like ivEngine/effectiveRatings).
- NO registerPool body / NO RegisteredPool persistence / NO Path A salary re-pricing —
  those are T8b. (You MAY declare boundary TYPES if helpful, but implement nothing
  that touches storage or salaryCalculator.)

WHAT TO BUILD (src/engines/leagueConstruction.ts):
TYPES: BalanceMode='taxed'|'advisory'|'off'; Band='Power'|'Contact'|'Speed'|'Defense'|
'Rotation'|'Bullpen'; BandPriorities=Record<Band,number>; IdentityComposition=
{increase:string[]; decrease:string[]} (each ≤2, names ∈ CAP_MODIFICATION_FRACTIONS keys);
TaxResult={charged:number; wouldBeTax:number; binding:{group:string;stat:string;over:number;
tax:number}[]}; PickValue={pick:number; value:number}; Pick={pick:number}; TradeVerdict=
{balanced:boolean; imbalancePct:number; favored:'A'|'B'|'none'; overridable:true};
ConstructionPlayer={id:string; isPitcher:boolean; role?:'SP'|'SP/RP'|'RP'|'CP';
bat:{POW:number;CON:number;SPD:number;FLD:number;ARM:number}; pit?:{VEL:number;JNK:number;
ACC:number}}; ConstructionRoster=ConstructionPlayer[].

STRUCTURAL CONSTANTS (module-level in this file; port Python L1149-1159):
BANDS; BAND_STATS (Power→[POW], Contact→[CON], Speed→[SPD], Defense→[FLD,ARM],
Rotation→[RVEL,RJNK,RACC], Bullpen→[PVEL,PJNK,PACC]); MOD_STAT_TO_LUX (ModStat→{group,stat}).

FUNCTIONS:
1. bandScores(...) [internal] — port band_scores. KEY PORTING NOTE: the Python normalizes
   raw deltas by xbl_caps; but CAP_MODIFICATION_FRACTIONS[name][stat] IS ALREADY the
   normalized fraction (rawDelta / xblCap). So port composeIdentity/identityCapShift to
   operate DIRECTLY on CAP_MODIFICATION_FRACTIONS (the normalization is already applied);
   Σ fractions == Python's net/xbl_caps. You MUST verify this equivalence with the golden
   fixture, not assume it.
2. composeIdentity(priorities: BandPriorities): IdentityComposition — port compose_identity:
   round-robin over priority bands (desc priority, name tiebreak), pick_increase greedy
   val = Σ_b weight_b·pos_b + Σ_b min(net_b,0); on a val tie, break by RAW-DELTA magnitude DESC
   then name ASC (NOT fraction magnitude — see TIEBREAK NOTE in FAILURE PROTOCOL); skip '--'
   and already-taken. Return increase (1–2 names) and decrease=[] (EMPTY per JK ruling — NOT
   ['--','--']). DECISION-IDENTICAL to Python on the increase selection.
3. applyIdentitySelection(sel:{increase:string[];decrease:string[]}): IdentityComposition —
   validate ≤2 each + all names ∈ vocabulary (throw on invalid/over-count); drop '--'. (For
   the T8c free-edit UI.)
4. identityCapShift(identity): Record<ModStat,number> — net[st]=Σ_inc fractions[name][st] −
   Σ_dec fractions[name][st]. Equals Python identity_cap_shift (verify via golden).
5. shiftLuxuryCaps(caps: LuxuryCapRow[], identity): LuxuryCapRow[] — per row, route via
   MOD_STAT_TO_LUX (group,stat)→ModStat, shiftedCap = cap × (1 + netFraction), clamp ≥0;
   return NEW rows (no mutation).
6. luxuryTax(roster, caps: LuxuryCapRow[], mode): TaxResult — port roster_tax: hitters top-8;
   rotation = SP+SP/RP top-4; bullpen = RP+CP+SP/RP top-N (SP/RP DUAL membership, §5.3 v1.1.6).
   Per row: sum top-N base ratings (hitters + rotation/bullpen POW/CON/SPD/FLD from .bat;
   VEL/JNK/ACC from .pit); over = sum − cap; tax = per100×(over/100)^curve + minAdder when
   over>0. wouldBeTax = Σ tax; charged = mode==='taxed' ? wouldBeTax : 0 (advisory/off
   short-circuit the CHARGE, never the COMPUTATION); binding sorted desc by tax.
7. derivePickValueChart(ivsDesc: number[]): PickValue[] — accept pool player IVs; sort desc;
   value(pickN)=sorted[n-1]; pick 1..length; monotonic non-increasing. (Pool-type-agnostic so
   T8b registerPool passes pool.players' IVs.)
8. validateTrade(sideA: Pick[], sideB: Pick[], chart: PickValue[]): TradeVerdict — sumX =
   Σ chart[pick-1].value; imbalancePct = |sumA−sumB| / max(sumA,sumB,ε); balanced =
   imbalancePct ≤ TRADE_TOLERANCE_BAND; favored = larger side ('none' if balanced);
   overridable:true.

TESTS (src/engines/__tests__/leagueConstruction.test.ts) — ORACLE-VALIDATED, exhaustive:
- composeIdentity: golden fixture of ≥8 BandPriorities vectors → expected increase[]
  (DERIVE expected values from the Python reference compose_identity for those exact
  vectors; in a comment, document HOW each golden was obtained). Assert TS == golden +
  structural (≤2 increases, all ∈ vocabulary, decrease===[]).
- identityCapShift: ≥4 identities → assert net == direct Σinc−Σdec of CAP_MODIFICATION_
  FRACTIONS (computed in-test from tierParams) AND == Python identity_cap_shift (golden).
- luxuryTax: ≥3 hand-constructed rosters vs LUXURY_CAP_TABLES.juiced → charged/wouldBeTax
  match the §5.3 formula computed in-test; advisory/off → charged===0 but wouldBeTax>0 when
  over; an SP/RP player's VEL counts in BOTH a rotation and a bullpen binding row.
- derivePickValueChart: monotonic non-increasing; length === input; a juiced-shaped IV list
  steeper than a nerfed-shaped one.
- validateTrade: balanced (≤15%) and imbalanced (>15%); favored correct; overridable true.
- shiftLuxuryCaps: shiftedCap === cap×(1+net) for a known identity; clamp ≥0 on big decrease.

VERIFICATION (run; paste ACTUAL outputs):
- NODE_ENV= npx tsc --noEmit  → 0 errors
- NODE_ENV= npm run build  → exit 0
- NODE_ENV= npx vitest run src/engines/__tests__/leagueConstruction.test.ts  → all pass
- NODE_ENV= npx vitest run  → full suite; ONLY the 3 characterized fails (wpaRuntimeBoundary,
  franchiseNarrativeEventEligibility, franchiseManualSmokeFixture order-flake); NO new RED;
  report pass/fail counts (baseline 7,171/386 → expect 7,171 + new tests).
- git diff --stat MUST show NO change to: src/data/tierParams.ts, src/engines/ivEngine.ts,
  src/engines/salaryCalculator.ts, spec-docs/reference/iv_oracle.json.
- Node at ~/.nvm/versions/node/v20.20.0/bin (login shell exports NODE_ENV=production — the
  NODE_ENV= prefix is MANDATORY or vitest emits ~1,800 false failures).

FORMAT (your report):
1. Files changed — EVERY git status path (incl. trivial), with the total changed-path count.
2. Changes per file, citing the spec/Python line ported from.
3. Verification — paste actual tsc/build/vitest outputs + full-suite counts.
4. composeIdentity golden derivation method (exactly how expected values were obtained).
5. "T8a complete" OR "BLOCKED: <exact reason>".

FAILURE PROTOCOL:
- Any change requiring a DO-NOT-TOUCH edit → STOP and report.
- If the band_scores/identity_cap_shift port is NOT decision-identical to the Python on any
  test vector → STOP and report the divergence; do NOT silently "fix" the Python or fudge a
  golden value.
- composeIdentity ties → follow the Python tiebreak (RAW-DELTA magnitude DESC, then name
  ASC) EXACTLY — see TIEBREAK NOTE.
- Never summarize or batch changes.

TIEBREAK NOTE (resolves the normalization subtlety Codex flagged 2026-06-14): Python's
primary key `val` IS fraction-based (band_scores normalizes by xbl_caps, == CAP_MODIFICATION_
FRACTIONS), so val ports directly with no change. BUT Python's tiebreak magnitude(name) =
Σ|RAW delta| uses RAW workbook deltas, NOT fractions — and fraction-magnitude orders
DIFFERENTLY (stats have different xblCaps). Reconstruct raw for the tiebreak only:
rawDelta[st] = fraction[st] × MOD_STAT_XBL_CAP[st], where
MOD_STAT_XBL_CAP = {POW:500, CON:545, SPD:550, FLD:585, ARM:565, RVEL:100, RJNK:260,
RACC:260, PVEL:65, PJNK:150, PACC:165} (spec §5.3 workbook 'Luxury Cap' A:F caps).
magnitude = Σ|rawDelta|. Confirm decision-identical to the Python on EVERY golden vector
including ties; if any vector diverges, STOP and report (do not fudge a golden).

Use very high reasoning effort. Think step-by-step. Do NOT commit — leave changes in the
working tree for audit.
```

### T8a-AUDIT + EXECUTION RECORD (2026-06-14)

**ROUTE actual:** Codex 5.5 | high (codex knob max) BUILT → Opus 4.8 (Captain) AUDIT
(Fable unavailable; auditor ≠ builder). Pure engine, below the risk-halt line.

**Pre-build contract fix (triangle working):** the first launch was paused (JK battery)
and BEFORE writing any code Codex flagged a genuine contract flaw — the §6.3 tiebreak
`magnitude()` uses RAW workbook deltas, but the contract had said normalized fractions
(they order differently). Captain fixed the contract (reconstruct raw via `MOD_STAT_XBL_CAP`,
decision-identical to Python) and relaunched. The fix is validated below.

**Builder result (Codex 5.5):** NEW `src/engines/leagueConstruction.ts` (pure, no React/IDB):
types + BANDS/BAND_STATS/MOD_STAT_TO_LUX + bandScores/rawDeltaMagnitude/pickIncrease +
composeIdentity (`decrease:[]` per JK) + applyIdentitySelection + identityCapShift +
shiftLuxuryCaps + luxuryTax (SP/RP dual membership; advisory/off short-circuit) +
derivePickValueChart + validateTrade. NEW test (9 cases, oracle-backed).
`rosterEngineConstants.ts` add-only: TRADE_TOLERANCE_BAND=0.15, BALANCE_MODE_DEFAULT='taxed',
EV_FLATNESS_TOLERANCE=0.10. 3 files.

**AUDIT VERDICT: CONFORMS.** Independent re-verification (Opus, not trusting the report):
- **INDEPENDENT ORACLE CROSS-CHECK:** ran the ACTUAL `scripts/analyze-pool.py` `compose_identity`
  against the real workbook for all 10 golden priority vectors → **10/10 MATCH** the TS goldens.
  The workbook `xbl_caps` (POW 500 / CON 545 / SPD 550 / FLD 585 / ARM 565 / RVEL 100 / RJNK 260
  / RACC 260 / PVEL 65 / PJNK 150 / PACC 165) EXACTLY match the engine's hardcoded
  `MOD_STAT_XBL_CAP` → the tiebreak fix is correct AND the goldens are genuine (not self-fulfilling).
- tsc --noEmit: 0. build: exit 0 (dist generated). new test: 9/9 (independent run).
- full suite: 7,177 pass / 3 fail / 387 files — the 3 fails are EXACTLY the characterized set
  (wpaRuntimeBoundary, franchiseManualSmokeFixture, franchiseNarrativeEventEligibility); NO new
  RED. 7,180 = 7,171 baseline + 9 new.
- BYTE-UNCHANGED confirmed (git diff empty): tierParams.ts, ivEngine.ts, salaryCalculator.ts,
  iv_oracle.json.
- CODE review: bandScores correctly uses the already-normalized fractions (== Python pos/net,
  since fraction = delta/xblCap); pickIncrease replicates Python's (val, magnitude)-lexicographic +
  name tiebreak; identityCapShift == Python (Σ fractions = net/xbl_caps); luxuryTax == roster_tax
  (SP/RP dual rotation+bullpen, advisory/off short-circuit CHARGE not COMPUTATION). JK ruling
  honored: composeIdentity `decrease:[]`; applyIdentitySelection enables the T8c free-edit stack.

**Findings (LOW, non-blocking):**
1. luxuryTax does not check a per-row `enabled` flag (Python roster_tax skips disabled rows).
   NON-ISSUE for v1: DISABLED_LUXURY_ROWS is empty post-DB1 and LuxuryCapRow has no `enabled`
   field — all rows active. If a future ticket disables rows, add the guard.
2. The magnitude-tiebreak branch is correct-by-construction (xbl_caps verified == workbook) but
   may not be forced by a val-tie in the 10 goldens — correctness rests on the xbl_caps match, not
   only golden coverage. Optional forced-tie test later.
3. BALANCE_MODE_DEFAULT + EV_FLATNESS_TOLERANCE added but not yet consumed (forward-looking §12
   constants for T8b / EV-flatness). TRADE_TOLERANCE_BAND IS consumed (validateTrade). Acceptable —
   authoritative §12 values the contract requested.

**Status:** T8a = built + audited CONFORMS. Pure engine, NO user-visible surface (no browser-verify
needed). COMMITTED. NEXT: T8b (tier/luxuryTax/balanceMode wiring + RegisteredPool persistence
kbl-league-builder v5→6 + Path A IV re-pricing).


---

## T8b CONTRACT (2026-06-14) — Tier/balanceMode wiring + Pool Registration + persistence

**ROUTE:** Codex 5.5 | very high reasoning effort → Opus 4.8 audit (Fable unavailable;
auditor ≠ builder). PERSISTENCE ticket (kbl-league-builder v5→v6) — ABOVE the risk-halt line:
Captain surfaces the migration-safety proof + verdict to JK BEFORE commit (no silent auto-commit);
batched browser-verify item (tier/balanceMode selectors + register-pool persist/reload).
JK rulings: additive migration (existing leagues untouched); balanceMode in League Builder only
(wizard inherits). SCOPE CORRECTION: Path A salary is already IV-based (T5/D15) — NOT rewritten here.

```
[identical to Temp/t8b-contract.md — the builder prompt fed to Codex this session]
GOAL: T8b — add the pure registerPool assembler to the T8a engine, persist a RegisteredPool per
league (ADDITIVE kbl-league-builder v5→v6), and surface tier + balanceMode selectors in the League
Builder. Consumes T8a + the existing IV-based salary stack. Path A salary is already IV-based
(salaryCalculator.ts:739-776) — do NOT rewrite it.

ENGINE (add to leagueConstruction.ts, do not edit T8a exports): PoolPlayerPriced{id,iv,salary};
PoolConfig{leagueId,tier,balanceMode,totalSlots,players}; RegisteredPool{...,tierCap=
TIER_CAPS[tier].tierCap, luxuryCaps=LUXURY_CAP_TABLES[tier], pickValueChart=derivePickValueChart(
players.iv), poolSurplusWarning = players.length > totalSlots*POOL_SURPLUS_MAX}; registerPool(cfg)
PURE (no IDB/React/Date/random). Add POOL_SURPLUS_MAX=1.2 to rosterEngineConstants (add-only).

PERSISTENCE (leagueBuilderStorage.ts, ADDITIVE v5→6): DB_VERSION 5→6; LeagueTemplate += optional
tier?/balanceMode?; STORES += REGISTERED_POOLS:'registeredPools' created via if(!contains) keyPath
'leagueId' (no oldVersion gate); saveRegisteredPool/getRegisteredPool/deleteRegisteredPool; NO
rewrite of existing records; do NOT touch trackerDb.

UI (LeagueBuilderLeagues.tsx + useLeagueBuilderData): tier + balanceMode <select>s on the league
create/edit form (mirror defaultRulesPreset select, default balanceMode='taxed'); registerLeaguePool(
leagueId) sources the league's stock players, iv=calculateIvBaseSalary(player).ivBase, reuse stored
salary, totalSlots=teamIds.length*22, registerPool→saveRegisteredPool; "Register Pool" button +
minimal confirmation (tier/tierCap/count/surplus warning). Rich pool VIEW deferred to T8d. Do NOT
touch FranchiseSetup.tsx (wizard inherits).

TESTS: registerPool unit (tierCap/luxuryCaps per tier, chart sorted desc, surplus boundary, purity);
MIGRATION-SAFETY (NON-NEGOTIABLE, fake-indexeddb, mirror T7c pattern): open at v6 → all 8 prior stores
+ registeredPools; a v5 LeagueTemplate without tier/balanceMode loads intact (defaults); save/get/
delete RegisteredPool round-trips.

DO NOT TOUCH: tierParams.ts, ivEngine.ts, salaryCalculator.ts, iv_oracle.json, trackerDb.ts, the
existing T8a functions, FranchiseSetup.tsx. Migration additive (no rewrite). registerPool pure.

VERIFY: tsc 0 / build 0 / leagueConstruction test / migration test / full suite (only the 3
characterized fails, no new RED; baseline 7,180/387) / git diff --stat shows none of the do-not-touch
files. NODE_ENV= prefix; node at ~/.nvm/versions/node/v20.20.0/bin.

REPORT: every changed path+count; per-file changes; actual tsc/build/vitest output + migration result;
the additive v5→6 approach (prove additive); "T8b complete" OR "BLOCKED: <reason>".
FAILURE PROTOCOL: DO-NOT-TOUCH edit needed / additive migration impossible without rewrite / pool
source ambiguous → STOP and report. Never summarize or batch.

Use very high reasoning effort. Think step-by-step. Do NOT commit — leave changes in the working tree for audit.
```

### T8b-AUDIT + EXECUTION RECORD (2026-06-14)

**ROUTE actual:** Codex 5.5 | high (codex knob max) BUILT → Opus 4.8 (Captain) AUDIT
(Fable unavailable; auditor ≠ builder). PERSISTENCE ticket — JK APPROVED the commit after the
migration-safety surface (risk-gated; NOT auto-committed, per the 2026-06-14 risk ruling).

**Builder result (Codex 5.5):** `registerPool` (pure assembler) + Pool types added to
leagueConstruction.ts (T8a exports untouched); `POOL_SURPLUS_MAX` add-only; leagueBuilderStorage
v5→v6 ADDITIVE (`registeredPools` store keyPath leagueId via `if(!contains)`, no oldVersion gate;
LeagueTemplate += optional tier/balanceMode; `normalizeLeagueTemplateRecord` read-time defaults;
save/get/deleteRegisteredPool with syncEngine mirroring the existing per-store pattern); UI
tier+balanceMode selects + Register Pool button (LeagueBuilderLeagues) + `registerLeaguePool` in
useLeagueBuilderData (iv=calculateIvBaseSalary.ivBase, reuse stored salary, totalSlots=teamIds×22);
NEW v6 migration test. NECESSARY collateral (a new store's ripple): backupRestore schema (v6 +
registeredPools optional + includedStores), syncConfig SYNC_REGISTRY (registeredPools:'leagueId'),
editorialSchema test (version 5→6 + store assertion). 10 files (9 mod + 1 new).

**AUDIT VERDICT: CONFORMS.** Independent re-verification (Opus):
- tsc 0; build 0; new tests 17/17 (leagueConstruction 14 + migration 3); full suite 7,185 pass /
  3 fail / 388 files — the 3 fails are EXACTLY the characterized set; NO new RED (7,188 = 7,180 + 8).
- **MIGRATION SAFETY PROVEN (the risk gate):** the v6 test seeds a REAL v5 DB (8 stores + a
  tier/balanceMode-less LeagueTemplate), upgrades, asserts all 9 stores present (none dropped), the
  template loads with read-time defaults (tier 'juiced' / balanceMode 'taxed'), AND — reading the
  RAW on-disk record — that tier/balanceMode are STILL undefined in storage (NO rewrite; defaults
  are read-time only). save/get/delete RegisteredPool round-trips.
- BYTE-UNCHANGED: tierParams, ivEngine, salaryCalculator, iv_oracle, trackerDb, FranchiseSetup.
- registerPool PURE (no IDB/React/Date/random); tierCap=TIER_CAPS[tier], luxuryCaps=
  LUXURY_CAP_TABLES[tier], pickValueChart=derivePickValueChart(players.iv), surplus boundary correct.
- 3 OUT-OF-CONTRACT-LIST files AUDITED + JUSTIFIED: backupRestore (new store must be in the backup
  schema or restore drops it), syncConfig (registeredPools must be in SYNC_REGISTRY for the
  syncEngine.upsert calls, which mirror the pre-existing leagueTemplates/globalTeams/globalPlayers
  pattern), editorialSchema test (asserts db.version, forced 5→6). Necessary + minimal; disclosed.
- toSalaryPlayer mapping correct; iv depends only on ratings/role/traits/arsenal/armSlot
  (fame/personality inert — salary is reused from storage, not recomputed).

**Findings (LOW, non-blocking):** registerPool returns `LUXURY_CAP_TABLES[tier]` by reference
(shared array) — harmless (persisted via structured clone; downstream `shiftLuxuryCaps` copies).

**Status:** T8b = built + audited CONFORMS; JK APPROVED the persistence change. COMMITTED.
BROWSER-PENDING (batched): tier/balanceMode selectors + Register-Pool persist/reload. NEXT: T8c
(Identity Composition UI — point-allocation; decreases optional per JK; wires to T8a
composeIdentity/applyIdentitySelection).


---

## T8c CONTRACT (2026-06-14) — Team Identity Composition UI (IV §6 / D11)

**ROUTE:** Codex 5.5 | very high reasoning effort → Opus 4.8 audit (Fable unavailable;
auditor ≠ builder). UI + (trivial additive) persistence — user-visible → Captain surfaces the
verdict + browser item; not auto-committed silently. JK: identity is MAX-CUSTOMIZABLE, decreases
OPTIONAL. Persistence is an OPTIONAL field on the existing globalTeams store — NO version bump,
NO migration, NO backup/sync change. NAME-COLLISION: do NOT touch ManagerTeamIdentity /
almanacTeamIdentity / reporter PlayerArchetype (unrelated editorial identities) — use `capIdentity`.

```
[identical to Temp/t8c-contract.md — the builder prompt fed to Codex this session]
GOAL: T8c — Team Identity Composition UI. In the League Builder team-edit modal: 6-band point-
allocation → composeIdentity suggests a ≤2-inc/≤2-dec stack (decreases OPTIONAL) → creator freely
edits (manual mod selectors over the 42 CAP_MODIFICATION_FRACTIONS keys) → live preview of
identityCapShift % per stat → persist team.capIdentity. Consumes the T8a engine; builds no new math.

TYPE: add TeamCapIdentity = {bandPriorities?: BandPriorities; increase: string[]; decrease: string[]}
to leagueConstruction.ts (don't modify T8a exports).
PERSISTENCE (additive, NO version bump): Team += optional capIdentity?: TeamCapIdentity; saveTeam
already persists the whole record — verify it flows through; old teams just lack the field.
UI (LeagueBuilderTeams team-edit modal, mirror heritage/rivalries collapsible): 6 band 0–5 inputs;
"Suggest from priorities" → composeIdentity; 2 increase + 2 decrease mod dropdowns (42 keys + none),
free edit, validate via applyIdentitySelection; live preview = identityCapShift non-zero stats as
signed %; persist on save (createTeam/updateTeam); hydrate from team.capIdentity on open. Tier for
preview = team.leagueIds[0]→getLeagueTemplate.tier (default 'juiced'). Do NOT touch the editorial
identity systems.
TESTS: capIdentity round-trips saveTeam→getTeam; a team WITHOUT capIdentity loads fine (additive).
Engine math already T8a-tested — don't duplicate.
DO NOT TOUCH: T8a/T8b engine code, tierParams, ivEngine, salaryCalculator, iv_oracle, trackerDb,
backupRestore, syncConfig, managerIdentityStorage, almanacTeamIdentity, reporter identity,
FranchiseSetup, leagueBuilderStorage DB_VERSION (stays 6). No migration.
VERIFY: tsc 0 / build 0 / new tests / full suite (only the 3 characterized fails, no new RED;
baseline 7,188/388) / git diff --stat shows none of the do-not-touch files + DB_VERSION still 6.
REPORT: changed paths+count; per-file; actual tsc/build/vitest; confirm additive (no version bump/
migration/backup-sync change); "T8c complete" OR "BLOCKED: <reason>".
FAILURE PROTOCOL: DO-NOT-TOUCH edit needed / capIdentity would need a version bump or migration /
tier unresolvable → STOP and report (tier defaults 'juiced'). Never summarize or batch.

Use very high reasoning effort. Think step-by-step. Do NOT commit — leave changes in the working tree for audit.
```

### T8c-AUDIT + EXECUTION RECORD (2026-06-14)

**ROUTE actual:** Codex 5.5 | high (codex knob max) BUILT → Opus 4.8 (Captain) AUDIT (Fable
unavailable; auditor ≠ builder). UI + trivial-additive persistence — JK APPROVED the commit after
the surface (user-visible → surfaced, not auto-committed).

**Builder result (Codex 5.5):** `TeamCapIdentity` type added to leagueConstruction.ts (T8a/T8b
exports untouched); `Team += optional capIdentity?` (ADDITIVE field on globalTeams — NO DB_VERSION
bump, NO migration, NO new store, NO backup/sync change); LeagueBuilderTeams team-edit modal gains a
collapsible "Team Identity (Cap)" section (6 band 0–5 priorities → composeIdentity "Suggest"; 2
increase + 2 decrease dropdowns over the 42 CAP_MODIFICATION_FRACTIONS keys; applyIdentitySelection
validation; identityCapShift signed-% preview + shiftLuxuryCaps shifted-cap preview; tier from
team.leagueIds[0]→league.tier default 'juiced'; hydrate/save via team.capIdentity); migration test +=
capIdentity round-trip + additive old-team load. 4 files.

**AUDIT VERDICT: CONFORMS.** Independent re-verification (Opus):
- tsc 0; build 0; capIdentity test 4/4; full suite 7,186 pass / 3 fail / 388 files — the 3 fails are
  EXACTLY the characterized set; NO new RED (7,189 = 7,188 + 1).
- ADDITIVE PROVEN: DB_VERSION still 6 (no bump); leagueBuilderStorage diff = ONLY the TeamCapIdentity
  import + the optional capIdentity field; the round-trip test asserts capIdentity persists when
  present and is undefined when absent. NO migration, NO backup/sync change.
- BYTE-UNCHANGED: tierParams, ivEngine, salaryCalculator, iv_oracle, trackerDb, backupRestore,
  syncConfig, FranchiseSetup, AND the editorial-identity systems (managerIdentityStorage,
  almanacTeamIdentity, reporter) — name collision avoided.
- ENGINE REUSE correct: composeIdentity (suggest), applyIdentitySelection (memoized validation that
  GUARDS the save — `if (!validation.identity) return`, so an invalid >2 / unknown-mod stack cannot
  persist), identityCapShift (% preview), shiftLuxuryCaps (cap preview). T8a/T8b code untouched.
- JK ruling honored: decreases OPTIONAL; full manual mod editing; band point-allocation guided input.

**Findings:** none (LOW or above).

**Status:** T8c = built + audited CONFORMS; JK APPROVED. COMMITTED. BROWSER-PENDING (batched): the
Team Identity section — band priorities → Suggest → manual edit → cap-shift preview → save/reload.
NEXT: **T8d** (the LAST T8 ticket — snake draft + empirical pick chart + pick-value trade validator +
per-team solvency signals + chemistry potency overlay + farm scout-obscured IV).

---

## T8d-1 CONTRACT (2026-06-14) — Snake-draft + solvency engine (pure) — IV §7.3

**ROUTE:** Codex 5.5 | very high reasoning effort → Opus 4.8 audit (Fable unavailable; auditor ≠
builder). PURE engine, NO UI / NO persistence / NO DB version change → standing auto-commit on CONFORMS.
T8d split = 3 tickets (T8d-1 engine / T8d-2 persistence+board shell / T8d-3 overlays); R9 + R12 deferred
(DECISIONS_LOG 2026-06-14). JK rulings governing T8d-1: budget = tierCap for all teams; cheapestFillCost
POSITION-AGNOSTIC; solvency MODE-AWARE / charge-faithful (tax drains budget only in 'taxed'; advisory
warns via wouldBe, never blocks on tax; off = pure tier cap, no tax signal). RED "severe tax" frac =
SOLVENCY_SEVERE_TAX_FRAC 0.20 (Captain default, JK-tunable).

```
[identical to Temp/t8d1-contract.md — the builder prompt fed to Codex this session]
```
Full contract text: `Temp/t8d1-contract.md` (self-contained: exact API for buildSnakeOrder +
cheapestFillCost + pickMarginalTax + assessSolvency with the GREEN/YELLOW/RED/BLOCKED decision tree and
the mode-aware drain-vs-warning split; 2 new constants SOLVENCY_RED_MARGIN 0.10 + SOLVENCY_SEVERE_TAX_FRAC
0.20; tests incl. the mode-ruling assertions; do-not-touch list; verify = tsc0/build0/suite-no-new-RED +
git diff --stat limited to leagueConstruction.ts + rosterEngineConstants.ts + leagueConstruction.test.ts;
DB stays v6).

**Status:** contract drafted → Codex build complete → audited CONFORMS (record below).

### T8d-1-AUDIT + EXECUTION RECORD (2026-06-14)

**ROUTE actual:** Codex 5.5 | high (codex knob max = "very high") BUILT → Opus 4.8 (Captain) independent
AUDIT (Fable unavailable; auditor ≠ builder — Captain did NOT write the code). Pure engine → standing
auto-commit on CONFORMS.

**Builder result (Codex 5.5):** 3 files. `leagueConstruction.ts` += `SnakePickSlot`/`buildSnakeOrder`,
`SolvencySignal`/`SolvencyInput`/`SolvencyAssessment`, `cheapestFillCost`, `pickMarginalTax`,
`assessSolvency` (existing 8 exports untouched). `rosterEngineConstants.ts` += `SOLVENCY_RED_MARGIN` 0.10
+ `SOLVENCY_SEVERE_TAX_FRAC` 0.20 (add-only). `leagueConstruction.test.ts` += 10 T8d-1 tests.

**AUDIT VERDICT: CONFORMS.** Independent re-verification (Opus, not trusting the builder paste):
- Code decision-identical to contract: drain uses `luxuryTax(...).charged` (0 in advisory/off), warning
  uses `wouldBeTax`; `signalTax = mode==='off' ? 0 : wouldBePickMarginalTax`; slack = (budget − reserve) −
  totalAfterPick; classify slack<0→BLOCKED, else severeTax(≥0.20×remBudget)‖nearLine(≤0.10×remBudget)→RED,
  else signalTax>0→YELLOW, else GREEN; confirmable = signal≠BLOCKED. budget = tierCap (Q1); position-
  agnostic cheapestFillCost (Q2, +Infinity on empty → reserve Infinity → BLOCKED).
- tsc -b 0 (independent); `npm run build` exit 0 (independent — PWA generated); targeted suite 24/24.
- Full suite (independent rerun): 7,196 pass / 3 fail / 388 files. The 3 fails are EXACTLY the
  characterized set — `wpaRuntimeBoundary`, `franchiseManualSmokeFixture`, `franchiseNarrativeEvent
  Eligibility` (verified by ANSI-stripped FAIL-line extraction). NO new RED. 7,199 = 7,189 + 10 new.
- Diff scope clean: `git diff --stat` = only the 3 intended files (+ Captain's own DECISIONS_LOG /
  PROMPT_CONTRACTS / T8d_SCOPE_MAP doc edits). DB_VERSION still 6; no new store; no persistence; no UI;
  no do-not-touch edits (trackerDb/tierParams/ivEngine/salaryCalculator/iv_oracle/leagueBuilderStorage).
- Falsification: hand-verified the mode-ruling test (line 446) arithmetic — taxed BLOCKED(slack −40) /
  advisory YELLOW(slack 110, wouldBe 150) / off GREEN — and confirmed it is mutation-sensitive (pins
  `pickMarginalTax:0` charged vs `wouldBePickMarginalTax:150`), so a drain/warning swap fails it.

**Findings:** none (LOW or above).

**Status:** T8d-1 = built + audited CONFORMS. Pure engine, NO user-visible surface (no browser-verify
needed). COMMITTED. NEXT: **T8d-2** (draft-session persistence kbl-league-builder v6→v7 ADDITIVE +
`LeagueBuilderSnakeDraft.tsx` board shell + snake mechanics + dual-write 22+10 output + handoff carry-
through verify) — PERSISTENCE + user-visible → audit non-negotiable + JK surface before commit.

---

## T8d-2 CONTRACT (2026-06-14) — MLB snake-draft board shell + draft-session persistence — IV §7.3

**ROUTE:** Codex 5.5 | very high reasoning effort → Opus 4.8 audit (Fable unavailable; auditor ≠ builder).
PERSISTENCE (kbl-league-builder v6→v7 ADDITIVE) + user-visible (new draft board) → **audit
non-negotiable + JK SURFACE before commit (NOT auto-commit).** JK rulings: budget=tierCap;
position-agnostic solvency; composition = TWO separate steps (this board fills 22 MLB; existing farm draft
fills 10 — untouched). Integration map: `T8d2 integration-map` workflow (wf_358cc133-a06). Captain
implementation rulings R-A..R-D baked into the contract (re-derive ratings via a pure `toConstructionPlayer`
adapter in the hook; engine stays pure; composite-id session store keyed by id+leagueId index mirroring the
farm; per-pick immediate dual-write). Single storage module (no src_figma dup) → v6→v7 low-risk on the
singleton axis; migration safety still proven by a seed-v6→upgrade test.

```
[identical to Temp/t8d2-contract.md — the builder prompt fed to Codex this session]
```
Full contract text: `Temp/t8d2-contract.md` (self-contained: v6→v7 additive migration + new
`mlbDraftSessions` store + `LeagueBuilderMlbDraftSession` + CRUD; `toConstructionPlayer` adapter; new
`LeagueBuilderSnakeDraft.tsx` page + route + tile relabel; buildSnakeOrder + assessSolvency mechanics;
mandatory dual-write (mlbRoster + leagueAssignments rosterStatus:'MLB') mirroring LeagueBuilderRosters;
22+10 handoff shape; T8d-3 overlays explicitly scoped OUT; migration + adapter + board tests; do-not-touch
list incl. the farm draft + handoff; verify = tsc0/build0/suite-no-new-RED + DB v7 only version change).

**Status:** contract drafted → Codex build complete → audited CONFORMS → **SURFACED to JK, awaiting
approval before commit** (record below).

### T8d-2-AUDIT + EXECUTION RECORD (2026-06-14)

**ROUTE actual:** Codex 5.5 | high (knob max) BUILT → Opus 4.8 (Captain) independent AUDIT (auditor ≠
builder). PERSISTENCE + user-visible → NOT auto-committed; surfaced for JK approval.

**Builder result (Codex 5.5):** 12 files (9 modified + 3 new). leagueBuilderStorage.ts: DB_VERSION 6→7,
`MLB_DRAFT_SESSIONS` store (keyPath 'id', leagueId index, idempotent guarded create), `LeagueBuilderMlb
DraftSession` interface, create/get/save/delete CRUD (syncEngine upsert/remove + createdDate/lastModified),
clearAll additions. Collateral: syncConfig (+mlbDraftSessions:'id'), backupRestore (schema v7 + included
Stores). useLeagueBuilderData: `toConstructionPlayer` adapter + session CRUD exposed. NEW
`LeagueBuilderSnakeDraft.tsx` board + `/league-builder/snake-draft` route + "MLB DRAFT" tile + farm-tile
relabel. Tests: v7 migration (+seedV6 helper), adapter unit test, board RTL smoke.

**AUDIT VERDICT: CONFORMS.** Independent re-verification (Opus, not trusting builder paste):
- tsc -b 0; `npm run build` exit 0; full suite (independent rerun) 7,203 pass / 3 fail / 390 files — the 3
  are EXACTLY the characterized set; NO new RED. 7,206 = 7,199 + 7.
- ADDITIVE MIGRATION PROVEN: DB_VERSION = 7 is the ONLY version change (trackerDb still 15). Migration test
  ('raw v6 database upgrades additively to v7 and preserves all nine prior stores with data', test :243)
  seeds a real v6 DB (9 stores incl. registeredPools w/ data), upgrades, asserts version 7 + all 10 stores
  + prior data preserved. New store create is `if (!objectStoreNames.contains)` guarded. backupRestore +
  syncConfig collateral correct (add-only).
- DUAL-WRITE CORRECT: pure `buildMlbDraftCommitPayloads` (LeagueBuilderSnakeDraft.tsx:113) writes BOTH
  mlbRoster append AND leagueAssignments {leagueId,teamId,rosterStatus:'MLB'} + advances currentPickIndex;
  confirm handler (:335) gates on `assessment.confirmable`, re-reads the roster before commit, then
  updateRoster + updatePlayer + saveMlbDraftSession. Satisfies the 22+10 handoff count + sameIdSet cross-
  check.
- SOLVENCY WIRED CORRECTLY: rosterSize = MLB_DRAFT_ROUNDS = 22 (not 32); budget = pool.tierCap; mode =
  pool.balanceMode; caps = capIdentity ? shiftLuxuryCaps(...) : pool.luxuryCaps; committedRoster via
  toConstructionPlayer; IV display from pool.iv (L2). Adapter (useLeagueBuilderData.ts:218) maps
  power→POW…accuracy→ACC, isPitcher/role correct.
- BYTE-UNCHANGED (do-not-touch verified via git diff --name-only = empty): leagueConstruction.ts (T8d-1
  engine), LeagueBuilderDraft.tsx (farm draft), LeagueBuilderRosters.tsx, leagueBuilderStartupFarmDraft.ts,
  franchisePlayerStorage.ts + leagueBuilderFarmScoutingHandoff.ts (handoff), FranchiseSetup.tsx, tierParams,
  ivEngine, salaryCalculator, leagueConstruction.test.ts. No T8d-3 overlays built (correct scope).

**Findings:** none (LOW or above). Note: Codex's RTL board smoke ran; in-app browser was unavailable (JK
browser sign-off is the batched gate regardless).

**Status:** T8d-2 = built + audited CONFORMS — JK APPROVED. COMMITTED (`2a5cd95`). BROWSER-PENDING
(batched): the MLB snake-draft board — start draft, snake order, per-candidate solvency signal, BLOCKED
gate, confirm a pick (roster + assignment persist), reload resumes, 22-per-team completes, existing farm
draft still fills 10, Franchise Setup handoff accepts the league.

---

## T8d-3 CONTRACT (2026-06-14) — Board intelligence overlays — IV §7.3

**ROUTE:** Codex 5.5 | very high reasoning effort → Opus 4.8 audit (Fable unavailable; auditor ≠ builder).
User-visible (display overlays) but NO persistence / NO routes / NO engine change → audit non-negotiable +
JK SURFACE before commit (NOT auto-commit). The LAST T8d ticket — wires the final two ORPHANED T8a engine
fns (derivePickValueChart output via pool.pickValueChart; validateTrade) + extends the solvency signal to a
cross-team comparison. Q7: trade validator advisory-only, no persistence/execution. R9 + R12 stay DEFERRED.

```
[identical to Temp/t8d3-contract.md — the builder prompt fed to Codex this session]
```
Full contract text: `Temp/t8d3-contract.md` (self-contained: pick-value chart panel from
pool.pickValueChart; advisory trade-validator panel calling validateTrade w/ try-catch on out-of-range;
on-demand per-candidate cross-team GREEN/YELLOW/RED/BLOCKED via assessSolvency; ALL in
LeagueBuilderSnakeDraft.tsx; do-not-touch incl. engine/persistence/routes; verify = tsc0/build0/
suite-no-new-RED + diff scoped to the board + its test, DB stays 7, IV display stays pool.iv/L2).

**Status:** contract drafted → Codex build complete → audited CONFORMS → **SURFACED to JK, awaiting
approval before commit** (record below).

### T8d-3-AUDIT + EXECUTION RECORD (2026-06-14)

**ROUTE actual:** Codex 5.5 | high (knob max) BUILT → Opus 4.8 (Captain) independent AUDIT (auditor ≠
builder). User-visible overlays, NO persistence → NOT auto-committed; surfaced for JK approval.

**Builder result (Codex 5.5):** 2 files. LeagueBuilderSnakeDraft.tsx += pick-value chart panel (renders
pool.pickValueChart + on-clock pick value) + advisory trade-validator panel (validateTrade in try/catch,
out-of-range → friendly message) + on-demand per-candidate cross-team solvency chips
(buildTeamSolvencyComparison via assessSolvency across all teams, toggled by comparisonPlayerId). Its test
+= chart rows, balanced/imbalanced/out-of-range trade, cross-team rows, pick-list parsing.

**AUDIT VERDICT: CONFORMS.** Independent re-verification (Opus):
- tsc -b 0; `npm run build` exit 0; full suite (independent rerun) 7,207 pass / 3 fail / 390 files — the 3
  are EXACTLY the characterized set; NO new RED. 7,210 = 7,206 + 4. (GameTrackerLaunchState passed in this
  run; it is the conditional-solo order-flake in the characterized set either way.)
- WIRING correct: pick-value chart from pool.pickValueChart (display-only, registration snapshot);
  validateTrade wrapped in try/catch with a friendly out-of-range message (advisory, overridable, NO
  persistence per Q7); parseTradePickList filters non-finite tokens; buildTeamSolvencyComparison builds
  per-team committedRoster/committedSalaries + identity-shifted caps + rosterSize 22, on-demand per selected
  candidate (not precomputed for all × all). Closes the last 2 T8a engine orphans (derivePickValueChart
  output + validateTrade now have UI consumers).
- SCOPE clean: git diff = ONLY LeagueBuilderSnakeDraft.tsx + its test (+ Captain docs). do-not-touch
  byte-unchanged (git diff --name-only empty): leagueConstruction.ts, leagueBuilderStorage.ts,
  useLeagueBuilderData.ts, App.tsx, LeagueBuilder.tsx, farm draft, rosters, handoff, tierParams, ivEngine,
  salaryCalculator. DB_VERSION still 7. No R9/R12. Candidate IV display stays pool.iv (L2).

**Findings:** none (LOW or above).

**Status:** T8d-3 = built + audited CONFORMS — JK APPROVED. COMMITTED (`2738cf5`). This COMPLETES T8d
(R9 + R12 deferred fast-follows). BROWSER-PENDING (batched): pick-value chart panel; trade validator
(balanced/imbalanced/out-of-range); "Compare teams" per-candidate cross-team signal chips.

---

## T9a CONTRACT (2026-06-14) — Pure in-game sub-recommendation engine — IV §10/§11

**ROUTE:** Codex 5.5 | very high reasoning effort → Opus 4.8 audit (Fable unavailable; auditor ≠ builder).
PURE engine, NO GameTracker wiring / NO UI / NO persistence → standing auto-commit on CONFORMS. T9 split =
2 tickets (T9a engine → T9b GameTracker integration). JK rulings (DECISIONS_LOG 2026-06-14): delta =
IV-of-effectiveRatings (kblIV, "one truth" with T7a); subRecThreshold PER-TYPE; new pure engine module
`src/engines/subRecommendations.ts`; rosterAnalyzer/T7 stays byte-unchanged (scorer reimplemented, audit
diffs equivalence vs `rosterAnalyzer.ts:535-571`). Captain defaults: role-misuse = mojo-level down-shift;
defensive-sub folds DefensivePlacementRisk into the kblIV delta; no-oracle-leak N/A (active known roster).

```
[identical to Temp/t9a-contract.md — the builder prompt fed to Codex this session]
```
Full contract text: `Temp/t9a-contract.md` (self-contained: new `subRecommendations.ts` with
`recommendSubs` + the exact ivOfEffectiveRatings recipe under LIVE ctx + per-type SUB_REC_THRESHOLD +
role-misuse mojo shift + defensive-risk fold + justification precedence; ADDITIVE exports + `activeTraitNames`
helper on effectiveRatings.ts (no behavior change); do-not-touch incl. rosterAnalyzer/managerWpa/GameTracker;
verify = tsc0/build0/suite-no-new-RED + diff scoped to the new file + effectiveRatings additive + constant +
test).

**Status:** contract drafted → Codex build complete → audited CONFORMS (record below).

### T9a-AUDIT + EXECUTION RECORD (2026-06-14)

**ROUTE actual:** Codex 5.5 | high (knob max) BUILT → Opus 4.8 (Captain) independent AUDIT (auditor ≠
builder). Pure engine → standing auto-commit on CONFORMS.

**Builder result (Codex 5.5):** 4 files. NEW `src/engines/subRecommendations.ts` (`recommendSubs` +
SubRecType/SubCandidate/SubRecInput/SubCandidateScore/SubRecommendation; `scoreEffectiveRatingsIv` recipe;
role-misuse mojo shift; defensive-risk fold; justification precedence; confidence bands). `effectiveRatings.ts`
ADDITIVE (export FitnessState/Position/Ratings/PlayerState/GameContext/PlacementRisk/EffectiveRatingsPlayer +
new `activeTraitNames`). `rosterEngineConstants.ts` += `SUB_REC_THRESHOLD` {pinch_hit 5_000,
defensive_replacement 7_500, pitcher_change 12_000} (CALIBRATE placeholders, kblIV dollars). NEW test (7).

**AUDIT VERDICT: CONFORMS.** Independent re-verification (Opus):
- tsc -b 0; `npm run build` exit 0; full suite (independent rerun) 7,214 pass / 3 fail / 391 files — the 3
  are EXACTLY the characterized set; NO new RED. 7,217 = 7,210 + 7.
- "ONE TRUTH" verified: `scoreEffectiveRatingsIv` (subRecommendations.ts:131-158) reproduces the
  `rosterAnalyzer.ts:546-571` recipe field-for-field (effectiveRatings default L2 → IVPlayerInput → computeIV
  .kblIV); `clampRating` is BYTE-IDENTICAL to rosterAnalyzer's (`!isFinite→0; max(0,min(99,v))` — NO rounding;
  Codex correctly mirrored the actual code over the contract's imprecise "round then clamp"). Live ctx is
  passed in (not the neutral lineup ctx).
- Mechanics match spec/rulings: role-misuse via `shiftMojo` down N MOJO_STATES (SP relieving/RP starting −1,
  CP starting −2, CP early-entry −1 with `secondToLastInning = (gameLengthInnings ?? 9) − 1`, SP/RP immune);
  defensive fold = `chanceFreq × errorLik × CALIBRATE.lineupDefensiveRiskIvPenalty` applied to BOTH current
  and candidate (risk-consistent delta); per-type threshold; confidence ≥2×→high/≥1.25×→medium/>→low.
- effectiveRatings.ts diff is PURELY ADDITIVE (7 `export` keywords + `activeTraitNames` which reuses the
  same predicatesActive+matrix loop, read-only — `void potency` since activation is potency-independent). NO
  behavior change to effectiveRatings/defensivePlacementRisk/traitDeltas.
- BYTE-UNCHANGED (git diff --name-only empty): rosterAnalyzer.ts (scorer reimplemented, NOT edited),
  ivEngine.ts, managerWpaRecommendations.ts, GameTracker.tsx, useGameState.ts, tierParams, salaryCalculator.

**Findings:** none (LOW or above).

**Status:** T9a = built + audited CONFORMS. Pure engine, NO user-visible surface. COMMITTED (`ef85c80`).
NEXT: **T9b** (GameTracker integration). 

---

## T9b CONTRACT (2026-06-14) — GameTracker sub-rec integration — IV §10

**ROUTE:** Codex 5.5 | very high reasoning effort → Opus 4.8 audit (Fable unavailable; auditor ≠ builder).
User-visible + GameTracker-state → audit NON-NEGOTIABLE + JK SURFACE before commit (NOT auto-commit). Wires
T9a `recommendSubs` into the live rec surface: widen the `GameTracker.tsx:10207` call-site mapping (full
ratings/traits/mojo/fitness/opposing-player — all ALREADY in live state) + derive the pressure band from
`getCurrentLeverageIndex` + rebuild the 3 generators in `managerWpaRecommendations.ts` to call recommendSubs
and map SubRecommendation→ManagerRecommendation + rewrite the generation tests. JK firing-gate ruling: PURE
IV-delta gate — REMOVE the situational firing heuristics (leverage floor, batting-order gate, pitcher
meltdown triggers). Output type + watch/decision plumbing + NewsBoard UI STAY.

```
[identical to Temp/t9b-contract.md — the builder prompt fed to Codex this session]
```
Full contract text: `Temp/t9b-contract.md` (self-contained: add-only input expansion + PRESSURE_LEVERAGE_
BANDS {high 1.5, extreme 3.0} + 3 generators rebuilt onto recommendSubs (live GameContext + SubCandidate
mapping; pure IV-delta gate) + widened GameTracker call-site mapping + generation-test rewrite (plumbing
tests stay green); do-not-touch incl. the T9a engine + output contract; verify = tsc0/build0/suite-no-new-
RED + wpaRuntimeBoundary still the same characterized fail + diff scoped to managerWpa/GameTracker/constants/
test).

**Status:** contract drafted → Codex build complete → audited CONFORMS → **SURFACED to JK, awaiting
approval before commit** (record below).

### T9b-AUDIT + EXECUTION RECORD (2026-06-14)

**ROUTE actual:** Codex 5.5 | high (knob max) BUILT → Opus 4.8 (Captain) independent AUDIT (auditor ≠
builder). User-visible + GameTracker-state → NOT auto-committed; surfaced for JK approval.

**Builder result (Codex 5.5):** 4 files. `managerWpaRecommendations.ts` — input contract expanded (add-only),
3 generators rebuilt onto `recommendSubs` (toEffectiveRatingsPlayer/toPlayerState/toSubCandidate adapters +
buildGameContext + SubRecommendation→ManagerRecommendation mapping). `GameTracker.tsx` — rec useMemo mapping
widened to feed full ratings/traits/hands/positions/mojo/fitness/pitchCount/count/bases/runners/opposing
player. `rosterEngineConstants.ts` — `PRESSURE_LEVERAGE_BANDS {high 1.5, extreme 3.0}`. Test rewritten (16).

**AUDIT VERDICT: CONFORMS.** Independent re-verification (Opus):
- tsc -b 0; `npm run build` exit 0; full suite (independent rerun) 7,217 pass / 3 fail / 391 files — the 3
  are EXACTLY the characterized set; NO new RED. `wpaRuntimeBoundary` still the SAME characterized fail
  (only the 2 franchiseAnalyticsTrust.ts allowlist lines — scoring moved off WPA but leverageIndex stays a
  read-only input; allowlist not newly tripped).
- ORPHAN TRACE RESOLVED (the #1 risk): the widened call-site ACTUALLY feeds the engine — `toEffectiveRatings
  Player` maps traits (trait1/trait2/traits[]) + ratings + hands + positions; `toPlayerState` maps mojo/
  fitness/workload; `buildGameContext` passes opposingPlayer (current pitcher for hitter recs / current
  batter for pitcher recs) so trait-vs-trait + handedness activate; GameTracker maps mojo via
  getMojoForPlayer (6-level numeric→state normalize, matching MojoLevelLabel), fitness via getFitnessForPlayer,
  pitchCount via pitcherStats. No defaults-only no-op.
- PURE IV-DELTA GATE (JK ruling): the only firing condition is `recommendSubs(...).recommend`; the
  situational heuristics are removed (no leverage floor, no batting-order gate, no consecutiveBaserunners/
  runsAllowedInInning meltdown triggers; no batterScore/defenderScore/improvement-gate).
- OUTPUT CONTRACT preserved: ManagerRecommendation unchanged; createRecommendation + suppressKey +
  watch-event + prompted-decision builders + NewsBoard plumbing untouched; the ~5 plumbing tests stay GREEN.
- BYTE-UNCHANGED (git diff --name-only empty): subRecommendations.ts + effectiveRatings.ts (T9a engine),
  rosterAnalyzer, ivEngine, tierParams, salaryCalculator, trackerDb, leagueBuilderStorage.

**Findings (LOW, non-blocking):** (1) vestigial input fields `runsAllowedInInning`/`consecutiveBaserunners`/
`battingOrder` remain in the input types but are no longer consumed as firing gates (harmless; cleanup
candidate). (2) Doc nit: the global `kbl-gotchas.md` says mojo is "5 levels (−2..+2)" but the code is
6-level (`MojoLevelLabel` incl. 'On Fire'); the T9b normalize is correct vs the code — flag the stale doc.

**Status:** T9b = built + audited CONFORMS — **AWAITING JK APPROVAL to commit** (user-visible + GameTracker-
state). This COMPLETES T9. BROWSER-VERIFY (batched): in-game NewsBoard sub recs now fire on IV-of-
effectiveRatings — a clearly-better bench bat surfaces a pinch-hit rec with a trait/mojo justification; a
tiring pitcher surfaces a fresh-arm rec; the situational-only triggers no longer fire on their own;
keep/decline actions + watch persistence still work.

---

## T10 CONTRACT (2026-06-15) — Lineup Delta WPA standard wiring + constants snapshotting — IV §9/§12

**ROUTE:** Codex 5.5 | high reasoning effort → Opus 4.8 audit (Fable unavailable; auditor ≠ builder).
Persistence / saved-data-shape ticket (new per-game §9 summary field + per-season constants hash on
SeasonMetadata) → NOT auto-commit; JK SURFACE before commit; prioritized in the browser-verify batch. Single
"high" ticket (NOT split) because the SeasonMetadata-hash mechanism adds NO DB migration. JK rulings
(DECISIONS_LOG 2026-06-15): R1 §9 = IV-of-effectiveRatings ("WPA" misnomer documented, rename→v2); R2 = PURE
projected-vs-projected scalar (reuse `summarizeLineupSnapshotComparison.projectedOpportunityCostTotal`,
`optimalLineup.ts:416-429`), persisted ADDITIVE + audit-only, existing realized `managerWpa` BYTE-UNCHANGED +
NOT in the managerValue rollup; R3 = full-dependency CONTENT HASH (rosterEngineConstants optimizer-subset +
ivCurves + traitPricing + traitInteractionMatrix; tierParams EXCLUDED) stamped on `SeasonMetadata` (no DB
bump, write-once, loud-warn on divergence).

```
[identical to Temp/t10-contract.md — the builder prompt fed to Codex this session]
```
Full contract text: `Temp/t10-contract.md` (self-contained). Part A: new `ManagerLineupDeltaSummary` type +
`deriveManagerLineupDeltaSummaries` (managerWpaGameState.ts, gameEnded gate, both managers) + additive
persistence mirror of `managerLineupDeltas` (PersistedGameState + CompletedGameRecord + useGameState end-game
plumbing); field `lineupDeltaWpaStandard` (distinct from the existing aggregate `lineupDeltaWpa`); camelCase
clears the wpaRuntimeBoundary `\bwpa:` pattern → zero allowlist edits. Part B: new pure
`src/engines/optimizerConstantsSnapshot.ts` (`OPTIMIZER_CONSTANTS_VERSION` + deterministic FNV-1a content
hash over the optimizer dependency set; no Date.now) + additive `optimizerConstantsVersion`/
`optimizerConstantsHash` on SeasonMetadata, stamped write-once in `getOrCreateSeason`. Do-not-touch: the 5
optimizer/data engines, optimalLineup.ts (reuse only), the realized managerWpa derivation, trackerDb,
backupRestore, salaryCalculator, the iv_oracle/golden fixtures. Verify = tsc0/build0/full-suite-no-new-RED
(baseline 7,220/391 +N) + wpaRuntimeBoundary unchanged + `git diff --name-only` scoped. Captain-owned
(post-build, not Codex): a one-line §9 spec note documenting the IV-not-WP misnomer.

**Status:** contract drafted → JK go → Codex build complete → audited CONFORMS → AWAITING JK APPROVAL to
commit (persistence ticket; record below).

### T10-AUDIT + EXECUTION RECORD (2026-06-15)

**ROUTE actual:** Codex 5.5 | high (knob max) BUILT (background `codex exec`, workspace-write) → Opus 4.8
(Captain) independent AUDIT (auditor ≠ builder; Captain did NOT write the code). Persistence / saved-data-shape
→ NOT auto-committed; surfaced for JK approval.

**Builder result (Codex 5.5):** 9 paths (6 edited + 3 new). NEW `src/engines/optimizerConstantsSnapshot.ts`
(`OPTIMIZER_CONSTANTS_VERSION` + `captureOptimizerConstantsSnapshot` → {version, FNV-1a hash} over the
optimizer dependency set). `managerWpa.ts` += `ManagerLineupDeltaSummary` (units comment). `managerWpaGameState.ts`
+= `deriveManagerLineupDeltaSummaries` (gameEnded gate, both managers, sourced from
`summarizeLineupSnapshotComparison`) + refresh mirror. `gameStorage.ts` + `useGameState.ts` (×2 end-game sites):
`managerLineupDeltaSummaries` persisted sibling to `managerLineupDeltas`. `seasonStorage.ts`: additive
`optimizerConstantsVersion`/`Hash` on SeasonMetadata + write-once stamp in `getOrCreateSeason` + warn-once
no-overwrite on drift. +10 tests / +2 files.

**AUDIT VERDICT: CONFORMS.** Independent re-verification (Opus, reran — not graded from builder paste):
- `tsc -b` exit 0; `npm run build` exit 0 (PWA artifacts generated). Full suite (independent rerun)
  **7,227 pass / 3 fail / 393 files** — the 3 are EXACTLY the characterized trio (wpaRuntimeBoundary,
  franchiseManualSmokeFixture, franchiseNarrativeEventEligibility; full failing-file list captured). NO new
  RED; arithmetic reconciles 7,217 prior-passing + 10 new = 7,227. wpaRuntimeBoundary unchanged (still only
  the 2 franchiseAnalyticsTrust.ts lines; the new camelCase `lineupDeltaWpaStandard`/`managerLineupDeltaSummaries`
  clear the `\bwpa:` pattern → ZERO allowlist edits).
- R2 verified: `lineupDeltaWpaStandard = summarizeLineupSnapshotComparison(...).projectedOpportunityCostTotal`
  (managerWpaGameState.ts), both sides, under the same `gameEnded` gate as `managerLineupDeltas`. REGRESSION
  GUARD test proves the existing realized `managerWpa` records are byte-identical (`toEqual(legacyLineupDeltas)`)
  AND the POG `managerValue`/`lineupDeltaWpa` rollup is unchanged (the new summary does NOT enter it — no
  double-count).
- R3 verified: hash module imports the precise optimizer-objective subset (effectiveRatings + rosterAnalyzer
  objective consts + IV_CURVES + traitPricing-4 + TRAIT_INTERACTION_MATRIX); correctly EXCLUDES
  FARM_SCOUTED_GRADE/ROSTER_MOVE_CALLOUT (T7b, not the lineup objective) and tierParams. Canonical sorted-key
  serialize + FNV-1a, NO Date.now. Snapshot test is a real mutation-kill across all 4 dependency files incl.
  the trait matrix (hash CHANGES on each mutation). SeasonMetadata stamp: write-once, warn-once-no-overwrite on
  drift (test seeds 'old-hash' → both reads stay 'old-hash', console.warn called exactly once). NO DB version
  bump (additive field; getOrCreateSeason refactor verified to not spuriously re-write).
- A3 ORPHAN TRACE RESOLVED: `managerLineupDeltaSummaries` reaches every site `managerLineupDeltas` is
  persisted/copied (PersistedGameState, CompletedGameRecord, archiveCompletedGame `|| []`, refresh path, both
  useGameState end-game writes). Additive plumbing only; no reducer/game-flow change.
- DO-NOT-TOUCH byte-unchanged (`git diff --name-only` empty): rosterAnalyzer, effectiveRatings, ivEngine,
  subRecommendations, optimalLineup, ivCurves, traitPricing, traitInteractionMatrix, rosterEngineConstants,
  tierParams, trackerDb, backupRestore, salaryCalculator.

**Disagreements with builder report:** none material. Codex's file count (9) and suite counts (7,227/3/7,230)
match the independent rerun exactly.

**Findings (LOW, non-blocking):** (1) `deriveManagerLineupDeltaSummaries` calls
`captureOptimizerConstantsSnapshot().version`, recomputing the full content hash just to read the constant
`version` string — could use `OPTIMIZER_CONSTANTS_VERSION` directly; negligible (game-end only), cleanup
candidate. (2) Pre-existing (surfaced, NOT T10): `backupRestore.ts` stale at v12 drops the v13/v14/v15 stores —
separate backup-hardening ticket; T10 correctly avoided a new store so it does NOT inherit the defect.
(3) Captain-owned (done): §9 spec note documenting the IV-not-WP misnomer added to
IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md.

**Status:** T10 = built + audited CONFORMS — **AWAITING JK APPROVAL to commit** (persistence / saved-data-shape).
This COMPLETES the T-stack → next is D0. BROWSER-VERIFY (batched, prioritized as persistence): start a seasoned
(franchise) game, set a deliberately sub-optimal lineup, play to completion → confirm a per-game §9
`lineupDeltaWpaStandard` persists (≤ 0) for both managers and survives reload, the existing Manager-WPA
overlay/almanac totals are UNCHANGED (no double-count), and the season carries an `optimizerConstantsHash` that
survives backup/restore.

---

## L1 — Personality & hidden-modifier substrate (Phase-2 L-stack) — 2026-06-16 (autonomous run)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Autonomous run per
`AUTONOMOUS_RUN_PROTOCOL.md`; auto-commit on VERIFIED (AUTH-1).

**GOAL:** Rename the four HIDDEN personality modifiers to spec-canonical names, type the field on the Player
schema, update all test data. Rename: leadership→loyalty, volatility→ambition, adaptability→resilience,
pressure→charisma.

**SOURCE OF TRUTH:** `FRANCHISE_V1_LIVING_SEASON_DSTACK.md` L1 + `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §6 / LS-10.

**ALLOWED:** `prospectScoutingDraftEngine.ts` (HiddenPersonalityModifiers interface ~69-74 + generated literal
~542-547; keep EXPORTED) · `leagueBuilderStorage.ts` (add `hiddenPersonalityModifiers?: HiddenPersonalityModifiers`
to Player ~285) · `franchisePlayerProfile.ts` (carrier field ~40 `unknown`→concrete type) · the test files
referencing old keys (prospectScoutingDraftEngine, leagueBuilderStartupFarmDraft, franchisePlayerContinuity,
franchiseMoraleRelationshipTrust, franchiseNarrativeEventEligibility, franchiseRandomEventGenerator,
franchiseStartupProspectDraft, franchiseMoraleRelationshipOverrideSchema).

**DO NOT TOUCH:** the 7 visible personalities (~247, 540) · franchisePlayerStorage.ts logic (generic persistence)
· the presence-only consumers' logic · any value/IV/salary/WAR/golden file. **No data-migration code.**

**CONSERVATIVE DEFAULTS (pre-decided, AUTH-2):** no migration (pre-launch; presence-only live consumers; no
by-key reader until the unbuilt L3) · field fully typed `HiddenPersonalityModifiers` · carrier → concrete type.

**VERIFICATION (prefix `NODE_ENV= `):** `tsc --noEmit` 0 · `npm run build` 0 · per-file vitest (note the
pre-existing characterized franchiseNarrativeEventEligibility fail is NOT a new break) · grep gate:
`grep -rn "hiddenPersonalityModifiers" src/ | grep -E "\.(leadership|volatility|adaptability|pressure)\b"` = 0.

**STOP IF:** any out-of-ALLOWED edit · a visible-personality/oracle touch · a NEW (non-characterized) test fail.

**Status:** contract issued; Codex invoked. Audit + verdict to follow in `AUTONOMOUS_RUN_LOG.md`.
**Result:** VERIFIED + committed `d48ab3c`.

---

## D1 — Close the `useSeasonStats.ts:38 DEFAULT_TOTAL_GAMES=162` WAR-scaling hardcode — 2026-06-16 (autonomous run)

**ROUTE:** Codex | high → Opus audit. Autonomous (AUTH-1, auto-commit on VERIFIED).

**GOAL:** Point `useSeasonStats.ts:38` `DEFAULT_TOTAL_GAMES = 162` at the canonical `MLB_BASELINE_GAMES`
(franchiseAdaptiveStandards), per the `seasonAggregator.ts:39` pattern. **ZERO behavior change** —
`MLB_BASELINE_GAMES === 162`; WAR scaling already routes through stored `gamesPerTeam` via
`resolveSeasonGamesForWAR` (falls back to this constant only when gamesPerTeam is null).

**SOURCE OF TRUTH:** `FRANCHISE_PLAYABLE_V1_DEFINITION.md` D1.

**ALLOWED:** `src/hooks/useSeasonStats.ts` line 38 only (+ extend the existing franchiseAdaptiveStandards import
for `MLB_BASELINE_GAMES` if needed).

**DO NOT TOUCH:** `war.ts` (`| 162` type literal) · `seasonAggregator.ts` / `useSeasonData.ts` (separate
constants) · WAR engines · lines 350/359 (leave; they alias the constant) · any value/oracle file.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · the 5 WAR-scaling test files all pass (zero behavior
change) · `grep -nE "= 162|/ 162|\* 162" src/hooks/useSeasonStats.ts` = 0.

**Status:** contract issued; Codex invoked.
**Result:** VERIFIED + committed `752882f`.

---

## D2 — Backup/restore parity (register 3 franchise stores + pin + parity-guard) — 2026-06-16 (autonomous run)

**ROUTE:** Codex | high → Opus audit. Autonomous (AUTH-1, auto-commit on VERIFIED). Persistence/data-integrity.

**GOAL:** `backupRestore.ts` pins `kbl-tracker` at v12 while `trackerDb.ts` is v15 → `franchiseTrueValueRows`(v13)
/`franchiseDesignationRows`(v14)/`franchiseSeasonLedgerRows`(v15) silently drop on export/restore. Register them
in `trackerStores` (mirror trackerDb keyPaths+indexes+unique exactly), bump the pin 12→15, add a parity-guard +
round-trip test.

**SOURCE OF TRUTH:** `FRANCHISE_PLAYABLE_V1_DEFINITION.md` D2; mirror `trackerDb.ts:117/132/323`.

**ALLOWED:** `backupRestore.ts` (3 store entries in `trackerStores`; pin line 275 12→15) + NEW
`src/utils/tests/backupRestore.franchiseParity.test.ts` (parity-guard: trackerDb objectStoreNames === registry
keys; round-trip: 3 stores survive export→restore; harness per `backupRestore.elimination.test.ts`).

**DO NOT TOUCH:** `trackerDb.ts` (source of truth) · **`KBL_BACKUP_VERSION` stays 2** (restore rejects on
mismatch, lines 1232/1253 — bumping breaks existing backups; format unchanged) · `syncConfig.ts` /
`franchiseSaveSlotManifest.ts` (all-DB guard + reconciliation = separate hardening ticket, OUT) · export/restore
UI wiring (OUT) · any other DB / value file.

**CONSERVATIVE RULINGS:** KBL_BACKUP_VERSION untouched; parity-guard scoped to kbl-tracker only; no L2-expiry test.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · the new parity+round-trip test passes ·
`backupRestore.elimination.test.ts` still passes · pin === 15, KBL_BACKUP_VERSION === 2.

**STOP IF:** parity-guard reveals stores missing beyond the 3 (report them); out-of-ALLOWED edit; test fail.

**Status:** contract issued; Codex invoked.
**Result:** VERIFIED + committed `2fab709`.

---

## L1.5 + OD-1 — Hidden-modifier backfill + Team Captain assignment at franchise init — 2026-06-16 (autonomous run, resumed)

**ROUTE:** Codex | high → Opus audit. Autonomous (AUTH-1). Resumed per JK "why did you stop" — building OD-1's
conservative default (option a) + L1.5 rather than setting aside.

**GOAL:** (A/OD-1) Backfill the 4 hidden modifiers for ALL franchise players at init — MLB pool players lack them
(only the prospect path generates them); spec §6/§7 says all players carry them. Generate deterministically
(`generateHiddenPersonalityModifiers(player.id)`, same `clamp(50+normal*20,0,100)` distribution as prospects;
backfill-if-missing, no SOT touch). (B/L1.5) Assign each Team's Captain = `max(loyalty+charisma)` among MLB
players with `charisma>=70`, persist `captainPlayerId` on Team; null+warn if none qualify.

**SOURCE OF TRUTH:** FRANCHISE_V1_LIVING_SEASON_SPEC §4/§6/§7; DSTACK L1.5; RUN_LOG OD-1.

**ALLOWED:** `prospectScoutingDraftEngine.ts` (extract+export `generateHiddenPersonalityModifiers(seed)`,
output-preserving refactor of buildCandidate) · `franchiseInitializer.ts` (backfill + captain steps after
deepCopy, before season metadata; export the helpers) · `leagueBuilderStorage.ts` (`captainPlayerId?: string` on
Team) · franchiseInitializer test (+ keep prospect test green).

**DO NOT TOUCH:** `franchiseDesignationEligibility.ts` (CAPTAIN policy stays blocked — L7 owns activation+effects)
· playerDatabase SOT / any value/oracle file · the 7 visible personalities / prospect output values · trackerDb /
backupRestore (Team field is additive optional, per-franchise DB).

**CONSERVATIVE DEFAULTS:** backfill seed = player.id, distribution = prospect's, backfill-if-missing · captain =
max(loyalty+charisma), charisma>=70, MLB-only, ties→charisma→id, null+warn if none · no eligibility unblock.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · franchiseInitializer + prospectScoutingDraftEngine
tests pass (prospect output unchanged) · helper exported + used by buildCandidate.

**STOP IF:** out-of-ALLOWED edit; can't find the franchise player/team write API; prospect output would change.

**Status:** contract issued; Codex invoked.
**Result:** VERIFIED + committed (see git log).

---

## L4a — Base reporter-connect (REP-1..3) — 2026-06-16 (autonomous run)

**ROUTE:** Codex | high → Opus audit. Autonomous (AUTH-1/AUTH-2). User-visible reporter-connect (no new engine).

**GOAL:** Franchise produces ZERO reporter output today (no assignment, launch omits flags, BeatReporterNews uses
the legacy `generateGameRecap`). Connect the EXISTING live reporter to franchise: auto-assign a franchiseId-scoped
reporter on launch, pass `postGameColumnsEnabled` (REP-1: post-game columns ONLY), rewrite `BeatReporterNews` to
read persisted `GameStory`. Publish-bus (SeasonNewsItem) + manual panel + REP-4 accuracy = DEFERRED.

**SOURCE OF TRUTH:** REPORTER_CERTIFICATION §I (REP-1..3); mirror ExhibitionGame.tsx:703-735.

**ALLOWED:** `reporterStorage.ts` · `reporterAssignment.ts` · `FranchiseHome.tsx` (navigate 974/3521 +
BeatReporterNews 4428) · `useCommentaryFeed.ts`.

**DO NOT TOUCH/BUILD:** publish bus · legacy narrativeEngine · REP-4 accuracy · liveBeat/between-inning · any new
store/trackerDb/backup · any value/oracle file.

**CONSERVATIVE DEFAULTS:** franchiseId cascade · auto-assign (no new panel) · postGameColumns default true ·
reporter generation Supabase/network-dependent (D-R5), wired-only.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · reporter/franchise-home tests pass (no new break) ·
franchise BeatReporterNews no longer calls generateGameRecap.

**STOP IF:** out-of-ALLOWED edit; can't find the GameStory list fn; non-characterized regression.

**Status:** contract issued; Codex invoked.
**Result:** VERIFIED, browser-pending + committed `0cf4ca2`.

---

## L4a publish-bus CORE (SEA-1..5) — 2026-06-16 (autonomous run, browser-deferred)

**ROUTE:** Codex | high → Opus audit. Autonomous (AUTH-1/AUTH-2). Build-dark foundation, off the live path.

**GOAL:** Stand up the SEA-1 season-long narrative "publish bus": `SeasonNewsItem` store + sim-tunable
`SeasonEmissionConfig` + emission gate + `generateSeasonNewsTake` on the canonical reporter. No event SOURCES
(later soul-layer systems tap in); memory writer + hub feed deferred.

**SOURCE OF TRUTH:** REPORTER_CERTIFICATION Part 2 (SEA-1..5); SEA-3 = SeasonNewsItem store. Mirror
`gameStoriesStorage.ts` + claudeClient/promptBuilder transport; reuse `NarrativeEventType`.

**ALLOWED:** `types/reporter.ts` (+SeasonNewsItem, +SeasonEmissionConfig) · NEW `seasonNewsStorage.ts` (mirror
gameStoriesStorage) · NEW `seasonEmissionConfigStorage.ts` · NEW `seasonNewsGenerator.ts`
(shouldEmit + generateSeasonNewsTake; returns null gracefully w/o Supabase) · `trackerDb.ts` (2 stores, v15→16) ·
`backupRestore.ts` (register 2 stores, pin 15→16, **KBL_BACKUP_VERSION stays 2**) · `syncConfig.ts` · tests.

**DO NOT TOUCH/BUILD:** event sources/taps · memory writer / hub feed (deferred) · live game path · legacy
narrativeEngine (reuse only the type) · KBL_BACKUP_VERSION · value/oracle/REP-4.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · new tests + the D2 parity-guard (still green w/ 2 new
stores) + elimination test pass · TRACKER_DB_VERSION 16, pin 16, KBL_BACKUP_VERSION 2.

**STOP IF:** out-of-ALLOWED edit; parity-guard reveals other missing stores; transport can't be mirrored.

**Status:** contract issued; Codex invoked.
**Result:** VERIFIED + committed `8074976`.

---

## D6a — True-Value TRUST PROMOTION gate (part 1: live artifact) — 2026-06-16 (autonomous run)

**ROUTE:** Codex | high → Opus audit. Autonomous (AUTH-1/AUTH-2). THE MAKE-OR-BREAK value-spine ticket.

**JK DECISIONS (2026-06-16, map workflow `wf_3c443a04-35e`):** SEASON-END freeze (this ticket = the LIVE half,
`frozen:false`; D6b locks at last regular-season game) · regular-season-only · HARD-BLOCK <2 MLB peers (no
fudge/fallback) · FULL-PLAYER block (not per-position) · NEW dedicated `franchiseTrustedValueArtifacts` store ·
boundary via assertion + no-leak test. The map also caught a real inconsistency to reconcile
(`franchiseDesignationReadinessReport.ts:84` hardcodes `valueDeltaTrustedForDesignations:true`).

**GOAL:** Peer-pool audit → persist a LIVE trusted-value artifact (trust verdict per scope) → flip the 4 True-Value
trust flags from literal-false to COMPUTED (read from the artifact). Excludes hidden-FARM + score-only. Does NOT
touch the base-IV oracle; does NOT promote salary/morale/Captain/Mode-3 (boundary); freeze = D6b.

**ALLOWED:** NEW `franchiseTrustedValueStorage.ts` (the artifact store) · `franchiseTrueValueStorage.ts` (the audit
+ persist in calculateAndPersistFranchiseTrueValueForSeason) · `franchiseValueInputs.ts` /
`franchiseTrueValuePreview.ts` / `franchiseAnalyticsTrust.ts` (flip the 4 flags computed; NOT the D8 award flags) ·
`franchiseDesignationReadinessReport.ts` (reconcile :84) · `trackerDb.ts` (store, v16→17) · `backupRestore.ts`
(register, pin 17, KBL_BACKUP_VERSION stays 2) · `syncConfig.ts` · tests (audit + flags + reconcile + boundary +
parity-guard stays green).

**DO NOT:** the freeze (D6b) · base-IV oracle/computeIV/golden · D7/D8 promotion + UI labels · salaryMovement/
morale/Captain-Fan Hopeful-Cornerstone/Mode-3/offseason · KBL_BACKUP_VERSION.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · new tests + the trust tests + the D2 parity-guard pass ·
TRACKER_DB_VERSION 17, pin 17, KBL_BACKUP_VERSION 2; 4 flags computed; salaryMovement/morale unchanged-false.

**STOP IF:** out-of-ALLOWED edit; oracle touch; freeze needed; parity-guard reveals other missing stores.

**Status:** contract issued; Codex invoked.

---

## D6b — True-Value TRUST gate (part 2: SEASON-END FREEZE) — 2026-06-16 (autonomous overnight run, AUTH-4)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Autonomous overnight (AUTH-4 standing
go; AUTH-1 auto-commit on VERIFIED). THE MAKE-OR-BREAK value-spine ticket (freeze half). Persistence / saved-data-shape
→ audit RIGOROUSLY.

**SOURCE OF TRUTH:** `FRANCHISE_PLAYABLE_V1_DEFINITION.md:101` (D6 row) + `:129` boundary ("**D6 freezes one
trusted-value artifact; D7/D8 consume it, never recompute True Value**"). JK lock-timing ruling (D6 map `wf_3c443a04-35e`):
**SEASON-END FREEZE** — the artifact stays live each game (D6a) and **locks at the last regular-season game** so D8/D9
awards compute on a deterministic frozen spine; **regular-season-only**. D6b map: `wf_6f52f76d-cf6` (5 grounded
readers; every claim file:line-verified by the Captain before this contract).

**CAPTAIN DEFAULTS (AUTH-4 — documented, JK-overridable on review; logged in AUTONOMOUS_RUN_LOG.md):**
1. **Freeze BOTH stores, not just the artifact.** Spec says "the artifact" (singular), but D9 RANKS winners on the
   numbers in the separate `franchiseTrueValueRows` store — freezing membership while letting ranking numbers drift
   = a determinism hole. So the freeze gates the WHOLE per-game recompute: once frozen, neither the artifact nor the
   rows are rewritten. (Both are written together in `calculateAndPersistFranchiseTrueValueForSeason`.)
2. **Freeze-in-place** (flip the flag on the artifact the last game's recompute already wrote) — NOT recompute-then-freeze.
   The artifact's `trustedPlayerIds`/`rosterStateSnapshot` are already current as of the last aggregated game; skipped /
   score-only finales add no aggregated stats. Lower blast radius, no recompute-input re-assembly in the UI layer.
3. **Idempotent freeze; `frozenAt` stamped exactly once** (re-fires must no-op, never re-stamp).
4. **HARD anti-thaw for v1** — no unfreeze/re-open affordance; a frozen scope is immutable for the season.
5. **No `contractVersion` bump** (stays `'d6-v1'`) — `frozen:true`+`frozenAt` is sufficient signal; the schema/policy
   is unchanged.
6. **Trigger BOTH paths** — `checkSeasonComplete` (sim/batch/skip handlers) AND the `isSeasonOver` effect (the
   live-played-finale + load-into-complete-season path). Both call the same idempotent helper. (The map flagged that
   wiring only `checkSeasonComplete` MISSES a season ended by a live-played final game, which returns via the effect.)

**GOAL:** Lock the D6a `franchiseTrustedValueArtifacts` record (+ its `franchiseTrueValueRows` numbers) at the last
regular-season game: set `frozen:true`/`frozenAt`, and make the per-game recompute REFUSE to overwrite a frozen scope.
D6b STRICTLY ADDS THE FREEZE — it does NOT flip any award flag (that is D8) and does NOT recompute True Value.

**ALLOWED (exact edits):**
- `src/utils/franchiseTrustedValueStorage.ts`: (a) widen `FranchiseTrustedValueArtifact.frozen` from the literal
  `false` (line 31) → `boolean`; (b) NEW idempotent `freezeTrustedValueArtifactForSeason(scope: FranchiseTrustedValueScopeInput)`:
  `getTrustedValueArtifact` → if null `console.warn`+return null (NO phantom record) → if `frozen===true` return as-is
  (no re-stamp) → else set `frozen:true`+`frozenAt:Date.now()` and persist; (c) **Layer-A anti-thaw guard** inside
  `persistTrustedValueArtifact` (the SOLE writer): read existing by scopeKey first; if `existing?.frozen===true &&
  incoming.frozen!==true` → `console.warn`+return existing UNCHANGED (refuse to un-freeze); otherwise put as today.
- `src/utils/franchiseTrueValueStorage.ts`: **Layer-B guard** at the top of `calculateAndPersistFranchiseTrueValueForSeason`
  (after the scope-validation block ~line 503): read `getTrustedValueArtifact(scope...)`; if `existing?.frozen===true`
  → early-return `{ rows: [], skippedRows: [], persisted: false, blockers: ['Trusted value artifact frozen for scope
  (D6b); recompute skipped.'] }` WITHOUT calling `auditTrustedValuePeerPools` / `persistTrustedValueArtifact` /
  `replaceFranchiseTrueValueRowsForScope`. (Caller `persistTrueValueAfterWar` already tolerates `!persisted` → skips
  designations gracefully.) `auditTrustedValuePeerPools` keeps returning `frozen:false` (live default) — unchanged.
- `src/src_figma/app/pages/FranchiseHome.tsx`: (a) in `checkSeasonComplete` after `markSeasonComplete(activeSeasonId)`
  (~line 3307) `if (franchiseId) await freezeTrustedValueArtifactForSeason({ franchiseId, seasonId: activeSeasonId,
  statsScopeId: activeSeasonId })` inside the existing try; (b) in the `isSeasonOver` effect (3286-3290) fire the same
  idempotent freeze (fire-and-forget, guarded on franchiseId+activeSeasonId) when `isSeasonOver`. Keep
  `setSeasonComplete(true)` as-is.
- Tests: `franchiseTrustedValueStorage.test.ts` (freeze idempotency: stamp-once; Layer-A refusal) + a freeze/anti-thaw
  test (seed→freeze→`calculateAndPersistFranchiseTrueValueForSeason` again → artifact STILL frozen, same `frozenAt`,
  same `trustedPlayerIds`, rows UNCHANGED — must go RED without the guards) + `backupRestore.franchiseParity.test.ts`
  (a `frozen:true` round-trip case; parity-guard stays green).

**DO NOT:** flip `trustedForAwards`/`finalWarTrusted` or touch `franchiseAnalyticsTrust.ts` (D8) · create
`franchiseAwardsEngine`/`Storage` (D9) · base-IV oracle / `computeIV` / `ivEngine` / golden / frozen-value oracle ·
add any new store or bump `TRACKER_DB_VERSION` (stays 17) · change `KBL_BACKUP_VERSION` (stays 2) · bump
`contractVersion` (stays `'d6-v1'`) · add any unfreeze/thaw path · D7 designation promotion / UI labels · salary
movement / morale / Captain-Fan Hopeful-Cornerstone / Mode-3 / offseason · the `franchiseTrueValueSnapshots`
game-1 trough store (that is D9 LSD-1, a different artifact).

**VERIFICATION (prefix `NODE_ENV= `, node at `~/.nvm/versions/node/v20.20.0/bin`):** `tsc --noEmit` 0 · `npm run build`
0 · the new freeze/anti-thaw tests + the D2 parity-guard (`backupRestore.franchiseParity.test.ts`) + the existing
`franchiseTrustedValueStorage` / `franchiseTrueValue*` suites pass · grep: `TRACKER_DB_VERSION` still 17, backup pin
still 17, `KBL_BACKUP_VERSION` still 2, `contractVersion` still `'d6-v1'`, ZERO edits to `franchiseAnalyticsTrust.ts`.

**STOP IF:** an out-of-ALLOWED edit becomes necessary; any oracle/golden/`computeIV` touch is implied; a new store or
DB version bump becomes necessary; the parity-guard reveals other missing stores; the `frozen` type widen ripples to
a consumer that relied on the `false` literal in a way that needs an out-of-scope edit.

**FORMAT:** files changed (every `git status` path + total count) · changes per file (cite the default # each satisfies)
· verification output pasted · "D6b complete" or "BLOCKED: <reason>".

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited.

**Status:** contract issued; Codex invoked.

### D6b-AUDIT + EXECUTION RECORD (2026-06-17, autonomous overnight AUTH-4)

**ROUTE actual:** Codex (high reasoning, background `codex exec`, workspace-write) BUILT → Opus 4.8 (Captain)
independent AUDIT (auditor ≠ builder). **Build #1 HUNG** (~6h40m on a stalled model-API call before any edit; repo
clean) → killed → **re-dispatched inside a 30-min watchdog** → Build #2 exit 0.

**AUDIT VERDICT: CONFORMS / VERIFIED.** Independent re-verification (Opus — re-ran, not graded from the builder paste):
- Diff = 6 files, all within ALLOWED: `franchiseTrustedValueStorage.ts` (frozen literal→`boolean`; idempotent
  `freezeTrustedValueArtifactForSeason`; Layer-A anti-thaw guard in the sole writer `persistTrustedValueArtifact`)
  · `franchiseTrueValueStorage.ts` (Layer-B early-return before `buildFranchiseValueInputRows` when frozen — locks
  BOTH the artifact AND `franchiseTrueValueRows`) · `FranchiseHome.tsx` (freeze after `markSeasonComplete` + the
  `isSeasonOver` effect for live-played finales; effect dep-array correctly widened) · 3 test files.
- `tsc --noEmit` 0 (Opus) · `npm run build` success (Opus) · full suite **7,254 pass / 3 fail / 400 files** — the 3
  are EXACTLY the characterized set (wpaRuntimeBoundary + franchiseManualSmokeFixture + franchiseNarrativeEventEligibility);
  ZERO new reds; +3 new D6b tests pass.
- **Mutation-honesty PROVEN:** disabling the Layer-B guard turns the anti-thaw test RED (it feeds a different recompute
  input post-freeze and asserts `buildFranchiseValueInputRows` was never called + rows/artifact byte-unchanged).
- Invariants: TRACKER_DB_VERSION 17, backup pin 17, KBL_BACKUP_VERSION 2, contractVersion `'d6-v1'` all unchanged;
  `franchiseAnalyticsTrust.ts` (D8 award flags) UNTOUCHED; no new store; scope `{franchiseId, activeSeasonId,
  activeSeasonId}` matches the artifact's stored key (games are stamped seasonId===statsScopeId===activeSeasonId);
  sole recompute caller (`processCompletedGame:227`) tolerates the frozen `!persisted` early-return.
- **BROWSER-PENDING (batched):** on real franchise data, finishing a regular season (last game played, simmed, OR
  skipped) freezes the trusted-value artifact (frozen:true + frozenAt), and a subsequent completed game does not
  un-freeze it. (Backend freeze logic; the user-visible label promotion is D7/D11.)

**Status:** VERIFIED → committed (branch `codex/franchise-v1-next`, not pushed).

---

## D7a — designations LIVE, part 1: dual-path reconcile + TEAM_MVP/ACE → 'active' + DesignationEvent — 2026-06-17 (autonomous overnight, AUTH-4)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Autonomous overnight (AUTH-4; AUTH-1
auto-commit on VERIFIED). Touches the SMB4 designation asset → audit the morale/fame firewall HARDEST.

**SPLIT RATIONALE (Captain, AUTH-4):** D7 is large + multi-surface (3 designation surfaces, a characterized-test
entanglement, dormant-consumer wake-ups, the morale firewall). Split like D6a/D6b: **D7a = reconcile + promote
TEAM_MVP/ACE + DesignationEvent infra; D7b = Albatross de-gate + the D6 trustedPlayerIds trust filter** (the
untrusted-value-leak correctness fix). Map: `wf_fde440e6-dd3` (6 readers, file:line-verified by the Captain).

**CAPTAIN DEFAULTS (AUTH-4, documented, JK-overridable):**
1. **Persisted store canonical; eligibility = ranking input.** Promote a persisted TEAM_MVP/ACE row to 'active' ONLY
   when the eligibility path classifies that SAME (type, team, player) 'active' — else keep 'projected' (conservative:
   promote only when both paths agree on the holder; no parallel ranker invented). Rankers-unification = follow-up.
2. **DesignationEvent EPHEMERAL** (in-memory return, NO store, NO v18 bump) — matches the RosterMoveEvent/TradeEvent
   precedent; minimal firewall-safe surface; a durable event stream for Phase-2 L3 is a separate ticket.
3. **Changed-only emission** (diff prior vs new active holders per team/type) — no per-game event spam.
4. **Do NOT touch the narrative gate / its characterized "TEAM_MVP/ACE preview-only" test** — that RED is
   PRE-EXISTING (a prior eligibility-promotion slice left it stale), owned by a separate narrative cleanup; D7a leaves
   the baseline unchanged (3 characterized fails stay).
5. **Embedded `player.franchiseDesignations` stays dormant** — D7a writes the STORE, not the embedded array, so the
   profile/trade 'active' consumers keep matching zero (no double-count). Repoint = follow-up.
6. **Albatross / FAN_FAVORITE / CAPTAIN / FAN_HOPEFUL / CORNERSTONE stay projected/blocked/deferred** (FF needs
   Phase-2 morale; Cornerstone CUT per LSD-3; Albatross = D7b).

**GOAL:** persisted TEAM_MVP/ACE rows 'projected'→'active' (gated on the eligibility verdict) + a live non-'Proj.'
badge + TeamHubContent render + an ephemeral changed-only DesignationEvent, with emission mutating NO morale/fame.

**ALLOWED:** `franchiseDesignations.ts` (LIVE badge map + getter; DesignationEvent type; pure diff helper) ·
`franchiseDesignationStorage.ts` (consult eligibility → stamp 'active'; read-prior → diff → return events; replace) ·
`TeamHubContent.tsx` (render live badges for 'active', keep 'Proj.' for projected; update status filters so active
rows are surfaced not dropped) · `processCompletedGame.ts` (capture/ignore the returned events; no morale wire) ·
designation tests (promotion / changed-only event / no-morale regression / badge).

**DO NOT:** Albatross (D7b) · narrative gate + its characterized test · fame (teamMVP/fameEngine/game.ts) · morale
(fanMoraleEngine; keep the morale bridge/adapter read-only all-false; do NOT import fanFavoriteEngine) · promote
FF/Captain/FanHopeful/Cornerstone · populate the embedded array with 'active' · new store / TRACKER_DB_VERSION (17) /
KBL_BACKUP_VERSION (2) · salary-weighting / FA-destination (LSD-2 deferred) · Mode-3/offseason/locking (lockedAt null).

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · designation + TeamHubContent + new tests pass; the
narrative "preview-only" characterized RED UNCHANGED (untouched) → baseline still 3 characterized fails · grep: no new
fame/morale/teamMVP/fanFavoriteEngine import in the designation path; no new store; TRACKER_DB_VERSION 17; KBL_BACKUP_VERSION 2.

**STOP IF:** out-of-ALLOWED edit; must touch fame/morale/narrative to compile; new store/version bump needed; canonical
direction would invert.

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited.

**Status:** contract issued; Codex invoked (under 30-min watchdog).

### D7a-AUDIT + EXECUTION RECORD (2026-06-17, autonomous overnight AUTH-4)

**ROUTE actual:** Codex (high reasoning, background `codex exec` under the 30-min watchdog) BUILT → Opus 4.8 (Captain)
independent AUDIT (auditor ≠ builder). Build #1 clean (no hang this time).

**AUDIT VERDICT: CONFORMS / VERIFIED.** Independent re-verification (Opus — re-ran, not graded from the paste):
- Diff = 6 files within ALLOWED: `franchiseDesignations.ts` (LIVE badge map [TEAM_MVP 'MVP' / ACE 'Ace', solid] +
  `getLiveDesignationBadge`; `DesignationEvent` type w/ the 3 firewall markers; pure `diffActiveDesignationHolders`) ·
  `franchiseDesignationStorage.ts` (consult `buildFranchiseDesignationEligibility` → promote a persisted TEAM_MVP/ACE
  row to 'active' ONLY when eligibility marks the EXACT (type,team,player) active; read-prior → diff → return ephemeral
  `designationEvents`) · `TeamHubContent.tsx` (surface 'active' rows — `status==='projected'||'active'` filter fix so
  active rows don't vanish; live solid badge vs 'Proj.' dotted; firewall language kept) · `processCompletedGame.ts`
  (`void result.designationEvents` — captured, ignored, no Phase-1 consumer) · 2 test files.
- `tsc --noEmit` 0 (Opus) · `npm run build` success (Opus) · full suite **7,258 pass / 3 fail / 400 files (7,261
  total, +4 D7a tests)** — the 3 are EXACTLY the characterized set; **the narrative "TEAM_MVP/ACE preview-only" RED is
  UNCHANGED** (D7a did not touch it — baseline preserved); ZERO new reds.
- **FIREWALL INTACT (the hard gate):** grep confirms NO morale/fame/teamMVP/fanFavoriteEngine import in
  `franchiseDesignations.ts`/`franchiseDesignationStorage.ts`; the `DesignationEvent` carries
  moraleMutationApplied/relationshipMutationApplied/salaryMovementApplied = false; Codex extended the existing source
  firewall test to statically guard against morale/fame imports.
- **Mutation-honesty:** the promotion test pins the gate from BOTH sides (trusted TEAM_MVP/ACE → 'active'; untrusted
  team-b MVP + FAN_FAVORITE + ALBATROSS stay 'projected'); the changed-only test proves same-holder → [] across
  recomputes, holder-change → one 'changed' event. A broken gate (promote-all or promote-none) fails these.
- Invariants: TRACKER_DB_VERSION 17, KBL_BACKUP_VERSION 2, NO new store (events ephemeral); Albatross/FF/Captain/
  FanHopeful/Cornerstone NOT promoted; embedded `player.franchiseDesignations` not populated with 'active' (consumers
  stay dormant — no double-count).
- **BROWSER-PENDING (batched):** on real franchise data, a trusted top-WAR TEAM_MVP/ACE shows a solid live badge
  (not 'Proj.'); a non-top/untrusted player stays 'Proj.'; FAN_FAVORITE/Albatross still 'Proj.'.

**Status:** VERIFIED → committed (branch `codex/franchise-v1-next`, not pushed). **→ NEXT: D7b (Albatross live + D6 trust filter).**

---

## D7b — designations LIVE, part 2: Albatross live + the D6 trusted-value gate — 2026-06-17 (autonomous overnight, AUTH-4)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Autonomous overnight (AUTH-4; AUTH-1).
Asset-protected designation + a value-boundary CORRECTNESS fix → audit the leak-closure + firewall HARDEST.

**WHY (map `wf_fde440e6-dd3`, Captain-verified):** the canonical Albatross selection names the most-negative
`valueDelta` player per team with NO peer-pool check → a <2-MLB-peer player (a D6 `blockedRow`, NOT in
`artifact.trustedPlayerIds`) can be branded Albatross, violating the D0 boundary ">=2 MLB peers must BLOCK." D7b
closes that leak AND promotes Albatross to live (D6 unblocked it). Verified: `warConsumerTrust.
fanFavoriteAlbatrossDesignations` is HARDCODED false (franchiseValueInputs.ts:47/:341) — D7b wires it to the
authoritative per-player `isPlayerTrustedForValue(artifact, player.id)` (same source as `trustedForTrueValue` :469).

**CAPTAIN DEFAULTS (AUTH-4):** trust source = `isPlayerTrustedForValue` on the live/frozen artifact (per-player ≥2-peer,
read-only — never recompute TV); trust filter binds at the SELECTION site (calculator) so an untrusted player is never
named Albatross even projected; Albatross promotes via the SAME D7a eligibility-verdict gate (ACTIVE_PROMOTION_TYPES +=
ALBATROSS); v1 Albatross policy = most-negative TRUSTED valueDelta, NO salary floor (the orphaned fanFavoriteEngine's
-25%/2x-salary/trade/happiness policy is NOT adopted); -1 fame stays DORMANT; Fan Favorite stays projected/blocked
(morale-gated). FF selection left UNCHANGED (its untrusted-value preview is a labeled morale-gated preview, not a
trusted consumer — documented; FF trust-filter = follow-up if JK wants it).

**ALLOWED:** `franchiseValueInputs.ts` (wire fanFavoriteAlbatrossDesignations ← isPlayerTrustedForValue) ·
`franchiseDesignations.ts` (FranchiseDesignationPlayerInput.valueTrusted; filter Albatross selection to valueTrusted;
ALBATROSS live badge) · `franchiseDesignationStorage.ts` (set valueTrusted on the input; ALBATROSS ∈
ACTIVE_PROMOTION_TYPES) · `franchiseDesignationEligibility.ts` (de-gate Albatross → 'active' for trusted + negative +
worst-on-team; FF stays blocked; fix valueDesignationBlockers stale reason for Albatross only) · designation/value
tests (leak-closed mutation-honest / promotion / FF stays projected / no-morale).

**DO NOT:** Fan Favorite promotion · Captain/FanHopeful/Cornerstone · import fanFavoriteEngine · fame (game.ts
ALBATROSS_NAMED -1 stays dormant / fameEngine / teamMVP) · morale (fanMoraleEngine; bridge/adapter read-only) ·
recompute TV / oracle / computeIV / frozen-artifact write · salary floor or any salary/trade/morale EFFECT on
Albatross · new store / TRACKER_DB_VERSION (17) / KBL_BACKUP_VERSION (2) · narrative gate + its test.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · full suite within the 3 characterized fails (no new reds) ·
grep: no morale/fame/teamMVP/fanFavoriteEngine import in the designation path; ALBATROSS_NAMED has no live emitter;
versions unchanged.

**STOP IF:** out-of-ALLOWED edit; must touch fame/morale/narrative/fanFavoriteEngine to compile; must recompute TV or
touch the oracle/frozen write; new store/version bump needed.

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited.

**Status:** contract issued; Codex invoked (under 30-min watchdog).

### D7b-AUDIT + EXECUTION RECORD (2026-06-17, autonomous overnight AUTH-4)

**ROUTE actual:** Codex (high, background `codex exec` under watchdog) BUILT → Opus 4.8 (Captain) independent AUDIT
(auditor ≠ builder). Build clean (no hang).

**AUDIT VERDICT: CONFORMS / VERIFIED → D7 COMPLETE.** Independent re-verification (Opus — re-ran):
- Diff = 9 files (4 product + 5 test). Substance: `franchiseValueInputs.ts` wires
  `warConsumerTrust.fanFavoriteAlbatrossDesignations` ← `params.trustedForTrueValue` (the per-player
  `isPlayerTrustedForValue` ≥2-peer membership; was hardcoded false) · `franchiseDesignations.ts` adds `valueTrusted`
  to the input, **filters the Albatross selection to `valueTrusted === true`** (closes the leak at the naming site),
  adds the ALBATROSS live red badge · `franchiseDesignationStorage.ts` sets `valueTrusted` from the row flag + adds
  ALBATROSS to `ACTIVE_PROMOTION_TYPES` · `franchiseDesignationEligibility.ts` de-gates Albatross to 'active' (ranked
  worst negative valueDelta, gated on `fanFavoriteAlbatrossDesignations`, reads `getFranchiseTrueValueRows` read-only),
  FAN_FAVORITE stays blocked.
- `tsc --noEmit` 0 (Opus) · `npm run build` success (Opus) · full suite **7,260 pass / 3 fail (7,263 total)** =
  EXACTLY the characterized set, ZERO new reds.
- **LEAK CLOSURE MUTATION-PROVEN:** removing the `valueTrusted` filter turns 4 persistence tests RED. The eligibility
  test proves it from the other side: an UNTRUSTED worst-value player (valueDelta −28, peer pool 1) is BLOCKED
  ("D6 trusted-value artifact membership"), while the TRUSTED worst (−14, peer pool 4) goes active.
- **FIREWALL INTACT:** grep — no morale/fame/teamMVP/fanFavoriteEngine import in the 3 designation files;
  `ALBATROSS_NAMED` (−1 fame) has NO live emitter on the designation path (dormant); FF stays blocked.
- Invariants: TRACKER_DB_VERSION 17, KBL_BACKUP_VERSION 2, no new store; True Value read-only (no recompute / oracle
  touch). The 2 extra test files (franchiseTrueValuePreview, franchiseValueInputs) = mechanical fixture updates from
  the trust-flag wiring (all 13 paths reported).
- **BROWSER-PENDING (batched):** an Albatross is named only for a ≥2-MLB-peer player with the worst negative valueDelta
  (untrusted/positive get none); solid red live badge; no morale/salary effect.

**Status:** VERIFIED → committed (branch `codex/franchise-v1-next`, not pushed). **→ NEXT: D8 (award-trust gate).**

---

## D8 — award-trust GATE (promote trustedForAwards/finalWarTrusted to computed; adaptive thresholds) — 2026-06-17 (autonomous overnight, AUTH-4)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Autonomous overnight (AUTH-4; AUTH-1).
The make-or-break award-trust gate → audit determinism + exclusions + the D8/D9 boundary HARDEST. Map:
`wf_6babf91f-7d4` (5 readers, Captain file:line-verified).

**THE CUT (held firm):** D8 is the GATE ONLY — computed trust booleans + a written contract + an adaptive
award-qualifier helper + tests. **D8 STORES NOTHING** (no IndexedDB store, no TRACKER_DB_VERSION bump, no
KBL_BACKUP_VERSION change). The awards engine/storage/UI/stored-winners + mwar retirement are D9 (greenfield-confirmed:
0 files). "Deterministic stored winners" = the OUTCOME D8's gate guarantees for D9, not a D8 deliverable.

**CAPTAIN DEFAULTS (AUTH-4, documented, JK-overridable):**
1. **Award trust REQUIRES `artifact.frozen === true`** (not just membership) — the determinism tightening. The
   artifact re-persists every game until frozen (processCompletedGame:227); existing D6/D7 reads ignore `frozen`.
   Awards are season-end finalized → reading a drifting artifact makes "deterministic" a lie. Award trust =
   preview-only until frozen, trusted after. Stricter than D7 designation readiness — flagged for JK.
2. **"NOT a boolean flip":** the booleans = `Boolean(frozen && trusted-member && thresholdsProven)`, proven by a
   mutation-honest test that they stay FALSE when unfrozen/ungated.
3. **Exclusions inherited:** score-only/hidden-FARM/<2-peer are already baked into `trustedPlayerIds` — gate on
   `isPlayerTrustedForValue`; never build a separate candidate set.
4. **Thresholds = STRUCTURE not magnitudes:** author the `awardQualifierThresholds(config)` helper via
   `scaledThreshold` (baselines 502 PA / 162 IP, scaled — no raw 162/9 in gating); magnitudes sim-tunable (§16). D9
   applies it per-player.
5. **Leave the season-summary manifest to D10** (don't touch `awardsImplemented`/version); its blocker wording going
   slightly stale is acceptable.

**GOAL:** promote `trustedForAwards`/`finalWarTrusted`/`consumerThresholdsProven` (literal-false in
franchiseAnalyticsTrust.ts) to COMPUTED booleans gated on the D6 FROZEN artifact + value trust + adaptive thresholds;
flip the downstream awards consumer from hardcoded 'preview-only' to computed; author the qualifier helper + the
written contract + tests.

**ALLOWED:** `franchiseValueInputs.ts` (capture artifact.frozen; promote per-row `warConsumerTrust.awards` =
membership && frozen; surface scope-level frozen on the report) · `franchiseAnalyticsTrust.ts` (widen the 3 literal
types → boolean; `hasAwardTrust` helper; compute finalWarTrusted/trustedForAwards/consumerThresholdsProven; flip the
downstream awards status) · NEW `franchiseAwardTrust.ts` (or extend franchiseAdaptiveStandards.ts) award-qualifier
helper via scaledThreshold · NEW `spec-docs/AWARD_TRUST_CONTRACT.md` · tests (frozen-required / promoted / exclusions
/ adaptive-scaling; update the existing award-trust pinning test).

**DO NOT:** franchiseAwardsEngine/Storage/AwardsWatchlist/stored winners/per-game recompute (D9) · new store /
TRACKER_DB_VERSION (17) / KBL_BACKUP_VERSION (2) · franchiseSeasonSummaryStorage policyFlags/version (D10) · mwar
retirement (D9) · other Phase-2 trust flags · break the narrative characterized test · raw 162/9 in award gating.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · full suite within the 3 characterized fails (no new reds) ·
grep: no new store, TRACKER_DB_VERSION 17, KBL_BACKUP_VERSION 2, no raw 162/9 in award gating, no franchiseAwards*
file created.

**STOP IF:** out-of-ALLOWED edit; must build the awards engine/store to compile; new store/version bump needed;
promotion breaks the narrative characterized test.

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited.

**Status:** contract issued; Codex invoked (under 30-min watchdog).

### D8-AUDIT + EXECUTION RECORD (2026-06-17, autonomous overnight AUTH-4)

**ROUTE actual:** Codex (high, background `codex exec` under watchdog) BUILT → Opus 4.8 (Captain) independent AUDIT
(auditor ≠ builder). Build clean.

**AUDIT VERDICT: CONFORMS / VERIFIED.** Independent re-verification (Opus — re-ran):
- Diff = 2 product (`franchiseValueInputs.ts`: capture `trustedValueArtifactFrozen`, widen `awards`→boolean, set
  `awards = trustedForTrueValue && frozen`; `franchiseAnalyticsTrust.ts`: widen 3 literal types→boolean, `hasAwardTrust`,
  `finalWarTrusted = Boolean(frozen && trueValueTrust)`, `trustedForAwards = Boolean(finalWarTrusted &&
  consumerThresholdsProven && hasAwardTrust)`, `consumerThresholdsProven = metadata present`, computed downstream
  awards status) + 2 NEW (`franchiseAwardTrust.ts` qualifier helper via scaledThreshold; `AWARD_TRUST_CONTRACT.md`) +
  tests. The 7 other test files = identical mechanical fixture additions (`trustedValueArtifactFrozen: false`,
  required by the new report field) — the narrative characterized test got ONLY that, no assertion change.
- `tsc --noEmit` 0 (Opus) · `npm run build` success (Opus) · full suite **7,263 pass / 3 fail (7,266 total)** = EXACTLY
  the characterized set, ZERO new reds; the narrative "preview-only" RED unchanged (frozen gate keeps its unfrozen
  fixture preview-only — baseline preserved).
- **FROZEN-GATE DETERMINISM MUTATION-PROVEN:** dropping `report.trustedValueArtifactFrozen &&` from finalWarTrusted
  turns the "keep awards preview-only when unfrozen" test RED. Tests pin the gate both sides (false-when-unfrozen +
  true-when-frozen+trusted+thresholds) + exclusions (score-only/hidden-FARM/sub-peer → no award trust).
- **BOUNDARY HELD:** trackerDb/backupRestore/franchiseSeasonSummaryStorage/mwarCalculator UNTOUCHED; no
  franchiseAwardsEngine/Storage/AwardsWatchlist created; no new store; TRACKER_DB_VERSION 17; KBL_BACKUP_VERSION 2;
  no raw 162/9 in award gating (only the named scaled `QUALIFIED_IP_BASELINE`); other Phase-2 flags stay false.
- **BROWSER-PENDING (batched):** on real franchise data, awards stay preview-only until the season-end freeze, then
  the analytics truth-map shows award trust 'trusted' (no winners yet — D9).

**Status:** VERIFIED → committed (branch `codex/franchise-v1-next`, not pushed). **→ NEXT: D9 (real awards engine + MOY-1..7 + LSD-1 seams).**

---

## D9a — awards PERSISTENCE spine (2 new dark stores + v18 migration + backup-parity lockstep) — 2026-06-17 (autonomous overnight, AUTH-4)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Autonomous overnight (AUTH-4; AUTH-1).
**PERSISTENCE / DATA-SHAPE — the highest-risk category; audit HARDEST.** Map: `wf_1a49cc24-8d7` (5 readers,
Captain-verified). D9 split into D9a (persistence) → D9b (WAR-category engine) → D9c (MOY + mwar retirement) → D9d
(UI/recompute/finalize). **D9a = the pure DARK-STORE diff** (D6a precedent: ship the store separately from the writer).

**SCOPE:** two NEW IndexedDB stores at trackerDb **v17→v18** + the full backup-parity lockstep + storage CRUD + row
TYPES with the LSD-1 fame-ready seam fields baked in (dark — no engine writes them in D9a):
- **franchiseAwardsRows** keyPath `[franchiseId,seasonId,statsScopeId,category]` + `by_scope` index; row carries the
  LSD-1 seams: `candidates[]` w/ marginToWinner (SEAM-1), `goldGloveSplit{fWar,totalWar}` (SEAM-2), nullable
  `voteWeight` (SEAM-3), reserved KK/Bust/Comeback categories (SEAM-4), `winnerPlayerId`/`finalized`/`computedAt`.
- **franchiseTrueValueSnapshots** keyPath `[franchiseId,seasonId,statsScopeId,playerId,checkpoint]` + `by_scope` index
  (SEAM-4/C5 trough history, dark; the game-1 capture write is D9c).

**CAPTAIN DEFAULTS (AUTH-4):** v18 (spec's "v16" is stale — DB already v17); BOTH stores `optional:true` in
backupRestore (so pre-D9 v2 backups still restore — don't brick them); KBL_BACKUP_VERSION stays 2; storage modules
delegate to `getTrackerDb()` (NO own onupgradeneeded — avoids the SIM-hang); seam fields nullable/empty (L12 additive).

**ALLOWED:** trackerDb.ts (v18 + 2 createObjectStore blocks) · backupRestore.ts (register both + pin 18 + optional:true)
· syncConfig.ts (both keyPaths) · NEW franchiseAwardsStorage.ts (+ snapshots module): types + CRUD via getTrackerDb,
dark · tests: parity round-trip extended for both stores + **the PROVEN TRAP** `franchiseSeasonLedgerStorage.test.ts`
(hardcoded `.toBe(17)`→18 + add both store names to the store-list) + franchiseSaveSlotManifest coverage + unit
round-trips.

**DO NOT:** the awards ENGINE / MOY / AwardsWatchlist UI / per-game recompute / season-end finalize / any real writer
(D9b/c/d — stores are DARK) · D6 artifact/TV recompute/oracle · offseason (AwardsCeremonyFlow/offseasonStorage/
mwarCalculator/the flag) · KBL_BACKUP_VERSION · own onupgradeneeded · fame/morale wiring.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · parity-guard GREEN with both new stores · round-trip
(seed→export→wipe→restore) for both · FULL suite = only the 3 characterized fails (ZERO new reds — the net that
catches the pin trap) · grep: TRACKER_DB_VERSION 18, pin 18, KBL_BACKUP_VERSION 2, both stores in trackerDb +
backupRestore + syncConfig.

**STOP IF:** storage module needs its own DB connection; parity/round-trip can't go green in 2 tries; an
engine/UI/offseason edit becomes necessary; a pre-D9 backup would break (fix = optional:true, don't widen scope).

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — this is a data-shape migration; get the
trackerDb↔backupRestore lockstep exact.

**Status:** contract issued; Codex invoked (under 30-min watchdog).

### D9a-AUDIT + EXECUTION RECORD (2026-06-17, autonomous overnight AUTH-4)

**ROUTE actual:** Codex (high, background `codex exec` under watchdog) BUILT → Opus 4.8 (Captain) RIGOROUS independent
AUDIT (auditor ≠ builder; data-shape migration → audited hardest). Build clean.

**AUDIT VERDICT: CONFORMS / VERIFIED.** Independent re-verification (Opus — re-ran):
- Diff = 6 edited (trackerDb +23, backupRestore +12, syncConfig +2, 3 lockstep tests) + 4 NEW (2 storage modules +
  2 module tests). **Migration lockstep BYTE-PERFECT:** trackerDb v17→18 + 2 idempotent createObjectStore blocks;
  backupRestore registers BOTH (keyPath+`by_scope` index byte-mirroring trackerDb, `optional:true`) + pin 17→18;
  syncConfig both keyPaths — all 3 places, both stores. KBL_BACKUP_VERSION stays 2.
- **THE PROVEN PIN-TRAP HANDLED:** `franchiseSeasonLedgerStorage.test.ts` `toBe(17)`→`18` + both store names added to
  the sorted `expectedTrackerStores` (the exact omission that broke v15→v17, commit 8ba0538).
- `tsc --noEmit` 0 (Opus) · `npm run build` success (Opus) · full suite **7,271 pass / 3 fail (7,274 total)** =
  EXACTLY the characterized set, ZERO new reds.
- **Round-trip PROVES keyPath fidelity:** seeds both stores → export (both present) → wipe → restore → read back by
  exact composite key (`toEqual`). The D2 structural parity-guard stays GREEN with both new stores.
- `franchiseAwardRow` type carries ALL LSD-1 seams (candidates+`marginToWinner` / `goldGloveSplit` / nullable
  `voteWeight` / reserved KK/Comeback/Bust categories) so D9b/c + L12 fame are additive. Both modules delegate to
  `getTrackerDb()` (no own onupgradeneeded → no SIM-hang). `optional:true` → pre-D9 backups don't break.
- **DARK confirmed:** grep shows ZERO engine/recompute writers of either store outside the storage modules/schema
  files — the writers are D9b/c/d. No D6 artifact/TV/oracle/offseason/flag touch.

**Status:** VERIFIED → committed (branch `codex/franchise-v1-next`, not pushed). **→ NEXT: D9b (5 WAR-category engine off the frozen artifact).**

---

## D9b — the 5 WAR-category awards ENGINE (compute + persist deterministic winners) — 2026-06-17 (autonomous overnight, AUTH-4)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Autonomous overnight (AUTH-4; AUTH-1).
Determinism off the FROZEN spine is the make-or-break property. Grounding: the D9 map `wf_1a49cc24-8d7`.

**SCOPE:** NEW `franchiseAwardsEngine.ts` (src/utils/) computing the 5 WAR-derived categories — MVP=`totalWar` /
CY_YOUNG=`pitchingWar` / ROOKIE_OF_YEAR=top `totalWar` among `rookiePlayerIds` (= careerStorage.seasonsPlayed===0,
Captain default) / GOLD_GLOVE=`fieldingWar` (+persist the `goldGloveSplit{fWar,totalWar}` seam) / SILVER_SLUGGER=
`battingWar`. A PURE `computeFranchiseWarAwards(input)` (winner + ALL candidates + marginToWinner per category; no I/O)
+ `computeAndPersistFranchiseWarAwards(scope)` (loads frozen artifact + frozen TV rows + value rows + D8 report +
rookie set → runs engine → writes `franchiseAwardsRows` finalized:true). MOY=D9c; UI/trigger/per-game recompute=D9d.

**ELIGIBILITY (consume D8+D6, never recompute):** `trustedForAwards===true` (else no winners) AND
`isPlayerTrustedForValue(frozenArtifact, id)` (inherits score-only/hidden-FARM/<2-peer exclusions) AND the adaptive
qualifier (`awardQualifierThresholds(config)` minPA/minIP — no raw 162/9). Ranking quantities from the FROZEN TV rows
+ `warPreviewValues`; deterministic tie-break (score, then playerId).

**CAPTAIN DEFAULTS (AUTH-4):** RoY rookie = careerStorage.seasonsPlayed===0 (input `rookiePlayerIds` set; no new
field); the engine is a pure fn + a directly-callable persist fn — NOT wired to a trigger/UI in D9b (D9d wires it),
the D9a-dark-store precedent; reserved KK/Comeback/Bust NOT emitted; voteWeight stays null; NO defensive-fame blend
(Phase-2).

**ALLOWED:** NEW `src/utils/franchiseAwardsEngine.ts` + its test. (Reads existing builders/storage read-only; writes
only the D9a `franchiseAwardsRows` via its storage.)

**DO NOT:** MOY (D9c) · wire processCompletedGame/FranchiseHome/UI/trigger (D9d) · recompute True Value / oracle /
the D6 freeze write · offseason (AwardsCeremonyFlow/offseasonStorage/mwarCalculator/flag) · fame blend · new store /
TRACKER_DB_VERSION (18) / KBL_BACKUP_VERSION (2) · raw 162/9.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · FULL suite = only the 3 characterized fails (zero new reds) ·
new engine tests: determinism MUTATION-KILL (perturb a live row → winners unchanged), exclusions, qualifier scaling,
trust-gate-off → no winners, RoY rookie, GG split, persist round-trip · grep: no TV recompute in the engine, no
processCompletedGame/FranchiseHome edit, no raw 162/9.

**STOP IF:** must recompute TV / read a non-frozen source to rank; must wire a trigger/UI to be testable; out-of-ALLOWED edit.

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited.

**Status:** contract issued; Codex invoked (under 30-min watchdog).

### D9b-AUDIT + EXECUTION RECORD (2026-06-17, autonomous overnight AUTH-4)

**ROUTE actual:** Codex (high, background `codex exec` under watchdog) BUILT → Opus 4.8 (Captain) independent AUDIT
(auditor ≠ builder). Build clean.

**AUDIT VERDICT: CONFORMS / VERIFIED.** Independent re-verification (Opus — re-ran):
- Diff = 2 NEW files only (`franchiseAwardsEngine.ts` + test); ZERO edits to existing files (additive, dark). Pure
  `computeFranchiseWarAwards` gates on `trustedForAwards && artifact.frozen===true` → []; 5 categories (MVP=totalWar /
  CY_YOUNG=pitchingWar / ROOKIE_OF_YEAR=top totalWar ∩ rookiePlayerIds / GOLD_GLOVE=fieldingWar +goldGloveSplit seam /
  SILVER_SLUGGER=battingWar); eligibility = `isPlayerTrustedForValue(frozen)` + finite score + adaptive PA/IP qualifier;
  deterministic sort (score, frozen trueValue, playerId); candidate margins (score−winnerScore); voteWeight null;
  reserved KK/Comeback/Bust NOT emitted. `computeAndPersistFranchiseWarAwards` loads frozen artifact + frozen TV rows +
  D8 report + rookie set (careerStorage.seasonsPlayed===0) → writes `franchiseAwardsRows` finalized:true.
- `tsc --noEmit` 0 (Opus) · `npm run build` success (Opus) · full suite **7,277 pass / 3 fail (7,280 total)** = EXACTLY
  the characterized set, ZERO new reds.
- **DETERMINISM MUTATION-KILL:** a 99-WAR UNTRUSTED "live-only" row (not in trustedPlayerIds) does NOT win (membership
  gate); mutating non-ranking fields of a trusted row → winners byte-identical (`toEqual`). **Adaptive qualifier
  SCALES:** a sub-PA player excluded at a 32-game season WINS MVP at a 16-game season (no hardcoded 162/9). Plus
  exclusions / trust-off→[] / RoY rookie-set / GG split / persist round-trip into the D9a store.
- **INVARIANTS (Opus grep):** no `calculateAndPersistFranchiseTrueValueForSeason` in the engine (never recomputes TV);
  no processCompletedGame/FranchiseHome edit; no raw 162/9; engine has ZERO app callers (DARK — D9d wires the
  trigger/UI); TRACKER_DB_VERSION 18; KBL_BACKUP_VERSION 2.
- NOTE (minor, for JK): the engine ranks WAR awards on `warPreviewValues` (season-final WAR) gated by frozen
  membership — correct + deterministic at finalize (season over). Freezing raw WAR is out of D9 scope.

**Status:** VERIFIED → committed (branch `codex/franchise-v1-next`, not pushed). **→ NEXT: D9c (MOY: season-aggregate pogAwards + record=wins-above-D6-expectation + retire mwarCalculator/calculateMOYVotes).**

---

## D9c — Manager of the Year (the 6th award category, MOY-1..7) — 2026-06-17 (autonomous overnight, AUTH-4)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Autonomous overnight (AUTH-4; AUTH-1).
The record term must be a deterministic function of the FROZEN artifact + standings. Map: `wf_0cec26a0-9be` (5 readers,
Captain file:line-verified).

**SCOPE:** extend `franchiseAwardsEngine.ts` with MANAGER_OF_YEAR — a SEASON AGGREGATION of the live per-game
`pogAwards.PogManagerValueTotal` (NOT a parallel engine). Read `getRecentGames(1000,{franchiseId,seasonId,statsScopeId})`
→ group `managerWpaTotals` by `managerId` → sum tactical/deployment/lineup. 4th input = **record = wins-above-D6-
expectation**: actual from `calculateStandings`, expected DERIVED from the frozen artifact (FORK-A: `valueShare ×
gamesPerTeam`, team value = Σ frozen `trueValue` over `trustedPlayerIds` via the frozen `rosterStateSnapshot.teamId`).
Pool-normalize all 4 (min-max [0,1], `scaleToRange` mirror, degenerate→0.5) then equal 0.25 placeholder weights
(sim-deferred). Emit the MOY row (winnerPlayerId = managerId; voteWeight null; persist actual/expected for
reproducibility). Fold into `computeAndPersistFranchiseWarAwards` (one finalize, all 6 categories). Gate = the same D8
`trustedForAwards && frozen`. No fame tilt (MOY-4).

**CAPTAIN DEFAULTS (AUTH-4):** expected-wins = FORK-A value-share model (denomination-free, .500-anchored, sim-tunable;
NO trusted expected-wins source exists, preview is `expectedWinsTrusted:false`) · team map = frozen rosterStateSnapshot
(not live currentTeamId) · lineup input = capped realized record (MOY-2) · min-max norm + equal 0.25 weights (MOY-6/7
sim-deferred) · **mwarCalculator/calculateMOYVotes retirement DEFERRED to a cleanup ticket** (SAFE — both call sites
triple-gated behind the false offseason flag; D9c does NOT touch them) · persist actual/expected wins on the row for
determinism (standings read live).

**ALLOWED:** `franchiseAwardsEngine.ts` (+ additive MOY fields on the `franchiseAwardsStorage` row type if needed —
no new store, no version bump, D2 parity stays green) + its test.

**DO NOT:** mwarCalculator/calculateMOYVotes/AwardsCeremonyFlow/RatingsAdjustmentFlow (deferred retirement) · flip the
offseason flag · season-end TRIGGER / UI / per-game recompute (D9d) · recompute TV / oracle · use
franchiseExpectedWinsPreview (untrusted) · fame tilt · new store / TRACKER_DB_VERSION (18) / KBL_BACKUP_VERSION (2) ·
raw 162/9.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · FULL suite = only the 3 characterized fails (zero new reds);
D9a parity/round-trip green · MOY tests (aggregation / record-term-off-frozen / determinism / pool-norm + degenerate
guard / trust-off→no-MOY / persist 6 categories) · grep: no mwar/Flow edit, no expected-wins-preview import, no TV
recompute, versions unchanged.

**STOP IF:** must touch mwar/the Flows to compile; must recompute TV or use the untrusted preview; new store/version
bump needed; the record term lacks a deterministic frozen-spine derivation.

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited.

**Status:** contract issued; Codex invoked (under 30-min watchdog).

### D9c-AUDIT + EXECUTION RECORD (2026-06-17, autonomous overnight AUTH-4)

**ROUTE actual:** Codex (high, background `codex exec` under watchdog) BUILT → Opus 4.8 (Captain) independent AUDIT
(auditor ≠ builder). Build clean.

**AUDIT VERDICT: CONFORMS / VERIFIED → the 6-category awards engine is COMPLETE.** Independent re-verification (Opus):
- Diff = `franchiseAwardsEngine.ts` (+269: MANAGER_OF_YEAR — season-aggregate `managerWpaTotals` via
  `getRecentGames(1000)`; `managerRecordTermByTeam` = FORK-A expected wins from the frozen artifact
  [`rosterStateSnapshot` team-map + `trustedPlayerIds` + frozen `trueValue`] × gamesPerTeam, record = actual−expected;
  min-max pool-norm with `max===min→0.5`; equal 0.25 sim-gate weights; folded into `computeAndPersistFranchiseWarAwards`
  → all 6 categories finalized) + `franchiseAwardsStorage.ts` (+2 additive nullable `managerActualWins`/
  `managerExpectedWins`) + test (+276).
- `tsc --noEmit` 0 (Opus) · `npm run build` success (Opus) · full suite **7,281 pass / 3 fail (7,284 total)** = EXACTLY
  characterized, ZERO new reds; **the D9a parity round-trip survived the additive row fields** (no store/version bump).
- **RECORD-TERM DETERMINISM MUTATION-PROVEN:** perturbing a non-frozen `trueValue` (999→1,000,000) leaves the MOY
  winner + margins byte-identical (`perturbed.toEqual(award)`) — the record reads ONLY the frozen/trusted spine. Plus
  degenerate-pool midpoint (0.5), trust-off→null, aggregation/null-guard, 6-category persist.
- **INVARIANTS (Opus grep):** mwarCalculator / AwardsCeremonyFlow / RatingsAdjustmentFlow UNTOUCHED (retirement
  deferred — safe, triple-gated behind the false offseason flag); no `currentTeamId` in the engine (frozen snapshot
  only); no `franchiseExpectedWinsPreview`; no TV recompute; offseason flag untouched; TRACKER_DB_VERSION 18,
  KBL_BACKUP_VERSION 2.

**Status:** VERIFIED → committed (branch `codex/franchise-v1-next`, not pushed). **→ NEXT: D9d (AwardsWatchlist UI + per-game watchlist recompute + game-1 snapshot capture + season-end finalize TRIGGER + display) — completes D9.**

---

## D9d-1 — wire the awards engine to the app (season-end finalize TRIGGER + game-1 snapshot capture) — 2026-06-17 (autonomous overnight, AUTH-4)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Autonomous overnight (AUTH-4; AUTH-1).
Touches the LIVE GAME PATH (snapshot capture) → browser-batch. Map: `wf_c235f00a-95e` (5 readers, Captain-verified).

**D9d SPLIT:** D9d-1 (THIS) = backend engine→app wiring (finalize trigger + per-game snapshot capture); D9d-2 = UI
(AwardsWatchlist tab + per-game watchlist preview [the looser `warLikePreviewAvailable` path — the pure engine returns
[] mid-season by design] + the season-summary manifest flip + profile/Almanac display via awardEmblems).

**SCOPE:** (1) `processCompletedGame.ts`: surface `result.rows` from `persistTrueValueAfterWar`; in the post-WAR block
(after a non-null `trueValueScope`) write `franchiseTrueValueSnapshots` rows (per TV row: trueValue/valueDelta/
warPercentile/computedAt), **checkpoint = scheduled gameNumber (via scheduleGameId) ?? gameState.gameId** (deterministic
→ idempotent put), ONE batched call, try/catch-isolated (non-blocking, never trips the 10s timeout), regular-season
gate inherited. (2) `FranchiseHome.tsx` GameDayContent: in `checkSeasonComplete`, AFTER the awaited freeze + before
setSeasonComplete, `await computeAndPersistFranchiseWarAwards({...scope, seasonNumber: currentSeason, computedAt:
frozen.frozenAt→ISO})` (byte-stable); in the `isSeasonOver` effect, CHAIN finalize via `.then` on the freeze (NOT a
parallel `void` — would race ahead + persist []).

**CAPTAIN DEFAULTS (AUTH-4):** checkpoint = scheduled gameNumber ?? gameId (no counter/timestamp) · computedAt =
frozenAt (byte-stable re-fires) · finalize via the awaited checkSeasonComplete + the chained effect path (mirrors D6b
both-paths) · snapshot try/catch-isolated · manifest flip + UI = D9d-2 (the manifest has a contract-version/test-pin
coordination that pairs with the handoff).

**ALLOWED:** `processCompletedGame.ts` (surface rows + snapshot capture) · `franchiseAwardsEngine`/`persistTrueValueAfterWar`
return-shape (additive) · `FranchiseHome.tsx` (finalize trigger, 2 paths) · a processCompletedGame snapshot test.

**DO NOT:** AwardsWatchlist UI / per-game watchlist preview / manifest flip / display (D9d-2) · offseason flag /
AwardsCeremonyFlow / offseasonStorage · recompute TV / oracle · persist award rows mid-season (snapshot-only per game)
· new store / TRACKER_DB_VERSION (18) / KBL_BACKUP_VERSION (2) · non-deterministic checkpoint.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · FULL suite = only the 3 characterized fails (zero new reds);
snapshot test (per-game write + idempotent re-completion + regular-season-only + failure-isolated); FranchiseHome +
processCompletedGame tests green · grep: no UI/manifest/flag edit, checkpoint from gameId/gameNumber, versions unchanged.

**STOP IF:** finalize could run before freeze resolves on any path; checkpoint can't be deterministic; must touch
UI/manifest to compile; new store/version bump needed.

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited.

**Status:** contract issued; Codex invoked (under 30-min watchdog).

### D9d-1-AUDIT + EXECUTION RECORD (2026-06-17, autonomous overnight AUTH-4)

**ROUTE actual:** Codex (high, background `codex exec` under watchdog) BUILT → Opus 4.8 (Captain) independent AUDIT
(auditor ≠ builder). Build clean.

**AUDIT VERDICT: CONFORMS / VERIFIED.** Independent re-verification (Opus — re-ran):
- Diff = `FranchiseHome.tsx` (+26: finalize trigger, both season-complete paths) + `processCompletedGame.ts` (+70:
  surface `persistTrueValueAfterWar` rows + the snapshot capture) + the trueValue test mock update + a NEW
  `processCompletedGame.trueValueSnapshots.test.ts`.
- **FREEZE→FINALIZE ORDERING correct on BOTH paths:** `checkSeasonComplete` awaits freeze → captures `frozen` → awaits
  `computeAndPersistFranchiseWarAwards` (before setSeasonComplete); the `isSeasonOver` effect CHAINS finalize via
  `.then((frozen)=>…)` on the freeze (NOT a parallel `void` — no race). Both pass `computedAt = frozen.frozenAt→ISO`
  (byte-stable re-fires). Inside the existing `franchiseId` guards; lands in GameDayContent.
- **SNAPSHOT CAPTURE:** deterministic checkpoint = scheduled `gameNumber` (via scheduleGameId→getScheduledGame) ??
  `gameState.gameId` (no counter/timestamp → idempotent put); one batched `saveFranchiseTrueValueSnapshotRows`; OWN
  try/catch (`[TrueValueSnapshots]` warn, non-blocking — never trips the 10s timeout); runs only on non-null
  trueValueScope, inside the regular-season `shouldAggregateToRegularSeasonStats` gate.
- `tsc --noEmit` 0 (Opus) · `npm run build` success (Opus) · full suite **7,285 pass / 3 fail (7,288 total)** = EXACTLY
  characterized, ZERO new reds. Snapshot test (write+readback / re-completion idempotency / playoff+elimination
  exclusion / failure-isolation) passes.
- **INVARIANTS:** no AwardsWatchlist/manifest/offseason-flag edit; no mid-season award-row write (snapshot-only per
  game); TRACKER_DB_VERSION 18, KBL_BACKUP_VERSION 2.
- **BROWSER-PENDING (batched, LIVE GAME PATH):** finishing a regular season → the 6 awards finalize + persist; each
  completed game captures a franchiseTrueValueSnapshots checkpoint; no game-completion regression.

**Status:** VERIFIED → committed (branch `codex/franchise-v1-next`, not pushed). **→ NEXT: D9d-2 (AwardsWatchlist UI + per-game watchlist preview + manifest flip + display) — completes D9.**

---

## D9d-2 — the awards UI (AwardsWatchlist + on-read preview + manifest flip) → completes D9 — 2026-06-17 (autonomous overnight, AUTH-4)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Autonomous overnight (AUTH-4; AUTH-1).
USER-VISIBLE surface → browser-batch. Grounding: the D9d map `wf_c235f00a-95e` (areas 3-4). Contracted directly (no
new map). Per-player profile/Almanac award display = a documented FOLLOW-UP (kept out to keep D9d-2 a contained,
browser-verifiable surface).

**SCOPE:** (1) NEW `AwardsWatchlist.tsx` — a Mode-2 regular+playoff tab in FranchiseHome (TabType + both tab arrays +
render branch, mirroring StandingsContent), reads `getFranchiseAwardRowsByScope`, renders the 6 categories + winner +
candidate margins via the orphaned `awardEmblems.ts` catalog (resolve player/manager NAMES — rows carry only ids; MOY
id = managerId); shows finalized awards when present, else the in-season PREVIEW labeled "Projected". (2) a read-only
`computeFranchiseAwardsPreview` in the engine (looser `warLikePreviewAvailable` gate, `finalized:false`, NEVER
persisted — the pure finalized engine returns [] mid-season by design). (3) the manifest flip in
`franchiseSeasonSummaryStorage` (awards-watchlists blocked→included + awardsImplemented, GATED on award rows existing;
bump the stale `'…no-awards-manifest-v1'` contractVersion; update the `franchiseSeasonSummary.wave4` test pin).

**CAPTAIN DEFAULTS (AUTH-4):** AwardsWatchlist is a NEW Mode-2 surface, fully separate from the dead-gated offseason
`AwardsCeremonyFlow` (NO flag flip) · in-season preview = looser-gate read-only, never a mid-season store write ·
manifest flip gated on rows existing (not blind) + contractVersion coordinated + the wave4 test updated (sanctioned
baseline shift) · profile/Almanac per-player award display = FOLLOW-UP (not D9d-2) · SeasonSummary PAGE = D10.

**ALLOWED:** NEW `AwardsWatchlist.tsx` · `franchiseAwardsEngine.ts` (the read-only preview fn) · `FranchiseHome.tsx`
(tab mount) · `franchiseSeasonSummaryStorage.ts` (manifest flip + version) · the wave4 test + new AwardsWatchlist/
preview tests.

**DO NOT:** offseason flag / AwardsCeremonyFlow / offseasonStorage · write franchiseAwardsRows from UI/mid-season ·
recompute TV / oracle · new store / TRACKER_DB_VERSION (18) / KBL_BACKUP_VERSION (2) · SeasonSummary PAGE / D10 copy ·
the per-player profile/Almanac display (follow-up) · break the 3 characterized tests (the wave4 manifest test is the
ONE sanctioned update).

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · FULL suite = only the 3 characterized fails (+ the updated
wave4 passes); AwardsWatchlist render test (finalized + preview states, no store write) + preview-fn test · grep: no
offseason-flag edit, no mid-season award write, versions unchanged.

**STOP IF:** must flip the flag / touch AwardsCeremonyFlow to mount; the preview needs recomputing/freezing TV; the
manifest flip needs a store/version bump; the contractVersion rename ripples beyond the wave4 test.

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited.

**Status:** VERIFIED + COMMITTED `c229733` (2026-06-17) → **D9 COMPLETE**.

**AUDIT + EXECUTION RECORD (Opus 4.8, auditor ≠ builder):** Independently re-ran every gate — tsc `--noEmit` 0 ·
`npm run build` exit 0 · FULL `vitest run` **7,288 pass / 3 characterized fail (7,291 total, 406 files)**, the fails
being exactly the documented trio (wpaRuntimeBoundary / franchiseManualSmokeFixture / franchiseNarrativeEventEligibility),
ZERO new reds. Read the diff + grepped invariants: (1) `AwardsWatchlist.tsx` is read-only — NO `franchiseAwardsRows`
write, reads `getFranchiseAwardRowsByScope` + `computeFranchiseAwardsPreview` only, and has NO `AwardsCeremonyFlow` /
offseason-flag reference; (2) the FranchiseHome tab mount renders behind `activeTab === "awards" && seasonPhase !==
"offseason"` (a Mode-2 surface, separate from the dead-gated offseason ceremony) — the offseason flag/ceremony render
is UNTOUCHED in the diff; (3) `computeFranchiseAwardsPreview` gates on the looser `warLikePreviewAvailable`, stamps
`finalized:false`, is never called by `computeAndPersistFranchiseWarAwards`, and never persists — the frozen-gated
finalize path is byte-unchanged; (4) the manifest flip is gated on `finalizedAwardRows.length > 0` (included when
present, blocked when absent) with the contractVersion bumped off the stale `…no-awards-manifest-v1` →
`franchise-season-summary-v2-awards-manifest-v1`, and the wave4 pin updated as a sanctioned baseline shift PLUS a new
"keeps awards blocked when rows absent" case (mutation-honest, both sides covered); (5) TRACKER_DB_VERSION 18 /
KBL_BACKUP_VERSION 2 unchanged, no new store. Committed the 7 code/test files via explicit-path staging (docs held for
the session-end docs commit). **D9 COMPLETE.** USER-VISIBLE → JK browser sign-off batched (the sole real-world
acceptance gate). Tracked D9 follow-ups: per-player profile/Almanac award display; the mwarCalculator/calculateMOYVotes
retirement (pre-flag-flip cleanup).

---

## D10 — finalize the Mode-2 season-summary/manifest WITH league awards (supersedes the no-awards 1.10A stopgap) — 2026-06-17 (attended session, JK present)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Attended (JK present). USER-VISIBLE
surface → browser-batch. Grounding: D10 map `wf_4e882441-17c` (5 mappers). **RE-SCOPED per the 2026-06-17 DESIG-RECON
ruling (DECISIONS_LOG): D10 = LEAGUE awards only on the season-summary page; TEAM designations (MVP/Ace/Albatross/Fan
Favorite/Captain/Fan Hopeful) are a SEPARATE team-hub ticket and are NOT displayed here.** D9d-2 already made the
storage manifest awards-aware; D10 is the PAGE + the manifest designation-count canonical-source fix.

**SCOPE:**
1. **SeasonSummary.tsx — render finalized LEAGUE awards inline by REUSING the existing `<AwardsWatchlist>` component**
   (it already reads `getFranchiseAwardRowsByScope` by scope, resolves player/manager names — rows carry only ids; MOY
   id = managerId — handles the gold-glove split + the finalized→preview fallback). Mount it in the Awards Status
   section passing `{franchiseId, seasonId, statsScopeId: seasonId, seasonNumber}`. Ensure the awards render is NOT
   gated behind `if (persistedSummary) return null` (the map flagged that at :331) so a finalized season actually
   shows its awards. Keep the existing live WAR-leader preview ONLY as the no-AwardsWatchlist-rows fallback — do NOT
   double-render finalized winners + WAR previews.
2. **Rewrite the stale "no-awards" PAGE copy:** the Awards Status disclaimer (:746-748 "Internal v1 does not finalize
   MVP, Cy Young, Gold Glove… read-only stat leader previews"); the manifest section title/labels "Read-only no-awards
   handoff package" (:877) and "No persisted no-awards handoff manifest is available yet." (:919); narrow the "Awards…
   remain blocked" paragraph (:882-885) to the families that ARE still blocked (final True Value, salary movement,
   morale, Mode 3); header doc-comment (:7).
3. **Manifest active-designations CANONICAL-SOURCE FIX:** `countActiveDesignations`
   (franchiseSeasonSummaryStorage.ts:261-280) reads the STALE embedded `player.franchiseDesignations` (self-documented
   non-canonical at franchiseDesignations.ts:460) → repoint to the canonical `getFranchiseDesignationRows({franchiseId,
   seasonId, statsScopeId})` (franchiseDesignationStorage.ts:243), counting ALL `status==='active'` rows (NOT hardcoded
   to TEAM_MVP/ACE — future-proof for the DESIG-RECON expanded set). Fetch the designation rows in
   `buildFranchiseSeasonSummary`'s Promise.all (alongside `awardRows`) and pass into `buildAwardsAwareManifest`. This
   fixes the handoff-manifest COUNT only — it is NOT a user-facing team-designation display (that's the team-hub ticket).
4. **Update the STALE test SeasonSummary.pass5.test.tsx:** contractVersion `…no-awards-manifest-v1`→`…v2-awards-manifest-v1`
   (:158); awards-watchlists fixture blocked→included + awardsImplemented true (:178-197); the page-copy assertions
   "Read-only no-awards handoff package"/"Awards/watchlists are omitted"/"Internal v1 does not finalize…" (:313/:315/:360)
   → the new awards-aware copy; add mocks for AwardsWatchlist's reads (`franchiseAwardsStorage`/`franchiseAwardsEngine`)
   so the render doesn't hit IndexedDB; add a seeded-active-designation case proving the canonical-source count.

**CAPTAIN DEFAULTS (all design decisions already RULED — DECISIONS_LOG 2026-06-17):** summary.awards STAYS a placeholder
(read awards live via AwardsWatchlist; do NOT promote the payload) → wave4:267 + the contractVersion pin stay green, NO
storage-shape change, **NO contractVersion bump** · team designations are NOT displayed on this page (team-hub ticket) —
only the manifest active-designations CATEGORY remains (audit evidence) with the canonical-source COUNT fix · all
still-blocked families stay visibly blocked, no flag flip · AwardsWatchlist reads the AWARDS store by scope (NOT the
season-stats leaders), so the Pass5 "no live stats reads on the persisted path" invariant is preserved — do NOT add live
`getBattingLeaders`/`getPitchingLeaders` calls.

**ALLOWED:** `src/src_figma/app/pages/SeasonSummary.tsx` · `src/utils/franchiseSeasonSummaryStorage.ts` (the
canonical-source designation count + the Promise.all fetch + pass into the manifest builder) ·
`src/src_figma/__tests__/franchiseMode/SeasonSummary.pass5.test.tsx` (update) · OPTIONALLY
`src/src_figma/__tests__/franchiseMode/franchiseSeasonSummary.wave4.test.ts` (ONLY to ADD a seeded-active-designation
case; do NOT change its existing contractVersion/awards pins).

**DO NOT:** promote summary.awards off `placeholder` · bump the manifest contractVersion (stays
`franchise-season-summary-v2-awards-manifest-v1`) · flip the offseason flag / touch `AwardsCeremonyFlow` /
offseasonStorage · loosen any `false` policyFlag or flip a blocked-by-design category (true-value-value-delta, mode3,
morale-relationship, blocked-designation-families) · DISPLAY team designations on this page (team-hub ticket) · touch
the orphaned `franchiseSeasonHandoffPlan.ts` / `franchiseSeasonEndReadiness.ts` (those are the deferred 1.10B contract) ·
add live season-stats leader reads on the persisted path · new store / TRACKER_DB_VERSION (18) / KBL_BACKUP_VERSION (2) ·
any DESIG-RECON change (Albatross guards / FF promote / Captain badge / Fan Hopeful — separate ticket) · the D11 app-wide
preview/READ-ONLY label sweep.

**VERIFICATION (prefix `NODE_ENV= `):** tsc `--noEmit` 0 · `npm run build` exit 0 · FULL `vitest run` = only the 3
characterized fails, ZERO new reds, with the updated **SeasonSummary.pass5** now PASSING its new assertions and **wave4**
still green; grep gates: manifest contractVersion string unchanged, no `player.franchiseDesignations` read remaining in
the manifest path, no offseason-flag edit, summary.awards still `placeholder`, no new `getBattingLeaders`/`getPitchingLeaders`
on the persisted path, handoff/readiness builders untouched, versions unchanged.

**STOP IF:** rendering finalized awards requires promoting summary.awards or bumping contractVersion · the
canonical-source designation fix needs a store/version bump · AwardsWatchlist can't mount without touching the offseason
flag/ceremony · the pass5 update ripples beyond pass5 (+ the optional wave4 seeded-designation case).

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited.

**Status:** VERIFIED + COMMITTED `51e487a` (2026-06-17). USER-VISIBLE → browser-pending.

**AUDIT + EXECUTION RECORD (Opus 4.8, auditor ≠ builder):** Codex (high, background `codex exec` under the 30-min
watchdog) BUILT (exit 0) → Opus independently re-ran every gate (not trusted from the paste): `tsc --noEmit` 0 ·
`npm run build` 0 · FULL `vitest run` **7,289 pass / 3 fail (7,292 total, 406 files)**, the fails being EXACTLY the
characterized trio (wpaRuntimeBoundary / franchiseManualSmokeFixture / franchiseNarrativeEventEligibility), ZERO new
reds; `SeasonSummary.pass5` ✓ (4) + `franchiseSeasonSummary.wave4` ✓ (8). Diff = 4 files (2 product + 2 test), all
within ALLOWED. **Read the diff + grepped invariants:** (1) `SeasonSummary.tsx` mounts `<AwardsWatchlist>` inline
(scope `statsScopeId: seasonId`), demotes the WAR-leader previews to `!persistedSummary` fallback (no double-render),
and the awards render is no longer hidden by the `persistedSummary` placeholder branch; copy de-"no-awards"-ified
(disclaimer, "Read-only awards-aware handoff package", "no persisted awards-aware handoff manifest", blocked-families
paragraph narrowed to True Value / salary / morale / rollover / Mode 3). (2) `franchiseSeasonSummaryStorage.ts`:
`countActiveDesignations` rewritten to count canonical `getFranchiseDesignationRows` rows with `status==='active'`
(all types, future-proof), threaded through the Promise.all (`.catch(()=>[])`) + `buildAwardsAwareManifest`; the
stale `player.franchiseDesignations` reader is GONE. (3) Invariants held: contractVersion still
`franchise-season-summary-v2-awards-manifest-v1` (×2), `summary.awards` still `placeholder`, no offseason-flag /
AwardsCeremonyFlow / handoff-plan / readiness-builder edits, no new persisted-path `getBattingLeaders`/`getPitchingLeaders`,
TRACKER_DB_VERSION 18 / KBL_BACKUP_VERSION 2 unchanged, no new store. (4) Tests mutation-honest + STRENGTHENED: pass5
still asserts the live stats-leaders are NEVER called on the persisted path AND now asserts the finalized MVP winner
renders via `award-winner-MVP`; wave4 adds a canonical-count test (4 active across MVP/ACE/ALBATROSS/FAN_FAVORITE,
projected excluded). The AwardsWatchlist testids/text pass5 depends on pre-exist (component unmodified). **D10
COMPLETE.** USER-VISIBLE → JK browser sign-off batched (sole real-world acceptance gate). **NEXT: the DESIG-RECON
build ticket** (Albatross spec guards / Fan Favorite promote no-floor / Captain badge no-min / Fan Hopeful visible-safe
/ Cornerstone removal / spec reconciliation to MODE_2_V1_FINAL §17 + the team-hub year-end designation display).

---

## DR-1 — designation engine pass: Albatross spec-guards + Fan Favorite promote-to-live + Cornerstone removal — 2026-06-17 (attended)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Attended. Asset-protected (designation
logic) — design RULED in DECISIONS_LOG DESIG-RECON (2026-06-17); this executes to that ruling. Grounding: build map
`wf_9ea0e360-d00` (reader 1). Effects stay DORMANT (no morale/fame mutation) — pure selection/eligibility logic.

**SCOPE (one cohesive engine pass over the designation files):**
1. **ALBATROSS — port the two missing spec guards INLINE** into the live selection (`franchiseDesignations.ts`
   selectLowest ~:426-446) AND mirror them into the eligibility classifier (`franchiseDesignationEligibility.ts`
   rankingBlockers ALBATROSS ~:228-235 + valueDesignationBlockers ~:398-420) for active-promotion parity: (a) **2×
   salary floor** — `salary >= 2 * context.leagueMinimumSalary`; (b) **materiality** — `valueDelta / contractValue
   <= -0.25` (guard `contractValue > 0`). Add an explicit `salary` field to `FranchiseDesignationPlayerInput`
   (thread `row.salary` through `sourceRowFromValueRow`), and a `leagueMinimumSalary` field to
   `FranchiseDesignationContext` set from `salaryCalculator.MIN_SALARY` (import it) at the storage call site
   (`franchiseDesignationStorage.ts` context build ~:343-350). Inline a local `ALBATROSS_UNDERPERFORMANCE_THRESHOLD
   = -0.25` — do NOT import `fanFavoriteEngine` (guard test `franchiseDesignationsPersistence.test.ts:484-485`
   forbids it). Record both gate inputs in the makeRecord sourceInputs/sourceEvidence.
2. **FAN FAVORITE — promote to LIVE, NO salary floor:** add `'FAN_FAVORITE'` to `ACTIVE_PROMOTION_TYPES`
   (`franchiseDesignationStorage.ts:60`); add a `FAN_FAVORITE` entry to `LIVE_DESIGNATION_BADGES`
   (`franchiseDesignations.ts:142-167`, mirror PROJECTED_BADGES.FAN_FAVORITE colors, borderStyle 'solid', status
   'active'); de-gate eligibility — flip the policy-matrix FAN_FAVORITE to active/persistable (~:140-150), remove the
   two morale-block pushes (~:415-418), add `classifyFanFavorite` mirroring `classifyAlbatross` (~:422-451) BUT
   selectHIGHEST **positive** valueDelta and **NO salary floor / NO materiality gate**, seed FAN_FAVORITE into
   `buildRankedCandidates` + rankedScore/rankingBlockers (positive valueDelta), include it in recordFor persistable.
   **ADD `valueTrusted === true` to the FF selection filter** (`franchiseDesignations.ts` selectHighest ~:406-410 —
   it currently lacks it; the ruling keeps the ≥2-peer trust on FF). Keep the morale/fame firewall: FF active
   promotion emits the ephemeral changed-only DesignationEvent like Albatross with moraleMutationApplied/
   relationshipMutationApplied/salaryMovementApplied = false (+2 fame DORMANT).
3. **CORNERSTONE — full removal** from the team-designation system: `franchiseDesignationEligibility.ts` (union :21,
   ALL_DESIGNATION_TYPES :98, policy matrix :185-194, deferredNarrativeBlockers :453/:466-469, limitations :551);
   the blocked-truth UI row `TeamHubContent.tsx:5971`; and the stale stubs in
   `franchiseDesignationMoraleContextAdapter.ts:193`, `franchiseNarrativeEventEligibility.ts:39/:371-372/:402-403`,
   `franchiseDesignationMoraleBridge.ts:395-426/:481-483/:508`. **DO NOT touch `teamMVP.ts` or
   `legacyDynastyTracker.ts`** — their `FRANCHISE_CORNERSTONE` is a SEPARATE FAME legacy tier, NOT the team
   designation.
4. **DELETE the orphan `src/engines/fanFavoriteEngine.ts` + its test** AFTER porting its gates — but FIRST grep-verify
   zero non-test importers; STOP and report if any live importer exists.

**ALLOWED:** `franchiseDesignations.ts` · `franchiseDesignationEligibility.ts` · `franchiseDesignationStorage.ts` ·
the Cornerstone-stub files listed above (Cornerstone-token removal only) · `TeamHubContent.tsx` (ONLY the :5971
blocked-truth Cornerstone removal — NO display-strip work, that's DR-3) · delete `fanFavoriteEngine.ts` + its test ·
update `franchiseDesignations.test.ts` + any designation tests the changes break.

**DO NOT:** touch `teamMVP.ts`/`legacyDynastyTracker.ts` · activate any morale/fame EFFECT (FF +2 / Albatross −1 stay
dormant; firewall flags stay false) · flip the offseason flag · add a new store / bump TRACKER_DB_VERSION (18) /
KBL_BACKUP_VERSION (2) (FF already persists as projected — promotion is a status flip, no new store) · do Captain
(DR-2), Fan Hopeful (DR-2), or the team-hub display strip (DR-3) · import `fanFavoriteEngine` anywhere.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · FULL `vitest run` = only the 3 characterized fails + any
designation tests you intentionally updated (mutation-honest), ZERO new reds; grep: no `fanFavoriteEngine` import
anywhere, `fanFavoriteEngine.ts` deleted, no Cornerstone in the team-designation union/matrix, FF in
ACTIVE_PROMOTION_TYPES + LIVE_DESIGNATION_BADGES, Albatross filter has the 2 new gates in BOTH selection + eligibility,
no version bump, firewall flags still false.

**STOP IF:** the 2× floor / materiality can't be computed from existing inputs (they can — contractValue===salary,
valueDelta===trueValue−salary) · `fanFavoriteEngine` has a live importer · FF promotion needs a store/version bump ·
de-gating FF requires touching morale-mutation machinery · removing Cornerstone ripples into the FAME
`FRANCHISE_CORNERSTONE` system.

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited.

**Status:** VERIFIED + COMMITTED `b48b450` (2026-06-17). Effects-dormant; browser-pending.

**AUDIT + EXECUTION RECORD (Opus 4.8, auditor ≠ builder):** Codex (high, watchdog) BUILT → Opus independently re-ran:
tsc 0 · build 0 · FULL suite **7,240 pass / 2 fail (7,242 total, 405 files)**. **BASELINE CHANGE (documented, not
silent): characterized fails 3 → 2** — `franchiseNarrativeEventEligibility` is now GREEN. Verified legitimate: the
source diff ONLY removed the `cornerstone` field; the `teamMvpAcePreview` assertion was a PRE-EXISTING stale
expectation (the long-deferred "separate narrative-gate cleanup"), and was aligned to the verified pre-existing
`not-applicable`/0 output — the cornerstone-field removal forced the test edit (it broke the `cornerstone.status`
line), and Codex cleaned the stale assertion in the same pass. NOT gutting. New characterized set: **wpaRuntimeBoundary
+ franchiseManualSmokeFixture**. The −50 test delta is the deleted orphan `fanFavoriteEngine.test` (351 lines).
**Read the diff + grepped invariants:** Albatross 2× floor (`salary >= 2*context.leagueMinimumSalary`, leagueMin =
injected `salaryCalculator.MIN_SALARY`) + 25% materiality (`valueDelta/contractValue <= -0.25`) ported INLINE into
BOTH the selection filter and the eligibility `valueDesignationBlockers` (parity), gate inputs recorded in
sourceInputs; FF promoted via `LIVE_DESIGNATION_BADGES` + `ACTIVE_PROMOTION_TYPES` + a ranked-selective
`classifyFanFavorite` (highest positive valueDelta, NO floor, keeps the ≥2-peer `valueTrusted` gate) whose active
reason explicitly keeps fame/morale/relationship/salary/Mode3 blocked; Cornerstone fully removed from the eligibility
union/matrix + narrative-eligibility + morale-bridge/context-adapter + the TeamHubContent:5971 blocked-truth row,
with `teamMVP.ts`/`legacyDynastyTracker.ts` FAME `FRANCHISE_CORNERSTONE` UNTOUCHED; orphan `fanFavoriteEngine.ts`+test
deleted (grep: zero importers); no `fanFavoriteEngine` import anywhere; no version bump; firewall flags false. Tests
mutation-honest (franchiseDesignations.test fixtures given real salaries + `valueTrusted` to genuinely satisfy the new
gates, FF badge assertion flipped to the real active badge; the rest are Cornerstone-token removals). **DR-1 COMPLETE.**
**NEXT: DR-2** (Captain charisma≥70 gate removal + Fan Hopeful visible-safe season-start assignment).

---

## DR-2 — Captain no-minimum + Fan Hopeful visible-safe season-start assignment — 2026-06-17 (attended)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Attended. Asset-protected (designation
+ personality) — RULED in DECISIONS_LOG DESIG-RECON (2026-06-17). Grounding: build map `wf_9ea0e360-d00` (readers 2+3).
Assignment logic only; effects (Fan Hopeful +5 morale, Captain charisma-double-morale) stay DORMANT. Display = DR-3.

**SCOPE:**
1. **CAPTAIN — remove the `charisma >= 70` gate** in `franchiseInitializer.ts` `computeTeamCaptains` (~:225): per
   canonical §17.6, Captain = highest combined (Loyalty + Charisma) with **NO minimum** (every team with ≥1 MLB
   player gets a captain). Keep the existing deterministic sort/tiebreak (loyalty+charisma desc, then a stable final
   tiebreak); the canonical "more seasons on team, then current-season WAR" tiebreak is degenerate at franchise init
   (all 0) so the existing stable tiebreak stands. The null path (team has zero MLB players → null + warn) stays.
   NO display work here (DR-3 renders from `team.captainPlayerId`); do NOT touch the eligibility CAPTAIN policy entry
   (cosmetic; DR-4 spec-reconciles it).
2. **FAN HOPEFUL — build the visible-safe season-start assignment:** add an optional `fanHopefulPlayerId?: string |
   null` field to the `Team` interface (`leagueBuilderStorage.ts:133`, mirroring `captainPlayerId` — additive
   optional, NO DB version bump). In `franchiseInitializer.ts`, alongside the captain assignment step (~:537-539), add
   a Fan Hopeful assignment: for each team, take its FARM prospects, rank by **SCOUTED grade** (visible-safe —
   `prospectProfile.scoutedGrade`, NEVER the hidden true rating/grade), take the top 3, and pick ONE via a SEEDED
   deterministic RNG (reuse `hashString`/`randomUnit` from `prospectScoutingDraftEngine.ts:261-272`, seed off a
   stable key e.g. `teamId+seasonId`), then persist the winner's id to `team.fanHopefulPlayerId` via
   `saveFranchiseTeam`. Source the team's farm prospects + scoutedGrade from whichever is populated at init
   (`getFranchiseFarmRoster`/`franchiseFarmStorage` or `TeamRoster.farmRoster`); rank with the existing
   `FRANCHISE_GRADE_ORDER`/`gradeIndex` helper. One per team; null + warn if a team has no farm prospects. The +5
   morale boost stays DORMANT (assignment + persistence only — no morale write).

**ALLOWED:** `franchiseInitializer.ts` · `leagueBuilderStorage.ts` (add the optional Team field only) · a small new
helper module if cleaner for the Fan Hopeful pick (pure) · the relevant init/captain/farm tests.

**DO NOT:** do the team-hub display strip (DR-3) · expose any hidden FARM true rating/grade/scout-truth/personality
modifier (rank ONLY on visible `scoutedGrade`) · write any morale/fame value (effects dormant) · bump a DB version /
add a store (the Team field is additive-optional) · touch the designation engine/eligibility (DR-1 done) · flip the
offseason flag · reconcile the eligibility CAPTAIN policy entry (DR-4).

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · FULL suite = only the 2 characterized fails (+ honestly
updated init/captain/farm tests), ZERO new reds; grep: no `charisma >= 70` gate remains; `fanHopefulPlayerId` is an
additive optional Team field; Fan Hopeful ranks on `scoutedGrade` only (no hidden-rating read); no morale/fame write;
no DB version bump.

**STOP IF:** the farm prospects + scoutedGrade are NOT available at the franchise-init assignment hook · ranking
visible-safe requires reading a hidden field · persisting `fanHopefulPlayerId` needs a DB version bump · Captain
no-minimum requires touching the eligibility/designation engine.

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited.

**Status:** VERIFIED + COMMITTED `9d1db40` (2026-06-17). Effects-dormant; browser-pending.

**AUDIT + EXECUTION RECORD (Opus 4.8, auditor ≠ builder):** Codex (high, watchdog) BUILT → Opus independently re-ran:
tsc 0 · build 0 · FULL suite **7,243 pass / 2 fail (7,245 total, 405 files)** = exactly the characterized set, ZERO
new reds; all 16 franchiseInitializer tests green. Diff = 2 product + 3 test. **Verified:** Captain `charisma >= 70`
gate removed (test proves a low-charisma/high-loyalty player now wins); Fan Hopeful = additive-optional
`Team.fanHopefulPlayerId`, `computeTeamFanHopefuls` ranks the team's FARM prospects by VISIBLE
`prospectProfile.scoutedGrade` (`FRANCHISE_PROFILE_GRADES`, best-first), top-3, seeded-deterministic pick (key
`teamId:seasonId`), persisted via `saveFranchiseTeam`; assigned at franchise init AND each new-season schedule init.
**Visible-safe PROVEN** — the test seeds a hidden `overallGrade:'S'`/scouted-`'D'` prospect and asserts it is NOT
picked (ranking uses scouted grade only). No morale/fame write, no DB version bump, no designation-engine touch.
**DR-2 COMPLETE. NEXT: DR-3** (team-hub six-designation display strip).

---

## DR-3 — team-hub six-designation strip (the year-end team-identity display) — 2026-06-17 (attended)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Attended. USER-VISIBLE → browser-batch.
Grounding: build map `wf_9ea0e360-d00` (reader 4). Display-only; reads existing state, writes nothing. Depends on
DR-1 (FF live, Cornerstone gone) + DR-2 (`captainPlayerId` no-min, `fanHopefulPlayerId`) — both committed.

**SCOPE:** add a compact per-team **six-designation strip** to `TeamHubContent.tsx`, **under the 'team' tab, directly
below the "Currently viewing: <team>" card (~:2741)** (the ruled placement). It shows the selected team's six team
designations: **Captain · Team MVP · Ace · Fan Favorite · Albatross · Fan Hopeful**.
- **MVP / Ace / Fan Favorite / Albatross:** read from the already-loaded `projectedDesignationRows` state (~:1302),
  filtered to `selectedTeamId` (~:1356); badge via `getLiveDesignationBadge(type)` when the row is `status:'active'`
  else `getProjectedDesignationBadge(type)` (both already imported ~:83-84) — matching the existing per-player render
  pattern (~:4360-4388). Resolve the holder name from the row (`playerName`) or `franchiseAllPlayers`.
- **Captain:** render directly from `franchiseTeam.captainPlayerId` (~:1277) — resolve the name via
  `getFranchisePlayerName`/`franchiseAllPlayers` (~:386/:1278). Author a small **UI-only Captain badge constant** in
  TeamHubContent (no engine change — Captain is personality-based, option (a)).
- **Fan Hopeful:** render from `franchiseTeam.fanHopefulPlayerId` (DR-2) — resolve the name; author a **UI-only Fan
  Hopeful badge constant**; it's a FARM prospect so show its visible `prospectProfile.scoutedGrade` (e.g. "Scouted A-")
  and NEVER any hidden true rating/grade.
- Each of the six slots renders the holder + badge, or a muted "—/none" when the slot is empty (designation null this
  season — valid). Add a small caption distinguishing **projected (mid-season)** vs **final** holders based on the row
  `status` (the engine designations carry 'active'/'projected'; Captain + Fan Hopeful are season-start assignments so
  treat as set). Always-visible once a team is selected (true season-end LOCKING is an unbuilt later slice — do NOT
  gate on season-complete).

**ALLOWED:** `src/src_figma/app/components/TeamHubContent.tsx` only (+ a TeamHubContent render test if you add one).

**DO NOT:** change any designation engine/storage/eligibility (DR-1/DR-2 done) · write/persist anything (display-only)
· read or show any hidden FARM true rating/true grade/scout-truth/hidden modifier (Fan Hopeful shows scouted grade
only) · fold CAPTAIN/FAN_HOPEFUL into the engine badge maps (UI-only constants — option a) · gate the strip on
season-complete / offseason · touch the existing per-player designation column or the value panels · flip any flag ·
add a store/version bump.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · FULL suite = only the 2 characterized fails, ZERO new reds;
grep: no hidden-grade/true-rating read in the new strip (scouted grade only), no persistence write, no engine/eligibility
edit, no flag flip.

**STOP IF:** rendering the strip needs new state not already loaded in TeamHubContent · Captain/Fan Hopeful require
engine badge-map changes to display · showing Fan Hopeful visible-safe needs a hidden field · the strip can't mount
under the 'team' tab without restructuring unrelated chrome.

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited.

**Status:** VERIFIED + COMMITTED `bd6b43c` (2026-06-17). USER-VISIBLE → browser-pending.

**AUDIT + EXECUTION RECORD (Opus 4.8, auditor ≠ builder):** Codex (high, watchdog) BUILT → Opus independently re-ran:
tsc 0 · build 0 · FULL suite **7,243 pass / 2 fail (7,245 total, 405 files)** = exactly the characterized set, ZERO
new reds. Diff = 1 file (`TeamHubContent.tsx`, +171/−7), display-only. **Verified by reading + grep:** the strip
mounts under the 'team' tab (fragment-wrapped with the "Currently viewing" card) with all six slots in order
(Captain · MVP · Ace · Fan Favorite · Albatross · Fan Hopeful); engine designations read `projectedDesignationRows`
(dedup per type, active>projected) badged via `getLiveDesignationBadge` (active) else `getProjectedDesignationBadge`;
Captain + Fan Hopeful render from `team.captainPlayerId`/`team.fanHopefulPlayerId` with UI-only badge constants (no
engine badge-map change); Fan Hopeful shows VISIBLE `Scouted <grade>` only (grep: zero hidden
trueGrade/trueRating/overallGrade/potentialGrade/modifier reads added); empty slots render "— none"; always-visible
with a projected/final caption. No persistence write, no engine/eligibility edit, no flag flip, no version bump.
**DR-3 COMPLETE.** USER-VISIBLE → JK browser sign-off batched (scenario in CURRENT_STATE).

---

## DR-4 — designation spec reconciliation to canonical §17 (docs-only) — 2026-06-17 (attended, Captain-authored)

**ROUTE:** Opus 4.8 (Captain/spec-lead) directly — docs-only, no code, no Codex/build/test gate. Per DECISIONS_LOG
DESIG-RECON; canonical = `MODE_2_V1_FINAL §17`.

**DONE:** added a "⚑ DESIG-RECON RECONCILIATION (2026-06-17 — CANONICAL)" banner to `DYNAMIC_DESIGNATIONS_SPEC.md` +
`FAN_FAVORITE_SYSTEM_SPEC.md` (each enumerating the as-built corrections + pointing to §17/DECISIONS_LOG), and
surgically corrected the flagged stale lines: Captain criterion → highest Loyalty+Charisma, NO minimum (both
`DYNAMIC_DESIGNATIONS_SPEC.md` §17.6 area + `PERSONALITY_SYSTEM_SPEC.md` §5.3); Team MVP "league-wide" → INTRA-TEAM
(the league-wide WAR award is the separate D9 system); Albatross trade discount 30% → 15% (C-056) **and** marked
DEFERRED in v1 (no AI-trade/valuation consumer) in both the code-illustration and the summary table. Working tree =
3 spec docs only (no code). **DR-4 COMPLETE → DESIG-RECON arc COMPLETE (DR-1..4).**

**Status:** COMPLETE (docs-only) — committed with the DR-3 docs.

---

## D11 — UI live-label sweep + the smart-label D4 panel de-gate — 2026-06-17 (attended)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Attended. USER-VISIBLE → browser-batch.
Grounding: map `wf_5c3919ed-ff2` (4 readers). Folds in the D4 salary de-gate (DECISIONS_LOG D4 ruling). Small
REAL-BUILD (the panel re-point) + a precise copy sweep. **No new store / version / flag flip / effect activation.**

**GOVERNING RULE (apply to every label site):** PROMOTE a label where the *surface/data* is now live (the value
spine when FROZEN, awards persistence via D9, the six live designations); KEEP a label where an *effect/mutation* is
still dormant/blocked (morale automation, salary MOVEMENT, relationship mutation, Mode 3, season rollover,
expected-wins persistence, final-True-Value handoff authority, stadium-spray adaptivity). When unsure → KEEP
(over-promotion is the dangerous direction).

**SCOPE A — the D4 combined "True Value + Expected Wins" panel = SMART LABEL** (`TeamHubContent.tsx`
FranchiseValueExpectedWinsPreviewPanel def ~:4742): re-point the status badge + `isAvailable` (~:4785/:4812) OFF the
never-'trusted' preview status and ONTO the real trust signal
(`valueInputReport.trueValuePolicy.finalTrueValueCalculated` / `trustedValueArtifactFrozen` — the same flag
`valueStatus` already uses at ~:5574). Render **TRUE VALUE as TRUSTED/Final when the artifact is FROZEN (season-end),
else PROJECTED (mid-season)** — do NOT claim trusted mid-season. Drop "PREVIEW" from the title (~:4796) + the static
'PREVIEW ONLY' chip (~:4798-4800); value cells "Preview value total/delta" → "Value total/delta" (~:4853/:4857);
"READ-ONLY CROSS-CHECK" → "CROSS-CHECK" (~:4824). **Expected Wins stays labeled an ESTIMATE** (never frozen in v1).
**KEEP** the 'NO SALARY MOVEMENT' chip (~:4807-4809), the salary-movement 'Blocked' card (~:4838-4839), and the
footer blocked families incl. expected-wins persistence + final-handoff (~:4868). Fix the contradictions: VALUE INPUTS
body (~:5624) make it conditional on `finalTrueValueCalculated` so it stops saying "deferred" while its badge says
TRUSTED; `True Value/value delta: TRUSTED for projected designations only` (~:6187) → TRUSTED (frozen artifact; now
also feeds Albatross/Fan Favorite + awards); drop the stale "True Value … remain deferred" clause (~:6150).

**SCOPE B — copy sweep, PROMOTE these flatly-stale sites:** `franchiseSeasonSummaryStorage.ts:431` (blocked-
designation-families detail — drop Cornerstone [cut] + stop calling the six live designations blocked) · `:508`
(remove the FF/Albatross "promotion pending" clause — now live) · `TeamHubContent.tsx:5666` "Awards persistence:
BLOCKED" → LIVE (finalized at season end; effects dormant) · `:5586-5587` (drop 'awards' from the stay-blocked list)
· `:6202` (drop Captain + Fan Hopeful — now live) · `:6135-6136` (stop surfacing CAPTAIN/FAN_HOPEFUL as 'blocked' —
live via team fields) · `:4529` (generalize "Solid badges are live TEAM_MVP/ACE" → all engine designations incl.
FF/Albatross) · `FranchiseHome.tsx` "Awards persistence: BLOCKED" (~:4548 — stale, D9 made it live) IF it refers to
the awards STORE (not the dead-gated offseason ceremony). For MIXED lines that bundle a now-live surface with a
still-dormant effect (e.g. "…morale, salary, awards, and Mode 3 effects remain blocked"): SURGICALLY drop only the
now-live SURFACE token (awards/designations exist & persist), KEEP the effect tokens (morale/salary/relationship/Mode3
EFFECTS remain dormant).

**SCOPE C — KEEP INTACT (do NOT promote — these are correct):** every salary-MOVEMENT/luxury-tax/AI-valuation blocked
line; morale/relationship/Mode-3/rollover blocked lines; the SeasonSummary manifest still-blocked categories
(`franchiseSeasonSummaryStorage.ts` true-value-value-delta final-handoff :504-510, mode3-offseason-rollover :514-518,
morale-relationship-automation :523-528, salary warning :401); SeasonSummary.tsx:886-889 review-only/blocked families;
ALL stadium-spray "preview-only / heat-map deferred / custom-dimensions blocked / adaptive-factors preview" labels
(TeamHubContent ~:3470,:5026,:5073-5283 — spray stays functional-but-provisional per D0); the READ-ONLY roster
analyzer (~:6615) + transaction history (~:6242); mid-season "Proj." PROJECTED_BADGES + the DR-3 strip caption
(:2873-2912) + per-slot 'Projected' labels; AwardsCeremonyFlow (dead-gated offseason — do NOT touch/resurrect);
`teamMVP.ts`/`legacyDynastyTracker.ts` FAME `FRANCHISE_CORNERSTONE` (different system).

**ALLOWED:** `TeamHubContent.tsx` · `franchiseSeasonSummaryStorage.ts` · `FranchiseHome.tsx` · the tests that pin the
swept copy (esp. `TeamHubContent.franchiseReads.test.tsx` which asserts 'TRUE VALUE + EXPECTED WINS PREVIEW' / 'PREVIEW
ONLY' / 'Preview value total' etc., and `franchiseSeasonSummary.wave4`/`SeasonSummary.pass5` if a manifest detail
string changes) — update assertions HONESTLY to the new copy.

**DO NOT:** promote any KEEP-list (Scope C) label · activate any morale/fame/salary EFFECT · claim True Value trusted
MID-SEASON (must be frozen-gated) · relabel Expected Wins as final/trusted · flip the offseason flag / touch
AwardsCeremonyFlow / offseasonStorage · change any engine logic, store, or version · alter the manifest policyFlags
(they stay false) · touch the season-summary still-blocked manifest categories.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · FULL suite = only the 2 characterized fails (+ honestly
updated copy-pin tests), ZERO new reds; grep: no 'PREVIEW ONLY' on the value panel, the panel badge reads the
`finalTrueValueCalculated`/frozen signal (not the preview status), 'NO SALARY MOVEMENT' + spray-provisional + Mode3/
morale blocked labels all still present, no policyFlag/version/flag change, no AwardsCeremonyFlow edit.

**STOP IF:** the panel can't read a frozen/trusted signal without an engine change beyond the UI re-point · promoting
a label would require flipping a manifest policyFlag or activating an effect · the D4 re-point needs the preview
engines rewritten (that's out of D11 scope — fall back to surfacing it) · a "stale" awards/designation label turns out
to be the dead-gated offseason ceremony.

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited.

**Status:** VERIFIED + COMMITTED `5eaf9d9` (2026-06-17). USER-VISIBLE → browser-pending.

**AUDIT + EXECUTION RECORD (Opus 4.8, auditor ≠ builder):** Codex (high, watchdog) BUILT → Opus independently re-ran:
tsc 0 · build 0 · FULL suite **7,243 pass / 2 fail (7,245 total, 405 files)** = exactly the characterized set, ZERO
new reds; the 2 swept copy-pin files green (FranchiseHome 12, TeamHubContent.franchiseReads 47). Diff = 3 product
(TeamHubContent.tsx, FranchiseHome.tsx, franchiseSeasonSummaryStorage.ts) + 2 test. **Verified by reading + grep:**
(1) SMART-LABEL re-point correct — `panelStatus = trustedValueArtifactFrozen ? 'trusted' : (isAvailable ? 'projected'
: 'blocked')`, `isAvailable` gated on `finalTrueValueCalculated`, title "TRUE VALUE PROJECTED"→"…FINAL" only when
frozen, Expected Wins stays an estimate; never claims trusted mid-season. The VALUE INPUTS body / finalization /
movement labels all frozen-gated (contradiction fixed). (2) PROMOTE sites done (manifest blocked-families drops the
live six + Cornerstone; "Awards persistence BLOCKED"→LIVE on TeamHub + FranchiseHome; Captain/Fan Hopeful no longer
blocked; designation caption generalized). (3) KEEP-list SURVIVED (grep: NO SALARY MOVEMENT, salary-matching, "stay
blocked"×6, "preview-only"×7 [spray], "remain deferred", Mode 3×13, morale×108 all present) — no over-promotion.
(4) NO policyFlag/version/flag/AwardsCeremonyFlow/offseasonStorage change. (5) Tests honest + STRENGTHENED (seed
`trustedValueArtifactFrozen` false AND true → assert PROJECTED vs TRUSTED). **D11 COMPLETE → the D-stack UI is fully
de-gated.** USER-VISIBLE → JK browser sign-off batched (scenarios #14/#15). NEXT = D12 (manual smoke on real franchise
data, iPad) → D13 (Playable-V1 internal checkpoint) → the soul layer (L-stack).

---

## L3a — the pure Master Morale Matrix engine (the math) — 2026-06-17 (attended)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Attended. SMB4-asset (morale) — RULED
in DECISIONS_LOG "SOUL-LAYER greenlight" + "L3 STRUCTURAL RULINGS" (2026-06-17). Grounding: map `wf_04a84b30-ef5`.
**PURE engine only** — no store, no wiring, no narrative, no live consumer (the store/subscription/build-dark flag are
L3b). First soul-layer build; the spine.

**SCOPE — NEW `src/engines/masterMoraleMatrix.ts` (greenfield, pure, deterministic):**
1. **The ONE event-keyed table** (§5: one table, not three; "every outcome looked up, never invented"). Each event →
   a base consequence record `{ selfPlayerMoraleDelta, teamFanMoraleDelta, otherTouched: [{relation, delta}], reason }`.
   Reuse/extend the event taxonomy from `fanMoraleEngine.ts` (type-only — import `MoraleEventType`, add the
   player-centric + cross-effect events the fan table lacks). This new engine IS the single authoritative table;
   `fanMoraleEngine`'s narrative is NOT imported (firewall).
2. **The pure composer** `composeMoraleConsequence(event, personality, modifiers, currentPlayerMorale, currentFanMorale)
   → resolved consequence` — looks up the base row, then applies deterministic multipliers (never invents). Per §6/§7:
   **7 canonical personalities** (COMPETITIVE/RELAXED/DROOPY/JOLLY/TOUGH/TIMID/EGOTISTICAL) set response multipliers;
   **4 hidden modifiers** — **Ambition scales UP-moves, Resilience scales DOWN-moves** (clean division, no
   double-count), **Charisma drives the `otherTouched` teammate deltas** (lifts teammates; does NOT move his own
   ratings), **Loyalty scales the fan-morale→player-morale sensitivity** (§13 personality-scaled link). Reconcile the
   non-canonical names in `playerMorale.ts` (GRUMPY/FIERY/SPIRITED) to the canonical 7.
3. **EXCLUDE the §8 fan-morale RATINGS dampener** — that primitive is L5-owned; L3 takes morale as INPUT only (do not
   implement or apply it here).
4. **Magnitudes = a single SIM-TUNED `MORALE_TUNING` config object** (mirror the `FAN_MORALE_CONFIG` pattern at
   `fanMoraleEngine.ts:388`) — every delta/multiplier is a named placeholder constant the Sim Gate (§16) will sweep.
   The STRUCTURE is what L3a locks; the numbers are explicitly placeholder.
5. **Typed default-neutral tap interface** (§L3:73): a typed `MoraleMatrixEvent` input union + a tap registry where
   fame/designation/race/relationship inputs return NEUTRAL (0) until their owner engines land. Adding a new event
   type must not silently skip the matrix (unmatched → `{0,0}` neutral, never throw).
6. **Unit tests** (pure, deterministic): same input → same output; an event's base lookup; personality changes the
   multiplier; Ambition scales a positive delta while Resilience scales a negative one (and not vice-versa);
   Charisma moves `otherTouched` not self; a default-neutral tap returns 0; an unknown event → neutral.

**ALLOWED:** NEW `src/engines/masterMoraleMatrix.ts` + its NEW test file · a type-only import from `fanMoraleEngine.ts`
(no runtime/narrative coupling) · OPTIONALLY a tiny shared morale-types file if cleaner. NOTHING else.

**DO NOT:** touch any store / `franchiseMoraleState` / IndexedDB / persistence (L3b) · wire to game-end /
processCompletedGame / useGameState (L3b) · import or call any reporter / narrative / LLM / `generateEventNarrative`
(firewall — math only) · implement the §8 ratings dampener (L5) · apply any live morale mutation (build-dark; this is
a pure engine) · reconcile/bump any DB · alter `fanMoraleEngine`'s runtime behavior (type-only import).

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · FULL suite = only the 2 characterized fails + the new
masterMoraleMatrix tests, ZERO new reds; grep: the new engine imports no store/persistence, no reporter/narrative/LLM,
no §8 dampener; magnitudes are named `MORALE_TUNING` constants (not scattered literals).

**STOP IF:** the composer can't stay deterministic/pure without a store or live state · honoring "one table" forces
importing `fanMoraleEngine`'s narrative runtime · the 4-modifier division (Ambition-up/Resilience-down) needs design
input beyond the spec · representing the matrix needs a new persisted shape (that's L3b).

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited.

**Status:** VERIFIED + COMMITTED `5b1431d` (2026-06-17). Build-dark (pure engine; no consumer until L3b + post-D13).

**AUDIT + EXECUTION RECORD (Opus 4.8, auditor ≠ builder):** Codex (high, watchdog) BUILT → Opus independently re-ran:
tsc 0 · build 0 · FULL suite **7,252 pass / 2 fail (7,254 total, 406 files)** = characterized set only, ZERO new
reds; 9 new matrix tests green. Diff = 2 NEW files. **Read the engine in full + grep-verified:** FIREWALL clean (only
two TYPE-only imports — `MoraleEventType`, `HiddenModifiers`; zero store/persistence/reporter/narrative/LLM/dampener;
no `Math.random`/`Date.now`/IO → pure + deterministic). The composer is correct: `applyAmbitionOrResilience` routes
positive deltas through Ambition and negative through Resilience (the §6 no-double-count division, tested BOTH
directions), personality multipliers layer on, the fan→player link is personality-sensitivity × Loyalty-scaled (§13),
Charisma drives `otherTouched`, all clamped/rounded with a non-finite guard. The base table is completeness-enforced
(`satisfies Record<MasterMoraleEventType, …>`); the tap registry returns NEUTRAL for all 4 future taps; unknown events
→ neutral (never throw); legacy personality names reconciled. §8 dampener correctly EXCLUDED. Magnitudes all in the
SIM-TUNED `MORALE_TUNING` block. **L3a COMPLETE.** NEXT = L3b (store wiring + dark).

---

## L3b — wire the matrix to the morale store (dark) + parity-guard extension — 2026-06-17 (attended)

**ROUTE:** Codex | very-high reasoning effort (persistence + un-gating live behavior) → Opus 4.8 audit (auditor ≠
builder). Attended. SMB4-asset (morale) + persistence. RULED in DECISIONS_LOG "L3 STRUCTURAL RULINGS". Grounding: map
`wf_04a84b30-ef5`. **BUILD-DARK: NO live morale mutation/consumer until after D13** (§5 no-phantom-morale + the D12
smoke gate). Completes L3 (L3a = the engine; L3b = persistence + wiring).

**SCOPE:**
1. **REUSE + extend `franchiseMoraleState.ts` (`kbl-franchise-morale`)** — it already models player + team-fan
   targets + per-target history. Add a NEW non-confirmation `sourceKind` (e.g. `'matrix-auto'`) to
   `FranchiseMoraleSourceKind` and an **automatic + logged** apply path that takes L3a's `ResolvedMoraleConsequence`
   and writes the self/player + team-fan deltas + `otherTouched` into the player/fan ledgers + the history log (the
   log IS the ledger, §5 LS-9). Keep the existing **idempotent dedupe** (sourceEventId). Do NOT remove or break the
   existing confirmation-gated path (the UI gate-removal pairs with post-D13 activation — out of scope here).
2. **Subscribe to the D7 `DesignationEvent` stream — DARK.** At the current void-ignore site
   (`processCompletedGame.ts:303` `void result.designationEvents;`), map each DesignationEvent (granted/changed/lost
   for TEAM_MVP/ACE/ALBATROSS/FAN_FAVORITE) to the corresponding concrete matrix event (e.g. FAN_FAVORITE granted →
   `FAN_FAVORITE_LOCKED`, ALBATROSS → `ALBATROSS_LOCKED`, Captain → `CAPTAIN_*`), run `composeMoraleConsequence`, and
   write to the dark ledger — **all gated behind the build-dark Phase-2 flag** (compute + dark-write only; the
   DesignationEvent firewall flags stay false; no live morale mutation).
3. **Build-dark Phase-2 flag.** Add a single central Phase-2 morale flag (e.g. `franchisePhase2Flags.ts`,
   default OFF) that gates BOTH the auto-apply write path and the D7 subscription. With the flag OFF (the v1 default
   until post-D13), the matrix can compute but writes go to a dark/no-op path — NO live morale state changes.
4. **Parity-guard extension + backup DoD.** Extend the backup parity-guard
   (`backupRestore.franchiseParity.test.ts`) to ALSO cover `kbl-franchise-morale` (close the C-4 deficit for this DB
   — it's already registered in `backupRestore.ts:637` + `syncConfig.ts:108`). If you add any new field/index/store to
   the morale DB, bump its `DB_VERSION` (additive) + update the backup registry byte-mirrored + add the round-trip
   test; if you only add a `sourceKind` value (no schema change), no bump. Update the PIN-TRAP test if any version bumps.

**ALLOWED:** `franchiseMoraleState.ts` · `processCompletedGame.ts` (the void-ignore site) · NEW
`franchisePhase2Flags.ts` (or similar) · a NEW `franchiseMoraleMatrixApply` helper module if cleaner · `backupRestore.ts`
+ `backupRestore.franchiseParity.test.ts` + `syncConfig.ts` (parity/backup) · the relevant tests. Imports L3a's
`masterMoraleMatrix` (the engine).

**DO NOT:** go LIVE (build-dark — no live morale mutation/consumer before D13; the flag stays OFF) · remove or break
the existing confirmation-gated morale path (gate-removal is post-D13 activation) · remove the existing roster-tab
confirmation UI (post-D13) · implement the §8 dampener (L5) · import a reporter/LLM into the apply path (firewall) ·
create a SECOND morale store (reuse the existing one) · touch the oracle/value spine · flip the offseason flag.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · FULL suite = only the 2 characterized fails (+ honest new
L3b tests), ZERO new reds; grep: the build-dark flag defaults OFF and gates the write path + the D7 subscription; the
existing confirmation path still present; parity-guard now covers `kbl-franchise-morale`; no second morale store; no
reporter import in the apply path; the DesignationEvent firewall flags stay false. A test proving: flag-OFF → no live
morale write (dark); the auto path writes to the ledger + history when exercised in test; idempotent dedupe holds.

**STOP IF:** un-gating cleanly requires removing the existing confirmation path (it must stay until post-D13) · the
dark flag can't gate both write paths without an engine change · reusing the store forces a destructive migration ·
the parity-guard extension reveals a real backup drift in `kbl-franchise-morale` (surface it).

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited.

**Status:** VERIFIED + COMMITTED `d46a071` (2026-06-17). Build-dark (flag OFF; activates post-D13). **→ L3 COMPLETE.**

**AUDIT + EXECUTION RECORD (Opus 4.8, auditor ≠ builder):** Codex (very-high, watchdog) BUILT → Opus independently
re-ran: tsc 0 · build 0 · FULL suite **7,256 pass / 2 fail (7,258 total, 406 files)** = characterized set only, ZERO
new reds; morale (3) + parity-guard (4) tests green. Diff = 4 edited + 1 new. **Read the diff + verified:** BUILD-DARK
is defense-in-depth — `franchisePhase2Flags.ts` defaults `FRANCHISE_PHASE2_MORALE_ENABLED_DEFAULT=false`, and BOTH the
call site (`processCompletedGame` early-returns when off) AND the store (`applyFranchiseMoraleMatrixConsequence` →
`'dark-noop'` when off) gate on it → zero live morale write with the v1 default (proven by a test asserting flag-OFF →
null snapshots). Store REUSED (no second store) — new `'matrix-auto'` sourceKind + the matrix-apply path routes through
the existing `applyFranchiseMoraleEffect` (idempotent dedupe + deterministic sourceEventIds); the existing
confirmation-gated path is UNTOUCHED; `DB_VERSION` stays 1 (no schema change → no backup version bump). The D7
subscription replaced the `void result.designationEvents` site (flag-gated dark, isolated try/catch, firewall flags
stay false). The parity-guard now asserts `kbl-franchise-morale` registry alignment (closes the C-4 deficit; no drift).
No reporter/LLM import in the apply path (firewall). **L3 COMPLETE — the morale spine is built, dark.** NEXT (soul
layer): {L5 fan-teeth, L6 fame} → {L7, L8, L9b, L10} → … (after D13 activation). The roster-tab confirmation-gate UI
removal pairs with L3 activation (tracked).

---

## L6a — the pure Fame model engine (Heat/Reach/tier + fame-vs-merit) — 2026-06-17 (attended)

**ROUTE:** Codex | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Attended. SMB4-asset (fame); §20 is
LOCKED design. RULED in DECISIONS_LOG "SOUL-LAYER greenlight" + "L6 plan + defaults" (2026-06-17). Grounding: map
`wf_d44466a5-632`. **PURE engine only** — no store, no wiring, no L3-tap fill, no live-fame touch (those are L6b /
deferred). Mirrors L3a / ivEngine (pure → audited → wired).

**SCOPE — NEW `src/engines/fameModel.ts` (greenfield, pure, deterministic):**
1. **The canonical §20.7 nine-tier ladder** — ONE type/enum + a SIM-TUNE threshold table (Immortal Legend > Global
   Superstar > National Icon > Regional Star > Local Hero · **Unknown** (neutral pivot) · Polarizing > Notorious >
   Despised). This replaces the 3 debt ladders (do NOT import their thresholds, §20.8).
2. **Heat** (§20.3, recency-weighted, fickle): a pure `applyHeatUpdate(currentHeat, gameHeatInput, config)` — recency
   exponential decay applied per update + the new nudge (decay-on-write model; the decay RATE is a SIM-TUNE constant,
   §20.9). The `gameHeatInput` is the layer-1 WPA-spine contribution + the layer-3 `FAME_VALUES` bumps + status nudges
   (the engine takes it as a parameter; the per-game builder that reads live WPA is L6b).
3. **Reach** (§20.3, ratchets): an integer reach-floor that only increases in-season (`updateReachFloor`), never
   erodes; **the displayed tier = Heat floored at Reach** (`resolveFameTier(heat, reachFloor)`). A `wasNegative`
   boolean for the reporter. **Trade reset** (`applyTradeReset`): drops the reach floor + pulls Heat toward Unknown
   (keeps SOME Heat — "reputation precedes him" — but loses the earned floor; §20.3/§20.4, v1 trade always dilutes).
4. **WAR-legitimacy-floor gravity** (§20.1 layer-2): a pure function that pulls Heat toward a WAR-justified level
   (gravity, NOT a direct contributor; strength is SIM-TUNE, §20.9).
5. **Fame-vs-merit classifier** (§20.2): `classifyFameVsMerit(fameTier, meritLevel)` → snub / bust / darling /
   aligned (the gap that makes snubs + busts emerge).
6. **Fame-by-attribution-channel breakdown** (explicit L6 deliverable per the DSTACK): pure aggregation helpers for a
   **defensive-fame** sub-aggregate (Gold Glove §23.2) + a **role-player fame** sub-aggregate (the bench award), from
   channel-tagged fame inputs.
7. **All magnitudes in a single SIM-TUNE `FAME_TUNING` config** (decay rate, WAR-floor gravity, tier thresholds,
   channel weights, trade-reset retention) — §20.9 owns the numbers; L6a locks the structure.
8. **RETAIN (type/function reuse, §20.8):** import `FAME_VALUES` + `calculateFame`/`getLIMultiplier`/
   `getPlayoffMultiplier` (the √LI iconic-event bump SCORING) as the layer-3 input. Do NOT reuse/extend the debt tier
   functions (`getFameTier`, `FameLevel`, reporter `FameTier`).
9. **Unit tests** (pure, deterministic): Heat decays toward neutral over updates; Reach ratchets up + never erodes
   in-season; tier = Heat floored at Reach; trade reset drops the floor + pulls Heat down but retains some;
   WAR-floor gravity pulls Heat toward the WAR level; fame-vs-merit classifies snub (high merit/low fame) + bust (low
   merit/high fame); channel aggregation sums; same input → same output.

**ALLOWED:** NEW `src/engines/fameModel.ts` (or `fameLadder.ts`) + its NEW test file · type/function-only imports of
`FAME_VALUES` (`src/types/game.ts`) + the `calculateFame` scoring (`src/engines/fameEngine.ts`). NOTHING else.

**DO NOT:** touch any store / IndexedDB / persistence (L6b) · wire to game-end / processCompletedGame / seasonAggregator
(L6b) · fill the L3 `fame` morale tap (deferred post-D13) · touch or modify the LIVE fame paths (`aggregateFameEvents`,
`salaryCalculator` `player.fame` read, `useFameTracking`/GameTracker display) or the debt ladders (`getFameTier`,
`FameLevel`, reporter `FameTier`) · extend the pure-cumulative model · import a reporter/LLM (firewall) · apply any
live mutation (pure engine).

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · FULL suite = only the 2 characterized fails + the new
fameModel tests, ZERO new reds; grep: the new engine imports no store/persistence, no reporter/LLM; does not import
the debt tier functions; magnitudes are named `FAME_TUNING` constants (not scattered literals).

**STOP IF:** the Heat/Reach model can't stay pure/deterministic without a store · honoring "one ladder" forces
touching a live debt-ladder consumer · the channel breakdown needs a persisted shape (that's L6b) · the fame-vs-merit
classifier needs a merit source not passable as a parameter.

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited.

**Status:** VERIFIED + COMMITTED `7359cbf` (2026-06-17). Build-dark (pure engine; no consumer until L6b + post-D13).

**AUDIT + EXECUTION RECORD (Opus 4.8, auditor ≠ builder):** Codex (high, watchdog) BUILT → Opus independently re-ran:
tsc 0 · build 0 · FULL suite **7,265 pass / 2 fail (7,267 total, 407 files)** = characterized set only, ZERO new
reds; 9 new fame tests green. Diff = 2 NEW files. **Read the engine in full + grep-verified:** FIREWALL/PURITY clean
(imports only the RETAINED `FAME_VALUES` + `calculateFame`/`getLIMultiplier`/`getPlayoffMultiplier`; zero
store/persistence/reporter/LLM; NO debt-ladder imports [`getFameTier`/`FameLevel`/reporter `FameTier`]; no
`Math.random`/`Date.now` → pure/deterministic). §20.3 floor semantics CORRECT — `resolveFameTier` floors positive
Heat at the Reach floor (a cold superstar cools but can't crater below his earned floor) while negative fame moves
freely; `applyHeatUpdate` is decay-on-write; `updateReachFloor` ratchets up via `Math.max` (never erodes);
`applyTradeReset` retains 35% Heat + drops the floor; `applyWarLegitimacyGravity` pulls toward the WAR target
(gravity, not a direct add); `classifyFameVsMerit` → snub/bust/darling; defensive + role-player channel aggregates
present (the explicit L6 deliverables). All magnitudes in the SIM-TUNED `FAME_TUNING` block. **L6a COMPLETE.** NEXT =
L6b (the fame store + dark wiring — bumps trackerDb v18→v19 + the C-4 backup DoD).

---

## L6b-1 — the Fame STORE + backup parity (`franchiseFameRecords` @ trackerDb v18→v19) — 2026-06-17 (attended)

**ROUTE:** Codex 5.5 | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Attended. SMB4-asset (fame);
§20 LOCKED design. RULED in DECISIONS_LOG "L6 (Fame) plan + defaults" (2026-06-17, lines 1219-1245) + the soul-layer
"build to spec" GREENLIGHT. **JK split ruling (2026-06-17): L6b → L6b-1 (this — store + parity, dark/EMPTY, no
live-game-path change) then L6b-2 (the Phase-2 fame flag + per-game dark compute + processCompletedGame wiring).**
Grounding workflow `wf_57cb7d14-758` (6 readers). PERSISTENCE / data-shape ticket — NO live-game-path change (no
writer wired) → no browser obligation for L6b-1. Mirrors D9a (`53ffd4c`: the dark-store + parity lockstep) and D2
(`2fab709`: the backup-parity guard). The L6a pure engine (`src/engines/fameModel.ts`, `7359cbf`) is FROZEN — type-
import only, never edit.

You are the L6b-1 builder (Codex). Build ONLY the fame persistence layer + its backup/sync parity registration. NO
flag, NO per-game compute, NO `processCompletedGame` edit, NO live writer — the store's CRUD lands with ZERO callers
outside its own file + test (that is the "dark/empty" proof). The engine wiring is L6b-2.

**GOAL:** Add a parity-guarded `franchiseFameRecords` IndexedDB store (shared `kbl-tracker` DB, v18→v19) holding
per-player-season fame running state + snapshot channel display fields, registered in all THREE parity sites
(trackerDb / backupRestore / syncConfig) with the pin-trap + round-trip tests green. The store ships EMPTY (no writer)
— zero live behavior change.

**SOURCE OF TRUTH:** DECISIONS_LOG.md:1238-1245 (L6b store shape) · the D9a `franchiseAwardsStorage.ts` precedent ·
this contract for every concrete decision.

### SCOPE — exactly these edits, nothing else

**(1) NEW `src/utils/franchiseFameRecordsStorage.ts`** — a byte-structural copy of `src/utils/franchiseAwardsStorage.ts`
(the 4-part-key twin), with:
- `export const FRANCHISE_FAME_RECORDS_STORE_NAME = 'franchiseFameRecords';` and `DB_NAME = 'kbl-tracker'`.
- A `FranchiseFameRecordsScopeInput` `{ franchiseId; seasonId; statsScopeId }` and the row interface:
  `export interface FranchiseFameRecordRow { franchiseId: string; seasonId: string; statsScopeId: string;
  playerId: string; heat: number; reachFloor: number; wasNegative: boolean; channelTotal: number;
  channelByChannel: Record<FameAttributionChannel, number>; defensiveFame: number; rolePlayerFame: number;
  updatedAtCheckpoint: string; }`. `heat/reachFloor/wasNegative` ARE the L6a `FameModelRecord` running state; the
  channel fields are snapshot-at-compute display data (L6b-2 fills them). Import `FameAttributionChannel`
  type-only from `../engines/fameModel` (alias if any `FameTier` is ever imported — it collides by NAME with
  `reporter.ts`'s `FameTier`).
- keyPath `['franchiseId','seasonId','statsScopeId','playerId']`; getTrackerDb()-delegated read/write helpers;
  `scopeKey`/`rowKey`(4th segment = `playerId`)/`hasExplicitScope` helpers carried verbatim from awards;
  `getByScope` WITH the in-memory re-filter (awards:163-169); `saveFranchiseFameRecordRows`/`upsert…`/
  `replaceFranchiseFameRecordRowsForScope`/`getFranchiseFameRecord(scope, playerId)`/`deleteFranchiseFameRecordsForScope`;
  each writer calls `syncEngine.upsert(DB_NAME, STORE_NAME, rowKey(...), row)` guarded by `!syncEngine.isSuppressed()`;
  `resetFranchiseFameRecordsForTests`/`clearFranchiseFameRecordsForTests`/`initFranchiseFameRecordsDatabase` delegating
  to the shared trackerDb helpers. NO `indexedDB.open` / `onupgradeneeded` in this file.

**(2) Three-place schema registration:**
- `src/utils/trackerDb.ts`: bump `TRACKER_DB_VERSION` **18→19** (line 17); append a v19 block at the END of the
  `onupgradeneeded` handler (after the v18 `franchiseTrueValueSnapshots` block, ~line 377):
  `if (!db.objectStoreNames.contains('franchiseFameRecords')) { const s = db.createObjectStore('franchiseFameRecords',
  { keyPath: ['franchiseId','seasonId','statsScopeId','playerId'] }); s.createIndex('by_scope',
  ['franchiseId','seasonId','statsScopeId'], { unique: false }); }`. Idempotent name-guard style ONLY — NO
  `if (oldVersion < N)` branch.
- `src/utils/backupRestore.ts`: add a `franchiseFameRecords` entry to the `trackerStores` object — keyPath +
  the single `by_scope` index + **`optional: true`** (mandatory for a newly-added store; byte-identical keyPath/index
  to trackerDb); AND bump `STATIC_DATABASE_SCHEMAS['kbl-tracker'].version` **18→19** (line 319). **DO NOT touch
  `KBL_BACKUP_VERSION` — it STAYS 2** (adding a store grows coverage, not the file format; D9a/D2 precedent).
- `src/utils/syncConfig.ts`: add `franchiseFameRecords: ['franchiseId','seasonId','statsScopeId','playerId']` under
  `SYNC_REGISTRY['kbl-tracker']` (cloud-sync parity, matching D9a's two dark stores).

**(3) Tests** (prefix `NODE_ENV= `):
- NEW `src/utils/tests/franchiseFameRecordsStorage.test.ts` mirroring `franchiseAwardsStorage.test.ts`: (a) migration
  creates the store + the **PIN-TRAP** `expect(Array.from(store.indexNames)).toEqual(['by_scope'])`; (b) round-trip by
  scope + the exact 4-part composite key with a `syncEngine.upsert` assertion (mock `../syncEngine` identically);
  (c) `upsert` + `replaceForScope` scope isolation (no cross-scope leak); (d) the source-scan guard:
  `toMatch(/getTrackerDb/)` AND `.not.toMatch(/indexedDB\.open|onupgradeneeded/)`.
- EXTEND `src/utils/tests/backupRestore.franchiseParity.test.ts`: in the round-trip test (≈227-288) add a
  `franchiseFameRecords` seed row to the seeding tx + a `backup.databases[TRACKER_DB_NAME].franchiseFameRecords`
  payload assertion + a post-restore readRecord assertion. The set-equality PIN-TRAP (≈207-215) needs NO edit once
  both registries match.
- EXTEND `src/utils/tests/franchiseSaveSlotManifest.test.ts` (≈1190-1254): add the matching
  `SYNC_REGISTRY['kbl-tracker']` `toHaveProperty('franchiseFameRecords', [...])` + `STATIC_DATABASE_SCHEMAS`
  `toMatchObject({ keyPath: [...], optional: true })` assertions.
- EXTEND `src/utils/tests/franchiseSeasonLedgerStorage.test.ts` — the RECURRING version-pin trap (cf. `8ba0538`,
  the prior v15→v17 bump that hit this exact file). It is the ONLY test with an exhaustive full-list equality on the
  kbl-tracker stores AND a hard version literal: line ≈105 `expect(TRACKER_DB_VERSION).toBe(18)` → `.toBe(19)`; add
  `'franchiseFameRecords'` to the `expectedTrackerStores` array (≈line 28, alphabetical position — after
  `'franchiseDesignationRows'`, before `'franchiseSeasonLedgerRows'`). (The 3 reporter store-list tests use
  `arrayContaining` (presence) so they need NO edit; `leagueBuilderStorageV6Migration.test.ts` is a different DB; the
  `backupRestore.franchiseParity.test.ts` set-equality pin auto-greens once both registries match.)

**ALLOWED files:** NEW `src/utils/franchiseFameRecordsStorage.ts` + NEW `src/utils/tests/franchiseFameRecordsStorage.test.ts`
· EDIT `src/utils/trackerDb.ts`, `src/utils/backupRestore.ts`, `src/utils/syncConfig.ts` · EDIT
`src/utils/tests/backupRestore.franchiseParity.test.ts` + `src/utils/tests/franchiseSaveSlotManifest.test.ts` +
`src/utils/tests/franchiseSeasonLedgerStorage.test.ts`. Type-only import of `../engines/fameModel`. NOTHING else.

**DO NOT:**
- Touch `src/engines/fameModel.ts` / `fameEngine.ts` (FROZEN). · Add a flag, a per-game compute, or any
  `processCompletedGame.ts` edit (that is L6b-2). · Wire ANY caller to the new store's writers — the CRUD must land
  with ZERO callers outside its own file + test (the dark/empty proof).
- Change `KBL_BACKUP_VERSION` (stays 2). · Add a second index (only `by_scope`). · Add an `if (oldVersion < N)`
  migration branch. · Add `includedStores` to the kbl-tracker schema. · Use a separate DB (the ruling pins the shared
  `kbl-tracker` DB; the parity lockstep IS the safety mechanism).
- Touch the LIVE cumulative-fame paths (byte-unchanged): `seasonAggregator.ts` (`aggregateFameEvents`) ·
  `salaryCalculator.ts` (`calculateFameModifier`, :98/:805) · `seasonTransitionEngine.ts` (:171/:176) ·
  `fameEngine.ts` (`getFameTier` L349-374, `applyChampionshipFame` L896-906) · `useFameTracking.ts` ·
  `GameTracker.tsx` fame UI · `fameIntegration.ts` · `reporter.ts` `FameTier` · `game.ts` `FameLevel` ·
  `eliminationRunFameStorage.ts` (whole file). · Add any field to `PersistedGameState`.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · `npm run build` exit 0 · FULL suite = only the 2 characterized fails
(`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`) + the new fame-store tests, ZERO new reds. Run specifically:
`franchiseFameRecordsStorage.test.ts` · `backupRestore.franchiseParity.test.ts` · `franchiseSaveSlotManifest.test.ts`.
Greps: `TRACKER_DB_VERSION === 19` AND `STATIC_DATABASE_SCHEMAS['kbl-tracker'].version === 19` AND
`KBL_BACKUP_VERSION === 2`; the new store file imports `getTrackerDb` and NOT `indexedDB.open`/`onupgradeneeded`; the
new store's writer functions have ZERO non-test callers (grep the function names across `src/`); `fameModel.ts` +
`fameEngine.ts` + every do-not-touch live-fame file BYTE-UNCHANGED (`git diff` shows none of them).

**STOP IF:** the keyPath/index can't byte-match across all three registries · the pin-trap or round-trip can't pass
without touching a live store · adding the store forces a `KBL_BACKUP_VERSION` change to keep restore green · you find
you need to edit `fameModel.ts` or wire a writer to make a test pass.

**FORMAT:** 1. Files changed (every path + total changed-path count + passing-test count). 2. Each change w/ the
contract item it satisfies. 3. Verification output pasted (tsc/build/full-suite + the 3 targeted tests + the
byte-unchanged greps). 4. "L6b-1 complete" OR "BLOCKED: [reason]".

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited by Opus
(full-suite re-run, store round-trip, the pin-trap + parity-guard green, both version constants at 19,
`KBL_BACKUP_VERSION` still 2, zero non-test callers, live-fame byte-unchanged).

**Status:** VERIFIED + COMMITTED `3b36d35` (2026-06-17, attended). Dark/EMPTY (store + parity only; no writer, no
flag, no live behavior). L6b-2 (flag + per-game dark compute + spine wiring, the live-game-path/browser-batch half)
follows next.

**AUDIT + EXECUTION RECORD (Opus 4.8, auditor ≠ builder):** Dispatch #1 BLOCKED correctly — Codex refused to touch
`franchiseSeasonLedgerStorage.test.ts` (a non-allowed file that hard-pins `TRACKER_DB_VERSION===18` + the full
store-list). Captain swept ALL version/store-list pins (the 3 reporter tests use `arrayContaining`=presence/safe;
`leagueBuilderStorageV6Migration` = different DB; `backupRestore.franchiseParity` set-equality auto-greens once both
registries match), added the one real file to the allowed list, re-dispatched. Codex #2 built clean → Opus
independently re-ran: **tsc 0 · build 0 · FULL suite 7,269 pass / 2 fail (7,271 total, 408 files)** = the characterized
set ONLY (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds; EXACT reconciliation from 7,265/407
(+4 new store tests, +1 file). **Read every diff + grep-verified:** store file imports `getTrackerDb` only (no
`indexedDB.open`/`onupgradeneeded`), 4-part key + single `by_scope` index + defensive re-filter, `syncEngine`
guarded; trackerDb v18→19 idempotent block (no `oldVersion` branch); backupRestore entry `optional:true` keyPath
byte-matches trackerDb + `STATIC_DATABASE_SCHEMAS` version 18→19 lockstep; **`KBL_BACKUP_VERSION` stays 2**; syncConfig
entry; ledger pin updated (18→19 + store added). **Dark/EMPTY PROVEN:** the writer fns have ZERO non-test callers.
Pin-trap `toEqual(['by_scope'])` present; parity round-trip + manifest extended. **Live-fame byte-unchanged:**
`fameModel`/`fameEngine`/`seasonAggregator`/`salaryCalculator`/`seasonTransitionEngine`/`useFameTracking`/
`fameIntegration`/`GameTracker`/`reporter`/`game.ts`/`eliminationRunFameStorage`/`processCompletedGame`/
`franchisePhase2Flags` all absent from the diff. **BROWSER-BATCH (persistence/data-shape, prioritized):** verify a
real franchise DB migrates v18→v19 cleanly + backup/restore round-trips (no writer yet, so the store is empty — this
is a schema-migration + backup-parity check, not a feature check). Lesson captured to memory (the
`franchiseSeasonLedgerStorage.test.ts` version-pin trap, cf. `8ba0538`).

---

## L6b-2 — the Phase-2 fame flag + per-game DARK fame compute + post-game wiring — 2026-06-17 (attended)

**ROUTE:** Codex 5.5 | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). Attended. SMB4-asset (fame);
§20 LOCKED design. Depends on **L6b-1 `3b36d35`** (the `franchiseFameRecords` store). RULED in DECISIONS_LOG "L6
(Fame) plan + defaults" (2026-06-17, lines 1238-1245) + the soul-layer GREENLIGHT + **JK split ruling** (L6b-2 = the
compute half) + **JK ruling (2026-06-17): DEFER the WAR-legitimacy gravity** — fame stays EVENT-DRIVEN in v1; the
`applyWarLegitimacyGravity` function exists (L6a) and wires at the activation/sim-gate wave. Grounding workflow
`wf_57cb7d14-758` (reader #4 phase-2 flag · reader #5 post-game spine · reader #1 engine surface). Mirrors L3b (a
flag-gated DARK writer, defense-in-depth) + D9d-1 (the `if (trueValueScope)` post-game capture, idempotent +
try/catch + regular-season-only). **LIVE-GAME-PATH ticket → BROWSER-BATCH** (the awaited compute extends the
game-end critical path). The L6a engine (`src/engines/fameModel.ts`) + the L6b-1 store
(`src/utils/franchiseFameRecordsStorage.ts`) are FROZEN as APIs — call them, do not edit.

You are the L6b-2 builder (Codex). Wire a per-game fame compute that reads each active player's stored fame
running-state, evolves it from THIS game's fame activity (decay-on-write), and persists it — but ONLY when a new
Phase-2 fame flag is ON (default OFF, defense-in-depth at the writer AND the call site). With the flag at its false
default, NOTHING writes and game-end behavior is byte-unchanged.

**GOAL:** Build the DARK per-game fame compute + its Phase-2 flag + the `processCompletedGame` wiring such that:
flag OFF (default) → zero fame writes, game-end unchanged; flag ON → each active player's `franchiseFameRecords` row
is decay-on-write updated from the game's WPA-spine + iconic fame events. No WAR gravity. No live consumer (display/
salary/morale stay on the legacy path). Firewall: no reporter/LLM import.

**SOURCE OF TRUTH:** DECISIONS_LOG.md:1238-1245 + the JK WAR-nudge-defer ruling · §20.1/§20.3 · this contract.

### SCOPE — exactly these edits

**(1) The Phase-2 fame flag — EXTEND `src/utils/franchisePhase2Flags.ts`** (same file; mirror the morale block
VERBATIM): `export const FRANCHISE_PHASE2_FAME_ENABLED_DEFAULT = false;` · module-private
`let franchisePhase2FameEnabledOverride: boolean | null = null;` ·
`export function isFranchisePhase2FameEnabled(): boolean { return franchisePhase2FameEnabledOverride ??
FRANCHISE_PHASE2_FAME_ENABLED_DEFAULT; }` · `export function setFranchisePhase2FameEnabledForTests(enabled:
boolean | null): void { franchisePhase2FameEnabledOverride = enabled; }`. DEFAULT MUST be `false`.

**(2) The DARK per-game compute — NEW `src/utils/franchiseFameCompute.ts`:**
- `export async function persistDarkFameRecordsForCompletedGame(gameState: PersistedGameState, fameScope:
  PersistedTrueValueResult, archiveOptions?: CompletedGameArchiveOptions): Promise<{ status: 'dark-noop' | 'written';
  written: number; reason?: string }>`.
- GATE 1 (writer): FIRST line — `if (!isFranchisePhase2FameEnabled()) return { status: 'dark-noop', written: 0,
  reason: 'Phase-2 fame disabled; per-game fame compute not written.' };` BEFORE any read/write.
- Scope: read `franchiseId`/`seasonId`/`statsScopeId` from `fameScope` (the `PersistedTrueValueResult`, in hand at the
  call site — do NOT re-derive). Checkpoint: MIRROR `resolveTrueValueSnapshotCheckpoint` (processCompletedGame.ts:280)
  EXACTLY — `import { getGame as getScheduledGame } from './scheduleStorage'` (the SAME import D9d-1's helper uses),
  resolve `scheduleGameId = archiveOptions?.context?.scheduleGameId ?? gameState.scheduleGameId`, then
  `getScheduledGame(scheduleGameId)` in a non-fatal try/catch; return `String(scheduledGame.gameNumber)` when
  `Number.isInteger(gameNumber) && gameNumber > 0`, else `gameState.gameId`. **DO NOT open any IndexedDB directly — NO
  `indexedDB.open`/`onupgradeneeded` anywhere in this module** (hand-rolling the `kbl-schedule` schema is a
  version-conflict / data-integrity landmine; the canonical `getGame` delegates to the shared schedule initializer).
- Player set = the UNION of `gameState.playerWpaTotals?.[].playerId` and `gameState.fameEvents?.[].playerId` (players
  with fame activity THIS game). Players with no activity are NOT written this game (decay-on-write — inactive-player
  decay is a deferred sim-gate refinement; document it).
- Per player: read the stored row via `getFranchiseFameRecord(fameScope, playerId)`; default to a neutral
  `{ heat: 0, reachFloor: 0, wasNegative: false }` when absent. Build channel-tagged fame inputs
  (`ChannelTaggedFameInput[]`): (a) the player's `playerWpaTotals.totalWpa` → `wpa_spine` channel, scaled by a NAMED
  SIM-TUNE `FAME_INPUT_TUNING.wpaToHeatScale` constant LOCAL to this module (NO magic literal; mark §20.9-tunable);
  (b) the player's `fameEvents` → `iconic_event` channel using each event's already-computed `fameValue` (map a
  clearly-defensive fame eventType to the `defensive` channel + a clearly-bench/role one to `role_player` where the
  mapping is unambiguous, else `iconic_event`). Then:
  `gameHeatInput = aggregateChannelFame(inputs).total` →
  `heat' = applyHeatUpdate(stored.heat, gameHeatInput)` →
  `reachFloor' = updateReachFloor(stored.reachFloor, heat')` →
  `wasNegative' = stored.wasNegative || heat' < FAME_TUNING.heat.neutral` (the engine's non-trade path does NOT
  maintain wasNegative — L6b-2 MUST OR-in the negative check itself). **NO `applyWarLegitimacyGravity`** (JK-deferred).
  Persist via `saveFranchiseFameRecordRows` (or upsert) a `FranchiseFameRecordRow`: the running state +
  `channelTotal`/`channelByChannel` from the breakdown + `defensiveFame = aggregateDefensiveFame(inputs)` +
  `rolePlayerFame = aggregateRolePlayerFame(inputs)` + `updatedAtCheckpoint = checkpoint`.
- `status: 'written'`, `written: <row count>`. Idempotent: re-running the same game (same checkpoint) recomputes the
  same row from the same stored input… NOTE: decay-on-write is NOT idempotent across re-runs (a second run would
  decay again). Guard re-entry: skip if the stored row's `updatedAtCheckpoint === checkpoint` for that player (do NOT
  double-apply decay for an already-processed checkpoint). State this guard explicitly.
- Firewall: import only `fameModel` (engine) + `franchiseFameRecordsStorage` (L6b-1) + the flag + `getGame as
  getScheduledGame` from `./scheduleStorage` (checkpoint only) + types. NO reporter/LLM/narrative import; NO raw
  `indexedDB.open`.

**(3) Wire (GATE 2 — call site) into `src/utils/processCompletedGame.ts`:** INSIDE the existing `if (trueValueScope) {`
block, immediately AFTER the D9d-1 `persistTrueValueSnapshotsForCompletedGame` try/catch and BEFORE
`persistProjectedDesignationsAfterTrueValue`:
`if (isFranchisePhase2FameEnabled()) { try { await persistDarkFameRecordsForCompletedGame(gameState, trueValueScope,
archiveOptions); } catch (e) { console.warn('[Fame] dark fame compute skipped for completed game ' +
gameState.gameId + ':', e); } }`. Regular-season-only is ALREADY satisfied by the enclosing
`shouldAggregateToRegularSeasonStats` block. NEVER throw into the pipeline (swallow + warn, like D9d-1).

**(4) Tests** (prefix `NODE_ENV= `): NEW `src/utils/tests/franchiseFameCompute.test.ts`:
- **DEFAULT-OFF PROOF (load-bearing, mirror `franchiseMoraleState.test.ts:95-116`):**
  `setFranchisePhase2FameEnabledForTests(false)` → run `persistDarkFameRecordsForCompletedGame` with a populated
  gameState → assert `result.status === 'dark-noop'` AND `getFranchiseFameRecord(scope, playerId)` **resolves to
  null** for every would-be target (the no-write proof — status alone is insufficient). `afterEach`
  `setFranchisePhase2FameEnabledForTests(null)`.
- **FLAG-ON path:** `set(true)` → two-game sequence proves: rows are written; `heat` decays-on-write + accrues the
  game input; `reachFloor` monotonic (never erodes across games); `wasNegative` latches true once `heat'` goes
  negative; the checkpoint re-entry guard prevents a double-decay when the same game is processed twice.
- **Firewall grep test:** the compute module source `.not.toMatch` reporter/LLM/narrative imports.
- **No-raw-DB-open grep test:** the compute module source `.not.toMatch(/indexedDB\.open|onupgradeneeded/)` (locks the
  checkpoint to the canonical `getScheduledGame`, no duplicated schedule schema).

**ALLOWED files:** NEW `src/utils/franchiseFameCompute.ts` + NEW `src/utils/tests/franchiseFameCompute.test.ts` ·
EDIT `src/utils/franchisePhase2Flags.ts`, `src/utils/processCompletedGame.ts`. Type/function imports of
`../engines/fameModel` + `./franchiseFameRecordsStorage` + `getGame as getScheduledGame` from `./scheduleStorage`.
NOTHING else.

**DO NOT:**
- Edit `src/engines/fameModel.ts` / `fameEngine.ts` / `src/utils/franchiseFameRecordsStorage.ts` (FROZEN — call only).
- Apply `applyWarLegitimacyGravity` (JK-deferred — fame stays event-driven). · Flip the flag default to `true`. ·
  Gate the PURE engine fns (only PERSISTENCE is gated). · Add a field to `PersistedGameState` (read existing
  `fameEvents`/`playerWpaTotals` only — both gameStorage copies trap). · Recompute WPA (it is already on
  `gameState.playerWpaTotals`).
- Touch the LIVE cumulative-fame paths (byte-unchanged): `seasonAggregator.ts` (`aggregateFameEvents`) ·
  `salaryCalculator.ts` (`calculateFameModifier`) · `seasonTransitionEngine.ts` · `useFameTracking.ts` ·
  `GameTracker.tsx` · `fameIntegration.ts` · `fameEngine.ts` `getFameTier`/`applyChampionshipFame` · `reporter.ts` ·
  `eliminationRunFameStorage.ts`. · Feed fame into any salary/morale/reporter/UI consumer (deferred post-D13). · Fill
  the L3 `fame` morale tap. · Import any reporter/LLM/narrative module into the spine or the compute.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · FULL suite = only the 2 characterized fails + the new
compute tests, ZERO new reds. Greps: `FRANCHISE_PHASE2_FAME_ENABLED_DEFAULT = false`; the compute module imports no
reporter/LLM/narrative; no `applyWarLegitimacyGravity` call anywhere in the new code; `fameModel.ts`/`fameEngine.ts`/
`franchiseFameRecordsStorage.ts` + every do-not-touch live-fame file BYTE-UNCHANGED (`git diff`); the
`processCompletedGame` edit is the ONLY non-test/flag/compute change and is wrapped in `isFranchisePhase2FameEnabled()`
+ try/catch.

**STOP IF:** the heat input can't be built from existing `gameState` fields without recomputing WPA · the default-OFF
null-readback can't pass (a write is leaking past the gate) · `statsScopeId`/`seasonId` are NOT equal on
`trueValueScope` (the store assumes equality) · you need to edit `fameModel.ts` or `franchiseFameRecordsStorage.ts` to
make a test pass · the checkpoint re-entry guard can't prevent double-decay.

**FORMAT:** 1. Files changed (every path + total count + passing-test count). 2. Each change w/ the contract item it
satisfies. 3. Verification output pasted (tsc/build/full-suite + the new tests + the byte-unchanged greps + the
default-OFF null-readback proof). 4. "L6b-2 complete" OR "BLOCKED: [reason]".

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited by Opus
(full-suite re-run, the default-OFF null-readback proof, decay/ratchet/wasNegative-latch across two games, live-fame +
engine + store byte-unchanged, the wiring gated + swallowing).

**Status:** VERIFIED + COMMITTED `5a7685a` (2026-06-17, attended). Dark (flag OFF by default; no live behavior).
JK ruled the one open fork: inactive-player heat does NOT decay (only active-player rows written per game — sim-gate
refinement). Status-nudge + WAR-gravity channels deferred (event-driven v1: wpa_spine + iconic); `wpaToHeatScale` is a
named SIM-TUNE placeholder (=10). **L6 (Fame) COMPLETE** (L6a `7359cbf` + L6b-1 `3b36d35` + L6b-2 `5a7685a`).

**AUDIT + EXECUTION RECORD (Opus 4.8, auditor ≠ builder):** Codex built → Opus independently audited; one FIX round.
**Build #1 correct EXCEPT one data-integrity defect:** the checkpoint resolver hand-rolled a raw
`indexedDB.open('kbl-schedule', 2)` + duplicated `onupgradeneeded` schema (version-conflict / schema-drift class —
the prior SIM-hang root cause) instead of the canonical `getGame` from `scheduleStorage` that D9d-1 uses. Latent (dark
+ untested path: fixtures carry no `scheduleGameId`), but never committed as-is. Root cause = the contract's import
allow-list omitted `scheduleStorage`; contract corrected + a surgical fix re-dispatched. **Fix verified:**
`resolveFameCheckpoint` now mirrors `resolveTrueValueSnapshotCheckpoint` exactly (`getScheduledGame`,
`String(gameNumber)` when valid else `gameState.gameId`); zero `indexedDB.open`/`onupgradeneeded` in the module
(locked by a new source-scan test); `scheduleStorage.ts` byte-unchanged. **The rest passed first audit:** flag mirrors
the morale block (default false); per-game recipe correct — `applyHeatUpdate` decay-on-write, `updateReachFloor`
ratchet, `wasNegative = stored || heat'<neutral` (engine-gap closed), re-entry guard skips an already-processed
checkpoint; channel mapping (defensive/role_player/iconic) + named `wpaToHeatScale`; NO `applyWarLegitimacyGravity`;
firewall (no reporter/LLM). Call site gated by `isFranchisePhase2FameEnabled()` + try/catch, after the D9d-1 snapshot
capture, before designations, regular-season-only by the enclosing block. **Tests:** default-OFF null-readback proof
(status dark-noop AND every would-be row reads null), flag-ON two-game decay/ratchet/latch/re-entry (math
hand-verified: heat 0→10→−3.5, reachFloor ratchets, `wasNegative` latches, re-run writes 0), firewall +
no-raw-open scans. **Independent re-run:** tsc 0 · build 0 · FULL suite **7,273 pass / 2 characterized fail (7,275
total, 409 files)**, ZERO new reds (exact reconciliation +4 tests / +1 file from 7,269/408). `fameModel`/`fameEngine`/
`franchiseFameRecordsStorage` + the live-fame paths byte-unchanged. **BROWSER-BATCH (live-game-path):** complete a real
franchise game — confirm flag-OFF (production default) writes NOTHING + the game still archives within the
PROCESSING_TIMEOUT; (post-D13, flag-ON) fame snapshots persist per game.

---

## L5a — the §8 Fan-Morale Ratings DAMPENER primitive (pure engine) — 2026-06-17 (AUTH-4 autonomous)

**ROUTE:** Codex 5.5 | high reasoning effort → Opus 4.8 audit (auditor ≠ builder). **AUTH-4 unattended overnight** —
spec-bounded build, documented conservative defaults where the spec is silent, no stop for JK. SMB4-asset (fan
morale / personality); §8 + §6 design LOCKED ("shape locked, values sim-tuned"). DSTACK:75 (L5 owns the §8 dampener
PRIMITIVE; L8 consumes it). Spec §8 (FRANCHISE_V1_LIVING_SEASON_SPEC.md:126-147) + §6 modifiers (:106-116) + §13 tooth
#1 (:225). Mirrors L3a (`masterMoraleMatrix.ts`) / L6a (`fameModel.ts`): a PURE, deterministic, sim-tuned engine with
NO IO, NO store, NO flag — its consumer (L8 ratings checkpoint) is built later; until then it has no live caller.

You are the L5a builder (Codex). Build ONLY the pure §8 dampener engine + its unit tests. No store, no wiring, no flag,
no consumer. The existing `fanMoraleEngine.ts` + `masterMoraleMatrix.ts` are reuse sources (type imports) — do NOT edit
them.

**GOAL:** A NEW pure `src/engines/fanMoraleDampener.ts` exporting `applyFanMoraleDampener(...)` — a DIRECTIONAL BRAKE
that softens ONLY counter-trend ratings swings (never amplifies, never flips sign), with strength = directional fan
morale × personality multiplier × (Resilience for down-moves / Ambition for up-moves) × Loyalty amplification. All
magnitudes in a single SIM-TUNE `FAN_DAMPENER_TUNING` config; the SHAPE is locked, the VALUES are §16-sim-gate-owned
placeholders.

**SOURCE OF TRUTH:** §8 (:126-147) — esp. the formula (:134) + the personality matrix (:138-145) + the brake/
counter-trend rules (:130-132); §6 (:110-116) — Loyalty amplifies, Ambition=up-moves, Resilience=down-moves; LS-11.

### SCOPE — exactly these edits

**(1) NEW `src/engines/fanMoraleDampener.ts`** (pure, deterministic — no `Date.now`/`Math.random`/IO/store/React):
- Import `CanonicalPersonality` (TYPE) from `./masterMoraleMatrix` and `HiddenModifiers` (TYPE) from `../types/game`
  (the 0-100 loyalty/ambition/resilience/charisma). Reuse — do NOT redefine the personality union; do NOT use the
  salaryCalculator TitleCase `Personality` (the soul layer is UPPERCASE `CanonicalPersonality`).
- `export interface FanDampenerTuning { baseStrength: number; neutralMorale: number; maxDampen: number;
  personalityMultiplier: Record<CanonicalPersonality, { down: number; up: number }>; loyaltyAmplification: { atZero:
  number; atFull: number }; resilienceWeight: { atZero: number; atFull: number }; ambitionWeight: { atZero: number;
  atFull: number }; }` (or equivalent — the point is EVERY magnitude is a named field, not a scattered literal).
- `export const FAN_DAMPENER_TUNING` with the §8 STARTING values (comment each as §16 SIM-TUNE):
  `neutralMorale: 50` (fan morale is 0-99, CONTENT band 55-74); personality multipliers from §8 (symmetric except
  Droopy's asymmetry): COMPETITIVE {down:1.0,up:1.0}, TOUGH {1.0,1.0}, RELAXED {1.15,1.15}, JOLLY {1.15,1.15}, TIMID
  {0.85,0.85}, EGOTISTICAL {0.5,0.5}, **DROOPY {down:0.7, up:0.5}** (§8:145 "reduced AND asymmetric — quick to feel
  the negative, slow to feel team-driven lift" → less up-shielding); `loyaltyAmplification {atZero:1.0, atFull:1.4}`
  (§8 "High Loyalty ~1.4x" modeled as the LOYALTY-MODIFIER amplification, since Loyalty is a hidden modifier not a
  personality type — DEFAULT-TAKEN, documented); `resilienceWeight`/`ambitionWeight {atZero:~0.6, atFull:~1.0}`
  (a low-resilience player cracks → less down-shielding; low-ambition plateaus → less up-shielding); `baseStrength`
  + `maxDampen` placeholders (e.g. baseStrength 0.6, maxDampen 0.9 — a hard ceiling so the brake never zeroes a swing).
- `export interface FanDampenerResult { dampenedDelta: number; applied: boolean; dampenStrength: number; direction:
  'with-trend' | 'counter-trend-up' | 'counter-trend-down'; reason: string; }`.
- `export function applyFanMoraleDampener(ratingDelta: number, teamFanMorale: number, personality:
  CanonicalPersonality, modifiers: Pick<HiddenModifiers,'loyalty'|'ambition'|'resilience'>, config: FanDampenerTuning =
  FAN_DAMPENER_TUNING): FanDampenerResult`:
  1. `teamTrend = teamFanMorale >= config.neutralMorale ? 'positive' : 'negative'` (fan morale proxies how the team is
     playing). `moraleDistance = |teamFanMorale − neutralMorale| / neutralMorale` (0..~1, directional magnitude).
  2. COUNTER-TREND test (the brake only ever softens the move running AGAINST the team trend): high morale (positive
     trend) + `ratingDelta < 0` → counter-trend-down (soften a drop, use RESILIENCE); low morale (negative trend) +
     `ratingDelta > 0` → counter-trend-up (soften a gain, use AMBITION). WITH-TREND (or `ratingDelta === 0`) → return
     `{ dampenedDelta: ratingDelta, applied: false, dampenStrength: 0, direction: 'with-trend', ... }` UNCHANGED.
  3. Counter-trend: `dampenStrength = clamp( baseStrength × moraleDistance × personalityMultiplier[personality][down|up]
     × modifierWeight(down→resilience, up→ambition) × loyaltyAmp(loyalty), 0, maxDampen )` where the weight/amp helpers
     lerp atZero→atFull over the 0-100 modifier. `dampenedDelta = ratingDelta × (1 − dampenStrength)` — SAME SIGN,
     SMALLER magnitude (a brake). Return `applied: true` + the strength + direction + a human reason.
- Pure helpers (`lerp01`, the counter-trend classifier) as needed; clamp everything.

**(2) NEW `src/engines/__tests__/fanMoraleDampener.test.ts`** (deterministic):
- WITH-TREND pass-through: high morale + positive delta → unchanged (applied:false); low morale + negative delta →
  unchanged; `ratingDelta === 0` → unchanged.
- COUNTER-TREND brake: high morale + negative delta → magnitude REDUCED, SAME sign, never below `(1−maxDampen)×delta`;
  low morale + positive delta → reduced. NEVER flips sign, NEVER increases magnitude (assert `|dampened| <= |delta|`).
- Direction routing: a down-move uses Resilience (vary resilience → changes the down-dampen), an up-move uses Ambition
  (vary ambition → changes the up-dampen); Resilience does NOT affect an up-move and vice-versa.
- Personality spread: a high-Loyalty COMPETITIVE on a hot team is shielded MORE from a counter-trend drop than an
  EGOTISTICAL with the same morale/modifiers; Droopy's up-shield < its down-shield (asymmetry).
- Loyalty amplification: higher loyalty → stronger dampen (more shielding).
- Determinism: same inputs → same output; no `Math.random`/`Date.now`.

**ALLOWED files:** NEW `src/engines/fanMoraleDampener.ts` + NEW `src/engines/__tests__/fanMoraleDampener.test.ts`.
TYPE-only imports of `./masterMoraleMatrix` (`CanonicalPersonality`) + `../types/game` (`HiddenModifiers`). NOTHING
else.

**DO NOT:** edit `masterMoraleMatrix.ts` / `fanMoraleEngine.ts` / `fameModel.ts` / any store / any flag / any UI ·
wire a consumer (L8 consumes this later) · touch persistence/IndexedDB · import a reporter/LLM · use the
salaryCalculator `Personality` (TitleCase) · scatter magic numbers (every magnitude → a named `FAN_DAMPENER_TUNING`
field) · make the brake able to flip a sign or amplify a swing.

**VERIFICATION (prefix `NODE_ENV= `):** tsc 0 · build 0 · FULL suite = only the 2 characterized fails
(`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`) + the new dampener tests, ZERO new reds. Greps: the new engine
imports no store/persistence/React/reporter/LLM; no `Math.random`/`Date.now`; `masterMoraleMatrix.ts`/
`fanMoraleEngine.ts` BYTE-UNCHANGED (`git diff` empty).

**STOP IF:** the brake can't stay a pure sign-preserving magnitude-reducer · the counter-trend rule forces reading a
team win/loss source not derivable from `teamFanMorale` · honoring the §8 shape needs editing a frozen engine.

**FORMAT:** 1. Files changed (paths + count + passing-test count). 2. Each change w/ the §8/§6 line it satisfies.
3. Verification output (tsc/build/full-suite + the new tests + the byte-unchanged greps). 4. "L5a complete" OR
"BLOCKED: [reason]".

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited by Opus
(full-suite re-run, the brake invariants `|dampened|<=|delta|` + sign-preserved + with-trend-untouched, direction→
modifier routing, byte-unchanged frozen engines).

**Status:** VERIFIED + COMMITTED `428f7cb` (2026-06-17, AUTH-4). Pure engine; no consumer until L8. DEFAULTS-TAKEN
(§16-tunable): Loyalty-1.4 = loyalty-modifier amplification (not a personality row); Droopy {down:0.7,up:0.5};
baseStrength 0.6 / maxDampen 0.9 / resilience+ambition atZero 0.6. L5b (flashpoint-decay store) + L5c (trade-requests)
+ L5d (reporter tooth) follow.

**AUDIT + EXECUTION RECORD (Opus 4.8, auditor ≠ builder):** Codex built → Opus independently re-ran: tsc 0 · build 0 ·
FULL suite **7,280 pass / 2 characterized fail (7,282 total, 410 files)** = characterized set only, ZERO new reds
(exact reconciliation +7 tests / +1 file from 7,273/409). **Read the engine + test in full:** PURE (imports only the
TYPE `CanonicalPersonality` + `HiddenModifiers`; no store/IO/React/reporter/LLM; no `Math.random`/`Date.now`). §8
correct — `classifyCounterTrend` only dampens a counter-trend move (high morale + drop → resilience-routed; low morale
+ gain → ambition-routed; with-trend or zero-delta passes through `applied:false`); `dampenStrength` clamped to
`maxDampen` so `dampenedDelta = delta × (1−strength)` is a **sign-preserving magnitude reducer** (the `maxDampen` clamp
is load-bearing — high-loyalty RELAXED would otherwise exceed 0.9). Direction→modifier routing isolated (ambition
doesn't touch down-moves, resilience doesn't touch up-moves — test-proven). Personality spread (COMPETITIVE > EGO),
Droopy up<down asymmetry, loyalty amplification, determinism — all test-proven with real assertions
(`expectBrakeInvariant` checks `|dampened| ≤ |delta|` + `Math.sign`). `masterMoraleMatrix.ts`/`fanMoraleEngine.ts`
BYTE-UNCHANGED. No browser obligation (pure, no live surface).


---

## L5b — Flashpoint-decay accumulator (NEW dark store + dark per-game fan-morale tax)

**ROUTE:** Codex 5.5 | very-high reasoning effort (NEW IndexedDB store + persistence + backup parity + game-end wiring) → Opus 4.8 audit (auditor ≠ builder) → JK browser sign-off (batched, persistence-prioritized).

**ROLE:** You are the L-stack builder (Codex). Build the L5b flashpoint-decay accumulator: a NEW dark IndexedDB store + a dark, default-OFF, per-game fan-morale tax on "turned-on" players (locked Albatross / trade-demanders) who stay on the roster — a compounding per-game bleed, not a cliff (§13 tooth #2 / LS-19). It mirrors the proven L6b store+parity+flag+wiring pattern EXACTLY.

**GOAL:** Add (1) the `franchiseFlashpointDecay` store (per-player-season running accumulator), with full backup/sync parity, bumping trackerDb v19→v20; (2) a default-OFF Phase-2 flashpoint flag; (3) a dark per-game compute wired into `processCompletedGame` — for each player currently flagged "turned-on" (the flag source list is SEAM-NEUTRAL / empty until L7 Albatross + L10/L13 trade-demander land), accumulate a compounding per-game fan-morale tax. With the flag OFF (shipped default) AND no input source wired, this writes NOTHING and is purely additive/dark.

**SOURCE OF TRUTH:** `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §13 tooth #2 (lines 226) + LS-19 (line 322) + Channel B (line 402, "Albatross = ongoing irritation, compounding via the decay-on-ignored-flashpoint"); `FRANCHISE_V1_LIVING_SEASON_DSTACK.md` L5 ticket (line 75, "Owns the flashpoint-decay accumulator (new store; inputs = L7 Albatross + L10/L13 trade-demander)"); the §C-4 per-ticket backup Definition-of-Done (DSTACK lines 126-129). MIRROR PRECEDENT: L6b-1 `3b36d35` (`franchiseFameRecordsStorage.ts` + trackerDb v18→v19 + backup parity) + L6b-2 `5a7685a` (`franchisePhase2Flags.ts` flag + `franchiseFameCompute.ts` dark compute + `processCompletedGame.ts` gated wiring).

### DESIGN (build to spec; AUTH-4 DEFAULTS-TAKEN where §13 is silent on magnitudes — all sim-tunable)

**The store row** `FranchiseFlashpointDecayRow` (running accumulator, keyed `[franchiseId, seasonId, statsScopeId, playerId]`, index `by_scope`):
- scope fields (franchiseId/seasonId/statsScopeId) + `playerId`
- `flashpointKind: 'albatross' | 'trade_demander' | null` — the active turned-on reason (null = not currently turned-on; the SEAM input, empty until L7/L10/L13)
- `consecutiveGamesUnresolved: number` — how many games the player has stayed turned-on (the compounding lever)
- `accumulatedFanMoraleTax: number` — the running negative fan-morale total bled so far this season (≤ 0)
- `lastGameTax: number` — the per-game tax applied at the most recent checkpoint (≤ 0)
- `updatedAtCheckpoint: string` — re-entry guard (skip an already-processed checkpoint; no double-decay), resolved via the canonical `getScheduledGame` (gameNumber) with fallback to `gameState.gameId` — EXACTLY as `franchiseFameCompute.ts` does it (NO raw `indexedDB.open`, NO hand-rolled kbl-schedule open).

**The decay engine** (PURE, NEW `src/engines/flashpointDecay.ts`): `computeFlashpointGameTax(state, kind, tuning)` → returns the per-game tax for a player who stayed turned-on this game. Shape: a small per-game base bleed that COMPOUNDS with `consecutiveGamesUnresolved` (a gentle multiplier ramp, CLAMPED to a per-game cap so it stays "a compounding tax, not a cliff" per §13). When `kind === null` (not turned-on) → tax 0 and the accumulator does NOT grow (a resolved/never-flagged player bleeds nothing). All magnitudes in a named `FLASHPOINT_DECAY_TUNING` (shape-locked, values Sim-Gate-owned per §16). DEFAULTS-TAKEN (document them): `baseGameTax -0.5` fan-morale pts/game, `compoundPerGame 0.10` (ramp +10%/consecutive game), `maxGameTax -3.0` (per-game clamp), albatross vs trade_demander same base in v1 (sim-tune later). PURE — no Math.random/Date.now/IO/store/reporter.

**The compute** (NEW `src/utils/franchiseFlashpointDecayCompute.ts`): `persistDarkFlashpointDecayForCompletedGame(gameState, scope, archiveOptions)` — mirrors `franchiseFameCompute.ts`:
- dark-noop early-return when `isFranchisePhase2FlashpointEnabled()` is OFF (the shipped default) → `{status:'dark-noop', written:0}`.
- the "turned-on player" input list is a SEAM: derive it from a single explicit helper `resolveTurnedOnPlayers(scope, gameState)` that returns `[]` for now (no Albatross/trade-demander source exists pre-L7/L10/L13) — leave a clear `// SEAM: L7 Albatross + L10/L13 trade-demander fill this` comment. So even flag-ON writes nothing until those land. (This makes L5b genuinely dark + seam-neutral.)
- for each turned-on player: read the stored accumulator row (or zero-init), re-entry-guard on `updatedAtCheckpoint === checkpoint`, compute the per-game tax via the pure engine using the incremented `consecutiveGamesUnresolved`, add to `accumulatedFanMoraleTax`, persist via the store. NO fan-morale snapshot mutation in L5b (that wiring is L5's later teeth / L7); L5b only ACCUMULATES the tax artifact (decay-on-write running state). Document this boundary.

**The flag** (extend `src/utils/franchisePhase2Flags.ts`): add `FRANCHISE_PHASE2_FLASHPOINT_ENABLED_DEFAULT = false` + `isFranchisePhase2FlashpointEnabled()` + `setFranchisePhase2FlashpointEnabledForTests()` — EXACTLY mirroring the morale/fame blocks.

**The wiring** (`src/utils/processCompletedGame.ts`): inside the existing `if (trueValueScope)` block, after the `isFranchisePhase2FameEnabled()` fame compute call and before/after is fine but keep regular-season-only via the enclosing block, add a gated `if (isFranchisePhase2FlashpointEnabled()) { try { await persistDarkFlashpointDecayForCompletedGame(gameState, trueValueScope, archiveOptions); } catch (e) { console.warn('[Flashpoint] ...', e); } }` — defense-in-depth (flag checked at BOTH the writer and the call site, like fame).

### PERSISTENCE / BACKUP DoD (the §C-4 lockstep — every line is mandatory)

1. `src/utils/trackerDb.ts`: bump `TRACKER_DB_VERSION` 19→20; add an idempotent v20 store block for `franchiseFlashpointDecay` (keyPath `['franchiseId','seasonId','statsScopeId','playerId']`, index `by_scope` on `['franchiseId','seasonId','statsScopeId']`) — same shape as the v19 `franchiseFameRecords` block.
2. `src/utils/backupRestore.ts`: add the `franchiseFlashpointDecay` entry to `trackerStores` (keyPath + `by_scope` index + `optional: true`, mirroring `franchiseFameRecords` at line 150); bump `STATIC_DATABASE_SCHEMAS['kbl-tracker'].version` 19→20 (line 324). `KBL_BACKUP_VERSION` STAYS 2 (adding a store grows coverage, not file format — D9a/L6b-1 precedent).
3. `src/utils/syncConfig.ts`: add the `franchiseFlashpointDecay: ['franchiseId','seasonId','statsScopeId','playerId']` SYNC_REGISTRY entry (after `franchiseFameRecords`, line 15).
4. **VERSION-PIN TRAP — `src/utils/tests/franchiseSeasonLedgerStorage.test.ts`:** change `expect(TRACKER_DB_VERSION).toBe(19)` → `toBe(20)` (line 106) AND add `'franchiseFlashpointDecay'` to the alphabetically-sorted `expectedTrackerStores` array (between `franchiseFameRecords` and `franchiseSeasonLedgerRows`, line 39). THIS FILE IS MANDATORY ON EVERY STORE ADD (the `trackerdb-version-bump-test-pins` trap).
5. `src/utils/tests/backupRestore.franchiseParity.test.ts`: add `franchiseFlashpointDecay` to the tx store list + a `.put(flashpointRow)` + the round-trip `.toEqual` assertion (mirror the `franchiseFameRecords` lines at 178/189/260/304).
6. `src/utils/tests/franchiseSaveSlotManifest.test.ts`: add the SYNC_REGISTRY `.toHaveProperty('franchiseFlashpointDecay', [...])` + the `STATIC_DATABASE_SCHEMAS...stores.franchiseFlashpointDecay` `.toMatchObject` assertions (mirror lines 1203/1237).

### TESTS (NEW + extended)

- NEW `src/utils/tests/franchiseFlashpointDecayStorage.test.ts`: by_scope pin-trap (only `['by_scope']`), round-trip + `syncEngine.upsert`, scope isolation, source-scan guard (uses `getTrackerDb`, NO `indexedDB.open`/`DB_NAME='kbl-tracker'`).
- NEW `src/engines/__tests__/flashpointDecay.test.ts` (pure/deterministic): `kind===null` → tax 0; a turned-on player → negative per-game tax; COMPOUNDING (game 3 tax magnitude > game 1) but CLAMPED at `maxGameTax` (never exceeds the cliff cap); determinism (no Math.random/Date.now).
- NEW `src/utils/tests/franchiseFlashpointDecayCompute.test.ts`: default-OFF → dark-noop, null readback (nothing written); flag-ON but SEAM empty (`resolveTurnedOnPlayers` returns []) → STILL writes nothing (seam-neutral proof); re-entry guard (same checkpoint twice → no double-accumulate) — use a test seam/spy or a temporary turned-on stub array confined to the test; firewall + no-raw-indexedDB-open source scans.

**ALLOWED files:** NEW `src/engines/flashpointDecay.ts` · NEW `src/engines/__tests__/flashpointDecay.test.ts` · NEW `src/utils/franchiseFlashpointDecayStorage.ts` · NEW `src/utils/franchiseFlashpointDecayCompute.ts` · NEW `src/utils/tests/franchiseFlashpointDecayStorage.test.ts` · NEW `src/utils/tests/franchiseFlashpointDecayCompute.test.ts` · EDIT `src/utils/trackerDb.ts` · EDIT `src/utils/backupRestore.ts` · EDIT `src/utils/syncConfig.ts` · EDIT `src/utils/franchisePhase2Flags.ts` · EDIT `src/utils/processCompletedGame.ts` · EDIT `src/utils/tests/franchiseSeasonLedgerStorage.test.ts` · EDIT `src/utils/tests/backupRestore.franchiseParity.test.ts` · EDIT `src/utils/tests/franchiseSaveSlotManifest.test.ts`.

**DO NOT:** mutate any fan-morale snapshot / player-morale store (L5b only ACCUMULATES the tax artifact — the live morale-mutation teeth are later L5/L7) · flip any flag default to true · touch `fameModel.ts`/`fanMoraleDampener.ts`/`masterMoraleMatrix.ts`/`fanMoraleEngine.ts`/`franchiseFameCompute.ts` · `indexedDB.open` directly anywhere (use `getTrackerDb`) · hand-roll a kbl-schedule open (use the canonical `getScheduledGame`) · change `KBL_BACKUP_VERSION` · invent a real turned-on source (it is a SEAM returning [] until L7/L10/L13) · scatter magic numbers (every magnitude → `FLASHPOINT_DECAY_TUNING`) · import a reporter/LLM/React · make the tax positive (it is a bleed, ≤ 0) or uncapped (clamp to `maxGameTax`).

**VERIFICATION (prefix `NODE_ENV= `; node `~/.nvm/versions/node/v20.20.0/bin`):** tsc 0 · build 0 · FULL suite = only the 2 characterized fails (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`) + the new L5b tests, ZERO new reds. Greps: `franchiseFlashpointDecayStorage.ts`/`Compute.ts` import no raw `indexedDB.open`/`DB_NAME='kbl-tracker'` and no raw kbl-schedule open; the engine is pure (no Math.random/Date.now/IO/store/reporter); `fameModel.ts`/`franchiseFameCompute.ts`/`fanMoraleDampener.ts`/`masterMoraleMatrix.ts` BYTE-UNCHANGED (`git diff` empty); flag defaults all false; `KBL_BACKUP_VERSION` still 2.

**STOP IF:** honoring "compounding tax not a cliff" forces an unclamped accumulator · the seam can't return [] cleanly (a real turned-on source is required to compile) · a parity-guard / round-trip test goes red and 2 fix-iterations can't clear it (→ SET-ASIDE per AUTH-4) · any frozen engine must change.

**FORMAT:** 1. Files changed (every path + total count + passing-test count). 2. Each change w/ the §13/LS-19/§C-4 line it satisfies. 3. Verification output (tsc/build/full-suite + the new tests + the byte-unchanged + pin greps). 4. "L5b complete" OR "BLOCKED: [reason]".

Use very-high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited by Opus (full-suite re-run, the v19→v20 + pin-trap reconciliation, the dark-noop + seam-neutral + re-entry-guard proofs, the compounding-but-clamped invariant, byte-unchanged frozen engines, backup round-trip parity).

**Status:** COMMITTED `5ebb148` (2026-06-17, AUTH-4 host resume — host closed the 2 previously-unobserved gates: `NODE_ENV= npm run build` exit 0 + full suite 7,298 pass / 2 characterized fail [`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`], ZERO new reds [+18 tests / +3 files = L5b's 3 new test files]; the 14 code/test files committed; sandbox junk cleaned + gitignored). [Historical sandbox-resume detail follows.] BUILT + AUDITED VERIFIED, by the Captain thread directly (no codex CLI in-sandbox); decorrelated sub-agent auditor (≠ builder) returned VERDICT VERIFIED (10/10 checklist, zero defects, faithful L6b mirror, unobserved-gate risk LOW). Observable gates cleared: tsc 0 (×2), the 6 new/affected test files = 40 tests GREEN, frozen engines byte-unchanged, flag-defaults/backup-version greps. UNOBSERVED in-sandbox (process >42s killed): full `vite build` + the full ~7,290 suite. UNCOMMITTED: the repo mount blocks git unlink (`.git/index.lock` cannot be removed). → Host must run `NODE_ENV= npm run build` + full suite (confirm build-0 + 7,280/2-char-fail baseline) and COMMIT the 15 files on `codex/franchise-v1-next`. See `AUTONOMOUS_RUN_LOG.md` (2026-06-17 L5b entry) + `WAITING_ON_JK.md`.

---

## L5c — In-season trade-request generation (PURE engine; consumed by L10/L13 later)

**ROUTE:** Codex 5.5 | high reasoning effort (pure deterministic engine, no persistence/UI) → Opus 4.8 audit (auditor ≠ builder) → standing auto-commit (no user-visible surface — pure primitive, like L5a `428f7cb` / T9a; no browser batch).

**ROLE:** You are the L-stack builder (Codex). Build the L5c in-season trade-request generation engine: a PURE, deterministic function that scores each rostered player's trade-request propensity from team fan morale + the player's loyalty / player-morale / personality, applying the §13 "sharper than obvious" inversions. It mirrors the L5a `fanMoraleDampener.ts` pure-primitive pattern EXACTLY (own TUNING table, no store, no flag, no wiring — consumed by L10 event-tap + L13 trade-demander flashpoint later, which fill L5b's `resolveTurnedOnPlayers` seam).

**GOAL:** Add ONE new pure engine `src/engines/tradeRequestGeneration.ts` exporting (1) `computeTradeRequestPropensity(player, teamFanMorale, intensity, config?)` → `{ propensity (0..1), wouldRequest, reason, components }`; (2) `rankTradeRequestCandidates(players, teamFanMorale, intensity, config?)` → the wouldRequest players sorted by propensity desc; (3) a named `TRADE_REQUEST_TUNING` config (shape-locked, §16 sim-tune). Plus its test file. NO store, NO flag, NO wiring, NO persistence — purely additive/dark, consumed later.

**SOURCE OF TRUTH:** `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §13 "Fan morale — the teeth," specifically the **"Free-agency / trade inversions (sharper than the obvious version)"** block (lines 234-236): (235) *"Loyal players are MORE likely to leave when fans are angry — their bond was to the fans and city; when that turns toxic … a hostile fanbase costs you exactly the players you would most want to keep"*; (236) *"Angry fans → more trade requests (scaled by personality + morale; low-loyalty / low-morale players bolt first)."* Plus the §10 intensity dial (line 192, "Juiced / Standard / Nerfed … scales the base rate, never a fixed count"), LS-19 (line 322), `FRANCHISE_V1_LIVING_SEASON_DSTACK.md` L5 ticket (line 75) + the F2/LSD-2 ruling (lines 181-183: "L5 keeps only the in-season trade-request generation (loyalty/morale-scaled destabilization), with an L10 event tap + an L13 trade-demander flashpoint"). MIRROR PRECEDENT: L5a `428f7cb` `src/engines/fanMoraleDampener.ts` (pure engine, own `FAN_DAMPENER_TUNING` table, `CanonicalPersonality`+`HiddenModifiers` type-only imports, consumed by L8 later). The §13 personality skeleton (egotistical ~1.5x, relaxed ~0.5x) = `MORALE_TUNING.personality.fanMoraleSensitivity` (`masterMoraleMatrix.ts:184-234`).

### DESIGN (build to spec; AUTH-4 DEFAULTS-TAKEN where §13 is silent on magnitudes — all sim-tunable)

**Inputs.** `computeTradeRequestPropensity(player, teamFanMorale, intensity, config = TRADE_REQUEST_TUNING)`:
- `teamFanMorale: number` (0-99 — `FanMorale.current`, `fanMoraleEngine.ts`).
- `player: { personality: CanonicalPersonality; playerMorale: number /*0-99*/; loyalty: number /*0-100, HiddenModifiers.loyalty*/ }`.
- `intensity: TierKey` (`'juiced' | 'standard' | 'nerfed'` — type-only import from `src/data/tierParams.ts`; §10 "reusing the pool-tier vocabulary").

**Math (encode the inversion as the headline).** Let `neutral = config.neutralMorale` (50):
- `fanSentiment = clamp((teamFanMorale - neutral) / neutral, -1, 1)` — negative = angry.
- `fanAnger = max(0, -fanSentiment)` ∈ [0,1].
- `playerDiscontent = max(0, (neutral - playerMorale) / neutral)` ∈ [0,1] — the always-on base leave driver ("low-morale players bolt first", 236).
- **Signed loyalty term (the reconciliation of 235 vs 236):** `loyaltyContribution = -(loyalty/100) * fanSentiment * config.loyaltyInversionWeight`. Fans ANGRY (fanSentiment<0) → POSITIVE → loyal players MORE likely to leave (235, the betrayed bond). Fans CONTENT (fanSentiment>0) → NEGATIVE → loyal players stay (protective). Low loyalty → ~0 either way → mercenaries driven by discontent.
- `personalityScale = config.personalitySensitivity[personality]` (egotist amplifies, relaxed dampens).
- `angerGate = config.baseAngerFloor + fanAnger * config.angerWeight` — the whole thing scales UP with fan anger (happy fans → near-zero requests overall).
- `propensity = clamp((playerDiscontent * config.discontentWeight + loyaltyContribution) * angerGate * personalityScale * config.intensityMultiplier[intensity], 0, 1)`.
- `wouldRequest = propensity >= config.requestThreshold`.
- `reason`: a stable tag (e.g. `trade_request.angry_fans_betrayed_loyalty` vs `trade_request.low_morale_discontent` vs `trade_request.content_no_request`); `components`: `{ fanAnger, playerDiscontent, loyaltyContribution, personalityScale, angerGate, intensity }` for transparency.

**`rankTradeRequestCandidates(players[], teamFanMorale, intensity, config?)`** — map each player through `computeTradeRequestPropensity`, keep `wouldRequest`, sort by `propensity` desc (stable tiebreak by playerId). Pure.

**`TRADE_REQUEST_TUNING`** (shape-locked; values Sim-Gate-owned per §16): `neutralMorale 50`, `discontentWeight 0.6`, `loyaltyInversionWeight 0.5`, `angerWeight 1.0`, `baseAngerFloor 0.0`, `requestThreshold 0.5`, `personalitySensitivity: Record<CanonicalPersonality, number>` seeded from the §13 skeleton (COMPETITIVE 1.15, RELAXED 0.5, DROOPY 1.0, JOLLY 0.9, TOUGH 0.85, TIMID 1.1, EGOTISTICAL 1.5), `intensityMultiplier: Record<TierKey, number>` (juiced 1.3, standard 1.0, nerfed 0.6). PURE — no Math.random/Date.now/IO/store/reporter/React.

**DEFAULTS-TAKEN (AUTH-4 — document in the engine header + the contract status):** the §13 235-vs-236 tension (235 "loyal leave when angry" vs 236 "low-loyalty bolt first") is reconciled by the SIGNED loyalty term gated on `fanSentiment` — loyalty PROTECTS when fans are content, INVERTS to amplify leaving when fans are hostile (honors the "sharper than obvious" headline + the stated goal "a hostile fanbase costs you exactly the players you'd most want to keep"); `loyaltyInversionWeight = 0` recovers the pure-discontent "obvious" model. The probabilistic WHO-actually-fires roll is the L10 consumer's job (seeded) — L5c emits PROPENSITY only, so it stays pure + deterministic. Placeholder magnitudes above are §16-tunable.

**ALLOWED files:** NEW `src/engines/tradeRequestGeneration.ts` · NEW `src/engines/__tests__/tradeRequestGeneration.test.ts`. NOTHING ELSE.

**DO NOT:** add a store / flag / wiring / persistence (L5c is a pure primitive consumed by L10/L13 later — like L5a) · mutate any morale/fame snapshot · touch `fanMoraleDampener.ts` / `flashpointDecay.ts` / `masterMoraleMatrix.ts` / `fanMoraleEngine.ts` / `franchiseFameCompute.ts` / `franchiseFlashpointDecay*` / `franchisePhase2Flags.ts` / `processCompletedGame.ts` · import a store / IndexedDB / reporter / LLM / React · use `Math.random` / `Date.now` / `new Date()` (pure + deterministic) · scatter magic numbers (every magnitude → `TRADE_REQUEST_TUNING`) · let `propensity` escape [0,1] (clamp) · build a real L10/L13 consumer (out of scope; L5c is generation only).

### TESTS (NEW `src/engines/__tests__/tradeRequestGeneration.test.ts`, pure/deterministic)

- **Happy-fans boundary:** high `teamFanMorale` (e.g. 85) → propensity ~0 / `wouldRequest=false` for all archetypes (happy fans → no requests).
- **THE LOYALTY INVERSION (signature test):** at LOW fan morale (e.g. 15), a HIGH-loyalty player has HIGHER propensity than an otherwise-identical LOW-loyalty player (235 inversion); at HIGH fan morale (e.g. 85), the high-loyalty player has LOWER propensity than the low-loyalty one (protective). Both directions asserted.
- **Low-morale bolts first:** holding all else equal, lower `playerMorale` → higher propensity.
- **Personality spread:** EGOTISTICAL propensity > RELAXED propensity for identical inputs.
- **Intensity dial:** juiced > standard > nerfed for identical inputs.
- **Determinism:** identical inputs → identical output; assert no `Math.random`/`Date.now` (source scan).
- **rankTradeRequestCandidates:** returns wouldRequest players sorted desc; empty when fans are happy.
- **Clamp:** propensity ∈ [0,1] across extreme inputs (loyalty 100 + morale 0 + fanMorale 0 + juiced).

**VERIFICATION (prefix `NODE_ENV= `; node `~/.nvm/versions/node/v20.20.0/bin`):** tsc 0 · build 0 · FULL suite = only the 2 characterized fails (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`) + the new L5c tests, ZERO new reds. Greps: `tradeRequestGeneration.ts` imports ONLY types (`CanonicalPersonality` from `./masterMoraleMatrix`, `HiddenModifiers` from `../types/game`, `TierKey` from `../data/tierParams`) + its own TUNING — no store/IndexedDB/reporter/React, no `Math.random`/`Date.now`/`new Date()`; `fanMoraleDampener.ts` / `flashpointDecay.ts` / `masterMoraleMatrix.ts` / `fanMoraleEngine.ts` BYTE-UNCHANGED (`git diff` empty).

**STOP IF:** the signed-loyalty term can't satisfy BOTH the angry-fans inversion AND the happy-fans protective test without a sign error (rethink the sign, don't hack the test) · purity can't hold · a frozen engine must change · a parity/suite red persists past 2 fix-iterations (→ SET-ASIDE per AUTH-4).

**FORMAT:** 1. Files changed (every path + total count + passing-test count). 2. Each change w/ the §13 line it satisfies. 3. Verification output (tsc/build/full-suite + the new tests + the purity/byte-unchanged greps). 4. "L5c complete" OR "BLOCKED: [reason]".

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited by Opus (full-suite re-run, the inversion sign-proof in BOTH fan-morale directions, purity + byte-unchanged frozen engines, the boundary/personality/intensity tests, clamp invariant).

**Status:** COMMITTED `8cd2cc1` (2026-06-17, AUTH-4 host resume). Codex 5.5 built → Opus 4.8 independently audited VERIFIED: tsc 0 / build 0 / full suite 7,307 pass / 2 characterized fail (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds (+9 tests / +1 file); the loyalty-inversion sign hand-verified in BOTH fan-morale directions; pure (3 type-only imports, no random/time/IO/store/React); frozen engines byte-unchanged; scope = exactly the 2 allowed files. Pure engine, no user surface → auto-committed.

---

## L5d — Reporter-intensity tooth (PURE engine; live reporter wiring deferred to post-D13)

**ROUTE:** Codex 5.5 | high reasoning effort (pure deterministic engine, no persistence/UI/live-reporter touch) → Opus 4.8 audit (auditor ≠ builder) → standing auto-commit (pure primitive, no user-visible surface — the live reporter is NOT touched; like L5a/L5c).

**ROLE:** You are the L-stack builder (Codex). Build the L5d reporter-intensity tooth: a PURE, deterministic engine that maps a team's FAN morale to a reporter "press heat" intensity signal — *low fan morale = the press turns up the heat* (§13 supporting teeth, line 230). It mirrors the L5a `fanMoraleDampener.ts` / L5c `tradeRequestGeneration.ts` pure-primitive pattern EXACTLY: own TUNING table, type-only imports, NO store, NO flag, NO wiring, NO persistence, NO React, NO LLM/Supabase, and it DOES NOT touch the live reporter. The live reporter column (`generateSeasonNewsTake`, LLM/Supabase, user-visible) stays BYTE-UNCHANGED — wiring this signal into it is a post-D13 activation step (the explicit seam below), NOT part of this dark build.

**GOAL:** Add ONE new pure engine `src/engines/reporterIntensity.ts` exporting `computeReporterHeat(teamFanMorale, config?)` → `{ intensity: NarrativeIntensity; heat: number /*0..1*/; toneDirective: string; components }` + a named `REPORTER_INTENSITY_TUNING` (shape-locked, §16 sim-tune). Plus its test file. Purely additive/dark; consumed at post-D13 activation.

**SOURCE OF TRUTH:** `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §13 "Fan morale — the teeth", the **Supporting teeth** line (230): *"reporter intensity (low morale = the press turns up the heat)."* `FRANCHISE_V1_LIVING_SEASON_DSTACK.md` L5 ticket (line 75, "Reporter-intensity tooth → wire fan-morale into the post-game column prompt (with L4)"). Build-DARK rule: DSTACK §E (no soul-layer consumer goes live until after D13). MIRROR PRECEDENT: L5a `428f7cb` / L5c `8cd2cc1` (pure engine, own `*_TUNING` table, type-only imports, consumed later). THE EXISTING TYPE: `NarrativeIntensity = "low" | "medium" | "high"` at `src/types/reporterPreferences.ts:1` (import type-only — output must be directly consumable by the reporter later). THE SEAM (document, do NOT wire): the live reporter hardcodes `intensity: "medium"` at `src/src_figma/app/engines/reporter/seasonNewsGenerator.ts:165`; at post-D13 activation that becomes `computeReporterHeat(fanMorale).intensity` — OUT OF SCOPE here.

### DESIGN (build to spec; AUTH-4 DEFAULTS-TAKEN where §13 is silent on magnitudes — all sim-tunable)

**`computeReporterHeat(teamFanMorale: number /*0-99*/, config = REPORTER_INTENSITY_TUNING): ReporterHeatResult`:**
- `pressHeat = clamp((config.neutralMorale - teamFanMorale) / config.neutralMorale, 0, 1)` — heat rises as fans get ANGRIER (morale below neutral). At/above neutral → heat 0 (the press is calm when fans are content; §13 only specifies the LOW-morale → turn-up-the-heat direction — DEFAULT-TAKEN: high morale = calm press, not "heated").
- `intensity: NarrativeIntensity` by band: `pressHeat < config.lowHeatBand` → `"low"`; `< config.highHeatBand` → `"medium"`; else `"high"`.
- `toneDirective: string` = `config.toneDirectives[intensity]` — a stable tag the reporter prompt will use later (e.g. `press_calm` / `press_critical` / `press_scorching`).
- `components: { teamFanMorale, pressHeat, band: intensity }`.

**`ReporterHeatResult`** interface as above. **`REPORTER_INTENSITY_TUNING`** (shape-locked; §16 SIM-TUNE placeholders): `neutralMorale 50`, `lowHeatBand 0.33`, `highHeatBand 0.66`, `toneDirectives: Record<NarrativeIntensity, string>` = `{ low: 'press_calm', medium: 'press_critical', high: 'press_scorching' }`. PURE — no Math.random/Date.now/IO/store/reporter-call/LLM/React.

**DEFAULTS-TAKEN (AUTH-4 — document in the engine header):** heat scales ONLY with fan anger (morale below neutral); at/above neutral → heat 0 / intensity `"low"` (calm press). Band thresholds 0.33/0.66 + the tone tags are §16-tunable placeholders. The engine emits the SIGNAL only; wiring it into the live LLM reporter (replacing the hardcoded `"medium"`) is a post-D13 activation step, deliberately deferred (the live reporter is user-visible + LLM/Supabase — build-dark forbids touching it now).

**ALLOWED files:** NEW `src/engines/reporterIntensity.ts` · NEW `src/engines/__tests__/reporterIntensity.test.ts`. NOTHING ELSE.

**DO NOT:** touch the live reporter (`src/src_figma/app/engines/reporter/seasonNewsGenerator.ts`, `claudeClient.ts`, `grokClient.ts`, `commentaryEngine*`, `promptBuilder*`, `src/engines/narrativeEngine.ts`) · wire into `generateSeasonNewsTake` or replace the hardcoded `"medium"` · add store/flag/persistence/Supabase/LLM/React/IndexedDB · mutate any morale snapshot · use `Math.random`/`Date.now`/`new Date()` (pure + deterministic) · scatter magic numbers (every magnitude → `REPORTER_INTENSITY_TUNING`) · let `heat` escape [0,1] · redefine `NarrativeIntensity` (import the existing type).

### TESTS (NEW `src/engines/__tests__/reporterIntensity.test.ts`, pure/deterministic)

- **Calm press at high morale:** teamFanMorale 85 → heat 0, intensity `"low"`, toneDirective `press_calm`.
- **Neutral = calm:** teamFanMorale 50 (and 60) → heat 0, intensity `"low"` (at/above neutral).
- **Heat rises as fans sour:** teamFanMorale 30 → mid-range heat / intensity `"medium"`; teamFanMorale 5 → high heat / intensity `"high"` / toneDirective `press_scorching`.
- **Monotonic:** strictly lower morale → heat is non-decreasing (sweep e.g. 99→0).
- **Band boundaries:** assert the low/medium/high transitions land at the tuned thresholds (compute the morale values at heat=0.33 and 0.66).
- **Determinism:** identical input → identical output.
- **Clamp / totality:** heat ∈ [0,1] across extremes (morale 0 and 99); intensity is always one of the 3 literals.

**VERIFICATION (prefix `NODE_ENV= `; node `~/.nvm/versions/node/v20.20.0/bin`):** tsc 0 · build 0 · FULL suite = only the 2 characterized fails (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`) + the new L5d tests, ZERO new reds. Greps: `reporterIntensity.ts` imports ONLY the `NarrativeIntensity` type (`../types/reporterPreferences`) + its own TUNING — no store/IndexedDB/reporter-engine/LLM/Supabase/React, no `Math.random`/`Date.now`/`new Date()`; `seasonNewsGenerator.ts` / `narrativeEngine.ts` / `fanMoraleDampener.ts` / `flashpointDecay.ts` / `tradeRequestGeneration.ts` BYTE-UNCHANGED (`git diff` empty).

**STOP IF:** honoring "low morale = turn up the heat" needs a non-monotonic mapping (rethink) · purity can't hold · a live reporter file must change · a suite red persists past 2 fix-iterations (→ SET-ASIDE per AUTH-4).

**FORMAT:** 1. Files changed (paths + count + passing-test count). 2. Each change w/ the §13 line it satisfies. 3. Verification output (tsc/build/full-suite + the new tests + the purity/byte-unchanged greps). 4. "L5d complete" OR "BLOCKED: [reason]".

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited by Opus (full-suite re-run, the monotonic + band-boundary proofs, purity + byte-unchanged frozen engines AND the untouched live reporter, the calm-at-neutral default).

**Status:** COMMITTED `e061e51` (2026-06-17, AUTH-4 host resume — completes L5). Codex 5.5 built → Opus 4.8 independently audited VERIFIED: tsc 0 / build 0 / full suite 7,314 pass / 2 characterized fail (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds (+7 tests / +1 file); math hand-verified (monotonic + band crossings + clamp); the live LLM reporter (`seasonNewsGenerator.ts`) + frozen engines BYTE-UNCHANGED (build-dark held); pure single type-only import; scope = exactly the 2 allowed files. Pure engine, no user surface → auto-committed.

---

## L7 — Designations Phase-2 completion (SPLIT L7a–L7d; build-dark until D13)

DSTACK L7 (line 82) is a sub-stack. SPLIT (Captain, 2026-06-17 AUTH-4 host resume), build in this order:
- **L7a — Albatross → L5b flashpoint seam** (THIS CONTRACT): fill `resolveTurnedOnPlayers` with the active-Albatross source so the already-built L5b flashpoint-decay taxes a team's Albatross who stays. Cleanest/most isolated; closes the L5b loop.
- **L7b — Designation → fame nudge (Channel C, §20.4)**: the one-time naming fame seed (Fan Favorite +2 / Albatross −1, extend to Captain/Ace/MVP) — GREENFIELD (not actually wired; the spec's "already wired" is stale). Behind the fame flag, dark.
- **L7c — Designation → fan-morale steady sentiment (Channel B / §20.6) + Channel-A amplification tilt**: Fan Favorite ongoing warmth, Albatross ongoing irritation. Builds on the existing `processCompletedGame` designation-morale-consequence path (gated by `isFranchisePhase2MoraleEnabled`).
- **L7d — Captain router effects (Charisma×2 to teammates + amplified swings) + Fan Hopeful call-up cushion + Fan Favorite double-dependency completion.**
(Cornerstone already CUT — DR-1 `b48b450`. LS-9 confirmation→auto/logged morale reversal is a separate pending item, NOT in L7a.)

### L7a — Albatross → L5b flashpoint seam

**ROUTE:** Codex 5.5 | high reasoning effort (wiring + async signature change + persistence-adjacent designation read; touches L5b's compute) → Opus 4.8 audit (auditor ≠ builder) → standing auto-commit (no user-visible surface — doubly-dark: flag OFF by default, and even ON the flashpoint store only ACCUMULATES a tax artifact, no live morale mutation).

**ROLE:** You are the L-stack builder (Codex). Fill the L5b flashpoint-decay seam: `resolveTurnedOnPlayers` currently returns `[]`; make it resolve the **active Albatross designation holder** of each team in the completed game, so the already-built per-game flashpoint-decay taxes that player (§13 tooth #2 "a turned-on player — a locked Albatross — who stays bleeds fan morale slowly every game"). DARK: still gated by the existing `isFranchisePhase2FlashpointEnabled()` (default OFF) at the call site — with the flag OFF the seam is never reached; with it ON, the flashpoint store accumulates a tax ARTIFACT only (no live fan-morale mutation — that's a later tooth).

**GOAL:** In `src/utils/franchiseFlashpointDecayCompute.ts`: make `resolveTurnedOnPlayers` **async** and implement it to return the active Albatross holders of the game's home + away teams; `await` it at the single call site in `persistDarkFlashpointDecayForCompletedGame`. Update the affected tests. Trade-demander stays an empty seam (L10/L13 fill it). No new store, no new flag, no version bump.

**SOURCE OF TRUTH:** `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §13 tooth #2 (line 226: "a turned-on player (a locked Albatross, a trade-demander) who stays bleeds fan morale slowly every game") + DSTACK L5 (line 75: "inputs = L7 Albatross + L10/L13 trade-demander") + DSTACK L7 (line 82). MIRROR PRECEDENT: the existing L5b compute + its dark/seam discipline (`franchiseFameCompute.ts` pattern). The Albatross holder is read with the EXISTING `getFranchiseDesignationRow` (`src/utils/franchiseDesignationStorage.ts:267`).

### DESIGN (build to spec; AUTH-4 DEFAULTS-TAKEN where §13 is silent)

**Make the seam async + resolve Albatross.** Change `resolveTurnedOnPlayers(scope, gameState)` from sync `TurnedOnPlayer[]` to `async (scope: FlashpointScope, gameState: PersistedGameState): Promise<TurnedOnPlayer[]>`:
- Collect the game's team ids: `[gameState.homeTeamId, gameState.awayTeamId]` (dedupe, drop falsy).
- For each teamId, `await getFranchiseDesignationRow({ franchiseId: scope.franchiseId, seasonId: scope.seasonId, statsScopeId: scope.statsScopeId, teamId, type: 'ALBATROSS' })`.
- If the row exists AND `(row.status === 'active' || row.status === 'locked')` AND `row.playerId` → push `{ playerId: row.playerId, kind: 'albatross' }`.
- Leave a clear `// SEAM (still empty): L10/L13 trade-demander fills 'trade_demander'.` comment. Return the array (possibly empty — no active Albatross on either team → `[]`, which keeps the existing dark-noop path).
- DEFAULT-TAKEN (document inline): turned-on = a team's active|locked Albatross holder (NOT 'projected'); a per-GAME tax on the home+away teams' Albatrosses (each team's Albatross bleeds when that team plays); the active designation already implies roster membership ("who stays"), so no extra lineup-presence check.

**Await the seam at the call site.** In `persistDarkFlashpointDecayForCompletedGame`, change `const turnedOn = flashpointSeam.resolveTurnedOnPlayers(scope, gameState);` → `const turnedOn = await flashpointSeam.resolveTurnedOnPlayers(scope, gameState);`. Everything downstream (re-entry guard, compounding tax, store write) is UNCHANGED.

**Keep the `flashpointSeam` indirection** (the mockable single point) — `resolveTurnedOnPlayers` stays exported and on `flashpointSeam`.

**ALLOWED files:** EDIT `src/utils/franchiseFlashpointDecayCompute.ts` · EDIT `src/utils/tests/franchiseFlashpointDecayCompute.test.ts`. NOTHING ELSE (no store, no flag, no trackerDb/backup/sync change).

**DO NOT:** add/modify a store, flag, trackerDb version, or backup parity · mutate any fan-morale / morale / fame snapshot (L5b still only ACCUMULATES the tax artifact) · change the flashpoint engine (`flashpointDecay.ts`) or the storage (`franchiseFlashpointDecayStorage.ts`) · touch `franchiseDesignations.ts` / `franchiseDesignationStorage.ts` (READ-only via `getFranchiseDesignationRow`) · `indexedDB.open` directly in the compute file (use `getFranchiseDesignationRow`) · import a reporter/LLM/narrative module (the firewall source-scan test must stay green) · fill the trade-demander seam (L10/L13) · flip any flag default.

### TESTS (`src/utils/tests/franchiseFlashpointDecayCompute.test.ts`)

- **Update the now-async direct-seam test** (currently "the live seam resolveTurnedOnPlayers returns [] until L7/L10/L13", line ~157): make it `await expect(resolveTurnedOnPlayers(scope, gameState())).resolves.toEqual([])` — returns [] when NO Albatross designation is seeded.
- **Keep "flag-ON but seam empty STILL writes nothing"** green (no designation seeded → seam resolves [] → dark-noop). Update the stale comment.
- **The injected-turned-on test** (mocks `flashpointSeam.resolveTurnedOnPlayers`): switch `.mockReturnValue([...])` → `.mockResolvedValue([...])` (the seam is async now). Behavior assertions unchanged.
- **NEW — Albatross resolution (positive):** seed an `'active'` ALBATROSS `FranchisePlayerDesignationRecord` for `gameState.homeTeamId` (via the real designation storage put, e.g. `saveFranchiseDesignationRows`/the storage's writer) under the same scope → `await resolveTurnedOnPlayers(scope, gameState())` returns `[{ playerId: <holder>, kind: 'albatross' }]`; a `'projected'` Albatross resolves to `[]`.
- **NEW — end-to-end dark accumulation:** flag ON + an active Albatross seeded for the home team → `persistDarkFlashpointDecayForCompletedGame` writes 1 row (`flashpointKind:'albatross'`, the holder's playerId) — proving the seam now feeds the tax. (Use the real designation store seed, NOT a mock, for this one.)
- Keep the two source-scan tests (firewall: no reporter/llm/narrative; no raw `indexedDB.open`) — they MUST stay green (the new `getFranchiseDesignationRow` import is none of those).

**VERIFICATION (prefix `NODE_ENV= `; node `~/.nvm/versions/node/v20.20.0/bin`):** tsc 0 · build 0 · FULL suite = only the 2 characterized fails (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`) + the updated/new L5b-compute tests, ZERO new reds. Greps: `franchiseFlashpointDecayCompute.ts` has NO raw `indexedDB.open`, NO reporter/llm/narrative import; `flashpointDecay.ts` / `franchiseFlashpointDecayStorage.ts` / `franchisePhase2Flags.ts` / `trackerDb.ts` BYTE-UNCHANGED (`git diff` empty); `KBL_BACKUP_VERSION` + `TRACKER_DB_VERSION` UNCHANGED (no store/version touch).

**STOP IF:** making the seam async cascades a signature change beyond the single call site + the seam tests · a real Albatross read can't be seeded cleanly in the test (→ document + SET-ASIDE) · any store/version/flag must change (it must NOT) · a suite red persists past 2 fix-iterations.

**FORMAT:** 1. Files changed (paths + count + passing-test count). 2. Each change w/ the §13/L7 line it satisfies. 3. Verification output (tsc/build/full-suite + the new/updated tests + the byte-unchanged + no-version-bump greps). 4. "L7a complete" OR "BLOCKED: [reason]".

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited by Opus (full-suite re-run, the async-seam + Albatross-resolution proof, the dark-noop/seam-empty preservation, byte-unchanged store/flag/version, firewall source-scans).

**Status:** COMMITTED `0a59a24` (2026-06-17, AUTH-4 host resume). Codex 5.5 built → Opus 4.8 independently audited VERIFIED: tsc 0 / build 0 / full suite 7,317 pass / 2 characterized fail, ZERO new reds (+3 tests, existing file); async-seam + active|locked-Albatross resolution diff hand-verified; flashpoint engine/store/flag + trackerDb/backup BYTE-UNCHANGED (no store/version/flag touch); firewall source-scans green; real-designation-store integration tests (active resolves / projected ignored / locked accepted / end-to-end dark accumulation). Wiring, no user surface → auto-committed.

### L7b — Designation → fame nudge (PURE engine; §20.4 Channel C one-time naming seed; fame-store wiring DEFERRED)

**ROUTE:** Codex 5.5 | high reasoning effort (pure deterministic engine; no persistence/fame-store touch) → Opus 4.8 audit (auditor ≠ builder) → standing auto-commit (pure primitive, no user surface; mirrors L5a/L5d).

**ROLE:** You are the L-stack builder (Codex). Build the §20.4 Channel-C designation→fame nudge as a PURE engine: the one-time fame seed a player earns when NAMED to a store-backed team designation (Fan Favorite +2, Albatross −1; Team MVP / Ace sim placeholders). It mirrors the L5a `fanMoraleDampener.ts` / L5d `reporterIntensity.ts` pure-primitive pattern EXACTLY: own TUNING table, type-only imports, NO store/flag/wiring/persistence/React. The fame-store WIRING (firing on naming, idempotent once-per-naming into the L6b fame records) is a DEFERRED seam — documented, NOT built here (it mutates the SMB4 fame asset + needs one-time idempotency → its own follow-on / post-D13 activation, per build-dark).

**GOAL:** Add ONE new pure engine `src/engines/designationFameNudge.ts` exporting (1) `computeDesignationFameNudge(type, config?)` → `{ type, fameNudge, sign, reason }`; (2) `summarizeDesignationFameNudges(types, config?)` → `{ totalNudge, perType }`; (3) `DESIGNATION_FAME_NUDGE_TUNING` (shape-locked, §16 sim-tune). Plus its test file. NO wiring; consumed at a later activation step.

**SOURCE OF TRUTH:** `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §20.6 Channel C (line 403: "Designation → fame is a one-time seed (the +2/−1 naming nudge, §20.4)") + line 391 (the fame table row: "One-time fame nudge on naming (Fan Favorite +2, Albatross −1 …); Extend to other designations (Captain, Ace, MVP …) as fame nudges — magnitudes TBD/sim"). The store-backed designation types = `FranchiseDesignationType = 'TEAM_MVP' | 'ACE' | 'FAN_FAVORITE' | 'ALBATROSS'` at `src/utils/franchiseDesignations.ts:3` (import TYPE-ONLY). **Captain + Fan Hopeful are NOT in this union (separate entities) — their nudges are L7d, NOT here.** MIRROR PRECEDENT: L5a `428f7cb` / L5d `e061e51` (pure engine, own `*_TUNING`, type-only imports, consumed later).

### DESIGN (build to spec; AUTH-4 DEFAULTS-TAKEN where §20.4 is silent on magnitudes — sim-tunable)

- `DESIGNATION_FAME_NUDGE_TUNING: { nudgeByType: Record<FranchiseDesignationType, number> }` = `{ FAN_FAVORITE: 2, ALBATROSS: -1, TEAM_MVP: 1.5, ACE: 1.5 }`. FF +2 / Albatross −1 are §20.4 SPEC-CANONICAL; TEAM_MVP / ACE are §16 SIM-TUNE placeholders (positive, magnitudes TBD/sim per line 391). Shape locked, values Sim-Gate-owned.
- `computeDesignationFameNudge(type: FranchiseDesignationType, config = TUNING)` → `{ type; fameNudge: config.nudgeByType[type]; sign: 'positive' | 'negative' | 'neutral'; reason: string }` (reason = a stable tag, e.g. `designation_fame_nudge.fan_favorite_warmth` / `designation_fame_nudge.albatross_irritation` / `designation_fame_nudge.merit_honor`).
- `summarizeDesignationFameNudges(types: FranchiseDesignationType[], config = TUNING)` → `{ totalNudge: number; perType: Array<{ type; fameNudge }> }` (sum of the per-type nudges; a player who holds multiple gets the sum). Pure.
- PURE — no Math.random/Date.now/IO/store/reporter/React. Deterministic. Every magnitude in the TUNING (no scattered literals).
- **Header comment must document:** this is the §20.4 ONE-TIME naming seed (a player earns it ONCE when named to a designation, NOT per game); the firing-on-naming + idempotency + fame-store write is a DEFERRED seam (a follow-on / post-D13 activation), deliberately NOT built here — build-dark, and it touches the fame store + needs once-per-naming idempotency.

**ALLOWED files:** NEW `src/engines/designationFameNudge.ts` · NEW `src/engines/__tests__/designationFameNudge.test.ts`. NOTHING ELSE.

**DO NOT:** wire into the fame compute / fame store / designation-event path · mutate any fame/morale snapshot · touch `franchiseFameCompute.ts` / `fameModel.ts` / `fameEngine.ts` / `franchiseFameRecordsStorage.ts` / `franchiseDesignations.ts` / `processCompletedGame.ts` · add a store/flag/persistence/React · include Captain or Fan Hopeful (L7d) · use `Math.random`/`Date.now`/`new Date()` · scatter magic numbers (all → the TUNING) · invent a firing/idempotency mechanism (deferred).

### TESTS (NEW `src/engines/__tests__/designationFameNudge.test.ts`, pure/deterministic)

- **Canonical magnitudes:** `FAN_FAVORITE` → +2 (sign positive); `ALBATROSS` → −1 (sign negative).
- **MVP/Ace placeholders present + positive:** `TEAM_MVP` and `ACE` each return their tuned positive nudge (sign positive).
- **All 4 store-backed types covered:** iterate the TUNING keys → every `FranchiseDesignationType` has a finite nudge; no extra/missing keys.
- **Sign correctness:** positive nudge → 'positive', negative → 'negative', a 0 (if config overridden to 0) → 'neutral'.
- **summarize:** `[FAN_FAVORITE]` → totalNudge 2; `[FAN_FAVORITE, TEAM_MVP]` → 3.5 (sum); `[]` → 0.
- **Determinism + config override:** identical input → identical output; a custom config changes the result.

**VERIFICATION (prefix `NODE_ENV= `; node `~/.nvm/versions/node/v20.20.0/bin`):** tsc 0 · build 0 · FULL suite = only the 2 characterized fails (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`) + the new L7b tests, ZERO new reds. Greps: `designationFameNudge.ts` imports ONLY the `FranchiseDesignationType` type (`../utils/franchiseDesignations`) + its own TUNING — no store/IndexedDB/fame-compute/React, no `Math.random`/`Date.now`/`new Date()`; `franchiseFameCompute.ts` / `fameModel.ts` / `fameEngine.ts` / `franchiseDesignations.ts` BYTE-UNCHANGED (`git diff` empty).

**STOP IF:** the type-only import of `FranchiseDesignationType` into `src/engines/` creates a circular-type or build error (then re-home the engine in `src/utils/` and note it) · purity can't hold · a fame/designation file must change · a suite red persists past 2 fix-iterations.

**FORMAT:** 1. Files changed (paths + count + passing-test count). 2. Each change w/ the §20.4 line it satisfies. 3. Verification output (tsc/build/full-suite + the new tests + the purity/byte-unchanged greps). 4. "L7b complete" OR "BLOCKED: [reason]".

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited by Opus (full-suite re-run, the magnitude/sign correctness, the all-4-types coverage, purity + byte-unchanged fame/designation files).

**Status:** COMMITTED `77feeda3` (2026-06-17, AUTH-4 host resume). Codex 5.5 built → Opus 4.8 independently audited VERIFIED: tsc 0 / build 0 / full suite 7,325 pass / 2 characterized fail, ZERO new reds (+8 tests / +1 file); magnitudes + signs + exactly-4-types coverage verified; fame (`franchiseFameCompute`/`fameModel`/`fameEngine`) + `franchiseDesignations` BYTE-UNCHANGED; pure single type-only import. Pure engine, no user surface → auto-committed. (Fame-store wiring deferred seam.)

### L7c — Designation → fan-morale steady sentiment (Channel B, §20.6) + Channel-A amplifier tilt (PURE engine; morale-store wiring DEFERRED)

**ROUTE:** Codex 5.5 | high reasoning effort (pure deterministic engine; no persistence/morale-store touch) → Opus 4.8 audit (auditor ≠ builder) → standing auto-commit (pure primitive, no user surface; mirrors L5a/L5d/L7b).

**ROLE:** You are the L-stack builder (Codex). Build the §20.6 designation→fan-morale steady sentiment (Channel B) + the fame-amplifier designation tilt (Channel A) as a PURE engine. Mirrors the L7b `designationFameNudge.ts` pure-primitive pattern EXACTLY: own TUNING table, a single type-only import, NO store/flag/wiring/persistence/React. Build-dark; consumed at a later activation step.

**GOAL:** Add ONE new pure engine `src/engines/designationFanMorale.ts` exporting (1) `DESIGNATION_FAN_MORALE_TUNING`; (2) `computeDesignationSteadyFanSentiment(type, config?)` → `{ type, sentiment, sign, reason }` (Channel B per-game steady delta for a HELD designation); (3) `summarizeDesignationSteadyFanSentiment(types, config?)` → `{ totalSentiment, perType }`; (4) `computeDesignationSwingTilt(type, swingDirection, config?)` → `{ type, swingDirection, tilt, reason }` (Channel A asymmetric multiplier); (5) `applyDesignationSwingTilt(type, baseSwing, config?)` → `number` (Channel A consumable, sign-preserving). Plus its test file. NO wiring.

**SOURCE OF TRUTH:** `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §20.6 — Channel A (line 401: per-event impact = base swing × fame × designation-tilt; FF ups hit harder, Albatross downs hit harder), Channel B (line 402: steady per-game sentiment — FF ongoing warmth; Albatross ongoing irritation **via the §13 decay-on-ignored-flashpoint**), no-double-count (line 405). Types = `FranchiseDesignationType = 'TEAM_MVP'|'ACE'|'FAN_FAVORITE'|'ALBATROSS'` at `src/utils/franchiseDesignations.ts:3` (TYPE-ONLY import; Captain/Fan Hopeful → L7d). MIRROR PRECEDENT: L7b `77feeda3` `src/engines/designationFameNudge.ts` + its test (copy structure: header doc, TUNING const, compute+summarize, private sign + reason helpers).

### DESIGN (build to spec; AUTH-4 DEFAULTS-TAKEN where §20.6 is silent on magnitudes — sim-tunable)

**THE DOUBLE-COUNT GUARD (headline):** §20.6 Channel B routes the Albatross "ongoing irritation, compounding" through the §13 flashpoint-decay — which is ALREADY built (L5b `flashpointDecay.ts` + `franchiseFlashpointDecayCompute.ts`) and ALREADY taxes a held Albatross every game (wired to the active|locked Albatross by L7a `0a59a24`). So this engine must NOT re-add Albatross steady sentiment: `ALBATROSS: 0` in the tuning, with a `reason` tag referencing the flashpoint deferral. This engine's Channel-B contribution is the **Fan Favorite warmth** (the positive counterpart the flashpoint tax — which only taxes "turned-on" negative players — doesn't cover).

- `DESIGNATION_FAN_MORALE_TUNING.steadySentimentByType` = `{ FAN_FAVORITE: 0.5, ALBATROSS: 0, TEAM_MVP: 0, ACE: 0 }`. FF +0.5 = §20.6 ongoing warmth (sim placeholder); ALBATROSS 0 = double-count guard; TEAM_MVP/ACE 0 = §20.6 Channel B names only FF + Albatross (merit designations get their fame nudge via L7b Channel C, no steady fan warmth specified in v1) — placeholders.
- `DESIGNATION_FAN_MORALE_TUNING.swingTiltByType` = `{ FAN_FAVORITE: {up:1.25,down:1.0}, ALBATROSS: {up:1.0,down:1.25}, TEAM_MVP: {up:1.0,down:1.0}, ACE: {up:1.0,down:1.0} }`. FF ups amplified; Albatross downs amplified; merit symmetric-neutral placeholders.
- `computeDesignationSteadyFanSentiment` → sentiment = tuning value; sign >0/'positive' <0/'negative' 0/'neutral'; reason tags `designation_fan_morale.fan_favorite_warmth` / `…albatross_irritation_via_flashpoint` / `…merit_neutral`.
- `summarizeDesignationSteadyFanSentiment(types)` → sum of per-type sentiments + perType array (mirror `summarizeDesignationFameNudges`).
- `computeDesignationSwingTilt(type, swingDirection)` → tilt = `swingTiltByType[type][swingDirection]`; reason `swing_amplified`(>1)/`swing_neutral`(=1)/`swing_damped`(<1). `DesignationSwingDirection = 'up'|'down'` exported.
- `applyDesignationSwingTilt(type, baseSwing)` → direction from sign of baseSwing (`>=0`→up, `<0`→down); return `baseSwing * tilt`; `baseSwing===0`→0; sign-preserving (tilt ≥ 1, never flips).
- PURE — no Math.random/Date.now/new Date()/IO/store/reporter/LLM/React; every magnitude in the TUNING.
- **Header doc must document:** Channel B + Channel A; the double-count guard (Albatross 0, §13 owns it); Channel A is the pure tilt multiplier only (full `base × fame × tilt` NOT wired — fame dark, no live per-play swing pipeline; wiring is a post-D13 seam); the Channel-B WIRING is a DEFERRED seam (at activation `processCompletedGame` fires the steady sentiment per game for each team's HELD Fan Favorite, gated by `isFranchisePhase2MoraleEnabled`, idempotent per game, NOT for Albatross — mirrors L7b deferring its fame-store wiring).

**ALLOWED files:** NEW `src/engines/designationFanMorale.ts` · NEW `src/engines/__tests__/designationFanMorale.test.ts`. NOTHING ELSE.

**DO NOT:** add store/flag/wiring/persistence · wire into `processCompletedGame.ts` / morale store / designation-event path · mutate any morale/fan-morale/fame snapshot · re-add an Albatross steady sentiment (keep `ALBATROSS: 0`) · touch `flashpointDecay.ts` / `franchiseFlashpointDecayCompute.ts` / `designationFameNudge.ts` / `fanMoraleDampener.ts` / `masterMoraleMatrix.ts` / `fanMoraleEngine.ts` / `franchiseFameCompute.ts` / `franchiseDesignations.ts` / `franchisePhase2Flags.ts` · include Captain/Fan Hopeful (L7d) · import store/IndexedDB/reporter/LLM/React · use Math.random/Date.now/new Date() · scatter magic numbers · let `applyDesignationSwingTilt` flip the swing's sign.

### TESTS (NEW `src/engines/__tests__/designationFanMorale.test.ts`, pure/deterministic; mirror the L7b test)

- Channel B FF warmth: FAN_FAVORITE → 0.5, 'positive', `…fan_favorite_warmth`.
- Channel B DOUBLE-COUNT GUARD (signature): ALBATROSS → 0, 'neutral', `…albatross_irritation_via_flashpoint`.
- Channel B merit neutral: TEAM_MVP + ACE → 0, 'neutral', `…merit_neutral`.
- Both tuning maps cover exactly the 4 store-backed types (sorted-equal); neither has CAPTAIN/FAN_HOPEFUL; all values finite.
- summarize: `['FAN_FAVORITE']`→0.5; `['FAN_FAVORITE','ALBATROSS']`→0.5; `[]`→0.
- Channel A asymmetry: FF up>1 (amplified) + down=1 (neutral); Albatross down>1 + up=1; MVP/ACE both=1; assert reason tags.
- Channel A apply: FF positive baseSwing amplified (>base, same sign); Albatross negative baseSwing amplified (<base, still negative); FF negative baseSwing unchanged (down 1.0); baseSwing 0→0; sign never flipped.
- Determinism + config override.

**VERIFICATION (prefix `NODE_ENV= `; node `~/.nvm/versions/node/v20.20.0/bin`):** tsc 0 · build 0 · the new test green · FULL suite = only the 2 characterized fails (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`) + the new L7c tests, ZERO new reds. Greps: `designationFanMorale.ts` imports ONLY the `FranchiseDesignationType` type + its own TUNING — no store/IndexedDB/fame/morale/reporter/React, no Math.random/Date.now/new Date(); `designationFameNudge.ts` / `flashpointDecay.ts` / `franchiseFlashpointDecayCompute.ts` / `fanMoraleDampener.ts` / `masterMoraleMatrix.ts` / `franchiseDesignations.ts` BYTE-UNCHANGED.

**STOP IF:** the type-only import into `src/engines/` creates a circular-type/build error (re-home in `src/utils/` + note — but L7b did fine) · purity can't hold · a frozen engine (esp. flashpoint files) must change · a suite red persists past 2 fix-iterations (→ SET-ASIDE per AUTH-4).

**FORMAT:** 1. Files changed (paths + count + passing-test count). 2. Each change w/ the §20.6 line. 3. Verification output. 4. "L7c complete" OR "BLOCKED: [reason]".

Use high reasoning effort. Think step-by-step. Builder ≠ auditor — your diff will be independently re-audited by Opus (full-suite re-run, the double-count guard `ALBATROSS:0`, the Channel-A asymmetry + sign-preserving apply, the 4-types coverage, purity + byte-unchanged frozen engines).

**Status:** COMMITTED `886d1dce` (2026-06-17, AUTH-4 host resume). Codex 5.5 built → Opus 4.8 independently audited VERIFIED: tsc 0 / build 0 / full suite 7,335 pass / 2 characterized fail (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds (+10 tests / +1 file = `designationFanMorale.test.ts`, over post-L7b 7,325/416). Double-count guard verified (`ALBATROSS: 0`, reason → flashpoint; `summarize(['FAN_FAVORITE','ALBATROSS'])` = 0.5); Channel-A asymmetry (FF up 1.25 / Albatross down 1.25; merit neutral) + sign-preserving `applyDesignationSwingTilt` hand-verified; pure (single type-only import, no Math.random/Date.now/IO/store/React); frozen engines (`designationFameNudge`/`flashpointDecay`/`franchiseFlashpointDecayCompute`/`fanMoraleDampener`/`masterMoraleMatrix`/`franchiseDesignations`) BYTE-UNCHANGED; scope = exactly the 2 allowed files. Pure engine, no user surface → auto-committed. (Channel-B morale-store wiring + Channel-A per-play wiring = deferred post-D13 seams.) **NOW = L7d.**
