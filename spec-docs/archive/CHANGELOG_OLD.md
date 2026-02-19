# KBL XHD Tracker - Changelog

## [Unreleased]

### January 22, 2026 - SMB4 Baselines & Adaptive Standards Engine

#### 📊 Data & Baselines

**SMB4 Season Baselines Calculated**
- Extracted raw stats from 16 screenshots (8 teams × pitching + batting)
- Calculated league-wide totals: 2,791.3 IP, 10,994 PA, 1,277 R, 2,958 H
- Rate stats: AVG .288, OBP .329, ERA 4.04, K/9 6.71
- Linear weights (Jester method): rOut=0.1525, wOBAscale=1.7821
- FIP constant: 3.28
- Pitching pace: 122.7 pitches/9 IP (Maddux threshold <85 confirmed elite)

**Opportunity-Based Scaling System**
- Refactored game-count scaling to include innings-per-game
- Formula: `opportunityFactor = (games × innings) / (162 × 9)`
- 50g × 9inn = 0.309 factor; 50g × 7inn = 0.240 factor
- All counting stat thresholds now scale by opportunity factor
- Rate stats (ERA, AVG) don't scale - already normalized

**Innings-Adjusted Milestones**
- Quality Start: 6 IP → 4.67 IP (7-inning games)
- Quality Start max ER: 3 → 2 (7-inning games)
- Maddux: <100 NP → <66 NP (7-inning games)
- Complete game: 9 IP → 7 IP (scales with game length)

#### 🔧 Fixes

**CURRENT_STATE.md Accuracy**
- Fixed incorrect status showing persistence as "❌ None"
- Updated to reflect Phases 1-4 COMPLETE (IndexedDB, game recovery, season stats)

---

### January 21, 2026 - Baseball Rules Implementation

#### 🔴 Critical Fixes

**Force Out Third Out Rule**
- When the 3rd out is a force out, NO runs score on that play
- Added `isForceOut()` helper function to detect force out scenarios
- Added `processRunnerOutcomes()` that validates scoring against force out rule
- Test: Bases loaded, 2 outs, GO with force out at 2B → Score stays 0-0 ✅

**Fielder's Choice (FC) Runner Selection**
- FC now prompts user to select which runner was put out
- Shows buttons for each occupied base with runner name
- Auto-sets selected runner to OUT, others to HELD
- Batter correctly placed on 1st base

#### 🟡 High Priority Enhancements

**Tag-Up Context for Fly Outs**
- On fly outs (FO, SF, LO, PO), users select which runners tagged up
- Runners who didn't tag can only: Hold or Be Doubled Off
- Runners who tagged get full options: Score, Advance, Hold, Out
- FO auto-corrects to SF when runner tags and scores from 3rd

**SAC Requires Runners Validation**
- SAC button now disabled when no runners on base
- Tooltip explains: "SAC requires runners on base"
- Logic: `isSACAvailable = hasRunners`

**2B/3B Stat Tracking**
- PlayerStats interface now includes:
  - `singles: number`
  - `doubles: number`
  - `triples: number`
- Stats tracked separately when recording 1B, 2B, 3B results

#### 🟢 New Features

**Infield Fly Rule (IFR) Indicator**
- Cyan "IFR" badge displays when rule is in effect
- Conditions: Less than 2 outs AND runners on 1st AND 2nd
- Appears alongside CLUTCH, RISP, and WALK-OFF badges

---

### Files Changed

| File | Changes |
|------|---------|
| `src/components/GameTracker/index.tsx` | Force out logic, IFR indicator, hit type stats |
| `src/components/GameTracker/AtBatFlow.tsx` | FC flow, tag-up tracking, FO→SF auto-correct |
| `src/components/GameTracker/AtBatButtons.tsx` | SAC/DP/SF availability validation |

---

## Previous Updates

*(Add earlier changelog entries here)*
