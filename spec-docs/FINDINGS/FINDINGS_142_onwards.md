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
