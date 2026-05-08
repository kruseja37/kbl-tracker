# Elimination Gaps Implementation Plan

Date created: 2026-05-06

Decision source: `spec-docs/ELIMINATION_GAPS_DECISION_WORKSHEET_AND_FIX_SPEC.md`

Goal: implement the resolved elimination gap decisions without disturbing unrelated dirty worktree changes or changing historical archive semantics by accident.

## 1. Guiding Decisions

- Elimination Mode is a single-bracket tournament, not a source-league conference/division playoff.
- Normal selector delete removes active/live run surfaces but preserves Almanac archive/history, completed games, player history, and all-time elimination stat contributions.
- Destructive archive purge/reset is a separate concept from normal selector delete.
- Synced/restored active elimination runs must remain launchable.
- Team Hub must respect DH/no-DH and show launch-normalized rotations.
- Copied elimination player/team records remain immutable run source data for now; snapshots are the edit surface.
- Elimination promotion overrides should be owned or wrapped by elimination APIs, not exposed as accidental League Builder league overrides.
- Elimination completed games should archive once with full context.
- `playoffGames` must be traced before any global removal; Elimination should not use it as a canonical game result store.

## 2. Phase 0: Trace Before Editing

Answer these before implementation changes:

1. Is `src/src_figma/app/routes.tsx` imported or used by an active shell/router?
   - If yes, add missing selector/setup routes.
   - If no, document it as inactive or remove it in a focused cleanup.

2. Is `kbl-playoffs.playoffGames` used by Franchise Mode, shared playoff mode, tests, sync, backup/restore, or migration code?
   - If yes, keep it globally and document that Elimination does not use it.
   - If no, deprecate/remove the store/comments in a controlled storage migration plan.

3. Which stores are required by Almanac elimination history after normal selector delete?
   - Preserve completed games.
   - Preserve archive-facing event data required for player/game detail.
   - Preserve all-time elimination stat contributions.
   - Preserve archive-visible run Fame/promotion history, either in existing aggregate storage or migrated elimination-owned historical storage.

## 3. Phase 1: Bracket Semantics And Round Names

Implement first because later tests depend on bracket advancement clarity.

Required changes:

- Create an elimination-specific single-bracket round-name helper.
- Use the helper in setup, first-round creation, next-round creation, bracket cards, history, and tests.
- Remove or isolate fake `Eastern` semantics from Elimination where possible.
- Ensure 4-team and 8-team brackets advance through expected single-bracket rounds.
- Preselect the displayed default home team in the selected series panel while still allowing manual override.

Test targets:

- 4-team bracket: Semifinals -> Championship.
- 8-team bracket: Quarter-Finals -> Semi-Finals -> Championship.
- Home-team default is selected when a playable series is selected.
- Manual home-team override still works.

## 4. Phase 2: Creation Atomicity And Launch Data

Required changes:

- Create elimination metadata only after copied DB, snapshots, playoff config, and first-round series prerequisites are ready.
- Remove or rescope transitional `SETUP` status unless a resumable setup route is intentionally added later.
- Validate required League Builder roster data before run creation.
- If validation fails, show a clear actionable error.
- If fallback snapshot generation is feasible, synthesize snapshots from copied players when `getTeamRoster(teamId)` is missing.
- Add sync support or restore-time reconstruction for:
  - per-run copied players/teams,
  - roster snapshots,
  - mojo/fitness snapshots.
- Add clear restored-but-unlaunchable error states only as a fallback if reconstruction is impossible.

Test targets:

- Failed creation does not leave half-created selector metadata.
- Synced/restored active run can launch a game.
- Missing roster data produces actionable creation feedback or valid synthesized snapshots.

## 5. Phase 3: Team Hub Snapshot Editing

Required changes:

- Pass bracket `useDH` into Team Hub lineup normalization/editing.
- Persist DH lineups to `lineup`.
- Persist no-DH lineups to `lineupWithoutDH`.
- Add no-DH editing UI path when `useDH === false`.
- Display and edit normalized rotations using `getNormalizedEliminationRotation`.
- Keep copied player/team record editing unavailable; document `saveEliminationPlayer` and `saveEliminationTeam` as reserved/internal APIs.

Test targets:

- DH bracket edits update DH lineup.
- No-DH bracket edits update no-DH lineup.
- Rotation list includes pitchers appended by normalization.
- `MAKE NEXT` changes rotation order and tests assert rotation, not lineup.

## 6. Phase 4: Delete, Archive Retention, And Reset

Required changes:

- Split normal selector delete from destructive archive purge/reset semantics.
- Normal selector delete should:
  - remove the active run from selector/openable active run surfaces,
  - remove or disable launch-only data that should not survive active deletion,
  - preserve completed games,
  - preserve Almanac game/player history,
  - preserve all-time elimination stat contributions,
  - preserve archive-visible run Fame/promotion history.
- Destructive purge/reset should:
  - remove selected historical archive data explicitly,
  - subtract/rebuild all-time elimination stats,
  - emit sync removals/tombstones where supported,
  - remove historical promotion data for purged runs.
- Review `resetDerivedCompetitionData` separately because it is intentionally broader than selector delete.

Test targets:

- Normal delete removes the active run from selector.
- Normal delete does not remove its completed games from Almanac.
- Normal delete does not subtract all-time elimination stats.
- Destructive reset/purge removes historical records and rebuilds/subtracts all-time stats if that path exists.
- Sync behavior matches normal delete vs destructive purge semantics.

## 7. Phase 5: Fame Promotion Override Ownership

Required changes:

- Introduce elimination-owned helper APIs for accepted promotion override reads/writes.
- Prefer elimination-owned storage for future writes.
- If migration risk is high, keep the existing underlying League Builder override rows temporarily but hide them behind elimination helper names.
- Prevent normal selector delete from leaving active/live override effects in League Builder contexts.
- Preserve archive-visible promotion history for deleted-but-historical runs.

Test targets:

- Accepted promotion still appears on elimination PlayerInstanceCard.
- Accepted promotion does not leak into unrelated League Builder contexts.
- Normal selector delete preserves historical promotion display if the run remains in Almanac.
- Reset/purge removes promotion data when historical purge is explicit.

## 8. Phase 6: Archive, Stats, And Almanac Correctness

Required changes:

- Populate `sourceType: 'elimination'` on new elimination playoff stat rows.
- Replace duplicate completed-game archive writes with one authoritative full-context write.
- Add tie guard before series winner calculation.
- Use elimination metadata name for History tab titles.
- Use frozen run team metadata for elimination Team Page/history where possible.
- Fall back gracefully if copied run DB data is unavailable for an old historical run.

Test targets:

- New elimination playoff stats include `sourceType`.
- Completed game archive happens once with full context.
- Tied game cannot silently award away-team series win.
- History title uses elimination metadata name.
- Team Page reflects frozen elimination team metadata, not later global League Builder edits.

## 9. Phase 7: Tests And Journey Cleanup

Required changes:

- Update Playwright helper text from `PLAYOFFS` to `ELIMINATION`.
- Select/preselect home team before `PLAY GAME`.
- Fix Team Hub journey assertion to inspect rotation order.
- Add coverage for bracket advancement after round-name changes.

Test targets:

- Elimination journey creates a bracket from current home UI.
- Journey launches a game with selected/default home team.
- Journey advances at least one bracket round.
- Team Hub journey verifies rotation state correctly.

## 10. Suggested Implementation Order

1. Trace route table and `playoffGames` usage.
2. Bracket semantics, round names, home-team preselect.
3. Creation atomicity and launch-data sync/reconstruction.
4. Team Hub DH/no-DH and normalized rotation.
5. Delete/archive-retention semantics.
6. Fame promotion override ownership.
7. Archive/stat/Almanac correctness.
8. Playwright journey updates.

This order keeps the highest-risk data-retention decisions explicit before delete/reset code is touched.

