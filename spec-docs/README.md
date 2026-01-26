# KBL Tracker - Specification Documents

> **Last Updated**: January 24, 2026

---

## 🚨 START HERE

### For AI Sessions

**Read these files IN ORDER before doing any work:**

1. **`CURRENT_STATE.md`** - What's implemented, what's not
2. **`AI_OPERATING_PREFERENCES.md`** - How to work on this project (NFL process, etc.)
3. **`IMPLEMENTATION_PLAN.md`** - The active 14-day sprint plan (Data-Flow-First methodology)
4. **`FEATURE_WISHLIST.md`** - 124 known gaps from spec-to-implementation audit

### Critical Context

- **IMPLEMENTATION_PLAN.md is the active plan** - Uses Data-Flow-First methodology
- **Original "completed" days are being re-evaluated** - Many engines are orphaned
- **124 gaps identified** - See FEATURE_WISHLIST.md for full audit results

---

## 📁 Document Categories

### Session Management (Check Every Session)

| Document | Purpose |
|----------|---------|
| `CURRENT_STATE.md` | What's implemented now |
| `SESSION_LOG.md` | Work session history |
| `IMPLEMENTATION_PLAN.md` | Active sprint plan |
| `FEATURE_WISHLIST.md` | Known gaps and missing features |
| `AI_OPERATING_PREFERENCES.md` | How AI should work on this project |
| `DECISIONS_LOG.md` | Key design decisions |

### Master Reference

| Document | Purpose |
|----------|---------|
| `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` | Comprehensive spec (idea bank, not source of truth for implementation) |
| `MASTER_SPEC_ERRATA.md` | Corrections to master spec |

### Core Game Logic Specs

| Document | Purpose |
|----------|---------|
| `BASEBALL_STATE_MACHINE_AUDIT.md` | Game state transitions |
| `MASTER_BASEBALL_RULES_AND_LOGIC.md` | Baseball rules reference |
| `RUNNER_ADVANCEMENT_RULES.md` | Base running logic |
| `SUBSTITUTION_FLOW_SPEC.md` | Player substitutions |
| `FIELDING_SYSTEM_SPEC.md` | Fielding mechanics |

### WAR Calculation Specs

| Document | Purpose |
|----------|---------|
| `ADAPTIVE_STANDARDS_ENGINE_SPEC.md` | League baselines, replacement level |
| `BWAR_CALCULATION_SPEC.md` | Batting WAR |
| `PWAR_CALCULATION_SPEC.md` | Pitching WAR |
| `FWAR_CALCULATION_SPEC.md` | Fielding WAR |
| `RWAR_CALCULATION_SPEC.md` | Baserunning WAR |
| `MWAR_CALCULATION_SPEC.md` | Manager WAR |
| `LEVERAGE_INDEX_SPEC.md` | Leverage calculation |
| `CLUTCH_ATTRIBUTION_SPEC.md` | Clutch situations |

### Game System Specs

| Document | Purpose |
|----------|---------|
| `FAME_SYSTEM_TRACKING.md` | Fame implementation status |
| `SPECIAL_EVENTS_SPEC.md` | Special game events |
| `MILESTONE_SYSTEM_SPEC.md` | Career milestones |
| `MOJO_FITNESS_SYSTEM_SPEC.md` | Mojo/Fitness/PED systems |
| `SALARY_SYSTEM_SPEC.md` | Player salary calculations |
| `FAN_MORALE_SYSTEM_SPEC.md` | Fan morale engine |
| `NARRATIVE_SYSTEM_SPEC.md` | Beat reporter system |
| `OFFSEASON_SYSTEM_SPEC.md` | Off-season mechanics |
| `TRADE_SYSTEM_SPEC.md` | Trade system |
| `FRANCHISE_MODE_SPEC.md` | Multi-franchise saves |
| `PLAYOFF_SYSTEM_SPEC.md` | Playoffs and brackets |

### Statistics Specs

| Document | Purpose |
|----------|---------|
| `STAT_TRACKING_ARCHITECTURE_SPEC.md` | 4-layer stat system |
| `PITCHER_STATS_TRACKING_SPEC.md` | Pitching stats |
| `INHERITED_RUNNERS_SPEC.md` | ER attribution |
| `PITCH_COUNT_TRACKING_SPEC.md` | Pitch counts |
| `EOS_RATINGS_ADJUSTMENT_SPEC.md` | End-of-season ratings |

### Reference Materials

| Document | Purpose |
|----------|---------|
| `SMB4_GAME_REFERENCE.md` | SMB4 mechanics reference |
| `smb4_traits_reference.md` | SMB4 player traits |
| `REQUIREMENTS.md` | User requirements |
| `TEST_MATRIX.md` | Testing strategy |

---

## 📦 Archive Folder

The `archive/` folder contains superseded documents. **DO NOT use these as source of truth.**

Archived items include:
- Old implementation plans (v1)
- Old feature roadmaps
- Superseded spec versions (v1, v2)
- Historical audit reports

---

## 📊 Data Folder

The `data/` folder contains:
- CSV templates for database schemas
- SMB4 baseline data
- Player/team data files

---

*For detailed spec index, see `SPEC_INDEX.md`*
