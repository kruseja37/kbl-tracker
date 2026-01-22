# KBL XHD Tracker - Changelog

## [Unreleased]

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
