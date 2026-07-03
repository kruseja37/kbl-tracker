# FABLE 5 DISPATCH QUEUE — drafted 2026-07-01 (Sonnet 5, Claude.ai chat)

> **STATUS: SCOPING DRAFT, NOT DISPATCH-READY.** These are NOT kbl-captain-protocol CONTRACTS (they were
> NOT produced by re-reading source file:line per STEP 1/3A). They exist so Fable 5's build queue is
> planned the moment it's back online. Whoever dispatches (Opus/Captain) must re-ground every SOURCE OF
> TRUTH pointer against current source before firing, per kbl-captain STEP 1 ("read; never trust
> summaries"). Do NOT paste these directly into PROMPT_CONTRACTS.md without that re-grounding pass.
>
> **Origin:** JK + Claude (Sonnet 5) planning session, 2026-07-01, reasoning from
> `SCOUTING_INTELLIGENCE_SPEC.md` + `SCOUTING_INTELLIGENCE_INTERROGATION_TRANSCRIPT.md` +
> `TEAM_ARCHETYPES_24.md` + `V1_HANDOFF_2026-06-30_DRAFT_AND_LIVING_SEASON.md` + a read of
> `CURRENT_STATE.md`'s live header + `.claude/skills/kbl-captain/SKILL.md`.
>
> **JK's key correction that reshaped this queue:** the scouting-intelligence system IS the
> roster-construction intelligence, and nothing in the engine currently knows how to build TO an
> archetype (only a flat value-maximizer exists) — so that has to be built before the archetype-balance
> math can even be tested, not after. Pool-sizing is downstream of the market model, not upstream of it,
> because "will this team get the players that fit its archetype" is a contested-demand /
> market-clearing question, not a counting question — and shills carry hidden archetypes that must be
> modeled as a probability distribution, not a fixed extra-bidder term.
>
> **Builder/auditor assignment (JK-ruled, this session):** Contracts 1-3 (math/architecture) = Fable
> builds, Opus audits (swap builder only; Opus stays Captain/auditor/committer per the existing loop).
> Contract 4 (UI) = Fable designs, Codex builds, Fable audits fidelity-to-its-own-spec (legitimate
> builder≠auditor pairing — Fable never touches the implementation). Contract 5 (sim/tuning) = Fable or
> Codex-very-high builds the harness (state-heavy, minimum bar per JK's routing rule), Opus interprets
> the statistical output.

---

## GROUNDING ADDENDUM — 2026-07-01 (Opus, max thinking) — READ THIS FIRST

The contracts below were drafted ungrounded (Sonnet). Opus then verified their load-bearing assumptions
against the live repo. Verdicts + the resulting structural changes:

### Grounding verdicts (what's true in the code right now)
- **TRUNK IS `experiment/manager-wpa-window`, NOT `codex/franchise-v1-next`.** HEAD = `fd1f5961`; it is a
  strict SUPERSET of `codex/franchise-v1-next` (111 commits ahead, 0 behind) and is 1108 ahead of `main`.
  The kbl-captain SKILL.md still names `codex/franchise-v1-next` as the trunk — that is STALE. Any Fable /
  fresh-Captain session must be pointed at `experiment/manager-wpa-window`. **[OPEN Q4: update the skill?]**
- **The Mode-1 auction lane merge (`87a59ec0`) IS an ancestor of HEAD** → the auction + L-stack +
  24-archetype lock are all on trunk. The doc's original #1 risk ("is the lane still merged") is CLEARED.
- **`rosterConstruction.ts`, `historicalArchetypes.ts`, `archetypeBalanceSimulator.ts` (`buildBestRoster`),
  `poolFeasibility.ts` (`analyzePoolFeasibility`), `cpuShillBidding.ts` (`evaluateCpuValuation`,
  `auctionMaxBid`), `auctionStateMachine.ts` (`selectNextNominee`) ALL EXIST.** Most spec "REUSE" claims hold.
- **⚠ `auctionTuningSim` DOES NOT EXIST.** No tuning sim, no second-price/clearing-price code anywhere in
  `src`. The spec §5 treats `auctionTuningSim.test.ts` as an existing asset and makes it THE calibration
  gate for the market model — it is vaporware. This is a hidden prerequisite shared by Contract 2 AND
  Contract 3. **→ Contract 2 is now SPLIT (see below).**
- **`buildBestRoster` objective nuance:** it already HAS a `fitScore` and even seeds one greedy climb from
  fit (`fromFit`), but the acceptance criterion is `objective()` = Σ iv − over-budget penalty
  (`archetypeBalanceSimulator.ts:159-160`), so every build converges back toward value. So Contract 1's fix
  is precise: **make fit the OBJECTIVE (line 159), not just a seed.** Fit awareness already exists; it's
  ignored by the selector.
- **Position-aware `own_need` is genuinely UNBUILT.** The auction decrements a flat scalar
  `rosterSlotsRemaining` by 1 per win (`auctionStateMachine.ts:429`); `team-full` fires on the scalar
  hitting 0 (`:296/:369`). No position awareness anywhere. A completion-reserve DOES exist
  (`leagueConstruction.ts:410-412`, `slotsRemaining × cheapestFill`) — the spec §6 "forced-filler" — but it
  is ALSO position-blind and needs the own_need model to become position-aware. Contract 1 stands, confirmed.
- **The 24-vs-15 catalog split is CONFIRMED and worse than a stale number:** the data layer has 24; the
  display catalog `teamArchetypeCatalog.ts` is HAND-MAINTAINED (no import from the data layer), lists 15,
  and its own header says "Wire `key` → the engine archetype later." Players literally cannot pick the 9 new
  archetypes until this is wired. It's display-only / no test pins → a small standalone Codex ticket, NOT
  Fable-worthy. **→ new QUICK-WIN ticket (below), dispatch anytime.**

### Structural changes to the plan (answer-independent — these are just correct)
1. **NEW PHASE A — ASSEMBLY, and it's a real diverged-branch merge, not a fast-forward.** The draft UI and
   Mode-2 hub live on unmerged, heavily-diverged worktrees:
   - `claude/v1-draft-ui` (kbl-draftlane, the "playable draft"): **ahead 27 / behind 40**
   - `claude/lineups-fenway-hub` (the Mode-2 hub): **ahead 64 / behind 58**
   - `codex/draft-setup-ui`: ahead 5 / behind 225 (near-abandoned vs trunk)
   - `claude/v1-playoff-driver`: ahead 2 / behind 43 · `claude/v1-soul-gaps`: ahead 0 / behind 51
   Contract 4 (new scout UI) CANNOT proceed cleanly until it's known which of these becomes the trunk
   draft/hub base — building new scout UI on top of an un-assembled base just creates a third diverging line.
   **This is JK-gated per multiple prior CURRENT_STATE blocks. → OPEN Q1 (below).**
2. **Contract 2 SPLIT** (because `auctionTuningSim` is vaporware):
   - **2a — the auction Monte-Carlo tuning/calibration harness**, built on the EXISTING auction (state
     machine + cpuShillBidding already exist → the harness can drive them today). Fable or Codex-vhigh.
   - **2b — the Second-Price market model + bid-vs-pass + nomination-timing + CONTESTED signal**, calibrated
     against 2a's harness. Fable. Depends on Contract 1 + 2a.
   - **Contract 3 (pool-sizing) reuses 2a's harness** for its completion-probability sim (don't build a
     second harness). Depends on 2a + 2b.
3. **Contract 0 (audit) gains an explicit deliverable:** inventory every draft/hub worktree (what's on it,
   divergence, conflicts) to INFORM the Phase-A assembly decision. The audit runs on trunk logic
   (engine/scout/archetype/freeze/season all live on trunk); the UI worktrees are inventoried, not audited
   line-by-line.

### Sequence (revised)
Phase A ASSEMBLY (JK-gated) ‖ Contract 0 audit (parallel, informs A) → Contract 1 (identity-first optimizer
+ own_need) → Contract 2a (tuning harness) → Contract 2b (market model, calibrated vs 2a) → Contract 3
(pool-sizing, reuses 2a) → Contract 4 (scout UI, on the assembled base; needs 2b's CONTESTED signal to
render) → Contract 5 (mass-sim dial tuning). Quick-win catalog-wire ticket: anytime.

### OPEN DECISIONS FOR JK (block/reshape the plan)
- **Q1 (assembly base):** which worktree(s) become the trunk draft-UI + hub base, and merge order? The
  merges are real (draft UI 27/40, hub 64/58 diverged). Nothing in Contract 4 proceeds until this is set.
- **Q2 (Fable budget vs audit):** Fable is capped at 50% weekly usage through July 7, then usage-credits.
  The math trilogy (Contracts 1 / 2a-2b / 3) is the part Opus definitively couldn't do — protect Fable for
  it. The A-to-Z audit is where you WANTED Fable's eyes, but Opus can run it too. Audit runs first either
  way (it's a whose-eyes/whose-budget question, not a sequencing conflict). Spend Fable on the audit, or
  reserve Fable for the trilogy and let Opus audit?
- **Q3 (dispatch mechanic):** does Fable run as a Claude Code CLI session (reads contracts directly) or
  through the kbl-captain `codex exec` stdin pipe (Codex-specific; the `model_reasoning_effort` flag +
  "very-high is invalid" gotcha are Codex-only)? Determines how these contracts are handed off.
- **Q4 (skill drift):** update kbl-captain SKILL.md to name `experiment/manager-wpa-window` as trunk?
- **Q5 (`main`):** trunk is 1108 ahead of `main`; the whole foundation is off-`main`. Does v1 ship off
  `experiment/manager-wpa-window` with `main` left as a historical artifact, or is advancing `main` in scope?

---

<!-- ===== DRAFT CONTRACT: AUDIT-PREDRAFT-TO-SEASON ===== -->

# DRAFT CONTRACT 0: AUDIT-PREDRAFT-TO-SEASON

**ROUTE:** confirm current branch/worktree FIRST — `git branch --show-current` + `git worktree list` —
against `CURRENT_STATE.md`'s live header before anything else. The header's most recent block is on
`experiment/manager-wpa-window`; the kbl-captain skill's documented topology is `codex/franchise-v1-next`
(main) + `codex/mode1-v1` (worktree `/Users/johnkruse/Projects/kbl-mode1`). AUTONOMOUS_RUN_LOG shows the
Mode-1 auction lane merged to the main tree once (`87a59ec0`) — CONFIRM that merge is still current and
reachable from wherever HEAD is now; do not assume.

**ROLE:** Auditor only (Fable 5, Claude Code CLI). No builder counterpart in this ticket — audit-only,
so builder≠auditor doesn't apply; this pass is clean specifically because nothing has been built yet.

**GOAL:** Produce `spec-docs/AUDIT_PREDRAFT_TO_SEASON_2026-07-XX.md` enumerating every place the
pre-draft → draft → freeze → season pipeline has (a) missing logic, (b) contradictions between the spec
docs and the actual code, (c) gaps vs. what's spec'd-but-unbuilt (the docs already name several: the
position-aware `own_need` roster model §5, the per-league team-instance layer, the archetype-vocabulary
reconciliation, the `teamArchetypeCatalog.ts` 15-vs-24 wiring gap), (d) bugs.

**SOURCE OF TRUTH (re-read fresh, do not trust this list blindly):** `SCOUTING_INTELLIGENCE_SPEC.md`
(canonical) + `SCOUTING_INTELLIGENCE_INTERROGATION_TRANSCRIPT.md` (decision record) +
`TEAM_ARCHETYPES_24.md` + `V1_HANDOFF_2026-06-30_DRAFT_AND_LIVING_SEASON.md` + `CURRENT_STATE.md` live
header + the newest `AUTONOMOUS_RUN_LOG.md` blocks.

**THE MAKE-OR-BREAK:** this audit's main value is catching drift between what `CURRENT_STATE.md` claims
is true and what the code on the CURRENT branch actually contains — especially whether the merged Mode-1
auction lane is still present and current. State the branch/worktree verdict FIRST, before any other
finding.

**Skill chain to use:** `exhaustive-spec-auditor`, `franchise-engine-discovery`, `data-pipeline-tracer`.

**EXPECTED OUTPUT:** the findings doc, categorized CRITICAL / MAJOR / MINOR, each with file:line, with an
explicit "IS THE MODE-1 AUCTION LANE STILL MERGED AND CURRENT" verdict as the first line.

**VERIFICATION:** JK reads it. No code changes in this ticket — nothing to gate/build.

**FORMAT:** the doc + a one-paragraph summary back to JK.

**FAILURE PROTOCOL:** not applicable in the STOP-IF sense — flag any claim you're not fully certain of as
UNVERIFIED rather than asserting it.

Use xhigh reasoning effort.

<!-- ===== END DRAFT CONTRACT: AUDIT-PREDRAFT-TO-SEASON ===== -->

<!-- ===== DRAFT CONTRACT: ROSTER-CONSTRUCTION-INTELLIGENCE ===== -->

# DRAFT CONTRACT 1: ROSTER-CONSTRUCTION-INTELLIGENCE (the foundation — build this first)

**ROLE:** Builder (Fable 5). Auditor: Opus (Captain) — audits the real diff, runs the gate, per the
existing kbl-captain loop (STEP 3 C/D), with Fable substituted for Codex as builder on this ticket only.

**GOAL:** Replace the value-maximizing roster builder (`buildBestRoster`, `archetypeBalanceSimulator.ts`
per the transcript's citation) with an IDENTITY-FIRST / strategy-first construction engine that:
(a) builds toward the declared archetype's boosted areas rather than maximizing raw kblIV,
(b) enforces the position-aware `own_need` model (spec §5 — required slots minus filled slots PER
POSITION; a team isn't "filled" at C until it has its backup C; SP has 4 critical slots) in place of the
flat `rosterSlotsRemaining = 22 − drafted` count the live auction currently enforces,
(c) reconciles the two archetype representations (`HISTORICAL_ARCHETYPES`/`ARCHETYPE_STAT_UNIT` vs.
`capIdentity`/`CAP_MODIFICATION_FRACTIONS`) so a plan the optimizer builds matches the caps the live
auction actually applies.

**SOURCE OF TRUTH (re-ground at dispatch):** `V1_HANDOFF_2026-06-30...md` §3.3 ("Strategy-first (identity)
building is the scout's paradigm" + the documented value-maximizer failure mode);
`SCOUTING_INTELLIGENCE_SPEC.md` §5 (own_need); `TEAM_ARCHETYPES_24.md` (24 locked archetypes + cap-shift
math); `rosterConstruction.ts` (`LEGAL_ROSTER`/`isLegalRoster`/`canStart`/`canRelieve` — the shared
legal-roster module all three consumers — auction, scout board, in-season advisor — must adopt, per
existing JK directive).

**THE MAKE-OR-BREAK (state this back before building):** a roster generator that maximizes Σ(kblIV) under
a shifted cap will STILL converge on pitching-heavy builds for every identity even after the own_need fix
— because the diagnosed confound is that kblIV prices pitching far above hitting. The fix is not a bigger
cap or better position enforcement alone, it's changing the OBJECTIVE FUNCTION from "maximize value" to
"maximize archetype-boosted-area coverage subject to a value floor + legality."

**CONSTRAINTS:** build on `rosterConstruction.ts` as the single legality source of truth — do not
re-derive it. Do NOT touch the frozen `historicalArchetypes.test` 24-archetype value-parity gate (that
stays a separate, still-valid check — this ticket is about HOW a roster is built, not re-litigating the
24). The deferred win-rate model (Option-C ruling) is explicitly OUT of scope for this ticket — flag, do
not attempt to resolve it here.

**EXPECTED OUTPUT:** a generalized roster builder accepting per-position priorities + a team archetype +
a risk posture, producing a legal roster that visibly EMBODIES the archetype (e.g., a Power identity's
build shows elevated POW/CON among its position players and reduced pitching command — not just a higher
total-value number). The `own_need` model wired into the auction's `rosterSlotsRemaining`.

**VERIFICATION:** extend `runBalanceSim`/`historicalArchetypes.test` with an IDENTITY-EMBODIMENT
assertion (not just value parity — e.g. assert a Power archetype's built roster has a POW z-score above
the pool mean) for all 24 archetypes; full suite; L-SIM smoke.

**FORMAT:** standard kbl-captain STATUS line + files changed + before/after identity-embodiment numbers
for 2-3 archetypes (e.g. Big Red Machine's lineup POW z-score before vs. after) to show the qualitative
fix, not just a passing test.

**FAILURE PROTOCOL (STOP-IF):** the objective-function change requires touching the frozen
`historicalArchetypes.test` value-parity assertions themselves (report, do not edit); or resolving this
cleanly requires the deferred win-rate model (STOP, log as an OPEN-DECISION — this ticket is descoped to
legality + embodiment, not win-rate proof).

Use xhigh reasoning effort.

<!-- ===== END DRAFT CONTRACT: ROSTER-CONSTRUCTION-INTELLIGENCE ===== -->

<!-- ===== DRAFT CONTRACT: AUCTION-MARKET-INTELLIGENCE ===== -->

# DRAFT CONTRACT 2: AUCTION-MARKET-INTELLIGENCE (Second-Price + bid-vs-pass + nomination-timing + contested demand)

**DEPENDS ON:** DRAFT CONTRACT 1 (needs `own_need` + the identity-first builder to compute
`needMultiplier` and to re-project bid-vs-pass against a builder that actually reflects identity).

**ROLE:** Builder (Fable 5). Auditor: Opus.

**GOAL:** Build the Second-Price market model (spec §5): `v_ij = IV_i × archetypeFit × needMultiplier_j
(pos) × personalityBias_j`, clamped to solvency; `price_i ≈ 2nd-highest{v_ij} + Δ`; the bid-vs-pass board
projection (deterministic re-optimization on bid vs. pass); nomination-timing odds
(`weight=(ivPercentile/100)^2.5`, closed-form P(target nominated while affordable)). Calibrate band width
against `auctionTuningSim.test.ts` until it hits the spec's 85-90% coverage gate.

**THE NEW WRINKLE (JK, 2026-07-01 — fold this in explicitly; it is implicit in the spec's formula but not
surfaced to the user):** a team cannot assume it will WIN the players that fit its own archetype, because
those same players may be MORE valuable to a rival's archetype (or a shill's hidden one) and get bid away.
The 2nd-price formula already handles this mathematically (a contested player's `v_ij` is naturally high
for multiple teams, which widens/raises the predicted price) — but the deliverable needs to make this
LEGIBLE to the GM, not just quietly widen a number range. Add an explicit CONTESTED signal to the board:
when a target's `v_ij` is high for 2+ OTHER teams, say so plainly ("2 other teams also want this profile —
expect near-ceiling, or plan a fallback"), not just a wider band the GM has to infer contention from.

**SHILL-ARCHETYPE UNCERTAINTY (JK, 2026-07-01):** shills carry a hidden archetype unknowable to the user's
Assistant GM. Confirm the implementation treats shill demand as a PROBABILITY DISTRIBUTION over the
24-archetype menu (reasoning "if this shill is Power-flavored it wants this guy, if Defense-flavored it
doesn't," blended into the band) — not a fixed/average "extra bidder" term. This is the spec's existing
"two band-wideners" framing (§5); this ticket is making sure the actual implementation honors it
structurally, not just in the band-width number.

**SOURCE OF TRUTH:** `SCOUTING_INTELLIGENCE_SPEC.md` §5-6; the interrogation transcript Q5 + follow-ups
(F1 own_need correction, F2 imperfect information, F3 shill tuning); `auctionMaxBid`,
`auctionMarginalTax`, `evaluateCpuValuation`, `selectNextNominee` (per the transcript,
`auctionStateMachine.ts:187-214`), `buildSeededCpuShill`/`cpuShillBidding.ts` (existing shill infra —
reuse, do not rebuild).

**CONSTRAINTS:** closed-form/deterministic in the hot path — no Monte-Carlo except the explicitly-scoped
v2 forward-projection (out of scope here). Type the 3 undefined spec types (`EstimatedMarket`/
`CompetingTeamProfile`/`ShillProfile`). Add the bid-log infra (`Lot.bidLog`,
`AuctionResult.{bidderSet,underbidder,numBidders}`) now even though v1.1 consumption is a later ticket.

**EXPECTED OUTPUT:** the v1 "Second-Price Board" per the spec's staging, PLUS the CONTESTED signal and
the archetype-distributed shill uncertainty.

**VERIFICATION:** calibrate against `auctionTuningSim.test.ts` — report actual achieved coverage %
(target 85-90%); full suite; confirm sub-ms per-projection latency (no-timer eases this but it must stay
responsive).

**FORMAT:** standard STATUS line + achieved calibration % + a worked example showing the CONTESTED flag
firing on a genuinely multi-team-desired player.

**FAILURE PROTOCOL (STOP-IF):** calibration can't reach 80%+ after 2 tuning iterations (STOP, report the
actual distribution, do not force it); or the CONTESTED signal would require exposing a rival's true
valuation number (it must stay inference-only — a leaked exact figure breaks the privacy design from
spec §6).

Use xhigh reasoning effort.

<!-- ===== END DRAFT CONTRACT: AUCTION-MARKET-INTELLIGENCE ===== -->

<!-- ===== DRAFT CONTRACT: DRAFT-POOL-SIZING ===== -->

# DRAFT CONTRACT 3: DRAFT-POOL SIZING & COMPOSITION MODEL

**DEPENDS ON:** DRAFT CONTRACT 2 — this is fundamentally a market-clearing question, not a counting one;
build it on top of the Second-Price machinery rather than a second, independent valuation model.

**ROLE:** Builder (Fable 5). Auditor: Opus.

**GOAL:** For an 8-team league with S shills (S itself TBD — first sub-deliverable is a recommended S),
solve how large and how COMPOSED a draft pool must be so every plausible archetype choice remains
buildable for the real teams, accounting for contested demand from other teams AND from S shills of
unknown archetype. Produce: (1) a sizing formula/table — NOT a flat multiplier (JK's 1.2× is a reasonable
floor, not sufficient once shills + contention are modeled); (2) a pre-draft GUIDANCE layer surfaced to
the user or usable to auto-curate a pool from a larger source set — "if you're building Bash Brothers, the
pool needs ≥N players at position P with rating profile R."

**SOURCE OF TRUTH:** `analyzePoolFeasibility`/`buildBestRoster` (currently orphaned for IN-SEASON use per
the transcript — repurpose for PRE-DRAFT use here); `rosterConstruction.ts`; the 24 archetypes' cap-shift
specs (`TEAM_ARCHETYPES_24.md`); DRAFT CONTRACT 2's market model (reuse the `v_ij`/needMultiplier
machinery to model contention rather than re-deriving a second valuation model).

**THE MAKE-OR-BREAK (state this back before building):** pool sizing is NOT "does the pool contain enough
archetype-fitting players" — it's "will THIS team actually WIN enough of them in a contested auction
against N-1 other teams and S shills who may want the same profile." The deliverable is a
COMPLETION-PROBABILITY given a pool size/composition and a league size — not a guarantee, and not a static
count.

**CONSTRAINTS:** reuse Contract 2's `v_ij`/needMultiplier machinery rather than building a second
valuation model. The shill-count recommendation must be sim-backed (via `auctionTuningSim`-style runs
across many archetype/shill assignments), not asserted from intuition.

**EXPECTED OUTPUT:** (a) a recommended shill count for an 8-team league with a stated, sim-backed
rationale; (b) a sizing formula/table; (c) the per-archetype pre-draft guidance feature (spec + a first
implementation, likely surfaced via `analyzePoolFeasibility`'s existing hook).

**VERIFICATION:** run the completion-probability sim across all 24 archetypes at the recommended pool
size/shill count; report the distribution; flag any archetype falling below a reasonable completion
threshold (e.g. <90%) as needing either a bigger pool or a different shill count.

**FORMAT:** STATUS line + the sizing table + the per-archetype completion-probability results.

**FAILURE PROTOCOL (STOP-IF):** the sim shows NO pool size within a sane range (e.g. under 3× total
roster needs) gets all 24 archetypes above a reasonable completion threshold — that's a structural finding
about the archetype set being too demanding for an 8-team league, not a tuning nit. STOP and log as an
OPEN-DECISION for JK rather than forcing a number.

Use xhigh reasoning effort.

<!-- ===== END DRAFT CONTRACT: DRAFT-POOL-SIZING ===== -->

<!-- ===== DRAFT CONTRACT: UI-DRAFT-AND-HUB ===== -->

# DRAFT CONTRACT 4: UI — DRAFT SETUP/EXPERIENCE + MODE-2 HUB

**ROLE (three-stage rotation, deliberate):** Designer (Fable 5) → Builder (Codex) → Fidelity auditor
(Fable 5). This is a different builder≠auditor pairing than Contracts 1-3 — Fable never touches the
implementation here, so auditing Codex's build against Fable's OWN design spec is legitimate, not
self-audit.

**GOAL — design stage (dispatch first):** produce a UI/UX design spec for (a) the draft setup/experience
— the per-league team-edit page, the identity bundle, the no-timer pass-the-iPad auction screen with the
public/private layer split, the live board + bid-vs-pass projection surface, the CONTESTED signal from
Contract 2 — and (b) the Mode-2 franchise hub cleanup, specifically the currently-partial in-season
Assistant GM surface (a DEDICATED invoked screen per the Thread A ruling, not the passive sidebar it is
today).

**GOAL — build stage (dispatch second, against the design spec):** Codex implements the design spec
exactly — no scope-adding, no scope-cutting.

**GOAL — audit stage (dispatch third):** Fable reviews Codex's implementation against ITS OWN design spec
for fidelity — not logic correctness (the standard gate covers that) — specifically whether visual/
interaction intent survived implementation.

**SOURCE OF TRUTH:** `SCOUTING_INTELLIGENCE_SPEC.md` §6 (the live auction experience — public/private
layers, no timer, the killer-feature bid-vs-pass projection); §9 (in-season Assistant GM — advise-by-
default, dedicated surface, performance-aware); the Thread A rulings (roster-analysis UX forks).

**CONSTRAINTS:** the Codex build stage is constrained to the design spec's exact interaction model;
ambiguity gets flagged back to the spec, not improvised.

**EXPECTED OUTPUT:** design spec doc → implemented screens → a fidelity-audit report.

**VERIFICATION:** standard build+test gate on the Codex build stage. USER-VISIBLE — JK browser sign-off
required per your existing convention for anything that changes what the person sees.

**FORMAT:** standard.

**FAILURE PROTOCOL:** Codex STOP-IF the design spec is ambiguous on a specific interaction (report, do not
guess). Fable's fidelity audit STOP-IF it can't cleanly separate "design intent" from "re-litigating taste"
— the fidelity pass is not a second design round.

Reasoning effort: design stage = Fable, xhigh. Build stage = Codex 5.5, high. Audit stage = Fable, medium.

<!-- ===== END DRAFT CONTRACT: UI-DRAFT-AND-HUB ===== -->

<!-- ===== DRAFT CONTRACT: MASS-SIM-DIAL-TUNING ===== -->

# DRAFT CONTRACT 5: MASS SIMULATION / ~100-DIAL TUNING

**DEPENDS ON:** Contracts 1-4 substantially landing — needs the real pipeline to exercise realistically.

**ROLE:** Builder (Fable 5, or Codex 5.5 very-high — this is heavy reducer/state work, minimum bar per
your own routing rule regardless of which model runs it). Auditor: Opus — statistical interpretation of
the output distributions, not a code-correctness pass alone.

**GOAL:** extend the `season-simulator` skill's harness to run at scale (thousands of games) and sweep the
~100 tuning dials — morale magnitudes, relationship-edge intensities, ratings/trait adjustment
magnitudes, manager-firing thresholds, the rebrand circuit-breaker threshold, and every existing
`§16-tunable placeholder` left in the codebase by prior AUTH-4 tickets (grep the literal string — several
are named explicitly in `AUTONOMOUS_RUN_LOG.md`, e.g. WINNER-HONORS-18's prestige table, HONOR-NEWS-20's
dramatic weights, RA-6A's convex-curve defaults).

**SOURCE OF TRUTH:** the `season-simulator` skill; the L-SIM protocol (kbl-captain STEP 5 — smoke 24g,
then the standard 60g leg LAST since it regenerates the committed baselines); every `§16-tunable
placeholder` comment in-repo.

**THE MAKE-OR-BREAK:** this is calibration, not a build — the harness's OUTPUT (distributions across many
runs, not a single pass/fail) is the actual deliverable. Opus's job afterward is sanity-checking those
distributions against baseball priors (is a manager fired too often/rarely, does fan morale swing too
wildly), not re-deriving the dials from scratch.

**CONSTRAINTS:** do NOT flip any Phase-2 flag default live in this ticket — findings become recommended
dial values logged for JK's review, matching the existing §16 convention every prior ticket already left
in place for exactly this pass.

**EXPECTED OUTPUT:** a tuning report per dial-family: current value vs. recommended value vs. rationale.

**VERIFICATION:** L-SIM per kbl-captain STEP 5; full suite.

**FORMAT:** standard + the tuning report as its own doc.

**FAILURE PROTOCOL (STOP-IF):** any dial whose "correct" value genuinely can't be determined without real
win-rate data (the still-deferred win model) — flag it, do not guess a number.

Use xhigh reasoning effort (harness build) / high (Opus interpretation pass).

<!-- ===== END DRAFT CONTRACT: MASS-SIM-DIAL-TUNING ===== -->
