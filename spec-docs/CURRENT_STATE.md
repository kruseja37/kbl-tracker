# KBL Tracker - Current State

> **Purpose**: Single source of truth for what's implemented, what's not, and known issues
> **Last Updated**: January 22, 2026

---

> ⚠️ **AI SESSION START PROTOCOL**
>
> **BEFORE doing any work**, also read:
> - `AI_OPERATING_PREFERENCES.md` - Core operating principles (NFL, scope discipline, completion protocol, etc.)
> - `SESSION_LOG.md` - What happened in previous sessions
>
> These files contain critical context for how to work on this project.

---

## Project Overview

**What is this?**: A baseball stat-tracking application designed for **Super Mega Baseball 4 (SMB4)**, a video game with unique mechanics. This distinction matters because:
- No catcher interference, balk detection, or umpire judgment calls
- User manually selects all outcomes (the game tells them what happened)
- DH rules and substitutions still apply (user can remove DH)
- Kids league rules do NOT apply

---

## Implementation Status

### Core Features - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| At-bat result tracking | ✅ Complete | 1B, 2B, 3B, HR, BB, IBB, K, GO, FO, LO, PO, DP, SF, SAC, HBP, E, FC, D3K |
| Runner advancement | ✅ Complete | Force play logic, minimum advancement, user selection |
| Out counting | ✅ Complete | Includes DP (adds 2), inning flip at 3 |
| Run scoring | ✅ Complete | Respects 3rd-out-on-force rule |
| RBI calculation | ✅ Complete | Excludes errors, DP, WP, PB, Balk |
| Extra events | ✅ Complete | Steal, CS, WP, PB, Pickoff, Balk |
| Inning management | ✅ Complete | TOP/BOTTOM flip, bases clear, outs reset |
| Undo functionality | ✅ Complete | 10-state stack |
| Activity log | ✅ Complete | Rolling 10-entry display |
| CLUTCH/RISP tags | ✅ Complete | Shows situational indicators |

### Fielding System - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Fielder inference | ✅ Complete | Auto-infers fielder from direction + exit type |
| Fielding modal | ✅ Complete | Confirms fielder, play type, special situations |
| Two-step at-bat flow | ✅ Complete | Basic inputs → Fielding confirmation → Submit |
| Contextual UI | ✅ Complete | Shows toggles only when applicable (IFR, D3K, etc.) |
| Hit fielding attempts | ✅ Complete | "Clean" vs diving/leaping/robbery attempt tracking |

**Key Logic (see FIELDING_SYSTEM_SPEC.md Section 1.1):**
- Outs/Errors: ALWAYS require fielding confirmation
- Hits: Default to "Clean" (no fielding chance), user can select diving/leaping/robbery to indicate attempt
- Fielding chance only recorded when play was attempted

### Substitution System - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Pinch Hitter | ✅ Complete | PinchHitterModal with position assignment |
| Pinch Runner | ✅ Complete | PinchRunnerModal with pitcher responsibility inheritance |
| Defensive Sub | ✅ Complete | DefensiveSubModal supports multiple subs |
| Pitching Change | ✅ Complete | PitchingChangeModal with pitch count, inherited runners |
| Double Switch | ⚠️ Spec only | Not yet implemented |
| Lineup State | ✅ Complete | LineupState tracks current lineup, bench, used players |
| Undo support | ✅ Complete | Lineup state included in undo stack |

### Features - PARTIALLY IMPLEMENTED ⚠️

*None currently*

### Features - NOT IMPLEMENTED ❌

| Feature | Status | Priority |
|---------|--------|----------|
| Data persistence | ❌ None | HIGH - All data lost on refresh |
| Fielding data persistence | ❌ None | HIGH - Fielding data captured but not stored |
| Pitcher stats tracking | ⚠️ Spec complete | MEDIUM - See PITCHER_STATS_TRACKING_SPEC.md |
| Double Switch | ⚠️ Spec only | LOW - Modal not implemented yet |
| Fielding stats aggregation | ❌ None | MEDIUM - PO, A, E, Fld% calculations |
| Multi-game tracking | ❌ None | LOW - Single game only |
| Walk-off detection | ❌ None | LOW - Game doesn't end automatically |
| Box score export | ❌ None | FUTURE |

---

## Known Bugs

*None currently known after testing session*

---

## Test Coverage

- **Unit Tests**: 63/63 passing (testStateMachine.mjs + testIntegration.mjs)
- **UI Tests**: 17 scenarios tested, 16 passing, 1 not implemented (Pinch Hitter)

See `WORST_CASE_SCENARIOS.md` for detailed test results.

---

## File Structure

```
kbl-tracker/
├── src/
│   ├── components/
│   │   └── GameTracker/
│   │       ├── index.tsx          # Main component, state machine
│   │       ├── AtBatButtons.tsx   # Result/event buttons
│   │       ├── AtBatFlow.tsx      # Two-step at-bat flow with fielding
│   │       ├── FieldingModal.tsx  # Fielding confirmation modal
│   │       ├── AtBatModal.tsx     # Result confirmation modal (legacy)
│   │       └── ExtraEventModal.tsx # Event confirmation modal
│   ├── types/
│   │   └── game.ts                # TypeScript types (FieldingData, etc.)
│   └── data/
│       └── mockData.ts            # Sample team/player data
├── tests/
│   ├── testStateMachine.mjs       # 39 unit tests
│   ├── testIntegration.mjs        # 24 integration tests
│   └── fieldingInferenceTests.ts  # 88 fielding inference tests
├── reference-docs/                 # SMB4 Reference Materials
│   ├── BillyYank Super Mega Baseball Guide 3rd Edition.docx  # Full 90+ page guide
│   └── Jester's Super Mega Baseball Reference V2 clean.xlsx  # Stat tracking template
└── spec-docs/
    ├── AI_OPERATING_PREFERENCES.md # ⚠️ READ FIRST - Core operating principles for AI
    ├── KBL_XHD_TRACKER_MASTER_SPEC_v3.md  # ⭐ MASTER SPEC - All systems
    │
    │   ## WAR Calculation Specs
    ├── BWAR_CALCULATION_SPEC.md   # ⭐ Batting WAR (wOBA, wRAA, replacement level)
    ├── FWAR_CALCULATION_SPEC.md   # ⭐ Fielding WAR per-play values + season scaling
    ├── RWAR_CALCULATION_SPEC.md   # ⭐ Baserunning WAR (wSB, UBR, wGDP)
    ├── PWAR_CALCULATION_SPEC.md   # ⭐ Pitching WAR (FIP-based)
    ├── MWAR_CALCULATION_SPEC.md   # ⭐ Manager WAR (decisions + overperformance)
    │
    │   ## In-Game Tracking Specs
    ├── LEVERAGE_INDEX_SPEC.md     # ⭐ Leverage Index calculation
    ├── CLUTCH_ATTRIBUTION_SPEC.md # ⭐ Multi-participant clutch credit distribution
    ├── FIELDING_SYSTEM_SPEC.md    # Fielding UI and inference logic
    ├── RUNNER_ADVANCEMENT_RULES.md # Runner movement, force plays, WP/PB/SB
    ├── INHERITED_RUNNERS_SPEC.md  # ⭐ Inherited runner responsibility tracking
    ├── PITCH_COUNT_TRACKING_SPEC.md # ⭐ Pitch count per-AB and game totals
    ├── PITCHER_STATS_TRACKING_SPEC.md # ⭐ IP, K, BB, W/L/SV, Maddux detection
    ├── SUBSTITUTION_FLOW_SPEC.md  # ⭐ PH/PR/defensive sub/pitching change flows
    │
    │   ## Special Events & Fame
    ├── SPECIAL_EVENTS_SPEC.md     # ⭐ Fame Bonus/Boner events (nut shot, TOOTBLAN, etc.)
    ├── fame_and_events_system.md  # Fame system, All-Star voting, random events
    │
    │   ## SMB4 Reference
    ├── SMB4_GAME_MECHANICS.md     # ⭐ Central SMB4 what IS/ISN'T in game
    ├── SMB4_GAME_REFERENCE.md     # SMB4 game mechanics (Mojo, Chemistry, Traits)
    │
    │   ## Project Management
    ├── CURRENT_STATE.md           # This file
    ├── DECISIONS_LOG.md           # Key decisions with rationale
    ├── REQUIREMENTS.md            # User requirements
    ├── SESSION_LOG.md             # Running session log
    ├── WORST_CASE_SCENARIOS.md    # Test results
    └── STATE_TRANSITION_RULES.md
```

---

## WAR Calculation Implementation Phases

> **Future-proofing note**: This section documents what advanced metrics can be calculated now vs. what requires enhanced tracking. Each spec file has detailed implementation notes.

### Summary Table

| Metric | Component | Status | Notes | Spec Reference |
|--------|-----------|--------|-------|----------------|
| **bWAR** | wOBA | ✅ Ready | All batting events tracked | BWAR_CALCULATION_SPEC.md §3-4 |
| **bWAR** | wRAA | ✅ Ready | Derived from wOBA | BWAR_CALCULATION_SPEC.md §5 |
| **bWAR** | Replacement Level | ✅ Ready | Calibration system included | BWAR_CALCULATION_SPEC.md §6-7 |
| **fWAR** | Basic plays | ✅ Ready | Putouts, assists, errors | FWAR_CALCULATION_SPEC.md §4-6 |
| **fWAR** | Advanced plays | ⚠️ Partial | Need running/sliding/over_shoulder tracking | FIELDING_SYSTEM_SPEC.md |
| **fWAR** | DP role credit | ❌ Later | Schema defined, UI not built | FIELDING_SYSTEM_SPEC.md §1.2 |
| **rWAR** | wSB | ✅ Ready | SB/CS tracked via extra events | RWAR_CALCULATION_SPEC.md §3 |
| **rWAR** | wGDP | ✅ Ready | GIDP tracked as at-bat result | RWAR_CALCULATION_SPEC.md §5 |
| **rWAR** | UBR (basic) | ⚠️ Partial | Speed rating proxy available | RWAR_CALCULATION_SPEC.md §8 |
| **rWAR** | UBR (full) | ❌ Later | Needs runner advancement tracking | RWAR_CALCULATION_SPEC.md §8 |
| **pWAR** | FIP | ✅ Ready | K, BB, HBP, HR all tracked | PWAR_CALCULATION_SPEC.md §3 |
| **pWAR** | Basic pWAR | ✅ Ready | Using simplified RPW | PWAR_CALCULATION_SPEC.md §8 |
| **pWAR** | Starter/Reliever split | ✅ Ready | GS and G tracked | PWAR_CALCULATION_SPEC.md §6 |
| **pWAR** | Leverage adjustment | ✅ Ready | Full LI calculation now available | LEVERAGE_INDEX_SPEC.md §4-6 |
| **pWAR** | Park adjustment | ❌ Later | Requires park factor data | PWAR_CALCULATION_SPEC.md §11 |
| **Clutch** | Leverage Index | ✅ Ready | All game state data tracked | LEVERAGE_INDEX_SPEC.md §3-4 |
| **Clutch** | LI-weighted clutch/choke | ✅ Ready | Replaces binary "close game" | CLUTCH_ATTRIBUTION_SPEC.md §4 |
| **Clutch** | Multi-participant attribution | ✅ Ready | Credit to all players on play | CLUTCH_ATTRIBUTION_SPEC.md §4-5 |
| **Clutch** | Contact Quality | ✅ Ready | Inferred from trajectory | CLUTCH_ATTRIBUTION_SPEC.md §3 |
| **Clutch** | Net Clutch Rating | ✅ Ready | Feeds All-Star/Award voting | CLUTCH_ATTRIBUTION_SPEC.md §9 |
| **mWAR** | Decision tracking | ✅ Ready | Auto-inferred + user-prompted | MWAR_CALCULATION_SPEC.md §3-4 |
| **mWAR** | Decision evaluation | ✅ Ready | LI-weighted outcomes | MWAR_CALCULATION_SPEC.md §5 |
| **mWAR** | Team overperformance | ✅ Ready | Wins vs salary expectation | MWAR_CALCULATION_SPEC.md §6 |

### Phase 1 (Calculate Now)
These metrics can be implemented with current tracking:
- **Full bWAR**: wOBA, wRAA, replacement level adjustment
- **Basic fWAR**: Per-play credits for putouts, assists, errors, DPs
- **Partial rWAR**: wSB (stolen bases) + wGDP (double play avoidance)
- **Full pWAR**: FIP, starter/reliever split, real LI-based leverage multiplier
- **Full Clutch System**: LI calculation, multi-participant attribution, contact quality, Net Clutch Rating
- **Full mWAR**: Manager decision tracking (auto-inferred), LI-weighted evaluation, team overperformance

### Phase 2 (Requires Enhanced Tracking)
These need additional UI/schema work:
- **Full fWAR**: DP role tracking (started/turned/completed), new play types
- **Full rWAR (UBR)**: Runner advancement opportunities, extra bases taken, thrown out advancing
- **Park factors**: For pWAR park adjustment
- **Full mWAR prompts**: User-prompted steal/bunt/squeeze calls (currently defaults to player autonomy)

### Schema Additions Defined But Not Implemented
See FIELDING_SYSTEM_SPEC.md and RWAR_CALCULATION_SPEC.md for ready-to-implement schemas:
- `dpRole`: 'started' | 'turned' | 'completed' | 'unassisted'
- `RunnerAdvancement`: advancementType, couldHaveAdvanced, wasThrown
- Enhanced play types: running, sliding, over_shoulder

---

## Key Code Locations

| Logic | File | Line(s) | Notes |
|-------|------|---------|-------|
| Force play calculation | index.tsx | ~150-180 | `getMinimumBase()` function |
| Out counting | index.tsx | ~280-320 | DP adds 2, runner outs add 1 |
| RBI calculation | index.tsx | ~250-280 | Modal pre-calculates, user can adjust |
| Inning flip | index.tsx | ~320-350 | Clears bases, resets outs |
| Extra events | index.tsx | ~400-450 | `handleExtraEvent()` |
| Undo | index.tsx | ~100-130 | 10-state stack |
| **Fielding chance logic** | AtBatFlow.tsx | ~315-326 | `needsFieldingConfirmation` calculation |
| **Fielder inference** | FieldingModal.tsx | ~59-98 | Direction + exit type → fielder matrices |
| **Hit fielding attempt** | AtBatFlow.tsx | ~766-798 | "Clean" vs diving/leaping/robbery UI |
| **FieldingData type** | types/game.ts | ~18-50 | Complete fielding data interface |

---

*This document should be updated whenever implementation status changes.*
