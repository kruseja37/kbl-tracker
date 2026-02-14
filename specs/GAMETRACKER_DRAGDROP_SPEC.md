# GameTracker Drag-and-Drop Specification

> **Purpose**: Define the drag-and-drop interaction model for the GameTracker component
> **Status**: DRAFT v4 - Added Foul Territory, Substitutions, Undo
> **Created**: 2026-01-31
> **Updated**: 2026-01-31 - Added foul geometry, lineup card subs, undo button

---

## Executive Summary

The GameTracker captures deep metrics (spray charts, park factors, fielding sequences) via an intuitive drag-and-drop interface on a **continuous geometric plane**.

### Core Principles

1. **ALL contact is tracked** - Every ball in play gets a spray chart location
2. **Fielder drop = where ball was fielded** (not where they throw)
3. **Tap sequence = throw chain** (tap fielder → implies throw to them)
4. **Extended field includes stands** - HR landing spots tracked for distance/park data
5. **Two ways to log HRs** - Drag past fence (fun) OR HR button (quick)
6. **Foul territory is geometric** - Auto-detected from coordinates
7. **Substitutions via lineup card** - Not field dragging (prevents accidents)
8. **Undo button** - 5-step undo stack, no gestures (prevents accidents)
9. **Contextual refinement buttons** - After play, inferred special event buttons appear

---

## Four Ways to End an At-Bat

The user has **four primary input methods** to signal an at-bat has concluded:

| # | Action | What It Implies | Ball Location |
|---|--------|-----------------|---------------|
| **1** | **Drag fielder** to a spot on field | Out of some form (the drop location = where ball was fielded) | Captured from drop |
| **2** | **Drag batter** to safe/out zone at base | Hit (even if runner thrown out after) | User prompted to tap location |
| **3** | **Drag runner** to safe/out zone | Runner movement (steal, caught stealing, advancing on throw) | N/A - no ball in play |
| **4** | **Tap HR button** | Home run (quick entry) | User prompted for location + distance |

### Ball Location Capture Rules

- **Option 1 (Fielder drag)**: Drop location IS the ball location - no additional prompt needed
- **Option 2 (Batter drag)**: User is prompted "Touch where the ball landed" after dragging batter
- **Option 3 (Runner drag)**: No ball location - this is between-pitch or between-AB movement
- **Option 4 (HR button)**: User taps stands location, then enters distance

### After Play: Contextual Refinement Buttons (v2 - 2026-01-31)

> **Design Philosophy**: The user already told us WHAT happened. Contextual buttons ask "was there anything SPECIAL about it?"
>
> These buttons appear temporarily after play completion, positioned along the southern border of the field (foul territory area). They're quick one-tap refinements, not modals.

#### Inference Logic by Play Type

| Play Detected | First Fielder | Contextual Buttons Shown | Inference Logic |
|---------------|---------------|--------------------------|-----------------|
| **FO/LO (y > 0.95)** | 7, 8, 9 | `🎭 ROBBERY` | Catch at wall = HR denied |
| **FO/LO (0.8 < y ≤ 0.95)** | 7, 8, 9 | `⭐ WEB GEM` | Deep catch = spectacular |
| **K (2-3 seq)** | 2 | `K` / `Ꝅ` (looking) | Catcher throw to 1B = strikeout |
| **K (2-3-3 seq)** | 2 | `K` / `Ꝅ` / `D3K` | Catcher dropped K, batter ran |
| **GO/FC (1-X seq)** | 1 | `💥 KILLED` / `🥜 NUTSHOT` | Pitcher fielded = comebacker |
| **1B (y < 0.4)** | Any IF | `🏃 BEAT THROW` / `🏏 BUNT` | Infield hit = either beat throw or bunt |
| **Out (runner also out, non-DP)** | Any | `🤦 TOOTBLAN` | Runner out on same play = possible baserunning blunder |
| **Out (y > 0.8, throw to 2B/3B/HP)** | 7, 8, 9 | `🤦 TOOTBLAN` | Deep fly, runner thrown out = tried to tag |
| **Any AB ends** | — | `7️⃣ 7+ PITCH` | Always available (no pitch tracking) |

#### Button Behavior

1. **One-tap confirmation**: Tapping a button records the special event immediately
2. **Auto-dismiss**: Buttons disappear after ~3 seconds OR when next play starts
3. **Fielder attribution**: Special events auto-credit the first fielder from the previous play
4. **Fame integration**: Events flow to Fame system with LI weighting: `fameValue = baseFame × √LI`

#### Fame Values (per SPECIAL_EVENTS_SPEC.md + kbl-detection-philosophy.md)

| Event | Base Fame | Notes |
|-------|-----------|-------|
| 🎭 ROBBERY | +1.5 | Fielder - catch at wall (y > 0.95) |
| ⭐ WEB GEM | +1.0 | Fielder - spectacular catch (0.8 < y ≤ 0.95) |
| 🤦 TOOTBLAN | -3.0 | Runner - baserunning blunder |
| 💥 KILLED | +3.0 | Batter - knocked pitcher down |
| 🥜 NUTSHOT | +1.0 | Batter - comebacker to sensitive area |

> **NOTE**: Robbery > Web Gem in Fame because denying a HR is more impactful than a diving catch.

#### Permanent Buttons (Always Available)

These buttons are NOT contextual - they're always visible:

| Button | Purpose | Notes |
|--------|---------|-------|
| `💣 HR` | Quick HR entry | Bypasses drag-to-stands, prompts for location + distance |
| `7️⃣ 7+ PITCH` | Mark tough AB | No pitch tracking required - user just knows |

#### Deprecated (DO NOT USE)

The following patterns from earlier versions are **deprecated**:

- ❌ Pop-up modals for special events (replaced by contextual buttons)
- ❌ Manual special event entry via separate menu (replaced by contextual inference)
- ❌ Asking "Was that a Web Gem?" after every fly out (only show for deep catches)

---

## Coordinate System

### Extended Field Geometry (Includes Stands & Foul Territory)

The field extends beyond the wall and includes foul territory:

```
     y=1.4  ──────────────────────────────  (Upper Deck)
            │         STANDS              │
     y=1.2  │    LF      CF      RF       │
            │   Seats   Seats   Seats     │
     y=1.0  ├─────────────────────────────┤  ← WALL
            │ \                       /   │
     y=0.85 │  \   LF     CF     RF  /    │  (Deep OF)
            │   \                 /       │
     y=0.65 │    \ [7]   [8]   [9]/       │  (OF positions)
            │     \             /         │
     y=0.42 │      \  [6] [4]  /          │  (IF positions)
            │   [5] \       / [3]         │
     y=0.35 ├──3B────\─────/────1B────────┤
            │  FOUL   \   /    FOUL       │  ← Foul lines at 45°
     y=0.18 │          [1]                │  (Pitcher)
            │           │                 │
     y=0.08 │          [2]                │  (Catcher)
            │           │                 │
     y=0.0  └───FOUL──[HOME]──FOUL────────┘
           x=0.0      x=0.5             x=1.0

            FOUL = |x - 0.5| > y × 0.5
```

### Foul Territory Detection

```typescript
/**
 * Determines if a coordinate is in foul territory.
 * Foul lines extend from home plate at 45° angles.
 *
 * Fair zone widens as y increases:
 * - At y=0 (home), fair zone is just x=0.5
 * - At y=0.5, fair zone is x=0.25 to x=0.75
 * - At y=1.0 (wall), fair zone is x=0.0 to x=1.0
 */
function isFoulTerritory(x: number, y: number): boolean {
  // Behind home plate is always foul
  if (y < 0) return true;

  // Foul lines: distance from centerline > y × 0.5
  // This creates 45° foul lines from home plate
  const distanceFromCenter = Math.abs(x - 0.5);
  const fairZoneHalfWidth = y * 0.5;

  return distanceFromCenter > fairZoneHalfWidth;
}

/**
 * Get the foul territory type for display purposes
 */
function getFoulType(x: number, y: number): 'left_foul' | 'right_foul' | 'behind_home' | null {
  if (!isFoulTerritory(x, y)) return null;
  if (y < 0.1) return 'behind_home';
  return x < 0.5 ? 'left_foul' : 'right_foul';
}
```

### Coordinate Mapping

| Location | Coordinates | Notes |
|----------|-------------|-------|
| Home Plate | (0.5, 0.0) | Batter starts here |
| Catcher | (0.5, 0.08) | Behind home |
| Pitcher | (0.5, 0.18) | Mound |
| First Base | (0.75, 0.35) | Right side infield |
| Second Base | (0.5, 0.42) | Middle infield |
| Third Base | (0.25, 0.35) | Left side infield |
| Shortstop | (0.38, 0.40) | Between 2B and 3B |
| Left Field | (0.15, 0.65) | Deep left |
| Center Field | (0.5, 0.75) | Deep center |
| Right Field | (0.85, 0.65) | Deep right |
| **LF Wall** | (0.0-0.35, 1.0) | Left field fence |
| **CF Wall** | (0.35-0.65, 1.0) | Center field fence |
| **RF Wall** | (0.65-1.0, 1.0) | Right field fence |
| **LF Stands** | (0.0-0.35, 1.0-1.4) | HR landing zone LF |
| **CF Stands** | (0.35-0.65, 1.0-1.4) | HR landing zone CF |
| **RF Stands** | (0.65-1.0, 1.0-1.4) | HR landing zone RF |
| **LF Foul** | x < 0.5 - y×0.5 | Left foul territory |
| **RF Foul** | x > 0.5 + y×0.5 | Right foul territory |

### Spray Chart: Wall Scrapers vs Bombs

The y-coordinate beyond the wall indicates HR type:

```typescript
function classifyHomeRun(y: number): 'wall_scraper' | 'deep' | 'bomb' {
  if (y < 1.05) return 'wall_scraper';  // Just cleared
  if (y < 1.2) return 'deep';           // Solid HR
  return 'bomb';                         // Upper deck / monster shot
}
```

---

## Core Interaction Patterns

### Pattern 1: Hit - Batter Reaches Base Safely

**Step 1**: Drag **batter** to destination base (1B, 2B, 3B)

**Step 2**: Engine prompts: **"Touch where the ball landed"**

**Step 3**: User taps location on field → spray chart captured

**Step 4**: Pop-up asks for hit type:
- Ground ball / Line drive / Fly ball

**Optional Step 5**: If fielder made diving attempt but missed:
- Prompt: "Diving attempt?" → Yes/No
- If Yes: Fielding chance recorded (affects fWAR, not error)

```
Batter drag to 1B → "Touch where ball landed" → User taps LCF → "Hit type?" → Line drive → Done
```

### Pattern 2: Home Run (Two Methods)

#### Method A: Drag Past Fence (Fun)

**Step 1**: Drag **batter** beyond the wall (y > 1.0)

**Step 2**: User drops batter in the stands at landing location
- Drop position = exact spray chart location (including stands)
- Y-coordinate determines wall scraper vs bomb automatically

**Step 3**: Pop-up with text input: **"Distance (ft)?"**
- Text box for exact distance (SMB4 shows this)
- Example: 427

**Step 4**: Record HR with full data

```
Drag batter to RF stands (0.8, 1.15) → "Distance?" → 412 → HR recorded
```

#### Method B: HR Button (Quick)

**Step 1**: Tap **[HR]** button (in foul territory per Figma)

**Step 2**: Engine prompts: **"Touch where the ball landed"**
- User taps location in stands (y > 1.0)

**Step 3**: Pop-up with text input: **"Distance (ft)?"**

**Step 4**: Record HR with full data

Both methods capture the same data; user chooses preferred UX.

### Pattern 3: Out - Fielder Makes Play

**Step 1**: Drag **fielder** to the spot where they fielded the ball
- This captures spray chart location
- Fielder snaps back to position after drop (or shows at drop spot briefly)

**Step 2**: Tap **next fielder(s)** in throw sequence
- Tap 1B (position 3) → implies throw to first for out
- Tap 2B then 1B → builds "4-3" or "6-4-3" sequence
- Tapping a fielder AT a base implies out at that base

**Step 3**: Pop-up confirms play type:
- Ground out / Line out / Fly out / Pop out
- Shows fielder sequence (e.g., "6-4-3")
- Checkboxes: Double play? Triple play?

```
Drag SS to (0.4, 0.38) → Tap 2B → Tap 1B → "6-4-3 Double Play" confirmed
```

### Pattern 4: Fly Out / Line Out (Single Fielder)

**Step 1**: Drag **outfielder** to catch location

**Step 2**: Tap **dugout** (or don't tap anyone - just the fielder made the catch)

**Step 3**: Pop-up: "Fly out or Line out?"

**Special prompts if applicable**:
- Deep location (y > 0.8): "Web Gem?"
- Near wall (y > 0.95): "Robbery? (HR denied)"

```
Drag CF to (0.5, 0.85) → "Fly out / Line out?" → "Web Gem?" → F-8, Web Gem recorded
```

### Pattern 5: Foul Out (Auto-Detected)

**Step 1**: Drag **fielder** to catch location in **foul territory**
- System auto-detects foul territory from coordinates
- No need for user to specify "foul out"

**Step 2**: System recognizes `isFoulTerritory(x, y) === true`

**Step 3**: Pop-up confirms: **"Foul out to [position]"**
- Shows territory: "LF foul territory" / "RF foul territory" / "Behind home"

```
Drag catcher to (0.6, 0.05) → Auto-detect foul → "Foul out to C" confirmed
Drag 1B to (0.9, 0.3) → Auto-detect RF foul → "Foul out to 1B" confirmed
```

### Pattern 6: Foul Ball (Strike, Not Caught)

For foul balls that add a strike but aren't caught:

**Option A**: Tap **[📍 Foul]** quick button
- Adds strike (unless already 2 strikes)
- No location tracking needed

**Option B**: Drag fielder to foul territory but **cancel** the catch
- Shows foul territory, user cancels popup
- Strike added automatically

### Pattern 7: Runner Advance/Out (Mid-At-Bat)

**User Action**: Drag **runner** from current base to new base

**If dropped ON the bag** (safe):
- Pop-up: SB, WP, PB, DI, Error?
- If Error: Tap fielder who committed it

**If dropped OFF the bag** (out):
- Pop-up: CS, Pickoff, TOOTBLAN?
- Then tap fielder sequence for the out

### Pattern 8: Walk / HBP / Strikeout (No Ball in Play)

**Quick buttons** below field:

```
[BB] [IBB] [HBP] [K] [Ꝁ] [Drop K] [HR]
```

- **BB/IBB/HBP**: Batter auto-advances to 1B
- **K/Ꝁ**: Strikeout (swinging/looking)
- **Drop K**: Dropped third strike - then show fielder interaction
- **HR**: Alternative to drag-past-fence method

### Pattern 9: Error

**Step 1**: Long-press (or double-tap) **fielder** to enter error mode
- Fielder icon shows "E" indicator

**Step 2**: Drag fielder to where ball was fielded

**Step 3**: Pop-up: Error type
- Fielding error
- Throwing error
- Dropped ball

**Step 4**: Batter advances, error charged to fielder

### Pattern 10: Fielding Chance on Hit (Diving Attempt)

When a hit occurs but fielder made a play attempt:

**After user taps ball landing location**:
- If location is near a fielder's range, prompt: "Fielding attempt?"
- If Yes: "Diving / Leaping / Sliding?"
- Records fielding chance (affects fielding%, fWAR) but not an error

---

## Substitution System

### Design Principle

**Substitutions happen in the lineup card, NOT by dragging on the field.**

Dragging players across the field is error-prone. Instead:
- **Lineup card** handles all position player substitutions
- **Pitcher slot** (next to current batter) handles pitching changes
- **Field view** is display-only (reflects lineup card state)

### GameTracker Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [FIELD VIEW] - Display only, shows defensive positions     │
│  [BIG SCOREBOARD BANNER] - Inning, score, count            │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  CURRENT   │  │   SMALL    │  │  CURRENT   │            │
│  │  BATTER    │  │ SCOREBOARD │  │  PITCHER   │ ← Drop     │
│  │ [J.Smith]  │  │  2-1  B:1  │  │ [M.Jones]  │   zone     │
│  │  SS  .287  │  │  S:2  O:1  │  │  RHP  4.12 │   for new  │
│  └────────────┘  └────────────┘  └────────────┘   pitcher  │
├─────────────────────────────────────────────────────────────┤
│  [LINEUP CARD] - Drag-and-drop for subs                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. SS  J. Smith    .287   ←→  Drag to swap/sub     │   │
│  │ 2. CF  M. Jones    .312                             │   │
│  │ 3. 1B  R. Davis    .298                             │   │
│  │ 4. LF  T. Wilson   .276                             │   │
│  │ 5. 3B  K. Brown    .289                             │   │
│  │ 6. RF  A. Lee      .267                             │   │
│  │ 7. 2B  C. Garcia   .245                             │   │
│  │ 8. C   P. Martinez .231                             │   │
│  │ 9. DH  S. Taylor   .301                             │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ BENCH                                               │   │
│  │ B. Wilson (OF) │ T. Lee (IF) │ J. Park (C)         │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  [BULLPEN]                                                  │
│  Available: Smith (L) │ Jones (R) │ Davis (R)              │
│  Used: ~~Martinez (R)~~ ❌                                  │
└─────────────────────────────────────────────────────────────┘
```

### Pitching Change

**Step 1**: Drag reliever from **bullpen section** → drop on **Current Pitcher slot**

**Step 2**: Confirmation popup:
- "Replace [Old Pitcher] with [New Pitcher]?"
- Shows pitcher stats

**Step 3**: On confirm:
- New pitcher appears in Current Pitcher slot
- Old pitcher moves to bullpen, shown as: ~~Name~~ ❌ (grayed, crossed out)
- Field view updates to show new pitcher on mound
- Scoreboard updates pitcher name

### Position Player Substitution

**Step 1**: In **lineup card**, drag bench player → drop on lineup slot

**Step 2**: Confirmation popup:
- "Replace [Old Player] with [New Player] at [Position]?"
- Option to change position if new player is versatile

**Step 3**: On confirm:
- New player appears in lineup slot
- Old player moves to bench, shown as: ~~Name~~ ❌ (grayed, crossed out)
- Field view updates defensive positions

### Defensive Switch (No Substitution)

**Step 1**: In **lineup card**, drag player A → drop on player B's slot

**Step 2**: Confirmation popup:
- "Switch [A] and [B] positions?"
- Shows: "A: SS → 3B, B: 3B → SS"

**Step 3**: On confirm:
- Players swap positions in lineup
- Field view updates
- No one leaves the game

### Double Switch

**Step 1**: Make pitching change (drag reliever to pitcher slot)

**Step 2**: Before confirming, drag bench player to lineup slot

**Step 3**: Confirmation shows combined move:
- "Pitching change: [Old P] → [New P]"
- "Substitution: [Old Player] → [New Player]"
- "Lineup spot swap if applicable"

### Player States

| State | Visual | Meaning |
|-------|--------|---------|
| **In Game** | Normal, highlighted border | Currently playing |
| **Available** | Normal | On bench/bullpen, can enter |
| **Used** | Grayed + ~~strikethrough~~ + ❌ | Already removed, cannot re-enter |

---

## Undo System

### Design Principle

**Undo button only, no gestures.**

Swipe gestures are too easy to trigger accidentally during normal field interaction.

### Undo Button

- **Location**: Top-left corner of GameTracker
- **Appearance**: Small button with ↩ icon
- **Shows remaining undos**: "↩ 3" (3 undos available)
- **Grayed out**: When stack is empty

### Undo Stack

```typescript
interface UndoState {
  maxSteps: 5;
  stack: GameSnapshot[];
  currentIndex: number;
}

interface GameSnapshot {
  timestamp: number;
  gameState: GameState;
  playDescription: string; // For display: "Single to LF"
}
```

### What Can Be Undone

| Action | Undoable | Notes |
|--------|----------|-------|
| Record hit | ✅ | Restores previous state |
| Record out | ✅ | Restores previous state |
| Record HR | ✅ | Restores previous state |
| Runner advance | ✅ | Restores previous state |
| Substitution | ✅ | Restores previous state |
| Pitching change | ✅ | Restores previous state |
| End inning | ✅ | Restores previous state |
| End game | ❌ | Too significant, requires confirmation |

### Undo UX Flow

**Step 1**: User taps undo button

**Step 2**: Toast notification shows what was undone:
- "Undone: Single to LF by J. Smith"

**Step 3**: Game state reverts to previous snapshot

**Step 4**: Button updates count: "↩ 2"

### Snapshot Timing

Snapshots are taken **before** each significant action:
- Before recording any play outcome
- Before making any substitution
- Before ending half-inning/inning

---

## Fielder Interaction Details

### Fielder Positions

```typescript
const FIELDER_POSITIONS = {
  1: { x: 0.50, y: 0.18, label: 'P' },   // Pitcher
  2: { x: 0.50, y: 0.08, label: 'C' },   // Catcher
  3: { x: 0.75, y: 0.35, label: '1B' },  // First Base
  4: { x: 0.58, y: 0.42, label: '2B' },  // Second Base
  5: { x: 0.25, y: 0.35, label: '3B' },  // Third Base
  6: { x: 0.42, y: 0.40, label: 'SS' },  // Shortstop
  7: { x: 0.15, y: 0.65, label: 'LF' },  // Left Field
  8: { x: 0.50, y: 0.75, label: 'CF' },  // Center Field
  9: { x: 0.85, y: 0.65, label: 'RF' },  // Right Field
};
```

### Tap Sequence Mechanics

After dragging a fielder to the ball location:

| Tap Target | Meaning |
|------------|---------|
| Another fielder | Throw to that fielder |
| Fielder at a base | Out at that base |
| Dugout | Ball caught (no throw needed) |
| Nothing (confirm) | Unassisted play |

### Building Sequences - Examples

| Play | User Actions | Result |
|------|--------------|--------|
| F-8 | Drag CF to catch spot → Confirm | Fly out to CF |
| 6-3 | Drag SS to ball spot → Tap 1B | Ground out SS to 1B |
| 6-4-3 DP | Drag SS → Tap 2B → Tap 1B | Double play |
| 5-4 | Drag 3B → Tap 2B | Force out at 2B |
| U-3 | Drag 1B to ball spot → Confirm | Unassisted out |
| 1-3 | Drag P → Tap 1B | Comebacker, out at first |
| Foul-2 | Drag C to foul area → Confirm | Foul out to catcher |

---

## Special Events Detection

### Auto-Prompt Events

| Event | Trigger | Prompt |
|-------|---------|--------|
| **Comebacker** | Pitcher (1) is first fielder | "Killed Pitcher / Nutshot?" |
| **Web Gem** | OF catch at y > 0.8 | "Great catch? (Web Gem)" |
| **Robbery** | Catch at y > 0.95 | "HR Robbery?" |
| **TOOTBLAN** | Runner out (not force) | "TOOTBLAN?" |
| **7+ Pitch AB** | Pitch count ≥ 7 | Auto-logged |
| **Foul Out** | Catch in foul territory | Auto-classified |

### Manual Quick Buttons

Always visible:

```
[🥜 Nutshot] [💥 Killed P] [🤦 TOOTBLAN] [⭐ Web Gem] [📍 Foul]
```

---

## Data Recording

### Hit Recording

```typescript
recordHit({
  batterId: string,
  type: 'single' | 'double' | 'triple' | 'homeRun',
  hitType: 'ground' | 'line' | 'fly',
  location: { x: number, y: number },  // Where ball landed
  distance?: number,                    // For HRs (exact feet from SMB4)
  rbis: number,
  fieldingAttempt?: {
    fielderId: string,
    attemptType: 'diving' | 'leaping' | 'sliding',
  },
  specialEvents: SpecialEvent[],
});
```

### Out Recording

```typescript
recordOut({
  batterId: string,
  type: 'flyOut' | 'groundOut' | 'lineOut' | 'popOut' | 'strikeout' | 'foulOut',
  fielderSequence: number[],           // [6, 4, 3] for 6-4-3
  ballLocation: { x: number, y: number }, // Where ball was fielded
  isFoulTerritory: boolean,            // Auto-detected from location
  isDoublePlay: boolean,
  isTriplePlay: boolean,
  runnersOut: { runnerId: string, base: BaseId }[],
  specialEvents: SpecialEvent[],
});
```

### Home Run Recording

```typescript
recordHomeRun({
  batterId: string,
  landingLocation: { x: number, y: number }, // In stands (y > 1.0)
  distance: number,                          // Exact feet from SMB4
  type: 'wall_scraper' | 'deep' | 'bomb',    // Derived from y
  rbis: number,
  specialEvents: SpecialEvent[],
});
```

### Substitution Recording

```typescript
recordSubstitution({
  type: 'pitching_change' | 'position_player' | 'defensive_switch' | 'double_switch',
  incomingPlayerId: string,
  outgoingPlayerId: string,
  newPosition?: Position,           // For position changes
  lineupSpot?: number,              // 1-9
  inning: number,
  halfInning: 'top' | 'bottom',
});
```

---

## UI Components

### 1. FieldCanvas (Extended)
- SVG field with stands area (y extends to 1.4)
- Coordinate system (0,0) to (1,1.4)
- Wall line clearly visible at y=1.0
- Stands rendered with seat pattern above wall
- **Foul lines visible** at 45° from home
- **Foul territory shaded differently**

### 2. DraggableFielder
- 9 fielder icons at positions
- Draggable to indicate ball fielded location
- Returns to position after drop
- Tappable for throw sequences

### 3. DraggableBatter
- At home plate
- Draggable to bases (hit) or past wall (HR)
- Visual feedback during drag

### 4. DraggableRunner
- At occupied bases
- Draggable to next base or out zone

### 5. BaseTarget
- 4 bases: 1B, 2B, 3B, Home
- Safe zone (on bag) vs Out zone (near bag)
- Visual feedback: green (safe) / red (out)

### 6. BallLandingPrompt
- Appears after batter reaches base
- "Touch where the ball landed"
- Full field is tappable

### 7. DistanceInput
- Text input for HR distance
- Numeric keyboard
- "Distance (ft)?" label

### 8. PlayConfirmationPopup
- Shows inferred play
- Fielder sequence display
- **Auto-shows "Foul out" for foul territory catches**
- Special event checkboxes
- Confirm / Edit / Cancel

### 9. QuickButtons
- Row below field
- BB, IBB, HBP, K, Ꝁ, Drop K, HR
- Special events row

### 10. UndoButton
- Top-left corner
- Shows "↩ N" with remaining undos
- Grayed when empty

### 11. LineupCard
- Draggable player slots
- Shows position, name, key stat
- Drop zones for substitutions

### 12. BenchPanel
- List of available bench players
- Draggable to lineup slots
- Used players grayed + ❌

### 13. BullpenPanel
- List of available relievers
- Draggable to pitcher slot
- Used pitchers grayed + ❌

### 14. CurrentPitcherSlot
- Drop zone for pitching changes
- Shows current pitcher name + stats
- Accepts drops from bullpen

---

## Implementation Phases

### Phase 1: Extended Field Canvas
- [ ] Create SVG field with stands area
- [ ] Implement coordinate system (0-1.4 for y)
- [ ] Add wall line at y=1.0
- [ ] **Add foul lines at 45°**
- [ ] **Shade foul territory**
- [ ] Render fielder icons at positions
- [ ] Add base targets

### Phase 2: Batter Drag-Drop
- [ ] Draggable batter component
- [ ] Drop detection on bases
- [ ] Drop detection past wall (HR)
- [ ] "Touch where ball landed" prompt
- [ ] Distance input for HRs

### Phase 3: Fielder Drag-Drop
- [ ] Draggable fielder components
- [ ] Drop = ball fielded location
- [ ] **Auto-detect foul territory from coordinates**
- [ ] Tap sequence for throws
- [ ] Build fielder sequence display
- [ ] Confirm popup with play type

### Phase 4: Play Classification
- [ ] Hit classification (type, location)
- [ ] Out classification (sequence, type)
- [ ] **Foul out auto-classification**
- [ ] HR classification (distance, type)
- [ ] Fielding chance on hits (diving attempts)
- [ ] Special event detection

### Phase 5: Runner Events
- [ ] Draggable runners
- [ ] Safe/out zones at bases
- [ ] SB/CS/WP/PB classification
- [ ] Error mode (long-press)

### Phase 6: Substitution System
- [ ] Lineup card component
- [ ] Bench panel with draggable players
- [ ] Bullpen panel with draggable pitchers
- [ ] Current pitcher slot (drop zone)
- [ ] Substitution confirmation popup
- [ ] Used player visual state (grayed + ❌)
- [ ] Field view sync with lineup card

### Phase 7: Undo System
- [ ] Undo button component
- [ ] GameSnapshot type
- [ ] Snapshot capture before actions
- [ ] Undo stack management (max 5)
- [ ] Undo action with state restore
- [ ] Toast notification for undone action

### Phase 8: Data Layer & Polish
- [ ] Connect to useGameState
- [ ] Wire all record functions
- [ ] IndexedDB persistence
- [ ] Animations & feedback
- [ ] Mobile touch support

---

## Open Questions (All Resolved)

1. ~~**Spray chart precision**~~ → **RESOLVED**: Continuous (x, y) including stands
2. ~~**Fielder inference**~~ → **RESOLVED**: User drags fielder to ball spot
3. ~~**HR entry**~~ → **RESOLVED**: Both drag-past-fence AND HR button supported
4. ~~**HR distance**~~ → **RESOLVED**: Text input for exact feet from SMB4
5. ~~**Wall scraper vs bomb**~~ → **RESOLVED**: Y-coordinate determines automatically
6. ~~**Foul balls**~~ → **RESOLVED**: Auto-detected from coordinates, [📍 Foul] button for strikes
7. ~~**Pitcher substitution**~~ → **RESOLVED**: Drag from bullpen to pitcher slot
8. ~~**Replay/undo**~~ → **RESOLVED**: Undo button with 5-step stack, no gestures

---

## Appendix: SMB4-Specific Considerations

Per `spec-docs/SMB4_GAME_MECHANICS.md`:

- **No balks** - Excluded from runner options
- **No catcher interference** - Excluded from outcomes
- **No checked swings** - K is K
- **HR distance shown** - SMB4 displays exact feet, we capture it

The system should NOT offer options that don't exist in SMB4.
