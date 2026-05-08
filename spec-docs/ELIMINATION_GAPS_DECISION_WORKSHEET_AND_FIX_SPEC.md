# Elimination Gaps Decision Worksheet And Fix Spec

Date created: 2026-05-06

Source audit: `spec-docs/ELIMINATION_MODE_CURRENT_CODE_OUTPUT_SPEC.md`, section 17.

Purpose: convert the section 17 gaps/orphans into direct product/engineering questions, capture decisions, and provide a prompt/spec for implementing the chosen cleanup.

Status key:

- `TBD`: needs John decision.
- `Recommended`: proposed default if no stronger product preference exists.
- `Keep`: current behavior is intentional and should be documented/tested.
- `Fix`: current behavior should change.
- `Remove`: orphaned code/path should be deleted or deprecated.

## 1. Decision Interrogation

Use this as the question-by-question pass. Decisions are filled as of 2026-05-06.

| ID | Decision Question | Recommended Decision | Decision | Implementation Consequence |
| --- | --- | --- | --- | --- |
| 17.1 | Is Elimination Mode a true single-bracket tournament, or should it preserve source league conferences/divisions? | `Fix`: define it as one explicit single-bracket tournament and stop pretending the source league structure matters inside playoff storage. Use neutral bracket/team grouping instead of hardcoded `Eastern` where possible. | Agreed. Elimination Mode is an explicit single-bracket tournament. | Update playoff config/team construction and advancement so single-bracket semantics are first-class and do not depend on fake Eastern-only league data. |
| 17.2 | Should round names be single-bracket names (`First Round`, `Quarter-Finals`, `Semi-Finals`, `Championship`) or shared playoff names (`Wild Card`, `Division Series`, `Conference Championship`)? | `Fix`: use single-bracket names for elimination runs. | Agreed. Use elimination-specific single-bracket round names. | Add elimination-aware round naming used consistently by setup, first-round creation, advancement, bracket cards, history, and tests. |
| 17.3 | When a run is deleted from the selector, should its archive/history survive, or should delete mean full purge? | `Fix`: selector delete should offer/perform a full purge of live run plus derived elimination data. If archive retention is desired later, make it an explicit separate action. | Disagreed with full purge. Selector delete should remove the active/live run surface while preserving Almanac archive/history, player data, historical completed games, and historical tracking. A destructive archive purge would need to be a separate explicit action. | Delete only live/resumable run data that should no longer appear in the active selector. Preserve historical completed games, event history needed by Almanac, all-time elimination stats, and archive-facing player history. Clean transient/live-only data where it cannot affect preserved history. |
| 17.4 | Should all-time elimination stats be reversible per deleted run? | `Fix`: make all-time stats able to subtract or rebuild by run. | Keep all-time elimination stats for normal selector delete because deleted runs remain historical canon. Add subtraction/rebuild only for a separate destructive archive purge or global reset path. | Normal active-run deletion must not subtract preserved historical contributions. Add enough attribution or rebuild capability for destructive purge/reset scenarios only. |
| 17.5 | Should synced/restored elimination runs remain launchable, including copied DB, roster snapshots, and mojo/fitness snapshots? | `Fix`: synced elimination runs must be launchable. | Agreed. | Add sync coverage for per-run copied players/teams, roster snapshots, and mojo/fitness snapshots, or add restore-time reconstruction with clear failure states. |
| 17.6 | In no-DH brackets, should Team Hub edit the no-DH lineup instead of the DH lineup? | `Fix`: Team Hub must respect bracket `useDH`. | Agreed. | Pass playoff `useDH` into lineup normalization/editing and persist to `lineup` or `lineupWithoutDH` according to bracket rules. |
| 17.7 | Should `lineupWithoutDH` have an active UI editing path? | `Fix`: yes, if no-DH exists as a bracket option. | Agreed. | Add no-DH Team Hub editing and tests, or remove no-DH from setup. |
| 17.8 | Should Team Hub display normalized rotation, including pitchers appended by launch normalization? | `Fix`: yes. | Agreed. | Use `getNormalizedEliminationRotation` in Team Hub display/edit flow so every launch-eligible pitcher is visible and orderable. |
| 17.9 | Are `saveEliminationPlayer` and `saveEliminationTeam` future-facing APIs or dead code? | `Keep with documentation` unless player/team editing is added now. | Agreed. Keep as reserved/internal APIs; no copied player/team editing UI for now. | Document as reserved storage APIs and test lightly, or keep internal only if no direct copied-record editing is planned. |
| 17.10 | Should accepted Fame promotions continue to use League Builder override storage keyed by `runId`? | `Fix`: move to elimination-owned override storage or formally wrap the behavior behind elimination-specific APIs. | Agreed. | Avoid leaking run-specific overrides into a store whose key is named `leagueId`, or isolate access/cleanup behind typed elimination helper functions. |
| 17.11 | Should promotion overrides be deleted when a run is deleted/reset? | `Fix`: yes. | Agreed for live/transient cleanup and destructive reset. Preserve archive-visible promotion history when normal selector delete preserves Almanac history. | Add cleanup for transient accepted-promotion override rows that should not affect active/live surfaces after deletion. Preserve archive-facing promotion state where needed for historical Almanac views, or migrate it to elimination-owned historical storage before deleting live overrides. |
| 17.12 | Should new elimination playoff stats populate `sourceType`? | `Fix`: yes. | Agreed. | Set `sourceType: 'elimination'` for new elimination playoff stats and preserve existing values on update. |
| 17.13 | Should completed-game archive write happen once, or is the early partial archive intentional fallback behavior? | `Fix`: write once with full context, or make fallback explicit and observable. | Agreed with clarification. Use one authoritative archive write with full context and clear error handling; do not keep an accidental partial archive fallback. | Remove duplicate archive write or merge to one authoritative archive call with complete context and error handling. |
| 17.14 | Should playoff/elimination completion reject tied games before choosing a series winner? | `Fix`: yes. | Agreed. | Add a tie guard at series recording/completion boundary, even if upstream GameTracker should prevent ties. |
| 17.15 | Should `SETUP` runs be resumable, or should setup metadata be collapsed into atomic creation? | `Fix`: remove/rescope `SETUP` unless resumable setup is intentionally added. | Create metadata only after all prerequisites are ready and the run is officially created. | Create metadata only after all creation prerequisites are ready; remove or rescope transitional `SETUP` behavior unless a resumable setup flow is intentionally added later. |
| 17.16 | Should History tab title completed runs by elimination metadata name? | `Fix`: yes. | Agreed. | Join completed elimination playoff rows to elimination metadata where available and fall back to a readable generated title. |
| 17.17 | Should Playwright elimination journeys track current UI copy and home-team selection behavior? | `Fix`: yes. | Agreed. | Update helper text from `PLAYOFFS` to `ELIMINATION` and select a home team before clicking `PLAY GAME`. |
| 17.18 | Should the Team Hub journey assert rotation changes after `MAKE NEXT`, not lineup select changes? | `Fix`: yes. | Agreed. | Correct the E-5 assertion to observe `startingRotation` order/UI state. |
| 17.19 | Is `src/src_figma/app/routes.tsx` still used anywhere that needs selector/setup routes? | `Fix if used, remove if unused`. | Trace usage first, then decide. If active, add missing selector/setup routes. If unused, document or remove the secondary route table. | Trace route table usage. Add missing routes if active; otherwise document or delete the secondary table. |
| 17.20 | Should `playoffGames` become the canonical playoff game store, or should series-embedded games remain canonical? | `Remove/deprecate`: keep series-embedded games as canonical for now and remove/comment `playoffGames` as unused. | Trace Franchise/shared playoff usage first. If `playoffGames` belongs to Franchise Mode or future shared playoff mode, keep it there but remove/deprecate it from Elimination Mode. Elimination should have one canonical path: series-embedded games. | Clean storage comments/sync config/tests so Elimination has one clear source of truth. Do not remove `playoffGames` globally until Franchise/shared usage is traced. |
| 17.21 | Should users be able to edit copied elimination player/team records after creation? | `Keep unavailable`: snapshots are the editing surface for now. | Agreed. | Document copied DB as immutable run source data, keep Team Hub focused on lineup/rotation/mojo/fitness, and keep save APIs internal/reserved. |
| 17.22 | Should Almanac Team Page use frozen run team metadata for elimination history? | `Fix`: yes. | Agreed. | Load team metadata from elimination completed-game context or per-run copied DB instead of live global League Builder when viewing elimination team history. |
| 17.23 | Should bracket creation require live League Builder rosters, or should copied team/player data be enough to synthesize snapshots? | `Fix`: creation should fail with a clear actionable message, or synthesize a valid roster from copied players. | Agreed. | Add validation/error copy before creation, and optionally fallback snapshot generation from copied players when `getTeamRoster` is missing. |
| 17.24 | Should `deleteEliminationAllTimeStats` emit sync removals/tombstones? | `Fix`: yes, if sync removal semantics exist for cleared records. | Do not emit removals for normal selector delete because historical all-time stats are preserved. Emit sync removals/tombstones only for destructive archive purge/global reset paths, if sync supports removals. | Make sync delete behavior match archive-retention semantics: preserve historical all-time stats on normal delete; remove/tombstone only during destructive purge/reset. |
| 17.25 | Should the selected series panel preselect the displayed default home team? | `Fix`: yes. | Agreed. | Preselect default home team when a playable series is selected, while still allowing manual override. |

## 2. Decision Log

Record final answers here before implementation.

| ID | Decision | Date | Notes |
| --- | --- | --- | --- |
| 17.1 | Fix | 2026-05-06 | Elimination is an explicit single-bracket tournament; remove fake Eastern-only semantics. |
| 17.2 | Fix | 2026-05-06 | Use elimination-specific single-bracket round names. |
| 17.3 | Keep archive | 2026-05-06 | Normal selector delete preserves Almanac archive/history, player data, completed games, and historical tracking. Destructive archive purge must be separate and explicit. |
| 17.4 | Keep historical stats | 2026-05-06 | Normal selector delete does not subtract all-time elimination stats because deleted runs remain historical canon. Add subtract/rebuild only for destructive purge/reset. |
| 17.5 | Fix | 2026-05-06 | Synced/restored elimination runs must remain launchable. |
| 17.6 | Fix | 2026-05-06 | Team Hub must respect bracket `useDH`. |
| 17.7 | Fix | 2026-05-06 | Add active no-DH lineup editing path. |
| 17.8 | Fix | 2026-05-06 | Team Hub should display normalized rotation. |
| 17.9 | Keep | 2026-05-06 | Keep save APIs reserved/internal; no copied player/team edit UI for now. |
| 17.10 | Fix | 2026-05-06 | Move or wrap accepted Fame promotion overrides behind elimination-owned APIs/storage. |
| 17.11 | Fix with archive preservation | 2026-05-06 | Clean transient/live promotion overrides on delete/reset while preserving archive-visible promotion history. |
| 17.12 | Fix | 2026-05-06 | Populate `sourceType` for new elimination playoff stats. |
| 17.13 | Fix | 2026-05-06 | Use one authoritative completed-game archive write with full context and clear error handling. |
| 17.14 | Fix | 2026-05-06 | Guard against tied elimination games before series winner calculation. |
| 17.15 | Fix | 2026-05-06 | Create metadata only after prerequisites are ready and the run is officially created. |
| 17.16 | Fix | 2026-05-06 | History tab should use elimination metadata name. |
| 17.17 | Fix | 2026-05-06 | Update Playwright journeys to current UI text and home-team selection behavior. |
| 17.18 | Fix | 2026-05-06 | Team Hub journey should assert rotation changes. |
| 17.19 | Trace first | 2026-05-06 | Trace secondary route table usage; add missing routes if active, otherwise document/remove it. |
| 17.20 | Trace first | 2026-05-06 | Determine Franchise/shared usage before global removal. Elimination should not use `playoffGames`; series-embedded games remain canonical for Elimination. |
| 17.21 | Keep | 2026-05-06 | Copied player/team records remain immutable run source data; snapshots are the edit surface. |
| 17.22 | Fix | 2026-05-06 | Almanac Team Page should use frozen run metadata for elimination history. |
| 17.23 | Fix | 2026-05-06 | Validate or synthesize snapshots when live League Builder rosters are missing. |
| 17.24 | Fix with archive preservation | 2026-05-06 | Do not emit removals for normal selector delete; emit sync tombstones only for destructive purge/global reset if supported. |
| 17.25 | Fix | 2026-05-06 | Preselect displayed default home team while allowing override. |

## 3. Draft Prompt For Implementation

Use this for implementation. The decisions below are resolved as of 2026-05-06.

```text
You are working in the KBL Tracker repo. Implement the resolved cleanup for Elimination Mode gaps from:

- spec-docs/ELIMINATION_MODE_CURRENT_CODE_OUTPUT_SPEC.md, section 17
- spec-docs/ELIMINATION_GAPS_DECISION_WORKSHEET_AND_FIX_SPEC.md

Primary goal:
Make Elimination Mode internally coherent, launchable after sync/restore, cleanly deletable, and aligned with current UI/test behavior. Preserve existing user data unless the decision log explicitly says a delete/reset path should purge it.

Resolved decisions:
- 17.1: Elimination is an explicit single-bracket tournament; remove fake Eastern-only semantics.
- 17.2: Use elimination-specific single-bracket round names.
- 17.3: Normal selector delete preserves Almanac archive/history, player data, completed games, and historical tracking. Destructive archive purge must be separate and explicit.
- 17.4: Normal selector delete does not subtract all-time elimination stats because deleted runs remain historical canon. Add subtract/rebuild only for destructive purge/reset.
- 17.5: Synced/restored elimination runs must remain launchable.
- 17.6: Team Hub must respect bracket useDH.
- 17.7: Add active no-DH lineup editing path.
- 17.8: Team Hub should display normalized rotation.
- 17.9: Keep saveEliminationPlayer/saveEliminationTeam reserved/internal; no copied player/team edit UI for now.
- 17.10: Move or wrap accepted Fame promotion overrides behind elimination-owned APIs/storage.
- 17.11: Clean transient/live promotion overrides on delete/reset while preserving archive-visible promotion history.
- 17.12: Populate sourceType for new elimination playoff stats.
- 17.13: Use one authoritative completed-game archive write with full context and clear error handling.
- 17.14: Guard against tied elimination games before series winner calculation.
- 17.15: Create metadata only after prerequisites are ready and the run is officially created.
- 17.16: History tab should use elimination metadata name.
- 17.17: Update Playwright journeys to current UI text and home-team selection behavior.
- 17.18: Team Hub journey should assert rotation changes.
- 17.19: Trace secondary route table usage; add missing routes if active, otherwise document/remove it.
- 17.20: Determine Franchise/shared usage before global playoffGames removal. Elimination should not use playoffGames; series-embedded games remain canonical for Elimination.
- 17.21: Copied player/team records remain immutable run source data; snapshots are the edit surface.
- 17.22: Almanac Team Page should use frozen run metadata for elimination history.
- 17.23: Validate or synthesize snapshots when live League Builder rosters are missing.
- 17.24: Do not emit all-time stat sync removals for normal selector delete; emit sync tombstones only for destructive purge/global reset if supported.
- 17.25: Preselect displayed default home team while allowing override.

Implementation workstreams:

1. Bracket model and round naming
- Make elimination bracket semantics explicit.
- Use one consistent elimination round-name helper everywhere elimination first-round and next-round series are created/rendered.
- Ensure advancement for 4-team, 8-team, and larger supported single brackets produces the expected next rounds and final.
- Preselect the displayed default home team when a playable series is selected, unless the decision log says manual-only selection is intentional.

2. Delete, reset, sync, and reconstruction
- Make selector deletion behavior match the decision log: normal delete removes the active/live run surface but preserves Almanac archive/history and all-time historical stat contributions.
- Preserve completed games, archive-facing event history, all-time elimination stats, and historical player tracking on normal selector delete.
- Clean transient/live-only copied DBs, roster snapshots, mojo/fitness snapshots, and live promotion override effects after normal selector delete only when doing so does not break preserved Almanac history.
- If destructive purge/global reset exists or is added, make it explicitly separate from normal selector delete and support all-time stat subtraction/rebuild/tombstones there.
- Add sync support or restore-time reconstruction for all launch-required elimination data: copied players/teams, roster snapshots, and mojo/fitness snapshots.
- Make `deleteEliminationAllTimeStats` sync-aware only for destructive purge/global reset paths if sync supports removals/tombstones.

3. Team Hub and roster editing
- Make Team Hub respect bracket `useDH`.
- Provide a real no-DH editing path when `useDH === false`, or remove no-DH configurability if the decision log says no-DH is out of scope.
- Show and persist normalized rotations so any pitcher launch can use is visible/orderable in Team Hub.
- Keep copied player/team DB records immutable unless the decision log explicitly requests copied-record editing.

4. Fame promotion override ownership
- Stop exposing elimination run promotions as accidental League Builder overrides unless a temporary migration wrapper is required.
- Prefer elimination-specific helpers/storage naming even if the underlying migration keeps the same IndexedDB store temporarily.
- Ensure normal delete removes live/transient promotion effects without losing archive-visible promotion history; destructive purge/reset may remove all promotion data for purged runs.

5. Archive, stats, and Almanac correctness
- Set `sourceType` on new elimination playoff stat rows.
- Ensure completed games are archived once with full elimination context and clear error handling.
- Guard against tied games before series winner calculation.
- Use elimination metadata names in History tab titles.
- Load frozen elimination team metadata for elimination Team Page/history views where possible, falling back gracefully when copied run data is missing.
- Validate/synthesize roster snapshots at creation when live League Builder roster data is missing.

6. Routes and tests
- Update Playwright journey helpers to match current UI text and home-team selection behavior.
- Fix Team Hub journey assertions to verify rotation changes after `MAKE NEXT`.
- Trace `src/src_figma/app/routes.tsx`; add missing selector/setup routes if it is active, or document/remove it if unused.
- Trace `playoffGames` Franchise/shared usage before removing it globally. For Elimination, document/deprecate it as unused and keep series-embedded games canonical.

Required tests:
- Unit/storage tests for normal selector delete preserving Almanac history/all-time stats while removing live selector/run data.
- Unit/storage tests for destructive purge/global reset all-time stat subtraction/rebuild/tombstones if that path exists or is added.
- Unit/storage tests for sync coverage or reconstruction of launch-required elimination data.
- Playoff advancement tests for supported bracket sizes and round names.
- Team Hub tests for DH/no-DH lineup editing and normalized rotation display.
- Archive/stats tests for `sourceType`, tie guard, single completed-game archive behavior, and archive retention after normal selector delete.
- Almanac tests for elimination history title and frozen team metadata.
- Playwright journey updates for selector navigation, home-team selection, game launch, Team Hub rotation, and at least one advancement path.

Guardrails:
- Do not revert unrelated dirty worktree changes.
- Keep changes scoped to elimination, playoff storage surfaces used by elimination, sync/reset, Almanac elimination views, and elimination journeys.
- Preserve existing persisted data with migrations/fallbacks where practical.
- When a decision says "Keep", add documentation and regression coverage rather than silently changing behavior.
```

## 4. Resolved Bundle

The resolved decisions can be treated as one coherent cleanup:

- Elimination is a single-bracket tournament with elimination-specific round names.
- Normal selector delete removes active/live run surfaces while preserving Almanac archive/history, completed games, player history, and all-time elimination stat contributions.
- Destructive archive purge/reset remains a separate explicit path and is the only place all-time elimination stats should rebuild/subtract or sync tombstones should be emitted.
- Sync/restore keeps runs launchable.
- Team Hub respects DH/no-DH and normalized rotations.
- Copied player/team records remain immutable run source data for now.
- Promotion overrides become elimination-owned or at least hidden behind elimination-owned helpers, while preserving archive-visible promotion history on normal delete.
- Archive/stat/history/Almanac fields become internally consistent.
- Journey tests are updated to match the UI.
- Secondary routes and `playoffGames` are traced before removal; Elimination keeps series-embedded games canonical.
