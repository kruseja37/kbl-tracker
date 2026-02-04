# GameTracker Button Audit Plan

> **Purpose**: Test every button in the GameTracker UI to verify it does what it should
> **Created**: 2026-02-03
> **Status**: READY FOR TESTING (after Claude Code implements persistence)

---

## How to Use This Document

1. Open the GameTracker app
2. For each button/action, follow the test steps
3. Record PASS/FAIL and notes in the "Result" column
4. After testing, we'll create an implementation plan for bugs

---

## SECTION 1: Primary Action Buttons

### 1.1 HIT Button

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| HIT-01 | Tap HIT | Opens hit flow, prompts for field location | ☐ | |
| HIT-02 | After HIT, tap field in LF | Registers direction as L/LC | ☐ | |
| HIT-03 | After HIT, tap field in CF | Registers direction as C | ☐ | |
| HIT-04 | After HIT, tap field in RF | Registers direction as R/RC | ☐ | |

### 1.2 OUT Button

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| OUT-01 | Tap OUT | Opens out flow, prompts for fielding sequence | ☐ | |
| OUT-02 | After OUT, tap fielder (SS) | Registers primary fielder | ☐ | |
| OUT-03 | After OUT, tap 6-4-3 sequence | Registers as DP-eligible chain | ☐ | |

### 1.3 OTHER Button

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| OTH-01 | Tap OTHER | Expands to show BB, IBB, HBP, D3K, SB, CS, PK, TBL, PB, WP, E | ☐ | |
| OTH-02 | Tap ✕ in OTHER menu | Closes the expanded menu | ☐ | |

---

## SECTION 2: Hit Outcome Buttons (OutcomeButtons.tsx - HIT mode)

### 2.1 Hit Types

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| 1B-01 | Tap 1B | Button highlights as selected | ☐ | |
| 1B-02 | 1B + ADVANCE (no runners) | Batter on 1B, AB+1, H+1, scoreboard hits+1 | ☐ | |
| 1B-03 | 1B + ADVANCE (R1 on base) | Batter to 1B, R1 forced to 2B | ☐ | |
| 1B-04 | 1B + ADVANCE (R3 on base) | Batter to 1B, R3 scores (RBI+1) | ☐ | |
| 2B-01 | Tap 2B | Button highlights as selected | ☐ | |
| 2B-02 | 2B + ADVANCE (no runners) | Batter on 2B, AB+1, H+1, 2B stat+1 | ☐ | |
| 2B-03 | 2B + ADVANCE (R1 on base) | Batter to 2B, R1 forced to 3B minimum | ☐ | |
| 2B-04 | 2B + ADVANCE (R2, R3 on base) | R2+R3 score, batter to 2B | ☐ | |
| 3B-01 | Tap 3B | Button highlights as selected | ☐ | |
| 3B-02 | 3B + ADVANCE (bases loaded) | All 3 runners MUST score | ☐ | |
| HR-01 | Tap HR | Button highlights as selected | ☐ | |
| HR-02 | HR + ADVANCE (no runners) | Score+1, batter credited HR, R+1 | ☐ | |
| HR-03 | HR + ADVANCE (bases loaded) | Grand slam: 4 RBI, score+4 | ☐ | |

### 2.2 Hit Modifiers

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| BUNT-01 | Toggle BUNT modifier | Highlights, can combine with hit type | ☐ | |
| IS-01 | Toggle IS (Infield Single) | Highlights, typically with 1B | ☐ | |
| 7+-01 | Toggle 7+ modifier | Highlights, tracks long at-bat | ☐ | |

### 2.3 Hit Special Events

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| KP-01 | Toggle KP (Killed Pitcher) | Highlights, +3 Fame to batter | ☐ | |
| KP-02 | KP recorded | Fame event logged in AtBatEvent.fameEvents | ☐ | |
| NUT-01 | Toggle NUT (Nutshot) | Highlights, +1 Fame to batter | ☐ | |
| NUT-02 | KP + NUT mutually exclusive | Selecting one blocks the other | ☐ | |

---

## SECTION 3: Out Outcome Buttons (OutcomeButtons.tsx - OUT mode)

### 3.1 Out Types - Row 1

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| GO-01 | Tap GO (Ground Out) | Button highlights, outs+1 on submit | ☐ | |
| GO-02 | GO with R1 + R1 gets out | Auto-corrects to DP if 2 total outs | ☐ | |
| FO-01 | Tap FO (Fly Out) | Button highlights, outs+1 | ☐ | |
| FO-02 | FO with R3, <2 outs, R3 scores | Auto-corrects to SF | ☐ | |
| LO-01 | Tap LO (Line Out) | Button highlights, outs+1 | ☐ | |
| PO-01 | Tap PO (Pop Out) | Button highlights, outs+1 | ☐ | |
| FLO-01 | Tap FLO (Foul Out) | Button highlights, outs+1 | ☐ | |

### 3.2 Out Types - Row 2

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| K-01 | Tap K (Strikeout swinging) | Button highlights, K+1 batter, K+1 pitcher | ☐ | |
| K-02 | K with 2 outs, R1 empty | D3K legal - batter can reach | ☐ | |
| K-03 | K with <2 outs, R1 occupied | D3K illegal - batter automatically out | ☐ | |
| KL-01 | Tap KL (Strikeout looking) | Button highlights, stats same as K | ☐ | |
| DP-01 | Tap DP (Double Play) | Button highlights, requires R1, <2 outs | ☐ | |
| DP-02 | DP submit | outs+2, R1 out, batter out | ☐ | |
| DP-03 | DP with 2 outs | Button should be DISABLED | ☐ | |
| DP-04 | DP with no runners | Button should be DISABLED | ☐ | |
| FC-01 | Tap FC (Fielder's Choice) | Button highlights, batter reaches, R1 out | ☐ | |

### 3.3 Out Modifiers

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| SF-01 | Toggle SF (Sac Fly) | Highlights, requires R3 + <2 outs | ☐ | |
| SF-02 | SF with 2 outs | Should be DISABLED | ☐ | |
| SF-03 | SF with no R3 | Should be DISABLED | ☐ | |
| SAC-01 | Toggle SAC (Sac Bunt) | Highlights, requires <2 outs | ☐ | |
| SAC-02 | SAC with 2 outs | Should be DISABLED | ☐ | |
| IFR-01 | Toggle IFR (Infield Fly Rule) | Highlights, requires R1+R2 or loaded + <2 outs | ☐ | |
| RD-01 | Toggle RD (Rundown) | Highlights when applicable | ☐ | |
| E-01 | Toggle E (Error on play) | Highlights, fielder selection required | ☐ | |

### 3.4 Out Special Events

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| WEB-01 | Toggle WEB (Web Gem) | Highlights, +1 Fame to fielder | ☐ | |
| WEB-02 | WEB recorded | Fame event logged | ☐ | |

---

## SECTION 4: OTHER Menu Buttons (ActionSelector.tsx)

### 4.1 Batter Outcome Buttons

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| BB-01 | Tap BB (Walk) | Batter to 1B, bb+1, pitcher walk+1 | ☐ | |
| BB-02 | BB with bases loaded | R3 scores (forced), 1 run | ☐ | |
| BB-03 | BB stat tracking | bb+1 batter, walk+1 pitcher, NO AB | ☐ | |
| IBB-01 | Tap IBB (Intentional Walk) | Same as BB, tracked separately | ☐ | |
| HBP-01 | Tap HBP (Hit By Pitch) | Batter to 1B, HBP stat (NOT walk) | ☐ | |
| HBP-02 | HBP stat tracking | hbp+1 batter, hbp+1 pitcher, NO AB, NO BB | ☐ | |
| D3K-01 | Tap D3K (Dropped Third Strike) | Opens D3K flow | ☐ | |
| D3K-02 | D3K with 1B empty | Legal - batter can attempt | ☐ | |
| D3K-03 | D3K with 2 outs, R1 occupied | Legal - 2-out exception | ☐ | |
| D3K-04 | D3K with <2 outs, R1 occupied | Illegal - batter automatically out | ☐ | |

### 4.2 Runner Event Buttons

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| SB-01 | Tap SB (Stolen Base) | Opens SB flow, select runner | ☐ | |
| SB-02 | SB with no runners | Button should be DISABLED | ☐ | |
| SB-03 | SB success recorded | sb+1 for runner | ☐ | **KNOWN BUG: sb never increments** |
| CS-01 | Tap CS (Caught Stealing) | Opens CS flow, runner is out | ☐ | |
| CS-02 | CS with no runners | Button should be DISABLED | ☐ | |
| CS-03 | CS recorded | cs+1 for runner, outs+1 | ☐ | **KNOWN BUG: cs never increments** |
| PK-01 | Tap PK (Pickoff) | Opens pickoff flow, runner is out | ☐ | |
| PK-02 | PK with no runners | Button should be DISABLED | ☐ | |
| PK-03 | PK recorded | outs+1, runner removed from base | ☐ | |
| TBL-01 | Tap TBL (TOOTBLAN) | Opens TBL flow, runner is out | ☐ | |
| TBL-02 | TBL recorded | outs+1, -3 Fame to runner | ☐ | |

### 4.3 Miscellaneous Event Buttons

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| PB-01 | Tap PB (Passed Ball) | Runners advance, catcher charged | ☐ | |
| PB-02 | PB with no runners | Button should be DISABLED | ☐ | |
| WP-01 | Tap WP (Wild Pitch) | Runners advance, pitcher charged | ☐ | |
| WP-02 | WP with no runners | Button should be DISABLED | ☐ | |
| E-01 | Tap E (Error) | Opens error flow, fielder selection | ☐ | |
| E-02 | E recorded | errors+1 scoreboard, fielder error+1 | ☐ | **KNOWN BUG: errors never increment** |

---

## SECTION 5: Modifier Button Bar (ModifierButtonBar.tsx)

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| MOD-7+-01 | Tap 7+ (7+ pitch AB) | Highlights, tracks long at-bat | ☐ | |
| MOD-WG-01 | Tap WG (Web Gem) | Highlights, +1 Fame to primary fielder | ☐ | |
| MOD-ROB-01 | Tap ROB (Robbery) | Highlights, +1.5 Fame (HR denial at wall) | ☐ | |
| MOD-KP-01 | Tap KP (Killed Pitcher) | Highlights, +3 Fame to batter | ☐ | |
| MOD-NUT-01 | Tap NUT (Nutshot) | Highlights, +1 Fame to batter | ☐ | |
| MOD-KP-NUT | KP then NUT | NUT should be BLOCKED (mutually exclusive) | ☐ | |
| MOD-BT-01 | Tap BT (Beat Throw) | Highlights when applicable | ☐ | |
| MOD-BUNT-01 | Tap BUNT | Highlights when applicable | ☐ | |
| MOD-TBL-01 | Tap TOOTBLAN | Highlights, -3 Fame to runner | ☐ | |

---

## SECTION 6: Runner Outcome Controls

### 6.1 Runner Drag-Drop

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| RUN-01 | Drag R1 to 2B | R1 advances to second | ☐ | |
| RUN-02 | Drag R1 to 3B | R1 advances to third | ☐ | |
| RUN-03 | Drag R1 to HOME | R1 scores, run+1 | ☐ | |
| RUN-04 | Drag R1 to OUT | R1 is out, outs+1 | ☐ | |
| RUN-05 | R1 HELD on single | Should be BLOCKED (forced advance) | ☐ | |
| RUN-06 | R1 HELD on double | Should be BLOCKED (forced advance) | ☐ | |
| RUN-07 | All runners SCORED on triple | Auto-advance all runners | ☐ | |

### 6.2 Force Play Validation

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| FORCE-01 | R1 HELD on BB | BLOCKED - R1 always forced | ☐ | |
| FORCE-02 | R2 HELD on BB with R1 | BLOCKED - R2 forced by chain | ☐ | |
| FORCE-03 | R3 HELD on BB with loaded | BLOCKED - R3 forced | ☐ | |
| FORCE-04 | R2 HELD on BB without R1 | ALLOWED - R2 not forced | ☐ | |

---

## SECTION 7: Game State Controls

### 7.1 Count Controls

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| CNT-01 | Ball button | balls+1 (max 4) | ☐ | |
| CNT-02 | 4 balls | Walk recorded automatically | ☐ | |
| CNT-03 | Strike button | strikes+1 (max 3) | ☐ | |
| CNT-04 | 3 strikes | Strikeout recorded | ☐ | |
| CNT-05 | Foul with 2 strikes | strikes stays at 2 | ☐ | |
| CNT-06 | Foul with <2 strikes | strikes+1 | ☐ | |

### 7.2 Inning Controls

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| INN-01 | End Inning with 3 outs | Switches half-inning | ☐ | |
| INN-02 | Top → Bottom transition | isTop changes, outs reset to 0 | ☐ | |
| INN-03 | Bottom 9 → End of regulation | Prompts for extra innings or end | ☐ | |

### 7.3 Substitution Controls

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| SUB-01 | Pitching change | New pitcher active, old pitcher's stats preserved | ☐ | |
| SUB-02 | Pinch hitter | Bench player enters lineup | ☐ | |
| SUB-03 | Defensive replacement | Player swaps position | ☐ | |

### 7.4 Undo System

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| UNDO-01 | Tap Undo after hit | Reverts to previous state | ☐ | |
| UNDO-02 | Undo after score change | Score reverts correctly | ☐ | |
| UNDO-03 | Undo after out | Outs revert, runner returns | ☐ | |
| UNDO-04 | Multiple undos (up to 5) | Each undo restores previous snapshot | ☐ | |

---

## SECTION 8: Stat Tracking Verification

### 8.1 Batter Stats

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| STAT-PA | PA after any plate appearance | pa+1 | ☐ | |
| STAT-AB | AB after hit or out (not walk) | ab+1 | ☐ | |
| STAT-H | H after any hit | h+1, singles/doubles/triples/hr+1 | ☐ | |
| STAT-R | R when runner scores | r+1 for scoring runner | ☐ | |
| STAT-RBI | RBI on hit with runners scoring | rbi+N (N=runners scored) | ☐ | |
| STAT-BB | BB on walk | bb+1 (NOT ab) | ☐ | |
| STAT-K | K on strikeout | k+1, ab+1 | ☐ | |
| STAT-SB | SB on steal | sb+1 | ☐ | **KNOWN BUG** |
| STAT-CS | CS on caught stealing | cs+1 | ☐ | **KNOWN BUG** |

### 8.2 Pitcher Stats

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| PSTAT-OUT | Outs recorded | outsRecorded+1 per out | ☐ | |
| PSTAT-H | Hits allowed | hitsAllowed+1 per hit | ☐ | |
| PSTAT-R | Runs allowed | runsAllowed+1 per run | ☐ | |
| PSTAT-ER | Earned runs | earnedRuns+1 (currently = runsAllowed) | ☐ | |
| PSTAT-BB | Walks allowed | walksAllowed+1 per BB | ☐ | |
| PSTAT-K | Strikeouts | strikeoutsThrown+1 per K | ☐ | |
| PSTAT-HR | HRs allowed | homeRunsAllowed+1 per HR | ☐ | |
| PSTAT-PC | Pitch count | pitchCount increment | ☐ | **KNOWN BUG: never increments** |
| PSTAT-BF | Batters faced | battersFaced+1 per PA | ☐ | |

### 8.3 Scoreboard

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| SCORE-R | Runs per inning | innings[n].away/home updates | ☐ | |
| SCORE-H | Total hits | away.hits / home.hits updates | ☐ | |
| SCORE-E | Total errors | away.errors / home.errors updates | ☐ | **KNOWN BUG: never increments** |

---

## SECTION 9: Known Bugs to Verify (Pre-Persistence)

These are bugs identified in the gap analysis that should be verified:

| Bug ID | Description | Location | Status |
|--------|-------------|----------|--------|
| BUG-01 | sb field never incremented | useGameState.ts line 767 TODO | ☐ Confirm |
| BUG-02 | cs field never incremented | useGameState.ts line 767 TODO | ☐ Confirm |
| BUG-03 | pitchCount never incremented | No UI input exists | ☐ Confirm |
| BUG-04 | scoreboard.errors never incremented | No tracking code | ☐ Confirm |
| BUG-05 | Balk button should not exist | SMB4 has no balks | ☐ Verify removed |
| BUG-06 | logAtBatEvent is undefined | eventLog.ts doesn't exist | ☐ Confirm |
| BUG-07 | Runner IDs always empty string | AtBatEvent.runners.*.runnerId | ☐ Confirm |

---

## SECTION 10: Post-Persistence Tests

After Claude Code implements the persistence layer, add these tests:

| Test ID | Test | Expected Behavior | Result | Notes |
|---------|------|-------------------|--------|-------|
| PERS-01 | Play 1 AB, refresh page | Game state restored | ☐ | |
| PERS-02 | Check IndexedDB atBatEvents | Events stored | ☐ | |
| PERS-03 | Complete game, check seasonStats | Stats aggregated | ☐ | |
| PERS-04 | useFranchiseData.hasRealData | Returns true | ☐ | |
| PERS-05 | FranchiseHome leaderboards | Real player names | ☐ | |
| PERS-06 | PostGameSummary | Actual game data | ☐ | |

---

## Test Execution Log

| Date | Tester | Sections Tested | Bugs Found | Notes |
|------|--------|-----------------|------------|-------|
| | | | | |

---

*Document created: 2026-02-03*
*For use with KBL Tracker GameTracker verification*
