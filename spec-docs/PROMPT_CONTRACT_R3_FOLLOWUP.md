# PROMPT CONTRACT: R3 Follow-Up — Inning End on Correction + Remaining Issues
# ROUTE: Claude Code CLI | Opus 4.6
# Branch: fix/r3-followup-inning-end
# Skill: .claude/skills/gametracker-bug-repro/SKILL.md — follow the 8-step protocol

---

## INSTRUCTIONS

Read `.claude/skills/gametracker-bug-repro/SKILL.md` first. Follow the 8-step protocol for each bug.

---

## Bug 1 (CRITICAL): Inning doesn't end when 3rd out comes from runner correction

**What the user does:** Records plays. At some point has 2 outs. Then corrects a runner outcome on a prior play to "out" (e.g., toggles Out Advancing on a scored runner). This makes outs = 3.

**What should happen:** The half-inning ends. Inning transitions. Pitch count prompt fires. Columns swap.

**What actually happens:** ScoreBug shows 3 outs (correct — `applyOutsAdjustment` works). But nothing else happens. The game stays in the same half-inning. User has to record a 4th out to trigger the inning change.

**Root cause:** The inning-end logic lives inside `recordOut` in useGameState.ts (the Opus report confirmed: "auto-end is inline in recordOut, not a useEffect on outs"). When outs reach 3 via the normal play flow (`recordOut` → `commitPlateAppearance`), the inning transition fires. When outs reach 3 via `applyOutsAdjustment` (runner correction), `recordOut` is never called, so the inning-end logic never executes.

**What to fix:** After calling `applyOutsAdjustment` in `handleRunnerEnrichmentUpdate` (GameTracker.tsx), check if the new outs count equals 3. If it does, trigger the inning-end flow. Options:
- Call `endInning()` directly from the handler (if the hook exposes it — check the hook's return value)
- Or add a `useEffect` that watches `gameState.outs` and triggers `endInning` when it hits 3 — but guard it so it only fires on CORRECTIONS (use a ref flag like `isCorrectionRef`)
- Or add the check inside `applyOutsAdjustment` itself in useGameState.ts

**State fields that must change when outs hit 3:**
- `gameState.outs` → 0 (reset for new half-inning)
- `gameState.isTop` → flips
- `gameState.bases` → all false (cleared)
- Pitch count prompt should fire for the outgoing pitcher
- Lineup columns should swap (role-based)

**CAUTION:** This is tricky because inning-end involves pitch count prompts (async), column swaps, batter index resets, and potentially game-end detection. Don't try to replicate all of `endInning` in the correction handler — CALL the existing `endInning` function.

### VERIFY
```bash
npm run build
```
Write a test (per the skill protocol) that:
1. Sets up a game state with 2 outs
2. Calls `applyOutsAdjustment(1)` (simulating a runner correction adding an out)
3. Asserts that outs went to 3 AND then the inning ended (outs reset to 0, isTop flipped)

Browser test: Record 2 outs normally → record a hit with runner scoring → correct the runner to "out" via play log sub-entry → inning should end, pitch count prompt fires, columns swap.

---

## Bug 2 (MEDIUM): Play log header still says "Use the main field for +loc"

**What the user sees:** At the top of the play log column, the text reads: "At-bats plus between-play events. Use the main field for +loc."

**What should happen:** The "main field" (GameDiamond) was removed in Step 1.B. This text is stale. It should say something like "At-bats plus between-play events. Tap entries to enrich." Or simply remove the +loc instruction entirely since the spray graphic is now inline.

**What to fix:** In `PlayLogPanel.tsx`, find the header text and update or remove the stale "Use the main field for +loc" reference.

### VERIFY
```bash
npm run build
grep -n "main field" src/src_figma/app/components/PlayLogPanel.tsx
# Expected: 0 matches after fix
```

---

## AFTER BOTH BUGS

```bash
npm run build
npx vitest run 2>&1 | tail -10
```

Output the Step 8 report format from the skill for each bug, plus a combined summary.
