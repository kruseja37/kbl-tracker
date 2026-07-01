# V1 PLAN — Fable 5 planning synthesis (2026-07-01)

> **Author:** Fable 5 (own Claude Code CLI session, attended planning — NOT the kbl-captain loop).
> **Status: RATIFIED by JK 2026-07-01** — all five §7 decisions confirmed (see DECISIONS_LOG
> 2026-07-01: assembly fires now; `main` advances; C2A→Codex; both pulled-forward tickets approved;
> conference editor IN v1 / divisions OUT). Two product rulings landed with the ratification:
> **(A) backup-catcher legality counts primary OR secondary position** (relaxes `rosterConstruction.ts`;
> secondary-position play is ratings-nerfed unless level-3 UTILITY — advisor surfaces the caveat; open
> sub-question: does the relaxation extend to the eight starting spots?), and **(B) a conference-
> assignment editor is v1 league-setup scope** (fold into the S2/league-setup batch; resolves the S1
> open question). JK also asked for a confidence read on in-season coverage → a fresh LIVING-SEASON
> audit (Opus, on the ASSEMBLED tree, vs `FRANCHISE_V1_LIVING_SEASON_SPEC.md` + `MODE_2_V1_FINAL.md`,
> orphan-detection emphasis) is added to Wave 1 — auditing pre-assembly would audit the wrong tree
> (the hub branch carries the bulk of the in-season UI).
> **Relationship:** refines `V1_BUILD_STATUS.md` §4 (the critical path) — it does NOT supersede it.
> V1_BUILD_STATUS stays the single status source of truth; this doc is the *sequencing + routing* plan.
> **Ground truth at write time:** trunk `experiment/manager-wpa-window` @ `a8ffdfea` (the audit +
> FABLE contracts + ASSEMBLY_PLAN + V1_BUILD_STATUS all landed in that commit mid-session — the
> evidence base is now tracked). 11 worktrees inventoried; draft-ui `94669afc`, hub `11e159d5`.

---

## §1. VERDICT ON THE INHERITED MATERIAL

**The audit is sound and the contract decomposition is right.** Every FABLE contract maps to a
verified real gap; the C2A/C2B split (harness before market model) is correct; folding the FS-3
shill-launch fix into C3 is correct. I accept the C1 → C2A → C2B → C3 dependency *structure*.

**One sequencing correction, evidence-backed: ASSEMBLY MUST PRECEDE THE MATH TRILOGY.**
The drafted plan treats the math trilogy as freely parallel to the assembly ("the math is independent
of the UI assembly"). That is wrong in one specific, verified way:

- `claude/v1-draft-ui` already carries **`src/engines/archetypeIdentity.ts`** with
  **`archetypeToCapIdentity(arch: HistoricalArchetype): TeamCapIdentity`** (+ its test) — verified by
  direct read in `/Users/johnkruse/Projects/kbl-draftlane` this session. **That is FABLE-C1 clause (d)
  — the archetype-vocabulary bridge — already partially built on the unmerged branch.** Trunk has no
  such file (verified: `src/engines/archetypeIdentity.ts` absent at HEAD). Building C1(d) on
  pre-assembly trunk would create a SECOND divergent bridge — the exact "third diverging line" failure
  the grounding addendum warns about for C4.
- C1 edits `auctionStateMachine.ts` / `leagueBuilderAuctionPipeline.ts`; draft-ui touches the adjacent
  auction/league-construction surface (`leagueConstruction.ts`, `leagueBuilderStorage.ts`,
  `auctionLuxuryTax.ts`, `farmArchetypeTilt.ts` — verified grep). The ASSEMBLY_PLAN's "1 conflict,
  risk LOW" pre-assessment was measured against *current* trunk; any trunk-side C1 edits invalidate it.

**Consequence:** fire the assembly FIRST (it is lined up, pre-assessed LOW, and costs zero Fable
budget — it's an Opus job), then run C1 on the assembled trunk, with C1(d) rescoped from "build the
bridge" to "adopt + extend draft-ui's `archetypeToCapIdentity` and make the auction actually consume
it." Serializing costs ~a day; it protects the merge AND deletes duplicate work from C1.

## §2. CONTRACT REFINEMENTS (scope-level, need JK nod since they alter the drafted contracts)

1. **C1(d) rescope (above):** post-assembly, the bridge work = wire/extend `archetypeIdentity.ts`
   (which will then sit on trunk with the 24-archetype data layer from `efc7cfb6`), not greenfield.
   Note: draft-ui's copy of `historicalArchetypes.ts` predates the 24-lock — after assembly the
   24 data + the converter combine; C1 must re-verify the converter against the locked 24.
2. **Route C2A to Codex-xhigh, not Fable.** The contract already permits it ("Fable OR Codex-xhigh").
   It is state-heavy harness work, not novel math — and it preserves Fable's capped budget for
   C1/C2B/C3, per JK's own budget directive (Q2). Opus audits as usual.
3. **Pull the in-season legal-roster enforcement OUT of C4 into an early standalone Codex ticket**
   (audit ISAGM-04/05, the cross-cutting addition #1): wire `franchiseRosterMovement.ts` +
   `rosterAnalyzerEngine.ts` to `rosterConstruction.ts` so the advisor stops calling 1 catcher legal
   and a GM can't send down their only catcher. It has NO dependency on C1–C4 (`rosterConstruction.ts`
   exists on trunk today), it's a live correctness hole in the living season, and burying it in the
   biggest, latest UI ticket leaves it open the longest. Small/medium, Codex-buildable, Opus audits.
   **Ruling A applies (JK 2026-07-01):** backup-C legality = primary OR secondary position (module
   update required — today it counts primary-C only and its player shape has no secondary field);
   starting-eight treatment pending the open sub-question; verify the secondary-position field +
   UTILITY-nerf exemption exist in the data model before wiring.
4. **S2 per-league shadow store is a C4 prerequisite, NOT a C1 prerequisite — build it in parallel
   via Codex.** V1_BUILD_STATUS §4 places "S2 foundation" before C1 in the draft-depth chain; but C1
   (and C2B) take the archetype/priorities as *arguments* — only C4's capture UI needs the store.
   It's well-understood storage plumbing (mirror `leaguePlayerOverrides`; register in the 4–5
   registries: backup + sync + L-SIM sandbox + save-slot — the known own-DB gotcha, plus the
   trackerDb version-bump test pin). Codex builds it during the math waves so C4 is unblocked later.
5. **Mock-draft toggle (PDS-05/FS-1, MAJOR)** is in no C-contract — schedule it explicitly as a small
   Codex ticket in the setup-spine batch (gate BOTH durable commits; add the badge in C4).

Everything else in the contracts stands as drafted (C2B scope incl. CONTESTED + shill-distribution +
solvency-floor replacement + bid-log; C3 incl. FS-3; C4 three-stage design/build/audit; C5 late).

## §3. THE SEQUENCED PLAN (waves; ‖ = concurrent)

**WAVE 0 — Assembly (JK fire-order; zero Fable spend; ~a day of Opus work)**
- Opus executes ASSEMBLY_PLAN_2026-07-01 verbatim: isolated worktree → merge draft-ui (1 doc
  conflict, base-aware union) → gate → merge hub (3-file overlap, keep draft-ui's AuctionStage) →
  gate → L-SIM (60g leg LAST) → JK browser sign-off → adopt as trunk → FF `main` (Q5, local only).
- ‖ SPEC-FIX-NOMINATION-2-3 (doc-only, Opus, minutes).
- ‖ Housekeeping: apply the superseded-doc banners V1_BUILD_STATUS §5 lists as pending; drop/park
  branches per the ASSEMBLY_PLAN inventory (JK does deletions).

**WAVE 1 — Foundation build-out (post-assembly; the big parallel window)**
- **FABLE-C1** (Fable builds, Opus audits) — the identity-first objective + position-aware own_need +
  rosterConstruction adoption + the (rescoped) vocab-bridge wiring. *The largest Fable spend; start
  as soon as assembly is green.*
- ‖ **FABLE-C2A** (Codex-xhigh builds, Opus audits) — the calibration harness against the existing
  auction. Numbers only become meaningful once C1 lands, but the harness itself doesn't wait.
- ‖ **QUICK-WIN-CATALOG-24** (Codex) — on the *assembled* trunk (the picker + catalog live on the
  draft lane; firing it pre-assembly targets the wrong tree).
- ‖ **S2 shadow store** (Codex, new contract needed) — per §2.4.
- ‖ **In-season legal-roster enforcement** (Codex, new contract needed) — per §2.3.
- ‖ **Freeze→real-frozen-franchise L-SIM bridge THIN SPIKE** (Opus) — V1_BUILD_STATUS calls this the
  single riskiest line; the operative plan says de-risk right after the draft-ui merge. A spike now
  sizes the real bridge before it can wreck the schedule.
- ‖ **LIVING-SEASON RE-AUDIT** (Opus, on the assembled tree — added per JK 2026-07-01): the 07-01
  audit's in-season dimension covered only the advisor; JK flagged lower confidence in the wider
  in-season surface (orphans / missing / contradictory logic). Scope: code vs
  `FRANCHISE_V1_LIVING_SEASON_SPEC.md` + `MODE_2_V1_FINAL.md`, orphan-detection emphasis, run AFTER
  assembly (the hub branch carries the bulk of the in-season UI — a pre-assembly audit audits the
  wrong tree). Findings feed Wave 2/3 scope; JK + Fable review them in a planning back-and-forth.
- ‖ **Conference-assignment editor** (Codex, with the S2/league-setup batch — JK ruling B): assign
  each team to a conference at league setup; no division editor in v1.

**WAVE 2 — Market brain**
- **FABLE-C2B** (Fable builds, Opus audits + runs L-SIM — it changes live bid caps) — Second-Price
  model + bid-vs-pass + CONTESTED + shill archetype-distribution + accurate completion floor +
  bid-log. Calibrate to 85–90% on C2A's harness.
- ‖ **Setup-spine seams** (Codex batch): seat-name writer, freeze-confirm, draft-recap, setup
  persistence, post-freeze summary, mock-draft toggle, FS-4 guard (freeze silently skipping
  baselines when no auction session).

**WAVE 3 — Pool + the big UI**
- **FABLE-C3** (Fable) — pool composition gate + sizing/completion-probability + sim-backed shill
  count **+ the FS-3 fix landing WITH it** (non-negotiable pairing).
- ‖ **FABLE-C4 design stage** (Fable, xhigh) — can start once C2B fixes the CONTESTED signal shape;
  → **C4 build** (Codex) → **C4 fidelity audit** (Fable, medium). Identity-bundle team page on the
  S2 store, real Draft-Setup page (kills the `/__preview` mock), dedicated Assistant-GM surface +
  evolve tool, farm auction onto AuctionStage, hub canonicalization.
- ‖ Remaining draft-economy/scout tickets (Codex): Option-A wrong-fit penalty + visible true-cost
  line; capIdentity auction-duration lock; scout archetype-derived 3/5/7 bands (needs S2's farm
  archetype) + deprecate the scout-hire flow.

**WAVE 4 — Activate + tune + ship (STRICT order, per V1_BUILD_STATUS §4.6)**
- Full L-SIM hardening green (bridge + invariants) → saved-game migration check → **flip the 11 soul
  flags ON** (needs the production activation mechanism — currently test-only; small BE ticket) →
  **§16 tuning via FABLE-C5** (harness = Fable or Codex-xhigh; Opus interprets distributions;
  recommended dials logged for JK, no live flips) → flip the live `/franchise` route → **JK browser
  sign-off on real data** (sole acceptance gate; loop back to tuning, not building).
- Open JK rulings folded here: emission-snub live-green graduation; booger-glove fame direction;
  winner-honor prestige magnitudes.

## §4. BUDGET-AWARE ROUTING (the July-7 cap)

| Seat | Gets | Does NOT get |
|---|---|---|
| **Fable** (capped ~50% to Jul 7) | C1 now; C2B next; C3; C4 design + fidelity audit; (this plan) | the audit-style sweeps, assembly, harness plumbing, storage plumbing, doc fixes |
| **Opus** | assembly + all gates/L-SIM + audits of every Fable/Codex diff + the bridge spike + spec-fix + committing | building anything Fable/Codex-routable |
| **Codex** | C2A, catalog-24, S2 store, legal-roster enforcement, setup-spine batch, C4 build, economy tickets | novel math (objective design, market model, sizing model) |

Pre-Jul-7 Fable spend ≈ C1 (+ C2B start if room). Everything in Wave 0 and most of Wave 1 burns zero
Fable budget — the cap window is spent almost entirely on the one thing only Fable should do.

## §5. RISK REGISTER (top 5)

1. **L-SIM freeze-bridge** — unsized, on the critical path to trustworthy tuning. Mitigation: Opus
   thin spike in Wave 1 (don't let it hide until Wave 4).
2. **§16 tuning volume** (~100 dials at 0) — the largest single remaining piece. Mitigation: C5
   harness built while Wave 3 finishes; Opus interprets; JK only ratifies dials.
3. **C2B calibration miss** — if coverage can't reach 80%+ in 2 iterations the STOP-IF fires; that's
   a structural finding (band model vs shill entropy), not a force-the-number moment.
4. **FS-3** — handled by the C3 pairing; the guard is that no shill-count>0 recommendation ships
   without the launch fix in the same diff (regression test required by the contract).
5. **Two-catalog drift** — post-assembly there are still 2 archetype surfaces (data 24 / display
   catalog); QUICK-WIN should DERIVE the display catalog from the data layer if feasible, per its
   own contract preference, to kill the class of bug rather than the instance.

## §6. DEFERRED / OUT OF v1 (unchanged, restated for the record)

Playoffs/offseason (Decision E; playoff-driver stays parked). Win-rate model (Option-C). In-season GM
tools beyond the legality fix (dead-cap surfacing thread stays separate). Division editor — OUT
(JK ruling B; the CONFERENCE editor is IN, Wave 1). v1.1 Underbidder Memory (C2B only logs).

## §7. DECISIONS NEEDED FROM JK (plain choices, recommendations first)

1. **Fire the assembly now?** → **Recommend YES, as the first move.** Everything UI-facing waits on
   it, the merge is pre-assessed LOW risk, and (new evidence, §1) building the math first would
   partially duplicate work already sitting on the draft branch and grow the merge risk.
2. **Advance `main` right after assembly (Q5)?** → **Recommend YES** (clean fast-forward, local only,
   never pushed) so the foundation stops living off-main.
3. **Route C2A (the harness) to Codex instead of Fable?** → **Recommend YES** — saves the capped
   Fable budget for the math only Fable should do; the contract already allows it.
4. **Approve the two pulled-forward Codex tickets** (in-season roster-legality enforcement; S2
   per-league store early)? → **Recommend YES to both** — one closes a live correctness hole, the
   other unblocks C4 later at zero critical-path cost. Opus writes both contracts.
5. **Conference/division editor in v1?** → **Recommend DEFER** (nothing on the critical path needs it).

*After JK rules: Opus executes Wave 0; Fable's first build dispatch is FABLE-C1 on the assembled
trunk (with the §2.1 rescope folded into the contract before dispatch). All standing rules apply —
branch-only, never push, builder ≠ auditor, JK browser sign-off is the sole acceptance gate.*
