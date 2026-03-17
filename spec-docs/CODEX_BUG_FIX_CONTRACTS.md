# CODEX BUG FIX PROMPT CONTRACTS — Post-Redesign Browser Testing
# ROUTE: All items → Codex 5.4 | high
# Source: spec-docs/POSTLAUNCH_BUG_LIST.md
# Each bug is a standalone prompt. Run in order listed.

---

## BUG-05 (CRITICAL): Undo System Broken — Duplicate Entries + Broken Out Count
# Branch: fix/bug-05-undo-system

### CONTEXT
The GameTracker UX redesign changed the Quick Bar commit flow from a pre-commit runner correction gate to immediate commit (Step 2.B). After this change, the undo button doesn't properly undo outs logic — it creates multiple play log entries stacked on top of each other and ends innings prematurely.

### GOAL
Fix the undo system so that pressing undo: (1) removes the most recent play log entry, (2) restores the game state (outs, score, runners, lineup position) to the pre-play snapshot, (3) leaves the play log consistent with the restored state.

### FILES TO READ FIRST
- `src/src_figma/app/pages/GameTracker.tsx` — search for `captureSnapshot`, `undoSystem`, `handleQuickBarOutcome`, `pushPlayLogEntry`
- `src/src_figma/app/components/UndoSystem.tsx` — understand the snapshot/restore mechanism
- `src/src_figma/hooks/useGameState.ts` — search for `undoMostRecentGameAction`, understand what state is restored on undo

### WHAT TO INVESTIGATE
1. In `handleQuickBarOutcome`, find where `captureSnapshot` is called. Is it called BEFORE `commitPlateAppearance`? If it's called after, the snapshot captures post-commit state — that's the bug.
2. When undo fires, does it remove the play log entry? Search for the undo handler — does it pop the last entry from the play log entries array?
3. Does `undoMostRecentGameAction` in useGameState.ts restore outs, score, runners, and batter index? Or does it only restore partial state?
4. Is there a mismatch between the EventLog undo (which removes the persisted event from IndexedDB) and the UI undo (which should remove the play log entry from the React state array)?

### WHAT TO FIX
1. Ensure `captureSnapshot` is called BEFORE `commitPlateAppearance` in every branch of `handleQuickBarOutcome`. The snapshot must capture the pre-commit state.
2. Ensure the undo handler removes the most recent play log entry from the entries array. If the play log is managed as React state (`playLogEntries` or similar), the undo handler must `setPlayLogEntries(prev => prev.slice(0, -1))` or equivalent.
3. Ensure `undoMostRecentGameAction` in useGameState.ts restores: `outs`, `homeScore`, `awayScore`, `bases`, `currentBatterId`, `currentBatterName`, `inning`, `isTop`. If any of these are missing from the restore, add them.
4. If the undo system uses a snapshot-based restore (captures full state, restores full state), verify the snapshot includes ALL mutable game state fields.
5. If the undo system uses an event-log-based undo (removes the last event from IndexedDB and replays), verify the replay produces correct state.

### DO NOT
- Modify the commit flow (immediate commit stays — don't re-add the pre-commit runner correction gate)
- Change EnrichmentPanel, ScoreBug, or lineup columns
- Modify eventLog.ts persistence structure

### VERIFY
```bash
npm run build
```
Browser test: Record K (0 outs → 1 out) → tap undo → outs should be 0, play log should not show the K. Record 3 outs to end half-inning → undo → inning should NOT have advanced, outs should be 2.

---

## BUG-04 (CRITICAL): Leftover Play Log Data on New Game Start
# Branch: fix/bug-04-leftover-playlog

### CONTEXT
Starting a new game in GameTracker shows leftover play log entries from a previous game.

### GOAL
Ensure the play log is empty when starting a NEW game. When RESUMING a game, existing entries should load correctly.

### FILES TO READ FIRST
- `src/src_figma/app/pages/GameTracker.tsx` — search for `playLogEntries`, `setPlayLogEntries`, `initializeOrLoadGame`, game mount/initialization logic
- `src/src_figma/hooks/useGameState.ts` — search for `initializeOrLoadGame`, `clearCurrentGame`, `loadCurrentGame`

### WHAT TO FIX
1. Find where `playLogEntries` state is initialized on component mount.
2. When a NEW game starts (no existing events in IndexedDB for this gameId), `playLogEntries` must be initialized to `[]`.
3. When RESUMING a game (events exist in IndexedDB), play log entries should be rebuilt from the existing events.
4. The issue may be that play log entries are stored in React state that persists across route navigations (e.g., if GameTracker doesn't unmount between games). Add a cleanup effect: when `gameId` changes or on mount, clear the play log entries before loading.
5. Check if `useEffect` cleanup on unmount clears the play log state.

### DO NOT
- Modify the event persistence layer (eventLog.ts)
- Change the play log rendering (PlayLogPanel.tsx)

### VERIFY
```bash
npm run build
```
Browser test: Complete a game (or record several plays) → navigate away → start a new game → play log should be empty.

---

## BUG-01 (HIGH): Pre-Game Pitcher Change Doesn't Persist
# Branch: fix/bug-01-pregame-pitcher

### CONTEXT
In exhibition mode PRE_GAME phase, user can go through the pitcher change flow (Sub Out → select new pitcher), but the new pitcher doesn't actually replace the old pitcher when START GAME is tapped.

### GOAL
Pitcher substitution made during PRE_GAME must persist into LIVE phase.

### FILES TO READ FIRST
- `src/src_figma/app/pages/GameTracker.tsx` — search for `handleLineupCardSubstitution`, `startGame`, `onStartGame`, PlayerCardModal Sub Out flow
- `src/src_figma/hooks/useGameState.ts` — search for how lineup state is managed, whether `startGame()` re-initializes lineup

### WHAT TO FIX
1. Trace the Sub Out flow in PRE_GAME: when user subs the pitcher, what function is called? Does it mutate the lineup state?
2. Trace the `startGame()` / phase transition: when gamePhase changes from PRE_GAME to LIVE, does the lineup state get reset to the original roster? If so, that's the bug.
3. Fix: either (a) make startGame() preserve the current lineup state instead of re-initializing, or (b) ensure substitution mutations are applied to the same lineup object that LIVE phase uses.
4. The same fix should handle ANY pre-game substitution (not just pitcher).

### DO NOT
- Modify the phase state machine logic (PRE_GAME/LIVE transitions stay as-is)
- Change the Sub Out UI flow

### VERIFY
```bash
npm run build
```
Browser test: Exhibition → PRE_GAME → tap pitcher in defensive lineup → Sub Out → select new pitcher → START GAME → defensive lineup should show the NEW pitcher as active.

---

## BUG-02 (HIGH): DH Shown in Defensive Lineup
# Branch: fix/bug-02-dh-defense

### CONTEXT
The defensive lineup column shows a DH entry. The DH does not play the field and should not appear in the defensive lineup.

### GOAL
Filter the defensive lineup to show only the 9 fielding positions: P, C, 1B, 2B, 3B, SS, LF, CF, RF. Exclude DH.

### FILES TO READ FIRST
- `src/src_figma/app/components/DefensiveLineupColumn.tsx` — how players are received and rendered
- `src/src_figma/app/pages/GameTracker.tsx` — what data is passed to DefensiveLineupColumn (search for `defensiveColumnPlayers` or `fieldingTeam`)

### WHAT TO FIX
1. In GameTracker.tsx where the defensive column data is derived, filter out any player whose position is 'DH'.
2. OR in DefensiveLineupColumn.tsx, filter the incoming players array: `players.filter(p => p.position !== 'DH')`.
3. The batting lineup column (column 2) SHOULD still show the DH — only the DEFENSIVE column excludes DH.

### DO NOT
- Change BattingLineupColumn (DH stays in batting lineup)
- Modify useGameState.ts

### VERIFY
```bash
npm run build
```
Browser test: Start game with DH enabled → defensive column shows 9 fielders (P through RF), no DH entry. Batting column still shows DH.

---

## BUG-03 (HIGH): Elimination Mode Shows DH Despite "No DH" Setting
# Branch: fix/bug-03-elim-no-dh

### CONTEXT
User configured elimination tournament with No DH. Pre-game lineup still shows a DH and no pitcher in the batting lineup.

### GOAL
When the tournament/league is configured with No DH, the batting lineup must include the pitcher. No DH slot.

### FILES TO READ FIRST
- Search the codebase for where elimination game lineups are initialized: `grep -rn "eliminat.*lineup\|lineup.*eliminat\|dh.*setting\|useDH\|hasDH\|dhEnabled" src/src_figma/ src/types/ src/utils/`
- `src/src_figma/app/pages/GameTracker.tsx` — how lineup is populated from elimination context
- Check the elimination tournament config type for DH-related fields

### WHAT TO FIX
1. Find where the DH setting is stored on the tournament/league/game config.
2. Find where the lineup is initialized when launching a game from elimination mode.
3. Ensure the DH setting is read and respected: if No DH, the pitcher must appear in the batting order at position 9 (or wherever the manager placed them), and no DH slot exists.
4. The issue may be that the lineup initialization always assumes DH is enabled, or the DH setting from the tournament config isn't being passed through to GameTracker.

### DO NOT
- Change the elimination tournament configuration UI
- Modify the phase state machine

### VERIFY
```bash
npm run build
```
Browser test: Create elimination tournament with No DH → start a game → batting lineup shows pitcher in batting order, no DH slot.

---

## BUG-06 (HIGH): Runner Sub-Entries Not Showing in Play Log
# Branch: fix/bug-06-runner-subentries

### CONTEXT
Tier 3 Batch A built runner sub-entries (`RunnerSubEntry` type, `buildRunnerSubEntries()` function, PlayLogPanel rendering). But during actual gameplay, they don't appear under at-bat entries in the play log.

### GOAL
After a hit with runners on base, the play log must show "└" nested entries below the at-bat, each showing a runner's base transition.

### FILES TO READ FIRST
- `src/src_figma/app/pages/GameTracker.tsx` — search for `buildRunnerSubEntries`, `runnerSubEntries`, `pushPlayLogEntry`. Trace: after `commitPlateAppearance`, where is the play log entry built? Is `buildRunnerSubEntries` called?
- `src/src_figma/app/utils/gameTrackerPlayLog.ts` — read `buildRunnerSubEntries` to understand what data it expects
- `src/utils/eventLog.ts` — check the AtBatEvent that was just committed: does `runnerOutcomes[]` have data?
- `src/src_figma/app/components/PlayLogPanel.tsx` — verify it renders `runnerSubEntries` if present on the entry

### WHAT TO FIX
1. **Most likely issue:** `buildRunnerSubEntries` is not being called after commit. Find where the play log entry is built after `commitPlateAppearance` completes. Add a call to `buildRunnerSubEntries` and attach the result to the play log entry.
2. **Alternative issue:** `runnerOutcomes[]` is empty on the committed event. Check if the immediate-commit flow (from Step 2.B) populates `runnerOutcomes[]` on the AtBatEvent. If the runner advancement data isn't being written to `runnerOutcomes`, that's the root cause.
3. **Alternative issue:** PlayLogPanel receives entries but doesn't render sub-entries. Verify the `runnerSubEntries` field name matches between the builder and the renderer.

### DO NOT
- Modify the undo system or commit flow
- Change the RunnerSubEntry type definition (unless needed for data matching)

### VERIFY
```bash
npm run build
```
Browser test: Get a runner on 1st (via BB or 1B) → hit 1B → play log should show the single entry AND "└ [runner] 1B→2B" sub-entry below it.

---

## BUG-11 (HIGH): No Spray Zone UI in Enrichment Panel
# Branch: fix/bug-11-spray-zones

### CONTEXT
The enrichment panel's FIELD LOCATION section shows "Tap the main field to place spray/location" — but the main field (diamond) was removed in Step 1.B. The SprayGraphic SVG component built in Step 2.D should render here instead.

### GOAL
Replace the "tap main field" text with the inline SprayGraphic component showing tappable zones.

### FILES TO READ FIRST
- `src/src_figma/app/components/EnrichmentPanel.tsx` — search for `useMainFieldForLocation`, `MiniDiamond`, `SprayGraphic`, `FIELD LOCATION`, `showFieldLocation`
- `src/src_figma/app/pages/GameTracker.tsx` — search for `useMainFieldForLocation` — what value is passed?

### WHAT TO FIX
1. In GameTracker.tsx, find where `useMainFieldForLocation` is passed to EnrichmentPanel. It's likely set to `true` (old diamond-tap flow). Change it to `false`.
2. OR remove the `useMainFieldForLocation` prop entirely and always render the inline SprayGraphic.
3. In EnrichmentPanel.tsx, verify that when `useMainFieldForLocation` is false (or absent), the SprayGraphic renders with the correct zone count from ENRICHMENT_CONFIG for the entry's result type.
4. Remove the "Tap the main field to place spray/location" text — that flow no longer exists.

### DO NOT
- Re-add the diamond or main field tap flow
- Modify the SprayGraphic component itself (built in 2.D, verified in T3C)

### VERIFY
```bash
npm run build
```
Browser test: Record a GO → tap play log entry → enrichment panel Field Location section shows inline SVG fan-shaped spray graphic with tappable zones. No "tap the main field" text.

---

## BUG-07 (MEDIUM): No Inferential Defaults on Plays
# Branch: fix/bug-07-enrichment-defaults

### CONTEXT
When recording a play, enrichment fields start blank. Fielding Attempt should default to "Routine" / "Made", Contact Type to "Normal", Play Mechanic to "Routine".

### GOAL
Set enrichment defaults at commit time so plays have reasonable defaults even without manual enrichment.

### FILES TO READ FIRST
- `src/src_figma/app/pages/GameTracker.tsx` — search for where enrichment data is initialized after commit (search for `setNextEventEnrichment`, `enrichment`, `EnrichmentUpdate`)
- `src/src_figma/app/components/EnrichmentPanel.tsx` — check if ENRICHMENT_CONFIG has a `defaults` field per result type

### WHAT TO FIX
1. When a play is committed (in `handleQuickBarOutcome` or the post-commit enrichment setup), set default enrichment values based on the result type:
   - All contact plays: `contactType: 'normal'`, `fieldingAttemptType: 'routine'`, `fieldingAttemptOutcome: 'made'`, `playMechanic: 'routine'`
   - K/Ꝁ: no contact enrichment defaults
   - BB/IBB/HBP: no contact enrichment defaults
2. These defaults should be written to the enrichment data so the play log shows enrichment badges even without manual intervention.
3. The user can still override any default by opening the enrichment panel.

### DO NOT
- Change the enrichment panel UI or option lists
- Modify eventLog.ts

### VERIFY
```bash
npm run build
```
Browser test: Record a GO → enrichment panel shows Routine/Made/Normal/Routine already selected. Play log shows enrichment badges for the defaults.

---

## BUG-09 (MEDIUM): ScoreBug Layout — Full Names, Centering, Stadium
# Branch: fix/bug-09-scorebug-layout

### CONTEXT
ScoreBug shows truncated team names ("BLOWF", "HC"), is left-aligned, and doesn't show the home stadium name.

### GOAL
Show full team names, spread content across full width, add stadium name.

### FILE TO MODIFY
`src/src_figma/app/components/ScoreBug.tsx`
`src/src_figma/app/pages/GameTracker.tsx` — pass stadiumName prop

### WHAT TO FIX
1. **Full team names:** The `awayTeamName` and `homeTeamName` props may contain full names but be truncated by CSS (`overflow: hidden`, `text-overflow: ellipsis`, or a max-width). Remove truncation. If the props contain abbreviations, check GameTracker.tsx for where they're derived and use the full name instead.
2. **Layout:** Change the ScoreBug's flex container from `justify-start` (left-aligned) to `justify-between` or use explicit spacing. Content should spread: `[AWAY SCORE] | [INNING] | [HOME SCORE] | [bases] [outs] | [stadium] | [indicators]`.
3. **Stadium name:** Add `stadiumName?: string` prop to ScoreBug. Display it between the outs and the right-side indicators. GameTracker.tsx has `gameState.stadiumName` — pass it through.

### DO NOT
- Change the expand/collapse overlay behavior
- Modify the indicator icons (✓, Ⓜ, 🔊)

### VERIFY
```bash
npm run build
```
Browser test: ScoreBug shows "BLOWFISH 1 | T1 | HERBISAURS 0" (full names), content spread across width, stadium name visible.

---

## BUG-10 (MEDIUM): Enrichment Pane Buttons Too Small for iPad
# Branch: fix/bug-10-enrichment-sizes

### CONTEXT
Enrichment panel buttons/chips are tiny (text-[7px], minimal padding). Hard to tap on iPad.

### GOAL
Increase all tappable elements in the enrichment panel to iPad-friendly sizes (minimum ~36-44px tap targets).

### FILE TO MODIFY
`src/src_figma/app/components/EnrichmentPanel.tsx`

### WHAT TO FIX
Apply these CSS changes throughout EnrichmentPanel.tsx:

1. **Option buttons/chips** (Contact Type, Fielding Attempt, Play Mechanic, Pitch Type, Modifiers):
   - Text: `text-[7px]` → `text-[11px]` or `text-xs`
   - Padding: `px-1.5 py-0.5` → `px-3 py-2`
   - Minimum height: add `min-h-[36px]`
   - Gap between buttons: `gap-0.5` → `gap-1.5`

2. **Section labels** (CONTACT TYPE, FIELDING ATTEMPT, etc.):
   - Text: `text-[8px]` → `text-[10px]` or `text-[11px]`

3. **Fielding Attribution number buttons** (1-9):
   - Size: ensure at least 36×36px tap target
   - Text: increase if currently tiny

4. **Pitch count input field**:
   - Height: ensure comfortable tap target
   - Text: increase to readable size

5. **The SprayGraphic** zones should also be checked — if zones are too small to tap, increase the SVG viewBox or the overall graphic height.

6. The panel itself has `overflow-y: auto` so if enlarged elements cause overflow, that's fine — it scrolls.

### DO NOT
- Change the enrichment option VALUES or logic
- Modify the per-result ENRICHMENT_CONFIG
- Change any other component

### VERIFY
```bash
npm run build
```
Browser test: On iPad (or desktop simulating iPad), all enrichment buttons are comfortably tappable with a fingertip. No precision tapping required.

---

## BUG-08 (LOW): Batter/Pitcher Highlight Is Left-Bar Not Outline
# Branch: fix/bug-08-lineup-outline

### CONTEXT
Current batter and pitcher are highlighted with a colored bar on the left side only. Spec says full border outline around the entire row.

### GOAL
Change from left-border accent to full border on all 4 sides for current batter and current pitcher rows.

### FILES TO MODIFY
- `src/src_figma/app/components/BattingLineupColumn.tsx` — current batter highlight
- `src/src_figma/app/components/DefensiveLineupColumn.tsx` — current pitcher highlight

### WHAT TO FIX
1. In BattingLineupColumn.tsx, find where the current batter row gets its highlight styling. It likely has something like `border-l-[3px] border-l-[${teamColor}]`. Change to `border-[2px] border-[${teamColor}]` (all 4 sides).
2. In DefensiveLineupColumn.tsx, same change for the current pitcher row.
3. Keep the team primary color — just change from left-only to full border.
4. For the next-inning leadoff dotted outline, also verify it's a full dotted border (not just left).

### DO NOT
- Change the team color logic
- Modify any other styling

### VERIFY
```bash
npm run build
```
Browser test: Current batter row has a visible border on all 4 sides in team color. Same for current pitcher. Next-inning leadoff has dotted border on all 4 sides.

---

## END OF BUG FIX CONTRACTS

### Execution Order
1. BUG-05 (undo system) — CRITICAL, fix first
2. BUG-04 (leftover play log) — CRITICAL
3. BUG-01 (pre-game pitcher) — HIGH
4. BUG-02 (DH in defense) — HIGH
5. BUG-03 (elimination DH) — HIGH
6. BUG-06 (runner sub-entries) — HIGH
7. BUG-11 (spray zone UI) — HIGH
8. BUG-07 (enrichment defaults) — MEDIUM
9. BUG-09 (scorebug layout) — MEDIUM
10. BUG-10 (enrichment sizes) — MEDIUM
11. BUG-08 (lineup outline) — LOW

Each bug has its own branch name. Run `npm run build` after each fix. Browser-verify before merging.
