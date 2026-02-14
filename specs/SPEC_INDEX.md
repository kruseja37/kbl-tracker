# KBL Tracker Specification Index

> **Purpose**: Help AI assistants quickly find the right documentation
> **Last Updated**: 2026-01-24

---

## 🚨 READ THIS FIRST

### For New AI Sessions
**Read these files IN ORDER:**

1. **`CURRENT_STATE.md`** - What's implemented, what's not
2. **`AI_OPERATING_PREFERENCES.md`** - How to work (3-tier NFL process)
3. **`IMPLEMENTATION_PLAN.md`** - Active 14-day sprint (Data-Flow-First)
4. **`FEATURE_WISHLIST.md`** - 124 known gaps to address

### Critical Context
- **124 gaps identified** in spec-to-implementation audit
- **Many engines are orphaned** (calculators exist but aren't connected)
- **Data-Flow-First methodology** - Build pipeline before features

---

Before making changes, identify which spec owns the feature:

| If working on... | Read this spec FIRST |
|-----------------|---------------------|
| Stat tracking, persistence, IndexedDB | `STAT_TRACKING_ARCHITECTURE_SPEC.md` |
| Fame bonuses/boners, detection logic | `FAME_SYSTEM_TRACKING.md` + `FAN_MORALE_SYSTEM_SPEC.md` |
| Career milestones, milestone Fame | `MILESTONE_SYSTEM_SPEC.md` |
| League baselines, replacement level, WAR context | `ADAPTIVE_STANDARDS_ENGINE_SPEC.md` |
| Pitcher stats, earned runs, inherited runners | `PITCHER_STATS_TRACKING_SPEC.md` + `INHERITED_RUNNERS_SPEC.md` |
| WAR calculations | `BWAR_CALCULATION_SPEC.md`, `PWAR_CALCULATION_SPEC.md`, etc. |
| Fielding, errors, defensive stats | `FIELDING_SYSTEM_SPEC.md` |
| At-bat flow, game state machine | `BASEBALL_STATE_MACHINE_AUDIT.md` |
| Substitutions, pinch hitters | `SUBSTITUTION_FLOW_SPEC.md` |
| Runner advancement, scoring | `RUNNER_ADVANCEMENT_RULES.md` |
| End-of-season ratings | `EOS_RATINGS_ADJUSTMENT_SPEC.md` |
| Salary/contracts | `SALARY_SYSTEM_SPEC.md` |
| Off-season mechanics, awards | `OFFSEASON_SYSTEM_SPEC.md` |
| Save slots, multiple leagues | `FRANCHISE_MODE_SPEC.md` |
| Skip/simulate games, batch sim | `GAME_SIMULATION_SPEC.md` |
| Trade system, draft swaps | `TRADE_SYSTEM_SPEC.md` |
| Fan morale, dynamic happiness | `FAN_MORALE_SYSTEM_SPEC.md` |
| Beat reporters, AI storytelling | `NARRATIVE_SYSTEM_SPEC.md` |
| Park factors, spray charts, stadium records | `STADIUM_ANALYTICS_SPEC.md` |
| Ball-in-play zones, spray input | `FIELD_ZONE_INPUT_SPEC.md` + `STADIUM_ANALYTICS_SPEC.md` |
| Mojo, Fitness, PED stigma, performance weighting | `MOJO_FITNESS_SYSTEM_SPEC.md` |
| Playoffs, bracket, exhibition games, standalone series | `PLAYOFF_SYSTEM_SPEC.md` |

---

## 📁 Directory Structure

```
spec-docs/
├── [Active Specs]        # Current authoritative documentation
├── archive/              # Superseded versions (DO NOT USE as source of truth)
└── data/                 # CSV, JSON, scripts (not documentation)
    └── csv-templates-v2/ # Database schema templates
```

---

## 📚 Active Specifications

### Master Reference
| Spec | Purpose |
|------|---------|
| `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` | Comprehensive master specification (565KB) |
| `MASTER_SPEC_ERRATA.md` | Corrections and updates to v3 |

### Core Game Logic
| Spec | Purpose |
|------|---------|
| `BASEBALL_STATE_MACHINE_AUDIT.md` | Game state transitions |
| `MASTER_BASEBALL_RULES_AND_LOGIC.md` | Baseball rules reference |
| `RUNNER_ADVANCEMENT_RULES.md` | Base running logic |
| `SUBSTITUTION_FLOW_SPEC.md` | Player substitutions |
| `IMPLEMENTATION_GUIDE.md` | Code patterns & examples |

### Statistics & Tracking
| Spec | Purpose | Status |
|------|---------|--------|
| `STAT_TRACKING_ARCHITECTURE_SPEC.md` | 4-layer stat system | **PRIMARY** |
| `PITCHER_STATS_TRACKING_SPEC.md` | Pitching stat details | Active |
| `INHERITED_RUNNERS_SPEC.md` | ER attribution | Active |
| `PITCH_COUNT_TRACKING_SPEC.md` | Pitch counts | Active |

### Fame System
| Spec | Purpose | Status |
|------|---------|--------|
| `FAME_SYSTEM_TRACKING.md` | Implementation status, bugs | **PRIMARY** |
| `MILESTONE_SYSTEM_SPEC.md` | Career milestones, Fame integration | **PLANNING** |
| `FAN_MORALE_SYSTEM_SPEC.md` | Event types, values, rules | Reference |
| `SPECIAL_EVENTS_SPEC.md` | Special game events | Active |

### WAR Calculations
| Spec | Component |
|------|-----------|
| `ADAPTIVE_STANDARDS_ENGINE_SPEC.md` | League baselines, replacement level | **FOUNDATIONAL** |
| `BWAR_CALCULATION_SPEC.md` | Batting WAR |
| `PWAR_CALCULATION_SPEC.md` | Pitching WAR |
| `FWAR_CALCULATION_SPEC.md` | Fielding WAR |
| `RWAR_CALCULATION_SPEC.md` | Running WAR |
| `MWAR_CALCULATION_SPEC.md` | Combined WAR |

### Fielding & Defense
| Spec | Purpose |
|------|---------|
| `FIELDING_SYSTEM_SPEC.md` | Fielding mechanics |
| `FIELD_ZONE_INPUT_SPEC.md` | Ball-in-play zones |
| `CLUTCH_ATTRIBUTION_SPEC.md` | Clutch situations |
| `LEVERAGE_INDEX_SPEC.md` | Leverage calculation |

### Game Systems
| Spec | Purpose | Status |
|------|---------|--------|
| `SALARY_SYSTEM_SPEC.md` | Player contracts & salary | Active |
| `OFFSEASON_SYSTEM_SPEC.md` | Off-season mechanics, awards | Active |
| `EOS_RATINGS_ADJUSTMENT_SPEC.md` | End-of-season rating changes | Active |
| `FRANCHISE_MODE_SPEC.md` | Multi-franchise save slots | **PLANNING** |
| `GAME_SIMULATION_SPEC.md` | Skip/simulate games, park factors | Active |
| `TRADE_SYSTEM_SPEC.md` | In-season & offseason trades | Active |
| `FAN_MORALE_SYSTEM_SPEC.md` | Dynamic fan morale, event tracking | Active |
| `NARRATIVE_SYSTEM_SPEC.md` | Beat reporters, AI storytelling, player quotes | Active |
| `STADIUM_ANALYTICS_SPEC.md` | Park factors, spray charts, stadium records | Active |
| `MOJO_FITNESS_SYSTEM_SPEC.md` | Mojo levels, Fitness states, PED stigma, recovery | Active |
| `PLAYOFF_SYSTEM_SPEC.md` | Playoffs, brackets, exhibition mode, standalone series | Active |

### Session & Operations
| Spec | Purpose |
|------|---------|
| `CURRENT_STATE.md` | **START HERE** - What's implemented now |
| `AI_OPERATING_PREFERENCES.md` | AI behavior guidelines (3-tier NFL) |
| `IMPLEMENTATION_PLAN.md` | Active 14-day sprint plan |
| `FEATURE_WISHLIST.md` | 124 known gaps from audit |
| `SESSION_LOG.md` | Work session history |
| `DECISIONS_LOG.md` | Design decisions |
| `REQUIREMENTS.md` | User requirements |
| `TEST_MATRIX.md` | Testing strategy |

### Reference Materials
| Spec | Purpose |
|------|---------|
| `SMB4_GAME_REFERENCE.md` | SMB4 mechanics |
| `smb4_traits_reference.md` | SMB4 player traits |
| `smb_maddux_analysis.md` | Maddux threshold analysis |
| `app_features_and_questions.md` | Feature scope |

### Templates
| File | Purpose |
|------|---------|
| `FEATURE_TEMPLATE.md` | New feature spec template |

---

## 🔍 Quick Lookup: File Locations

| Feature | Implementation File |
|---------|---------------------|
| Game state persistence | `src/utils/gameStorage.ts` |
| Event log (data integrity) | `src/utils/eventLog.ts`, `src/hooks/useDataIntegrity.ts` |
| Season stats | `src/utils/seasonStorage.ts`, `src/hooks/useSeasonStats.ts` |
| Live stats display | `src/utils/liveStatsCalculator.ts`, `src/hooks/useLiveStats.ts` |
| Fame detection | `src/hooks/useFameDetection.ts` |
| Franchise tracking | `src/utils/franchiseStorage.ts` |
| Milestone aggregation | `src/utils/milestoneAggregator.ts` |
| Fame UI | `src/components/GameTracker/FameDisplay.tsx` |
| At-bat flow | `src/components/GameTracker/AtBatFlow.tsx` |
| Main game tracker | `src/components/GameTracker/index.tsx` |

---

## 📝 Documentation Rules

### Single Source of Truth
Each feature has ONE authoritative spec. Don't duplicate information.

**✅ Good**: Document in authoritative spec, reference from others
```markdown
### Stat Infrastructure
See `STAT_TRACKING_ARCHITECTURE_SPEC.md` for implementation details.
```

### Changelog Location
- Feature changes → In the owning spec's changelog section
- Cross-cutting changes → Brief note in each affected spec

### Archived Files
Files in `archive/` are superseded. See `archive/README.md` for what replaced them.

---

## ⚠️ Common Mistakes

1. **Don't use archived specs** - They're outdated
2. **Don't duplicate changelogs** - One entry in the owning spec
3. **Don't create new spec files** for minor features - Add to existing spec
4. **Don't mix concerns** - Stat infrastructure ≠ Fame system

---

### Data Files
| File | Purpose |
|------|---------|
| `data/smb4_season_baselines_raw.md` | Raw + calculated SMB4 baseline data (source for ADAPTIVE_STANDARDS_ENGINE_SPEC) |
| `data/csv-templates-v2/` | Database schema templates |

---

*This index updated: 2026-01-24 (Cleaned up for Implementation Plan v2)*
