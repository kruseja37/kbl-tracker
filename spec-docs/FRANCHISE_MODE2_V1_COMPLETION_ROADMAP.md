# Franchise Mode 2 V1 Completion Roadmap

Recommended reasoning effort: high for implementation slices, medium for audits and doc checkpoints.

## Current Source Of Truth

This document is the canonical Mode 2 v1 roadmap. `FRANCHISE_MODE2_V1_CONTEXT_CARD.md` is the compact resume card, and older roadmap/resync docs are historical context unless this file explicitly references them.

Manual smoke feedback remains a bug and feature backlog. The build order for Mode 2 should follow this file unless explicitly revised.

## Current State As Of Latest Commit

Latest committed checkpoint: `189b065 Add designation readiness report`.

Latest working checkpoint: no active uncommitted slice. Next planned slice is Daily Morale Snapshots.

Mode 2 is currently a reliability-first internal v1 track: many systems are scoped, durable, read-only, preview-only, or confirmation-gated, while final automation remains blocked until trusted inputs and lifecycle rules are approved.

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
- Fan Favorite/Albatross readiness can be inspected from preview True Value/value-delta rows, but final designation behavior, random-event morale prompts, salary movement, relationships, and Mode 3 remain blocked.
- Numeric WAR preview values, position-relative True Value preview, and expected-wins preview exist as read-only, untrusted contracts.
- Team Hub surfaces True Value and expected-wins previews in Mode 2 Foundation Status with explicit preview-only boundaries.
- Expected-wins baseline snapshots persist scoped read-only baseline evidence from preview contracts while remaining untrusted for mutation and final formula consumers.

## Active Priority Order

1. Daily Morale Snapshots
   - Convert confirmed prompt/manual history into durable daily high/low/average morale summaries.
   - Keep automatic drift/recovery blocked until snapshot and weighting policy is approved.

2. Stadium Records + Richer Spray UI
   - Add durable stadium records and richer batting/pitching/fielding spray views after preview surfaces are stable.
   - Keep adaptive park-factor persistence and final value/WAR consumers blocked until separately audited.

3. Relationship Context
   - Relationships remain visible/draft/manual context only in v1.
   - No durable relationship mutation until fan/player morale is stable.

4. Season Handoff
   - Later slice: decide what morale/event state carries into future seasons.
   - No Mode 3/offseason execution until scoped lifecycle rules are approved.

## Playable V1 Remaining Work

- Daily morale snapshots and season high/low/average summaries.
- Stadium record storage and richer spray-chart UI.
- Relationship context display only, without mutation.
- Season-end readiness checks before any Mode 3 handoff.

## Full Spec Parity Backlog

- Final True Value promotion, salary movement, and salary lifecycle automation.
- Projected and locked dynamic designations, including season-end locking/carryover.
- Captain hidden-charisma/leadership policy and morale amplification.
- Full fan morale formula weighting, beat reporter sentiment, drift/recovery, franchise health, free-agency consequences, and trade scrutiny.
- Durable relationship state, relationship mutation, and chemistry/narrative effects.
- Story persistence beyond the random-event log and full narrative engine integration.
- Adaptive park-factor persistence, stadium historical records, and final park-adjusted value/WAR consumers.
- Awards persistence, playoffs/finals summaries, complete season handoff, and Mode 3/offseason execution.

## Locked V1 Boundaries

- Score-only results may affect team fan morale only after user confirmation.
- Score-only results must never create player morale, player stats, WPA/WAR, awards, designations, player history, or relationship mutation.
- GameTracker archive-backed events can support prompts and confirmed effects, but GameTracker completion must not silently mutate canonical franchise morale.
- Confirmed random events can apply safe fan/player morale effects only through the canonical morale state model.
- Dynamic designation effects must enter v1 as confirmation-gated random-event prompts, not automatic designation/profile/morale mutation.
- True Value, value deltas, and expected wins are currently preview-only and not trusted for final designations, salary movement, morale automation, daily snapshots, or Mode 3.
- Fan Favorite and Albatross final behavior requires an explicit promotion decision for trusted True Value/value-delta inputs.
- Captain morale amplification remains blocked until hidden-charisma reveal/safety policy is approved.
- Fan Hopeful morale boosts must be prospect-safe and must not expose hidden FARM truth.
- Profile automation, salary movement, final True Value, final designation changes, relationship mutation, story persistence beyond the random-event log, Mode 3/offseason effects, and unrevealed FARM hidden-truth effects remain blocked.
- Existing prototype/global `useFanMorale` paths are not canonical Franchise v1 morale storage.

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
