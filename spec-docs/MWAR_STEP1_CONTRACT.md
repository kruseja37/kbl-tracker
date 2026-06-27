# CONTRACT — Manager-WPA Step 1: single-layer 3:2:1 net-from-zero metric

**Lane:** manager-WPA (`experiment/manager-wpa-window`). **Builder:** Codex. **Auditor:** Opus (Captain).
**Status:** HARDENED (adversarial-reviewed against source; ready for handoff).

## THE RULE (JK-ruled, 2026-06-26)
The manager number is **ONE layer** = `Σ over every player-stint of clamp(net real per-play WPA across the stint ×
engagement-share, ±cap) × teamScale`. **Retire the tactical AND lineup_delta layers from the manager total** ("one number,
retire the old"). Baseline ZERO, NO counterfactual for removals, leverage intrinsic to WPA, tactics absorbed. Two **LIVE**
tiers: **active move 30%**, **untouched starter 10%**. The **conscious keep-in 20%** tier is **defined-but-DARK** (needs the
scout, unavailable in sim).

## GROUND ANCHORS (Captain-verified from source 2026-06-26)
- `src/utils/managerWpaGameState.ts`: `deriveManagerDeploymentStintRecords` :319-570 (open/close :330-449; scoring loop
  :468-521; team-cap :523-551); `getManagerDeploymentCreditWeight` :101-139; **`isCreditLinkedToDeploymentStint` :~1470-1500
  (the fielding-event gate + the strict `eventIndex > openedAtEventIndex` boundary at ~:1475)**; `findTacticalExclusionEventIds`;
  `buildDeploymentOpening`/`deploymentActivationWindowForEvent`; `MANAGER_DEPLOYMENT_SHARE_BY_ROLE` :54-67 / `_CAP_BY_ROLE`
  :68-81 / `TEAM_CAP` :82 / `calculateManagerDeploymentWpa` :84-99; `deriveManagerLineupDeltaRecords` :230 /
  `deriveTeamLineupDeltasFromOptimalSnapshot` :921-1064; builder `deriveCommittedManagerDecisionState` :180-228;
  `buildStarterEntries` (the existing SP-vs-lineup dedupe, ~:1084-1095).
- Credits = `deriveKblWpaCredits` (real per-play WPA, per-player per-role: batting/pitching/fielding/baserunning/catching/
  managing). `src/utils/eventLog.ts`: `GameHeader.startingLineups` :175-178 = the 9 batting slots; **`startingPitchers`
  :183-186 = SPs (the SP is NOT in `startingLineups` in DH leagues).** `kblWpaAttribution.ts:231` emits a fallback
  `archived-at-bat-…` eventId when `event.eventId` is empty.
- `src/types/managerWpa.ts`: `ManagerDeploymentRole` :487. `managerDecisionRegistry.ts`: `doubleCountingExclusions` :140-273,
  and `decisionType 'pinch_hitter'` :180 (a DISTINCT union — see Change D naming).

## CHANGES
**A. Un-filter roles — AND relax the link gate in lockstep (else defensive subs' bats orphan).**
- `getManagerDeploymentCreditWeight` → `return creditRole === "managing" ? 0 : 1` for every deployment role.
- **CRITICAL companion:** in `isCreditLinkedToDeploymentStint`, the `defensive_position`/`kept_defender_in` fielding-event
  gate must apply **only to `credit.role === 'fielding'`** — batting/baserunning/catching credits link on player+window
  alone. Otherwise an un-filtered defensive sub's batting WPA is weight-1 but never linked → orphaned. Either scope the gate
  to the fielding role or drop it and rely on the player+window match.

**B. Remove tactical exclusions; stints own the FULL window incl. the entry play.** `findTacticalExclusionEventIds` → `[]`.
Active-sub activation windows must start so the entry PA is in-window. **Keep the credit-link boundary STRICTLY-GREATER**
(`eventIndex > openedAtEventIndex`, ~:1475): `openedAtEventIndex = the sub event index` → the sub event itself is excluded
(it belongs to the outgoing player / is a between-play action) and the first ENTRY PA (index > K) is included. Do NOT change
`>` to `>=`. Add a test pinning that the sub event's own index is excluded.

**C. `untouched_starter` stints — correct data sources + no overlap.**
- Open a stint at game-start (earliest committed event index, or a synthetic pre-first index) for **every** starter:
  position players from **`input.startingLineups`** (both teams) AND **the starting pitcher from `input.startingPitchers`**
  (away/home). In **non-DH** leagues the SP may also appear in the lineup's P slot — **dedupe** (mirror `buildStarterEntries`
  :1084-1095) so the SP gets exactly one stint.
- Role = new `untouched_starter`. Place in `open[]` so existing `closeMatching` closes on removed/role_change/game_end.
- **Invariant:** an `untouched_starter` stint never overlaps an active stint for the same player — when he is
  subbed/position-changed/pulled, his `untouched_starter` stint closes at that event (no keep tier is live in Step 1).

**D. Roles + shares (`MANAGER_DEPLOYMENT_SHARE_BY_ROLE`).** Active roles = **0.30** (`pinch_hitter_active` [renamed from
`pinch_hitter_remaining` to avoid the homonym with `decisionType 'pinch_hitter'` — update all ~8 referencing files + the
union together], `pinch_runner`, `defensive_position`, `pitcher`/reliever, `manual_deployment`); `untouched_starter` =
**0.10**; `kept_*_in` = **0.20** (dark). Update the `ManagerDeploymentRole` enum, `_CAP_BY_ROLE`, `calculateManagerDeploymentWpa`.

**E. Caps (PROVISIONAL — comment clearly).** Per-role ±**0.20**; `TEAM_CAP` ±**0.60**. EXPECT the team cap to BIND in normal
games (whole-game windows for ~18 starters/team) — this is a known provisional distortion; L-SIM must report binding
frequency (see Verification 4).

**F. Retire from the manager TOTAL → `managerValue = deploymentWpa` ONLY.** (Two independent total paths — fix BOTH.)
- `pogAwards.ts deriveManagerTotals`: `managerValue = roundWpa(deploymentWpa)` (drop tactical+lineup terms at :589-591).
  KEEP populating `tacticalManagerWpa`/`lineupDeltaWpa` working totals + members (shape-stable, display-only). Update the
  BestManager explanation string (:650) to deployment-only. Note: BestManager gates on `isMeaningfulPositive(managerValue)`
  (>0.005, :15/:747) — deployment-only must clear it; fixtures relying on tactical/lineup to clear the floor get updated.
- `almanacQueries.ts finalizeManagerTenure` (:1271) + `finalizeManagerAggregate` (:1329): `managerValue = roundTo(deploymentWpa,6)`
  only. KEEP per-layer accumulation + the dedicated per-layer leaderboards/members (shape-stable at their sums).
- `deriveManagerLineupDeltaRecords` → `return []` (KEEP the `optimalLineup` snapshot machinery — lineups-tab consumer).
- `ManagerWpaOverlay.tsx:178` re-sums layers itself → set `managerValue = deploymentWpa`.
- `franchiseAwardsEngine.ts` MOY: weights → `{ deploymentWpa: 0.5, recordWinsAboveExpectation: 0.5 }` (delete tactical+lineup
  keys at :132-137); delete the `tacticalNormalized`/`lineupNormalized` `scaleToUnitRange` calls (:492/:494) and their score
  terms (:507/:509) → `score = deploymentNorm*0.5 + recordNorm*0.5`. (This removes the retired layers AND the
  `scaleToUnitRange` max==min degeneracy. The dropped-terms offset was rank-NEUTRAL but pin-breaking → regenerate MOY numbers.)
- `FranchiseV1VisualSmokeSeed.tsx:262-265`: the seeded `managerValue` (0.18, all tactical) → recompose from deployment only.
- No-math inheritors (verify, optional relabel): `teamImpact.ts` (722-730 inherits), `GameDetail.tsx`, `TeamPage.tsx`,
  `EliminationTeamHub.tsx`, `TeamImpactLeaderboardsPanel.tsx`, `ManagerAlmanac.tsx`.

**G. Double-counting / coverage.** With tactical+lineup retired and each stint owning the player's full window, every play's
WPA is counted exactly once → `doubleCountingExclusions` go inert (do NOT over-subtract). **State the coverage invariant
precisely (see Verification 3) — it is the partition of RAW credits, not the share/capped number.**

## INVARIANTS + STOP-IFs (net-from-zero needs BOTH no-double AND no-gap)
- **No double-count:** no player non-managing credit links to >1 stint.
- **No orphan (NEW):** every player non-managing credit at event index `i` is covered by exactly one OPEN stint
  (`openedAtEventIndex < i ≤ closedAtEventIndex`) for that player. Enumerate every close/re-open transition (removed,
  role_change, runner_terminal, game_end) and confirm each either ENDS the player's game or opens a successor stint — no
  player keeps generating credits with no covering stint (the existing "does not link later player events" behavior must NOT
  orphan a player who remains in the game after a role_change).
- **Ghost/extra-inning runners:** a ghost/extra-inning runner has no playerId stint owner → confirm it produces NO orphaned
  baserunning credit (exclude such synthetic-runner credits from the coverage set, or assign explicitly).
- **Archived games:** `buildEventIndexById` keys on the real eventId; `kblWpaAttribution` uses an `archived-at-bat-…`
  fallback when eventId is empty → mismatch yields `eventIndex===undefined` → orphan. Either EXCLUDE archived games from the
  coverage invariant or make the index map use the same fallback key. State which.
- **Catching:** the catcher is a starter → his `untouched_starter` stint covers `catching` credits at weight 1 (state it in
  the coverage proof).

## CONSUMERS + TESTS — full sweep (update EXPECTATIONS, not the engine)
Non-test consumers + the math/no-math split: see Change F (the sweep is complete there).
**Tests (12) — and which are STRUCTURAL rewrites, not value-pin updates:**
- `managerWpaGameState.test.ts` — **STRUCTURAL:** fixtures pinning the exact deployment-role SET / `toHaveLength` (e.g.
  ~:1714-1716 expects exactly `['pinch_hitter_remaining','pinch_runner','pitcher']`; "remain active" `toHaveLength(3)`) now
  see 18+ `untouched_starter` stints in any fixture supplying `startingLineups`. **Regenerate the expected stint SET — do
  NOT weaken the engine to preserve old cardinality.** Plus the share/cap table pins → new 3:2:1/±0.20/±0.60 values.
- VALUE-pin updates: `pogAwards.test.ts`, `teamImpact.test.ts` (exact `ManagerWpaBreakdown` objects), `almanacManagerWpa.test.ts`,
  `processCompletedGame.almanac.test.ts`, `GameDetail.test.tsx`, `TeamPage.test.tsx`, `EliminationTeamHub.test.tsx`,
  `EliminationHome.test.tsx`, `ExhibitionLeaders.test.tsx`. `AwardsWatchlist.test.tsx` — note the documented order-flake.
- `franchiseAwardsEngine.test.ts` — regenerate ALL MOY numbers after the 0.5/0.5 weight change.
- L-SIM canonical baselines (`lsim-h2-baseline-checkpoint-*`): regenerate **LAST**, on the default leg. No trackerDb
  version-pin risk (the two pin tests don't touch manager terms).

## VERIFICATION (run locally; report exact output)
1. `npm run build` exit 0.
2. Full `npm test` — pass/fail vs the documented baseline; every RED an updated-expectation, not a new characterized
   regression.
3. L-SIM season (`test-utils/lsim`, real `src/utils` `processCompletedGame` flags-on): assert (a) `tacticalManagerWpa===0` &
   `lineupDeltaWpa===0` in every total, `managerValue===deploymentWpa`; (b) **COVERAGE**: `Σ over stints of rawLinkedWpa
   (weight-applied, pre-share, pre-cap) === Σ team player non-managing WPA` (the real net-from-zero partition); (c) no NaN.
4. **Report team-cap binding:** print the fraction of team-games where `teamScale<1` and the pre/post-cap team sums (so the
   ±0.60 cap can be judged, not assumed).
5. **Hand-trace TWO games incl. one EXTRA-INNINGS DH game**, paste arithmetic: a sub who later homers → manager gets **30%**
   of the sub's net; an untouched starter → **10%** of his net game; the SP's appearance → **10%**, his reliever → **30%**;
   a defensive sub's later HIT is credited (Change A); confirm RAW coverage (item 3b) and that no credit lands in two stints
   and no in-game player's credit is orphaned.

## CONSTRAINTS
Do NOT edit `effectiveRatings.ts` / `playerDatabase.ts` (draft lane). No new trackerDb store / no version bump. Keep all type
members for shape stability. The keep-in 20% tier stays dark — wire it to no recommendation source.

## FAILURE PROTOCOL (STOP-IF — emit `BLOCKED: <reason>` and STOP)
- An `untouched_starter` stint overlaps an active stint for the same player (double-count) you can't close cleanly.
- COVERAGE fails: a player non-managing credit lands in two stints (double) OR in zero stints (orphan) in the L-SIM check or
  hand-trace.
- The MOY weight ruling or a structural fixture is ambiguous enough that you'd have to guess.
- A new characterized RED outside the documented set that is not a stale-pin update.
