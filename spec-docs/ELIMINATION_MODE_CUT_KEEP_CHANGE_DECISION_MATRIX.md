# Elimination Mode Cut / Keep / Change Decision Matrix

## Scope

This document is not a recommendation for future design intent. It is a current-state decision aid built from the traced codebase.

Each subsystem is labeled:

- `Keep`
  - current implementation is materially real and structurally useful
- `Keep, but repair`
  - real implementation exists, but key defects or architectural splits should be fixed before relying on it
- `Replace`
  - there is real code, but its current shape is a poor foundation for the intended role
- `Cut`
  - feature is UI-only, misleading, or not meaningfully integrated in the live elimination path

The rationale here is based strictly on current code truth, not wishlist behavior.

## Summary matrix

| Subsystem | Decision | Why |
| --- | --- | --- |
| League Builder -> elimination league/team sourcing | Keep | real, clean, narrow dependency |
| Elimination metadata model | Keep | small, understandable, appropriate for summary state |
| Frozen roster snapshot system | Keep, but repair | strong core idea, but snapshot scope is partial and identity continuity later breaks |
| Team Hub lineup/rotation editor | Keep | real durable editor over snapshots |
| Controlled-team setup concept | Cut | UI-only in current path |
| Setup home-field-pattern selector | Cut or Replace | current setup control does not drive runtime home-field logic |
| Playoff config/series persistence | Keep, but repair | real and durable, but final-round conference assumptions conflict with elimination structure |
| Snapshot-based game launch | Keep | correct architectural seam |
| Live team branding/stadium read at launch | Keep, but decide intentionally | real mixed-truth behavior; acceptable only if intentional |
| GameTracker elimination route integration | Keep, but repair | functional, but season and player identity handling are inconsistent |
| Name-based gameplay player IDs | Replace | main blocker for robust stat reference |
| currentGame autosave / refresh recovery | Keep | materially useful and real |
| Event log + fielding-event persistence | Keep, but repair | strong durable substrate, but between-play ledger is incomplete |
| Elimination season aggregation | Keep, but repair | real data pipeline, but keyed to rewritten player IDs |
| Elimination career aggregation | Keep, but repair | real, but pollutes long-term player identity continuity |
| Elimination playoff stats / leaders | Keep, but repair | valuable and live, but identity continuity is broken |
| Elimination awards | Keep | simple, derived, and durable enough for current scope |
| Elimination history tab | Keep | real and based on durable completed playoff records |
| Elimination mojo/fitness carryover | Keep, but repair | real durable value, but keyed to rewritten gameplay IDs |
| Direct Museum/Almanac integration | Replace or explicitly defer | current coupling is indirect, partial, and stale-prone |

## Detailed decisions

### 1. League Builder sourcing

Decision:

- `Keep`

Current strengths:

- elimination setup reads directly from the existing Mode 1 source of truth
- no extra translation layer during setup
- team and league identity continuity is strong

Current weaknesses:

- none severe inside the scoped setup seam

Why keep:

- this seam is already understandable and narrow

### 2. Elimination metadata model

Decision:

- `Keep`

Current strengths:

- simple summary record
- clear role
- good enough for slot list, current round, status, champion, awards cache

Current weakness:

- does not and should not pretend to be full bracket truth

Why keep:

- separation from playoff structure is reasonable

### 3. Frozen roster snapshot system

Decision:

- `Keep, but repair`

Current strengths:

- correct conceptual boundary after setup
- lets elimination detach from live roster edits
- Team Hub and launch both reuse it

Repairs needed:

- decide whether snapshot should include more of `TeamRoster`
  - bullpen roles
  - `lineupVsLHP`
  - depth chart
- decide whether player pool should freeze `mlbRoster` membership instead of `getPlayersByTeam()`
- preserve stable player identity through gameplay

Why not replace:

- the core snapshot approach is solid; the execution scope is just incomplete

### 4. Team Hub

Decision:

- `Keep`

Current strengths:

- real durable editor over frozen elimination truth
- edits exactly the structures launch depends on
- small surface area

Limitations:

- lineup/rotation only

Why keep:

- it already solves a real problem and sits on the right store

### 5. Controlled-team setup option

Decision:

- `Cut`

Why:

- currently UI state only
- not persisted
- not consulted by launch/runtime/AI ownership logic

If desired later:

- reintroduce only when a real ownership/auto-play/control system exists

### 6. Setup home-field-pattern option

Decision:

- `Cut or Replace`

Current problem:

- setup collects and confirms a value
- runtime series-home logic uses playoff engine pattern logic instead

If you want setup to own this:

- `Replace` current path with a true persisted home-field config wired into series-game home selection

If you do not need user control:

- `Cut` the setup control and let engine logic be the explicit truth

### 7. Playoff DB and round advancement

Decision:

- `Keep, but repair`

Current strengths:

- bracket, series, and playoff stats are real and useful
- history/leaders are built on it

Critical repair:

- `createNextRoundSeries()` expects East/West champions in the final round
- current elimination creation is structurally single-conference

Why not replace:

- most of the bracket machinery is valuable; the conference/final-round assumption is the key bug

### 8. Snapshot-based launch seam

Decision:

- `Keep`

Current strengths:

- clear separation between elimination roster truth and gameplay runtime
- robust place to centralize future normalization if needed

Why keep:

- this is one of the cleaner seams in the current architecture

### 9. Mixed frozen/live launch data

Decision:

- `Keep, but decide intentionally`

Current behavior:

- frozen roster + live colors/stadium

This is acceptable only if you want:

- roster immutability
- presentation to follow latest team branding/stadium edits

If not intentional:

- freeze branding/stadium into snapshot too

### 10. GameTracker elimination integration

Decision:

- `Keep, but repair`

Current strengths:

- elimination route context is real
- season aggregation, playoff stats, mojo/fitness carryover all run

Repairs needed:

- align initialize-time season identity with end-game season identity
- stop rewriting player IDs as the canonical key
- reduce page-level split truth where possible

### 11. Name-based gameplay player IDs

Decision:

- `Replace`

Why:

- this is the main cause of player identity fragmentation
- breaks robust stat reference
- causes same-player home/away splits
- creates same-name collision risk
- pollutes season/career/playoff/museum-facing data

What should replace it:

- canonical stable player identity from Mode 1
- optionally with a separate runtime/session alias if UI needs it

### 12. currentGame autosave / recovery

Decision:

- `Keep`

Current strengths:

- real value
- exact-state recovery path is stronger than reconstructing from raw at-bat events only

Caveat:

- it preserves whatever canonical IDs gameplay already chose

### 13. Event log and fielding sidecar

Decision:

- `Keep, but repair`

Current strengths:

- durable at-bat history
- durable fielding-event substrate
- supports reconstruction and fielding aggregation

Repairs needed:

- make between-play event ledger fully real if you want complete historical truth
- reduce dependence on positional back-resolution where possible

### 14. Elimination season/career/playoff stat pipelines

Decision:

- `Keep, but repair`

Current strengths:

- real outputs already exist
- not just placeholder systems

Repairs needed:

- player identity continuity
- museum/almanac integration clarity
- possible cleanup of season-context mismatch at initialize vs end game

Why not replace:

- the aggregation substrate is useful; the key problem is keying, not absence

### 15. Elimination leaders

Decision:

- `Keep, but repair`

Current strengths:

- live and useful
- direct read over playoff stats

Repair needed:

- stable player identity for robust cross-reference

### 16. Elimination awards

Decision:

- `Keep`

Current strengths:

- simple derived layer
- low complexity
- cached onto elimination metadata

Limit:

- current categories are only as good as playoff stats identity quality

### 17. Elimination history

Decision:

- `Keep`

Current strengths:

- real completed-playoff history
- derived from durable bracket records

Limit:

- currently a summary surface, not deep historical navigation

### 18. Mojo/Fitness carryover

Decision:

- `Keep, but repair`

Current strengths:

- real inter-game persistence
- meaningful elimination-specific value

Repair needed:

- stable player keying

### 19. Museum/Almanac integration

Decision:

- `Replace or explicitly defer`

Current reality:

- no direct elimination -> museum pipeline
- all-time leaders only indirectly backfill from career storage
- auto-populate runs only when museum leaders are empty

If Almanac is a major product surface:

- `Replace` with an explicit integration pipeline and stable identity model

If Almanac is out of current scope:

- explicitly defer and stop implying live robust integration

## Sequencing implication

If the goal is to decide what to preserve before UI redesign, the highest-value sequence is:

1. keep the Mode 1 sourcing seam
2. keep the snapshot concept
3. keep Team Hub
4. keep playoff structure/stats but repair advancement
5. replace gameplay player identity
6. then decide whether museum integration is in-scope or deferred

## Hard blocker list before claiming robust elimination stat reference

These are not UI polish items. They are architectural blockers:

1. canonical player identity must stop switching to `home-/away-name`
2. season/career/playoff rows must share that stable player key
3. elimination mojo/fitness snapshots must key on the same stable player key
4. if Almanac is in scope, museum population must become an intentional pipeline rather than empty-store auto-seed behavior
5. playoff final-round advancement must match the actual elimination bracket structure

## Bottom line

The elimination system already contains a real core worth preserving:

- setup from League Builder
- frozen bracket rosters
- bracket persistence
- launch into GameTracker
- completion into season/career/playoff outputs
- leaders, awards, history

The main thing to replace is not the whole feature. It is the identity model at the GameTracker boundary, plus a few misleading or unwired setup concepts.

