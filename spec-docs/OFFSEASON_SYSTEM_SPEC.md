# KBL XHD Tracker - Comprehensive Offseason System Spec (v3)

> **Purpose**: Single source of truth for ALL offseason processes
> **Supersedes**: OFFSEASON_SYSTEM_SPEC v2 (awards-only version)
> **Created**: January 23, 2026
> **Integrates**: Personality System, Farm System, Expansion Draft, FA Destinations, Chemistry Alignment, Triple Salary Recalculation

---

## Table of Contents

1. [Offseason Phase Overview](#1-offseason-phase-overview)
2. [User Interaction Model](#2-user-interaction-model)
3. [Phase 1: Season End Processing](#3-phase-1-season-end-processing)
4. [Phase 2: Awards Ceremony](#4-phase-2-awards-ceremony)
5. [Phase 3: Salary Recalculation #1](#5-phase-3-salary-recalculation-1)
6. [Phase 4: Expansion (Optional)](#6-phase-4-expansion-optional)
7. [Phase 5: Retirements](#7-phase-5-retirements)
8. [Phase 6: Free Agency](#8-phase-6-free-agency)
9. [Phase 7: Draft](#9-phase-7-draft)
10. [Phase 8: Salary Recalculation #2](#10-phase-8-salary-recalculation-2)
11. [Phase 9: Offseason Trades](#11-phase-9-offseason-trades)
12. [Phase 10: Salary Recalculation #3](#12-phase-10-salary-recalculation-3)
13. [Phase 11: Finalize & Advance](#13-phase-11-finalize--advance)
14. [Hidden Personality System](#14-hidden-personality-system)
15. [Morale System](#15-morale-system)
16. [Hall of Fame Museum](#16-hall-of-fame-museum)
17. [Data Models](#17-data-models)

---

## 1. Offseason Phase Overview

> **UPDATED February 2026**: Contraction REMOVED from v1. Expansion kept as standalone optional feature. Salary recalculates THREE times during offseason (Phases 3, 8, 10). Phase 11 Finalize & Advance includes cut-down signing round with claim priority by reverse expected roster WAR (total salary).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OFFSEASON PHASE SEQUENCE (11 PHASES)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1 ──► PHASE 2 ──► PHASE 3 ──► PHASE 4 ──► PHASE 5 ──► PHASE 6       │
│  Season      Awards      Salary       Expansion    Retirements   Free       │
│  End         Ceremony    Recalc #1    (optional)                 Agency     │
│                                                                              │
│  PHASE 7 ──► PHASE 8 ──► PHASE 9 ──► PHASE 10 ──► PHASE 11                 │
│  Draft       Salary      Offseason    Salary       Finalize &               │
│              Recalc #2   Trades       Recalc #3    Advance                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Changes from Previous Version
- **Phase 3**: Now "Salary Recalculation #1" (was "True Value Recalibration")
- **Phase 4**: Now "Expansion" optional (was "Contraction/Expansion"). Contraction removed entirely
- **Phase 8**: Now "Salary Recalculation #2" (was "Farm System Reconciliation")
- **Phase 9**: Now "Offseason Trades" (was "Chemistry Rebalancing")
- **Phase 10**: Now "Salary Recalculation #3" (new)
- **Phase 11**: Now "Finalize & Advance" with cut-down deadline, signing round, and roster lock

### Roster Requirements

| Level | Size During Season | Size at Phase 11 Finalize |
|-------|-------------------|--------------------------|
| MLB Roster | 22 players | 22 players |
| Farm Roster | **Unlimited** | 10 players |
| **Total at Finalize** | — | **32 players** |

> **Note**: Farm roster is UNLIMITED during the regular season. The 22 MLB / 10 Farm constraint is only enforced at the Phase 11 Finalize & Advance cut-down deadline.

---

## 2. User Interaction Model

> **Design Philosophy**: The offseason is designed as a "game night" experience, especially for 2+ player sessions. High-stakes moments use interactive ceremonies (dice rolls, wheel spins, card reveals) while bulk processing uses streamlined summaries with user advancement.

### 2.1 Interaction Types

| Type | Description | User Action | Example |
|------|-------------|-------------|---------|
| 🎲 **DICE ROLL** | Probability-based outcome | User clicks to roll | FA departure, retirement saves |
| 🎰 **WHEEL SPIN** | Random selection from pool | User clicks to spin | Trait lottery, draft lottery |
| 🃏 **CARD REVEAL** | Dramatic single reveal | User clicks to flip | FA destination, award winner |
| 🏆 **CEREMONY** | Multi-step celebration | User advances through stages | Jersey retirement, HOF induction |
| 📋 **SELECTION** | User chooses from options | User picks option | Protected players, draft picks |
| ✅ **CONFIRMATION** | Approve and advance | User clicks continue | Phase transitions, bulk summaries |
| 👁️ **REVIEW** | View details (optional) | User expands/collapses | Player details, stat breakdowns |

### 2.2 Interaction Map by Phase

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OFFSEASON INTERACTION MAP                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1: SEASON END                                                         │
│  ├─ Final Standings ..................... ✅ Confirmation                   │
│  ├─ Postseason MVP (if applicable) ...... 🃏 Card Reveal → 📋 Selection     │
│  └─ Championship Processing ............. ✅ Confirmation                   │
│                                                                              │
│  PHASE 2: AWARDS CEREMONY                                                    │
│  ├─ League Leaders (auto) ............... ✅ Confirmation (batch)           │
│  ├─ Gold Gloves (×9) .................... 🃏 Card Reveal → 📋 Selection     │
│  ├─ Platinum Glove ...................... 🃏 Card Reveal                    │
│  ├─ Booger Glove ........................ 🃏 Card Reveal                    │
│  ├─ Silver Sluggers (×9) ................ 🃏 Card Reveal → 📋 Selection     │
│  ├─ Reliever of Year (×2) ............... 🃏 Card Reveal → 📋 Selection     │
│  ├─ Bench Player of Year ................ 🃏 Card Reveal → 📋 Selection     │
│  ├─ Rookie of Year (×2) ................. 🃏 Card Reveal → 📋 Selection     │
│  ├─ Cy Young (×2) ....................... 🃏 Card Reveal → 📋 Selection     │
│  ├─ MVP (×2) ............................ 🃏 Card Reveal → 📋 Selection     │
│  ├─ Manager of the Year (×2) ............ 🃏 Card Reveal                    │
│  ├─ Kara Kawaguchi Award ................ 🃏 Card Reveal                    │
│  ├─ Bust of the Year .................... 🃏 Card Reveal                    │
│  ├─ Comeback Player ..................... 🃏 Card Reveal                    │
│  └─ Trait Assignments ................... 🎰 Wheel Spin (per recipient)     │
│                                                                              │
│  PHASE 3: RATINGS ADJUSTMENT                                                 │
│  └─ Salary Adjustments .................. ✅ Confirmation (summary table)   │
│                                                                              │
│  PHASE 4: EXPANSION (OPTIONAL)                                               │
│  ├─ Add Expansion Team? ................. 📋 Selection (optional)           │
│  └─ If Yes:                                                                  │
│      ├─ Name/Configure New Team ......... 📋 Selection                      │
│      ├─ Per Existing Team: Protect N .... 📋 Selection                      │
│      └─ Expansion Draft ................. 📋 Selection (pick from pool)     │
│                                                                              │
│  PHASE 5: RETIREMENTS                                                        │
│  ├─ Per Team:                                                                │
│  │   ├─ Show Roster Probabilities ....... 👁️ Review (by age)               │
│  │   ├─ Reveal Retirement #1 ............ 🎲 BUTTON PUSH                    │
│  │   ├─ Update Probabilities ............ 👁️ Review (auto-update)          │
│  │   └─ Reveal Retirement #2 ............ 🎲 BUTTON PUSH (optional)         │
│  ├─ Per Retiree:                                                             │
│  │   └─ Jersey Retirement ............... 📋 Selection (per team played)    │
│  └─ Retirement Summary .................. ✅ Confirmation                   │
│                                                                              │
│  PHASE 6: FREE AGENCY                                                        │
│  ├─ Round 1:                                                                 │
│  │   ├─ Per Team: Select Protected ...... 📋 Selection (1 player)           │
│  │   ├─ Per Team: Show Dice Assignments . 👁️ Review (top 11 players)       │
│  │   ├─ Per Team: Roll Departure ........ 🎲 DICE ROLL (2-12)               │
│  │   ├─ Per Departing: Personality Dest . 🃏 Card Reveal (auto-resolved)    │
│  │   └─ Per Move: Return Player ......... 📋 Selection (grade rules)        │
│  ├─ Round 2: (same as Round 1)                                               │
│  └─ FA Summary .......................... ✅ Confirmation                   │
│                                                                              │
│  PHASE 7: DRAFT                                                              │
│  ├─ Add from Inactive DB? ............... 📋 Selection (optional)           │
│  ├─ Generate Draft Class ................ ✅ Confirmation (auto)            │
│  ├─ Draft Order (by avg expected WAR) ... 👁️ Review                        │
│  └─ Per Pick:                                                                │
│      ├─ Available Prospects ............. 👁️ Review                        │
│      ├─ Selection ....................... 📋 Selection                      │
│      └─ Release Player (if full) ........ 📋 Selection (same grade or worse)│
│                                                                              │
│  PHASE 8: SALARY RECALCULATION #2                                           │
│  └─ Post-Draft Salary Adjustments ....... ✅ Confirmation (summary table)   │
│                                                                              │
│  PHASE 9: OFFSEASON TRADES                                                  │
│  ├─ View Trade Market ................... 👁️ Review                        │
│  ├─ Propose Trades ...................... 📋 Selection (optional)           │
│  ├─ Review AI Trade Proposals ........... 📋 Selection (accept/reject)      │
│  └─ Trade Summary ....................... ✅ Confirmation                   │
│                                                                              │
│  PHASE 10: SALARY RECALCULATION #3                                          │
│  └─ Post-Trade Salary Adjustments ....... ✅ Confirmation (summary table)   │
│                                                                              │
│  PHASE 11: FINALIZE & ADVANCE                                               │
│  ├─ Cut-Down Deadline ................... ✅ Confirmation (all teams → 22/10)│
│  ├─ Released Players Pool ............... 👁️ Review                        │
│  ├─ Signing Round ....................... 📋 Selection (reverse exp. WAR)   │
│  │   └─ Each team (worst WAR first) picks ONE from pool                     │
│  ├─ Cut-and-Sign Round .................. 📋 Selection (optional per team)  │
│  │   └─ Cut ONE, sign ONE from newly released                               │
│  ├─ Final Roster Validation ............. ✅ Confirmation (all at 22/10)    │
│  ├─ Archive Season ...................... ✅ Confirmation (auto)            │
│  └─ Launch New Season! .................. ✅ Confirmation                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 High-Stakes Ceremonies

These moments get full dramatic treatment with animations, sound effects, and suspense:

| Moment | Ceremony Type | Stakes | Animation |
|--------|---------------|--------|-----------|
| **MVP Announcement** | 🃏 Card Reveal | League's best | Envelope open, card flip, confetti |
| **Cy Young Announcement** | 🃏 Card Reveal | Pitching crown | Same as MVP |
| **Trait Lottery** | 🎰 Wheel Spin | Player upgrade | Slot machine style, trait icons spinning |
| **Retirement Reveal** | 🎲 Button Push | Career end | Button glow, roster scan, player highlight |
| **FA Dice Roll** | 🎲 Two Dice | Who leaves? | Dice tumble, dramatic pause, player highlight |
| **FA Personality Destination** | 🃏 Card Reveal | Where do they go? | Team logo reveal, "Welcome to..." |
| **Jersey Retirement** | 🏆 Ceremony | Legacy honor | Jersey rising to rafters, number spotlight |
| **HOF Induction** | 🏆 Ceremony | Legacy honor | Plaque unveiling |
| **Draft Pick** | 📋 Selection | Future star | Prospect card, stats reveal |
| **Expansion Draft** | 📋 Selection | Building a team | Protection rounds, pick ceremony |

### 2.4 Ceremony UI Examples

#### Dice Roll Ceremony (Free Agency Departure)
```
╔══════════════════════════════════════════════════════════════╗
║                   🎲 FREE AGENCY DEPARTURE 🎲                 ║
║                   New York Thunder                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Protected: Mike Trout (CF, B+)                              ║
║  11 players assigned dice values (2-12)                      ║
║                                                               ║
║         ┌─────┐    ┌─────┐                                   ║
║         │ 🎲  │    │ 🎲  │                                   ║
║         └─────┘    └─────┘                                   ║
║                                                               ║
║              [ 🎲 ROLL DICE 🎲 ]                               ║
║                                                               ║
║  (Click to roll - Result is final, no re-rolls)              ║
╚══════════════════════════════════════════════════════════════╝
```

#### Post-Roll Result (Star Departs)
```
╔══════════════════════════════════════════════════════════════╗
║                   🎲 FREE AGENCY RESULT 🎲                    ║
║                   New York Thunder                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║                    ┌─────────────┐                            ║
║                    │   3 + 4     │                            ║
║                    │   = 7       │                            ║
║                    └─────────────┘                            ║
║                                                               ║
║       💔 Barry Bonds (A+, LF) is leaving!                    ║
║       Personality: COMPETITIVE → Goes to rival                ║
║                                                               ║
║                  [Reveal Destination]                         ║
╚══════════════════════════════════════════════════════════════╝
```

#### Wheel Spin Ceremony (Trait Lottery)
```
╔══════════════════════════════════════════════════════════════╗
║                   🎰 TRAIT LOTTERY 🎰                         ║
╠══════════════════════════════════════════════════════════════╣
║  Award: AL MVP                                                ║
║  Winner: Babe Ruth                                            ║
║  Pool: Positive Traits (Chemistry-Weighted)                   ║
║                                                               ║
║           ┌─────────────────────────────────┐                ║
║           │                                 │                ║
║           │   ← Clutch | RBI Hero | →      │                ║
║           │     Tough Out | Power Surge    │                ║
║           │   ← Contact Pro | Speedster →  │                ║
║           │                                 │                ║
║           │         ▼ ▼ ▼ ▼ ▼              │                ║
║           │                                 │                ║
║           │      [ 🎰 SPIN! 🎰 ]            │                ║
║           │                                 │                ║
║           └─────────────────────────────────┘                ║
║                                                               ║
║  Re-rolls remaining: 1                                        ║
╚══════════════════════════════════════════════════════════════╝
```

#### Card Reveal Ceremony (FA Destination)
```
╔══════════════════════════════════════════════════════════════╗
║                   🃏 FREE AGENT DESTINATION 🃏                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Player: Ken Griffey Jr.                                      ║
║  Position: CF | Grade: A+ | True Value: $18.5M               ║
║                                                               ║
║           ┌─────────────────────────────────┐                ║
║           │                                 │                ║
║           │             🃏                  │                ║
║           │                                 │                ║
║           │    WHERE WILL GRIFFEY GO?       │                ║
║           │                                 │                ║
║           └─────────────────────────────────┘                ║
║                                                               ║
║              [ 🃏 REVEAL DESTINATION 🃏 ]                     ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

#### Post-Reveal (FA Destination)
```
╔══════════════════════════════════════════════════════════════╗
║                   🃏 FREE AGENT DESTINATION 🃏                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Player: Ken Griffey Jr.                                      ║
║                                                               ║
║           ┌─────────────────────────────────┐                ║
║           │                                 │                ║
║           │         🏟️ CONTENDER 🏟️         │                ║
║           │                                 │                ║
║           │     Griffey wants to WIN!       │                ║
║           │                                 │                ║
║           └─────────────────────────────────┘                ║
║                                                               ║
║  Eligible Contenders:                                         ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ ○ New York Thunder (92-70) - $2.1M cap space           │  ║
║  │ ○ Boston Legends (89-73) - $4.8M cap space             │  ║
║  │ ○ Chicago Fire (88-74) - $12.3M cap space              │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║        [ 🎲 Roll for Final Team (weighted by fit) ]          ║
╚══════════════════════════════════════════════════════════════╝
```

#### Jersey Retirement Ceremony
```
╔══════════════════════════════════════════════════════════════╗
║                 🏆 JERSEY RETIREMENT 🏆                       ║
║                   New York Thunder                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Retiring: Derek Jeter                                        ║
║  Position: SS | Seasons with Team: 14                         ║
║                                                               ║
║           ┌─────────────────────────────────┐                ║
║           │                                 │                ║
║           │            ┌───┐                │                ║
║           │            │ 2 │                │                ║
║           │            └───┘                │                ║
║           │                                 │                ║
║           │      JETER                      │                ║
║           │                                 │                ║
║           └─────────────────────────────────┘                ║
║                                                               ║
║  Career Highlights with Thunder:                              ║
║  • 5× All-Star | 3× Gold Glove | 1× MVP                      ║
║  • .312 AVG | 2,456 Hits | 42.8 WAR                          ║
║  • 2 Championships                                            ║
║                                                               ║
║         [ 🏆 Raise Jersey to the Rafters 🏆 ]                ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

#### Hall of Fame Induction Ceremony
```
╔══════════════════════════════════════════════════════════════╗
║              🏛️ HALL OF FAME INDUCTION 🏛️                    ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║                    CLASS OF 2024                              ║
║                                                               ║
║           ┌─────────────────────────────────┐                ║
║           │                                 │                ║
║           │         ┌─────────┐             │                ║
║           │         │  🏛️ HOF │             │                ║
║           │         │  PLAQUE │             │                ║
║           │         └─────────┘             │                ║
║           │                                 │                ║
║           └─────────────────────────────────┘                ║
║                                                               ║
║  Inductee: Ken Griffey Jr.                                    ║
║  Primary Team: Seattle Mariners                               ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ Path: Per-Season Excellence                             │  ║
║  │ • 12 Seasons | Avg WAR: 6.2 (Top 10%: 5.8)             │  ║
║  │ • 10× All-Star | 7× Gold Glove | 1× MVP                │  ║
║  │ • 524 HR | .296 AVG | 68.4 Career WAR                  │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║           [ 🏛️ Unveil Hall of Fame Plaque 🏛️ ]              ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

### 2.5 Streamlined Mode (Optional Setting)

For solo play or faster sessions, users can enable **Streamlined Mode**:

| Setting | Game Night (Default) | Streamlined |
|---------|---------------------|-------------|
| Award reveals | One-by-one card flips | Batch summary |
| Trait spins | Individual wheel spins | Auto-assign with summary |
| FA rounds 15-32 | Individual reveals | Batch processing |
| Retirement rolls | Per-player dice | Batch with highlights |
| Confirmations | Every phase | Major phases only |

```
╔══════════════════════════════════════════════════════════════╗
║                   ⚙️ OFFSEASON SETTINGS                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Interaction Mode:                                            ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ ● Game Night (Full ceremonies, perfect for groups)     │  ║
║  │ ○ Streamlined (Faster, batched processing)             │  ║
║  │ ○ Custom (Choose which ceremonies to keep)             │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  Always Keep Interactive (even in Streamlined):              ║
║  ☑ Expansion Draft (if triggered)                            ║
║  ☑ Draft Lottery                                             ║
║  ☑ MVP/Cy Young Announcements                                ║
║  ☑ Jersey Retirement Ceremonies                              ║
║  ☑ Hall of Fame Inductions                                   ║
║  ☑ Phase 11 Signing Round                                    ║
║  ☐ All Award Card Reveals                                    ║
║  ☐ All Trait Wheel Spins                                     ║
║  ☐ All FA Destination Reveals                                ║
║                                                               ║
║                    [Save Settings]                            ║
╚══════════════════════════════════════════════════════════════╝
```

### 2.6 Multiplayer Considerations

For 2+ player sessions:

| Feature | Implementation |
|---------|----------------|
| **Turn Order** | Rotate who clicks for dice/wheel/reveals |
| **Dramatic Reveals** | Build suspense before showing result |
| **Reaction Time** | Pause after major results for discussion |
| **Shared Screen** | All UI designed for group viewing |
| **Sound Effects** | Optional audio cues for ceremonies |

---

## 3. Phase 1: Season End Processing

### 3.1 Final Standings Calculation

- Record final W-L records
- Calculate playoff seeds
- Determine division winners
- Set wildcard slots

### 3.2 Postseason MVP (if applicable)

If postseason occurred:
- Calculate postseason-specific WAR
- Present top 3 candidates
- Winner receives: **+10 rating points** (max 5 to any single category)

### 3.3 Championship Processing

- Record champion
- Update player `Champion` count
- Champion bonus: All players on winning team receive **+1 Fame Bonus**

### 3.4 Mojo Reset

All players reset to **Normal** mojo state for next season.

---

## 4. Phase 2: Awards Ceremony

### 4.1 Award Processing Order

| Step | Award | Selection Method |
|------|-------|------------------|
| 1 | League Leaders | Auto-calculated |
| 2 | Gold Gloves (9 positions) | Hybrid voting |
| 3 | Platinum Glove | From GG winners |
| 4 | Booger Glove | Worst fielding |
| 5 | Silver Sluggers | Hybrid voting |
| 6 | Reliever of the Year (AL/NL) | Hybrid voting |
| 7 | Bench Player of the Year | Hybrid voting |
| 8 | Rookie of the Year (AL/NL) | Hybrid voting |
| 9 | Cy Young (AL/NL) | Hybrid voting |
| 10 | MVP (AL/NL) | Hybrid voting |
| 11 | Manager of the Year (AL/NL) | mWAR-based |
| 12 | Kara Kawaguchi Award | Special criteria |
| 13 | Bust of the Year | Underperformance |
| 14 | Comeback Player of the Year | Special criteria |

### 4.2 Hybrid Voting System

```
╔══════════════════════════════════════════════════════════════════╗
║                    MVP VOTING - AL                                ║
╠══════════════════════════════════════════════════════════════════╣
║  System Recommendation based on:                                  ║
║  • WAR (40%) • Clutch (25%) • Traditional (15%)                  ║
║  • Team Success (12%) • Fame (8%)                                 ║
║                                                                   ║
║  ┌────────────────────────────────────────────────────────────┐  ║
║  │ RANK │ PLAYER           │ SCORE │ WAR  │ CLUTCH │ FAME     │  ║
║  ├──────┼──────────────────┼───────┼──────┼────────┼──────────┤  ║
║  │  1   │ ★ Babe Ruth      │ 94.2  │ 5.8  │ +38    │ +12      │  ║
║  │  2   │ Lou Gehrig       │ 89.7  │ 5.4  │ +32    │  +8      │  ║
║  │  3   │ Ted Williams     │ 85.3  │ 5.1  │ +28    │  +6      │  ║
║  └────────────────────────────────────────────────────────────┘  ║
║                                                                   ║
║  ★ = System Recommendation                                        ║
║                                                                   ║
║  [Confirm #1]  [Select #2]  [Select #3]  [Other Player...]       ║
╚══════════════════════════════════════════════════════════════════╝
```

### 4.3 Award Criteria

#### MVP (Position Players)
| Component | Weight | Source |
|-----------|--------|--------|
| WAR | 40% | bWAR + rWAR + fWAR |
| Clutch | 25% | Net Clutch / Opportunities |
| Traditional | 15% | AVG, HR, RBI, SB, OPS |
| Team Success | 12% | Win percentage |
| Fame | 8% | Net Fame + Milestones |

#### Cy Young (Pitchers)
| Component | Weight | Source |
|-----------|--------|--------|
| pWAR | 40% | Pitching WAR |
| Advanced | 25% | Inverse FIP + TrueERA |
| Clutch | 25% | Pitching clutch rating |
| Team | 5% | Win percentage |
| Fame | 5% | Net Fame + Milestones |

**Note**: No traditional stats (W, ERA) per design.

#### Gold Glove
| Component | Weight | Source |
|-----------|--------|--------|
| fWAR | 55% | Fielding WAR |
| Clutch Plays | 25% | Raw fielding clutch count |
| Eye Test | 20% | Fame + User adjustment (-5 to +5) |

### 4.4 Trait/Reward Assignments

| Award | Reward |
|-------|--------|
| MVP Winner | Random positive trait (chemistry-weighted) |
| MVP Runner-up | Random trait |
| MVP 3rd Place | Random trait |
| Cy Young Winner | Random positive pitching trait |
| Cy Young Runner-up | Random trait |
| AL/NL Reliever of Year | **Clutch** trait (guaranteed) |
| Bench Player of Year | **Pinch Perfect** trait |
| Rookie of the Year | Random trait |
| Kara Kawaguchi | **Tough Out** + Random positive |
| Bust of the Year | **Choker** trait (negative) |
| Gold Glove | +5 Fielding |
| Platinum Glove | +5 Fielding (additional) |
| **Booger Glove** | **Butter Fingers** trait OR lose positive trait (see below) |
| Postseason MVP | +10 rating points (max 5 per category) |

#### Booger Glove Effect

The Booger Glove is the "worst fielder" award (opposite of Gold Glove). The winner suffers a penalty:

1. **If player has < 2 traits**: Gains **Butter Fingers** trait (negative fielding trait)
2. **If player already has 2 traits**: Loses their "most positive" trait (user chooses if tie)

```
╔══════════════════════════════════════════════════════════════╗
║                   🧤 BOOGER GLOVE AWARD 🧤                    ║
╠══════════════════════════════════════════════════════════════╣
║  Winner: Sluggo McBricks (lowest qualifying fWAR)            ║
║  fWAR: -1.8 | Errors: 23                                     ║
║                                                               ║
║  "The glove that dreams forgot..."                           ║
║                                                               ║
║  Current Traits:                                              ║
║    1. RBI Hero (Spirited)                                    ║
║    2. Power Surge (Aggressive)                               ║
║                                                               ║
║  PENALTY: Must lose one positive trait!                      ║
║                                                               ║
║  [Lose RBI Hero]  [Lose Power Surge]                         ║
╚══════════════════════════════════════════════════════════════╝
```

**Selection Criteria**: Lowest qualifying fWAR at any position (minimum 50% games at position)

### 4.5 League Leader Rewards

| Leader | Reward |
|--------|--------|
| AVG (AL/NL) | +5 Contact |
| HR Leader | +5 Power |
| RBI (AL/NL) | +3 Contact, +3 Power |
| ERA (AL/NL) | +5 to ACC, JNK, or VEL (user choice) |
| K Leader (AL/NL) | +5 to JNK or VEL (user choice) |
| Most Hitting K's | **Whiffer** trait |
| Most BB's (Hitter) | +5 Speed |
| Highest Net SB% | **Stealer** trait OR +5 Speed |
| Most Saves | **Clutch** trait |
| Most BB Ratio (BB/9) | **BB Prone** trait |
| Best Hitting Pitcher | +15 Power, +15 Contact |

### 4.6 Trait Replacement (Max 2 Traits)

When a player with 2 traits earns a new trait:

```
╔══════════════════════════════════════════════════════════════╗
║                   TRAIT REPLACEMENT                           ║
╠══════════════════════════════════════════════════════════════╣
║  Player: Mike Trout                                           ║
║  Award: All-Star Selection                                    ║
║                                                               ║
║  Current Traits:                                              ║
║    1. RBI Hero (Spirited) - Bonus with RISP                  ║
║    2. Tough Out (Competitive) - +CON on 2-strike             ║
║                                                               ║
║  New Trait: ★ Clutch (Spirited) ★                            ║
║                                                               ║
║  [Replace RBI Hero]  [Replace Tough Out]  [Decline New]      ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 5. Phase 3: Salary Recalculation #1

> **Triple Salary Recalculation**: Salary recalculates at Phases 3, 8, and 10 to reflect roster changes made during the offseason. This ensures salaries are always current as teams reshape their rosters.

### 5.1 Dynamic Salary Philosophy

- **True Value**: Floats based on actual WAR performance
- **Contract Salary**: Fixed during season
- **Ratings Adj**: EOS adjusts player salaries to match True Value (50% of difference)

### 5.2 True Value Calculation

```typescript
function calculateTrueValue(player: Player, seasonStats: SeasonStats): number {
  const baseWAR = seasonStats.totalWAR;
  const clutchBonus = seasonStats.clutchRating * 0.1;  // +10% per clutch point
  const fameBonus = seasonStats.netFame * 50000;       // $50K per fame point

  // WAR to salary conversion (rough: $8M per WAR)
  const rawValue = (baseWAR + clutchBonus) * 8_000_000 + fameBonus;

  // Apply grade modifiers
  return applyGradeModifier(rawValue, player.grade);
}
```

### 5.3 EOS Contract Adjustment

```typescript
function recalibrateContract(player: Player, trueValue: number): ContractUpdate {
  const currentSalary = player.contractSalary;
  const difference = trueValue - currentSalary;

  // Gradual adjustment (50% of difference)
  const adjustment = difference * 0.5;
  const newSalary = currentSalary + adjustment;

  return {
    previousSalary: currentSalary,
    newSalary: newSalary,
    trueValue: trueValue,
    adjustmentReason: difference > 0 ? 'OVERPERFORMED' : 'UNDERPERFORMED'
  };
}
```

### 5.4 Salary Floor/Ceiling

| Grade | Min Salary | Max Salary |
|-------|------------|------------|
| S | $12M | $30M |
| A | $8M | $20M |
| B | $4M | $12M |
| C | $1.5M | $7M |
| D | $500K | $4M |

---

## 6. Phase 4: Expansion (Optional)

> **Note**: Contraction has been REMOVED from v1. It is on the Feature Wishlist for potential v2 implementation. Phase 4 is now exclusively for optional league expansion.

### 6.1 Expansion Trigger

Expansion is purely user-initiated. At Phase 4, the user is asked:

```
╔══════════════════════════════════════════════════════════════╗
║                  PHASE 4: EXPANSION                           ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Would you like to add an expansion team?                    ║
║                                                               ║
║  Current league size: 12 teams                                ║
║                                                               ║
║  [Add Expansion Team]    [Skip Phase]                        ║
╚══════════════════════════════════════════════════════════════╝
```

If skipped, Phase 4 completes instantly with no changes.

### 6.2 Expansion Team Configuration

If user adds a team:
1. Team name, abbreviation, stadium selection
2. Team colors (primary, secondary)
3. Manager assignment

### 6.2b Stadium Change for Existing Teams

Any existing team may change their stadium during Phase 4. This is optional and can be skipped.

**Access**: Phase 4 menu shows a "Change Stadium" option for each existing team alongside the expansion team option.

**Rules**:
- Any team can change their stadium at most once per offseason
- Park factors reset to the new stadium's seed values when a change occurs (observed park factor history is discarded)
- Fan morale takes a one-time -5 hit (fans miss the old ballpark) — applied at season start
- The park factor blend ratio resets: new stadium starts at the configured blend ratio for Season 1

```typescript
interface StadiumChangeEvent {
  teamId: string;
  previousStadiumId: string;
  newStadiumId: string;
  offseasonYear: number;
}

function applyStadiumChange(team: Team, newStadium: Stadium): void {
  team.stadiumId = newStadium.id;
  team.parkFactors = newStadium.seedParkFactors;  // Reset to seed values
  team.parkFactorHistory = [];                     // Clear observed history
  team.pendingFanMoralePenalty = -5;              // Applied at season start
}
```

### 6.3 Expansion Draft Protection

Each existing team protects N players (configurable, default: 15):

```typescript
interface ExpansionDraftConfig {
  protectedPlayersPerTeam: number;  // Default: 15
  maxPicksFromAnyTeam: number;      // Default: 2
  totalExpansionPicks: number;      // Default: 22 (full MLB roster)
  farmPicksFromDraft: number;       // Expansion team gets extra draft picks
}
```

### 6.4 Expansion Draft Ceremony

```
╔══════════════════════════════════════════════════════════════╗
║                  🏗️ EXPANSION DRAFT 🏗️                       ║
║              Welcome: Portland Pioneers                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Protection Phase: Each team has protected 15 players        ║
║  Available Pool: 84 unprotected players                       ║
║                                                               ║
║  Pick 1 of 22:                                                ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ PLAYER              TEAM         POS  GRADE  SALARY    │  ║
║  ├────────────────────────────────────────────────────────┤  ║
║  │ Jake Thompson       NY Thunder   SP   B+     $8.2M     │  ║
║  │ Maria Santos        BOS Legends  CF   B      $6.5M     │  ║
║  │ Rico Valdez         CHI Fire     3B   B      $7.1M     │  ║
║  │ ...                                                     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  [Select Player]    [View Details]                            ║
╚══════════════════════════════════════════════════════════════╝
```

### 6.5 Expansion Team Initial Expectations

The expansion team starts with:
- Low expected wins (bottom of league)
- Neutral fan morale (50 — fresh start optimism)
- Extra draft picks in Phase 7 (compensatory picks in rounds 1-3)
- No playoff expectations for first season

---

## 7. Phase 5: Retirements

### 7.1 Retirement Philosophy

At the conclusion of each season, players will retire. The goal is **1-2 players from each team** retiring per season. Retirement probability is based on **reverse age order** (oldest players most likely, youngest least likely).

### 7.2 Retirement Probability System

Players are sorted by age (oldest first) and assigned retirement probabilities:

```typescript
interface RetirementCandidate {
  playerId: string;
  playerName: string;
  age: number;
  position: string;
  grade: string;
  retirementProbability: number;  // 0-100%
}

function calculateRetirementProbabilities(roster: Player[]): RetirementCandidate[] {
  // Sort by age descending (oldest first)
  const sorted = [...roster].sort((a, b) => b.age - a.age);

  // Assign probabilities - oldest gets highest probability
  return sorted.map((player, index) => {
    const ageRank = index;  // 0 = oldest
    const rosterSize = sorted.length;

    // Base probability decreases as you go down the age list
    // Oldest player: ~40-50%, youngest: ~1-5%
    const baseProbability = Math.max(5, 50 - (ageRank * (45 / rosterSize)));

    return {
      playerId: player.id,
      playerName: player.name,
      age: player.age,
      position: player.position,
      grade: player.grade,
      retirementProbability: baseProbability
    };
  });
}
```

### 7.3 Retirement UI Flow

The UI shows all players on the roster, team by team, with their respective probabilities. The user pushes a button to reveal which player (if any) retired.

```
╔══════════════════════════════════════════════════════════════╗
║                   RETIREMENT PROCESSING                       ║
║                   New York Thunder                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ROSTER RETIREMENT PROBABILITIES:                            ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ PLAYER              AGE   POS   GRADE   RETIRE %       │  ║
║  ├────────────────────────────────────────────────────────┤  ║
║  │ Roger Clemens       42    SP    A       47%            │  ║
║  │ Tony Gwynn          39    RF    A-      38%            │  ║
║  │ Mark McGwire        37    1B    B+      31%            │  ║
║  │ Barry Bonds         35    LF    A+      25%            │  ║
║  │ Ken Griffey Jr.     33    CF    A       19%            │  ║
║  │ Derek Jeter         30    SS    A-      14%            │  ║
║  │ Alex Rodriguez      28    3B    A       10%            │  ║
║  │ ...                                                     │  ║
║  │ Mike Trout          22    CF    B+      3%             │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  Retirements this team: 0/2                                  ║
║                                                               ║
║              [ 🎲 REVEAL RETIREMENT 🎲 ]                     ║
║                                                               ║
║  (Each push reveals if someone retires. Some % chance        ║
║   no one retires on each push based on team ages.)          ║
╚══════════════════════════════════════════════════════════════╝
```

#### Post-Reveal (Player Retired)

```
╔══════════════════════════════════════════════════════════════╗
║                   RETIREMENT PROCESSING                       ║
║                   New York Thunder                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║                    🎩 RETIREMENT 🎩                           ║
║                                                               ║
║                    Roger Clemens                              ║
║                    Age 42 | SP | Grade A                      ║
║                                                               ║
║            "Going out on top after 20 seasons"               ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  UPDATED ROSTER PROBABILITIES:                               ║
║  (Probabilities recalculated after retirement)               ║
║                                                               ║
║  │ Tony Gwynn          39    RF    A-      45%            │  ║
║  │ Mark McGwire        37    1B    B+      36%            │  ║
║  │ ...                                                     │  ║
║                                                               ║
║  Retirements this team: 1/2                                  ║
║                                                               ║
║  [ 🎲 REVEAL SECOND RETIREMENT 🎲 ]  [Skip to Jersey Retire] ║
╚══════════════════════════════════════════════════════════════╝
```

#### Post-Reveal (No Retirement)

```
╔══════════════════════════════════════════════════════════════╗
║                   RETIREMENT PROCESSING                       ║
║                   New York Thunder                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║                    ✓ NO RETIREMENT ✓                         ║
║                                                               ║
║     The dice rolled in their favor - everyone stays!         ║
║                                                               ║
║  Retirements this team: 0/2                                  ║
║                                                               ║
║  [ 🎲 TRY AGAIN 🎲 ]  [Skip to Next Team]                    ║
╚══════════════════════════════════════════════════════════════╝
```

### 7.4 Empty Roster Slots

Once a player retires, their roster slot becomes **empty** and must be filled during the Draft phase. The roster visually shows the gap:

```
ROSTER SLOT 5: [EMPTY - Roger Clemens retired]
```

### 7.5 Jersey Retirement

Immediately after a player retires, each team that player played for is offered the chance to retire their jersey number.

#### Jersey Retirement Rules

- Each team can retire **unlimited** jerseys
- Retired numbers cannot be reassigned to future players
- Multiple teams may retire same player's number
- **Entirely user discretion** - no eligibility criteria
- Decision made at moment of retirement only

```typescript
interface JerseyRetirement {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  teamId: string;
  teamName: string;
  teamColors: {
    primary: string;   // Hex code
    secondary: string; // Hex code
  };
  retirementYear: number;
  seasonsWithTeam: number;
  warWithTeam: number;
}
```

#### Jersey Retirement UI

```
╔══════════════════════════════════════════════════════════════╗
║              🏆 JERSEY RETIREMENT 🏆                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Roger Clemens has retired.                                  ║
║  Would you like to retire his jersey?                        ║
║                                                               ║
║  Teams played for:                                           ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ ☐ New York Thunder (#21)                               │  ║
║  │   8 seasons | 32.1 WAR | 2× Cy Young                   │  ║
║  ├────────────────────────────────────────────────────────┤  ║
║  │ ☐ Boston Legends (#21)                                 │  ║
║  │   12 seasons | 48.7 WAR | 3× Cy Young | 1× MVP         │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  [Retire Selected]  [Skip]                                   ║
╚══════════════════════════════════════════════════════════════╝
```

### 7.6 Team Page: Retired Jerseys Display

On each team's page, display retired jerseys showing the jersey with correct team colors, number, and last name above the number:

```
╔══════════════════════════════════════════════════════════════╗
║              RETIRED NUMBERS - NEW YORK THUNDER              ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     ║
║   │ CLEMENS │   │  JETER  │   │ RIVERA  │   │ RUTH    │     ║
║   │         │   │         │   │         │   │         │     ║
║   │   21    │   │    2    │   │   42    │   │    3    │     ║
║   │         │   │         │   │         │   │         │     ║
║   └─────────┘   └─────────┘   └─────────┘   └─────────┘     ║
║      2024          2018          2013          1948          ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

### 7.7 Hall of Fame Museum (Separate Feature)

**Note**: Hall of Fame is NOT decided at retirement. Instead, the Hall of Fame is a separate **museum tab** accessible at any time where users can manually add players to the Hall of Fame. See [Section 13: Hall of Fame Museum](#13-hall-of-fame-museum) for details.

---

## 8. Phase 6: Free Agency

### 8.1 Free Agency Overview

Free agency determines which players leave one team and join another. The process runs for **two rounds**, with every team potentially losing a free agent and getting a player back in each round.

### 8.2 Protection Phase

Each team's user selects **one player** on their roster to "protect" from leaving via free agency. This player cannot be selected as the departing free agent.

```
╔══════════════════════════════════════════════════════════════╗
║              FREE AGENCY - PROTECTION PHASE                   ║
║              New York Thunder                                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Select ONE player to protect from free agency:              ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ ○ Derek Jeter (SS, A-)                                 │  ║
║  │ ○ Alex Rodriguez (3B, A)                               │  ║
║  │ ○ Barry Bonds (LF, A+)                                 │  ║
║  │ ● Mike Trout (CF, B+)  ← SELECTED                      │  ║
║  │ ○ ...                                                   │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  [Confirm Protection]                                        ║
╚══════════════════════════════════════════════════════════════╝
```

### 8.3 Dice Roll System (2-12)

The **top 11 best non-protected players** on each team are sorted from safest to most likely to leave. They are assigned dice-roll values between **2 and 12**, using the probability distribution of rolling two dice:

| Dice Value | Players Assigned | Probability |
|------------|------------------|-------------|
| 2 | Least likely to lose (safest) | 2.78% |
| 3 | Second safest | 5.56% |
| 4 | Third safest | 8.33% |
| 5 | | 11.11% |
| 6 | | 13.89% |
| **7** | **Most likely to leave** | **16.67%** |
| 8 | | 13.89% |
| 9 | | 11.11% |
| 10 | | 8.33% |
| 11 | Second most likely | 5.56% |
| 12 | Third most likely | 2.78% |

The player assigned to **7** is the one you'd most want to keep (since 7 is the most likely roll).

```typescript
interface FADiceAssignment {
  diceValue: number;  // 2-12
  playerId: string;
  playerName: string;
  position: string;
  grade: string;
  probability: number;  // Probability of rolling this value
}

function assignDiceValues(roster: Player[], protectedPlayerId: string): FADiceAssignment[] {
  // Filter out protected player, sort by grade/value (best first)
  const eligible = roster
    .filter(p => p.id !== protectedPlayerId)
    .sort((a, b) => gradeToValue(b.grade) - gradeToValue(a.grade))
    .slice(0, 11);  // Top 11 only

  // Assign dice values: best players get 7 (most likely to lose)
  // Worst of the 11 get 2 and 12 (least likely)
  const diceOrder = [7, 6, 8, 5, 9, 4, 10, 3, 11, 2, 12];

  return eligible.map((player, index) => ({
    diceValue: diceOrder[index],
    playerId: player.id,
    playerName: player.name,
    position: player.position,
    grade: player.grade,
    probability: DICE_PROBABILITIES[diceOrder[index]]
  }));
}
```

### 8.4 Free Agency Dice Roll UI

The UI shows two dice buttons (or one button revealing 2-12). User clicks to reveal which player leaves:

```
╔══════════════════════════════════════════════════════════════╗
║              FREE AGENCY - DEPARTURE ROLL                     ║
║              New York Thunder (Round 1)                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Protected: Mike Trout (CF, B+)                              ║
║                                                               ║
║  DICE ASSIGNMENTS (sorted by risk):                          ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ DICE │ PLAYER              │ POS │ GRADE │ PROB        │  ║
║  ├──────┼─────────────────────┼─────┼───────┼─────────────┤  ║
║  │  7   │ Barry Bonds         │ LF  │ A+    │ 16.67%      │  ║
║  │  6   │ Derek Jeter         │ SS  │ A-    │ 13.89%      │  ║
║  │  8   │ Alex Rodriguez      │ 3B  │ A     │ 13.89%      │  ║
║  │  5   │ Ken Griffey Jr.     │ CF  │ A     │ 11.11%      │  ║
║  │  9   │ Roger Clemens       │ SP  │ A     │ 11.11%      │  ║
║  │  4   │ Randy Johnson       │ SP  │ A-    │  8.33%      │  ║
║  │ 10   │ Pedro Martinez      │ SP  │ B+    │  8.33%      │  ║
║  │  3   │ Greg Maddux         │ SP  │ B+    │  5.56%      │  ║
║  │ 11   │ Mariano Rivera      │ CP  │ B     │  5.56%      │  ║
║  │  2   │ John Smoltz         │ SP  │ B     │  2.78%      │  ║
║  │ 12   │ Tony Gwynn          │ RF  │ B-    │  2.78%      │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║         ┌─────┐    ┌─────┐                                   ║
║         │ 🎲  │    │ 🎲  │                                   ║
║         └─────┘    └─────┘                                   ║
║                                                               ║
║         [ ROLL DICE ]                                        ║
╚══════════════════════════════════════════════════════════════╝
```

### 8.5 Personality-Based Destination

Once the departing player is identified, their **personality** determines where they go:

| Personality | Destination |
|-------------|-------------|
| **COMPETITIVE** | Team's **rival** (closest to .500 head-to-head all-time) |
| **RELAXED** | **Random team** via dice roll (includes current team - may stay!) |
| **DROOPY** | **Retires** (leaves league entirely) |
| **JOLLY** | **Stays** with current team (no move) |
| **TOUGH** | Team with **highest team OPS** that season |
| **TIMID** | Team that just **won the championship** |
| **EGOTISTICAL** | **Worst team** (lowest total team WAR) from just-completed season |

```typescript
function resolveFADestination(
  player: Player,
  currentTeam: Team,
  allTeams: Team[],
  seasonStats: SeasonStats
): FADestinationResult {
  switch (player.personality) {
    case 'COMPETITIVE':
      return { destination: findRival(currentTeam, allTeams), type: 'RIVAL' };

    case 'RELAXED':
      // Random team including current - roll dice
      const randomTeam = allTeams[Math.floor(Math.random() * allTeams.length)];
      if (randomTeam.id === currentTeam.id) {
        return { destination: currentTeam, type: 'STAYS' };
      }
      return { destination: randomTeam, type: 'RANDOM' };

    case 'DROOPY':
      return { destination: null, type: 'RETIRES' };

    case 'JOLLY':
      return { destination: currentTeam, type: 'STAYS' };

    case 'TOUGH':
      return { destination: findHighestOPS(allTeams, seasonStats), type: 'HIGHEST_OPS' };

    case 'TIMID':
      return { destination: findChampion(allTeams, seasonStats), type: 'CHAMPION' };

    case 'EGOTISTICAL':
      return { destination: findWorstTeam(allTeams, seasonStats), type: 'WORST_TEAM' };
  }
}

function findRival(team: Team, allTeams: Team[]): Team {
  // Rival = team with head-to-head record closest to .500
  return allTeams
    .filter(t => t.id !== team.id)
    .reduce((closest, t) => {
      const h2h = getHeadToHeadRecord(team.id, t.id);
      const diff = Math.abs(h2h.winPct - 0.5);
      const closestDiff = Math.abs(getHeadToHeadRecord(team.id, closest.id).winPct - 0.5);
      return diff < closestDiff ? t : closest;
    });
}
```

### 8.6 Player Exchange Rule

When a player leaves for another team, the **receiving team must give back a player** that matches:

1. **Salary / True Value proximity**: Return player must be within **±20% of the departing player's True Value (salary)**
2. **No position matching required**: Any player can be exchanged for any player regardless of position

```typescript
function selectReturnPlayer(
  receivingTeam: Team,
  departingPlayer: Player
): Player[] {
  const targetValue = departingPlayer.trueValue;
  const tolerance = 0.20;  // ±20%

  const eligible = receivingTeam.roster.filter(p => {
    const delta = Math.abs(p.trueValue - targetValue) / targetValue;
    return delta <= tolerance;
  });

  if (eligible.length > 0) {
    // User selects from eligible players
    return eligible;
  }

  // Fallback: return the single player whose True Value is closest
  const closest = receivingTeam.roster.reduce((best, p) =>
    Math.abs(p.trueValue - targetValue) < Math.abs(best.trueValue - targetValue) ? p : best
  );
  return [closest];
}
```

> **Note**: If no player on the receiving team is within ±20%, the system surfaces the closest match as the only option and informs the user it's a forced fallback.

**Example**:
- Worse team loses a B+ player → Must get B+ or better back
- Better team loses a B+ player → Can get B or better back

### 8.7 Two Rounds of Free Agency

Free agency runs for **two complete rounds**:

1. **Round 1**: Every team goes through protection → dice roll → destination → exchange
2. **Round 2**: Repeat the entire process with updated rosters

After both rounds, free agency is complete.

```
╔══════════════════════════════════════════════════════════════╗
║              FREE AGENCY SUMMARY                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ROUND 1 MOVES:                                              ║
║  • Barry Bonds (A+, LF) NYT → BOS (competitive - rival)      ║
║    Return: David Ortiz (A, 1B)                               ║
║  • Ken Griffey Jr. (A, CF) SEA → retired (droopy)            ║
║  • ...                                                        ║
║                                                               ║
║  ROUND 2 MOVES:                                              ║
║  • Pedro Martinez (B+, SP) BOS → stayed (jolly)              ║
║  • Alex Rodriguez (A, 3B) NYT → TEX (egotistical - worst)    ║
║    Return: Michael Young (B+, SS)                            ║
║  • ...                                                        ║
║                                                               ║
║  [Continue to Draft]                                         ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 9. Phase 7: Draft

### 9.1 Pre-Draft: Inactive Player Database

Before the draft begins, the app asks if the user wants to add any players from the **inactive player database** to the upcoming draft class:

```
╔══════════════════════════════════════════════════════════════╗
║              PRE-DRAFT: INACTIVE PLAYERS                      ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Would you like to add any inactive players to the draft?    ║
║                                                               ║
║  Available Inactive Players:                                 ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ ☐ Babe Ruth (LF, A+) - Retired Season 3               │  ║
║  │ ☐ Lou Gehrig (1B, A) - Retired Season 5               │  ║
║  │ ☐ Ted Williams (LF, A) - Retired Season 4             │  ║
║  │ ...                                                     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  [Add Selected to Draft]  [Skip - Generate Full Draft Class] ║
╚══════════════════════════════════════════════════════════════╝
```

### 9.2 Draft Class Generation

The AI automatically generates a **fictional draft class** to fill roster gaps. The draft class:

- **Maximum grade**: A- (no player above A-)
- **Average grade**: B-
- **Position coverage**: At least **2 players at each position**
- **Names**: Generated from a provided document of first/last names

```typescript
interface DraftProspect {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  grade: string;  // Max A-, avg B-
  age: number;    // 18-22 typically
  attributes: PlayerAttributes;
  personality: Personality;
}

function generateDraftClass(
  rosterGaps: number,
  nameDatabase: NameDatabase
): DraftProspect[] {
  const draftClass: DraftProspect[] = [];

  // Ensure minimum 2 per position
  const positions = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'SP', 'RP', 'CP'];
  for (const pos of positions) {
    draftClass.push(generateProspect(pos, nameDatabase));
    draftClass.push(generateProspect(pos, nameDatabase));
  }

  // Fill remaining slots to cover roster gaps
  while (draftClass.length < Math.max(22, rosterGaps + 10)) {
    const randomPos = positions[Math.floor(Math.random() * positions.length)];
    draftClass.push(generateProspect(randomPos, nameDatabase));
  }

  return draftClass;
}

function generateProspectGrade(): string {
  // Distribution: avg B-, max A-
  const roll = Math.random();
  if (roll < 0.05) return 'A-';      // 5% chance
  if (roll < 0.15) return 'B+';      // 10% chance
  if (roll < 0.35) return 'B';       // 20% chance
  if (roll < 0.60) return 'B-';      // 25% chance (most common)
  if (roll < 0.80) return 'C+';      // 20% chance
  if (roll < 0.95) return 'C';       // 15% chance
  return 'C-';                        // 5% chance
}
```

### 9.3 Draft Order

Draft order is set in **reverse order of new average expected WAR per player**:

```typescript
function calculateDraftOrder(teams: Team[]): Team[] {
  return teams.sort((a, b) => {
    const aAvgWAR = a.totalExpectedWAR / a.roster.length;
    const bAvgWAR = b.totalExpectedWAR / b.roster.length;
    return aAvgWAR - bAvgWAR;  // Worst average picks first
  });
}
```

**Note**: We use average (not aggregate) because some teams may have fewer players due to retirements/FA.

### 9.4 Draft Rules

1. **Minimum one pick**: Each team must draft **at least one player**, even if their roster is full
2. **Replacement rule**: If drafting with a full roster, must **release a player** of **same grade or worse** than the drafted player
3. **Released players**: Become available in the draft for other teams. If undrafted, they **retire** after the draft
4. **Opt-out rule**: Teams with full rosters who opt out of drafting in the first round will **not appear again** in the draft

```typescript
interface DraftPick {
  teamId: string;
  round: number;
  pickNumber: number;
  selectedPlayer: DraftProspect;
  releasedPlayer: Player | null;  // If roster was full
}

function validateDraftPick(
  team: Team,
  prospect: DraftProspect,
  releasedPlayer: Player | null
): boolean {
  if (team.roster.length < team.maxRosterSize) {
    // Has open slot - can draft anyone
    return true;
  }

  // Full roster - must release someone
  if (!releasedPlayer) return false;

  // Released player must be same grade or worse than prospect
  return gradeToValue(releasedPlayer.grade) <= gradeToValue(prospect.grade);
}
```

### 9.5 Draft Flow

```
╔══════════════════════════════════════════════════════════════╗
║              DRAFT - ROUND 1, PICK 3                         ║
║              Detroit Diamonds                                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Roster Status: 21/22 (1 empty slot)                         ║
║  Draft Order Position: 3rd (Avg WAR: 1.8)                    ║
║                                                               ║
║  AVAILABLE PROSPECTS:                                        ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ NAME                │ POS │ GRADE │ AGE │ ATTRIBUTES   │  ║
║  ├─────────────────────┼─────┼───────┼─────┼──────────────┤  ║
║  │ Marcus Williams     │ SS  │ B+    │ 20  │ PWR:65 CON:70│  ║
║  │ Jake Thompson       │ SP  │ B     │ 21  │ VEL:72 ACC:68│  ║
║  │ Carlos Ramirez      │ CF  │ B     │ 19  │ SPD:78 CON:65│  ║
║  │ Tyler Johnson       │ 3B  │ B-    │ 20  │ PWR:70 CON:60│  ║
║  │ ...                                                     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  Released Players Available:                                 ║
║  │ Mike Smith (C, C+) - Released by Boston                 │  ║
║                                                               ║
║  [Select Prospect]  [Pass This Round]                        ║
╚══════════════════════════════════════════════════════════════╝
```

### 9.6 Draft Completion

Draft continues until:
1. **All teams have full rosters** AND
2. **All teams have drafted at least once**

Teams that pass with full rosters exit the draft. Undrafted released players retire.

```
╔══════════════════════════════════════════════════════════════╗
║              DRAFT COMPLETE                                   ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Total Picks: 47                                             ║
║  Rounds: 3                                                   ║
║                                                               ║
║  TOP PICKS:                                                  ║
║  1. Marcus Williams (SS, B+) → Detroit Diamonds              ║
║  2. Jake Thompson (SP, B) → Miami Marlins                    ║
║  3. Carlos Ramirez (CF, B) → Chicago Fire                    ║
║                                                               ║
║  PLAYERS RETIRED (Undrafted):                                ║
║  • Mike Smith (C, C+)                                        ║
║  • John Davis (RP, C)                                        ║
║                                                               ║
║  [Continue to Finalize Rosters]                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 10. Phase 8: Salary Recalculation #2

### 10.1 Purpose

Second salary recalculation of the offseason, reflecting all changes from the draft (Phase 7). New drafted players receive initial salaries; existing players' salaries may shift based on roster composition changes.

### 10.2 Processing

Same formula as Phase 3. Produces updated salary baseline before the trade window opens.

```typescript
function phase8SalaryRecalc(teams: Team[]): SalaryRecalcResult[] {
  return teams.map(team => {
    const results = team.roster.map(player => recalculateSalary(player, team));
    return {
      teamId: team.id,
      totalSalary: sum(results.map(r => r.newSalary)),
      adjustments: results.filter(r => r.changed),
      newDraftees: results.filter(r => r.isNewDraftee)
    };
  });
}
```

### 10.3 Summary Display

```
╔══════════════════════════════════════════════════════════════╗
║              SALARY RECALCULATION #2 (Post-Draft)             ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  TEAM SALARY CHANGES:                                        ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ TEAM              PREV TOTAL  NEW TOTAL   CHANGE       │  ║
║  ├────────────────────────────────────────────────────────┤  ║
║  │ NY Thunder        $142.3M     $138.7M     -$3.6M      │  ║
║  │ BOS Legends       $128.5M     $131.2M     +$2.7M      │  ║
║  │ CHI Fire          $95.1M      $98.4M      +$3.3M      │  ║
║  │ DET Diamonds      $72.8M      $76.1M      +$3.3M      │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  [Continue to Offseason Trades]                              ║
╚══════════════════════════════════════════════════════════════╝
```
```

---

## 11. Phase 9: Offseason Trades

### 11.1 Purpose

Dedicated trade window for all teams to propose and execute trades before the final salary recalculation and roster lock.

### 11.2 Trade Window

> **Full specification**: See [TRADE_SYSTEM_SPEC.md](./TRADE_SYSTEM_SPEC.md) for complete trade system details including no-salary-matching rule and Chemistry-tier trade value evaluation.

The offseason trade window opens after Salary Recalculation #2 (Phase 8) gives all teams current salary baselines.

**Key rules:**
- No salary matching required (any trade package is valid)
- Fan morale impacts apply to all trades
- AI-controlled teams evaluate trade proposals based on needs/surpluses
- Chemistry-tier potency changes shown in trade preview

### 11.3 Trade Market UI

```
╔══════════════════════════════════════════════════════════════╗
║              OFFSEASON TRADE WINDOW (Phase 9)                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  TRADE MARKET STATUS:                                        ║
║  • Active Trade Proposals: 3                                 ║
║  • Completed Trades: 2                                       ║
║                                                               ║
║  YOUR PENDING PROPOSALS:                                     ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ → Boston Legends: Offering Martinez for their Ortiz    │  ║
║  │   Status: Awaiting Response                             │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  INCOMING PROPOSALS:                                         ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ ← Chicago Fire: Wants Derek Jeter                      │  ║
║  │   Offering: Mike Simmons (SP, B+) + Draft Swap         │  ║
║  │   Chemistry: Jeter's Clutch Tier 2→1 ▼ on CHI          │  ║
║  │   [Accept] [Counter] [Reject]                          │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  [Propose New Trade]  [View Trade History]  [Close Window]  ║
╚══════════════════════════════════════════════════════════════╝
```

### 11.4 AI Trade Proposals

AI-controlled teams generate trade proposals based on roster needs:

```typescript
function generateAITradeProposals(team: Team): TradeProposal[] {
  const proposals: TradeProposal[] = [];

  for (const aiTeam of getAITeams()) {
    const needs = evaluateTeamNeeds(aiTeam);
    const surpluses = evaluateTeamSurpluses(aiTeam);

    const match = findTradeMatch(team, aiTeam, needs, surpluses);
    if (match && match.fairnessScore >= 0.9) {
      proposals.push(createTradeProposal(aiTeam, team, match));
    }
  }

  return proposals;
}
```

### 11.5 Trade Window Completion

The trade window closes when the user confirms "Ready for Salary Recalculation":

```
╔══════════════════════════════════════════════════════════════╗
║              OFFSEASON TRADES COMPLETE                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Trades Completed: 4                                         ║
║  Players Acquired: 6                                         ║
║  Players Sent: 5                                             ║
║  Farm Prospects Moved: 3                                     ║
║                                                               ║
║  [Continue to Salary Recalculation #3]                       ║
╚══════════════════════════════════════════════════════════════╝
```
```

---

## 12. Phase 10: Salary Recalculation #3

### 12.1 Purpose

Third and final salary recalculation of the offseason, reflecting all trades completed in Phase 9.

### 12.2 Processing

Same formula as Phases 3 and 8. Produces final salary baseline for Phase 11 cut-down and the upcoming season.

```typescript
function phase10SalaryRecalc(teams: Team[]): SalaryRecalcResult[] {
  return teams.map(team => {
    const results = team.roster.map(player => recalculateSalary(player, team));
    return {
      teamId: team.id,
      totalSalary: sum(results.map(r => r.newSalary)),
      adjustments: results.filter(r => r.changed)
    };
  });
}
```

> **Note**: This total salary figure is used in Phase 11 to determine signing round claim priority (reverse expected roster WAR via total salary — lowest salary picks first).

---

## 13. Phase 11: Finalize & Advance

### 13.1 Purpose

The culmination of the offseason. All teams must reach exactly 22 MLB / 10 Farm before the new season begins. This phase enforces the roster constraint that was relaxed during the season (farm was unlimited) and provides a structured process for handling released players.

### 13.2 Cut-Down Deadline

Every team must cut down to exactly 22 MLB players and 10 Farm players. Teams over the limit must release players; teams under must sign from the released player pool or have empty slots filled.

```
╔══════════════════════════════════════════════════════════════╗
║              PHASE 11: FINALIZE & ADVANCE                     ║
║              Step 1: Cut-Down Deadline                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ROSTER STATUS BY TEAM:                                      ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ TEAM              MLB   FARM  ACTION NEEDED            │  ║
║  ├────────────────────────────────────────────────────────┤  ║
║  │ NY Thunder        24    12    Release 2 MLB, 2 Farm    │  ║
║  │ BOS Legends       22    11    Release 1 Farm           │  ║
║  │ CHI Fire          21    10    Need 1 MLB (signing rnd) │  ║
║  │ DET Diamonds      22    10    ✅ Ready                  │  ║
║  │ ...                                                     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  [Begin Cut-Down Process]                                    ║
╚══════════════════════════════════════════════════════════════╝
```

### 13.3 Released Player Pool

All cut players enter a shared pool available for the signing round.

```typescript
interface ReleasedPlayerPool {
  players: ReleasedPlayer[];
  source: Map<string, string>;  // playerId → releasing team
}

interface ReleasedPlayer {
  player: Player;
  releasedBy: string;  // Team ID
  salary: number;      // From Phase 10 recalculation
}
```

### 13.4 Signing Round (Claim Priority: Reverse Expected WAR)

After all teams have cut down, teams with open roster spots get to claim ONE player from the released pool. **Claim order is determined by reverse expected roster WAR, using total MLB salary as the proxy.**

**Why total salary instead of win-loss record?**
By Phase 11, rosters have changed dramatically through retirements, free agency, draft, and trades. The regular season record is stale. Total MLB salary (recalculated in Phase 10) is the live proxy for expected roster WAR — it reflects the CURRENT team strength. The team with the LOWEST total MLB salary picks first because they're the "weakest" team by current expectations.

```typescript
function getSigningRoundOrder(teams: Team[]): Team[] {
  // Sort by total MLB salary ascending (lowest picks first)
  return teams
    .filter(t => t.mlbRoster.length < 22 || t.farmRoster.length < 10)
    .sort((a, b) => a.totalMLBSalary - b.totalMLBSalary);
}

function processSigningRound(
  teams: Team[],
  pool: ReleasedPlayerPool
): SigningRoundResult[] {
  const order = getSigningRoundOrder(teams);
  const results: SigningRoundResult[] = [];

  for (const team of order) {
    if (pool.players.length === 0) break;

    // Team picks ONE player from pool
    const pick = userSelectsFromPool(team, pool);
    if (pick) {
      pool.players = pool.players.filter(p => p.player.id !== pick.player.id);
      results.push({
        team: team.id,
        claimed: pick.player,
        level: determineLevel(team, pick.player)  // MLB or Farm
      });
    }
  }

  return results;
}
```

### 13.5 Signing Round UI

```
╔══════════════════════════════════════════════════════════════╗
║              SIGNING ROUND                                    ║
║              Claim Order: Reverse Expected WAR (Total Salary) ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Pick 1: Chicago Fire (Total Salary: $42.3M — lowest)        ║
║                                                               ║
║  Available Released Players:                                 ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ PLAYER              POS   GRADE  SALARY  RELEASED BY   │  ║
║  ├────────────────────────────────────────────────────────┤  ║
║  │ Jake Wilson          CF    B      $6.2M   NY Thunder    │  ║
║  │ Maria Santos         SP    B-     $4.1M   BOS Legends   │  ║
║  │ Rico Valdez          3B    C+     $2.8M   NY Thunder    │  ║
║  │ Tom Baker            RP    C      $1.5M   SEA Mariners  │  ║
║  │ ...                                                     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  [Claim Player]    [Pass (skip claiming)]                    ║
╚══════════════════════════════════════════════════════════════╝
```

### 13.6 Cut-and-Sign Round (Optional)

After the signing round, any team may optionally CUT one additional player and SIGN one player from the newly expanded pool. This enables last-minute roster optimization.

```typescript
function processCutAndSignRound(
  teams: Team[],
  pool: ReleasedPlayerPool
): CutAndSignResult[] {
  const results: CutAndSignResult[] = [];

  // Same order as signing round
  const order = getSigningRoundOrder(teams);

  for (const team of order) {
    // Optional: team can cut one player and sign one from pool
    const action = userDecidesCutAndSign(team, pool);
    if (action) {
      // Cut player goes to pool
      pool.players.push({ player: action.cut, releasedBy: team.id, salary: action.cut.salary });
      // Sign player from pool
      pool.players = pool.players.filter(p => p.player.id !== action.sign.player.id);

      results.push({
        team: team.id,
        cut: action.cut,
        signed: action.sign.player
      });
    }
  }

  return results;
}
```

### 13.7 Final Roster Lock

After cut-and-sign completes, ALL rosters must be exactly 22 MLB / 10 Farm. Any remaining released players who were not claimed retire from the league.

```
╔══════════════════════════════════════════════════════════════╗
║              ROSTERS LOCKED                                   ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ✅ All teams at 22 MLB / 10 Farm                            ║
║                                                               ║
║  Unclaimed players retiring:                                 ║
║  • Tom Baker (RP, C) — no claims                             ║
║  • Pat Wilson (UTIL, C-) — no claims                         ║
║                                                               ║
║  [Continue to Season Archive]                                ║
╚══════════════════════════════════════════════════════════════╝
```

### 13.8 Season Archival

When user confirms, the app:

1. **Archives Current Season**
   - All stats, records, historical data preserved
   - Leaders, team data, transactions preserved

2. **Prepares New Season**
   - Reset player mojos to NORMAL
   - Clear seasonal stats (career totals preserved)
   - Reset clutch counters, fame counters (career preserved)
   - Reset options counter for all players (3 options per player per season)

3. **Launch**

```
╔══════════════════════════════════════════════════════════════╗
║              SEASON 2 READY!                                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ✓ Season 1 archived                                         ║
║  ✓ All rosters finalized (22/10)                             ║
║  ✓ Player stats reset                                        ║
║  ✓ Options counters reset                                    ║
║  ✓ Historical data preserved                                 ║
║                                                               ║
║  SEASON 1 CHAMPIONS: New York Thunder                        ║
║  SEASON 1 MVP: Barry Bonds                                   ║
║  SEASON 1 CY YOUNG: Roger Clemens                            ║
║                                                               ║
║              [ 🎮 BEGIN SEASON 2 🎮 ]                        ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 14. Hybrid Personality System

### 14.1 Visible Personality Types

Personalities are **visible** to the user and known from the moment a player is drafted.

| Personality | Description | Behavioral Tendency |
|-------------|-------------|---------------------|
| **COMPETITIVE** | Driven to win | Seeks contenders, responds to challenges |
| **RELAXED** | Easy-going | Comfortable with status quo |
| **DROOPY** | Pessimistic | Prone to slumps, drifts in FA |
| **JOLLY** | Optimistic | Loves teammates, adventurous |
| **TOUGH** | Resilient | Bounces back, values respect |
| **TIMID** | Anxious | Fears change, avoids spotlight |
| **EGOTISTICAL** | Self-focused | Wants money and glory |

### 14.2 Hidden Modifiers (Never Directly Revealed)

Each player also has 4 hidden modifiers on a 0-100 scale. These are NEVER shown numerically — they are only hinted at through behavior patterns and beat reporter coverage.

| Modifier | Range | Affects |
|----------|-------|---------|
| **Loyalty** | 0-100 | FA destination preference, willingness to take discount, trade request likelihood |
| **Ambition** | 0-100 | Development speed, award pursuit intensity, willingness to change teams for opportunity |
| **Resilience** | 0-100 | Morale recovery speed, performance under adversity, retirement probability |
| **Charisma** | 0-100 | Teammate morale effects, fan engagement, team captain selection, mentorship effectiveness |

```typescript
interface PlayerPersonality {
  visibleType: PersonalityType;  // One of 7 types — shown to user
  hiddenModifiers: {
    loyalty: number;      // 0-100
    ambition: number;     // 0-100
    resilience: number;   // 0-100
    charisma: number;     // 0-100
  };
}
```

### 14.3 How Hidden Modifiers Surface

Hidden modifiers are never shown as numbers. Instead, they influence observable behavior:

| Modifier | Observable Signals |
|----------|-------------------|
| **High Loyalty** | Beat reporter: "He's said he wants to retire here." FA: more likely to stay. Trade: resists leaving. |
| **Low Loyalty** | Beat reporter: "Sources say he's exploring options." FA: destination-agnostic. |
| **High Ambition** | Beat reporter: "Working overtime in the cage." Development: faster improvement. FA: seeks bigger role. |
| **Low Ambition** | Beat reporter: "Seems content with his role." Development: slower improvement. |
| **High Resilience** | Beat reporter: "Bounced back from that slump quickly." Morale: recovers fast. Retirement: less likely. |
| **Low Resilience** | Beat reporter: "Still struggling after that rough stretch." Morale: fragile. Retirement: more likely. |
| **High Charisma** | Beat reporter: "Real leader in that clubhouse." Teammates: morale boost. Team Captain candidate. |
| **Low Charisma** | Beat reporter: "Keeps to himself." Teammates: no effect. |

### 14.4 Team Captain Selection

The Team Captain designation goes to the player with the highest combined Loyalty + Charisma among veterans (3+ seasons with team):

```typescript
function selectTeamCaptain(team: Team): Player | null {
  const veterans = team.roster.filter(p => p.seasonsWithTeam >= 3);
  if (veterans.length === 0) return null;

  return veterans.reduce((best, player) => {
    const score = player.personality.hiddenModifiers.loyalty +
                  player.personality.hiddenModifiers.charisma;
    const bestScore = best.personality.hiddenModifiers.loyalty +
                      best.personality.hiddenModifiers.charisma;
    return score > bestScore ? player : best;
  });
}
```

### 14.5 Personality Distribution

New players assigned visible type via weighted random:

| Personality | Weight |
|-------------|--------|
| COMPETITIVE | 20% |
| RELAXED | 20% |
| JOLLY | 15% |
| TOUGH | 15% |
| TIMID | 10% |
| DROOPY | 10% |
| EGOTISTICAL | 10% |

Hidden modifiers generated via Gaussian distribution centered at 50 with σ=20, clamped to [0, 100]. Visible type creates soft bias:

| Personality | Modifier Bias |
|-------------|--------------|
| COMPETITIVE | +10 Ambition |
| RELAXED | +10 Resilience |
| JOLLY | +10 Charisma |
| TOUGH | +10 Resilience, +5 Loyalty |
| TIMID | -10 Ambition, +5 Loyalty |
| DROOPY | -10 Resilience |
| EGOTISTICAL | +15 Ambition, -10 Loyalty |

---

## 15. Morale System

### 15.1 Morale Scale

| Range | State | Effect |
|-------|-------|--------|
| 80-100 | Excellent | -10% retirement risk, +FA loyalty |
| 60-79 | Good | Baseline |
| 40-59 | Neutral | Baseline |
| 20-39 | Low | +20% retirement risk, +20% FA departure |
| 0-19 | Critical | +35% retirement risk, +40% FA departure |

### 15.2 Morale Triggers by Personality

| Personality | Morale UP | Morale DOWN |
|-------------|-----------|-------------|
| COMPETITIVE | Winning, awards, clutch success | Losing, underperforming |
| RELAXED | Stability, no drama | Forced changes, pressure |
| DROOPY | Rare good news | Almost anything negative |
| JOLLY | Team success, fun events | Teammate losses, drama |
| TOUGH | Respect, challenges met | Disrespect, unfair treatment |
| TIMID | Stability, support | Change, spotlight, criticism |
| EGOTISTICAL | Personal success, recognition | Being overlooked, team focus |

### 15.3 Morale Events

```typescript
interface MoraleEvent {
  type: 'POSITIVE' | 'NEGATIVE';
  source: 'TEAM' | 'PERSONAL' | 'CHEMISTRY' | 'TRANSACTION';
  magnitude: number;  // -20 to +20
  description: string;
}

const MORALE_EVENTS = {
  TRADED_AWAY: { type: 'NEGATIVE', magnitude: -15, source: 'TRANSACTION' },
  WON_AWARD: { type: 'POSITIVE', magnitude: +10, source: 'PERSONAL' },
  TEAM_REBUILT: { type: 'NEGATIVE', magnitude: -15, source: 'TEAM' },
  CHEMISTRY_DOWNGRADE: { type: 'NEGATIVE', magnitude: -10, source: 'CHEMISTRY' },
  DEMOTED: { type: 'NEGATIVE', magnitude: -12, source: 'TRANSACTION' },
  CALLED_UP: { type: 'POSITIVE', magnitude: +8, source: 'TRANSACTION' },
  TEAMMATE_RETIRED: { type: 'NEGATIVE', magnitude: -5, source: 'TEAM' },
  CHAMPIONSHIP: { type: 'POSITIVE', magnitude: +20, source: 'TEAM' }
};
```

---

## 16. Hall of Fame Museum

### 16.1 Separate Feature (Not Part of Retirement)

The Hall of Fame is a **separate museum tab** accessible at any time. Hall of Fame induction is **NOT decided at the moment of retirement**. Instead:

- Users can navigate to the Hall of Fame Museum tab whenever they want
- Users can manually add any retired player to the Hall of Fame
- This is entirely user discretion - no automatic eligibility criteria

### 16.2 Hall of Fame Museum UI

```
╔══════════════════════════════════════════════════════════════╗
║              🏛️ HALL OF FAME MUSEUM 🏛️                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  INDUCTED MEMBERS:                                           ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ Babe Ruth (LF) - Inducted Season 5                     │  ║
║  │   Career: .342 AVG | 714 HR | 68.4 WAR                 │  ║
║  │   Primary Team: New York Thunder                        │  ║
║  ├────────────────────────────────────────────────────────┤  ║
║  │ Roger Clemens (SP) - Inducted Season 8                 │  ║
║  │   Career: 354 W | 3.12 ERA | 78.2 WAR                  │  ║
║  │   Primary Team: Boston Legends                          │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  [ Add Player to Hall of Fame ]                              ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

### 16.3 Adding to Hall of Fame

When user clicks "Add Player to Hall of Fame", they can select from all retired players:

```
╔══════════════════════════════════════════════════════════════╗
║              ADD TO HALL OF FAME                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Select a retired player to induct:                          ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ NAME              │ POS │ CAREER WAR │ SEASONS │ AWARDS │  ║
║  ├───────────────────┼─────┼────────────┼─────────┼────────┤  ║
║  │ Ken Griffey Jr.   │ CF  │ 68.4       │ 12      │ 1× MVP │  ║
║  │ Tony Gwynn        │ RF  │ 52.1       │ 14      │ 8× GG  │  ║
║  │ Derek Jeter       │ SS  │ 42.8       │ 14      │ 1× MVP │  ║
║  │ Mariano Rivera    │ CP  │ 38.2       │ 17      │ 5× WS  │  ║
║  │ ...                                                     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  Selected: Ken Griffey Jr.                                   ║
║                                                               ║
║  Select Primary Team (cap on plaque):                        ║
║  ○ Seattle Mariners (11 seasons)                             ║
║  ○ Cincinnati Reds (6 seasons)                               ║
║                                                               ║
║  [Induct to Hall of Fame]  [Cancel]                          ║
╚══════════════════════════════════════════════════════════════╝
```

### 16.4 HOF Data Model

```typescript
interface HOFInduction {
  playerId: string;
  playerName: string;
  inductionSeason: number;
  primaryTeam: string;        // Team cap on plaque
  careerWAR: number;
  careerSeasons: number;
  achievements: string[];      // MVP, Cy Young, etc.
  retiredJerseys: string[];    // Teams that retired their number
}
```

---

## 17. Data Models

### 17.1 Offseason State

```typescript
interface OffseasonState {
  seasonId: number;
  currentPhase: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  phaseProgress: number;  // 0-100%

  // Phase 1-4 data
  awardsProcessed: Award[];
  salaryRecalc1: SalaryRecalcResult[];
  expansionOccurred: boolean;

  // Phase 5: Retirements
  retirees: RetiredPlayer[];
  jerseyRetirements: JerseyRetirement[];

  // Phase 6: Free Agency
  freeAgencyMoves: FAMove[];

  // Phase 7: Draft
  draftPicks: DraftPick[];

  // Phase 8: Salary Recalculation #2
  salaryRecalc2: SalaryRecalcResult[];

  // Phase 9: Offseason Trades
  offseasonTrades: OffseasonTrade[];

  // Phase 10: Salary Recalculation #3
  salaryRecalc3: SalaryRecalcResult[];

  // Phase 11: Finalize & Advance
  cutDownReleases: ReleasedPlayer[];
  signingRoundClaims: SigningRoundResult[];
  cutAndSignActions: CutAndSignResult[];
  unclamedRetirements: RetiredPlayer[];

  // Validation
  rosterValidation: Record<string, ValidationResult>;
  readyForNewSeason: boolean;
}
```

### 17.2 Retirement Data

```typescript
interface RetiredPlayer {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  age: number;
  position: string;
  grade: string;
  retirementProbability: number;  // What probability they had
  careerStats: CareerStats;
}

interface JerseyRetirement {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  teamId: string;
  teamName: string;
  teamColors: { primary: string; secondary: string };
  retirementSeason: number;
  seasonsWithTeam: number;
  warWithTeam: number;
}
```

### 17.3 Free Agency Move

```typescript
interface FAMove {
  round: 1 | 2;
  departingPlayer: {
    playerId: string;
    playerName: string;
    position: string;
    grade: string;
    personality: Personality;
    diceRoll: number;      // 2-12
    diceValue: number;     // Assigned dice value
  };
  fromTeam: string;
  toTeam: string | null;   // null if retired (DROOPY) or stayed (JOLLY/RELAXED)
  destinationType: 'RIVAL' | 'RANDOM' | 'RETIRES' | 'STAYS' | 'HIGHEST_OPS' | 'CHAMPION' | 'WORST_TEAM';
  returnPlayer: {
    playerId: string;
    playerName: string;
    position: string;
    grade: string;
  } | null;  // null if player retired or stayed
}
```

### 17.4 Draft Pick

```typescript
interface DraftPick {
  round: number;
  pickNumber: number;
  teamId: string;
  teamName: string;
  selectedProspect: {
    prospectId: string;
    firstName: string;
    lastName: string;
    position: string;
    grade: string;
    age: number;
  };
  releasedPlayer: {
    playerId: string;
    playerName: string;
    position: string;
    grade: string;
  } | null;  // If team had full roster
  wasFromInactiveDB: boolean;  // If prospect was from inactive player database
}
```

### 17.5 Contraction/Expansion Event

```typescript
interface ContractionEvent {
  seasonId: number;
  teamId: string;
  teamName: string;
  fanMorale: number;
  probability: number;
  diceRoll: number;
  wasVoluntary: boolean;
  protectedPlayers: string[];
}

interface ExpansionEvent {
  seasonId: number;
  newTeamId: string;
  newTeamName: string;
  newTeamCity: string;
  initialRoster: string[];  // Player IDs from expansion draft
}
```

### 17.6 Farm Reconciliation

```typescript
interface FarmReconciliationResult {
  teamId: string;
  seasonId: number;
  mlbRosterCount: number;
  farmRosterCount: number;
  promotions: {
    playerId: string;
    playerName: string;
    fromLevel: 'FARM';
    toLevel: 'MLB';
    farmWAR: number;
  }[];
  demotions: {
    playerId: string;
    playerName: string;
    fromLevel: 'MLB';
    toLevel: 'FARM';
    reason: string;
  }[];
  needsReconciliation: boolean;
}
```

### 17.7 Chemistry Rebalancing

```typescript
interface ChemistryResult {
  teamId: string;
  seasonId: number;
  previousChemistry: number;
  newChemistry: number;
  delta: number;
  changes: ChemistryChange[];
}

interface ChemistryChange {
  type: 'VETERAN_LEADER' | 'TEAMMATE_BOND' | 'NEW_PLAYER' | 'CONFLICT' | 'DRAIN' | 'CHAMPIONSHIP_CORE';
  playerId: string;
  playerName: string;
  effect: number;  // Positive or negative
  description: string;
}
```

### 17.8 Offseason Trade

```typescript
interface OffseasonTrade {
  tradeId: string;
  seasonId: number;
  proposingTeam: string;
  receivingTeam: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
  playersGiven: {
    playerId: string;
    playerName: string;
    position: string;
    grade: string;
    salary: number;
  }[];
  playersReceived: {
    playerId: string;
    playerName: string;
    position: string;
    grade: string;
    salary: number;
  }[];
  draftSwaps: {
    round: number;
    direction: 'GIVE' | 'RECEIVE';
  }[];
  fairnessScore: number;  // 0.0 to 1.0
  timestamp: string;
}
```

---

## Appendix A: Offseason UI Flow

```
╔══════════════════════════════════════════════════════════════╗
║              KBL XHD TRACKER - OFFSEASON 2024                ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ┌──────────────────────────────────────────────────────────┐║
║  │ Phase 1: SEASON END PROCESSING                   [Done]  │║
║  │ Phase 2: AWARDS CEREMONY                         [Done]  │║
║  │ Phase 3: RATINGS ADJUSTMENT                      [Done]  │║
║  │ Phase 4: CONTRACTION/EXPANSION                   [Done]  │║
║  │ Phase 5: RETIREMENTS                            [Active] │║
║  │ Phase 6: FREE AGENCY                           [Pending] │║
║  │ Phase 7: DRAFT                                 [Pending] │║
║  │ Phase 8: FARM SYSTEM RECONCILIATION            [Pending] │║
║  │ Phase 9: CHEMISTRY REBALANCING                 [Pending] │║
║  │ Phase 10: OFFSEASON TRADES                     [Pending] │║
║  │ Phase 11: NEW SEASON PREP                      [Pending] │║
║  └──────────────────────────────────────────────────────────┘║
║                                                               ║
║  Progress: [████████░░░░░░░░░░░░] 40% Complete               ║
║                                                               ║
║  [Continue Retirements - New York Thunder]                    ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Appendix B: Quick Reference

### Critical Numbers

| Item | Value |
|------|-------|
| Roster Size | 22 |
| Retirements Per Team | 1-2 (target) |
| FA Rounds | 2 |
| FA Dice Range | 2-12 (two dice distribution) |
| FA Protected Players | 1 per team |
| FA Top Players at Risk | 11 per team |
| Draft Max Grade | A- |
| Draft Avg Grade | B- |
| Draft Min Per Position | 2 |
| Trade Value Tolerance | ±10% |

### Personality → FA Destination

| Personality | Destination |
|-------------|-------------|
| COMPETITIVE | Rival team |
| RELAXED | Random (may stay) |
| DROOPY | Retires |
| JOLLY | Stays |
| TOUGH | Highest OPS team |
| TIMID | Champion team |
| EGOTISTICAL | Worst team |

### FA Grade Exchange Rules

| Receiving Team Record | Return Player Grade |
|----------------------|---------------------|
| Better than losing team | Equal or better |
| Worse than losing team | Up to half grade worse |

### Phase Flow

```
Phase 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → NEW SEASON
                 ↓
          (Optional)
                 ↓
        Expansion/Contraction

Full Sequence:
1. Season End → 2. Awards → 3. Ratings → 4. Contraction/Expansion →
5. Retirements → 6. Free Agency → 7. Draft → 8. Farm Reconciliation →
9. Chemistry Rebalancing → 10. Offseason Trades → 11. New Season Prep
```

---

*This document is the authoritative source for all offseason processes. For in-season mechanics, see DYNAMIC_DESIGNATIONS_SPEC.md and FARM_SYSTEM_SPEC.md.*
