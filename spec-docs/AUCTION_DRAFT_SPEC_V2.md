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
scout-privacy = **default covered, long-press REVEALS** your own report.

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
- **Weighted reveal:** the surface order is **random but weighted by hidden true talent** — stronger
  players are *more likely* to appear earlier, **not guaranteed**. A sleeper sometimes surfaces early
  (forcing a hard "lock him now or lose him" call); a target sometimes surfaces late (you may have
  spent more than planned by then). The weighting curve is a **sim-tunable** (§11). The engine uses the
  hidden true-talent ranking only to set surface probabilities — it is never shown.
- **Determinism:** the surface order is seeded (reproducible for save/resume + sim).

### 2.2 One-chance resolution (replaces re-nomination)
- A surfaced player opens at the **reserve** (§4.4). Eligible teams bid (open-ascending, the V1 §2
  round-robin) or pass.
- **If at least one team bids:** highest bid wins → the player is rostered at that price (his **settled
  salary**), per the V1 RESOLVE rules.
- **If NO team bids:** the player is **permanently out of the draft** — he is gone for good, never
  re-surfaced. (This is the engagement-forcing rule: passivity now *costs* you the player.)
- **No re-nomination, no set-aside-then-return.** Each player is exactly one irreversible decision.

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

### 3.6 Scout-privacy on the shared device (§6.1, corrected)
- **Default COVERED.** A GM **long-presses to REVEAL** their own scout report; it **re-covers on
  release.** Rationale: the iPad passes around the room; if reports were shown by default, a rival sees
  your high-confidence A-grade on a player their off-specialty scout rates "B–D low confidence" → free
  scouting that defeats per-team scouts. Covered-by-default protects your scout's edge.
- Scope = **scout reports only** (the price range + grade + confidence). Budgets, your max-bid, roster
  board stay visible. Applies to the farm + the scouting/prep phase. MLB players are public — no cover.

---

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
- **Reserve level = OPEN (§13, sim-tunable).** JK floated 90% of value (MLB) / 80% of slot value (farm)
  as a high floor; the Captain flagged that a high floor kills the bargain/strategy upside. **Decision
  deferred to sim-tune:** sweep the reserve from low (current 0.5–0.7×) to high (0.8–0.9×) and pick the
  value that keeps the TV economy honest (steals possible but not systemic) without juicing.

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
- **Personality-tilted:** egotistical/ambitious players weight "was I wanted" heavily; humble/relaxed
  shrug. (Use the existing personality modifiers.)
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
  make reacting to gaps fair instead of frustrating.
- **Guided first-person experience (N4):** the reporter/"machine" walks the GM through setup → scouting
  → MLB auction → farm auction → freeze. **Start LIGHT** — a contextual "coach" that drops a line at
  each phase transition — and **deepen** toward a fuller tutorial only if it earns its keep.
- **Format picker (setup):** the league setup lets the GM choose **auction (default) vs snake**, applied
  league-wide to both tiers (R1). (`draftFormat` field built; the picker UI is this item.)
- **MLB → farm:** a user-driven "Proceed to Farm Auction →" link at MLB completion (not auto-advance).

---

## §10. THE TWO-NUMBER FREEZE (AUC-5.2) + SEQUENCING (carried from V1 §4/§3.1)

- MLB auction fills 22 → farm auction fills 10 → at the **end of the whole draft**, the **two-number
  freeze** stamps `{trueValue, settledSalary, checkpoint:0}` per rostered player into the franchise
  freeze store (`franchiseTrueValueSnapshots`). `settledSalary` (the auction winning bid) is the only
  ADDITIVE field; the freeze fires at **franchise-init checkpoint-0** (the Mode-1→Mode-2 bridge). This
  is the next build (AUC-5.2) — a careful saved-shape/franchise-bridge ticket.

---

## §11. SIM-TUNABLES (the dials we sweep before locking)

| Dial | Default | Notes |
|---|---|---|
| MLB→farm carryover % | 50% | §4.5 — sweep 30/50/70 |
| Reserve floor | low (0.5–0.7×) | §4.4 — sweep up to 0.8–0.9; pick the anti-juicing sweet spot |
| Nomination talent-weighting | TBD | §2.1 — how strongly better players surface early |
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

1. **Reserve floor level** — sim-tune (§4.4); is the bargain-upside worth a low floor, or do you want
   the 80/90% high floor for order?
2. **Exact player-morale deltas** + the late/underpaid basement depth (§6).
3. **Fan-morale payroll thresholds + curve steepness** (§7).
4. **Archetype luxury-tax curve** — the exact convex shape that keeps straying a *cost not a wall* (§4.2).
5. **Nomination talent-weighting** strength (§2.1) — how front-loaded toward better players.
6. **Roster-fill tail** — confirm the surplus + guaranteed-fillable late-draft behavior (§2.3).
7. **GM entity** — confirm the data model parallels the manager profile + the fire-manager authority
   path (§8).
