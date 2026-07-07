# DRAFT ECONOMY RESET — stars/scrubs auction failure, first-principles plan

**Date:** 2026-07-05 · **Author:** Fable 5 (design authority) · **Status:** PICKUP DOC — no code exists yet; everything built 2026-07-05 was REVERTED by JK as slop. Tree is clean at `7b5214ca`.
**Rule for the next session:** nothing in this doc is build-authorized. It is a reasoning map. Every repo claim below is tagged VERIFIED (checked in-session 2026-07-05, pre-revert, against code that predates the revert) or VERIFY-FIRST (must be re-proven with file:line before any design is finalized).

---

## 1. THE PROBLEM (JK's own words, the acceptance target)

Design-first extraction builds a pool that is technically draftable but shaped like a barbell: **superstars and scrubs, almost nothing in between.** Observed draft behavior in JK's real league (4 teams, ~$1M cap):

1. Teams bid each other up for the stars early.
2. By roster spot ~11 of 22, teams have <$100k of $1M left.
3. They then wait, cherry-pick, and finally **auto-fill** rosters from players nobody bid on.
4. Result: rosters are "too stacked, too juiced" — half stars, half free scrubs, no middle class.

**Pristine state (the goal):** an auction where budgets last the whole draft, the middle of the pool is contested, passed-on players are not free, and no team can hoard stars — OR a deliberate pivot away from auction (see §6 Fork B).

---

## 2. WHAT WAS TRIED 2026-07-05 AND WHY IT DIED (do not re-walk this path)

Three slices were built, audited, and then all reverted by JK:

1. **Grade-curve as a selector** (B-/C+ curve driving cell picks, trim, and repair). Audit verdict: mechanically sound, **economically unproven and structurally unable to work** — the stars and scrubs are the *protected* picks (archetype floors + cheap-depth + reservations), so a post-assembly curve can only evict the middle. It also silently overrode three JK-approved laws (price-spread cells, fit-first trim, cheapest/fit repair) with no design ruling.
2. **Curve as read-only diagnostic** (audited SAFE) — reverted with the rest.
3. **Pool Advisor read-only consolidation** (audited SAFE TO COMMIT) — reverted with the rest.

**The durable lesson:** the barbell is not a trimming problem. The pool builder *engineers* the barbell — top-IV pulls guarantee archetypes, cheapest pulls guarantee affordability, nothing anywhere asks for the middle. Any fix must change **what gets pulled** or **what things cost in the room**, not filter afterward. A second lesson: unauthorized math changes get reverted; the next attempt goes design-doc-first, JK-ruled, then built.

---

## 3. FIRST-PRINCIPLES DECOMPOSITION (why the failure happens)

Two independent mechanisms, both required for the observed failure:

**M1 — Pool shape (supply).** VERIFIED 2026-07-05: `structuralFloor` in `src/engines/draftPoolExtractor.ts` pulls per-position bodies sorted **top-IV-first** (`byIvDescIdAsc`), plus cheap-depth quotas (2026-07-04 affordability arc); demand-cell reservation in `src/engines/poolFromDemand.ts` uses `priceSpread` — evenly spaced picks across the price-sorted match list, which by construction includes the **cheapest and the most expensive** endpoints. So the deliberate pulls are extremes; the middle enters only as priceSpread midpoints. If the pool holds ~N stars per team instead of ~2–3, stacked rosters are possible no matter what the auction does.

**M2 — Auction economics (demand).** VERIFIED in spirit, VERIFY-FIRST in detail: the auction has a can-you-still-finish guard (`cheapestLegalCompletion`, committed in `570b56f3` require-a-closer fix) that reserves budget for the cheapest legal completion of the roster. When the pool's cheap tail costs ~$1k/body, the guard reserves ~$11k for 11 open slots — so it happily approves star bids down to ~$100k left. **The guard works; the near-free scrubs make it meaningless.** Separately, unsold players cost nothing at auto-fill, so "wait and scoop" is a dominant strategy.

**The interaction:** M1 supplies too many stars and a free tail; M2 lets teams convert the whole budget into stars because the tail is free. Fixing only one leaves a failure mode: fix M1 alone and bidding wars still front-load budgets (softer, but present); fix M2 alone and the pool still only *contains* stars and scrubs to buy.

**Numbers to ground the design (VERIFY-FIRST, measure in-repo):** for the 4-team fixture — pool size, count of players by grade band (use `scoreSmb4Player`, the canonical oracle in `src/engines/smb4GradeEmulator.ts`), sum of top-22-by-IV vs cap, median player IV vs (cap / 22) ≈ $45k/slot. The barbell claim must be shown as a measured histogram before any design is ratified. (The reverted diagnostic did exactly this; rebuilding a measurement harness as a THROWAWAY SCRIPT — not shipped UI — is the cheapest way.)

---

## 4. CANDIDATE LEVERS (design sketches, none authorized)

### Lever A — Reserve prices: opening bid = fraction of IV (JK's idea, strongest cheap lever)
Every player's opening/reserve price = `k × IV`, k a dial (start ~0.6–0.7; 1.0 kills bargain-hunting and exposes any IV miscalibration directly). Three effects at once:
- The `cheapestLegalCompletion` guard becomes honest — 11 open slots now reserve 11 × (real money), so a team **cannot** bid itself to $100k with half a roster open. This is the direct counter to the observed failure.
- Passed-on players stop being free; "wait and scoop" dies.
- Auto-fill charges the roster fairly (auto-filled player costs its reserve).
Open design questions: unsold-at-reserve handling (price decay? shill absorb? end-of-draft at reserve?); interaction with shill bidding; whether k is per-league or fixed. Surface: auction flow + exit-gate math, NOT the pool builder. VERIFY-FIRST: where opening price is set today, and every place that assumes $0/nominal openers.

### Lever B — Curve-quota pulls: reshape the pool at the source (JK's idea, done at the right layer)
Replace "top-IV per position" floors and priceSpread-endpoint cells with **graded-ladder quotas**: per position/arm class, per team, pull ~1 elite / 2 strong / 4–5 core (B-/C+) / small cheap tail — selecting **fit-first within each band** (fit stays the law; the curve only sets how many candidates come from each shelf). Elite scarcity (~2–3 per team in the whole pool) makes "stacked" impossible by construction. This is a redesign of `structuralFloor` + cell reservation and MUST go through: Fable design spec → JK ruling → Codex build → Opus adversarial audit. It must NOT touch the fit-first law, protected classes, G1, or hand-edit preservation. VERIFY-FIRST: current floor quotas, cheap-depth constants, and whether the universe itself even *has* a middle (if uploads are barbell-shaped, quotas need a fallback rule).

### Lever C — Budget-shape guard (cheap complement, possibly free)
A per-bid or pre-draft rule of thumb: cap what fraction of budget can be committed by roster spot N (e.g., a soft "pace" warning or a hard schedule). Rejected as primary (paternalistic, fights the fun), but a **pace readout** in the auction UI is cheap and honest. Park for v1.1 unless trivially attachable to Lever A.

### Recommended combination: **A then B.** A is small, independent of the pool builder, and directly kills the observed spend-to-broke behavior even against today's barbell. B is the structural fix. Measure (the §3 histogram + a replayed 4-team draft) after each.

---

## 5. EXECUTION DISCIPLINE (how this gets built without slop)

1. **Measure first.** No design ratified until the §3 numbers exist from the real repo (throwaway harness script, output pasted into the design doc). Assume the barbell hypothesis is wrong until the histogram proves it.
2. **One lever per contract.** Lever A and Lever B are separate Codex contracts in `PROMPT_CONTRACTS.md`, each with explicit surfaces, forbidden files, and acceptance tests written BEFORE build.
3. **Verify every seam at point of use.** Every file:line in the eventual specs must be re-read from source in that session — the 2026-07-05 audits are stale the moment anything merges.
4. **Laws restated in the contract:** fit-first trim, price-spread cells (until B explicitly supersedes it BY RULING), cheapest/fit repair, protected classes (reservations/claims/floors/pins), G1 seating, hand-edit preservation, determinism (id-tiebroken), no new storage without the 4–5-registry check.
5. **Acceptance = economics, not mechanics.** The gate for each lever is a replayed 4-team draft showing: budget remaining at spot 11 ≥ ~35–45% of cap (tune with JK), zero (or priced) auto-fills, and pool grade-median in the B-/C+ band with elite share ≤ ~12–15%. Plus the standard gates: build exit 0, full vitest, JK browser pass.
6. **Fable designs, Codex builds, Opus audits adversarially.** No agent audits its own diff. No math change ships without a JK ruling recorded in DECISIONS_LOG.

---

## 6. THE FORK (JK decision, next session's first question)

**Fork A — Fix the auction** (Levers A + B above). Preserves the auction experience JK built the whole Mode-1 flow around. Cost: two design specs + two builds + measurement. This is my recommendation *if* the §3 measurement confirms the mechanisms — the failure is explainable and both levers attack verified causes.

**Fork B — Pivot to a traditional draft (snake) with salary cap + luxury tax per archetype logic.** Honest assessment: it sidesteps M2 entirely (no bidding wars, no budget-torching — slot order distributes stars evenly by construction) and shrinks M1 to "the pool should still have a middle" (Lever B still wanted, softer). Cost: a new draft flow (order, pick clock, CPU pick logic per archetype band priorities, cap/tax enforcement at pick time), and it retires a large audited auction investment (per-pick persistence, whisper/asst-GM, exit gate, shills). The existing soft-tax ruling (2026-06-30) and archetype band priorities are reusable. Choose B only if JK's real preference is the *draft feel* over the *auction feel* — it is a product call, not an engineering escape hatch; the auction failure is fixable.

**Recommendation: Fork A**, with Fork B held as the fallback if a post-Lever-A+B test draft still feels wrong in the browser.

---

## 7. PICKUP CHECKLIST (first 30 minutes of the next session)

1. Session start protocol (SESSION_RULES → AUDIT_LOG → AUDIT_PLAN → SESSION_LOG → CURRENT_STATE), then read THIS doc.
2. Confirm tree state: `git log --oneline -3` should show `7b5214ca` lineage; `src/engines/poolQualityCurve.ts` must NOT exist.
3. Run the §3 measurement harness (write it fresh, throwaway) and paste the histogram + budget math into a new section of this doc.
4. Put the Fork (§6) and the reserve-fraction dial (§4A) to JK as plain decisions with recommendations.
5. On Fork A approval: Fable writes `FABLE_RESERVE_PRICE_DESIGN.md` (Lever A) first; Lever B spec only after A ships and is re-measured.

**Key surfaces map (all VERIFY-FIRST at pickup):** pool builder `src/engines/poolFromDemand.ts` + `src/engines/draftPoolExtractor.ts` (structuralFloor, EXTRACTOR_TUNING); grade oracle `src/engines/smb4GradeEmulator.ts` (scoreSmb4Player, calibrated thresholds); IV/pricing `src/data/ivCurves.ts` + salaryCalculator (salary === IV); auction guard `cheapestLegalCompletion` (require-a-closer commit `570b56f3`); seating/legality `src/engines/rosterDesignFeasibility.ts` (seatAllClubs) + `src/engines/auctionExitGate.ts`; draft-setup wiring `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx`.

---

## 8. ADDENDUM (JK questions, 2026-07-05, answered by Fable)

### 8.1 Draft sim harness (Q: replace hours-long browser tests?) — YES, keystone build
Headless auction simulator: (pool, seats, budgets, per-CPU bidding policy) → full draft in seconds → rosters + budget curves + pick log. The L-SIM pattern applied to the draft. VERIFY-FIRST at pickup: how much of the bid loop is UI-embedded vs engine-pure; if embedded, step 1 is extracting a pure auction engine (worth it regardless). JK browser pass remains the FEEL gate; the sim becomes the MEASUREMENT gate. This harness is a prerequisite for §8.2 and §8.3 and should be Lever 0 — built BEFORE tuning A/B.

### 8.2 Controlled roster balance (Q: game-theory ±5% instead of guess-and-check?) — YES, conditionally
Auction theory: equal budgets + rational bidders + honest prices → value-parity rosters (teams buy different SHAPES of the same total value). Today's violations: barbell supply (M1) + meaningless budget guard (M2) make "rational" = hoard-stars-eat-free-scrubs. Method: define a roster-strength score (candidate: sum of IV; better: optimizer-projected strength — design choice for the Lever-B spec), then closed-loop tune (reserve k, curve quotas) over hundreds of rational-CPU sim drafts until roster-strength spread ≤ ±5%. This is engineering to a measured target. NOT guaranteed: a deliberately bad human bidder still loses — correct behavior, skill matters inside a fair economy.

### 8.3 Asst GM true intelligence (Q: real per-GM guidance or glorified cap calculator?) — REAL, three computable pillars
Current blandness diagnosis: guide computes from near-seat-agnostic inputs. Rebuild on:
1. **Marginal value** — player's worth TO THIS SEAT = value over next-best remaining alternative given roster-so-far + archetype + slots left (assignment math; fit scorers + optimizer already exist).
2. **Scarcity forecast** — remaining supply per class vs ALL clubs' remaining needs → "last realistic shot" vs "let it go" calls.
3. **Opponent pressure** — rivals' budgets + needs are known state → bid-up vs walk advice.
Validation gate (in the §8.1 sim): a CPU following Asst-GM advice must measurably beat a naive bidding policy across N sim drafts, else the guide is decorative. Asst-GM rebuild sequences AFTER the economy is fixed (advice inside a broken economy optimizes the wrong game).

**Revised build order: Lever 0 (sim harness) → measure §3 → Lever A (reserve prices) → Lever B (curve quotas) → tune to ±5% (§8.2) → Asst GM marginal-value rebuild (§8.3).** Fork B (§6) decision still precedes Levers A/B.
