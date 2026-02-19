# KBL Tracker Implementation Plan

> **Created**: January 24, 2026
> **Revised**: January 24, 2026 - Compressed to 2-week aggressive timeline
> **Methodology**: AI-accelerated, parallel workstreams, MVP-first
>
> **Sprint Status**: Day 1 COMPLETE ✅ | Day 2 COMPLETE ✅ | Day 3 COMPLETE ✅ | Day 4 COMPLETE ✅ | Day 5 COMPLETE ✅ | Day 6 COMPLETE ✅ | Day 7 Next

---

## Progress Summary

| Day | Status | Key Deliverables |
|-----|--------|------------------|
| **Day 1** | ✅ COMPLETE | bWAR calculator, types/war.ts, transactionStorage.ts, career WAR fields |
| **Day 2** | ✅ COMPLETE | pWAR, fWAR, rWAR calculators, engines/index.ts |
| **Day 3** | ✅ COMPLETE | Leverage Index, Clutch Attribution, mWAR calculators (21/21 tests) |
| **Day 4** | ✅ COMPLETE | Fame Engine, Detection Functions (25/25 tests) |
| **Day 5** | ✅ COMPLETE | Mojo, Fitness, Salary engines (45/45 tests) |
| **Day 6** | ✅ COMPLETE | Fan Morale, Narrative engines (53/53 tests) |
| **Day 7** | ⏳ NEXT | Offseason Part 1 |
| Day 8 | ⬜ Pending | Offseason Part 2, Trade System |
| Day 9 | ⬜ Pending | Franchise Mode, UI Components |
| Day 10 | ⬜ Pending | UI Polish, Final Integration |

**Last Updated**: January 24, 2026 - End of Day 6

---

## Executive Summary

**Original estimate**: 22 weeks
**Compressed estimate**: **2 weeks** (10 working days @ 6-8 hrs/day)

The core game tracking is already implemented and tested. What remains is:
1. Calculation engines (WAR, Fame, Mojo) - pure logic, no UI changes needed
2. Offseason/Franchise systems - new features, moderate UI
3. UI polish - making it all look good

### Why 2 Weeks is Achievable

| Factor | Impact |
|--------|--------|
| AI pair programming | 3-4x faster than solo dev |
| Core tracking done | Foundation is solid, 63 tests passing |
| Specs are complete | No design work needed, just implementation |
| Parallel workstreams | Independent engines can be built simultaneously |
| Pure logic first | Engines work before UI exists |

---

## 2-Week Sprint Plan

### Week 1: Calculation Engines (Days 1-5)

**Goal**: All statistical engines working, producing correct numbers

#### Day 1: Data Layer + bWAR ✅ COMPLETE

| Task | Status | Deliverable |
|------|--------|-------------|
| TypeScript interfaces for WAR calculations | ✅ Done | `src/types/war.ts` |
| Extend IndexedDB schema (career stats, transactions) | ✅ Done | `src/utils/careerStorage.ts`, `src/utils/transactionStorage.ts` |
| Implement bwarCalculator.ts | ✅ Done | `src/engines/bwarCalculator.ts` |
| Unit tests for bWAR | ✅ Done | `src/engines/__tests__/bwar-verify.mjs` (16/16 passing) |

**Completed Files**:
- `src/types/war.ts` - BattingStatsForWAR, BWARResult, LeagueContext, SMB4_BASELINES, SMB4_WOBA_WEIGHTS
- `src/engines/bwarCalculator.ts` - calculateWOBA, calculateWRAA, getReplacementLevelRuns, getRunsPerWin, calculateBWAR
- `src/utils/transactionStorage.ts` - 30+ transaction types with rollback capability
- `src/utils/careerStorage.ts` - Added WAR field initializers

**Key Finding**: Initial test expectations were wrong (used MLB values). Recalibrated to SMB4 baselines:
- SMB4 leagueWOBA: 0.329 (not MLB ~0.320)
- SMB4 wobaScale: 1.7821 (not MLB ~1.226)
- WAR Runs Per Win: **10 × (seasonGames / 162)** — 50 games = 3.09 RPW

> ⚠️ The 17.87 in ADAPTIVE_STANDARDS is for run environment (Pythagorean), NOT WAR calculation!

#### Day 2: pWAR + fWAR + rWAR ✅ COMPLETE

| Task | Status | Deliverable |
|------|--------|-------------|
| Implement `pwarCalculator.ts` (FIP, starter/reliever split, leverage) | ✅ Done | `src/engines/pwarCalculator.ts` |
| Implement `fwarCalculator.ts` (per-play values, positional adjustment) | ✅ Done | `src/engines/fwarCalculator.ts` |
| Implement `rwarCalculator.ts` (wSB, wGDP, speed-based UBR) | ✅ Done | `src/engines/rwarCalculator.ts` |
| Unit tests for all three, unified index | ✅ Done | `war-verify.mjs` (24/24 passing), `engines/index.ts` |

**Completed Files**:
- `src/engines/pwarCalculator.ts` - calculateFIP, getPitcherReplacementLevel, getLeverageMultiplier, calculatePWAR
- `src/engines/fwarCalculator.ts` - calculateFieldingRuns, getPositionalAdjustment, calculateFWAR with difficulty multipliers
- `src/engines/rwarCalculator.ts` - calculateWSB, calculateUBR, calculateWGDP, estimateUBR from speed rating
- `src/engines/index.ts` - Unified exports, calculateTotalWAR, getTotalWARTier

**Key Finding**: WAR uses `RPW = 10 × (seasonGames / 162)`, NOT the 17.87 run-environment value!
Corrected expectations for 48-game season (RPW = 2.96):
- Ace starter (FIP 2.70, 90 IP): ~6.22 pWAR
- Gold Glove SS: ~4.19 fWAR
- Speed demon (25 SB, 4 CS): ~2.03 rWAR

#### Day 3: Leverage + Clutch + mWAR ✅ COMPLETE

| Task | Status | Deliverable |
|------|--------|-------------|
| Implement `leverageCalculator.ts` (LI by game state, gmLI) | ✅ Done | `src/engines/leverageCalculator.ts` |
| Implement `clutchCalculator.ts` (multi-participant, Net Clutch Rating) | ✅ Done | `src/engines/clutchCalculator.ts` |
| Implement `mwarCalculator.ts` (decision tracking, evaluation) | ✅ Done | `src/engines/mwarCalculator.ts` |
| Unit tests for all three calculators | ✅ Done | `leverage-clutch-mwar-verify.mjs` (21/21 passing) |
| Update engines/index.ts with exports | ✅ Done | All 3 calculators exported |
| Integration: Hook LI into live game display | ✅ Done | Scoreboard displays LI with color coding |

**Completed Files**:
- `src/engines/leverageCalculator.ts` - BASE_OUT_LI table, inning/score modifiers, gmLI calculation
- `src/engines/clutchCalculator.ts` - Multi-participant attribution, contact quality, playoff multipliers
- `src/engines/mwarCalculator.ts` - 12 decision types, auto-detect inference, team overperformance
- `src/engines/index.ts` - Updated with all Day 3 exports

**Key Implementation Details**:
- **Leverage Index**: LI = BASE_OUT_LI × inningMult × walkoffBoost × scoreDamp (range: 0.1-10.0)
- **LI Categories**: LOW (<0.85), MEDIUM (0.85-2.0), HIGH (2.0-5.0), EXTREME (5.0+)
- **Clutch Value**: baseValue × √LI × playoffMultiplier
- **Playoff Multipliers**: Wild Card (1.25×), Division (1.5×), Championship (1.75×), WS (2.0×) + Elimination (+0.5) + Clinch (+0.25)
- **mWAR Formula**: (decisionWAR × 0.60) + (overperformanceWAR × 0.40)
- **Manager Overperformance Credit**: 30% (remaining 70% is luck/variance, NOT redistributed to players)

**Verified Scenarios**:
- 9th inning, bases loaded, 2 out, tie game: LI ≈ 6.73 ✓
- Closer situation (9th T, up 1, loaded, 2 out): LI ≈ 4.57 ✓
- WS Game 7 walk-off grand slam: +43.5 clutch points ✓

#### Day 4: Fame + Detection Functions
| Block | Duration | Tasks |
|-------|----------|-------|
| Morning | 3 hrs | Implement `fameEngine.ts` with all Fame Bonus/Boner events |
| Morning | 1 hr | Implement auto-detection functions (detectCycle, detectNoHitter, detectMaddux, etc.) |
| Afternoon | 2 hrs | Implement prompt-detection functions (promptWebGem, promptRobbery, etc.) |
| Afternoon | 2 hrs | Implement milestone detection (career HR, wins, etc.) |

**Deliverable**: `src/engines/fameEngine.ts`, `src/utils/detection/*.ts`

#### Day 5: Mojo + Fitness + Salary + Integration
| Block | Duration | Tasks |
|-------|----------|-------|
| Morning | 2 hrs | Implement `mojoEngine.ts` (5-level scale, triggers, effects) |
| Morning | 2 hrs | Implement `fitnessEngine.ts` (6 states, degradation, recovery) |
| Afternoon | 2 hrs | Implement `salaryCalculator.ts` (base salary, modifiers, True Value) |
| Afternoon | 2 hrs | Integration testing: All engines work together |

**Deliverable**: All engines complete, unified `src/engines/index.ts` export

---

### Week 2: Systems + UI (Days 6-10)

**Goal**: Complete feature set with polished UI

#### Day 6: Fan Morale + Narrative Foundation ✅ COMPLETE

| Task | Status | Deliverable |
|------|--------|-------------|
| Implement `fanMoraleEngine.ts` (7 states, event-driven updates) | ✅ Done | `src/engines/fanMoraleEngine.ts` |
| Implement trade scrutiny (14-game window) | ✅ Done | Integrated in fanMoraleEngine.ts |
| Implement `narrativeEngine.ts` (beat reporter templates) | ✅ Done | `src/engines/narrativeEngine.ts` |
| Claude API integration for dynamic narratives | ✅ Done | Placeholder ready for drop-in |
| Unit tests for all engines | ✅ Done | `fan-morale-narrative-verify.cjs` (53/53 passing) |

**Completed Files**:
- `src/engines/fanMoraleEngine.ts` - 7 fan states, 30+ morale events, trade scrutiny, contraction risk
- `src/engines/narrativeEngine.ts` - 10 reporter personalities, 80/20 alignment, template generation
- `src/engines/__tests__/fan-morale-narrative-verify.cjs` - 53/53 tests passing
- `src/engines/index.ts` - Updated with all Day 6 exports

**Key Implementation Details**:
- **Fan States**: EUPHORIC (90-99), EXCITED (75-89), CONTENT (55-74), RESTLESS (40-54), FRUSTRATED (25-39), APATHETIC (10-24), HOSTILE (0-9)
- **Performance vs Expectations**: VASTLY_EXCEEDING (±50%), EXCEEDING (±30%), MEETING (±0%), UNDER (±20%), VASTLY_UNDER (±50%)
- **Trade Scrutiny Window**: 14 games post-trade, verdicts: TOO_EARLY, LOOKING_GOOD, JURY_OUT, LOOKING_BAD, DISASTER
- **Contraction Risk**: morale × 0.30 + financial × 0.40 + performance × 0.30
- **Claude API**: Template-based now, `generateNarrativeWithClaude()` placeholder for future integration

#### Day 7: Offseason Flow (Part 1)
| Block | Duration | Tasks |
|-------|----------|-------|
| Morning | 2 hrs | Implement offseason state machine (14 phases) |
| Morning | 2 hrs | Implement retirements + free agency logic |
| Afternoon | 2 hrs | Implement draft system (league-wide pool) |
| Afternoon | 2 hrs | Implement awards/voting calculation |

**Deliverable**: `src/engines/offseasonEngine.ts` (phases 1-5)

#### Day 8: Offseason Flow (Part 2) + Trade System
| Block | Duration | Tasks |
|-------|----------|-------|
| Morning | 2 hrs | Implement Hall of Fame + jersey retirements |
| Morning | 2 hrs | Implement EOS ratings adjustments |
| Afternoon | 2 hrs | Implement `tradeSystem.ts` (Contract Value matching, execution) |
| Afternoon | 2 hrs | Implement stat splitting for traded players |

**Deliverable**: `src/engines/{offseason,trade}Engine.ts` complete

#### Day 9: Franchise Mode + UI Components
| Block | Duration | Tasks |
|-------|----------|-------|
| Morning | 2 hrs | Implement `franchiseManager.ts` (save slots, multi-league) |
| Morning | 2 hrs | Implement data migration for schema updates |
| Afternoon | 4 hrs | Build key UI components: Dashboard, WAR Leaderboard, Player Profile |

**Deliverable**: `src/components/{Dashboard,Leaderboard,PlayerProfile}/`

#### Day 10: UI Polish + Final Integration
| Block | Duration | Tasks |
|-------|----------|-------|
| Morning | 2 hrs | Build offseason UI (phase tracker, free agency, draft) |
| Morning | 2 hrs | Build post-game summary with Fame events |
| Afternoon | 2 hrs | Full integration testing (play through complete season) |
| Afternoon | 2 hrs | Bug fixes, edge cases, final polish |

**Deliverable**: Complete, playable application

---

## Parallel Workstream Option

If we want to go even faster, some work is parallelizable:

| Stream A (Logic) | Stream B (UI) |
|------------------|---------------|
| Day 1-3: All WAR engines | Day 1-3: Dashboard wireframes |
| Day 4-5: Fame + Mojo | Day 4-5: Player profile UI |
| Day 6-7: Offseason logic | Day 6-7: Offseason UI |
| Day 8-10: Integration | Day 8-10: Polish |

This requires two parallel sessions but could compress to **8 days**.

---

## MVP Definition (If We Need to Cut Scope)

**Must Have (Week 1)**:
- [x] bWAR calculating correctly ✅ Day 1
- [ ] pWAR, fWAR, rWAR calculating correctly
- [ ] Leverage Index in live game
- [ ] Fame event detection (auto + prompted)
- [ ] Mojo system working

**Should Have (Week 2)**:
- [ ] Fan Morale system
- [ ] Basic offseason flow (awards, retirement, free agency)
- [ ] Trade system
- [ ] Franchise save/load

**Could Have (Post-Sprint)**:
- [ ] Narrative generation (Claude API)
- [ ] Stadium analytics (spray charts, park factors)
- [ ] Farm system (prospect development)
- [ ] Full UI polish

---

## Success Criteria

### End of Week 1
- [x] bWAR calculations produce correct numbers ✅ Day 1
- [ ] pWAR, fWAR, rWAR calculations correct
- [ ] LI displays in real-time during games
- [ ] Fame events trigger and display
- [ ] Mojo affects displayed stats
- [x] Engines have unit tests (bWAR: 16/16) ✅ Day 1

### End of Week 2
- [ ] Can play a full season
- [ ] Can complete offseason flow
- [ ] Can start new season with updated rosters
- [ ] UI is functional (not necessarily beautiful)
- [ ] No critical bugs

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Engine complexity underestimated | Simplify formulas first, enhance later |
| UI takes longer than expected | Keep UI minimal, function over form |
| Integration issues | Test engines in isolation first |
| Scope creep | Strict MVP boundaries, defer nice-to-haves |

---

## Daily Checklist

Each day should end with:
1. [ ] Code committed
2. [ ] Tests passing
3. [ ] CURRENT_STATE.md updated
4. [ ] SESSION_LOG.md entry added
5. [ ] Tomorrow's tasks clear

### Day 1 Checklist ✅
1. [x] Code created (not committed - no git repo initialized)
2. [x] Tests passing (16/16 in bwar-verify.mjs)
3. [x] CURRENT_STATE.md updated
4. [x] SESSION_LOG.md entry added
5. [x] Tomorrow's tasks clear (Day 2: pWAR + fWAR + rWAR)

---

## Technology Reminder

- **Frontend**: React + TypeScript (established)
- **State**: Current useState/useReducer (upgrade to Zustand if needed)
- **Storage**: IndexedDB via Dexie.js (established)
- **UI**: Tailwind CSS + shadcn/ui (available)
- **Charts**: Recharts (available)
- **AI**: Claude API for narratives (Day 6)

---

*Let's ship this thing. 🚀*
