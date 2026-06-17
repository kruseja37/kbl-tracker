# Dynamic Designations System Spec

> ## ⚑ DESIG-RECON RECONCILIATION (2026-06-17 — CANONICAL; supersedes conflicting text below)
> Canonical authority = `MODE_2_V1_FINAL.md §17` + `DECISIONS_LOG.md` "DESIG-RECON" (2026-06-17). Where this doc
> (incl. the June-2026 bridge checkpoints) conflicts, the following wins — it reflects what is now BUILT and live
> (commits D10 + DR-1..3, 2026-06-17):
> - **Six team designations, ALL live in v1** (the living season is part of v1 per LSD-6): **Team MVP, Ace,
>   Fan Favorite, Albatross, Captain, Fan Hopeful.** Selection is always **INTRA-TEAM**. Designation EFFECTS
>   (fame/morale/fan-happiness, Captain charisma-double-morale, Fan Hopeful +5 morale) stay **DORMANT** until the
>   Phase-2 morale layer (still v1).
> - **Captain** = highest combined **(Loyalty + Charisma)** on the team, **NO minimum** (every team with ≥1 MLB
>   player gets one). The old "Charisma-only, ≥70" criterion is WRONG. Tiebreak: more seasons, then current-season
>   WAR (degenerate at franchise init → stable id fallback). Badge is **shown** in v1 (rendered from
>   `team.captainPlayerId`); only the morale-amplification EFFECT is dormant.
> - **Fan Favorite** = highest **positive** Value Delta on the team, **NO salary floor** (deliberate asymmetry vs
>   Albatross — the underpaid overperformer is the best fan-favorite story), among ≥2-MLB-peer trusted players.
>   **Now LIVE** (not blocked/morale-gated); +2 fame dormant.
> - **Albatross** = most-negative Value Delta on the team, gated by **salary ≥ 2× league minimum** ("can't blame the
>   cheap guy") **AND** materially overpaid (`valueDelta/contractValue ≤ -25%`) **AND** ≥2-MLB-peer trusted. Can be
>   null. −1 fame dormant. The 15% trade discount is **DEFERRED** in v1 (no AI-trade/valuation consumer; all trades
>   manual).
> - **Fan Hopeful** = random pick from the team's **top-3 farm prospects by SCOUTED grade** (visible-safe — never
>   hidden true ratings/grade), assigned at season start; +5 morale dormant. **Now BUILT** (not blocked).
> - **Cornerstone = CUT from v1** (LSD-3) — removed from the team-designation system. (The separate FAME
>   `FRANCHISE_CORNERSTONE` legacy tier in `teamMVP.ts`/`legacyDynastyTracker.ts` is a DIFFERENT system, retained.)
> - The **≥2-peer** rule is a True-Value RELIABILITY trust gate (is the value computable), NOT a league-peer ranking.

## Overview

Player designations (Team MVP, Ace, Fan Favorite, Albatross) are tracked dynamically throughout the season with "projected" status, then locked in at season's end. This creates engaging storylines as players compete for designations during the season.

## Franchise Internal v1 Morale Bridge Checkpoint (June 2026)

Dynamic designations are morale context for Franchise v1, but they should not silently mutate morale, player profiles, salary, relationships, story state, or Mode 3/offseason systems.

- TEAM_MVP and ACE can now persist as active v1 designation state when the scoped WAR consumer-trust gate passes.
- TEAM_MVP/ACE changes emit typed `DesignationEvent` objects for later morale/story consumption, but no morale engine consumes those events yet.
- TEAM_MVP/ACE recognition no longer enters v1 through duplicate preview random-event prompts.
- Fan Favorite and Albatross readiness can now be inspected from preview True Value/value-delta rows, but they still require trusted True Value/value-delta inputs and durable designation state before final prompt behavior.
- Cornerstone can create fan trust and stronger roster-move reaction prompts once durable designation state is trusted.
- Captain morale amplification remains blocked until hidden-charisma/leadership safety is approved.
- Fan Hopeful can create prospect-safe player morale excitement, but unrevealed FARM hidden truth remains blocked.

See `FRANCHISE_MODE2_DYNAMIC_DESIGNATION_MORALE_BRIDGE.md` for the active v1 bridge contract.

## Franchise Internal v1 Policy Matrix Checkpoint (June 2026)

Internal v1 promotes only TEAM_MVP and ACE to active in-season designation state. They are still not final season-end locks, awards, salary inputs, morale automation, relationship inputs, or Mode 3/offseason handoff state.

| Designation | Internal v1 status | Prompt authority | Policy |
|---|---|---|---|
| Team MVP | Active persisted v1 | `DesignationEvent` only | Ranked/selective current MLB position-player active designation. Trusted scoped numeric WAR evidence required. Season-end locking, awards, salary, morale automation, relationships, and Mode 3 effects remain blocked. |
| Ace | Active persisted v1 | `DesignationEvent` only | Ranked/selective pitcher active designation. Trusted scoped pitcher WAR evidence required, currently pWAR >= 0.5. Season-end locking and downstream automation remain blocked. |
| TWO-WAY players | Pitcher-only routing for v1 | ACE only | A `TWO-WAY` value/position identity is treated as pitcher identity for internal v1. It is blocked from Team MVP and may only appear as Ace when pitcher evidence qualifies. Stricter two-way MVP criteria are deferred. |
| Fan Favorite | Blocked | Explicit trusted bridge input only, not app eligibility | Requires trusted True Value/value-delta, durable designation state, and fan attachment policy. Preview readiness is inspection context only. |
| Albatross | Blocked | Explicit trusted bridge input only, not app eligibility | Requires trusted True Value/value-delta plus salary/value policy. Preview readiness is inspection context only. |
| Cornerstone | Blocked | Explicit trusted bridge input only, not app eligibility | Requires trusted durable designation state and roster-move consequence policy. |
| Captain | Blocked | None | Requires hidden charisma/leadership safety approval plus relationship/morale amplification rules. |
| Fan Hopeful | Blocked in eligibility | Explicit prospect-safe bridge input only | Requires a visible-safe prospect source. Unrevealed FARM true ratings, true grade, hidden scout truth, and hidden personality modifiers remain blocked. |

Only TEAM_MVP and ACE records are persistable in current internal v1 conditions. Fan Favorite, Albatross, Cornerstone, Captain, and Fan Hopeful remain blocked/deferred.

## Franchise Internal v1 Readiness Checkpoint (June 2026)

Current v1 exposes Fan Favorite/Albatross readiness as read-only preview context only:

- Positive preview value delta can be labeled as Fan Favorite preview context.
- Negative preview value delta can be labeled as Albatross preview context.
- Neutral, missing, FARM/unassigned, or blocked value rows produce no actionable readiness.
- Preview readiness does not create random-event morale prompts, final designations, salary movement, relationship effects, story persistence, offseason behavior, or Mode 3 handoff.
- Trusted True Value/value-delta promotion remains a future explicit decision.

## Designation Types

### Team MVP (Position Players)
- **Criteria**: Highest total WAR on team
- **Min Games**: 20% of season (minimum 5 games for 32-game seasons)
- **Mid-Season**: Dotted border badge, "Projected Team MVP"
- **Season End**: Solid border badge, "Team MVP" → Earns Cornerstone
- **Carries Over**: No (replaced by Cornerstone status)

### Ace (Pitchers)
- **Criteria**: Highest pWAR among team's pitchers
- **Min Games**: 20% of season as pitcher (minimum 4 games for 32-game seasons)
- **Min pWAR**: 0.5 (prevents meaningless designation on bad teams)
- **Mid-Season**: Dotted border badge, "Projected Ace"
- **Season End**: Solid border badge, "Ace"
- **Carries Over**: No

### Fan Favorite
- **Criteria**: Highest positive Value Delta (True Value - Contract)
- **Min Games**: 10% of season (minimum 3 games for 32-game seasons)
- **Mid-Season**: Dotted border badge, "Projected Fan Favorite"
- **Season End**: Solid border badge, "Fan Favorite"
- **Carries Over**: Yes, until 10% of new season completes (when new projections begin)

### Albatross
- **Criteria**: Most negative Value Delta (True Value - Contract)
- **Min Games**: 10% of season (minimum 3 games for 32-game seasons)
- **Mid-Season**: Dotted border badge, "Projected Albatross"
- **Season End**: Solid border badge, "Albatross"
- **Carries Over**: Yes, until 10% of new season completes (when new projections begin)

### Cornerstone (Special)
- **Criteria**: Awarded to previous season's Team MVP
- **Min Games**: N/A (earned status)
- **Display**: Solid border badge, "Cornerstone"
- **Carries Over**: Yes, permanently while player remains on team
- **Accumulation**: Multiple Cornerstones can exist on a team (one per qualifying season)

### Team Captain (Special)
- **Criteria** (DESIG-RECON 2026-06-17, canonical §17.6): Player with the highest combined (Loyalty + Charisma) hidden modifier on the team, with **NO minimum** — every team with ≥1 MLB player gets a Captain. (The prior "highest Charisma, ≥70" rule is superseded.)
- **Tiebreaker**: If two players share the highest Charisma, the one with more seasons on the team wins. If still tied, the one with higher WAR in the current season wins.
- **Assignment**: Calculated at season start. Does not change mid-season (Captain badge is stable).
- **Display**: Solid border badge, "Captain" — always visible regardless of Charisma being hidden
- **Carries Over**: Recalculated each season start (roster changes, new arrivals)
- **Effect on narrative**: Beat reporter storylines reference the Captain in leadership and team chemistry contexts. Morale events tied to the Captain's performance have amplified impact (±50% morale swing magnitude).
- **Effect on Charisma**: The Captain's own Charisma score counts double toward teammate morale effects while they hold the designation.
- **One per team**: Only one Team Captain per team at any time.

---

## Lifecycle

### New Season Start (Games 1-10%)

```
Previous Season State:
├── Cornerstone(s): PERSIST (solid border)
├── Fan Favorite: PERSIST (solid border, from last year)
├── Albatross: PERSIST (solid border, from last year)
├── Team MVP: CONVERTED to Cornerstone
└── Ace: CLEARED

Current Season State:
├── Projected MVP: Calculating... (dotted, once 20% reached)
├── Projected Ace: Calculating... (dotted, once 20% reached)
├── Projected Fan Favorite: Calculating... (dotted, once 10% reached)
└── Projected Albatross: Calculating... (dotted, once 10% reached)
```

### After 10% of Season

```
├── Cornerstone(s): PERSIST (unchanged)
├── Fan Favorite (previous): CLEARED (new projections begin)
├── Albatross (previous): CLEARED (new projections begin)
├── Projected Fan Favorite: ACTIVE (dotted, updates after each game)
└── Projected Albatross: ACTIVE (dotted, updates after each game)
```

### After 20% of Season

```
├── Cornerstone(s): PERSIST (unchanged)
├── Projected MVP: ACTIVE (dotted, updates after each game)
├── Projected Ace: ACTIVE (dotted, updates after each game)
├── Projected Fan Favorite: ACTIVE (continues from 10%)
└── Projected Albatross: ACTIVE (continues from 10%)
```

### Season End

```
├── Cornerstone(s): PERSIST + NEW (from this year's MVP)
├── Fan Favorite: LOCKED (solid border)
├── Albatross: LOCKED (solid border)
├── Team MVP: LOCKED (solid border) → Creates new Cornerstone
└── Ace: LOCKED (solid border)
```

---

## Visual Design

### Badge Styles

```css
/* Mid-Season (Projected) */
.designation-badge.projected {
  border: 2px dotted;
  opacity: 0.9;
}

/* Season End (Locked) */
.designation-badge.locked {
  border: 2px solid;
  opacity: 1.0;
}

/* Cornerstone (Permanent) */
.designation-badge.cornerstone {
  border: 2px solid;
  background: linear-gradient(gold, bronze);
}
```

### Badge Colors

| Designation | Border Color | Background |
|-------------|-------------|------------|
| Team MVP | Gold (#FFD700) | Light gold |
| Ace | Royal Blue (#4169E1) | Light blue |
| Fan Favorite | Green (#22C55E) | Light green |
| Albatross | Red (#EF4444) | Light red |
| Cornerstone | Bronze (#CD7F32) | Gradient gold→bronze |
| Team Captain | Purple (#7C3AED) | Light purple |

### Badge Text

**Mid-Season:**
- "Proj. MVP" or "~MVP"
- "Proj. Ace" or "~Ace"
- "Proj. Fan Fav" or "~Fan Fav"
- "Proj. Albatross" or "~Albatross"

**Locked:**
- "Team MVP"
- "Ace"
- "Fan Favorite"
- "Albatross"
- "Cornerstone"
- "Captain"
- "Albatross"
- "Cornerstone"

---

## Change Notifications

When a projected designation changes hands:

```typescript
interface DesignationChangeEvent {
  type: 'MVP' | 'ACE' | 'FAN_FAVORITE' | 'ALBATROSS';
  teamId: string;
  previousHolder: {
    playerId: string;
    playerName: string;
    value: number;  // WAR, pWAR, or Value Delta
  } | null;
  newHolder: {
    playerId: string;
    playerName: string;
    value: number;
  };
  margin: number;  // How much new holder leads by
  gamesPlayed: number;
  seasonPercentComplete: number;
}
```

**Notification Examples:**
- "🏆 Mike Trout has overtaken Shohei Ohtani for Projected Team MVP! (3.2 WAR vs 3.0 WAR)"
- "⚾ Gerrit Cole is now the Projected Ace! (2.1 pWAR vs 1.8 pWAR)"
- "💚 Juan Soto is the new Projected Fan Favorite! (+$2.5M Value Delta)"
- "🔴 Chris Davis takes over as Projected Albatross... (-$8.2M Value Delta)"

**Notification Triggers:**
- Only show when designation actually changes hands
- Include margin to show how close the race is
- Suppress notifications in first 5% of season (too volatile)

---

## Qualification Rules

### Games Played Calculation

```typescript
function meetsMinGames(
  playerGames: number,
  seasonGamesPlayed: number,
  totalSeasonGames: number,
  threshold: number  // 0.20 for MVP/Ace, 0.10 for Fan Fav/Albatross
): boolean {
  // Use greater of: actual games played or projected games
  const projectedSeasonGames = totalSeasonGames;
  const minGamesRequired = Math.ceil(projectedSeasonGames * threshold);

  return playerGames >= minGamesRequired;
}
```

### Edge Cases

1. **Ties**: If two players have identical WAR/pWAR/Value Delta:
   - Use secondary criteria (games played, then alphabetical)
   - Both shown as "T-1st" in projected standings

2. **Traded Players**:
   - Stats stay with original team for that season's designation
   - New team designation starts fresh
   - Cornerstone status transfers with player (but resets progress)

3. **Called Up/Sent Down**:
   - Only MLB-level games count
   - Must meet minimum at MLB level

4. **Injured Players**:
   - Keep projected status if they qualified before injury
   - Can be overtaken by players who continue playing

---

## Data Model

### PlayerDesignationStatus

```typescript
interface PlayerDesignationStatus {
  playerId: string;
  playerName: string;
  teamId: string;
  seasonId: string;

  // Current projected standings
  projectedMVPRank: number | null;      // null if < 20% games
  projectedAceRank: number | null;      // null if < 20% games or not pitcher
  projectedFanFavoriteRank: number | null;  // null if < 10% games
  projectedAlbatrossRank: number | null;    // null if < 10% games

  // Values
  currentWAR: number;
  currentPWAR: number;
  currentValueDelta: number;

  // Games
  gamesPlayed: number;
  gamesAsQualifyingPitcher: number;

  // Locked designations (from season end)
  lockedDesignations: {
    teamMVP: boolean;
    ace: boolean;
    fanFavorite: boolean;
    albatross: boolean;
  };

  // Cornerstone (persists across seasons)
  isCornerstone: boolean;
  cornerstoneEarnedSeasonId: string | null;
}
```

### TeamDesignationState

```typescript
interface TeamDesignationState {
  teamId: string;
  seasonId: string;

  // Current projected holders
  projectedMVP: {
    playerId: string;
    playerName: string;
    war: number;
  } | null;

  projectedAce: {
    playerId: string;
    playerName: string;
    pwar: number;
  } | null;

  projectedFanFavorite: {
    playerId: string;
    playerName: string;
    valueDelta: number;
  } | null;

  projectedAlbatross: {
    playerId: string;
    playerName: string;
    valueDelta: number;
  } | null;

  // Locked designations
  lockedMVP: string | null;        // playerId
  lockedAce: string | null;
  lockedFanFavorite: string | null;
  lockedAlbatross: string | null;

  // Cornerstones (can be multiple)
  cornerstones: Array<{
    playerId: string;
    playerName: string;
    earnedSeasonId: string;
  }>;

  // Previous season carryovers (cleared after 10% when new projections begin)
  previousFanFavorite: string | null;
  previousAlbatross: string | null;
  carryoverCleared: boolean;
}
```

---

## Update Flow

### After Each Game

```typescript
async function updateDesignationsAfterGame(
  gameResult: GameResult,
  seasonState: SeasonState
): Promise<DesignationChangeEvent[]> {
  const changes: DesignationChangeEvent[] = [];

  // 1. Update player stats (WAR, pWAR, Value Delta)
  await updatePlayerSeasonStats(gameResult);

  // 2. Check if carryovers should be cleared (10% threshold for Fan Fav/Albatross)
  if (!seasonState.carryoverCleared &&
      seasonState.gamesPlayed >= seasonState.totalGames * 0.10) {
    await clearCarryoverDesignations(seasonState);
    seasonState.carryoverCleared = true;
  }

  // 3. Recalculate projected designations for affected teams
  for (const teamId of getAffectedTeams(gameResult)) {
    const teamChanges = await recalculateTeamDesignations(
      teamId,
      seasonState
    );
    changes.push(...teamChanges);
  }

  // 4. Fire notifications for changes
  for (const change of changes) {
    await notifyDesignationChange(change);
  }

  return changes;
}
```

### Season End

```typescript
async function lockSeasonDesignations(
  seasonId: string
): Promise<SeasonEndDesignationResult> {
  const result: SeasonEndDesignationResult = {
    teamResults: [],
    newCornerstones: [],
    fameEvents: [],
  };

  for (const team of getAllTeams()) {
    const teamState = await getTeamDesignationState(team.id, seasonId);

    // Lock current projected as final
    teamState.lockedMVP = teamState.projectedMVP?.playerId || null;
    teamState.lockedAce = teamState.projectedAce?.playerId || null;
    teamState.lockedFanFavorite = teamState.projectedFanFavorite?.playerId || null;
    teamState.lockedAlbatross = teamState.projectedAlbatross?.playerId || null;

    // Create new Cornerstone from MVP
    if (teamState.lockedMVP) {
      const newCornerstone = {
        playerId: teamState.lockedMVP,
        playerName: teamState.projectedMVP!.playerName,
        earnedSeasonId: seasonId,
      };
      teamState.cornerstones.push(newCornerstone);
      result.newCornerstones.push(newCornerstone);
    }

    // Generate fame events
    result.fameEvents.push(...generateDesignationFameEvents(teamState));

    await saveTeamDesignationState(teamState);
    result.teamResults.push(teamState);
  }

  return result;
}
```

---

## In-Season Fan Morale Effects

Designations create meaningful connections between player performance and fan morale throughout the season. Effects scale based on how established the designation is and the context of the performance.

> **Franchise internal v1 boundary:** The tables in this section are full-system design targets. In v1, they may only be translated into confirmation-gated random-event prompt candidates through the morale bridge. They must not silently mutate fan morale, player morale, player profiles, designations, salary, relationships, story persistence, offseason systems, or Mode 3.

### Per-Game Happiness Adjustments

After each game, designated players' performances can affect team happiness in the full system:

```typescript
interface DesignationHappinessConfig {
  // Projected MVP
  mvp: {
    bigGame: +1,           // 3+ hits OR HR + 3 RBI OR 4+ RBI
    clutchHit: +0.5,       // Go-ahead hit in 7th inning or later
    collapseGame: -0.5,    // 0-4 with RISP in loss
  },

  // Projected Ace
  ace: {
    qualityStart: +0.5,    // 6+ IP, 3 or fewer ER
    dominantStart: +1,     // 7+ IP, 1 or fewer ER
    blownStart: -0.5,      // 4+ ER in less than 5 IP
    blownSave: -1,         // If Ace pitches relief and blows save
  },

  // Projected Fan Favorite
  fanFavorite: {
    bigGame: +0.75,        // Any standout game (same criteria as MVP)
    clutchHit: +1,         // Go-ahead hit late (fans LOVE clutch from the bargain guy)
    walkoff: +2,           // Walkoff hit/HR
  },

  // Projected Albatross
  albatross: {
    bigGame: 0,            // No bonus - that's what you're SUPPOSED to do
    clutchFailure: -0.75,  // GIDP, K with RISP in key spot
    costlyError: -1,       // Error leads to runs in close game
    benchedForYounger: -0.5, // When albatross sits for cheaper player who performs
  },

  // Cornerstone (earned trust - benefit of the doubt)
  cornerstone: {
    bigGame: +0.5,         // Fans expect it, but still appreciate
    clutchHit: +0.75,      // "Our guy came through again"
    milestone: +1.5,       // Career milestone (100 HR, 1000 hits, etc.)
    slump: 0,              // NO PENALTY - fans give benefit of doubt
    collapseGame: 0,       // NO PENALTY - "he'll bounce back"
  },
}
```

### Establishment Multiplier

Effects scale based on season progress AND playoff race context. Late-season games only matter more if the team is still in contention.

```typescript
type PlayoffStatus =
  | 'CLINCHED'           // Already in playoffs
  | 'IN_HUNT'            // Within 5 games of playoff spot
  | 'FRINGE'             // 5-10 games back
  | 'ELIMINATED'         // Mathematically out
  | 'FADING';            // Not eliminated but >10 games back

function getPlayoffStatus(team: Team, standings: Standings): PlayoffStatus {
  if (team.clinched) return 'CLINCHED';
  if (team.eliminated) return 'ELIMINATED';

  const gamesBack = standings.getGamesBackFromPlayoffSpot(team.id);

  if (gamesBack <= 5) return 'IN_HUNT';
  if (gamesBack <= 10) return 'FRINGE';
  return 'FADING';
}

function getEstablishmentMultiplier(
  seasonPercentComplete: number,
  playoffStatus: PlayoffStatus
): number {
  // Base multiplier from season progress
  let baseMult: number;

  if (seasonPercentComplete < 0.30) {
    baseMult = 0.5;  // Early season - projections volatile
  } else if (seasonPercentComplete < 0.60) {
    baseMult = 1.0;  // Mid season - full effects
  } else if (seasonPercentComplete < 0.90) {
    baseMult = 1.0;  // Late season - base (modified by playoff status)
  } else {
    baseMult = 1.0;  // Final stretch - base (modified by playoff status)
  }

  // Playoff context modifier (only applies after 60% of season)
  if (seasonPercentComplete >= 0.60) {
    const playoffMod = getPlayoffContextModifier(seasonPercentComplete, playoffStatus);
    baseMult *= playoffMod;
  }

  return baseMult;
}

function getPlayoffContextModifier(
  seasonPercentComplete: number,
  playoffStatus: PlayoffStatus
): number {
  // Playoff status determines if late-season games feel more important

  const isLate = seasonPercentComplete >= 0.60 && seasonPercentComplete < 0.90;
  const isFinalStretch = seasonPercentComplete >= 0.90;

  switch (playoffStatus) {
    case 'CLINCHED':
      // Already in - games matter less (resting players, etc.)
      return isLate ? 0.75 : 0.5;

    case 'IN_HUNT':
      // Every game is critical - maximum emotional investment
      return isLate ? 1.25 : 1.5;

    case 'FRINGE':
      // Still hope, but tempered expectations
      return isLate ? 1.0 : 1.15;

    case 'FADING':
      // Writing on the wall, but not official
      return isLate ? 0.85 : 0.75;

    case 'ELIMINATED':
      // Mathematically out - "playing for pride" / "evaluating for next year"
      // Fans disengage emotionally from wins/losses
      return 0.5;

    default:
      return 1.0;
  }
}
```

### Playoff Context Summary

| Playoff Status | Late Season (60-90%) | Final Stretch (90%+) |
|----------------|---------------------|----------------------|
| **Clinched** | ×0.75 (coasting) | ×0.5 (resting stars) |
| **In Hunt** (≤5 GB) | ×1.25 (pressure building) | ×1.5 (every game crucial) |
| **Fringe** (5-10 GB) | ×1.0 (cautious optimism) | ×1.15 (longshot hope) |
| **Fading** (>10 GB) | ×0.85 (writing on wall) | ×0.75 (going through motions) |
| **Eliminated** | ×0.5 (playing for pride) | ×0.5 (evaluating prospects) |

### Special Cases

```typescript
// Clinched teams may still care about seeding
function getClinchModifier(team: Team, standings: Standings): number {
  if (!team.clinched) return 1.0;

  // If fighting for home field / bye week, games still matter
  const seedingImplications = standings.hasSeedingImplications(team.id);
  if (seedingImplications) {
    return 1.1;  // Boost back up slightly
  }

  return 1.0;  // Pure rest mode
}

// Eliminated teams have different storylines
// See FARM_SYSTEM_SPEC.md for prospect call-up bonuses
function getEliminatedNarrative(team: Team): string[] {
  return [
    'PROSPECT_SHOWCASE',    // Young player performances matter for hope (+3 to +7 happiness)
    'SPOILER_ROLE',         // Beating contenders still satisfying
    'FAREWELL_TOUR',        // Veteran's last games
  ];
}
```

### Win/Loss Context Modifier

Performance matters more in context:

```typescript
function getContextModifier(
  gameResult: 'WIN' | 'LOSS',
  playerPerformed: boolean,
  designation: DesignationType
): number {
  // Winning amplifies positive performances
  if (gameResult === 'WIN' && playerPerformed) {
    return 1.25;  // "Our guy led us to victory!"
  }

  // Losing despite good performance from star = frustration
  if (gameResult === 'LOSS' && playerPerformed) {
    if (designation === 'MVP' || designation === 'ACE') {
      return 0.5;  // Wasted effort, but not their fault
    }
    return 0.75;
  }

  // Losing when star failed = disappointment
  if (gameResult === 'LOSS' && !playerPerformed) {
    if (designation === 'CORNERSTONE') {
      return 0;  // Benefit of the doubt
    }
    if (designation === 'ALBATROSS') {
      return 1.5;  // "Of course HE cost us the game"
    }
    return 1.0;
  }

  return 1.0;
}
```

### Combined Calculation

```typescript
function calculateDesignationHappinessEffect(
  game: GameResult,
  player: Player,
  designation: DesignationType,
  seasonState: SeasonState,
  team: Team,
  standings: Standings
): number {
  // 1. Get base effect from performance
  const baseEffect = getBaseHappinessEffect(game, player, designation);
  if (baseEffect === 0) return 0;

  // 2. Get playoff context
  const playoffStatus = getPlayoffStatus(team, standings);

  // 3. Apply establishment multiplier (includes playoff context)
  const establishmentMult = getEstablishmentMultiplier(
    seasonState.percentComplete,
    playoffStatus
  );

  // 4. Apply win/loss context modifier
  const contextMod = getContextModifier(
    game.result,
    baseEffect > 0,
    designation
  );

  // 5. Calculate final effect (capped at ±2 per game per player)
  const rawEffect = baseEffect * establishmentMult * contextMod;
  return Math.max(-2, Math.min(2, rawEffect));
}
```

### Cornerstone Baseline Bonus

Teams with Cornerstones get a passive happiness boost representing franchise stability in the full system. For Franchise internal v1, this is bridge context only until durable designation state and formula weighting are trusted:

```typescript
function getCornerstoneBaselineBonus(cornerstones: Cornerstone[]): number {
  if (cornerstones.length === 0) return 0;

  // First Cornerstone: +3 baseline
  // Each additional: +1.5 (diminishing returns)
  let bonus = 3;
  for (let i = 1; i < cornerstones.length; i++) {
    bonus += 1.5;
  }

  // Cap at +8 (prevents "dynasty" teams from being immune to unhappiness)
  return Math.min(8, bonus);
}
```

### Happiness Effect Summary

| Designation | Positive Trigger | Effect | Negative Trigger | Effect |
|-------------|-----------------|--------|------------------|--------|
| **Proj. MVP** | Big game, clutch hit | +0.5 to +1 | Collapse in loss | -0.5 |
| **Proj. Ace** | Quality/dominant start | +0.5 to +1 | Blown start/save | -0.5 to -1 |
| **Proj. Fan Fav** | Clutch hit, walkoff | +0.75 to +2 | (none) | — |
| **Proj. Albatross** | (none - expected) | — | Clutch failure, costly error | -0.75 to -1 |
| **Cornerstone** | Big game, milestone | +0.5 to +1.5 | (immune - benefit of doubt) | — |

### Example Scenarios

**Scenario 1: Late-season MVP clutch hit in a win (team IN HUNT)**
- Base effect: +0.5 (clutch hit)
- Establishment: ×1.25 (75% through season, IN_HUNT = ×1.25)
- Context: ×1.25 (win + performed)
- **Total: +0.78 happiness**

**Scenario 2: Final stretch MVP clutch hit in a win (team IN HUNT)**
- Base effect: +0.5 (clutch hit)
- Establishment: ×1.5 (92% through season, IN_HUNT = ×1.5)
- Context: ×1.25 (win + performed)
- **Total: +0.94 happiness** (pennant race intensity!)

**Scenario 3: Final stretch MVP clutch hit in a win (team ELIMINATED)**
- Base effect: +0.5 (clutch hit)
- Establishment: ×0.5 (92% through season, ELIMINATED = ×0.5)
- Context: ×1.25 (win + performed)
- **Total: +0.31 happiness** (nice, but doesn't move the needle much)

**Scenario 4: Albatross GIDP costs team the game (mid-season)**
- Base effect: -0.75 (clutch failure)
- Establishment: ×1.0 (mid-season, no playoff modifier yet)
- Context: ×1.5 (loss + albatross failed)
- **Total: -1.125 happiness**

**Scenario 5: Albatross fails in September (team 3 games back)**
- Base effect: -0.75 (clutch failure)
- Establishment: ×1.5 (final stretch, IN_HUNT = ×1.5)
- Context: ×1.5 (loss + albatross failed)
- **Total: -1.69 happiness** (fans FURIOUS - "he cost us the season!")

**Scenario 6: Cornerstone goes 0-4 in tough loss**
- Base effect: 0 (cornerstone immune to slump penalties)
- **Total: 0 happiness change** (fans trust he'll bounce back)

---

## Fame Effects

### Season End Awards

| Designation | Fame Bonus |
|-------------|-----------|
| Team MVP | +1.5 |
| Ace | +1.0 |
| Fan Favorite | +2 |
| Albatross | -1 |
| New Cornerstone | +1.0 |
| Retained Cornerstone | +0.3 |

### Offseason Effects (Locked Only)

> **Franchise internal v1 boundary:** These offseason effects are not active mutations in v1. Fan morale, trade value, contract negotiation, franchise legacy, and retirement ceremony effects remain future/full-system behavior unless a later slice explicitly routes a safe subset through confirmation-gated prompts.

**Fan Favorite:**
- +5 team happiness
- 15% trade value premium
- Contract negotiation: Player more likely to take hometown discount

**Albatross:**
- -5 team happiness
- 15% trade value discount
- Contract negotiation: Team leverage increased

**Cornerstone:**
- Franchise legacy tier progression
- Higher fan attachment
- Retirement ceremony eligibility

---

## UI Display Locations

1. **Player Card**: Badge in corner
2. **Roster View**: Badge column
3. **Game Recap**: "Designation changes this game" section
4. **Season Standings**: "Designation Races" tab
5. **Player Profile**: Designation history section

---

## Related Systems

### Farm System Integration

Designations interact with the farm system in meaningful ways:

> **Franchise internal v1 boundary:** These FARM interactions are future/full-system targets. In v1, send-down/call-up designation reactions may only become confirmation-gated prompt candidates after designation state, roster-move evidence, value-delta requirements, and hidden prospect safety are trusted.

- **Albatross Send-Down**: Sending down the Albatross for a prospect = +8 base happiness (see [FARM_SYSTEM_SPEC.md](./FARM_SYSTEM_SPEC.md))
- **Fan Favorite Send-Down**: Demoting the Fan Favorite = -12 happiness (devastating)
- **Cornerstone Send-Down**: Demoting a Cornerstone = -15 happiness (franchise betrayal)
- **Eliminated Team Prospects**: Calling up high-potential prospects when eliminated gives bonus happiness (+3 to +7)

### Revenge Arc

When a traded player (especially former Albatross) outperforms their contract with new team:
- Original team takes happiness hit (diminishing: 100% → 50% → 25% per year)
- Original team takes mWAR hit
- Player gets LI boost in games vs. former team
- See [FARM_SYSTEM_SPEC.md](./FARM_SYSTEM_SPEC.md#the-revenge-arc-system) for full details

---

## Open Questions

1. Should there be a "close race" indicator when margin is < 0.2 WAR?
2. Should we show projected standings beyond #1 (top 3)?
3. Should Cornerstone status have any in-game effects (clutch bonus)?

---

## Changelog

- v1.3 - 2026-01-23 - Added playoff race context to establishment multiplier: IN_HUNT teams feel late-season pressure (×1.5), ELIMINATED teams disengage (×0.5)
- v1.2 - 2026-01-23 - Added comprehensive In-Season Fan Morale Effects section with per-game adjustments, establishment multipliers, context modifiers, and Cornerstone baseline bonus
- v1.1 - 2026-01-23 - Fixed carryover rules: Fan Favorite/Albatross carryovers clear at 10% (matching their qualification threshold), not 20%
- v1.0 - 2026-01-23 - Initial spec
