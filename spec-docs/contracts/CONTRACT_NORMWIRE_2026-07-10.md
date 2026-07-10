# CONTRACT — NORMWIRE: every advisory tax surface uses league-size-normalized caps (2026-07-10)

**Builder:** Codex (xhigh). **Auditor:** independent opus. **Captain:** Fable.
**Branch:** codex/normwire. Base: main @ 0be79147.
**Git discipline:** no git write commands; captain cuts commits; APPEND report here.
UNKNOWN = STOP-and-report.

## The finding (verified sweep, 2026-07-10)
Post-CAPFIX, the auction's REAL settlement path normalizes caps by league size
(useAuctionDraft buildAuctionLuxuryTaxContext with leagueTeams.length — correct). But every
ADVISORY surface still consumes raw stock caps: for any non-20-team league, the advice
contradicts the engine. Call sites (verified):
1. Draft Setup THE MONEY / CLUB CHECK / TAX WATCH — buildBest22Target → buildIdentityRoster
   (archetypeBalanceSimulator.ts :72,:210,:431,:446) — NO club-count parameter even exists.
2. Auction TRUE COST / whisper marginal tax — LeagueBuilderAuctionDraft.tsx ~:1619-1636
   (registeredPool?.luxuryCaps ?? LUXURY_CAP_TABLES[identityTier], unnormalized). The nearby
   comment claiming it "can never structurally diverge" from settlement is FALSE for
   non-20-team leagues — delete/correct the comment.
3. WhisperPanel keepTargetAllIn call site — same page ~:1808, same unnormalized caps.
4. liquidityAwareBidding completion tax (:192-194) — transitively unnormalized via caller.
5. LeagueBuilderTeams identity cap-shift preview (~:785,:798) — lower stakes, normalize for
   consistency.

## Build (the honest-numbers law: advisory ≡ settlement, always)
- Thread the REAL non-shill club count to every advisory cap consumer; normalize via the
  existing shared normalizeAuctionLuxuryCapsForLeagueSize at the same seam settlement uses.
  For best22Target/archetypeBalanceSimulator: add the club-count (or pre-normalized caps)
  parameter through the call chain — do NOT default it to 20 silently; every live caller must
  pass the real count. If a call chain has no access to the count, STOP-and-report the seam.
- The shared normalize function and settlement path are UNTOUCHED (consume, don't modify).
- Repro-first: for a 2-team fixture, pin (a) advisory TRUE COST ≠ settlement tax pre-fix →
  ≡ post-fix (exact equality on the same lot/team); (b) TAX WATCH/club-check banner values
  pre/post; (c) a 20-team fixture asserts advisory values BYTE-IDENTICAL pre/post (the
  no-change tripwire — at 20 teams normalize is identity).
- Sweep completeness: after your fix, grep-prove NO remaining consumer of
  LUXURY_CAP_TABLES/registeredPool.luxuryCaps reaches tax math unnormalized outside of
  (a) the normalize function itself, (b) test fixtures, (c) the tier data definitions.
  List every consumer in the report with its verdict.

## Gates
tsc; build; the DraftSetup split suites + auction page/whisper suites + best22Target/
archetypeBalanceSimulator suites; ONE full vitest (known solo flakes list applies).
APPEND report: per-site disposition, repro red proof, the 20-team tripwire evidence, the
completeness grep table.
