# KBL Tracker Specification Index

> **Purpose**: Help AI assistants quickly find the right documentation
> **Last Updated**: 2026-01-22

---

## 🚨 READ THIS FIRST

Before making changes, identify which spec owns the feature:

| If working on... | Read this spec FIRST |
|-----------------|---------------------|
| Stat tracking, persistence, IndexedDB | `STAT_TRACKING_ARCHITECTURE_SPEC.md` |
| Fame bonuses/boners, detection logic | `FAME_SYSTEM_TRACKING.md` + `FAN_HAPPINESS_SPEC.md` |
| Pitcher stats, earned runs, inherited runners | `PITCHER_STATS_TRACKING_SPEC.md` + `INHERITED_RUNNERS_SPEC.md` |
| WAR calculations | `BWAR_CALCULATION_SPEC.md`, `PWAR_CALCULATION_SPEC.md`, etc. |
| Fielding, errors, defensive stats | `FIELDING_SYSTEM_SPEC.md` |
| At-bat flow, game state machine | `BASEBALL_STATE_MACHINE_AUDIT.md` |
| Substitutions, pinch hitters | `SUBSTITUTION_FLOW_SPEC.md` |
| Runner advancement, scoring | `RUNNER_ADVANCEMENT_RULES.md` |

---

## 📁 Spec Categories

### Core Game Logic
| Spec | Purpose | Status |
|------|---------|--------|
| `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` | Master spec (565KB - comprehensive) | Reference |
| `BASEBALL_STATE_MACHINE_AUDIT.md` | Game state transitions | Reference |
| `RUNNER_ADVANCEMENT_RULES.md` | Base running logic | Active |
| `SUBSTITUTION_FLOW_SPEC.md` | Player substitutions | Active |

### Statistics & Tracking
| Spec | Purpose | Status |
|------|---------|--------|
| `STAT_TRACKING_ARCHITECTURE_SPEC.md` | **4-layer stat system (at-bat→game→season→career)** | **Active - Primary** |
| `PITCHER_STATS_TRACKING_SPEC.md` | Pitching stat details | Active |
| `INHERITED_RUNNERS_SPEC.md` | ER attribution | Active |
| `PITCH_COUNT_TRACKING_SPEC.md` | Pitch counts | Active |

### Fame System
| Spec | Purpose | Status |
|------|---------|--------|
| `FAME_SYSTEM_TRACKING.md` | **Implementation status, bugs, todos** | **Active - Primary** |
| `FAN_HAPPINESS_SPEC.md` | Event types, values, detection rules | Reference |
| `fame_and_events_system.md` | Original design doc | Legacy |

### WAR Calculations
| Spec | Purpose | Status |
|------|---------|--------|
| `BWAR_CALCULATION_SPEC.md` | Batting WAR | Active |
| `PWAR_CALCULATION_SPEC.md` | Pitching WAR | Active |
| `FWAR_CALCULATION_SPEC.md` | Fielding WAR | Active |
| `RWAR_CALCULATION_SPEC.md` | Running WAR | Active |
| `MWAR_CALCULATION_SPEC.md` | Combined WAR | Active |

### Fielding & Defense
| Spec | Purpose | Status |
|------|---------|--------|
| `FIELDING_SYSTEM_SPEC.md` | Fielding mechanics | Active |
| `FIELD_ZONE_INPUT_SPEC.md` | Ball-in-play zones | Active |

### Session & Operations
| Spec | Purpose | Status |
|------|---------|--------|
| `CURRENT_STATE.md` | What's implemented now | Active |
| `SESSION_LOG.md` | Work session history | Active |
| `AI_OPERATING_PREFERENCES.md` | AI behavior guidelines | Reference |
| `DECISIONS_LOG.md` | Design decisions made | Reference |

---

## 📝 Documentation Rules

### 1. Single Source of Truth
Each feature has ONE authoritative spec. Don't duplicate information.

**❌ Bad**: Documenting stat infrastructure in both `FAME_SYSTEM_TRACKING.md` and `STAT_TRACKING_ARCHITECTURE_SPEC.md`

**✅ Good**: Document in authoritative spec, reference from others:
```markdown
### Stat Infrastructure
See `STAT_TRACKING_ARCHITECTURE_SPEC.md` for implementation details.
```

### 2. Changelog Location
- **Bug fixes**: In the spec that owns the feature
- **New features**: In the spec that owns the feature
- **Cross-cutting changes**: Brief note in each affected spec, details in primary spec

### 3. Version Updates
When updating a spec:
1. Update the `Last Updated` date
2. Update the `Version` if significant
3. Mark implementation status (✅ COMPLETED, ⚠️ PARTIAL, ❌ NOT STARTED)

### 4. Cross-References
Always link to related specs:
```markdown
> **Related Specs**: PITCHER_STATS_TRACKING_SPEC.md, INHERITED_RUNNERS_SPEC.md
```

---

## 🔍 Quick Lookup

### "Where is X implemented?"

| Feature | File Location |
|---------|---------------|
| Game state persistence | `src/utils/gameStorage.ts`, `src/hooks/useGamePersistence.ts` |
| Season stats | `src/utils/seasonStorage.ts`, `src/hooks/useSeasonStats.ts` |
| Live stats display | `src/utils/liveStatsCalculator.ts`, `src/hooks/useLiveStats.ts` |
| Fame detection | `src/hooks/useFameDetection.ts` |
| Fame UI | `src/components/GameTracker/FameDisplay.tsx`, `FameEventModal.tsx` |
| At-bat flow | `src/components/GameTracker/AtBatFlow.tsx` |
| Main game tracker | `src/components/GameTracker/index.tsx` |

### "What's the current implementation status?"

Check `CURRENT_STATE.md` for a snapshot of what's working.

### "What bugs are known?"

Check `FAME_SYSTEM_TRACKING.md` § Bugs section for Fame-related issues.

---

## ⚠️ Common Mistakes to Avoid

1. **Don't create new spec files** for minor features - add to existing authoritative spec
2. **Don't duplicate changelogs** - one entry in the owning spec
3. **Don't mix concerns** - stat infrastructure ≠ Fame system
4. **Don't forget cross-references** - always link related specs
5. **Don't leave stale status markers** - update ✅/⚠️/❌ when implementing

---

## 📊 Spec File Sizes (for context)

Large files (>50KB) - comprehensive references:
- `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` (565KB)
- `MASTER_SPEC_CORRECTIONS_v2.md` (114KB)

Medium files (10-50KB) - active development:
- `SPECIAL_EVENTS_SPEC.md` (49KB)
- `SESSION_LOG.md` (52KB)
- `CLUTCH_ATTRIBUTION_SPEC.md` (36KB)

Small files (<10KB) - focused specs:
- `STAT_TRACKING_ARCHITECTURE_SPEC.md` (19KB)
- `FAME_SYSTEM_TRACKING.md` (12KB)

---

*This index should be updated when new specs are added or responsibilities change.*
