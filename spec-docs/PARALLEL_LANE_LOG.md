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
