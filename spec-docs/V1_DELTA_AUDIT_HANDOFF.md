# V1 DELTA AUDIT — HANDOFF BRIEF (for a fresh session)

**Created:** 2026-06-22 (JK request, attended). **Author:** Captain (Opus 4.8), end of a long build session.
**Why a fresh session:** this is a large, high-stakes reconciliation (170+ commits + ~25 docs across worktrees)
best done with a clean context + full budget. Everything needed is pinned below — you lose nothing by starting fresh.

---

## MISSION

Produce a **comprehensive, evidence-backed view of what's left for Franchise v1**, by combing **everything that
changed since `ROADMAP_TO_V1.md` was last updated** — BOTH docs (new designs + status changes) AND commits (what was
truly built/updated) — across all relevant worktrees, then reconciling doc-claims against commit-reality. Watch for
**net-new designs** added since the boundary. Optionally end by **refreshing `ROADMAP_TO_V1.md`** (ask JK first).

**JK SET-ASIDE (do NOT assess — another thread owns it):** anything tied to **ratings / trait / chemistry
adjustments**. Specifically exclude: `RATINGS_ADJUSTMENT_SPEC.md`, `TRAIT_GAIN_LOSS_THRESHOLD_SPEC.md`,
`TRAIT_MEASUREMENT_SPEC.md`, `CHEMISTRY_TRAIT_POTENCY_VALUATION_SPEC.md`, and the in-season **L8 ratings-checkpoint /
L9b trait-checkpoint** model + the **RB-9 analyzer's traits/chemistry analysis**. Flag them as "owned by the other
thread," then move on — they are in active redesign and will be updated separately.

---

## METHOD (NON-NEGOTIABLE — a JK ruling 2026-06-22, now in SESSION_RULES pending pen)

- **Anchor on `spec-docs/ROADMAP_TO_V1.md`** (the evidence-backed v1 definition — every status carries a commit hash
  or file:line) compared against **current code**, then **follow breadcrumbs to features added in the last few days**
  (recent commits + the live ledgers + recently-touched specs).
- **Do NOT feed any pre-~June-10 doc into this assessment.** Gap-analyses / audit-syntheses / UX-redesign gap docs
  from March/May/early-June describe SUPERSEDED or ABANDONED targets and inject heavy noise. (A prior pass did this and
  falsely reported GameTracker as "~83% gaps" by measuring against an un-adopted redesign spec — see "Known corrections".)
- Evidence-backed only: every status → a commit hash or a `file:line`. Unconfirmable → flag, don't guess.

---

## THE BOUNDARY

`ROADMAP_TO_V1.md` was last updated at commit **`84d0adf4`** (`2026-06-20 20:35:54 -0600`,
"docs(roadmap): breadcrumb — Part-D rulings R7-R10 + auction-v1 resolved; full refresh deferred to post Mode-1
verification pass"). **Everything after this is the delta to audit.** The roadmap itself says its full refresh was
*deferred* pending the Mode-1 verification + build — so the roadmap is KNOWN-STALE on the Mode-1 lane; your job is to
close that.

---

## SCOPE — pre-computed (regenerate to confirm)

### Worktrees
| Worktree | Branch | HEAD | Role |
|---|---|---|---|
| `/Users/johnkruse/Projects/kbl-tracker` | `codex/franchise-v1-next` | (docs + Mode-2 L/D-stack) | **173 commits since boundary** |
| `/Users/johnkruse/Projects/kbl-mode1-b` | `codex/mode1-v1-b` | `68cfbc4e` | **74 commits since boundary = the ENTIRE Mode-1 auction+prospect build** |
| `/Users/johnkruse/Projects/kbl-mode1` | `codex/mode1-v1` | `956fd15d` | **PARKED — a 61-commit PREFIX of mode1-v1-b. Do NOT audit separately (would double-count). Audit mode1-v1-b only.** |
| `/private/tmp/kbl-gt-*` (≈10) | `codex/gt-*` | various | **prunable / old experiments — NOT part of this delta. Ignore unless a breadcrumb points at one.** |

### Commands to regenerate the delta
```sh
BND=84d0adf451bf72f0d4a6a3100695701b4ef61af7   # boundary commit (ROADMAP_TO_V1 last update)
cd /Users/johnkruse/Projects/kbl-tracker
git log "$BND"..HEAD --oneline                                                                # 173 Mode-2/docs commits
git log "$BND"..HEAD --diff-filter=A --name-only --pretty=format: -- spec-docs/ | grep '\.md$' | sort -u   # added docs
git log "$BND"..HEAD --diff-filter=M --name-only --pretty=format: -- spec-docs/ | grep '\.md$' | sort -u   # modified docs
git status --porcelain -- spec-docs/                                                          # UNTRACKED docs (also "since roadmap")
git -C /Users/johnkruse/Projects/kbl-mode1-b log --since="2026-06-20 20:35" --oneline         # 74 Mode-1 commits
```

### Docs ADDED since boundary (franchise-v1-next, committed)
`AUC-5.1_SCOPE_MAP` · `AUCTION_DRAFT_SPEC` (V1, superseded) · **`AUCTION_DRAFT_SPEC_V2`** (authoritative auction spec) ·
**`AUCTION_REBUILD_PLAN`** (the RB roadmap) · `AUTH4_CAPTAIN_RESUME_PROMPT` · `CHEMISTRY_TRAIT_POTENCY_VALUATION_SPEC`
[SET ASIDE] · `MODE1_REBUILD_JK_BACKLOG` · **`PARALLEL_LANE_LOG`** (the Mode-1 lane ledger — WAVE P1–P13) ·
`RATINGS_ADJUSTMENT_SPEC` [SET ASIDE] · `TRAIT_GAIN_LOSS_THRESHOLD_SPEC` [SET ASIDE].

### Docs MODIFIED since boundary (franchise-v1-next, committed)
`AUCTION_DRAFT_SPEC*` · `AUCTION_REBUILD_PLAN` · `AUTH4_CAPTAIN_RESUME_PROMPT` · `AUTONOMOUS_RUN_LOG` · `CURRENT_STATE` ·
`DECISIONS_LOG` · `MODE1_LEAGUE_BUILD_TO_DRAFT_VISION` · `MODE1_REBUILD_JK_BACKLOG` · `PARALLEL_LANE_LOG` ·
`PROMPT_CONTRACTS` · `PROSPECT_GENERATION_SPEC` · `SEASON_SIMULATION_REPORT` · `SESSION_LOG` · `SESSION_RULES` ·
`RATINGS_ADJUSTMENT_SPEC` [SET ASIDE] · `TRAIT_GAIN_LOSS_THRESHOLD_SPEC` [SET ASIDE].

### Docs UNTRACKED on disk (uncommitted — also "since roadmap"; READ THESE, they are key Mode-1 launch-readiness docs)
`H3_KICKOFF.md` · **`LEAGUE_BUILD_TO_DRAFT_AUDIT.md`** · **`MODE1_TO_MODE2_V1_LAUNCH_READINESS.md`** ·
**`MODE1_V1_VERIFICATION.md`** · (modified) `FRANCHISE_MODE1_MODE2_PLAYABLE_V1_GAP_ANALYSIS.md`.
NOTE: these post-date the roadmap and are the sources the roadmap said it was waiting on — they are IN-SCOPE despite being
the "launch-readiness" family (they are ≥ June-18, not the superseded pre-June-10 gap docs).

---

## KNOWN BREADCRUMB CORRECTIONS (start from these — already established this session; don't re-discover)

1. **The Mode-1 auction lane is BUILT.** `ROADMAP_TO_V1` Lane 2 calls the auction "0 lines, the largest single Mode-1
   build" — **STALE.** The entire auction + prospect-gen + draft-economy rebuild landed on `mode1-v1-b` since the
   boundary: AUC-5.1 (auction shells) → B-series (prospect generator) → **RB-0…RB-15 + RB-17** (the V2 redesign).
   Full evidence-backed per-ticket detail: **`PARALLEL_LANE_LOG.md` WAVE P1–P13** + `CURRENT_STATE.md` live header +
   the 74-commit `mode1-v1-b` log. Mode-1 RB Phases 0–4 are COMPLETE; remaining Mode-1: **RB-16** (sim-tune validation
   harness, Captain-run), **RB-13b** (route the draft flow by `draftFormat`; snake-selectable RULED 2026-06-22), **RB-18**
   (lineup morale UI, needs live morale). JK open-decision **D-10b-1** (shill-exclusion won-order denominator).
2. **L13-5 keystone is DONE** (`c724fc7f`, HEAD `afe6edc4`) — relationship→morale tap LIVE in `masterMoraleMatrix.ts:420`;
   the "relationships are inert" finding is OBSOLETE. (Verify, but the roadmap already reflects this.)
3. **GameTracker + Elimination Mode = BUILT, UI included** (routed in `src/App.tsx`: EliminationSelector/Setup/Home +
   `/game-tracker/:gameId`; `ELIMINATION_MODE_VERIFICATION_REPORT.md`). The 2026-03-15 `GAMETRACKER_UX_GAP_ANALYSIS.md`
   measures code vs an UN-ADOPTED redesign (`GAMETRACKER_UX_SPEC.md v1.0`) → its "83% gaps" is a phantom. **IGNORE it**
   (pre-June-10). Any GameTracker adjustments are unspecced future work, NOT a v1 blocker.
4. **The two lanes are NOT integrated.** All auction/draft code lives ONLY on `mode1-v1-b`; `franchise-v1-next` has ZERO
   auction code (verify: `git -C /Users/johnkruse/Projects/kbl-tracker grep -lE "LeagueBuilderAuctionDraft|useAuctionDraft|cpuTeamRoles" -- 'src/**'` → empty). **A lane-merge is an explicit v1 requirement** — surface it, scope it.

---

## SUGGESTED EXECUTION (multi-agent comb-through)

1. **Read-doc fan-out (parallel):** assign slices of the added+modified+untracked docs (EXCLUDING the SET-ASIDE list)
   to readers. Each returns: NEW designs introduced since the boundary, and any v1 status changes vs the roadmap, with
   file:line / commit cites. Pay special attention to: `MODE1_V1_VERIFICATION.md`, `LEAGUE_BUILD_TO_DRAFT_AUDIT.md`,
   `MODE1_TO_MODE2_V1_LAUNCH_READINESS.md`, `MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md` (vision §7/§8 carries the R7–R10
   rulings + NEW v1 scope: pitcher game score §8.5, beat-reporter standout Q&A §8.6), `MODE1_REBUILD_JK_BACKLOG.md`,
   `H3_KICKOFF.md`, the tail of `AUTONOMOUS_RUN_LOG.md`, and `DECISIONS_LOG.md` (2026-06-20→22 entries).
2. **Read-commit fan-out (parallel):** one reader maps the `mode1-v1-b` 74-commit delta to TRUE built state (cross-check
   vs `PARALLEL_LANE_LOG`); one+ readers map the `franchise-v1-next` 173-commit delta (L-stack/D-stack/L-SIM advances
   since the roadmap — what moved from ⬜/🔧 to ✅). Determine what's build-dark vs live.
3. **Reconcile:** docs-claims vs commit-reality; flag every divergence (a doc says missing but code shows built, or vice
   versa). Re-status each open `ROADMAP_TO_V1` line.
4. **Synthesize:** the comprehensive "what's left for v1" — the two lanes + the gates (D12→D13→flag-flip→F-138→F-141) +
   the lane-merge + any NEW designs found + the genuinely-open launch-contract gaps (e.g. **G3 dummy reporter/scout
   names** — last known OPEN). Keep the SET-ASIDE cluster clearly separated.
5. **Deliverable:** the evidence-backed v1 picture. Then ask JK whether to **refresh `ROADMAP_TO_V1.md`** (re-status
   Lane 2 as built, flip L13-5 to done, fold in the lane-merge + §8.5/§8.6 new scope, banner the pre-June-10 GT/gap docs
   as superseded).

---

## SESSION-START (the fresh session should still do the canonical reads)
`CLAUDE.md` session-start ritual → `ROADMAP_TO_V1.md` → `PARALLEL_LANE_LOG.md` → `CURRENT_STATE.md` live header →
`SESSION_RULES.md` (incl. the new pending-pen v1-status-method rule) → this brief. Then execute the mission above.
