# V1 DELTA AUDIT — FINDINGS (what's left for Franchise v1)

**Created:** 2026-06-22 (Captain Opus 4.8). **Mission source:** `V1_DELTA_AUDIT_HANDOFF.md`.
**Method (JK ruling 2026-06-22):** anchor on `ROADMAP_TO_V1.md` (boundary `84d0adf4`, 2026-06-20 20:35)
vs **current code** + breadcrumbs to the last few days. Evidence-backed only — every status carries a
commit hash or `file:line`; unconfirmable → flagged, not guessed. NO pre-June-10 gap/redesign docs fed in.
**How produced:** 9-reader multi-agent comb-through (6 doc-readers + 3 commit-readers across both worktrees)
+ a reconciliation/synthesis pass; the two load-bearing surprises (L14, G1) were independently re-verified by
the Captain against live code.
**SET-ASIDE (NOT assessed — other thread owns the redesign):** ratings / trait / chemistry **adjustment** work
(`RATINGS_ADJUSTMENT_SPEC`, `TRAIT_GAIN_LOSS_THRESHOLD_SPEC`, `TRAIT_MEASUREMENT_SPEC`,
`CHEMISTRY_TRAIT_POTENCY_VALUATION_SPEC`, the in-season L8 ratings-checkpoint / L9b trait-checkpoint **models**,
the RB-9 analyzer's traits/chemistry **analysis math**). Listed separately at the bottom, never folded into v1 remaining work.

**Worktrees / scope confirmed against git:**
- `/Users/johnkruse/Projects/kbl-tracker` [`codex/franchise-v1-next`] HEAD `fc129d44` — **178 commits** since boundary (docs + Mode-2 L/D-stack code).
- `/Users/johnkruse/Projects/kbl-mode1-b` [`codex/mode1-v1-b`] HEAD `68cfbc4e` — **74 commits** since boundary (61-commit `mode1-v1` prefix + 13 own) = the ENTIRE Mode-1 auction/prospect build.
- `codex/mode1-v1` PARKED clean at `956fd15d` (do not audit — prefix of mode1-v1-b). `/private/tmp/kbl-gt-*` = prunable, ignored.

---

## HEADLINE

Since the boundary the picture changed materially on **both** lanes, and the roadmap is stale in two big ways:

1. **Mode-1 AUCTION is BUILT-LIVE** (roadmap: "0 lines / UNBUILT / the largest single Mode-1 build"). The full lane — state machine, two hooks, two routed pages, CPU-shill market, luxury tax, MLB→farm carryover, roster board, scout-privacy, coach UX, draft-freeze→Mode-2 bridge — is built and `tsc -b` clean on `mode1-v1-b` (RB-0…RB-15, RB-17).
2. **L14 (rebrand circuit-breaker) is BUILT-DARK COMPLETE** (roadmap: "MISSING — the largest unbuilt L-system"). So are **L13-6** and **L13-7**.

The genuinely-open v1 work is now smaller than the roadmap implies on *building*, but it is gated by one big structural item the roadmap names but no one owns:

> **The #1 v1 gap is the LANE-MERGE.** All auction/prospect/freeze/morale code lives ONLY on `codex/mode1-v1-b`; `codex/franchise-v1-next` (the living-season branch) has **zero** auction code (verified by grep). No ticket exists for the merge in either the roadmap or `AUCTION_REBUILD_PLAN`. Nothing Mode-1 reaches Mode-2 until this lands.

The gate chain **D12 → D13 → flag-flip → F-138 → F-141** is entirely unstarted. **D13 is an internal checkpoint; the real ship exit is the post-flag-flip iPad playtest (F-141).** All Phase-2 work is build-dark until D13.

---

## MAJOR ROADMAP-STALE CORRECTIONS (divergences, code-verified)

| Roadmap says | Reality (code) | Evidence |
|---|---|---|
| Mode-1 AUCTION = "0 lines / UNBUILT" | **BUILT-LIVE + routed** on mode1-v1-b; `tsc -b` exit 0 | `auctionStateMachine.ts:336`; `App.tsx:304-309`; `franchiseInitializer.ts:717-754`; RB-0…RB-15,RB-17 |
| L14 = MISSING (largest unbuilt L-system) | **BUILT-DARK COMPLETE** (L14-1/2/3), flag default-off, no live consumer | commits `9f848296`/`79cb7a7c`/`ed1cf4ef`/`a13deb5f`; `franchisePhase2Flags.ts:109`; `franchiseRebrand{Cascade,Apply,Dwell,Offer}.ts` ✅ Captain-reverified |
| L13-6 / L13-7 = "contracts authored" | **BOTH BUILT** (L13-6 live-flag-dark, L13-7 build-dark) | `6dd00141` (wired `processCompletedGame.ts:660`), `34bdd76e` |
| personality→canonical-7 PARTIAL (3/7 at `:247`) | **MOSTLY-CLOSED by RB-0** — full canonical-7 generated; residual = SCHOLARLY stock-player default | `prospectScoutingDraftEngine.ts:291`; residual `masterMoraleMatrix.ts:547` |
| G3 reporters invented at `reporterNameGenerator.ts:3-28` | **That file does not exist.** Reporter names live at `narrativeEngine.ts:399-465`; gap is real but is a pure repoint | `narrativeEngine.ts:399-465`; `data/smb4NameDatabase.ts` |
| stadium-by-value PARTIAL (schema build implied) | **By-value build moot per R9** — lock picker to stock SML set; name-keyed re-derivation then safe | `MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md:191-193`; `LeagueBuilderTeams.tsx:1151-1159` |
| tier-IV scale "latent" / tier-flat IV PARTIAL | **NOT-A-GAP per R7** — IV objective; tier scales budget + farm distribution only. Only residual = FARM IV-distribution tier-shift | `MODE1_V1_VERIFICATION.md` V11; `tierParams.ts:36-40` |
| DSTACK Captain-assignment + hidden-modifier blockers | **REFUTED/STALE** — both built at launch | `franchiseInitializer.ts:658` (modifiers), `:660` (captain) |
| `FRANCHISE_MODE1_MODE2_PLAYABLE_V1_GAP_ANALYSIS` as a gap source | **WHOLLY SUPERSEDED** (body last committed `9d586c10` 2026-06-09); every gap contradicted by the live L1–L13 stack + auction build — DISCARD | `FRANCHISE_MODE1_MODE2_PLAYABLE_V1_GAP_ANALYSIS.md:3-7` |
| Mode-1 active lane = `codex/mode1-v1` | **CONSOLIDATED** to `codex/mode1-v1-b` (superset); mode1-v1 parked @`956fd15d` | `CURRENT_STATE.md:80` |
| §9.A auction-only-v1 vs §9:411 snake tension OPEN | **RESOLVED (JK 2026-06-22):** snake stays user-selectable; only RB-13b engineering routing fork remains | DECISIONS_LOG 2026-06-22 |

---

## WHAT'S LEFT FOR v1

### THE LANE-MERGE (#1 structural prerequisite — UNOWNED)
Merge the entire `codex/mode1-v1-b` build (auction + prospect-gen + draft-freeze + draft-derived morale) into
`codex/franchise-v1-next`. `franchise-v1-next` has **zero** auction code (`draftFreeze.ts`/`draftMorale.ts`/
`draftFanMorale.ts`/auction hooks+pages all absent). The `AUCTION_REBUILD_PLAN` RB-0…RB-18 list contains **no
merge ticket**; the roadmap names lane-merge a v1 requirement but assigns it to no one. Every Mode-1 launch-contract
closure (G1 writer, GM entity, canonical-7, SMB4 names) currently lives only on mode1-v1-b. **Surface + scope + own this.**

### LANE 1 — Living-season (L/D-stack), `franchise-v1-next`
| Item | Status | Evidence / blocker |
|---|---|---|
| L13-5 / L13-6 / L13-7 | **DONE** (build-dark) | `c724fc7f` / `6dd00141` / `34bdd76e` |
| L14 rebrand circuit-breaker | **DONE** (build-dark) | `9f848296`/`79cb7a7c`/`ed1cf4ef`/`a13deb5f` |
| **L13-8** (flag-gated `processCompletedGame` wiring) | **NOT BUILT** — contract AUTHORED, build HELD | `PROMPT_CONTRACTS.md:14049-14070`. Completing it = L13 fully built-dark |
| **fame→morale wiring** (3 RULED-v1 gaps) | **MISSING (orphaned)** | (a) `applyWarLegitimacyGravity` `fameModel.ts:161` 0 callers; (b) fame tap = neutral stub `masterMoraleMatrix.ts:426`; (c) §20.6 Channel A/B producers absent. **Blocks the L-SIM final gate** |
| **trade-request propensity wiring** | **MISSING (orphaned)** — cheap | `tradeRequestGeneration.ts:77` 0 callers; L10 emits flat 1/3 dice-split `franchiseL10EventEngine.ts:~334` |
| **L12-6** race/award/All-Star UI surfacing + `allStarSelections` counter | **NOT BUILT** | untouched in delta; `AwardsWatchlist`/allstar tab exist but race-standings surfacing + career counter not done |
| L13-3b / L4b | **NOT BUILT** | L13-3b deferred-logged; L4b (matrix-sourced season takes over L4a bus) deps met, no code |
| **L-ECON1** (tier-IV scale + **G1 draft-IV freeze**) / L-ECON2 (tradeable picks) / L-ECON3 (farmGradeMode skew) | **NOT BUILT** | no economy engine code in delta; must precede the v1 draft/salary freeze |

### LANE 2 — Mode-1 / economy / handoff, `mode1-v1-b`
| Item | Status | Evidence / blocker |
|---|---|---|
| Auction engine + RB-0…RB-15, RB-17 | **DONE** | see corrections table; `tsc -b` exit 0 whole-lane |
| **RB-13b** route draft flow by `draftFormat` | **NOT BUILT** — design-gated | `draftFormat` persisted but inert (`getLeagueDraftFormat` 0 prod callers); no global active-league anchor; both pages self-pick `leagues[0]`. Snake-selectable tension resolved; only the routing model fork remains |
| **RB-16** sim-tune sweep + draft-economy validation harness | **NOT BUILT** — Captain-run, large | no sim-tune file exists; all §11/§13 dials default-set, unswept; absorbs deferred EV-flatness + surplus-pool checks. Mode-1 economic confidence depends on it |
| **RB-18** live lineup-morale UI | **NOT BUILT** | `moraleDisplay.ts` shipped build-dark (RB-17), imported by nothing until RB-18; gated on the live morale path (post-flag) |
| **B8** prospect age generation (**§10 reversal**) | **NOT BUILT** (the reversal) | fixed-age B8 shipped `87331ae0` (age=18); JK's 2026-06-22 §10 reversal — generate skew-young *revealed* age — is unbuilt: code still `PROSPECT_DRAFT_AGE=18` (`prospectScoutingDraftEngine.ts:416,1118`) |
| ~~B9 distribution-validation test~~ | **DONE** ✅ *(re-check correction)* | `fd772933` added `src/utils/tests/prospectScoutingDraftEngine.test.ts` — 40k prospects realize §3.2 within ±0.3pp (22 tests). **Prospect-gen B1–B9 COMPLETE incl. the NFL gate.** First pass looked in `__tests__/` (wrong dir vs `tests/`) |
| ~~AUC-5.1 farm-auction (5.1a–e)~~ | **DONE** ✅ *(re-check correction)* | full chain `ecd36347`/`d0a5fae5`/`456e0f46`/`b5523bd3`/`55fd759c`/`e76f84b5`/`070a2aa2`/`f0e7c7a9` ("AUC-5.1 COMPLETE") — resolves the earlier "not confirmable" flag |
| RB-7/8/9 follow-up reworks (~10, DECISIONS_LOG 2026-06-22) | **PARTIAL / mostly unbuilt** | only D-9b-2 (defense-6th-identity) confirmed built (`02e90f0d`); the other ~9 reworks not individually commit-verified — flag for re-check |

### Open launch-contract gaps (Mode-1, post-RB)
| Gap | Status | Evidence |
|---|---|---|
| **G1 frozen draft-IV True-Value baseline** (the economy anchor) | **OPEN — the single no-ambiguity hard gap.** RB-7 froze settledSalary+morale only; **no distinct draft-IV** | `draftFreeze.ts` has no `iv` field; no `franchiseTrueValueSnapshots` checkpoint-0 write; `valueDelta=trueValue−salary` `salaryCalculator.ts:1019` ✅ Captain-reverified |
| **G3 reporter names from SMB4 pool** | **OPEN** (pure repoint) | `narrativeEngine.ts:399-465` invents; `data/smb4NameDatabase.ts` already used by GM + operating scout |
| **G3 bridge/report-scout names** | **OPEN** | `leagueBuilderStartupFarmDraft.ts:299` ("Startup Farm Scout N"), `franchiseStartupProspectDraft.ts:211` ("Bridge Scout N") |
| **"Lock the league" true freeze** | **MISSING** (stronger than roadmap PARTIAL) | `RegisteredPool` has no lock flag (`leagueConstruction.ts:33-43`); `saveRegisteredPool` overwritable put; snake auto-regenerates |
| **Player-instance frozen-at-lock** | **PARTIAL** (shape-only) | lock persists thin `{id,iv,salary}`; no `lockedAt`/frozen instance; base Player mutable post-lock. Depends on the league lock |
| **Stadium picker lock to stock SML set (R9)** | **OPEN** (re-scoped to WIRING) | still free-text `<input>` `LeagueBuilderTeams.tsx:1151-1159`; unknown name → silent park-factor loss |
| **Manager entity (§3.5)** | **MISSING** — type-change build | manager = bare text fields `leagueBuilderStorage.ts:139-140`; Mode-2 L11 needs a structured entity (Charisma/Loyalty), SMB4-named |
| Personality SCHOLARLY residual | **OPEN** (small) | `normalizePersonality` defaults SCHOLARLY→RELAXED `masterMoraleMatrix.ts:547`, but `useOffseasonData.ts:135` maps SCHOLARLY→TIMID — reconcile |
| R10 morale=50 seed at creation | **WIRED** (reader disagreement reconciled) | `seedFranchiseMoraleBaseline` via RB-7b freeze `franchiseInitializer.ts:739-754` |
| G4 captain charisma-floor | **NOT-A-GAP / no-op** | newer canonical `PERSONALITY_SYSTEM_SPEC §5.3` (2026-06-17) removed the floor; current code correct-by-design |

### NET-NEW designs pulled into v1 since the boundary (specced-intent-only / unbuilt)
- **§8.5 Pitcher game score** per game (stats lane) — no spec, no code in either worktree.
- **§8.6 Beat-reporter standout Q&A** (personality-shaped) + **§8.1 pronoun prereq** — "the meatiest addition"; unbuilt; **not** closed by L13-7.
- **R6/§6 auction hot-seat single-iPad pass-around UX spec** — the one genuinely net-new auction spec still to author (logic exists; UX spec doesn't).
- **Prospect age reversal (§10)** = B8 (above).
- **DH removed entirely** (pitchers always bat) — ~9 Position defs + `ivEngine.ts:205` + lineup/sub plumbing + ~38 test pins; `iv_oracle.json` has zero DH (no re-bless needed).
- **Rookie vs Fan Hopeful distinction** (`rookieStatus` flag + ROOKIE badge, set on first call-up of a farm-drafted player) — unbuilt.

### The gate chain (all NOT STARTED)
`D12` iPad smoke → `D13` internal sign-off ("no phantom morale") → **flag-flip** (Phase-2 activation) → `F-138` offseason flag → **`F-141` post-flag-flip iPad playtest = the real v1 ship**.
- **L-SIM final hard gate:** 2 of 3 blockers cleared (L13 tail + L14 now built); remaining = **fame→morale wiring + L13-8**. `SEASON_SIMULATION_REPORT.md` (2026-06-19) is **STALE** — predates L13-6/7 + L14; must be re-run.
- **BROWSER-VERIFY batch** (BV-1/2 persistence first, then BV-3 auction surface; BV-9/11/12/13a/14) — JK's sole real-world acceptance gate, not started.

---

## OPEN JK DECISIONS (gate their builds)
- **D-7c-2** — does the winning auction bid carry into Mode-2 cap/payroll? (most consequential economy decision)
- **D-10b-1** — shill-exclusion won-order denominator (soul-layer measurement fork).
- **D-7b-2 / D-7c-1** — iv-centered freeze range @ accuracy 70 / farm settledSalary deferral.
- **V8** — park→WAR v1 boundary (STADIUM_ANALYTICS §1.0 "preview-only" vs vision §8.8 "v1-critical").
- **V9** — farm grade-model (round-keyed tables + D+/no A+ vs `PROSPECT_GENERATION_SPEC §3.2` single fixed A–D); gates B9 + FARM_NERF_SCALES.
- RB-13b active-league routing model; the §8.x net-new scope confirmations.

---

## SET-ASIDE CLUSTER (other thread owns — listed, NOT assessed)
- `RATINGS_ADJUSTMENT_SPEC` adjustment **math** (peer-calibrated signal model, convex over-expectation curve, edge compression, equilibrium bound). *(Engine-consolidation, 5-band age model, cadence-default-10%, DH-removal SCOPE facets are tracked above as in-scope.)*
- `TRAIT_GAIN_LOSS_THRESHOLD_SPEC` — traitWeight, tier thresholds, negative inversion, selection-layer scoring, ~27% negative rarity.
- `TRAIT_MEASUREMENT_SPEC` — season-to-date aggregate + trend tilt + SP/RP cohorts.
- `CHEMISTRY_TRAIT_POTENCY_VALUATION_SPEC` — L1/L2/L3 potency ramp, POTENCY_SCALE 2.0→3.0, §9 11-point surface (research-only, unratified).
- In-season **L8 ratings-checkpoint** + **L9b trait-checkpoint** models (the adjustment math).
- **RB-9 analyzer traits/chemistry analysis math** + `chemistryFitValue.ts`/`marginalChemistryValue` magnitude tuning. *(The RB-9 roster-BOARD + scout-as-bridge WIRING is in-scope and built; the D-8 'remove'-direction consumption is unconfirmed — tracked above.)*

---

## PROPOSED ROADMAP_TO_V1.md REFRESH (pending JK approval — NOT yet applied)
1. Flip Mode-1 AUCTION critical-path line: UNBUILT → BUILT-LIVE+routed on mode1-v1-b (RB-0…RB-15,17); remaining = RB-13b, RB-16, RB-18.
2. Flip L14: ⬜ MISSING → BUILT-DARK COMPLETE (commits + flag + no live consumer).
3. Flip L13-6 / L13-7: "contracts authored" → BUILT.
4. Correct G1: do **not** mark closed by RB-7; re-scope to "build against AUCTION finalize per §9-A — write a `franchiseTrueValueSnapshots` checkpoint-0 row + additive settledSalary (GREEN seam, no DB bump)."
5. **Add an explicit LANE-MERGE ticket** to ROADMAP + `AUCTION_REBUILD_PLAN`; name it the #1 structural prerequisite.
6. Down-status personality→canonical-7 to MOSTLY-CLOSED (RB-0); fix the cite (`:291`, residual `:547`, not `:247`/`:525`).
7. Correct the G3 reporter cite (`reporterNameGenerator.ts` does not exist → `narrativeEngine.ts:399-465`); scope as a repoint; include bridge-scouts.
8. Reframe stadium-by-value → "lock picker to stock SML set (WIRING)" per R9.
9. Reframe tier-IV scale → NOT-A-GAP (R7); keep only "FARM IV-distribution tier-shift, gated on V9."
10. Mark G4 captain charisma-floor NOT-A-GAP per §5.3; confirm-and-close.
11. Add net-new v1 line items: §8.5 pitcher game score, §8.6 standout Q&A + §8.1 pronoun, R6 hot-seat UX spec, B8 age reversal, B9 distribution test, DH-removal, rookie/Fan-Hopeful flags.
12. Stamp `FRANCHISE_MODE1_MODE2_PLAYABLE_V1_GAP_ANALYSIS` superseded; remove as a gap source.
13. Record lane consolidation + snake-stays-selectable ruling.
14. Refresh the L-SIM line: 2/3 blockers cleared; remaining = fame-wiring + L13-8; flag the 2026-06-19 sim report STALE.

## CONFIDENCE FLAGS / CAVEATS
- **Temporal caveat:** `MODE1_V1_VERIFICATION` + `MODE1_TO_MODE2_V1_LAUNCH_READINESS` are both dated 2026-06-20 (boundary day) and read **pre-RB** — they show G1/G2/G3 open. Where they disagree with live code, **the commit-readers (live code) win.**
- **All status is static/read-only** (commit-reader ran `tsc -b` on mode1-b only). Build-dark/wired claims are file:line + commit-hash backed but **not browser-verified** — JK's BV batch + F-141 remain the real-world acceptance gate.
- Lane-merge "un-merged" claim = worktree topology + `git ls-files` (auction files absent on franchise-v1-next), consistent across 3 readers + Captain grep; not a merge-attempt.

## RE-CHECK ADDENDUM (post-comb, JK-directed 2026-06-22)
A second sweep for "just-committed-and-missed" work (re-snapshot of both HEADs + code-commit + missing-item greps) produced:
- **`mode1-v1-b` unchanged** (HEAD still `68cfbc4e`) — Mode-1 lane fully captured.
- **`franchise-v1-next` advanced 2 commits** (`73263f41`, `af3181bc`) — both **ratings-design docs = SET-ASIDE**, no v1-picture impact. Exactly **6 code commits** since boundary on this branch (the 4 L14 + L13-6 + L13-7) — none of the "missing" living-season items quietly landed. The remaining-list **holds**.
- **3 Mode-1 corrections** (all make Mode-1 *more* complete; folded into the tables above): **B9 DONE** (`fd772933`), **AUC-5.1 farm-auction COMPLETE** (`f0e7c7a9`), B8 fixed-age shipped (`87331ae0`) with only the §10 age-reversal open.
- Net effect on "what's left": **B9 and AUC-5.1 come OFF the Mode-1 remaining list**; everything else (lane-merge, G1, fame-wiring, trade-req, L12-6, L13-8, RB-13b/16/18, B8 age-reversal, the §8.x net-new scope, the gate chain) is unchanged.
