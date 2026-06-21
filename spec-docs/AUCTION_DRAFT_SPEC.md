# AUCTION_DRAFT_SPEC.md — Mode 1 Auction Draft (v1 primary + only format)

**Status:** Authoring spec for the NET-NEW layer on top of already-ratified auction logic.
**Authored:** 2026-06-20 (Captain, from JK rulings).
**Type:** Design spec — UX + flow + wiring. Authoring task only; NO production code in this pass.
**Scope discipline:** Where the LOGIC/ECONOMICS already exist in gospel specs, this doc **CITES**
them and **never ALTERS** a value. It may quote a formula verbatim as a reader convenience for the
builder — every such quote is byte-identical to its source — but it does not redesign or change the
economics. It designs only what does not yet exist: the pass-the-iPad hot-seat UX (R6), the farm
auction (R3), the two-number freeze wiring (§2.A / V12), the v1 build surface, and the open UX
questions for JK.

**Anti-hallucination note:** every "already ratified" claim below is a citation to a verified
source section/line; every "REUSE — do not rebuild" symbol in §5 was re-read at point of use
(`src/engines/leagueConstruction.ts`, `src/data/tierParams.ts`,
`src/utils/franchiseTrueValueSnapshotsStorage.ts`) and is quoted with `file:line`. Every "NEW /
0 hits" claim is an adversarial grep result, not an assumption.

---

## §1. SCOPE + WHAT'S ALREADY RATIFIED (the map — read first)

The auction LOGIC and ECONOMICS are **fully specced and ratified** in
`IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md`:

| Ratified piece | Source (CITE, do not rewrite) |
|---|---|
| League tiers (juiced / standard / nerfed) | IV_ENGINE **§5.1** |
| Self-calibrating tier cap; budget ≤ tierCap; per-team budget may sit below cap | IV_ENGINE **§5.2** |
| Luxury concentration layer (top-N vs cap, convex tax as budget DRAIN, `balanceMode`) | IV_ENGINE **§5.3 / §5.4** |
| Team identity / 42 cap modifications / `composeIdentity` | IV_ENGINE **§6** |
| Scout-obscured value ranges (the farm range mechanic) | IV_ENGINE **§7.4** |
| **Auction economics** — budget = team budget ≤ tierCap; rotating nomination; **open-ascending** bidding; opening bid = `reservePriceCurve(ivPercentile) × IV` (0.5 → 0.7 across IV percentile); **winning bid BECOMES salary**; per-bid solvency `maxBid = remainingBudget − (slotsRemaining − 1) × minSalaryByPosition`; sunlight-not-enforcement collusion remedy; league-inflation report | IV_ENGINE **§7.5** |
| **AI shill bidders** — private hidden valuation `IV × archetypeFit × personalityBias × noise(±12%)`; probabilistic interest (`bargainInterestCurve`), depletable budgets, personalities (sniper/spender/zealot); **HARD: no deterministic price floor**; exclude-from-league only; dissolve to pool on end | IV_ENGINE **§7.6** |

And in `MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md`:

| Ratified piece | Source (CITE) |
|---|---|
| The one connected pipeline: League Build → Lock → IV → Draft → Freeze | VISION **§1** |
| **Two-number freeze** at draft's end (True Value/IV objective + settled Salary; they DIVERGE in auction) | VISION **§2.A** |
| Auction is the v1 **PRIMARY and ONLY** format; snake stays in-tree but is **not a v1 path** | VISION **§9.A** (supersedes §6/R2; auction elevated v1.5→v1 per §6) |
| R1 — draft format is a LEAGUE-WIDE choice applied to BOTH MLB and farm consistently | VISION **§6 / R1** |
| R3 — FARM AUCTION (scout-obscured ranges + walled-off farm budget) | VISION **§6 / R3** |
| R5 — bidding mechanic = **OPEN ASCENDING**; blind-sealed = NOT v1 | VISION **§6 / R5** |
| R6 — INTERACTION MODEL: single iPad passed around (net-new, in NO existing spec) | VISION **§6 / R6** |
| R8 — ONE scout per team; same scout for farm draft + ongoing | VISION **§7 / R8** |
| §9.E — POSITIONS VISIBLE / RATINGS HIDDEN during the farm draft; farm-BUDGET tier separate from farm-GENERATION distribution | VISION **§9.E** |

And in `MODE1_V1_VERIFICATION.md`:

| Ratified finding | Source (CITE) |
|---|---|
| **V6** — archetype→budget chain is **BUILT + WIRED** (`composeIdentity` + `shiftLuxuryCaps` + `luxuryTax` + `assessSolvency` live in the draft board, 24/24 engine tests). **REUSE; do NOT rebuild.** | V1_VERIFICATION **V6** |
| **V12** — the G1/L-ECON1 freeze home: checkpoint-0 row in the existing `franchiseTrueValueSnapshots` store + one additive `settledSalary` field → **no DB-version bump (GREEN seam)**. Under auction-primary v1 the canonical freeze trigger is the **auction finalize**. | V1_VERIFICATION **V12** |

**Citation notation (two conventions, so a reader who opens a source doesn't see a false conflict):**
- **VISION letter-rulings.** `MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md` uses letter headers, not dotted
  numbers. "VISION §2.A" = "§2 ruling A" (line 35); "§9.A"/"§9.E" = "§9 rulings A/E" (lines 222/233);
  R1–R6 live under §6 (line 125); R7–R10 under §7 (line 175). The content mappings are all verified.
- **IV_ENGINE "v1.5" labels are stale-by-design.** IV_ENGINE §7.5/§7.6 still read "v1.5 module"
  (lines 501/510). They are PROMOTED to v1 by VISION §6/§9.A (the auction elevation). Seeing "v1.5"
  in IV_ENGINE is EXPECTED, not a contradiction — update those §-tags v1.5→v1 when ratified (VISION §6).

**What THIS doc adds (the only net-new design):**
1. **§2 — the pass-the-iPad hot-seat UX (R6)** — the single-device, turn-based interaction model
   wrapping the §7.5 open-ascending economics. *This is the careful-design section.*
2. **§3 — the farm auction (R3)** — the §2 machine + §7.4 scout ranges + positions-visible rule +
   the walled-off farm wallet.
3. **§4 — the two-number freeze wiring (§2.A / V12)** — the write contract at auction finalize.
4. **§5 — the v1 build surface** — every piece, marked NEW vs REUSE, in dependency order.
5. **§6 — open UX questions → batched WAITING_ON_JK.**

**Out of scope (stated, not silently dropped):** snake draft (v1.1, VISION §9.A); blind-sealed
bidding (NOT v1, R5 — a single shared device cannot collect simultaneous secret bids); AI-bidders
that JOIN the league (only exclude-from-league shills in v1, IV_ENGINE §7.6); scout HIRING flow
(separate Mode-1 item, VISION §3/§3.5 — referenced here as a dependency for §3, not designed here);
the §7.5 economic FORMULAS themselves (cited, never restated).

---

## §2. THE NET-NEW PIECE — PASS-THE-iPAD HOT-SEAT UX (R6)

> R6 verbatim (VISION §6): "the auction runs on a SINGLE iPad PASSED AROUND the room (single- or
> multi-player). The device passes to whoever is on the clock / bidding / counter-bidding."

This is the one genuinely net-new design. Everything an individual bid/nomination DOES is governed
by §7.5/§7.6 — this section governs WHO holds the device, WHAT they see, and WHEN it passes.

### 2.1 First principles for a single shared device

A real-room open-ascending auction lets anyone shout a raise at any time. **One iPad cannot collect
simultaneous shouts.** So the open-ascending mechanic (R5) is realized as a **deterministic
round-robin over the still-in bidders for the current lot** — each active bidder, in turn, sees the
current ask and either raises or passes. This is the only single-device-coherent realization of
"open ascending" and is exactly why R5 confirms ascending over blind-sealed for the iPad model.

Two design rules fall out of "one device, turn-based":
- **Pass = out for THIS lot.** Once a bidder declines the current ask, they are done bidding on that
  player (they cannot re-enter the same lot). This is the clean termination rule that prevents
  infinite re-entry loops on a single screen. *(Confirm — §6 Q4.)*
- **CPU shills never trigger a handoff.** Human turns pass the device; CPU turns resolve
  automatically and visibly in place (§2.6).

### 2.2 The state machine

Lifecycle of the whole auction is a loop of **lots**. One lot = one player put up and resolved.

```
                ┌─────────────────────────────────────────────────────────────┐
                │                      AUCTION (per tier)                       │
                │                                                               │
  SETUP ──▶  NOMINATION ──▶  OPEN_BIDDING ──▶  RESOLVE ──┬─▶ SOLD ──┐          │
            (nominator       (round-robin      (terminate │         │          │
             on clock)        raise/pass)       condition) └─▶ PASSED┘          │
                ▲                                                   │          │
                └───────────── next nominator (rotation) ◀──────────┘          │
                │                                                               │
                └──▶ (all rosters legally filled?) ──▶ AUCTION_COMPLETE ──▶ §4  │
                └─────────────────────────────────────────────────────────────┘
```

**State definitions:**

| State | What's happening | Device holder |
|---|---|---|
| **SETUP** | League already locked (pool + tiers + budgets per VISION §1). Auction config resolved: bid increments, optional turn timer, nomination order seed, CPU shill count + "exclude from league ✓" (IV_ENGINE §7.6). | (config screen; host) |
| **NOMINATION** | The team on the nomination clock selects a player from the live available pool. System sets the opening ask = `reservePriceCurve(ivPercentile) × IV` (IV_ENGINE §7.5). | **HUMAN: nominator.** CPU nominator: auto-selects (§2.6), no handoff. |
| **OPEN_BIDDING** | Round-robin over still-in bidders. Each in turn raises ≥ increment (capped at their §7.5 `maxBid`) or passes (→ out for this lot). A team whose `maxBid < currentAsk` is **auto-passed** (no handoff, logged), §2.3. | **Passes between HUMAN bidders;** CPU turns auto-resolve in place. |
| **RESOLVE** | Terminate check evaluated against `highBid` (the standing high bid, `null` until someone bids) and `highBidder`. The lot resolves when the still-in set reduces to ≤ 1. See **§2.2.1** for the exact SOLD-vs-PASSED rule. | (transient — engine) |
| **SOLD** | A winner exists (`highBidder ≠ null`). **Winning bid BECOMES the player's salary** (IV_ENGINE §7.5). Player → winner's roster; budget decremented; the filled roster slot recorded. | the team that held it (last actor); see §2.4 |
| **PASSED** | The lot ended with `highBid == null` (no one bid at the reserve ask). Disposition follows the **progress invariant** (§2.2.2), not a bare "re-nominate later." *(Disposition default — §6 Q5.)* | the lot's nominator (or host, single-player) |
| **AUCTION_COMPLETE** | Every team's roster is legally filled for this tier (22 MLB; or 10 farm in §3). | → freeze §4 (or → farm auction if MLB just completed) |

**Rotation:** after SOLD/PASSED, the nomination clock advances to the next team in the nomination
order and re-enters NOMINATION, until AUCTION_COMPLETE. Nomination order rule = **§6 Q1.**

#### 2.2.1 RESOLVE — the exact rule (no ambiguity)

The lot tracks two variables: `highBid` (`null` until the first bid) and `highBidder`. A team that
passes (or is auto-passed, §2.3) leaves the **still-in set**. RESOLVE fires the instant the still-in
set has ≤ 1 member:

- **SOLD** ⟺ `highBid ≠ null`. The winner is `highBidder` (the last team to have raised); everyone
  else passed. Winning bid becomes salary (§7.5). *(A lone survivor who raised at least once is the
  `highBidder` and wins at their last bid.)*
- **PASSED** ⟺ the still-in set empties with `highBid == null` — nobody ever bid at the reserve ask.
- **Lone survivor who never bid** (only possible under the recommended no-forced-ownership
  nomination, §2.5): when everyone else has passed and exactly one still-in team remains with
  `highBid == null`, that team is **prompted to claim-at-reserve or pass** (one tap). Claim → SOLD at
  the reserve ask; pass → PASSED. This single rule covers the single-player uncontested lot (§2.7)
  and is the *only* reason a survivor's screen is ever needed. The two formerly-separate "one bidder
  remains" / "all but high bidder passed" conditions are the SAME condition and collapse into the
  above. *(Whether the claim is one-tap-required or auto-awarded at reserve — §6 Q2.)*

#### 2.2.2 Progress invariant (no-stall guarantee)

Within a lot the round-robin always terminates (pass = out-for-lot, §2.1 — the still-in set
shrinks monotonically). The **outer lot loop** also needs a no-stall guarantee, or an unaffordable
star could PASS → re-pool → PASS forever while slots stay open:

> **Invariant: every lot iteration must either fill a roster slot (SOLD) or strictly shrink the
> available pool.** A PASSED player may NOT be re-nominated until at least one OTHER player has SOLD
> since that pass; a player PASSED twice with no intervening sale is **set aside** (removed from the
> nominatable pool for this draft; falls to the post-draft FA/undrafted tail per IV_ENGINE §7.6's
> dissolve-to-pool hook). The nominator may not re-nominate a player they themselves just caused to
> PASS this rotation cycle.

**Legal-fill termination:** the auction completes when no team has an open roster slot. A team that
has filled all slots stops nominating and stops appearing in bidding round-robins. §7.5 solvency
(`maxBid`, plus the §2.3 invariant that every team with an open slot can always afford
`minSalaryByPosition`) guarantees each team can fill its remaining slots; the §2.2.2 progress
invariant guarantees the loop advances. Together they guarantee the loop terminates with full, legal
rosters. *(This guarantee is CONDITIONAL on §6 Q4 = "pass is out-for-lot, no re-entry" and §6 Q5
resolving with the §2.2.2 guard; both are the recommended defaults.)*

### 2.3 Per-bidder turn UX (what the device holder sees in OPEN_BIDDING)

When the device reaches a human bidder on the clock, the screen shows:

1. **The lot card** — player name, **primary + secondary position(s)**, and (MLB auction only) the
   objective **IV / recommended value** as advisory (IV_ENGINE §7.5 "Live advisory UI: paid-vs-IV").
   *(Farm auction obscures this — see §3.)*
2. **Current high bid + high bidder** (team name/branding).
3. **YOUR remaining budget** (tier budget − committed salaries − projected luxury tax; the tax
   component reuses `luxuryTax`, IV_ENGINE §5.3).
4. **YOUR solvency-capped maxBid** — computed per IV_ENGINE §7.5:
   `maxBid = remainingBudget − (slotsRemaining − 1) × minSalaryByPosition`. Controls above this are
   disabled (you can never bid yourself unable to fill a legal roster). **Auto-pass rule:** if a
   still-in team's `maxBid < currentAsk` (it cannot even meet the standing bid), it is **auto-passed
   — no handoff, logged** — and removed from the lot's still-in set, exactly like a CPU pass. The
   device only ever reaches a human who can actually act. **Solvency invariant (assert in code):**
   §7.5 solvency guarantees `maxBid ≥ minSalaryByPosition` for every team with an open slot, so
   `maxBid ≤ 0` is impossible by construction — a team can always afford the cheapest legal filler.
   Cite the enforcement point during the §5.2 #3 build.
5. **Roster slots remaining + positions still NEEDED** — so the GM bids for need, not just value.
6. **Controls:** **Raise** (preset increment buttons + a custom amount, both clamped to `maxBid`)
   and **Pass** (= out for this lot, §2.1).
7. **Handoff prompt** after the action resolves: "Pass device to **[next team on the clock]**."

### 2.4 Device-handoff moments (explicit)

| # | Trigger | Hand the device to | Notes |
|---|---|---|---|
| H1 | Start of each lot, **human** nominator | The **nominator** | They pick the player; opening ask auto-set from §7.5. |
| — | Start of each lot, **CPU** nominator | **No handoff** — device stays with current holder (last/next human, or host in single-player) | CPU auto-selects + lot auto-opens (§2.6); banner shows "Hold — [CPU] nominating." |
| H2…Hk | Each **human** bidder's turn in OPEN_BIDDING | The **next still-in human bidder** | Skips teams already passed/filled/auto-passed; skips CPUs (auto). |
| — | A CPU's bidding turn | **No handoff** | CPU bid/pass resolves in place, visibly (§2.6). |
| — | **Only CPUs remain still-in** for the lot (all humans passed/filled) | **No handoff** — device stays with (or returns to) the lot's **nominator** (host in single-player), who watches the CPU-only resolution and taps to confirm SOLD/PASSED | Banner: "Hold — CPUs resolving." Prevents a dead device on the table while CPUs bid each other. |
| Hn | After SOLD/PASSED | From the **last human actor** (the holder at resolution) → the **next HUMAN nominator** in rotation | CPU nominators in between auto-open with the device still held; humans only hand off to humans. |
| End | AUCTION_COMPLETE | (host — proceeds to farm §3, then freeze §4) | No per-bidder handoff. |

**Holder is always named.** A persistent "**Now: [TEAM] — [action]**" banner is the single source
of truth. The rules above guarantee every state has a named holder: a human nominator/bidder when
one is on the clock; otherwise the **lot's nominator** (or the **host**, single-player) holds and
watches while CPUs act. The §2.3 step-7 handoff prompt reads "Pass device to **[next human]**" only
when a next human exists; when none does, it reads "**Hold — CPUs resolving**" instead of naming a
nonexistent team.

### 2.5 Nomination UX

The nominator sees the live available pool (filterable by position / sortable by IV — MLB; by
scout-range midpoint — farm) and selects one player. The lot opens at the §7.5 reserve ask.

**Open design point (§6 Q2):** does nomination require the nominator to place a binding opening
bid (they own the lot at the reserve until outbid), or does it merely put the lot up at the reserve
with no owner (so the nominator can nominate a star purely to drain rivals — the
"nomination-as-weapon" counterplay IV_ENGINE §7.6 explicitly calls intended design)? Recommended
default: **put-up-at-reserve, no forced ownership** (enables nomination-as-weapon; pairs with the
PASSED rule §2.2). Confirm.

### 2.6 CPU shill bidders on one device (§7.6 interleave)

CPU shills (IV_ENGINE §7.6 — private valuation, probabilistic interest, depletable budgets,
personalities, **no deterministic floor**) participate in the same round-robin but **never take the
physical device**:

- **CPU bidding turn:** when the round-robin reaches a CPU, the engine evaluates §7.6 policy and
  either raises (animated/logged: "**[CPU TEAM] raises to $X**") or passes ("**[CPU TEAM] passes**"),
  then advances. A brief, visible beat — not a handoff. The CPU's private valuation is NEVER shown.
- **CPU nomination turn:** if a CPU is on the nomination clock, it auto-selects a player (per §7.6
  tendencies, including baiting/draining nominations) and the lot opens — no handoff.
- **Mixed rooms:** humans see every CPU action in the lot log; the device only ever passes between
  the **human** bidders/nominators. This is what makes a single iPad workable with N CPUs in the room.

### 2.7 Single-player case (1 human + N CPU shills)

Same state machine, no physical passing: the human holds the device the entire auction. On the
human's nomination/bid turns they act; on every CPU turn the engine auto-resolves in place (§2.6).
The human simply never hands off. (This is also the most-tested path, since CPU-vs-human is the
v1.5 §7.6 mode promoted to v1 here.)

**Uncontested-lot rule (load-bearing for legal fill):** when the human is the sole still-in bidder
and `highBid == null` (all CPUs passed at the reserve, the human never had to act), the §2.2.1
lone-survivor rule applies — the human is **prompted to claim-at-reserve or pass** (one tap). This
is the difference between the human silently winning every uncontested lot at reserve vs. those
lots PASSING and leaving slots unfilled. The claim prompt (not a silent auto-PASS) is what keeps
the legal-fill guarantee intact on this most-common path. The same rule applies to any
all-but-one-passed lot regardless of player count.

### 2.8 Configurable bits (league setup)

| Config | Options | Default (recommended) | Open Q |
|---|---|---|---|
| Bid increment | flat $ step, or price-tiered ladder (bigger steps at higher asks) | flat step, scaled to tier cap | §6 Q3 |
| Per-turn timer ("on the clock") | off / on (N seconds) | **off** (pass-the-iPad is inherently social/slow; a timer adds pressure but also frustration) | §6 Q3 |
| Nomination order | fixed cyclic / randomized-once / snake | fixed cyclic from a seed randomized at SETUP | §6 Q1 |
| CPU shills | count N + "exclude from league ✓" (IV_ENGINE §7.6 — exclusion is the only v1 mode) | per host | — (ratified) |

---

## §3. FARM AUCTION (R3)

> R3 (VISION §6): in an auction league the FARM draft is ALSO an auction — scout-obscured value
> ranges + a separate walled-off farm budget. §9.E refines: **positions visible, ratings hidden.**

The farm auction **reuses the §2 hot-seat machine and §7.5 bidding wholesale**, with four overrides.

### 3.1 Sequencing

Per the pipeline (VISION §1) and R1 (one league-wide format applied to both tiers): the **MLB
auction fills the 22-man roster first**, then the **farm auction fills the 10-man farm**. Both run
the §2 machine back-to-back; the two-number freeze (§4) fires once, after the farm auction
completes (i.e. at the END of the whole draft).

### 3.2 Override A — scout-obscured value (bid on PERCEIVED value)

Reuse the §7.4 scout-range mechanic verbatim (IV_ENGINE §7.4): the **displayed** value is a range
`[trueIV × (1 − w), trueIV × (1 + w)]`, `w = scoutNoiseBase × (1 − scoutAccuracy)` (default
`scoutNoiseBase = 0.6`, registry §12), midpoint seeded-jittered so midpoint ≠ truth. Scout accuracy
comes from the team's **one** scout (R8). GMs bid against the **perceived** range, not true IV —
the §7.5 economics run on the bid the same way; only the displayed anchor changes. True IV is held
internally for all engine math and **snaps to truth at call-up** (§7.4), never before.

### 3.3 Override B — POSITIONS VISIBLE, RATINGS HIDDEN (§9.E hard rule)

> §9.E verbatim: "scouts obscure RATINGS/VALUE, NEVER POSITION." "GMs must draft for positional
> need — hiding position kills draft strategy."

**Farm-auction lot card — exact show/hide contract:**

| Field | Farm auction | Rationale |
|---|---|---|
| Player name | **SHOWN** | identity |
| **Primary position** | **SHOWN** | §9.E — draft for need |
| **Secondary position** | **SHOWN** | §9.E — draft for need |
| Handedness (bats/throws) | SHOWN | non-obscured profile fact (generated per §9.E) |
| **Individual ratings** (POW/CON/…/VEL/JNK/ACC) | **HIDDEN** | §9.E — scouts obscure ratings |
| **True IV / recommended value** | **HIDDEN** → shown only as the §3.2 scout RANGE | §7.4 / §9.E |
| Grade | HIDDEN (or shown only as a scout-fuzzed band) — *§6 Q6* | follows the ratings-hidden rule |

Contrast with the MLB-auction card (§2.3), where IV/value is shown as advisory. The ONLY difference
between the two cards is the value/ratings obscuring; positions are visible in both.

### 3.4 Override C — separate, walled-off farm budget

Each team gets a **distinct farm wallet**, tiered (juiced / standard / nerfed), **separate from the
MLB auction wallet**. Spending in the farm auction draws ONLY on the farm wallet; the MLB wallet is
untouched and vice-versa. Overpaying early in the farm auction forces later scrimping within the
farm wallet (the auction's budget-scarcity + regret tension, carried into the farm — R3).

**Critical distinction (VISION §9.E, do not conflate):** this farm-**BUDGET** tier (the walled-off
wallet) MAY be tiered in v1. It is SEPARATE from the farm-**GENERATION** distribution shift (how
good prospects are), which is **standard-only for v1** and deferred to L-ECON3 / `farmGradeMode`.
This doc specs only the wallet; prospect generation is owned by the farm-generation spec (VISION §9.E).

Solvency (§7.5 `maxBid`) applies within the farm wallet using the farm roster's slots and a farm
`minSalaryByPosition`. Tier cap for the farm wallet derives the same self-calibrating way (IV_ENGINE
§5.2) over the prospect pool. *(Confirm the farm-wallet tier defaults — §6 Q7.)*

### 3.5 Override D — dependency on scout hiring (R8)

The scout accuracy that sets the §3.2 range width comes from the team's single scout (R8: one
scout, same for draft + ongoing). Scout HIRING happens at draft start (VISION §3) and is a separate
Mode-1 item NOT designed here. **Dependency, not scope:** the farm auction CONSUMES `scoutAccuracy`;
if no scout is hired, fall back to a default accuracy (widest range) — *§6 Q8.*

---

## §4. THE TWO-NUMBER FREEZE WIRING (§2.A / V12) — this is the L-ECON1 home

> VISION §2.A: True Value (IV) and Salary are DISTINCT frozen numbers, both stamped when the draft
> finalizes. They MATCH in snake but **DIVERGE in auction** (a player worth 80 IV can sell for 95 →
> IV = 80, salary = 95 — the divergence IS the point of an auction).

### 4.1 Trigger

The freeze fires at **AUCTION_COMPLETE for the whole draft** — i.e. after the farm auction (§3.1)
finalizes. Under auction-primary v1, this auction-finalize step is the **canonical freeze trigger**
(V12: "the canonical freeze trigger is the auction finalize"), superseding the launch-deep-copy
fallback used for snake (which is v1.1).

### 4.2 What gets stamped (per rostered player, both tiers)

For every player on every team (22 MLB + 10 farm = 32/team), write a full checkpoint-0 row. The
`FranchiseTrueValueSnapshotRow` carries FOUR non-optional data fields plus the scope/key members
(`franchiseTrueValueSnapshotsStorage.ts:17-24`) — the writer must populate ALL of them, not just
the two headline numbers:

| Row field | Value at checkpoint-0 (freeze) | Source / note |
|---|---|---|
| `trueValue` (`:20`) | the player's objective **IV** (tier-independent, R7) | the locked pool's `iv` (`RegisteredPool.players[].iv`, `leagueConstruction.ts:25,37` — currently discarded at handoff, V12) |
| `settledSalary` (**NEW**, additive) | the **winning bid** (MLB) / winning farm bid (farm) — DIVERGES from IV | the auction result for that player |
| `valueDelta` (`:21`) | `0` at the freeze baseline (TV − contract is zero at the anchor) | mandatory field; baseline is the zero point the in-season delta is measured from |
| `warPercentile` (`:22`) | the player's IV percentile within the locked pool | mandatory field; derivable at finalize from the same pool sort that feeds `reservePriceCurve` |
| `computedAt` (`:23`) | the freeze timestamp | mandatory field; stamp at finalize |
| `checkpoint` (`:19`) | `0` (or `'launch'`) | checkpoint-0 row convention (V12) |
| scope: `franchiseId`/`seasonId`/`statsScopeId`/`playerId` | the franchise key | `FranchiseTrueValueSnapshotScopeInput` (`:9-13`) |

`settledSalary?: number` is the **only NEW field** (§4.3); the other four data fields already exist
and must be supplied so checkpoint-0 rows are well-formed.

Farm players: the STORED values are real (true IV + winning bid); the **display** stays
scout-obscured until call-up (§3.2 / §7.4). The freeze stores truth; the UI obscures it — these are
independent.

### 4.3 Write contract (GREEN seam — no DB bump)

Reuse the existing store (V12, re-verified at point of use):

- Store: `franchiseTrueValueSnapshots`, already registered (`trackerDb.ts:370`, DB **v25**), keyed
  `[franchiseId, seasonId, statsScopeId, playerId, checkpoint]`.
- Row: `FranchiseTrueValueSnapshotRow` (`franchiseTrueValueSnapshotsStorage.ts:17-24`) — today
  carries `playerId` (`:18`), `checkpoint` (`:19`), `trueValue` (`:20`), `valueDelta` (`:21`),
  `warPercentile` (`:22`), `computedAt` (`:23`) and the scope members (`:9-13`); **no
  `settledSalary`** (re-verified at point of use: grep across `src/` = 0 hits for `settledSalary`).
  All four data fields are non-optional → the freeze writer must populate them per the §4.2 table.
- **The ONE additive change:** add `settledSalary?: number` to `FranchiseTrueValueSnapshotRow`. It
  is a STORED value, **not a keyPath member** → **no `TRACKER_DB_VERSION` bump** (GREEN seam, V12).
- Writer: reuse `saveFranchiseTrueValueSnapshotRows` (V12) to upsert the checkpoint-0 rows.

**This section IS L-ECON1.** The auction-finalize freeze writer is the load-bearing economy seam;
flag it as such on the roadmap. (Memory rule honored: any new STORE add would force the
`franchiseSeasonLedgerStorage.test.ts` version-pin update — but this is a FIELD add, not a store
add, so that pin is NOT in scope. Confirm no other test hard-pins the row shape during build.)

---

## §5. v1 BUILD SURFACE (greenfield — what must be BUILT)

Marked **NEW** (build it) vs **REUSE** (exists — do NOT rebuild). Ordered by dependency, not size.
This mirrors `MODE1_V1_VERIFICATION.md` costed-queue row 1.1 ("Auction draft (PRIMARY v1) —
GREENFIELD — largest single build across all audits") and row 1.2 (the freeze writer).

### 5.1 REUSE — do NOT rebuild (re-verified at point of use)

| Piece | Symbol / location (verified) |
|---|---|
| Team identity composition | `composeIdentity` — `src/engines/leagueConstruction.ts:156` |
| Identity → shifted luxury caps | `shiftLuxuryCaps` — `:217` |
| Luxury concentration tax (budget drain, `balanceMode`-aware) | `luxuryTax` — `:233` |
| Per-pick marginal tax | `pickMarginalTax` — `:355` |
| Cheapest-fill reserve helper | `cheapestFillCost` — `:351` |
| Solvency assessor (signal + slack + reserve pattern) | `assessSolvency` — `:364` |
| Tier budgets / caps | `TIER_CAPS` — `src/data/tierParams.ts:65`; `starBudgetShare: 0.33` — `:208` |
| Freeze store + row + writer | `franchiseTrueValueSnapshots` (`trackerDb.ts:370`); `FranchiseTrueValueSnapshotRow` (`franchiseTrueValueSnapshotsStorage.ts:17`); `saveFranchiseTrueValueSnapshotRows` |
| Scout-range FORMULA | IV_ENGINE §7.4 (spec; reuse the existing farm-draft scout-range implementation if present — VERIFY during build) |
| Auction + shill ECONOMICS | IV_ENGINE §7.5 / §7.6 (spec — implement to it, do not redesign) |

> **Note on solvency reuse:** `assessSolvency` reserves `slotsRemaining × cheapestFillCost` and
> emits a GREEN/YELLOW/RED/BLOCKED signal for snake picks. The §7.5 AUCTION `maxBid` reserves
> `(slotsRemaining − 1) × minSalaryByPosition` and returns a per-bid CEILING. These are RELATED but
> NOT identical → the auction maxBid is a NEW function (§5.2 #3) that REUSES `luxuryTax` /
> `pickMarginalTax` / `shiftLuxuryCaps` / `TIER_CAPS` and mirrors `assessSolvency`'s reserve
> structure, but is auction-specific. Do not assume `assessSolvency` drops in unchanged.

### 5.2 NEW — must be built (adversarial grep: 0 hits today)

Dependency-ordered:

1. **Auction config / enum** (NEW, small) — league-setup fields: `format = 'auction'` (the only v1
   path, §9.A), bid increment, optional turn timer, nomination-order seed, CPU shill count +
   exclude-from-league flag. Persist with the league config.
2. **`reservePriceCurve(ivPercentile)`** (NEW — `reservePrice` grep = 0 hits) — the 0.5→0.7 opening
   ask curve over pool IV percentile (IV_ENGINE §7.5). Registry constant (`rosterEngineConstants.ts`
   §12). Depends on pool IV percentiles (the pool already computes IV).
3. **Auction per-bid `maxBid` / affordability** (NEW — `minSalaryByPosition` grep = 0 hits) — the
   §7.5 formula; needs a NEW `minSalaryByPosition` constant (registry §12). REUSES `luxuryTax` /
   `pickMarginalTax` / `shiftLuxuryCaps` / `TIER_CAPS` for the projected-tax component (see §5.1 note).
4. **Auction state-machine engine** (NEW, GREENFIELD core) — the §2.2 machine: rotating nomination,
   open-ascending round-robin bid loop, RESOLVE/SOLD/PASSED, pass-=-out rule, legal-fill completion.
   Pure-TS engine, testable outside React (mirror the engine/test pattern of `leagueConstruction`).
5. **CPU shill bid-resolution loop** (NEW, GREENFIELD) — IV_ENGINE §7.6: private valuation
   (`IV × archetypeFit × personalityBias × noise±12%`), `bargainInterestCurve` probabilistic
   interest, depletable budgets, sniper/spender/zealot personalities, **HARD no deterministic
   floor**, dissolve-to-pool on end. REUSES `composeIdentity` for `archetypeFit`.
6. **Auction persistence** (NEW) — auction session state (current lot, bids, rotation pointer,
   per-team committed/remaining, results); mirror the existing `LeagueBuilderMlbDraftSession` shape
   (per V12 costed row 1.1). League-builder DB likely needs a store/version bump (NOT the tracker DB).
7. **Hot-seat UI / route / screens** (NEW, GREENFIELD UI) — the §2.3/§2.5 screens: NOMINATION,
   OPEN_BIDDING per-bidder turn view, SOLD/PASSED notices, handoff banner/prompts, lot log. New
   page + route.
8. **Farm-auction layer** (NEW — §3) — wrap the §5.2 #4 machine for the farm round with: §3.2
   scout-obscured display (REUSE §7.4 mechanic), §3.3 positions-visible/ratings-hidden card, §3.4
   walled-off farm wallet (NEW separate budget tracking), §3.1 MLB-then-farm sequencing. Depends on
   scout hiring (R8) for `scoutAccuracy` (dependency, §3.5).
9. **Freeze writer (L-ECON1)** (NEW logic on existing rails — §4) — at AUCTION_COMPLETE, stamp
   `{trueValue, settledSalary, checkpoint:0}` per player via `saveFranchiseTrueValueSnapshotRows`;
   add the additive `settledSalary?` field (no DB bump). REUSES the store + writer (§5.1).

### 5.3 Rough scope / dependency graph

```
 (1 config) ──▶ (2 reserveCurve) ─┐
 (1 config) ──▶ (3 maxBid) ───────┼──▶ (4 state machine) ──▶ (7 hot-seat UI) ──▶ (8 farm auction) ──▶ (9 freeze writer)
                                  │            ▲                                        ▲
                                  └──▶ (5 CPU shill loop) ──┘                           │
                       (6 persistence) ──────────────────────────────────────┘  (scout hiring — external dep, §3.5)
```

Largest lifts: **#4 (state machine)**, **#5 (CPU shill loop)**, **#7 (hot-seat UI)** — the three
genuinely greenfield cores. #2, #3, #9 are small/bounded. #1 is trivial. #8 is medium (mostly reuse
+ the new wallet). The economy correctness gate is **#9 + #3** (the freeze + the solvency math).

---

## §6. OPEN QUESTIONS → ✅ ALL RESOLVED (JK 2026-06-20, attended)

- **Q1 — Nomination order — ✅ fixed cyclic rotation, seeded once at SETUP.** (§2.2, §2.8)
- **Q2 — Nomination = put-up-only, no forced ownership — ✅** (enables the nomination-as-weapon
  counterplay IV_ENGINE §7.6 intends — nominate a pricey star to drain rivals risk-free).
  Lone-survivor (§2.2.1): **tap-to-claim** (one explicit tap), NOT auto-award. (§2.5, §2.2.1)
- **Q3 — Increment + timer — ✅ flat step scaled to the tier cap; per-turn timer OFF by default**
  (optional toggle on). (§2.8)
- **Q4 — Pass semantics — ✅ pass = out for this lot** (clean single-device termination). (§2.1)
- **Q5 — PASSED disposition — ✅ the §2.2.2 progress-invariant rule:** re-nominatable only after
  at least one OTHER player has SOLD; set aside (→ undrafted/FA tail) after being PASSED twice with
  no intervening sale; a nominator can't immediately re-nominate a player they just caused to PASS.
  (§2.2 PASSED, §2.2.2)
- **Q6 — Farm card grade visibility — ✅ show a grade RANGE + a scout-driven confidence level**
  (better scout → tighter range, higher confidence). Positions always visible, ratings hidden.
  **See §6.1 SCOUT-PRIVACY below.** (§3.3)
- **Q7 — Farm-wallet tier defaults — ✅ confirmed:** walled-off, NERFED farm budget; the farm tier
  cap self-calibrates per §5.2 over the prospect pool. (§3.4)
- **Q8 — No-scout fallback — ✅ REQUIRE every team to hire a scout before the draft can start.** The
  widest-range no-scout fallback is **removed** — there is no scout-less farm-auction path in v1.
  (Supersedes any §3.5 fallback.) (§3.5)

### §6.1 NEW REQUIREMENT — Scout-report privacy on the shared device (JK 2026-06-20)
Because the draft room passes **one iPad** around, each GM's **private scouting report** (the Q6
grade-range + scout-confidence — which differs per team, since each hires its own scout per Q8) must
not be visible to rivals, or a GM could read a better report and free-ride.

- **Default COVERED.** A GM reveals their own report only via a **long-press (press-and-hold)**
  gesture; it **re-covers on release**.
- **Scope = scout reports ONLY.** Budgets, target lists, and the solvency-capped max-bid stay
  visible (rivals seeing your budget is part of the game). (JK 2026-06-20)
- **Applies to** the farm auction (§3) + the scouting/draft-prep phase. MLB-auction player grades are
  public knowledge — no cover there.
- **Build surface:** extends the §3 farm-card show/hide contract + the §2.4 device-handoff UX; add a
  dedicated UI ticket in §5.

---

## Appendix — Build constraints honored in this doc

- **Did NOT ALTER §7.5/§7.6 economics** — every economic rule is cited (§1 table; §2/§3 inline
  cites); where a formula is quoted verbatim it is byte-identical to the source (a builder
  convenience), never changed. The doc designs WHO/WHAT/WHEN of the device, not the bid math.
- **Blind-sealed bidding = NOT v1** (R5) — the §2 model is explicitly open-ascending round-robin
  because one shared device cannot collect simultaneous secret bids.
- **No snake design in this doc** (v1.1, §9.A) — snake is referenced only as the out-of-scope
  alternative and the v1.1 freeze-fallback path.
- **REUSE before NEW** — V6's archetype/luxury/solvency layer and the V12 freeze store are reused
  with verified `file:line`; only the genuinely-absent pieces (0-hit greps) are marked NEW.
