# Situational Move Advisor + Optimal-Lineup Analyzer — Deep-Dive (Build/Spec Input)

**Date:** 2026-06-26 · **Branch:** `experiment/manager-wpa-window` · **Companion to:** `MANAGER_WPA_WINDOW_AUDIT.md`
**Verification:** load-bearing claims re-read from source (cited). Three items remain browser-unverified and are flagged as such.

---

## Executive summary (plain language)

- **Correction to an earlier claim:** there IS already a situational matchup engine. `effectiveRatings`
  already nets a hitter's active traits *and the opposing player's* traits, turns handedness traits on/off
  by who's actually pitching, and folds in mojo + fitness + fatigue — for the current player *and* every
  bench/pen option. The earlier "no situational engine" read only looked at the auction pricer, not this.
- **The real, verified blocker is one missing data field:** trait **levels** (your "level 2 / level 3")
  are **not stored per player** — the trait record holds names only, and every calculation silently treats
  every trait as level 2. So your level-2-Specialist-vs-level-3-bench-bat example is literally
  **unrepresentable today**. Capturing trait levels per player (and proving it persists) is the #1
  prerequisite for the whole advisor track.
- **The advisor rebuild is therefore an upgrade, not a from-scratch build:** capture trait levels → feed
  them through → swap the yardstick from an auction *dollar value* to a *win-value* that respects leverage.
- **Sim can't exercise the "conscious keep-in" (rung 2) yet:** recommendations and the declined-keep-in
  record are only generated inside the live game-screen UI; the auto-manager that drives a sim generates
  neither. A headless decline-path is required to sim rung 2.
- **Optimal-lineup analyzer:** it already exists, runs on the *same* situational engine, and already feeds
  the manager number as the "did you set a good lineup" baseline — **but** (a) it's buried in a roster
  editor and is burdensome to use, (b) the manager's lineup grade is **silently zero** for any team that
  never manually registered an optimal benchmark, and (c) folding it *deeper* into the manager score would
  double-count runs already counted. **Recommendation: don't deepen the fold yet**; instead fix the
  silent-zero with a one-tap pregame "accept the optimal" default, and deepen only after the engine is
  upgraded and double-counting is enforced.

---

# PART A — Situational advisor rebuild: scope

Separate engine track from the manager-WPA work. The manager metric ships first (active-vs-untouched).
This track gates only **rung 2 (conscious keep-in)** and the **optimal-lineup baseline quality** (both
share the `effectiveRatings → computeIV` spine).

## A1. What exists today to build ON (reuse, don't rebuild)

| Building block | What it already does | Cite |
|---|---|---|
| `effectiveRatings(player,state,ctx)` | One rating vector = base + **self** trait deltas + **opponent** trait deltas + pressure-scaled mojo − fatigue | `effectiveRatings.ts:499-514`, opp netting `:507-509` |
| `evaluatePredicate` | Gates trait activation on **handedness** (vsHand), count, two-strikes, pressure, RISP, runners-on, inning, fielding-chance, base-out | `effectiveRatings.ts:237-315`; vsHand `:260-265` |
| 75-trait interaction matrix | Per-trait **L1/L2/L3** delta vectors; has CON/POW-vs-LHP/RHP, Specialist, Reverse Splits, 7 opponent-target entries | `traitInteractionMatrix.ts:18-44,688,716` |
| `recommendSubs` | Scores current vs every candidate, ranks, recommends iff best delta > per-type threshold | `subRecommendations.ts:70-129` |
| Per-candidate mojo/fitness | Populated for current batter, all bench, all defenders, current pitcher, all relievers (by id, roster fallback) | `GameTracker.tsx:10279-10297,10359-10464`; resolver `:4954-5070` |
| Keep-in record builder (pure) | `buildPromptedManagerDecisionFromRecommendation` | `managerWpaRecommendations.ts:177-215` |

## A2. The gap (auction price vs win value)

1. **Yardstick is an auction dollar value** (`computeIV().kblIV`), not a win/run estimate — an edge "means"
   the same in a blowout 1st as a tie-game 9th. `subRecommendations.ts:157`, `ivEngine.ts:638-655`.
2. **Recommend threshold is leverage-insensitive** — flat per-type dollars (5000/7500/12000);
   base-out/inning/score never change whether a move is suggested. `subRecommendations.ts:117`,
   `rosterEngineConstants.ts:235-239`.
3. **No surfaced trait-vs-trait netting** in win terms — self+opponent deltas collapse into one vector,
   justification is one heuristic string. `subRecommendations.ts:191-227`.
4. **No platoon run-value / times-through-order / sequencing** (pinch-hit-now-vs-weaker-defense-later).

## A3. DATA READINESS — the gating prerequisite (VERIFIED): trait levels are NOT captured

- Trait type holds **names only**: `PlayerTraits { trait1?: string; trait2?: string }` — no level field
  (`playerDatabase.ts:36-39`); `chemistry` is a flat label, never resolved to a level (`:66`).
- The matrix has L1/L2/L3 vectors and `effectiveRatings` *can* consume them (`:326-341`), but every advisor
  call **defaults to L2** (`effectiveRatings()` default `potency='L2'` at `:503`; `scoreEffectiveRatingsIv`
  passes no potency at `subRecommendations.ts:131-132`). **L1/L3 paths are reachable but dead.**
- **Consequence:** your worked example (level-2 Specialist vs level-3 bench bat) is unrepresentable today.
- **#1 prerequisite:** add a per-player trait-level field, captured UI → IndexedDB. Almost certainly no UI
  collects it today (type lacks it) — **trace the persist path before building reasoning on top** (the
  recurring "verify-persistence-before-trait-builds" trap).

**Secondary caveats (browser-unverified):** bullpen relievers may carry **stale mojo** (only starters get
registered with the live hook; un-registered relievers fall back to static roster values —
`GameTracker.tsx:4737-4900`); there is **no head-to-head term** (a Locked-In opposing pitcher doesn't
directly debit the batter — mojo only helps when the pitcher is the scored candidate or a vsHand predicate
fires); leverage population at advisor call time is assumed not proven (`GameTracker.tsx:10248`).

## A4. Build shape (build ON the spine — 5 stages)

1. **Trait-level capture (prerequisite, ships first):** add a level field, populate UI→store, thread into
   the candidate builder (`commonPlayerRecommendationFields`, `GameTracker.tsx:10279-10297`).
2. **Conditional activation:** already exists — just pass *real* per-player potency so L1/L3 fire.
3. **Trait netting in win terms:** keep self/opponent deltas separable for an explanation output.
4. **State-fold (the real upgrade):** replace the `kblIV` yardstick with a run-value/win-probability scorer;
   make the recommend threshold leverage/base-out aware. Keep mojo/fitness/fatigue sourced from
   `effectiveRatings` — don't re-derive.
5. **Ranking:** keep `recommendSubs`; swap only the scorer beneath it.

## A5. Sim dependency (VERIFIED): the auto-manager generates no keep-ins

`generateManagerRecommendations` is called **only** from the React UI; the declined-keep-in record is built
**only** in the React click handler (`GameTracker.tsx:10564-10696`). `franchiseManagerAutoBackstop.ts` is
unrelated (L11 firing roll). **So a headless sim generates neither recommendation cards nor keep-in records
— rung 2 cannot be exercised in sim until this is fixed.** Needed: hoist the live-state assembly out of the
component; give the auto-manager a *decline policy*; reuse the pure keep-in record builder headlessly.

## A6. Sequencing

Manager metric (active-vs-untouched) ships first and does **not** wait on this track. Rung 2 stays dark
until trait-level capture lands + the auto-manager can decline-and-emit. The win-value upgrade improves the
advisor **and** the optimal-lineup baseline simultaneously (shared spine).

---

# PART B — Optimal-lineup analyzer: deep-dive & mWAR recommendation

## B1. Backend
`optimizeLineup()` (`rosterAnalyzer.ts:153-189`) scores each player via `ivOfEffectiveRatings()` — the
**same** `effectiveRatings → computeIV` spine the advisor uses (so it IS trait/mojo/fitness/handedness/
defense aware), assigns slots by IV, and `buildOptimalLineupSnapshot()` (`optimalLineup.ts:253-288`)
converts slot IV → `projectedSlotKblWpa`. **But** it evaluates only at the **pregame snapshot**, against a
**single** opposing hand and a **neutral** context (pressure none, bases empty, inning 1;
`rosterAnalyzer.ts:536-544`) — never per live game-state. **Caveats:** a parallel raw-ratings heuristic
scorer exists as a fallback (latent drift, `optimalLineup.ts:563-740`); the **franchise UI path hardcodes
fitness=FIT** and passes no workload (`TeamHubContent.tsx:1011`), so the franchise suggestion is *less*
situational than the engine can produce. **Storage:** official benchmark = 4 Team fields
`optimalLineupVs{RHP,LHP}With{,out}DH`; per-game snapshots on `PersistedGameState.optimalLineupSnapshots`.

## B2. UI/UX, where it lives, timing
Lives in **team roster editors** (League Builder, franchise Team Hub, Elimination Team Hub) — **not** on the
game screen. Shared diff panel `OptimalLineupComparisonPanel.tsx` (COMPARE / APPLY / RECALC / SET + DH
toggle). Pregame surface (`PregameBenchmarkChecklist.tsx`) is **read-only** (Ready/Missing only). **Timing:
pregame-only and burdensome** — to optimize you leave the pregame flow, go to Team Hub, RECALC/APPLY per
pitcher-hand and per DH-mode, then return. Opposite of infer-and-confirm.

## B3. How it feeds mWAR today
The optimal lineup is the **replacement baseline** for the lineup-construction layer (1 of 3 mWAR layers).
`deriveTeamLineupDeltasFromOptimalSnapshot` (`managerWpaGameState.ts:943-1050`): per deviated slot,
`actual starter realized KBL-WPA − optimal slot projected WPA`, × **0.25**, clamped **±0.25/player**,
**0.75/team**. **Hard gate:** records emit **only** with an **official** (user-registered/confirmed)
snapshot; the game-lock auto-fallback is `fallback` confidence and is **rejected** (`optimalLineup.ts:205-214`).
**→ For any team without a registered benchmark, the entire lineup_delta layer silently produces ZERO
manager WPA, no warning.** Roster changes mark snapshots stale, silently dropping credit.

## B4. Recommendation — fold deeper into mWAR? **NOT YET.**
Hold for two reasons: **(1)** the baseline is **static at snapshot time** (single hand, neutral context),
so manager-credit quality is gated by analyzer quality — deepening amplifies a weak counterfactual.
**(2)** double-counting is **declared but not enforced**: the lineup_delta "actual" term IS the starter's
realized KBL-WPA — the same quantity already in the player-WPA bucket and overlapping deployment stints; the
`doubleCountingExclusions` list (`managerDecisionRegistry.ts:140`) is not an actual subtraction. **Two
preconditions before deepening:** (a) the analyzer becomes situational per game-state (the shared Part-A
win-value upgrade), and (b) the exclusions become an **enforced net-out**. Until then, the current small
share/caps are correct *because* they avoid over-trusting a static baseline.

## B5. Real-time UX guidance (surface accept/adjust without burden)
1. **Make the engine's pregame optimal an auto-official default with one-tap Accept** (promote to
   `user_confirmed_engine` via existing `confirmEngineOptimalLineupSnapshot`, `optimalLineup.ts:237-251`) so
   the manager lineup grade counts **by default**, not only for diligent users — fixes the silent-zero.
2. **Auto-refresh on roster change** + one-tap re-confirm instead of silently dropping credit.
3. **Fix the franchise fitness stub** (`TeamHubContent.tsx:1011`) so the suggestion is the situational one.
4. **Keep accept/adjust at the pregame moment**, not buried in the Team Hub editor.
5. **Do NOT add an in-game per-AB lineup re-optimization prompt** — that's the burden trap. The in-game
   accept/adjust loop belongs to the **move advisor** (Part A), not the lineup analyzer.

---

*Key build files: `playerDatabase.ts` (trait level field), `effectiveRatings.ts` (situational vector +
potency), `subRecommendations.ts` (advisor scorer — swap yardstick), `managerWpaRecommendations.ts`
(headless keep-in builder), `GameTracker.tsx` (live-state assembly to hoist; bullpen reg; game-lock
snapshots), `rosterAnalyzer.ts` + `optimalLineup.ts` (optimizer + gating + dual-scorer drift),
`managerWpaGameState.ts` (lineup_delta baseline + caps), `managerDecisionRegistry.ts` (exclusions to enforce).
Browser-unverified: trait-level capture UI (likely none), live bullpen mojo, leverage at call time.*

---

## JK rulings — round 2 (2026-06-26)

- **Trait potency = chemistry potency, and it is DYNAMIC.** The trait "level" the engine needs is the
  engine's existing L1/L2/L3 **potency** dial (today pinned to L2) — and it is tied to **chemistry
  potency**, which the **scout / draft-guide already computes**. Today `chemistry` is stored but never
  resolved into the potency dial (`playerDatabase.ts:66`), so the dial sits at L2 for everyone. **The
  prerequisite is therefore NOT a fresh static "capture a level field" — it is: wire the scout's
  chemistry-driven potency into the TV/IV + advisor `potency` input, and RECOMPUTE it on roster moves.**
  Critical reason: trait potency **changes with call-ups / send-downs during the living season** (roster
  composition shifts chemistry → shifts potency); if the TV engine doesn't track this, players get
  over/under-valued after every call-up/send-down. Leverage existing scout logic; the dynamic-recompute
  on roster change is the new wrinkle.
- **Pregame flow to be collapsed (first-principles).** Re-examine whether a separate pregame layer is
  needed for franchise at all. Direction: teams set live lineups in the **roster tab** OR a **dedicated
  lineups tab** that feeds GameTracker when the user hits **"Play Ball"**; the in-GameTracker pregame
  "Start Game" state becomes only a **buffer/safety-net** for a last-second change. Removes the extra
  pregame layer. (Aligns with B2's "burdensome, opposite of infer-and-confirm" finding.)
- **Optimal lineup = scout-driven advisor on the LINEUPS TAB, NOT in mWAR** (confirmed). Accept/adjust
  advisor feature, not a manager-WPA input.
- **Lineups tab = opponent-SP-specific, rotation-aware, living-season node.** The lineups tab must:
  (1) read the team's **next game + opponent**, and that opponent's **next starting pitcher** (from their
  4-man rotation), and **optimize the lineup against that specific pitcher's playerID** — full
  ratings/traits/handedness — NOT a generic RHP/LHP snapshot; (2) **auto-advance each team's rotation**
  after processing the prior game (next SP in the 4-man); (3) allow the user to **manually reorder the
  rotation/lineup and edit mojo/fitness** on the tab; (4) be a **flow-through node**, reading and writing
  living-season data so every feature influences/​is-influenced-by the others (not standalone).
  - *Grounded feasibility:* the optimizer engine (`rosterAnalyzer.optimizeLineup` →
    `effectiveRatings(player,state,ctx)`) **already reasons against an opposing PLAYER with full
    profile/handedness** — so "optimize vs the actual next starter" is an EXTENSION (feed the real SP as
    the opposing context) of existing brains, not a rebuild; today it's just called with a generic hand +
    neutral context. Schedule/next-opponent already exists (`scheduleStorage.ts`, `useFranchiseData().nextGame`).
  - *The genuinely NEW system piece:* a **persisted per-team rotation pointer that auto-advances on real
    game completion** and exposes the next SP. Today only a synthetic/sim `rotationIndex`
    (`syntheticGameFactory.ts:78-152`) and roster-level SP designations exist — no living-season
    rotation state that advances after each real game. Build: track rotation position, advance on game
    complete, expose next SP, allow manual override. (To confirm precisely at scope time.)

## CONVERGENCE with the keystone roster-optimizer (archetype brief, 2026-06-26)

Per `FRANCHISE_DRAFT_ARCHETYPE_ALIGNMENT_BRIEF.md` (branch `codex/draft-pipeline-fix`, commit `5f589b57`):
the archetype/draft work already decided to **BUILD a generalized "keystone roster-optimizer"** that powers
THREE things with one engine — **pre-draft pool feasibility, the draft guide, and the IN-SEASON SCOUT
(call-up / send-down / trade / lineup recommendations)**. **The "advisor rebuild" scoped above IS the
in-season-scout arm of that same keystone optimizer — not a separate engine.** Do not build a one-off
move advisor; the manager-WPA rung 2 and the rotation-aware lineups tab both ride on the keystone optimizer.

Two direct ties:
- **Yardstick upgrade = the brief's "fielding-corrected true value" (§4).** The brief already decided: keep
  the **canonical IV frozen** (it runs the economy — salaries/budgets/auction), but give the
  optimizer/draft-guide its **own fielding-corrected true value** that prices web gems / diving catches
  (and bad-glove overvaluation) in BOTH directions. **That fielding-corrected true value IS the win-value
  yardstick the advisor should use instead of raw auction IV** (replaces A2/A4's "swap the yardstick").
  - **Manager-WPA metric is SAFE from the fielding mispricing:** it scores on real per-play
    win-probability, which already prices the *actual* web gem/error — so the 3:2:1 metric needs no
    correction. Only the **advisor/optimizer** (IV-based) needs the fielding-corrected true value.
- **Chemistry-driven trait potency** (dynamic on call-up/send-down) feeds this same true-value/optimizer —
  so the chemistry-potency wiring is a shared prerequisite for the keystone optimizer, not advisor-only.

**Unified sequencing:**
1. **Manager-WPA metric (3:2:1)** — ships FIRST, independent (real-WPA based; needs neither the optimizer
   nor fielding-correction). Simmable on active-vs-untouched rungs.
2. **Keystone roster-optimizer track** (shared with draft/archetype): fielding-corrected true value +
   chemistry-potency wiring (dynamic on roster moves) + situational/win-value + opponent-SP-specific,
   rotation-aware lineups tab. Powers draft guide + in-season scout + lineups tab, and **lights up
   manager-WPA rung 2** when it lands.

## Player matchup-history + rivalry (3rd concept, JK exploring in another thread — 2026-06-26)

Folds in as a **shared data substrate with TWO consumers**; does **not** touch the manager metric.
- *Grounded reality:* (a) **team-vs-team** head-to-head exists (`h2hTracker.ts`, localStorage, playoff
  tiebreakers) — NOT the player-pair thing wanted. (b) A **batter-vs-pitcher matchup line** is DISPLAYED
  in GameTracker (`getMatchupEvents` `eventLog.ts:1687` → `buildFenwayMatchupSummary`
  `fenwayBoardContext.ts:52`; `historicalMatchupRecord/Avg` `GameTracker.tsx:2399-2400, 6066-6086`), but it
  is built by querying the event log — whether it **durably aggregates+richens across the whole
  season/career** vs within-game is UNVERIFIED; JK's "needs to aggregate" instinct suggests the durable
  player-pair ledger is largely a **new build**. (c) **Player-to-player rivalry edges have no home** —
  rivalry/morale today is team/fan-scoped (`fanMoraleEngine`, `masterMoraleMatrix`; team-scoped
  `rivalryScores` can't hold player edges per L13 analysis) → **new store needed**.
- *Substrate (build once, cross-thread):* a persistent batter-vs-pitcher ledger holding BOTH the
  **aggregate** (career/season line) AND **recency** (e.g. 3-for-last-4, 2 HR).
- *Consumer A — scout/keystone optimizer (decision):* matchup history becomes another situational input
  to sub recs + opponent-SP-specific lineup optimization ("owns this pitcher lately → favor; 0-for-career
  → pinch-hit"). Sits beside ratings/traits/handedness/mojo/chemistry-potency.
- *Consumer B — relationship/rivalry/morale (soul):* matchup history spawns player rivalries; rivalry
  at-bats/games carry amplified morale; the in-the-moment "pitcher knows he's 3-for-4, 2 HR off him"
  pressure is a **mojo nudge** that flows into performance and the manager's leverage.
- *Sequencing:* does NOT gate or alter the manager metric (ships first). Coordinate the substrate across
  threads (define once, both the scout and the morale engine read it) — don't build it twice.

## Connected-layers picture (one shared spine)
1. **Manager metric (3:2:1)** — ships first, independent (real-WPA based).
2. **Keystone optimizer / scout** — true value (fielding-corrected) + chemistry-potency + situational
   win-value + matchup history + rotation-aware opponent-SP lineups. Powers draft guide + in-season scout
   + lineups tab; lights up manager rung 2.
3. **Living-season soul** — relationships, rivalries, morale — fed by the same matchup-history substrate.
All share the IV/true-value spine and the event/matchup data. Cross-thread coordination: optimizer +
matchup substrate are shared builds (define interfaces once, consume from many).
