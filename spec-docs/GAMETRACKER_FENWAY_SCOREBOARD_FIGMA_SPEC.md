# GameTracker Fenway Scoreboard Figma Spec

## Purpose
This is the Figma reconstruction spec for the exact scoreboard layout encoded in:

- [GAMETRACKER_FENWAY_SCOREBOARD_EXACT_LAYOUT.tsx](/Users/johnkruse/Projects/kbl-tracker/spec-docs/GAMETRACKER_FENWAY_SCOREBOARD_EXACT_LAYOUT.tsx)

Use this document if you want to rebuild the layout in Figma without reading TSX.

## Root Frame
| Item | X | Y | W | H | Fill | Stroke |
|---|---:|---:|---:|---:|---|---|
| Root canvas | 0 | 0 | 2048 | 311 | `#6B9462` | none |
| Sky panel | 0 | 0 | 2048 | 311 | `#7EA6D0` | `6px #163326` |
| Inner frame | 18 | 18 | 2012 | 275 | transparent | `4px #163326` |

## Left Controls
| Item | X | Y | W | H | Fill | Stroke | Notes |
|---|---:|---:|---:|---:|---|---|---|
| Mini button | 38 | 122 | 122 | 48 | `#1E2C23` | `3px #E8E8D8` | horizontal auto-layout |
| SMB logo box | 162 | 88 | 281 | 116 | `#F4F4F0` | `6px #005EF0` | centered vertical stack |

## Right Menu
| Item | X | Y | W | H | Fill | Stroke |
|---|---:|---:|---:|---:|---|---|
| Menu icon hit area | 1958 | 120 | 48 | 48 | transparent | none |

## Main Scoreboard Shell
| Item | X | Y | W | H | Fill | Stroke | Padding |
|---|---:|---:|---:|---:|---|---|---|
| Main board | 462 | 20 | 1485 | 252 | `#5C7156` | `5px #48604A` | `14 16 12 16` |

## Main Board Internal Layout
Internal content begins inside the board padding box.

| Item | Relative X | Relative Y | W | H | Notes |
|---|---:|---:|---:|---:|---|
| Title `BALLPARK` | 16 | 14 | 1453 | 34 | centered |
| Line score grid | 16 | 62 | 1453 | 56 | 2 rows + header |
| Divider line | 16 | 130 | 1453 | 3 | cream rule |
| Indicator row | 16 | 145 | auto | 32 | left-aligned horizontal stack |
| Footer row | 16 | 191 | 1453 | 16 | date left, time right |

## Line Score Grid
Grid template:

```text
28 | 160 | 40x10 | 48 | 48 | 48 | 14 | 84 | 16 | flexible remainder
```

That means:
- Column 1: `28`
- Column 2: `160`
- Columns 3-12: `40` each
- Columns 13-15: `48` each
- Column 16: `14`
- Column 17: `84`
- Column 18: `16`
- Column 19: remaining width

Row gap: `4`

### Column Map
| Col | Width | Meaning |
|---|---:|---|
| 1 | 28 | `P` |
| 2 | 160 | Team name |
| 3-12 | 40 each | Innings `1-10` |
| 13 | 48 | `R` |
| 14 | 48 | `H` |
| 15 | 48 | `E` |
| 16 | 14 | spacer |
| 17 | 84 | `REC` |
| 18 | 16 | spacer |
| 19 | flex | concessions/ad text |

### Grid Cell Styling
| Item | Fill | Stroke | Text |
|---|---|---|---|
| Header labels | transparent | none | `18px`, `900`, `#E8E8D8` |
| Data cells | `#425844` | none | centered unless otherwise noted |
| Team name cells | `#425844` | none | left aligned, `8px` left padding |

### Row Content
#### Header Row
| Cell | Value |
|---|---|
| 1 | `P` |
| 2 | empty |
| 3-12 | `1 2 3 4 5 6 7 8 9 10` |
| 13-15 | `R H E` |
| 16 | empty |
| 17 | `REC` |
| 18-19 | empty |

#### Visitors Row
| Cell | Value |
|---|---|
| 1 | `▶` |
| 2 | `VISITORS` |
| 3-12 | `0 2 0 1 0 1 0 0 0 ''` |
| 13-15 | `4 8 1` |
| 17 | `45-38` |
| 19 | `CONCESSIONS / HOT DOG / PEANUTS / CRACKER JACK` |

#### Home Row
| Cell | Value |
|---|---|
| 1 | `1` |
| 2 | `HOME TEAM` |
| 3-12 | `1 0 2 0 0 0 0 0 0 ''` |
| 13-15 | `3 7 0` |
| 17 | `52-31` |
| 19 | `KRUSE COLA` |

## Divider
| Item | Relative X | Relative Y | W | H | Fill |
|---|---:|---:|---:|---:|---|
| Divider rule | 16 | 130 | 1453 | 3 | `#E8E8D8` |

## Indicator Row
All elements are horizontally aligned with `20px` gap between major groups.

### Group 1: At Bat
| Item | W | H | Fill | Stroke | Text |
|---|---:|---:|---|---|---|
| Label | auto | 32 | transparent | none | `AT BAT`, `18px`, `900`, `#E8E8D8` |
| Value box | 144 min | 32 | `#3E5340` | none | `JOHNSON #24`, `17px`, `900` |

### Group 2: Ball
| Item | W | H | Notes |
|---|---:|---:|---|
| Label | auto | 32 | `BALL` |
| Dot row | 106 | 22 | 4 dots, `6px` gap |

Dot style:
- Active green: fill `#00D66B`, stroke `4px #009E52`
- Inactive: fill `#3B4F56`, stroke `4px #48604A`

State shown:
- `2` active
- `2` inactive

### Group 3: Strike
| Item | W | H | Notes |
|---|---:|---:|---|
| Label | auto | 32 | `STRIKE` |
| Dot row | 78 | 22 | 3 dots, `6px` gap |

Dot style:
- Active yellow: fill `#F2BF16`, stroke `4px #C08C00`
- Inactive: fill `#3B4F56`, stroke `4px #48604A`

State shown:
- `1` active
- `2` inactive

### Group 4: Out
| Item | W | H | Notes |
|---|---:|---:|---|
| Label | auto | 32 | `OUT` |
| Dot row | 78 | 22 | 3 dots, `6px` gap |

Dot style:
- Active red: fill `#FF3C3C`, stroke `4px #BE1E1E`
- Inactive: fill `#3B4F56`, stroke `4px #48604A`

State shown:
- `1` active
- `2` inactive

### Group 5: Home Indicator
| Item | W | H | Fill | Text |
|---|---:|---:|---|---|
| Label | auto | 32 | transparent | `(H)` |
| Value box | 38 | 32 | `#3E5340` | `-`, `22px` |

### Group 6: Error Indicator
| Item | W | H | Fill | Text |
|---|---:|---:|---|---|
| Label | auto | 32 | transparent | `(E)` |
| Value box | 38 | 32 | `#3E5340` | `-`, `22px` |

## Footer Row
| Item | Relative X | Relative Y | Align | Text |
|---|---:|---:|---|---|
| Date | 16 | 191 | left | `SUN MAR 8, 2026` |
| Time | 1469 | 191 | right | `TIME: 0:02:25` |

Footer text style:
- `12px`
- `800`
- `#E8E8D8`

## Typography
Global family in the reconstruction:

```text
"Arial Black", "Helvetica Neue", Arial, sans-serif
```

### Type Tokens
| Token | Size | Weight | Color | Letter spacing |
|---|---:|---:|---|---:|
| Board title | 28 | 900 | `#E8E8D8` | `1.5px` |
| Header label | 18-19 | 900 | `#E8E8D8` | `0` |
| Grid cell value | 13 | 800 | `#E8E8D8` | `0` |
| Logo line 1 | 34 | 900 | `#005EF0` | `-0.8px` |
| Logo line 2 | 41 | 900 | `#FF1B0F` | `-1px` |
| Indicator labels | 18 | 900 | `#E8E8D8` | `0` |
| Indicator value | 17-22 | 900 | `#E8E8D8` | `0` |
| Footer | 12 | 800 | `#E8E8D8` | `0` |

### Shadow
Most text uses:

```text
1px 1px 0 rgba(0,0,0,0.28)
```

## Colors
| Name | Hex |
|---|---|
| Sky | `#7EA6D0` |
| Outer frame | `#163326` |
| Grass | `#6B9462` |
| Board base | `#5C7156` |
| Board dark | `#48604A` |
| Board cell | `#425844` |
| Indicator box | `#3E5340` |
| Cream text | `#E8E8D8` |
| Gold | `#C4A853` |
| Blue | `#005EF0` |
| Red | `#FF1B0F` |
| White | `#F4F4F0` |
| Blackish | `#1E2C23` |
| Yellow dot | `#F2BF16` |
| Green active dot | `#00D66B` |
| Green border | `#009E52` |
| Red active dot | `#FF3C3C` |
| Red border | `#BE1E1E` |
| Inactive dot | `#3B4F56` |

## Build Order In Figma
1. Create root frame `2048 x 311`.
2. Add sky panel with dark outer stroke.
3. Add inner frame.
4. Place mini button.
5. Place SMB logo block.
6. Place main board shell.
7. Add `BALLPARK` title.
8. Build line score grid using the exact column widths above.
9. Add divider rule.
10. Build indicator row in six groups.
11. Add footer row.
12. Add right menu icon.

## Screenshot Matching
This spec is derived from the literal reconstruction component and is intended to match the screenshot provided in-thread, not the later reduced `FenwayBoard`.
