# Mode 3 v1 Reconciliation and Decision Worksheet

**Status:** Draft for user review  
**Created:** 2026-05-26  
**Scope:** Mode 3 Offseason Workshop only, with Mode 2 handoff inputs and Mode 3 to next Mode 2 handoff outputs where Mode 3 owns the transition.  
**Decision state:** No final scope lock is made in this document. Codex proposes; user approves, modifies, rejects, or discusses each item before any Mode 3 v1 scope doc or implementation roadmap is created.

## 1. Executive summary

Mode 3 is the structured between-season Offseason Workshop. The canonical Mode 3 source requires a 13-phase sequence: season-end processing, awards, ratings and salary recalculation, optional expansion/stadium changes, retirements, free agency, draft, two additional salary recalculation passes, offseason trades, farm reconciliation, chemistry rebalancing, and finalize/advance into the next Mode 2 season.

The repo already has useful offseason infrastructure: an offseason state store, visible franchise offseason tabs, ratings/salary recalculation adapter, selected-player retirement apply, retirement ceremony preview/provenance, farm and roster movement utilities, Phase 11-style roster validation/actions, transaction logging for selected roster/retirement actions, season summaries, transition journals, and a journaled season transition orchestrator.

The repo evidence is uneven. Free agency, draft, and trade adapters are explicitly dry-run/read-only. Farm reconciliation and chemistry tabs are placeholder/copy only. Awards persist selections but candidate source and full rewards are ambiguous. Season summaries intentionally store placeholders for awards, milestones, fan morale, narrative, and park factors. The transition orchestrator is valuable but currently generates a new-season schedule, which conflicts with the accepted Mode 1/Mode 2 decision that franchise schedules must be empty/manual/user-supplied, never generated.

This worksheet is a reconciliation and decision surface only. It does not approve implementation, reject gospel scope, or create a roadmap. Each decision separates source requirement, repo evidence, recommendation, confidence, and user decision so the user can approve, modify, reject, or discuss item by item.

## 2. Source hierarchy

1. **Primary Mode 3 authority:** `spec-docs/MODE_3_OFFSEASON_WORKSHOP.md`
2. **Salary authority where Mode 3 owns salary recalculation:** `spec-docs/SALARY_SYSTEM_SPEC_UPDATED.md`, plus Mode 3 §5.5, §10, §12, §16.3
3. **Explicit Mode 3 cross-references from the gospel:** `SPINE_ARCHITECTURE.md`, `FARM_SYSTEM_SPEC.md`, `TRADE_SYSTEM_SPEC.md`, `PERSONALITY_SYSTEM_SPEC.md`, `SCOUTING_SYSTEM_SPEC.md`, `PROSPECT_GENERATION_SPEC.md`, `ALMANAC.md`
4. **Accepted handoff constraints:** `MODE_1_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md` and `MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md`
5. **Repo evidence summaries:** `FRANCHISE_REPO_IMPLEMENTATION_INVENTORY.md` and `FRANCHISE_REPO_SPEC_CROSSWALK.md`
6. **Targeted repo evidence:** `src/utils/offseasonStorage.ts`, `src/src_figma/hooks/useOffseasonState.ts`, `src/src_figma/app/pages/FranchiseHome.tsx`, `src/src_figma/app/components/SeasonEndFlow.tsx`, `src/src_figma/app/components/AwardsCeremonyFlow.tsx`, `src/src_figma/app/components/RatingsAdjustmentFlow.tsx`, `src/utils/franchiseRatingsSalaryAdapter.ts`, `src/utils/franchiseRetirementAdapter.ts`, `src/utils/franchiseRetirementCeremony.ts`, `src/utils/franchiseFreeAgencyAdapter.ts`, `src/utils/franchiseDraftAdapter.ts`, `src/utils/franchiseTradeAdapter.ts`, `src/utils/franchiseFarmStorage.ts`, `src/utils/franchiseRosterMovement.ts`, `src/utils/franchisePhase11RosterPlanner.ts`, `src/utils/franchisePhase11RosterActions.ts`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx`, `src/utils/franchiseSeasonSummaryStorage.ts`, `src/utils/franchiseSeasonTransitionOrchestrator.ts`, `src/utils/franchiseTransitionJournal.ts`, `src/utils/transactionStorage.ts`, `src/utils/franchiseStorage.ts`, relationship/fan-morale/designation engines and related tests.
7. **Recent D/R/C checkpoint docs:** implementation evidence only. They do not define Mode 3 v1 scope.

## 3. Mode 1/Mode 2 handoff assumptions carried into Mode 3

These assumptions are carried from the Mode 1 and Mode 2 worksheets and should not be re-decided here unless the user explicitly reopens them.

- Mode 1 copies franchise data into franchise-owned save state; Mode 3 must operate on franchise-owned players, teams, farm records, schedules, stats, summaries, and transaction logs.
- Franchise schedules must never be generated. Empty startup, manual SMB4 schedule entry, and user-supplied CSV rows are acceptable. This also applies to the next-season handoff after Mode 3.
- Mode 2 provides completed game records, schedule status, standings, regular-season stats, playoff data if applicable, season summaries, WPA/Manager Moments where available, and only proven derived data.
- No AI game simulation is included in v1.
- Farm teams do not play games. Farm players may have scouting/reveal, morale, options, roster movement, draft, and transaction state, but no simulated farm stats.
- Trades are required for Mode 3 v1 consideration, but no AI trade logic and no salary matching are accepted special constraints for v1.
- Salary must follow `SALARY_SYSTEM_SPEC_UPDATED.md`; there is no luxury tax logic and no salary cap logic.
- Dynamic designations are required for v1 consideration and depend on stabilized upstream stats, WPA/Manager Moments, value, morale, and designation inputs.
- WPA and Manager Moments may feed awards, value, and designation decisions where appropriate, but their existence does not automatically approve every derived award/designation system.
- Recent offseason adapter work is implementation evidence only. Preview/dry-run adapters do not mean the corresponding Mode 3 feature is approved or complete.
- v1 is internal-use only. Stability, truthfulness, auditability, and recoverability outrank public polish, ceremony completeness, and animation depth.

## 4. Decision table

| Decision ID | Feature | Spec source/section | Repo status summary | Codex recommendation | Confidence | One-line rationale | User decision | User notes |
|---|---|---|---|---|---|---|---|---|
| M3-D001 | Mode 2 to Mode 3 transition and season summary ingestion | Mode 3 §1.4, §3, §15.3; Mode 2 handoff | Partial. Begin-offseason and season summary stores exist, but summary placeholders remain for awards, milestones, fan morale, narrative, and park factors. | Include core handoff, gate derived fields | Medium-high | Mode 3 needs a trustworthy snapshot, but placeholders must be labeled and not treated as data. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D002 | 13-phase offseason phase/state machine | Mode 3 §2, §18.3 | Partial/drifted. Repo state machine has 11 legacy phases, not the gospel 13-phase structure with separate salary passes and finalize separation. | Must discuss and likely modify | High | A phase mismatch can corrupt user expectations and adapter gating. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D003 | Save/load/resume for offseason state | Mode 3 §1.4, §2.3, §18.1 | Mostly present for phase state. Per-phase data completeness varies. | Must include for approved phases | High | Internal-use v1 still needs interruption-safe offseason progress. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D004 | Phase 1 season-end processing | Mode 3 §3 | Partial. SeasonEndFlow and summaries exist; championship morale/fame/mojo/MVP persistence is not fully proven. | Include core archive/confirmation; discuss bonuses | Medium | Season end is the entry gate, but several dramatic/derived effects are unproven. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D005 | Awards, watchlists, honors, and trait rewards | Mode 3 §4; §16.2 | Partial. Ceremony UI and save path exist; candidate source, 13-category completeness, trait rewards, and Captain/designation persistence are ambiguous. | Discuss scope split | Medium | Awards are gospel, but current franchise correctness is not proven. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D006 | EOS ratings recalculation | Mode 3 §5.1-§5.4 | Partial. Adapter recalculates grade/salary, but raw performance-based rating deltas and manager-distributed bonus/penalty points are not proven. | Modify for v1 truthfulness | High | Current adapter should not be presented as full ratings adjustment. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D007 | Full salary system behavior and triple recalculation | Mode 3 §5.5, §10, §12, §16.3; Salary spec updated | Partial. Salary engine and grade/salary writes exist; triple phase lifecycle, performance inputs, rookie locks, FA/trade integration, and payroll morale are incomplete. | Must include formula authority; discuss lifecycle breadth | Medium-high | Salary is required, but "full salary system" is broader than current writes. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D008 | Optional expansion and stadium changes | Mode 3 §6 | Guarded/skip-only in franchise flow. | Defer or explicitly simplify | High | It is optional in the gospel and not mutation-ready. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D009 | Retirement preview/execution/ceremony | Mode 3 §7 | Partial but strongest mutation phase after salary/finalize. Dry-run, selected apply, farm-record removal, transaction logging, rollback, and ceremony preview exist. | Include limited selected-player retirement | High | A truthful limited version is viable; full ceremony/probability side effects are not. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D010 | Retirement transaction metadata/provenance | Mode 3 §7.4, §18.2; checkpoint evidence | Partial to mostly present for ceremony-selected apply. Provenance fields and validation exist; ceremony planner itself is no-write/read-only. | Include for any retirement mutation | High | If retirements mutate state, provenance is part of recoverability. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D011 | Free agency | Mode 3 §8; Personality spec | Preview/read-only. Adapter explicitly rejects apply/commit and defers destination, dice execution, exchange, movement, morale, contract, and narrative systems. | Discuss; likely require new limited v1 mutation scope | High | Gospel requires FA, but repo has advisory evidence only. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D012 | Draft, prospect generation, scouting, and farm handoff | Mode 3 §9; Scouting/Prospect specs | Preview/read-only. Draft adapter reports roster readiness and explicitly defers draft class generation, pick execution, player creation, farm writes, and salary recalc. | Discuss; likely require limited v1 mutation scope | High | Draft is core Mode 3, but current code does not draft anyone. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D013 | Offseason trades | Mode 3 §11; Trade spec | Preview/read-only and visible phase wiring is ambiguous. Adapter rejects execution and defers movement, transactions, morale/chemistry, injuries, and AI. | Must include some user-executed trade path if approved v1 keeps trades | High | Special context says trades are required, but current implementation is not executable. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D014 | Farm roster transitions and Phase 11 roster lock/cut/sign | Mode 3 §13, §15; Farm spec | Mostly complete mechanically in finalize/correction surfaces. Farm reconciliation tab itself is placeholder. | Include mechanical roster lock/actions; discuss standalone phase | Medium-high | Roster validation/actions are strong, but Phase 11 gospel UI/state is not. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D015 | Roster movement, releases, signings, call-ups, send-downs | Mode 3 §13, §15; Farm spec | Partial to mostly complete for call-up/send-down and selected correction actions. Broad release/signing/DFA/free-agent mutation coverage is not complete. | Include proven movement only; discuss release/signing breadth | Medium-high | Movement utilities are useful, but not a complete roster-market system. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D016 | Player morale and fan morale offseason effects | Mode 3 §3, §5.4, §11.6, §13.2, §16.1; Fan morale spec | Engines/UI pieces exist, but durable franchise fan morale and summary/carryover are not wired; player morale is partial. | Defer broad effects or require minimal auditable fields | Medium-high | Morale is cross-cutting and currently not a durable Mode 3 system. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D017 | Personality and chemistry offseason effects | Mode 3 §8, §11, §14, §16.1-§16.2 | Data fields and engines exist; chemistry phase is placeholder; trait potency and personality-driven outcomes are not proven in franchise flow. | Preserve inputs; discuss effects | Medium-high | Personality/chemistry must not be implied by stored labels alone. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D018 | Relationships offseason effects | Mode 3 §11.6, §14, §16; relationship/farm specs | Implemented engine/storage, but franchise wiring is ambiguous and chemistry tab is placeholder. | Defer durable effects unless narrow scope is approved | Medium-high | Existing relationship code is not a proven Mode 3 franchise lifecycle. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D019 | Dynamic designations carryover/locking | Mode 3 §4, §8.2, §16.1; Dynamic designations spec | Partial. MVP/Ace/Fan Favorite/Albatross engines exist, but badges, notifications, carryover, Captain, Fan Hopeful, and lock behavior are unproven. | Discuss required minimal designation contract | Medium | Special context says designations are required, but dependencies are unstable. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D020 | Milestones and franchise history updates | Mode 3 §3, §15.3; Almanac; milestone systems | Partial. Detection exists, but franchise first/leader storage is explicitly stubbed and season summary milestone payload is placeholder. | Include only proven detection/archive; defer first/leader claims | High | History should be truthful; stubbed storage cannot be called complete. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D021 | Narrative, news, and reporter outputs | Mode 3 §3, §7, §8, §11, §15.3; Personality/reporter systems | Partial. Reporter/commentary/game story storage exists; Mode 3 narrative side effects and summary persistence are placeholder or deferred. | Include optional notes only where already stored; discuss rich outputs | Medium | Narrative is valuable but should not hide missing state changes. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D022 | Transaction logging and rollback behavior | Mode 3 §18.2; Spine event streams | Partial. Transaction log exists for selected roster/retirement/Phase 11 actions; FA/draft/trade are preview-only; rollback is compensating, not atomic. | Must include for all approved mutations | High | Internal v1 needs recoverability more than polish. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D023 | Mode 3 to next Mode 2 season handoff | Mode 3 §1.4, §15, §18.2 | Partial. Journaled transition, aging engine, metadata update, and summary creation exist; new-season schedule generation conflicts with accepted schedule policy. | Include only after schedule-generation conflict is resolved | High | The handoff is essential, but generated schedules are not acceptable. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |
| M3-D024 | Internal-use constraints and no-public-polish assumptions | User special context; Mode 3 §2.4 | Not a code feature. Current UI has some ceremony pieces, but many are incomplete. | Approve as v1 operating principle | High | v1 should privilege truthful labels, audit trails, and manual correction over spectacle. | [ ] approve [ ] modify [ ] reject [ ] discuss |  |

## 5. Detailed decision sections

### M3-D001: Mode 2 to Mode 3 transition and season summary ingestion

**What the spec asks for:** Mode 3 begins after the final scheduled game and optional playoffs complete. Phase 1 consumes final standings, playoff/champion data, stats, game headers, and season archive inputs before offseason mutation begins.

**What appears to exist in the repo:** `FranchiseHome.tsx` can begin offseason. `franchiseSeasonSummaryStorage.ts` builds a franchise season summary from franchise schedule games, completed games, standings, season stats, playoff data, and offseason state. Inventory and crosswalk mark season summary handoff as implemented with placeholders.

**What is ambiguous or unproven:** The summary intentionally stores placeholders for awards, milestones, fan morale, narrative, and park factors. It should not be treated as a complete Mode 2 output package. Exact championship Fame/morale/postseason MVP persistence is also unproven.

**v1 inclusion recommendation:** Include the core handoff snapshot for schedule, completed games, standings, stats, and playoffs. Gate or label all derived placeholder fields.

**Consequences of including:** Mode 3 starts from a stable, inspectable season snapshot.

**Consequences of deferring:** Offseason phases would need to query live season stores directly and could lose auditability.

**Dependencies:** Completed Mode 2 season, canonical `franchiseId`, `seasonId`, `statsScopeId`, completed game archive, standings, playoff storage if used.

**Test confidence:** Medium-high for core snapshot fields; low for placeholder-derived systems.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Mode 3 v1 must ingest a scoped Mode 2 season summary for core season facts. Derived fields are included only when the upstream Mode 2 system is approved/proven; placeholders must be labeled or omitted, not treated as completed data.  

### M3-D002: 13-phase offseason phase/state machine

**What the spec asks for:** Mode 3 uses 13 sequential, non-skippable phases except optional Phase 4. The gospel separates salary recalculation passes at Phases 3, 8, and 10, Farm Reconciliation at Phase 11, Chemistry Rebalancing at Phase 12, and Finalize & Advance at Phase 13.

**What appears to exist in the repo:** `offseasonStorage.ts` defines an 11-phase legacy sequence: standings, awards, ratings, contraction/expansion, retirements, free agency, draft, farm reconciliation, chemistry, trades, spring training. `FranchiseHome.tsx` maps these phases to tabs and maps `TRADES` to `"spring-training"`, while farm and chemistry panels are "Coming Soon."

**What is ambiguous or unproven:** The repo does not currently model the gospel 13-phase sequence. The two additional salary recalc phases are not represented as phases. Finalize/advance is blended with spring training/finalize surfaces rather than matching the gospel structure.

**v1 inclusion recommendation:** Must discuss. If approved, Mode 3 v1 should adopt the 13-phase gospel labels/state contract or explicitly document a v1 simplification that preserves data correctness.

**Consequences of including:** Phase gating, save/resume, and user review align with the canonical Mode 3 source.

**Consequences of deferring:** Existing 11-phase flow risks approving or skipping the wrong work, especially salary recalc, trades, farm reconciliation, and finalization.

**Dependencies:** Offseason state storage, phase UI tabs, adapter phase validation, save/resume, transition journal.

**Test confidence:** High that current repo is 11-phase; low that it matches the gospel 13-phase contract.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Mode 3 v1 should use the gospel 13-phase offseason state contract or an explicitly documented v1 phase map that preserves the same data checkpoints. Salary recalculation passes, trades, farm reconciliation, chemistry, and finalize/advance must not be hidden inside ambiguous legacy phases.  

### M3-D003: Save/load/resume for offseason state

**What the spec asks for:** Offseason state persists after each phase and resumes at the last incomplete phase if the app closes mid-offseason.

**What appears to exist in the repo:** `offseasonStorage.ts` stores offseason state with current phase, completed phases, franchise id, season id, and status. `useOffseasonState.ts` loads, starts, completes, and advances phases. Inventory lists offseason phase state as implemented and wired.

**What is ambiguous or unproven:** Per-phase data varies widely. A saved phase state does not prove that awards, FA, draft, trades, chemistry, or farm reconciliation have complete persisted outputs.

**v1 inclusion recommendation:** Must include for every approved phase. Resume should be honest about incomplete/placeholder phase data.

**Consequences of including:** Users can stop mid-offseason without losing progress.

**Consequences of deferring:** A long internal-use offseason becomes brittle and unsafe.

**Dependencies:** Phase state machine decision, per-phase data stores, transaction/journal records for mutation phases.

**Test confidence:** High for basic phase state; medium-low for phase-specific save completeness.

**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Mode 3 v1 must save/load/resume offseason progress for every approved phase. Phase state must distinguish completed, pending, skipped/optional, failed, and needs-attention states where relevant, and mutation phases need durable transaction/journal evidence.  

### M3-D004: Phase 1 season-end processing

**What the spec asks for:** Finalize standings, resolve tiebreakers, handle postseason MVP if playoffs occurred, apply championship Fame and morale boosts, reset mojo, archive season data, and show a phase summary.

**What appears to exist in the repo:** `SeasonEndFlow.tsx` has standings/MVP/champions/mojo/archive/done screens and references championship morale handling. Season summary storage archives schedule, completed games, standings, stats, and playoffs. Inventory marks phase 1 as partial.

**What is ambiguous or unproven:** Actual player Fame/morale writes, all-player mojo reset, postseason MVP rating bonuses, and final standings lock are not fully proven as franchise-owned durable writes.

**v1 inclusion recommendation:** Include core archive/confirmation and require truthful limitations for any bonus/reset not actually persisted.

**Consequences of including:** Mode 3 has a clear entry ceremony and archive checkpoint.

**Consequences of deferring:** Offseason could begin without a trusted season close.

**Dependencies:** Mode 2 completed-season detection, standings, playoff/champion data, player store, morale/fame/mojo fields if included.

**Test confidence:** Medium for flow and archive; low-medium for all side effects.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Include Phase 1 season-end archive/confirmation as required. Championship/postseason bonuses, fame/morale/mojo changes, postseason MVP effects, and narrative outputs are included only where the underlying systems are approved/proven and transaction/journaled.  

### M3-D005: Awards, watchlists, honors, and trait rewards

**What the spec asks for:** Thirteen award screens, league leaders, Gold/Platinum/Booger Gloves, Silver Sluggers, Reliever, Bench Player, ROY, Cy Young, MVP, Manager of the Year, special value awards, trait rewards through wheel spins, and Team Captain designation.

**What appears to exist in the repo:** `AwardsCeremonyFlow.tsx` exists and can save awards via offseason state. `FranchiseHome.tsx` has awards copy and regular-season award-race placeholders. `transactionStorage.ts` has award logging helpers. Crosswalk says candidate source may use `useOffseasonData` rather than obvious franchise-owned data.

**What is ambiguous or unproven:** Full 13-category candidate generation, award formulas, user override, trait rewards, chemistry potency, Team Captain persistence, watchlist carryover, and franchise-owned candidate source are not proven.

**v1 inclusion recommendation:** Discuss scope split. At minimum, keep awards/honors only if candidate data is franchise-owned and rewards are either implemented or clearly disabled.

**Consequences of including:** Offseason has an important recognition/history layer and can feed designations, traits, salary, Fame, and Almanac.

**Consequences of deferring:** Mode 3 loses a major ceremony phase and downstream awards/history inputs.

**Dependencies:** Season stats, WAR/WPA/Manager Moments, team/player stores, trait system, chemistry potency, transaction/honor storage, Almanac.

**Test confidence:** Medium for a flow existing; low for full gospel awards/rewards.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Awards/watchlists/honors are a v1 goal, but candidate generation and winner logic must be audited against approved Mode 2 inputs, especially WPA for shorter seasons. Trait rewards, Captain/designation persistence, and chemistry effects are included only if their mutation paths are stable, scoped, and journaled.  

### M3-D006: EOS ratings recalculation

**What the spec asks for:** Performance-based rating adjustments using WAR percentile vs salary percentile, position detection, grade factor, morale modifier, rating caps, player/manager adjustments, and immediate post-adjustment salary recalculation.

**What appears to exist in the repo:** `franchiseRatingsSalaryAdapter.ts` recalculates overall grade and salary for franchise-owned players and can apply writes with rollback. It does not change raw ratings. Its calculation version states "grade-salary-only."

**What is ambiguous or unproven:** Performance-based raw rating deltas, manager-distributed bonus/penalty points, fan morale modifier, season-stat inputs, and position-detection algorithm are not implemented by the inspected adapter.

**v1 inclusion recommendation:** Modify for v1 truthfulness. Either approve a limited "grade/salary refresh only" or require the full ratings-adjustment system before calling Phase 3 complete.

**Consequences of including:** Player quality/economic state can evolve after the season.

**Consequences of deferring:** Player ratings remain static and salary recalc loses one of its key inputs.

**Dependencies:** Season stats/WAR, salary data, fan morale if used, player ratings, grade engine, salary engine, transaction/audit log.

**Test confidence:** High for current grade/salary adapter; low for full EOS ratings spec.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Mode 3 v1 must distinguish grade/salary recalculation from true raw ratings adjustment. Full EOS ratings recalculation is a required design goal only if performance-based raw rating deltas, manager-adjusted points, and auditability are implemented. Until then, existing grade/salary-only recalculation must be labeled as such.  

### M3-D007: Full salary system behavior and triple recalculation

**What the spec asks for:** Salaries recalculate at Phase 3, Phase 8, and Phase 10. The updated salary spec defines rating-based base salary, position multiplier, age, traits, performance, Fame, personality modifier only when joining a new team, pitcher/DH/two-way handling, minimum salary, no cap/luxury tax, rookie draft-round salary locks, and payroll/fan morale pressure where approved.

**What appears to exist in the repo:** `salaryCalculator.ts` and salary tests exist. `franchiseRatingsSalaryAdapter.ts` writes salary and grade. Crosswalk marks the salary formula mostly complete and salary updates/payroll morale partial. Mode 3 currently lacks separate Phase 8 and Phase 10 state.

**What is ambiguous or unproven:** Triple recalculation lifecycle, salary calculation with season performance/expectations, draft-round rookie salary locks, FA joining-team personality modifier, post-draft and post-trade passes, and payroll morale effects are not proven end-to-end.

**v1 inclusion recommendation:** Must include salary formula authority from `SALARY_SYSTEM_SPEC_UPDATED.md`. Separately decide whether v1 includes only existing grade/salary refresh or the full triple-recalc lifecycle.

**Consequences of including:** Economic data stays aligned with ratings, roster changes, and draft/trade/free-agency outcomes.

**Consequences of deferring:** Salary, True Value, FA exchange, trades, fan morale, and value awards become unreliable.

**Dependencies:** EOS ratings, draft, FA, trades, rookie salary rules, season stats, Fame, traits, chemistry potency if used.

**Test confidence:** Medium-high for base salary engine; low-medium for full Mode 3 lifecycle.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Salary system is required for v1 and must follow SALARY_SYSTEM_SPEC_UPDATED.md with no luxury tax/cap logic. If the spec requires multiple offseason recalculation passes, those passes must be represented in the phase/state contract or explicitly simplified with truthful labels. Salary outputs must feed approved value/designation/free-agency/trade/draft/offseason decisions where applicable.  

### M3-D008: Optional expansion and stadium changes

**What the spec asks for:** Optional expansion draft and optional stadium changes in Phase 4. If neither applies or the user skips, the phase advances.

**What appears to exist in the repo:** `FranchiseHome.tsx` describes contraction/expansion as deferred and skip-only. Inventory/crosswalk mark expansion/stadium as guarded/blocked or not proven as franchise mutation.

**What is ambiguous or unproven:** Expansion draft, new-team player movement, salary ledger initialization, stadium-change persistence, and park-factor effects are not proven.

**v1 inclusion recommendation:** Defer or simplify to skip-only unless the user wants optional v1 expansion/stadium work.

**Consequences of including:** Offseason can alter league structure and stadium identity.

**Consequences of deferring:** Core season-to-season loop remains simpler; optional gospel content is not available.

**Dependencies:** Mode 1 league/team templates, player movement, salary ledger, schedule/team identity, park factors.

**Test confidence:** High that current franchise flow is not mutation-ready.

**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Post-v1. Do not implement expansion or stadium changes as Mode 3 mutation paths in v1. Preserve existing stadium/park-factor identity and analytics, but do not mutate franchise structure through expansion.  

### M3-D009: Retirement preview/execution/ceremony

**What the spec asks for:** Age-based retirement probability table, reveal animation, announcements, no-retirement path, jersey retirement decisions, ceremony, retired-player database, salary removal, and possible draft reactivation.

**What appears to exist in the repo:** `franchiseRetirementAdapter.ts` computes age-risk candidates, supports explicit selected-player apply, marks players retired, removes farm records, logs transactions, and attempts rollback on failure. `franchiseRetirementCeremony.ts` provides deterministic no-write ceremony planning. `RetirementFlow.tsx` bridges ceremony selection into explicit confirmation.

**What is ambiguous or unproven:** Full probability formula with performance, salary, career, hidden Resilience, injury, championship modifiers; jersey retirement write; narrative/news/milestone side effects; replacement player generation; retired-player database; and un-retirement into draft are not complete.

**v1 inclusion recommendation:** Include limited selected-player retirement with clear labels and provenance. Do not call it the full gospel retirement phase unless side effects are approved and implemented later.

**Consequences of including:** Mode 3 can remove retired players safely and visibly.

**Consequences of deferring:** Aging roster turnover depends on manual edits or later phases.

**Dependencies:** Franchise player/farm stores, transaction log, retirement provenance, salary removal, Phase 11 roster correction.

**Test confidence:** High for limited selected-player apply; low-medium for full retirement ceremony/system.

**User decision:** [ ] approve [x] modify [ ] reject [ ] discuss  
**User notes:** Mode 3 v1 includes retirement preview, selected-player retirement execution, and approved ceremony-to-confirmation flow where stable. Retirement mutations require explicit confirmation, canonical context, eligibility validation, farm cleanup for FARM retirees, transaction logging, and rollback reporting. Defer jersey retirement, replacement generation, durable ceremony persistence/rerolls, and rich narrative side effects unless separately approved.  

### M3-D010: Retirement transaction metadata/provenance

**What the spec asks for:** Retirement results should be auditable in retirement records, player status, salary/career updates, transaction records, and ceremony/history outputs.

**What appears to exist in the repo:** `franchiseRetirementAdapter.ts` defines ceremony provenance input/transaction provenance, validates deterministic ceremony metadata, ensures selected ceremony player matches explicit apply selection, logs transactions, and records previous state. Recent checkpoint docs support this as implementation evidence only.

**What is ambiguous or unproven:** Retirement store/history breadth, jersey retirement provenance, narrative provenance, and full cross-store atomicity are not proven.

**v1 inclusion recommendation:** Include provenance metadata for every retirement mutation approved in v1.

**Consequences of including:** Retirement changes can be audited and repaired.

**Consequences of deferring:** A player may disappear into retired state without enough explanation or rollback context.

**Dependencies:** Transaction storage, retirement adapter, ceremony planner, player/farm rollback paths.

**Test confidence:** High for selected-player retirement provenance; medium for full retirement-history model.

**User decision:** [x] approve [ ] modify [ ] reject [ ] discuss  
**User notes:** Any retirement mutation in v1 must include scoped transaction logging and provenance. Manual and ceremony-selected retirements must be distinguishable, validated, and recoverable; malformed ceremony provenance must fail before writes.  

### M3-D011: Free agency

**What the spec asks for:** Two-round FA, protected players, dice board, personality-driven destination selection, salary/True Value matched exchange within ±20%, return-player fallback, team impact summary, transactions, morale/chemistry/narrative effects.

**What appears to exist in the repo:** `franchiseFreeAgencyAdapter.ts` creates a dice-board dry-run from franchise-owned players and team previews. It explicitly rejects apply/commit and states destination selection, dice execution, exchange, movement, morale, contract, and narrative systems are deferred.

**What is ambiguous or unproven:** No executable free agency mutation exists in the inspected evidence.

**v1 inclusion recommendation:** Discuss. If Mode 3 v1 includes FA, define a limited executable version before roadmap work. Current dry-run can be evidence/supporting UI, not the feature itself.

**Consequences of including:** League rosters change meaningfully and personality/salary systems get major use.

**Consequences of deferring:** A core Mode 3 roster redistribution phase is absent, but v1 avoids a high-risk mutation system.

**Dependencies:** Player/team stores, personality, True Value/salary, transaction log, roster validation, morale, chemistry, narrative if included.

**Test confidence:** High that current adapter is dry-run only; low for full FA.

**User decision:** [ ] approve [ ] modify [ ] reject [ ] discuss  
**User notes:**  

### M3-D012: Draft, prospect generation, scouting, and farm handoff

**What the spec asks for:** Annual generated prospect draft, inactive/retired player selection, draft class preview, order reveal, draft board, pick ceremony, all picks to farm, scouting accuracy, full A-D grade distribution, five SMB4 chemistry types, rookie salary by round, undrafted retirements, and summary.

**What appears to exist in the repo:** `franchiseDraftAdapter.ts` produces roster/farm readiness reports. It explicitly states draft class generation, pick execution, player replacement, roster mutation, and post-draft salary recalculation are deferred. Farm storage exists separately.

**What is ambiguous or unproven:** No franchise draft class generation, scouting reveal, pick execution, farm writes, draft-round salary lock, or undrafted retirement behavior is proven.

**v1 inclusion recommendation:** Discuss. If draft is approved, start with a narrow executable farm-addition contract that preserves scouting and rookie salary truths.

**Consequences of including:** Mode 3 replenishes farms and creates new player pipeline for future seasons.

**Consequences of deferring:** Farm systems stagnate and later Phase 11 roster balance becomes harder.

**Dependencies:** Prospect generation, scouting, salary spec, farm storage, player creation, draft order, transaction log, Phase 8 salary recalc.

**Test confidence:** High for current readiness dry-run; low for full draft.

**User decision:** [ ] approve [ ] modify [ ] reject [ ] discuss  
**User notes:**  

### M3-D013: Offseason trades

**What the spec asks for:** Trade window for all teams, no salary matching, two-way and three-way trade builder, proposals, confirmation, AI proposals/inbox, tradeable MLB/farm/draft-pick assets, counteroffers, player morale effects, chemistry/fan impact, history, and multiplayer veto if applicable.

**What appears to exist in the repo:** `franchiseTradeAdapter.ts` creates dry-run trade-fit previews and requested-trade previews. It rejects apply/commit, marks previews non-executable, and defers trade AI, final acceptance, movement, transactions, morale/chemistry, injuries, and salary enforcement. `FranchiseHome.tsx` maps `TRADES` to `"spring-training"`, making visible phase wiring ambiguous.

**What is ambiguous or unproven:** No executable offseason trade path exists in inspected evidence. Special decision context says trades are required for v1, but no AI trade logic and no salary matching.

**v1 inclusion recommendation:** Must include a user-executed, no-salary-matching trade mutation if the special context stands. Exclude AI trade logic for v1 unless explicitly reopened.

**Consequences of including:** Users can reshape rosters in offseason and create transaction/history/morale/designation consequences.

**Consequences of deferring:** Violates the stated special context that trades are required for v1.

**Dependencies:** Player/farm movement, transaction log, roster validation, draft-pick representation if included, morale/chemistry if included, rollback.

**Test confidence:** High that current adapter is preview only; low for executable trade.

**User decision:** [ ] approve [ ] modify [ ] reject [ ] discuss  
**User notes:**  

### M3-D014: Farm roster transitions and Phase 11 roster lock/cut/sign

**What the spec asks for:** Phase 11 Farm Reconciliation resolves farm overflows, enforces farm limit, resets options, recalculates farm morale without recent performance, and prepares teams for final 22 MLB + 10 farm lock. Phase 13 then validates every team at exactly 32 total.

**What appears to exist in the repo:** `franchiseFarmStorage.ts`, `franchiseRosterMovement.ts`, `franchiseRosterLockValidator.ts`, `franchisePhase11RosterPlanner.ts`, `franchisePhase11RosterActions.ts`, and `FinalizeAdvanceFlow.tsx` provide farm records, call-up/send-down actions, options, validation, correction actions, and visible exact roster targets. Inventory marks this as one of the stronger Mode 3 areas.

**What is ambiguous or unproven:** The dedicated farm reconciliation tab is placeholder/copy only. Full cut/sign round, unclaimed retirement, farm morale update, and standalone Phase 11 data model are not fully proven.

**v1 inclusion recommendation:** Include mechanical roster lock/correction actions if approved. Discuss whether to present as Phase 11 standalone or as a finalize-correction subset.

**Consequences of including:** Mode 3 can repair rosters before next season and enforce 22+10.

**Consequences of deferring:** Draft/FA/trade/retirement mutations can leave invalid rosters.

**Dependencies:** Farm storage, player assignments, roster movement, transaction log, rollback, draft/FA/trade/retirement outputs.

**Test confidence:** Medium-high for mechanical validation/actions; low for full standalone Phase 11 gospel.

**User decision:** [ ] approve [ ] modify [ ] reject [ ] discuss  
**User notes:**  

### M3-D015: Roster movement, releases, signings, call-ups, send-downs

**What the spec asks for:** Roster moves during offseason include releases, signings, call-ups, send-downs, final roster balancing, replacement handling, and correction flows before season advance.

**What appears to exist in the repo:** Roster movement utilities and Phase 11 actions can mutate selected player/farm states and log transactions. Team Hub farm analyzer is read-only. Regular transaction UI is guarded in Mode 2, and broad FA/trade/draft execution is absent.

**What is ambiguous or unproven:** Full release/signing system, free-agent pool signing, cut/sign round, DFA/waiver concepts, and narrative/morale warnings are not complete.

**v1 inclusion recommendation:** Include proven call-up/send-down/correction moves. Discuss release/signing breadth separately from FA and draft.

**Consequences of including:** Users can make roster legal before starting the next season.

**Consequences of deferring:** Mode 3 may be unable to recover from invalid roster counts.

**Dependencies:** Player/farm stores, transaction log, roster validator, salary recalculation for affected players if required.

**Test confidence:** Medium-high for call-up/send-down/correction; low for broad market moves.

**User decision:** [ ] approve [ ] modify [ ] reject [ ] discuss  
**User notes:**  

### M3-D016: Player morale and fan morale offseason effects

**What the spec asks for:** Championship bonuses, fan morale modifiers on positive rating adjustments, personality-driven retirement/FA/trade morale, farm morale updates, trade shock, betrayal, loyalty boosts, fan scrutiny, payroll pressure, and carryover.

**What appears to exist in the repo:** `fanMoraleEngine.ts` and UI pieces exist. `TeamHubContent.tsx` fan morale tab is placeholder/empty. `franchiseSeasonSummaryStorage.ts` excludes finalized fan morale with a placeholder. Player morale displays if present, and FA/trade adapters explicitly defer morale effects.

**What is ambiguous or unproven:** Durable franchise morale lifecycle, offseason morale updates, carryover, and use as an input to ratings/FA/trades are not proven.

**v1 inclusion recommendation:** Defer broad morale effects or approve a minimal auditable morale field/update list. Avoid using morale as a hidden modifier unless persisted.

**Consequences of including:** Offseason outcomes become more emotionally and economically reactive.

**Consequences of deferring:** Ratings/FA/trade formulas must omit or neutralize morale modifiers truthfully.

**Dependencies:** Fan morale storage, player morale fields, transaction context, championships, payroll, personality, roster movement.

**Test confidence:** Medium for engines; low for durable Mode 3 effects.

**User decision:** [ ] approve [ ] modify [ ] reject [ ] discuss  
**User notes:**  

### M3-D017: Personality and chemistry offseason effects

**What the spec asks for:** Personality informs FA destinations, retirement probability, trade morale, Team Captain selection, and hidden modifier behavior. Chemistry determines awarded trait potency, FA/trade chemistry impact previews, and Phase 12 team chemistry recalculation with SMB4 chemistry types.

**What appears to exist in the repo:** Personality and chemistry fields exist on players. Relationship/chemistry engines and roster analyzer pieces exist. Salary uses personality as an input in the salary player shape. The visible chemistry offseason tab is placeholder/copy only.

**What is ambiguous or unproven:** Hidden personality modifiers, personality-driven FA/retirement/trade effects, chemistry potency, Phase 12 recalculation writes, and salary/gameplay integration are not proven.

**v1 inclusion recommendation:** Preserve inputs. Discuss which effects are approved. Do not imply personality or chemistry behavior simply because labels exist.

**Consequences of including:** Offseason decisions feel more player-specific and can affect traits/salary/morale.

**Consequences of deferring:** FA/retirement/trade/trait systems must use neutral fallback behavior.

**Dependencies:** Mode 1 player fields, hidden modifiers, trait system, FA, trade, retirement, salary, chemistry store.

**Test confidence:** Medium for stored fields; low for full effects.

**User decision:** [ ] approve [ ] modify [ ] reject [ ] discuss  
**User notes:**  

### M3-D018: Relationships offseason effects

**What the spec asks for:** Relationships can affect morale, trade warnings, chemistry, farm stories, revenge arcs, and offseason consequences after roster movement.

**What appears to exist in the repo:** `relationshipEngine.ts`, `relationshipStorage.ts`, and hooks exist. Crosswalk notes that active franchise data appears to use an in-memory relationship hook and the franchise chemistry tab is placeholder. Relationship-driven warning/mutation flows are not proven.

**What is ambiguous or unproven:** Durable per-franchise relationship storage, MLB/farm cross-level relationship lifecycle, roster-change recalculation, narrative outputs, and relationship warning modals are incomplete.

**v1 inclusion recommendation:** Defer durable relationship effects unless the user approves a narrow auditable subset.

**Consequences of including:** Trades, demotions, call-ups, and chemistry become more nuanced.

**Consequences of deferring:** Relationships remain inert context or future flavor.

**Dependencies:** Relationship storage scoped by franchise, player identity, roster movement, morale, chemistry, narrative.

**Test confidence:** Medium for engine; low for Mode 3 franchise wiring.

**User decision:** [ ] approve [ ] modify [ ] reject [ ] discuss  
**User notes:**  

### M3-D019: Dynamic designations carryover/locking

**What the spec asks for:** Mode 3 uses and updates designations such as MVP, Ace, Fan Favorite, Albatross, Cornerstone, Captain, and Fan Hopeful. Captain is awarded in Awards phase by Loyalty + Charisma. Cornerstone affects FA retention. Designations should carry, lock, or update according to dynamic designation rules.

**What appears to exist in the repo:** `seasonEndProcessor.ts`, `teamMVP.ts`, and `fanFavoriteEngine.ts` provide some MVP/Ace/Fan Favorite/Albatross-style logic. Regular-season award-race arrays are empty in places. Crosswalk marks designation state partial/implemented-but-not-wired.

**What is ambiguous or unproven:** Full designation storage, locked/projected badges, carryover, notifications, morale effects, Captain/Fan Hopeful behavior, and dependency on WPA/Manager Moments/value are not proven.

**v1 inclusion recommendation:** Discuss required minimal contract. Special context says dynamic designations are required, but upstream data must be stabilized before broad behavior is approved.

**Consequences of including:** FA, awards, morale, and team identity gain important continuity.

**Consequences of deferring:** Downstream formulas needing designations must use neutral fallback or manual user input.

**Dependencies:** Awards, season stats/WAR/WPA, value/salary, personality hidden modifiers, morale, storage/carryover.

**Test confidence:** Medium for partial engines; low for complete lifecycle.

**User decision:** [ ] approve [ ] modify [ ] reject [ ] discuss  
**User notes:**  

### M3-D020: Milestones and franchise history updates

**What the spec asks for:** Mode 3 archives season history, awards, milestones, champions, draft picks, trades, retirees, roster changes, and history updates for Almanac consumption.

**What appears to exist in the repo:** Milestone detection and Fame aggregation exist. `franchiseStorage.ts` explicitly says it is a stub and returns null/no-op for franchise firsts/leaders. `franchiseSeasonSummaryStorage.ts` uses a milestones placeholder. Almanac/completed-game archives are otherwise strong.

**What is ambiguous or unproven:** Full franchise first/leader persistence, milestone payload in season summary, award history, draft/trade/retirement history, and cross-season Almanac integration are incomplete.

**v1 inclusion recommendation:** Include only proven archive/detection data. Defer claims about franchise firsts/leaders until storage is real.

**Consequences of including:** Users can trust historical records and future Almanac views.

**Consequences of deferring:** Some history remains display-only or recomputed, and Mode 3 cannot be a complete historical boundary.

**Dependencies:** Completed game archive, season stats, milestone storage, awards, transaction logs, draft/trade/retirement outputs.

**Test confidence:** High that first/leader storage is stubbed; medium for milestone detection.

**User decision:** [ ] approve [ ] modify [ ] reject [ ] discuss  
**User notes:**  

### M3-D021: Narrative, news, and reporter outputs

**What the spec asks for:** Championship notes, retirement/news announcements, FA/trade/draft narratives, reporter outputs, and season archive narrative entries.

**What appears to exist in the repo:** Reporter storage, commentary feed storage, game stories, reporter cache, NewsBoard/Commentary surfaces, and tests exist. Retirement and FA/trade adapters state narrative side effects are deferred. Season summaries currently use a narrative placeholder.

**What is ambiguous or unproven:** Mode 3-specific narrative generation, reporter trust/reveal behavior, cross-season carryover, and mutation-linked news entries are not proven.

**v1 inclusion recommendation:** Include only notes/outputs that are already stored by approved mutations. Discuss rich reporter behavior separately.

**Consequences of including:** The offseason gains context and a historical trail beyond raw transactions.

**Consequences of deferring:** Mode 3 remains more administrative but safer and easier to audit.

**Dependencies:** Reporter/NPC data from Mode 1, transaction log, retirement/FA/draft/trade outcomes, narrative storage.

**Test confidence:** Medium for infrastructure; low for Mode 3 side effects.

**User decision:** [ ] approve [ ] modify [ ] reject [ ] discuss  
**User notes:**  

### M3-D022: Transaction logging and rollback behavior

**What the spec asks for:** Cross-store operations for trades, retirements, draft picks, salary updates, and player movement should update player/farm/salary/history stores consistently. Internal-use v1 prioritizes recoverability.

**What appears to exist in the repo:** `transactionStorage.ts` supports transaction log entries and undo metadata. Retirement apply, roster movement, and Phase 11 actions log transactions. Ratings/salary and retirement adapters attempt compensating rollback on write failure. `FinalizeAdvanceFlow.tsx` explicitly labels rollback as compensating, not true cross-store atomicity.

**What is ambiguous or unproven:** FA/draft/trade transactions do not exist because those phases are dry-run. Full atomic multi-store rollback is not available. Salary recalc transaction coverage may be lighter than roster/retirement actions.

**v1 inclusion recommendation:** Must include for every approved mutation. Label rollback semantics honestly.

**Consequences of including:** Users can audit and repair offseason state when something goes wrong.

**Consequences of deferring:** A failed mutation can silently corrupt rosters, salaries, or history.

**Dependencies:** All mutation phases, transaction store, previous-state snapshots, rollback/journal records.

**Test confidence:** High for selected actions; low for phases that are currently preview-only.

**User decision:** [ ] approve [ ] modify [ ] reject [ ] discuss  
**User notes:**  

### M3-D023: Mode 3 to next Mode 2 season handoff

**What the spec asks for:** Finalize & Advance validates 22 MLB + 10 farm for each team, archives the season, ages players, resets/cleans state, records next-season baseline, and loads the Mode 2 dashboard for the next season.

**What appears to exist in the repo:** `franchiseSeasonTransitionOrchestrator.ts` creates a transition journal, creates a season summary, executes season transition, stages next-season schedule/metadata, updates franchise metadata, commits journal, and rolls back staged records/metadata on failure. `seasonTransitionEngine.ts` and finalize tests exist.

**What is ambiguous or unproven:** The orchestrator calls `generateNewSeasonSchedule`, conflicting with accepted no-generated-schedule policy. Exact archive breadth, awards/milestones/narrative placeholders, final salary baseline, chemistry summary, and all roster side effects are not complete.

**v1 inclusion recommendation:** Include the journaled handoff only after the schedule-generation conflict is resolved. Next Mode 2 season should start with empty/manual/user-supplied schedule state.

**Consequences of including:** The franchise loop can continue into another season.

**Consequences of deferring:** Mode 3 becomes a dead end after offseason decisions.

**Dependencies:** Valid rosters, player aging, salary baseline, season summary, transition journal, schedule policy, metadata update.

**Test confidence:** High for journaled transition foundation; high for current schedule-policy conflict; medium for complete handoff content.

**User decision:** [ ] approve [ ] modify [ ] reject [ ] discuss  
**User notes:**  

### M3-D024: Internal-use constraints and no-public-polish assumptions

**What the spec asks for:** The gospel emphasizes ceremony-first game-night interactions, while the user's v1 context emphasizes internal-use stability, truthfulness, and recoverability over public polish.

**What appears to exist in the repo:** Some ceremony UI exists for season end, awards, retirements, and previews. Many animation/dice/wheel/card expectations are incomplete or not wired to durable mutation.

**What is ambiguous or unproven:** Whether to require full ceremony completeness before approving each phase for internal v1.

**v1 inclusion recommendation:** Approve as an operating principle: internal v1 can ship a truthful, less-polished phase if the mutation/audit contract is stable and limitations are visible.

**Consequences of including:** Work can focus on reliable state changes and audit trails first.

**Consequences of deferring:** Scope may balloon into presentation polish before the season loop is trustworthy.

**Dependencies:** User acceptance of internal-use UX, clear labels, manual correction paths, recoverability.

**Test confidence:** High as a process constraint.

**User decision:** [ ] approve [ ] modify [ ] reject [ ] discuss  
**User notes:**  

## 6. Conflict/ambiguity register

**Reconciliation pause note:** User and Codex intentionally paused Mode 3 decision review after `M3-D010`. Decisions `M3-D011` through `M3-D024` remain undecided, not rejected and not approved. The pause exists because the remaining Mode 3 scope depends heavily on Mode 1/Mode 2 implementation audits and stabilization, especially salary, trades, farm dynamics, dynamic designations, awards/WPA, relationships, morale, park factors, season-summary truthfulness, and next-season handoff behavior. Resume Mode 3 only after the Mode 1/2 implementation state is clearer.

| ID | Conflict or ambiguity | Source/evidence | Why it matters | Needs decision? |
|---|---|---|---|---|
| M3-A001 | Gospel says 13 phases; repo state machine has 11 legacy phases. | Mode 3 §2; `offseasonStorage.ts` | Phase gating and save/resume do not match source of truth. | Yes |
| M3-A002 | Transition orchestrator generates new-season schedule. | Mode 1/2 accepted decisions; `franchiseSeasonTransitionOrchestrator.ts` | Generated schedules are explicitly not acceptable for franchise. | Yes |
| M3-A003 | Salary spec says real-time triggers, but Mode 3 says salary changes deferred to offseason recalc. | Salary spec updated; Mode 3 §5.1 | Need v1 rule for salary timing. User context says salary follows updated spec where Mode 3 owns it, no luxury tax. | Yes |
| M3-A004 | Current ratings/salary adapter changes grade/salary only, not raw ratings. | `franchiseRatingsSalaryAdapter.ts` | Calling this full Phase 3 would be misleading. | Yes |
| M3-A005 | FA/draft/trade adapters are dry-run only. | Adapter code and tests | Preview evidence must not become scope approval. | Yes |
| M3-A006 | Trades are required by special context, but executable trade path is missing. | User context; `franchiseTradeAdapter.ts` | A required v1 feature needs a limited mutation definition before roadmap. | Yes |
| M3-A007 | Farm reconciliation tab is placeholder while finalize has strong roster validation/actions. | Inventory; `FranchiseHome.tsx`; `FinalizeAdvanceFlow.tsx` | Need decide whether v1 accepts finalize-based correction or requires standalone Phase 11. | Yes |
| M3-A008 | Chemistry rebalancing is a gospel standalone phase, but repo tab is placeholder. | Mode 3 §14; `FranchiseHome.tsx` | Affects trait potency, salary, and roster-change consequences. | Yes |
| M3-A009 | Awards candidate source may not be franchise-owned. | Inventory/crosswalk | Awards must not accidentally read global/prototype data. | Yes |
| M3-A010 | Milestone detection exists but franchise first/leader storage is stubbed. | `franchiseStorage.ts` | History claims could be false. | Yes |
| M3-A011 | Fan morale and narrative engines exist but summaries store placeholders. | `franchiseSeasonSummaryStorage.ts` | Derived effects must be gated or neutralized. | Yes |
| M3-A012 | Relationship storage exists but franchise relationship lifecycle is not proven. | Crosswalk relationship summary | Chemistry/personality/relationship effects could be assumed from engine presence. | Yes |

## 7. Possible deferrals/simplifications register

| ID | Candidate deferral/simplification | Rationale | What remains if deferred |
|---|---|---|---|
| M3-S001 | Full ceremony polish for awards/retirements/draft | Internal-use v1 prioritizes truth and recoverability. | Plain but clear confirmation/review screens. |
| M3-S002 | Optional expansion/stadium changes | Optional gospel phase and not mutation-ready. | Skip-only Phase 4 with explicit label. |
| M3-S003 | AI trade proposals/AI trade logic | Special context says no AI trade logic. | User-executed trades only. |
| M3-S004 | Salary matching in trades | Special context says no salary matching. | Trade salary impact display only if stable. |
| M3-S005 | Full FA personality destination model | Current FA is dry-run only; personality effects need durable hidden modifiers. | Manual/limited FA movement or dice-board preview only, depending decision. |
| M3-S006 | Full generated/scouted draft ceremony | Current draft cannot generate/commit picks. | Narrow prospect creation and farm assignment if approved. |
| M3-S007 | Full farm morale/story/event system | Farm teams do not play games and morale storage is incomplete. | Roster counts/options/reveal state only. |
| M3-S008 | Durable relationship offseason effects | Relationship franchise lifecycle is unproven. | Preserve relationship data for later without applying effects. |
| M3-S009 | Franchise first/leader historical claims | Storage is stubbed. | Keep completed-game/archive detection only. |
| M3-S010 | Rich reporter/news outputs | Narrative carryover is partial. | Transaction notes and stored summaries only. |
| M3-S011 | Park-factor/adaptive-standard summaries | Summary payload currently placeholders. | Preserve stadium identity; defer analytics. |
| M3-S012 | Full payroll/fan morale consequences | Fan morale is not durable franchise state. | Salary values and value displays without morale consequences. |

## 8. Implementation-audit questions created by the reconciliation

1. What exact 13-phase enum/state migration is required, and how should existing 11-phase offseason saves be interpreted?
2. Which Mode 3 phases must be mutation-capable for v1, and which may be preview/skip-only with truthful labels?
3. Should Phase 3 v1 mean full raw rating adjustment or only the current grade/salary refresh until later?
4. How should the three salary recalculation passes be represented if Phase 8 and Phase 10 are approved?
5. What is the minimal executable trade mutation that satisfies "trades are required" while excluding AI trade logic and salary matching?
6. Is free agency required as executable v1 scope, or can the current dry-run be used only as review evidence while the feature remains undecided?
7. Is draft required as executable v1 scope, and if so what minimal player-generation/scouting/farm-write contract is acceptable?
8. Should farm reconciliation be a standalone phase UI or can the existing finalize correction workflow satisfy internal v1?
9. Which roster movement types must log transactions: call-up, send-down, release, signing, retirement, draft pick, FA exchange, trade?
10. What rollback guarantee is acceptable for internal v1: compensating rollback with repair flags, or stronger atomic transaction behavior?
11. Which awards/designations depend on WPA/Manager Moments, and which can use simpler season stats?
12. What storage owns dynamic designation carryover and locking?
13. Should fan/player morale be persisted before any formula consumes it, or should morale modifiers be neutral in v1?
14. Should chemistry trait potency affect salary in v1, or should salary use unmodified trait tiers until chemistry is durable?
15. How should next-season schedule state be created without generation: empty schedule, schedule upload prompt, or blocked advance until user supplies rows?
16. Which season summary placeholders must become real before Mode 3 can start or finish?
17. Which recent D/R/C checkpoint behaviors are acceptable as implementation evidence for the approved v1 scope?

## 9. Suggested review order for walking through decisions with the user

**Status:** Review paused after `M3-D010`. The order below is retained as a future resume aid only.

1. **Phase/state spine:** M3-D002, M3-D003, M3-D024
2. **Mode transition safety:** M3-D001, M3-D023, M3-D022
3. **Core mutation phases:** M3-D006, M3-D007, M3-D009, M3-D010, M3-D013, M3-D014, M3-D015
4. **Major missing mutation phases:** M3-D011, M3-D012
5. **Derived systems:** M3-D016, M3-D017, M3-D018, M3-D019
6. **Recognition/history/narrative:** M3-D004, M3-D005, M3-D020, M3-D021
7. **Optional scope:** M3-D008

## 10. Next recommended step before resuming Mode 3

Do not continue Mode 3 commitments yet. First convert the completed Mode 1 and Mode 2 reconciliation decisions into an implementation audit plan. That audit should identify what is already stable, what needs hardening, and what must be built for Mode 1/2 v1 before Mode 3 can truthfully consume season, roster, salary, trade, farm, designation, awards, WPA, morale, relationship, park-factor, and narrative data.
