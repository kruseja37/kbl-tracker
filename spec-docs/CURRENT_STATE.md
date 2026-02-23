# CURRENT_STATE.md

**Last Updated:** 2026-02-23
**Phase:** Gospel Consolidation — ALL 5 GOSPELS DRAFTED

---

## Current Status

All five gospel documents are drafted. The consolidation of 71+ fragmented spec documents into 5 canonical gospels is complete at the drafting level. Three documents are committed (Mode 1, Mode 3), two are pending commit (Mode 2, Almanac, Spine Architecture).

## Next Action

**Commit all pending gospel documents** (requires removing `.git/index.lock` first):
```
spec-docs/MODE_2_FRANCHISE_SEASON.md (new, 3,269 lines)
spec-docs/ALMANAC.md (new, ~350 lines)
spec-docs/SPINE_ARCHITECTURE.md (new, ~550 lines)
spec-docs/SESSION_LOG.md (appended)
spec-docs/CURRENT_STATE.md (updated)
```

After commit, proceed to:
- Archive superseded specs (per GOSPEL_CONSOLIDATION_MAP.md "Pending Archive" section)
- Resume Phase 2 fix execution (code changes)

## Gospel Status

| Gospel | Input Specs | Decisions | Lines | Status |
|--------|------------|-----------|-------|--------|
| MODE_1_LEAGUE_BUILDER.md | 13 | 12 (10 Mode 1 + 2 cross-cutting) | 1,767 | ✅ COMMITTED |
| MODE_3_OFFSEASON_WORKSHOP.md | 17 | 17 + 8 findings | 1,319 | ✅ COMMITTED |
| MODE_2_FRANCHISE_SEASON.md | 39 | 33 + 3 cross-cutting | 3,269 | ✅ DRAFTED — pending commit |
| ALMANAC.md | 2 | 0 (read-only consumer) | ~350 | ✅ DRAFTED — pending commit |
| SPINE_ARCHITECTURE.md | Cross-cutting | C-045 | ~550 | ✅ DRAFTED — pending commit |
| **TOTAL** | **71+ specs** | **62 decision IDs** | **~7,255** | **5/5 DRAFTED** |

## Git Issue

A stale `.git/index.lock` file from a previous session prevents git operations from the VM. JK needs to run:
```bash
rm /Users/johnkruse/Projects/kbl-tracker/.git/index.lock
```
Then commit pending files.

## Almanac Structure (10 Sections)

1. Overview & Purpose
2. Data Sources
3. Almanac Sections (Leaderboards, Records, Awards, HOF, Team History, Transactions)
4. Cross-Season Query Interface
5. Career Player Profile
6. Implementation Priority
7. Franchise Isolation
8. V2 / Deferred Material
9. Cross-References
10. Decision Traceability

## Spine Architecture Structure (14 Sections)

1. Purpose
2. Three-Mode Architecture
3. Core Entity Models (Player, Team, League, Franchise, Season, Enumerations, Ratings)
4. Stats Contracts (Batting, Pitching, Fielding, Career)
5. Event Streams (AtBatEvent, BetweenPlayEvent, TransactionEvent)
6. Storage Architecture (Two-Database Model, Franchise Isolation, Estimates)
7. Mode Transition Contracts (Mode 1→2, Mode 2→3, Mode 3→2)
8. Adaptive Scaling (opportunityFactor, WAR scaling, SMB4 constants)
9. Shared Trait Contract
10. Designation Contract
11. Fan Morale Contract
12. Narrative Contract
13. Park Factor Contract
14. Cross-References

## Mode 2 Structure (28 Sections)

1. Overview & Mode Definition
2. Event Model (AtBatEvent, BetweenPlayEvent, TransactionEvent)
3. GameTracker 1-Tap Recording
4. Enrichment System
5. Between-Play Events
6. Baseball Rules & Logic
7. Substitution System
8. Stats Pipeline (4-layer)
9. Pitcher Stats & Decisions
10. Fielding System
11. WAR System (bWAR, pWAR, fWAR, rWAR, mWAR)
12. Leverage Index & Win Probability
13. Clutch Attribution
14. Mojo & Fitness
15. Modifier Registry & Special Events
16. Narrative System
17. Dynamic Designations
18. Milestone System
19. Fan Favorite & Albatross Trade Mechanics
20. Fan Morale System
21. Standings & Playoffs
22. Schedule System
23. Adaptive Standards Engine
24. Stadium Analytics & Park Factors
25. AI Game Engine
26. Franchise Data Flow
27. V2 / Deferred Material
28. Decision Traceability

## Mode 3 Minor Gaps (follow-up refinement)

1. §6.2 Expansion draft protection/selection algorithm needs detail (medium)
2. §11.2 AI trade proposal generation logic thin (minor)
3. §4.2 Eye test voting UI mechanics underspecified (minor)
4. §11.2/§15.2 Beat reporter warning list incomplete (minor)

## Key Resolved Decisions (Cumulative)

- Offseason = 13 phases (not 11, not 14) per C-049
- Spine = standalone 5th document per C-045
- Franchise Types = configuration layer (Solo/Co-Op/Custom)
- Step 5 (granular spec updates) skipped → went straight to gospel consolidation
- 13-grade scale authoritative (S through D-) per C-074/C-087
- Personality = 7 types only (not 12) per C-070
- Fame = FameLevel dropdown (not slider) per C-078
- No contraction in v1 per C-072
- No WAR configurable weights per C-075
- Handoff = copy-not-reference per C-076
- Chemistry types = real SMB4 names (5 types) per F-124
- FA exchange = ±20% True Value, no position restriction per F-125
- Rookie salary = draft-round-based, locked per F-127
- Trait assignment = wheel spin, potency-only per C-086
- wOBA scale = 1.7821, FIP constant = 3.28 (SMB4 calibrated) per C-058/C-059
- Juiced only via events/traits, rest path removed per C-092
- INSIDER reporter reveal is permanent per C-068
- Reporter morale capped ±3/game per C-069
- Albatross trade discount = 15% (not 30%) per C-056
- FA attractiveness: state-based bonuses removed per C-093

## Blueprint Files

- GOSPEL_CONSOLIDATION_MAP.md — master routing of specs → gospels
- FRANCHISE_TYPE_DESIGN_NOTE.md — Solo/Co-Op/Custom design
- STEP4_DECISIONS.md — all 62 decision IDs (consumed during drafting)
