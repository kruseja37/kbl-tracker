# Season End Processing - User Stories

> **Phase**: 1 of 11 (Offseason)
> **Trigger**: All regular season games completed (`gameNumber >= totalGames`)
> **Purpose**: Finalize standings, process championship, select postseason MVP, reset mojo
> **Next Phase**: Awards Ceremony (Phase 2)

---

## Overview

Season End Processing is the gateway phase that transitions from Regular Season to the full offseason. It captures competitive outcomes, applies immediate rewards, and prepares data for subsequent phases.

**Key Operations:**
1. Final Standings Calculation & Display
2. Postseason MVP Selection (if playoffs occurred)
3. Championship Processing (+1 Fame to winners)
4. Mojo Reset (all players → Normal)

---

## User Stories

### S-SEP001: Phase Entry Validation

**As a** league manager,
**I want** the system to validate that all regular season games are complete before entering Season End Processing,
**So that** final standings and stats are accurate.

**Acceptance Criteria:**
1. AC-1: Phase 1 only accessible when `gameNumber >= totalGames`
2. AC-2: If games remaining, display "X games remaining" with option to return to Regular Season
3. AC-3: All player stats finalized and locked upon phase entry
4. AC-4: Playoff bracket validated (if playoffs configured)

**Technical Notes:**
```typescript
function canEnterSeasonEnd(season: Season): ValidationResult {
  const gamesRemaining = season.totalGames - season.gameNumber;
  if (gamesRemaining > 0) {
    return { valid: false, reason: `${gamesRemaining} games remaining` };
  }
  if (season.playoffConfigured && !season.playoffComplete) {
    return { valid: false, reason: 'Playoffs not complete' };
  }
  return { valid: true };
}
```

---

### S-SEP002: Final Standings Display

**As a** league manager,
**I want** to see the final standings for all teams organized by division,
**So that** I can review the competitive results before proceeding.

**Acceptance Criteria:**
1. AC-1: Display standings grouped by division
2. AC-2: Each team shows: Rank, Name, W-L, Win%, GB (Games Behind)
3. AC-3: Division winners highlighted with 🏆 indicator
4. AC-4: Playoff seeds shown (1-8 or configured number)
5. AC-5: Wildcard teams indicated if applicable
6. AC-6: [Confirm Standings] button to proceed

**Data Display:**
```
┌─────────────────────────────────────────────────────┐
│  FINAL STANDINGS - SEASON 5                         │
├─────────────────────────────────────────────────────┤
│  EAST DIVISION                                      │
│  ──────────────────────────────────────────────     │
│  🏆 1. Thunderhawks    95-67  .586   -    [1]      │
│     2. Cyclones        88-74  .543   7    [4]      │
│     3. Nightwings      82-80  .506  13             │
│     4. Ironclads       71-91  .438  24             │
│                                                     │
│  WEST DIVISION                                      │
│  ──────────────────────────────────────────────     │
│  🏆 1. Wildcats        92-70  .568   -    [2]      │
│     2. Storm           89-73  .549   3    [3]      │
│     3. Renegades       78-84  .481  14    [WC]     │
│     4. Pioneers        65-97  .401  27             │
└─────────────────────────────────────────────────────┘
                              [ Confirm Standings → ]
```

---

### S-SEP003: Playoff Seed Assignment

**As a** league manager,
**I want** playoff seeds automatically calculated based on regular season records,
**So that** the bracket is set correctly.

**Acceptance Criteria:**
1. AC-1: Division winners get top seeds (1 & 2)
2. AC-2: Remaining seeds by best record
3. AC-3: Tiebreakers applied: Head-to-head → Division record → Run differential
4. AC-4: Wildcard slots filled based on configured playoff format
5. AC-5: Seeds displayed next to team names in standings

**Technical Notes:**
```typescript
interface PlayoffSeed {
  seed: number;
  teamId: string;
  seedType: 'DIVISION_WINNER' | 'WILDCARD' | 'BEST_RECORD';
  record: { wins: number; losses: number };
  tiebreaker?: string;  // If tiebreaker was applied
}

function calculatePlayoffSeeds(
  standings: TeamStanding[],
  config: PlayoffConfig
): PlayoffSeed[] {
  // 1. Division winners get seeds 1-2 (or however many divisions)
  // 2. Fill remaining seeds by best record
  // 3. Apply tiebreakers as needed
  // 4. Return ordered seed array
}
```

---

### S-SEP004: Postseason MVP Candidates (Conditional)

**As a** league manager,
**I want** to see the top 3 postseason MVP candidates if playoffs occurred,
**So that** I can select the most deserving player.

**Acceptance Criteria:**
1. AC-1: Only displayed if `season.playoffGames.length > 0`
2. AC-2: Candidates ranked by postseason WAR (playoff games only)
3. AC-3: Display as face-down cards initially
4. AC-4: User clicks each card to reveal candidate
5. AC-5: Skip this screen entirely if no playoffs occurred

**Postseason WAR Calculation:**
```typescript
function calculatePostseasonWAR(
  playerId: string,
  playoffGames: Game[]
): number {
  // Filter to games where player participated
  // Calculate WAR using playoff-only stats
  // Weight championship round games higher (1.5x)
  return postseasonWAR;
}
```

**Candidate Data:**
```typescript
interface PostseasonMVPCandidate {
  playerId: string;
  playerName: string;
  teamName: string;
  position: string;
  postseasonWAR: number;
  playoffStats: {
    gamesPlayed: number;
    // Hitters
    avg?: number;
    hr?: number;
    rbi?: number;
    // Pitchers
    era?: number;
    wins?: number;
    saves?: number;
  };
}
```

---

### S-SEP005: Postseason MVP Card Reveal

**As a** league manager,
**I want** to reveal each MVP candidate through a card flip interaction,
**So that** the selection feels ceremonial and engaging.

**Acceptance Criteria:**
1. AC-1: Three face-down cards displayed (Bronze, Silver, Gold frames)
2. AC-2: Click card to flip and reveal candidate
3. AC-3: Card shows: Player name, team, position, postseason WAR, key stats
4. AC-4: Cards remain revealed once flipped
5. AC-5: All three must be revealed before selection enabled
6. AC-6: Reveal order: 3rd place → 2nd place → 1st place (by WAR)

**Card States:**
```typescript
type CardState = 'FACE_DOWN' | 'REVEALING' | 'REVEALED';

interface MVPCard {
  rank: 1 | 2 | 3;
  state: CardState;
  candidate: PostseasonMVPCandidate;
  frameStyle: 'GOLD' | 'SILVER' | 'BRONZE';
}
```

---

### S-SEP006: Postseason MVP Selection

**As a** league manager,
**I want** to select the postseason MVP from the revealed candidates,
**So that** the award is recorded and bonuses applied.

**Acceptance Criteria:**
1. AC-1: After all cards revealed, [Select as MVP] button appears on each
2. AC-2: User can select any of the three candidates (not just #1 by WAR)
3. AC-3: Selected player receives +10 rating points (max +5 per category)
4. AC-4: Confirmation modal shows rating distribution before finalizing
5. AC-5: Award recorded in player history and season records

**Rating Bonus Distribution:**
```typescript
interface MVPRatingBonus {
  playerId: string;
  totalBonus: 10;  // Always +10 total
  distribution: {
    category: RatingCategory;
    bonus: number;  // Max 5 per category
  }[];
}

// Example distribution for a hitter:
// Contact +5, Power +3, Speed +2 = 10 total

// System auto-distributes based on player's lowest ratings
// to help balance their profile
```

---

### S-SEP007: Championship Team Identification

**As a** league manager,
**I want** the system to identify the championship-winning team,
**So that** appropriate bonuses can be applied.

**Acceptance Criteria:**
1. AC-1: Championship team identified from playoff bracket winner
2. AC-2: Display championship team name with trophy graphic
3. AC-3: List all players on championship roster (at season end)
4. AC-4: Show "+1 Fame" indicator next to each player
5. AC-5: If no playoffs configured, skip championship processing

**Technical Notes:**
```typescript
interface ChampionshipResult {
  teamId: string;
  teamName: string;
  seasonNumber: number;
  rosterAtChampionship: string[];  // Player IDs
  opponentTeamId: string;
  seriesResult: string;  // e.g., "4-2"
}
```

---

### S-SEP008: Championship Fame Bonus Application

**As a** league manager,
**I want** all players on the championship team to receive +1 Fame bonus,
**So that** their career achievements are properly recorded.

**Acceptance Criteria:**
1. AC-1: Each player on championship roster gets +1 Fame Bonus
2. AC-2: Fame bonus is cumulative (persists across seasons)
3. AC-3: Player's `Championships` counter incremented
4. AC-4: Confirmation screen shows all affected players
5. AC-5: Fame affects future award voting (8% weight in MVP voting)

**Fame Update:**
```typescript
function applyChampionshipFame(
  championshipTeam: Team,
  roster: Player[]
): FameUpdate[] {
  return roster.map(player => ({
    playerId: player.id,
    previousFame: player.fameBonus,
    newFame: player.fameBonus + 1,
    previousChampionships: player.championships,
    newChampionships: player.championships + 1,
    reason: `Season ${season.number} Championship`
  }));
}
```

---

### S-SEP009: Championship Morale Boost

**As a** league manager,
**I want** championship-winning players to receive a morale boost,
**So that** their happiness reflects the achievement.

**Acceptance Criteria:**
1. AC-1: All championship players receive +20 Morale magnitude
2. AC-2: Event type: CHAMPIONSHIP
3. AC-3: Morale boost affects retirement probability (lower risk)
4. AC-4: Morale boost affects free agency decisions
5. AC-5: Effect displayed on confirmation screen

**Morale Event:**
```typescript
const championshipMoraleEvent: MoraleEvent = {
  type: 'CHAMPIONSHIP',
  magnitude: 20,
  duration: 'PERMANENT',  // Persists until superseded
  description: 'Won the championship'
};
```

---

### S-SEP010: Mojo Reset

**As a** league manager,
**I want** all players' mojo to reset to Normal at season end,
**So that** everyone starts the new season on equal footing.

**Acceptance Criteria:**
1. AC-1: All players (all teams, all rosters) reset to Normal mojo
2. AC-2: Previous mojo state (Hot/Cold/Special) cleared
3. AC-3: Reset applies regardless of team or roster status
4. AC-4: Confirmation message: "All player mojo reset to Normal"
5. AC-5: Mojo reset is automatic (no user interaction required)

**Technical Notes:**
```typescript
function resetAllMojo(players: Player[]): void {
  players.forEach(player => {
    player.mojo = {
      state: 'NORMAL',
      previousState: player.mojo.state,
      resetReason: 'SEASON_END',
      resetDate: new Date()
    };
  });
}
```

---

### S-SEP011: Season Archive

**As a** league manager,
**I want** the completed season to be archived for historical reference,
**So that** I can look back at past seasons.

**Acceptance Criteria:**
1. AC-1: All season stats archived with timestamp
2. AC-2: Final standings preserved
3. AC-3: Award winners recorded (linked to Phase 2)
4. AC-4: Championship result recorded
5. AC-5: Archive accessible from History/Museum section

**Archive Structure:**
```typescript
interface SeasonArchive {
  seasonNumber: number;
  year: number;
  finalStandings: DivisionStandings[];
  playoffBracket?: PlayoffBracket;
  champion?: {
    teamId: string;
    teamName: string;
    roster: string[];
  };
  postseasonMVP?: {
    playerId: string;
    playerName: string;
  };
  leagueLeaders: LeagueLeader[];
  // Awards populated after Phase 2
  awards?: SeasonAwards;
}
```

---

### S-SEP012: Phase Completion Confirmation

**As a** league manager,
**I want** to confirm all Season End Processing is complete before advancing,
**So that** I don't accidentally skip important steps.

**Acceptance Criteria:**
1. AC-1: Summary screen shows all completed actions
2. AC-2: Checklist format: ✓ Standings Confirmed, ✓ MVP Selected (if applicable), etc.
3. AC-3: [Proceed to Awards Ceremony →] button enabled only when all complete
4. AC-4: Warning if any step incomplete
5. AC-5: Cannot return to Regular Season after confirming

**Summary Checklist:**
```
┌─────────────────────────────────────────────────────┐
│  SEASON END PROCESSING COMPLETE                     │
├─────────────────────────────────────────────────────┤
│  ✓ Final standings calculated and confirmed         │
│  ✓ Playoff seeds assigned (8 teams)                 │
│  ✓ Postseason MVP selected: Mike Johnson            │
│  ✓ Championship processed: Thunderhawks             │
│  ✓ Fame bonuses applied (25 players)                │
│  ✓ Mojo reset for all players (200 players)         │
│  ✓ Season 5 archived                                │
└─────────────────────────────────────────────────────┘
                      [ Proceed to Awards Ceremony → ]
```

---

### S-SEP013: No Playoffs Path

**As a** league manager,
**I want** the system to handle seasons where no playoffs occurred,
**So that** I can still complete Season End Processing.

**Acceptance Criteria:**
1. AC-1: If no playoffs configured, skip postseason MVP screen
2. AC-2: If no playoffs, skip championship processing
3. AC-3: Display message: "No playoffs this season"
4. AC-4: Mojo reset still occurs
5. AC-5: Season archive still created (without champion)

**Flow Adjustment:**
```typescript
function getSeasonEndSteps(season: Season): SeasonEndStep[] {
  const steps: SeasonEndStep[] = [
    'FINAL_STANDINGS',
    'MOJO_RESET',
    'SEASON_ARCHIVE',
    'CONFIRMATION'
  ];

  if (season.playoffGames.length > 0) {
    // Insert playoff-specific steps
    steps.splice(1, 0, 'POSTSEASON_MVP', 'CHAMPIONSHIP');
  }

  return steps;
}
```

---

### S-SEP014: Mid-Phase Exit and Resume

**As a** league manager,
**I want** to be able to exit Season End Processing and resume later,
**So that** I don't lose progress if interrupted.

**Acceptance Criteria:**
1. AC-1: Progress auto-saved after each completed step
2. AC-2: [Save & Exit] option available at any point
3. AC-3: Resume button on main menu returns to last incomplete step
4. AC-4: Completed steps remain completed on resume
5. AC-5: Warning before exit: "Progress will be saved"

**Progress Tracking:**
```typescript
interface SeasonEndProgress {
  seasonId: number;
  currentStep: SeasonEndStep;
  completedSteps: SeasonEndStep[];
  standingsConfirmed: boolean;
  postseasonMVPId?: string;
  championshipProcessed: boolean;
  mojoReset: boolean;
  archived: boolean;
}
```

---

## Data Models

### Season End State

```typescript
interface SeasonEndState {
  seasonId: number;
  phase: 1;
  status: 'IN_PROGRESS' | 'COMPLETE';

  // Step tracking
  currentStep: SeasonEndStep;
  completedSteps: SeasonEndStep[];

  // Results
  finalStandings: {
    divisions: DivisionStanding[];
    playoffSeeds: PlayoffSeed[];
    wildcards: TeamId[];
  };

  postseasonMVP?: {
    candidates: PostseasonMVPCandidate[];
    selectedId: string;
    ratingBonus: MVPRatingBonus;
  };

  championship?: {
    teamId: string;
    roster: string[];
    fameUpdates: FameUpdate[];
    moraleBoosts: MoraleEvent[];
  };

  mojoResetComplete: boolean;
  archiveCreated: boolean;
}

type SeasonEndStep =
  | 'FINAL_STANDINGS'
  | 'POSTSEASON_MVP'
  | 'CHAMPIONSHIP'
  | 'MOJO_RESET'
  | 'SEASON_ARCHIVE'
  | 'CONFIRMATION';
```

### Standings Model

```typescript
interface DivisionStanding {
  divisionId: string;
  divisionName: string;
  teams: TeamStanding[];
}

interface TeamStanding {
  teamId: string;
  teamName: string;
  rank: number;
  wins: number;
  losses: number;
  winPct: number;
  gamesBehind: number;
  divisionWinner: boolean;
  playoffSeed?: number;
  isWildcard: boolean;
  tiebreaker?: string;
}
```

---

## Integration Points

### Upstream Dependencies
- **Regular Season**: All games must be complete
- **Playoff System**: Bracket results if playoffs configured
- **Stats System**: Final season stats for WAR calculations

### Downstream Consumers
- **Phase 2 (Awards)**: Uses finalized stats, standings for voting
- **Phase 5 (Retirements)**: Uses morale from championship boost
- **Phase 6 (Free Agency)**: Uses fame for player valuation
- **History/Museum**: Archives season data

---

## Edge Cases

1. **Tie for playoff spot**: Apply tiebreakers (H2H → Division → Run Diff)
2. **Multiple players same postseason WAR**: Use championship round WAR as tiebreaker
3. **Championship team had roster changes**: Use roster at final game
4. **Season ended early (contraction mid-season)**: Skip to reduced standings
5. **No games played (expansion team)**: Show 0-0 record, exclude from playoffs

---

## Screen Flow

```
Regular Season Complete
         │
         ▼
┌─────────────────────┐
│  Final Standings    │ ◄── Confirm to proceed
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Postseason MVP     │ ◄── Card reveal + selection (if playoffs)
│  (conditional)      │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Championship       │ ◄── Fame bonus application (if playoffs)
│  (conditional)      │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Mojo Reset         │ ◄── Automatic, brief confirmation
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Phase Complete     │ ◄── Summary checklist
└─────────────────────┘
         │
         ▼
    Awards Ceremony
      (Phase 2)
```

---

*Last Updated: January 29, 2026*
*Stories: S-SEP001 through S-SEP014*
