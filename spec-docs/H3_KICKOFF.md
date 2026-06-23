# H3 KICKOFF — SIM HARDENING (post-H2-verified)

**Status:** READY TO ENACT. **Intended home:** drop into a Claude Code session; optionally save as `spec-docs/H3_KICKOFF.md`.
**Predecessor:** H2 (Phase-1 partial sim) — auditor-verified. **Builder/auditor:** triangle preserved (builder≠auditor on reasoning-dense work).

> **Where we are.** H2 is auditor-verified: `npm run build` exit 0, falsification **22/22**, determinism byte-identical, an
> independent 24-game reproduction green. Both flagged investigations are resolved by read-only disambiguation: **zero production
> bugs, zero spec corrections.** Every red traced to the *harness* or the *generator* being out of step with a design that's
> actually sound. H3 hardens the sim itself so the comprehensive run — and L13 — can be trusted. This is sim-hardening, not product
> repair.

---

## STEP 0 — Bank H2 first (commit the verified baseline BEFORE changing anything)

Commit the verified harness + report as a known-good checkpoint, so every H3 change diffs against it and you can roll back to a sim
that's *known to run*. Separate commits per logical unit:

1. **Discovery map** (if not already committed): `docs: refresh FRANCHISE_API_MAP (full L-stack pipeline + Type B classification)`.
2. **L13 planning docs** (if not already committed — scope map, `PROMPT_CONTRACTS.md` L13-1..8, the §24.10 spec correction, the
   DECISIONS_LOG rulings): their own commit, e.g. `docs: L13 recon scope map + A/B/C rulings + contracts (build HELD)`.
3. **The H2 sim:** `test(lsim): Phase-1 partial season harness + soul invariants + audit (H2 verified)`. Includes the harness
   (`test-utils/lsim/...`), `franchise-proof-of-life.ts`, the report **with** the Opus audit + the disambiguation note, AND the
   auditor's two fixes (all-star `ceil`→`round`; the `seasonRunner.test.ts`→`.scenario.ts` suite-pollution rename).

**Before committing #3, run `vitest list`** and confirm the default suite contains only the intentionally-fast checks — the heavy
all-flags-ON 60-game scenario(s) must be on-demand (`.scenario.ts`), not auto-discovered. Re-introducing a 30-minute season into
`npm test` is the single regression most worth preventing here.

**Honest-history note:** the fame and l12-race invariants commit here **as-audited** — still throwing their documented INVESTIGATE
reds. H3's next commits relax them. That sequence is the correct record: the sim flagged → we investigated → we acted. Don't
pre-relax them into this commit; the flip is the truth.

---

## STEP 1 — The all-20 invariant VALIDITY REVIEW (do this first — highest value)

**Why first.** Three reds this run, three *different* invariant mis-encodings: empty-category assumed populated; fame assumed a
downward cap (inverse of the design); reach-floor too weak (vacuous). The §5 suite was written ahead of the engines and is
over-/under-tight in spots. Find them **all at once** before fixing piecemeal — three looks have found three, so expect more.

**The review (spec-grounded analysis).** For EACH of the 20 soul invariants: does it test the property it is **named** for, in the
right **direction**, per the spec section it cites? Falsification proved each trips on *some* bad input; this asks the deeper
question — does that bad input target the **named property**, or a vacuous proxy? (reach-floor is the proven example: it trips on
`reachFloor<0`, but its named property is the honor ratchet — whole-team bump, starters>reserves, `allStarSelections` increment.)

**Output:** a table — `invariant | named §5 property | what it actually asserts | verdict {CORRECT / TOO-STRICT / TOO-WEAK /
WRONG-DIRECTION} | spec citation | recommended correction`. This table **is** the H3 fix list (it supersedes/extends the three
known corrections below).

**ROUTE: Claude Code CLI | opus | high** — spec-grounding analysis is the Captain seat.

---

## STEP 2 — Apply the invariant corrections (the 3 known + whatever Step 1 adds)

Known going in (already ruled):

- **`fame-war-legitimacy-floor` → RELAX.** Disambiguation verdict (a): the spec's floor is *upward soft gravity* (§20.1), and
  High-fame/Low-WAR ("darling / overrated") is a **blessed archetype** (§20.2). The invariant's hard downward cap
  (`tier ≥ NATIONAL_ICON AND warPercentile < 0.25`) is the **inverse** of the design. Retire the hard cap. Recalibrate to
  **apex-degeneracy-only, demoted to INVESTIGATE-distribution** — flag only a *replacement/negative-WAR* player reaching the very
  top tier (the noise the prestige labels should resist); count darlings as a §9 signal, don't fail on them. *(Spec needs no
  change.)*
- **`l12-race` empty-category → ELIGIBILITY-POOL refinement.** Keep CRITICAL; change the failure *definition*: empty category +
  empty eligibility pool = **PASS** (valid sparsity); empty category + NON-empty pool = **FAIL** (corruption — eligible candidates
  were dropped). This subsumes the season-length concern (short seasons → fewer clear the IP/PA floors → pool legitimately empty).
  *(Fallback only if reaching the predicate is disproportionate: assert non-empty in the standard full-size config, accept
  emptiness in sub-threshold legs — coarser, prefer the pool check.)*
- **`reach-floor-ratchet` → STRENGTHEN.** Replace the vacuous `reachFloor<0` with the real §5.3 property: at the All-Star lock, the
  whole selected team gets a permanent reach-floor bump, **starters/wildcard > reserves**, and `allStarSelections` increments.

**Discipline for EVERY changed invariant (the fix for "falsification is necessary, not sufficient"):** re-run falsification on it,
**extended** — confirm it (a) still passes a neutral baseline, and (b) trips RED on a bad input that violates the property it is
**named** for, not a proxy.

**ROUTE:** invariant recalibration is spec-grounded → **Opus-proposed**; implementation **Codex 5.5 | high** with **Opus audit**, OR
Opus-implemented — but the **extended falsification re-run is the non-negotiable objective backstop** on every change.

---

## STEP 3 — Generator adversity (highest-leverage generator change)

**Problem.** The synthetic generator is *always-up* — hash-derived WPA, talent-decoupled (`syntheticGame.ts:222`), no decline.
Consequences observed: traits **1677/0** (drop path wired & reachable at `traitAcquisition.ts:290`, just never triggered), fame
**top-heavy** with a hollow middle and zero negative tiers, morale **inert** (player 42–58), **0** manager firings.

**Fix.** Inject realistic performance downswings / slumps / cold streaks so players actually decline. This single change unblocks
testing of multiple currently-dormant paths: trait **LOSS**, fame **FALL** (Heat fickleness downward), morale dropping toward the
`<25` firing threshold (**L11**), and flashpoint under real stress.

**Why it matters most going forward.** **L13's entire value channel is morale→development.** If the generator keeps morale flat,
the L13 relationship invariants will be as inert as morale is now. So generator-adversity is a **prerequisite for a meaningful
comprehensive (L13) run**, not optional polish.

**ROUTE: Claude Code CLI | Codex 5.5 | high** (generator is harness code). **Opus audit** confirms the new distributions actually
exercise the dormant paths — i.e., trait losses > 0, firings > 0, and fame falls now occur.

---

## STEP 4 — Season-finalize coverage

The `emission-snub` red and the deferred §5.3 checks (TV-freeze, awards-off-frozen-artifact, emission-snub) were untested because
H2 never called a production season-finalize path. Wire the runner to invoke the **real** finalize at season-end so the §5.3
invariants actually run.

**Guard against a hallucinated-green here:** confirm it calls the **genuine production finalize**, not a harness reimplementation —
testing a fake finalize would be exactly the false-confidence failure mode. This is invoking production code (a read path), not
modifying production behavior.

**ROUTE: Codex 5.5 | high**, **Opus audit** verifies it's the real finalize.

---

## STEP 5 — Re-run baseline + 24-game repro; confirm green-for-the-right-reasons

After Steps 2–4, re-run the baseline (60-game) AND the 24-game independent reproduction. Expect: corrected invariants green because
the **design is satisfied** (not because they're vacuous); trait losses > 0 / firings > 0 / fame-falls present (proving the
generator now exercises the dormant paths); §5.3 finalize checks now executing. This is the "harness is now trustworthy" gate
**before** the expensive matrix.

---

## STEP 6 — The full §6 matrix (its own phase; AFTER 1–5)

Edge leagues (tiny-4-team for sparse `getPercentile`, reliever-heavy, injury-heavy, blowout/extreme-WPA, parity) + multi-season
continuity (fame Reach across seasons, True-Value fixed-baseline non-drift, trait accumulation, migration across season
boundaries).

**Why after the fixes:** the all-star bug proved a single game-length hides invariant/pipeline mismatches — the matrix is the real
confidence layer. But running a multi-hour matrix with *wrong* invariants just manufactures phantom reds at scale. Fix the harness
first, THEN spend the runtime. It's hours (the 60-game leg alone is ~30 min); scope and parallelize.

---

## PARKED — NOT H3 (a product decision for JK)

The spec's soft upward fame gravity (`applyWarLegitimacyGravity`, §20.1, strength 0.2) is written but **ORPHANED** — never wired
into `processCompletedGame`. So even the real, intended floor isn't executing. **Decision for you, separate and low-priority:**
*wire it* (lets a quietly-great low-WPA player's fame drift up toward his value over a season — a BEHAVIOR change, your call) or
*leave it dormant for v1*. Not blocking anything; flagged only so the choice is deliberate, not accidental.

---

## PARALLEL TRACK — NOT blocked by H3

**L13** is authored and ready (scope map + L13-1..8 contracts, build HELD). It proceeds independently whenever you have a
sole-mutator window. **Convergence note:** because H3 Step 3 (generator adversity) is what makes morale move, it should land
**before the comprehensive L13 run** so L13's morale→development invariants are actually exercised. Build order (L13 vs H3) is
flexible; the comprehensive run needs both.

---

## DISCIPLINE (applies throughout)

- Runs under the **§0 autonomy standard**: ground/build/run autonomously; batch genuine questions into one block; HALT-surface only
  on production behavior, persistence shape, §16 magnitudes, SMB4-assets, or gospel/spec. **H3 is almost entirely harness/generator
  work (autonomous-safe).** The one thing that would cross the line is wiring the orphaned gravity (parked above) — don't, without JK.
- **Every changed invariant re-falsified against its NAMED property** (Step 2's discipline) — the core H3 quality gate.
- **Sole-mutator window** for the code-editing steps (they write `test-utils/` and run the suite); **separate commits** per logical
  change; **builder≠auditor** on anything reasoning-dense.
- **§16 distributions: report only, never tune.**
- Label **model + reasoning effort** at every step.

---

## ONE-LINE SEQUENCE

Commit H2 → validity-review all 20 (Opus) → apply invariant corrections + re-falsify each → generator adversity → finalize coverage
→ re-run baseline+repro green-for-the-right-reasons → (own phase) full matrix. L13 in parallel; wire-the-gravity parked for JK.
