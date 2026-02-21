# KBL Phase 2 Fix Queue — Spec Reconciliation Plan
**Date:** 2026-02-21
**Session:** Spec-to-Fix-Queue Reconciliation
**Status:** PLANNING ONLY — no code changes this session

---

## Purpose

The Phase 2 fix queue was built BEFORE the spec sync (20 updates). This document maps every fix queue item against the updated specs to identify: unchanged items, re-scoped items, resolved decisions, new gaps, and obsolete items.

All 20 specs were confirmed on disk (2026-02-20 session). This plan uses them as ground truth.

---

## 1. Reconciliation Table

### FIX-CODE Items

| Finding | Subject | Status | Rationale | Updated Scope |
|---------|---------|--------|-----------|---------------|
| F-098 | Clutch trigger wiring | **UNCHANGED** | CLUTCH_ATTRIBUTION_SPEC unchanged. Wire calculatePlayAttribution from at-bat outcome. | Same as queued |
| F-099 | LI dual-value | **UNCHANGED** | LEVERAGE_INDEX_SPEC unchanged. Replace 6 getBaseOutLI calls with calculateLeverageIndex in useGameState.ts. | Same as queued |
| F-101 Bug A | Fan morale method rename | **UNCHANGED** | FAN_MORALE_SYSTEM_SPEC v1.1 uses calculateFanMorale consistently. Rename is still needed. Prompt contract already written. | Same as queued |
| F-101 Bug B | Hardcoded season/game in fan morale | **UNCHANGED** | Same fix needed — pass dynamic seasonId and gameNumber from context. | Same as queued |
| F-102 Step 6 | Wire standings into post-game pipeline | **UNCHANGED** | STAT_TRACKING_ARCHITECTURE_SPEC unchanged. Standings push needed after aggregateGameToSeason. | Same as queued |
| F-103 | Wire warOrchestrator into processCompletedGame.ts | **UNCHANGED** | BWAR/PWAR specs unchanged. One import + one call to calculateAndPersistSeasonWAR(). | Same as queued |
| F-104a | Wire traitPools.ts into player creation | **UNCHANGED** | TRAIT_INTEGRATION_SPEC confirms traitPools.ts is the canonical catalog. Player creation must use dropdown, not free-text. | Same as queued |
| F-104b | Trait write-back after awards ceremony | **RE-SCOPED** | TRAIT_INTEGRATION_SPEC + AWARDS_CEREMONY_FIGMA_SPEC reveal: write-back is NOT a single batch operation. It must fire event-driven per ceremony screen — after each award step that grants/removes a trait, gated by UI confirmation. The Booger Glove and Bust penalties require user to choose which trait to lose before proceeding. Trait Replacement Modal (shown when player at max 2 traits earns a new one) also requires user selection before write-back. | Per-step write-back triggered by ceremony screen advancement, not end-of-ceremony batch |
| F-110 | Fix hardcoded 'season-1' in mWAR | **UNCHANGED** | MWAR_CALCULATION_SPEC unchanged. Fix 2 lines in init + aggregation calls. | Same as queued |
| F-112 | Fix clearSeasonalStats (localStorage vs IndexedDB) | **RE-SCOPED** | Fix itself unchanged. OFFSEASON_SYSTEM_SPEC **§13.8 (Phase 11: Season Archival)** explicitly states "Clear seasonal stats (career totals preserved)" fires in Phase 11, NOT Phase 1. Current code calls it from Spring Training — wrong. Correct call site = Phase 11 §13.8 Season Archival, triggered after roster lock. | Move clearSeasonalStats call to Phase 11 Season Archival handler; fix localStorage→IndexedDB scan |
| F-118 | Wire agingIntegration into offseason ratings phase | **RE-SCOPED** | EOS_RATINGS_ADJUSTMENT_SPEC confirms ratings adjustments happen BEFORE trait assignment (which is Phase 2 Awards Ceremony). Aging/ratings write-back must fire in Offseason Phase 1 (Season End Processing), not Spring Training. Current code calls it from SpringTrainingFlow.tsx — wrong phase. | Wire agingIntegration.ts into Offseason Phase 1; remove/disconnect SpringTrainingFlow call |

---

### FIX-DECISION Items

| Finding | Subject | Status | Resolution / Rationale |
|---------|---------|--------|----------------------|
| F-101 Bug C | Fan morale localStorage → IndexedDB | **STILL PENDING** | FAN_MORALE_SYSTEM_SPEC v1.1 does not specify a storage backend. JK decision required. |
| F-107 | franchiseId scoping | **DEFERRED (confirmed)** | FRANCHISE_MODE_SPEC §8 explicitly marked "Status: PLANNING - Build out deferred until other features complete" with a dependency checklist. §7.1 defines a migration path (create "Default Franchise," migrate legacy data on first update). Safe to leave as latent debt per Decision 23. No change. |
| F-109 | Career stats derive-on-read vs incremental write | **RESOLVED** | ALMANAC_SPEC §4.3: "reads from career stats tables and season archives... does NOT recalculate — it reads pre-aggregated data." Confirms derive-on-read is the correct model. No separate career table accumulation needed. CareerStats = SUM across PlayerSeasonStats rows. |
| F-113 | Playoff stats write path | **STILL PENDING** | PLAYOFF_SYSTEM_SPEC §10.1 shows PlayoffState.playoffStats structure. §10.2 integration points show initializeSeason and startPlayoffs but NO explicit GameTracker → PLAYOFF_STATS write path. Spec defines the what, not the how. JK decision required: wire GameTracker → playoffStats after each playoff game, or defer? |
| F-114 | Mojo/fitness auto-update + persistence | **RE-SCOPED** | MOJO_FITNESS_SYSTEM_SPEC §1 table: Fitness "Persists across games." §7 defines Between-Game Management with a Team Page editor. The question is not "auto-update or not" — it's "implement between-game state persistence." Current code has zero persistence (useState only). Spec requires: (1) fitness state persists to IndexedDB between games, (2) mojo carryover persists, (3) Team Page editor reads/writes these states. JK decision: scope of Phase 2 implementation (full §7 editor vs bare persistence). |
| F-115 | Salary service time | **RESOLVED** | SALARY_SYSTEM_SPEC formula uses calculateAgeFactor() — age-based, no service time concept anywhere in the 1,118-line spec. Confirms Decision 27: age-based is KBL design. No change needed. |
| F-119 | Relationships — re-enable or orphan | **STILL PENDING** | NARRATIVE_SYSTEM_SPEC §11 summary mentions "relationship triggers (suggested, not forced)" as a narrative system output. The narrative system REFERENCES relationships but does not own them. No spec change resolves whether the full relationshipEngine should be wired or formally orphaned. JK decision required. |
| F-120 | Narrative persistence (recaps to IndexedDB) | **STILL PENDING** | NARRATIVE_SYSTEM_SPEC §4.3 defines NarrativeMemory structure (historicalMoments, activeStorylines, playerArcs, teamArcs) but specifies no storage layer. The spec makes clear persistent memory is required for callbacks (reporters reference past events seasons later). Storage layer decision needed: IndexedDB store, or leave ephemeral? JK decision required. |
| F-120 | headlineEngine — wire or remove | **STILL PENDING** | NARRATIVE_SYSTEM_SPEC describes multiple output channels (League News, Team Feed, Pre/Post Game, In-Game) and specifies headline generation. headlineEngine.ts (FINDING-094: orphaned) is the implementation. Spec implies it should be active. JK decision: wire now or defer with formal orphan status? |
| F-121 | Player dev engine — define model | **RE-SCOPED** | PROSPECT_GENERATION_SPEC (new) defines initial trait/grade/personality assignment for draft classes — this is roster seeding, not player development. Player development (year-over-year ratings growth) is NOT addressed by PROSPECT_GENERATION_SPEC or SCOUTING_SYSTEM_SPEC. F-121 gap (no 10-factor growth model) remains open. OOTP research provides the implementation model (Session 2026-02-19). JK decision: approve OOTP-derived model for implementation? |
| F-122 | Record Book — standard records scope | **RE-SCOPED** | ALMANAC_SPEC §3.2 defines Season Records (best single-season performances) as an Almanac section. §6 implementation priority: Phase 2 = "Season Records (requires season archive queries)." oddityRecordTracker.ts (FINDING-122) tracks unusual events but is a different surface from standard records. Both are in scope per ALMANAC_SPEC but Phase 2 (Season Records) is higher priority than oddity tracking. JK decision: confirm both surfaces are in Phase 2 scope, or split? |

---

## 2. New Gaps (No Fix Queue Coverage)

These spec requirements have no corresponding fix queue item and were not covered during Phase 1 audit.

### GAP-001 — Mode Separation Enforcement
**Spec:** SEPARATED_MODES_ARCHITECTURE.md
**What it requires:** Three distinct application modes (League Builder → Franchise Season → Offseason Workshop) with enforced transitions and separate UI surfaces. Each transition must persist state to IndexedDB before switching.
**Current code:** FranchiseHome.tsx appears to be an always-present hub. Mode enforcement and transition persistence are unknown.
**Action required:** Audit mode transition logic. Does current FranchiseHome implement mode enforcement per §5? Is transitionMode() implemented?
**Priority:** HIGH — architectural; affects all Phase 3 user journeys

### GAP-002 — Park Factor Seeding + Activation
**Spec:** PARK_FACTOR_SEED_SPEC.md + STADIUM_ANALYTICS_SPEC.md
**What it requires:** 23 BillyYank stadiums seeded from SMB4_PARK_DIMENSIONS.md. 3-tier confidence blend:
- LOW (<30 games): 70% seed, 30% calculated
- MEDIUM (30-81 games): 30% seed, 70% calculated
- HIGH (81+ games): 0% seed, 100% calculated
**Current code:** parkFactorDeriver.ts listed in FINDING-050 but wiring status unverified.
**Action required:** Audit whether BILLYYANK_PARK_DATA is seeded and whether 3-tier activation is implemented (not just a flat 70/30 blend).
**Priority:** MEDIUM — affects WAR accuracy; no user impact until park factors are consulted

### GAP-003 — Personality System Population
**Spec:** PERSONALITY_SYSTEM_SPEC.md
**What it requires:** Every player has 1 visible personality type (7 options, weighted) + 4 hidden numeric modifiers (Gaussian μ=50, σ=20). Visible type shown at draft/import. Hidden modifiers drive FA behavior, development speed, morale recovery, captain selection.
**Current code:** Player type has personality field per FINDING-056 context, but whether it's populated and used is unverified.
**Action required:** Audit player data for personality field. Verify League Builder assigns personalities on import. Verify FA/offseason consumes hidden modifiers.
**Priority:** HIGH — personality affects FA (F-115 scope), retirement (Phase 5), narrative

### GAP-004 — Mojo/Fitness Stat Splits Accumulation
**Spec:** MOJO_FITNESS_SYSTEM_SPEC.md §6.2
**What it requires:** Every plate appearance records recordPAWithContext() capturing batterMojo, batterFitness, pitcherMojo, pitcherFitness. updateBattingSplits() and updatePitchingSplits() accumulate stats broken down by mojo/fitness state.
**Current code:** FINDING-088: mojo/fitness wired in GameTracker via usePlayerState. Context is available. But whether recordPAWithContext() is called on every PA and splits are accumulated is unverified.
**Action required:** Audit whether splits accumulation is implemented. This is a data collection gap — splits display requires the data to be captured per-PA.
**Priority:** HIGH — without this, mojo/fitness performance analysis (a key KBL differentiator) is empty

### GAP-005 — Juiced Fame Scrutiny ("Fame Boner" Reduction)
**Spec:** MOJO_FITNESS_SYSTEM_SPEC.md — "Juiced" state reduces fame gains by 50% and subtracts -1 per game played
**Current code:** fameEngine.ts exists and is wired via fameIntegration. Whether it checks fitnessState === 'JUICED' before applying fame is unverified.
**Action required:** Audit fameEngine.ts for Juiced modifier. If absent, add to fix queue.
**Priority:** MEDIUM — correctness gap, not blocking

### GAP-006 — Between-Game Mojo/Fitness Persistence (expands F-114)
**Spec:** MOJO_FITNESS_SYSTEM_SPEC.md §7 — Between-Game Management
**What it requires:** Team Page with per-player mojo/fitness editor, recovery projections, "Apply Recovery" / "Reset All" actions. State persists to IndexedDB between games.
**Current code:** FINDING-114: zero persistence (useState only). F-114 was queued but its scope is now larger than a simple "re-enable" — it's a full between-game persistence + Team Page editor implementation.
**Note:** This is an expanded scope of F-114, not a separate gap. Recording here for planning purposes.
**Priority:** HIGH — without this, mojo/fitness splits (GAP-004) are inaccurate and team management is manual

### GAP-007 — Prospect / Draft Class Generation Engine
**Spec:** PROSPECT_GENERATION_SPEC.md §3 + DRAFT_FIGMA_SPEC.md
**What it requires:** Draft class generation from SMB4 inactive pool + procedural generation. Grade distribution, position distribution, trait assignment, personality assignment. Additionally, DRAFT_FIGMA_SPEC §Key Model Change introduces a **Potential Ceiling** attribute (new field) on all Farm players — shown alongside current grade. Player data model needs this field.
**Current code:** Draft UI likely exists (DRAFT_FIGMA_SPEC referenced). Whether backend generates prospects per spec is unverified. Potential Ceiling field existence in Player type is unverified.
**Action required:** Audit draft class generation + Player/FarmPlayer type for potentialCeiling field.
**Priority:** MEDIUM — needed for multi-season play; Season 1 uses existing 506-player pool

### GAP-008 — Narrative Memory Storage Layer
**Spec:** NARRATIVE_SYSTEM_SPEC.md §4.3 — NarrativeMemory structure (historicalMoments, activeStorylines, playerArcs, teamArcs, upcomingAnniversaries)
**What it requires:** Persistent storage of narrative memory for multi-season callback capability. Reporters reference events from seasons past.
**Current code:** FINDING-120: game recaps generated but not persisted. NarrativeMemory structure is defined in spec but no storage backend specified.
**Note:** Overlaps with F-120 (narrative persistence) but is broader — F-120 is about recaps, this is about the full NarrativeMemory graph.
**Priority:** LOW-MEDIUM — required for multi-season franchise feel; deferred until F-120 resolved

---

## 3. Resolved FIX-DECISION Items

| Finding | Decision | Source |
|---------|----------|--------|
| F-109 | **Derive-on-read** — Almanac reads pre-aggregated career stats from season archives via SUM. No separate career table needed. | ALMANAC_SPEC §4.3 |
| F-115 | **Age-based salary confirmed as KBL design** — no service time concept exists in SALARY_SYSTEM_SPEC. No change needed. | SALARY_SYSTEM_SPEC (full formula, 1,118 lines) |

---

## 4. Revised Priority Order for Phase 2 Execution

### Phase 2A — Stat Pipeline Spine (Unblock Everything)
Execute these first. All downstream features depend on accurate per-game stat writes.

1. **F-103** — Wire warOrchestrator into processCompletedGame.ts (1 import + 1 call)
   - ROUTE: Codex | 5.1 mini | medium
2. **F-102 Step 6** — Wire standings push into aggregateGameToSeason
   - ROUTE: Codex | 5.1 mini | medium
3. **F-099** — Replace 6 getBaseOutLI with calculateLeverageIndex in useGameState.ts
   - ROUTE: Codex | 5.1 mini | high

### Phase 2B — Awards / Traits / Aging (EOS Ceremony Chain)
Run after pipeline spine. These feed the offseason.

4. **F-104a** — Wire traitPools.ts into player creation dropdown
   - ROUTE: Codex | 5.1 mini | high
5. **F-104b (re-scoped)** — Per-step trait write-back triggered by ceremony screen advancement (not batch at end); includes Trait Replacement Modal logic and Booger/Bust penalty selection
   - ROUTE: Codex | 5.3 | high (touches per-step UI state + player record persistence)
6. **F-118 (re-scoped)** — Wire agingIntegration into Offseason Phase 1 Season End Processing (before Phase 2 Awards); remove SpringTrainingFlow call
   - ROUTE: Codex | 5.3 | high (touches offseason phase state)

### Phase 2C — Clutch + Morale (Per-Play Hooks)

7. **F-098** — Wire clutch trigger from at-bat outcome
   - ROUTE: Codex | 5.1 mini | high
8. **F-101 Bug A** — Fan morale method rename (prompt contract in PROMPT_CONTRACTS.md)
   - ROUTE: Codex | 5.1 mini | medium
9. **F-101 Bug B** — Hardcoded season/game in fan morale call
   - ROUTE: Codex | 5.1 mini | medium

### Phase 2D — Cleanup

10. **F-110** — Fix hardcoded 'season-1' in mWAR (2 lines)
    - ROUTE: Codex | 5.1 mini | medium
11. **F-112 (re-scoped)** — Fix clearSeasonalStats + confirm Phase 1 call site
    - ROUTE: Codex | 5.1 mini | high

### After JK Decisions — FIX-DECISION Queue

Ordered by downstream impact once decisions are made:

12. **F-114 (re-scoped)** — Between-game mojo/fitness persistence → IndexedDB + Team Page editor
13. **F-113** — Playoff stats write path
14. **F-101 Bug C** — Fan morale localStorage → IndexedDB migration
15. **F-120** — Narrative persistence (recaps + NarrativeMemory storage decision)
16. **F-119** — Relationships: wire or formally orphan
17. **F-121 (re-scoped)** — Player dev engine: approve OOTP model, then implement
18. **F-122 (re-scoped)** — Record book: ALMANAC §3.2 Season Records + oddityRecordTracker scope

### New Gap Audits (Before Phase 3)

Run these before Phase 3 browser testing so gaps are in the fix queue:

A. **GAP-001** — Mode separation audit (SEPARATED_MODES_ARCHITECTURE.md conformance)
B. **GAP-004** — Mojo/fitness splits accumulation audit (recordPAWithContext wiring)
C. **GAP-003** — Personality system population audit (League Builder → player records)
D. **GAP-002** — Park factor seeding audit (parkFactorDeriver.ts wiring + BillyYank data)
E. **GAP-005** — Juiced fame scrutiny audit (fameEngine.ts fitness check)
F. **GAP-007** — Prospect generation audit (draft class engine per PROSPECT_GENERATION_SPEC)

---

## 5. Items with No Change (Confirmed Unchanged)

These fix items were cross-referenced against their updated specs and confirmed as written:

- F-098: CLUTCH_ATTRIBUTION_SPEC — no changes affect fix scope
- F-099: LEVERAGE_INDEX_SPEC — no changes affect fix scope
- F-101 Bug A/B: FAN_MORALE_SYSTEM_SPEC — simplified formula confirms method rename still needed
- F-102: STAT_TRACKING_ARCHITECTURE_SPEC — standings pipeline gap unchanged
- F-103: BWAR/PWAR specs — warOrchestrator wiring gap unchanged
- F-104a/b: TRAIT_INTEGRATION_SPEC — catalog wiring + write-back gap unchanged
- F-110: MWAR_CALCULATION_SPEC — hardcoded seasonId unchanged

---

## 6a. SPEC CONFLICTS (Require JK Resolution Before Implementation)

Two internal spec conflicts discovered during full spec review. These must be resolved before implementing any code that touches Chemistry or Personality types.

### CONFLICT-001 — Chemistry Type Count
| Spec | Value |
|------|-------|
| LEAGUE_BUILDER_SPEC.md §5.3 (Player data model) | 5 types: Competitive, Spirited, Crafty, Scholarly, Disciplined |
| TRAIT_INTEGRATION_SPEC.md §2.2 (TRAIT_CHEMISTRY_MAP) | 4 types: Spirited, Crafty, Tough, Flashy |

These are incompatible. Code cannot implement trait potency calculations without knowing which set is authoritative.
**JK must decide:** Which chemistry type list is correct?

### CONFLICT-002 — Personality Type Count
| Spec | Value |
|------|-------|
| LEAGUE_BUILDER_SPEC.md §5.3 (Personality type alias) | 11 types: Competitive, Spirited, Crafty, Scholarly, Disciplined, Tough, Relaxed, Egotistical, Jolly, Timid, Droopy |
| PERSONALITY_SYSTEM_SPEC.md (referenced in reconciliation) | 7 types |

LEAGUE_BUILDER_SPEC was updated v1.1 (2026-02-20) and cross-references PERSONALITY_SYSTEM_SPEC, yet the type count differs.
**JK must decide:** Which personality type list is correct — or is the 7-type spec the authoritative count and the LB spec needs updating?

---

## 6. Questions for JK Before Phase 2 Execution

These must be answered before executing the FIX-DECISION queue:

1. **F-109 confirmed:** Accept derive-on-read pattern from ALMANAC_SPEC? (Recommend: YES)
2. **F-115 confirmed:** Accept age-based salary as final design per SALARY_SYSTEM_SPEC? (Recommend: YES)
3. **F-114 re-scoped:** Between-game mojo/fitness persistence — implement full §7 Team Page editor, or bare persistence only (IndexedDB write/read of mojo+fitness per player per game)?
4. **F-113:** Wire GameTracker → playoff stats after each playoff game, or defer to Phase 3?
5. **F-101 Bug C:** Fan morale localStorage → IndexedDB: migrate now as part of Bug A fix, or separate ticket?
6. **F-120:** Narrative persistence — IndexedDB for recaps only, or full NarrativeMemory graph?
7. **F-119:** Relationships — re-enable or formally orphan (mark ORPHANED in SUBSYSTEM_MAP.md)?
8. **F-121:** Approve OOTP-derived 10-factor growth model for player dev engine?
9. **F-122:** Season Records + oddityRecordTracker both in Phase 2 scope, or Season Records only?
10. **GAP-001 → GAP-007:** Run gap audits before Phase 3, or defer to Phase 3 prep?
11. **CONFLICT-001:** Chemistry types — which spec is authoritative? LEAGUE_BUILDER_SPEC (5 types) or TRAIT_INTEGRATION_SPEC (4 types)?
12. **CONFLICT-002:** Personality types — which count is correct? 7 (PERSONALITY_SYSTEM_SPEC) or 11 (LEAGUE_BUILDER_SPEC §5.3)?

---

## 7. OBSOLETE Items

None. All 22 fix queue items (11 FIX-CODE + 11 FIX-DECISION) remain relevant. Two are RESOLVED by spec (F-109, F-115). Two are RE-SCOPED (F-112, F-118). Two are RE-SCOPED and still need JK decisions (F-114, F-121, F-122).

---

## Part 2: Figma Spec Alignment Audit

**Audit date:** 2026-02-21
**Method:** Read each Figma spec and cross-reference against its corresponding system spec. Every spec file personally read; no assertions from prior session summaries.

### Alignment Table

| Figma Spec | Status | Issue | Action Needed |
|---|---|---|---|
| CONTRACTION_EXPANSION_FIGMA_SPEC.md | **OBSOLETE** | Entire spec describes UI for contraction — a feature explicitly removed from OFFSEASON_SYSTEM_SPEC.md. 977-line file with 12-screen flow, none of which map to any current phase. | Archive to `spec-docs/archive/` |
| FINALIZE_ADVANCE_FIGMA_SPEC.md | **STALE** | OFFSEASON_SYSTEM_SPEC §13.8 (Phase 11) added a mandatory signing round for teams below minimum roster before season advance. The Figma spec's Screen 7 (Season Transition Processing) and Screen 8 (Advance Confirmation) have no signing round screen between them. Also: spec's Screen 9 (Post-Advance Welcome) + Screen 11 (Add Game Modal) are correct; the gap is purely the missing signing round interstitial. | Add signing round screen between Screen 7 and Screen 8. Low scope — 1 new screen. |
| TRADE_FIGMA_SPEC.md | **ALIGNED** | Salary totals shown as informational running totals with no matching requirement — consistent with TRADE_SYSTEM_SPEC §4.1 (salary matching explicitly removed). PROPOSE TRADE button active regardless of salary imbalance. Three-way trade layout also present. | No changes needed. |
| EOS_RATINGS_FIGMA_SPEC.md | **STALE** | Two issues: (1) Header labels this "Offseason Phase 3 - EOS Ratings Adjustments" — per the 11-phase structure, ratings adjustments are Part of Phase 1 (Season End Processing), not Phase 3. (2) Zero mention of traits anywhere in the spec — EOS_RATINGS_ADJUSTMENT_SPEC requires that trait performance bonuses factor into the adjustment algorithm. The Manager Distribution screen is present but has no trait bonus row. | Fix phase label to Phase 1. Add trait performance modifier to Manager Distribution screen. |
| RETIREMENT_FIGMA_SPEC.md | **ALIGNED** | Correctly labeled "Offseason Phase 5 - Retirements." Phase 5 is Retirement & Legacy per OFFSEASON_SYSTEM_SPEC §5. Age-weighted dice roll model matches spec. | No changes needed. |
| SEASON_END_FIGMA_SPEC.md | **STALE** | Screen 7 (Phase Complete Summary) checklist includes standings, MVP, mojo reset, archive — but does NOT include ratings adjustments or aging. EOS_RATINGS_ADJUSTMENT_SPEC requires both System A (performance-based rating changes) and System B (salary adjustments) to fire in Phase 1. The Figma spec's Phase 1 summary screen is incomplete. | Add "✓ EOS ratings adjustments applied (N players)" and "✓ Aging applied (N players)" to Screen 7 completed-tasks checklist. |
| LEAGUE_BUILDER_FIGMA_SPEC.md | **STALE** | SEPARATED_MODES_ARCHITECTURE.md §5.1 requires a "Launch Franchise" transition screen at the end of League Builder that calls `transitionMode(FRANCHISE_SEASON)` and persists state to IndexedDB before switching modes. LB-F007 (Players Database) is the last screen in LEAGUE_BUILDER_FIGMA_SPEC — no transition screen exists. | Add LB-F016: Mode Transition screen (final step in League Builder wizard — "Your league is ready. Start the franchise?" → calls transitionMode). |
| SCHEDULE_SYSTEM_FIGMA_SPEC.md | **STALE** | Schedule view shows "2024 SEASON SCHEDULE" and "JULY 12" — real-world year and calendar dates. FRANCHISE_MODE_SPEC §11.3 defines KBL's fictional date system ("April 1, Year 1" format; seasons are Year N not calendar year). Minor but consistent across multiple screens. | Replace all real-year references with fictional date format ("Year 1 Schedule", "Day 93"). |
| SEASON_SETUP_FIGMA_SPEC.md | **STALE** | The wizard covers "New Franchise" and "Playoff Mode" entry but has no framing around SEPARATED_MODES_ARCHITECTURE. The "New Franchise" wizard (SS-F001 → SS-F007) is effectively the Mode 1 (League Builder) → Mode 2 (Franchise Season) transition, but the Figma spec presents it as a standalone wizard rather than a mode switch. "Proceed to Season End" on SS-F007 also lacks the `transitionMode()` confirmation gate required by SEPARATED_MODES_ARCHITECTURE §5.2. | Add mode-separation framing to SS-F001 entry screen. Add transitionMode persistence gate to SS-F007 (Confirm & Start). |
| PLAYOFFS_FIGMA_SPEC.md | **ALIGNED** | "Proceed to Season End → Phase 1" on Screen 6 (Championship) is correct. No playoff stats write-back UI shown — consistent with F-113 still being an open decision. Phase labels absent (Playoffs sits between Regular Season and Offseason, not numbered), which is correct per spec. | No changes needed. |
| DRAFT_FIGMA_SPEC.md | **ALIGNED** | Spec sync already updated this file. Farm-First model correctly shown (all picks → Farm roster, max grade B). Potential Ceiling attribute present in player card wireframe. Grade distribution table present. | No changes needed. |
| FREE_AGENCY_FIGMA_SPEC.md | **ALIGNED** | Spec sync added personality-driven destination cross-reference. Signing dice roll mechanic present. | No changes needed. |
| AWARDS_CEREMONY_FIGMA_SPEC.md | **ALIGNED** | Already confirmed aligned during spec sync session. 13-screen flow with per-step trait write-back gates, Trait Replacement Modal, and Booger/Bust penalty selection. Used as ground truth for F-104b re-scope. | No changes needed. |

---

### Figma Spec Disposition Summary

| Action | Files |
|---|---|
| **Archive** (remove from active spec-docs) | CONTRACTION_EXPANSION_FIGMA_SPEC.md |
| **Rewrite required** (stale, needs targeted updates) | FINALIZE_ADVANCE_FIGMA_SPEC.md, EOS_RATINGS_FIGMA_SPEC.md, SEASON_END_FIGMA_SPEC.md, LEAGUE_BUILDER_FIGMA_SPEC.md, SCHEDULE_SYSTEM_FIGMA_SPEC.md, SEASON_SETUP_FIGMA_SPEC.md |
| **No change needed** (aligned) | TRADE_FIGMA_SPEC.md, RETIREMENT_FIGMA_SPEC.md, PLAYOFFS_FIGMA_SPEC.md, DRAFT_FIGMA_SPEC.md, FREE_AGENCY_FIGMA_SPEC.md, AWARDS_CEREMONY_FIGMA_SPEC.md |

**STALE specs by severity:**

| Priority | Figma Spec | Why Urgent |
|---|---|---|
| HIGH | LEAGUE_BUILDER_FIGMA_SPEC.md | Missing mode transition screen is a core architectural gap; any LB implementation without it won't wire to SEPARATED_MODES_ARCHITECTURE |
| HIGH | SEASON_SETUP_FIGMA_SPEC.md | Missing `transitionMode()` gate; Mode 1→2 transition is a persistence-critical operation |
| MEDIUM | EOS_RATINGS_FIGMA_SPEC.md | Wrong phase label + missing trait modifier affects offseason ceremony implementation |
| MEDIUM | SEASON_END_FIGMA_SPEC.md | Incomplete Phase 1 checklist; ratings/aging omission will cause Phase 1 implementation to miss steps |
| LOW | FINALIZE_ADVANCE_FIGMA_SPEC.md | One missing screen (signing round); low surface area |
| LOW | SCHEDULE_SYSTEM_FIGMA_SPEC.md | Cosmetic date format only; no logic affected |

---

### New Gaps Surfaced by Figma Audit

**GAP-009 — Mode Transition UI (League Builder exit → Franchise Season entry)**
**Spec:** SEPARATED_MODES_ARCHITECTURE §5.1–5.2
**What it requires:** A "Launch Franchise" confirmation screen at end of League Builder. Must call `transitionMode(FRANCHISE_SEASON)`, persist full league state to IndexedDB before mode switch, and provide a clear "League Setup Complete → Start Franchise" CTA.
**Current Figma coverage:** Zero — LEAGUE_BUILDER_FIGMA_SPEC ends at LB-F015 (Rules Editor) with no transition screen.
**Current code coverage:** Unknown — GAP-001 audit (SEPARATED_MODES conformance) will determine this.
**Action:** Add LB-F016 to LEAGUE_BUILDER_FIGMA_SPEC AND verify code has corresponding `transitionMode()` call.
**Priority:** HIGH — blocks all Mode 1→2 flow

**GAP-010 — Fictional Date System in Schedule UI**
**Spec:** FRANCHISE_MODE_SPEC §11.3 (Year N / Day N date format)
**What it requires:** All date displays use "Year 1, Day 93" format, not real calendar dates. SCHEDULE_SYSTEM_FIGMA_SPEC uses "2024" and "JULY 12" throughout.
**Current code coverage:** Unknown — whether the schedule data model uses real dates or fictionals is unverified.
**Action:** Update SCHEDULE_SYSTEM_FIGMA_SPEC date format AND audit schedule data model for date storage format.
**Priority:** LOW — purely cosmetic in UI; only matters if real calendar dates are stored in the data model

---

*Written: 2026-02-21 | Reconciliation session — planning only, no code changes*
