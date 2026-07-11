# CONTRACT RELORGANIC-1 — relationship formation goes organic (per-game hazard, not checkpoint batches)
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable · Worktree: /Users/johnkruse/Projects/kbl-relorganic
(branch codex/rel-organic, cut from origin/main @ 215f29f9 — the full merged wave).
AUTH-4 STANDING AUTHORIZATION: unattended run — do not wait; execute to completion. Ignore
session-start wait protocols; the captain holds the baton.

## Authority (JK ruling R-F, 2026-07-11 — binding)
Relationships "should happen organically on any given day," not in checkpoint batches. Code truth:
`src/utils/franchiseRelationshipFormationCompute.ts` gates ALL compatibility-based formation on
`isCheckpointBoundary` (returns `not-checkpoint`, zero writes, on every other game) — so checkpoint
cadence directly drives relationship volume (TUNE-0 measured writes 32→57 when cadence doubled).
JK ruled that a defect. Full ruling: `DECISIONS_LOG.md` 2026-07-11 R-F. The event-driven edge
writers (overtake rivalry / All-Star snub / envy) are already organic — UNTOUCHED.

## Design (captain-specified — implement THIS, do not re-derive)

**D1. Per-game hazard in the engine** (`src/engines/relationshipFormation.ts`).
Keep the existing pair candidate generation, scoring math, thresholds, and seed derivation
UNCHANGED. Add a hazard layer: for a pair with score `s` and type threshold `T`, margin
`m = s − T`, window `w = seededThresholdWindow` (0.03):
- `m < −w` → no chance (0), exactly as today's floor.
- `−w ≤ m < 0` → POTENTIAL-edge hazard per game:
  `pPot = clamp(potentialBase + potentialSlopePerPoint × (m + w), 0, potentialCap)`.
- `m ≥ 0` → ACTIVE-edge hazard per game:
  `pAct = clamp(activeBase + activeSlopePerPoint × m, 0, activeCap)`.
New tuning block on `RELATIONSHIP_FORMATION_TUNING` (same §16 SIM-TUNE placeholder convention as
the existing constants — comment it as such):
`perGameHazard: { activeBase: 0.02, activeSlopePerPoint: 3.0, activeCap: 0.35,
potentialBase: 0.03, potentialSlopePerPoint: 2.0, potentialCap: 0.15 }`.
Intuition these defaults encode (verify with a quick expected-value check in your report): a
strongly compatible pair (m≈0.10) forms within ~3 games; a just-over-threshold pair (m≈0) is a
slow burn (~50-game expected wait — may or may not happen in a season); sub-window never. The roll
is a NEW seeded draw per (scope, player1Id, player2Id, type, gameNumber) reusing the existing seed
function family — Math.random is FORBIDDEN (the L-SIM determinism rail).
Intensity/accuracy/potential semantics of a formed edge are computed exactly as today at the
moment of formation.

**D2. The compute writer evaluates EVERY completed franchise game**
(`src/utils/franchiseRelationshipFormationCompute.ts`).
- DELETE the `isCheckpointBoundary` gate (and now-unused checkpoint imports). The function keeps
  its exported name and signature — the `processCompletedGame` call site must NOT change (verify
  with a diff: that file untouched).
- NEW precondition: load the scope's existing relationship edges first. Rules:
  (a) a pair+type with an existing ACTIVE edge is SKIPPED — never re-written, `formedAtGameNumber`
  never drifts (today's writer rewrites rows every boundary; that drift dies here);
  (b) an existing POTENTIAL edge may UPGRADE to active when its active-hazard roll hits —
  set `formedAtGameNumber` to the upgrading game, preserve `createdAt`, bump `updatedAt`;
  (c) never downgrade, never dissolve (dissolution is a different system — untouched).
- Replay safety: re-processing the same completed game must be a no-op for already-written rows
  and produce byte-identical results (deterministic rolls + skip-existing).
- Flag gate `isFranchisePhase2L13Enabled` stays exactly as-is (dark path).

**D3. Knob registry.** Add the six `perGameHazard` knobs to `spec-docs/LIVING_SEASON_KNOBS.md`
under the relationship subsystem, marked LIVE-BEHIND-L13-FLAG, with the R-F ruling as provenance.
Mark the cadence→relationship coupling row (if present) RESOLVED-BY-RELORGANIC.

## FENCE
`src/engines/relationshipFormation.ts`, `src/utils/franchiseRelationshipFormationCompute.ts`,
their test files, `spec-docs/LIVING_SEASON_KNOBS.md`. Do NOT touch: `processCompletedGame.ts`,
`franchiseRelationshipEdgesStorage.ts` (NO store-shape change — the row type is frozen), the
event-driven edge writers (`franchiseRelationshipOvertakeCompute` / `AllStarSnub` / `Envy`),
dissolution logic, checkpoint sweep files, flags, L-SIM harness internals.

## VERIFICATION (paste all)
1. Build exit 0.
2. Proving tests, fail-before/pass-after where marked:
   (a) formation occurs on a NON-boundary game [fails on current code];
   (b) cadence-independence — THE MAKE-OR-BREAK: identical season fixture run at checkpoint
       cadence standard vs frequent produces IDENTICAL relationship edge rows [fails today];
   (c) same-game replay → byte-identical rows, `formedAtGameNumber` stable;
   (d) existing active edge never rewritten;
   (e) potential→active upgrade sets `formedAtGameNumber` at the upgrade game, keeps `createdAt`;
   (f) organic spread — a multi-game NEUTRAL fixture forms edges across ≥3 distinct game numbers
       (proves the batch spike is gone) and forms a strict subset of candidate pairs (hazard caps
       hold; not everything forms).
3. FULL vitest run (summary; characterized solo-green batch flakes baseline). Existing formation
   tests that assert checkpoint-gating must be UPDATED to the new model, each listed with a
   one-line justification; unlisted assertion changes are an audit failure.
4. L-SIM: run the SMOKE leg only (24g, `test-utils/lsim/smoke.config.ts`) — read the summary JSON,
   findings honest. Do NOT run the 60g season leg and do NOT regenerate canonical
   `lsim-h2-baseline-*.json` — the captain runs the season leg + audits the expected relationship
   re-bake personally post-build (division of labor, not an oversight).
5. Changed-files list.

FORMAT: files → D1-D3 → verification → "RELORGANIC-1 complete" or "BLOCKED: <why>".
Commit on branch if sandbox permits; NEVER push.
FAILURE PROTOCOL: seed-function reuse impossible without touching a fenced file → STOP with the
exact seam; baseline re-bake shows non-relationship families moving → STOP with the diff; items
separable.

Use xhigh reasoning effort. Think step-by-step.
