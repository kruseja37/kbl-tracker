# SCOUTING INTELLIGENCE — Interrogation Transcript

> Per [[v1-rulings-2026-06-30]] Decision A: digest the spec + interrogate JK from first principles, ONE
> focused question at a time, until we have a completed/nuanced vision → THEN build. This transcript is the
> living record; it becomes the tightened spec. Every JK answer is written here verbatim-in-substance.
>
> **Foundation (already settled — see `SCOUTING_INTELLIGENCE_INTERROGATION_PREP.md` + `DRAFT_GUIDE_INTELLIGENCE_SPEC.md`):**
> ONE reified true cost per player (carried everywhere); archetype = declared + evolvable, separate for MLB &
> Farm, no in-season tax; construction game-theory = the development gamble; one analyzer powers the pre-draft
> boards + the in-season dropdown; comprehensive balanced archetype list required; auction archetype LOCKED
> during the auction; shills = hidden rival GMs w/ own secret archetype (draft-only); v1 = human teams only
> (trade reluctance is free game theory); CUT payroll→morale (flip the talent-based one live); albatross
> designation built (morale tax dark).
>
> **Spec under tightening:** `DRAFT_GUIDE_INTELLIGENCE_SPEC.md` (28 §; faithful but not buildable as-is —
> needs a what-exists-vs-new delta map, pinned math, a plan-distinctness guarantee).

---

## Q&A LOG

*(Each entry: the question, JK's answer, and the resulting spec decision. Appended live.)*

### Q1 — Where does a team's archetype identity come from (League Builder per-team-persistent vs draft-process)?
JK reframed into an architectural proposal: League Builder treats teams as GLOBAL SINGLETONS (an archetype
set on a team would bleed across every league it's in). He proposes a **per-league TEAM-INSTANCE layer** so a
team's identity/data is editable WITHIN each league — then move the pre-draft setup (GM name, archetype,
hired scout, the scout's 3 draft boards) into a per-league team-edit page configured privately once the pool
is locked, and collapse "the draft" into JUST entering the auction (it pulls the pre-configured data). Q: is
it better/cleaner, worth it or too risky?

**VERIFIED (workflow, evidence-strict):**
- ✅ Premise CONFIRMED: a Team is a global singleton (`globalTeams` store, keyPath 'id'; league membership =
  `Team.leagueIds[]` ↔ `LeagueTemplate.teamIds[]`). No per-league team instance; roster is global too
  (`teamRosters` keyed by teamId alone). So `capIdentity`/`farmCapIdentity` on the team are shared across
  every league it's in.
- 🎁 **The per-league override pattern ALREADY EXISTS for PLAYERS** (`Player.leagueAssignments[]` +
  `leaguePlayerOverrides` store keyed leagueId+playerId) — teams just never got it. A proven idiom to mirror.
- The 4 setup pieces live at 3 scattered scopes today: GM name = FRANCHISE config; archetype = GLOBAL team
  (Teams page); scout = PER-LEAGUE (scoutProfiles + `hiredScoutIdsByTeamId` on the draft session); **the 3
  draft boards = DO NOT EXIST** (no type/store/generator — net-new).
- Current "draft" IS a multi-step wizard (DraftSetupHubPreview, branch-only): 5+ things (seats, GM names,
  human-vs-CPU, MLB+farm archetypes, shill count) + a separate scout-hire screen. Inherently draft-time =
  the live auction + shill count (room pressure) + who's at the table that night; movable to setup = GM name,
  archetypes, owner, scout, the boards.

**DECISION (resolved):** JK's per-league team-instance layer is **the right architecture and SAFE in its
additive form** — a per-(league,team) **shadow-override** store (mirror `leaguePlayerOverrides`): global team
stays the DEFAULT, the per-league record SHADOWS it when present → **zero migration**, existing leagues
untouched. **Hard fence: IDENTITY/config only (GM/archetype/scout/boards). NEVER make the ROSTER per-league
and NEVER migrate `capIdentity` off the global team** — that's the only version with real saved-data danger,
and the `teamRosters` record is the most load-bearing in the app (scope-creep is THE risk). Register the new
store in the backup/sync/L-SIM/save-slot checklist ([[new-own-db-store-three-registries]]).
**SEQUENCING:** the layer is NOT a prerequisite for the scout — the **3 draft boards (the actual v1 blocker)
can be built on the EXISTING draft-session/scout-profile rails**. So → **v1: build the boards on existing
rails (playable scouted draft); v1.1: add the per-league team-edit page (the setup-in-League-Builder /
draft-is-just-the-auction UX re-architecture) and re-home the boards into it.** The cross-league bleed is a
real but LATENT bug (needs an un-exercised "team in 2 leagues" flow to trigger) → v1.1 correctness win.
[OPEN sub-fork for JK: build-the-layer-first-then-boards (cleaner, boards built once, slower to playable) vs
boards-on-rails-now-relocate-later (faster to playable, cheap re-home). Captain lean: boards-first.]

**JK RULING (Q1 sub-fork): OPTION A — LAYER-FIRST, in v1.** Rework draft setup so it lives INSIDE the
league (pool) + the per-league teams (GM/scout/draft boards), and switch the draft to an EVENT that pulls
everything from the associated league+teams ("set up on our own time, come together when ready to draft").
⇒ the per-league team-instance layer + the per-league team-edit page + the thin-draft-event rework are now
FOUNDATIONAL v1 work (sequenced before the playable draft). Safety fences STILL apply (and matter more, since
we're building it in v1): additive shadow-override store (zero migration), per-league team holds
IDENTITY/SETUP only (GM/scout/boards/archetype-override), global team stays the default, NEVER migrate
`capIdentity` off the team, register the new store in backup/sync/L-SIM/save-slot.
**VERIFY-AT-BUILD:** where does the DRAFTED roster land — the franchise (per-league, expected, so the per-league
team layer need NOT touch `teamRosters`) vs the global team? Confirm the draft output is franchise-scoped so
the "roster stays global / identity-only" fence holds without contortion.

**Q1 ADDENDUM (JK):** managers + beat reporters should ALSO be assigned in the per-league team setup (not
post-draft/pre-season). ⇒ the per-league team-instance identity bundle = GM name + MLB/Farm archetype +
scout + draft boards + **manager + beat reporter**. All configured at leisure; the draft/season pulls them in.

### Q2 — What makes the three boards (Conservative/Optimal/Aggressive) genuinely different?
Spec §9-10 differentiates them by RISK TOLERANCE via different optimizer objective-weights (Conservative
protects completion/budget/tax; Optimal = best balanced archetype build; Aggressive = chase ceiling/stars,
accept tax + thin bench). My read: right backbone; risk = three near-identical lists; make the primary visible
differentiator budget-concentration (stars-and-scrubs vs depth) + a plan-distinctness test.

**JK ANSWER — boards differ by PER-POSITION PRIORITY × risk/spend, two input modes:**
- **ROBUST mode:** a dropdown next to EACH position to pick the desired **PLAYER ARCHETYPE** (the kind of
  player you want there). The scout prioritizes hitting those per-position targets. The 3 boards = ALIGNMENT
  levels driven by money: **Aggressive = maximal alignment** (spends/taxes to nail your ideal at each spot),
  **Conservative = least** (cheaper fallback fits), **Optimal = between.**
- **SIMPLIFIED mode (alternative the GM picks instead):** rank the 22 roster slots by priority (1: SS, 2: SP1,
  3: C, 4: CP, 5: CF, 6: SP2 … 17: Bench-C, 18: Bench-IF, 19: SP/RP…); the scout fills the highest-IV player at
  each slot in priority order, within the salary-cap / team-archetype / 3-board constraints.
- **Tax/spend profile per board (JK, the concrete enforceable differentiator):** **Conservative = ZERO luxury
  tax; Optimal = SOME tax but not enough to require scrubs; Aggressive = enough to require a few minimum-salary
  SCRUBS at the end.** ⇒ answers the distinctness bar: genuinely different teams. Cap magnitudes for
  juiced/standard/nerfed = DEFERRED to post-build §16 tuning (JK uncertain until the engine exists).

**BUILDABILITY (verified): YES, with one piece to formalize.**
- Simplified ranking mode = buildable on existing concepts (positions, IV, `buildBestRoster`, roster slots).
- `PlayerArchetype` taxonomy EXISTS but is a small narrative starter set (`src/types/reporter.ts:20` —
  ACE/SLUGGER/SPEEDSTER…; tag list in `LeagueBuilderPlayers.tsx`). ROBUST mode needs it **expanded into a
  comprehensive per-position player-type menu** — design+build connected to the TEAM-archetype matrix gap-fill
  ([[v1-rulings-2026-06-30]] C): same "what are the building blocks?" question at the player level (likely
  derive player-type from rating/trait profiles + name the menu).
- `buildBestRoster` (`archetypeBalanceSimulator.ts:269`) exists (takes pool/team-archetype/tier/budget); must
  be GENERALIZED to accept per-position targets + emit 3 tax-leveled boards (the "generalize the sim builder"
  note, [[archetype-optimizer-fielding-decisions]]).
- **Unified insight:** the two modes are the SAME thing at different fidelity — the GM's per-position
  priorities (robust = "what KIND of player"; simplified = "which positions matter most"); both feed the
  optimizer as per-position constraints; the 3 boards = how fully targets are met vs money (tax/scrubs).
  Modes are alternatives (pick one); priorities set ONCE → 3 boards generated.

**Q2 FOLLOW-UP (JK) — player archetypes = a COMPREHENSIVE rating-combo map (good AND bad), which is the GM's
"choose where to be weak/cheap" lever. THE economic heart of the scout.**
- Player archetypes must be **fully researched + populated** so users aren't forced to reuse the same few.
  They must reflect player rating COMBOS **both good and bad** — NOT treat every archetype as a star type.
- The key power: the GM **specifies where they're willing to be WEAK** to save money. Examples: **"glove-only
  SS"** (good fielding, weak bat → very CHEAP → frees budget for a more aggressive board elsewhere);
  **"power-only RF"** (good power; explicitly OK with low contact/speed/fielding/arm). So each per-position
  archetype encodes both the strengths to pay for AND the weaknesses to accept-for-cheap.
- ⇒ the optimizer's job is **budget allocation ACROSS positions**: the per-position archetype choices (incl.
  deliberate weaknesses) tell the scout where to spend and where to economize. This is what makes the 3 boards
  (and the whole scout) valuable.
- **Co-design with the TEAM-archetype gap-fill ([[v1-rulings-2026-06-30]] C):** do the player-archetype +
  team-archetype taxonomies TOGETHER so both are comprehensive and complement each other (same "building
  blocks" problem at two levels; both still must stay balance-tested — game-able is out).
- **Applies to BENCH too:** the GM specifies bench archetypes/strategy, not just starters.
- DECISION: the player-archetype taxonomy is a comprehensive co-designed (with team archetypes) rating-profile
  map covering strong+weak combos, per position + bench; it's both the scout's vocabulary AND the GM's
  cost/strategy lever. Bigger taxonomy task than "name star types" — but the right scope (drives the economy).

### Q3 — How much hands-on calibration does the GM do? Once locked, what's frozen?
**JK ANSWER: (a) LIGHT TOUCH / optional fine-tuning.** The per-position priorities do the real steering; the
scout hands over 3 good boards that are lockable as-is; the manual calibration table (reorder, check/uncheck,
swap, mark, notes — spec §8.2) is OPTIONAL for the GM who wants to obsess, NOT required. (Fits the
non-user-intensive design philosophy — the scout spares the 22-pick micromanage.) Lock contents = per spec
§9.4 (the 3 boards become scout memory: player ids, GM-adjusted rankings, plan checkboxes, salary/tax/effective
totals, archetype accumulation, position coverage, risk profile, notes/tags) + the GM's per-position
priorities + spending posture. RESOLVED.

### Q4 — Live-auction guidance (Captain's "fast bidding, glance vs dashboard" framing was WRONG)
**JK CORRECTION — the auction format:** there is **NO TIMER**. It's **pass-the-iPad** couch co-op: each GM
takes the device on their turn, studies everything they need with no time pressure, clicks **bid or pass**,
and hands the iPad to the next GM. So the design constraint is **PRIVACY** (hide a GM's scouting analysis from
rivals at the table), NOT brevity.
- **PUBLIC layer (always on screen, never hidden):** the player up for bid + his **IV** + full player-profile
  details — ratings/traits/chemistry/personality/age/handedness for **MLB** players (FARM players keep their
  hidden attributes per the already-built visibility gate, [[hidden-vs-revealed-ui-rule]]) — AND **the active
  GM's live roster.**
- **PRIVATE layer (behind a click):** everything the **scout** provides. The GM expands the surface to study
  privately, then collapses it (or clicks bid/pass); the next GM gets the same hidden surface to unhide on
  their turn. ⇒ full scout depth is available (no need to trim for speed) — just gated for privacy.

**Q4 KILLER FEATURE (JK) — real-time BID-vs-PASS board projection (the scout's core; needs NO LLM):**
Instead of noisy numeric phrases, the scout SHOWS the two futures, concretely:
- **"If you BID at the currently-selected figure → here is how your 3 boards look going forward."**
- **"If you PASS → here is how your 3 boards look going forward."**
The scout tracks who's been **bought/lost for good** and updates the **draft pool feeding the boards in
real time**, re-projecting continuously. Show-don't-tell; deterministic (just re-running the optimizer on the
live state); more informative than any sentence. **This is the load-bearing scout guidance.**

**LLM right-sizing (JK asked: do we need the LLM, like the beat reporter?):** the CORE needs **NO LLM** — the
board projection + the exact numbers (true cost, which plans survive, tax, budget) carry it, and the math
must ALWAYS be deterministic (never let an LLM hallucinate "this breaks your plan"). The LLM is an **OPTIONAL
polish layer**: reuse the beat-reporter `callClaudeMessages` link to phrase the exact facts as richer
summary language (avoids the "few numbers + redundant phrases = noise" risk), **gated**, on TOP of the
deterministic facts. Same pattern as the reporter ([[reporter-adapter-pure-emission-llm-split]]): pure
deterministic adapter computes facts → LLM-gated presentation enriches language. **Build the deterministic
projection core first; add LLM language as a later gated enhancement.**
- **BUILD CAVEAT:** the optimizer must be fast enough to **re-project interactively** per bid-figure/pass
  (no-timer eases the latency budget — a couple seconds is fine — but it must be responsive; may need
  incremental re-opt / precompute). The "if you PASS, here's what's still gettable" projection needs the
  **MARKET MODEL** (estimate future prices of remaining players) — exact for current state (who's gone),
  ESTIMATED for remaining-player future cost. → next question.

### Q5 — The market / price-prediction model (how does the scout know what players will go for?)
JK chose "learns from the room" with sophisticated logic: marginal value of the next player at a position
goes UP for teams still needing it / DOWN for teams who just filled it (fewer suitors as a position fills);
underbidders likely bid again ("4 bid on a catcher, 1 won → 3 still hunting"); a weighted statistical model
moves future-player values up/down; adaptive online update (a curveball discount re-marks the board, the scout
isn't "wrong", it adapts); OPPONENT MODELING from each team's KNOWN archetype (shills hidden) + live behavior.
JK: how should it work? are there various models? can scouts learn from rivals' archetype+behavior?

**ANSWER (workflow, auction-theory-grounded) — JK re-derived 2nd-price auction theory. The model:**
Value each player THROUGH EACH RIVAL'S EYES (`v_ij = IV × archetypeFit(player, team_j) × needMultiplier_j(pos)
× personalityBias_j`, clamped to that team's solvency `auctionMaxBid`), then predict he **clears at the
SECOND-highest of those valuations + one increment** — because in an open ascending auction nobody pays their
max; the price stops just above the RUNNER-UP's drop point.
- **THE 2ND-PRICE INSIGHT is the whole ballgame.** A player ONE team loves + nobody else wants goes CHEAP
  (bargain to flag) even at high IV; a player TWO teams covet goes near their shared ceiling. Pivot advice =
  maximize your SURPLUS (your valuation − predicted clearing price), not raw quality.
- **JK's "fewer suitors as a position fills"** = `needMultiplier_j(pos) = own_need_j(pos) [1.4 open / 1.0
  depth / 0.5 filled] × leagueScarcity(pos) [teams-still-needing / players-left]`. Catcher sells → filled
  teams drop out, still-needy teams firm up. Exactly his mechanic.
- **JK's "the 3 losers bid the next catcher"** = underbidder-carry (needs the bid-log signal — see infra).
- **JK's "curveball discount → re-update"** = recompute-on-sale (v1) + later an online market-heat λ scalar.
- **Shills hidden** = the model knows their seed-derived valuations internally but **WIDENS the displayed
  band** so the GM gets honest uncertainty ("1-2 wildcard bidders here"), not false precision.

**CANDIDATE MODELS (JK asked "are there various?"):** 6 families — (a) value-anchor [cold-start prior],
(b) residual-demand curve [the chassis], (c) opponent-modeling→2nd-price [the core], (d) Bayesian online
update [the adaptive wrapper], (e) Monte-Carlo draft sim [optional deepening, §15], (f) underbidder tracking
[signal feed]. The answer is the COMBINATION, staged.

**DETERMINISM + SPEED:** closed-form, NO Monte-Carlo in the hot path. `O(players × teams)` arithmetic + a
small sort per player ≈ sub-millisecond; seed-deterministic (reuse `buildSeededCpuShill`, no Math.random).
Re-projecting "bid X vs pass" = recompute with one team's budget/need toggled = instant. Monte-Carlo (seeded,
16-64 paths) ONLY for the on-demand §15 forward projection (completion-probabilities/regret), never per-keystroke.

**THE ACCURACY TRAP (make-or-break — JK named it himself):** a confidently-WRONG scout is worse than a humble
one. Rules: NEVER a point price, ALWAYS a range (low/median/high — §12 `EstimatedPlayerCost` already typed this
way); band WIDENS with the count of unknowable/shill bidders + early-auction + thin pool; frame as "live
estimates that shift"; recompute-on-sale is VISIBLE (demonstrates it adapts → builds trust). **THE PRE-SHIP
GATE: calibrate band width against the existing `auctionTuningSim.test.ts` until the true price lands inside
[low,high] ~85-90% of the time.** Measurable, not vibes. This gate is what earns "stop worrying if you can afford it."

**STAGING (structure → learning → simulation):**
- **v1 "Second-Price Board":** opponent-valuation → 2nd-price clearing → ranges → recompute-on-sale. Closed-form,
  deterministic, reuses `capIdentity`/budgets/slots/`auctionMaxBid`/`auctionMarginalTax`/`evaluateCpuValuation`.
  Small new code: the 2nd-price sort, `needMultiplier`, the band, + TYPE the 3 undefined spec types
  (`EstimatedMarket`, `CompetingTeamProfile`, `ShillProfile` — referenced in §10.1 but never defined).
- **v1.1 "Underbidder Memory":** consume the new bid log → "those 3 will be back" (biggest accuracy jump).
- **v1.2 "Market Heat":** online λ scalar + per-team revealed-aggression learning.
- **v2 "Forward Projection":** seeded low-path Monte-Carlo (§15) on-demand only.
**INFRA ADD (do during v1, log-first-consume-later):** the auction currently DISCARDS bid history
(`AuctionResult` keeps only winner+price; `passBid` drops the passer). Add `Lot.bidLog:{teamId,amount}[]` +
`AuctionResult.{bidderSet,underbidder,numBidders}` NOW so v1.1 has data waiting. Cheap, additive.
**SPEC FIX:** the 3 undefined types get defined here; §12/§14/§15 shapes (EstimatedPlayerCost range, BidImpact
risk-bands Safe/Aggressive/Reckless/Emergency/Blocked, Auction Simulation) are sound — build ON them.
BUILDABILITY: net-new model but on a mostly-live opponent-signal spine; no sale-price predictor exists today.

**Q5 FOLLOW-UPS (JK):**
- **(F1) Roster-construction awareness — CORRECTION to the needMultiplier.** The scout must use the REAL
  canonical roster model (§4), NOT one-slot-per-position: a team with 1 catcher still needs a BACKUP C (C is
  the most important backup position); starting pitchers have **4 critical slots** (SP1-4); etc. So
  `own_need_j(pos)` = f(slots REQUIRED at pos − slots FILLED), and a position isn't "filled" until ALL its
  required slots are. The residual-demand math drives off the full roster requirement per team.
- **(F2) Imperfect information (reinforces ranges):** the scout does NOT know non-shill GMs' private draft
  strategies (their boards/priorities are hidden) NOR what shills will do. Both → honest uncertainty / bands.
- **(F3) Shill tuning is an OPEN SIM/TUNING item:** tune shill behavior so it doesn't destroy draft dynamics
  (too aggressive = snipe/distort; too conservative = dead auction) AND **learn the right NUMBER of shills for
  an 8-team draft.** Post-build tuning (like the cap magnitudes), validated against the auction tuning sim.

**STRUCTURAL REVISION (JK decided) — RANK-ORDER + ONE LIVE BOARD (the three "boards" become a posture DIAL).**
The live market model (Q5) + bid-vs-pass projection (Q4) make three SEPARATELY-LOCKED static boards stale the
instant the draft deviates. JK: "should there be a rank-order and only one draft board now that is the
live-updated in-draft board?" → **YES.** New model:
- The GM gets (a) a **rank-ordering of all players** (their big board, from per-position priorities) + (b) **ONE
  LIVE board** = the scout's current best roster-build PATH given the live draft state + priorities + risk posture.
- The three risk levels (Conservative=0 tax / Optimal=some / Aggressive=scrubs, from Q2) become a **posture DIAL
  / three VIEWS of the one live board** — flip the dial to see safe↔aggressive live — NOT three separately
  calibrated/locked rosters. (Fits light-touch Q3 + the live model; the original "lock 3 boards" was
  pre-live-model thinking.)
- **What "locks" before the draft = the GM's PRIORITIES + risk posture** (+ archetype, per the auction-lock
  rule), NOT three static rosters. The board itself stays LIVE/current. Q2's differentiation logic is unchanged
  (per-position priorities × tax-posture); only the PACKAGING changes (one live board + dial, not 3 locked).

### Q6 — Farm draft: how blind is the scout?
**JK ANSWER: ONE board (same as MLB), but it CANNOT spoil true ratings in ANY way.** The farm scout:
- Steers GMs toward players that fit the team's **FARM archetype** (set in the per-league team settings, separate
  from MLB — [[hidden-vs-revealed-ui-rule]]).
- Shows **3-, 5-, or 7-BANDED overall player values on the 20-80 scale** (the scout grade band — coarser/finer =
  confidence), NEVER true ratings (farm hidden-attribute gate stays, already built).
- Then behaves like the MLB draft (one live board, per-position priorities, the 2nd-price market model) but with
  **MUCH WIDER BID BANDS** due to the higher uncertainty.
- **HEADLINE for the farm scout = CAP-SPACE RISK DISCIPLINE:** the GM must understand the risk of running out of
  cap while bidding under fuzzy values, so he **doesn't bet it all on one or two guys.** The farm scout's primary
  value is protecting the GM from over-concentrating budget on a couple of uncertain prospects.
- (Goal = farm-archetype fit under uncertainty + cap-discipline; not an explicit ceiling-weighting — the banded
  20-80 overall IS the projected value the scout reasons on.)

### Q7 — What happens to the scout when the draft ends? (draft → season handoff)
**JK ANSWER: the scout PERSISTS into the season as the in-season roster advisor.** Same hired scout, now
advising on: **optimized lineups, roster moves, trades, archetype-change options**, and "all sorts of advice on
button presses when GMs ask for roster analysis" — the roster-analysis-on-demand is "**should be partially
built already**" (the existing diagnostic roster analyzer). This is the same brain as the draft optimizer
(the [[archetype-optimizer-fielding-decisions]] "one analyzer powers pre-draft boards + in-season dropdown" /
the evolve-your-archetype dropdown from Q1's archetype-evolution thread). Continuity: the GM who drafted your
team keeps advising it.
**FREEZE: everything carries over** into the season as the franchise's starting state — roster + identity
(MLB/Farm archetype) + scout + draft posture (+ GM/manager/beat-reporter from the per-league team bundle). The
season opens already knowing who you are. (Ties to the draft-freeze → Mode-2 handoff + the persistent per-league
team-instance identity bundle from Q1.)

---

## STATUS: tightened spec draft produced → `SCOUTING_INTELLIGENCE_SPEC_V2.md` (2026-06-30, after Q1-Q7). Interrogation CONTINUES below.

### Q8 — Where does the off-archetype "wrong-fit penalty" land? (the one-true-cost crux, RESOLVED)
**JK ANSWER: OPTION A.** The wrong-fit penalty is paid AT THE DRAFT, out of your draft budget, **visibly** —
winning a $4M off-fit player actually drains ~$7M of draft budget ($4M salary + ~$3M wrong-fit penalty), shown
in full BEFORE the bid. Once the season starts the player carries his **INTRINSIC salary ($4M)** — what he's
worth. **Dead-cap = on intrinsic** (NOT on the inflated true cost). The premium is paid ONCE, at the draft,
visibly — NOT carried as an ongoing season cap hit (Option B rejected: no permanent burden, no
evolution-un-reify mess, no double-count). This **definitively RETIRES the "dead-cap on true cost" idea** and
RESOLVES the §9/§10 crux.
- The disincentive lives at the BID moment ("do I want to spend $7M of budget on a non-fit?") — exactly where
  it belongs. The mechanism: the archetype penalty is a real, visible DEBIT from draft budget on winning an
  off-fit player (the current invisible bidding-reserve effect made EXPLICIT + actually charged).
- **Penalty SCALING (documented default — JK didn't object; matches the existing graduated concentration tax):
  GRADUATED** — a little off = a little penalty, completely off = a big one (the built tax already shifts caps
  proportionally; flat would be a regression). JK can override.
- **Net economy (FINAL):** draft acquisition cost = bid + graduated archetype penalty (visible, paid from draft
  budget, once); season salary = intrinsic; dead-cap = on intrinsic; no in-season archetype tax; trade = clean
  swap; removal = send-down or trade (no release). The scout's "true cost" display = the draft acquisition cost.

### Q9 — Soft-risk / completion guardrails + the hard-floor problem (JK: "the spec already answers this")
**JK is RIGHT — already answered, + a precise hard-floor nuance.** The cap-health guidance the Captain's Q9
proposed (always-on "can you still finish your roster" with escalating warnings) IS the **bid-vs-pass
projection (Q4) + market model (Q5)** — the scout already shows live whether your roster stays completable. No
separate risk-band system needed; Q9 was redundant with prior decisions.
**THE HARD-FLOOR PROBLEM (JK): the current floor "overvalues the floor for the rest of the draft" → keeps
teams from bidding even the minimum.** Verified cause: `auctionMaxBid = remainingBudget − (slotsRemaining−1)×
minSalary − projectedTax` (`rosterEngineConstants.ts:364-371`). The **`projectedTax` reservation is the
culprit** — it holds back budget for a luxury tax that may never be incurred (reserved crudely against the
current lot, not the GM's actual plan), choking legitimate bids. The pure-solvency part
(`budget − (slots−1)×minSalary`) is the TRUE minimum and is correct.
**RESOLUTION:**
- **KEEP the hard floor, but as PURE SOLVENCY ONLY** (`budget − (slots−1)×minSalary`, NO projectedTax
  reservation). Its VALUE = the absolute guarantee you can always field a LEGAL roster. An INVISIBLE backstop.
- **Strip the projectedTax over-reservation.** Under Option A (Q8) the off-fit penalty is a real draft-budget
  debit only when you CHOOSE to buy off-fit → must NOT be pre-reserved against every lot.
- **The scout's PLAN-AWARE accurate reserve replaces the crude floor as the GUIDANCE the GM bids against:**
  "given your actual plan + the live market (incl. cheap 'weakness' archetypes + any planned off-fit
  penalties), keep ~$X for the rest → you can spend up to (budget − $X) here." More accurate AND more generous
  than reserving minimum×slots+tax → stops choking minimum bids. The floor becomes a non-issue (rarely binds;
  the scout warned accurately well before) — exactly JK's "make it a non-issue, then it's fine to keep."
  CONFIRMED VALUE: keep the pure-solvency floor; the projectedTax part is the bug.

**Q9 FOLLOW-UP (JK: "how is the floor calculated? should we just get rid of it?") — REFINED resolution.**
Verified: the floor IS a HARD BLOCK (`auctionStateMachine.ts:302/372` reject `bid-above-solvency-cap`); formula
`auctionMaxBid = max(0, budget − (slots−1)×minSalary − projectedTax)` (`rosterEngineConstants.ts:364`); an
anti-strand **forced-filler** already exists (`auctionStateMachine.ts:494-504` forces a cheap filler before a
PASS could strand a slot); minimum salary IS a real per-slot cost (so a team CANNOT spend 100% — pure-removal
is UNSAFE: you'd be unable to afford your remaining fillers).
**JK's diagnosis is right — the crude floor miscalculates in BOTH directions:** it OVER-reserves (the
projectedTax phantom) AND can UNDER-reserve (it assumes a minimum-salary filler EXISTS at every remaining
position; if the cheapest catcher left is $2M > minimum, the crude floor lets you strand catcher).
**RESOLUTION — don't remove the floor; make it the SCOUT's ACCURATE calc.** The hard block should fire on the
scout's real "can you still complete a legal roster from the players ACTUALLY LEFT at each remaining required
position, at their real cheapest prices" — NOT crude minimum×slots+tax. Then: (1) it never chokes a legitimate
bid (accurate ⇒ only blocks at TRUE impossibility = the spec's "hard-block only impossible bids"); (2) it keeps
the guarantee you can always field a LEGAL roster (humans ignore warnings; in couch-coop one stranded team is a
broken league outcome). This IS "let the scout do the work" — the floor BECOMES the scout's accurate
completion calc, enforced only at the one point the outcome would be genuinely broken; it stops being a felt
constraint. (Strip projectedTax; reuse the forced-filler.) [Alternative JK floated = pure-soft no-block; rejected
because minimum-salary fillers cost money + humans ignore warnings → stranded incomplete rosters.]

### Q10 — Does the scout learn? (about you, about rivals; within-draft / within-season / across-seasons)
**JK ANSWERS:**
- **Rival-learning WITHIN a draft = v1** (the price model reads the room — Q5). ✓
- **Cross-draft / cross-SEASON learning = NOT v1** — correct reasoning: one draft per league initially, the
  value only materializes once a season turns over (no data yet). Deferred (same bucket as the v1.2 market-heat
  learning).
- **Scouts are UNIQUE to the team and never leak** what they learn to rival GMs. Confirmed.
- **NEW (JK likes it) — WITHIN-SEASON learning = v1:** the in-season scout (the persistent advisor from Q7)
  watches how YOUR team AND the other league teams are CONSTRUCTED + PERFORM over the season, recognizes
  TENDENCIES, and makes recommendations from that. So the scout's learning has THREE horizons: within-draft
  (v1) · within-season (v1, the in-season advisor learns the league as it plays) · across-seasons (deferred).

### Q11 — Scout quality/hiring → JK SPLIT the role into TWO entities (Scout + Assistant GM)
GROUNDED current state: a `LeagueBuilderScoutProfile` already has `accuracyByPosition` + `specialties` +
`weaknesses` + a hire-from-a-`scoutPool` draft (`scoutOrder`/`hiredPick`/`hiredScoutIdsByTeamId`,
`leagueBuilderStorage.ts:178-205`) — but it's wired for the **FARM** (hidden prospect ratings → accuracy = read
quality). MLB ratings are PUBLIC, so "scout accuracy" was meaningless there — which is why Q11 felt off.
**JK RE-CONCEPTUALIZATION (the resolution): SPLIT the merged role into TWO named entities.**
- **THE SCOUT** = FARM prospect evaluation ONLY. Instead of manual 2-strong/2-weak positions, the scout
  **specializes in your team's FARM ARCHETYPE** → implicitly **strong = 3-band vision** (tight/precise) in the
  archetype-aligned areas, **weak = 7-band vision** (fuzzy/wide) in de-emphasized areas, **average = 5-band**
  elsewhere. (REFRAMES Q6: the 3/5/7-band is NOT a GM banding choice — it's the scout's ARCHETYPE-DERIVED
  confidence per area; fewer bands = tighter/stronger.)
- **THE ASSISTANT GM** = the MLB draft + MONEY side (draft AND ongoing in-season advisement) — i.e. the entire
  "scouting intelligence" we spec'd (optimizer + Second-Price market model + bid-vs-pass projection + cap
  discipline + in-season roster advisor). It specializes in **ROSTER CONSTRUCTION**, which is WHY it sees
  ACROSS archetypes (yours, rivals', theoretical, in-season roster changes) and advises on **strategy, finance,
  and roster pivots** during the draft + the season. The Q11 "MLB scout quality" question DISSOLVES — the MLB
  competency is construction (Asst GM), not rating-accuracy (Scout).
**SETUP UX (per-league team-edit page — extends the Q1 identity bundle):** name your **Scout** + your
**Assistant GM** in text boxes; pick your **FARM archetype** (dropdown of all team-archetype options) → the
Scout auto-specializes in it; pick your **MLB archetype** (dropdown) → the Assistant GM is aware of it and, on
a **button-click, generates the initial draft board + rankings** from team archetype + per-position player
archetypes, housed in the team setup.
**ALIGNMENT + WORKABILITY (Captain assessment): ALIGNS, and it's a clarifying improvement** (a real
baseball-org split: scouts EVALUATE talent, the front office/Asst GM CONSTRUCTS the roster + runs the money).
Refactor map: (1) REFRAME the scout — derive `accuracyByPosition`/bands from the FARM archetype; (2) DEPRECATE
the scout-pool/hire-draft mechanism (`scoutOrder`/`hiredPick`/`scoutPool`/ScoutHire) → replaced by
name-it + auto-specialize on the per-league team page; (3) the Assistant GM is NEW but = the already-spec'd MLB
intelligence (no built MLB-scout code to conflict — the MLB intelligence was vaporware); (4) add Scout + Asst
GM NAMES to the per-league identity bundle. The only "refactor not just add" piece = deprecating the farm
scout-draft/pool flow. Clean + workable.

### Q12 — Nomination mechanics (who puts players up?)
GROUNDED: nomination is **ENGINE-driven** today — the UI literally says "ENGINE NOMINATED"
(`LeagueBuilderAuctionDraft.tsx:492`); there's a `nominatorTeamId` + seeded `nominationOrder`/`nominationRound`
but the human never chooses WHICH player goes up. The strategic "nominate to drain a rival" lever does not exist.
**JK DECISION: STICK WITH (A) — engine nomination, no human nomination choice for v1.** (Pure-bidding strategy;
no drain-a-rival mind-game.)
**JK ADD + question:** the engine nominates on a **PROBABILISTIC curve weighting players by IV** — high-IV
players tend to come up sooner but NOT deterministically, so there's real uncertainty about WHEN a specific
player is nominated + whether GMs will still have money. JK asks: should this nomination-timing uncertainty
feed the **Assistant GM's** prediction model (it knows the GM's targets + rivals' budgets), enabling
"overspend EARLY vs wait" advice? → analysis in flight (workflow). **Captain early lean: YES, richer — it adds
the TIME/availability dimension to the bid-vs-pass projection ("if you pass, P% chance a comparable target
comes up while you can still afford him"); likely the v2 Forward-Projection layer, with a simpler v1 cue
("N comparable targets remain + their expected prices + your affordability") capturing most of the value.
**RESOLVED (Captain grounded `selectNextNominee`, `auctionStateMachine.ts:187-214`):** nomination = **weighted
random sampling** — `weight = (ivPercentile/100)^2.5` (`DEFAULT_NOMINATION_WEIGHT_EXPONENT = 2.5`),
`key = u^(1/weight)` with `u` a SEEDED uniform, max key wins (Efraimidis-Spirakis). High-IV strongly favored
early; seed-deterministic but human-unpredictable. **KEY: it's a KNOWN process → the Asst GM can COMPUTE timing
odds** (P(target is next) = w_target/Σw; P(within k lots) approximable) — closed-form-ish, NO Monte-Carlo needed
for the basic cue.
**VERDICT: YES, fold it in — it makes the advisement richer (adds the TIME dimension) and it's TRACTABLE.**
- Integration: for a target at position p, advice = bid now if `surplus_now ≥ E[surplus_if_wait]`, where
  `E[surplus_if_wait] = P(an acceptable p-target is nominated while still affordable) × (its value − predicted
  price)` — integrating the nomination odds (known) × the Second-Price price model × the GM's budget trajectory.
  This IS JK's "they know the GM's targets + whether to overspend early or late." It makes the bid-vs-pass "if
  you PASS" branch HONEST ("~P% chance a comparable SS comes up while you can still afford him").
- **STAGING:** **v1-SIMPLE cue (most of the value, cheap, closed-form):** "you have N acceptable Ps left;
  high-IV come early so your top target likely surfaces soon + contested, but 2 cheaper fallbacks likely come
  later — don't overpay here," using the known weights + remaining-acceptable-count + expected prices +
  affordability. **v2 = the full probabilistic timing model** (P(comes up while affordable)), naturally part of
  the Forward-Projection layer. HONESTY: odds/ranges only ("~70% chance"), NEVER "he comes up in 6 picks."

### Thread A — grounding the smaller threads (manager · beat reporter · draft-flow · roster-analysis)
Much is BUILT. Grounded findings + the genuine decisions:
**MANAGER:** Identity system LIVE (person: name/gender/age/hometown/style; `(mode,instanceId,teamId)` assignment;
seeded default; firing + tenure + morale ripples). In-game VALUE = the Manager-WPA per-game decision layer
LIVE-wired into GameTracker (the `experiment/manager-wpa-window` lane); season/career ROLL-UP orphaned (build-plan
STEP 4); legacy mWAR deprecated; manual firing build-dark (L11 flag). Assigned TODAY at the post-draft Staffing
screen → per JK RELOCATE to the per-league team setup (Q1 bundle). DECISION: manager = named entity + style in
the team setup; mostly built; the mWAR season roll-up + manual firing = known-dark (separate lane).
**BEAT REPORTER:** Substantially built — entity (personality/voice/era/avatar/mood), per-team auto-gen +
`ReporterAssignmentPanel`; two products: **post-game columns (GameStory) + in-game commentary = LIVE & wired**
(LLM via the real `claude-column` edge fn, gated by `postGameColumnsEnabled`); **franchise season-news = DARK**
(Phase-2 flags default false; several adapters orphaned at emission). Reporter = NARRATOR (engines own the math).
DECISION: v1 = ship the live columns + commentary (already wired); franchise season-news = fast-follow (rides
the Phase-2 flag-flip + JK LLM browser sign-off — already JK-gated in the v1 plan).
**DRAFT-FLOW:** Full chain BUILT on the draft-lane (`claude/v1-draft-ui`): DraftSetup → Config Hub
(seats/GM/owner/archetypes/shill) → ScoutHire → MLB Auction → Farm Auction → End-of-Draft Staffing
(manager+reporter) → FranchiseSetup → **FREEZE inside `initializeFranchise`** → launch. FREEZE (the "4-number"
model, `draftMorale.ts`): per-player starting morale (slot-class ±15 + pay-class ±10, personality-adjusted,
neutral 50) + team fan-morale from payroll; writes settled salaries + morale baselines + draft-baseline
True-Value rows. BIG GAP = the MIDDLE of the flow (scout-hire/staffing/config) is UNMERGED to trunk (= the
JK-gated assembly). Per Q1, manager/reporter/scout assignment RELOCATES from post-draft Staffing → pre-draft
per-league team setup (the just-built Staffing screen refactors into the team-edit page). Small Qs: seat-name
persistence (local-state today, GM re-entered at staffing); IV-centered freeze range is an approximation of the
displayed range; snake-draft skips the freeze (v1 scope?).
**ROSTER ANALYSIS (in-season):** FOUR engines, mostly built: (A) **roster-readiness analyzer** (`analyzeRoster`,
wired into Team Hub Roster tab, AUTO-runs, READ-ONLY), (B) **lineup optimizer** (`optimizeLineup`, wired,
COMPARE/APPLY/RECALC/SET — APPLY is ACTIONABLE), (C) **in-game scout-move evaluator** (`evaluateScoutMove`,
wired into GameTracker manager recs), (D) **pool-feasibility** (`analyzePoolFeasibility`/`buildBestRoster`,
ORPHANED in-season). GAPS: no button-press entry (passive sidebar); call-up/send-down advice text-only (not
actionable); franchise analyzer is RATINGS-ONLY (stats hard-coded 'unavailable' — not performance-aware); 3
siloed surfaces (no unified Asst-GM view). DECISIONS (the genuine forks): (1) ACT (one-click execute moves)
vs stay READ-ONLY advisor; (2) a dedicated invoked "Assistant GM" surface vs the passive sidebar; (3)
performance-aware (feed season stats) vs ratings-only for v1; (4) surface pool-feasibility in-season.

**THREAD A — JK RULINGS (all resolved):**
- **In-season Assistant GM (roster analysis):** (1) **ADVISE by default, user clicks** — no auto-execute; the
  Asst GM recommends, the GM acts (one-click apply for the already-safe lineup case). (2) **DEDICATED invoked
  "Assistant GM" surface** (a button/screen), not the passive sidebar — matches Q7 "roster analysis on a button
  press." (3) **PERFORMANCE-AWARE** — feed the in-season analyzer real season stats (today hard-coded
  'unavailable'); needed for "your 2B is slumping" + the Q10 within-season learning (a real wire-up, core).
  (4) **SURFACE the pool-feasibility / "best roster you could field" engine in-season** (`analyzePoolFeasibility`/
  `buildBestRoster`, orphaned today) = the **evolve-your-archetype tool** ("you have the bodies for Power but
  you're 2 bats short").
- **Draft flow:** **persist seat names** as durable couch-coop GM identities (today throwaway local-state);
  **AUCTION-ONLY for v1** (snake-draft out of scope — it skips the freeze anyway).
- **Manager:** named entity + style, RELOCATED into the per-league team setup; mostly built; mWAR season
  roll-up + manual firing = known-dark (separate `experiment/manager-wpa-window` lane).
- **Beat reporter:** v1 = live post-game columns + in-game commentary (already wired); franchise season-news =
  fast-follow (rides the Phase-2 flag-flip + JK LLM browser sign-off, already JK-gated).

## STATUS (post Q1-Q12 + Thread A): the scout/Assistant-GM design is COMPREHENSIVE. Remaining = (b) the
## archetype TAXONOMY build (team + player menus, design+sim, Decision C) + (c) a clean SPEC consolidation.
## [(c) DONE → SCOUTING_INTELLIGENCE_SPEC.md (canonical, QC-verified). (b) foundation grounding in flight.]

### MOCK-DRAFT toggle (JK feature request) — LOW RISK, clean to build
JK: add a toggle at the start of every draft to mark it a MOCK draft — does NOT advance to a real franchise at
completion, keeps all league/team setups intact, lets the league reset + re-run a real or another mock draft.
**RISK ASSESSMENT (grounded): LOW.** Key facts:
- The draft does **NOT mutate the league/teams SETUP** (archetypes/identities) — grep of the auction hooks for
  `saveTeam`/`updateTeam`/`selectTeamArchetype` = EMPTY. It READS the setup. So "keeps setup intact" is FREE by
  construction (the draft can't corrupt it).
- A real draft's only durable writes are: (1) the drafted ROSTERS onto the team records
  (`commitCompletedMlb/FarmAuctionSessionToLeagueRosters` → `commitTeamRoster` → `saveTeamRoster`, the
  `teamRosters` store, `leagueBuilderAuctionPipeline.ts:143-216`), and (2) later the FRANCHISE
  (`initializeFranchise` + freeze, triggered from FranchiseSetup).
- A `deleteAuctionSession` primitive already EXISTS (`leagueBuilderStorage.ts:1815`) — the reset mechanism.
**DESIGN (clean): a mock draft writes ONLY to its own (deletable) draft session.** It plays out + shows the
result in-session, but the mock path SKIPS BOTH durable writes — NO `commitCompleted…ToLeagueRosters` and NO
franchise advance. Reset = `deleteAuctionSession` → league pristine → re-run real or mock. The ONE discipline:
gate BOTH durable writes behind the not-mock flag so nothing leaks. Great product fit (test your priorities/
archetype/strategy before committing — complements the Asst-GM). v1 feature.

### (b) ARCHETYPE TAXONOMY — foundation grounding (the "archetypal matrix")
**THE MATRIX AXES:** 8 raw ratings (POW/CON/SPD/FLD/ARM + VEL/JNK/ACC) → 11 cap-mod axes (pitching SPLIT by
role: RVEL/RJNK/RACC rotation + PVEL/PJNK/PACC bullpen) → **6 user-facing BANDS** (Power, Contact, Speed,
Defense[FLD+ARM], Rotation, Bullpen). A team archetype = a signed cap-shift over these; a player archetype =
a signed rating-bias template per position.
**TEAM ARCHETYPES — 15 locked, sim-balanced (±10%), but FAMILY-SKEWED:** Power×3, Speed×2, Small-ball×1,
**Pitching×6**, Defense×2, Balanced×1 (`historicalArchetypes.ts:50-126`). ⇒ visible GAP = offense/contact/
balanced THIN, pitching over-covered. (ALSO ~32 named workbook archetypes in `CAP_MODIFICATION_FRACTIONS` —
candidate material, but deep-nerf extremes break the band; the 15 are the balanced subset.) STRUCTURAL: TWO
divergent reps (`HistoricalArchetype.spec`×`ARCHETYPE_STAT_UNIT` vs `CAP_MODIFICATION_FRACTIONS.increase/
decrease`) — not unified; taxonomy should pick a source of truth.
**PLAYER ARCHETYPES — JK's weakness-map is ~80% THERE:** `ProspectArchetypeFamily` (`prospectScoutingDraftEngine.ts:435-553`)
= **18 per-position SIGNED rating-bias templates** (Slugger/Pure-Power/Power-Speed/Five-Tool/Speedster/
Slap-Hitter/Contact-Glove/Defensive-Wizard/Cannon-Corner/Project/Balanced + Power-Ace/Power-Reliever/Crafty-Ace/
Command-Artist/Pitchability/Pitching-Project). Already good-AND-bad + per-position (JK's "glove-only SS" ≈
Defensive-Wizard, "power-only RF" ≈ Pure-Power). BUT: (i) FORWARD ONLY (family→generate ratings) — NO reverse
classifier (player ratings→named type); (ii) locked inside the generator, not reusable; (iii) not
position-VALUE-aware (glove-only SS valuable / glove-only 1B worthless — in IV/POSITION_MULTIPLIERS,
unconnected); (iv) the player-facing `PlayerArchetype` field (12 reporter labels) is DECORATIVE, no logic.
**BALANCE HARNESS (runnable):** `runBalanceSim(pool, [...set, candidate], tier, 0.1)` builds each archetype's
best 22-man roster from the 440 IV-oracle pool, measures Σ kblIV deviation from the mean; **PASS = within ±10%
across juiced/standard/nerfed + rosterSize 22.** The edge it catches = luxury-tax dodged by building to a
raised-cap identity. CAVEAT: EV = total kblIV, NOT simulated wins (cross-check with L-SIM); heuristic builder;
single fixed pool. So "game-able = out" is MECHANICALLY TESTABLE — I can draft candidates + run them.
**TAXONOMY DESIGN BREAKS INTO:** (1) TEAM gap-fill — fill the family/band gaps (offense-heavy), draft candidates,
balance-test each, keep the ±10% ones; decide source-of-truth unification. (2) PLAYER weakness-map — LIFT System
C's 18 templates into a reusable, per-position, value-aware classifier menu + expand to comprehensive
good-AND-bad coverage per position + bench. Both are design+SIM loops (runnable harness).

**(b) JK RULINGS (taxonomy targets + approach):**
- **TEAM:** roughly EVEN coverage across the 6 flavors, **~20-24 total**; each archetype tied to **1-3 specific
  HISTORICAL teams** (exemplars, like the existing 15). Approach = **Captain proposes + balance-tests candidates,
  brings results to JK to rule.** (Gap to fill = offense/contact/speed/balanced — pitching is over-covered.)
- **PLAYER = a STRENGTHS-AND-WEAKNESSES map** (NOT only weaknesses): full-spectrum signed profiles the GM places
  strategically across the roster, one by one, as targets the Asst GM models from. The GM should leverage player
  archetypes that ALIGN with their TEAM archetype (matching BOTH its boosts AND its nerfs) to build realistic
  rosters. **KEY FEATURE: player archetypes that align with the selected team archetype STAND OUT** (highlighted)
  to show the GM which choices maximize value. Build = lift System C's 18 templates into a reusable, per-position,
  VALUE-AWARE classifier menu + expand to comprehensive coverage (a complex mechanical analysis no human can do
  in-head). Confirmed approach.

### (b) TEAM-archetype gap-fill — ROUND 1 (proposed + balance-tested; PENDING JK approval)
Captain drafted candidates for the offense/contact/speed/defense gaps + ran them through `runBalanceSim`
(the real harness, 440 IV-oracle pool, ±10% across juiced/standard/nerfed). **RESULT: 7 NEW archetypes PASS →
22 total, max deviation 8.7%, ZERO outliers all 3 tiers.** (NOT yet written to `historicalArchetypes.ts` —
pending JK.) The 7 (name · spec · band-flavor · proposed 1-3 exemplars):
1. **Hit 'Em Where They Ain't** `{CON:1.5,SPD:1,POW:-2}` — contact+speed slap — 1894 Orioles, 2001 Mariners (Ichiro)
2. **Toolsy Burners** `{POW:1,SPD:1.5,CON:-1,FLD:-1}` — power+speed five-tool — 2007 Phillies, 2021 Blue Jays
3. **Cannon Corps** `{ARM:2,FLD:1,POW:-1,SPD:-1}` — arm+defense (cannons) — 1971 Pirates (Clemente), 2002 Angels
4. **Gap-to-Gap** `{CON:1.5,POW:1,SPD:-1,ARM:-1}` — contact+power doubles — 2003 Red Sox, 1996 Indians
5. **Web Gems** `{FLD:2,ARM:1,POW:-1.5,CON:-0.5}` — pure defense, light bats — 2013–15 Royals, 1980 Cardinals
6. **Launch & Leather** `{POW:1.5,FLD:1,CON:-1,SPD:-1}` — power+defense (3TO + gloves) — 2016 Cubs, 2021 Astros
7. **No-Glove Offense** `{POW:1,CON:1,FLD:-1.5,ARM:-1.5}` — all bats, no defense — 1930 Phillies, 2000 Astros
**DROPPED: "Complete Club"** (balanced offense + leaky BULLPEN) — structurally fails (−20% standard: the
bullpen sacrifice is too costly at standard tier) AND redundant with Big Red Machine (balanced offense via a
ROTATION sacrifice). FINDING: a balanced/complete identity needs a ROTATION or DEFENSE sacrifice, not bullpen.
**COVERAGE now (22):** Power well-covered (Murderers'/Bomba/Bash + Toolsy/Gap/Launch/No-Glove), Contact
(Go-Go/Big Red + Hit-Em/Gap), Speed (Whiteyball/Billy + Hit-Em/Toolsy), Defense (Oriole/Shift + Cannon/Web
Gems/Launch), Rotation×3, Bullpen×3. Caveat: EV=ΣkblIV not sim-wins — recommend an L-SIM spot-check on the
strongest before locking. Exemplars/lore are flavor (JK can refine). NEXT: JK approves/refines → write to data
+ extend `historicalArchetypes.test` to 22; then the PLAYER strengths-and-weaknesses map.

### (b) TEAM-archetype gap-fill — ROUND 2 (JK rulings folded; 24 total, ALL PASS)
JK: (1) confirmed the vetting = total-team-VALUE via the IV engine (kblIV) balanced ±10% — approves for full
sim tests; wants DIVERSE exemplars (no franchise >2 ACROSS archetypes). (2) test a SPEED+ARM and a
SPEED+ARM+FIELDING archetype; and **POWER = SMB4's most-valued category → power-adders should sacrifice NEGATIVE
PITCHING** (realistic + proper counterweight). **ROUND 2 RESULT (runBalanceSim): all 9 candidates PASS → 24
total, maxDev 8.7%, ZERO outliers, all 3 tiers.** Final 9:
1. Hit 'Em Where They Ain't `{CON:1.5,SPD:1,POW:-2}` (contact+speed)
2. Toolsy Burners `{POW:1,SPD:1.5,ROT_ACC:-1,FLD:-1}` (power+speed, REVISED −rotation command)
3. Cannon Corps `{ARM:2,FLD:1,POW:-1,SPD:-1}` (arm+defense)
4. Gap-to-Gap `{CON:1.5,POW:1,ROT_ACC:-1,PEN_VEL:-1}` (contact+power doubles, REVISED −pitching)
5. Web Gems `{FLD:2,ARM:1,POW:-1.5,CON:-0.5}` (pure defense)
6. Launch & Leather `{POW:1.5,FLD:1,ROT_ACC:-1,PEN_ACC:-1}` (power+defense, REVISED −command both)
7. No-Glove Offense `{POW:1,CON:1,FLD:-1.5,ARM:-1.5}` (all bats no defense)
8. **Wheels & Cannons** `{SPD:1.5,ARM:1,POW:-2}` (NEW speed+arm)
9. **Rangy Defenders** `{SPD:1,ARM:1,FLD:1,POW:-1.5,CON:-0.5}` (NEW speed+arm+fielding)
**KEY FINDING: power+(−pitching command) BALANCES** — the value-calibrated units make a −1 ROT_ACC/PEN_ACC
sacrifice offset a +1 POW boost. So sluggers-can't-pitch is a clean, realistic, balanced template.
**DIVERSIFIED EXEMPLARS (≤2 archetypes/franchise):** 1 Hit'Em→2001 Mariners/1992 Brewers · 2 Toolsy→2007
Phillies/2021 Blue Jays · 3 Cannon Corps→1971 Pirates/2002 Angels · 4 Gap-to-Gap→2003 Red Sox/1996 Indians ·
5 Web Gems→1969 Mets/2021 Cardinals · 6 Launch&Leather→2016 Cubs/2021 Astros · 7 No-Glove→1930 Phillies/1996
Rockies · 8 Wheels&Cannons→1980 Expos/1991 Braves · 9 Rangy→2017 Diamondbacks/2010 Padres. **FLAG: pre-existing
RAYS appear in 3 archetypes** (Go-Go 2026 + Opener 2018 + Shift-Era 2008/10) — suggest trimming Go-Go's 2026 Rays.
**NEXT:** the VALUE-parity gate passed; a true WIN-RATE validation needs a head-to-head season-sim harness
(follow-up build) vs accepting value-parity + L-SIM regression. JK approves final 24 → write to data + extend test.
