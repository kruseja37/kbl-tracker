# CURRENT_STATE.md — LIVE HEADER

**Last Updated:** 2026-06-14 (T8d COMPLETE — T8d-1/T8d-2/T8d-3 built + audited CONFORMS + committed; T9 next)
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
- **Last completed:** **T8d-3 — Board intelligence overlays** (commit `2738cf5`). Codex 5.5 BUILT →
  Opus 4.8 audit **CONFORMS** → **JK APPROVED** (user-visible, not auto-committed). Three display-only
  overlays on `LeagueBuilderSnakeDraft.tsx`: pick-value chart panel (`pool.pickValueChart` + on-clock pick
  value) + advisory trade-validator panel (`validateTrade`, try/catch friendly out-of-range, no
  persistence per Q7) + on-demand per-candidate cross-team solvency chips (`assessSolvency` across all
  teams, §7.3 "green for one team, red for another"). Closes the last 2 T8a engine orphans
  (`derivePickValueChart` output + `validateTrade` now have UI consumers). Independently re-verified: tsc 0
  / build 0 / suite 7,210 (only the 3 characterized fails) / diff = 2 files / do-not-touch byte-unchanged /
  DB still 7 / no R9/R12 / IV display stays pool.iv (L2). BROWSER-PENDING. **→ T8d COMPLETE.**
  (T8d-1 `9f94412` + T8d-2 `2a5cd95` + T8a/T8b/T8c + T6/T7-stack — all CONFORMS — COMMITTED.)
- **T8d-2 — MLB snake-draft board shell + draft-session persistence** (commit `2a5cd95`). Codex 5.5 BUILT → Opus 4.8 audit **CONFORMS** → **JK APPROVED** (persistence + user-visible,
  not auto-committed). New `LeagueBuilderSnakeDraft.tsx` board at a NEW route `/league-builder/snake-draft`
  + new "MLB DRAFT" tile (existing farm-draft tile relabeled "Farm prospect draft"; farm draft UNTOUCHED).
  Drafts 22-man rosters from the league RegisteredPool; per-candidate solvency via T8d-1 `assessSolvency`
  (rosterSize 22, budget=tierCap, identity-shifted caps); GREEN/YELLOW/RED/BLOCKED signal + BLOCKED disables
  confirm; user-arranged snake order (`buildSnakeOrder`). **Persistence: kbl-league-builder v6→v7 ADDITIVE**
  — new `mlbDraftSessions` store (keyPath id, leagueId index) + `LeagueBuilderMlbDraftSession` + CRUD +
  sync/backup collateral; **DB_VERSION 7 is the only version change** (migration test seeds raw v6 → proves
  all 9 prior stores + data survive). Each confirmed pick does the **dual-write** (`mlbRoster` append +
  `leagueAssignments rosterStatus:'MLB'`) satisfying the 22+10 handoff. `toConstructionPlayer` adapter added
  (hook layer; engine pure). Independently re-verified: tsc 0 / build 0 / full suite 7,206 (only the 3
  characterized fails) / all do-not-touch incl. the farm draft + handoff BYTE-UNCHANGED. BROWSER-PENDING.
  (T8d-1 `9f94412` + T8a/T8b/T8c + T6/T7-stack — all CONFORMS — COMMITTED.)
- **NEXT TASK: T9** — in-game substitution recommendations (governed by the no-oracle-leak principle,
  DECISIONS_LOG 2026-06-14; "cite in T9"). NOT yet mapped/scoped. Captain to MAP it (focused workflow over
  the in-game decision surfaces + the engines it consumes — effectiveRatings, leverage/WPA, mojo/fitness)
  + propose a split + surface scope decisions to JK BEFORE drafting any build contract, same discipline as
  T8d. ROUTE Codex 5.5 | very high → Opus audit. Then **T10** (Lineup Delta WPA) → D0. **T8d-stack DEFERRED
  fast-follows (tracked):** R9 scout-obscured farm IV-range (needs `scoutNoiseBase` 0.6; resolves the
  scoutedGrade-vs-IV-range model collision) + R12 chemistry potency overlay (needs SMB4 count→tier
  thresholds + a `potencyTier(p,team)` resolver). Maps: `T8d_SCOPE_MAP.md`, `T8_SCOPE_MAP.md`.
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

7,210 tests / 390 files (T8d-3 +4; T8d-2 +7 / +2; T8d-1 +10; T8c +1; T8b +8 / +1; T8a +9 / +1; T7c +7 / +1;
T7b +4; T7a +8 / +1; T6 +12; prior baseline 7,140 / 383). Characterized set (a new RED outside
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
5. **T7c** salary ledger: calling up a prospect applies rookie-scale salary (0.50×,
   replacing age factor); sending down a player applies dead-money capCharge; the
   ledger persists per season and resets at offseason Phase 3 (fresh scope). No
   double-discount; re-call-up doesn't stack.
6. **T8b** League Builder tier + balanceMode selectors persist on the league (create/edit form);
   the "Register Pool" button builds + persists a RegisteredPool that survives reload (shows tier,
   tierCap, player count, surplus warning). An existing pre-T8b league still opens fine (additive
   migration). Backup/restore + sync still round-trip with the new `registeredPools` store.
7. **T8c** Team Identity (Cap) section in the team-edit modal: set band priorities, click Suggest
   (composeIdentity fills the increase stack), manually edit increase/decrease mods, watch the live
   cap-shift % preview update, save + reopen the team → the identity persists. A team with no
   identity opens cleanly.
8. **T8d-2** MLB snake-draft board (new "MLB DRAFT" tile → `/league-builder/snake-draft`): start draft
   (registers pool if needed), snake order advances, per-candidate GREEN/YELLOW/RED/BLOCKED solvency
   signal shows for the team on the clock, BLOCKED disables DRAFT, confirming a pick persists (roster +
   player MLB assignment) and survives reload, 22-per-team completes; the existing farm/prospect draft
   (relabeled "Farm prospect draft") still fills the 10; Franchise Setup handoff accepts the league.
   Backup/restore + sync round-trip with the new `mlbDraftSessions` store. (PERSISTENCE/data-shape →
   prioritized in the batch.)
9. **T8d-3** snake-draft board overlays: the pick-value chart panel renders (+ current pick's value on the
   on-the-clock banner); the trade-validator panel flags balanced vs imbalanced (imbalance % vs 15% band,
   favored side, "advisory — overridable") and shows a friendly message for out-of-range pick numbers; the
   per-candidate "Compare teams" toggle shows a GREEN/YELLOW/RED/BLOCKED chip per league team.

## OPEN PENDING-JK (rolling)

**DEFERRED FUTURE TICKET (T7c spillover, JK 2026-06-14):** capCharge → soft
payroll-expectation baseline → fan-morale consequence. BLOCKED on a declared-budget
design (no `declaredBudget` field/UI exists; v1.1.2 requires declared ≠ realized
spend). The consumer machinery is orphaned (`calculateFanExpectations` 0 callers) /
hard-gated (`fanMoraleMutationAllowed:false`). T7c persisted capCharge + ledgerCapCharge
ready for it. Also deferred: one-click execute-from-rec; deadMoneyRate league presets
(100/75/50) + Setup-Wizard control.
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
