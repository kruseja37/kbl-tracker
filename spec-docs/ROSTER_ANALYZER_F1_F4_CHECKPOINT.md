# Roster Analyzer F1-F4 Checkpoint

Date: 2026-05-24

Scope: documentation only. This checkpoint summarizes the implemented read-only roster analyzer work through F4 and records the boundaries that should remain in force before any future mutation-capable analyzer workflow.

Source context:
- `spec-docs/ROSTER_ANALYZER_RECOMMENDATION_ENGINE_SPEC.md`
- `spec-docs/FRANCHISE_IMPLEMENTATION_ROADMAP_POST_AUDIT.md`
- Current implementation in `src/engines/rosterAnalyzerEngine.ts`, `src/utils/rosterAnalyzerBuilderAdapter.ts`, `src/utils/rosterAnalyzerFranchiseAdapter.ts`, `src/src_figma/app/pages/LeagueBuilderRosters.tsx`, and `src/src_figma/app/components/TeamHubContent.tsx`

## 1. Completed Scope

### F1: Pure Shared Analyzer Engine

Implemented a deterministic, side-effect-free roster analyzer in `src/engines/rosterAnalyzerEngine.ts`.

Current engine contract includes:
- Analyzer modes and surfaces at `src/engines/rosterAnalyzerEngine.ts:1`.
- Normalized analyzer player DTOs, including roster status, ratings, farm option state, stats trust, traits, chemistry, salary, and identity at `src/engines/rosterAnalyzerEngine.ts:49`.
- `analyzeRoster(...)` as the shared report generator at `src/engines/rosterAnalyzerEngine.ts:625`.

Current analysis coverage includes:
- Active MLB roster count, farm count, and total count.
- Position coverage.
- Lineup readiness.
- Rotation and bullpen coverage.
- Pitch arsenal advisory checks.
- Top-heavy roster concentration advisory.
- Trait, chemistry, salary, and missing-data limitations.
- Farm monitoring advice as read-only / blocked future work.

### F2: Builder Read-Only Adapter And Minimal Surface

Implemented Builder mapping in `src/utils/rosterAnalyzerBuilderAdapter.ts`.

Current Builder adapter functions:
- `buildBuilderTeamAnalyzerInput(...)` at `src/utils/rosterAnalyzerBuilderAdapter.ts:291`.
- `analyzeBuilderTeamRoster(...)` at `src/utils/rosterAnalyzerBuilderAdapter.ts:340`.
- `analyzeBuilderLeagueRosters(...)` at `src/utils/rosterAnalyzerBuilderAdapter.ts:344`.

The Builder adapter:
- Maps League Builder team/player/roster data into `RosterAnalyzerInput`.
- Normalizes active/farm/free-agent/released/retired/inactive/unassigned/unknown statuses.
- Preserves missing `mlbRoster` / `farmRoster` IDs so `analyzeRoster(...)` can emit missing-player integrity findings.
- Keeps present but excluded players out of active/farm counts.
- Does not call Builder writers.

The minimal Builder UI surface is in `LeagueBuilderRosters`:
- Analyzer report generation at `src/src_figma/app/pages/LeagueBuilderRosters.tsx:308`.
- Panel mount at `src/src_figma/app/pages/LeagueBuilderRosters.tsx:474`.
- `BuilderRosterAnalyzerPanel` at `src/src_figma/app/pages/LeagueBuilderRosters.tsx:548`.

### F3: Franchise Read-Only Adapter And TeamHub Surface

Implemented franchise mapping in `src/utils/rosterAnalyzerFranchiseAdapter.ts`.

Current franchise adapter functions:
- `buildFranchiseTeamAnalyzerInput(...)` at `src/utils/rosterAnalyzerFranchiseAdapter.ts:239`.
- `analyzeFranchiseTeamRoster(...)` at `src/utils/rosterAnalyzerFranchiseAdapter.ts:297`.
- `analyzeFranchiseTeamRosterFromStorage(...)` at `src/utils/rosterAnalyzerFranchiseAdapter.ts:301`.

The franchise adapter:
- Uses franchise-owned player/team/farm data.
- Reads from franchise storage only in the storage-backed helper.
- Does not fall back to League Builder/global template data in healthy franchise context.
- Normalizes MLB/FARM/FREE_AGENT/RELEASED/RETIRED/INACTIVE/UNASSIGNED/UNKNOWN.
- Preserves missing active snapshot IDs and missing farm-record player IDs so the engine can emit data-integrity findings.
- Carries farm option state and rating reveal state into analyzer DTOs.

The TeamHub surface:
- Generates a TeamHub analyzer report at `src/src_figma/app/components/TeamHubContent.tsx:508`.
- Mounts the panel at `src/src_figma/app/components/TeamHubContent.tsx:908`.
- Renders `FranchiseRosterAnalyzerPanel` at `src/src_figma/app/components/TeamHubContent.tsx:1299`.

### F4: Farm Recommendation Read-Only Expansion

Expanded farm advice in the pure engine while keeping every recommendation advisory and non-executable.

Implemented farm analysis in `src/engines/rosterAnalyzerEngine.ts:909`.

Current farm advisories include:
- Farm depth imbalance.
- Farm coverage for active roster position gaps.
- Farm starter depth for thin rotations.
- Option usage risk.
- Out-of-options warnings.
- Hidden/partial/unknown rating reveal limitations.
- Missing option-state limitations.
- Explicit note that farm morale, narrative hooks, and offseason adapters are not active analyzer inputs.

Important examples:
- Farm coverage finding title at `src/engines/rosterAnalyzerEngine.ts:938`.
- Starter depth finding title at `src/engines/rosterAnalyzerEngine.ts:969`.
- Out-of-options finding title at `src/engines/rosterAnalyzerEngine.ts:998`.
- Deferred farm flavor limitation at `src/engines/rosterAnalyzerEngine.ts:1068`.

TeamHub now surfaces farm advisory titles without adding any execution controls.

## 2. Safety Boundaries

These boundaries are intentionally preserved through F1-F4:

- Read-only only.
- No roster mutations.
- No call-up or send-down execution.
- No transaction writes.
- No schedule, offseason, franchise, or Builder storage writes from analyzer code.
- No analyzer-driven Phase 11 roster movement.
- No “apply,” “fix,” or action buttons.
- No offseason adapter integration.
- No reliance on deferred fan morale, narrative, farm flavor, adaptive standards, or offseason systems as durable analyzer truth.

Implementation evidence:
- Engine recommendations use `read_only` or `blocked_future_work`; farm execution blockers use `call_up_send_down_execution_not_in_mvp`.
- Builder UI panel is display-only in `src/src_figma/app/pages/LeagueBuilderRosters.tsx:548`.
- TeamHub panel states “No call-ups, send-downs, or roster writes are executed here” in `src/src_figma/app/components/TeamHubContent.tsx:1310`.
- Franchise storage-backed analyzer helper only reads `getFranchiseTeam`, `getAllFranchisePlayers`, and `getFranchiseFarmRoster` in `src/utils/rosterAnalyzerFranchiseAdapter.ts:301`.

## 3. Data Inputs And Trust Levels

### Builder Inputs

Builder adapter inputs:
- League Builder teams and players.
- Team roster lists (`mlbRoster`, `farmRoster`).
- Lineups, rotation, bullpen roles, depth chart, and pinch orders.
- Player ratings, pitch arsenal, traits, chemistry, salary, options/reveal fields when present.

Builder trust handling:
- Direct roster IDs, positions, and ratings are high-trust.
- Salary is present but unit is unknown by default, so salary advice is limited.
- Missing stats and deferred systems become limitations rather than confident advice.
- Missing roster IDs are preserved for engine data-integrity findings.

### Franchise Inputs

Franchise adapter inputs:
- Franchise-owned team snapshots.
- Franchise-owned players.
- Franchise-owned farm records.
- Canonical franchise identity: `franchiseId`, `seasonId`, `seasonNumber`, and `statsScopeId`.

Franchise trust handling:
- Franchise-owned player/team/farm records are treated as direct evidence.
- Missing season stats produce lower trust and limitations.
- Farm records provide option usage and rating reveal state when available.
- Unknown/damaged status is represented as `UNKNOWN` and excluded from active/farm playable counts.

### Farm Inputs

Farm inputs currently include:
- `playerId`, `teamId`, `seasonId`, `seasonNumber`.
- `rosterStatus`.
- `rosterLevel`.
- `optionsUsed`.
- `optionDates`.
- `ratingRevealState`.

Farm advice trust levels:
- High: direct option usage and roster/farm status data.
- Medium: farm coverage based on positions/ratings when reveal state is partial or when role fit is inferred.
- Low: hidden ratings, missing option state, unavailable farm morale/narrative/offseason systems.

### Missing And Deferred Data

The analyzer intentionally reports missing/deferred data instead of filling in false certainty:
- Missing active/farm player records become data-integrity findings.
- Missing season/performance stats become limitations.
- Hidden farm ratings reduce confidence.
- Missing option state produces low-trust option-risk limitations.
- Fan morale, adaptive standards, farm narrative, and offseason execution remain unavailable inputs.

## 4. Known Limitations And Polish Debt

Known limitations after F1-F4:

1. Damaged farm-record mismatch warnings are not yet a distinct analyzer finding.
   - The franchise adapter preserves missing farm player IDs for data-integrity findings, but richer mismatch categories like “farm record exists for player with non-FARM status” are still better covered by roster lock validation than analyzer UI.

2. UI is intentionally minimal.
   - Builder and TeamHub panels show counts, trust, top findings, limitations, and a short farm advisory list.
   - They do not show full evidence trails, affected-player drilldowns, or all recommendations.

3. Spreadsheet-derived salary/luxury checks remain advisory only.
   - Salary unit defaults to unknown in adapters, so cap/luxury analysis is non-authoritative.

4. No hard roster validation gate.
   - The analyzer is not a launch blocker, import blocker, Phase 11 lock, or offseason finalization gate.

5. No mutation-capable recommendations.
   - Recommendations intentionally avoid executable payloads.
   - They say “review,” “monitor,” or “evaluate,” not “call up” / “send down” as commands.

6. Farm flavor is not active.
   - Morale, relationships, reporter warnings, farm development flavor, and narrative hooks remain out of analyzer trust scope.

7. Season stats are not deeply integrated into roster advice yet.
   - Current reports mostly lean on roster structure, ratings, role/position, option state, and availability.

8. Full evidence UI is future polish.
   - Engine findings include evidence, but current panels only surface high-level summaries.

## 5. Tests And Confidence

Key focused tests:

- Pure engine MVP and F4 farm advice:
  - `src/engines/__tests__/rosterAnalyzerEngine.test.ts`
  - Covers balanced rosters, missing positions/roles, top-heavy advisories, no-mutation behavior, missing data limitations, farm coverage for active gaps, option risk, out-of-options, hidden ratings, and deferred farm flavor limitations.

- Builder adapter and Builder UI:
  - `src/utils/tests/rosterAnalyzerBuilderAdapter.test.ts`
  - `src/src_figma/__tests__/leagueBuilder/LeagueBuilderRosters.test.tsx`
  - Covers Builder DTO mapping, excluded/damaged statuses, missing roster IDs, no mutation, league report generation, and read-only Builder panel rendering.

- Franchise adapter and TeamHub UI:
  - `src/utils/tests/rosterAnalyzerFranchiseAdapter.test.ts`
  - `src/src_figma/__tests__/franchiseMode/TeamHubContent.franchiseReads.test.tsx`
  - Covers franchise-owned reads, status matrix mapping, option/reveal mapping, missing active/farm IDs, no writes, and read-only TeamHub panel rendering.

- Focused franchise roster/farm safety regressions:
  - `src/src_figma/__tests__/franchiseMode/franchiseGameTrackerRoster.test.ts`
  - `src/utils/tests/franchiseRosterMovement.test.ts`

Full mutation/execution paths are intentionally absent from analyzer tests because analyzer execution is out of scope. Roster movement writer tests remain separate and should stay separate until an explicitly approved mutation-capable workflow exists.

Remaining test gaps:
- Detailed evidence rendering in UI.
- Cross-team/league franchise analyzer reports.
- Explicit analyzer-level farm-record/player-status mismatch categorization.
- Rich season-stat based recommendation trust thresholds.
- End-to-end UI tests for larger real-world rosters.

## 6. Future Phases

### F5: Polish / Richer Explanations

Recommended future analyzer-only work:
- Expand panel details to show evidence, affected players, and limitations without adding action buttons.
- Add explicit damaged farm-record mismatch categories.
- Add better copy for hidden ratings, option usage, and low-trust farm advice.
- Add configurable presets for Builder import review vs Franchise advisory review.
- Add richer whole-league Builder reports if needed.

### Mutation-Capable Workflows

Mutation-capable analyzer workflows should wait until:
- Durable offseason adapters exist.
- Roster movement UI exists and is explicitly approved.
- Call-up/send-down execution is revalidated immediately before write.
- Transaction logging, farm records, option usage, rating reveal, and rollback semantics are wired through a single safe workflow.
- Phase 11 lock/finalization uses durable roster validators, not analyzer suggestions as write commands.

### Relationship To Phase 11 / Offseason / Career Work

The analyzer can help users inspect roster readiness, but it should not replace:
- Phase 11 roster-lock validation.
- Franchise-owned offseason adapters.
- Career/milestone canonical scoping.
- Durable transition journal and rollback workflows.
- Farm narrative/morale systems.

Analyzer recommendations may eventually feed a review screen, but only after those systems have stable write boundaries.

## 7. Recommended Next Project Step

Return to franchise core/offseason adapter work.

The post-audit roadmap originally recommended read-only roster analyzer planning and implementation only because the franchise data contract had become stable enough to inspect safely. F1-F4 now satisfy that read-only analyzer checkpoint. The next highest-value project step is to resume Wave D work: franchise-owned offseason adapter foundation and the first safe adapter, while keeping analyzer recommendations non-mutating.

Recommended next wave:
- Wave D0/D1: franchise-owned offseason adapter foundation and first safe adapter.

Recommended reasoning level:
- High.

Why:
- The analyzer now exposes advisory roster/farm needs, but it correctly cannot act on them.
- Offseason adapter work is the missing durable execution layer for future franchise roster movement, free agency/draft/retirement/trade surfaces, and any later analyzer-assisted workflow.
- Implementing more analyzer UI before durable adapters risks creating advice the app cannot safely support.

Suggested next prompt:

```text
Recommended reasoning: High

Please implement Wave D0/D1: franchise-owned offseason adapter foundation and the first safe adapter.

Do not add roster analyzer mutations.
Do not add analyzer apply/fix buttons.
Do not execute analyzer recommendations.
Keep the existing roster analyzer read-only.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_IMPLEMENTATION_ROADMAP_POST_AUDIT.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/OFFSEASON_SYSTEM_SPEC.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FARM_SYSTEM_SPEC.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/ROSTER_ANALYZER_F1_F4_CHECKPOINT.md

Goal:
Build the franchise-owned offseason adapter foundation needed for future safe roster/offseason execution, without connecting it to analyzer recommendations yet.

Scope:
1. Define adapter boundaries and identity contracts for franchise-owned offseason mutations.
2. Implement the first narrow safe adapter path recommended by the roadmap.
3. Preserve League Builder/template isolation.
4. Preserve existing roster movement writer atomicity and Phase 11 guards.
5. Add focused tests for franchise-owned reads/writes, rollback/failure behavior, and no analyzer execution.

After implementation:
- Run Wave D adapter tests.
- Run roster movement/farm tests.
- Run analyzer F1-F4 tests to confirm read-only behavior remains intact.
- Run npm run build.
```

