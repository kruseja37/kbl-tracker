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
