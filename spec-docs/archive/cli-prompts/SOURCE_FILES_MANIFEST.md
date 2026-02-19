# Source Files Manifest

This document lists all spec and code files that each CLI prompt will need to read. Use this to verify file availability before running each prompt.

## Domain 1: WAR & Statistics

### Spec Files to Read (8 files)
1. spec-docs/BWAR_CALCULATION_SPEC.md
2. spec-docs/PWAR_CALCULATION_SPEC.md
3. spec-docs/FWAR_CALCULATION_SPEC.md
4. spec-docs/RWAR_CALCULATION_SPEC.md
5. spec-docs/MWAR_CALCULATION_SPEC.md
6. spec-docs/STAT_TRACKING_ARCHITECTURE_SPEC.md
7. spec-docs/STADIUM_ANALYTICS_SPEC.md
8. spec-docs/ADAPTIVE_STANDARDS_ENGINE_SPEC.md

### Code Files to Check (6 files)
- src/engines/bwarCalculator.ts
- src/engines/pwarCalculator.ts
- src/engines/fwarCalculator.ts
- src/engines/rwarCalculator.ts
- src/engines/mwarCalculator.ts
- src/engines/warOrchestrator.ts

---

## Domain 2: GameTracker & In-Game Systems

### Spec Files to Read (12 files)
1. spec-docs/FIELDING_SYSTEM_SPEC.md
2. spec-docs/FIELD_ZONE_INPUT_SPEC.md
3. spec-docs/GAMETRACKER_DRAGDROP_SPEC.md
4. spec-docs/INHERITED_RUNNERS_SPEC.md
5. spec-docs/PITCHER_STATS_TRACKING_SPEC.md
6. spec-docs/PITCH_COUNT_TRACKING_SPEC.md
7. spec-docs/SUBSTITUTION_FLOW_SPEC.md
8. spec-docs/AUTO_CORRECTION_SYSTEM_SPEC.md
9. spec-docs/CLUTCH_ATTRIBUTION_SPEC.md
10. spec-docs/LEVERAGE_INDEX_SPEC.md
11. spec-docs/STORIES_GAMETRACKER_FIXES.md
12. spec-docs/STORIES_WIRING.md

### Code Files to Check (5 files)
- src/types/game.ts
- src/hooks/useGameState.ts
- src/engines/clutchCalculator.ts
- src/engines/fielderInference.ts
- src/components/GameTracker/EnhancedInteractiveField.tsx

---

## Domain 3: Player Systems

### Spec Files to Read (15 files)
1. spec-docs/GRADE_ALGORITHM_SPEC.md
2. spec-docs/grade_tracking_system.md
3. spec-docs/SALARY_SYSTEM_SPEC.md
4. spec-docs/MOJO_FITNESS_SYSTEM_SPEC.md
5. spec-docs/MILESTONE_SYSTEM_SPEC.md
6. spec-docs/FAN_FAVORITE_SYSTEM_SPEC.md
7. spec-docs/FAN_MORALE_SYSTEM_SPEC.md
8. spec-docs/DYNAMIC_DESIGNATIONS_SPEC.md
9. spec-docs/NARRATIVE_SYSTEM_SPEC.md
10. spec-docs/SPECIAL_EVENTS_SPEC.md
11. spec-docs/EOS_RATINGS_ADJUSTMENT_SPEC.md
12. spec-docs/EOS_RATINGS_FIGMA_SPEC.md
13. spec-docs/AWARDS_CEREMONY_FIGMA_SPEC.md
14. spec-docs/STORIES_RATINGS_ADJUSTMENT.md
15. spec-docs/STORIES_AWARDS_CEREMONY.md

### Code Files to Check (6 files)
- src/engines/gradeEngine.ts
- src/engines/salaryCalculator.ts
- src/engines/mojoEngine.ts
- src/engines/fameEngine.ts
- src/engines/fanMoraleEngine.ts
- src/engines/milestoneEngine.ts

---

## Domain 4: Franchise & Offseason (LARGEST DOMAIN)

### Spec Files to Read (20 files)
**Figma Specs (prioritize these first):**
1. spec-docs/DRAFT_FIGMA_SPEC.md
2. spec-docs/FREE_AGENCY_FIGMA_SPEC.md
3. spec-docs/CONTRACTION_EXPANSION_FIGMA_SPEC.md
4. spec-docs/FINALIZE_ADVANCE_FIGMA_SPEC.md
5. spec-docs/RETIREMENT_FIGMA_SPEC.md
6. spec-docs/TRADE_FIGMA_SPEC.md
7. spec-docs/FIGMA_BLURB_FREE_AGENCY_EXCHANGE.md
8. spec-docs/SEASON_END_FIGMA_SPEC.md (may be covered in Domain 5)

**System Specs:**
9. spec-docs/FRANCHISE_MODE_SPEC.md
10. spec-docs/OFFSEASON_SYSTEM_SPEC.md (Phase C update)
11. spec-docs/FARM_SYSTEM_SPEC.md
12. spec-docs/TRADE_SYSTEM_SPEC.md
13. spec-docs/GAME_SIMULATION_SPEC.md

**Stories (Acceptance Criteria):**
14. spec-docs/STORIES_DRAFT.md (Phase C update)
15. spec-docs/STORIES_FREE_AGENCY.md (Phase C update)
16. spec-docs/STORIES_TRADE.md (Phase C update)
17. spec-docs/STORIES_RETIREMENT.md (Phase C update)
18. spec-docs/STORIES_FINALIZE_ADVANCE.md (Phase C update)
19. spec-docs/STORIES_CONTRACTION_EXPANSION.md (Phase C update)
20. spec-docs/STORIES_SEASON_END.md (Phase C update)

### Code Files to Check (7 files)
- src/storage/offseasonStorage.ts
- src/storage/franchiseStorage.ts
- src/hooks/useOffseasonPhase.ts
- src/components/DraftFlow.tsx
- src/components/FreeAgencyFlow.tsx
- src/components/RetirementFlow.tsx
- src/components/FinalizeAdvanceFlow.tsx

---

## Domain 5: League & Playoffs

### Spec Files to Read (10 files)
1. spec-docs/LEAGUE_BUILDER_SPEC.md
2. spec-docs/LEAGUE_BUILDER_FIGMA_SPEC.md
3. spec-docs/SEASON_SETUP_SPEC.md
4. spec-docs/SEASON_SETUP_FIGMA_SPEC.md
5. spec-docs/PLAYOFF_SYSTEM_SPEC.md
6. spec-docs/PLAYOFFS_FIGMA_SPEC.md (Phase C update)
7. spec-docs/SEASON_END_FIGMA_SPEC.md
8. spec-docs/SCHEDULE_SYSTEM_FIGMA_SPEC.md
9. spec-docs/STORIES_LEAGUE_BUILDER.md
10. spec-docs/STORIES_PLAYOFFS.md

### Code Files to Check (3+ files)
- src/components/LeagueBuilder/ (all files in directory)
- src/storage/playoffStorage.ts
- src/components/WorldSeries.tsx

---

## Domain 6: Master Spec & Architecture

### Spec Files to Read (3 files)
1. spec-docs/KBL_XHD_TRACKER_MASTER_SPEC_v3.md
2. spec-docs/app_features_and_questions.md
3. spec-docs/STORIES_GAP_CLOSERS.md

### Code Files to Check (search for implementations)
- Oddity Records system
- Nickname system
- Award Emblems
- Legacy/Dynasty tracking
- Fictional Calendar
- Revenge game tracking
- Headlines Generator

---

## Cross-Domain Validator (Run Last)

### Files to Read (8 files total)
1. spec-docs/BUILD_TEMPLATE_WAR_STATS.md (output from Domain 1)
2. spec-docs/BUILD_TEMPLATE_GAMETRACKER.md (output from Domain 2)
3. spec-docs/BUILD_TEMPLATE_PLAYER_SYSTEMS.md (output from Domain 3)
4. spec-docs/BUILD_TEMPLATE_FRANCHISE_OFFSEASON.md (output from Domain 4)
5. spec-docs/BUILD_TEMPLATE_LEAGUE_PLAYOFFS.md (output from Domain 5)
6. spec-docs/BUILD_TEMPLATE_MASTER.md (output from Domain 6)
7. spec-docs/CONTRADICTIONS.md (accumulated contradictions)
8. spec-docs/TRIAGE_DECISIONS.md (user's pre-made decisions)

---

## Phase C Updates (Feb 6, 2026)

These 11 spec files have Phase C updates and their current content is authoritative:

1. spec-docs/OFFSEASON_SYSTEM_SPEC.md
2. spec-docs/STORIES_FREE_AGENCY.md
3. spec-docs/PLAYOFFS_FIGMA_SPEC.md
4. spec-docs/STORIES_FINALIZE_ADVANCE.md
5. spec-docs/CONTRACTION_EXPANSION_FIGMA_SPEC.md
6. spec-docs/STORIES_CONTRACTION_EXPANSION.md
7. spec-docs/STORIES_TRADE.md
8. spec-docs/RETIREMENT_FIGMA_SPEC.md
9. spec-docs/STORIES_RETIREMENT.md
10. spec-docs/STORIES_DRAFT.md
11. spec-docs/STORIES_SEASON_END.md

---

## Ralph Stories (Secondary - only use for gaps)

If any prompt needs to reference older, more generic stories:
- Files in spec-docs/ralph/ are older versions
- ONLY use if main STORIES_*.md files are silent on something
- Main spec-docs/STORIES_*.md files are authoritative

---

## Summary by File Count

| Domain | Specs | Code | Total |
|--------|-------|------|-------|
| 1 (WAR) | 8 | 6 | 14 |
| 2 (GameTracker) | 12 | 5 | 17 |
| 3 (Player Systems) | 15 | 6 | 21 |
| 4 (Franchise/Offseason) | 20 | 7 | 27 |
| 5 (League/Playoffs) | 10 | 3+ | 13+ |
| 6 (Master) | 3 | ? | 3+ |
| 7 (Validator) | 0 | 0 | 8 (BUILD templates) |
| **TOTAL** | **68+** | **27+** | **103+** |

