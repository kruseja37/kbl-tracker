# Pass 2B Gameplay / Stat Pipeline Plan

Date: 2026-05-21

Scope: planning only. This document does not implement app code, does not start Pass 3, and does not include roster analyzer work.

Sources:
- `spec-docs/AUDIT_PASS_2_GAMEPLAY_EVENT_PIPELINE.md`
- `spec-docs/MODE_2_V1_FINAL.md`
- `spec-docs/MODE_2_SECTION_MAP.md`
- `spec-docs/SPINE_ARCHITECTURE.md`
- Current repo state after Pass 2A

## Executive Decision

Adopt a hybrid Pass 2B strategy:

1. Keep the current snapshot-derived production season aggregation for Mode 2 v1.
2. Add an event-log replay/audit validation layer and golden parity fixtures before Pass 3.
3. Defer a full production replacement with true event-log replay until the audit layer proves parity across the real edge cases.

This is the best near-term balance. The Mode 2 spec requires downstream state to be replayable from event streams (`spec-docs/MODE_2_V1_FINAL.md:68-78`; `spec-docs/SPINE_ARCHITECTURE.md:625-660`), but the current app still aggregates season stats from `PersistedGameState` snapshots (`src/utils/seasonAggregator.ts:92-121`, `src/utils/seasonAggregator.ts:169-205`). Replacing production aggregation immediately would touch the core GameTracker, stat, WAR, fielding, correction, archive, and playoff paths at once. A replay audit harness lets Pass 3 build on checked data while keeping the runtime path stable.

Pass 3 should wait for the Pass 2B blocking subset:
- Event-log to snapshot parity harness for one or more golden franchise games.
- At-bat and between-play completeness fixes that materially affect stats, clutch, pitcher decisions, and replay identity.
- Fielding/fWAR audit fixture if Pass 3 will consume fWAR-driven awards, designations, or summaries.

Pass 3 does not need to wait for a complete production event-sourced aggregation rewrite.

## Current Pass 2A Baseline

Pass 2A closed the highest-risk runtime correctness gaps:

- `processCompletedGame` now throws if `aggregateGameToSeason` returns `success !== true`, so failed season aggregation does not proceed into normal archive/register flow (`src/utils/processCompletedGame.ts:113-146`).
- `useGameState` blocks schedule/playoff advancement when end-game aggregation fails, while preserving a diagnostic archive marked `aggregationStatus: "incomplete"` (`src/src_figma/hooks/useGameState.ts:11091-11213`).
- Normal completed-game queries exclude incomplete archives by default (`src/utils/gameStorage.ts:596-601`, `src/utils/gameStorage.ts:892-904`, `src/utils/gameStorage.ts:962-985`).
- At-bat and between-play event types now include canonical identity fields needed for franchise/playoff replay (`src/utils/eventLog.ts:267-280`, `src/utils/eventLog.ts:504-518`), and GameTracker context snapshots stamp those fields (`src/src_figma/hooks/useGameState.ts:3966-3982`).
- Substitution, position switch, pitcher change, and pitch-count confirmation now persist required between-play ledger rows before visible game-state mutation (`src/src_figma/hooks/useGameState.ts:9201-9221`, `src/src_figma/hooks/useGameState.ts:9531-9558`, `src/src_figma/hooks/useGameState.ts:9864-9928`, `src/src_figma/hooks/useGameState.ts:10224-10339`, `src/src_figma/hooks/useGameState.ts:10355-10439`).
- Franchise playoff aggregation validates franchise, canonical season, stats scope, and season number before aggregating (`src/utils/playoffStorage.ts:1288-1325`), and fielding scope uses `competitionId: playoff.id` for franchise playoff isolation (`src/utils/playoffStorage.ts:261-276`).

What remains is no longer "can the end-game path silently succeed after critical failure?" The remaining question is "are the recorded events complete and authoritative enough to audit or rebuild the stat outputs Mode 3 will consume?"

## 1. Replayability vs Snapshot-Derived Stats

### Spec Requirement

Mode 2 is explicitly event-first:

- Core outcomes are recorded first, enrichment is optional, and core counting stats must be correct from the one-tap outcome alone (`spec-docs/MODE_2_V1_FINAL.md:58-66`).
- Mode 2 has three immutable event streams and all downstream state is derivable from events as a replay guarantee (`spec-docs/MODE_2_V1_FINAL.md:68-78`; `spec-docs/SPINE_ARCHITECTURE.md:625-660`).
- The stats pipeline is described as Event -> Game -> Season -> Career (`spec-docs/MODE_2_V1_FINAL.md:1005-1019`, `spec-docs/MODE_2_V1_FINAL.md:1113-1119`).
- Section map keeps the core event model and stats pipeline in v1 (`spec-docs/MODE_2_SECTION_MAP.md:70-78`, `spec-docs/MODE_2_SECTION_MAP.md:103-112`).

### Repo Reality

The repo has durable event stores and row identity, but production season aggregation still uses final game snapshots:

- `aggregateGameToSeason` takes `PersistedGameState` and aggregates `gameState.playerStats`, `gameState.pitcherGameStats`, and game-state fielding totals (`src/utils/seasonAggregator.ts:92-121`, `src/utils/seasonAggregator.ts:169-205`, `src/utils/seasonAggregator.ts:211-235`).
- Event rows exist and carry rich identity after Pass 2A (`src/utils/eventLog.ts:267-280`, `src/utils/eventLog.ts:504-518`).
- Corrections are audited overwrites, not physical append-only rows. The code explicitly documents `updateAtBatEvent` as `put()` over the same event id with version/edit history (`src/utils/eventLog.ts:1246-1251`, `src/utils/eventLog.ts:1313-1316`).

### Options

#### Option A: Build True Event-Log Replay Now

Pros:
- Most directly satisfies the spec replay guarantee.
- Reduces long-term drift between logs, game snapshots, season stats, and historical summaries.
- Gives Mode 3 a cleaner source for awards, milestones, WAR, fan morale, and narrative.

Cons:
- High blast radius before Pass 3.
- Requires a complete reducer for at-bats, runners, substitutions, pitcher changes, pitch counts, fielding enrichments, corrections, undo markers, playoff identity, and mode isolation.
- Any mismatch could destabilize currently working GameTracker save/end-game behavior.

Effort: high.

Recommendation: do not make this the next wave.

#### Option B: Formalize Snapshot-Derived Aggregation as Acceptable v1

Pros:
- Lowest runtime risk.
- Keeps current green focused tests useful.
- Matches the existing production path.

Cons:
- Leaves the spec replay guarantee mostly aspirational.
- Does not prove corrected/restored/archive game state can be rebuilt.
- Lets event-log gaps remain hidden until Pass 3 consumers rely on season totals.

Effort: low.

Recommendation: insufficient by itself.

#### Option C: Hybrid Snapshot Runtime + Replay Audit/Validation

Pros:
- Keeps the production path stable while adding the missing replay proof.
- Creates a bridge to future production event-sourced aggregation.
- Lets tests expose exactly where events are incomplete without risking every season stat consumer at once.
- Supports Pass 3 by giving season-end/offseason consumers an audited confidence layer.

Cons:
- Temporarily maintains two interpretations: snapshot-derived totals and event-derived audit totals.
- Requires clear divergence reporting so mismatches are not ignored.
- Does not fully satisfy strict physical append-only immutability.

Effort: medium.

Recommendation: adopt this for Pass 2B.

### Hybrid Acceptance Standard

Before Pass 3, Mode 2 should have:

- A replay/audit utility that can load canonical game identity, event rows, fielding rows, between-play rows, and the completed-game snapshot for a franchise game.
- At least one golden franchise game where event-derived totals match snapshot-derived season inputs for batting, pitching, baserunning, runner events, fielding, WPA/clutch inputs, and pitcher decisions.
- A correction fixture showing audited edits either rebuild correctly or are explicitly reported as non-replayable until a later strict append-only model.
- A failure mode that reports mismatches without mutating production stats.

## 2. Remaining Gameplay/Event Gaps

### AtBatEvent Completeness

Status:
- `AtBatEvent` has expanded identity, WPA, LI, enrichment, runner, score, and edit-history fields (`src/utils/eventLog.ts:267-280`, `src/utils/eventLog.ts:372-449`).
- GameTracker context snapshots provide canonical identity (`src/src_figma/hooks/useGameState.ts:3966-3982`).
- One-tap `PlateAppearanceAction` does not currently carry per-at-bat `pitchCount` (`src/src_figma/hooks/useGameState.ts:331-358`), and `commitPlateAppearance` does not pass pitch count into outcome recorders (`src/src_figma/hooks/useGameState.ts:9153-9198`).

Risk:
- Pitcher pitch totals and pitch-count validation remain dependent on between-play/end-inning confirmation rather than per-at-bat observability.
- Event-log replay cannot fully reconstruct pitch counts unless it uses later pitch-count ledger rows or defaults.

Remediation:
- Add optional `pitchCount` to `PlateAppearanceAction`.
- Carry pitch count into AtBatEvent enrichment or top-level pitch fields where the existing recorders already accept defaults.
- Preserve current pitch-count confirmation prompts for outgoing pitchers/end-game totals.

Blocks Pass 3: only if Pass 3 consumers depend on pitch-count achievements, fatigue, pitcher narratives, or pitch-count-based fame. Recommended before Pass 3 because it is narrow and impacts replay quality.

### BetweenPlayEvent Completeness

Status:
- `BetweenPlayEvent` now carries canonical identity (`src/utils/eventLog.ts:504-518`).
- High-risk mutation ordering is improved: substitution, position change, pitcher change, and pitch-count confirmation write the ledger before state mutation (`src/src_figma/hooks/useGameState.ts:9531-9558`, `src/src_figma/hooks/useGameState.ts:9901-9928`, `src/src_figma/hooks/useGameState.ts:10224-10339`, `src/src_figma/hooks/useGameState.ts:10397-10439`).
- Section map keeps substitutions and pitcher changes in v1, while removing/defering double-switch surface (`spec-docs/MODE_2_SECTION_MAP.md:92-101`).

Risk:
- Replay still needs a deterministic reducer for between-play runner events, substitutions, pitcher changes, pitch-count updates, manager moments, and undo/version markers.
- Batting-order swap is in the v1 ruling but needs a specific audit pass if it is visible in the app.

Remediation:
- Add a between-play replay reducer for audit only.
- Include stolen base, caught stealing, wild pitch, passed ball, runner advance, pitcher change, substitution, position change, pitch-count update, and manager-moment rows in the golden fixture.
- Keep double-switch guarded for Mode 2 v1 unless/until the section map changes.

Blocks Pass 3: yes for the golden audit fixture; no for full reducer parity across every edge case.

### Enrichment Timing and Fielding/Positional Enrichment

Status:
- The spec keeps optional enrichment after one-tap recording (`spec-docs/MODE_2_V1_FINAL.md:58-66`) and keeps primary fielding/fWAR v1 behavior (`spec-docs/MODE_2_SECTION_MAP.md:128-140`).
- Fielding record detail and fWAR formulas are still v1 scope (`spec-docs/MODE_2_V1_FINAL.md:1362-1427`, `spec-docs/MODE_2_V1_FINAL.md:1523-1528`).
- Current code writes/updates fielding events and uses playoff fielding scope with canonical competition identity (`src/utils/playoffStorage.ts:261-276`).

Risk:
- Fielding season aggregation is still snapshot-derived. The event rows may be correct, but Pass 3 awards/designations cannot safely trust fWAR outputs without a row-to-total fixture.
- Post-hoc enrichment edits are audited overwrites, so the replay validator must understand current-version rows and edit history.

Remediation:
- Build a fielding golden fixture from persisted `FieldingEvent` rows.
- Assert PO/A/E, double-play chain, error attribution, star-play category, web-gem threshold input, and fWAR run value input.
- Verify a post-hoc enrichment edit replaces the derived fielding row in a way the audit harness can detect.

Blocks Pass 3: yes if Pass 3 will consume Gold Glove, Platinum Glove, Booger Glove, fWAR standings, web gems, or fielding-driven narrative. Otherwise it can be the first post-Pass-3 hardening wave.

### Substitution Validation

Status:
- The highest-risk mutation ordering is fixed.
- Section map keeps validation constraints for v1 substitution flows (`spec-docs/MODE_2_SECTION_MAP.md:92-101`).

Risk:
- There is no single test matrix proving invalid substitutions are rejected across DH/no-DH, pinch hitter, pinch runner, pitcher rows, position changes, batting-order implications, and restored games.
- Batting-order swap is explicitly added by the section map but still needs scope verification.

Remediation:
- Add a substitution validation matrix test.
- Keep it component/hook-level, not full UI.
- Include ledger failure checks already introduced by Pass 2A as a prerequisite.

Blocks Pass 3: partial. Basic season/offseason handoff can proceed without the full matrix, but roster movement/offseason correctness should wait for it.

### Runner Defaults and Special Plays

Status:
- One-tap recording and runner defaults are broad enough for many normal plays.
- The pre-Pass 2A audit already identified D3K, SAC/SF/DP/FC, runner defaults, and special-play coverage as important Pass 2 territory.

Risk:
- Event replay and snapshot stats can diverge in edge cases: dropped third strike, fielder's choice, sacrifice fly/bunt, double/triple play, force/no-run timing, runner advance overrides, wild pitch/passed ball, pickoff, defensive indifference, and errors with RBI suppression.

Remediation:
- Add a special-play golden fixture that compares game snapshot totals and event-derived totals.
- Treat any divergence as a Pass 2B bug unless the behavior is explicitly deferred by the section map.

Blocks Pass 3: yes for D3K/error/DP/SF/FC core counting stat cases.

### Pitcher Decisions and Fielding Edge Cases

Status:
- Pitcher decisions, inherited runners, save/hold logic, and fielding calculators have tests in focused suites.
- Pitch-count confirmation now writes a ledger row before durable pitcher stat mutation (`src/src_figma/hooks/useGameState.ts:10397-10439`).

Risk:
- Decisions are still tied to final snapshot state. Event replay needs to reconstruct pitcher stints, inherited runners, bequeathed runners, blown saves, holds, and game decisions from a mixed at-bat and between-play stream.
- Fielding edge cases can affect earned runs, pitcher decisions, fWAR, and fame.

Remediation:
- Add a pitcher-stint replay audit fixture.
- Include starter exit, inherited runners, blown save/save opportunity, hold candidate, reliever win/loss, and error-driven earned/unearned run case.

Blocks Pass 3: yes if Pass 3 awards/summaries rely on pitcher awards, save/hold leaderboards, pWAR, or milestone/fame outputs.

### LI/WPA/Clutch/mWAR Remaining Risks

Status:
- WPA is stored on at-bat events and is a v1 requirement (`spec-docs/MODE_2_V1_FINAL.md:1669-1675`).
- Clutch is the sum of event WPA by player (`spec-docs/MODE_2_V1_FINAL.md:1680-1698`, `spec-docs/MODE_2_V1_FINAL.md:1790-1803`).
- Existing event updates enforce audited result edits rather than silent result mutation (`src/utils/eventLog.ts:1246-1251`).

Risk:
- D3K and error paths now derive `isClutch` from the same LI threshold used by hit/out/walk paths, with focused high-LI fixtures in `src/src_figma/__tests__/hooks/useGameState.commitPlateAppearance.test.tsx`.
- `seasonAggregator` does not have an explicit event-WPA-to-season-clutch aggregation path (`src/utils/seasonAggregator.ts:108-121`).
- mWAR has engines/tests, but the production season aggregation path is not yet proven to feed manager decision events into season/summary consumers.

Remediation:
- Make `isClutch` uniformly LI-derived for every at-bat event type.
- Add a season clutch audit fixture that sums event WPA by player and compares to the consumer-facing clutch total.
- Add one manager-decision fixture tying manager moment rows to mWAR input.

Blocks Pass 3: yes for clutch leaderboards, awards, MVP/Cy Young/designation logic, narrative, and season summaries.

### Writer Boundary and Immutability Drift

Status:
- Spec and Spine describe append-only immutable streams (`spec-docs/MODE_2_V1_FINAL.md:68-78`; `spec-docs/SPINE_ARCHITECTURE.md:625-660`).
- Repo policy is audited mutation: `updateAtBatEvent` overwrites the same row using `put()` but requires version/edit history for result changes (`src/utils/eventLog.ts:1246-1251`, `src/utils/eventLog.ts:1313-1316`).

Risk:
- This is acceptable if documented as Mode 2 v1 policy, but replay tooling must know that the latest row is the canonical current truth and `editHistory` is the audit trail.
- `logAtBatEvent` and `logBetweenPlayEvent` should eventually reject duplicate event ids unless explicitly entering a correction/update path.

Remediation:
- For Pass 2B, document the replay policy in code near the audit harness.
- Add a duplicate-write guard or test-covered warning path in a later hardening wave.

Blocks Pass 3: no, if the audited mutation policy remains explicit and tests cover correction behavior.

## 3. Pass 2B Remediation Waves

### Pass 2B.1: Replay Audit Harness and Golden Fixture

Why it matters:
- This is the bridge between the spec's replay guarantee and the repo's snapshot aggregation.
- It gives Pass 3 season-end/offseason work a confidence gate without rewriting production aggregation.

Likely files:
- New utility such as `src/utils/gameEventReplayAudit.ts` or `src/utils/gameEventReplayValidator.ts`.
- `src/utils/eventLog.ts`
- `src/utils/gameStorage.ts`
- `src/utils/seasonAggregator.ts`
- `src/src_figma/__tests__/aggregation/...`
- `src/src_figma/__tests__/hooks/useGameState.commitPlateAppearance.test.tsx`
- `src/src_figma/__tests__/hooks/useGameState.betweenPlayLedger.test.tsx`

Dependencies:
- Pass 2A identity stamping and incomplete archive filtering.
- Stable fake IndexedDB setup for event logs and tracker DB.

Tests:
- Golden franchise regular-season game with at-bats, walks, hits, strikeouts, runs, RBI, pitcher stats, runner events, fielding events, and one correction.
- Event-derived totals equal snapshot-derived game totals for the supported subset.
- Mismatches return a structured audit failure and do not mutate season stats.
- Restored/no-navigation canonical identity can locate the same event rows.

Blocks Pass 3:
- Yes. This is the minimum bridge before deeper season/offseason consumers rely on current stats.

### Pass 2B.2: At-Bat Completeness and Special-Play Corrections

Why it matters:
- Replay validation will expose whether one-tap outcomes contain enough data.
- D3K, FC, SF, SH, DP, errors, and pitch counts are high-risk because they affect multiple stat categories.

Likely files:
- `src/src_figma/hooks/useGameState.ts`
- `src/src_figma/app/pages/GameTracker.tsx`
- `src/utils/eventLog.ts`
- `src/src_figma/__tests__/hooks/useGameState.commitPlateAppearance.test.tsx`
- `src/src_figma/__tests__/gameTracker/AtBatButtons.test.tsx`

Dependencies:
- Pass 2B.1 audit result shape, so tests can assert parity.

Tests:
- Optional per-at-bat pitch count records through one-tap commit and can be audited.
- D3K high-LI event derives `isClutch` from LI.
- Error high-LI event derives `isClutch` from LI.
- FC/SF/SH/DP special-play fixture produces the same event-derived and snapshot-derived totals.

Blocks Pass 3:
- Yes for core stat correctness and clutch/WPA consumers.

### Pass 2B.3: Between-Play Replay and Substitution Validation Matrix

Why it matters:
- Between-play events drive runner stats, pitcher stints, position innings, manager moments, and mWAR.
- Pass 2A made writes safer; Pass 2B should prove replay meaning.

Likely files:
- `src/src_figma/hooks/useGameState.ts`
- `src/utils/eventLog.ts`
- `src/src_figma/__tests__/hooks/useGameState.betweenPlayLedger.test.tsx`
- `src/src_figma/__tests__/dataTracking/pitcherDecisions.test.ts`
- `src/src_figma/__tests__/baseballLogic/inheritedRunnerTracker.test.ts`

Dependencies:
- Pass 2B.1 audit harness.

Tests:
- Runner event replay for SB, CS, WP, PB, pickoff, defensive indifference, and manual advance.
- Pitcher change replay reconstructs inherited/bequeathed runners.
- Position change replay reconstructs defensive position at time of fielding event.
- Invalid substitutions are rejected without ledger rows or game-state mutation.

Blocks Pass 3:
- Yes for pitcher decisions, fielding by position, mWAR, and reliable summaries.

### Pass 2B.4: Fielding/fWAR Audit Fixture

Why it matters:
- Fielding and fWAR are v1 kept systems (`spec-docs/MODE_2_SECTION_MAP.md:128-140`; `spec-docs/MODE_2_V1_FINAL.md:1523-1528`).
- Awards and designations will consume these values.

Likely files:
- `src/src_figma/app/utils/fieldingEventExtractor.ts`
- `src/utils/eventLog.ts`
- `src/engines/fwarCalculator.ts`
- `src/utils/playoffStorage.ts`
- `src/src_figma/__tests__/gameTracker/fieldingEventExtractor.test.ts`
- `src/src_figma/__tests__/gameTracker/atBatFieldingSync.test.ts`
- `src/src_figma/__tests__/playoffMode/playoffFieldingScope.test.ts`

Dependencies:
- Event replay/audit harness from Pass 2B.1.
- Current playoff fielding scope guardrails (`src/utils/playoffStorage.ts:261-276`).

Tests:
- Fielding event rows derive PO/A/E totals.
- Double-play chains derive correct started/completed/turned credits.
- Star-play enrichment feeds fWAR input.
- Error enrichment feeds fWAR penalty input.
- Franchise playoff and elimination fielding scopes do not cross.

Blocks Pass 3:
- Yes if Pass 3 includes awards/designations/fWAR summaries. Otherwise it can trail immediately after Pass 3 boundary work.

### Pass 2B.5: Clutch, WPA, mWAR, and Season Consumer Smoke Tests

Why it matters:
- WPA/clutch is v1 kept and feeds players of the game, top moments, awards, narrative, and mWAR (`spec-docs/MODE_2_V1_FINAL.md:1669-1803`).

Likely files:
- `src/engines/clutchCalculator.ts`
- `src/engines/mwarCalculator.ts`
- `src/utils/seasonAggregator.ts`
- `src/src_figma/hooks/useGameState.ts`
- `src/utils/franchiseSeasonSummaryStorage.ts`
- `src/engines/__tests__/wpaV2.test.ts`
- `src/engines/__tests__/wpaRuntimeBoundary.test.ts`
- `src/utils/tests/managerWpaGameState.test.ts`

Dependencies:
- Pass 2B.1 replay audit harness.
- Pass 2B.2 event completeness fixes for D3K/error clutch.

Tests:
- Event-WPA season clutch totals equal consumer-facing clutch totals.
- High-LI D3K/error paths set `isClutch` consistently.
- Manager moments and substitution/pitching decisions feed mWAR inputs.
- Playoff multipliers apply only in canonical playoff scope.

Blocks Pass 3:
- Yes for awards, narrative, and season-summary quality. Not required for basic schedule/standings/offseason handoff identity.

### Pass 2B.6: Writer Boundary Hardening

Why it matters:
- The app has explicit mode/competition identity contracts from Pass 1A, but event writers still need long-term boundary enforcement.
- It reduces the risk of replay audit accidentally reading ambiguous or duplicate rows.

Likely files:
- `src/utils/eventLog.ts`
- `src/utils/modeCompetitionScope.ts` or the existing scope guard module
- `src/utils/gameStorage.ts`
- `src/utils/playoffStorage.ts`
- `src/src_figma/__tests__/gameTracker/atBatOutcomeImmutability.test.ts`
- `src/src_figma/__tests__/gameTracker/betweenPlayEventVersioning.test.ts`
- `src/utils/tests/modeCompetitionScope.test.ts`

Dependencies:
- Current audited mutation policy from Wave 2.

Tests:
- Duplicate event id write is rejected or explicitly routed through correction APIs.
- Franchise event without canonical `seasonId`/`statsScopeId` fails in Mode 2 v1 context.
- Elimination event cannot carry franchise identity.
- Correction updates preserve version/edit history.

Blocks Pass 3:
- No, unless Pass 3 is defined as production-ready save/replay hardening. It should happen before broad beta/prod data migration.

## 4. Full-Suite Test Debt

These are not core Pass 2 gameplay blockers, but they are full-suite credibility blockers.

### Reporter DB Version Expectations

Current tracker DB version is 12 (`src/utils/trackerDb.ts:16-18`) and includes `franchiseSeasonSummaries` as a v12 store (`src/utils/trackerDb.ts:103-113`). Reporter tests still assert version 10:

- `src/src_figma/__tests__/reporter/reporterAlmanacCacheStorage.test.ts:243-259`
- `src/src_figma/__tests__/reporter/reporterVoiceSchema.test.ts:165-170`
- `src/src_figma/__tests__/reporter/reporterVoiceSchema.test.ts:243-248`

Recommendation:
- Fix before Pass 3 if "full Vitest green" is a gate.
- Treat as unrelated cleanup if Pass 3 starts from focused Mode 2 suites only.

Difficulty: low.

### League Builder Query Ambiguity

Tests use broad `getByText` selectors on repeated labels/counts:

- `src/src_figma/__tests__/leagueBuilder/LeagueBuilder.test.tsx:216-228`
- `src/src_figma/__tests__/leagueBuilder/LeagueBuilderLeagues.test.tsx:113-125`
- Several League Builder tests use repeated `getByText` for common labels, counts, and team names under multiple cards/modals.

Recommendation:
- Fix before Pass 3 only if full-suite green is required.
- Prefer role/name selectors, `within(...)`, and scoped containers over broad text queries.

Difficulty: low to medium depending on how many tests fail.

## 5. Recommended Next Implementation Wave

Recommended next wave: Pass 2B.1 plus the smallest Pass 2B.2 fixes needed to make the first replay fixture meaningful.

Why:
- It directly addresses the biggest remaining spec gap: replayability.
- It does not rewrite production aggregation.
- It will tell us, with tests, whether the remaining work is small edge fixes or a deeper reducer problem.

Acceptance criteria:
- A new non-mutating replay/audit utility can load a completed franchise game by canonical identity and compare event-derived totals against the current snapshot-derived game totals.
- At least one golden franchise game covers hits, walks, strikeouts, runs/RBI, pitcher stats, runner movement, fielding rows, canonical identity, and one audited correction.
- Audit mismatches are structured and actionable.
- Current production `aggregateGameToSeason` remains snapshot-derived.
- Existing Pass 1, Waves 1-4, and Pass 2A focused tests remain green.

Out of scope:
- Replacing `aggregateGameToSeason` with production event replay.
- Pass 3 season-end/offseason implementation.
- Roster analyzer or recommendation engine.
- Full offseason adapters.
- Synthetic simulation.
- Strict physical append-only event migration.

Exact implementation prompt:

```text
Please implement Pass 2B.1: non-mutating event-log replay audit and golden parity fixture.

Do not start Pass 3.
Do not add roster analyzer work.
Do not replace production season aggregation yet.
Do not expand offseason systems.
Keep Pass 2B.1 focused on replay validation, not production replay.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/AUDIT_PASS_2_GAMEPLAY_EVENT_PIPELINE.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/MODE_2_V1_FINAL.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/MODE_2_SECTION_MAP.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/SPINE_ARCHITECTURE.md

Goals:
1. Add a non-mutating replay/audit utility that loads at-bat, between-play, fielding, game header, and completed-game snapshot records for a canonical franchise game identity.
2. Derive an initial supported subset of game totals from event rows and compare them to the current PersistedGameState snapshot totals.
3. Return structured parity results and mismatch diagnostics without mutating season stats.
4. Add one golden franchise game fixture covering hits, walks, strikeouts, runs/RBI, pitcher stats, runner movement, fielding rows, canonical identity, and one audited correction.
5. If the fixture exposes a narrow AtBatEvent completeness gap such as optional pitch count or D3K/error clutch derivation, fix only the smallest needed behavior to make the audit meaningful.

Tests:
- Event-derived totals match snapshot-derived totals for the supported golden fixture.
- Canonical franchise season/playoff/schedule identity is required to load scoped rows.
- Audited correction rows are included in the current replay view and edit history is preserved.
- Audit mismatch returns a failure object and does not mutate production season stats.
- Existing Pass 2A focused tests remain green.

After implementation:
- Run the new Pass 2B.1 tests.
- Run the focused Pass 2A test set from AUDIT_PASS_2_GAMEPLAY_EVENT_PIPELINE.md.
- Run prior Pass 1 and Waves 1-4 focused tests if practical.
- Run npm run build.
- Summarize changed files, behavior, test results, and remaining risks.
```

Recommended reasoning: Extra High.

## Pass 2B.1 Implementation Note

Status: implemented as a non-mutating audit harness in `src/utils/gameReplayAudit.ts`, with focused golden parity tests in `src/utils/tests/gameReplayAudit.test.ts`.

The harness currently:

- Loads completed-game snapshots plus at-bat, between-play, and fielding rows by game id through `auditCompletedGameReplayById`.
- Rebuilds a supported game-level stat subset from event rows without writing season stats, completed games, or event logs.
- Compares replay-derived stats against stored snapshot-derived game stats.
- Reports structured `matchedCategories`, `mismatches`, `unsupportedEventTypes`, `missingIdentityFields`, `issues`, `confidence`, and `severity`.
- Covers common v1 flows in fixtures: hits, walks, strikeouts, outs, scoring/RBI, substitutions, pitcher changes, inherited-runner metadata when represented, stolen bases, wild pitches, passed balls as observed non-counting events, pitch-count updates, and fielding putout/error rows.
- Pass 2B.2 fixture expansion also covers fielder's choice, double plays, sacrifice bunts/flies, dropped-third-strike outcomes (`D3K`, `WP_K`, `PB_K`), legacy numeric run attribution, scoring runner-advance limitations, error-run earned-run uncertainty, pickoff vs caught-stealing distinction, wild-pitch/passed-ball strikeout edge rows, double-play pivot assists, outfield assists, robbery totals, web-gem context limits, base-save limits, and clutch/WPA context limits.
- Validates completed-game/archive-level identity for franchise archives and flags damaged franchise records missing `franchiseId`, canonical `seasonId`, `statsScopeId`, or regular-season `scheduleGameId`.

Current unsupported/limited areas are intentionally reported rather than silently treated as correct:

- Numeric legacy `runsScored` values cannot attribute player runs or responsible pitchers.
- Runs on error plays are counted as runs allowed, but earned-run reconstruction is not complete.
- Unsupported between-play event types such as `balk` are reported in `unsupportedEventTypes`.
- Declared-but-limited between-play rows such as `pickoff`, `defensive_indifference`, `runner_advance`, `manager_moment`, and `manager_recommendation` now produce explicit replay issues instead of silent no-ops.
- `base_save` and non-robbery web-gem fielding rows are recognized as fWAR/context inputs and reported as limited replay coverage rather than fully matched fielding stat rows.
- WPA and clutch context are recognized when present on at-bat rows, but the harness does not recompute WPA or clutch classification from base/out/score state.
- Full production season aggregation remains snapshot-derived; the harness is parity/audit infrastructure only.
- Strict physical append-only event replay is still deferred; current correction rows are audited current-state rows with `version`/`editHistory`.

## Should Pass 3 Wait?

Pass 3 should wait for Pass 2B.1 and the blocking subset of Pass 2B.2:

- Wait for the event-log replay/audit harness.
- Wait for at least one golden fixture that proves core batting/pitching/runner/fielding identity parity.
- Wait for narrow fixes exposed by the fixture when they affect core counting stats, WPA/clutch, pitcher decisions, or fielding totals.

Pass 3 does not need to wait for:

- Full production event-log replay replacement.
- Strict append-only physical storage migration.
- Full substitution validation matrix, if Pass 3 is limited to season-end/offseason boundary and does not mutate rosters.
- Full fWAR awards fixture, unless Pass 3 includes awards/designations/fWAR outputs.
- Full-suite unrelated reporter/League Builder test cleanup, unless full-suite green is a required project gate.

## Top 10 Remaining Pass 2 Risks

1. Season aggregation is still production snapshot-derived, not event-log replay-derived (`src/utils/seasonAggregator.ts:92-121`).
2. Golden replay-audit fixtures now exist for supported core at-bat, runner, fielding, identity, and correction paths; remaining coverage gaps are season-level clutch/fWAR parity and full production replay deferral.
3. One-tap action shape does not carry optional per-at-bat pitch count (`src/src_figma/hooks/useGameState.ts:331-358`, `src/src_figma/hooks/useGameState.ts:9153-9198`).
4. D3K/error clutch handling is normalized and fixture-covered at the event row level, but season-level clutch consumers are not yet proven from event WPA.
5. Season clutch totals are not proven to equal event WPA sums (`spec-docs/MODE_2_V1_FINAL.md:1689-1696`, `src/utils/seasonAggregator.ts:108-121`).
6. Fielding/fWAR rows are captured, but fielding season totals and fWAR inputs are not yet proven from persisted fielding rows.
7. Pitcher stint replay from between-play events is not proven for inherited runners, decisions, holds, saves, and blown saves.
8. Substitution validity is not yet covered by a broad matrix across DH/no-DH, pinch roles, pitcher rows, and restored games.
9. Audited overwrite correction policy is explicit, but it remains spec drift from strict physical append-only immutability.
10. Full-suite confidence is limited by stale reporter DB version expectations and League Builder query ambiguity.

## Open Questions

1. For Mode 2 v1, is "snapshot-derived runtime aggregation plus replay audit parity" acceptable as the official implementation stance until a later production replay migration?
2. Should Pass 3 consume awards/designations/fWAR outputs, or should Pass 3 stay limited to season-end/offseason boundary identity and handoff until fielding/fWAR fixtures are complete?
3. Is full Vitest green required before Pass 3, or is focused Mode 2 green enough while reporter/League Builder test debt is cleaned separately?
4. Should audited overwrites remain the v1 correction policy, or do you want a strict append-only correction ledger before production save management?
5. How much pitch-count precision is required for v1: per-at-bat optional capture, pitcher-removal/end-game validation only, or both?
