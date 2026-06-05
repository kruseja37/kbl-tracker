# Franchise Internal V1 Manual Smoke Feedback

Date: 2026-05-30

Purpose: preserve user-observed manual smoke-test feedback without interrupting the current foundational implementation plan. This document is not an implementation prompt and does not change scope by itself. Each item should be revisited, triaged, and assigned to the appropriate v1 hardening slice after the foundation work remains stable.

## Summary

The manual smoke test mostly validated the recent Franchise v1 direction, but GameTracker launch and several League Builder / Franchise UX details need follow-up. The immediate theme is not to chase these bugs ad hoc; instead, keep them visible so the implementation roadmap covers them deliberately.

## 2026-06-04 Follow-Up Smoke Notes

This follow-up pass raised confidence that the recently implemented foundation pieces exist, but also showed that the current experience is not yet comfortable enough to call the user-facing playable v1 done. These notes should feed the next hardening plan before deeper Mode 3 or full-spec implementation.

## 2026-06-05 Manual Smoke Findings

This pass keeps Mode 1/Mode 2 playable v1 in **not approved** status. The foundation remains useful, but real-app play still found data-safety and inspection gaps that need focused hardening before approval.

### 2026-06-05 Reconciliation Status

The following smoke findings have now been addressed by focused hardening slices, but they still need one more real-app user smoke pass before playable v1 can be approved:

- Hidden FARM salary leakage is hardened: hidden/unrevealed FARM prospect salary uses draft/scouting-safe public context, not true ratings, and revealed/sent-down players remain revealed/editable.
- Player profile position and pitching-rating integrity is hardened: profiles separate primary/secondary positions, non-two-way position players do not expose pitcher ratings/arsenal, and revealed grades align with Player Analyzer logic while hidden FARM profiles stay hidden-safe.
- GameTracker substitution menu names are hardened: sub-out bench/bullpen menus display full names for pitchers and position players.
- Almanac Franchise access and save-slot clarity are hardened: archive-backed franchise games/player instances/team links are discoverable from Almanac, and Franchise save-slot export/delete copy now states import/upload is not implemented yet.

Remaining open findings before approval:

- Stadium spray data still needs a real-app Team Hub verification pass; if it remains missing, the next implementation target should be production Team Hub spray evidence visibility.
- Manager WPA lineup delta is still missing from Game Detail.
- Save import/upload remains not implemented.
- Real production visual smoke still depends on the user's app pass rather than only fixture/preview coverage.

### Preserved Findings

1. GameTracker sub-out pitcher names still abbreviate.
   - Earlier full-name hardening improved several pitcher display paths, but the substitution/out pitcher path still needs a focused display-name pass.
   - Status: addressed by the GameTracker substitution menu full-name display patch; awaiting user smoke verification.

2. Almanac Game Detail works from schedule, but Almanac Franchise section is still `Coming Soon`.
   - Archive-backed Game Detail continuity is real.
   - Franchise-level Almanac history is not complete and should not be represented as playable-v1 complete.
   - Status: addressed for archive-backed access and truthful copy; full Franchise history hub remains deferred.

3. Franchise save export/delete works; upload/import path is unclear.
   - Export/delete confidence improved.
   - Import/upload discoverability and expected restore behavior need a focused save-slot UX pass.
   - Status: clarified as `not implemented yet`; import/upload remains a deferred capability.

4. FARM salaries leak hidden ratings and should be draft-slot/scouting based, not actual-rating based.
   - This is the first hardening target for the current patch.
   - Hidden/unrevealed FARM prospect salary must derive from public draft/scouting/handoff context only.
   - Rating-derived salary/value must not reveal relative true prospect quality.
   - Status: addressed by hidden-safe FARM salary/reveal hardening; awaiting user smoke verification.

5. FARM prospect grade mismatch versus Player Analyzer.
   - Scouted labels such as `Scouted B` must remain scouted/report labels, not true-grade labels.
   - Player Analyzer comparison needs a future hidden-safe review.

6. Player profile missing primary/secondary position separation.
   - Team Hub profile should distinguish primary and secondary positions clearly enough for SMB4 console entry.
   - Status: addressed by player profile position and pitching-rating integrity hardening; awaiting user smoke verification.

7. Position players have pitching ratings by default despite no two-way trait or arsenal.
   - This needs a data-generation/profile visibility pass so non-pitchers do not look like unsupported two-way players.
   - Status: addressed for profile/generation visibility; two-way players remain explicitly modeled.

8. Sent-down revealed players lose full rating/edit visibility.
   - Reveal should be irreversible.
   - A revealed MLB player sent to FARM should stay fully inspectable/editable and keep known salary context.
   - Status: addressed by reveal-safety hardening; awaiting user smoke verification.

9. Stadium spray data missing from Team Hub.
   - Richer spray UI is implemented in the foundation, but real-app smoke did not surface the expected data.
   - Treat this as a production-data/fixture/source investigation, not a new analytics promotion.

10. Manager WPA lineup delta missing from Game Detail.
    - Manager WPA visibility exists in some archive-backed contexts, but lineup delta detail is not complete in Game Detail.

### Current Gate

The immediate next step is **User reruns manual smoke checklist**:

- Keep playable v1 unapproved until the user approves it after real-app smoke.
- Verify the addressed findings in the real app, not only fixture or unit coverage.
- If implementation is still needed, prioritize Stadium Spray Evidence Visibility In Real Team Hub, then Manager WPA Lineup Delta Visibility.
- Save import/upload remains explicitly not implemented unless separately approved.
- Do not promote salary movement, final True Value, final designations, morale automation, relationships, Mode 3/offseason, auto-draft, or AI simulation.

### High-Priority Playability / Data Correctness

1. Pitcher name formatting is inconsistent in GameTracker.
   - Current behavior: pitchers show as first initial plus last name, while position players show full names.
   - Desired behavior: all players should display full names consistently.
   - Area to inspect: GameTracker lineup/player display helpers, pitcher-specific display-name formatting, and any shared compact-name utility.

2. DH still appears in Franchise Mode generation policy.
   - Desired behavior: DH should not be a Franchise Mode position.
   - No prospects should have `DH` as primary or secondary position.
   - No scouts should have `DH` as a specialty or weakness.
   - Area to inspect: prospect generation, scout generation, draft pool construction, and any position/specialty constants.

3. Scout and player names remain too repetitive.
   - Desired behavior: stronger name variability using the SMB4 first-name / last-name database.
   - Area to inspect: generated prospect/scout name pools, SMB4 name source availability, duplicate prevention, and randomization weighting.

4. Dynamic designation logic appears wrong after games.
   - Smoke example: a starting pitcher gave up two runs in a one-inning intentional-loss test, had `-8.4 WAR`, and still received `Team MVP`.
   - Smoke observation: nearly every player, possibly every player, received `Team MVP` in roster view awaiting user confirmation.
   - Desired behavior: designation eligibility should match spec thresholds and should not flood the user with false-positive MVP prompts.
   - Future UX note: once designation logic is trustworthy, automatic morale changes with an undo/review path may be preferable to requiring users to confirm excessive post-game changes one by one.
   - Area to inspect: dynamic designation eligibility, WAR/value source inputs, preview-vs-awarded wording, post-game prompt generation, and Team Hub roster designation display.

5. Nothing from Franchise Mode persists to the almanac.
   - Desired behavior: Franchise Mode results/events that should become historical record need a defined almanac persistence path.
   - Area to inspect: completed game archive, almanac write paths, franchise scope metadata, season summaries, records, awards/fame events, and save/export behavior.

### Missing Workflow / Testing Ergonomics

1. Auto-assign is needed for hiring scouts and drafting players.
   - User impact: manual setup is too slow for repeated smoke testing.
   - Desired behavior: preview/test mode should support auto-hire scouts and auto-draft players.
   - Scope: this can be test/preview tooling first, not necessarily final AI behavior.
   - Area to inspect: draft setup, scout hiring flow, draft board selection, generated class constraints, and repeatable seeded test paths.

2. Team salaries are missing.
   - User impact: expected wins / roster expectation / True Value analysis feels disconnected because contracts/salary totals are not visible or complete.
   - Area to inspect: roster salary data, Team Hub salary display, team salary summaries, and value/expected-wins preview inputs.

3. Expected Wins / True Value is preview-only but currently lacks meaningful contracts.
   - Desired behavior: roster expectation analysis needs contracts/team salaries before it can feel useful.
   - Boundary reminder: this does not mean final True Value or salary movement should be promoted automatically.

### Roster / Team Hub UX

1. Player morale should appear in roster view as a sortable column.
   - Desired behavior: user can scan morale across the whole roster and sort by morale, salary, stats, etc.
   - Area to inspect: Team Hub roster table columns, sorting model, canonical morale snapshot lookup, and hidden-safe display.

2. Dynamic designations need a clearer home in roster/player detail views.
   - Current behavior: UI feels busy and designations do not have a clear, easy-to-scan place.
   - Desired behavior: on iPad, the user should be able to see player details and designations in a roster view without hunting through dense panels.
   - Area to inspect: Team Hub roster layout, player profile modal, designation chips/status columns, and responsive density.

3. The UI is too wordy and hard to read.
   - Desired behavior: default copy should be more succinct.
   - Robust explanations should move behind help buttons/tooltips/disclosure where needed.
   - Area to inspect: Team Hub foundation panels, random-event cards, morale/spec alignment copy, stadium panels, relationship context, and modal density.

### Stadium / Spray / Analytics UX

1. Stadium tab currently raises trust/authoring questions.
   - Smoke observation: dimensions appear loaded, but there is no obvious way to enter stadiums or edit dimensions in League Builder.
   - User question: unclear where the stadium information is coming from.
   - Area to inspect: League Builder stadium authoring, team/stadium assignment, seed factor inputs, stadium identity source, and Team Hub explanatory copy.

2. Seed factors and spray charts/evidence look blocked or unclear.
   - Desired behavior: if data is preview-only or blocked, UI should explain that succinctly and show what evidence is missing.
   - Area to inspect: Stadium tab empty states, foundation report blockers, completed archive requirements, and spray inspector availability.

3. Player spray charts still show deferred.
   - Desired behavior: batting, pitching, and fielding spray evidence should eventually be visible by player/team/stadium in a useful way.
   - Area to inspect: player profile spray context, Team Hub stadium spray inspector, and future heat-map/diagram work.

### Game / Analytics Gaps

1. No visible WPA for players or managers.
   - Desired behavior: if WPA is in spec for v1 or near-v1, it needs a visible/trusted calculation path and clear scope.
   - Area to inspect: GameTracker win-probability model, player WPA attribution, manager WPA/decision logic, archive persistence, and Team Hub/almanac display.

2. GameTracker / dynamic designation / WAR interactions need focused correctness review.
   - The `Team MVP` smoke issue suggests designation formulas may be using incomplete, inverted, or placeholder evidence.
   - Area to inspect: stat boundaries after intentionally shortened games, WAR preview values, designation eligibility inputs, and post-game prompt batching.

### Triage Implication

The Mode 2 v1 foundation may be technically safe, but the next milestone should be a user-facing playable-v1 hardening plan before deeper Mode 3 implementation. Suggested order:

1. Data correctness and generation policy.
   - Full-name display.
   - Remove DH from Franchise prospects/scouts.
   - Improve scout/prospect names from SMB4 data.
   - Fix dynamic designation flood/false MVP logic.

2. Testing ergonomics.
   - Auto-hire scouts.
   - Auto-draft players.

3. Core roster/finance visibility.
   - Team salaries.
   - Roster columns for morale/salary/stats/designations.

4. Stadium and analytics clarity.
   - Stadium authoring/source clarity.
   - Spray chart availability/empty-state clarity.
   - WPA visibility decision.

5. Persistence/history.
   - Franchise-to-almanac persistence path.

6. UI simplification pass.
   - Reduce default explanatory copy.
   - Move long explanations behind help/disclosure controls.

## Blocking Or High-Priority Workflow Issues

1. Franchise creation can hang on `Start Franchise`.
   - User impact: blocks the Mode 1 to Mode 2 handoff.
   - Additional observation: the franchise slot is still saved successfully, but the user has to leave and reload Franchise Mode to find the saved slot.
   - Area to inspect later: Franchise Setup submit flow after successful storage write, post-create navigation/refresh, loading-state cleanup, and any UI error handling around `initializeFranchise` completion.

2. Game scoring / launch does not proceed after the `Are you sure?` confirmation click.
   - User impact: blocks regular-season GameTracker launch from Franchise Mode.
   - Area to inspect later: FranchiseHome scheduled-game launch flow, pregame confirmation modal, current-lineup benchmark gate, no-DH lineup snapshot, route navigation, and GameTracker launch state.

3. Clicking delete on franchise save slots does nothing.
   - User impact: blocks cleanup of bad smoke-test saves and makes iteration harder.
   - Area to inspect later: Franchise selector / save-slot delete handler, confirmation UI, storage delete call, and post-delete refresh.

## Franchise Mode Rules / Data Policy

1. DH should not be a position in Franchise Mode.
   - No prospects should have `DH` as primary or secondary position.
   - No scouts should have `DH` as a specialty or weakness.
   - This should be enforced in the scout/prospect generation path, not merely hidden in UI.

2. Scout accuracy seems too high.
   - Goal: keep two scouts per team while making prospect evaluation uncertain enough that drafting is not too easy.
   - Future tuning should nerf base accuracy and/or widen report variance while preserving visible specialty/weakness strategy.

## Scout / Prospect Generation Quality

1. Scout and prospect names feel too redundant or similar.
   - Desired behavior: more variability.
   - Names should be pulled from the SMB4 first-name / last-name database where possible.
   - Area to inspect later: prospect/scout generation name pools and existing SMB4 name data source.

## Player Information / Team Hub Needs

1. Users need a way to inspect player profiles from Franchise Mode.
   - Critical for called-up FARM players because users must create/update that player in the SMB4 console.
   - Team Hub should expose player details either as a roster section or a click/pop-up from the player name.
   - Needed info includes ratings, attributes, traits, positions, handedness, salary, and any other console-relevant details.
   - Hidden prospect info must remain hidden until the appropriate reveal/call-up point, but once revealed the user needs enough information to recreate the player in SMB4.

## GameTracker / Fame Logic Bugs

1. Immaculate inning detection is too loose.
   - User observation: Franchise GameTracker can treat an inning as immaculate when all three outs are strikeouts, even if the pitcher allowed a walk and a hit.
   - Correct rule: an immaculate inning requires exactly three batters faced, three strikeouts, and exactly nine pitches, with no walk, hit, error, hit-by-pitch, or other baserunner/reach event.
   - User impact: fame/story logic can award or report a false achievement.
   - Area to inspect later: end-inning pitch-count confirmation, inning-level batter/pitch/result tracking, fame event detection, and any shared achievement predicates used across Exhibition, Elimination, and Franchise GameTracker.
   - Scope note: this is a gameplay correctness bug to fix in a focused GameTracker/Fame hardening slice, not a reason to derail the current Franchise Mode implementation plan.

## Suggested Future Triage Buckets

1. Launch / handoff blockers
   - Franchise creation hang.
   - GameTracker launch confirmation no-op.
   - Save-slot delete no-op.

2. Scout/prospect generation policy
   - Remove DH from Franchise prospects and scout specialty/weakness pools.
   - Reduce scout accuracy.
   - Improve scout/prospect name variability using SMB4 name data.

3. Franchise player inspection UX
   - Player profile pop-up or Team Hub profile panel.
   - Revealed FARM prospect console-entry details.
   - Hidden-safe behavior before reveal.

4. GameTracker / fame correctness
   - Tighten immaculate inning detection to the true nine-pitch, three-batter, three-strikeout rule.
   - Confirm the fix applies consistently across all GameTracker entry points.

## Notes

- These issues should not reopen deferred systems such as Mode 3 annual draft, AI drafting, generated schedules, AI trades, morale, relationships, awards, or full scouting persistence unless explicitly scoped later.
- The immediate priority remains a stable Mode 1 to Mode 2 playable loop. These items should be addressed as focused hardening slices after the current foundation remains green.
