# Franchise Mode 1/2 Playable V1 Gap Analysis

Recommended reasoning effort: high for implementation slices, medium for audits and copy-only checkpoints.

## Purpose

This document reconciles the current built Franchise foundation, manual smoke feedback, and `MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md` into a decision-ready playable-v1 hardening plan.

The conclusion is deliberately conservative:

- The technical foundation is safe enough to build on.
- The user-facing Mode 1/Mode 2 playable loop is not yet approved as complete.
- Mode 1 and Mode 2 remain the active priority until playable v1 is reviewed and approved.
- Mode 3/offseason execution remains blocked/deferred.

## Source Inputs

- `MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md`
- `FRANCHISE_INTERNAL_V1_MANUAL_SMOKE_FEEDBACK.md`
- `FRANCHISE_MODE2_V1_CONTEXT_CARD.md`
- `FRANCHISE_MODE2_V1_COMPLETION_ROADMAP.md`
- Current repo evidence from the implemented Mode 1 handoff, League Builder startup FARM/scouting path, Franchise Setup, FranchiseHome, ScheduleContent, GameTracker launch/completion, Team Hub, save-slot manifest, backup/sync registration, Mode 2 foundation utilities, and storage tests.

## Current State

The current repo has a broad, scoped Franchise foundation:

- Mode 1 can prepare/copy franchise-owned teams, players, rosters, FARM/prospect state, rules, playoff setup, salary baseline, and stadium identity.
- Mode 2 can launch from FranchiseHome, accept manual schedules and score-only results, launch GameTracker, complete/archive games, update standings, run playoffs, manage transactions, inspect Team Hub, and persist/save/delete scoped evidence.
- Advanced Mode 2 contracts now exist as read-only, preview-only, confirmation-gated, or explicitly blocked foundations for value, salary, designations, morale, relationships, random events, expected wins, stadium evidence, readiness, and handoff planning.

That foundation is technically safer than it was, and the first hardening wave has moved several smoke issues from active blockers to committed coverage:

- Core launch/persistence smoke paths were hardened for Franchise creation, GameTracker launch, manual result flow, save-slot delete, and full player-name display.
- Generated Franchise prospect/scout policy was cleaned up for no-DH identities, SMB4-backed name generation, and salary/payroll baselines.
- Team Hub now has a denser sortable roster scan table with salary, morale, scoped stats/value, and designation summaries.
- TEAM_MVP/ACE preview candidate ranking and prompt volume are bounded and preview-only.
- Team Hub finance/analysis surfaces show salary baselines and clearer True Value/Expected Wins preview-only framing.
- League Builder and Team Hub stadium source-of-truth/status copy is clearer, with spray evidence labeled as row evidence rather than fully deferred.
- A dense UI pass compacted recent surfaces and covered reachable Mode 1/2 browser smoke, while preserving a known need for repeatable seeded Team Hub/GameTracker screenshots.
- Franchise-to-Almanac continuity is now covered for approved franchise player/team/game archive evidence, save-slot manifest/export/delete behavior, and score-only boundaries.
- Archived franchise WPA/Manager Moments evidence is visible in approved read-only surfaces without adding new formulas or fabricating score-only evidence.
- Fame-event continuity is hardened for trusted completed-game no-hitter/perfect-game context and confirmation-gated fan morale prompt consumers; score-only/manual result rows remain blocked from fake fame/player-stat/WPA evidence.
- The `/__preview/franchise-v1-visual-smoke` route is dev/test gated and non-mutating/read-only. It supports repeatable iPad/desktop screenshots for the Mode 1/2 shell, Team Hub foundation/finance/stadium panels, Game Detail WPA/fame evidence, Player Instance Card WPA evidence, and GameTracker long-name display.
- Populated fixture smoke coverage, schedule editing/import hardening, trade/FARM hidden-safety and movement continuity, park-factor archive trust tightening, and the dynamic designation policy matrix/TWO-WAY boundary are now completed hardening checkpoints.

Manual smoke feedback still blocks declaring playable v1 done:

- Manual final-score entry and score-only boundaries need one more user-facing reconciliation pass before the score-only workflow can be treated as comfortable.
- Real populated production schedule-row and Team Hub roster-row visual smoke remain open because the current row-rich confidence is fixture-backed rather than proven from arbitrary user local data.
- Full seeded state harness scope remains a known follow-up.
- Schedule editing/import hardening is complete for the current manual/CSV non-generated policy, but production smoke should keep watching for usability issues.
- Trade/FARM hidden-safety and movement continuity are hardened for v1, while full trade UX, AI trades, salary matching, and offseason trade systems remain deferred.
- Archive `game.parkFactors` trust is tightened for verified SMB4 seed inputs, while custom stadium factor entry and adaptive persistence remain deferred.
- Internal-v1 TWO-WAY designation routing is explicitly pitcher-only through ACE, and older full-system designation lock/carryover wording remains subordinate to the v1 matrix.
- Broader Mode 1/2 gaps and full spec parity remain outside this completed hardening wave.

## Active Priority

Mode 1 and Mode 2 only until playable v1 is approved.

The next work should polish the remaining score-only/manual-result workflow before expanding workflows:

1. Manual final-score workflow UX polish and confirmation-gated wording.
2. Real populated production Team Hub/schedule visual smoke harness.
3. Transaction history drilldown and roster movement explainability, if manual smoke still finds the trade/FARM flow opaque.
4. Score-only history/Almanac boundary copy pass, if not fully covered by the manual final-score slice.
5. Remaining compact UI/help-affordance cleanup.

## Explicit Exclusions

These are not active playable-v1 implementation targets in this plan:

- Auto-draft is deferred/excluded. Manual smoke feedback noted auto-assign/auto-draft as testing ergonomics, but it is not part of the active Mode 1/2 playable-v1 plan.
- Mode 3/offseason execution planning is blocked/deferred, except as a boundary or handoff-readiness note.
- AI game simulation.
- Generated regular-season schedules.
- Final True Value, final salary movement, luxury tax, salary matching, or AI trade valuation.
- Relationship mutation or durable relationship state.
- Adaptive park-factor consumers, park-adjusted WAR/value, or custom/dynamic park-factor persistence.
- Automatic designation or morale mutation unless separately approved and confirmation/audit boundaries are explicit.
- Narrative/random-event generation beyond existing confirmation-gated random-event prompt records.

## Prioritized Gap Table

| Gap | Observed smoke issue | Spec/worksheet anchor | Current repo evidence | Playable-v1 requirement | Priority | Recommended first implementation slice | Audit focus | Blocked/deferred dependencies |
|---|---|---|---|---|---|---|---|---|
| Core launch/persistence smoke paths needed hardening | Creation/launch/delete/full-name smoke issues could strand the user | Mode 1 handoff assumptions; M2-D001 through M2-D007; M2-D029 | Committed slice `Harden franchise launch and persistence smoke paths` | Keep regression coverage; visual smoke still needs seeded repeatability | Completed hardening | Done | No duplicate slots, loading clears, GameTracker launch/resume, save-slot delete, full names | No AI simulation |
| Generated data policy needed cleanup | DH leaked into prospects/scouts; names were repetitive; salary baseline was unclear | Mode 1 handoff assumptions; FARM/scouting specs; M2-D021 | Committed slice `Clean up franchise generated prospect and scout data` | Keep no-DH/name/salary generation tests green | Completed hardening | Done | Deterministic SMB4 name source, no generated data churn, salary baseline counts | Auto-draft excluded |
| Team Hub roster scan was not efficient enough | User wanted sortable morale, salary, stats, designation columns | M2-D010, M2-D012, M2-D015, M2-D019, M2-D021 | Committed slice `Improve Team Hub roster scan table` | Keep hidden-safe scan table behavior and iPad-readable density | Completed hardening | Done | Hidden-safe FARM rows, stable sorting, no mutation | Relationship mutation and final designations blocked |
| MVP/Ace preview floods users | Nearly every player could receive Team MVP; negative-WAR pitcher surfaced as Team MVP | M2-D011, M2-D019; designation worksheet decisions | Committed slice `Tighten MVP and Ace designation previews`; internal-v1 policy now routes TWO-WAY as pitcher-only through ACE | Keep MVP/Ace ranking selective and preview-only | Completed hardening | Done | Negative WAR exclusion, candidate caps, no award/final language, TWO-WAY pitcher-only routing | Future stricter two-way Team MVP criteria deferred |
| Team salary/contract visibility was incomplete | Expected Wins/True Value felt disconnected without contracts/team salaries | M2-D021; salary spec | Committed slice `Show salary baselines in Team Hub analysis` | Keep salary totals and roster salary rows consistent and preview-only | Completed hardening | Done | Salary values match baseline, blocker copy clear, no recalculation controls | Finance `READ ONLY` chip polish remains |
| Stadium source of truth was unclear | User did not know where dimensions/factors came from or how to edit them | M2-D020; stadium analytics spec | Committed slice `Clarify stadium source of truth`; archive factors are trusted only when verified as SMB4 seed inputs | Keep League Builder/Team Hub source and seed-factor status clear | Completed hardening | Done | Dimension source, seed factor identity, no custom/adaptive mutation | Adaptive park-factor persistence remains blocked |
| UI density/readability needed smoke pass | Foundation/status panels were too wordy; GameTracker names could truncate; nested controls logged browser errors | Manual smoke feedback; roadmap operating rules | Committed slice `Tighten Mode 1 and Mode 2 dense UI` | Keep compact copy and readable dense rows | Completed hardening | Done | iPad/desktop readability, no overlap, no nested-button regression | None |
| Safe visual smoke preview exists; production populated smoke remains thin | Browser smoke now reaches seeded shell/foundation/WPA/fame/GameTracker long-name surfaces and fixture-backed row states, but production-shaped populated schedule/Team Hub local-data states still need confidence | Manual smoke feedback; release confidence | Committed slice `Add safe Mode 2 visual smoke preview` and populated fixture checkpoint; route is read-only/dev-test gated and has focused tests | Add a production-shaped harness or manual smoke path for populated schedule and Team Hub roster rows without unsafe demo writes | P1 Release Confidence | Real Populated Production Team Hub/Schedule Visual Smoke Harness | iPad/desktop screenshots, no hidden prospect truth, no writes to real user stores, fixture labels cannot be mistaken for production data | No auto-draft, no generated schedules, no AI simulation |
| UI is too wordy | Foundation panels and prompts are dense | Manual smoke feedback; roadmap operating rules | Many read-only panels include long explanatory copy to protect boundaries | Default surfaces should be concise; deeper explanation should move behind help/disclosure | P2 Copy/UI Cleanup | Copy/UI Cleanup: concise defaults with help affordances | Hidden-safety copy remains available, no loss of blockers, no mutation buttons | None |
| WPA/Manager WPA visibility was insufficient | User saw no visible WPA for players/managers | M2-D011, M2-D012 | Committed slice `Surface archived franchise WPA` | Keep read-only archived evidence visible and compact; score-only rows stay blocked | Completed hardening | Done | Archive identity, player/manager attribution, separation from WAR/mWAR labels | Awards/story persistence blocked |
| Franchise-to-Almanac persistence was unclear | Smoke said nothing from Franchise persisted to Almanac | M2-D006, M2-D013, M2-D014, M2-D028 | Committed slice `Persist franchise players into Almanac` | Keep approved franchise archive/player/team evidence scoped and portable | Completed hardening | Done | Completed games, scope filters, save/export/delete behavior, score-only boundaries | Mode 3/offseason execution blocked |
| Fame-event context needed continuity hardening | Fame/achievement evidence risked losing franchise context or being consumed from untrusted rows | Fame/fan morale prompt specs; manual smoke history concerns | Committed slice `Preserve franchise fame event context` | Keep no-hitter/perfect-game evidence scoped to trusted completed archives; block score-only fabricated fame | Completed hardening | Done | Player/team/opponent/game/franchise context, fan morale prompt source trust | Awards persistence and broader fame categories blocked |
| Narrative/milestone carryover is incomplete | Historical records, milestones, and stories need defined persistence | M2-D013, M2-D014, M2-D028 | Milestone/narrative systems exist but are deferred/partial in manifest and roadmap | Keep stable read-only history; do not imply complete museum/almanac/carryover until proven | P2 Analytics/Continuity | Analytics/Continuity: WPA and Almanac Persistence Pass | No global/prototype surfaces presented as franchise-complete | Story persistence beyond random-event log blocked |
| Manual final-score workflow needs boundary polish | Score-only rows are useful, but users need clarity that they do not create player stats, WPA, fame, awards, or Almanac player evidence | Manual smoke feedback; score-only hard boundaries | Score-only boundaries are tested in several persistence/Almanac/fame paths | Make the workflow copy/tests prove exactly what score-only can and cannot persist | P1 Workflow Trust | Manual Final-Score Entry And Score-Only Boundary Reconciliation | Team-only result effects, no fabricated player/WPA/fame evidence, save/export consistency | No AI simulation or stat fabrication |
| Manual schedule workflow needed hardening | Users need comfortable schedule authoring/editing without generated schedules | Manual smoke feedback; Mode 1/2 launch flow | Committed slice `Harden franchise schedule editing boundaries` | Keep manual/CSV non-generated schedule path usable and clearly scoped | Completed hardening | Done | No generated schedules, launch state remains scoped, row copy concise | Generated schedules excluded |
| Trade/FARM roster movement continuity needed audit | FARM/call-up/send-down/trade evidence must stay consistent across Team Hub, roster rows, and persistence | FARM/scouting/transaction specs; Team Hub roster usability | Committed slice `Protect hidden prospect data in trades` plus movement-continuity hardening | Keep roster movement history and current roster rows consistent and hidden-safe | Completed hardening | Done | Hidden prospects, call-up reveal boundary, transaction portability, future GameTracker availability | Auto-draft/offseason execution excluded; full trade UX/AI/salary matching deferred |
| Testing ergonomics request conflicts with scope | Manual smoke asked for auto-hire scouts and auto-draft for repeated testing | Manual smoke feedback | League Builder startup draft UI exists; deterministic engine exists | Do not include auto-draft in active playable-v1 plan; revisit only as separate approved tooling slice | Explicit Exclusion | No active slice | Ensure roadmap does not schedule auto-draft | Auto-draft deferred/excluded |

## Completed Hardening Slices

1. **Mode 1/2 Core Launch And Persistence Smoke Hardening**
   - Committed. Covered Franchise Setup completion/navigation, FranchiseHome launch confirmation, manual schedule/result loop, GameTracker completion/archive, save-slot delete, and full pitcher-name display.

2. **Franchise Data Generation Policy Cleanup: no DH, SMB4 names, salaries**
   - Committed. Removed DH from generated Franchise prospect/scout identity pools, improved SMB4-backed names, and proved salary/payroll baseline consistency.

3. **Team Hub Roster Usability: sortable salary/morale/stats/designation columns**
   - Committed. Added compact sortable roster columns and iPad-readable row density for salary, morale, stats/value, and preview designation status.

4. **Dynamic Designation Correctness: MVP/Ace ranking and prompt volume**
   - Committed. Bounded TEAM_MVP/ACE preview candidates, blocked negative-WAR/bad-evidence candidates, kept preview wording distinct from awards/designations, avoided prompt floods, and routed TWO-WAY players as pitcher-only through ACE for internal v1.

5. **Stadium And League Builder Source-Of-Truth Pass**
   - Committed. Clarified stadium dimensions/source/editability in League Builder and Team Hub and improved seed-factor/spray evidence labels.

6. **Finance/Analysis Visibility**
   - Committed. Surfaced salary baselines/team payroll totals and clearer True Value/Expected Wins preview-only context.

7. **Mode 1/2 Visual Smoke And UI Density Pass**
   - Committed. Tightened dense copy, roster readability, League Builder stadium badges, GameTracker lineup-name wrapping, and the starting-pitcher nested-control issue.

8. **Franchise-to-Almanac Persistence And Continuity Audit**
   - Committed. Registered approved franchise player/team/game archive evidence into Almanac continuity, preserved franchise/season scope, and kept score-only rows from fabricating player/WPA/fame evidence.

9. **WPA And Manager Moments Visibility Pass**
   - Committed. Surfaced archived franchise WPA/Manager Moments evidence as read-only Game Detail and Player Instance Card context without changing formulas.

10. **Fame Event Correctness And Continuity Audit**
   - Committed. Preserved trusted no-hitter/perfect-game fame context through completed archives and confirmation-gated fan morale prompt inputs.

11. **Seeded Mode 1/2 Browser Visual Smoke Pass**
   - Committed. Added the safe visual-smoke preview route, fixture tests, iPad/desktop screenshots, root-width/tablet shell fix, finance `READ ONLY` chip, and Player Card WPA preview evidence.

12. **Schedule Editing And Import Workflow Hardening**
   - Committed. Hardened the approved manual/CSV schedule editing path while preserving the no-generated-schedules policy and score-only boundaries.

13. **Trade And FARM Hidden-Safety And Movement Continuity**
   - Committed. Preserved hidden FARM/prospect safety through roster movement, kept player identity and transaction continuity inspectable, and left full trade UX/AI/salary matching deferred.

14. **Park Factor Archive Trust Tightening**
   - Committed. Accepted archive `game.parkFactors` only when verified as SMB4 seed inputs, preserving custom stadium names as copied context without trusting custom/adaptive factors.

15. **Dynamic Designation Policy Matrix And Two-Way Boundary**
   - Committed. Locked TEAM_MVP/ACE as active preview-only designations, routed TWO-WAY players pitcher-only through ACE for internal v1, and kept Fan Favorite/Albatross/Cornerstone/Captain/Fan Hopeful blocked or trusted-bridge-only.

## Next 5 Implementation Slices

1. **Manual Final-Score Workflow UX Polish And Confirmation-Gated Wording**
   - Make the score-only/manual-result workflow and compact copy prove exactly which team-level evidence persists and which player/WPA/fame/award/stat paths remain unavailable.
   - Acceptance target: score-only rows are useful for standings/history without fabricating player evidence.

2. **Real Populated Production Team Hub/Schedule Visual Smoke Harness**
   - Prove populated Franchise Home schedule rows and Team Hub roster rows in a production-shaped state, not only the safe fixture route.
   - Acceptance target: row-rich schedule/roster screenshots are repeatable without hidden prospect truth, generated schedules, unsafe demo writes, or fixture-only assumptions.

3. **Transaction History Drilldown And Roster Movement Explainability**
   - Add or tighten read-only drilldown affordances if manual smoke still finds trade/FARM movement opaque.
   - Acceptance target: users can trace moved player identity without new trade logic, salary matching, AI, or offseason execution.

4. **Score-only History/Almanac Boundary Copy Pass**
   - Run only if the manual final-score slice does not fully settle score-only wording in schedule/history/reporting surfaces.
   - Acceptance target: score-only results remain visibly team/schedule/standings-only and never imply player archives.

5. **Remaining Compact UI/Help-Affordance Cleanup**
   - Continue reducing default explanatory text while keeping deeper trust-boundary detail available behind help/disclosure.
   - Acceptance target: compact copy remains operational while blockers stay explicit.

## Audit Rules For The Next Slices

Every implementation slice above should be audited against:

- No generated schedules.
- No auto-draft active path.
- No AI simulation or AI trades.
- No final True Value, salary movement, luxury tax, or salary matching.
- No final designation persistence, awards persistence, or automatic designation mutation.
- No automatic morale mutation outside explicit confirmation-gated safe-effect paths.
- No relationship mutation or durable relationship state.
- No adaptive park-factor persistence or park-adjusted WAR/value consumers.
- No Mode 3/offseason execution.
- No hidden FARM/prospect truth exposure.

## Decision Summary

Playable v1 should not be declared done yet.

The first Mode 1/Mode 2 user-facing hardening wave plus the Almanac/WPA/fame/visual-smoke trust wave are committed. Playable v1 should still not be declared done because manual score-only workflow clarity, real populated production schedule/Team Hub visual smoke, transaction-history drilldown/explainability, and full seeded harness scope remain unresolved. Schedule editing/import and trade/FARM movement continuity are hardened for v1; archive `game.parkFactors` trust and internal-v1 TWO-WAY designation routing are now tightened policy boundaries, not open playable-v1 blockers.

Since schedule editing/import hardening, trade/FARM hidden-safety and movement continuity, park-factor archive trust tightening, and the dynamic designation policy matrix/TWO-WAY boundary are now completed checkpoints, the right next milestone is **Manual Final-Score Workflow UX Polish And Confirmation-Gated Wording**. Score-only remains the clearest user-facing trust gap: it is useful for schedule and standings, but must be impossible to mistake for GameTracker archives, player stats, WPA/fame evidence, awards, designations, or relationship/morale automation beyond explicit team-fan confirmation. The advanced Mode 2 foundation remains useful, but it should stay read-only, preview-only, confirmation-gated, or blocked until the core playable loop and continuity story are reliable and clear.
