# SCOUTING INTELLIGENCE — Tightened Spec Draft (v2, post-interrogation Q1–Q7)

> **Status:** DRAFT, 2026-06-30. Synthesizes the JK interrogation (Q1–Q7) +
> the in-season-cap/dead-cap/archetype economy dialogue into one buildable spec. **Supersedes/tightens** the
> original `DRAFT_GUIDE_INTELLIGENCE_SPEC.md` (28 §, kept as the detailed reference) — this v2 records the
> DECIDED architecture and resolves its open pieces. The interrogation CONTINUES; this draft will grow.
> Companions: `SCOUTING_INTELLIGENCE_INTERROGATION_TRANSCRIPT.md` (the decision record), `SCOUTING_INTELLIGENCE_INTERROGATION_PREP.md`,
> `IN_SEASON_CAP_DEADCAP_ANALYSIS_2026-06-30.md`, `V1_PLAN_2026-06-30.md`. Build rule ([[v1-rulings-2026-06-30]]):
> spec FIRST, then build — this is a v1 BLOCKER (no draft/season ships without the full scout).

---

## 0. ONE-PARAGRAPH VISION
Each GM declares a team identity (separate for the MLB club and the Farm) and sets per-position priorities at
leisure in League Builder. The scout — a hired entity that persists from draft into the season — turns those
priorities into a **live, continuously-updating draft board** and, during a no-timer pass-the-iPad auction,
answers the only question that matters at each bid: *"if I bid this vs. pass, here's how my team looks going
forward, and here's what everything will roughly cost."* It does the affordability/pivot math so the GM thinks
strategy, not arithmetic. After the draft, the same scout becomes the in-season roster advisor.

---

## 1. ARCHITECTURE & DATA MODEL (Q1)
**Per-league team-instance layer.** Today a team is a GLOBAL singleton (`globalTeams`, keyPath id); identity
set on it bleeds across every league. Add a **per-(league,team) shadow-override store** mirroring the proven
`leaguePlayerOverrides` pattern. Hard fences (non-negotiable):
- **Additive shadow-override:** global team stays the DEFAULT; the per-league record SHADOWS it when present →
  **zero migration**, existing leagues untouched. NEVER migrate `capIdentity` off the global team.
- **Identity/config ONLY** (GM name, MLB+Farm archetype override, scout, draft boards/priorities, manager, beat
  reporter). **NEVER make the team ROSTER per-league** (`teamRosters` keyed by teamId is the most load-bearing
  record — that's the scope-creep danger). The DRAFTED roster flows to the franchise (per-league), so the layer
  need not touch rosters. [VERIFY at build.]
- Register the new store in backup/sync/L-SIM-sandbox/save-slot ([[new-own-db-store-three-registries]]).

**The identity bundle (configured at leisure on the per-league team-edit page):** GM name · MLB archetype ·
Farm archetype · hired scout · draft boards/priorities · manager · beat reporter. **The league holds the draft
POOL.** **"The draft" collapses to a thin EVENT** that pulls everything from the league+teams — set up on your
own time, come together when ready to draft. (JK chose layer-FIRST: build the per-league layer, then the boards
into it. Build-time: also collapse the multi-step draft-setup wizard, which today does seats/GM/owner/archetype/
shill in one screen + a separate scout-hire.)

---

## 2. ARCHETYPE SYSTEM
### 2.1 Team archetypes (the economy spine)
- **Declared + EVOLVABLE**, separate for MLB & Farm. Affects exactly two things: (1) auction bidding headroom
  (off-identity players cost more to ACQUIRE — paid ONCE at the draft, front-loaded), and (2) the lens the
  scout reasons through. **NO in-season archetype tax**; roster DRIFT (ratings/traits/trades) is free and IS
  the game; the construction game-theory is the **emergent development gamble**, not a tax.
- **Auction LOCK (load-bearing):** the declared archetype is LOCKED for the duration of the auction (you can't
  re-declare mid-auction to dodge the off-archetype cost — that would collapse the whole no-double-charge model).
- **Re-declaring the identity** (in-season evolution, the dropdown) = a deliberate, cooldown-gated event with a
  one-time fan-IDENTITY morale nod scaled to how far it clashes with your actual roster. Drift = free; changing
  what you SAY you are = a felt event. Needs a **comprehensive, balance-tested** archetype set (no holes,
  game-able = out — [[v1-rulings-2026-06-30]] C).
- **ONE TRUE COST (the crux, OPEN — see §9):** the player's full price (intrinsic + archetype-fit penalty)
  should be reified + visible + carried everywhere (draft display / season cap / dead-cap / trades).

### 2.2 Player archetypes (the GM's "choose your weakness" lever)
A **comprehensive, fully-populated rating-combo map** — strong AND weak combos, NOT just star types
(a `PlayerArchetype` starter set exists: ACE/SLUGGER/SPEEDSTER…; expand it). Each per-position archetype
encodes the strengths to pay for AND the weaknesses to accept-for-cheap: **"glove-only SS"** (cheap, frees
budget), **"power-only RF"** (OK with low contact/speed/fielding/arm). ⇒ the optimizer's job is **budget
allocation ACROSS positions** driven by where the GM chooses to be weak. **Applies to the BENCH too.**
**Co-designed with the team-archetype gap-fill** (same building-blocks problem at two levels; both
balance-tested). Likely derive player-type from rating/trait profiles + name the menu.

---

## 3. THE BOARD MODEL — RANK-ORDER + ONE LIVE BOARD (Q2 + structural revision Q5)
**Not three separately-locked static boards.** The GM gets:
1. A **rank-ordering of all players** (their big board), and
2. **ONE LIVE board** = the scout's current best roster-build PATH given the live draft state + the GM's
   priorities + chosen risk posture. It re-draws continuously as players sell.

**GM steers via per-position priorities, two alternative modes (pick one), set ONCE:**
- **ROBUST:** a player-archetype dropdown per position (incl. the cheap/weak archetypes) → the scout prioritizes
  hitting those targets.
- **SIMPLIFIED:** rank the 22 roster slots by priority (1: SS, 2: SP1, 3: C, 4: CP …) → highest-IV at each in
  order, within constraints.

**The three risk levels become a POSTURE DIAL / three VIEWS of the one live board** (flip safe↔aggressive live),
defined by spend/tax:
- **Conservative = ZERO luxury tax.** · **Optimal = SOME tax, never enough to need scrubs.** · **Aggressive =
  enough tax to leave a few minimum-salary SCRUBS at the end.** (Concrete, enforceable, guarantees visibly
  different teams.) Cap magnitudes for juiced/standard/nerfed = post-build §16 tuning.

**GM control = LIGHT TOUCH (Q3):** priorities steer; the live board is good enough to run on as-is; the full
manual calibration table (reorder/check-uncheck/swap/mark/notes) is OPTIONAL for the GM who wants it, never
required (non-user-intensive philosophy). **What "locks" before the draft = priorities + posture + archetype**
(per the auction-lock), NOT static rosters; the board stays live.

---

## 4. MARKET / PRICE-PREDICTION MODEL (Q5) — "Second-Price Board"
**Predict, per yet-to-be-bid player, what he'll SELL for** = ~the **second-highest valuation among interested
bidders + one increment** (open ascending auctions clear at the runner-up's drop point, NOT the winner's max).
```
v_ij = IV_i × archetypeFit(i, team_j) × needMultiplier_j(pos_i) × personalityBias_j   (clamped to team j solvency)
price_i ≈ 2nd-highest{ v_ij over all j + the GM } + Δ
needMultiplier_j(pos) = own_need_j(pos) × leagueScarcity(pos)
```
- **own_need uses the REAL roster model (Q5-F1):** required slots − filled slots per position — a team isn't
  "filled" at C until it has its BACKUP C; SP has 4 critical slots; etc. (NOT one-per-position.)
- **leagueScarcity** = teams-still-needing(pos) / players-left(pos) → JK's "fewer suitors as a position fills."
- **Surplus = your valuation − predicted clearing price** is the pivot signal (maximize surplus, not raw quality):
  a guy only YOU want is a bargain; a guy two teams covet costs a fortune.
- **Reuse existing:** solvency cap (`auctionMaxBid`), tax (`auctionMarginalTax`), per-team valuation kernel
  (`evaluateCpuValuation`), live `capIdentity`/budgets/slots.

**THE ACCURACY GATE (make-or-break):** NEVER a point price — ALWAYS a range (low/median/high; §12
`EstimatedPlayerCost` already typed this way). Band WIDENS with unknowable/shill bidders + early-auction + thin
pool. Shills' archetypes are hidden → the model knows their seed-derived valuations internally but **widens the
displayed band** (honest "1-2 wildcard bidders here", not false precision). Frame as "live estimates that
shift"; recompute-on-sale is VISIBLE (demonstrates adaptation → builds trust). **PRE-SHIP GATE: calibrate band
width against `auctionTuningSim.test.ts` until the true price lands inside [low,high] ~85-90% of the time.**
Measurable, not vibes — this is what earns "stop worrying if you can afford it."

**DETERMINISM/SPEED:** closed-form, NO Monte-Carlo in the hot path. O(players × teams) + a small sort per player
≈ sub-ms; seed-deterministic (`buildSeededCpuShill`, no Math.random). "Bid X vs pass" re-projection = recompute
with one team's budget/need toggled = instant.

**STAGING (structure → learning → simulation):**
- **v1 "Second-Price Board":** the above + **recompute-on-sale** (curveball discount re-marks the board for free,
  no learned params). Type the 3 undefined spec types (`EstimatedMarket`/`CompetingTeamProfile`/`ShillProfile`).
- **v1.1 "Underbidder Memory":** consume the new bid log → "those 3 will be back for the next catcher."
- **v1.2 "Market Heat":** online λ scalar + per-team revealed-aggression learning.
- **v2 "Forward Projection":** seeded low-path Monte-Carlo (§15, completion-prob/regret), on-demand ONLY.
- **INFRA ADD NOW (log-first-consume-later):** the auction DISCARDS bid history today — add
  `Lot.bidLog:{teamId,amount}[]` + `AuctionResult.{bidderSet,underbidder,numBidders}` during v1 so v1.1 has data.

---

## 5. LIVE AUCTION EXPERIENCE (Q4)
- **NO TIMER. Pass-the-iPad** couch co-op, one GM at a time, study as long as you want, click bid/pass, hand on.
  Design constraint = **PRIVACY**, not brevity.
- **PUBLIC (always on screen):** the player up for bid + his **IV** + full profile (ratings/traits/chemistry/
  personality/age/handedness for **MLB**; FARM keeps hidden attributes per the visibility gate) + the active
  GM's **live roster**.
- **PRIVATE (behind a click):** everything the SCOUT provides — expand to study, collapse before passing.
- **THE KILLER FEATURE — real-time BID-vs-PASS board projection:** *"if you BID at the selected figure → here's
  your board going forward; if you PASS → here's your board going forward."* Deterministic re-optimization on
  the live shrinking pool (tracks bought/lost). Show-don't-tell; more informative than prose; the load-bearing
  guidance. **Cap-discipline / completion guardrail:** the projection makes "can you still legally fill your
  roster if you bid this" obvious → the scout protects the GM from stranding themselves (warn clearly; per
  §14 hard-block ONLY truly impossible bids, never risky-but-possible ones).

## 6. LLM USAGE (Q4)
**Core needs NO LLM.** The math + the board projection carry it, and the math is ALWAYS deterministic (never let
an LLM decide whether a bid breaks your plan). The LLM is an **OPTIONAL polish layer**: reuse the beat-reporter
`callClaudeMessages` link to phrase the exact facts as richer summary language (avoid "few numbers + redundant
phrases = noise"), **gated**, on top of the deterministic facts ([[reporter-adapter-pure-emission-llm-split]]).
Build the deterministic projection first; add LLM language later.

## 7. FARM DRAFT (Q6)
Same one-live-board machine, but **CANNOT spoil true ratings in any way**: shows **3/5/7-banded overall values
on the 20-80 scale** (GM picks the banding; coarse↔fine = confidence), steered by the **FARM** archetype, with
**MUCH WIDER bid bands** (higher uncertainty). **Headline = CAP-SPACE RISK DISCIPLINE** — keep the GM from
betting it all on one or two fuzzy prospects. (The banded 20-80 overall IS the projected value the scout reasons
on; farm hidden-attribute gate already built.)

## 8. DRAFT → SEASON HANDOFF (Q7)
**Everything freezes into the season** as the franchise's starting state: roster + identity (MLB/Farm archetype)
+ scout + draft posture (+ GM/manager/beat-reporter). **The scout PERSISTS as the in-season roster advisor** —
same brain as the draft optimizer — advising on **optimized lineups, roster moves, trades, archetype-change
options, and roster-analysis-on-button-press** (the on-demand analysis "should be partially built already" = the
existing diagnostic analyzer). Continuity: the scout who drafted your team keeps advising it. (= the
"one analyzer powers pre-draft boards + in-season evolve-dropdown" decision.)

## 9. ECONOMY TIE-INS (from the cap/dead-cap dialogue — see `IN_SEASON_CAP_DEADCAP_ANALYSIS_2026-06-30.md`)
- **TRUE COST = the DRAFT acquisition cost (RESOLVED Q8, Option A).** The off-archetype "wrong-fit penalty" is a
  GRADUATED, VISIBLE debit from your DRAFT BUDGET when you win an off-fit player (bid + penalty, shown before the
  bid — the current invisible bidding-reserve effect made explicit + actually charged). Paid ONCE, at the draft.
  The player then carries his **INTRINSIC salary** into the season; **dead-cap = on intrinsic.** No carried
  premium, no ongoing in-season archetype cost (Option B rejected — no permanent burden / evolution-un-reify /
  double-count). The scout's "true cost" display = this draft acquisition cost. The disincentive lives at the
  bid moment, where it belongs.
- **No in-season archetype tax.** Removal = send-down (75% dead money on intrinsic salary today) or TRADE (clean
  swap). **No release / no FA pool** (a stray offseason release path to remove).
- **v1 = USER-CONTROLLED TEAMS ONLY** in-season → the "albatross is harder to trade" disincentive is FREE human
  game theory (no CPU trade AI to build); only the albatross DESIGNATION (built) must be active.
- Fan morale watches RESULTS-vs-TALENT-expectation, NOT payroll (CUT the payroll→morale layer; flip the existing
  talent-based expected-wins→morale live). Albatross = high-salary/low-IV, built but dark.
- Demotion-to-save IS intended rebuilding (morale-gated by the demoted player's fame×net-TV, not a cap floor).

## 10. OPEN ITEMS / POST-BUILD TUNING
- **§16 tuning (post-build):** cap magnitudes (juiced/standard/nerfed); the 3-board tax thresholds; the dead-cap
  rate; morale magnitudes.
- **Shill tuning (sim):** behavior so it doesn't destroy draft dynamics + the right NUMBER of shills for an
  8-team draft. Shills = hidden rival GMs with their OWN secret archetype (bid their premium ABOVE IV on fits,
  fold on non-fits, stay in unpredictably; close to built `cpuShillBidding.ts`).
- **The accuracy calibration gate** (§4) before any scout number ships.
- **Taxonomy build:** the comprehensive player-archetype + team-archetype menus (co-designed, balance-tested).
- **The ONE-true-cost reification decision** (§9 crux) — the last big economy fork.

## 11. BUILD-VS-NEW & SEQUENCING (high level)
- **NEW (the build):** the per-league team-instance layer (additive); the per-position-priority input + the
  player-archetype menu; the generalized optimizer (`buildBestRoster` → per-position targets + 3 postures); the
  Second-Price market model + the bid-vs-pass projection; the bid-log infra; the live board UI; reuse the
  analyzer in-season.
- **REUSE (already there):** `buildBestRoster`, `evaluateCpuValuation`, `auctionMaxBid`, `auctionMarginalTax`,
  `capIdentity`/budgets/slots live in the auction, `auctionTuningSim`, the diagnostic roster analyzer, the
  beat-reporter LLM link, the farm hidden-rating gate, the `PlayerArchetype` starter set, `EstimatedPlayerCost`/
  `BidImpact`/`GmDraftPreferences` typed shapes.
- **Sequence (JK layer-first):** per-league team layer → per-position priority + board input → optimizer
  generalization + Second-Price market (v1) → live board + bid-vs-pass projection → farm parity → in-season
  advisor persistence → calibration gate → (then v1.1+ market-model deepening). Taxonomy build co-runs.

---
*Living draft — the interrogation continues; sections expand as more questions resolve (next up per JK: the
soft-risk/completion guardrails, the freeze mechanics, GM preference memory across drafts, and more).*
