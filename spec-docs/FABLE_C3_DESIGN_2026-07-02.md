# FABLE-C3 DESIGN — Pool sizing + completion probability + shill count + the FS-3 launch fix

**Date:** 2026-07-02 · **Builder:** Fable 5 · **Contract:** FABLE-C3 in `PROMPT_CONTRACTS.md`
**Branch:** `experiment/manager-wpa-window` (build-only; Codex adversarial pass → Opus gate/commit)
**Depends on (landed):** C1 `7473b765` · C1B `a5ae09df` · C2A `82fd5d3f` · C2B `56004cdd`.

---

## §1. FRESH GROUNDING (all anchors re-read this session, post-C2B trunk `56004cdd`)

| Anchor | Where | What it gives C3 |
|---|---|---|
| Body-count gate | `leagueBuilderPoolBuilder.ts:252-260` `evaluatePoolSufficiency` — `poolSize ≥ 22×teamCount` + 1.2× oversupply warn | The gate to make composition- and shill-aware (POOL-02) |
| Orphaned composition engine | `poolFeasibility.ts:157` `analyzePoolFeasibility` — per-archetype supported/thin/starved via `buildBestRoster` + stat-supply shortfalls + activation prompts | The engine to SURFACE (POOL-01); already produces GM-readable guidance |
| Live Draft Setup screen | `LeagueBuilderDraftSetup.tsx` (routed) — pool shuttle + lock + the sufficiency indicator | Where the feasibility report surfaces |
| Extractor sizing seam | `draftPoolExtractor.ts` `defaultPoolTargetSize` = `⌈teams × 22 × oversupply⌉`, `EXTRACTOR_TUNING.oversupply = 1.2` ("C3 refines the sizing model" — its own comment) | The formula C3 replaces with a real model |
| C1B queue inputs | CURRENT_STATE: ~202-body feasibility floor (8 teams); 1.2× is feasibility-dominated; 1.5×+ identity-roomy; ALL identities tax-dependent at 1.2× | Prior evidence the sizing answer must reconcile |
| Shill construction (live) | `useAuctionDraft.ts` `initAuction` (:419-437): shills are SYNTHETIC session-only teams (`__auction_shill__…`), 22 slots each, session `cpuShillCount` zeroed (classification runs off `cpuShills` keys) | Shills are never league teams in the routed flow |
| Shill classification | `cpuTeamRoles.ts` `deriveShillTeamIds` (cpuShills keys ∪ last-N; header: "RB-10b consumes this split when the dissolve-to-pool bridge is wired") | The split every exclusion path uses |
| Commit exclusion (ALREADY LIVE) | `useAuctionDraft.ts:283-286` passes `excludeTeamIds: deriveShillTeamIds(...)` into `commitCompletedMlbAuctionSessionToLeagueRosters`; pinned by `draftPipeline.integration.test.ts:1042-1090` | FS-3 has narrowed since the audit snapshot — shill wins never reach league rosters |
| Freeze exclusion (ALREADY LIVE) | `franchiseInitializer.ts:755-758` `mlbShillIds` | Ditto |
| The validation that throws | `franchisePlayerStorage.ts` `validateV1RosterHandoff` (:400) called from `deepCopyLeagueToFranchise` (:572) over **`leagueTemplate.teamIds`** — every league team must have exactly 22 MLB + 10 FARM | The launch gate FS-3 must satisfy |
| Auction termination | `auctionStateMachine.ts` `isAuctionComplete` = EVERY session team full (shills' 22 slots included); `advanceLot` also completes on pool exhaustion with slots open | Why shill demand couples termination to pool size |
| Farm hook | `useFarmAuctionDraft.ts` — NO shill injection at all | FS-3 scope = MLB auction only (v1) |
| C2B machinery to reuse | `auctionMarketModel.ts`: `estimateMarket(WithInternals)`, `MarketBidderView`, `shillFitMixture`, `buildArchetypeLiftTable`, `ownNeedMultiplier`, `leagueScarcityMultiplier`; `cpuShillBidding.ts`: `archetypeBandPriorities`, `bandFitMultiplier`, `bandLiftFromPriorities`; `sessionBidCeiling` | The contention/valuation machinery (contract: NO second valuation model) |
| C2A harness to reuse | `auctionTuningHarness.ts`: `runAuctionTuningCase`, `AuctionTuningCase`, hard consts `REAL_TEAM_COUNT=8`/`SHILL_TEAM_COUNT=2`, `includePositionInfo` seam, `realShortfall`/`shillWins`/`completed` outputs | The sim chassis (contract: NO second harness) — needs ADDITIVE parameterization |
| Spec anchors | `SCOUTING_INTELLIGENCE_SPEC.md` :195-199 (shills: "the right NUMBER of shills for an 8-team draft" = open sim), :243-246 (surface pool-feasibility as the evolve tool), :262-268 (reuse list), :280-286 (open: shill aggressiveness + 8-team count) | Contract-consistent |
| JK farm/C3 ruling (2026-07-01) | DECISIONS_LOG: shill-count sizing for 4-human AND 8-human + the END-CHECKPOINT ("draft ends when all non-shill rosters are full") + sandbagging risk = C3's contracted questions | The questions this build must answer with sim evidence |

## §2. THE FS-3 TRUTH TABLE (what is ACTUALLY broken on today's trunk)

The audit's original chain (shill rosters committed → freeze excludes → validation throws) has
been partially healed since its snapshot: commit-side and freeze-side shill exclusion are live and
tested. What remains broken at S>0, in order of bite:

1. **Pool starvation of real teams (the live launch blocker).** Synthetic shills carry 22 slots
   each and `isAuctionComplete` waits for them, but `evaluatePoolSufficiency` sizes the pool for
   `22×T` league teams only. With S>0 the shills MUST win ~22×S players for the auction to even
   terminate normally — players taken straight out of the real teams' supply. Real teams end
   short of 22 → `validateV1RosterHandoff` throws → launch blocked. (If the pool exhausts first,
   `advanceLot` force-completes with real slots still open — same throw.)
2. **Shill-won players are stranded, not dissolved.** Commit exclusion means shill wins simply
   never receive a league assignment — invisible to the league afterward. Tolerable only because
   of (1)'s fix direction: shills should never be *required* to hoard 22 bodies at all.
3. **The last-N derived-shill mode** (real league teams as shills) would put 0-player league teams
   in front of the validator — but the routed flow never uses it (synthetic-only). Guarded, not
   rebuilt.

**Fix direction (implements JK's queued end-checkpoint):** the auction ENDS when all NON-SHILL
rosters are full. Shills bid to apply price pressure but never need to complete a roster; the pool
is sized for real-team completion + expected shill WINS (a modeled quantity), not shill SLOTS.
This one change simultaneously: unblocks the launch (real teams always reach 22 before the pool
can strand them — the completion floor + forced filler already guarantee per-team completion),
caps shill hoarding, and decouples pool size from S×22.

## §3. DECISIONS

- **D1 — End-checkpoint via additive config: `AuctionSetupConfig.nonCompletingTeamIds?: readonly string[]`.**
  `isAuctionComplete` (and the `surfaceNextPlayer`/`advanceLot` early-complete checks) treat those
  teams' open slots as non-blocking; nomination/bidding for them continues while lots exist (they
  still nominate + bid — pressure is the point). The forced-filler SKIPS non-completing teams (a
  no-bid lot must never be forced onto a shill — it would silently eat supply). Saved sessions
  lack the field → byte-identical old semantics (the C2B additive pattern). The live hook passes
  the synthetic shill ids at `initAuction`. Sandbagging analysis: §7.
- **D2 — Shill solvency under the end-checkpoint:** a non-completing team has no completion to
  reserve for, so `sessionBidCeiling` returns the full remaining budget for it (scalar reserve of
  `(slots−1)×minSalary` would still over-reserve a fiction). Additive branch keyed on the same
  config field.
- **D3 — New engine `src/engines/auctionPoolSizing.ts`** — three exports, single-math on C1B/C2B:
  1. `poolDemandModel(teams, shills, structure, tuning)` — the sizing formula:
     `target = ⌈teams×22×identityHeadroom⌉ + expectedShillWins(shills, tuning)`, with
     per-class structural floors inherited from C1B's `structuralFloor` semantics (primaries,
     C-coverage, startable/relievable arms — scaled to REAL-team demand only) and
     `expectedShillWins = shills × winsPerShill` (tuning default fit from the sim sweep). A TABLE
     helper emits the common configs (T=8, S=0..4; 4-human/8-human league shapes).
  2. `archetypeCompletionOutlook(pool, archetype, opts)` — the closed-form completion-probability
     model for ONE team chasing ONE archetype against T−1 rivals + S distribution-modeled shills:
     for each requirement class (from `rosterNeedBreakdown` on the empty roster = the full legal
     structure), take the class's candidate list (from the pool), price each candidate's expected
     contention with C2B's machinery (`estimateMarketWithInternals` on a synthetic lot view:
     rival demand from a NEUTRAL prior over the 24 for unknown strategies + the shill mixture),
     and estimate P(win enough of the class) via a Poisson-binomial-style closed form over
     per-candidate win odds `P(win_i) ≈ σ(ownV_i − predictedMedian_i)` (deterministic logistic on
     surplus, tunable slope). Class probabilities combine conservatively (min/product hybrid,
     documented). Output: P(complete legally), P(complete AT fit ≥ the identity floor), the
     binding class, and a plain-language note — the layer `analyzePoolFeasibility`'s verdicts get
     enriched with.
  3. `recommendedShillCount(humanTeams, leagueTeams, tuning)` — the sim-backed answer surfaced as
     the setup default (replaces the `scaledShillDefault` placeholder's guess with the tuned
     number; the placeholder function stays as the fallback shape). All knobs in a `SIZING_TUNING`
     §16 block.
- **D4 — Surface into Draft Setup (POOL-01/02):** `leagueBuilderPoolBuilder.ts` gains
  `evaluatePoolComposition(pool, teams, shills)` = body gate (now shill-aware via D3's demand
  model) + `analyzePoolFeasibility` + per-archetype `archetypeCompletionOutlook`. The routed
  `LeagueBuilderDraftSetup.tsx` renders it as an additive panel next to the existing sufficiency
  indicator: per-archetype badge (supported/thin/starved + P(complete)) + the existing activation
  prompts. Read-only, additive, no copy rewrites of existing strings (D11 copy-lock respected);
  full UX belongs to C4.
- **D5 — FS-3 regression test (the contract's proof):** extend the
  `draftPipeline.integration.test.ts` pattern: a REAL end-to-end shill>0 run — seeded players →
  MLB auction with S=2 synthetic shills + the end-checkpoint → commit (exclusion) → farm fill →
  freeze → `deepCopyLeagueToFranchise` → **launch does not throw; every real team 22/10; shill
  wins carry no league assignments**. Plus a state-machine unit: end-checkpoint terminates with
  shill slots open; saved-session (no field) keeps old semantics.
- **D6 — Sim sweep (opt-in, reuses C2A):** ADDITIVE harness parameterization — optional
  `AuctionTuningCase.{realTeams?, shillTeams?, nonCompletingShills?}` defaulting to today's
  hard-coded 8/2/false (default cases byte-identical — the C2B diff-separability discipline).
  New opt-in `scripts/poolSizingSweep.test.ts` (`RUN_AUCTION_TUNING_SIM=1`): grid
  S∈{0..4} × oversupply∈{1.0, 1.2, 1.35, 1.5} × T=8, measuring: completion (must: zero real
  shortfall), price inflation (avgRealSpend vs S=0 — the reason shills exist), per-archetype
  fit-win rate (band-level, via `archetypeBandPriorities` — single-math), auction length. The
  recommendation = smallest S with material price pressure and zero shortfall at the recommended
  size; the sweep's JSON is the evidence for JK.
- **D7 — What C3 does NOT do:** no farm shills (farm hook has none; farm sizing stays the
  fair-supply ruling's separate ticket); no dissolve-to-pool bridge (commit exclusion already
  achieves the v1 semantics; the RB-10b bridge note stays for v1.1); no picker/archetype-capture
  UI (C4); does not touch the 22/10 requirement for real teams (contract constraint).

## §4. FILE PLAN

| File | Change |
|---|---|
| `src/engines/auctionPoolSizing.ts` | NEW — demand model + completion outlook + shill recommendation + `SIZING_TUNING` |
| `src/engines/auctionStateMachine.ts` | MOD — end-checkpoint (`nonCompletingTeamIds`) in `isAuctionComplete`/complete-checks + forced-filler skip + shill ceiling branch |
| `src/data/auctionEngineConstants.ts` | MOD — the additive config field; wire `scaledShillDefault` to the tuned recommendation |
| `src/utils/leagueBuilderPoolBuilder.ts` | MOD — `evaluatePoolComposition` (shill-aware gate + feasibility + outlook) |
| `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx` | MOD — additive per-archetype feasibility panel |
| `src/src_figma/app/hooks/useAuctionDraft.ts` | MOD — pass shill ids as `nonCompletingTeamIds` at init |
| `scripts/auctionTuningHarness.ts` | MOD — additive team-count/end-checkpoint parameterization |
| `scripts/poolSizingSweep.test.ts` | NEW — opt-in recommendation sweep |
| `src/engines/__tests__/auctionPoolSizing.test.ts` | NEW — formula/outlook units |
| `src/engines/__tests__/auctionStateMachine*.test.ts` | MOD/NEW — end-checkpoint units + old-semantics pin |
| `src/utils/tests/draftPipeline.integration.test.ts` | MOD — the FS-3 shill>0 launch regression |

## §5. VERIFICATION PLAN

1. `NODE_ENV= npm run build` exit 0; targeted suites green (state machine ×2, pool sizing, pool
   builder, draft pipeline integration, hook tests).
2. The FS-3 regression: shill>0 end-to-end launch passes (the contract's named proof).
3. Opt-in sweep: report the S×size grid + per-archetype completion distribution across all 24 at
   the recommended config; flag any archetype < 90% (STOP-IF: no sane size clears all 24 →
   structural finding, log OPEN-DECISION, don't force it).
4. C2A calibration gate re-run (`RUN_AUCTION_TUNING_SIM=1`, 50 runs) — harness parameterization
   must leave the C2B calibration numbers unchanged (default-case byte-stability).
5. FULL suite zero-new-reds vs the characterized pair.

## §5b. AS-BUILT — THE COMPLETION-GUARANTEE CASCADE (the session's core finding arc)

The sweep did its job: at every layer it found a REAL way full-CPU drafts fail to complete, each
fix exposing the next. All six pieces shipped; each is behind either the additive end-checkpoint
config, an opt-in CPU flag, or fires only in a state that was previously a broken draft. The
wedge-free result: **S=0..4 × 20 seeded runs at target sizing = ZERO shortfalls** (leg-1 gate).

1. **End-checkpoint** (as designed, §3 D1/D2) — plus `initAuctionSession` births a session
   complete when only non-completing teams hold slots.
2. **Need-aware CPU bidding (opt-in `CpuBidOptions.needAwareCompletion`):** a completing CPU team
   never passes an affordable player who fills a hard requirement once (a) every remaining slot
   is spoken for, or (b) the player serves a class whose remaining supply is below the team's own
   demand (`servesOwnTightClass` — EXACT class math; fungible needs with plentiful substitutes
   deliberately never trigger). Fixes: need-blind interest-gate passes wedging drafts.
3. **Load-bearing pass-out guard** (`loadBearingTeam` in `resolveNoBidLot`): a no-bid lot may
   pass out permanently ONLY if it is not (a) some team's only remaining completion path
   (per-team completion check) nor (b) jointly-tight class supply (summed MINIMUM class needs —
   incl. the role-agnostic body floors — vs pool supply). Recipient prefers class-tight teams.
   One-chance semantics preserved for genuine surplus.
4. **CPU anti-starve politeness (same opt-in):** a CPU never SNIPES into a jointly-tight class
   unless the player serves a class tight FOR IT TOO (`wouldStarveJointDemand`) — "fills my need"
   is not enough, because a fungible body-floor need made every hitter "needed" and floor-filling
   buyers were absorbing the last scarce primaries. Humans are never blocked (sniping stays legal).
5. **POOL-AWARE STRAND LAW (the root cause; DESIGN DECISION, flagged for JK/audit):** the
   count-only `wouldStrandRoster` assumes need-sharing players exist (e.g. a secondary-C 3B can
   fill a missing primary AND catcher depth in one body) — but the ACTUAL pool may hold none,
   letting a team buy itself into a roster NO remaining player can legally complete (the sweep's
   canonical wedge: one catcher, no Two-Way arm, one slot, two needs). `bidWouldStrand` now also
   requires a VERIFIED-legal completion to exist from the players actually left
   (`cheapestLegalCompletion`), for ALL bidders including humans — buying into pool-impossibility
   is a true impossibility, exactly what spec §6 says the hard floor exists to prevent.
6. **EXHAUSTION CLEANUP BACKFILL (DESIGN DECISION, flagged for JK/audit):** pool empty with a
   completing team unfilled was a silently broken draft (the 22/10 launch validation throws
   downstream). `advanceLot` now backfills unfilled teams from the PASSED lots — cheapest
   verified-legal completion, priced at LEAGUE-MINIMUM salary (those players cleared the market
   at zero demand; the C2B ceiling guarantees every team retains ≥ minimum-salary money per open
   slot, so the backfill is affordable by construction whenever positionally possible). The
   one-chance rule bends ONLY in the otherwise-failed state.
7. **SHILL WIN CAP (`CpuShillProfile.shillMaxWins`, additive; DESIGN DECISION):** sweep-measured,
   UNCAPPED end-checkpoint shills hoard ~21 wins each (a whole roster — they are full-budget
   wildcards). The cap (default `SIZING_TUNING.winsPerShill = 10`, wired into live shill
   profiles) keeps a shill price-pressure instead of a competing franchise, and the sizing model
   budgets exactly cap×S extra bodies.

**Sweep evidence (20 seeded runs per config, 8 teams):**
- Target sizing (264 + 10×S): shortfalls 0/20 at every S ∈ {0,1,2,3,4}; capped shills win
  exactly 10 each.
- Bare floor (196 at S=2): 20/20 shortfall — the identity-headroom target is load-bearing, not
  padding (report-only leg).
- Analytic distribution at the recommended config: all 24 archetypes pLegal ≥ 0.9, ZERO flagged
  below the 90% identity threshold.
- **Honest finding on shill economics:** real-team spend inflation vs S=0 is ≈0% to −4% — capped
  shills do NOT materially raise prices in CPU-vs-CPU play; they add contested-lot texture and
  absorb surplus. The shill COUNT is therefore a product-feel choice, not an economics lever;
  the system is completion-safe at any S 0..4. (JK's 4-vs-8-human question: the recommendation
  table stands as the default, with this caveat attached.)
- The harness's mid-run supply invariant was updated to count PASSED lots as recoverable supply
  (the cleanup semantics made the old form stale).

**FS-3 verdict refined (from the truth table §2):** the launch gate itself was already survivable
for synthetic shills (commit-side + freeze-side exclusion landed after the audit snapshot) — the
new integration regression PINS it. The live blocker was auction termination + sizing under shill
demand, which the end-checkpoint + demand model + the cascade above fix.

## §5c. C3-FIX ROUND (response to the C3 audit BLOCK — `C3_AUDIT_VERDICT_2026-07-02.md`)

Audit result on the §5b build: the pool-aware strand law CLEARED an 11M-shape fuzz vs a
brute-force `isLegalRoster` oracle (zero spurious-infeasibles); 1 CRITICAL + 3 MAJOR + 1 MINOR
remained, all rooted in one shared fact I had missed: **live MLB opening asks (reserveCurve×IV,
no flat floor) can sit BELOW the league-minimum salary**, so ask-priced reserves don't imply
minSalary-priced affordability.

- **F1 (CRITICAL, fixed):** `sessionBidCeiling`'s enriched path now reserves at least minSalary
  per remaining slot (`minReserveCeiling`, applied to the completion ceiling AND the
  infeasible-fallback) — restoring the invariant the cleanup backfill's affordability rests on:
  after ANY acquisition, `budgetRemaining ≥ openSlots × minSalary`. Regression: the audit's
  economy end-to-end (asks 2500 > budget 2000 > minSalary 1666.49) — unaffordable lots pass out,
  the cleanup completes the team at minSalary, budget ends ≥ 0; plus the cheap-ask ceiling pin
  and a farm-immunity case (flat floor + no position info → backfill no-ops).
- **F2 (MAJOR, fixed):** `loadBearingTeam` Criterion 1 now carries the same affordability guard
  as Criterion 2 (ceiling ≥ opening ask) — a completion-critical rescue must never mint a
  negative budget; the unaffordable team's remaining net is the minSalary-priced cleanup.
- **F3 (MAJOR, fixed):** CPU actors convert a `bid-strands-roster` rejection into their PASS
  instead of halting the live draft (`strandSafeBidTransition`/`strandSafeClaimTransition`,
  pure + exported + unit-tested; wired into the MLB hook's bid/claim and hardened symmetrically
  in the farm hook). Humans keep the rejection — UI feedback, never a silent pass; every other
  rejection reason still throws.
- **F4 (SHOULD-FIX, implemented):** the Start-Draft green light now sits at the model's
  CLASS-FEASIBILITY floor + capped shill wins (222 at 8 teams/2 shills — the audit's own
  recommendation, and the number JK ratified with the sizing model), with `targetSize` surfaced
  as the recommendation ("· recommended N" appended to the chip; existing copy untouched). The
  unrouted DraftSetupHubPreview gate was reconciled onto the same `evaluatePoolDemandSufficiency`
  (its test fixture grew from the stale bare-seats 44 to 80). Unit-pinned.
- **F5 (MINOR, fixed):** the backfill header now states minSalary pricing (it stale-claimed
  opening asks).

Fix-round verification: build exit 0 · full targeted battery incl. all new regressions
(14 files / 133 tests incl. the hub preview) · sweep re-run S=0..4 × 20 = zero shortfalls,
dynamics unchanged (the reserve floor binds only on sub-minSalary completion costs) ·
C2A baseline + C2B calibration gates re-passed at 50 runs · FULL suite zero-new-reds
(result recorded in SESSION_LOG).

## §5d. C3-FIX ROUND 2 (F6/F7/F8 — `C3_AUDIT_VERDICT_2026-07-02.md` ROUND 2; F1-F5 confirmed, untouched)

- **F6 (MUST, fixed):** the auction page (`LeagueBuilderAuctionDraft.tsx`) was the last caller of
  the OLD summed-participant gate — at S≥3 it over-demanded (242 vs 232) and could BLOCK a pool
  both setup screens green-lit. Now all THREE Start-Draft gates call
  `evaluatePoolDemandSufficiency(poolSize, teams, shills)` with separate args. PINNED: a
  test.each over S=0/2/3 asserting the single shared floor + a test documenting the removed
  divergence; the page's blocker test re-pinned to the demand floor (44-pool vs 62 → "needs 18")
  with its own small fixture. Knock-ons handled: the page fixture grew 44→80 (the raised floor
  correctly gated the old size), and the two $70k-pinned session tests now pin the OPENING LOT to
  player-a (100th percentile → ask 70k at any pool size) — the seed helpers were implicitly
  fixture-size-dependent. `evaluatePoolSufficiency` retains ONE caller
  (`draftPipeline.integration.test.ts:1121`, legacy shill-less team-count check) — left in place
  per the contract; flagged for a later cleanup ticket rather than deleted on a hunch.
- **F7 (MINOR, fixed):** the round-1 "F1/F2" test's Lot-2 refusal actually flowed through
  `selectForcedFillerTeam`'s pre-existing guard (pool exhausted behind the lot), not the new
  Criterion-1 guard — comment corrected, and a DEDICATED test added on the SURPLUS branch
  (remaining ≥ open slots → `loadBearingTeam` evaluated; the lot player is the team's only legal
  completer; ceiling < ask → passes out, no negative budget).
- **F8 (MINOR, fixed):** the unused `canCover` import in `auctionMarketModel.ts` (orphaned by the
  `playerFillsHardRequirement` relocation) removed.

Round-2 verification: tsc 0 · battery 102/102 (10 files incl. all three gate screens) · build +
FULL suite recorded in SESSION_LOG. Sweep/calibration untouched by F6-F8 (no engine behavior
change; F8 is import-only).

## §6. RISKS / DECLARED BEHAVIOR CHANGES

- End-checkpoint changes auction termination ONLY for sessions carrying the new config field
  (live S=0 sessions and all saved sessions: unchanged). The hook wires it only for its own
  synthetic shills.
- Shill ceiling widens to full budget under the end-checkpoint — intended (pressure), sim-checked
  for "destroys dynamics" (spec's own caution) via the price-inflation metric.
- The completion-probability model is advisory (Draft Setup guidance); the hard guarantees stay
  where C2B put them (completion floor + strand guard + forced filler).

## §7. THE SANDBAGGING FRAME (JK's queued question, answered analytically + sim-checked)

With no timer and permanent passes, the theoretical exploit is a human GM slow-rolling lots a
shill leads, hoping shills drain each other. Bounds that keep it non-viable: (a) shill budgets
are finite and their interest gates cap engagement (`NO_FLOOR_MAX_INTEREST_PROBABILITY` keeps
them non-guaranteed); (b) a passed lot is gone for THAT team — sandbagging costs the sandbagger
access to the player; (c) under the end-checkpoint a shill win removes ONE player, not a roster
seat's chain of 22; (d) the forced-filler never routes to shills, so scraps can't be dumped on
them. The sweep measures the residual: shill win-share and real-team fit outcomes as S rises —
if a config shows runaway shill hoarding, `winsPerShill` in the sizing model absorbs it and the
recommendation moves. Verdict lands with the sim numbers.
