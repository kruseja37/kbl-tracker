# KBL XHD Tracker - Feature Questions & Answers

## 1. Maddux Threshold for SMB

### The Problem
A traditional MLB "Maddux" is a complete game shutout in under 100 pitches. However, SMB has fewer pitches per at-bat due to:
- Faster gameplay mechanics
- Typically 3-4 pitches per AB vs MLB's 4-5
- Shorter games (often 6-7 innings instead of 9)

### Analysis Needed
I don't have access to the screenshots with actual NP (Number of Pitches) data. To calculate the SMB Maddux threshold, I'd need:
- Average pitches per inning in SMB
- Average pitches per batter faced

**Estimated Calculation:**
If MLB averages ~15-16 pitches/inning and SMB averages ~10-12:
- MLB Maddux: <100 pitches for 9 innings ≈ 11.1 pitches/inning
- SMB Maddux (9 innings): ~10 × 9 = **~90 pitches**
- SMB Maddux (7 innings): ~10 × 7 = **~70 pitches**
- SMB Maddux (6 innings): ~10 × 6 = **~60 pitches**

**Recommendation:** Once you share the NP/TBF data, I can calculate the exact ratio. For now, a formula approach:

```javascript
function getMadduxThreshold(inningsInGame) {
  const MLB_PITCHES_PER_INNING = 15.5;  // MLB average
  const SMB_PITCHES_PER_INNING = 11;    // Estimated SMB average (UPDATE WITH REAL DATA)
  const MLB_MADDUX = 100;

  const ratio = SMB_PITCHES_PER_INNING / MLB_PITCHES_PER_INNING;
  const smbMaddux = Math.round(MLB_MADDUX * ratio * (inningsInGame / 9));

  return smbMaddux;
}

// Examples:
// 9-inning game: ~64 pitches
// 7-inning game: ~50 pitches
// 6-inning game: ~43 pitches
```

**Please share the NP/IP data** so I can calculate the actual SMB pitches-per-inning ratio!

---

## 2. Team Management Page

Yes! Each team should have a dedicated management page with:

### Team Page Features

```
┌─────────────────────────────────────────────────────────────────────┐
│  GIANTS - Team Management                                [Season 3] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [ROSTER]  [STADIUM]  [STATS]  [HISTORY]                           │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  STADIUM                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Current: Oracle Park                                        │   │
│  │  [CHANGE STADIUM ▼]                                          │   │
│  │                                                              │   │
│  │  Available Stadiums:                                         │   │
│  │  • Oracle Park (current)                                     │   │
│  │  • Emerald Diamond                                           │   │
│  │  • Bingata Bowl                                              │   │
│  │  • Red Rock Park                                             │   │
│  │  • ... (all stadiums in database)                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  MANAGER                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Joe Manager (Grade: B+)                                     │   │
│  │  mWAR: 2.3 | Record: 28-14                                   │   │
│  │                                                              │   │
│  │  [FIRE MANAGER]  → Triggers Random Manager Assignment        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Roster Tab with Mojo/Fitness

```
┌─────────────────────────────────────────────────────────────────────┐
│  ROSTER - Giants                                                    │
├─────────────────────────────────────────────────────────────────────┤
│  STARTING LINEUP                                                    │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Pos │ Player          │ Grade │ Mojo  │ Fitness │ Actions    │ │
│  ├─────┼─────────────────┼───────┼───────┼─────────┼────────────┤ │
│  │ CF  │ Barry Bonds     │ A     │ 😊+2  │ 💪100%  │ [Edit]     │ │
│  │ SS  │ Ozzie Smith     │ B+    │ 😐 0  │ 💪95%   │ [Edit]     │ │
│  │ 1B  │ Junior Young Jr │ C+    │ 😰-1  │ 🤕75%   │ [Edit]     │ │
│  │ ... │ ...             │ ...   │ ...   │ ...     │ ...        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Quick Actions:                                                     │
│  [ADJUST MOJO]  [ADJUST FITNESS]  [SWAP POSITIONS]                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Player Edit Modal (Mojo/Fitness)

```
┌─────────────────────────────────────────────────────────┐
│  EDIT PLAYER - Junior Young Jr                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  MOJO (affects in-game performance)                     │
│  Current: -1 (Tense)                                    │
│  [──────●────────] -3 to +3                             │
│  New: [0] ▼                                             │
│  Reason: [Good game last night        ]                 │
│                                                         │
│  FITNESS (affects stamina/injury risk)                  │
│  Current: 75%                                           │
│  [────────●──────] 0% to 100%                           │
│  New: [80] %                                            │
│  Reason: [Rest day                    ]                 │
│                                                         │
│                          [CANCEL]  [SAVE]               │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Can We Change Fielding Positions In-Game Without Subbing?

**Question:** Can players swap defensive positions without substitutions?

**Answer:** This depends on what SMB4 allows:
- If SMB4 allows mid-inning defensive shifts → Yes, track in app
- If SMB4 requires substitution for position changes → No

**App Implementation (if allowed):**

```
┌─────────────────────────────────────────────────────────┐
│  IN-GAME POSITION SWAP                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Current Positions:                                     │
│  • Barry Bonds: LF                                      │
│  • Amos Otis: CF                                        │
│  • Reggie Sanders: RF                                   │
│                                                         │
│  Swap:                                                  │
│  [Barry Bonds ▼] ↔ [Amos Otis ▼]                       │
│  LF ↔ CF                                                │
│                                                         │
│  ⚠️ This is a position swap only, not a substitution    │
│  Both players remain in the game                        │
│                                                         │
│                          [CANCEL]  [SWAP]               │
└─────────────────────────────────────────────────────────┘
```

This would affect:
- Games at position tracking
- fWAR calculations (position-specific)
- Fielding stats attribution

---

## 4. Random Event Changes (Mid-Season)

Random events should be accessible from multiple places:

### Triggered Events (Auto-Scheduled)
- 20 events scheduled at season start (hidden)
- Fire after specific games throughout season
- App prompts: "Random Event triggered after Game 23!"

### Manual Event Trigger
- Available from Team Page or League Dashboard
- For events that happen outside the auto-schedule

### Event Application Flow

```
┌─────────────────────────────────────────────────────────┐
│  🎲 RANDOM EVENT - Game 23                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Event Type: RATING CHANGE (+10 to random category)     │
│  Affected Player: Junior Young Jr (Giants)              │
│                                                         │
│  Rolling for category...                                │
│  🎲 Result: POWER                                       │
│                                                         │
│  Junior Young Jr: Power 65 → 75                         │
│                                                         │
│  ⚠️ This may change the player's Grade!                 │
│  Current Grade: C+                                      │
│  [CHECK NEW GRADE]                                      │
│                                                         │
│                              [APPLY EVENT]              │
└─────────────────────────────────────────────────────────┘
```

After applying, prompt for grade confirmation if ratings changed.

---

## 5. Manager Fired Flow

```
┌─────────────────────────────────────────────────────────┐
│  🔥 FIRE MANAGER                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Team: Giants                                           │
│  Current Manager: Joe Manager (Grade: B+)               │
│  Record: 28-14 (.667)                                   │
│                                                         │
│  Are you sure you want to fire this manager?            │
│                                                         │
│  New Manager Assignment:                                │
│  ○ Random from available pool                           │
│  ○ Promote from within (bench coach)                    │
│  ○ Select specific manager: [────────────▼]             │
│                                                         │
│  Reason (optional): [Poor bullpen management    ]       │
│                                                         │
│                     [CANCEL]  [FIRE & REPLACE]          │
└─────────────────────────────────────────────────────────┘
```

---

## 6. iPad/Touch Screen UI/UX Optimization

### Key Principles

1. **Larger Touch Targets**
   - Minimum 44x44 points for all buttons
   - Generous padding around interactive elements
   - Swipe gestures for common actions

2. **Responsive Layout**
   - Works in both portrait and landscape
   - Collapsible sidebars for more screen real estate
   - Bottom navigation for primary actions (thumb-friendly)

3. **Touch-Friendly Data Entry**
   - Large number pads for stat entry
   - Swipe to increment/decrement values
   - Voice input option for player names

4. **Gesture Support**
   - Swipe left/right to navigate between games
   - Pull down to refresh
   - Long press for context menus
   - Pinch to zoom on stat tables

### Layout Example (iPad Landscape)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  KBL XHD Tracker                                    [≡ Menu]  [🔔]  [⚙️]   │
├─────────────┬───────────────────────────────────────────────────────────────┤
│             │                                                               │
│  QUICK NAV  │  GAME 24: Giants vs Yankees                                  │
│             │                                                               │
│  [Dashboard]│  ┌─────────────────────────────────────────────────────────┐ │
│  [Schedule] │  │                    CURRENT INNING: 5                    │ │
│  [Teams]    │  │         Giants 4 - 2 Yankees                            │ │
│  [Players]  │  │                                                         │ │
│  [Stats]    │  │  [RECORD PLAY]  [ADD STAT]  [SUBSTITUTION]              │ │
│  [Awards]   │  │                                                         │ │
│             │  └─────────────────────────────────────────────────────────┘ │
│             │                                                               │
│             │  Recent Events:                                               │
│             │  • Barry Bonds: HR (450 ft) - Fame +1                        │
│             │  • Ozzie Smith: Error - Choke +1                             │
│             │                                                               │
├─────────────┴───────────────────────────────────────────────────────────────┤
│  [◀ Prev Game]      [BOX SCORE]      [END GAME]      [Next Game ▶]         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Season Setup Page

### Full Season Setup Flow

```
STEP 1: LEAGUE CONFIGURATION
┌─────────────────────────────────────────────────────────────────────┐
│  NEW SEASON SETUP                                      Step 1 of 5  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Season Name: [KBL Season 3                                    ]    │
│                                                                     │
│  Games Per Team: [40] ▼                                             │
│  Innings Per Game: [9] ▼                                            │
│  DH Rule: [○ NL (no DH)  ● AL (with DH)  ○ Universal DH]           │
│                                                                     │
│  Conference Structure:                                              │
│  [● Single League  ○ Two Conferences  ○ Divisions]                 │
│                                                                     │
│  Playoff Teams: [4] ▼                                               │
│  Playoff Series Length: [Best of 5] ▼                               │
│                                                                     │
│                                           [CANCEL]  [NEXT →]        │
└─────────────────────────────────────────────────────────────────────┘

STEP 2: TEAM SELECTION
┌─────────────────────────────────────────────────────────────────────┐
│  SELECT TEAMS                                          Step 2 of 5  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Available Teams (from database):              Selected (8):        │
│  ┌─────────────────────────────┐              ┌─────────────────┐  │
│  │ □ Beewolves                 │              │ ✓ Giants        │  │
│  │ □ Blowfish                  │      [>>]    │ ✓ Yankees       │  │
│  │ ✓ Buzzards (selected)       │      [>]     │ ✓ Twins         │  │
│  │ □ Crocodons                 │      [<]     │ ✓ Angels        │  │
│  │ □ Freebooters               │      [<<]    │ ✓ Blue Jays     │  │
│  │ ✓ Giants (selected)         │              │ ✓ Mets          │  │
│  │ □ Grapplers                 │              │ ✓ Indians       │  │
│  │ ...                         │              │ ✓ White Sox     │  │
│  └─────────────────────────────┘              └─────────────────┘  │
│                                                                     │
│  [+ CREATE NEW TEAM]                                                │
│                                                                     │
│                                      [← BACK]  [CANCEL]  [NEXT →]   │
└─────────────────────────────────────────────────────────────────────┘

STEP 3: ROSTER CONFIGURATION
┌─────────────────────────────────────────────────────────────────────┐
│  ROSTER SETUP                                          Step 3 of 5  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Do teams already have rosters assigned?                            │
│                                                                     │
│  ● YES - Use existing rosters                                       │
│    Teams will keep their current players                            │
│    [REVIEW ROSTERS]                                                 │
│                                                                     │
│  ○ NO - Conduct Fantasy Draft                                       │
│    Select players from available pool                               │
│    Draft Order: [Snake ▼]  Rounds: [25 ▼]                          │
│                                                                     │
│  ○ PARTIAL - Some teams have rosters                                │
│    Mix of existing rosters and draft picks                          │
│                                                                     │
│  Player Pool: 487 players available                                 │
│  [MANAGE PLAYER POOL]                                               │
│                                                                     │
│                                      [← BACK]  [CANCEL]  [NEXT →]   │
└─────────────────────────────────────────────────────────────────────┘

STEP 4: SCHEDULE GENERATION
┌─────────────────────────────────────────────────────────────────────┐
│  SCHEDULE                                              Step 4 of 5  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Schedule Type:                                                     │
│  ● Auto-Generate (balanced home/away)                               │
│  ○ Import from CSV                                                  │
│  ○ Manual Entry                                                     │
│                                                                     │
│  Auto-Generation Options:                                           │
│  Each team plays: 40 games                                          │
│  vs Each Opponent: [5-6] games (balanced)                           │
│                                                                     │
│  Preview:                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Game 1:  Giants @ Yankees        Game 21: Yankees @ Giants  │   │
│  │ Game 2:  Twins @ Angels          Game 22: Angels @ Twins    │   │
│  │ Game 3:  Blue Jays @ Mets        ...                        │   │
│  │ ...                                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [REGENERATE]  [EDIT SCHEDULE]                                      │
│                                                                     │
│                                      [← BACK]  [CANCEL]  [NEXT →]   │
└─────────────────────────────────────────────────────────────────────┘

STEP 5: CONFIRMATION
┌─────────────────────────────────────────────────────────────────────┐
│  CONFIRM & START SEASON                                Step 5 of 5  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Season Summary:                                                    │
│  ─────────────────────────────────────────────────────────────────  │
│  Name: KBL Season 3                                                 │
│  Teams: 8                                                           │
│  Games: 40 per team (160 total)                                     │
│  Innings: 9 per game                                                │
│  DH Rule: AL (with DH)                                              │
│  Playoffs: Top 4, Best of 5                                         │
│                                                                     │
│  Rosters: Pre-assigned                                              │
│  Total Players: 200                                                 │
│  Rookies: 23                                                        │
│                                                                     │
│  Random Events: 20 scheduled (hidden)                               │
│  All-Star Break: After Game 24 (60%)                                │
│                                                                     │
│  ⚠️ This will create a new season. Previous season data             │
│     will be archived and available in Season History.               │
│                                                                     │
│                              [← BACK]  [CANCEL]  [🚀 START SEASON]  │
└─────────────────────────────────────────────────────────────────────┘
```

### Database Architecture for Multi-Season Support

```javascript
// Core data structure
const appDatabase = {
  // Master data (persists across seasons)
  players: [...],        // All players ever created
  teams: [...],          // All teams ever created
  stadiums: [...],       // All stadiums
  managers: [...],       // All managers

  // Season-specific data
  seasons: [
    {
      id: 'season-3',
      name: 'KBL Season 3',
      status: 'active',  // 'setup', 'active', 'playoffs', 'completed'
      config: {
        gamesPerTeam: 40,
        inningsPerGame: 9,
        dhRule: 'AL',
        // ...
      },
      activeTeams: ['giants', 'yankees', ...],  // References to master teams
      activeRosters: { /* player assignments */ },
      schedule: [...],
      games: [...],
      stats: {...},
    },
    // Previous seasons archived here
  ],
};
```

**Key Points:**
- All players/teams exist in a master database
- Each season "activates" a subset of teams/players
- Inactive players/teams remain available for future seasons
- No need to push updates - just toggle on/off in Season Setup
- Supports expansion/contraction between seasons

---

## 8. Rookie Classification Logic

### The Problem
- Season 1: Everyone has no stats → everyone would be a rookie
- Season 2+: Easy to determine (no prior season stats = rookie)

### Recommended Logic

```javascript
function isRookie(player, currentSeason, allSeasons) {
  // Check if this is the league's first season
  const isFirstSeason = allSeasons.length === 1 ||
    allSeasons.every(s => s.id === currentSeason.id || s.status === 'setup');

  if (isFirstSeason) {
    // FIRST SEASON RULES:
    // 1. Manual override takes precedence
    if (player.rookieOverride !== undefined) {
      return player.rookieOverride;
    }

    // 2. Players under 23 with no imported career stats = rookie
    if (player.age < 23 && !player.hasImportedCareerStats) {
      return true;
    }

    // 3. Default: not a rookie in Season 1 (unless manually set)
    return false;
  }

  // SEASON 2+ RULES:
  // Player is a rookie if they have no stats from any previous season
  const previousSeasons = allSeasons.filter(s =>
    s.id !== currentSeason.id && s.status === 'completed'
  );

  const hasPlayedBefore = previousSeasons.some(season => {
    const playerStats = season.stats.players[player.id];
    return playerStats && (playerStats.gamesPlayed > 0 || playerStats.gamesPitched > 0);
  });

  return !hasPlayedBefore;
}
```

### Season 1 Rookie Setup UI

```
┌─────────────────────────────────────────────────────────────────────┐
│  ROOKIE DESIGNATION - Season 1                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Since this is the league's first season, please designate rookies: │
│                                                                     │
│  Auto-Detection: Players under age 23 with no career stats          │
│  Found: 23 potential rookies                                        │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ ✓ │ Player           │ Age │ Team    │ Reason                │ │
│  ├───┼──────────────────┼─────┼─────────┼───────────────────────┤ │
│  │ ✓ │ Julio Rodriguez  │ 21  │ Giants  │ Age < 23, no stats    │ │
│  │ ✓ │ Gunnar Henderson │ 22  │ Yankees │ Age < 23, no stats    │ │
│  │ □ │ Mike Trout       │ 31  │ Angels  │ Manual override       │ │
│  │ ✓ │ Jackson Holliday │ 20  │ Twins   │ Age < 23, no stats    │ │
│  │ ...                                                           │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  [SELECT ALL U23]  [CLEAR ALL]  [MANUAL ADD]                        │
│                                                                     │
│  Total Rookies: 23                                                  │
│                                                                     │
│                                           [CANCEL]  [CONFIRM]       │
└─────────────────────────────────────────────────────────────────────┘
```

### Summary of Rookie Rules

| Scenario | Rule |
|----------|------|
| **Season 1, Age < 23, No career stats** | Default: Rookie |
| **Season 1, Age ≥ 23** | Default: Not Rookie (can override) |
| **Season 1, Manual override** | Whatever you set |
| **Season 2+, No prior season stats** | Rookie |
| **Season 2+, Has prior season stats** | Not Rookie |

---

## Summary of Features

| Feature | Implementation |
|---------|----------------|
| **Team Page** | Stadium toggle, roster management, mojo/fitness, manager actions |
| **Stadium Changes** | Available anytime from Team Page |
| **Mojo/Fitness** | Adjustable between games on Team Page |
| **Manager Firing** | Available from Team Page, triggers replacement flow |
| **Random Events** | Auto-triggered + manual trigger available |
| **Position Swaps** | In-game without substitution (if SMB4 allows) |
| **iPad UI** | Large touch targets, swipe gestures, responsive layout |
| **Season Setup** | Full wizard: config → teams → rosters/draft → schedule → start |
| **Player Pool** | Master database with toggle on/off for each season |
| **Rookie Rules** | Season 1: Age < 23 default; Season 2+: No prior stats |

---

## Still Need From You

1. **NP/TBF data** from screenshots to calculate accurate SMB Maddux threshold
2. **Confirmation**: Can SMB4 swap defensive positions without substitution?
3. **Preference**: For Season 1 rookies, is "under 23 with no career stats" the right default?
