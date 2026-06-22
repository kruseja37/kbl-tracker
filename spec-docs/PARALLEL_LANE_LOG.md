# PARALLEL LANE LOG — AUTH-4 Mode-1 independent build lane (`codex/mode1-v1-b`)

This is the SOLE ledger for the **parallel Mode-1 lane** (worktree
`/Users/johnkruse/Projects/kbl-mode1-b`, branch `codex/mode1-v1-b`, forked off
`codex/mode1-v1` @ `956fd15d`). Kept SEPARATE from `AUTONOMOUS_RUN_LOG.md` to fully
decouple from the attended thread's docs commits (the docs-branch-race avoidance per the
parallel-lane handoff). The attended thread (JK live) owns the chemistry/trait/prospect/
draft cluster on `codex/mode1-v1`; this lane runs INDEPENDENT cleanup/persistence/rework
tickets that never touch the OWNED files.

**Lane queue (handoff `HANDOFF_DONE_20260622T184759Z_parallel-rb`):** RB-17 (deprecate
`playerMorale.ts`) → RB-15 (persist farm DTOs/storylines) → RB-10 (CPU shill split +
dissolve). Skip any ticket whose grounding shows it must touch an OWNED file.

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
