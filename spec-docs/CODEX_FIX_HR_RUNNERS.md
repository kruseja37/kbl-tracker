# CODEX BUG FIX: HR Doesn't Clear Bases / Score All Runners
# ROUTE: Codex 5.4 | high
# Branch: fix/hr-runner-advancement
# Skill: .claude/skills/gametracker-bug-repro/SKILL.md

---

## THE BUG

HRs only score the batter. Runners on base stay on their bases and don't score. A grand slam should score 4 runs but only scores 1.

## ROOT CAUSE (VERIFIED BY CODE TRACE)

In `handleQuickBarOutcome` at GameTracker.tsx ~line 3240:

```typescript
const correction = buildRunnerCorrectionForQuickBarOutcome(effectiveOutcome, bases, outs);
const defaults = correction?.defaults;
const promptDefaults = defaults
    || (effectiveOutcome === 'HR' || effectiveOutcome === 'ITPHR'
        ? calculateRunnerDefaults(...)  // ← THIS computes correct HR defaults (all runners home)
        : ...);

const runnerAdv = defaults ? runnerDefaultsToAdvancement(defaults) : undefined;
//                ^^^^^^^^ defaults is null for HR (correction is null)
//                         so runnerAdv = undefined

const rbi = correction ? countRbiFromDefaults(correction.defaults, correction.action) : 0;
//          ^^^^^^^^^^ correction is null for HR
//                      so rbi = 0
```

`buildRunnerCorrectionForQuickBarOutcome('HR', ...)` returns `null` because HR is handled as a prompt flow, not an immediate correction. So `correction` is null, `defaults` is null.

The CORRECT runner defaults are in `promptDefaults` (from `calculateRunnerDefaults`). But `runnerAdv` is computed from `defaults` (which is null), not from `promptDefaults`. So `runnerAdv = undefined`.

The HR prompt stores `{ rbi: 0, runnerAdv: undefined, defaults: promptDefaults, ... }`. When `handleHrPromptDone` calls `commitPlateAppearance({ type: 'hit', hitType: 'HR', rbi: 0, runnerAdvancement: undefined })`, the hook's `recordHit` gets no runner data — only the batter scores.

## THE FIX

At ~line 3261, change:
```typescript
// BEFORE (broken):
const runnerAdv = defaults ? runnerDefaultsToAdvancement(defaults) : undefined;
const rbi = correction ? countRbiFromDefaults(correction.defaults, correction.action) : 0;

// AFTER (fixed):
const effectiveDefaults = defaults || promptDefaults;
const runnerAdv = effectiveDefaults ? runnerDefaultsToAdvancement(effectiveDefaults) : undefined;
const rbi = correction
    ? countRbiFromDefaults(correction.defaults, correction.action)
    : (effectiveDefaults ? countRbiFromDefaults(effectiveDefaults, { type: 'hit', hitType: effectiveOutcome as HitType }) : 0);
```

This ensures HR (and ITPHR and Error) use `promptDefaults` when `correction` is null.

## FILES TO MODIFY
```
src/src_figma/app/pages/GameTracker.tsx — lines ~3261-3262 in handleQuickBarOutcome
```

## TEST

Write a test that calls `calculateRunnerDefaults` for HR with bases loaded, converts to runner advancement, and asserts all runners go home with 4 RBI.

Also verify `runnerDefaultsToAdvancement` returns `{ fromFirst: 'home', fromSecond: 'home', fromThird: 'home' }` when given HR defaults with bases loaded.

## WIRING VERIFY
```bash
grep -n "promptDefaults\|effectiveDefaults" src/src_figma/app/pages/GameTracker.tsx | head -10
```
After fix: `effectiveDefaults` should appear in the runnerAdv and rbi calculation lines.

## BROWSER VERIFY
Bases loaded → HR → all 4 runs score, bases empty after.
Runner on 2nd → HR → 2 runs score, bases empty.
Nobody on → HR → 1 run scores.

## DO NOT
- Change `calculateRunnerDefaults` in runnerDefaults.ts (it's correct)
- Change `recordHit` in useGameState.ts (it's correct)
- Change the HR prompt flow (hrPrompt/handleHrPromptDone)
- Modify eventLog.ts
