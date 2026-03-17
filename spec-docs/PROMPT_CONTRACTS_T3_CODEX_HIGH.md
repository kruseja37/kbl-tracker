# CODEX PROMPT CONTRACTS — Tier 3 (Codex 5.4 High)
# 4 independent items, each runnable separately

---

## Item 3.1 (UX-023): Play Log Team Colors
# ROUTE: Codex 5.4 | high
# Branch: feature/gt-ux-t3-playlog-colors

### GOAL
Style play log player names with team primary color.

### SOURCE OF TRUTH
- `spec-docs/GAMETRACKER_UX_SPEC.md` §7.1

### FILE TO MODIFY
`src/src_figma/app/components/PlayLogPanel.tsx`

### WHAT TO DO
1. PlayLogPanel renders at-bat entries with `batterName` in each row.
2. Add a `teamColors?: { away: string; home: string }` prop and an `isTop?: boolean` prop to PlayLogPanel.
3. For each at-bat entry, determine the batting team's primary color based on whether the entry was recorded during a top or bottom half-inning.
4. Apply the team color as the text color or a left-border accent on the batter name.
5. If team colors aren't passed, fall back to the current cream/white text.

### DO NOT
- Modify any other component
- Change the play log entry structure or data model
- Add click handlers

### VERIFY
```bash
npm run build
grep -n "teamColor\|primaryColor" src/src_figma/app/components/PlayLogPanel.tsx | head -5
# Expected: prop definition + color application
```

---

## Item 3.5 (UX-039): CSS Animations
# ROUTE: Codex 5.4 | high
# Branch: feature/gt-ux-t3-css-animations

### GOAL
Add CSS-only cosmetic animations to three locations.

### SOURCE OF TRUTH
- `spec-docs/GAMETRACKER_UX_SPEC.md` §11.4

### FILES TO MODIFY
- `src/src_figma/app/components/PlayLogPanel.tsx` — fade-in on new entries
- `src/src_figma/app/components/ScoreBug.tsx` — run-scored highlight
- `src/src_figma/app/components/BattingLineupColumn.tsx` — row update highlight

### WHAT TO DO
1. **Play log entry fade-in:** When a new entry appears at the top of the play log, it should fade in and slide down slightly. Use CSS `@keyframes` or Tailwind `animate-` classes. Duration: ~300ms.
2. **Score bug run highlight:** When a run scores (score changes), briefly flash the score number with a brighter color or scale pulse. Duration: ~200ms. Use CSS transition triggered by a prop change (e.g., `scoreJustChanged` boolean that auto-resets).
3. **Lineup row highlight:** When the current batter advances (batter index changes), briefly highlight the new current batter row with a subtle flash. Duration: ~200ms.

### CONSTRAINTS
- CSS-only. No JS animation libraries. No `requestAnimationFrame`. No `setTimeout` for animation orchestration.
- Tailwind `animate-` utilities or inline `@keyframes` in style tags are acceptable.
- Animations must NOT delay processing, move tap targets, or block user input.

### DO NOT
- Add audio (that's item 3.12)
- Modify QuickBar, EnrichmentPanel, or useGameState
- Use JS-driven animations

### VERIFY
```bash
npm run build
grep -n "animate\|@keyframes\|transition\|fade" src/src_figma/app/components/PlayLogPanel.tsx | head -5
grep -n "animate\|flash\|pulse\|highlight" src/src_figma/app/components/ScoreBug.tsx | head -5
```

---

## Item 3.10 (UX-052): Player Card Initiate-Only Enforcement
# ROUTE: Codex 5.4 | high
# Branch: feature/gt-ux-t3-playercard-initiate-only

### GOAL
Ensure the player card ONLY initiates events (subs, steals, mojo/fitness changes). No enrichment editing in the player card.

### SOURCE OF TRUTH
- `spec-docs/GAMETRACKER_UX_SPEC.md` §5.5, §8.6

### FILE TO MODIFY
`src/src_figma/app/pages/GameTracker.tsx` — PlayerCardModal section (~line 6429+)

### WHAT TO DO
1. Read the PlayerCardModal component in GameTracker.tsx.
2. Verify it does NOT contain any enrichment editing UI — no contact type selectors, no fielding sequence input, no spray graphic, no modifier toggles.
3. It SHOULD contain: player info display, stats display, action buttons (Sub Out, Swap Position, Swap Order, Update Mojo, Update Fitness).
4. If any enrichment editing leaked into the player card, remove it. Enrichment happens exclusively via play log tap → EnrichmentPanel.
5. If the card is already clean (initiate-only), document as "VERIFIED — no changes needed."

### DO NOT
- Modify EnrichmentPanel, PlayLogPanel, or QuickBar
- Add new features to the player card
- Remove the action buttons (Sub Out, etc.)

### VERIFY
```bash
npm run build
grep -n "exitType\|contactType\|fieldingSequence\|sprayGraphic\|MODIFIER_OPTIONS" src/src_figma/app/pages/GameTracker.tsx | grep -i "playercard\|player.*card"
# Expected: 0 matches (no enrichment in player card)
```

---

## Item 3.12 (UX-054): Audio System
# ROUTE: Codex 5.4 | high
# Branch: feature/gt-ux-t3-audio

### GOAL
Build a retro 8-bit audio system with two independent toggles.

### SOURCE OF TRUTH
- `spec-docs/GAMETRACKER_UX_SPEC.md` §11.5

### FILES TO CREATE
`src/src_figma/app/utils/audioManager.ts` — Audio utility

### FILES TO MODIFY
- `src/src_figma/app/pages/GameTracker.tsx` — Wire audio triggers + toggle state
- `src/src_figma/app/components/ScoreBug.tsx` — Wire audio toggle icons (🔊 already rendered as placeholders)

### WHAT TO DO
1. Create `audioManager.ts` with a class or module that:
   - Uses the Web Audio API (AudioContext + OscillatorNode) to generate 8-bit retro sounds
   - Defines named sounds: `quickBarTap` (~100ms click/flip), `runScored` (~300ms ascending chime), `homeRun` (~500ms fanfare), `strikeout` (~300ms descending tone), `halfInning` (~200ms whistle), `undoBloop` (~200ms rewind bloop), `startGame` (~500ms jingle), `endGame` (~500ms jingle), `beatReporterType` (~50ms typewriter tick)
   - Each sound is a short sequence of oscillator tones — simple square/triangle waves at specific frequencies
   - Has two enable flags: `gameSoundsEnabled: boolean` and `beatReporterSoundsEnabled: boolean`
   - `playSound(name: string)` checks the appropriate enable flag before playing
2. In GameTracker.tsx:
   - Add state: `gameSoundsOn` and `beatReporterSoundsOn` (default both to false — opt-in)
   - Create an audioManager instance (useRef to persist across renders)
   - Call `audioManager.playSound('quickBarTap')` when Quick Bar outcome fires
   - Call `audioManager.playSound('runScored')` when a run scores
   - Call `audioManager.playSound('homeRun')` on HR/ITPHR
   - Call `audioManager.playSound('strikeout')` on K/Ꝁ
   - Call `audioManager.playSound('halfInning')` on half-inning transition
   - Call `audioManager.playSound('undoBloop')` on undo
   - Call `audioManager.playSound('startGame')` on START GAME
   - Call `audioManager.playSound('endGame')` on END GAME
3. In ScoreBug.tsx:
   - The 🔊 icon(s) should be tappable toggles
   - Add props: `gameSoundsOn`, `beatReporterSoundsOn`, `onToggleGameSounds`, `onToggleBeatReporter`
   - Show two small icons: 🔊 for game sounds, 📰 or 🔊₂ for beat reporter sounds
   - Tapping toggles the state. Visual distinction: bright when on, dim when off.

### DO NOT
- Use external audio files — generate all sounds with Web Audio API
- Modify useGameState.ts or eventLog.ts
- Add haptics (V1 spec says no haptics)

### VERIFY
```bash
npm run build
ls src/src_figma/app/utils/audioManager.ts
# Expected: file exists
grep -n "playSound\|AudioContext\|OscillatorNode" src/src_figma/app/utils/audioManager.ts | head -10
# Expected: Web Audio API usage
grep -n "gameSoundsOn\|beatReporterSoundsOn\|audioManager" src/src_figma/app/pages/GameTracker.tsx | head -10
# Expected: state + trigger calls
```
