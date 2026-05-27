# Franchise V1 Threads 1-5 Stabilization And Gap Board

Status: verification checkpoint after the first five Franchise v1 hardening threads.

Date: 2026-05-27

## Scope

This checkpoint covers the accepted Franchise v1 hardening commits:

| Thread | Commit | Scope |
|---|---:|---|
| Thread 1 | `bbf15e4` | Schedule policy cutover: no generated franchise schedules; empty/manual schedule baseline. |
| Thread 2 | `2cf79f4` | GameTracker active-game lifecycle, restore, completion, schedule/playoff advancement integrity. |
| Thread 3 | `4495ec9` | Franchise roster/farm/manual trade spine and transaction continuity. |
| Thread 4 | `41753c6` | Salary, stable designations, WPA/Manager Value, stadium identity, seed park-factor, adaptive standards spine. |
| Thread 5 | `d108dfc` | Narrative/history scoping, transaction-history projection, playerId story continuity, relationship preview boundary. |

This checkpoint does not include the known excluded dirty files:

- `package.json`
- `supabase/.temp/cli-latest`
- `scripts/exportSmb4GeneratedRosterReport.mjs`
- `scripts/exportSmb4TeamProfiles.mjs`
- `spec-docs/data/smb4_standard_team_profiles.csv`
- `spec-docs/data/smb4_standard_team_profiles.json`
- `spec-docs/generated/`

## Verification Result

Full suite:

```text
npm test -- --reporter=dot
322 test files passed
6602 tests passed
```

Build:

```text
npm run build
passed
```

Known noise remains:

- Existing React `act(...)` warnings in several component tests.
- Expected negative-path sync/indexedDB stderr in targeted failure tests.
- Existing Vite large chunk-size warnings for large app bundles.

## Stabilization Fixes Made During This Checkpoint

The first full-suite run found 7 failures. They were compatibility/test-boundary failures around the stricter completion checks from Thread 2, not new feature failures.

Fixes:

1. `useGameState` now safely falls back when older Vitest `gameStorage` mocks do not expose `getCompletedGameById`.
2. `r3-round5` tests now default mocked completed archive lookup to an aggregated archive, matching the hardened completion contract.
3. `wpaRuntimeBoundary` now explicitly allowlists `processCompletedGame.ts` as an approved event-log aggregation marker writer.

Focused rerun of the failed cluster passed:

```text
5 files passed
29 tests passed
```

Full suite and build then passed.

## Current V1 Spine

### Mode 1 To Mode 2 Foundation

Implemented or hardened:

- Franchise creation is copy-not-reference for franchise-owned teams and players.
- Franchise setup no longer auto-generates schedule rows.
- New seasons initialize empty schedule metadata instead of generated schedules.
- Franchise-owned team/player snapshots carry stable roster, lineup, salary, stadium, and seed park-factor identity where available.
- Season length and scheduled innings are available for downstream adaptive calculations.

Still requiring v1 decision/build work:

- CSV schedule upload/review/import if kept in v1.
- Stadiums/park-factor League Builder UI and custom park factor entry if kept in v1.
- Explicit Mode 1 setup polish for prospect/farm generation and hidden scouting/personality handoff.

### GameTracker And Completion Integrity

Implemented or hardened:

- Active-game restore/completion preserves franchise, season, schedule, stats scope, and playoff identity.
- Completion blocks schedule/playoff advancement if aggregation/archive integrity fails.
- Schedule completion and playoff aggregation/advancement have idempotency coverage.
- GameTracker launch uses current franchise roster assignments, not stale Mode 1 snapshots, while preserving in-progress game snapshots once launched.
- Player WPA and Manager Value are stored through completed game/archive paths.

Still requiring v1 decision/build work:

- Final-score-only/manual result entry if still desired.
- Additional UX around one-active-game policy if users need clearer overwrite warnings.

### Roster, Farm, Trades, And Transactions

Implemented or hardened:

- Mode 1 farm roster handoff seeds durable franchise farm records.
- Farm records carry forward into new season scope.
- Call-up/send-down, Phase 11 release/sign, retirement, and manual trade primitives use franchise-owned storage and transaction logs.
- Manual trade execution supports MLB/FARM player movement and preserves player identity, farm records, team cleanup, and designation continuity.
- Transaction history can project into narrative/history surfaces without mutating morale, chemistry, or relationships.

Still requiring v1 decision/build work:

- User-facing regular-season transaction workflow polish for manual trades/call-ups/send-downs.
- Clear Team Hub/Franchise Hub transaction timeline surfaces.
- Generated/external filler sources remain deferred.
- AI trades and salary matching remain out of v1 scope by decision.

### Salary, Designations, WPA, Park Identity, And Adaptive Standards

Implemented or hardened:

- Initial franchise salaries are calculated during franchise copy using the shared salary engine.
- D2 ratings/salary uses the shared franchise salary helper.
- Stable designations are persisted for MVP, Ace, Fan Favorite, and Albatross.
- Albatross value drift is corrected to the spec's 15 percent discount.
- Completed archives carry player WPA totals, Manager Value totals, stadium ID, and seed park-factor identity.
- Short-game pitching thresholds use scheduled innings instead of hard-coded 9-inning assumptions.

Still requiring v1 decision/build work:

- Full salary-system True Value/value-delta model remains deferred.
- Designation storage is stable for the narrow set only; Captain/Fan Hopeful are not fabricated.
- Stadium analytics and dynamic/custom/blended park factors are not fully implemented.
- Awards logic still needs a v1 pass that weighs WPA/Manager Value appropriately.

### Narrative, Morale, Relationships, And History

Implemented or hardened:

- Reporter stories carry franchise/season/stats/schedule/playoff scope.
- Franchise playoff stories stay franchise-scoped instead of elimination-scoped.
- Persisted stories include `playerIdsMentioned` so player history can follow player identity across trades.
- Almanac narrative archive excludes orphan/incomplete/cross-scope game-derived entries when scoped.
- Relationship data is explicitly marked v1 preview/in-memory only.

Still requiring v1 decision/build work:

- Canonical morale, chemistry, and relationship persistence are not v1-safe yet.
- Random narrative events remain deferred unless scoped as deterministic, testable, and non-mutating.
- Franchise-firsts/leaders/formal awards still need a source-of-truth pass.
- Global Almanac narratives page does not yet expose the new franchise/season-scoped transaction-history projection.

## High-Signal Remaining Gaps

These are the most important remaining gaps before calling v1 broadly playable:

1. Manual schedule import/review path, if CSV upload remains in v1.
2. Regular-season transaction UI for manual trades, call-ups, send-downs, and clear transaction history.
3. Mode 1 stadium/park-factor setup and persistence polish.
4. Full salary-system True Value/value-delta implementation or a clearly documented v1 simplification.
5. Farm/prospect generation and hidden scouting handoff decisions.
6. Awards/designations pass that decides how WPA, Manager Value, WAR, salary value, and adaptive season length interact.
7. Narrative/morale/relationship v1 design pass before canonical mutation.
8. Franchise-scoped Almanac/Team Hub history surfaces for player/team/stadium/story lookup.

## Recommended Next Wave

Do not return to offseason ceremony/flavor systems yet.

The next safest implementation wave is:

**Thread 6: manual schedule upload/review plus Mode 1 stadium/park-factor setup audit.**

Rationale:

- Schedule and stadium data are foundational inputs that Mode 2 stats, standings, park metrics, Team Hub, and almanac features depend on.
- The no-generated-schedule policy is now enforced; v1 still needs a practical way to enter real SMB4 schedules efficiently.
- Stadium identity is now carried through downstream paths, but League Builder/Mode 1 setup still needs a clean source of truth for park dimensions/factors.

Alternative if you want to prioritize in-season UX:

**Thread 6 alternate: manual transaction workflow surface.**

Rationale:

- The transaction spine is now real, but users need a stable surface to execute and audit manual trades/call-ups/send-downs during Mode 2.

## Open User Decisions

- Is CSV schedule upload required for v1, or is manual game-by-game entry enough for the first playable internal build?
- Should stadium park factors be user-entered in League Builder for v1, or should v1 use known SMB4 seed factors plus custom stadium identity only?
- Should True Value salary be implemented before v1, or can v1 ship with initial salary plus grade/salary recalculation and a deferred True Value label?
- Which canonical morale/relationship effects are worth implementing in v1 versus keeping as story-only preview?
- Which history surfaces matter first: Team Hub moves/stories, player timeline, stadium analytics, or Almanac franchise archive?
