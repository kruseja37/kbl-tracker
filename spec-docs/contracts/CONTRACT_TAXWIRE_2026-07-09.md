You are a builder lane on KBL Tracker. Work ONLY in your assigned worktree on its branch; commit there; do NOT push or merge. Independent audit follows. node_modules if missing: `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`. Base: main @ 49c83d11.

FIRST COMMIT: write this entire prompt verbatim to spec-docs/contracts/CONTRACT_TAXWIRE_2026-07-09.md and commit before any code change.

═══ LANE: TAXWIRE — floor display wiring: the whisper's projections stop contradicting the tax (captain ruling from the adversarially-verified whisper tax-awareness audit, 2026-07-09) ═══
The tax drains real budgets (settlement = salary + team.projectedTax) and Tier-1 TRUE COST shows it — but three sibling readouts still project UNTAXED numbers in the same view. All three fixes REUSE already-computed values (no new tax math, no engine formula changes — this is wiring). Repro-first on each item.

## ITEM 1 (READ-1, the big one) — Bid-vs-Pass budgets and affordability go tax-net
src/engines/auctionMarketModel.ts:701-706 `project()`: `budgetAfter = won ? team.budgetRemaining - bidAmount : ...` — no tax term, though `team.projectedTax` (the CURRENT lot's exact marginal tax, the same number sessionBidCeiling reserves) is on the very team object in scope. Fix: the winning branch subtracts `team.projectedTax` too (`budgetRemaining - bidAmount - (team.projectedTax ?? 0)`); every downstream target-affordability flag (:789-795 `affordable: market.band.median <= budgetAfter`) inherits the corrected number automatically — verify nothing else re-derives an untaxed copy in the display pipe (displayBidVsPassBranch, LeagueBuilderAuctionDraft.tsx:283-306) or in WhisperPanel renders (:571-578, :678, :708). NOTE the internal asymmetry the audit found: rival maxBid at :761 already routes through the tax-aware sessionBidCeiling — your fix makes the advised GM's own branch consistent with it. Repro: tax-exposed team fixture (projectedTax > 0), assert the BID branch's budgetAfter today equals the UNtaxed value (red against correct expectation), then fix → budgetAfter === budgetRemaining - bid - projectedTax, and a target whose affordability flips from the correction is asserted flipped. Zero-tax teams byte-identical (lock test).

## ITEM 2 (BOARD-2 prong B) — the "can't afford" chip compares against the tax-aware ceiling
The audit found a Bid-vs-Pass affordability comparison using raw leftover budget while a tax-aware ceiling sits in scope in the same function (locate via the audit trail: auctionMarketModel.ts project()/target branch — the chip driven solely by target.affordable at WhisperPanel.tsx:708). After Item 1, verify whether this prong is fully subsumed (likely) — if any remaining comparison still uses an untaxed base where a tax-aware equivalent is in scope, fix it the same way; if Item 1 subsumes it entirely, PROVE that in the contract (test that the chip now flips for the tax-exposed fixture) instead of changing more code.

## ITEM 3 (C1) — the truncated reason display stops eating the tax reason
The whisper's Tier-1 shows one reason chip; the audit found the engine computes a tax-completion reason correctly but the UI's `reasons[0]` slice can silently drop it behind e.g. "fragile" when both are true. Since CALLFIX, reason ORDER comes from the explicit REASON_PRIORITY comparator in src/engines/liquidityAwareBidding.ts — the RIGHT fix is priority placement, not display change: verify where the tax-completion reason code ranks in REASON_PRIORITY; per the ruled ladder (hard blockers > liquidity emergencies > scarcity > fit/need > informational) a needs-tax-to-complete signal is liquidity-emergency class — if it ranks below chattier codes, move it to its ruled slot in the PRIORITY array (a one-array-entry move, comparator machinery untouched) and extend the existing priority lock test. If it already ranks correctly and the truncation is elsewhere (a UI-side slice bypassing the sorted order), fix THAT wiring instead. Show which case it was in the contract.

═══ GUARDRAILS ═══
NO engine formula changes (the only permitted engine edits: the one-line budgetAfter subtraction in auctionMarketModel.ts and, if Item 3 requires it, the one-entry move in the REASON_PRIORITY array). NO changes to worthToYou/liveCall/sessionBidCeiling/completion math (a separate TAXENGINE lane owns Fill Reserve/Room/posture — do not touch liquidityAwareBidding beyond the priority array, do not touch auctionCompletionFloor at all). Farm floor: farm is tax-free — verify your changes are inert there (projectedTax 0 → byte-identical; farm suite green). F9 one-ceiling tests + CALLFIX ladder tests + TAXTEETH coherence tests must all stay green untouched. Existing testids stable. Do NOT touch LeagueBuilderDraftSetup.tsx or its tests (a concurrent lane is splitting them).

═══ GATES (paste real outputs) ═══
npx tsc -b clean; npm run build exit 0; focused suites: auctionMarketModel tests (if present), WhisperPanel, LeagueBuilderAuctionDraft (+ computeBoardAutoAdvanceLine), LeagueBuilderFarmAuctionDraft, liquidityAwareBidding, rosterIntelligencePayload. NOT the full suite.

═══ DELIVERABLE ═══
Contract-first; failing-repro commits BEFORE fixes; final contract update with per-item evidence (incl. the Item 2 subsumption proof or fix, and the Item 3 case determination), gate outputs, deviations flagged. Final message: summary + hashes + surprises. UNKNOWN = STOP and report.

═══════════════════════════════════════════════════════════════════════════
FINAL EVIDENCE (2026-07-09, builder lane, branch `worktree-agent-abde5bc80f86cc0d3`, base `49c83d11`)
═══════════════════════════════════════════════════════════════════════════

## Commits (in order)
1. `b35c10f0` docs(contract): TAXWIRE — floor display wiring lane contract (this file)
2. `ae7ebd07` test(repro): TAXWIRE Item 1 -- prove bid-branch budgetAfter ignores projectedTax (RED)
3. `2a0cfd49` fix(auction): TAXWIRE Item 1 -- bid-branch budgetAfter nets team.projectedTax (GREEN)
4. `a611fd44` test(auction): TAXWIRE Item 2 -- prove the "can't afford" chip is fully subsumed by Item 1
5. `9494c6ba` test(auction): TAXWIRE Item 3 -- prove the tax signal already wins the Tier-1 reason slot

Diff vs base (`git diff 49c83d11..HEAD --stat`): 5 files changed, 297 insertions(+), 1 deletion(-) --
the contract doc, one 10-line comment+fix hunk in `auctionMarketModel.ts`, and three test files
(`auctionMarketModel.test.ts`, `WhisperPanel.test.tsx`, `liquidityAwareBidding.test.ts`). No other
source file touched. `LeagueBuilderDraftSetup.tsx` and `liquidityAwareBidding.ts` (the source file)
are both untouched, as guarded.

## ITEM 1 -- fixed
`src/engines/auctionMarketModel.ts` `projectBidVsPass()`'s `project()` closure: the winning
branch's `budgetAfter` now subtracts `team.projectedTax ?? 0` alongside `bidAmount`, matching the
exact settlement math `finalizeSoldLot` charges (`auctionStateMachine.ts:905`,
`budgetRemaining - salary - projectedTax`) and the ceiling `sessionBidCeiling` already reserves for
the same team. PASS is untouched (never owes this lot's tax).

Repro (RED, before the fix, `auctionMarketModel.test.ts`): a 3-team fixture (`me` with an $8,000
marginal tax on the current lot, `rival`/`rival2` on far larger budgets so neither ever binds, and
neither ever prices off `me`'s own clamp) --
`expected 42000 to be 42000` failed with `received 50000` (the untaxed figure) before the fix.

Post-fix (GREEN): `bid.budgetAfter === 42_000` (`60_000 - 10_000 - 8_000`); `pass.budgetAfter`
unchanged at `60_000`. A real target ("flip", IV $78,000) flips: `predictedMedian` is $43,690 --
strictly between the taxed ($42,000) and untaxed ($50,000) ceilings -- so `affordable` reads `true`
on the (buggy) untaxed PASS-equivalent comparison and `false` on the corrected BID branch, while
staying `true` on the real PASS branch (no tax owed there). Zero-tax lock test
(`projectedTax === 0`, the shape every real team under the tax threshold carries) is byte-identical
at `budgetAfter === 275_000`.

## ITEM 2 -- subsumed, no code change (proof test added)
Traced the full display pipe: `LeagueBuilderAuctionDraft.tsx`'s `displayBidVsPassBranch`
(:283-306) passes `affordable: target.affordable` and `budgetAfter: branch.budgetAfter` through
VERBATIM -- no re-derivation. `WhisperPanel.tsx:708` renders `!target.affordable` -- also no
re-derivation, no second comparison anywhere. A repo-wide grep for `affordable` in
`src/engines/`/`src/src_figma/` turned up exactly one boolean computation
(`auctionMarketModel.ts:794`, fixed by Item 1) feeding this chip; no second, untaxed comparison
exists. Item 2 is fully subsumed by Item 1 -- confirmed structurally, not just asserted.

Proof (`WhisperPanel.test.tsx`, new test): fed the REAL engine's `projectBidVsPass` output (the
identical Item 1 tax-exposed fixture) straight through `WhisperPanel` and confirmed exactly one
`"can't afford"` chip renders, scoped to the taxed BID branch card, absent from the untaxed PASS
branch card, for the identical candidate.

## ITEM 3 -- investigated, no code change needed (determination below)
**Case: already ranks correctly, and no UI-side bypass exists either -- a case the contract's two
named forks didn't quite anticipate.** There is no dedicated "tax-completion" `LiquidityReasonCode`
in `src/engines/liquidityAwareBidding.ts` -- the 12-code union has nothing tax-named. The marginal
tax reaches `evaluateLiquidityAwareBid` entirely through `legalMaxBid`:
`assembleWorthToYou` (`rosterIntelligencePayload.ts:370`) computes
`fallbackLegalMax = uncappedLegalMax - marginalTax` and passes that reduced ceiling straight
through (landed already, TAXTEETH Item 2, commit `391f2e2f`). When a tax squeeze actually binds
(`nextBid > legalMaxBid`), `buildReasonCodes` fires `'above-legal-ceiling'` -- which is already
**rank 0** in `REASON_PRIORITY` (`liquidityAwareBidding.ts:254-272`), a **hard blocker**, ranked
even above the "liquidity-emergency" class the contract's audit description named for this signal.
Traced `topReason = worth.reasonCodes[0]` (`WhisperPanel.tsx:510`) all the way back through both
`rosterIntelligencePayload.ts` passthroughs (:416 MLB, :1053 farm) to the engine's own
`.sort(compareReasonPriority)` (`liquidityAwareBidding.ts:242`) -- no re-ordering or bypass exists
anywhere in that chain. Net: the real tax-driven signal, whenever it actually constrains a bid, was
**already** guaranteed the Tier-1 slot before this lane started; it can never be displaced by any
other code in the ladder. REASON_PRIORITY was left untouched (no one-entry move was needed).

Proof (`liquidityAwareBidding.test.ts`, new test, extends the existing CALLFIX Item 2 priority lock
fixture): reused the exact fixture that alone produces `future-fill-protected` + `emergency-fill` +
`late-budget-surplus` (with `'future-fill-protected'` previously winning the slot) and tightened
`legalMaxBid` from $100,000 to $65,000 -- simulating a $35,000 marginal-tax reservation on the same
lot. `'above-legal-ceiling'` now wins the slot outright:
`reasonCodes === ['above-legal-ceiling', 'future-fill-protected', 'emergency-fill', 'late-budget-surplus']`.

## Gate outputs (real, paste-verified)
- `npx tsc -b` (project has no `--clean` flag semantics; `-b` alone is the project build/typecheck
  gate) -- exit 0, no output (clean).
- `npm run build` -- exit 0. Final lines: `✓ built in 10.50s`, PWA precache 186 entries generated,
  `dist/sw.js` / `dist/workbox-*.js` written. (Pre-existing chunk-size warning is unrelated/baseline,
  not introduced by this diff -- confirmed no new large chunk from this change.)
- Focused suites (exact contract list), `npx vitest run` on all 7 files in one pass:
  `auctionMarketModel.test.ts` (22), `WhisperPanel.test.tsx` (44),
  `LeagueBuilderAuctionDraft.test.tsx` (21), `LeagueBuilderAuctionDraft.computeBoardAutoAdvanceLine.test.ts` (20),
  `LeagueBuilderFarmAuctionDraft.test.tsx` (2), `liquidityAwareBidding.test.ts` (9),
  `rosterIntelligencePayload.test.ts` (41) -- **7 files, 159/159 tests passed.**
- Supplementary net (not in the literal contract list, run anyway to protect the named-but-unlocated
  F9/CALLFIX/TAXTEETH markers): `auctionCompletionFloor.test.ts` (32), `auctionLuxuryTaxSettlement.test.ts` (4),
  `AuctionStage.test.tsx` (23), `useAuctionDraft.test.ts` (19) -- **4 files, 78/78 tests passed.**
- Farm inertness: `projectBidVsPass` is not imported/called anywhere in
  `LeagueBuilderFarmAuctionDraft.tsx` at all (grep returns nothing) -- Item 1's fix is structurally
  unreachable from the farm flow, not merely test-green. `useAuctionDraft.ts` always sets
  `projectedTax: 0` on the farm/init paths (:222, :264, :368) -- the fix is a byte-identical no-op
  anywhere `projectedTax` is 0, which is every real team under the tax threshold.

## Deviations from the contract
- Item 2 and Item 3 required no source changes (both fully subsumed/already-correct) -- per the
  contract's own instructions ("PROVE that... instead of changing more code" / "Show which case it
  was"), this is the compliant outcome, not a shortfall. Both are backed by new proof tests wired to
  the real engine, not assertions of intent.
- `npx tsc -b clean` as literally written 5-arg-parses as building a project named `clean`
  (`tsconfig.json` lookup failure) -- ran `npx tsc -b` instead (the project's own `build` script's
  typecheck step, `tsc -b && vite build`), which is what "tsc -b clean" evidently meant (a clean/green
  `tsc -b` run). Flagged here rather than silently reinterpreted.
- Ran 4 additional test files beyond the contract's literal 7-file gate list, to directly protect the
  guardrail's named-but-unlocated "F9 one-ceiling / CALLFIX ladder / TAXTEETH coherence" test
  obligation (found via grepping test files for those markers). All green, zero changes needed.

## Surprises for the auditor
- The whisper's own "self as a market bidder for OTHER targets" design (`project()`'s `rivalViews`
  includes `isSelf: true` with `advisedTeamId` only excluded from the CONTESTED count, not from
  `estimateMarket`'s valuation ranking) means Item 1's `budgetAfter` fix can also shift
  `predictedMedian` for OTHER targets shown in the same Bid-vs-Pass call, whenever the advised GM's
  own clamped valuation is what sets the market's second price. This is pre-existing behavior
  (unchanged by this lane) surfaced during repro construction, not a new bug -- flagging for
  awareness since it means "same-target medians differ between BID/PASS or before/after this fix"
  is possible and expected in some fixtures, not a regression signal on its own.
- No commit, worktree, or written finding for the "whisper tax-awareness audit" referenced in this
  contract's opening line could be located in this worktree's history or in `spec-docs/` --
  `CONTINUITY_CHECKPOINT.md` (as of the booking pass at `03f4e5d1`) independently notes the same gap
  ("captain-reported... could not locate a worktree, branch, or contract file for this thread").
  Item 3's specific claim ("a needs-tax-to-complete signal is liquidity-emergency class") turned out
  to not match the code as it actually stands (it's a hard-blocker-class code, ranked higher, not
  lower) -- surfaced as a finding above rather than treated as ground truth to force-fit.
