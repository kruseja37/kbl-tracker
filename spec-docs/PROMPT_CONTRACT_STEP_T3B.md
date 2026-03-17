# PROMPT CONTRACT: Tier 3 Batch B — Catcher Auto-Assign + Undo Depth Locking
# ROUTE: Claude Code CLI | Opus 4.6
# Branch: feature/gt-ux-t3b-catcher-undo-depth
# Prerequisite: Tier 3 Batch A merged to main (or independent — no hard dependency)

---

You are a senior React/TypeScript engineer adding two state-level features to the GameTracker: automatic catcher tracking for between-play events, and undo-depth-aware locking for historical event editing.

## GOAL

Two items:
1. **(UX-053 / item 3.11)** Add `currentCatcherId` to GameState. Auto-assign catcher on BetweenPlayEvents alongside pitcher.
2. **(UX-055 / item 3.13)** Implement undo-depth-aware locking: events within 10-deep undo stack = full correction. Events beyond undo depth = structural outcomes LOCKED, enrichment fields editable forever.

## SOURCE OF TRUTH

- `spec-docs/GAMETRACKER_UX_SPEC.md` — §8.7 BetweenPlayEvent Auto-Assignment, §12.3 Beyond Undo Depth
- `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` — UX-053, UX-055

## BEFORE YOU WRITE ANY CODE

1. Read `spec-docs/GAMETRACKER_UX_SPEC.md` §8.7, §12.3
2. Read `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` entries for UX-053, UX-055
3. In useGameState.ts, search for `currentPitcherId` — find where it's set and how it's used. The `currentCatcherId` should follow the same pattern.
4. In useGameState.ts, search for how BetweenPlayEvents auto-assign pitcher: look for `pitcherId: details?.pitcherId || gameState.currentPitcherId` (~line 4583-4591 per gap analysis). This is where catcher auto-assignment should be added.
5. Search for the catcher in the lineup data: how is the player at position 'C' identified? Search for `position.*C` or `catcher` in the lineup handling code.
6. Read UndoSystem.tsx to understand `maxSteps` (10 per gap analysis at GameTracker.tsx:733). Understand how the undo stack tracks which events can be undone.
7. In GameTracker.tsx or the enrichment flow, find where historical events are opened for editing. Search for `HistoricalEventEditor`, `isEnrichable`, `locked`, `LockedOutcomeNotice`. Understand the current blanket locking behavior.
8. Create branch: `git checkout -b feature/gt-ux-t3b-catcher-undo-depth`
9. Run `npm run build`

## CONSTRAINTS

### Files you WILL modify:
```
src/src_figma/hooks/useGameState.ts            — Add currentCatcherId to GameState, auto-assign on BetweenPlayEvents
src/src_figma/app/pages/GameTracker.tsx          — Undo depth locking logic in enrichment/editing flow
src/src_figma/app/components/UndoSystem.tsx      — May need to expose undo stack depth or event index range
```

### Files you MAY need to modify:
```
src/src_figma/app/components/EnrichmentPanel.tsx — Respect undo depth locking (enrichment always editable, result locked)
src/src_figma/app/components/HistoricalEventEditor.tsx — Respect undo depth locking
```

### Files you MUST NOT modify:
```
src/utils/eventLog.ts
src/src_figma/app/components/QuickBar.tsx
src/src_figma/app/components/ScoreBug.tsx
Any file under src/components/
```

## EXACT CHANGES

### Item 3.11 (UX-053): currentCatcherId auto-assignment

1. In useGameState.ts, add `currentCatcherId: string` to the GameState interface.
2. Initialize `currentCatcherId` by finding the player at position 'C' in the starting lineup. Search for how `currentPitcherId` is initialized and follow the same pattern for the catcher.
3. Update `currentCatcherId` when:
   - A substitution replaces the catcher (search for substitution handling)
   - A position change moves someone to catcher
4. In the BetweenPlayEvent auto-assignment code (~line 4583-4591), add:
   ```typescript
   catcherId: details?.catcherId || gameState.currentCatcherId
   ```
   alongside the existing pitcher auto-assignment.
5. Expose `currentCatcherId` in the hook's return value if any component needs it.

### Item 3.13 (UX-055): Undo-depth-aware locking

The spec defines two tiers:
- **Within undo depth (most recent 10 events):** Full correction — result and enrichment both editable. Undo is the mechanism.
- **Beyond undo depth (older than 10 events):** Structural outcomes LOCKED (who scored, who was out, which base). Enrichment fields remain editable FOREVER.

Implementation:

1. Determine the "undo boundary" — the eventIndex of the oldest event in the current undo stack. Events with eventIndex >= undoBoundary are within undo depth. Events below are beyond.
2. Expose this information: either add a function `isWithinUndoDepth(eventIndex: number): boolean` or expose the boundary index from UndoSystem.
3. In the enrichment/editing flow (EnrichmentPanel, HistoricalEventEditor, or wherever historical events are opened):
   - If event is within undo depth → show "Use ↩ Undo to change result" for the result field. Enrichment fields are editable. (The user uses undo to correct the result, not inline editing.)
   - If event is beyond undo depth → result field is LOCKED (not editable, no undo available). Show locked notice. Enrichment fields remain editable.
   - In BOTH cases: enrichment fields (contact type, fielding attempt, spray location, pitch type, pitch count, modifiers, runner enrichment) are editable.
4. The current code applies a blanket lock to ALL historical events (HistoricalEventEditor.tsx:116 shows LockedOutcomeNotice for everything). Change this to be undo-depth-aware:
   - Within depth: outcome editable via undo (show undo hint)
   - Beyond depth: outcome locked (show locked notice), enrichment open

## VERIFICATION

```bash
# 1. Build passes
npm run build

# 2. Tests pass
npm test

# 3. currentCatcherId in GameState
grep -n "currentCatcherId" src/src_figma/hooks/useGameState.ts | head -10
# Expected: field in GameState, initialization, update on sub, auto-assign on BetweenPlayEvent

# 4. Catcher auto-assigned on BetweenPlayEvents
grep -n "catcherId.*currentCatcherId\|currentCatcherId.*catcher" src/src_figma/hooks/useGameState.ts | head -5
# Expected: auto-assignment alongside pitcherId

# 5. Undo depth boundary exposed
grep -n "undoBoundary\|isWithinUndoDepth\|undoDepth\|undo.*boundary" src/src_figma/ -r --include="*.ts" --include="*.tsx" | head -5
# Expected: boundary calculation or depth-check function

# 6. Enrichment stays editable beyond undo depth
grep -n "enrichment.*editable\|always.*editable\|beyond.*undo.*enrich" src/src_figma/ -r --include="*.tsx" | head -5
# Expected: logic that keeps enrichment fields open regardless of undo depth
```

## FORMAT

```
TIER 3 BATCH B COMPLETE

Files changed: [list with descriptions]

currentCatcherId:
[Describe: how initialized, when updated, where auto-assigned]

Undo depth locking:
[Describe: how boundary is calculated, what's locked vs editable at each tier]

Verification results: [all 6 checks]
Ready for JK browser verification.
```

## FAILURE PROTOCOL

- If identifying the catcher from the lineup is complex (position 'C' not reliably in the data) → initialize currentCatcherId as empty string with TODO. The auto-assignment infrastructure is more important than perfect initialization.
- If the undo stack doesn't track event indices → use a simpler heuristic: the undo stack has N snapshots, the most recent N events are within depth. Map snapshots to events by timestamp.
- If changing the blanket lock behavior breaks the historical editor → keep the blanket lock for outcomes but explicitly unlock enrichment fields. The key behavioral change: enrichment is ALWAYS editable.

## ANTI-PATTERNS

- Do NOT modify eventLog.ts.
- Do NOT modify QuickBar, ScoreBug, or lineup columns.
- Do NOT remove the undo system — only add depth-aware locking on top.
- Do NOT touch src/components/.

Use high reasoning effort. Read before writing. Build after every file change.
