# RATINGS ADJUSTMENT SPEC — relative, age-aware, one engine (v1)

**Status:** DESIGN — rulings RATIFIED by JK 2026-06-22. Companion to `TRAIT_GAIN_LOSS_THRESHOLD_SPEC.md` (the trait analog). Consolidates four divergent rating-mutation models into one engine. Magnitudes are sim-tune placeholders (shapes locked).

---

## 1. The idea (one sentence)
At each checkpoint, every rating moves on the player's **relative standing vs his position-group peers** (so the league never inflates), made **age-fair** by an age-tier modifier and a rookie modifier, layered on a **deterministic age curve** (the baseline develop/peak/decline gravity), with **per-attribute diminishing returns** so high ratings are hard to raise and sticky to lose.

## 2. Consolidation — four models → one engine (RULED)
Today there are FOUR divergent rating-mutation paths, none implementing the spec, no canonical age curve:
- **A** `ratingsDevelopment.ts` — in-season own-TV×morale, ±6 cap, dead-band 0.75 (built, triple-dark). **The consolidation base.**
- **B** EOS `computeNetChange` (war×1.5 + crude age, persisted) — **retire as a live path.**
- **C** `agingEngine.ts` phase random-walk (orphaned) — **retire as a live path.**
- **D** the archived spec algorithm (peer-median × grade asymmetry) — superseded by this spec.
**RULED:** ONE adaptive engine. In-season checkpoints + **EOS = the final checkpoint** of the same engine (sets next-season profile). Retire B + C as live paths; deprecate the award-luck offseason model (`EOS_RATINGS_ADJUSTMENT_SPEC §449`). Mode-3 (offseason) out of v1 scope — redesigned post-v1; the season-end checkpoint is v1's only offseason profile change.

## 3. The signal — RELATIVE, deterministic (the anti-inflation reversal — RULED)
**RULED: ratings move on the player's PERCENTILE vs his peers (RELATIVE), NOT his own performance-vs-expected (absolute).** Reverses the earlier absolute call. Rationale (JK): absolute *causes* league-wide inflation — in a strong-hitting league everyone beats expectations → everyone rises → rich-get-richer. Relative is self-correcting: if all outfielders rake, none stands out, so none inflates ("if all catchers throw out runners, then no one is — probably just slow baserunners"). Zero-sum-ish → no league drift. (This re-aligns ratings WITH traits on the cohort principle.)
**RULED: deterministic** (not seeded-probabilistic like traits) — clear the dead-band → move; ratings are continuous so the *magnitude* is the gradation, no roll needed. Fully reproducible.

## 4. The cohort + modifiers (RULED — the integrated model)
A robust primary comparison + modifiers (NOT tiny sliced cohorts — age/rookie are modifiers on a big pool, so no thin-pool noise):
- **PRIMARY signal = percentile vs POSITION GROUP** (carries most of the weight):
  - Hitters: **Catchers · Corner IF (1B/3B) · Middle IF (2B/SS) · Corner OF (LF/RF) · Center (CF).** (**No DH** — removed from the franchise position model; see §13.)
  - Pitchers: **SP · RP** (RP = SP/RP-with-no-starts + RP + CP).
  - Per-attribute: a rating's percentile is computed on the attribute's own performance signal within the position group.
- **AGE-TIER MODIFIER (5 tiers) — makes the comparison age-fair** (shifts the percentile's expectation/neutral point): young & old get **benefit-of-the-doubt**, prime players are held to the **strictest** bar (expected to be better than relatively young/old players). Bands = the single age structure in §5 (sim-tunable): **18–21 / 22–24 / 25–31 / 32–35 / 36+.** **Weighting (RULED):** the age-tier influence is **secondary to the position group** — position-group standing dominates; the age tier "brings it into focus" (JK: *"position group matters most but age-tier brings the position group comparison into focus"*). It is NOT a co-equal second comparison; it shifts the position-group percentile's neutral point.
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
- **Magnitude:** signed continuous delta from the relative signal (age-modified) + the age-curve term + morale coupling (high morale amplifies gains / shrinks drops, per Model A), hard-capped per checkpoint (Model A ±6 placeholder), 0–99 clamp.
- **Dead-band (RULED: asymmetric hysteresis):** a larger signal is required to *start* a rating moving than to *continue* — prevents ±1 jitter every checkpoint. (Model A's symmetric 0.75 → asymmetric.)
- **Per-attribute diminishing returns (RULED):** gain magnitude shrinks as a rating approaches 99 (soft ceiling damp), and high ratings resist decay — the trait "valuable = hard to gain + sticky" principle applied to ratings. **DROP** the spec's separate whole-player grade/salary asymmetry (avoid double-counting).
- **All relevant attributes can move (RULED):** every attribute with a clear performance signal can move each checkpoint (replaces Model A's single hash-picked key — which was a placeholder; development now targets what the player's performance actually reflects).

## 7. Cadence — user-settable, default 2× traits, overlap OK (RULED)
- **User-settable** ratings cadence: **default every 10% of the season; option every 20%** (mirrors the trait cadence; defaults to twice as often). Sim-tunable.
- **Uniform step size** across checkpoints (NOT a bigger EOS step).
- **Overlap is fine (RULED):** at the 10% default, **every other ratings checkpoint coincides with a trait checkpoint** (20% grid) — this is intended, not a problem. The only requirements when a ratings + trait checkpoint land on the same game: (a) a **fixed evaluation order**, and (b) **both read the SAME pre-checkpoint performance snapshot**, so they cannot feed each other within the checkpoint (ratings adjust *base* ratings off performance; traits adjust off the same performance — independent reads). (Earlier "staggered so they never coincide" framing was wrong and is removed.)
- **EOS = the final ratings checkpoint** (same engine), setting next-season ratings.

## 8. Window + trend
Season-AGGREGATE relative standing as the base + a **moderate trend tilt** (recent relative standing vs the aggregate) for responsiveness; neutral at the first checkpoint (no prior). (Transfers from the trait engine; adds the dynamism JK wants.)

## 9. Protections
- **Min peer-pool valve** (existing) → fallback ladder (§4) when thin.
- **Rookie modifier** (§4 / §13B) = the early-career downside shield + development boost; driven by the persisted rookie flag, surfaced as a visible badge.
- **Min-sample** (a player needs enough PA/IP to be scored) + **MLB-roster-only** development (Model A).
- **0–99 clamp** + per-checkpoint cap. Calibrate so a drafted/young player isn't cratered early (the rookie modifier + min-sample cover this).

## 10. Built vs greenfield + build
- **BUILT (consolidation base):** Model A `ratingsDevelopment.ts` (delta math, ±6 cap, dead-band, morale coupling, 0–99 clamp, checkpoint sweep wiring, flag-gated dark). The overlay/merge plumbing exists (pending→confirmed; `mergeRatingsOverlays` has no live consumer yet).
- **GREENFIELD (the new design):** the RELATIVE percentile signal (replaces own-TV-absolute) + the position-group cohorts + the 5-tier age modifier + the rookie modifier + the age curve + per-attribute diminishing returns + the all-attributes-move selection + the 10%-offset cadence + the trend term.
- **RETIRE as live paths:** Model B (`computeNetChange`), Model C (`agingEngine` random walk); deprecate award-luck.
- **ROOKIE flag (low-risk reuse):** `Player.rookieScaleActiveBySeason` (`leagueBuilderStorage.ts:270`) is ALREADY set on first farm→MLB call-up (`franchiseRosterMovement.ts:304-307`) and is exactly the spec's "recently called up." Derive `isRookie(player, seasonId)` from it — **no new store, no DB version bump, no persisted-shape change**. The ratings engine reads it by extending `CheckpointRatingDevelopmentInput` with `isRookie` (same pattern as the `HiddenModifiers` it already threads). The visible badge is a ROOKIE descriptor reusing the existing badge `<span>` (§13B).
- **DEFERRED (post-D13 / separate):** the confirmation UI that promotes pending→applied (`mergeRatingsOverlays` consumer) + the Phase-2 flag flip — so nothing changes a displayed rating until that goes live.
- **DH code removal = a SEPARATE scoped build ticket** (NOT part of this engine) — see §13.
- All magnitudes (caps, dead-band, age slopes, modifier weights, diminishing curve, trend strength) are §16 Sim-Gate placeholders.

## 11. Defaults / deferred / open
- **(default, deferred v2)** per-position ATTRIBUTE-relevance weighting (e.g. a SS's fielding develops more readily than a 1B's) — the position-GROUP cohort (§4) is v1; weighting *which attributes matter* by position is v2.
- All numeric placeholders → RB-16-style sim-tune sweep (esp. the age-modifier-vs-curve calibration in §5 and the position-vs-age weighting in §4).

## 13. DH removed from the position model (cross-cutting — RULED)
**RULED (JK 2026-06-22):** DH ("designated hitter") is **not a position in our franchise** — remove it everywhere the *position* appears. Consistent with the 2026-06-20 Mode-1 "no DH/UTIL" draft ruling.
- **Oracle is SAFE — no re-bless** (verified, research `wenf4w3ee`): `spec-docs/reference/iv_oracle.json` (591,827 bytes, byte-identical in both worktrees) contains **ZERO DH** across all 440 players + 21 anchors. The IV pricing registry (`ivCurves.ts:32`) has no DH key; both the engine (`ivEngine.ts:205`) and the generator (`analyze-pool.py:421`) normalize DH→`1B` as value-neutral. Removing DH moves **no oracle value**.
- **Code removal = its own scoped build ticket** (contained but wide; do NOT do inline). Blast radius: ~9 independent `Position`/`PlayerPosition`/`LineupPosition`/`DraftPosition` type defs that must change in lockstep (`types/game.ts:9`, `types/index.ts:4`, `fwarCalculator.ts:118`, `effectiveRatings.ts:25`, `leagueBuilderStorage.ts:61`, `ratingsAdjustmentEngine.ts:26`, `RatingsAdjustmentFlow.tsx:22`, `AwardsCeremonyFlow.tsx:11`, `src_figma/app/types/game.ts:9`) + the keystone consumer `ivEngine.ts:205` (delete the `=== 'DH'` line in the SAME diff or the build breaks) + the **one** DH player record `yankeesPlayers.ts:70` (Ron Charles → reassign to `1B`/`LF`) + lineup/roster/sub plumbing (`rosterAnalyzer.ts`, `optimalLineup.ts`, `substitution.ts`, `GameTracker.tsx` — incl. the `p.position || 'DH'` fallback defaults at `GameTracker.tsx:3396/4441/4470`) + salary/fWAR constants and ~38 test-file DH pins. **Gate the ticket** with the ivEngine oracle test before+after (prove no value moved) + the salary/fWAR/roster/lineup suites.
- **FROZEN-ADJACENT — do NOT touch:** `scripts/t5-denomination-bridge.ts` (DH:0.88) is verified byte-equivalent to commit `165a78a`; leave it.
- **⚠ NEEDS A SEPARATE JK RULING — DH-the-LEAGUE-RULE ≠ DH-the-POSITION:** `leagueConfig.ts` (`usesDesignatedHitter` / `dhPercentage`, 48 hits) governs *whether pitchers bat* and feeds the pitcher batting bonus. This is a distinct concept from the position. **Default: leave the league-rule machinery untouched** unless JK also rules on it.

## 13B. Rookie designation mechanism (RULED)
Rookie status must be **visible (icon) AND code-readable** (so ratings apply the rookie modifier). The existing dynamic-designation store (`franchiseDesignationRows`) is **team-singular** (keyPath `[franchiseId, seasonId, statsScopeId, teamId, type]` → ONE player per team-per-award) so it **cannot** hold "many rookies per team." Therefore:
- **Code-readable flag:** reuse `Player.rookieScaleActiveBySeason` (already persisted, set on first farm→MLB call-up) → `isRookie(player, seasonId)`. No new store / no DB bump / no shape change. (Optionally widen to first-N-seasons later.)
- **Visible badge:** add a `ROOKIE` badge descriptor mirroring `PROJECTED_BADGES`/`LIVE_DESIGNATION_BADGES`, rendered by the existing badge `<span>` in `TeamHubContent.tsx:2886-2896 / 4539-4550`, gated on the rookie boolean. Purely additive UI; no store write.
- **Do NOT** add `ROOKIE` to `FranchiseDesignationType` — that union is an exhaustive `Record` across badge maps + the morale bridge + eligibility; adding a member without entries is a wide TS break.

## 14. Provenance
Research runs `wy351xzbq` (four-model audit + aging) + `wenf4w3ee` (DH inventory, compaction lost-context audit, rookie-designation feasibility). Engine seams: `ratingsDevelopment.ts`, `agingEngine.ts`, `franchiseCheckpointSweepCompute.ts`, `RatingsAdjustmentFlow.tsx`, `ratingsOverlayMerge.ts` (kbl-mode1). Rulings JK-attended 2026-06-22.
