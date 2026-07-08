# CONTINUITY CHECKPOINT — v1 push

**The one doc a cold-start successor reads to resume, with zero chat context.** Repo: `/private/tmp/kbl-port2`, branch `main-track` (tracks `origin/main`). Refreshed by a scribe pass at HEAD `056a2226` (2026-07-08 late — several governing docs are named/dated `2026-07-08` because the captain labels "evening" work by UTC date; local clock is still `07-07`. Not a real sequencing gap — noted so a successor doesn't chase a phantom day.)

## 0. How to use this doc + the update rule

Read this doc first, then `spec-docs/V1_CANON_2026-07-07.md` (definition + §6 rulings ledger), then `V1_BUILD_STATUS.md`. **If this doc and `git log`/`git worktree list` disagree, git wins** — treat any conflict as this doc being stale, not the repo being wrong. **Refresh rule:** a scribe agent (or the captain directly) updates this doc after every lane landing, merge, or JK ruling — same session, same day if possible. Update in place; do not fork a v2 of this file. When a lane in §3 finishes and merges, move its row to §2 with the real commit hash and delete it from §3.

## 1. Resume-here summary

Mode-1 (draft/setup) is the active front; Mode-2 (living season) wiring is queued behind it per JK's ruled sequencing. Eight lanes merged this session (§2), all pre-merge adversarially audited. **NEW FINDING F14 (2026-07-08, confirmed on unmodified code): the live auction can terminate "complete" with SHORT rosters, silently** — `surfaceNextPlayer`'s terminals bypass the exhaustion cleanup (punch-list §1c F14; discovered by the M1E gate chain). **Fix lane M1J is dispatched and building** (§3); it is now the head of the Mode-1 economy chain. **M1E remains DO-NOT-MERGE, its F8/F11 acceptance QUEUED BEHIND M1J** — the M1E-DIAG A/B settled attribution (BASE also fails: the completion defect is PRE-EXISTING, F8 did not cause it), and the F8 gate re-judges on the M1J-fixed base; the auctionSim-vs-live fidelity gap is a separate ticket (post-v1 or instrument wave). **The SOT register LANDED (`24b3e6c0`)** — per-system canonical-doc census + spec-vs-code verification of 10 Mode-2 systems, surfacing **~45 new unowned gaps** (its §4c) that feed the pre-tuning queue, 5 new JK ruling questions (its §4b), and a banner/correction action list (its §4a — executed this pass). **M1I (staff-carry/league-handoff) is BUILT clean — Opus audit RUNNING** (§3). **The 5 SOT-register §4b questions were RULED same evening** (canon ledger `34a1e8d1` + aging clarification `0d2f3802`/`4835cc9a`): matchup engine IN for v1 (ratify spec, then build); reporter pre-narrator mechanics RETIRED; REL-8 captain composite BUILDS in the morale wave; Reliever-of-Year = pitching WPA ratified as shipped; in-season 5-tier age drift IS v1 (verified built-and-fed) — only multi-season arcs stay deferred. **Late-evening batch (canon §6, recorded this pass):** (1) **V1 DRAFT SCALE = 8 TEAMS (+1-2 shills)** (`df9acc9a`) — the F8 economy gate and the gauntlet grid re-base to 8-team rooms; the 30-team closer shortfall + completion cascade are POST-v1 concerns, not blockers. (2) **RECORD-OVERTAKE REVERSAL** — the 2026-07-07 overtake→HISTORY ruling is reversed; overtake edges are genuine RIVALRY (correct-as-built) and charge future matchups per REL-6; the retype ticket is CANCELLED everywhere it was queued. (3) **MATCHUP ENGINE RATIFIED-AS-AMENDED** — `MATCHUP_ENGINE_RECONCILIATION_2026-07-08.md` governs; spawn rule = MUTUAL-WPA (both players banked positive-WPA moments vs each other above a §16 threshold; one-sided domination never spawns); GameTracker recent-form suffix allowed, browser-gated (sole freeze exception). Zero open JK forks. Two standing human gates remain: JK's browser feel-pass on reserve prices (Lever A, k=0.65 default) and the final v1 acceptance walk (§0 of `V1_CANON`).

## 2. Merged today (git-verified, all pre-merge adversarially audited by Opus)

| Lane | Merge commit | What landed | Audit verdict |
|---|---|---|---|
| M1a | `1adb1183` | Per-draft nomination seed [F1] — nomination order derives from session id + persisted launch nonce; deterministic within a draft, differs across drafts | APPROVE |
| M1b | `dbfc2a48` | Prospect generation to spec curve [F4] — seeded pool-level largest-remainder grade quotas; before 8.8pp total abs deviation, after 0.0pp exact | APPROVE-WITH-NOTES |
| M2a | `2c3a906b` | Phase-2 flag production activation [M2a] — the 11 default-OFF soul flags now resolve `test override > persisted activation > compiled default`, reuses existing `kbl-app-meta.appSettings` key, no new DB/store | APPROVE-WITH-NOTES |
| M1c | `61f0421f` | CPU identity auto-assign [P1] — deterministic auto-fill of missing club identities, preserves user picks, visible leagueId:nonce seed | APPROVE-WITH-NOTES |
| M1G | `72d518ce` | Farm shill fix [F13] — farm CPU set = AI clubs only, legacy "last-N-teams-become-CPU" fallback removed (was silently hijacking human teams); MLB legacy-resume hole closed too | APPROVE-WITH-NOTES |
| M1D | `a71e9e67` | Farm scouting overhaul [F2/F3/F7/F10] — per-area scout bands now derive from the ratified 24×8 farm-archetype table (was: hired-scout descriptor); scout value = true IV opening ask with band fog; ScoutHire = deterministic no-choice reveal | APPROVE-WITH-NOTES |
| M2b | `d85137f7` | Arm-rating last mile [RA-8 / matrix gap #1] — `armThrowingRate` now receives a real performance signal in `expectedStatsCategoryRates.ts`; both feeder legs (catcher CS-rate w/ the spec's 95/5 credit split, OF assists) verified live by the audit; no arm-relevant exposure → null sample, not zero | APPROVE-WITH-NOTES. **Carry Note A:** the OF leg is currently a per-game VOLUME rate — revisit as a success rate once `extraBasesAllowed` gets a live writer |
| M1H | `3dfa1d38` | Farm follow-ups [F12a/F12b/§8.4-amended] — pitcher arm slots generated to the EXACT measured `playerDatabase.ts` distribution; farm auction lot card shows trait COUNT with no-leak verification (no names, no other fields); overall scout band = primary-area rule (replaces the dead constant-5 mean rule) | APPROVE-WITH-NOTES. **Carry the note:** only the Sub arm slot carries a pricing premium — that's the pre-existing IV model, not an M1H change |

Audit notes / landing detail for each lane live inline in `spec-docs/MODE1_PUNCHLIST_2026-07-08.md` §1/§1b ("landing note" lines) and `spec-docs/V1_BUILD_STATUS.md` §0 items 1i/1j. M1D's audit surfaced one amendment (overall grade band was a dead constant-5 "mean rule" knob) — ratified as PRIMARY-AREA in `01ff6b68`, riding lane M1H below. Housekeeping commit `fbdab22a` removed a stale tracked `DONE.txt` (M1D's EPERM-fallback report) from the repo root and preserved the M2b/M1H dispatch contracts in `spec-docs/contracts/`.

## 3. In-flight lanes (live-verified via `ps`/worktree inspection at checkpoint time)

**M1J — F14 live completion terminal-path fix, dispatched and building (the head of the economy chain).** Worktree `/private/tmp/kbl-m1j-completion`, branch `lane/m1j-completion` off origin/main. The bug (punch-list §1c F14, CONFIRMED on unmodified code): `surfaceNextPlayer` marks `AUCTION_COMPLETE` directly when no nominee remains (`src/engines/auctionStateMachine.ts:421`, direct-complete branches :430/:444), bypassing the exhaustion cleanup (`backfillFromPassedLots` :695 + Lever A affordable pricing) that only runs via `advanceLot` (:650-654) — real drafts terminate "complete" with short rosters, silently (live-driver matrix at v1 scale: 13-16/18 and 21-22/24 legal, both k=0 and k=0.65; likely the polished cousin of JK's stuck-draft manual finding). Done looks like: EVERY terminal routed through the existing cleanup; an explicit uncompletable flag instead of a silent short; **binding acceptance = 100% legal rosters across the 8-row live-driver matrix + a falsification check.** Evidence tables live in the M1E worktree's `M1E_SIM_GATE_REPORT.md`. Standard protocol on completion (§5).

**M1E — still DO-NOT-MERGE; F8/F11 acceptance QUEUED BEHIND M1J.** (Worktree `/private/tmp/kbl-m1e-diminish`, branch `lane/m1e-diminish`, contract `spec-docs/contracts/CONTRACT_M1E_DIMINISH.md`, design `FABLE_F8_DIMINISHING_NEED_DESIGN_2026-07-08.md` — amended to the 8-team gate per ruling `df9acc9a`.) Chain history: (1) BINDING sim gate FAILED (F8: 73/150); (2) M1E-DIAG A/B: **BASE fails too (89/150) — pre-existing completion defect, F8 not the cause** (diagnosis committed in-worktree, `6dbcd99b`); (3) the truth-hunt escalated to a live-driver run, which surfaced **F14 in the real engine** — so the fix moved to lane M1J on clean main, and the F8 gate now re-judges on the M1J-fixed base. The auctionSim-vs-live fidelity gap = a separate ticket (post-v1 or the instrument wave). The dirty F8/F11 implementation stays preserved in the worktree, untouched. **DO-NOT-MERGE stands — no exceptions, regardless of who asks.** Settled history, don't re-litigate: the 440-vs-660 pool episode (ruling `89931773`) and the 8-team re-base (`df9acc9a`).

**M1I — staff carry-through + league handoff [P5+F6], BUILT clean; Opus adversarial audit RUNNING.** Worktree `/private/tmp/kbl-m1i-staffcarry`, branch `lane/m1i-staffcarry`. Commits (git-verified): `2850f3cc` fix(draft-arc): thread leagueId through staffing→franchise handoff [F6] + `f99128ed` feat(franchise): hired staff identities reach the hub [P5]. Process note for the record: the FIRST M1I dispatch died silently mid-build and was re-dispatched (the known long-background-dispatch kill pattern — partial work survives, re-dispatch, don't rebuild). On audit verdict: `--no-ff` merge with verdict in message → punch-list landing note (P5/F6) → this doc's §2.

All three worktrees follow the standard lane pattern (§5) and the known-flake list (§6).

## 4. Queued lanes, in order (next dispatches as slots free)

1. **M1F** — whisper one-ceiling [F9, already ruled: one liquidity-adjusted maxBid drives verdict/room-read/budget-light everywhere; capValue becomes a separately-labeled "total capacity" line only].
2. ~~P5 + F6~~ — **dispatched as lane M1I, building now (see §3).**
3. **P3** — farm auction → AuctionStage fold (kills the mid-journey UI register break; target component already exists at `/__preview/auction-stage` farm tab).
4. **P4** — farm-side Assistant-GM whisper (today the farm draft is advice-dead).
5. **P6** — post-freeze summary screen (freeze results are silent today).
6. **P7** — RULES-V1-PRUNE (ruled 2026-07-07: every Rules/season-config knob wired to real behavior or removed).
7. **P8** — conference editor (ruled IN v1 2026-07-01; `conferences:[]` still hardcoded).
8. **P9** — wrong-fit penalty Option A (visible pre-bid budget debit; design in `SCOUTING_INTELLIGENCE_SPEC.md` §3.3 + recovered §13.3 copy) — last unbuilt S7 economy law.
9. **P10** — FS-3 shill-dissolve validation (believed fixed by C3's `nonCompletingTeamIds`; prove it in the gauntlet with shills > 0).
10. **P11** — scout-hire screen placement (move the reveal adjacent to the farm phase; F10 already proved it doesn't actually gate the MLB auction today, so this is placement-only, not a gating fix).
11. Then **the Mode-1 GAUNTLET** (`MODE1_PUNCHLIST_2026-07-08.md` §3 — scripted end-to-end browser journeys across the {pool-first/design-first} × {6-team/**8-team**} × {shills 0/1-2} × {k=0/0.65} grid — **re-based per the 2026-07-08 8-team ruling `df9acc9a`; 30-team configs are post-v1**).
12. Then JK's **A-Z feel pass (P12)** + **F5 reskin** (ballpark-kit design wave, cosmetic, correctness-gated).

**Mode-2 wave order (JK-ruled sequencing, runs concurrently on disjoint season-side files while Mode-1 stays first priority):** ratings/trait adjustment matrix wiring remainder (the 2026-07-08 blocker — row-by-row spec-to-code reconciliation; M2b was the first row of this and is now LANDED, see §2) → morale 52-row full-wiring (incl. the ruled home-park-rival 2× amplifier + REL-8 captain composite + **the morale ledger write-back**) → **matchup-engine build lane** (M-L, RATIFIED 2026-07-08 — contract basis `MATCHUP_ENGINE_RECONCILIATION_2026-07-08.md`; slots with/immediately after the morale wave; hard dep: the morale ledger write-back; spawn = mutual-WPA) → L10 (Random-Events) chain completion → C4-C in-season Assistant-GM rewiring (+ the 3 reporter/fame items assigned owners in `ORPHAN_WIRING_MATRIX_2026-07-07.md` §5 addendum) → TV-award family rewire to the TV spine → ~~rivalry record-overtake edge → HISTORY~~ **(CANCELLED — the 2026-07-08 reversal keeps RIVALRY as-built)** → a full `UI_TRUTH_MAP.md` re-walk → **only then** §16 sim-tuning (~100 feel-numbers). **The SOT register's §4c gap lists (~45 new unowned items — fame status/celebrity layer, awards/TV resolution holes, morale cross-cutting severances, relationship producers, reporter §16, L10 catalog) now feed this pre-tuning queue**; its §4b questions are all RULED (canon `34a1e8d1` + the ratification/reversal rows).

## 5. Lane protocol (how a successor dispatches or resumes a lane)

1. **Contract first.** Captain writes a bounded contract — either as a file in `spec-docs/contracts/` or inline as the `codex exec` prompt (both patterns are in active use; inline is common for smaller/well-scoped lanes, and inline contracts are preserved to `spec-docs/contracts/` after dispatch so the record survives the process — see `fbdab22a`). The contract names: working worktree/branch, the governing spec/design doc(s) to read FIRST, the exact deliverables, an UNTOUCHABLE list (files/systems other concurrent lanes own), required regression tests, the gate commands, the commit message(s), and an EPERM fallback (dirty tree + a `<LANE>_DONE.txt` summary if `git commit` fails in the sandbox).
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

Every lane contract names this exact list. If one of these is red in a full-suite run, rerun it solo before flagging a regression.

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
      MATCHUP_ENGINE_RECONCILIATION_2026-07-08.md (matchup engine, RATIFIED-AS-AMENDED — governs PLAYER_RIVALRY_MATCHUP_ENGINE_SPEC.md on conflict)
  > status
      V1_BUILD_STATUS.md                    ("THE one status doc for v1" — update in place, never fork)
  > execution
      PATHWAY_TO_V1_2026-07-07.md           (phased runbook, owners, gates)
      MODE1_PUNCHLIST_2026-07-08.md         (Mode-1 execution board, F1-F13 + P1-P12, landing notes)
      PROMPT_CONTRACTS.md                   (the Codex build-contract manifest)
      ORPHAN_WIRING_MATRIX_2026-07-07.md    (incl. §5 execution reconciliation addendum, 2026-07-08)
      MERGE_CERTIFICATION_2026-07-08.md     (stranded-code recovery register R1-R7)
      SOT_REGISTER_2026-07-08.md            (Mode-2 per-system SOT register + spec-vs-code verification, LANDED 24b3e6c0 — look up a system's governing doc HERE before trusting any other doc's claim about it; §4a banners executed 2026-07-08, §4b questions all RULED same evening (canon 34a1e8d1), §4c = the pre-tuning gap lists)
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
