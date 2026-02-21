# FILE SPEC: useGameState.ts
Path: src/src_figma/hooks/useGameState.ts
Lines: 3,089
Purpose: The central state management hook for the entire GameTracker feature. Manages all game state (inning, outs, bases, score, count), player batting stats, pitcher stats, scoreboard data, fame events, substitutions, and the inherited runner tracker. Provides the complete API surface for recording at-bats (hits, outs, walks, D3K, errors), managing runner advancement, handling substitutions/pitching changes, pitch count tracking, and game lifecycle (init, end inning, end game with season aggregation).

## EXPORTS

### Types (defined locally, lines 1-180)

```typescript
// Line 15-19
type HitType = '1B' | '2B' | '3B' | 'HR';
type OutType = 'GO' | 'FO' | 'LO' | 'PO' | 'DP' | 'TP' | 'SF' | 'SH' | 'FC' | 'K' | 'KL' | 'D3K';
type WalkType = 'BB' | 'IBB' | 'HBP';
type EventType = 'SB' | 'CS' | 'WP' | 'PB' | 'WEB_GEM' | 'ROBBERY' | 'TOOTBLAN' | 'KILLED' | 'NUTSHOT' | 'KILLED_PITCHER' | 'NUT_SHOT' | 'BEAT_THROW' | 'BUNT' | 'STRIKEOUT' | 'STRIKEOUT_LOOKING' | 'DROPPED_3RD_STRIKE' | 'SEVEN_PLUS_PITCH_AB';

// Line 21-27
interface RunnerAdvancement {
  fromFirst?: 'second' | 'third' | 'home' | 'out';
  fromSecond?: 'third' | 'home' | 'out';
  fromThird?: 'home' | 'out';
}

// Line 30-52 — GameState (the core state object)
interface GameState {
  gameId: string;
  inning: number;
  isTop: boolean;
  outs: number;
  balls: number;
  strikes: number;
  bases: { first: boolean; second: boolean; third: boolean };
  awayScore: number;
  homeScore: number;
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName: string;
  homeTeamName: string;
  currentBatterId: string;
  currentBatterName: string;
  currentPitcherId: string;
  currentPitcherName: string;
}

// Line 55-70 — ScoreboardState
interface ScoreboardState {
  innings: Array<{ away: number; home: number }>;
  away: { runs: number; hits: number; errors: number };
  home: { runs: number; hits: number; errors: number };
}

// Line 72-88 — PlayerGameStats (14 batting fields)
interface PlayerGameStats {
  pa: number; ab: number; h: number; singles: number; doubles: number;
  triples: number; hr: number; rbi: number; r: number; bb: number;
  hbp: number; k: number; sb: number; cs: number;
}

// Line 90-130 — PitcherGameStats (29 fields, including MAJ-07/MAJ-08 additions)
interface PitcherGameStats {
  outsRecorded: number; hitsAllowed: number; runsAllowed: number;
  earnedRuns: number; walksAllowed: number; intentionalWalks: number;
  hitByPitch: number; strikeoutsThrown: number; homeRunsAllowed: number;
  pitchCount: number; battersFaced: number; wildPitches: number;
  consecutiveHRsAllowed: number; firstInningRuns: number;
  basesLoadedWalks: number; isStarter: boolean; entryInning: number;
  entryOuts: number; exitInning: number | null; exitOuts: number | null;
  bequeathedRunners: number; inheritedRunners: number;
  inheritedRunnersScored: number; finishedGame: boolean;
  // MAJ-08: Pitcher decisions
  decision: 'W' | 'L' | 'SV' | 'H' | 'BS' | null;
}

// Line 132-160 — FameEventRecord
interface FameEventRecord {
  eventType: string;
  fameType: 'bonus' | 'boner';
  fameValue: number;
  playerId: string;
  playerName: string;
  description: string;
}

// Line 162-180 — PitchCountPromptState
interface PitchCountPromptState {
  type: 'pitching_change' | 'end_inning' | 'end_game';
  pitcherId: string;
  pitcherName: string;
  currentCount: number;
  lastVerifiedInning: number;
  newPitcherId?: string; // Only for pitching_change
}

// Line ~182-230 — UseGameStateReturn (full API surface)
interface UseGameStateReturn {
  gameState: GameState;
  scoreboard: ScoreboardState;
  playerStats: Map<string, PlayerGameStats>;
  pitcherStats: Map<string, PitcherGameStats>;
  recordHit: (hitType: HitType, rbi: number, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>;
  recordOut: (outType: OutType, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>;
  recordWalk: (walkType: WalkType, pitchCount?: number) => Promise<void>;
  recordD3K: (batterReached: boolean, pitchCount?: number) => Promise<void>;
  recordError: (rbi?: number, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>;
  recordEvent: (eventType: EventType, runnerId?: string) => Promise<void>;
  advanceRunner: (from: 'first'|'second'|'third', to: 'second'|'third'|'home', outcome: 'safe'|'out') => void;
  advanceRunnersBatch: (movements: Array<{from; to; outcome}>) => void;
  makeSubstitution: (benchPlayerId, lineupPlayerId, benchPlayerName?, lineupPlayerName?, options?) => void;
  switchPositions: (switches: Array<{playerId; newPosition}>) => void;
  changePitcher: (newPitcherId, exitingPitcherId, newPitcherName?, exitingPitcherName?) => void;
  advanceCount: (type: 'ball'|'strike'|'foul') => void;
  resetCount: () => void;
  endInning: () => void;
  endGame: () => Promise<void>;
  pitchCountPrompt: PitchCountPromptState | null;
  confirmPitchCount: (pitcherId: string, finalCount: number) => void;
  dismissPitchCountPrompt: () => void;
  initializeGame: (config) => Promise<void>;
  loadExistingGame: (gameId) => Promise<void>;
  restoreState: (snapshot) => void;
  getRunnerTrackerSnapshot: () => object;
  isLoading: boolean;
  isSaving: boolean;
  lastSavedAt: number;
  atBatSequence: number;
}
```

## EXPORTED BASEBALL RULES FUNCTIONS

### isRunnerForced (line ~240)
```typescript
// ACTUAL CODE:
export function isRunnerForced(bases: { first: boolean; second: boolean; third: boolean }, base: 'first' | 'second' | 'third'): boolean {
  if (base === 'first') return true; // Batter always forces R1
  if (base === 'second') return bases.first; // R2 forced only if R1 occupied
  if (base === 'third') return bases.first && bases.second; // R3 forced only if R1 AND R2 occupied
  return false;
}
```

### getMinimumAdvancement (line ~250)
Returns the minimum base a runner must advance to on a hit.
```typescript
// ACTUAL CODE:
export function getMinimumAdvancement(hitType: HitType, fromBase: 'first' | 'second' | 'third'): string {
  if (hitType === 'HR') return 'home';
  if (hitType === '3B') {
    return 'home'; // All runners score on triple
  }
  if (hitType === '2B') {
    if (fromBase === 'first') return 'third'; // R1 to at least 3B on double
    return 'home'; // R2, R3 score on double
  }
  // Single: forced runners advance one base
  if (fromBase === 'first') return 'second';
  if (fromBase === 'second') return 'third';
  if (fromBase === 'third') return 'home';
  return fromBase;
}
```

### getDefaultRunnerOutcome (line ~270)
```typescript
// Returns default runner destination for a given hit type and origin base
export function getDefaultRunnerOutcome(hitType: HitType, fromBase: 'first' | 'second' | 'third'): string {
  return getMinimumAdvancement(hitType, fromBase);
}
```

### autoCorrectResult (line ~280)
```typescript
// ACTUAL CODE:
export function autoCorrectResult(
  outType: OutType,
  runnerData?: RunnerAdvancement,
  bases?: { first: boolean; second: boolean; third: boolean }
): OutType {
  // Auto-correct FO → SF when runner scores from third
  if (outType === 'FO' && runnerData?.fromThird === 'home') {
    return 'SF';
  }
  // Auto-correct GO → DP when a runner is put out
  if (outType === 'GO' && runnerData) {
    const runnersOut = [runnerData.fromFirst, runnerData.fromSecond, runnerData.fromThird]
      .filter(d => d === 'out').length;
    if (runnersOut >= 1) return 'DP';
  }
  return outType;
}
```

### isExtraAdvancement (line ~300)
```typescript
// Returns true if the destination is beyond the minimum expected
export function isExtraAdvancement(hitType: HitType, fromBase: string, toBase: string): boolean {
  const minimum = getMinimumAdvancement(hitType, fromBase as any);
  const baseOrder = ['first', 'second', 'third', 'home'];
  return baseOrder.indexOf(toBase) > baseOrder.indexOf(minimum);
}
```

### calculateRBIs (line ~315)
```typescript
// ACTUAL CODE:
export function calculateRBIs(
  hitType: HitType | OutType,
  runnerData?: RunnerAdvancement,
  bases?: { first: boolean; second: boolean; third: boolean }
): number {
  // HR: batter + all runners score
  if (hitType === 'HR') {
    let rbi = 1; // Batter
    if (bases?.first) rbi++;
    if (bases?.second) rbi++;
    if (bases?.third) rbi++;
    return rbi;
  }
  // Error: 0 RBI (runs are unearned to the BATTER for stat purposes)
  if (hitType === 'E') return 0;
  // DP/TP: 0 RBI
  if (hitType === 'DP' || hitType === 'TP') return 0;
  // Count runners who scored
  let rbi = 0;
  if (runnerData?.fromFirst === 'home') rbi++;
  if (runnerData?.fromSecond === 'home') rbi++;
  if (runnerData?.fromThird === 'home') rbi++;
  return rbi;
}
```

## INTERNAL HELPER FUNCTIONS

### processTrackerScoredEvents (line ~340)
```typescript
// ACTUAL CODE:
function processTrackerScoredEvents(
  scoredEvents: RunnerScoredEvent[],
  setPitcherStats: React.Dispatch<...>,
  createEmpty: () => PitcherGameStats
) {
  setPitcherStats(prev => {
    const newStats = new Map(prev);
    for (const event of scoredEvents) {
      const pitcherId = event.responsiblePitcherId;
      const pStats = newStats.get(pitcherId) || createEmpty();
      pStats.runsAllowed++;
      if (event.isEarned) {
        pStats.earnedRuns++;
      }
      // Track inherited runners scored for the CURRENT pitcher
      if (event.isInherited) {
        const currentPitcher = newStats.get(event.currentPitcherId) || createEmpty();
        currentPitcher.inheritedRunnersScored = (currentPitcher.inheritedRunnersScored || 0) + 1;
        newStats.set(event.currentPitcherId, currentPitcher);
      }
      newStats.set(pitcherId, pStats);
    }
    return newStats;
  });
}
```
**Key insight**: Runs are attributed to the RESPONSIBLE pitcher (who put the runner on base), not the current pitcher. Inherited runner scoring is tracked separately.

### calculatePitcherDecisions (line ~380)
```typescript
// ACTUAL CODE (simplified approximation):
function calculatePitcherDecisions(
  pitcherStats: Map<string, PitcherGameStats>,
  homeScore: number,
  awayScore: number,
  finalInning: number
) {
  // Skip if tie game
  if (homeScore === awayScore) return;

  const homeWon = homeScore > awayScore;
  const entries = Array.from(pitcherStats.entries());

  // Loss: Pitcher with most runs allowed on losing team
  const losingTeamPitchers = entries.filter(([id]) =>
    homeWon ? id.startsWith('away') : id.startsWith('home')
  );
  if (losingTeamPitchers.length > 0) {
    const loser = losingTeamPitchers.reduce((a, b) =>
      a[1].runsAllowed >= b[1].runsAllowed ? a : b
    );
    loser[1].decision = 'L';
  }

  // Win: Starter if >= 5 IP on winning team, else best reliever
  const winningTeamPitchers = entries.filter(([id]) =>
    homeWon ? id.startsWith('home') : id.startsWith('away')
  );
  const starter = winningTeamPitchers.find(([, s]) => s.isStarter);
  if (starter && starter[1].outsRecorded >= 15) {
    starter[1].decision = 'W';
  } else if (winningTeamPitchers.length > 0) {
    // Best reliever (fewest runs allowed, most outs)
    const relievers = winningTeamPitchers.filter(([, s]) => !s.isStarter);
    if (relievers.length > 0) {
      const winner = relievers.reduce((a, b) => {
        if (a[1].runsAllowed !== b[1].runsAllowed) return a[1].runsAllowed < b[1].runsAllowed ? a : b;
        return a[1].outsRecorded > b[1].outsRecorded ? a : b;
      });
      winner[1].decision = 'W';
    } else if (starter) {
      starter[1].decision = 'W';
    }
  }

  // Save: Last pitcher on winning team, if qualifies
  const lastWinningPitcher = winningTeamPitchers[winningTeamPitchers.length - 1];
  if (lastWinningPitcher && lastWinningPitcher[1].decision !== 'W') {
    const [, stats] = lastWinningPitcher;
    const lead = Math.abs(homeScore - awayScore);
    const savedGame = stats.finishedGame && (
      (stats.outsRecorded >= 9) || // 3+ IP
      (lead <= 3 && stats.outsRecorded >= 3) || // Entered with lead <= 3, got final out
      (stats.inheritedRunners > 0 && lead <= (stats.inheritedRunners + 1)) // Tying run on base/deck
    );
    if (savedGame) {
      stats.decision = 'SV';
    }
  }
}
```
**NOTE**: This is a simplified approximation. Real W/L assignment requires tracking lead changes play-by-play, not just "most runs allowed." The Loss goes to pitcher with most runs allowed on losing team (not the pitcher who gave up the lead). The Win goes to starter if 5+ IP, else best reliever.

## MAIN HOOK: useGameState

### State Variables (lines ~450-520)
```typescript
const [gameState, setGameState] = useState<GameState>(initialGameState);
const [scoreboard, setScoreboard] = useState<ScoreboardState>(initialScoreboard);
const [playerStats, setPlayerStats] = useState<Map<string, PlayerGameStats>>(new Map());
const [pitcherStats, setPitcherStats] = useState<Map<string, PitcherGameStats>>(new Map());
const [fameEvents, setFameEvents] = useState<FameEventRecord[]>([]);
const [substitutionLog, setSubstitutionLog] = useState<SubstitutionLogEntry[]>([]);
const [pitchCountPrompt, setPitchCountPrompt] = useState<PitchCountPromptState | null>(null);
const [atBatSequence, setAtBatSequence] = useState(0);
const [isLoading, setIsLoading] = useState(!!initialGameId);
const [isSaving, setIsSaving] = useState(false);
const [lastSavedAt, setLastSavedAt] = useState(0);
const [awayBatterIndex, setAwayBatterIndex] = useState(0);
const [homeBatterIndex, setHomeBatterIndex] = useState(0);
```

### Refs (lines ~525-540)
```typescript
const awayLineupRef = useRef<LineupEntry[]>([]);
const homeLineupRef = useRef<LineupEntry[]>([]);
const seasonIdRef = useRef<string>('');
const pitcherNamesRef = useRef<Map<string, string>>(new Map());
const runnerTrackerRef = useRef<RunnerTrackingState>(createInitialTrackerState());
const inningPitchesRef = useRef<{ pitches: number; strikeouts: number; pitcherId: string }>({ pitches: 0, strikeouts: 0, pitcherId: '' });
const pendingActionRef = useRef<(() => void) | null>(null);
const endInningRef = useRef<(() => void) | null>(null);
```

### initializeGame (lines ~550-650)
```typescript
// Creates game header in IndexedDB via createGameHeader()
// Initializes playerStats Map for all lineup players
// Initializes pitcherStats for starting pitchers (isStarter=true, entryInning=1)
// Sets up runnerTrackerRef with home starting pitcher
// Stores lineup refs and seasonId ref
// Sets initial batter (first in away lineup)
```

### loadExistingGame (lines ~660-750)
```typescript
// Loads persisted game state from IndexedDB
// Restores gameState, scoreboard, playerStats, pitcherStats
// Restores lineup refs and batter indices
// Restores runner tracker state
```

### advanceToNextBatter (lines ~760-810)
```typescript
// Cycles to next batter in current team's lineup
// Uses awayBatterIndex/homeBatterIndex with modulo wrapping
// Updates gameState.currentBatterId/currentBatterName
```

## CORE AT-BAT RECORDING FUNCTIONS

### recordHit (lines 1099-1345)
**Signature**: `(hitType: HitType, rbi: number, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>`

**Logic flow**:
1. Increment atBatSequence
2. Calculate runsScored: HR=1 (batter) + runners going home
3. **CRIT-02**: Update runner tracker:
   - Sync tracker with current pitcher
   - Process existing runners third→second→first (avoid collision)
   - For HR with no runnerData: all runners score automatically
   - Add batter to tracker at appropriate base (HR: add to 1B then advance HOME)
4. Calculate leverage index from base-out state
5. Detect walk-off: bottom 9+, home team takes lead
6. Create AtBatEvent and log to IndexedDB via `logAtBatEvent()`
7. Update playerStats: pa++, ab++, h++, hit-type-specific stat++, rbi, r (HR only)
8. Update pitcherStats: hitsAllowed++, battersFaced++, pitchCount+=, HR tracking
   - **MAJ-07**: Track firstInningRuns for starters
   - Runs/ER attributed via processTrackerScoredEvents (CRIT-02)
9. Update scoreboard: inning runs + team totals (runs + hits)
10. Update gameState: bases, score, reset count
11. advanceToNextBatter()

**Runner advancement logic** (lines 1293-1340):
```typescript
// ACTUAL CODE for base handling after hit:
let newBases = { first: false, second: false, third: false };
// Place batter on appropriate base
if (hitType === '1B') newBases.first = true;
if (hitType === '2B') newBases.second = true;
if (hitType === '3B') newBases.third = true;

if (runnerData) {
  // Explicit advancements
  if (runnerData.fromFirst === 'second') newBases.second = true;
  if (runnerData.fromFirst === 'third') newBases.third = true;
  if (runnerData.fromSecond === 'third') newBases.third = true;

  // PRESERVE runners NOT mentioned in runnerData
  if (prev.bases.first && !runnerData.fromFirst && hitType !== '1B') newBases.first = true;
  if (prev.bases.second && !runnerData.fromSecond && runnerData.fromFirst !== 'second') newBases.second = true;
  if (prev.bases.third && !runnerData.fromThird && runnerData.fromFirst !== 'third' && runnerData.fromSecond !== 'third') newBases.third = true;
} else {
  // No runnerData: preserve all except where batter goes
  if (prev.bases.first && hitType !== '1B') newBases.first = true;
  if (prev.bases.second && hitType !== '2B') newBases.second = true;
  if (prev.bases.third && hitType !== '3B') newBases.third = true;
}
```

**Edge cases handled**:
- HR with no runner data: all runners auto-score (line 1137-1147)
- Consecutive HR tracking: reset on non-HR hit (line 1257)
- Walk-off detection: bottom 9+, home takes lead, was behind (line 1180)
- Clutch detection: LI >= 1.5 (line 1183)
- Leadoff detection: 0 outs, bases empty (line 1220)

**Edge cases NOT handled**:
- No validation that runnerData destinations are legal for the hit type
- No check for impossible base states (e.g., two runners on same base)
- winProbabilityBefore/After hardcoded to 0.5, wpa=0 (TODO in code)

### recordOut (lines 1347-1602)
**Signature**: `(outType: OutType, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>`

**Logic flow**:
1. Track inning strikeouts for immaculate inning (K, KL only)
2. Calculate outsOnPlay:
   - DP=2, TP=3
   - **FC special case**: Batter is SAFE, only runners count as outs. If no runner outs specified, default to 1.
   - Standard: 1 (batter) + runners thrown out
3. Calculate runsScored from runners going home
4. CRIT-02: Update runner tracker (same third→second→first pattern)
   - FC: add batter to tracker at 1B with howReached='FC'
5. Create AtBatEvent, log to IndexedDB
6. Update playerStats: pa++, ab++ (except SF/SH), k++ (for K/KL/D3K), SF gets rbi++
7. Update pitcherStats: outsRecorded+=outsOnPlay, K tracking, consecutiveHRsAllowed=0
8. Update scoreboard if runs scored
9. Update gameState bases: clear origin, set destinations, FC batter to first
10. **Auto-end inning on 3 outs** (line 1592-1596): setTimeout 500ms, call endInningRef

**Edge cases handled**:
- FC batter reaches first (line 1429-1431, 1572-1574)
- SF/SH don't count as AB (line 1496-1498)
- DP/TP outs count correctly (line 1366-1369)
- SF auto-gets 1 RBI in event logging (line 1462)
- Outs never cause walk-offs (line 1486)
- Auto-inning-end with 500ms delay for UI update (line 1594)

**Edge cases NOT handled**:
- No validation that DP requires runners on base
- No validation that TP requires 2+ runners

### recordWalk (lines 1604-1789)
**Signature**: `(walkType: WalkType, pitchCount?: number) => Promise<void>`

**Logic flow**:
1. Check basesLoaded → if true, 1 run scores
2. CRIT-02: Force-advance runners (third→second→first pattern)
   - Only advance if forced (bases loaded: R3 scores; R1+R2: R2→3B; R1: R1→2B)
3. Add batter to 1B with howReached = HBP ? 'HBP' : 'walk'
4. Log AtBatEvent
5. **MAJ-07**: Track HBP separately from BB in both player and pitcher stats
   - Pitcher: BB, IBB, HBP tracked in separate fields
   - Player: hbp field separate from bb
6. Scoreboard: walks do NOT increment hits (correct)
7. Game state bases update:
```typescript
// ACTUAL CODE (line 1778-1782):
bases: {
  first: true,
  second: prev.bases.first || prev.bases.second,
  third: (prev.bases.first && prev.bases.second) || prev.bases.third,
}
```

**Edge cases handled**:
- Bases loaded walk scores run (line 1612-1613)
- Walk-off bases loaded walk detection (line 1662)
- IBB counted separately in pitcher stats (line 1731)
- BasesLoadedWalks tracked (line 1736)
- Walks correctly do NOT count as hits in scoreboard

**Edge cases NOT handled**:
- Non-force advancement not possible on walks (correct — walks only force)
- isLeadoff hardcoded to false for walks (line 1701)

### recordD3K (lines 1802-1920)
**Signature**: `(batterReached: boolean, pitchCount?: number) => Promise<void>`

**Logic flow**:
1. Track strikeout for immaculate inning detection
2. Pitcher ALWAYS gets K stat, batter ALWAYS gets K stat
3. If batterReached=true: no out recorded, batter reaches 1B
4. If batterReached=false: out recorded
5. CRIT-02: D3K batter reaches with howReached='error' (uncaught third strike)
6. Auto-end inning on 3 outs

**D3K Rules** (from code comment):
- Pitcher ALWAYS gets strikeout
- Batter ALWAYS gets strikeout (PA + AB + K)
- Legal when: first base empty OR 2 outs
- If batter reached: batter to 1B, no out
- If batter out: out recorded

**Edge cases handled**:
- D3K batter categorized as 'error' in tracker for ER purposes (line 1890)
- LeverageIndex hardcoded to 1.0 (simplified)

### recordError (lines 1922-2126)
**Signature**: `(rbi?: number, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>`

**Logic flow**:
1. Calculate runs from runners going home
2. CRIT-02: Update tracker, batter reaches 1B with howReached='error'
3. Player stats: PA++ (no AB charged on error)
4. Pitcher stats: battersFaced++, pitchCount — runs attributed via tracker (unearned)
5. Scoreboard: increment errors for FIELDING team (line 2053-2056)
6. Bases: batter to first, runners advance per runnerData

**Default runner advancement when no runnerData** (lines 2106-2110):
```typescript
// No runner data - default behavior: runners advance one base
if (prev.bases.third) newThird = false; // R3 scores
if (prev.bases.second) { newThird = true; newSecond = false; }
if (prev.bases.first) { newSecond = true; }
```

**Edge cases handled**:
- Error correctly increments fielding team errors (not batting team)
- No AB charged on reach-on-error (line 2013)
- Tracker marks error-reached runners as unearned

### recordEvent (lines 2128-2236)
**Signature**: `(eventType: EventType, runnerId?: string) => Promise<void>`

Handles non-at-bat events: SB, CS, WP, PB, special events (WEB_GEM, ROBBERY, TOOTBLAN, etc.)

**Fame values** (lines 2145-2166):
```typescript
const FAME_VALUES: Record<string, number> = {
  WEB_GEM: 1.0,
  ROBBERY: 1.0,       // CRIT-06: standardized to +1
  TOOTBLAN: -3.0,
  KILLED: 3.0,
  NUTSHOT: 1.0,
  KILLED_PITCHER: 3.0,
  NUT_SHOT: 1.0,
  BEAT_THROW: 0,
  BUNT: 0,
  STRIKEOUT: 0,
  STRIKEOUT_LOOKING: 0,
  DROPPED_3RD_STRIKE: 0,
  SEVEN_PLUS_PITCH_AB: 0,
};
```

**Fame formula**: `adjustedFame = baseFame * sqrt(LI)`

**Fame recipient logic**:
- TOOTBLAN/SB/CS → runner (runnerId parameter)
- WEB_GEM/ROBBERY → fielder (runnerId used as fielder ID)
- Default → current batter (KILLED, NUTSHOT, etc.)

**Player stat updates**:
- SB: runner sb++
- CS: runner cs++
- WP: pitcher wildPitches++ (MAJ-07)

### advanceRunner (lines 2238-2307)
Single runner advancement (for WP, PB, SB individual).
Updates tracker, game state bases, outs if out, scoreboard if run scores.

### advanceRunnersBatch (lines 2314-2412)
Batch runner movement (for SB events with multiple runners).
Sorts movements third→second→first to avoid collision.
Processes atomically to avoid race conditions.

### advanceCount (lines 2414-2425)
```typescript
// Ball: cap at 3, Strike: cap at 2, Foul: cap at 2 (same as strike)
```

### makeSubstitution (lines 2431-2500)
- Logs substitution to substitutionLog
- Updates lineup refs (awayLineupRef or homeLineupRef)
- MAJ-06: Supports subType options (pinch_hit, pinch_run, defensive_sub, position_switch, double_switch)
- If substituted player is current batter, updates currentBatterId
- Initializes stats for new player

### switchPositions (lines 2503-2533)
Position-only switch (no new players), updates lineup refs.

### changePitcher (lines 2535-2616)
1. Shows pitch count prompt for exiting pitcher (mandatory per PITCH_COUNT_TRACKING_SPEC)
2. Stores pending action that executes AFTER pitch count confirmed:
   - Logs pitching change to substitutionLog
   - MAJ-07: Sets exit info on outgoing pitcher (exitInning, exitOuts, bequeathedRunners)
   - Initializes new pitcher stats (entryInning, entryOuts, inheritedRunners)
   - CRIT-02 + MAJ-05: trackerHandlePitchingChange marks all current runners as inherited

### confirmPitchCount (lines 2619-2654)
- Checks for immaculate inning: 9 pitches confirmed + 3 strikeouts tracked → +2 Fame
- Updates pitcher's final pitch count
- Executes pending action
- Clears prompt

### dismissPitchCountPrompt (lines 2659-2672)
- For end_inning: still executes inning transition (skips pitch count update)
- For pitching_change/end_game: cancels pending action entirely

### endInning (lines 2713-2727)
Shows pitch count prompt, stores executeEndInning as pending action.

### executeEndInning (lines 2676-2711)
- Clears runner tracker bases, advances inning number
- Flips isTop, increments inning on TOP→BOT transition
- Resets outs/balls/strikes/bases
- Gets next batter from lineup
- Resets inningPitchesRef for next half-inning

### endGame (lines 2871-3001)
1. Archives game FIRST (EXH-011 fix) for PostGameSummary
2. Builds PersistedGameState from all Maps
3. Shows pitch count prompt for current pitcher
4. Stores completeGameInternal as pending action

### completeGameInternal (lines 2733-2869)
1. Mark game complete in event log
2. MAJ-07: Mark last pitcher as finishedGame
3. MAJ-08: calculatePitcherDecisions (W/L/SV)
4. Build PersistedGameState
5. aggregateGameToSeason (season aggregation)
6. markGameAggregated
7. archiveCompletedGame with inning scores

### restoreState (lines 3020-3047)
Restores full snapshot: gameState, scoreboard, playerStats, pitcherStats, runnerTrackerRef.

### getRunnerTrackerSnapshot (lines 3005-3015)
Serializable snapshot of runner tracker (Maps don't survive JSON.stringify).

## DEPENDENCIES

### Imports from this feature:
- `../app/engines/inheritedRunnerTracker` — All tracker functions (syncTrackerPitcher, trackerAddRunner, trackerAdvanceRunner, trackerRunnerOut, trackerNextAtBat, trackerClearBases, trackerNextInning, trackerHandlePitchingChange, findRunnerOnBase, createInitialTrackerState)
- `../app/engines/saveDetector` — (imported but usage minimal in this file)
- `../../engines/leverageCalculator` — getBaseOutLI, BaseState

### Imports from other features:
- `../../utils/eventLog` — logAtBatEvent, createGameHeader, completeGame, markGameAggregated
- `../utils/gameStorage` — archiveCompletedGame, loadPersistedGame
- `../../storage/seasonAggregator` — aggregateGameToSeason

### Imports from node_modules:
- `react` — useState, useCallback, useRef, useEffect

## STATE MANAGEMENT SUMMARY

| State Variable | Type | Managed by | Triggers |
|---|---|---|---|
| gameState | GameState | useState | Every at-bat, runner movement, inning change |
| scoreboard | ScoreboardState | useState | Runs scored, hits, errors |
| playerStats | Map<string, PlayerGameStats> | useState | Every at-bat |
| pitcherStats | Map<string, PitcherGameStats> | useState | Every at-bat, pitching changes |
| fameEvents | FameEventRecord[] | useState | recordEvent with fame-worthy events |
| substitutionLog | SubstitutionLogEntry[] | useState | makeSubstitution, changePitcher |
| pitchCountPrompt | PitchCountPromptState | null | useState | endInning, changePitcher, endGame |
| atBatSequence | number | useState | Every at-bat |
| runnerTrackerRef | RunnerTrackingState | useRef | Every at-bat, runner movement, pitching change |
| awayLineupRef | LineupEntry[] | useRef | initializeGame, makeSubstitution |
| homeLineupRef | LineupEntry[] | useRef | initializeGame, makeSubstitution |
| inningPitchesRef | {pitches, strikeouts, pitcherId} | useRef | K/KL recorded, endInning resets |

## SIDE EFFECTS

| useEffect Location | Depends On | Does What |
|---|---|---|
| line 3050-3054 | initialGameId | Sets isLoading=false if no initialGameId |

**NOTE**: Minimal useEffect usage — most state changes are driven by user actions via callbacks, not reactive effects.
