# KBL Trade System Specification

**Version**: 1.0
**Status**: Draft
**Last Updated**: January 2026

---

## 1. Overview

The trade system enables teams to exchange players, farm prospects, and draft swaps to improve their rosters. Trades are designed to be dynamic, story-driven, and fun—prioritizing strategic depth and narrative impact over rigid realism.

### 1.1 Design Principles

- **No unnecessary restrictions** - Rules exist only to enhance user experience
- **Story-driven outcomes** - Trades affect morale, chemistry, fan perception
- **Strategic depth** - Contract values, farm system, draft swaps create interesting decisions
- **Flexible play modes** - Works for single-player (1 user vs CPU) through full multiplayer

---

## 2. Game Mode Configuration

Trade behavior adapts based on franchise setup, selected during initial configuration.

### 2.1 Control Modes

| Mode | Description | AI Involvement |
|------|-------------|----------------|
| **Single-Player** | User controls 1 team, CPU controls all others | Heavy AI trade logic |
| **Partial Control** | User controls 2+ teams but not all | Mixed AI/user trades |
| **Full Control** | User controls all teams | No AI, user-to-user only |

```typescript
interface FranchiseConfig {
  controlMode: 'SINGLE_PLAYER' | 'PARTIAL_CONTROL' | 'FULL_CONTROL';
  userControlledTeams: string[]; // Team IDs
  cpuControlledTeams: string[];  // Team IDs
  hideTrueValueInSeason: boolean; // For single-player suspense
}
```

### 2.2 Single-Player True Value Hiding

When `hideTrueValueInSeason: true`:
- User sees their own players' True Values
- CPU team players show only Face Value during the season
- True Value revealed at season end (True Value Recalibration phase)
- Creates "buy low" opportunities and trade risk

---

## 3. Trade Windows

### 3.1 In-Season Trading

| Parameter | Value |
|-----------|-------|
| **Opens** | After Week 4 |
| **Closes** | Trade Deadline (65% of regular season) |
| **Restrictions** | None |

> **Note:** Trade deadline calculated as `Math.floor(totalGames × 0.65)`. For a 40-game season, deadline is after game 26.

### 3.2 Offseason Trading

Trades occur as the **final phase** of offseason (after FA and Draft):

```
Phase 10: OFFSEASON TRADES
├─ Occurs after Draft completion
├─ Last opportunity to reshape roster
├─ Can trade players just drafted
├─ Can trade FA signings
└─ Window closes when new season begins
```

This positioning allows teams a "last-ditch effort" to fill gaps that FA and Draft didn't address.

### 3.3 Trade Deadline Drama

The 65% deadline should be a high-drama moment:

```
╔══════════════════════════════════════════════════════════════╗
║              ⏰ TRADE DEADLINE - 2 HOURS REMAINING ⏰         ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  League Activity:                                             ║
║  • 3 trades completed today                                   ║
║  • 5 proposals pending                                        ║
║  • Your team: 1 incoming proposal                             ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ 📥 INCOMING: Boston offers J. Martinez for your         │ ║
║  │    T. Walker + 2nd Round Swap                           │ ║
║  │    [View Details] [Accept] [Counter] [Decline]          │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  [Propose New Trade]                    [View All Activity]   ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 4. Trade Matching: Contract Value System

### 4.1 Core Rule

**Trade packages must have combined Contract Values within 10% of each other.**

This replaces the earlier "True Value matching" concept because:
- True Value is visible on team pages (not secret)
- Contract Value creates salary cap strategy
- Allows "overpaying" for talent or "salary dumps"

### 4.2 Contract Value Calculation

```typescript
interface TradePackage {
  players: TradedPlayer[];
  farmProspects: TradedProspect[];
  draftSwaps: DraftSwap[];
  totalContractValue: number;
}

function calculatePackageValue(package: TradePackage): number {
  const playerValue = package.players.reduce(
    (sum, p) => sum + p.contractValue, 0
  );
  const prospectValue = package.farmProspects.reduce(
    (sum, p) => sum + p.contractValue, 0
  );
  const swapValue = package.draftSwaps.reduce(
    (sum, s) => sum + estimateSwapValue(s), 0
  );

  return playerValue + prospectValue + swapValue;
}

function isTradeValid(packageA: TradePackage, packageB: TradePackage): boolean {
  const valueA = calculatePackageValue(packageA);
  const valueB = calculatePackageValue(packageB);

  const difference = Math.abs(valueA - valueB);
  const threshold = Math.max(valueA, valueB) * 0.10; // 10%

  return difference <= threshold;
}
```

### 4.3 Trade Validation Example

```
Team A offers:        Contract Value
  Mike Trout          $35M
  ─────────────────────────
  Total:              $35M

Team B offers:        Contract Value
  Player X            $20M
  Player Y            $12M
  ─────────────────────────
  Total:              $32M

Difference: $3M (8.6% of $35M)
✅ VALID - Within 10% threshold
```

### 4.4 Salary Dump Trades

Teams CAN offload salary if the other team is willing:

```
Rebuilding team accepts $40M contract for:
  - Promising prospect ($2M contract)
  - 1st Round Draft Swap

Contract values don't match, but...
  - Receiving team gets the player they want
  - Sending team clears cap space
  - Must still be within 10% when INCLUDING swap value
```

---

## 5. Tradeable Assets

### 5.1 MLB Roster Players

Any player on the 22-man roster can be traded.

```typescript
interface TradedPlayer {
  playerId: string;
  playerName: string;
  position: Position;
  contractValue: number;
  contractYearsRemaining: number;
  trueValue: number;
  faceValue: number;
  currentMorale: number;
  personality: PersonalityType;
}
```

**No restrictions on:**
- Recently traded players (can be immediately re-traded)
- Cornerstones (no no-trade clauses)
- Any contract status

### 5.2 Farm System Prospects

Farm prospects can be traded using their contract value.

```typescript
interface TradedProspect {
  oddsId: string;
  position: Position;
  contractValue: number; // Based on weighted ratings distribution
  potentialRating: 'A' | 'B' | 'C' | 'D';
  readyInSeasons: number; // Estimated time to MLB-ready
}
```

**Farm Trade Scenarios:**

1. **Prospect for Veteran**: Trade your blocked prospect for an MLB-ready player
2. **Clear roster spot**: Trade veteran, move MLB player to farm, slot in traded player
3. **Prospect swap**: Exchange farm assets between teams

```
Example:
Team A has SS prospect blocked by All-Star SS
Team B needs SS prospect, has expendable veteran OF

Trade:
  Team A sends: SS Prospect ($800K)
  Team B sends: OF Veteran ($1.2M)

Team A: Promotes backup INF, now has OF upgrade
Team B: Has future SS solution
```

### 5.3 Draft Swaps

Teams can trade draft position swaps for the **upcoming draft only**.

```typescript
interface DraftSwap {
  round: 1 | 2 | 3 | 4 | 5;
  year: number; // Must be upcoming draft year only
  teamGiving: string;
  teamReceiving: string;
  estimatedValue: number; // Based on current standings
}
```

**Why swaps, not picks:**
- Simpler to track than "Team A's 1st rounder"
- Creates interesting strategy (swap could favor either team)
- Outcome determined by final standings

**Why upcoming year only:**
- Avoids abstract multi-year tracking
- Contraction risk (what if team doesn't exist?)
- Keeps decisions concrete and immediate

#### Draft Swap Value Estimation

Swap value based on current standings differential:

```typescript
function estimateSwapValue(swap: DraftSwap): number {
  const teamGivingPosition = getStandingsPosition(swap.teamGiving);
  const teamReceivingPosition = getStandingsPosition(swap.teamReceiving);

  // Base values by round
  const baseValues = {
    1: 5_000_000,  // 1st round swap worth ~$5M
    2: 2_500_000,
    3: 1_000_000,
    4: 500_000,
    5: 250_000
  };

  // Adjust based on standings differential
  const positionDiff = teamGivingPosition - teamReceivingPosition;
  const modifier = 1 + (positionDiff * 0.05); // ±5% per position

  return baseValues[swap.round] * modifier;
}
```

---

## 6. Trade Impacts

### 6.1 Player Morale Effects

Trades directly impact player morale:

```typescript
interface TradeMoraleImpact {
  playerId: string;
  previousMorale: number;
  moraleChange: number;
  newMorale: number;
  reason: string;
}

function calculateTradeMoraleImpact(
  player: Player,
  fromTeam: Team,
  toTeam: Team
): TradeMoraleImpact {
  let change = 0;
  let reasons: string[] = [];

  // Base trade shock
  change -= 10;
  reasons.push("Trade shock");

  // Personality-based reactions
  switch (player.personality) {
    case 'COMPETITIVE':
      if (toTeam.isContender) {
        change += 15;
        reasons.push("Excited to compete");
      }
      break;
    case 'RELAXED':
      change += 5; // Takes it in stride
      reasons.push("Taking it easy");
      break;
    case 'DROOPY':
      change -= 10;
      reasons.push("Sad to leave");
      break;
    case 'EGOTISTICAL':
      if (toTeam.marketSize > fromTeam.marketSize) {
        change += 10;
        reasons.push("Bigger spotlight");
      }
      break;
    // ... other personalities
  }

  // Hometown factor
  if (toTeam.city === player.hometown) {
    change += 20;
    reasons.push("Going home!");
  }

  // Chemistry with new teammates
  const chemistryFit = calculateChemistryFit(player, toTeam.roster);
  change += chemistryFit * 5;

  return {
    playerId: player.id,
    previousMorale: player.morale,
    moraleChange: change,
    newMorale: clamp(player.morale + change, 0, 99),
    reason: reasons.join(", ")
  };
}
```

### 6.2 Team Chemistry Effects

Trades can disrupt or improve team chemistry:

```typescript
interface TradeChemistryImpact {
  teamId: string;
  previousPotency: number;
  newPotency: number;
  pairsLost: ChemistryPair[];
  pairsGained: ChemistryPair[];
}

// When trading away a player
function assessChemistryLoss(
  player: Player,
  team: Team
): TradeChemistryImpact {
  // Find all chemistry pairs involving this player
  const affectedPairs = team.chemistryPairs.filter(
    pair => pair.player1 === player.id || pair.player2 === player.id
  );

  // Calculate new team potency without these pairs
  const newPotency = team.chemistryPotency - affectedPairs.length;

  return {
    teamId: team.id,
    previousPotency: team.chemistryPotency,
    newPotency: Math.max(0, newPotency),
    pairsLost: affectedPairs,
    pairsGained: []
  };
}
```

### 6.3 Fan Morale Effects

Fan morale responds to trade outcomes over time:

```typescript
interface FanMoraleTradeImpact {
  immediateReaction: number;    // Based on perceived value
  seasonEndAdjustment: number;  // Based on actual performance
}

function calculateFanTradeReaction(
  playersAcquired: Player[],
  playersLost: Player[],
  teamExpectedWins: number
): FanMoraleTradeImpact {
  // Immediate: Fans react to Face Value (what they see)
  const acquiredFV = sum(playersAcquired.map(p => p.faceValue));
  const lostFV = sum(playersLost.map(p => p.faceValue));
  const perceivedValue = acquiredFV - lostFV;

  let immediateReaction = 0;
  if (perceivedValue > 10) immediateReaction = 5;  // "Great trade!"
  else if (perceivedValue < -10) immediateReaction = -5; // "Why?!"

  // Season-end: Fans react to Expected Wins change
  // (Calculated dynamically as season progresses)

  return {
    immediateReaction,
    seasonEndAdjustment: 0 // Calculated at season end
  };
}
```

#### Expected Wins Dynamic Updates

Expected Wins should update dynamically throughout the season:

```typescript
interface ExpectedWinsUpdate {
  preTradeExpectedWins: number;
  postTradeExpectedWins: number;
  change: number;
  fanPerception: 'EXCITED' | 'NEUTRAL' | 'CONCERNED' | 'ANGRY';
}

// Recalculate after each trade
function updateExpectedWins(team: Team): ExpectedWinsUpdate {
  const preTrade = team.expectedWins;

  // Recalculate based on new roster True Values
  const newExpected = calculateExpectedWins(team.roster);

  const change = newExpected - preTrade;

  let fanPerception: FanPerception;
  if (change >= 5) fanPerception = 'EXCITED';
  else if (change >= 0) fanPerception = 'NEUTRAL';
  else if (change >= -5) fanPerception = 'CONCERNED';
  else fanPerception = 'ANGRY';

  return {
    preTradeExpectedWins: preTrade,
    postTradeExpectedWins: newExpected,
    change,
    fanPerception
  };
}
```

### 6.4 Salary Cap Implications

Taking on salary has consequences:

| Scenario | Fan Reaction | Long-term Impact |
|----------|--------------|------------------|
| Add salary + Win more | +10 morale | "Smart investment" |
| Add salary + Same/worse | -15 morale | "Wasted money" |
| Dump salary + Win more | +15 morale | "Genius move" |
| Dump salary + Win less | -5 morale | "Expected rebuild" |

---

## 7. Trade Proposal Flow

### 7.1 User Initiating Trade

```
╔══════════════════════════════════════════════════════════════╗
║                    📋 PROPOSE TRADE 📋                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Trading with: Boston Red Sox                                 ║
║                                                               ║
║  ┌─────────────────────┐    ┌─────────────────────┐          ║
║  │ YOU SEND            │    │ YOU RECEIVE         │          ║
║  │                     │    │                     │          ║
║  │ T. Walker (SP)      │    │ J. Martinez (OF)    │          ║
║  │ $12M                │    │ $18M                │          ║
║  │                     │    │                     │          ║
║  │ 2nd Round Swap      │    │                     │          ║
║  │ ~$2.5M value        │    │                     │          ║
║  │                     │    │                     │          ║
║  ├─────────────────────┤    ├─────────────────────┤          ║
║  │ TOTAL: $14.5M       │    │ TOTAL: $18M         │          ║
║  └─────────────────────┘    └─────────────────────┘          ║
║                                                               ║
║  Difference: $3.5M (19.4%) ❌ EXCEEDS 10% THRESHOLD          ║
║                                                               ║
║  💡 Add ~$2M in assets to balance trade                      ║
║                                                               ║
║  [Add Players] [Add Prospects] [Add Swap]    [Cancel]         ║
╚══════════════════════════════════════════════════════════════╝
```

### 7.2 Valid Trade Ready to Submit

```
╔══════════════════════════════════════════════════════════════╗
║                    📋 PROPOSE TRADE 📋                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Trading with: Boston Red Sox                                 ║
║                                                               ║
║  ┌─────────────────────┐    ┌─────────────────────┐          ║
║  │ YOU SEND            │    │ YOU RECEIVE         │          ║
║  │                     │    │                     │          ║
║  │ T. Walker (SP)      │    │ J. Martinez (OF)    │          ║
║  │ $12M                │    │ $18M                │          ║
║  │                     │    │                     │          ║
║  │ M. Johnson (FARM)   │    │                     │          ║
║  │ $850K               │    │                     │          ║
║  │                     │    │                     │          ║
║  │ 2nd Round Swap      │    │                     │          ║
║  │ ~$2.5M value        │    │                     │          ║
║  │                     │    │                     │          ║
║  ├─────────────────────┤    ├─────────────────────┤          ║
║  │ TOTAL: $15.35M      │    │ TOTAL: $18M         │          ║
║  └─────────────────────┘    └─────────────────────┘          ║
║                                                               ║
║  Difference: $2.65M (14.7%) ❌ STILL EXCEEDS 10%             ║
║                                                               ║
║  [Adjust Package]                                [Cancel]     ║
╚══════════════════════════════════════════════════════════════╝
```

After adding more:

```
║  Difference: $1.2M (6.7%) ✅ VALID TRADE                     ║
║                                                               ║
║  [Submit Proposal]                               [Cancel]     ║
```

### 7.3 Trade Impact Preview

Before submitting, show projected impacts:

```
╔══════════════════════════════════════════════════════════════╗
║                 📊 TRADE IMPACT PREVIEW 📊                    ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ROSTER CHANGES                                               ║
║  ├─ Outfield depth: ▲ Improved (Martinez is upgrade)         ║
║  ├─ Rotation depth: ▼ Reduced (losing Walker)                ║
║  └─ Farm system: ▼ Lost prospect M. Johnson                  ║
║                                                               ║
║  CHEMISTRY IMPACT                                             ║
║  ├─ Losing: Walker ↔ Smith battery pair (-1 potency)         ║
║  └─ Gaining: Martinez ↔ Reyes hometown pair (+1 potency)     ║
║  └─ Net change: ±0 potency                                   ║
║                                                               ║
║  EXPECTED WINS                                                ║
║  ├─ Before trade: 78 wins                                    ║
║  ├─ After trade: 81 wins                                     ║
║  └─ Change: +3 wins 📈                                       ║
║                                                               ║
║  FAN REACTION: 😊 Positive (acquiring known star)            ║
║                                                               ║
║  [Confirm & Submit]                              [Go Back]    ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 8. AI Trade Logic (Single-Player Mode)

### 8.1 CPU Team Trade Behavior

CPU teams evaluate trades based on multiple factors:

```typescript
interface CPUTradeEvaluation {
  valueAssessment: number;      // Contract value differential
  needsFit: number;             // Does trade fill a gap?
  futureValue: number;          // Prospects/swaps value
  chemistryFit: number;         // Personality compatibility
  competitiveWindow: number;    // Contender vs rebuilder
  overallScore: number;         // Combined evaluation
  decision: 'ACCEPT' | 'COUNTER' | 'REJECT';
}

function evaluateTradeAsCPU(
  proposal: TradeProposal,
  cpuTeam: Team
): CPUTradeEvaluation {
  // Value assessment (are we getting fair value?)
  const receivingValue = calculatePackageValue(proposal.cpuReceives);
  const givingValue = calculatePackageValue(proposal.cpuGives);
  const valueAssessment = (receivingValue - givingValue) / givingValue;

  // Needs fit (do we need what we're getting?)
  const needsFit = assessPositionalNeeds(cpuTeam, proposal.cpuReceives);

  // Future value (prospects and swaps)
  const futureValue = assessFutureAssets(proposal.cpuReceives);

  // Chemistry fit
  const chemistryFit = assessChemistryFit(
    proposal.cpuReceives.players,
    cpuTeam.roster
  );

  // Competitive window
  const competitiveWindow = cpuTeam.isContender
    ? preferWinNowAssets(proposal)
    : preferFutureAssets(proposal);

  // Calculate overall score
  const overallScore =
    valueAssessment * 0.3 +
    needsFit * 0.25 +
    futureValue * 0.2 +
    chemistryFit * 0.1 +
    competitiveWindow * 0.15;

  // Decision thresholds
  let decision: TradeDecision;
  if (overallScore >= 0.1) decision = 'ACCEPT';
  else if (overallScore >= -0.1) decision = 'COUNTER';
  else decision = 'REJECT';

  return {
    valueAssessment, needsFit, futureValue,
    chemistryFit, competitiveWindow, overallScore, decision
  };
}
```

### 8.2 CPU Counter-Offers

When CPU decides to counter:

```typescript
interface CounterOffer {
  originalProposal: TradeProposal;
  counterProposal: TradeProposal;
  reasoning: string;
}

function generateCounterOffer(
  original: TradeProposal,
  cpuTeam: Team,
  evaluation: CPUTradeEvaluation
): CounterOffer {
  const counter = { ...original };

  // If value is low, ask for more
  if (evaluation.valueAssessment < 0) {
    // Try to add a draft swap
    const swap = findAvailableSwap(original.userTeam);
    if (swap) {
      counter.cpuReceives.draftSwaps.push(swap);
    } else {
      // Ask for additional player
      const target = findTradeablePlayer(original.userTeam, cpuTeam.needs);
      if (target) counter.cpuReceives.players.push(target);
    }
  }

  // If we're giving up too much, reduce our side
  if (evaluation.valueAssessment > 0.15) {
    const expendable = findMostExpendable(counter.cpuGives.players);
    counter.cpuGives.players = counter.cpuGives.players.filter(
      p => p.id !== expendable.id
    );
  }

  return {
    originalProposal: original,
    counterProposal: counter,
    reasoning: generateCounterReasoning(evaluation)
  };
}
```

### 8.3 Counter-Offer UI

```
╔══════════════════════════════════════════════════════════════╗
║                   📨 COUNTER-OFFER RECEIVED 📨                ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Boston Red Sox responded to your proposal:                   ║
║                                                               ║
║  "We like Walker, but we'd need more to part with Martinez.  ║
║   Add your 1st round swap and we have a deal."               ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ THEIR COUNTER:                                          │ ║
║  │                                                          │ ║
║  │ You Send:              You Receive:                     │ ║
║  │ • T. Walker (SP)       • J. Martinez (OF)               │ ║
║  │ • M. Johnson (FARM)                                     │ ║
║  │ • 1st Round Swap ←NEW                                   │ ║
║  │ • 2nd Round Swap                                        │ ║
║  │                                                          │ ║
║  │ Total: $18.2M          Total: $18M                      │ ║
║  │ Difference: 1.1% ✅                                     │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  [Accept Counter]  [Counter Their Counter]  [Decline]         ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 9. Trade Veto System (Multiplayer)

### 9.1 Purpose

Prevent egregiously bad trades that harm league integrity in multiplayer.

### 9.2 Veto Process

```typescript
interface TradeVeto {
  tradeId: string;
  vetoWindow: number; // Hours before trade finalizes
  vetosRequired: number; // Majority of non-involved teams
  currentVetos: string[]; // Team IDs that vetoed
  status: 'PENDING' | 'APPROVED' | 'VETOED';
}

function calculateVetosRequired(totalTeams: number): number {
  const nonInvolved = totalTeams - 2; // Exclude trading teams
  return Math.ceil(nonInvolved / 2); // Simple majority
}
```

### 9.3 Veto UI

```
╔══════════════════════════════════════════════════════════════╗
║                 ⚖️ TRADE PENDING APPROVAL ⚖️                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  New York Thunder → Boston Red Sox                            ║
║                                                               ║
║  NYT Sends:                BOS Sends:                        ║
║  • Mike Trout ($35M)       • Rookie ($500K)                  ║
║                            • 5th Round Swap                  ║
║                                                               ║
║  ⚠️ Large value disparity detected                           ║
║                                                               ║
║  Veto Status: 2 of 4 required                                ║
║  Time Remaining: 18 hours                                     ║
║                                                               ║
║  [Cast Veto Vote]                        [Allow Trade]        ║
╚══════════════════════════════════════════════════════════════╝
```

### 9.4 Veto Thresholds

| League Size | Vetos Required | Veto Window |
|-------------|----------------|-------------|
| 6 teams | 2 votes | 24 hours |
| 12 teams | 5 votes | 24 hours |
| 20 teams | 9 votes | 48 hours |
| 30 teams | 14 votes | 48 hours |

---

## 10. Morale Display System

### 10.1 Morale as 0-99 Value

Player morale displayed as a number with color coding:

```typescript
interface MoraleDisplay {
  value: number; // 0-99
  color: MoraleColor;
  label: string;
  trend: 'RISING' | 'STABLE' | 'FALLING';
}

type MoraleColor = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

function getMoraleDisplay(morale: number, previousMorale: number): MoraleDisplay {
  let color: MoraleColor;
  let label: string;

  if (morale >= 75) {
    color = 'GREEN';
    label = 'Thriving';
  } else if (morale >= 50) {
    color = 'YELLOW';
    label = 'Content';
  } else if (morale >= 25) {
    color = 'ORANGE';
    label = 'Unhappy';
  } else {
    color = 'RED';
    label = 'Miserable';
  }

  const trend = morale > previousMorale ? 'RISING'
    : morale < previousMorale ? 'FALLING'
    : 'STABLE';

  return { value: morale, color, label, trend };
}
```

### 10.2 Team Page Morale Column

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        NEW YORK THUNDER ROSTER                            ║
╠══════════════════════════════════════════════════════════════════════════╣
║ NAME          │ POS │ CONTRACT │ TRUE VAL │ FACE VAL │ MORALE │ TREND   ║
╠═══════════════╪═════╪══════════╪══════════╪══════════╪════════╪═════════╣
║ A. Judge      │ RF  │ $40M     │ 8.2      │ 8.5      │ 🟢 82  │ ▲       ║
║ G. Cole       │ SP  │ $36M     │ 6.8      │ 7.1      │ 🟢 78  │ ─       ║
║ J. Soto       │ LF  │ $32M     │ 7.4      │ 7.0      │ 🟡 55  │ ▼       ║
║ G. Torres     │ 2B  │ $14M     │ 4.2      │ 4.5      │ 🟠 38  │ ▼       ║
║ A. Volpe      │ SS  │ $1.2M    │ 3.8      │ 3.5      │ 🟢 71  │ ▲       ║
║ ...           │     │          │          │          │        │         ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 10.3 Morale Factors (for tooltip/detail view)

```
╔══════════════════════════════════════════════════════════════╗
║                   J. SOTO - MORALE DETAILS                    ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Current Morale: 55 (Content)                                ║
║                                                               ║
║  FACTORS:                                                     ║
║  ├─ Base personality (COMPETITIVE): 60                       ║
║  ├─ Team performance: -5 (below expectations)                ║
║  ├─ Playing time: +0 (starter)                               ║
║  ├─ Chemistry pairs: +5 (2 positive connections)             ║
║  ├─ Recent trade: -5 (still adjusting)                       ║
║  └─ Contract status: +0 (fairly paid)                        ║
║                                                               ║
║  Trend: ▼ Falling (was 62 last month)                        ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 11. Three-Team Trades

### 11.1 Structure

Three-team trades require contract value balance across all teams:

```typescript
interface ThreeTeamTrade {
  teamA: TradeParticipant;
  teamB: TradeParticipant;
  teamC: TradeParticipant;
}

interface TradeParticipant {
  teamId: string;
  sending: TradePackage;
  receiving: TradePackage;
}

function validateThreeTeamTrade(trade: ThreeTeamTrade): boolean {
  // Each team's send/receive must be within 10%
  const teams = [trade.teamA, trade.teamB, trade.teamC];

  for (const team of teams) {
    const sendValue = calculatePackageValue(team.sending);
    const receiveValue = calculatePackageValue(team.receiving);

    const diff = Math.abs(sendValue - receiveValue);
    const threshold = Math.max(sendValue, receiveValue) * 0.10;

    if (diff > threshold) return false;
  }

  // Total assets in must equal total assets out
  const totalSent = teams.reduce(
    (sum, t) => sum + calculatePackageValue(t.sending), 0
  );
  const totalReceived = teams.reduce(
    (sum, t) => sum + calculatePackageValue(t.receiving), 0
  );

  return totalSent === totalReceived;
}
```

### 11.2 Three-Team Trade UI

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        🔄 THREE-TEAM TRADE 🔄                             ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐           ║
║  │  NEW YORK    │      │   BOSTON     │      │   CHICAGO    │           ║
║  │   THUNDER    │      │   RED SOX    │      │    CUBS      │           ║
║  ├──────────────┤      ├──────────────┤      ├──────────────┤           ║
║  │ SENDS:       │      │ SENDS:       │      │ SENDS:       │           ║
║  │ T. Walker    │─────▶│ J. Martinez  │─────▶│ C. Bellinger │           ║
║  │ ($12M)       │      │ ($18M)       │      │ ($15M)       │           ║
║  │              │      │              │      │              │           ║
║  │ GETS:        │      │ GETS:        │      │ GETS:        │           ║
║  │ J. Martinez  │◀─────│ C. Bellinger │◀─────│ T. Walker    │           ║
║  │ ($18M)       │      │ ($15M)       │      │ ($12M)       │           ║
║  │              │      │              │      │              │           ║
║  │ Net: +$6M    │      │ Net: -$3M    │      │ Net: -$3M    │           ║
║  └──────────────┘      └──────────────┘      └──────────────┘           ║
║                                                                           ║
║  ⚠️ Chicago sending below 10% threshold - add assets to balance          ║
║                                                                           ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 12. Integration with Other Systems

### 12.1 Offseason Phase Placement

> **Note (January 23, 2026):** OFFSEASON_SYSTEM_SPEC.md is the authoritative source for phase numbering.

Per OFFSEASON_SYSTEM_SPEC.md, Offseason Trades is **Phase 10** (not Phase 11):

```
Phase 1: Season End Processing
Phase 2: Awards Ceremony
Phase 3: True Value Recalibration
Phase 4: Contraction Check
Phase 5: Retirement & Legacy
Phase 6: Free Agency
Phase 7: Draft
Phase 8: Farm System Reconciliation
Phase 9: Chemistry Rebalancing
Phase 10: OFFSEASON TRADES ← This spec
├─ Opens after chemistry rebalancing
├─ All teams can propose/accept trades
├─ Final roster adjustments before season
└─ Window closes when user confirms "Ready for Season"
Phase 11: New Season Prep
```

### 12.2 Farm System Integration

When trading farm prospects:
- Prospect's weighted ratings distribution transfers to new team
- Call-up rights transfer immediately
- Prospect morale affected by trade (same personality rules)

### 12.3 Chemistry System Integration

- Recalculate chemistry potency after every trade
- Display lost/gained pairs in trade preview
- Personality conflicts can make trades strategically necessary

### 12.4 Expected Wins Integration

- Update Expected Wins immediately after trade
- Track pre/post trade differential
- Feed into fan morale calculations at season end

---

## 13. Summary

### What's Included

✅ Contract Value matching (10% rule)
✅ Single-player / Partial / Full control modes
✅ True Value hiding option for single-player
✅ Draft swaps (upcoming year only)
✅ Farm prospect trading
✅ No trade limits or recently-traded restrictions
✅ No no-trade clauses
✅ Morale impacts (player and fan)
✅ Chemistry impacts
✅ Expected Wins dynamic updates
✅ Salary dump strategy
✅ AI counter-offers
✅ Trade veto system for multiplayer
✅ Three-team trades
✅ Trade deadline drama
✅ Offseason trades (final phase)

### What's NOT Included

❌ No-trade clauses
❌ Recently traded restrictions
❌ Trade limits per season
❌ Multi-year draft pick trading
❌ Cash considerations
❌ Prospect-only restrictions

---

## Appendix A: Future Considerations

Ideas that could be added later:

1. **Trade History/Reputation**: Track if users frequently "fleece" AI, making future trades harder
2. **Trade Block**: Mark players as available, attracting AI offers
3. **Trade Rumors**: Generate narrative around potential trades
4. **Bidding Wars**: Multiple AI teams competing for same player
5. **Trade Finder**: AI suggests balanced trades for players you want to move
