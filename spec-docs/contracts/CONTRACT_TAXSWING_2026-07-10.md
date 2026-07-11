# CONTRACT TAXSWING — single-assignment swing-arm luxury tax (JK-ruled 2026-07-10)
Captain: Fable · Builder: Codex gpt-5.6-sol xhigh · Branch: codex/taxswing
Base: main @ HEAD (post PR #67). ECONOMY-CRITICAL — settlement tax change, both drafts.

## THE RULING (JK, 2026-07-10, verbatim intent)
Today `luxuryTax` (src/engines/leagueConstruction.ts:253-256) counts an SP/RP swing arm
in BOTH the rotation and bullpen tax groups — his ratings can be charged twice, and with
4 true SPs rostered a swing arm can still inflate the rotation charge though he'll never
start. JK ruled: count every arm EXACTLY ONCE, by what the roster actually needs.

## THE RULE (build exactly this, inside luxuryTax so every consumer inherits it)
1. Rotation tax group = all pure `SP`, PLUS — iff pure-SP count < ROTATION_ARMS — the
   best `SP/RP` arms promoted (in descending mean(VEL,JNK,ACC)) until the group reaches
   ROTATION_ARMS or swing arms run out.
2. ROTATION_ARMS derives from `LEGAL_ROSTER.startingPitchers` (= 4; SMB4 four-man
   rotation). No hardcoded 4 — import it.
3. Bullpen tax group = all `RP` + `CP` + the swing arms NOT promoted in (1).
4. No arm ever appears in both groups. Hitters group unchanged. Top-N-per-stat logic
   within each group unchanged (a 5th pure SP still just misses the top-4 cut — that
   behavior is correct and keeps).
5. The assignment lives INSIDE `luxuryTax` (the single settlement function) so the two
   bills, legal-finish cushion, seating-proof affordability, marginal tax, rational
   room, and every advisory surface inherit it automatically (advisory ≡ settlement).
   NO caller-side reimplementation anywhere.

## NAMED SCENARIO TESTS (JK's cases — write them FIRST, red against current code)
A. 4 SP + 1 elite SP/RP: rotation charge computed from the 4 SPs ONLY (the swing arm's
   ratings absent from every rotation stat row); the swing arm counts in bullpen rows.
   Against CURRENT code this must FAIL (today he can crack both) — that red is the repro.
B. 3 SP + 1 elite SP/RP (mid-draft shape): the swing arm IS in the rotation group
   (promoted to fill the 4th seat) and NOT in the bullpen group.
C. The recalculation JK named critical: from state B, evaluate marginal tax of adding a
   4th pure SP — the computation must reflect the post-pick reassignment (swing arm
   demotes to the pen). Assert the marginal equals tax(rosterB + newSP) − tax(rosterB)
   with the new assignment applied to BOTH terms, and construct the fixture so the
   rotation-side charge strictly DECREASES on the pick (the marginal can be negative
   overall) — prove a negative marginal is representable and correctly signed
   end-to-end through auctionMarginalTaxWithCaps.
D. All-swing rotation (0 pure SP, 4+ SP/RP): the best 4 swing arms are taxed as
   rotation (the loophole JK's simpler idea would have opened stays closed).
E. Promotion tie-break determinism: equal mean arms → stable deterministic order
   (document the tie-break; player id ascending is fine).

## BLAST RADIUS (handle honestly — no fixture-bending)
- Pinned suites that assert current tax numbers (gauntlet, settlement, completion-floor,
  snake engine suites) may shift. Re-baseline ONLY values whose change is EXPLAINED by
  this rule (a swing arm leaving/entering a group); each re-baselined expectation gets a
  one-line justification comment citing this contract. A shift you cannot explain by the
  rule = STOP (it's a bug, yours or latent).
- CPU rules are never fixture-bent; no load-path heals (standing JK rulings).
- UI copy: grep advisory copy that assumes "rotation = SP + SP/RP" (Draft Setup tax
  watch, desk tax tap-down copy if S3 has merged by your rebase) — the tax VIEW labels
  must still match the engine's grouping. The bullpen label stays "top-N bullpen arms"
  (CT1); the rotation membership language must not contradict the new rule. Flag, don't
  rewrite, anything test-characterized (D11 copy locks) — list flags in your report.
- The consequence-line copy must support a DOWNWARD tax consequence in plain words
  (e.g. "YOUR TAX BILL GOES DOWN"). If the surface that renders it lives in S3 (not yet
  merged when you start), note the seam in your report instead of editing across lanes.

## FILE SURFACE
- src/engines/leagueConstruction.ts (luxuryTax + a small exported assignment helper for
  testability) · its test file · re-baselined test expectations per BLAST RADIUS ·
  NOTHING else without a STOP. Auction FLOW files remain frozen (engine change is the
  sanctioned exception per JK's ruling; auction suites are the guardrail).

## GATES (in order, real output)
1. tsc --noEmit clean. 2. npm run build exit 0. 3. leagueConstruction + luxury-tax +
completion-floor + snake engine suites green. 4. THE FULL AUCTION SUITE SET green
(re-baselines justified inline). 5. ONE full vitest run (known solo-flakes: the
LeagueBuilderDraftSetup family, franchiseManualSmokeFixture — verify solo if red).

## PROTOCOL
No git write commands (captain cuts commits). Spec-first: scenario tests A-E before the
engine change; A must be red against current code. UNKNOWN or unexplainable test shift
= STOP. Builder report appended here: file:line, REAL gate outputs, every re-baselined
value with its one-line justification, copy flags, auditor attack list.
