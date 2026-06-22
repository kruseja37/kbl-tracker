# RATINGS ADJUSTMENT SPEC — relative, age-aware, one engine (v1)

**Status:** DESIGN — rulings RATIFIED by JK 2026-06-22. Companion to `TRAIT_GAIN_LOSS_THRESHOLD_SPEC.md` (the trait analog). Consolidates four divergent rating-mutation models into one engine. Magnitudes are sim-tune placeholders (shapes locked).

---

## 1. The idea (one sentence)
At each checkpoint, every rating moves on **how far the player's actual production beats or misses what his ratings predicted** (per attribute), with that expectation **calibrated to his position peers in the current league** (so the league never inflates) — made **age-fair** by an age modifier + rookie modifier on a **deterministic 5-band age curve**, with **edge-compressed growth** (points are cheap down low, expensive near 99) so an undeveloped player who *overperforms his tools* can leap while an already-elite player barely moves.

## 2. Consolidation — four models → one engine (RULED)
Today there are FOUR divergent rating-mutation paths, none implementing the spec, no canonical age curve:
- **A** `ratingsDevelopment.ts` — in-season own-TV×morale, ±6 cap, dead-band 0.75 (built, triple-dark). **The consolidation base.**
- **B** EOS `computeNetChange` (war×1.5 + crude age, persisted) — **retire as a live path.**
- **C** `agingEngine.ts` phase random-walk (orphaned) — **retire as a live path.**
- **D** the archived spec algorithm (peer-median × grade asymmetry) — superseded by this spec.
**RULED:** ONE adaptive engine. In-season checkpoints + **EOS = the final checkpoint** of the same engine (sets next-season profile). Retire B + C as live paths; deprecate the award-luck offseason model (`EOS_RATINGS_ADJUSTMENT_SPEC §449`). Mode-3 (offseason) out of v1 scope — redesigned post-v1; the season-end checkpoint is v1's only offseason profile change.

## 3. The signal — performance vs PEER-CALIBRATED EXPECTATION, per attribute (RULED — refines the earlier "relative percentile")
**RULED (JK 2026-06-22 refinement):** a rating moves on **how far the player's ACTUAL production beats or misses the production EXPECTED from his ratings** (per attribute), with the expectation **calibrated to his position peers in the current league**. This *refines, not abandons,* the anti-inflation "relative" ruling: the expectation is peer-calibrated, so the league still can't drift up — but the signal now also captures *how impressive* the performance is given the player's tools, which a raw peer-percentile threw away.

**Why this beats both pure forms:**
- **Pure absolute** (actual vs your OWN expected, un-calibrated) → inflates: in a strong-hitting league everyone beats expectations → everyone rises. ❌
- **Pure peer-percentile** (committed earlier) → self-correcting but flat: a C-rookie at the 95th SS-percentile reads identically to an A-vet at the 95th, losing the "more impressive given weak tools / more room to grow" reward. ❌
- **Actual vs PEER-CALIBRATED expected** → self-correcting (no inflation — expected tracks the league/position environment) AND captures over-expectation magnitude + the inverse-with-baseline reward. ✓ The genuine compromise. (Yes — this is the *fixed* version of the "absolute" idea; the peer-calibration is the fix.)

**The inverse relationship (RULED):** because ratings drive performance, a high-rated player producing well is merely *meeting* a high expectation → small/no move; a low-rated player producing well is *exceeding* a low expectation against the odds → big move. The reward scales with the **surprise**, not the raw stat line. Combined with edge-compressed growth-rate (§6A — cheap points down low, expensive near 99) this is the "baseline ratings matter; growth dampens toward 99" behavior — while **performance is still the gate** (a low-rated player who only produces at his low expectation grows nothing; bad tools usually → bad stats → he stays put; the rare bad-tools-good-production breakout is what gets paid).

**Deterministic** (not seeded-probabilistic) — the magnitude of the gap is the gradation, no roll needed. Reproducible.

## 3A. The expected-stats engine — the keystone (feasibility: greenfield engine, ~70% plumbing present)
The one genuinely new engine: **ratings → expected per-category production**, compared to actual, peer-calibrated.
- **Per-category expectation:** each rating predicts expected stats in its OWN categories — power → ISO/SLG/HR-rate; contact → AVG/OBP/K%; speed → SB/3B/range; fielding → fielding%/error-rate/range; arm → assist-rate (pitchers: velocity → K%, junk → weak-contact/HR-suppression, accuracy → BB%). Per-category → per-attribute signals (this is what makes "all relevant attributes move," §6, real).
- **Peer-calibrated + position-aware:** the expectation is anchored to the CURRENT league's per-category means within the position pool → the anti-inflation valve (a juiced environment raises everyone's expected bar too).
- **Signal = (actual − expected) per category,** normalized, fed per rating key into the dev math.
- **Equilibrium (the natural bound):** as a rating rises, its expectation rises with it, so the gap shrinks — the rating converges to the level its sustained performance justifies, then stops. This (plus §6A edge compression) is what bounds movement; **no arbitrary seasonal grade-cap needed** (the old flat cap is dropped — see §6A).
- **Feasibility (research `w1yg079a5`): ~70% of the plumbing exists; the expected-stats model is the new ~30%.**
  - REUSABLE NOW: actual per-category season-to-date stats are fully plumbed + fresh at every checkpoint (`PlayerSeasonBatting/Pitching/Fielding`, `seasonAggregator.ts`, runs *before* the sweep) · the per-attribute nonlinear curve SHAPE (`ivEngine.ts` `attrCell`/`twoSegment`, the 8-attr iteration) · the position-peer percentile engine (`salaryCalculator.ts:1007-1017`) · live league-mean normalizers (`bwarCalculator.ts:309 calculateLeagueWOBA`, `franchiseExpectedWinsPreview.ts:124`) · static per-category anchors (`SMB4_BASELINES`, `war.ts:60-74`: AVG .288 / OBP .329 / SLG .448 / wOBA .329 / HR-rate .031 / K-rate .166 / BB-rate .055 / FIP 4.04) · rate helpers (`seasonStorage.ts:738-784`) · the checkpoint loop already loads each player + morale + modifiers + TV.
  - GREENFIELD (build): (a) the ratings → expected-per-category curves (anchor midpoints to `SMB4_BASELINES`, reuse the `ivEngine` two-segment shape, output *stats* not $); (b) wire LIVE league per-category means (vs the hardcoded baselines) so expected tracks the environment; (c) fan-out from today's single `valueDelta` scalar → a per-category signal vector (today `franchiseCheckpointSweepCompute.ts:184` feeds one True-Value-dollar delta into ONE hash-picked attribute — replace it + drop `selectDevelopmentRatingKey`); (d) ISO/K%/BB%/FIP helpers (trivial from existing fields); (e) a **min-sample / qualification guard** (NONE exists today — early 10–20% checkpoints would be noise without it).
  - Do NOT repurpose TV/IV — they run actual→$ or ratings→$ (wrong direction/output). New engine, reusing the scaffolding above.

## 4. The cohort + modifiers (RULED — the integrated model)
The POSITION GROUP is the pool that **calibrates the expectation** (§3/§3A): a player's actual-vs-expected gap is measured against what his position peers in the current league produce. Modifiers shift the expectation bar (NOT tiny sliced cohorts — age/rookie adjust the bar on a big pool, so no thin-pool noise):
- **PRIMARY = actual vs peer-calibrated expectation, within the POSITION GROUP:**
  - Hitters: **Catchers · Corner IF (1B/3B) · Middle IF (2B/SS) · Corner OF (LF/RF) · Center (CF).** (**No DH** — removed from the franchise position model; see §13.)
  - Pitchers: **SP · RP** (RP = SP/RP-with-no-starts + RP + CP).
  - Per-attribute: each rating moves on its own category's actual-vs-expected gap, calibrated within the position pool.
- **AGE MODIFIER (5 bands) — makes the expectation age-fair** (shifts the expected bar): young & old get **benefit-of-the-doubt** (a lower bar to clear), prime players face the **strictest** bar (expected to be better than relatively young/old peers). Bands = the single age structure in §5: **18–21 / 22–24 / 25–31 / 32–35 / 36+.** **Weighting (RULED):** age influence is **secondary to the position group** — position-group calibration dominates; the age band "brings it into focus" (JK: *"position group matters most but age-tier brings the position group comparison into focus"*). It shifts the bar, it is NOT a co-equal second comparison.
- **ROOKIE MODIFIER (RULED) — visible designation + code-readable flag:** a rookie = **recently called up from the farm** (reuse the existing `Player.rookieScaleActiveBySeason` call-up flag — already set on first farm→MLB promotion; §10). Effects: **resist loss** + **develop faster** on strong early performance (subsumes the "rookie downside shield"). Rookies carry a **dynamic-designation badge** (icon) so the status is visible in the hub AND a code-readable flag the ratings engine reads — modeled as a **dedicated player flag + a ROOKIE badge descriptor**, NOT a row in the team-singular designation store (which holds only one player per team-per-award). See §13B.
- **Fallback ladder** (when a position-group pool < min peer-pool): broaden — merge bench/starter → widen position group → floor at hitters/pitchers. Always a valid pool. (The age/rookie modifiers don't fragment the pool — they're applied to the percentile, not sub-buckets.)

## 5. The age curve — baseline aging gravity (RULED; ONE 5-band age structure)
**RULED (5-vs-3 reconciliation):** there is **ONE age structure of FIVE bands**, used by BOTH effects — the §4 MODIFIER (a weight per band) and the CURVE here (a slope per band). No separate 3-phase curve. (The earlier "develop<25 / peak25-32 / decline33+" 3-phase framing is superseded — it was the inconsistency JK flagged; no ruling ever pinned the curve to 3 phases.)

| Band | Curve slope (aging gravity) | Modifier (comparison fairness) |
|------|------------------------------|--------------------------------|
| **18–21** | strong develop (upside) | most benefit-of-doubt |
| **22–24** | mild develop | benefit-of-doubt |
| **25–31** | peak / ~flat | strictest bar |
| **32–35** | mild decline | benefit-of-doubt |
| **36+** | steep decline (steepening) | most benefit-of-doubt |

- **Per-attribute realism:** speed/fielding/arm erode faster with age than power/contact (and develop differently for youth). (Both legacy models got this wrong.)
- **Age + performance COMBINE:** a 35-yo who plays great can still net positive; an average aging player nets a gentle decline; a poor one craters.
- Deterministic additive term in the one engine (kills the Model-C random walk).
- **Curve vs modifier (why both, on one band set):** the **MODIFIER** = fairness of the *performance comparison* (graded against age-appropriate expectations); the **CURVE** = the baseline aging *gravity* (which way age pulls regardless of performance). NOT redundant — without the curve an average-for-his-age old player would never decline; without the modifier an old player is double-penalized (declined AND ranked against young studs). **Calibration constraint:** the old-age benefit-of-doubt (32–35 / 36+ modifier) must not fully cancel the same bands' curve decline — net of the two, an average aging player still trends gently down.

## 6. Magnitude, dead-band, diminishing returns, attributes
- **Magnitude:** signed continuous delta from the **over-expectation gap** (§3, age-modified) shaped by the §6A convex curve + edge compression + the age-curve term + morale coupling (high morale amplifies gains / shrinks drops, per Model A), capped per checkpoint, 0–99 clamp. (See §6A for the full range model — the magnitude is the gradation, so it must be aggressive-when-warranted; ±1–2 is noise given that traits + mojo already swing the profile that much.)
- **Dead-band (RULED: asymmetric hysteresis):** a larger signal is required to *start* a rating moving than to *continue* — prevents ±1 jitter every checkpoint. (Model A's symmetric 0.75 → asymmetric.)
- **Per-attribute diminishing returns — BOTH ends (RULED):** gain magnitude shrinks as a rating approaches **99** (hard to push an already-great attribute higher) AND loss magnitude shrinks as a rating approaches **0** (hard to bottom out a already-weak attribute). Symmetric edge compression → reaching an elite tier in one season demands *truly* elite sustained performance, and floor players resist cratering to zero. (Formalized in §6A; supersedes the single-ended "near-99 only" framing.) **DROP** the spec's separate whole-player grade/salary asymmetry (avoid double-counting).
- **All relevant attributes can move (RULED):** every attribute with a clear performance signal can move each checkpoint (replaces Model A's single hash-picked key — which was a placeholder; development now targets what the player's performance actually reflects).

## 6A. Range & magnitude — "earn the rare leap" (RULED; aggressive at low baselines)
**Philosophy (JK):** ±1–2 points "may as well be zero" — traits coming/going and mojo swings already move the profile that much, so movement must be **aggressive WHEN WARRANTED**. A low-rated player who *overperforms his tools* all season can leap **multiple grade-bands** (it's improbable, so it's richly rewarded and it lets him *sustain* the run); an already-elite player barely moves (he's only meeting a high bar, and his points are expensive). The hard part is the gate: it must be **earned** — but it's **possible**, and bigger the lower you start.

**(a) Convex reward on the over-expectation gap — the gate.** Let `r ∈ [−1,+1]` be the **age-modified over-expectation gap** (§3: actual − peer-calibrated-expected, normalized per category; `0` = met expectation, `+1` = wildly exceeded, `−1` = total collapse). Per-checkpoint move:
```
if |r| < startBar:           Δ = 0                          (dead-band — met expectation, no move)
else:  Δ = sign(r) · baseScale · ((|r| − startBar)/(1 − startBar))^γ · edge(rating) · age · morale · rookie
       with γ > 1   (convex)
```
- **γ > 1 (convex):** marginally-over-expectation → *tiny* move; only a big surprise (way over/under his tools' expectation) approaches the per-checkpoint cap. *Worked feel:* an average SS *hitting like a star* → huge gap → big climb; a power RF only marginally above his power-expectation → little movement; a player meeting his expectation → flat.
- **The leap must be SUSTAINED.** Per-checkpoint capped (generous, not tiny — accumulation allowed), so a multi-band jump requires staying way-over-expectation across many checkpoints. A one-checkpoint fluke is absorbed by the dead-band + the slow aggregate window (§8).

**(b) Edge compression = the inverse-with-rating growth rate (THE primary governor).** Multiply by an edge factor: gains scale by `((99 − rating)/99)^δ`, losses by `(rating/99)^δ`. **Points are cheap down low and progressively expensive toward 99** (and symmetrically hard to lose near 0). This is JK's "baseline ratings matter; growth dampens as you approach 99" — and it's why a 58-rated breakout can rocket while a 92-rated star can't. It REPLACES the old flat one-grade seasonal cap.

**(c) Equilibrium bounds it — NOT a seasonal cap (RULED: the grade-cap is dropped).** The natural bound is the §3A equilibrium: as a rating climbs, its *expectation climbs with it*, so the over-expectation gap shrinks → the player decelerates toward the level his sustained performance justifies, then stops. A 58-contact hitter who produces like a 90 converges *toward ~90* (cheap early points + big gap, decelerating as expectation catches up), not to 99. Edge compression (b) + this gap-closure are the governors. (A single **far-out per-season safety rail** — well beyond a grade, e.g. ~25 pts — exists only to catch pathological cases; it is NOT the working bound and must not bind normal breakouts.)

**(d) Anti-ping-pong (the "not erratic" guarantee).** Three reinforcing mechanisms: **directional hysteresis** (to *reverse* an established direction the opposing signal must clear a *higher* bar than to continue — a brief slump after a hot streak doesn't claw back gains; only a *sustained* reversal does) + the **slow aggregate window** (§8 — one hot/cold checkpoint barely moves the season-to-date gap) + **gap closure** (as the rating rises to meet performance, the signal naturally fades — no overshoot to whipsaw back from) + the **asymmetric dead-band**. Net: meaningful arcs, no checkpoint-to-checkpoint whipsaw.

**Tunables (all §16 sim-gate placeholders):** `startBar`, `γ` (convexity), `baseScale`, per-checkpoint cap, `δ` (edge — the inverse-with-rating strength), the per-category normalization scales, the far-out safety rail, `reversalBar`. Sim-tuning owns the final numbers; the SHAPES (convex gate, edge-compressed rate, equilibrium bound) are the rulings.

## 6B. Trade / "change of scenery" effect — reset the performance window only (RULED)
**RULED (JK): on a trade, reset ONLY the player's in-season performance-aggregation window** (the §8 season-to-date sample that drives his over-expectation signal) — start his actual-vs-expected accounting fresh on the new team. *(Same ruling/intent as before — "accumulator reset only" — re-expressed for the new signal model: the in-season accumulated state that a trade clears is now the performance window, since the old seasonal-cap accumulator was dropped in §6A(c).)* A full rating reset is **rejected** (unearned advantage, exploitable); a temporary recovery-rate boost is **NOT built in v1** (the window reset alone is the effect; revisit post-v1 only if sim-tuning shows it's too weak).
- The player **keeps his current (nerfed or boosted) ratings.** A slumping ex-star whose bad first-half aggregate was dragging his signal now gets evaluated on his **new-team** performance immediately → he can **recover faster IF he earns it**. The expectation gate still applies (he must beat his new-team expectation), so there is **no free recovery**. Symmetric: a hot player's window also resets.
- **The win-win deadline trade JK wants:** the albatross team offloads a bad contract; the acquirer bets on a bounce-back. Never a free win — contingent on post-trade performance + acquisition cost.
- **Exploit watch (sim gate):** confirm a human GM can't farm cheap slumping stars for guaranteed rebounds (expectation-gating + acquisition cost should prevent it). If abuse appears, tighten before adding any boost.
- **Wiring note:** the trade/roster-movement path (`franchiseRosterMovement.ts`) marks the player's checkpoint performance window to re-baseline from the trade date. No new store (per-franchise Player DB is schema-free).

## 7. Cadence — user-settable, default 2× traits, overlap OK (RULED)
- **User-settable** ratings cadence: **default every 10% of the season; option every 20%** (mirrors the trait cadence; defaults to twice as often). Sim-tunable.
- **Uniform step size** across checkpoints (NOT a bigger EOS step).
- **Overlap is fine (RULED):** at the 10% default, **every other ratings checkpoint coincides with a trait checkpoint** (20% grid) — this is intended, not a problem. The only requirements when a ratings + trait checkpoint land on the same game: (a) a **fixed evaluation order**, and (b) **both read the SAME pre-checkpoint performance snapshot**, so they cannot feed each other within the checkpoint (ratings adjust *base* ratings off performance; traits adjust off the same performance — independent reads). (Earlier "staggered so they never coincide" framing was wrong and is removed.)
- **EOS = the final ratings checkpoint** (same engine), setting next-season ratings.

## 8. Window + trend
The over-expectation signal (§3) is measured on the **season-to-date AGGREGATE** (actual vs expected, accumulated) as the base + a **moderate trend tilt** (recent-stretch gap vs the aggregate) for responsiveness; neutral at the first checkpoint (no prior). The slow aggregate is a key anti-ping-pong smoother (§6A(d)). The trade window-reset (§6B) re-baselines this aggregate on a team change.

## 9. Protections
- **Min peer-pool valve** (existing) → fallback ladder (§4) when thin.
- **Rookie modifier** (§4 / §13B) = the early-career downside shield + development boost; driven by the persisted rookie flag, surfaced as a visible badge.
- **Min-sample** (a player needs enough PA/IP to be scored) + **MLB-roster-only** development (Model A).
- **0–99 clamp** + per-checkpoint cap. Calibrate so a drafted/young player isn't cratered early (the rookie modifier + min-sample cover this).

## 10. Built vs greenfield + build
- **BUILT (consolidation base):** Model A `ratingsDevelopment.ts` (delta math, ±6 cap, dead-band, morale coupling, 0–99 clamp, checkpoint sweep wiring, flag-gated dark). The overlay/merge plumbing exists (pending→confirmed; `mergeRatingsOverlays` has no live consumer yet).
- **GREENFIELD (the new design):** the **expected-stats engine (§3A — the keystone, ratings→expected-per-category)** + the peer-calibrated actual-vs-expected signal (replaces today's single TV-dollar `valueDelta` scalar at `franchiseCheckpointSweepCompute.ts:184`) + per-category signal fan-out (replaces the single hash-picked `selectDevelopmentRatingKey`) + the position-pool calibration + the 5-band age modifier + the rookie modifier + the age curve + both-end edge compression + the equilibrium bound + the min-sample guard + the user-settable cadence + the trend term. **Feasibility (`w1yg079a5`): ~70% plumbing already present** (actual per-category stats fresh at each checkpoint, position-peer percentile engine, live league-mean normalizers, per-attribute curve shapes, the checkpoint loop) — the new ~30% is the expected-stats curves + fan-out + live-league-mean wiring + min-sample guard.
- **RETIRE as live paths:** Model B (`computeNetChange`), Model C (`agingEngine` random walk); deprecate award-luck.
- **ROOKIE flag (new fields, NOT a reuse — see §13B):** `rookieScaleActiveBySeason` canNOT be reused (it fires on recalls too + never clears → flags recalled veterans). Add `draftedAsFarmProspect` (at draft) + `rookieStatus` (set only on first call-up of a drafted prospect; cleared at the rookie-window boundary). Both are additive optional Player fields on the per-franchise DB → **no DB version bump**. The ratings engine reads `rookieStatus` by extending `CheckpointRatingDevelopmentInput` with `isRookie` (same pattern as the `HiddenModifiers` it already threads). Visible ROOKIE badge reuses the existing badge `<span>` (§13B).
- **DEFERRED (post-D13 / separate):** the confirmation UI that promotes pending→applied (`mergeRatingsOverlays` consumer) + the Phase-2 flag flip — so nothing changes a displayed rating until that goes live.
- **DH code removal = a SEPARATE scoped build ticket** (NOT part of this engine) — see §13.
- All magnitudes (caps, dead-band, age slopes, modifier weights, diminishing curve, trend strength) are §16 Sim-Gate placeholders.

## 11. Defaults / deferred / open
- **(default, deferred v2)** per-position ATTRIBUTE-relevance weighting (e.g. a SS's fielding develops more readily than a 1B's) — the position-GROUP cohort (§4) is v1; weighting *which attributes matter* by position is v2.
- All numeric placeholders → RB-16-style sim-tune sweep (esp. the age-modifier-vs-curve calibration in §5 and the position-vs-age weighting in §4).

## 13. DH removed entirely — pitchers bat (cross-cutting — RULED)
**RULED (JK 2026-06-22): FULL removal — the DH concept is gone entirely.** No DH *position* AND no designated-hitter *rule* → **pitchers always bat** (the pitcher fills the 9th lineup slot; no designated hitter ever). Consistent with the 2026-06-20 Mode-1 "no DH/UTIL" draft ruling.
- **Oracle is SAFE — no re-bless** (verified, research `wenf4w3ee`): `spec-docs/reference/iv_oracle.json` (591,827 bytes, byte-identical in both worktrees) contains **ZERO DH** across all 440 players + 21 anchors. The IV pricing registry (`ivCurves.ts:32`) has no DH key; both the engine (`ivEngine.ts:205`) and the generator (`analyze-pool.py:421`) normalize DH→`1B` as value-neutral. Removing DH moves **no oracle value**.
- **Code removal = its own scoped build ticket** (contained but wide; do NOT do inline). Blast radius: ~9 independent `Position`/`PlayerPosition`/`LineupPosition`/`DraftPosition` type defs that must change in lockstep (`types/game.ts:9`, `types/index.ts:4`, `fwarCalculator.ts:118`, `effectiveRatings.ts:25`, `leagueBuilderStorage.ts:61`, `ratingsAdjustmentEngine.ts:26`, `RatingsAdjustmentFlow.tsx:22`, `AwardsCeremonyFlow.tsx:11`, `src_figma/app/types/game.ts:9`) + the keystone consumer `ivEngine.ts:205` (delete the `=== 'DH'` line in the SAME diff or the build breaks) + the **one** DH player record `yankeesPlayers.ts:70` (Ron Charles → reassign to `1B`/`LF`) + lineup/roster/sub plumbing (`rosterAnalyzer.ts`, `optimalLineup.ts`, `substitution.ts`, `GameTracker.tsx` — incl. the `p.position || 'DH'` fallback defaults at `GameTracker.tsx:3396/4441/4470`) + salary/fWAR constants and ~38 test-file DH pins. **Gate the ticket** with the ivEngine oracle test before+after (prove no value moved) + the salary/fWAR/roster/lineup suites.
- **FROZEN-ADJACENT — do NOT touch:** `scripts/t5-denomination-bridge.ts` (DH:0.88) is verified byte-equivalent to commit `165a78a`; leave it.
- **DH LEAGUE RULE also removed (RULED):** `leagueConfig.ts` (`usesDesignatedHitter` / `dhPercentage`, 48 hits) governs *whether pitchers bat* — it collapses to **permanent no-DH (pitchers bat)**. The `dhEnabled` lineup branches (`optimalLineup.ts:256`, `substitution.ts`, `GameTracker.tsx teamUsesDh`, the `LeagueBuilderRosters` DH/NO_DH toggle) collapse to "pitcher fills the 9th bat slot." The DH-rule machinery may be either hard-forced off or removed (ticket's call), but no UI may offer a DH option.
- **⚠ DATA DEPENDENCY (must verify in the ticket):** if pitchers always bat in-sim, every pitcher needs `batterRatings`. The stock-pitcher batterRatings gap (~89/178) was reportedly CLOSED by the DB1 regeneration (2026-06-10) — the DH ticket MUST confirm **100% pitcher batterRatings coverage** (and that the sim/box-score actually exercises pitcher offense) before relying on pitcher batting. Oracle unaffected (it does not price pitcher batting).

## 13B. Rookie vs Fan Hopeful — two distinct things (RULED)
**They are orthogonal** (do NOT conflate):
- **FAN HOPEFUL** = a **per-TEAM, team-singular** dynamic designation: the team's headline FARM prospect the fanbase is most excited about (drives fan morale). **Already built + live:** `computeTeamFanHopefuls` (`franchiseInitializer.ts:312-348`) → persisted `team.fanHopefulPlayerId` (`leagueBuilderStorage.ts:143`), badged in `TeamHubContent.tsx:2100-2125`, picked from the top-3 by **visible scouted grade** (seeded). Lives on the farm; a Fan Hopeful may never become a rookie. **Leave as-is** — correct already. (The separate eligibility-engine `FAN_HOPEFUL` is deferred/inert in v1 — ignore it.)
- **ROOKIE** = a **per-PLAYER, time-boxed** status: **every player drafted in the farm prospect draft, upon their FIRST call-up to MLB** — and **NOT** an MLB veteran who was sent down (to make room) and later recalled. Many rookies per team. This is what the ratings rookie modifier (§4) reads.

**Rookie flag model (RULED — do NOT reuse `rookieScaleActiveBySeason`).** Verified (`wmehpv790`): `rookieScaleActiveBySeason` is set on **every** call-up — both first call-up AND recall (`franchiseRosterMovement.ts:347-350`, the `firstCallUp===false` branch) — and is **never cleared**. So a demoted-then-recalled veteran **wrongly** gets it (fails the ruling). It's the season salary-scale marker; keep it for that. Instead:
1. **Draft-origin gate (new first-class field):** add a boolean (e.g. `draftedAsFarmProspect`) stamped at prospect creation (`franchiseStartupProspectDraft.ts:~249`, `leagueBuilderStartupFarmDraft.ts`) — do NOT string-match the brittle `sourceDatabase`.
2. **Rookie status (new field):** `rookieStatus: { activatedSeasonId } | null` (or `isRookie` + season). Set true **only when ALL hold at call-up:** `transition.firstCallUp === true` **AND** `draftedAsFarmProspect === true` **AND** no prior activation. Gate it in the `firstCallUp` branch (`franchiseRosterMovement.ts:338-339`). `firstCallUp` is already `false` once any ledger row exists (incl. a send-down), so combining it with the draft-origin flag **excludes recalled vets** and a stock-440 player who opens on MLB (never gets the field). ✔ satisfies both halves of the ruling.
3. **Rookie window clear (new — none exists today):** clear `rookieStatus` at a defined boundary (next-season rollover, or after N MLB games/AB/IP) in the season-rollover/farm-carryover path. The ratings rookie modifier applies only while active.
4. **Visible badge:** add a `ROOKIE` badge descriptor mirroring `PROJECTED_BADGES`/`LIVE_DESIGNATION_BADGES`, rendered by the existing badge `<span>` (`TeamHubContent.tsx:2886-2896 / 4539-4550`), gated on `rookieStatus`. Purely additive UI. **Do NOT** add `ROOKIE` to `FranchiseDesignationType` (exhaustive-`Record` TS break) and **do NOT** put rookies in the team-singular designation store (it holds one player per team-per-award).

**Risk:** LOW — franchise Players live in a per-franchise IndexedDB (`franchisePlayerStorage`, store holds the whole object as value), so new optional Player fields need **no DB version bump** and don't touch the `TRACKER_DB_VERSION` store-list pins. Test to update: `franchiseRosterMovement.test.ts` (rookie assertions + a NEW test that a recalled veteran does NOT get rookie status). Apply in both worktrees (byte-identical engine).

## 14. Provenance
Research runs `wy351xzbq` (four-model audit + aging) + `wenf4w3ee` (DH inventory, compaction lost-context audit, rookie-designation feasibility) + `wmehpv790` (prospect age + rookie/Fan-Hopeful semantics). Engine seams: `ratingsDevelopment.ts`, `agingEngine.ts`, `franchiseCheckpointSweepCompute.ts`, `RatingsAdjustmentFlow.tsx`, `ratingsOverlayMerge.ts` (kbl-mode1). Rulings JK-attended 2026-06-22.

## Appendix A — worked season examples (ILLUSTRATIVE; placeholder tunables)
Five full-season arcs under the new **over-expectation** model, to validate the *feel* before build. **All numbers are §16 sim-tune placeholders**, shown only to demonstrate the mechanism shapes. Note the aggression now lands at LOW baselines (cheap points + big surprise) and stays compressed at the top.

**Param set used:** 10 checkpoints · per-checkpoint cap ±5 (generous) · dead-band start `0.25` · convex `γ=2` on the over-expectation gap · edge compression `δ≈1` (the inverse-with-rating governor: gain ×(99−R)/99, loss ×R/99) · **equilibrium bound** (rating converges to performance-justified level; NO grade-cap; far safety rail ~25 pts) · age slope/cp {18–21 +0.30 … 36+ −0.45; speed/field/arm steeper} · rookie ×1.3 up / ×0.5 down · morale ×0.85–1.2. The signal `r` = age-modified over-expectation gap (actual vs peer-calibrated expected).

| # | Archetype | Setup | Season arc (headline tool) | Net | Mechanism shown |
|---|-----------|-------|----------------------------|-----|-----------------|
| 1 | **Rookie phenom** | SS, 20, drafted; Contact 58 (grade C); *hits like a ~90-contact bat* all year (huge over-expectation) | Contact 58→82 (fast, decelerating as expectation catches up) | C → A− | convex over-expectation + cheap low-baseline points + rookie + equilibrium |
| 2 | **Ace at ceiling** | SP, 28, prime; Velocity 92 (A); pitches *to* his ~92 expectation | Velocity 92→93 (~flat) | A → A | edge compression near 99 + meeting expectation = anti-inflation anchor |
| 3 | **Collapsing star, traded** | RF, 30; Power 86; produces like ~76 first half (big negative gap); dealt @50% | 86→78 (collapse) → window reset → 78→80 (modest earned recovery) | A− → B | over-expectation collapse + performance-window-reset change-of-scenery |
| 4 | **Hot start, cools** | 2B, 26, avg; Contact 72; hits like ~86 in Q1, then to his expectation | 72→79 (Q1) → holds ~78 | B → B+ | convex reward + gap-closure + hysteresis = no give-back |
| 5 | **Aging gamble** | 1B, 38, drafted at star ratings (Power 90, age-independent); hits ~85 (just under his lofty expectation) | Power 90→83; Speed 45→36, Field 55→46, Arm 50→41 | A → B | age-independent generation + age gravity + per-attribute realism |

**The point of the recalibration:** the phenom now jumps **+24** (58→82, ≈3 seasons compressed) because overperforming weak tools is both improbable *and* cheap to reward down low — exactly JK's "reward for doing so, which enables them to sustain success." The ace still moves ~nothing (expensive points + only meeting expectation). The aggression is concentrated where it's earned and where there's room.

**Realism anchor:** the *median* player produces ≈ his expectation → inside the dead-band → drifts ±0–2 over a season. Only genuine over/under-performers get arcs — the league stays stable while a handful of stories carry the season (beat-reporter fodder).
