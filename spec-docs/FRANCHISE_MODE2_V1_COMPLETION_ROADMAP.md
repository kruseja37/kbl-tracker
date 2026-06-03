# Franchise Mode 2 V1 Completion Roadmap

Recommended reasoning effort: high for implementation slices, medium for audits and doc checkpoints.

## Current Source Of Truth

This document supersedes ad hoc manual-smoke notes as the active Mode 2 v1 roadmap. Manual smoke feedback remains a bug and feature backlog, but the build order for Mode 2 should follow this file unless explicitly revised.

## Completed Checkpoints

- Value, salary, designation, analytics, morale/relationship, and narrative eligibility gates exist as read-only scoped contracts.
- Player profiles, manual profile edits, player-local edit history, continuity, and player directory surfaces exist in Team Hub.
- Stadium foundation exists with scoped stadium identity, seed/static park-factor trust, archive-backed batting/pitching/fielding spray projection, and preview-only adaptive factors.
- Stadium foundation is surfaced read-only in Team Hub.
- Random event prompts exist as foundation/UI preview entries, but prior to this roadmap they were not durable behavior.

## Active Priority Order

1. Durable Random Event Log
   - Store scoped prompt records.
   - Preserve evidence, reason, suggested manual change, confirmation state, applied effect state, and narrative-readable status.
   - Confirmation must never edit player profiles automatically.

2. Fan + Player Morale State
   - Canonical franchise-scoped morale storage.
   - Team fan morale snapshots per franchise/team/season.
   - Player morale snapshots per franchise/player/season.
   - Event-backed history entries with prior/current value, delta, reason, actor, timestamp, and source event id.

3. Team Hub Workflow
   - Durable event log panel with confirm/dismiss controls.
   - Safe-effect preview before confirmation.
   - Applied/skipped/failed state after confirmation.
   - Fan Morale tab becomes the first real v1 morale surface.
   - Player profiles show player morale history once durable state exists.

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
- Profile automation, salary movement, True Value, designation changes, relationship mutation, story persistence beyond the random-event log, Mode 3/offseason effects, and unrevealed FARM hidden-truth effects remain blocked.
- Existing prototype/global `useFanMorale` paths are not canonical Franchise v1 morale storage.

## Audit Cadence

Use one skeptical audit per meaningful checkpoint:

- Durable random-event log + morale storage.
- Team Hub confirm/dismiss workflow.
- GameTracker prototype morale reconciliation.
- Future relationship state planning.
- Season handoff.

Do not re-audit tiny copy or polish repeatedly unless it changes data safety, persistence, hidden information, or user-visible workflow correctness.
