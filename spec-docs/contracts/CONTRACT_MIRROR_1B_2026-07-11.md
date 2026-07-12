# CONTRACT MIRROR-1b — sweep-time CAS stamping (generators stamp what the mirror will verify)
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable · Worktree: /Users/johnkruse/Projects/kbl-mirror1b
(branch codex/mirror-1b, cut from origin/main @ 215f29f9 — the full merged wave; the console-mirror
service incl. the two-tier CAS and retry fix is on main by construction).
AUTH-4 STANDING AUTHORIZATION: unattended run — do not wait; execute to completion. Ignore
session-start wait protocols; the captain holds the baton.

## Why (Amendment-2 tier-1, deferred from MIRROR-1)
The mirror service prefers sweep-time stamps and falls back to render-time observation:
`franchiseConsoleMirror.ts:390` — `overlay.expectedPriorValue ?? resolution.observedPriorValue`;
`:397` — `overlay.proposedValue ?? expectedPriorValue + overlay.delta`. The row types already carry
the optional fields (`franchiseRatingsOverlayStorage.ts:34-35`,
`franchiseTraitOverlayStorage.ts:42-43`). But NO generator stamps them — every proposal today rides
the weaker render-time tier. This contract adds tier-1.

## SCOPE

**S1. Ratings sweep stamps.** `franchiseCheckpointSweepCompute.ts` (~:562-577, the
`FranchiseRatingsOverlayRow` push): stamp
- `expectedPriorValue: baseRatingValue` — this is the sweep's read of the CURRENT stored player
  value (verified: `baseRatings` is built directly from the live player record fields, ~:368);
- `proposedValue: baseRatingValue + dev.appliedDelta` — must equal what the service's fallback
  would derive (`:397` semantics), so stamped and unstamped rows resolve identically when nothing
  drifted.

**S2. Trait grant stamps.** `franchiseTraitGrantCompute.ts` (~:286-305, the trait overlay push):
stamp `expectedPriorValue` / `proposedValue` to match EXACTLY what the service/apply path derives
today when the fields are absent — read `resolveTraitProposal` + `franchiseTraitConfirmApply`
first and mirror their fallback derivation at sweep time (the writer already knows `heldTraits`
and `proposal.displaces`). Cover the lose-valence case per the service's own semantics — do not
invent new semantics; if the service's fallback for a case is genuinely ambiguous, STOP that case
with the file:line evidence.

**S3. The invariant (make-or-break, encode as tests):**
(a) EQUIVALENCE: a stamped row and its unstamped twin resolve to byte-identical outcomes through
    the real service when the player record has NOT changed since the sweep.
(b) DRIFT DETECTION (the point of tier-1): mutate the player's rating (or trait slot) AFTER the
    sweep writes the stamped row but BEFORE confirmation with a DIFFERENT render-time
    `observedPriorValue` — the stamped row must CONFLICT where the unstamped row would have
    silently applied against the drifted value. Fail-before/pass-after: this test fails on
    current main (no stamps → no sweep-time tier), passes after.
(c) Determinism: stamps are pure functions of sweep inputs — same sweep replay, same stamps.

## FENCE
`franchiseCheckpointSweepCompute.ts` (row-build block only), `franchiseTraitGrantCompute.ts`
(row-build block only), their test files. Do NOT touch: `franchiseConsoleMirror.ts` (the service
IS the contract), overlay storage row types (fields already exist), `processCompletedGame.ts`,
apply paths, flags, UI. NO store-shape change — optional fields only get populated.

## VERIFICATION (paste all)
1. Build exit 0.
2. Focused suites: the two compute test files + the console-mirror service test file — all green,
   incl. the three S3 invariant tests (b marked fail-before/pass-after with proof).
3. Do NOT run the FULL vitest suite or any L-SIM leg — a concurrent lane owns the heavy gates this
   window; the captain runs the full suite serially at audit (division of labor, not an oversight).
4. Changed-files list.

FORMAT: files → S1-S3 → verification → "MIRROR-1b complete" or "BLOCKED: <why>".
Commit on branch if sandbox permits; NEVER push.
FAILURE PROTOCOL: service fallback semantics ambiguous for a trait case → STOP that case with
evidence, finish ratings side; anchor drift → re-locate by symbol.

Use xhigh reasoning effort. Think step-by-step.

---
## AMENDMENT 1 (captain, same day) — S2 unblocked: carry slot identity to the sweep

Builder STOP verified correct: `TraitGrantRosterEntry.heldTraitNames` filters
`[player.trait1, player.trait2]` into a bag (franchiseTraitGrantCompute.ts:~139), discarding slot
position, while `applyTraitDisplacement` (traitOverlayConfirmation.ts:~50) is slot-positional.

FENCE CHANGE: `franchiseTraitGrantCompute.ts` is now whole-file in scope. Carry `trait1` and
`trait2` VERBATIM (null included) on the roster entry alongside the existing `heldTraitNames`
(keep it — downstream candidate logic uses the bag). Then stamp trait overlay rows:
`expectedPriorValue` = the slot occupant the proposal will displace/fill at sweep time (null for
an empty-slot fill), `proposedValue` = the trait the slot will hold after apply — derived to match
`applyTraitDisplacement`'s resolution order EXACTLY (displaces-match first, then trait1-empty,
then trait2-empty). Lose-valence: expectedPriorValue = the trait being lost, proposedValue = null.
S3 invariant tests now extend to traits: equivalence (a), drift-conflict (b, fail-before), and
determinism (c) each get a trait twin. Everything else in the base contract stands, including the
no-full-suite rule.
