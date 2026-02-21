# User Stories: Contraction/Expansion Phase

> **Feature Area**: Offseason Phase 4 - Contraction/Expansion
> **Created**: January 29, 2026
> **Source**: OFFSEASON_SYSTEM_SPEC.md §6, KBL_XHD_TRACKER_MASTER_SPEC_v3.md

---

## Overview

The Contraction/Expansion phase handles league structure changes:
1. **Contraction**: Teams with critically low fan morale may fold
2. **Voluntary Sale**: User may choose to sell/contract any team
3. **Expansion Draft**: Existing teams select players from contracted teams
4. **Expansion Team Creation**: User may add new franchises to the league

---

## Story Index

| ID | Story | Priority |
|----|-------|----------|
| S-CE001 | Contraction Risk Detection | P0 |
| S-CE002 | Contraction Probability Roll | P0 |
| S-CE003 | Voluntary Team Sale | P1 |
| S-CE004 | Protection Selection | P0 |
| S-CE005 | Legacy Cornerstone Designation | P0 |
| S-CE006 | Expansion Draft from Contraction | P0 |
| S-CE007 | Scorned Player System | P1 |
| S-CE008 | Remaining Player Disposal | P0 |
| S-CE009 | Defunct Team Museum Entry | P1 |
| S-CE010 | Expansion Team Creation | P1 |
| S-CE011 | Expansion Team Roster Population | P1 |
| S-CE012 | Phase Summary | P0 |
| S-CE013 | Navigation Controls | P0 |

---

## S-CE001: Contraction Risk Detection

**As a** league commissioner,
**I want** to see which teams are at risk of contraction based on fan morale,
**So that** I understand the stakes before the dice roll.

### Acceptance Criteria

- [ ] **AC-1**: System identifies all teams with fan morale < 50 as "at risk"
- [ ] **AC-2**: Display contraction probability based on happiness threshold:
  | Happiness Range | Contraction Probability |
  |-----------------|------------------------|
  | 40-49 | 5% |
  | 30-39 | 15% |
  | 20-29 | 35% |
  | 10-19 | 60% |
  | 0-9 | 85% |
- [ ] **AC-3**: Teams with morale ≥ 50 show "No Risk" status
- [ ] **AC-4**: Display team's fan morale alongside probability
- [ ] **AC-5**: Highlight teams in "critical danger" (≤19 morale) with urgent visual treatment

### Technical Notes

```typescript
interface ContractionRisk {
  teamId: string;
  teamName: string;
  fanMorale: number;
  contractionProbability: number;
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

function getContractionProbability(morale: number): number {
  if (morale >= 50) return 0;
  if (morale >= 40) return 5;
  if (morale >= 30) return 15;
  if (morale >= 20) return 35;
  if (morale >= 10) return 60;
  return 85;
}

function getRiskLevel(morale: number): ContractionRisk['riskLevel'] {
  if (morale >= 50) return 'NONE';
  if (morale >= 40) return 'LOW';
  if (morale >= 30) return 'MEDIUM';
  if (morale >= 20) return 'HIGH';
  return 'CRITICAL';
}
```

---

## S-CE002: Contraction Probability Roll

**As a** league commissioner,
**I want** to roll dice to determine if at-risk teams actually contract,
**So that** there's tension and uncertainty in the outcome.

### Acceptance Criteria

- [ ] **AC-1**: Display roll button for each at-risk team
- [ ] **AC-2**: Roll generates random number 1-100
- [ ] **AC-3**: If roll ≤ contraction probability, team contracts
- [ ] **AC-4**: If roll > probability, team survives
- [ ] **AC-5**: Show clear result: "CONTRACTED" or "SURVIVED"
- [ ] **AC-6**: Display the roll value and threshold for transparency
- [ ] **AC-7**: Process teams in order from lowest morale to highest

### Technical Notes

```typescript
interface ContractionRollResult {
  teamId: string;
  teamName: string;
  fanMorale: number;
  probability: number;
  diceRoll: number;  // 1-100
  contracted: boolean;
}

function rollContraction(risk: ContractionRisk): ContractionRollResult {
  const roll = Math.floor(Math.random() * 100) + 1;
  return {
    teamId: risk.teamId,
    teamName: risk.teamName,
    fanMorale: risk.fanMorale,
    probability: risk.contractionProbability,
    diceRoll: roll,
    contracted: roll <= risk.contractionProbability
  };
}
```

### Example

```
Team: Kansas City Athletics
Fan Morale: 23
Contraction Probability: 35%

🎲 Rolling... 28

Result: 28 ≤ 35 = CONTRACTED ❌
```

---

## S-CE003: Voluntary Team Sale

**As a** league commissioner,
**I want** to voluntarily contract any team regardless of morale,
**So that** I can reshape the league as desired.

### Acceptance Criteria

- [ ] **AC-1**: Display "Sell Team" option for every team (not just at-risk)
- [ ] **AC-2**: Confirmation dialog before voluntary sale
- [ ] **AC-3**: If team morale ≥ 50, trigger Scorned Player System (S-CE007)
- [ ] **AC-4**: If team morale < 50, proceed with normal contraction
- [ ] **AC-5**: Skip dice roll for voluntary sales (automatic contraction)
- [ ] **AC-6**: Log that contraction was voluntary vs forced

### Technical Notes

```typescript
interface VoluntarySale {
  teamId: string;
  wasVoluntary: true;
  moraleAtSale: number;
  triggersScornedPlayer: boolean;  // morale >= 50
}
```

---

## S-CE004: Protection Selection

**As a** team owner of a contracted team,
**I want** to protect 4 players from the expansion draft,
**So that** I can preserve some talent for potential return.

### Acceptance Criteria

- [ ] **AC-1**: First protection slot auto-filled by Cornerstone (if exists)
- [ ] **AC-2**: User selects 3 additional players for slots 2-4
- [ ] **AC-3**: If no Cornerstone, user selects all 4 protection slots
- [ ] **AC-4**: Display all roster players with key stats for selection
- [ ] **AC-5**: Protected players marked clearly, cannot be unprotected
- [ ] **AC-6**: Must select exactly 4 players (or all if roster < 4)
- [ ] **AC-7**: Proceed button disabled until 4 selections made

### Technical Notes

```typescript
interface ProtectionSelection {
  teamId: string;
  protectedPlayers: {
    slot: 1 | 2 | 3 | 4;
    playerId: string;
    playerName: string;
    reason: 'CORNERSTONE' | 'USER_CHOICE';
  }[];
  unprotectedPlayers: string[];  // Available for expansion draft
}
```

---

## S-CE005: Legacy Cornerstone Designation

**As a** league historian,
**I want** the Cornerstone of a contracted team to receive "Legacy Cornerstone" status,
**So that** their tragic history is preserved in the narrative.

### Acceptance Criteria

- [ ] **AC-1**: Cornerstone auto-designated as "Legacy Cornerstone" upon contraction
- [ ] **AC-2**: Status is permanent (never removed)
- [ ] **AC-3**: Affects future team chemistry calculations
- [ ] **AC-4**: Display special badge on player card: "Legacy Cornerstone of [Team Name]"
- [ ] **AC-5**: Record in player's history the contraction event
- [ ] **AC-6**: Museum entry for the player's Legacy Cornerstone designation

### Technical Notes

```typescript
interface LegacyCornerstone {
  playerId: string;
  playerName: string;
  originalTeamId: string;
  originalTeamName: string;
  contractionSeasonId: number;
  designationType: 'LEGACY_CORNERSTONE';
  narrativeWeight: 'TRAGIC';  // Affects story generation
}
```

---

## S-CE006: Expansion Draft from Contraction

**As a** existing team manager,
**I want** to select players from the contracted team's unprotected roster,
**So that** I can strengthen my team.

### Acceptance Criteria

- [ ] **AC-1**: Selection order is reverse standings (worst team picks first)
- [ ] **AC-2**: Each team selects exactly 2 players:
  - 1 Position Player
  - 1 Pitcher
- [ ] **AC-3**: Display available players separated by position type
- [ ] **AC-4**: Show player grade, age, salary, and key stats
- [ ] **AC-5**: Once selected, player removed from available pool
- [ ] **AC-6**: Continue until all teams have selected or pool exhausted
- [ ] **AC-7**: Skip teams already at roster max (22 players)
- [ ] **AC-8**: Display selection order with current picker highlighted

### Technical Notes

```typescript
interface ExpansionDraftPick {
  selectingTeamId: string;
  selectingTeamName: string;
  pickNumber: number;
  selectedPlayer: {
    playerId: string;
    playerName: string;
    position: string;
    positionType: 'POSITION' | 'PITCHER';
    grade: string;
    salary: number;
  };
  pickType: 'POSITION_PLAYER' | 'PITCHER';
}

function getExpansionDraftOrder(teams: Team[]): Team[] {
  // Sort by wins ascending (worst record first)
  return [...teams]
    .filter(t => t.rosterCount < 22)
    .sort((a, b) => a.wins - b.wins);
}
```

---

## S-CE007: Scorned Player System

**As a** league storyteller,
**I want** players from voluntarily-sold teams (with morale ≥ 50) to feel betrayed,
**So that** there are consequences for selling a happy franchise.

### Acceptance Criteria

- [ ] **AC-1**: Only triggers when voluntary sale AND morale ≥ 50
- [ ] **AC-2**: Each unprotected player receives "Scorned" effects:
  - Random personality shift to DROOPY, EGOTISTICAL, or TOUGH
  - Trust damage: -20 to -40 (base, random)
  - Performance volatility for 2 seasons: -15 to +10 rating swing per game
- [ ] **AC-3**: Display scorned effects for each affected player
- [ ] **AC-4**: Record scorned status in player history
- [ ] **AC-5**: Scorned effects clearly marked on player card for 2 seasons
- [ ] **AC-6**: Protected players (4) do NOT receive scorned effects

### Technical Notes

```typescript
interface ScornedPlayerEffect {
  playerId: string;
  playerName: string;
  personalityShift: 'DROOPY' | 'EGOTISTICAL' | 'TOUGH';  // Random selection
  previousPersonality: string;
  trustDamage: number;  // -20 to -40
  volatilityDuration: 2;  // seasons
  volatilityRange: { min: -15, max: +10 };
  effectStartSeason: number;
  effectEndSeason: number;
}

function applyScornedEffects(player: Player): ScornedPlayerEffect {
  const personalities = ['DROOPY', 'EGOTISTICAL', 'TOUGH'];
  return {
    playerId: player.id,
    playerName: player.name,
    personalityShift: personalities[Math.floor(Math.random() * 3)],
    previousPersonality: player.personality,
    trustDamage: -(20 + Math.floor(Math.random() * 21)),  // -20 to -40
    volatilityDuration: 2,
    volatilityRange: { min: -15, max: +10 },
    effectStartSeason: currentSeason,
    effectEndSeason: currentSeason + 2
  };
}
```

---

## S-CE008: Remaining Player Disposal

**As a** league manager,
**I want** remaining players (after expansion draft) to be properly disposed,
**So that** all contracted team players find destinations.

### Acceptance Criteria

- [ ] **AC-1**: After expansion draft, remaining unprotected players enter retirement check
- [ ] **AC-2**: Retirement check has +30% modifier (contraction trauma)
- [ ] **AC-3**: Players who don't retire enter Free Agency pool
- [ ] **AC-4**: Display disposal results for each remaining player
- [ ] **AC-5**: Protected players also enter Free Agency pool (unless retired)
- [ ] **AC-6**: Summary shows: X retired, Y entered FA

### Technical Notes

```typescript
interface PlayerDisposal {
  playerId: string;
  playerName: string;
  wasProtected: boolean;
  retirementRoll: {
    baseProbability: number;
    contractionModifier: 30;  // +30%
    totalProbability: number;
    roll: number;
    retired: boolean;
  } | null;
  finalDestination: 'RETIRED' | 'FREE_AGENCY';
}

function calculateContractionRetirementProbability(
  baseProbability: number
): number {
  // Add 30% modifier, cap at 95%
  return Math.min(95, baseProbability + 30);
}
```

---

## S-CE009: Defunct Team Museum Entry

**As a** league historian,
**I want** contracted teams to be added to the Museum's "Defunct Teams" section,
**So that** their legacy is preserved.

### Acceptance Criteria

- [ ] **AC-1**: Auto-create Museum entry for contracted team
- [ ] **AC-2**: Entry includes:
  - Team name, city, colors, logo
  - Years active (first season to contraction season)
  - Championship count
  - Notable players (all-time WAR leaders)
  - Final season record
  - Reason for contraction (low morale vs voluntary)
- [ ] **AC-3**: Display "Defunct Teams" as separate Museum section
- [ ] **AC-4**: Retired jerseys from team remain in Museum
- [ ] **AC-5**: Link to Legacy Cornerstone (if exists)

### Technical Notes

```typescript
interface DefunctTeamEntry {
  teamId: string;
  teamName: string;
  city: string;
  colors: { primary: string; secondary: string };
  yearsActive: { start: number; end: number };
  totalSeasons: number;
  championships: number;
  playoffAppearances: number;
  finalSeasonRecord: { wins: number; losses: number };
  allTimeWARLeaders: { playerId: string; playerName: string; war: number }[];
  retiredJerseys: JerseyRetirement[];
  legacyCornerstoneId: string | null;
  contractionReason: 'LOW_MORALE' | 'VOLUNTARY_SALE';
  finalFanMorale: number;
}
```

---

## S-CE010: Expansion Team Creation

**As a** league commissioner,
**I want** to add expansion teams to the league,
**So that** the league can grow.

### Acceptance Criteria

- [ ] **AC-1**: Display "Add Expansion Team" option in phase
- [ ] **AC-2**: Require league to have 14+ existing teams for expansion
- [ ] **AC-3**: Expansion team creation wizard:
  - Step 1: City/Market selection
  - Step 2: Team name input
  - Step 3: Primary/Secondary color selection
  - Step 4: Logo selection (from templates or upload)
  - Step 5: Stadium name input
- [ ] **AC-4**: Initial fan morale set to 60 (optimistic new market)
- [ ] **AC-5**: Display preview of new team before confirmation
- [ ] **AC-6**: Can add multiple expansion teams in same offseason
- [ ] **AC-7**: Expansion teams start with empty roster

### Technical Notes

```typescript
interface ExpansionTeam {
  teamId: string;  // Generated
  teamName: string;
  city: string;
  colors: { primary: string; secondary: string };
  logoUrl: string;
  stadiumName: string;
  foundedSeason: number;
  initialFanMorale: 60;
  roster: [];  // Empty - populated in S-CE011
  division: string | null;  // Assigned after creation
}
```

---

## S-CE011: Expansion Team Roster Population

**As a** expansion team manager,
**I want** to populate my roster through an expansion draft from existing teams,
**So that** I can field a competitive team.

### Acceptance Criteria

- [ ] **AC-1**: Each existing team exposes players for expansion draft:
  - Protect 15 players
  - Remaining 7+ players exposed
- [ ] **AC-2**: Expansion team selects in rounds until roster reaches minimum (18)
- [ ] **AC-3**: Selection order rotates (if multiple expansion teams)
- [ ] **AC-4**: Each existing team can lose max 2 players to expansion draft
- [ ] **AC-5**: Display available players by team with grades and salaries
- [ ] **AC-6**: Expansion team salary cap starts at league average
- [ ] **AC-7**: Must select mix of positions (at least 2 pitchers per round)

### Technical Notes

```typescript
interface ExpansionDraftConfig {
  expansionTeamId: string;
  protectionLimit: 15;  // Existing teams protect 15
  maxLossPerTeam: 2;    // Existing teams lose max 2
  targetRosterSize: 18;  // Expansion team minimum
  positionRequirements: {
    minPitchers: 6;
    minPositionPlayers: 9;
  };
}

interface ExpansionDraftSelection {
  round: number;
  expansionTeamId: string;
  selectedFrom: string;  // Team ID
  playerId: string;
  playerName: string;
  position: string;
  grade: string;
  salary: number;
}
```

---

## S-CE012: Phase Summary

**As a** league commissioner,
**I want** to see a summary of all contraction/expansion activity,
**So that** I understand what changed.

### Acceptance Criteria

- [ ] **AC-1**: Display summary screen at phase end
- [ ] **AC-2**: Summary sections:
  - **Teams at Risk**: List with morale and survival/contraction result
  - **Contracted Teams**: List with reason and player count affected
  - **Expansion Draft Results**: By selecting team, players acquired
  - **Player Disposals**: Retired vs Free Agency counts
  - **Expansion Teams Created**: New franchises added
  - **Legacy Cornerstones**: Players designated
- [ ] **AC-3**: "View Details" expands each section
- [ ] **AC-4**: Export summary option (for records)
- [ ] **AC-5**: Continue button to next phase

### Technical Notes

```typescript
interface ContractionExpansionSummary {
  seasonId: number;
  teamsAtRisk: ContractionRisk[];
  teamsContracted: {
    teamId: string;
    teamName: string;
    reason: 'LOW_MORALE' | 'VOLUNTARY_SALE';
    playersAffected: number;
  }[];
  teamsSurvived: {
    teamId: string;
    teamName: string;
    roll: number;
    probability: number;
  }[];
  expansionDraftPicks: ExpansionDraftPick[];
  playerDisposals: {
    retired: number;
    enteredFA: number;
  };
  expansionTeamsCreated: ExpansionTeam[];
  legacyCornerstones: LegacyCornerstone[];
  scornedPlayers: ScornedPlayerEffect[];
}
```

---

## S-CE013: Navigation Controls

**As a** user,
**I want** clear navigation through the contraction/expansion screens,
**So that** I can complete the phase efficiently.

### Acceptance Criteria

- [ ] **AC-1**: Progress indicator shows current step in phase
- [ ] **AC-2**: Can't skip ahead until current step complete
- [ ] **AC-3**: "Back" available for review (read-only for completed steps)
- [ ] **AC-4**: Auto-save after each significant action
- [ ] **AC-5**: Can exit and resume later from last checkpoint
- [ ] **AC-6**: Step sequence:
  1. Risk Assessment (review at-risk teams)
  2. Contraction Rolls (for each at-risk team)
  3. Voluntary Sales (optional)
  4. Protection Selection (per contracted team)
  5. Expansion Draft (if any contractions)
  6. Player Disposal (remaining players)
  7. Expansion Team Creation (optional)
  8. Expansion Team Draft (if new teams)
  9. Summary

### Technical Notes

```typescript
type ContractionExpansionStep =
  | 'RISK_ASSESSMENT'
  | 'CONTRACTION_ROLLS'
  | 'VOLUNTARY_SALES'
  | 'PROTECTION_SELECTION'
  | 'EXPANSION_DRAFT'
  | 'PLAYER_DISPOSAL'
  | 'EXPANSION_CREATION'
  | 'EXPANSION_TEAM_DRAFT'
  | 'SUMMARY';

interface PhaseNavigation {
  currentStep: ContractionExpansionStep;
  completedSteps: ContractionExpansionStep[];
  canProceed: boolean;
  canGoBack: boolean;
}
```

---

## Dependency Map

```
S-CE001 (Risk Detection)
    ↓
S-CE002 (Probability Roll) ←→ S-CE003 (Voluntary Sale)
    ↓                              ↓
    └──────────────────────────────┘
                 ↓
         S-CE004 (Protection Selection)
                 ↓
         S-CE005 (Legacy Cornerstone)
                 ↓
         S-CE006 (Expansion Draft from Contraction)
                 ↓
S-CE007 (Scorned Players) ←── [if voluntary & morale ≥50]
                 ↓
         S-CE008 (Remaining Player Disposal)
                 ↓
         S-CE009 (Defunct Team Museum)
                 ↓
S-CE010 (Expansion Team Creation) ──→ S-CE011 (Expansion Roster)
                 ↓
         S-CE012 (Summary)
                 ↓
         S-CE013 (Navigation)
```

---

## Open Questions

1. **Multiple Contractions**: If multiple teams contract in same season, do they share an expansion draft pool or separate?
   - *Proposed*: Shared pool, alternating picks

2. **Expansion Team Division**: How is new team assigned to division?
   - *Proposed*: User choice with balance recommendation

3. **Protected Players Destination**: Where do protected players go if not drafted?
   - *Current*: Enter Free Agency pool with unprotected players

4. **Expansion Team Salary Cap**: What's the initial cap for new franchises?
   - *Proposed*: League average salary cap

---

*Last Updated: January 29, 2026*
