# GameTracker UI/UX Redesign -- Figma Design Prompt

> **Target**: iPad Landscape (1024x768 minimum, 1366x1024 optimal)
> **Theme**: Chalk Scoreboard -- retro baseball scoreboard with chalk-on-green-board aesthetic
> **Context**: Super Mega Baseball 4 (SMB4) game tracker for a fantasy baseball league
> **Primary User**: League commissioner scoring games on iPad while watching gameplay

---

## 1. Design Language: "Chalk Scoreboard"

### Color Palette

The entire UI lives on a layered green palette evoking a hand-chalked ballpark scoreboard. Cream text = chalk marks. Gold = accent highlights.

| Token | Hex | Role |
|---|---|---|
| `board-darkest` | `#1a2a1d` | Deepest backgrounds, heavy borders |
| `board-dark` | `#2a3a2d` | Card backgrounds, QuickBar base, panel headers |
| `board-medium` | `#3d5240` | Score boxes, intermediate panels, borders |
| `board-light` | `#556B55` | Outermost scoreboard frame |
| `field-grass` | `#6B9462` | Diamond surface, fielder icon default fill |
| `field-outfield` | `#5A8352` | Outfield stands / deeper grass |
| `dirt` | `#B8935F` | Infield dirt, basepaths |
| `chalk` | `#E8E8D8` | **Primary text** -- all labels, names, numbers |
| `chalk-muted` | `#88AA88` | Section labels ("PITCHING", "AT BAT") |
| `chalk-stat` | `#aaccaa` | Stat labels (PC:, IP:, K:, ERA:) |
| `gold` | `#C4A853` | Badges, active indicators, "PLAY LOG" title |
| `sky` | `rgb(133,181,229)` | Scoreboard banner strip (sky behind board) |
| `out-red` | `#DC3545` | Out count dots (active) |
| `hit-blue` | `#60a5fa` | Hit results in play log |
| `hr-purple` | `#c084fc` | HR results in play log |
| `walk-green` | `#4ade80` | Walk/HBP results in play log |
| `error-yellow` | `#fbbf24` | Error results in play log |
| `out-text-red` | `#f87171` | Out results in play log |
| `manager-gold` | `#FFD700` | Manager Moment pulsing indicator |

### Typography

| Token | Font | Usage |
|---|---|---|
| `font-primary` | "Press Start 2P" | All body text, buttons, labels |
| `font-mono` | "SF Mono" / "Monaco" | Stat numbers where alignment matters |

Font sizes are deliberately small (7-12px range) to fit dense baseball data. The pixel font reinforces the retro SNES aesthetic.

### Visual Effects

| Effect | Implementation |
|---|---|
| **CRT Scanlines** | Faint horizontal lines overlaying entire viewport (2px repeating gradient, ~0.4 opacity) |
| **CRT Vignette** | Radial gradient darkening viewport edges |
| **Hard Shadows** | `2-6px offset, 0 blur, rgba(0,0,0,0.5)` on buttons and cards (no soft shadows) |
| **Text Shadows** | `1px 1px 0 rgba(0,0,0,0.3)` on all text over green surfaces |
| **No Rounded Corners** | All elements use sharp 0px radius (SNES aesthetic) |
| **Pixelated Rendering** | `image-rendering: pixelated` globally |

---

## 2. Screen Layout (iPad Landscape)

### Master Layout: Three-Column + Header

```
+------------------------------------------------------------------------+
|  FULL FENWAY SCOREBOARD (sky banner, inning grid, BSO, at-bat)         |
+------------------------------------------------------------------------+
|                    |                           |                        |
|   GAME DIAMOND     |    QUICKBAR + RUNNER      |     PLAY LOG           |
|   (field view      |    OUTCOMES               |     (scrollable,       |
|    with fielders   |                           |      tappable entries, |
|    and runners)    |    ENHANCEMENT PANEL      |      enrichment        |
|                    |    (when in enhance mode) |      badges)           |
|                    |                           |                        |
+------------------------------------------------------------------------+
```

**Column Widths** (approximate proportions):
- Left (Diamond): ~40% -- the baseball field with positioned fielders and runners
- Center (Controls): ~30% -- QuickBar buttons, runner outcomes, enhancement tools
- Right (Play Log): ~30% -- scrollable play-by-play log

**Header** (Full Fenway Scoreboard): Fixed at top, ~80-100px tall. Full-width.

### Key Layout Rules

1. **QuickBar is always visible** -- never hidden behind scrolling or modals
2. **Play Log is always visible** -- side-by-side with diamond, not tabbed
3. **Diamond and Play Log share the viewport** -- horizontal layout, not stacked
4. **Lineup is a popover** -- triggered by a button, not permanently visible
5. **Scoreboard is always at top** -- compact but shows full inning-by-inning data

---

## 3. Component Inventory

### 3A. Full Fenway Scoreboard (TOP BANNER)

**Reference**: This is the full SMB4-style inning-by-inning linescore scoreboard. It sits at the very top of the screen as a persistent header.

**Structure**:
```
+------------------------------------------------------------------------+
| [sky blue banner]                                           [MINI] [=] |
|  BALLPARK NAME                                                         |
+------------------------------------------------------------------------+
|  P | TEAM NAME  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |10| R | H | E |
|  --|------------|---|---|---|---|---|---|---|---|---|---|---|---|---|      |
|  > | VISITORS   | 0 | 1 | 0 | 2 | . | . | . | . | . | . | 3 | 5 | 1 |
|    | HOME TEAM  | 1 | 0 | 0 | . | . | . | . | . | . | . | 1 | 4 | 0 |
+------------------------------------------------------------------------+
|  AT BAT: JOHNSON #24       (B)ooo  (S)oo  (O)oo    (H) 2  (E) 1      |
|  SUN MAR 8, 2026                              TIME: 0:02:25           |
+------------------------------------------------------------------------+
```

**Design Details**:
- Sky blue top strip (`sky` color) with dark green frame border
- "BALLPARK" header text in chalk on board-dark background
- Inning columns use `board-cell` background with chalk text
- `>` arrow indicator marks which team is batting
- Ball dots = green (`#00D66B`), Strike dots = yellow (`#F2BF16`), Out dots = red (`#FF3C3C`)
- Inactive dots = dim gray (`#3B4F56`)
- Team records shown in parentheses after team name
- R/H/E totals in slightly brighter cells
- "MINI" toggle button (top-right) to collapse to compact mode
- Hamburger menu button for game management options

**MINI mode**: Collapses to just team names, current score (R column), and BSO dots -- single row height.

### 3B. FenwayBoard (Pitcher/Batter Context Cards)

**This is a SEPARATE component from the Full Fenway Scoreboard.** It provides real-time pitcher and batter matchup context.

**Structure**:
```
+--PITCHING-----------------------------+--AT BAT---------------------------+
| [Name]           PC: 45  IP: 4.2      | [Name]          AVG: .312        |
| ERA: 3.24  K: 6  BB: 1  H: 3         | HR: 5  RBI: 18  OBP: .402       |
+---------------------------------------+----------------------------------+
| MATCHUP: 1-3, 1 K, 0 BB              | BEAT REPORTER: [narrative text]  |
+---------------------------------------+----------------------------------+
```

**Design Details**:
- Two side-by-side cards on `board-dark` background
- Section labels in `chalk-muted` uppercase with letter-spacing
- Stat values in `chalk` color
- Matchup card spans full width below, `board-darkest` background
- Beat reporter text in italicized `chalk-muted`

**Placement**: Below the Full Fenway Scoreboard, above the diamond area. Could also be a toggleable overlay or integrated into the scoreboard area.

### 3C. GameDiamond (The Baseball Field)

**This replaces the current 4,500-line EnhancedInteractiveField with a focused ~500-800 line component.**

The diamond has **two operating modes** determined by whether a play is selected in the Play Log:

#### INFO MODE (No play selected in Play Log)

Default state when no play log entry is tapped.

**Elements visible**:
- Baseball diamond (infield dirt, outfield grass, basepaths, bases)
- 9 fielder icons at defensive positions
- 0-3 runner icons on bases
- Ball/Strike/Out count display

**Fielder Icons (Info Mode)**:
```
+-------------------+
|  J. SMITH         |  <- Player name (9px, chalk)
|  SS  |  1.2 fWAR  |  <- Position + fWAR value (7px, chalk-stat)
+-------------------+
```
- Background: `field-grass` with 1px `chalk` border
- Tapping a fielder opens a **between-play popover** for substitutions, position swaps, mojo/fitness updates
- NOT for recording play data -- that happens in Enhancement Mode

**Runner Icons (Info Mode)**:
- Show runner name on the occupied base
- Tapping a runner opens a **between-play popover** for stolen base attempts, pickoffs, or manual adjustments

**Field Styling**:
- Outfield grass: `field-grass` with subtle horizontal stripe pattern (0.2 opacity)
- Infield dirt: `dirt` color
- Basepaths: `chalk` stroke at 0.6 opacity
- Bases: `chalk` fill squares
- Warning track: gold-yellow ring at outfield edge
- Foul lines extending from home plate

#### ENHANCEMENT MODE (Play selected in Play Log)

Activated when user taps a play entry in the Play Log. The diamond transforms into a data-entry surface.

**Visual Indicator**: Border or glow change on the diamond to signal enhancement mode is active. Play Log entry shows "ENHANCE" highlight.

**Elements visible**: Same diamond, fielders, runners -- PLUS enhancement controls:

**Fielder Tap Behavior (Enhancement Mode)**:
- Single tap on one fielder = assign as **putout** fielder
- Tap multiple fielders in sequence = build **throw chain** (engine assigns: last tap = putout, earlier taps = assists)
- Each tapped fielder shows a numbered sequence badge in `gold` (1, 2, 3...)
- Tapped fielders change border to red (`#DD0000`)

**Diamond Tap (Enhancement Mode)**:
- Tapping the field surface places a **ball location marker** (spray chart dot)
- Marker appears as a small chalk-colored circle at tap coordinates
- Coordinates are saved as spray chart data for the selected play

**Catch Type Selector (Enhancement Mode)**:
- Appears as a small toolbar/strip when a fielding play is selected
- Options: `routine` | `diving` | `sliding` | `leaping` | `charging` | `beatRunner` | `beatThrow` | `missedDive` | `missedLeap`
- Styled as small chalk-on-green toggles

**Special Event Buttons (Enhancement Mode)**:
- Row of quick-tap enhancement buttons: `KP` (killed pitcher) | `NUT` (nut shot) | `PITCH COUNT` | `EXIT TYPE`
- Styled like small QuickBar buttons but in `board-dark` with `gold` borders

**Runner Icons (Enhancement Mode)**:
- Tapping a runner cycles through destination override: `out` | `1B` | `2B` | `3B` | `HOME`
- Current destination shown as badge on runner icon
- Overridden destinations display differently from defaults (e.g., bold border)

### 3D. QuickBar (Play Outcome Buttons)

**RETAIN AS-IS** -- proven 20-button layout with category coloring.

**Structure**: Horizontal row of buttons, always visible in the center column.

**Button Categories and Colors**:

| Category | Buttons | Background | Border |
|---|---|---|---|
| Outs | K, Kc, GO, FO, LO, PO, DP, TP, FC, SAC | `#8B0000` | `#FF4444` |
| On-base | 1B, 2B, 3B, BB, IBB, HBP | `#1a5276` | `#5dade2` |
| HR | HR | `#6c3483` | `#af7ac5` |
| Error/Misc | E, WP_K, PB_K | `#7d6608` | `#f4d03f` |
| Overflow | "..." trigger | `#333333` | `#888888` |

**Button Styling**:
- Hard shadow: `2px 2px 0 rgba(0,0,0,0.5)`
- Sharp corners (0px radius)
- `chalk` text with pixel font
- Compact sizing to fit all buttons in viewport

**Behavior**: Tapping a QuickBar button immediately:
1. Records the play outcome
2. Shows RunnerOutcomesDisplay below QuickBar
3. Highlights the new play entry in the Play Log with "ENHANCE" indicator

### 3E. Runner Outcomes Display

**Appears immediately below QuickBar after a play outcome is tapped.**

**Structure**:
```
+--RUNNER OUTCOMES---------------------------+
|  RUNS: 1  |  OUTS ON PLAY: 0              |
|---------------------------------------------|
|  BATTER → [1B]  (tap to cycle)            |
|  R1 (Smith) → [3B]  (tap to cycle)        |
|  R2 (Jones) → [HOME] ★ (tap to cycle)     |
+---------------------------------------------+
```

**Design Details**:
- Pre-calculated default destinations shown immediately (no user input needed for most plays)
- Each runner row is tappable to cycle through: `out` | `1B` | `2B` | `3B` | `HOME`
- User-adjusted destinations (non-default) show a visual indicator (bold border, different bg)
- Runs scored count and outs-on-play count shown in header badges
- "End At-Bat" confirmation button at bottom
- Background: `board-dark`, borders: `board-medium`

### 3F. Play Log Panel

**Always visible in right column. Scrollable, tappable entries.**

**Structure**:
```
+--PLAY LOG-----------------------------------+
| [header: gold title, help text]             |
|---------------------------------------------|
| ▶ T3  Johnson    [2B]  1 RBI   [ENHANCE]   |
|   +fld  +loc  +pit  +#                      |
|---------------------------------------------|
|   T3  Smith      [K]           QAB          |
|   6-3  Kc                                   |
|---------------------------------------------|
|   T2  Williams   [HR]  2 RBI                |
|   ✓fld  ✓loc                                |
|---------------------------------------------|
```

**Design Details**:
- Most recent play at top (reverse chronological)
- Each entry shows: inning label, batter name, color-coded result badge, RBI count
- Second row: enrichment status badges
  - Gray badges (`+fld`, `+loc`, `+pit`, `+#`) = data not yet entered
  - Green checkmarks = enrichment complete
  - Gold `Kc`/`K` toggle for strikeout type
- **Tappable entries**: Tap to select a play, which activates Enhancement Mode on the diamond
- **Active play**: Gold left border + "ENHANCE" label on the most recently tapped entry
- **New play highlight**: When a new play is recorded, its entry pulses or highlights to draw attention to the "ENHANCE" option
- Non-enrichable plays (BB, HBP, IBB) are not tappable
- Background: `board-medium`, header: `board-dark`, title: `gold`

### 3G. Enhancement Panel

**Appears in center column (below runner outcomes) when a play is selected for enrichment.**

This is the control surface for adding metadata to a recorded play. It consolidates what used to be scattered across modals and the diamond.

**Available Enhancements** (shown as sections/groups):

```
+--ENHANCE: T3 Johnson 2B-----------------------+
|                                                 |
|  CATCH TYPE: [routine] [diving] [sliding] ...   |
|                                                 |
|  SPECIAL:    [KP] [NUT] [TOOTBLAN] [BUNT]      |
|                                                 |
|  PITCH COUNT: [___]    EXIT TYPE: [▼ dropdown]  |
|                                                 |
|  FIELDING:   tap fielders on diamond            |
|  LOCATION:   tap diamond to place ball          |
|                                                 |
|  [DONE ENHANCING]                               |
+-------------------------------------------------+
```

**Design Details**:
- Catch type buttons styled as small toggle chips (selected = `gold` border, unselected = `board-dark`)
- Special event buttons in same style as QuickBar category colors
- Pitch count: small numeric input
- Exit type: dropdown (Line Drive, Fly Ball, Ground Ball, Pop Up)
- "DONE ENHANCING" button deactivates enhancement mode and returns diamond to Info Mode
- Background: `board-dark` with `board-medium` borders

### 3H. Lineup Popover

**Triggered by a button (roster/lineup icon) -- NOT permanently visible.**

**Structure**: Slides in from left or appears as a modal overlay.

```
+--LINEUP CARD----------------------------------+
|  [Away Team Name]         [Home Team Name]     |
|  1. CF  Smith    .312     1. SS  Johnson  .298 |
|  2. SS  Jones    .287     2. CF  Williams .342 |
|  3. 1B  Davis    .305     3. 1B  Brown    .267 |
|  ...                      ...                  |
|  P:  Anderson  4.12 ERA   P:  Martinez  3.56   |
|                                                |
|  [BENCH]  [BULLPEN]  [SUBS]                    |
+-------------------------------------------------+
```

**Design Details**:
- Two-column layout (away vs home)
- Each player row: batting order, position, name, key stat
- Current batter highlighted with `gold` indicator
- Bench/Bullpen tabs for substitution access
- Substitution interface: tap bench player, tap lineup slot to swap
- Background: `board-dark`, text: `chalk`

---

## 4. Interaction Flows

### Flow 1: Normal At-Bat (Most Common)

```
1. User watches play in SMB4
2. User taps QuickBar button (e.g., "2B" for double)
3. Runner Outcomes appear immediately below QuickBar
   - Pre-calculated defaults shown (e.g., R1 → HOME)
   - User taps to adjust if needed
4. User taps "End At-Bat"
5. Play appears in Play Log with "ENHANCE" glow on new entry
6. Diamond returns to Info Mode
7. (Optional) User taps the play in Play Log to enter Enhancement Mode
   - Taps fielders for throw sequence
   - Taps diamond for ball location
   - Selects catch type
   - Taps "DONE ENHANCING"
```

### Flow 2: Between-Play Actions

```
1. No play selected in Play Log (Info Mode active)
2. User taps a fielder icon on diamond
   → Popover opens: Sub player, swap position, update mojo/fitness
3. User taps a runner icon on diamond
   → Popover opens: Stolen base, pickoff, caught stealing
4. User taps lineup button
   → Lineup popover opens for full roster management
```

### Flow 3: Retroactive Enhancement

```
1. User notices an old play in the Play Log has gray enrichment badges
2. User taps that play entry
3. Diamond switches to Enhancement Mode for that play
4. User adds fielding data, ball location, catch type, etc.
5. User taps "DONE ENHANCING"
6. Play Log badges update from gray to green checkmarks
7. Diamond returns to Info Mode
```

---

## 5. State Indicators

### Manager Moment
- When active: `manager-gold` (`#FFD700`) pulsing border around QuickBar or a dedicated banner
- Lightning bolt icon animation

### Inning Transition
- Visual indicator when half-inning changes (score flash, side swap)

### Game Situation Badges
- Leverage Index display (numerical, colored by intensity)
- Win Probability bar or percentage

### Mojo/Fitness on Fielder Icons
- Fielder icons can show small colored dots for mojo state:
  - Rattled = red dot
  - Tense = orange dot
  - Normal = no dot
  - Locked In = green dot
  - Jacked = gold dot

---

## 6. Responsive Behavior

### iPad Landscape (Primary -- 1024x768 to 1366x1024)
- Full three-column layout as described
- All components visible simultaneously

### iPad Portrait (Secondary)
- Two rows: Scoreboard + Diamond on top, QuickBar + Play Log stacked below
- Diamond shrinks to fit
- Play Log may need a tab/toggle to expand

### Compact Mode
- "MINI" toggle on scoreboard collapses to single-row score
- FenwayBoard context cards can be toggled off
- Diamond can shrink by hiding fielder name text (show position only)

---

## 7. Figma Organization

### Suggested Page Structure
1. **Design System** -- Color tokens, typography scale, button styles, card styles, icon set
2. **Components** -- Each component as a Figma component with variants:
   - Full Fenway Scoreboard (expanded / MINI)
   - FenwayBoard (pitcher/batter context)
   - GameDiamond (Info Mode / Enhancement Mode)
   - FielderIcon (default / in-throw-sequence / error / with-mojo-dot)
   - RunnerIcon (default / on-base / with-override-badge)
   - QuickBar (with all button states)
   - RunnerOutcomesDisplay (with sample data)
   - PlayLogPanel (with sample entries showing all enrichment states)
   - EnhancementPanel (with all control groups)
   - LineupPopover (two-team view)
3. **Screens** -- Full assembled layouts:
   - Default state (Info Mode, mid-game, runners on)
   - After play recorded (Runner Outcomes visible, new play highlighted)
   - Enhancement Mode active (play selected, throw sequence in progress)
   - Lineup popover open
   - MINI scoreboard mode
   - Manager Moment active
4. **Flows** -- Prototype connections for the 3 interaction flows

### Auto Layout Guidelines
- All panels use vertical auto-layout with 4-8px gaps
- Cards use 8-12px padding
- Buttons use 6-10px vertical padding, 10-16px horizontal
- Consistent 2-4px borders throughout (never 1px -- too thin for pixel aesthetic)

---

## 8. Reference Assets

| Asset | Location | Description |
|---|---|---|
| Decision Memo | `spec-docs/ENHANCED_FIELD_DECISION_MEMO.md` | All architectural decisions for this redesign |
| Fenway Scoreboard Spec | `spec-docs/GAMETRACKER_FENWAY_SCOREBOARD_EXACT_LAYOUT.tsx` | Pixel-exact scoreboard design artifact (453 lines) |
| Fenway Figma Spec | `spec-docs/GAMETRACKER_FENWAY_SCOREBOARD_FIGMA_SPEC.md` | Dimensions and color spec for scoreboard |
| SMB4 Screenshot | (attached to this task) | Real in-game scoreboard reference |
| Fielding System Spec | `spec-docs/FIELDING_SYSTEM_SPEC.md` | Fielding data model, inference rules |
| Current FenwayBoard | `src/src_figma/app/components/FenwayBoard.tsx` | Existing pitcher/batter context component |
| Current QuickBar | `src/src_figma/app/components/QuickBar.tsx` | Existing 20-button outcome component |
| Current PlayLogPanel | `src/src_figma/app/components/PlayLogPanel.tsx` | Existing play log component |
| Current FielderIcon | `src/src_figma/app/components/FielderIcon.tsx` | Existing fielder icon component |

---

## 9. Design Priorities

1. **Scorekeeping speed** -- The user is actively watching a game. Every interaction must be fast (1-2 taps max for common plays). QuickBar → Runner Outcomes → End At-Bat should take under 5 seconds.

2. **Information density** -- Baseball generates lots of data. Show it all, but with clear hierarchy. Cream chalk text on green is readable at small sizes thanks to the pixel font's clarity.

3. **Enhancement is optional** -- The core flow (QuickBar → runner outcomes → done) must work perfectly without any enhancement. Enhancement mode is a bonus for users who want richer data. Design it as clearly secondary.

4. **Two-mode clarity** -- The diamond's mode (Info vs Enhancement) must be visually unambiguous. Use border color, background tint, or an overlay label so the user always knows which mode they're in.

5. **Chalk authenticity** -- The scoreboard should feel like it was hand-chalked by a ballpark scorekeeper. Imperfect, warm, analog. The pixel font and hard shadows reinforce this. Avoid anything that feels "modern web app" -- no gradients, no glass effects, no rounded corners.
