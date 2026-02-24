# SpecRecon Step 4 — JK Decision Log

**Date:** 2026-02-22
**Status:** COMPLETE — all decisions resolved
**Total decisions:** 42

---

## Decision Format
Each entry: Finding ID → JK Decision → Action Required

---

## Domain 1: GameTracker / Event Model

| ID | Topic | JK Decision | Action |
|----|-------|-------------|--------|
| **C-002** | Pinch hitter entry points | GOSPEL wins — 2 entry points (Lineup card + Diamond tap) | Update SUB_FLOW to document both entry points |
| **C-004** | Balk implementation | Add Balk anyway — manual between-play event even if SMB4 doesn't have balks | Keep Balk in GOSPEL; remove "DO NOT IMPLEMENT" from RUNNER_ADV |
| **C-005** | WP_K/PB_K hybrid types | Keep hybrid types — WP_K and PB_K stay as single AtBatResult values | No spec change needed; update MASTER_BASEBALL_RULES to acknowledge hybrid modeling |
| **C-011** | TP in overflow UI | Add TP to overflow menu | Update GOSPEL §3.1 overflow list to include TP alongside DP |
| **C-017** | GO→DP correction | Manual correction via play log — GOSPEL wins | Remove auto-correction expectation from BUG-003; close bug as "by design" |

---

## Domain 2: Stats Pipeline

| ID | Topic | JK Decision | Action |
|----|-------|-------------|--------|
| **C-025** | Clutch attribution model | CQ weighted by LI — Contact Quality tiers with LI as multiplier | Update CLUTCH_ATTRIBUTION_SPEC to define CQ × LI interaction |
| **C-027** | IBB in FIP | Exclude IBB from FIP (standard sabermetric: BB-IBB) | Update PITCHER_STATS to exclude IBB from FIP BB count |
| **C-033** | armFactor in clutch | Keep armFactor in clutch calculations | Update FWAR to acknowledge armFactor usage in clutch context |
| **C-058** | wOBA Scale value | Use 1.7821 (SMB4-calibrated) | Fix BWAR_CALCULATION_SPEC code block to use 1.7821 |
| **C-061** | fWAR impactMultiplier | Remove from fWAR — runsPerWin already handles scaling | Remove impactMultiplier from FWAR_CALCULATION_SPEC |
| **C-062** | mWAR 70% unattributed | Needs reconciliation mechanism — total WAR should ≈ team wins | Add reconciliation section to MWAR_CALCULATION_SPEC |

---

## Domain 3: Franchise / Offseason / Farm / Salary / Trade

| ID | Topic | JK Decision | Action |
|----|-------|-------------|--------|
| **C-041** | Contraction in GOSPEL | Contraction removed — GOSPEL §12 must be updated | Update GOSPEL §12.1 to remove contraction references |
| **C-042** | Farm prospect performance | Remove recentPerformance — no simulated stats, no proxy | Remove recentPerformance from FarmMoraleFactors in FARM_SYSTEM_SPEC |
| **C-043** | EOS for farm call-ups | Scale threshold with season length (e.g., 20% of gamesPerTeam); rookies mixed with veterans | Add farm call-up section to EOS_RATINGS_ADJUSTMENT_SPEC |
| **C-044** | Fan morale → EOS ratings | Modifier on adjustment formula (e.g., low morale = 0.7× positive adjustments) | Add fan morale modifier to EOS_RATINGS_ADJUSTMENT_SPEC |
| **C-045** | "The Spine" architecture | New Spine spec needed | Create SPINE_ARCHITECTURE_SPEC as top-level architectural document |
| **C-046** | Mid-season narrative salary | Defer to offseason — rating change takes gameplay effect immediately, salary adjusts at offseason recalc | Document in SALARY_SYSTEM_SPEC: mid-season changes deferred |
| **C-047** | Young Player Designation | Random from top-3 farm prospects | Create new designation type in DYNAMIC_DESIGNATIONS_SPEC |
| **C-048** | AI-controlled teams | Keep simulation for AI-only — rename GAME_SIMULATION_SPEC to AI_GAME_ENGINE | Rename spec; add AI-only scope note; update GOSPEL to clarify sim is AI-only |
| **C-049** | Offseason phase count | Expand to 14 phases — restore Farm Reconciliation + Chemistry Rebalancing | Restructure OFFSEASON_SYSTEM_SPEC with 14 phases; resolve internal contradiction |
| **C-050** | DEEP_DIVE outdated | Annotate with supersession notes | Tag outdated sections; preserve valid architectural insights |
| **C-051** | Salary cap | No cap in v1 — soft pressure via fan morale only | Document as explicit "out of v1 scope" in SALARY_SYSTEM_SPEC |

---

## Domain 4: Narrative / Milestones / Designations / Personality / Scouting

| ID | Topic | JK Decision | Action |
|----|-------|-------------|--------|
| **C-052** | Personality model | 4-modifier approach approved (already decided) | GOSPEL stale — update personality section |
| **C-053** | Team Captain formula | Highest combined (Loyalty + Charisma), NO minimum tenure, NO minimum trait value (already decided) | Update both PERSONALITY_SYSTEM_SPEC and DESIGNATIONS |
| **C-054** | Trait visibility on farm | Hidden on farm, revealed at call-up (already decided per Q-001) | Update SCOUTING_SYSTEM_SPEC |
| **C-055** | Establishment multiplier | DESIGNATIONS wins — playoff-context-modified multipliers | Update FAN_FAVORITE_SYSTEM_SPEC to match DESIGNATIONS values |
| **C-056** | Albatross trade discount | DESIGNATIONS wins — 15% discount | Update FAN_FAVORITE_SYSTEM_SPEC from 30% to 15% |
| **C-057+C-067** | Team Captain completeness | Add Captain to DESIGNATIONS data models AND NARRATIVE beat reporter storylines | Add Captain to PlayerDesignationStatus, TeamDesignationState, DesignationChangeEvent; add Captain storylines to NARRATIVE |
| **C-065** | HOF-Caliber WAR scaling | Scale with opportunityFactor (50 → ~40 in 128-game season) | Update MILESTONE_SYSTEM_SPEC §5.2 to apply opportunityFactor |
| **C-066** | Cornerstone FA retention | Add +10% FA retention to DESIGNATIONS | Add to DESIGNATIONS Cornerstone effects + OFFSEASON FA phase |
| **C-068** | INSIDER reporter reveal | Permanent visibility — user sees actual 0-100 value permanently | Add reveal mechanic to PERSONALITY_SYSTEM_SPEC + NARRATIVE_SYSTEM_SPEC |
| **C-069** | Reporter morale influence cap | Per-game cap (e.g., ±3 points per game) | Add cap to NARRATIVE_SYSTEM_SPEC reporter morale section |

---

## Domain 5: League Builder / Season Setup

| ID | Topic | JK Decision | Action |
|----|-------|-------------|--------|
| **C-070** | Personality type union | Fix to 7 types (remove Chemistry types from Personality union) | Update LEAGUE_BUILDER_SPEC |
| **C-071** | Game count presets | Add missing 16 and 128 presets | Update LEAGUE_BUILDER_SPEC gamesPerTeam |
| **C-072** | Contraction toggle | Remove expansionContractionEnabled | Update LEAGUE_BUILDER_SPEC |
| **C-073** | 3-mode architecture | Add Mode 1 role description to LEAGUE_BUILDER body | Update LEAGUE_BUILDER_SPEC |
| **C-074+C-087** | Grade scale | 13 grades authoritative (S through D-) | Align GRADE_ALGORITHM, PROSPECT_GEN, SCOUTING to 13 grades |
| **C-075** | WAR configurable weights | Remove — WAR components sum equally | Remove warCalculationWeights from LEAGUE_BUILDER_SPEC |
| **C-076** | Franchise handoff steps | Add missing salary init, standings init, franchiseId, copy-not-reference | Update SEASON_SETUP_SPEC §8.4 |
| **C-077** | Missing LB-F016 | Add Mode Transition screen to Figma spec | Update LEAGUE_BUILDER_FIGMA_SPEC |
| **C-078** | Fame slider | Replace with FameLevel dropdown (6-tier) | Update LEAGUE_BUILDER_FIGMA_SPEC Player Editor |
| **C-079** | Schedule model | Pre-generated + editable | Update SCHEDULE_SYSTEM_FIGMA to "auto-generated, user-editable" |
| **C-080** | SIMULATE button | Keep for AI games only — user games get SCORE GAME only | Update SCHEDULE_SYSTEM_FIGMA; scope SIMULATE to AI matchups |

---

## Domain 6: Remaining Systems

| ID | Topic | JK Decision | Action |
|----|-------|-------------|--------|
| **C-081** | Mojo/fitness simulation | Remove simulation section — mojo/fitness only for user-played games | Remove lines 755-797 from MOJO_FITNESS_SYSTEM_SPEC |
| **C-082** | Game simulation spec | Keep for AI-only — rename to AI_GAME_ENGINE | Rename GAME_SIMULATION_SPEC; add AI-only scope; update GOSPEL |
| **C-083** | Contraction Figma spec | Archive | Move to spec-docs/archive/ |
| **C-084** | Fan morale consequences | Both mechanisms — Franchise Health Warning (visual) + EOS modifier (mechanical) | Update FAN_MORALE_SYSTEM_SPEC §9; link to EOS modifier |
| **C-085** | GOSPEL contraction refs | Update GOSPEL §12 | Remove 4 contraction references from GOSPEL |
| **C-086** | Trait assignment ceremony | Wheel Spin, potency-only — chemistry affects potency not eligibility | Update AWARDS_CEREMONY_FIGMA_SPEC; align with EOS spec |
| **C-088** | Park factor activation | Confidence-based blending — seed values blend with calculated as data accumulates | Align STADIUM_ANALYTICS and PARK_FACTOR_SEED to confidence-based model |
| **C-089** | Special Events → Modifier Registry | Rewrite as registry entries | Convert SPECIAL_EVENTS_SPEC events into modifier registry format |
| **C-090** | EOS Figma calculation error | Fix the math | Correct the calculation in EOS_RATINGS_FIGMA_SPEC |
| **C-091** | FEATURE_WISHLIST contraction | Fix "deferred" → "removed" | Update FEATURE_WISHLIST |
| **C-092** | Juiced state recovery | Remove rest path — Juiced only via special events/traits/narrative | Remove "5+ days rest" from MOJO_FITNESS Juiced methods |
| **C-093** | FA Attractiveness double-counting | Keep baseline formula only — remove state-based bonuses | Remove state-based FA bonuses from FAN_MORALE_SYSTEM_SPEC §9.3 |
| **C-094** | Contraction personality refs | Archive with parent spec | Archived with CONTRACTION_EXPANSION_FIGMA_SPEC |

---

## Cross-Spec Findings (Documentation Gaps — No Decision Needed)

| ID | Topic | Action |
|----|-------|--------|
| **C-059** | FIP constant calibration undocumented | Document SMB4 FIP constant in BWAR alongside PWAR's existing documentation |
| **C-060** | Fielding chance vs fWAR credit boundary | Define boundary in FWAR_CALCULATION_SPEC |
| **C-063** | Trait assignment timing (traits → ratings or ratings → traits) | Resolved by C-086: Wheel Spin during Awards (Phase 2), ratings in Phase 3 |
| **C-064** | Trait eligibility vs potency | Resolved by C-086: chemistry affects POTENCY only |

---

*Step 4 complete. All 42 decisions logged. Ready for Step 5: spec updates.*
