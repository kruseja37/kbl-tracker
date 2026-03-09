# GameTracker Interaction Inventory

Scope: current `src/src_figma` GameTracker only. This inventories what is actually wired in the live page render, what each visible control calls, what hook/storage paths it touches, and where UI truth diverges from persisted truth.

Primary code surfaces:
- `src/src_figma/app/pages/GameTracker.tsx`
- `src/src_figma/hooks/useGameState.ts`
- `src/src_figma/app/components/QuickBar.tsx`
- `src/src_figma/app/components/EnhancedInteractiveField.tsx`
- `src/src_figma/app/components/RunnerPopover.tsx`
- `src/src_figma/app/components/FielderPopover.tsx`
- `src/src_figma/app/components/PlayLogPanel.tsx`
- `src/src_figma/app/components/EnrichmentPanel.tsx`
- `src/src_figma/app/components/LineupCard.tsx`
- `src/utils/eventLog.ts`
- `src/utils/gameStorage.ts`

## Truth Rules

There are three main operational truths in the current implementation:

| Truth layer | Owner | What it governs |
| --- | --- | --- |
| Page-local UI truth | `GameTracker.tsx` state | open panels, play log panel state, pending prompts, local `runnerNames`, overlay visibility |
| Hook/game truth | `useGameState.ts` | official `gameState`, scoreboard, batter/pitcher stats, runner tracker, substitutions, inning/game completion |
| IndexedDB truth | `eventLog.ts` and `gameStorage.ts` | `atBatEvents`, `fieldingEvents`, `gameHeaders`, archived completed games, current-game autosave |

Important current-page fact:

- `EnhancedInteractiveField` is mounted with `hideActionSelector={true}`.
- Inside that component, `legacyFieldFlowEnabled = !hideActionSelector`, so the full field-first play-entry flow is disabled.
- `FieldDropZone` is therefore effectively off and batter/fielder drag interactions are not live from the current page.
- Result: the center field is currently a popover/enrichment surface, not the primary play-entry surface.

## Hook Mutation Bundles

These are the main side-effect bundles referenced by the inventory tables below.

| Bundle | Main function(s) | Immediate writes | Main downstream effects | Caveats |
| --- | --- | --- | --- | --- |
| `recordHit` bundle | `recordHit()` | `logAtBatEvent()` to `AT_BAT_EVENTS`; hook state mutation; autosave via `saveCurrentGame()` | batter PA/AB/H and hit subtype stats, RBI/R, pitcher hits/runs/ER via runner tracker, bases/score/count reset, scoreboard update | no separate between-play event write |
| `recordOut` bundle | `recordOut()` | `logAtBatEvent()`; hook state mutation; autosave | batter PA/AB and out-result bookkeeping, pitcher BF/outs/K as applicable, bases/outs/score/count update, scoreboard update, third-out inning transition | some out-type semantics depend on page-level defaults/prompts |
| `recordWalk` bundle | `recordWalk()` | `logAtBatEvent()`; hook state mutation; autosave | batter PA/BB/HBP, no AB, pitcher walk/HBP stats, forced runner advance, score/scoreboard update | IBB tracked through walk path, plus page-level mWAR logic |
| `recordD3K` bundle | `recordD3K()` | `logAtBatEvent()`; hook state mutation; autosave | strikeout always credited to batter/pitcher, batter may or may not reach first, outs may or may not increase | page-level callers decide `batterReached` |
| `recordError` bundle | `recordError()` | `logAtBatEvent()`; hook state mutation; autosave | batter PA/AB, no hit, fielding team error count, runner tracker marks batter as reached by error, score/scoreboard update | hook always places batter on first base |
| `recordEvent` bundle | `recordEvent()` | hook fame/player/pitcher state only; autosave if state changed | Fame event array, SB/CS player stats when `runnerId` exists, WP pitcher stat | live path still ends with `TODO: Log to separate event store`; `BETWEEN_PLAY_EVENTS` store exists but is not the normal write target |
| Runner-move bundle | `advanceRunner()` / `advanceRunnersBatch()` | hook state mutation; autosave | bases/outs/scoreboard/runner tracker update; third-out inning transition on baserunning out | no event-log write unless page separately also calls `recordEvent()` |
| Enrichment write | `updateAtBatEvent()` | direct IndexedDB update of an existing `AtBatEvent` | enriches field location, fielding sequence, pitch type, pitch count, K/Kc edit history, QAB flag | edit is post-hoc and only for plays already logged |
| Substitution bundle | `makeSubstitution()` / `switchPositions()` / `changePitcher()` | hook refs/state mutation; autosave | lineup state change, substitution log update, pitcher-change prompt, runner tracker inherited-runner handling | no `AtBatEvent`; change pitcher is deferred through pitch-count prompt |
| End-game bundle | `endGame()` then `completeGameInternal()` | `completeGame()`, season aggregation, `archiveCompletedGame()`, `clearCurrentGame()` | final archive, season stat aggregation, playoff updates, fielding tally resolution, manager-decision persistence, morale/narrative side systems | `endGame()` also calls `completeGameInternal()` directly to avoid unmount timing issues |

## Live Interaction Inventory

### 1. Fenway Board

| Control | Visible when | Handler chain | Writes | Downstream effects | Truth notes |
| --- | --- | --- | --- | --- | --- |
| Batter name tap | always | `FenwayBoard.onBatterTap` -> `handleBatterTap` -> `openPlayerCard` | UI only | opens `PlayerCardModal` for current batter | no stat/storage write |
| Pitcher name tap | only when `availablePitchers.length > 0` | `FenwayBoard.onPitcherTap` -> `handlePitcherTap` -> `handlePitcherSubstitution` -> `changePitcher` | substitution log later; pitch-count prompt; autosave when state mutates | begins pitching-change flow, records mWAR decision, updates pitcher/runner-tracker state after pitch-count confirmation | current implementation chooses the first available pitcher immediately; no chooser modal |

### 2. Center Field Surface (Current Live Wiring)

| Control | Visible when | Handler chain | Writes | Downstream effects | Truth notes |
| --- | --- | --- | --- | --- | --- |
| Runner icon tap | runner on base and field idle | `RunnerDragDrop.onRunnerTap` -> `handleRunnerTap` | UI only | opens `RunnerPopover` anchored to base | field drag is disabled, but runner taps remain live |
| Fielder icon tap | always | `FielderIcon.onClick` -> `handleFielderClick` -> page `handleFielderTap` when idle | UI only | opens `FielderPopover` anchored to fielder | because play-entry mode is disabled, fielder clicks mainly behave as management popovers |
| Batter icon tap | always | `BatterIcon.onClick` -> `onBatterTap` -> `handleBatterTap` | UI only | opens current batter player card | batter drag is disabled in current page |
| Main field tap for location enrichment | only while an enrichable play is open and `canUseMainFieldLocation` is true | `FieldCanvas.onFieldClick` -> `handleMainFieldLocationPick` -> `handleEnrichmentUpdate('fieldLocation')` -> `updateAtBatEvent()` | `AT_BAT_EVENTS` update | adds spray/location data to the selected logged play and flips play-log location flags | this is the main live use of the center field for data entry right now |

### 3. Runner Popover

| Control | Visible when | Handler chain | Writes | Downstream effects | Truth notes |
| --- | --- | --- | --- | --- | --- |
| `Steal` | runner popover open | `handleRunnerSteal` -> `advanceRunner(... safe)` + `recordEvent('SB')` | hook runner move; fame/player stats via `recordEvent`; autosave | runner advances one base; score/outs can change if scoring; stolen-base event attempted | `recordEvent('SB')` is called without `runnerId`, so SB stat/fame recipient attribution is incomplete |
| `Advance` / `Score` | runner popover open | `handleRunnerAdvance` -> `advanceRunner(... safe)` | hook runner move; autosave | manual safe advance without special event type | no event-log or between-play event write |
| `WP` | runner popover open | `handleRunnerWP` -> `advanceRunner(... safe)` + `recordEvent('WP')` | runner move; pitcher WP stat; autosave | runner advances on wild pitch; score may change | no dedicated between-play event record |
| `PB` | runner popover open | `handleRunnerPB` -> `advanceRunner(... safe)` + `recordEvent('PB')` | runner move; autosave | runner advances on passed ball | `recordEvent()` does not update a catcher PB stat path here |
| `Pickoff -> Safe` | pickoff submenu open | `handleRunnerPickoff(... 'safe')` -> `recordEvent('PICK_SAFE')` | fame/event state only | logs safe pickoff attempt, runner stays put | no official between-play store write |
| `Pickoff -> Out` | pickoff submenu open | `handleRunnerPickoff(... 'out')` -> `advanceRunner(... out)` + `recordEvent('PICK')` | runner move; autosave | runner is removed, outs increment, inning may end | page uses next-base target internally with outcome `out`; displayed effect is an out at the current base |
| `Pickoff -> Error` | pickoff submenu open | `handleRunnerPickoff(... 'error')` -> `advanceRunner(... safe)` + `recordEvent('PICK_E')` | runner move; autosave | runner advances on pickoff error | no fielding error is added to fielding stats from this path |
| `Sub` | runner popover open | `handleRunnerSubstitute` | UI only | opens lineup overlay with pinch-runner hint | actual pinch-run happens through lineup drag/drop, not from the popover itself |
| `Card` | when `onViewPlayerCard` provided | `handleRunnerPlayerCard` | UI only | opens player card for active runner | no direct stat write |
| outside click / `Escape` | popover open | `onClose` | UI only | closes popover | no side effects |

### 4. Fielder Popover

| Control | Visible when | Handler chain | Writes | Downstream effects | Truth notes |
| --- | --- | --- | --- | --- | --- |
| `Pinch Hit` | only when tapped fielder is also current batter | `handleFielderPinchHit` -> `handleLineupCardSubstitution` -> `makeSubstitution()` | substitution log; autosave | replaces current batter, may set `pendingPH`, may create mWAR decision | popover uses fielder context to initiate batting substitution |
| `Substitute` | always | `handleFielderSubstitute` -> `handleLineupCardSubstitution` -> `makeSubstitution()` | substitution log; autosave | defensive/player substitution with UI roster updates | no `AtBatEvent`; persistence is lineup state and autosaved current game |
| `Move Position` | always | `handleFielderMovePosition` -> `switchPositions()` | substitution log; autosave | reassigns fielding position without replacing player | position-switch truth lives in lineup refs/substitution log, not event log |
| `Player Card` | when provided | `handleFielderPlayerCard` | UI only | opens fielder player card | no stat write |
| modal `Cancel` / outside / `Escape` | modal or popover open | local close handlers | UI only | closes current popover/modal | no side effects |

### 5. Play Log Panel

| Control | Visible when | Handler chain | Writes | Downstream effects | Truth notes |
| --- | --- | --- | --- | --- | --- |
| Tap play row | `entry.isEnrichable` | `handleEntryTap` | UI only | opens `EnrichmentPanel` for that play | non-enrichable rows ignore taps |
| `K?` badge | only for `K` / `Kc` rows lacking K-type confirmation | `handleKToggle` -> `updateAtBatEvent({ result, editHistory })` | `AT_BAT_EVENTS` update | flips `K` <-> `Kc`, marks entry as typed | this is the real live K/Kc editing path |

### 6. Enrichment Panel

| Control | Visible when | Handler chain | Writes | Downstream effects | Truth notes |
| --- | --- | --- | --- | --- | --- |
| `Done` | panel open | `handleEnrichmentClose` | UI only | closes enrichment panel | no persistence on close itself |
| Main-field location tap | panel open on hit/out/HR result | `handleMainFieldLocationPick` -> `handleEnrichmentUpdate('fieldLocation')` | `AT_BAT_EVENTS` update | stores field location and marks play as location-enriched | current page prefers the big field over mini-diamond for location input |
| Fielding-sequence number buttons | when result supports fielding data | `handleEnrichmentUpdate('fieldingSequence')` | `AT_BAT_EVENTS` update | stores post-hoc fielding sequence and play-log flags | sequence builder supports `undo` and `clear` locally |
| HR distance input | HR enrichment open | `handleEnrichmentUpdate('hrDistance')` | `AT_BAT_EVENTS` update | stores post-hoc HR distance | validation range is 200-600 |
| Pitch type buttons | enrichable play open | `handleEnrichmentUpdate('pitchType')` | `AT_BAT_EVENTS` update | stores pitch type and play-log pitch-type flag | live for all enrichable play types |
| Pitches-in-AB input | enrichable play open | `handleEnrichmentUpdate('pitchesInAtBat')` | `AT_BAT_EVENTS` update, possible QAB update | stores pitch count and sets `isQualityAtBat` when `>= 7` | QAB flag is persisted post-hoc |
| `K (Swinging)` / `Kc (Called)` buttons inside panel | strikeout enrichment open | no-op button bodies | none | visual only | current panel buttons do not mutate state; the actual K edit is the play-log `K?` badge above |

### 7. Quick Bar

| Control | Visible when | Handler chain | Writes | Downstream effects | Truth notes |
| --- | --- | --- | --- | --- | --- |
| `K` | always | `handleQuickBarOutcome('K')` -> `recordOut('K', defaults)` | `AT_BAT_EVENTS`; hook state; autosave | strikeout/out recorded from default runner outcomes; play-log row added | no K/Kc distinction prompt here; `K?` can be edited later in play log |
| `GO` | always | `handleQuickBarOutcome('GO')` -> either `recordOut('GO')` or DP prompt | `AT_BAT_EVENTS`; hook state; autosave | groundout from calculated defaults | if defaults imply a runner out and outs `< 2`, page pauses for DP confirmation |
| `FO` | always | `handleQuickBarOutcome('FO')` -> either `recordOut('FO')` or SF prompt | `AT_BAT_EVENTS`; hook state; autosave | flyout from defaults | with `R3` and `< 2` outs, page pauses for SF vs FO decision |
| `LO` | always | `handleQuickBarOutcome('LO')` -> `recordOut('LO', defaults)` | `AT_BAT_EVENTS`; hook state; autosave | lineout from defaults | direct path, no extra prompt |
| `1B`, `2B`, `3B`, `GRD` | `1B`,`2B`,`HR` primary, `3B`,`GRD` overflow | `handleQuickBarOutcome()` -> `recordHit()` | `AT_BAT_EVENTS`; hook state; autosave | hit recorded with default runner advancement, RBI/runs/play-log entry | `GRD` uses `2B` runner defaults but play-log result stays `GRD` |
| `BB`, `HBP`, `IBB` | `BB` primary, rest overflow | `handleQuickBarOutcome()` -> `recordWalk()` | `AT_BAT_EVENTS`; hook state; autosave | walk/HBP/IBB recorded, forced advances applied, play-log row added | IBB also triggers page-level mWAR decision handling on the next resolved play |
| `HR` | primary | `handleQuickBarOutcome('HR')` -> opens HR prompt -> `handleHrPromptDone/Skip` -> `recordHit('HR')` | `AT_BAT_EVENTS`; possible enrichment write via `setNextEventEnrichment`; autosave | HR recorded after optional distance/pitch-type prompt; play-log row added | current page uses a prompt first instead of immediate commit |
| `E` | overflow | `handleQuickBarOutcome('E')` -> opens error flow -> `handleErrorFlowComplete` -> `recordError()` | `AT_BAT_EVENTS`; hook state; autosave | reached-on-error path, fielding sequence enrichment seeded, play-log row added | UI lets user choose `1B/2B/3B`, but `recordError()` always places batter on first; this is a real UI/persistence divergence |
| `FC` | overflow | `handleQuickBarOutcome('FC')` -> `recordOut('FC', defaults)` | `AT_BAT_EVENTS`; hook state; autosave | fielder's choice using calculated defaults | lead-runner details are defaulted, not explicitly attributed |
| `PO` | overflow | `handleQuickBarOutcome('PO')` -> either IFR prompt or `recordOut('PO')` | `AT_BAT_EVENTS`; hook state; autosave | popup/out path | with `< 2` outs and `R1+R2` or loaded, page prompts for IFR modifier |
| `DP`, `TP`, `SAC`, `SF` | overflow | `handleQuickBarOutcome()` -> usually `recordOut()` | `AT_BAT_EVENTS`; hook state; autosave | direct out scoring if not disabled | button availability is context-disabled by QuickBar rules before click |
| `D3K` | legacy hidden/manual path only if sent to handler | `handleQuickBarOutcome('D3K')` -> `recordD3K()` | `AT_BAT_EVENTS`; hook state; autosave | dropped-third-strike path | not present in current overflow menu; component comment says it was removed as redundant |
| `WP_K`, `PB_K` | overflow | `handleQuickBarOutcome()` -> `recordD3K(true)` | `AT_BAT_EVENTS`; hook state; autosave | strikeout with batter reaching | special hybrid result, not a normal WP/PB baserunning event |
| `...` overflow trigger | always | local `overflowOpen` state | UI only | opens/closes overflow popover | no persistence |
| `MM` lightning button | only when `managerMomentActive` | `setShowManagerMomentPanel` toggle | UI only | opens inline manager-moment decision panel | page-level panel is the actual decision action |

QuickBar context-disabling:

| Control | Disabled when |
| --- | --- |
| `SAC` | `outs >= 2` |
| `SF` | `outs >= 2` or no runner on third |
| `DP` | `outs >= 2` or no runners |
| `TP` | fewer than two runners |

### 8. Manager Moment Panel

| Control | Visible when | Handler chain | Writes | Downstream effects | Truth notes |
| --- | --- | --- | --- | --- | --- |
| `Call {decision}` | panel open and decision type present | page inline handler -> `mwarHook.recordDecision()` | manager decision storage in hook; later `saveGameDecisions()` at end game | records manager decision, queues it for resolution after next play, dismisses panel | no immediate `AtBatEvent` or current-game field write besides hook state |
| `Skip` | panel open | `mwarHook.dismissManagerMoment()` | UI/hook state only | closes panel and discards call opportunity | no persistence |

### 9. Bottom Action Strip

| Control | Visible when | Handler chain | Writes | Downstream effects | Truth notes |
| --- | --- | --- | --- | --- | --- |
| `LINEUP` | always | opens lineup overlay and sets hint | UI only | shows drag/drop substitution overlay | actual substitutions happen inside `LineupCard` |
| `+FLD` | always | opens first unenriched play, sets hint | UI only until subsequent enrichment edits | pushes user into enrichment workflow | does not itself write data |
| `+MOD` | always | toggles modifier tray | UI only | shows manual special-event tray | tray buttons below perform the actual writes |
| Undo button | when undo stack has entries | `undoSystem.UndoButtonComponent` -> `handleUndo` | hook state restore; play log local state trim | restores snapshot of game state, scoreboard, player stats, pitcher stats, runner tracker | undo restores hook truth but not event-log rows already written to IndexedDB |
| `END` | always | `setShowEndGameConfirmation(true)` | UI only | opens end-game confirmation modal | actual end-game writes are deferred |

Manual modifier tray:

| Control | Handler chain | Writes | Downstream effects | Truth notes |
| --- | --- | --- | --- | --- |
| `7+` | `triggerManualSpecialEvent('SEVEN_PLUS_PITCH_AB')` -> `handleSpecialEvent` -> `recordEvent()` | hook fame/event state only | records special-event marker | `recordEvent()` does not write `BETWEEN_PLAY_EVENTS` |
| `ROB` | `triggerManualSpecialEvent('ROBBERY')` -> `recordEvent()` | hook fame/event state only | robbery Fame event | actor attribution is partial unless fielder context is supplied |
| `KP` | `triggerManualSpecialEvent('KILLED_PITCHER')` -> `recordEvent()` | hook fame/event state only | killed-pitcher Fame event | recipient defaults to current batter in `recordEvent()` |
| `NUT` | `triggerManualSpecialEvent('NUT_SHOT')` -> `recordEvent()` | hook fame/event state only | nut-shot Fame event | same recipient caveat as above |
| `BT` | `triggerManualSpecialEvent('BEAT_THROW')` -> `recordEvent()` | hook state only | informational beat-throw event | no dedicated persisted event log row |
| `BUNT` | `triggerManualSpecialEvent('BUNT')` -> `recordEvent()` | hook state only | informational bunt event | no direct stat-category change beyond event marker |
| `TBL` | `triggerManualSpecialEvent('TOOTBLAN')` -> `recordEvent()` | hook fame/event state only | TOOTBLAN event | runner attribution depends on lead-runner inference, not a guaranteed exact runner ID |

### 10. Lineup Overlay and Lineup Card

| Control | Visible when | Handler chain | Writes | Downstream effects | Truth notes |
| --- | --- | --- | --- | --- | --- |
| overlay close `X` / outside click | lineup overlay open | `setShowLineupOverlay(false)` | UI only | closes overlay | no side effects |
| lineup row click | overlay open | `onPlayerClick` -> `setSelectedPlayer(...)` | UI only | opens player card for lineup player | current `LineupCard` header looks clickable but has no toggle callback in overlay mode |
| bench row click | overlay open | `onPlayerClick` | UI only | opens player card for bench player | no substitution unless dragged |
| bullpen row click | overlay open | `onPlayerClick` | UI only | opens pitcher card | no pitching change unless dragged or pitcher-name shortcut is used |
| drag lineup -> lineup | overlay open | `LineupCard.handleLineupDrop` -> confirm modal -> `handleLineupCardSubstitution(type='position_swap')` -> `switchPositions()` | substitution log; autosave | swaps positions | no `AtBatEvent` |
| drag bench -> lineup | overlay open | `LineupCard.handleLineupDrop` -> confirm modal -> `handleLineupCardSubstitution(type='player_sub')` -> `makeSubstitution()` | substitution log; autosave | lineup replacement, possible pending pinch hitter, local roster patch, mWAR decision | validation can reject sub silently except console warning |
| drag bullpen -> current pitcher slot | overlay open | `handlePitchingChange` -> confirm modal -> `handleLineupCardSubstitution(type='pitching_change')` -> `changePitcher()` | substitution log later; pitch-count prompt; autosave | begins pitching-change flow | actual state mutation waits on pitch-count confirmation/dismissal logic |
| sub confirm `CONFIRM` | pending sub open | `handleConfirmSub` | as above | commits selected substitution | modal simply packages the underlying sub type |
| sub confirm `CANCEL` | pending sub open | `handleCancelSub` | UI only | closes confirmation modal | no side effects |

### 11. Player Card Modal

| Control | Visible when | Handler chain | Writes | Downstream effects | Truth notes |
| --- | --- | --- | --- | --- | --- |
| modal close `X` / outside click | player card open | `onClose` | UI only | closes player card | no stat writes |
| tap current mojo row | current mojo available | local edit toggle | UI only | opens mojo picker | live write happens on a picker choice |
| choose mojo value | mojo picker open | `playerStateHook.setMojo()` | player-state store/hook | updates current mojo state for that player | player card stats shown above are still placeholder values, not live stat maps |
| tap current fitness row | current fitness available | local edit toggle | UI only | opens fitness picker | live write happens on a picker choice |
| choose fitness value | fitness picker open | `playerStateHook.setFitness()` | player-state store/hook | updates current fitness state | season/game stat blocks in modal are currently hard-coded placeholders |

### 12. End-Game and Prompt Modals

| Control | Visible when | Handler chain | Writes | Downstream effects | Truth notes |
| --- | --- | --- | --- | --- | --- |
| end-game `CANCEL` | end-game confirmation open | closes modal | UI only | aborts end-game flow | no side effects |
| end-game `END GAME` | end-game confirmation open | if unenriched plays exist -> post-game enrich prompt, else `handleEndGame()` | end-game bundle | finalization path begins | unenriched check only looks at pitch type and location in this modal, not all enrichment fields |
| post-game `ENRICH` | post-game enrich prompt open | closes prompt, closes end-game modal, opens first unenriched play | UI only until user edits enrichment | routes user back into enrichment | does not end game yet |
| post-game `CONTINUE` | post-game enrich prompt open | `handleEndGame()` | end-game bundle | finalizes game and navigates onward | outside click on this prompt also continues/end-games |
| HR prompt `Done` | HR prompt open | `handleHrPromptDone` -> optional `setNextEventEnrichment` -> `recordHit('HR')` | `AT_BAT_EVENTS`; autosave | commits HR with optional distance/pitch type | enrichment is injected before the hit is logged |
| HR prompt `Skip` / outside click | HR prompt open | `handleHrPromptSkip` -> `recordHit('HR')` | `AT_BAT_EVENTS`; autosave | commits HR without optional enrichment | outside click is treated as skip |
| Error flow base buttons `1B/2B/3B` | error prompt step `base` | local prompt state only | UI only | advances prompt to fielder selection | selected base is not honored by hook persistence later |
| Error flow fielder buttons `1-9` | error prompt step `fielder` | local prompt state only | UI only | advances prompt to error type selection | no stat write yet |
| Error flow type buttons `Fielding/Throwing/Mental` | error prompt step `type` | `handleErrorFlowComplete` -> `recordError()` | `AT_BAT_EVENTS`; autosave | commits reached-on-error play | selected base reached is only reflected in page-local text/hinting, not hook base placement |
| Error flow `Cancel` | error prompt open | clears prompt | UI only | aborts error flow | no side effects |
| SF prompt `Yes - SF` | SF prompt open | `handleSfPromptAnswer(true)` -> `recordOut('SF')` | `AT_BAT_EVENTS`; autosave | sac fly with RBI/run | play-log row added |
| SF prompt `No - FO` | SF prompt open | `handleSfPromptAnswer(false)` -> `recordOut('FO')` | `AT_BAT_EVENTS`; autosave | ordinary flyout | play-log row added |
| DP prompt `Yes - DP` | DP prompt open | `handleDpPromptAnswer(true)` -> `recordOut('DP')` | `AT_BAT_EVENTS`; autosave | double play | play-log row added with zero RBI |
| DP prompt `No - GO` | DP prompt open | `handleDpPromptAnswer(false)` -> `recordOut('GO')` | `AT_BAT_EVENTS`; autosave | ordinary groundout | play-log row added |
| IFR prompt `Yes - IFR` | IFR prompt open | `handleIfrPromptAnswer(true)` -> `setNextEventEnrichment({ modifiers:['ifr'] })` -> `recordOut('PO')` | `AT_BAT_EVENTS`; autosave | popup recorded with IFR modifier | IFR is currently an enrichment modifier layered onto a `PO` result |
| IFR prompt `No - PO` | IFR prompt open | `handleIfrPromptAnswer(false)` -> `recordOut('PO')` | `AT_BAT_EVENTS`; autosave | ordinary popup | play-log row added |
| detection `Confirm` | detection toast open | `handleDetectionConfirm` | fame-event state | records detected Fame event and removes prompt | this is not an `AtBatEvent` edit; it appends to Fame state only |
| detection `Dismiss` | detection toast open | `handleDetectionDismiss` | UI/hook state only | removes detection prompt | no persistence |
| pitch-count `Confirm` | pitch-count prompt open | `confirmPitchCount()` -> maybe pending action | pitcher stat update; autosave; maybe end-inning/end-game continuation | sets pitch count, can award immaculate inning Fame, then executes deferred action | for end-game, page also directly calls `completeGameInternal()`, so this prompt is partly bypassed |
| pitch-count `Dismiss` | pitch-count prompt open | `dismissPitchCountPrompt()` | maybe none, maybe pending action cancellation | for `end_inning` it still proceeds; for `pitching_change` and `end_game` it cancels pending action | `end_game` cancellation is weakened by direct `completeGameInternal()` call from page path |

## Dormant or Component-Only Controls Present in Code But Not Live From Current Page

These controls exist in `EnhancedInteractiveField.tsx`, but the current page render does not expose them because `hideActionSelector={true}` disables the legacy field-first play-entry flow.

| Dormant control/path | Why it is dormant in current page | What it would do if re-enabled |
| --- | --- | --- |
| `ActionSelector` (`HIT`, `OUT`, strikeout, `OTHER`) | rendered only when `flowStep === 'IDLE' && !hideActionSelector` | starts the full 5-step field-first play lifecycle |
| Batter drag to base / field | `BatterIcon.draggable={legacyFieldFlowEnabled}` and drop zone disabled | would drive `BatterReachedPopup`, ball-location capture, hit/error/FC flows |
| Fielder drag to ball location | `FielderIcon.draggable={legacyFieldFlowEnabled}` and drop zone disabled | would build fielding sequence and out classification flow |
| Field-drop driven `HIT_LOCATION`, `OUT_FIELDING`, `HIT_OUTCOME`, `OUT_OUTCOME`, `RUNNER_CONFIRM` lifecycle | same gating as above | would eventually call `onPlayComplete()` with richer `PlayData` than QuickBar |
| Internal Left/Right foul quick-button groups | component defines them, but current render does not mount them | would provide BB/HBP/K/HR and special-event buttons directly on the field |
| Internal modifier popups (`InjuryPrompt`, `StarPlaySubtypePopup`, `ErrorTypePopup`) | depend on dormant field-first lifecycle to open | would enrich play-contextual special events from the field surface |
| Mini-diamond location picker inside `EnrichmentPanel` | current page passes `useMainFieldForLocation={true}` for all location-capable entries | would allow location edits from the side panel instead of the main field |

## Highest-Signal Gaps Revealed By The Inventory

1. The center field component contains a much larger play-entry engine than the current page actually uses. In the live page, QuickBar is the real at-bat entry surface; the field is mostly for popovers and enrichment.
2. `recordEvent()` is still not the normal writer for `BETWEEN_PLAY_EVENTS`, so runner events and manual modifiers are not getting a separate persisted event ledger even though the store exists.
3. The QuickBar error flow overpromises. The UI lets the scorer choose batter reached `1B/2B/3B`, but `recordError()` always places the batter on first.
4. Runner popover SB/CS/pickoff paths mutate bases and outs correctly, but player attribution is incomplete because `recordEvent()` is usually called without a runner ID.
5. Undo restores hook/page state but does not roll back already-written IndexedDB event rows, so hook truth and event-log truth can diverge after undo-heavy sessions.
6. The player card is operational for mojo/fitness editing, but the stat panels shown in it are placeholder zero-value displays, not live game or season stat truth.
