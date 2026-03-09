# GameTracker Invariants and Failure Modes Audit

Scope: current `src/src_figma` GameTracker only. This is the next layer after the interaction inventory. It focuses on what the system must keep true, where those guarantees are enforced, and where the current implementation still breaks or weakens them.

Audit basis:
- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/hooks/useGameState.ts`
- `src/utils/eventLog.ts`
- `src/utils/gameStorage.ts`
- tests consulted:
  - `src/src_figma/__tests__/baseballLogic/runnerMovement.test.ts`
  - `src/src_figma/__tests__/dataTracking/runnerIdTracking.test.ts`
  - `src/src_figma/__tests__/gameTracker/undoSystem.test.ts`
  - `src/src_figma/__tests__/gameTracker/gameStateLogic.test.ts`

Targeted verification run during this pass:
- `runnerMovement.test.ts`
- `runnerIdTracking.test.ts`
- `undoSystem.test.ts`
- Result: 142 tests passed

## Executive Read

The current GameTracker already has a serious invariant framework. The strongest guarantees are around:
- runner identity and responsible-pitcher tracking inside the runner tracker
- count/out/base resets around plate appearances and inning transitions
- idempotent end-game aggregation
- substitution validation and no-reentry rules

The weakest guarantees are where page-local UI promises more than the hook or storage layer actually commits:
- QuickBar error flow lets the scorer choose a batter destination that the hook does not persist
- undo restores hook/page state but does not roll back already-written event-log records
- between-play events still do not have a reliable dedicated persistence path
- some attribution UI (runner event actor IDs, fielder credits, error-on-advance) is only partial or informational

## Invariant Catalog

### A. Plate Appearance Invariants

| Invariant | Intended rule | Main enforcement point | Current status |
| --- | --- | --- | --- |
| Count bounds | balls stay `0-3`, strikes stay `0-2` between resolutions | `advanceCount()`, plate-appearance reset paths in `recordHit/Out/Walk/D3K/Error` | mostly enforced |
| Plate appearance resets count | any resolved PA resets balls/strikes to `0/0` | all record functions in `useGameState.ts` | enforced |
| Result taxonomy is exact | walk/HBP/IBB must route through `recordWalk()`, D3K through `recordD3K()`, ROE through `recordError()`, TP must remain TP | page handlers plus `record*` functions | mostly enforced |
| RBI and runs can differ | errors and some outs can score runs without batter RBI | `recordError()`, runner-advancement logic, tests in `runnerFields.test.ts` | enforced in hook, partially weakened by page heuristics |
| Batter destination must match recorded result | hit/walk/error result and occupied base state must agree after commit | `recordHit()`, `recordWalk()`, `recordError()`, runner defaults | partially enforced |

### B. Runner Identity and Attribution Invariants

| Invariant | Intended rule | Main enforcement point | Current status |
| --- | --- | --- | --- |
| Occupied bases must have valid runner IDs | no empty-string runner IDs for a live baserunner | runner tracker plus `buildRunnerInfo()` and runner-ID tests | strongly enforced in hook/event-log path |
| Runner identity persists across plays | advancing runner keeps same runner ID until score/out/substitution | runner tracker helpers and `runnerIdTracking.test.ts` | enforced |
| Responsible pitcher persists with runner | inherited runners and pinch runners keep original pitcher attribution | runner tracker and pinch-runner update path in `makeSubstitution()` | enforced |
| No duplicate runner identities on bases | a runner cannot exist on two bases at once | runner tracker state transitions and validation tests | enforced in tracker; page-level manual states can still be misleading briefly |
| Existing runners move before batter is added | runner movement ordering must avoid false collisions and bad ER attribution | `recordHit()`, `recordWalk()`, `recordError()`, batch runner movement | enforced in hook |
| Runner names shown in UI should mirror runner tracker | page-local runner labels should reflect tracker truth | `getBaseRunnerNames()` sync effect in `GameTracker.tsx` | mostly enforced after T1-02/03/04 |

### C. Outs, Innings, and Scoreboard Invariants

| Invariant | Intended rule | Main enforcement point | Current status |
| --- | --- | --- | --- |
| Third out ends half-inning | stable state should not remain at 3 outs within an active half-inning | `recordOut()`, `recordD3K()`, `advanceRunner()`, `advanceRunnersBatch()`, `endInningRef` | enforced with deferred transition |
| Half-inning transition clears bases and count | new half starts empty with `0-0` count | `executeEndInning()` | enforced |
| Top/bottom transition picks correct next batter | batting order resumes for correct team | `executeEndInning()` with batter indexes | enforced |
| Top/bottom transition picks correct pitcher | fielding team pitcher must switch correctly on half-inning change | `executeEndInning()` and lineup state refs | enforced after T0-02 fix |
| Scoreboard line score matches game score | inning rows and team run totals must agree with score mutations | scoring updates inside record functions and runner movement functions | mostly enforced |
| Scoreless completed half-innings still exist in line score | archive should not omit zero-run halves | `executeEndInning()` scoreboard fill step | enforced |
| Game cannot end tied in regulation | tie after regulation continues into extras | auto-end logic in `executeEndInning()` | enforced |

### D. Substitution and Pitching Invariants

| Invariant | Intended rule | Main enforcement point | Current status |
| --- | --- | --- | --- |
| Used players cannot re-enter | outgoing player moves to `usedPlayers` and cannot legally re-enter | `validateSubstitution()`, `makeSubstitution()` | enforced when lineup state exists |
| Pending pinch hitter must bat before removal | PH cannot be immediately swapped out before a PA result | `pendingPH` guard in page and clear-on-result logic | enforced in page flow |
| Pinch runner changes runner identity but not responsible pitcher | runner ID swap must preserve ER attribution | `makeSubstitution()` pinch-run path | enforced |
| Pitching change captures current pitch count context | outgoing pitcher requires pitch-count confirmation path | `changePitcher()` and pitch-count prompt | partially enforced |
| Pitching change preserves inherited/bequeathed runner accounting | outgoing pitcher keeps bequeathed runners, incoming pitcher inherits them | runner tracker pitching-change path | enforced |
| Position switches affect lineup state, not plate-appearance log | defensive swaps are lineup truth, not `AtBatEvent` truth | `switchPositions()` | enforced |

### E. Persistence and Recovery Invariants

| Invariant | Intended rule | Main enforcement point | Current status |
| --- | --- | --- | --- |
| Every resolved at-bat gets an `AtBatEvent` row | at-bat truth must be append-only in event log | `logAtBatEvent()` calls in record functions | enforced for official at-bat paths |
| Post-hoc edits mutate the original event, not add new shadow events | enrichment should patch the same `AtBatEvent` | `updateAtBatEvent()` | enforced |
| Current game autosaves hook truth quickly | game should survive refresh/navigation | autosave effect in `useGameState.ts` -> `saveCurrentGame()` | mostly enforced for hook-owned state |
| End-game aggregation is idempotent | stats should not aggregate twice if end-game path reruns | `getGameHeader()` + `markGameAggregated()` guard | enforced |
| Completed game should archive before summary navigation | post-game summary must have archive record available | `endGame()` archive-first path | enforced |
| Undo snapshot must be internally consistent | game state, scoreboard, player stats, pitcher stats, runner tracker must restore together | `handleUndo()` + `restoreState()` | enforced for hook/page state only |

### F. UI Truth Invariants

| Invariant | Intended rule | Main enforcement point | Current status |
| --- | --- | --- | --- |
| Live UI should not advertise unreachable functionality | visible controls should correspond to live write paths | page render wiring | partially enforced |
| Player card stats should represent live stats if shown as stat truth | modal stat blocks should not imply fake live numbers | `PlayerCardModal` | violated |
| End-game enrichment warning should count all missing enrichment dimensions it claims to care about | user should be warned about all still-missing enrichments | end-game modal check | partially enforced |

## Failure Modes

Severity scale:
- `P1`: breaks authoritative truth or causes direct data contradiction
- `P2`: drops attribution or weakens recovery/analytics accuracy
- `P3`: mostly UI-truth or workflow debt

### P1 Failures

| Failure mode | Broken invariant(s) | Where introduced | What happens |
| --- | --- | --- | --- |
| QuickBar error destination is not actually persisted | batter destination must match recorded result | `GameTracker.handleErrorFlowComplete()` vs `useGameState.recordError()` | UI allows `1B/2B/3B`, but hook always places batter on first on error |
| Undo can desynchronize hook truth from IndexedDB truth | undo snapshot must be internally consistent across all truths | page `handleUndo()` restores hook/page state only; `eventLog` rows remain append-only | after undo, UI/hook may show pre-play state while already-written `AtBatEvent` and fielding-event records still exist |

### P2 Failures

| Failure mode | Broken invariant(s) | Where introduced | What happens |
| --- | --- | --- | --- |
| Between-play events are not durably ledgered in the normal live path | current game autosaves hook truth quickly; event truth should be reconstructable | `useGameState.recordEvent()` ends with `TODO: Log to separate event store` | SB/WP/PB/pickoff/special-event actions mostly update in-memory state only, not a dedicated `BETWEEN_PLAY_EVENTS` ledger |
| Runner-event actor attribution is frequently missing | occupied bases must have valid runner IDs; actor attribution should match event | page runner-popover handlers call `recordEvent()` without `runnerId` | SB/CS Fame and player stat attribution are incomplete or generic |
| Manual special-event attribution is partial | special-event actor should match actual fielder/runner/batter | `handleSpecialEvent()` -> `recordEvent()` | manual modifier tray often records valid event type but generic or inferred recipient |
| Error-on-advance flow is informational only | post-attribution UI should affect persisted truth if it promises scoring attribution | `handleErrorOnAdvanceConfirm()` | modal logs console messages but does not update play data, stats, or storage |
| Fielder-credit modal is not closed-loop into live stat truth | fielding attribution should affect authoritative stats | `handleFielderCreditConfirm()` TODO comment | user can confirm credits, but live player stat maps are not updated from those credits; value mainly survives indirectly through extracted fielding events |
| End-game pitch-count cancel semantics are weakened | pitching/end-game prompt should gate deferred action consistently | `endGame()` directly calls `completeGameInternal()` after setting prompt | the end-game prompt still appears, but cancel/dismiss no longer cleanly stops finalization |
| mWAR decisions are not part of current-game autosave | current game autosaves hook truth quickly | page owns `mwarHook`; `useGameState` autosave does not persist its decisions | in-progress manager decisions can be lost on refresh/recovery before end game |
| End-game unenriched warning undercounts missing enrichment | enrichment warning should cover all claimed missing data | end-game modal checks only pitch type and location | fielding sequence and pitch count omissions can slip through without warning |
| Fielding stats are resolved late through position mapping | fielding attribution should remain stable through substitutions and position changes | end-game fielding tally resolution maps position-based IDs back to players | late resolution can misattribute if positions changed after the logged fielding event context |

### P3 Failures

| Failure mode | Broken invariant(s) | Where introduced | What happens |
| --- | --- | --- | --- |
| Player card shows placeholder stat truth | player card stats should represent live stats if displayed as truth | `PlayerCardModal` hard-coded stat objects | mojo/fitness editing is real, but season/game stats in the modal are fake placeholders |
| Center field component suggests more live capability than page wiring exposes | live UI should not advertise unreachable functionality | `EnhancedInteractiveField` contains full play lifecycle, page passes `hideActionSelector={true}` | code surface implies field-first play entry, but current page primarily uses QuickBar |
| LineupCard header appears clickable in overlay mode but has no toggle callback | visible controls should correspond to real behavior | overlay renders `LineupCard` with `isExpanded={true}` and no `onToggleExpanded` | cosmetic click affordance with no effect |

## Strongly Enforced Invariants Worth Preserving

These are not just intended. The current code and tests give them real weight:

1. Runner tracker is the authoritative source of runner identity and responsible-pitcher attribution.
2. Existing runners are advanced before the batter is added, which protects both base occupancy and ER attribution.
3. Pinch runners replace runner identity without breaking responsible-pitcher tracking.
4. Third-out detection covers both at-bat outs and baserunning outs.
5. Half-inning transition now swaps to the correct pitching team pitcher.
6. End-game aggregation has an explicit idempotency guard.
7. Undo snapshots include game state, scoreboard, player stats, pitcher stats, and runner tracker together.

## Weakest Architectural Seams

These are the places where redesign or further feature work is most likely to go wrong unless the logic is centralized first:

1. Page-local result interpretation vs hook-owned authoritative mutation.
2. Page-local UX prompts that do not fully propagate into persisted play truth.
3. Event-log truth vs undo truth.
4. Manager/fame side systems that live outside `useGameState` autosave.
5. Fielding attribution that is logged by position first and resolved to player later.

## Most Useful Next Refactor Targets Before A UI Redesign

1. Create a single authoritative play-commit API that page prompts must feed, instead of page-level pre-interpretation plus hook mutation.
2. Move all non-at-bat event persistence onto a real between-play event writer.
3. Make undo either event-sourced or explicitly scope it to "UI/hook only" and reconcile IndexedDB truth.
4. Close the QuickBar error gap so chosen batter destination and persisted base state cannot disagree.
5. Pull manager decisions and similar side systems into the autosaved recovery model.
