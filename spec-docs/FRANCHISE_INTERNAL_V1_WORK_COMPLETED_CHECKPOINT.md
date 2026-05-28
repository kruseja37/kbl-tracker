# Franchise Internal v1 Work Completed Checkpoint

Date: 2026-05-28
Branch: `codex/gametracker-live-fixes`
Local tag: `franchise-internal-v1-checkpoint`

## Purpose

This checkpoint is a short reference summary of the Franchise internal v1 stabilization work completed so far. It is not a full spec, release note, or implementation roadmap.

## Completed Scope

### Schedule and setup foundation

- Removed generated regular-season schedules from Franchise creation and new-season paths.
- Established empty/manual schedule startup as the v1 policy.
- Added manual schedule entry support and CSV schedule import/review for user-supplied SMB4 schedules.
- Added score-only schedule results for games the user does not track in GameTracker.
- Added a Franchise Setup playoff qualifier guard so tiny leagues do not show impossible playoff-team counts.

### Mode 1 to Mode 2 handoff

- Hardened copy-not-reference Franchise initialization from League Builder data.
- Added Mode 1 handoff metadata for franchise type, controlled teams, rules/playoff setup, season length, innings, schedule policy, stadium identity, roster proof, salary baseline proof, and farm/scouting ownership state.
- Kept Franchise Setup focused on validating/copying prepared League Builder state rather than inventing Franchise-only setup variants.

### FARM, scouting, and prospect draft

- Established League Builder as the owner of startup FARM/scouting preparation.
- Added a deterministic pure prospect/scouting draft engine.
- Added League Builder startup FARM draft preview/apply workflow.
- Preserved hidden true ratings and hidden personality modifiers while surfacing visible-safe scouting details.
- Added a temporary Franchise Setup bridge only for explicitly repairable missing-FARM cases.
- Added Team Hub read-only FARM prospect visibility with hidden-safe details.

### Team Hub roster ownership

- Added durable Team Hub lineup and rotation manager for franchise-owned team state.
- Excluded FARM/non-current/wrong-team players from MLB lineup and rotation choices.
- Added stale/duplicate lineup and rotation detection.
- Added defensive-position validation before saving lineups.
- Preserved Team Hub as the durable source for Franchise GameTracker launch rosters.

### GameTracker and active-game integrity

- Restored the latest GameTracker substitution identity behavior from the known good build.
- Hardened active franchise game save/load/resume/completion integrity.
- Made Franchise GameTracker launch use current franchise-owned Team Hub roster state.
- Reconciled one-game starter overrides into launch snapshots without mutating Team Hub state.
- Fixed no-DH launch behavior so pitchers bat in the `P` slot at #9, not leadoff.
- Added seeded browser happy-path coverage from League Builder FARM draft through no-DH Franchise GameTracker launch.

### Roster, farm, trades, and transactions

- Initialized and carried forward durable Franchise farm records.
- Hardened call-up/send-down movement utilities and transaction logging.
- Added regular-season transaction desk UI for roster movement and manual trades.
- Added manual trade execution with MLB/FARM transfer support, farm record updates, team lineup/rotation cleanup, transaction logging, and rollback coverage.
- Kept AI trades and salary matching deferred.

### Stats, playoffs, values, and narrative boundaries

- Hardened regular-season vs playoff stat boundaries.
- Added trade-aware archive-derived team stint projection.
- Hardened playoff creation/advancement idempotency.
- Added stable salary/designation/value spine improvements without broad True Value expansion.
- Scoped narrative/history archive behavior to completed-game and transaction evidence.
- Kept morale, relationships, random narrative events, awards expansion, custom park factors, and deeper Mode 3 systems deferred.

### Release gating and verification

- Added v1 release gates so prototype/offseason-heavy surfaces do not accidentally become internal-v1 execution paths.
- Added a release-readiness checkpoint document:
  - `spec-docs/FRANCHISE_INTERNAL_V1_RELEASE_READINESS_CHECKPOINT.md`
- Fixed stale `PlayerCardModal` substitution test expectations to match the current identity-safe callback contract.
- Verified the internal v1 checkpoint with:
  - Seeded Playwright happy-path smoke: passed.
  - Focused Franchise v1 suites: passed.
  - Full test suite: passed, `330` files / `6678` tests.
  - Production build: passed with existing Vite chunk-size warnings.

## Explicitly Deferred

- Public/feature-complete Franchise release polish.
- Generated regular-season schedules.
- Fantasy MLB draft.
- AI season simulation.
- AI trade logic and salary-matching trade restrictions.
- Durable scout hiring/profile/assignment management beyond startup visible-safe scouting reports.
- Full morale, chemistry, personality, and relationships effects.
- Random narrative event engine expansion.
- Awards ceremony expansion.
- Custom park-factor editing and stadium analytics dashboards.
- Broad Mode 3/offseason mutation workflows beyond guarded foundations already built.
- True cross-store atomicity; current rollback patterns remain compensating where noted.

## Current Verification Noise

- Existing React `act(...)` warnings in several component tests.
- Existing `indexedDB is not defined` warnings from test-environment story/offseason polling paths.
- Existing GameTracker live win-probability warnings in some launch-state tests.
- Expected negative-path sync/storage stderr.
- Existing Vite large chunk-size warnings.

## Local Git Notes

- The local branch is `codex/gametracker-live-fixes`.
- The local tag `franchise-internal-v1-checkpoint` was created during this checkpoint process.
- Remote push was not performed by Codex because the environment rejected Git push as an external data-export action.
- Known excluded dirty files remain intentionally outside this checkpoint:
  - `package.json`
  - `supabase/.temp/cli-latest`
  - `scripts/exportSmb4GeneratedRosterReport.mjs`
  - `scripts/exportSmb4TeamProfiles.mjs`
  - `spec-docs/data/smb4_standard_team_profiles.csv`
  - `spec-docs/data/smb4_standard_team_profiles.json`
  - `spec-docs/generated/`

## Recommendation

This is safe to treat as the internal Franchise v1 checkpoint baseline. The next work should be chosen deliberately from deferred systems or post-checkpoint bug reports, not by continuing to add Franchise scope opportunistically.
