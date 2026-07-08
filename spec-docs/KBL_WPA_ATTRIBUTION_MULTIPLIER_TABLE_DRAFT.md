# KBL WPA Attribution Multiplier Table Draft

**SUPERSEDED (2026-07-08): not a source of truth — describes the RETIRED tactical+lineup_delta architecture; governed by MWAR_STEP1_CONTRACT.md + V1_CANON_2026-07-07.md §6 MOY ruling per SOT_REGISTER_2026-07-08.md.**

## New Thread Implementation Prompt

Use this document to implement KBL WPA attribution for Elimination Mode bracket/tourney storytelling.

Start with the WPA foundation, not manager WPA. First fix post-play edit behavior so any state-changing edit refreshes stored `winProbabilityBefore`, `winProbabilityAfter`, `wpa`, and related leverage/display fields. Then build a derived KBL WPA attribution engine for batting, pitching, catching, fielding, and baserunning from the current event log, enrichment data, linked fielding events, runner outcomes, and between-play events.

Manager WPA should remain overlay-only or disabled from collapsed totals in the first implementation. Keep the output shape ready for `role: 'managing'`, but do not wire manager WPA into awards, leaderboards, or Almanac totals until the core player attribution has been audited against real completed games.

Core implementation requirements:

1. Actual play WPA comes from the current before/after game state. Stored WPA fields should be refreshed on state-changing edits and treated as cache/display fields, not as an independent source of truth.
2. Ordinary plays use ratio allocation against the play budget.
3. Errors, bad throws rescued by scoops, and other blame/credit moments use signed raw-unit allocation normalized back to the actual play budget.
4. Counterfactual moments, especially robbed HR and saved bases, use counterfactual delta allocation and may assign more than 100% credit or negative credit to involved players while still conserving the actual play budget.
5. Routine force throws received at first base earn the first baseman no WPA unless the first baseman fielded the ball, made an unassisted/tag play, received explicit scoop/stretch/rescue/gem credit, or made a non-routine attempt.
6. Post-play attribution-only edits, such as changing `routine` to `diving`, should immediately change KBL attribution everywhere even when actual play WPA does not change.
7. Game Detail, Postgame, Almanac, and bracket/tourney award surfaces should all read from the same attribution derivation function.

Recommended first audit cases: routine `5-3`, `5-3` with 1B scoop/gem, `5-3` with primary 3B gem, K/Kc catcher 5%, robbed HR counterfactual, runner scores from first on a single, caught stealing, wild pitch, passed ball, TOOTBLAN, and Out Advancing.

Purpose: define a reviewable first-pass multiplier system for attributing KBL WPA to batting, pitching, fielding, baserunning, and managing from the existing GameTracker event/enrichment model.

This is intended for Elimination Mode bracket/tourney storytelling. It is not WAR and should not be treated as season-scale value.

## Core Rules

1. Derive actual WPA from the current event's before/after state. Treat stored `event.wpa` as a cache/display value until all post-play edit paths recompute it during save.
2. Store player credit from the player's team perspective:
   - Batting team budget: `battingWpa`
   - Defensive team budget: `defensiveWpa = -battingWpa`
   - If offense gains `+0.120`, defense sums to `-0.120`.
3. Side totals should conserve:
   - Offensive player/manager credits sum to `battingWpa`.
   - Defensive player/manager credits sum to `defensiveWpa`.
4. Most ordinary plays use percentage splits, but the system is not percentage-only. Counterfactual, error, rescue, and runner-delta moments use budget-conserved raw/delta math.
5. A routine force throw received at first earns the receiving fielder no WPA. The fielder who fields/throws gets the routine fielding share. The receiver only earns WPA for an unassisted play, tag, scoop/stretch/rescue, non-routine attempt, or explicit/extra gem credit.
6. Manager WPA is a separate decision lens until the collapsed-total behavior is explicitly chosen. It can be displayed as an overlay without altering player WPA, or it can steal from linked player/team buckets in a budget-conserved manager-inclusive mode.

## Budget And Allocation Model

Each play starts with one circumstantial WPA budget from the game state. This budget already accounts for inning, score, outs, base state, home/away context, and leverage.

```text
battingWpa = winProbabilityAfter - winProbabilityBefore, from the batting team's perspective
defensiveWpa = -battingWpa
```

KBL attribution uses three allocation modes:

| Mode | Used for | How it works | Conserves actual play budget? |
| --- | --- | --- | ---: |
| Ratio allocation | Normal batting, pitching, fielding, baserunning splits | Split the actual side budget by percentage, such as pitcher 95% / fielder 5%. | Yes |
| Signed raw-unit allocation | Errors, bad throws rescued by scoops, difficult plays with blame/credit on both sides | Assign signed raw units, then normalize those units to the actual side budget. | Yes |
| Counterfactual delta allocation | Robbed HR, saved bases, plays where one player prevents a different expected outcome | Compute actual WPA and a counterfactual WPA, assign the counterfactual cost/benefit to the responsible player, and give the residual to the saver/creator. | Yes |

So the answer is: ordinary allocation is percentage-driven, but counterfactuals are not fixed ratios. They are unique to game situation because the counterfactual WPA is unique to game situation.

Example, robbed HR:

```text
Actual defensive budget: +0.180
Counterfactual HR defensive budget: -0.450
Pitcher: -0.450
Fielder: +0.630
Total: +0.180
```

The fielder receives more than the actual play budget because the fielder erased a counterfactual HR. The pitcher receives negative WPA because the pitcher allowed the counterfactual HR-quality event. The total still equals the actual defensive budget.

Example, routine throwing error:

```text
Actual defensive budget: -0.120
Raw units: pitcher +0.95, thrower -2.05, receiver +0.10
Raw total: -1.00
Normalized credits: pitcher +0.114, thrower -0.246, receiver +0.012
Total: -0.120
```

The pitcher can get positive credit inside a negative defensive play because he induced an expected out; the thrower gets enough negative credit to reconcile the actual outcome.

## Available GameTracker Inputs

### At-bat result

`1B`, `2B`, `3B`, `HR`, `ITPHR`, `GRD`, `BB`, `IBB`, `HBP`, `K`, `Kc`, `Ꝁ`, `D3K`, `WP_K`, `PB_K`, `GO`, `FO`, `FLO`, `LO`, `PO`, `DP`, `TP`, `SF`, `SAC`, `E`, `FC`.

### Enrichment axes

Contact type persisted through `enrichment.exitType`: `weak`, `normal`, `hard`, `bloop`, `bunt`.

Fielding attempt/play type: `routine`, `charging`, `running`, `diving`, `leaping`/`jumping`, `sliding`, `over_shoulder`, `wall`, `robbed_hr`, `failed_robbery`, `beat_runner`, `beat_throw`, `missed_dive`, `missed_leap`.

Play mechanic: `routine`, `relay`, `rundown`, `tag_play`, `unassisted`, `deflection`, `hold`.

Fielding sequence: position-number chain, such as `5-3`, `6-4-3`, `8-2`, `3U`.

Other: `extraGemCreditPositions`, `savedRun`, `basesSaved`, `runnerOutcomes`, runner-level `fieldingSequence`, runner-level `isTootblan`, runner-level `isOutAdvancing`, runner-level `errorType/errorChargedTo`, between-play runner attribution, current/historical catcher.

## Resolution Order

1. Recompute actual WPA from before/after state.
2. Classify event family from result.
3. Identify whether the play uses ratio allocation, signed raw-unit allocation, or counterfactual delta allocation.
4. Apply explicit corrections/errors first.
5. Apply counterfactual specials: robbed HR, failed robbery, saved bases, bad throw rescued by later gem.
6. Apply contact and fielding attempt multipliers.
7. Apply sequence rules, including routine first-base receive = zero.
8. Apply runner-default delta rules.
9. Apply manager decision overlay if linked.
10. Normalize credits so each side budget is conserved.

## Defensive Base Split

These are default shares of the defensive budget before contact/attempt/sequence modifiers.

| Result family | Default defensive allocation | Notes |
| --- | ---: | --- |
| `K`, `Kc`, `Ꝁ` | Pitcher 95%, catcher 5% | Catcher receives pitch-calling/framing credit once catcher identity is durable. |
| `BB`, `HBP` | Pitcher 100% | No catcher credit. |
| `IBB` | Manager 100% | If no manager attribution exists, store as team-manager bucket. |
| Over-fence `HR` | Pitcher 100% negative | Unless failed robbery/robbed HR context exists. |
| Plain `1B`, `2B`, `3B`, `GRD`, `ITPHR` | Pitcher 100% negative | Fielders are not blamed for clean hits without explicit missed/error enrichment. |
| Routine `GO`, `FO`, `FLO`, `LO`, `PO` | Pitcher 95%, fielders 5% | Hard routine contact can shift to 90/10. |
| Routine `FC` | Pitcher 90%, fielders 10% | Fielders chose/finished a force play. |
| Routine `DP` | Pitcher 80%, fielders 20% | Turning two is above a normal one-out routine play. |
| Routine `TP` | Pitcher 60%, fielders 40% | Triple plays are primarily defensive execution. |
| `SAC` | Pitcher 90%, fielders 10% | If manager bunt call exists, manager overlay may apply; steal only in manager-inclusive mode. |
| `SF` | Pitcher 90%, fielders 10% | If run scores, offensive side is split batter/runner. |
| `E` / reached on error | Signed special case | Pitcher can get positive expected-out credit; error fielder gets larger negative credit. |
| `D3K` | Signed special case | If batter reaches, catcher/pitcher blame depends on `WP_K`/`PB_K`/D3K classification. |
| `WP_K` | Pitcher 95% negative, catcher 5% negative | Pitcher owns wild pitch result. |
| `PB_K` | Catcher 95% negative, pitcher 5% negative | Catcher owns passed ball result. |

## Contact Modifier

Apply after the result-family default. These modify the fielding share on made outs.

| Contact type | Routine made out | Non-routine made out | Clean hit | Notes |
| --- | ---: | ---: | ---: | --- |
| `weak` | Fielder share -2 pts, pitcher +2 pts | Fielder share -5% relative | Pitcher still owns clean-hit blame | Weak contact is mostly pitcher credit. |
| `normal` | No change | No change | No change | Default. |
| `hard` | Fielder share +5 pts, pitcher -5 pts | Fielder share +10% relative | Pitcher still owns clean-hit blame unless missed/error | Hard at-'em balls can be routine but deserve more fielding credit. |
| `bloop` | Fielder share +0-5 pts if caught | No change | Pitcher 80%, nearest/inferred fielder 20% negative only if a reasonable play existed | Use low confidence if no fielder is explicit. |
| `bunt` | Use SAC/bunt table | Use SAC/bunt table | Batter/runner speed table | Bunt fielding is usually fielding/runner execution. |

Clamp ordinary made-out pitcher/fielder shares to `pitcher 5-99%` and `fielders 1-95%`, except explicit counterfactual specials.

## Fielding Attempt Modifier For Made Outs

This table replaces the ordinary routine fielder share when a specific attempt is logged.

| Fielding attempt/play type | Pitcher share | Fielding share | Notes |
| --- | ---: | ---: | --- |
| `routine` | 95% | 5% | Final routine receiver at first gets 0. Hard contact can make this 90/10. |
| `charging` | 80% | 20% | Fielder created time/angle value. |
| `beat_runner` | 20% | 80% | Similar to charging; fielder beat runner with execution. |
| `running` | 70% | 30% | Range play but not full gem. |
| `beat_throw` | 70% | 30% | Use mostly on offensive safe result; on defensive out this rewards execution. |
| `diving` | 25% | 75% | Fielder owns the play. |
| `sliding` | 25% | 75% | Fielder owns the play. |
| `leaping` / `jumping` | 25% | 75% | Fielder owns the play. |
| `over_shoulder` | 50% | 50% | Fielder owns the play. |
| `wall` | 90% | 10% | Pitcher owns most wall-play credit; fielder receives execution share unless logged as robbed HR. |
| `robbed_hr` | Counterfactual | Counterfactual | Pitcher negative, fielder above full credit. |

## Missed Attempts And Errors

Raw units are normalized to the defensive side budget. Positive units help defense; negative units hurt defense.

| Scenario | Raw defensive units | Notes |
| --- | --- | --- |
| Clean hit, no attempt/error | Pitcher `-1.00` | Normal hit blame. |
| Missed dive/leap/sliding, no error | Pitcher `-1.00`, fielder `0.00` | Do not punish extraordinary attempt. |
| Failed robbery, HR stands | Pitcher `-1.00`, fielder `0.00` | Optional low-confidence fielder `-0.05` only if user wants failed robbery blame. |
| Routine fielding error | Pitcher `+0.95`, error fielder `-1.95` | Pitcher induced expected out; fielder flipped it. |
| Routine throwing error | Pitcher `+0.95`, thrower `-2.05`, receiver `+0.10` if catchable effort logged | Throwing errors cost slightly more. |
| Mental error | Pitcher `+0.95`, error fielder `-2.20` | Larger blame. |
| Difficult error | Pitcher `+0.40`, fielder `-1.40` | Lower fielder penalty because play was hard. |
| Runner error on advancement | Pitcher/fielder normal result units plus charged fielder `-1.00` runner-delta units | Apply to runner advancement delta, not the whole PA if possible. |

## Bad Throw Rescued By Scoop/Stretch

This is now stored directly with the at-bat enrichment as `rescuedThrow: true` when the UI's **1B Rescued Throw** control is selected. Older/eventually migrated data can still be inferred when a later fielder in the sequence gets gem credit on a force-at-first play.

| Logged shape | Inference | Raw defensive units |
| --- | --- | --- |
| `5-3` routine GO, no extra gem | Routine force at first | Pitcher `+0.95`, 3B `+0.05`, 1B `0.00` |
| `5-3` GO, `rescuedThrow: true` | 1B bailed out throw | Pitcher `+0.80`, 3B `-0.40`, 1B `+0.60` |
| `5-3` GO, gem/play type on `5` | 3B made the gem | Pitcher `+0.25`, 3B `+0.75`, 1B `0.00` |
| `6-3` GO, `rescuedThrow: true` | 1B scoop/stretch | Pitcher `+0.80`, SS `-0.40`, 1B `+0.60` |
| `4-3` GO, `rescuedThrow: true` | 1B scoop/stretch | Pitcher `+0.80`, 2B `-0.40`, 1B `+0.60` |
| `3U` routine GO | 1B fielded it | Pitcher `+0.95`, 1B `+0.05` |
| `3-1` routine GO | 1B fielded/threw, pitcher received | Pitcher-as-pitcher `+0.95`, 1B `+0.05`, pitcher-as-receiver `0.00` |

UI status: force-at-first throw chains expose a **1B Rescued Throw** control. This should set `rescuedThrow: true` and re-run KBL WPA allocation without changing box-score state.

## Sequence Split Within The Fielding Share

Apply after determining the total fielding share.

| Sequence shape | Fielding share split |
| --- | --- |
| Single fielder out | Primary fielder 100% of fielding share. |
| Routine `X-3` force at first | Throwing/fielding fielder 100%; final `3` receiver 0%. |
| Routine `3U` | 1B 100% of fielding share. |
| Routine `3-1` | 1B 100% of fielding share; pitcher receiver 0% fielding share. |
| Non-routine final receive at first with receiver gem | Use bad-throw-rescued table. |
| Standard two-fielder force not ending at first | Assist 65%, putout/tag 35%. |
| `6-4-3` / `4-6-3` DP | Starter 45%, pivot 55%, first-base receiver 0%. |
| Other DP ending at first | Starter 50%, middle/pivot 50%, first-base receiver 0%. |
| DP with gem on starter | Starter 80%, pivot 20%, receiver 0%. |
| DP with gem on pivot | Starter 30%, pivot 70%, receiver 0%. |
| Unassisted DP | Fielder 100% of fielding share. |
| Triple play | Split by outs: first out 30%, second out 35%, third out 35%; gem overrides toward gem fielder. |
| Relay | Initial thrower 60%, relay/cutoff 20%, tag/putout 20%. |
| Rundown | Split evenly across unique fielders unless one has gem/error. |
| Tag play | Thrower 65%, tagger 35%; if tagger gem, 50/50. |
| Deflection | Deflector 40%, finishing fielder(s) 60%. |
| Hold / saved base | Holding fielder 100% of base-save fielding credit. |

## Robbed Homer Counterfactual

Preferred formula:

1. Compute actual defensive budget from actual play.
2. Compute counterfactual defensive budget if the same ball had been a HR.
3. Give pitcher the counterfactual HR defensive budget.
4. Give fielder `actualDefensiveBudget - pitcherCounterfactualBudget`.

Example:

```text
Actual defensive budget: +0.180
Counterfactual HR defensive budget: -0.450
Pitcher: -0.450
Fielder: +0.630
Total: +0.180
```

Fallback if counterfactual WPA is not implemented yet:

| Scenario | Raw defensive units |
| --- | --- |
| Robbed HR | Pitcher `-0.50`, fielder `+1.50` |
| Robbed grand slam / saved game-ending HR | Pitcher `-0.75`, fielder `+1.75` |

## Offensive Batter/Runner Split

The offensive side allocates `battingWpa`.

| Offensive event | Batter share | Runner share | Manager share | Notes |
| --- | ---: | ---: | ---: | --- |
| HR over fence | 100% | 0% | 0% | Batter owns all offensive WPA. |
| ITPHR | 70% | 30% batter-as-runner | 0% | Contact plus running; tune if too cute. |
| Clean `1B`, `2B`, `3B`, `GRD` with default runner advances | 100% | 0% | 0% | Default advancement belongs to the batted ball. |
| Runner takes one extra base beyond default | 30% of extra delta | 70% of extra delta | 0% | If hard/gap contact, shift to 50/50. |
| Runner scores from first on single | 40% of extra delta | 60% of extra delta | 0% | More batter credit if contact is hard/gap. |
| Runner held by OF | Batter owns actual hit value | Runner 0% | 0% | Defensive fielder gets base-save credit on defense side. |
| Runner thrown out advancing | Batter keeps hit value | Runner owns negative delta | Manager optional if marked out advancing | Defense side credits throw/tag. |
| TOOTBLAN | Batter keeps batted-ball value | Runner 100% negative delta | 0% | Runner fault. |
| Out Advancing | Batter keeps batted-ball value | Runner 30% negative delta | Manager 70% negative delta | UI already labels manager fault. |
| Productive GO runner scores | Batter 70% of positive offensive delta | Runner 30% | 0% | Tune by contact/speed later. |
| SF runner scores | Batter 70% | Runner 30% | 0% | If runner tagged from 2B/home on unusual play, runner share can rise. |
| SAC bunt | Batter 70% | Runner 30% | Manager overlay if bunt call linked | Sacrifice is intentional team play; steal only in manager-inclusive mode. |
| BB/HBP forced advance | Batter 100% | Forced runners 0% | 0% | Batter/pitcher event. |
| IBB | Batter 100% offense | 0% | Defensive manager 100% negative | Batter is still the offensive beneficiary. |

## Between-Play Runner Events

Use a synthetic before/after WPA calculation from `BetweenPlayEvent.gameState` and `runnerAction`.

| Event | Offensive allocation | Defensive allocation |
| --- | --- | --- |
| Successful steal | Runner 100% | Pitcher `-55%`, catcher `-45%`; if fielder error/late tag logged, charged fielder steals from catcher. |
| Caught stealing | Runner 100% negative | Catcher `+95%`, pitcher `+5%`. |
| Pickoff out | Runner 100% negative | Pitcher `+80%`, tag fielder `+20%`. |
| Pickoff safe, no error | Runner 100% positive if base gained; otherwise no WPA | Pitcher/catcher/fielder negative by attribution if base gained. |
| Pickoff error | Runner 25% positive, error-created delta 75% | Charged defender 100% negative of defensive side. |
| Wild pitch | Runner 100% positive | Pitcher 100% negative. |
| Passed ball | Runner 100% positive | Catcher 100% negative. |
| Balk | Runner 100% positive | Pitcher 100% negative. |
| Runner advance | Runner 100% unless fielding attribution/error says otherwise | Credited/blamed fielder from attribution. |
| Defensive indifference | No player WPA by default | Team-context only unless user wants runner credit. |

## Manager WPA Logic

Status: needs product decision before leaderboard/almanac use.

Recommended first implementation: calculate manager WPA as a separate decision overlay, not part of the collapsed player KBL WPA total. This gives us managing as a visible story category without double-counting player totals. A later manager-inclusive mode can subtract the manager share from the linked player/team bucket to keep one collapsed number budget-conserved.

Manager attribution should require an explicit or strongly implied decision marker. Do not infer manager credit from every substitution or lineup state by default.

| Manager moment | Decision marker required | Overlay share | Collapsed-manager behavior if enabled | Risk / consequence |
| --- | --- | ---: | --- | --- |
| IBB | Intentional walk result | 100% of defensive WPA | Manager/team bucket owns defensive side; pitcher gets 0 unless pitch execution is tracked. | Cleanest manager case, but requires durable manager/team bucket if no manager identity exists. |
| Out Advancing | `isOutAdvancing` or equivalent manager-fault flag | 70% of negative runner delta | Steal from runner's negative baserunning WPA. | Should only apply when scorer explicitly says it was a bad send/decision. |
| Steal call | Explicit steal/send decision, if tracked | 20% of SB/CS runner WPA | Steal from runner's baserunning WPA. | Without explicit call, runner owns it. |
| Bunt/squeeze call | Explicit bunt/squeeze decision or sacrifice context | 25% of offensive bunt/squeeze WPA | Steal from batter/runner offensive WPA. | Sac results alone may over-credit manager if not actually called. |
| Pinch hitter PA | Explicit PH event | 15% of pinch hitter batting WPA on linked PA | Steal from pinch hitter batting WPA. | Outcome-based personnel credit can be noisy in one PA. |
| Pinch runner event | Explicit PR event | 20% of pinch runner baserunning WPA on linked runner event | Steal from pinch runner baserunning WPA. | Safer when linked to SB, score-from-first, TOOTBLAN, or out advancing. |
| Pitching change | Explicit pitching change before linked PA | 15% of incoming pitcher's pitching WPA on next completed PA or inning-ending sequence | Steal from pitcher's pitching WPA. | High narrative value, high noise; keep overlay-only at first. |
| Leave pitcher in | Explicit mound/manager decision, if tracked | 15% of current pitcher's pitching WPA on next completed PA | Steal from pitcher's pitching WPA. | Should not be inferred merely because pitcher remained in game. |
| Defensive sub | Explicit defensive substitution | 15% of substitute fielder's fielding WPA on linked fielding play | Steal from substitute fielder's fielding WPA. | Needs tight link window to avoid hindsight credit. |
| Position change | Explicit position change | 10% of moved fielder's fielding WPA on linked fielding play | Steal from moved fielder's fielding WPA. | Low-confidence unless UI records the move as strategic. |

Open manager decisions:

1. Should manager WPA appear in the same leaderboard as players, or only as a separate manager/story category?
2. If no manager identity exists, should credits go to a `Team Manager` bucket, the team, or remain hidden from leaderboard surfaces?
3. Which manager moments are explicitly tracked today versus inferred from game state?
4. Should personnel decisions use only the next PA/event, or a short window such as next three batters / rest of inning?

## Coverage Matrix

For any at-bat:

1. If result is non-BIP, use non-BIP table.
2. If result is a hit, use clean-hit table unless fielding attempt/error/runner correction adds a defensive modifier.
3. If result is an out, use result-family split, then contact modifier, then fielding attempt modifier, then sequence split.
4. If result is `E` or reached-on-error, use signed error units.
5. If `robbed_hr`, use counterfactual robbed-HR logic.
6. If runner outcomes differ from defaults, allocate the delta through the offensive runner table and defensive fielding/runner-event table.
7. If a manager decision is linked, generate a manager overlay by default. Only steal from linked player/team buckets if manager-inclusive collapsed mode is enabled.

Fallback when data is missing:

| Missing data | Fallback |
| --- | --- |
| No enrichment on BIP out | Treat as routine normal contact. |
| No fielding sequence on out | Pitcher 100% defensive WPA, low confidence. |
| No catcher identity on K | Pitcher 100%, low confidence until catcher snapshot exists. |
| No runner outcome details | Batter owns default offensive WPA. |
| No fielder on runner event | Use pitcher/catcher attribution if present; otherwise team bucket. |
| Unknown contact/attempt/mechanic | Ignore modifier, keep result-family default. |

## Post-play Edit Recalculation

KBL WPA attribution must be derived from the current persisted event log, not frozen at the time the play was first recorded.

The existing GameTracker edit model is mostly the right source-of-truth pattern:

1. Enrichment panel edits persist back onto the `AtBatEvent`.
2. Fielding detail edits that call `updateAtBatEventWithFieldingSync` also rewrite the linked `FieldingEvent[]`.
3. Runner sub-entry edits persist runner outcomes and update the event's after-state fields.
4. KBL WPA should attach to this same event-data lifecycle. It should not introduce a separate manual WPA record that can drift from the play detail.

Required code fix: post-play edits that change game state must also refresh the event's stored win-probability fields. That means saving recalculated `winProbabilityBefore`, `winProbabilityAfter`, `wpa`, and any related leverage/display fields whenever a correction changes outs, score, base state, batter/runner result, or the before/after state used by the WPA engine.

KBL WPA should still be implemented as a single derivation function over the current event log. That function can recompute actual WPA from current before/after state as a guardrail, but stale stored WPA should be treated as a bug to fix, not as a permanent modeling assumption.

Example:

```text
Original entry: routine FO, catch made
Three plays later edit: diving, catch made
Expected result: actual play WPA stays the same, but attribution changes from pitcher-heavy to fielder-heavy.
```

Post-play edits should trigger these behaviors:

| Edited field | Actual play WPA changes? | Attribution changes? | Required action |
| --- | ---: | ---: | --- |
| Contact type, such as `normal` to `hard` | No | Yes | Re-run KBL attribution from current event/enrichment. |
| Fielding attempt, such as `routine` to `diving` | No | Yes | Re-sync fielding events and re-run KBL attribution. |
| Fielding attempt outcome, such as `missed` to `made` | Usually yes if result also changes; otherwise no | Yes | If result/state changed, refresh stored WPA fields; always re-run attribution. |
| Fielding sequence, such as `5-3` to `6-3` | No | Yes | Re-sync fielding events and re-run attribution. |
| Extra gem credit / scoop-rescue marker | No | Yes | Re-run attribution; no box-score state change. |
| Error charged to fielder | Often yes if runner/batter state changed | Yes | Re-sync fielding events; refresh stored WPA fields if outs/runners/score changed. |
| Runner destination correction | Yes | Yes | Refresh stored before/after WPA fields and re-run attribution. |
| TOOTBLAN / Out Advancing flags | Yes if out/run semantics changed | Yes | Refresh stored WPA fields if state changed; re-run attribution and manager split. |
| Manager moment link/edit | No | Yes | Re-run attribution with manager share overlay. |

Implementation requirement:

1. Fix state-changing edit saves so they recompute and persist `winProbabilityBefore`, `winProbabilityAfter`, `wpa`, and related leverage/display fields.
2. Treat KBL WPA as a derived projection computed from `AtBatEvent`, linked `FieldingEvent[]`, and `BetweenPlayEvent[]`.
3. The attribution module should derive actual WPA from current before/after state or verified refreshed WPA fields, then allocate from current enrichment, fielding, runner, and manager data.
4. Existing edit paths that call `updateAtBatEventWithFieldingSync` are good hooks for fielding edits because they already rewrite linked fielding events.
5. Attribution-only edits, such as routine to diving or adding scoop/gem detail, do not need a new actual WPA value but must re-run KBL allocation.
6. If KBL WPA is later persisted for performance, every event-log edit path must mark the game attribution cache dirty and rebuild it.
7. Game Detail, Postgame, Almanac, and bracket/tourney award views should all read from the same attribution derivation function so a post-play edit changes every surface consistently.

## Implementation Notes

Recommended derived output shape:

```ts
type KblWpaRole = 'batting' | 'pitching' | 'catching' | 'fielding' | 'baserunning' | 'managing';

interface KblWpaCredit {
  eventId: string;
  source: 'at_bat' | 'between_play';
  playerId: string;
  playerName: string;
  teamId: string;
  role: KblWpaRole;
  wpa: number;
  confidence: 'high' | 'medium' | 'low';
  basis: string;
}
```

Recommended first implementation target:

1. Derived read-only Game Detail/Postgame panel.
2. Audit examples: routine `5-3`, `5-3` with 1B gem, primary-fielder gem, K/Kc catcher 5%, robbed HR, runner scores from first, CS, WP/PB.
3. Only after audit, wire into bracket awards/almanac leaderboards.
