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
