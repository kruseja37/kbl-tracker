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

---

### FINDING-150
**Date:** 2026-06-18
**Phase:** L9 (traits-from-reality) — build-scope audit
**Status:** CONFIRMED-OPEN (rebuild-scope; foundations sound)
**File:** `spec-docs/TRAIT_SIGNAL_CERTIFICATION.md` §D(:52) vs §VI(:91/:103/:122/:127) · `src/engines/traitCandidateBuilder.ts` `BUILDABLE_TRAITS` (16) · `src/data/traitInteractionMatrix.ts`
**Trigger:** JK challenged the Q1 claim that the 8 count-family traits "need the ball-strike count," pointing out First Pitch Slayer/Prayer are measurable from one-pitch ABs, Big/Little Hack from POW/CON ratios + personality, and Falls Behind/BB Prone/Composed from walks + personality — and asked whether the rest of the trait-reality logic is wrong.

**Evidence:**
1. The trait MATRIX is correct (not the problem): `traitInteractionMatrix.ts` encodes each trait's real SMB4 gameplay EFFECT, cited to the guide, and those effects genuinely key on the count — First Pitch Slayer/Prayer/Gets Ahead/Falls Behind = `count{0-0}` (:455/:445/:465/:426); Big Hack `countIn 2-0/3-0/3-1` (:201); Little Hack `0-1/0-2/1-2` (:522); BB Prone/Composed `3-ball counts` (:191/:262). This is ground-truth about what the traits DO, and is sound.
2. The certification CONTRADICTS ITSELF on DETECTION. §D (:52) — the EARLY triage — buckets all 8 as "needs the ball-strike count input." But §VI (:91 "**SUPERSEDES §V's open framing**", JK design session 2026-06-16) resolves them WITHOUT a count: §VI.4 (:127) "reuse `pitchesInAtBat` (==1 ⇒ first-pitch)" → First Pitch Slayer/Prayer; §VI.3 (:122) "**Personality is PRIMARY where the measured signal is thin (Stimulated, Gets Ahead/Falls Behind, Big/Little Hack)**"; §VI.1 (:103) Franchise-lite "still earns … the **personality-primary ones**" — i.e. the count was NEVER meant to gate these; only zone/pitch-type/chase traits go dark without enrichment.
3. The BUILT detection layer inherited the stale §D framing. `traitCandidateBuilder.ts` `BUILDABLE_TRAITS` = exactly 16 (Clutch/Choker, RBI Hero/Zero, Rally Stopper/Surrounded/Starter, Meltdown, Stealer/Bad Jumps, Pinch Perfect, Butter Fingers, Cannon/Noodle Arm, Durable/Injury Prone) — all outcome/state/fielding. It omits traits §VI says are buildable from already-persisted or already-joined data: First Pitch Slayer/Prayer (`pitchesInAtBat`), the platoon splits CON/POW vs L/RHP + Specialist + Reverse Splits (**handedness was joined in L9a-3**), Bunter/Tough Out/Whiffer/K Collector/K Neglector/Base Rounder/Base Jogger/Sprinter/Slow Poke (clean outcome proxies), and the personality-primary count-family (Big/Little Hack, Gets Ahead/Falls Behind, BB Prone, Composed, Stimulated). §VI's buildable set (Bucket A 12 + Bucket B 27 + the personality-primary set) is ~39+; the build delivered 16 and justified the remainder as "needs new input" by citing the superseded §D table.
4. The personality-PRIMARY exception (the mechanism for the count-family) was DEFERRED in L9b-2 (logged as a DEFAULT-TAKEN) — JK OVERRODE this to v1 (ruling Q12, 2026-06-18). L9b-2's personality factor is only a TILT multiplier on an existing reality percentile + the min-sample valve kills thin signals, so neither L9b-3a (no candidate emitted) nor L9b-2 (tilt-only) currently implements "personality drives the trait when the signal is thin."

**Impact:**
- **Foundations are SOUND** — the matrix, the percentile scorer (`traitRealityScorer.ts`), the acquisition combiner (`traitAcquisition.ts`), and the 16 built traits are all verified-correct. This is NOT a teardown.
- **The detection SCOPE is wrong/incomplete** — L9b-3a built ~16 of ~39+ §VI-buildable traits; spec says ~14–15 traits should be dormant-without-enrichment (zone/pitch-type/chase), the build left ~33+ dormant (≈2×).
- **L9a-2 reframed** — the ball-strike count is a PRECISION input (lets Big/Little Hack/BB Prone/Composed measure the literal count instead of leaning on personality), NOT a hard gate. First-pitch comes free from `pitchesInAtBat`. JK ruling Q1: defer per-pitch count for v1 (precision-only, 4 traits).
- **Root cause / lesson:** L9b-3a used the SUPERSEDED §D triage instead of the resolved §VI model, and the superseded "needs new input" justification went uncaught. Future L-stack tickets that implement a spec with both an "open triage" and a "resolved model" section MUST build to the resolved section and the contract must name it.

**Next:** TRAIT_DETECTION_SCOPE_AUDIT — mechanically diff §VI's buildable set (A + B + personality-primary, with the live-persistence status of each discriminating signal) against `BUILDABLE_TRAITS`, producing the exact wrongly-dormant / correctly-dormant / cut classification with a signal source per trait, BEFORE any L9b-3a rebuild. Then re-scope L9a-2 (precision-only) + expand L9b-3a + build the L9b-2 personality-primary exception (Q12).

---

### FINDING-152
**Date:** 2026-07-13
**Phase:** Snake mock-draft browser audit follow-up
**Status:** CONFIRMED-OPEN — JK approved the complete repair/intelligence plan
**File:** `src/src_figma/app/components/snake/desk/deskModel.ts`; `src/src_figma/app/pages/SnakeDraftRoom.tsx`; `src/src_figma/app/pages/SnakeCompanion.tsx`; `src/engines/snakeGuideTrade.ts`; `src/engines/leagueConstruction.ts`; snake desk/room/companion/guide tests

**Evidence:**
1. `refitBoardSlots` already deterministically rebuilds a unique legal 22 from overall/position rankings, but `reorderSeatBoardRankings` explicitly returns `slots: input.board.slots`. Main and companion both call that non-refitting writer. SNAKE-MOCK-2B required both surfaces to refit and recalculate; current main/companion tests instead assert the stale plan. JK reproduced the visible result: moving a new player to #1 changes the ranking but not the board.
2. `searchSnakeGuidePackage` searches equal-count packages but stops as soon as any package exists at the smallest count, and candidate ordering prefers fewer pieces before value equality. `validateTrade` accepts a symmetric 15% value gap, while `derivePickValueChart` assigns raw nth-player IV to nth pick. This makes a nearby one-for-one trade-up qualify before a realistic balancing-return package. The documented `14+41` for `9+62` test hand-pins that value relationship and therefore does not validate real-pool package quality.
3. The repo already owns most required inputs: locked archetypes, live rosters, roster need, player fit, exact salary/tax/legal finish, five chemistry families, scarcity/replacement reads, a pin-capable Best-22 optimizer, and a public-information rival playout. The live snake product has only one persisted board, no separate derived Asst GM Board, no calibrated availability probability, no real multi-buyer pressure count, and no bridge from target risk to a fair executable trade-up.
4. Focused baseline characterization on frozen branch `codex/snake-mock-draft-ready` at `99d13080`: 7 test files / 60 tests passed. The green state does not clear item 1 because three tests positively encode the stale-board behavior; it characterizes the defect.

**Impact:**
- User ranking work does not control the primary 22-player plan or its money/chemistry consequences.
- The trade guide is legal but strategically worthless for common trade-ups.
- High-value backend intelligence is fragmented into cards/logs instead of producing a coherent decision aid.
- Main and companion surfaces share the same stale-board defect.

**Approved repair:** Binding contract `spec-docs/contracts/CONTRACT_SNAKE_INTELLIGENCE_2026-07-13.md`. Build in verified batches: live My Board refit; fair balancing trade packages; separate live Asst GM Board; selected-player opportunity cost; availability/rival/scarcity intelligence; actionable TAKE/WAIT/TRADE recommendations; UI consolidation under the ratified Help-Button Law. Separate builder and auditor; JK's browser walk is the only acceptance gate.

---

### FINDING-153
**Date:** 2026-07-13
**Phase:** Snake Intelligence Batch 2 pre-build trace
**Status:** CONFIRMED-OPEN — build contract amended
**File:** `src/engines/snakeGuideTrade.ts`; `src/engines/leagueConstruction.ts`; MLB snake guide callers/tests

**Evidence:**
1. MLB package execution revalidation checks equal array lengths but not unique picks, disjoint sides,
   distinct buyer/seller, or required target ownership. `swapOwnership` later converts those arrays to
   sets. A tampered offer such as `[24, 24]` for `[19, 41]` can therefore value pick 24 twice, pass as
   2-for-2, then execute as a real 1-for-2.
2. Revalidation persists caller-supplied `offerValue` and `receiveValue` instead of recomputing current
   posted totals. A stale or tampered proposal can therefore leave an inaccurate trade receipt even when
   ownership/revision checks still pass.
3. The shared `validateTrade` helper is also used by the frozen farm-draft path. Changing its symmetric
   semantics would cross the Batch 2 boundary. MLB needs an additional directional rule: the buyer moving
   up may not offer less posted value than the seller gives up.
4. The current chart is raw nth-player IV. Current-pool opportunity value can instead be derived
   deterministically as the one-round forward-cohort expected IV above the first undrafted cohort, with a
   positive late-pick floor derived from the final drafted-to-replacement gap.
5. Hostile Batch 2 audit found two contract-level gaps in the first repair: naive summation can overflow
   to `NaN` even when every IV is finite (for example two `Number.MAX_VALUE` rows), and `registerPool`
   reconstructed club count with `ceil(totalSlots / 22)` rather than receiving the actual league club
   count from both production registration callers.

**Impact:** A forged equal-length package can change actual turn counts, and the live guide can recommend
strategically weak packages or record caller-controlled values. This is a transaction-integrity defect,
not merely a presentation problem.

**Required repair:** Reject duplicate/overlapping/self/target-mismatched packages; recompute canonical
totals at execution; retain equal counts and the 15% imbalance ceiling; enforce seller protection; search
all authorized 1–3 pick counts and minimize posted value gap before complexity. Keep shared farm validation
unchanged. Exact math and test gates are frozen in Batch 2 of the Snake Intelligence contract.
