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
- The `/__preview/franchise-v1-visual-smoke` route is now dev/test gated and non-mutating/read-only. The dense UI screenshots used seeded preview labels, but the route does not write current-game, completed-game, schedule, franchise, or Almanac storage. Populated schedule-row and populated Team Hub roster-row visual smoke remains a future fixture check.

Manual smoke feedback still blocks declaring playable v1 done:

- Franchise-to-Almanac persistence/continuity remains unclear, and smoke explicitly reported that nothing from Franchise Mode appears to persist to Almanac.
- WPA/Manager WPA visibility still needs a trusted v1 decision.
- Immaculate inning/fame event correctness has a known false-positive risk before history/fame evidence becomes more visible.
- Visual smoke still needs a seeded Team Hub/live GameTracker harness or fixture state for repeatable screenshots.
- Finance `READ ONLY` chip polish, archive `game.parkFactors` trust tightening, and two-way MVP/Ace workflow policy remain known follow-ups.
- Broader Mode 1/2 gaps and full spec parity remain outside this completed hardening wave.

## Active Priority

Mode 1 and Mode 2 only until playable v1 is approved.

The next work should harden continuity and trust on top of the now-committed playable loop:

1. Franchise-to-Almanac persistence and continuity.
2. WPA/Manager WPA visibility decision.
3. Immaculate inning/fame event correctness.
4. Seeded visual smoke harness for Team Hub and GameTracker.
5. Remaining compact copy polish and trust-boundary tightening.

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
| MVP/Ace preview floods users | Nearly every player could receive Team MVP; negative-WAR pitcher surfaced as Team MVP | M2-D011, M2-D019; designation worksheet decisions | Committed slice `Tighten MVP and Ace designation previews` | Keep MVP/Ace ranking selective and preview-only | Completed hardening | Done | Negative WAR exclusion, candidate caps, no award/final language | Future two-way MVP/Ace policy decision remains |
| Team salary/contract visibility was incomplete | Expected Wins/True Value felt disconnected without contracts/team salaries | M2-D021; salary spec | Committed slice `Show salary baselines in Team Hub analysis` | Keep salary totals and roster salary rows consistent and preview-only | Completed hardening | Done | Salary values match baseline, blocker copy clear, no recalculation controls | Finance `READ ONLY` chip polish remains |
| Stadium source of truth was unclear | User did not know where dimensions/factors came from or how to edit them | M2-D020; stadium analytics spec | Committed slice `Clarify stadium source of truth` | Keep League Builder/Team Hub source and seed-factor status clear | Completed hardening | Done | Dimension source, seed factor identity, no custom/adaptive mutation | Archive `game.parkFactors` trust tightening remains |
| UI density/readability needed smoke pass | Foundation/status panels were too wordy; GameTracker names could truncate; nested controls logged browser errors | Manual smoke feedback; roadmap operating rules | Committed slice `Tighten Mode 1 and Mode 2 dense UI` | Keep compact copy and readable dense rows; add seeded visual smoke later | Completed hardening | Done | iPad/desktop readability, no overlap, no nested-button regression | Seeded Team Hub/GameTracker screenshots still needed |
| Visual smoke needs seeded repeatability | Current browser smoke cannot reliably reach Team Hub/live GameTracker in a fresh IndexedDB context | Manual smoke feedback; release confidence | Browser smoke covered reachable surfaces; `/__preview/franchise-v1-visual-smoke` is safe/read-only, but fresh context lacks prepared League Builder/FARM/scouting/schedule state | Provide or document a seeded smoke harness/fixture state for Team Hub and GameTracker screenshots without mutating real app storage | P0 Release Confidence | Seeded Visual Smoke Harness For Team Hub And GameTracker | Deterministic setup, no user-data dependency, screenshots at iPad and desktop widths, preview routes remain non-mutating | No auto-draft unless separately approved as tooling |
| UI is too wordy | Foundation panels and prompts are dense | Manual smoke feedback; roadmap operating rules | Many read-only panels include long explanatory copy to protect boundaries | Default surfaces should be concise; deeper explanation should move behind help/disclosure | P2 Copy/UI Cleanup | Copy/UI Cleanup: concise defaults with help affordances | Hidden-safety copy remains available, no loss of blockers, no mutation buttons | None |
| WPA/Manager WPA visibility is insufficient | User sees no visible WPA for players/managers | M2-D011, M2-D012 | WPA/Manager WPA engines and archives are strong, but visible surfaces may not be obvious | Decide and expose trusted WPA/Manager WPA read surfaces if they remain v1 | P2 Analytics/Continuity | Analytics/Continuity: WPA and Almanac Persistence Pass | Archive identity, player/manager attribution, separation from WAR/mWAR labels | Awards/story persistence blocked |
| Franchise-to-Almanac persistence is unclear | Smoke says nothing from Franchise persists to Almanac | M2-D006, M2-D013, M2-D014, M2-D028 | Completed-game archive and almanac storage exist; franchise-specific history scope may be incomplete | Define what Franchise records appear in Almanac and prove scope/history persistence | P0 Continuity/Trust | Franchise-to-Almanac Persistence And Continuity Audit | Completed games, milestones, records, scope filters, save/export behavior | Mode 3/offseason execution blocked |
| Narrative/milestone carryover is incomplete | Historical records, milestones, and stories need defined persistence | M2-D013, M2-D014, M2-D028 | Milestone/narrative systems exist but are deferred/partial in manifest and roadmap | Keep stable read-only history; do not imply complete museum/almanac/carryover until proven | P2 Analytics/Continuity | Analytics/Continuity: WPA and Almanac Persistence Pass | No global/prototype surfaces presented as franchise-complete | Story persistence beyond random-event log blocked |
| Testing ergonomics request conflicts with scope | Manual smoke asked for auto-hire scouts and auto-draft for repeated testing | Manual smoke feedback | League Builder startup draft UI exists; deterministic engine exists | Do not include auto-draft in active playable-v1 plan; revisit only as separate approved tooling slice | Explicit Exclusion | No active slice | Ensure roadmap does not schedule auto-draft | Auto-draft deferred/excluded |

## Completed Hardening Slices

1. **Mode 1/2 Core Launch And Persistence Smoke Hardening**
   - Committed. Covered Franchise Setup completion/navigation, FranchiseHome launch confirmation, manual schedule/result loop, GameTracker completion/archive, save-slot delete, and full pitcher-name display.

2. **Franchise Data Generation Policy Cleanup: no DH, SMB4 names, salaries**
   - Committed. Removed DH from generated Franchise prospect/scout identity pools, improved SMB4-backed names, and proved salary/payroll baseline consistency.

3. **Team Hub Roster Usability: sortable salary/morale/stats/designation columns**
   - Committed. Added compact sortable roster columns and iPad-readable row density for salary, morale, stats/value, and preview designation status.

4. **Dynamic Designation Correctness: MVP/Ace ranking and prompt volume**
   - Committed. Bounded TEAM_MVP/ACE preview candidates, blocked negative-WAR/bad-evidence candidates, kept preview wording distinct from awards/designations, and avoided prompt floods.

5. **Stadium And League Builder Source-Of-Truth Pass**
   - Committed. Clarified stadium dimensions/source/editability in League Builder and Team Hub and improved seed-factor/spray evidence labels.

6. **Finance/Analysis Visibility**
   - Committed. Surfaced salary baselines/team payroll totals and clearer True Value/Expected Wins preview-only context.

7. **Mode 1/2 Visual Smoke And UI Density Pass**
   - Committed. Tightened dense copy, roster readability, League Builder stadium badges, GameTracker lineup-name wrapping, and the starting-pitcher nested-control issue.

## Next 5 Implementation Slices

1. **Franchise-to-Almanac Persistence And Continuity Audit**
   - Define and prove which Franchise Mode results/events appear in Almanac/history surfaces, including completed games, player/team/manager stats, milestones, records, fame-safe events, franchise scope filters, and save/export behavior.
   - Acceptance target: the user can tell what Franchise history persists, where it appears, and what remains blocked without implying Mode 3/offseason, awards finalization, or story automation.

2. **WPA And Manager WPA Visibility Decision**
   - Decide whether player WPA and Manager WPA belong in playable v1. If approved, expose only trusted scoped archive evidence in concise read-only surfaces.
   - Acceptance target: WPA visibility is either implemented as a safe read surface or explicitly moved to full spec parity backlog.

3. **Immaculate Inning / Fame Event Correctness**
   - Tighten the known false-positive immaculate-inning rule before fame/story/history evidence becomes more visible.
   - Acceptance target: an immaculate inning requires exactly three batters faced, three strikeouts, exactly nine pitches, and no reach events.

4. **Seeded Visual Smoke Harness For Team Hub And GameTracker**
   - Add or document a repeatable seeded browser state for Team Hub roster/finance/stadium and live GameTracker screenshots at iPad and desktop widths.
   - Acceptance target: visual smoke no longer depends on manually prepared local IndexedDB data.

5. **Remaining Trust/Copy Polish**
   - Tighten the finance `READ ONLY` chip, archive `game.parkFactors` trust, and any short copy that still implies final analytics.
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

The first Mode 1/Mode 2 user-facing hardening wave is committed. Playable v1 should still not be declared done because Franchise-to-Almanac continuity, WPA visibility, fame-event correctness, seeded visual smoke, finance `READ ONLY` polish, archive `game.parkFactors` trust, and future two-way MVP/Ace policy remain unresolved.

The right next milestone is **Franchise-to-Almanac Persistence And Continuity Audit**, because manual smoke explicitly reported that Franchise Mode history does not appear to persist to Almanac and that gap affects season payoff/trust more than the remaining copy polish. The advanced Mode 2 foundation remains useful, but it should stay read-only, preview-only, confirmation-gated, or blocked until the core playable loop and continuity story are reliable and clear.
