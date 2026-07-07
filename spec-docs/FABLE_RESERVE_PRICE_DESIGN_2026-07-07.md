# LEVER A — RESERVE PRICES (design, build-authorized by JK Fork-A ruling 2026-07-07)

**Author:** Fable (design authority). **Evidence base:** ECONOMY_MEASUREMENT_2026-07-07.md (48 sim drafts: budgets die by spot 11 at 15–26% vs 35–45% target; 7–37 sales at $0–$1k per draft; stuck rosters nearly every draft; cheapestLegalCompletion quote = $0 everywhere; at k=0.65 the quote becomes 25–32% of cap — the missing cushion). **Parent plan:** DRAFT_ECONOMY_RESET_2026-07-05.md §4A.

## 1. The model
- **Reserve price of a player** = `max(LEAGUE_MINIMUM_SALARY, round(k × IV))`, IV = canonical `kblIV` (salary). One pure function, one owner module.
- **k** = the reserve dial. v1 stops: `0 (off) · 0.50 · 0.65 (default) · 0.80`. Session-scoped Draft Setup control in the same pattern as Pool Quality (session/URL carrier — NO schema migration). k=0 must reproduce today's behavior bit-for-bit (the escape hatch).
- **Opening bid** of every lot = its reserve. No bid below reserve is legal. CPU/shill opening logic floors at reserve (scout bands already price most lots above it).
- **Unsold lots** (no bid at reserve): pass out UNSOLD, remain in the pool, renominatable later. No price decay in v1 (defer to tuning).
- **End-of-draft auto-fill/backfill charges the reserve** of each auto-filled player. Free bodies cease to exist. **Amendment (2026-07-07, Lever A REJECT remediation):** in pool-exhaustion cleanup only, reserve yields to legal completion. If a reserve-priced cleanup fill would strand an otherwise completable roster, charge `max(minSalary, min(reserve, team-affordable))`; `team-affordable` is the team's remaining budget divided across its open slots. This exception does not apply to live bidding, lone-survivor claims, or forced fills before exhaustion.
- **The honesty payoff:** `cheapestLegalCompletion` / `estimateMinimumFutureFillReserve` (liquidityAwareBidding) compute future-fill costs with reserve-floored prices. Fill Reserve, Room, MAX BID, and the affordability guardrail all become real. This is the mechanism that stops the spot-11 collapse — teams physically cannot bid past the money they'll need.

## 2. Surfaces (and only these)
Engine: the new reserve module + `auctionExitGate`/completion-floor math + `liquidityAwareBidding` fill-cost floor + CPU/shill opening-bid floors + the C3 completion-guarantee cascade re-verified under floored costs (its backfill assumed cheap bodies — reconcile, don't bypass). UI: lot card shows "RESERVE $X" as the opening ask; Draft Setup gains the dial; Whisper copy already shows Fill Reserve/Room (numbers just become honest). Sim: `auctionSim` gains reserve support so the measurement campaign can gate it (biddingPolicies respect reserve; metrics count below-reserve sales as an invariant violation).
**Untouchable:** pool generation math (poolFromDemand), IV curves, salary engine, GameTracker, lens/franchise surfaces (other lanes), schema.

## 3. Acceptance (sim first, then feel)
1. Re-run the measurement campaign (same seeds/scenarios) at k=0.65: budget at spot 11 ≥ 35% mean (4-team fixture); ZERO sales below reserve; ZERO stuck/unfinishable rosters; roster spread strictly improved (report the number; ±5% is the tuning target, not this ticket's hard gate); determinism preserved.
2. k=0 leg reproduces today's numbers (no regression when off).
3. Suite zero-new-reds; focused auction suites green.
4. JK browser feel pass on a real draft (the closing gate, batched with the next draft session).

## 4. Deferred (recorded, not built)
Price decay for unsold lots · per-league persistent k (needs settings schema) · Lever B residuals (juiced elite cap, quality-dial bounds, universe-exhaustion fallback) · CPU tax-awareness interplay (separate spec).
