# GameTracker Scope Lock Working
Generated: 2026-03-09
Status: ⏳ PENDING JK RULINGS
Session: 1

## Session Start
SCOPE RESOLVER — SESSION 1

Documents loaded: ✅
- `spec-docs/PHASE2_HANDOFF.md`
- `spec-docs/skills/gametracker-scope-resolver/SKILL.md`
- `spec-docs/GAMETRACKER_FUNCTIONAL_TRUTH.md`
- `spec-docs/v1-simplification/MODE_2_V1_FINAL.md`
- `spec-docs/MODE_2_FRANCHISE_SEASON_UPDATED.md`

## Reconciliation Summary
UI Layer: 8 matches | 0 need ruling
Engine Layer: 7 matches | 0 need ruling
Systems Layer: 6 matches | 0 need ruling
Total: 21 auto-PRESERVE | 0 need your ruling | 10 rulings complete

Default posture: PRESERVE what works. Open items below are limited to confirmed mismatches, unwired spec requirements, or browser-unknown UX.

---

## Reconciliation Matrix

### UI Layer (§3-§7)

#### Matches

| Feature | Code Files | Spec Ref | Truth Status | Action |
|---|---|---|---|---|
| Quick Bar primary 1-tap input, overflow outcomes, context-sensitive disabling | `src/src_figma/app/components/QuickBar.tsx:19-40`, `src/src_figma/app/pages/GameTracker.tsx:1934-2113` | §3.1, §3.2, §6.8 | ✅ | AUTO-PRESERVE |
| Undo snapshot and restore path | `src/src_figma/app/components/UndoSystem.tsx`, `src/src_figma/app/pages/GameTracker.tsx:1934-2113`, `src/src_figma/hooks/useGameState.ts:4887` | §3.3 | ✅ | AUTO-PRESERVE |
| End-of-inning auto-detection with enrichment prompt gate | `src/src_figma/hooks/useGameState.ts:2892-2899`, `src/src_figma/app/pages/GameTracker.tsx:3016-3030` | §3.4, §4.4 | ✅ | AUTO-PRESERVE |
| Play-log-driven enrichment with immediate `updateAtBatEvent()` writes | `src/src_figma/app/pages/GameTracker.tsx:3037-3123`, `src/utils/eventLog.ts:630-672` | §4.2, §4.3, §4.4 | ✅ | AUTO-PRESERVE |
| `+FLD` opens most recent unenriched play instead of separate fielding recorder | `src/src_figma/app/pages/GameTracker.tsx:3728-3737` | §4.2, §4.4 | ✅ | AUTO-PRESERVE |
| Runner popover supports steal, pickoff, WP, PB, advance | `src/src_figma/app/pages/GameTracker.tsx:2783-2828`, `src/src_figma/app/components/RunnerPopover.tsx` | §5.1 | ✅ | AUTO-PRESERVE |
| Two substitution entry points exist: lineup path and diamond tap path | `src/src_figma/app/pages/GameTracker.tsx:1138-1178`, `src/src_figma/app/pages/GameTracker.tsx:2672-2733` | §5.2, §7.2 | ✅ | AUTO-PRESERVE |
| Position change / position swap flow exists in live page | `src/src_figma/app/pages/GameTracker.tsx:2736-2758`, `src/src_figma/app/pages/GameTracker.tsx:2903` | §5.5, §7.1 | ✅ | AUTO-PRESERVE |

#### Discrepancies

| Feature | Code Files | Spec Ref | Truth Status | Action |
|---|---|---|---|---|
| Play-log `eventId` is built from stale pre-increment sequence, but persisted at-bat uses incremented sequence | `src/src_figma/app/pages/GameTracker.tsx:1611-1613`, `src/src_figma/app/pages/GameTracker.tsx:2072-2074`, `src/src_figma/hooks/useGameState.ts:2299-2301`, `src/src_figma/hooks/useGameState.ts:3298-3301` | §2.1, §4.2 | ❌ | RULING #1 — MODIFY-CODE |
| Error flow UI captures batter destination, hook always places batter on 1B | `src/src_figma/app/pages/GameTracker.tsx:2192-2251`, `src/src_figma/hooks/useGameState.ts:3254-3295` | §3.2, §6.5 | ❌ | RULING #2 — MODIFY-CODE |
| Scoreboard pitcher tap auto-selects first available reliever instead of opening roster choice UI | `src/src_figma/app/components/FenwayBoard.tsx:175-179`, `src/src_figma/app/pages/GameTracker.tsx:2911-2922`, `src/src_figma/app/pages/GameTracker.tsx:3550` | §5.4, §7.4 | ✅ | RULING #7 — MODIFY-CODE |
| RunnerPopover default destination highlight is broken by object-identity comparison | `src/src_figma/app/components/RunnerPopover.tsx:162-165` | §5.1 | ❌ | RULING #4 — MODIFY-CODE |

#### Code-Only Extras

| Feature | Code Files | Spec Ref | Truth Status | Action |
|---|---|---|---|---|
| `EnhancedInteractiveField` provides a richer multi-step field play path than minimum 1-tap spec requires | `src/src_figma/app/components/EnhancedInteractiveField.tsx`, `src/src_figma/app/pages/GameTracker.tsx:1266-1644` | §3, §4 | ✅ | AUTO-PRESERVE unless JK cuts |
| Manager Moment has a subtle indicator plus optional inline decision panel | `src/src_figma/app/components/QuickBar.tsx:117-132`, `src/src_figma/app/pages/GameTracker.tsx:3671-3698` | §5.3 | ✅ | AUTO-PRESERVE unless JK cuts |

#### Unknown / Browser Verification Debt

| Feature | Code Files | Spec Ref | Truth Status | Action |
|---|---|---|---|---|
| Runner/fielder popover positioning, enrichment open/close flow, mini-diamond location, between-inning enrichment prompt, post-game summary UX | `src/src_figma/app/components/RunnerPopover.tsx`, `src/src_figma/app/components/FielderPopover.tsx`, `src/src_figma/app/components/EnrichmentPanel.tsx`, `src/src_figma/app/pages/GameTracker.tsx:3125-3135`, `src/src_figma/app/pages/PostGameSummary.tsx` | §4, §5, §7 | ⚠️ | RULING #8 — DEFER TO PHASE 3 REDESIGN |

### Engine Layer (§8-§14)

#### Matches

| Feature | Code Files | Spec Ref | Truth Status | Action |
|---|---|---|---|---|
| At-bat events persist immediately with game header bookkeeping and aggregation markers | `src/utils/eventLog.ts:525-704`, `src/src_figma/hooks/useGameState.ts:1422`, `src/src_figma/hooks/useGameState.ts:2460`, `src/src_figma/hooks/useGameState.ts:4313-4519` | §1.3, §2.1, §8.5, §26.1 | ✅ | AUTO-PRESERVE |
| Game-level batting and pitching stats accumulate during play | `src/src_figma/hooks/useGameState.ts:2299-3355`, `src/src_figma/app/pages/GameTracker.tsx:3550-3568` | §8.1-§8.4, §9.1 | ✅ | AUTO-PRESERVE |
| Inherited runner handling and pitcher decisions are wired into the live end-game path | `src/src_figma/hooks/useGameState.ts:3994-4269`, `src/src_figma/hooks/useGameState.ts:4390-4444` | §9.4, §9.5, §9.6 | ✅ | AUTO-PRESERVE |
| Fielding enrichment extracts and persists fielding events for later aggregation | `src/src_figma/app/pages/GameTracker.tsx:1644`, `src/src_figma/app/pages/GameTracker.tsx:2549`, `src/src_figma/app/utils/fieldingEventExtractor.ts`, `src/utils/eventLog.ts:597-611` | §10.1-§10.8 | ✅ | AUTO-PRESERVE |
| Leverage/WPA and fame-trigger logic are active in live at-bat recording | `src/src_figma/app/pages/GameTracker.tsx:1781-1904`, `src/src_figma/app/hooks/useGameState.ts:3496`, `src/src_figma/app/engines/fameIntegration.ts` | §12.1-§12.5, §13.1-§13.7 | ✅ | AUTO-PRESERVE |
| Mojo and fitness state are visible and mutable in the live page via `usePlayerState` | `src/src_figma/app/pages/GameTracker.tsx:291-318`, `src/src_figma/app/pages/GameTracker.tsx:3811-3812`, `src/src_figma/app/hooks/usePlayerState.ts:244-296` | §14 | ✅ | AUTO-PRESERVE |
| Game completion aggregates season batting, pitching, fielding, fame, and milestones | `src/utils/processCompletedGame.ts:34-52`, `src/utils/seasonAggregator.ts:64-125` | §8.4, §18, §26.1 | ✅ | AUTO-PRESERVE |

#### Discrepancies / Gaps

| Feature | Code Files | Spec Ref | Truth Status | Action |
|---|---|---|---|---|
| `BetweenPlayEvent` store and writer exist, but live route never calls `logBetweenPlayEvent()` for runner events, pitcher changes, substitutions, manager moments, or mojo/fitness edits | `src/utils/eventLog.ts:613-627`, `src/src_figma/hooks/useGameState.ts:3577-3599`, `src/src_figma/app/pages/GameTracker.tsx:1030-1037`, `src/src_figma/app/pages/GameTracker.tsx:1138-1178`, `src/src_figma/app/pages/GameTracker.tsx:2725-2733`, `src/src_figma/app/pages/GameTracker.tsx:3686-3690` | §1.3, §2.2, §5.1-§5.6 | ❌ | RULING #3 — MODIFY-CODE |
| Pitcher achievement thresholds are still hard-coded to 9-inning assumptions instead of scheduled-innings scaling | `src/src_figma/app/pages/GameTracker.tsx:3158-3168`, `src/src_figma/app/pages/GameTracker.tsx:3200-3205`, `src/utils/seasonAggregator.ts:196-210` | §6.1, §9.7 | ❌ | RULING #5 — MODIFY-CODE |
| WAR engines exist, but completed-game orchestration does not invoke WAR calculation at game end | `src/utils/processCompletedGame.ts:34-52`, `src/utils/seasonAggregator.ts:64-125`, `src/src_figma/app/engines/warOrchestrator.ts:144-276` | §11.1-§11.6 | ⚠️ | RULING #6 — MODIFY-CODE |

#### Code-Only Extras

| Feature | Code Files | Spec Ref | Truth Status | Action |
|---|---|---|---|---|
| Event log schema already carries optional context/versioning fields beyond the current minimum live wiring | `src/utils/eventLog.ts:190-314` | §2.1, §2.2 | ✅ | AUTO-PRESERVE unless JK cuts |

### Systems Layer (§15-§25)

#### Matches

| Feature | Code Files | Spec Ref | Truth Status | Action |
|---|---|---|---|---|
| Manager moment decisions persist to manager storage and aggregate to season-level mWAR data | `src/src_figma/app/pages/GameTracker.tsx:3272-3298`, `src/utils/managerStorage.ts:270` | §15, §11.5, §25 | ✅ | AUTO-PRESERVE |
| Narrative recap generation runs before post-game navigation | `src/src_figma/app/pages/GameTracker.tsx:3246-3269`, `src/src_figma/app/engines/narrativeIntegration.ts:50` | §16 | ✅ | AUTO-PRESERVE |
| Schedule completion is written at game end to advance franchise flow and standings inputs | `src/src_figma/app/pages/GameTracker.tsx:3336-3353`, `src/utils/scheduleStorage.ts:295-321` | §21, §22, §26.1 | ✅ | AUTO-PRESERVE |
| Playoff game result propagation and playoff stat aggregation run in the completed-game path | `src/src_figma/hooks/useGameState.ts:4525-4605`, `src/utils/playoffStorage.ts:547-759` | §21, §26.1 | ✅ | AUTO-PRESERVE |
| Franchise data-flow guardrails exist: aggregation marker, archive, replay/integrity header | `src/utils/eventLog.ts:135-136`, `src/utils/eventLog.ts:704-716`, `src/src_figma/hooks/useGameState.ts:4502-4519`, `src/utils/gameStorage.ts` | §24, §25 | ✅ | AUTO-PRESERVE |
| Park context at least captures stadium identity in live at-bat saves | `src/src_figma/hooks/useGameState.ts:1252-1261`, `src/utils/eventLog.ts:198-203` | §23.1, §24.1 | ✅ | AUTO-PRESERVE |

#### Discrepancies / Gaps

| Feature | Code Files | Spec Ref | Truth Status | Action |
|---|---|---|---|---|
| Fan morale processing currently passes placeholder season/game context and empty player performances rather than richer contextual inputs | `src/src_figma/app/pages/GameTracker.tsx:3213-3238` | §20.1-§20.4 | ⚠️ | RULING #9 — MODIFY-CODE |
| Park-factor / adaptive-standards systems exist in shared engines, but live GameTracker completion path does not visibly populate park factors or invoke calibration-related flow | `src/src_figma/hooks/useGameState.ts:1258-1261`, `src/engines/calibrationService.ts:393-444`, `src/src_figma/app/engines/warOrchestrator.ts:183-202` | §22, §23 | ⚠️ | RULING #10 — MODIFY-CODE |

#### Code-Only Extras

| Feature | Code Files | Spec Ref | Truth Status | Action |
|---|---|---|---|---|
| Elimination-mode mojo/fitness snapshot persistence and bracket advancement exceed core V1 franchise tracker needs | `src/src_figma/app/pages/GameTracker.tsx:3317-3334`, `src/utils/eliminationManager.ts`, `src/utils/mojoFitnessStorage.ts` | Outside core V1 | ✅ | AUTO-PRESERVE unless JK cuts |

---

## First Question Batch

═══════════════════════════════════════
[DISCREPANCY] #1
Layer: UI
Domain: At-bat identity / enrichment linkage
═══════════════════════════════════════

CODE: `GameTracker.tsx:1611-1613` and `GameTracker.tsx:2072-2074` create play-log ids from `${gameId}_${atBatSequence}` before the hook increments sequence. `useGameState.ts:2299-2301` and `useGameState.ts:3298-3301` persist the real at-bat as `${gameId}_${newSequence}`.
SPEC: §2.1 requires each at-bat to have a stable event identity; §4.2 assumes play-log enrichment targets the saved event.
TRUTH STATUS: ❌

QUESTION: Is this V1-blocking enough that we should redesign the recording API now so the page receives the persisted `eventId`, or do you want to preserve the current API and defer the fix?

Why this matters:
- This is not cosmetic. The play log is the entry point for later enrichment edits.
- When the page points at the wrong `eventId`, the user can enrich one play while the database update lands on the previous play.
- JK already called out that the clean fix is an API redesign: the recording action should return the persisted id instead of the page guessing sequence state.
- If we preserve this as-is, V1 keeps a correctness hole in one of the core record-first / enrich-later loops.

OPTIONS:
(a) PRESERVE code as-is — enrichment can target the wrong at-bat; document as known defect
(b) MODIFY code to match spec — return persisted `eventId` from recording actions; effort M
(c) MODIFY spec to match code — accept play-log entries as best-effort UI cache, not authoritative ids
(d) DEFER to V2 — ship V1 with the defect and fix later
(e) DISCUSS

═══════════════════════════════════════
[DISCREPANCY] #2
Layer: UI
Domain: Error flow / batter destination
═══════════════════════════════════════

CODE: `GameTracker.tsx:2192-2251` asks the user which base the batter reached on error. `useGameState.ts:3254-3295` has no batter-destination parameter and always does `trackerAddRunner(..., '1B', 'error')`.
SPEC: §3.2 says the recorded result should save the actual play outcome; §6.5 defines runner advancement defaults and overrides.
TRUTH STATUS: ❌

QUESTION: For V1, should error plays support batter-to-2B/3B correctly, or do you want to collapse the UI/spec to "batter always to 1B on error" and revisit later?

Why this matters:
- The current UI explicitly tells the user they can record "batter to 2B" or "batter to 3B" on an error.
- The authoritative hook state ignores that choice, so base state, persistence, and downstream stats stay on 1B.
- This is an API-shape mismatch, not a dropped field. The hook signature itself cannot represent the UI choice.
- The scope decision is whether V1 should support the real baseball cases, or whether the UI/spec should be narrowed to match the simpler implementation.

OPTIONS:
(a) PRESERVE code as-is — UI remains misleading; authoritative state stays 1B-only
(b) MODIFY code to match spec — add batter destination through the hook API; effort M
(c) MODIFY spec to match code — V1 errors only allow batter to reach 1B
(d) DEFER to V2 — keep prompt now, accept incorrect state on rare plays
(e) DISCUSS

═══════════════════════════════════════
[BATCH] #3
Layer: ENGINE
Domain: Between-play event stream
═══════════════════════════════════════

These items share the same pattern: the V1 event model requires a formal `BetweenPlayEvent` stream, the event-log store already exists, but the live route never writes to it.

Items:
1. Runner actions — Code: `useGameState.ts:3577-3599`, `GameTracker.tsx:2783-2828` | Spec: §2.2, §5.1
2. Pitcher changes — Code: `GameTracker.tsx:2715-2733` | Spec: §2.2, §5.4, §7.4
3. Substitutions / position changes — Code: `GameTracker.tsx:1138-1178`, `GameTracker.tsx:2736-2758` | Spec: §2.2, §5.2, §5.5, §7
4. Manager moments — Code: `GameTracker.tsx:3686-3690`, `managerStorage` path only | Spec: §2.2, §5.3, §11.5
5. Mojo / fitness manual changes — Code: `GameTracker.tsx:1030-1037`, `GameTracker.tsx:3811-3812` | Spec: §2.2, §5.6, §14

QUESTION: Do you want V1 to have a complete `BetweenPlayEvent` stream now, or are these allowed to persist through their current side channels for V1?

Why this matters:
- V1 section §2.2 treats `BetweenPlayEvent` as part of the core immutable event model, not optional metadata.
- Right now, different categories split across different storage behaviors:
- Runner actions mostly mutate live state only.
- Pitching changes and subs affect game state but do not join the formal event stream.
- Manager moments persist through `managerStorage`, which helps mWAR but not the unified replay log.
- Mojo/fitness edits mutate player state without formal between-play event records.
- If we preserve this as-is, the live app can still function, but V1 loses the "single replayable event stream" guarantee for non-at-bat actions.
- If we wire it now, the implementation expands beyond one bug fix into a broader persistence pass.

OPTIONS:
(a) PRESERVE all current side-channel behavior — no formal between-play event stream in V1
(b) MODIFY code to write `BetweenPlayEvent`s for all five categories now; effort L
(c) MODIFY spec to make `BetweenPlayEvent` persistence a V2 concern
(d) Rule individually — present each category separately
(e) DISCUSS

---

## Rulings Log

RULING #1:
Type: DISCREPANCY
Layer: UI
Code ref: `src/src_figma/app/pages/GameTracker.tsx:1611-1613`, `src/src_figma/app/pages/GameTracker.tsx:2072-2074`, `src/src_figma/hooks/useGameState.ts:2299-2301`, `src/src_figma/hooks/useGameState.ts:3298-3301`
Spec ref: §2.1, §4.2
JK's answer: "fix now"
Decision: MODIFY-CODE
Effort: M
Design constraint: Recording actions must return or otherwise expose the authoritative persisted `eventId`; the page must stop guessing sequence state.

RULING #2:
Type: DISCREPANCY
Layer: UI
Code ref: `src/src_figma/app/pages/GameTracker.tsx:2192-2251`, `src/src_figma/hooks/useGameState.ts:3254-3295`
Spec ref: §3.2, §6.5
JK's answer: "should support batter to any base on errors"
Decision: MODIFY-CODE
Effort: M
Design constraint: Error recording must support batter destination through the hook contract and persist the true reached base.

RULING #3:
Type: BATCH
Layer: ENGINE
Code ref: `src/utils/eventLog.ts:613-627`, `src/src_figma/hooks/useGameState.ts:3577-3599`, `src/src_figma/app/pages/GameTracker.tsx:1030-1037`, `src/src_figma/app/pages/GameTracker.tsx:1138-1178`, `src/src_figma/app/pages/GameTracker.tsx:2725-2733`, `src/src_figma/app/pages/GameTracker.tsx:3686-3690`
Spec ref: §1.3, §2.2, §5.1-§5.6
JK's answer: "need it now"
Decision: MODIFY-CODE
Effort: L
Design constraint: V1 must emit formal `BetweenPlayEvent`s for runner actions, pitcher changes, substitutions/position changes, manager moments, and mojo/fitness changes.

RULING #4:
Type: DISCREPANCY
Layer: UI
Code ref: `src/src_figma/app/components/RunnerPopover.tsx:162-165`
Spec ref: §5.1
JK's answer: "let's fix"
Decision: MODIFY-CODE
Effort: S
Design constraint: Default destination affordance must visually identify the one-base-advance default in runner flows.

RULING #5:
Type: DISCREPANCY
Layer: ENGINE
Code ref: `src/src_figma/app/pages/GameTracker.tsx:3158-3168`, `src/src_figma/app/pages/GameTracker.tsx:3200-3205`, `src/utils/seasonAggregator.ts:196-210`
Spec ref: §6.1, §9.7
JK's answer: "fix"
Decision: MODIFY-CODE
Effort: M
Design constraint: Pitcher achievement detection and aggregation must scale with scheduled innings, not assume 9-inning games.

RULING #6:
Type: DISCREPANCY
Layer: ENGINE
Code ref: `src/utils/processCompletedGame.ts:34-52`, `src/utils/seasonAggregator.ts:64-125`, `src/src_figma/app/engines/warOrchestrator.ts:144-276`
Spec ref: §11.1-§11.6
JK's answer: "yes, wire it now"
Decision: MODIFY-CODE
Effort: M/L
Design constraint: Completed-game processing must populate stored WAR fields so team stats, league leaders, and WAR-driven award surfaces reflect tracked games without a separate lazy pass.

RULING #7:
Type: DISCREPANCY
Layer: UI
Code ref: `src/src_figma/app/components/FenwayBoard.tsx:175-179`, `src/src_figma/app/pages/GameTracker.tsx:2911-2922`, `src/src_figma/app/pages/GameTracker.tsx:3550`
Spec ref: §5.4, §7.4
JK's answer: "needs to be fixed to allow user to choose pitcher"
Decision: MODIFY-CODE
Effort: M
Design constraint: Pitcher tap from the scoreboard must open an explicit pitcher-choice flow rather than auto-selecting the first available reliever.

RULING #8:
Type: UNKNOWN BATCH
Layer: UI
Code ref: `src/src_figma/app/components/RunnerPopover.tsx`, `src/src_figma/app/components/FielderPopover.tsx`, `src/src_figma/app/components/EnrichmentPanel.tsx`, `src/src_figma/app/pages/GameTracker.tsx:3125-3135`, `src/src_figma/app/pages/PostGameSummary.tsx`
Spec ref: §4, §5, §7
JK's answer: "these are all problemes in one way or another, but we need to discuss re-design before fixing things that may need to be changed anyway; seems like we're getting ahead of ourselves"
Decision: DEFER
Effort: M/L
Design constraint: Treat this UX cluster as known-bad and in-scope for redesign, but do not make tactical fixes until Phase 3 resolves the broader interaction redesign.

RULING #9:
Type: DISCREPANCY
Layer: SYSTEMS
Code ref: `src/src_figma/app/pages/GameTracker.tsx:3213-3238`
Spec ref: §20.1-§20.4
JK's answer: "let's align with the written spec"
Decision: MODIFY-CODE
Effort: M
Design constraint: Fan morale updates must receive real season/game context and richer performance/context inputs consistent with the written spec.

RULING #10:
Type: GAP
Layer: SYSTEMS
Code ref: `src/src_figma/hooks/useGameState.ts:1258-1261`, `src/engines/calibrationService.ts:393-444`, `src/src_figma/app/engines/warOrchestrator.ts:183-202`
Spec ref: §22, §23
JK's answer: "yes, it fuller park/adaptive integration now"
Decision: MODIFY-CODE
Effort: M/L
Design constraint: V1 must move beyond stadium-name-only park context and wire fuller park-factor / adaptive-standards integration into the live game-completion pipeline.

## Next Question Batch
All 10 initial rulings are now captured. Awaiting final approval gate.
Layer: ENGINE
Domain: WAR orchestration at game completion
═══════════════════════════════════════

CODE: `processCompletedGame.ts:34-52` only runs season aggregation plus archive. `seasonAggregator.ts:64-125` aggregates batting, pitching, fielding, fame, and milestones. `warOrchestrator.ts:144-276` exists as a game-end WAR pipeline, but the completed-game path does not call it.
SPEC: §11 presents WAR as part of V1, and the Phase 2 handoff explicitly treats WAR components as in-scope engine behavior that fires during or immediately after game recording.
TRUTH STATUS: ⚠️

Why this matters:
- The codebase has WAR engines and downstream season views that expect WAR-shaped data.
- The specific question is not "does WAR exist anywhere?" but "is GameTracker completion responsible for wiring it in V1?"
- If not fixed now, V1 may still have stats and milestones after a game, but WAR may depend on separate later surfaces or offline calculations instead of the formal game-completion pipeline.

QUESTION: Should GameTracker V1 explicitly run WAR orchestration as part of the completed-game pipeline, or is it acceptable for WAR to remain downstream/lazy rather than game-end wired?

OPTIONS:
(a) MODIFY code now — wire WAR orchestration into completed-game flow; effort M/L
(b) PRESERVE current behavior — WAR is not a required game-end step in V1
(c) MODIFY spec — WAR remains downstream/offline in V1
(d) DISCUSS
