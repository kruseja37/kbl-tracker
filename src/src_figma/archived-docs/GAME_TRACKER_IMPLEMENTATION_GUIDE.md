# GameTracker Implementation Guide

> **Purpose**: Implementation blueprint for Claude Code
> **Version**: 1.1
> **Created**: 2026-02-01
> **Companion**: See `GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md` for detailed edge cases

---

## Canonical Files

| Purpose | File | Status |
|---------|------|--------|
| Main GameTracker | `app/components/EnhancedInteractiveField.tsx` | **Modify this** |
| Field rendering | `app/components/FieldCanvas.tsx` | Complete |
| Play classification | `app/components/playClassifier.ts` | Complete |
| Runner drag-drop | `app/components/RunnerDragDrop.tsx` | Extend this |
| Side panels | `app/components/SidePanel.tsx` | Extend this |

**DO NOT MODIFY**: `DragDropGameTracker.tsx` - this is dead code.

---

## What Already Exists

- Fielder drag → tap sequence → "CLASSIFY PLAY" ✅
- Foul territory auto-detection ✅
- Spray zone derivation ✅
- HR mode with distance ✅
- `inferContextualButtons()` function ✅
- Runner safe/out zones ✅
- Undo system ✅

---

## What to Implement

### Priority 1: Core Flow

1. **[K] [Ꝅ] buttons** - Bottom left, always visible
2. **BatterReachedPopup** - NEW: BB/IBB/HBP/1B/E/FC/D3K options
3. **[End At-Bat] button** - Bottom center, visible after play classified
4. **Modifier button bar** - Bottom right, enabled after End At-Bat

### Priority 2: Missing Popups

5. **ErrorTypePopup** - FIELDING/THROWING/MENTAL
6. **StarPlaySubtypePopup** - DIVING/SLIDING/LEAPING/OVER_SHOULDER/RUNNING/WALL
7. **InjuryPrompt** - For KP: STAYED IN → LEFT GAME → severity
8. **MojoPrompt** - For NUT: NONE/TENSE/RATTLED

### Priority 3: Runner Outcomes

9. **Default outcome calculation** - Based on play type
10. **Outcome arrows** - Show where runners will go
11. **Drag to adjust** - Override defaults

---

## UI Phase Derivation

DO NOT create parallel state. Derive from existing:

```typescript
function getUIPhase(): UIPhase {
  if (showHitPanel || showOutPanel || showHRPanel) return 'CLASSIFYING';
  if (placedFielders.length > 0 && !lastClassifiedPlay) return 'TAP_SEQUENCE';
  if (lastClassifiedPlay && !playCommitted) return 'RUNNER_OUTCOMES';
  if (playCommitted) return 'MODIFIERS_ACTIVE';
  return 'AWAITING_INPUT';
}
```

---

## Button Layout

```
┌────────────────────────────────────────────────────────────────┐
│                           FIELD                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [K][Ꝅ]        [SEQUENCE]      [CLASSIFY/END]     [MODIFIERS]  │
│  ↑               ↑                 ↑                  ↑        │
│ always      when fielder      context-         after End       │
│ visible     dropped           dependent        At-Bat          │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Critical Rules

1. **Data persists on [End At-Bat]** - Not before
2. **Modifiers do NOT auto-dismiss** - Stay until next at-bat
3. **KP/NUT are mutually exclusive** - Selecting one disables other
4. **WG applies to FIRST fielder** in sequence
5. **KP prompt is IMMEDIATE** - Shows right when tapped
6. **D3K only legal** when 1B empty OR 2 outs

---

## Files to Create

| File | Purpose |
|------|---------|
| `BatterReachedPopup.tsx` | BB/HBP/1B/E/FC/D3K selection |
| `ErrorTypePopup.tsx` | FIELDING/THROWING/MENTAL |
| `StarPlaySubtypePopup.tsx` | Catch type selection |
| `InjuryPrompt.tsx` | KP flow with injury severity |
| `MojoPrompt.tsx` | NUT flow with mojo impact |
| `ModifierButtonBar.tsx` | Render all modifiers |

---

## Read the Addendum

**BEFORE implementing anything**, read `GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md` which contains:

- Exact wireframes with positions
- All edge cases and how to handle them
- State integration strategy
- Complete Play Lifecycle timeline
- D3K legal check implementation
- Error handling specifications
- Undo integration details

---

*See ADDENDUM for complete details*
