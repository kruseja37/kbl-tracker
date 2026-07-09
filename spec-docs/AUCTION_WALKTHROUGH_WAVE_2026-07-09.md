# AUCTION WALKTHROUGH WAVE — BINDING DESIGN (2026-07-09)

**Author:** Fable (captain, UI/design authority). **Source of the asks:** JK's live browser
walkthrough notes, 2026-07-09. **Status:** BINDING for the four lanes below. Builders do not
re-litigate copy or interaction decisions; UNKNOWNs are STOP-and-report.

Ground truth for every file:line below: the two tracer inventories run 2026-07-09 against
post-PR-#45 main (fill-reserve/visibility trace + auction/setup copy inventories, recorded in
this session; key facts restated inline so this doc stands alone).

**Lane map (file-surface partition):**
- **VOICE** — auction copy law (§1). Files: WhisperPanel.tsx, AuctionStage.tsx,
  LeagueBuilderAuctionDraft.tsx (strings only), auctionBoardFrame.ts (labels), + their tests.
- **SETUPHELP** — setup diagnostics behind Help (§4). Files: LeagueBuilderDraftSetup.tsx + its
  5 split test files. Disjoint from VOICE → may run concurrently.
- **PRIVACY** — reveal-on-click / auto-hide (§2). Same auction files as VOICE → runs AFTER
  VOICE lands (no concurrent lane on these files).
- **STAKES** — what-you-give-up panel (§3). Engine work + WhisperPanel render → runs after
  PRIVACY.

All lanes: contract-first; gates = typecheck, build, the touched suites, **plus the consuming
pages' suites and one full vitest** (POOLFLOOR lesson — a lane green by its own gates can still
move the ground under page fixtures). Builder ≠ auditor.

---

## §1 THE MONEY VOICE (copy law) — lane VOICE

### Principle
A GM on the clock needs exactly three money facts, in his assistant's voice:
1. **What he's worth to you** → `YOUR NUMBER` (kept).
2. **What you can actually pay right now** → the **ceiling** (one term, everywhere).
3. **What's already spoken for** → the **hold-back** that finishes the roster, tax included.

Everything else is Help-gated or dropped. No engine vocabulary ever renders: no enum slugs, no
"IV", no internal field names. Engine identifiers/types do NOT change — this is a display-layer
lane only (standing ruling: CPU behavior rules and engine semantics untouched).

### 1.1 The live-call ladder (WhisperPanel.tsx:1026-1037, rendered :514-516)
| liveCall code | Old word | NEW word | Meaning |
|---|---|---|---|
| on-top | `ON TOP` | `ON TOP` (keep) | you hold the high bid |
| push | `PUSH` | `STAY IN` | next bid still ≤ your number — keep bidding |
| cap | `CAP $X` | `STOP AT $X` | your number is $X; do not pass it |
| out/walk | `WALK` | `WALK` (keep) | you're out |
"PUSH" reads as a tie (gambling), "CAP" collides with salary cap in a tax-heavy UI. Engine
`liveCall` enum values unchanged.

### 1.2 The money row (WhisperPanel.tsx:775-792 + AuctionStage.tsx:293-294)
| Old | NEW | Notes |
|---|---|---|
| `MAX BID $X` | `CEILING $X` | one term for "most you can pay" everywhere |
| Wallet `Most you can bid` (AuctionStage:293) | `Ceiling` | same term as the panel |
| `Fill Reserve $X` | `HELD BACK $X` | Help line: "Held back — what finishing your roster will cost, tax included." |
| `Room $X` | `TO SPEND $X` | frees the word "room" for market sentiment only |
| `Total Capacity $X` | **REMOVED from default render** | Help-gated as `Before-tax ceiling $X` with one line: "Ignores tax — never bid to this." (Honors the existing F9 ruling at WhisperPanel:787-789: this number must never drive a verdict; it also must not tempt the GM.) |
Relationship line (new, small, under the row): `Your number is what he's worth. Ceiling is what
you can pay.` — render ONLY when ceiling < your number (i.e., cash caps you), else omit.

### 1.3 The why-line (WhisperPanel.tsx:1083-1089)
| Old | NEW |
|---|---|
| `Fit and need move the raw IV to $X before chemistry.` | `Talent alone says ${base}. Your fit and need move him to ${adjusted}.` |
| `Your fit and need sit right on the raw IV.` | `Straight talent price — no fit or need bump.` |
"raw IV" and "chemistry"-as-math-term never render. The chemistry readout section (:637-641)
already covers chem in its own voice and is unchanged.

### 1.4 Reason chips (WhisperPanel.tsx:1097-1124, `reasonCodeLabel`)
Builder maps **every** `LiquidityReasonCode` — and adds a unit test asserting the mapper is
exhaustive (no raw slug can ever render; default case = fail-loud in dev, generic `advisor note`
in prod).
| Code (engine, unchanged) | Old chip | NEW chip |
|---|---|---|
| emergency-fill | must fill | `must fill now` |
| future-fill-protected | protect fill | `saving for seats` |
| priority-need | priority need | `fills a need` |
| similar-replacements | similar repl. | `cheaper options left` |
| scarce-replacement | scarce repl. | `scarce at position` |
| over-budget | over budget | `past your cash` |
| legal-cap / above-legal-ceiling | legal cap | `can't legally pay` |
| bid-floor | bid floor | `reserve price` |
| late-cash | late cash | `late money edge` |
| cash-tight | cash tight | `cash tight` (keep) |
| near-done | near done | `roster nearly done` |
| under-ceiling | under ceiling | `inside your cash` |
(Builder reconciles this table against the actual enum members at build time; any member not
listed here = STOP-and-report with the member name, not an invented label.)

### 1.5 Liquidity-state chip (WhisperPanel.tsx:1092-1094)
Today: special-cases two states, else renders the raw enum uppercased (`WITHIN-LIQUIDITY-CEILING`
could render verbatim — bug-adjacent). Builder maps every `LiquidityState`:
`neutral → STEADY`, `constrained → TIGHT`, `aggressive → PRESS`, `emergency-fill → MUST FILL`,
`late-budget-surplus → CASH TO BURN`, `within-liquidity-ceiling → STEADY`. Same exhaustiveness
test as 1.4. Display only — the posture classification rules themselves are untouchable
(standing TAXENGINE ruling).

### 1.6 Need/fit chips (WhisperPanel.tsx:1130-1138)
Keep terse chips `need +35%` / `fit +8%` (lowercase like the other chips). Add one Help line:
"need / fit — how much this club's roster hole and team identity move the price for you."
Thresholds/behavior unchanged.

### 1.7 Scattered fixes
| Where | Old | NEW |
|---|---|---|
| WhisperPanel.tsx:807-810 | `Next-best replacement ~$X` | `Fallback option ~$X` |
| LeagueBuilderAuctionDraft.tsx:447-464 | `…not attractive enough for this profile` | `…not attractive enough for this club's plan` |
| AuctionStage.tsx:609-611 | `The franchise wizard will refuse them…` | `Franchise setup will refuse them…` |
| AuctionStage.tsx:480-481 | `…don't fit the legal 22 frame` | `…don't fit a legal 22` |
| AuctionStage.tsx:706-709 | `Teams can meet the ask.` (drops N) | `{N} teams can meet the ask.` |
| LeagueBuilderAuctionDraft.tsx:1930 | plain `-` | em dash `—` (match page style) |
| AuctionStage.tsx:276 (UNSOLD) | `Nobody bid at that price. He'll get one more look later.` | `No takers at that price — he'll come around again.` |
| AuctionStage.tsx:284 (GONE) | `Nobody bid. He's off the board for good.` | `No takers — he's off the board for good.` |
| auctionBoardFrame.ts:177-178 | `depth via {Name} (Two Way C)` | `depth via {Name} (two-way, covers C)` |
| LeagueBuilderAuctionDraft.tsx:1932 | `Room up to $X while keeping money for the empty slots.` | `You can go to $X and still cover your empty seats.` |

### 1.8 Explicitly KEPT (do not touch)
`Let him go.` (headline + button, both sources), `YOUR NUMBER`, `The room wants more than you
should give.` and the other two `roomRelation` lines (the word "room" is now reserved
exclusively for market sentiment), `WALK`, `ON TOP`, the HELP_LINE, board/scout/log/handoff
copy rated NATURAL in the inventory, all `designVerdict.ts` strings (setup surface, test-locked,
out of this lane's scope).

### 1.9 Tests
Every renamed string is likely pinned somewhere in LeagueBuilderAuctionDraft.test.tsx /
WhisperPanel tests / AuctionStage tests. Builder greps each OLD string across src/ and updates
pins to the NEW string — assertions move, never weaken (exact match stays exact match).

---

## §2 PRIVACY — reveal-on-click, auto-hide (lane PRIVACY)

### JK's ruling (verbatim intent)
A team's Asst-GM intel must be hidden from everyone until the GM clicks **their own team name**;
it then reveals in full, and auto-hides after their bid/pass. Rationale: in pass-the-device
play, visible advisor intel leaks a rival's strategy and kills the game theory.

### Today (traced): the inverse
One WhisperPanel instance (AuctionStage.tsx:365) auto-follows whoever holds bidding action
(`activeWhisperSeatTeamId`, LeagueBuilderAuctionDraft.tsx:1061-1070, duplicated :1273-1279).
When action passes between two human teams the panel **flips open automatically** — no click,
no hide. The roster board mirrors this (`rosterBoardTeamState` :955-961) and its last fallback
grabs the first human team in array order. There is no team-name click handler anywhere in
AuctionStage.tsx. No per-user seat identity exists (only `Team.controlledBy: 'human'|'ai'`).

### Design
**Private (covered by default):** everything advisory — the whisper panel in full (headline,
numbers, chips, why-line, YOUR BOARD, bid-vs-pass) AND the decision-zone wallet numbers
(`Ceiling` / `Slots left`, AuctionStage:293-294), since a visible ceiling is strategy leakage.
**Public (always visible):** rosters (who each club has won), the lot, market band, log,
on-the-clock banner. A real auction room works this way: everyone sees the room; only you see
your book.

**State:** one new `revealedSeatTeamId: string | null`, default `null`.
- **Reveal:** clicking the acting team's name — two affordances, same action: the team name in
  the on-the-clock banner (onTheClockBanner.tsx) and the `ASST GM · {club}` strip (the existing
  `🔒 TAP FOR THE READ` cover, WhisperPanel.tsx:335-336, becomes the covered default every
  turn). Reveal is only possible for `activeWhisperSeatTeamId` (the human seat holding action)
  — rival names are not reveal targets for anyone else's intel.
- **Auto-hide (reset to null):** on bid, on pass, on claim resolution, on lot advance, and on
  any change of `activeWhisperSeatTeamId` or `session.currentLot`. Implementation: reset inside
  the `onBid`/`onPass` handlers (AuctionStage.tsx:332,339) + one effect keyed on
  (currentLot?.id, activeWhisperSeatTeamId).
- **While covered:** the whisper renders its existing dormant/cover shell; the wallet renders
  the bid controls with the numbers masked as `——` (controls stay operable only after reveal —
  the expected flow is: click your name → read → bid/pass → auto-cover).
- `rosterBoardTeamState` (:955-961): private board content gates identically; drop the
  `latestWinnerTeamState` / first-human-in-array fallbacks for private content (public roster
  view keeps working).
- CPU turns: unchanged (nothing advisory renders today; keep).
- Farm auction: the scout-report cover (AuctionStage:723-730) adopts the same auto-cover
  triggers so the two privacy patterns behave identically.

### Non-goals
No per-user accounts/seat identity (v1 is honor-system hotseat — the click IS the identity
claim). No changes to what CPU teams compute. No persistence of reveal state.

---

## §3 STAKES — "what you give up at $X" (lane STAKES)

### JK's ruling
When the GM bids against the advisor's pass, the risk must be concrete: which big-board targets
fall out of reach, and the tax bill as proof of how risky "risky" is.

### What already exists (traced)
`projectBidVsPass()` (auctionMarketModel.ts:691-812) already sweeps the whole remaining pool,
prices every target (`estimateMarket` low/median/high), nets THIS lot's marginal tax from
`budgetAfter` (:712, TAXWIRE), filters roster-stranding targets (:736-748), and returns
`{ownValue, predictedMedian, surplus, affordable}` top-N. WhisperPanel already renders it with a
`can't afford` chip (:694-711). `bidAmount` is an input the function already accepts — but the
page currently pins it to the current high bid (LeagueBuilderAuctionDraft.tsx:1427).

### Tier 1 — live reactivity (wiring)
The bid-vs-pass section recomputes at the GM's **contemplated bid** (the amount currently in
the bid stepper), debounced to bid-step changes, not just the standing high bid. Header becomes
`IF YOU WIN AT $X`. Each board target that is affordable in the pass scenario but NOT at $X gets
the chip `drops out at $X`. Baseline (pass scenario) column stays as-is. Render only when the
panel is revealed (§2) and a human is on the clock. Top-5 stays; targets ranked by the GM's own
board (rankOverrides blend already wired at :1598).

### Tier 2 — the keep-him cost (new engine math — this section is the spec)
New pure function in the engine layer (near auctionCompletionFloor.ts):

`keepTargetAllIn(team, lotPlayer, bidAmount, target Y, remainingPool, caps)` returns the all-in
cost of the plan "win this lot at $X and still land Y later":
1. `rosterAfterLot = roster ∪ {lotPlayer}`; `taxLot = luxuryTax(rosterAfterLot).charged −
   luxuryTax(roster).charged` (existing `auctionMarginalTaxWithCaps`).
2. `priceY = predictedMedian(Y)` (existing `estimateMarket`).
3. `rosterAfterY = rosterAfterLot ∪ {Y}`; `taxY = luxuryTax(rosterAfterY).charged −
   luxuryTax(rosterAfterLot).charged`.
4. `completion = cheapestLegalCompletion(rosterAfterY, remainingPool \ {Y},
   openSlotsAfter both)` (existing); `taxFill = luxuryTax(rosterAfterY ∪ completion).charged −
   luxuryTax(rosterAfterY).charged` (existing `completionTaxForQuote` shape).
5. `allIn = bidAmount + taxLot + priceY + taxY + completion.cost + taxFill`;
   `verdict = allIn ≤ budgetRemaining`; `shortfall = max(0, allIn − budgetRemaining)`.
**Bounded-semantics guard (standing C2B ruling):** every tax term is the incremental tax of a
CONCRETE set — never a hypothetical full-roster bill; steps 1/3/4 reuse the exact canonical
`luxuryTax()` deltas. If `cheapestLegalCompletion` returns infeasible → verdict `can't finish
the roster`, not a number.
Compute for the GM's **top-3 board targets** only, on the same debounce as Tier 1.

### Render (inside the bid-vs-pass expanded section)
Per target: `Your #2 — {Name}: still lands · all-in ~$Z, tax in` or
`Your #2 — {Name}: gone at this price — $W short`. One summary line when all three survive:
`Your top three still land after this.` No new panel; this deepens the existing section.

### Tests
Engine: unit tests for keepTargetAllIn (feasible / infeasible / zero-tax league / tax-heavy
stars-and-scrubs fixture reusing the gauntlet's production-default shapes). UI: render test for
the drops-out chip flip at a boundary bid. Gates per the lane map.

---

## §4 SETUPHELP — setup diagnostics behind Help (lane SETUPHELP)

### Findings (traced)
The 2026-07-08 TEXTLAW sweep held (all prior gates verified still in place), but ~1,400 lines of
post-sweep pool work added TWO raw engine-diagnostic dumps that render **unconditionally**:
- `Production shape: Balanced · demand 88 · … · barbell 0.34 · … · nonce 7 · G1 +5 · swaps 2`
  (LeagueBuilderDraftSetup.tsx:3766-3799, rendered :4770)
- `Manual pool: Balanced · … · hard overflow 0 · nonce …` (:3801-3840, rendered :4771)
These are debug traces shown to GMs as page content — exactly JK's ruling ("if it's explanatory
and not tied to a control, hide it behind Help").

### Design
1. Both dump lines move behind the existing `showHelp` gate (state :1467, toggle :4022-4029),
   byte-identical strings (they're tuning-valuable — JK and agents read them; GMs shouldn't).
   Use the established inline-gate variant (`{showHelp ? … : null}`), not a new pattern.
2. `Sized to {N} ({X}×): trimmed …, added … for affordability.` **stays visible** — it's a
   receipt of an action the user just took (STATUS class).
3. `{N} player(s) engine-generated to help fill the roster demand.` stays visible (live count).
4. No other new gates — everything else on the page is either already gated, CONTROL-ATTACHED,
   or STATUS/VERDICT by the standing A4 ruling (readiness panel, club check, tax watch stay).

### Test migration (exact, from the inventory)
Pinned assertions that must move to the click-Help-first pattern (mirror
money.test.tsx:273-306): `Production shape: Balanced` + substrings at poolLock.test.tsx:343-349
and :438; `Manual pool: Balanced` + `legal no` at poolLock.test.tsx:978-980. The `Sized to`
pins (money.test.tsx:728,750; poolLock.test.tsx:240,342,393) do NOT move (string stays visible).
Assertions move, never weaken.

---

## Standing rules restated for all four lanes
- Display-layer lanes never alter engine enums, thresholds, posture rules, or CPU behavior.
- A TAX word in copy only where tax is the marginal cause (V1_CANON §6).
- Repro-first where a behavior changes; byte-identical where only location changes.
- Full vitest + consuming-page suites in every lane's gates. Builder ≠ auditor. JK's browser
  walk remains the sole acceptance gate.
