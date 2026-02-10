# Tier 1.1: Grade, Salary & Adaptive — 26 Items

---

### GAP-B4-001
- Severity: MAJOR
- Spec: MOJO_FITNESS_SYSTEM_SPEC.md §6.2
- Code Location: mojoEngine.ts or useGameState.ts
- Spec Says: recordPAWithContext() — per-PA Mojo/Fitness snapshot recording + split accumulation. Spec: store batterMojo, batterFitness, pitcherMojo, pitcherFitness with each PA, then call updateBattingSplits/updatePitchingSplits
- Code Says: (Not implemented)
- Recommended Fix: Data structure exists (MojoSplitStats, PlayerMojoSplits) but NO accumulation function. No recordPAWithContext(), updateBattingSplits(), or updatePitchingSplits(). Splits are defined but never populated

---

### GAP-B4-002
- Severity: MINOR
- Spec: MOJO_FITNESS_SYSTEM_SPEC.md §6.1
- Code Location: useGameState.ts PA recording
- Spec Says: Mojo-at-each-PA tracking: spec §6.1 table says "Mojo at each PA" captured "Every plate appearance" in "Per-event record"
- Code Says: (Not implemented)
- Recommended Fix: PA events are recorded but Mojo state at time of PA is not stamped onto the event record. Cannot retrospectively analyze performance-by-Mojo

---

### GAP-B4-003
- Severity: MINOR
- Spec: MOJO_FITNESS_SYSTEM_SPEC.md §7.1
- Code Location: FranchiseHome or TeamManagement page
- Spec Says: Team page Mojo/Fitness editor: between-game management screen with filter, dropdown editors per player, Apply Recovery / Simulate Rest Day / Reset All to Normal buttons
- Code Says: (Not implemented)
- Recommended Fix: No between-game Mojo/Fitness management UI. In-game tracking exists in GameTracker but no between-game editor for team-wide updates

---

### GAP-B4-004
- Severity: MINOR
- Spec: MOJO_FITNESS_SYSTEM_SPEC.md §9.3
- Code Location: PlayerCard component
- Spec Says: Combined player card UI showing Mojo bar + Fitness badge + Juiced warning + stat lines
- Code Says: (Not implemented)
- Recommended Fix: PlayerCard.tsx imports MojoLevel/FitnessState and MOJO_STATES/FITNESS_STATES. Some display exists but not the full combined card layout from spec §9.3 with bars, badges, and Juiced warning inline

---

### GAP-B4-005
- Severity: MAJOR
- Spec: GRADE_ALGORITHM_SPEC.md §Complete Implementation
- Code Location: New gradeEngine.ts
- Spec Says: POSITION_PLAYER_GRADE_THRESHOLDS, PITCHER_GRADE_THRESHOLDS as production constants — no engine file exists
- Code Says: (Not implemented)
- Recommended Fix: Spec provides full implementation code but no engine file was created. All grade logic is either in test helper or hardcoded

---

### GAP-B4-006
- Severity: MAJOR
- Spec: GRADE_ALGORITHM_SPEC.md §Two-Way Players
- Code Location: gradeEngine.ts
- Spec Says: Two-way player valuation: (posRating + pitchRating) × 1.25 premium
- Code Says: (Not implemented)
- Recommended Fix: No two-way player support anywhere in grade or salary system

---

### GAP-B4-007
- Severity: MAJOR
- Spec: GRADE_ALGORITHM_SPEC.md §Prospect Generation
- Code Location: gradeEngine.ts or draftEngine.ts
- Spec Says: generateProspectRatings() with POSITION_STAT_BIAS, weighted target, clamp 15-85, grade verification + adjustment
- Code Says: (Not implemented)
- Recommended Fix: LeagueBuilderDraft.tsx uses random grade from flat array, no weighted rating calculation, no position-specific stat distribution

---

### GAP-B4-008
- Severity: MAJOR
- Spec: GRADE_ALGORITHM_SPEC.md §Prospect Generation
- Code Location: gradeEngine.ts or draftEngine.ts
- Spec Says: generateProspectGrade(round) round-based probability distributions per draft round
- Code Says: (Not implemented)
- Recommended Fix: No round-based probability distribution. Code picks random index from GRADES array uniformly

---

### GAP-B4-009
- Severity: MAJOR
- Spec: GRADE_ALGORITHM_SPEC.md §Prospect Generation
- Code Location: gradeEngine.ts or draftEngine.ts
- Spec Says: generatePotentialCeiling(currentGrade) with grade-specific ceiling probability tables
- Code Says: (Not implemented)
- Recommended Fix: LeagueBuilderDraft.tsx ceiling = GRADES[max(0, gradeIdx - random*3)] — very rough approximation, not matching spec's per-grade probability distributions

---

### GAP-B4-010
- Severity: MAJOR
- Spec: GRADE_ALGORITHM_SPEC.md §Pitcher Prospect Generation
- Code Location: gradeEngine.ts or draftEngine.ts
- Spec Says: generatePitcherProspectRatings() with SP/RP/CP bias (SP: +5ACC, CP: +8VEL/+5JNK/-13ACC, RP: style roll) + generateArsenal(junk)
- Code Says: (Not implemented)
- Recommended Fix: No pitcher prospect generation. DraftFlow.tsx has hardcoded pitcher prospects; LeagueBuilderDraft.tsx generates all prospects with position player logic

---

### GAP-B4-012
- Severity: MAJOR
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Core Calculation
- Code Location: New fanFavoriteEngine.ts
- Spec Says: detectFanFavorite(team, seasonStats, leagueContext) — highest positive Value Delta on team + generateFanFavoriteReason()
- Code Says: (Not implemented)
- Recommended Fix: ENTIRELY UNIMPLEMENTED. calculateTrueValue() returns valueDelta in salaryCalculator.ts but no detectFanFavorite() wrapper exists. No per-team detection, no one-per-team enforcement

---

### GAP-B4-013
- Severity: MAJOR
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Albatross Detection
- Code Location: New fanFavoriteEngine.ts
- Spec Says: detectAlbatross(team, seasonStats, leagueContext) — most negative Value Delta, min salary ≥2× league minimum, threshold ≥25% underperformance
- Code Says: (Not implemented)
- Recommended Fix: ENTIRELY UNIMPLEMENTED. No Albatross detection logic, no minimum salary filter, no underperformance threshold

---

### GAP-B4-014
- Severity: MAJOR
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Detection Timing
- Code Location: fanFavoriteEngine.ts
- Spec Says: getMinGamesForQualification(): 10% of season, min 3 games + DETECTION_TRIGGERS (GAME_END, TRADE_COMPLETED, PLAYER_INJURED)
- Code Says: (Not implemented)
- Recommended Fix: No qualification threshold calculation. No detection trigger system

---

### GAP-B4-015
- Severity: MAJOR
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Fan Morale Impact
- Code Location: fanMoraleEngine.ts integration
- Spec Says: IN_SEASON_HAPPINESS_EFFECTS: FF_BIG_GAME+0.75, FF_CLUTCH+1.0, FF_WALKOFF+2.0, ALB_CLUTCH_FAILURE-0.75, ALB_ERROR-1.0, ALB_BENCHED-0.5. Season scaling ×0.5/1.0/1.25/1.5
- Code Says: (Not implemented)
- Recommended Fix: fanMoraleEngine exists (1300+ lines) but has NO Fan Favorite/Albatross event processing. No special happiness effects for these designations

---

### GAP-B4-016
- Severity: MAJOR
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Roster Transactions
- Code Location: fanMoraleEngine.ts integration
- Spec Says: TRANSACTION_HAPPINESS_EFFECTS: TRADED_FF=-15, RELEASED_FF=-20, FF_RETIRES=-5, FF_FA_LOSS=-10, TRADED_ALB=+10, RELEASED_ALB=+15, ALB_RETIRES=+5, ALB_FA_LOSS=+8
- Code Says: (Not implemented)
- Recommended Fix: No roster transaction happiness effects for Fan Favorite/Albatross

---

### GAP-B4-017
- Severity: MAJOR
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Trade Value
- Code Location: tradeEngine or salaryCalculator.ts
- Spec Says: Trade value modifier: Fan Favorite ×1.15 premium, Albatross ×0.70 discount
- Code Says: (Not implemented)
- Recommended Fix: No trade value adjustment for Fan Favorite/Albatross status

---

### GAP-B4-018
- Severity: MAJOR
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Contract Negotiation
- Code Location: offseason free agency flow
- Spec Says: Free agency demand: FF +15% with 10% loyalty discount for re-sign, Albatross -10% with no loyalty
- Code Says: (Not implemented)
- Recommended Fix: No contract negotiation modifiers for designations

---

### GAP-B4-019
- Severity: MAJOR
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Narrative
- Code Location: narrativeEngine.ts integration
- Spec Says: FAN_FAVORITE_HEADLINES with 4 event categories × 3 templates each + generateFanFavoriteHeadline()
- Code Says: (Not implemented)
- Recommended Fix: narrativeEngine exists but has no Fan Favorite/Albatross headline templates or generation

---

### GAP-B4-020
- Severity: MAJOR
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Fame Events
- Code Location: types/game.ts FameEventType
- Spec Says: FAN_FAVORITE_FAME_EVENTS: FF_NAMED=+2, ALB_NAMED=-1, FF_CLUTCH=+1.5, ALB_FAILURE=-1.5
- Code Says: (Not implemented)
- Recommended Fix: These 4 Fame event types NOT in FameEventType enum (154 entries, none for Fan Favorite/Albatross)

---

### GAP-B4-021
- Severity: MAJOR
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §End of Season
- Code Location: season end processing flow
- Spec Says: processEndOfSeasonFanFavorite() — lock designations, award Fame, record in player history, carry over until 10% of next season
- Code Says: (Not implemented)
- Recommended Fix: No end-of-season Fan Favorite processing

---

### GAP-B4-022
- Severity: MAJOR
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §UI Display
- Code Location: Roster view components
- Spec Says: Value Delta color coding (green-bright/green/gray/orange/red), roster view integration with superscript delta values, FF ⭐ and Albatross 💀 badges
- Code Says: (Not implemented)
- Recommended Fix: No Fan Favorite/Albatross UI display. No value delta color coding

---

### GAP-B4-023
- Severity: MAJOR
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §UI Display
- Code Location: Roster view or player card
- Spec Says: Dynamic "Projected" status (dotted border badge) updates after every game vs "Season-locked" (solid border) at season end
- Code Says: (Not implemented)
- Recommended Fix: No projected vs locked designation display

---

### GAP-B4-024
- Severity: MAJOR
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Key Principles
- Code Location: Season transition logic
- Spec Says: Season carryover: FF and Albatross persist into next season until 10% mark when new projections begin
- Code Says: (Not implemented)
- Recommended Fix: No cross-season carryover mechanism for designations

---

### GAP-B4-025
- Severity: MAJOR
- Spec: FAN_FAVORITE_SYSTEM_SPEC.md §Albatross Detection
- Code Location: fanFavoriteEngine.ts
- Spec Says: generateAlbatrossReason() with 3 severity tiers (≥75% under, ≥50% under, default)
- Code Says: (Not implemented)
- Recommended Fix: No Albatross reason generation

---

### MAJ-B4-001
- Severity: MAJOR
- Spec: MOJO_FITNESS_SYSTEM_SPEC.md §6.2
- Code Location: mojoEngine.ts:802-806 PlayerMojoSplits
- Spec Says: Spec §6.2: MojoFitnessSplits includes battingByMojo, battingByFitness, pitchingByMojo, pitchingByFitness — 4 split categories with full BattingStats/PitchingStats per state
- Code Says: Code PlayerMojoSplits has ONLY battingByMojo (Record<MojoLevel, MojoSplitStats>). Missing: battingByFitness, pitchingByMojo, pitchingByFitness — 3 of 4 split categories absent
- Recommended Fix: Add battingByFitness, pitchingByMojo, pitchingByFitness to PlayerMojoSplits (or create separate FitnessSplits interface)

---

### MAJ-B4-004
- Severity: MAJOR
- Spec: GRADE_ALGORITHM_SPEC.md §Position Player Thresholds
- Code Location: leagueBuilderLogic.test.ts:69-80
- Spec Says: Spec thresholds: S≥80, A+≥78, A≥73, A-≥66, B+≥58, B≥55, B-≥48, C+≥45, C≥38, C-≥35, D+≥30, D≥0 (data-driven from 261 player analysis)
- Code Says: Test helper uses: S≥90, A+≥85, A≥80, A-≥75, B+≥70, B≥65, B-≥60, C+≥55, C≥50, C-≥45, D+≥40 (simple 5-point intervals). Every threshold differs by 8-15 points
- Recommended Fix: Decide authoritative thresholds: spec's are data-driven (better), test's are simpler. Update losing side.

---
## Summary
Total items: 26
SKIP: None
DUPLICATE: None