# Section Map: MODE_3_OFFSEASON_WORKSHOP.md

**Source:** MODE_3_OFFSEASON_WORKSHOP.md
**Total lines:** 1319
**Sections:** 21 numbered + Changelog (22 total `##` headers)

| Section | Title | Lines | Count | Subsections | Ruling |
|---|---|---|---|---|---|
| FM | Front Matter | 1-13 | 13 | — | COPY |
| §1 | Overview & Mode Definition | 14-68 | 55 | 5 (§1.1-1.5) | KEEP (spec correction) |
| §2 | Phase Structure | 69-132 | 64 | 4 (§2.1-2.4) | SIMPLIFY |
| §3 | Phase 1: Season End Processing | 133-192 | 60 | 3 (§3.1-3.3) | KEEP (spec corrections) |
| §4 | Phase 2: Awards Ceremony | 193-312 | 120 | 5 (§4.1-4.5) | SIMPLIFY |
| §5 | Phase 3: EOS Ratings & Salary Recalc #1 | 313-431 | 119 | 6 (§5.1-5.6) | KEEP |
| §6 | Phase 4: Expansion & Stadium Changes | 432-465 | 34 | 4 (§6.1-6.4) | SIMPLIFY |
| §7 | Phase 5: Retirements | 466-551 | 86 | 4 (§7.1-7.4) | SIMPLIFY |
| §8 | Phase 6: Free Agency | 552-643 | 92 | 5 (§8.1-8.5) | SIMPLIFY |
| §9 | Phase 7: Draft | 644-765 | 122 | 6 (§9.1-9.6) | SIMPLIFY |
| §10 | Phase 8: Salary Recalculation #2 | 766-785 | 20 | 3 (§10.1-10.3) | KEEP |
| §11 | Phase 9: Offseason Trades | 786-870 | 85 | 7 (§11.1-11.7) | SIMPLIFY |
| §12 | Phase 10: Salary Recalculation #3 | 871-886 | 16 | 3 (§12.1-12.3) | KEEP |
| §13 | Phase 11: Farm Reconciliation | 887-921 | 35 | 3 (§13.1-13.3) | KEEP |
| §14 | Phase 12: Chemistry Rebalancing | 922-975 | 54 | 3 (§14.1-14.3) | KEEP |
| §15 | Phase 13: Finalize & Advance | 976-1070 | 95 | 3 (§15.1-15.3) | KEEP (spec correction — add Screen 9) |
| §16 | Shared Systems Reference | 1071-1128 | 58 | 6 (§16.1-16.6) | KEEP (spec corrections) |
| §17 | Franchise Type Implications | 1129-1182 | 54 | 4 (§17.1-17.4) | KEEP (spec correction) |
| §18 | Data Architecture | 1183-1221 | 39 | 3 (§18.1-18.3) | KEEP |
| §19 | V2 Material | 1222-1239 | 18 | 0 | KEEP (update table) |
| §20 | Cross-References | 1240-1273 | 34 | 1 (Source Specs) | KEEP |
| §21 | Decision Traceability | 1274-1312 | 39 | 1 (Reconciliation) | KEEP (spec correction) |
| CL | Changelog | 1313-1319 | 7 | — | KEEP |

**Coverage:** 13 + 55 + 64 + 60 + 120 + 119 + 34 + 86 + 92 + 122 + 20 + 85 + 16 + 35 + 54 + 95 + 58 + 54 + 39 + 18 + 34 + 39 + 7 = 1319 ✅

---

## SIMPLIFY Section Detail

### §2 SIMPLIFY (lines 69-132):
| Subsection | Title | Lines | Count |
|---|---|---|---|
| §2.1 | The 13 Phases | 71-90 | 20 |
| §2.2 | Phase Scope | 91-106 | 16 |
| §2.3 | Phase Persistence | 107-122 | 16 |
| §2.4 | Interaction Modes | 123-132 | 10 |

**Ruling:** §2.1 KEEP, §2.2 KEEP with CORRECTION (replace offseasonPhaseScopes), §2.3 KEEP, §2.4 SIMPLIFY (Game Night only, defer Streamlined Mode)

### §4 SIMPLIFY (lines 193-312):
| Subsection | Title | Lines | Count |
|---|---|---|---|
| §4.1 | Purpose | 195-202 | 8 |
| §4.2 | Screen Flow (13 screens) | 203-258 | 56 |
| §4.3 | Trait Wheel Spin Ceremony | 259-277 | 19 |
| §4.4 | Award Voting Data Model | 278-306 | 29 |
| §4.5 | AI Team Award Handling | 307-312 | 6 |

**Ruling:** §4.1 KEEP (remove Team Captain ref), §4.2 KEEP (remove Team Captain screen), §4.3 SIMPLIFY (remove 5% regular player lottery), §4.4 KEEP, §4.5 KEEP

### §6 SIMPLIFY (lines 432-465):
| Subsection | Title | Lines | Count |
|---|---|---|---|
| §6.1 | Purpose | 434-441 | 8 |
| §6.2 | Expansion Draft Flow | 442-449 | 8 |
| §6.3 | Stadium Change Flow | 450-456 | 7 |
| §6.4 | Skip Conditions | 457-465 | 9 |

**Ruling:** §6.1 KEEP, §6.2 KEEP, §6.3 KEEP with CORRECTION (remove custom stadium option), §6.4 KEEP

### §7 SIMPLIFY (lines 466-551):
| Subsection | Title | Lines | Count |
|---|---|---|---|
| §7.1 | Purpose | 468-471 | 4 |
| §7.2 | Screen Flow (7 screens) | 472-499 | 28 |
| §7.3 | Retirement Probability Calculation | 500-530 | 31 |
| §7.4 | Retired Player Database | 531-551 | 21 |

**Ruling:** §7.1 KEEP, §7.2 KEEP, §7.3 KEEP with CORRECTION (three dice roll rounds), §7.4 KEEP with SIMPLIFICATION (remove un-retirement feature)

### §8 SIMPLIFY (lines 552-643):
| Subsection | Title | Lines | Count |
|---|---|---|---|
| §8.1 | Purpose | 554-563 | 10 |
| §8.2 | Screen Flow (6 screens) | 564-616 | 53 |
| §8.3 | Two-Round Structure | 617-622 | 6 |
| §8.4 | Free Agent Pool Signing | 623-626 | 4 |
| §8.5 | Data Operations | 627-643 | 17 |

**Ruling:** §8.1 KEEP, §8.2 KEEP with CORRECTIONS (fallback rule, remove Screen 6 ref), §8.3 KEEP, §8.4 REMOVE ENTIRELY, §8.5 KEEP

### §9 SIMPLIFY (lines 644-765):
| Subsection | Title | Lines | Count |
|---|---|---|---|
| §9.1 | Purpose | 646-653 | 8 |
| §9.2 | Screen Flow (9 screens) | 654-688 | 35 |
| §9.3 | Draft Class Generation | 689-716 | 28 |
| §9.4 | Scouting Accuracy | 717-741 | 25 |
| §9.5 | Draft Rounds and Order | 742-752 | 11 |
| §9.6 | Draft-Round Salary | 753-765 | 13 |

**Ruling:** §9.1 KEEP, §9.2 SIMPLIFY (remove Screen 1, correct draft board visibility), §9.3 KEEP, §9.4 KEEP, §9.5 KEEP, §9.6 KEEP

### §11 SIMPLIFY (lines 786-870):
| Subsection | Title | Lines | Count |
|---|---|---|---|
| §11.1 | Purpose | 788-793 | 6 |
| §11.2 | Screen Flow (9 screens) | 794-837 | 44 |
| §11.3 | Tradeable Assets | 838-845 | 8 |
| §11.4 | Three-Team Trades | 846-849 | 4 |
| §11.5 | Counter-Offers | 850-853 | 4 |
| §11.6 | Player Morale Effects | 854-864 | 11 |
| §11.7 | Trade Veto | 865-870 | 6 |

**Ruling:** §11.1 KEEP, §11.2 SIMPLIFY (remove Screens 5-6, corrections), §11.3 KEEP, §11.4 KEEP, §11.5 KEEP, §11.6 KEEP, §11.7 KEEP
