# Step 3: Domain 6 — Remaining Systems (Playoffs, Awards, Fan Morale, Mojo/Fitness, Stadium/Park, Grades, Simulation, Special Events, Figma Offseason)

**Date:** 2026-02-22
**Cross-reference sources:**
- GOSPEL (KBL_UNIFIED_ARCHITECTURE_SPEC v1.2) — full 1807 lines verified via subagent
- PLAYOFF_SYSTEM_SPEC.md (775 lines, full read)
- AWARDS_CEREMONY_FIGMA_SPEC.md (1,206 lines, full read)
- FAN_MORALE_SYSTEM_SPEC.md (1,279 lines, full read)
- MOJO_FITNESS_SYSTEM_SPEC.md (962 lines, full read)
- TRAIT_INTEGRATION_SPEC.md (307 lines, full read)
- PROSPECT_GENERATION_SPEC.md (191 lines, full read)
- STADIUM_ANALYTICS_SPEC.md (1,342 lines, full read)
- ALMANAC_SPEC.md (147 lines, full read)
- PARK_FACTOR_SEED_SPEC.md (142 lines, full read)
- SMB4_PARK_DIMENSIONS.md (29 lines, full read)
- GRADE_ALGORITHM_SPEC.md (521 lines, full read)
- GAME_SIMULATION_SPEC.md (1,040 lines, full read)
- SPECIAL_EVENTS_SPEC.md (1,676 lines, full read)
- ADAPTIVE_STANDARDS_ENGINE_SPEC.md (1,292 lines, full read)
- FEATURE_WISHLIST.md (112 lines, full read)
- CONTRACTION_EXPANSION_FIGMA_SPEC.md (977 lines, full read)
- EOS_RATINGS_FIGMA_SPEC.md (668 lines, full read)
- FINALIZE_ADVANCE_FIGMA_SPEC.md (915 lines, full read)
- PLAYOFFS_FIGMA_SPEC.md (787 lines, full read)
- RETIREMENT_FIGMA_SPEC.md (584 lines, full read)
- TRADE_FIGMA_SPEC.md (659 lines, full read)

**Already-resolved items NOT double-counted:**
C-041 (contraction removal), C-049 (phase count), C-063/C-064 (trait assignment timing/eligibility), C-074 (grade scale — escalated from Domain 5), C-075 (WAR weights)

---

## Contradiction Matrix

| ID | Files | Topic | File A Says | File B Says | Type |
|----|-------|-------|-------------|-------------|------|
| **C-081** | **MOJO_FITNESS_SYSTEM_SPEC line 154 vs GOSPEL §6.1 line 714** | **Simulation integration in mojo/fitness** | **MOJO_FITNESS line 154: "Both systems apply to all games (simulated and user-played)." Lines 755-797: Full simulation integration section with stat multipliers for simulated games.** | **GOSPEL §6.1 line 714: "KBL NEVER calculates mojo or fitness." §10.1 line 1093: "There's no simulation fudging." §10.5 line 1210: "development is tracked through actual gameplay performance, not simulated."** | **CONTRADICTION** |
| **C-082** | **GAME_SIMULATION_SPEC (entire doc) vs GOSPEL §10.1 lines 1093-1098** | **Game simulation existence** | **GAME_SIMULATION_SPEC: 1,040 lines describing full game simulation engine with variance configs, probability matrices, isSimulated flag, season classification (primary/mixed/simulated).** | **GOSPEL §10.1: "KBL franchise mode asks: 'What DID happen?' ... There's no simulation fudging." §10.5 line 1477: "KBL can't simulate development because players are played in SMB4 where ratings are fixed per game."** | **DESIGN_CONFLICT** |
| **C-083** | **CONTRACTION_EXPANSION_FIGMA_SPEC (entire doc, 977 lines) vs JK decision (C-041)** | **Contraction Figma spec still exists** | **977-line Figma spec with 12 screens for contraction/expansion workflow, including contraction rolls, protection selection, museum entries for defunct teams.** | **JK decision: "Remove contraction due to very high architectural risk." OFFSEASON_SYSTEM_SPEC line 33: "Contraction REMOVED from v1."** | **STALE_SPEC** |
| **C-084** | **FAN_MORALE_SYSTEM_SPEC §9 (lines 1045-1068) vs C-041 contraction removal** | **Fan morale → contraction consequences** | **FAN_MORALE line 1047: "Contraction has been REMOVED from v1" — but Section 9 title is "Consequences of Morale" and still describes Franchise Health Warning mechanics that were the REPLACEMENT for contraction risk.** | **Unclear whether "Franchise Health Warning" is the approved replacement mechanic or itself stale. GOSPEL line 824 still says "fan morale changes → contraction risk assessment."** | **AMBIGUITY** |
| **C-085** | **GOSPEL §12.1 line 1403 vs all contraction removal decisions** | **GOSPEL still references contraction** | **GOSPEL line 61: "OffseasonEvents (contraction/expansion/awards/ratings)." Line 66: Offseason Engine produces contraction events. Line 824: "contraction risk assessment." Line 1403: "Phase 4. Contraction — Team record, fan morale, market size."** | **JK decision: contraction removed. OFFSEASON_SYSTEM_SPEC updated. But GOSPEL §12.1 NOT updated.** | **GOSPEL_OUTDATED** |
| **C-086** | **AWARDS_CEREMONY_FIGMA_SPEC lines 1127-1176 vs lines 676** | **Trait assignment: Wheel Spin vs random** | **Line 676: "Winner = random positive trait." Lines 1127-1176 (v1.1): Introduces "Trait Wheel Spin" ceremony with "chemistry-weighted" selection (line 1149).** | **Same file, two contradictory trait assignment methods. Also conflicts with C-064 (EOS spec says chemistry affects POTENCY not eligibility).** | **INTERNAL_INCONSISTENCY** |
| **C-087** | **GRADE_ALGORITHM_SPEC lines 45-62 vs PROSPECT_GENERATION_SPEC lines 56-71 vs SCOUTING_SYSTEM_SPEC §2.1 line 23** | **Grade scale: 3-way conflict** | **GRADE_ALGORITHM: 12 grades (S, A+, A, A-, B+, B, B-, C+, C, C-, D+, D). PROSPECT_GENERATION: 10 grades (A+ through D, no S/D+/D-). SCOUTING: 9 grades (A+, A, B+, B, B-, C+, C, C-, D — no A-/S/D+/D-).** | **Three specs, three different grade scales. Extends C-074 (Domain 5 found LEAGUE_BUILDER uses 13 grades including S and all ±modifiers).** | **CONTRADICTION** |
| **C-088** | **STADIUM_ANALYTICS_SPEC line 1333 vs §3.2-3.6 vs PARK_FACTOR_SEED_SPEC line 19** | **Park factor activation timing** | **STADIUM_ANALYTICS line 1333: "Park factors activate after 40% of the season is played." §3.2-3.6: Confidence-based system (LOW: 10 games, MEDIUM: 30, HIGH: 81) with seed/calculated blending.** | **PARK_FACTOR_SEED line 19: "Park factors are NOT active from Season 1. They activate after sufficient data accumulates" — no specific threshold.** | **AMBIGUITY** |
| **C-089** | **SPECIAL_EVENTS_SPEC line 3 (GOSPEL annotation) vs spec body** | **Modifier Registry replaces hardcoded events** | **GOSPEL annotation (line 3): "§7 Modifier Registry replaces hardcoded events." This means the entire event-by-event architecture described in the 1,676-line spec should now be expressed as modifiers in the registry.** | **Spec body: Still describes events as standalone hardcoded functions (e.g., detectNutShot, detectKilledPitcher) with per-event fame values. No modifier registry integration.** | **STALE_SPEC** |
| **C-090** | **EOS_RATINGS_FIGMA_SPEC lines 224-225** | **Acknowledged calculation error in spec** | **Line 224-225: Designer note acknowledges "Wait... that doesn't match the +3/+3 above. Let me recalculate..." — calculation error left unresolved in spec.** | **N/A — internal quality issue.** | **SPEC_QUALITY** |
| **C-091** | **FEATURE_WISHLIST line 12 vs JK decision** | **Contraction: "deferred" vs "removed"** | **FEATURE_WISHLIST line 12: "Contraction System (Offseason Phase 4) — Why deferred: VERY HIGH architectural risk."** | **JK decision and OFFSEASON_SYSTEM_SPEC: Contraction REMOVED from v1 (not deferred — removed).** | **STALE_REFERENCE** |
| **C-092** | **MOJO_FITNESS_SYSTEM_SPEC §3.1 lines 239-273** | **Juiced state: natural recovery contradiction** | **Line 250: Recovery caps at 100% Fit "through natural recovery." Line 262: Juiced "NOT achieved through normal recovery." Lines 260-273: Lists 4 methods to achieve Juiced, one of which is "5+ days rest" — which IS natural recovery.** | **Internal contradiction: extended rest is natural recovery, but Juiced supposedly can't be achieved through natural recovery.** | **INTERNAL_INCONSISTENCY** |
| **C-093** | **FAN_MORALE_SYSTEM_SPEC §9.3 line 1113 + §2.1 line 186** | **FA Attractiveness double-counting morale** | **Line 1113: FA Attractiveness includes "moraleBonus = (current - 50) * 0.5" at baseline. §9 also applies state-based bonuses (+5 for EUPHORIC, -10 for HOSTILE).** | **Both formulas use fan morale as input — potential double-counting of morale effect on FA attractiveness.** | **INTERNAL_INCONSISTENCY** |
| **C-094** | **CONTRACTION_EXPANSION_FIGMA_SPEC lines 559, 568 vs PERSONALITY_SYSTEM_SPEC §2** | **Personality types in contraction spec** | **CONTRACTION_EXPANSION lines 559: "Personality: Jolly → EGOTISTICAL." Line 568: "Personality: Competitive → DROOPY." References 7 visible SMB4 personality types.** | **Personality system uses these types correctly. BUT the entire contraction spec should be archived — these personality type references are in a dead feature spec.** | **STALE_SPEC** |

---

## Summary by Type

| Type | Count | IDs | Severity |
|------|-------|-----|----------|
| **CONTRADICTION** | 2 | C-081, C-087 | HIGH |
| **DESIGN_CONFLICT** | 1 | C-082 | HIGH — core philosophy question |
| **GOSPEL_OUTDATED** | 1 | C-085 | HIGH — 4 stale contraction refs in GOSPEL |
| **STALE_SPEC** | 3 | C-083, C-089, C-094 | MEDIUM — specs for removed/replaced features |
| **AMBIGUITY** | 2 | C-084, C-088 | MEDIUM |
| **INTERNAL_INCONSISTENCY** | 3 | C-086, C-092, C-093 | MEDIUM |
| **STALE_REFERENCE** | 1 | C-091 | LOW |
| **SPEC_QUALITY** | 1 | C-090 | LOW |

---

## Step 4 Decision Queue (Domain 6)

| Priority | ID | Topic | Core Question for JK |
|----------|-----|-------|---------------------|
| 1 | **C-082** | Game simulation spec existence | GOSPEL says "no simulation." But AI teams need simulated stats (C-048). Does GAME_SIMULATION_SPEC describe the AI-team engine, or is it entirely stale? Should it be archived, kept for AI teams only, or something else? |
| 2 | **C-081** | Mojo/fitness simulation integration | MOJO_FITNESS has a simulation section (lines 755-797). GOSPEL says KBL never calculates mojo/fitness. Remove simulation integration from MOJO_FITNESS? |
| 3 | **C-087** | Grade scale: 4-way conflict | GRADE_ALGORITHM: 12. LEAGUE_BUILDER: 13. PROSPECT_GEN: 10. SCOUTING: 9. What is the authoritative grade scale? |
| 4 | **C-083 + C-085 + C-091 + C-094** | Contraction cleanup sweep | Archive CONTRACTION_EXPANSION_FIGMA_SPEC? Update GOSPEL §12.1? Fix FEATURE_WISHLIST "deferred" → "removed"? |
| 5 | **C-084** | Fan morale consequences post-contraction | Is "Franchise Health Warning" the approved replacement, or does fan morale need a new consequences mechanic? |
| 6 | **C-088** | Park factor activation | 40% of season, confidence-based, or both? |
| 7 | **C-089** | Special Events → Modifier Registry | Is SPECIAL_EVENTS_SPEC stale now that GOSPEL §7 defines a Modifier Registry? Archive, annotate, or rewrite? |
| 8 | **C-086** | Trait assignment ceremony mechanic | Wheel Spin (v1.1) or random assignment (v1.0)? And does chemistry affect eligibility or only potency? |
| 9 | **C-092** | Juiced state recovery rules | Can 5+ days rest achieve Juiced or not? |
| 10 | **C-090** | EOS Figma calculation error | Should someone fix the math in the Figma spec? |

---

## WATCH Items (Not Findings)

| Item | Spec | Note |
|------|------|------|
| ADAPTIVE_STANDARDS_ENGINE line 51 | Salary cap "deferred" | Aligns with C-051 (Domain 3) |
| ALMANAC_SPEC | 147 lines, read-only cross-season reference | 0 contradictions found — clean spec |
| SMB4_PARK_DIMENSIONS | 29 lines, pure reference data | 0 contradictions — reference material only |
| RETIREMENT_FIGMA_SPEC | 584 lines | Aligned with logic specs, 0 contradictions |
| TRADE_FIGMA_SPEC | 659 lines | Aligned with TRADE_SYSTEM_SPEC, 0 contradictions |
| PLAYOFFS_FIGMA_SPEC | 787 lines | Aligned with PLAYOFF_SYSTEM_SPEC, 0 contradictions |
| FINALIZE_ADVANCE_FIGMA_SPEC | 915 lines | Chemistry rating labels (Excellent/Good/Average/Poor/Toxic) are a RATING SCALE, not chemistry types — no conflict |
| EOS_RATINGS_FIGMA_SPEC | 668 lines | Aligned with logic spec except C-090 quality issue |

---

*Domain 6 complete. 14 findings (C-081 through C-094). 10 items in Step 4 decision queue.*
*Total across all 6 domains: 94 findings (C-001 through C-094).*
