# Spec-to-Code Traceability Matrix

> **Purpose**: Map every spec document to its implementing code files
> **Last Updated**: January 25, 2026 (Day 2 Complete)
>
> This document ensures no orphaned specs or orphaned code. Every spec should have
> corresponding implementation, and every engine/utility should trace back to a spec.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented and wired |
| ⚠️ | Implemented but not wired to UI |
| 🔨 | Partially implemented |
| ❌ | Not implemented |
| 📋 | Spec only (no code yet) |

---

## Core WAR Calculation Specs

| Spec Document | Primary Implementation | Status | Integration Point |
|--------------|----------------------|--------|-------------------|
| `BWAR_CALCULATION_SPEC.md` | `src/engines/bwarCalculator.ts` | ✅ | `useWARCalculations.ts` → `WARDisplay.tsx` → `index.tsx` |
| `PWAR_CALCULATION_SPEC.md` | `src/engines/pwarCalculator.ts` | ✅ | `useWARCalculations.ts` → `WARDisplay.tsx` → `index.tsx` |
| `FWAR_CALCULATION_SPEC.md` | `src/engines/fwarCalculator.ts` | ⚠️ | Calculated, needs display integration |
| `RWAR_CALCULATION_SPEC.md` | `src/engines/rwarCalculator.ts` | ⚠️ | Calculated, needs display integration |
| `MWAR_CALCULATION_SPEC.md` | `src/engines/mwarCalculator.ts` | ⚠️ | Calculated, needs display integration |

**Day 2 Update**: `WARPanel` from `WARDisplay.tsx` is now rendered in `index.tsx` showing bWAR and pWAR leaderboards.

---

## Game Mechanics Specs

| Spec Document | Primary Implementation | Status | Integration Point |
|--------------|----------------------|--------|-------------------|
| `FIELDING_SYSTEM_SPEC.md` | `src/components/GameTracker/FieldingModal.tsx` | ✅ | Wired in `index.tsx` at-bat flow |
| `FIELD_ZONE_INPUT_SPEC.md` | `src/components/GameTracker/FieldingModal.tsx` | ✅ | Direction/zone selection |
| `RUNNER_ADVANCEMENT_RULES.md` | `src/components/GameTracker/AtBatFlow.tsx` | ✅ | Runner outcome handling |
| `SUBSTITUTION_FLOW_SPEC.md` | Multiple modals: `PitchingChangeModal.tsx`, `PinchHitterModal.tsx`, `PinchRunnerModal.tsx`, `DefensiveSubModal.tsx` | ✅ | All wired in `index.tsx` |
| `INHERITED_RUNNERS_SPEC.md` | `src/components/GameTracker/PitchingChangeModal.tsx` | ✅ | Tracks pitcher responsibility |
| `PITCH_COUNT_TRACKING_SPEC.md` | `src/components/GameTracker/index.tsx` | ✅ | `pitcherGameStats` Map |
| `SPECIAL_EVENTS_SPEC.md` | `src/components/GameTracker/EventFlow.tsx` | ✅ | SB, CS, WP, PB, Balk handling |
| `LEVERAGE_INDEX_SPEC.md` | `src/engines/leverageCalculator.ts` | ✅ | Displayed in `Scoreboard.tsx` |
| `CLUTCH_ATTRIBUTION_SPEC.md` | `src/engines/clutchCalculator.ts` | ✅ | Integrated with Fame detection |

---

## Player Development Specs

| Spec Document | Primary Implementation | Status | Integration Point |
|--------------|----------------------|--------|-------------------|
| `MOJO_FITNESS_SYSTEM_SPEC.md` | `src/engines/mojoEngine.ts`, `src/engines/fitnessEngine.ts` | 🔨 | Engines exist, not fully wired |
| `FAME_SYSTEM_TRACKING.md` | `src/engines/fameEngine.ts`, `src/hooks/useFameDetection.ts` | ✅ | Wired in `index.tsx` at lines 1843-1846, 763-776 |
| `MILESTONE_SYSTEM_SPEC.md` | `src/utils/milestoneDetector.ts`, `src/utils/milestoneAggregator.ts` | 🔨 | Detectors exist, aggregation partial |
| `DYNAMIC_DESIGNATIONS_SPEC.md` | N/A | 📋 | Not implemented |
| `FAN_FAVORITE_SYSTEM_SPEC.md` | N/A | 📋 | Not implemented |
| `ADAPTIVE_STANDARDS_ENGINE_SPEC.md` | N/A | 📋 | Not implemented |

---

## Team/Franchise Specs

| Spec Document | Primary Implementation | Status | Integration Point |
|--------------|----------------------|--------|-------------------|
| `SALARY_SYSTEM_SPEC.md` | `src/engines/salaryCalculator.ts` | ⚠️ | Engine exists, not wired to UI |
| `FAN_MORALE_SYSTEM_SPEC.md` | `src/engines/fanMoraleEngine.ts` | ⚠️ | Engine exists, not wired to UI |
| `NARRATIVE_SYSTEM_SPEC.md` | `src/engines/narrativeEngine.ts` | ⚠️ | Engine exists, not wired to UI |
| `FRANCHISE_MODE_SPEC.md` | `src/utils/franchiseStorage.ts` | 🔨 | Storage exists, UI not built |
| `OFFSEASON_SYSTEM_SPEC.md` | `src/utils/seasonEndProcessor.ts` | 🔨 | Processor exists, flow incomplete |
| `TRADE_SYSTEM_SPEC.md` | `src/utils/transactionStorage.ts` | 🔨 | Storage exists, UI not built |
| `FARM_SYSTEM_SPEC.md` | N/A | 📋 | Not implemented |
| `PLAYOFF_SYSTEM_SPEC.md` | N/A | 📋 | Not implemented |
| `STADIUM_ANALYTICS_SPEC.md` | N/A | 📋 | Not implemented |
| `GAME_SIMULATION_SPEC.md` | N/A | 📋 | Not implemented |

---

## Data Architecture Specs

| Spec Document | Primary Implementation | Status | Integration Point |
|--------------|----------------------|--------|-------------------|
| `STAT_TRACKING_ARCHITECTURE_SPEC.md` | `src/utils/seasonStorage.ts`, `src/utils/careerStorage.ts`, `src/utils/gameStorage.ts` | ✅ | IndexedDB persistence working |
| `PITCHER_STATS_TRACKING_SPEC.md` | `src/components/GameTracker/index.tsx` | ✅ | `pitcherGameStats` Map, accumulated stats |

---

## Reference/Meta Specs

| Spec Document | Purpose | Has Code? |
|--------------|---------|-----------|
| `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` | Master spec document | N/A |
| `MASTER_BASEBALL_RULES_AND_LOGIC.md` | Baseball rules reference | N/A |
| `SMB4_GAME_REFERENCE.md` | SMB4 game mechanics | N/A |
| `smb4_traits_reference.md` | SMB4 player traits | N/A |
| `BASEBALL_STATE_MACHINE_AUDIT.md` | State machine documentation | N/A |
| `REQUIREMENTS.md` | User requirements | N/A |
| `DECISIONS_LOG.md` | Decision history | N/A |
| `SESSION_LOG.md` | Session log | N/A |
| `CURRENT_STATE.md` | Current state | N/A |
| `FEATURE_WISHLIST.md` | Feature backlog | N/A |
| `IMPLEMENTATION_PLAN.md` | Sprint plan | N/A |
| `SPEC_INDEX.md` | Spec organization | N/A |
| `TEST_MATRIX.md` | Test coverage | N/A |
| `MASTER_SPEC_ERRATA.md` | Spec corrections | N/A |
| `AI_OPERATING_PREFERENCES.md` | AI instructions | N/A |

---

## Code Files Without Spec Coverage

| File | Purpose | Needs Spec? |
|------|---------|-------------|
| `src/engines/detectionFunctions.ts` | Fame event detection helpers | Part of `FAME_SYSTEM_TRACKING.md` |
| `src/utils/eventLog.ts` | Event logging system | Could use spec |
| `src/utils/teamMVP.ts` | Team MVP calculation | Part of `FAME_SYSTEM_TRACKING.md` |
| `src/utils/liveStatsCalculator.ts` | Live stat computation | Part of `STAT_TRACKING_ARCHITECTURE_SPEC.md` |
| `src/hooks/useDataIntegrity.ts` | Data validation | Could use spec |
| `src/hooks/useLiveStats.ts` | Live stats hook | Part of `STAT_TRACKING_ARCHITECTURE_SPEC.md` |
| `src/hooks/useSeasonStats.ts` | Season stats hook | Part of `STAT_TRACKING_ARCHITECTURE_SPEC.md` |
| `src/hooks/useGamePersistence.ts` | Game persistence hook | Part of `STAT_TRACKING_ARCHITECTURE_SPEC.md` |

---

## Orphaned Code Alert

~~The following files exist but are **not integrated**:~~

| File | Lines | Exports | Used? |
|------|-------|---------|-------|
| ~~`src/components/GameTracker/WARDisplay.tsx`~~ | ~~387~~ | ~~`WARBadge`, `WARPanel`, `WARLeaderboard`~~ | ✅ **Day 2: Wired to index.tsx** |

**No orphaned code remaining as of Day 2.**

---

## Known Spec Contradictions

**Day 3 Resolution (2026-01-25)**: All contradictions resolved per user decisions. See `DECISIONS_LOG.md` for full rationale.

| Issue | Resolution | Status |
|-------|------------|--------|
| Mojo Jacked (0.90x vs 1.18x) | Keep both: WAR credit (0.90x) + Stat boost (1.18x) | ✅ Resolved |
| Juiced Fitness (0.5x vs 1.20x) | Keep both: Fame credit (0.5x) + Stat boost (1.20x) | ✅ Resolved |
| Strained Fitness (1.10x vs 1.15x) | Keep both: WAR credit (1.10x) + Fame credit (1.15x) | ✅ Resolved |
| Rattled Mojo (1.30x vs 1.15x) | Keep both: Clutch (1.30x) + WAR credit (1.15x) | ✅ Resolved |
| FIP constant (3.10 vs 3.15) | Use 3.15 for examples; SMB4 code uses 3.28 (calibrated) | ✅ Resolved |

**Key Insight**: These weren't contradictions - they were intentional dual-purpose systems where stat performance, WAR attribution, Fame recognition, and clutch evaluation each have appropriate modifiers.

---

## Verification Commands

```bash
# Verify build passes
npm run build

# Check for unused exports (would need custom script)
grep -r "export" src/engines/*.ts | wc -l

# Find all imports of a specific engine
grep -r "from.*bwarCalculator" src/
```

---

*This document should be updated whenever specs or code change.*
