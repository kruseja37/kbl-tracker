# SCOUTING INTELLIGENCE — Canonical Spec (consolidated)

> **Status:** CANONICAL, 2026-06-30. The single source of truth for the draft + in-season intelligence system
> (a v1 BLOCKER per [[v1-rulings-2026-06-30]] — no draft/season ships without it). Consolidates the full JK
> interrogation (Q1–Q12 + Thread A) + the cap/dead-cap/archetype economy dialogue into one coherent buildable
> document. **Supersedes** the working draft `SCOUTING_INTELLIGENCE_SPEC_V2.md` and tightens the original
> `DRAFT_GUIDE_INTELLIGENCE_SPEC.md` (28 §, kept as the detailed reference). Decision record:
> `SCOUTING_INTELLIGENCE_INTERROGATION_TRANSCRIPT.md`. Economy detail:
> `IN_SEASON_CAP_DEADCAP_ANALYSIS_2026-06-30.md`. **Build rule:** spec first, then build.
> **Open build workstream (b):** the archetype TAXONOMY (team + player menus) — its own design+sim exercise.

---

## 1. VISION & ENTITIES

Each GM declares a team identity (separate for the MLB club and the Farm) and sets per-position priorities at
leisure in League Builder. Their **Assistant GM** turns those priorities into a **live, continuously-updating
draft board** and, during a no-timer pass-the-iPad auction, answers the only question that matters at each bid:
*"if I bid this vs. pass, here's how my team looks going forward, and here's what everything will roughly
cost."* After the draft, the same Assistant GM becomes the in-season roster advisor. Their **Scout** evaluates
FARM prospects under uncertainty. The system does the affordability/pivot math so the GM thinks strategy, not
arithmetic — and if it's wrong or noisy the GM ignores it, so **trustworthiness (calibrated, humble, honest
ranges) is the make-or-break.**

**The two intelligence entities** (a real baseball-org split — scouts EVALUATE, the front office CONSTRUCTS):
- **THE SCOUT — talent EVALUATION (farm only).** FARM prospects have HIDDEN true ratings. The Scout
  **specializes in your FARM archetype**, which DERIVES its per-area confidence: **3-band vision = strong/precise**
  (archetype-aligned areas), **5-band = average**, **7-band = weak/fuzzy** (de-emphasized areas). Fewer bands =
  tighter = stronger.
- **THE ASSISTANT GM — roster CONSTRUCTION + money (MLB draft + in-season).** The optimizer, the price/market
  model, the bid-vs-pass projection, cap discipline, and the in-season advisor. It specializes in construction,
  which is WHY it reasons ACROSS archetypes (yours, rivals', theoretical, in-season changes). MLB ratings are
  PUBLIC, so the MLB competency is construction, NOT rating-accuracy.

Both are NAMED by the GM (text box) in the per-league team-edit page. Two other named entities live in the same
bundle: the **MANAGER** (in-game tactical, mWAR — mostly built) and the **BEAT REPORTER** (narrates, never
authors fact — mostly built; see §10).

## 2. DATA MODEL & SETUP

**Per-league team-instance layer (NEW — the foundation, built layer-first).** Today a team is a GLOBAL singleton
(`globalTeams`), so identity set on it bleeds across leagues. Add a **per-(league,team) shadow-override store**
mirroring the proven `leaguePlayerOverrides` pattern:
- **Additive shadow:** the global team stays the DEFAULT; the per-league record SHADOWS it when present →
  **zero migration**, existing leagues untouched. NEVER migrate `capIdentity` off the global team.
- **IDENTITY/CONFIG ONLY.** NEVER make the team ROSTER per-league (`teamRosters` keyed by teamId is the most
  load-bearing record — the scope-creep danger). **[VERIFY-AT-BUILD: confirm the DRAFTED roster lands in the
  FRANCHISE (per-league), not the global team — so the "roster stays global / identity-only" fence holds.]**
  (The cross-league identity bleed this layer fixes is a real but LATENT bug — it only bites if a team is put
  in two leagues, for which there's no flow today — which is why this is safe layer-first work, not a hotfix.)
- Register the new store in backup/sync/L-SIM-sandbox/save-slot ([[new-own-db-store-three-registries]]).

**The identity bundle (configured at leisure on the per-league team-edit page):** GM name · **Assistant GM
name** · **Scout name** · **Manager** (name + style) · **Beat reporter** · **MLB archetype** (dropdown → the
Asst GM uses it) · **Farm archetype** (dropdown → the Scout auto-specializes in it) · **draft boards/priorities**
(the Asst GM **button-generates** the initial board + rankings from the archetypes + per-position player
archetypes). **The LEAGUE holds the draft POOL.**

**"The draft" is a thin EVENT** that pulls everything from the league+teams — set up on your own time, come
together when ready. **Couch-coop SEAT names persist** as durable GM identities. Staffing (manager/reporter/
scout naming) RELOCATES out of the old post-draft staffing screen INTO this team-edit page.

## 3. ARCHETYPES & THE ECONOMY

### 3.1 Team archetypes (declared + EVOLVABLE)
Separate for MLB & Farm. Affects exactly two things: (1) **auction bidding cost** (off-identity players cost
more to ACQUIRE — see 3.3), and (2) the **lens the Asst GM reasons through**. There is **NO in-season archetype
tax**; roster DRIFT (ratings/traits/trades) is free and IS the game. The strategic game-theory of construction
is the **emergent development gamble** (build lopsided, bet your cheap young players develop), NOT a tax.
- **Auction LOCK (load-bearing):** the declared archetype is LOCKED for the duration of the auction (can't
  re-declare mid-auction to dodge the cost — that would collapse the whole model).
- **Evolution:** re-declaring the identity in-season is a deliberate, cooldown-gated event with a one-time
  **fan-IDENTITY morale nod** scaled to how far the new identity clashes with your actual roster (ratify
  reality → ~0; whiplash → fans grumble). The in-season "evolve" tool (§9) recommends the moves to get there.

### 3.2 Player archetypes (the "choose your weakness" lever)
A **comprehensive rating-combo map — strong AND weak combos**, not just star types (e.g. "glove-only SS" =
cheap, frees budget; "power-only RF" = OK with low contact/speed/fielding/arm). Each per-position archetype
encodes the strengths to pay for AND the weaknesses to accept-for-cheap → the optimizer's job is **budget
allocation ACROSS positions** driven by where the GM chooses to be weak. Applies to the BENCH too.
**Co-designed with the team-archetype menu (build workstream (b)); both balance-tested (game-able = out).**

### 3.3 The "wrong-fit penalty" — paid at the draft, visibly (RESOLVED: Option A)
Reaching for an off-archetype player should cost you, and you should SEE it. **The penalty is a GRADUATED,
VISIBLE debit from your DRAFT BUDGET when you win an off-fit player** (bid + penalty, shown before the bid —
the previously-invisible concentration tax made explicit + actually charged). Paid ONCE, at the draft. The
player then carries his **INTRINSIC salary** into the season; **dead-cap = on intrinsic.** No carried premium,
no ongoing in-season cost. The disincentive lives at the bid moment, where it belongs. The Asst GM's "true
cost" display = this draft acquisition cost. (Penalty scales with degree-of-misfit, matching the existing
graduated concentration tax.)

### 3.4 In-season economy (see `IN_SEASON_CAP_DEADCAP_ANALYSIS`)
- **v1 = USER-CONTROLLED TEAMS ONLY** in-season → no CPU trade AI. Removal = **send-down** (75% dead money on
  intrinsic salary) or **TRADE** (clean salary swap — outgoing fully clears, incoming fully taken on). **No
  release / no FA pool** (a stray offseason release path to remove). The "albatross is hard to trade"
  disincentive is **FREE human game theory** — only the albatross DESIGNATION (built) must be active.
- **Demotion-to-save IS intended rebuilding** — gated by fan morale keyed to the demoted player's fame × net-TV
  (demote a bum → fans cheer; demote a star → fans angry; a "Fan Hopeful" rookie call-up → fans excited), NOT a
  cap floor.
- **Fan morale watches RESULTS-vs-TALENT-expectation, NOT payroll** (CUT the payroll→morale layer — redundant
  since salary≈True-Value, and it'd punish rebuilds; instead flip the existing talent expected-wins→morale
  live). The **albatross** (high-salary/low-IV) morale tax is built but dark.

## 4. THE DRAFT BOARD — rank-order + ONE LIVE board

The GM gets (a) a **rank-ordering of all players** and (b) **ONE LIVE board** = the Asst GM's current best
roster-build PATH given the live draft state + the GM's priorities + risk posture. It re-draws continuously as
players sell. (NOT three separately-locked static boards — those go stale the instant the draft deviates.)

**GM steers via per-position priorities — two alternative input modes (pick one), set ONCE:**
- **ROBUST:** a player-archetype dropdown per position (incl. cheap/weak archetypes) → the Asst GM prioritizes
  those targets.
- **SIMPLIFIED:** rank the 22 roster slots by priority (1: SS, 2: SP1, 3: C …) → highest-IV at each in order,
  within constraints.

**The three risk levels = a POSTURE DIAL / views of the one live board** (flip safe↔aggressive live), defined
by spend/tax: **Conservative = ZERO luxury tax · Optimal = SOME tax, never enough to need scrubs · Aggressive =
enough tax to leave a few minimum-salary SCRUBS.** (Cap magnitudes for juiced/standard/nerfed = post-build §16
tuning.)

**GM control = LIGHT TOUCH:** priorities steer; the live board is good enough to run on as-is; the full manual
calibration (reorder/check-uncheck/swap/mark/notes) is OPTIONAL, never required. **What "locks" before the
draft = priorities + posture + archetype** (per the auction lock); the board stays live.

## 5. MARKET / PRICE-PREDICTION MODEL — "Second-Price Board"

Predict, per yet-to-be-bid player, what he'll **SELL for** ≈ the **second-highest valuation among interested
bidders + one increment** (open ascending auctions clear at the runner-up's drop point, NOT the winner's max):
```
v_ij = IV_i × archetypeFit(i, team_j) × needMultiplier_j(pos_i) × personalityBias_j   (clamped to team j solvency)
price_i ≈ 2nd-highest{ v_ij over all j + the GM } + Δ
needMultiplier_j(pos) = own_need_j(pos) × leagueScarcity(pos)
```
- **own_need uses the REAL roster model:** required slots − filled slots per position — a team isn't "filled"
  at C until it has its BACKUP C; SP has 4 critical slots (NOT one-per-position).
- **leagueScarcity** = teams-still-needing(pos) / players-left(pos) → "fewer suitors as a position fills."
- **Surplus = your valuation − predicted clearing price** is the pivot signal (a guy only YOU want = bargain).
- **REUSE existing:** `auctionMaxBid` (solvency), `auctionMarginalTax`, `evaluateCpuValuation`, live
  `capIdentity`/budgets/slots.
- **Candidate model families (the answer is the COMBINATION, staged):** value-anchor (cold-start prior) +
  residual-demand curve (the chassis) + opponent-modeling→2nd-price (the core) + Bayesian online update (the
  adaptive wrapper) + underbidder-tracking (signal feed) + Monte-Carlo forward-sim (the v2 deepening).
- **IMPERFECT INFORMATION (two band-wideners, not one):** the Asst GM knows neither the non-shill GMs' PRIVATE
  draft strategies NOR what the shills will do — both feed honest uncertainty (wider ranges), never false
  precision.

**THE ACCURACY GATE (make-or-break):** NEVER a point price — ALWAYS a range (low/median/high). Band WIDENS with
unknowable/shill bidders + early-auction + thin pool. Shill archetypes are hidden → the model knows their
seed-derived valuations internally but **widens the displayed band** (honest "1-2 wildcards here"). Frame as
"live estimates that shift"; recompute-on-sale is VISIBLE (builds trust). **PRE-SHIP GATE: calibrate band width
against `auctionTuningSim.test.ts` until the true price lands inside [low,high] ~85-90% of the time.**

**NOMINATION-TIMING (the TIME dimension).** Nomination is engine-driven weighted sampling: `weight =
(ivPercentile/100)^E` where the exponent is RATIFIED PER-TIER — **MLB = 2, Farm = 3** (DECISIONS_LOG RB-2-Q3;
the live hooks override the `DEFAULT_NOMINATION_WEIGHT_EXPONENT` 2.5 default per tier — the earlier flat `^2.5`
written here was STALE, corrected 2026-07-01 per SPEC-FIX-NOMINATION-2-3), seeded (`selectNextNominee`) — a KNOWN process, so the Asst GM can COMPUTE "when will
my target come up" odds. Powers **overspend-EARLY-vs-WAIT** advice: bid now if `surplus_now ≥
E[surplus_if_wait]`, where `E[surplus_if_wait] = P(acceptable target nominated while still affordable) ×
(value − predicted price)`. Makes the bid-vs-pass "if you PASS" branch honest. Odds/ranges only, never "comes
up in 6 picks."

**DETERMINISM/SPEED:** closed-form, NO Monte-Carlo in the hot path. O(players × teams) + a small sort per
player ≈ sub-ms; seed-deterministic (`buildSeededCpuShill`, no Math.random). "Bid X vs pass" re-projection =
recompute with one team's budget/need toggled = instant.

**STAGING (structure → learning → simulation):**
- **v1 "Second-Price Board":** the above + **recompute-on-sale** + the v1-simple nomination cue ("N acceptable
  targets left; high-IV come early so your top target surfaces soon + contested, cheaper fallbacks later").
  Type the 3 undefined spec types (`EstimatedMarket`/`CompetingTeamProfile`/`ShillProfile`). + **add the bid-log
  infra now** (`Lot.bidLog` + `AuctionResult.{bidderSet,underbidder,numBidders}` — currently discarded;
  log-first-consume-later).
- **v1.1 "Underbidder Memory":** consume the bid log → "those 3 will be back for the next catcher."
- **v1.2 "Market Heat":** online λ scalar + per-team revealed-aggression learning.
- **v2 "Forward Projection":** seeded low-path Monte-Carlo (completion-prob/regret + the full
  P(comes-up-while-affordable) timing model), on-demand ONLY.

## 6. THE LIVE AUCTION EXPERIENCE

- **NO TIMER. Pass-the-iPad** couch co-op, one GM at a time, study as long as you want, click bid/pass, hand
  on. Design constraint = **PRIVACY**, not brevity.
- **PUBLIC (always on screen):** the player up for bid + his **IV** + full profile (ratings/traits/chemistry/
  personality/age/handedness for **MLB**; FARM keeps hidden attributes per the visibility gate) + the active
  GM's **live roster**.
- **PRIVATE (behind a click):** everything the **Asst GM** provides — expand to study, collapse before passing.
- **THE KILLER FEATURE — real-time BID-vs-PASS board projection:** *"if you BID at the selected figure → here's
  your board going forward; if you PASS → here's your board going forward."* Deterministic re-optimization on
  the live shrinking pool. Show-don't-tell; the load-bearing guidance.
- **CAP DISCIPLINE / the completion floor:** the live guidance IS the projection (no separate risk-band system).
  Keep a **HARD floor** but make it the Asst GM's **ACCURATE completion calc** — "can you still complete a LEGAL
  roster from the players ACTUALLY LEFT at each remaining required position, at their real cheapest prices?" —
  NOT the crude `minimum×slots − projectedTax` (which over-reserves via the phantom tax AND can under-reserve).
  Strip the projectedTax reservation; reuse the existing forced-filler anti-strand. The floor fires ONLY at
  true impossibility (never chokes a legitimate bid) and guarantees everyone ends with a legal roster.

**SHILLS (draft-only, hidden rival GMs):** each shill builds toward its OWN secret archetype — bids its premium
ABOVE raw IV on fits, folds on non-fits, stays in a quiet room (it wants the player), UNPREDICTABLE on purpose
(keep the `NO_FLOOR_MAX_INTEREST_PROBABILITY=0.92` never-guaranteed design). Close to built `cpuShillBidding.ts`
(give each shill its own hidden archetype + don't cap at IV). **Open tuning (sim):** shill aggressiveness so it
doesn't destroy dynamics + the right NUMBER of shills for an 8-team draft.

**LLM USAGE:** the CORE needs NO LLM — the math + the projection carry it, and the math is ALWAYS deterministic
(never let an LLM decide whether a bid breaks your plan). The LLM is an **OPTIONAL polish layer** (reuse the
beat-reporter `callClaudeMessages` link to phrase exact facts richly), gated, on top of the facts. Build the
deterministic core first.

## 7. THE FARM DRAFT (Scout-run)

Same one-live-board machine (Asst GM runs the money/board), but the **SCOUT** supplies prospect reads and
**CANNOT spoil true ratings in any way**: shows **3/5/7-banded overall values on the 20-80 scale**, band count =
the **Scout's archetype-derived confidence per area** (3=strong, 5=avg, 7=weak — NOT a GM choice). Steered by
the **FARM** archetype, with **MUCH WIDER bid bands** (higher uncertainty than MLB). **Headline = CAP-SPACE RISK
DISCIPLINE** — keep the GM from betting it all on one or two fuzzy prospects.

## 8. DRAFT → SEASON HANDOFF (the FREEZE)

Full chain (BUILT on the draft-lane): Setup → Config (owners/archetypes/shill) → ScoutHire → MLB Auction →
Farm Auction → [Staffing — relocating to the team page] → Franchise Setup → **FREEZE inside
`initializeFranchise`** → launch. **Everything freezes into the season** as the franchise starting state: roster
+ identity (MLB/Farm archetype) + Scout + Assistant GM + Manager + Beat reporter + draft posture + GM.
**FREEZE ("4-number" model, `draftMorale.ts`):** per-player starting morale (slot-class ±15 + pay-class ±10,
personality-adjusted, neutral 50) + team fan-morale from payroll; writes settled salaries + morale baselines +
draft-baseline True-Value rows. **v1: AUCTION-ONLY** (snake skips the freeze, out of scope). BIG GAP = the
middle of the flow is UNMERGED to trunk (= the JK-gated assembly). *(Build caveat: the freeze pay-class morale
uses an IV-centered reconstructed scout range, not the exact range the GM saw at bid time — a known
approximation; revisit if the displayed range needs to drive the morale bump exactly.)*

**MOCK-DRAFT toggle (v1, LOW RISK).** A toggle at the start of every draft marks it a MOCK: it plays out + shows
the resulting rosters in-session, but the mock path **SKIPS BOTH durable writes** — NO roster commit
(`commitCompletedMlb/FarmAuctionSessionToLeagueRosters` → `teamRosters`) and NO franchise advance
(`initializeFranchise`/freeze). The league/teams SETUP is untouched by ANY draft (the draft only READS it), so it
stays intact by construction. **Reset = `deleteAuctionSession`** (the primitive exists) → re-run a real or
another mock draft. The one build discipline: gate BOTH durable writes behind the not-mock flag so nothing leaks.
Lets GMs test priorities/archetype/strategy before committing (complements the Asst-GM).

## 9. THE IN-SEASON ASSISTANT GM

The Assistant GM PERSISTS as the in-season roster advisor (same brain as the draft optimizer) — advising on
optimized lineups, roster moves, trades, archetype-change options, and roster analysis. Build shape (much
already built — REUSE the 4 engines: roster-readiness analyzer + lineup optimizer wired into Team Hub, in-game
scout-move evaluator, pool-feasibility):
1. **ADVISE by default, the GM clicks** (no auto-execute; one-click apply only for the safe lineup case).
2. A **DEDICATED invoked "Assistant GM" surface** (button/screen), not the current passive Team-Hub sidebar.
3. **PERFORMANCE-AWARE** — wire real season stats into the franchise analyzer (today hard-coded `'unavailable'`);
   required for "your 2B is slumping" + the within-season learning.
4. **SURFACE pool-feasibility** (`analyzePoolFeasibility`/`buildBestRoster`, orphaned today) as the
   **evolve-your-archetype** tool ("you have the bodies for Power but you're 2 bats short").

**SCOUT/ASST-GM LEARNING — three horizons:** within-draft (v1, the price model reads the room) · within-SEASON
(v1, the advisor watches how your team + rivals are constructed + perform, recognizes tendencies) ·
across-seasons (DEFERRED — no data until a season turns over). Scouts/Asst GMs are UNIQUE to the team and NEVER
leak what they learn to rivals.

## 10. MANAGER & BEAT REPORTER (mostly built)

- **MANAGER** = a named person + style in the team setup (identity LIVE: name/gender/age/hometown/style,
  assignment, seeded default, firing + tenure + morale ripples). In-game tactical VALUE = the Manager-WPA
  per-game decision layer (LIVE in the GameTracker; the season/career roll-up + manual firing are dark — the
  separate `experiment/manager-wpa-window` lane; the legacy `mwarCalculator`/`managerStorage` value model is
  deprecated/orphaned and gets cut over to the WPA-window layer).
- **BEAT REPORTER** = a narrator (the deterministic engines own all math; the reporter only voices it). **v1
  ships the LIVE post-game columns + in-game commentary** (wired, real `claude-column` LLM edge fn). **Franchise
  season-news = fast-follow** — it rides the Phase-2 soul-flag-flip + the JK LLM browser sign-off (already
  JK-gated in the v1 plan).

## 11. BUILD & SEQUENCING

**REUSE (already built):** `buildBestRoster`, `analyzePoolFeasibility`, `evaluateCpuValuation`, `auctionMaxBid`,
`auctionMarginalTax`, `capIdentity`/budgets/slots live in the auction, `selectNextNominee`, `auctionTuningSim`,
the roster-readiness analyzer + lineup optimizer (Team Hub) + scout-move evaluator, the manager identity + mWAR
layer, the beat-reporter columns + LLM link, the farm hidden-rating gate + Scout `accuracyByPosition`, the draft
chain + the 4-number freeze (draft-lane), the per-league override pattern (`leaguePlayerOverrides`).

**NEW (the build):** the per-league team-instance layer (additive); the per-position-priority input + the
player-archetype menu; the generalized optimizer (per-position targets + 3 postures); the Second-Price market
model + nomination-timing + the bid-vs-pass projection; the bid-log infra; the live one-board UI; the visible
draft-budget wrong-fit penalty; the dedicated in-season Asst-GM surface + stats-feed + recommend-then-apply;
surface pool-feasibility as the evolve tool; the accurate completion floor.

**REFACTOR (not just add):** make the hard floor accurate (strip projectedTax); derive the Scout's bands from
the farm archetype + DEPRECATE the scout-pool/hire-draft flow; RELOCATE manager/reporter/scout naming from the
post-draft Staffing screen into the per-league team page; the entity split (Scout vs Assistant GM).

**OPEN (post-build / its own exercise):** **(b) the archetype TAXONOMY** (team + player menus, design+sim,
balance-tested); the §16 number tuning (cap magnitudes, the 3-board tax thresholds, dead-cap rate, morale
magnitudes); shill aggressiveness + the 8-team shill count (sim); the accuracy calibration gate (pre-ship);
the JK-gated ASSEMBLY (merge the draft-lane middle + the per-league layer to trunk).

**SEQUENCE (JK layer-first):** per-league team layer → setup-in-team-page (incl. staffing relocation) → the
archetype reconciliation + player-archetype menu → the generalized optimizer + Second-Price market (v1) → the
live board + bid-vs-pass projection + nomination cue → farm parity → in-season Asst-GM (stats-feed + dedicated
surface + evolve tool) → calibration gate → flag-flips + §16 tuning + sign-off. The taxonomy (b) co-runs.
