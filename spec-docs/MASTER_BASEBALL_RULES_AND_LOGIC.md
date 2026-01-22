# Master Baseball Rules & Logic Reference
## KBL XHD Tracker - Comprehensive Baseball Rules Document

**Version:** 1.0  
**Created:** January 2026  
**Purpose:** Authoritative reference for implementing baseball logic in the KBL XHD Tracker application

---

## Table of Contents

1. [Game Structure](#1-game-structure)
2. [Scoring Runs](#2-scoring-runs)
3. [At-Bat Results](#3-at-bat-results)
4. [Batted Ball Types](#4-batted-ball-types)
5. [Outs and Force Plays](#5-outs-and-force-plays)
6. [Base Running](#6-base-running)
7. [Situational Rules](#7-situational-rules)
8. [Statistical Calculations](#8-statistical-calculations)
9. [Rare Events & Special Achievements](#9-rare-events--special-achievements)
10. [Fielding Positions](#10-fielding-positions)
11. [Lineup & Strategy](#11-lineup--strategy)
12. [Application Logic Rules](#12-application-logic-rules)

---

## 1. Game Structure

### Basic Game Format
- **Innings:** Standard game is 9 innings
- **Half-Innings:** Each inning has a top (away team bats) and bottom (home team bats)
- **Outs per Half-Inning:** 3 outs end a half-inning
- **Winning:** Team with most runs after 9 innings wins; extra innings if tied

### Batting Order
- 9 batters in fixed order
- Order cycles continuously throughout the game
- In leagues with DH: 9 batters, pitcher does not bat
- Without DH: Pitcher typically bats 9th

---

## 2. Scoring Runs

### Basic Run Scoring
A run scores when a runner legally touches all bases (1st → 2nd → 3rd → Home) before 3 outs are recorded.

### CRITICAL: Third Out Exceptions
**A run does NOT score if the third out is made by:**

1. **Batter-runner out before reaching first base**
   - Any out at first on the batter ends the inning; no runs score on that play

2. **ANY force out** ⚠️ IMPORTANT
   - A force out for the third out NEGATES ALL RUNS on that play
   - Timing does NOT matter - even if runner crosses home before the force out
   - Example: Runner on 3rd, runner on 1st, 2 outs. Ground ball to SS, throw to 2B for force out. Even if R3 crossed home first, the run does NOT count.

3. **Appeal play on preceding runner**
   - If a runner misses a base and is appealed out as the third out

### When Runs CAN Score on Third Out (Time Plays)
- If the third out is a TAG OUT (not a force out), timing matters
- Run counts if runner crosses home BEFORE the tag is applied
- Example: R3, R1, 1 out. Fly ball caught (2 outs). R1 doesn't tag up, thrown out at 1st (tag play). If R3 tagged and scored before throw reached 1st, run counts.

### RBI (Run Batted In) Rules

**RBI IS credited for:**
- Safe hits that score runners
- Sacrifice flies (runner scores from 3rd on caught fly ball)
- Sacrifice bunts that score runners
- Walks/HBP with bases loaded (forces in a run)
- Fielder's choice where runner scores (if runner was going home)
- Ground outs that score runners (if not a double play)

**RBI is NOT credited for:**
- Runs scoring on errors
- Runs scoring on double plays
- Runs scoring on wild pitches/passed balls (unless bases loaded walk/HBP)
- Runs scoring due to balk

---

## 3. At-Bat Results

### Hits

| Result | Code | Description | Bases Reached |
|--------|------|-------------|---------------|
| Single | 1B | Batter reaches 1st safely on hit | 1 |
| Double | 2B | Batter reaches 2nd safely on hit | 2 |
| Triple | 3B | Batter reaches 3rd safely on hit | 3 |
| Home Run | HR | Batter circles all bases, scores | 4 |

### Outs (Batter is Out)

| Result | Code | Description | Ball in Play? |
|--------|------|-------------|---------------|
| Strikeout | K | Batter strikes out swinging | No |
| Strikeout Looking | KL | Batter strikes out called | No |
| Ground Out | GO | Out on ground ball | Yes |
| Fly Out | FO | Out on fly ball to outfield | Yes |
| Line Out | LO | Out on line drive | Yes |
| Pop Out | PO | Out on popup to infield | Yes |

### Special Results

| Result | Code | Description | At-Bat? | Notes |
|--------|------|-------------|---------|-------|
| Sacrifice Fly | SF | Fly out that scores runner from 3rd | No | Requires runner on 3rd, <2 outs |
| Sacrifice Bunt | SAC | Bunt that advances runner, batter out | No | Requires runner(s), <2 outs |
| Double Play | DP | Two outs recorded on one play | Yes | Requires runner(s), <2 outs |
| Fielder's Choice | FC | Batter reaches, runner put out | Yes | Fielder chose to retire runner |
| Dropped 3rd Strike | D3K | Batter reaches on uncaught K | Yes | Special conditions apply |
| Error | E | Batter reaches on fielding error | Yes | Error charged to fielder |
| Walk | BB | Four balls, batter to 1st | No | - |
| Intentional Walk | IBB | Intentional four balls | No | - |
| Hit By Pitch | HBP | Batter hit by pitch | No | - |

---

## 4. Batted Ball Types

### Classification by Launch Angle

| Type | Launch Angle | Description |
|------|--------------|-------------|
| Ground Ball | Below 10° | Ball contacts ground shortly after hit |
| Line Drive | 10° - 25° | Ball hit in nearly straight line |
| Fly Ball | 25°+ (outfield) | Arcing ball to outfield |
| Pop Up | 25°+ (infield) | Arcing ball stays in infield |

### Hit Probability by Type
- **Line Drive:** ~72.5% chance of hit (BEST for hitters)
- **Fly Ball:** ~27% chance of hit
- **Ground Ball:** Low hit probability, but avoids double plays less than fly balls
- **Pop Up:** Almost always an out (<1% hit rate)

### League Averages (Approximate)
- Ground Balls: 44%
- Fly Balls: 35%
- Line Drives: 21%
- Infield Fly Balls (of total FB): 11%

---

## 5. Outs and Force Plays

### Force Out Definition
A force out occurs when a runner is REQUIRED to advance because the batter became a runner. The defense can retire the runner by touching the base before the runner arrives.

**Force situations:**
- Runner on 1st MUST advance when batter hits ball
- Runner on 2nd MUST advance only if runner on 1st is also forced
- Runner on 3rd MUST advance only if runners on 1st and 2nd are also forced

### Force Out vs Tag Out - Critical Distinction

| Situation | Type | Run Scores on 3rd Out? |
|-----------|------|------------------------|
| Runner thrown out at base they're forced to | Force Out | NO - Never |
| Runner tagged between bases on force play | Force Out | NO - Never |
| Runner tagged after passing force base | Tag Out | YES - if timed correctly |
| Runner tagged on non-force advancement | Tag Out | YES - if timed correctly |

### Double Play Types

| Code | Description | Common Situation |
|------|-------------|------------------|
| 6-4-3 | SS → 2B → 1B | Most common, ball to SS |
| 4-6-3 | 2B → SS → 1B | Ball hit toward 2B |
| 5-4-3 | 3B → 2B → 1B | "Around the horn" |
| 3-6-3 | 1B → SS → 1B | Ball to 1B, back to 1B |
| 6-3 | SS → 1B (unassisted at 2B) | SS steps on 2B, throws to 1B |
| 4-3 | 2B → 1B (unassisted at 2B) | 2B steps on 2B, throws to 1B |
| 1-6-3 | P → SS → 1B | Ball hit to pitcher |
| 1-4-3 | P → 2B → 1B | Ball hit to pitcher |

### DP Requirements
- Less than 2 outs
- At least one runner on base
- If 2 outs, cannot turn DP (would be 3rd and 4th out)

---

## 6. Base Running

### Stolen Base Rules

**When a stolen base IS credited:**
- Runner advances on pitch without ball being batted
- Runner was attempting to steal (not just taking extra base on WP/PB)

**When a stolen base is NOT credited:**
- Runner advances on wild pitch or passed ball (unless was already stealing)
- Runner advances due to fielding error
- Another runner attempting to steal on same play is thrown out

### Caught Stealing
- Runner is tagged out while attempting to steal
- Runner is thrown out attempting to advance on pitch
- NOT charged if runner is picked off while returning to base (unless runner feinted toward next base)

### Pickoff Rules (2023+ MLB)
- Pitchers limited to 2 disengagement attempts per plate appearance
- After 2 attempts, must either pitch or successfully pick off runner
- Failed 3rd attempt = balk, runners advance

### Tag Up Rule
**On caught fly balls:**
- Runners MUST return to ("tag") their original base
- After ball is touched by fielder, runner may attempt to advance
- If runner leaves early and ball is caught, runner can be doubled off by throw to original base
- This is an APPEAL PLAY, not automatic

**Tag up considerations:**
- Deep fly balls: Runners often advance (especially from 3rd = Sac Fly)
- Shallow fly balls: Runners rarely attempt to advance
- Line drives: Very risky to advance

---

## 7. Situational Rules

### Dropped Third Strike (D3K)

**Batter may attempt to reach first when:**
1. First base is UNOCCUPIED, OR
2. There are 2 OUTS (regardless of runners)

**Batter may NOT run when:**
- First base is OCCUPIED and less than 2 outs
- Reason: Prevents catcher from intentionally dropping to turn DP

**Recording:**
- K + WP (Wild Pitch) if pitch was uncatchable
- K + PB (Passed Ball) if catcher should have caught it
- K + E2 if catcher error on catchable pitch

### Infield Fly Rule

**Conditions (ALL must be met):**
1. Less than 2 outs
2. Runners on 1st and 2nd, OR bases loaded
3. Fair fly ball (not line drive, not bunt)
4. Can be caught with "ordinary effort"

**Effect:**
- Batter is OUT immediately (whether caught or not)
- Removes force play on runners
- Runners may advance at their own risk

**Does NOT apply:**
- With only runner on 1st (no advantage to defense)
- With 2 outs
- On bunts
- On line drives

### Sacrifice Fly (SF) Requirements
1. Less than 2 outs
2. Runner on 3rd base
3. Fly ball is caught (out recorded)
4. Runner from 3rd scores after tagging up

**Special case:** If outfielder drops catchable ball and run scores, SF is still credited (plus error to fielder)

### Sacrifice Bunt (SAC) Requirements
1. Less than 2 outs
2. Runner(s) on base
3. Batter bunts
4. Batter is put out at first
5. At least one runner advances

**Scorer's judgment:** If batter appeared to be bunting for a hit (not sacrificing), charge as at-bat instead

---

## 8. Statistical Calculations

### Batting Statistics

**Batting Average (AVG)**
```
AVG = Hits / At-Bats
```
Good: .300+ | Average: .250 | Poor: Below .200

**On-Base Percentage (OBP)**
```
OBP = (H + BB + HBP) / (AB + BB + HBP + SF)
```
Good: .340+ | Elite: .400+

**Slugging Percentage (SLG)**
```
SLG = Total Bases / At-Bats
Total Bases = (1B×1) + (2B×2) + (3B×3) + (HR×4)
```
Good: .430+ | Elite: .550+

**OPS (On-base Plus Slugging)**
```
OPS = OBP + SLG
```
Above Average: .800+ | Excellent: .900+ | Elite: 1.000+

### Pitching Statistics

**ERA (Earned Run Average)**
```
ERA = (Earned Runs × 9) / Innings Pitched
```
Excellent: Below 3.00 | Good: 3.00-4.00 | Average: 4.00-5.00

**WHIP (Walks + Hits per Inning Pitched)**
```
WHIP = (Walks + Hits) / Innings Pitched
```
Elite: Below 1.00 | Good: 1.00-1.20 | Average: 1.20-1.40

### What Counts as an At-Bat?

**IS an At-Bat:**
- Hits (1B, 2B, 3B, HR)
- Outs (K, GO, FO, LO, PO)
- Fielder's Choice
- Errors (reaching on error)

**NOT an At-Bat:**
- Walks (BB, IBB)
- Hit By Pitch (HBP)
- Sacrifice Fly (SF)
- Sacrifice Bunt (SAC)
- Catcher's Interference

---

## 9. Rare Events & Special Achievements

### Pitching Achievements

| Achievement | Definition |
|-------------|------------|
| **Perfect Game** | Complete game, no batters reach base (no hits, walks, errors, HBP) |
| **No-Hitter** | Complete game with no hits allowed (walks/errors allowed) |
| **Shutout** | Complete game with no runs allowed |
| **Maddux** | Complete game shutout in under 100 pitches |
| **Quality Start** | 6+ innings, 3 or fewer earned runs |
| **Immaculate Inning** | 3 strikeouts on exactly 9 pitches |

### Batting Achievements

| Achievement | Definition |
|-------------|------------|
| **Cycle** | Single, Double, Triple, and Home Run in same game |
| **Natural Cycle** | Cycle achieved in order (1B, 2B, 3B, HR) |
| **Grand Slam** | Home run with bases loaded (4 RBI) |
| **Walk-Off** | Game-winning hit/play in bottom of final inning |

### Fielding Achievements

| Achievement | Definition |
|-------------|------------|
| **Unassisted Triple Play** | One fielder records all 3 outs on single play |
| **Triple Play** | 3 outs recorded on single play |

### Rarity Rankings
1. Unassisted Triple Play (rarest - 15 in modern era)
2. Perfect Game (24 in MLB history)
3. Immaculate Inning (116 total through 2024)
4. Cycle (~350 total in MLB history)
5. No-Hitter (more common, several per year)

---

## 10. Fielding Positions

### Position Numbers and Abbreviations

| # | Position | Abbrev | Location |
|---|----------|--------|----------|
| 1 | Pitcher | P | Mound |
| 2 | Catcher | C | Behind plate |
| 3 | First Baseman | 1B | First base |
| 4 | Second Baseman | 2B | Between 1B and 2B |
| 5 | Third Baseman | 3B | Third base |
| 6 | Shortstop | SS | Between 2B and 3B |
| 7 | Left Fielder | LF | Left outfield |
| 8 | Center Fielder | CF | Center outfield |
| 9 | Right Fielder | RF | Right outfield |

### Typical Fielder by Hit Direction

| Direction | Ground Ball | Fly Ball |
|-----------|-------------|----------|
| Left | 3B (5) or SS (6) | LF (7) |
| Left-Center | SS (6) | LF (7) or CF (8) |
| Center | SS (6) or 2B (4) | CF (8) |
| Right-Center | 2B (4) | CF (8) or RF (9) |
| Right | 1B (3) or 2B (4) | RF (9) |

---

## 11. Lineup & Strategy

### Batting Order Strategy

| Position | Traditional Role | Key Attributes |
|----------|-----------------|----------------|
| 1 (Leadoff) | Get on base | High OBP, speed, plate discipline |
| 2 | Move runners, contact | Bat control, can hit-and-run |
| 3 | Best overall hitter | High AVG, good power |
| 4 (Cleanup) | Primary power | Most HRs/RBIs, drives in runs |
| 5 | Secondary power | "Protects" cleanup hitter |
| 6 | Second leadoff | Some OBP, bridge to bottom |
| 7-8 | Weaker hitters | Varies by team |
| 9 | Pitcher (no DH) or speedy player (with DH) | - |

### RISP (Runners in Scoring Position)
- Runner on 2nd or 3rd base
- Key stat: BA/RISP (batting average with RISP)
- Critical situations: 2 outs + RISP

### Clutch Situations
Typically defined as:
- Late innings (7th+)
- Close game (within 2 runs)
- RISP situations
- Walk-off opportunities (home team, final inning, tied or down by ≤ run differential that can be overcome)

---

## 12. Application Logic Rules

### Smart Defaults & Auto-Corrections

#### Exit Type Defaults
| Result | Default Exit Type |
|--------|------------------|
| GO | Ground |
| DP | Ground |
| FO | Fly Ball |
| SF | Fly Ball |
| LO | Line Drive |
| PO | Pop Up |

#### Fielder Inference by Direction
| Direction | GO/DP | FO | LO | PO |
|-----------|-------|----|----|-----|
| Left | 5 (3B) | 7 (LF) | 5 or 7 | 5 (3B) |
| Left-Center | 6 (SS) | 7 (LF) | 6 or 7 | 6 (SS) |
| Center | 6 (SS) | 8 (CF) | 1 or 8 | 6 or 4 |
| Right-Center | 4 (2B) | 9 (RF) | 4 or 9 | 4 (2B) |
| Right | 3 (1B) | 9 (RF) | 3 or 9 | 3 (1B) |

#### Runner Advancement Defaults
| Result | R1 Default | R2 Default | R3 Default |
|--------|------------|------------|------------|
| 1B | To 2B | To 3B | Scores |
| 2B | To 3B | Scores | Scores |
| 3B | Scores | Scores | Scores |
| HR | Scores | Scores | Scores |
| BB/HBP | To 2B (if forced) | To 3B (if forced) | Scores (if forced) |
| GO/FO/LO/PO | Held | Held | Held |
| SF | Held | Held | Scores |
| DP | Out at 2B | To 3B | Held |

### Button Availability Rules

| Button | Disabled When |
|--------|---------------|
| SAC | 2 outs (batter out = inning over, no sacrifice possible) |
| SF | 2 outs OR no runner on 3rd |
| DP | 2 outs OR no runners on base |
| D3K | 1st base occupied AND less than 2 outs |

### Auto-Correction Logic

| User Input | Condition | Auto-Correct To |
|------------|-----------|-----------------|
| FO | R3 scores, <2 outs | SF |
| GO | Runner advances, <2 outs | Suggest SAC (don't auto-correct - requires intent) |

### Validation Rules

1. **Run Scoring on Force Out**
   - If result creates force out at any base for 3rd out
   - ALL runs on that play should be invalidated
   - Display warning if user tries to score run with force out for 3rd out

2. **SF Validation**
   - Cannot record SF with 2 outs
   - Must have runner on 3rd who scores
   - Auto-convert FO → SF if conditions met

3. **DP Validation**
   - Cannot record DP with 2 outs
   - Must have at least 1 runner
   - Should track which runners are out

4. **D3K Validation**
   - Block if 1st occupied AND < 2 outs
   - Allow if 1st empty OR 2 outs

---

## Sources & References

### Official Rules
- [2025 Official Baseball Rules (MLB)](https://mktg.mlbstatic.com/mlb/official-information/2025-official-baseball-rules.pdf)
- [2024 Official Baseball Rules (MLB)](https://mktg.mlbstatic.com/mlb/official-information/2024-official-baseball-rules.pdf)
- [MLB Official Information](https://www.mlb.com/official-information)

### Scoring Rules
- [Baseball Scoring Rules - Sacrifices](https://baseballscoring.wordpress.com/site-index/sacrifices/)
- [Baseball Scoring Rules - RBIs](https://baseballscoring.wordpress.com/site-index/runs-batted-in/)
- [Baseball Scoring Rules - Stolen Bases](https://baseballscoring.wordpress.com/site-index/stolen-bases/)

### Force Plays & Run Scoring
- [Umpire Empire - Tag out vs Force out](https://umpire-empire.com/topic/81251-tag-out-vs-force-out-run-scoring/)
- [Baseball Rules Academy - Time Plays](https://baseballrulesacademy.com/multiple-ways-a-time-play-can-score-a-run/)
- [Steve the Ump - Scoring Runs](http://www.stevetheump.com/scoring_runs.htm)

### Statistics
- [FanGraphs - Batted Ball Stats](https://library.fangraphs.com/offense/batted-ball/)
- [FanGraphs - WHIP](https://library.fangraphs.com/pitching/whip/)
- [MLB Glossary](https://www.mlb.com/glossary)

### Special Rules
- [Dropped Third Strike - MLB](https://www.mlb.com/news/dropped-third-strike-strangest-baseball-rule)
- [Infield Fly Rule - MLB](https://www.mlb.com/news/the-infield-fly-rule-a-history-and-explanation)
- [Wikipedia - Force Play](https://en.wikipedia.org/wiki/Force_play)
- [Wikipedia - Tag Up](https://en.wikipedia.org/wiki/Tag_up)

### Achievements
- [Maddux Definition - MLB](https://www.mlb.com/glossary/idioms/maddux)
- [Immaculate Innings - MLB](https://www.mlb.com/news/immaculate-innings-c265720420)
- [Hitting for the Cycle - Wikipedia](https://en.wikipedia.org/wiki/Hitting_for_the_cycle)

---

## Implementation Status

The following rules from this document have been implemented in the KBL XHD Tracker:

| Rule | Section | Status | Implementation Doc |
|------|---------|--------|-------------------|
| Force out 3rd out negates runs | 2 | ✅ Implemented | IMPLEMENTATION_GUIDE.md |
| RBI not credited on DP | 2 | ✅ Implemented | AtBatFlow.tsx |
| Tag-up required on fly outs | 6 | ✅ Implemented | IMPLEMENTATION_GUIDE.md |
| Infield Fly Rule conditions | 7 | ✅ Indicator Added | IMPLEMENTATION_GUIDE.md |
| Fielder's Choice flow | 3 | ✅ Implemented | IMPLEMENTATION_GUIDE.md |
| SAC requires runners | 3 | ✅ Implemented | IMPLEMENTATION_GUIDE.md |
| Hit type statistics (2B/3B) | 8 | ✅ Implemented | IMPLEMENTATION_GUIDE.md |
| Button availability rules | 12 | ✅ Implemented | AtBatButtons.tsx |

**Related Documentation:**
- `TRACKER_LOGIC_AUDIT.md` - Audit of implementation vs rules
- `IMPLEMENTATION_GUIDE.md` - Technical implementation details
- `CHANGELOG.md` - History of changes

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial creation - comprehensive baseball rules reference |
| 1.1 | Jan 21, 2026 | Added implementation status section |

---

*This document serves as the authoritative reference for baseball logic implementation in the KBL XHD Tracker. All game logic, scoring, and statistical calculations should be validated against these rules.*
