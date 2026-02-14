# Trade Phase - User Stories

> **Feature Area**: Offseason Phase - Trade Phase
> **Platform**: iPad-first (1024×768 minimum)
> **Created**: January 29, 2026
> **Source**: User design screenshots, OFFSEASON_SYSTEM_SPEC.md

---

## Overview

The Trade Phase allows teams to exchange players through two-way or three-way trades. This phase occurs after the Draft and before Finalize & Advance, giving teams flexibility to reshape their rosters before the final validation.

### Key Principles

1. **No Salary Matching** - Teams can increase or decrease payroll freely
2. **Advisory Warnings** - Beat reporters provide hints (may or may not be accurate)
3. **AI Protection** - AI teams won't accept clearly exploitative trades
4. **AI Proposals** - AI teams can propose trades to the user
5. **Full Roster Access** - MLB, Farm, and new draftees are all tradeable
6. **Waiver Wire** - Released players go through waiver claims (reverse standings order)

---

## Phase Context

**Preceding Phase:**
- Phase 7: Draft (Farm-First) - Farm rosters may exceed 10 temporarily

**This Phase:**
- Phase 8: Trade Phase

**Following Phase:**
- Phase 9: Finalize & Advance (rosters must balance to 22 MLB + 10 Farm)

---

## User Stories

### Section 1: Trade Interface

#### S-TRD001: Access Trade Phase
**As a** user in the offseason
**I want to** access the Trade phase
**So that** I can trade players between teams

**Acceptance Criteria:**
- Trade tab visible in offseason navigation
- Shows "TRADES" tab between Draft and Finalize & Advance
- Defaults to Two-Way Trade view
- Team 1 defaults to user's team

---

#### S-TRD002: Select Trade Type
**As a** user initiating a trade
**I want to** choose between two-way and three-way trades
**So that** I can execute complex multi-team deals

**Acceptance Criteria:**
- Tab selector: [TWO-WAY TRADE] | [THREE-WAY TRADE]
- Two-way shows Team 1 and Team 2 panels
- Three-way shows Team 1, Team 2, and Team 3 panels
- Switching tabs clears current selections

**Trade Types:**
```
TWO-WAY:  Team A ←→ Team B
          (Direct swap of players)

THREE-WAY: Team A → Team B → Team C → Team A
           (Circular trade, each team gives and receives)
```

---

#### S-TRD003: Select Teams for Trade
**As a** user setting up a trade
**I want to** select which teams are involved
**So that** I can trade between any two or three teams

**Acceptance Criteria:**
- Each team panel has dropdown selector
- Dropdown lists all teams alphabetically
- User's team(s) marked with ⭐
- Cannot select same team twice in one trade
- Selecting a team loads their available players

---

#### S-TRD004: View Available Players
**As a** user selecting players to trade
**I want to** see all available players from each team
**So that** I can make informed trade decisions

**Acceptance Criteria:**
- Player list shows all tradeable players
- Each player card displays:
  - Name
  - Position (CF, SP, etc.)
  - OVR (overall rating / grade equivalent)
  - Salary
- Players grouped by roster:
  - MLB Roster (22 players)
  - Farm Roster (may exceed 10 after draft)
  - Includes new draftees
- Sortable by: Position, OVR, Salary, Name
- Search/filter option

**Player Card Format:**
```
┌─────────────────────────────────────┐
│  J. Rodriguez              $15.2M   │
│  CF • OVR 92                        │
└─────────────────────────────────────┘
```

---

#### S-TRD005: Select Players for Trade
**As a** user building a trade package
**I want to** select players from each team
**So that** I can construct the trade

**Acceptance Criteria:**
- Click/tap player to toggle selection
- Selected players highlighted
- Running counter shows: "TRADING: X players"
- Running total shows: "TOTAL: $X.XM"
- Can select multiple players per team
- Selected players visually distinct (highlight, checkmark, or moved to "trading" section)

---

#### S-TRD006: View Trade Summary
**As a** user reviewing a trade
**I want to** see the complete trade summary
**So that** I can understand the full impact

**Acceptance Criteria:**
- Summary shows all players moving in each direction
- Salary impact displayed for each team:
  - "Tigers: +$2.7M payroll"
  - "Sox: -$2.7M payroll"
- Net salary swing prominently displayed
- Position changes noted (e.g., "Gaining: CF, SP | Losing: 3B")

---

### Section 2: Beat Reporter Warnings

#### S-TRD007: Receive Beat Reporter Warnings
**As a** user proposing a trade
**I want to** see beat reporter commentary
**So that** I can consider potential consequences

**Acceptance Criteria:**
- Beat reporter pop-up appears before trade confirmation
- Warnings are ADVISORY ONLY (do not block trade)
- Warnings may or may not be accurate (adds uncertainty)
- Multiple warnings can appear for complex trades
- User can dismiss and proceed anyway

**Warning Categories:**
| Category | Example Warning |
|----------|-----------------|
| **Morale** | "Word is the clubhouse isn't thrilled. Martinez was popular." |
| **Relationships** | "Rodriguez and your catcher have been close friends for years." |
| **Fan Reaction** | "Fans might not understand trading a fan favorite for salary relief." |
| **Player Happiness** | "Sources say Johnson has always wanted to play for the Tigers." |
| **Team Chemistry** | "Adding another high-ego player could disrupt your clubhouse." |
| **AI Skepticism** | "Our sources are skeptical the Sox will accept this offer." |

**Warning Display:**
```
┌──────────────────────────────────────────────────────────────┐
│ 📰 BEAT WRITER                                               │
│                                                              │
│ "Word is the clubhouse isn't thrilled about this deal.      │
│  Martinez was popular in the locker room. Also, don't be    │
│  surprised if fans boo Rodriguez on opening day - they      │
│  loved that guy."                                            │
│                                                              │
│ ⚠️ These reports may or may not be accurate.                │
└──────────────────────────────────────────────────────────────┘
```

---

#### S-TRD008: Beat Reporter Accuracy Variance
**As a** user receiving beat reporter warnings
**I want** the warnings to have variable accuracy
**So that** I can't always predict outcomes perfectly

**Acceptance Criteria:**
- Warnings have hidden accuracy rating (60-90% accurate)
- Some warnings are "hot takes" that don't pan out
- System tracks warning accuracy for reporter reputation over time
- Creates uncertainty and replayability

**Accuracy Logic:**
```typescript
interface BeatReporterWarning {
  message: string;
  category: 'MORALE' | 'RELATIONSHIP' | 'FAN' | 'CHEMISTRY' | 'AI_HINT';
  accuracy: number;        // 0.6 to 0.9 (hidden from user)
  actuallyTrue: boolean;   // Determined at trade time, revealed through consequences
}
```

---

### Section 3: Trade Execution

#### S-TRD009: Propose Trade
**As a** user with a complete trade package
**I want to** propose the trade
**So that** it can be evaluated and potentially accepted

**Acceptance Criteria:**
- [PROPOSE TRADE] button enabled when:
  - At least one player selected from each team
  - All involved teams have valid selections
- Clicking propose triggers:
  1. Beat reporter warnings display
  2. User confirms or cancels
  3. AI evaluation (if AI team involved)
  4. Trade accepted or rejected

---

#### S-TRD010: AI Trade Evaluation
**As a** user proposing a trade to an AI team
**I want** the AI to realistically evaluate the offer
**So that** I can't exploit the system with lopsided trades

**Acceptance Criteria:**
- AI evaluates trade based on:
  - WAR comparison (total value)
  - Team needs (positional gaps)
  - Salary implications (payroll flexibility)
  - Prospect potential (ceiling vs current grade)
  - Player age (years of value remaining)
  - Chemistry fit (personality compatibility)
- AI can: ACCEPT, REJECT, or COUNTER
- AI won't accept clearly exploitative trades
- AI may accept slightly unfavorable trades if fills urgent need

**AI Evaluation Factors:**
```typescript
interface TradeEvaluation {
  warDifferential: number;      // Positive = AI gains value
  positionNeedFilled: boolean;  // Does this fill a gap?
  salarySavings: number;        // Positive = AI saves money
  prospectPotential: number;    // Ceiling value of prospects received
  ageAdvantage: number;         // Younger players = more value
  chemistryFit: number;         // Personality compatibility score

  // Decision threshold
  overallScore: number;         // Weighted combination
  decision: 'ACCEPT' | 'REJECT' | 'COUNTER';
}
```

**AI Decision Thresholds:**
| Score | Decision |
|-------|----------|
| ≥ 0.7 | ACCEPT immediately |
| 0.4 - 0.69 | ACCEPT if fills need, else COUNTER |
| 0.2 - 0.39 | COUNTER with modified offer |
| < 0.2 | REJECT outright |

---

#### S-TRD011: Trade Acceptance
**As a** user whose trade is accepted
**I want** the trade to execute properly
**So that** players move to their new teams

**Acceptance Criteria:**
- On acceptance:
  - Players removed from original team rosters
  - Players added to new team rosters
  - Salary adjustments applied
  - Trade logged in transaction history
  - Morale effects queued (applied over time)
- Confirmation message displays trade details
- Teams' roster counts update immediately

**Post-Trade State Changes:**
```typescript
function executeTrade(trade: Trade): void {
  for (const movement of trade.playerMovements) {
    // Remove from old team
    removeFromRoster(movement.player, movement.fromTeam);

    // Add to new team
    addToRoster(movement.player, movement.toTeam);

    // Queue morale effects (processed over time)
    queueMoraleEffect(movement.player, 'TRADED');
    queueTeamChemistryUpdate(movement.fromTeam);
    queueTeamChemistryUpdate(movement.toTeam);
  }

  // Log transaction
  logTransaction(trade);
}
```

---

#### S-TRD012: Trade Rejection
**As a** user whose trade is rejected by AI
**I want** to understand why and have options
**So that** I can adjust my offer

**Acceptance Criteria:**
- Rejection message indicates general reason:
  - "The Tigers don't see enough value in this deal."
  - "The Sox aren't willing to part with their ace."
  - "Detroit is looking for pitching, not position players."
- Options after rejection:
  - [Modify Offer] - Return to trade builder
  - [Try Different Trade] - Clear and start over
  - [Cancel] - Exit trade flow

---

#### S-TRD013: AI Counter-Offer
**As a** user receiving a counter-offer from AI
**I want** to see their modified proposal
**So that** I can accept, modify, or decline

**Acceptance Criteria:**
- Counter-offer shows:
  - Original offer (crossed out or dimmed)
  - AI's counter-proposal
  - What changed (added/removed players)
- User options:
  - [Accept Counter] - Execute the counter-offer
  - [Modify] - Continue negotiating
  - [Decline] - End negotiation

**Counter-Offer Display:**
```
╔════════════════════════════════════════════════════════════════╗
║  🔄 COUNTER-OFFER FROM DETROIT TIGERS                          ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  YOUR OFFER:                    THEIR COUNTER:                 ║
║  ────────────                   ──────────────                 ║
║  You give:                      You give:                      ║
║  • M. Chen (SP)                 • M. Chen (SP)                 ║
║                                 • K. Wilson (RP) ← ADDED       ║
║                                                                ║
║  You get:                       You get:                       ║
║  • J. Rodriguez (CF)            • J. Rodriguez (CF)            ║
║                                 • R. Davis (3B) ← ADDED        ║
║                                                                ║
║  Salary Impact: +$2.7M → +$5.8M                                ║
║                                                                ║
║      [ ACCEPT COUNTER ]   [ MODIFY ]   [ DECLINE ]             ║
╚════════════════════════════════════════════════════════════════╝
```

---

### Section 4: AI Trade Proposals

#### S-TRD014: Receive AI Trade Proposal
**As a** user during the trade phase
**I want** AI teams to propose trades to me
**So that** I have more trade opportunities

**Acceptance Criteria:**
- AI teams can initiate trade proposals
- Notification appears: "📨 Trade Proposal from [Team]"
- User can view proposal details
- Options: [Accept] [Counter] [Decline]
- AI proposals based on:
  - AI team needs vs user's roster surplus
  - Realistic trade logic
  - Adaptive engine learning

**AI Proposal Triggers:**
| Trigger | Example |
|---------|---------|
| **Position Surplus** | AI has 3 good SS, user needs SS |
| **Salary Dump** | AI over budget, wants to shed salary |
| **Playoff Push** | AI contending, wants to add talent |
| **Rebuild** | AI rebuilding, wants prospects for vets |
| **Random** | Occasional "shake things up" offers |

---

#### S-TRD015: AI Proposal Queue
**As a** user with multiple AI proposals
**I want** to see all pending proposals
**So that** I can review and respond to each

**Acceptance Criteria:**
- Inbox/queue shows all pending proposals
- Each proposal shows: Team, Key players involved, Salary impact
- Proposals expire at end of Trade Phase if not addressed
- Can respond in any order

**Proposal Queue:**
```
┌──────────────────────────────────────────────────────────────┐
│  📨 TRADE PROPOSALS (3)                                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🔵 Detroit Tigers                                           │
│     Offering: J. Rodriguez (CF, 92)                          │
│     Wanting: M. Chen (SP, 88)                                │
│     Salary: +$2.7M                          [VIEW DETAILS]   │
│                                                              │
│  🔵 Miami Marlins                                            │
│     Offering: T. Smith (1B, 85) + prospect                   │
│     Wanting: R. Johnson (1B, 91)                             │
│     Salary: -$4.2M                          [VIEW DETAILS]   │
│                                                              │
│  🔵 Chicago Cubs                                             │
│     Offering: Draft pick compensation                        │
│     Wanting: K. Wilson (RP, 78)                              │
│     Salary: -$4.2M                          [VIEW DETAILS]   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### Section 5: Three-Way Trades

#### S-TRD016: Configure Three-Way Trade
**As a** user executing a complex trade
**I want to** set up a three-way trade
**So that** I can facilitate deals that wouldn't work two-way

**Acceptance Criteria:**
- Three team panels displayed
- Each team sends players AND receives players
- Circular flow: A→B, B→C, C→A
- All three teams must have valid selections
- AI evaluates from each team's perspective

**Three-Way Trade Flow:**
```
        TEAM A (User)
        Sends: SP
        Gets: CF
            ↑      ↘
           /        \
          /          ↓
    TEAM C          TEAM B
    Sends: CF       Sends: 3B
    Gets: 3B        Gets: SP
```

---

#### S-TRD017: Three-Way Trade Validation
**As a** user proposing a three-way trade
**I want** all three teams to evaluate independently
**So that** the trade only executes if all agree

**Acceptance Criteria:**
- Each AI team evaluates their portion independently
- Trade only succeeds if ALL teams accept
- If any team rejects, entire trade fails
- Counter-offers more complex (may only modify one leg)
- Display shows each team's status: ✓ Accepted | ✗ Rejected | ⏳ Pending

---

### Section 6: Waiver Wire

#### S-TRD018: Release Player Triggers Waiver Wire
**As a** team releasing a player during Finalize & Advance
**I want** other teams to have a chance to claim them
**So that** good players don't just disappear

**Acceptance Criteria:**
- When any team releases a player → Waiver Wire triggered
- Claim order: Reverse of previous season standings (worst team first)
- Each team gets one chance to claim or pass
- If claimed: Player joins claiming team
- If all pass: Player goes to Inactive Player Database

**Waiver Wire Flow:**
```
Player Released by Team A
         ↓
WAIVER WIRE BEGINS
         ↓
Team with worst record: CLAIM or PASS?
         ↓
If PASS → Next worst team: CLAIM or PASS?
         ↓
... continues through all teams ...
         ↓
If ALL PASS → Player retires (Inactive DB)
```

---

#### S-TRD019: AI Waiver Wire Decisions
**As a** user observing the waiver wire
**I want** AI teams to make realistic claim decisions
**So that** the system feels authentic

**Acceptance Criteria:**
- AI evaluates each waiver claim based on:
  - Does player fill a need?
  - Can team afford the salary?
  - Is player's grade worth a roster spot?
  - Would claim require dropping someone valuable?
- AI more likely to claim if:
  - Player grade ≥ B
  - Position is a team need
  - Salary is reasonable
- AI less likely if:
  - Would have to drop better player
  - Already strong at that position
  - Salary is prohibitive

---

#### S-TRD020: User Waiver Wire Claim
**As a** user with waiver priority
**I want to** claim players on waivers
**So that** I can add talent my rivals released

**Acceptance Criteria:**
- Notification when player hits waivers: "Player X on waivers - You have claim #3"
- When user's turn:
  - Show player details (Name, Position, Grade, Salary)
  - Show user's roster status
  - Options: [CLAIM] or [PASS]
- If claiming with full roster:
  - Must select player to drop
  - Dropped player also goes to waivers (but user can't reclaim)
- Time limit or auto-pass for user turns (prevents blocking)

**Waiver Claim Screen:**
```
╔════════════════════════════════════════════════════════════════╗
║  📋 WAIVER WIRE CLAIM                                          ║
║  Your claim priority: #3 of 20                                 ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  PLAYER AVAILABLE:                                             ║
║  ┌────────────────────────────────────────────────────────┐    ║
║  │  M. JOHNSON                                            │    ║
║  │  Shortstop │ Grade: B- │ Age: 28 │ Salary: $6.2M      │    ║
║  │                                                        │    ║
║  │  Released by: Detroit Tigers                           │    ║
║  │  Last Season: .275 AVG, 18 HR, 2.1 WAR                │    ║
║  └────────────────────────────────────────────────────────┘    ║
║                                                                ║
║  YOUR ROSTER STATUS:                                           ║
║  MLB: 22/22 (FULL) │ Farm: 11/10 (OVER)                       ║
║                                                                ║
║  ⚠️ You must drop a player to claim.                          ║
║  Select player to drop: [ K. Wilson (RP, C+)        ▼ ]       ║
║                                                                ║
║              [ PASS ]                    [ CLAIM ]             ║
╚════════════════════════════════════════════════════════════════╝
```

---

#### S-TRD021: Waiver Wire Results
**As a** user tracking waiver activity
**I want** to see all waiver wire results
**So that** I know where released players ended up

**Acceptance Criteria:**
- Summary shows all waiver transactions
- Each entry shows: Player, Released By, Claimed By (or "Unclaimed")
- If unclaimed: "Added to Inactive Player Database"
- Results accessible from Trade Phase summary

---

### Section 7: Trade Utilities

#### S-TRD022: Clear Trade
**As a** user wanting to start over
**I want to** clear my current trade selections
**So that** I can begin fresh

**Acceptance Criteria:**
- [CLEAR] button visible at all times
- Clears all selected players from all teams
- Resets counters to "TRADING: 0 players" and "TOTAL: $0.0M"
- Does not change selected teams
- Confirmation not required (easy undo by reselecting)

---

#### S-TRD023: Trade History
**As a** user reviewing past trades
**I want to** see all trades made this offseason
**So that** I can track what's happened

**Acceptance Criteria:**
- Trade History section/tab shows all completed trades
- Each trade shows:
  - Teams involved
  - Players exchanged
  - Salary impact
  - Date/time of trade
- Filterable by team
- Exportable/printable for reference

---

#### S-TRD024: Trade Phase Completion
**As a** user finishing the trade phase
**I want to** confirm I'm done trading
**So that** I can proceed to Finalize & Advance

**Acceptance Criteria:**
- [Continue to Finalize & Advance →] button
- Confirmation: "Are you done trading? You can still trade during Finalize if needed."
- Pending AI proposals expire (or prompt to address them)
- All trades logged in transaction history
- Proceed to Finalize & Advance phase

---

## Data Models

### Trade
```typescript
interface Trade {
  id: string;
  type: 'TWO_WAY' | 'THREE_WAY';
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
  teams: string[];                    // Team IDs involved
  playerMovements: PlayerMovement[];
  salaryImpact: Map<string, number>;  // TeamID → salary change
  proposedBy: string;                 // Team ID or 'USER'
  proposedAt: Date;
  resolvedAt?: Date;
  beatReporterWarnings: BeatReporterWarning[];
}

interface PlayerMovement {
  playerId: string;
  playerName: string;
  position: Position;
  grade: Grade;
  salary: number;
  fromTeamId: string;
  toTeamId: string;
  fromRoster: 'MLB' | 'FARM';
  toRoster: 'MLB' | 'FARM';
}
```

### Waiver Claim
```typescript
interface WaiverClaim {
  id: string;
  playerId: string;
  playerName: string;
  releasedBy: string;              // Team ID
  claimOrder: string[];            // Team IDs in claim order
  currentClaimIndex: number;
  status: 'ACTIVE' | 'CLAIMED' | 'UNCLAIMED';
  claimedBy?: string;              // Team ID if claimed
  droppedPlayerId?: string;        // Player dropped to make room
  createdAt: Date;
  resolvedAt?: Date;
}
```

### Beat Reporter Warning
```typescript
interface BeatReporterWarning {
  id: string;
  message: string;
  category: 'MORALE' | 'RELATIONSHIP' | 'FAN' | 'CHEMISTRY' | 'AI_HINT';
  accuracy: number;                // 0.6 to 0.9 (hidden)
  actuallyTrue?: boolean;          // Revealed through consequences
  tradeId: string;
}
```

---

## Business Rules Summary

1. **No Salary Matching** - Teams can freely increase or decrease payroll
2. **Beat Reporter Warnings** - Advisory only, 60-90% accuracy, cannot block trades
3. **AI Protection** - AI evaluates trades realistically, won't accept exploits
4. **AI Proposals** - AI teams actively propose trades based on needs
5. **Waiver Order** - Reverse standings (worst team gets first claim)
6. **Roster Flexibility** - Farm can exceed 10 temporarily; validated at Finalize & Advance
7. **Three-Way Trades** - All three teams must accept independently
8. **Tradeable Players** - MLB roster + Farm roster + new draftees

---

## Screen Flow

```
TRADE PHASE
│
├── Main Trade Interface
│   ├── Two-Way Trade Tab
│   │   ├── Team 1 Selection + Players
│   │   └── Team 2 Selection + Players
│   └── Three-Way Trade Tab
│       ├── Team 1 Selection + Players
│       ├── Team 2 Selection + Players
│       └── Team 3 Selection + Players
│
├── Trade Proposal Flow
│   ├── Select Players
│   ├── View Summary
│   ├── Beat Reporter Warnings
│   ├── Propose Trade
│   └── AI Response (Accept/Reject/Counter)
│
├── AI Proposals Inbox
│   ├── View Proposals
│   └── Accept/Counter/Decline
│
├── Waiver Wire (triggered by releases)
│   ├── Claim Order Display
│   ├── Claim or Pass Decision
│   └── Results Summary
│
└── Trade History
    └── All Completed Trades
```

---

## Integration Points

- **Draft Phase** → Trade Phase (Farm may have >10 players)
- **Trade Phase** → Finalize & Advance (rosters validated there)
- **Waiver Wire** ↔ Finalize & Advance (releases trigger waivers)
- **Morale System** ← Trade effects (queued, applied over time)
- **Adaptive Engine** → AI trade proposals and evaluations

---

*End of User Stories - Trade Phase*
