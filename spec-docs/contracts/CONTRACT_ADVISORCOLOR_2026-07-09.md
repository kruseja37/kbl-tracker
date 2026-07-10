# CONTRACT — ADVISORCOLOR lane (2026-07-09)

**Builder:** Codex (medium). **Auditor:** independent opus agent (not you). **Captain:** Fable.
**Branch:** codex/advisorcolor-2026-07-09 (this clone). Base: main @ 19ee7609 (post-STAKES).
**Binding design:** spec-docs/AUCTION_WALKTHROUGH_WAVE_2026-07-09.md §5 (in this tree) — this
contract restates it; the doc governs on any ambiguity. UNKNOWNs = STOP-and-report.
**Git discipline:** your sandbox cannot write .git — run NO git write command. The captain
committed this contract and cuts the commits from your finished working tree. Leave every file
in place; do not clean up. Do not edit any spec-doc other than APPENDING your report here.

## JK's ruling
Use the app's existing LLM connector (the beat-reporter one, lowest-cost model) to give the
Asst GM personality — but ONLY at low-frequency, latency-tolerant moments. The live bid-to-bid
decision surfaces stay deterministic and are NOT touched by this lane.

## Step 0 — resolve the connector ground truth (in-lane, before building)
Read the beat-reporter emission seam and record in your report, with file:line: the connector
module/API the reporter uses for LLM calls, the gate flag/setting that enables LLM emission,
and the adapter/emission split pattern it follows. REUSE all three verbatim — no second
connector, no new flag. If the reporter's pattern materially differs from this contract's
assumptions (e.g., there is no callable connector, or the gate is per-feature rather than
global), STOP-and-report instead of adapting.

## Build — three moments, one pattern each
Pattern per moment (the beat-reporter split): a PURE adapter function (engine/UI-free module)
assembles a FACTS payload (display-ready strings and numbers already computed by existing
engines — the adapter computes nothing new); the emission seam optionally dresses it via the
LLM; a deterministic TEMPLATE fallback renders when the gate is off, the call fails, or
validation rejects. The moments:
1. **PRE-DRAFT BRIEF** — once per human seat, on that seat's FIRST reveal (the PRIVACY reveal
   that just merged) before lot one: the advisor's read of the pool vs this seat's board and
   identity. Facts available: pool position counts, the seat's top board targets, identity/
   archetype name, scarce positions (existing supply-floor arithmetic).
2. **POST-LOT REACTION** — async, ≤1 per lot, significant lots only: (a) this seat won a
   top-5 board target; (b) a rival won one of this seat's top-5 targets; (c) one of the seat's
   top-3 targets left the board. Renders when ready or not at all — NEVER blocks or delays
   bidding; no loading states on the hot path.
3. **DRAFT RECAP** — at the handoff check: seats filled, spend vs budget, tax bill, targets
   landed/lost — the advisor's honest grade (grade computed by a deterministic rule in the
   adapter, e.g. surplus-vs-board banding; the LLM dresses it, never assigns it).

## Hard rules (each one gets a test)
- **The LLM never generates or transforms a number, a name, or a verdict.** The prompt
  instructs verbatim use of payload facts; a POST-VALIDATION gate scans the output — any
  dollar figure or player/team name NOT present in the facts payload → discard, render the
  template fallback. (Numbers compared normalized: $1,234 == 1234.)
- All three moments render inside the PRIVACY reveal only (covered = nothing, including no
  fetch-result flash on reveal of a different seat).
- Gate off / connector absent / call error → template fallback renders; the feature is fully
  usable LLM-free.
- One call per (moment, lot id / draft id), cached in session state; no retries on the render
  path; no persistence beyond the session.
- No changes to: whisper decision surfaces, CPU behavior, VOICE copy, PRIVACY gating, the
  reporter's own emission behavior.

## Repro-first
This is additive (no existing behavior changes), so repro-first = the validation gate proven
red-team-first: write the hallucination test (LLM output containing an invented $ figure and
an invented player name) BEFORE wiring the emission, prove the gate rejects both and the
fallback renders. Record the run in your report.

## Tests
Adapter pure-unit tests per moment (facts payload correctness from fixture state); validation
gate (hallucinated number → fallback; hallucinated name → fallback; verbatim-clean output →
passes); significance triggers (each of the three reaction conditions fires, a routine lot
does not); template fallbacks render gate-off. NEVER snapshot LLM text.

## Gates
1. npx tsc -b → clean
2. npm run build → exit 0
3. Suites: the new adapter/gate test files + WhisperPanel + AuctionStage +
   LeagueBuilderAuctionDraft → green
4. ONE full NODE_ENV= npx vitest run → any new red = fix or STOP. Known solo-rerun flakes:
   AwardsWatchlist, franchiseManualSmokeFixture, GameTrackerLaunchState.

## Report
APPEND to this file: Step-0 connector ground truth (file:line), per-item disposition, the
red-team validation proof, gate outputs, STOP items. Working tree stays dirty for the captain.

---

## Builder report — 2026-07-09 (Step 0 STOP)

**Disposition:** STOPPED at Step 0 before tests or implementation. The live reporter pattern
materially differs from the contract assumptions, so no adaptation was attempted.

### Step-0 connector ground truth

- The adapter/emission reporter seam calls `callClaudeMessages` from
  `src/src_figma/app/engines/reporter/claudeClient.ts` through
  `src/src_figma/app/engines/reporter/seasonNewsGenerator.ts:147-170`. The generator hardcodes
  model `claude-sonnet-4-6` at `seasonNewsGenerator.ts:161-170`.
- `callClaudeMessages` invokes the Supabase Edge Function `claude-column` at
  `src/src_figma/app/engines/reporter/claudeClient.ts:90-112`. This is the callable connector
  used by the season-news reporter seam. The code does not identify it as a lowest-cost model.
- LLM emission does not have one reusable global reporter gate. Honor emission is gated first
  by the feature-specific `isFranchisePhase2L12Enabled()` and then by the per-event season
  emission configuration at
  `src/src_figma/app/engines/reporter/franchiseHonorEmission.ts:20-35`. Relationship-flare
  emission independently uses `isFranchisePhase2L13Enabled()` and the same per-event config
  pattern at
  `src/src_figma/app/engines/reporter/franchiseRelationshipFlareEmission.ts:66-75`.
  The persisted setting is `SeasonEmissionConfig.marqueeOnly/perEventRate`, with conservative
  defaults at `src/utils/seasonEmissionConfigStorage.ts:5-16` and loading at
  `seasonEmissionConfigStorage.ts:44-58`.
- The adapter/emission split itself matches the expected shape: the pure award adapter builds a
  deterministic `SeasonNewsEvent` at
  `src/src_figma/app/engines/reporter/franchiseL12AwardNewsAdapter.ts:33-68`; the honor emission
  seam injects config/storage/reporter/generation dependencies at
  `src/src_figma/app/engines/reporter/franchiseHonorEmission.ts:8-15`, performs gates and dedupe,
  calls the generator, then persists at `franchiseHonorEmission.ts:20-52`.

### STOP items

1. The contract requires reuse of "the gate flag/setting" and explicitly names a per-feature
   rather than global gate as a material-divergence example. Live code has both per-feature
   Phase-2 gates and per-event emission settings; there is no single global gate to reuse
   verbatim for all three draft moments.
2. The binding ruling says to use the beat-reporter connector's "lowest-cost model," while the
   matching adapter/emission seam hardcodes `claude-sonnet-4-6`. The repository provides no
   grounded instruction authorizing a different model or declaring this model the intended
   lowest-cost choice.

### Per-item disposition and verification

- PRE-DRAFT BRIEF: not started (Step-0 STOP).
- POST-LOT REACTION: not started (Step-0 STOP).
- DRAFT RECAP: not started (Step-0 STOP).
- Red-team validation proof: not run; contract requires Step 0 to stop before building when the
  connector/gate assumptions diverge.
- Typecheck/build/named suites/full Vitest: not run; no implementation was made.
- Changed paths from this builder: 1 — this contract report only. Pre-existing untracked
  `dispatch-prompt.txt` was observed and left untouched.

---

## Captain rulings on the Step-0 STOP (2026-07-09) — contract amended, build authorized
Both STOP items are ruled; the Step-0 ground truth above is accepted as the binding reality.
1. **Gate (supersedes "no new flag"):** there is no global reporter gate to reuse — so create
   ONE new per-feature gate for this lane, `isAuctionAdvisorColorEnabled`, following the exact
   pattern of the existing per-feature emission gates (the Phase-2 flag pattern found in
   Step 0). Default **ON** (JK ordered the feature; the template fallback makes gate-on safe
   even with no connector reachable). All three moments share this single gate. Do NOT touch
   the existing L12/L13 gates or the per-event SeasonEmissionConfig (out of scope — the
   moments are already frequency-capped by design).
2. **Model:** reuse `callClaudeMessages` / the `claude-column` connector VERBATIM, but pass
   model `claude-haiku-4-5` for the advisor moments (JK's lowest-cost ruling, now grounded).
   The reporter's own hardcoded model and behavior stay untouched. If the connector rejects
   the model string at runtime, that is a call failure → template fallback (no STOP needed).
Everything else in the contract binds unchanged. Resume at the red-team validation step.
