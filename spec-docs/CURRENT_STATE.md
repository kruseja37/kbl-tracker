# CURRENT_STATE.md — LIVE HEADER

**Last Updated:** 2026-06-16 (AUTONOMOUS BUILD RUN COMPLETE — **7 feature commits + D5 confirm**: L1, D1, D2,
L1.5+OD-1, L4a-connect, L4a-bus, **D6a** (the make-or-break True-Value trust gate, LIVE half). D0 RATIFIED; Phase-2
L-stack sequenced + LSD-1..6 ruled. **NEXT = D6b (season-end freeze) → D7 (designations live, incl. Albatross +
Fan Favorite)** — resume in a FRESH context (value-spine work deserves fresh audit rigor). Open decisions: OD-2..5,
the D4 salary/value-preview scope snag, the soul-layer design rulings. **Detailed per-ticket trail in
`AUTONOMOUS_RUN_LOG.md`** (read it for the build run). Branch codex/franchise-v1-next; nothing pushed.)
**Branch:** codex/franchise-v1-next

> This file is the LIVE status header — the thing every session-start reads.
> Rewrite it in place each session (do not append). Full arc-by-arc history
> lives in `CURRENT_STATE_HISTORY.md`. Roles/routing/loops live in
> `AI_TEAM_OPERATING_MODEL.md`. Non-negotiable rules live in `SESSION_RULES.md`.

---

## RIGHT NOW

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
- **NEXT (resume in a FRESH context — value-spine work deserves fresh audit rigor):** **D6b** (season-end freeze of
  the trusted-value artifact → deterministic D8/D9 awards) → **D7** (designations LIVE: promote TEAM_MVP/ACE to
  non-'Proj.' + **add Albatross**; reconcile the dual designation path; emit `DesignationEvent` w/ NO morale
  mutation; Fan Favorite stays Phase-2). Then D8 → D9 (awards, with the LSD-1 fame-ready seams + MOY-1..7) → D10–D13.
  **Still needs JK:** OD-2..5 (L-ECON1/L2/L4a-reporter-UI/L9a — leans in `AUTONOMOUS_RUN_LOG.md`) · the **D4**
  salary/value-preview scope snag (chips live on the combined TrueValue+ExpectedWins panel) · the **soul-layer
  design rulings** (L3 morale matrix / L6 fame / L8 development — JK's vision; "build to spec" greenlights them).
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

**7,254 tests / 400 files** — full suite re-run 2026-06-16 at the autonomous-run close: **7,251 pass / 3 fail**,
the 3 being EXACTLY the characterized set. (+24 tests / +7 files over the prior 7,230 / 393 from this run's new
tests: L1/L1.5/D2/L4a/L4a-bus/D6a.) `trackerDb` is now **v17** (L4a-bus→16, D6a→17); `KBL_BACKUP_VERSION` stays 2.
The autonomous run added 5 IndexedDB stores (seasonNewsItems, seasonEmissionConfig at v16; franchiseTrustedValue-
Artifacts at v17; + the D2-registered franchise-economy stores) — all in trackerDb + backup registry + the
parity-guard. Characterized set (a new RED OUTSIDE it is a real regression): **wpaRuntimeBoundary +
franchiseManualSmokeFixture + franchiseNarrativeEventEligibility** (GameTrackerLaunchState +
franchiseOffseasonGuards.component are conditional-solo order-flakes that passed in this full run).
**CLI:** prefix `NODE_ENV= `; node at `~/.nvm/versions/node/v20.20.0/bin`.

## BROWSER-VERIFY OUTSTANDING (JK)

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

## OPEN PENDING-JK (rolling)

**FROM THE 2026-06-16 AUTONOMOUS RUN (decisions that resume the build loop — full text + Captain leans in
`AUTONOMOUS_RUN_LOG.md`):**
- **OD-2** — L-ECON1 salary scale: scope (new-league-only vs before-the-freeze) + the pickValueChart-is-the-taper
  model. Value-sensitive (frozen draft-IV anchor); held.
- **OD-3** — L2 mutable-layer confirmation UX: blocking-vs-async (lean async) · console-edit format · game-count
  expiry. (L2 also premature — its consumers L3/L8/L9b are design-gated.)
- **OD-4** — L4a reporter: franchiseId-vs-leagueId scope (lean cascade) · ReporterAssignmentPanel UI placement.
- **OD-5** — L9a trait capture: manual-vs-auto enrichment (lean manual/opt-in). Live-game-path → watched session.
- **D4 SCOPE SNAG** — the salary preview chips live on the COMBINED "TrueValue+ExpectedWins" panel (`TeamHubContent
  .tsx:4623-4648`); D0's "de-gate salary, don't touch the D6-gated value preview" needs a presentation ruling.
  (D4 is NOT a D6 dependency — left as a flagged browser-session UI item.)
- **SOUL-LAYER "BUILD TO SPEC" GREENLIGHT** — L3 morale matrix / L5 fan teeth / L6 fame / L7 designation effects /
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
(3 members).
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
