# Tier 2.1: GameTracker & Field (Batches 2 and 3) — 16 Items

Key specs: GAME_TRACKING_SPEC.md, FIELDING_PLAY_SPEC.md
Notes from AUTHORITY.md: See AUTHORITY.md §Pre-Resolved User Decisions

---

### GAP-B2-003
- Severity: MAJOR
- Spec: INHERITED_RUNNERS_SPEC.md §6.1
- Code Location: PitcherGameStats in useGameState.ts
- Spec Says: inheritedRunnersStranded field — spec requires tracking stranded count for escape rate + clutch integration
- Code Says: (Not implemented)
- Recommended Fix: PitcherGameStats has inheritedRunners + inheritedRunnersScored but NO inheritedRunnersStranded — cannot calculate escape rate for clutch

---

### GAP-B2-004
- Severity: MAJOR
- Spec: INHERITED_RUNNERS_SPEC.md §7.1
- Code Location: clutchCalculator.ts or new function
- Spec Says: evaluateInheritedRunnerEscape() — clutch credit for relievers stranding inherited runners (full=1.0-2.0, partial=0.5, ×√LI)
- Code Says: (Not implemented)
- Recommended Fix: No inherited runner escape/choke evaluation anywhere in clutchCalculator — no integration between tracker and clutch system

---

### GAP-B2-009
- Severity: MAJOR
- Spec: PITCHER_STATS_TRACKING_SPEC.md §6.3-6.4
- Code Location: calculatePitcherDecisions in useGameState.ts
- Spec Says: Hold/blown save detection logic: enteredInSaveSituation + lead tracking during appearance
- Code Says: (Not implemented)
- Recommended Fix: No hold or blown save calculation — fields exist but never populated

---

### GAP-B2-011
- Severity: MINOR
- Spec: PITCHER_STATS_TRACKING_SPEC.md §6.2
- Code Location: useGameState.ts changePitcher
- Spec Says: leadWhenEntered + enteredInSaveSituation tracking during game
- Code Says: (Not implemented)
- Recommended Fix: No save-situation tracking at pitcher entry — needed for hold/BS detection

---

### GAP-B2-013
- Severity: MINOR
- Spec: PITCHER_STATS_TRACKING_SPEC.md §11.1
- Code Location: useGameState.ts PitcherGameStats interface
- Spec Says: basesReachedViaError field in per-game PitcherGameStats for perfect game detection
- Code Says: (Not implemented)
- Recommended Fix: Field not in useGameState's PitcherGameStats type (exists in aggregator's type)

---

### GAP-B3-005
- Severity: MAJOR
- Spec: CLUTCH_ATTRIBUTION_SPEC.md §6
- Code Location: calculatePlayAttribution or integration layer
- Spec Says: Manager decision inference: auto-detect pitching_change, pinch_hitter, pinch_runner, defensive_sub, IBB; prompt for steal/bunt/squeeze/hit-and-run
- Code Says: (Not implemented)
- Recommended Fix: Manager attribution exists in calculatePlayAttribution (lines 802-817) and getManagerBaseValue (lines 825-842) with all 11 decision types and values, but NO auto-detection logic — depends on caller explicitly providing managerDecision. No prompt system for steal/bunt/squeeze calls

---

### GAP-B3-009
- Severity: MAJOR
- Spec: FIELDING_SYSTEM_SPEC.md §7
- Code Location: fielderInference.ts
- Spec Says: Foul ball handling: 5 foul territory zones (FL-LINE, FL-HOME, FR-LINE, FR-HOME, FOUL-BACK) with distinct fielder priorities per zone
- Code Says: (Not implemented)
- Recommended Fix: No foul territory zones in code at all. Direction type only supports 5 fair territory directions. Foul ball putouts cannot be correctly attributed

---

### GAP-B3-011
- Severity: MAJOR
- Spec: FIELDING_SYSTEM_SPEC.md §19
- Code Location: game.ts FieldingData (partial), fieldingStatsAggregator.ts FieldingPlay (simplified)
- Spec Says: FieldingPlay record interface: 40+ fields including battedBallType, direction (7-way), depth, playType, errorType, errorContext, assists[], dpRole, shiftActive, nutshotEvent, comebackerInjury, robberyAttempted, robberyFailed, infieldFlyRule, groundRuleDouble, badHopEvent, d3kEvent, outsRecorded
- Code Says: (Not implemented)
- Recommended Fix: game.ts FieldingData covers ~70% of fields. fieldingStatsAggregator.ts FieldingPlay only has 9 fields (stripped down). Neither match spec's complete interface. Missing: battedBallType on FieldingData, direction (7-way vs 5-way), depth as required field, grdWallSection, badHopExpectedResult [USER NOTE: Full 40+ field spec, minus shift fields, keep code-only fields zoneId/foulOut/savedRun, align with stat-tracking]

---

### GAP-B3-013
- Severity: MINOR
- Spec: FIELDING_SYSTEM_SPEC.md §17
- Code Location: adaptiveLearningIntegration.ts:289-339
- Spec Says: Adaptive learning algorithm: updateInferenceProbabilities with n≥20 sample threshold, 70%/30% blend (historical/default)
- Code Says: (Not implemented)
- Recommended Fix: IMPLEMENTED in adaptiveLearningIntegration.ts with matching 70/30 blend and n≥20 threshold. However, spec says update is zone-based (type+direction) and code implements it as zone-based too — MATCH. But code stores in localStorage, spec doesn't specify storage location [USER NOTE: Align all fielding tracking with enhanced FieldCanvas, not legacy field zones]

---

### GAP-B3-016
- Severity: MINOR
- Spec: FIELDING_SYSTEM_SPEC.md §13
- Code Location: GameTracker UI
- Spec Says: Bad hop event tracking: toggle on any hit, with fielderAffected, expectedResult, actualResult, notes
- Code Says: (Not implemented)
- Recommended Fix: game.ts FieldingData has badHopEvent boolean but no badHopExpectedResult field (listed in spec §19 FieldingPlay but missing from FieldingData). No UI toggle

---

### GAP-B3-017
- Severity: MINOR
- Spec: FIELDING_SYSTEM_SPEC.md §13
- Code Location: GameTracker UI
- Spec Says: Failed HR robbery tracking: when HR + robberyAttempted + robberyFailed → -1 Fame
- Code Says: (Not implemented)
- Recommended Fix: game.ts FieldingData has robberyAttempted/robberyFailed booleans. StarPlaySubtypePopup.tsx exists. But no automated prompt "Was there an attempted robbery?" on HR result

---

### GAP-B3-025
- Severity: MAJOR
- Spec: FIELD_ZONE_INPUT_SPEC.md §6
- Code Location: fieldZones.ts or new zoneCQ.ts
- Spec Says: Zone-to-CQ integration: getCQTrajectoryFromZone() maps zone depth to CQ inference params (fly ball: infield→shallow, medium→medium, deep→deep; ground ball: infield→medium speed, outfield→hard speed); getContactQualityFromZone() bridges to clutchCalculator; getFoulContactQuality() with per-zone CQ table (F06=0.15, F02/F03=0.20, F01/F04=0.35, F00/F05=0.50)
- Code Says: (Not implemented)
- Recommended Fix: Entire CQ integration layer is unimplemented — zone taps capture location but CQ is derived only from exit type, ignoring zone depth

---

### GAP-B3-026
- Severity: MAJOR
- Spec: FIELD_ZONE_INPUT_SPEC.md §8
- Code Location: fieldZones.ts or new sprayChart.ts
- Spec Says: Spray chart generation: generateSprayPoint(zoneId, ±3 jitter), createSprayChartEntry(zoneId, batterHand, result, exitType), SPRAY_COLORS (HR=red, triple=orange, double=yellow, single=green, out=gray, error=purple), SPRAY_SIZES (HR=12, triple=10, down to out=6)
- Code Says: (Not implemented)
- Recommended Fix: No spray chart generation from zone taps. Zone data captured but never converted to spray chart visualization points

---

### GAP-B3-027
- Severity: MAJOR
- Spec: FIELD_ZONE_INPUT_SPEC.md §8.2
- Code Location: stadiumAnalytics.ts or new stadiumSpray.ts
- Spec Says: Stadium spray chart integration: createStadiumBattedBallEvent(), mapToStadiumSprayZone() (25-zone→7 spray zones), estimateDistance() for HR zones (Z13=330ft, Z14=375ft, Z15=400ft, Z16=375ft, Z17=340ft ±30ft random), recordBattedBallToStadium()
- Code Says: (Not implemented)
- Recommended Fix: No zone-to-stadium analytics pipeline. mapToStadiumSprayZone mapping table and estimateDistance constants not implemented anywhere

---

### MAJ-B3-005
- Severity: MAJOR
- Spec: FIELDING_SYSTEM_SPEC.md §4
- Code Location: fielderInference.ts:61-91
- Spec Says: Spec §4 defines 7 directions (FL, L, LC, C, RC, R, FR) for ALL inference matrices with foul territory fielders (FL: C/3B/P for GB; LF/3B/C for FB; etc.)
- Code Says: Code only has 5 directions (Left, Left-Center, Center, Right-Center, Right) — FL and FR directions completely missing from all 4 matrices
- Recommended Fix: Add FL and FR entries to all inference matrices (GROUND_BALL_INFERENCE, FLY_BALL_INFERENCE, LINE_DRIVE_INFERENCE, POP_FLY_INFERENCE) per spec §4 and §7

---

### MAJ-B3-006
- Severity: MAJOR
- Spec: FIELDING_SYSTEM_SPEC.md §4
- Code Location: fielderInference.ts:85-91
- Spec Says: Spec §4: Pop flies have DEPTH-aware inference (Shallow→C/P, Infield→positional, OF Grass→CF/LF/RF) with priority order (CF>Corner OF>SS>2B>1B/3B>P/C)
- Code Says: Code: POP_FLY_INFERENCE has no depth dimension — only direction, always returns infield positions. "Any + Shallow" (C/P) and "Any + OF Grass" (CF/LF/RF) rows completely missing
- Recommended Fix: Add depth parameter to pop fly inference per spec §4 priority matrix

---

---
## Summary
Total items: 16
