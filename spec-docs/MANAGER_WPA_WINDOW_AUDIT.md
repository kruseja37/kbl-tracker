# Manager WPA/WAR — Attribution-Window Audit & Design Input

**Date:** 2026-06-26
**Branch:** `experiment/manager-wpa-window` (isolated experiment off `codex/franchise-v1-next`)
**Author:** Claude (Captain), cross-verified by 8-agent audit workflow + independent code/spec reads
**Question that started this:** JK wants a "360-degree" manager metric that, when a manager subs a
player in *or keeps him in*, credits the manager a share of that player's **net** value (hits, web gems,
errors, baserunning) for **as long as the player stays in the game** — window opens when the player
enters, closes when removed, then opens for the replacement. JK's strawman: "net WPA of the players in
the lineup throughout the game (starters and subs alike) × a manager percentage." He asked whether
there's a better idea.

---

## TL;DR (plain language)

**The model JK is describing is not greenfield — a more sophisticated version is already built and
already running live in the game tracker.** Every manager is scored on **three layers at once**:

1. **Tactical** — the split-second call, scored on a *narrow* window (a pinch hitter's entry at-bat,
   the steal, the bullpen move). This is the part JK is frustrated with.
2. **Deployment stint (the wide tenure window — this IS JK's idea)** — for every player the manager
   subs in *or explicitly keeps in*, a window opens and follows that player, summing his real per-play
   win-probability (batting + baserunning + fielding) until he's removed/changes role/game ends, then
   hands the manager a capped percentage of the net.
3. **Lineup delta** — each *starter* is followed across the whole game and scored against what the
   optimal-lineup projection said a replacement would have produced.

Canonical formula (spec): **`Manager Value = Tactical + Deployment + Lineup Delta`.**

**The three real gaps (not "build a model" — "finish/retune the one that exists"):**
- **(A) Untouched starters get no stint.** The wide tenure window only opens for players the manager
  *actively moves or keeps*. A starter the manager never touches is credited only via the
  projection-based lineup delta — not via a net-value tenure window. JK explicitly wants starters
  included ("starters and subs, alike").
- **(B) It's a small, role-filtered, capped *overlay*, not "a clean share of net value."** Shares are
  10–20%, with per-role caps (±0.10–0.20) and a ±0.50/game team cap, and the role filter *zeroes out*
  contributions that don't match the deployment role (e.g. a defensive sub's *baserunning* is dropped).
  That's deliberate in the spec ("managers don't absorb too much player performance") but it's narrower
  and weaker than JK's "share of net value for as long as he's in."
- **(C) The season roll-up is orphaned.** Per-game manager value is derived, scored, persisted, and
  shown in the Almanac — but nothing rolls it into a stored season/career Manager-WAR number. The old
  `mwarCalculator` (narrow heuristic model) is dead/unwired. So no leaderboard or award currently
  depends on this — which makes now the **safest** time to change the per-game shape.

**Prerequisites for the wider window — both already satisfied:** real per-play player WPA (MLB-Savant
empirical engine, WPA v2, live) and full per-player tenure reconstruction from the event log.

---

## 1. Truth-map — how a manager is credited TODAY

Live path: `src/utils/managerWpaDerivation.ts` (tactical) + `src/utils/managerWpaGameState.ts`
(deployment stints + lineup delta). Every value is **real win-probability delta × a fixed manager
share** — there is **no `±0.4·√LI` heuristic** anywhere in the live path (that lives only in the dead
`mwarCalculator.ts` / v1.0 `MWAR_CALCULATION_SPEC.md`).

| Decision | Actual window in code | WP source | Where ongoing value is lost |
|---|---|---|---|
| **pinch_hitter** (tactical) | **first** matching PA only — `findNextPlateAppearanceEndpoint` uses `.find()`, half-inning-locked (`managerWpaDerivation.ts:1934-1956`) | real | PAs 2..N recovered only by the deployment stint |
| **pitching_change** | first PA faced by incoming pitcher (`:1939-1944`); registry marks `deployment_initial_pa` exclusion | real | reliever's rest-of-appearance handed to the stint |
| **leave_pitcher_in / let_batter_hit** | next PA by the tracked player | real | single-event truncation |
| **defensive_sub / position_change / keep_defender_in** | the at-bat with the fielder's **first** fielding touch — `findFirstFieldingEndpoint` takes `candidates[0]` (`:2234`) | real | all later innings of fielding lost on tactical path |
| **pinch_runner** | runner's **terminal** base event (`findRunnerTerminalEndpoint :1959-1995`) — a genuine multi-event window | real | later PAs (if runner stays in) handed to stint |
| **intentional_walk** | rest-of-inning to walked-runner consequence; share 1.0 | real | n/a (already wide) |
| **steal_send / runner_hold / bunt / squeeze / hit_and_run** | immediate `same_event` | real | n/a (genuinely single-play) |
| **out_advancing_send** | counterfactual: actual vs. hold-the-runner alternate state (`:2757-2868`) | real (counterfactual) | n/a |
| **DEPLOYMENT STINT (the wide one)** | **opens** at sub/keep, **closes** on removal / role-change / runner-terminal / game-end; sums the player's own per-play credits across the window (`managerWpaGameState.ts:451-521`) | real | **role-filtered** (`getManagerDeploymentCreditWeight :101-139` zeroes non-matching roles) + **capped** (per-role + team cap 0.5) |
| **lineup_construction** | **whole game**: starter's actual full-game KBL-WPA minus optimal-lineup *projection*, ×0.25, capped 0.25/player & 0.75/team (`:943-1064`) | real (vs. projection) | only fires for slots that **deviate** from optimal; opportunity-cost delta, not a net-value share |

Per-role deployment shares / caps (`managerWpaGameState.ts:54-80`): `pinch_hitter_remaining` .15/±.10 ·
`pinch_runner` .20/±.125 · `defensive_position` .20/±.15 · `pitcher` .15/±.20 · `kept_*_in` .15/±.15 ·
`manual` .10/±.10; **team cap ±0.50/game**.

---

## 2. Wiring verdict

- **Per-game derivation: LIVE and UNFLAGGED.** `GameTracker.tsx:81` (`refreshCurrentGameManagerDecisionState`);
  `recomputeCommittedManagerWpa` called unconditionally at ~10 commit sites in `useGameState.ts`;
  game-end derivation persists onto `PersistedGameState`. No `FRANCHISE_V1` / `isFeatureEnabled` /
  `MWAR_ENABLED` gate. `franchiseAnalyticsTrust.ts` is a read-only *descriptor* (a "visibility" count),
  **not** a runtime kill-switch. The hypothesized `wpaRuntimeBoundary.ts` does not exist.
- **Season/career roll-up: ORPHAN.** `managerStorage.ts` `saveGameDecisions` / `saveManagerSeasonStats` /
  `aggregateManagerGameToSeason` / `updateManagerCareer` have **zero non-test callers**. Per-game manager
  rows ride along on each game archive; nothing aggregates them into a stored season number.
- **Legacy `mwarCalculator.ts`: DEAD.** Neither `useMWARCalculations` hook is invoked anywhere; only its
  MOY-vote + formatting helpers survive (`AwardsCeremonyFlow.tsx`). Header self-redirects to the WPA layer.
- **Almanac DOES aggregate all three layers** per manager tenure (`almanacQueries.ts`:
  `tacticalManagerWpa + lineupDeltaWpa + deploymentWpa`).

**Blast radius:** changing the window touches a live, unflagged per-game path that already writes the
archive (visible immediately in new games), but **no leaderboard/award consumes the aggregate yet** — so
the per-game shape can be changed before anything downstream depends on it. (Real-data acceptance remains
JK-browser-pending per project rules.)

---

## 3. Data availability — both prerequisites EXIST

- **Per-play player WPA: real & live.** `eventLog.calculateWPA → wpaCalculator.calculateWPA →
  calculateWpaV2 → winExpectancyModelV2 → mlbSavantWinExpectancy`, `WPA_MODEL_VERSION =
  MLB_SAVANT_WPA_MODEL_VERSION`. **WPA v2 has landed** — the live engine is the MLB-Savant empirical
  win-expectancy model, *not* the repudiated synthetic ±5-clamp table the rebuild spec warned about.
  `kblWpaAttribution.ts` splits each play into per-player, per-role credits (batting/pitching/fielding/
  baserunning/catching). The deployment stint already consumes exactly these.
  *(Modeling caveat, pre-existing & separate: it's an MLB-based table applied to SMB4's higher-scoring
  environment — an approximation, but a real empirical one, not a blocker.)*
- **Per-player tenure: reconstructable.** No standing live-roster object in the manager files, but the
  event log (`substitution`, `pitcherChange`, `AtBatEvent`, `FieldingEvent`, `runnerOutcomes`) plus
  `buildDeploymentTimeline` fully reconstruct each player's entry→exit span. Starting lineups/pitchers
  are on `GameHeader`. **What's missing is only a window that *opens at a starter's game-start entry*.**

---

## 4. The gap, stated plainly

Today the unit of credit is **the decision**: a fixed slice of the real win-probability swing in a short
window tied to the move, plus a capped/role-filtered "deployment" share of a *substituted* player's later
value, plus an opportunity-cost delta on *deviating* starters. JK wants the unit to be **the
player-stint**: every player — starter or sub — opens a window on entry, closes it on removal, and the
manager banks a percentage of that player's **net** WPA (all roles, good and bad) across the span. The
codebase already has the open/close window, the per-play WPA, and the share-and-cap machinery. It lacks
(1) a window for **untouched starters**, (2) **all-role net** accrual instead of single-role filtering,
(3) a decision on **overlay vs. replace** relative to the existing narrow tactical score, and (4) the
**season aggregation** (orphaned regardless of window choice).

---

## 5. Spec landscape

**Not greenfield.** `KBL_MANAGER_WPA_IMPLEMENTATION_SPEC.md` is canonical (supersedes
`MANAGER_MOMENTS_TRACKING_SPEC.md`; deprecates legacy fixed-value mWAR). It defines the three layers and
names JK's idea verbatim as **"Deployment WPA"**:
- §2: *"Deployment WPA remains open while the deployment remains active and captures later player
  outcomes linked to that role."*
- §8.4: lifecycle `opened → active → closed → scored`; opens on enter/keep, closes on removal/game-end;
  `rawLinkedPlayerWpa = sum(relevant player WPA while stint is active)`;
  `managerDeploymentWpa = clamp(rawLinkedPlayerWpa × managerShare, stintCap)`.
- `POG_WPA_TEAM_IMPACT_SPEC.md:209` & `MANAGER_WPA_MOY_CERTIFICATION.md §B` confirm Deployment WPA as a
  certified, intended term.

**Tensions the design must reckon with (flagged, not resolved):**
- Spec keeps the wide window as a **small capped overlay** *on top of* the narrow tactical score, with
  anti-double-count rules. JK wanting the wide window to **be** the model is a deliberate scope change.
- Spec deliberately keeps shares small/capped so "managers don't absorb too much player performance." A
  larger/uncapped share is a **values call** for JK, not a logic bug.
- **Overlay vs. collapsed** (does the manager's share sit as a separate lens or get *subtracted* from the
  player's WPA bucket) is explicitly unresolved in `KBL_WPA_ATTRIBUTION_MULTIPLIER_TABLE_DRAFT.md`.
- The v1.0 `MWAR_CALCULATION_SPEC.md` (`±0.4·√LI` heuristic, 60/40 decision/overperformance) is
  **superseded** — do not treat as live.

---

## 6. Open design questions (the forks)

1. **Starter vs. active-sub credit fraction.** Same share for a never-touched starter as for an active
   in-game move? *Lean: lower share for "set-and-forget" than for intervention, or passive lineup-filling
   dominates the metric.* (JK has already said starters are included at all.)
2. **Net absolute WPA vs. vs-replacement baseline.** *The single biggest values call.* Absolute = simple,
   "pure resulting," but a stacked roster makes any manager look elite. Vs-replacement = isolates the
   *decision/skill*, harder. (Lineup delta already uses a projection baseline; the stint uses raw.)
3. **How does "leave him in" (a non-action) get a window?** Continuous implicit keep-in windows risk
   crediting the manager for simply not acting; explicit prompted keep-ins (today's model) miss silent
   non-actions.
4. **Double-counting.** Manager share vs. player WAR (different ledgers — OK?) and tenure window vs.
   narrow tactical score (replace, or stack with exclusions like today?).
5. **Leverage weighting.** *Lean: no extra LI multiplier — per-play WPA already encodes leverage.*
6. **Role un-filtering.** A net-tenure model must stop zeroing non-matching roles
   (`getManagerDeploymentCreditWeight`) so defense + baserunning are actually captured — a deliberate
   departure from the spec's role-matching rule.
7. **Caps.** Current caps were calibrated for a *small overlay*; a whole-game-every-player window needs
   recalibration.
8. **Season aggregation must be built regardless** — the orphaned `managerStorage` roll-up is a known
   dependency for any standings/award number.

---

## 7. Captain's recommendation (for JK to ratify or redirect)

This is a **finish-and-retune**, not a rebuild. Proposed direction:
- **Keep the smart layered design** (moment-call *and* tenure) rather than collapsing to one number — it
  answers "good call vs. good outcome" separately, which is more of the 360° view JK wants.
- **Open a tenure window for every player including untouched starters** (close gap A) and **un-filter
  roles** so net value across batting/baserunning/fielding is captured (close gap B).
- **Decide absolute-vs-replacement by what the number is FOR** (fork #2) — see the question put to JK.
- **Build the season roll-up** (gap C) once the per-game shape is settled.
- Underlying WPA is trustworthy (v2/Savant live), so widening is safe to calibrate now.

---

## 8. JK rulings & locked model (2026-06-26)

JK initially leaned "vs-expectation" (Option 3) but **reasoned his way to a cleaner model** and revised.
The locked direction:

- **Baseline = ZERO (net WPA), not rating-expected-value.** Manager is credited a *share* of each
  in-game player's **net whole-game win-probability swing** across all roles (bat + glove + legs).
  Net-positive player → helps the manager; net-negative → hurts. JK: *"measured whether a player's net
  WPA is positive or negative … we assume a net neutral performance from every player."*
- **No counterfactual for removals — the fairness keystone.** Once a player is pulled, what he "would
  have done" is **unfalsifiable**, so the manager is **never** charged a ghost. Pull a hot starter for a
  net-neutral bullpen → no penalty (you keep the starter's banked positive; the reliever's actual net is
  what counts after). JK: *"judges the manager against reality instead of our assumptions … that's
  unknowable which is what makes this model fair."*
- **Leverage weighting is INTRINSIC to WPA — add no second multiplier.** Win-probability swings are
  already larger in high-leverage spots; an extra ×LI term would double-count. (Resolves JK's "weight by
  impact" — it's already handled.)
- **Small-ball tactics are ABSORBED into player stint WPA — no separate scoring layer or prompts.** A
  steal/bunt/squeeze already lives inside the runner's net number → flows to the manager via that stint.
  Personnel/deployment is the heart of the score by construction. Fewer in-game prompts = simpler.
- **Roster-quality advantage is ACCEPTED as a feature**, mirroring real-world awards/perception. JK:
  *"a better roster possibly gives the manager a built-in advantage … reflective of how perception and
  awards work in the real world. Wins translate to awards."*
- **Share weighting = WEIGHTED TOWARD ACTIVE** (Option 1). Active interventions earn a bigger slice than
  passive starters, so the number has its own identity vs. the standings. JK flagged the gradient
  himself: proactive sub-in vs. passive not-subbing-out. **Captain proposal (pending JK):** 3 : 2 : 1 —
  active move : conscious keep-in : untouched starter.
- **This maps ~1:1 onto the existing deployment-stint engine and is LESS to build than a vs-expectation
  model** (no per-player expectation/alternative projection needed). Build deltas vs. today: (A) open a
  stint for *every* player incl. untouched starters; (B) un-filter roles to count the *whole* game; (C)
  loosen caps (calibrated for a small overlay); (D) build the orphaned season roll-up.

---

## 9. Spin-off track: situational advisor rebuild + optimal-lineup ↔ mWAR (JK 2026-06-26)

**Separate engine effort, NOT part of the manager-WPA build. It only gates the "2" rung (conscious
keep-in) and the optimal-lineup-vs-mWAR question.**

**The advisor rebuild — JK's requirement (verbatim intent):** the in-game move advisor must have true
*situational awareness*, including **how traits operate situationally**. It must read the full player
profile of the current pitcher, current batter, and **all** bench/pen options, and reason about the live
matchup. JK's worked example (the acceptance test):
> Current batter is *tense* (plays below ratings); the RH pitcher is *locked-in* and has **level-2
> Specialist** → don't recommend a RH batter off the bench against this pitcher (especially if the
> current batter is a lefty). BUT a RH bench bat has **level-3 CON vs RHP** and **level-3 POW vs RHP** —
> those could offset the pitcher's level-2 Specialist and tip the edge to the pinch-hitter → recommend
> the PH. If the manager declines and the current batter reaches → the manager **wins** that conscious
> keep-in. Goal: the engine does this analysis so the **user stays in the game** instead of pausing
> every at-bat to weigh options.

**Grounded feasibility finding (this session):** the trait model (`src/data/traitPricing.ts`) is a
**static auction valuation** — each trait (incl. handedness ones like `CON vs RHP`, tiered ones like
`Specialist x1.3/1.4/1.3`) applies flat rating deltas/multipliers to a player's standalone value,
**context-free** (not conditioned on the live opposing handedness/matchup). Mojo (tense/locked-in) and
fitness states modify ratings via `effectiveRatings`. So the *ingredients* exist (handedness-split trait
names, per-level multipliers, mojo/fitness state) but the **situational matchup engine that conditions +
nets competing trait effects does NOT** — that is the rebuild. **Open data risk to verify in the dig:**
whether trait *levels* are actually stored/captured per player (cf. the recurring "verify data
persistence before trait builds" trap), since the worked example needs level-2/level-3 granularity.

**Shared engine:** this same situational engine powers the **Optimal Lineup analyzer** (manager can
accept/adjust). JK wants a deep-dive — *current backend behavior, desired behavior, current UI/UX & where
it lives* — to decide whether/how to fold the optimal lineup into mWAR (it's partly there already via the
`lineup_delta` baseline) and how to surface it **real-time without burdening the living-season UX**.
(Deep-dive workflow running 2026-06-26.)

---

*Primary sources: `managerWpaDerivation.ts`, `managerWpaGameState.ts`, `managerDecisionRegistry.ts`,
`eventLog.ts`, `kblWpaAttribution.ts`, `wpaCalculator.ts`/`wpaV2.ts`/`winExpectancyModelV2.ts`/
`mlbSavantWinExpectancy.ts`, `managerStorage.ts`, `almanacQueries.ts`, `types/managerWpa.ts`;
specs `KBL_MANAGER_WPA_IMPLEMENTATION_SPEC.md §2/§3.1/§3.4/§8.4`, `POG_WPA_TEAM_IMPACT_SPEC.md`,
`MANAGER_WPA_MOY_CERTIFICATION.md`, `KBL_WPA_ATTRIBUTION_MULTIPLIER_TABLE_DRAFT.md`,
`KBL_WPA_ENGINE_REBUILD_SPEC.md` (note: synthetic-table warning is now stale — v2 shipped).*
