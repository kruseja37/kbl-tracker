# PROMPT CONTRACT: Tier 3 Batch A — Runner Sub-Entries + Runner Enrichment
# ROUTE: Claude Code CLI | Opus 4.6
# Branch: feature/gt-ux-t3a-runner-subentries
# Prerequisite: Tier 2 complete

---

You are a senior React/TypeScript engineer building runner visibility and enrichment into the GameTracker play log. Currently, runner outcomes during at-bats are committed to IndexedDB (runnerOutcomes[] on AtBatEvent exists) but are NOT visible in the play log after commit. This step makes them visible and independently enrichable.

## GOAL

Two items (must be done in order — 3.9 first, then 3.8):
1. **(UX-051 / item 3.9)** Build runner sub-entries in the play log: nested "└" entries under each at-bat showing each runner's outcome + base transition. Independently tappable for enrichment.
2. **(UX-050 / item 3.8)** Add enrichment sub-fields to runner sub-entries: per-runner fielding sequence, play mechanic, TOOTBLAN, Out Advancing.

## SOURCE OF TRUTH

- `spec-docs/GAMETRACKER_UX_SPEC.md` — §7.2 Runner Sub-Entries, §8.6 Two-Pathway Enrichment
- `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` — UX-050, UX-051

## BEFORE YOU WRITE ANY CODE

1. Read `spec-docs/GAMETRACKER_UX_SPEC.md` §7.2, §8.6
2. Read `src/src_figma/app/components/PlayLogPanel.tsx` in full
3. Read `src/src_figma/app/utils/playLogTypes.ts` in full — note PlayLogEntry is flat, no children/sub-entries
4. Read `src/utils/eventLog.ts` — find the AtBatEvent interface, specifically the `runnerOutcomes` field (~line 302-307). Understand the shape: `Array<{ runnerId, runnerName, fromBase, toBase }>`
5. In GameTracker.tsx, find where play log entries are built from committed events. Search for `pushPlayLogEntry`, `buildPlayLogEntry`, or wherever AtBatEvents are transformed into PlayLogEntry objects. Understand how the existing play log is populated — runner sub-entries will be inserted alongside or below the parent at-bat entries.
6. Create branch: `git checkout -b feature/gt-ux-t3a-runner-subentries`
7. Run `npm run build` to confirm clean baseline

## CONSTRAINTS

### Files you WILL modify:
```
src/src_figma/app/utils/playLogTypes.ts        — Add runner sub-entry fields to PlayLogEntry or create a new RunnerSubEntry type
src/src_figma/app/components/PlayLogPanel.tsx   — Render runner sub-entries nested under parent at-bats
src/src_figma/app/pages/GameTracker.tsx          — Build runner sub-entries from committed AtBatEvent.runnerOutcomes[]
```

### Files you MAY need to modify:
```
src/src_figma/app/components/EnrichmentPanel.tsx — Add runner-level enrichment fields (TOOTBLAN, Out Advancing, fielding seq, play mechanic)
src/utils/eventLog.ts                            — ONLY if runnerOutcomes[] needs new sub-fields for enrichment storage
```

### Files you MUST NOT modify:
```
src/src_figma/hooks/useGameState.ts
src/src_figma/app/components/QuickBar.tsx
src/src_figma/app/components/ScoreBug.tsx
src/src_figma/app/components/BattingLineupColumn.tsx
src/src_figma/app/components/DefensiveLineupColumn.tsx
Any file under src/components/
```

## EXACT CHANGES

### Item 3.9 (UX-051): Runner sub-entries in play log

1. **Extend the data model.** Either:
   - Add a `runnerSubEntries?: RunnerSubEntry[]` array to PlayLogEntry, OR
   - Create a separate RunnerSubEntry type and include it in the entries array as a child type
   
   Each RunnerSubEntry needs:
   ```typescript
   interface RunnerSubEntry {
     id: string;
     parentEventId: string;        // links to the parent at-bat entry
     runnerId: string;
     runnerName: string;
     fromBase: 'first' | 'second' | 'third';
     toBase: 'second' | 'third' | 'home' | 'out';
     isEnrichable: boolean;         // always true
     // Enrichment fields (item 3.8):
     fieldingSequence?: number[];
     playMechanic?: string;
     isTootblan?: boolean;
     isOutAdvancing?: boolean;
   }
   ```

2. **Build sub-entries from committed events.** In GameTracker.tsx, wherever play log entries are built from committed AtBatEvents, also build RunnerSubEntry objects from `event.runnerOutcomes[]`. Each runner outcome becomes a sub-entry nested under the parent at-bat.

3. **Render in PlayLogPanel.** After each at-bat entry in the play log, render its runner sub-entries (if any) as indented rows:
   - Format: `└ [runnerName] [fromBase]→[toBase]  [+fld] [+mech]`
   - The "└" prefix visually nests the sub-entry under the parent
   - Each sub-entry is tappable (calls `onRunnerSubEntryTap(subEntry)`)
   - Visual distinction: slightly smaller font, slightly dimmer color, indented 12-16px from left edge
   - Sub-entries for runners who scored ("→home") get a subtle highlight
   - Sub-entries for runners who were out ("→out") get a red-ish tint

### Item 3.8 (UX-050): Runner-level enrichment fields

1. **Add enrichment fields to runner sub-entries.** When a runner sub-entry is tapped, show enrichment fields specific to that runner:
   - **Fielding sequence** for the play that affected this runner (reuse the existing fielding sequence input pattern from EnrichmentPanel)
   - **Play mechanic** — same options as the at-bat level (Routine/Relay/Rundown/Tag Play/Unassisted/Deflection)
   - **TOOTBLAN** toggle — boolean, runner's fault (this is where TOOTBLAN belongs per UX-047)
   - **Out Advancing** toggle — boolean, manager's fault (feeds mWAR)

2. **Enrichment UI for runner sub-entries.** Options:
   - Option A: Expand inline below the sub-entry row (like the at-bat enrichment expands in the play log). This is the spec's preferred pattern — "north-south expansion."
   - Option B: Reuse EnrichmentPanel with a runner-specific mode.
   - Either approach is acceptable. The key requirement: tapping a runner sub-entry opens enrichment fields FOR THAT SPECIFIC RUNNER, not for the whole at-bat.

3. **Persistence.** Runner enrichment data should be stored on the runnerOutcomes[] array in the AtBatEvent. If the current runnerOutcomes sub-object doesn't have these fields, add them:
   ```typescript
   // In eventLog.ts AtBatEvent.runnerOutcomes[]
   {
     runnerId: string;
     runnerName: string;
     fromBase: 'first' | 'second' | 'third';
     toBase: 'second' | 'third' | 'home' | 'out';
     // NEW enrichment fields:
     fieldingSequence?: number[];
     playMechanic?: string;
     isTootblan?: boolean;
     isOutAdvancing?: boolean;
   }
   ```
   This is the ONE case where modifying eventLog.ts is permitted — adding optional fields to an existing interface for enrichment storage.

## VERIFICATION

```bash
# 1. Build passes
npm run build

# 2. Tests pass
npm test

# 3. RunnerSubEntry type exists
grep -rn "RunnerSubEntry\|runnerSubEntries\|runnerSubEntry" src/src_figma/ --include="*.ts" --include="*.tsx" | head -10
# Expected: type definition + rendering + building logic

# 4. Play log renders sub-entries
grep -n "└\|runner.*sub\|indented\|nested" src/src_figma/app/components/PlayLogPanel.tsx | head -10
# Expected: "└" prefix rendering + indent styling

# 5. Runner enrichment fields exist
grep -n "isTootblan\|isOutAdvancing\|runner.*enrichment\|TOOTBLAN.*runner\|Out Advancing" src/src_figma/ -r --include="*.tsx" | head -10
# Expected: toggle/checkbox rendering for TOOTBLAN and Out Advancing

# 6. Enrichment stored on runnerOutcomes
grep -n "fieldingSequence\|playMechanic\|isTootblan\|isOutAdvancing" src/utils/eventLog.ts | head -10
# Expected: fields on the runnerOutcomes sub-object
```

## FORMAT

When complete, output:

```
TIER 3 BATCH A COMPLETE

Files changed:
[list all files with descriptions]

Runner sub-entry data flow:
[Describe: AtBatEvent.runnerOutcomes[] → RunnerSubEntry objects → PlayLogPanel rendering]

Runner enrichment UI:
[Describe: how tapping a runner sub-entry opens enrichment, which fields are shown]

Verification results:
[all 6 checks]

Ready for JK browser verification.
```

## FAILURE PROTOCOL

- If runnerOutcomes[] doesn't exist on committed AtBatEvents in practice (despite being in the interface) → build the sub-entry rendering infrastructure but show "No runner data" for entries without runnerOutcomes. Document which events have the data and which don't.
- If the inline enrichment expansion is complex → start with just the TOOTBLAN and Out Advancing toggles. Fielding sequence and play mechanic for runners can be TODO'd.
- If modifying eventLog.ts causes build failures in consumers → add the new fields as optional (they already should be). Verify no consumer expects specific field shapes.
- If anything is ambiguous → STOP and report.

## ANTI-PATTERNS

- Do NOT modify useGameState.ts.
- Do NOT modify QuickBar.tsx, ScoreBug.tsx, or lineup columns.
- Do NOT change at-bat-level enrichment (that's done in 2.D).
- Do NOT add TOOTBLAN back to play-level modifiers — it stays runner-level only.
- Do NOT touch src/components/.

Use high reasoning effort. Read before writing. Build after every file change.
