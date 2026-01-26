# KBL XHD Tracker - Comprehensive Offseason System Spec (v3)

> **Purpose**: Single source of truth for ALL offseason processes
> **Supersedes**: OFFSEASON_SYSTEM_SPEC v2 (awards-only version)
> **Created**: January 23, 2026
> **Integrates**: Personality System, Farm System, Contraction, FA Destinations, Chemistry Alignment

---

## Table of Contents

1. [Offseason Phase Overview](#1-offseason-phase-overview)
2. [User Interaction Model](#2-user-interaction-model)
3. [Phase 1: Season End Processing](#3-phase-1-season-end-processing)
4. [Phase 2: Awards Ceremony](#4-phase-2-awards-ceremony)
5. [Phase 3: True Value Recalibration](#5-phase-3-true-value-recalibration)
6. [Phase 4: Contraction Check](#6-phase-4-contraction-check)
7. [Phase 5: Retirement & Legacy](#7-phase-5-retirement--legacy)
8. [Phase 6: Free Agency](#8-phase-6-free-agency)
9. [Phase 7: Draft](#9-phase-7-draft)
10. [Phase 8: Farm System Reconciliation](#10-phase-8-farm-system-reconciliation)
11. [Phase 9: Chemistry Rebalancing](#11-phase-9-chemistry-rebalancing)
12. [Phase 10: Offseason Trades](#12-phase-10-offseason-trades)
13. [Phase 11: New Season Prep](#13-phase-11-new-season-prep)
14. [Hidden Personality System](#14-hidden-personality-system)
15. [Morale System](#15-morale-system)
16. [Hall of Fame Eligibility](#16-hall-of-fame-eligibility)
17. [Data Models](#17-data-models)

---

## 1. Offseason Phase Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OFFSEASON PHASE SEQUENCE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1 ──► PHASE 2 ──► PHASE 3 ──► PHASE 4 ──► PHASE 5 ──► PHASE 6       │
│  Season      Awards      True Value   Contraction  Retirement    Free       │
│  End         Ceremony    Recalib      Check        & Legacy      Agency     │
│                                                                              │
│  PHASE 7 ──► PHASE 8 ──► PHASE 9 ──► PHASE 10 ──► PHASE 11                 │
│  Draft       Farm         Chemistry    Offseason    New Season              │
│              Reconcile    Rebalance    Trades       Prep                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Roster Requirements

| Level | Size | Notes |
|-------|------|-------|
| MLB Roster | 22 players | Active roster |
| Farm Roster | 10 players | Development pool |
| **Total** | **32 players** | Per team |

---

## 2. User Interaction Model

> **Design Philosophy**: The offseason is designed as a "game night" experience, especially for 2+ player sessions. High-stakes moments use interactive ceremonies (dice rolls, wheel spins, card reveals) while bulk processing uses streamlined summaries with user advancement.

### 2.1 Interaction Types

| Type | Description | User Action | Example |
|------|-------------|-------------|---------|
| 🎲 **DICE ROLL** | Probability-based outcome | User clicks to roll | Contraction check, retirement saves |
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
│  PHASE 3: TRUE VALUE RECALIBRATION                                           │
│  └─ Contract Adjustments ................ ✅ Confirmation (summary table)   │
│                                                                              │
│  PHASE 4: CONTRACTION CHECK                                                  │
│  ├─ Per Team at Risk:                                                        │
│  │   ├─ Happiness Display ............... 👁️ Review                        │
│  │   ├─ Probability Reveal .............. 🃏 Card Reveal                    │
│  │   ├─ Fate Roll ....................... 🎲 DICE ROLL ← HIGH STAKES        │
│  │   ├─ (If contracted) Protected ........ 📋 Selection (×3)               │
│  │   └─ (If contracted) Expansion Draft .. 📋 Selection (per team)         │
│  └─ Voluntary Sale Option ............... 📋 Selection → 🎲 Dice Roll      │
│                                                                              │
│  PHASE 5: RETIREMENT & LEGACY                                                │
│  ├─ Per At-Risk Player:                                                      │
│  │   ├─ Probability Display ............. 👁️ Review                        │
│  │   └─ Retirement Roll ................. 🎲 DICE ROLL                      │
│  ├─ Retirement Summary .................. ✅ Confirmation                   │
│  ├─ Jersey Retirement Ceremony .......... 🏆 CEREMONY ← HIGH STAKES         │
│  │   └─ Per Eligible Retiree ............ 🃏 Card Reveal → 📋 Selection     │
│  └─ Hall of Fame Induction .............. 🏆 CEREMONY ← HIGH STAKES         │
│      └─ Per HOF Eligible ................ 🃏 Card Reveal (dramatic)         │
│                                                                              │
│  PHASE 6: FREE AGENCY                                                        │
│  ├─ Round 1-13 (Full Price):                                                 │
│  │   └─ Per FA: Destination Roll ........ 🃏 Card Reveal → 🎲 Dice Roll     │
│  ├─ Round 14 (AI Aggressive):                                                │
│  │   └─ AI Team Acquisitions ............ ✅ Confirmation (batch)           │
│  ├─ Round 15-25 (Discount):                                                  │
│  │   └─ Per FA: Destination Roll ........ 🃏 Card Reveal (streamlined)      │
│  ├─ Round 26-32 (Desperation):                                               │
│  │   └─ Remaining FA Placement .......... ✅ Confirmation (batch)           │
│  └─ Change of Heart Events .............. 🃏 Card Reveal (surprise!)        │
│                                                                              │
│  PHASE 7: DRAFT                                                              │
│  ├─ Draft Lottery (Bottom 6) ............ 🎰 WHEEL SPIN ← HIGH STAKES       │
│  ├─ Draft Order Reveal .................. 🃏 Card Reveal (sequence)         │
│  └─ Per Pick:                                                                │
│      ├─ Available Prospects ............. 👁️ Review                        │
│      └─ Selection ....................... 📋 Selection                      │
│                                                                              │
│  PHASE 8: FARM RECONCILIATION                                                │
│  ├─ Roster Validation ................... ✅ Confirmation                   │
│  ├─ Overflow Handling ................... 📋 Selection (if needed)         │
│  └─ Revenge Arc Updates ................. 👁️ Review                        │
│                                                                              │
│  PHASE 9: CHEMISTRY REBALANCING                                              │
│  ├─ Change Detection .................... 👁️ Review                        │
│  └─ Impact Summary ...................... ✅ Confirmation                   │
│                                                                              │
│  PHASE 10: OFFSEASON TRADES                                                  │
│  ├─ Build Trade Package ................. 📋 Selection                      │
│  ├─ Review Trade Impact ................. 👁️ Review                        │
│  ├─ Submit Proposal ..................... ✅ Confirmation                   │
│  ├─ AI Response (Single-player) ......... 🃏 Card Reveal                    │
│  ├─ Counter Negotiation ................. 📋 Selection                      │
│  └─ Finalize Trades ..................... ✅ Confirmation                   │
│                                                                              │
│  PHASE 11: NEW SEASON PREP                                                   │
│  ├─ Reset Summary ....................... ✅ Confirmation                   │
│  ├─ Opening Day Validation .............. ✅ Confirmation                   │
│  └─ Season Ready! ....................... ✅ Confirmation                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 High-Stakes Ceremonies

These moments get full dramatic treatment with animations, sound effects, and suspense:

| Moment | Ceremony Type | Stakes | Animation |
|--------|---------------|--------|-----------|
| **Contraction Fate Roll** | 🎲 Dice Roll | Team survival | Dice tumble, dramatic pause, result flash |
| **Draft Lottery** | 🎰 Wheel Spin | #1 pick | Spinning wheel, slowdown, winner highlight |
| **MVP Announcement** | 🃏 Card Reveal | League's best | Envelope open, card flip, confetti |
| **Cy Young Announcement** | 🃏 Card Reveal | Pitching crown | Same as MVP |
| **Trait Lottery** | 🎰 Wheel Spin | Player upgrade | Slot machine style, trait icons spinning |
| **FA Destination (Stars)** | 🃏 Card Reveal | Marquee signing | Team logo reveal, "Welcome to..." |
| **Retirement Decision** | 🎲 Dice Roll | Career end | Slower roll, emotional result |
| **Jersey Retirement** | 🏆 Ceremony | Legacy honor | Jersey rising to rafters, number spotlight |
| **Hall of Fame Induction** | 🏆 Ceremony | Ultimate honor | Plaque reveal, career highlight reel, HOF logo |

### 2.4 Ceremony UI Examples

#### Dice Roll Ceremony
```
╔══════════════════════════════════════════════════════════════╗
║                   🎲 CONTRACTION FATE 🎲                      ║
║                   Detroit Diamonds                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Fan Morale: 23                                            ║
║  Survival Threshold: 65 or higher                             ║
║                                                               ║
║                    ┌─────────────┐                            ║
║                    │             │                            ║
║                    │     🎲      │                            ║
║                    │             │                            ║
║                    └─────────────┘                            ║
║                                                               ║
║              [ 🎲 ROLL FOR YOUR TEAM'S FATE 🎲 ]              ║
║                                                               ║
║  (Click to roll - Result is final, no re-rolls)              ║
╚══════════════════════════════════════════════════════════════╝
```

#### Post-Roll Result (Survived)
```
╔══════════════════════════════════════════════════════════════╗
║                   🎲 CONTRACTION FATE 🎲                      ║
║                   Detroit Diamonds                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║                    ┌─────────────┐                            ║
║                    │             │                            ║
║                    │     72      │                            ║
║                    │             │                            ║
║                    └─────────────┘                            ║
║                                                               ║
║               ✨ SURVIVED! (72 ≥ 65) ✨                       ║
║                                                               ║
║     The Detroit Diamonds live to fight another season!       ║
║                                                               ║
║                      [Continue]                               ║
╚══════════════════════════════════════════════════════════════╝
```

#### Post-Roll Result (Contracted)
```
╔══════════════════════════════════════════════════════════════╗
║                   🎲 CONTRACTION FATE 🎲                      ║
║                   Detroit Diamonds                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║                    ┌─────────────┐                            ║
║                    │             │                            ║
║                    │     28      │                            ║
║                    │             │                            ║
║                    └─────────────┘                            ║
║                                                               ║
║              💔 CONTRACTED (28 < 65) 💔                       ║
║                                                               ║
║     The Detroit Diamonds will cease operations.              ║
║     Time to protect your players...                          ║
║                                                               ║
║                 [Begin Protection Phase]                      ║
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
║  ☑ Contraction Fate Rolls                                    ║
║  ☑ Draft Lottery                                             ║
║  ☑ MVP/Cy Young Announcements                                ║
║  ☑ Jersey Retirement Ceremonies                              ║
║  ☑ Hall of Fame Inductions                                   ║
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

## 5. Phase 3: True Value Recalibration

### 5.1 Dynamic Salary Philosophy

- **True Value**: Floats based on actual WAR performance
- **Contract Salary**: Fixed during season
- **Recalibration**: EOS adjusts contract to match True Value

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

## 6. Phase 4: Contraction Check

### 6.1 Contraction Triggers

Contraction is checked when fan morale falls below critical thresholds.

| Happiness Range | Contraction Probability |
|-----------------|------------------------|
| 40-49 | 5% |
| 30-39 | 15% |
| 20-29 | 35% |
| 10-19 | 60% |
| 0-9 | 85% |

### 6.2 Voluntary Team Sale

User may choose to "sell the team" at any happiness level. This triggers:

1. **If Happiness ≥ 50**: Normal contraction (no special effects)
2. **If Happiness < 50**: Normal contraction (expected by players)
3. **SCORNED PLAYER SYSTEM** (Happiness ≥ 50 only):

```typescript
interface ScornedPlayerEffect {
  // Personality shifts toward negative
  personalityShift: 'DROOPY' | 'EGOTISTICAL' | 'TOUGH';  // random

  // Trust damage affects future loyalty gains
  trustDamage: number;  // -20 to -40 base

  // Performance volatility for 2 seasons
  volatilityDuration: 2;
  volatilityRange: [-15, +10];  // Rating swing per game
}
```

### 6.3 Contraction Process

```
╔══════════════════════════════════════════════════════════════╗
║                   CONTRACTION EVENT                           ║
║                   Detroit Diamonds                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Fan Morale: 23                                            ║
║  Contraction Probability: 35%                                 ║
║                                                               ║
║  🎲 Rolling dice...                                           ║
║                                                               ║
║  Result: 28 (≤35 = CONTRACTED)                               ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  CONTRACTION PROCESSING:                                      ║
║                                                               ║
║  1. Protected Players (4 total):                              ║
║     • [Cornerstone] Marcus Johnson (SS)                       ║
║     • [User Choice] Tommy Richards (SP)                       ║
║     • [User Choice] Jake Wilson (CF)                          ║
║     • [User Choice] Diego Martinez (CP)                       ║
║                                                               ║
║  2. Expansion Draft Pool: 18 players                          ║
║     → Each expansion team selects: 1 Position + 1 Pitcher    ║
║                                                               ║
║  3. Retirement Check Processing...                            ║
║                                                               ║
║  [Continue]                                                   ║
╚══════════════════════════════════════════════════════════════╝
```

### 6.4 Protection Rules

| Protection Slot | Rule |
|-----------------|------|
| 1 (Auto) | Cornerstone (if exists) → becomes **Legacy Cornerstone** |
| 2-4 (User) | User selects 3 additional players |

**Legacy Cornerstone**: Special designation for cornerstone of contracted team.
- Carries tragic narrative weight
- Affects future team chemistry considerations
- Permanent designation (never removed)

### 6.5 Expansion Draft (from Contraction)

Each existing team may select from the contraction pool:
- **1 Position Player**
- **1 Pitcher**

Selection order: Reverse standings (worst team picks first).

### 6.6 Remaining Players

After expansion draft, remaining players enter:
1. **Retirement Check** (with contraction modifier: +30% retirement probability)
2. **Free Agency Pool** (if not retired)

---

## 7. Phase 5: Retirement & Legacy

### 7.1 Base Retirement Probability

| Age | Base Probability |
|-----|------------------|
| 18-29 | 0% |
| 30-34 | 5% |
| 35-37 | 15% |
| 38-40 | 30% |
| 41-44 | 50% |
| 45-49 | 75% |

### 7.2 Retirement Modifiers

| Factor | Modifier |
|--------|----------|
| Low Morale (≤30) | +20% |
| Very Low Morale (≤15) | +35% |
| From Contracted Team | +30% |
| Multiple Demotions (Season) | +15% per demotion |
| Scorned Player | +25% |
| Personality: DROOPY | +10% |
| Personality: COMPETITIVE | -10% |
| Championship Winner | -15% |
| HOF Track | -20% |

### 7.3 Retirement Check

```typescript
function checkRetirement(player: Player, context: RetirementContext): boolean {
  let probability = getBaseRetirementProbability(player.age);

  // Apply modifiers
  probability += getMoraleModifier(player.morale);
  probability += getContractionModifier(context.fromContractedTeam);
  probability += getDemotionModifier(player.seasonDemotions);
  probability += getPersonalityModifier(player.personality);
  probability += getAchievementModifier(player);

  // Cap at 95% (always a chance to continue)
  probability = Math.min(probability, 0.95);

  return Math.random() < probability;
}
```

### 7.4 Retirement Processing UI

```
╔══════════════════════════════════════════════════════════════╗
║                   RETIREMENT PROCESSING                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Checking 47 eligible players...                              ║
║                                                               ║
║  RETIRED:                                                     ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ • Roger Clemens (Age 42) - "Going out on top"          │  ║
║  │ • Tony Gwynn (Age 39) - "Time to spend with family"    │  ║
║  │ • Mark McGwire (Age 37) - Low morale triggered         │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  CONTINUING:                                                  ║
║  44 players remain active                                     ║
║                                                               ║
║  [View Retired Player Details]  [Continue to Free Agency]    ║
╚══════════════════════════════════════════════════════════════╝
```

### 7.5 Jersey Retirement

Jersey retirement is entirely user-driven. When players retire, the user chooses which players (if any) should have their numbers retired by each team they played for.

#### Jersey Retirement Rules

- Each team can retire **unlimited** jerseys (historical accuracy)
- Retired numbers cannot be reassigned to future players
- Multiple teams may retire same player's number (user's choice)
- **No eligibility criteria** - entirely user discretion
- User can retire any retiring player's number for any team they played for

```typescript
interface JerseyRetirement {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  teamId: string;
  teamName: string;
  retirementYear: number;
  // Career context shown to user (informational only, not criteria)
  seasonsWithTeam: number;
  warWithTeam: number;
  achievements: string[]; // MVP, Cy Young, etc. with this team
}

interface RetirementCandidate {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  teamsPlayedFor: {
    teamId: string;
    teamName: string;
    seasons: number;
    war: number;
    highlights: string[]; // Notable achievements with team
  }[];
}

// Present ALL retiring players to user for selection
function getRetirementCandidates(
  retiringPlayers: Player[]
): RetirementCandidate[] {
  return retiringPlayers.map(player => ({
    playerId: player.id,
    playerName: player.name,
    jerseyNumber: player.number,
    teamsPlayedFor: player.teamHistory.map(team => ({
      teamId: team.id,
      teamName: team.name,
      seasons: team.seasons,
      war: team.war,
      highlights: team.achievements
    }))
  }));
}
```

#### Jersey Retirement UI Flow

```
╔══════════════════════════════════════════════════════════════╗
║              🏆 JERSEY RETIREMENT CEREMONY 🏆                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  This season's retirees - select jerseys to retire:          ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ DEREK JETER (#2)                                       │  ║
║  │ ┌──────────────────────────────────────────────────┐   │  ║
║  │ │ ☑ New York Thunder                               │   │  ║
║  │ │   14 seasons | 42.8 WAR | 1× MVP | 2× Champion   │   │  ║
║  │ └──────────────────────────────────────────────────┘   │  ║
║  │                                                         │  ║
║  │ KEN GRIFFEY JR. (#24)                                  │  ║
║  │ ┌──────────────────────────────────────────────────┐   │  ║
║  │ │ ☑ Seattle Mariners                               │   │  ║
║  │ │   11 seasons | 52.3 WAR | Cornerstone (9 yrs)    │   │  ║
║  │ ├──────────────────────────────────────────────────┤   │  ║
║  │ │ ☐ Cincinnati Reds (#30)                          │   │  ║
║  │ │   6 seasons | 12.1 WAR | 1× All-Star             │   │  ║
║  │ └──────────────────────────────────────────────────┘   │  ║
║  │                                                         │  ║
║  │ MARIANO RIVERA (#42)                                   │  ║
║  │ ┌──────────────────────────────────────────────────┐   │  ║
║  │ │ ☐ New York Thunder                               │   │  ║
║  │ │   17 seasons | 38.2 WAR | 5× Champion            │   │  ║
║  │ └──────────────────────────────────────────────────┘   │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  Selected: 2 jersey retirements                               ║
║                                                               ║
║  [Skip All]              [Proceed with Selected Retirements]  ║
╚══════════════════════════════════════════════════════════════╝
```

#### Retirement Ceremony Animation

When user confirms selections, each retirement gets a brief ceremony:

```
╔══════════════════════════════════════════════════════════════╗
║                                                               ║
║                    ┌─────────────────┐                        ║
║                    │                 │                        ║
║                    │       2         │                        ║
║                    │                 │                        ║
║                    │  DEREK JETER    │                        ║
║                    │                 │                        ║
║                    └─────────────────┘                        ║
║                                                               ║
║            🎉 NEW YORK THUNDER RETIRE #2 🎉                   ║
║                                                               ║
║                   "The Captain Forever"                        ║
║                                                               ║
║  [Continue]                                                   ║
╚══════════════════════════════════════════════════════════════╝
```

### 7.6 Hall of Fame Induction

After jersey retirements, check for Hall of Fame inductions.

#### HOF Ceremony Timing

- HOF eligibility is checked when player retires
- Induction ceremony occurs in the same offseason as retirement
- "First ballot" designation if inducted immediately upon retirement

#### Induction Ceremony Flow

1. **Announcement**: Card reveal showing inductee
2. **Career Summary**: Display career stats and achievements
3. **Path Indicator**: Show which path qualified (Per-Season or Cumulative)
4. **Primary Team**: Designate which team cap they wear on plaque
5. **Speech Moment**: Brief narrative text about their legacy

```typescript
interface HOFInduction {
  playerId: string;
  inductionYear: number;
  path: 'PER_SEASON' | 'CUMULATIVE' | 'BOTH';
  primaryTeam: string;
  firstBallot: boolean;
  careerWAR: number;
  avgWARPerSeason: number;
  allStarSelections: number;
  mvpAwards: number;
  cyYoungAwards: number;
  championships: number;
  goldGloves: number;
}
```

#### Primary Team Selection

When a player qualifies, user selects which team cap appears on their plaque:

| Rule | Application |
|------|-------------|
| Default | Team with most seasons |
| Override | User can select any team with ≥3 seasons |
| Legacy Cornerstone | Auto-default to contracted team (if applicable) |

---

## 8. Phase 6: Free Agency

### 8.1 Free Agency Eligibility

Players become free agents when:
- Contract expires
- Released by team
- Team contracted (and not protected/drafted)
- Voluntary departure (low loyalty + morale)

### 8.2 FA Absorption Cap

**Rule**: Each team may absorb maximum **3 free agents** per offseason.

**Homecoming Exception**: Players returning to a team they previously played for do NOT count against the cap.

```typescript
function canAbsorbFreeAgent(team: Team, player: Player): boolean {
  const currentAbsorptions = team.offseasonAbsorptions.length;
  const isHomecoming = player.previousTeams.includes(team.id);

  if (isHomecoming) return true;  // Exempt from cap
  return currentAbsorptions < 3;
}
```

### 8.3 Weighted FA Destination System

Each personality type has base destination preferences:

```typescript
const FA_DESTINATION_WEIGHTS: Record<Personality, DestinationWeights> = {
  COMPETITIVE: {
    CONTENDER: 45,      // Wants to win
    CURRENT_TEAM: 25,   // Loyalty matters
    HOMETOWN: 15,       // Some pull
    HIGHEST_BIDDER: 10, // Money secondary
    RANDOM: 5
  },
  RELAXED: {
    CURRENT_TEAM: 40,   // Comfortable where they are
    HOMETOWN: 25,       // Family ties
    CONTENDER: 15,      // Winning is nice
    HIGHEST_BIDDER: 15, // Decent money
    RANDOM: 5
  },
  DROOPY: {
    CURRENT_TEAM: 15,   // Wants change
    HOMETOWN: 20,       // Familiar comfort
    CONTENDER: 10,      // Doesn't believe in self
    HIGHEST_BIDDER: 25, // At least get paid
    RANDOM: 30          // Drifting
  },
  JOLLY: {
    CURRENT_TEAM: 30,   // Loves the guys
    CONTENDER: 25,      // Fun to win
    HOMETOWN: 20,       // Family is joy
    RANDOM: 20,         // Adventure!
    HIGHEST_BIDDER: 5   // Money isn't everything
  },
  TOUGH: {
    CONTENDER: 35,      // Prove themselves
    HIGHEST_BIDDER: 30, // Respect = money
    CURRENT_TEAM: 20,   // If treated well
    HOMETOWN: 10,       // Doesn't matter
    RANDOM: 5
  },
  TIMID: {
    CURRENT_TEAM: 50,   // Fear of change
    HOMETOWN: 25,       // Safe space
    HIGHEST_BIDDER: 10, // Doesn't negotiate well
    CONTENDER: 10,      // Scared of spotlight
    RANDOM: 5
  },
  EGOTISTICAL: {
    HIGHEST_BIDDER: 45, // Worth it
    CONTENDER: 30,      // Wants the glory
    CURRENT_TEAM: 10,   // Unless they worship me
    HOMETOWN: 10,       // Hero's return
    RANDOM: 5
  }
};
```

### 8.4 Morale Modifiers on FA Weights

```typescript
function applyMoraleModifier(
  baseWeights: DestinationWeights,
  morale: number
): DestinationWeights {
  const modified = { ...baseWeights };

  if (morale <= 30) {
    // Low morale: Less likely to stay, more likely to leave
    modified.CURRENT_TEAM *= 0.5;
    modified.RANDOM *= 1.5;
    modified.HIGHEST_BIDDER *= 1.3;
  } else if (morale >= 70) {
    // High morale: More likely to stay
    modified.CURRENT_TEAM *= 1.5;
    modified.RANDOM *= 0.5;
  }

  return normalizeWeights(modified);
}
```

### 8.5 FA Destination Resolution

```typescript
function resolveFADestination(player: Player, availableTeams: Team[]): Team {
  const weights = applyMoraleModifier(
    FA_DESTINATION_WEIGHTS[player.personality],
    player.morale
  );

  // Roll for destination type
  const destinationType = weightedRandom(weights);

  // Get candidate teams for this type
  let candidates = getCandidatesForType(destinationType, player, availableTeams);

  // Filter by absorption cap
  candidates = candidates.filter(t => canAbsorbFreeAgent(t, player));

  // If no valid candidates, cascade to next preference
  if (candidates.length === 0) {
    return cascadeToNextPreference(player, weights, availableTeams);
  }

  // Within candidates, select by salary fit (within 10% of True Value)
  return selectBySalaryFit(candidates, player.trueValue);
}
```

### 8.6 Salary Swap Rule

FA signings must be within **10% of True Value**:

```typescript
function isValidSalaryOffer(offer: number, trueValue: number): boolean {
  const minAcceptable = trueValue * 0.9;
  const maxAcceptable = trueValue * 1.1;
  return offer >= minAcceptable && offer <= maxAcceptable;
}
```

### 8.7 "Change of Heart" Mechanic

5% chance per FA that their destination type shifts unexpectedly:

```typescript
function checkChangeOfHeart(player: Player): DestinationType | null {
  if (Math.random() < 0.05) {
    // Random destination type (excluding their #1 preference)
    const alternatives = Object.keys(FA_DESTINATION_WEIGHTS[player.personality])
      .filter(type => type !== getTopPreference(player));
    return randomChoice(alternatives);
  }
  return null;
}
```

### 8.8 32-Round FA Structure

```
Round 1-13:  Players at full asking price
Round 14:    AI teams aggressively fill gaps
Round 15-25: Players reduce demands 5% per round
Round 26-32: Desperation pricing (up to 50% off)
```

---

## 9. Phase 7: Draft

### 9.1 Draft Structure

**League-Wide Combined Draft Pool**: All teams pick from the SAME draft class in reverse standings order.

**Draft Order:**
1. **Lottery** for bottom 6 teams (worst record = most balls)
2. **Reverse standings** for remaining teams
3. **Expansion teams** pick after worst-record team (if applicable)
4. Snake draft format (1→N, N→1, 1→N...)

### 9.2 Draft Pool Generation

**Formula**: `Draft Pool Size = 3 × (Total League Gaps)` with minimum 10 players

```typescript
function calculateDraftPoolSize(teams: Team[]): number {
  let totalGaps = 0;

  for (const team of teams) {
    const mlbGap = Math.max(0, 22 - team.mlbRoster.length);
    const farmGap = Math.max(0, 10 - team.farmRoster.length);
    totalGaps += mlbGap + farmGap;
  }

  // 3× total gaps, minimum 10 players (always meaningful choices)
  return Math.max(10, totalGaps * 3);
}
```

### 9.3 Position Coverage Minimum

Draft pool must include minimum coverage:

| Position Group | Minimum Count |
|----------------|---------------|
| C | 2 |
| IF (1B, 2B, SS, 3B) | 6 |
| OF (LF, CF, RF) | 4 |
| SP | 4 |
| RP/CP | 3 |

### 9.4 Draft Prospect Ratings

Prospects generated with ratings following normal distribution:

| Rating Range | Probability | Description |
|--------------|-------------|-------------|
| B | 10% | Top prospect |
| B- | 20% | Above average |
| C+ | 40% | Average |
| C | 20% | Below average |
| C- | 10% | Project player |

### 9.5 Draft Rounds (Snake Format)

### 9.5 Draft Rounds

```
Round 1-3:  MLB-ready prospects (can start immediately)
Round 4-6:  Development prospects (start on farm)
Round 7+:   Deep prospects (farm only, longer development)
```

---

## 10. Phase 8: Farm System Reconciliation

### 10.1 Post-Draft Farm Check

After draft, verify each team has:
- **22 MLB players** (or filled via draft)
- **10 Farm players** (or filled via draft)

### 10.2 Farm Overflow Handling

If farm exceeds 10 after draft:
1. User selects players to release
2. Released players enter next season's FA pool

### 10.3 Graduation Candidates

Identify farm players ready for MLB:
- Rating improved to B- or better
- 2+ seasons in farm system
- No significant development blockers

### 10.4 Revenge Arc Check

For any traded players who outperformed:

```typescript
interface RevengeArcStatus {
  playerId: string;
  originalTeam: string;
  tradeReason: string;
  yearsActive: number;
  currentMultiplier: number;  // Starts at 1.0, decreases 50% per year
}

function updateRevengeArcs(players: Player[]): void {
  for (const player of players) {
    if (player.revengeArc) {
      // Check if outperformed expectations
      if (player.seasonWAR > player.projectedWAR) {
        triggerRevengeNarrative(player);
      }

      // Decay multiplier (50% per year)
      player.revengeArc.currentMultiplier *= 0.5;

      // Remove if negligible
      if (player.revengeArc.currentMultiplier < 0.1) {
        player.revengeArc = null;
      }
    }
  }
}
```

---

## 11. Phase 9: Chemistry Rebalancing

### 11.1 Chemistry Potency Levels

| Players of Type | Potency Level | Bonus |
|-----------------|---------------|-------|
| 0-2 | Level 1 | Minimal |
| 3-6 | Level 2 | Moderate |
| 7+ | Level 3 | Maximum |

### 11.2 Chemistry Change Detection

```typescript
function detectChemistryChanges(
  team: Team,
  previousComposition: ChemistryComposition
): ChemistryChange[] {
  const changes: ChemistryChange[] = [];
  const currentComposition = calculateChemistryComposition(team);

  for (const chemType of CHEMISTRY_TYPES) {
    const prevLevel = getPotencyLevel(previousComposition[chemType]);
    const currLevel = getPotencyLevel(currentComposition[chemType]);

    if (prevLevel !== currLevel) {
      changes.push({
        chemistryType: chemType,
        previousLevel: prevLevel,
        newLevel: currLevel,
        affectedPlayers: team.roster.filter(p => p.chemistry === chemType)
      });
    }
  }

  return changes;
}
```

### 11.3 Chemistry Change Effects

When potency level changes:

**Level Down (e.g., Level 3 → Level 2)**:
```typescript
function applyChemistryDowngrade(change: ChemistryChange): void {
  for (const player of change.affectedPlayers) {
    // Morale hit
    player.morale -= 10;

    // Happiness hit (if cornerstone/fan favorite of that chemistry)
    if (player.designation === 'CORNERSTONE' ||
        player.designation === 'FAN_FAVORITE') {
      team.fanMorale -= 2;
    }

    // Log narrative event
    logEvent({
      type: 'CHEMISTRY_LOSS',
      description: `${player.name} feels the team chemistry shifting...`,
      impact: 'NEGATIVE'
    });
  }
}
```

**Level Up (e.g., Level 1 → Level 2)**:
```typescript
function applyChemistryUpgrade(change: ChemistryChange): void {
  for (const player of change.affectedPlayers) {
    // Morale boost
    player.morale += 5;

    // Small happiness boost
    if (player.designation) {
      team.fanMorale += 1;
    }
  }
}
```

### 11.4 Chemistry Alignment Report

```
╔══════════════════════════════════════════════════════════════╗
║                CHEMISTRY REBALANCING REPORT                   ║
║                New York Thunder                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  CHANGES DETECTED:                                            ║
║                                                               ║
║  ▼ COMPETITIVE (Orange): Level 3 → Level 2                   ║
║    Lost: Marcus Johnson (traded), Tony Richards (retired)     ║
║    Affected Players: 5 (morale -10 each)                      ║
║    Cornerstone Impact: Jake Wilson feeling unsettled          ║
║                                                               ║
║  ▲ SCHOLARLY (Blue): Level 1 → Level 2                       ║
║    Gained: Miguel Santos (FA), Draft Pick #14                 ║
║    Affected Players: 4 (morale +5 each)                       ║
║                                                               ║
║  ═ SPIRITED (Yellow): Level 2 (unchanged)                    ║
║  ═ CRAFTY (Green): Level 1 (unchanged)                       ║
║  ═ DISCIPLINED (Purple): Level 2 (unchanged)                 ║
║                                                               ║
║  Net Fan Morale Change: -3                                 ║
║                                                               ║
║  [View Affected Players]  [Continue]                          ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 12. Phase 10: Offseason Trades

> **Full specification**: See [TRADE_SYSTEM_SPEC.md](./TRADE_SYSTEM_SPEC.md) for complete trade system details.

### 12.1 Purpose

The final roster-building opportunity before the new season begins. Allows teams to address gaps that FA and Draft didn't fill.

### 12.2 Timing

- **Opens**: After Draft completion
- **Closes**: When all users confirm "Ready for Season"
- **Duration**: Unlimited (no time pressure)

### 12.3 Trade Matching Rule

Trade packages must have **combined Contract Values within 10%** of each other.

```
Example:
  Team A offers: $15M in contracts
  Team B must offer: $13.5M - $16.5M range
```

### 12.4 Tradeable Assets

| Asset Type | Notes |
|------------|-------|
| MLB Players | Any player on 22-man roster |
| Farm Prospects | Valued at contract tied to ratings distribution |
| Draft Swaps | Upcoming draft only, position swap (not picks) |

### 12.5 Key Features

- **No trade limits** - Teams can make unlimited trades
- **No restrictions** on recently traded players
- **No no-trade clauses** - Any player can be moved
- **Counter-offers** supported (AI and user-to-user)
- **Trade veto** available in multiplayer mode

### 12.6 Trade Impacts

Trades affect:
- **Player Morale**: Based on personality, destination, chemistry fit
- **Team Chemistry**: Lost/gained pairs recalculated
- **Expected Wins**: Dynamic update after each trade
- **Fan Morale**: Immediate reaction + season-end assessment

### 12.7 Interaction Model

| Element | Type | Description |
|---------|------|-------------|
| Build Trade Package | 📋 SELECTION | User selects assets to include |
| Review Impact Preview | 👁️ REVIEW | See morale, chemistry, Expected Wins changes |
| Submit Proposal | ✅ CONFIRMATION | Confirm and send to other team |
| AI Response (Single-player) | 🃏 CARD REVEAL | Accept/Counter/Reject revealed |
| Counter Negotiation | 📋 SELECTION | Adjust package based on counter |

### 12.8 Phase Completion

Phase ends when:
- All users confirm "Ready for Season"
- No pending trade proposals exist
- Roster validation passes for all teams

---

## 13. Phase 11: New Season Prep

### 13.1 Reset Checklist

| Item | Action |
|------|--------|
| Player Mojos | Reset to NORMAL |
| Seasonal Stats | Archive and clear |
| Clutch Counters | Reset to 0 |
| Fame Counters | Reset (career totals preserved) |
| Injury Status | Clear (unless long-term) |
| Demotion Counters | Reset seasonal (career preserved) |

### 13.2 Designation Carryover

Per DYNAMIC_DESIGNATIONS_SPEC:
- Cornerstones: 80% carryover
- Fan Favorites: Clear at 10% projection
- Albatrosses: Clear at 10% projection
- Rising Stars: Fresh evaluation

### 13.3 Contract Year Flags

Identify players in final contract year:
- Mark as "Contract Year" for narrative events
- Affects FA eligibility next offseason

### 13.4 Opening Day Roster Validation

```typescript
function validateOpeningDayRoster(team: Team): ValidationResult {
  const errors: string[] = [];

  if (team.mlbRoster.length !== 22) {
    errors.push(`MLB roster has ${team.mlbRoster.length} players (need 22)`);
  }

  if (team.farmRoster.length !== 10) {
    errors.push(`Farm roster has ${team.farmRoster.length} players (need 10)`);
  }

  if (!hasPosition(team.mlbRoster, 'C', 2)) {
    errors.push('Need at least 2 catchers on MLB roster');
  }

  if (!hasPosition(team.mlbRoster, 'SP', 5)) {
    errors.push('Need at least 5 starting pitchers');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## 14. Hidden Personality System

### 14.1 Personality Types

Personalities are **HIDDEN** from the user. They affect behavior but are never directly shown.

| Personality | Description | Behavioral Tendency |
|-------------|-------------|---------------------|
| **COMPETITIVE** | Driven to win | Seeks contenders, responds to challenges |
| **RELAXED** | Easy-going | Comfortable with status quo |
| **DROOPY** | Pessimistic | Prone to slumps, drifts in FA |
| **JOLLY** | Optimistic | Loves teammates, adventurous |
| **TOUGH** | Resilient | Bounces back, values respect |
| **TIMID** | Anxious | Fears change, avoids spotlight |
| **EGOTISTICAL** | Self-focused | Wants money and glory |

### 14.2 Personality Distribution

New players assigned personality via weighted random:

| Personality | Weight |
|-------------|--------|
| COMPETITIVE | 20% |
| RELAXED | 20% |
| JOLLY | 15% |
| TOUGH | 15% |
| TIMID | 10% |
| DROOPY | 10% |
| EGOTISTICAL | 10% |

### 14.3 Personality Shifts

Personalities can shift due to major events:

| Event | Possible Shift |
|-------|----------------|
| Championship Win | → COMPETITIVE, JOLLY |
| Team Contracted (Happy) | → DROOPY, EGOTISTICAL, TOUGH |
| Multiple Demotions | → DROOPY, TIMID |
| Career Achievement | → EGOTISTICAL, COMPETITIVE |
| Great Teammate Traded | → DROOPY |

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
  TEAM_CONTRACTED: { type: 'NEGATIVE', magnitude: -25, source: 'TEAM' },
  CHEMISTRY_DOWNGRADE: { type: 'NEGATIVE', magnitude: -10, source: 'CHEMISTRY' },
  DEMOTED: { type: 'NEGATIVE', magnitude: -12, source: 'TRANSACTION' },
  CALLED_UP: { type: 'POSITIVE', magnitude: +8, source: 'TRANSACTION' },
  TEAMMATE_RETIRED: { type: 'NEGATIVE', magnitude: -5, source: 'TEAM' },
  CHAMPIONSHIP: { type: 'POSITIVE', magnitude: +20, source: 'TEAM' }
};
```

---

## 16. Hall of Fame Eligibility

> **AUTHORITATIVE DECISION (January 2026)**: **Dynamic Top 10%** is the authoritative methodology for Hall of Fame eligibility. Fixed thresholds (from MILESTONE_SYSTEM_SPEC.md Section 5.0) serve only as a minimum floor for early-franchise situations.

### 16.1 Dual-Path Eligibility

Players can qualify via EITHER path (not both required):

**Path A: Per-Season Excellence** (Short brilliant career)
- Minimum 5 seasons
- Average WAR per season in **top 10% of league** (dynamically calculated)

**Path B: Cumulative Achievement** (Long productive career)
- Minimum 10 seasons
- Career WAR total in **top 10% of all-time** (dynamically calculated)

### 16.2 Dynamic Threshold Calculation

> **Cross-Reference**: See MILESTONE_SYSTEM_SPEC.md Section 5.0 for the full dual-threshold system (Dynamic 10% primary, Fixed Floor secondary).

```typescript
function calculateHOFThresholds(
  leagueHistory: LeagueHistory
): HOFThresholds {
  // Per-Season threshold (top 10% of seasonal WAR)
  const allSeasonWARs = leagueHistory.getAllSeasonWARs();
  const perSeasonThreshold = percentile(allSeasonWARs, 90);

  // Cumulative threshold (top 10% of career WAR)
  const allCareerWARs = leagueHistory.getAllCareerWARs();
  const cumulativeThreshold = percentile(allCareerWARs, 90);

  // Apply fixed floor minimums (prevents easy HOF in early franchise years)
  // See MILESTONE_SYSTEM_SPEC.md Section 5.0 for floor values
  const FIXED_FLOOR_AVG_WAR = 4.0;   // Minimum avg WAR/season for Path A
  const FIXED_FLOOR_CAREER_WAR = 50; // Minimum career WAR for Path B

  return {
    perSeasonAverage: Math.max(perSeasonThreshold, FIXED_FLOOR_AVG_WAR),
    cumulativeTotal: Math.max(cumulativeThreshold, FIXED_FLOOR_CAREER_WAR),
    lastUpdated: new Date()
  };
}
```

### 16.3 HOF Tracking

```typescript
interface HOFCandidate {
  playerId: string;
  careerSeasons: number;
  totalCareerWAR: number;
  averageWARPerSeason: number;

  // Path A tracking
  pathA_Eligible: boolean;
  pathA_Progress: number;  // % toward threshold

  // Path B tracking
  pathB_Eligible: boolean;
  pathB_Progress: number;  // % toward threshold

  // Overall
  hofEligible: boolean;  // true if either path met
  hofInducted: boolean;
  inductionYear: number | null;
}
```

---

## 17. Data Models

### 17.1 Offseason State

```typescript
interface OffseasonState {
  seasonId: number;
  currentPhase: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  phaseProgress: number;  // 0-100%

  // Phase-specific data
  awardsProcessed: Award[];
  contractsRecalibrated: ContractUpdate[];
  contractionOccurred: boolean;
  contractionTeam: string | null;
  retirees: Player[];
  freeAgents: FAResolution[];
  draftPicks: DraftPick[];
  chemistryChanges: ChemistryChange[];

  // Validation
  rosterValidation: Record<string, ValidationResult>;
  readyForNewSeason: boolean;
}
```

### 17.2 FA Resolution

```typescript
interface FAResolution {
  playerId: string;
  playerName: string;
  previousTeam: string;
  newTeam: string;
  destinationType: DestinationType;
  wasHomecoming: boolean;
  salary: number;
  trueValue: number;
  roundSigned: number;
  changeOfHeart: boolean;
}
```

### 17.3 Contraction Event

```typescript
interface ContractionEvent {
  seasonId: number;
  teamId: string;
  teamName: string;
  fanMorale: number;
  probability: number;
  diceRoll: number;
  wasVoluntary: boolean;

  protectedPlayers: string[];  // Player IDs
  expansionDraftResults: ExpansionPick[];
  retiredFromContraction: string[];
  enteredFAPool: string[];

  scornedPlayers: ScornedPlayer[];  // If voluntary with high happiness
  legacyCornerstone: string | null;
}
```

### 17.4 Chemistry Change

```typescript
interface ChemistryChange {
  teamId: string;
  chemistryType: ChemistryType;
  previousLevel: 1 | 2 | 3;
  newLevel: 1 | 2 | 3;
  direction: 'UP' | 'DOWN';
  affectedPlayerIds: string[];
  moraleImpact: number;
  happinessImpact: number;
}
```

### 17.5 Scorned Player

```typescript
interface ScornedPlayer {
  playerId: string;
  originalTeam: string;
  originalPersonality: Personality;
  shiftedPersonality: Personality;
  trustDamage: number;
  volatilityRemaining: number;  // Seasons
  volatilityRange: [number, number];
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
║  │ Phase 3: TRUE VALUE RECALIBRATION               [Done]  │║
║  │ Phase 4: CONTRACTION CHECK                      [Done]  │║
║  │ Phase 5: RETIREMENT & LEGACY                   [Done]  │║
║  │ Phase 6: FREE AGENCY                           [12/32]  │║
║  │ Phase 7: DRAFT                                 [Pending] │║
║  │ Phase 8: FARM RECONCILIATION                   [Pending] │║
║  │ Phase 9: CHEMISTRY REBALANCING                 [Pending] │║
║  │ Phase 10: OFFSEASON TRADES                     [Pending] │║
║  │ Phase 11: NEW SEASON PREP                      [Pending] │║
║  └──────────────────────────────────────────────────────────┘║
║                                                               ║
║  Progress: [████████████░░░░░░░░] 58% Complete               ║
║                                                               ║
║  [Continue to FA Round 13]                                    ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Appendix B: Quick Reference

### Critical Numbers

| Item | Value |
|------|-------|
| MLB Roster Size | 22 |
| Farm Roster Size | 10 |
| FA Absorption Cap | 3 per team |
| Salary Tolerance | ±10% of True Value |
| Draft Pool Multiplier | 2× gaps |
| Chemistry Level 3 | 7+ players |
| HOF Threshold | Top 10% (dynamic) |
| Revenge Arc Decay | 50% per year |
| Scorned Volatility | 2 seasons |

### Phase Dependencies

```
Phase 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
                 ↓
            (If contraction)
                 ↓
         Expansion Draft → Phase 5
```

---

*This document is the authoritative source for all offseason processes. For in-season mechanics, see DYNAMIC_DESIGNATIONS_SPEC.md and FARM_SYSTEM_SPEC.md.*
