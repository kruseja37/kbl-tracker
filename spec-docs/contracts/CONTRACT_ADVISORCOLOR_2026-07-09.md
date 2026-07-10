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

---

## Builder report — 2026-07-09 (completed after captain rulings)

**Disposition:** COMPLETE in the working tree. No git write command was run. The independent
auditor and JK's browser acceptance remain the captain's next gates.

### Step-0 connector ground truth used

- Reused `callClaudeMessages` from
  `src/src_figma/app/engines/reporter/claudeClient.ts:90-127`; it invokes the existing
  `claude-column` Edge Function at `claudeClient.ts:101-112`.
- Reused the pure-adapter / injected-emission split already documented in the Step-0 report above.
  The new pure adapter is `src/engines/auctionAdvisorColor.ts:82-230`; the optional emission seam is
  `src/src_figma/app/engines/reporter/auctionAdvisorColorEmission.ts:28-56`.
- Added the single ruled per-feature gate `isAuctionAdvisorColorEnabled`, default ON, through the
  existing Phase-2 activation pattern at `src/utils/franchisePhase2Flags.ts:146-161` and
  `src/utils/franchisePhase2Activation.ts:7-39`. Existing L12/L13 gates and
  `SeasonEmissionConfig` are untouched.
- The advisor emission seam passes model `claude-haiku-4-5` at
  `auctionAdvisorColorEmission.ts:9,38`. The reporter's `claude-sonnet-4-6` call is untouched.

### Per-item disposition

1. **PRE-DRAFT BRIEF — complete.** Each human seat's first pre-lot privacy reveal queues exactly
   one session-cached brief. Facts use the seat's saved top-five board order, identity name,
   current pool position counts, and the existing legal position-supply-floor arithmetic. A
   deterministic template appears immediately and may be replaced only by validated connector
   output (`LeagueBuilderAuctionDraft.tsx:1109-1158,1195-1203`).
2. **POST-LOT REACTION — complete.** Each seat gets at most one cached reaction per result/lot when
   it won a top-five target, a rival won its top-five target, or a top-three target otherwise left
   the board. Calls start asynchronously after the result and never add a loading state or delay a
   bid/advance path (`auctionAdvisorColor.ts:119-177`;
   `LeagueBuilderAuctionDraft.tsx:1159-1193`).
3. **DRAFT RECAP — complete.** The handoff check provides separately covered reveal buttons for
   every human seat. The deterministic adapter supplies seats filled, spend versus starting
   budget, tax bill, targets landed/lost, and the locked grade. With no saved targets, a legal
   roster receives a neutral C instead of a fabricated board judgment
   (`auctionAdvisorColor.ts:170-230`; `AuctionStage.tsx:619-696`).
4. **Privacy/cache/fallback — complete.** Regular moments render only after the acting seat's
   existing privacy reveal; handoff recaps are independently covered per seat. Switching seats
   removes the prior seat's content before paint. Cache keys include draft, seat, moment, and lot
   where applicable; there are no retries or persistence writes. Old in-flight responses are
   discarded after a draft reset (`LeagueBuilderAuctionDraft.tsx:931-968`). Gate-off, missing
   connector, call error, or validation rejection all render the deterministic template.

### Red-team validation proof

- RED first: `NODE_ENV= npx vitest run src/engines/__tests__/auctionAdvisorColor.test.ts` failed
  before implementation because `../auctionAdvisorColor` did not exist (1 failed suite, 0 tests).
- GREEN after implementation: the adapter/validator file passes 8/8 tests. The invented
  `$987,654` case and invented `Mystery Slugger` case both reject to the deterministic fallback;
  normalized numeric comparison, known-entity checks, title-case invented-name rejection, and
  locked recap-grade validation are covered.
- Emission tests pass 4/4: default-ON/override gate behavior, gate-off fallback, one failed call
  with no retry, and the exact Haiku model string with clean verbatim output.
- UI tests prove covered-by-default behavior, no different-seat fetch-result flash, independent
  handoff recap reveals, and one connector call when the same moment is revealed repeatedly.

### Gate outputs on the final tree

1. `npx tsc -b --pretty false` — PASS, exit 0, no diagnostics.
2. `npm run build` — PASS, exit 0; 2,647 modules transformed; Vite built in 9.93s. Existing chunk
   size/dynamic-import and stale Browserslist warnings only.
3. Focused contract gate — PASS, 6 files / 132 tests:
   `auctionAdvisorColor`, `auctionAdvisorColorEmission`, `franchisePhase2Activation`,
   `WhisperPanel`, `AuctionStage`, and `LeagueBuilderAuctionDraft`.
4. Final `NODE_ENV= npx vitest run` — PASS, exit 0: 617 files passed / 7 skipped;
   9,497 tests passed / 11 skipped; zero red; duration 215.70s.
5. `git diff --check` — PASS, no whitespace errors.

### Changed paths and scope check

- Product: `src/engines/auctionAdvisorColor.ts`;
  `src/src_figma/app/engines/reporter/auctionAdvisorColorEmission.ts`;
  `src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx`;
  `src/src_figma/app/components/auction/AuctionStage.tsx`;
  `src/utils/franchisePhase2Activation.ts`; `src/utils/franchisePhase2Flags.ts`.
- Tests: `src/engines/__tests__/auctionAdvisorColor.test.ts`;
  `src/src_figma/__tests__/reporter/auctionAdvisorColorEmission.test.ts`;
  `src/src_figma/app/components/auction/__tests__/AuctionStage.test.tsx`;
  `src/src_figma/__tests__/pages/LeagueBuilderAuctionDraft.test.tsx`.
- Report: this contract only. No roadmap update needed; this isolated auction lane does not change
  the Mode-2 roadmap state.
- Pre-existing untracked `dispatch-prompt.txt` remains untouched. No whisper decision math/copy,
  CPU behavior, VOICE behavior, existing PRIVACY rules, reporter behavior, persistence store, or
  other spec-doc was changed.

### STOP items / residual gates

- STOP items: none.
- Residual gates: independent opus audit and JK browser acceptance. Live Supabase acceptance of
  `claude-haiku-4-5` is intentionally fail-soft per the captain ruling; rejection renders the
  template and does not block the auction.

---

## Captain rework ruling after audit REJECT (2026-07-09) — R2
The audit proved the token-membership gate leaks four fabrication classes (number-words, prose
verdicts, single-token invented names, mis-attached real numbers). Ruling: stop trying to
validate facts in LLM prose — FORBID fact-shaped content entirely. The deterministic template
line already carries every number; the LLM supplies personality only.
1. **Zero numbers, any form:** reject LLM output containing ANY digit, ANY number-word
   (zero…ninety, hundred, thousand, million, grand, dozen, k/M suffixes, ordinals like
   "first/tenth" EXCEPT board-rank ordinals only when the exact ordinal appears in facts), or
   currency symbols. This kills digit fabrications, word fabrications, AND mis-attachment (a
   number that cannot be said cannot be mis-attached).
2. **Names:** only names present in the facts payload — extend the invented-name check to
   single-token capitalized candidates (whitelist: facts-payload tokens, sentence-initial
   common words, and a small fixed list of baseball common nouns). When in doubt, reject.
3. **Verdict language:** reject any grade/tier letter pattern (Grade X, X-tier, "an A") and a
   curated evaluative-superlative list (best/worst/greatest/all-time/elite/steal-of-the-draft
   class terms) UNLESS the term appears verbatim in the facts payload (the adapter includes
   the deterministic grade's own descriptor words there).
4. **Prompt side:** instruct the model explicitly: no numbers in any form, no names beyond
   those provided, no grades or rankings — personality and color only. (Prompt is guidance;
   the validator is the guarantee.)
5. **Red-team tests FIRST, again:** before touching the validator, add failing tests for all
   four audit-proven bypasses (the exact strings from the audit: "nearly ninety thousand…",
   "an A-tier, all-time haul…", "…chase Rodriguez instead of…", "…for $100,000, a steal") —
   prove they currently PASS the gate (red), then flip them to REJECTED (green). Keep every
   existing test green; the four bypass strings must render the TEMPLATE fallback.
6. Scope: all changes local to the validator + prompt text + tests (auctionAdvisorColor.ts,
   the emission prompt, test files). No wiring changes. Gates unchanged (incl. one full
   vitest).

---

## Builder report — 2026-07-09 (R2 audit rework)

**Disposition:** COMPLETE in the working tree. No git write command was run. Changes are limited
to the validator, advisor emission prompt, their two test files, and this appended report. No
wiring, privacy, cache, connector, model, fallback-template, or auction behavior changed.

### Red-team-first proof

Before changing validator or prompt behavior, the four audit-proven bypass regressions were added
to `src/engines/__tests__/auctionAdvisorColor.test.ts` and run with:

`NODE_ENV= npx vitest run src/engines/__tests__/auctionAdvisorColor.test.ts`

The required RED was reproduced: 1 failed file; 4 failed / 8 passed tests. Each new assertion
received `{ source: 'llm', rejected: false }`, proving the old gate accepted all four bypasses:

1. `Page Caps can spend nearly ninety thousand and still control the room.`
2. `Page Caps assembled an A-tier, all-time haul around Avery Anchor.`
3. `Page Caps should chase Rodriguez instead of Avery Anchor.`
4. `Avery Anchor landed for $100,000, a steal.` — the recap facts contained `$100,000` as the
   starting budget, proving a real fact number could be attached to a fabricated claim.

### R2 implementation

- **Zero numbers:** LLM text now rejects any digit, Unicode currency symbol, cardinal number-word
  from zero through ninety plus magnitude/colloquial terms, and ordinal number-word. Hyphenated
  number-words are split and checked. The sole ordinal exception requires that exact ordinal to
  occur in the facts payload; direct tests prove exact `first` passes while absent `second` fails.
- **Hardened names:** capitalized-token validation now includes single-token candidates. Allowed
  tokens come from the facts payload, plus a small fixed baseball-common-noun set and a small
  sentence-initial common-word set. The single-token `Rodriguez` bypass now rejects.
- **Verdict language:** grade-letter, tier-letter, and article-plus-grade patterns always reject.
  Curated evaluative/superlative terms (including `all-time`, `elite`, and `steal`) reject unless
  the exact term appears in facts. The exception has a direct positive test.
- **Prompt:** the system prompt now explicitly forbids digits, number-words, ordinals, currency,
  unprovided names, grades, tiers, rankings, verdicts, and evaluative superlatives; it requests
  personality/baseball color only. The inherited numeric response-length phrase was removed so the
  guidance does not contradict itself. The emission test inspects the sent system prompt.
- Every rejected output continues to render the deterministic template fallback.

### Green proof and gates

1. Hardened validator + emission seam: PASS — 2 files / 19 tests.
2. `npx tsc -b --pretty false`: PASS, exit 0, no diagnostics. The first attempt was blocked before
   code validation by `ENOSPC` while writing temporary build info; disposable build/test caches
   were cleared and the unchanged command then passed.
3. `npm run build`: PASS, exit 0; 2,647 modules transformed; Vite built in 9.99s. Existing stale
   Browserslist, dynamic/static import, and chunk-size warnings only.
4. Focused contract gate: PASS — 6 files / 139 tests (`auctionAdvisorColor`,
   `auctionAdvisorColorEmission`, `franchisePhase2Activation`, `WhisperPanel`, `AuctionStage`, and
   `LeagueBuilderAuctionDraft`).
5. Full `NODE_ENV= npx vitest run`: PASS, exit 0 — 617 files passed / 7 skipped; 9,504 tests passed /
   11 skipped; zero failed files; duration 216.42s.
6. `git diff --check`: PASS, no whitespace errors.

### Changed paths / scope check

- `src/engines/auctionAdvisorColor.ts`
- `src/engines/__tests__/auctionAdvisorColor.test.ts`
- `src/src_figma/app/engines/reporter/auctionAdvisorColorEmission.ts`
- `src/src_figma/__tests__/reporter/auctionAdvisorColorEmission.test.ts`
- `spec-docs/contracts/CONTRACT_ADVISORCOLOR_2026-07-09.md` (this report only)

STOP items: none. Independent re-audit and JK acceptance remain external gates.
