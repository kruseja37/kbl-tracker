# Spec-UI Alignment Audit Report (Post-Phase-B)

**Date:** 2026-02-07
**Auditor:** Claude Opus 4.6 (4 parallel subagents: WAR Systems, Player Systems, GameTracker, Franchise/League)
**Methodology:** 4-layer audit per `.claude/skills/spec-ui-alignment/SKILL.md`
**Baseline:** TSC 0 errors, 5,445 tests pass / 77 fail / 5,522 total

---

## Pre-Flight: 13 TypeScript Errors Fixed

Before audit could proceed, 13 TS errors were found and fixed (regression from Phase B):

| File | Error | Fix |
|------|-------|-----|
| DraftFlow.tsx:217 | Args swapped in `generatePitcherProspectRatings` | Swapped grade/position args |
| DraftFlow.tsx:230 | Grade type too wide for potentialCeiling | Cast to `DraftProspect['potentialCeiling']` |
| FinalizeAdvanceFlow.tsx:464,473 | Transaction shape mismatch | Matched `Transaction` interface (id, team, timestamp) |
| FreeAgencyFlow.tsx:203,205 | `currentRound` not on `FreeAgencyPhaseData` | Removed dead conditional (both branches identical) |
| GameTracker.tsx:1987,1989 | Reporter type mismatch for morale calc | Used pre-computed `gameNarrative.moraleImpact` directly |
| LeagueBuilder.tsx:281,285 | `divisions` → `divisionIds`, implicit any | Lookup divisions via `league.divisions.find()` |
| LeagueBuilderLeagues.tsx:872,874 | `innings` → `inningsPerGame`, nested mercy rule | Used correct property paths |

---

## Layer 1: Spec → Backend (Constants & Formulas)

### WAR Systems (177 constants checked, 0 mismatches)

| System | Constants | RPW Formula | Connectivity |
|--------|-----------|-------------|-------------|
| BWAR | 13/13 MATCH | `10 × (seasonGames/162)` ✅ | CONNECTED (useWARCalculations → FranchiseHome) |
| PWAR | 12/12 MATCH | Same ✅ | CONNECTED (same hook) |
| FWAR | 35/37 MATCH + 2 extras | Same ✅ | CONNECTED (via warOrchestrator) |
| RWAR | 16/16 MATCH | Same ✅ | CONNECTED (same hook) |
| MWAR | 27/27 MATCH | Same ✅ | CONNECTED (useMWARCalculations → GameTracker) |
| Leverage | 44/44 MATCH | N/A | DEEPLY CONNECTED (19 files) |
| Clutch | 28/28 MATCH | N/A | PARTIAL (via playerStateIntegration, not dedicated hook) |

**FWAR extras in code (not in spec):** `charging: 1.3` difficulty, `missed_catch: -0.18` error. Spec update recommended.

### Player Systems (6 systems checked)

| System | Constants | Connectivity | Issues |
|--------|-----------|-------------|--------|
| Mojo | MATCH (0.82/0.90/1.00/1.10/1.18) | CONNECTED (9 files) | `kbl-gotchas.md` says 0.91/1.09 — OUTDATED |
| Fitness | MATCH (1.20/1.00/0.95/0.85/0.70/0.00) | CONNECTED (18 files) | None |
| Salary | MATCH (weights, position mults) | PARTIAL (3 files) | `kbl-gotchas.md` says 3B=1.05 — should be 1.02 |
| Fame | MATCH (formula: baseFame×√LI×playoff) | CONNECTED (6 files) | `kbl-detection-philosophy.md` values outdated |
| Fan Morale | MATCH (7 states, thresholds, impacts) | CONNECTED (4 files) | None |
| Narrative | MATCH (10 personalities, weights) | CONNECTED (2 files) | Morale influence undocumented in spec |

### GameTracker Systems (7 specs checked)

| Spec | Aligned | Mismatched | Missing |
|------|---------|------------|---------|
| MASTER_BASEBALL_RULES | 10 | 3 | 2 |
| RUNNER_ADVANCEMENT | 5 | 1 | 2 |
| INHERITED_RUNNERS | 6 | 2 | 2 |
| PITCH_COUNT_TRACKING | 5 | 3 | 1 |
| PITCHER_STATS_TRACKING | 7 | 3 | 3 |
| SUBSTITUTION_FLOW | 7 | 2 | 3 |
| STAT_TRACKING_ARCHITECTURE | 10 | 5 | 4 |

### Franchise/League (12 specs checked)

| Spec | Status | Notes |
|------|--------|-------|
| FRANCHISE_MODE | PARTIAL | Multi-slot save not implemented; FranchiseSelector orphaned |
| TRADE_SYSTEM | PARTIAL | Engine solid, trade deadline UI not surfaced |
| OFFSEASON_SYSTEM | ALIGNED | All 11 phases match |
| PLAYOFFS_FIGMA | ALIGNED | Full bracket flow |
| LEAGUE_BUILDER_FIGMA | PARTIAL | 7/15 screens; Player Generator + Lineup Editor missing |
| DRAFT_FIGMA | ALIGNED | Farm-first model fully present |
| FREE_AGENCY_FIGMA | ALIGNED | All key screens |
| RETIREMENT_FIGMA | ALIGNED | Probability + ceremony flow |
| AWARDS_CEREMONY_FIGMA | ALIGNED | All 13 award types |
| EOS_RATINGS_FIGMA | PARTIAL | Dual-system coverage uncertain |
| CONTRACTION_EXPANSION_FIGMA | ALIGNED | All 12 screens |
| FINALIZE_ADVANCE_FIGMA | ALIGNED | Covers phases 8-11 inline |

---

## Critical Findings (Require Fixes)

### CRIT-01: completeGameInternal loses MAJ-07 pitcher stats
- **Location:** `useGameState.ts:2789-2814`
- **Issue:** `completeGameInternal` path hardcodes `hitBatters: 0`, `wildPitches: 0`, `basesReachedViaError: 0`, `consecutiveHRsAllowed: 0`, `firstInningRuns: 0`, `basesLoadedWalks: 0` instead of reading from `PitcherGameStats`. The `endGame()` path correctly passes these fields.
- **Impact:** If `completeGameInternal` is used for aggregation, MAJ-07 expanded stats are lost.
- **Fix:** Copy field mapping from `endGame()` path to `completeGameInternal()`.

### CRIT-02: Season aggregation uses placeholder player names
- **Location:** `seasonAggregator.ts:148-149`
- **Issue:** `playerName = playerId` (stores ID as name) and ALL players assigned to away team.
- **Impact:** Season leaderboards show IDs instead of names, wrong team associations.
- **Fix:** Pass player name + team mapping from game state to aggregator.

### CRIT-03: W/L/SV/H/BS not aggregated to season stats
- **Location:** `seasonAggregator.ts:234`
- **Issue:** Pitcher decisions ARE calculated at game end (MAJ-08) but `aggregatePitchingStats()` does NOT increment `wins/losses/saves/holds/blownSaves` in season stats.
- **Fix:** Read decision fields from `PitcherGameStats` during aggregation.

### CRIT-04: Fielding stats hardcoded to 0 in persisted state
- **Location:** `useGameState.ts:2766-2770`
- **Issue:** `completeGameInternal` sets `putouts: 0, assists: 0, fieldingErrors: 0`. Season fielding stats are always zero.
- **Fix:** Pass actual fielding data from game state or event log.

### CRIT-05: runnersAfter always null in AtBatEvent
- **Location:** `useGameState.ts:1215,1511,1728,2025`
- **Issue:** `runnersAfter` set to `{ first: null, second: null, third: null }` with "Updated below" comment but never updated.
- **Fix:** Set `runnersAfter` after runner state is resolved.

---

## Major Findings

### MAJ-01: Substitution validation functions orphaned
- **Location:** `substitution.ts:406,435`
- **Issue:** `validateSubstitution()` and `validateLineup()` exist but are never called from `useGameState.ts:makeSubstitution()`. No-re-entry rule is not enforced.
- **Fix:** Import and call validation before applying substitutions.

### MAJ-02: No pitch count prompt at game end
- **Location:** `useGameState.ts:2884`
- **Issue:** Spec says pitch count capture is mandatory at game end. `endGame()` goes directly to completion without prompting for last active pitcher's pitch count.
- **Fix:** Show pitch count prompt before completing game.

### MAJ-03: HBP/SF/SAC/GIDP not aggregated to season batting
- **Location:** `seasonAggregator.ts:170`
- **Issue:** These counting stats are defined in `PlayerSeasonBatting` but never incremented during aggregation. `PlayerGameStats` tracks `hbp` but not `sf`, `sac`, `gidp`.
- **Fix:** Add these fields to `PlayerGameStats` and aggregate them.

### MAJ-04: Loss decision simplified (may attribute to wrong pitcher)
- **Location:** `useGameState.ts:733-748`
- **Issue:** Uses "highest runsAllowed on losing team" instead of spec's "pitcher of record when winning team takes permanent lead."
- **Fix:** Track lead changes to identify correct losing pitcher. Document as known simplification.

### MAJ-05: FranchiseSelector.tsx orphaned from routes
- **Location:** `src/src_figma/app/pages/FranchiseSelector.tsx`, `src/src_figma/app/routes.tsx`
- **Issue:** File exists but no route points to it.
- **Fix:** Add route or delete if superseded by FranchiseSetup.

---

## Minor Findings

### MIN-01: kbl-gotchas.md has outdated constants
- Mojo: says DOWN=0.91, HIGH=1.09 → should be TENSE=0.90, LOCKED_IN=1.10
- Salary: says 3B=1.05, RF=1.00, LF=1.00 → should be 3B=1.02, RF=0.98, LF=0.95

### MIN-02: kbl-detection-philosophy.md has outdated fame values
- Says Robbery=+1.5, Web Gem=+1, TOOTBLAN=-3
- Code has Robbery=+1, Web Gem=+0.75, TOOTBLAN=-0.5

### MIN-03: FWAR spec missing 2 code-only additions
- `charging: 1.3` difficulty multiplier
- `missed_catch: -0.18` error type

### MIN-04: Narrative MORALE_INFLUENCE and ACCURACY_RATES undocumented
- Code has detailed per-personality morale influence and accuracy rates not in spec

### MIN-05: balks field in PlayerSeasonPitching
- `seasonStorage.ts:162` has `balks: number` but SMB4 has no balks

---

## Summary

| Category | Count |
|----------|-------|
| Specs audited | 25 |
| Total constants/formulas checked | 177 (WAR) + ~100 (player systems) + ~50 (GameTracker) |
| WAR constants matched | 174/177 (3 extras in code) |
| Critical findings | 5 |
| Major findings | 5 |
| Minor findings | 5 |
| Franchise/League: Aligned | 8/12 |
| Franchise/League: Partial | 4/12 |
| Franchise/League: Missing | 0/12 |

### Overall Assessment
The codebase is **substantially aligned** with specs post-Phase-B. All WAR calculations are correct. All player system engines have correct constants and are connected. The main gaps are in the **stat aggregation pipeline** (CRIT-01 through CRIT-05) where data flows correctly during gameplay but is lost or incomplete when persisting to season stats. These 5 critical findings should be fixed before the data pipeline can be considered production-ready.
