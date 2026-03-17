# CODEX PROMPT CONTRACTS — Tier 3 (Codex 5.1 Mini Medium)
# 3 independent items, each trivial and runnable separately

---

## Item 3.6 (UX-040): Undo Toast Format
# ROUTE: Codex 5.1 mini | medium
# Branch: feature/gt-ux-t3-undo-toast

### GOAL
Change undo toast message from "Undone: Quick: [result]" to "Undone: [inning] [batter] [result]".

### FILE TO MODIFY
`src/src_figma/app/pages/GameTracker.tsx`

### WHAT TO DO
1. Search for `captureSnapshot` calls in GameTracker.tsx. Find where the play description is set (currently something like `Quick: ${outcome}`).
2. Change the description to include inning label and batter name: `${shortInningLabel} ${gameState.currentBatterName} ${outcome}`
3. This produces toast messages like: "Undone: T7 Hayata 1B" instead of "Undone: Quick: 1B"

### VERIFY
```bash
npm run build
grep -n "captureSnapshot" src/src_figma/app/pages/GameTracker.tsx | head -5
# Expected: description includes inning + batter name + outcome
```

---

## Item 3.7 (UX-043): Save Indicator in Score Bug
# ROUTE: Codex 5.1 mini | medium
# Branch: feature/gt-ux-t3-save-indicator

### GOAL
Add a subtle save indicator to the ScoreBug. Static ✓ normally, ⚠ on write failure.

### FILE TO MODIFY
`src/src_figma/app/components/ScoreBug.tsx`

### WHAT TO DO
1. ScoreBug already renders a static "✓" save indicator (from Step 1.B).
2. Add a `saveError?: boolean` prop.
3. When `saveError` is true, show "⚠" in a warning color (amber/yellow) instead of "✓".
4. When `saveError` is false or undefined, show "✓" in a subtle dim color (like #88AA88).
5. No animation on each save — the indicator is static. Only the error state changes appearance.

### VERIFY
```bash
npm run build
grep -n "saveError\|⚠" src/src_figma/app/components/ScoreBug.tsx | head -5
# Expected: saveError prop + conditional ✓/⚠ rendering
```

---

## Item 3.14 (UX-056): Locked Result Tooltip
# ROUTE: Codex 5.1 mini | medium
# Branch: feature/gt-ux-t3-locked-tooltip

### GOAL
When user taps a locked result field in the play log, show "Use ↩ Undo to change result" tooltip.

### FILE TO MODIFY
`src/src_figma/app/components/PlayLogPanel.tsx`

### WHAT TO DO
1. In PlayLogPanel, the result text for each at-bat entry is displayed (e.g., "1B", "K", "GO").
2. When the result field is tapped on an entry that is NOT currently enrichable (i.e., the entry's result is locked):
   - Show a brief tooltip/toast: "Use ↩ Undo to change result"
   - The tooltip should appear near the tapped result and auto-dismiss after 2 seconds
   - Use a simple absolute-positioned div, not a library
3. If the entry IS enrichable (tapping opens enrichment), do NOT show the tooltip — the normal enrichment flow takes over.

### VERIFY
```bash
npm run build
grep -n "Use.*Undo\|locked.*tooltip\|↩" src/src_figma/app/components/PlayLogPanel.tsx | head -5
# Expected: tooltip text + conditional rendering
```
