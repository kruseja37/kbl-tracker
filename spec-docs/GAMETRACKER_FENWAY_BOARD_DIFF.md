# GameTracker Fenway Board Diff

## Scope
This compares:
- the **historical full Fenway-style scoreboard** from commit `8b45b4d` in `GameTracker.tsx`
- the **current reduced `FenwayBoard`** in [FenwayBoard.tsx](/Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/FenwayBoard.tsx)

## Bottom Line
The current board is not a scaled copy of the old one.

It is a **different UI concept**:
- old = full-width scoreboard experience inspired by the actual Fenway outfield board
- current = compact left-rail score-and-context panel for the 5-zone iPad layout

## Structural Differences
| Area | Old Full Board | Current Reduced Board |
|---|---|---|
| Placement | Sticky top header above field | Left column of 5-zone layout |
| Visual metaphor | Fenway outfield scoreboard | Compact score bug + context cards |
| Width | Full-width center block inside page header | `248px-300px` left rail |
| Height | Large header block above field | Full-height side panel |
| Ownership | Inline in historical `GameTracker.tsx` | Standalone `FenwayBoard.tsx` component |

## Information Differences
| Feature | Old Full Board | Current Reduced Board |
|---|---|---|
| Stadium name header | Yes | No explicit stadium header |
| SMB logo block | Yes | No |
| Inning-by-inning line score | Yes | No |
| `R / H / E` columns | Yes | Partial score + errors only |
| `REC` column | Yes | No |
| `P` column | Yes | No |
| Concessions panel | Yes | No |
| Ad panel | Yes | No |
| Bottom `AT BAT / BALL / STRIKE / OUT` row | Yes | No |
| Date / elapsed time | Yes | No |
| Pitcher stats card | No separate card; integrated differently | Yes |
| Batter stats card | No separate card; integrated differently | Yes |
| Matchup history | No dedicated card in that board | Supported by props |
| Milestone alert | No dedicated card in that board | Supported by props |

## Interaction Differences
| Interaction | Old Full Board | Current Reduced Board |
|---|---|---|
| Minimize to `MiniScoreboard` | Yes | No |
| Expand from mini mode | Yes | No |
| Pitcher tap action | Not the primary pattern there | Yes, supported |
| Batter tap action | Not the primary pattern there | Yes, supported |

## Code Anchors
### Historical full board
Source recovery command:

```bash
git show 8b45b4d:src/src_figma/app/pages/GameTracker.tsx | sed -n '1248,1498p'
```

Historical bug references:
- [BUG_RESOLUTION_EXHIBITION.md](/Users/johnkruse/Projects/kbl-tracker/spec-docs/archive/BUG_RESOLUTION_EXHIBITION.md#L144)

### Current reduced board
- [FenwayBoard.tsx](/Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/components/FenwayBoard.tsx#L68)
- [GameTracker.tsx](/Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/pages/GameTracker.tsx#L3479)

## Spec Transition
- Draft spec still referenced the **full Fenway Board**:
  - [MODE_2_V1_DRAFT.md](/Users/johnkruse/Projects/kbl-tracker/spec-docs/v1-simplification/MODE_2_V1_DRAFT.md#L70)
- Final spec replaced that with the left-panel board:
  - [MODE_2_V1_FINAL.md](/Users/johnkruse/Projects/kbl-tracker/spec-docs/v1-simplification/MODE_2_V1_FINAL.md#L622)

## If You Need To Brief Figma
Use this framing:

The historical design was a **full, theatrical Fenway-scoreboard treatment** with line score, ads, concessions, records, and indicator lamps. The current implementation is a **compressed analytics rail** optimized for the newer 5-zone GameTracker layout. The present component preserves score/context function, but not the original spectacle or the outfield-scoreboard metaphor.
