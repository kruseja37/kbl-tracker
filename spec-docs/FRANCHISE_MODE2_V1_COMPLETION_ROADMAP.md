# Franchise Mode 2 V1 Completion Roadmap

Recommended reasoning effort: high for implementation slices, medium for audits and doc checkpoints.

## Current Source Of Truth

This document is the canonical Mode 2 v1 roadmap. `FRANCHISE_MODE2_V1_CONTEXT_CARD.md` is the compact resume card, and older roadmap/resync docs are historical context unless this file explicitly references them.

Manual smoke feedback remains a bug and feature backlog. The build order for Mode 2 should follow this file unless explicitly revised.

## Current State As Of Latest Commit

Latest committed checkpoint: `366064a Define v1 dynamic designation policy`.

Latest working checkpoint: Playoff Confirmation + Tiebreaker Resolution.

Mode 2 is currently a reliability-first internal v1 track: many systems are scoped, durable, read-only, preview-only, or confirmation-gated, while final automation remains blocked until trusted inputs and lifecycle rules are approved. The technical foundation is safe, and the first Mode 1/2 playable hardening waves through schedule/trade/FARM/stadium/designation policy plus the latest smoke-response patches are complete, but user-facing playable v1 still requires another real-app smoke pass and explicit user approval.

## Completed Checkpoints

- Value, salary, designation, analytics, morale/relationship, and narrative eligibility gates exist as read-only scoped contracts.
- Player profiles, manual profile edits, player-local edit history, continuity, and player directory surfaces exist in Team Hub.
- Stadium foundation exists with scoped stadium identity, seed/static park-factor trust, archive-backed batting/pitching/fielding spray projection, and preview-only adaptive factors.
- Stadium foundation is surfaced read-only in Team Hub.
- Random event prompts now have durable scoped records, confirmation/dismiss state, idempotent safe-effect application, and Team Hub workflow.
- Canonical fan/player morale snapshots exist on the 0-99 scale, with player morale starting at neutral `50`.
- Team Hub exposes fan/player morale history and manual scoped morale controls while keeping profiles, salary, relationships, stories, and Mode 3 separate.
- Fan morale prompt formulas currently cover confirmed game results, streaks, 7+ run blowouts, archive-backed no-hitter/perfect-game fame events, and performance-gap team fan morale prompts from durable expected-wins baseline evidence.
- Dynamic designation morale bridge remains available for explicit trusted bridge inputs, but TEAM_MVP/ACE no longer use duplicate preview random-event recognition prompts.
- Dynamic designation policy matrix is explicit: TEAM_MVP/ACE are the only app-facing active persisted v1 designations, TWO-WAY routes as pitcher-only through ACE for internal v1, and Fan Favorite/Albatross/Cornerstone/Captain/Fan Hopeful remain blocked or explicit trusted-bridge-only context.
- TEAM_MVP/ACE changes emit typed `DesignationEvent` objects for later morale/story consumers; morale mutation is not wired.
- Fan Favorite/Albatross readiness can be inspected from preview True Value/value-delta rows, but final designation behavior, random-event morale prompts, salary movement, relationships, and Mode 3 remain blocked.
- Numeric WAR has a narrow trusted consumer contract only for TEAM_MVP/ACE designation input gating when scoped completed archive evidence, scoped season stats, current MLB/team context, and stored season metadata are present.
- Position-relative True Value preview, value delta, and expected-wins preview remain read-only and untrusted for final designations, salary movement, morale automation, awards, and Mode 3.
- Awards/watchlists are blocked by the 1.9 audit until a Final WAR / Award Trust Promotion Gate proves final award-consumer WAR trust, award-specific True Value/value-delta policy, milestone weighting, adaptive thresholds, score-only exclusion, and hidden FARM exclusion.
- Team Hub surfaces True Value and expected-wins previews in Mode 2 Foundation Status with explicit preview-only boundaries.
- Expected-wins baseline snapshots persist scoped read-only baseline evidence from preview contracts while remaining untrusted for mutation and final formula consumers.
- Daily morale snapshot summaries persist scoped high/low/average evidence from confirmed/manual morale history while remaining read-only and untrusted for drift, recovery, relationship effects, and Mode 3.
- Stadium records boundary persists scoped read-only evidence for conservative team/game stadium records, spray event leaders, and safe no-hitter/perfect-game archive context while adaptive factors and final park-adjusted consumers remain blocked.
- Expected-wins baselines, daily morale snapshots, and stadium records are registered as portable scoped evidence stores in save-slot, backup, and sync registry surfaces, matching random events and canonical morale.
- Team Hub Stadium tab provides a compact read-only spray evidence inspector with role/player/team/stadium/scope/hand/outcome/zone filters and frequency/outcome/player sorting using scoped stadium foundation rows.
- Team Hub player profiles surface read-only relationship context/proposal boundaries for player-player, fan/team, and hidden-safe scout/prospect contexts using the draft-only manual override validator.
- Season-end readiness report exists as a pure read-only review contract for scoped game archives, random-event review state, morale evidence, daily summaries, expected-wins baselines, stadium records, designation readiness, relationship context, and blocked future systems.
- Season handoff plan exists as a pure read-only blocked migration manifest that lists eligible review evidence, blocked carryover categories, unresolved blockers, warnings, and future decisions required before any Mode 3/offseason execution.
- `FRANCHISE_MODE1_MODE2_PLAYABLE_V1_GAP_ANALYSIS.md` reconciles the current foundation, manual smoke feedback, and Mode 2 worksheet into the active Mode 1/Mode 2 playable hardening plan.
- Mode 1/2 Core Launch And Persistence Smoke Hardening is committed.
- Franchise Data Generation Policy Cleanup is committed: generated Franchise prospects/scouts no longer use DH identities, SMB4 name sources are used where present, and salary/payroll baselines are covered for generated data.
- Team Hub Roster Usability is committed with sortable salary, morale, stat/value, and designation summary columns.
- Dynamic Designation Correctness is committed for bounded TEAM_MVP/ACE active ranking and no duplicate preview prompt volume.
- Finance/Analysis Visibility is committed with salary baseline/team payroll visibility and preview-only True Value/Expected Wins framing.
- Stadium And League Builder Source-Of-Truth Pass is committed with compact stadium source/status copy and spray evidence wording.
- Mode 1/2 Visual Smoke And UI Density Pass is committed with denser Team Hub/League Builder copy, readable roster table adjustments, GameTracker full-name wrapping, and a starting-pitcher nested-control fix.
- Franchise-to-Almanac Persistence And Continuity is committed with approved franchise archive/player/team evidence, scope preservation, and score-only anti-fabrication coverage.
- WPA And Manager Moments Visibility is committed with read-only archived franchise WPA/Manager Moments evidence surfaced in Game Detail and Player Instance Card contexts.
- Fame Event Correctness And Continuity is committed with trusted no-hitter/perfect-game context preserved for completed archives and confirmation-gated fan morale prompt inputs.
- Seeded Mode 1/2 Browser Visual Smoke Pass is committed with a safe dev/test preview route, fixture tests, root-width/iPad shell fix, finance `READ ONLY` chip, and seeded WPA/fame/GameTracker long-name screenshots.
- Populated visual smoke fixture is committed for seeded schedule and Team Hub roster confidence, but real populated production visual smoke remains a future check.
- Schedule Editing And Import Workflow Hardening is committed with current manual/CSV non-generated schedule boundaries.
- Trade And FARM Hidden-Safety And Movement Continuity is committed for v1-safe call-up/send-down/trade continuity, hidden prospect boundaries, transaction visibility, and future GameTracker availability.
- Park Factor Archive Trust Tightening is committed so archive `game.parkFactors` are trusted only when verified as SMB4 seed inputs.
- Dynamic Designation Policy Matrix And Two-Way Boundary is committed: TEAM_MVP/ACE are active persisted v1 designations, TWO-WAY routes pitcher-only through ACE for internal v1, and older full-system designation lock/carryover language remains subordinate to the v1 matrix.
- Manual Final-Score Workflow UX Polish And Confirmation-Gated Wording is complete: score-only rows are visually distinct, lack Game Detail/archive affordances, and compactly state schedule/standings-only plus confirmation-gated team-fan morale boundaries.
- 2026-06-05 manual smoke findings are captured. Hidden FARM prospect salary/reveal safety is hardened so hidden salaries use draft/scouting-safe context and sent-down revealed players stay revealed.
- Player profile position/pitching integrity is hardened: primary/secondary position display is separated, non-pitcher pitching ratings/arsenal are hidden unless a pitching model exists, and hidden FARM profiles remain hidden-safe.
- GameTracker substitution menu full-name display is hardened for pitchers and position players.
- Almanac Franchise access and save import clarity are hardened: archive-backed franchise games/player instances/team links are reachable, and save import/upload is explicitly not implemented yet.
- Product UX cleanup lane is captured: current app surfaces still contain too much implementation/audit/progress wording and many panels behave like trust-boundary documentation instead of product-grade UX.
- Team Hub stadium spray chart is provisional functional visualization, not final design.
- Playoff Confirmation + Tiebreaker Resolution is implemented for v1: FranchiseHome reviews final standings, resolves W-L ties by run differential where possible, blocks unresolved same-record/same-run-differential qualifying ties, creates brackets only from confirmed seedings, records bracket confirmation before playoff start, and keeps eliminated teams out of the bracket.

## Active Priority Order

1. Manual Smoke Verification Gate
   - User reruns the real-app manual smoke checklist.
   - Include playoff seeding/bracket confirmation in the smoke pass: final standings, run-differential tie evidence, confirmed bracket creation, and playoff launch readiness.
   - Do not declare playable v1 approved until the blocker set is cleared and the user explicitly approves it.
   - Keep Mode 1 and Mode 2 as the only active playable-v1 priority.
   - No auto-draft, generated schedules, AI simulation, awards finalization, story automation, production storage mutation, or Mode 3/offseason execution until separately approved.
2. Next Implementation If Smoke Still Fails
   - First candidate: any failed playoff confirmation/tiebreaker/bracket issue found during smoke.
   - Second candidate: any remaining Manager WPA lineup delta visibility issue found during smoke; Game Detail now has archive-backed display for stored evidence.
   - Save import/upload remains deferred unless separately approved.
3. Approval Decision
   - If the remaining smoke findings pass, ask the user whether Mode 1/2 playable v1 is approved.
4. Product UX Cleanup Lane
   - Clean before final playable approval or broader release if UI wording/layout blocks comprehension or causes wrong action.
   - Otherwise keep it after remaining critical data-flow blockers.
   - Remove implementation-progress prose from app surfaces.
   - Replace long explanations with compact labels, badges, and short blockers.
   - Move deep explanations to help/details.
   - Simplify Team Hub, Stadium, Finance, Morale, Designation, Random Event, Schedule, and Almanac panels.
   - Preserve trust boundaries and hidden-safety without making the UI feel like a spec document.
   - Ensure iPad-readable layouts.
5. Post-Approval Polish Queue
   - If smoke reveals only non-blocking polish, queue it after the approval decision.
6. Deferred Full-Spec Backlog
   - Keep Mode 3/offseason, auto-draft, AI simulation, final awards, salary/designation/morale automation, relationships, adaptive factors, and generated schedules out of active scope.

## Playable V1 Remaining Work

- User must rerun the manual smoke checklist after the latest addressed findings:
  - GameTracker sub-out menu names should now be full names.
  - Almanac Franchise access should now show archive-backed games/player instances/team links instead of only `Coming Soon`.
  - Save upload/import should now be clearly labeled not implemented yet.
  - Hidden FARM salary and sent-down revealed-player visibility should now be safe.
  - Player profile primary/secondary positions and non-pitcher pitching ratings should now be correct.
- Remaining open implementation candidates if smoke still fails:
  - FARM prospect grade mismatch versus Player Analyzer.
  - Playoff confirmation/tiebreaker/bracket flow should now work from confirmed standings; smoke should verify it before approval.
  - Manager WPA lineup delta should now be visible in Game Detail when completed-game archives contain stored manager lineup-delta records; smoke should verify this with a real archive.
- Get explicit user approval before declaring Mode 1/2 playable v1 complete.
- Track any non-blocking production visual-smoke, roster/schedule readability, or transaction drilldown polish as follow-up after the approval decision.
- Track product UX cleanup separately from data-flow blockers: concise product surfaces are required for approval/release quality, but must not weaken trust-boundary copy or hide blocked states.
- Future stricter two-way Team MVP criteria, if approved later.

## Full Spec Parity Backlog

- Final True Value promotion, salary movement, and salary lifecycle automation.
- Projected and locked dynamic designations, including season-end locking/carryover.
- Captain hidden-charisma/leadership policy and morale amplification.
- Full fan morale formula weighting, beat reporter sentiment, drift/recovery, franchise health, free-agency consequences, and trade scrutiny.
- Durable relationship state, relationship mutation, and chemistry/narrative effects.
- Story persistence beyond the random-event log and full narrative engine integration.
- Adaptive park-factor persistence, stadium historical records, and final park-adjusted value/WAR consumers.
- Custom stadium factor entry and custom/adaptive factor persistence.
- Awards persistence, playoffs/finals summaries, complete season handoff, and Mode 3/offseason execution.
- Auto-draft remains deferred/excluded from the active playable-v1 plan unless separately approved as tooling.

## Locked V1 Boundaries

- Score-only results may affect team fan morale only after user confirmation.
- Score-only results must never create player morale, player stats, WPA/WAR, awards, designations, player history, or relationship mutation.
- Safe preview/fixture routes must stay dev/test oriented and must not mutate real user Franchise, schedule, GameTracker, completed-game, or Almanac storage.
- GameTracker archive-backed events can support prompts and confirmed effects, but GameTracker completion must not silently mutate canonical franchise morale.
- Confirmed random events can apply safe fan/player morale effects only through the canonical morale state model.
- Dynamic designation effects must enter v1 as confirmation-gated random-event prompts, not automatic designation/profile/morale mutation.
- Older full-system designation lock/carryover wording is subordinate to the committed v1 designation matrix until a separate final-designation promotion slice is approved.
- True Value, value deltas, and expected wins are currently preview-only and not trusted for final designations, salary movement, morale automation, automatic drift/recovery, or Mode 3.
- WAR trust is consumer-specific: TEAM_MVP/ACE input gating may trust rows that pass the scoped completed-archive/stat/metadata contract, but that does not promote Fan Favorite, Albatross, awards, True Value, salary movement, morale, or Mode 3.
- Awards/watchlists must not be implemented from preview WAR or preview True Value. First add a dedicated Final WAR / Award Trust Promotion Gate and keep `finalWarTrusted`, `trustedForAwards`, final True Value/value-delta trust, score-only exclusion, and hidden FARM exclusion explicit.
- Fan Favorite and Albatross final behavior requires an explicit promotion decision for trusted True Value/value-delta inputs.
- Captain morale amplification remains blocked until hidden-charisma reveal/safety policy is approved.
- Fan Hopeful morale boosts must be prospect-safe and must not expose hidden FARM truth.
- TWO-WAY designation routing is pitcher-only for internal v1; stricter two-way Team MVP criteria are deferred.
- Profile automation, salary movement, final True Value, final designation changes, relationship mutation, story persistence beyond the random-event log, Mode 3/offseason effects, and unrevealed FARM hidden-truth effects remain blocked.
- Existing prototype/global `useFanMorale` paths are not canonical Franchise v1 morale storage.
- Mode 1/Mode 2 playable hardening remains active until the user-facing loop is approved; foundation-safe does not mean playable-complete.

## Manual Smoke Approval Gate

- The final real-app checklist lives in `FRANCHISE_MODE1_MODE2_PLAYABLE_V1_GAP_ANALYSIS.md`.
- If any checklist item fails, the next implementation priority is the smallest patch for that finding.
- If the checklist passes, ask the user whether Mode 1/Mode 2 playable v1 is approved.
- Do not start Mode 3/offseason, auto-draft, AI simulation, final awards, final True Value/salary movement, final designation persistence, morale automation, relationship mutation, adaptive park-factor persistence, custom stadium factor entry, generated schedules, or full trade AI/salary matching before that approval decision.

## Operating Rules

- Docs are memory, commits are checkpoints, prompts are the workflow.
- Commit north-star doc changes before relying on them as durable context.
- Before every new Mode 2 implementation slice, read:
  - `FRANCHISE_MODE2_V1_CONTEXT_CARD.md`
  - `FRANCHISE_MODE2_V1_COMPLETION_ROADMAP.md`
  - the feature-specific spec being touched.
- Every Mode 2 implementation or audit prompt should state the current slice, current phase, recommended reasoning effort, and hard boundaries.
- Every meaningful checkpoint must either update the roadmap/context card or explicitly state `no roadmap update needed` in the audit/commit summary.
- Do not promote preview-only systems to trusted or mutating unless this roadmap names that promotion as the active slice.
- Commit rhythm: implement, focused tests/build/diff check, skeptical audit, patch if needed, commit, then derive the next prompt from this roadmap.
- If conversation context is compacted or uncertain, recover from repo truth by reading the context card, this roadmap, `git status --short --branch`, and `git log --oneline -8`.

## Audit Cadence

Use one skeptical audit per meaningful checkpoint:

- Doc/context resync.
- Expected-wins baseline snapshot storage.
- Performance-gap prompt generator.
- Designation readiness/Fan Favorite-Albatross promotion decision.
- Daily morale snapshots.
- Stadium records/richer spray UI.
- Future relationship state planning.
- Season handoff.

Do not re-audit tiny copy or polish repeatedly unless it changes data safety, persistence, hidden information, or user-visible workflow correctness.
