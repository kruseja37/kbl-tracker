# PROMPT CONTRACT: Step 2.B — Core Flow Change + Orphaned Button Cleanup
# ROUTE: Claude Code CLI | Opus 4.6
# Branch: feature/gt-ux-t2b-post-commit-runners
# Prerequisite: Step 2.A merged to main

---

You are a senior React/TypeScript engineer performing the highest-risk change in the GameTracker UX redesign. This step removes the pre-commit runner correction gate so that Quick Bar taps commit events immediately. It also cleans up orphaned UI elements from the old layout.

## GOAL

Two objectives:
1. **(UX-022)** Remove the pre-commit runner correction gate. Quick Bar tap → immediate commit with default runners. Runner corrections happen post-commit by tapping runners in the batting lineup column.
2. **(Cleanup)** Remove the orphaned LINEUP, +FLD, +MOD buttons and the lineup overlay modal from the bottom action zone. These are remnants of the old 5-zone layout — replaced by inline lineup columns (Step 1.C) and play log enrichment (Tier 2 Group 2.D).

## SOURCE OF TRUTH

- `spec-docs/GAMETRACKER_UX_SPEC.md` — §4.2 Quick Bar Commit Behavior, §7.4 Post-Commit Runner Correction, §12.2 Runner Correction Beyond Undo
- `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` — UX-022
- `spec-docs/GAMETRACKER_UX_IMPLEMENTATION_PLAN.md` — Group 2.B

## BEFORE YOU WRITE ANY CODE

1. Read `spec-docs/GAMETRACKER_UX_SPEC.md` §4.2, §7.4, §12.2 in full
2. Read `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` entry for UX-022
3. In GameTracker.tsx, trace the COMPLETE Quick Bar outcome flow. Start from the `handleQuickBarOutcome` function (or equivalent). Trace every branch:
   - Where does `buildRunnerCorrectionForQuickBarOutcome` get called? (~line 2990)
   - Where does `setPendingRunnerCorrection` get called? (~line 3049)
   - Where does `handleRunnerCorrectionCommit` call `commitPlateAppearance`? (~line 2415)
   - Which outcomes skip the runner correction gate and commit directly? (HR at ~line 3081, GO at ~line 3038 — verify these)

4. Read `src/src_figma/app/utils/gameTrackerRunnerCorrection.ts` to understand `buildRunnerCorrectionForQuickBarOutcome` — what it returns, what defaults it calculates
5. Read `src/src_figma/app/components/runnerDefaults.ts` to understand the default runner advancement logic — this is what the immediate-commit flow will use
6. Identify the LINEUP, +FLD, +MOD button rendering (~line 5059-5095 in GameTracker.tsx) and the `showLineupOverlay` state + modal (~line 682, rendered ~line 5217+)
7. Create branch: `git checkout -b feature/gt-ux-t2b-post-commit-runners`
8. Run `npm run build` to confirm clean baseline

## CONSTRAINTS

### Files you WILL modify:
```
src/src_figma/app/pages/GameTracker.tsx   — Remove runner correction gate, remove orphaned buttons/modal, change Quick Bar flow to immediate commit
```

### Files you MAY need to modify:
```
src/src_figma/app/utils/gameTrackerRunnerCorrection.ts — May be able to repurpose or simplify
src/src_figma/app/components/runnerDefaults.ts — May need adjustment to provide better defaults for immediate commit
```

### Files you MUST NOT modify:
```
src/src_figma/hooks/useGameState.ts           — No state changes. commitPlateAppearance stays as-is.
src/utils/eventLog.ts                          — Persistence layer, DO NOT TOUCH
src/src_figma/app/components/QuickBar.tsx      — Just completed in 2.A, leave alone
src/src_figma/app/components/EnrichmentPanel.tsx
src/src_figma/app/components/ScoreBug.tsx
src/src_figma/app/components/BattingLineupColumn.tsx
src/src_figma/app/components/DefensiveLineupColumn.tsx
src/src_figma/app/components/NewsBoard.tsx
Any file under src/components/                 — DEAD CODE
```

## EXACT CHANGES

### Item 2.5 (UX-022): Remove pre-commit runner correction gate

**Current flow (the problem):**
1. User taps Quick Bar outcome (e.g., [1B])
2. `handleQuickBarOutcome` calls `buildRunnerCorrectionForQuickBarOutcome()` to compute default runner positions
3. `setPendingRunnerCorrection(correction)` stores the pending correction — the event is NOT committed
4. A runner correction panel appears showing default runner positions with adjustment controls
5. User reviews/adjusts, then taps "Commit" → `handleRunnerCorrectionCommit()` calls `commitPlateAppearance()`
6. ONLY NOW is the event committed to IndexedDB

**New flow (what to build):**
1. User taps Quick Bar outcome (e.g., [1B])
2. `handleQuickBarOutcome` computes default runner advancement using `buildRunnerCorrectionForQuickBarOutcome()` or equivalent
3. `commitPlateAppearance()` is called IMMEDIATELY with the defaults — event committed to IndexedDB immediately
4. Play log shows the new at-bat entry with runner sub-entries showing default advances
5. If the user wants to correct runners, they tap the runner entry in the play log (Tier 3: runner sub-entries) or tap the runner in the batting lineup column → player card → correction options

**Implementation steps:**

1. In `handleQuickBarOutcome` (search for the function): for outcomes that currently call `setPendingRunnerCorrection(correction)` (~line 3049), change them to:
   - Compute the default runner advancement (using the same `buildRunnerCorrectionForQuickBarOutcome` logic)
   - Convert defaults to `runnerAdvancement` format (using `runnerDefaultsToAdvancement` which already exists)
   - Compute RBI (using `countRbiFromDefaults` which already exists)
   - Call `commitPlateAppearance()` directly with the computed values
   - This is essentially inlining what `handleRunnerCorrectionCommit` does, but without the intermediate "pending" state

2. Verify ALL outcome branches in `handleQuickBarOutcome`:
   - HR: already commits directly (~line 3081) → NO CHANGE needed
   - GO: already commits directly (~line 3038) → NO CHANGE needed
   - Everything else that calls `setPendingRunnerCorrection`: change to immediate commit
   - Search the function for EVERY call to `setPendingRunnerCorrection` and replace each with an immediate `commitPlateAppearance` call

3. After converting all branches: the `pendingRunnerCorrection` state, `handleRunnerCorrectionChange`, `handleRunnerCorrectionCancel`, `handleRunnerCorrectionCommit`, and the runner correction UI panel are now DEAD CODE. Comment them out with a clear note:
   ```
   // REMOVED per UX-022: Pre-commit runner gate eliminated.
   // Runner corrections are now post-commit via play log or lineup column tap.
   // Keeping commented for reference during Tier 3 runner sub-entry implementation.
   ```

4. Remove the runner correction UI panel from the JSX render. Search for where `pendingRunnerCorrection` is used in the JSX (conditional rendering of the correction panel). Comment out or remove that entire conditional block.

5. The `buildRunnerCorrectionForQuickBarOutcome` utility can stay — it's useful for computing defaults. But it's now called and consumed immediately, not stored in pending state.

### Orphaned Button Cleanup

1. Remove the LINEUP button rendering (~line 5059-5066 in GameTracker.tsx). The inline lineup columns (Step 1.C) replaced this.
2. Remove the +FLD button rendering (~line 5082). Play log tap enrichment replaces this.
3. Remove the +MOD button rendering (~line 5095). Play log inline modifiers replace this.
4. Remove the `showLineupOverlay` state (~line 682) and the entire lineup overlay modal (~line 5217+). The lineup is now always visible in columns 2 and 3.
5. Search for `lineupOverlayHint` and `setLineupOverlayHint` — remove them too (they were helper messages for the now-removed overlay).
6. If removing the lineup overlay breaks any substitution flow that depended on it → that's expected. The old substitution flow (drag-drop via LineupCard in the overlay) is being replaced in Tier 2 Group 2.C with the player-card-first flow. For now, leave substitution temporarily broken — it's being rewritten in the next step.
   **IMPORTANT:** Document what substitution paths break and which lines reference the removed overlay, so the 2.C prompt knows exactly what to reconnect.

## VERIFICATION

```bash
# 1. Build passes
npm run build

# 2. Tests pass
npm test

# 3. No pending runner correction state
grep -n "pendingRunnerCorrection\b" src/src_figma/app/pages/GameTracker.tsx | grep -v "^.*//.*REMOVED\|^.*//.*commented"
# Expected: 0 non-commented matches (all references removed or commented)

# 4. Direct commit calls exist for previously-gated outcomes
grep -n "commitPlateAppearance" src/src_figma/app/pages/GameTracker.tsx | head -15
# Expected: multiple direct calls in handleQuickBarOutcome (not just in handleRunnerCorrectionCommit)

# 5. Orphaned buttons removed
grep -n "LINEUP\|+FLD\|+MOD" src/src_figma/app/pages/GameTracker.tsx | grep -v "^.*//.*REMOVED\|^.*//.*comment\|^.*//.*old"
# Expected: 0 non-commented matches for these button labels

# 6. showLineupOverlay removed
grep -n "showLineupOverlay\|lineupOverlayHint" src/src_figma/app/pages/GameTracker.tsx | grep -v "^.*//.*REMOVED"
# Expected: 0 non-commented matches

# 7. Runner correction UI panel removed from JSX
grep -n "RunnerCorrection\|runner.*correction.*panel\|correction.*modal" src/src_figma/app/pages/GameTracker.tsx | grep -v "^.*//.*REMOVED\|^.*//.*comment"
# Expected: 0 non-commented matches in JSX render area
```

## BROWSER VERIFICATION (JK will perform)

Test these scenarios after the change — all should commit IMMEDIATELY on Quick Bar tap with NO intermediate panel:

1. **Single with R1:** Tap [1B] with runner on 1st → event commits immediately, R1 defaults to 2nd, play log shows entry
2. **Double with R1+R2:** Tap [2B] with R1+R2 → both runners advance by default, event commits immediately
3. **HR with bases loaded:** Tap [HR] → all score (already works — verify no regression)
4. **GO with R1 (force play):** Tap [GO] → batter out at 1st, R1 defaults stay per current logic
5. **FO with R3 (potential SF):** Tap [FO] → check if SF detection still works correctly
6. **K (no runners):** Tap [K] → simple strikeout commits immediately (already works — verify no regression)
7. **Undo after immediate commit:** Tap [1B], then tap [↩ Undo] → event should undo correctly

## FORMAT

When complete, output:

```
STEP 2.B COMPLETE

Changes made:
1. Quick Bar immediate commit: [describe which outcome branches were changed, which already committed directly]
2. Dead code commented: [list all pendingRunnerCorrection-related functions/state/UI removed]
3. Orphaned buttons removed: [LINEUP, +FLD, +MOD — exact lines]
4. Lineup overlay removed: [showLineupOverlay state + modal JSX — exact lines]

Substitution paths broken by overlay removal:
[LIST EVERY substitution flow that referenced the overlay or LineupCard-in-modal. These will be reconnected in Group 2.C]

Verification results:
[all 7 checks with outcomes]

Outcome branch audit (CRITICAL — list each one):
[For EVERY outcome in handleQuickBarOutcome, state whether it:
 - Already committed directly (no change needed)
 - Was changed from setPendingRunnerCorrection to commitPlateAppearance
 - Has any special logic (HR prompt, GO edge cases, etc.)]

Ready for JK browser verification.
```

## FAILURE PROTOCOL

- If an outcome branch has complex logic between buildRunnerCorrection and commitPlateAppearance that's hard to inline → keep the helper function, just call it and commitPlateAppearance in sequence WITHOUT storing in pending state. The key change is removing the UI panel and the user-waits-to-commit gate.
- If removing the lineup overlay causes build failures in components that reference it → fix the build by removing the references. Document every component that was affected.
- If the runner defaults are clearly wrong for some scenario (e.g., GO with R1 should be force out at 2nd but defaults to something else) → leave the defaults as they are. Default correctness is existing behavior, not something being changed in this step. The undo stack is the safety net.
- If removing pendingRunnerCorrection breaks the undo system → the undo system captures snapshots BEFORE actions. As long as captureSnapshot is still called before commitPlateAppearance, undo should work. Verify the captureSnapshot call is preserved in the immediate-commit flow.
- If anything is ambiguous → STOP and report. Do NOT guess.

## ANTI-PATTERNS

- Do NOT modify useGameState.ts or commitPlateAppearance.
- Do NOT modify eventLog.ts.
- Do NOT modify QuickBar.tsx, ScoreBug.tsx, or the lineup column components.
- Do NOT build post-commit runner correction UI in the play log — that's Tier 3 (runner sub-entries).
- Do NOT build the player-card-first substitution flow — that's Group 2.C.
- Do NOT change runner default calculations. Defaults should behave identically to what the old runner correction panel showed as defaults.
- Do NOT touch src/components/ (dead code).
- Do NOT delete gameTrackerRunnerCorrection.ts — it may still be useful for computing defaults.

Use high reasoning effort. Read the ENTIRE handleQuickBarOutcome function before making changes. Build after every file change.
