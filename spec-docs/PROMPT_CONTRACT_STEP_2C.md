# PROMPT CONTRACT: Step 2.C — Player Card + Substitution Rewrite
# ROUTE: Claude Code CLI | Opus 4.6
# Branch: feature/gt-ux-t2c-playercard-subs
# Prerequisite: Step 2.B merged to main

---

You are a senior React/TypeScript engineer rewriting the player card and substitution system for KBL Tracker's GameTracker. Steps 2.A (Quick Bar updates) and 2.B (immediate commit flow + orphaned button cleanup) are complete. The old lineup overlay modal and drag-drop substitution are removed. This step builds the replacement.

## GOAL

Five changes:
1. Wire real season stats to the player card (currently hardcoded zeros)
2. Add missing stat fields (OPS, WAR, WHIP, IP, pWAR) and fix label ("SO" → "K")
3. Separate season stats (player card) from game stats (NewsBoard header)
4. Build player-first substitution: tap player → card → Sub Out → bench list → select replacement
5. Add discrete Update Mojo / Update Fitness action buttons + auto-injury on weak/strained/hurt

## SOURCE OF TRUTH

- `spec-docs/GAMETRACKER_UX_SPEC.md` — §5.3 Player Card, §5.5 Player Card Actions, §9.1 Player-First Substitution, §9.2 Pitcher Changes, §14 Mojo & Fitness
- `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` — UX-017, UX-018, UX-019, UX-030, UX-031
- `spec-docs/GAMETRACKER_UX_IMPLEMENTATION_PLAN.md` — Group 2.C

## BEFORE YOU WRITE ANY CODE

1. Read `spec-docs/GAMETRACKER_UX_SPEC.md` §5.3, §5.5, §9.1, §9.2, §14
2. Read `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` entries for UX-017, UX-018, UX-019, UX-030, UX-031
3. In GameTracker.tsx, read the PlayerCardModal component (starts at ~line 6429). Note:
   - Stats are hardcoded zeros (line ~6456: "T0-09: Zero stats for player card")
   - Props include mojo/fitness editing but as inline toggle, not discrete buttons
   - No Sub Out or Swap Position buttons (only Swap Order from Step 1.C)
4. Find how `playerStats` and `pitcherStats` Maps are populated in GameTracker.tsx. Search for `playerStats`, `pitcherStats`, `buildPlayerStats`, `aggregateStats`. These Maps contain real game-in-progress stats that should feed the player card.
5. Find where season-level stats come from. Search for `seasonStats`, `careerStats`, or check if the franchise data store has season aggregates accessible from GameTracker's context.
6. Read the 2.B outcome: `handleRunnerSubstitute` now console.warns, `handleLineupCardSubstitution` is orphaned. These are the broken substitution paths you need to replace.
7. Search for bench player data: `grep -n "bench\|Bench\|bullpen\|Bullpen" src/src_figma/app/pages/GameTracker.tsx | head -20` — find where the bench roster is accessible.
8. Create branch: `git checkout -b feature/gt-ux-t2c-playercard-subs`
9. Run `npm run build` to confirm clean baseline

## CONSTRAINTS

### Files you WILL modify:
```
src/src_figma/app/pages/GameTracker.tsx    — Rewrite PlayerCardModal: wire real stats, add action buttons, build sub flow
```

### Files you MAY need to modify:
```
src/src_figma/app/components/BattingLineupColumn.tsx   — May need to pass additional data for player card
src/src_figma/app/components/DefensiveLineupColumn.tsx — Same
src/src_figma/app/components/NewsBoard.tsx             — Ensure it shows game stats (already partially wired from 1.C)
src/src_figma/hooks/useGameState.ts                    — ONLY if auto-injury logging requires a new function (e.g., logInjuryEvent)
```

### Files you MUST NOT modify:
```
src/utils/eventLog.ts                          — Persistence layer, DO NOT TOUCH
src/src_figma/app/components/EnrichmentPanel.tsx
src/src_figma/app/components/QuickBar.tsx
src/src_figma/app/components/ScoreBug.tsx
src/src_figma/app/components/LineupCard.tsx    — Old drag-drop component. Do NOT wire it into the new flow. It's being phased out.
Any file under src/components/                 — DEAD CODE
```

## EXACT CHANGES — 5 items

### Item 2.6 (UX-017): Wire real stats to player card

1. The PlayerCardModal currently has hardcoded zeros (line ~6456-6486). Replace these with real data.
2. **Game stats** (current game): Find the `playerStats` and `pitcherStats` Maps in GameTracker.tsx. Pass the relevant player's stats into the PlayerCardModal via props. Display: AB, H, HR, RBI, BB, K for batters; IP, H, ER, K, BB for pitchers.
3. **Season stats**: Search for where season-level aggregates are accessible. If they're in the franchise data store (trackerDb), they may need to be loaded. If not readily available, show "Season: —" as placeholder and document what data source is needed.
4. **Full attributes from League Builder**: The spec wants age, gender, ratings, traits, player morale displayed. Search for the Player interface in the codebase (`src/types/` or the data layer) to see what fields exist. Show whatever is available. If age/gender/traits aren't in the Player model, note this as a gap.
5. Pass the player object (not just name/type/id) to PlayerCardModal so it has access to all available fields.

### Item 2.7 (UX-018): Add missing stat fields and fix labels

1. **Batter card additions:** Add OPS and WAR fields. If OPS can be computed from existing stats (OBP + SLG), compute it. If WAR is not readily available, show "—".
2. **Pitcher card additions:** Add WHIP, IP, and pWAR fields. WHIP = (BB + H) / IP. If IP is available, compute WHIP. If pWAR is not available, show "—".
3. **Label fix:** Change "SO" label to "K" for strikeouts throughout the player card.

### Item 2.8 (UX-019): Season stats vs game stats separation

1. Player card shows SEASON stats (or tournament-scoped stats for elimination mode).
2. NewsBoard header shows GAME stats (current game only — already partially wired from Step 1.C).
3. Verify the NewsBoard header is showing game-level stats (built in 1.C with `batterGameLine` and `pitcherGameLine`). If it's already correct, just confirm. If it's showing season stats, fix the data source.
4. If season stats aren't available for the player card yet, the card can show game stats with a "THIS GAME" header for now, with a TODO for season stat wiring.

### Item 2.9 (UX-030): Player-first substitution flow

This is the most important item in this step. The old flow (drag-drop via LineupCard in a modal overlay) is removed. Build the replacement:

1. Add a "SUB OUT" button to PlayerCardModal. Visible in all phases (PRE_GAME and LIVE).
2. When SUB OUT is tapped:
   - The player card's content is REPLACED with a full bench list showing all available bench players
   - The bench list shows all players NOT currently in the lineup, regardless of position (spec §9.1: "all players, ungrouped, regardless of position")
   - Each bench player entry shows: name, position(s), and key stats if available
   - Tapping a bench player selects them as the replacement
3. After bench player selection:
   - The substitution is executed: the bench player enters the lineup at the same batting order slot, the original player goes to the bench
   - If the substituted player is the PITCHER: trigger a pitch count prompt for the outgoing pitcher (reuse existing PitchCountPrompt mechanism from useGameState.ts)
   - Log a substitution BetweenPlayEvent via the existing substitution logging path
   - Close the player card
4. Add a "SWAP POSITION" button to PlayerCardModal. Visible in LIVE phase.
   - When tapped, enter swap position mode (similar to Swap Order mode from Step 1.C): close the card, show a banner "Tap another player to swap fielding positions", next player tap completes the swap.
   - This swaps fielding POSITIONS only (not batting order). E.g., SS and 3B swap defensive positions.
5. Connect this to the broken substitution paths from Step 2.B:
   - `handleRunnerSubstitute` should now route through the player card Sub Out flow (tap runner in lineup → player card opens → Sub Out)
   - `handleLineupCardSubstitution` should be replaced by the new substitution execution logic

**IMPORTANT:** The old LineupCard drag-drop code should NOT be wired into the new flow. The LineupCard component may still exist in the codebase but it's not rendered in the new layout. The new flow is entirely through the player card modal.

### Item 2.10 (UX-031): Discrete mojo/fitness buttons + auto-injury

1. Replace the current inline click-to-expand mojo/fitness editing with two discrete ACTION BUTTONS:
   - "UPDATE MOJO" — opens a selector with the mojo levels (-2 to +2 with named states)
   - "UPDATE FITNESS" — opens a selector with fitness states (JUICED through HURT)
2. These buttons are visible in LIVE and POST_FINAL_OUT phases (not PRE_GAME — pre-game has no mojo/fitness changes).
3. **Auto-injury logging:** When fitness is set to 'Weak', 'Strained', or 'Hurt', automatically log an injury BetweenPlayEvent. This requires:
   - Detecting the fitness change
   - Calling the BetweenPlayEvent logging mechanism for an 'injury' event type
   - Search useGameState.ts for how injury events are currently logged (search for `'injury'` in the BetweenPlayEvent type handlers)
   - If an injury logging function doesn't exist in the hook's API, you may need to add one to useGameState.ts — this is the ONE case where modifying that file is permitted in this step
4. The mojo/fitness values should persist via the existing BetweenPlayEvent mechanism (mojo_change, fitness_change event types already exist per the spec).

## VERIFICATION

```bash
# 1. Build passes
npm run build

# 2. Tests pass
npm test

# 3. Real stats wired (no more hardcoded zeros)
grep -n "T0-09\|TODO.*Wire\|\.000\|avg: '\.000'" src/src_figma/app/pages/GameTracker.tsx
# Expected: 0 matches (hardcoded zeros replaced with real data or proper placeholders)

# 4. SUB OUT button exists
grep -n "SUB OUT\|Sub Out\|subOut" src/src_figma/app/pages/GameTracker.tsx | head -5
# Expected: button in PlayerCardModal

# 5. SWAP POSITION button exists
grep -n "SWAP POSITION\|Swap Position\|swapPosition" src/src_figma/app/pages/GameTracker.tsx | head -5
# Expected: button in PlayerCardModal

# 6. Bench list rendering exists
grep -n "bench.*list\|benchPlayer\|BenchList\|BENCH" src/src_figma/app/pages/GameTracker.tsx | head -5
# Expected: bench player list in the sub out flow

# 7. Auto-injury logging
grep -n "auto.*injury\|injury.*auto\|Weak.*injury\|Strained.*injury\|Hurt.*injury" src/src_figma/app/pages/GameTracker.tsx | head -5
# Expected: 1+ matches for auto-injury logic on fitness change

# 8. SO label removed, K label present
grep -n '"SO"\|label.*SO\|>SO<' src/src_figma/app/pages/GameTracker.tsx
# Expected: 0 matches (replaced with K)
```

## FORMAT

When complete, output:

```
STEP 2.C COMPLETE

Files changed:
1. src/src_figma/app/pages/GameTracker.tsx — [describe: player card rewrite, sub flow, stats wiring]
2. [any other files modified]

Stats wiring audit:
[For each stat field in the player card, state: where the data comes from, or "—" placeholder if unavailable]
- Batter: AVG, HR, RBI, OPS, WAR, SB — [source for each]
- Pitcher: ERA, W-L, K, WHIP, IP, pWAR — [source for each]
- Season vs game: [which shows where]

Substitution flow:
[Describe the new flow step by step: tap player → card → Sub Out → bench list → select → execute]
[Note: does pitcher pitch count prompt fire on pitcher replacement?]

Broken paths reconnected:
[List handleRunnerSubstitute and handleLineupCardSubstitution — how each was resolved]

Verification results:
[all 8 checks with outcomes]

Ready for JK browser verification.
```

## FAILURE PROTOCOL

- If season stats are not accessible from GameTracker's context → use game stats for the player card with a "THIS GAME" header. Document what data source is needed for season stats and add a TODO. Do NOT fabricate season stats.
- If the bench roster is not easily accessible → search for `awayTeamPlayers`, `homeTeamPlayers` (these contain ALL players) and filter out those currently in the lineup. The bench = all team players minus active lineup players.
- If the pitch count prompt doesn't fire on pitcher substitution → search for how PitchCountPrompt is triggered (search for `'pitching_change'` in useGameState.ts). Wire the same trigger mechanism. If it's too complex to wire, document it as a known gap.
- If auto-injury event logging requires modifying useGameState.ts and the mechanism is complex → implement a simpler version: when fitness changes to Weak/Strained/Hurt, log a console.warn("AUTO-INJURY: [player] — [fitness]") and add a TODO for the BetweenPlayEvent. The visual behavior (button exists, selector works) is more important than the persistence in this step.
- If the bench list is too long to display in the card modal → add internal scrolling to the bench list section. The player card modal can grow taller for the bench list view.
- If OPS/WAR/WHIP/pWAR can't be computed from available data → show "—" placeholder. Document what data is needed.
- If anything is ambiguous → STOP and report. Do NOT guess.

## ANTI-PATTERNS

- Do NOT wire the old LineupCard drag-drop into the new flow. That component is being phased out.
- Do NOT modify eventLog.ts (except the permitted injury logging case through useGameState.ts).
- Do NOT modify QuickBar.tsx, ScoreBug.tsx, or EnrichmentPanel.tsx.
- Do NOT build enrichment in the player card — the card initiates events (subs, mojo, fitness), enrichment happens via play log.
- Do NOT add runner action buttons (Steal, Advance, etc.) to the player card — that's a separate concern.
- Do NOT touch src/components/ (dead code).
- Do NOT invent fake stats. Real data or "—" — nothing in between.

Use high reasoning effort. Read before writing. Build after every file change.
