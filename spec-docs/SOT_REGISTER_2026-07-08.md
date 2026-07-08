# Source-of-Truth Register — Mode-2 Living-Season Systems (2026-07-08)

## 0. Purpose, method, standing rule

**Why this doc exists.** JK ruling 2026-07-08 (V1_CANON_2026-07-07.md §6) ordered a spec-anchored
re-verification of the Mode-2 living-season systems because the prior pass (ORPHAN_WIRING_MATRIX_2026-07-07.md)
was code-anchored: it walked the code bottom-up and reported what was wired, but did not first confirm
*which spec doc actually governs each system*. Code that is "correctly wired" to a stale or
non-canonical spec is still wrong. This pass fixes the ordering: first establish the canonical doc per
system (the register), then verify code against that doc, not against whatever doc happened to be cited
in the codebase or a prior audit.

**Method.** Four parallel miners censused the repo for "which doc governs system X" claims from four
angles (recent-commit/git-recency; the governance hierarchy itself — V1_CANON/V1_BUILD_STATUS/LSD;
decision ledgers/rulings; stray docs and `instructions/`). A reconciler merged the four into one register,
spot-verifying tie-breaks against the live repo. Ten systems — the ones with the highest tuning-blocker
risk — then got a full spec-vs-code walk: every requirement in the canonical doc checked against the
live code with file:line evidence, classified FED / DARK-BY-FLAG / DORMANT / MISSING / DRIFT / STALE-SPEC.
Checkpoint ratings adjustments and trait adjustments were excluded from the verify pass — they got their
own row-by-row reconciliation on 2026-07-08 and are not re-walked here.

**Standing rule.** This register is where any future work — an audit, a build ticket, a tuning pass —
looks up which doc governs a system before trusting it. **Update this file when a spec is ratified,
superseded, or a JK ruling changes a system's governing doc.** A stale register defeats its own purpose.

---

## 1. THE REGISTER

| System | Canonical doc | Date | Confidence | Competing docs (condensed) | Note |
|---|---|---|---|---|---|
| living-season spine/phases | FRANCHISE_V1_LIVING_SEASON_SPEC.md (LSD) | 2026-07-02 | high | V1_CANON_2026-07-07.md (scope contract above it); V1_BUILD_STATUS.md (status tier); MODE_2_V1_FINAL.md (engine detail, LSD amends); v1-simplification/MODE_2_V1_FINAL.md (duplicate-filename trap, superseded); FRANCHISE_V1_LIVING_SEASON_DSTACK.md (PROPOSED sequencing companion); ROADMAP_TO_V1/V1_BUILD_QUEUE/V1_STATUS_AND_ASSEMBLY_PLAN/FRANCHISE_SETUP_TO_SEASON_ROADMAP/V1_ACTIVATION_READINESS_MAP (all banner-superseded by V1_BUILD_STATUS); AUDIT_PASS_1..6 (pre-build-wave, stale) | V1_CANON line 95 names LSD "the cross-cutting authority," MODE_2 supplies engine detail. Newest binding word = V1_CANON §6 ledger (amended through 2026-07-08). |
| checkpoint ratings adjustments | RATINGS_ADJUSTMENT_SPEC.md | 2026-06-25 (ratified 06-22) | high | RATINGS_MEASUREMENT_WORKSHEET.md (companion producer-of-record); EOS_RATINGS_ADJUSTMENT_SPEC.md (PARTIALLY superseded — §449 Trait Wheel dead, chemistry-tier/manager-pool sections still cited live, needs per-section scoping); LSD §9 (stale "pending §18 verification" framing); RA1_FAME_MODEL_PROPOSAL.md (pinned §3A measurement model) | Never superseded — its problem is invisibility, not conflict. Not cited by V1_CANON/V1_BUILD_STATUS/LSD. Canon §6 declared it a pre-tuning MODE-2 BLOCKER; row-by-row reconciliation ran 2026-07-08 separately from this pass. |
| trait adjustments | TRAIT_MEASUREMENT_SPEC.md | 2026-06-24 (ratified 06-18) | high | TRAIT_GAIN_LOSS_THRESHOLD_SPEC.md (co-binding, §8 supersedes EOS §449); TRAIT_DETECTION_SCOPE_AUDIT.md (FINDING-150, 16/39+ built); TRAIT_SIGNAL_CERTIFICATION.md (**self-superseding — §VI overrides §D/§V; FINDING-150 proved builds anchored on the stale section**); EOS_RATINGS_ADJUSTMENT_SPEC.md §449 (deprecated); LSD §9 (stale) | Same invisible-to-governance pattern as ratings. Reconciled 2026-07-08, not re-walked here. |
| player morale | LSD §5-§7 (Master Morale Matrix) as amended by V1_CANON §6 MORALE FULL-WIRING ruling | 2026-07-07 (ruling); LSD 07-02 | high | MODE_2_V1_FINAL.md §17/§17.14 (base, LSD amends); DYNAMIC_DESIGNATIONS_SPEC.md; FRANCHISE_MODE2_MORALE_RELATIONSHIP_APPROVAL_MATRIX.md + _DECISION_WORKSHEET.md (both SUPERSEDED-BY-§24 stamped); instructions/franchise-design-system.md §7.3 (stale "morale genuinely inactive" claim) | Ruling orders all ~52 unwired matrix rows wired, no purge. UI-copy docs claiming morale is "blocked/not yet" are now wrong. |
| fan morale | LSD §8 (dampener) + §13 (four teeth) | 2026-07-02 | **medium** | MODE_2_V1_FINAL.md §20 (citation gap, not conflict); FAN_MORALE_SYSTEM_SPEC.md (**still "Status: Draft," Feb 2026, ZERO supersede banners — mis-anchor trap**); FAN_FAVORITE_SYSTEM_SPEC.md v1.1 | LSD §13 is where every in-window build was specced; the old standalone spec was never formally reconciled or bannered. |
| random events (L10) | LSD §10 as amended by V1_CANON §6 full-wiring ruling | 2026-07-07 (ruling); LSD 07-02 | high | L10_SCOPE_MAP.md (2026-06-18 recon; cadence since re-ruled continuous per-game per Q5) | Canon orders: confirm/apply pipeline, real intensity-dial input, catalog holes filled, live player-morale source, stadium resolution, reporter-tap caller. |
| **rivalry** | LSD §24 (REL-1 rivalry edge) as amended by DECISIONS_LOG 2026-06-27 RIVALRY-ENVY rulings + the RATIFIED pair PLAYER_RIVALRY_MATCHUP_ENGINE_SPEC.md + MATCHUP_ENGINE_RECONCILIATION_2026-07-08.md (reconciliation governs on conflict; carries the envy rulings in-body §0) | 2026-07-08 (ratification + reversal) | high | STADIUM_ANALYTICS_SPEC_V2.md §5.6 (park-record-overtake edge, "hop-6") | **Conflicts RESOLVED 2026-07-08:** the overtake→HISTORY ruling was REVERSED (canon §6, 2026-07-08 late) — overtake edges are genuine RIVALRY, charge future matchups per REL-6, shipped typing correct-as-built, retype ticket CANCELLED (guard: no second morale hit at the overtake moment); the 2026-06-27 envy rulings are now folded into the reconciliation doc §0. |
| relationships/chemistry | LSD §15 + §24 (LOCKED, REL-1..9) | 2026-07-02 | high | L13_SCOPE_MAP.md (recon behind the §24 taxonomy); FRANCHISE_MODE2_MORALE_RELATIONSHIP_* (both SUPERSEDED-BY-§24); CHEMISTRY_TRAIT_POTENCY_VALUATION_SPEC.md (self-marked RESEARCH/NOT RATIFIED — governs Mode-1 draft valuation, NOT living-season chemistry, do not conflate); FABLE_CHEM_POTENCY_DESIGN_2026-07-02.md (Mode-1 pricing design) | L13-Q11 ruling made §24 sole L13 authority (2026-06-19). |
| **matchup history** | PLAYER_RIVALRY_MATCHUP_ENGINE_SPEC.md **RATIFIED-AS-AMENDED 2026-07-08** + MATCHUP_ENGINE_RECONCILIATION_2026-07-08.md (governs on conflict; spawn rule = mutual-WPA per JK) | 2026-07-08 (ratification) | high | LSD §24.7 (REL-6 charged matchups — locked slice the engine composes with, never duplicates) | **Conflict RESOLVED 2026-07-08:** ruled BUILD-FOR-V1 (canon five-ruling batch item 1) and ratified via the reconciliation pass; build lane M-L queued with/after the morale wave (hard dep: morale ledger write-back). Overtake edges = RIVALRY per the 2026-07-08 reversal. |
| **beat reporter/news** | MODE_2_V1_FINAL.md §16 jointly with SCOUTING_INTELLIGENCE_SPEC.md §10 (per V1_CANON §4 row) | 2026-07-01 (scouting); MODE_2 06-11 | **LOW** | REPORTER_CERTIFICATION.md (2026-06-16 wiring truth: TWO reporter systems coexist, legacy narrativeEngine shown on hub, 2/5 cadences fire, leagueId keying); BEAT_REPORTER_DATA_MODEL_SPEC.md + BEAT_REPORTER_VOICE_SPEC.md (2026-04-17, effectively superseded-in-practice by certification findings, unbannered) | **Conflict, full:** the canon-cited design and the certified wiring reality diverge (dual-system split); LSD §18.1's ordered certify-and-connect read is still open as of 2026-07-02. |
| fame | LSD §20 (FAME LOCKED, FAME-1..14) | 2026-07-02 | high | RA1_FAME_MODEL_PROPOSAL.md (JK-ratified 06-22 WAR-floor companion, upward-only); FAME_INTEGRATION_SPEC.md (2026-04-14, stale, unbannered); fameEngine.ts tiers/thresholds (explicitly declared tech debt, not canon, by §20.8) | §20 header supersedes the doc's own §17.1 stub; forbids importing existing thresholds without ratification. Spec is clear; the known gap is spec→code. |
| awards/TV/season-end honors | LSD §3/§21/§22/§23 as amended by V1_CANON §5/§6 TV ratification | 2026-07-07 (ruling); LSD 07-02 | medium | L12_SCOPE_MAP.md + L12-4/L12-5; AWARD_TRUST_CONTRACT.md (D8 gate); PLAYER_NUMERIC_GRADE_AND_LEADERBOARD_SPEC.md (DRAFT, no code); MODE_2_V1_FINAL.md §19 (internally contradictory; resolved — all trades manual, §19 deferred to v2, §19's own text uncorrected) | TV drift RESOLVED in the canon ledger but LSD §3's frozen-draft-IV prose is not yet edited — a live mis-anchor for anyone reading LSD alone. |
| manager WPA/MOY | MWAR_STEP1_CONTRACT.md (3:2:1 net-from-zero, JK-ruled 06-26) as ratified by V1_CANON §6 MOY ruling | 2026-07-07 (ruling); contracts 06-26 | high | MANAGER_WPA_BUILD_PLAN.md + MWAR_RUNG2/STEP4/STEP5A + OPTIMIZER_INTERFACE_CONTRACT + WINDOW_AUDIT + SITUATIONAL_ADVISOR (companions); **KBL_MANAGER_WPA_IMPLEMENTATION_SPEC.md + KBL_WPA_ENGINE_REBUILD_SPEC.md + KBL_WPA_ATTRIBUTION_MULTIPLIER_TABLE_DRAFT.md + KBL_WPA_GAMETRACKER_AUDIT_SCRIPT.md (2026-05-14, describe the RETIRED architecture, NO supersede banners — worst unbannered-stale trap in the corpus)**; MANAGER_WPA_MOY_CERTIFICATION.md (certified the pre-rearchitecture metric, stale); T10_SCOPE_MAP.md (retired) | Ruling chain clean and ratified-as-shipped (low verify urgency); the action item is banners on the 4 May-2026 docs + re-cert, not a design question. |
| aging/development | RATINGS_ADJUSTMENT_SPEC.md §5 (age curve) + §6A (age bar-shift modifier) — the only spec'd aging machinery | 2026-06-25 | **LOW** | V1_CANON_2026-07-07.md §5 (places "aging" wholesale under Offseason = POST-v1, citing LSD §1/LS-1) | **Conflict, full:** canon says aging=post-v1; the ratified checkpoint engine builds an IN-SEASON age modifier as core v1. Likely two different meanings of "aging" (career carryover vs checkpoint fairness) — needs a JK reconciling ruling. No dedicated aging/development spec doc exists. |
| fitness | MODE_2_V1_FINAL.md §14 (Mojo & Fitness) | 2026-06-11 | medium | MOJO_FITNESS_SYSTEM_SPEC.md (2026-02-21; §14 header supersedes it, its own annotation keeps weighting/decay formulas "valid and authoritative" — partial survival) | Zero ledger activity since 2026-06-10 — either genuinely stable or genuinely unrevisited; cannot distinguish from docs alone. |
| injury | MODE_2_V1_FINAL.md §14.8 (Injury Tracking, User-Observed) | 2026-06-11 | LOW | TRAIT_MEASUREMENT_SPEC.md (Durable/Injury-Prone as traits — a different concern) | Only section anywhere naming injury as a system; V1_CANON §4 never names it (silently folded into the Mojo & Fitness row). No dedicated spec exists. |
| stadium/park effects (incl. carry A1.5b) | STADIUM_ANALYTICS_SPEC_V2.md | 2026-06-23 (decision-complete) | **LOW** | MODE_2_V1_FINAL.md §24 (the OLD park-factor/WAR model — **yet it is what V1_CANON §4 cites**, governance citation gap); STADIUM_ANALYTICS_SPEC.md (banner: superseded by V2 except the V8-deferred WAR model); RATINGS_MEASUREMENT_WORKSHEET.md (companion producer-of-record); PROMPT_CONTRACTS.md A1.5b/A1.5d (build orders); DECISIONS_LOG 2026-06-26 Park→WAR V8 (separate track) | **Conflict, full:** V2 wins as the newest JK-ratified engine spec with explicit supersession; canon's MODE_2 §24 citation predates V2's absorption — V2 appears NOWHERE in canon (zero grep hits) — and canon's own 2026-07-08 ruling leans on a V2 concept (the carry converter) as blocker evidence. Canon citing a superseded model loses to the newer ratified doc. |
| GameTracker living-season tracking inputs | V1_CANON §6 GAMETRACKER BRANCH FREEZE ruling + MERGE_CERTIFICATION_2026-07-08.md | 2026-07-08 (cert git-dated 07-07, tz artifact) | high | RATINGS_MEASUREMENT_WORKSHEET.md §2/§3 (de facto capture→signal contract); MODE_2_V1_FINAL.md §3/§4 (base spec, never updated for batted-ball capture); TRAIT_SIGNAL_CERTIFICATION.md §D (partially self-superseded) | Freshest ruling in the ledger; carves out ratings/trait/pitch-location tracking as the must-be-in-v1 GameTracker exception class, verified on main by the merge cert. |
| schedule/season config | MODE_2_V1_FINAL.md §22 (C-079/C-080) as amended by V1_CANON §6 RULES-V1-PRUNE ruling | 2026-07-07 (ruling); MODE_2 06-11 | medium | MODE2_SYSTEMS_INTEGRATION_MAP.md §4.4 (row-counting anti-pattern, F135-fixed); FINDINGS/FINDINGS_142_onwards.md FINDING-151 (2026-07-07 CONFIRMED-OPEN Lens PLAY-BALL parity gap) | §22 itself stable/uncontested; the RULES-screen prune ruling exists only in the canon ledger, no spec-doc home yet (work unit RULES-V1-PRUNE). |
| trade demand | LSD §13 (free-agency/trade inversions) as amended by V1_CANON §5 all-trades-MANUAL ruling | 2026-07-07 (ruling); LSD 07-02 | medium | IN_SEASON_CAP_DEADCAP_ANALYSIS_2026-06-30.md (self-declared NOTHING-ratified); PROMPT_CONTRACTS A1.3a (built) / A1.3b (**stale premise — was believed deferred, actually shipped in full**); TRADE_SYSTEM_SPEC.md + TRADE_FIGMA_SPEC.md (GM-initiated transaction UI — a DIFFERENT system, do not conflate); ROSTER_MOVEMENT_GAME_THEORY_SPEC.md (named as needed but DOES NOT EXIST) | No standalone spec; lives as a sub-block of the fan-morale teeth. Canon ruling: demand-driven departures ride existing morale teeth, all trade execution manual in v1. |

**Systems with no dedicated spec doc at all** (flagged by the census, not just unlisted):
- **matchup history** — only the unruled PLAYER_RIVALRY_MATCHUP_ENGINE_SPEC.md design-capture; needs a JK status ruling.
- **injury** — no dedicated spec; only the MODE_2 §14.8 stub, unnamed in V1_CANON §4.
- **aging/development** — no dedicated doc; machinery lives inside RATINGS_ADJUSTMENT_SPEC §5/§6A, in open tension with canon's blanket post-v1 ruling.
- **trade demand** — no standalone spec; governed as an LSD §13 sub-block + the canon manual-trades ruling.

---

## 2. A15B ORIGIN (carryConverter ticket)

PROMPT_CONTRACTS.md contract **A1.5b-CARRY-CONVERTER** (lines 18707-18764, verified) is the build order
for `carryConverter.ts`/`computeBattedBallCarry`. Its declared sources of truth (verified at line 18717):
STADIUM_ANALYTICS_SPEC_V2.md §2 ("the shared carry converter") + RATINGS_MEASUREMENT_WORKSHEET.md §2/§9
(carry × exit-velo → Power, air-balls only) + DECISIONS_LOG 2026-06-23 fork #6 (polar model + field-leak
gate). The ticket text first appeared in V1_BUILD_QUEUE.md (2026-06-23, commit `fe7f5bf1` — that queue doc
is now superseded by V1_BUILD_STATUS.md, but the ticket's origin specs remain live).

**V1 status: IN SCOPE BY DESIGN.** It was deliberately shipped build-dark as the PURE engine (step 1 of 2);
live wiring was explicitly deferred (A1.5b-2 SVG marker/field-leak re-derivation gate, then
A1.5d-STADIUM-RECORDS which lists A1.5b as a prereq). **Its orphaned state today is per-plan, not
abandonment.** However, V1_CANON_2026-07-07.md §6's 2026-07-08 ruling cites that same orphan as
pre-tuning-blocker evidence WITHOUT naming the origin specs, and canon's §4 stadium row still cites only
MODE_2 §24 + LSD §14 — **STADIUM_ANALYTICS_SPEC_V2.md is invisible to the entire governance layer.**

---

## 3. VERIFICATION RESULTS

Ten systems, spec-anchored, file:line evidence. Checkpoint ratings/traits excluded (separately
reconciled 2026-07-08). Class legend: **FED**=live input reaches it now · **DARK-BY-FLAG**=wired, waiting
on a Phase-2 flag (by design) · **DORMANT**=built, input available/derivable, nothing dispatches it ·
**MISSING**=no producer/system exists · **DRIFT**=built differently than spec says · **STALE-SPEC**=spec
text is what's wrong, not the code.

### 3.1 Stadium/park effects incl. batted-ball carry (A1.5b)
Anchor: STADIUM_ANALYTICS_SPEC_V2.md + RATINGS_MEASUREMENT_WORKSHEET §2/§9 + PROMPT_CONTRACTS A1.5b/A1.5d.
Counts: fed 13 · dark-by-flag 11 · dormant 3 · drift 3 · missing 2.

| Requirement | Class | Spec cite | Code anchor | Light-up |
|---|---|---|---|---|
| Carry converter feeds Power (carry×exit-velo) + stadium analytics, "one engine two consumers" | DORMANT | V2 §2-§3; Worksheet §2/§4-POWER/§9 | `src/engines/carryConverter.ts:123 computeBattedBallCarry` — zero production importers (only its own test); Power still box-score (`expectedStatsEngine.ts:45-46`) | A1.5b-2 SVG marker re-derivation (JK browser-gated) then wire carry×exit-velo into Power (RA-2). Exact evidence JK cited as the pre-tuning blocker. |
| Drawn SVG field markers must align to the polar model (field-leak gate) | DRIFT | V2 §2; Worksheet §7.2; PROMPT_CONTRACTS A1.5b:18710 | `carryConverter.test.ts:133` pins the mismatch: CF-fence apex r≈0.909 vs model 1.0; foul corners 221°/319° vs 228°/312°; IF diamond r≈0.37-0.50 vs 0.45 | A1.5b-2 `EnrichmentPanel.tsx` marker re-derivation + JK browser sign-off. Deliberately deferred, test-pinned. |
| Tighten spray-tap instruction to "where it FIRST hit the ground/wall" | MISSING | V2 §2 last bullet; Worksheet §7.1 | `EnrichmentPanel.tsx:1228` label is just "Field Location," no first-landing copy | One-line UX copy change (JK-visible). Without it an OF-fielded grounder reads as a liner and corrupts carry once wired. |
| §7 home-park rivalry: any opponent >.500 at your park (multiple allowed), vsRival→built-in multiplier freebie | STALE-SPEC | V2 §7 2nd bullet | `franchiseHomeParkRivalCompute.ts:44` implements the newer JK-ruled replacement (single directional rival by wins-at-park, sticky incumbency, per-season) — spec's "freebie" premise is false in the ruled model | Spec doc update only — code implements the newer ruled reality (already flagged, ORPHAN_WIRING_MATRIX row 144). |
| Home-park-rival games amplify fan swing at 2× (vs generic 1.5×) | DRIFT | V2 §7+§11; re-ratified 2026-07-08 | `fanMoraleEngine.ts:405` rivalMultiplier stays 1.5, fed only by static division-vsRival; shipped grudge = flat +2 fan/+1 captain (`masterMoraleMatrix.ts:171-172,427-428`) | Wire home-park-rival status into the fan-morale swing at 2×. **Already ruled+queued** — the single ruled-but-unwired item in the whole system. |
| §8 per-stadium stat-display: OPS/ERA/AVG/HR/K splits by (player,stadium), Team Hub filterable | MISSING | V2 §8 | Input captured (`gameStorage.ts:105,595,755`); Team Hub STADIUM tab exists but shows only spray rows — no per-(player,stadium) aggregator anywhere | Bounded aggregation over archived playerGameStats + a splits table in the existing tab. Parked "USER-VISIBLE → flag for JK." **NEW, unowned.** |
| §5.4 reporter emission for swing records (LLM, dedup, playContext) | DORMANT | V2 §5.4 | Pure adapter built+tested (`franchiseStadiumRecordNewsAdapter.ts:57`), zero callers; LLM seam intentionally unbuilt; `facts.playContext` hardcoded null | Rides the reporter-wave emission ticket (already owned — extends to all 8 dark emission kinds) + thread playContext from the stored record. |
| §3 "park-adjusted WAR is dark" claim | STALE-SPEC | V2 §3 | `warOrchestrator.ts:309-315`/`useWARCalculations.ts:249-255` now pass parkFactors (later V8 merge) | Doc note only, no code action. |
| §2 replace orphaned estimateDistance/estimateAngle trio | DORMANT | V2 §2; PROMPT_CONTRACTS A1.5b:18720 | `fieldZones.ts:735-809` still present, orphaned | Delete with the A1.5b-2/RA-2 live-wiring ticket (harmless until then). |
| §9 records-store policy booleans should flip to flag-gated | DRIFT | V2 §9 | `franchiseStadiumRecordsStorage.ts:53-61` hardcoded false — equivalent-by-design (mutation routed through flag-gated processCompletedGame taps instead) | None needed — record the design supersede in the spec. |
| §5.2/§9 per-bump fame sentinel | DRIFT | V2 §5.2+§9 | Superseded by a better design: bumps fold into the fame writer's single heat write (`franchiseFameCompute.ts:99-137`) | None — spec-text update only. |
| §4 thread hrDistance/handedness onto spray row | DRIFT | V2 §4+§10 | Superseded — fame builders read hrDistance/handedness inline from CompletedGameRecord; no spray-row change needed | None — equivalent, cheaper, shipped. |

Bottom line: the stadium-records machine is genuinely built and wired dark-by-flag end-to-end. The
real holes are exactly where governance already points: (1) A1.5b carry converter is the one
load-bearing DORMANT piece — Power still runs on SLG+HR/PA; (2) the ruled 2× home-park-rival fan
amplifier is unwired; (3) §8 per-stadium splits are MISSING; (4) the reporter LLM seam is deliberately
unbuilt pending JK sign-off. §7's >.500/multiple-rivals model and §3's WAR-park-arg claim are STALE-SPEC.

### 3.2 Player morale (Master Morale Matrix)
Anchor: LSD §5-§7 + V1_CANON §6 MORALE FULL-WIRING ruling. Engine: `masterMoraleMatrix.ts` (785 lines,
59 rows). Counts: fed 7 · dark-by-flag 10 · dormant 45 · missing 4 · drift 2.

| Requirement | Class | Spec cite | Code anchor | Light-up |
|---|---|---|---|---|
| "Who else is touched" cross-effects (teammate/clubhouse/captain) must land | DORMANT | LSD §5:94-98; §6 Charisma:114 | `franchiseMoraleState.ts:559` — no production caller ever passes `otherTouchedPlayerIds`; composed at `masterMoraleMatrix.ts:539-551` | Resolve teammate ids per relation (roster, captainPlayerId, position group) at each pCG tap. **Also the only channel where Charisma acts — until fixed Charisma is a no-op.** New finding, not in ORPHAN_WIRING_MATRIX. |
| Morale must reach development (morale→ratings/traits loop) | DORMANT | LSD §5:94; §24.10:644 | `franchiseCheckpointSweepCompute.ts:445`, `franchiseTraitGrantCompute.ts:135`, `franchiseL10SweepCompute.ts:153` all read static seeded `player.morale`; ledger has zero write-back | Point the three reads at `getFranchiseMoraleSnapshot`. Wider than the owned "L10 live player-morale source" item — this severs checkpoint dev and trait grant too. |
| 52 unwired matrix rows → wire per the FULL-WIRING ruling | DORMANT | V1_CANON §6:202; rows :308-432 | Only 7/59 rows dispatched | Cheapest tranche: 8 game-result rows — every signal already computed inside pCG's own `deriveCompletedGameResultContext` (:883-935). **Owned** (the ruling itself). |
| Roster-move rows (trades×4, call-ups×2, DFA) fire on live manual-move paths | DORMANT | LSD §5; V1_CANON §6 §19 ruling | `franchiseTradeAdapter.ts:224,592`, `franchiseRosterMovement.ts:98,269` self-document `moraleMutationApplied:false` | Dispatch at transaction commit; needs a star/salary-dump/depth classifier. Part of the owned wire-all wave. |
| MANAGER_FIRED consequences must come from the ONE matrix | DRIFT | LSD §5:94-96; §12 | `franchiseManagerFiring.ts:174-197` uses bespoke deltas, never `composeMoraleConsequence`; matrix row :411-413 dead weight | Route through an exact-delta tap, or formally retire the row. **Owned** (ORPHAN_WIRING_MATRIX §3 item 6). |
| Captain morale routing (Charisma×2 to teammates + amplified swings, LS-6) | DORMANT | LSD §4:84; LS-6:316 | `captainMoraleRouter.ts:18-23` self-documents "WIRING is a DEFERRED seam, NOT built," zero importers | Triple wire: feed CAPTAIN_BIG_GAME/SLUMP rows, apply router multipliers, fix the otherTouched drop. **NEW, unowned.** |
| ALL_STAR_SELECTION morale boost for selectees | DORMANT | LSD §22.3:529 | `franchiseAllStarLockPayouts.ts:22-27` applies snub morale but never the selectee row | One dispatch inside the existing L12 lock payout. Part of owned wave. |
| Flashpoint-decay fan-morale tax applied to the live ledger | DORMANT | LSD §13:227; V1_CANON §6 ruling | `franchiseFlashpointDecayCompute.ts:15-18` self-documents "does NOT mutate any fan-morale snapshot" | One call into `applyFranchiseMoraleEffect`. **Owned** (ruled wire-all, ORPHAN_WIRING_MATRIX known-issue #3). |
| Awards-snub morale leg reachable at season end | DORMANT | LSD §21.6:511 | Second caller only invoked from unrouted `FranchiseHome.tsx:3272,3312` | Port the isSeasonOver trigger into FranchiseLens. Same fix as the known fame-honors stranding — **owned**. |
| Streak rows (8) need a per-team streak detector | DORMANT | matrix :323-334 | Nothing on the franchise pCG path counts streaks | Small per-team win/loss streak counter dispatched at pCG. Part of owned wave. |
| RIVALRY_SWEEP/SWEPT_BY_RIVAL | MISSING | matrix :375-380 | Schedule model has no series/sweep semantics | Needs a consecutive-games-vs-rival detector — new input, JK add-or-cut fork. |
| WEEKLY_AWARD row | MISSING | matrix :357-359 | No weekly-award system exists anywhere | Ride POG-of-the-week or cut — JK fork. |
| SEND_DOWN/demotion row absent from the matrix | MISSING | V1_CANON §5:148 ("morale-tied demotion" IS v1) | `PlayerCentricMoraleEventType` has no SEND_DOWN | Add a SEND_DOWN row + dispatch at roster-movement commit. |
| CLINCH_PLAYOFF/DIVISION/ELIMINATED/CHAMPIONSHIP | DORMANT | V1_CANON §6 carve-out | matrix rows :364-372,:384-386 | No v1 action — defer with playoffs. |
| Sparse-input rows (BLOWN_SAVE, GAME_SAVING_PLAY) depend on gameState.fameEvents | DORMANT | matrix :395-400 | Fame-events channel is the known sparsely-populated one (ORPHAN_WIRING_MATRIX §14) | Inherits the fame-events persistence fix. |
| §7/§8 personality + dampener multipliers match spec values | DRIFT (verified match) | LSD §7:123, §8:137-147 | `masterMoraleMatrix.ts:204-254`, `fanMoraleDampener.ts:19-31` — exact match | None — recorded so tuning knows the shape is spec-true; all §16 SIM-TUNE placeholders. |
| Legacy non-matrix fan-morale writer (Random Event Log panel) | DRIFT | LSD §5 one-matrix rule | `franchiseRandomEventLogStorage.ts:378` applies morale via legacy formulas; sole consumer unrouted | Retirement candidate — delete/gate before flag flip. |
| Production flip surface for the MORALE flag | DORMANT | ORPHAN_WIRING_MATRIX §2(a) | Persisted activation + console exist but routed DEV/test-only | Launch blocker, not a tuning blocker. |

Bottom line: the matrix engine is spec-true (one deterministic table, personality × 4 modifiers, dampener
values exact, live ledger UI) but only 7/59 rows + 3 tap lanes are ever dispatched. Three cross-cutting
severed wires matter most: (1) `otherTouchedPlayerIds` never resolved — kills every fed row's cross-effect
plus makes Charisma and Captain routing complete no-ops; (2) morale→development is severed at input
(checkpoint/trait/L10 all read the static draft seed); (3) flashpoint tax and season-end snub legs
compute but never land. Fix those three plus the 8 game-result rows first — highest leverage, no
magnitudes need touching until §16.

### 3.3 Random events (L10)
Anchor: LSD §10 + §11 confirm model + L10_SCOPE_MAP.md. Counts: fed 6 · dark-by-flag 8 · dormant 3 ·
missing 7 · drift 0.

| Requirement | Class | Spec cite | Code anchor | Light-up |
|---|---|---|---|---|
| Confirm/apply pipeline (two-tier: user confirms, app mutates; name-change opt-in at confirm) | MISSING | LSD:189,203-206; L10_SCOPE_MAP:90 | `franchiseL10OverlayStorage.ts:104-140` reads have zero consumers; every row `confirmationStatus:'pending'` | Build an l10OverlayConfirmation engine + confirm-apply util mirroring the traits pair. **Owned** — named explicitly in the FULL-WIRING ruling. |
| Temporary-event time-boxing + auto-expiry | MISSING | LSD:179,206 | Row shape has no duration/expiresAtGameNumber field; magnitude is a flat placeholder | Add duration fields now (store still dark); expire in the future apply layer. Rolls into the owned confirm/apply build. |
| Intensity dial (Juiced/Standard/Nerfed) as a user-set global | DORMANT | LSD:193; L10_SCOPE_MAP:61 | Multipliers implemented but input hardcoded `DEFAULT_L10_INTENSITY='standard'` | Add a franchise-settings intensity field. **Owned** (ORPHAN_WIRING_MATRIX known-issue). |
| Reporter tap — fired events surfaced through the beat reporter | DORMANT | LSD:174,187; L10_SCOPE_MAP:55,65 | `franchiseL10NewsAdapter.ts:49-83` self-documented DARK/ORPHANED-PENDING, zero callers | Wire at the post-confirm seam. **Owned** (part of the 8-dark-emission-kinds ticket). |
| Stadium-change apply — a fired event actually relocates the park | DORMANT | LSD:185,255; L10_SCOPE_MAP:54 | `franchiseStadiumChangeResolver.ts:42-106` built, pure, tested, self-documented ORPHANED-PENDING | Consumed by the future confirm/apply step (rolls into item 1). |
| Performance-family concrete catalog (breakout/regression/clutch-gene/yips + temp semantics) | MISSING | LSD:179 | Engine emits only hot_streak/slump placeholders | Extend to concrete sub-types or build the promised within-family resolver. **NEW, unowned.** |
| Pitching-family concrete catalog (velocity bump/dip, new arm angle) | MISSING | LSD:180 | Only gain_pitch/lose_pitch_feel emitted | Same within-family resolution. **NEW, unowned.** |
| Role-family concrete catalog (change primary position, utility) | MISSING | LSD:182 | Only gain_secondary_position emitted | Same. **NEW, unowned.** |
| Cosmetic-family concrete sub-types (facial hair, accessory, stance, walk-up, number) | MISSING | LSD:183 | Generic placeholder only | Resolve at roll or confirm time — low stakes. **NEW, unowned.** |
| Team-family holes (promo night, rivalry flare, manager-fired-crisis) | MISSING | LSD:185 | Only front_office_mandate + stadium_change emit | Add 3 sub-types; needs a JK call on whether L10 may trigger firings. **NEW, unowned.** |
| §10 cadence text describes checkpoint sweeps | STALE-SPEC | LSD:189 vs L10_SCOPE_MAP:59,77 | Code implements the ruled continuous-per-game reality correctly (L-SIM invariant confirms) | Amend §10's cadence paragraph. |

Bottom line: L10's SELECTION half is genuinely built and healthy (weighted rolls, continuous cadence, trade
demands, determinism) — the APPLICATION half is absent: no confirm console, no apply step, no expiry, the
reporter adapter and stadium resolver are caller-less. Five of nine event families emit only generic
placeholders. Zero drift found in what exists.

### 3.4 Fame
Anchor: LSD §20 (FAME-1..14) + RA1_FAME_MODEL_PROPOSAL.md. Counts: fed 14 · dark-by-flag 14 · dormant 5 ·
missing 5 · drift 1.

| Requirement | Class | Spec cite | Code anchor | Light-up |
|---|---|---|---|---|
| WAR-legitimacy floor = CONTINUOUS function of position-percentile WAR (supersedes 4 discrete buckets) | **DRIFT** | RA1:8 correction 2 | `franchiseFameCompute.ts:131` still uses `warPercentileToMeritLevel` (4-bucket `{low,average,high,elite}`); **DECISIONS_LOG.md:345 wrongly records this as DONE — only direction was fixed** | Replace with a continuous curve interpolating the same anchors; update the L-SIM invariant in the same diff. **NEW, unowned — and a live bookkeeping error in the decisions log.** |
| FAME-9: initial fame seeded by draft position | MISSING | LSD:392,458 | No producer anywhere; fame rows spring in at heat 0 on first game write | Seed a fame row per drafted player at finalization, scaled by draft slot. Ruled an owed "L6 follow-up." **NEW, unowned.** |
| FAME-10: call-up (~+0.5)/send-down (−1 to −1.5) status fame | MISSING | LSD:394-395,459 | `callUpFranchisePlayer`/`sendDownFranchisePlayer` execute with zero fame effect; the 'status' channel has no producer | Emit a status-channel heat bump from the roster-movement success path. **NEW, unowned.** |
| FAME-10: bench-role ~0.5x fame accrual multiplier | MISSING | LSD:396,459 | No role/effectivePosition input anywhere in fame compute | Scale breakdown.total by a bench multiplier from lineup role. **NEW, unowned.** |
| FAME-10: league-leader rank per-checkpoint fame | MISSING | LSD:397,459 | No producer; race standings compute is visibility-only | Per checkpoint, bump status-channel heat for top-N marquee leaderboards. Ruled an owed L6 follow-up. **NEW, unowned.** |
| §20.6 Channel C: one-time designation-naming fame nudge (FF+2/Albatross−1) | DORMANT | LSD:398,414,461 | `designationFameNudge.ts:18-25` built-dark, header says the firing seam deliberately deferred; zero callers | Fire from designation-transition events already emitted in pCG. **NEW, unowned.** |
| FAME-7 trade valve: trade drops reach floor + pulls Heat toward Unknown | DORMANT | LSD:383,393,456 | `applyTradeReset` built+spec-faithful but only caller is the rebrand cascade; the live trade adapter has zero fame references | Call `applyTradeReset` on each traded player's fame row inside the trade adapter. **NEW, unowned.** |
| FAME-7 rebrand valve: same reset team-wide | DORMANT | LSD:250,383,456 | Fully built (`franchiseRebrandApply.ts:246-250`) but `acceptRebrandOffer` has no caller; RebrandTakeover button is an onClose stub | Wire the confirm to `acceptRebrandOffer`. **Owned** (ORPHAN_WIRING_MATRIX §11, "build the rebrand GM-offer UI"). |
| FAME-5/6: first crossing out of Unknown sets a reach floor | STALE-SPEC | LSD:378-386,454-455 | Superseded by the 2026-06-23 ruling (fame fluctuates freely; only honors pin a floor) — code matches the ruling | Spec edit only, not code. |
| FAME-6: was-negative flag for reporter redemption angle | DORMANT | LSD:382,386,455 | `wasNegative` computed+persisted, zero consumers | Read it in fame/honor reporter adapters. **NEW, unowned (low severity).** |
| FAME-4: fame-vs-merit archetype classifier (Superstar/Snub/Darling/Bust) | DORMANT | LSD:360-369,453 | `classifyFameVsMerit` built, zero consumers; the outcome emerges live via race machinery instead | Consume for reporter/almanac labels or delete as dead weight. Low priority. |
| RA1 correction #5: no reader may consume a draft-baseline TV sentinel row | MISSING | RA1:11 | No such assertion exists; structurally guarded today but the ruled guard/test is absent | Add a unit/L-SIM assertion. **NEW, unowned (low severity).** |

Bottom line: the fame core is real and wired — Heat with decay, upward-only WAR floor (direction fixed,
invariant-tested), iconic-event bumps, the nine-tier ladder, fame→morale, honor pins, rebrand cascade all
flow through pCG behind default-off flags. Three real mismatches: (1) the WAR floor still uses the 4
discrete buckets JK replaced — and the decisions log wrongly claims this is done; (2) the entire §20.4
status/celebrity layer (draft-seed, call-up/send-down, bench, league-leader fame) has zero live producers
— the biggest holes; (3) the trade fame reset never fires on the real trade path.

### 3.5 Beat reporter / news
Anchor: MODE_2_V1_FINAL.md §16 + SCOUTING_INTELLIGENCE_SPEC.md §10; reality baseline
REPORTER_CERTIFICATION.md (now stale in the good direction — every connect-task it listed is built).
Counts: fed 10 · dark-by-flag 2 · dormant 9 · missing 7 · drift 4.

| Requirement | Class | Spec cite | Code anchor | Light-up |
|---|---|---|---|---|
| §16.3 INSIDER reveal (permanent hidden-trait reveal, one player/season) | MISSING | MODE_2:2121-2128 | No revealLevel/reveal code anywhere | Get a JK ruling first — likely conflicts with the hidden-vs-revealed rule. **NEW, unowned; also a ruling question.** |
| §16.5 Captain storylines (±50% morale amplification) | MISSING | MODE_2:2152-2159 | Zero 'captain' references in reporter modules | Thread captain identity into facts; morale-amp half is stale vs the narrator-only ruling. **NEW, unowned.** |
| §16.6 Reporter firing & hiring (5%/season base, 7 triggers) | MISSING | MODE_2:2161-2182 | No firing mechanism; reporters permanent once created | Low value until reporter tenure matters — v2/stale candidate. **NEW, unowned (low priority).** |
| §16.8 Player quotes (personality 80/20 + templates) | MISSING | MODE_2:2204-2220 | No generatePlayerQuote; live promptBuilder forbids invention | Pass personality into facts, let the LLM voice quotes under the no-invention rule. **NEW, unowned.** |
| §16.4/C-069 ±3-per-game cap on reporter morale influence | MISSING | MODE_2:2148 | `calculateStoryMoraleImpact` has no clamp | Moot while application is dormant (next row). |
| §16.4 Reporter morale influence applied to fan morale | DORMANT | MODE_2:2130-2150 | Table+formula built spec-exact but every live consumer discards moraleImpact | Conflicts with narrator-only ruling — recommend STALE-SPEC ruling instead of building. **Ruling question.** |
| §16.10 Narrative → playerMorale | MISSING | MODE_2:2268 | No player-morale write from any reporter output | Needs a §5-safe design + JK ruling. **NEW, unowned.** |
| §16.10 Pop-up notifications for unexpected narrative events | MISSING | MODE_2:2266 | No narrative toast surface | Small UI ticket once more taps go live. **NEW, unowned (low priority).** |
| Season-news taps beyond awards (L10, L11, L3, L13, stadium, draft recap) | DORMANT | SCOUTING §10:260-263 | 6 pure build-dark adapters, zero callers, self-documented ORPHANED-PENDING | **Owned** — extended to all 8 dark emission kinds. |
| AWARD_RESULT + ALL_STAR season-news emission | DORMANT | SCOUTING §10:261-263 | Dark-by-flag BY DESIGN (L12) | Nothing to build — the ruled flag-flip + JK LLM sign-off. |
| SEA-1(D) reporter season-memory (almanac substrate) | DORMANT | REPORTER_CERTIFICATION:200 | `addReporterAlmanacEntry` zero live callers | Tap persist-season-news into it. Unbuilt bus piece D — **NEW, unowned.** |
| §16.2 personality distribution weights (15/10/20/12/10/8/8/7/5/5) | DRIFT | MODE_2:2111-2119 | Weights exist in the retired legacy engine; live path picks uniformly by hash | One-line: seeded weightedRandom over the weights. **Owned** (ORPHAN_WIRING_MATRIX §18, "deterministic hash not weighted-random"). |
| §16.1 user-named staffing reporter never voices franchise games | DRIFT | MODE_2:2086; SCOUTING:279-281 | leagueId-scoped staffing reporter vs franchiseId-scoped lookup → auto-gen a SECOND random reporter | Fall back to the staffing reporter and adopt/clone into franchiseId scope. **NEW, unowned — a real wiring drift, not just "no manual-hire UI."** |
| §16.4 tenure modifier (1+min(tenure×0.1,0.5)) | DRIFT | MODE_2:2150 | Code uses a reputation multiplier instead; live BeatReporter has neither field | Moot while dormant; fold into §16 stale-spec reconciliation. |
| SEA-2 per-event-type base RATE roll | DRIFT | REPORTER_CERTIFICATION:213 | `shouldEmitSeasonNews` treats rate as binary, never rolls a probability | Seeded roll when 0\<rate\<1. **NEW, unowned (small).** |
| §16.1 canonical BeatReporter interface | STALE-SPEC | MODE_2:2088-2109 | Live entity (name/personality/voiceStyle/eraFlavor/avatar/mood) survives only in the legacy engine | Amend §16.1 to the live entity. |
| §16.7 LLM routing 50/50 local/cloud | STALE-SPEC | MODE_2:2184-2202 | No such constants; ruled reality = Grok for commentary + claude-column for columns/season-news | Rewrite §16.7 to the Grok/Claude split. |
| §16.9 Narrative data model | STALE-SPEC | MODE_2:2222-2255 | Ruled records are GameStory/SeasonNewsItem/CommentaryFeedEntryRecord | Amend §16.9 to the shipped vocabulary. |
| §5/§10 narrator-only invariant under the L13 fan nudge | DRIFT | SCOUTING §10:260 | Fan-morale delta applies ONLY when LLM emission succeeds — LLM success gates a deterministic write | Decouple before L13 lights, or get a JK ruling that reporter-amplified is intended. **Ruling question.** |

Bottom line: the 2026-06-16 certification's entire connect-list is now built (franchiseId-scoped
auto-assignment, post-game columns, hub reading persisted GameStories); SEA-1's publish-bus foundation
exists with awards as the only live tap, correctly dark. What remains: 6 build-dark event-tap adapters
(owned), the named-staffing-reporter/franchiseId scope drift (new), and most of §16's reporter-soul
mechanics (morale influence, INSIDER reveal, captain storylines, firing, quotes, 50/50 routing) which
contradict the narrator-only ruled reality and need a STALE-SPEC reconciliation ruling, not a build.

### 3.6 Rivalry (Relationships-lite §24)
Anchor: LSD §24 (REL-1..9) + DECISIONS_LOG 2026-06-27 rulings + V1_CANON §6. Counts: fed 9 ·
dark-by-flag 9 · dormant 4 · missing 4 · drift 3.

| Requirement | Class | Spec cite | Code anchor | Light-up |
|---|---|---|---|---|
| ~~Record-overtake edge must be inert HISTORY, not morale-bearing RIVALRY~~ **CANCELLED by the 2026-07-08 reversal** | ~~DRIFT~~ FED (correct-as-built) | V1_CANON §6 2026-07-08 RECORD-OVERTAKE REVERSAL row (supersedes §6:196; DECISIONS_LOG:272) | `franchiseRelationshipOvertakeCompute.ts:61,84` types the row RIVALRY — now the RULED behavior | ~~Change 'RIVALRY'→'HISTORY' at both sites + doc-comment.~~ **No code change — retype ticket cancelled 2026-07-08; overtake edges are genuine RIVALRY and charge future matchups per REL-6 (guard: no second morale hit at the overtake moment itself).** |
| Home-park rival fan-morale = 2× amplification (JK re-ruled 2026-07-08) | DRIFT | V1_CANON §6:205; DECISIONS_LOG:287 | `masterMoraleMatrix.ts:171-172,427-428` flat +2/+1; `fanMoraleEngine.ts:405` generic 1.5×, never home-park-checked | Fold into RIVAL_GAME composition, §16-tunable. **Owned** (same item as 3.1's stadium row). |
| §24.5/REL-4 pre-move reporter heads-up on trades/call-ups | DORMANT | LSD:617-620,671 | `franchiseRelationshipIntel.ts:107,134` fully built+tested, zero production callers | **Owned** (addendum: assigned to C4-C in-season lane). |
| §24.7/§24.10 reporter surfacing of edges (flare news + fan nudge) | DORMANT | LSD:626-628,643,673 | `franchiseRelationshipFlareEmission.ts:66,104` zero callers | **Owned** (addendum item 2, part of the 8-dark-emission-kinds wave). |
| §24.4/REL-3 potential edges (any pair incl. farm vs 22-man) | DORMANT | LSD:611-615,670 | Only formation caller filters MLB-only + same-team → potential:true unreachable | Score cross-team and farm-vs-MLB pairs. **NEW, unowned.** |
| §24.6/REL-5 Romance edge + gender-weighted rates | MISSING | LSD:604,622-624,672 | No ROMANCE writer anywhere; Player.gender exists but unread by any relationship module | Add a romance scorer + a ROMANCE morale row. **NEW, unowned.** |
| §24.2/§24.8/REL-7 History persists after departure; trade/send-down ENDS the edge | MISSING | LSD:605,630-632,674 | No writer ever creates a HISTORY edge; no roster-move dissolution — only time-decay | On trade/send-down: stamp dissolvedAtGameNumber + write a HISTORY successor. **NEW, unowned.** |
| §24.9/REL-8 Captain & Charisma govern edges (4-modifier composite) | MISSING | LSD:634-638,675 | No captain/leadership term anywhere in edge machinery; composite exists nowhere | Compute from captain's hidden modifiers, apply as a threshold shift. **NEW, unowned — spec is LOCKED but code self-declares deferred; ruling question.** |
| §24.7 charged matchup "faces his FORMER TEAM" leg | MISSING | LSD:626-628,673 | Only the edge-pair leg is approximated; no former-team concept exists | Derive former teams from the transaction log, extend the charged check. **NEW, unowned.** |
| §24.3 friendship trigger = extended time together | DRIFT | LSD:607-609,669 | `scoreFriendship` is pure personality/modifiers, no tenure input | Thread a games-co-rostered term. **NEW, unowned (small).** |
| Home-park rival display on the LIVE hub | DORMANT | DECISIONS_LOG:287; ORPHAN_WIRING_MATRIX §22 row 223 | `useFranchiseLensData.ts:686` "deferred to the home-park-rivalry rebase"; display branch exists | One missing read between a working engine and a built display branch. **NEW, unowned (small).** |
| The 2026-06-27 envy rulings never folded into §24 | STALE-SPEC | LSD:598-609,668-677 vs DECISIONS_LOG:14-24 | Shipped ruled machinery has no spec home; stale in-code copy also claims "no durable relationship state exists" | Author a REL-10 §24 amendment; fix the context-preview copy. |
| Legacy `rivalryScores` team-scoped store | DORMANT | DECISIONS_LOG:650,1791-1792 | Schema-registered, zero writers, structurally can't hold a player-pair edge | Retirement candidate at next DB-version bump. **Owned** (ORPHAN_WIRING_MATRIX §4 retirement list). |

Bottom line: the rivalry core is real and fed — all four dark L13 writers run on the live pCG path, the
three 2026-06-27 envy rulings are implemented clause-for-clause, edges display on the Lens. The two ruled-
but-unapplied one-liners (overtake→HISTORY, 2× home-park amplifier) are already owned/queued. The reporter
value-add layer (pre-move intel, flare emission) is owned too. Genuinely new: potential edges are
unreachable (same-team-only formation), Romance and History/dissolve-on-move have no producer, and the
§24.9 Captain composite is spec-LOCKED but self-declared deferred in code — a real spec-vs-code authority
conflict worth a JK ruling.

### 3.7 Awards / TV / season-end honors
Anchor: LSD §3, §21-23 + V1_CANON §4-§6 (TV + MOY ratification). Counts: fed 11 · dark-by-flag 5 ·
dormant 5 · missing 7 · drift 2.

| Requirement | Class | Spec cite | Code anchor | Light-up |
|---|---|---|---|---|
| Season-end finalize chain (freeze→awards→honors+snub+ratchet+envy) must run when the season completes | DORMANT | LSD §23.1/§23.8; AWARD-8 | Only caller is unrouted `FranchiseHome.tsx:3262-3316`; FranchiseLens has zero calls to the chain; L-SIM drives it directly, bypassing the app | Port the season-complete effect into the routed FranchiseLens path. **Owned** — same root as the Fame system's known "season-end honors ORPHANED" finding (route-flip stranding). |
| RELIEVER_OF_YEAR/BENCH_PLAYER/BOOGER_GLOVE final awards | DORMANT | LSD §23.2/§23.5/§23.6 | `franchiseAwardsEngine.ts:114-120` persists only 5 of 8 categories — every downstream consumer (honors, fame, news, snub) already wired and waiting | Add the 3 categories to WAR_AWARD_CATEGORIES. **NEW, unowned — 3-line fix, high leverage.** |
| TV-award family resolution: Kara Kawaguchi, Bust of the Year, Comeback Player | MISSING | LSD §23.3; V1_CANON §6 TV ratification | Race side IS rewired to the ratified spine (`franchiseTvFamilyScorer.ts:28-52`) but the only award writer never writes these 3 categories — computed standings discarded | Resolve rank-1 into award rows at season end + add to honors/heat-bump/news maps. **NEW, unowned.** |
| Race standings (fame tilt + bands) must reach a consumer | DORMANT | LSD §21.1/§21.2 | `franchiseRaceStandingsCompute.ts` is recompute-only, result thrown away; live lens uses a merit-only path with no fame tilt | Persist the L12 standings or route into the lens VM. Related to the addendum's "race visibility-vs-emission valve, not audited" item — **partially owned, this specific finding is new detail.** |
| Final merit-award resolution must include fame tilt + GG defensive-fame share | DRIFT | LSD §21.3/§21.4/§23.2/§23.4 | Race path has both weights built; the actual award winner is chosen on raw WAR only, no fame | Feed winner selection through the same weighted compute. **NEW, unowned.** |
| Reliever of the Year = WAR-led merit race | DRIFT | LSD §23.2 | `franchiseAwardsEngine.ts:275-276` uses pitching WPA, not a WAR flavor; plausibly deliberate, no ruling found | Ratify pitchingWpa as the signal, or switch to pitchingWar. **NEW, unowned — ruling question.** |
| Race/honor resolution pays a WINNER morale boost | MISSING | LSD §21.6; §22.3 | Snub side wired; no winner/honoree morale row exists anywhere | Add a race.win event row, apply at the two payout sites. **NEW, unowned.** |
| MOY feeds manager legacy + the reporter (not player morale) | MISSING | LSD §23.7 | MOY row persisted+displayed correctly (no morale touch) but excluded from the honor-kind union and PLAYER_AWARD_HONORS — no MOY news ever emits | Add MANAGER_OF_YEAR to the honor-kind union + loop. **NEW, unowned.** |
| All-Star board visible in the franchise hub | DORMANT | LSD §22.2; RACE-5 | VM + render slot exist but the live hook never populates it; roster data exists dark | Read `getFranchiseAllStarRoster` in the hook. **NEW, unowned.** |
| In-season race emission (standing-delta morale/fan effects, continuously) | MISSING | LSD §21.2; tempered by RACE-5 | No in-season race→morale effects exist at all; payouts fire only at 2 tentpoles | §16 sim decision on which races emit per checkpoint. **NEW, unowned.** |
| Negative-award valence (bottom-3 hurts, climbing out relieves) | MISSING | LSD §23.5 | Inverted scores exist but no bottom-3 tracking, no fall-in/climb-out morale | Rides the in-season emission build (previous row). **NEW, unowned.** |
| Award vote percentages fame-weighted | MISSING | LSD §23.9 | `voteWeight` always null; the offending salary-weighting is dead but the fame replacement was never built | Cosmetic: derive voteWeight from fame heat at finalize, or drop the field. **NEW, unowned (low priority).** |
| Platinum Glove season-end computation | MISSING | LSD §23.8 | Only in unrouted legacy AwardsCeremonyFlow, no category in FranchiseAwardCategory | Small add if wanted for v1. **NEW, unowned (low priority).** |
| True Value = frozen draft-IV baseline (LSD §3 prose) | STALE-SPEC | LSD §3 | Code implements the RATIFIED peer-percentile model exactly | Edit LSD §3 to the ratified model. |
| MOY = decision-WPA + lineup delta + team record (3-input LSD text) | STALE-SPEC | LSD §23.7 | Code matches the 2-input ratification (deployment WPA + record-above-TV-expectation) | Edit LSD §23.7 to the ratified 2-input model. |
| Whole L12 honors application layer | DORMANT | known context | Flag-dark by design; NOTE the reach-floor ratchet is double-gated (L12 AND Fame) and no-ops without Fame on | Flip order matters — Fame must be enabled at-or-before L12. |

Bottom line: the TV mis-anchor is resolved IN CODE (LSD §3/§23.7 are the stale halves, edits only). The
race/award machinery is largely spec-faithful but stacked behind (1) the L12/Fame flags — fine by design;
(2) the season-end finalize chain existing only on unrouted legacy code — the live app never finalizes any
award; (3) missing resolutions — Reliever/Bench/Booger never computed though every consumer waits, and the
ratified TV-family rewire is half-done. This entire system was previously flagged only "NOT
INDEPENDENTLY AUDITED" in the prior pass — nearly everything here beyond the finalize-chain root cause is
new detail.

### 3.8 Trade demand (§13 fan-morale teeth)
Anchor: LSD §13 (teeth + inversions) + V1_CANON §5/§6 (manual-trades ruling). Counts: fed 4 ·
dark-by-flag 4 · dormant 3 · missing 3 · drift 0.

| Requirement | Class | Spec cite | Code anchor | Light-up |
|---|---|---|---|---|
| Audit premise "A1.3a built, A1.3b deferred" | STALE-SPEC | task reason / older matrix | A1.3b shipped in full (commit `c87ff779`), trackerDb v26 | Nothing — correct the source matrix. |
| §13:237 player-morale input to the trade propensity gate | DORMANT | LSD §13:237 | `franchiseL10SweepCompute.ts:153` reads the static default (75) — discontent term permanently 0 even at flag flip | Thread `getFranchiseMoraleSnapshot` in, same pattern as fanMorale. Overlaps the known L10 morale-weighting issue (item 16) but scoped here to trade demand specifically. |
| §13 tooth #2: ignored demander "bleeds fan morale slowly" — tax must reach fan morale | MISSING | LSD §13:227 | `franchiseFlashpointDecayCompute.ts:14-18` accumulates only, never applies | **Owned** — same item as the player-morale/fan-morale flashpoint tax gap. |
| §13:227 GM decision "move him" must stop the bleed — demand resolution on trade | MISSING | LSD §13:227; V1_CANON §6 manual-trades ruling | `franchiseTradeDemandStorage.ts:18` status never set 'resolved'; a traded demander keeps taxing his OLD team indefinitely | Hook the manual-trade execute path to resolve the demand + reset the flashpoint counter. **NEW, unowned.** |
| §0/§2: hub "Wants Out" panel needs a real feeder | MISSING | LSD §0:15, §2:36-38 | VM+renderer exist; live hook never populates it, only hand-authored preview data does | Feed `getFranchiseTradeDemandRowsByScope` into the VM. **NEW, unowned.** |
| LS-16 intensity dial input | DORMANT | LSD §10:193; V1_CANON §6 ruling | Hardcoded 'standard' | **Owned** (same L10 intensity-dial item). |
| §2 "reporter narrates the consequence" tap caller | DORMANT | LSD §2:38; V1_CANON §6 ruling | `franchiseL10NewsAdapter.ts` self-declared DARK/ORPHANED-PENDING | **Owned** (part of the 8-dark-emission-kinds wave). |
| §13's internal loyalty-direction tension (line 237 vs 236) | STALE-SPEC | LSD §13:235-237 | Code's signed-term model matches the ruled reconciliation (AUTH-4) | No code change; optionally amend §13 prose. |

Bottom line: the trade-demand math matches the spec's two inversions and nothing auto-executes a trade
(manual-trades ruling respected). Two new holes: trading a demander away never clears his demand (he keeps
taxing his old team forever), and the hub's "Wants Out" panel is never fed real data. The audit premise
itself ("A1.3b deferred") was stale — it shipped in full.

### 3.9 Fan morale (§8 dampener + §13 teeth)
Anchor: LSD §8 + §13. Counts: fed 1 · dark-by-flag 10 · dormant 2 · drift 2 · missing 1.

| Requirement | Class | Spec cite | Code anchor | Light-up |
|---|---|---|---|---|
| §13 tooth 2 — flashpoint decay must bleed fan morale per game | MISSING | LSD §13:227 | Accumulator writes rows only, header says applying it "is a later L5/L7 tooth" | **Owned** (ruled wire-all, same item across 3 systems). |
| §13 tooth 4 — rebrand circuit-breaker offered when dwell arms | DORMANT | LSD §13 item 4 + §14 | `getRebrandOffer`/`acceptRebrandOffer`/cascade have zero live callers; UI slot never populated | **Owned** (ORPHAN_WIRING_MATRIX §11, "build the rebrand GM-offer UI"). |
| §13 supporting tooth — reporter intensity rises when fan morale is low | DORMANT | LSD §13 supporting teeth | `computeReporterHeat` (`reporterIntensity.ts:47-67`) zero callers; live reporter hardcodes 'medium' | Replace the hardcode at reporter activation. **NEW, unowned.** |
| §13 supporting tooth — GM hot seat: sustained low morale = a stated mandate | DRIFT | LSD §13 supporting teeth | Only exists as the L10 front_office_mandate random event, no sustained-low dwell trigger | Reuse the rebrand dwell-counter pattern, or ratify the event-roll as the v1 reading. **NEW, unowned (low severity).** |
| §8/§6 Ambition semantics on up-moves (formula vs narrative tension) | STALE-SPEC | §8 formula vs §6/§8 narrative | Code follows the formula literally (higher ambition = stronger dampening of gains) | Needs a JK/sim ruling: keep literal or invert. Deferred to the Simulation Gate, not urgent. |
| §8 Droopy asymmetry direction | DRIFT | §8 personality table | `fanMoraleDampener.ts:26` down 0.7 \> up 0.5, test-characterized deliberately | Sim-tune territory, flag for the tuning pass. |

Bottom line: the §8 dampener and §13 trade-request inversions are formula-faithful and correctly dark. Two
of the four core teeth don't bite even flag-on: flashpoint tax has no apply step, rebrand's offer chain has
zero callers (both owned/queued elsewhere). Reporter-intensity is a finished engine the live reporter never
calls — new. GM hot seat is only a random event, not a sustained-morale mandate — new, low severity. Two
prose ambiguities (Ambition, Droopy) are sim-tune calls, not build errors.

### 3.10 Relationships/chemistry (REL-1..9)
Anchor: LSD §15+§24 (LOCKED). Counts: fed 7 · dark-by-flag 7 · dormant 4 · missing 2 · drift 3.
(This verification covers the same REL-1..9 edge engine as §3.6 rivalry from the relationships/chemistry
entry point — gaps below are additional detail from that walk, cross-referenced where identical.)

| Requirement | Class | Spec cite | Code anchor | Light-up |
|---|---|---|---|---|
| REL-4/§24.5 pre-move reporter heads-up | DORMANT | §24.5+REL-4 | Same as §3.6 row — **owned** (C4-C lane). | — |
| REL-3/§24.4 potential edges | DORMANT | §24.4+REL-3 | Same as §3.6 row — **new, unowned.** | — |
| REL-5/§24.6 Romance edge + gender weighting | MISSING | §24.2+§24.6+REL-5 | Same as §3.6 row — **new, unowned.** | — |
| REL-8/§24.9 Captain & Charisma composite | MISSING | §24.9+REL-8 | `captainMoraleRouter.ts:9-15` explicitly states it does NOT implement §24.9 ("is L13, a separate ticket"); `franchiseMoraleRelationshipTrust.ts:512-515` marks it "deferred for internal v1" | Build the 4-modifier composite. **Spec is LOCKED but code comments claim v1 deferral — possible JK fork to reconcile.** |
| REL-6/§24.7 charged matchups: former-team + History trigger | DRIFT | §24.7+REL-6 | Trigger = any live edge on opposing teams (broader than spec); amplification IS personality-scaled correctly | Add former-team detection + HISTORY-edge trigger. **New, unowned (same family as §3.6).** |
| REL-7/§24.8 trade/send-down ends the edge | DRIFT | §24.8+§24.2+REL-7 | No roster-move hook sets dissolvedAtGameNumber; the morale payoff loop IS live (co-roster check + exact-delta recovery) | Hook trade/send-down to dissolve + convert to HISTORY. **New, unowned.** |
| REL-2 friendship "extended time together" trigger | DRIFT | §24.3+REL-2 | `scoreFriendship` has no tenure/co-roster-duration input | Add a co-rostered-games term. **New, unowned (small).** |
| REL-9/§24.10 reporter-mediated relationship→fan-morale | DORMANT | §24.10+REL-9+§24.5 | Fully built with capped fan nudge, zero call sites; primary morale→development path IS wired correctly | **Owned** (part of the 8-dark-emission-kinds wave). |
| §24.3 sim-tuned magnitudes (edges/team, thresholds, decay) | DORMANT | §24.3+§16 | All explicit §16 SIM-TUNE placeholders — shape locked, numbers unproven | Compliant-as-shape; run the L-SIM relationship leg and tune. |

Bottom line: identical spine to §3.6 — correctly wired dark, race-envy triggers wired three ways. What
isn't there: the reporter value-add layer (owned), potential edges (unreachable, same-team-only
formation), Romance/History producers (none), and the REL-8 Captain composite — spec-LOCKED but
self-declared deferred in code, the one spec-vs-code authority conflict worth a JK ruling.

---

## 4. ACTIONS

### 4a. Mis-anchor traps needing supersede banners

| File | One-line banner to add |
|---|---|
| `spec-docs/FAN_MORALE_SYSTEM_SPEC.md` | "SUPERSEDED for v1 by FRANCHISE_V1_LIVING_SEASON_SPEC.md §8 (dampener) + §13 (four teeth) — never formally reconciled; do not build from this doc." |
| `spec-docs/v1-simplification/MODE_2_V1_FINAL.md` | "SUPERSEDED — stale 2026-03-09 duplicate-filename copy; the live doc is spec-docs/MODE_2_V1_FINAL.md, itself amended by FRANCHISE_V1_LIVING_SEASON_SPEC.md." |
| `spec-docs/KBL_MANAGER_WPA_IMPLEMENTATION_SPEC.md` | "SUPERSEDED — describes the RETIRED tactical+lineup_delta architecture; see MWAR_STEP1_CONTRACT.md + V1_CANON_2026-07-07.md §6 MOY ruling." |
| `spec-docs/KBL_WPA_ENGINE_REBUILD_SPEC.md` | Same banner as above. |
| `spec-docs/KBL_WPA_ATTRIBUTION_MULTIPLIER_TABLE_DRAFT.md` | Same banner as above. |
| `spec-docs/KBL_WPA_GAMETRACKER_AUDIT_SCRIPT.md` | Same banner as above. |
| `spec-docs/MANAGER_WPA_MOY_CERTIFICATION.md` | "STALE — certified the pre-rearchitecture manager-WPA metric (2026-06-16); needs re-certification against MWAR_STEP1_CONTRACT.md's 3:2:1 model, not just a banner." |
| `spec-docs/BEAT_REPORTER_DATA_MODEL_SPEC.md` | "Effectively superseded in practice by REPORTER_CERTIFICATION.md's wiring findings (2026-06-16); live anchor is MODE_2_V1_FINAL.md §16 + SCOUTING_INTELLIGENCE_SPEC.md §10." |
| `spec-docs/BEAT_REPORTER_VOICE_SPEC.md` | Same banner as above. |
| `spec-docs/FAME_INTEGRATION_SPEC.md` | "STALE (2026-04-14) — superseded by FRANCHISE_V1_LIVING_SEASON_SPEC.md §20 (FAME LOCKED, FAME-1..14)." |
| `instructions/franchise-design-system.md` (§7.3) | "§7.3's 'morale genuinely inactive' framing pre-dates the 2026-07-07 MORALE FULL-WIRING ruling — all matrix rows are ordered wired, not blocked; update the copy guidance." |
| `spec-docs/TRAIT_SIGNAL_CERTIFICATION.md` | "Internally self-superseding — §VI overrides §D/§V (FINDING-150 proved builds anchored on the stale section); mark §D/§V superseded-by-§VI inline." |

### 4b. JK rulings needed

1. **Matchup history** — `PLAYER_RIVALRY_MATCHUP_ENGINE_SPEC.md` is an unratified vision doc with zero
   ledger trail. Is this still something we want to build, or is it abandoned — with the narrower REL-6
   "charged matchups" slice (already spec'd in the living-season doc) covering matchup history for v1?
2. **Aging** — canon's ruling puts "aging" wholesale under Offseason (post-v1), but we already built and
   ratified an in-season age-based ratings adjustment (RATINGS_ADJUSTMENT_SPEC §5/§6A) as part of the
   checkpoint system. Is that the same thing canon deferred (meaning it should count as already-in), or a
   genuinely different thing (career-long aging vs. in-season fairness) that needs its own treatment?
3. **Beat reporter §16 mechanics** — a chunk of the original reporter spec has reporters directly moving
   player morale, revealing hidden traits, and getting fired/hired — but we later ruled reporters only
   narrate and never decide. Should we formally retire those mechanics from the spec, or is there still
   appetite to build some of them (e.g., trait-reveal) under the new narrator-only rules?
4. **Relationships REL-8** — the spec locks in a rule where the team captain's personality should suppress
   bad clubhouse chemistry and catalyze good chemistry, but the code that was supposed to do this has a
   comment saying that part was deliberately punted to a later ticket. Build the captain effect now (it's
   spec-locked), or confirm the punt?
5. **Reliever of the Year merit signal** — the code scores this award on pitching WPA, not a WAR flavor.
   Plausibly deliberate (WAR undervalues relievers) but no ruling says so. Ratify WPA as the signal, or
   switch it to WAR?

### 4c. New gaps for the pre-tuning queue (deduped against MODE1_PUNCHLIST_2026-07-08.md and the
ORPHAN_WIRING_MATRIX §5 addendum — Mode-1 punchlist is entirely draft-side, zero overlap; the addendum's
68-landed/45-queued/12-ruled-out/10-now-owned disposition covers most of the morale/fan-morale/L10/
rivalry/rebrand items above, which are marked **Owned** in the tables. Everything below is NOT in either
source.)

**Fame status/celebrity layer (biggest single hole — an entire spec'd layer with zero producers):**
FAME-9 draft-seed fame · FAME-10 call-up/send-down status fame · FAME-10 bench-role multiplier ·
FAME-10 league-leader rank fame · §20.6 designation-naming fame nudge (built-dark, uncalled) · FAME-7
trade valve never fires on the real trade path · WAR-legitimacy-floor still 4-bucket (DECISIONS_LOG
wrongly marks this DONE — needs a correction too, not just a code fix).

**Awards/TV (previously "NOT INDEPENDENTLY AUDITED" — largely new territory):**
RELIEVER_OF_YEAR/BENCH_PLAYER/BOOGER_GLOVE never computed at season end (3-line fix, every consumer
waiting) · TV-family awards (Kara Kawaguchi/Bust/Comeback) never resolve despite live inputs · final award
winners chosen on raw WAR, ignoring the spec's fame tilt + GG defensive-fame share · no winner morale
boost anywhere · MOY excluded from honor/news emission and never stamps manager legacy · All-Star board
never populated in the live hub despite built VM+data · zero in-season race→morale emission (only 2
tentpoles fire) · no negative-award valence (bottom-3 hurts/climbing-out relief) · vote-pct fame-weighting
never built · Platinum Glove has no v1 category.

**Player morale cross-cutting severances:**
`otherTouchedPlayerIds` never resolved by any caller — silently drops every fed row's teammate/clubhouse
effect and makes the Charisma modifier and Captain morale routing complete no-ops · morale ledger never
syncs back to `player.morale` for checkpoint dev or trait grant (wider than the already-owned L10-only
item) · `captainMoraleRouter.ts` fully orphaned, self-documented "deferred seam, not built."

**Relationships (REL-3/5/6/7 — same edge engine as rivalry but genuinely new sub-gaps):**
potential edges (farm-vs-MLB) structurally unreachable — formation only scores same-team MLB pairs ·
Romance edge type has no producer at all (Player.gender exists, unread) · charged matchups lack former-
team detection · trade/send-down never dissolves or HISTORY-converts an edge · friendship lacks its
"extended time together" trigger · home-park rival status not read into the live Lens hub (one missing
read, small).

**Beat reporter §16 (previously unwalked mechanics, now contradicted by the narrator-only ruling):**
INSIDER hidden-trait reveal · captain storylines · reporter firing/hiring · player quotes · pop-up
notifications for narrative events · reporter season-memory tap into the Almanac (`addReporterAlmanacEntry`
zero callers) · the user-named staffing reporter never actually voices franchise games (leagueId vs
franchiseId scope split — a real drift, not just "no manual-hire UI") · SEA-2 emission rate treated as
binary instead of a probability roll.

**L10 catalog holes (5 of 9 event families emit only generic placeholders):**
performance-family concrete sub-types (breakout/regression/clutch-gene/yips) · pitching-family
(velocity/arm-angle) · role-family (position change/utility) · cosmetic-family sub-types · team-family
holes (promo night, rivalry flare, manager-fired-crisis).

**Small standalone fixes:**
§8 per-stadium player stat splits (input captured, no aggregator/display exists) · trade-demand: nothing
clears a demand when the traded player leaves — his OLD team keeps taxing forever · trade-demand hub
"Wants Out" panel never fed real data · reporter-intensity engine built but the live reporter hardcodes
'medium' · GM hot seat is only a random event, never a sustained-low-morale mandate.
