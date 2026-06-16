# FRANCHISE PLAYABLE V1 — DEFINITION (D0 cut line)

**Created:** 2026-06-15 (D0 scope session — the deliverable F-141 required before the D-stack)
**Status:** PROPOSED — pending JK final ratification. Produced by: Captain re-baseline (6-reader decorrelated
fan-out, every status Captain-verified file:line) + a 3-round Codex peer-review (idea-box) + 4 JK scope
rulings (2026-06-15). On ratification this becomes the canonical cut line that supersedes the candidate
ordering in `KBL_V1_EXECUTION_PLAN.md` (per that doc's 2026-06-12 amendment).
**Branch:** codex/franchise-v1-next.

> **F-141 sequencing context:** the IV/value-spine T-stack (T4→T10) is COMPLETE. This doc is the D0 cut line.
> After D0 ratifies → D-stack (D1–D13) → F-138 (offseason data-source) scoped → offseason flag flips →
> iPad playtest exit gate. Mode 3 / offseason stays OUT of v1.

---

## 1. THE CUT LINE (JK rulings 2026-06-15)

**Playable-V1 = the FULL Phase-1 functional foundation with the advanced systems LIVE (not honest-preview) +
REAL AWARDS computed on the FULL trusted value spine.**

JK expanded the cut line past a minimal "season loop only" thesis. The four ratified rulings:

1. **Make advanced systems LIVE**, not honest read-only previews (salary, value, designations live in the UI).
2. **Real awards in v1**, on the **FULL position-relative True Value / value-delta trust** — JK chose
   "Final True Value trust first" over an award-specific WAR-only policy. This also brings value-delta-gated
   designations into scope.
3. **F-144 = golden-diff-first** (run the salary diff over the affected hitter corpus; inert → safe-close in
   v1; moves-values → a value-design decision JK rules then). It is golden-diff-class (the remap feeds
   `computeIV`'s curve-block selection, `salaryCalculator.ts:722` → `ivEngine.ts:195`, NOT the neutralized
   multiplier), not a cosmetic no-op.
4. **Spray chart = functional-but-provisional accepted for v1** (filters/data live; final visual design stays
   the post-v1 Phase-3 item 3.5).

**Deferred (NOT v1 — → v1.1+ or by standing ruling):** Phase 2 automation (player/fan morale, milestone
wiring, beat reporter) → v1.1; Mode 3 / offseason execution (F-141, offseason flag stays FALSE); Fan Favorite
designation (value-trust unblocks the value half, but it ALSO needs Phase-2 fan/morale → rides v1.1);
Captain / Fan Hopeful / Cornerstone designations (gated on non-value policies — see §3); the standing hard
exclusions (auto-draft, AI sim, generated schedules, fame system, relationship mutation, adaptive park-factor
persistence, custom stadium entry, salary movement / luxury tax / salary matching).

---

## 2. RE-BASELINE VERDICT (verified against code, replacing the stale plan statuses)

The `KBL_V1_EXECUTION_PLAN.md` statuses are stale (e.g. it calls 1.1 "not built" — it is built with 0
hardcoded-162 in src). Current reality:

| Status | Items (file evidence) |
|---|---|
| **DONE** | 1.1 adaptive standards (`franchiseAdaptiveStandards.ts`) · 1.2 salary engine/persistence/payroll (T5/D15, IV-based) · 1.2.5 trust engine for TEAM_MVP/ACE (`franchiseValueInputs.ts` warConsumerTrust, 60/60 tests) · T10 §9 persistence · morale-NOT-wired (correct) |
| **CONFIRM-ONLY** (smoke/browser, no build) | 1.4 farm · 1.5 trade · 1.6 manager-WPA · 1.7 spray (filters) · 1.8 playoffs · the 11-item browser backlog |
| **REAL-BUILD** | 1.2 salary-UI de-gate · True Value/value-delta trust promotion (NEW gate) · 1.3 designations live (dual-path reconcile + DesignationEvent + effects) · 1.8.5 award-trust gate · 1.9 awards (greenfield) · backup parity · F-144 (golden-diff-first) |
| **TRUST-GATED / DEFERRED** | Albatross (→ unblocked by the value-trust gate, lands v1) · Fan Favorite (value + Phase-2 morale → v1.1) · Captain / Fan Hopeful / Cornerstone (non-value policies → deferred) · awards (behind 1.8.5) |

Key seams the re-baseline surfaced (verified):
- **Salary is engine-done but UI-gated:** Team Hub hard-renders `PREVIEW ONLY / READ ONLY / NO SALARY
  MOVEMENT` chips (`TeamHubContent.tsx:4623-4636`) over real numbers (`payrollMatchesRoster` cross-checks).
  1.2-live = surgical UI de-gating of SALARY labels (leave True Value/Expected Wins preview until the value
  gate promotes them).
- **Two live designation paths disagree:** persisted `franchiseDesignations.ts` emits `status:'projected'`
  ('Proj.') while `franchiseDesignationEligibility.ts` emits `status:'active'`/persistable — they can name
  different holders with different words. 1.3-live requires reconciling to ONE canonical path.
- **`DesignationEvent` emission is a hard Phase-1-gate requirement with ZERO implementation.**
- **Awards are greenfield** (`franchiseAwardsEngine.ts` / `franchiseAwardsStorage.ts` / `AwardsWatchlist.tsx`
  absent). The offseason `AwardsCeremonyFlow.tsx` is dead-gated behind `FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED
  = false` and MUST NOT be resurrected by a flag flip — v1 awards are NEW Mode-2 season-end/almanac surfaces.
- **Backup drops 3 live stores:** `backupRestore.ts` pinned at schema v12 omits `franchiseTrueValueRows`
  (v13) / `franchiseDesignationRows` (v14) / `franchiseSeasonLedgerRows` (v15) — silent data loss on
  export/restore. v1 data-integrity gate.

---

## 3. THE D-STACK (D1–D13, dependency-ordered)

Routing: each REAL-BUILD ticket = Codex 5.5 | very high → Opus 4.8 audit (auditor ≠ builder), per the §13
gate (state/persistence/reducers = very high/max; pure engine = high). Each ticket gets its own
map→contract→build→audit→JK-approve cycle (same discipline as the T-stack). Persistence/user-visible tickets
surface to JK before commit; browser sign-off batched.

| # | Ticket | Class | Depends on |
|---|---|---|---|
| **D1** | Adaptive-standards confirm + close the `useSeasonStats.ts:38 DEFAULT_TOTAL_GAMES=162` WAR-scaling hardcode (route totalGames through stored `gamesPerTeam`). Gate: `grep '/ 162' src/` outside the adaptive file = zero. | REAL-BUILD (small) | — |
| **D2** | Backup/restore parity: register `franchiseTrueValueRows`/`franchiseDesignationRows`/`franchiseSeasonLedgerRows` in `backupRestore.ts` mirroring `trackerDb.ts` byte-for-byte; bump the `kbl-tracker` pin 12→15; round-trip migration test + a **structural parity-guard** (registry keys === trackerDb stores) so future stores can't silently drop. | REAL-BUILD | — |
| **D3** | Browser-verify backlog clearance on real franchise data (EP1, TV2, T7a/b/c, T8b/c, T8d-2/3, T9, T10 + farm/trade/WPA/spray/playoffs smoke). JK manual gate; runs in PARALLEL, but the persistence-sensitive items (T8d-2, T10 §9) verify only AFTER D2 lands. | CONFIRM-ONLY | D2 (persistence items only) |
| **D4** | Salary-live UI de-gate — remove the `PREVIEW ONLY / READ ONLY / NO SALARY MOVEMENT` chips on the SALARY surface only; live finance labels; numbers already real. Do NOT touch True Value/Expected Wins preview labels (those wait for D6). + salary-impact preview in trade UI + FA destination weighting. | REAL-BUILD | D1 |
| **D5** | 1.2.5 trust confirm — verify the TEAM_MVP/ACE `warConsumerTrust` contract (engine DONE, 60/60 tests). Confirm-only. | CONFIRM-ONLY | D1 |
| **D6** | **True Value / value-delta TRUST PROMOTION gate (NEW).** Flip `trustedForTrueValue` + `valueDeltaTrustedForDesignations` from literal-false to computed, with the peer-pool audit. D6 PERSISTS/FREEZES a trusted-value artifact (explicit roster/season/stats scope, peer-pool policy, blocked-row reasons, contract version); D7/D8 consume that artifact and never recompute it. **`>=2 MLB peers must BLOCK, not fudge** (no fallback pool unless ratified). Hidden-FARM + score-only rows stay excluded. Frozen-snapshot rule: which roster state, season vs playoff inclusion, when values lock. Re-triggers the D2 backup guard if it changes stored row shape/version. **Boundary: promotes value trust for explicit v1 consumers ONLY — does NOT promote salary movement, morale, relationships, Captain/Fan Hopeful/Cornerstone, Mode 3, or offseason execution.** | REAL-BUILD / GATE | D1, D5 |
| **D7** | 1.3 designations LIVE — reconcile to ONE canonical designation path (Captain rec: persisted path canonical, upgraded to `active` + events; eligibility = its ranking input), promote TEAM_MVP/ACE to live (non-'Proj.') badges, **add Albatross** (unblocked by D6; Fan Favorite NOT — Phase-2 morale gated), emit `DesignationEvent`, wire only explicitly-approved salary-weighting + FA-destination effects. Regression: DesignationEvent emission produces NO morale mutation. | REAL-BUILD | D2, D6 |
| **D8** | 1.8.5 award-trust gate — the make-or-break gate. A WRITTEN award-trust contract + tests: promote `trustedForAwards`/`finalWarTrusted` to computed booleans consuming D6's frozen value artifact; award-specific milestone weighting + adaptive award thresholds via `scaledThreshold()` (no hardcoded 162/9); score-only + hidden-FARM exclusion; deterministic stored winners. NOT a boolean flip. | GATE (REAL-BUILD) | D1, D6, D7 |
| **D9** | 1.9 real awards — internally split: (a) award-value policy on the trusted spine → (b) `franchiseAwardsEngine.ts` (6 categories: MVP/Cy Young/RoY/Gold Glove/Silver Slugger/Mgr of Year) + `franchiseAwardsStorage.ts` (new store, trackerDb v16 migration REGISTERED in backupRestore) → (c) `AwardsWatchlist.tsx` + per-game recompute → (d) season-end finalize + franchise history + profile/Almanac display. New Mode-2 surfaces; do NOT flip the offseason flag. | REAL-BUILD | D8 |
| **D10** | 1.10 handoff — finalize the Mode-2 season summary/manifest now WITH awards + active designations (was the no-awards 1.10A stopgap). | REAL-BUILD | D2, D7, D9 |
| **D11** | UI live-label sweep — remove remaining preview/READ-ONLY vocabulary across the now-promoted surfaces (salary, True Value/Expected Wins [value trust promoted in D6], designations, awards). Spray stays functional-but-provisional. Minimal/cosmetic. | CONFIRM-ONLY | D4, D6, D7, D9, D10 |
| **D12** | Full Phase-1 manual smoke (iPad) — the gap-analysis Final Checklist on real local franchise state: salary/designations/trades/farm/WPA/spray/playoffs/awards/summary all live; zero hardcoded-162; all three typed events emitted, no phantom morale. | CONFIRM-ONLY | D3, D11 |
| **D13** | Playable-V1 approval — JK's explicit sign-off that the expanded cut line is met. Sole real-world acceptance gate. | CONFIRM-ONLY | D12 |
| → | THEN: F-138 (offseason data-source) scoped → offseason flag flip → iPad playtest exit gate. | — | D13 |

---

## 4. RESOLVED SCOPE RULINGS (the forks)

| Fork | JK ruling | Notes / Codex cross-review |
|---|---|---|
| Cut line | EXPAND — advanced systems LIVE + real awards | not the minimal season-loop thesis |
| Phase 2 automation | DEFERRED to v1.1 | events already emitted in Phase 1; v1.1 consumes them |
| Awards value basis | **Final True Value trust first** (not award-specific WAR-only) | unblocks Albatross; Fan Favorite still needs Phase-2 morale (→ v1.1); Captain/Fan Hopeful/Cornerstone non-value-gated (deferred) |
| F-144 | **golden-diff-first**, then close or defer per the diff | golden-diff-class (feeds `computeIV` curve-block), not a no-op; both Codex + Captain traced this independently |
| Spray chart | **functional-but-provisional accepted for v1** | visual polish = post-v1 Phase-3 3.5 |
| Backup parity (Captain rec, proceed-unless-vetoed) | standalone early ticket (D2) + structural parity-guard | already carved as separate in CURRENT_STATE; guard is cheap silent-drop insurance |
| Designation canonical path (Captain rec) | persisted path canonical, upgraded to `active`+events; eligibility = ranking input | resolves the dual-path holder/vocabulary conflict (Unknown 1) |

---

## 5. NON-NEGOTIABLE BOUNDARIES (v1)

- **D6 freezes one trusted-value artifact; D7/D8 consume it, never recompute True Value.**
- **`>=2 MLB peers` blocks value trust for that player/category** — no silent fallback pool.
- **Hidden-FARM truth and score-only rows stay excluded** from every trusted consumer.
- **No salary MOVEMENT** (live values that reflect stats/designations ≠ offseason contract movement/arbitration).
- **No automatic morale/relationship mutation** — `DesignationEvent`/`RosterMoveEvent`/`TradeEvent` are
  emitted (Phase-1 gate) but Phase-2 consumers stay deferred; no phantom morale.
- **No Mode 3 / offseason execution; the offseason flag stays FALSE** until scoped post-D0 (F-138).
- **Do not resurrect the offseason `AwardsCeremonyFlow` by flipping the flag** — v1 awards are new Mode-2
  surfaces.
- Every REAL-BUILD ticket: auditor ≠ builder; golden/oracle byte-unchanged unless the ticket's contract
  explicitly authorizes a value change (e.g. F-144 after the golden diff).

---

## 6. PROVENANCE (idea-box record)

Captain re-baseline = 6-reader decorrelated fan-out (`d0-expanded-v1-remap`), all decision-critical claims
Captain-verified file:line. Codex peer-review (codex-ideation, read-only) across 3 rounds: round 1 elevated
backup parity from "deferred" to a v1 gate + reframed "build is small → gates are real, slice-done ≠
spec-done"; round 2 confirmed award-specific-vs-True-Value fork + independently traced F-144 as golden-diff
(matching the Captain trace) + tightened D4/D6/D8 wording + the "no flag-flip AwardsCeremonyFlow" rule;
round 3 confirmed D6-as-shared-trust-root placement + the frozen-value-artifact guardrail + peer-pool risks.
Captain corrected Codex once: Fan Favorite also has a Phase-2 morale dependency (→ v1.1), not value-only.
JK arbitrated all four scope forks. No residual disagreement at ratification.
