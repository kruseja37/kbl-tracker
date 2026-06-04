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

That foundation is technically safer than it was, but manual smoke feedback shows the playable UI/UX is not yet clean enough:

- Some core flow affordances still feel unreliable or unclear.
- Some generated data violates Franchise policy.
- Roster/finance/designation surfaces are too hard to scan.
- Dynamic designation prompts can look like awards or flood the user.
- Stadium/source-of-truth and analytics visibility still need a practical user-facing pass.

## Active Priority

Mode 1 and Mode 2 only until playable v1 is approved.

The next work should harden the existing playable loop and visible surfaces:

1. Franchise creation and launch.
2. Manual schedule/result/GameTracker loop.
3. Save-slot/delete persistence.
4. Franchise data generation policy.
5. Team Hub roster/finance/designation usability.
6. Stadium and League Builder source-of-truth clarity.

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
| Franchise creation handoff can hang or leave user stranded | `Start Franchise` may save a slot but not complete navigation/cleanup | Mode 1 handoff assumptions; M2-D001, M2-D002 | Franchise Setup and initializer are implemented; save-slot persistence exists; smoke reported reload needed | Successful create must visibly transition to the new franchise or clearly report a recoverable error | P0 Core Loop Blockers | Mode 1/2 Core Launch And Persistence Smoke Hardening | No duplicate slots, loading state clears, navigation uses saved franchise id, user can recover without reload | None |
| Franchise launch/GameTracker confirmation can no-op | Scoring does not proceed after confirmation | M2-D004, M2-D005 | Franchise GameTracker launch, roster snapshots, and active-game persistence exist | Scheduled GameTracker launch must reliably navigate for valid manual/CSV schedule rows | P0 Core Loop Blockers | Mode 1/2 Core Launch And Persistence Smoke Hardening | Benchmark gates, no-DH lineup snapshot, route state, schedule row identity, active-game resume | No AI simulation |
| Manual schedule/result loop needs smoke confidence | Manual schedule policy is accepted, but UX must prove add/import/score-only/GameTracker rows are understandable | M2-D003, M2-D006, M2-D007, M2-D027 | Manual schedule storage, CSV/manual paths, score-only boundaries, GameTracker completion, standings tests exist | User can start empty, add/import user-authored rows, complete one GameTracker row and one score-only row, and see correct schedule/standings/archive behavior | P0 Core Loop Blockers | Mode 1/2 Core Launch And Persistence Smoke Hardening | No generated schedules, score-only no player stats/archive, GameTracker rows link to Game Detail | OCR and AI simulation deferred |
| Save-slot delete/persistence needs release confidence | Delete on franchise save slots may do nothing | Save-slot manifest and portability roadmap; M2-D002 | Save-slot manifest, backup/sync registration, delete-scoped responsibilities exist | User can delete bad smoke-test saves and exported/imported slots preserve Mode 1/2 evidence stores | P0 Core Loop Blockers | Mode 1/2 Core Launch And Persistence Smoke Hardening | Delete handler wiring, scoped storage deletion, backup/sync coverage, no cross-franchise deletion | Cloud sync deployment behavior outside this slice |
| Pitcher names display in compact form | Pitchers show first initial plus last name while position players show full names | GameTracker/core display expectations; M2-D004, M2-D029 | GameTracker display helpers and pitcher-specific formatting likely exist | Pitchers and position players should display full names consistently in Franchise scoring surfaces | P0 Core Loop Blockers | Mode 1/2 Core Launch And Persistence Smoke Hardening | Shared display-name utility, no regression in compact stat tables where abbreviation is intentional | None |
| DH leaks into Franchise prospect/scout generation policy | DH appears as position/specialty/weakness | Mode 1 handoff assumptions; FARM/scouting specs | Shared prospect/scouting draft engine and League Builder startup draft path exist | Franchise prospects must not use DH primary/secondary positions; scouts must not use DH specialty/weakness | P0 Data Policy | Franchise Data Generation Policy Cleanup: no DH, SMB4 names, salaries | Engine constants, generated player DTOs, scout descriptors, UI labels, tests with deterministic seeds | No full scout persistence |
| Generated prospect/scout names are too repetitive | Smoke feedback says names are redundant or similar | Prospect/scouting specs; Mode 1 ownership | Prospect/scout generation exists; SMB4 data files exist but are excluded dirty files and should not be touched casually | Generated prospects/scouts should use SMB4 name database or an approved source with duplicate prevention | P0 Data Policy | Franchise Data Generation Policy Cleanup: no DH, SMB4 names, salaries | Name source, deterministic RNG, collision/duplicate handling, no generated data file churn | Auto-draft excluded |
| Salary/payroll baseline needs visible correctness at handoff | Team salaries missing or disconnected from expected wins/True Value context | M2-D021; salary spec; Mode 1 handoff assumptions | Salary engine, franchise copy normalization, salary baseline, True Value/expected-wins previews exist | Mode 1 handoff must prove salaried MLB/FARM copy and team payroll baseline; Mode 2 must show team salary context clearly | P0 Data Policy | Franchise Data Generation Policy Cleanup: no DH, SMB4 names, salaries | Salary baseline counts, team payroll totals, prospect round salary display, no salary movement | Final True Value/salary movement blocked |
| Team Hub roster scan is not efficient enough | User wants sortable morale, salary, stats, designation columns | M2-D010, M2-D012, M2-D015, M2-D019, M2-D021 | Team Hub roster/profile/directory/morale/value panels exist but are dense | Roster view should sort/filter key Mode 2 columns with iPad-readable row density | P1 Roster/Team Hub Usability | Team Hub Roster Usability: sortable salary/morale/stats/designation columns | Hidden-safe FARM rows, no mutation, responsive layout, column semantics | Relationship mutation and final designations blocked |
| Dynamic designations lack a clear home | Designations are hard to scan and feel buried/noisy | M2-D019 | Designation eligibility/readiness and morale bridge are preview-only; Team Hub random-event prompts exist | Roster/profile should show preview status separately from true designation state | P1 Roster/Team Hub Usability | Team Hub Roster Usability: sortable salary/morale/stats/designation columns | Copy says preview/read-only, no final badges, no awards language | Final designation persistence blocked |
| UI is too wordy | Foundation panels and prompts are dense | Manual smoke feedback; roadmap operating rules | Many read-only panels include long explanatory copy to protect boundaries | Default surfaces should be concise; deeper explanation should move behind help/disclosure | P2 Copy/UI Cleanup | Copy/UI Cleanup: concise defaults with help affordances | Hidden-safety copy remains available, no loss of blockers, no mutation buttons | None |
| MVP/Ace preview floods users | Nearly every player may receive Team MVP prompt; negative-WAR pitcher can appear as Team MVP | M2-D011, M2-D019; designation worksheet decisions | Designation eligibility/readiness and random-event prompt bridge exist; WAR/True Value preview remains untrusted | MVP/Ace preview candidates must be ranked, bounded, and filtered by positive evidence; not treated as awards/winners | P1 Designation Correctness | Dynamic Designation Correctness: MVP/Ace ranking and prompt volume | Negative WAR exclusion, candidate caps, threshold reasons, no award/final language | Final designations blocked |
| Preview candidates are too easy to confuse with true designations | Prompt wording and roster surfacing can imply awards/designations are saved | M2-D019, M2-D025 | UI copy has been guarded in places, but smoke still shows confusion | Preview recognition must be visibly separate from locked/persisted designation state | P1 Designation Correctness | Dynamic Designation Correctness: MVP/Ace ranking and prompt volume | No `winner`, `awarded`, `locked`, or `saved designation` language for preview prompts | Awards persistence blocked |
| Team salary/contract visibility is incomplete | Expected Wins/True Value feels disconnected without contracts/team salaries | M2-D021; salary spec | Team-level True Value and expected-wins preview panels exist | Users need team salary totals, player salary rows, and contract baseline context where stored | P1 Finance/Analysis Visibility | Team Hub Roster Usability: sortable salary/morale/stats/designation columns | Salary values match baseline, FARM salary semantics clear, no recalculation controls | Salary movement and luxury tax blocked |
| True Value/Expected Wins usefulness needs better framing | Preview-only values exist but may not answer user questions | M2-D011, M2-D021; fan morale spec | Numeric WAR preview, position-relative True Value, expected-wins baseline snapshots exist | Show why a value is useful, what inputs are missing, and what it cannot drive yet | P1 Finance/Analysis Visibility | Team Hub Roster Usability: sortable salary/morale/stats/designation columns | Preview labels, team totals, player rows if included, blockers visible but concise | Final trust, Fan Favorite/Albatross finalization blocked |
| Stadium source of truth is unclear | User does not know where dimensions/factors come from or how to edit them | M2-D020; stadium analytics spec | Stadium foundation, seed/static trust, records, spray inspector exist | League Builder and Team Hub must clearly identify source, editability, and seed-factor status | P1 Stadium/League Builder Flow | Stadium And League Builder Source-Of-Truth Pass | League Builder stadium assignment, dimension source, seed factor identity, no custom factor mutation | Adaptive park-factor persistence blocked |
| Spray evidence/player spray status unclear | Seed factors/spray evidence can look blocked or confusing; player spray charts deferred | M2-D020, M2-D030 | Team Hub Stadium tab has richer spray inspector; player profile spray context is not complete | Show scoped batting/pitching/fielding evidence clearly and label player spray charts as active or deferred | P1 Stadium/League Builder Flow | Stadium And League Builder Source-Of-Truth Pass | Wrong-scope exclusion, orphan evidence, no hidden FARM truth, no park-adjusted consumers | Heatmaps/diagrams deferred |
| WPA/Manager WPA visibility is insufficient | User sees no visible WPA for players/managers | M2-D011, M2-D012 | WPA/Manager WPA engines and archives are strong, but visible surfaces may not be obvious | Decide and expose trusted WPA/Manager WPA read surfaces if they remain v1 | P2 Analytics/Continuity | Analytics/Continuity: WPA and Almanac Persistence Pass | Archive identity, player/manager attribution, separation from WAR/mWAR labels | Awards/story persistence blocked |
| Franchise-to-Almanac persistence is unclear | Smoke says nothing from Franchise persists to Almanac | M2-D006, M2-D013, M2-D014, M2-D028 | Completed-game archive and almanac storage exist; franchise-specific history scope may be incomplete | Define what Franchise records appear in Almanac and prove scope/history persistence | P2 Analytics/Continuity | Analytics/Continuity: WPA and Almanac Persistence Pass | Completed games, milestones, records, scope filters, save/export behavior | Mode 3/offseason execution blocked |
| Narrative/milestone carryover is incomplete | Historical records, milestones, and stories need defined persistence | M2-D013, M2-D014, M2-D028 | Milestone/narrative systems exist but are deferred/partial in manifest and roadmap | Keep stable read-only history; do not imply complete museum/almanac/carryover until proven | P2 Analytics/Continuity | Analytics/Continuity: WPA and Almanac Persistence Pass | No global/prototype surfaces presented as franchise-complete | Story persistence beyond random-event log blocked |
| Testing ergonomics request conflicts with scope | Manual smoke asked for auto-hire scouts and auto-draft for repeated testing | Manual smoke feedback | League Builder startup draft UI exists; deterministic engine exists | Do not include auto-draft in active playable-v1 plan; revisit only as separate approved tooling slice | Explicit Exclusion | No active slice | Ensure roadmap does not schedule auto-draft | Auto-draft deferred/excluded |

## Next 5 Implementation Slices

1. **Mode 1/2 Core Launch And Persistence Smoke Hardening**
   - Verify and patch Franchise Setup completion/navigation, FranchiseHome launch confirmation, manual schedule/result loop, GameTracker completion/archive, save-slot delete, and full pitcher-name display.
   - Acceptance target: a user can create a franchise, reach FranchiseHome, add/import a schedule row, launch/complete one GameTracker game, enter one score-only result, delete a bad save, and understand what happened without reload workarounds.

2. **Franchise Data Generation Policy Cleanup: no DH, SMB4 names, salaries**
   - Remove DH from Franchise prospect/scout generation pools, improve prospect/scout name generation from approved SMB4 name sources, and prove salary/payroll baseline consistency at Mode 1 handoff.
   - Acceptance target: generated Franchise prospects/scouts obey policy, names are varied, and salary/team payroll baselines are visible and correct.

3. **Team Hub Roster Usability: sortable salary/morale/stats/designation columns**
   - Add compact sortable roster columns and improve iPad-readable row density for salary, morale, stats, and preview designation status.
   - Acceptance target: users can scan and sort the roster without opening several dense foundation panels.

4. **Dynamic Designation Correctness: MVP/Ace ranking and prompt volume**
   - Bound TEAM_MVP/ACE preview candidates, prevent negative-WAR or bad-evidence MVP candidates, keep preview wording distinct from awards/designations, and avoid prompt floods.
   - Acceptance target: designation previews feel credible and sparse enough for review.

5. **Stadium And League Builder Source-Of-Truth Pass**
   - Clarify stadium dimensions/source/editability in League Builder and Team Hub; improve seed-factor status and spray evidence/player spray-chart labels.
   - Acceptance target: users understand where stadium data comes from, what can be edited, and why adaptive consumers remain blocked.

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

The right next milestone is a Mode 1/Mode 2 user-facing hardening cycle that starts with core launch/persistence, then cleans data generation policy, roster usability, designation correctness, and stadium source-of-truth. The advanced Mode 2 foundation remains useful, but it should stay read-only, preview-only, confirmation-gated, or blocked until the core playable loop feels reliable and clear.
