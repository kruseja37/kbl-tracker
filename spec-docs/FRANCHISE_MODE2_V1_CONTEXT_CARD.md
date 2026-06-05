# Franchise Mode 2 V1 Context Card

Recommended reasoning effort: high for implementation slices, medium for doc-only checkpoints.

## North Star

Reliability-first Mode 2 completion. Finish a playable, scoped, auditable internal v1 before chasing full canonical Mode 2 parity.

Canonical roadmap: `FRANCHISE_MODE2_V1_COMPLETION_ROADMAP.md`.

Latest committed checkpoint: `366064a Define v1 dynamic designation policy`.

Latest working checkpoint: Manual Smoke Findings Capture And FARM Hidden-Rating Leak Hardening.

## Current Completed

- Read-only scoped gates exist for value, salary, designation, analytics, morale/relationship, and narrative eligibility.
- Team Hub surfaces player profiles, profile edits, continuity, directory, foundation status, stadium foundation, random-event log, fan/player morale, True Value preview, and expected-wins preview.
- Stadium foundation supports scoped identity, seed/static park-factor trust, archive-backed batting/pitching/fielding spray projection, and preview-only adaptive factors.
- Stadium records boundary can persist scoped read-only record evidence for team/game records, spray leaders, and safe no-hitter/perfect-game archive context.
- Team Hub Stadium tab includes a compact read-only spray evidence inspector with role/player/team/hand/outcome/zone/sort filters.
- Team Hub player profiles include compact read-only relationship context/proposal boundaries using the draft-only manual override validator.
- Season-end readiness checks can classify scoped Mode 2 evidence for review before future handoff while keeping Mode 3/offseason execution blocked.
- Season handoff planning can produce a read-only blocked migration manifest for future carry-forward decisions without rollover/carryover writes.
- Durable random-event log supports generated prompts, confirmation/dismissal, idempotent safe-effect application, and Team Hub workflow.
- Canonical fan/player morale storage uses 0-99 scale; player morale starts at neutral `50`; manual scoped adjustments exist.
- Fan morale prompt formulas cover game result, streaks, 7+ run blowouts, archive-backed no-hitter/perfect-game fame events, and performance-gap team fan morale prompts from durable expected-wins baseline evidence.
- Durable daily morale snapshot summaries can persist scoped high/low/average evidence from confirmed/manual morale history without drift, recovery, or automatic mutation.
- Expected-wins baselines, daily morale snapshots, and stadium records are registered as portable scoped evidence stores for save-slot, backup, and sync surfaces; they remain read-only evidence and do not unlock mutation.
- Dynamic designation morale bridge supports safe preview TEAM_MVP/ACE recognition prompts through random-event confirmation.
- Dynamic designation policy matrix is explicit: TEAM_MVP/ACE are the only app-facing active preview-only designations, TWO-WAY routes as pitcher-only through ACE, and Fan Favorite/Albatross/Cornerstone/Captain/Fan Hopeful remain blocked or explicit trusted-bridge-only context.
- Fan Favorite/Albatross readiness can be inspected from preview True Value/value-delta rows, but remains blocked for final designation behavior, random-event morale prompts, salary movement, relationships, and Mode 3.
- Numeric WAR preview, position-relative True Value preview, expected-wins preview, Team Hub display, and durable expected-wins baseline snapshots are read-only and untrusted.
- The Mode 2 technical foundation is safe to build on, but manual smoke feedback shows the user-facing Mode 1/Mode 2 playable UI/UX is not complete.
- Mode 1/2 playable hardening has now committed core launch/persistence smoke fixes, generated data policy cleanup, roster scan table improvements, MVP/Ace preview correctness, salary baseline visibility, stadium source-of-truth copy, dense UI hardening, Almanac continuity, archived WPA visibility, fame-event continuity, a safe visual-smoke preview route, populated fixture coverage, schedule editing/import hardening, trade/FARM hidden-safety and movement continuity, park-factor archive trust tightening, the dynamic designation policy matrix/TWO-WAY boundary, and manual final-score/score-only UX polish.
- Schedule editing/import is hardened for the current manual/CSV non-generated policy, but production populated schedule visual smoke remains fixture-backed rather than proven from arbitrary user local data.
- Trade/FARM continuity is hardened for v1-safe hidden-safety and movement boundaries, while full trade UX, AI trades, salary matching, and offseason trade systems remain deferred.
- The safe visual-smoke preview covers shell/foundation/finance/stadium, populated fixture rows, Game Detail WPA/fame, Player Instance Card WPA, and GameTracker long-name visibility, but real populated production Team Hub/schedule visual smoke remains a future confidence check.
- `FRANCHISE_MODE1_MODE2_PLAYABLE_V1_GAP_ANALYSIS.md` is the active playable-v1 gap plan and now includes the 2026-06-05 manual smoke findings. Playable v1 is still not approved.
- Hidden/unrevealed FARM prospect salary is being hardened to use draft/scouting-safe public context rather than actual hidden ratings. Revealed/sent-down players must stay revealed and editable even while rostered as FARM.

## Current Active Slice

Manual Smoke Findings Capture And FARM Hidden-Rating Leak Hardening.

Goal: preserve the latest manual smoke findings, keep playable v1 unapproved, and harden the first P0 data-policy target: FARM salary/reveal safety.

## Next Queue

1. Finish FARM salary/reveal hardening and rerun focused salary/FARM/profile/trade/launch tests.
2. Patch the next smallest remaining manual smoke finding.
3. Keep playable v1 unapproved until the blocker set is cleared and the user approves it.
4. If later smoke reveals only polish, queue that polish explicitly after the approval decision.
5. Keep Mode 3/offseason and full-spec systems deferred until approval.

## Hard Boundaries

- No silent GameTracker morale mutation.
- No hidden FARM/prospect truth leaks.
- No final True Value, final designations, salary movement, or Fan Favorite/Albatross finalization yet.
- No final awards persistence or awards automation.
- TWO-WAY designation routing is pitcher-only for internal v1; stricter two-way Team MVP criteria are deferred.
- Older full-system designation lock/carryover wording is subordinate to the v1 matrix until a separate final-designation promotion slice is approved.
- No relationship mutation.
- No story persistence beyond the random-event log.
- No adaptive park-factor persistence, custom stadium factor entry, or final park-adjusted value/WAR consumers.
- Archive `game.parkFactors` trust has been tightened to accept only verified SMB4 seed inputs; adaptive park-factor persistence remains blocked.
- No Mode 3/offseason handoff or execution.
- No auto-draft active path.
- No AI simulation, AI trades, full trade AI, or salary matching.
- Score-only rows may affect team fan morale only after explicit confirmation; never player morale, stats, WPA/WAR, awards, designations, player history, or relationships.
- Safe preview/fixture routes must stay dev/test oriented and must not mutate real user Franchise, schedule, GameTracker, completed-game, or Almanac storage.

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
