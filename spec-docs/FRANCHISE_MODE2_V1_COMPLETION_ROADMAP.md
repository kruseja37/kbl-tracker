# Franchise Mode 2 V1 Completion Roadmap

Recommended reasoning effort: high for implementation slices, medium for audits and doc checkpoints.

## Current Source Of Truth

This document supersedes ad hoc manual-smoke notes as the active Mode 2 v1 roadmap. Manual smoke feedback remains a bug and feature backlog, but the build order for Mode 2 should follow this file unless explicitly revised.

## Completed Checkpoints

- Value, salary, designation, analytics, morale/relationship, and narrative eligibility gates exist as read-only scoped contracts.
- Player profiles, manual profile edits, player-local edit history, continuity, and player directory surfaces exist in Team Hub.
- Stadium foundation exists with scoped stadium identity, seed/static park-factor trust, archive-backed batting/pitching/fielding spray projection, and preview-only adaptive factors.
- Stadium foundation is surfaced read-only in Team Hub.
- Random event prompts now have durable scoped records, confirmation/dismiss state, idempotent safe-effect application, and Team Hub workflow.
- Canonical fan/player morale snapshots exist on the 0-99 scale, with player morale starting at neutral `50`.
- Fan morale prompt formulas currently cover confirmed game results, streaks, 7+ run blowouts, and archive-backed no-hitter/perfect-game fame events.

## Active Priority Order

1. Dynamic Designation Morale Bridge
   - Treat designations as first-class morale context before deep expected-wins work.
   - Map designation identity, changes, roster moves, and performance context into confirmation-gated morale prompt candidates.
   - See `FRANCHISE_MODE2_DYNAMIC_DESIGNATION_MORALE_BRIDGE.md`.

2. Expected Wins + Performance Gap
   - Expected wins remain True Value based per fan morale spec.
   - Contract/payroll baselines may describe preseason expectation context, but should not replace True Value performance-gap logic.
   - Fan Favorite/Albatross value-delta sentiment belongs to the designation bridge, not expected-wins baseline.

3. Formula Weighting + Daily Snapshots
   - Convert confirmed prompt history into daily high/low/average morale summaries.
   - Keep automatic recalculation blocked until expected-wins and designation inputs are trusted.

4. Relationship Context
   - Relationships remain visible/draft/manual context only in v1.
   - No durable relationship mutation until fan/player morale is stable.

5. Season Handoff
   - Later slice: decide what morale/event state carries into future seasons.
   - No Mode 3/offseason execution until scoped lifecycle rules are approved.

## Locked V1 Boundaries

- Score-only results may affect team fan morale only after user confirmation.
- Score-only results must never create player morale, player stats, WPA/WAR, awards, designations, player history, or relationship mutation.
- GameTracker archive-backed events can support prompts and confirmed effects, but GameTracker completion must not silently mutate canonical franchise morale.
- Confirmed random events can apply safe fan/player morale effects only through the canonical morale state model.
- Dynamic designation effects must enter v1 as confirmation-gated random-event prompts, not automatic designation/profile/morale mutation.
- Fan Favorite and Albatross final behavior requires trusted True Value/value-delta inputs.
- Captain morale amplification remains blocked until hidden-charisma reveal/safety policy is approved.
- Fan Hopeful morale boosts must be prospect-safe and must not expose hidden FARM truth.
- Profile automation, salary movement, True Value, designation changes, relationship mutation, story persistence beyond the random-event log, Mode 3/offseason effects, and unrevealed FARM hidden-truth effects remain blocked.
- Existing prototype/global `useFanMorale` paths are not canonical Franchise v1 morale storage.

## Audit Cadence

Use one skeptical audit per meaningful checkpoint:

- Durable random-event log + morale storage.
- Team Hub confirm/dismiss workflow.
- GameTracker prototype morale reconciliation.
- Dynamic designation morale bridge contract.
- Future relationship state planning.
- Season handoff.

Do not re-audit tiny copy or polish repeatedly unless it changes data safety, persistence, hidden information, or user-visible workflow correctness.
