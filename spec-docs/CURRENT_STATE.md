# CURRENT_STATE.md — LIVE HEADER

> ## 🔧 LATEST (2026-06-25, attended Hybrid `/kbl-captain`) — **TRAITS §8B slot-duel + seeded firing COMPLETE · §5 generation (rarity + flaws + max-1-elite-pitch) COMPLETE · DORMANT-TRAIT ENABLEMENT WAVE ruled + queued.** This session, all branch-only / Opus-audited-the-real-diff / independent-gate / **ZERO-NEW-REDS** / NO DB bump: **T-5a `5519c9c7`** + **T-5b `10aff46c`** ⇒ 🎉 **T-5 COMPLETE** (full §8B: value+incumbency slot-duel `gainScore`/`keepScore` β=1.25 + recompute-weakest + the **seeded margin firing roll**, opt-in via seed) · **T-4a `095717d6`** (rarity-weighted POSITIVE generation, §3.2 grade-dist held) · **T-4b `ac4280b1`** (§5 negative-polarity pass — prospects spawn flaws ~27%/slot, §3.2 held) · **T-4c `7956eee9`** (generation max-1 Elite-pitch). **JK RULINGS 2026-06-25 (DECISIONS_LOG):** (1) prospect FLAWS = YES; (2) **elite pitches BECOME EARNABLE** (reverses dormant-park); (3) the **DORMANT-TRAIT ENABLEMENT WAVE** — proxies ruled for **25** previously-dormant traits (the inventory found 48 earnable / 27 dormant; **capture fields + difficulty [`assignTier`] ALREADY EXIST — only the signal-builders are missing**). Matrix FINALIZED `TRAIT_MEASUREMENT_SPEC §0.6b`; queued `V1_BUILD_QUEUE A-W3.5` (4D-W2); scope-audit refreshed (`2bbe66d8`). **T-9a ✅ DONE (`a7932007`, ZERO-NEW-REDS) — the per-pitch NET-QUALITY aggregator** (build-dark `addPitchTypeSignals`: net-outcome score per `enrichment.pitchType` bucket [pitcher K+/out+/BB−/hit−−/**HR−−−**; hitter HR+++/big++/single+/BB+/out0/K−], `sampleSize`=tagged-AB count = the min-sample valve input, 7-class partition exhaustive over `AtBatResult`; INERT until BUILDABLE wiring; **make-or-break `tagged===plain` candidate output PROVEN**; FULL suite 2-fail/8215-pass = characterized only; NO DB bump). **T-9b ✅ DONE (`6f3fc727`, ZERO-NEW-REDS) — the 10 traits are now EARNABLE in-season** (added to `BUILDABLE_TRAITS` → scored + peer-percentiled, gated by the rate min-sample valve [dormant until ≥10 tagged ABs]; valve boundary PINNED 9→insufficient/10→sufficient; role-filtered; image valence mirrors K Collector ['COMPETITIVE','EGOTISTICAL'] = a §16 default, OPEN-DECISION-for-JK; no franchise/L-SIM golden shift). **T-9c ✅ DONE (`e95aba07`, ZERO-NEW-REDS) ⇒ 🎉 T-9 COMPLETE (a `a7932007` + b `6f3fc727` + c `e95aba07`)** — elite pitches (+ Fastball/Off-Speed Hitter) are EARNABLE in-season: per-pitch net-quality aggregator (HR heaviest) → BUILDABLE + K-Collector image valence + rate min-sample valve → engine-side max-1 Elite-pitch mutual-exclusion (held-defends; loss frees the slot) + one shared `ELITE_PITCH_TRAITS` const. All build-dark / branch-only / zero-new-reds / NO DB bump. **OPEN-DECISIONS-for-JK:** (1) the 10 traits' personality-driver affinity = K-Collector mirror (§16 default); (2) elite-pitch displacement = held-defends (vs §8B displace-with-keepScore). **➡ NEXT = DT-B (pitch-LOCATION)** — the 4 hitter traits High/Low/Inside/Outside Pitch earn from net-outcome on `enrichment.pitchLocation`-tagged ABs, REUSING the T-9a hitter net-outcome scorer; the 4 are already opposite-pairs so the existing opposite-pair duels handle exclusion (no new group rule); pattern = T-9a/b; FULL suite. Then DT-C (diving/chase, NEW rating-gate) · DT-D (errors incl. Noodle-Arm-re-added) · DT-E (mojo) · DT-F (bespoke incl. Metal Head). **T-9 overall** = elite pitches earnable = the wave TEMPLATE (SPLIT a/b/c; grounded `wf_54f5c51e-b82`) → **DT-B/C/D/E/F** (rest of the wave — pitch-location, diving/chase [NEW rating-gate], errors incl. **Noodle-Arm-re-added-as-mental-errors**, mojo, bespoke incl. **Metal-Head = PITCHER protective trait**) → then **T-3** (trend + SP/RP) / **T-6** (position-mismatch, coordinates with DT-D) → **T-7** (EOS). All build-dark, live post-D13. **HANDOFF_NEEDED written for a fresh captain session.** Prior-phase block (Priority-1 cleanups + earlier traits) ↓.

> ## 🔧 LATEST (2026-06-24, attended Hybrid `/kbl-captain`, fresh session) — **PRIORITY-1 RATINGS CLEANUPS COMPLETE.** Resumed the v1 FUNCTIONAL build per JK's mission brief (priority order: **1 ratings cleanups → 2 traits → 3 ratings-engine finish → 4 living-season tails → 5 Mode-1/launch tails**; OUT: UI polish, the sim/tuning pass, post-D13 activation, human gates). 4 tickets landed on `codex/franchise-v1-next`, all Codex-built / Opus-audited-the-real-diff / independent-gate / branch-only / ZERO-NEW-REDS / NO DB bump: **RA-12a `cf4a4205`** (delete legacy Model-B offseason rating engine) · **RA-12b `7004bc04`** (retire Model-C aging random-walk; all age/retirement DISPLAY kept) ⇒ 🎉 **RA-12 = one rating-mutation engine (Model A); clears the F-138 trap** · **CAT-MIGRATE `e59b6111`** (drop 4 worksheet-retired box-score categories powerIso/contactAverage/contactOnBase/pitchingFipPrevention; **KEEP powerHomeRunRate** per JK 4-drop ruling) · **NATIVE-WIRE `ea815008`** (wire SMB4-native difficulty-fielding into `fieldingRangeRate`; Speed already wired RA-2c-3; **Power native BLOCKED on A1.5b-2**). Suite baseline now **8193 pass / 2 fail** (characterized: `wpaRuntimeBoundary` hard + `franchiseManualSmokeFixture` solo-pass order-flake); trackerDb v25. **BV backlog += BV-RA-12b** (spring-training age-outlook view, post-flag). **PRIORITY-2 TRAITS IN PROGRESS** (all 4 soul-layer forks RULED — DECISIONS_LOG 2026-06-24: freeze trait values / split SP-RP / catcher protect-only / EOS same-thresholds): **L9b-2-cleanup `c92e8619`** (Noodle Arm out of earnable) · **T-1 `7e0e62ed`** (trait value/scarcity weight foundation — IV-marginal dollar anchors reproduced to the cent + MAX USES frozen) · **T-2 `f6c4ea0d`** (per-trait tier thresholds replace the flat scalar; negatives already badness-oriented so no inversion) · **T-5a `5519c9c7`** (§8B deterministic slot-duel: `gainScore=P×traitWeight` vs `keepScore=P_held×traitWeight×1.25` displacement currency + gainScore-desc admission + `maxTraits` open-slot cap + **recompute-weakest collision fix**; optional tuning fields + safe-weight wrapper; 4 displacement tests re-derived from real weights + 5 new; NO seed/randomness — T-5 SPLIT for clean audit). · **T-5b `10aff46c`** (the SEEDED firing roll — clearing a bar → ELIGIBLE, then a reproducible FNV margin-curve roll [monotonic, tier-hardened, §16] decides firing; **opt-in via seed presence** so T-5a tests stay green; loss-symmetric; caller seeds per-player-per-checkpoint) ⇒ 🎉 **T-5 COMPLETE (a+b)** — the full §8B slot-duel + seeded firing, build-dark/zero-new-reds/no-DB-bump. · **T-4a `095717d6`** (§5 rarity-weighted POSITIVE prospect generation — uniform pick→genWeight `pickWeighted` for trait1/trait2; valuable traits now rarer; **§3.2 grade-dist HELD ≤1.72pp** [rating anchor absorbs the re-mix, no target re-baseline]; 2 prospect-output test goldens re-baselined rarer→commoner; iv_oracle untouched). **JK RULING 2026-06-25 (attended): PROSPECT FLAWS = YES** (spec NEG 0.27; severe flaws stay rare via genWeight). · **T-4b `ac4280b1`** (§5 negative-polarity pass — prospects spawn flaws ~27%/slot from NEW neg pools [hitter 9/pitcher 7], no-2-negatives, opposite-safe both ways; **§3.2 grade-dist HELD ≤1.72pp** with flaws on [observed neg rate 0.2709]; `Volatile` excluded [priced-positive — logged inconsistency]; 2 gen goldens re-baselined). **➡ NEXT = T-4c** (max-1 Elite-pitch in GENERATION: `PROSPECT_ELITE_PITCH_TRAITS` + extend `prospectTraitsConflict`; existing-data check DONE = ZERO offenders, no scrub) → **T-9** (JK RULED 2026-06-25: elite pitches BECOME EARNABLE opt-in via `enrichment.pitchType` tags — per-pitch-type K aggregator + wire 8 elites into BUILDABLE + min-sample valve + engine-side max-1 mutual-exclusion; reverses the §0.6 dormant-park; the bigger one, likely SPLIT) → T-3 (trend + SP/RP split) / T-6 (position-mismatch protection-only) → T-7 (EOS one-more-checkpoint). *(Suite full-run order-flake watch: `AwardsWatchlist.test.tsx` + `franchiseOffseasonGuards.component` — both solo-pass verified.)* Then Priority-3 ratings-engine finish (A2.5 §6A · RA-5/7 · RA-11 · re-grade-per-checkpoint · RA-9 trend · V8 park→WAR), Priority-4 (L4b · trade-wiring), Priority-5 (Mode-1/launch tails). Full per-ticket detail in `AUTONOMOUS_RUN_LOG.md` (newest block). The blocks below are the PRIOR phase (RA-2c arc + lane-merge).

> ## ✅ LANE-MERGE COMPLETE (2026-06-24 — Captain/Opus owned, JK-confirmed) — **`codex/mode1-v1-b` → `codex/franchise-v1-next` landed at `87a59ec0`; MERGE FREEZE LIFTED.** The ENTIRE Mode-1 build (auction + prospect-gen + scout + draft-freeze + draft-morale + GM entity + roster board) is now ON the living-season branch alongside the L/D-stack — `LeagueBuilderAuctionDraft`/`useAuctionDraft`/`auctionStateMachine`/`cpuTeamRoles`/`draftFreeze` all present & compiling. The eventLog box-score fix (`875e4368`) was folded in (cherry-pick). Ran on a dedicated side branch in an isolated worktree (now removed); **only 2 conflicts** — the `franchiseInitializer` test (kept BOTH lanes' tests) + the contract log (unioned); mode1-b legacy deletions applied (`traitPools`/`PlayerNameWithMorale`/`TraitLotteryWheel`, no dangling refs). **GATE (merged tree):** build 0 · suite **8,228 pass / 1 fail** = the pre-existing `wpaRuntimeBoundary` hard fail, proven byte-identical on the pre-merge tip → **ZERO new reds** · IV oracle byte-identical · trackerDb **v25** reconciled (no double-bump, store list identical across lanes) · L-SIM smoke ALL CRITICAL invariants green (2 non-blocking `fame-war-legitimacy-floor` INVESTIGATE notes, NOT merge-caused). **➡ RESUME ALL BUILDING ON `codex/franchise-v1-next` (the single combined tree).** `codex/mode1-v1-b` is now fully merged (parked `fe98cdbc`) — do NOT keep building there. **Gate chain now: → L-SIM final (full-season, regenerates the committed baselines — run the DEFAULT/standard leg LAST per the cadence trap) → RB-16 → D12 → D13 → flag-flip → F-141.** Branch hygiene CLEARED (eventLog folded; ~26 stray `codex/*` branches all pre-June/stale → left untouched, out of v1).

> ## 🔵 RIGHT NOW (attended Hybrid via `/kbl-captain`, 2026-06-23→24 — FRESH SESSION) — **7 tickets landed, all branch-only / zero-new-reds / no DB bump:** Branch A: **A2.3 RA-rookie** (`738624fa`) · **RA-2CQ-1** pure contact-quality classifier+aggregators (`d97504dd`; JK ruled rate + hard-only) · **RA-2CQ-2a** season count fields (`90f134f1`) · **RA-2CQ-2b** LIVE writer accumulating the counts from per-game at-bat events (`3291415c`, swallow-guarded, processCompletedGame mocks green). Branch B: **S7b** band-is-range scout range (`688a2e39`) · **S7c** won-bid→farm salary (`8c2c9619`) · **S7d-1** relocate gradeToTwentyEighty + delete dead scoutPriceOpinion (`b8b97e5b`). → **next (Branch A) = RA-2c-2b-2 (window-eligibility + confidence + §9/§3B spec rewrite); RA-2c-2b-1 ✅ DONE `c10ec91b` (assemble + fan-out, zero-new-reds); engine layer DONE: RA-2c-1a `95d2215a` mean-pure/suppress + RA-2c-2a `0d0644ec` speed-sample + flat-floor gating; qualifier model fully ruled DECISIONS_LOG 2026-06-24); RA-2CQ-2c (`0ff7e88c`) + RA-2b (`622cc97d`) + RA-2c-1 (`9ae54ef3`) DONE; RA-2c-3 UBR deferred · (Branch B, HELD per JK 5-ticket ruling) = S7d-2/S7d-3 (deferred to a browser-verified pass — user-visible point-grade→band swap + HIGH-risk board-sort/salary)**. **BV BATCHED:** BV-A2.3 · BV-S7b · BV-S7c · BV-RA-2CQ (counts accrue per game) · BV-S7d-3 (later).
> **Phase:** V1 build, dual-branch parallel, attended Hybrid `/kbl-captain` loop (Codex builds → Opus audits the real diff → independent tsc/build+suite gate → commit branch-only, never push). **Backlog = `spec-docs/V1_BUILD_QUEUE.md`.** JK present, surfacing genuine measurement/design forks inline (this session: A2.3 rookie-window, S7b band-source, contact-quality rate+cut — all ruled, DECISIONS_LOG 2026-06-23).
> **➡ START HERE (Branch A): the A-lane tail (A2.5 §6A · A1.3a · L12-6 · L4b · A-W3 traits · A1.5d stadium records), then the gate chain (lane-merge → L-SIM final → RB-16 → D12 → D13 → flag-flip → F-141). 🎉 THE ENTIRE RA-2c RATINGS-ADJUSTMENT ARC IS COMPLETE** (RA-1 → RA-2a/2b → RA-2CQ stack → RA-2c-1/1a/2a → RA-2c-2b → RA-2c-3, all build-dark / branch-only / zero-new-reds / no DB bump). **RA-2c-3 ✅ DONE: 3a `082cd967`** (additive season fields `extraBasesTaken`/`advancementOpportunities` + un-dorm `speedBaserunningRate` in the adapter) · **3b `b6a65340`** (live per-game writer in `seasonAggregator` accruing the counts per baserunner via `aggregateUbrFromEvents`; speedBaserunningRate now carries real values; no transitive-mock-break). **§9/§3B spec rewrite DONE `2b9c7647`.** **➡ next options:** A-lane tail OR a JK browser-verify pass on the BV backlog (BV-RB-13b · BV-A2.3 · BV-S7b · BV-S7c · BV-RA-2CQ). 🎉 **RA-2c-2b CODE COMPLETE** (all 3 sub-tickets gate-green / zero-new-reds / no DB bump): **2b-1 ✅ `c10ec91b`** (assemble signal-bearing roster + relax 3 guards → roster-agnostic pool + `computeCheckpointRatingSignals` once + fan-out 1→N + delete `selectDevelopmentRatingKey` + bypass `normalizePerformanceSignal`) · **2b-2 ✅ `eb04b6f9`** (Gate 3 window-eligibility: `resolveWindowActivePlayerIds` reads ≥1 PA/≥1 BF from the at-bat log for games in `(prevBoundary, current]`; window-inactive STAYS a cohort member, isn't moved) · **2b-3 ✅ `0656640a`** (confidence-weighting: optional `confidence` param on `computeCheckpointRatingDevelopment` at cappedRaw, default 1 = identity; per-rating `clamp(sample/scaledThreshold(§16 fullSeasonSample, gamesPerSeason:totalGames, basis),0,1)`; thin→gentle, sustained→clears the 0.75 dead-band). **⚠ 2b-2 residual (build-dark, flagged):** the window scan reads COMPLETED headers → a debut-in-this-checkpoint-game player is missed if that game's header isn't `isComplete`/queryable before the sweep at `processCompletedGame:1080` — verify header-write ordering before flag-flip. RA-2c-1a + RA-2c-2a engine DONE. Full ruling = DECISIONS_LOG 2026-06-24. **Branch B (parallel, mode1-b): RB-13b draft-format routing ✅ DONE `fe98cdbc` (BV-RB-13b pending) per JK 2026-06-24** (B1.6 collapsed — Branch B's `prospectScoutingDraftEngine.ts` is already canonical; the stale stub is Branch A's, resolves at lane-merge).
> **(1) RA-2c-1a REVISION ✅ DONE (`95d2215a`, this session):** `src/utils/checkpointRatingSignal.ts` — MEAN now always **position-pure** (Rung 0, `resolvePoolMeanMembers` no longer widens); SPREAD borrows Rung 1; per-category move **SUPPRESSED** when the position-pure pool < `TRUE_VALUE_MIN_PEER_POOL_SIZE` (6) via a tuning override raising the engine's existing `minPeerPool` gate 3→6. Build-dark, no live caller; make-or-break test (2 middleIF + 6 cornerIF → middleIF suppressed, cornerIF moves) green; build 0 + 17/17 affected tests. Fixes the §4:65 conflict JK's questions caught.
> **(ENGINE LAYER ✅ DONE):** **RA-2c-1a `95d2215a`** (mean position-pure + suppress-when-thin) · **RA-2c-2a `0d0644ec`** (speed sample → SB+CS+triples; flat per-category sample-floor gating in `checkpointRatingSignal.ts` — exported `CHECKPOINT_SAMPLE_FLOORS` {power/contact 10 starter/5 bench · speed 2 events · fielding 5 chances · contact-quality 10 BIP · pitching 10 BF}, Gate 1==Gate 2, sole sample gate; engine internal minSample zeroed, minPeerPool stays 6). Build-dark, gate-green.
> **(2b) ✅ RA-2c-2b-1 DONE (`c10ec91b`) — assemble + per-rating fan-out landed:** fetch the 3 season getters + effective-position report, RELAXED all 3 guards (roster-agnostic pool), `classifyRatingsPoolKey` + NEW `ageToExpectedStatsBand` mapper (ageBand inert), `computeCheckpointRatingSignals` ONCE over the full member set, `CheckpointRosterEntry.performanceSignal`→`signalByRatingKey` + `createdAt:string|null`, fan-out 1→N (byte-exact id), DELETED `selectDevelopmentRatingKey`+`stableHash`, BYPASSED `normalizePerformanceSignal` (export kept), importActual test-mock fix. No-TV members are COHORT-ONLY (in the pool, no overlay — determinism: no deterministic createdAt yet). **➡ RA-2c-2b-2 (the residual) = (i) Gate 3 window-eligibility (read games since last checkpoint, ≥1 PA/≥1 BF, window-inactive stays a pool member but isn't moved); (ii) confidence-weighting `clamp(accumulatedSample/scaledThreshold(fullSeason,basis),0,1)` at `ratingsDevelopment.ts:117` cappedRaw (touches the SHARED engine — add an OPTIONAL confidence param, default 1, back-compat; full-suite gate); (iii) a deterministic roster-agnostic `createdAt` source so window-active no-TV members CAN be moved; (iv) PURGE-ON-SUPERSEDE rewrite of RATINGS_ADJUSTMENT_SPEC §9 + §3B. Reference full-2b spec ↓.** the sweep is **ALREADY CALLED** at `processCompletedGame.ts:1080` (wire the INTERIOR, do NOT add a call site). In `resolveCheckpointRoster` (≈:119): fetch `getSeasonBattingStats`/`getSeasonPitchingStats`/`getAllFieldingStats(scope.seasonId)` (all roster-agnostic, seasonStorage.ts:364/439/828) + `buildFranchiseEffectivePositionReport(...)`; **RELAX the `:139` MLB filter AND the `:144-145` teamId guard AND the `:141-142` trueValueRow guard** for POOL membership (free-agent member → fan-morale fallback 50; capture rosterStatus but don't exclude). Build `CheckpointSignalMember`s (`classifyRatingsPoolKey({role, effectivePosition ?? primaryPosition, startsShare})`; author a NEW age→ExpectedStatsAgeBand mapper — none exists; `ageBand` stays INERT/unconsumed = defer age modifier to A2.5). `computeCheckpointRatingSignals` (now does the flat-floor gating internally). Change `CheckpointRosterEntry.performanceSignal:number`(:97)→`signalByRatingKey`. **Gate 3 window-eligibility = Option 1 (JK): read games since last checkpoint on the fly** (NO new persistence; default threshold = appeared ≥1 PA/≥1 BF in window, §16); a window-inactive player STAYS a pool member, just isn't moved. **Confidence-weighting** = scale the move by `clamp(accumulatedSample / scaledThreshold(fullSeason,basis), 0,1)` at the cappedRaw stage (ratingsDevelopment.ts:117). **BYPASS `normalizePerformanceSignal`** (stop calling at :184, drop THIS file's import — do NOT delete the export, franchiseL10SweepCompute.ts:140 uses it). **DELETE `selectDevelopmentRatingKey` + its private stableHash**. Fan out the persist loop ONE overlay per MOVED rating (1→N). **KEEP EXACTLY** id formula `:267` + sourceEventId `:244` + `pending` `:276` + kind/expires `:274-275` + flag guard `:206` + boundary chain `:214-236`. **NO trackerDb bump** (reuse `franchiseRatingsOverlays`, cardinality 1→N; version-pin test stays 25). Update `franchiseCheckpointSweepCompute.test.ts` (add seasonStorage + effective-position mocks; assert 1→N, window-ineligible→0, pitcher never writes arm, thin/empty no-throw). **PURGE-ON-SUPERSEDE: rewrite RATINGS_ADJUSTMENT_SPEC §9 (MLB-only→roster-agnostic window-qualified) + §3B (season-scaled gate→flat floors)** IN this build. **Traps (recon `wf_a93cad4a-288` SOUND + critique):** already-wired-call-site (no dup) · relax ALL THREE guards (139/144/141) · bypass-not-delete normalize · delete selectDevelopmentRatingKey+stableHash · 1→N cardinality test · pitcher-arm null→skip · empty/thin no-throw · id-formula byte-exact · confidence×dead-band (verify a sustained signal eventually clears 0.75) · NEW age-band mapper. **SPLIT for clean audit:** can stay one ticket OR split fetch-build / window+confidence+fan-out. **RA-2c-3 (DEFERRED, JK): UBR/baserunning-advancement speed enrichment** — season advancement fields + per-game writer + un-dorm `speedBaserunningRate` + add to speed gate (RA-2CQ stack pattern; `ubrAggregator.ts` built but fully dark). **RA-2c-1 (`9ae54ef3`) + RA-2b (`622cc97d`) + RA-2CQ stack (1/2a/2b/2c: `d97504dd`/`90f134f1`/`3291415c`/`0ff7e88c`) DONE.** **A2.3 RA-rookie DONE** (`738624fa`; RA-5 modifier consumer + the Branch-B auction-path `draftedAsFarmProspect` stamp are follow-ups). **A1.5d** = stadium records (still pending; own DB `kbl-franchise-stadium-records`, new flag). **⚠ A1.5b-2 (DEFERRED OPEN-DECISION): re-derive the EnrichmentPanel SVG markers from `polarToXY` so a real "tap on the fence" → r≈1.0 — a live UI change needing browser sign-off + a PRECONDITION before the carry converter is wired live (A1.5d/RA-2).** Then A-W2 tail (A2.5 §6A) + A-W1 tail (A1.3a, L12-6, L4b) + A-W3 traits. Then the gate chain (lane-merge → L-SIM final → RB-16 → D12 → D13 → flag-flip → F-141).
> **➡ BRANCH B (PARKED clean at S7d-1 per JK — "advance Branch A, hold risky S7d"):** S6✅ S7a✅ S7b✅ (`688a2e39`) S7c✅ (`8c2c9619`) **S7d-1✅** (`b8b97e5b` — relocate `gradeToTwentyEighty`→`gradeEngine.ts` + DELETE the dead `scoutPriceOpinion`). **S7d-2/S7d-3 HELD** for a deliberate browser-verified pass: S7d-2 = delete the Gaussian model (`scoutProspect`/`confidenceFromAccuracy`/`ProspectScoutingReport`) + rewrite tests as band tests; **S7d-3 (HIGH-RISK)** = bands-required + re-point board SORT to the band + fix `franchiseSalary.safeRoundFromScoutedGrade`→`band.worst` (now only the won-bid FALLBACK post-S7c) + swap the scout-grade DISPLAY point→band across prospect-draft-origin readers — **KEEP `perceivedValueRange`/`scoutValueRange.ts`** [Mode-2 freeze dep]; **BV-S7d-3 NEEDED** (user-visible). ⚠ COUPLING: deleting the Gaussian producer breaks `scoutedGrade` consumers → re-sequence so each step compiles (recon's split needs this fix). Then RB-13b · RB-18 · B1.6. **ALL S7 FORKS RULED.** Per-wave detail in `BRANCH_B_PROGRESS.md`.
> **Branch topology (POST-MERGE — single tree):** `codex/franchise-v1-next` (worktree `/Users/johnkruse/Projects/kbl-tracker`, HEAD `87a59ec0`) is now the SINGLE combined v1 tree (L/D-stack + the full Mode-1 auction lane). `codex/mode1-v1-b` (`/Users/johnkruse/Projects/kbl-mode1-b`, `fe98cdbc`) is fully merged in — parked, do NOT build there; the `kbl-mode1`/`kbl-mode1-b` worktrees can be retired. ⚠ the pre-merge concurrent doc-worker's uncommitted edits (`FRANCHISE_MODE1_MODE2_PLAYABLE_V1_GAP_ANALYSIS.md` M + `HANDOFF_NEEDED` D) were left UNTOUCHED in the main worktree — stage by path, never `commit -a`; ONE committer. Dispatch: `sed -n '/CONTRACT: <id>/,/END CONTRACT: <id>/p' …/PROMPT_CONTRACTS.md | NODE_ENV= ~/.local/bin/codex exec -C <worktree> --skip-git-repo-check -s workspace-write -c model_reasoning_effort=high -o <out> -` (run_in_background); Opus audits the REAL diff (builder≠auditor) + independently `tsc -b`/build + suite, ZERO-NEW-REDS (characterized hard fail `wpaRuntimeBoundary`; solo-flakes `franchiseManualSmokeFixture` + `GameTrackerLaunchState`), branch-only, never push.
> **✅ BRANCH HYGIENE (resolved at the lane-merge):** the eventLog box-score-undercount fix (`875e4368`, ITPHR/GRD-as-hits + Ꝁ/D3K-as-Ks) is now FOLDED IN (cherry-picked onto the merged tree as `87a59ec0`; the `fix/eventlog-boxscore-undercount` branch's 3 design-doc commits were already duplicated on franchise-v1-next, left as-is). The **~26 stray `codex/*` branches** (gt-*, manager-*, wpa-*, optimal-lineup-*, elimination-*, almanac-*) ALL pre-date the V1 build (Feb–May 2026) ⇒ confirmed stale / not-v1-aligned (JK 2026-06-24); LEFT UNTOUCHED (unmerged ≠ deleted, no data loss) — out of v1 unless a deliberate future mining pass.
> **✅ DONE this session:** **A1.5a fame-fluctuation fix (`0cc319a0`) + A1.5b carry converter (`f3b48fbf`)** (both AUTH-4, gate-verified; A1.5b-2 SVG re-derivation deferred) + RA-2a category-rate adapter (`64addf71`, build-dark, gate-verified) + the box-score latent-bug fix (`875e4368`, own branch) + **the DESIGN BODY (committed franchise-v1-next): `RATINGS_MEASUREMENT_WORKSHEET.md` (`716d3337`, SMB4-native ratings model — batted-ball engine, per-rating signals, measured-fielding ladder) · `STADIUM_ANALYTICS_SPEC_V2.md` (`7e984c9c`, park records as living-season participants + the fame-fix) · fielding (`c39818b7`)** + the 11-fork pre-AUTH-4 sweep (DECISIONS_LOG 2026-06-23). *(Prior keystones this session: B8 `30359ae4`, G1 `40f876d7`, DH-seal `2550d3cf`, RA-1 `81c9fe25`, B12 `7d817965`, A1.2 legs `bc24dff4`/`f374271c`/`49d56ea5`, L13-8 closed.)*
> **⚠ KEY RULINGS (don't re-litigate — DECISIONS_LOG 2026-06-23):** **FAME FLUCTUATES up AND down** across tiers; only an all-star/major-award flat-pins `REGIONAL_STAR` (SUPERSEDES the old "fame floor = upward-only" — that was the per-game reachFloor ratchet, now being removed in A1.5a; the WAR-floor *gravity* stays separately upward-only) · RA-1 = MULTIPLICATIVE expected · ratings = SMB4-native batted-ball model (Power = park-adjusted carry × exit-velo; Contact = squared-up; pitcher = 4-tool, NO arm) · HR distance USER-ENTERED · TV 0.40 decoupled · all §16 magnitudes = sim-tune defaults · stadium records = build-dark, own db, NO trackerDb bump. **NO unattended `TRACKER_DB_VERSION` bump** (only risk = the DEFERRED A1.3b). **LESSON:** before changing a soul-layer metric's direction/sign, grep its L-SIM `soul.*` invariant + update it IN THE SAME DIFF.
> *(The Mode-1 RB-run ledger below is the PRIOR phase — superseded by this block + V1_BUILD_QUEUE.md A-W1.5.)*

> **⚙️ MODE-1 AUCTION REDESIGN RATIFIED (2026-06-21, JK attended) → AUTH-4 REBUILD QUEUED for a FRESH THREAD.** The overnight AUTH-4 run
> built the entire Mode-1 auction V1 (AUC-5.1, 16 tickets, build-dark, branch `codex/mode1-v1`). JK's attended review then **REVISED the
> design** → **`AUCTION_DRAFT_SPEC_V2.md`** (authoritative; V1 spec bannered superseded) + the execution sequence **`AUCTION_REBUILD_PLAN.md`**.
> **Single-Captain (Shape A):** Opus owns `codex/franchise-v1-next` (docs) + dispatches Codex for Mode-1 in `/Users/johnkruse/Projects/kbl-mode1`
> [`codex/mode1-v1`]. Codex builds, Opus audits, branch-only, never push.
> **LIVE LEDGER = `AUTONOMOUS_RUN_LOG.md` (WAVE 1–62) — read top-to-bottom on return; supersedes everything below.**
> **V1 BUILT (build-dark, branch-only, zero-new-reds — SHELLS SURVIVE the rebuild):** MLB AUC-1.1..4.1b + FARM 5.1a..e/d-1/d-2/d-3. The
> §2 bidding/CPU/wallet/persistence/hot-seat-UI + page shells are REUSED; the **value layer** (per-prospect-IV → scout price-range+20–80 grade)
> and **nomination/resolve** (GM-nomination → engine weighted-random + one-chance) are REWRITTEN, + new systems (dual archetype tax, MLB→farm
> carryover, draft→player-morale + payroll→fan-morale carried into Mode-2 via the 4-number freeze, separate GM entity, scout-as-bridge, roster
> board, guided UX, shill/CPU-team split). Mode-2 L1–L14 build-dark; L-SIM LSIM-P1 GREEN. Prospect-gen B1–B9 done.
> **✅ RB-0 COMPLETE (personality-model FOUNDATION, 3 commits on `codex/mode1-v1`, branch-only, zero-new-reds):** RB-0a `edb94d31`
> (canonical chemistry module `src/data/chemistryCanonical.ts` — `ChemistryCode` 5-code union + code↔word maps + `normalizeToChemistryCode`
> + frozen `CHEMISTRY_TARGET_DISTRIBUTION` {SPI .21/DIS .20/CMP .20/SCH .20/CRA .19} + 440-source drift test; `convertPlayer` player-path
> derives from it, byte-identical) · RB-0b-2 `16ca8d61` (farm-prospect chemistry rebalanced to target — largest-remainder quota + seeded
> shuffle, separate seed namespace, no other draw perturbed) · RB-0b-1 `fde093ed` (every MLB-pool player gets a fresh seeded 7-type
> personality + 4 hidden modifiers + target-balanced chemistry at `initAuction`, persisted via `savePlayer`, flowing into Mode-2; franchise-init
> backfill demoted to a no-op safety net; NO trackerDb/store change). **Pre-RB-0 suite baseline pinned = 481 files / 1 fail `wpaRuntimeBoundary`;
> after RB-0 = 484 files / 1 fail (same), 7991 tests.**
> **✅ RB-1 + RB-1b COMPLETE (WAVE 54–56, `codex/mode1-v1`, branch-only, ZERO-NEW-REDS each).** RB-1a `22095d09` (scout band re-anchored
> off exact true IV onto the scout's biased opinion + 20–80 grade — V1 midpoint-leak CLOSED). RB-1b `d64cf53d` (boundary-aware chemistry-fit
> engine — level-up/buffer/neutral, BIDIRECTIONAL for RB-9 per JK) + `883e3188` (MLB+farm chemistry feed [derived, NOT persisted] + scout-price
> wire: `perceivedValueRange(priceOpinion × chemFit, …)`, ≤+8% when a prospect's chemistry would level-up/buffer the GM's roster). Canonical
> IV/salary/oracle/`computeIV`/reserve/MLB-tier byte-untouched throughout. Suite **486 files / 8002 tests, sole fail `wpaRuntimeBoundary`.**
> **✅ RB-2a COMPLETE (WAVE 57, `2b7e894d`, `codex/mode1-v1`, branch-only, ZERO-NEW-REDS) — the PURE build-dark one-chance auction engine.**
> RB-2 SPLIT (2a engine / 2b wiring) because an in-place rewrite breaks all §2 consumers at once. ADDITIVE (old GM-nomination path byte-untouched):
> `selectNextNominee` (seeded weighted reveal ∝ (ivPct/100)^k, Efraimidis–Spirakis WRS; step=`results.length` → resume-safe; 0.02 weight floor → pool
> drains) + `surfaceNextPlayer` (engine surfaces next, no nominator) + `resolveLot`/`passLoneSurvivorOut`/`advanceLot` — **no-bid → PERMANENTLY OUT**
> (`finalizePassedLotPermanent`: no `passedTracker`/`setAsidePlayerIds`/re-add). `nominationWeightExponent?` config (default 2.5; per-tier MLB 2 / farm 3
> at RB-2b); `DEFAULT_AUCTION_SETUP_CONFIG` byte-unchanged. Suite **487 files / 8010 tests, sole fail `wpaRuntimeBoundary`.**
> **✅ RB-2b-1 COMPLETE (WAVE 58, `193a9270`, `codex/mode1-v1`, branch-only, ZERO-NEW-REDS) — the 2 JK-ruled engine mechanics, additive build-dark.**
> Q1 farm opening = FLAT floor (`config.flatReserveFloor` = `LEAGUE_MINIMUM_SALARY`, no rank leak); Q2 HARD roster-fill: `resolveNoBidLot` lets a
> no-bid lot PASS only while `avail ≥ Σ open slots`, else force-claims the neediest solvent team at reserve ⇒ softlock impossible. Suite **487 files /
> 8014 tests, sole fail `wpaRuntimeBoundary`.** **RB-2b SPLIT → 2b-1 (engine, done) / 2b-2 (WIRE) / 2b-3 (STRIP old machinery + rewrite engine test).**
> **JK RULINGS 2026-06-21 (RB-2-Q1..Q4, DECISIONS_LOG):** farm flat reserve = min salary · roster-fill = hard guarantee · k = MLB 2 / farm 3 ·
> new-league `draftFormat` default → `auction` (O-1 resolved).
> **✅ RB-2b-2 COMPLETE (WAVE 59 `456bd195` + WAVE 59-FIX `bacff8f2`, `codex/mode1-v1`, branch-only, ZERO-NEW-REDS) — WIRE the one-chance engine into
> all consumers.** Both tiers are engine-nominated + one-chance end-to-end: hooks' NOMINATION → unconditional `surfaceNextPlayer`, RESOLVE →
> `resolveLot`/`passLoneSurvivorOut` (the **59-FIX**: 456bd195 left resolve on the OLD `evaluateResolve`/`passLoneSurvivor`, so one-chance + the
> RB-2b-1 forced-filler were DEAD — auditor-caught on a disprove re-check, now LIVE), `rotate`→`advance`, k 2/3 + farm flat floor + auction default
> wired; pages swap the GM picker → engine-surfaced display (bidding UI preserved); `cpuShillBidding.resolveCpuNomination` deleted (bid/claim shills
> survive). Independent grep: zero old-API references in any consumer. Suite **487 files / 8013 tests, sole hard fail `wpaRuntimeBoundary` ⇒ ZERO NEW REDS.**
> **RB-1b model + refinement RULED (DECISIONS_LOG 2026-06-21):** per-trait COUNT · 3-tier L1≤3/L2 4-7/L3≥8 (grounded `TRAIT_INTEGRATION_SPEC`) ·
> PERCEPTION-LAYER · boundary-aware (level-up full / buffer 0.4× at floors / neutral) · BIDIRECTIONAL (RB-9 owes the `'remove'` send-down cost = D-8).
> **🎉 RB-2 COMPLETE (WAVE 60, `cb3e0edd` strip ⇒ the whole §2 engine-nomination + one-chance rebuild).** Chain: RB-2a `2b7e894d` · RB-2b-1
> `193a9270` · RB-2b-2 `456bd195` + 59-FIX `bacff8f2` (one-chance went LIVE) · RB-2b-3 `cb3e0edd` (orphaned machinery stripped — independent grep
> ZERO retired-API hits). The auction is now engine-nominated (seeded weighted reveal ∝ pctile^k, MLB k2 / farm k3) + one-chance (no-bid → permanently
> out + hard roster-fill forced-filler) + farm flat reserve, new leagues default to auction. Suite **487 files / 8000 tests, sole fail `wpaRuntimeBoundary`.**
> **🎉 RB-3 (MLB luxury tax) v1 COMPLETE (WAVE 61–62).** RB-3a `671eb8b7` (pure `auctionLuxuryTax.ts` helper, reuses ratified
> `shiftLuxuryCaps`+`luxuryTax`'taxed') · RB-3b `d5fd0bc3` (wire into `useAuctionDraft`: per-lot `applyAuctionLuxuryTaxForLot` after every
> `surfaceNextPlayer`, `projectedTax` = would-be total tax under `shiftLuxuryCaps(pool.luxuryCaps, team.capIdentity)` over LIVE roster + candidate →
> `auctionMaxBid` reduces off-archetype bids; farm tax-neutral). Suite **488 files / 8005 tests, sole fail `wpaRuntimeBoundary`.**
> **CAPTAIN SCOPE CALLS (AUTH-4 defaults, flagged for JK):** (1) RB-3 = **MLB luxury tax ONLY** (reuses the existing single `Team.capIdentity` as the
> MLB archetype; the auction had been ignoring it). (2) Farm-archetype **DUAL identity → DEFERRED to RB-9** (its §3.5 scout-tilt consumer; farm wallet
> tax-neutral). (3) Full **§5.3 EV-flatness cross-identity harness → DEFERRED to RB-16** (sim-validation; T3 verified the property at tierCap) — RB-3a
> shipped a fit-discrimination sanity test instead of a heavy best-roster optimizer.
> **🎉 RB-4 (MLB→farm budget carryover) COMPLETE (WAVE 63, `217ed234`, `codex/mode1-v1`, branch-only, ZERO-NEW-REDS).** The §4.5 one-way valve is
> LIVE: each GM carries **50%** (`MLB_TO_FARM_CARRYOVER_PCT`, RB-16 sim-tune §11) of their OWN unspent MLB budget into their OWN farm wallet. ADDITIVE —
> reads the persisted MLB session's per-team `budgetRemaining` (authoritative unspent cash; the luxury tax never reduces it) gated on MLB
> `AUCTION_COMPLETE`; per-team join by teamId (never pooled); missing/snake/incomplete MLB → 0; NO new persisted field / NO trackerDb / NO schema change;
> MLB hook + auction state machine + frozen oracle untouched. Suite **488 files / 8012 tests, sole hard fail `wpaRuntimeBoundary`** (+ the
> `GameTrackerLaunchState` order-flake, verified passes SOLO 9/9).
> **🎉 RB-5 (player morale from the draft) COMPUTATION COMPLETE (WAVE 64, `2374e5d1`, `codex/mode1-v1`, branch-only, ZERO-NEW-REDS).** Pure
> build-DARK `src/engines/draftMorale.ts`: §6 starting morale off neutral 50 from slot(±15, won-order terciles) + pay(±10, vs scout range), SUM-then-tilt
> via a behavior-preserving extract (`applyPersonalityToSelfMoraleDelta`) from the already-built `masterMoraleMatrix` → "early dominates" holds for ALL 7
> personalities (a correct Codex BLOCK on DROOPY under the rejected tilt-each model drove the sum-then-tilt fix; logged as a JK OPEN-DECISION). Part (c) —
> seeding this into Mode-2 starting morale at the §10 freeze — is RB-7. Suite **489 files / 8021 tests, sole hard fail `wpaRuntimeBoundary`.**
> **🎉 RB-6 (fan morale from payroll) COMPUTATION COMPLETE (WAVE 65, `d90cc5d8`, `codex/mode1-v1`, branch-only, ZERO-NEW-REDS).** Pure standalone
> `src/engines/draftFanMorale.ts` (zero imports): §7 starting fan morale off neutral 50 from payroll RANK vs the median (rank-normalized `i/(N−1)`),
> exponential penalty past the 75th/25th percentile, HIGH side 2× (30 vs 15), in-band=exactly 50, clamp [0,100], degenerate→neutral. Provably-isolated
> new-file ticket → gated `tsc -b` 0 + the new test 8/8 (the payroll-sum data path = RB-7).
> **🎉 RB-10 COMPLETE (WAVE P8–P9, `codex/mode1-v1-b`, branch-only, each ZERO-NEW-REDS) — CPU shill ↔ CPU-controlled-team split + dissolve-to-pool, end-to-end.** RB-10a `36ac4fa0` (pure build-dark `src/engines/cpuTeamRoles.ts` — `classifyCpuTeams`/`deriveShillTeamIds`/`deriveControlledCpuTeamIds`; `allCpuTeamIds` byte-identical to the existing `deriveCpuTeamIds` auto-bid set ⇒ zero drift; `excludeFromLeague` = the dissolve switch; `controlledBy==='ai'` never a shill). RB-10b `8911a177` (DISSOLVE enforcement — shill-team SOLD lots excluded at `buildDraftFreezeInputs` ⇒ shill wins NEVER seed Mode-2 player/fan-morale + settledSalary; `franchiseInitializer` step 8.5 computes the shill sets via `deriveShillTeamIds` + real league `controlledBy`; additive/backward-compatible; NO DB/shape change). FULL suite 498 files / 8050 tests, sole fail `wpaRuntimeBoundary`. **KEY DISCOVERY:** the live conflation was in the FREEZE/morale path (`franchiseInitializer.ts:683` RB-7b), NOT a roster-commit path (the auction does not populate TEAM_ROSTERS). **JK OPEN-DECISION D-10b-1 (soul-layer fork):** excluding shill wins compresses the within-tier won-order denominator for real players (slot-morale measured among real wins only) — confirm the denominator. Full detail in `PARALLEL_LANE_LOG.md` WAVE P8–P9.
> **✅ RB-11 COMPLETE (WAVE P10, `4428230a`, `codex/mode1-v1-b`, branch-only, ZERO-NEW-REDS) — scout-privacy UI (§3.6).** NEW pure `LongPressReveal.tsx` (pointer-based cover/reveal, iPad-ready) wraps the farm page's scout value+grade ⇒ default-COVERED, long-press REVEALS, re-covers on release; Opening/budgets/max-bid/roster board stay public; MLB auction unchanged (public). Characterized page test updated to the new behavior (non-scout assertions preserved). FULL suite 499 files / 8053 tests, sole fail `wpaRuntimeBoundary`. **BV-11 batched.** Detail in `PARALLEL_LANE_LOG.md` WAVE P10.
> **✅ RB-12 COMPLETE (WAVE P11, `18e67473`, `codex/mode1-v1-b`, branch-only, ZERO-NEW-REDS) — guided UX (§9).** Pure `AuctionCoachBanner.tsx` (`auctionCoachLine`, exhaustive tier-aware switch, 10 v1 lines) renders a contextual COACH line per auction phase on both pages; additive. FULL suite 500 files / 8068 tests, sole fail `wpaRuntimeBoundary`. **BV-12 batched; D-12-1 lines tunable for JK.** Detail in `PARALLEL_LANE_LOG.md` WAVE P11.
> **✅ RB-13a COMPLETE (WAVE P12, `aa1bf805`, `codex/mode1-v1-b`, branch-only, ZERO-NEW-REDS) — draft-format picker at league create/edit (§9 input side).** Auction(default)/Snake `<select>` persists `LeagueTemplate.draftFormat`. FULL suite 500 files / 8070 tests, sole fail `wpaRuntimeBoundary`. **13b (route the draft flow by `draftFormat`) DEFERRED** — no global active-league anchor (JK call needed); **SPEC TENSION** §9.A auction-only-v1 vs §9:411 picker-offers-snake (BV-13a batched). Detail in `PARALLEL_LANE_LOG.md` WAVE P12.
> **✅ RB-14 COMPLETE (WAVE P13, `68cfbc4e`, `codex/mode1-v1-b`, branch-only, ZERO-NEW-REDS) — prospect POSITION_POOL §3.3 fix.** `POSITION_POOL` (coarse uniform, no `SP/RP`) → `POSITION_PRIMARY_WEIGHTS` (exact §3.3 table, sum 100, no DH) via `pickWeightedValue` at the same seed. 1-iter BLOCK→fix (golden regen, chemistry invariants green; golden diff localized to the 4 position-changed candidates). FULL suite 500 files / 8071 tests, sole fail `wpaRuntimeBoundary`. SP/RP now generated (was 0%). **BV-14 batched.** Detail in `PARALLEL_LANE_LOG.md` WAVE P13.
> **🛑 RUN WRAPPED (JK ruling 2026-06-22, attended): clean handoff at the RB-14 seam.** 7 tickets shipped this session on `codex/mode1-v1-b` (all branch-only, never pushed, each ZERO-NEW-REDS): RB-10a `36ac4fa0` · RB-10b `8911a177` (🎉 RB-10) · RB-11 `4428230a` · RB-12 `18e67473` · RB-13a `aa1bf805` · RB-14 `68cfbc4e` (+ docs WAVE P8–P13). Suite 500 files / 8071 tests, sole hard fail `wpaRuntimeBoundary`; trackerDb v25 (no bump this run). **Mode-1 RB Phases 0–4 COMPLETE** (value spine · budgets · morale/GM/freeze bridge · scouting/UX/shills).
> **➡ NEXT (fresh session, `/kbl-captain`): 2 RB tickets remain.** **RB-13b** = route the draft flow by `draftFormat` — **the snake-in-v1 tension is RESOLVED (JK 2026-06-22: snake STAYS user-selectable; RB-13a picker confirmed; see DECISIONS_LOG)**; remaining fork is the engineering active-league routing model (no global anchor; both draft pages self-pick `leagues[0]`; static no-param routes) → take a documented default (e.g. per-league "Draft" action in CURRENT LEAGUES routing by that league's `draftFormat`). **RB-16** = the large §11 sim-tune sweep + draft-economy validation harness (L-SIM-style, Captain-run). ⚙️ **LANE CONSOLIDATED: the single active Mode-1 code lane is `codex/mode1-v1-b`** (worktree `/Users/johnkruse/Projects/kbl-mode1-b`, the superset = `codex/mode1-v1` + RB-17 + RB-15); `codex/mode1-v1` is parked clean at `956fd15d`. Dispatch all Mode-1 Codex builds in `kbl-mode1-b`. **🎉 RB-9 COMPLETE (the scout-as-bridge + roster board, end-to-end) — full per-wave detail in `PARALLEL_LANE_LOG.md` WAVE P3–P7:** RB-9b-2 `02e90f0d` (Defense-inclusive 6-band hole-weighting tilt — JK D-9b-2 reversal, retires the 5-cat bridge) · RB-9c-1 `4320f02a` (independent farm-archetype setup picker) · RB-9c-2 `e8af77ff` (§9 position-slot roster board on both auction pages — JK position-slot-grid ruling) · RB-9c-3a `54de2f62` (MLB board analyzer gap-priority + wallet-cap solvency warning + shared board props) · RB-9c-3b `57fd1428` (farm board = MLB holes tilted by `farmCapIdentity`, the §3.5 bridge). All ZERO-NEW-REDS; suite 497 files / 8043 tests, sole hard fail `wpaRuntimeBoundary` (GameTrackerLaunchState/AwardsWatchlist = solo-passing order-flakes). Also `df4ada33` RB-17 + `30810a86` RB-15 (parallel-lane cleanup, pre-consolidation). **JK BROWSER-VERIFY (BV-9):** set distinct MLB+farm archetypes at setup → MLB auction (board + priority gaps + over-budget warning) → farm auction (the board surfaces MLB holes weighted by your farm archetype). 🎉 **RB-8 COMPLETE** (GM identity entity §8: RB-8a `f5f20e93` entity+persistence · RB-8b `7642ccb6` naming UI · RB-8c `2fb5f641` reporter GM-voice/fire-authority; GM rides the franchise config additively, NO DB bump). 🎉 **RB-7 COMPLETE** (the whole §10 four-number freeze → Mode-2 bridge):
> ✅ RB-7a `103ac42a` (pure `draftFreeze.ts` engine) · ✅ RB-7b `bba6e1a8` (the PAYOFF LIVE — `franchiseInitializer` step 8.5 seeds Mode-2 player + team-fan
> starting morale from the draft, overriding the neutral-50 default) · ✅ RB-7c `1bd042e5` (additive `Player.settledSalary` stamp). All four §10 numbers
> stamped at franchise-init checkpoint-0; **NO trackerDb bump anywhere** (TRACKER_DB_VERSION stays 25); FULL suite 493 files / 1 fail (wpaRuntimeBoundary)
> = zero new reds. **JK OPEN-DECISIONS to review:** D-7a-1 (slot order global-within-tier) · D-7a-2 (fan payroll MLB-only) · D-7b-2 (iv-centered freeze
> range @ default accuracy 70) · D-7c-1 (farm settledSalary deferred) · **D-7c-2 (winning bid does NOT carry into Mode-2 cap/payroll — should it?).**
> **✅ RB-8a COMPLETE (WAVE 70, `f5f20e93`, `codex/mode1-v1`, branch-only, ZERO-NEW-REDS):** the GM identity ENTITY + additive persistence. NEW `GmProfile`
> (parallel to `ManagerProfile`) + pure `src/utils/gmIdentity.ts` (`buildGmProfile`/`getGmProfile`); every franchise gets a named GM at init (user gmName OR a
> deterministic SMB4 default seeded on franchiseId), persisted additively on the franchise config + metadata (kbl-app-meta). **CAPTAIN SAVED-SHAPE RULING:** GM
> rides the franchise config — NO new DB/store, NO version bump (META_DB_VERSION 3 + TRACKER_DB_VERSION 25 untouched; version-pin green) — because the GM is
> franchise-scoped (the user IS the GM) so it lacks the cross-instance requirement that justified the manager's separate identity DB. FULL suite **494 files /
> 8048 tests, 1 fail (wpaRuntimeBoundary).** **RB-8 SPLIT:** 8a (done) / **RB-8b (NEXT) = FranchiseSetup GM-name input UI** (binds `config.gmName` → overrides the
> generated default) / 8c (fire-authority + reporter L11 gmName threading — roster/draft GM-voice adapters are DARK, only the live L11 manager-change site gets
> the GM voice). **RB-8a OPEN-DECISIONS (defaults taken):** D-8a-1 (GM home = franchise-config additive, not a new DB) · D-8a-2 (blank default = generated SMB4
> name) · D-8a-3 (single user-GM per franchise) · D-8a-4 (the 8a/8b/8c split). Then RB-9 … RB-18.
> **✅ RB-8b COMPLETE (WAVE 71, `7642ccb6`, `codex/mode1-v1`, branch-only, ZERO-NEW-REDS):** the GM naming flow — a "GM NAME" input on FranchiseSetup Step-6
> (peer to FRANCHISE NAME) binds `config.gmName` → flows through `initializeFranchise` into RB-8a's `buildGmProfile` (typed name overrides the generated default;
> blank keeps it). Optional (no required gate); franchise-copy characterized tests untouched. FULL suite **494 files / 8049 tests, 1 fail (wpaRuntimeBoundary).**
> **✅ RB-8c COMPLETE (WAVE 72, `2fb5f641`, `codex/mode1-v1`, branch-only, ZERO-NEW-REDS) ⇒ 🎉 RB-8 COMPLETE.** Additive `gmId?`/`gmName?` threaded through the PURE
> build-DARK L11 manager-change adapter (`franchiseL11ManagerChangeNewsAdapter` — still NO production caller) `facts`, so the reporter names the GM as the firing
> actor when its emission seam goes live post-D13; the `reason:'user'` manager-firing already models GM-owned fire-authority. FULL suite **494 files / 8050 tests,
> 1 fail (wpaRuntimeBoundary).** Closes the plan's "RB-8 GM↔manager fire-authority path" item. **NO trackerDb/kbl-app-meta version bump anywhere in RB-8.**
> **✅ RB-9a COMPLETE (WAVE 73, `2c67bcbf`, `codex/mode1-v1`, branch-only, ZERO-NEW-REDS) — the scout-as-bridge hole-detection FOUNDATION (build-DARK).** `+ 'draft_prep'`
> on `RosterAnalyzerSurface` (additive enum; surface is a passthrough label, behavior comes from INPUT) + NEW pure `src/utils/rosterAnalyzerDraftAdapter.ts`
> (`buildDraftAnalyzerInput`/`analyzeDraftRoster`) mapping the GM's in-progress won MLB+farm roster → the EXISTING `analyzeRoster` (REUSE, not a parallel hole-detector).
> MLB ratings VISIBLE (public §3.6), farm ratings OBSCURED + scout signal on `optionState` (§3.2). Make-or-break proven: incomplete MLB roster → `position_coverage`
> holes; farm prospects → `farm_options`/`call_up_advice` (read_only) — all from the existing engine. NO UI consumer yet (RB-9c). FULL suite **495 files / 8054 tests,
> 1 fail (wpaRuntimeBoundary).**
> **✅ RB-9b COMPLETE (WAVE 74, `475fed15`, `codex/mode1-v1`, branch-only, ZERO-NEW-REDS) — the farm-archetype field (saved-shape) + the archetype→profile-target BRIDGE (build-DARK).**
> Additive `farmCapIdentity?: TeamCapIdentity` on the leagueBuilder `Team` (DUAL identity, peer to MLB `capIdentity`; `kbl-league-builder` v8 record field, NO version bump, V6-migration
> round-trip test green) + NEW pure `src/engines/farmArchetypeProfile.ts` `bandPrioritiesToTargetProfile` (the bridge `composeIdentity` lacks: band priorities → `Smb4TeamProfileLevels`
> target; Power/Contact/Speed/Rotation/Bullpen mapped, Defense dropped; priority→level curve sim-tunable). FULL suite **496 files / 8059 tests, 1 fail (wpaRuntimeBoundary).**
> **RB-9 SPLIT:** 9a ✅ / 9b ✅ / **9b-2 ✅ / 9c-1 ✅ / 9c-2 ✅ / 9c-3a ✅ / 9c-3b ✅ → 🎉 RB-9 COMPLETE** (on `codex/mode1-v1-b`; see the NEXT pointer above + `PARALLEL_LANE_LOG.md` WAVE P3–P7). The D-9b-2 reversal made the tilt 6-band/Defense-first-class; the board is the JK-ruled position-slot grid.
> Reuse `analyzeDraftRoster` (9a) + `bandPrioritiesToTargetProfile`/`compareTeamProfiles`/`calculateTeamProfile` (9b) for archetype-weighted gaps; the existing analyzer panels are a STYLE
> reference (text chips), the glanceable MLB+farm gaps-highlighted board is NEW UI; mount on both auction pages; GM team via `controlledBy==='human'`; scout-JOIN reuses `scoutRangeForProspect`.
> **RB-9a/9b OPEN-DECISIONS (defaults taken):** D-9a-1 (draft salary disabled) · D-9a-2 (self-contained adapter DTOs) · D-9b-1 (farm-archetype home = leagueBuilder Team, no DB bump) ·
> D-9b-2 (Defense band dropped from profile-gap) · D-9b-3 (priority→level curve, normalized by max mapped, sim-tunable). Then RB-10 … RB-18.
> **OPEN (verify at RB-16):** the §2.3 surplus pool-sizing (pool ≥ total slots) lives upstream in the pool builder; the RB-2b-1 forced-filler
> guarantee assumes it. **JK-BROWSER-VERIFY BATCHED
> (persistence-prioritized):** RB-0b-1 — a real draft stamps all 3 axes onto league players + they carry into the franchise (7-type personality
> spread); BV-3 now also covers the RB-1a scout price-range + 20–80 grade display + the RB-1b chemistry-fit bump + the RB-2 engine-surfaced
> one-chance flow (true IV no longer reverse-engineerable from the band midpoint).
> **2026-06-21 ATTENDED GROUNDING (WAVE 50, this session — all committed, NO code):** added §3.7 **3-axis personality model** (primary
> personality 7 / hidden modifiers 4 / chemistry 5) + **RB-0**; CORRECTED the morale model at source — the engine
> (`masterMoraleMatrix.composeMoraleConsequence`) is ALREADY BUILT (per-personality reactivity + ambition/resilience/charisma/loyalty roles +
> relationship contagion + legacy reconciliation), so **RB-5 is REUSE, not net-new**; the old `playerMorale.ts` baselines are DEAD LEGACY →
> **RB-17** (split-deprecate) + **RB-18** (live lineup morale indicator). JK RULINGS: regenerate ALL 3 axes for every MLB-pool player
> (heterogeneous pool — stock + user-created); **chemistry target = the EXACT near-uniform 440 shape SPI 21/DIS 20/CMP 20/SCH 20/CRA 19**
> (grounded + adversarially-verified — fully populated 3-letter codes on the `PLAYERS` record, NOT `src/data/players/mlb/`); COMPETITIVE
> morale row confirmed-correct (1.15/1.05); morale shown live under the player name near the line-score (fixed-height, zero-reflow).
> All §13/§11 dials are default-set + sim-tunable (RB-16) — none block the build.
> **📋 ALL browser-verify tasks + code deferrals + open JK decisions are CONSOLIDATED + BATCHED → `spec-docs/MODE1_REBUILD_JK_BACKLOG.md`**
> (JK directive 2026-06-21 — one workable list; persistence browser-verify PRIORITIZED [BV-1 leagueBuilder v7→v8 + mid-draft resume,
> BV-2 RB-0b-1 3-axis persistence]; BV-3 = the whole auction surface after the rebuild). The batch CLEARS before the D0 / flag-flip /
> iPad-playtest gate (F-141); none of it blocks the RB build loop. (Mode-2 L-stack has its OWN separate post-D13 browser batch.)
> **⚠ Everything below this block is STALE (L13-era) — trust the ledger.** `caffeinate` PID 84474 keeps the Mac awake.
> **⚠ SOLO-WORKER:** a JK-invoked session is the SOLE owner (collision reconciled WAVE 23). On handoff, let the SINGLE
> auto-spawn continue — do NOT also manually start a session (that double-invoke = the WAVE 22/23 collision).

**Last Updated:** 2026-06-20 — **ATTENDED session (JK present).** **HEAD STATE: L13 stack in progress (build-dark) — L13-1
CLOSED** (relationship edge store + trackerDb v25 migration, browser-verified on a real franchise, no data loss) **· L13-2
verified-complete** (edge-type taxonomy, 9→6 map). **NEXT = L13-3 (edge formation @ checkpoint) — BUT the checkpoint cadence
is under JK review** (currently fixed 20% = 5/season; JK wants it configurable by season length — note this is the SHARED
checkpoint cadence used by ratings-dev + traits too, not L13-only). **Parallel track: H3 L-SIM sim-hardening COMPLETE through
Step 4 + the season-end honor-decouple PRODUCTION fix** (the sim caught it; verified, browser-pending at the post-D13 flag-flip).
*(prior head:)* **✅ L12-5 COMPLETE
(a/b/c/d/e-1/e-2) — the award/All-Star PAYOUT layer is FULLY BUILT.** L12-5 = emission + L3 race-snub morale + honor→reach-floor
ratchet for the marquee honors (MVP/CY/All-Star — Q6), fired at TWO trigger edges. Recon + 3 JK rulings (snub = **close losers
only**; the new race tap = **snub-only**, keep the legacy nod; reach-floor = **whole team, starters get more**) →
`spec-docs/L12-5_SCOPE_MAP.md`. **Built (each Codex-built → Opus-audited → full host gate, build-DARK):** 5a `f1ba864a`
(`AWARD_RESULT` event + pure reporter adapter) · 5b `85c4cb72` (seam `emitFranchiseHonorNews` emit-glue, honorKind dedup) ·
5c `2e1552e4` (L3 snub: `MORALE_TAP_REGISTRY.race` fresh non-neutral resolver + `{kind:'race'}` event [make-or-break] +
`pickRaceSnubVictims` close-losers, L12+Morale gated) · 5d `644a4e29` (honor→reach-floor: non-decaying `applyHonorHeatBump` +
`honorHeatBump` ladder, L12+Fame gated) · **5e-1 `5180cc42`** (the All-Star LOCK edge: `runFranchiseAllStarLockPayouts`
[reach-floor whole-team role-tiered + snub top-3 + emit via the most-represented team] hooked into the L12-4d persist wrapper
on `'persisted-locked'`) · **5e-2 `1540e8be`** (the SEASON-END edge: `emitFranchiseSeasonEndHonors` reads finalized MVP/CY rows
+ `playerId→teamId` map → emit→[fire-once on `'emitted'`]→reach-floor+snub; ADDITIVE FranchiseHome chaining after the two
finalize calls). **⚠ TRAPS handled (all verified live):** snub tap fires ONLY on `kind:'race'` + a fresh non-neutral resolver;
reach-floor needs a 3rd flag (Fame) substrate; the emit `seasonNewsItems` dedup is the single FIRE-ONCE guard for all three
season-end effects (prevents the React-effect double-ratchet); 3 transitive-import-mock breaks (L12-3b/4d/5e-1 pattern) each
auditor-fixed (test-only stubs). **DEFERRED (noted, not dropped):** the `allStarSelections` career-counter write (greenfield
write-path → a 5e follow-up / L12-6). suite **7,829/457, ZERO new reds**; trackerDb v24; branch-only; **nothing pushed**.
**BROWSER-VERIFY (batched, post-D13):** at the flag-flip, confirm the reporter narrates MVP/CY at season-end + the All-Star
announcement at the 60% lock, the snub morale lands on the close losers, and the reach-floor ratchets (needs the Fame flag on too).
**➡ NEXT = L12-6** (Almanac/UI surfacing — the LAST L12 piece: feed the flag-off All-Star UI from the real builder, surface the
race standings/award races + the new categories in `AwardsWatchlist`, + the deferred `allStarSelections` counter). Then L13 →
L14 → the L-SIM gate. *(prior:)* **✅ L12-4 COMPLETE
(a/b/c/d) — the All-Star roster selection engine + 60% lock is FULLY BUILT.** v1 = **ONE league-wide 26-man team, any league
size** (8 fame-led position starters + 5 family-grouped merit backups + 12 pitchers [4 SP/1 backup SP/5 RP/2 backup RP,
usage-classified via `gamesStarted`] + 1 fame-led WILDCARD); **no DH; two-way = stronger side only.** User-selectable
1-vs-2-teams + dual-conference + the per-position min/max League-Builder customization (JK sketched) are **DEFERRED to v2**
(modeled as a config preset so they drop onto the same engine without a rebuild). Build-DARK + doubly-dark behind
`isFranchisePhase2L12Enabled` (the persist writes only when the flag is on, post-D13). **NO DB/schema work** — the
`franchiseAllStarRosters` store + the `FAN_VOTE_WEIGHTS` fan-vote scorer already existed (L12-1/L12-3); trackerDb stays
**v24**. **L12-4 commits:** 4a `d23cbd66` (pure selection engine) · 4b `fc92e421` (candidate exporter, relaxed mid-season
floor) · 4c `f457ad18` (lock helper, at-or-past skip-safe) · 4d `e1773624` (live-path persist + `processCompletedGame`
wiring). **➡ NEXT = L12-5** (emission [MVP/CY/All-Star emit, rest visibility-only] + the L3 race-snub morale row
[`MORALE_TAP_REGISTRY.race`] + honor→Reach-floor map + the reporter→`SeasonNewsEvent` adapter) → L12-6 (Almanac/UI) → L13 →
L14 → L-SIM. Codex-built → Opus-audited (builder≠auditor; the full host gate caught + the auditor mechanically fixed the
L12-3b-precedent regression in 4d — `FranchiseHomeLaunch.test.tsx`'s partial `seasonStorage` mock lacked `getSeasonMetadata`,
broke at module-load, NOT a flake; test-only stub). **BROWSER-VERIFY (batched, prioritized — persistence/saved-shape):** at the
post-D13 flag-flip, confirm a completed game writes a `franchiseAllStarRosters` row + freezes at the 60% mark. Branch-only
(**NOTHING pushed**), build-DARK; trackerDb **v24**; suite **7,792/451, 7,790 pass / 2 characterized fail, ZERO new reds**.
Full L12-4 recon/seams/rulings → `spec-docs/L12-4_SCOPE_MAP.md`. *(prior:)* **✅ L12-3 COMPLETE
(a/b/c/R-1/R-2) — the race-standing system is FULLY BUILT.** The per-game race-standing recompute now covers ALL 8 merit
categories (MVP/CY/SS/GG/RoY/Bench/Booger/Reliever) + the TV-family (KK/Bust/Comeback), reads `resolveFameTier` ONLY,
recompute-only + doubly-dark behind `isFranchisePhase2L12Enabled` (the LONE live exception = the L12-3R-1 `pitchingWpa`
season substrate write — browser-verify batched #24). L11 (managers) FULLY
COMPLETE (1–5); the L11–L14 RULING PASS is consolidated (all 43 Qs ruled). **L12-Q10
RULED (JK 2026-06-19): DEFER the live `getFameTier` label-purge to the post-D13 fame activation; the only hard
requirement folds into L12 (the build-DARK race code reads `resolveFameTier`, NEVER the scalar `getFameTier`) — so
L12-Q10 needs NO standalone work now.** **L12 RECON DONE → `spec-docs/L12_SCOPE_MAP.md`** (6-piece split, adversarially
verified; a CONCURRENT-WORKER 7-piece dup was RECONCILED per JK's TAKE-OVER ruling). **✅ L12-1 COMPLETE (2026-06-19,
AUTH-4) — dark landing infra:** new default-OFF `isFranchisePhase2L12Enabled` flag + `FranchiseAwardCategory` +4 season-race
slots [Q1: ALL_STAR/BENCH_PLAYER/BOOGER_GLOVE/RELIEVER_OF_YEAR; defer the 2 one-shots] + the NEW dark id-keyed
`franchiseAllStarRosters` store with the FULL 7-site mirror (**trackerDb v23→24**, syncConfig, backupRestore schema+version,
+ the ledger-PIN/manifest/parity tests) + a new storage test. **Codex(gpt-5.5)-built → Opus-audited (builder≠auditor) →
host-gated:** `npm run build` 0 + full suite **7,737/443, 7,735 pass / 2 characterized fail**, ZERO new reds (+8); store
count **43**; build-DARK (store EMPTY, no writer/hook); KBL_BACKUP_VERSION stays 2. *(Codex's STOP-IF correctly caught an
under-specified mirror surface across 2 dispatches BEFORE any broken-mirror commit — the L6b-1 failure mode, prevented.)*
**✅ L12-2 COMPLETE (2026-06-19, AUTH-4)** — pure TV-family scorer `src/engines/franchiseTvFamilyScorer.ts`
(`computeFranchiseTvFamilyRaces`): KK = `valueDelta` desc · Bust = `−valueDelta` desc · **Comeback = `currentTV − min(currentTV,
snapshot trueValues)`** (**JK 2026-06-19 correction** — the CURRENT gap from the season trough, NOT max-rise-over-checkpoints;
a mid-season peak given back must NOT win). PURE / build-DARK (NO caller/flag/store; a later hook feeds it the TV rows);
Codex-built → Opus-audited → host-gate **7,745/444, ZERO new reds** (+8). **✅ L12-3 COMPLETE (a/b/c/R-1/R-2,
attended) — the per-game race-standing recompute now covers ALL 8 merit categories (MVP/CY/SS/GG/RoY/Bench/Booger/Reliever)
+ the TV-family (KK/Bust/Comeback), reading `resolveFameTier` only, recompute-only + doubly-dark, behind
`isFranchisePhase2L12Enabled`. ➡ NEXT = L12-4 (All-Star roster builder + 60% lock).** **L12-3R split R-1 (live `pitchingWpa`
rollup) + R-2 (dark Reliever binding) after JK ruled the reliever pool = PURE RELIEVERS ONLY (so reliefWpa==pitchingWpa for
the eligible set → dropped reliefWpa/`!isStarter`). ✅ L12-3R-1 (LIVE/saved-shape): `pitchingWpa?` on PlayerSeasonPitching +
ungated accumulation in `aggregatePitchingStats` (additive-optional, no DB churn; **browser-verify BATCHED** #24).
✅ L12-3R-2 (dark): RELIEVER_OF_YEAR = pitchingWpa basis, pure-reliever filter (gamesStarted===0) + relief-IP floor (§16);
the 8th merit category; `WAR_AWARD_CATEGORIES` unchanged (D9-neutral). Codex-built → Opus-audited (each caught a real new
red the scoped run missed — the L12-3b mock + the L12-3R-2 `pitchingWpa` shape assertions — both auditor-fixed mechanically);
host gate 7,765/447, ZERO new reds; trackerDb v24.** **✅ L12-3a COMPLETE (2026-06-19, attended)** — the
PURE race-standing composite engine `src/engines/franchiseRaceStandingScorer.ts` (`computeFranchiseRaceStanding`:
per-race-type weighted composite `wMerit·meritPercentile + wFame·famePercentile`, fame via `resolveFameTier` rank ONLY
[Q10]; the **Q3 close-race tilt** = fame contributes only when `|marginToWinner| < tiltWindow` AND both merit > floor —
preserves RACE-4; **fan-vote mode** [fameAlwaysOn] built for L12-4; score-gap **bands**; `MERIT_RACE_WEIGHTS` /
`FAN_VOTE_WEIGHTS` §16 placeholders) + extended `franchiseAwardsEngine.scoreForCategory`/`FranchiseWarAwardCategory` with
**BENCH_PLAYER = totalWar** + **BOOGER_GLOVE = −fieldingWar** (`WAR_AWARD_CATEGORIES` unchanged → D9 finalize byte-neutral).
Codex(gpt-5.5,xhigh)-built → Opus-audited (builder≠auditor) → host-gate **7,755/445, 7,753 pass / 2 characterized fail,
ZERO new reds** (+10). PURE / build-DARK (no caller/flag/store; trackerDb stays **v24**). **JK DESIGN RULINGS (this pass):
Bench Player = best total WAR among designated reserves** (`isReserve`, already built + specced §23.6/AWARD-5);
**Reliever-of-Year = WPA, NOT leverage** (LI is not persisted per-season + carries the FINDING-099 dual-value defect +
orphaned relationship modifiers); **WPA via a NEW season field** (`pitchingWpa`/`reliefWpa` on `PlayerSeasonPitching`,
relief = `!isStarter` games — a LIVE aggregator + saved-shape change, isolated to L12-3R). **✅ L12-3b COMPLETE (2026-06-19, attended)** — the
flag-gated **recompute gate branch** (8th, after `processCompletedGame.ts:654`): NEW
`src/utils/franchiseRaceStandingsCompute.ts` orchestrator (`recomputeFranchiseL12StandingsForCompletedGame`) loads the
mid-season award preview (`computeFranchiseAwardsPreview` — verified available per-game, `frozen=false`) + fame records +
TV rows/snapshots, builds per-race candidates for MVP/CY/SS/GG/RoY (GG `score + 0.2·defensiveFame` blend; missing-fame →
0/0) + runs the L12-3a composite + the L12-2 TV scorer; **RECOMPUTE-ONLY** (no store/persistence; trackerDb stays v24),
DOUBLY-DARK (flag default OFF). Codex-built → Opus-audited (builder≠auditor) → **the full host gate caught a real new red
Codex's scoped run missed** (the new transitive import broke `processCompletedGame.trueValue.test.ts`'s partial mock at
module-load — failed SOLO; auditor-fixed mechanically: a 1-line snapshot-reader mock stub, no cascade) → host gate
**7,760/446, 7,758 pass / 2 characterized fail, ZERO new reds** (+5). **✅ L12-3c COMPLETE (2026-06-19,
attended)** — wired **Bench/Booger** standings into the recompute (D9-finalize-neutral): a `categoryCandidateRows`
reserve filter + a relaxed-PA `meetsQualifier` branch (`BENCH_PLAYER_QUALIFIER_FRACTION` 0.25 §16) + a new exported
`computeFranchiseRaceCandidateRows(scope, categories)` (mirrors the preview assembly, no MOY/persistence); orchestrator
switched to all 7 merit categories. `WAR_AWARD_CATEGORIES` UNCHANGED (D9 byte-neutral, proven by a finalize-stability test).
Codex-built → Opus-audited → host gate **7,761/446, 7,759 pass / 2 characterized fail, ZERO new reds** (+1). ⇒ the L12
merit recompute now covers **all 7 merit categories + the TV-family**; only **Reliever-of-Year** remains.
**➡ NEXT = L12-3R** — the LIVE WPA season-rollup (`pitchingWpa`/`reliefWpa` on `PlayerSeasonPitching` + the season
aggregator, relief = `!isStarter` games) + bind Reliever-of-Year; **the only non-dark piece — saved-shape +
live-aggregator change → its own engineering audit + JK browser-verify batch.**
Seams in `L12_SCOPE_MAP.md` §5. → L12-4
All-Star+60%-lock → L12-5
emission/snub/reporter → L12-6 UI → L13 (split) → L14 → L-SIM. **⚠ KEEP EXACTLY ONE AUTH-4 WORKER ACTIVE — 7 Claude sessions
were open this run (2nd collision); JK to trim.** Per-ticket detail in
`AUTONOMOUS_RUN_LOG.md`. *(prior:)* **L10 Q5/Q8 REWORK COMPLETE → L10 (random events) FULLY
COMPLETE.** Continuous per-game cadence (Q5 — dropped the 20%-checkpoint gate; flat per-game §16 base rates) +
`name_change` in the dark catalog (Q8 — rare distinct cosmetic-family event). **Builder routing RESTORED to Codex**
(JK directive) — Codex CLI (gpt-5.5, xhigh) built via `codex exec` stdin-from-contract; Opus 4.8 audited (cross-model
triangle); VERIFIED, build-DARK behind `isFranchisePhase2L10Enabled` (OFF), trackerDb stays v23. **➡ NEXT = L11
(managers)** — fresh subsystem, needs a grounding recon. *(Prior:)* **L9b trait-reality REBUILD — the TRAIT ENGINE IS FULLY BUILT +
WIRED + the Two Way C/IF/OF FAMILY COMPLETE.** Landed **R-E + R1-a + R1-b1 + R1-b2 + R2 + R1-b3 + R3 + W1 +
PRE-ACT-TRAITS-1.** 47/47 earnable traits; FINDING-150 CLOSED. **W1** populated the grant hook's 4 optional input maps
(handedness/primary-position from roster; pitcher grade via the pure `scoreSmb4Player`) — the 6 handedness splits +
Utility + Ace Exterminator are wired. **PRE-ACT-TRAITS-1** realized the full Two Way C/IF/OF family in the builder
(FNV-1a(playerId) seed per variant + `poolTraitKey` family pool; no grant-path/scorer/acquisition surgery). All STILL
flag-gated (`isFranchisePhase2TraitsEnabled` OFF) = build-DARK, activate post-D13.
**⚠️ NAMED PRE-ACTIVATION GATE — `PRE-ACT-TRAITS` (clears BEFORE the L9b flag-flip / D13; DECISIONS_LOG 2026-06-18):**
**(1) ✅ DONE** (Two Way family — PRE-ACT-TRAITS-1); **(2) OPEN (JK/browser)** — END-TO-END activation verification on
REAL franchise data with the flag flipped (everything is unit-verified only; pairs with F-141); **(3) standing note** —
un-hardcode `opposingHand` only if a matrix-handedness trait is ever added. **⇒ ALL AGENT-BUILDABLE trait-rebuild work
is COMPLETE; only the human browser end-to-end (-2) + the standing note (-3) remain in the gate.**
*(Note 2026-06-18: a concurrent UNATTENDED resume
sandbox also reached R3 + parked a WAITING_ON_JK; the attended session built→audited→host-gated→committed R3, and
reconciled — its stale "waiting" CURRENT_STATE/HISTORY writes were reverted; WAITING_ON_JK ticket:R3 RESOLVED.)*
(1) **Closed the recurring spec-leak at its root + RATIFIED the measurement
model** — `TRAIT_MEASUREMENT_SPEC.md` is now ONE authoritative cited source (§0.6 proxy table [47 earnable, every
cell cited via reconciliation wf_c4bac237-5d7, spec-over-code] / §0.7 code-deltas / §0.8 gates [personality is a
TILT never a gate; Two Way pitcher-only, NO batting gateway] / §0.9 R1 derivations); purged ALL stale framing
(personality-primary-no-proxy, the Two-Way gateway, the fielding/hitting conflation, Noodle Arm) across 4 spec docs;
JK rulings durable in DECISIONS_LOG (**`d71767aa`**). (2) **R-E COMPLETE** — **`9eeb69d5`** (R-E-a: E2 charisma +
positive-Resilience tilts + 3 LIVE latent-bug fixes — Cannon Arm/Durable/Injury Prone tilts were silently dead) ·
**`fc3d9dab`** (R-E-b: E3 re-evaluate-to-drop = displacement ranks by recomputed **P**); **E1 deferred to R3** (the
Noodle-Arm cut removed its near-term consumer). (3) **R1-a COMPLETE** — **`a5126afb`** (10 clean outcome-proxy
traits into BUILDABLE_TRAITS: strikeout family [full K-family] · Slow Poke/Sprinter/Mind Gamer · Pick Officer/Easy
Jumps · K Neglector acq delta). **Earnable v1 trait set 16 → 26.** (4) **R1-b1 COMPLETE** — Big/Little Hack
(Option-B HR-rate/AVG percentile-merge) · Base Rounder (forced-advance port from `atBatLogic`; JK ruled denominator
counts thrown-out tries + scope includes batter stretches, folded into §0.9 + DECISIONS_LOG) · Distractor (owner on
1B/2B reaches) into BUILDABLE_TRAITS + Big/Little Hack acq §0.7 image deltas. **Earnable v1 set now 30.** All
build-DARK; builder≠auditor + full host gate each. (5) **R1-b2 COMPLETE** — Utility (fielding success-rate at
non-primary positions; OPTIONAL `primaryPositionByPlayer` input added, hook population deferred → dormant) · Crossed Up
(passed-ball/batters-faced, pitcher) · Bunter (SAC/PA volume per JK ruling). `traitAcquisition` needed no production
change. **Earnable v1 set now 33.** **Two Way SPLIT out (JK ruling) → R1-b3** (spans builder + the L9b-3c grant-path
random-C/IF/OF mechanic). **⇒ R1-b functionally COMPLETE except Two Way.** (6) **R2 COMPLETE** — pitcher count-family
(walks-allowed: BB Prone/Falls Behind = rate, Composed/Gets Ahead = 1−rate) + First-Pitch pair (hit/out on first-pitch
PAs) + the **6 handedness splits** (CON = 1−K/PA, POW = ISO, Specialist/Reverse = 1−BAA same/opposite — **JK chose BAA
over K-rate**) into BUILDABLE_TRAITS + 2 OPTIONAL handedness-map inputs + §0.7 acq deltas. **Earnable v1 set now 45**
(of 47). The handedness splits + Utility are built but **DORMANT** — they need a deferred HOOK to populate the optional
input maps (`pitcherHandByPlayer`/`batterHandByPlayer`/`primaryPositionByPlayer`); `opposingHand` is still hardcoded
`'R'`. (7) **R1-b3 COMPLETE** — the Two Way earn-signal (a pitcher's batting **wOBA** via `calculateWOBA`, ONE
representative `Two Way (C)`, percentiled vs the pitcher pool, valve-gated super-rare) into BUILDABLE_TRAITS; no
acquisition change. **JK ruled "earn-signal now, defer C/IF/OF"** (the random position + the 3-variant family plumbing
defer to a later ticket — per-variant names would fragment the pool + re-randomize the position each cycle). **Earnable
v1 set now 46 of 47.** (8) **R3 COMPLETE** — Ace Exterminator (the batter's reached-base rate — hit/walk/HBP — vs
A−-or-better opposing pitchers, via `SMB4_GRADE_TO_INDEX['A-']`; OPTIONAL `pitcherGradeByPlayer` input [E1], DORMANT
until the grade hook; JK ruled "reached base"); no acquisition change. **⇒ THE 47/47 EARNABLE v1 TRAIT SET IS
COMPLETE; FINDING-150 CLOSED for the earnable set.** (9) **W1 COMPLETE** — the grant hook
(`franchiseTraitGrantCompute.ts`) now populates `SeasonTraitCandidateInput`'s 4 optional maps from the MLB roster
(`bats`/`throws`/`primaryPosition`; pitcher grade via the pure `scoreSmb4Player`, JK "wire all 4 now"), so the 6
handedness splits + Utility + Ace Exterminator are no longer dormant — **still flag-gated build-DARK** (zero live effect
until post-D13). (10) **PRE-ACT-TRAITS-1 COMPLETE** — the full Two Way C/IF/OF family in the builder (FNV-1a(playerId)
seed per variant + `poolTraitKey` shared family pool; no grant-path/scorer/acquisition surgery). **⇒ ALL
AGENT-BUILDABLE trait-rebuild work is COMPLETE.** **➡ NEXT: (PRE-ACT-TRAITS-2)** JK/browser END-TO-END activation
verification (the gate's only remaining buildable-by-human item); then the broader **(D)** L-stack (L10 Q5/Q8 rework →
L11 → L12–L14 → L-SIM gate) and **(C)** the §16 sim-tune FINDING (sparse-signal `getPercentile`) at the L-SIM gate.
*(Minor/standing: `opposingHand` still hardcoded `'R'` — matrix-handedness traits only, NOT the wired splits.)*
**📋 UI cleanup plan READY → `spec-docs/UI_CLEANUP_PLAN.md`** (2026-06-18, grounded + verified). **SCOPE (JK ruling):
the FRANCHISE HUB regular-season + playoff tabs ONLY — NOT GameTracker (done), NOT offseason (deferred).** That surface
is **~95% BUILT / production-ready** → it's a CLEANUP pass, not a build: dominated by **~1,250 hardcoded hex across 4
files** (FranchiseHome 626 · TeamHubContent 506 · ScheduleContent 90 · AwardsWatchlist 30) → extract to KBL-palette
theme tokens + minor polish (~1 week). **Timing: it's the LIVE surface, decoupled from D13/L-stack/GameTracker — do it
ANYTIME (no gate forces a wait; mild bonus to doing tokens before the hub's future activation overlays).** Suite
**7,729/442, 7,726 pass / 3 fail (post-L11-5; +9 reporter-tap tests) = 2 characterized + 1 order-flake (`EliminationTeamHub`, passes solo 16/16)** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture` +
`GameTrackerLaunchState` — the 3rd an intermittent order-flake **confirmed passing solo 9/9**; `franchiseOffseasonGuards.component`
is another such flake); trackerDb **v23**; branch codex/franchise-v1-next; **nothing pushed**. Session commits: R1-b1
`474196e7` · R1-b2 `bbb839ce` · R2 `b80fa135` · R1-b3 `7e22e015` · R3 `9059f697` · W1 `6a934a9e` · PRE-ACT-TRAITS gate
`d4ebc357` · PRE-ACT-TRAITS-1 (this commit).
*(Prior arc-narrative preserved below for context.)*
*(Historical:* **✅ L9b COMPLETE — the trait-from-reality engine, the "game-changer feature." NOW L10**
(random events). L9b-3c committed → L9b-3 COMPLETE → **L9b COMPLETE.** Full L9b chain: L9b-1 scorer `398533d1` ·
L9b-2 acquisition `f616373a` · L9b-3a candidate-builder `54fae510`+`4e3ad01d` · L9b-3b-i dark store `0cd75d9a` ·
L9b-3b-ii dark grant-hook `e08be415` · L9b-3c confirm/write. **L9b-3c** = the §11 trait-confirm transform + ATOMIC
trait1/trait2 displacement: PURE engine `src/engines/traitOverlayConfirmation.ts` (`applyTraitDisplacement` 6-case
gain/lose/displace math + canonical guard + `confirmTraitOverlay` + `buildTraitConfirmationRequest` +
`summarizeTraitOverlayChangeLog`) + impure applier `src/utils/franchiseTraitConfirmApply.ts` (`applyConfirmedTraitOverlay`:
load player → displace → `saveFranchisePlayer` FLAT trait1/trait2 → mark overlay confirmed+applied; idempotent doubly).
NO live caller (confirm UI = deferred post-D13 D-ticket). Codex-built → Opus-audited VERIFIED (tsc-0 / full suite
**7,514/433, 7,512 pass / 2 characterized fail**, ZERO new reds). trackerDb **v22**. **Whole L9b is build-DARK** —
activate post-D13 (the L9b-3b-ii hook flag default-OFF; L9b-3c orphaned-pending its confirm UI). **➡ NEXT = L10**
(random events) per the L-stack: L10 → L11 managers → L12 races/All-Star/awards-fame → L13 relationships → L14 rebrand →
the L-SIM gate. **L10 RECON DONE** (workflow `wf_b3129cd8-9e3`) → full scope/split/forks/seams/open-questions in
`spec-docs/L10_SCOPE_MAP.md`. SPLIT: **L10-1** pure event-selection engine (✅ DONE) · **L10-2** dark
`franchiseL10Overlays` store (✅ DONE, trackerDb v23) · **L10-3** flag + dark league-sweep hook (✅ DONE) · **L10-4**
stadium-change resolver (✅ DONE) · **L10-5** reporter tap (✅ DONE) → **L10 COMPLETE (1-5), all build-DARK.** ➡ NEXT =
**L9b trait-reality REBUILD** (FINDING-150 — Tier 1 + Q12; see RIGHT NOW), then the L10 Q5/Q8 rework, then **L11** (managers). **L10-1 DONE** = `src/engines/franchiseL10EventEngine.ts` (`computeFranchiseL10Events`: pure deterministic
league-sweep roll — `P = baseRate[family] × intensity dial × morale × personality`, FNV-1a-seeded fire, 8 families with
personality-shift excluded, fan-morale-suppressed team/stadium; mirrors `tradeRequestGeneration`; build-DARK).
Codex-built → Opus-audited VERIFIED (tsc-0 / suite **7,527/434, 7,525 pass / 2 characterized fail**, ZERO new reds).
Build-DARK; do NOT extend `franchiseRandomEventGenerator.ts` (boundary). 6 non-blocking open questions for
JK in the scope map §7 (AUTH-4 defaults taken meanwhile).
*(Prior L9b-3b detail below.)* **L9b-3b DONE:** b-i = the dark
`franchiseTraitOverlays` store (trackerDb v22) · b-ii = the default-OFF `isFranchisePhase2TraitsEnabled` flag +
`persistDarkTraitGrantForCompletedGame` hook (flag-gate-first → 20%-checkpoint cadence → loads season events → enumerates
MLB roster → L9b-3a `computeSeasonTraitCandidates` → L9b-2 `computeTraitAcquisition` per player → writes PENDING trait
rows; wired after the checkpoint gate at processCompletedGame.ts:632; mirrors L8b `franchiseCheckpointSweepCompute`;
doubly-dark = flag OFF + pending/`applied:false` rows that DON'T mutate player records until L9b-3c; Codex-built →
Opus-audited VERIFIED, tsc-0 / full suite **7,499/431, 7,497 pass / 2 characterized fail**, ZERO new reds; live game
path → browser-pending #22). **L9b-3c (NEXT)** = the §11 confirm + ATOMIC trait1/trait2 displacement via
`saveFranchisePlayer` (do NOT route trait rows through `ratingsOverlayMerge` — rating-key-only, silently drops them). **STORE FORK RESOLVED (AUTH-4 default):** NEW `franchiseTraitOverlays`
store (reuse carried a silent-trait-drop landmine via `ratingsOverlayMerge`). **L9b-3b-i** = the dark store mirroring
`franchiseRatingsOverlays` at every site (storage module + trackerDb v22 + syncConfig + backupRestore + the store-list
PIN + parity/manifest tests + a new storage test); DARK/EMPTY, KBL_BACKUP_VERSION stays 2; Codex-built →
Opus-independently-audited VERIFIED (tsc-0 / vite build OK / full suite **7,495/430, 7,493 pass / 2 characterized fail**,
ZERO new reds; v21→v22 migration-survival + backup parity PROVEN; ratings template byte-unchanged). Persistence →
browser-pending (#21).
[AUTH-4 overnight; a fresh session does the session-start reads, RESTATEs, and PROCEEDs at **L9b-3b-ii** under AUTH-4 WITHOUT
waiting for JK — AUTH-4 is the standing go]. **L9b-3a DONE** = the PURE context-reconstructor + candidate-builder
`src/engines/traitCandidateBuilder.ts`: replays a season's already-loaded AtBat/Fielding/BetweenPlay events →
reconstructs per-AtBat `GameContext` → probes the FROZEN `activeTraitNames` for trait opportunities → outcome-weighted
RATE signal per the 16 v1-buildable traits → role-bucketed peer pools → feeds L9b-1 `computeTraitRealityScore` →
`TraitCandidate[]` per player; PURE (no IndexedDB/store/flag/Date/random/async), build-DARK; Codex-built →
Opus-independently-audited VERIFIED (21 tests; tsc-0 / full suite **7,486/429, 7,484 pass / 2 characterized fail**, ZERO
new reds; frozen matrix/scorer byte-unchanged). **AUDIT DEVIATIONS HANDLED:** Codex left an abandoned earlier-attempt pair
`traitContextReconstructor.*` (a broken EXPOSURE-COUNT model — opposing pairs Clutch/Choker, RBI Hero/Zero, Stealer/Bad
Jumps, etc. came out indistinguishable) → DELETED by the auditor; Codex also edited 5 Captain-owned spec-docs → REVERTED +
re-authored. **L9b-3** (grant/write-back — the FIRST real trait writer, PERSISTENCE class,
audit HARDEST) is RECONNED (`wf_4275ff58-dc1`) + SPLIT into **L9b-3a** (PURE context-reconstructor + candidate-builder —
DONE) · **L9b-3b** (dark hook + PENDING write, mirror L8b; the STORE FORK lands here — NEXT)
· **L9b-3c** (§11 trait-confirm + ATOMIC trait1/trait2 displacement). Full scope/split/forks/gotchas in
`AUTONOMOUS_RUN_LOG.md` (the 2026-06-18 "L9b-3 RECON DONE" entry). **JK FORKS (non-blocking for L9b-3a):** the write
store (reuse `franchiseRatingsOverlays` v21 = AUTH-4 default / vs a NEW `franchiseTraitOverlays` v21→v22 = recon's
write-path reader's recommendation — `WAITING_ON_JK`), the cadence trigger, and the Two-Way role-promotion. **A fresh
thread: contract + build L9b-3a first; build-DARK, activate post-D13.** **L9b-2** = the PURE acquisition engine `src/engines/traitAcquisition.ts` (the VI.0
MULTIPLICATIVE combiner `P = realityPercentile × ambition/resilience/image/morale/roster factors` + gain-high/lose-low
hysteresis dead-band + no-offsetting-pair + 2-trait-cap strength-ranked displacement; PROPOSALS only, build-dark; Codex
5.5-built → Opus-4.8-independently-audited **VERIFIED**; 24 tests; tsc-0 / build-0 / full suite **7,465/428, 7,463 pass /
2 characterized fail**, ZERO new reds; trackerDb stays **v21**, no store). **DEFAULTS-TAKEN flagged for JK:**
`TRAIT_OPPOSITES` (14 pairs) authored as new trait-asset data + the VI.3:122 personality-primary thin-signal exception
DEFERRED (valve dominates v1). *(L9b-1 detail preserved below.)* L9b-1 = the PURE trait-from-reality SCORER (TS-2): NEW `src/engines/percentile.ts`
(getPercentile/getValueAtPercentile lifted verbatim out of salaryCalculator, math-identical) + salaryCalculator
re-imports them + NEW `src/engines/traitRealityScorer.ts` (role-eligibility VI.2 + min-sample valve VI.1 +
scaledThreshold scaling + percentile strength score; PURE, no IndexedDB/mutation) + 19-test file. **HOST GATE PASSED**
(host session, real node v20): tsc-0 / build-0 / full suite **7,441 tests, 7,437 pass / 4 fail** = 2 characterized
(`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`) + 2 solo-passing order-flakes (`GameTrackerLaunchState` +
newly-surfaced `EliminationTeamHub`), **ZERO new reds**; 19/19 new + 121/121 salaryCalculator-family green (lift
behavior-neutral). **Builder=Opus → INDEPENDENTLY audited by Codex 5.5: VERDICT VERIFIED** (decorrelated AST check
confirmed 28/39/7/1=75, no dupes/missing/extra; no real defect; only non-blocking test-coverage nits). DEFAULT-TAKEN
flagged for JK: `Workhorse` (unlisted in VI.2) classified PITCHER. trackerDb stays **v21** (pure engine, no store).
NEXT=L9b-2. *(Prior status preserved below.)* **L8 COMPLETE (L8a `cfdd7752` + L8b `cd9e4589`)** [AUTH-4 overnight
run; a fresh session does the session-start reads, RESTATEs, and PROCEEDs at L9a under AUTH-4 WITHOUT waiting for JK —
AUTH-4 is the standing go]. This run built→audited→committed, each Codex 5.5-built → Opus 4.8-independently-audited:
**L8 COMPLETE** (L8a pure dev-math engine `cfdd7752` + L8b dark checkpoint-sweep compute/overlay-writer `cd9e4589`) on
top of the prior clean boundary **L7 COMPLETE** (L7c `886d1dce` · L7d-1 `f61dcae0` · L7d-2 `aec5db99` · L7d-3 doc) +
**L2 COMPLETE** (L2a store `6fdeba11` · L2b merge `e8ec0908` · L2c confirm `a77e0ed5`). trackerDb host-state **v21** (L8
added NO store); KBL_BACKUP_VERSION stays **2**. ⚠ NEWLY-OBSERVED order-flake
`AwardsWatchlist.test.tsx` (passes solo; non-deterministic — appeared in 1 of 6 full-suite runs across L7d/L2a; NOT a
regression) — flagged for JK, see SUITE BASELINE + OPEN PENDING-JK. AUTH-4 host resume; the L5b handoff is CLEARED.
**L5b COMMITTED `5ebb148`** —
the flashpoint-decay accumulator was host-verified (`NODE_ENV= npm run build` exit 0 + full suite **7,298 pass / 2
characterized fail** [`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`], ZERO new reds; the +18 tests / +3 files over
the post-L5a 7,280/410 baseline are exactly L5b's 3 new test files) and committed (14 code/test files; sandbox junk
cleaned + gitignored). The prior AUTH-4 sandbox build + decorrelated independent audit (≠ builder, VERDICT VERIFIED,
10/10, faithful L6b mirror) stands. **L6 (Fame) COMPLETE** — `7359cbf` L6a + `3b36d35` L6b-1 + `5a7685a` L6b-2. **L5a
`428f7cb`** (pure §8 fan-morale DAMPENER). **L5b** = a NEW dark `franchiseFlashpointDecay` store (trackerDb **v19→v20**)
+ a default-OFF `isFranchisePhase2FlashpointEnabled()` flag + a pure compounding-but-clamped per-game fan-morale TAX
engine (`flashpointDecay.ts`, magnitudes in `FLASHPOINT_DECAY_TUNING`) + a dark gated per-game compute in
processCompletedGame (after the fame compute). **SEAM-NEUTRAL** — `resolveTurnedOnPlayers` returns [] until L7 Albatross
+ L10/L13 trade-demander land, so even flag-ON writes nothing today. KBL_BACKUP_VERSION stays **2**; backup-parity +
syncConfig lockstep; version-pin trap `franchiseSeasonLedgerStorage.test.ts` at `toBe(20)`. **L5c `8cd2cc1`** (pure §13 trade-request gen) +
**L5d `e061e51`** (pure §13 reporter-intensity tooth, live reporter byte-unchanged) → **L5 COMPLETE** (a–d: dampener /
flashpoint-decay / trade-requests / reporter-heat; all Codex-built → Opus-audited VERIFIED). **L7 SPLIT L7a–d;
L7a COMMITTED `0a59a24`** (filled L5b's `resolveTurnedOnPlayers` seam — the per-game flashpoint-decay now taxes a team's
active|locked Albatross; doubly-dark, no store/version touch). **L7b COMMITTED `77feeda3`** (pure §20.4 Channel-C
designation→fame nudge ENGINE — FF +2 / Albatross −1 / MVP·Ace sim; fame-store WIRING deferred). **L7c COMMITTED
`886d1dce`** (pure §20.6 Channel B FF-warmth +0.5 + Channel A asymmetric swing-tilt ENGINE; DOUBLE-COUNT GUARD
ALBATROSS=0 — §13 flashpoint already owns it; morale-store + per-play wiring deferred post-D13). **L7d SPLIT L7d-1..3;
L7d-1 `f61dcae0`** (Captain morale-router) **+ L7d-2 `aec5db99`** (Fan Hopeful cushion) **+ L7d-3 doc-only** (FF
double-dependency reconciliation — value-half DR-1 + morale-half L7b/L7c already exist) → **L7 (designation Phase-2
completion) COMPLETE.** **L8 depends on L2** (the mutable ratings-overlay layer) → L2 lands first, SPLIT L2a..c;
**L2a COMMITTED `6fdeba11`** (dark `franchiseRatingsOverlays` store, trackerDb v20→v21, backup parity, migration-survival
proven; oracle locked) **+ L2b COMMITTED `e8ec0908`** (pure overlay merge math: base + confirmed active deltas; temporary
absolute-expiry; base never mutated) **+ L2c COMMITTED `a77e0ed5`** (§11 two-tier confirmation infra — console
instruction + idempotent confirm transform + revert reminder + change log; pure/dark) → **L2 COMPLETE.** **NOW: L8**
(ratings development — the first real writer through L2) under AUTH-4. trackerDb host-state **v21** / KBL_BACKUP_VERSION
**2**. Branch codex/franchise-v1-next; nothing pushed.)
**Branch:** codex/franchise-v1-next

> This file is the LIVE status header — the thing every session-start reads.
> Rewrite it in place each session (do not append). Full arc-by-arc history
> lives in `CURRENT_STATE_HISTORY.md`. Roles/routing/loops live in
> `AI_TEAM_OPERATING_MODEL.md`. Non-negotiable rules live in `SESSION_RULES.md`.

---

## RIGHT NOW

- **✅ H3 HONOR-DECOUPLE FIX COMMITTED — browser-pending (2026-06-20, AUTH-4 — the Step-4 production finding, JK ruled DECOUPLE).**
  `fix(franchise): decouple season-end honor payouts (fame ratchet + morale snub) from the cosmetic LLM nod` (commit
  **`95b4533d`**) + docs. Fixes the franchiseSeasonEndHonors.ts:104 coupling where a transient reporter/LLM/crypto nod
  failure silently+permanently skipped the durable FAME reach-floor ratchet + MORALE close-loser snub. Now the nod is
  BEST-EFFORT (gates only the prose); the durable payouts fire whenever an award finalizes — with NO double-application
  (reach-floor emission-level idempotency guard on the `'season-end-honor'` sentinel; snub already idempotent via its
  deterministic `race-snub:...` sourceEventId). Control-flow only; §16 magnitudes untouched; applyFranchiseHonorReachFloor
  + snub primitive + all-star edge UNTOUCHED (zero scope creep). **Builder = Codex (gpt-5.5) via codex exec
  stdin-from-contract; Auditor = Opus (builder≠auditor, cross-model) → VERIFIED on all 4 criteria.** tsc 0 / build 0 /
  full suite 7828 pass / 3 fail = 2 hard-characterized + AwardsWatchlist (order-flake, passes solo 2/2), ZERO new reds;
  +2 decoupling tests (no-reporter + throwing nod still apply payouts) + the 'deduped' test rewritten to the new contract.
  **L-SIM re-verify:** 24g all-CRITICAL green / 0 findings; 60g determinism same-seed byte-identical (A==B
  `8565624:7c694372`, finalDigest `8571151:5403bbde` — legitimately changed from pre-fix `8566994:8cfc87a3` since the
  durable effects now mutate the season-end state); the snub morale + reach-floor now fire IN-SIM (player morale snapshot
  count 33→34, fame tier shifts). **⚠ BROWSER-VERIFY OUTSTANDING (JK, soul-layer, post-D13 flag-flip — NOT checkable until the flip; this layer is
  build-dark):** does NOT require any team at low/<25 fan morale — that's the separate l11-backstop manager-firing
  condition, a different finding; the honor payouts fire for the league's NORMAL award winners every season-end.
  Reproduce at a completed season-end (award winners present) with the news layer UNAVAILABLE (no reporter assigned, or
  LLM/crypto offline — a condition you can set deliberately): confirm the MVP/CY winner's fame still ratchets + the close
  losers' morale still moves while the news prose is absent. WAITING_ON_JK
  Item 1 RESOLVED; Item 2 (graduate emission-snub to live-real-green by keying on the now-firing snub morale) still open.
  **➡ H3 NEXT = Step 5/6 (matrix); the production finding is now closed pending browser sign-off.** *(prior:)*
- **✅ H3 STEP 4 COMPLETE (2026-06-20, AUTH-4 overnight — L-SIM sim-hardening track, parallel to the L-stack) — season-finalize
  coverage: the §5.3 invariants now EXECUTE for the first time.** The L-SIM runner now invokes the GENUINE production
  season-finalize chain at season-end — `freezeTrustedValueArtifactForSeason` (franchiseTrustedValueStorage.ts:97) →
  `computeAndPersistFranchiseWarAwards` (franchiseAwardsEngine.ts:594) → `emitFranchiseSeasonEndHonors`
  (franchiseSeasonEndHonors.ts:69), same order as FranchiseHome.tsx:3309-3319 (NOT a reimplementation — audit-confirmed).
  THREE §5.3 invariants are now live (soul count 20→22): **`soul.tv-freeze` (CRITICAL) REAL-GREEN** — real frozen artifact
  (frozen=true, 96 trusted players), re-freeze no-op + anti-thaw guard fires for real; **`soul.awards-off-frozen-artifact`
  (CRITICAL) REAL-GREEN** — 5 real finalized awards (MVP/CY/GG/RoY/SS) off the frozen artifact, every winner ∈
  trustedPlayerIds; **`soul.emission-snub-signal` (INVESTIGATE) upgraded to the real property** (close-losers-only via the
  production `pickRaceSnubVictims` + no-double-count + no-winner-snubbed + snub-without-nod) + SYNTHETIC-FALSIFIED, reports
  LIVE-PENDING offline (the season-end nod is reporter+LLM(`callClaudeMessages`)+crypto.randomUUID-gated; the snub is gated
  behind it). Re-falsification: falsification.config.ts **36/36** (baseline + every inverse trips red + 4 happy-path PASS).
  Re-runs: 24g smoke all CRITICAL green / 0 findings; 60g determinism **same-seed byte-identical (A==B `8560489:56091768`)**
  WITH finalize wired into both legs (digest legitimately differs from pre-Step-4 — finalize mutates end-state). tsc over
  test-utils/lsim: 0 NEW errors (18 pre-existing harness loose-typing baseline). `npm run build` exit 0 (zero src/ touched).
  Builder=Opus → independent adversarial audit (builder≠auditor, 3-lens workflow): **SOUND_WITH_MINORS → COMMIT.**
  **⚠ PRODUCTION FINDING (HALT-JK, WAITING_ON_JK):** season-end fame-ratchet + close-loser morale-snub are gated behind the
  LLM/reporter nod emitting (franchiseSeasonEndHonors.ts:104) → a transient LLM outage silently+permanently skips durable
  game-state effects, not just news prose. **➡ H3 NEXT = Step 5 (re-run baseline+repro green-for-the-right-reasons — largely
  done by this step's re-runs) → Step 6 the full §6 edge-league + multi-season matrix.** *(L-stack track entries below.)*
- **✅ L11-5 VERIFIED + COMMITTED (2026-06-19, AUTH-4 — Codex-built → Opus-audited) — the reporter tap (manager
  firing/relocation → SeasonNewsEvent). ⇒ L11 (managers) FULLY COMPLETE (1–5).** NEW pure build-DARK adapter
  `src/src_figma/app/engines/reporter/franchiseL11ManagerChangeNewsAdapter.ts` (`buildFranchiseManagerChangeSeasonNewsEvent`):
  maps a firing's deterministic ground truth → `SeasonNewsEvent` (eventType `MANAGER_CHANGE`, subjectIds [fired,
  successor?], constant-key `facts`, bounded `dramaticWeight` — negative for firings, neutral for rebrand-relocations,
  magnitude from fan-morale-at-firing); inline `endReason` map (rebrand→relocated, else fired) keeps it free of IndexedDB
  deps; PURE (no Date/Math.random/I/O/LLM), no id/createdAt minted. + `MANAGER_CHANGE` added to `NarrativeEventType` +
  `hedgingModifier` (0.90, matches TRADE_REACTION) + `highStakesEvents` (narrativeEngine.ts) — **additive + DORMANT** (no
  emitter, so live reporter behavior is byte-unchanged for all existing event types; `seasonNewsGenerator.ts` untouched).
  Mirrors L10-5 exactly. **Routing RESTORED to spec:** Codex (gpt-5.5, very-high) built via `codex exec` stdin-from-contract
  → Opus independently audited the diff line-by-line (builder≠auditor) + ran the FULL host gate (Codex only ran the single
  test file). Host gate: `NODE_ENV= npm run build` exit 0 (7.5s) + full suite **7,729/442, 7,726 pass / 3 fail** = 2
  characterized (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`) + 1 order-flake (`EliminationTeamHub`, **confirmed
  passing solo 16/16**), ZERO new reds (+9). build-DARK; no flag/store/trackerDb change (v23). **➡ NEXT = the fame
  double-ladder collapse** (L12-Q10 pre-L12 cleanup: retire `fameEngine.ts getFameTier` forbidden labels; races must read
  `resolveFameTier`) → L12 recon-split. *(Prior entries below.)*
- **✅ L11-4 VERIFIED + COMMITTED (2026-06-19, AUTH-4 TAKEOVER) — the Almanac fire/hire-date tenure join + DURABLE
  fired-tenure persistence (resolves the L11-3 OPEN). ⇒ L11 FIRING CORE COMPLETE.** NEW `ManagerTenureRecord` +
  `ManagerTenureEndReason` ('fired'/'resigned'/'relocated') types + `ManagerProfile.tenureRecords?` (managerWpa.ts);
  `recordManagerTenureEnd` + `managerFiredReasonToTenureEndReason` (managerIdentityStorage.ts — idempotent on
  (teamId,mode,instanceId,endDate), rides the identity store, **NO DB-version bump** [additive optional field on the
  managerId-keyed profile], merge-safe via `saveManagerProfile`'s `{...existing,...input}`); `fireManager` wires it on
  the FIRED `assignment.managerId`/`startDate` BEFORE the successor `saveManagerAssignment` overwrites the team-keyed
  `[mode,instanceId,teamId]` row (so the fired legacy survives the swap); `almanacQueries.ts`
  `ManagerTeamTenureAggregate` gains `hireDate`/`endDate`/`endReason`, joined via `findTenureRecord` (re-fire
  latest-endDate-wins + cross-stint-bleed guard) at all 3 aggregation sites. **⚠ CONCURRENCY EVENT:** L11-4 was built by
  a SECOND concurrent AUTH-4 cron session that stopped mid-ticket (uncommitted WIP, diff stable, no live build proc); JK
  ruled TAKE OVER; THIS session independently audited the diff line-by-line (builder≠auditor — I did not write it) +
  host-gated + committed. Host gate: `NODE_ENV= npm run build` exit 0 (7.65s) + full suite **7,720/441, 7,718 pass / 2
  characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds (+7 tenure tests).
  build-DARK behind `isFranchisePhase2L11Enabled`; trackerDb v23. **VERIFY-AT-ACTIVATION (batch, non-blocking):** the
  Almanac surfaces tenure dates only for managers with a profile + a matching tenureRecord — confirm fired managers
  carry a profile at activation. **➡ NEXT = L11-5** (reporter tap → `SeasonNewsEvent`). *(Prior entries below.)*
- **✅ L11-3b VERIFIED + COMMITTED (2026-06-19, AUTH-4) — the per-game auto-backstop firing trigger (build-DARK,
  live-path).** NEW `src/utils/franchiseManagerAutoBackstop.ts` (flag-gated per-completed-game hook: checks the game's 2
  teams → if team-fan morale < 25 (§16), deterministic FNV-1a roll < 0.004 (§16, flat — payroll-band deferred) →
  `fireManager({reason:'auto-backstop'})`) + the 7th `processCompletedGame` gate branch (after L10). Codex-built → **fix1
  (the audit caught a real defect: `instanceId=franchiseId` → correct = `LEAGUE_BUILDER_MANAGER_INSTANCE_ID`; would've been
  a silent activation no-op)** → Opus-VERIFIED. Host gate: build 0 (7.66s) + suite **7,713/441, 7,711 pass / 2
  characterized fail**, ZERO new reds (+5). **⚠ VERIFY-AT-ACTIVATION:** the `gameState` team-id namespace vs the
  morale/assignment team-ids (logged in `AUTONOMOUS_RUN_LOG`). Doubly-dark; trackerDb v23. **➡ NEXT = L11-4.** *(Prior
  entries below.)*
- **✅ L11-3 VERIFIED + COMMITTED (2026-06-19, AUTH-4) — the shared `fireManager` resolver (build-DARK).** Flag
  `isFranchisePhase2L11Enabled` + NEW `src/utils/franchiseManagerFiring.ts`: gate → reconstruct the team firing snapshot
  (MLB roster + per-player valueDelta/personality/loyalty/resilience + team-fan morale) → `computeFranchiseL11Firing`
  (L11-1) → write relief + per-player ripples (`applyFranchiseMoraleEffect`) → `setManagerFired` (L11-2) → auto-gen
  successor (`buildDefaultManagerProfile`). Codex-built → 1 fix-iter (readonly→mutable accumulator — a `tsc -b` build break
  the host gate caught that Codex's `tsc --noEmit` missed) → Opus-VERIFIED. Host gate: build 0 (8.10s) + suite
  **7,708/440, 7,706 pass / 2 characterized fail**, ZERO new reds (+5). **⚠ OPEN→L11-4:** the successor overwrites the
  fired `[mode,instanceId,teamId]` assignment key, so the fired tenure-end (date/reason) must be persisted by L11-4's
  Almanac join, NOT the transient assignment (detail in `AUTONOMOUS_RUN_LOG.md`). trackerDb v23; build-DARK. **➡ NEXT =
  L11-3b** (per-game auto-backstop trigger). *(Prior entries below.)*
- **✅ L11–L14 RULING PASS consolidated + COMMITTED (2026-06-19, attended) — the design-session handoff.** A parallel
  design session (`fe65bf4b`, workflow `wf_1f3e2c10-e94`, 6 agents w/ adversarial auditors) brought L12/L13/L14 to the
  L11 §7 decision-ready standard; JK ruled all 43 open questions in one pass (`L11_L14_OPEN_QUESTIONS.md`). The build
  session (Captain) REVIEWED the uncommitted output (read the full `DECISIONS_LOG` ruling entry + spot-checked the
  §14/FAME-7/§20.4/DSTACK/MODE2 edits — all sound + traceable to ruling ids), then committed + consolidated.
  **7 JK OVERRIDES:** L12-Q1 (award-cat = season-race slots NOW [`ALL_STAR`/`BENCH_PLAYER`/`BOOGER_GLOVE`/
  `RELIEVER_OF_YEAR`], defer the 2 one-shots); L12-Q2 (race standing = single weighted composite w/ per-race-type
  weights — fame-led fan-vote, merit-dominant awards); L12-Q8 (the WHOLE §20.4 status-fame layer = L6 owns it; L12 only
  consumes the tier); L12-Q13 (All-Star lock at 60%, not 50%); L14-Q2 (badge reset re-seeds a NEW Fan Hopeful); L14-Q3
  (rebrand RESETS roster fame team-wide → FAME-7 amended to "trade OR rebrand"); L11-Q11/L14-Q8 (`fireManager({reason:
  'rebrand', skipUserConfirm:true, suppressFanReliefBump:true})` — ripple applies, relief bump suppressed). **2 FIELD
  CORRECTIONS** (worksheet was WRONG): player `age` AND `gender` ARE real persisted fields → L13 needs NO new field + NO
  L1 age/gender dependency. **Doc-hygiene done:** DSTACK tree-reconcile banner (L1-L10 built — don't rebuild fame/awards;
  `kbl-relationships` DB RETIRED → reuse `rivalryScores`); MODE2 approval-matrix + worksheet stamped SUPERSEDED-BY-§24
  (closes the FINDING-150 "awaiting approval" trap). **2 follow-ups flagged, deferred to build:** the row-by-row stale-
  DSTACK rewrite (banner instead — a careless sweep risks errors); the fame double-ladder collapse (L12-Q10 = a code-
  cleanup ticket, hard prerequisite BEFORE any L12 race goes live). **⇒ L11 fully ruled (Q5–Q13).** **➡ NEXT = L11-3** —
  the flag + shared firing resolver: a default-OFF `isFranchisePhase2L11Enabled` + a `fireManager(...)` that wires L11-1's
  engine + `setManagerFired` (L11-2) + the L3 matrix consequence sink; manual valve + auto-backstop (revive the orphaned
  `managerFireProbability`) + the L14 `reason:'rebrand'` entry; auto-gen successor (`buildDefaultManagerProfile`); minimal
  "Fire Manager" GM action in v1. Build-DARK. *(Prior entries below.)*
- **✅ L11-2 VERIFIED + COMMITTED (2026-06-18, attended) — the manager-firing legacy-write primitive.** Added
  `ManagerFiredReason` (`'user'|'auto-backstop'|'rebrand'`) + an optional `ManagerAssignment.firedReason` (managerWpa.ts)
  + an idempotent `setManagerFired(params)` mutator (managerIdentityStorage.ts): get → null-if-missing → unchanged-if-
  already-fired (keeps the ORIGINAL endDate/reason) → else save `fired:true` + caller-supplied `endDate` + `firedReason`.
  Caller-supplied timestamp (NO Date.now). **NO live caller (build-DARK — L11-3 wires it flag-gated), NO DB-version bump**
  (firedReason is additive + unindexed; manager-identity DB stays v2, trackerDb v23). **SCOPE REFINEMENTS:** the
  manager-PERSONALITY field DEFERRED (the ripple keys off PLAYER personalities — no L11 consumer; JK ruled defer); the
  Almanac fire/hire-date join moved to **L11-4** (the tenure aggregate is game/WPA-data-built, not assignment-built — the
  join belongs with surfacing). **Codex(gpt-5.5)-built → Opus-audited VERIFIED** (0/0; the 4 tests are non-vacuous —
  idempotency uses a DIFFERENT 2nd endDate/reason; the read-gate test proves a fired manager drops from
  `listManagerAssignments`→[] + `resolveManagerForTeam` falls back to the successor). Host gate: build exit 0 (8.56s) +
  full suite **7,703/439, 7,701 pass / 2 characterized fail**, ZERO new reds (+4). Committed on codex/franchise-v1-next
  (3 files + docs; **not pushed**). **⚠ NEXT = L11-3 (flag + shared firing resolver) HELD** — a SECOND Claude session
  (`fe65bf4b`, workflow `wf_1f3e2c10-e94`) is concurrently working L11–L14 design (left untracked
  `spec-docs/L11_L14_OPEN_QUESTIONS.md`); flagged to JK for coordination before L11-3. *(Prior entries below.)*
- **✅ L11-1 VERIFIED + COMMITTED (2026-06-18, attended) — the pure manager-firing + player-ripple engine (first L11
  ticket); preceded by the L11 recon + JK's 4 kickoff rulings (`cf097d09`).** L11 grounding recon (workflow
  `wf_107b9eb5-faf`, 5 readers → `L11_SCOPE_MAP.md`) established **L11 = the missing fire ACTION over already-built parts**
  (the `MANAGER_FIRED` matrix row + `ManagerAssignment.fired`/`endDate` + the Manager Almanac all exist; the row has zero
  emitters, nothing writes `fired:true`), NOT a new subsystem. MOY stays OUT (Phase-1 D9). **JK rulings (DECISIONS_LOG):**
  trigger = manual GM action + auto-backstop (revive the orphaned `managerFireProbability`) + L14 cascade (one shared
  resolver); personality ripple = build full now, dark vs the types (inert until L1 + a new manager-personality field);
  performance gate = SCALED by how underwater (live `valueDelta`, net-positive untouchable); fan-relief = SCALED by team
  struggle, once per firing. **L11-1** = NEW pure `src/engines/franchiseL11FiringEngine.ts` (+10-test file):
  `computeFranchiseL11Firing(input, tuning?)` → `{reliefBumpDelta, playerRipples[], managerSelfDelta}` — relief scaled by
  struggle (4 at neutral fan-morale → capped 12 cratered); per-player ripple 0 for net-positive (untouchable), else a
  `|valueDelta|`-severity gradient × personality tilt (§12-verbatim: loyal bigger, resilient smaller, EGOTISTICAL lowest
  0.5); magnitudes §16 sim-tune. PURE (no Date.now/Math.random/I/O), build-DARK — NO caller/flag/store, trackerDb stays
  **v23**, imports only the `CanonicalPersonality` type. **Builder = Codex (gpt-5.5) ≠ Auditor = Opus Captain**
  (cross-model triangle). Independent line-by-line audit + directional falsification (loyal>disloyal, resilient<non-resilient,
  egotist<timid/droopy, monotonic severity, relief inverse-to-morale — all 10 tests are real comparisons, non-vacuous; the
  clamp test honestly uses override tuning since default maxes at −5.4 < the −6 floor) → VERIFIED (0 major / 0 minor).
  Host gate: `NODE_ENV= npm run build` exit 0 (8.67s) + full suite **7,699/439, 7,697 pass / 2 characterized fail**
  (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds (+10 / +1 file). Committed on
  codex/franchise-v1-next (2 engine files + docs; **not pushed**). **➡ NEXT = L11-2** (the manager-personality field
  [home: identity `ManagerProfile` managerWpa.ts:68, reuse the canonical 7-personality enum] + the legacy/tenure write —
  a `setManagerFired` mutator setting `fired`/`endDate`/reason + the Almanac tenure aggregate gaining hire/fire dates).
  *(Prior L10/L9b entries below.)*
- **✅ L10-Q5Q8 VERIFIED + COMMITTED (2026-06-18, attended) — the Q5/Q8 rework of the L10 random-event subsystem; ⇒ L10
  (random events) FULLY COMPLETE.** **Q5 (continuous cadence):** dropped the 20%-checkpoint gate in
  `franchiseL10SweepCompute.ts` (removed the `getSeasonMetadata` + `isCheckpointBoundary` fetch/gate + the
  `not-checkpoint` status) → the league sweep now fires on EVERY completed game; base rates in
  `franchiseL10EventEngine.ts` re-tuned to PER-GAME §16 placeholders (≈÷10: performance 0.006 … wildcard 0.001) — flat
  per-game (JK ruled flat, NO season-length scaling). **Q8 (`name_change`):** added as a DISTINCT rare cosmetic-family
  event (`nameChangeBaseRate 0.0004` via a new optional `baseRateOverride` on the roll spec; player-only; distinct
  `seedSuffix` → independent roll + store id; neutral valence), DARK — opt-in honored at the post-D13 confirm step, NOT
  by omission. Store/reporter unchanged (the `family`/`eventType` fields are plain strings; the reporter adapter is
  generic). **Trait-adaptation + ratings-dev cadence STAY periodic (JK ruling — the percentile-vs-peers model needs the
  20%-checkpoint sample synchronization; only the independent-per-player L10 dice rolls go continuous).** **Builder
  routing RESTORED to Codex (JK directive):** builder = Codex CLI (`codex exec`, prompt fed via stdin from the contract
  in PROMPT_CONTRACTS.md — sidesteps the backtick/`$` shell-arg corruption that drove the L10-4 → PRE-ACT-TRAITS-1
  subagent detour, 12 tickets); auditor = Opus 4.8 (cross-model triangle restored). NO store/DB/flag change (trackerDb
  stays **v23**). **Codex(gpt-5.5,xhigh)-built → Opus-INDEPENDENTLY-audited VERIFIED** (0 major / 0 minor; falsified:
  cosmetic-rate-0 + nameChangeBaseRate-1 → ONLY name_change fires [proves the override]; real-engine probe — game 19
  fires 1 event [continuous test non-vacuous] + game 20 fires a team event [seam team-path coverage preserved through
  the re-seed]). Host gate: `NODE_ENV= npm run build` exit 0 (7.59s) + full suite **7,689/438, 7,687 pass / 2
  characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`; `GameTrackerLaunchState` +
  `franchiseOffseasonGuards.component` order-flakes both passed this run), ZERO new reds (+3 / +0 files = the 3 Q8 engine
  tests). Committed on codex/franchise-v1-next (4 code/test + docs; **not pushed**). **➡ NEXT = L11 (managers)** per the
  L-stack (L11 → L12 races/All-Star/awards-fame → L13 relationships → L14 rebrand → the L-SIM gate); L11 is a FRESH
  subsystem needing a grounding recon before contracting (mirror the L10 recon). *(Prior L10/L9b entries below.)*
- **🔧 PIVOT (2026-06-18, attended session) — JK ruled Q1–Q12; FINDING-150 (L9b trait-detection SCOPE gap) opened; now
  starting the L9b trait-reality REBUILD, NOT L11.** After L10 completed, the Captain surfaced all open forks; JK ruled
  (DECISIONS_LOG 2026-06-18) with 3 OVERRIDES: **Q5** random events fire CONTINUOUSLY (not 20%-batched) · **Q8** name-change
  IN v1 · **Q12** personality-primary trait exception IN v1. JK's Q1 challenge exposed **FINDING-150**: the trait MATRIX +
  scorer + acquisition + the 16 built traits are SOUND, but L9b-3a built only 16 of ~50 buildable traits — it followed the
  SUPERSEDED §D "needs the ball-strike count" triage instead of the resolved §VI model. Detection-scope audit (workflow
  `wf_6643e635-9e3`, 7 agents, all 75 traits, code-grounded → `spec-docs/TRAIT_DETECTION_SCOPE_AUDIT.md`): **16
  correctly-built · 34 wrongly-dormant (buildable now) · 24 correctly-dormant (need still-missing inputs) · 1 cut.** The
  ball-strike count (Q1) only blocks 1 otherwise-uncovered trait (Composed) → count DEFERRED v1. **MEASUREMENT MODEL NOW
  RATIFIED + COMMITTED `703d78b9`** (DECISIONS_LOG 2026-06-18 "later" + `spec-docs/TRAIT_MEASUREMENT_SPEC.md §0`): per-trait
  measurements consolidated (workflow `wf_368f24d0-78d`, 51 traits) → JK ruled all 15 open. Key rulings: **acquisition model
  = P (acquisition probability) is the single comparison currency for displacement + lose-low, with RE-EVALUATE-TO-DROP**
  (every held trait recomputes P each cycle from data>ratings>personality; nothing permanently sticky); strikeout-rate
  family; **walks-allowed** pitcher count-family (Composed reclassified buildable); **Big/Little Hack = HR-rate/AVG**;
  **Slow Poke/Sprinter = DP/FC** rate; **Noodle Arm = ARM<11+personality**; **Ace Exterminator = wire opposing-pitcher-grade
  join**; first-pitch = personality+opt-in. **⏸ CHECKPOINTED HERE (JK) — build NOT started.** **➡ NEXT = the L9b rebuild
  per `TRAIT_MEASUREMENT_SPEC.md §0.4`: R-E (enabling: thread ratings/grades into the builder · charisma factor in the
  combiner · the re-evaluate-to-drop model) → R1 (clean outcome proxies) → R2 (data-proxy+personality) → R3 (ratings-gated:
  Noodle Arm, Ace Exterminator).** Takes the earnable v1 set 16 → ~50; build-DARK; each sub-ticket build→audit→host-gate→
  commit. **L10 REWORK ALSO QUEUED** (Q5 continuous cadence reshapes L10-1/L10-3; Q8 adds name-change to L10's dark catalog).
  trackerDb v23; nothing pushed. *(Prior L10-5 / L10-COMPLETE entry below.)*
- **✅ L10-5 VERIFIED + COMMITTED (2026-06-18, fresh attended session, AUTH-4 keep-rolling) → L10 COMPLETE (1-5) — the
  PURE reporter tap / news adapter (the final L10 piece).** NEW pure module
  `src/src_figma/app/engines/reporter/franchiseL10NewsAdapter.ts` (lives WITH the reporter — core `src/engines` must not
  depend on the UI-layer `SeasonNewsEvent` type): `buildFranchiseL10SeasonNewsEvent({event, franchiseId, seasonId,
  seasonNumber})` maps a fired `FranchiseL10EventCandidate` → a `SeasonNewsEvent` with `eventType:'RANDOM_EVENT'`,
  `subjectIds:[targetId]`, `facts` = the deterministic ground-truth event fields (never fabricated), and a conservative
  bounded `dramaticWeight = clamp(L10_NEWS_DRAMATIC_WEIGHT.base[valence] + magnitudeScale×magnitude, 0, 1)`. **PURE** (no
  LLM/network/IndexedDB/Date/Math.random/async) / **build-DARK** — NO production caller, does NOT call the live reporter
  `generateSeasonNewsTake` (byte-unchanged) and does NOT wire any emission path (the live emission is the deferred post-D13
  seam, mirroring L5d + L10-4); reporter heat stays hardcoded `'medium'`; trackerDb stays **v23**. **DESIGN CALL (AUTH-4
  default, FLAGGED for JK — same shape as L10-4):** pure adapter only, no live emission now. **Subagent-BUILT →
  Opus-Captain-INDEPENDENTLY-audited VERIFIED** (read line-by-line; builder ≠ auditor; 0 major / 0 minor): host build exit 0
  + full suite **7,559/438, 7,557 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO
  new reds (+9 / +1 file = `franchiseL10NewsAdapter.test.ts`; an exact-key-set assertion locks the `SeasonNewsEvent` shape).
  Committed on codex/franchise-v1-next (2 code files + doc updates; not pushed). **⇒ L10 (random events) COMPLETE: L10-1
  engine `607fa015` · L10-2 store `a830a61f` · L10-3 hook `8a33d9d3` · L10-4 resolver `057340ed` · L10-5 adapter — all
  build-DARK, activate post-D13.** **➡ NEXT = L11 (managers)** per the L-stack (L11 → L12 races/All-Star/awards-fame → L13
  relationships → L14 rebrand → the L-SIM gate); L11 is a FRESH subsystem needing a grounding recon before contracting.
  *(Prior L10-4 entry below.)*
- **✅ L10-4 VERIFIED + COMMITTED (2026-06-18, fresh attended session, AUTH-4 keep-rolling) — the PURE stadium-change
  resolver (the concrete-resolution step for a fired `stadium_change` team event).** NEW pure engine
  `src/engines/franchiseStadiumChangeResolver.ts`: (1) `pickStadiumFromPool(currentStadiumName, seed)` — the SHARED
  deterministic pool-pick helper (reused by L14 rebrand; do NOT fork): pool = `getAllParks()` (23 SMB parks), excludes the
  current park by normalized `getStableParkId`, falls back to the full pool if exclusion empties the set, throws only on an
  empty pool, index = `clamp(floor(franchiseL10DeterministicRoll(seed) × len))`. (2) `resolveFranchiseStadiumChange({event,
  teamName, currentStadiumName?, seedBase?})` — guards `targetKind==='team' && eventType==='stadium_change'` (throws
  otherwise), derives `pickSeed = ${seedBase}:${event.targetId}:stadium_change:${event.seed}`, returns `{newStadium,
  snapshot}` where snapshot = `FranchiseTeamStadiumSnapshot {teamId: event.targetId, teamName, stadium, stadiumId, hasSeedParkFactors}`
  (hasSeedParkFactors from `getDerivedParkFactorsIfAvailable`). **PURE** (no IndexedDB/Date/Math.random/async) / **build-DARK**
  — NO production caller (orphaned-pending the post-D13 apply step that will write the snapshot + recompute analytics), NO
  store / NO wiring / trackerDb stays **v23**. Fan-morale suppression is UPSTREAM (L10-1's `teamSuppressed`), so the resolver
  takes no morale. **DESIGN CALL (AUTH-4 default, FLAGGED for JK):** L10-4 is the pure concrete-resolution step, NOT a live
  persistence/analytics mutation — the snapshot WRITE + recompute defer to the post-D13 apply ticket (mirrors L9b-3c's
  orphaned-pending applier). Open-question #4 (stadium change on the USER's team vs AI-only) only bites at that future apply
  step → default `allowed/suppressed` taken upstream; not decided here. **Subagent-BUILT → Opus-Captain-INDEPENDENTLY-audited
  VERIFIED** (read line-by-line; builder ≠ auditor): host build exit 0 + full suite **7,550/437, 7,548 pass / 2 characterized
  fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds (+10 / +1 file =
  `franchiseStadiumChangeResolver.test.ts`). 2 trivial non-blocking minors (single-park-pool fallback untested w/o mocking
  the real pool; per-team divergence not explicitly asserted). Committed on codex/franchise-v1-next (2 code files + the doc
  updates; not pushed). **➡ NEXT = L10-5** (reporter tap: applied L10 event → `SeasonNewsEvent` `RANDOM_EVENT` via
  `seasonNewsGenerator.ts` → `seasonNewsItems`; risk low-med) per `L10_SCOPE_MAP.md` §3. *(Prior L10-3 entry below.)*
- **✅ L10-3 VERIFIED + COMMITTED (2026-06-18, AUTH-4 overnight; host-gate passed in a fresh attended session) — the flag +
  dark league-sweep hook that wires the L10-1 engine → the L10-2 store (the wiring half of L10).** (1) 6th default-OFF
  Phase-2 flag `isFranchisePhase2L10Enabled` (cloned the TRAITS block in `franchisePhase2Flags.ts`). (2) NEW
  `src/utils/franchiseL10SweepCompute.ts` `persistDarkL10ForCompletedGame(gameState, scope, archiveOptions)`: flag-gate
  FIRST (normal play = zero-cost no-op, no loads) → resolve league `gameNumber` → `getSeasonMetadata().totalGames` →
  `isCheckpointBoundary` (20%-of-season cadence, reused) → `resolveL10Candidates` (mirrors `resolveCheckpointRoster`:
  MLB-only roster, per-team fan morale memoized via `getFranchiseMoraleSnapshot(scope,'team-fan',teamId)?.currentValue ??
  50`, player morale, `normalizePersonality`, `performanceSignal` via `normalizePerformanceSignal(valueDelta)`; builds
  BOTH player AND distinct-team candidates) → `computeFranchiseL10Events({candidates, intensity:'standard',
  seedBase})` (L10-1; seedBase = `${franchiseId}:${seasonId}:${gameNumber}`) → writes each emitted event as a PENDING
  `franchiseL10Overlays` row via `putFranchiseL10Overlay` (L10-2) — deterministic idempotent id
  `${franchiseId}:${seasonId}:${statsScopeId}:${targetId}:${family}:${eventType}:l10-${gameNumber}`, `applied:false`,
  `source:'l10-random-event'`, `createdAt` from the MAX persisted at-bat timestamp (NO Date.now). `l10SweepSeam` exposes
  roster/compute for stubbing. (3) 6th gate branch `if (isFranchisePhase2L10Enabled()) { try { await
  persistDarkL10ForCompletedGame(...) } catch (e) { console.warn('[L10] …') } }` inside `if (trueValueScope)` after the
  Traits gate (processCompletedGame.ts:639). (4) NEW `franchiseL10SweepCompute.test.ts` (5 tests: flag-off dark-noop
  loads-nothing · non-boundary not-checkpoint · boundary writes pending rows + idempotent replay · a REAL
  producer→consumer SEAM test feeding live `computeFranchiseL10Events` · two-runs-identical determinism). **Doubly-dark**
  (flag OFF + every row pending+applied:false). NO new store / trackerDb stays **v23** / KBL_BACKUP_VERSION stays **2**.
  **Captain(Opus)-BUILT (no Codex CLI in sandbox) → INDEPENDENTLY decorrelated-reader-AUDITED VERIFIED** (0 major / 3
  minor; M1 seam-team-path CLOSED in-session by seeding `team-dd` so a `targetKind:'team'` row is live-tested; M2
  cosmetic; M3 = sandbox probe artifacts to delete host-side): tsc --noEmit exit 0 (full project) + 5/5 targeted green
  (engine fires 3 events for the seed → non-vacuous); flag default OFF + flag-gate FIRST; gate branch try/catch never
  rethrows; deterministic (no Date.now/random); MLB-roster + per-team morale faithful; NO store/DB/backup/PIN drift; no
  `franchiseRandomEventGenerator` boundary violation; diff EXACTLY the 5 FILE LIST paths. **HOST GATE PASSED (2026-06-18,
  fresh attended session, real node v20):** `NODE_ENV= npm run build` exit 0 (`✓ built in 7.74s` + PWA) + full suite
  **7,540/436, 7,538 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds
  (+5 / +1 file = `franchiseL10SweepCompute.test.ts`). Probe artifacts deleted; the diff was independently re-verified
  against the contract (flag-gate-first, try/catch gate branch, no Date.now/random, no store/DB/PIN touch) before commit.
  Committed on codex/franchise-v1-next (5 contracted files + the 3 session docs folded in per JK; never pushed). Live
  path → browser-pending (#24). **➡ NEXT = L10-4** (stadium-
  change event: low base rate suppressed by high fan morale, pool-pick from `parkLookup.ts`, writes
  `FranchiseTeamStadiumSnapshot` so analytics recompute) then **L10-5** (reporter tap) per `L10_SCOPE_MAP.md` §3.
  *(Prior L10-2 entry below.)*
- **✅ L10-2 VERIFIED + COMMITTED (2026-06-18, AUTH-4 overnight) — the dark `franchiseL10Overlays` store (trackerDb
  v22→v23; the persistence half of L10).** NEW `src/utils/franchiseL10OverlayStorage.ts` (1:1 mirror of
  `franchiseTraitOverlayStorage` with the L10-event row: `targetId`/`targetKind` player|team + family/eventType/valence/
  magnitude/probability + confirmationStatus/applied lifecycle; second index `by_target` not `by_player`) + the store
  mirrored at all 8 sites (trackerDb v23 store def; syncConfig 'id'; backupRestore `optional:true` + static schema v23;
  the `franchiseSeasonLedgerStorage` store-list PIN toBe(22)→23 + alpha-insert + the legacy-seed v22→v23 migration-survival
  proof; parity + manifest + a new 8-test storage test). DARK/EMPTY (no production consumer; L10-3 writes it);
  KBL_BACKUP_VERSION stays 2. **Codex-built → Opus-INDEPENDENTLY-audited VERIFIED:** tsc-0 / full suite **7,535/435, 7,533
  pass / 2 characterized fail**, ZERO new reds (+8); v22→v23 migration-survival + backup parity PROVEN; trait template +
  all prior stores byte-unchanged; Codex hit EXACTLY the 8 FILE LIST paths. Persistence → browser-pending (#23). **➡ NEXT
  = L10-3** (default-OFF `isFranchisePhase2L10Enabled` flag + `persistDarkL10ForCompletedGame` league-sweep hook gated by
  flag AND `isCheckpointBoundary`, wiring L10-1 → L10-2; mirror L9b-3b-ii; 6th gate branch after processCompletedGame.ts:632).
  *(Prior L10-1 entry below.)*
- **✅ L10-1 VERIFIED + COMMITTED (2026-06-18, AUTH-4 overnight) — the pure random-event SELECTION engine (first L10
  piece).** NEW `src/engines/franchiseL10EventEngine.ts` (`computeFranchiseL10Events`): a PURE, deterministic, build-DARK
  league-sweep roll. Per candidate × eligible family → `P = clamp01(baseRate[family] × intensityMultiplier[Juiced/Standard/
  Nerfed] × moraleFactor × personalitySensitivity × perfSignal)`; fires iff `franchiseL10DeterministicRoll(seed) < P`
  (FNV-1a, local re-impl — boundary respected). 8 families (`performance/pitching/trait/role/cosmetic/team/roster/wildcard`)
  — **personality-shift EXCLUDED (arc-earned)**; eligibility (team→team specs incl. `stadium_change`, `pitching`→pitcher-
  only, wildcard→players); HIGH fan morale SUPPRESSES team/stadium; morale-tilted valence sub-roll; trade_demand
  proposed-only; name-change excluded. Mirrors `tradeRequestGeneration` (Tuning + §16 const + components + deterministic
  sort). **Codex-built → Opus-INDEPENDENTLY-audited VERIFIED** (read line-by-line): tsc-0 / full suite **7,527/434, 7,525
  pass / 2 characterized fail**, ZERO new reds (+13); pure (no IndexedDB/Date/random/async); build-dark (no production
  importer; L10-3 wires it); Codex hit EXACTLY the 2 FILE LIST files. **➡ NEXT = L10-2** (dark `franchiseL10Overlays`
  store, trackerDb v22→v23 — the 8-site mirror incl. the `franchiseSeasonLedgerStorage` store-list PIN; mirror
  `franchiseTraitOverlays`/L9b-3b-i). *(Prior L9b-3c entry below.)*
- **✅ L9b-3c VERIFIED + COMMITTED (2026-06-18, AUTH-4 overnight) → L9b-3 + L9b COMPLETE — the §11 trait-confirm transform
  + the ATOMIC trait1/trait2 displacement write (the LAST L9b piece; the first code that mutates a player's traits).**
  NEW PURE `src/engines/traitOverlayConfirmation.ts` (`applyTraitDisplacement` — the 2-slot categorical math: gain →
  already-held no-op / displaces-named replaces that slot / free slot fills / cap+no-displaces → applied:false; lose →
  remove held / not-held no-op; canonical-name guard on traitName + displacesTraitName) + `confirmTraitOverlay`
  (pending→confirmed + applied) + `buildTraitConfirmationRequest` (SMB4-console instruction + resulting slots) +
  `summarizeTraitOverlayChangeLog`. NEW impure `src/utils/franchiseTraitConfirmApply.ts` (`applyConfirmedTraitOverlay`:
  idempotent guard → load player → displace → `saveFranchisePlayer` FLAT trait1/trait2 → mark overlay confirmed+applied;
  player-write-first; cross-DB note). Mirrors `ratingsOverlayConfirmation` [L2c] but CATEGORICAL — traits have NO
  read-merge (do NOT route through `ratingsOverlayMerge`), so the WRITE is the mechanism. **NO live caller** (the confirm UI
  is a deferred post-D13 D-ticket — orphaned-pending-its-UI by design). **Codex 5.5-built → Opus-4.8-INDEPENDENTLY-audited
  VERIFIED** (read line-by-line — all 6 displacement cases + double idempotency + flat-write re-derived): tsc-0 / full suite
  **7,514/433, 7,512 pass / 2 characterized fail**, ZERO new reds (+15 = the 2 new test files); engine pure (no
  IndexedDB/Date/random/async); Codex hit EXACTLY the 4 FILE LIST files (no doc edits, no abandoned files). **⇒ L9b
  (trait-from-reality engine) COMPLETE** (1 scorer · 2 acquisition · 3a candidate-builder · 3b store+hook · 3c
  confirm/write) — all build-DARK, activate post-D13. **➡ NEXT = L10 (random events)** — a FRESH L-stack subsystem; needs
  a grounding recon before contracting. *(Prior L9b-3b-ii entry below.)*
- **✅ L9b-3b-ii VERIFIED + COMMITTED (2026-06-18, AUTH-4 overnight) → L9b-3b COMPLETE — the flag + dark trait-grant hook
  (the first live-path trait WRITER, doubly-dark).** NEW `src/utils/franchiseTraitGrantCompute.ts` +
  `isFranchisePhase2TraitsEnabled` (default-OFF, 5th block in `franchisePhase2Flags.ts`) +
  `persistDarkTraitGrantForCompletedGame(gameState, scope, archiveOptions)` wired after the checkpoint gate at
  `processCompletedGame.ts:632` (inside `if (trueValueScope)`, matching the `[Checkpoint]` try/catch — never blocks game
  completion). Mirrors L8b EXACTLY: **flag-gate FIRST** (normal play = zero-cost no-op, no load) → resolve league
  gameNumber → `getSeasonMetadata().totalGames` → `isCheckpointBoundary` (20%-of-season; the min-sample valve keeps early
  checkpoints dormant so trait changes emerge late-season with a populated pool — DEFAULT-TAKEN vs a season-end trigger) →
  load season events (`getSeasonGames`→per-game `getGameEvents`/`getBetweenPlayEvents`/`getGameFieldingEvents`) + injury
  counts + season fielding + games-per-player → enumerate MLB roster (league-wide) → `computeSeasonTraitCandidates`
  (L9b-3a, config `deriveAdaptiveStandardsConfig({gamesPerSeason: totalGames})`) → per player
  `computeTraitAcquisition` (L9b-2; heldTrait `strength` = that trait's current candidate realityPercentile ?? 0.5;
  `rosterRole:'unknown'` v1) → writes PENDING `franchiseTraitOverlays` rows (`putFranchiseTraitOverlay`) with deterministic
  idempotent id `…:${traitName}:trait-grant-${gameNumber}`, `applied:false`, `createdAt` from the max persisted at-bat
  timestamp (NO Date.now). `traitGrantSeam` exposes the roster/candidate/acquisition for stubbing.
  **Codex 5.5-built → Opus-4.8-INDEPENDENTLY-audited VERIFIED** (read line-by-line — the test stubs the seam): tsc-0 / full
  suite **7,499/431, 7,497 pass / 2 characterized fail**, ZERO new reds (+4 = the hook test); DARK (only
  `processCompletedGame` consumes it, flag-gated); no Date.now/random; Codex hit EXACTLY the FILE LIST (no doc edits, no
  abandoned files). **LIMITATION:** the hook test stubs the L9b-3a→L9b-2 seam (gate/cadence/persistence/idempotency/
  determinism covered; the engines have their own suites + the seam test) → the real end-to-end through the hook is
  browser-pending (#22). **➡ NEXT = L9b-3c** (the LAST L9b piece: the §11 trait-confirm transform + ATOMIC trait1/trait2
  displacement write via `saveFranchisePlayer` — mirror `ratingsOverlayConfirmation` [L2c] but CATEGORICAL; on confirm
  apply the gain[/displace weakest]/lose to the flat franchise `trait1`/`trait2`; do NOT route trait rows through
  `ratingsOverlayMerge`; the live confirm UI is a deferred post-D13 D-ticket). *(Prior L9b-3b-i entry below.)*
- **✅ L9b-3b-i VERIFIED + COMMITTED (2026-06-18, AUTH-4 overnight) — the dark `franchiseTraitOverlays` store
  (persistence half of the first trait writer; trackerDb v21→v22).** NEW `src/utils/franchiseTraitOverlayStorage.ts`
  (a 1:1 mirror of `franchiseRatingsOverlayStorage` with a CATEGORICAL trait-change row: `valence` gain/lose · `traitName`
  · `displacesTraitName` · `realityPercentile`/`probability` audit snapshots · `confirmationStatus` pending/confirmed ·
  `applied` lifecycle flag · caller-supplied `createdAt`) + the store mirrored at every site (trackerDb v22 createObjectStore
  with `by_scope`/`by_player`; syncConfig `'id'`; backupRestore `optional:true` + STATIC schema v22; the
  `franchiseSeasonLedgerStorage` store-list PIN `toBe(21)`→22 + alphabetical insert; parity + manifest + a new storage
  test). **STORE FORK RESOLVED (AUTH-4 default):** the NEW store, NOT reuse — `ratingsOverlayMerge` is rating-key-only and
  silently drops trait rows, so reuse carried an orphaned-write-back landmine. DARK/EMPTY (no production consumer; L9b-3b-ii
  writes it); KBL_BACKUP_VERSION stays 2. **Codex 5.5-built → Opus-4.8-INDEPENDENTLY-audited VERIFIED:** tsc-0 / `vite build`
  OK / full suite **7,495/430, 7,493 pass / 2 characterized fail**, ZERO new reds; the **v21→v22 migration-survival**
  (the pin test seeds a v21 DB incl. a ratings-overlay row → proves both it AND the new trait store survive at v22 with
  correct keyPath+indexes) + **backup round-trip parity** PROVEN; `franchiseRatingsOverlays` template + all prior stores
  byte-unchanged; Codex hit EXACTLY the FILE LIST (no abandoned files, no doc edits — the tightened contract held).
  Persistence → browser-pending (#21). **➡ NEXT = L9b-3b-ii** (the default-OFF `isFranchisePhase2TraitsEnabled` flag +
  `persistDarkTraitGrantForCompletedGame` hook, mirroring the L8b `franchiseCheckpointSweepCompute` pattern: flag gate →
  20%-checkpoint cadence → load season events → enumerate MLB roster → `computeSeasonTraitCandidates` [L9b-3a] →
  `computeTraitAcquisition` [L9b-2] per player → write PENDING `franchiseTraitOverlays` rows; wired after the checkpoint
  gate at `processCompletedGame.ts:623`). *(Prior L9b-3a entry below.)*
- **✅ L9b-3a VERIFIED + COMMITTED (2026-06-18, AUTH-4 overnight) — the PURE context-reconstructor + candidate-builder
  (the read-half of the first trait writer).** NEW `src/engines/traitCandidateBuilder.ts` (+ 21-test file):
  `computeSeasonTraitCandidates(input, config?)` takes a season's ALREADY-LOADED events + rosters + L9a-4 aggregates
  (no IndexedDB I/O — the DB reads are L9b-3b) → for each AtBat reconstructs the matrix `GameContext`
  (`reconstructAtBatContext`: pressure from `isClutch`, risp/runnersOn/basesEmpty from `RunnerState`, teamLosing by
  half-inning, isSubstitutionAB from `enteredAs`, a per-(game,pitcher,inning,half) `consecutiveBaserunnersAllowed` tally
  for Meltdown) → runs ONE synthetic all-traits probe through the FROZEN `activeTraitNames` to detect trait OPPORTUNITIES
  → aggregates an outcome-weighted RATE `signalValue` per the 16 v1-buildable traits (Clutch/Choker WPA-favorable by role;
  RBI Hero/Zero `rbiCount`; Rally Stopper/Surrounded pitcher-favorable/unfavorable; Rally Starter reach-rate; Meltdown
  freq/units; Stealer/Bad Jumps SB success/`1-rate`; Pinch Perfect; Butter Fingers error-rate; Cannon/Noodle ±OF-arm-rate;
  Durable/Injury-Prone ∓injury-rate) → role-bucketed peer pools → feeds L9b-1 `computeTraitRealityScore` (basis `'none'`)
  → `TraitCandidate[]` per player. The 33 Bucket-C traits stay DORMANT (never in BUILDABLE_TRAITS; no proxy fabricated).
  PURE / build-DARK (no production importer; L9b-3b wires it). **Codex 5.5-built → Opus-4.8-INDEPENDENTLY-audited
  VERIFIED:** tsc-0 / focused 22/22 / full suite **7,487 tests / 429 files, 7,485 pass / 2 characterized fail**, ZERO new
  reds (+22 tests / +1 file = exactly this engine's test, incl. a seam test); purity + build-dark greps clean; frozen
  matrix/scorer/`traitAcquisition`/`percentile`/`traitPricing`/`rosterEngineConstants` BYTE-UNCHANGED; every per-trait
  outcome direction re-derived by the auditor. **SEAM FIX (FINDING-149):** the decorrelated builder self-audit caught — and
  the Captain verified from source — that L9b-3a's output was a FLAT `TraitCandidate` incompatible with L9b-2's
  `computeTraitAcquisition` (which reads `candidate.score.*`). The first commit `54fae510` shipped the flat shape; a
  follow-up commit FIXED it: output is now `SeasonTraitCandidate extends TraitCandidate` (L9b-2's nested `{traitName,
  score}`) + a seam integration test that feeds L9b-3a output straight into `computeTraitAcquisition`. (Codex's self-audit
  recommended reverting to the count model — REJECTED: the count model is the fatally-broken one; the fix keeps the RATE
  model AND fixes the seam.) **AUDIT DEVIATIONS HANDLED (the builder over-produced):** (1) Codex left an
  ABANDONED earlier-attempt pair `traitContextReconstructor.*` implementing a broken EXPOSURE-COUNT model (bare fire-count
  made opposing pairs indistinguishable — Clutch≡Choker, RBI Hero≡Zero, Stealer≡Bad Jumps, Butter≡Cannon≡Noodle) → the
  auditor DELETED it (nothing imported it; the contracted `traitCandidateBuilder.ts` is the correct rate-model file); (2)
  Codex edited 7 Captain-owned spec-docs (incl. AUDIT_LOG + FINDINGS) → REVERTED to HEAD + re-authored here. trackerDb stays **v21** (pure, no store).
  **DEFAULTS-TAKEN (AUTH-4, flagged for JK — see OPEN PENDING-JK):** outcome-weighted RATE model (not bare fire-count);
  `pressure='high'` from the populated `isClutch` flag (finer extreme banding deferred); Cannon/Noodle share one
  OF-arm-per-GAME signal (no per-OF-chance denominator exists in v1); Durable/Injury-Prone = injuries/games; all signals
  `basis:'none'`; Clutch/Choker role-determined (position→batting WPA, pitcher→fielding-team WPA). **➡ NEXT = L9b-3b**
  (the dark hook + PENDING write — clone the L8b `franchiseCheckpointSweepCompute` pattern: a default-OFF
  `isFranchisePhase2TraitsEnabled` flag + a gated `persistDarkTraitGrantForCompletedGame` in `processCompletedGame.ts`
  that LOADS the season events, calls `computeSeasonTraitCandidates` → `computeTraitAcquisition` (L9b-2) → writes PENDING
  trait-change rows; PERSISTENCE class → audit HARDEST). **BLOCKS on the JK STORE FORK** (reuse `franchiseRatingsOverlays`
  v21 = AUTH-4 default / new `franchiseTraitOverlays` v21→v22 = Captain's lean; `WAITING_ON_JK`). *(Prior L9b-2 entry
  below.)*
- **✅ L9b-2 VERIFIED + COMMITTED `f616373a` (2026-06-18, AUTH-4 overnight) — the PURE trait-ACQUISITION engine.** L9b
  SPLIT: L9b-1 scorer (DONE `398533d1`) · **L9b-2** acquisition (DONE, this entry) · **L9b-3** grant/write-back (NEXT —
  persistence, audit hardest). NEW `src/engines/traitAcquisition.ts` (+ 24-test file): `computeTraitAcquisition` consumes
  L9b-1 reality scores → trait-change PROPOSALS via the SPEC-FIXED MULTIPLICATIVE combiner `P = realityPercentile ×
  ambitionTilt × resilienceTilt × imageAxisTilt × moraleFactor × rosterRoleFactor` (all factors neutral-at-1.0; §16
  sim-tuned magnitudes in `TRAIT_ACQUISITION_TUNING`). Gates: min-sample valve (VI.1 — thin/null score → no proposal),
  role-eligibility (VI.2, reuses L9b-1 `isTraitEligibleForRole`/`traitRole`), gain-high(≥0.75)/lose-low(≤0.35) hysteresis
  dead-band; reconciliation = no-offsetting-pair (held opposite blocks gain / both-gain keeps higher-P) + 2-trait-cap
  strength-ranked weakest displacement (strict-exceed; a LOSE frees a slot). VI.3 image-valence + driver sets + the new
  `TRAIT_OPPOSITES` (14 pairs) use CANONICAL `TRAIT_PRICING` names (Two Way triplet, K Neglector); a module-load guard
  asserts every opposite is canonical. PURE — no IndexedDB/mutation/Date.now/Math.random; no production caller (L9b-3
  wires it). **Codex 5.5-built → Opus-4.8-independently-audited VERIFIED** (tsc-0 / build-0 / focused 24/24 / full suite
  7,465/428 7,463 pass / 2 characterized fail, ZERO new reds; combiner directions + hysteresis + reconciliation
  hand-verified vs tests; one dead import removed by the auditor + re-verified). trackerDb stays **v21** (pure, no store).
  **DEFAULTS-TAKEN (AUTH-4, flagged for JK):** (1) `TRAIT_OPPOSITES` 14-pair list authored here = NEW trait-asset data;
  (2) the VI.3:122 "personality-PRIMARY where signal thin" exception (Stimulated / Gets Ahead / Falls Behind / Big Hack /
  Little Hack) NOT implemented v1 — the min-sample valve's thin→dormant default dominates (conservative; never wrong-fires);
  (3) factor curves centered at neutral-50→1.0; (4) displacement = weakest-held strict-exceed; (5) absent
  morale/modifiers/role → neutral. **➡ NEXT = L9b-3** (grant/write-back — the FIRST real trait writer: L8b-pattern dark
  flag-gated hook + GameContext reconstructor + PENDING trait rows + §11 trait-confirm transform writing `trait1`/`trait2`
  via `saveFranchisePlayer`; PERSISTENCE class → audit HARDEST; JK store fork in WAITING_ON_JK [default=reuse
  `franchiseRatingsOverlays`]). *(Prior L9b-1 entry below.)*
- **✅ L9b-1 VERIFIED + COMMITTED `398533d1` (2026-06-18, AUTH-4 overnight, host session) — the PURE trait-from-reality
  SCORER (TS-2).** L9b SPLIT (per the recon): **L9b-1** scorer (DONE, committed) · **L9b-2** acquisition (NEXT) · **L9b-3**
  grant/write-back (persistence, audit hardest). Committed 4 files (`398533d1`, branch codex/franchise-v1-next):
  NEW `src/engines/percentile.ts` (lifted getPercentile + getValueAtPercentile VERBATIM out of salaryCalculator —
  byte-identical, exported; one truth, not re-implemented) + MODIFIED `salaryCalculator.ts` (deletes the inlined helpers,
  re-imports them — behavior-neutral, the 121 salaryCalculator-family tests prove it) + NEW
  `src/engines/traitRealityScorer.ts` (`computeTraitRealityScore` → realityPercentile 0..1, gated in order by
  unknown-trait → role-ineligible VI.2 → thin sample VI.1 valve [season-scaled via `scaledThreshold`] → thin peer pool →
  percentile over sorted peers; PURE, no IndexedDB/mutation; does NOT compute P [L9b-2] or write back [L9b-3]) + a
  19-test file with a 75-name completeness/role-count guard. **PATH CORRECTION:** `franchiseAdaptiveStandards.ts` +
  `franchiseAwardTrust.ts` are in `src/utils/` (the recon said engines/); `getPercentile` IS in
  `src/engines/salaryCalculator.ts`. **NAME-DRIFT reconciled to canonical TRAIT_PRICING data** (a misspell silently never
  fires): `K Neglector` (not the spec's "Neglecter"), `Two Way (C)/(IF)/(OF)` (not "Two Way"). **DEFAULT-TAKEN (AUTH-4,
  spec silent → FLAGGED for JK):** `Workhorse` (75th canonical trait, a staminaModifier pitcher trait, unlisted in any
  VI.2 role list) classified PITCHER → canonical pitcher count 28. **HOST GATE PASSED (host session):** tsc-0 / build-0 /
  full suite 7,441 tests, 7,437 pass / 4 fail (2 characterized + 2 solo-passing order-flakes [`GameTrackerLaunchState` +
  newly-surfaced `EliminationTeamHub`], ZERO new reds); traitRealityScorer 19/19; salaryCalculator + .matrix + salarySeam.t5
  121/121. **Builder=Opus → INDEPENDENTLY audited by Codex 5.5 (decorrelated): VERDICT VERIFIED** — own AST check confirmed
  28/39/7/1=75 with no dupes/missing/extra, no real defect (non-blocking nits: "byte-identical" overstated → math-identical;
  optional combined-basis / non-mutation / dup-array tests). Auto-committed `398533d1`. trackerDb stays **v21** (pure engine,
  no store). WAITING_ON_JK `[ticket:L9b-1]` host-gate line RESOLVED.
  **➡ NEXT = L9b-2** (pure acquisition: `P(gain/lose) = realityPercentile × personalityTilt(§6/VI.3) × morale(L3)`,
  multiplicative spec-fixed shape + gain-high/lose-low hysteresis + no-offsetting-pair + 2-trait-cap displacement;
  PROPOSALS only). The matrix `traitInteractionMatrix.ts` stays FROZEN SMB4-asset data — consume, never regenerate.
- **✅ L5b COMMITTED `5ebb148` (2026-06-17, AUTH-4 host resume) — handoff CLEARED.** The flashpoint-decay accumulator
  (§13 tooth #2 / LS-19) was host-verified (`NODE_ENV= npm run build` exit 0 + full suite **7,298 pass / 2 characterized
  fail**, ZERO new reds — the +18 tests / +3 files = L5b's new test files) and committed (14 code/test files). The prior
  AUTH-4 sandbox build + decorrelated independent audit (VERDICT VERIFIED, 10/10, faithful L6b mirror) stands; the host
  run closed the 2 previously-unobserved gates (full build + full suite). Sandbox junk cleaned + gitignored (Temp/,
  sentinels, probe). L5c followed (committed `8cd2cc1`, below).
- **✅ L5c COMMITTED `8cd2cc1` (2026-06-17, AUTH-4 host resume) — in-season trade-request generation.** Pure §13
  "trade inversions" (LS-19 / LSD-2) engine `tradeRequestGeneration.ts`: scores each player's trade-request propensity
  from team fan morale + loyalty + player-morale + personality + a Juiced/Standard/Nerfed intensity dial. The signature
  mechanic = the §13 235-vs-236 inversion as a SIGNED loyalty term gated on fan sentiment (angry fans → loyal players
  bolt MORE / content fans → loyalty protective; whole thing gated on fan anger, so happy fans → 0 requests). Mirrors
  L5a (pure primitive, no store/flag/wiring) — consumed by L10 event-tap + L13 flashpoint later (those fill L5b's
  `resolveTurnedOnPlayers` seam). **Codex 5.5 built → Opus 4.8 independently audited VERIFIED** (tsc 0 / build 0 / full
  suite **7,307 pass / 2 characterized fail**, ZERO new reds [+9 tests / +1 file]; inversion sign hand-verified both
  directions; pure type-only imports; frozen engines byte-unchanged). Auto-committed (pure engine, no user surface).
  L5d followed (committed `e061e51`, below).
- **✅ L5d COMMITTED `e061e51` (2026-06-17, AUTH-4 host resume) — reporter-intensity tooth → L5 COMPLETE (a–d).** Pure
  §13 line-230 engine `reporterIntensity.ts`: maps team fan morale → a press-heat `NarrativeIntensity` signal (low morale
  = the press turns up the heat). Build-DARK — the live LLM/Supabase reporter (`generateSeasonNewsTake`) is BYTE-UNCHANGED;
  the seam (replacing the hardcoded `intensity:"medium"` at `seasonNewsGenerator.ts:165`) is a deferred post-D13
  activation step. Mirrors L5a/L5c (pure primitive). **Codex 5.5 built → Opus 4.8 independently audited VERIFIED** (tsc 0
  / build 0 / full suite **7,314 pass / 2 characterized fail**, ZERO new reds [+7 tests / +1 file]; live reporter + frozen
  engines byte-unchanged; pure single type-only import; math hand-verified — monotonic + band crossings + clamp).
  Auto-committed. **L5 (fan-morale teeth) COMPLETE: a dampener `428f7cb` · b flashpoint-decay `5ebb148` · c trade-requests
  `8cd2cc1` · d reporter-heat `e061e51`.** L7 (designation effects) followed — SPLIT L7a–d; L7a committed (below).
- **✅ L7a COMMITTED `0a59a24` (2026-06-17, AUTH-4 host resume) — Albatross → L5b flashpoint seam.** L7 ("designations
  Phase-2 completion") is a sub-stack → SPLIT into **L7a** (Albatross→flashpoint seam, DONE) · **L7b** (designation→fame
  nudge, §20.4 Channel C — greenfield) · **L7c** (designation→fan-morale steady sentiment, Channel B/A) · **L7d** (Captain
  router effects + Fan Hopeful cushion + Fan Favorite double-dep). L7a made `resolveTurnedOnPlayers` async + resolves each
  completed game's home+away **active|locked ALBATROSS** holder (via the existing `getFranchiseDesignationRow`), so the
  already-built L5b per-game flashpoint-decay taxes a team's Albatross who stays. **Doubly-dark** — gated by
  `isFranchisePhase2FlashpointEnabled()` (OFF), and even ON it only ACCUMULATES a tax artifact (no live morale mutation).
  NO store/flag/version/backup touch. **Codex 5.5 built → Opus 4.8 independently audited VERIFIED** (tsc 0 / build 0 /
  full suite **7,317 pass / 2 characterized fail**, ZERO new reds [+3 tests, existing file]; flashpoint engine/store/flag +
  trackerDb/backup byte-unchanged; firewall source-scans green; real-designation-store tests; diff hand-verified).
  Auto-committed. L7b followed (committed `77feeda3`, below).
- **✅ L7b COMMITTED `77feeda3` (2026-06-17, AUTH-4 host resume) — designation→fame nudge (pure §20.4 Channel C).** NEW
  pure `src/engines/designationFameNudge.ts`: the one-time fame NAMING seed a player earns when named to a store-backed
  team designation — `computeDesignationFameNudge(type)` + `summarizeDesignationFameNudges(types)` +
  `DESIGNATION_FAME_NUDGE_TUNING` (FF **+2** / Albatross **−1** §20.4-canonical; TEAM_MVP/ACE **+1.5** §16 sim
  placeholders; Captain/Fan Hopeful EXCLUDED — separate entities → L7d). Mirrors L5a/L5d (pure primitive, type-only
  import, no store/flag/wiring). The fame-store WIRING (firing on naming, idempotent once-per-naming into the L6b fame
  records) is a DEFERRED seam — documented, NOT built (it mutates the fame asset + needs idempotency; build-dark).
  **Codex 5.5 built → Opus 4.8 independently audited VERIFIED** (tsc 0 / build 0 / full suite **7,325 pass / 2
  characterized fail**, ZERO new reds [+8 tests / +1 file]; fame + designation engines byte-unchanged; pure single
  type-only import). Auto-committed. L7c followed (committed `886d1dce`, below).
- **✅ L7c COMMITTED `886d1dce` (2026-06-17, AUTH-4 host resume) — designation→fan-morale steady sentiment (§20.6
  Channel B) + the fame-amplifier designation tilt (Channel A).** NEW pure `src/engines/designationFanMorale.ts`:
  `computeDesignationSteadyFanSentiment` (Channel B — Fan Favorite ongoing warmth **+0.5**) +
  `summarizeDesignationSteadyFanSentiment` + `computeDesignationSwingTilt`/`applyDesignationSwingTilt` (Channel A — FF
  ups ×1.25 / Albatross downs ×1.25, merit neutral, sign-preserving), magnitudes in `DESIGNATION_FAN_MORALE_TUNING`.
  **DOUBLE-COUNT GUARD (the headline):** Albatross steady sentiment = **0** (reason → flashpoint) because the §13
  flashpoint-decay (L5b/L7a) ALREADY taxes a held Albatross every game — re-adding it here would double-count; this
  engine's Channel-B contribution is the FF warmth (the positive counterpart the negative-only flashpoint tax doesn't
  cover). Channel A ships the pure tilt MULTIPLIER only (full `base × fame × tilt` needs live fame [dark] + a live
  per-play swing pipeline → post-D13 seam); the Channel-B per-game morale-store wiring is a documented deferred seam
  (mutates the SMB4 morale asset + needs per-game idempotency + HELD-designation enumeration; mirrors L7b deferring its
  fame-store wiring). Mirrors L5a/L7b (pure primitive, single type-only import, no store/flag/wiring). **Codex 5.5 built
  → Opus 4.8 independently audited VERIFIED** (tsc 0 / build 0 / full suite **7,335 pass / 2 characterized fail**, ZERO
  new reds [+10 tests / +1 file]; double-count guard + Channel-A asymmetry + sign-preserving apply verified; 6 frozen
  engines byte-unchanged; pure). Auto-committed. L7d followed — SPLIT L7d-1..3; L7d-1 committed (below).
- **✅ L7d-1 COMMITTED `f61dcae0` (2026-06-17, AUTH-4 host resume) — Team Captain morale-router (pure §4/LS-6).** L7d
  (the last L7 sub-stack) bundles three mechanics → SPLIT: **L7d-1** Captain router (DONE) · **L7d-2** Fan Hopeful
  call-up cushion (pure: window/lift/slump-cushion/expiry, §4:87/LS-7) · **L7d-3** Fan Favorite double-dependency
  reconciliation (FF = D6 value-half [DR-1, live] + L5/§20.6 morale-half [L7b fame nudge + L7c warmth/tilt] — both
  halves already exist; thin). NEW pure `src/engines/captainMoraleRouter.ts`: `computeCaptainCharismaRouting` /
  `applyCaptainCharismaRouting` (Charisma **×2** teammate-morale routing — the spec-CANONICAL "double") +
  `applyCaptainPerformanceSwingAmplification` (sign-preserving team-wide amp of swings tied to the Captain's OWN
  performance, ×1.5 sim placeholder), magnitudes in `CAPTAIN_MORALE_ROUTER_TUNING`. Pure (ZERO imports).
  **ANTI-DOUBLE-COUNT:** routes/amplifies the clubhouse MORALE channel ONLY — NOT the Captain's own ratings/development,
  and NOT the §24.9 leadership-effectiveness composite (→ L13). Matrix wiring deferred post-D13. **Codex 5.5 built →
  Opus 4.8 independently audited VERIFIED** (tsc 0 / build 0 / 9 focused tests green; canonical ×2 + sign-preserving
  swing amp + linear charisma routing hand-verified; 6 frozen engines byte-unchanged; pure). Auto-committed. L7d-2 + L7d-3
  followed (below).
- **✅ L7d-2 COMMITTED `aec5db99` + L7d-3 doc-only → L7 (designation Phase-2 completion) COMPLETE (2026-06-17, AUTH-4).**
  **L7d-2** = NEW pure `src/engines/fanHopefulCushion.ts` (§4/LS-7 Fan Hopeful timed cushion):
  `computeFanHopefulWindowState` (game-count window + measurable expiry) + `computeFanHopefulCallUpLift` (one-time hope
  lift) + `applyFanHopefulSlumpCushion` (reduces NEGATIVE fan-morale swings while active; positives/expired/inactive pass
  through; sign-preserving), magnitudes in `FAN_HOPEFUL_CUSHION_TUNING` (windowGames 10 / fanMoraleLift 3 /
  slumpCushionFactor 0.5 — §16 placeholders). Pure (ZERO imports). Call-up + matrix wiring deferred post-D13. **Codex 5.5
  built → Opus 4.8 independently audited VERIFIED** (tsc 0 / build 0 / 11 focused tests; full suite 7,355 pass / 2
  characterized fail, ZERO new reds; frozen engines byte-unchanged; pure). Auto-committed.
  **L7d-3** = DOC-ONLY reconciliation (AUTH-4 default; NO code): the Fan Favorite double-dependency is already structurally
  COMPLETE — value-half `classifyFanFavorite` (`franchiseDesignationEligibility.ts`, DR-1 `b48b450`) + morale-half
  `designationFameNudge` FF +2 (L7b) + `designationFanMorale` FF +0.5 warmth & up×1.25 tilt (L7c). No new engine (both
  halves exist; morale-half is dark with deferred wiring; a composer would repeat the orphan DR-1 just deleted).
  **⇒ L7 COMPLETE: L7a `0a59a24` · L7b `77feeda3` · L7c `886d1dce` · L7d-1 `f61dcae0` · L7d-2 `aec5db99` · L7d-3 doc.**
  **L8 (ratings dev) DEPENDS on L2** (the mutable ratings-overlay layer, greenfield) → L2 lands first (SPLIT L2a..c).
- **✅ L2a COMMITTED `6fdeba11` (2026-06-18, AUTH-4 overnight) — dark `franchiseRatingsOverlays` store (§11 / L2; the
  persistence half of the franchise-instance mutable layer).** L2 SPLIT: **L2a** dark store (DONE) · **L2b** read-path
  merge + temporary absolute-trigger auto-expiry (re-evaluated on load) · **L2c** two-tier confirmation infra (console+DB;
  ratings/trait changes confirm, morale stays silent). NEW `src/utils/franchiseRatingsOverlayStorage.ts` (mirrors L5b
  flashpoint storage): the store (keyPath `id`; `by_scope` + `by_player` indexes) holds per-entry overlays over the FROZEN
  base ratings — permanent + temporary (`expiresAtGameNumber`), with confirmationStatus/source/sourceEventId/caller-
  supplied createdAt. trackerDb **v20→v21**; 3-place backup parity (`optional:true` + syncConfig `'id'`),
  KBL_BACKUP_VERSION stays **2**. **DARK/EMPTY** — no production writer/reader (L2b/L2c/L8/L9b wire it); oracle stays
  locked. **Codex 5.5 built → Opus 4.8 independently audited VERIFIED (hardest — persistence class)** (tsc 0 / build 0 /
  full suite 7,363 pass / 2 characterized fail, ZERO new reds; **v20→v21 migration-survival + backup round-trip parity +
  DARK + byte-unchanged-oracle + KBL_BACKUP_VERSION-2 all PROVEN**). Auto-committed; persistence → browser-pending
  (migration + round-trip prioritized, scenario #16). L2b followed (below).
- **✅ L2b COMMITTED `e8ec0908` (2026-06-18, AUTH-4 overnight) — ratings-overlay MERGE engine (pure read-path math; §11/L2).**
  NEW pure `src/engines/ratingsOverlayMerge.ts`: `resolveActiveOverlayDeltas` (net delta/ratingKey from CONFIRMED + active
  overlays — pending excluded per §11 two-tier; temporary active iff `currentGameNumber < expiresAtGameNumber`) +
  `mergeRatingsOverlays` (effective = frozen base + deltas, only for keys in base via hasOwnProperty guard; base NEVER
  mutated — oracle locked; returns a copy) + `selectExpiredTemporaryOverlays` (expired-temporary ids for the deferred
  on-load cleanup). Single type-only import; live wiring into value/designation/morale read paths DEFERRED (pointless
  with the empty L2a store + touches live consumers). **Codex 5.5 built → Opus 4.8 independently audited VERIFIED**
  (tsc 0 / build 0 / full suite 7,374 pass / 2 characterized fail, ZERO new reds; filters/base-immutability/expiry-id
  hand-verified; pure; frozen engines byte-unchanged). Auto-committed. L2c followed (below).
- **✅ L2c COMMITTED `a77e0ed5` (2026-06-18, AUTH-4 overnight) — §11 two-tier confirmation infra → L2 COMPLETE.** NEW
  pure `src/engines/ratingsOverlayConfirmation.ts`: `buildOverlayConfirmationRequest` (SMB4-console edit instruction +
  resulting rating) + `confirmOverlay` (`pending`→`confirmed`, idempotent + non-mutating; store put deferred) +
  `buildExpiryRevertReminder` (temporary console-revert text) + `summarizeOverlayChangeLog` (deterministic per-team
  change log, DSTACK L8). Morale excluded (auto/logged §11:202); traits (L9b) reuse the pattern; live confirm UI/flow
  deferred post-D13. **Codex 5.5 built → Opus 4.8 independently audited VERIFIED** (tsc 0 / build 0 / full suite 7,384
  pass / 2 characterized fail, ZERO new reds; pure; frozen engines byte-unchanged). Auto-committed.
  **⇒ L2 (franchise-instance mutable ratings-overlay layer) COMPLETE: L2a `6fdeba11` · L2b `e8ec0908` · L2c `a77e0ed5`.**
- **✅ L8 COMPLETE (ratings development — the first real WRITER through L2): L8a `cfdd7752` + L8b `cd9e4589`.** L8a =
  pure `src/engines/ratingsDevelopment.ts` (rawDelta = on-field performance × player-morale alignment → the L5a §8
  `fanMoraleDampener` CONSUMED [personality + Ambition/Resilience + Loyalty all live inside it → no double-count] →
  0-99 integer clamp → deterministic earned-magnitude shift gate; all magnitudes in `RATINGS_DEVELOPMENT_TUNING`). L8b =
  default-OFF `isFranchisePhase2CheckpointEnabled` flag + `src/utils/franchiseCheckpointSweepCompute.ts` + a flag-gated
  dark hook in processCompletedGame (after the flashpoint gate): at each deterministic 20%-of-season boundary (fires 5×/
  season) sweeps the MLB roster (perf signal = `valueDelta` ÷ 200000; team fan morale `?? 50` dark-safe) and writes one
  `pending`+`permanent` ratings overlay per shifter through `putFranchiseRatingsOverlay` (deterministic idempotent id;
  checkpoints stack). **Doubly-dark** (flag OFF + `pending` overlays inert in the merge until a post-D13 confirm UI); NO
  new store / trackerDb stays **v21**. Both Codex-built → Opus-independently-audited VERIFIED (tsc/build 0; suite 7,401
  then 7,410 pass / 2 characterized fail, zero new reds; frozen engines/store byte-unchanged). L8b = live game path +
  overlay writes → **browser-pending** (scenario #17). **OPEN DECISION logged for JK** (`AUTONOMOUS_RUN_LOG.md`): the
  L5a dampener weights a cold-team counter-trend-UP gain by AMBITION as MORE-brake vs §6:111's "upside gas pedal" framing
  — L8 consumes L5a as-built (L5 owns the §8 primitive); flagged, not relitigated.
- **✅ L9a — net-new reality CAPTURE layer (§9 / OD-5 / TS-1..13) — effectively COMPLETE** (L9a-1 `e28706e9` pitch-location
  + L9a-3 `32244393` handedness join + L9a-4 `acce899c` OF-arm tally/injury derive-on-read; **L9a-2 SET ASIDE for JK** —
  the per-pitch count UX fork). All three built additive (no version bump), each verified-to-persist, Codex-built →
  Opus-independently-audited VERIFIED. **➡ NEXT (fresh session resumes here): L9b — the trait-from-reality ENGINE** (the
  "game-changer feature"; built on `traitInteractionMatrix.ts`; consumes ALL the L9a captures): log-reconstructed
  activation context + a peer-relative strength/percentile scorer (rides Adaptive Standards) + P(gain/lose) acquisition
  = reality-percentile × personality × morale + the grant/write-back (2-trait cap, hysteresis, no-offsetting-pair,
  role-eligibility VI.2, the min-sample valve). DSTACK L9b line 84; Cert VI.5; deps L9a ✓ / L2 ✓ / L3 ✓ / L1 ✓. **RECON DONE (wf_8a9e7769-576, 5 readers) — full
  scope + the split + key gotchas in `AUTONOMOUS_RUN_LOG.md` (the 2026-06-18 "L9b RECON DONE" entry).** SPLIT: **L9b-1**
  scorer (PURE — lift `getPercentile`→`src/engines/percentile.ts`, role peer-pools VI.2, scale via `scaledThreshold`;
  build FIRST, lowest risk — **✅ BUILT 2026-06-18, host-gate queued, see the RIGHT-NOW top entry**) → **L9b-2** acquisition (PURE — `P=percentile×personality×morale` + min-sample valve +
  hysteresis + no-offsetting-pair + role-eligibility) → **L9b-3** grant/write-back (PERSISTENCE — L8b-pattern dark hook +
  context reconstructor + PENDING trait rows + §11 trait-confirm → writes `trait1`/`trait2` 2-slot displacement via
  `saveFranchisePlayer`; **L9b is the FIRST trait writer**; audit HARDEST). The matrix is FROZEN SMB4-asset data
  (consume, never regenerate). **JK FORK (non-blocking, default=REUSE):** trait write-back store — reuse
  `franchiseRatingsOverlays` (no version bump) vs new `franchiseTraitOverlays` (v21→v22 + pin) — in `WAITING_ON_JK.md`.
  **➡ FRESH THREAD: contract + build L9b-1 first.** Build-DARK, activate post-D13.
  *(Historical L9a detail below for the arc trail.)* Per the JK ruling
  (OD-5, DECISIONS_LOG 2026-06-17): **manual/opt-in, never forced, used when data present** → **REQUIRES optional
  GameTracker zone inputs for pitch/hit location** + a **cumulative season injury tally**. Net-new captures per
  `TRAIT_SIGNAL_CERTIFICATION.md` (TS-1..13): pitch-ZONE, OF-extra-base-credit (arm), the injury accumulator; everything
  else reuses existing fields. This is the capture substrate L9b (the trait engine) consumes. **Build stays WATCHED**
  (live GameTracker path → browser-pending). **The full L9a scope — recommended SPLIT L9a-1..4, the DEFAULT-TAKEN forks
  (pitch-zone = coarse strike-zone enum; injury tally = derive-on-read, no new store), and every file:line anchor — is in
  `AUTONOMOUS_RUN_LOG.md` (the 2026-06-18 "L9a RECON DONE" entry). **✅ L9a-1 DONE `e28706e9`** (optional
  `enrichment.pitchLocation` strike-zone capture — additive, no version bump, verified-to-persist; EnrichmentPanel grid →
  browser-pending #18). **⏸ L9a-2 SET ASIDE for JK** (recon wf_e3ff7176-528: the per-AB ball/strike count is VESTIGIAL —
  `advanceCount` 0 callers, never displayed, lone caller is dead code — so making it real needs a NEW per-pitch GameTracker
  input UX = HIGH user-intensity, which tensions the `kbl-detection-philosophy` "non-user-intensive" principle + OD-5A;
  a genuine product/UX fork beyond AUTH-4's bounded-rework envelope → `WAITING_ON_JK.md` + the run-log OPEN DECISION; the
  persist seam [`finalBalls/finalStrikes` on `AtBatEvent` via `buildContextSnapshot:4005`] is ready for when JK rules;
  Captain's lean = option (b) a low-intensity post-play "final count" on the EnrichmentPanel). **✅ L9a-3 DONE `32244393`**
  (handedness join, TS-4: `batterContext`/`pitcherContext.handedness` + `matchupContext.platoonAdvantage` now persist on
  each AtBatEvent — threaded via a `handednessByIdRef` from the full rosters; no UI/field/store/version; happy-path,
  refresh-edge documented-graceful → browser-pending #19). **✅ L9a-4 DONE `acce899c`** (the last L9a build piece): OF
  extra-base-credit per-player SEASON tally (per-play `heldByOf`/`baseSaved` exist on FieldingEvent/EnrichmentPanel; add
  ≤1 new field on PlayerSeasonFielding + wire in seasonAggregator — **if it touches a versioned trackerDb store, the
  `franchiseSeasonLedgerStorage.test.ts` store-list PIN is in scope** [MEMORY: broke a prior L6b dispatch]) + injury
  accumulator (DEFAULT-TAKEN: DERIVE-ON-READ from the persisted injury `BetweenPlayEvent`s — `comebackerInjuries` season
  field exists `seasonStorage.ts:99` but has ZERO live writers — no new store). **L9a-2 remains SET ASIDE for JK**
  (per-pitch count UX fork). Recon: wf_f3e99cd3-8a8. Deps: L8 ✓ / L1 ✓. After L9a → **L9b**
  traits → **L10** random events →
  **L11** managers → **L12** races/All-Star/awards-fame → **L13** relationships → **L14** rebrand → the **L-SIM gate**.
  (SET ASIDE remains: **L-ECON1** frozen draft-IV oracle + **F-144**.)
- **ATTENDED DESIGN SESSION (2026-06-17, JK present) — forks cleared + designation model reconciled; D10 build next.**
  No product code yet this session. (1) **OD-2..5 + D4 RULED** (DECISIONS_LOG 2026-06-17): OD-2 economy scale =
  new-league-construction-only / reuse pick-chart with farm anchor nerfed one grade-step via `FARM_NERF_SCALES` /
  scale raw IVs pre-chart (oracle untouched; build safety-walled); corrected a Captain conflation — **IV (ratings→
  salary) ≠ TV (performance/WAR)**, OD-2 never touches TV. OD-3 async/plain-text/game-count/season-scoped. OD-4
  cascade + manager/reporter on team-edit page, **scouts drafted front-loaded before the 22-man** (cosmetic draft-
  guide attribution), reflected on team page. OD-5 manual/opt-in + **requires optional GameTracker zone inputs** +
  cumulative injury tally. D4 moot post-D6 → folded into D11. (2) **DESIG-RECON RULED** (DECISIONS_LOG 2026-06-17):
  the full v1 team-designation set is **SIX per team, ALL in v1** (LSD-6) — Team MVP, Ace, **Albatross** (spec guards
  restored: ≥2× salary + materially-overpaid + value-trusted, can be null), **Fan Favorite** (PROMOTED to live, NO
  salary floor — underpaid-overperformer logic), **Captain** (live badge, Loyalty+Charisma NO minimum, reveal-safety
  cleared, L1.5 charisma≥70 gate removed), **Fan Hopeful** (BUILD visible-safe = random from top-3 by scouted grade).
  Cornerstone fully CUT. ≥2-peer = a TV-trust reliability gate (NOT a league comparison; Albatross confirmed correct/
  intra-team as-built — no bug). Designation EFFECTS (fame/morale) stay dormant until the Phase-2 morale layer (still
  v1). Albatross 15% trade discount = dormant/deferred (no AI-trade consumer in v1). (3) **D10 COMMITTED `51e487a`**
  (Codex-built → Opus-audited VERIFIED: tsc 0 / build 0 / suite 7,289 pass / 3 characterized fail, zero new reds;
  USER-VISIBLE → browser-pending, scenario #12) — re-scoped to LEAGUE awards only: AwardsWatchlist mounted inline on
  the SeasonSummary page + manifest active-designation canonical-source fix + de-"no-awards" copy + pass5/wave4 tests;
  summary.awards stays placeholder, no contractVersion bump, no flag flip; team designations NOT shown here.
  **NEXT = the DESIG-RECON build ticket** (Albatross guards / FF promote no-floor / Captain badge no-min / Fan Hopeful
  visible-safe / Cornerstone removal / spec reconciliation to MODE_2_V1_FINAL §17 + the year-end team-designation
  display on the **TEAM HUB**). Maps: `wf_4e882441-17c` (D10) + `wf_a7edf687-814` (designations).
  (4) **DESIG-RECON BUILD — COMPLETE** (split via `wf_9ea0e360-d00` into DR-1..4; all committed, every code diff
  Codex-built → Opus-audited VERIFIED): **DR-1 `b48b450`** (Albatross spec-guards + FF promote-to-live + Cornerstone
  removal + orphan delete; characterized set 3→2). **DR-2 `9d1db40`** (Captain charisma≥70 removal + Fan Hopeful
  visible-safe season-start assignment to `team.fanHopefulPlayerId`; visible-safe PROVEN by test). **DR-3 `bd6b43c`**
  (team-hub six-designation strip under the 'team' tab — display-only, USER-VISIBLE → browser-batch scenario #13).
  **DR-4** (docs-only spec reconciliation to MODE_2_V1_FINAL §17 — banners + stale-line fixes across DYNAMIC_
  DESIGNATIONS / FAN_FAVORITE_SYSTEM / PERSONALITY_SYSTEM). **All six team designations now live in v1**
  (Captain/MVP/Ace/Fan Favorite/Albatross/Fan Hopeful), effects dormant until the Phase-2 morale layer. Suite
  7,243 pass / 2 characterized fail.
- **OVERNIGHT CONTINUATION (2026-06-17, AUTH-4) — 3 more feature commits, D7 COMPLETE:** `6559a19` **D6b**
  (season-end FREEZE of the trusted-value artifact: frozen-flag + idempotent freeze helper + a Layer-A anti-thaw
  guard in the sole writer + a Layer-B recompute early-return that locks BOTH the artifact and the
  `franchiseTrueValueRows` numbers; freeze triggered at season-complete via `checkSeasonComplete` AND the
  `isSeasonOver` effect; mutation-proven) · `abfa167` **D7a** (reconcile the dual designation path → persisted store
  canonical: TEAM_MVP/ACE promoted 'projected'→'active' ONLY when the eligibility path marks the exact holder active;
  live non-'Proj.' badge; ephemeral changed-only `DesignationEvent` with the morale/fame firewall intact) · `013d886`
  **D7b** (Albatross live + **closed the untrusted-value LEAK** — the canonical selection now filters to the D6
  per-player ≥2-peer trusted set, so an untrusted worst-value player is never branded Albatross; mutation-proven; -1
  fame stays dormant; Fan Favorite stays projected/morale-gated). **+ `14c90fd` D8** (award-trust GATE: the literal-false
  `trustedForAwards`/`finalWarTrusted`/`consumerThresholdsProven` promoted to COMPUTED off the D6 FROZEN artifact —
  award trust requires `artifact.frozen===true` [a deliberate tightening vs D7, since awards are season-end
  finalizations]; new `franchiseAwardTrust.ts` adaptive qualifier helper via scaledThreshold; written
  `AWARD_TRUST_CONTRACT.md`; D8 is the GATE only — the engine/storage/UI/winners are D9). Frozen-gate mutation-proven.
  Suite **7,263 pass / 3 characterized fail** throughout; trackerDb stayed **v17** for D6b/D7/D8 (no store).
  **+ `53ffd4c` D9a** (D9 SPLIT into D9a/b/c/d; D9a = the pure dark-store persistence diff — D6a precedent): 2 NEW
  IndexedDB stores at **trackerDb v17→v18** — `franchiseAwardsRows` (LSD-1 fame seams baked in: candidate margins /
  fWAR-total split / nullable voteWeight / reserved KK-Bust-Comeback) + `franchiseTrueValueSnapshots` (per-game trough
  history) — with the FULL backup-parity lockstep (register both byte-mirrored + pin 18 + optional:true, KBL_BACKUP_
  VERSION stays 2) + round-trip + the proven pin-trap test updated. Stores are DARK (no engine writers — D9b/c/d).
  Suite **7,271 pass / 3 characterized fail (7,274 total, 403 files)** at D9a. **+ `9fa540d` D9b** (the 5 WAR-category
  awards ENGINE, additive/dark — D9d wires it): pure `computeFranchiseWarAwards` (MVP=totalWar / Cy Young=pWAR /
  RoY=top totalWar∩rookies / Gold Glove=fWAR+split seam / Silver Slugger=bWAR) off the D6 FROZEN artifact + D8 gate +
  adaptive qualifiers; deterministic (mutation-kill proven: untrusted 99-WAR row can't win; qualifier scales with
  season length); `computeAndPersistFranchiseWarAwards` writes the D9a store finalized:true. Never recomputes TV.
  Suite **7,277 pass / 3 characterized fail (7,280 total, 404 files)** at D9b. **+ `443c86c` D9c** (Manager of the
  Year → the **6-category awards engine is COMPLETE**): MANAGER_OF_YEAR = a season aggregation of the live per-game
  pogAwards manager composite + the wins-above-D6-expectation record term (expected = frozen value-share ×
  gamesPerTeam, derived ONLY from the frozen artifact — no trusted expected-wins source exists), pool-normalized;
  folded into `computeAndPersistFranchiseWarAwards` (one finalize, all 6); additive nullable
  managerActualWins/ExpectedWins (no store/version bump). Record-term determinism mutation-proven; mwar retirement
  deferred (safe). Suite **7,281 pass / 3 characterized fail (7,284 total)** at D9c. **+ `d814c52` D9d-1** (D9d split
  D9d-1 wiring / D9d-2 UI): the season-end finalize TRIGGER calls `computeAndPersistFranchiseWarAwards` after the D6b
  freeze on BOTH season-complete paths (awaited in checkSeasonComplete; `.then`-chained on the isSeasonOver effect;
  computedAt=frozenAt byte-stable) + the game-1 `franchiseTrueValueSnapshots` capture on `processCompletedGame`
  (deterministic checkpoint = scheduled gameNumber ?? gameId, idempotent, own try/catch, regular-season-only — LIVE
  GAME PATH → browser-batch). Suite **7,285 pass / 3 characterized fail (7,288 total, 405 files)** at D9d-1.
  **+ `c229733` D9d-2** (the awards UI → **D9 COMPLETE**): NEW `AwardsWatchlist.tsx` — a Mode-2 regular+playoff tab in
  FranchiseHome (gated `seasonPhase !== "offseason"`, SEPARATE from the dead-gated offseason ceremony, NO flag flip),
  read-only, rendering the 6 categories + winner + candidate margins (finalized rows when present, else the in-season
  PREVIEW) + a pure read-only `computeFranchiseAwardsPreview` (looser `warLikePreviewAvailable` gate, `finalized:false`,
  NEVER persisted; the frozen-gated finalize path byte-unchanged) + the manifest flip (awards-watchlists blocked→included
  + `awardsImplemented`, GATED on finalized rows existing, contractVersion bumped → `…-v2-awards-manifest-v1`, wave4 pin
  updated as a sanctioned baseline shift + a new blocked-when-absent case). USER-VISIBLE → browser-batch. Independently
  re-audited (tsc 0 / build 0 / FULL suite **7,288 pass / 3 characterized fail (7,291 total, 406 files)**, zero new
  reds). **D9 COMPLETE — SESSION ENDED (JK-directed close); NEXT = D10.**
- **AUTONOMOUS BUILD RUN COMPLETE (2026-06-16) — 7 feature commits + D5 confirm on `codex/franchise-v1-next`
  (nothing pushed); every diff Codex-built → Opus-audited independently (tsc/tests re-run, substance read,
  invariants grep'd).** In order: `d48ab3c` **L1** (hidden-modifier rename + typed on Player) · `752882f` **D1**
  (WAR-scaling 162 de-dup, zero behavior change) · `2fab709` **D2** (backup parity + structural parity-guard —
  silent-drop defect closed) · `2f4f3e5` **L1.5+OD-1** (backfill the 4 hidden modifiers for ALL franchise players
  at init [MLB players had none — OD-1 ruled: generate at init] + assign Team Captains; 54 tests; browser-confirmed
  in the real runtime) · `0cf4ca2` **L4a-connect** (franchise reporter wired to live GameStory; browser-pending,
  Supabase) · `8074976` **L4a-bus** (the SEA-1 season-narrative publish-bus core; build-dark; §5-firewall-correct)
  · `4a1bd36` **D6a** (the make-or-break True-Value TRUST gate, LIVE half: peer-pool audit ≥2 hard-block + the
  trusted-value artifact + the 4 flag-flips to computed; RIGOROUSLY audited — oracle untouched, real no-leak
  boundary test, parity-guard green). **D5 CONFIRMED** (TEAM_MVP/ACE trust engine, 51 tests). **D6 ruled:
  SEASON-END FREEZE** (D6a = live half; D6b adds the freeze).
- **⏰ OVERNIGHT MODE AUTHORIZED (AUTH-4, JK 2026-06-16) — a fresh thread should KEEP ROLLING, no stoppages.**
  Per `AUTONOMOUS_RUN_PROTOCOL.md` AUTH-4: the Captain makes **every** call — engineering AND spec-bounded DESIGN
  (incl. the soul-layer engines + value-design forks) — by building to the ratified spec + rulings, taking a
  **documented conservative default** where the spec is silent, and **continuing**. This SUPERSEDES the per-change
  SMB4-Asset gate + the "build to spec" greenlight. The run **never stops for JK**; the only pause is
  **SET-ASIDE-AND-CONTINUE** on a genuine safety wall (oracle/data-corruption/runaway/unresolvable-regression),
  after which the loop moves to the next ticket. Everything → `AUTONOMOUS_RUN_LOG.md` for JK's morning review;
  rework is the accepted cost of momentum. **A fresh thread: do the session-start reads, RESTATE the state, and
  PROCEED IMMEDIATELY — do NOT wait for JK's start-of-session confirmation (JK is unattended overnight; AUTH-4 is
  the standing "go"). Start at D10 and keep dispatching the Queue** (`AUTONOMOUS_RUN_PROTOCOL.md`) until it is
  exhausted or everything left is set-aside on a safety wall. (D6b/D7a/D7b/D8/D9a/D9b/D9c/D9d-1/D9d-2 all committed this
  run — **D9 COMPLETE** — see the OVERNIGHT CONTINUATION bullet above + `AUTONOMOUS_RUN_LOG.md`.)
- **NEXT (fresh session resumes here):** **D10 — Mode-2 season-summary / manifest HANDOFF finalize** (supersedes the
  no-awards 1.10A stopgap): finalize the Mode-2 season summary + manifest now WITH awards (D9 just landed
  `AwardsWatchlist` + the gated manifest flip) AND active designations (D7). Touch the SeasonSummary PAGE copy (D9d-2
  deliberately did NOT — that was reserved for D10). Depends on D2, D7, D9 (all done). Then **D11** (UI live-label
  sweep — strip residual preview/READ-ONLY vocabulary across salary / True Value / designations / awards) → **D12**
  (full Phase-1 manual smoke on real local franchise state, iPad) → **D13** (Playable-V1 internal checkpoint) → the
  **soul layer** (L3 morale matrix → L6 fame → L7 effects → L8/L9b development → L10–L14 → the L-SIM gate; L2 lands
  with its first consumer). Take the **OD-3/4/5** leans + continue. **Tracked D9 FOLLOW-UPS** (logged in the run log):
  per-player profile/Almanac award display (PlayerInstanceCard / almanac); the `mwarCalculator`/`calculateMOYVotes`
  retirement (pre-flag-flip cleanup — re-point AwardsCeremonyFlow:1620 + RatingsAdjustmentFlow:388 BEFORE any flag
  flip). **SET ASIDE (the one safety wall): L-ECON1** (re-prices the frozen draft-IV anchor → oracle touch) + F-144.
  The **D4** scope snag: take the conservative call or leave for the browser session — either, just log it.
  → **D10–D13** → then the
  **soul layer** (L3 morale matrix → L6 fame → L7 effects → L8/L9b development → L10–L14 → the L-SIM gate; L2 lands
  with its first consumer). Take the **OD-3/4/5** leans + continue. **SET ASIDE (the one safety wall): L-ECON1**
  (re-prices the frozen draft-IV anchor → oracle touch) + F-144. The **D4** scope snag: take the conservative call
  or leave for the browser session — either, just log it.
- **PHASE-2 "L-STACK" SEQUENCING DRAFTED + FORKS RULED (2026-06-16; design + docs only, NO product code):**
  `FRANCHISE_V1_LIVING_SEASON_DSTACK.md` (Status: PROPOSED) sequences the living-season spec §5–§24 into
  dependency-ordered tickets **L1–L14 + L-SIM + an economy track**, hardened by a 12-agent decorrelated
  workflow (`wf_b5734e06-e2c`: 7 grounding code-readers + 5 adversarial ordering critics, ~1.26M tokens).
  Audit-forced corrections folded in: **MOY → Phase-1 D9** (not a Phase-2 ticket; MOY-4 bars manager fame);
  **new L1.5** Captain Mode-1-handoff (BLOCKER gap — unbuilt in both stacks); **L1** is a real build (hidden
  modifiers generated mis-named + un-persisted); **L4a/L9a hoisted to Tier 0**; **DSF-1 coupled to the value/IV
  spine** (re-prices the frozen draft-IV anchor → land before the salary freeze); **backup-parity escalated**
  (D2 guard covers only `kbl-tracker`; export/restore orphaned + stale-pin restore destroys newer stores);
  **floating TV built but no trough history** → new `franchiseTrueValueSnapshots` store from game 1. **Rule:
  BUILD Phase-2 dark in parallel with the late D-stack, ACTIVATE strictly after D13** (§5 no-phantom-morale +
  D12 gate). **Five forks RULED by JK (LSD-1..5, DECISIONS_LOG):** LSD-1 D9 fame-ready seam checklist ratified
  (build the award engine ONCE, fame hooks empty, L12 fills them); LSD-2 FA-attraction → v1.1 (keep only
  in-season trade-requests in L5); LSD-3 Cornerstone CUT; LSD-4 budget pressure CUT; LSD-5 stadium change =
  pick from the existing SMB pool (pull dimensions/name/park-factors). **+ LSD-6 (JK ruling B, 2026-06-16): the
  living season IS part of v1** — v1 = D-stack + L-stack + the L-SIM gate (one release); D0's "Playable-V1" (D13)
  is an INTERNAL Phase-1 checkpoint, not the v1 release; the soul layer is v1-Phase-2 (NOT v1.1); only the
  offseason + the 3 LSD cuts stay post-v1. D0 reconciled for (B) (D9 now carries the LSD-1 seams + MOY-1..7).
  **NEXT:** D0 ratification (now clean to ratify), then contract the Tier-0 opener **L1** (personality/modifier
  substrate). Structure signed off (JK "move forward as recommended").
- **§18 VERIFICATION READS — 4 of 4 COMPLETE (2026-06-16; reads + design + docs only, NO product code):**
  (1) **reporter** → `REPORTER_CERTIFICATION.md` + **REP-1..4** (in-game cadence = POST-GAME COLUMNS ONLY, live
  GameStory canonical, franchiseId-keyed, accuracy model built in §24) + **SEA-1..5** (season-long narrative = a
  sim-tunable "PUBLISH BUS" built EARLY in Phase-2; most beats gated on their unbuilt Phase-2 event source);
  (2) **traits-from-reality (§9)** → `TRAIT_SIGNAL_CERTIFICATION.md` + **TS-1..13** (acquisition = reality-percentile
  × personality × morale, min-sample valve = Franchise-lite toggle, role-eligibility 25 pitcher / 39 position / 7
  universal / 1 cut [Sign Stealer], four personality "image" axes; net-new capture = pitch-ZONE + OF-extra-base-credit
  + injury accumulator, rest reuses existing fields; §9 engine builds on `traitInteractionMatrix`);
  (3) **draft/salary/farm (§18.3)** → `DRAFT_SALARY_FARM_CERTIFICATION.md` + **DSF-1..4** (UNIFY rookie+farm on a
  tier-scaled RELATIVE-TO-POOL scale via the orphaned `TIER_SHIFTS`; tradeable asset = DRAFT PICKS; `farmGradeMode`
  multiplicative skew; in-season annual draft DEFERRED post-v1). All design rulings in `DECISIONS_LOG.md` (2026-06-16
  entries); (4) **Manager-WPA / MOY (§18(4) + AWARD-7)** → `MANAGER_WPA_MOY_CERTIFICATION.md` + **MOY-1..7**
  (input set = 4 [decision-WPA + DEPLOYMENT-WPA + lineup-delta + team record — deployment was a SILENT 4th term, record
  was NOT in the live sum]; lineup-quantity DEFERRED to build [capped realized record vs orphaned T10
  `lineupDeltaWpaStandard`]; record = EXPECTATION-RELATIVE on the D6 trusted artifact → MOY HARD-couples to D6; NO fame
  tilt v1; build = season aggregation of the LIVE `pogAwards` `best_manager` composite into a NEW
  `franchiseAwardsEngine`/`Storage`, retiring the dead-gated salary `mwarCalculator`/`calculateMOYVotes`; POOL-RELATIVE
  normalization dissolves the denomination; weights → Sim Gate). **All four §18 prerequisite reads DONE.**
- **Phase:** **T-STACK COMPLETE** (T4→T10 all built / audited CONFORMS / committed) +
  **LIVING-SEASON (PHASE-2) DESIGN COMPLETE** (`FRANCHISE_V1_LIVING_SEASON_SPEC.md`, §0-24, locked
  this session). TWO SEQUENCED LAYERS now exist: **Phase-1 = the D-stack** (value-spine LIVE + real
  awards on trusted value — the SOUL-LAYER-EXCLUDED cut line in `FRANCHISE_PLAYABLE_V1_DEFINITION.md`,
  still PROPOSED/pending-ratification); **Phase-2 = the living-season spec** (morale / development /
  fame / the morale-gated designations / races / relationships / rebrand — exactly what the D0 doc's
  D6/D7 explicitly deferred). Per F-141 the D-stack (D1-D13) still ships FIRST; Phase-2 layers on top.
- **Last completed:** **T10 — Lineup Delta WPA standard + per-season constants snapshot** (commit `5010126`).
  Codex 5.5 BUILT → Opus 4.8 audit **CONFORMS** → **JK APPROVED** (persistence / saved-data-shape; not
  auto-committed). §9 standard = the PURE projected-vs-projected scalar `ManagerLineupDeltaSummary.
  lineupDeltaWpaStandard` (= `summarizeLineupSnapshotComparison`'s `projectedOpportunityCostTotal` =
  `chosen.projectedTeamLineupKblWpa − optimal.projectedTeamLineupKblWpa`), derived at game-end for BOTH
  managers, persisted ADDITIVE as a sibling of `managerLineupDeltas`. The pre-existing realized-vs-projected
  `managerWpa` is BYTE-UNCHANGED and the new scalar is NOT folded into the `managerValue` rollup (regression-
  guard test proves no double-count). §12 snapshot = a full-dependency FNV-1a content hash (NEW
  `src/engines/optimizerConstantsSnapshot.ts`; optimizer subset of `rosterEngineConstants` + `ivCurves` +
  `traitPricing` + `traitInteractionMatrix`; `tierParams` EXCLUDED) stamped write-once on `SeasonMetadata`
  (NO DB bump; warn-once on mid-season drift; travels in backup). "WPA" documented as rescaled IV per D9
  (§9 spec note added; field rename → v2). Independently re-verified: tsc 0 / build 0 / suite 7,230 (only the
  3 characterized fails) / `wpaRuntimeBoundary` unchanged (camelCase clears the pattern → ZERO allowlist
  edits) / optimizer engines + data files BYTE-UNCHANGED / orphan trace RESOLVED. BROWSER-PENDING
  (persistence-prioritized). LOW: micro-inefficiency (summary stamps `version` via a full hash recompute —
  cleanup); pre-existing `backupRestore.ts` v12 staleness surfaced as a SEPARATE backup-hardening ticket
  (T10 avoided a new store → does NOT inherit it). Map: `T10_SCOPE_MAP.md`.
- **Prior (committed) this arc:** **T9b — GameTracker sub-rec integration** (commit `93763ee`). Codex 5.5 BUILT →
  Opus 4.8 audit **CONFORMS** → **JK APPROVED** (user-visible + GameTracker-state, not auto-committed).
  Wired T9a `recommendSubs` into the live in-game rec surface: the 3 generators in
  `managerWpaRecommendations.ts` rebuilt onto the engine (adapters → EffectiveRatingsPlayer + PlayerState +
  live GameContext incl. opposing player); the `GameTracker.tsx` rec useMemo mapping widened to feed full
  ratings/traits/hands/positions/mojo (`getMojoForPlayer`, 6-level normalize)/fitness/pitchCount/count/
  bases/opposing player (the data was already in live state, just stripped). **PURE IV-delta firing gate**
  (JK ruling) — situational heuristics removed (no leverage floor / batting-order gate / pitcher meltdown
  triggers); fires IFF best per-type delta > `SUB_REC_THRESHOLD`. `PRESSURE_LEVERAGE_BANDS {high 1.5,
  extreme 3.0}` added. ManagerRecommendation output + watch/decision plumbing + NewsBoard UI UNCHANGED.
  Independently re-verified: tsc 0 / build 0 / suite 7,220 (only the 3 characterized fails;
  `wpaRuntimeBoundary` unchanged) / orphan trace RESOLVED (traits/mojo/fitness/opposing-player flow UI→
  engine) / T9a engine + rosterAnalyzer + ivEngine BYTE-UNCHANGED. **→ T9 COMPLETE.** BROWSER-PENDING.
  (T9a `ef85c80` + T8d-1/2/3 + T8a/b/c + T6/T7-stack — all CONFORMS — COMMITTED.) LOW findings: vestigial
  unused input fields (cleanup candidate); global `kbl-gotchas.md` says 5-level mojo but code is 6-level
  (stale doc — fix when convenient).
- **T9a — Pure in-game sub-recommendation engine** (commit `ef85c80`). Codex 5.5
  BUILT → Opus 4.8 audit **CONFORMS** → COMMITTED (pure engine, no user-visible surface → standing
  auto-commit). NEW `src/engines/subRecommendations.ts` (`recommendSubs`): scores eligible subs vs the
  current player on **IV-of-effectiveRatings** (`computeIV(effectiveRatings(...)).kblIV`, the same recipe +
  byte-identical clamp as `rosterAnalyzer.ts:546-571` — "one truth, three surfaces"), recommends when the
  per-type delta > `SUB_REC_THRESHOLD` {pinch_hit 5k / defensive 7.5k / pitcher_change 12k, CALIBRATE}.
  Role-misuse mojo down-shift for pitcher changes; DefensivePlacementRisk folded into the delta for
  defensive subs; justification strings (mojo/fitness/trait activations/standoffs/fatigue/IV). ADDITIVE to
  `effectiveRatings.ts` (export the 7 shapes + new `activeTraitNames`; no behavior change). Independently
  re-verified: tsc 0 / build 0 / suite 7,217 (only the 3 characterized fails) / rosterAnalyzer + ivEngine +
  managerWpa + GameTracker BYTE-UNCHANGED. **T9 mapped (4-agent fan-out → `T9_SCOPE_MAP.md`); JK ruled 4
  forks (IV-of-effectiveRatings delta / per-type threshold / new pure engine / 2-ticket split).**
  (T8d-1/2/3 + T8a/b/c + T6/T7-stack — all CONFORMS — COMMITTED.)
- **T8d-3 — Board intelligence overlays** (commit `2738cf5`). Codex 5.5 BUILT →
  Opus 4.8 audit **CONFORMS** → **JK APPROVED** (user-visible, not auto-committed). Three display-only
  overlays on `LeagueBuilderSnakeDraft.tsx`: pick-value chart panel (`pool.pickValueChart` + on-clock pick
  value) + advisory trade-validator panel (`validateTrade`, try/catch friendly out-of-range, no
  persistence per Q7) + on-demand per-candidate cross-team solvency chips (`assessSolvency` across all
  teams, §7.3 "green for one team, red for another"). Closes the last 2 T8a engine orphans
  (`derivePickValueChart` output + `validateTrade` now have UI consumers). Independently re-verified: tsc 0
  / build 0 / suite 7,210 (only the 3 characterized fails) / diff = 2 files / do-not-touch byte-unchanged /
  DB still 7 / no R9/R12 / IV display stays pool.iv (L2). BROWSER-PENDING. **→ T8d COMPLETE.**
  (T8d-1 `9f94412` + T8d-2 `2a5cd95` + T8a/T8b/T8c + T6/T7-stack — all CONFORMS — COMMITTED.)
- **T8d-2 — MLB snake-draft board shell + draft-session persistence** (commit `2a5cd95`). Codex 5.5 BUILT → Opus 4.8 audit **CONFORMS** → **JK APPROVED** (persistence + user-visible,
  not auto-committed). New `LeagueBuilderSnakeDraft.tsx` board at a NEW route `/league-builder/snake-draft`
  + new "MLB DRAFT" tile (existing farm-draft tile relabeled "Farm prospect draft"; farm draft UNTOUCHED).
  Drafts 22-man rosters from the league RegisteredPool; per-candidate solvency via T8d-1 `assessSolvency`
  (rosterSize 22, budget=tierCap, identity-shifted caps); GREEN/YELLOW/RED/BLOCKED signal + BLOCKED disables
  confirm; user-arranged snake order (`buildSnakeOrder`). **Persistence: kbl-league-builder v6→v7 ADDITIVE**
  — new `mlbDraftSessions` store (keyPath id, leagueId index) + `LeagueBuilderMlbDraftSession` + CRUD +
  sync/backup collateral; **DB_VERSION 7 is the only version change** (migration test seeds raw v6 → proves
  all 9 prior stores + data survive). Each confirmed pick does the **dual-write** (`mlbRoster` append +
  `leagueAssignments rosterStatus:'MLB'`) satisfying the 22+10 handoff. `toConstructionPlayer` adapter added
  (hook layer; engine pure). Independently re-verified: tsc 0 / build 0 / full suite 7,206 (only the 3
  characterized fails) / all do-not-touch incl. the farm draft + handoff BYTE-UNCHANGED. BROWSER-PENDING.
  (T8d-1 `9f94412` + T8a/T8b/T8c + T6/T7-stack — all CONFORMS — COMMITTED.)
- **§18 read (4) — Manager WPA reconciliation for MOY: COMPLETE** (this session) → `MANAGER_WPA_MOY_CERTIFICATION.md` + **MOY-1..7** (DECISIONS_LOG 2026-06-16). All four §18 prerequisite reads DONE. The MOY build ticket = greenfield awards + persistence + a HARD D6 dependency → sequences POST-D6/D8 inside D9 (surfaces to JK per the risk rule when drafted).
- **DONE (2026-06-16) → see the RIGHT-NOW top entry + `FRANCHISE_V1_LIVING_SEASON_DSTACK.md`. (Historical scope of the task that produced the L-stack:)** Captain sequenced `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §5-§24 into dependency-ordered tickets for JK ratification, **FOLDING IN the build tickets these §18 reads unblocked**: the **reporter-foundation publish-bus (built EARLY)** + its per-source event taps; the **§9 trait engine** (on `traitInteractionMatrix`) + the pitch-zone / OF-arm / injury captures; the **unified relative-to-pool salary scale** + **tradeable draft-pick trading** + **`farmGradeMode`**; the **MOY award engine** (MOY-1..7, season aggregation of the `pogAwards` composite, POST-D6/D8). Reconcile the Phase-1↔Phase-2 COUPLINGS: **D9 awards** (MVP = TOTAL WAR; Gold Glove = fWAR + DEFENSIVE fame; vote-weighting = FAME not salary — adopt-now vs build-then-rework; **+ MOY now contracted via MOY-1..7, sequenced POST-D6/D8**) and **D7 Fan Favorite** (deferred morale-gated half now designed). **The existing D-stack (D1-D13) is Phase-1 and can proceed in parallel** once JK ratifies D0.
  **Reconciliation carried into Phase-2 planning:** re-triage the deferred fast-follows against the new design — R9 scout-obscured farm IV (feeds the draft/farm read), R12 chemistry overlay (overlaps relationships-lite), FINDING-148 (base AUX_PRICING L/R premium, JK-gated, oracle regen — affects the True Value that fame/awards now lean on); the **D2 backup-parity + backupRestore.ts v12 hardening GROW** to cover Phase-2's new persisted state (morale ledger, fame Heat + Reach floor, relationship edges, race standings, Comeback TV-snapshots). Tech-debt surfaced this session lives in the spec: §20.8 (fame: 3 ladders->1, cumulative->recency+reach, Elimination-scoped->franchise) and §23.9 (awards: offseason-decouple, fame-weighting, remove mechanical rewards, retire deprecated mWAR). Planning-doc sprawl (~45 franchise docs) -> collapse the authoritative set to D0 + the living-season spec + this file. Maps: `T10_SCOPE_MAP.md`, `T9_SCOPE_MAP.md`, `T8d_SCOPE_MAP.md`.
- **STANDING MODE (JK 2026-06-14):** per ticket = build → independent ENGINEERING
  audit → auto-commit verified-complete (browser-pending) → proceed. Captain
  surfaces only the audit verdict, the browser backlog, and genuine scope/design/
  asset decisions when drafting each contract. Browser sign-off BATCHED (see
  BROWSER-VERIFY), never waived; clears before D0.
- **FINDING-148 (JK-gated, non-T-stack):** base AUX_PRICING L/R premium gap
  (switch>left>right; lefty missing; T1 contract-scope gap). Touches FROZEN base-IV
  → oracle regen + golden re-validation required. JK to sequence; do NOT
  auto-insert. ROUTE Codex 5.5 | high → Opus audit.

## SUITE BASELINE

**Branch A: 7,975 pass / 478 files** — full suite 2026-06-23 (attended Hybrid `/kbl-captain`, real node v20, `NODE_ENV=`) after **A1.5c-4** (`f16cbfd3`): **3 fail = the characterized set** (`wpaRuntimeBoundary` hard + `GameTrackerLaunchState` + `franchiseManualSmokeFixture`, the latter two order-flakes verified solo-pass 9/9 + 4/4). RA-8 (`0edf060a`) ran clean earlier at 7,972 pass / 2 fail (GameTrackerLaunchState didn't trip that run). ZERO new reds both tickets. trackerDb **v25** (NO bump this session — RA-8 added additive optional fields only; A1.5c-4 = live aggregator + pure fn, no store change). The A1.5c-4 make-or-break held (the new `getBetweenPlayEvents` import routed through the `isMissingVitestMockExport` swallow-guard → the 3 `processCompletedGame` object-literal mock tests stayed green at module-load). **Branch B (`codex/mode1-v1-b`): 8,087 pass / 501 files** after **S7a** (`d1a578ab`): **1 fail = `wpaRuntimeBoundary`** (Branch-B baseline; the `AwardsWatchlist` order-flake didn't trip). Build exit 0 both branches. *(Prior baselines retained below for the arc trail.)*
**7,765 tests / 447 files** — full suite run 2026-06-19 (attended, real node v20, `NODE_ENV=`) after **L12-3R-2**
(`cd7a4eae`, → L12-3 COMPLETE): **7,763 pass / 2 fail** = EXACTLY the characterized baseline (`wpaRuntimeBoundary`
"allowlisted" + `franchiseManualSmokeFixture` 5000ms timeout). ZERO new reds across the whole L12-3 arc this session
(L12-3a +10 / L12-3b +5 / L12-3c +1 / L12-3R-1 +3 / L12-3R-2 +1 over the post-L12-2 7,745/444 baseline). The documented
order-flake `AwardsWatchlist.test.tsx` surfaced once (during the pre-fix L12-3R-2 run) and **passed solo 2/2** — NOT added
to the characterized set. trackerDb **v24** (only L12-1 bumped it v23→24; L12-3 added NO store — recompute-only). Build
exit 0. **2 auditor-caught/fixed mechanical reds this session** (the full host gate vs Codex's scoped runs): L12-3b's
`processCompletedGame.trueValue` mock gap + L12-3R-2's 4 `franchiseValueInputs` `pitchingWpa` shape assertions — both
test-only, no production defect. *(Prior baselines retained below for the arc trail.)*
**7,584 tests / 438 files** — full suite run 2026-06-18 (attended, real node v20, `NODE_ENV=`) after **R1-a**
(`a5126afb`, 10 clean outcome-proxy traits): **7,582 pass / 2 fail** = EXACTLY the characterized baseline
(`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`). ZERO new reds across the whole L9b-rebuild arc this session
(R-E-a +9 / R-E-b +4 / R1-a +12 over the post-L10-5 7,559 baseline; all additive tests in existing files, +0 new
files — pure build-dark engines imported by no production path cannot regress other tests). Build exit 0. trackerDb
**v23** unchanged (R-E + R1-a are pure engine work — no store). *(Prior baselines retained below for the arc trail.)*
**7,559 tests / 438 files** — full suite run 2026-06-18 (fresh attended session, real node v20, `NODE_ENV=`) after
**L10-5** (the pure reporter news adapter → **L10 COMPLETE**): **7,557 pass / 2 fail** = EXACTLY the characterized
baseline (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture` 5000ms timeout). ZERO new reds (+9 tests / +1 file =
`franchiseL10NewsAdapter.test.ts`); delta over post-L10-4 is +9 pass / +0 fail = exactly the new test file (a pure
orphaned adapter imported by no production code cannot affect any other test). Build exit 0. trackerDb **v23** unchanged.
*(Prior baseline retained below for the arc trail.)* **7,550 tests / 437 files** — full suite run 2026-06-18 (fresh attended session, real node v20, `NODE_ENV=`) after
**L10-4** (the pure stadium-change resolver): **7,548 pass / 2 fail** = EXACTLY the characterized baseline
(`wpaRuntimeBoundary` + `franchiseManualSmokeFixture` 5000ms timeout). ZERO new reds (+10 tests / +1 file =
`franchiseStadiumChangeResolver.test.ts`); delta over the post-L10-3 baseline is +10 pass / +0 fail = exactly the new
test file (a pure orphaned engine imported by no production code cannot affect any other test). Build exit 0 (PWA → tsc
clean). trackerDb **v23** unchanged (L10-4 added no store). *(Prior baseline retained below for the arc trail.)* **7,540 tests / 436 files** — full suite run 2026-06-18 (fresh attended session, real node v20, `NODE_ENV=`) after
**L10-3** (the flag + dark league-sweep hook): **7,538 pass / 2 fail** = EXACTLY the characterized baseline
(`wpaRuntimeBoundary` "stays-allowlisted" + `franchiseManualSmokeFixture` 5000ms timeout). ZERO new reds (+5 tests /
+1 file = `franchiseL10SweepCompute.test.ts`). Build exit 0 (`✓ built in 7.74s` + PWA → tsc clean). trackerDb **v23**
unchanged (L10-3 added no store); KBL_BACKUP_VERSION 2. *(Prior baseline retained below for the arc trail.)* **7,535 tests / 435 files** — full suite run 2026-06-18 (AUTH-4 overnight, host session) after **L10-2** (the dark
`franchiseL10Overlays` store; trackerDb v22→v23): **7,533 pass / 2 fail** = EXACTLY the characterized baseline
(`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`). ZERO new reds (+8 tests / +1 file =
`franchiseL10OverlayStorage.test.ts`). tsc 0; v22→v23 migration-survival + backup parity proven; KBL_BACKUP_VERSION 2.
trackerDb **v23**. *(Prior baseline retained below for the arc trail.)* **7,527 tests / 434 files** — full suite run 2026-06-18 (AUTH-4 overnight, host session) after **L10-1** (the pure
random-event selection engine): **7,525 pass / 2 fail** = EXACTLY the characterized baseline (`wpaRuntimeBoundary` +
`franchiseManualSmokeFixture`). ZERO new reds (+13 tests / +1 file = `franchiseL10EventEngine.test.ts`). tsc 0. trackerDb
**v22** (L10-1 is a pure engine, no store). *(Prior baseline retained below for the arc trail.)* **7,514 tests / 433 files** — full suite run 2026-06-18 (AUTH-4 overnight, host session) after **L9b-3c** (→ L9b
COMPLETE): **7,512 pass / 2 fail** = EXACTLY the characterized baseline (`wpaRuntimeBoundary` +
`franchiseManualSmokeFixture`). ZERO new reds (+15 tests / +2 files = `traitOverlayConfirmation.test.ts` [10] +
`franchiseTraitConfirmApply.test.ts` [5]). tsc 0. trackerDb **v22** (L9b-3c added no store; pure engine + a confirm
applier with no live caller). *(Prior baseline retained below for the arc trail.)* **7,499 tests / 431 files** — full suite run 2026-06-18 (AUTH-4 overnight, host session) after **L9b-3b-ii** (the flag +
dark trait-grant hook → L9b-3b COMPLETE): **7,497 pass / 2 fail** = EXACTLY the characterized baseline
(`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`). ZERO new reds (+4 tests / +1 file =
`franchiseTraitGrantCompute.test.ts`; the hook is flag-gated dark + the test stubs the L9b-3a→L9b-2 seam). tsc 0. trackerDb
**v22** (b-ii added no store). Live game path (flag-gated) → browser-pending (#22). *(Prior baseline retained below for the arc trail.)* **7,495 tests / 430 files** — full suite run 2026-06-18 (AUTH-4 overnight, host session) after **L9b-3b-i** (the dark
`franchiseTraitOverlays` store; trackerDb v21→v22): **7,493 pass / 2 fail** = EXACTLY the characterized baseline
(`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`, confirmed via FAIL-file grep). ZERO new reds (+8 tests / +1 file =
L9b-3b-i's `franchiseTraitOverlayStorage.test.ts`; the modified pin/parity/manifest tests gained assertions, not test
cases). Also `vite build` OK + `tsc` 0. trackerDb **v22**; KBL_BACKUP_VERSION stays 2. *(Prior baseline retained below for the arc trail.)* **7,487 tests / 429 files** — full suite run 2026-06-18 (AUTH-4 overnight, host session) after **L9b-3a + the FINDING-149
seam fix**: **7,485 pass / 2 fail** — the 2 = EXACTLY the characterized baseline (`wpaRuntimeBoundary` +
`franchiseManualSmokeFixture`, confirmed via FAIL-file grep). An earlier run (pre-fix) showed 3 fails, the 3rd being the
documented order-flake `EliminationTeamHub.test.tsx`, which did NOT reproduce on re-runs (passes solo) — same
worker-pool-reorder family, NOT a regression. **ZERO new reds** (+22 tests / +1 file = exactly L9b-3a's
`traitCandidateBuilder.test.ts`, incl. the L9b-2 seam test; the engine is pure/build-dark, imported by nothing in
production → cannot regress any UI/other test). trackerDb **v21** (L9b-3a added no store). *(Prior baseline retained below for the arc trail.)* **7,465 tests / 428 files** — full suite run 2026-06-18 (AUTH-4 overnight, host session) after **L9b-2** commit
`f616373a`: **7,463 pass / 2 fail** — the 2 = EXACTLY the characterized baseline (`wpaRuntimeBoundary` +
`franchiseManualSmokeFixture`, confirmed via FAIL-line grep); the order-flakes did NOT surface this run. **ZERO new reds**
(+24 tests / +1 file = exactly L9b-2's `traitAcquisition.test.ts`; the engine is pure/build-dark). trackerDb **v21**
(L9b-2 added no store). *(Prior baseline retained below for the arc trail.)* **7,441 tests / 427 files** — full suite run 2026-06-18 (AUTH-4 overnight, host session) after **L9b-1** commit
`398533d1`: **7,437 pass / 4 fail**. The 4 = the 2 FIXED characterized fails (`wpaRuntimeBoundary` +
`franchiseManualSmokeFixture` — names personally confirmed via the FAIL-line grep) **+ 2 order-flakes**
(`GameTrackerLaunchState` + **newly-surfaced `EliminationTeamHub`**), BOTH of which **PASS SOLO** (9/9 and 6/6) → they are
worker-pool-order flakes (shared fake-IndexedDB/global state), NOT regressions. **ZERO new reds attributable to L9b-1**
(+19 tests / +1 file = exactly L9b-1's `traitRealityScorer.test.ts`; the salaryCalculator percentile lift is
behavior-neutral → 121/121 family green, adds no tests). `EliminationTeamHub` is the SAME phenomenon documented for
`AwardsWatchlist` on L7d-1 — a pre-existing latent flake surfaced when a new test file shifts vitest's worker ordering;
added to the order-flake family in OPEN PENDING-JK (NOT silently relabeled into the characterized set). trackerDb **v21**
(L9b-1 is a pure engine; no store, no version bump). *(Prior baseline retained below for the arc trail.)* **7,422 tests / 426 files** — full suite independently re-run 2026-06-18 (AUTH-4 overnight) after **L9a-4** commit
`acce899c`: **7,420 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture` — NAMES personally
confirmed), ZERO new reds (+3 tests / +2 new files = `seasonAggregator.outfieldArm.test.ts` + `eventLog.injuryCounts.test.ts`).
L9a-4 is purely additive: NO version bump (trackerDb **v21** / eventLog `DB_VERSION` 3), NO new store, the
`franchiseSeasonLedgerStorage` PIN stays GREEN untouched. Live aggregation path → browser-pending (#20).
*(Prior baseline retained below for the arc trail.)* **7,419 tests / 424 files** — full suite independently re-run
2026-06-18 (AUTH-4 overnight) after **L9a-3** commit
`32244393`: **7,417 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture` — NAMES
personally confirmed this run), ZERO new reds (+4 handedness tests across 2 EXISTING files; no new file → 424 unchanged).
L9a-3 is pure wiring: `eventLog` `DB_VERSION` 3 / trackerDb **v21** / no new `AtBatEvent` field / `buildContextSnapshot`
deps unchanged. Live game path → browser-pending (#19). *(Prior baseline retained below for the arc trail.)* **7,415
tests / 424 files** — full suite independently re-run 2026-06-18 (AUTH-4 overnight) after **L9a-1** commit
`e28706e9`: **7,413 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture` — failing-test
NAMES personally re-confirmed this run), ZERO new reds (+3 tests, SAME file `EnrichmentPanel.test.tsx`; no new file →
424 unchanged). L9a-1 is additive: `eventLog` `DB_VERSION` stays 3, trackerDb stays **v21**, no new store. USER-VISIBLE
(EnrichmentPanel) → browser-pending (#18). *(Prior baseline retained below for the arc trail.)* **7,412 tests / 424
files** — full suite independently re-run 2026-06-18 (AUTH-4 overnight) after **L8b** commit
`cd9e4589`: **7,410 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds
(+26 tests / +2 files = L8a `ratingsDevelopment.test.ts` [17] + L8b `franchiseCheckpointSweepCompute.test.ts` [9], over
the post-L2c 7,386/422). trackerDb stays **v21** (L8 added NO store); KBL_BACKUP_VERSION **2**. L8a auto-committed (pure);
L8b → browser-pending (live game path + overlay writes). The known order-flakes did NOT appear in either L8 audit run.
*(Prior baseline retained below for the arc trail.)* **7,386 tests / 422 files** — full suite independently re-run
2026-06-18 (AUTH-4 overnight) after **L2c** commit
`a77e0ed5`: **7,384 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds
(+10 tests / +1 file = L2c's `ratingsOverlayConfirmation.test.ts`, over the post-L2b 7,374/421; trackerDb still **v21** —
L2c is a pure engine, no store). **L2 trio all pure/dark + persistence-clean; trackerDb at v21 (only L2a bumped it).**
*(Prior baseline retained below for the arc trail.)* **7,376 tests / 421 files** — full suite independently re-run
2026-06-18 (AUTH-4 overnight) after **L2b** commit
`e8ec0908`: **7,374 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds
(+11 tests / +1 file = L2b's `ratingsOverlayMerge.test.ts`, over the post-L2a 7,363/420; trackerDb still **v21** — L2b is
a pure engine, no store). *(Prior baseline retained below for the arc trail.)* **7,365 tests / 420 files** — full suite
independently re-run 2026-06-18 (AUTH-4 overnight) after **L2a** commit
`6fdeba11`: **7,363 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds
(+8 tests / +1 file = L2a's `franchiseRatingsOverlayStorage.test.ts` [7] + the v20→v21 migration test [1]; the other 2
pin/parity files gained assertions, not new test cases; over the post-L7d-2 7,355/419). **trackerDb now v21** (L2a's
`franchiseRatingsOverlays`; KBL_BACKUP_VERSION stays 2). AwardsWatchlist order-flake did NOT appear this run.
*(Prior baseline retained below for the arc trail.)* **7,357 tests / 419 files** — full suite independently re-run
2026-06-17 (AUTH-4 host resume) after **L7d-2** commit
`aec5db99`: **7,355 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds
(+11 tests / +1 file = L7d-2's `fanHopefulCushion.test.ts`, over the post-L7d-1 7,344/418; trackerDb still **v20** — L7d-2
is a pure engine, no store). The AwardsWatchlist order-flake did NOT appear this run (1 of 4 full-suite runs across L7d).
*(Prior baseline retained below for the arc trail.)* **7,346 tests / 418 files** — full suite independently re-run
2026-06-17 (AUTH-4 host resume) after **L7d-1** commit
`f61dcae0`: **7,344 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`) on the
deduped/solo-passing basis (+9 tests / +1 file = L7d-1's `captainMoraleRouter.test.ts`, over the post-L7c 7,335/417;
trackerDb still **v20** — L7d-1 is a pure engine, no store). **⚠ NEWLY-OBSERVED ORDER-FLAKE (2026-06-17, flagged for
JK — NOT a regression):** my full-suite run after L7d-1 showed **3 fails**, the third being
`src/src_figma/__tests__/franchiseMode/AwardsWatchlist.test.tsx`; Codex's full-suite run on the IDENTICAL tree showed
only the 2 characterized. AwardsWatchlist **passes SOLO (2/2)** → it is a non-deterministic order-dependent flake (same
family as the documented conditional-solo flakes `GameTrackerLaunchState` + `franchiseOffseasonGuards.component`),
surfaced because L7d-1's new test file shifted vitest's worker pool ordering. L7d-1 (zero-import pure engine, imported by
nothing) has NO coupling to it. NOT silently added to the characterized set — belongs in the order-flake root-cause batch
(OPEN PENDING-JK). *(Prior baseline retained below for the arc trail.)* **7,337 tests / 417 files** — full suite
independently re-run 2026-06-17 (AUTH-4 host resume) after **L7c** commit
`886d1dce`: **7,335 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds
(+10 tests / +1 file = L7c's `designationFanMorale.test.ts`, over the post-L7b 7,325/416; trackerDb still **v20** — L7c
is a pure engine, no store). *(Prior baseline retained below for the arc trail.)* **7,327 tests / 416 files** — full
suite re-run 2026-06-17 (AUTH-4 host resume) after **L7b** commit `77feeda3`: **7,325
pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds (+8 tests / +1 file =
L7b's `designationFameNudge.test.ts`, over the post-L7a 7,319/415; trackerDb still **v20** — L7b is a pure engine).
Prior step: L7a commit `0a59a24`: **7,317
pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds (+3 tests in the
existing `franchiseFlashpointDecayCompute.test.ts`, no new file, over the post-L5d 7,316/415; trackerDb still **v20** —
L7a touched no store/version). Prior step: L5d commit `e061e51` (**L5
COMPLETE**): **7,314 pass / 2 characterized fail** (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`), ZERO new reds
(+7 tests / +1 file = L5d's `reporterIntensity.test.ts`, over the post-L5c 7,309/414; trackerDb still **v20** — L5d is a
pure engine, no store). Prior step: L5c commit `8cd2cc1` = 7,309/414 (+9 tests / +1 file =
L5c's `tradeRequestGeneration.test.ts`, over the post-L5b 7,300/413; **trackerDb still v20** — L5c is a pure engine, no
store). Prior step: L5b commit `5ebb148` = 7,300/413 (+18 tests / +3 files over post-L5a 7,280/410). Arc this
session: 7,267/407 (post-L6a) →
+4/+1 L6b-1 (7,269/408) → +4/+1 L6b-2 (7,273/409) → +7/+1 L5a (7,280/410). **trackerDb now v19** (L6b-1's
`franchiseFameRecords`; KBL_BACKUP_VERSION stays 2). *(Prior baseline retained below for the arc trail.)* **7,267
tests / 407 files** — full suite re-run 2026-06-17 after L6a: **7,265 pass / 2 fail**, the 2 being EXACTLY
the (now-shrunk) characterized set. (Arc this session: 7,292/406 after D10 → 7,242/405 after DR-1 [deleted the orphan
`fanFavoriteEngine.test` + cleared the narrative RED, set 3→2] → +D11/L3a/L3b/L6a tests → 7,267/407. Build-dark
soul-layer tests [matrix, morale-store, fame] all green.) (+34 tests / +5 files over the prior 7,254 / 400 — D6b/D7/D8 added tests to existing files +
`franchiseAwardTrust.test.ts`; D9a added `franchiseAwardsStorage.test.ts` + `franchiseTrueValueSnapshotsStorage.test.ts`;
D9b/D9c grew `franchiseAwardsEngine.test.ts`.) **trackerDb is now v18** — only D9a bumped it (its 2 dark stores); D6b→D8
added NO store (D6b's freeze is a field on the existing artifact, DesignationEvents are ephemeral, D8 stores nothing,
D9b is a pure engine). `KBL_BACKUP_VERSION` stays 2. Characterized set (a new RED OUTSIDE it is a real regression) is now **wpaRuntimeBoundary + franchiseManualSmokeFixture**
(2, down from 3). **`franchiseNarrativeEventEligibility` was CLEARED by DR-1** (2026-06-17): it was the PRE-EXISTING
stale "TEAM_MVP/ACE preview-only" assertion (the deferred narrative-gate cleanup); DR-1's Cornerstone-field removal
forced the test edit, and the stale `teamMvpAcePreview` assertion was aligned to the verified pre-existing
`not-applicable` output (NOT gutting — source `teamMvpAcePreview` logic unchanged). No longer a known RED.
(GameTrackerLaunchState + franchiseOffseasonGuards.component are conditional-solo order-flakes that passed here.)
**CLI:** prefix `NODE_ENV= `; node at `~/.nvm/versions/node/v20.20.0/bin`.

## BROWSER-VERIFY OUTSTANDING (JK)

> **▶ COLLAPSED INTO ONE v1 SMOKE PASS (JK 2026-06-20).** There is NO current franchise data to protect — the goal is a clean
> v1 BEFORE any meaningful (un-corruptable) franchise exists. So these are NO LONGER per-ticket gates. They collapse into a
> SINGLE end-of-v1 smoke pass on a DISPOSABLE/throwaway franchise: near v1, flip the Phase-2 flags ON and run ONE pass
> confirming the dark features behave + migrations load clean. The numbered/lettered items below are now just the CHECKLIST
> of what that one pass covers — NOT separate sign-offs. Persistence/migration items are already proven by unit tests, so the
> v1 pass is a final smoke-check, not a data-safety gate. **Correctness discipline (builder≠auditor, falsification/inverse
> tests) is UNCHANGED — only the per-ticket browser ceremony is collapsed.**

> BATCHED per the SESSION_RULES pen (JK 2026-06-14) — cleared in one pass before
> the D0 / flag-flip / playtest gate; persistence/data-shape items prioritized.
> Engineering audits already passed per ticket; these verify experience/feel.

> **NEW from the 2026-06-16 autonomous run** (NOTE: creating a franchise needs the League Builder startup farm
> draft + scout hiring first — the 22+10 handoff gate, pre-existing): **(A) L1.5** — a created franchise's teams
> each get a `captainPlayerId` (highest Loyalty+Charisma MLB player, Charisma≥70; null+warn if none); all players
> carry the 4 hidden modifiers (OD-1 backfill). [The shipped logic was browser-confirmed in the runtime; this is
> the real-franchise pass.] **(B) L4a reporter** — with a reporter assigned + Supabase configured, the franchise
> hub `BeatReporterNews` shows live post-game `GameStory` columns (not the legacy template). Reporter text is
> Supabase/network-dependent (D-R5).

1. EP1 effective-position pooling on real franchise data — does a position-
   shifting player get repooled; do bench players land in Reserve.
2. TV2 TeamHub projected badges — dotted "Proj.", post-game recalc, fewer
   early-season badges is CORRECT (below-floor = no holder).
3. **T7a** optimal-lineup recommendations now score by IV-of-effectiveRatings
   (was raw heuristic) — verify vs-RHP / vs-LHP lineups look sensible on real
   franchise data, and one-button RECALC produces a coherent lineup + defensive
   arrangement (low-glove players kept off high-traffic spots).
4. **T7b** call-up/send-down advisory recs render in the analyzer panel — ranked,
   read-only, leak-safe (no hidden prospect ratings/true IV shown; "projects as a
   positive-surplus replacement" + scout-confidence label); a low-cost high-surplus
   prospect surfaces over a high-cost MLB underperformer.
5. **T7c** salary ledger: calling up a prospect applies rookie-scale salary (0.50×,
   replacing age factor); sending down a player applies dead-money capCharge; the
   ledger persists per season and resets at offseason Phase 3 (fresh scope). No
   double-discount; re-call-up doesn't stack.
6. **T8b** League Builder tier + balanceMode selectors persist on the league (create/edit form);
   the "Register Pool" button builds + persists a RegisteredPool that survives reload (shows tier,
   tierCap, player count, surplus warning). An existing pre-T8b league still opens fine (additive
   migration). Backup/restore + sync still round-trip with the new `registeredPools` store.
7. **T8c** Team Identity (Cap) section in the team-edit modal: set band priorities, click Suggest
   (composeIdentity fills the increase stack), manually edit increase/decrease mods, watch the live
   cap-shift % preview update, save + reopen the team → the identity persists. A team with no
   identity opens cleanly.
8. **T8d-2** MLB snake-draft board (new "MLB DRAFT" tile → `/league-builder/snake-draft`): start draft
   (registers pool if needed), snake order advances, per-candidate GREEN/YELLOW/RED/BLOCKED solvency
   signal shows for the team on the clock, BLOCKED disables DRAFT, confirming a pick persists (roster +
   player MLB assignment) and survives reload, 22-per-team completes; the existing farm/prospect draft
   (relabeled "Farm prospect draft") still fills the 10; Franchise Setup handoff accepts the league.
   Backup/restore + sync round-trip with the new `mlbDraftSessions` store. (PERSISTENCE/data-shape →
   prioritized in the batch.)
9. **T8d-3** snake-draft board overlays: the pick-value chart panel renders (+ current pick's value on the
   on-the-clock banner); the trade-validator panel flags balanced vs imbalanced (imbalance % vs 15% band,
   favored side, "advisory — overridable") and shows a friendly message for out-of-range pick numbers; the
   per-candidate "Compare teams" toggle shows a GREEN/YELLOW/RED/BLOCKED chip per league team.
10. **T9 (T9b)** in-game NewsBoard sub recommendations now fire on IV-of-effectiveRatings: a clearly-better
   bench bat surfaces a pinch-hit rec with a trait/mojo justification; a tiring pitcher surfaces a fresh-arm
   rec; situational-only triggers (e.g. a meltdown with no ratings drop) no longer fire on their own (pure
   IV-delta gate); keep/decline actions + watch persistence still work; recs feel sensibly-timed vs leverage.
11. **T10** (PERSISTENCE — prioritized) lineup-delta WPA standard: start a seasoned (franchise) game, set a
   deliberately sub-optimal lineup, play to completion → a per-game `lineupDeltaWpaStandard` (≤ 0) persists
   for BOTH managers and survives reload; the existing Manager-WPA overlay/almanac totals are UNCHANGED (no
   double-count); the season carries an `optimizerConstantsHash` that survives backup/restore.
12. **D10** (USER-VISIBLE) Mode-2 SeasonSummary page: after a completed regular season with finalized awards, the
   Awards Status section shows the real finalized LEAGUE awards (MVP/Cy Young/RoY/Gold Glove/Silver Slugger/Manager
   of Year via the AwardsWatchlist) — not the old "Internal v1 does not finalize…" preview copy; before finalize it
   shows the projected preview; the "Season Complete Manifest" reads "awards-aware handoff package" (not "no-awards")
   and the still-blocked families (True Value/salary/morale/Mode 3) remain visibly blocked. Team designations are NOT
   shown here (that's the DESIG-RECON team-hub ticket).
13. **DR-3** (USER-VISIBLE) team-hub TEAM DESIGNATIONS strip: open a franchise → Team Hub → 'team' tab; below
   "Currently viewing: <team>" a six-slot strip shows Captain / Team MVP / Ace / Fan Favorite / Albatross / Fan
   Hopeful for that team — holders + badges (solid = final/live, dotted Proj. = mid-season), "— none" for empty
   slots; Fan Hopeful shows "Scouted <grade>" (visible-safe, never a hidden grade); Captain + Fan Hopeful resolve to
   the assigned players; switching teams updates the strip. (DR-1/DR-2 logic underneath: Albatross only on a
   ≥2×-min-salary materially-overpaid player; Fan Favorite on the best underpaid overperformer; no morale/fame effect
   yet — Phase-2.)
14. **D11** (USER-VISIBLE) Team Hub → roster tab → the "TRUE VALUE + EXPECTED WINS" value panel (D4): mid-season it
   reads **"TRUE VALUE PROJECTED"** (badge PROJECTED); after a season completes (the value artifact freezes) it reads
   **"TRUE VALUE FINAL"** (badge TRUSTED). Salary shows as real (no "preview" framing); "NO SALARY MOVEMENT" + the
   blocked families (expected-wins persistence, final-handoff, morale, Mode 3) STILL show blocked; Expected Wins reads
   as an estimate. No internal contradiction (VALUE INPUTS card no longer says "deferred" while the badge says trusted).
15. **D11** (USER-VISIBLE) label sweep elsewhere: the season-complete manifest no longer lists Fan Favorite/Albatross/
   Captain/Fan Hopeful (or the cut Cornerstone) as "blocked"; "Awards persistence" reads LIVE (not BLOCKED) on the
   Team Hub + the FranchiseHome league-leaders card — WITHOUT enabling any offseason ceremony/voting control; the
   stadium-spray panels + all salary-movement/morale/Mode-3 lines REMAIN provisional/blocked (verify nothing
   over-promoted).
16. **L2a** (PERSISTENCE — prioritized; trackerDb v20→v21) the new dark `franchiseRatingsOverlays` store: open an
   existing pre-v21 franchise → it migrates cleanly (no data loss — prior stores/games/standings/value intact); the
   store is empty (no overlays written yet — it's dark until L8/L9b); backup → wipe → restore round-trips with the new
   store present (empty). This is a saved-data-shape change, so it leads the batch. (Engine audit already proved the
   v20→v21 migration-survival + backup round-trip in unit tests; this is the real-franchise confirmation.)
17. **L8b** (PERSISTENCE/live-path — prioritized; the first real WRITER through L2) the dark ratings-development
    checkpoint sweep: with the **default-OFF** `isFranchisePhase2CheckpointEnabled` flag (normal play), confirm playing a
    franchise season writes ZERO overlays and adds no perceptible overhead (the hook flag-gates first → true no-op). Then
    (dev/QA only — flip the flag) play to a 20%-of-season boundary game and confirm the `franchiseRatingsOverlays` store
    receives `pending`+`permanent` overlays for shifting MLB players (correct franchise/season/team scope, valid rating
    key per player type, deterministic id `…:checkpoint-N`), idempotent on a replayed boundary (no dup rows), and that
    **nothing in the live UI changes** (pending overlays stay inert in the merge until the post-D13 confirm UI). Saved-
    data-shape adjacent (writes into the v21 store; no schema change), so it rides with the persistence batch.
18. **L9a-1** (USER-VISIBLE — GameTracker EnrichmentPanel) the new optional "Pitch Location" capture: during a tracked
    at-bat, the post-play EnrichmentPanel shows a "Pitch Location" row of 5 buttons (Low / High / Inside / Outside / Out
    of Zone) for ALL enrichable plays (incl. K/BB — it is NOT spray-gated); tapping one highlights it and tapping it again
    clears it; skipping it leaves the play un-annotated (optional, undefined-when-skipped). The selection persists with the
    play (reload mid-game → the chosen zone is still shown). It is dark-for-now from the user's view (no trait/rating effect
    yet — L9b consumes it later). Confirms the OD-5 "manual/opt-in zone input" feels right and doesn't clutter the panel.
19. **L9a-3** (DATA/live-path — no visible UI) handedness now persists on at-bat events: play a fresh franchise game to
    completion and confirm (via the event log / a later L9b consumer) that recorded at-bats carry `batterContext.handedness`
    + `pitcherContext.handedness` + `matchupContext.platoonAdvantage` (from the rosters' bats/throws). Edge to spot-check:
    a mid-game page REFRESH — at-bats recorded AFTER the reload will have undefined handedness (known happy-path-only
    limitation; degrades gracefully). No visible UI change; this is a data-capture verification.
20. **L9a-4** (DATA/season-aggregation — no visible UI) OF-arm + injury captures: after playing franchise games with
    outfield-assist / runner-held plays, confirm `PlayerSeasonFielding.outfieldAssists`/`baserunnersHeld` accumulate for
    the credited outfielders (season stats), and that `getSeasonInjuryCountsByPlayer` returns sensible per-player injury
    counts derived from the injury events. No visible UI change (these feed L9b's Cannon/Noodle/Durable/Injury-Prone
    traits later); a data/season-stat verification, not a visual one.
21. **L9b-3b-i** (PERSISTENCE — prioritized; trackerDb v21→v22) the new dark `franchiseTraitOverlays` store: open an
    existing pre-v22 franchise → it migrates cleanly (no data loss — prior stores/games/standings/value/ratings-overlays
    intact); the new store is empty (dark until L9b-3b-ii writes PENDING trait rows); backup → wipe → restore round-trips
    with the new store present (empty). Saved-data-shape change, so it leads the batch. (Engine audit already proved the
    v21→v22 migration-survival + backup parity in unit tests; this is the real-franchise confirmation.)
22. **L9b-3b-ii** (LIVE game path — flag-gated; the first trait WRITER) the dark trait-grant hook: with the **default-OFF**
    `isFranchisePhase2TraitsEnabled` flag (normal play), confirm playing a franchise season writes ZERO trait overlays and
    adds no perceptible overhead (the hook flag-gates first → true no-op, no event loading). Then (dev/QA only — flip the
    flag) play to a 20%-of-season checkpoint near season's end (so the min-sample valve's pool is populated) and confirm
    the `franchiseTraitOverlays` store receives `pending`+`applied:false` trait-change rows for MLB players (correct
    franchise/season/team scope, canonical trait names, `valence` gain/lose, deterministic id `…:trait-grant-N`),
    idempotent on a replayed boundary (no dup rows), and that **nothing in the live UI changes** (pending rows don't mutate
    `trait1`/`trait2` until the L9b-3c confirm). Writes into the v22 store; rides the persistence batch.
23. **L10-2** (PERSISTENCE — prioritized; trackerDb v22→v23) the new dark `franchiseL10Overlays` store: open an existing
    pre-v23 franchise → it migrates cleanly (no data loss — prior stores/games/standings/value/ratings-overlays/
    trait-overlays intact); the new store is empty (dark until L10-3 writes L10 event rows); backup → wipe → restore
    round-trips with the new store present (empty). Saved-data-shape change, so it leads the batch. (Engine audit already
    proved the v22→v23 migration-survival + backup parity in unit tests; this is the real-franchise confirmation.)
24. **L12-3R-1** (DATA/season-aggregation — no visible UI; saved-shape, prioritized) per-player season `pitchingWpa` now
    accumulates in the live season aggregator (ungated, like the TrueValue snapshots): play franchise games to completion
    and confirm that pitchers' `PlayerSeasonPitching.pitchingWpa` accumulates (sum of each game's per-pitcher pitching-WPA
    from `playerWpaTotals`) and survives reload + backup/restore; a pitcher with no WPA entry that game stays at +0 (never
    NaN); no perceptible overhead. Additive optional field (no DB-version bump). No visible UI change — it feeds the dark
    L12-3R-2 Reliever-of-Year race (flag-gated, pure relievers ranked by pitchingWpa). A data/season-stat verification.
25. ✅ **L13-1 VERIFIED** (2026-06-20, JK in-app) — (PERSISTENCE — prioritized; trackerDb v24→v25) the new dark/EMPTY `franchiseRelationshipEdges` store
    (relationship-edge persistence foundation for the L13 stack): open an EXISTING franchise created before this change →
    confirm the v25 migration runs cleanly with NO data loss — prior season/standings/True-Value/All-Star/awards data all
    intact and the hub loads normally; the new store appears EMPTY (no writer yet — it ships behind the default-OFF L13
    flag `isFranchisePhase2L13Enabled`). Then Settings → Backup → save, then Restore that backup → it round-trips with the
    new (empty) store present (no schema error; `KBL_BACKUP_VERSION` still 2). Nothing in the franchise UI changes
    (build-DARK). Engineering audit passed (build 0; full suite ZERO new reds; the v24→v25 + v22→v25 migration-survival
    + backup round-trip tests are green); this verifies the migration on REAL franchise data. (commit `7b9c92fc`.) **✅ RESOLVED 2026-06-20 (JK):** opened a real
    franchise with accumulated history → v25 migration loaded clean, NO data loss (Part 1 confirmed in-app). Part 2 (in-app
    backup/restore round-trip) spot-check WAIVED by JK — already proven green by the manifest export→wipe→restore test, so
    L13-1 closed on Part 1 + the proven test.

## OPEN PENDING-JK (rolling)

**✅ RESOLVED/SUPERSEDED SWEEP (2026-06-18, attended) — closed by the Q1–Q12 rulings + the L9b rebuild; do NOT re-raise:**
- **Workhorse trait role** → RESOLVED (Q9: confirmed pitcher-only).
- **`TRAIT_OPPOSITES` (14 pairs)** → RESOLVED (Q10: confirmed).
- **Trait reality signal model** → RESOLVED (Q11: outcome-weighted SUCCESS-RATE, not exposure-count).
- **personality-PRIMARY thin-signal exception (the deferral default)** → SUPERSEDED by the no-personality-only rule
  (`d71767aa`): every earnable trait has a data proxy; personality is a tilt, never the sole input.
- **Cannon/Noodle OF-arm signal default** → MOOT (Noodle Arm CUT this session).
*(Still genuinely open/deferred below: §16 sim-tuned magnitudes [placeholders]; FINDING-148; F-144/145/147 taxonomy
cleanup; T10 `backupRestore` hardening; order-flake root-cause batch; the grade-freshness app-wide ticket [ruled,
needs scoping at R3/E1]; the SOUL-LAYER build-to-spec greenlight for L11–L14.)*

**✅ OD-2..5 + D4 ALL RULED 2026-06-17 (attended session) — full text in `DECISIONS_LOG.md` (2026-06-17 entry):**
- **OD-2 (L-ECON1) — RULED:** new-league-construction-only (no retroactive — no in-progress leagues); reuse the
  pick-value chart, **farm anchor nerfed one grade-step via `FARM_NERF_SCALES`** (resolves the farm≈22-man concern);
  scale raw IVs pre-chart so the frozen IV oracle stays byte-untouched. *Build remains watched/safety-walled (oracle-
  adjacent).* Captain conflation corrected: **IV (ratings→salary) ≠ TV (performance/WAR)** — OD-2 never touches TV.
- **OD-3 (L2) — RULED:** queue async/non-blocking + clearly · plain-text edit instructions · game-count expiry ·
  season-scoped overlays.
- **OD-4 — RULED:** franchiseId-precedence cascade · manager+reporter assigned on the team-edit page · **scouts
  DRAFTED front-loaded before the 22-man** (cosmetic draft-guide attribution; reflected on team page) — a re-sequence
  of the League-Builder flow → capture in the draft-flow spec · facts schema at first event-tap build.
- **OD-5 (L9a) — RULED:** manual/opt-in (never forced; used when data present) → **REQUIRES optional GameTracker zone
  inputs for pitch/hit location** · cumulative season injury tally. *Build stays watched (live game path).*
- **D4 — RULED:** moot post-D6 (value preview now trusted/frozen) → **folded into D11** (no standalone ticket).
- **SOUL-LAYER "BUILD TO SPEC" GREENLIGHT** (still open) — L3 morale matrix / L5 fan teeth / L6 fame / L7 designation effects /
  L8 ratings dev / L9b traits / L10–L14: the SMB4 soul-layer engines are JK's design vision. They build to the
  ratified living-season spec (with sim-tunable placeholder magnitudes) once JK greenlights "build to spec."

**DEFERRED FUTURE TICKET (T7c spillover, JK 2026-06-14):** capCharge → soft
payroll-expectation baseline → fan-morale consequence. BLOCKED on a declared-budget
design (no `declaredBudget` field/UI exists; v1.1.2 requires declared ≠ realized
spend). The consumer machinery is orphaned (`calculateFanExpectations` 0 callers) /
hard-gated (`fanMoraleMutationAllowed:false`). T7c persisted capCharge + ledgerCapCharge
ready for it. Also deferred: one-click execute-from-rec; deadMoneyRate league presets
(100/75/50) + Setup-Wizard control.
**FINDING-148** (base AUX_PRICING L/R batter premium gap — new JK-gated ticket;
sequence vs T-stack; regen frozen oracle). **T6 + T7a: COMMITTED** (audit CONFORMS,
flags ratified; T7a browser-pending). Standing auto-commit mode adopted (JK
2026-06-14) — Captain commits verified-complete tickets + proceeds, browser tests
batched.
F-144 (salary-path R-6 residue) + F-145 (designation 'active' vocabulary) +
F-147 (stale peerPoolLimitation written live) → taxonomy/spec-cleanup batch
(with R-6/R-8/§17.8 blocks). MINOR #3 builder-reporting → now ratified into
SESSION_RULES. Stray reference-docs/Super Mega Baseball 4 Rosters.csv
(commit or gitignore). ASG WPA→Fame; Signature Moment card line; fame tier
names; F2 SOT typos (~15); F4 FA trait spellings (4); order-flake root-cause
(now **5 members**: franchiseManualSmokeFixture [characterized] + GameTrackerLaunchState + franchiseOffseasonGuards.component
+ `AwardsWatchlist.test.tsx` [observed 2026-06-17] + **NEWLY-OBSERVED 2026-06-18 `EliminationTeamHub.test.tsx`** — all pass
solo; non-deterministic full-suite order/worker-pool sensitivity [shared fake-IndexedDB/global state]; EliminationTeamHub
surfaced when L9b-1 added `traitRealityScorer.test.ts`, exactly the L7d-1/AwardsWatchlist pattern).
**`Workhorse` trait role (L9b-1 DEFAULT-TAKEN):** classified PITCHER (staminaModifier, unlisted in VI.2) → confirm or
re-classify; affects only which players are eligible to earn it (L9b-2+), not the scorer math.
**L9b-3a DEFAULTS-TAKEN (AUTH-4, flagged):** (1) **outcome-weighted RATE signal model** — the reality `signalValue` is a
success-RATE within a trait's matrix-detected opportunities (e.g. Clutch = WPA-favorable rate in high-pressure PAs), NOT a
bare predicate fire-COUNT. The L9b-3 recon line said "COUNT real fires," which Codex first built literally — but a pure
count makes every OPPOSING pair indistinguishable (Clutch≡Choker, RBI Hero≡Zero, Stealer≡Bad Jumps, Butter≡Cannon≡Noodle
all share one predicate), so the Captain's contract + the shipped engine use the §B-faithful outcome-weighted rate. JK:
confirm the rate model (vs revisiting the recon's count wording). (2) `pressure='high'` derived from the populated
`isClutch` flag (finer leverage-band → 'extreme' deferred). (3) **Cannon Arm / Noodle Arm share ONE OF-arm-per-GAME
signal** = (outfieldAssists + baserunnersHeld) / games, inverted for Noodle — there is no per-OF-throw opportunity
denominator in v1 (approximation). (4) Durable / Injury-Prone = injuries / games (inverted for Durable). (5) ALL signals
use `basis:'none'` (rate floor `minSampleRate`, no season scaling). (6) Clutch/Choker are role-determined (a position
player's signal from his batting WPA, a pitcher's from the fielding-team WPA). (7) **AUDIT NOTE (not a default — a builder
deviation handled):** Codex over-produced — it left an abandoned `traitContextReconstructor.*` pair (the broken count
model) which the auditor DELETED, and edited 5 Captain-owned spec-docs which the auditor REVERTED + re-authored. No JK
action needed on the deviation; flagged for visibility.
**L9b-2 DEFAULTS-TAKEN (AUTH-4, flagged):** (1) **`TRAIT_OPPOSITES`** — a NEW 14-pair canonical positive↔negative trait
pairing list authored in `traitAcquisition.ts` (none existed in code/spec; derived from VI.3 +/− image groupings + the 2
SMB4 mutual-exclusion examples). Touches the frozen trait system → JK review (add/remove pairs?). (2) **personality-PRIMARY
thin-signal exception** (VI.3:122 — Stimulated / Gets Ahead / Falls Behind / Big Hack / Little Hack should let personality
drive even when the measured signal is thin) is NOT implemented in v1; the min-sample valve's thin→dormant default
dominates (conservative). JK: confirm deferral or prioritize. (3) sim-tuned magnitudes in `TRAIT_ACQUISITION_TUNING`
(swings 0.25–0.35, gain 0.75 / lose 0.35) are §16 Simulation-Gate placeholders. (4) the 2-trait-cap displacement can
emit multiple gains all referencing the same weakest-held trait — L9b-3 (atomic write) must pick one.
**NEW (T10): backupRestore.ts stale-schema hardening** — the `trackerStores` registry is pinned at
`version: 12` and omits `franchiseTrueValueRows` (v13) / `franchiseDesignationRows` (v14) /
`franchiseSeasonLedgerRows` (v15); those silently drop on backup/restore and `getSchemaIssues` won't flag the
omission (it iterates the schema, not `db.objectStoreNames`). Separate backup-hardening ticket; T10 avoided a
new store so the §9 snapshot rides `seasonMetadata` (already registered) and does NOT inherit the defect.

## RECENT NON-PRODUCT CHANGE (2026-06-14)

AI-team operating setup added + reconciled: AGENTS.md bridge,
AI_TEAM_OPERATING_MODEL.md, .codex/config.toml, 31 mirrored Codex skills.
CLAUDE.md session-start corrected to the canonical 5-file ritual and stale
facts fixed (useGameState ~12,585 lines; suite count now points here, not
hardcoded). Browser-verification gate (Codex pre-checks, JK signs off) and the
Lessons-Learned pending-ratification pen are canon. CURRENT_STATE split into
this live header + CURRENT_STATE_HISTORY.md. Docs/config only — no app code.

Also added + verified: copy-based skill sync (.claude/skills + spec-docs/skills
→ .agents/skills) with a Claude Code PostToolUse hook (stdin/jq) — auto-fire and
delete-propagation both verified live; codex-ideation skill (Claude consults
Codex CLI as a READ-ONLY peer reviewer; round-trip + resume loop verified;
sandbox pinned read-only on all paths). Codex CLI installed (codex-cli 0.139.0,
~/.local/bin/codex).

## NEXT NON-PRODUCT BUILD (queued, next thread) — opus-audit wrapper

**Goal:** an `opus-audit` wrapper (sibling to codex-ideation) that lets a Claude
Code session INVOKE Opus 4.8 as the read-only auditor of a Codex build and
capture its verdict WITHOUT JK relaying text by hand. Opus stands in because
Fable is currently unavailable; if Fable returns, update the wrapper to target
it. Triangle preserved: auditor (Opus) ≠ builder (Codex); neither self-audits.

**PRE-BUILD UNKNOWN to resolve first (do not assume):** how is Opus 4.8
invokable as a CLI on this machine? codex-ideation works because a `codex`
binary exists; verify the equivalent entry point for Opus (likely the `claude`
CLI in a fresh non-Captain session, or another binary) BEFORE building. Same
diligence that caught the codex-install gap.

**JK RULING 2026-06-14 — risk-scoped audit automation (this is the wrapper's
contract):** Autonomous build↔audit↔fix loops ARE permitted, BUT the loop must
HALT and surface to JK (not auto-proceed) whenever a change touches ANY of:
(a) specs / gospel / design decisions; (b) user-visible behavior (anything that
changes what a player sees or how the app behaves); (c) persistence or data
integrity (storage, migrations, schema, saved-game shape); (d) the
SMB4-asset-protected systems (mojo, fitness, chemistry, fame, clutch, narrative,
etc. — the existing approval-gated list in SESSION_RULES); (e) anything the
auditor flags as a judgment call rather than a mechanical fix. BELOW that line
(internal refactors, test/type fixes, dead-code removal, wiring bugs with no
behavior change) the Codex↔Opus loop runs to verified-complete and JK sees the
RESULT once, not the chain. Rationale: the decorrelated two-AI loop does the
engineering verification; JK's irreplaceable judgment is classifying when an
"engineering fix" has crossed into a DESIGN/behavior decision — so the loop must
stop AT that boundary, not barrel through it. This maps onto the existing
risk-tiering (very-high reasoning for engine/state; medium for scoped fixes).
Weak point to engineer carefully: the auditor's self-classification must be
STRICT about calling behavior/spec touches → halt; over-halting is the safe
direction, under-halting is a bug to fix immediately. Watch the first loops
closely before trusting unattended. "Verified complete" still ≠ "JK approved" —
JK's browser pass remains the close even for low-risk auto-loops.

**Also queued for that thread:** add the risk-scoped rule above to
SESSION_RULES.md as a ratified non-negotiable (JK already ruled it 2026-06-14;
write it in on build).
