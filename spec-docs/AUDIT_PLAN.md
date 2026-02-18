# KBL TRACKER — GROUND TRUTH AUDIT PLAN
# Created: 2026-02-17 | Owner: Claude Sonnet 4.6 (captain) + John (PM)
# Status: ACTIVE — Do not skip steps. Do not declare completion without evidence.

---

## Core Principle: Evidence Over Assertion

Nothing is marked "working" based on reading code alone. Every claim requires:
- A test output, OR
- A grep/build result, OR
- A manual browser verification performed by John

If we cannot verify it, it goes in the **UNVERIFIED** column. Never in CONFIRMED.

---

## How to Use This Document

1. Work phases in order. Do not start Phase 2 until Phase 1 is complete.
2. Every finding is logged in `AUDIT_LOG.md` using the standard format.
3. Nothing is closed without a verification method documented.
4. At session end: update `SESSION_LOG.md` and `AUDIT_LOG.md` before stopping.

---

## Phase 0: Inventory (Before Reading Any Code)

**Goal:** Know exactly what exists before evaluating any of it.

Run the following in Claude Code CLI from the kbl-tracker root and paste output to claude.ai:

```bash
# 1. Full active file tree (no archived, no node_modules)
find src -not -path "*/archived*" -not -path "*/node_modules*" \( -name "*.ts" -o -name "*.tsx" \) | sort

# 2. Size/complexity of key files
wc -l src/src_figma/hooks/useGameState.ts \
   src/components/GameTracker/index.tsx \
   src/components/GameTracker/gameEngine.ts \
   src/src_figma/app/pages/*.tsx 2>/dev/null | sort -rn | head -30

# 3. How far did the reducer migration get?
grep -rn "useReducer" src --include="*.ts" --include="*.tsx"

# 4. How much useState spaghetti remains in GameTracker?
grep -rn "useState" src/components/GameTracker/ src/src_figma --include="*.tsx" --include="*.ts" | wc -l

# 5. Is the old useGameState hook still active?
grep -rn "useGameState" src --include="*.ts" --include="*.tsx"

# 6. Does useGamePersistence exist and is it wired?
grep -rn "useGamePersistence" src --include="*.ts" --include="*.tsx"

# 7. What does the active GameTracker import?
grep -rn "^import" src/src_figma/app/pages/GameTrackerPage.tsx 2>/dev/null || \
grep -rn "^import" src/src_figma/app/pages/GameTracker.tsx 2>/dev/null
```

**Exit criteria:** Full inventory pasted and logged in AUDIT_LOG.md before Phase 1 begins.

---

## Phase 1: Architecture Map (One File at a Time)

**Goal:** Understand actual data flow, not intended data flow.

Read each file in order. Document what it *actually* does vs. what the Gemini handoff claims it does.

| # | File | Question to Answer |
|---|------|--------------------|
| 1 | Active `GameTracker.tsx` (src_figma path) | Is it on the reducer or still hybrid useState? |
| 2 | Reducer definition + action types | Does it cover ALL game state transitions? |
| 3 | `useGameState.ts` | Still active or dead? What imports it? |
| 4 | `useGamePersistence.ts` | Does it exist? What does it actually do? |
| 5 | `gameEngine.ts` | What's actually in it vs. what Gemini claims? |
| 6 | `atBatLogic.ts` | Does it exist? Is MLB Rule 5.08(a) actually implemented? |
| 7 | `fieldingLogic.ts` | Does it exist? What's in it? |

**For each file:** Log a FINDING entry in AUDIT_LOG.md with CONFIRMED / CONTRADICTED / UNVERIFIED status.

**Exit criteria:** All 7 files read, all findings logged, architecture map complete.

---

## Phase 2: The Seams Audit

**Goal:** Find every handoff point between systems — this is where bugs live.

| Seam | Files Involved | What to Verify |
|------|---------------|----------------|
| Game state → IndexedDB | useGamePersistence / trackerDb.ts | Save path: when does it fire? What guard prevents saving empty state? |
| IndexedDB → Game state | useGamePersistence / useGameState | Rehydration gate: does `isRehydrated` guard actually work? |
| End Game → New Game | GameTracker / useGameState / gameStorage | Is all state cleared? Is scoreboard reset? Are runners cleared? |
| Franchise → GameTracker | handlePlayGame / GameTrackerPage | Does real roster data flow in? |
| GameTracker → Franchise | processCompletedGame | Do results write back correctly to standings? |
| Reducer dispatch → autosave | GameTracker / useGamePersistence | Is autosave on hook-local timer or shared debounce? |

**For each seam:** Write a manual browser test John performs. Log result in AUDIT_LOG.md.

**Exit criteria:** All 6 seams traced in code AND verified by manual test.

---

## Phase 3: Known Bug Verification

**Goal:** Confirm which of the 35 bug fixes in CURRENT_STATE.md are actually fixed.

**Do not trust the fix log.** Verify with eyes.

Priority order:
1. T0 (game-breaking) — 9 items
2. T1 (wrong results) — 6 items
3. T2 (missing wiring) — 11 items
4. T3 (feature builds) — 7 items

For each item: John performs the specific scenario in the browser. Pass/Fail logged in AUDIT_LOG.md with date.

**Exit criteria:** All T0 and T1 items manually verified. T2/T3 can be deferred with explicit notation.

---

## Phase 4: Debt Inventory

**Goal:** Catalogue everything needing refactoring before we touch it — with dependency ordering.

Known debt items to evaluate:
- [ ] Type duplication: `src/types/game.ts` vs `src/src_figma/app/types/game.ts`
- [ ] Path drift: active code in src_figma that should be in components/GameTracker/
- [ ] Dead archived code adjacent to live code
- [ ] Remaining useState in GameTracker that belongs in the reducer
- [ ] Gemini Phase A (Modal Dumbing) — real work or already done?
- [ ] Gemini Phase B (Fame Engine) — real work or already done?
- [ ] Gemini Phase C (Path cleanup) — real work or already done?
- [ ] Gemini Phase D (Chaos test suite) — real work or already done?

Output: Prioritized debt list with "fix this before touching that" ordering written to `REFACTOR_ROADMAP.md`.

**Exit criteria:** Debt list complete, ordering documented, roadmap written.

---

## Accountability Mechanism

### Finding Format (used in AUDIT_LOG.md)
```
FINDING-[NNN]
Date: YYYY-MM-DD
Phase: [0/1/2/3/4]
File: [exact path]
Claim: [what spec/handoff says is true]
Evidence: [what code/output actually shows]
Status: CONFIRMED | CONTRADICTED | UNVERIFIED
Verification method: [grep output / build result / manual browser test]
Verified by: [Claude / John]
```

### Rules That Cannot Be Skipped
1. No finding is CONFIRMED without a verification method documented
2. `npm run build` must pass after every Codex change before we proceed
3. Relevant tests must pass after every Codex change
4. John confirms specific behavior in browser before any ticket is closed
5. If Codex output doesn't match expected output → change is NOT applied

---

## Session Handoff Checklist

Before ending ANY session:
- [ ] All findings from this session logged in AUDIT_LOG.md
- [ ] SESSION_LOG.md updated with what was done, what's pending, key decisions
- [ ] CURRENT_STATE.md updated if any status changed
- [ ] Next session starting point clearly documented
