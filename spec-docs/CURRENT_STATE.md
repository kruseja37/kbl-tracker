# CURRENT_STATE.md — LIVE HEADER

**Last Updated:** 2026-06-14 (AI-team setup reconciled + CURRENT_STATE split)
**Branch:** codex/franchise-v1-next

> This file is the LIVE status header — the thing every session-start reads.
> Rewrite it in place each session (do not append). Full arc-by-arc history
> lives in `CURRENT_STATE_HISTORY.md`. Roles/routing/loops live in
> `AI_TEAM_OPERATING_MODEL.md`. Non-negotiable rules live in `SESSION_RULES.md`.

---

## RIGHT NOW

- **Phase:** T-stack execution. Sequencing ruling F-141 holds: the full T-stack
  runs to completion as pure execution, THEN D0 cut line → D1–D8 → F-138 →
  flag flip → iPad playtest exit gate.
- **Last completed:** **T7b — call-up/send-down recommendations (advisory,
  leak-safe)** LIVE. Codex 5.5 | very high BUILT → Opus 4.8 audit **CONFORMS**.
  `recommendRosterMoves` (added to rosterAnalyzer.ts) ranks MLB surplus (TV2
  `valueDelta`, KNOWN) vs farm scout-visible surplus (`scoutedGrade` only,
  UNCERTAIN) — leak-safe per **R-T7b-LEAK** (the no-oracle-leak ruling,
  DECISIONS_LOG); the 4 stubbed emitters unblocked to read_only advice; the
  adapter computes real send-down eligibility + strips hidden-farm ratings.
  **No execution, no ledger (R-T7b-ADVISORY).** Independently re-verified: tsc 0 /
  build 0 / suite 7,164 (3 characterized fails) / golden+SMB4 byte-unchanged /
  **leak test PROVEN** (true ratings inert, scoutedGrade drives, justification
  leak-free). 1 LOW (ROOKIE_SCALE_FACTOR dup → reconcile in T7c). BROWSER-PENDING.
  **COMMITTED.** (T6, T7a — audit CONFORMS — also COMMITTED.)
- **NEXT TASK: T7c — Season Salary Ledger (§8.4).** ⚠️ **CAPTAIN PAUSES HERE** for
  JK persistence-design rulings BEFORE drafting: new IndexedDB store via
  `trackerDb` v14→15 (the v-conflict-hang landmine — only `trackerDb.ts` may open
  `kbl-tracker`); `LedgerEntry`/`LedgerStatus` state machine (first call-up →
  active; demotion → deadMoney at `deadMoneyRate`; re-call-up → active, no
  stacking); `rookieScaleActive` producer (flip on call-up; replaces age factor,
  no double-discount); `capCharge` → soft payroll-expectation baseline (anchored to
  DECLARED budget); ledger resets at offseason Phase 3; `deadMoneyRate` league-
  config (presets 100/75/50). Also single-source the ROOKIE_SCALE_FACTOR dup. ROUTE
  Codex 5.5 | very high → Opus audit (persistence/migration audit NON-NEGOTIABLE).
  Then **T8** (Mode 1 suite), T9, T10 → D0.
- **STANDING MODE (JK 2026-06-14):** per ticket = build → independent ENGINEERING
  audit → auto-commit verified-complete (browser-pending) → proceed. Captain
  surfaces only the audit verdict, the browser backlog, and genuine scope/design/
  asset decisions when drafting each contract. Browser sign-off BATCHED (see
  BROWSER-VERIFY), never waived; clears before D0.
- **FINDING-148 (JK-gated, non-T-stack):** base AUX_PRICING L/R premium gap
  (switch>left>right; lefty missing; T1 contract-scope gap). Touches FROZEN base-IV
  → oracle regen + golden re-validation required. JK to sequence; do NOT
  auto-insert. ROUTE Codex 5.5 | high → Opus audit.

## SUITE BASELINE

7,164 tests / 385 files (T7b added 4 tests, no new file; T7a +8 / +1 file;
T6 +12; prior baseline 7,140 / 383). Characterized set (a new RED outside
this set is a real regression): fixed failures wpaRuntimeBoundary +
franchiseNarrativeEventEligibility; conditional-solo order-flakes
franchiseManualSmokeFixture + GameTrackerLaunchState +
franchiseOffseasonGuards.component (each passes solo).
**CLI:** prefix `NODE_ENV= `; node at `~/.nvm/versions/node/v20.20.0/bin`.

## BROWSER-VERIFY OUTSTANDING (JK)

> BATCHED per the SESSION_RULES pen (JK 2026-06-14) — cleared in one pass before
> the D0 / flag-flip / playtest gate; persistence/data-shape items prioritized.
> Engineering audits already passed per ticket; these verify experience/feel.

1. EP1 effective-position pooling on real franchise data — does a position-
   shifting player get repooled; do bench players land in Reserve.
2. TV2 TeamHub projected badges — dotted "Proj.", post-game recalc, fewer
   early-season badges is CORRECT (below-floor = no holder).
3. **T7a** optimal-lineup recommendations now score by IV-of-effectiveRatings
   (was raw heuristic) — verify vs-RHP / vs-LHP lineups look sensible on real
   franchise data, and one-button RECALC produces a coherent lineup + defensive
   arrangement (low-glove players kept off high-traffic spots).
4. **T7b** call-up/send-down advisory recs render in the analyzer panel — ranked,
   read-only, leak-safe (no hidden prospect ratings/true IV shown; "projects as a
   positive-surplus replacement" + scout-confidence label); a low-cost high-surplus
   prospect surfaces over a high-cost MLB underperformer.

## OPEN PENDING-JK (rolling)

**FINDING-148** (base AUX_PRICING L/R batter premium gap — new JK-gated ticket;
sequence vs T-stack; regen frozen oracle). **T6 + T7a: COMMITTED** (audit CONFORMS,
flags ratified; T7a browser-pending). Standing auto-commit mode adopted (JK
2026-06-14) — Captain commits verified-complete tickets + proceeds, browser tests
batched.
F-144 (salary-path R-6 residue) + F-145 (designation 'active' vocabulary) +
F-147 (stale peerPoolLimitation written live) → taxonomy/spec-cleanup batch
(with R-6/R-8/§17.8 blocks). MINOR #3 builder-reporting → now ratified into
SESSION_RULES. Stray reference-docs/Super Mega Baseball 4 Rosters.csv
(commit or gitignore). ASG WPA→Fame; Signature Moment card line; fame tier
names; F2 SOT typos (~15); F4 FA trait spellings (4); order-flake root-cause
(3 members).

## RECENT NON-PRODUCT CHANGE (2026-06-14)

AI-team operating setup added + reconciled: AGENTS.md bridge,
AI_TEAM_OPERATING_MODEL.md, .codex/config.toml, 31 mirrored Codex skills.
CLAUDE.md session-start corrected to the canonical 5-file ritual and stale
facts fixed (useGameState ~12,585 lines; suite count now points here, not
hardcoded). Browser-verification gate (Codex pre-checks, JK signs off) and the
Lessons-Learned pending-ratification pen are canon. CURRENT_STATE split into
this live header + CURRENT_STATE_HISTORY.md. Docs/config only — no app code.

Also added + verified: copy-based skill sync (.claude/skills + spec-docs/skills
→ .agents/skills) with a Claude Code PostToolUse hook (stdin/jq) — auto-fire and
delete-propagation both verified live; codex-ideation skill (Claude consults
Codex CLI as a READ-ONLY peer reviewer; round-trip + resume loop verified;
sandbox pinned read-only on all paths). Codex CLI installed (codex-cli 0.139.0,
~/.local/bin/codex).

## NEXT NON-PRODUCT BUILD (queued, next thread) — opus-audit wrapper

**Goal:** an `opus-audit` wrapper (sibling to codex-ideation) that lets a Claude
Code session INVOKE Opus 4.8 as the read-only auditor of a Codex build and
capture its verdict WITHOUT JK relaying text by hand. Opus stands in because
Fable is currently unavailable; if Fable returns, update the wrapper to target
it. Triangle preserved: auditor (Opus) ≠ builder (Codex); neither self-audits.

**PRE-BUILD UNKNOWN to resolve first (do not assume):** how is Opus 4.8
invokable as a CLI on this machine? codex-ideation works because a `codex`
binary exists; verify the equivalent entry point for Opus (likely the `claude`
CLI in a fresh non-Captain session, or another binary) BEFORE building. Same
diligence that caught the codex-install gap.

**JK RULING 2026-06-14 — risk-scoped audit automation (this is the wrapper's
contract):** Autonomous build↔audit↔fix loops ARE permitted, BUT the loop must
HALT and surface to JK (not auto-proceed) whenever a change touches ANY of:
(a) specs / gospel / design decisions; (b) user-visible behavior (anything that
changes what a player sees or how the app behaves); (c) persistence or data
integrity (storage, migrations, schema, saved-game shape); (d) the
SMB4-asset-protected systems (mojo, fitness, chemistry, fame, clutch, narrative,
etc. — the existing approval-gated list in SESSION_RULES); (e) anything the
auditor flags as a judgment call rather than a mechanical fix. BELOW that line
(internal refactors, test/type fixes, dead-code removal, wiring bugs with no
behavior change) the Codex↔Opus loop runs to verified-complete and JK sees the
RESULT once, not the chain. Rationale: the decorrelated two-AI loop does the
engineering verification; JK's irreplaceable judgment is classifying when an
"engineering fix" has crossed into a DESIGN/behavior decision — so the loop must
stop AT that boundary, not barrel through it. This maps onto the existing
risk-tiering (very-high reasoning for engine/state; medium for scoped fixes).
Weak point to engineer carefully: the auditor's self-classification must be
STRICT about calling behavior/spec touches → halt; over-halting is the safe
direction, under-halting is a bug to fix immediately. Watch the first loops
closely before trusting unattended. "Verified complete" still ≠ "JK approved" —
JK's browser pass remains the close even for low-risk auto-loops.

**Also queued for that thread:** add the risk-scoped rule above to
SESSION_RULES.md as a ratified non-negotiable (JK already ruled it 2026-06-14;
write it in on build).
