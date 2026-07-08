# CONTINUITY CHECKPOINT — v1 push

**The one doc a cold-start successor reads to resume, with zero chat context.** Repo: `/private/tmp/kbl-port2`, branch `main-track` (tracks `origin/main`). Refreshed by this scribe pass at HEAD `ce4b371d` (committer timestamp `2026-07-07T20:23:06-06:00` local / `2026-07-08 02:23 UTC` — several governing docs are named/dated `2026-07-08` because the captain labels "evening" work by UTC date; local clock is still `07-07` at time of writing. Not a real sequencing gap — noted so a successor doesn't chase a phantom day.)

## 0. How to use this doc + the update rule

Read this doc first, then `spec-docs/V1_CANON_2026-07-07.md` (definition + §6 rulings ledger), then `V1_BUILD_STATUS.md`. **If this doc and `git log`/`git worktree list` disagree, git wins** — treat any conflict as this doc being stale, not the repo being wrong. **Refresh rule:** a scribe agent (or the captain directly) updates this doc after every lane landing, merge, or JK ruling — same session, same day if possible. Update in place; do not fork a v2 of this file. When a lane in §3 finishes and merges, move its row to §2 with the real commit hash and delete it from §3.

## 1. Resume-here summary

Mode-1 (draft/setup) is the active front; Mode-2 (living season) wiring is queued behind it per JK's ruled sequencing. Six lanes merged this session (§2), all pre-merge adversarially audited, zero JK decision forks currently open. Three Codex lanes are running RIGHT NOW in separate worktrees (§3) — verified via live process inspection (`ps`), not just branch state, at the time of this checkpoint: **M1E** (diminishing positional need, resumed post-BLOCKED after a pool-size ruling), **M1H** (pitcher arm-slot generation + lot-card trait count + overall-band amendment), **M2b** (feed the orphaned `armThrowingRate` rating signal). A fourth thread, the **SOT-roundup** (spec-anchored re-verification of every Mode-2 governing doc), is in flight Claude-side — no separate OS process to observe, so its live status is not independently verifiable from this repo checkpoint; check the captain's own session or for new `SOT`-named docs in `spec-docs/` since this checkpoint's timestamp. No open JK decision forks as of this checkpoint (last two closed: home-park-rival 2x amplifier, MatchupDramaBar retirement). Two standing human gates remain, neither blocking further build work: JK's browser feel-pass on reserve prices (Lever A, k=0.65 default) and the final v1 acceptance walk (§0 of `V1_CANON`).

## 2. Merged today (git-verified, all pre-merge adversarially audited by Opus)

| Lane | Merge commit | What landed | Audit verdict |
|---|---|---|---|
| M1a | `1adb1183` | Per-draft nomination seed [F1] — nomination order derives from session id + persisted launch nonce; deterministic within a draft, differs across drafts | APPROVE |
| M1b | `dbfc2a48` | Prospect generation to spec curve [F4] — seeded pool-level largest-remainder grade quotas; before 8.8pp total abs deviation, after 0.0pp exact | APPROVE-WITH-NOTES |
| M2a | `2c3a906b` | Phase-2 flag production activation [M2a] — the 11 default-OFF soul flags now resolve `test override > persisted activation > compiled default`, reuses existing `kbl-app-meta.appSettings` key, no new DB/store | APPROVE-WITH-NOTES |
| M1c | `61f0421f` | CPU identity auto-assign [P1] — deterministic auto-fill of missing club identities, preserves user picks, visible leagueId:nonce seed | APPROVE-WITH-NOTES |
| M1G | `72d518ce` | Farm shill fix [F13] — farm CPU set = AI clubs only, legacy "last-N-teams-become-CPU" fallback removed (was silently hijacking human teams); MLB legacy-resume hole closed too | APPROVE-WITH-NOTES |
| M1D | `a71e9e67` | Farm scouting overhaul [F2/F3/F7/F10] — per-area scout bands now derive from the ratified 24×8 farm-archetype table (was: hired-scout descriptor); scout value = true IV opening ask with band fog; ScoutHire = deterministic no-choice reveal | APPROVE-WITH-NOTES |

Audit notes / landing detail for each lane live inline in `spec-docs/MODE1_PUNCHLIST_2026-07-08.md` §1/§1b ("landing note" lines) and `spec-docs/V1_BUILD_STATUS.md` §0 items 1i/1j. M1D's audit surfaced one amendment (overall grade band was a dead constant-5 "mean rule" knob) — ratified as PRIMARY-AREA in `01ff6b68`, riding lane M1H below.

## 3. In-flight lanes (live-verified via running `codex exec` processes at checkpoint time — not just branch/worktree state)

| Lane | Worktree | Branch | Contract | What done looks like | On completion |
|---|---|---|---|---|---|
| **M1E** | `/private/tmp/kbl-m1e-diminish` | `lane/m1e-diminish` | `spec-docs/contracts/CONTRACT_M1E_DIMINISH.md` | F8 diminishing positional-need multiplier + F11 overstacked-roster advisor finding, built per `FABLE_F8_DIMINISHING_NEED_DESIGN_2026-07-08.md` §2-§4; §5's BINDING two-lane sim gate (8 pass/fail metrics) run and committed as `spec-docs/M1E_SIM_GATE_REPORT.md`; commits `feat(auction): diminishing positional need schedule [F8]`, `feat(roster-advisor): overstacked position findings [F11]`, `test(economy): F8 sim gate report` | Adversarial (Opus) audit → merge `--no-ff` with verdict in message → landing note appended to `MODE1_PUNCHLIST_2026-07-08.md` §1b (F8/F11 rows) → this doc's §2 updated |
| **M1H** | `/private/tmp/kbl-m1h-armslot` | `lane/m1h-armslot` | inline (passed via `codex exec` stdin, not saved to `spec-docs/contracts/`) | Three deliverables from punchlist F12 + `FARM_ARCHETYPE_SCOUT_CONFIDENCE_2026-07-08.md` §8.4: (1) F12a — seeded pitcher arm-slot generation anchored to the measured `playerDatabase.ts` pitcher distribution, DTO widened off type-pinned `null`; (2) F12b — farm auction lot card shows trait COUNT (no names); (3) §8.4-amended — overall scout band = archetype's band for the prospect's highest-TRUE-rated primary area (replaces the dead constant-5 mean rule). Commits: `feat(farm): generate pitcher arm slots anchored to database distribution [F12a]`, `feat(farm): lot-card trait count [F12b]`, `fix(farm): overall scout band = primary-area rule [s8.4-amended]` | Same protocol as M1E. **Note:** this worktree's `DONE.txt` at checkout is stale leftover text from the already-merged M1D lane (M1D's report happened to be committed under that filename upstream) — do not mistake it for M1H's own completion signal; M1H signals completion via `M1H_DONE.txt` (EPERM fallback) or its three real commits |
| **M2b** | `/private/tmp/kbl-m2b-arm` | `lane/m2b-arm` | inline (`codex exec` stdin) | Feed the one unwired ratings-adjustment row per `RATINGS_ADJUSTMENT_SPEC.md`: `expectedStatsCategoryRates.ts` defines `armThrowingRate` but never emits a sample (RA-8 last mile). Wire it from already-stored catcher CS/SB-allowed fields (`seasonAggregator.ts:481-482`) + the zero-consumer `catcherCaughtStealingAggregator.ts` + OF assist data, following the spec's 95/5 catcher/pitcher credit split. No arm-relevant exposure → null sample, not zero. Commit: `fix(ratings): feed the arm rating — connect RA-8 last mile [M2b]`. If the spec's formula is ambiguous, the contract requires STOP + `BLOCKED.md`, not invention | Same protocol |

All three worktrees were `git worktree add`-ed off a recent `origin/main` with an APFS-cloned `node_modules` (the standard lane pattern, see §5). All three share the same known-flake list (§6) in their gates.

**M1E-specific history:** this lane previously hit a BLOCKED state (stale `BLOCKED.md` still present in the worktree) because its design's §5 sim gate assumed a 440-player MLB pool, but the shipped pool is now 660 players (30 rosters). JK/captain ruling `89931773` amended the design: **the shipped 660-player pool via the production pool path is normative; 440 was descriptive, not binding.** The lane resumed after that ruling — its current dirty tree (engine + test edits, plus new `scripts/m1eDiminishingNeedGate.test.ts` / `src/engines/auctionSim/m1eDiminishingNeedGate.ts`) reflects the resumed, post-ruling work, and it was actively running its gate test at checkpoint time. Do not re-raise the pool-size question — it's closed.

## 4. Queued lanes, in order (next dispatches as slots free)

1. **M1F** — whisper one-ceiling [F9, already ruled: one liquidity-adjusted maxBid drives verdict/room-read/budget-light everywhere; capValue becomes a separately-labeled "total capacity" line only]. Dispatch after M1E frees a slot.
2. **P5 + F6** — staff carry-through (hired reporter/manager identity reaching the hub) folded with the league-handoff bug (`EndOfDraftStaffing.tsx` drops leagueId on the way to Franchise Setup).
3. **P3** — farm auction → AuctionStage fold (kills the mid-journey UI register break; target component already exists at `/__preview/auction-stage` farm tab).
4. **P4** — farm-side Assistant-GM whisper (today the farm draft is advice-dead).
5. **P6** — post-freeze summary screen (freeze results are silent today).
6. **P7** — RULES-V1-PRUNE (ruled 2026-07-07: every Rules/season-config knob wired to real behavior or removed).
7. **P8** — conference editor (ruled IN v1 2026-07-01; `conferences:[]` still hardcoded).
8. **P9** — wrong-fit penalty Option A (visible pre-bid budget debit; design in `SCOUTING_INTELLIGENCE_SPEC.md` §3.3 + recovered §13.3 copy) — last unbuilt S7 economy law.
9. **P10** — FS-3 shill-dissolve validation (believed fixed by C3's `nonCompletingTeamIds`; prove it in the gauntlet with shills > 0).
10. **P11** — scout-hire screen placement (move the reveal adjacent to the farm phase; F10 already proved it doesn't actually gate the MLB auction today, so this is placement-only, not a gating fix).
11. Then **the Mode-1 GAUNTLET** (`MODE1_PUNCHLIST_2026-07-08.md` §3 — scripted end-to-end browser journeys across the {pool-first/design-first} × {6-team/30-team} × {shills 0/default} × {k=0/0.65} grid).
12. Then JK's **A-Z feel pass (P12)** + **F5 reskin** (ballpark-kit design wave, cosmetic, correctness-gated).

**Mode-2 wave order (JK-ruled sequencing, runs concurrently on disjoint season-side files while Mode-1 stays first priority):** ratings/trait adjustment matrix wiring remainder (the 2026-07-08 blocker — row-by-row spec-to-code reconciliation, M2b is one row of this) → morale 52-row full-wiring (incl. the just-ruled home-park-rival 2× amplifier) → L10 (Random-Events) chain completion → C4-C in-season Assistant-GM rewiring (+ the 3 reporter/fame items assigned owners in `ORPHAN_WIRING_MATRIX_2026-07-07.md` §5 addendum) → TV-award family rewire to the TV spine → rivalry record-overtake edge → HISTORY (one-line type change) → a full `UI_TRUTH_MAP.md` re-walk → **only then** §16 sim-tuning (~100 feel-numbers).

## 5. Lane protocol (how a successor dispatches or resumes a lane)

1. **Contract first.** Captain writes a bounded contract — either as a file in `spec-docs/contracts/` or inline as the `codex exec` prompt (both patterns are in active use; inline is common for smaller/well-scoped lanes). The contract names: working worktree/branch, the governing spec/design doc(s) to read FIRST, the exact deliverables, an UNTOUCHABLE list (files/systems other concurrent lanes own), required regression tests, the gate commands, the commit message(s), and an EPERM fallback (dirty tree + a `<LANE>_DONE.txt` summary if `git commit` fails in the sandbox).
2. **Codex builds** in an isolated `git worktree` off a fresh `origin/main`, with an APFS-cloned `node_modules` (`cp -c -R`) so installs aren't repeated per lane.
3. **Opus adversarial audit**, read-only, tries to break the diff and re-runs the gates itself independently (builder ≠ auditor, no exceptions).
4. **Captain merges** `--no-ff` with the audit verdict recorded in the merge commit message.
5. **Landing note** appended to the relevant punch-list/matrix doc (see the "landing note" pattern in `MODE1_PUNCHLIST_2026-07-08.md` §1/§1b).
6. **Push**, then update this checkpoint's §2/§3.

If a lane's design assumption proves false against the live code, the contract requires the lane to **STOP and write `BLOCKED.md`** rather than inventing a replacement — see M1E's history in §3 for the real example and how it was unblocked (a design amendment ruling, not a code workaround).

## 6. Known full-suite flakes (not regressions — always solo-rerun before judging a lane red)

- `LeagueBuilderDraftSetup.test.tsx` — the CUT2-2 30-club shill-pressure batch
- `AwardsWatchlist`
- `franchiseManualSmokeFixture`
- `GameTrackerLaunchState`

Every active contract in §3 names this exact list. If one of these is red in a full-suite run, rerun it solo before flagging a regression.

## 7. Doc authority map (from `V1_CANON_2026-07-07.md` §7 — conflicts resolve upward, never down)

```
canon (V1_CANON_2026-07-07.md, JK-approved — §6 is the rulings ledger, dated, append-only)
  > binding specs
      FRANCHISE_V1_LIVING_SEASON_SPEC.md   (living-season backbone)
      MODE_2_V1_FINAL.md                    (engine-level home specs)
      SCOUTING_INTELLIGENCE_SPEC.md         (draft + in-season intelligence, v1 blocker)
      UX_NORTH_STAR.md                      (binding UI/UX design bible)
      TEAM_ARCHETYPES_24.md                 (the 24 locked identities)
      DRAFT_ECONOMY_RESET_2026-07-05.md     (draft-economy plan of record)
      FABLE_RESERVE_PRICE_DESIGN_2026-07-07.md (Lever A design, build-authorized)
  > status
      V1_BUILD_STATUS.md                    ("THE one status doc for v1" — update in place, never fork)
  > execution
      PATHWAY_TO_V1_2026-07-07.md           (phased runbook, owners, gates)
      MODE1_PUNCHLIST_2026-07-08.md         (Mode-1 execution board, F1-F13 + P1-P12, landing notes)
      PROMPT_CONTRACTS.md                   (the Codex build-contract manifest)
      ORPHAN_WIRING_MATRIX_2026-07-07.md    (incl. §5 execution reconciliation addendum, 2026-07-08)
      MERGE_CERTIFICATION_2026-07-08.md     (stranded-code recovery register R1-R7)
      UI_TRUTH_MAP.md                       (empirical route-truth snapshot — stale post-lens-flip, needs a re-walk before any UI-reachability claim is trusted)
  > superseded (do not plan from these — see V1_BUILD_STATUS.md §5 for the full list)
      ROADMAP_TO_V1.md, V1_BUILD_QUEUE.md, FRANCHISE_SETUP_TO_SEASON_ROADMAP.md,
      V1_ACTIVATION_READINESS_MAP.md, V1_STATUS_AND_ASSEMBLY_PLAN.md,
      MODE1_V1_VERIFICATION.md, MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md,
      MODE2_V1_COMPLETENESS.md, SCOUTING_INTELLIGENCE_SPEC_V2.md, AUCTION_DRAFT_SPEC.md
  > this doc (CONTINUITY_CHECKPOINT.md)
      A resume-pointer, not a source of truth. It cites the docs above; it never overrides them.
```

**Standing rule from canon §7, restated:** changes to `V1_CANON_2026-07-07.md` happen only via a dated JK ruling appended to its §6 — no silent edits. This checkpoint doc has no such protection; it is meant to be rewritten freely as work lands.
