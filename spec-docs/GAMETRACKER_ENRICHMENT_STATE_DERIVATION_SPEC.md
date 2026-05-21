# GameTracker Enrichment State Derivation Spec

Date: May 15, 2026  
Status: Implementation planning spec  
Purpose: Fix complex post-play enrichment bugs by making enriched play details the source of truth for derived game state.

## Core Principle

**Result buttons create editable defaults. Enrichment creates truth. Derived game state follows truth.**

GameTracker can still use fixed baseball defaults when a user first taps a result button. Defaults make the app fast. But once the user edits the play log, runner/batter/fielder enrichment must stop re-imposing generic assumptions from the original result button.

The engine should derive post-play state from the complete enriched play record, not from the last edited runner and not from fixed result-level minimums.

## Bugs This Spec Addresses

### Bases-loaded double play correction

Observed scenario:
- Bases loaded, less than two outs.
- User records a double play.
- Default logic assumes a standard force at second and out at first.
- Real play is home-to-first double play.
- User corrects runner outcomes in the play log.
- The play log still shows the runner from second advancing to third.
- The score bug and next play lose that runner.

Root cause:
- Play-log display reads `runnerOutcomes[]`.
- Live base state and next-play state read `runnersAfter`.
- During sequential single-runner edits, an intermediate state can make the play look inning-ending.
- That clears `runnersAfter`.
- Later edits rebuild only the currently edited runner, not all unchanged safe runners from `runnerOutcomes[]`.

### Fielder's choice with no outs

Observed scenario:
- Runner on third.
- Batter hits a ball where defense throws home.
- Runner is safe and batter is safe at first.
- Baseball scoring can still be fielder's choice because the defense chose to play on another runner.
- Current code often treats FC as requiring at least one out.

Root cause:
- Result-level logic currently treats `FC` as a one-out result in several paths.
- Post-hoc runner outcomes can visually describe a zero-out FC, but the result/out model tries to normalize the play back to an out-producing FC or another result.

## Desired Order Of Operations

### Initial result entry

When the user taps a result button:

1. Build a reasonable default play record.
2. Populate `runnerOutcomes[]` where possible.
3. Populate `runnersAfter`, scores, outs, and fielding defaults from those defaults.

This default may be wrong. That is acceptable.

### Post-play enrichment

When the user edits runner, batter, or fielder details after the fact:

1. Update the granular enriched detail.
2. Rebuild the whole play's derived state from the full enriched record.
3. Persist one coherent at-bat event patch.
4. If the edited play is the latest live at-bat, update live bases/outs/score from the newly derived state.

Never derive canonical state from only the edited sub-entry.

## Source-Of-Truth Hierarchy

For enriched plays:

1. Explicit `runnerOutcomes[]`
2. Batter outcome fields:
   - `result`
   - `batterReachedOnError`
   - `batterErrorType`
   - `batterErrorChargedToPosition`
   - `batterCorrectionOriginalResult`
3. Fielding enrichment:
   - `fieldingSequence`
   - `fielderId`
   - `fielderPosition`
   - related fielding sync events
4. Original result button defaults

The original result button should not override explicit enriched details.

## Required Invariants

### Runner/base invariant

After any enrichment edit:

`runnersAfter` must equal the safe, non-scoring, non-out base destinations represented by the complete `runnerOutcomes[]`.

Examples:
- `toBase: "second"` means that runner must be on second in `runnersAfter`.
- `toBase: "third"` means that runner must be on third in `runnersAfter`.
- `toBase: "home"` means the runner scored and is not on base.
- `toBase: "out"` means the runner is out and is not on base.
- `toBase: "end"` means the runner is no longer active and is not on base.

If multiple runners are assigned to the same destination, the helper must surface a diagnostic or deterministic conflict result; it must not silently overwrite one runner.

### Outs invariant

After enrichment:

`outsRecorded` must be derived from the complete play details:
- batter out, if applicable
- each runner outcome that counts as an out
- no result-level minimum for FC once explicit runner outcomes exist

`outsAfter = outsBefore + outsRecorded`, capped by baseball inning rules.

### Inning-ending invariant

Only clear all bases when the complete enriched play truly records the third out.

Do not clear bases because an intermediate single-runner edit temporarily reaches three outs.

### Score invariant

Runs scored must be derived from all runner outcomes that count as runs.

The batting side's score after must equal score before plus derived runs.

### Result-label invariant

Result labels may be corrected when needed, but they must not force state contrary to explicit runner outcomes.

Examples:
- FC with zero outs is allowed if the runner outcomes support it.
- DP requires two outs in the complete play, but those outs do not have to be second-to-first.
- A corrected batter-safe-on-error outcome may become `E`, but only when the enriched detail indicates error.

## Proposed Pure Helper

Add a pure utility before wiring UI behavior:

```ts
deriveEnrichedAtBatState(input: {
  existingAtBat: AtBatEvent;
  runnerOutcomes: PersistedRunnerOutcome[];
  result?: AtBatEvent["result"];
  totalInnings?: number;
}): {
  runnerOutcomes: PersistedRunnerOutcome[];
  runnersAfter: AtBatEvent["runnersAfter"];
  runsScored: string[];
  rbiCount: number;
  outsRecorded: number;
  outsAfter: number;
  awayScoreAfter: number;
  homeScoreAfter: number;
  isWalkOff: boolean;
  result: AtBatEvent["result"];
  batterReachedOnError?: boolean;
  batterErrorType?: AtBatEvent["batterErrorType"];
  batterErrorChargedToPosition?: AtBatEvent["batterErrorChargedToPosition"];
  batterCorrectionOriginalResult?: AtBatEvent["batterCorrectionOriginalResult"];
  diagnostics?: string[];
}
```

Exact type names can change to match the codebase, but the function should stay pure and testable.

## Conservative Implementation Scope

### In scope for first implementation

- Add pure derivation helper.
- Add focused unit tests.
- Route play-log runner enrichment commits through the helper.
- Preserve initial result-entry defaults.
- Preserve existing fielding sync behavior unless the helper exposes an obvious mismatch.
- Update live bases/outs only from the helper-derived final state when the edited play is the latest at-bat.

### Out of scope for first implementation

- Rewriting all initial runner defaults.
- Global migration of old games.
- Changing player KBL WPA or Manager Value scoring logic directly.
- Rebuilding the fielding modal.
- Rewriting every result button.
- Changing dropped-third-strike or inherited-runner scope.

## FC Model

Fielder's choice means the defense chose to play on a runner rather than making the routine play on the batter.

FC can produce:
- zero outs
- one out
- two outs
- a runner safe at the attempted base
- batter safe at first

Therefore:
- Initial FC defaults may still assume one runner out.
- Enriched FC state must allow zero outs.
- `calculateMinimumResultOuts("FC")` must not force one out when explicit `runnerOutcomes[]` are present.

## DP Model

Double play means two outs recorded on the play.

It does not imply:
- the first out is at second
- the second out is at first
- the runner from first is always out
- the runner from third always scores

Therefore:
- Initial DP defaults may still assume a common ground-ball DP.
- Enriched DP state must derive outs and bases from complete runner/batter outcomes.
- A bases-loaded home-to-first DP should leave safe runners at second and third when runner outcomes say so.

## Test Fixtures Required

### Pure helper tests

1. **Bases-loaded home-to-first DP**
   - before: bases loaded, zero outs
   - outcomes: R3 out, batter out, R2 to third, R1 to second
   - expected: two outs, runners on second and third

2. **Sequential DP correction stability**
   - simulate changing R3 home to out, then R1 out to second
   - expected final derived state still keeps R2 on third

3. **FC no-out safe-at-home**
   - before: runner on third, zero outs
   - outcomes: R3 home, batter first
   - result: FC
   - expected: zero outs, batter on first, run scored

4. **FC runner out at home**
   - before: runners on first and third, zero outs
   - outcomes: R3 out, R1 second, batter first
   - expected: one out, runners on first and second

5. **GO with out advancing**
   - before: runner on second
   - outcomes: batter out, R2 out advancing
   - expected: two outs, bases empty

6. **Error with runner advancement**
   - before: runner on first
   - outcomes: batter first on error, R1 third
   - expected: zero outs, runners first and third, error metadata preserved

7. **True inning-ending play**
   - before: one out
   - outcomes: batter out, runner out
   - expected: three outs and bases cleared

8. **Non-inning-ending intermediate edit**
   - prove bases are not cleared unless the complete final outcome set records the third out.

### Integration tests

1. Runner enrichment edit recomputes all `runnersAfter`, not only edited runner.
2. Latest-at-bat correction updates live score bug/base tracker from helper output.
3. Next at-bat runner logging uses corrected live base state.
4. FC with zero outs remains representable after enrichment.
5. Play log display and engine state agree after correction.

## Implementation Prompts

### Prompt 1: Read-only map

Audit all current read/write paths for enriched at-bat state. Do not change code.

Output:
- where `runnerOutcomes[]` is written
- where `runnersAfter` is written
- where `outsRecorded` / `outsAfter` are written
- where `runsScored` / scores are written
- where live base tracker is patched after edits
- where fixed result minimums are imposed
- which paths should call the new helper first

### Prompt 2: Pure helper

Implement only the pure derivation helper and unit tests. Do not wire it into GameTracker UI yet.

Acceptance:
- all required pure helper fixtures pass
- no production behavior changes outside the helper export
- no Manager Value / KBL WPA logic changes

### Prompt 3: Runner enrichment integration

Route runner outcome enrichment commits through the helper.

Acceptance:
- DP home-to-first correction preserves safe runners
- FC zero-out correction is representable
- live base tracker and play log agree after latest-at-bat correction
- existing runner correction tests still pass

### Prompt 4: Batter and fielder enrichment integration

Use the same helper for batter/result and fielding-sequence corrections where those corrections affect post-play state.

Acceptance:
- fielding-sequence corrections do not re-impose old DP/FC assumptions
- batter-safe/error corrections preserve runner state
- fielding sync events still update correctly

### Prompt 5: Regression audit

Read-only audit after implementation.

Verify:
- defaults remain fast and plausible
- enrichment is canonical truth
- no player WPA / Manager Value / POG regressions
- no dropped-third-strike or inherited-runner scope changes

## Success Criteria

The fix is successful when:

- Play-log runner display and score bug/base tracker cannot diverge after enrichment.
- Next-play runner logging uses the corrected enriched state.
- FC with zero outs is possible.
- DP corrections support non-4-6-3 / non-6-4-3 plays naturally.
- Runners are never lost because of intermediate single-runner edits.
- The solution works through general invariants, not hard-coded fixes for one play.
