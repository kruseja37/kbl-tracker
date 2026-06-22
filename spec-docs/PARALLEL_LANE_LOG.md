# PARALLEL LANE LOG — AUTH-4 Mode-1 independent build lane (`codex/mode1-v1-b`)

This is the SOLE ledger for the **parallel Mode-1 lane** (worktree
`/Users/johnkruse/Projects/kbl-mode1-b`, branch `codex/mode1-v1-b`, forked off
`codex/mode1-v1` @ `956fd15d`). Kept SEPARATE from `AUTONOMOUS_RUN_LOG.md` to fully
decouple from the attended thread's docs commits (the docs-branch-race avoidance per the
parallel-lane handoff). The attended thread (JK live) owns the chemistry/trait/prospect/
draft cluster on `codex/mode1-v1`; this lane runs INDEPENDENT cleanup/persistence/rework
tickets that never touch the OWNED files.

**Lane queue (handoff `HANDOFF_DONE_20260622T184759Z_parallel-rb`):** RB-17 (deprecate
`playerMorale.ts`) → RB-15 (persist farm DTOs/storylines). Skip any ticket whose grounding
shows it must touch an OWNED file.

> ⚠ **COORDINATION FROM ATTENDED THREAD (2026-06-22):** **RB-10 is RECLAIMED — do NOT take it.**
> The attended thread's H2 fix (CPU bidders must bid on a SCOUT-ESTIMATED value, not raw true IV)
> lives in `src/engines/cpuShillBidding.ts`, which is the RB-10 file — so RB-10 (CPU shill split +
> dissolve) is now COUPLED to the attended scout/CPU-value work and is OWNED by the attended thread.
> `src/engines/cpuShillBidding.ts` is now an OWNED file — do not edit it. Parallel lane = **RB-17 →
> RB-15 only**, then STOP and await a fresh baton (do not self-assign RB-9/10/11/12/13/14/16).

**Suite baseline (fork point `codex/mode1-v1` @ 956fd15d):** FULL Mode-1 suite ~496 files
(494 pass / 1 hard fail), 8059 tests. ONLY characterized hard fail = `wpaRuntimeBoundary`.
`GameTrackerLaunchState.test.tsx` + `AwardsWatchlist.test.tsx` are INTERMITTENT
ORDER-FLAKES (pass solo) — verify solo, don't count. ZERO-NEW-REDS = only
`wpaRuntimeBoundary` hard-fails after a ticket.

---

## WAVE P1 — 🔬 RB-17 GROUNDED + CONTRACT DISPATCHED (deprecate dead `playerMorale.ts`)

Claimed the parallel-lane baton (`HANDOFF_DONE_20260622T184759Z_parallel-rb`); confirmed
sole worker on `codex/mode1-v1-b` (no `codex exec` in flight; the attended `claude` procs
are on `codex/mode1-v1` — EXPECTED, different branch). Picked RB-17 (first eligible,
grounds cleanly, ZERO cluster overlap).

- **GROUNDING (Captain direct reads, kbl-mode1-b @ 956fd15d):**
  - `src/utils/playerMorale.ts` exports `toSuperscript`/`getMoraleColor`/`getMoraleState`/
    `getMoraleDisplay` + `MoraleDisplay` interface (the PURE render layer) + the
    non-canonical baseline layer `getBaselineMorale`/`getPlaceholderMorale` (+ private
    `PERSONALITY_BASELINES`, keyed on a DEAD taxonomy: JOLLY/TOUGH/ECCENTRIC/NORMAL/GRUMPY/
    FIERY/DISCIPLINED/SPIRITED/CRAFTY/GRITTY — NOT the canonical 7).
  - **Sole real MODULE importer** = the UNROUTED `src/components/GameTracker/
    PlayerNameWithMorale.tsx:10` (+ its test's `vi.mock`). The component is NOT
    barrel-exported by `index.tsx` (grep=0). Every other `playerMorale` grep hit is an
    unrelated local FIELD named `playerMorale` (ratingsDevelopment/franchiseL10/
    tradeRequestGeneration/checkpointSweep) — NOT a module import.
  - Test convention for `src/src_figma/app/utils` lives in
    `src/src_figma/__tests__/gameTracker/` (e.g. `playerLineupGameLine.test.ts`).
- **CONTRACT (RB-17, dispatched to Codex xhigh, stdin-from-PROMPT_CONTRACTS.md):**
  PORT the 4 pure helpers + `MoraleDisplay` to NEW `src/src_figma/app/utils/moraleDisplay.ts`
  (next to `playerLineupGameLine`/`playerLineupMeta` where RB-18 will consume them; exact
  hex/threshold values preserved as make-or-break) + NEW
  `src/src_figma/__tests__/gameTracker/moraleDisplay.test.ts`; DELETE `playerMorale.ts` +
  the dead `PlayerNameWithMorale.tsx` + its test. STOP-IF any OTHER live `src/…` file
  imports the module.
- **OPEN-DECISIONS-for-JK (documented defaults TAKEN; rework cheap):**
  - **(D-17-1) `getPlaceholderMorale`/`getBaselineMorale`/`PERSONALITY_BASELINES` RETIRED,
    not ported** — they are non-canonical (dead personality taxonomy), superseded by
    `masterMoraleMatrix`. **TENSION FLAGGED:** the plan's RB-18 line names
    `getPlaceholderMorale` for the lineup-morale placeholder. Conservative call: RB-18 should
    source its placeholder from a neutral value (`getMoraleDisplay(50)`) or the canonical
    `masterMoraleMatrix` baseline — NOT the retired non-canonical helper. The RB-17 mandate
    (retire) and the RB-18 mandate (use) conflict in the plan; RB-17 wins (it's the explicit
    retire instruction + the helper is non-canonical). Flagged for the RB-18 builder/JK.
  - **(D-17-2) Port home = `src/src_figma/app/utils/moraleDisplay.ts`** (the `@`-aliased UI
    util layer, beside the lineup utils RB-18 uses), NOT `src/utils/`. The deleted module
    lived in the base `src/utils/` layer; the ported helpers are UI-render-only.
  - **(D-17-3) The new `moraleDisplay.ts` is build-DARK** (imported by nothing until RB-18
    wires it) — intentional staging, exactly like other build-dark tickets.

**WAVE P1 (cont.) — ✅ RB-17 COMMITTED (`df4ada33`, `codex/mode1-v1-b`, branch-only, ZERO-NEW-REDS).**
- **BUILT (Codex gpt-5.5 xhigh stdin-from-contract → Opus audited the real diff line-by-line, builder≠auditor):** NEW pure `src/src_figma/app/utils/moraleDisplay.ts` (the 4 render helpers + `MoraleDisplay`; EXACT hex/threshold/clamp values preserved; zero imports) + NEW `moraleDisplay.test.ts` (4 non-vacuous tests — boundary color/state bands + clamp 150→99 / -10→0). DELETED `src/utils/playerMorale.ts` + the unrouted `src/components/GameTracker/PlayerNameWithMorale.tsx` + its 285-line test.
- **AUDIT (disprove-each, Captain direct reads):** diff = EXACTLY the 5 contracted paths (+102/−486); port byte-faithful vs the original (every hex/threshold/clamp matches); retired layer NOT ported; PURE module. Confirmatory greps: ZERO dangling `playerMorale` module imports, ZERO `PlayerNameWithMorale` refs, ZERO retired-symbol refs. Owned files + frozen IV oracle untouched (`git diff --stat` over all 17 owned paths + oracle = empty).
- **GATE (Opus ran tsc + the FULL suite himself, NOT the builder paste):** `tsc -b` exit 0 (proves no dangling import post-delete); FULL Mode-1 suite **496 files (494 pass / 2 fail), 8031 tests (8029 pass / 2 fail)** — fails = `wpaRuntimeBoundary` (characterized hard) + `franchiseManualSmokeFixture` (CONFIRMED order-flake — passes SOLO 4/4) ⇒ **ZERO NEW REDS**. File count holds at 496 (−1 deleted test / +1 new test); test count 8059→8031 (−32 dead-component tests / +4 new). No DB/store/oracle change.
- **⚠ ATTENDED-THREAD COORDINATION ABSORBED:** RB-10 RECLAIMED (`cpuShillBidding.ts` now OWNED). **Lane queue now = RB-17 (done) → RB-15 (last) → STOP + await fresh baton.**
- **➡ NEXT = RB-15 (resume = persist farm DTOs+storylines; §12; persistence, small):** switch farm-draft resume from regenerate-on-seed to persist the DTOs+storylines (additive, no DB bump). GROUND it does NOT require editing the OWNED `LeagueBuilderFarmAuctionDraft.tsx` / `leagueBuilderStorage.ts` cluster; if it must, SKIP per the handoff and STOP for a fresh baton.

## WAVE P2 — 🔬 RB-15 GROUNDED (4-dim recon + Captain direct reads) + CONTRACT DISPATCHED (farm-auction resume = persist the pool)

RB-15 = the LAST ticket in this lane (RB-10 reclaimed by the attended thread). Ground via an independent 4-dimension recon workflow (`wc2f6ee9l`, 4 agents) + the Captain personally re-read the safety-critical anchors (farmAuctionSession.ts, leagueBuilderStorage.ts save/get + type + version-pin, the hook, the DTO).
- **GROUNDING (corroborated by Captain reads + recon — ALL 4 dims: `ownedFileTouch.required=false`, `dbBumpRisk.required=false`):**
  - The FARM AUCTION resume (`useFarmAuctionDraft.ts loadFarmAuction:364-388`) REGENERATES the whole prospect pool from the seed (`buildFarmAuctionSession` → `generateProspectPool`) and shows `regen.pool`; the persisted `LeagueBuilderAuctionSession` row holds only the THIN session (`AuctionPlayer={playerId,iv,ivPercentile}` + `playerOrder`) — the rich DTOs (ratings/traits/`prospectProfile`/`hiddenPersonalityModifiers`/morale/personality/chemistry) are NEVER persisted. Resume already `console.warn`s on a regen-vs-persisted order mismatch + shows a "best-effort display pool".
  - Generation is 100% seed-deterministic TODAY (pure FNV-1a; ZERO Math.random/Date/crypto/LLM/fetch) ⇒ RB-15 is FORWARD-HARDENING: regenerate-on-resume goes LOSSY the moment the OWNED prospect generator (`smb4PlayerGenerator`/`prospectScoutingDraftEngine`/scout engines) drifts — which the attended thread is actively doing. Persisting the pool makes a saved draft immune.
  - "Storylines" = a non-existent separate artifact in code (FarmStoryline is unimplemented Mode-2 spec); the narrative rides on the DTO (`prospectProfile`). Persisting the pool persists it. "DTOs+storylines" == persist the `FarmAuctionPool`.
  - Saved-shape: `saveAuctionSessionById` is SPREAD-AND-PUT (persists arbitrary additive fields, no field-pick); `AUCTION_SESSIONS` store is schemaless; `DB_VERSION=8`. An additive `pool?: FarmAuctionPool` on `LeagueBuilderAuctionSession` needs NO new store + NO version bump; `leagueBuilderStorageV6Migration.test.ts` (`db.version===8` + store list) stays green. `farmAuctionPool` does NOT import `leagueBuilderStorage` ⇒ `import type` is cycle-free.
  - The OWNED page `LeagueBuilderFarmAuctionDraft.tsx` consumes `auction.pool?.prospects` READ-ONLY + only triggers load/init (no seed for load) ⇒ NO owned-page edit; the hook's public `pool` shape is unchanged.
- **CONTRACT (RB-15, dispatched to Codex xhigh):** (1) `leagueBuilderStorage.ts` (SHARED) — ONE additive `pool?: FarmAuctionPool` on `LeagueBuilderAuctionSession` + `import type`. (2) `useFarmAuctionDraft.ts` (not owned) — `poolRef` so `persist` carries the pool every save; init sets the ref before the first persist; resume PREFERS `row.pool` (load + recompute `farmTierCap` via `computeFarmTierCap` from the persisted pool, SKIP regenerate), falls back to the unchanged regenerate path for legacy rows w/o pool. (3) extend the real-fake-indexeddb hook test (init persists pool / resume loads it deep-equal / legacy row regenerates). GATE = FULL Mode-1 suite + the migration version-pin green.
- **OPEN-DECISIONS-for-JK (documented defaults TAKEN; rework cheap):**
  - **(D-15-1) Persist the WHOLE `FarmAuctionPool`** (`{prospects, auctionPlayers}`) as `pool?` — bulletproof display + lets resume recompute `farmTierCap` deterministically from the persisted IVs. Alt = persist only `prospects` + rebuild auctionPlayers (more code).
  - **(D-15-2) `farmTierCap` recomputed from the persisted pool** via `computeFarmTierCap` (single source of truth = the persisted pool), NOT persisted as a 2nd field.
  - **(D-15-3) Legacy rows (no `pool`) fall back to the EXISTING regenerate-on-seed path unchanged** — backward-compat, no migration; only new saves carry the pool.
  - **(D-15-4) Field on the SHARED `LeagueBuilderAuctionSession` is OPTIONAL (`pool?`)** — MLB sessions leave it undefined (the MLB pool persists separately via the RegisteredPool store); only farm sessions populate it. SHARED-file edit is one field + one type-import (merge-reconcile expected per the lane rule).

**WAVE P2 (cont.) — ✅ RB-15 COMMITTED (`30810a86`, `codex/mode1-v1-b`, branch-only, ZERO-NEW-REDS).**
- **BUILT (Codex gpt-5.5 xhigh stdin-from-contract → Opus audited the real diff line-by-line, builder≠auditor):** (1) `leagueBuilderStorage.ts` (SHARED) — EXACTLY +2 lines: `import type { FarmAuctionPool }` (cycle-free) + additive optional `pool?: FarmAuctionPool` on `LeagueBuilderAuctionSession`. NO store add, NO version change, NO body change (spread-put already persists it). (2) `useFarmAuctionDraft.ts` (not owned, +31) — `poolRef` threads the pool into every `persist` save; `initFarmAuction` sets the ref BEFORE the first persist; `loadFarmAuction` PREFERS `row.pool` (load + `setFarmTierCap(computeFarmTierCap(row.pool.auctionPlayers…))`, SKIP regenerate, integrity-warn on order mismatch), falls back to the UNCHANGED regenerate path for legacy rows w/o pool; `!row` branch clears the ref. (3) hook test (+93, real fake-indexeddb).
- **AUDIT (disprove-each, Captain direct reads):** diff = EXACTLY the 3 contracted paths (+118/−8); all 17 OWNED files + frozen IV oracle untouched (`git diff --stat` over them = empty). Storage change is one additive optional field. Hook: refs read latest value in the `[]`-dep `persist` (correct); pool unchanged during the auction so every save carries it; `buildFarmAuctionTeams` still called in the row.pool path (needed for `mlbRosterChemistryByTeamId` display; `teams` unused there but used in the legacy branch ⇒ no TS unused-var). Public `pool` return shape unchanged ⇒ OWNED page untouched. **MAKE-OR-BREAK proven by the test's SENTINEL:** the resume test re-saves the row with `prospects[0].prospectProfile.scoutName="Persisted Sentinel Scout"` (a value regeneration can NEVER produce) and asserts the resumed pool carries it ⇒ resume LOADS the persisted DTOs, does NOT regenerate. Legacy-fallback test proves regenerate still works when `pool` absent.
- **GATE (Opus ran tsc + the FULL suite himself, NOT the builder paste):** `tsc -b` exit 0; the 3 contracted test files 23/23 (incl. `leagueBuilderStorageV6Migration` proving `db.version===8` + store list UNCHANGED ⇒ saved-shape intact); FULL Mode-1 suite **496 files (494 pass / 2 fail), 8032 tests (8030 pass / 2 fail)** — fails = `wpaRuntimeBoundary` (characterized hard) + `franchiseManualSmokeFixture` (CONFIRMED order-flake — passes SOLO 4/4 even though it exercises leagueBuilderStorage) ⇒ **ZERO NEW REDS**. NO DB bump (DB_VERSION stays 8; META/trackerDb untouched).
- **OPEN-DECISIONS-for-JK:** D-15-1 (persist the WHOLE FarmAuctionPool) · D-15-2 (farmTierCap recomputed from the persisted pool, not separately stored) · D-15-3 (legacy rows fall back to regenerate; no migration) · D-15-4 (`pool?` optional on the SHARED record; MLB sessions leave it undefined). **JK BROWSER-VERIFY:** start a farm auction, leave mid-draft, resume → the SAME prospects/board reappear (no silent re-roll), especially after any prospect-generator change on the attended branch.

---

## 🏁 LANE COMPLETE — awaiting a fresh baton (do NOT auto-resume)

Both eligible parallel-lane tickets are DONE on `codex/mode1-v1-b` (branch-only, never pushed), each ZERO-NEW-REDS, no OWNED-file/oracle/DB touch:
- **RB-17** `df4ada33` — deprecate dead `playerMorale.ts`; port render helpers to `src/src_figma/app/utils/moraleDisplay.ts`; retire non-canonical baselines.
- **RB-15** `30810a86` — farm-auction resume persists the pool DTOs (bulletproof vs generator drift).

**RB-10 was RECLAIMED** by the attended thread (its `cpuShillBidding.ts` is now coupled to their scout/CPU-value H2 fix). The remaining RB tickets (RB-9/10/11/12/13/14/16, RB-12) are all OWNED/FORBIDDEN for this lane. **Per the coordination note, this lane STOPS here and awaits a fresh baton from the attended thread — it does NOT self-assign more tickets and does NOT spawn a new worker.** When JK/the attended thread wants more parallel work, drop a fresh `HANDOFF_NEEDED` naming the next independent (non-OWNED) tickets.

**Merge note for the integration line:** the one SHARED-file edit is `leagueBuilderStorage.ts` +2 lines (a `FarmAuctionPool` type-import + the additive `pool?` field on `LeagueBuilderAuctionSession`) — a trivial additive merge; expect to reconcile against any concurrent attended-thread edit to that interface.

---

## 🔁 LANE REOPENED — `codex/mode1-v1-b` is now the SINGLE active Mode-1 code lane (JK 2026-06-22)

JK gave the fresh baton via `/kbl-captain` and ruled that **all Mode-1 code commits land on `codex/mode1-v1-b`** (the superset branch = main lane + RB-17 + RB-15), NOT `codex/mode1-v1` (which would fork the history) and NOT `codex/franchise-v1-next` (docs/contracts/ledger only). The attended thread on `codex/mode1-v1` has wrapped (its review produced the 2026-06-22 rulings); the "owned/parallel" split is collapsed — RB-9 cluster work now also rides this lane. Going forward, **dispatch Codex builds in the `/Users/johnkruse/Projects/kbl-mode1-b` worktree.** `codex/mode1-v1` stays parked clean at `956fd15d`.

## WAVE P3 — ✅ RB-9b-2 COMMITTED (`02e90f0d`, `codex/mode1-v1-b`, branch-only, ZERO-NEW-REDS) — the Defense-inclusive 6-band farm-archetype hole-weighting TILT (JK D-9b-2 reversal); RB-9c unblocked.

Implements the JK ruling DECISIONS_LOG 2026-06-22 **D-9b-2 (REVERSED): Defense IS a 6th identity category** — the §3.5 farm-archetype hole-weighting tilt must run on the 6-band archetype (incl. Defense) broken into the cap-modification ELEMENTS, NOT the 5-category `Smb4TeamProfileLevels`. This MUST land before RB-9c consumes it.
- **GROUNDED (Captain direct reads + a thorough recon, kbl-mode1 @ 956fd15d):** `AnalyzerFinding` (`rosterAnalyzerEngine.ts:224-234`) carries `kind: AnalyzerConstraintKind` (15 kinds incl. `position_coverage`/`lineup`/`rotation`/`bullpen`/`depth_chart`), `severity`, NO structured position/band/weight field → the JOIN is by `kind`, not text-parsing. 6 `BANDS` decompose to mod-stats via `BAND_STATS` (Defense=[FLD,ARM]); `CAP_MODIFICATION_FRACTIONS` (tierParams) holds the 42 named "archetype elements" (`'Defense First'` FLD .576/ARM .265, `'Big D'`, `'Catch the Ball!'`…) — exactly the Defense-bearing data the 5-cat profile dropped. The RB-9b `farmArchetypeProfile.ts` was imported by NOTHING (build-dark) → safe to retire.
- **BUILT (Codex gpt-5.5 xhigh stdin-from-contract → Opus audited the real diff line-by-line, builder≠auditor):** NEW pure `src/engines/farmArchetypeTilt.ts` — `archetypeBandWeights(identity)` (6-band emphasis incl. Defense, derived element-first by summing positive deltas per band via `BAND_STATS` [the canonical `bandScores().pos` pattern, replicated not imported], with a `bandPriorities` fallback + neutral all-zero; normalized to max-band=1) · `FINDING_KIND_TO_BANDS` (position_coverage/depth_chart→Defense, lineup→Power/Contact/Speed, rotation→Rotation, bullpen→Bullpen; all other kinds untilted) · `tiltAnalyzerFindings` (one-sided multiplier 1+bandWeight×tiltStrength ∈ [1,1.6]) · `sortByTiltedPriority` (stable severity-then-tilt ranker for RB-9c). RETIRED `farmArchetypeProfile.ts` + its test.
- **AUDIT (disprove-each, Captain direct reads):** diff = EXACTLY the 4 contracted files (+286/−146); PURE (imports only types/consts: leagueConstruction, tierParams, rosterAnalyzerEngine TYPES — no React/storage/Date/random; rosterAnalyzerEngine untouched). Make-or-break hand-verified: `increase:['Defense First']` → Defense raw .841 (FLD .576+ARM .265; Speed .2 from SPD but Defense dominates) → normalized Defense=1 strict-max (the EXACT capability the 5-cat bridge could not express); a `position_coverage` hole under it → ×1.6, a `rotation` hole → ×1.0. Test non-vacuous (8 tests; `expectStrictMax` asserts max===1 AND all others strictly less). Frozen IV oracle + owned files untouched (`git diff --stat` empty).
- **GATE (Opus ran tsc + the FULL suite himself on `codex/mode1-v1-b`, NOT the builder paste):** `tsc -b` exit 0 (proves the retired file had no live importer); FULL Mode-1 suite **496 files (495 pass / 1 fail), 8036 tests (8035 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` (characterized hard) ⇒ **ZERO NEW REDS** (no order-flakes this run; test math: 8032 −4 retired +8 new = 8036). NO DB/store/oracle change. Branch-only, NOT pushed.
- **⚠ PROCESS NOTE (re-home):** the build was dispatched in the `kbl-mode1` (`codex/mode1-v1`) worktree by mistake (stale lane read), caught BEFORE any code commit. The output was re-homed to `codex/mode1-v1-b` byte-identical (matching shasums), re-gated on the new base, and committed here; `kbl-mode1` was restored clean to `956fd15d`. No cherry-pick/revert needed (nothing had been committed). Contract `RB-9b-2` (docs `0aca0ea8`) ROUTE line corrected.
- **OPEN-DECISIONS-for-JK (documented defaults TAKEN; rework cheap):**
  - **(D-9b-2-a) tiltStrength = 0.6** (top-band hole → ×1.6) — §11 sim-tunable placeholder.
  - **(D-9b-2-b) FINDING_KIND_TO_BANDS:** Defense is first-class via `position_coverage`/`depth_chart`; `lineup`→offense (Power/Contact/Speed); `rotation`/`bullpen`→their bands; all other analyzer kinds (data_integrity/roster_count/team_profile/pitch_arsenal/salary_value/luxury_cap/trait_usage/chemistry_balance/farm_options/phase_lock) intentionally UNTILTED (the tilt only re-ranks positional/role holes).
  - **(D-9b-2-c) element-first derivation** (positive band-delta sum over `increase` elements) with a `bandPriorities` fallback; tilt is ONE-SIDED (raises matching holes, never lowers others) per §3.5 "screams louder."
- **➡ RB-9c SPLIT (3): 9c-1 (farm-archetype setup picker) · 9c-2 (the §9 board UI) · 9c-3 (tilt + salary/wallet wiring).**

## WAVE P4 — ✅ RB-9c-1 COMMITTED (`4320f02a`, `codex/mode1-v1-b`, branch-only, ZERO-NEW-REDS) — the farm-archetype setup picker (the INPUT side; §4.2 independent dual identity).

- **BUILT (Codex gpt-5.5 xhigh stdin-from-contract → Opus audited the real diff, builder≠auditor):** a NEW collapsible "Farm Identity (Cap)" picker in `LeagueBuilderTeams.tsx`, mirroring the MLB "Team Identity (Cap)" picker EXACTLY for the existing `Team.farmCapIdentity` (RB-9b field) — separate `formData.farmCapIdentity` slice (init from `team.farmCapIdentity` on edit), `isFarmCapIdentityOpen`, `farmCapIdentityValidation`, `updateFarmCapIdentityPriority`/`updateFarmCapIdentityMod`/`suggestFarmCapIdentityFromPriorities`, the farm shifted-cap preview, and the `farmCapIdentity` build + payload inclusion in `handleSave`. Reuses the SAME `BANDS`/`createEmptyBandPriorities`/`CAP_IDENTITY_MOD_OPTIONS`/`composeIdentity`/`applyIdentitySelection` machinery (no duplication). +1 test.
- **AUDIT (disprove-each, Captain read the real diff):** **345 insertions / 0 DELETIONS** ⇒ the existing MLB `capIdentity` picker + handlers + `handleSave` build are behaviorally UNCHANGED (purely additive). The farm picker is fully INDEPENDENT (separate state/validation/handlers/JSX section, distinctly labeled). MAKE-OR-BREAK proven by the new test: it edits farm (Power=4, increase POW, decrease ARM), saves, and asserts `updateTeam` got `capIdentity` STILL all-zero/empty AND `farmCapIdentity` = the farm choices ⇒ independence + round-trip in one assertion. Storage untouched (field pre-existed); frozen oracle untouched.
- **GATE (Opus ran tsc + the FULL suite himself on `codex/mode1-v1-b`):** `tsc -b` exit 0; FULL Mode-1 suite **496 files (495 pass / 1 fail), 8037 tests (8036 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ **ZERO NEW REDS** (+1 farm round-trip test; no order-flakes). Branch-only, NOT pushed.
- **➡ NEXT = RB-9c-2 (the §9 roster-visibility board UI — "hard requirement A4").** ⚠ A genuine UX surface (board layout, gap rendering, salary/payroll/wallet placement) → product call SURFACED to JK before building (see the live thread). Consumes `analyzeDraftRoster` (RB-9a); RB-9c-3 then adds the `tiltAnalyzerFindings`/`sortByTiltedPriority` ordering + the D-9a-1 #4/#7 salary+payroll+wallet. Build in `kbl-mode1-b`.

## WAVE P5 — ✅ RB-9c-2 COMMITTED (`e8af77ff`, `codex/mode1-v1-b`, branch-only, ZERO-NEW-REDS) — the §9 roster-visibility board (position-slot grid). **JK UX RULING 2026-06-22: position-slot grid** (chosen over an analyzer-chip panel or two-column lists, via an attended pick).

- **BUILT (Codex gpt-5.5 xhigh stdin-from-contract → Opus audited the real diff, builder≠auditor):** NEW pure `src/src_figma/app/components/DraftRosterBoard.tsx` (props-driven, imports only `ReactNode` — no analyzer/tilt/storage/session types) rendering a depth-chart grid: MLB slots = field C/1B/2B/3B/SS/LF/CF/RF/DH (1 each) + SP×5 + RP×6 + CP + DEPTH/BENCH overflow; farm = won prospects grouped by primary position + generic OPEN slots up to 10. Filled slots → `EntryCard` (name + position badges + won salary); empty required slots → `GapCard` (dashed `#FFD27A` border + "OPEN" + "{pos} GAP"). Header strip = `{filled}/{target} slots` + running payroll (Σ salaries) + wallet remaining. Mounted after the LOT LOG on BOTH auction pages (additive `+36` each), fed by the board team (`currentBidderTeamState ?? leagueData.teams.find(controlledBy==='human')`) → roster mapped to `DraftBoardEntry[]` (MLB via `playerById`, farm via `prospectById`). + a 2-test component suite.
- **AUDIT (disprove-each, Captain read the real diff):** diff = EXACTLY the 4 contracted files (+506/−0, purely additive — no existing LOT LOG/bidding/tally markup changed). Component is PURE VISUALIZATION — it imports NO analyzer/tilt engine and computes NO hole intelligence (RB-9c-3 adds that; respects §9 "reuse the analyzer, don't rebuild a parallel detector"). Make-or-break proven by the component test: a C+SP roster shows "Casey Catcher" in the C slot, "OPEN/SS GAP" in SS, "OPEN/OF GAP" in LF, header "2/22 slots" + payroll + wallet. **FARM no-ratings safe:** `EntryCard` renders ONLY name/position/salary; the farm component test asserts `/\b(POW|CON|SPD|FLD|ARM|VEL|JNK|ACC)\b/` is NOT in the document, and the page's characterized "obscured farm flow" test stays green.
- **GATE (Opus ran tsc + the FULL suite himself on `codex/mode1-v1-b`):** `tsc -b` exit 0; FULL Mode-1 suite **497 files (496 pass / 1 fail), 8039 tests (8038 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ **ZERO NEW REDS** (+1 file/+2 component tests; no order-flakes). Frozen oracle untouched. Branch-only, NOT pushed.
- **OPEN-DECISIONS-for-JK (documented defaults TAKEN; rework cheap):**
  - **(D-9c-2-a) board team = `currentBidderTeamState`, else the `controlledBy==='human'` team** — consistent with the existing budget/tally display. Multi-human hot-seat shows the active bidder's board. Alt = a team selector.
  - **(D-9c-2-b) MLB slot template** = field ×1 / SP×5 / RP×6 / CP×1 + DEPTH/BENCH (target 22); **farm** = grouped-by-position + generic OPEN slots to 10. v1 default — JK/sim-tunable (e.g. SP count, RP count).
  - **(D-9c-2-c) the board is pure visualization** — gaps = empty templated slots (a rendering fact, NOT hole-detection); the analyzer-driven tilt-PRIORITIZATION + the over-budget warning are RB-9c-3.
- **➡ RB-9c-3 SPLIT (3a MLB / 3b farm) — 3b needs a `useFarmAuctionDraft` change (expose the completed MLB roster) that 3a doesn't, so isolate it.**

## WAVE P6 — ✅ RB-9c-3a COMMITTED (`54de2f62`, `codex/mode1-v1-b`, branch-only, ZERO-NEW-REDS) — MLB draft-board intelligence (analyzer gap-priority + wallet-cap solvency warning) + the SHARED board props.

- **BUILT (Codex gpt-5.5 xhigh → Opus audited the real diff, builder≠auditor):** (1) `rosterAnalyzerDraftAdapter.ts` — additive opt-in `walletCap?: number`; `salary.enabled = typeof walletCap === 'number'` + `luxuryCap = walletCap` when present (absent ⇒ byte-unchanged disabled; `input.config` still wins) — the D-9a-1 "analyzer salary check wired to the actual wallet cap." (2) `DraftRosterBoard.tsx` — additive optional `priorityGaps?: BoardPriorityGap[]` + `budgetWarning?: string | null` → a `BoardAlerts` sub-section (PRIORITY GAPS chips `SEVERITY · label` + an over-budget banner `role=alert`); returns null when both absent ⇒ unchanged render; component stays engine-decoupled (only `ReactNode`). (3) `LeagueBuilderAuctionDraft.tsx` — `analyzeDraftRoster({mlbWonPlayers: the board roster, farmWonPlayers: [], walletCap: budgetRemaining+payroll})` → `tiltAnalyzerFindings(gapFindings, undefined)` (severity-only; the §3.5 farm tilt is 3b) → `sortByTiltedPriority` → top-5 `priorityGaps`; `budgetWarning` = forward-looking solvency (`budgetRemaining < rosterSlotsRemaining * minSalary`). + tests.
- **AUDIT (disprove-each, Captain read the real diff):** diff = EXACTLY the 5 in-scope files (+209/−2), all ADDITIVE. Adapter backward-compat PROVEN by tests: no walletCap → no salary findings (existing behavior); walletCap 1M < 1.5M payroll → `luxury_cap` finding fires; explicit `config.salary` still wins. Board additivity PROVEN: the absent-props test asserts no "PRIORITY GAPS"/no warning render; the provided test asserts the chips + alert. MLB passes `undefined` identity (no farm tilt — correct per §3.5). `rosterAnalyzerEngine.ts`/`farmArchetypeTilt.ts`/frozen oracle untouched.
- **GATE (Opus ran tsc + the FULL suite himself on `codex/mode1-v1-b`):** `tsc -b` exit 0; FULL Mode-1 suite **497 files (496 pass / 1 fail), 8043 tests (8042 pass / 1 fail)** — sole fail `wpaRuntimeBoundary` ⇒ **ZERO NEW REDS** (+4 tests; no order-flakes). Branch-only, NOT pushed.
- **OPEN-DECISIONS-for-JK (documented defaults TAKEN; rework cheap):**
  - **(D-9c-3a-a) MLB board = NO farm tilt** (`undefined` identity → severity-only ranking) — the §3.5 archetype tilt is farm-specific; the MLB archetype mechanism is the luxury tax. Alt = tilt the MLB board by its `capIdentity` for symmetry.
  - **(D-9c-3a-b) over-budget warning = forward-looking solvency** (`budgetRemaining < rosterSlotsRemaining × minSalary` = "can't afford to fill remaining slots at the reserve floor") — the actionable "pushes you over" signal. The analyzer salary check is ALSO wired (luxuryCap = total budget) per the literal D-9a-1.
  - **(D-9c-3a-c) walletCap = budgetRemaining + payroll** (the team's original total auction budget).
- **➡ NEXT = RB-9c-3b (the LAST RB-9c piece — the §3.5 scout-as-bridge on the FARM board):** expose the completed MLB roster from `useFarmAuctionDraft` (it already loads `mlbSession = getAuctionSession(leagueId)` at `:172` + derives `mlbRosterChemistryByTeamId` — add a per-team MLB roster/playerId exposure), then on `LeagueBuilderFarmAuctionDraft.tsx`: `analyzeDraftRoster({mlbWonPlayers: the GM's completed MLB roster, farmWonPlayers: the farm roster so far, walletCap: farm budget})` → `tiltAnalyzerFindings(gapFindings, boardTeam.farmCapIdentity)` (the Defense-inclusive farm tilt — "a defense-farm's SS gap screams loudest") → `sortByTiltedPriority` → top-5 priorityGaps + budgetWarning. Reuses the RB-9c-3a board props. Build in `kbl-mode1-b`.
