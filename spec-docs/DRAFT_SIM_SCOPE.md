# DRAFT-SIM — SCOPE NOTE (roadmap placeholder)

**Status:** SCOPED, NOT STARTED. Sibling track to the L-SIM season simulator.
**Independent of:** L13. **Slots before:** the §6 multi-season matrix legs (they depend on it).
**Author:** Opus 4.8 (Captain), 2026-06-19.

> A roadmap placeholder, not a spec. Names the track, why it's outside the current season-sim
> scope, the two seams that make it matter, the traditional-vs-auction split, the invariant seed,
> and the deferred next step. The actual engine discovery + build come later.

---

## Why it exists / why it's NOT in H2/H3

- The L-SIM harness is built around `processCompletedGame` — it tests the per-GAME **season loop**.
  The draft is a **setup/offseason event**, outside that loop (same category as season-finalize and
  the capture UI — both also outside the season-loop harness).
- Sharper: the synthetic generator **fabricates rosters via `generateRoster`** — it synthesizes the
  *post-draft state* rather than producing it through a draft. So the real roster-creation / draft
  path has had **zero coverage** from the entire season-sim effort. By design (to isolate the season
  loop), but worth seeing plainly: the sim has never once run a draft.

## The two seams that make it matter (not just "a separate thing")

1. **The draft sets the foundation the season-sim takes as GIVEN.** True Value is anchored to the
   fixed **draft-IV baseline** (never re-baselined; §5.6 asserts non-drift). That baseline is
   *stamped at the draft*. The season-sim validates the season is coherent **given** a starting
   valuation — it does **not** guard that the draft *produced a correct one*. A wrong draft baseline
   → every downstream True Value and salary is wrong, and the sim would certify coherent-but-wrong
   numbers because it treats the baseline as input. **The sim does not protect what's upstream of it.**

2. **The multi-season matrix legs CANNOT run without it.** §6 multi-season continuity (fame Reach
   across seasons, True-Value baseline non-drift across seasons) requires traversing the offseason
   *between* seasons — and the rookie draft is part of that offseason. So a draft path is a
   **prerequisite for the multi-season matrix legs to execute at all.**

## Traditional vs auction — different bug surfaces, different depth

- **Snake (traditional):** mostly pick-order + best-available + roster-constraint enforcement.
  Smaller surface.
- **Auction:** budget tracking, bidding/nomination, no-overspend, roster-slot satisfaction *under a
  budget constraint*. **Much larger bug surface — the "at-bat logic" of the draft.** Warrants
  exhaustive treatment, not a smoke test.

## What a draft-sim would assert (invariant seed)

Run many drafts in **both** formats, across league sizes + budget edge cases, asserting:

- A **valid roster** is produced (correct size, position requirements met).
- Every **roster constraint** satisfied (slots, limits).
- **Auction:** budget **conserved**, **no overspend**, every team's roster filled within budget.
- **Valuations sane** (no NaN / no negative-where-impossible).
- **The bridge invariant (protects Seam 1):** the draft-IV baseline it stamps is **correct AND
  fixed** — the handshake the season-sim's §5.6 non-drift check depends on.
- **Determinism:** same seed → identical draft (same FNV-1a discipline as the season-sim).

## Coverage boundary (sim-able vs human)

Like the season-sim: the draft **engine** (pick logic, budget math, constraint enforcement, baseline
stamping) is sim-able. The interactive draft **board / bidding UI** is human-test territory (same as
the capture UI). Engine discovery reports the honest split.

## Roadmap placement

- **Independent of L13.**
- **Before the §6 multi-season matrix legs** (they depend on it).
- Can run **in parallel** with the rest of H3 — it's a separate harness; it doesn't touch the
  season-loop invariants.

## Next concrete step (DEFERRED — not now)

A **`draft-engine-discovery`** pass (sibling to `franchise-engine-discovery`): map where snake +
auction live, the post-draft state contract, the **baseline-stamping path**, and whether *any*
coverage exists today. That discovery is what a draft-sim builds on, and it reports the real
engine-vs-UI split. Run it when the season-sim arc (H3 → comprehensive) reaches a natural pause, or
sooner if the multi-season legs get prioritized.

---

**Cross-ref:** `L_SIM_COVERAGE_GAPS.md` [matrix] enabler — the multi-season legs listed there depend
on this draft path. Worth a one-line pointer there when that file is next touched.
