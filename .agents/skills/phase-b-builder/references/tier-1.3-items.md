# Tier 1.3: Stats, Milestones & Adaptive Standards — 9 Items

---

### GAP-B1-001
- Severity: MAJOR
- Spec: BWAR_CALCULATION_SPEC.md §9
- Code Location: seasonAggregator.ts or new calibrationService.ts
- Spec Says: Season-end calibration data aggregation pipeline
- Code Says: (Not implemented)
- Recommended Fix: Functions exist but nothing feeds them data

---

### GAP-B1-002
- Severity: MAJOR
- Spec: BWAR_CALCULATION_SPEC.md §9
- Code Location: New calibrationService.ts
- Spec Says: Calibration scheduling + blend logic
- Code Says: (Not implemented)
- Recommended Fix: Config (blend=0.3, minSeasons=2, minPA=10k) not implemented

---

### GAP-B1-004
- Severity: MAJOR
- Spec: PWAR_CALCULATION_SPEC.md §11
- Code Location: pwarCalculator.ts
- Spec Says: Pitcher park factor adjustment (applyPitcherParkFactor, getParkAdjustedERA)
- Code Says: (Not implemented)
- Recommended Fix: Spec'd but not implemented — same issue as bWAR park factors

---

### GAP-B1-005
- Severity: MINOR
- Spec: FWAR_CALCULATION_SPEC.md §8
- Code Location: fwarCalculator.ts calculateErrorValue()
- Spec Says: Missed dive zero-penalty handler
- Code Says: (Not implemented)
- Recommended Fix: Code reduces penalty with 0.7× but spec says 0.0× for missed dives

---

### GAP-B1-006
- Severity: MINOR
- Spec: RWAR_CALCULATION_SPEC.md §5
- Code Location: rwarCalculator.ts calculateUBR()
- Spec Says: Granular tag-up tracking (2B→Home vs 3B→Home)
- Code Says: (Not implemented)
- Recommended Fix: Both get 0.45 so functionally same; just tracking granularity

---

### MAJ-B9-001
- Severity: MAJOR
- Spec: ADAPTIVE_STANDARDS_ENGINE_SPEC.md §3
- Code Location: N/A (missing)
- Spec Says: Spec: AdaptiveStandardsEngine class with IndexedDB persistence for baselines, smoothing algorithm, mid-season estimates
- Code Says: Code: No engine class exists. Static constants only (Phase 1). Phases 2-5 entirely absent
- Recommended Fix: Implement AdaptiveStandardsEngine (or document as future phase)

---

### MAJ-B9-005
- Severity: MAJOR
- Spec: DYNAMIC_DESIGNATIONS_SPEC.md §Fan Favorite
- Code Location: N/A (missing)
- Spec Says: Spec: Fan Favorite + Albatross designation system with detection, UI badges, fame, offseason effects
- Code Says: Code: ENTIRELY MISSING — zero implementation
- Recommended Fix: Implement Fan Favorite/Albatross system

---

### MIN-B1-006
- Severity: MINOR
- Spec: RWAR_CALCULATION_SPEC.md §8
- Code Location: N/A
- Spec Says: RunnerAdvancement schema with advancementType: forced/extra/held/out, couldHaveAdvanced
- Code Says: Simpler AdvancementStats interface without granular classification
- Recommended Fix: Consider for full UBR tracking

---

### MIN-B1-007
- Severity: MINOR
- Spec: MWAR_CALCULATION_SPEC.md §5
- Code Location: mwarCalculator.ts:214
- Spec Says: Pinch hitter failure: K/GIDP = -0.5×√LI, regular outs = -0.3×√LI (tiered)
- Code Says: Single flat value: failure = -0.4 (averages the two tiers)
- Recommended Fix: Add tiered failure values or document as intentional simplification

---
## Summary
Total items: 9
SKIP: None
DUPLICATE: None