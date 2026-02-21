# User Stories: Draft Phase

> **Feature Area**: Offseason Phase 7 - Draft
> **Created**: January 29, 2026
> **Updated**: January 29, 2026 - Farm-first draft model
> **Source**: OFFSEASON_SYSTEM_SPEC.md §9, FARM_SYSTEM_SPEC.md

---

## Overview

The Draft phase fills **Farm roster gaps** with new prospects. All drafted players go to the Farm system first - they can be called up to MLB during the Finalize & Advance phase.

**Key Principle**: Draft → Farm → (optional) Call-up to MLB

### Roster Structure Reminder
| Level | Size | Notes |
|-------|------|-------|
| MLB Roster | 22 players | Active roster |
| Farm Roster | 10 players | Development pool |
| **Total** | **32 players** | Per team |

### Draft Flow
1. **Pre-Draft**: Optional inactive player additions
2. **Draft Class Generation**: AI-generated prospects (B to C- grades)
3. **Draft Execution**: Fill Farm roster gaps
4. **Summary**: Review all picks

---

## Story Index

| ID | Story | Priority |
|----|-------|----------|
| S-DRF001 | Pre-Draft: Inactive Player Database | P1 |
| S-DRF002 | Draft Class Generation (Farm Prospects) | P0 |
| S-DRF003 | Draft Order Calculation | P0 |
| S-DRF004 | Draft Order Reveal | P1 |
| S-DRF005 | Draft Pick Selection (to Farm) | P0 |
| S-DRF006 | Full Farm Roster Release Rule | P0 |
| S-DRF007 | Released Player Pool | P1 |
| S-DRF008 | Auto-Draft Option | P2 |
| S-DRF009 | Pass/Skip Pick | P1 |
| S-DRF010 | Draft Completion | P0 |
| S-DRF011 | Undrafted Player Retirement | P1 |
| S-DRF012 | Draft Summary | P0 |
| S-DRF013 | Navigation Controls | P0 |

---

## S-DRF001: Pre-Draft: Inactive Player Database

**As a** league commissioner,
**I want** to add retired players back into the draft class,
**So that** legendary players can return to the league.

### Acceptance Criteria

- [ ] **AC-1**: Display list of all players in inactive database (retired players)
- [ ] **AC-2**: Show player name, position, grade at retirement, retirement season
- [ ] **AC-3**: Multi-select checkboxes to choose players for draft
- [ ] **AC-4**: Selected players added to draft pool alongside generated prospects
- [ ] **AC-5**: "Skip" option to proceed with only generated prospects
- [ ] **AC-6**: Search/filter by name, position, grade
- [ ] **AC-7**: Sort by retirement season, grade, or name
- [ ] **AC-8**: Inactive players enter draft at **Farm-appropriate grade** (capped at B if higher)

### Technical Notes

```typescript
interface InactivePlayer {
  playerId: string;
  firstName: string;
  lastName: string;
  position: string;
  gradeAtRetirement: string;
  retirementSeason: number;
  careerStats: {
    seasons: number;
    war: number;
    allStarSelections: number;
  };
  hallOfFame: boolean;
}

function addToActiveDraftPool(
  inactivePlayers: InactivePlayer[],
  draftPool: DraftProspect[]
): DraftProspect[] {
  const reactivated = inactivePlayers.map(p => ({
    id: p.playerId,
    firstName: p.firstName,
    lastName: p.lastName,
    position: p.position,
    // Cap grade at B for Farm system (no A-tier in farm)
    grade: capGradeForFarm(p.gradeAtRetirement),
    age: 18,  // Reset age for returning players (fresh start)
    source: 'INACTIVE_DATABASE',
    originalRetirementSeason: p.retirementSeason
  }));

  return [...draftPool, ...reactivated];
}

function capGradeForFarm(grade: string): string {
  const farmMaxGrades = ['B', 'B-', 'C+', 'C', 'C-'];
  if (farmMaxGrades.includes(grade)) return grade;
  return 'B';  // Cap A+, A, A- at B for farm
}
```

---

## S-DRF002: Draft Class Generation (Farm Prospects)

**As a** league commissioner,
**I want** the system to generate a fictional draft class of Farm prospects,
**So that** there are enough prospects to fill all Farm roster gaps.

### Acceptance Criteria

- [ ] **AC-1**: Auto-generate draft class based on total **Farm roster gaps** across league
- [ ] **AC-2**: **Farm-appropriate grade distribution** (B to C- only, NO A-tier):
  | Grade | Round 1 | Rounds 2-3 | Later Rounds |
  |-------|---------|------------|--------------|
  | B | 25% | 10% | 5% |
  | B- | 35% | 20% | 15% |
  | C+ | 25% | 35% | 30% |
  | C | 10% | 25% | 30% |
  | C- | 5% | 10% | 20% |
- [ ] **AC-3**: Minimum 2 players at each position (C, 1B, 2B, SS, 3B, LF, CF, RF, SP, RP, CP)
- [ ] **AC-4**: Draft class size = max(22, farm_roster_gaps + 10)
- [ ] **AC-5**: Names generated from provided name database
- [ ] **AC-6**: Age range: 18-21 years old (younger prospects)
- [ ] **AC-7**: Random personality assignment
- [ ] **AC-8**: Each prospect has a **Potential Ceiling** rating (what they could become)
- [ ] **AC-9**: All prospects marked as `destination: 'FARM'`
- [ ] **AC-10**: **Gender distribution**: ~25% of generated prospects should be female

### Technical Notes

```typescript
interface FarmProspect {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';    // ~25% female
  position: Position;
  grade: 'B' | 'B-' | 'C+' | 'C' | 'C-';  // Farm-only grades
  potentialCeiling: 'A' | 'A-' | 'B+' | 'B' | 'B-';  // What they could become
  age: number;          // 18-21
  attributes: PlayerAttributes;
  personality: Personality;
  source: 'GENERATED' | 'INACTIVE_DATABASE';
  destination: 'FARM';  // Always Farm
  yearsInMinors: 0;     // Fresh prospect
}

function generateDraftClass(
  farmRosterGaps: number,
  nameDatabase: NameDatabase
): FarmProspect[] {
  const draftClass: FarmProspect[] = [];

  // Ensure minimum 2 per position
  const positions = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'SP', 'RP', 'CP'];
  for (const pos of positions) {
    draftClass.push(generateFarmProspect(pos, 1, nameDatabase));  // Round 1 quality
    draftClass.push(generateFarmProspect(pos, 2, nameDatabase));  // Round 2 quality
  }

  // Fill remaining slots
  let round = 3;
  while (draftClass.length < Math.max(22, farmRosterGaps + 10)) {
    const randomPos = positions[Math.floor(Math.random() * positions.length)];
    draftClass.push(generateFarmProspect(randomPos, round, nameDatabase));
    round++;
  }

  // Ensure ~25% female distribution
  // Gender assigned per prospect: Math.random() < 0.25 ? 'F' : 'M'
  // NameDatabase should contain both male and female first names

  return draftClass;
}

function generateProspectGrade(round: number): string {
  const roll = Math.random();

  if (round === 1) {
    // Round 1: Better prospects
    if (roll < 0.25) return 'B';
    if (roll < 0.60) return 'B-';
    if (roll < 0.85) return 'C+';
    if (roll < 0.95) return 'C';
    return 'C-';
  } else if (round <= 3) {
    // Rounds 2-3: Standard
    if (roll < 0.10) return 'B';
    if (roll < 0.30) return 'B-';
    if (roll < 0.65) return 'C+';
    if (roll < 0.90) return 'C';
    return 'C-';
  } else {
    // Later rounds: More organizational players
    if (roll < 0.05) return 'B';
    if (roll < 0.20) return 'B-';
    if (roll < 0.50) return 'C+';
    if (roll < 0.80) return 'C';
    return 'C-';
  }
}

function generatePotentialCeiling(currentGrade: string): string {
  const potentialMap = {
    'B':  { 'A': 0.20, 'A-': 0.40, 'B+': 0.30, 'B': 0.10 },
    'B-': { 'A': 0.05, 'A-': 0.25, 'B+': 0.40, 'B': 0.30 },
    'C+': { 'A-': 0.05, 'B+': 0.25, 'B': 0.45, 'B-': 0.25 },
    'C':  { 'B+': 0.10, 'B': 0.30, 'B-': 0.60 },
    'C-': { 'B': 0.15, 'B-': 0.85 },
  };
  return weightedRandomSelect(potentialMap[currentGrade]);
}
```

---

## S-DRF003: Draft Order Calculation

**As a** league commissioner,
**I want** draft order determined by team strength,
**So that** weaker teams get better picks.

### Acceptance Criteria

- [ ] **AC-1**: Calculate average expected WAR per player for each team (MLB roster)
- [ ] **AC-2**: Sort teams by average WAR ascending (worst first)
- [ ] **AC-3**: Use average (not aggregate) to account for roster size differences
- [ ] **AC-4**: Store draft order for multiple rounds
- [ ] **AC-5**: Handle ties by reverse alphabetical (Z picks before A)

### Technical Notes

```typescript
interface DraftOrderEntry {
  teamId: string;
  teamName: string;
  avgExpectedWAR: number;
  pickPosition: number;
  mlbRosterSize: number;
  farmRosterSize: number;
  farmRosterGaps: number;  // 10 - farmRosterSize
}

function calculateDraftOrder(teams: Team[]): DraftOrderEntry[] {
  const entries = teams.map(team => {
    const mlbRoster = team.roster.filter(p => p.level === 'MLB');
    const farmRoster = team.roster.filter(p => p.level === 'FARM');
    const avgWAR = team.totalExpectedWAR / mlbRoster.length;

    return {
      teamId: team.id,
      teamName: team.name,
      avgExpectedWAR: avgWAR,
      pickPosition: 0,
      mlbRosterSize: mlbRoster.length,
      farmRosterSize: farmRoster.length,
      farmRosterGaps: 10 - farmRoster.length
    };
  });

  // Sort by average WAR (worst first)
  entries.sort((a, b) => {
    if (a.avgExpectedWAR !== b.avgExpectedWAR) {
      return a.avgExpectedWAR - b.avgExpectedWAR;
    }
    return b.teamName.localeCompare(a.teamName);
  });

  entries.forEach((entry, index) => {
    entry.pickPosition = index + 1;
  });

  return entries;
}
```

---

## S-DRF004: Draft Order Reveal

**As a** league viewer,
**I want** to see the draft order revealed dramatically,
**So that** there's excitement before picks begin.

### Acceptance Criteria

- [ ] **AC-1**: Display draft order reveal screen before picks begin
- [ ] **AC-2**: Show teams in pick order (1st pick at top)
- [ ] **AC-3**: Display each team's average WAR and **Farm roster gaps**
- [ ] **AC-4**: Highlight user's team position
- [ ] **AC-5**: Option to skip animation and view full order immediately
- [ ] **AC-6**: Proceed to draft execution after reveal

### Technical Notes

```typescript
interface DraftOrderReveal {
  season: number;
  totalTeams: number;
  totalFarmGaps: number;
  order: DraftOrderEntry[];
  userTeamPosition: number;
}
```

---

## S-DRF005: Draft Pick Selection (to Farm)

**As a** team manager,
**I want** to select prospects from the available pool,
**So that** I can fill my **Farm roster** gaps with talent.

### Acceptance Criteria

- [ ] **AC-1**: Display available prospects when team is on the clock
- [ ] **AC-2**: Show prospect details: name, position, grade, **potential ceiling**, age, attributes
- [ ] **AC-3**: Highlight prospects that match team's **Farm roster needs**
- [ ] **AC-4**: Sort/filter by position, grade, potential, age
- [ ] **AC-5**: "Best Fit" recommendation based on Farm gaps
- [ ] **AC-6**: Confirm selection before finalizing pick
- [ ] **AC-7**: Remove selected prospect from available pool
- [ ] **AC-8**: Add prospect to team's **Farm roster** immediately
- [ ] **AC-9**: Display pick confirmation with prospect card showing "→ FARM"

### Technical Notes

```typescript
interface DraftPick {
  round: number;
  pickNumber: number;
  teamId: string;
  teamName: string;
  selectedPlayer: FarmProspect;
  releasedPlayer: Player | null;  // If Farm roster was full
  destination: 'FARM';  // Always Farm
}

interface DraftSelectionContext {
  teamId: string;
  farmRosterSize: number;
  farmRosterGaps: number;  // 10 - farmRosterSize
  positionNeeds: Position[];  // Based on Farm roster composition
  availableProspects: FarmProspect[];
  releasedPlayersPool: Player[];
}

function getRecommendedPick(context: DraftSelectionContext): FarmProspect | null {
  // Find best available that matches a Farm need
  const needMatches = context.availableProspects
    .filter(p => context.positionNeeds.includes(p.position))
    .sort((a, b) => {
      // Sort by grade first, then potential
      const gradeCompare = gradeToValue(b.grade) - gradeToValue(a.grade);
      if (gradeCompare !== 0) return gradeCompare;
      return gradeToValue(b.potentialCeiling) - gradeToValue(a.potentialCeiling);
    });

  if (needMatches.length > 0) return needMatches[0];

  // Otherwise, best available by grade + potential
  return context.availableProspects
    .sort((a, b) => {
      const gradeCompare = gradeToValue(b.grade) - gradeToValue(a.grade);
      if (gradeCompare !== 0) return gradeCompare;
      return gradeToValue(b.potentialCeiling) - gradeToValue(a.potentialCeiling);
    })[0];
}
```

---

## S-DRF006: Full Farm Roster Release Rule

**As a** team manager with a full Farm roster,
**I want** to release a Farm player when drafting,
**So that** I can still acquire new talent.

### Acceptance Criteria

- [ ] **AC-1**: Detect when team has full **Farm roster (10 players)**
- [ ] **AC-2**: Require Farm player release when selecting a prospect
- [ ] **AC-3**: Released player must be **same grade or worse** than prospect
- [ ] **AC-4**: Display eligible release candidates from **Farm roster only**
- [ ] **AC-5**: Cannot complete pick without selecting release candidate
- [ ] **AC-6**: Released player enters "Released Players Pool"
- [ ] **AC-7**: Show warning if releasing B-grade prospect

### Technical Notes

```typescript
function validateDraftPick(
  team: Team,
  prospect: FarmProspect,
  releasedPlayer: Player | null
): { valid: boolean; error?: string } {
  const farmRoster = team.roster.filter(p => p.level === 'FARM');

  // Open Farm slot - no release needed
  if (farmRoster.length < 10) {
    return { valid: true };
  }

  // Full Farm roster - must release someone from Farm
  if (!releasedPlayer) {
    return { valid: false, error: 'Must release a Farm player (Farm roster full at 10)' };
  }

  // Released must be from Farm
  if (releasedPlayer.level !== 'FARM') {
    return { valid: false, error: 'Can only release Farm players during draft' };
  }

  // Released must be same grade or worse
  if (gradeToValue(releasedPlayer.grade) > gradeToValue(prospect.grade)) {
    return {
      valid: false,
      error: `Cannot release ${releasedPlayer.grade} player for ${prospect.grade} prospect`
    };
  }

  return { valid: true };
}

function getEligibleReleaseCandidates(
  farmRoster: Player[],
  prospectGrade: string
): Player[] {
  const prospectValue = gradeToValue(prospectGrade);
  return farmRoster.filter(p => gradeToValue(p.grade) <= prospectValue);
}
```

---

## S-DRF007: Released Player Pool

**As a** team manager,
**I want** to draft released Farm players from other teams,
**So that** I can find value in other teams' discarded prospects.

### Acceptance Criteria

- [ ] **AC-1**: Display released players alongside new prospects
- [ ] **AC-2**: Mark released players distinctly (badge: "Released")
- [ ] **AC-3**: Show releasing team name for context
- [ ] **AC-4**: Released players can be drafted like prospects → go to Farm
- [ ] **AC-5**: If undrafted by end, released players retire
- [ ] **AC-6**: Released players retain their existing stats/history

### Technical Notes

```typescript
interface ReleasedPlayer {
  player: Player;
  releasingTeamId: string;
  releasingTeamName: string;
  releaseRound: number;
  releasePickNumber: number;
  previousLevel: 'FARM';  // Only Farm players released during draft
}

interface DraftPool {
  prospects: FarmProspect[];
  releasedPlayers: ReleasedPlayer[];
}
```

---

## S-DRF008: Auto-Draft Option

**As a** team manager,
**I want** to auto-draft the best available prospect to my Farm,
**So that** I can speed through the draft if desired.

### Acceptance Criteria

- [ ] **AC-1**: "Auto-Draft Best Available" button during pick
- [ ] **AC-2**: Auto-selects highest grade + potential prospect matching Farm need
- [ ] **AC-3**: If no need match, selects highest grade + potential overall
- [ ] **AC-4**: If Farm roster full, auto-selects release candidate (lowest grade)
- [ ] **AC-5**: Show confirmation of auto-draft selection
- [ ] **AC-6**: Can enable "Auto-Draft All Remaining" for full automation

### Technical Notes

```typescript
function autoDraft(context: DraftSelectionContext): DraftPick {
  const prospect = getRecommendedPick(context);

  let releasedPlayer = null;
  if (context.farmRosterSize >= 10) {
    // Release lowest grade Farm player
    const farmRoster = context.team.roster.filter(p => p.level === 'FARM');
    releasedPlayer = farmRoster
      .sort((a, b) => gradeToValue(a.grade) - gradeToValue(b.grade))[0];
  }

  return {
    selectedPlayer: prospect,
    releasedPlayer,
    destination: 'FARM'
  };
}
```

---

## S-DRF009: Pass/Skip Pick

**As a** team manager with a full Farm roster,
**I want** to pass on drafting,
**So that** I can keep my current Farm roster intact.

### Acceptance Criteria

- [ ] **AC-1**: "Pass This Round" option available for teams with **full Farm rosters (10)**
- [ ] **AC-2**: Cannot pass if Farm roster has gaps (must draft)
- [ ] **AC-3**: Passing in Round 1 removes team from all subsequent rounds
- [ ] **AC-4**: Confirmation dialog: "Passing now will exit you from the draft"
- [ ] **AC-5**: Minimum one pick rule: all teams must draft at least once
- [ ] **AC-6**: If team hasn't picked yet, pass option disabled in Round 1

### Technical Notes

```typescript
interface PassRules {
  canPass: boolean;
  reason?: string;
}

function canTeamPass(team: Team, hasDraftedThisDraft: boolean): PassRules {
  const farmRoster = team.roster.filter(p => p.level === 'FARM');

  // Must have full Farm roster
  if (farmRoster.length < 10) {
    return { canPass: false, reason: 'Cannot pass with Farm roster gaps' };
  }

  // Must have drafted at least once
  if (!hasDraftedThisDraft) {
    return { canPass: false, reason: 'Must draft at least one player' };
  }

  return { canPass: true };
}
```

---

## S-DRF010: Draft Completion

**As a** league commissioner,
**I want** the draft to end when all Farm rosters are filled,
**So that** we can proceed to the next phase.

### Acceptance Criteria

- [ ] **AC-1**: Draft continues until all teams have **full Farm rosters (10)** AND all teams have drafted at least once
- [ ] **AC-2**: Teams that pass with full Farm rosters exit the draft
- [ ] **AC-3**: Draft ends when no more teams need to pick
- [ ] **AC-4**: Display "Draft Complete" message
- [ ] **AC-5**: Show total picks, total rounds, and round-by-round breakdown
- [ ] **AC-6**: Reminder: "Drafted players are in your Farm system. Call them up during Finalize & Advance."

### Technical Notes

```typescript
function isDraftComplete(
  teams: Team[],
  draftHistory: DraftPick[],
  passedTeams: Set<string>
): boolean {
  for (const team of teams) {
    if (passedTeams.has(team.id)) continue;

    const farmRoster = team.roster.filter(p => p.level === 'FARM');

    // Team has Farm gap - not complete
    if (farmRoster.length < 10) return false;

    // Team hasn't drafted yet - not complete
    const teamPicks = draftHistory.filter(p => p.teamId === team.id);
    if (teamPicks.length === 0) return false;
  }

  return true;
}
```

---

## S-DRF011: Undrafted Player Retirement

**As a** league historian,
**I want** undrafted released players to retire,
**So that** the player pool stays clean.

### Acceptance Criteria

- [ ] **AC-1**: After draft completes, identify all undrafted released players
- [ ] **AC-2**: Auto-retire all undrafted released players
- [ ] **AC-3**: Add to inactive player database
- [ ] **AC-4**: Display retirement notice for each player
- [ ] **AC-5**: Record retirement reason as "Undrafted - Released from Farm"
- [ ] **AC-6**: Offer jersey retirement option for significant players (called up previously)

### Technical Notes

```typescript
interface UndraftedRetirement {
  playerId: string;
  playerName: string;
  position: string;
  grade: string;
  releasingTeamId: string;
  releasingTeamName: string;
  yearsInFarm: number;
  everCalledUp: boolean;
  reason: 'UNDRAFTED_RELEASED';
}

function processUndraftedPlayers(
  releasedPool: ReleasedPlayer[],
  draftHistory: DraftPick[]
): UndraftedRetirement[] {
  const draftedIds = new Set(draftHistory.map(p => p.selectedPlayer.id));

  return releasedPool
    .filter(r => !draftedIds.has(r.player.id))
    .map(r => ({
      playerId: r.player.id,
      playerName: `${r.player.firstName} ${r.player.lastName}`,
      position: r.player.position,
      grade: r.player.grade,
      releasingTeamId: r.releasingTeamId,
      releasingTeamName: r.releasingTeamName,
      yearsInFarm: r.player.yearsInMinors || 0,
      everCalledUp: r.player.mlbDebut !== null,
      reason: 'UNDRAFTED_RELEASED'
    }));
}
```

---

## S-DRF012: Draft Summary

**As a** league commissioner,
**I want** to see a comprehensive draft summary,
**So that** I understand all Farm roster changes.

### Acceptance Criteria

- [ ] **AC-1**: Display summary screen after draft completion
- [ ] **AC-2**: Summary sections:
  - **Top Prospects**: First 5 picks with team, grade, and **potential ceiling**
  - **By Team**: Each team's picks listed (all go to Farm)
  - **By Position**: Picks grouped by position
  - **Released Players**: All players released during draft
  - **Retired (Undrafted)**: Players who retired due to no selection
  - **Inactive Additions**: Players returned from inactive database
- [ ] **AC-3**: Total statistics: picks, rounds, releases, retirements
- [ ] **AC-4**: "View Farm Roster" links to see updated Farm rosters
- [ ] **AC-5**: Export summary option
- [ ] **AC-6**: Continue to next phase button
- [ ] **AC-7**: Note: "All drafted players are in Farm. Use Finalize & Advance to call up to MLB."

### Technical Notes

```typescript
interface DraftSummary {
  seasonId: number;
  totalPicks: number;
  totalRounds: number;
  picksByTeam: Map<string, DraftPick[]>;
  picksByPosition: Map<Position, DraftPick[]>;
  releasedPlayers: ReleasedPlayer[];
  retiredUndrafted: UndraftedRetirement[];
  fromInactiveDB: DraftPick[];
  topPicks: DraftPick[];  // First 5
  gradeDistribution: Map<string, number>;  // B, B-, C+, C, C-
  potentialDistribution: Map<string, number>;  // A, A-, B+, B, B-
  allPicksDestination: 'FARM';  // Reminder
}
```

---

## S-DRF013: Navigation Controls

**As a** user,
**I want** clear navigation through the draft,
**So that** I can track progress and complete the phase.

### Acceptance Criteria

- [ ] **AC-1**: Progress indicator shows current round and pick
- [ ] **AC-2**: Display "On the Clock" team prominently
- [ ] **AC-3**: Show queue of upcoming teams
- [ ] **AC-4**: Timer option for picks (optional, configurable)
- [ ] **AC-5**: Auto-save after each pick
- [ ] **AC-6**: Can exit and resume later (saves draft state)
- [ ] **AC-7**: Show "Teams with Farm Gaps" count
- [ ] **AC-8**: Phase sequence:
  1. Pre-Draft: Inactive Players
  2. Draft Class Generation (auto)
  3. Draft Order Reveal
  4. Draft Execution (rounds) - all picks → Farm
  5. Undrafted Retirements
  6. Draft Summary

### Technical Notes

```typescript
interface DraftNavigation {
  currentRound: number;
  currentPick: number;
  totalPicks: number;
  onTheClockTeamId: string;
  upcomingTeams: string[];
  teamsWithFarmGaps: number;
  phase: 'PRE_DRAFT' | 'ORDER_REVEAL' | 'DRAFTING' | 'RETIREMENTS' | 'SUMMARY';
}
```

---

## Dependency Map

```
S-DRF001 (Inactive Player DB)
    ↓
S-DRF002 (Draft Class Generation - Farm Prospects)
    ↓
S-DRF003 (Draft Order Calculation)
    ↓
S-DRF004 (Draft Order Reveal)
    ↓
S-DRF005 (Draft Pick Selection → FARM)
    ├──→ S-DRF006 (Full Farm Roster Release)
    │         ↓
    │    S-DRF007 (Released Player Pool)
    │
    ├──→ S-DRF008 (Auto-Draft Option)
    │
    └──→ S-DRF009 (Pass/Skip Pick)
              ↓
         S-DRF010 (Draft Completion)
              ↓
         S-DRF011 (Undrafted Retirement)
              ↓
         S-DRF012 (Draft Summary)
              ↓
         S-DRF013 (Navigation)
```

---

## Key Differences from Previous Version

| Aspect | Previous (Incorrect) | Current (Correct) |
|--------|---------------------|-------------------|
| Draft Destination | MLB Roster (22) | Farm Roster (10) |
| Max Grade | A- | B |
| Grade Range | A- to C- | B to C- |
| Roster Check | MLB slots | Farm slots |
| Release Pool | MLB players | Farm players |
| Call-up | Immediate | Deferred to Finalize & Advance |
| Rookie Status | N/A | Set during call-up in Finalize |

---

## Integration with Later Phases

### Phase: Trades
- Can trade Farm players to other teams
- Can trade for Farm players from other teams

### Phase: Finalize & Advance
- Call up Farm players to MLB (creates Farm vacancy)
- Send down MLB players to Farm (creates MLB vacancy)
- **Rookie designation**: Any player called up who was just drafted OR has never been called up = Rookie next season
- Must end with: 22 MLB + 10 Farm = 32 players per team
- Then advance to next season

---

## Open Questions

1. **Lottery System**: Should there be a draft lottery for bottom teams?
   - *Current*: Pure reverse average WAR

2. **Compensatory Picks**: Should teams that lost major FA signings get compensatory picks?
   - *Proposed*: Not in initial implementation

3. **International Prospects**: Should there be a separate international signing period?
   - *Proposed*: Defer to future enhancement

---

*Last Updated: January 29, 2026*
