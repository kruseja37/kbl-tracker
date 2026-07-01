# AUDIT: PRE-DRAFT → DRAFT → FREEZE → SEASON PIPELINE

**Date:** 2026-07-01 · **Auditor:** Opus 4.8 (Captain), 7-dimension parallel multi-agent sweep + adversarial verify pass (33 agents) · **Branch audited:** `experiment/manager-wpa-window` (HEAD `fd1f5961`) · **Contract:** DRAFT CONTRACT 0 (AUDIT-PREDRAFT-TO-SEASON) from `FABLE5_DISPATCH_QUEUE_2026-07-01.md`

> **METHOD:** Every finding cites a real `file:line` an auditor opened. Every CRITICAL/MAJOR finding was then re-read by a separate skeptical agent (default-to-REFUTED). All 36 survived; verify verdicts + corrected evidence are recorded per finding.

---

## LINE 1 — IS THE MODE-1 AUCTION LANE STILL MERGED AND CURRENT?

**✅ YES. The foundation is intact and current on trunk.** The Mode-1 auction-lane merge (`87a59ec0`) is a confirmed ancestor of HEAD (`git merge-base --is-ancestor` exit 0). The auction state machine, CPU shill bidding, the 24 locked team archetypes, the legal-roster module, and the draft→freeze→franchise handoff all live on `experiment/manager-wpa-window`. Trunk is a strict superset of `codex/franchise-v1-next` (0 behind / 111 ahead) and 1,108 ahead of `main`.

**The gap is not the plumbing — it is the INTELLIGENCE layer on top of it.** The pipeline can run an auction, commit rosters, and launch a franchise. What is missing/wrong is everything that makes the scout/GM *smart* and that keeps a roster *legal*.

---

## SEVERITY COUNTS

| | CRITICAL | MAJOR | MINOR | Total |
|---|---|---|---|---|
| Pre-draft setup | 3 | 4 | 1 | 8 |
| Roster construction | 2 | 2 | 2 | 6 |
| Auction / market | 2 | 2 | 2 | 6 |
| Freeze → season | 0 | 2 | 2 | 4 |
| Pool sizing | 0 | 3 | 2 | 5 |
| In-season advisor | 0 | 5 | 1 | 6 |
| Spec contradictions | 0 | 0 | 1 | 1 |
| **TOTAL** | **7** | **18** | **11** | **36** |

---

## SIX CROSS-CUTTING THEMES (the real story)

1. **The market brain does not exist.** No second-price price prediction, no `v_ij`, no bid-vs-pass projection, no CONTESTED signal, no calibration harness. (AUC-1, AUC-4, AUC-6) → **Fable Contract 2's entire scope, confirmed unbuilt.**
2. **The roster builder maximizes value, not identity, and enforces no positions.** The live auction uses a flat 22-slot scalar with zero position awareness; the "build-to-archetype" optimizer does not exist in production; the archetype-balance gate is test-only. (RCI-01, RCI-06, POOL-03) → **Fable Contract 1's scope, confirmed.**
3. **The canonical legal-roster module is an orphan, and consumers disagree with it.** `rosterConstruction.ts` (the single source of truth per JK directive) is consumed only by a test simulator. The auction, the in-season advisor, and the roster-move path all ignore it or re-derive conflicting rules — the advisor treats 1 catcher as legal; canonical requires 2 → **a GM can send down their only catcher.** (RCI-02, ISAGM-04, ISAGM-05)
4. **The identity-capture UI is mock-only.** The screen that captures GM name + team archetype + shills persists nothing; the real routed draft-setup screen never captures an archetype; the picker offers 15 of 24; no per-league team-instance store exists (identity bleeds across leagues). (PDS-01/02/03/04/06/07) → **Fable Contract 4's scope + a team-instance foundation.**
5. **Three unreconciled archetype vocabularies with no bridge.** The picker's catalog keys (15, display-only), the engine's `HISTORICAL_ARCHETYPES` (24), and the auction's `capIdentity`/`CAP_MODIFICATION_FRACTIONS` (different vocabulary) never connect — a picked archetype never sets the caps the auction applies. (PDS-06, RCI-03)
6. **Pool sizing is body-count only; the in-season advisor is passive and blind.** The only live pool gate is "enough bodies for 22×teams" (a pool of all outfielders passes); the composition engine is orphaned. The advisor is a read-only sidebar (spec wants a dedicated invoked surface) whose season stats are hard-coded "unavailable," so slump-aware advice cannot work. (POOL-01/02/03, ISAGM-01/02/03)

---

## FINDINGS BY DIMENSION

Legend — Kind: `ML` missing-logic · `SC` spec-code-contradiction · `SU` spec'd-but-unbuilt · `BUG`. Verify: verdict from the adversarial re-read.

### Dimension 1 — Pre-draft setup

| ID | Sev | Kind | Finding | Key evidence | Verify |
|---|---|---|---|---|---|
| PDS-01 | CRITICAL | ML | Per-league team-instance shadow-store (spec's "foundation, built layer-first") does not exist; team identity lives on the global singleton and bleeds across leagues. | `leagueBuilderStorage.ts:46-58` STORES has no team-override store; `capIdentity`/`farmCapIdentity` on global Team at `:150-151`; spec `SCOUTING_INTELLIGENCE_SPEC.md:41-51` | CONFIRMED (grep = 0 team-instance refs — absence total) |
| PDS-02 | CRITICAL | SU | The Draft Setup hub that captures GM identity + MLB/farm archetype + human/CPU + shills is a mock-only preview that persists nothing. | `DraftSetupHubPreview.tsx` all local `useState` (:31-38), hardcoded TEAMS (:16-25), docstring "wiring…later" (:12), "Start the Draft" has no onClick (:176-179); routed only at `/__preview/draft-setup` (`App.tsx:269`) | CONFIRMED |
| PDS-03 | CRITICAL | ML | The real routed Draft Setup surface never captures GM name or a team archetype — it's only the pool-shuttle/lock/player-edit screen. | `LeagueBuilderDraftSetup.tsx` (routed `App.tsx:322-323`) imports no ArchetypePicker/catalog, no gmName capture; GM name captured only later at franchise creation (`franchiseManager.ts:45`, `FranchiseSetup.tsx:1318-1332`) | CONFIRMED |
| PDS-04 | MAJOR | SC | Picker can offer only 15 identities; the locked set is 24, and the catalog is hand-maintained separately from the data layer. | `teamArchetypeCatalog.ts` = 15 entries (:42-115), `ArchetypePicker.tsx:138` maps them; `historicalArchetypes.ts` = 24 (test pins `.length===24`); 9 unpickable ids listed; `V1_HANDOFF:184-185` flags it | CONFIRMED |
| PDS-05 | MAJOR | SU | The MOCK-DRAFT toggle (v1, gates durable writes) is not built in any routed draft/auction path. | grep `isMock/mockDraft` = 0 in draft pages, `useAuctionDraft.ts`, session types; commit unconditional on AUCTION_COMPLETE; spec `SCOUTING_INTELLIGENCE_SPEC.md:225-231` | CONFIRMED (`excludeFromLeague` is not the toggle) |
| PDS-06 | MAJOR | SC | Two divergent, unreconciled team-archetype vocabularies: picker catalog keys vs the routed team-edit's manual `capIdentity` bands. | Picker persists a `key` string only in preview state; routed `LeagueBuilderTeams.tsx:539-586` stores `TeamCapIdentity{increase/decrease}`; nothing links them; `V1_HANDOFF:181-183` | CONFIRMED |
| PDS-07 | MAJOR | ML | The staff identity bundle (Asst GM / Scout / Manager style / Beat reporter names + draft boards) has no capture-and-persist surface at the pre-draft team layer. | Team record has only `managerName` (`leagueBuilderStorage.ts:143`), no gm/asstGm/scout/reporter fields; no routed team-edit UI; spec `:53-61` | **PLAUSIBLE** — GM name IS captured (at franchise-setup layer, `FranchiseSetup.tsx:1321-1333`); the truly-absent fields are Asst GM / Scout / Manager style / Beat reporter / draft boards |
| PDS-08 | MINOR | BUG | A stale second router (`src_figma/app/routes.tsx`) omits draft-setup/auction/snake routes — a latent trap; the live router is `src/App.tsx`. | `main.tsx:7` renders `./App.tsx`; the `createBrowserRouter` in `routes.tsx` is dead but authoritative-looking | CONFIRMED |

### Dimension 2 — Roster construction

| ID | Sev | Kind | Finding | Key evidence | Verify |
|---|---|---|---|---|---|
| RCI-01 | CRITICAL | ML | The live auction enforces roster slots as a flat 22-count scalar with zero position awareness — the spec-mandated position-aware `own_need` model is entirely absent. | `leagueBuilderAuctionPipeline.ts:23,86` flat count; `auctionStateMachine.ts:296,369,511` guards on scalar, decrements `:429`; grep `own_need/needMultiplier` = 0; spec `§5:132-135` | CONFIRMED |
| RCI-02 | CRITICAL | ML | `rosterConstruction.ts` (the canonical legal-roster module) is an orphan vs its stated purpose — consumed only by the balance sim + tests, not the auction/scout/advisor. | grep `from.*rosterConstruction` = only `archetypeBalanceSimulator.ts:28` + its test; module header `:3-7` says all 3 consumers must adopt it | CONFIRMED (documented pending-wire; severity high for a missing-integration) |
| RCI-03 | MAJOR | SU | Three unreconciled archetype representations; no bridge converts a picked archetype into the `capIdentity` the live auction applies. | HISTORICAL_ARCHETYPES (24) → orphan `poolFeasibility.ts:166`; auction `capIdentity` from `CAP_MODIFICATION_FRACTIONS` (`tierParams.ts:158`); catalog (15) display-only; `V1_HANDOFF:177-185` | CONFIRMED (HISTORICAL_ARCHETYPES has no live production consumer at all) |
| RCI-04 | MAJOR | SC | The auction completion floor uses the crude `min×slots − projectedTax` formula spec §6 explicitly says to STRIP and replace with a real legal-roster completion calc. | `rosterEngineConstants.ts:364-371` (`auctionMaxBid`), wired `auctionStateMachine.ts:216-225,301`; spec `§6:186-191` "Strip the projectedTax reservation" | CONFIRMED (file is `src/data/rosterEngineConstants.ts`) |
| RCI-05 | MINOR | SC | The draft roster board's advisory slot template contradicts LEGAL_ROSTER (shows DH + 5 SP + 6 RP+CP, only 1 C — no required backup C). | `DraftRosterBoard.tsx:45-68` vs `rosterConstruction.ts:20-35` (minCatchers=2, startingPitchers=4, no DH). Display-only → MINOR | CONFIRMED |
| RCI-06 | MINOR | SU | The strategy-first (build-to-identity) optimizer for `buildBestRoster` doesn't exist in production; the only one is the balance sim's pure value-maximizer, and its other importer is an orphan. | `archetypeBalanceSimulator.ts:159-163` objective = Σ iv − penalty; fit is only a seed (`:295-297`); `V1_HANDOFF:170-175` (prototype "built + reverted") | CONFIRMED |

### Dimension 3 — Auction / market

| ID | Sev | Kind | Finding | Key evidence | Verify |
|---|---|---|---|---|---|
| AUC-1 | CRITICAL | ML | The entire Second-Price market/price-prediction model (`v_ij`, 2nd-price clearing, needMultiplier, surplus, bid-vs-pass) is unbuilt — no such logic in `src/`. | grep across `src/` for all market terms = 0; only `archetypeFit` is inside the CPU shill's own bid (`cpuShillBidding.ts:155-167`); 3 spec types undefined; spec `§5:125-173` | CONFIRMED |
| AUC-2 | CRITICAL | SC | The live solvency floor uses the crude `min×slots − projectedTax` reserve spec §6 says to strip. | `rosterEngineConstants.ts:364-371`, live at `auctionStateMachine.ts:301-302,371-372`; projectedTax computed per lot `useAuctionDraft.ts:164`; spec `§6:186-191` | CONFIRMED (same root as RCI-04) |
| AUC-3 | MAJOR | SU | The bid-log infra spec says to add in v1 (`Lot.bidLog` + `AuctionResult.{bidderSet,underbidder,numBidders}`) does not exist — bid history is discarded. | grep = 0; `Lot` (`auctionStateMachine.ts:45-53`) + `AuctionResult` (`:68-74`) lack fields; `passBid:315-334` drops passer; spec `§5:167-169` | CONFIRMED |
| AUC-4 | MAJOR | ML | No price-band calibration harness; `scripts/auctionTuningSim.test.ts` is a roster-fill/shill-win sweep, not the spec's 85-90% coverage gate. | Test asserts only completion/no-shortfall (`:341-343`); no predictor/coverage/band; spec `§5:147-151` PRE-SHIP GATE | CONFIRMED (a predictor must exist first — AUC-1) |
| AUC-5 | MINOR | SC | CPU shill demand is a fixed seeded 2-band weight vector, not each shill's own hidden team archetype. | `cpuShillBidding.ts:387-396` (1 primary + 1 secondary over 6 bands); spec `§6:193-197`. (Confirmed shills correctly do NOT cap at IV) | CONFIRMED |
| AUC-6 | MINOR | ML | The v1-simple CONTESTED nomination cue has no signal in code. | grep `contested` = 0 in `src/`; nomination weighting itself is correct (`selectNextNominee`, exponent 2.5 default); spec `§5:164-166` | CONFIRMED |

### Dimension 4 — Freeze → season handoff

| ID | Sev | Kind | Finding | Key evidence | Verify |
|---|---|---|---|---|---|
| FS-1 | MAJOR | SU | The v1 MOCK-DRAFT toggle (skip BOTH durable writes) is not implemented on this trunk. | grep `isMock/mockDraft` non-test = 0; `useAuctionDraft.ts:252-253` + `useFarmAuctionDraft.ts:273-274` commit unconditionally; spec `:225-231` (the franchise `dryRun` is unrelated) | CONFIRMED |
| FS-3 | MAJOR | BUG | **Latent:** if shill count > 0, shill teams win players that get committed to rosters but excluded from the freeze, so their partial rosters fail the strict 22/10 handoff validation and BLOCK launch. Safe today only because default shill count = 0. | Shills = last N of nominationOrder (`cpuTeamRoles.ts:24-34`); commit iterates all teams (`leagueBuilderAuctionPipeline.ts:208-227`); `validateV1RosterHandoff` THROWS on ≠22/10 (`franchisePlayerStorage.ts:428-437`); freeze excludes shills (`franchiseInitializer.ts:741-756`) | **CONFIRMED** (auditor self-flagged UNVERIFIED; verifier upgraded to CONFIRMED — genuine latent MAJOR) |
| FS-2 | MINOR | ML | Team `controlledBy` ('human'/'ai') is read by auction/CPU-role logic but has no production writer, so it's always undefined. Impact bounded (CPU teams derived from shill count; franchise ownership from FranchiseSetup snapshot). | Defined `leagueBuilderStorage.ts:136`, read in 5 places, no writer; owner UI is the unwired preview | CONFIRMED |
| FS-4 | MINOR | ML | Freeze morale/True-Value writes are gated entirely on the MLB auction session existing; a franchise from a rostered league with no stored session copies rosters but silently seeds no draft-derived baselines. | `franchiseInitializer.ts:717-834` wrapped in `if (mlbSession?.session)`; captains still assigned so it launches, masking the gap | CONFIRMED |

### Dimension 5 — Pool sizing

| ID | Sev | Kind | Finding | Key evidence | Verify |
|---|---|---|---|---|---|
| POOL-01 | MAJOR | SU | `analyzePoolFeasibility` (the archetype-aware composition engine) is orphaned — no live caller anywhere. | referenced only in its own file (`poolFeasibility.ts:157`) + test; spec `:243,:265` slates it to be surfaced as the evolve tool | CONFIRMED |
| POOL-02 | MAJOR | ML | The only LIVE pool gate is a flat body-count model (22×teams floor + 1.2× oversupply warning) with no position/archetype check — an all-outfielder pool passes. | `LeagueBuilderDraftSetup.tsx:272` → `evaluatePoolSufficiency` (`leagueBuilderPoolBuilder.ts:252-260`); composition logic sits in the orphan; spec `§5:134-136` | CONFIRMED |
| POOL-03 | MAJOR | SU | `buildBestRoster`/`runBalanceSim` are test-only — the archetype-balance gate never runs in the live pipeline. | called only from `poolFeasibility.ts:166` (orphan) + 2 tests; `TEAM_ARCHETYPES_24.md:4-5` confirms it lives in CI; spec `:265` lists under "reuse" | CONFIRMED |
| POOL-04 | MINOR | SU | No shill-count recommendation exists — `cpuShillCount` is a raw setting defaulting to 0. | `auctionEngineConstants.ts:36,45`; grep for recommender = 0; spec `:197,:283` leaves the number OPEN (sim-tuning) | CONFIRMED |
| POOL-05 | MINOR | ML | The live pool is hand-curated from EXISTING players only; no generation/curation step ensures composition for the league's archetypes. | `leagueBuilderPoolBuilder.ts:191-225`; player generation wired only into `Builder.tsx`, not the pool path; spec `:56-57` | CONFIRMED |

### Dimension 6 — In-season advisor

| ID | Sev | Kind | Finding | Key evidence | Verify |
|---|---|---|---|---|---|
| ISAGM-01 | MAJOR | SU | The dedicated invoked "Assistant GM" surface is unbuilt; the advisor is only a passive read-only Team-Hub panel — exactly what spec §9.2 says to replace. | No advisor route in `App.tsx`; only `FranchiseRosterAnalyzerPanel` (`TeamHubContent.tsx:5975`, "Advisory only"); spec `:240` | CONFIRMED |
| ISAGM-02 | MAJOR | ML | The advisor is not performance-aware: season stats are hard-coded 'unavailable', so "your 2B is slumping" + within-season learning can't work. | `rosterAnalyzerFranchiseAdapter.ts:266-269` emits `stats:{source:'unavailable'}` for every player; engine always drops to low-trust; spec `:241` | CONFIRMED |
| ISAGM-03 | MAJOR | SU | The 'evolve-your-archetype' tool is unbuilt: pool-feasibility is orphaned and surfaced nowhere. | grep `evolve/changeArchetype` in `src_figma` = 0; `analyzePoolFeasibility` orphan; spec `:243-244` | CONFIRMED |
| ISAGM-04 | MAJOR | SC | The advisor re-derives its own roster-legality rules and DISAGREES with canonical `rosterConstruction.ts` (it treats 1 catcher as legal; canonical requires 2). | `rosterAnalyzerEngine.ts:316-327` own minimums {C:1,…}; drives the `position_coverage` warning `:759-782`; canonical minCatchers=2 (`rosterConstruction.ts:25`); JK directive `V1_HANDOFF:164-165,204-206` | CONFIRMED (materially changes advisor output) |
| ISAGM-05 | MAJOR | ML | In-season send-down/call-up execute with NO legal-roster enforcement — a GM can send down their only catcher. | `franchiseRosterMovement.ts:414-504` guards only option-limit/roster-status; no rosterConstruction import; wired live at `TradeFlow.tsx:311`; spec `V1_HANDOFF:208-209` | CONFIRMED |
| ISAGM-06 | MINOR | SU | The living-season clean-swap trade lever is non-executable (advisory preview only) while send-down/call-up execute — the move loop is partial. | `TradeFlow.tsx:887` "Non-executable advisory preview"; spec `V1_HANDOFF:207-208` | CONFIRMED |

### Dimension 7 — Spec contradictions

| ID | Sev | Kind | Finding | Key evidence | Verify |
|---|---|---|---|---|---|
| SC-CONTRA-001 | MINOR | SC | Canonical spec asserts nomination exponent 2.5, but the live code uses 2 (MLB) / 3 (Farm). **The CODE is right** — the per-tier split is a ratified decision; the SPEC text is stale. | spec `:154` (2.5) vs `useAuctionDraft.ts:410` (2) + `useFarmAuctionDraft.ts:471` (3); ratified `DECISIONS_LOG.md:2763` RB-2-Q3 | CONFIRMED → **fix the spec, not the code** |

---

## ASSEMBLY INVENTORY (informs Q1)

**The two primary UI streams are COMPLEMENTARY, not competing.** `claude/v1-draft-ui` owns the pre-season entry (playable auction → launch franchise); `claude/lineups-fenway-hub` owns the in-season home (Fenway franchise lens). New draft/scout UI belongs on top of both.

| Branch | ahead/behind trunk | What's on it | Recommendation |
|---|---|---|---|
| **claude/v1-draft-ui** | 40 / 27 | The playable end-to-end draft: archetype→capIdentity converter (+tests), couch-coop seats, shill scaling, scout-hire + in-auction guide + staffing ceremony, DRAFT_RECAP adapter, saved-auction guards, the 9 preview screens + 15-catalog. ~8.8k lines / 60 files, real wiring + integration tests. | **Fold in FIRST** as the draft/scout base |
| **claude/lineups-fenway-hub** | 58 / 64 | The Mode-2 Fenway franchise-lens hub: real-data adapters (roster/standings/schedule/almanac/awards/park/dossier/newsroom/soul-deltas), Lineups surface, call-up/send-down wired live, trade builder, award races, settable fitness→GameTracker. ~13.4k lines / 120 files (~40 are prototype PNGs/scripts). | **Fold in SECOND**, on top of draft-ui |
| codex/draft-setup-ui | 5 / 225 | 100% ancestor subset of draft-ui | **Drop** |
| codex/auction-draft-ux-rehaul | 194 / 46 | 100% ancestor subset of the hub | **Drop** (retire after hub lands) |
| claude/v1-soul-gaps | 0 / 51 | 0 unique commits — already fully in trunk | **Drop / delete** |
| claude/v1-playoff-driver | 43 / 2 | Headless playoff engine + L-SIM harness (no draft/hub UI) | **Park** (playoffs deferred per JK; independent lane) |
| codex/draft-pipeline-fix | 210 / 1 | One docs-only alignment brief, no code | **Cherry-pick the doc or drop** |

**MERGE MECHANICS:** The two primaries collide on exactly **4 files** (verified via `git merge-tree`):
- `src/App.tsx` + `src/main.tsx` — additive route/import registrations → **union both sets** (mechanical, ~10 min).
- `src/src_figma/app/components/auction/AuctionStage.tsx` + `auction-theme.css` — **add/add "pick one"**: draft-ui's AuctionStage (405 lines) is the live-wired one; the hub's (334 lines) is a redesign prototype → **keep draft-ui's**, reconcile the hub's styling as a follow-up.

**Recommended order:** rebase both primaries onto current trunk first → fold in draft-ui → fold in hub → drop/park the rest. Net conflict surface = 4 files; overall risk MEDIUM (only the AuctionStage pick-one), mechanics otherwise LOW.

---

## MAPPING TO THE FABLE BUILD QUEUE (what the audit confirms + adds)

**Confirms the contract structure is right** — every Fable contract maps to a verified real gap:
- **Contract 1 (identity-first roster + own_need):** RCI-01 (flat slots), RCI-03 (vocab bridge), RCI-06 (value-max objective), RCI-02 (adopt rosterConstruction). Confirmed foundational.
- **Contract 2a/2b (tuning harness + market model):** AUC-1 (no market model), AUC-4 (no calibration harness — vaporware confirmed), AUC-3 (bid-log infra), AUC-5/6 (shill archetype, CONTESTED). The 2a/2b split is validated.
- **Contract 3 (pool sizing):** POOL-01/02/03 (orphaned composition engine; body-count-only gate), POOL-04 (no shill-count recommender).
- **Contract 4 (UI + hub):** PDS-01/02/03/06/07 (mock-only identity capture; team-instance store; vocab), ISAGM-01/03 (dedicated advisor surface; evolve tool).

**Two additions the audit surfaces (not in the draft plan):**
1. **The legal-roster orphan is a cross-cutting theme, not just a Contract-1 line.** `rosterConstruction.ts` must be adopted by the auction (Contract 1) AND the in-season advisor + roster-move path (Contract 4 / living-season). Today the advisor actively disagrees with it (1 vs 2 catchers, ISAGM-04) and roster moves enforce nothing (ISAGM-05) → a GM can break a legal roster in-season. Fold this into Contract 1's "single legality source" mandate AND scope the living-season adoption explicitly.
2. **FS-3 is a latent launch-blocker that goes live exactly when Contract 3 acts.** Contract 3 will recommend a shill count > 0; the moment shills win players, the 22/10 handoff validation throws and blocks the franchise launch. **Must-fix before shills go live** — sequence it with Contract 3 (dissolve shill rosters to the pool / exclude shill teams from the handoff validation).

**One free spec-correction:** SC-CONTRA-001 — update the canonical spec's nomination exponent from 2.5 to the ratified per-tier 2/3. Doc-only.

---

## VERIFICATION NOTES

- 7/7 dimension audits + the inventory completed; every CRITICAL/MAJOR finding got an independent adversarial re-read. All 36 survived. One downgrade (PDS-07 → PLAUSIBLE: GM name is captured, at the wrong layer). One upgrade (FS-3: auditor UNVERIFIED → verifier CONFIRMED).
- Corrected file paths from verify (do not trust the draft evidence blindly): `rosterEngineConstants.ts` is under `src/data/`, not `src/engines/`; `MLB_AUCTION_ROSTER_SLOTS` lives in `leagueBuilderAuctionPipeline.ts:23`.
- This audit is code-vs-spec analysis. No code was changed. Browser/user-flow sign-off is a separate gate (JK).
