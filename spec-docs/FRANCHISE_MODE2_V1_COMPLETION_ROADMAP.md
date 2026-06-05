# Franchise Mode 2 V1 Completion Roadmap

Recommended reasoning effort: high for implementation slices, medium for audits and doc checkpoints.

## Current Source Of Truth

This document is the canonical Mode 2 v1 roadmap. `FRANCHISE_MODE2_V1_CONTEXT_CARD.md` is the compact resume card, and older roadmap/resync docs are historical context unless this file explicitly references them.

Manual smoke feedback remains a bug and feature backlog. The build order for Mode 2 should follow this file unless explicitly revised.

## Current State As Of Latest Commit

Latest committed checkpoint: `366064a Define v1 dynamic designation policy`.

Latest working checkpoint: Playable V1 Remaining Gap Reconciliation And Next Priority Pick.

Mode 2 is currently a reliability-first internal v1 track: many systems are scoped, durable, read-only, preview-only, or confirmation-gated, while final automation remains blocked until trusted inputs and lifecycle rules are approved. The technical foundation is safe, and the first Mode 1/2 playable hardening waves through schedule/trade/FARM/stadium/designation policy are committed, but manual smoke feedback still blocks declaring user-facing playable v1 complete.

## Completed Checkpoints

- Value, salary, designation, analytics, morale/relationship, and narrative eligibility gates exist as read-only scoped contracts.
- Player profiles, manual profile edits, player-local edit history, continuity, and player directory surfaces exist in Team Hub.
- Stadium foundation exists with scoped stadium identity, seed/static park-factor trust, archive-backed batting/pitching/fielding spray projection, and preview-only adaptive factors.
- Stadium foundation is surfaced read-only in Team Hub.
- Random event prompts now have durable scoped records, confirmation/dismiss state, idempotent safe-effect application, and Team Hub workflow.
- Canonical fan/player morale snapshots exist on the 0-99 scale, with player morale starting at neutral `50`.
- Team Hub exposes fan/player morale history and manual scoped morale controls while keeping profiles, salary, relationships, stories, and Mode 3 separate.
- Fan morale prompt formulas currently cover confirmed game results, streaks, 7+ run blowouts, archive-backed no-hitter/perfect-game fame events, and performance-gap team fan morale prompts from durable expected-wins baseline evidence.
- Dynamic designation morale bridge exists for safe confirmation-gated prompt candidates, and Team Hub surfaces preview-only TEAM_MVP/ACE recognition candidates through the random-event workflow.
- Dynamic designation policy matrix is explicit: TEAM_MVP/ACE are the only app-facing active preview-only designations, TWO-WAY routes as pitcher-only through ACE for internal v1, and Fan Favorite/Albatross/Cornerstone/Captain/Fan Hopeful remain blocked or explicit trusted-bridge-only context.
- Fan Favorite/Albatross readiness can be inspected from preview True Value/value-delta rows, but final designation behavior, random-event morale prompts, salary movement, relationships, and Mode 3 remain blocked.
- Numeric WAR preview values, position-relative True Value preview, and expected-wins preview exist as read-only, untrusted contracts.
- Team Hub surfaces True Value and expected-wins previews in Mode 2 Foundation Status with explicit preview-only boundaries.
- Expected-wins baseline snapshots persist scoped read-only baseline evidence from preview contracts while remaining untrusted for mutation and final formula consumers.
- Daily morale snapshot summaries persist scoped high/low/average evidence from confirmed/manual morale history while remaining read-only and untrusted for drift, recovery, relationship effects, and Mode 3.
- Stadium records boundary persists scoped read-only evidence for conservative team/game stadium records, spray event leaders, and safe no-hitter/perfect-game archive context while adaptive factors and final park-adjusted consumers remain blocked.
- Expected-wins baselines, daily morale snapshots, and stadium records are registered as portable scoped evidence stores in save-slot, backup, and sync registry surfaces, matching random events and canonical morale.
- Team Hub Stadium tab provides a compact read-only spray evidence inspector with role/player/team/hand/outcome/zone/sort filters using scoped stadium foundation rows.
- Team Hub player profiles surface read-only relationship context/proposal boundaries for player-player, fan/team, and hidden-safe scout/prospect contexts using the draft-only manual override validator.
- Season-end readiness report exists as a pure read-only review contract for scoped game archives, random-event review state, morale evidence, daily summaries, expected-wins baselines, stadium records, designation readiness, relationship context, and blocked future systems.
- Season handoff plan exists as a pure read-only blocked migration manifest that lists eligible review evidence, blocked carryover categories, unresolved blockers, warnings, and future decisions required before any Mode 3/offseason execution.
- `FRANCHISE_MODE1_MODE2_PLAYABLE_V1_GAP_ANALYSIS.md` reconciles the current foundation, manual smoke feedback, and Mode 2 worksheet into the active Mode 1/Mode 2 playable hardening plan.
- Mode 1/2 Core Launch And Persistence Smoke Hardening is committed.
- Franchise Data Generation Policy Cleanup is committed: generated Franchise prospects/scouts no longer use DH identities, SMB4 name sources are used where present, and salary/payroll baselines are covered for generated data.
- Team Hub Roster Usability is committed with sortable salary, morale, stat/value, and designation summary columns.
- Dynamic Designation Correctness is committed for bounded TEAM_MVP/ACE preview ranking and prompt volume.
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
- Dynamic Designation Policy Matrix And Two-Way Boundary is committed: TEAM_MVP/ACE are active preview-only, TWO-WAY routes pitcher-only through ACE for internal v1, and older full-system designation lock/carryover language remains subordinate to the v1 matrix.

## Active Priority Order

1. Manual Final-Score Workflow UX Polish And Confirmation-Gated Wording
   - Make score-only/manual-result entry clearer at the point of action and after completion.
   - Ensure labels and copy distinguish schedule/standings/team fan morale confirmation from player stats, WPA, fame, awards, designations, Almanac player history, and relationship effects.
   - Keep Mode 1 and Mode 2 as the only active playable-v1 priority.
   - No auto-draft, generated schedules, AI simulation, awards finalization, story automation, production storage mutation, or Mode 3/offseason execution until separately approved.
2. Real Populated Production Team Hub/Schedule Visual Smoke Harness
   - Move beyond fixture-only confidence by proving populated schedule and Team Hub roster rows in a production-shaped state without writing unsafe demo data.
3. Transaction History Drilldown And Roster Movement Explainability
   - Improve discoverability for call-up/send-down/trade continuity if users still cannot tell what happened, while keeping mutation paths unchanged.
4. Score-only History/Almanac Boundary Copy Pass
   - Keep only if the manual final-score slice does not fully settle score-only labels in history/reporting surfaces.
5. Remaining Compact UI/Help-Affordance Cleanup
   - Reduce explanatory text in default views while preserving blockers behind help/disclosure affordances.

## Playable V1 Remaining Work

- Manual final-score workflow UX polish and score-only confirmation-gated wording.
- Real populated production schedule-row visual smoke, beyond fixture-only preview confidence.
- Real populated production Team Hub roster-row visual smoke, beyond fixture-only preview confidence.
- Transaction history drilldown and roster movement explainability, if current trade/FARM workflow remains opaque in manual smoke.
- Full seeded state harness scope beyond the current safe preview route and fixture-only coverage.
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
- Fan Favorite and Albatross final behavior requires an explicit promotion decision for trusted True Value/value-delta inputs.
- Captain morale amplification remains blocked until hidden-charisma reveal/safety policy is approved.
- Fan Hopeful morale boosts must be prospect-safe and must not expose hidden FARM truth.
- TWO-WAY designation routing is pitcher-only for internal v1; stricter two-way Team MVP criteria are deferred.
- Profile automation, salary movement, final True Value, final designation changes, relationship mutation, story persistence beyond the random-event log, Mode 3/offseason effects, and unrevealed FARM hidden-truth effects remain blocked.
- Existing prototype/global `useFanMorale` paths are not canonical Franchise v1 morale storage.
- Mode 1/Mode 2 playable hardening remains active until the user-facing loop is approved; foundation-safe does not mean playable-complete.

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
