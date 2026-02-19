# Trade Phase - Figma Design Specification

> **Feature Area**: Offseason Phase - Trade Phase
> **Platform**: iPad-first (1024×768 minimum)
> **Created**: January 29, 2026
> **Source**: STORIES_TRADE.md, User design screenshots

---

## Design Principles

1. **Side-by-Side Comparison** - Teams displayed in parallel panels
2. **Clear Selection State** - Obvious which players are selected
3. **Running Totals** - Always show player count and salary impact
4. **Advisory Guidance** - Beat reporters inform but don't block
5. **Progressive Disclosure** - Details revealed as needed

---

## Screen Flow Overview

```
Screen 1: Trade Interface (Main)
    ↓
Screen 2: Beat Reporter Warnings
    ↓
Screen 3: Trade Proposal Confirmation
    ↓
Screen 4: AI Response (Accept/Reject/Counter)
    ↓
Screen 5: Trade Completion

[Parallel Flows]
Screen 6: AI Trade Proposals Inbox
Screen 7: AI Proposal Detail
Screen 8: Waiver Wire Claim
Screen 9: Trade History
```

---

## Screen 1: Trade Interface (Main)

### Purpose
Primary interface for building and proposing trades.

### Layout - Two-Way Trade
```
╔════════════════════════════════════════════════════════════════════════════╗
║  KRUSE BASEBALL                                                            ║
║  Season 1 • Offseason                                                      ║
╠════════════════════════════════════════════════════════════════════════════╣
║  REGULAR SEASON                    │              OFFSEASON                ║
╠════════════════════════════════════════════════════════════════════════════╣
║  AWARDS │ RATINGS │ RETIRE │ CONTRACT │ FREE AGENCY │ DRAFT │ TRADES │ FIN ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ┌────────────────────────────────┐  ┌────────────────────────────────┐   ║
║  │      TWO-WAY TRADE             │  │      THREE-WAY TRADE           │   ║
║  └────────────────────────────────┘  └────────────────────────────────┘   ║
║                                                                            ║
║  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐ ║
║  │  TEAM 1                         │  │  TEAM 2                         │ ║
║  │  ┌───────────────────────────┐  │  │  ┌───────────────────────────┐  │ ║
║  │  │  ⭐ Tigers              ▼ │  │  │  │  Sox                    ▼ │  │ ║
║  │  └───────────────────────────┘  │  │  └───────────────────────────┘  │ ║
║  │                                 │  │                                 │ ║
║  │  ┌───────────────────────────┐  │  │  ┌───────────────────────────┐  │ ║
║  │  │ ☐ J. Rodriguez    $15.2M │  │  │  │ ☐ K. Martinez    $14.8M │  │ ║
║  │  │   CF • OVR 92            │  │  │  │   SS • OVR 91            │  │ ║
║  │  ├───────────────────────────┤  │  │  ├───────────────────────────┤  │ ║
║  │  │ ☐ M. Chen         $12.5M │  │  │  │ ☐ T. Anderson    $11.2M │  │ ║
║  │  │   SP • OVR 88            │  │  │  │   2B • OVR 87            │  │ ║
║  │  ├───────────────────────────┤  │  │  ├───────────────────────────┤  │ ║
║  │  │ ☐ R. Davis         $8.3M │  │  │  │ ☐ D. Brown        $9.5M │  │ ║
║  │  │   3B • OVR 84            │  │  │  │   SP • OVR 85            │  │ ║
║  │  ├───────────────────────────┤  │  │  ├───────────────────────────┤  │ ║
║  │  │ ☐ L. Martinez      $6.1M │  │  │  │ ☐ P. Johnson      $7.0M │  │ ║
║  │  │   C • OVR 81             │  │  │  │   LF • OVR 82            │  │ ║
║  │  ├───────────────────────────┤  │  │  ├───────────────────────────┤  │ ║
║  │  │ ☐ K. Wilson        $4.2M │  │  │  │ ☐ A. Garcia       $3.8M │  │ ║
║  │  │   RP • OVR 78            │  │  │  │   RP • OVR 77            │  │ ║
║  │  │                          │  │  │  │                          │  │ ║
║  │  │ [scroll for more...]     │  │  │  │ [scroll for more...]     │  │ ║
║  │  └───────────────────────────┘  │  │  └───────────────────────────┘  │ ║
║  │                                 │  │                                 │ ║
║  │  TRADING: 0 players             │  │  TRADING: 0 players             │ ║
║  │  TOTAL: $0.0M                   │  │  TOTAL: $0.0M                   │ ║
║  └─────────────────────────────────┘  └─────────────────────────────────┘ ║
║                                                                            ║
║  ┌────────────────────────────────────────────────────────────┐  ┌──────┐ ║
║  │                    ⚡ PROPOSE TRADE                        │  │ CLEAR│ ║
║  └────────────────────────────────────────────────────────────┘  └──────┘ ║
╚════════════════════════════════════════════════════════════════════════════╝
```

### Layout - With Selections
```
╔════════════════════════════════════════════════════════════════════════════╗
║  ...header...                                                              ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐ ║
║  │  TEAM 1                         │  │  TEAM 2                         │ ║
║  │  ┌───────────────────────────┐  │  │  ┌───────────────────────────┐  │ ║
║  │  │  ⭐ Tigers              ▼ │  │  │  │  Sox                    ▼ │  │ ║
║  │  └───────────────────────────┘  │  │  └───────────────────────────┘  │ ║
║  │                                 │  │                                 │ ║
║  │  ┌───────────────────────────┐  │  │  ┌───────────────────────────┐  │ ║
║  │  │ ☑ J. Rodriguez    $15.2M │  │  │  │ ☐ K. Martinez    $14.8M │  │ ║
║  │  │   CF • OVR 92      ✓     │  │  │  │   SS • OVR 91            │  │ ║
║  │  ├───────────────────────────┤  │  │  ├───────────────────────────┤  │ ║
║  │  │ ☑ M. Chen         $12.5M │  │  │  │ ☑ T. Anderson    $11.2M │  │ ║
║  │  │   SP • OVR 88      ✓     │  │  │  │   2B • OVR 87      ✓     │  │ ║
║  │  ├───────────────────────────┤  │  │  ├───────────────────────────┤  │ ║
║  │  │ ☐ R. Davis         $8.3M │  │  │  │ ☑ D. Brown        $9.5M │  │ ║
║  │  │   3B • OVR 84            │  │  │  │   SP • OVR 85      ✓     │  │ ║
║  │  │  ...                     │  │  │  │  ...                     │  │ ║
║  │  └───────────────────────────┘  │  │  └───────────────────────────┘  │ ║
║  │                                 │  │                                 │ ║
║  │  TRADING: 2 players             │  │  TRADING: 2 players             │ ║
║  │  TOTAL: $27.7M                  │  │  TOTAL: $20.7M                  │ ║
║  └─────────────────────────────────┘  └─────────────────────────────────┘ ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  TRADE SUMMARY                                                       │  ║
║  │  Tigers send: J. Rodriguez (CF), M. Chen (SP) → $27.7M              │  ║
║  │  Sox send: T. Anderson (2B), D. Brown (SP) → $20.7M                 │  ║
║  │  Net salary impact: Tigers -$7.0M │ Sox +$7.0M                      │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║  ┌────────────────────────────────────────────────────────────┐  ┌──────┐ ║
║  │                    ⚡ PROPOSE TRADE                        │  │ CLEAR│ ║
║  └────────────────────────────────────────────────────────────┘  └──────┘ ║
╚════════════════════════════════════════════════════════════════════════════╝
```

### Layout - Three-Way Trade
```
╔════════════════════════════════════════════════════════════════════════════╗
║  ...header...                                                              ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ┌────────────────────────────────┐  ┌────────────────────────────────┐   ║
║  │      TWO-WAY TRADE             │  │  ███ THREE-WAY TRADE ███       │   ║
║  └────────────────────────────────┘  └────────────────────────────────┘   ║
║                                                                            ║
║  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐║
║  │  TEAM 1              │ │  TEAM 2              │ │  TEAM 3              │║
║  │  ┌────────────────┐  │ │  ┌────────────────┐  │ │  ┌────────────────┐  │║
║  │  │ ⭐ Tigers    ▼ │  │ │  │ Sox          ▼ │  │ │  │ Bears        ▼ │  │║
║  │  └────────────────┘  │ │  └────────────────┘  │ │  └────────────────┘  │║
║  │                      │ │                      │ │                      │║
║  │  SENDS TO TEAM 2:    │ │  SENDS TO TEAM 3:    │ │  SENDS TO TEAM 1:    │║
║  │  ☑ M. Chen (SP)     │ │  ☑ D. Brown (SP)    │ │  ☑ J. Kim (CF)      │║
║  │                      │ │                      │ │                      │║
║  │  RECEIVES FROM T3:   │ │  RECEIVES FROM T1:   │ │  RECEIVES FROM T2:   │║
║  │  → J. Kim (CF)       │ │  → M. Chen (SP)      │ │  → D. Brown (SP)     │║
║  │                      │ │                      │ │                      │║
║  │  TRADING: 1 player   │ │  TRADING: 1 player   │ │  TRADING: 1 player   │║
║  │  TOTAL: $12.5M       │ │  TOTAL: $9.5M        │ │  TOTAL: $8.2M        │║
║  └──────────────────────┘ └──────────────────────┘ └──────────────────────┘║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  THREE-WAY TRADE FLOW                                                │  ║
║  │  Tigers (M. Chen) → Sox (D. Brown) → Bears (J. Kim) → Tigers        │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║  ┌────────────────────────────────────────────────────────────┐  ┌──────┐ ║
║  │                    ⚡ PROPOSE TRADE                        │  │ CLEAR│ ║
║  └────────────────────────────────────────────────────────────┘  └──────┘ ║
╚════════════════════════════════════════════════════════════════════════════╝
```

### Interaction Notes
- Team dropdown lists all teams alphabetically
- User's team marked with ⭐
- Clicking player toggles selection (checkbox + highlight)
- Running counters update in real-time
- Trade summary appears when both teams have selections
- Propose Trade button enabled only when valid trade built

---

## Screen 2: Beat Reporter Warnings

### Purpose
Advisory warnings before trade confirmation.

### Layout
```
╔════════════════════════════════════════════════════════════════════════════╗
║  📰 BEAT WRITER REPORTS                                                    ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │                                                                      │  ║
║  │  "Word is the clubhouse isn't thrilled about this deal. Rodriguez   │  ║
║  │   was popular in the locker room - a real leader type. The young    │  ║
║  │   guys looked up to him."                                            │  ║
║  │                                                                      │  ║
║  │                                            — Mike Thompson, Beat Writer│  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │                                                                      │  ║
║  │  "Fans might not understand trading a fan favorite for salary        │  ║
║  │   relief. Expect some backlash on social media."                     │  ║
║  │                                                                      │  ║
║  │                                            — Sarah Chen, Columnist   │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  ⚠️ These reports may or may not be accurate.                        │  ║
║  │     Proceed with the trade?                                          │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║              [ Cancel Trade ]              [ Proceed Anyway → ]            ║
╚════════════════════════════════════════════════════════════════════════════╝
```

### Interaction Notes
- Multiple warnings can stack
- Clear disclaimer that reports may be inaccurate
- User can always proceed (warnings don't block)
- Cancel returns to trade builder with selections intact

---

## Screen 3: Trade Proposal Confirmation

### Purpose
Final confirmation before sending to AI team.

### Layout
```
╔════════════════════════════════════════════════════════════════════════════╗
║  ⚡ CONFIRM TRADE PROPOSAL                                                 ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐  ║
║  │  TIGERS SEND:               │  │  SOX SEND:                          │  ║
║  │                             │  │                                     │  ║
║  │  J. Rodriguez               │  │  T. Anderson                        │  ║
║  │  CF • OVR 92 • $15.2M      │  │  2B • OVR 87 • $11.2M              │  ║
║  │                             │  │                                     │  ║
║  │  M. Chen                    │  │  D. Brown                           │  ║
║  │  SP • OVR 88 • $12.5M      │  │  SP • OVR 85 • $9.5M               │  ║
║  │                             │  │                                     │  ║
║  │  ─────────────────────────  │  │  ─────────────────────────────────  │  ║
║  │  Total: $27.7M              │  │  Total: $20.7M                      │  ║
║  └─────────────────────────────┘  └─────────────────────────────────────┘  ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  SALARY IMPACT                                                       │  ║
║  │                                                                      │  ║
║  │  Tigers: -$7.0M payroll (from $85.2M to $78.2M)                     │  ║
║  │  Sox: +$7.0M payroll (from $72.1M to $79.1M)                        │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║              [ ← Back ]                    [ Send Proposal → ]             ║
╚════════════════════════════════════════════════════════════════════════════╝
```

---

## Screen 4: AI Response

### Layout - Trade Accepted
```
╔════════════════════════════════════════════════════════════════════════════╗
║  ✅ TRADE ACCEPTED                                                         ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║                         🤝                                                 ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │                                                                      │  ║
║  │  The Sox have accepted your trade proposal!                          │  ║
║  │                                                                      │  ║
║  │  TIGERS RECEIVE:              SOX RECEIVE:                           │  ║
║  │  • T. Anderson (2B)           • J. Rodriguez (CF)                    │  ║
║  │  • D. Brown (SP)              • M. Chen (SP)                         │  ║
║  │                                                                      │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  📰 "A blockbuster deal! Both teams addressed major needs here."     │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║                         [ Done ]                                           ║
╚════════════════════════════════════════════════════════════════════════════╝
```

### Layout - Trade Rejected
```
╔════════════════════════════════════════════════════════════════════════════╗
║  ❌ TRADE REJECTED                                                         ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║                         🚫                                                 ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │                                                                      │  ║
║  │  The Sox have declined your trade proposal.                          │  ║
║  │                                                                      │  ║
║  │  "We don't see enough value in this deal. Rodriguez is one of       │  ║
║  │   the best center fielders in the league, and we'd need more        │  ║
║  │   coming back our way."                                              │  ║
║  │                                                                      │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║       [ Modify Offer ]    [ Try Different Trade ]    [ Cancel ]            ║
╚════════════════════════════════════════════════════════════════════════════╝
```

### Layout - Counter-Offer
```
╔════════════════════════════════════════════════════════════════════════════╗
║  🔄 COUNTER-OFFER FROM SOX                                                 ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  The Sox are interested, but want to modify the deal:                      ║
║                                                                            ║
║  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐  ║
║  │  YOUR ORIGINAL OFFER:       │  │  THEIR COUNTER:                     │  ║
║  │                             │  │                                     │  ║
║  │  You send:                  │  │  You send:                          │  ║
║  │  • M. Chen (SP)             │  │  • M. Chen (SP)                     │  ║
║  │                             │  │  • K. Wilson (RP) ← ADDED           │  ║
║  │                             │  │                                     │  ║
║  │  You get:                   │  │  You get:                           │  ║
║  │  • J. Rodriguez (CF)        │  │  • J. Rodriguez (CF)                │  ║
║  │                             │  │  • R. Davis (3B) ← ADDED            │  ║
║  │                             │  │                                     │  ║
║  │  ─────────────────────────  │  │  ─────────────────────────────────  │  ║
║  │  Salary: +$2.7M             │  │  Salary: +$5.8M                     │  ║
║  └─────────────────────────────┘  └─────────────────────────────────────┘  ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  📰 "The Sox want a reliever included. They're high on Wilson's arm."│  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║      [ Accept Counter ]     [ Modify Further ]     [ Decline ]             ║
╚════════════════════════════════════════════════════════════════════════════╝
```

---

## Screen 5: AI Trade Proposals Inbox

### Purpose
View and respond to AI-initiated trade proposals.

### Layout
```
╔════════════════════════════════════════════════════════════════════════════╗
║  📨 TRADE PROPOSALS                                           3 pending    ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  🔵 DETROIT TIGERS                                          NEW      │  ║
║  │                                                                      │  ║
║  │  Offering:                        Wanting:                           │  ║
║  │  • J. Rodriguez (CF, 92)          • M. Chen (SP, 88)                │  ║
║  │                                                                      │  ║
║  │  Salary Impact: +$2.7M                                               │  ║
║  │                                                                      │  ║
║  │                                                   [ VIEW DETAILS → ] │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  🔵 MIAMI MARLINS                                                    │  ║
║  │                                                                      │  ║
║  │  Offering:                        Wanting:                           │  ║
║  │  • T. Smith (1B, 85)              • R. Johnson (1B, 91)             │  ║
║  │  • Prospect                                                          │  ║
║  │                                                                      │  ║
║  │  Salary Impact: -$4.2M                                               │  ║
║  │                                                                      │  ║
║  │                                                   [ VIEW DETAILS → ] │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  🔵 CHICAGO CUBS                                                     │  ║
║  │                                                                      │  ║
║  │  Offering:                        Wanting:                           │  ║
║  │  • Future considerations          • K. Wilson (RP, 78)              │  ║
║  │                                                                      │  ║
║  │  Salary Impact: -$4.2M                                               │  ║
║  │                                                                      │  ║
║  │                                                   [ VIEW DETAILS → ] │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║                         [ Back to Trade Builder ]                          ║
╚════════════════════════════════════════════════════════════════════════════╝
```

---

## Screen 6: AI Proposal Detail

### Purpose
View full details of an AI trade proposal.

### Layout
```
╔════════════════════════════════════════════════════════════════════════════╗
║  📨 TRADE PROPOSAL FROM DETROIT TIGERS                                     ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐  ║
║  │  TIGERS OFFER:              │  │  THEY WANT:                         │  ║
║  │                             │  │                                     │  ║
║  │  ┌───────────────────────┐  │  │  ┌───────────────────────────────┐  │  ║
║  │  │  J. RODRIGUEZ         │  │  │  │  M. CHEN                      │  │  ║
║  │  │  Center Field         │  │  │  │  Starting Pitcher             │  │  ║
║  │  │  OVR: 92 │ Age: 27    │  │  │  │  OVR: 88 │ Age: 29            │  │  ║
║  │  │  Salary: $15.2M       │  │  │  │  Salary: $12.5M               │  │  ║
║  │  │                       │  │  │  │                               │  │  ║
║  │  │  Last Season:         │  │  │  │  Last Season:                 │  │  ║
║  │  │  .298 AVG, 32 HR      │  │  │  │  14-8, 3.21 ERA               │  │  ║
║  │  │  4.5 WAR              │  │  │  │  3.8 WAR                      │  │  ║
║  │  └───────────────────────┘  │  │  └───────────────────────────────┘  │  ║
║  └─────────────────────────────┘  └─────────────────────────────────────┘  ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  SALARY IMPACT: +$2.7M                                               │  ║
║  │  Your payroll: $85.2M → $87.9M                                       │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  📰 BEAT WRITER: "The Tigers are desperate for pitching. Rodriguez  │  ║
║  │      has been unhappy with his role lately - this could be a         │  ║
║  │      win-win if Chen fits your rotation plans."                      │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║      [ ACCEPT ]          [ COUNTER ]          [ DECLINE ]                  ║
╚════════════════════════════════════════════════════════════════════════════╝
```

---

## Screen 7: Waiver Wire Claim

### Purpose
Claim players released by other teams.

### Layout
```
╔════════════════════════════════════════════════════════════════════════════╗
║  📋 WAIVER WIRE CLAIM                                                      ║
║  Your claim priority: #3 of 20                                             ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  PLAYER AVAILABLE                                                    │  ║
║  │                                                                      │  ║
║  │  ┌────────────────────────────────────────────────────────────────┐  │  ║
║  │  │                                                                │  │  ║
║  │  │  M. JOHNSON                                                    │  │  ║
║  │  │  Shortstop │ Grade: B- │ Age: 28                              │  │  ║
║  │  │  Salary: $6.2M                                                 │  │  ║
║  │  │                                                                │  │  ║
║  │  │  Released by: Detroit Tigers                                   │  │  ║
║  │  │  Last Season: .275 AVG, 18 HR, 2.1 WAR                        │  │  ║
║  │  │                                                                │  │  ║
║  │  └────────────────────────────────────────────────────────────────┘  │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  YOUR ROSTER STATUS                                                  │  ║
║  │                                                                      │  ║
║  │  MLB: 22/22 (FULL)  │  Farm: 11/10 (OVER)                           │  ║
║  │                                                                      │  ║
║  │  ⚠️ You must drop a player to claim.                                │  ║
║  │                                                                      │  ║
║  │  Select player to drop: [ K. Wilson (RP, C+, $4.2M)         ▼ ]    │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  CLAIM ORDER                                                         │  ║
║  │  #1 Bears (PASSED) → #2 Crocs (PASSED) → #3 YOU ← → #4 Marlins...  │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║              [ PASS ]                          [ CLAIM ]                   ║
╚════════════════════════════════════════════════════════════════════════════╝
```

### Layout - Claim Order Progress
```
╔════════════════════════════════════════════════════════════════════════════╗
║  📋 WAIVER WIRE - M. JOHNSON (SS)                                          ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  CLAIM ORDER (Reverse Standings)                                     │  ║
║  │                                                                      │  ║
║  │  #1  Bears (28-52)      ✗ PASSED                                    │  ║
║  │  #2  Crocs (32-48)      ✗ PASSED                                    │  ║
║  │  #3  Tigers (35-45)     ⏳ DECIDING...                               │  ║
║  │  #4  Marlins (38-42)    ○ Waiting                                   │  ║
║  │  #5  Sox (42-38)        ○ Waiting                                   │  ║
║  │  ...                                                                 │  ║
║  │  #20 Yankees (58-22)    ○ Waiting                                   │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║                    Waiting for Tigers decision...                          ║
╚════════════════════════════════════════════════════════════════════════════╝
```

---

## Screen 8: Waiver Wire Results

### Purpose
Summary of all waiver wire activity.

### Layout
```
╔════════════════════════════════════════════════════════════════════════════╗
║  📋 WAIVER WIRE RESULTS                                                    ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  WAIVER TRANSACTIONS                                                 │  ║
║  ├──────────────────────────────────────────────────────────────────────┤  ║
║  │                                                                      │  ║
║  │  M. Johnson (SS, B-)                                                 │  ║
║  │  Released by: Detroit Tigers                                         │  ║
║  │  ✅ CLAIMED by: Miami Marlins (#4 priority)                         │  ║
║  │  Dropped: T. Smith (SS, C+)                                         │  ║
║  │                                                                      │  ║
║  │  ─────────────────────────────────────────────────────────────────  │  ║
║  │                                                                      │  ║
║  │  K. Davis (RP, C)                                                   │  ║
║  │  Released by: Chicago Cubs                                           │  ║
║  │  ❌ UNCLAIMED - Added to Inactive Player Database                   │  ║
║  │                                                                      │  ║
║  │  ─────────────────────────────────────────────────────────────────  │  ║
║  │                                                                      │  ║
║  │  R. Thompson (3B, C+)                                               │  ║
║  │  Released by: San Francisco Giants (You)                            │  ║
║  │  ✅ CLAIMED by: Seattle Mariners (#7 priority)                      │  ║
║  │                                                                      │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║                              [ Continue ]                                  ║
╚════════════════════════════════════════════════════════════════════════════╝
```

---

## Screen 9: Trade History

### Purpose
View all completed trades this offseason.

### Layout
```
╔════════════════════════════════════════════════════════════════════════════╗
║  📜 TRADE HISTORY - OFFSEASON                                              ║
║  Filter: [ All Teams ▼ ]                                                   ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  TRADE #1 - January 29, 2026                                         │  ║
║  │                                                                      │  ║
║  │  ⭐ TIGERS          ←→          SOX                                  │  ║
║  │                                                                      │  ║
║  │  Tigers received:              Sox received:                         │  ║
║  │  • T. Anderson (2B)            • J. Rodriguez (CF)                   │  ║
║  │  • D. Brown (SP)               • M. Chen (SP)                        │  ║
║  │                                                                      │  ║
║  │  Salary: Tigers -$7.0M │ Sox +$7.0M                                 │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  TRADE #2 - January 29, 2026                                         │  ║
║  │                                                                      │  ║
║  │  MARLINS           ←→          CUBS                                  │  ║
║  │                                                                      │  ║
║  │  Marlins received:             Cubs received:                        │  ║
║  │  • P. Garcia (RP)              • K. Williams (SP)                    │  ║
║  │                                                                      │  ║
║  │  Salary: Marlins -$2.1M │ Cubs +$2.1M                               │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║  [scroll for more trades...]                                               ║
║                                                                            ║
║                         [ Back to Trade Builder ]                          ║
╚════════════════════════════════════════════════════════════════════════════╝
```

---

## Player Card Variants

### Standard (Unselected)
```
┌─────────────────────────────────────┐
│ ☐ J. Rodriguez              $15.2M │
│   CF • OVR 92                       │
└─────────────────────────────────────┘
```

### Selected
```
┌─────────────────────────────────────┐
│ ☑ J. Rodriguez              $15.2M │
│   CF • OVR 92                  ✓    │
└─────────────────────────────────────┘
(Highlighted background)
```

### With Farm/Rookie Badge
```
┌─────────────────────────────────────┐
│ ☐ M. Williams               $1.2M  │
│   SS • OVR 78 • 🌱 FARM            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ☐ C. Ramirez                $0.9M  │
│   CF • OVR 75 • 🌱 DRAFTEE         │
└─────────────────────────────────────┘
```

---

## Animation & Transition Notes

### Trade Flow
- Smooth panel transitions
- Player cards animate when selected/deselected
- Trade summary slides up when valid trade formed

### AI Response
- Brief "thinking" animation before AI decision
- Celebration effect on trade accepted
- Subtle shake on trade rejected

### Waiver Wire
- Claim order progress animates as teams decide
- Claimed player card animates to new team

---

## Accessibility Notes

- All interactive elements 44×44pt minimum
- High contrast for selected vs unselected states
- Screen reader announces trade summaries
- Keyboard navigation through player lists

---

*End of Figma Specification - Trade Phase*
