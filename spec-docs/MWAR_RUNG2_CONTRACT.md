# CONTRACT — Manager-WPA rung-2: light up the 20% conscious-keep-in (scout-gated)

**Lane:** manager-WPA (`experiment/manager-wpa-window`, post-merge with the keystone-optimizer lane). **Builder:** Codex. **Auditor:** Opus.
**Goal:** turn ON the 20% conscious-keep-in tier of the 3:2:1 model, gated on the now-merged scout (`evaluateScoutMove`), firing
in BOTH live play and the headless L-SIM, with no double-count. Completes the full 3:2:1.

## THE RULE
A **conscious keep-in** = the scout flagged a *meaningfully better* move (`recommend === true`) at a decision point AND the
manager **declined** it (kept the incumbent). → open a `kept_*_in` deployment stint scored at **0.20** over the kept player's
**remaining** tenure. If the scout saw no better move (`recommend === false`) OR the manager actually made the move → NO keep-in
stint (the player stays in his base tier: 10% untouched / 30% active).

## GROUND ANCHORS (Captain + discovery-verified, post-merge 2026-06-26)
- **Scout (DO NOT EDIT — optimizer thread owns it):** `src/engines/scoutMove.ts:78`
  `evaluateScoutMove(ctx: ScoutDecisionContext): ScoutMoveEvaluation`. `recommend = bestMoveKblWpaGain > thresholdKblWpa`
  (strict; `SCOUT_THRESHOLD_KBL_WPA` :70-74 = pitcher_change .015 / pinch_hit .0125 / defensive_replacement .01). Pure,
  degrades to `recommend:false` on throw. **Its `decisionType` domain is `'pitcher_change'|'pinch_hit'|'defensive_replacement'`
  — DIFFERENT from the keep-in `PromptedManagerDecisionType` (`'leave_pitcher_in'|'let_batter_hit'|'keep_defender_in'`,
  eventLog.ts:469-472). A mapping is required.**
- **Keep-in producer (stubbed by Step 1):** `managerWpaGameState.ts:769-776`
  `groupPromptedKeepCurrentDeploymentOpenings` = `return new Map()`. The REAL logic is preserved as
  `_groupPromptedKeepCurrentDeploymentOpeningsLegacy` :778-883 (never called). Drained at the at_bat branch :388-391 after
  `hasOpenDeploymentForPlayer` de-dup :389. Role map (legacy :855-860): leave_pitcher_in→kept_pitcher_in,
  keep_defender_in→kept_defender_in, let_batter_hit/default→kept_position_player_in. Opening: openedAtEventIndex = the first
  tactical at-bat the kept player faces after the decision (:837-879).
- **The handoff helper:** `closeStarterStintsForActiveOpening` :329-350 (closes a player's `untouched_starter` stint with
  closeReason 'role_change', self-close-guarded). Today called ONLY for between-play openings :421-422, NOT at the keep-in
  drain :388-391 — that gap is latent because keep-ins are off.
- **Live keep-in path:** `buildPromptedManagerDecisionFromRecommendation` (managerWpaRecommendations.ts:177-215) builds the
  `PromptedManagerDecisionEvent`; `getPromptedDecisionTypeForRecommendationAction` :168-175 maps keep actions. Committed via
  `recordPromptedManagerDecision` (GameTracker.tsx:10584-10596); attached on the between-play event (useGameState.ts:8904).
- **React decision assembly:** GameTracker.tsx:10243-10504 useMemo assembles candidate pools (`buildHitterRecommendationPlayer`/
  `buildPitchingRecommendationPlayer`/`commonPlayerRecommendationFields` :10298-10426) using hook-bound `getMojoForPlayer`/
  `getFitnessForPlayer` :5044-5070.
- **L-SIM:** `test-utils/lsim/seasonRunner.ts` — `seedSyntheticEventLog` :208-453 scripts a fixed batting walk + injuries;
  **ZERO in-game manager decisions today.** Calls `deriveCommittedManagerDecisionState` :476 + real `processCompletedGame`.
  `managerWpaProof` (`deriveManagerWpaProof` :898-1005, asserted seasonRunner.scenario.ts:81-85). Determinism leg :1257-1283.
  Deterministic hash: `hashStringToUint32` (franchiseManagerAutoBackstop.ts:67-78) — reuse, NO `Math.random`.

## CHANGES
**A. Carry the scout verdict on the decision event (Change D is a PREREQUISITE).** Add `scoutEvaluation?: { recommend: boolean;
decisionType: ScoutDecisionContext['decisionType']; bestMoveKblWpaGain: number; thresholdKblWpa: number }` to
`PromptedManagerDecisionEvent` (eventLog.ts:479-499). **Do NOT call the scout inside
`buildPromptedManagerDecisionFromRecommendation` — that function only receives `{recommendation, action, opponentTeamId}`; the
`ManagerRecommendation` carries only `trackedPlayerIds` (ID strings), NOT the rated candidate pool the scout needs.** Instead:
evaluate the scout WHERE the pool lives — in the GameTracker React useMemo (or the Change-D pure helper it calls), with
hook-resolved mojo/fitness — mapping `ManagerRecommendationType → scout decisionType` (consider_pitching_change→pitcher_change,
consider_pinch_hitter→pinch_hit, consider_defensive_replacement→defensive_replacement). Then **thread the resulting
`scoutEvaluation` object as a new input field into `buildPromptedManagerDecisionFromRecommendation`**, which merely COPIES it
onto the event (it must not compute it). The handler at GameTracker.tsx:10584 resolves the scout verdict for the acted-on
recommendation before constructing the decision. The sim stamps the same field on its fabricated events (Change E).
`scoutEvaluation` must contain ONLY structured-clonable primitives (boolean/number/string) so it rides the existing
whole-object `store.put` between-play persistence (eventLog.ts:948-959) with NO DB-version bump.

**B. Re-enable the keep-in producer, scout-gated.** Restore `groupPromptedKeepCurrentDeploymentOpenings` to delegate to the
legacy body, and ADD the gate: when resolving each prompted keep decision, `if (!prompted?.scoutEvaluation?.recommend) continue;`
(skip — no keep-in stint unless the scout flagged a better move that was declined). Keep the role mapping unchanged.

**C. THE HANDOFF (double-count fix — load-bearing).** At the keep-in drain site (:388-391), call
`closeStarterStintsForActiveOpening(opening, entry)` **BEFORE** `open.push(opening)` (mirror the between-play order :421-424),
where `entry` is the at-bat entry (entry.eventId/entry.eventIndex). This closes the kept player's `untouched_starter` (0.10)
window at the keep-in's `openedAtEventIndex`. **Without it, the same at-bat is credited at 0.10 AND 0.20 = double-count.**
Correctness rests on the **half-open interval** in `isCreditLinkedToDeploymentStint` (`(openedAtEventIndex, closedAtEventIndex]`
— open-exclusive, close-inclusive): with keep-in `openedAtEventIndex = endpoint.eventIndex` and the untouched close set to the
same index, the untouched window = `(start, endpoint]` (boundary at-bat → untouched, 0.10) and the keep-in window =
`(endpoint, exit]` → each at-bat lands in exactly ONE window. DO NOT "fix" the discarded `tacticalExclusionEventIds` or shift a
boundary — the interval, not the exclusion list, prevents the double-count. Edge cases are safe by construction: a non-starter
kept-in (no untouched_starter in `open`) → the helper no-ops (guard :333 + role filter :337-338); an already-closed untouched
window → not in `open` → no double-close.

**D. Hoist the decision assembly into a PURE headless helper.** Extract
`buildScoutDecisionContexts(plainState, getMojo, getFitness): ScoutDecisionContext[]` — moves the candidate-pool mapping
(:10298-10426) into a pure module that takes plain game-state scalars + the candidate arrays + INJECTED `getMojo(id)`/
`getFitness(id)` (no hooks). The GameTracker useMemo STAYS in React and calls this helper (passing the hook-resolved values).
The live handler persists the `scoutEvaluation` the pure scout produced. This lets the sim build the same contexts headlessly.

**E. Sim: make keep-ins fire deterministically.** In `seasonRunner.ts`, fabricate keep-in between-play
`PromptedManagerDecisionEvent`s with `scoutEvaluation.recommend = true` under a DETERMINISTIC decline policy:
`roll = hashStringToUint32(\`${seed}:${evaluationId}:keep-in-decline\`) / 0x100000000; declineKeepIn = roll < KEEP_IN_DECLINE_RATE`
(KEEP_IN_DECLINE_RATE = 0.5, commented tunable). **First `export` the existing `hashStringToUint32` from
`franchiseManagerAutoBackstop.ts:67` (it's pure/private today) — import it, do NOT re-implement.**
**CRITICAL placement (the part that silently no-ops if wrong):** for the legacy producer to emit a stint, the fabricated
between-play event's `promptedManagerDecision.trackedPlayerId` must match a FUTURE seeded at-bat in the **same inning + half**
(endpoint match, legacy :837-852: `candidate.eventIndex > event.eventIndex && same inning && same halfInning && batterId/
pitcherId === trackedPlayerId`). So insert the keep-in event at an `eventIndex` JUST BEFORE a chosen tracked batter/pitcher's
at-bat, with `gameState.inning/halfInning` set to that at-bat's — NOT at a past index like the injury event's `1000+gameNumber`.
(v1: fabricating the verdict deterministically is sufficient to exercise the crediting path end-to-end; running the real
`evaluateScoutMove` in-sim with a synthesized bench is a future enhancement — note it.) MUST preserve the same-seed determinism
leg (no `Math.random`, no `Date.now`; use the seed-derived `sourceTimestamp` discipline the existing seeded events use).

**F. Proof + tests.**
- Extend the `LsimManagerWpaProof` interface (seasonRunner.ts:101-117) + `deriveManagerWpaProof` (:898-1005): add
  `keptInStintCount` and `keptInShareIsTwentyPercent` (every kept_*_in stint `managerShare === 0.20`). Add scenario assertions
  in `seasonRunner.scenario.ts` (alongside the existing rawCoveragePass/deploymentOnlyTotals/... at :81-85):
  `expect(keptInStintCount).toBeGreaterThan(0)` + `expect(keptInShareIsTwentyPercent).toBe(true)`. Keep the existing
  `rawCoveragePass` AS-IS — it is share-agnostic conservation on RAW (pre-share) WPA and WILL catch a handoff double-count
  (one at-bat in two windows inflates `stintRawLinkedWpa` while `playerNonManagingWpa` is unchanged → delta>0 → fail).
- **Stale tests (Issue 3):** `managerWpaGameState.test.ts` has ≥4 blocks asserting `kept_*_in` stints are `[]` (≈:1475, :1561,
  :1732, :1853). Under Change B's gate these still pass (fixtures lack `scoutEvaluation` → gate skips) but now mean
  "no scout verdict → no stint," not "stub off." UPGRADE at least one to set `scoutEvaluation.recommend=true` + assert a stint
  IS produced (covers unit-test #1 below); document the rest as gate-characterizations.
- **Downstream golden re-bake (M3):** non-empty kept_*_in stints now flow into `pogAwards`, `managerValueTrace`,
  `franchiseAwardsEngine`, the almanac aggregation, and PostGameSummary. Re-verify + re-baseline as needed:
  `pogAwards.test.ts`, `managerValueGoldenFixtures.test.ts`, `almanacManagerWpa.test.ts`, `PostGameSummary.test.tsx`.
- **Unit tests:** (1) scout `recommend:true` + keep action → a kept_*_in stint at 0.20; (2) scout `recommend:false` + keep
  action → NO stint; (3) the **starter→keep-in handoff**: a starter kept-in mid-game → his untouched_starter window closes at
  the keep-in's open index, keep-in opens at 0.20, and a hand-traced at-bat is credited exactly once (not 0.10+0.20).

## CONSTRAINTS
- Do NOT edit `scoutMove.ts` / `lineupVsStarter.ts` / `trueValue.ts` / `effectiveRatings.ts` / `playerDatabase.ts` (optimizer
  lane owns these; the scout is done).
- No new trackerDb store / no DB version bump (adding a field to the in-memory `PromptedManagerDecisionEvent` is not a store
  schema bump — confirm it rides the existing game-event persistence). Keep type members shape-stable.
- Regenerate the 7 L-SIM canonical baselines LAST (`lsim-h2-baseline-checkpoint-003/010/020/030/040/050/060.json`) — keep-ins
  now appear → the committed checkpoints change. **Run the default/standard leg LAST** (a non-default leg run last corrupts the
  anchor and leaves stray files, per the baseline-cadence rule).

## VERIFICATION (run locally; paste actual output)
1. `npm run build` exit 0.
2. `npm test` (manager tests + scoutMove/lineupVsStarter tests) — pass vs documented baseline; no new characterized RED.
3. L-SIM season: `keptInStintCount > 0`, `keptInShareIsTwentyPercent` true, the coverage/no-double-count proof still passes,
   AND the same-seed determinism leg stays byte-identical. Report the keep-in count + the proof block.
4. Hand-trace one game with a starter kept-in: show the untouched (0.10) window closing at the keep-in open index, the keep-in
   (0.20) window, and one at-bat credited exactly once.

## FAILURE PROTOCOL (STOP-IF — emit `BLOCKED` and STOP)
- A kept_*_in stint overlaps the same player's untouched_starter or active stint (double-count) in the proof or hand-trace.
- The sim's keep-in generation breaks the same-seed determinism leg.
- The scout↔keep-in decisionType mapping is ambiguous for any keep action.
