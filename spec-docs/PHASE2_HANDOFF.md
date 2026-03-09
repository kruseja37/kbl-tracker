# PHASE 2 HANDOFF — GameTracker Scope Resolution

**From:** Phase 1 session (2026-03-08/09)
**To:** New Claude.ai chat for Phase 2 (Socratic Q&A)
**Status:** Phase 1 COMPLETE. JK has reviewed and accepted the functional truth with corrections noted.

---

## What You're Doing

You are executing Phase 2 of the GameTracker Redesign Pipeline: **Scope Resolution.** This is a Socratic Q&A with JK to cross-reference what the live code does against what the V1 spec says it should do. You produce rulings for every discrepancy, gap, and extra. JK approves the final scope lock before any design work.

**The skill file governing this phase is at:**
`spec-docs/skills/gametracker-scope-resolver/SKILL.md`

Read it fully before starting. It contains the complete protocol.

---

## Documents to Read (in order)

1. **`spec-docs/GAMETRACKER_FUNCTIONAL_TRUTH.md`** — What the live code actually does. JK-reviewed and accepted with corrections noted below.

2. **`spec-docs/v1-simplification/MODE_2_V1_FINAL.md`** — The V1 build spec. **Read ALL 25 sections**, not just §1-§7. Sections §8-§25 cover engines/hooks that fire during game recording.

3. **`spec-docs/MODE_2_FRANCHISE_SEASON_UPDATED.md`** — Gospel context. Skim for where V1 Final simplified.

4. **`spec-docs/skills/gametracker-scope-resolver/SKILL.md`** — Your operating protocol.

---

## Critical Context from Phase 1

### The live app runs from `src/src_figma/`, NOT `src/components/GameTracker/`

`src/App.tsx` routes all pages to `src/src_figma/app/pages/`. The `src/components/GameTracker/` directory is **legacy dead code** — not routed, not rendered.

### Live architecture (the system JK actually uses)

| Role | File | Size |
|------|------|------|
| Page shell | `src/src_figma/app/pages/GameTracker.tsx` | 253KB |
| Game state brain | `src/src_figma/hooks/useGameState.ts` | 194KB |
| Interactive field | `src/src_figma/app/components/EnhancedInteractiveField.tsx` | 158KB |
| Outcome buttons | `src/src_figma/app/components/QuickBar.tsx` | 7KB |
| Scoreboard | `src/src_figma/app/components/FenwayBoard.tsx` | 12KB |
| Play log | `src/src_figma/app/components/PlayLogPanel.tsx` | 8KB |
| Enrichment | `src/src_figma/app/components/EnrichmentPanel.tsx` | 14KB |
| Runner actions | `src/src_figma/app/components/RunnerPopover.tsx` | 11KB |
| Fielder actions | `src/src_figma/app/components/FielderPopover.tsx` | 8KB |
| Lineup management | `src/src_figma/app/components/LineupCard.tsx` | 18KB |
| Undo | `src/src_figma/app/components/UndoSystem.tsx` | 10KB |
| Runner advancement | `src/src_figma/app/components/runnerDefaults.ts` | 21KB |
| Play classification | `src/src_figma/app/components/playClassifier.ts` | 18KB |
| Fielder inference | `src/src_figma/app/components/fielderInference.ts` | 18KB |
| Field rendering | `src/src_figma/app/components/FieldCanvas.tsx` | 30KB |
| Fielder icons | `src/src_figma/app/components/FielderIcon.tsx` | 21KB |
| Play location | `src/src_figma/app/components/PlayLocationOverlay.tsx` | 23KB |
| Post-game | `src/src_figma/app/pages/PostGameSummary.tsx` | 29KB |

Total live import graph: 76 files, 1.7MB.

State management is **callback-driven React hook state** (useGameState.ts), not a reducer, not Zustand, not context.

### What the user sees on screen

iPad landscape layout with:
- **FenwayBoard** (top-left): scoreboard, pitcher/batter context, stats
- **Interactive diamond** (center): full field with all 9 fielder positions as tappable icons, runners on bases, runner/fielder popovers on tap
- **Play Log** (right panel): reverse-chronological play entries, tap to enrich
- **Quick Bar** (bottom-left): K, GO, FO, LO, 1B, BB, 2B, HR, overflow (...)
- **Action Bar** (bottom): LINEUP, +FLD, +MOD buttons, enrichment hint text, undo, END

### Phase 1 Health Summary

- 76 files audited across live import graph
- Core gameplay path: ✅ WORKING — tap outcomes, runner management, stats accumulation, event persistence, fame/mojo/fitness/narrative all wired
- 4 confirmed ❌ BROKEN bugs
- 6 items ⚠️ UNKNOWN (browser verification debt from CURRENT_STATE.md)

### The 4 confirmed bugs

**Bug 1: Play-log eventId lag**
- Play-log entries use a stale pre-increment sequence number; the event log persists with the post-increment value
- Enrichment can therefore target the wrong at-bat
- Appears in multiple call sites in GameTracker.tsx
- **JK's correction:** Not a one-line fix. Clean fix is to return the persisted eventId from useGameState recording actions rather than the page guessing sequence state. This is a small API redesign.
- Evidence: `GameTracker.tsx:1611-1613`, `GameTracker.tsx:2072-2074`, etc. vs `useGameState.ts:2299-2301`

**Bug 2: Error base ignored**
- UI collects `baseReached` (batter to 1B/2B/3B on error)
- `recordError()` in useGameState.ts does not accept a batter-destination argument — always puts batter on 1B
- **JK's correction:** Not a dropped parameter. The hook doesn't have the interface for it at all. This is an API mismatch requiring a signature change + implementation in the hook.
- Evidence: `GameTracker.tsx:2192-2251` vs `useGameState.ts:3293-3295`

**Bug 3: Non-at-bat events not persisted**
- Steals, wild pitches, passed balls, pickoffs update in-memory state but never write to IndexedDB
- `recordEvent()` has a `// TODO: Log to separate event store` comment
- The store exists in eventLog.ts; the write call doesn't
- Evidence: `useGameState.ts:3598`

**Bug 4: RunnerPopover default highlight broken**
- `destinations.indexOf({ value, label: dLabel })` compares object identity, not value
- Default destination button is never highlighted
- Evidence: `RunnerPopover.tsx:162-165`

### The 6 ⚠️ UNKNOWN items (browser verification debt)

These come from CURRENT_STATE.md's unverified list. They are UX behaviors that cannot be verified by code reading alone:
1. Runner/fielder popover positioning on the diamond
2. Pitcher tap UX in FenwayBoard
3. Enrichment panel open/close flow
4. Mini-diamond tap-to-place for field location
5. Between-inning enrichment prompt
6. Post-game enrichment summary

### Key architecture facts for Phase 2

- **`+FLD` button** opens enrichment on the most recent unenriched play. It is NOT a separate fielding recorder.
- **QuickBar tap flow:** QuickBar → handleQuickBarOutcome() → useGameState recording action → play-log append. Does NOT use the legacy AtBatFlow component.
- **EnhancedInteractiveField** is the multi-step field play flow. It emits PlayData through onPlayComplete, which GameTracker.tsx processes into recording actions + fielding event extraction.
- **Batter stats DO accumulate** during gameplay in the live system. FenwayBoard consumes live stats.
- **Event persistence IS wired** for at-bats. Non-at-bat events (SB/WP/PB/PK) are the gap.
- **Figma engine integrations** (`src/src_figma/app/engines/`) are wrapper/re-export layers around the shared engines in `src/engines/`. They adapt shared engines for the Figma UI but do not replace them.
- **Fan morale hook** has a stale header comment saying "not imported/used anywhere" but IS actively used by the live GameTracker at game end.

---

## Stale References in Existing Skill Files

**Skill 2 (scope-resolver)** — Still valid. References to reconciliation matrix, question protocol, batch rulings, and ruling format are all correct.

**Skill 3 (design-spec)** — Has stale references that Phase 2 should be aware of:
- Phase D2.5 references "index.tsx" as a "99KB monolith" — this describes the LEGACY file. The live equivalent is `GameTracker.tsx` (253KB page shell) + `useGameState.ts` (194KB hook). The monolith disposition question still applies but to different files.
- Any reference to `src/components/GameTracker/` is about dead code
- The design spec skill is otherwise structurally sound

**Pipeline doc** — References Phase 1 duration as "2-4 hours (537KB codebase)" but the live codebase is 1.7MB across 76 files. Phase 1 actually ran twice. Pipeline timing estimates should be updated after Phase 2.

---

## What Phase 2 Must Do

1. **Read the functional truth doc, ALL 25 sections of V1 Final, and the gospel spec**
2. **Build the reconciliation matrix** — cross-reference code vs spec across UI, Engine, and Systems layers
3. **Present the matrix summary** to JK before asking questions
4. **Ask evidence-grounded questions** for every discrepancy, gap, and extra — cite code:line AND spec:§
5. **Support batch rulings** for groups of similar items
6. **Write rulings immediately** after each JK answer
7. **Produce GAMETRACKER_SCOPE_LOCK.md** for JK approval
8. **JK says "Scope locked"** → status becomes 🔒 LOCKED → Phase 3 can begin

### Critical framing for Phase 2

The live system is fundamentally sound. 76 files working, 4 confirmed bugs, 6 UX unknowns. This is NOT a "what do we need to rebuild" conversation — it's a "what's the precise delta between what we have and what V1 needs" conversation. Most things will be PRESERVE. The interesting questions are:
- Which of the 4 bugs are V1-blocking vs. can-ship-and-fix-later?
- Are there spec features not yet wired that are V1-critical?
- Are there code features that exceed or contradict V1 scope?
- What about the 6 UNKNOWN items — does JK have browser knowledge that resolves any of them?

---

## JK's Operating Preferences (for the new session)

- JK communicates tersely. Short answers are clear answers — don't over-probe.
- "Just keep it" = PRESERVE. Move on.
- "Cut it" = CUT. Flag dependencies, move on.
- JK expects approval gates. Don't build or change anything without explicit sign-off.
- JK uses structured protocols. Follow the skill's ruling format precisely.
- All rulings must be written to docs, not just chat. Chat is ephemeral.
- JK's review of Phase 1 included two corrections to bug severity characterization:
  - eventId lag = small API redesign, not one-line fix
  - error base = API mismatch (missing parameter), not dropped parameter
  - These corrections demonstrate JK's attention to precision. Match that standard.

---

## File Locations Summary

| Document | Path | Status |
|----------|------|--------|
| Functional Truth | `spec-docs/GAMETRACKER_FUNCTIONAL_TRUTH.md` | ✅ JK-reviewed |
| V1 Final Spec | `spec-docs/v1-simplification/MODE_2_V1_FINAL.md` | Reference |
| Gospel Spec | `spec-docs/MODE_2_FRANCHISE_SEASON_UPDATED.md` | Reference |
| Scope Resolver Skill | `spec-docs/skills/gametracker-scope-resolver/SKILL.md` | Active protocol |
| Design Spec Skill | `spec-docs/skills/gametracker-design-spec/SKILL.md` | Phase 3 (future) |
| Pipeline | `spec-docs/GAMETRACKER_REDESIGN_PIPELINE.md` | Reference |
| This handoff | `spec-docs/PHASE2_HANDOFF.md` | Context |
| CURRENT_STATE | `spec-docs/CURRENT_STATE.md` | Project state |

---

## First Action in the New Chat

Read these in order:
1. `spec-docs/PHASE2_HANDOFF.md` (this document)
2. `spec-docs/skills/gametracker-scope-resolver/SKILL.md`
3. `spec-docs/GAMETRACKER_FUNCTIONAL_TRUTH.md`
4. `spec-docs/v1-simplification/MODE_2_V1_FINAL.md`

Then build the reconciliation matrix, present the summary, and wait for JK to confirm before asking questions.
