# V1 BUILD STATUS — SINGLE SOURCE OF TRUTH

> **THIS is the one status doc for v1. Scope: A-to-Z, LEAGUE SETUP → END OF REGULAR SEASON.**
> Playoffs/offseason DEFERRED (Decision E). In-season GM tools (dead-cap display, call-ups, trades advisor) = a SEPARATE thread, excluded here.
> **As-of: 2026-07-07**, git-grounded (trunk HEAD `7b5214ca` + docs commits). Update this doc IN PLACE as work lands — do not spawn a new status doc.
> Every other v1 "status/roadmap/plan" doc is SUPERSEDED (see §5). When in doubt, this doc + the code win.

---

## §0. 2026-07-07 UPDATE (Fable, evidence-classed — read this before the body)

**Evidence legend:** [git]=command run 2026-07-07 · [read]=doc/log read in full · [browser]=seen rendering · [UNVERIFIED]=assume broken.

1. **ASSEMBLY EXECUTED (corrects §2 below):** `claude/v1-draft-ui` AND `claude/lineups-fenway-hub` are both MERGED into trunk [git: merge-base --is-ancestor both ✓]; trunk advanced 74 commits 2026-07-02→04 [git]: C2B second-price market + C3 pool sizing/FS-3 launch fix [read: CURRENT_STATE 07-02 header], asst-GM B-series (B1/B2/B5, bid-vs-pass board wired), require-a-closer, the pool-affordability arc (repricing/seating/cheap-depth/swap-down), D17 positional scarcity, AUTH-4 finale, hard-cap Phase 1 + legality-by-construction fix a20ff1a6 [read: DECISIONS_LOG 07-02..07-04].
2. **Trunk baseline MEASURED [git, executed]:** build exit 0; full suite **8,983 pass / 1 fail / 8 skip (589 files)**. The 1 failure's identity to be named in the next gate run.
3. **LINEAGE RULING (JK 2026-07-07):** this trunk = THE PRODUCT. GitHub PRs #8–#18 (all opened+merged 2026-07-07 [git: gh pr list]) built a parallel line on a May-21 base: PR #9 was a content snapshot OF this trunk [git: core files byte-identical]; PRs #10–#17 added genuinely-new draft-economy work (pool balance/quality/source presets, cap-fit diagnostic, liquidity-aware bidding, a 19-file headless auction-sim harness) which is being PORTED here (port map in `PATHWAY_TO_V1_2026-07-07.md`; files verified ABSENT on trunk [git]). The GitHub line will be archived after the port; trunk becomes published main (Pathway Phase 0c).
4. **UI TRUTH DEMOTION (JK ground-truth, browser 07-03/04):** the RUNNING app is an old/new amalgamation. Every "[UI] DONE" in §3 hereby means "exists in tree", NOT "is what renders". Proven instance [git]: `/franchise/:id` still routes the OLD FranchiseHome (App.tsx:334) while the lens/fenway hub sits at `/__preview/franchise-lens` only (App.tsx:419) — merged, never routed. NO UI status is trusted until the Phase-1.5 **UI TRUTH MAP** (route-by-route browser walk, row-count == router-count, screenshot per row) exists and JK rules the cut-over. `UX_NORTH_STAR.md` §3's binding disposition table (KEEP/RESKIN/FOLD/KILL incl. R-IA6 lens-is-the-hub, R-IA7 dev-gate previews) is the design layer the map inherits.
1b. **PORT LANDED (PR #19, 2026-07-07, main @ 292112ad):** the #10–#17 economy work is ON MAIN (pool presets, cap-fit, liquidity bidding, auction-sim harness). Post-port suite 9,079 pass; failures = the named wpa pre-existing + DraftSetup batch flakes (solo-green). Opus audit: APPROVE.
1c. **CUT-OVER LANDINGS (2026-07-07):** PR #20 baseline fully GREEN (wpa allowlist traced: 4 read-only materializers, guard intact). PR #21 dev-gated 16 leaked /__preview routes (browser-verified prod 404) + archetype help harvest (15→24). PR #22 floor fixes: in-session recompute + shills-advisory floor per JK ruling — 30-club room locks with ZERO hand-adds (browser-proven: pool 660 = exact demand). Hub flip + farm fold STOPPED at parity gates → tickets LENS-PARITY (building) + FARM-STAGE (queued). Economy: measurement campaign committed (pool FIXED, money BROKEN, evidence → Lever A); JK ruled Fork A; FABLE_RESERVE_PRICE_DESIGN committed; Lever A building. Escalated: CPU identity auto-assign (gates lock UX for big rooms; queued behind Lever A — same page surface).
1d. **THE FENWAY HUB IS LIVE (PR #24, 2026-07-07):** /franchise/:franchiseId renders FranchiseLens; old FranchiseHome unrouted (file retained until the walk). Full loop browser-proven (setup wizard → lens → add game → SCORE → GameTracker w/ lineups). Ballpark kit + dev-speak copy kills landed (PR #23). CARRY-FORWARD: lens seasonNumber reads URL param (default 1) — derive from franchise metadata BEFORE any multi-season work; manual lineup-benchmark button unwired (auto path intact).
1e. **JK RULING (2026-07-07): ELIMINATION MODE IS OUT OF v1** — a separate path from Mode 1/Mode 2 entirely. No v1 work on it (no builds, no hides, no reskins); its screens are exempt from the zero-old-screens walk, which covers the league-build → draft → franchise → season journey only. Manifest rows touching elimination = OUT-OF-SCOPE/leave-alone.
1f. **LEVER A MERGED (PR #25, 2026-07-07):** reserve prices live (k dial default 0.65, k=0 = old economy bit-identical). Audit arc: REJECT (k>0 infinite loop, reproduced) → remediation (bounded renomination, falsification-proofed harness) → APPROVE (independently verified). Measured: free talent dead, fairness 0→7/11 scenarios; RESIDUAL for next lever: spot-11 pacing + big-league completion pressure. Exhaustion amendment recorded in the design doc. **JK feel-pass on a real draft = pending gate.**
1g. **ORPHAN/WIRING MATRIX COMMITTED (2026-07-07):** spec-docs/ORPHAN_WIRING_MATRIX_2026-07-07.md — 137 rows from 15 tracers + critic: 28 wired-live, 28 built-dark-by-design, 28 partial, 21 orphaned, 12 missing, 8 spec-drift; **50 pre-tuning blockers** (§2, headline = production flag-flip mechanism for the 11 soul flags); §3 = 7 JK decisions; §4 = retirement list. CAVEAT: some UI verdicts cite the pre-lens-flip truth map — re-walk required (matrix item 7).
1h. **MODE-1 PUNCH LIST + GAUNTLET (2026-07-08):** spec-docs/MODE1_PUNCHLIST_2026-07-08.md — JK Friday findings F1-F5 (deterministic nomination order, farm bands missing/wrong-source, generic scout pool, inflated prospect curve, style mismash) + P1-P12 + the gauntlet grid + the new ILLOGIC-PASS audit lens (behavioral coherence, GM-eyes). Mode 1 validated to error-free CONCURRENTLY with the Mode-2 wiring wave (disjoint file surfaces). Definition-of-done for JK A-Z draft testing = punchlist §5.
1i. **F4 PROSPECT CURVE LANDED (2026-07-08, lane/m1b-curve):** farm prospect generation now uses the `PROSPECT_GENERATION_SPEC` §3.2 grade curve as a seeded pool-level quota sequence before the existing `scoreSmb4Player` inverse rating solver. Permanent opt-in invariant added at `scripts/farmProspectDistribution.test.ts` (`RUN_FARM_PROSPECT_DISTRIBUTION=1`, N=500 through real farm auction/prospect pool path). Before: B- +2.0pp, C +2.2pp, total abs 8.8pp exceeded the chosen max bucket 1.5pp / total 8.0pp tolerance. After: exact N=500 curve, total abs 0.0pp; existing 40k §13 prospect distribution check also 0pp grade deviations. No MLB pool shaping, IV curves, or oracle changes.
1j. **M2A PHASE-2 ACTIVATION MECHANISM LANDED (2026-07-08):** the 11 default-OFF soul flags now resolve `test override > persisted activation > compiled default`. Persistence reuses existing `kbl-app-meta.appSettings` key `franchisePhase2Activation` (no new DB/store/version bump). `/__preview/phase2-activation` is DEV/test-gated for tuning with global/per-flag controls; production UI stays dark until the Phase-5 migration-check/flip sequence. Gates: tsc pass; build pass; focused flag/soul suite pass 59/59; L-SIM smoke 24g all CRITICAL invariants green. Full suite has zero M2a reds; remaining known unrelated red is `LeagueBuilderDraftSetup.test.tsx` CUT2-2 30-club shill pressure, still failing solo on disabled `START THE DRAFT`.
1i. **MODE-1 P1 CPU IDENTITY AUTO-ASSIGN LANDED (2026-07-08, lane/m1c-autoassign):** Draft Setup THE CLUBS now has deterministic CPU identity auto-fill plus per-club reroll. It fills only missing slots by default, preserves user-set identities, excludes LOCKED draftability archetypes, defaults human clubs out unless explicitly included, and uses a visible leagueId:nonce seed. Gates: tsc pass, build pass, DraftSetup solo 60/60, constrained full suite 9,125 pass / 9 skip.
1k. **M2B ARM RATING LAST MILE LANDED (2026-07-08, lane/m2b-arm):** `armThrowingRate` now receives real expected-stats samples/actuals. Catcher arms use the existing RA-8 catcher CS-rate aggregator over stored `caughtStealingAgainst` / `stolenBasesAllowed`; OF arms use stored `outfieldAssists + baserunnersHeld` over LF/CF/RF games; players with no C/OF arm exposure omit the category so no adjustment fires. Pitchers still emit no arm signal. Gates: tsc pass; build pass; focused expectedStats/checkpoint suite 106/106; full suite showed only known `LeagueBuilderDraftSetup.test.tsx` batch reds, and the solo file rerun passed 60/60. Commit `00466697`.
5. **Plan of record for execution:** `spec-docs/PATHWAY_TO_V1_2026-07-07.md` (incl. PART 8 runbook: owners, gates, agent stand-down). Draft-economy thread governed by `DRAFT_ECONOMY_RESET_2026-07-05.md` (now committed; was stranded untracked). Score/Skip + score-only verified present [git: ScheduleContent.tsx:94-111]; trunk simulate code is hardcoded OFF [git: FranchiseHome.tsx:181] — dead code for the cut-over DELETE list.

---

## §1. CANONICAL SPEC CLUSTER (read these; everything else is history)

- **`V1_PLAN_2026-06-30.md`** — the operative critical path.
- **`V1_HANDOFF_2026-06-30_DRAFT_AND_LIVING_SEASON.md`** — the vision (§3.1 = the setup RE-DESIGN; the 24-archetype lock).
- **`SCOUTING_INTELLIGENCE_SPEC.md`** — the scout / Assistant-GM / auction-intelligence vision (v1 blocker). Supersedes `_V2` (draft) + `DRAFT_GUIDE_INTELLIGENCE_SPEC`.
- **`TEAM_ARCHETYPES_24.md`** — the 24 locked identities.
- **`IN_SEASON_CAP_DEADCAP_ANALYSIS_2026-06-30.md`** — draft economy (Option-A wrong-fit penalty; dead-cap on intrinsic).
- **`ASSEMBLY_PLAN_2026-07-01.md`** — the branch-merge runbook (git-confirmed).
- **`AUDIT_PREDRAFT_TO_SEASON_2026-07-01.md`** + the **FABLE-C1…C5 contracts** in `PROMPT_CONTRACTS.md` — today's decomposition of the draft-depth work.
- Living season: **`FRANCHISE_V1_LIVING_SEASON_SPEC.md`**, **`MODE_2_V1_FINAL.md`**.

---

## §2. THE GROUND TRUTH — branch/tree reality (this is the core drift)

**Nothing draft/hub is on trunk yet. "Built" usually means "built on a branch, not on trunk."** Assembly is the gate for everything UI.

| Tree / branch | Ahead of trunk | Holds | State |
|---|---|---|---|
| **trunk** `experiment/manager-wpa-window` (`/kbl-tracker`) | — | engines, soul layer, season/stats/WAR, **freeze backend**, season-finale + L-SIM | the base |
| `claude/v1-draft-ui` (`/kbl-draftlane`) | **+27** | all draft/auction/setup/scout UI + draft engines | **UNMERGED** |
| `claude/lineups-fenway-hub` (`/kbl-lineups-fenway`) | **+64** | the polished franchise-lens hub + finale/awards ceremony UI | **UNMERGED** |
| `claude/v1-soul-gaps` | 0 | (already in trunk) | drop |
| `claude/v1-playoff-driver` | +2 | headless playoff engine | park (playoffs deferred) |
| `codex/draft-setup-ui`, `codex/auction-draft-ux-rehaul`, `codex/mode1-v1-b`, `codex/draft-pipeline-fix` | contained/0 | ancestors/subsumed | drop (per ASSEMBLY_PLAN) |

Merge facts (git-confirmed 2026-07-01): draft-ui → trunk = **1 conflict** (`PROMPT_CONTRACTS.md`, base-aware union); hub → trunk = **0 conflicts**; draft-ui ↔ hub overlap = 3 files (union `main.tsx`; keep draft-ui's `AuctionStage.tsx` + `auction-theme.css`). `main` is 1108 behind / 0 ahead of trunk (clean FF later).

---

## §3. A-to-Z STATUS (13 stages)

Legend: **DONE** / **PARTIAL** / **NOT-BUILT**. Outstanding units tagged **[BE]** (backend) / **[UI]**.

### MODE-1 — setup → draft → freeze

**S1. League Build** (League Builder: leagues/teams/players/pool/import) — *on draft lane*
- BE **DONE** (CRUD + SML/MLB import + roster/tier cap). UI **DONE** (hub + all CRUD screens).
- Outstanding: [UI] conference/division editor (currently hard-coded empty) — *confirm if in v1 scope*.

**S2. Setup RE-DESIGN** (per-(league,team) shadow store + identity-bundle team-edit page + durable seats) — *the 2026-06-30 headline foundation*
- BE **NOT-BUILT** (no per-league override store; identity still on global team; seat spine partial/dark). UI **NOT-BUILT** (no identity-bundle editor; old scout-hire/staff-hire screens still live).
- Outstanding: [BE] per-(league,team) shadow-override store (identity ONLY, never roster/capIdentity) + register in backup/sync/L-SIM/save-slot; [BE] shadow-resolution read path wired to consumers; [BE] durable seat-name writer (the deferred "ticket #11"); [UI] the identity-bundle editor (GM/Asst-GM/Scout/Manager+style/Beat-reporter + MLB/Farm archetype dropdowns + draft board); [UI] relocate staffing into the team page + delete the old scout-hire/staff-hire screens; [UI] convert draft-setup entry from the `/__preview` mock hub to a real page that READS the pre-config.

**S3. Team Archetypes (24) + picker**
- BE **DONE** on trunk (24 locked, cap-shift math live). UI **PARTIAL** — the picker is wired on the draft lane but shows only **15** (its catalog is stale; the 24 never merged to the draft tree).
- Outstanding: [BE] port the 24-archetype module (trunk `efc7cfb6`) onto the draft lane → picker auto-shows 24; [UI] fix "15"→"24" copy; [BE] **reconcile the two archetype cap-vocabularies** (HISTORICAL_ARCHETYPES vs auction capIdentity/CAP_MODIFICATION_FRACTIONS — the V1_PLAN "7-pre" prerequisite); [UI] decide numeric trade-off readout vs plain chips (beware the value-inversion trap — don't bar-length by raw rating points).

**S4. The SCOUT** (farm prospect evaluation; 3/5/7 archetype-derived confidence bands)
- BE **PARTIAL** — farm archetype-derived 3/5/7 per-area bands are built, skipped ScoutHire no longer kills farm reads, generated pitcher arm slots now feed the Farm IV arm-slot layer, and the amended s8.4 overall band follows the prospect's primary rated area instead of the dead constant-5 mean. UI **PARTIAL** — farm auction renders banded reads and the ruled lot-card trait count, but the broader scout naming/farm-archetype placement work still belongs on the team/setup page.
- Outstanding: [BE] enforce/verify "wider farm bands than MLB" as a gauntlet invariant if still required beyond the 3/5/7 table; [UI] move scout naming + farm-archetype pick onto the team page; [UI] add the cap-space risk-discipline headline.

**S5. The ASSISTANT GM intelligence** (the v1 HEADLINE — largely UNBUILT) — *= FABLE-C1/C2/C3*
- BE **PARTIAL→mostly NOT-BUILT** — reusable primitives (buildBestRoster, poolFeasibility, evaluateCpuValuation, auctionMaxBid, selectNextNominee) exist, but the actual intelligence is not built. UI **PARTIAL** — a `DraftGuideCard` placeholder (heuristic thresholds, ±spread "price range", naive position-count fit; bargain/trap flag never populated).
- Outstanding: [BE] the strategy-first optimizer (per-position priorities → best build path) + the Conservative/Optimal/Aggressive posture dial (**FABLE-C1**); [BE] the Second-Price market model (clearing ≈ runner-up + increment; own_need × scarcity; low/median/high band that widens for shills/early/thin) + type EstimatedMarket/CompetingTeamProfile/ShillProfile (**FABLE-C2**); [BE] the surplus/bargain signal; [BE] **THE KILLER FEATURE** — deterministic bid-vs-pass board re-projection; [BE] the accurate completion-floor (strip projectedTax); [BE] bid-log infra (Lot.bidLog + AuctionResult.{bidderSet,underbidder,numBidders}); [BE] nomination-timing overspend-vs-wait; [BE] `auctionTuningSim` calibration test (~85-90% band coverage — the pre-ship gate, absent today); [UI] the ONE live board + posture dial; [UI] the per-position-priority input (ROBUST/SIMPLIFIED); [UI] the bid-vs-pass split view; [UI] replace the placeholder DraftGuideCard internals.
- **Blocked on:** the player-archetype taxonomy ("Move 2", undesigned) for the ROBUST dropdowns; and the per-league layer (S2) to hold the inputs.

**S6. The DRAFT EVENT** (live auction floor + farm + shills + mock + public/private)
- BE **PARTIAL** — engine-driven nomination + one-chance + shill engine + crash-safe per-pick persistence BUILT (on trunk); shill split-classifier BUILT. Gaps: dissolve-to-pool for a winning shill NOT wired (**FS-3 latent landmine**: shill count >0 can block the freeze — safe only because default=0); mock-draft toggle NOT built; second-price/bid-log/accurate-floor unbuilt. UI **PARTIAL** — the premium `AuctionStage` (MLB) is on the draft lane, **unmerged**; farm auction is a separate legacy layout (not on AuctionStage); no mock toggle; the Draft-Setup hub that captures GM/archetype/shills is a `/__preview` mock that persists nothing.
- Outstanding: [BE] dissolve-to-pool bridge (RB-10b) + FS-3 fix; [BE] mock-draft toggle (gate both durable writes); [BE] bid-log infra; [UI] merge AuctionStage to trunk; [UI] put the farm auction on AuctionStage; [UI] mock toggle control + badge; [UI] real persisting Draft-Setup page (replaces the preview mock).

**S7. DRAFT ECONOMY** (tiers → cap, luxury tax, wrong-fit penalty, freeze inputs)
- BE **PARTIAL** — tiers/per-team cap, archetype-shifted luxury tax, dead-cap engine (0.75 on intrinsic), and the 4-number freeze inputs all BUILT. **The Option-A wrong-fit penalty (visible draft-budget debit shown before the bid) is NOT built** — the off-fit cost is still the invisible projectedTax reserve. UI **PARTIAL** — tier selector + "most you can bid" exist; no visible "true cost = bid + penalty" line.
- Outstanding: [BE] the graduated wrong-fit penalty, actually debited + stored separately at sale; [UI] the visible "true cost" line before the bid; [BE] lock capIdentity for the auction's duration (anti-dodge); [BE] §16 tune the cap magnitudes + penalty curve.

**S8. FREEZE → season handoff** (4-number freeze) — **CORRECTION: this is on TRUNK, not just the lane**
- BE **DONE** on trunk (merged `e75836b0`; draftFreeze/draftMorale/draftFanMorale wired into franchiseInitializer; morale baselines + settled salaries + draft-baseline TV rows written; 14 Mode-2 consumers read them). UI **PARTIAL** — trigger exists; no post-freeze summary; the setup→auction UI that FEEDS the freeze is unmerged (on the lane).
- Outstanding: [UI] post-freeze summary (starting morale/fan-morale/salaries — silent today); [BE] auction-only guard/assert; [BE] confirm morale-store 4-registry coverage. (Mock toggle listed in S6.)

### MODE-2 — living season → end of regular season

**S9. Hub + season launch + schedule**
- BE **DONE** on trunk (season creation, manual/CSV schedule with no-simulate policy, standings recompute, next-game pull, offseason gate correctly flag-off). UI **DONE** on trunk (functional franchise hub) — the **polished** franchise-lens hub is unmerged on `lineups-fenway`.
- Outstanding: [UI] decide the canonical hub (merge the polished one vs keep trunk's) + canonicalize the duplicate lineups editor to one.

**S10. Season play + stats/standings/WAR** — the mature backbone
- BE **DONE** / UI **DONE** on trunk (GameTracker → processCompletedGame → season/career aggregation → bWAR/fWAR/rWAR/pWAR → standings → season-end finalize). Test-covered.
- Outstanding: [BE] minor hygiene (delete orphan `aggregateGameToCareer`; verify the dual-copy milestoneAggregator stays in sync); [BE] prove a full simulated regular season end-to-end (score-only games through the same WAR/awards path).

**S11. Soul layer + flags** (fame, player+fan morale, narrative/reporter, rivalry, checkpoint development, honors)
- BE **DONE, built-dark** on trunk behind **11 default-OFF Phase-2 flags** (MORALE, FAME, FLASHPOINT, CHECKPOINT, TRAITS, L10, L11, L12, L13, L14, STADIUM_RECORDS) — flippable only via test hooks today. UI **PARTIAL** — read-paths exist but show fallbacks (stores empty while flags OFF); missing surfaces listed below. **L14 rebrand has no caller** (unwired). morale→in-game-WAR is INTENTIONALLY deferred (morale drives development only — do NOT "fix").
- Outstanding: [BE] wire L14 rebrand trigger; [BE] a **production activation mechanism** for the 11 flags (test-only today); [BE] the checkpoint-development ADOPTION write path; [UI] morale ledger/history view, fan-morale dashboard + dampener readout, rivalry board, checkpoint confirm console, manager hot-seat/firing, L14 rebrand flow; [UI] wire the beat-reporter newsboard to render live season takes. (§16 tuning covers all soul constants.)

**S12. Finale + L-SIM hardening + ASSEMBLY**
- BE **DONE** on trunk (season-finale chain: freeze TV artifact → WAR awards (8 categories + MoY) → honors emission; fame reach-floor ratchet + snub morale **decoupled from the LLM nod** — fire regardless; **26 L-SIM soul invariants + a 39-case falsification harness** driving the REAL production chain). All L12-gated (the flag to flip). UI **PARTIAL** — awards-ceremony UI is spec-only on trunk; the real ceremony/newsboard lives on the unmerged hub branch.
- Outstanding: **[assembly]** commit ASSEMBLY_PLAN (untracked); merge draft-ui → trunk (1 conflict) then hub → trunk (0), branch-only + JK-gated; run L-SIM (60g leg LAST) for byte-identical proof. [BE] **the freeze→REAL-frozen-franchise L-SIM bridge** (the single riskiest line — unbuilt; depends on assembly + setup-spine). [BE] §16 tuning (~100 feel-numbers, all 0 today — the single largest remaining piece). [BE] saved-game migration check before the flag-flip. [BE] flip the 11 soul flags ON + full-season gate. [UI] flip the live `/franchise` route to the canonical hub. [UI] **JK browser sign-off** (sole acceptance gate). Open JK rulings: emission-snub live-green graduation; booger-glove fame direction; winner-honor prestige magnitudes.

---

## §4. THE CRITICAL PATH (ordered; V1_PLAN PHASE order)

1. **ASSEMBLY** (JK-gated, branch-only): commit ASSEMBLY_PLAN → merge draft-ui → merge hub → gate green. *Prerequisite for every UI item.*
2. **Archetype vocab reconciliation (7-pre)** + port the 24 to the draft tree.
3. **DRAFT DEPTH (the headline):** the setup re-design foundation (S2 per-league layer + identity bundle) → FABLE-C1 (roster-construction intelligence) → C2 (second-price market) → C3 (pool/advisor) → C4 (setup UI + 24 picker) → the auction gaps (dissolve/mock/bid-log/wrong-fit penalty/accurate floor) → scout archetype-derived bands.
4. **Setup-spine seams** (seat-write, freeze-confirm, draft-recap, persistence, post-freeze summary).
5. **L-SIM hardening:** the freeze→real-frozen-franchise bridge (riskiest — de-risk with a thin spike right after the draft-ui merge).
6. **PHASE 4 (strict order):** saved-game migration check → flip 11 soul flags ON → **§16 tuning** (~100 numbers) → flip live `/franchise` route → **JK browser sign-off**. (Flag-flip MUST precede tuning; tuning MUST precede sign-off.)

**Biggest remaining lifts:** (a) the Assistant-GM intelligence (S5, mostly greenfield); (b) §16 tuning over a live season; (c) the L-SIM freeze-bridge. **Most-mature (leave alone):** S8 freeze, S10 season play, S11/S12 soul+finale backend.

---

## §5. SUPERSEDED DOCS (add a banner pointing here)

Mark these stale (their branch maps + 15-archetype era + pre-re-design status are wrong):
`ROADMAP_TO_V1.md` (Jun-24) · `V1_BUILD_QUEUE.md` (Jun-22, self-flagged stale) · `FRANCHISE_SETUP_TO_SEASON_ROADMAP.md` (Jun-25) · `V1_ACTIVATION_READINESS_MAP.md` (Jun-26) · `V1_STATUS_AND_ASSEMBLY_PLAN.md` (Jun-27, already demoted to companion) · plus the Jun-20 `MODE1_V1_VERIFICATION` / `MODE1_LEAGUE_BUILD_TO_DRAFT_VISION` / `MODE2_V1_COMPLETENESS` and `SCOUTING_INTELLIGENCE_SPEC_V2` (draft) / `AUCTION_DRAFT_SPEC.md` (v1, pre-engine-nomination).

*(Banners not yet applied — pending JK confirm of this doc.)*
