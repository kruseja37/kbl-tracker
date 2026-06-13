# FINDINGS — 142 onwards
# Created 2026-06-12 (FINDINGS_056_onwards.md exceeded the 500-line split
# threshold; new batch per SESSION_RULES Documentation Routing)

### FINDING-142
**Date:** 2026-06-12 | **Phase:** TV1 build (DISCOVERY 1) | **Status:** FIXED-AND-VERIFIED (TV1-AUDIT 2026-06-12: M-142 revert probe RED on exactly the new composition test; double-count ruled out at orchestrator write level)
**File:** src/utils/franchiseValueInputs.ts:237 (pre-fix)
**Evidence:** Codex DISCOVERY 1 trace — value-input WAR composition read
orchestrator-persisted rows but used batting totalWar ALONE when present,
silently dropping persisted pitching WAR (pwar). Fixed in TV1 by combining
persisted batting + pitching WAR.
**Impact:** Pre-TV1, every WAR preview total for pitchers (and two-way
players) understated WAR in the value-input chain → wrong percentiles →
wrong True Value for everyone sharing their peer pools. Blast radius of the
FIX is the TV1-AUDIT's primary scrutiny target (D1).

### FINDING-143
**Date:** 2026-06-12 | **Phase:** TV1-FIX (X3 discovery) | **Status:** CONFIRMED-OPEN (deferred to TV2 or D1 — JK to place)
**File:** src/utils/franchiseValueInputs.ts:502
**Evidence:** Codex X3 trace — valuePosition is derived from profile
player.primaryPosition, NOT from positions actually played this season.
**Impact:** Violates R-6 data-driven doctrine: True Value peer pools (and
therefore every True Value / Value Delta output, and TV2's Fan Favorite /
Albatross selections) are profile-label-driven. A player spending the
season at his secondary position is pooled with the wrong peers. Requires
a played-position detection source (season fielding/appearance data)
before in-season franchise decisions meet the doctrine.

### FINDING-144
**Date:** 2026-06-12 | **Phase:** TV1-FIX-AUDIT (MINOR #2) | **Status:** CONFIRMED-OPEN (queued: taxonomy spec-cleanup batch, with R-6/R-8 blocks)
**File:** src/engines/salaryCalculator.ts:693-694, :59-61, :249-254
**Evidence:** Fable audit — the salary-calculation path still maps
UTIL/BENCH → 'IF/OF' and TWO-WAY → 'OF', and the type/multiplier tables
retain DH/UTIL/BENCH/TWO-WAY entries. Out of TV1-FIX scope (correctly
untouched).
**Impact:** R-6 "no normalize-away" doctrine violated in the sibling
subsystem. Mitigations: position multipliers are RETIRED-to-1.0 tuning
knobs per IV §3.8, and DH is dead per standing ruling — residue is mostly
legacy surface, but it is exactly the label-laundering class R-6 bans and
must not survive the cleanup batch.

### FINDING-145
**Date:** 2026-06-12 | **Phase:** TV2-AUDIT (MINOR #1 + candidates) | **Status:** CONFIRMED-OPEN (cleanup class; EP1/slice-5 input)
**File:** src/utils/franchiseDesignationEligibility.ts; franchiseDesignations.ts:10, :323-348
**Evidence:** Fable audit — eligibility module retains pre-§17 'active'/
persistable semantics (no floors, no valueDelta) feeding read-only context
surfaces (readiness, morale-context adapter, narrative eligibility,
TeamHub display) that can now disagree with canonical projected rows.
Bypass risk REFUTED (zero write paths remain). Related residue:
'active' member in FranchiseDesignationStatus is read-compat-only with
zero writers; trade-compat shim carries existing embedded designation
metadata; embedded-field scrub already a logged candidate (TV2 addendum
point 3).
**Impact:** Consistency debt, not a defect — context surfaces may
contradict canonical badges until cleaned. One cleanup: re-point or
retire eligibility's status vocabulary + remove 'active' member + scrub
embedded fields. Home: EP1 or slice 5, JK to place at drafting.
