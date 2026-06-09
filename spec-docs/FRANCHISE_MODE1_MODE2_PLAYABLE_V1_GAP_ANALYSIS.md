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
- Manual final-score / score-only UX polish is complete: score-only rows are visually distinct, do not show Game Detail/archive affordances, and explicitly state schedule/standings-only plus confirmation-gated team-fan morale boundaries.
- The 2026-06-05 smoke-response hardening wave has addressed hidden FARM salary leakage, revealed/sent-down FARM visibility, profile primary/secondary position and pitching-rating integrity, GameTracker substitution menu full-name display, and Almanac Franchise access/save import clarity.
- Product UX cleanup is now an explicit lane: current app surfaces still carry too much implementation/audit/progress wording, and many panels act like trust-boundary documentation rather than product-grade UX. Keep functionality and safety first, then simplify before final playable approval or any broader user-facing release.

Manual smoke approval still requires another user app pass. The following 2026-06-05 real-app findings have been addressed in code/docs but are not user-approved yet:

- GameTracker sub-out pitcher names should now display full names.
- Almanac Game Detail works from schedule, and archive-backed Franchise Almanac access is now discoverable.
- Franchise save export/delete works, and import/upload is clearly labeled not implemented.
- FARM prospect salary should no longer leak hidden ratings and must use draft/scouting-safe context.
- FARM prospect grade display mismatches Player Analyzer expectations.
- Player profile position display now separates primary/secondary positions.
- Position players should no longer show pitching ratings unless they have a pitching/two-way model.
- Sent-down revealed players should retain full rating/edit visibility.
- Stadium spray archive/foundation mapping and Team Hub full filters should now surface scoped archive-backed spray evidence when completed-game spray rows exist; real-app smoke still needs to confirm the fix in local app state.
- Manager WPA lineup delta visibility has been patched for archive-backed Game Detail records, but real-app smoke still needs to confirm newly completed archives show stored manager evidence.

The next gate is not a new feature by default. If the user reruns the manual smoke checklist and only already-addressed items were failing, the next action is **User reruns manual smoke checklist**. Stadium spray should now be treated as a real-app smoke confirmation item: patch only if a completed archive with stored spray evidence still fails to render in Team Hub. Manager WPA lineup delta should be rechecked during smoke as an archive-backed visibility confirmation, not treated as missing unless the new Game Detail display fails with stored manager records.

Manual smoke approval remains the gate before declaring playable v1 done:

- Real app schedule-row and Team Hub roster-row behavior must be checked with actual local Franchise state, not only fixture-backed previews.
- Full seeded state harness scope remains a known follow-up.
- Schedule editing/import hardening is complete for the current manual/CSV non-generated policy, but production smoke should keep watching for usability issues.
- Trade/FARM hidden-safety and movement continuity are hardened for v1, while full trade UX, AI trades, salary matching, and offseason trade systems remain deferred.
- Archive `game.parkFactors` trust is tightened for verified SMB4 seed inputs, while custom stadium factor entry and adaptive persistence remain deferred.
- Internal-v1 TWO-WAY designation routing is explicitly pitcher-only through ACE, and older full-system designation lock/carryover wording remains subordinate to the v1 matrix.
- Broader Mode 1/2 gaps and full spec parity remain outside this completed hardening wave.
- The Team Hub stadium spray chart is provisional functional visualization, not final product design.

## Active Priority

Mode 1 and Mode 2 only until playable v1 is approved.

The next work is not a speculative feature. It is response to the real-app manual smoke findings:

1. Patch the smallest exact issue from the smoke findings.
2. Rerun the affected checklist section.
3. Keep playable v1 unapproved until the user confirms the blocker set is cleared.
4. If only non-blocking polish remains, queue it after the approval decision.
5. Keep Mode 3/offseason and full-spec systems deferred unless separately approved.

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
| Product UX cleanup lane needed | Current app UI still contains too much implementation/audit/progress wording; many panels read like trust-boundary documentation | Manual smoke feedback; roadmap operating rules | Team Hub, Stadium, Finance, Morale, Designation, Random Event, Schedule, and Almanac panels often use long explanatory prose | Remove implementation-progress prose, replace long explanations with compact labels/badges, move deep context to help/details, preserve trust boundaries, and keep iPad-readable layouts | P2 Product UX Cleanup | Product UX Cleanup Lane: concise product surfaces after critical data flows | Hidden-safety copy remains available, no loss of blockers, no mutation buttons, no spec-document feel | Stay after critical data-flow blockers unless UI causes wrong action or blocks comprehension |
| WPA/Manager WPA visibility was insufficient | User saw no visible WPA for players/managers | M2-D011, M2-D012 | Committed slice `Surface archived franchise WPA` | Keep read-only archived evidence visible and compact; score-only rows stay blocked | Completed hardening | Done | Archive identity, player/manager attribution, separation from WAR/mWAR labels | Awards/story persistence blocked |
| Franchise-to-Almanac persistence was unclear | Smoke said nothing from Franchise persisted to Almanac | M2-D006, M2-D013, M2-D014, M2-D028 | Committed slice `Persist franchise players into Almanac` | Keep approved franchise archive/player/team evidence scoped and portable | Completed hardening | Done | Completed games, scope filters, save/export/delete behavior, score-only boundaries | Mode 3/offseason execution blocked |
| Fame-event context needed continuity hardening | Fame/achievement evidence risked losing franchise context or being consumed from untrusted rows | Fame/fan morale prompt specs; manual smoke history concerns | Committed slice `Preserve franchise fame event context` | Keep no-hitter/perfect-game evidence scoped to trusted completed archives; block score-only fabricated fame | Completed hardening | Done | Player/team/opponent/game/franchise context, fan morale prompt source trust | Awards persistence and broader fame categories blocked |
| Narrative/milestone carryover is incomplete | Historical records, milestones, and stories need defined persistence | M2-D013, M2-D014, M2-D028 | Milestone/narrative systems exist but are deferred/partial in manifest and roadmap | Keep stable read-only history; do not imply complete museum/almanac/carryover until proven | P2 Analytics/Continuity | Analytics/Continuity: WPA and Almanac Persistence Pass | No global/prototype surfaces presented as franchise-complete | Story persistence beyond random-event log blocked |
| Manual final-score workflow needed boundary polish | Score-only rows are useful, but users need clarity that they do not create player stats, WPA, fame, awards, or Almanac player evidence | Manual smoke feedback; score-only hard boundaries | Completed slice `Manual Final-Score Workflow UX Polish And Confirmation-Gated Wording` | Keep score-only visibly schedule/standings-only, with team-fan morale effects confirmation-gated in Random Event Log | Completed hardening | Done | Team-only result effects, no fabricated player/WPA/fame/Game Detail evidence, save/export consistency | No AI simulation or stat fabrication |
| Manual schedule workflow needed hardening | Users need comfortable schedule authoring/editing without generated schedules | Manual smoke feedback; Mode 1/2 launch flow | Committed slice `Harden franchise schedule editing boundaries` | Keep manual/CSV non-generated schedule path usable and clearly scoped | Completed hardening | Done | No generated schedules, launch state remains scoped, row copy concise | Generated schedules excluded |
| Trade/FARM roster movement continuity needed audit | FARM/call-up/send-down/trade evidence must stay consistent across Team Hub, roster rows, and persistence | FARM/scouting/transaction specs; Team Hub roster usability | Committed slice `Protect hidden prospect data in trades` plus movement-continuity hardening | Keep roster movement history and current roster rows consistent and hidden-safe | Completed hardening | Done | Hidden prospects, call-up reveal boundary, transaction portability, future GameTracker availability | Auto-draft/offseason execution excluded; full trade UX/AI/salary matching deferred |
| FARM salary and reveal safety failed manual smoke | Hidden FARM salaries could reveal true rating quality; sent-down revealed players could become hidden by FARM status | FARM salary/reveal spec; salary spec; player profile requirements | Hidden FARM salaries now use draft/scouting-safe context and reveal is irreversible for send-down/profile views | Hidden prospects show safe salary only; revealed FARM/sent-down players keep full visible/edit context | Completed hardening | Done | No true ratings/true grade/rating-derived salary leaks; sent-down player remains revealed | Final salary movement/True Value remains blocked |
| GameTracker sub-out pitcher names still abbreviate | Sub-out pitcher names used compact display | GameTracker playable smoke; full-name display rule | Substitution menu now displays full names for pitchers and position players while preserving substitution identity payloads | Pitcher and position-player names display consistently in sub-out UI | Completed hardening | Done | Shared display-name path, no logic mutation, no layout overflow | None |
| Almanac Franchise section still incomplete | Game Detail works, Franchise section said Coming Soon | Almanac/continuity requirements | Archive-backed franchise game archive and franchise player search are now discoverable; full Franchise history hub remains deferred | Do not claim Franchise Almanac complete; surface scoped archive evidence honestly | Completed hardening | Done | No fabricated global/franchise history; mounted `/almanac/franchise` route works | Full museum/almanac architecture deferred |
| Save import/upload path unclear | Export/delete works; upload/import expectations are hard to find | Save-slot portability requirements | Save-slot selector now states export/delete are available and import/upload is not implemented yet | User can tell import/restore is deferred | Completed hardening | Done | No Cloud Sync scope creep, no fake import workflow | Import/upload remains deferred |
| Player profile console-entry details incomplete | Primary/secondary position separation and non-pitcher pitching-rating display were confusing | Player profile/manual edit requirements | Profile now separates primary/secondary positions, hides non-pitcher pitching ratings/arsenal, and preserves hidden FARM safety | Profile is clear for SMB4 manual entry while hidden-safe | Completed hardening | Done | Hidden FARM truth remains blocked; revealed grades align with Player Analyzer | Future profile automation deferred |
| Stadium spray real-app confirmation | Stadium spray did not appear in an earlier Team Hub real-app smoke pass | Stadium analytics spec | Archive/foundation mapping and Team Hub full filter set are implemented for scoped batting/pitching/fielding spray rows | Team Hub Stadium should show archive-backed spray evidence or clear blocked/empty reason in real local state | Smoke verification | User reruns manual smoke checklist; patch only if stored spray rows still fail to render | Wrong-scope/score-only evidence blocked; filters remain session-only | Adaptive factors/story automation blocked |
| Manager WPA lineup-delta smoke confirmation | Historical smoke said Manager WPA lineup delta was missing from Game Detail | M2-D011, M2-D012; WPA/Manager Moments specs | Archive-backed Game Detail visibility is now implemented for stored `managerDecisions`, `managerDeploymentStints`, and `managerLineupDeltas` | Newly completed archives with committed manager records should show Decision Quality Evidence and Lineup Delta Evidence; older archives without records show unavailable copy | Smoke verification | User reruns manual smoke checklist; patch only if stored manager records still do not render | Player WPA remains separate; no score-only/manual-result fabrication; older archives not backfilled | Morale/story/awards consumers and new formulas deferred |
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

16. **Manual Final-Score Workflow UX Polish And Confirmation-Gated Wording**
   - Completed. Made score-only entry and completed rows visibly distinct from GameTracker archives, removed archive affordances, and clarified Random Event Log confirmation for team-fan morale only.

17. **Manual Smoke Findings Capture And FARM Hidden-Rating Leak Hardening**
   - Completed. Captures the 2026-06-05 manual smoke findings, keeps playable v1 unapproved, routes hidden FARM prospect salary through draft/scouting-safe public context, and preserves revealed/editable state for sent-down players.

18. **Player Profile Position And Pitching Rating Data Integrity**
   - Completed. Separates primary/secondary profile fields, hides non-pitcher pitching ratings/arsenal unless a pitching model exists, preserves hidden FARM safety, and aligns revealed profile grade display with Player Analyzer logic.

19. **GameTracker Substitution Menu Full-Name Display**
   - Completed. Sub-out replacement menus now display full names for pitchers and position players while leaving substitution identity/state behavior unchanged.

20. **Almanac Franchise Section Access And Save Import Clarity**
   - Completed. Almanac now exposes archive-backed franchise game/player/team evidence through reachable routes and states that save import/upload is not implemented yet.

## Final Manual Smoke Checklist

Run this in the real app before deciding whether Mode 1/Mode 2 playable v1 is approved. Use a normal local Franchise save, not only preview routes.

1. **Create/load Franchise**
   - Create a Franchise from a prepared League Builder league, then leave and reload Franchise Mode.
   - Pass if the saved franchise appears once, opens cleanly, and loading states clear.

2. **No generated schedule unless user-supplied**
   - Open the schedule immediately after Franchise creation.
   - Pass if there are zero generated regular-season rows until the user manually adds/imports schedule data.

3. **Manual schedule row**
   - Add one regular-season schedule row manually, then reload.
   - Pass if the row persists with the intended away/home teams, day/game number, and no generated extra games.

4. **Score-only result boundary**
   - Complete one scheduled game by entering final score only.
   - Pass if standings update, the completed row is labeled `SCORE ONLY`, no Game Detail/archive link appears, and copy states Random Event Log confirmation is required for any team-fan morale effect.

5. **GameTracker schedule launch**
   - Launch a different scheduled game into GameTracker from FranchiseHome.
   - Pass if roster/lineup/starter readiness blocks only true incomplete roster issues, not stale Lineup Delta metadata.

6. **Complete/archive GameTracker game**
   - Finish or helper-complete the GameTracker game.
   - Pass if the schedule row completes as archive-backed, shows a Game Detail affordance, and does not look like a score-only row.

7. **Almanac continuity**
   - Open Game Detail, Player Instance Card, team/almanac views where available.
   - Pass if completed GameTracker evidence keeps franchise/season/team/player identity and score-only rows do not create player evidence.

8. **Team Hub roster scan**
   - Open Team Hub roster/directory.
   - Pass if salary, morale, stats/value, roster status, and preview designation columns are readable/sortable and hidden FARM truth is not exposed.

9. **Trade/FARM movement**
   - Run one approved call-up/send-down or trade path.
   - Pass if playerId continuity, roster status, transaction history, FARM hidden-safety, and future GameTracker availability remain clear.

10. **Stadium source and spray evidence**
    - Open Team Hub Stadium.
    - Pass if stadium source/seed-factor status is understandable, archive spray rows are inspectable, and custom/adaptive park factors remain blocked.

11. **WPA/fame visibility**
    - Inspect the completed archive in Game Detail and related player contexts.
    - Pass if WPA/Manager WPA and trusted fame context appear when archive-backed, while score-only rows remain blocked from those surfaces.

12. **Save-slot delete/export boundaries**
    - Delete a disposable Franchise save slot and check export/backup expectations if part of the smoke pass.
    - Pass if scoped Franchise stores delete/export consistently without touching unrelated saves.

13. **iPad readability**
    - Check FranchiseHome schedule rows, Team Hub roster, Team Hub random-event log, Stadium, and GameTracker at iPad width.
    - Pass if row text fits, controls are tappable, and dense trust labels remain compact.

## Next Response Rule

- The 2026-06-05 checklist found blockers; several have now been patched, but playable v1 remains unapproved until the user reruns smoke.
- The next action is **User reruns manual smoke checklist** if no still-open implementation blocker is requested.
- Stadium spray and Manager WPA lineup delta are now smoke-confirmation items and should only become implementation targets again if newly completed archives with stored evidence still fail to render the evidence.
- If the blocker set passes, ask the user whether Mode 1/Mode 2 playable v1 is approved.
- Do not start Mode 3/offseason, auto-draft, AI simulation, final awards, final True Value/salary movement, final designation persistence, morale automation, relationship mutation, adaptive park-factor persistence, custom stadium factor entry, generated schedules, or full trade AI/salary matching without a separate approval.

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

The first Mode 1/Mode 2 user-facing hardening wave plus the Almanac/WPA/fame/visual-smoke trust wave are committed. Manual score-only workflow clarity, schedule editing/import, trade/FARM movement continuity, archive `game.parkFactors` trust, internal-v1 TWO-WAY designation routing, hidden FARM salary/reveal safety, player profile position/pitching integrity, GameTracker substitution full names, and Almanac Franchise access/save import clarity are now hardened for v1.

Playable v1 should still not be declared approved. The right next gate is a real-app user smoke rerun. Stadium spray and Manager WPA lineup delta should now be checked as archive-backed visibility: newly completed archives with stored spray/manager records should render evidence, while older archives without committed records are not backfilled. If either stored-evidence surface still fails in real app state, patch that exact rendering/mapping issue. If the blocker set is cleared, ask for the playable-v1 approval decision rather than starting a speculative new feature. The advanced Mode 2 foundation remains useful, but it should stay read-only, preview-only, confirmation-gated, or blocked until the user approves the playable loop.
