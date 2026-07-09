# CONTRACT ADDENDUM: GAUNTLET REWORK — the STOP finding was a HARNESS BUG; complete the gauntlet with a faithful drive

**Read first:** the original CONTRACT_GAUNTLET_2026-07-09.md (committed here) still governs D1-D7. This addendum incorporates the adversarial verification verdict on your STOP finding. Same rules: this worktree only, commit here, no push/merge, STOP on new surprises.

## THE VERDICT ON YOUR STOP (opus verification, executed evidence)
Your D1 strand was a HARNESS artifact, not a product gap: (1) the zero-tax control stranded IDENTICALLY (worse — 3 teams), exonerating the tax; (2) the real competitive path (cpuBidOnLot + cpuDecideLoneSurvivor) COMPLETES D1's exact pool with real tax (~$3.13M charged, 176 settlements, all rosters legal); (3) engine settlement math verified exact across 314 settlements (charge === salary + projectedTax every time). Diag evidence is committed in this worktree: auctionGauntletDiag.test.ts (commits f355b5df + 3f94a499); your harness preserved at 79feca42.

## REQUIRED FIXES (from the verification — apply all five)
1. All-pass drives must settle lone survivors AT RESERVE via claimLoneSurvivor/strandSafeClaimTransition (the contract §D4 semantics; matches draftPipeline.integration.test.ts:192) — never passLoneSurvivorOut (your :724-726/:749 decline pattern forced 100% of construction through greedy terminal backfill against a zero-slack closer supply; that is what stranded).
2. Drive D1-D3 with the competitive need-aware path (cpuBidOnLot/cpuDecideLoneSurvivor). Keep at most ONE all-pass-at-reserve draft as the passive-market case.
3. Pool-first parity: drop poolSourceMode:'team-roster-priority'/priorityIds from the extraction config (production pool-first does not pass them — LeagueBuilderDraftSetup.tsx:2480-2494) or document the deviation prominently; your config produced an exactly-8-closers-for-8-teams pool with zero slack.
4. Fix or remove the instrumentTransition self-consistency assertion (:615-617) — it false-fails on competitive lots due to diff-based result pairing under reserve renomination/supersede; the engine is provably exact (see the diag's two independent settlement recorders — reuse that recorder pattern for your D5 exact-marginal evidence instead).
5. No product export needed (applyAuctionLuxuryTaxForLot already exported) — keep product code untouched.

## THEN COMPLETE THE ORIGINAL DELIVERABLE
All of D1-D7 per the original contract: 6-8 drafts, both pool modes (design-first with real TeamDesignInput[] remains REQUIRED and first-ever), tax-extreme + stars/scrubs seatings, per-team assertions (slots 0, legal incl. closer, budget >= 0, accumulated charged tax === engine math with the recorder pattern), the D6 squeeze/measurement tables (charged vs implied liability divergence on the known untaxed cleanup paths; forced-fill counts), deterministic seeds, runtime <~120s or shard. Gates: tsc -b clean, npm run build exit 0, the gauntlet suite green with tables in output, the four dependency suites green. Update THIS file plus the original contract's evidence section. Final message: summary + hashes + the D6 tables + any new surprises (STOP rule stands).

## ONE ADDITIONAL MEASUREMENT (captain adds, cheap)
The verification observed a low-severity anomaly: under degenerate drives, greedy cheapestLegalCompletion/backfillFromPassedLots can skip a completion that exists (price-ordering sensitivity). Your gauntlet runs should COUNT how often any team ends short while legalCompletionFeasibleAtMin was true at its final evaluation, and report it in the D6 tables (expected: zero under faithful drives — if nonzero, report, don't fix).
