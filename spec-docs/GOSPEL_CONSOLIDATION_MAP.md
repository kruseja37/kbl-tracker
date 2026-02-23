# Gospel Consolidation Map

**Created:** 2026-02-22
**Purpose:** Map every active spec + all STEP4 decisions → which of the 4 gospel docs they feed
**Status:** READY FOR JK REVIEW (v3 — verified all files on disk, fixed counts, fixed shared spec assignments)

**Counting convention:** Section 2 counts *table rows* (combined IDs like C-074/C-087 = 1 row). Section 5 counts *unique decision IDs* (C-074/C-087 = 2 IDs). Section 6 uses unique IDs.

---

## The Four Gospels

| Gospel | Scope | Lifecycle |
|--------|-------|-----------|
| **MODE_1_LEAGUE_BUILDER.md** | One-time setup: teams, rosters, import, rules, personality assignment, startup draft, grade algorithm, franchise save slot creation | Run once per franchise |
| **MODE_2_FRANCHISE_SEASON.md** | GameTracker, stats pipeline, WAR, standings, roster mgmt, schedule, narrative, designations, milestones, mojo/fitness, clutch, fielding, events, AI game engine | Active during season + playoffs |
| **MODE_3_OFFSEASON_WORKSHOP.md** | 13 phases: awards, salary recalc ×3, expansion, retirement, FA, draft, trades, finalize, farm reconciliation, chemistry rebalancing | Between seasons |
| **ALMANAC.md** | Read-only cross-season historical reference, career stats, HOF museum, retired jerseys, all-time leaderboards | Always available |

---

## SECTION 1: Active Specs → Gospel Assignment

### Mode 1: League Builder (13 specs)

| Spec File | What It Contributes | Notes |
|-----------|-------------------|-------|
| LEAGUE_BUILDER_SPEC.md | PRIMARY — entire spec is Mode 1 | Core input |
| LEAGUE_BUILDER_FIGMA_SPEC.md | UI wireframes for Mode 1 | Figma reference |
| FRANCHISE_MODE_SPEC.md | Save slot creation, franchise DB initialization | Shared w/ Mode 2+3+Almanac |
| SEASON_SETUP_SPEC.md | Franchise handoff from LB → Season | Transition logic |
| SEASON_SETUP_FIGMA_SPEC.md | Handoff UI | Figma reference |
| GRADE_ALGORITHM_SPEC.md | Player grade calculation at import | Core formula |
| PROSPECT_GENERATION_SPEC.md | Startup prospect draft pool generation | Shared w/ Mode 3 |
| SCOUTING_SYSTEM_SPEC.md | Scout accuracy at startup draft | Shared w/ Mode 3 |
| PERSONALITY_SYSTEM_SPEC.md | 7 types + 4 hidden modifiers assignment | Shared w/ Mode 2+3 |
| TRAIT_INTEGRATION_SPEC.md | Initial trait distribution (30/50/20) | Initial traits |
| SCHEDULE_SYSTEM_FIGMA_SPEC.md | Pre-generated + editable schedule setup | Shared w/ Mode 2 |
| SMB4_GAME_REFERENCE.md | Reference for import mapping | Import support |
| smb4_traits_reference.md | Trait definitions for import | Import support |

### Mode 2: Franchise Season (39 specs)

| Spec File | What It Contributes | Notes |
|-----------|-------------------|-------|
| KBL_UNIFIED_ARCHITECTURE_SPEC.md | GOSPEL — GameTracker event model, input pipeline | Architectural authority |
| FRANCHISE_MODE_SPEC.md | Active franchise management, franchise header indicator | Shared w/ Mode 1+3+Almanac |
| GAME_SIMULATION_SPEC.md | AI Game Engine (AI-only simulation per C-048/C-082) | Rename to AI_GAME_ENGINE; AI matchups only |
| GAMETRACKER_DRAGDROP_SPEC.md | Spray chart geometry (partially superseded) | Geometry only |
| GAMETRACKER_BUGS.md | Known GT issues | Bug reference |
| GAMETRACKER_UX_COMPETITIVE_ANALYSIS.md | UX patterns for GT | Design reference |
| BWAR_CALCULATION_SPEC.md | Batting WAR formula | Core formula |
| PWAR_CALCULATION_SPEC.md | Pitching WAR formula | Core formula |
| FWAR_CALCULATION_SPEC.md | Fielding WAR formula | Core formula |
| RWAR_CALCULATION_SPEC.md | Running WAR formula | Core formula |
| MWAR_CALCULATION_SPEC.md | Manager WAR formula | Core formula |
| CLUTCH_ATTRIBUTION_SPEC.md | Clutch system (CQ × LI) | Core formula |
| LEVERAGE_INDEX_SPEC.md | LI calculation | Core formula |
| PITCHER_STATS_TRACKING_SPEC.md | Pitcher stat pipeline | Stats pipeline |
| PITCH_COUNT_TRACKING_SPEC.md | Pitch count tracking logic | Tracking logic |
| FIELDING_SYSTEM_SPEC.md | Fielding system | Core system |
| FIELDING_PIPELINE_MAPPINGS.md | Fielding data mappings | Pipeline detail |
| INHERITED_RUNNERS_SPEC.md | Inherited runner attribution | Stats rule |
| RUNNER_ADVANCEMENT_RULES.md | Runner movement rules | Baseball rules |
| MASTER_BASEBALL_RULES_AND_LOGIC.md | Baseball rule reference | Rules reference |
| STAT_TRACKING_ARCHITECTURE_SPEC.md | Aggregation logic (partially superseded) | Aggregation only |
| SUBSTITUTION_FLOW_SPEC.md | Sub type tracking (partially superseded) | Sub tracking only |
| NARRATIVE_SYSTEM_SPEC.md | Beat reporters, storylines, milestones | Narrative engine |
| DYNAMIC_DESIGNATIONS_SPEC.md | In-season designations (Fan Fav, Cornerstone, etc.) | Shared w/ Mode 3 |
| MILESTONE_SYSTEM_SPEC.md | Milestone detection logic | Milestone triggers |
| FAN_FAVORITE_SYSTEM_SPEC.md | Fan Favorite establishment | Designation detail |
| FAN_MORALE_SYSTEM_SPEC.md | Fan morale during season | Shared w/ Mode 3 |
| MOJO_FITNESS_SYSTEM_SPEC.md | Mojo/fitness (user-reported only) | User-input only |
| SPECIAL_EVENTS_SPEC.md | → Modifier Registry (per C-089) | Needs rewrite |
| ADAPTIVE_STANDARDS_ENGINE_SPEC.md | Standards calibration engine | Calibration |
| SALARY_SYSTEM_SPEC.md | In-season salary rules (changes deferred) | Shared w/ Mode 1+3 |
| FARM_SYSTEM_SPEC.md | In-season call-ups, send-downs, options | Shared w/ Mode 1+3 |
| TRADE_SYSTEM_SPEC.md | In-season trade window | Shared w/ Mode 3 |
| PLAYOFF_SYSTEM_SPEC.md | Playoff bracket, seeding, postseason | End-of-season |
| PLAYOFFS_FIGMA_SPEC.md | Playoff UI | Figma reference |
| SCHEDULE_SYSTEM_FIGMA_SPEC.md | In-season schedule view | Shared w/ Mode 1 |
| STADIUM_ANALYTICS_SPEC.md | Park factors (confidence-based blending) | Park factors |
| PARK_FACTOR_SEED_SPEC.md | Seed values for new stadiums | Park seeds |
| SMB4_PARK_DIMENSIONS.md | Park dimension reference | Reference data |

### Mode 3: Offseason Workshop (17 specs)

| Spec File | What It Contributes | Notes |
|-----------|-------------------|-------|
| OFFSEASON_SYSTEM_SPEC.md | PRIMARY — entire 13-phase spec | Core input (needs 11→13 update per C-049) |
| FRANCHISE_MODE_SPEC.md | Season archive, cross-season data persistence | Shared w/ Mode 1+2+Almanac |
| EOS_RATINGS_ADJUSTMENT_SPEC.md | Phase 3/8/10 salary recalc formulas | Salary recalc |
| EOS_RATINGS_FIGMA_SPEC.md | Ratings adjustment UI | Figma reference |
| AWARDS_CEREMONY_FIGMA_SPEC.md | Phase 2 awards UI (wheel spin, cards) | Figma reference |
| RETIREMENT_FIGMA_SPEC.md | Phase 5 retirement UI | Figma reference |
| FREE_AGENCY_FIGMA_SPEC.md | Phase 6 FA UI (dice, destinations) | Figma reference |
| DRAFT_FIGMA_SPEC.md | Phase 7 draft UI | Figma reference |
| TRADE_FIGMA_SPEC.md | Phase 9 trade window UI | Figma reference |
| FINALIZE_ADVANCE_FIGMA_SPEC.md | Phase 11 cut-down/signing UI | Figma reference |
| SEASON_END_FIGMA_SPEC.md | Phase 1 season end UI | Figma reference |
| SALARY_SYSTEM_SPEC.md | Triple salary recalc | Shared w/ Mode 1+2 |
| FARM_SYSTEM_SPEC.md | Farm reconciliation phase | Shared w/ Mode 1+2 |
| TRADE_SYSTEM_SPEC.md | Offseason trade window | Shared w/ Mode 2 |
| PERSONALITY_SYSTEM_SPEC.md | FA destinations by personality | Shared w/ Mode 1+2 |
| SCOUTING_SYSTEM_SPEC.md | Draft scouting | Shared w/ Mode 1 |
| PROSPECT_GENERATION_SPEC.md | Annual draft class generation | Shared w/ Mode 1 |

### Almanac (2 specs)

| Spec File | What It Contributes | Notes |
|-----------|-------------------|-------|
| ALMANAC_SPEC.md | PRIMARY — entire Almanac spec | Clean starting point |
| FRANCHISE_MODE_SPEC.md | Storage architecture, career stats, cross-season queries | Shared w/ Mode 1+2+3 |

### NOT Gospel Material (Operational / Meta / Process)

| Spec File | Category | Disposition |
|-----------|----------|-------------|
| SESSION_RULES.md | Process | Keep as operational doc |
| SESSION_LOG.md | Process | Keep as operational doc |
| AUDIT_LOG.md | Process | Keep as operational doc |
| AUDIT_PLAN.md | Process | Keep as operational doc |
| CURRENT_STATE.md | Process | Keep as operational doc |
| PROMPT_CONTRACTS.md | Process | Keep as operational doc |
| DECISIONS_LOG.md | Process | Keep as operational doc |
| GOSPEL_CONSOLIDATION_MAP.md | Process | Keep during consolidation |
| FRANCHISE_TYPE_DESIGN_NOTE.md | Design note | Integrate into gospels during drafting |
| STEP4_DECISIONS.md | Process | Consumed during gospel drafting, then archive |
| STEP3_DOMAINS_1_2_VERIFIED.md | Process | Archive after consolidation |
| STEP3_DOMAIN_3_MATRIX.md | Process | Archive after consolidation |
| STEP3_DOMAIN_4_MATRIX.md | Process | Archive after consolidation |
| STEP3_DOMAIN_5_MATRIX.md | Process | Archive after consolidation |
| STEP3_DOMAIN_6_MATRIX.md | Process | Archive after consolidation |
| DOC_RECONCILIATION_PLAN.md | Process | Archive after consolidation |
| RECONCILIATION_PLAN.md | Process | Archive after consolidation |
| SPEC_RECONCILIATION_FINDINGS.md | Process | Archive after consolidation |
| SPEC_INVENTORY_2026-02-21.md | Process | Archive after consolidation |
| HANDOFF_RECONCILIATION.md | Process | Archive after consolidation |
| FRANCHISE_DEEPDIVE_FEEDBACK_NOTES.md | Process | Archive after consolidation |
| PATTERN_MAP.md | Process | Keep as dev reference |
| SUBSYSTEM_MAP.md | Process | Keep as dev reference |
| FEATURE_WISHLIST.md | Planning | Keep — V2 feature list |
| REQUIREMENTS.md | Planning | Keep as requirements doc |
| FEATURE_TEMPLATE.md | Template | Keep |
| README.md | Index | Keep |
| ARCHITECTURAL_DECISIONS.md | Process | Keep as ADR log |
| SEPARATED_MODES_ARCHITECTURE.md | Architecture | Superseded by gospels — archive |
| FRANCHISE_MODE_DEEP_DIVE.md | Architecture | Held in reserve — archive after gospels |
| OOTP_ARCHITECTURE_RESEARCH.md | Research | Keep as reference |
| KBL_TRACKER_UI_UX_PLANNING.md | Research | Keep as reference |
| FINDINGS/FINDINGS_056_onwards.md | Audit output | Archive after consolidation |
| BASEBALL_STATE_MACHINE_AUDIT.md | Audit output | Keep for rule tables |
| codex-all-prompt-contracts-v2.md | Process | Keep as prompt reference |
| data/README.md | Reference data | Keep as import reference |
| data/csv-templates-v2/README.md | Reference data | Keep as import reference |
| data/smb4_season_baselines_raw.md | Reference data | Keep as baseline reference |
| testing/COMPLETE_TESTING_PIPELINE_GUIDE.md | Testing | Keep |
| testing/TESTING_PIPELINE_GUIDE.md | Testing | Keep |

### Pending Archive (per STEP4 decisions — not yet moved)

| Spec File | Reason |
|-----------|--------|
| CONTRACTION_EXPANSION_FIGMA_SPEC.md | Contraction removed from v1 (C-083/C-094) |

### Already Archived (per Phase B reconciliation — confirmed in archive/)

| Spec File | Reason |
|-----------|--------|
| KBL_XHD_TRACKER_MASTER_SPEC_v3.md | Superseded by GOSPEL |
| MASTER_SPEC_ERRATA.md | Superseded by GOSPEL |
| IMPLEMENTATION_PLAN.md | Superseded by GOSPEL |
| codex-all-prompt-contracts.md | Superseded by v2 |
| SPEC_INDEX.md | Superseded by this map + gospels |
| AI_OPERATING_PREFERENCES.md | Replaced by userPreferences |
| FIELD_ZONE_INPUT_SPEC.md | Superseded by GOSPEL §4.3 |
| AUTO_CORRECTION_SYSTEM_SPEC.md | Superseded by GOSPEL §3 |
| stories/* (14 files) | Pre-event-model work items |
| ralph/* (11 files) | Pre-event-model implementation plans |
| PHASE_SUMMARIES/* (2 files) | Stale summaries |
| testing/ENGINE_API_MAP.md | Snapshot output |
| testing/FRANCHISE_API_MAP.md | Snapshot output |
| testing/FRANCHISE_BUTTON_AUDIT.md | Snapshot output |
| testing/TESTING_IMPLEMENTATION_PLAN.md | Snapshot output |

---

## SECTION 2: STEP4 Decisions → Gospel Assignment

### Decisions for Mode 1: League Builder (9 rows → 10 unique IDs)

| ID | Decision | Gospel Section |
|----|----------|---------------|
| C-070 | Fix personality type union to 7 types | Player data model |
| C-071 | Add 16 and 128 game count presets | Season length config |
| C-072 | Remove contraction toggle | Rules preset |
| C-073 | Add Mode 1 role description | Overview section |
| C-074/C-087 | 13-grade scale authoritative | Grade algorithm |
| C-075 | Remove WAR configurable weights | Rules preset cleanup |
| C-076 | Add missing handoff steps (salary init, standings, franchiseId) | Mode transition |
| C-077 | Add Mode Transition screen | Figma reference |
| C-078 | Fame slider → FameLevel dropdown | Player editor |

### Decisions for Mode 2: Franchise Season (27 rows → 29 unique IDs, plus 2 doc gaps)

| ID | Decision | Gospel Section |
|----|----------|---------------|
| C-002 | Pinch hitter: 2 entry points | GameTracker input |
| C-004 | Add Balk as manual between-play event | GameTracker events |
| C-005 | Keep WP_K/PB_K hybrid types | AtBatResult types |
| C-011 | Add TP to overflow menu | GameTracker overflow |
| C-017 | GO→DP manual correction via play log | Play correction |
| C-025 | Clutch: CQ weighted by LI | Stats pipeline |
| C-027 | Exclude IBB from FIP | Stats pipeline |
| C-033 | Keep armFactor in clutch | Stats pipeline |
| C-047 | Young Player Designation from top-3 farm | Designations |
| C-048/C-082 | AI Game Engine (AI-only simulation) | Schedule / AI games |
| C-055 | Establishment multiplier: playoff-context-modified | Designations |
| C-056 | Albatross trade discount: 15% | Designations |
| C-057/C-067 | Team Captain in data models + narrative | Designations + Narrative |
| C-058 | wOBA Scale = 1.7821 | Stats formula |
| C-061 | Remove impactMultiplier from fWAR | Stats formula |
| C-062 | mWAR 70% unattributed reconciliation | Stats formula |
| C-065 | HOF-Caliber WAR scaling with opportunityFactor | Milestones |
| C-068 | INSIDER reporter permanent reveal | Narrative |
| C-069 | Reporter morale influence: ±3 cap per game | Narrative |
| C-079 | Schedule pre-generated + editable | Schedule |
| C-080 | SIMULATE for AI-only, SCORE GAME for user | Schedule |
| C-081 | Remove mojo/fitness simulation (user-played only) | Mojo system |
| C-084 | Fan morale dual consequences (visual + EOS modifier) | Fan morale |
| C-088 | Park factor confidence-based blending | Stadium analytics |
| C-089 | Special Events → Modifier Registry | Events/modifiers |
| C-092 | Juiced state: events/traits/narrative only | Mojo system |
| C-093 | FA Attractiveness: baseline formula only | Fan morale |
| **C-059** | **Doc gap:** FIP constant calibration undocumented | Stats formula — document during drafting |
| **C-060** | **Doc gap:** Fielding chance vs fWAR credit boundary | Stats formula — define during drafting |

### Decisions for Mode 3: Offseason Workshop (13 rows → 15 unique IDs, plus 2 resolved refs)

| ID | Decision | Gospel Section |
|----|----------|---------------|
| C-041/C-085 | Contraction fully removed | Phase 4 (expansion only) |
| C-042 | Remove recentPerformance from farm morale | Farm reconciliation |
| C-043 | EOS farm call-up threshold scales with season length | Salary recalc |
| C-044 | Fan morale → EOS modifier (0.7× at low morale) | Salary recalc |
| C-046 | Mid-season salary changes deferred to offseason | Phase 3/8/10 |
| C-049 | Expand to 13 phases (restore farm recon + chemistry) | Phase structure |
| C-051 | No salary cap in v1 | Salary rules |
| C-052 | 4-modifier personality approved | FA destinations |
| C-053 | Team Captain: Loyalty+Charisma, no minimums | Phase 2 awards |
| C-066 | Cornerstone +10% FA retention | Phase 6 FA |
| C-083/C-094 | Archive contraction Figma + personality refs | Cleanup |
| C-086 | Trait assignment: wheel spin, potency-only | Phase 2 awards |
| C-090 | Fix EOS Figma calculation error | Phase 3 UI |
| **C-063** | **Resolved by C-086:** Trait assignment timing (traits in Phase 2, ratings in Phase 3) | Phase 2/3 ordering |
| **C-064** | **Resolved by C-086:** Trait eligibility vs potency (chemistry = potency only) | Phase 2 awards |

### Decisions for Almanac (0)

No STEP4 decisions affect Almanac. It's a read-only consumer of data produced by the other three modes.

### Cross-Cutting Decisions (4 unique IDs)

| ID | Decision | Gospel Section |
|----|----------|---------------|
| C-045 | "The Spine" architecture spec needed | Preamble to all 4 gospels OR standalone 5th doc |
| C-050 | DEEP_DIVE outdated — annotate | Process cleanup |
| C-054 | Traits hidden on farm, revealed at call-up | Shared: Mode 1 (assignment) + Mode 2 (call-up reveal) |
| C-091 | FEATURE_WISHLIST contraction → "removed" | Process cleanup |

---

## SECTION 3: V2 Material (Quarantine Candidates)

These features are referenced in specs but explicitly out of v1 scope:

| Feature | Source Spec | Disposition |
|---------|------------|-------------|
| Contraction | OFFSEASON, GOSPEL, FIGMA | REMOVED from v1 (C-041) |
| Salary cap (hard/soft) | LEAGUE_BUILDER, SALARY | Out of v1 (C-051) |
| Cloud sync / accounts | FRANCHISE_MODE | Future |
| Franchise templates | FRANCHISE_MODE | Future |
| Archive vs Delete franchise | FRANCHISE_MODE | Future |
| AI Game Simulation (full) | GAME_SIMULATION_SPEC | AI-only kept; full sim V2 |
| Arbitration | OFFSEASON rules | Not in v1 |
| Revenue sharing | LEAGUE_BUILDER rules | Not in v1 |
| Expansion contraction toggle | LEAGUE_BUILDER rules | Removed (C-072) |
| Sound effects / animations | OFFSEASON ceremonies | Polish layer, V2 |
| Multiplayer turn management | OFFSEASON interaction | V2 |

---

## SECTION 4: Shared Specs (Feed Multiple Gospels)

These specs contribute to more than one gospel and need careful partitioning during drafting:

| Spec | Mode 1 | Mode 2 | Mode 3 | Almanac |
|------|--------|--------|--------|---------|
| FRANCHISE_MODE_SPEC.md | Save slot creation | Active franchise mgmt | Season archive | Cross-season queries |
| SALARY_SYSTEM_SPEC.md | Initial salary | In-season rules | Triple recalc | Career earnings |
| FARM_SYSTEM_SPEC.md | Startup draft | Call-ups/options | Farm reconciliation | — |
| TRADE_SYSTEM_SPEC.md | — | In-season trades | Offseason trades | Trade history |
| PERSONALITY_SYSTEM_SPEC.md | Assignment | Behavior effects | FA destinations | — |
| SCOUTING_SYSTEM_SPEC.md | Startup scouting | — | Draft scouting | — |
| PROSPECT_GENERATION_SPEC.md | Startup pool | — | Annual draft class | — |
| FAN_MORALE_SYSTEM_SPEC.md | — | In-season morale | EOS modifier | — |
| DYNAMIC_DESIGNATIONS_SPEC.md | — | In-season designations | Award-driven changes | Career designations |
| SCHEDULE_SYSTEM_FIGMA_SPEC.md | Schedule setup/config | In-season schedule view | — | — |

**Note on SCOUTING_SYSTEM_SPEC.md:** Scouting is active in Mode 1 (startup draft) and Mode 3 (annual draft). Mode 2 only consumes the call-up reveal ceremony (C-054) — scouted grades replaced by true ratings when a prospect is promoted. This narrow touchpoint is handled within FARM_SYSTEM_SPEC's call-up logic, not as a standalone Mode 2 scouting feature.

---

## SECTION 5: Decision ID Reconciliation

All 62 unique IDs from STEP4_DECISIONS.md accounted for:

| Category | IDs | Unique IDs |
|----------|-----|------------|
| Mode 1 | C-070, C-071, C-072, C-073, C-074, C-075, C-076, C-077, C-078, C-087 | 10 |
| Mode 2 | C-002, C-004, C-005, C-011, C-017, C-025, C-027, C-033, C-047, C-048, C-055, C-056, C-057, C-058, C-061, C-062, C-065, C-067, C-068, C-069, C-079, C-080, C-081, C-082, C-084, C-088, C-089, C-092, C-093 | 29 |
| Mode 2 doc gaps | C-059, C-060 | 2 |
| Mode 3 | C-041, C-042, C-043, C-044, C-046, C-049, C-051, C-052, C-053, C-066, C-083, C-085, C-086, C-090, C-094 | 15 |
| Mode 3 resolved | C-063, C-064 | 2 |
| Cross-cutting | C-045, C-050, C-054, C-091 | 4 |
| **Total** | | **62 ✓** |

---

## SECTION 6: Drafting Order Recommendation

**Draft gospels in this order:**

1. **MODE_1_LEAGUE_BUILDER.md** — Smallest scope, cleanest inputs. 13 specs, 10 unique decision IDs.
2. **MODE_3_OFFSEASON_WORKSHOP.md** — Well-defined phases, mostly self-contained. 17 specs, 17 unique decision IDs. 13-phase structure from C-049 is the main structural change.
3. **MODE_2_FRANCHISE_SEASON.md** — Largest and most complex. Benefits from Mode 1 (what enters the season) and Mode 3 (what the season feeds into) being already locked. 38 specs, 31 unique decision IDs.
4. **ALMANAC.md** — Simplest. Read-only consumer. Draft last since it just references what the other three produce. 2 specs, 0 decisions.

**Estimated effort per gospel:**

| Gospel | Input Specs | Unique Decision IDs | Est. Length | Complexity |
|--------|------------|---------------------|-------------|------------|
| Mode 1 | 13 | 10 | ~4,000 lines | Medium |
| Mode 2 | 39 | 31 | ~8,000 lines | High |
| Mode 3 | 17 | 17 | ~5,000 lines | Medium-High |
| Almanac | 2 | 0 | ~500 lines | Low |

---

## SECTION 7: Supplementary Design Notes

### 7.1 Franchise Type & Team Control (FRANCHISE_TYPE_DESIGN_NOTE.md)

Defines how Solo (1P), Couch Co-Op (multiplayer), and Custom franchise types work across all three modes. Key additions:

- `controlledBy: 'human' | 'ai'` flag per team (Mode 1)
- Hybrid standings: full events for human games, score-only for AI-vs-AI (Mode 2)
- Offseason phase scope: `all-teams` vs `human-only` per phase (Mode 3)
- Full lineup/roster control over all teams regardless of flag (commissioner role)
- AI-vs-AI score entry for standings completeness and playoff seeding
- All-Star selection with partial data approach
- Couch Co-Op = pure scorebook, no AI logic needed

**Feeds:** Mode 1 (franchise type config), Mode 2 (standings/schedule/narrative scoping), Mode 3 (phase scope gating)

### 7.2 Open Question: The Spine (C-045)

Does "The Spine" become:
- **(A)** A 5th standalone document (SPINE_ARCHITECTURE.md) that all 4 gospels reference, or
- **(B)** A shared preamble section that appears at the top of each gospel?

Option A is cleaner for DRY. Option B guarantees every gospel is fully self-contained. Recommend A.

---

*This map is the consolidation blueprint. Each gospel draft pulls from the specs listed above, applies the corresponding STEP4 decisions, integrates the Franchise Type design note, and becomes the single source of truth for that mode. All 62 decision IDs verified present. All files on disk accounted for.*
