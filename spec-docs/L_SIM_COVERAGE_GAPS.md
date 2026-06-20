# L-SIM — Soul-Invariant COVERAGE GAPS (living backlog)

**Created:** 2026-06-19 (H3 Step 1 validity review + Step 2 ruling). **Governing principle (JK):** *never add an invariant before
the data that can exercise it exists* (the reach-floor lesson — a check with no live event to test is vacuous). Each gap is tagged
by its **ENABLER** — the thing that must land first. **Do NOT build these ahead of their enabler.**

The 20 implemented soul invariants live in `test-utils/lsim/invariants/soul.ts`; the 8 flagged ones are corrected in H3 Step 2.
This file tracks the §5 properties that have **no** invariant yet. (§5.5 determinism IS covered — in the runner, not the 20.)

---

## [ENABLER: Step-4 real season-finalize] — deferred §5.3
The runner does not yet call a production season-finalize, so these never fire. Wire them when Step 4 invokes the **real** finalize.
- **§5.3 True Value FREEZES** — `frozen` flag sets; the anti-thaw guard holds; a post-freeze recompute is a no-op.
- **§5.3 Awards finalize OFF the FROZEN artifact** — award trust requires `artifact.frozen===true`; an untrusted high-WAR row cannot win.
- *(emission-snub is implemented in Step 2 but marked PENDING-STEP-4 — its live-green also needs real finalize.)*

## [ENABLER: post-Step-3 generator adversity] — needs real performance variation / decline / firings
The always-up generator leaves these paths dormant (no fame falls, no firings, no decline). They cannot be meaningfully asserted
until Step-3 injects downswings.
- **§5.1 `pitchingWpa` accumulates; a no-WPA game stays +0, never NaN** (needs varied/zero-WPA pitcher games).
- **§5.1 manager ripple severity** — net-positive players untouchable (0); else `|valueDelta|`-severity × personality tilt (needs a firing).
- **§5.1 Fan Favorite = best UNDERPAID overperformer** (needs over/under-performance spread).
- **§5.1 fan morale = directional DAMPENER only** — per-game magnitude inside the dampener band, never the sole driver (needs morale movement).
- **§5.1 morale deltas respect personality tilts** deterministically (egotist < timid, loyal bigger, resilient smaller).
- **§5.1 L10 high-fan-morale SUPPRESSES team/stadium events; personality-shift family EXCLUDED; trade_demand PROPOSED-only** (needs morale variation + event volume).
- **§5.1 close-race TILT window** — fame contributes only when `|marginToWinner| < tiltWindow` AND both merit > floor (needs close + runaway races).
- **§5.3 fame-heat down-fraction tightening** (the existing heat-fickle bar is minimal) — tighten once fame-FALLS occur.
- **§5.2 trait writes go through `saveFranchisePlayer` flat trait1/trait2, not `ratingsOverlayMerge`** (the FINDING-149 silent-drop class — needs the trait CONFIRM/apply path, post-D13).

## [ENABLER: the §6 matrix — edge leagues + multi-season]
- **§5.6 double-count guards** — Fan Favorite value-half vs morale-half; Albatross flashpoint tax vs steady sentiment (must be 0 in L7c); Captain charisma routing (×2) routes the morale channel only.
- **§5.4 migration against a REAL exported save** (read-only) — needs a real user export; the synthetic version-bump leg is in Step 2.
- **§5.6 True Value anchored to the fixed draft-IV baseline, never re-baselines across seasons** (needs ≥2 consecutive seasons).

---

## Corrected / strengthened in H3 Step 2 (for cross-reference — NOT gaps)
fame-war-floor (→ apex-degeneracy INVESTIGATE), l12-race (eligibility-pool + ranking==composite), flashpoint (compounding ramp +
non-Albatross=0), designation-slots (all 6 incl Captain + Fan Hopeful), l11-backstop (PENDING-STEP-3), persistence-migration
(real version-bump leg), reach-floor (real §5.3 honor ratchet), emission-snub (PENDING-STEP-4) + cheap tightenings (morale 0–99,
ratings-overlay scope + id, trait atomicity/re-eval).
