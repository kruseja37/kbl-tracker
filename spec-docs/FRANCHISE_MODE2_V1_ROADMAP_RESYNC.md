# Franchise Mode 2 V1 Roadmap Resync

**Date:** June 2, 2026
**Recommended reasoning effort:** high for implementation; medium for doc-only updates
**Status:** Active planning baseline

## Purpose

This document resets the Mode 2 v1 roadmap around the systems that are now considered foundational rather than optional polish. It should be treated as the current priority bridge between the older Mode 2 reconciliation worksheet, the stadium analytics spec, and the manual smoke feedback backlog.

Manual smoke feedback remains a bug/feature backlog. It should not become the roadmap source of truth.

## Locked Direction

1. **Next pillar: Stadium foundation first.**
   - Stadium identity, dimensions, seed park factors, archive-backed spray chart projection, and stadium-record boundaries come before new random-event or morale mutation systems.
   - Stadium foundation must feed future park-adjusted analytics, player spray charts, stadium-specific records, random-event prompts, and fan/player morale inputs.

2. **Spray chart source: completed GameTracker archive/event evidence.**
   - v1 does not add a separate durable spray-chart store.
   - Spray charts are projected from scoped completed-game archives plus event-log at-bat and fielding rows when available.
   - Required views: batting, pitching, and fielding.
   - Required filters/sorts: player, team, stadium, franchise/season/stats scope, handedness, and outcome when the underlying data exists.

3. **Park factors: seed/static trusted; adaptive preview-only.**
   - Seed/static factors from SMB4 park dimensions are trusted as v1 inputs.
   - Archive-derived adaptive factors can be displayed as preview-only.
   - Adaptive factors are not persisted, not used for final True Value, and not promoted into final WAR/value consumers until separately audited.

## Implementation Order

### 1. Stadium Foundation Adapter

Build a pure read-only report that exposes franchise/season/stats scope, Mode 1 stadium handoff identity, SMB4 park dimensions, seed park factors, completed-game archive counts, batting/pitching/fielding spray chart projections, adaptive park-factor preview readiness, and the blocked stadium-record persistence boundary.

No UI mutation, storage migration, adaptive factor persistence, narrative generation, morale mutation, or profile automation belongs in this slice.

### 2. Stadium / Spray UI Surface

After the adapter is stable, add a compact iPad-readable surface in Team Hub or Franchise analytics for stadium identity, dimensions, seed park factors, archive sample size, spray charts, filters/sorts, preview-only adaptive factors, and blocked stadium records.

### 3. Random Event Generator Log

Once stadium facts and spray evidence are available, implement the event generator as prompt/log/confirmation, not silent mutation: triggered prompt, evidence/reason, suggested manual change, confirmation checkbox/state, and narrative-readable log status.

No automatic player-profile mutation is required for v1.

### 4. Fan + Player Morale

Fan and player morale are critical v1 systems, but they should build on approved evidence contracts: durable explicit state, manual/user-confirmed changes first, GameTracker/archive facts and random-event confirmations as suggestions, explicit approval for score-only effects, and hidden FARM/prospect safety.

## Audit Rhythm

Avoid repeated skeptical audits of tiny copy/UI polish. Do one objective audit per meaningful checkpoint:

1. doc resync;
2. stadium adapter;
3. first stadium/spray UI surface;
4. random event log;
5. morale state model.

## Relationship To Older Docs

- `STADIUM_ANALYTICS_SPEC.md` remains the broad technical spec, but v1 now prioritizes the read-only stadium foundation and spray projection first.
- `MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md` previously marked park factors, random events, fan morale, and player morale as discuss/defer. That stance is superseded by this resync: those systems are v1 priorities, implemented in the order above.
- `FRANCHISE_INTERNAL_V1_MANUAL_SMOKE_FEEDBACK.md` remains a backlog for bugs/features discovered while testing.
