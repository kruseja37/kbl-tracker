# AUCTION_DRAFT_SPEC_V2.md — Mode-1 Auction Draft (REVISED DESIGN)

**Status:** AUTHORITATIVE revised design · ratified by JK 2026-06-21 (attended, post-AUTH-4 review).
**Supersedes:** `AUCTION_DRAFT_SPEC.md` (V1) for everything in §0 below. V1's device/hot-seat handoff
UX (single-iPad pass-the-device, banner-named holder, CPU-turns-never-handoff) still applies where
this doc does not override it. **Spec-first: no code is written from this doc until JK signs off.**
**Build status note:** the AUC-5.1 run (16 tickets, build-dark, branch `codex/mode1-v1`) implemented
V1. The §2 bidding/CPU/wallet/persistence/hot-seat-UI shells SURVIVE; the **value layer** and the
**nomination/resolution model** are REWRITTEN here (see §12 Rebuild Implications).

---

## §0. WHAT CHANGED FROM V1 (the reversals — read first)

| Area | V1 (built, now superseded) | V2 (this doc) |
|---|---|---|
| **Prospect value** | each prospect priced at its **true IV** (from ratings) → leaks the answer, guts scouting | scout gives a **recommended price range + 20–80 grade**; true ratings/IV **hidden** (used only to scale budgets + decide call-up reality) |
| **Nomination** | **GM-driven** (nominator on the clock picks who to put up); nomination-as-weapon | **ENGINE-driven**: players surface one-at-a-time, **random but weighted by hidden talent**; nomination-as-weapon removed |
| **Pass / re-entry** | passed twice → set aside; re-nominatable after a sale | **ONE CHANCE ONLY** — a surfaced player with **no bid is gone forever**; no re-nomination |
| **Archetype / team identity** | **inert** in the auction (`projectedTax: 0`, base caps) — worked in snake only | **wired back in**: a **gentle** marginal luxury tax (leeway, not a straitjacket); **two** archetypes per team (MLB + farm) |
| **MLB ↔ farm budget** | hard walled-off | **one-way valve**: unspent MLB budget → farm budget (× carryover %) |
| **Draft → morale** | none | **two** new systems: player morale (slot + over/underpay) and fan morale (payroll rank) |
| **GM** | none | a **GM identity** entity, separate from + above the manager |

Everything else from V1 that JK confirmed this session stands: auction is the v1 PRIMARY format
(default; with a setup picker for auction-vs-snake), both tiers auction in an auction league (R1),
MLB→farm is a user-driven link (not auto-advance), no draft trades in the auction (in-season only),
scout-privacy = **default covered, tap/click REVEALS** your own report (was long-press; changed to a
tap/click toggle 2026-07-08 — see §3.6).

---

## §1. THE DRAFT SPINE (one paragraph)

> Each GM picks **two team identities** (an MLB archetype and a farm archetype) and **hires a scout**
> whose specialties align with their farm targets. The engine then surfaces players **one at a time**,
> weighted toward better (hidden) talent early but never guaranteed. For each player your **scout gives
> you a money opinion** — a recommended **price range** and a **20–80 grade** — and (in the farm) flags
> whether he fills one of **your** roster holes. You **commit (bid) or lose him forever**. What you pay,
> relative to your scout's read, and **when** he surfaced, leaves a **morale fingerprint** on the player.
> Your MLB **archetype gently shapes what you can afford** (off-archetype concentration taxes you).
> **Unspent MLB money flows to the farm.** At the end, your **payroll rank** sets your fan-morale
> starting line, and the **two-number freeze** stamps each player's frozen value + settled salary into
> the franchise.

---

## §2. NOMINATION & RESOLUTION (engine-driven, one-chance)

### 2.1 Engine nomination (replaces GM nomination)
- The **engine** surfaces players one at a time from the available pool — there is no nominator on the
  clock. This applies to **both tiers** (MLB and farm).
- **Weighted reveal — the mechanism (SAME formula both tiers, different input):** at each step the
  engine draws the next player from the **remaining** pool with probability **∝ (value-percentile)^k**.
  - **The percentile input differs by tier:** **MLB** uses the **KNOWN/public IV percentile** (the same
    IV the advisory shows — there is NO hidden layer for MLB; rank by the real IV). **FARM** uses the
    **HIDDEN true-value percentile** (engine-only; GMs get only their scout's read; it doubles as a soft
    quality signal in the fog). Percentile is the player's FIXED value-rank in the full class (weights
    just renormalize over what remains as the pool drains).
  - `k` = the **front-load exponent** (sim-tunable §11, **per-tier**; default **~2–3**). `k=0` → pure
    uniform random; higher `k` → stronger players surface earlier more reliably. The mid default gives
    "stars *usually* early, but real upsets." (Plausible per-tier split: MLB slightly LOWER k — the
    public values already say who's good, so more order-randomness sharpens the gamble; farm HIGHER k —
    the weighting also serves as a hidden-quality hint. Sweep in RB-16.)
  - **Why weight MLB even though values are public:** the draw is **probabilistic, NOT a strict best→worst
    sort**, so even knowing every IV you don't know *when* your specific target lands (fight-now vs
    save-and-risk = the A4 gamble); AND it makes "drafted early" a real **commitment** signal for the §6
    morale-by-slot system (under k=0 "early" would be pure luck and the slot-morale would be meaningless).
  - **Seeded** (reproducible for save/resume + sim).
- **Determinism:** the surface order is seeded (reproducible for save/resume + sim).

### 2.2 One-chance resolution (replaces re-nomination)
- A surfaced player opens at the **reserve** (§4.4). Eligible teams bid (open-ascending, the V1 §2
  round-robin) or pass.
- **If at least one team bids:** highest bid wins → the player is rostered at that price (his **settled
  salary**), per the V1 RESOLVE rules.
- **If NO team bids:** the player is **permanently out of the draft** — he is gone for good, never
  re-surfaced. (This is the engagement-forcing rule: passivity now *costs* you the player.)
- **No re-nomination, no set-aside-then-return.** Each player is exactly one irreversible decision.
- **SUPERSEDED for the MLB tier (2026-07-07 reserve-price design, JK-approved):** with reserve pricing
  on, a no-bid MLB player is **recycled back into the pool for exactly one more pass at the same
  price** before he is truly gone (`MAX_RESERVE_RENOMINATION_PASSES`, `auctionStateMachine.ts`). Only
  a SECOND no-bid pass (or reserve pricing off) is permanently out. The UI now shows an **UNSOLD**
  stamp on the recycled first pass and reserves **GONE** for the truly permanent case (2026-07-08 UX
  fix — the overlay previously said "gone for good" on the recycled pass too, which was false). The
  **farm tier is unaffected and remains strict one-chance** (it never enables reserve pricing).

### 2.3 Roster-fill guarantee
- The pool carries a **surplus** of players (more than `teams × slots`), so even with some going out
  undrafted, enough remain to fill every roster (22 MLB / 10 farm).
- The §7.5 **solvency cap** (§4.3) guarantees the *money* side — a GM can always afford minimum-salary
  fillers for remaining slots. The engine MUST never strand a GM with an unfillable roster; if the
  surplus + solvency ever can't guarantee it, the engine surfaces a cheap filler the GM can claim.
- **Open design check (§13):** confirm the surplus multiplier + the late-draft behavior when a GM has
  open slots but few players left (a guaranteed-fillable tail).

### 2.4 Device / hot-seat UX (unchanged from V1)
The single-iPad pass-the-device model, the persistent "Now: [TEAM] — [action]" banner, CPU turns never
handing off, and the §2.3 per-bidder turn view all still apply — only **who decides the next player**
changed (engine, not a nominator).

---

## §3. VALUE & SCOUTING (the crux fix)

### 3.1 The scout is the value oracle (not the engine)
- The auction **never shows a prospect's true value or ratings.** Instead, the **GM's hired scout** gives:
  - a **recommended price range** `[$low, $high]` — the scout's money opinion of the player's worth, and
  - a **20–80 overall grade** (scouting-tradition scale; an overall sitting on the 20–80 curve, not a
    letter). More granular + more "war room" than letters.
- **Width = uncertainty:** a better/more-confident scout (and one whose **specialty matches** the
  player's position) gives a **tighter** range + higher confidence; a poor or off-specialty scout gives
  a **wide** range + low confidence. (Mechanic = the existing scout-accuracy → range-width; the §3.2
  V1 `perceivedValueRange` math is reused but anchored on the scout's price opinion, not true IV.)
- **Jitter:** the displayed point-estimate is seeded-jittered off the true center so a GM can't infer
  truth from the midpoint (V1 §3.2 — kept).
- GMs bid **against their scout's range** — overpaying or underpaying is measured vs. *that* range.

### 3.2 True value stays hidden; revealed at call-up
- The prospect's true ratings/IV exist (generated) but are used ONLY to: (a) **scale budgets + the
  class-strength curve** behind the scenes (§4.1, never shown), and (b) decide **call-up reality** —
  when a prospect is called up to the MLB roster, his true ratings reveal (§7.4), and **busts/steals
  emerge** (a kid drafted high may play low; a late cheap pick may be a star). This is the payoff of
  scouting being imperfect.

### 3.3 Class-strength scale (behind the scenes)
- The draft **class** has a total hidden talent value (sum of true IVs). This sets the **budget scale**
  (how rich the farm wallet is — a loaded class supports richer budgets) and the **reserve floor**
  baseline. It is **never** exposed as a per-player number. (This is the "draft slot values based on
  strength of the class" idea — realized as a class-calibrated *budget + reserve scale*, with per-player
  worth living entirely in the scout's private range.)

### 3.4 Positions visible, ratings hidden (unchanged, §9.E)
Name, **primary + secondary position**, handedness SHOWN. Individual ratings + true IV + true grade
HIDDEN. The only value signal is the scout's range + 20–80 grade.

### 3.5 Scout as the bridge between rosters (NEW, A4)
- After the MLB auction, the scout reads the GM's **filled MLB roster**, identifies **positional/role
  holes**, weights them by the GM's **farm archetype** (§4.2) — a power-identity team's unfilled power
  slot "screams louder" — and surfaces **"fill these in the farm"** guidance as players come up.
- This is *why* scout specialties + the farm archetype matter: a GM aligns their **scout hiring** to
  the **farm archetype** to get sharper reads on the prospect types they're targeting.
- **⚠ HOLE-DETECTION = REUSE the (already-built, already-wired) Roster Analyzer Engine — do NOT build a
  parallel one (RB-9).** `src/engines/rosterAnalyzerEngine.ts` (+ `rosterAnalyzer.ts` + the Builder/
  Franchise adapters) is LIVE in `TeamHubContent.tsx` + `LeagueBuilderRosters.tsx`. It already produces
  position-coverage/depth/lineup-rotation-bullpen-gap findings + team-profile (via `smb4TeamProfileEngine`)
  strengths/weaknesses, evidence-backed + trust-scored + read-only, and is **already scout-aware**
  (`scoutConfidence` on farm players, farm/call-up `MoveRecommendation`). Spec:
  `ROSTER_ANALYZER_RECOMMENDATION_ENGINE_SPEC.md` (`RosterAnalyzerSurface` is extensible — add a
  `draft_prep` surface + a thin draft adapter that feeds the GM's **in-progress** MLB+farm roster).
- **Division of labor:** the Roster Analyzer answers "what does MY roster NEED" (KNOWN — own roster);
  the SCOUT layer (§3.1–3.3) answers "what is THIS PROSPECT worth" (OBSCURED). The scout-as-bridge is
  the JOIN — analyzer finds the holes (weighted by the farm-archetype team profile), the scout values
  the fillers. Keeping the draft on the SAME engine keeps its advice consistent with the season-long
  team-hub advice.

### 3.6 Scout-privacy on the shared device (§6.1, corrected)
- **Default COVERED.** A GM **taps/clicks to REVEAL** their own scout report, and **taps/clicks again to
  re-cover it** (JK ruling 2026-07-08 — was long-press/hold-to-reveal; the hold gesture glitched on the
  auction floor because the cover control's own CSS hid itself the instant it revealed, which the
  browser read as an accidental pointer-release and self-cancelled). Rationale: the iPad passes around
  the room; if reports were shown by default, a rival sees your high-confidence A-grade on a player
  their off-specialty scout rates "B–D low confidence" → free scouting that defeats per-team scouts.
  Covered-by-default protects your scout's edge.
- Scope = **scout reports only** (the price range + grade + confidence). Budgets, your max-bid, roster
  board stay visible. Applies to the farm + the scouting/prep phase. MLB players are public — no cover.

---

### 3.7 Player personality model — THREE DISTINCT axes (NEW, JK 2026-06-21)
The specs/code have **conflated** these (verified: `PERSONALITY_BASELINES` uses non-canonical names;
stock players' `personality` is `undefined`; hidden modifiers are backfilled only at franchise init).
Pin them as **three independent axes** per player:

| Axis | Values | Visibility | Role |
|---|---|---|---|
| **1. Primary personality** | exactly ONE of 7: **egotistical, competitive, tough, droopy, timid, jolly, relaxed** | **VISIBLE** (draft + franchise) | morale **VOLATILITY / reactiveness** — how swingy a player's morale will be + relationship dynamics; GMs read it to gauge risk |
| **2. Hidden modifiers** | ALL 4, at random levels: **ambition, loyalty, charisma, resilience** (0–100) | **HIDDEN FOREVER** (entire draft + franchise) | unpredictable morale-fluctuation flavor over time. The ONLY GM signal is the **CAPTAIN reveal** = the player with the highest **loyalty+charisma** composite on the team — and even then NO specifics + NO teammate comparisons (you just know your composite is below the captain's) |
| **3. Chemistry** | exactly ONE of 5: **competitive, crafty, scholarly, spirited, disciplined** | **VISIBLE** (draft + franchise) | drives **TRAIT POTENCY** (chemistry-fit → potency tier L1/L2/L3 → trait-value multiplier); GMs + the scout/roster-analyzer use the team's chemistry **mix** to value chemistry-fit |

> ⚠ "competitive" is a value in BOTH axis 1 AND axis 3 — they are INDEPENDENT (a player can be
> personality=competitive AND chemistry=crafty). This is the exact conflation the model fixes.

**Assignment / timing (THE FIX):** all KBL-flavor axes are assigned **FRESH, before the draft** — NOT
inherited from the SMB4 console default, so GMs can't pre-know a player from the game:
- **Prospects:** at prospect generation (already done — personality + modifiers + chemistry, seeded).
- **ALL MLB-pool players — RESOLVED (JK 2026-06-21):** the MLB pool is **HETEROGENEOUS** (the 440 stock
  set is only ONE construction option; real drafts mix stock + user-created players, analyzed *as a whole*
  for IVs/salary-tiers). So **regenerate ALL THREE axes for every MLB-pool player before the draft** —
  personality (1) + hidden modifiers (2) + **chemistry (3)** — seeded deterministically. **Chemistry is
  REGENERATED and REBALANCED to match the 440-base-pool's chemistry distribution** (the base pool gets the
  balance right; some chemistry types are more valuable than others), computed in the **same pass** as the
  personality regen. [Supersedes the earlier "keep SMB4 chemistry" — that assumed a pure-stock pool.]
- This MOVES hidden-modifier creation from the **franchise-init backfill**
  (`generateFranchiseHiddenModifierBackfill`) to **PRE-DRAFT**, so all three axes exist + are correct
  during the draft AND persist unchanged into Mode 2 (the franchise-init backfill becomes a no-op safety net).

**Scout / roster-analyzer use of chemistry (feeds §3.5):** because chemistry is VISIBLE + drives trait
potency, the scout's price recommendation factors **chemistry-FIT** — a prospect whose chemistry + traits
RAISE the team's overall potency is worth paying MORE for; a poor fit, LESS. Leverages the existing
potency tier (`ivEngine` `PotencyTier` L1/L2/L3). **[VERIFY/BUILD: the chemistry-MIX → potency-TIER rule
— the tier is consumed by `computeIV`, but the fit→tier computation is a "downstream league-context
concern" that may be net-new; ground its spec at build.]**

**Chemistry BALANCE across the WHOLE draft pool — TARGET = the 440-base-pool's distribution (JK 2026-06-21):**
the 440-base-pool's chemistry mix is the canonical balanced TARGET (the base pool "gets it right"; some
chemistry types are more valuable than others). BOTH (a) the regenerated MLB-pool chemistry (above) and
(b) the generated FARM prospects must be **rebalanced to MATCH that 440-target distribution** (a generation/
regen constraint + validation pass, like the §3.2-grade + §3.3-position distributions). Rationale: chemistry
drives trait potency, so a lopsided pool would let every team cheaply stack one type to Level 3 while being
unable to reach Level 2 in others — killing the "pick this player *for his chemistry*" decision. **One pass
computes the 440-target distribution, then regenerates MLB-pool + farm chemistry to match it, alongside the
personality regen.**

**MEASURED — grounded at source 2026-06-21 (`src/data/playerDatabase.ts` PLAYERS record; 440 = 506 entries
minus 66 free agents; adversarially re-verified):** chemistry IS fully populated on every stock player (3-letter
codes SPI/DIS/CMP/SCH/CRA — NOT the `undefined`-personality situation), so the target is real measurable data.
**440 distribution: SPI 21.1% · DIS 20.0% · CMP 20.0% · SCH 20.0% · CRA 18.9%** — i.e. essentially **UNIFORM**
(≈20% each; spirited slightly high, crafty slightly low). ⇒ matching the 440 = roughly-EVEN availability =
exactly the "all chemistry strategies buildable" balance the requirement wanted. The "some types more valuable"
value comes from the **POTENCY** mechanic, NOT scarcity (the counts are ~equal). **JK RESOLVED 2026-06-21:
honor the near-uniform 440 shape EXACTLY — target = SPI 21 / DIS 20 / CMP 20 / SCH 20 / CRA 19 (do NOT snap
to flat 20). Enforce as a ±tolerance band around those exact shares.**
**Build caveats for RB-0:** (a) compute the target from the **3-letter `PLAYERS` record**, NOT the separate
Title-Case `ALL_MLB_PLAYERS` in `src/data/players/mlb/`; (b) tighten `PlayerData.chemistry` from loose `string`
(`:66`) to the 5-literal union; (c) centralize ONE canonical form (player 3-letter ↔ team full-word ↔ V2
lowercase words) — don't re-derive per call site; (d) decide FA treatment (the 66 free agents carry full-word
chemistry, excluded from the 440 target).

**COMPETITIVE morale row — confirmed-correct (grounded 2026-06-21):** already `positiveSelfMultiplier 1.15` /
`negativeSelfMultiplier 1.05` in `MORALE_TUNING.personality` — boosted by success, hurt by failure, exactly as
intended; a milder EGOTISTICAL (1.25/1.15, fanSens 1.5). NO change needed; optional flavor nudge = negativeSelf
1.05→1.10 and/or fanSens 1.15→1.25 (erodes the deliberate COMPETITIVE-vs-EGOTISTICAL spacing).

**Primary personality + hidden modifiers in morale — ALREADY BUILT in the core engine (CORRECTED at source
2026-06-21 — `masterMoraleMatrix.composeMoraleConsequence`, `src/engines/masterMoraleMatrix.ts`; L3-era,
build-dark behind D13). NOT net-new.** Per morale EVENT, the engine resolves the consequence from the
player's personality + hidden modifiers + current morales:
- **Personality (canonical 7) = the reactivity archetype** — `MORALE_TUNING.personality[p]` gives each a
  `positiveSelfMultiplier`/`negativeSelfMultiplier` (how hard YOUR morale swings on good vs bad events),
  `positive`/`negativeFanMultiplier`, and `fanMoraleSensitivity`. Real values = JK's intuition exactly:
  **EGOTISTICAL** 1.25/1.15 + fanSens **1.5** (reacts huge); **RELAXED** 0.85/0.75 + 0.5 (shrugs);
  **DROOPY** 0.8/**1.25**, **TIMID** 0.9/**1.2** (crushed by bad — vulnerable); **TOUGH** 1.0/**0.8**
  (resists adversity); **JOLLY** 1.1/0.9; **COMPETITIVE** 1.15/1.05.
- **Hidden modifiers = the unseen magnitude + spread** — `MORALE_TUNING.modifierMultipliers`: **ambition**
  amplifies UP-swings, **resilience** dampens DOWN-swings, **charisma** scales how much this player's event
  SPREADS to OTHER players (contagion/`otherTouched`), **loyalty** scales the fan→player link.
- **Relationship contagion is built** — an event ripples to teammates via `otherTouched × relation
  (teammate 1 / captain 2 / young 1.5 / clubhouse 1.25) × charisma`. That IS "droopy bullied by a tough teammate."
- **Legacy names already reconciled** — `LEGACY_PERSONALITY_RECONCILIATION` maps GRUMPY→DROOPY, FIERY→
  COMPETITIVE, SPIRITED→JOLLY, DISCIPLINED/CRAFTY/GRITTY→TOUGH, etc. **The old `playerMorale.ts
  PERSONALITY_BASELINES` is DEAD LEGACY — do NOT "fix" it; the matrix is canonical.**
⇒ **The morale machinery is BUILT** (personality reactivity + modifier roles + contagion). The figures JK
can tune = `MORALE_TUNING`. **RB-5's job is NOT to build reactivity** — it is to define the DRAFT as morale
EVENTS (e.g. a "drafted-early/high" event, an "overpaid/underpaid" event) fed through
`composeMoraleConsequence` with the player's personality+modifiers, then seed the result as the starting
morale at the freeze (§10).

## §4. BUDGETS & ARCHETYPE

### 4.1 Self-scaling budgets
- The **farm wallet** self-calibrates over the (hidden) class talent (V1 §5.2 cap formula), so a
  stronger class → richer farm budgets. The "nerf vs MLB" is **emergent** (prospects are weaker than
  MLB stock → smaller derived cap) — no separate dial. (Confirmed this session.)
- The **MLB wallet** is the tier cap, archetype-shifted (§4.2).

### 4.2 Two archetypes per team (NEW)
- A GM chooses an **MLB archetype** and a **farm archetype** at setup — **independently** (e.g.
  power+speed MLB, defense+pitching farm). Each is a band-priority identity (`composeIdentity`).
- **MLB archetype → affordability (luxury tax):** wire the marginal luxury tax back into the auction
  (V1 stubbed `projectedTax: 0`). The MLB archetype **shifts the luxury caps** (`shiftLuxuryCaps`):
  **more** cap room in your priority bands, **less** off-band. Bidding **on-archetype** stays cheap;
  **over-concentrating off-archetype** taxes you (via `auctionMaxBid`'s `projectedTax`, computed per
  bid like the snake's `pickMarginalTax`). **⚠ LEEWAY NOT A STRAITJACKET (JK):** the tax ramps
  **gently + convexly** — a single off-archetype favorite costs only slightly more; only **heavy**
  off-archetype loading bites. The shifted caps must NEVER be so tight that one off-fit pick breaks a
  GM. The vision is "more room here, less there," never "draft these two types or go broke." (Tax
  curve shape = sim-tunable, §11; calibrate so straying is a *cost*, not a *wall*.)
- **Farm archetype → scout priorities (NOT a luxury tax):** the farm uses scout-perceived value, not
  band salaries, so the farm archetype instead **tilts the scout's hole-prioritization + valuation**
  (§3.5) — it raises the priority/recommended-pay for prospects matching your farm identity. The farm
  wallet itself stays archetype-neutral.
- **⚠ SOURCE OF TRUTH for the archetype machinery (RB-3 grounds HERE — the design is RATIFIED, not new):**
  - **Algorithm** = `composeIdentity` — `IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §6.3` (band-priority →
    greedy mod-stack pick) + the **ratified ruling DECISIONS_LOG §520 (JK 2026-06-14):** decreases are
    OPTIONAL, point-allocation input, user freely edits the ≤2-increase/≤2-decrease stack. The A6/ID-9
    open flag is CLOSED. Code: `leagueConstruction.ts` `composeIdentity`/`identityCapShift`/`shiftLuxuryCaps`.
  - **The "leeway not a wall" tax IS the already-ratified D13 design** (`IV_ENGINE §5.3` / D13): the luxury
    tax is a **soft convex BUDGET-DRAIN, never a hard wall** — verbatim "20 over ≈ pocket change, 200 over
    ≈ a bullpen … no single optimal archetype." RB-3 does NOT redesign the tax — it **wires the ratified
    tax into the auction** (the auction stubbed `projectedTax:0`; compute the per-bid marginal tax like
    the snake's `pickMarginalTax`). **Acceptance gate already exists:** §5.3 **EV-flatness** — no composed
    identity's best roster may deviate >10% from the cross-identity mean (T3 verified it PASSES at tierCap).
  - **Cap + modification DATA** = `T3_POOL_ANALYSIS.md §R4` (XBL-workbook-derived) → `tierParams.ts`
    (`LUXURY_CAP_TABLES`, `CAP_MODIFICATION_FRACTIONS` [42 deltas], `DISABLED_LUXURY_ROWS` now empty).
  - **NET-NEW in V2 = the DUAL identity only.** All the above is SINGLE-identity-per-team; RB-3's new work
    is splitting it into independent **MLB archetype** (→ the wired luxury tax) + **farm archetype** (→ the
    §3.5 scout-priority tilt). The machinery is reused twice, not reinvented.

### 4.3 Solvency cap (roster-fill guarantee) — unchanged
`auctionMaxBid = remainingBudget − (slotsRemaining − 1) × minSalary − projectedTax` ceiling guarantees
a GM can always fill remaining slots with minimum-salary players. **This is NOT the bid floor** — it's
the ceiling that protects roster-fill. (Now `projectedTax` carries the §4.2 archetype tax for MLB.)

### 4.4 Reserve floor + the min-bid button
- The **reserve** is the opening/minimum price a player can be won at — the "how cheap can he go"
  lever, **distinct** from the solvency cap. Low reserve = bargains possible (the savvy-value upside);
  high reserve = orderly, less stealing.
- **Min-bid button:** a surfaced player → a "**Bid Minimum**" control is active → a GM hits it (open at
  reserve), raises, or passes. The minimum is claimable when you are the standing bidder; once outbid,
  you raise (within solvency) or you're out.
- **Reserve level = START LOW (JK ruling 2026-06-21).** Low floors give the back-and-forth bidding we
  want; sim can raise them if order suffers. Mechanism (the "50/70" are NOT a tier split — they're the
  endpoints of a percentile curve):
  - **MLB:** keep the **percentile curve** `reservePriceCurve` (**0.5 at the pool bottom → 0.7 at the
    top**, × the player's **public IV**) — a scrub opens at ~50% of his IV (bargain room), a star at
    ~70% (less room to steal the best).
  - **FARM:** a **FLAT low floor**, the SAME opening for every prospect (e.g. a small fraction of the
    class-average value, or the farm minimum salary) — because a per-prospect % would **leak the hidden
    rank**. All differentiation comes from bidding + each GM's scout range.
  - Both are **sim-tunable** (§11); sweep upward only if the TV economy juices (systemic steals).

### 4.5 MLB → farm budget carryover (one-way valve, NEW)
- **Unspent MLB budget → farm budget**, × a **carryover %** (default **50%**, sim-tunable §11).
- **One-directional, timing-enforced:** the farm runs *after* MLB, so there is no farm money to raid
  during the MLB draft — "save MLB budget for the farm" is the intended strategy, not an exploit, and
  the reverse (farm → MLB) is structurally impossible.
- **Intended consequence:** a GM who blows their MLB budget enters the farm with little → forced to
  draft scouted-scrubs → loses meaningful call-ups/send-downs all season. A real strategic tradeoff
  ("build through the farm" vs "win now"). The 50% keeps an MLB-tank from *fully* funding a farm
  super-team. (Anti-tank also reinforced by the §7 payroll fan-morale curve.)

---

## §5. CPU SHILLS vs CPU-CONTROLLED TEAMS (separate the two)

- **CPU shills = pure bid pressure, NOT franchise teams.** They participate in bidding to push prices
  toward fair value (preventing systemic steals — see §6 juicing note) but are **excluded from the
  league**: their won players **dissolve back to the pool** (§7.6 "exclude from league" — specced in
  V1, **never built**; `excludeFromLeague` is currently a no-op flag). They make the room competitive
  + unpredictable without becoming playable teams. **Default mode.**
- **CPU-controlled teams = real franchise teams the CPU drafts for** — an **explicit opt-in** for a GM
  who wants AI opponents in the season. Their won players DO fill a real roster + enter the franchise.
- **Today these are conflated** (a "shill" is currently the last N league teams, CPU-controlled, and
  their players would enter the franchise). The rebuild must (a) separate the two concepts in config +
  the engine, and (b) implement the **dissolve-to-pool** for true shills.
- **Tuning:** the shill valuation/interest curve + sniper/spender/zealot personalities are real
  tunable constants (hardcoded defaults today), **sim-tunable** (§11); personalities are seeded-random
  at setup. CPU teams (opt-in) use the same valuation engine.

---

## §6. PLAYER MORALE FROM THE DRAFT (NEW)

> The juicing note, captured: the *talent* in the league is fixed (the same players enter regardless of
> price); what cheap prices juice is the **TV/morale economy** (everyone "overperforms their salary").
> The defenses, in order: **shills** (push to fair value), the **one-chance structure** (kills passive
> passing), and **budget calibration** — *before* reaching for a high reserve floor.

Each drafted player gets a one-time morale adjustment off the neutral 50, from two interacting signals:

- **Slot signal (WHEN he surfaced/was won):** **early** = "they committed budget to me when they could
  have waited" → **boost**; **late** = "I almost went undrafted" → **penalty**; **middle** = neutral.
  The one-chance structure is what makes "taken early" mean *commitment* (passing = losing him forever,
  so spending on him early is a real statement).
- **Pay signal (price vs the scout's range):** paid **above** the range = "they wanted me" → boost;
  **below** = "afterthought" → penalty.
- **Interaction (JK's framing):** **early dominates** — a cheap-but-early pick still gets the commitment
  boost; a **late** pick only claws back the slot penalty if **overpaid**; **late + underpaid = the
  morale basement**.
- **Personality-tilted — using BOTH axes (§3.7):** the **VISIBLE primary personality** (axis 1) sets the
  morale's reactiveness/volatility the GM can ANTICIPATE (egotistical reacts hard to being unwanted;
  relaxed shrugs); the **HIDDEN modifiers** (axis 2 — ambition/resilience) add the swing the GM CANNOT
  see (pure flavor). Both are assigned **before the draft** (RB-0), so they exist when the morale is
  computed at the freeze (§10).
- **Feeds the TV loop:** the underpaid-late kid starts **below 50** ("they didn't want me") but has an
  easy path to overperform his cheap salary → high TV → in-season morale rebound. A genuine arc.
- **Starting magnitudes (tune in playtest):** slot ≈ **±15**, pay ≈ **±10**; basement (late+underpaid)
  well below 50; ceiling (early+overpaid) well above. (Exact deltas = §13/§11.)

---

## §7. FAN MORALE FROM PAYROLL (NEW)

- **One-time set at draft-end**, **overcome or lost by in-season performance** (it's a starting line,
  not a verdict).
- **Payroll RANK vs the median:** rank teams by total payroll at draft conclusion. **Median = neutral.**
  Deviation from the median **hurts** fan morale.
- **Exponential past thresholds, BOTH ends:** the penalty ramps **exponentially** once a team passes a
  threshold off the median — punishing **all-in** (high payroll → win-now pressure → **relocation
  risk**, the **high side gets 2×**) AND **full-rebuild/tank** (low payroll → **anti-tank**
  disincentive). Net: it nudges everyone toward sane spending before a single game is played.
- **Thresholds = percentiles off the median** (e.g. ramp begins past the 75th/25th payroll percentile),
  curve steepness = sim-tunable (§11/§13).

---

## §8. GM IDENTITY (NEW — separate from the manager)

- A **GM** is a distinct entity, structured **parallel to the manager profile** (name, tenure, history),
  but sits **ABOVE** the manager: the GM owns **roster/draft** decisions and **can fire the manager**;
  the manager owns **in-game** decisions and feels tied to gameplay. **Do NOT merge the roles.**
- The **user IS the GM** (first-person) — the user exists in the ecosystem with a **name** (their own or
  chosen). One GM per team.
- **Reporter integration:** the reporter refers to the **GM by name** on roster/draft/team-building
  moves ("GM [name] reached for…") and the **manager by name** on in-game decisions — two distinct
  voices.

---

## §9. UX

- **Roster visibility board (hard requirement, A4):** a persistent, glanceable view of the GM's **MLB +
  farm rosters with gaps highlighted** during the draft — no paper-tracking. With random/one-chance
  nomination a GM can't pre-plan perfectly, so the board + the scout's hole-guidance (§3.5) are what
  make reacting to gaps fair instead of frustrating. **The gap-highlighting is the Roster Analyzer
  Engine's output** (§3.5 — reuse, don't rebuild), so the draft board matches the season-long team-hub
  roster view.
- **Guided first-person experience (N4):** the reporter/"machine" walks the GM through setup → scouting
  → MLB auction → farm auction → freeze. **Start LIGHT** — a contextual "coach" that drops a line at
  each phase transition — and **deepen** toward a fuller tutorial only if it earns its keep.
- **Format picker (setup):** the league setup lets the GM choose **auction (default) vs snake**, applied
  league-wide to both tiers (R1). (`draftFormat` field built; the picker UI is this item.)
- **MLB → farm:** a user-driven "Proceed to Farm Auction →" link at MLB completion (not auto-advance).

---

## §10. THE FREEZE → MODE 2 (now a FOUR-number bridge — JK 2026-06-21)

- MLB auction fills 22 → farm auction fills 10 → at the **end of the whole draft**, the freeze fires at
  **franchise-init checkpoint-0** (the Mode-1→Mode-2 bridge) and stamps, per rostered player + per team:
  1. **trueValue** (the frozen IV — exists in V1).
  2. **settledSalary** (the auction winning bid — additive field, AUC-5.2).
  3. **starting PLAYER morale** (the §6 draft-derived value — slot + over/underpay, personality-tilted).
  4. **starting FAN morale** (the §7 payroll-rank value).
- **⚠ THE PAYOFF (JK):** Mode 2 (the franchise season) must **seed its starting morale from #3/#4 — NOT
  from the default starter-morale settings.** Player morale starts at the draft-derived value (e.g. the
  underpaid-late kid opens *below* 50, then the TV loop evolves it); team fan morale starts at the
  payroll-rank value. Without this carry, the entire draft "fingerprint" evaporates on day 1 of the
  season. The franchise-init morale seed reads the freeze and overrides the defaults.
- **Build:** AUC-5.2 stamps trueValue+settledSalary; the morale-capture (#3/#4 → freeze) + the
  franchise-init morale-seed (freeze → Mode-2 starting morale) ride with the §6/§7 morale tickets (see
  the rebuild plan). All are careful saved-shape / franchise-bridge work (trackerDb + franchiseInitializer).

---

## §11. SIM-TUNABLES (the dials we sweep before locking)

| Dial | Default | Notes |
|---|---|---|
| MLB→farm carryover % | 50% | §4.5 — sweep 30/50/70 |
| Reserve floor | low (0.5–0.7×) | §4.4 — sweep up to 0.8–0.9; pick the anti-juicing sweet spot |
| Nomination talent-weighting `k` (PER-TIER) | ~2–3 each | §2.1 — `∝ percentile^k`; MLB input = public IV pctile, farm = hidden true-value pctile; consider MLB lower-k / farm higher-k |
| Archetype luxury-tax curve | gentle/convex | §4.2 — must stay "cost not wall" |
| Shill interest curve + personality profiles | conservative (V1) | §5 |
| Player-morale magnitudes | slot ±15 / pay ±10 | §6 |
| Fan-morale payroll curve | exp past 75th/25th pctile, high-side 2× | §7 |

---

## §12. REBUILD IMPLICATIONS (what of the AUC-5.1 build survives)

- **Survives (reuse):** the §2 OPEN_BIDDING round-robin + bid-rotation (AUC-4.2), the CPU shill bid
  engine (AUC-2.2), the wallet/solvency math (AUC-5.1c), persistence (AUC-3.1 + farm namespace), the
  hot-seat device UX + the page shells (AUC-4.1b / 5.1e-2).
- **Rewrite:** (1) the **value layer** — replace per-prospect-IV pricing with scout-price-range + 20–80
  grade (AUC-5.1a/5.1b rework); (2) the **nomination + resolve** — replace GM-nomination/re-nomination
  with engine random-weighted nomination + one-chance (an AUC-2.1 state-machine rework: NOMINATION
  becomes engine-driven, RESOLVE's no-bid path becomes "out forever").
- **Wire (previously stubbed):** the **archetype luxury tax** into the MLB auction `projectedTax`
  (gentle), and the **dual MLB/farm archetype** choices.
- **New build:** the two morale systems (§6, §7), the GM identity entity (§8), the MLB→farm carryover
  (§4.5), the scout-as-bridge hole guidance (§3.5), the roster-visibility board + guided experience
  (§9), and the CPU-shill/CPU-team separation + dissolve (§5).
- **Persistence:** switch farm resume from regenerate-on-seed to **persist the prospect DTOs +
  storylines** (bulletproof; additive, no DB bump) — JK B8.

---

## §13. OPEN ITEMS (to resolve before/within the build)

1. ✅ **Reserve floor level — RESOLVED (JK):** start LOW — MLB percentile curve 0.5–0.7×IV, farm flat
   low floor; sim raises only if it juices (§4.4). (Sim-tunable thereafter.)
2. **Exact player-morale deltas** + the late/underpaid basement depth (§6) — start ±15/±10, sim-tune.
3. **Fan-morale payroll thresholds + curve steepness** (§7) — Captain's defaults, sim-tune.
4. **Archetype luxury-tax curve** — the exact convex shape that keeps straying a *cost not a wall*
   (§4.2) — Captain's default, sim-tune.
5. ✅ **Nomination talent-weighting — MECHANISM SET:** weight ∝ percentile^k, `k≈2–3` default
   (§2.1); the `k` magnitude is the sim-tune dial.
6. **Roster-fill tail** — confirm the surplus + guaranteed-fillable late-draft behavior (§2.3) —
   Captain to verify at build.
7. ✅ **GM entity — CONFIRMED (JK):** separate entity, data model parallels the manager profile, sits
   above the manager with fire-manager authority (§8).
8. ✅ **Personality model (§3.7) — RESOLVED (JK):** regenerate ALL THREE axes pre-draft for every
   MLB-pool player (the pool is heterogeneous — stock + user-created); **rebalance chemistry (MLB regen +
   farm gen) to MATCH the 440-base-pool distribution** (the canonical balanced target). **The morale
   ENGINE is ALREADY BUILT** (`masterMoraleMatrix.composeMoraleConsequence`: canonical 7 + per-personality
   reactivity multipliers + ambition/resilience/charisma/loyalty roles + relationship contagion + legacy-
   name reconciliation; the old `playerMorale.ts PERSONALITY_BASELINES` is DEAD LEGACY). Tunable figures =
   `MORALE_TUNING`. **Corrected 2026-06-21: the morale reactivity/relationship machinery is REUSE, NOT
   net-new** — RB-5 only defines the DRAFT events + seeds at the freeze. The ONE genuine VERIFY/BUILD = the
   chemistry-MIX → potency-TIER rule (makes the scout's chemistry-fit value real).
9. **Draft-morale timing (§3.7/§10):** since stock players' personality/modifiers are assigned at RB-0
   (pre-draft) and morale freezes at franchise-init (§10), confirm the morale is COMPUTED at the freeze
   (using draft-recorded slot/price + the now-present personality) rather than live mid-draft — unless a
   live in-draft morale preview is wanted (would need the assignment confirmed pre-draft, which RB-0 does).
