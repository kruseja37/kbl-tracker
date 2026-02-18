# KBL Tracker Pattern Map

## North Star
**"Follows OOTP pattern AND preserves SMB4 asset intact."**
Every architectural decision is measured against this. OOTP defines the
structure. SMB4 defines the content. Neither is optional.

**Purpose:** Compare each KBL subsystem against its OOTP architectural pattern.
**Audit lens:** Does KBL code follow the correct structural pattern?
**Reference:** spec-docs/OOTP_ARCHITECTURE_RESEARCH.md (Sections 1-10)
**Updated:** 2026-02-18 (Phase 1 Tier 1 — Batch D not yet run)

## Column Definitions
- **OOTP Pattern:** The structural role this subsystem plays in OOTP
- **KBL Code:** Does relevant code exist? (Y / PARTIAL / MISSING)
- **Follows Pattern:** Does it follow the OOTP structural pattern? (Y / N / UNKNOWN)
- **SMB4 Asset:** What KBL-specific content fills this pattern slot
- **Spine Dep:** Does this require the stat pipeline to work? (Y / N / PARTIAL)
- **Status:** WIRED / PARTIAL / ORPHANED / MISSING / UNKNOWN

---

| # | Subsystem | OOTP Pattern | KBL Code | Follows Pattern | SMB4 Asset | Spine Dep | Status |
|---|-----------|-------------|----------|-----------------|------------|-----------|--------|
| 1 | GameTracker / Game State | Atomic game event recorder; feeds stat pipeline on completion | Y | UNKNOWN | At-bat outcomes, mojo events, clutch moments | Y | WIRED |
| 2 | Stats Aggregation | Synchronous post-game accumulator; updates season totals immediately | PARTIAL | UNKNOWN | Same counting stats + KBL-specific (mojo impact, clutch index) | — | PARTIAL |
| 3 | Franchise / Season Engine | Root aggregate; all queries scoped franchiseId → yearId → data | Y | UNKNOWN | Single franchise per user, season number not calendar year | N | PARTIAL |
| 4 | WAR — positional | Derived field on PlayerSeasonStats; recalcs from live stats each game | Y | N | bWAR/fWAR/pWAR/rWAR exist but not wired to pipeline | Y | ORPHANED |
| 5 | WAR — mWAR | Manager decision tracker; persists decisions, resolves outcomes | Y | UNKNOWN | Manager WAR based on in-game decisions, leverage-weighted | Y | WIRED |
| 6 | Fame / Milestone | Career total threshold checker; fires narrative triggers on cross | PARTIAL | UNKNOWN | Fame tiers, KBL-specific milestone thresholds | Y | PARTIAL |
| 7 | Schedule System | 162-game grid; completion event fires stat pipeline | Y | UNKNOWN | Same structure; game completion triggers aggregation | Y | PARTIAL |
| 8 | Offseason | Atomic phase sequence; locks stats then opens next season | PARTIAL | UNKNOWN | Same phases; KBL-specific award categories | Y | PARTIAL |
| 9 | Playoffs | Separate stat tables; bracket seeded from standings | PARTIAL | UNKNOWN | Playoff format TBD; postseason stats tracked separately | Y | PARTIAL |
| 10 | Relationships | Personality inputs to morale, development rate, narrative triggers | Y | N | SMB4 chemistry types, player bonds, rival dynamics | PARTIAL | ORPHANED |
| 11 | Narrative / Headlines | Side-effect consumer of stat pipeline; never writes back | PARTIAL | UNKNOWN | KBL headline engine, game recap generator | Y | PARTIAL |
| 12 | Mojo / Fitness | Per-player fatigue/condition; persists between games, feeds dev calc | Y | UNKNOWN | Mojo as performance multiplier; fitness as injury risk | PARTIAL | WIRED |
| 13 | Fan Morale | Team performance input; affects attendance, storylines | Y | UNKNOWN | Fan morale per team, game outcome driven | N | WIRED |
| 14 | Farm System | Affiliate roster; development level determines growth rate | UNKNOWN | UNKNOWN | Minor league system, prospect tracking | PARTIAL | UNKNOWN |
| 15 | Trade System | Transaction log entry; immediate roster state change | UNKNOWN | UNKNOWN | Player trades, waiver moves | N | UNKNOWN |
| 16 | Salary System | Contract entity; service time drives eligibility categories | UNKNOWN | UNKNOWN | KBL salary structure, contract years | N | UNKNOWN |
| 17 | League Builder | World config; generates league/team/player entities at creation | Y | UNKNOWN | Fictional teams, custom rosters, KBL league rules | N | WIRED |
| 18 | Museum / HOF | Career threshold evaluator; runs post-retirement, eligibility gated | UNKNOWN | UNKNOWN | KBL Hall of Fame criteria, fame-tier based | Y | UNKNOWN |
| 19 | Aging / Ratings | Season-close rating mutation; age-curve driven, 10-factor model | Y | UNKNOWN | SMB4 aging curve, trait-influenced development | Y | ORPHANED |
| 20 | Career Stats | SUM of PlayerSeasonStats rows by playerId; no separate table | UNKNOWN | UNKNOWN | All career counting stats, rate stats derived | Y | UNKNOWN |
| 21 | Trait System | First-class Player fields; inputs to dev rate, narrative, contracts | MISSING | N | SMB4 traits (Chemistry types, tier bonuses, performance mods) | PARTIAL | MISSING |
| 22 | Player Dev Engine | 10-factor growth model at season close; moves ratings toward potential | Y | UNKNOWN | SMB4-specific growth factors, trait-influenced | Y | ORPHANED |
| 23 | Record Book | Persistent single-season + career records; checked after every game | UNKNOWN | UNKNOWN | KBL franchise records, league records | Y | UNKNOWN |
| 24 | UI Pages | Consumers only; read from stat stores, never write | PARTIAL | UNKNOWN | 16 pages — GameTracker wired, others unknown | N | PARTIAL |

---

## Status Key
- **WIRED** — follows pattern, connected to active app
- **PARTIAL** — exists, connection incomplete or pattern conformance unknown
- **ORPHANED** — exists, confirmed not connected to active app
- **MISSING** — does not exist in codebase at all
- **UNKNOWN** — Tier 1 audit not yet run for this subsystem

## Critical Spine Path
These subsystems must work correctly before anything else matters:
2 (Stats Aggregation) → 3 (Franchise Engine) → 7 (Schedule) → 20 (Career Stats)

Everything with Spine Dep = Y depends on this chain being correct.

## Phase 2 Audit Question Per Row
For every UNKNOWN in "Follows Pattern": open the key file, verify it matches the OOTP contract in ARCHITECTURAL_DECISIONS.md and OOTP_ARCHITECTURE_RESEARCH.md. Update status to Y, N, or PARTIAL with finding number as evidence.
