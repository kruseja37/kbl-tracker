# Franchise Mode 2 Rebaseline Roadmap

Date: 2026-05-25

Scope: planning only. This document does not implement app code, add UI, continue retirement ceremony work, or implement new offseason mutation systems.

Primary references:

- `spec-docs/FRANCHISE_OFFSEASON_STABILIZATION_CHECKPOINT.md`
- `spec-docs/FRANCHISE_C3_RETIREMENT_CEREMONY_STABILIZATION_CHECKPOINT.md`
- `spec-docs/FRANCHISE_RETIREMENT_CEREMONY_TRANSACTION_METADATA_CHECKPOINT.md`
- `spec-docs/FRANCHISE_IMPLEMENTATION_ROADMAP_POST_AUDIT.md`
- `spec-docs/FRANCHISE_FEATURE_COMPLETION_AUDIT.md`
- `spec-docs/MODE_2_V1_FINAL.md`
- `spec-docs/MODE_2_SECTION_MAP.md`
- `spec-docs/OFFSEASON_SYSTEM_SPEC.md`
- `spec-docs/FARM_SYSTEM_SPEC.md`
- `spec-docs/PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md`
- `spec-docs/AUDIT_PASS_2_GAMEPLAY_EVENT_PIPELINE.md`
- `spec-docs/AUDIT_PASS_3_SEASON_END_OFFSEASON_BOUNDARY.md`
- `spec-docs/AUDIT_PASS_4_FARM_ROSTER_MOVEMENT_BOUNDARY.md`

## 1. Executive Rebaseline

The franchise project should pause retirement ceremony and broader offseason depth for now and re-center the next implementation waves on trustworthy Mode 2 regular-season/playoff runtime.

The offseason stack is much healthier than it was at the first post-audit checkpoint. D2 ratings/salary is mutation-capable with confirmation, D3-D6 previews are guarded/read-only, D7 closed a TradeFlow identity fallback, Phase 11 correction primitives and UI exist, R1/R2 retirement execution and UI exist, and C1-B/C2/C3 ceremony planning/preview/confirmation are stable. The latest retirement ceremony metadata enrichment also adds transaction provenance for ceremony-selected retirements, with focused tests passing.

That said, the most valuable next work is not more ceremony polish. Mode 2 v1 franchise trust depends first on regular-season and playoff games being durable across launch, save, reload, resume, end-game aggregation, schedule completion, playoff advancement, and completed-game archive handoff. Offseason polish is useful, but it consumes data produced by Mode 2. The safer order is to harden the game pipeline before adding more post-season decoration.

Current recommendation:

1. Pause retirement ceremony persistence/reroll/flavor.
2. Pause new offseason mutation systems beyond current D2/R1/Phase 11 foundations.
3. Run the next implementation wave on active-game save/load/resume and completion integrity across franchise regular season and franchise playoff games.

## 2. Current State Summary

### Regular Season Gameplay / Event Log / Stat Pipeline

Status: mostly complete, with remaining runtime-confidence gaps.

Repo-backed state:

- `processCompletedGame` is the non-React end-game equivalent and is the production gateway for completed-game processing (`src/utils/processCompletedGame.ts:101`, `src/utils/processCompletedGame.ts:105`).
- `useGameState` now carries canonical identity through refs and restored state for `statsScopeId`, `scheduleGameId`, `playoffId`, and related playoff context (`src/src_figma/hooks/useGameState.ts:2458`, `src/src_figma/hooks/useGameState.ts:2464`, `src/src_figma/hooks/useGameState.ts:2497`).
- Live/current-game snapshots include canonical identity and are restored through snapshot and durable-log paths (`src/src_figma/hooks/useGameState.ts:4426`, `src/src_figma/hooks/useGameState.ts:4614`, `src/src_figma/hooks/useGameState.ts:5051`, `src/src_figma/hooks/useGameState.ts:5724`).
- End-game processing passes season, stats, schedule, and playoff context into completed-game processing and incomplete diagnostic archive fallback (`src/src_figma/hooks/useGameState.ts:11106`, `src/src_figma/hooks/useGameState.ts:11118`, `src/src_figma/hooks/useGameState.ts:11135`, `src/src_figma/hooks/useGameState.ts:11180`, `src/src_figma/hooks/useGameState.ts:11203`).
- Completed-game records support `statsScopeId`, `scheduleGameId`, `playoffId`, and `aggregationStatus`, and normal queries exclude incomplete records by default (`src/utils/gameStorage.ts:600`, `src/utils/gameStorage.ts:752`, `src/utils/gameStorage.ts:760`, `src/utils/gameStorage.ts:767`, `src/utils/gameStorage.ts:788`, `src/utils/gameStorage.ts:896`).
- Pass 2B documents the accepted v1 architecture: keep snapshot-derived production aggregation while using replay audit as the bridge toward event-derived proof (`spec-docs/PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md:18`, `spec-docs/PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md:22`).

Remaining planning risk:

- Snapshot-derived production aggregation remains accepted v1 behavior, but it is still a confidence risk for deeper awards, WAR, WPA/clutch, and fWAR-dependent systems.
- Active-game resume/replay is broad and important enough to deserve its own hardening wave before more downstream feature work.

### Playoff Scope / Storage / Reporting

Status: mostly complete, with lifecycle edge cases worth hardening.

Repo-backed state:

- Playoff storage separates `sourceType: "franchise"` from `sourceType: "elimination"` and includes `franchiseId`, `seasonId`, and `seasonNumber` (`src/utils/playoffStorage.ts:41`, `src/utils/playoffStorage.ts:68`).
- Franchise reads use `getPlayoffByFranchiseSeason` with franchise and season identity (`src/utils/playoffStorage.ts:583`, `src/src_figma/hooks/usePlayoffData.ts:237`).
- Franchise playoff aggregation now validates franchise, canonical season, stats scope, and season number before aggregating (`src/utils/playoffStorage.ts:1271`, `src/utils/playoffStorage.ts:1296`, `src/utils/playoffStorage.ts:1304`, `src/utils/playoffStorage.ts:1311`).
- Playoff fielding scope uses franchise playoff competition identity (`src/utils/playoffStorage.ts:262`, `src/utils/playoffStorage.ts:272`, `src/utils/playoffStorage.ts:274`).
- FranchiseHome playoff launch passes franchise, season, stats, competition, and playoff identity into GameTracker launch state (`src/src_figma/app/pages/FranchiseHome.tsx:907`, `src/src_figma/app/pages/FranchiseHome.tsx:909`, `src/src_figma/app/pages/FranchiseHome.tsx:910`, `src/src_figma/app/pages/FranchiseHome.tsx:912`).

Remaining planning risk:

- Storage scope is strong, but playoff series/game lifecycle still deserves an end-to-end hardening pass: launch identity, resume identity, aggregation idempotency, bracket advancement, and completed-game/archive linkage should be proven together.

### Season-End / Offseason Handoff

Status: mostly complete.

Repo-backed state:

- SeasonSummary reads canonical franchise route season identity instead of global `kbl-current-season` and loads persisted summaries by canonical `seasonId` (`src/src_figma/app/pages/SeasonSummary.tsx:176`, `src/src_figma/app/pages/SeasonSummary.tsx:199`, `src/src_figma/app/pages/SeasonSummary.tsx:207`).
- Franchise SeasonSummary includes canonical identity, schedule/completed-game refs, standings/stats, playoff refs, offseason identity, and explicit placeholders for deferred systems (`src/utils/franchiseSeasonSummaryStorage.ts:79`, `src/utils/franchiseSeasonSummaryStorage.ts:87`, `src/utils/franchiseSeasonSummaryStorage.ts:115`, `src/utils/franchiseSeasonSummaryStorage.ts:121`).
- Transition orchestration and journals are already stabilized according to the post-audit roadmap and offseason stabilization checkpoint.

Remaining planning risk:

- Season summary contents are only as trustworthy as completed-game aggregation/archive inputs.
- Durable awards/milestones/fan morale/park factor fill-ins remain deferred and should not be treated as blockers for Mode 2 v1 gameplay trust.

### Roster / Farm / Phase 11

Status: partial to mostly complete for boundaries; enough for v1 finalization correction, not a reason to keep expanding offseason now.

Repo-backed state:

- Phase 11 roster lock validator enforces team counts and detects mismatched farm/player state (`src/utils/franchiseRosterLockValidator.ts:131`, `src/utils/franchiseRosterLockValidator.ts:140`, `src/utils/franchiseRosterLockValidator.ts:149`, `src/utils/franchiseRosterLockValidator.ts:218`).
- Phase 11 release/cut and sign/fill primitives require canonical context and reject unsafe statuses or stale farm records (`src/utils/franchisePhase11RosterActions.ts:147`, `src/utils/franchisePhase11RosterActions.ts:153`, `src/utils/franchisePhase11RosterActions.ts:220`, `src/utils/franchisePhase11RosterActions.ts:326`, `src/utils/franchisePhase11RosterActions.ts:368`).
- FinalizeAdvanceFlow exposes a narrow correction UI only when durable lock blocks finalization; copy explicitly says it is not free agency, draft, trade, retirement execution, roster analyzer movement, or generated filler creation (`src/src_figma/app/components/FinalizeAdvanceFlow.tsx:1040`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:1061`, `src/src_figma/app/components/FinalizeAdvanceFlow.tsx:1237`).

Remaining planning risk:

- Roster changes during active regular-season/playoff games need a dedicated snapshot/freeze policy. This matters more immediately than expanding offseason mutation systems.

### D2-D7 Offseason Adapters

Status: stabilized boundaries, not full offseason execution.

Repo-backed state:

- D2 ratings/salary is mutation-capable and scoped to franchise-owned player writes (`src/utils/franchiseRatingsSalaryAdapter.ts:456`).
- D3 retirement now has execution core and UI confirmation through R1/R2, but the full ceremony/flavor layer remains bounded.
- D4 free agency, D5 draft, and D6 trades remain dry-run/read-only adapters with explicit no-execution copy (`src/utils/franchiseFreeAgencyAdapter.ts:459`, `src/utils/franchiseDraftAdapter.ts:355`, `src/utils/franchiseTradeAdapter.ts:556`).
- D7 TradeFlow cleanup prevents missing season number fallback according to the D2-D7 checkpoint lineage.

Remaining planning risk:

- Mutation-capable free agency/draft/trade are still large future systems and should remain deferred until Mode 2 runtime confidence is refreshed.

### R1 / R2 / C1-C3 Retirement Ceremony State

Status: stable enough; not critical for the next Mode 2 v1 trust wave.

Repo-backed state:

- Ceremony planner is pure and no-write (`src/utils/franchiseRetirementCeremony.ts:1`, `src/utils/franchiseRetirementCeremony.ts:374`, `src/utils/franchiseRetirementCeremony.ts:404`).
- RetirementFlow blocks missing franchise identity, loads scoped farm proof, creates local ceremony metadata only after `Use ceremony suggestion`, and calls R1 apply only through explicit selected-player confirmation (`src/src_figma/app/components/RetirementFlow.tsx:225`, `src/src_figma/app/components/RetirementFlow.tsx:373`, `src/src_figma/app/components/RetirementFlow.tsx:421`, `src/src_figma/app/components/RetirementFlow.tsx:505`).
- R1 transaction metadata enrichment validates and sanitizes ceremony provenance before writes (`src/utils/franchiseRetirementAdapter.ts:24`, `src/utils/franchiseRetirementAdapter.ts:448`, `src/utils/franchiseRetirementAdapter.ts:495`, `src/utils/franchiseRetirementAdapter.ts:541`).

Current verification:

- C3 stabilization full suite passed: 314 test files, 6531 tests; build passed (`spec-docs/FRANCHISE_C3_RETIREMENT_CEREMONY_STABILIZATION_CHECKPOINT.md:24`, `spec-docs/FRANCHISE_C3_RETIREMENT_CEREMONY_STABILIZATION_CHECKPOINT.md:36`).
- D2-D7 plus Phase 11 offseason stabilization full suite passed: 313 files, 6474 tests; build passed (`spec-docs/FRANCHISE_OFFSEASON_STABILIZATION_CHECKPOINT.md:24`, `spec-docs/FRANCHISE_OFFSEASON_STABILIZATION_CHECKPOINT.md:36`).
- Retirement ceremony transaction metadata enrichment focused tests passed: retirement adapter 37, component guard 24, ceremony 29 (`spec-docs/FRANCHISE_RETIREMENT_CEREMONY_TRANSACTION_METADATA_CHECKPOINT.md:104`).
- Full suite after metadata enrichment is recommended but not yet documented as completed in the source checkpoint.

## 3. Is Remaining Retirement Ceremony Work Critical?

Recommendation: pause retirement ceremony work now.

| Remaining ceremony work | Classification | Rationale |
|---|---|---|
| Ceremony result persistence | Important later | Useful for audit/recovery/history, but not required for a trustworthy Mode 2 regular-season/playoff loop. It would add a new durable domain and manifest/export/delete concerns. |
| Reroll design | Optional polish / important later if persistence starts | Not required for v1 trust. It should wait until there is a policy decision on whether ceremony reveals become durable history. |
| Jersey retirement | Optional polish | Flavor/history layer. It can build on retirement transactions later and should not precede game runtime hardening. |
| Narrative/news/milestones | Important later | Valuable long-term, but derived/flavor scope was intentionally deferred or placeholder-heavy. It depends on stable season stats, milestones, and story identity. |
| Replacement systems | Important later | More structural than flavor, but belongs with offseason roster/depth systems and should follow runtime/roster trust work. |

Decision: stop ceremony work after the metadata checkpoint unless a direct regression appears. It is good enough for current offseason depth; the next wave should protect Mode 2 gameplay data production.

## 4. Remaining Mode 2 Regular-Season / Playoff Risks

### GameTracker Franchise Runtime Transactionality

Risk: high value, medium risk.

Why it matters:

- GameTracker is the source of record for played games. If save/load/resume or completion side effects are inconsistent, every downstream standings, leaders, playoff, summary, and offseason system inherits bad data.

Repo evidence:

- Live snapshot persistence includes canonical identity (`src/src_figma/hooks/useGameState.ts:5724`, `src/src_figma/hooks/useGameState.ts:5942`, `src/src_figma/hooks/useGameState.ts:5947`, `src/src_figma/hooks/useGameState.ts:5950`).
- Snapshot and durable-log restore both set canonical identity refs (`src/src_figma/hooks/useGameState.ts:4614`, `src/src_figma/hooks/useGameState.ts:4681`, `src/src_figma/hooks/useGameState.ts:5051`, `src/src_figma/hooks/useGameState.ts:5057`, `src/src_figma/hooks/useGameState.ts:5640`, `src/src_figma/hooks/useGameState.ts:5646`).
- End-game completion spans processing, mark aggregated, diagnostic archive fallback, schedule completion, and playoff aggregation (`src/src_figma/hooks/useGameState.ts:11106`, `src/src_figma/hooks/useGameState.ts:11151`, `src/src_figma/hooks/useGameState.ts:11180`, `src/src_figma/hooks/useGameState.ts:11350`).

Planning concern:

- The code has the right ingredients, but the end-to-end active-game lifecycle should be proven together for franchise regular-season and franchise playoff games: start, snapshot save, reload/resume, additional event, end game, archive, schedule/playoff completion, and duplicate-completion/idempotency protection.

### Event-Log Replay / Audit Gaps

Risk: medium-high.

Why it matters:

- Pass 2B accepts snapshot-derived production aggregation for v1, but replay audit is the bridge that prevents silent drift.

Repo evidence:

- `gameReplayAudit.ts` reports unsupported rows and mismatches instead of mutating production stats (`src/utils/gameReplayAudit.ts:417`, `src/utils/gameReplayAudit.ts:607`, `src/utils/gameReplayAudit.ts:777`, `src/utils/gameReplayAudit.ts:1262`).
- It explicitly audits missing identity fields including `statsScopeId`, `scheduleGameId`, and `playoffId` (`src/utils/gameReplayAudit.ts:1000`, `src/utils/gameReplayAudit.ts:1004`, `src/utils/gameReplayAudit.ts:1005`).

Planning concern:

- Replay audit expansion should target parity gaps that affect awards/leaders/summary trust, not replace production aggregation yet.

### Playoff Game Identity And Aggregation

Risk: medium-high.

Why it matters:

- Franchise playoff games look like normal GameTracker games plus bracket state. They need canonical identity all the way through launch, resume, archive, stat aggregation, series advancement, and reporter/almanac contexts.

Repo evidence:

- Franchise playoff aggregation validates identity (`src/utils/playoffStorage.ts:1271`, `src/utils/playoffStorage.ts:1296`, `src/utils/playoffStorage.ts:1304`, `src/utils/playoffStorage.ts:1311`).
- FranchiseHome passes playoff launch context to GameTracker (`src/src_figma/app/pages/FranchiseHome.tsx:907`, `src/src_figma/app/pages/FranchiseHome.tsx:912`).

Planning concern:

- Storage validation is strong, but series/game lifecycle needs an end-to-end test wave alongside active-game resume.

### Schedule / Completed-Game / Archive Integrity

Risk: high.

Why it matters:

- Completed-game records feed standings, season stats, leaders, summary handoff, and playoff/offseason state.

Repo evidence:

- Completed-game records carry `aggregationStatus` and incomplete records are excluded from normal queries (`src/utils/gameStorage.ts:788`, `src/utils/gameStorage.ts:896`, `src/utils/gameStorage.ts:983`).
- FranchiseHome regular-season launch and manual processing paths call into schedule/completed-game flows with canonical season IDs (`src/src_figma/app/pages/FranchiseHome.tsx:3022`, `src/src_figma/app/pages/FranchiseHome.tsx:3248`, `src/src_figma/app/pages/FranchiseHome.tsx:3300`).

Planning concern:

- The next wave should explicitly test no duplicate archive, no duplicate schedule completion, and no playoff advancement after failed/incomplete processing.

### Stats, Awards, Leaders, Clutch/WPA, fWAR-Adjacent Gaps

Risk: medium.

Why it matters:

- These are visible and important, but most are downstream of completed-game reliability.

Repo/spec state:

- Mode 2 keeps stats pipeline, WAR, WPA, clutch, and fielding in v1 or simplified v1 (`spec-docs/MODE_2_SECTION_MAP.md:103`, `spec-docs/MODE_2_SECTION_MAP.md:144`, `spec-docs/MODE_2_SECTION_MAP.md:151`, `spec-docs/MODE_2_SECTION_MAP.md:167`).
- Pass 2B says full production replay replacement should remain deferred while the replay audit layer expands (`spec-docs/PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md:18`).

Planning concern:

- Do not make awards/leaders the next wave until the active-game lifecycle is tested. Awards/leaders correctness becomes the wave after runtime integrity.

### Save / Load / Resume During Active Franchise Games

Risk: high.

Why it matters:

- A user may close/reload mid-game. Losing canonical identity, roster snapshots, event rows, or schedule/playoff context makes the franchise loop untrustworthy.

Repo evidence:

- `restoreState` and snapshot replay restore player/pitcher stats and competition context (`src/src_figma/hooks/useGameState.ts:12234`, `src/src_figma/hooks/useGameState.ts:12363`).
- The durable replay path restores context from in-progress game rows (`src/src_figma/hooks/useGameState.ts:5051`, `src/src_figma/hooks/useGameState.ts:5077`, `src/src_figma/hooks/useGameState.ts:5627`).

Planning concern:

- This is the best next implementation target because it protects both regular-season and playoff v1 trust.

### Roster Changes While Games Are Active

Risk: medium-high.

Why it matters:

- Roster/farm movement is now real enough that the app needs a policy for active game roster snapshots. In-progress games should probably remain tied to their launch roster snapshot rather than silently changing under the game.

Repo evidence:

- GameTracker launch builds franchise rosters from franchise-owned active MLB players (`src/src_figma/app/pages/FranchiseHome.tsx:2973`, `src/src_figma/app/pages/FranchiseHome.tsx:3154`).
- Phase 11 and roster actions can now mutate franchise player/farm state, but active-game roster snapshot policy is not the same thing as offseason correction.

Planning concern:

- Include an active-game roster snapshot invariant in the active-game hardening wave: roster changes after launch must not mutate the in-progress game's lineup/roster snapshot.

### Injury / Fatigue / Mojo Systems

Risk: medium.

Why it matters:

- Mojo/fitness/injury can influence visible gameplay/stat/flavor results if active. They must not run automatic franchise finalization resets or mutate unsupported durable history.

Spec state:

- Mode 2 keeps simplified mojo/fitness user-observed behavior and injury tracking (`spec-docs/MODE_2_SECTION_MAP.md:1797`, `spec-docs/MODE_2_SECTION_MAP.md:1872`).
- Previous audits accepted no automatic franchise finalization mojo reset as a v1 boundary.

Planning concern:

- Not the next implementation wave unless active-game resume tests expose mojo/fitness restore drift.

### Multi-Franchise Isolation

Risk: medium.

Why it matters:

- Same season number across two franchises must never collide in current games, events, completed games, playoffs, summaries, transactions, or offseason state.

Repo evidence:

- Shared stores rely on scoped-global identity, and per-franchise teams/players live in dynamic franchise DBs as documented by the post-audit roadmap.
- Completed-game and replay audit identity includes `franchiseId`, `seasonId`, and `statsScopeId` (`src/utils/gameStorage.ts:752`, `src/utils/gameReplayAudit.ts:1041`).

Planning concern:

- The next wave should include at least one two-franchise same-season active-game resume/completion test.

### Reporter / Almanac Playoff And Season Narrative Identity

Risk: medium-low.

Why it matters:

- Narrative is visible, but should not outrank game runtime integrity.

Repo evidence:

- FranchiseHome uses scoped reporter/news context (`src/src_figma/app/pages/FranchiseHome.tsx:1262`).
- Prior Pass 5 work preserved franchise playoff reporter/news identity instead of downcasting to elimination.

Planning concern:

- Keep reporter/almanac identity assertions as focused regression coverage when playoff lifecycle is hardened. Do not expand narrative content now.

## 5. Ranked Next Implementation Candidates

| Candidate | Value | Risk | Dependencies | Blocks trustworthy Mode 2 v1? | Recommended reasoning |
|---|---|---|---|---|---|
| Mode 2 active-game resume/save/load hardening | Very high | Medium-high | `useGameState`, `gameStorage`, event log identity, GameTracker launch state, schedule/playoff completion | Yes | High |
| Playoff series/game lifecycle hardening | High | Medium-high | Active-game identity, `playoffStorage`, GameTracker playoff launch/end-game, bracket advancement | Yes, especially postseason trust | High |
| Replay audit expansion into stat parity gaps | High | Medium | Existing `gameReplayAudit`, golden fixtures, event row completeness | Yes for stat-derived trust, but after active-game lifecycle | High |
| Awards/leaders/season summary correctness | Medium-high | Medium | Completed-game integrity, season stats, summary snapshots, replay audit confidence | Partially; visible trust but downstream | Medium-high |
| Roster movement during regular season/playoffs | Medium-high | Medium-high | Roster movement writers, launch roster snapshots, active-game freeze policy | Partially; needed before broad roster UI/analyzer | High |
| Injury/fatigue/mojo franchise safety | Medium | Medium | GameTracker restore, mojo/fitness storage, finalization boundaries | Not unless active-game restore drift is found | Medium |
| Retirement ceremony persistence/reroll/flavor | Low for Mode 2 runtime | High | Ceremony metadata, new persistence domain, manifest lifecycle | No | High to Extra High |
| Free agency/draft/trade execution | Medium long-term | Extra High | Offseason adapter designs, roster movement, transactions, rollback, generated pools | No for Mode 2 regular season/playoffs | Extra High |

## 6. Revised Roadmap

### Wave M2-1: Active-Game Save/Load/Resume And Completion Integrity

Purpose:

- Prove and harden the active franchise game lifecycle from launch through resume and completion for both regular-season and playoff games.

Scope:

- Franchise regular-season GameTracker launch, snapshot save, reload/restore, event after restore, end-game processing, schedule completion, completed-game archive, and season aggregation success boundary.
- Franchise playoff GameTracker launch, snapshot save, reload/restore, event after restore, end-game processing, playoff stat aggregation, and series/game advancement boundary.
- Two-franchise same-season isolation for active current-game snapshots and completed-game archive.
- Roster snapshot invariant: roster/farm changes after game launch must not mutate the in-progress game roster snapshot.
- Idempotency guard: no duplicate schedule completion, archive, aggregation, or playoff advancement from repeat end-game calls/resume confusion.
- Diagnostic behavior: failed aggregation or incomplete archive must block schedule/playoff advancement.

Out of scope:

- Production replay aggregation replacement.
- New awards/leaders formulas.
- Retirement ceremony persistence/reroll/flavor.
- Free agency/draft/trade execution.
- New offseason mutation systems.

Likely files:

- `src/src_figma/hooks/useGameState.ts`
- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/app/pages/FranchiseHome.tsx`
- `src/utils/gameStorage.ts`
- `src/utils/eventLog.ts`
- `src/utils/processCompletedGame.ts`
- `src/utils/playoffStorage.ts`
- `src/utils/scheduleStorage.ts`
- Existing GameTracker/franchise focused tests under `src/src_figma/__tests__/gameTracker` and `src/src_figma/__tests__/franchiseMode`.

Gate tests:

- Focused regular-season resume/completion test.
- Focused playoff resume/completion/advancement test.
- Two-franchise same-season active-game isolation test.
- Failed aggregation after resume blocks schedule/playoff advancement.
- Roster snapshot remains stable if franchise roster storage changes while a game is in progress.
- Run existing Pass 2/GameTracker focused suites.

Recommended reasoning level: High.

### Wave M2-2: Playoff Series/Game Lifecycle Hardening

Purpose:

- Make franchise playoff series/game progression feel as trustworthy as regular-season schedule progression.

Scope:

- Bracket lifecycle around start playoffs, launch game, complete game, advance series, winner/loser recording, playoff stat aggregation, playoff reporting identity, and SeasonSummary playoff refs.
- Explicit franchise vs elimination regression tests.
- Reporter/almanac playoff identity assertions for franchise playoff games.

Out of scope:

- New playoff format features.
- Narrative content expansion.
- Offseason algorithms.

Gate tests:

- Wrong-mode and wrong-season playoff records rejected.
- Franchise playoff completion cannot advance elimination bracket.
- Elimination playoff completion cannot affect franchise bracket.
- Repeat completion/resume cannot double-advance series.

Recommended reasoning level: High.

### Wave M2-3: Replay Audit Expansion For Stat Parity Gaps

Purpose:

- Extend the non-mutating replay audit bridge so stats, leaders, awards, WAR, WPA/clutch, fWAR-adjacent fielding, and season summaries can be trusted with explicit confidence.

Scope:

- Golden fixtures for regular-season and playoff franchise games.
- Special plays: D3K, error with RBI suppression, FC, DP/TP, SF/SAC, force/no-run timing, WP/PB, SB/CS, pickoff/defensive indifference where supported.
- Fielding fixture for errors/chances/double plays/star plays/web gems.
- Pitcher decisions fixture for starter/win/loss/save/hold/blown save/inherited runners.
- Explicit unsupported/limited rows remain reported honestly.

Out of scope:

- Replacing production aggregation with event-sourced reducer.
- New formulas unless required to expose existing parity gaps.

Gate tests:

- Replay audit reports no unexpected mismatch for supported fixture rows.
- Unsupported/limited rows are structured and actionable.
- Existing snapshot-derived aggregation behavior remains unchanged.

Recommended reasoning level: High.

## 7. What To Stop Doing For Now

Stop or pause:

- Retirement ceremony persistence.
- Retirement ceremony reroll design.
- Jersey retirement implementation.
- Narrative/news/milestone ceremony layers.
- Replacement player systems.
- Free agency execution.
- Draft execution.
- Trade execution.
- Generated/external filler pools.
- Import-write implementation.
- Roster analyzer mutations.

Keep only as maintenance:

- Fix direct regressions in D2/R1/Phase 11 if tests fail.
- Keep checkpoint docs current when verification is run.

## 8. Deferred But Not Forgotten

These remain valuable future work:

- Ceremony persistence and reroll policy.
- Durable awards ceremony results.
- Career/milestone canonical scoping.
- True-value salary model.
- Mutation-capable free agency, draft, and trade.
- Import writes/exact restore/remapped clone.
- Transition journal repair UI.
- Fan morale/adaptive standards/park factors/designations/fame/hall-of-fame persistence.
- Production event-sourced aggregation replacement after replay audit confidence is broad enough.

## 9. Final Recommendation

Pause retirement ceremony work: yes.

Next implementation wave: Wave M2-1, active-game save/load/resume and completion integrity.

Why this comes first:

- It protects the records that every later system consumes.
- It covers both regular season and playoffs.
- It reduces the risk of corrupted schedules, duplicate archives, duplicate playoff advancement, and broken same-season multi-franchise isolation.
- It keeps offseason depth from outrunning the core Mode 2 game source of truth.

Exact next implementation prompt:

```text
Recommended reasoning: High

Please implement Wave M2-1: franchise active-game save/load/resume and completion integrity hardening.

Scope:
- Implement code only for active franchise GameTracker lifecycle hardening.
- Cover regular-season and franchise playoff games.
- Do not continue retirement ceremony work.
- Do not implement ceremony persistence, reroll, jersey retirement, narrative/news/milestones, replacement systems, free agency, draft, trade, generated filler, import writes, or roster analyzer mutations.
- Do not replace production aggregation with event-sourced replay.
- Preserve non-franchise/exhibition/elimination behavior.

Use:
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/FRANCHISE_MODE_2_REBASELINE_ROADMAP.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md
- /Users/johnkruse/Projects/kbl-tracker/spec-docs/AUDIT_PASS_2_GAMEPLAY_EVENT_PIPELINE.md
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/hooks/useGameState.ts
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/pages/GameTracker.tsx
- /Users/johnkruse/Projects/kbl-tracker/src/src_figma/app/pages/FranchiseHome.tsx
- /Users/johnkruse/Projects/kbl-tracker/src/utils/gameStorage.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/eventLog.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/processCompletedGame.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/playoffStorage.ts
- /Users/johnkruse/Projects/kbl-tracker/src/utils/scheduleStorage.ts

Goals:
1. Prove regular-season franchise GameTracker launch -> snapshot save -> reload/restore -> event after restore -> end game -> completed-game archive -> schedule completion preserves canonical identity:
   - franchiseId
   - seasonId
   - seasonNumber
   - statsScopeId
   - scheduleGameId
2. Prove franchise playoff GameTracker launch -> snapshot save -> reload/restore -> event after restore -> end game -> completed-game archive -> playoff aggregation/advancement preserves:
   - franchiseId
   - seasonId
   - seasonNumber
   - statsScopeId
   - playoffId
   - playoffSeriesId
   - playoffGameNumber
3. Add idempotency guards/tests so repeat completion or resumed completion cannot duplicate archive, schedule completion, aggregation, or playoff advancement.
4. Add a roster snapshot invariant: franchise roster/farm/player storage changes after launch must not mutate the in-progress game roster snapshot.
5. Confirm failed aggregation or incomplete archive still blocks schedule/playoff advancement.
6. Preserve existing non-franchise/global/elimination behavior.

Tests:
- Add focused regular-season franchise resume/completion test.
- Add focused franchise playoff resume/completion/advancement test.
- Add two-franchise same-season active-game isolation test.
- Add failed aggregation after restore blocks schedule/playoff advancement test.
- Add roster snapshot invariant test.
- Run relevant existing GameTracker, franchise launch, playoff storage, and Pass 2 focused tests.

Output:
- Findings/notes from implementation.
- Tests run.
- Confirm whether Wave M2-1 is safe.
```
