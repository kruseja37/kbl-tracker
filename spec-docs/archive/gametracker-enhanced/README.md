# Enhanced GameTracker (Drag-Drop) - Documentation Index

> **Status**: CURRENT - Active development in `src/src_figma/`
> **Last Updated**: 2026-02-02

---

## Overview

The Enhanced GameTracker uses a **drag-and-drop paradigm** on a continuous geometric plane. Fielders are dragged to ball locations, and tap sequences build throw chains.

### Core Principles

1. **Fielder drag = where ball was fielded** (not where they throw)
2. **Tap sequence = throw chain** (tap fielder → implies throw to them)
3. **Auto-classification** - Obvious plays skip confirmation modals
4. **Contextual prompts** - Special event buttons appear after play completion

---

## Key Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| **GAMETRACKER_DRAGDROP_SPEC.md** | `../GAMETRACKER_DRAGDROP_SPEC.md` | Master specification |
| **DRAGDROP_IMPLEMENTATION_PLAN.md** | `../DRAGDROP_IMPLEMENTATION_PLAN.md` | Implementation stories |
| **DRAGDROP_AUDIT_2026-01-31.md** | `../DRAGDROP_AUDIT_2026-01-31.md` | Recent audit |
| **STORIES_GAMETRACKER_FIXES.md** | `../STORIES_GAMETRACKER_FIXES.md` | Remaining fix stories |

---

## Key Code Files

| File | Path | Size | Purpose |
|------|------|------|---------|
| **EnhancedInteractiveField.tsx** | `src/src_figma/app/components/` | 124KB | Main GameTracker component |
| **playClassifier.ts** | `src/src_figma/app/components/` | 19KB | Play inference engine |
| **FieldCanvas.tsx** | `src/src_figma/app/components/` | 31KB | SVG field, coordinate system |
| **FielderIcon.tsx** | `src/src_figma/app/components/` | 19KB | Draggable fielder icons |
| **RunnerDragDrop.tsx** | `src/src_figma/app/components/` | 16KB | Runner drag-drop mechanics |
| **RunnerOutcomeArrows.tsx** | `src/src_figma/app/components/` | 17KB | Visual outcome arrows |

---

## Coordinate System

```
     y=1.4  ──────────────────────────────  (Upper Deck)
            │         STANDS              │
     y=1.0  ├─────────────────────────────┤  ← WALL
            │ \                       /   │
     y=0.65 │    \ [7]   [8]   [9]/       │  (OF positions)
            │     \             /         │
     y=0.42 │      \  [6] [4]  /          │  (IF positions)
            │   [5] \       / [3]         │
     y=0.35 ├──3B────\─────/────1B────────┤
            │  FOUL   \   /    FOUL       │  ← Foul lines at 45°
     y=0.18 │          [1]                │  (Pitcher)
     y=0.08 │          [2]                │  (Catcher)
     y=0.0  └───FOUL──[HOME]──FOUL────────┘
           x=0.0      x=0.5             x=1.0
```

**Foul Territory**: `|x - 0.5| > y × 0.5`

---

## Play Classification (playClassifier.ts)

### Auto-Complete Rules

| Pattern | Classification | Confidence |
|---------|---------------|------------|
| `6-4-3`, `4-6-3`, `5-4-3` | Double Play | 95% |
| `X-3` (IF to 1B) | Ground Out | 90-92% |
| `1-3`, `1-4-3`, `1-6-3` | Ground Out (comebacker) | 90% |
| Foul territory + fielder | Foul Out | 95% |
| Single OF catch (y > 0.6) | Fly Out | 90% |

### Contextual Prompts (Appear After Play)

| Condition | Prompt | Fame Impact |
|-----------|--------|-------------|
| y > 0.95 (at wall) | ROBBERY | +1.5 Fame (fielder) |
| 0.8 < y ≤ 0.95 (deep OF) | WEB GEM | +1.0 Fame (fielder) |
| Pitcher (1) first fielder | KILLED / NUTSHOT | +3.0 / +1.0 Fame (batter) |
| `2-3` sequence | K / Ꝅ (looking) | Strikeout recorded |
| `2-3-3` sequence | D3K | Dropped 3rd strike |
| Infield hit (y < 0.4) | BEAT THROW / BUNT | Infield hit type |

---

## Four Ways to End an At-Bat

| # | Action | Implies | Ball Location |
|---|--------|---------|---------------|
| 1 | Drag **fielder** to spot | Out (drop = where ball fielded) | From drop |
| 2 | Drag **batter** to base | Hit (runner safe) | User taps location |
| 3 | Drag **runner** to base | Runner movement (SB, CS, etc.) | N/A |
| 4 | Tap **HR button** | Home run | User taps stands + distance |

---

## Implementation Status

Per `DRAGDROP_IMPLEMENTATION_PLAN.md`:

- **Phases 1-7**: ✅ COMPLETE
- **Phase 8**: ⚠️ PARTIAL (data layer, polish)

---

## DO NOT MODIFY

- `DragDropGameTracker.tsx` - **DEAD CODE** (superseded by EnhancedInteractiveField)
