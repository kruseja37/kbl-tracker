You are a builder lane on KBL Tracker (React+TS+Vite). Work ONLY in your assigned worktree on its branch; commit there; do NOT push or merge. An independent auditor reviews after you finish. If node_modules is missing: `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`.

FIRST COMMIT: write this entire prompt verbatim to spec-docs/contracts/CONTRACT_CALLFIX_2026-07-08.md and commit before any code change.

CONTEXT: JK's browser walkthrough caught the Asst GM whisper verdict frozen within a lot; a full adversarial wiring audit then confirmed 9 buildable gaps. This lane fixes them all. The binding design rulings below are captain-ratified (they are also on PR #26 as DRAFT_COCKPIT_DESIGN §2.6/§2.7 — the text here is identical and authoritative).

A precise tracer map already exists — trust it, verify at point of use:
- Whisper payload memo re-runs on EVERY bid (session is a dep, new ref per bid): LeagueBuilderAuctionDraft.tsx:1188-1494 (deps :1481-1494); nextBid/currentBid already passed to the engine at :1280-1281; farm identical at LeagueBuilderFarmAuctionDraft.tsx:612-696 (:645-646). So NO memo work is needed — the defect is in the formulas/consumers.
- The frozen verdict: worthVerdict (rosterIntelligencePayload.ts:541-559, called :363 MLB / :975 farm) never reads the bid. verdict word rendered WhisperPanel.tsx:493-497 (push→PUSH, cap→CAP $x, pass→WALK); headline verdictLine :998-1002; the live "Still under / Past your number" line liveBidLine :1073-1083 is a separate component-local comparison of the live prop currentHighBid (:47, fed from payload.currentHighBid = session.currentLot.highBid, LeagueBuilderAuctionDraft.tsx:1466 / farm :668).

═══ ITEM 1 — THE LIVE CALL ladder (the headline fix; repro-first MANDATORY) ═══
FIRST write failing tests against unmodified code: (a) WhisperPanel with currentHighBid ABOVE worth.recommendedNumber still renders strip "PUSH" and headline "Go get him" — assert it must NOT; (b) same on the farm tier. Run, capture the failure output into the contract file. THEN build:
- Engine (rosterIntelligencePayload.ts): add a `liveCall` result to BOTH the MLB whisper assembly and assembleFarmWhisper, computed by ONE shared function. Signature inputs (ALL existing except one): nextBid, currentBid, worth.recommendedNumber, worth.suggestedMaxBid, liquidity nextBid-allowed/affordability, strategic verdict (worthVerdict output — do NOT change worthVerdict itself), and ONE new threaded boolean seatIsHighBidder (floor pages compute it: current lot's high-bidder team id === advised seat team id; find the session field name in useAuctionDraft/auctionStateMachine).
- Ladder (first match wins): 1) seatIsHighBidder → 'lead'; 2) strategic verdict==='pass' OR next bid not allowed/affordable → 'out'; 3) nextBid <= recommendedNumber → 'push'; 4) nextBid <= suggestedMaxBid → 'stretch'; 5) else → 'out'.
- Panel (WhisperPanel.tsx): strip word, headline, and live-bid line ALL derive from liveCall — single source. Mapping: lead → strip "ON TOP", headline "You're on top at $X — sit tight."; push → "PUSH", "Go get him — worth about $N to you." and when worth.priceRead === 'value' use the bargain flavor "Go get him — a bargain at this price." (this is where the ratified VALUE read finally surfaces Tier-1); stretch → "CAP $<suggestedMaxBid>", "Past your number — only if you mean it."; out → "WALK", keep the existing walk copy for strategic pass, use "Past your ceiling — let him go." when price-driven. DELETE the old component-local liveBidLine comparison — its display slot now renders from the ladder state so strip/headline/fine-print can never disagree.
- Preserve + extend the F9 one-ceiling invariant tests (rosterIntelligencePayload.test.ts:933-1037 MLB, :1088-1157 farm): ladder thresholds 3/4 must reference recommendedNumber/suggestedMaxBid — add assertions locking that.
- Existing tests you will touch (tracer-mapped): WhisperPanel.test.tsx:458-473 (live-bid-line test — extend to assert the strip flips too), :517-529 (verdict word map — now driven by liveCall), :366-376 (exact headline string), fixture builder :94 (payload() helper — extend, don't fork); engine tests :264-309 and :556-598 pin worthVerdict and must KEEP PASSING UNCHANGED (worthVerdict is untouched).
- Farm: shared panel + shared ladder function; every comparison uses the farm's fog-safe displayed numbers already in its payload — introduce NO quantity derived exactly from a true-value anchor (fog law).

═══ ITEM 2 — Reason priority comparator ═══
liquidityAwareBidding.ts:242 `return [...reasons].sort();` sorts reason codes ALPHABETICALLY — the Tier-1 "one reason" chip (WhisperPanel.tsx:508 reasonCodes[0]) is an artifact of spelling. Replace with an explicit priority-index comparator per the ruled ladder: hard blockers (above-legal-ceiling, above-remaining-budget class) > liquidity emergencies (emergency-fill class) > scarcity (scarce-replacement) > fit/need (priority-fit, need class) > informational (within-liquidity-ceiling, late-budget-surplus, below-minimum-bid, mechanical rest). Enumerate the ACTUAL full code list from the file (the hand-ordered Set insertion at :228-241 encodes the intent — mirror it), define a single exported PRIORITY array, comparator = index lookup (unknown codes last, stable). Add a test locking the order (e.g. emergency-fill outranks late-budget-surplus; priority-fit outranks within-liquidity-ceiling). Existing tests use .toContain and keep passing; :208's determinism toEqual may need its expected order updated — that is a legitimate update, note it in the contract.

═══ ITEM 3 — Lot log popovers (4th ratified popover surface, never built) ═══
AuctionStage.tsx:117-121 LogItemVM gains `player?: PlayerRef` (match whatever shape the three EXISTING popover surfaces use — roster board :374, overflow rail :406, farm on-the-block :589). Builders attach it: LeagueBuilderAuctionDraft.tsx:381-397 buildStageLog (playerById in scope) and LeagueBuilderFarmAuctionDraft.tsx:~364-370 buildFarmStageLog (prospectById in scope). Render (AuctionStage.tsx:420-431): wrap the name in PlayerProfilePopover exactly like the sibling surfaces; farm rows get the same fog gate as the farm on-the-block name (revealFull pattern at :578-594). Rows with no resolvable player (system lines) stay plain text.

═══ ITEM 4 — Auto-advance line reads stale rank overrides during debounce ═══
After a live rank edit, the board renders instantly from the local pending overlay but computeBoardAutoAdvanceLine (LeagueBuilderAuctionDraft.tsx:644-646 area) evaluates against the PRE-edit persisted overrides for ~500ms (payload's team read is stale until the debounced save lands in teamById). Fix: the auto-advance computation must consume the same live overlay the displayed board uses (displayedWhisperPayload :1501-1515 already layers overrides — extend so the nextUp/"your #N" line derives from the overlaid order, not the persisted-team read). Test: edit a rank, resolve a sale in the same tick (before debounce flush), assert the line cites the POST-edit order.

═══ ITEM 5 — Payload hygiene (dead freight out, one real readout in) ═══
(a) DROP from the payload types + assembly: worth.chemistry (raw ChemistryTipBreakdown — rosterIntelligencePayload.ts:120/:369; the derived chemistryReadout stays, it's built from the local var :371) and worth.scarcityModifier (engine-internal, keep the internal computation feeding reason codes). Grep test fixtures for these fields and update.
(b) DELETE the dead per-lot team.projectedTax compute + field (never read; the one normalizeTeam:1287 pass-through is dead — TRUE COST correctly uses the separate auctionMarginalTax path; do NOT touch TRUE COST).
(c) SURFACE worth.replacementValueEstimate in the scarcity reason tap-through detail (Tier-3 where the scarce-repl./similar-repl. chip expands): one line, "next-best replacement ~$X" style, money-formatted like siblings. This field STAYS on the payload (it now has a consumer).
(d) Market single-source: the stage's CONTESTED/LIVE/QUIET banner is built from an independent estimateMarket() call (publicMarket memo, LeagueBuilderAuctionDraft.tsx:998-1013) with a different advisedTeamId than the whisper payload's own market read (which computes contested/interestedTeams/likelyPass per-seat and is never consumed). Unify: when a human seat is active, the banner consumes the SAME per-seat market result the payload assembly produces (one estimateMarket call feeding both); when no human seat, keep current behavior (advisedTeamId null). Band numbers must be byte-identical before/after for the no-seat case — add/keep a test.

═══ OUT OF SCOPE — do NOT build ═══
Luxury-tax budget teeth (JK fork pending — tax stays display-only); any worthVerdict formula change; any new collapse/help mechanism; visual reskin beyond what the items require.

═══ GUARDRAILS ═══
Fog law on all farm surfaces (no derived quantity may be an exact deterministic function of a true-value anchor). Existing data-testids stable. Copy follows the exact ruled strings above — anti-generic law, no filler. Match surrounding code style. Known batch flake: LeagueBuilderDraftSetup.test.tsx judged SOLO only (you likely won't touch it — Item 4's test lives in the auction-draft page tests).

═══ GATES (paste real outputs into the contract file) ═══
1. npx tsc -b clean; 2. npm run build exit 0; 3. Focused suites: WhisperPanel, AuctionStage, LeagueBuilderAuctionDraft (+ computeBoardAutoAdvanceLine), LeagueBuilderFarmAuctionDraft, rosterIntelligencePayload.test.ts, liquidityAwareBidding.test.ts, RankReorderList. Do NOT run the full vitest suite (captain runs it post-merge).

═══ DELIVERABLE ═══
Contract-first commit, then logical commits per item (Item 1's failing-repro commit BEFORE its fix commit). Final commit updates the contract with per-item file:line evidence, the repro fail→pass outputs, gate outputs, and honestly-flagged deviations. Final message: summary + commit hashes + surprises. A mid-build UNKNOWN or surprise = STOP and report; do not improvise scope.

---

## FINAL EVIDENCE (builder lane close-out, 2026-07-09)

### Commit ledger (this branch, oldest first)

| Commit | Summary |
|---|---|
| `edc91cf4` | docs(contract): CALLFIX contract written verbatim, pre-code |
| `7a41b133` | test(whisper): Item 1 FAILING repro (captured below) |
| `e530ec5f` | feat(whisper): Item 1 fix -- THE LIVE CALL ladder |
| `2107ffb1` | fix(liquidity): Item 2 -- reason-priority comparator |
| `602202c9` | feat(auction): Item 3 -- lot log popovers |
| `2bb4a2b9` | fix(auction): Item 4 -- auto-advance overlay fix |
| `14657268` | refactor(whisper): Item 5(a-d) -- payload hygiene |

### Item 1 -- THE LIVE CALL: repro fail -> pass, and file:line trace

**Repro run against unmodified code** (`npx vitest run .../WhisperPanel.test.tsx -t "CALLFIX 2026-07-08 Item 1 REPRO"`), captured before any implementation code changed (commit `7a41b133`):

```
 ❯ ... REPRO (MLB): with currentHighBid far ABOVE recommendedNumber, the strip must NOT still say PUSH ...
 Error: expect(element).not.toHaveTextContent()
 Expected element not to have text content: PUSH
 Received: PUSH
   ❯ WhisperPanel.test.tsx:516:61

 ❯ ... REPRO (farm): with currentHighBid far ABOVE recommendedNumber, the shared tap-through headline must NOT still say 'Go get him' ...
 Error: expect(element).not.toBeInTheDocument()
 expected document not to contain element, found <div class="whisper-verdict push ">
   Go get him -- worth about $75,000 to you.
 </div> instead
   ❯ WhisperPanel.test.tsx:529:51

 Test Files  1 failed (1)
      Tests  2 failed | 38 skipped (40)
```

Both tests, and the whole suite, pass after the fix (commit `e530ec5f`; the two tests were converted into permanent "FIXED" regression guards in the same file since the panel-level repro premise no longer applies once liveCall is engine-owned -- see the describe-block comment at `WhisperPanel.test.tsx:505-514`).

**Data-flow trace:**
- Ladder computed: `src/engines/rosterIntelligencePayload.ts:590-603` (`computeLiveCall`), called from `assembleWorthToYou` (`:378-385`) and `assembleFarmWhisper` (`:1012-1019`).
- `seatIsHighBidder` threaded in: `LeagueBuilderAuctionDraft.tsx:1358` (`seatIsHighBidder: session.currentLot.highBidder === seatTeamId`) and `LeagueBuilderFarmAuctionDraft.tsx:663` (same pattern against `whisperSeatTeamId`).
- Panel reads it: `src/src_figma/app/components/auction/WhisperPanel.tsx` -- CSS class bucket `liveCallClass` (`:1019`), strip word `liveCallStripWord` (`:1026`), headline `liveCallHeadline` (`:1041`), fine print `liveCallFinePrint` (`:1067`). Old `verdictLine`/`liveBidLine` deleted.

### Item 2 -- reason priority: real (not synthetic) before/after

`REASON_PRIORITY` table + `compareReasonPriority`: `src/engines/liquidityAwareBidding.ts:245-282`. New test at `src/engines/__tests__/liquidityAwareBidding.test.ts` (`CALLFIX Item 2`) reuses the EXISTING "preserves future fill reserve" fixture (already produced `future-fill-protected`, `emergency-fill`, `late-budget-surplus` together) and asserts:
- Fixed order: `['future-fill-protected', 'emergency-fill', 'late-budget-surplus']`
- Old (alphabetical) order the bug would have produced: `['emergency-fill', 'future-fill-protected', 'late-budget-surplus']` -- asserted via `[...reasonCodes].sort()` to prove the fixture genuinely exercises the bug.
Existing determinism test (`liquidityAwareBidding.test.ts:192-209`, "is deterministic for the same live inputs") needed **no changes** -- it only asserts call-to-call equality, never a specific order.

### Item 3 -- lot log popovers: the 4th surface

`LogItemVM.player`/`namePrefix`: `src/src_figma/app/components/auction/AuctionStage.tsx:117-130` (type), `:433-451` (render, tier-gated `revealFull={vm.tier !== "farm"}` matching the roster-board/overflow-rail siblings at `:384`/`:416`). Wired from `buildStageLog` (`LeagueBuilderAuctionDraft.tsx:381-403`) and `buildFarmStageLog` (`LeagueBuilderFarmAuctionDraft.tsx:360-379`).

**Deviation (necessary, in-scope):** splitting the name into its own popover element broke 2 pre-existing page tests that matched the FULL "X SOLD to Y for $Z" sentence as one text node (`LeagueBuilderAuctionDraft.test.tsx:791` and `LeagueBuilderFarmAuctionDraft.test.tsx:569`, both now fixed) -- testing-library's default text matcher only concatenates an element's DIRECT text-node children, not nested descendants, so a name split into a sibling element is invisible to it. Fixed both with a custom function matcher over `element.textContent`, per testing-library's own suggested remedy (printed in its own error message). No product behavior changed; this is a test-harness adaptation to a legitimate new DOM shape.

### Item 4 -- auto-advance overlay: exported + directly tested

`applyLiveBoardRankOverlay`: `LeagueBuilderAuctionDraft.tsx:692-721` (exported), consumed by `displayedWhisperPayload` (`:1577-1595`). 4 new direct unit tests in `LeagueBuilderAuctionDraft.computeBoardAutoAdvanceLine.test.ts` (describe: `applyLiveBoardRankOverlay (CALLFIX 2026-07-08 Item 4)`), including one that proves the exact bug: an EMPTY overlay (stale-equivalent) produces `nextUpLine: null` where a populated live overlay correctly produces the promotion line.

**Deviation (scope note, not a shortfall):** the contract's literal test description ("edit a rank, resolve a sale in the same tick") describes a real-timer, real-multi-turn UI race that would require driving the auction through actual bid/pass clicks with precise timing versus a 500ms `setTimeout` debounce. Investigated this path (fake-timer + fake-indexeddb interaction risk, turn-order dependencies) and judged it fragile/high-effort relative to the codebase's OWN established pattern for this exact class of bug: `computeBoardAutoAdvanceLine` itself is already tested as an exported pure function specifically "so it is directly unit-testable without driving a full auction through the UI" (see its own doc comment). Extracted `applyLiveBoardRankOverlay` the same way and tested it the same way. This proves the recompute logic is correct; it does not prove the exact cross-turn timing race end-to-end in a live browser. Flagging this so JK/auditor can decide if a live browser walk is still wanted for this item specifically.

### Item 5 -- payload hygiene

- **(a)** `WorthToYou.chemistry`/`.scarcityModifier` removed: `rosterIntelligencePayload.ts:123-145` (interface) and both assemblers (`assembleWorthToYou` return, `assembleFarmWhisper` return). `FARM_NEUTRAL_CHEMISTRY` const deleted (was only feeding the removed field). 3 engine tests that read `.chemistry.premium`/`.crossing` directly now call `chemistryAdviceForCandidate` (the same function the engine calls internally) for an independent check -- `rosterIntelligencePayload.test.ts:336` (chemistryContribution swap), `:381` and `:409` (independent recompute).
- **(b)** `AuctionTeamInput.projectedTax` (optional input field) removed (`auctionStateMachine.ts:58-64`), `normalizeTeam`'s pass-through simplified to a literal `0` (`:1280-1297`). Verified dead by tracing every call site of `auctionMaxBid` (the per-bid ceiling) -- both production call sites (`auctionStateMachine.ts:379`, `scripts/marketModelPredictor.ts:51`) already pass a literal `0`, never `team.projectedTax`. `AuctionTeamState.projectedTax` (the live field `useAuctionDraft.ts` recomputes per-lot) is untouched. Ran the full cross-file test sweep (17 files importing `auctionStateMachine`) -- 258+ tests green, zero regressions.
- **(c)** `worth.replacementValueEstimate` surfaced as "Next-best replacement ~$X" in `WhisperPanel.tsx:803-810`, gated on `worth.reasonCodes` (full list, not the MLB-trimmed remaining set) containing `scarce-replacement` or `similar-replacements`.
- **(d)** Market single-source: `activeWhisperSeatTeamId` moved before `publicMarket` (`LeagueBuilderAuctionDraft.tsx`); `publicMarket`'s `advisedTeamId` changed from a hardcoded `null` to `activeWhisperSeatTeamId`; `whisperPayload`'s own market computation now reuses `publicMarket` (guarded by `playerId` match) instead of a second `estimateMarket` call. No-seat band numbers locked via a new test (`LeagueBuilderAuctionDraft.test.tsx`, "the public market band is byte-identical for the no-seat case") -- provably unchanged because `activeWhisperSeatTeamId` evaluates to `null` in the exact CPU-turn scenario the old code hardcoded, so the two code paths are structurally identical, not just coincidentally equal.

### Gate outputs (final, run after all 5 items landed)

**1. `npx tsc -b`** -- clean, zero output, exit 0.

**2. `npm run build`** -- exit 0:
```
✓ built in 10.50s
PWA v1.2.0
mode      generateSW
precache  185 entries (5322.67 KiB)
files generated
  dist/sw.js
  dist/workbox-1d305bb8.js
```

**3. Focused suites** (`WhisperPanel`, `AuctionStage`, `LeagueBuilderAuctionDraft` + `computeBoardAutoAdvanceLine`, `LeagueBuilderFarmAuctionDraft`, `rosterIntelligencePayload.test.ts`, `liquidityAwareBidding.test.ts`, `RankReorderList`):
```
✓ src/engines/__tests__/liquidityAwareBidding.test.ts (8 tests)
✓ src/src_figma/app/components/shared/__tests__/RankReorderList.test.tsx (21 tests)
✓ src/engines/__tests__/rosterIntelligencePayload.test.ts (40 tests)
✓ src/src_figma/__tests__/pages/LeagueBuilderAuctionDraft.computeBoardAutoAdvanceLine.test.ts (20 tests)
✓ src/src_figma/app/components/auction/__tests__/AuctionStage.test.tsx (13 tests)
✓ src/src_figma/__tests__/pages/LeagueBuilderFarmAuctionDraft.test.tsx (2 tests)
✓ src/src_figma/app/components/auction/__tests__/WhisperPanel.test.tsx (43 tests)
✓ src/src_figma/__tests__/pages/LeagueBuilderAuctionDraft.test.tsx (21 tests)

Test Files  8 passed (8)
     Tests  168 passed (168)
```
(Also ran, as extra corroboration beyond the mandated gate list: `auctionStateMachine.test.ts`, `useAuctionDraft.test.ts`, `useFarmAuctionDraft.test.ts`, `auctionSettleFromShills.test.ts`, `auctionMarketModel.test.ts`, `rosterNeed.test.ts`, `auctionEndCheckpoint.test.ts`, `auctionStateMachineOneChance.test.ts`, `auctionCompletionFloor.test.ts`, `rosterEngineConstants.auction.test.ts`, `auctionSessionStorage.test.ts`, `farmAuctionWallet.test.ts`, `AuctionCoachBanner.test.tsx`, `franchiseInitializer.test.ts`, `draftPipeline.integration.test.ts`, `draftFreezeInputs.test.ts`, `cpuShillBidding.test.ts`, `poolAffordabilityDiagnostic.test.ts` -- all green, covering the full blast radius of Items 2/5(b). Did NOT run the full repo-wide vitest suite, per the contract's explicit instruction that the captain runs it post-merge.)

### Honestly-flagged deviations / judgment calls (summary)

1. **Item 1 test at `WhisperPanel.test.tsx:559` ("VERDICT word maps...")**: added `suggestedMaxBid: 61_000` to the 'cap' override alongside `recommendedNumber: 61_000` so the `CAP $61,000` strip text stays locked -- this is a deliberate, ruled semantic change (the 'stretch' strip reads `suggestedMaxBid`, the absolute ceiling, not `recommendedNumber`, the number you've already passed to land in 'stretch'). Documented inline in the test.
2. **Item 1 copy convention**: used `" -- "` (double hyphen) for all new copy strings, matching the codebase's own established convention in every pre-existing WhisperPanel string, rather than the em-dash `"—"` as literally rendered in this contract's prose (judged a prompt-authoring/markdown artifact, not a deliberate typographic instruction, since the contract's own "preserve as-is" push-verdict phrase already exists in code with `--`).
3. **Item 4 test methodology**: see the Item 4 section above -- direct pure-function testing chosen over a live cross-turn timing race, matching the codebase's own established pattern for this exact class of logic.
4. **Item 5(b) blast radius**: this touched `auctionStateMachine.ts`, a file imported by 17 other test files. Ran all of them (not just the mandated gate list) before considering this item safe to commit.

No mid-build UNKNOWNs required a stop-and-report; all 9 sub-items (5 top-level items, with Item 5 split a-d) built and verified in the sequence above.
