# COCKPIT WIRING AUDIT — 2026-07-08 (JK-ordered full sweep after the frozen-verdict find)

**Trigger:** JK's browser walkthrough caught the Asst GM verdict static within a lot (high bid $128,291 past YOUR NUMBER $121,065, strip still "PUSH / Go get him" while the fine print said "Past your number — let him go"). JK ordered a full spec-to-wiring audit of the auction cockpit so we stop finding these one at a time.
**Method:** 5 parallel dimension auditors (spec completeness · engine orphans/stale inputs · farm bridge · board liveness · tax/one-ceiling) + a dedicated verdict-plumbing tracer; every non-OK claim then attacked by an independent adversarial verifier whose default stance was "refute it." 48 raw findings → 21 unique claims → **10 CONFIRMED · 5 downgraded · 6 REFUTED · 27 WIRED_OK**. Full evidence (file:line for every claim) in the session workflow record; fix contract: `spec-docs/contracts/CONTRACT_CALLFIX_2026-07-08.md`.

## §1 Root cause of the walkthrough bug (tracer-proven)
NOT a recompute/staleness bug: the whisper payload memo re-runs on every bid and the live bid IS passed into the engine on both floors. The verdict FORMULA (`worthVerdict`, rosterIntelligencePayload.ts) simply never consumes the bid — it answers "is he worth chasing in the abstract." Meanwhile the "past your number" guidance line and BID VS PASS cards do their own live comparisons in the component. Two code paths, one blind, so the panel contradicts itself. Identical on the farm floor (shared engine + shared panel).

## §2 CONFIRMED gaps (all in the CALLFIX wave unless marked)
| # | Gap | Class | Ruling |
|---|---|---|---|
| 1 | Verdict word/headline bid-blind (MLB + farm, shared engine) | FROZEN | Build THE LIVE CALL ladder (design §2.6) — single source for strip + headline + fine print |
| 2 | Tier-1 "top reason" chip is alphabetical, not priority-ranked (`.sort()` with no comparator discards the hand-ordered intent) | PARTIAL | Priority comparator per design §2.7 + a test that locks the order |
| 3 | Lot log names are plain text — the 4th ratified popover surface never built (fell between WT-D and W1c scopes) | MISSING | Build it: LogItemVM gains playerId, both floors, farm fog-gated like the on-the-block name |
| 4 | Auto-advance "Next up" line reads the pre-edit rank override for ~500ms after a live rank edit (board updates instantly, line lags) | FROZEN | Feed the line the same live overlay the board reads |
| 5 | `worth.chemistry` raw breakdown shipped on every payload, read by nothing | ORPHANED | Drop from payload (readout already surfaces the derived line) |
| 6 | `replacementValueEstimate` + `scarcityModifier` computed live, never rendered as numbers | ORPHANED | Surface replacement estimate in the scarcity chip tap-through ("next-best costs ~$X"); drop scarcityModifier from payload |
| 7 | `team.projectedTax` recomputed per team per lot, read by nothing (TRUE COST uses its own marginal-tax path — correctly) | ORPHANED | Delete the dead per-lot compute + field |
| 8 | Whisper payload's market read (contested/interested/likelyPass, per-seat-correct) never rendered; stage banner uses a second independent call with a different seat input — latent divergence | ORPHANED | Single-source: banner consumes the per-seat read when a human seat is active |
| 9 | Tier-1 strip can never show "VALUE" though ratified copy promises it (priceRead computes it live, buried in Tier 3) | PARTIAL | Fold into ladder: push-state headline gets the bargain flavor off existing priceRead |
| 10 | Luxury tax is display-only in the auction — never drains any budget; two identically-budgeted teams bid identically regardless of tax exposure | PARTIAL | **JK FORK — not in the wave.** See §4 |

## §3 The good news (verified wired, spot list)
YOUR NUMBER + TRUE-COST-after-tax (one figure, one ceiling, test-locked) · FIT chip · four lights incl. BALANCE correctly deleted-not-stubbed · BID VS PASS live per bid · WAIT/CHASE nomination odds · grade sanity chip (MLB-only) · CONTESTED chip lot-scoped · boards GM-sortable via one shared component at setup AND live · rank overrides apply instantly + persist debounced · SOLD players leave the pool and boards re-derive · auto-advance fires on SOLD only · farm bridge coverage-aware need genuinely wired (Handley/Ozzie distinction real) · farm fog law holds, no new leak · farm chem bridge built dark per fork · one-ceiling rule enforced on every affordability read · payload inputs are live net-of-wins (budgets, rosters, remaining pool). Six sweep claims were refuted by verifiers as spec-faithful behavior — the "going in circles" worry has a floor: 27 of 37 audited promises are provably wired.

## §4 The one JK decision (product economics — not built until ruled)
**Should the luxury tax have teeth inside the auction?** Today a team past the tax line sees TRUE COST on its whisper, but settlement subtracts salary only — the tax never actually reduces anyone's spendable budget, and max-bid ceilings ignore it. Recommendation: YES — charge the marginal tax at settlement so exposure drains real budget on subsequent lots (the whisper's TRUE COST then matches what actually happens). This changes measured draft economics, so it is JK's call, not a captain auto-build.
