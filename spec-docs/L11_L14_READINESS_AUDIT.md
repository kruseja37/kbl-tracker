# L11–L14 SPEC-READINESS AUDIT (FINDING-150-prevention pass)

**Created:** 2026-06-18 (attended). **Method:** workflow `wf_c6ee164f-44c` — 4 readers, one per L-ticket, auditing
`FRANCHISE_V1_LIVING_SEASON_SPEC.md` + the scattered subsystem specs + the code, against the FINDING-150 standard
(*is each soul-layer measurement pinned enough to build without inference, internally consistent, and
non-contradictory with the other specs + the code* — NOT just "is there a LOCKED design paragraph").

## HEADLINE

**All four L11–L14 = `GAPS-NEED-JK-RULINGS`. None is build-ready-to-spec.** The §12/§20–24 sections are
marked "LOCKED," but that's design intent, not buildable measurement — the same trap the trait spec was in before
FINDING-150 (looked ratified, hid scattered/qualitative/contradictory measurements). ~34 distinct gaps + multiple
spec-vs-spec and spec-vs-code contradictions across the four. **Each L-ticket needs a §0-style ratification pass
(consolidate measurements into one authoritative cited source + rule the gaps) BEFORE it builds** — exactly the
traits playbook. (Build is downstream of L9b regardless; this is prep, off the critical path.)

## CROSS-CUTTING FINDINGS (apply to more than one ticket)

1. **STALE DSTACK / spec-vs-tree drift (FINDING-150-class, repo-wide):** the DSTACK + several "LOCKED" sections
   treat now-built engines as greenfield. **Fame (L6)** (`fameModel.ts` + `franchiseFameCompute.ts`, built 2026-06-17,
   dark) and **Awards (D9)** (`franchiseAwardsEngine.ts`, 696 lines, live) **exist** — an L-builder reading only the
   DSTACK would rebuild them. The DSTACK ticket text must be reconciled to the tree before any L11–L14 build.
2. **Fame double-ladder tech-debt (§20.8 NOT executed):** two fame ladders coexist — `fameModel.ts` (§20.7 nine-tier)
   and the legacy `fameEngine.ts:349 getFameTier` (pure-cumulative, with the spec-FORBIDDEN "Fan Favorite"/"Villain"
   labels), still imported by `fameIntegration.ts` + `useFameTracking.ts`. The "collapse to one ladder" reconciliation
   is incomplete — a live contradiction L12 depends on.
3. **"LOCKED in §X but pending in the cross-ref" trap:** §24 declares relationships "LOCKED," but the
   `FRANCHISE_MODE2_MORALE_RELATIONSHIP_APPROVAL_MATRIX` marks them "awaiting user approval" and the
   `DECISION_WORKSHEET` Decision Log is empty. The §-ruling was never reconciled back into the cross-ref specs — the
   exact mechanism that lost the trait rulings.
4. **Fame half-wired:** of §20's four layers, only the WPA spine + iconic bumps reach the live (dark) fame record;
   WAR floor, the status layer, trade reset, displayed-tier resolution, designation→fame, championship fame are all
   defined-but-orphaned (zero non-test callers). The fame the Race system (L12) depends on is today WPA+iconic only.

---

## L11 — MANAGERS / firings — `GAPS-NEED-JK-RULINGS`
**Buildable:** the manager Almanac legacy (`managerIdentityStorage` has `fired`/`endDate`, data-ready but
action-greenfield — no `setManagerFired` mutator). MoY is internally consistent but **out of L11 scope** (DSTACK §D →
Phase-1 D9; already built/live).
**Contradictions:**
- **Firing TRIGGER:** §12/LS-18 GM-discretionary "valve" vs the salary spec's auto-probability roll
  (`SALARY_SYSTEM_SPEC_UPDATED.md:805-824`, happiness-band fire-chance + 25%-games gate). Unreconciled; §12 pins no
  threshold/cadence.
- **Fan-relief bump:** THREE conflicting magnitudes — §12 "a relief bump" (prose) / `FAN_MORALE:409` "±0" / salary
  spec "+15" / live matrix `+4` (`masterMoraleMatrix.ts:375`). None ratified.
- **Performance gate (spec-vs-code):** §12 "net-positive performer is untouchable" vs the live flat
  `managerFiredSelf = -2` applied to ALL players regardless of True-Value sign.
**Gaps needing JK:** (1) firing trigger model (button vs auto-roll vs both) + threshold; (2) one canonical fan-bump
value (flat vs context-scaled) + reconcile the 3 specs; (3) the performance-gate FORMULA (hard gate at TV=0 vs scaled
by TV magnitude; which TV artifact); (4) personality/loyalty mapping into the *firing self-hit* (loyalty currently
only touches the fan-link); (5) clubhouse ripple sign-variable vs flat drop; (6) confirm MoY OUT of L11.

## L12 — RACE SYSTEM + ALL-STAR + AWARDS (+ Fame) — `GAPS-NEED-JK-RULINGS` (largest)
**Buildable/built:** award merit base (MVP=totalWAR, CY=pWAR, SS=batWAR, RoY) is BUILT + live (D9, trusted-value
gated); MoY built (D9); fame Heat/iconic/reach-floor primitives built (dark); TV-snapshot foundation + badge
substrate built.
**Contradictions:** the stale-DSTACK + fame-double-ladder cross-cutting items (#1, #2); the LSD-1 "fame-ready seam"
only reserved 3 TV award slots — All-Star / bench / negative / Reliever / Platinum / WS-MVP have NO
`FranchiseAwardCategory` slot, so L12 needs a category+store extension the "no-rebuild" seam didn't cover.
**Gaps needing JK (the big set):** (1) **Race standing formula** (WAR+fame combine, band boundaries) — GREENFIELD,
direction-only; (2) **close-race fame tilt** — "close" margin window + tilt magnitude + "genuinely-great" floor, all
undefined; (3) **Gold Glove defensive-fame share** — pick the exact % in "~15-25%" + the blend; (4) **All-Star roster
construction** — roster size, per-position starter slots, reserve count, "performance floor," fan-vote-from-fame map
(can't build a roster today); (5) **Visibility-vs-Emission** — which races emit (the curated subset) + depths;
(6) **status-layer fame magnitudes** — draft seed / call-up / send-down / bench 0.5× / league-leader; (7) WAR-floor
gravity strength + Heat decay (the fickle-vs-sticky numbers); (8) race resolution payouts (fame boost / winner+snub
morale); (9) **TV-family scoring formulas** (KK best-value-level, Bust, Comeback trough-to-recovery) — data ready,
math unpinned; (10) ratify the award-category surface extension; (11) fame→fan-morale channel coefficients (§20.6).

## L13 — RELATIONSHIPS-LITE + reporter accuracy — `GAPS-NEED-JK-RULINGS`
**Buildable:** the six-edge taxonomy (the type set) + the Potential-vs-Active *structure* (binary co-roster) + the
trade/send-down edge-terminator.
**Contradictions:**
- **TAXONOMY TRIPLE-CONFLICT:** §24 six AFFECT-edges (Rivalry/Feud/Mentorship/Friendship/Romance/History) vs the
  worksheet's seven ENTITY-edges vs the code's nine LITERAL types (`relationshipEngine.ts:12-22`). Three incompatible
  ontologies, none a superset.
- **"LOCKED-but-approval-pending"** (cross-cutting #3).
- **Reporter accuracy:** §24.5 "~10% flat" vs cert per-personality 0.65-0.95 vs REP-4 "meaning not yet ruled."
- **Charged matchup (spec-vs-code axis):** §24.7 amplifies the MORALE swing; code amplifies the LEVERAGE INDEX
  (`relationshipIntegration.ts`, wrong quantity + wrong taxonomy).
- **Morale magnitudes:** code's flat per-type constants (`relationshipEngine.ts:38-48`) aren't personality-scaled
  (contradicts §24) and live outside the L3 matrix where §5 says they belong.
**Gaps needing JK:** (1) ratify the six-edge taxonomy canonical + map/retire the code's 9-type set; (2) threshold-gate
product formula + per-type thresholds (the ~1-3 edges/team target); (3) per-type trigger values ("extended time,"
"young"); (4) edge intensity + decay model + hysteresis; (5) reporter-inaccuracy meaning + rate + seeding (REP-4);
(6) charged-matchup = morale (not LI) + factor; (7) per-edge personality-scaled morale deltas authored in the L3
matrix; (8) Captain-governor composite weights + suppression magnitude; (9) romance base-rates + gender weights;
(10) relationship→fan-morale coupling rule.

## L14 — REBRAND CIRCUIT-BREAKER — `GAPS-NEED-JK-RULINGS`
**Buildable substrate:** stadium pick (`pickStadiumFromPool`, shared, pure); manager-firing morale ripple; fan-morale
engine (bands, seasonLow).
**Contradictions:**
- **Badge reset list:** §14 "reset all badges except Captain" vs the live 4-type designation union
  (TEAM_MVP/ACE/FAN_FAVORITE/ALBATROSS) where **Captain isn't a badge** (it's a router) — the one entity exempted is
  the one not modeled as a resettable badge; fame reset on rebrand unaddressed (§20.3 says only a TRADE resets fame).
- **Stadium agency:** as-built `pickStadiumFromPool` is AUTO vs DSTACK L14 "USER picks."
- **Reset value:** "~70" presented as ratified (LS-20) yet flagged sim-tuned (§16) — final or placeholder?
**Gaps needing JK:** (1) trigger threshold (which band) + duration window (no dwell-counter exists); (2) badge-reset
enumeration once L7 defines Captain/Fan-Hopeful as badges + whether fame resets; (3) stadium agency (user-pick UI vs
auto); (4) the dead-money TARGET (the persisted ledger to "clear" doesn't exist — orphaned model only; needs the
economy ticket); (5) the atomic cascade ORDER (firing ripple before/after the morale-to-70 reset, else one
overwrites the other); (6) team re-identity source (user vs generated) + relocation-marker schema (`franchise.ts` has
no field); (7) confirm the exact reset integer.

---

## RECOMMENDATION

1. **Don't rule the ~34 gaps now.** They're downstream of L9b; ruling far from build re-creates the staleness failure
   (rulings rot before use). **Ratify each L-ticket right before its build** — a focused §0-style pass per subsystem
   (consolidate measurements + rule its gaps + reconcile the cross-ref specs + DSTACK), the proven traits playbook.
   This audit is the map of what each pass must close.
2. **Two hygiene items worth doing sooner** (doc-integrity, not rulings): (a) reconcile the **stale DSTACK** so no
   L-builder rebuilds the now-built fame/awards engines; (b) schedule the **fame double-ladder collapse (§20.8)** as a
   cleanup ticket (live tech-debt L12 depends on).
3. **Net answer to "is this spec work?":** YES — substantial. None of L11–L14 can build straight from the "LOCKED"
   sections; each needs a ratification pass first.
