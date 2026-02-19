# KBL Tracker - Full End-to-End Implementation Plan

> **Purpose**: Comprehensive plan to make all existing UI components fully functional
> **Created**: January 30, 2026
> **Scope**: 331 user stories → ~281 pending implementation

---

## Executive Summary

The KBL Tracker has substantial UI components built (Figma export + original components), but **only ~13% are wired to real data**. Most components fall back to mock/stub data. This plan outlines the work required to make everything functional.

| Metric | Value |
|--------|-------|
| Total Stories | 331 |
| Complete | ~50 (15%) |
| Pending | ~281 (85%) |
| Estimated Effort | 96-116 days |
| Components Needing Data | 13/15 major Figma components |

---

## Current State

### What Works (Real Data)
- ✅ GameTracker → IndexedDB persistence
- ✅ FranchiseHome → useSeasonData/useSeasonStats
- ✅ WAR engines (bWAR, pWAR, fWAR, rWAR, mWAR, Clutch)
- ✅ Mojo/Fitness engines
- ✅ Fame detection
- ✅ Player database (506 players)
- ✅ Museum storage (IndexedDB)

### What Uses Mock Data
- ⚠️ TeamHubContent (morale, stadium, manager, spray charts)
- ⚠️ TradeFlow (mock teams, AI proposals)
- ⚠️ DraftFlow (draft class generation)
- ⚠️ All Offseason flows (data converted but actions don't persist)
- ⚠️ LeagueBuilder sub-pages (stubs only)
- ⚠️ ScheduleContent (receives props, no schedule storage)
- ⚠️ AwardsCeremonyFlow (mock awards data)

### Critical Gaps
1. **No schedule generation/storage** - Can't start a season
2. **No offseason state machine** - Flows don't persist changes
3. **No league/franchise creation** - LeagueBuilder is stubs
4. **No trade persistence** - Trades don't save
5. **No award calculation** - Mock award data only

---

## Implementation Phases

### Phase 0: Foundation (Week 1-2) - 14 days
**Goal**: Critical data infrastructure that everything else depends on

| Day | Stories | Description |
|-----|---------|-------------|
| 1-2 | NEW-006 | Player ratings storage system |
| 3-4 | NEW-007 | Unified player database (already done, verify) |
| 5-6 | NEW-008 | Data integration layer (hooks, context) |
| 7-8 | NEW-002 | Spring Training phase hook |
| 9-10 | NEW-003 | Schedule generation + storage |
| 11-12 | NEW-016 | Offseason phase ordering enforcement |
| 13-14 | NEW-017, NEW-018 | Farm system state + backup/restore |

**Deliverable**: Can generate a schedule, persist games, advance through seasons

---

### Phase 1: League Builder (Weeks 3-6) - 28 days
**Goal**: Users can create leagues, teams, and start franchises

#### Week 3: Core Setup (7 days)
| Stories | Module | Description |
|---------|--------|-------------|
| LB-001 to LB-005 | Hub | League Builder navigation |
| LB-010 to LB-015 | LEAGUES | Create/edit/delete leagues |

#### Week 4: Teams & Players (7 days)
| Stories | Module | Description |
|---------|--------|-------------|
| LB-020 to LB-027 | TEAMS | Team management, logos, colors |
| LB-030 to LB-040 | PLAYERS | Player database CRUD, CSV import |

#### Week 5: Rosters & Draft Config (7 days)
| Stories | Module | Description |
|---------|--------|-------------|
| LB-050 to LB-057 | ROSTERS | Roster management, assignments |
| LB-060 to LB-067 | DRAFT | Draft configuration, lottery |

#### Week 6: Rules & Season Setup (7 days)
| Stories | Module | Description |
|---------|--------|-------------|
| LB-070 to LB-078 | RULES | Rules presets, sliders |
| SS-001 to SS-012 | SEASON SETUP | 6-step wizard |
| SS-020 to SS-025 | PLAYOFF MODE | Playoff-only flow |

**Deliverable**: Complete franchise creation flow

---

### Phase 2: Core Gameplay Loop (Weeks 7-8) - 14 days
**Goal**: Play games, see stats, track standings

| Day | Focus | Description |
|-----|-------|-------------|
| 1-3 | Schedule UI | Wire ScheduleContent to schedule storage |
| 4-5 | Standings | Wire StandingsContent to real calculations |
| 6-7 | Leaders | Wire LeagueLeadersContent to seasonStats |
| 8-10 | Box Scores | Complete game → post-game flow |
| 11-12 | Stat Aggregation | Season → Career pipeline |
| 13-14 | Testing | End-to-end gameplay verification |

**Deliverable**: Can play a full season with real stats

---

### Phase 3: Playoffs (Week 9) - 7 days
**Goal**: Complete playoff system

| Stories | Description |
|---------|-------------|
| S-PLY001 to S-PLY006 | Playoff bracket generation |
| S-PLY007 to S-PLY012 | Series tracking, elimination |
| S-PLY013 to S-PLY018 | Championship celebration |

**Deliverable**: Playoffs work, champion crowned

---

### Phase 4: Offseason - Part 1 (Weeks 10-13) - 28 days

#### Week 10: Season End + Awards (7 days)
| Stories | Phase | Description |
|---------|-------|-------------|
| S-SEP001 to S-SEP014 | Phase 1 | Standings final, MVP selection |
| S-AWD001 to S-AWD008 | Phase 2a | Award calculations |

#### Week 11: Awards + Ratings (7 days)
| Stories | Phase | Description |
|---------|-------|-------------|
| S-AWD009 to S-AWD017 | Phase 2b | Award ceremonies UI |
| S-EOS001 to S-EOS010 | Phase 3a | Rating adjustments start |

#### Week 12: Ratings + Contraction (7 days)
| Stories | Phase | Description |
|---------|-------|-------------|
| S-EOS011 to S-EOS022 | Phase 3b | Manager bonuses, salary adj |
| S-CE001 to S-CE007 | Phase 4a | Contraction risk detection |

#### Week 13: Contraction + Retirement (7 days)
| Stories | Phase | Description |
|---------|-------|-------------|
| S-CE008 to S-CE013 | Phase 4b | Expansion draft |
| S-RET001 to S-RET012 | Phase 5 | Retirement processing |

**Deliverable**: First half of offseason functional

---

### Phase 5: Offseason - Part 2 (Weeks 14-17) - 28 days

#### Week 14: Free Agency (7 days)
| Stories | Phase | Description |
|---------|-------|-------------|
| S-FA001 to S-FA009 | Phase 6 | FA dice, personality routing |

#### Week 15: Draft (7 days)
| Stories | Phase | Description |
|---------|-------|-------------|
| S-DRF001 to S-DRF013 | Phase 7 | Draft class gen, snake draft |

#### Week 16: Trades (7 days)
| Stories | Phase | Description |
|---------|-------|-------------|
| S-TRD001 to S-TRD012 | Phase 8a | Trade proposals, evaluation |

#### Week 17: Trades + Finalize (7 days)
| Stories | Phase | Description |
|---------|-------|-------------|
| S-TRD013 to S-TRD024 | Phase 8b | AI trades, waiver wire |
| S-FA001 to S-FA015 | Phase 9a | Call-ups, send-downs |

**Deliverable**: Can complete full offseason

---

### Phase 6: Finalize & Polish (Weeks 18-20) - 21 days

#### Week 18: Finalize Advance (7 days)
| Stories | Phase | Description |
|---------|-------|-------------|
| S-FA016 to S-FA022 | Phase 9b | Chemistry, season transition |
| Spring Training | Phase 10 | Development preview |
| Schedule Gen | Phase 11 | New season schedule |

#### Week 19: Gap Closures (7 days)
| Focus | Description |
|-------|-------------|
| FEATURE_WISHLIST HIGH gaps | Relationships, Chemistry system |
| Integration testing | Full loop verification |
| Bug fixes | Issues found in testing |

#### Week 20: Polish & Documentation (7 days)
| Focus | Description |
|-------|-------------|
| UI/UX polish | Loading states, error handling |
| Performance | Optimize slow queries |
| Documentation | Update all spec-docs |

**Deliverable**: Production-ready application

---

## Story Distribution by Priority

| Priority | Count | % of Total | Focus |
|----------|-------|------------|-------|
| P0 (Must Have) | ~198 | 60% | Core functionality |
| P1 (Should Have) | ~115 | 35% | Enhanced features |
| P2 (Nice to Have) | ~18 | 5% | Polish, advanced |

---

## Technical Dependencies

### Must Complete First
```
NEW-006 (Player Ratings)
    ↓
NEW-007 (Unified Database)
    ↓
NEW-008 (Data Integration)
    ↓
NEW-003 (Schedule Gen) ←── Required for gameplay
    ↓
League Builder → Season Setup → Play Games
    ↓
Offseason Phases (strict order: 1→2→3→4→5→6→7→8→9→10→11)
```

### Key Storage Additions Needed
1. **scheduleStorage.ts** - Season schedule persistence
2. **offseasonStateStorage.ts** - Offseason phase state machine
3. **tradeHistoryStorage.ts** - Trade persistence
4. **awardStorage.ts** - Award calculations/history
5. **contractStorage.ts** - Contract terms, cap tracking

---

## Recommended Approach: Claude Code Implementation

### Should Claude Code Do All This?

**Yes, with caveats:**

1. **Claude Code CAN do this** - The specs are detailed, stories are well-defined, and the codebase is structured for AI assistance.

2. **Recommended session approach**:
   - Break into 1-2 day sprints
   - Each session: 3-8 related stories
   - End each session with build verification
   - Update SESSION_LOG.md with progress

3. **What works well with Claude Code**:
   - CRUD operations (storage layers)
   - Component wiring (hooks → UI)
   - Test writing
   - Following established patterns

4. **What needs human oversight**:
   - UI/UX decisions
   - Complex game logic edge cases
   - Performance optimization
   - Architecture changes

### Suggested Sprint Structure

```
Sprint Pattern (1-2 days each):
1. Read relevant STORIES_*.md
2. Read related SPEC.md files
3. Implement stories in order
4. Run build, fix errors
5. Update CURRENT_STATE.md
6. Update SESSION_LOG.md
7. Commit with story IDs
```

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scope creep | High | Stick to P0 stories first |
| Data migration issues | Medium | Test with backup/restore |
| UI/logic mismatch | Medium | Verify each flow end-to-end |
| Performance degradation | Low | Monitor IndexedDB size |
| Context loss between sessions | Medium | Aggressive SESSION_LOG updates |

---

## Success Metrics

### Minimum Viable Product (End of Phase 3)
- [ ] Can create a league from scratch
- [ ] Can set up and start a season
- [ ] Can play games with real stat tracking
- [ ] Can view standings and leaders
- [ ] Can complete playoffs

### Full Product (End of Phase 6)
- [ ] Complete 11-phase offseason works
- [ ] Multi-season franchise mode
- [ ] All WAR/Fame systems integrated
- [ ] Museum tracks historical data
- [ ] Backup/restore functional

---

## Appendix: Story Files Reference

| File | Stories | Est. Days |
|------|---------|-----------|
| STORIES_LEAGUE_BUILDER.md | 78 | 36 |
| STORIES_DRAFT.md | 13 | 5 |
| STORIES_PLAYOFFS.md | 18 | 7 |
| STORIES_SEASON_END.md | 14 | 4 |
| STORIES_FINALIZE_ADVANCE.md | 22 | 6 |
| STORIES_RATINGS_ADJUSTMENT.md | 22 | 6 |
| STORIES_TRADE.md | 24 | 7 |
| STORIES_CONTRACTION_EXPANSION.md | 13 | 5 |
| STORIES_AWARDS_CEREMONY.md | 17 | 5 |
| STORIES_FREE_AGENCY.md | 9 | 6 |
| STORIES_RETIREMENT.md | 12 | 4 |
| STORIES_WIRING.md | 23 | ✅ Done |
| STORIES_GAP_CLOSERS.md | 18 | 7 |
| **TOTAL** | **331** | **~98 days** |

---

*This plan should be reviewed and adjusted as implementation progresses. Update this document after each major phase completion.*
