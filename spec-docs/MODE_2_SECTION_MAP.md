# Section Map: MODE_2_FRANCHISE_SEASON_UPDATED.md
**Total lines:** 3450
**Source:** `/sessions/beautiful-kind-davinci/mnt/uploads/MODE_2_FRANCHISE_SEASON_UPDATED.md`

## Pre-Section Content
| Element | Lines | Notes |
|---|---|---|
| Title + Metadata | 1-12 | Copy via sed |
| Table of Contents | 13-44 | Rebuild after assembly |
| Separator | 45 | --- line |

## Main Section Map

| Section | Title | Lines | Line Count | Subsections | Ruling |
|---|---|---|---|---|---|
| §1 | Overview & Mode Definition | 46-116 | 71 | 6 (§1.1-1.6) | SIMPLIFY |
| §2 | Event Model — The Universal Atom | 117-528 | 412 | 5 (§2.1-2.5) | SIMPLIFY |
| §3 | GameTracker — 1-Tap Recording | 529-671 | 143 | 7 (§3.1-3.7) | KEEP |
| §4 | Enrichment System | 672-753 | 82 | 5 (§4.1-4.5) | SIMPLIFY |
| §5 | Between-Play Events | 754-804 | 51 | 6 (§5.1-5.6) | KEEP |
| §6 | Baseball Rules & Logic | 805-939 | 135 | 8 (§6.1-6.8) | KEEP |
| §7 | Substitution System | 940-991 | 52 | 5 (§7.1-7.5) | SIMPLIFY |
| §8 | Stats Pipeline | 992-1123 | 132 | 5 (§8.1-8.5) | SIMPLIFY |
| §9 | Pitcher Stats & Decisions | 1124-1293 | 170 | 8 (§9.1-9.8) | SIMPLIFY |
| §10 | Fielding System | 1294-1443 | 150 | 8 (§10.1-10.8) | SIMPLIFY |
| §11 | WAR System (5 Components) | 1444-1589 | 146 | 7 (§11.0-11.6) | SIMPLIFY |
| §12 | Leverage Index & Win Probability | 1590-1674 | 85 | 5 (§12.1-12.5) | KEEP |
| §13 | Clutch Attribution | 1675-1796 | 122 | 8 (§13.1-13.8) | SIMPLIFY |
| §14 | Mojo & Fitness System | 1797-1960 | 164 | 9 (§14.1-14.11, gaps at 14.3/14.6) | SIMPLIFY |
| §15 | Modifier Registry & Special Events | 1961-2072 | 112 | 5 (§15.1-15.5) | SIMPLIFY |
| §16 | Narrative System | 2073-2264 | 192 | 10 (§16.1-16.10) | KEEP |
| §17 | Dynamic Designations | 2265-2511 | 247 | 14 (§17.1-17.14) | KEEP |
| §18 | Milestone System | 2512-2697 | 186 | 8 (§18.1-18.8) | SIMPLIFY |
| §19 | Fan Favorite & Albatross Trade Mechanics | 2698-2726 | 29 | 2 (§19.1-19.2) | DEFER |
| §20 | Fan Morale System | 2727-2847 | 121 | 9 (§20.1-20.9) | SIMPLIFY |
| §21 | Standings & Playoffs | 2848-2916 | 69 | 5 (§21.1-21.5) | KEEP |
| §22 | Schedule System | 2917-2994 | 78 | 6 (§22.1-22.6) | SIMPLIFY |
| §23 | Adaptive Standards Engine | 2995-3109 | 115 | 6 (§23.1-23.6) | KEEP |
| §24 | Stadium Analytics & Park Factors | 3110-3185 | 76 | 7 (§24.1-24.7) | SIMPLIFY |
| §25 | AI Game Engine (Per C-048 / C-082) | 3186-3278 | 93 | 7 (§25.1-25.7) | DEFER |
| §26 | Franchise Data Flow | 3279-3364 | 86 | 3 (§26.1-26.3) | SIMPLIFY |
| §27 | V2 / Deferred Material | 3365-3384 | 20 | 0 | DEFER |
| §28 | Decision Traceability | 3385-3450 | 66 | 3 (main + 2 sub-tables) | KEEP |

## Ruling Summary (from individual rulings, not summary table)
| Ruling | Count | Sections |
|---|---|---|
| KEEP AS-IS | 9 | §3, §5, §6, §12, §16, §17, §21, §23, §28 |
| SIMPLIFY | 16 | §1, §2, §4, §7, §8, §9, §10, §11, §13, §14, §15, §18, §20, §22, §24, §26 |
| DEFER ENTIRELY | 3 | §19, §25, §27 |

> **⚠️ Discrepancy:** The ruling draft summary table says "10 KEEP / 14 SIMPLIFY" but the actual section-by-section rulings yield **9 KEEP / 16 SIMPLIFY**. The listed section numbers in the summary table are correct — only the counts are wrong.

---

## SIMPLIFY Subsection Detail

### §1 SIMPLIFY — Overview & Mode Definition (lines 46-116)
| Subsection | Title | Lines | Ruling |
|---|---|---|---|
| §1.1 | What Mode 2 Is | 48-53 | KEEP (with caveat) |
| §1.2 | Core Paradigm: Record First, Enrich Later | 54-63 | KEEP |
| §1.3 | Three Event Streams | 64-75 | KEEP |
| §1.4 | What Mode 2 Receives from Mode 1 | 76-88 | KEEP |
| §1.5 | What Mode 2 Produces for Mode 3 | 89-103 | KEEP |
| §1.6 | Competitive Position | 104-116 | **CUT** (marketing material) |

**Deferral tier:** Tier 1 — whole subsection §1.6 removed.

### §2 SIMPLIFY — Event Model (lines 117-528)
| Subsection | Title | Lines | Ruling |
|---|---|---|---|
| §2.1 | AtBatEvent Interface | 119-312 | KEEP |
| §2.2 | BetweenPlayEvent Interface | 313-401 | KEEP |
| §2.3 | TransactionEvent Interface | 402-458 | **SIMPLIFY** (keep 8 of 11 types) |
| §2.4 | GameRecord Interface | 459-518 | KEEP |
| §2.5 | Design Principles | 519-528 | KEEP |

**Deferral tier:** Tier 2 — remove 3 specific TransactionEvent types (dfa, waiver, contract_extension) from §2.3.

### §4 SIMPLIFY — Enrichment System (lines 672-753)
| Subsection | Title | Lines | Ruling |
|---|---|---|---|
| §4.1 | Philosophy | 674-677 | KEEP |
| §4.2 | Play Log Entry Point | 678-693 | KEEP |
| §4.3 | Enrichment Types | 694-732 | KEEP |
| §4.4 | Enrichment Timing | 733-741 | KEEP |
| §4.5 | Enrichment for Positional Tracking | 742-753 | KEEP |

**Deferral tier:** Tier 2 — remove pitch type repertoire filtering references + between-inning enrichment prompts (need line identification within subsections).

### §7 SIMPLIFY — Substitution System (lines 940-991)
| Subsection | Title | Lines | Ruling |
|---|---|---|---|
| §7.1 | Substitution Types | 942-954 | **SIMPLIFY** (keep 5 of 6 + add batting order swap) |
| §7.2 | Entry Points (Per C-002) | 955-960 | KEEP |
| §7.3 | Pinch Runner Critical Rule | 961-964 | KEEP |
| §7.4 | Pitching Change Flow | 965-972 | KEEP |
| §7.5 | Validation Constraints | 973-991 | KEEP |

**Deferral tier:** Tier 2 — remove double_switch from §7.1 type list + add batting order swap.

### §8 SIMPLIFY — Stats Pipeline (lines 992-1123)
| Subsection | Title | Lines | Ruling |
|---|---|---|---|
| §8.1 | Three-Layer Architecture | 994-1002 | KEEP |
| §8.2 | Game-Level Stats | 1003-1033 | KEEP |
| §8.3 | Season-Level Stats | 1034-1101 | KEEP |
| §8.4 | Accumulation Flow | 1102-1109 | KEEP |
| §8.5 | Storage Tiers | 1110-1123 | **SIMPLIFY** (keep tier definitions, defer cost projections) |

**Deferral tier:** Tier 2 — remove storage cost projection lines from §8.5.

### §9 SIMPLIFY — Pitcher Stats & Decisions (lines 1124-1293)
| Subsection | Title | Lines | Ruling |
|---|---|---|---|
| §9.1 | Core Counting Stats | 1126-1156 | KEEP |
| §9.2 | Innings Pitched | 1157-1170 | KEEP |
| §9.3 | First Inning Runs Tracking | 1171-1177 | KEEP |
| §9.4 | Inherited Runners | 1178-1200 | KEEP |
| §9.5 | Win/Loss Decisions | 1201-1208 | KEEP |
| §9.6 | Save Rules | 1209-1229 | KEEP |
| §9.7 | Special Achievements | 1230-1272 | KEEP |
| §9.8 | Pitch Count Tracking | 1273-1293 | **SIMPLIFY** (keep capture + validation, defer estimation system) |

**Deferral tier:** Tier 2 — remove PITCHES_PER_BATTER_ESTIMATE and estimation logic from §9.8.

### §10 SIMPLIFY — Fielding System (lines 1294-1443)
| Subsection | Title | Lines | Ruling |
|---|---|---|---|
| §10.1 | Fielding Chance Rules | 1296-1311 | KEEP |
| §10.2 | Fielder Inference Matrices | 1312-1339 | **SIMPLIFY** (primary fielder only, drop secondary/tertiary tiers) |
| §10.3 | Double Play Chains | 1340-1352 | KEEP |
| §10.4 | Star Play Categories & fWAR Impact | 1353-1369 | KEEP |
| §10.5 | Error Categories | 1370-1381 | KEEP |
| §10.6 | Run Value Constants | 1382-1401 | KEEP |
| §10.7 | Per-Play fWAR Calculation | 1402-1419 | KEEP |
| §10.8 | Fielding Play Record | 1420-1443 | KEEP |

**Deferral tier:** Tier 2 — remove secondary/tertiary probability tiers from §10.2 inference matrices.

### §11 SIMPLIFY — WAR System (lines 1444-1589)
| Subsection | Title | Lines | Ruling |
|---|---|---|---|
| (§11.0) | Section header + Universal Season Length Scaling | 1444-1456 | KEEP |
| §11.1 | bWAR — Batting WAR | 1457-1482 | KEEP |
| §11.2 | pWAR — Pitching WAR | 1483-1509 | KEEP |
| §11.3 | fWAR — Fielding WAR | 1510-1529 | KEEP |
| §11.4 | rWAR — Baserunning WAR | 1530-1543 | KEEP |
| §11.5 | mWAR — Manager WAR | 1544-1579 | KEEP |
| §11.6 | WAR Calibration | 1580-1589 | **DEFER** (multi-season feature) |

**Deferral tier:** Tier 1 — whole subsection §11.6 removed.

### §13 SIMPLIFY — Clutch Attribution (lines 1675-1796)
| Subsection | Title | Lines | Ruling |
|---|---|---|---|
| §13.1 | Core Formula — WPA-Based | 1677-1691 | KEEP |
| §13.2 | Contact Quality System | 1692-1703 | KEEP |
| §13.3 | Attribution by Play Type | 1704-1738 | KEEP |
| §13.4 | Arm Factor (Per C-033) | 1739-1748 | KEEP |
| §13.5 | Manager Decision Clutch | 1749-1753 | KEEP |
| §13.6 | Clutch Trigger Stacking | 1754-1766 | KEEP (**relabel** to "Fame Trigger Stacking") |
| §13.7 | Playoff Context Multipliers | 1767-1779 | KEEP |
| §13.8 | Clutch Stats (WPA-Based) | 1780-1796 | KEEP |

**Deferral tier:** Tier 3 (ambiguous) — §13.6 title relabel + spec correction annotation. No content removal, but the section title changes and a routing note is added. Need to present options to JK.

### §14 SIMPLIFY — Mojo & Fitness System (lines 1797-1960)
| Subsection | Title | Lines | Ruling |
|---|---|---|---|
| (header) | Section header intro | 1797-1804 | KEEP |
| §14.1 | Mojo Levels | 1805-1817 | KEEP |
| §14.2 | Mojo State Changes (User-Observed) | 1818-1826 | KEEP |
| §14.4 | Fitness States | 1827-1839 | KEEP |
| §14.5 | Fitness State Changes (User-Observed) | 1840-1850 | KEEP |
| §14.7 | Juiced State | 1851-1871 | **SIMPLIFY** (engine reads only, no eligibility) |
| §14.8 | Injury Tracking (User-Observed) | 1872-1875 | KEEP |
| §14.9 | Fame Integration | 1876-1901 | KEEP |
| §14.10 | WAR & Clutch Adjustments | 1902-1922 | KEEP |
| §14.11 | Mojo/Fitness Data Schema | 1923-1960 | **SIMPLIFY** (remove juicedCooldown + lastJuicedGame fields) |

**Deferral tiers:** §14.7 = Tier 2 (remove eligibility logic lines), §14.11 = Tier 2 (remove 2 specific fields).

### §15 SIMPLIFY — Modifier Registry & Special Events (lines 1961-2072)
| Subsection | Title | Lines | Ruling |
|---|---|---|---|
| §15.1 | Modifier Structure | 1965-1995 | KEEP |
| §15.2 | Effect System | 1996-2021 | KEEP |
| §15.3 | Registry Evaluation | 2022-2030 | KEEP |
| §15.4 | Example Registry Entries | 2031-2052 | **SIMPLIFY** (strip mojo/fitness-setting examples) |
| §15.5 | Chemistry-Trait Potency System | 2053-2072 | KEEP |

**Deferral tier:** §15.4 = Tier 2 — remove specific examples that violate user-observed-only boundary. Also needs HARD BOUNDARY RULE annotation and SPEC GAP note.

### §18 SIMPLIFY — Milestone System (lines 2512-2697)
| Subsection | Title | Lines | Ruling |
|---|---|---|---|
| §18.1 | Adaptive Threshold Scaling | 2516-2549 | KEEP |
| §18.2 | Single-Game Milestones | 2550-2580 | KEEP |
| §18.3 | Season Milestones | 2581-2605 | KEEP |
| §18.4 | Career Milestones | 2606-2626 | **SIMPLIFY** (fixed floor thresholds only, drop dynamic top-10%) |
| §18.5 | Franchise Firsts & Leaders | 2627-2637 | KEEP |
| §18.6 | Legacy Status Tiers | 2638-2647 | **DEFER** (multi-season feature) |
| §18.7 | Team Milestones | 2648-2660 | KEEP |
| §18.8 | Milestone Data Structures | 2661-2697 | KEEP |

**Deferral tiers:** §18.4 = Tier 2 (remove dynamic top-10% calculation lines), §18.6 = Tier 1 (whole subsection deferred).

### §20 SIMPLIFY — Fan Morale System (lines 2727-2847)
| Subsection | Title | Lines | Ruling |
|---|---|---|---|
| §20.1 | Core Formula | 2729-2742 | **SIMPLIFY** (revised weights: 50/20/10/10/10) |
| §20.2 | Fan Morale Scale | 2743-2764 | KEEP |
| §20.3 | Event Catalog | 2765-2772 | KEEP |
| §20.4 | Contextual Modifiers | 2773-2780 | KEEP |
| §20.5 | Trade Scrutiny System | 2781-2784 | KEEP (ensure simple to code) |
| §20.6 | Morale Decay & Recovery | 2785-2788 | KEEP |
| §20.7 | Franchise Health Warning (Per C-084) | 2789-2805 | KEEP |
| §20.8 | Consequences of Morale | 2806-2813 | KEEP |
| §20.9 | Fan Morale Data Model | 2814-2847 | KEEP |

**Deferral tier:** §20.1 = Tier 2/3 — formula weights change + "rest of roster" factor added. Spec correction, not pure removal. Will present options to JK.

### §22 SIMPLIFY — Schedule System (lines 2917-2994)
| Subsection | Title | Lines | Ruling |
|---|---|---|---|
| §22.1 | Schedule (Per C-079) | 2919-2940 | KEEP (GameStatus enum trimmed) |
| §22.2 | Auto-Pull Logic | 2941-2951 | KEEP |
| §22.3 | SIMULATE Button (Per C-080) | 2952-2959 | **REWRITE** (no SIMULATE, Score/Skip only) |
| §22.4 | Season Classification | 2960-2968 | **DEFER** (meaningless without simulation) |
| §22.5 | Game Increment | 2969-2972 | KEEP |
| §22.6 | Trade Deadline Enforcement | 2973-2994 | KEEP |

**Deferral tiers:** §22.3 = Tier 3 (spec correction rewrites button logic), §22.4 = Tier 1 (whole subsection deferred), §22.1 = Tier 2 (remove SIMULATED from GameStatus enum).

### §24 SIMPLIFY — Stadium Analytics & Park Factors (lines 3110-3185)
| Subsection | Title | Lines | Ruling |
|---|---|---|---|
| §24.1 | Park Factor Structure | 3112-3134 | **SIMPLIFY** (remove exit velocity fields) |
| §24.2 | Activation & Confidence (Per C-088) | 3135-3155 | KEEP |
| §24.3 | Calculation Formula | 3156-3163 | KEEP |
| §24.4 | Seed Park Factors | 3164-3171 | KEEP |
| §24.5 | Spray Chart System | 3172-3175 | **SIMPLIFY** (remove exit velocity field) |
| §24.6 | Stadium Records | 3176-3179 | KEEP |
| §24.7 | WAR Integration | 3180-3185 | KEEP |

**Deferral tier:** §24.1 + §24.5 = Tier 2 — remove exit velocity references from ParkFactors interface and spray chart record.

### §26 SIMPLIFY — Franchise Data Flow (lines 3279-3364)
| Subsection | Title | Lines | Ruling |
|---|---|---|---|
| §26.1 | Event Flow Overview | 3281-3334 | KEEP |
| §26.2 | Storage Tiers | 3335-3342 | **SIMPLIFY** (keep Hot + Warm only, defer Cold) |
| §26.3 | Mode 2 → Mode 3 Handoff | 3343-3364 | **SIMPLIFY** (remove seasonClassification field) |

**Deferral tiers:** §26.2 = Tier 2 (remove Cold tier lines), §26.3 = Tier 2 (remove seasonClassification field).

---

## Line Coverage Check
- Pre-section: 1-45 (45 lines)
- §1-§28: 46-3450 (3405 lines)
- Total: 3450 ✓ (no gaps, no overlaps)

## Estimated v1 Output
- KEEP sections: §3(143) + §5(51) + §6(135) + §12(85) + §16(192) + §17(247) + §21(69) + §23(115) + §28(66) = **1,103 lines**
- SIMPLIFY sections (estimated ~85% kept): ~1,521 × 0.85 = **~1,293 lines**
- DEFER placeholders: 3 × 4 lines = **~12 lines**
- Pre-section + TOC + scope notes: **~60 lines**
- **Estimated total: ~2,468 lines (~72% of original 3,450)**
