# Franchise Farm, Scouting, Prospect Generation, and GameTracker Parity Discovery Audit

**Date:** 2026-05-28
**Branch observed:** `codex/gametracker-live-fixes`
**Local HEAD observed:** `ef5a0eb Restore GameTracker substitution identity parity`
**Scope:** Documentation/audit only. No app code, UI, tests, staging, or commits.

## 1. Executive Summary

Franchise v1 currently has a functional temporary bridge for missing farm rosters: Franchise Setup can auto-run `startup-prospect-draft-v1-auto-snake` before `initializeFranchise`, mutating League Builder players and team rosters so the franchise copy sees 22 MLB + 10 FARM players per team. This is useful as a setup unblocker, but it should not be treated as the final architecture without an explicit decision.

The repo and specs point toward a League Builder-owned startup farm/scouting workflow for v1: League Builder should prepare the league template, farm rosters, prospects, scout/scouted-grade data, and rookie salary metadata before Franchise Setup. Franchise Setup should then validate and copy prepared state. A temporary bridge may remain only if intentionally approved as a repair/fill action.

Current League Builder already has useful pieces to reuse: MLB/FARM roster editing, lineup and rotation editing, roster analyzer adapters, grade/prospect generation helpers, and a prototype draft page. However, the current League Builder Draft page is not a durable startup farm draft implementation: it uses mock in-component prospect state, `Date.now()` ids, and does not persist picks or scout reports.

Current Franchise Team Hub is not a complete farm/scouting surface. It reads franchise-owned team, player, and farm record state and shows MLB roster rows plus farm analyzer counts/advice, but it does not list the 10 FARM players as inspectable rows, does not expose hidden-safe prospect cards, does not perform call-up/send-down, and does not provide manual durable lineup or rotation editing. It can save optimal lineup snapshots and apply generated/registered lineup snapshots.

No app code or tests were changed for this audit. This document is the only intended change.

## 2. Repo Inventory With File Evidence

### Source-of-truth docs

- `spec-docs/MODE_1_LEAGUE_BUILDER_FINAL.md`
  - Mode 1 owns League Builder setup, startup draft, prospect generation, scouting, salary initialization, rules, and copy-to-franchise handoff.
  - Startup Prospect Draft is described as the final setup/wizard step: 10 rounds, snake draft, user drafts for human-controlled teams, AI auto-drafts for AI teams, scouts applied, scouted grades shown, unique scout assigned per team.
  - League Builder rosters are templates copied into franchises at creation time; handoff is copy, not reference.
- `spec-docs/FARM_SYSTEM_SPEC.md`
  - Farm system requires MLB + farm roster management, hidden true ratings before call-up, call-up reveal, options, rookie salary at draft time, and Phase 11 cut-down.
  - It states regular-season farm roster is unlimited, while 10 FARM is the Phase 11 finalize/cut-down requirement.
- `spec-docs/SCOUTING_SYSTEM_SPEC.md`
  - Prospects have hidden true numeric ratings until call-up.
  - Pre-call-up visible data includes scouted grade, position, chemistry, traits, and visible personality type.
  - Scout accuracy varies by position and should drive grade deviation.
- `spec-docs/PROSPECT_GENERATION_SPEC.md`
  - Prospect generation includes draft class sizing, grade distribution, position distribution, trait distribution, chemistry distribution, true ratings, and scouted grade linkage to scouting.
- `spec-docs/GOSPEL_CONSOLIDATION_MAP.md`
  - Maps `PROSPECT_GENERATION_SPEC.md` and `SCOUTING_SYSTEM_SPEC.md` to Mode 1 and Mode 3.
  - Maps `FARM_SYSTEM_SPEC.md` to Mode 2 and Mode 3, with Mode 1 startup draft/farm setup as shared context.

### League Builder roster/farm editing

- `src/src_figma/app/pages/LeagueBuilderRosters.tsx`
  - Loads and saves `TeamRoster` through `useLeagueBuilderData`.
  - Splits players into `mlbRoster`, `farmRoster`, and unassigned lists.
  - Supports moving players between MLB/FARM/unassigned in the Builder roster editor.
  - Supports lineup, rotation, depth-chart, and optimal-lineup snapshot concepts.
  - Calls `analyzeBuilderTeamRoster` for read-only roster readiness/advice.
- `src/src_figma/app/pages/LeagueBuilderPlayers.tsx`
  - Player editor exposes roster status choices: `FREE_AGENT`, `MLB`, `FARM`.
- `src/src_figma/hooks/useLeagueBuilderData.ts`
  - Provides Builder storage hook used by League Builder pages.
- `src/utils/leagueBuilderStorage.ts`
  - Defines League Builder `Player`, `Team`, `TeamRoster`, `RosterStatus`, lineup, assignment, and persistence shapes.

### League Builder draft/prospect pages

- `src/src_figma/app/pages/LeagueBuilderDraft.tsx`
  - Exists as a draft setup/prospect page.
  - Current implementation is explicitly local/prototype: comment says "Mock draft class - in production this would be generated/stored".
  - Generates prospects in component state with `Math.random()` and `Date.now()` ids.
  - UI copy says all drafted players go directly to FARM rosters, but no durable pick execution/storage path was found in this page.
- `src/src_figma/__tests__/leagueBuilder/LeagueBuilderDraft.test.tsx`
  - Covers rendering/generate-prospect UI behavior, not a durable startup draft contract.
- `src/archived-pages/DraftHub.tsx` and `src/archived-components/offseason/ProspectList.tsx`
  - Archived draft/prospect UI references. They should be treated as reference material, not canonical v1 implementation.

### Player analyzer / grade engine / prospect helpers

- `src/engines/gradeEngine.ts`
  - Contains grade calculation and prospect-generation helpers:
    - position stat bias
    - round-based prospect grade probabilities
    - potential ceiling generation
    - position-player prospect ratings
    - pitcher prospect ratings and arsenal generation
    - prospect trait generation
  - Current helper uses `Math.random()`, so it is not deterministic by itself.
- `src/src_figma/__tests__/engines/gradeEngine.test.ts`
  - Confirms complete generated position-player and pitcher prospect output.

### Roster analyzer

- `src/engines/rosterAnalyzerEngine.ts`
  - Shared analyzer engine for active roster, farm status, options/reveal state, readiness, and advisory recommendations.
  - Recommendations are advisory/read-only and do not execute roster moves.
- `src/utils/rosterAnalyzerBuilderAdapter.ts`
  - Adapts League Builder players and `TeamRoster` into analyzer DTOs.
  - Maps FARM status and `ratingRevealState` where present.
- `src/utils/rosterAnalyzerFranchiseAdapter.ts`
  - Adapts franchise teams, franchise players, and `FranchiseFarmRecord` data into analyzer DTOs.
- Tests:
  - `src/utils/tests/rosterAnalyzerBuilderAdapter.test.ts`
  - `src/utils/tests/rosterAnalyzerFranchiseAdapter.test.ts`
  - `src/engines/__tests__/rosterAnalyzerEngine.test.ts`

### Scouting data or scout profiles

- No durable `ScoutProfile`, scout assignment table, scout storage module, or scouted-grade accuracy implementation was found in active `src` code.
- `src/data/playerDatabase.ts` contains at least one player-like id containing `scout`, but this is data, not a scouting system.
- Current generated prospects can carry `scoutedGrade` in startup-draft metadata, but that is not backed by a persistent team scout profile or position-specialty accuracy model.

### Farm storage, reveal, and call-up/send-down state

- `src/utils/franchiseFarmStorage.ts`
  - Durable franchise farm records with `franchiseId`, `seasonId`, `teamId`, `playerId`, `rosterLevel`, `optionsUsed`, `optionDates`, and `ratingRevealState`.
- `src/utils/franchiseRosterMovement.ts`
  - Implements regular-season call-up/send-down operations, transaction logging, farm record creation/deletion, and call-up reveal by setting player `ratingRevealState` to `revealed`.
- `src/utils/franchisePhase11RosterActions.ts`
  - Provides Phase 11 roster actions for sign/release and MLB/FARM target status.
- `src/utils/franchiseRosterLockValidator.ts`
  - Validates Phase 11 lock expectations, including 22 MLB + 10 FARM.
- `src/utils/farmStorage.ts`
  - Older/global farm storage. Relevant as legacy/reference, but franchise v1 farm records use `franchiseFarmStorage.ts`.

### Franchise setup and copy handoff

- `src/src_figma/app/pages/FranchiseSetup.tsx`
  - Runs `runStartupProspectDraftForLeague(config.league, { rounds, seasonNumber: 1 })` before `initializeFranchise` when startup draft is enabled.
  - If draft report is invalid, Franchise Setup throws and does not initialize.
  - If initialization fails after generated picks, it calls `rollbackStartupProspectDraftForLeague`.
  - UI copy says Franchise v1 auto-runs a 10-round snake prospect draft during setup, uses payroll order, stores ratings hidden until call-up, and keeps fantasy MLB draft, AI simulation, and generated regular-season schedule deferred.
- `src/utils/franchiseStartupProspectDraft.ts`
  - Current bridge implementation.
  - Preflights missing team rosters, FARM assignment mismatch, duplicate FARM ids, FARM overage, and non-22 MLB assignments.
  - No-ops when all FARM rosters are full.
  - Generates deterministic ids from league/team/round/pick, detects id collisions, saves generated players, updates team `farmRoster`, and rolls back saved players/rosters on failure.
  - Uses its own hardcoded grade/name/trait/personality pools rather than the shared `gradeEngine` and scouting spec.
- `src/utils/franchisePlayerStorage.ts`
  - `deepCopyLeagueToFranchise` copies League Builder players/teams into franchise storage.
  - `validateV1RosterHandoff` currently requires exactly 22 MLB and 10 FARM players per team before copy succeeds.
  - Seeds `FranchiseFarmRecord` rows for copied FARM players and defaults reveal state to `hidden`.
- `src/utils/franchiseInitializer.ts`
  - Orchestrates franchise metadata, config, season metadata, and `deepCopyLeagueToFranchise`.

### Franchise Team Hub

- `src/src_figma/app/components/TeamHubContent.tsx`
  - Reads franchise team/player/farm data with `getFranchiseTeam`, `getAllFranchisePlayers`, and `getFranchiseFarmRoster`.
  - `rosterData` maps only active franchise roster players, not FARM records, into the visible roster table.
  - Shows a read-only roster analyzer panel with MLB count, FARM count, trust, and farm advisory.
  - Roster edit button is disabled with title "Roster edits use the Franchise roster and transaction surfaces."
  - Can save/apply/recalculate/register optimal lineup snapshots, but does not expose a manual lineup editor or rotation editor.
- `src/src_figma/__tests__/franchiseMode/TeamHubContent.franchiseReads.test.tsx`
  - Confirms copied franchise roster rows are shown instead of global/offseason rows.
  - Confirms FARM count appears.
  - Confirms the FARM player's row/name is not rendered in the main roster table.
  - Confirms `saveFranchiseTeam` is not called in that read-only roster analyzer path.

### GameTracker and launch parity context

- `src/src_figma/app/utils/franchiseGameTrackerRoster.ts`
  - Builds GameTracker roster state from franchise-owned MLB assignments only.
  - Excludes FARM assignments from GameTracker launch.
  - Uses stored franchise team lineup/rotation/optimal-lineup data where present.
- `src/src_figma/app/pages/FranchiseHome.tsx`
  - Loads franchise rosters through `buildFranchiseGameTrackerRoster`.
  - Shows a pregame modal with starter selection, lineup preview, milestone watch, benchmark checklist, and Start Game.
  - The modal is primarily preview/starter selection, not full Exhibition-style pregame editing.
- `src/src_figma/app/pages/ExhibitionGame.tsx`
  - Has richer pregame edit handlers for reorder, position swap, bench substitution, and starting pitcher substitution.
- Branch/worktree note:
  - Current local HEAD is `ef5a0eb Restore GameTracker substitution identity parity`.
  - `git branch --all --contains 7239efc` shows `codex/gametracker-substitution-hotfix` and `origin/codex/gametracker-live-fixes`, but local `HEAD` does not ancestry-contain `7239efc`. Treat local parity as the newer local restoration commit, not the original hotfix hash.

### Branch/worktree discovery

Observed worktrees:

- `/Users/johnkruse/Projects/kbl-tracker` at `ef5a0eb` on `codex/gametracker-live-fixes`
- `/private/tmp/kbl-substitution-regression-audit` at `7239efc` on `codex/gametracker-substitution-hotfix`
- Multiple GameTracker-focused worktrees under `/private/tmp/kbl-gt-*`

Repo/worktree file search found the same relevant families repeatedly: `LeagueBuilderDraft.tsx`, `LeagueBuilderRosters.tsx`, `TeamHubContent.tsx`, `EliminationTeamHub.tsx`, `lineupLoader.ts`, `franchiseGameTrackerRoster.ts`, farm storage, and the scouting/prospect specs. No separate durable League Builder scout-profile implementation or complete startup farm draft branch was identified by filename search.

## 3. Spec Requirements Summary

### Startup roster target

- Franchise startup baseline currently needs exactly 22 MLB + 10 FARM players per team for `deepCopyLeagueToFranchise`.
- Specs distinguish this startup/finalize target from regular-season farm size: regular-season farm can be unlimited, while Phase 11 cut-down/finalize requires 10 FARM.

### Startup prospect draft experience

- Startup Prospect Draft is a Mode 1/League Builder concern.
- It should be a visible draft workflow, not only a hidden background repair.
- It should support 10 default rounds, snake order, human-controlled team choice, AI `best_available` for AI teams, and generated plus eligible inactive prospects.
- Fantasy MLB draft remains deferred unless separately approved.

### Scout assignment and specialties

- Each team should have a scout before draft begins.
- Scouts should have position specialties and weaknesses that alter grade accuracy.
- Scout data should be durable enough for the drafted prospect's scouted grade/report to remain meaningful after franchise copy.
- User-approved UX/design decision: scout specialties may be visible during scout hiring/assignment so the user can choose a scout who fits team needs, while scouting output remains imperfect and true player ratings remain hidden.

### Scouted grades vs hidden true ratings

- Before call-up, users should see scouted grade, position, chemistry, traits, and visible personality type.
- True numeric ratings and hidden personality modifiers should not be visible before call-up.
- On call-up, true ratings are revealed.

### Personality modifiers

- Visible personality type is allowed.
- Hidden personality modifiers remain hidden and should surface only indirectly through systems such as narrative.

### Rookie salary

- Rookie salary is set at draft time.
- Salary should not change when true ratings are revealed on call-up.

### Team Hub farm visibility

- The user should be able to view farm players and their allowed non-hidden details.
- Farm display must not leak hidden true numeric ratings before reveal.
- Call-up/send-down controls may live in transaction surfaces, but Team Hub should not mislead users into thinking FARM does not exist.

## 4. Current Implementation Status

### Where startup farm/prospect/scouting currently lives

Current behavior is a temporary bridge:

- Franchise Setup auto-runs startup prospect generation before franchise copy.
- It mutates League Builder data by saving generated players and updating team FARM rosters.
- It then relies on `deepCopyLeagueToFranchise` to validate and copy 22 MLB + 10 FARM.

This behavior is not final architecture unless explicitly accepted. It is best classified as **temporary bridge behavior**.

### League Builder-owned workflow readiness

Partially present, not ready:

- League Builder has player roster status (`MLB`, `FARM`) and roster/farm editing.
- League Builder has lineup/rotation/optimal lineup editing for template rosters.
- League Builder has a draft page, but it is prototype/global-only and not durable.
- No durable scout assignment/profile system exists.
- No integrated League Builder startup draft execution/pick persistence was found.

### Franchise Setup validation/copy readiness

Mostly present:

- Startup bridge can fill missing FARM slots before copy.
- Invalid bridge reports block initialization.
- Deep copy validates 22 MLB + 10 FARM.
- Farm records are seeded for copied FARM players.

Risk:

- Because bridge generation mutates League Builder from Franchise Setup, repeated setup attempts and user expectations are more complex than a pure validation/copy flow.

### Scouting readiness

Not v1-ready:

- `scoutedGrade` exists in startup prospect draft report/profile metadata.
- No scout storage/profile assignment implementation was found.
- No team-specific scout specialty/weakness accuracy model was found.
- No hidden-safe scouted report UI was found.

### Prospect generation readiness

Partially present:

- Shared `gradeEngine` has useful prospect generation helpers, but they are nondeterministic and not wired into current startup bridge.
- Current startup bridge is deterministic for generated ids/profiles but uses hardcoded local pools and grade distributions.
- League Builder Draft prototype generates local prospects with `Math.random()` and `Date.now()` and does not persist draft results.

### Farm storage/reveal/call-up readiness

Mostly present at utility/storage level:

- Franchise farm records exist.
- Call-up/send-down utility exists.
- Call-up sets rating reveal state to `revealed`.
- Transaction logging exists for roster movement.

Not fully proven here:

- Complete UI surfacing of reveal ceremony/result.
- Full 3-option enforcement and presentation in all user paths.

### Team Hub readiness

Partially present:

- MLB roster: yes, visible.
- FARM roster count/advice: yes.
- FARM player list: no, not as inspectable 10-player rows.
- Non-hidden prospect details: no complete surface found.
- Call-up/send-down: no in Team Hub; separate transaction surfaces exist.
- Durable manual lineup/order editing: no.
- Durable rotation editing: no.
- Optimal lineup snapshot storage/apply/recalc: yes.

## 5. Gaps / Blockers

1. **No durable League Builder startup farm/scouting draft workflow.**
   - Existing League Builder Draft page is prototype state, not a persisted draft.

2. **No durable scout-profile assignment system.**
   - Specs require per-team scouts with specialties/weaknesses; active code does not provide this.

3. **Current startup bridge is not spec-complete prospect/scouting generation.**
   - It fills FARM rosters, but does not use a durable scout model and does not reuse the shared prospect generation engine.

4. **Franchise Setup mutates League Builder data.**
   - This can be accepted as a temporary bridge, but it is not the clean validation/copy boundary.

5. **Team Hub does not yet show the 10 FARM players.**
   - It shows FARM count and advice, but the main roster table intentionally excludes FARM players.

6. **Hidden-safe prospect details are not surfaced.**
   - Since FARM players are not listed in Team Hub, there is no clear place to inspect allowed details while keeping true ratings hidden.

7. **Manual lineup/rotation editing for Franchise Team Hub is missing.**
   - Existing optimal-lineup controls are useful but not a full durable lineup/rotation manager.

8. **10 FARM semantics need a v1 decision.**
   - Current copy requires exactly 10 FARM at startup.
   - Farm spec says regular-season farm can be unlimited and 10 is Phase 11 cut-down.

## 6. Decisions Needed From User

These are decision points, not locked recommendations:

1. Should v1 move startup farm/scouting draft fully into League Builder, with Franchise Setup only validating/copying prepared state?

2. If yes, should the current Franchise Setup auto-fill remain as a temporary explicit repair button, or should it be removed/replaced by a blocking route back to League Builder?

3. Should startup require exactly 10 FARM players per team, or allow "at least 10" while Phase 11 later enforces exactly 10?

4. Should League Builder Draft reuse `gradeEngine` directly after adding deterministic seeded RNG, or should `franchiseStartupProspectDraft.ts` be generalized into a shared draft engine?

5. Should scout profiles be visible and editable in League Builder for v1, or auto-assigned but displayed read-only?

6. Should scout specialties be visible during scout hiring/assignment so the user can make strategic scouting choices, while keeping scouted reports imperfect and true ratings hidden?
   - User decision: approved.

7. Should Team Hub become the durable in-season farm inspection surface, while transaction desk remains the mutation surface for call-up/send-down?

8. Should manual franchise lineup/rotation editing live in Team Hub for v1, or remain a League Builder/preseason responsibility until a later slice?

## 7. Recommended Implementation Slices

Recommendations are contextual and should not be treated as final approval.

### Slice 1: League Builder Farm/Scouting Ownership Decision and Contract

Define the contract first:

- What League Builder must produce: 22 MLB, startup FARM baseline, scout assignment/scouted-grade metadata, rookie salary, hidden true ratings, visible-safe prospect fields.
- What Franchise Setup validates and copies.
- Whether the auto-fill bridge remains and under what UI wording.

Why first:

- This prevents building more Franchise Setup bridge behavior that may be replaced.

### Slice 2: Extract a Shared Deterministic Prospect Draft Engine

Unify generation logic behind a reusable engine:

- Deterministic seed input.
- Team draft order.
- Round/pick metadata.
- Rookie salary.
- True grade/ratings.
- Scouted grade/report from scout profile.
- Hidden personality modifiers.
- No fantasy MLB draft and no generated regular-season schedule.

Likely reuse:

- `gradeEngine.ts` prospect rating/grade helpers, after adding seeded RNG support.
- `franchiseStartupProspectDraft.ts` preflight, idempotency, collision, save, and rollback lessons.

### Slice 3: League Builder Startup Farm Draft UI and Persistence

Build or harden a League Builder-owned workflow:

- Generate/review draft class.
- Assign or confirm team scouts.
- Run startup snake draft or auto-draft AI teams.
- Persist drafted players into League Builder player storage and team `farmRoster`.
- Persist scout/scouted metadata.

Reuse:

- `LeagueBuilderDraft.tsx` layout/copy only where helpful.
- `LeagueBuilderRosters.tsx` roster/farm editing patterns.

### Slice 4: Franchise Setup Validation-Only Path

After League Builder can prepare farms:

- Make Franchise Setup validate the selected league's handoff.
- Block with actionable messaging when FARM/scouting state is incomplete.
- Decide whether to keep an explicit repair/fill action.
- Keep rollback logic if any bridge behavior remains.

### Slice 5: Team Hub Farm Visibility

Add a hidden-safe FARM roster surface:

- Show all FARM players for selected team.
- Show allowed fields: scouted grade, potential/scout confidence if available, position, age, chemistry, visible personality, traits, options, morale if intended.
- Hide true numeric ratings until reveal.
- Link or route call-up/send-down to transaction surface rather than silently mutating from read-only hub.

### Slice 6: Call-Up Reveal and Options Hardening

Make reveal/options user-visible and regression-protected:

- Confirm call-up reveal happens once.
- Show reveal result.
- Enforce and display 3 send-down options.
- Preserve transaction logging and rollback behavior.

### Slice 7: Franchise Lineup/Rotation Management Decision

Only after farm/scouting ownership is settled:

- Decide whether Team Hub needs manual lineup/order/rotation editing for v1.
- If yes, reuse League Builder and Elimination Team Hub patterns.
- Keep GameTracker launch consuming current franchise-owned MLB state.

## 8. Explicit No-Code/Test-Change Note

This audit did not implement app code, add UI, modify tests, stage files, or commit.

Known excluded dirty files were not edited:

- `package.json`
- `supabase/.temp/cli-latest`
- `scripts/exportSmb4GeneratedRosterReport.mjs`
- `scripts/exportSmb4TeamProfiles.mjs`
- `spec-docs/data/smb4_standard_team_profiles.csv`
- `spec-docs/data/smb4_standard_team_profiles.json`
- `spec-docs/generated/`

The only intended changed file for this request is:

- `spec-docs/FRANCHISE_FARM_SCOUTING_AND_GAMETRACKER_PARITY_PLAN.md`

## 9. Slice 1 Locked Ownership Contract

Slice 1 locks the v1 ownership boundary without building the full startup draft UI.

### League Builder / Mode 1 owns startup farm and scouting preparation

- League Builder is the canonical owner of startup farm/scouting state before franchise creation.
- Franchise Setup is a validation/copy boundary, not the final farm draft architecture.
- The current Franchise Setup startup prospect draft remains only a temporary v1 bridge for otherwise valid leagues that are missing FARM players.
- Prepared League Builder leagues must skip the bridge; Franchise Setup should not mutate League Builder data when 22 MLB + 10 FARM per team already exists.
- The bridge may repair missing FARM slots only when MLB assignments, FARM assignments, and team rosters are otherwise consistent.

### V1 handoff validation contract

For Franchise v1 startup, the selected League Builder league must validate as:

- 22 MLB players per team.
- 10 FARM players per team after any explicitly allowed temporary bridge repair.
- FARM roster ids match player FARM assignments.
- No duplicate FARM ids.
- No team has more than 10 FARM players at startup handoff.
- FARM players are not in a revealed ratings state before call-up.
- Hidden true ratings and hidden personality modifiers remain non-user-visible until call-up/reveal.
- Visible-safe prospect/scouting metadata is copied when present, such as scouted grade, potential/scouting summary metadata, position, chemistry, traits, and visible personality.

### Scout profile decision

- Durable scout profiles/storage are deferred.
- Missing scout/profile data is a warning or limitation, not a Slice 1 blocker.
- Scout specialties may be visible during future hiring/assignment UX.
- Scouting output remains imperfect; visible scouting data must not expose true ratings.

### Deferred after Slice 1

- Full League Builder startup farm draft workflow.
- Prospect generation rewrite.
- Durable scout profile and scout assignment storage.
- Team Hub FARM roster UI.
- Call-up reveal UI hardening beyond existing farm record/reveal state.
- GameTracker changes.

## 10. Slice 2 Shared Deterministic Draft Engine Checkpoint

Slice 2 adds the shared pure engine for the future League Builder-owned startup farm/scouting draft.

Implemented boundary:

- `src/utils/prospectScoutingDraftEngine.ts` is utility/model code only.
- No League Builder storage imports, IndexedDB writes, UI routes, Team Hub changes, or GameTracker changes.
- Input owns league id, season number, team draft order, rounds, seed, existing ids, and in-memory scout descriptors.
- Output includes generated candidates, snake pick order, selected picks, League Builder-ready player DTOs, FARM assignment metadata, hidden reveal state, prospect profiles, visible-safe reports, warnings, and limitations.

Locked behavior:

- Same seed produces identical output; different seed changes output.
- Generated ids are deterministic and collision-safe against supplied existing player ids.
- Scout specialties and weaknesses are visible in descriptors/reports and affect scouted-grade accuracy.
- Scouting remains imperfect; scouted grade is not guaranteed to match true grade.
- True ratings, true grade, and hidden personality modifiers are present only in storage-ready/hidden DTO fields, not visible-safe report output.
- Rookie salary is assigned at draft time and should not change on call-up reveal.
- With 10 rounds, the engine can produce exactly 10 FARM assignments per team.

Still deferred:

- League Builder draft UI and pick persistence.
- Durable scout profile/storage.
- Scout hiring/assignment workflow.

## 12. Slice 4 League Builder Startup Farm Draft Checkpoint

Slice 4 adds the minimum durable League Builder startup farm draft workflow.

Implemented boundary:

- `LeagueBuilderDraft` is now a League Builder / Mode 1 startup FARM draft surface instead of an offseason/fantasy draft prototype.
- Users can select a League Builder league, review team FARM counts, generate a deterministic startup farm draft from the shared engine, review visible-safe scouting reports, and apply the draft to League Builder storage.
- Applying the draft saves generated prospects through League Builder player storage and appends generated player ids to the correct team `farmRoster`.
- Drafted prospects retain `leagueAssignments` with `rosterStatus: FARM`, `ratingRevealState: hidden`, prospect/scouting metadata, rookie salary, and hidden personality modifiers in storage.
- The UI shows visible scout specialties/weaknesses and visible-safe reports only; hidden true ratings and hidden personality modifiers remain non-user-visible.

Locked safety behavior:

- Leagues with no teams cannot generate a startup farm draft.
- Prepared teams with 10 FARM players are not overfilled.
- Overfull FARM state, duplicate/mismatched FARM roster state, missing rosters, missing teams, and invalid MLB counts block draft generation/apply.
- Generated deterministic player id collisions are blocked before writes.
- Apply failures perform best-effort rollback of created players and touched team rosters, with rollback errors reported.

Still deferred:

- Full scout profile persistence and scout hiring/assignment management.
- Team Hub FARM roster UI.
- Offseason drafts, free agency, retirement, and salary economy expansion.

## 11. Slice 3 Temporary Bridge Wiring Checkpoint

Slice 3 wires the temporary Franchise Setup startup-farm repair bridge to the shared deterministic prospect/scouting draft engine.

Implemented boundary:

- `runStartupProspectDraftForLeague` now uses `generateProspectScoutingDraft` for generated prospect identity, hidden reveal state, prospect profile metadata, visible-safe scouting reports, and rookie salary.
- The bridge still validates and writes only the missing FARM slots for otherwise repairable League Builder leagues.
- Prepared leagues with 10 FARM players per team remain no-op and do not invoke bridge writes.
- The bridge still preflights deterministic generated player ids before writing and blocks collisions instead of silently overwriting or falling back.
- Rollback remains bridge-owned and removes created bridge players while restoring touched team farm rosters.

Locked behavior:

- Bridge reports include the bridge method/version, shared engine method/version, deterministic seed, repair-applied/no-op state, visible-safe reports, engine warnings, and engine limitations.
- Default bridge scout descriptors are in-memory only; missing durable scout profiles remain a limitation, not a blocker.
- Generated bridge prospects preserve hidden reveal state and hidden personality modifiers in storage, while user-visible bridge reports expose only visible-safe scouting metadata.

Still deferred:

- League Builder draft UI and pick persistence.
- Durable scout profile/storage.
- Scout hiring/assignment workflow.
