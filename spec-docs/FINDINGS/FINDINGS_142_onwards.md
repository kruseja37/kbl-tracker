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


### FINDING-146
**Date:** 2026-06-12 | **Phase:** EP1-AUDIT (MAJOR — BLOCK) | **Status:** OPEN-BLOCKING (closes when EP1-GOLDEN delivers the table + D8 re-audit passes)
**File:** EP1 changeset (uncommitted, post-f8d5f82) — deliverable gap, not a code site
**Evidence:** Opus 4.8 Max audit (substituted for Fable, JK-ratified) —
the contract-required TV-level GOLDEN REGRESSION attribution table is
ABSENT. Exhaustive search (repo grep, untracked files, /tmp, test
fixtures) found no pre/post True Value diff over the fixture league.
Builder execution record conceded it was never produced. Contract
mandates it in three places (CONSTRAINTS "Unattributed delta =
BLOCKED"; VERIFICATION "artifact attached"; FORMAT "attribution
table"). Auditor hand-spot-checked 3 rows against the engine
(effective≠profile, Reserve, two-way) — all attribute to SANCTIONED
causes, but on synthetic fixtures, NOT the real fixture league.
**Impact:** EP1 engine logic is code-verified and mutation-proven (D1-
D7, D9-D10 all PASS; 4 mutations killed RED→restore→GREEN), but
"zero unattributed True Value delta across the fixture league" is
UNPROVEN. FINDING-143 is implemented + code-verified but NOT delta-
certified until this table exists. Whole-league regression catches
deltas hand-tracing misses by construction. Remedy: EP1-GOLDEN
contract (Codex produces the pre/post fixture-league TV diff, every
changed row attributed) → D8-only re-audit → closure. Build code stays
uncommitted throughout.

### FINDING-147
**Date:** 2026-06-12 | **Phase:** EP1-AUDIT (MINOR #1) | **Status:** CONFIRMED-OPEN (coupled to FINDING-145 — same module/cleanup; F-144/spec-cleanup batch home)
**File:** src/utils/franchiseDesignations.ts:13 (const), :223 (write site)
**Evidence:** Opus audit — FRANCHISE_DESIGNATION_EP1_LIMITATION =
'peer pools are profile-position until EP1 (R-8)' is written into the
peerPoolLimitation field of EVERY persisted designation record at :223.
Post-EP1 the string is FALSE — pools are now effective-position. File
is correctly OUTSIDE EP1's only-edit list (no scope breach); this is
consistency debt EP1's F-143 closure surfaces. Live persisted data, not
just a test string (a TeamHub test also references it).
**Impact:** Persisted designation rows claim profile-position pooling
that no longer holds. Couples to FINDING-145 (same module, same status/
vocabulary cleanup class). Remedy: update or remove the constant + its
:223 write in the F-144/spec-cleanup batch alongside R-6/R-8/§17.8
blocks and the F-145 work.

### EP1-AUDIT — non-finding dispositions (logged for completeness)
- **MINOR #2 (sibling test mocks):** processCompletedGame.warMetadata
  .test.ts + .warPersistence.test.ts mock '../eventLog' without
  getGameHeadersForScope → EP1's new TV-path call throws there, swallowed
  by the TV-gate warn (3 console errors in-suite, suite stays green, no
  coverage lost — those tests assert WAR persistence only). Latent
  fragility: their TV/designation leg silently no-ops. NOT a new finding;
  remedy = add the export to those two mocks, folded into the EP1 closure
  changeset (test-only, inside the spirit of the EP1 surface).
- **MINOR #3 (builder reporting gap — FOURTH instance):** file list
  ("6 source + tests" vs actual 13 paths) + test count ("+9"/"7,136" =
  passing conflated with total; actual +13 cases / 7,140 total / 7,136
  pass). Benign on inspection every time, but now a recurring PROCESS
  defect, not a per-ticket nit. Escalate to a standing PROMPT_CONTRACTS
  template line ("enumerate EVERY path from git status; report total AND
  passing counts") — D0 process-architecture agenda item.
- **MINOR #4 (stray CSV):** reference-docs/Super Mega Baseball 4
  Rosters.csv — pre-existing untracked, unchanged by EP1; remains the
  standing pending-JK commit/gitignore decision.


### FINDING-146 — UPDATE 2026-06-12: CLOSED
**Status:** CLOSED (EP1-GOLDEN-R-AUDIT, Opus 4.8 Max: "EP1 D8 VERIFIED —
FINDING-146 CLOSED"). The golden-regression table + generator now exist
(scripts/ep1-golden-regression.mjs, spec-docs/EP1_GOLDEN_REGRESSION.md):
pre-EP1 via git show f8d5f82, post via working tree, both through the
canonical buildFranchiseTrueValuePreviewReport; self-refuses to write
unless 5 binding rows match (tamper-proven). 52 players / 13 changed /
UNATTRIBUTED 0; all 13 hand-verified by the auditor against the engine
formula incl the res_4(+570k)/res_5(−100k) Reserve mechanism. tw_if
correctly 260k/+80k (R-8 pt5 self-exclusion — NOT the reverted 280k).
FINDING-143 thereby DELTA-CERTIFIED on the deterministic synthetic
fixture (the agreed D8 bar). Note OBS-1: Captain prose mischaracterized
res_5 salary (130k, not 800k — the 800k was a pre-EP1 1B→3B merge
artifact); deliverable correct, prose corrected in PROMPT_CONTRACTS.

### FINDING-143 — UPDATE 2026-06-12: DELTA-CERTIFIED (was CONFIRMED-OPEN)
**Status:** RESOLVED / DELTA-CERTIFIED. EP1 effective-position engine
implemented (franchiseEffectivePosition.ts), code-verified + mutation-
proven (EP1-AUDIT 4 mutations killed), and delta-certified (EP1-GOLDEN-R
zero unattributed across the adversarial fixture). valuePosition now
resolves to effective position (plurality-with-incumbency over starts),
not profile primaryPosition. Closes the R-6 doctrine violation.


### FINDING-147 — UPDATE 2026-06-12: CLOSED
**Status:** CLOSED (CLEANUP-F147, Codex 5.5 high; Captain Opus 4.8 high
mechanical verification — no independent audit, oracle = grep + suite).
The false constant value at franchiseDesignations.ts:13 was replaced with
accurate post-EP1 wording (effective-position/Reserve pools; pitcher
profile-role v1; two-way CALIBRATE anchors); field + record shape kept
(Option 1). grep-zero on the old literal confirmed; 3 files; suite
7140/383 zero delta. No calculationVersion bump.


### FINDING-144 — UPDATE 2026-06-12: DEFERRED to post-pause architectural plan (NOT low-risk)
**Status:** CONFIRMED-OPEN, DEFERRED. Captain (Opus 4.8 high) traced the
call graph during Fable-less low-risk triage: resolveHitterPosition
(salaryCalculator.ts:698) has ONE caller — buildSalaryIvInput:722 →
computeIV → IV BASE SALARY. So the residue is LIVE code in the IV-salary
subsystem (NOT dead, NOT in EP1's True Value path). The UTIL/BENCH→'IF/OF'
and TWO-WAY→'OF' laundering branches feed position into IV salary
computation; the sibling normalizeSalaryTraitsForIV:731-733 invents
'Two Way (OF)' (the same R-6 invention the EP1 audit flagged here).
**Why deferred (not low-risk):** removing/changing these branches alters
what positions reach computeIV → potentially changes IV salaries. Safety
hinges on an unproven data-coverage question: do the UTIL/BENCH/TWO-WAY
branches EVER fire on the real 440-player DB? If never-fire → removal is
behavior-preserving (mechanically provable via an IV-salary golden diff,
real DB pre/post byte-identical). If they fire → real semantic change.
Either way this needs a golden-diff verification, not a checklist — out
of the clean low-risk bucket we committed to during the Fable gap.
**Disposition:** carry into the post-pause architectural plan as a
discovery-first ticket (Phase 0: do the branches fire on real data? +
IV-salary golden diff), routed/audited per the decorrelation-rebuild
plan. Do NOT force it during the Fable-less low-risk run.


---

### FINDING-148 — AUX_PRICING scope gap: left-handed-over-right batter base premium absent
**Date:** 2026-06-14 | **Status:** CONFIRMED-OPEN (new ticket queued; JK-gated)
**Files/area:** `src/data/traitPricing.ts` (AUX_PRICING) + `scripts/extract-iv-data.py`
+ IV spec §3.x aux pricing (~line 227); T1 contract scope (`PROMPT_CONTRACTS.md` ~line 398).
**Surfaced by:** T6 audit finding #1 (handednessBonus). The T6 audit separated two
distinct handedness concepts: (a) the CONTEXT platoon term (batter vs L/R pitcher) —
correctly handled in T6 via the matrix `vsHand` split traits, no change needed; and
(b) the STATIC base-value premium for the batter's OWN handedness — this finding.

**Finding (JK, 2026-06-14):** SMB4 applies base value premiums for batter handedness:
**switch > left > right**, two distinct bumps. The SWITCH case is correctly priced
(AUX_PRICING, +5 POW / +5 CON, IV spec §3.x ~line 227 / traitPricing.ts). The
**left-handed-over-right premium is ABSENT.**

**Root cause (scope gap — NOT an extraction or audit failure):** the T1 contract
(`PROMPT_CONTRACTS.md` ~line 398) enumerated aux pricing as "switch hitter, secondary
positions, arm angle" in ALL THREE scope references — the L/R batter premium was never
in T1's scope. Fable extracted exactly what was specified; T1-AUDIT correctly returned
CONFORMS against that contract. This is a CONTRACT SCOPE GAP. **No blame attaches to the
T1 build/audit chain.**

**Fix scope (new ticket — depends on T1's extraction script):**
1. Locate the L/R batter handedness premium in the XBL workbook
   (`Team_Builder_Archetype_Logic_Template.xlsx`, aux-pricing region — PitchCalcs /
   LeagueSettings per the T1 contract).
2. Extend `scripts/extract-iv-data.py` to pull it; add to AUX_PRICING in
   `traitPricing.ts` + document in §3.x. Magnitude comes from the workbook — NEVER
   hand-picked.
3. INVENTORY the entire aux-pricing region against the workbook while there — since the
   switch/secondary/arm-angle enumeration proved incomplete (it missed lefty), verify
   nothing else in that region was omitted.
4. Re-run T1's determinism + verification checks; confirm a known LHB and a comparable
   RHB now price apart by the workbook amount.

**Risk:** changes BASE IV → flows to salary / True Value / draft valuations league-wide.
**Critical amplifier (Captain):** a base-IV change re-prices every left-handed batter,
which invalidates the FROZEN oracle (`spec-docs/reference/iv_oracle.json`) and the T4
golden tests — the ticket MUST include oracle regeneration + golden re-validation +
downstream salary/TV/draft re-verification, not just an extract-script extension.
JK-gated; not a mechanical fix.

**ROUTE:** Codex 5.5 | high → Opus 4.8 audit (auditor ≠ builder).
**Sequencing:** NOT yet scheduled. JK to sequence vs the T-stack (F-141) — a new
non-T-stack ticket touching frozen base-IV; do NOT auto-insert into the T-stack run.

---

### FINDING-149
**Date:** 2026-06-18
**Phase:** Phase-2 L-stack (L9b-3a — independent engineering audit + fix)
**Status:** RESOLVED (fixed in the same commit cycle, before the corrected L9b-3a commit).
**File:** `src/engines/traitCandidateBuilder.ts` (producer) ↔ `src/engines/traitAcquisition.ts` (consumer, L9b-2)

**The break (real, latent, type-invisible):** L9b-3a's `computeSeasonTraitCandidates` originally emitted a FLAT
`TraitCandidate { traitName, realityPercentile, sufficiency, signalValue, sampleSize, peerPoolSize }`. L9b-2
`traitAcquisition.ts:25` defines `TraitCandidate { traitName: string; score: TraitRealityScore }` and
`computeTraitAcquisition` reads `candidate.score.sufficient` / `candidate.score.realityPercentile` /
`candidate.score.sufficiency` (`:211`/`:214`/`:219`). The flat output has NO `.score` member → L9b-3b (which must feed
L9b-3a's output into `computeTraitAcquisition`) could not wire them without an adapter, and the two same-named
`TraitCandidate` types collide. `tsc` did NOT catch it because the types only meet when actually wired (L9b-3b), so the
break was latent.

**How it was caught:** the decorrelated builder (Codex), in a self-audit turn, flagged the seam mismatch. The Captain
(Opus, the auditor) did NOT take Codex's word — verified it directly from `traitAcquisition.ts` source (the `score.*`
reads). This is exactly the Tier-2 (data-flow) check the anti-hallucination protocol mandates; the Captain's first audit
pass had verified within-file correctness + the full suite but NOT the cross-engine seam — gap acknowledged and closed.

**Correction to the builder's proposed resolution:** Codex's self-audit recommended REVERTING to its abandoned
exposure-COUNT model (`traitContextReconstructor.ts`, which happened to emit the nested shape). That conclusion is WRONG:
a bare predicate fire-COUNT makes every OPPOSING pair indistinguishable (Clutch≡Choker on `pressure:high`, RBI Hero≡Zero
on `risp`, Stealer≡Bad Jumps on every steal attempt, Butter Fingers≡Cannon≡Noodle on every fielding chance) — the only
differentiator is the OUTCOME, which the count model drops. The spec §B explicitly defines the signal as
"predicate-active + OUTCOME" (e.g. Clutch = "high-leverage PA + positive/negative outcome"), and `wpa`/`rbiCount` are
PERSISTED event fields, not "fabricated proxies." So the count model is the fatally-broken one.

**The fix (applied):** keep the outcome-weighted RATE signal model (§B-faithful) AND change the output to
`SeasonTraitCandidate extends TraitCandidate` (L9b-2's nested `{ traitName, score }`) plus debug `signalValue`/`sampleSize`
— so an array of L9b-3a candidates feeds `computeTraitAcquisition` directly as a structural subtype. Added a SEAM
INTEGRATION TEST that builds candidates and passes them straight into `computeTraitAcquisition` (the Tier-2 guard that was
missing). Verified: tsc 0; `traitCandidateBuilder.test.ts` 22/22 + `traitAcquisition.test.ts` 24/24; full suite
**7,487 tests, 7,485 pass / 2 characterized fail**, ZERO new reds; pure/build-dark; frozen engines byte-unchanged;
trackerDb v21.

**LESSON (for the pending pen / future builder contracts):** (1) an engine that PRODUCES a type another engine CONSUMES
must import + emit that consumer's exact type (or a structural subtype), and the contract must say so explicitly; (2) every
"pure engine" ticket whose output feeds a sibling engine needs a SEAM test in scope, not just within-file tests — tsc
alone will not flag a producer/consumer shape drift until the wiring ticket; (3) builder contracts should forbid editing
any spec-doc / git-add (the Captain owns docs) — this run the builder over-produced an abandoned file + edited 7 docs.
