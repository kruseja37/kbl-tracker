# Franchise Mode 2 V1 Context Card

Recommended reasoning effort: high for implementation slices, medium for doc-only checkpoints.

## North Star

Reliability-first Mode 2 completion. Finish a playable, scoped, auditable internal v1 before chasing full canonical Mode 2 parity.

Canonical roadmap: `FRANCHISE_MODE2_V1_COMPLETION_ROADMAP.md`.

Latest committed checkpoint: `beedb03 Add expected wins baseline snapshot storage`.

Latest working checkpoint: Performance-gap fan morale prompts (pending commit).

## Current Completed

- Read-only scoped gates exist for value, salary, designation, analytics, morale/relationship, and narrative eligibility.
- Team Hub surfaces player profiles, profile edits, continuity, directory, foundation status, stadium foundation, random-event log, fan/player morale, True Value preview, and expected-wins preview.
- Stadium foundation supports scoped identity, seed/static park-factor trust, archive-backed batting/pitching/fielding spray projection, and preview-only adaptive factors.
- Durable random-event log supports generated prompts, confirmation/dismissal, idempotent safe-effect application, and Team Hub workflow.
- Canonical fan/player morale storage uses 0-99 scale; player morale starts at neutral `50`; manual scoped adjustments exist.
- Fan morale prompt formulas cover game result, streaks, 7+ run blowouts, archive-backed no-hitter/perfect-game fame events, and performance-gap team fan morale prompts from durable expected-wins baseline evidence.
- Dynamic designation morale bridge supports safe preview TEAM_MVP/ACE recognition prompts through random-event confirmation.
- Numeric WAR preview, position-relative True Value preview, expected-wins preview, Team Hub display, and durable expected-wins baseline snapshots are read-only and untrusted.

## Current Active Slice

Performance-Gap Fan Morale Prompts (pending commit).

Goal: compare actual scoped records against durable expected-wins baseline snapshots to create confirmation-gated team fan morale prompts.

## Next Queue

1. Performance-gap fan morale prompts.
2. Designation readiness / Fan Favorite-Albatross promotion decision.
3. Daily morale snapshots.
4. Stadium records and richer spray UI.

## Hard Boundaries

- No silent GameTracker morale mutation.
- No hidden FARM/prospect truth leaks.
- No final True Value, final designations, salary movement, or Fan Favorite/Albatross finalization yet.
- No relationship mutation.
- No story persistence beyond the random-event log.
- No adaptive park-factor persistence or final park-adjusted value/WAR consumers.
- No Mode 3/offseason handoff or execution.
- Score-only rows may affect team fan morale only after explicit confirmation; never player morale, stats, WPA/WAR, awards, designations, player history, or relationships.

## Operating Rules

- Docs are memory, commits are checkpoints, prompts are the workflow.
- Commit north-star doc changes before relying on them as durable context.
- Read this card, the completion roadmap, and the touched feature spec before every Mode 2 slice.
- Every Mode 2 implementation or audit prompt should state the current slice, current phase, recommended reasoning effort, and hard boundaries.
- Every meaningful checkpoint must update this card/roadmap or explicitly say `no roadmap update needed`.
- Do one skeptical audit per meaningful checkpoint, not repeated audits for copy polish.
- Never promote preview-only data to trusted/mutating behavior unless the roadmap names that promotion as the active slice.
- If conversation context is compacted or uncertain, recover from repo truth by reading this card, the roadmap, `git status --short --branch`, and `git log --oneline -8`.

## Audit Prompt Template

Use this after each Mode 2 checkpoint:

```md
Perform an objective skeptical audit of the latest Mode 2 slice.

Check:
- Scope matches the requested checkpoint and does not add unrelated behavior.
- Franchise/season/stats scope boundaries are strict.
- Hidden FARM/prospect truth is not exposed.
- Preview-only systems remain untrusted unless explicitly promoted by the roadmap.
- No new storage writes, mutation handlers, salary movement, designation persistence, relationship mutation, story persistence, GameTracker silent morale mutation, adaptive park-factor persistence, offseason, or Mode 3 behavior were added unless explicitly requested.
- Team Hub/UI copy and controls match the data boundary.
- Tests cover the meaningful trust boundary and not just happy-path rendering.

Report findings first, then confirmed good, verification, remaining risks, and final safe-to-commit verdict.
```
