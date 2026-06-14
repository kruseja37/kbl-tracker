# Baseball Logic Reference for KBL Tracker

> **Purpose**: Encode actual baseball rules + SMB4-specific mechanics so Claude doesn't hallucinate or apply incorrect logic. This is the authoritative reference for what's "correct" in the GameTracker.

## Standard Baseball Rules (Applied in SMB4)

### Run Scoring

- A run scores when a runner legally touches home plate
- **CRITICAL**: On the 3rd out:
  - If 3rd out is a FORCE OUT → no run scores, even if runner crossed plate first
  - If 3rd out is a TAG OUT → run scores IF runner crossed plate BEFORE the tag was applied
  - If 3rd out is a STRIKEOUT → no run scores (batter never reached base)

### Force Plays vs Tag Plays

**Force play**: Runner MUST advance because batter became a runner
- Applies when ALL bases behind the runner are occupied (chain from batter)
- Runner on 1st is ALWAYS in a force situation (batter forces them)
- Runner on 2nd is in force ONLY if 1st is also occupied
- Runner on 3rd is in force ONLY if 1st AND 2nd are occupied (bases loaded)

**Tag play**: Runner must be tagged; can retreat to previous base
- Runner on 2nd (no runner on 1st) on ground ball → tag play, runner can stay
- Runner on 3rd (no runner on 2nd) → tag play on ground ball

**Force removal**: If the force out is made behind a runner, that runner is no longer forced
- Example: Bases loaded, ground ball to pitcher, throw to 1st for out. Now runners on 2nd and 3rd are NOT in force (the batter's force was removed by the out at 1st)

### Sacrifice Fly Rules

A sacrifice fly occurs when ALL of these are true:
1. Runner on 3rd base (before the at-bat)
2. Less than 2 outs
3. Batter hits a fly ball (fly out or line out to outfield)
4. Runner on 3rd tags up and scores

Consequences:
- Batter is NOT charged with an at-bat (SF doesn't affect batting average)
- Batter IS credited with an RBI
- Batter DOES get an out recorded

NOT a sac fly:
- Runner on 2nd scores on a fly out → NOT sac fly (runner wasn't on 3rd)
- 2 outs, runner on 3rd, fly out → inning over, runner does NOT score
- Ground out with runner scoring from 3rd → NOT sac fly (not a fly ball)

### Sacrifice Bunt Rules

A sacrifice bunt occurs when:
1. Batter bunts the ball
2. Batter is thrown out at 1st
3. Runner(s) advance

Consequences:
- Batter is NOT charged with an at-bat
- If any runner scores, batter gets an RBI

### Double Play Rules

**Ground ball double play (GIDP):**
- Requires at least 1 runner on base
- Most common: Runner on 1st, ground ball → force at 2nd, relay to 1st
- With 2 outs already, no DP is possible (game needs only 1 more out)
- KBL Tracker auto-detects DP: ground out + runner thrown out

**Line drive double play:**
- Line out, runner caught off base (didn't tag up)

### Infield Fly Rule

**THIS EXISTS IN SMB4** (confirmed by user — do NOT mark as absent)

Conditions:
1. Runners on 1st and 2nd, OR bases loaded
2. Less than 2 outs
3. Fair fly ball that an infielder can catch with ordinary effort (not a line drive or bunt)

Effect:
- Batter is automatically OUT regardless of whether fielder catches the ball
- Runners may advance at their own risk (they don't have to)
- Prevents infielder from intentionally dropping a pop-up to get a double/triple play

### Batting Order

- 9 batters per team, positions 1-9
- After batter #9 completes, wraps to batter #1
- Pinch hitter takes the spot of the replaced batter
- Next at-bat goes to the NEXT position (not back to replaced player)
- Pitcher bats #9 in KBL Tracker (no DH in SMB4 exhibition mode — confirmed Feb 5 fix)

### Inning Structure

- Top of inning: Away team bats
- Bottom of inning: Home team bats
- 3 outs per half-inning
- After 3 outs: switch sides (toggle isTop in game state)
- **Walk-off**: If home team takes the lead in bottom of 9th (or later), game ends immediately
- **Bottom of 9th skip**: If home team is ahead after top of 9th, don't play bottom of 9th

### Stolen Bases

- Runner may attempt to steal on any pitch
- If successful: runner advances one base, SB recorded
- If caught: runner is out, CS recorded
- Can steal home (rare but valid)
- Double steal: two runners steal simultaneously

### Wild Pitch / Passed Ball

- Runners advance one base on WP/PB
- WP charged to pitcher, PB charged to catcher
- Can score a run if runner on 3rd
- **KBL Tracker fix (Feb 5)**: WP/PB runs now properly update scoreboard inning line score

### Error Rules

- Error allows batter to reach base (or runner to advance) when fielder should have made the play
- Batter reaches on error → NOT a hit, NOT an at-bat for batting average purposes... wait, actually it IS an at-bat, just not a hit
- **Correction**: Reached on error IS an at-bat but NOT a hit. Lowers batting average.
- Runners already on base are NOT wiped — they stay where they are (fixed Feb 5)
- Earned runs: runs scoring due to errors are UNEARNED (don't count toward ERA)

### Dropped Third Strike (D3K)

- Strike 3 is not caught cleanly by catcher
- Batter may run to 1st IF:
  - 1st base is unoccupied, OR
  - There are 2 outs (even if 1st is occupied)
- If batter reaches 1st safely: strikeout still recorded for pitcher, but batter is safe
- See `src/src_figma/app/engines/d3kTracker.ts` for implementation

---

## SMB4-Specific Mechanics (NOT in Standard Baseball)

### Mojo System

5-level emotional state affecting all player performance:
- **Jacked** (+2): Best performance tier
- **Locked In** (+1): Above average
- **Normal** (0): Baseline
- **Tense** (-1): Below average
- **Rattled** (-2): Worst performance tier

**Mojo Triggers:**
- Batter gets hit → Mojo UP
- Batter strikes out → Mojo DOWN
- Pitcher gets strikeout → Mojo UP
- Pitcher gives up hit/walk → Mojo DOWN
- Error → Mojo DOWN for fielder
- Amplified in pressure situations (tied games, late innings, RISP)

### Chemistry & Traits System

5 chemistry colors with potency levels:
- Competitive, Spirited, Crafty, Disciplined, Scholarly
- Team composition determines trait potency (0-2 players = Level 1, 7+ = Level 3)
- 25+ traits with specific effects (K Collector, Tough Out, Stealer, etc.)

### Pitcher Roles

- SP (Starter), SP/RP (Swing), RP (Reliever), CP (Closer)
- Using pitcher outside designated role causes mojo penalty
- Role determines stamina expectations

### SMB4-Specific Events

- **Comebacker/Nutshot**: Ball hits pitcher — mojo penalty, no fitness penalty
- **Failed HR Robbery**: Outfielder loses Fame for failed attempt
- **Bad Hop**: Tracked separately from errors (not a fielding error)

### What Does NOT Exist in SMB4

- No balks
- No catcher interference
- No umpire reviews/challenges
- No pitch clock
- No runner's lane interference
- No automatic intentional walks (player still throws 4 pitches... actually check this)

---

## KBL Tracker Implementation Notes

### Known Fixed Bugs (Do NOT Re-introduce)

| Bug | Fix Date | Details |
|-----|----------|---------|
| Error wipes runners | Feb 5 | `recordError()` in useGameState was clearing bases |
| WP/PB no scoreboard update | Feb 5 | `advanceRunner/Batch` now updates scoreboard inning |
| Inside-park HR no runner scoring | Feb 5 | Added HR case to `calculateHitDefaults()` |
| Pitcher not in lineup | Feb 5 | Pitcher at #9, handles stored lineups |
| Post-game "Game not found" | Feb 5 | Archive before navigation |
| DP auto-correction | Jan 25 | GO + runner out now auto-detects as DP |
| Walk classification | Earlier | IBB vs BB distinction in walk handler |

### Key Type References

From `src/src_figma/app/types/game.ts` and `src/types/game.ts`:
- `HitType`: 'single' | 'double' | 'triple' | 'homeRun' | etc.
- `OutType`: 'groundOut' | 'flyOut' | 'lineOut' | 'strikeoutSwinging' | 'strikeoutLooking' | etc.
- `WalkType`: 'walk' | 'intentionalWalk' | 'hitByPitch'
- `PlayerGameStats`: AB, H, 2B, 3B, HR, RBI, BB, K, SB, CS, etc.
- `PitcherGameStats`: IP, H, R, ER, BB, K, HR, pitchCount, etc.
