# Franchise V1 Current State And Team Handoff

Last updated: 2026-06-06

Recommended reasoning effort for future coding agents: extra-high for roadmap or architecture decisions, high for implementation slices, medium for audits and doc-only checkpoints.

## Purpose

This document is a current-state handoff for a coding team joining the KBL Tracker Franchise v1 effort. It is meant to let a new team:

- Understand the current Mode 1 / Mode 2 state without reading the entire chat history.
- See what has been built, what is trusted, what is provisional, and what is intentionally blocked.
- Make roadmap decisions without accidentally reopening deferred full-spec systems.
- Continue the same implementation/audit/commit workflow with the user.

This is not a product spec by itself. It is an onboarding and coordination document that ties the active repo state back to feature goals.

## Source Of Truth Hierarchy

Use this order when facts conflict:

1. Current git state and code/tests.
2. This handoff document, if kept current.
3. `FRANCHISE_MODE2_V1_CONTEXT_CARD.md`.
4. `FRANCHISE_MODE2_V1_COMPLETION_ROADMAP.md`.
5. `FRANCHISE_MODE1_MODE2_PLAYABLE_V1_GAP_ANALYSIS.md`.
6. `FRANCHISE_INTERNAL_V1_MANUAL_SMOKE_FEEDBACK.md`.
7. Feature-specific specs.
8. Older archived specs and historical roadmap files.

Important caveat: at handoff authoring time, `FRANCHISE_MODE2_V1_CONTEXT_CARD.md` and `FRANCHISE_MODE2_V1_COMPLETION_ROADMAP.md` still contained stale "Latest committed checkpoint" lines naming `366064a Define v1 dynamic designation policy`, while `git log --oneline -30` showed newer commits through `3173567 Show provisional stadium spray chart`. Trust `git log` for commit order.

## Current Git Snapshot At Authoring

Branch:

```text
codex/franchise-v1-next
```

Recent HEAD from `git log --oneline -30`:

```text
3173567 Show provisional stadium spray chart
6e43e33 Add dev-only franchise smoke setup
4019733 Persist spray evidence in completed games
f174994 Fix stadium spray evidence matching
40128e2 Update smoke findings status
dd71947 Expose franchise archives in Almanac
78747d1 Show full names in substitution menus
8d9c908 Fix franchise profile position and pitching integrity
86a5a1a Protect hidden FARM salary context
351d583 Add final Mode 1 and 2 smoke checklist
c01065b Clarify score-only morale confirmation
2b27363 Update remaining playable v1 priorities
366064a Define v1 dynamic designation policy
9189631 Tighten archived park factor trust
beffa0a Protect hidden prospect data in trades
4d66593 Harden franchise schedule editing boundaries
31d947c Clarify score-only result boundaries
ceec245 Add populated visual smoke fixture
ae514fb Reconcile playable v1 gap tracker
3625f02 Add safe Mode 2 visual smoke preview
72ef3b6 Preserve franchise fame event context
b7b7471 Surface archived franchise WPA
c4015ef Persist franchise players into Almanac
5d236e0 Update playable v1 gap tracker
c6bcd69 Tighten Mode 1 and Mode 2 dense UI
510d618 Clarify stadium source of truth
e0cc931 Show salary baselines in Team Hub analysis
8dbd9a4 Tighten MVP and Ace designation previews
9d5c5ff Improve Team Hub roster scan table
edb20e5 Clean up franchise generated prospect and scout data
```

Working tree before this handoff file was created:

```text
## codex/franchise-v1-next
 M spec-docs/FRANCHISE_INTERNAL_V1_MANUAL_SMOKE_FEEDBACK.md
 M spec-docs/FRANCHISE_MODE1_MODE2_PLAYABLE_V1_GAP_ANALYSIS.md
 M spec-docs/FRANCHISE_MODE2_V1_COMPLETION_ROADMAP.md
 M spec-docs/FRANCHISE_MODE2_V1_CONTEXT_CARD.md
```

Those four doc changes add the Product UX Cleanup lane and mark the Team Hub stadium spray chart as provisional functional visualization, not final design.

## North Star

Finish a reliable, scoped, auditable internal playable v1 for Mode 1 and Mode 2 before moving into Mode 3/offseason or full canonical Franchise parity.

Mode 1 and Mode 2 remain the active priority until the user explicitly approves playable v1.

Playable v1 is not approved yet.

## Working Definition Of Revised Playable V1

The revised playable v1 goal is not full Franchise simulation. It is a user-playable, trust-safe loop:

1. Create or load a Franchise from a prepared League Builder / Mode 1 source.
2. Preserve copied teams, rosters, salaries/contracts, stadium identity, FARM prospects, scouting context, and save-slot identity.
3. Let the user add or import user-supplied schedule rows without generated schedules.
4. Let the user complete a score-only row with clear boundaries.
5. Let the user launch a scheduled Franchise game into GameTracker when true roster/lineup readiness is satisfied.
6. Complete/archive a GameTracker game with franchise/season/schedule/team/player identity preserved.
7. Surface completed-game evidence in Team Hub, Game Detail, Player Card, and Almanac without fabricating evidence from score-only rows.
8. Support roster inspection, FARM visibility, call-up/send-down/trade continuity, salaries, morale, active MVP/Ace designations, blocked/deferred designation families, stadium evidence, WPA/fame evidence, save export/delete, and iPad-readable use.
9. Keep all preview-only, read-only, confirmation-gated, or blocked systems honest.
10. Ask the user for explicit approval before declaring Mode 1/2 playable v1 complete.

## Hard Boundaries

Do not implement or promote any of the following without explicit user approval:

- Mode 3/offseason execution or handoff writes.
- Auto-draft as product behavior.
- AI game simulation.
- AI trades, trade acceptance AI, or salary-matching automation.
- Generated regular-season schedules.
- Final True Value.
- Salary movement, luxury tax, salary lifecycle automation, or salary-matching logic.
- Final dynamic designation persistence beyond active MVP/Ace, season-end designation locking, or carryover.
- Final awards persistence or awards automation.
- Automatic morale mutation outside explicit confirmation flows.
- Relationship mutation or durable relationship state.
- Story persistence beyond the existing random-event log.
- Adaptive park-factor persistence, custom stadium factor entry, or final park-adjusted WAR/value consumers.
- Hidden FARM/prospect truth leaks.
- Silent GameTracker morale mutation.
- Score-only player evidence.

Score-only rows may support schedule/standings and possible team-fan morale prompt context only after explicit Random Event Log confirmation. They must never create player stats, player morale, WPA/WAR, fame, milestones, awards, designations, player history, relationships, or Almanac player evidence.

Safe preview and fixture routes must stay dev/test oriented and must not mutate real user Franchise, schedule, GameTracker, completed-game, or Almanac storage unless they are explicitly named smoke tooling and write only after user action into disposable fixture namespaces.

## Collaboration Protocol

The user has been acting as traffic cop for multiple implementation/audit threads. Continue that operating model unless the user changes it.

Default flow:

1. Derive the next smallest slice from the roadmap or the user's latest smoke finding.
2. State the slice, phase, recommended reasoning effort, hard boundaries, and changed-file expectations.
3. Implement in one focused thread.
4. Run focused tests, `npm run build` when code changes warrant it, and `git diff --check`.
5. Run a skeptical audit before commit.
6. Patch blockers.
7. Commit only after safe-to-commit audit.
8. Update roadmap/context docs for meaningful checkpoints, or explicitly say no roadmap update was needed.

Audit reports should lead with findings, then confirmed good, verification, remaining risks, and final safe-to-commit verdict.

Commit hygiene:

- Watch for untracked files. Several recent slices introduced new test/helper files that `git diff --name-only` did not list.
- Do not rely only on changed tracked files when giving commit prompts.
- Do not revert user or other-thread work.

## Feature Goal State Matrix

| Feature goal | Current state | Remaining loose ends | V1 decision needed |
|---|---|---|---|
| Mode 1 source league to Franchise handoff | Prepared League Builder data can feed Franchise setup. FARM/scouting handoff, salaries/contracts, stadium identity, and no-generated-schedule boundaries have been hardened. Dev/test manual smoke setup route exists. | User still creates Franchise through normal setup. Import/upload not implemented. Product auto-draft remains excluded. | Is the dev/test smoke fixture enough for repeated testing, or does v1 need more user-facing setup ergonomics? |
| Franchise save slots | Create/load/export/delete have been hardened. Save-slot copy states import/upload is not implemented. Save-slot manifest covers several scoped evidence stores. | Import/upload/restore does not exist. | Decide whether no import/upload is acceptable for playable v1. |
| Manual schedule workflow | Manual/CSV user-supplied schedule path is hardened. Completed rows are immutable in visible controls. Generated schedules are off. | Production visual smoke should still watch usability. No generated schedules. | Accept manual/CSV-only scheduling for v1, or explicitly scope schedule authoring UX work. |
| Score-only workflow | Score-only rows are distinct, lack Game Detail/archive affordance, and clarify schedule/standings plus confirmation-gated team-fan morale only. | User comprehension still needs real-app smoke. | Likely acceptable for v1 if smoke confirms clarity. |
| GameTracker Franchise launch | Launch paths hardened. Missing/stale Lineup Delta metadata no longer blocks launch; true roster/lineup readiness still blocks. Playoff readiness blocker was fixed. | Existing test console noise remains. Real-app smoke still matters. | Keep as v1 core loop. |
| GameTracker player name display | Lineups and substitution menus now display full names while preserving identity payloads. | Visual readability for very long names was not deeply browser-smoked. | Likely acceptable unless smoke finds layout breakage. |
| GameTracker completion/archive | Franchise completed games persist player/team/game identity, Almanac registration, WPA/fame context, and now embedded spray evidence for new archives. | Older archives without embedded spray events cannot be retroactively fixed if event-log rows are missing. | Accept forward-only archive enrichment, or scope a migration/backfill if required. |
| Almanac continuity | Franchise completed-game archives, player search, player cards, and archive-backed franchise links are reachable. `getFranchiseGames` filters franchise/playoff archives. | Full Franchise history hub remains deferred. | Decide whether archive/search access is enough for v1. |
| Team Hub roster scan | Dense sortable table with salary, morale, stats/value summaries, designation preview, hidden FARM safety. | Product UX cleanup needed. iPad production smoke still useful. | Functional enough; UX cleanup may be needed before final approval. |
| Player profile and edit | Primary/secondary positions separated. Analyzer grade and stored grade separated. Non-pitcher/non-TWO-WAY pitching ratings/arsenal hidden and edit-blocked. Revealed sent-down players remain visible/editable. | Docs still contain one stale "FARM prospect grade mismatch" remaining-candidate mention. Verify in real app and reconcile docs. Existing stored non-pitchers with old pitching values are hidden, not migrated. | Treat as addressed pending smoke verification. |
| FARM/scouting hidden safety | Hidden FARM salary now uses draft/scouting-safe context, not true ratings. Hidden grades/truth blocked in Team Hub/trade/profile surfaces. | Full scouting UX remains incomplete. | Likely v1-safe for hidden truth after smoke. |
| Trades and roster movement | Manual call-up/send-down/trade continuity hardened. Hidden prospect data protected in picker/preview. GameTracker roster uses current MLB assignments. | Full trade UX, AI trades, salary matching, transaction drilldowns deferred. | Manual-only movement acceptable for v1 unless user wants fuller trade UX. |
| Salary/finance/True Value | Salary baseline/team payroll visibility exists. True Value and Expected Wins are preview-only/read-only. Contract-years proof is separated from stable salary baseline proof. | No final salary movement. UI is wordy. FARM hidden salary patched but needs user smoke. | Keep preview-only for v1. |
| Dynamic designations | TEAM_MVP and ACE are active persisted v1 designations after the trusted scoped WAR gate. Ranked/selective. TWO-WAY routes pitcher-only through ACE for internal v1. Other designation families blocked/deferred. | Future stricter TWO-WAY MVP criteria, season-end locking/carryover, morale/story consumers, and non-MVP/Ace families remain deferred. | Accept active persisted MVP/Ace for v1 and keep other designation families blocked. |
| Morale/random events | Durable random-event log exists with confirmation/dismissal and safe-effect application. Team-fan score-only prompts require confirmation. Player morale starts neutral 50. | No morale automation, drift/recovery, relationship effects, or full formula system. UI is wordy. | Keep confirmation-gated for v1. |
| Stadium identity/park factors | Source-of-truth and archive trust tightened. SMB4 seed factors trusted only when verified. Custom/adaptive factors blocked/preview-only. | Custom stadium factor entry and adaptive persistence deferred. | Accept seed/static read-only foundation for v1. |
| Stadium spray evidence | Backend path now persists completed-game spray evidence into archives and maps event-log/archive rows into stadium foundation. Latest screenshot showed Team Hub chart with points, but design was not adequate. | Team Hub stadium spray chart is provisional functional visualization, not final design. Heat map/advanced analytics/records UI not done. Older archives may have zero rows. | Decide whether provisional visualization is acceptable for internal playable v1 or must be redesigned before approval. |
| WPA/Manager Moments | Archived player and manager WPA totals are visible in approved contexts. Game Detail now separates player WPA from Manager WPA decision-quality and lineup-delta evidence when archive records exist. Formula files were not changed in the visibility pass. | Older archives or score-only/manual-result rows without committed manager records show unavailable copy and are not backfilled. | Smoke should verify with a real completed archive; no fabricated evidence. |
| Fame events | Trusted no-hitter/perfect-game context preserved with franchise/season/team/opponent scope and confirmation-gated fan morale prompts. Score-only rows blocked. | Broader fame categories and awards deferred. | Accept scoped trusted fame for v1. |
| Visual smoke tooling | Safe visual smoke preview route and populated fixture exist. Dev-only manual smoke setup route seeds disposable smoke league after click. | Full production-shaped harness remains limited. User still needs real-app smoke. | Keep as internal tooling, not product feature. |
| Product UX | A cleanup lane is documented. | App currently reads too much like implementation/audit/progress documentation. Stadium chart design is inadequate. Team Hub/Finance/Morale/Designation/Random Event/Schedule/Almanac need simplification. | Decide whether UX cleanup is required before playable-v1 approval or immediately after functionality approval. |
| Mode 3/offseason | Read-only readiness and handoff planning contracts exist. | Execution is blocked. | Do not start until user approves after v1. |

## Current Practical Roadmap

### Gate 1: Commit/verify current doc-only UX cleanup lane

The working tree has doc-only Product UX Cleanup lane changes. Commit or reconcile them before relying on them as durable context.

Verification for doc-only commit:

```text
git diff --check
rg -n "Product UX cleanup|provisional|implementation/audit|trust-boundary|iPad" spec-docs/FRANCHISE_INTERNAL_V1_MANUAL_SMOKE_FEEDBACK.md spec-docs/FRANCHISE_MODE1_MODE2_PLAYABLE_V1_GAP_ANALYSIS.md spec-docs/FRANCHISE_MODE2_V1_CONTEXT_CARD.md spec-docs/FRANCHISE_MODE2_V1_COMPLETION_ROADMAP.md
```

### Gate 2: Real-app smoke rerun

Use a normal local Franchise save, not only preview routes. The final checklist lives in `FRANCHISE_MODE1_MODE2_PLAYABLE_V1_GAP_ANALYSIS.md`.

Minimum smoke areas:

- Franchise create/load from prepared league.
- No generated schedules.
- Manual schedule row.
- Score-only boundary.
- GameTracker launch.
- GameTracker completion/archive.
- Almanac continuity.
- Team Hub roster/profile/FARM salary.
- Trade/FARM movement.
- Stadium source and spray evidence.
- WPA/fame visibility.
- Save export/delete.
- iPad readability.

### Gate 3: Patch any remaining functional blocker

Known likely candidates:

1. Any remaining real-app Stadium spray evidence issue.
2. Any Manager WPA lineup-delta visibility issue found during smoke after the archive-backed display patch.
3. Any real-app player profile/analyzer discrepancy.
4. Any save-slot clarity issue around import/upload expectations.

### Gate 4: Product UX cleanup decision

The team must decide whether Product UX Cleanup is:

- Required before internal playable-v1 approval, or
- The first post-functionality lane before broader release.

The user's latest concern is strong: the app currently looks like repository/progress-tracking UI, not a polished usable app. Treat this as real product debt, not a harmless wording note.

Recommended decision: fix any remaining functional blocker first, then run a dedicated Product UX Cleanup lane before declaring v1 broadly usable. If the user wants an internal "functionality approved but UX pending" milestone, name it explicitly and do not call it final playable v1.

## Product UX Cleanup Lane

Goal: make the app feel like a product instead of an implementation notebook while preserving safety boundaries.

Target surfaces:

- Team Hub Foundation/Finance/Stadium panels.
- Team Hub Morale and Random Event Log.
- Team Hub designation/status surfaces.
- Schedule rows and score-only flow.
- Almanac Home / Franchise access.
- Player profile modal.
- League Builder stadium status.
- Any preview-only or blocked-state card that currently explains implementation history.

Principles:

- Replace long prose with compact labels, badges, and short blockers.
- Move detailed explanation behind help/details/tooltips.
- Keep hidden-safety and trust-boundary information available.
- Remove implementation-progress language such as "foundation", "blocked by v1", "preview-only because...", unless it is genuinely user-facing.
- Avoid making product panels read like specs or audit summaries.
- Keep iPad readability as a hard requirement.
- Do not add mutation controls while cleaning copy.

Concrete examples:

- "Score-only rows do not create player stats, WPA, fame, awards, designations, relationships, or Almanac player evidence" can become a compact "Score-only: standings only" label plus details.
- "Adaptive factors and records stay preview-only" can become "Adaptive: preview" with a details affordance.
- "Source of truth copied from Mode 1 / League Builder" can become "Source: League Builder" plus an info tooltip.
- "Provisional functional visualization" belongs in docs, not as default app copy.

## Stadium/Spray Current State

Backend/data path:

- New GameTracker at-bat events store stable park context.
- Completed GameTracker archives now persist embedded at-bat and fielding evidence.
- Archive evidence is enriched with franchise/season/stats scope, schedule/game identity, team/player context, stable stadium id/name, and park factors.
- Stadium foundation merges archive-embedded events and event-log rows, deduping by event id.
- Score-only/manual rows do not fabricate spray evidence.
- Wrong-scope rows and orphan fielding rows are blocked.
- Custom/adaptive park factors remain blocked/preview-only.

Latest user-observed status after the provisional chart slice:

- Spray evidence is now visibly populating in Team Hub.
- The visual design is not adequate to spec/product expectations.
- Treat backend data as ready for commit-level confidence, but Team Hub spray chart UI as provisional.

Known deferred stadium items:

- Heat map.
- Better stadium graphic design.
- Separate stadium stats, records, and advanced metrics experience.
- Custom stadium factor entry.
- Adaptive factor persistence.
- Park-adjusted WAR/value consumers.
- Retroactive spray recovery for older archives without embedded events and missing event logs.

## Manager WPA / Lineup Delta Current State

What exists:

- Archived player WPA and manager/Manager Moments totals can be surfaced from completed-game records.
- Game Detail and Player Instance Card can show stored archive totals.
- Game Detail now shows archive-backed Manager WPA decision-quality and lineup-delta evidence when `managerDecisions`, `managerDeploymentStints`, or `managerLineupDeltas` are stored on the completed-game archive.
- No WPA, LI, Clutch, or Manager Moments formula files were changed by the visibility pass.

Known limitation:

- Older archives and score-only/manual-result rows without committed manager records show unavailable copy. Do not fabricate lineup delta or decision quality from score-only rows.

Before extending:

- Inspect the completed-game archive shape for manager WPA totals and lineup-delta-specific attribution.
- Confirm whether any requested additional data is absent, stored under another field, or only not rendered.
- Do not invent or recompute formulas unless the active slice explicitly says to implement formula work.
- Prefer displaying stored archive evidence with clear unavailable copy when the archive lacks it.

## Almanac Current State

What exists:

- `/almanac/franchise` is registered in the actual mounted app router.
- Almanac Home links to archive-backed franchise game archive and franchise player search.
- Franchise game archive uses `getFranchiseGames` and filters to `competitionType === "franchise"` or `"playoff"`.
- `mode=franchise` player search filters archived player instances to franchise contexts.
- Completed franchise games register players into the canonical Almanac registry even without an exhibition league id.
- Save-slot delete removes only owned franchise canonical player instances while preserving shared/exhibition and other-franchise rows.

What does not exist:

- Full Franchise history hub.
- Save import/upload/restore.
- Final awards/museum/franchise-history complete system.

## Score-Only Current State

Score-only is intentionally limited.

Allowed:

- Schedule completion.
- Standings update.
- Team-fan morale prompt context, only after explicit confirmation in Random Event Log.

Blocked:

- Game Detail archive.
- Player stats.
- Player morale.
- WPA/WAR.
- Fame/milestones.
- Awards.
- Designations.
- Relationships.
- Almanac player evidence.

Coding rule: score-only code paths should remain boring. If score-only starts touching player evidence, stop and audit.

## FARM / Prospect Current State

What exists:

- Generated Franchise prospects/scouts use SMB4-backed names where available.
- Generated prospects/scouts no longer use DH as generated Franchise identity.
- Hidden FARM salary is draft/scouting-safe and does not derive from hidden true ratings.
- Hidden FARM rows block true grade, hidden scout truth, hidden personality, hidden traits, hidden designation truth, and hidden stat truth.
- Revealed players sent down to FARM remain revealed/editable.
- Trade picker and previews use hidden-safe labels.

Known nuance:

- Older docs still contain some stale smoke wording around grade mismatch. The code has been hardened to show analyzer-derived grade separately from stored grade. Real-app smoke should confirm user-facing expectations and then docs should be reconciled.

## Dynamic Designation Current State

Active persisted v1 designations:

- `TEAM_MVP`
- `ACE`

Policy:

- Active persisted v1 franchise-player designation records after the trusted scoped WAR gate.
- Not season-end locked and not carried over yet.
- Emits designation events only when newly earned or meaningfully changed.
- Ranked/selective.
- TEAM_MVP requires positive WAR evidence and blocks pitcher identities.
- ACE requires pitcher pWAR `>= 0.5`.
- `TWO-WAY` is routed pitcher-only through ACE for internal v1.

Blocked/deferred:

- Fan Favorite final behavior.
- Albatross final behavior.
- Cornerstone.
- Captain.
- Fan Hopeful.
- Season-end lock/carryover.
- Awards integration.
- Salary movement.
- Morale automation.
- Relationship effects.

Do not let older full-system designation spec language override the committed v1 policy matrix.

## Salary / Value / Expected Wins Current State

Current status:

- Salary baseline, roster salary, payroll baseline, stable salary baseline proof, and contract-years proof are visible.
- Hidden FARM salary is draft/scouting-safe.
- Expected Wins and True Value previews exist.
- Durable expected-wins baseline snapshots exist as read-only scoped evidence.
- WAR has a narrow consumer-specific trust gate only for TEAM_MVP/ACE designation input review when scoped completed archive evidence, scoped season stats, current MLB/team context, and stored season metadata are present.

Boundaries:

- True Value, value delta, expected wins, awards, morale, salary movement, and Mode 3 remain preview-only or blocked as applicable.
- Read-only.
- WAR trust does not promote Fan Favorite/Albatross, final designations, morale automation, salary movement, awards, or Mode 3.
- No final True Value promotion.
- No salary lifecycle automation.

## Morale / Random Event Current State

Current status:

- Canonical fan/player morale uses 0-99 scale.
- Player morale starts neutral at 50.
- Manual scoped morale adjustments exist.
- Durable random-event log supports generated prompts, confirmation/dismissal, and idempotent safe-effect application.
- Team-fan prompts can use confirmed game results, streaks, blowouts, trusted no-hitter/perfect-game fame events, and expected-wins performance gaps.
- Score-only team-fan context requires confirmation.

Boundaries:

- No silent GameTracker morale mutation.
- No automatic drift/recovery.
- No relationship mutation.
- No full franchise health/free-agency consequence system.

## Save/Backup/Portability Current State

Evidence stores registered or covered in recent save-slot/backups work include:

- Franchise save slots.
- Completed games.
- Random events.
- Canonical morale.
- Expected-wins baselines.
- Daily morale snapshots.
- Stadium records.
- Almanac canonical player instances, scoped for save-slot delete.

Known gap:

- Import/upload/restore is explicitly not implemented.

## Manual Smoke Tooling

Dev/test visual preview:

```text
/__preview/franchise-v1-visual-smoke
```

- Dev/test gated.
- Non-mutating/read-only.
- Used for repeatable visual fixture confidence.
- Production build should not emit route/fixture strings.

Dev/test manual smoke setup:

```text
/__preview/franchise-v1-manual-smoke-setup
```

- Dev/test gated.
- Inert on mount.
- Writes only after clicking `Prepare Smoke League`.
- Seeds named disposable namespace `manual-smoke-v1-*`.
- Prepares six teams, MLB players, FARM prospects, scouts, salaries/contracts, and SMB4 stadium seed context for normal Franchise setup.
- This is smoke tooling, not product auto-draft.

Local network note:

- For iPad smoke against Vite, use the Mac LAN IP and host binding, e.g. `http://192.168.68.54:5173/` after starting Vite with host `0.0.0.0`.
- Do not use `localhost` from the iPad.

## Known Verification Noise

The following have appeared repeatedly during focused test runs and are not necessarily new failures:

- Vite large chunk warnings during `npm run build`.
- React `act(...)` warnings in some Team Hub / FranchiseHome / League Builder tests.
- GameTracker launch tests can emit known live win-probability console errors while assertions pass.

Do not ignore new failures, but do not treat these known warnings as automatic blockers without comparing to prior runs.

## Recommended Test Commands By Slice

General:

```text
git diff --check
npm run build
```

Franchise launch/GameTracker:

```text
npm test -- src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx src/src_figma/__tests__/gameTracker/GameTrackerLaunchState.test.tsx --reporter=dot
```

Schedule/score-only:

```text
npm test -- src/src_figma/__tests__/schedule/ScheduleContent.test.tsx src/src_figma/__tests__/scheduleData/scheduleStorage.franchiseScope.test.ts --reporter=dot
```

Team Hub/profile/FARM:

```text
npm test -- src/src_figma/__tests__/franchiseMode/TeamHubContent.franchiseReads.test.tsx src/utils/tests/franchisePlayerProfile.test.ts src/utils/tests/franchisePlayerProfileEdit.test.ts --reporter=dot
```

FARM/prospect/salary:

```text
npm test -- src/utils/tests/franchiseSalary.test.ts src/utils/tests/franchiseValueInputs.test.ts src/utils/tests/prospectScoutingDraftEngine.test.ts --reporter=dot
```

Trade/movement:

```text
npm test -- src/utils/tests/franchiseRosterMovement.test.ts src/utils/tests/franchiseTradeAdapter.test.ts src/src_figma/__tests__/franchiseMode/TradeFlow.franchiseTransactions.test.tsx --reporter=dot
```

Stadium/spray:

```text
npm test -- src/utils/tests/franchiseStadiumFoundation.test.ts src/utils/tests/franchiseStadiumRecordsStorage.test.ts src/src_figma/__tests__/franchiseMode/TeamHubContent.franchiseReads.test.tsx --reporter=dot
```

Almanac/archives:

```text
npm test -- src/src_figma/__tests__/aggregation/almanacQueries.playerCard.test.ts src/src_figma/__tests__/aggregation/processCompletedGame.almanac.test.ts src/src_figma/__tests__/aggregation/registerAlmanacPlayers.test.ts src/utils/tests/franchiseSaveSlotManifest.test.ts --reporter=dot
```

Random events/morale/designations:

```text
npm test -- src/utils/tests/franchiseDesignationEligibility.test.ts src/utils/tests/franchiseRandomEventGenerator.test.ts src/utils/tests/franchiseRandomEventLog.test.ts src/utils/tests/franchiseMoraleRelationshipTrust.test.ts --reporter=dot
```

Manual smoke fixtures:

```text
npm test -- src/utils/tests/franchiseManualSmokeFixture.test.ts src/src_figma/__tests__/app/FranchiseManualSmokeSetup.test.tsx src/src_figma/__tests__/app/FranchiseV1VisualSmokeSeed.test.tsx --reporter=dot
```

## Decision Points For The Team

The next team should make these decisions explicitly, not by drift:

1. Is Product UX Cleanup required before internal playable-v1 approval, or immediately after functionality approval?
2. Is the provisional Team Hub stadium spray chart acceptable for internal playable v1, or must it be redesigned first?
3. Does the new archive-backed Manager WPA lineup delta display pass real-app smoke?
4. Is no save import/upload acceptable for playable v1?
5. Is archive/search access enough for Almanac Franchise v1, or does v1 require a full Franchise history hub?
6. Are manual trades/call-ups/send-downs enough for v1, with AI/salary matching deferred?
7. Is manual/CSV-only scheduling acceptable, with generated schedules deferred?
8. Should stricter TWO-WAY Team MVP support remain deferred?
9. Is the smoke fixture route enough for testing ergonomics, or does v1 need additional dev-only tooling?
10. When exactly can Mode 3/offseason planning start?

Recommended answers based on current evidence:

- Product UX Cleanup should happen before broader release and probably before final playable-v1 approval if the user experience still feels like a debug/audit panel.
- Stadium backend data is likely good enough to keep, but the spray chart design is not final.
- Manager WPA lineup delta has been implemented as archive-backed Game Detail visibility; rerun smoke before choosing another functional blocker.
- Save import/upload can stay deferred if copy remains clear and the user accepts export/delete-only.
- Almanac archive/search access is probably enough for internal v1 if honestly labeled.
- Keep generated schedules, auto-draft, AI simulation/trades, final salary/designation/morale/relationship systems, adaptive factors, and Mode 3 deferred.

## Suggested Next Implementation Slice

If the user asks for implementation next and does not override priorities:

```md
Current slice: Manager WPA Lineup Delta Smoke Verification
Phase: Mode 1/2 playable-v1 smoke response
Recommended reasoning effort: medium

Goal:
Rerun the real-app manual smoke path and confirm Game Detail surfaces Manager WPA lineup delta and decision-quality evidence for a completed GameTracker archive that contains committed manager records.

Hard boundaries:
- Do not change WPA formulas during verification.
- Do not fabricate Manager WPA or lineup delta for score-only/manual rows.
- Do not add awards, morale automation, relationship mutation, story persistence, salary movement, final designations, adaptive park-factor persistence, AI simulation, or Mode 3/offseason behavior.
- Keep output read-only/archive-backed.

Expected approach:
1. Complete or load a GameTracker archive with committed manager records.
2. Open Game Detail from Almanac/Schedule.
3. Confirm Player WPA remains separate from Manager WPA.
4. Confirm Decision Quality Evidence and Lineup Delta Evidence appear when archive records exist.
5. Confirm older/score-only/manual-result archives show unavailable copy instead of fabricated metrics.
6. If the smoke fails, capture the exact archive shape and route before patching.
```

If the user instead prioritizes UX:

```md
Current slice: Product UX Cleanup - Team Hub Stadium And Finance
Phase: Mode 1/2 playable-v1 product cleanup
Recommended reasoning effort: extra-high

Goal:
Replace implementation/audit/progress-style copy in Team Hub Stadium and Finance with concise product-grade labels, badges, details affordances, and iPad-readable layouts while preserving hidden-safety and trust boundaries.

Hard boundaries:
- Do not add mutation controls.
- Do not remove blocked-state clarity.
- Do not promote preview-only/read-only data.
- Do not change formulas, storage, salary movement, designations, morale automation, relationships, or Mode 3 behavior.
- Keep stadium spray chart data path intact.

Expected approach:
1. Inventory current text and classify it as product label, blocker, help text, or implementation/progress text.
2. Move deep explanations behind details/help patterns.
3. Redesign layout for scanning, not spec-reading.
4. Browser-smoke iPad and desktop widths.
5. Add/update tests for critical labels, blocked states, and no new writes.
```

## Final Current-State Summary

The repo is no longer in early foundation mode. Most core Mode 1/2 data contracts have been hardened: launch, schedule boundaries, GameTracker archive, Almanac continuity, hidden FARM safety, profile integrity, salary baselines, active persisted TEAM_MVP/ACE designations, still-preview/deferred designation and value systems, random-event confirmation, stadium source/trust, spray persistence, and save-slot export/delete all have meaningful coverage.

The revised v1 is not approved because the team still needs a final real-app smoke pass and at least one explicit roadmap decision around Product UX Cleanup. The remaining work is now less about discovering whether the foundation exists and more about deciding the acceptance threshold:

- Functional blockers: any remaining real-app smoke failure, including Manager WPA lineup-delta visibility only if the new archive-backed Game Detail display does not pass smoke.
- Product blockers: the app currently over-explains implementation state and the Stadium spray chart design is not final.
- Deferred systems: Mode 3/offseason, auto-draft, generated schedules, AI simulation/trades, final salary/designation/award/morale/relationship/adaptive-stadium systems.

Do not let short-term fixes blur those categories. Keep functionality, product UX, and full-spec backlog separated in every future prompt and audit.
