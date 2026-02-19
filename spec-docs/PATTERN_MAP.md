# KBL Tracker Pattern Map

## North Star
**"Follows OOTP pattern AND preserves SMB4 asset intact."**
Every architectural decision is measured against this. OOTP defines the
structure. SMB4 defines the content. Neither is optional.

**Purpose:** Compare each KBL subsystem against its OOTP architectural pattern.
**Audit lens:** Does KBL code follow the correct structural pattern?
**Reference:** spec-docs/OOTP_ARCHITECTURE_RESEARCH.md (Sections 1-10)
**Updated:** 2026-02-18 — Reconciled with Phase 1 findings (FINDING-001 to 097)

## Column Definitions
- **OOTP Pattern:** The structural role this subsystem plays in OOTP
- **KBL Code:** Does relevant code exist? (Y / PARTIAL / MISSING)
- **Follows Pattern:** Does it follow the OOTP structural pattern? (Y / N / UNKNOWN — Phase 2 fills this)
- **SMB4 Asset:** What KBL-specific content fills this pattern slot
- **Spine Dep:** Does this require the stat pipeline to work? (Y / N / PARTIAL)
- **Status:** Phase 1 verdict from SUBSYSTEM_MAP (source of truth)

---

| # | Subsystem | OOTP Pattern | KBL Code | Follows Pattern | SMB4 Asset | Spine Dep | Status |
|---|-----------|-------------|----------|-----------------|------------|-----------|--------|
| 1 | GameTracker / Game State | Atomic game event recorder; feeds stat pipeline on completion | Y | PARTIAL (FINDING-105) | At-bat outcomes, mojo events, clutch moments | Y | ✅ WIRED |
| 2 | Stats Aggregation | Synchronous post-game accumulator; updates season totals immediately | PARTIAL | PARTIAL (FINDING-106) | Same counting stats + KBL-specific (mojo impact, clutch index) | — | ⚠️ PARTIAL |
| 3 | Franchise / Season Engine | Root aggregate; all queries scoped franchiseId → yearId → data | Y | N (FINDING-107) | Single franchise per user, season number not calendar year | N | ✅ WIRED |
| 4 | WAR — positional | Derived field on PlayerSeasonStats; recalcs from live stats each game | Y | N | bWAR/fWAR/pWAR/rWAR exist but not wired to pipeline | Y | ❌ ORPHANED |
| 4b | WAR — mWAR | Manager decision tracker; persists decisions, resolves outcomes | Y | Y (FINDING-110) | Manager WAR based on in-game decisions, leverage-weighted | Y | ✅ WIRED |
| 5 | Fame / Milestone | Career total threshold checker; fires narrative triggers on cross | Y | PARTIAL (FINDING-111) | Fame tiers, KBL-specific milestone thresholds | Y | ✅ WIRED |
| 6 | Schedule System | 162-game grid; completion event fires stat pipeline | Y | PARTIAL (FINDING-108) | Same structure; game completion triggers aggregation | Y | ✅ WIRED |
| 7 | Offseason | Atomic phase sequence; locks stats then opens next season | Y | PARTIAL (FINDING-112) | Same phases; KBL-specific award categories | Y | ✅ WIRED |
| 8 | Playoffs | Separate stat tables; bracket seeded from standings | Y | Y (FINDING-113) | Playoff format TBD; postseason stats tracked separately | Y | ✅ WIRED |
| 9 | Relationships | Personality inputs to morale, development rate, narrative triggers | PARTIAL | N (FINDING-119) | SMB4 chemistry types, player bonds, rival dynamics | PARTIAL | ❌ ORPHANED |
| 10 | Narrative / Headlines | Side-effect consumer of stat pipeline; never writes back | PARTIAL | PARTIAL (FINDING-120) | KBL headline engine, game recap generator | Y | ⚠️ PARTIAL |
| 11 | Mojo / Fitness | Per-player fatigue/condition; persists between games, feeds dev calc | Y | N (FINDING-114) | Mojo as performance multiplier; fitness as injury risk | PARTIAL | ✅ WIRED |
| 11b | Leverage Index | Situational weight applied to all clutch/fame/WAR calculations | Y | N (FINDING-099) | Full LI spec implemented; boLI only in active hook; relationship modifiers dead | PARTIAL | ⚠️ PARTIAL |
| 12 | Clutch Attribution | Per-play multi-participant credit distribution weighted by LI | Y | PARTIAL (FINDING-098) | Batter + pitcher + catcher + fielder + runner + manager per play | Y | ⚠️ PARTIAL |
| 13 | Fan Morale | Team performance input; affects attendance, storylines | Y | N (FINDING-101) | Fan morale per team, game outcome driven | N | 🔲 STUBBED |
| 14 | Farm System | Affiliate roster; development level determines growth rate | Y | N (FINDING-072) | Minor league system, prospect tracking | PARTIAL | ❌ ORPHANED |
| 15 | Trade System | Transaction log entry; immediate roster state change | Y | N (FINDING-073) | Player trades, waiver moves | N | ❌ ORPHANED |
| 16 | Salary System | Contract entity; service time drives eligibility categories | Y | N (FINDING-115) | KBL salary structure, contract years | N | ✅ WIRED |
| 17 | League Builder | World config; generates league/team/player entities at creation | Y | PARTIAL (FINDING-116) | Fictional teams, custom rosters, KBL league rules | N | ✅ WIRED |
| 18 | Museum / HOF | Career threshold evaluator; runs post-retirement, eligibility gated | PARTIAL | PARTIAL (FINDING-117) | KBL Hall of Fame criteria, fame-tier based | Y | ⚠️ PARTIAL |
| 19 | Aging / Ratings | Season-close rating mutation; age-curve driven, 10-factor model | Y | N (FINDING-118) | SMB4 aging curve, trait-influenced development | Y | ⚠️ PARTIAL |
| 20 | Career Stats | SUM of PlayerSeasonStats rows by playerId; no separate table | PARTIAL | N (FINDING-109) | All career counting stats, rate stats derived | Y | ⚠️ PARTIAL |
| 21 | Trait System | First-class Player fields; inputs to dev rate, narrative, contracts | MISSING | N | SMB4 traits (Chemistry types, tier bonuses, performance mods) | PARTIAL | ❌ MISSING |
| 22 | Player Dev Engine | 10-factor growth model at season close; moves ratings toward potential | UNKNOWN | N (FINDING-121) | SMB4-specific growth factors, trait-influenced | Y | ❌ MISSING |
| 23 | Record Book | Persistent single-season + career records; checked after every game | UNKNOWN | N (FINDING-122) | KBL franchise records, league records | Y | ❌ ORPHANED |
| 24 | UI Pages | Consumers only; read from stat stores, never write | Y | PARTIAL (FINDING-123) | 16 pages — GameTracker wired, PostGameSummary/WorldSeries data gap | N | ✅ WIRED |

---

## Status Key
- ✅ WIRED — follows pattern, connected to active app
- ⚠️ PARTIAL — exists, connection incomplete or pattern conformance unknown
- ❌ ORPHANED — exists, confirmed not connected to active app
- ❌ MISSING — does not exist in codebase at all
- 🔲 STUBBED — called live but returns placeholder/dummy data
- 🔲 UNKNOWN — Phase 1 audit not yet run for this subsystem

## Critical Spine Path
These subsystems must work correctly before anything else matters:
2 (Stats Aggregation) → 3 (Franchise Engine) → 6 (Schedule) → 20 (Career Stats)

Everything with Spine Dep = Y depends on this chain being correct.

## Phase 2 Priority Order (per PHASE1_BREADTH.md)
1. Clutch + LI (#11b, #12) — surgical wiring gap, high downstream impact
2. Fan Morale (#13) — stub must be replaced or cut
3. Stats Aggregation (#2) — liveStatsCalculator orphan affects real-time box score
4. Positional WAR (#4) — 3,268 lines complete and orphaned
5. Trait System (#21) — foundational gap affecting mojo/clutch/fitness/adaptive learning

## Phase 2 Audit Question Per Row
For every UNKNOWN in "Follows Pattern": open the key file, verify it matches the OOTP
contract in ARCHITECTURAL_DECISIONS.md and OOTP_ARCHITECTURE_RESEARCH.md.
Update "Follows Pattern" to Y, N, or PARTIAL with finding number as evidence.
Update "Status" if Phase 2 reveals a different verdict than Phase 1.

## Phase 2 Gate (SMB4 Asset Protection)
Before any code change proposed from a Phase 2 finding:
1. State the proposed change in plain English
2. State which OOTP pattern it follows
3. State which SMB4 asset is affected and how it is preserved
4. Wait for JK explicit approval
"Follows OOTP pattern" alone is never sufficient. Required: "follows OOTP pattern
AND preserves SMB4 asset intact."
