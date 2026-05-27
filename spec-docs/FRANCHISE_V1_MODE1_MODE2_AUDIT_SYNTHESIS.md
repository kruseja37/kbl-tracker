# Franchise v1 Mode 1/2 Audit Synthesis

**Status:** Consolidated audit synthesis  
**Created:** 2026-05-27  
**Scope:** Mode 1 and Mode 2 v1 implementation readiness.  
**Purpose:** Consolidate the five focused audit threads into a single implementation-readiness picture before code work begins.

This document synthesizes:

- `FRANCHISE_V1_AUDIT_MODE1_HANDOFF_SCHEDULE.md`
- `FRANCHISE_V1_AUDIT_GAMETRACKER_STATS_INTEGRITY.md`
- `FRANCHISE_V1_AUDIT_ROSTER_FARM_TRADE_TRANSACTIONS.md`
- `FRANCHISE_V1_AUDIT_SALARY_DESIGNATIONS_ANALYTICS.md`
- `FRANCHISE_V1_AUDIT_NARRATIVE_MORALE_HISTORY.md`
- `MODE_1_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md`
- `MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md`
- `FRANCHISE_V1_STABILITY_PRINCIPLES_AND_CUT_LIST.md`

No app code or tests are changed by this document.

## 1. Executive summary

The repo has a real Franchise foundation: franchise-owned players/teams exist, Franchise Home exists, GameTracker launch/resume is substantial, completed-game archives and core season aggregation exist, call-up/send-down utilities exist, salary/WPA/WAR/designation engines exist in pieces, and story/commentary surfaces exist.

The repo is not yet v1-stable. The cross-audit blockers are concentrated in six areas:

1. Generated schedule paths still exist despite the hard v1 cut against generated franchise schedules.
2. Regular-season and playoff scopes are not cleanly separated for stats/standings.
3. Completion idempotency is not durable enough across archive, stats, schedule, playoff stats, and playoff advancement.
4. Mode 1 handoff is incomplete for farm records, salary baseline, control metadata, rules/playoff snapshot, stadium/park data, and other required fields.
5. Required v1 mutation systems, especially trades and regular-season roster movement UI, are not executable end to end.
6. Required value/flavor systems, especially dynamic designations, True Value, awards, morale, relationships, franchise history, and narrative random events, have engines or surfaces but lack stable scoped persistence and audit trails.

The best implementation strategy is not feature expansion. It is stabilization in layers: schedule/handoff, competition scope, completion idempotency, roster/farm/trade continuity, salary/value/designation inputs, and only then narrative/random systems that can safely mutate state.

## 2. Cross-audit blockers

### 2.1 Generated franchise schedules must be removed

**Why it blocks v1:** Mode 1 and Mode 2 decisions explicitly reject generated franchise schedules. Current franchise initialization and new-season transition still generate schedules, and existing tests assert this behavior.

**Affected areas:**

- Franchise creation
- New-season transition
- Schedule totals/repair logic
- Schedule tests
- Mode 2 empty/manual schedule startup

**Required outcome:** New franchise seasons start with an empty schedule unless the user supplies reviewed CSV/manual rows. No production franchise path may silently generate schedule rows.

### 2.2 Regular season and playoffs must have clean stat/standings boundaries

**Why it blocks v1:** Playoff games currently appear able to use the same `seasonId`/`statsScopeId` as the regular season and run through regular season aggregation before playoff aggregation. This can pollute regular-season player totals and standings.

**Affected areas:**

- Completed-game archive queries
- `calculateStandings`
- season stat aggregation
- playoff stat aggregation
- leaders/WAR/designations/awards
- SeasonSummary

**Required outcome:** Playoff games never alter regular-season standings or regular-season stat totals. Regular-season and playoff consumers must filter or scope records consistently.

### 2.3 Completion idempotency must become durable

**Why it blocks v1:** Current guards reduce duplicate aggregation risk but do not fully protect crash/retry windows across separate writes. Additive stat aggregation can double-count if a retry occurs after partial completion.

**Affected areas:**

- completed-game archive
- season aggregation
- schedule completion
- playoff stat aggregation
- playoff series result
- next-round creation

**Required outcome:** Completion is step-journaled or contribution-ledgered so retry finishes missing steps without double-counting completed steps.

### 2.4 Mode 1 handoff must become complete and explicit

**Why it blocks v1:** Mode 2 and later systems depend on fields that are missing, implicit, or not proven in the Mode 1 snapshot.

**Missing or unproven handoff fields include:**

- canonical franchise type
- all controlled team ids
- per-team `controlledBy`
- AI/manual score-entry policy
- immutable rules/playoff snapshot
- salary/payroll baseline
- standings/stat baselines
- farm records
- NPC/scouting identities
- explicit schedule policy state
- stadium/park-factor snapshot

**Required outcome:** Franchise setup creates a complete franchise-owned state package that Mode 2 can consume without falling back to League Builder templates or inference.

### 2.5 Farm/trade/roster mutation continuity is not v1-ready

**Why it blocks v1:** Trades and roster movement are required v1 systems, but executable trades do not exist and regular-season transaction UI is disabled. Farm records are real but not initialized from Mode 1 FARM assignments.

**Affected areas:**

- trade execution
- call-up/send-down reachability
- farm record creation/repair
- transaction logs
- GameTracker availability
- future stats/storylines/designations after trades
- season handoff

**Required outcome:** User-driven roster mutations are executable, scoped, logged, rollback-aware where needed, and reflected in GameTracker and downstream displays.

### 2.6 Required value systems are not yet stable enough for designations/awards

**Why it blocks v1:** Dynamic designations are required, salary is required, and awards are a v1 goal. But True Value is placeholder, designation storage is deferred, WAR trust is conditional, and adaptive/park consumers are not proven.

**Affected areas:**

- salary/value
- True Value
- Fan Favorite/Albatross
- MVP/Ace
- Captain/Fan Hopeful
- awards/watchlists
- WAR/WPA input decisions
- park-adjusted labels
- season-summary derived fields

**Required outcome:** Value inputs are frozen, scoped, versioned, persisted, and labeled before designations/awards are treated as complete v1 outputs.

### 2.7 Narrative/morale/relationship/history systems cannot mutate canonical state yet

**Why it blocks flavor-system activation:** The repo has story surfaces, but no generalized narrative/random event ledger. Fan morale, player morale, relationships, chemistry, franchise firsts/leaders, and formal awards are not durable enough to drive state changes.

**Required outcome:** Story-only surfaces can stay. Any canonical state change from narrative/random systems must be logged, confirmable, scoped, and repairable.

## 3. Ordered implementation slices

### Slice 1: Schedule policy cutover

**Goal:** Remove generated franchise schedules from v1 paths.

**Work:**

- Remove/disable generated schedules during franchise creation.
- Remove/disable generated schedules during new-season transition.
- Preserve season metadata without inferred generated schedule totals.
- Update tests that currently expect generated schedules.
- Confirm empty schedule startup.
- Keep manual schedule add/delete working.

**Acceptance gate:**

- New franchise with no uploaded schedule creates zero schedule rows.
- No franchise v1 path calls schedule generation.
- Franchise Home handles empty schedule state without breaking standings/playoff readiness.

### Slice 2: Mode 1 handoff contract

**Goal:** Make the franchise setup snapshot complete and explicit.

**Work:**

- Add/verify canonical franchise type and all controlled teams.
- Stamp per-team `controlledBy`.
- Store AI/manual score-entry policy as metadata only.
- Persist immutable rules/playoff snapshot.
- Persist stadium/park-factor inputs or snapshot.
- Initialize salary/payroll baseline at roster finalization.
- Initialize explicit standings/stat baselines if required by downstream consumers.
- Initialize NPC/scouting identities if in v1 contract.
- Hide/remove DH from franchise v1 setup and launch paths if the v1 cut is confirmed.

**Acceptance gate:**

- Mode 2 can load every approved setup field from franchise-owned state.
- Editing or deleting League Builder templates after franchise creation does not alter the active franchise.

### Slice 3: Farm baseline and roster validation

**Goal:** Make `22 MLB + 10 FARM` and farm records real at Mode 2 start.

**Work:**

- Validate 22 MLB and 10 FARM per team at handoff or provide approved blocking/repair UX.
- Create `franchiseFarmRecords` for copied FARM assignments.
- Preserve hidden/revealed rating state and option data.
- Add repair/report path for FARM status without record and record without FARM status.
- Decide prospect draft versus temporary farm-assignment fallback.

**Acceptance gate:**

- Every FARM-assigned player has a matching scoped farm record.
- GameTracker launch excludes FARM players.
- Farm lock/Phase 11 validators do not fail because setup omitted farm records.

### Slice 4: Competition-aware stats and standings boundary

**Goal:** Prevent playoff games from altering regular-season results.

**Work:**

- Choose and implement one boundary strategy:
  - separate postseason `statsScopeId`, or
  - shared season id with strict `competitionType` filtering.
- Apply consistently to standings, leaders, season stats, playoff stats, archives, summaries, WAR/designations/awards consumers.
- Ensure SeasonSummary separates regular-season and playoff outputs.

**Acceptance gate:**

- Playoff completion changes playoff stats/series only.
- Regular-season standings and regular-season player totals remain unchanged after playoff games.

### Slice 5: Completion journal and idempotency

**Goal:** Make completion retry-safe.

**Work:**

- Add durable per-game completion journal or contribution ledger.
- Track archive, season aggregation, schedule completion, playoff stat aggregation, series game recording, and next-round creation.
- Retry missing steps without reapplying completed additive steps.
- Add repair state for schedule completion failure after successful archive/stats.

**Acceptance gate:**

- Refresh/retry/double-click completion cannot duplicate stats, archives, schedule completion, playoff stats, series wins, or next-round series.

### Slice 6: Regular-season roster movement surface

**Goal:** Expose existing call-up/send-down utilities safely.

**Work:**

- Add guarded roster management UI for call-up/send-down.
- Show roster counts, eligibility, options, farm record state, and GameTracker launch readiness.
- Require manual-sync acknowledgement where SMB4 console changes are needed.
- Show transaction history.
- Keep injury-list behavior explicit: either GameTracker-only or roster-affecting with `injury_list` transaction.

**Acceptance gate:**

- Call-up/send-down is scoped, logged, reflected in farm records, and visible to future GameTracker launches.

### Slice 7: Trade-aware stat model

**Goal:** Prevent traded players from getting stuck on old teams in season outputs.

**Work:**

- Choose trade stat representation before enabling trades:
  - team-stint rows, or
  - player total row plus team-stint contribution rows.
- Update leaderboards/team pages/storyline context to use current team for future context and historical team for archived games.
- Verify completed game archives preserve historical team context.

**Recommended default:** Hybrid player total + team-stint contribution rows if feasible; otherwise team-stint rows.

**Acceptance gate:**

- A traded player's future games count for the new team while prior games remain historically tied to the old team.

### Slice 8: User-driven trade execution

**Goal:** Implement v1 trades without AI or salary matching.

**Work:**

- Create one canonical trade command.
- Move MLB and FARM players between teams.
- Transfer/create/delete farm records as needed.
- Mark lineup snapshots stale for both teams.
- Log one canonical `trade` transaction with before/after state.
- Roll back on failure.
- Preserve player identity, history, storylines, designations, and future team context.

**Acceptance gate:**

- Trades mutate rosters/farm records exactly once, log complete provenance, and future GameTracker launches use new assignments.

### Slice 9: Salary and True Value

**Goal:** Make salary/value safe enough for designations and awards.

**Work:**

- Prove/add Mode 1 salary initialization using the approved salary model.
- Exclude luxury tax entirely.
- Implement franchise-owned True Value and value delta.
- Replace Team Hub placeholders with labeled values only after inputs are trusted.
- Decide how WPA augments value/designation inputs, if at all.

**Acceptance gate:**

- Salary and value outputs are scoped, deterministic, labeled, and usable by approved downstream systems.

### Slice 10: Dynamic designation foundation

**Goal:** Make required v1 designations durable and explainable.

**Work:**

- Add canonical franchise designation storage.
- Support projected and locked status.
- Version/source input records.
- Fix Fan Favorite/Albatross spec drift, including 15% Albatross value rule.
- Implement MVP/Ace/Fan Favorite/Albatross first.
- Add Captain/Fan Hopeful only after hidden-modifier/farm input contracts are stable.

**Acceptance gate:**

- Designations survive reload, are franchise/season scoped, and show source inputs/calculation version.

### Slice 11: WPA/WAR/adaptive/park trust pass

**Goal:** Make analytics labels truthful.

**Work:**

- Keep player WPA, manager WPA, LI, Clutch, and Manager Moments distinct from WAR.
- Remove or relabel old `mWAR` wording unless a new metric is defined.
- Audit bWAR/pWAR/fWAR/rWAR component trust.
- Expand/align ParkFactors type and seed metadata where needed.
- Apply season length/innings/sample-size/park scaling consumer by consumer.
- Clearly label unadjusted, seed, calculated, blended, preview, and park-adjusted values.

**Acceptance gate:**

- No UI or summary overclaims analytics precision.

### Slice 12: Narrative/random event safety baseline

**Goal:** Allow story without hidden corruption.

**Work:**

- Add a franchise-scoped narrative/random event ledger before enabling state-changing event effects.
- Support story-only, suggested-change, and required-manual-sync statuses.
- Persist seed/roll or deterministic selector, eligibility reason, proposed changes, user decision, and transaction references.
- Keep fan morale, player morale, relationships, chemistry, awards, and milestones from mutating state until their own stores are durable.

**Acceptance gate:**

- Story-only events can auto-log; canonical state changes require confirmation, transaction, or pending manual-sync status.

### Slice 13: Milestones, awards, and season-summary derived outputs

**Goal:** Stop placeholders from being consumed as completed systems.

**Work:**

- Implement or hide franchise first/leader storage claims.
- Replace award proxy candidate logic with scoped season stats/WPA/Manager Value.
- Add short-season eligibility/sample-size rules.
- Keep SeasonSummary derived fields omitted/unavailable until upstream systems are real.

**Acceptance gate:**

- Mode 3 consumers never treat placeholder awards, milestones, morale, narrative, park factors, WPA/WAR, or designations as real data.

## 4. Deferred or narrowed for v1

These should stay out unless explicitly reopened:

- generated franchise schedules
- OCR schedule extraction
- AI game simulation
- AI trade logic
- salary matching in trades
- luxury tax
- farm games
- abbreviated Playoff Mode inside Franchise Setup
- DH in v1 franchise paths, pending final cut implementation
- freeform playoff format redesign at season end
- final-score-only fabricated player stats or derived analytics
- hidden narrative/random canonical mutations
- complete relationship/morale/chemistry effects before durable storage exists
- complete WAR/park-adjusted analytics claims before consumer audit

## 5. Dependency map

```text
Schedule policy
  -> GameTracker launch
  -> completion/archive
  -> standings/playoffs

Mode 1 handoff
  -> roster/farm baseline
  -> salary baseline
  -> stadium/park factors
  -> Mode 2 scoped reads

Competition boundary + completion idempotency
  -> trusted stats
  -> WPA/WAR/value
  -> designations/awards
  -> Mode 3 handoff

Farm baseline + roster movement
  -> trades
  -> GameTracker availability
  -> Phase 11 roster lock
  -> Mode 3 offseason

Trade-aware stat model
  -> executable trades
  -> storylines/designations
  -> team hubs/almanac

Salary + True Value
  -> designations
  -> awards/value
  -> trades/offseason context

Narrative event ledger
  -> morale/relationships
  -> random events
  -> story-driven mutations
```

## 6. Test gates

Before v1 can be called stable, focused tests should cover:

- New franchise starts with zero schedule rows when no user schedule is supplied.
- Generated schedule functions are not called in franchise v1 setup/new-season paths.
- Manual and CSV schedule rows launch GameTracker with current franchise roster state.
- Active-game restore preserves launch snapshots after roster edits.
- Completion retry cannot double-count stats or duplicate archive/playoff effects.
- Playoff games do not alter regular-season standings or regular-season player totals.
- Farm records initialize from FARM assignments and survive approved transitions.
- Call-up/send-down updates player status, farm records, transactions, stale lineup state, and future GameTracker availability.
- Trade execution moves MLB/FARM players, transfers farm records, logs before/after state, and preserves historical/future stat team context.
- Salary baseline initializes during setup and follows approved salary spec.
- True Value and designations persist with source inputs and calculation versions.
- WPA/Manager Moments labels remain distinct from WAR.
- Park/adaptive values are labeled correctly.
- Narrative/random events that mutate state require confirmation or manual-sync status.
- SeasonSummary omits or marks derived fields unavailable until upstream systems are real.

## 7. Recommended first implementation prompt

```text
Recommended reasoning: High

Please implement Franchise v1 Slice 1: schedule policy cutover and generated-schedule removal.

Scope:
- Remove generated franchise schedules from v1 franchise creation and new-season paths.
- Preserve empty schedule startup when no user-supplied schedule rows exist.
- Do not implement CSV import yet unless the code already has a safe parser/review path.
- Do not change GameTracker, trades, salary, designations, narrative, or Mode 3 behavior except where required to stop generated schedule creation.
- Preserve non-franchise and Elimination behavior.

Requirements:
1. New franchise creation must create season metadata but zero scheduled games unless user-supplied rows are explicitly provided.
2. New-season transition must not generate a schedule; next season should start with empty/user-supplied schedule state.
3. Any schedule-total repair logic must not infer generated schedules.
4. Existing tests that assert generated franchise schedules must be rewritten to assert empty startup/no-generation.
5. Franchise Home and schedule UI must continue to handle empty schedule state.
6. Add/keep tests proving no generated schedule calls in franchise v1 paths.

Verification:
- Run focused franchise initializer, schedule storage, FranchiseHome schedule, and season transition tests.
- Run build if code changes affect shared types or route wiring.
```

## 8. Final recommendation

Start with schedule policy cutover. It is the cleanest first slice because it removes a hard contradiction shared by all audits and prevents future work from building on generated schedule assumptions.

Do not begin trades, designations, salary/value, narrative, or Mode 3 expansion until the schedule policy, competition scope, completion idempotency, and Mode 1 handoff are corrected.
