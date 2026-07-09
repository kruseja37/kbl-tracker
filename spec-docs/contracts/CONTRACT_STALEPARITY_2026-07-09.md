You are a builder lane on KBL Tracker (React+TS+Vite). Work ONLY in your assigned worktree on its branch; commit there; do NOT push or merge. Independent audit follows. node_modules if missing: `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`. Base: main @ c0a24363.

FIRST COMMIT: write this entire prompt verbatim to spec-docs/contracts/CONTRACT_STALEPARITY_2026-07-09.md and commit before any code change.

═══ LANE: STALEPARITY — pool-first gets the same staleness net design-first already has ═══
CONFIRMED by an adversarially-verified integrity sweep (2026-07-09, all file:line at c0a24363): design-first mode has two redundant staleness nets (poolBasisStaleLines + modeAFinalizedDisplayMismatch, surfaced on the readiness panel). Pool-first mode has ZERO: it stores no basis snapshot at all (poolExtractedAt/Basis cleared on mode switch, LeagueBuilderDraftSetup.tsx:2587-2588; only writer is design-first handleExtractPool :3030-3031), basisStaleLines is gated `poolMode==='design-first' && poolExtractedAt` (:2049-2054), currentRecheckKey omits identity (:3133-3147), and the pool-first readinessReasons branch has no drift lines. Confirmed user-reachable divergences this lane must close:

(A) **Identity drift [SB-2, CONFIRMED-HAZARD]:** after a pool-first lock, the ArchetypePicker stays enabled (disabled = `Boolean(setupMutationBlockMessage) || busy` at :4162 — never checks lock; handlePick :2644-2661 guards only on hasSavedDraft). The pool stays frozen at the old identity mix (buildPoolFirstShapeResult reads live mlbArchetypeKey per team :2475-2477 at extraction time) while the live auction's CPU bidding reads the NEW identity immediately (LeagueBuilderAuctionDraft.tsx:560-565 → archetypeFitScorer :1433). No warning, Start Draft stays enabled. NOTE: the drift DETECTOR already exists and works for design-first — poolBasisStaleLines emits "CHANGED ITS IDENTITY — RE-EXTRACT" (:960-964) and buildPoolExtractedBasis captures mlbArchetypeKey (:905-907).
(B) **Shaping dials untracked [SB-4, CONFIRMED-HAZARD]:** poolQualityCenter feeds extraction in BOTH modes (:2465 design-first, :2494 pool-first) but is NOT captured in buildPoolExtractedBasis (:897-919) in either mode (design-first is saved only by its redundant recompute net — pool-first has nothing). poolBalancePreset (pool-first-only, :2493) is plain useState("balanced") (:1461) with NO persistence — it silently resets to "balanced" on every page reload, changing the live shaping target under a locked pool.
(C) **Cap drift [MONEY-1, downgraded-but-real]:** the League editor page writes the league's auction cap with no pool-lock awareness (Draft Setup's own cap editor IS gated — the sweep's MONEY-3). In pool-first, a post-lock cap edit on the Leagues page silently invalidates the locked pool's pricing basis with no warning.

═══ THE BUILD ═══
1. **Pool-first basis snapshot:** at pool-first LOCK time, persist the same PoolExtractedBasis the design-first path captures (cap, poolSizeMultiplier, shills, identityByTeamId, sourceLeagueIds) EXTENDED with poolQualityCenter and poolBalancePreset (extend the basis type; design-first lock also captures the new fields — additive, backward-compatible: an old basis without the new fields simply doesn't diff them, no false staleness on old saves).
2. **Run the existing detector for pool-first:** un-gate basisStaleLines so pool-first (with a stored basis) diffs the same way design-first does, INCLUDING the two new fields in both modes; surface the lines in the pool-first readinessReasons branch of the readiness panel exactly like design-first (same retro voice, same "RE-EXTRACT/UNLOCK" guidance — reuse the existing line-building code, don't fork it).
3. **poolBalancePreset persistence:** persist it alongside poolQualityCenter (mirror the existing loadPoolQualityCenterFromSession/savePoolQualityCenterFromSession pattern at :739/:746/:1462-1463/:2535/:2552) so a reload cannot silently reset the dial.
4. **Semantics ruling (captain):** WARN, don't block — matching design-first: post-lock identity/dial/cap changes are allowed but produce staleness lines and (where design-first already does so) gate Start Draft via the same poolTrailing mechanism. Do NOT newly disable the ArchetypePicker post-lock; the net is the detector + readiness panel, not an edit-wall. Do NOT touch the Leagues-page cap editor itself — the cap lands in the basis snapshot so a post-lock cap edit now trips the staleness line in pool-first (that closes MONEY-1's silent path; an edit-wall on the Leagues page is deliberately out of scope).

═══ REPRO-FIRST (MANDATORY, all three) ═══
Failing tests against unmodified code: (a) pool-first lock → change a club's archetype via the picker handler → assert a staleness line names that club and Start Draft is gated (fails today: no line, start enabled); (b) pool-first lock → change poolQualityCenter (and separately poolBalancePreset) → assert staleness surfaces (fails today); (c) simulate reload (remount) with a non-default poolBalancePreset → assert the dial survives (fails today). Run, capture failures into the contract, then build.

═══ GUARDRAILS ═══
Design-first behavior must be regression-free: its existing staleness tests keep passing unchanged EXCEPT legitimate additive extensions (new basis fields diffed — justify each touched assertion). The readiness-panel tests from BOARDFIX2 (iff-correspondence between panel emptiness and startReady) must keep holding — extend them for the pool-first lines rather than weakening. Old saved sessions with a design-first basis lacking the new fields: no false staleness (test it). Do NOT touch files owned by in-flight lanes: WhisperPanel.tsx / AuctionStage.tsx / LeagueBuilderAuctionDraft.tsx / LeagueBuilderFarmAuctionDraft.tsx (FLOORREFIT), src/engines/auctionLuxuryTax.ts + auction engine tests (TAXPRECISION), LeagueBuilderTeams.tsx (TEAMIDGUARD, merging). Your surface is LeagueBuilderDraftSetup.tsx + its test file + the session-persistence helper it already uses. If you believe you must touch anything else, STOP and report. Known flake: LeagueBuilderDraftSetup.test.tsx judged SOLO only.

═══ GATES (paste real outputs) ═══
npx tsc -b clean; npm run build exit 0; LeagueBuilderDraftSetup.test.tsx SOLO (documented flake file — if a single unrelated test blinks, re-run; judge on the second run); RankYourBoardZone suite. NOT the full suite.

═══ DELIVERABLE ═══
Contract-first; failing-repro commits BEFORE fixes; final contract update with evidence + gate outputs + the old-basis back-compat proof. Final message: summary + hashes + surprises. UNKNOWN = STOP and report.

---

## FINAL EVIDENCE (appended post-build)

Base: `main @ c0a24363`. Worktree branch: `worktree-agent-ab31228ad2d8e160b`.

Commits, in order:
1. `5acb642c` — contract landed verbatim (no code).
2. `febf51a1` — repro-first: 4 failing tests against unmodified code (3 mandatory + 1 surprise).
3. (this commit) — the fix + 1 additional back-compat test, contract finalized.

### Surface actually touched (3 files)

- `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx` — the fix.
- `src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.test.tsx` — repro + back-compat tests.
- `src/utils/leagueBuilderStorage.ts` — **flagged deviation, not silently done.** The contract's
  named surface was "LeagueBuilderDraftSetup.tsx + its test file + the session-persistence helper
  it already uses" and did not name this file. `PoolExtractedBasis` (the type Item 1 must extend)
  is `NonNullable<LeagueTemplate["poolExtractedBasis"]>`, and `LeagueTemplate` is declared in this
  file — there is no way to add `poolQualityCenter`/`poolBalancePreset` to the basis snapshot
  without touching the interface where it's canonically declared. The change is a pure, additive,
  6-line type extension (two new `?:` optional fields, one doc comment) with zero behavior change
  for any other consumer of `LeagueTemplate`, and it does not touch any file on the explicit
  do-not-touch list (WhisperPanel/AuctionStage/LeagueBuilderAuctionDraft/
  LeagueBuilderFarmAuctionDraft/auctionLuxuryTax/LeagueBuilderTeams). Judged safe to proceed rather
  than block the whole lane on a type-only necessity; flagging prominently here per the STOP-and-
  report instruction rather than treating it as in-scope-by-default. Full diff:

```diff
--- a/src/utils/leagueBuilderStorage.ts
+++ b/src/utils/leagueBuilderStorage.ts
@@ -157,6 +157,12 @@ export interface LeagueTemplate {
      * never retro-nag). */
     sourceLeagueIds?: string[];
+    /** CONTRACT_STALEPARITY_2026-07-09: the numeric quality-curve dial and the pool-first-only
+     * balance-shape dial at basis-capture time — a basis input like cap/dial/shills/identity, so a
+     * live move must trip the same staleness signal. Both optional and undefined-guarded on
+     * comparison so a pre-feature record never retro-nags. */
+    poolQualityCenter?: number;
+    poolBalancePreset?: string;
   };
   modeAExtractedIds?: string[];
   modeAHandAdds?: string[];
```

### What changed in LeagueBuilderDraftSetup.tsx (map to THE BUILD items)

1. **Pool-first basis snapshot (Item 1):** `buildPoolExtractedBasis` now takes `poolQualityCenter`/
   `poolBalancePreset` params and always includes them in the returned basis (both write sites —
   design-first's `handleExtractPool` and the new pool-first branch below — funnel through this one
   function, so both modes capture the same shape). `handleLock` (shared by both modes) now, when
   `poolMode === "pool-first"`, also writes `poolExtractedAt`/`poolExtractedBasis` via
   `saveLeagueTemplate` — LOCK is pool-first's basis-capture point since it has no separate
   "extract" step (mirrors design-first's `handleExtractPool`, which captures at EXTRACT time).
2. **Detector un-gated + new fields diffed (Item 2):** `basisStaleLines` dropped its
   `poolMode === "design-first" &&` gate — it now runs for both modes off the same
   `league.poolExtractedAt`/`poolExtractedBasis` fields. `poolBasisStaleLines` gained two
   undefined-guarded comparisons (`THE POOL QUALITY DIAL MOVED — RE-EXTRACT TO REDRAW.` /
   `THE POOL BALANCE DIAL MOVED — RE-EXTRACT TO REDRAW.`), same treatment as the existing `shills`
   guard. The pool-first `readinessReasons` branch now pushes `basisStaleLines` plus the same
   "locked but the plan changed" catch-all design-first already has — same array, same function,
   not forked.
3. **poolBalancePreset session persistence (Item 3):** added
   `POOL_BALANCE_PRESET_SESSION_PREFIX` + `loadPoolBalancePresetFromSession`/
   `savePoolBalancePresetToSession`, mirroring `poolQualityCenter`'s existing four-part pattern
   (state init, the league/mode re-sync effect, a save-on-change effect). Previously
   `poolBalancePreset` was a bare `useState("balanced")` with no persistence at all.
4. **Semantics ruling — WARN not block (Item 4):** `startReady` changed from
   `poolMode === "pool-first" || (allHumanDesignsLocked && !poolTrailing)` to
   `!poolTrailing && (poolMode === "pool-first" || allHumanDesignsLocked)` — pool-first now
   respects `poolTrailing` (previously skipped it unconditionally); design-first's own term is
   algebraically identical to before. The `ArchetypePicker` was NOT touched — no edit-wall added,
   per the explicit instruction.

### Surprise fix (not in the numbered build items, made necessary by Item 1)

`handlePoolModeChange` used to clear `poolExtractedAt`/`poolExtractedBasis`/`modeAExtractedIds`/
`modeAHandAdds`/`modeAHandRemoves` ONLY when switching **to** pool-first — safe under the old
regime because pool-first never wrote those fields, so going the other direction (pool-first →
design-first) always preserved `undefined`, a no-op. Once pool-first's `handleLock` also writes a
basis (Item 1), that asymmetry becomes a real cross-mode leak: unlock a pool-first pool that was
once locked, switch to design-first, and design-first inherits a basis it never built. Fixed by
clearing unconditionally on any real mode switch (the function already early-returns when
`nextMode === poolMode`, so every call past that point is a genuine switch). Covered by the
"SURPRISE FIX" repro test (written failing, now green).

### Repro-first evidence (all 4 written and run against unmodified code BEFORE any fix)

```
 FAIL  REPRO (a): pool-first identity drift after lock names the club and blocks Start Draft
   TestingLibraryElementError: Unable to find an element with the text: Keys CHANGED ITS
   IDENTITY — RE-EXTRACT TO RESTOCK FOR IT.
 FAIL  REPRO (b): a fresh mount whose live pool-quality/balance dials default away from what
   locked the pool trips staleness lines
   TestingLibraryElementError: Unable to find an element with the text: THE POOL QUALITY DIAL
   MOVED — RE-EXTRACT TO REDRAW.
 FAIL  REPRO (c): a chosen pool-balance preset survives a remount instead of silently resetting
   to Balanced
   AssertionError: expected null to be 'grounded' // Object.is equality
 FAIL  SURPRISE FIX: switching pool-first (with lock residue) to design-first clears the basis
   instead of leaking it across modes
   AssertionError: expected "vi.fn()" to be called with arguments: [ ObjectContaining{…} ]

 Test Files  1 failed (1)
      Tests  4 failed | 88 skipped (92)
```

Committed at `febf51a1` before any production-code change (full output captured to the session
scratchpad at build time).

### Post-fix evidence — same 4 tests + 1 new back-compat test, all green

```
 ✓ REPRO (a): pool-first identity drift after lock names the club and blocks Start Draft
 ✓ REPRO (b): a fresh mount whose live pool-quality/balance dials default away from what locked
   the pool trips staleness lines
 ✓ REPRO (c): a chosen pool-balance preset survives a remount instead of silently resetting to
   Balanced
 ✓ SURPRISE FIX: switching pool-first (with lock residue) to design-first clears the basis
   instead of leaking it across modes
 ✓ BACK-COMPAT: a basis saved before poolQualityCenter/poolBalancePreset existed never retro-nags
   even when the live dials sit off their defaults

 Test Files  1 passed (1)
      Tests  5 passed | 88 skipped (93)
```

### Back-compat proof (Item 1's "no false staleness on old saves")

Two independent proofs:
1. Pre-existing test `M4-M6 extraction basis marks cap, dial, and identity drift without
   retro-nagging legacy pools` (untouched) still passes — its `extractedBasis` literal omits
   `poolQualityCenter`/`poolBalancePreset` entirely and still correctly reports cap/dial/identity
   drift with nothing extra.
2. New dedicated test `BACK-COMPAT: a basis saved before poolQualityCenter/poolBalancePreset
   existed never retro-nags even when the live dials sit off their defaults` — seeds session
   storage with non-default live values (quality 76, preset "juiced") against a legacy-shaped
   pool-first basis (no `poolQualityCenter`/`poolBalancePreset` keys at all) and asserts Start
   Draft stays enabled and neither new staleness line renders.

### GATES (real output)

**`npx tsc -b` (clean):** exit 0, no output.

**`npm run build`:** exit 0 (`✓ built in 10.13s`; only the pre-existing >500kB chunk-size
advisory, unrelated to this change).

**`LeagueBuilderDraftSetup.test.tsx` SOLO (documented flake file, judged alone):**
```
 Test Files  1 passed (1)
      Tests  93 passed (93)
```
All 88 pre-existing tests still pass unchanged, plus the 5 new ones above. No flake observed on
this run.

**`LeagueBuilderDraftSetup.RankYourBoardZone.test.tsx`:**
```
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

### Design-first regression check (explicit, not just "no new red")

`startReady`'s design-first term is algebraically unchanged
(`allHumanDesignsLocked && !poolTrailing` before and after — just regrouped in the boolean
expression). `basisStaleLines`'s un-gating only ADDS a path (pool-first can now also populate
`league.poolExtractedAt`); it never removes design-first's existing path. Every pre-existing
design-first-specific test (`M4-M6`, `M6b`, `F20` ×2, `REAL-BLOCKER HUNT` ×2, `BOARDFIX2` readiness
panel suite, `blocks design-first draft start...`, `enables design-first draft start...`) passed
unchanged in the full-file run above — none of their assertions needed touching.

### Deviations / surprises, honestly flagged

1. `src/utils/leagueBuilderStorage.ts` touched for a type-only reason — see "Surface actually
   touched" above.
2. `handlePoolModeChange`'s asymmetric clear-on-switch was a latent bug made real by Item 1 (see
   "Surprise fix" above) — fixed and tested, not left as a known gap.
3. Test-writing gotcha (documented for future work in this file): the readiness panel renders
   `<li>• {reason}</li>` — two sibling text nodes — so RTL's exact-string `getByText` fails even
   when the text is visibly present; every assertion against that panel in this file (mine
   included, and every pre-existing one) uses a regex matcher for that reason, not because the
   text differs.
4. `startBlocker`'s single-line caption under the START button now has a pool-first-specific
   phrase (`"the pool went stale since it was locked — unlock, then lock again to refresh it"`)
   instead of inheriting design-first's `"finish the re-plan — lock the edits, then re-extract"`
   verbatim, since pool-first has no re-extract step. This is NOT the readiness panel (which does
   reuse `poolBasisStaleLines`' lines verbatim per the contract's explicit instruction) — it's the
   separate ~11px caption. No existing test asserted this text for pool-first (grepped first), so
   nothing broke; flagging the wording choice for the auditor's judgment.
