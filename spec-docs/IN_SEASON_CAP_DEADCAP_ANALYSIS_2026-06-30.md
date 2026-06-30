# IN-SEASON CAP / DEAD-CAP — Reality + First-Principles Design + Exploit Analysis (2026-06-30)

> Triggered by JK's design question (2026-06-30). Produced by a 7-agent ground→design→exploit workflow
> (source-verified, evidence-strict). This is the seed for the **`ROSTER_MOVEMENT_GAME_THEORY_SPEC`** that
> is named in 3 docs but **does not exist as a file**. Feeds the scouting-intelligence "true cost" model
> ([[v1-rulings-2026-06-30]] Decisions A/B) and the living-season economy. NOTHING here is ratified — the
> forks in §5 get settled during the scout-spec interrogation.

## 1. WHAT'S ACTUALLY BUILT (verified, file:line)

A real in-season dead-cap mechanic **exists and is partially wired** (`isBuilt: PARTIAL`):

- **Send-down → dead money:** the demoted player's salary does NOT come off the books — **75% of it stays**
  as "dead money" (`DEAD_MONEY_RATE = 0.75`, `src/data/rosterEngineConstants.ts:242`; league-configurable
  presets 100% Hardline / 75% Standard / 50% Rebuilder). Computed + persisted to a per-player season ledger
  on every move (`franchiseRosterMovement.ts`, `rosterAnalyzer.ts:254-305`). It's a *salary-carries-at-a-rate*
  model, not a separate bolt-on penalty line.
- **Call-up → full salary** (100% active), EXCEPT a **first-time prospect call-up = 50% rookie scale**
  (`ROOKIE_SCALE_FACTOR = 0.50`, `salaryCalculator.ts:382`) for that season, repricing next offseason.
- **No hard in-season cap** (intentional, per `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md` §8.4): the tier
  cap is a SOFT payroll-expectation baseline; consequences are meant to flow through the
  payroll-percentile → win-expectation → fan-morale machinery.

**THE KEYSTONE GAP:** the aggregator that sums the ledger into a dead-money-adjusted team payroll
(`ledgerCapCharge`, `rosterAnalyzer.ts:245-252`) has **ZERO production consumers** — no screen displays it,
nothing enforces it, morale doesn't read it. **The penalty is charged and stored on every send-down but is
currently invisible and inert.** That single fact means every exploit in §4 works at 100% today.

## 2. JK's framing vs. the built model (two real mismatches)

JK described "a dead-cap **% penalty** on send-down PLUS take on the called-up player's **FULL** salary."
- **(a) Penalty-vs-carry (label only):** the engine *carries 75% of salary*, not a separate penalty line.
  Same economics. **Rec: keep the carry math, but DISPLAY it as a "Dead-cap hit: $X" so it reads as a penalty.**
- **(b) Call-up scale:** JK said "full"; the code gives first-time prospects 50%. **Rec: veterans called up =
  full salary; first-time prospect call-up = 50%.** This makes promote-from-within the cheap path and
  buy-a-veteran-patch the expensive path — the correct incentive.

## 3. WORKED EXAMPLE (the teeth)

Struggling **$4.0M vet** sent down; replacement called up:
- **Call up a journeyman vet ($1.5M):** dead money $3.0M (75% of $4M stays) + $1.5M active = **$4.5M**.
  You sent a guy DOWN and your cap went **UP $0.5M**. Demotion is a *double-pay* move, not cap relief.
- **Call up a first-time prospect (IV $2.0M × 50% = $1.0M):** $3.0M + $1.0M = **$4.0M** (net flat).
  Promoting from your own farm ≈ free; buying a patch is expensive. Right incentive.

**Dead money clears at offseason Phase 3** (within-season drag, no multi-year albatross). **Rec for v1:
clears at season end, no carry** (multi-year = complexity-without-fun).

## 4. FAN-MORALE COUPLING

**Yes — rising dead cap should hurt fan morale, but for the right reason:** fans resent *paying full price for
a player who isn't on the field* (visibly wasted money), not an accounting line. **A mechanic almost exactly
this shape is already built:** the **flashpoint/albatross decay tax** — an overpaid-underperformer who STAYS
rostered bleeds a small, compounding, capped per-game fan-morale tax (≈ −0.5/game → −3.0 cap). But it's
**flag-OFF and accumulate-only** (it never touches a live morale number — the "L5/L7 tooth" is missing; the
L-SIM summary's `flashpointTaxMagnitudes`/`albatross` is this accumulator).
**Rec:** make dead money a TRIGGER for that existing flashpoint tax, wire the accumulated tax to live fan
morale, and only above a threshold (small/normal dead money = free; hoarding a buried expensive mistake
compounds, capped, and stops the moment you resolve it).

## 5. THE OPEN FORKS FOR JK (settle during the scout-spec interrogation)

1. Penalty-vs-carry — *label as penalty, keep carry math.*
2. Call-up scale — *vets full, first-time prospects 50%.*
3. Dead-cap rate — *ship 75% default, expose the league preset.*
4. Carry across seasons — *no for v1 (clears at season end), with the late-season-dump caveat in §6.*
5. Morale magnitude/threshold — *above-threshold + team-aggregate (see Exploit 10).*
6. **Does release incur dead money?** — *YES (a buyout). The current free-release path is the biggest hole.*
7. **Reconcile the two send-down paths** — *YES, unify (the offseason finalize path is currently free).*
8. **One economy:** dead-cap "true cost" must share the SAME cost basis as the draft-time archetype tax
   (see Exploit 7), feeding ONE "remaining flexibility / true cost" number the scout shows at draft AND
   in-season — not two divergent computations.

## 6. EXPLOIT TABLE (adversarial — ranked by severity)

| # | Exploit | Why it breaks | Guardrail |
|---|---------|---------------|-----------|
| 1 | **Invisible cap** — nothing reads the dead-money total | send-down is free in all observable consequences (the master key) | **Wire the number to displayed payroll + the soft-tax/morale pipeline. Keystone — nothing else matters first.** |
| 2 | **Free release** — release writes NO dead-money row | release strictly dominates send-down for shedding an albatross (one click to neutralize) | Release must cost **≥ send-down** (ideally a full buyout) |
| 3 | **Finalize-flow free demotion** — the offseason send-down path has no dead-cap (only a morale hit; "payroll unchanged") | two doors, one taxed one free; min-maxers take the free one | **Exactly ONE send-down path**, routed through the ledger |
| 9 | **Demotion-as-cap-relief** — 75% dead + cheap rookie can be < the vet's full salary | demoting can LOWER your cap (inverts intent) | **Floor: a demotion can never reduce committed cap** for that spot |
| 5 | **Recall resets dead money** — recall flips deadMoney→active, resetting the compound | churn loop keeps the compounding morale tax from ever biting | Recall doesn't refund accrued dead money; compound tracks cumulative season churn; +cooldown |
| 7 | **Archetype arbitrage** — dead money charges FACE salary, not the archetype-inflated true cost | burying an off-archetype mistake is CHEAPER than an on-archetype one (backwards) | Dead money on off-archetype players charged on **archetype-adjusted true cost** (shared basis with the draft tax) |
| 10 | **Thousand-cuts threshold abuse** — keep each charge under the per-player morale threshold | total dead money huge, morale never reacts | Morale triggers on **team-AGGREGATE dead money as % of budget**, not only per-player albatross |
| 4 | **Season-boundary dump** — dead money prorates toward zero near season end | late-season demotions ≈ free | Lump/floor so dead money doesn't prorate to zero; consider partial carry of LARGE balances |
| 6 | Options-limit roster-spot laundering (rotate disposable bodies) | per-player option cap doesn't stop per-spot churn | Budget cost (Exploit 1 fix) self-limits; +team churn-frequency morale tax |
| 8 | Rookie-scale replacement churn (chain 50% first-call-ups) | "develop the farm" becomes "stash cheap bodies to launder cap" | Rookie scale = once-per-prospect/min farm tenure; cap simultaneous rookie-scale players |
| 11 | Stash-then-recall-for-playoffs (park salary in low-leverage games) | farm becomes a leverage-timed salary parking lot | Lump/floor + send-down→recall cooldown + no recall refund |
| 12 | Free-agent signing writes no ledger | another un-ledgered acquisition door | Every roster ADDITION writes an active ledger row at full salary |
| 13 | Flashpoint flag-off/accumulate-only | the morale deterrent is currently inert | Flip the flag + wire accumulated tax to live morale |

## 7. THE 5 NON-NEGOTIABLE GUARDRAILS

1. **Wire the number to consequences** (closes 1, 13) — the keystone; nothing else matters without it.
2. **No free exit** (closes 2, 3, 12) — every removal/addition routes through the ledger; release costs ≥ send-down; exactly one send-down path.
3. **Demotion can never reduce your cap** (closes 9, 8) — a floor; sending down always costs, never saves.
4. **Recall doesn't refund; churn compounds at the team level + cooldown** (closes 5, 6, 11); the 3-options limit stays as the hard backstop.
5. **Cost basis = team-specific TRUE cost; morale reacts to AGGREGATE dead money %** (closes 7, 10, 4).

## 8. STATUS LINE

Charge+persist: **BUILT** (in-season trade path). Display/enforce: **NOT BUILT** (the orphaned aggregator —
the v1-blocking wiring gap). Morale tooth: engine exists, **flag-off + accumulate-only**. JK's 2026-06-30
framing: **logged, not ratified**, partially conflicts on two knobs (call-up scale, penalty-vs-carry label).
**Net: mostly a surface-and-couple job on a working engine, + 3 product rulings (call-up scale, release
treatment, morale threshold) that close the exploit holes — the math is the easy part and it's largely done.**
The two most dangerous specific holes are **free release** and **demotion-as-cap-relief** — both let a
min-maxer turn the penalty into a net *benefit*, which is worse than no mechanic at all.
*(Note: §9 below REVISES the "demotion-as-cap-relief" reading per JK — demotion-to-save IS intended,
gated by morale, not a cap floor. Read §9 as authoritative where it conflicts.)*

## 9. JK CORRECTIONS (2026-06-30) — these SUPERSEDE §6/§7/§8 where they conflict

JK reviewed the exploit analysis and corrected three things. These are authoritative.

**(C-2) There is NO release / no free-agent pool — and that changes the "free exit" guardrail.**
There is no intended way to *release* a player. Player removal = **(a) send-down + call-up from your farm**,
or **(b) TRADE the player for another** — a trade **fully clears the outgoing player's salary** (he's gone,
the other team pays him; NO dead money) **and you fully take on the incoming player's salary.**
- The grounding found a `release` action wired in the OFFSEASON finalize flow (`FinalizeAdvanceFlow.tsx`,
  `releaseFranchisePhase11Player`). **This is a stray path JK did not intend → flag for removal/gating in v1.**
- Revised guardrail #2: there is no free in-season release to close; the exits are send-down (75% dead money)
  and trade (clean swap, no dead money). **The natural brake on "dump my albatross via trade" is the CPU
  counterparty's willingness** — no CPU team takes an overpaid underperformer without compensation (the trade
  AI is the guardrail, not a dead-money rule). **VERIFY (open):** confirm the trade path actually clears the
  outgoing salary fully + takes on the incoming fully today (vs. leaving residual dead money).

**(C-3) Demotion-to-save-money is INTENDED — REVERSES guardrail #3.** A GM *should* be able to save money by
sending an expensive underperformer (an albatross) down and calling up a cheaper rookie — **that is what
rebuilding looks like and a legitimate way to save money.** So: **drop the "demotion can never reduce your
cap" floor.** Demoting CAN lower your cap, by design. The brake is NOT the cap — it's **fan morale keyed to
the demoted player's value** (next). The 75% dead money still means it's not *free*, but a net cap saving on a
bad contract is a feature, not an exploit.

**(C-3 + C-5) The morale model is PLAYER-VALUE-DRIVEN, per move, on BOTH send-down and call-up.** Fan morale
reacts to *which* player moves, by that player's individual **fame** and **net true value (TV)**:
- **Send-down:** demote a player whose **net TV is NEGATIVE** (a bum) → fan morale **UP** (fans glad to see him
  benched); demote a player whose **net TV is POSITIVE** (a good/beloved player) → fan morale **DOWN**.
  Magnitude scales with the player's **fame** (demoting a famous star stings more than an unknown).
- **Call-up:** also triggers a morale reaction — **especially a "Fan Hopeful"-designated rookie → morale UP**
  (fans excited about the prospect).
- **PLUS the aggregate layer (from Exploit 10):** team-total dead money as a % of budget is a separate slow
  "you're wasting money" drag — so thousand-cuts distribution can't escape *all* morale consequence.
So morale has TWO coupled layers: **per-move (fame × net-TV of the specific player)** AND **aggregate (team
dead-money %)**. This replaces the simpler "above-threshold albatross tax only" framing.

**(C-4) The archetype arbitrage (Exploit 7), as a SIMPLE worked example for clarity:**
Your team is a **Bash Brothers** (power) build. You sign an off-archetype **finesse command pitcher**.
- His **face salary = $4M**, but because he's off your archetype, the luxury tax made his **true cost to YOU
  ≈ $7M** (you paid a ~$3M "wrong-fit" premium at the draft).
- He flops; you send him down. **Dead money today = 75% of FACE ($4M) = $3.0M.** The $3M archetype premium you
  paid just vanishes from the books.
- An **on-archetype $4M slugger** you bury → also $3.0M dead money. **Same cost** — even though the off-archetype
  guy was effectively a $7M commitment.
- **That's backwards:** the off-archetype mistake should be *more* expensive to get out of. **Fix:** charge dead
  money on the **archetype-adjusted true cost** (75% of $7M = $5.25M dead), not face. Then "this off-archetype
  guy isn't just expensive now, he's expensive to get *out* of later" becomes literally true — one unified cost
  basis shared between the draft-time tax and the in-season ledger.

**Net of the corrections:** removal is send-down-or-trade (no release); demotion-as-rebuilding is a real,
intended money-saving move gated by **player-value-keyed fan morale** (not a cap floor); and the cost basis
~~must be the archetype true cost~~ **[RETRACTED — see §10]**. These fold into the scouting-interrogation as
the in-season half of the ONE true-cost economy.

## 10. ARCHETYPE COST + EVOLUTION (RESOLVED 2026-06-30) — supersedes §6 Exploit-7 & §9 (C-4)

JK challenged the "charge dead-cap on archetype-inflated true cost" idea on double-counting grounds. A
4-lens verify (2 lenses returned decisive evidence) settled it. **JK is RIGHT; (C-4) is RETRACTED.**

**VERDICT — the off-archetype premium is ONE-TIME, paid at the auction; dead-cap stays on intrinsic salary.**
- The "luxury tax" is a **whole-roster rating-CONCENTRATION tax** (top-N ratings over a per-(group,stat) cap),
  NOT a per-player salary premium. Your archetype/`capIdentity` SHIFTS the cap thresholds (`shiftLuxuryCaps`,
  `leagueConstruction.ts:228-235`) so off-archetype concentration crosses caps sooner → more tax *while
  building*. In the auction it only ever appears as `projectedTax`, a held-back **bidding reserve** that
  shrinks your max bid (`rosterEngineConstants.ts:364-371`); the tax dollar is **never debited, never stored**
  — `finalizeSoldLot` stores ONLY the winning bid (`auctionStateMachine.ts:421-448`). It does **not recur** in
  the franchise (`luxuryTaxActive: false`, `franchiseSalaryLifecycle.ts:58`).
- A player's stored salary is **pure intrinsic value** (ratings/age, no archetype embed); two equal-talent
  players carry identical salary + identical dead money regardless of who drafted them (`franchiseSalary.ts`,
  `rosterAnalyzer.ts:249`). So there is **no "$7M true cost" on the books** to charge against.
- ⇒ Charging dead-cap on an archetype-inflated cost would **re-monetize a sunk one-time premium** — a second
  bill for something already paid. **Dead money = 75% of intrinsic face salary, no archetype adjustment.**
  The off-archetype penalty is correctly **front-loaded at the auction** (less headroom), not back-loaded at
  send-down. **"Expensive to get out of later" is RETRACTED** — off-archetype players are expensive to
  *acquire*, not to *move*.

**ARCHETYPE = declared-but-EVOLVABLE identity (separate for MLB & Farm). NO in-season drift penalty.**
It affects exactly two things: (1) auction bidding headroom (front-loaded, once), and (2) the **lens the scout
reasons through** in-season. Roster DRIFT from playing the game (ratings/traits/trades) is FREE — penalizing
it would punish playing. The only cost of changing is the natural churn (auction premiums on adds, ordinary
dead money on drops, trade value).

**DROPDOWN-EVOLUTION FEATURE (buildable on the existing analyzer):** GM clicks a TARGET archetype → the
roster analyzer (today diagnostic-only) returns a ranked **keep/add/drop/trade evolution plan** toward it,
each move annotated with real cost (auction headroom / dead money / trade return) + fan-morale swing.
Per-context (MLB vs Farm; Farm reasons over **scout grades/ranges**, not true ratings — the hidden-rating
gate). Build work: (a) analyzer accepts a *target* archetype param, (b) emits the costed/morale-annotated
plan, (c) dropdown UI + per-context wiring. No new penalty engine, no salary-shape change.

**THE 4 GUARDRAILS (devil's-advocate — #1 is load-bearing):**
1. **The declared archetype is LOCKED for the duration of the auction.** NON-NEGOTIABLE: if you could
   re-declare mid-auction you'd re-point to match each lot and dodge the concentration tax entirely → the
   front-loaded cost never gets paid → the whole "no dead-cap" verdict collapses (off-archetype becomes free
   everywhere). Tie this to the dead-cap rule in the spec so a future "allow mid-auction re-declare" change
   can't silently re-open the hole.
2. **Re-declaring the IDENTITY is a deliberate, cooldown-gated event** (per-season / every-N-games), not a
   live per-lot/per-week toggle — keeps commitment meaningful, stops weekly meta-rebuilds.
3. **Re-declaring fires a one-time fan-IDENTITY morale nod** (the team-level reaction §9 lacked), scaled to
   distance from the old identity AND fit to the actual roster: ratify where your roster already drifted →
   small/zero; whiplash contradiction of your roster → a fan grumble. Reuse the morale-swing calculator.
4. **The dropdown is a clearly-labeled PREVIEW lens** ("exploring as X — not committed") vs. a separate
   deliberate "Adopt this identity" commit. Free to look; costed to become — so the scout never silently
   degrades into a weekly meta-optimizer.

**THE CLEAN LINE:** *drift* (your roster diverging from a stable identity) is free and IS the game; *evolution*
(changing what your team SAYS it is) is a deliberate, felt event. **Open verify-items (build time):** confirm
the archetype field is mutable/persisted in-season; confirm the trade path clears outgoing salary cleanly;
confirm the analyzer can accept a target archetype. Feeds the scouting-intelligence interrogation.
