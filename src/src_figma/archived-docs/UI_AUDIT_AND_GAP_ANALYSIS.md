# KBL TRACKER — UI AUDIT & FUNCTIONAL GAP ANALYSIS
# Date: 2026-02-13
# Scope: GameTracker UI + Franchise Flow UI + Visual Consistency + Feature Wishlist Reconciliation
---

## EXECUTIVE SUMMARY

Three parallel audits were run against the full React codebase covering GameTracker logic, franchise user flows, and visual consistency. Findings were then cross-referenced against CURRENT_STATE.md, FEATURE_WISHLIST.md, GAMETRACKER_BUGS.md, DATA_INTEGRITY_FIX_REPORT.md, IMPLEMENTATION_PLAN.md, and SESSION_LOG.md to separate **already-fixed items** from **genuine remaining gaps**.

| Category | Total Found | Already Fixed | Genuine Remaining |
|----------|-------------|---------------|-------------------|
| GameTracker Logic | 22 issues | 6 | 16 |
| Franchise Flow | 38 issues | 8 | 30 |
| Visual Consistency | 15 categories | 0 | 15 |
| **TOTAL** | **75** | **14** | **61** |

---

## PART 1: GAMETRACKER ISSUES (Reconciled)

### Already Fixed (Per Recent Sessions — Remove from Audit)

These were flagged by the audit but are confirmed resolved:

| Audit Issue | Why It's Fixed | Evidence |
|-------------|---------------|----------|
| GO→DP auto-correction missing | autoCorrectResult wired (Batch 2C) | useGameState.ts:1562-1591 |
| Runner events (WP/PB/SB/CS) with no runners | BUG-013 fixed Jan 25 | hasRunners check added |
| SF auto-correction not working | FO→SF wired (Batch 2C) | autoCorrectResult active |
| Pitch count not tracked | BUG-011 fixed | useGameState.ts pitchCountPrompt |
| SB/CS never recorded | Batch 2B fixed | useWARCalculations.ts:58-59 |
| HBP/SF/SAC/GIDP not tracked | Batch 1B fixed | useGameState.ts:84,88-90 |

### CRITICAL — Remaining GameTracker Issues

**GT-01: D3K Available in OTHER Menu Without Legality Check**
- Severity: CRITICAL
- Location: ActionSelector.tsx (OTHER_ACTIONS array)
- Problem: BatterReachedPopup checks D3K legality (1B empty OR 2 outs) but the OTHER menu path has NO legality check. Two inconsistent paths to the same event.
- Spec says: "D3K should be part of K+WP/PB flow, not standalone" (BASEBALL_LOGIC_AUDIT.md line 273)
- Fix: Remove D3K from OTHER menu. Handle only via K+WP/PB flow or batter-drag popup.

**GT-02: DP/TP Buttons Available With 2 Outs**
- Severity: CRITICAL
- Location: OutcomeButtons.tsx (lines 179-192)
- Problem: DP/TP disabled when no runners but NOT when 2 outs. Double play is impossible with 2 outs.
- Fix: Add `gameContext.outs >= 2` to disable condition.

**GT-03: Forced Runners Can "Hold" at Current Base**
- Severity: CRITICAL
- Location: RunnerOutcomesDisplay.tsx (lines 119-125)
- Problem: `getRunnerDestinations()` includes current base as option. Forced runners CANNOT hold.
- Spec says: "UI must NOT show Hold for forced runners" (BASEBALL_LOGIC_AUDIT.md Section 2.2)
- Related: `isForced()` function still not implemented (CURRENT_STATE.md item #33)

**GT-04: KP/NUT Always Shown Regardless of Pitcher Involvement**
- Severity: HIGH
- Location: OutcomeButtons.tsx (line 306)
- Problem: `fieldingContext?.isPitcherInvolved || true` — the `|| true` makes the condition unconditional. KP/NUT should only appear when pitcher is involved.
- Fix: Remove `|| true` fallback.

### HIGH — Remaining GameTracker Issues

**GT-05: ModifierButtonBar onClick Ignores canTap State**
- Severity: HIGH
- Location: ModifierButtonBar.tsx (line 119)
- Problem: `onModifierTap()` fires even for blocked buttons (e.g., NUT when KP is selected). The visual blocking works but the click handler doesn't check `canTap`.
- Fix: Guard onClick with `if (btn.canTap)`.

**GT-06: Error Flow Inconsistency — Two Different Paths**
- Severity: HIGH
- Location: OutcomeButtons.tsx vs BatterReachedPopup.tsx
- Problem: Selecting E (Error) in OutcomeButtons doesn't trigger ErrorTypePopup. Selecting E in BatterReachedPopup does. Two different UX flows for the same event.
- Fix: Unify error flow — both should collect error type (FIELDING/THROWING/MENTAL).

**GT-07: Modifier Buttons Not Validated Against Play Type**
- Severity: HIGH
- Location: ModifierButtonBar.tsx
- Problem: WG (Web Gem) available for walks/strikeouts. KP/NUT available for outs. No validation that modifiers match play type.
- Fix: Pass play type context and disable incompatible modifiers.

**GT-08: Runner Outcome Cycling Allows Backward Motion**
- Severity: MEDIUM
- Location: RunnerOutcomesDisplay.tsx
- Problem: R2 can cycle to [OUT, 2B, 3B, HOME]. Backward motion (R3→R2) is never validated as illegal.

**GT-09: Balk Still in Codebase Despite "NOT IN SMB4"**
- Severity: MEDIUM — Confirmed partially fixed
- Location: Need to verify ActionSelector.tsx OTHER_ACTIONS
- Note: Dead balks field removed (Batch 3, issue #21). Verify UI button also removed.

**GT-10: Exit Type Requires Double Entry (BUG-006)**
- Severity: MEDIUM — Known, tracked in IMPLEMENTATION_PLAN.md
- Status: TODO (original BUG-006, still open)

**GT-11: No Lineup Access in GameTracker (BUG-009)**
- Severity: MEDIUM — Known, tracked
- Status: TODO

**GT-12: Special Plays Not Logged (BUG-014)**
- Severity: MEDIUM — Known, tracked
- Status: TODO

**GT-13: PostGameSummary Errors Hardcoded to 0**
- Severity: MEDIUM — Known (CURRENT_STATE.md item #28)
- Location: PostGameSummary.tsx:162
- Status: TODO

**GT-14: Mojo/Fitness Not Shown in Scoreboard**
- Severity: MEDIUM — Known (CURRENT_STATE.md item #26)
- Status: TODO

**GT-15: Inning Summary Not Built**
- Severity: LOW — Known (CURRENT_STATE.md item #29)
- Status: NOT BUILT

**GT-16: Fame Value Inconsistency for WG**
- Severity: LOW
- Location: StarPlaySubtypePopup.tsx shows +0.75, playClassifier.ts suggests +1.0
- Fix: Reconcile to single FAME_VALUES source.

---

## PART 2: FRANCHISE FLOW ISSUES (Reconciled)

### Already Fixed (Per Recent Sessions)

| Audit Issue | Why It's Fixed | Evidence |
|-------------|---------------|----------|
| useFranchiseData hardcoded season-1 | Dynamic seasonId wired | SESSION_LOG: "useFranchiseData: dynamic seasonId" |
| League Leaders empty after SIM | Batch SIM uses full pipeline | SESSION_LOG: "batch SIM now uses full pipeline" |
| DraftFlow hardcoded MLB names | Replaced with dynamic userTeamName | SESSION_LOG: "DraftFlow had 2 hardcoded instances" |
| FinalizeAdvanceFlow empty teams | Guarded empty teams array | SESSION_LOG: "guarded against empty teams" |
| FreeAgencyFlow hooks crash | Moved isLoading after all hooks | SESSION_LOG: "FreeAgencyFlow hooks crash" |
| SpringTrainingFlow onComplete not wired | onComplete → handleAdvancePhase | SESSION_LOG: "Wired SpringTrainingFlow onComplete" |
| Season number off-by-2 | Fixed in prev session | PRE_MANUAL_CLEANUP #8 |
| Offseason 11/11 phases working | All browser-verified | PRE_MANUAL_CLEANUP #5 |

### CRITICAL — Remaining Franchise Issues

**FR-01: Missing useSeasonData Hook**
- Severity: CRITICAL
- Location: useFranchiseData.ts line 11
- Problem: Imports `useSeasonData` from `../../hooks/useSeasonData` — this file does NOT exist. This will crash FranchiseHome at runtime.
- Note: This may be in the Figma codebase copy only, not the live `src/` codebase. **Verify against actual running app.**

**FR-02: useSeasonStats Signature Mismatch**
- Severity: CRITICAL
- Location: useFranchiseData.ts line 290
- Problem: Calls `useSeasonStats(seasonId)` with parameter, but hook takes no parameters.
- Same caveat as FR-01 — verify against running app.

**FR-03: Leaderboard Method Mismatch**
- Severity: CRITICAL
- Location: useFranchiseData.ts lines 311-332
- Problem: Expects `seasonStats.getBattingLeaders()` method that doesn't exist on the hook return type.
- Same caveat — the Figma copy may differ from the live src.

### HIGH — Remaining Franchise Issues

**FR-04: Season Phase Never Returns to "regular" After Offseason**
- Severity: HIGH
- Location: FranchiseHome.tsx (handleStartNewSeason)
- Problem: `setSeasonPhase("offseason")` is set at line 228, but `handleStartNewSeason` never calls `setSeasonPhase("regular")`. UI stays stuck in offseason view.
- Fix: Add `setSeasonPhase("regular")` in handleStartNewSeason.

**FR-05: PostGameSummary Navigation State Fragile**
- Severity: HIGH
- Location: PostGameSummary.tsx lines 30-37
- Problem: Relies on `location.state` for game mode and franchiseId. If state is lost (page refresh, manual URL), defaults to `franchiseId: '1'` which may not exist.

**FR-06: Exhibition Games Not Persisted**
- Severity: HIGH
- Location: ExhibitionGame.tsx
- Problem: Exhibition games are ephemeral — stats lost on refresh. Need either explicit "not saved" warning or persistence path.

**FR-07: Season Metadata Defaults Hardcoded**
- Severity: HIGH
- Location: useFranchiseData.ts lines 481-485
- Problem: Defaults to 64 games/season and Season 1 when metadata is null. Should read from franchiseConfig.

**FR-08: Playoff Bracket Has No Tie-Breaking Logic**
- Severity: MEDIUM
- Location: WorldSeries.tsx, PlayoffSeedingFlow.tsx
- Problem: If two teams have identical records, seeding is ambiguous. No head-to-head or divisional tiebreaker.

### MEDIUM — Remaining Franchise Issues

**FR-09: BatchOperationOverlay Imported But Never Rendered**
- Severity: MEDIUM (dead code)
- Location: FranchiseHome.tsx line 25

**FR-10: SimulationOverlay Imported But Never Rendered**
- Severity: MEDIUM (dead code)
- Location: FranchiseHome.tsx line 24
- Note: SIM functionality works via other path — this import is just dead.

**FR-11: AddGameModal Has No Schedule Validation**
- Severity: MEDIUM
- Location: AddGameModal.tsx
- Problem: Can add conflicting games (same team, same date; exceeding total game count).

**FR-12: RetirementFlow / FreeAgencyFlow No Cancel/Back Button**
- Severity: MEDIUM
- Problem: Once entered, offseason sub-flows may lack a way to exit without completing.

**FR-13: DraftFlow Lacks Completion Validation**
- Severity: MEDIUM
- Problem: Can advance past draft without filling all picks. Related to FinalizeAdvanceFlow 32-player requirement (known constraint).

**FR-14: ContractionExpansionFlow Doesn't Update League Structure**
- Severity: MEDIUM
- Note: Currently a placeholder ("coming soon"), so not actively breaking anything.

**FR-15: offseasonState.currentPhase Can Advance Beyond Array**
- Severity: MEDIUM
- Location: FranchiseHome.tsx handleAdvancePhase
- Problem: No bounds check on nextPhase — if called after last phase, sets undefined tab.

**FR-16: No Automatic Season→Offseason Transition**
- Severity: MEDIUM
- Problem: Spec implies auto-transition when last game played. Currently requires manual "Begin Offseason" button click.

**FR-17: WorldSeries HISTORY Tab Never Populated**
- Severity: LOW
- Related to Museum data pipeline not being built yet (CURRENT_STATE.md item #10, deferred).

**FR-18: No Error Boundary for FranchiseHome**
- Severity: LOW
- Problem: If useFranchiseData crashes, whole page white-screens.

**FR-19: Standings Fallback Is Arbitrary 2x2 Split**
- Severity: LOW
- Problem: When leagueTemplate missing, splits teams arbitrarily rather than showing error.

---

## PART 3: VISUAL CONSISTENCY ISSUES

### HIGH Severity

**VIS-01: Pervasive Hardcoded Hex Colors Bypassing Theme**
- 50+ unique hardcoded hex values across components instead of using CSS variables from theme.css
- Examples: `#C4A853` (gold), `#2E7D32` (green), `#C62828` (red), `#4CAF50`, `#2196F3`
- Impact: Theme changes require editing every component. Dark mode impossible.

**VIS-02: Button Styling Has 4+ Distinct Patterns**
- OutcomeButtons: `rounded-lg`, `border-2`, `shadow-[3px_3px_0px]`
- ActionSelector: `rounded-lg`, `border-3`, `shadow-[4px_4px_0px]`
- ModifierButtonBar: custom `getButtonStyles()` function
- LineupCard: yet another pattern
- No shared button component or design tokens.

### MEDIUM Severity

**VIS-03: Border Radius Contradicts Theme**
- theme.css sets `--radius: 0px` (SNES aesthetic) but components use `rounded-lg`, `rounded-md` throughout.

**VIS-04: Typography Uses Arbitrary Pixel Values**
- `text-[7px]`, `text-[8px]`, `text-[9px]`, `text-[10px]`, `text-[12px]` — not Tailwind scale.
- Same-level headings use different sizes across components.

**VIS-05: Inconsistent Spacing Patterns**
- Similar layouts use gap-1.5, gap-2, gap-3, gap-4 inconsistently.
- Container padding: p-2, p-3, p-4, p-6 for similar components.

**VIS-06: Dark Background Palette Not Standardized**
- Primary backgrounds: `#1a1a1a`, `#333`, `#2a2a2a`, `#1a3020`
- Secondary backgrounds: `#2F4F2F`, `#3a3a3a`, `#4A2020`
- No consistent surface color hierarchy.

**VIS-07: Secondary Text Colors Inconsistent**
- Labels use `text-[#666]`, `text-[#555]`, `text-[#888]` interchangeably.

**VIS-08: Border Thickness Ranges From 2 to 5**
- `border-2`, `border-[3px]`, `border-[4px]`, `border-[5px]` for similar elements.

**VIS-09: Shadow Specifications Vary Per Component**
- Shadows range from `2px 2px 0px 0.3` to `8px 8px 0px 0.5`.

**VIS-10: Modal/Popup Backdrop Opacity Inconsistent**
- LineupCard: `bg-black/50`, TeamRoster: `bg-black/70`.

**VIS-11: Inline Style Attributes Instead of Tailwind Classes**
- TeamRoster, TeamHubContent use `style={{ backgroundColor: ... }}` and `style={{ textShadow: ... }}`.

**VIS-12: Responsive Breakpoints Missing or Inconsistent**
- Some components use `md:grid-cols-3`, others hardcode grid without responsive classes.

---

## PART 4: FEATURE WISHLIST GAP ANALYSIS

### What Wishlist Items Would Close the Most Functional Gaps?

Cross-referencing the 123 FEATURE_WISHLIST items against the 61 audit findings to identify which wishlist items would simultaneously fix audit issues:

#### TIER 1: Wishlist Items That Fix Multiple Audit Issues (Do These First)

| Wishlist Item | Priority | Audit Issues It Closes | Impact |
|---------------|----------|------------------------|--------|
| **Total WAR Aggregation** | HIGH | FR-03 (leaderboard methods), orphaned fWAR/rWAR display | Unblocks the full WAR display pipeline |
| **Aging Engine** | HIGH | FR-07 (season metadata defaults), multi-season career progression | Core franchise loop depends on this |
| **isForced() validation** | HIGH (not in wishlist, but in BASEBALL_LOGIC_AUDIT) | GT-03 (forced runners hold), GT-08 (backward motion) | Prevents impossible baseball states |
| **Adaptive Learning System** | HIGH | GT-04 (KP/NUT context), GT-07 (modifier validation) | Makes fielding inference context-aware |
| **PlayerFieldingStats Aggregation** | HIGH | GT-12 (special plays not logged), fielding data persistence | Entire fielding pipeline depends on this |

#### TIER 2: Wishlist Items That Fix Specific Audit Issues

| Wishlist Item | Priority | Audit Issue It Closes | Notes |
|---------------|----------|-----------------------|-------|
| **Expected WAR from Salary** | HIGH | Salary engine blocked on ratings data (IMPL_PLAN #5) | Unblocks value assessment features |
| **Fan Morale Happiness System** | HIGH | CURRENT_STATE #17 (no visible UI yet) | Engine built, needs UI display |
| **Mental Error Type** | HIGH | GT-06 (error flow inconsistency) | Missing from UI, highest fWAR penalty |
| **Spray Chart Data Collection** | MEDIUM | Fielding data persistence gap | Needed for future spray chart UI |
| **Hit Streak Fame Triggers** | MEDIUM | Fame event logging gaps | +1/+2 Fame not implemented |
| **Mojo Splits for Pitching** | MEDIUM | GT-14 (mojo/fitness not in scoreboard) | Broader mojo display issue |
| **Fitness Value Thresholds** | MEDIUM | Spec says 40/60/80, code uses 50/70/90 | Data inconsistency |

#### TIER 3: Wishlist Items That Are Pure Feature Adds (No Audit Issue)

These don't fix any existing bug but add new functionality:

| System | Items | MVP Relevance |
|--------|-------|---------------|
| Relationships/Chemistry (10 HIGH + 8 MED + 6 LOW) | 24 items | ENTIRE system missing. Low MVP priority but massive immersion feature. |
| Fan Morale/Narrative (17 MED + 17 LOW) | 34 items | Engine exists, mostly needs story templates and event types. |
| Fielding details (7 MED + 5 LOW) | 12 items | Refinements to working system. |
| Fame refinements (5 MED + 5 LOW) | 10 items | Tuning, not structural. |
| WAR refinements (7 MED + 6 LOW) | 13 items | Edge case accuracy improvements. |
| Salary/Mojo/Fitness (8 MED + 10 LOW) | 18 items | Mostly display and tuning. |

---

## PART 5: RECOMMENDED PRIORITY ORDER

### Phase A: Fix What's Broken (Audit Blockers)
These prevent correct gameplay or crash the app:

1. **GT-01**: Remove D3K from OTHER menu (30 min)
2. **GT-02**: Disable DP/TP at 2 outs (15 min)
3. **GT-03 + isForced()**: Implement isForced() and hide Hold for forced runners (2 hrs)
4. **GT-04**: Fix KP/NUT `|| true` (5 min)
5. **GT-05**: Guard ModifierButtonBar onClick (15 min)
6. **FR-04**: Add `setSeasonPhase("regular")` in handleStartNewSeason (5 min)
7. **FR-01/02/03**: Verify import paths against running `src/` (may be Figma copy issue only)

### Phase B: Close Known Gaps (IMPLEMENTATION_PLAN Remaining)
Already tracked in IMPLEMENTATION_PLAN.md:

1. Wire Clutch Calculator to GameTracker (SMALL)
2. Add fWAR/rWAR display columns (SMALL)
3. Mojo/Fitness scoreboard display (MEDIUM)
4. PostGameSummary fixes — errors, box score (SMALL)
5. Exit type double-entry UX — BUG-006 (MEDIUM)
6. Lineup access modal — BUG-009 (MEDIUM)
7. Special plays logging — BUG-014 (MEDIUM)
8. Milestone Watch UI (MEDIUM)
9. Inning summary component (MEDIUM)

### Phase C: Wishlist Items That Close Functional Gaps
New work from FEATURE_WISHLIST that fixes audit findings:

1. **Total WAR Aggregation** — unblocks full WAR display
2. **Aging Engine** — required for multi-season franchise viability
3. **PlayerFieldingStats Aggregation** — completes fielding pipeline
4. **Mental Error Type in UI** — completes error flow
5. **Fan Morale UI Display** — engine built, just needs UI

### Phase D: Visual Consistency Pass
Create a design token system:

1. Extract all hardcoded colors into CSS variables
2. Create shared button component with variants
3. Standardize spacing scale (pick: gap-2/p-3 or gap-3/p-4)
4. Fix border-radius to match theme (0px SNES or consistent rounded-lg)
5. Standardize typography scale (use Tailwind classes, not px)

### Phase E: Post-MVP Feature Adds
Relationships/Chemistry, advanced narratives, adaptive learning — large systems with no existing audit issue.

---

## APPENDIX: ISSUES CROSS-REFERENCE

| Issue ID | Category | Severity | Tracked In | Status |
|----------|----------|----------|------------|--------|
| GT-01 | GameTracker | CRIT | NEW | Open |
| GT-02 | GameTracker | CRIT | NEW | Open |
| GT-03 | GameTracker | CRIT | BASEBALL_LOGIC_AUDIT | Open |
| GT-04 | GameTracker | HIGH | NEW | Open |
| GT-05 | GameTracker | HIGH | NEW | Open |
| GT-06 | GameTracker | HIGH | NEW | Open |
| GT-07 | GameTracker | HIGH | NEW | Open |
| GT-08 | GameTracker | MED | NEW | Open |
| GT-09 | GameTracker | MED | Batch 3 partial | Verify |
| GT-10 | GameTracker | MED | BUG-006 | TODO |
| GT-11 | GameTracker | MED | BUG-009 | TODO |
| GT-12 | GameTracker | MED | BUG-014 | TODO |
| GT-13 | GameTracker | MED | CURRENT_STATE #28 | TODO |
| GT-14 | GameTracker | MED | CURRENT_STATE #26 | TODO |
| GT-15 | GameTracker | LOW | CURRENT_STATE #29 | NOT BUILT |
| GT-16 | GameTracker | LOW | NEW | Open |
| FR-01 | Franchise | CRIT | NEW | Verify |
| FR-02 | Franchise | CRIT | NEW | Verify |
| FR-03 | Franchise | CRIT | NEW | Verify |
| FR-04 | Franchise | HIGH | NEW | Open |
| FR-05 | Franchise | HIGH | NEW | Open |
| FR-06 | Franchise | HIGH | NEW | Open |
| FR-07 | Franchise | HIGH | NEW | Open |
| FR-08 | Franchise | MED | NEW | Open |
| FR-09 | Franchise | MED | NEW (dead code) | Open |
| FR-10 | Franchise | MED | NEW (dead code) | Open |
| FR-11 | Franchise | MED | NEW | Open |
| FR-12 | Franchise | MED | NEW | Open |
| FR-13 | Franchise | MED | Known constraint | Open |
| FR-14 | Franchise | MED | Placeholder | Deferred |
| FR-15 | Franchise | MED | NEW | Open |
| FR-16 | Franchise | MED | NEW | Open |
| FR-17 | Franchise | LOW | CURRENT_STATE #10 | Deferred |
| FR-18 | Franchise | LOW | NEW | Open |
| FR-19 | Franchise | LOW | NEW | Open |
| VIS-01 through VIS-12 | Visual | MED-HIGH | NEW | Open |

---

*Generated 2026-02-13 by parallel audit agents. Reconciled against 7 project documents.*
