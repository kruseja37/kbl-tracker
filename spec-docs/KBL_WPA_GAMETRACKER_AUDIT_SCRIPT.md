# KBL WPA GameTracker Audit Script

**SUPERSEDED (2026-07-08): not a source of truth — describes the RETIRED tactical+lineup_delta architecture; governed by MWAR_STEP1_CONTRACT.md + V1_CANON_2026-07-07.md §6 MOY ruling per SOT_REGISTER_2026-07-08.md.**

Purpose: record a controlled GameTracker game so we can verify that real UI input produces the event/enrichment data needed for KBL WPA attribution.

This is not for testing season value or WAR. This is only for Elimination Mode bracket/tourney WPA storytelling.

## Setup

Create a short exhibition-style test game with two teams. Use any teams/players, but keep the lineup names visible enough that the event log is easy to read.

Recommended settings:

1. Regulation length: 3 innings if available, otherwise normal.
2. Home team fields first.
3. Do not worry about final score realism.
4. Enter the plays exactly enough to create the listed base/out states.
5. After the game, open Game Detail and use the **KBL WPA Play Audit** section.

For the scoop case, use the **Rescued Throw** control that appears on force-at-first throw chains such as `5-3`.

## Audit Play Script

### 1. Swinging Strikeout

State: Top 1, 0 outs, bases empty.

Enter:

- Result: `K`

Expected KBL WPA:

- Pitcher gets 95% of defensive WPA.
- Catcher gets 5% of defensive WPA.
- Allocation mode: `ratio`.
- If catcher receives 0, catcher identity is not flowing into the event.

### 2. Called Strikeout

State: Top 1, 1 out, bases empty.

Enter:

- Result: `Kc` or called-K symbol if the UI uses it.

Expected KBL WPA:

- Pitcher gets 95% of defensive WPA.
- Catcher gets 5% of defensive WPA.
- Allocation mode: `ratio`.

### 3. Routine 5-3 Groundout

State: Top 1, 2 outs, bases empty.

Enter:

- Result: `GO`
- Fielding sequence: `5-3`
- Fielding play type: `routine`
- Contact: normal or ground ball if prompted

Expected KBL WPA:

- Pitcher gets 95% of defensive WPA.
- 3B gets 5% of defensive WPA.
- 1B gets 0 WPA as routine receiver.
- Allocation mode: `ratio`.

### 4. Clean Single

State: Bottom 1, 0 outs, bases empty.

Enter:

- Result: `1B`
- No fielding attempt/gem/error.

Expected KBL WPA:

- Batter gets offensive WPA.
- Pitcher gets inverse defensive WPA.
- No fielder credit/blame.
- Allocation mode: `ratio`.

### 5. Runner Scores From First On Single

Goal: verify runner advancement delta.

Enter these plays:

1. Batter reaches first: `1B`.
2. Next batter: `1B`.
3. For the runner who started on first, set destination: `home`.
4. Batter ends at first.

Expected KBL WPA:

- Batter gets base hit value plus part of extra runner delta.
- Runner from first gets positive baserunning WPA.
- Pitcher gets defensive inverse.
- Allocation mode: `ratio`.
- Audit basis should mention runner advancement delta.

### 6. Runner Held / Saved Base

Goal: verify saved-base counterfactual.

State: create runner on second with less than 2 outs if convenient.

Enter:

- Result: `1B`
- Runner from second goes only to third.
- Mark runner as held by outfielder / saved base if UI offers it.
- Mark `basesSaved` / saved run if appropriate.
- Fielding sequence: outfielder who held the runner, preferably `9` or `8`.

Expected KBL WPA:

- Batter gets offensive hit value.
- Pitcher receives counterfactual hit/advance allowed credit or blame.
- Outfielder receives saved-base fielding credit.
- Allocation mode for defensive saved-base credit: `counterfactual`.
- If no fielder credit appears, saved-base enrichment is not reaching fielding events/KBL WPA.

### 7. Caught Stealing

State: runner on first, between pitches.

Enter:

- Runner attempts steal of second.
- Outcome: caught stealing.
- Catcher/pitcher attribution should be present if UI asks.

Expected KBL WPA:

- Runner gets negative baserunning WPA.
- Catcher gets most defensive WPA.
- Pitcher gets small defensive WPA.
- Allocation mode: `ratio`.

### 8. Routine 5-3 With Rescued Throw

Goal: verify scoop/rescued throw behavior.

State: any inning, 0 or 1 out, bases empty preferred.

Enter:

- Result: `GO`
- Fielding sequence: `5-3`
- Fielding play type: `routine`
- Mark **1B Rescued Throw**.

Expected KBL WPA:

- Pitcher gets positive residual credit.
- 1B gets positive fielding WPA for the rescue.
- 3B gets negative fielding WPA for the bad throw.
- Total defensive WPA still balances to the play budget.
- Allocation mode: `raw_unit`.

If this cannot be entered from the UI, implementation gap: the **1B Rescued Throw** marker is not rendering for the selected throw chain.

### 9. Primary-Fielder Gem On 5-3

Goal: verify that gem credit on the 3B does not accidentally credit 1B.

Enter:

- Result: `GO`
- Fielding sequence: `5-3`
- Fielding play type: `diving` or equivalent on the 3B.
- Do not give extra gem credit to position `3`.

Expected KBL WPA:

- 3B gets the fielding share.
- 1B gets 0 as routine receiver.
- Pitcher gets the residual.
- Allocation mode: `ratio`.

### 10. Diving Catch

Enter:

- Result: `FO` or `LO`
- Fielding sequence: outfielder, such as `8`.
- Fielding play type: `diving`.
- Catch made.

Expected KBL WPA:

- Fielder owns most defensive WPA.
- Pitcher gets residual.
- Allocation mode: `ratio`.

### 11. Wall Catch

Enter:

- Result: `FO`
- Fielding sequence: outfielder, such as `7`, `8`, or `9`.
- Fielding play type: `wall`.
- Catch made.

Expected KBL WPA:

- Pitcher owns most defensive WPA.
- Fielder gets smaller execution share.
- Current target split: pitcher 90%, fielder 10%.
- Allocation mode: `ratio`.

### 12. Robbed Home Run

Enter:

- Result should resolve as an out, usually `FO`.
- Fielding sequence: outfielder.
- Fielding play type: `robbed_hr`.
- Catch made.

Expected KBL WPA:

- Pitcher gets negative defensive WPA based on counterfactual HR.
- Fielder gets more than the actual play budget because they erased the counterfactual HR.
- Defensive credits still sum to actual defensive WPA.
- Allocation mode: `counterfactual`.

### 13. Wild Pitch Advance

State: runner on base, between pitches.

Enter:

- Between-play event: wild pitch.
- Runner advances one base.

Expected KBL WPA:

- Runner gets positive baserunning WPA.
- Pitcher gets negative defensive WPA.
- Allocation mode: `ratio`.

### 14. Passed Ball Advance

State: runner on base, between pitches.

Enter:

- Between-play event: passed ball.
- Runner advances one base.

Expected KBL WPA:

- Runner gets positive baserunning WPA.
- Catcher gets negative defensive WPA.
- Allocation mode: `ratio`.

### 15. TOOTBLAN

Enter:

- Create a hit or runner advancement where a runner is thrown out trying for an extra base.
- Mark runner as `TOOTBLAN` if available.

Expected KBL WPA:

- Batter keeps batted-ball value.
- Runner gets negative baserunning delta.
- Defense gets throw/tag credit if fielding attribution is present.
- Allocation mode: usually `ratio`, with runner delta basis.

### 16. Out Advancing

Enter:

- Create a runner thrown out on advancement.
- Mark as `Out Advancing` / manager-fault runner outcome if available.

Expected KBL WPA:

- Runner receives negative baserunning WPA.
- Manager overlay may appear only if manager overlays are enabled in derivation.
- Collapsed player totals should not include manager WPA yet.

## What To Send Back For Audit

After recording the game, send me:

1. The completed game ID.
2. Any plays that the UI would not let you enter as scripted.
3. Whether the **KBL WPA Play Audit** section appears in Game Detail.
4. Screenshots are optional; I can inspect persisted event data if the game ID is enough.

## Audit Checklist I Will Run

For each scripted play, I will inspect:

1. `AtBatEvent.result`
2. `AtBatEvent.enrichment`
3. `AtBatEvent.runnerOutcomes`
4. linked `FieldingEvent[]`
5. linked `BetweenPlayEvent`
6. derived KBL WPA credits
7. side-budget conservation
8. Game Detail audit row display
