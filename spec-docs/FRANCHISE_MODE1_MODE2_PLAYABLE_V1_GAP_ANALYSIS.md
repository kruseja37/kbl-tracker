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

Manual smoke feedback still blocks declaring playable v1 done:

- Populated schedule-row and populated Team Hub roster-row visual smoke remain open because the safe preview route currently covers shell/foundation evidence more strongly than row-rich schedule/roster fixtures.
- Manual final-score entry and score-only boundaries need one more user-facing reconciliation pass before the score-only workflow can be treated as comfortable.
- Schedule editing/CSV/manual schedule workflow remains a practical Mode 1/2 usability gap.
- Trade/FARM roster movement continuity remains a likely P1 once the visible roster-row fixture is trustworthy.
- Full seeded state harness scope remains a known follow-up. Archive `game.parkFactors` trust is tightened for verified SMB4 seed inputs, and internal-v1 TWO-WAY designation routing is explicitly pitcher-only through ACE.
- Broader Mode 1/2 gaps and full spec parity remain outside this completed hardening wave.

## Active Priority

Mode 1 and Mode 2 only until playable v1 is approved.

The next work should close the remaining release-confidence fixture gap before expanding workflows:

1. Populated schedule-row and Team Hub roster-row visual fixture.
2. Manual final-score entry and score-only boundary reconciliation.
3. Schedule editing/CSV/manual schedule workflow.
4. Trade/FARM roster movement continuity audit.
5. Remaining compact trust-boundary tightening as audits find issues; archive `game.parkFactors` trust and internal-v1 TWO-WAY designation routing are no longer open policy questions.

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
| UI density/readability needed smoke pass | Foundation/status panels were too wordy; GameTracker names could truncate; nested controls logged browser errors | Manual smoke feedback; roadmap operating rules | Committed slice `Tighten Mode 1 and Mode 2 dense UI` | Keep compact copy and readable dense rows; add seeded visual smoke later | Completed hardening | Done | iPad/desktop readability, no overlap, no nested-button regression | Seeded Team Hub/GameTracker screenshots still needed |
| Safe visual smoke preview exists; populated row fixtures remain thin | Browser smoke now reaches seeded shell/foundation/WPA/fame/GameTracker long-name surfaces, but schedule-row and roster-row screenshots are not yet populated enough | Manual smoke feedback; release confidence | Committed slice `Add safe Mode 2 visual smoke preview`; route is read-only/dev-test gated and has focused tests | Add a compact deterministic fixture that shows at least one populated schedule row and one populated Team Hub roster row without relying on user local IndexedDB | P0 Release Confidence | Populated Schedule And Team Hub Roster Visual Fixture | iPad/desktop screenshots, no hidden prospect truth, no writes to real user stores, fixture labels cannot be mistaken for production data | No auto-draft, no generated schedules, no AI simulation |
| UI is too wordy | Foundation panels and prompts are dense | Manual smoke feedback; roadmap operating rules | Many read-only panels include long explanatory copy to protect boundaries | Default surfaces should be concise; deeper explanation should move behind help/disclosure | P2 Copy/UI Cleanup | Copy/UI Cleanup: concise defaults with help affordances | Hidden-safety copy remains available, no loss of blockers, no mutation buttons | None |
| WPA/Manager WPA visibility was insufficient | User saw no visible WPA for players/managers | M2-D011, M2-D012 | Committed slice `Surface archived franchise WPA` | Keep read-only archived evidence visible and compact; score-only rows stay blocked | Completed hardening | Done | Archive identity, player/manager attribution, separation from WAR/mWAR labels | Awards/story persistence blocked |
| Franchise-to-Almanac persistence was unclear | Smoke said nothing from Franchise persisted to Almanac | M2-D006, M2-D013, M2-D014, M2-D028 | Committed slice `Persist franchise players into Almanac` | Keep approved franchise archive/player/team evidence scoped and portable | Completed hardening | Done | Completed games, scope filters, save/export/delete behavior, score-only boundaries | Mode 3/offseason execution blocked |
| Fame-event context needed continuity hardening | Fame/achievement evidence risked losing franchise context or being consumed from untrusted rows | Fame/fan morale prompt specs; manual smoke history concerns | Committed slice `Preserve franchise fame event context` | Keep no-hitter/perfect-game evidence scoped to trusted completed archives; block score-only fabricated fame | Completed hardening | Done | Player/team/opponent/game/franchise context, fan morale prompt source trust | Awards persistence and broader fame categories blocked |
| Narrative/milestone carryover is incomplete | Historical records, milestones, and stories need defined persistence | M2-D013, M2-D014, M2-D028 | Milestone/narrative systems exist but are deferred/partial in manifest and roadmap | Keep stable read-only history; do not imply complete museum/almanac/carryover until proven | P2 Analytics/Continuity | Analytics/Continuity: WPA and Almanac Persistence Pass | No global/prototype surfaces presented as franchise-complete | Story persistence beyond random-event log blocked |
| Manual final-score workflow needs boundary polish | Score-only rows are useful, but users need clarity that they do not create player stats, WPA, fame, awards, or Almanac player evidence | Manual smoke feedback; score-only hard boundaries | Score-only boundaries are tested in several persistence/Almanac/fame paths | Make the workflow copy/tests prove exactly what score-only can and cannot persist | P1 Workflow Trust | Manual Final-Score Entry And Score-Only Boundary Reconciliation | Team-only result effects, no fabricated player/WPA/fame evidence, save/export consistency | No AI simulation or stat fabrication |
| Manual schedule workflow remains shallow | Users need comfortable schedule authoring/editing without generated schedules | Manual smoke feedback; Mode 1/2 launch flow | Manual schedule/result path exists, but editing/CSV workflow remains incomplete | Improve or document manual schedule/CSV entry as the active non-generated schedule path | P1 Workflow Usability | Manual Schedule Editing And CSV Workflow Pass | No generated schedules, launch state remains scoped, row copy concise | Generated schedules excluded |
| Trade/FARM roster movement continuity needs audit | FARM/call-up/send-down/trade evidence must stay consistent across Team Hub, roster rows, and persistence | FARM/scouting/transaction specs; Team Hub roster usability | Transaction history and roster scan surfaces exist, but full continuity was not the latest focus | Prove roster movement history and current roster rows stay consistent and hidden-safe | P1 Roster Continuity | Trade And FARM Roster Movement Continuity Audit | Hidden prospects, call-up reveal boundary, transaction portability | Auto-draft/offseason execution excluded |
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

## Next 5 Implementation Slices

1. **Populated Schedule And Team Hub Roster Visual Fixture**
   - Extend the safe preview/test fixture so visual smoke captures at least one populated Franchise Home schedule row and one populated Team Hub roster scan row at iPad and desktop widths.
   - Acceptance target: row-rich schedule/roster screenshots are repeatable without real user data, auto-draft, generated schedules, hidden prospect truth, or production storage mutation.

2. **Manual Final-Score Entry And Score-Only Boundary Reconciliation**
   - Make the score-only/manual-result workflow and compact copy prove exactly which team-level evidence persists and which player/WPA/fame/award/stat paths remain unavailable.
   - Acceptance target: score-only rows are useful for standings/history without fabricating player evidence.

3. **Manual Schedule Editing And CSV Workflow Pass**
   - Improve or document the approved non-generated schedule entry/editing workflow.
   - Acceptance target: users can author/edit/import a schedule path for Mode 1/2 without generated schedules.

4. **Trade And FARM Roster Movement Continuity Audit**
   - Prove transaction history, roster scan rows, call-up/send-down evidence, and hidden-safe FARM/prospect boundaries stay consistent.
   - Acceptance target: roster movement continuity is visible and portable without auto-draft or offseason execution.

5. **Remaining Trust/Policy Tightening**
   - Continue compact trust-boundary tightening as audits find issues.
   - Acceptance target: compact copy remains operational while trust boundaries stay explicit.

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

The first Mode 1/Mode 2 user-facing hardening wave plus the Almanac/WPA/fame/visual-smoke trust wave are committed. Playable v1 should still not be declared done because populated schedule-row visual smoke, populated Team Hub roster-row visual smoke, manual score-only workflow clarity, manual schedule authoring/import, trade/FARM roster movement continuity, and full seeded harness scope remain unresolved. Archive `game.parkFactors` trust and internal-v1 TWO-WAY designation routing are now tightened policy boundaries, not open playable-v1 blockers.

The right next milestone is **Populated Schedule And Team Hub Roster Visual Fixture**, because the latest smoke preview proves safe shell/analysis/WPA/fame/GameTracker visibility but still does not prove the row-rich schedule and roster states a user actually scans on iPad. The advanced Mode 2 foundation remains useful, but it should stay read-only, preview-only, confirmation-gated, or blocked until the core playable loop and continuity story are reliable and clear.
